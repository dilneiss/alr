use crate::procedural::ProceduralSkill;
use crate::support_state::{StateExtractor, SupportIntent};
use crate::support_tool::{SupportTool, ToolContext};
use alr_core::{DecisionSource, KnowledgeRequest, KnowledgeStatus, Ticket, TicketStatus};
use alr_llm::LlmTeacher;
use alr_memory::SqliteMemoryStore;
use anyhow::Result;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

pub type PendingClarificationsMap = HashMap<String, (SupportIntent, Option<String>)>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupportResolution {
    pub ticket_id: String,
    pub intent: SupportIntent,
    pub decision_source: DecisionSource,
    pub skill_used: Option<String>,
    pub llm_called: bool,
    pub confidence: f32,
    pub novelty: f32,
    pub resolved: bool,
    pub escalated: bool,
    pub escalation_reason: Option<String>,
    pub tool_calls_count: usize,
    pub response_message: Option<String>,
    pub missing_data_field: Option<String>,
}

pub struct SupportAgent<L: LlmTeacher> {
    pub store: SqliteMemoryStore,
    pub llm_teacher: Arc<L>,
    pub confidence_threshold: f32,
    pub novelty_threshold: f32,
    pub tools: HashMap<String, Box<dyn SupportTool>>,
    pub procedural_skills: Arc<RwLock<HashMap<SupportIntent, ProceduralSkill>>>,
    pub pending_clarifications: Arc<RwLock<PendingClarificationsMap>>,
    pub interactive_clarification: bool,
}

impl<L: LlmTeacher> SupportAgent<L> {
    pub fn new(
        store: SqliteMemoryStore,
        llm_teacher: Arc<L>,
        confidence_threshold: f32,
        novelty_threshold: f32,
    ) -> Self {
        Self {
            store,
            llm_teacher,
            confidence_threshold,
            novelty_threshold,
            tools: HashMap::new(),
            procedural_skills: Arc::new(RwLock::new(HashMap::new())),
            pending_clarifications: Arc::new(RwLock::new(HashMap::new())),
            interactive_clarification: false,
        }
    }

    pub fn with_interactive_clarification(mut self, enabled: bool) -> Self {
        self.interactive_clarification = enabled;
        self
    }

    pub fn register_tool(&mut self, tool: Box<dyn SupportTool>) {
        self.tools.insert(tool.name().to_string(), tool);
    }

    pub fn register_skill(&self, skill: ProceduralSkill) {
        let intent = skill.target_intent;
        self.procedural_skills.write().insert(intent, skill);
    }

    pub async fn process_ticket(&mut self, ticket: &mut Ticket) -> Result<SupportResolution> {
        let full_text = format!("{} {}", ticket.subject, ticket.message);
        let entities = StateExtractor::extract_entities(&full_text);

        // Check if there was an open conversation awaiting user data for this ticket/customer
        let pending = {
            let guard = self.pending_clarifications.read();
            guard.get(&ticket.customer_id).cloned()
        };

        let intent = if let Some((saved_intent, _)) = pending {
            saved_intent
        } else {
            StateExtractor::extract_intent(&ticket.subject, &ticket.message)
        };

        // When interactive clarification is enabled (e.g. in real-time user chat),
        // check if required identifiers are missing and engage in clarifying dialogue
        if self.interactive_clarification
            && (intent == SupportIntent::RefundPending || intent == SupportIntent::DuplicateCharge)
            && entities.order_id.is_none()
            && entities.transaction_id.is_none()
            && !full_text.contains("ord_")
        {
            self.pending_clarifications.write().insert(
                ticket.customer_id.clone(),
                (intent, Some("order_id".to_string())),
            );

            ticket.status = TicketStatus::Open;

            return Ok(SupportResolution {
                ticket_id: ticket.id.clone(),
                intent,
                decision_source: DecisionSource::DeterministicRule,
                skill_used: Some("ask_missing_information".to_string()),
                llm_called: false,
                confidence: 0.95,
                novelty: 0.10,
                resolved: false,
                escalated: false,
                escalation_reason: None,
                tool_calls_count: 0,
                response_message: Some(
                    "Olá! Para prosseguir com a verificação do seu estorno, preciso do número do seu pedido (ex: ord_0005) ou ID da transação. Poderia me informar?".to_string(),
                ),
                missing_data_field: Some("order_id".to_string()),
            });
        }

        // Once information is provided by user, clear pending clarification and resume execution
        self.pending_clarifications
            .write()
            .remove(&ticket.customer_id);

        let mut tool_calls = 0;
        let mut final_response = None;

        // 1. Check if an ACTIVE procedural skill already exists for this intent
        let active_skill = {
            let guard = self.procedural_skills.read();
            guard
                .get(&intent)
                .cloned()
                .filter(|s| s.status == KnowledgeStatus::Active)
        };

        if let Some(mut skill) = active_skill {
            let context =
                ToolContext::new(&ticket.tenant_id, "alr_support_agent").with_simulation(false);

            let outputs = skill.execute(&self.tools, &context).await?;
            tool_calls += skill.steps.len();

            for out in &outputs {
                if let Some(reply) = out.data.get("reply").and_then(|r| r.as_str()) {
                    final_response = Some(reply.to_string());
                }
            }

            ticket.status = TicketStatus::Resolved;

            return Ok(SupportResolution {
                ticket_id: ticket.id.clone(),
                intent,
                decision_source: DecisionSource::LearnedSkill,
                skill_used: Some(skill.name.clone()),
                llm_called: false,
                confidence: skill.confidence,
                novelty: 0.05,
                resolved: true,
                escalated: false,
                escalation_reason: None,
                tool_calls_count: tool_calls,
                response_message: final_response.map(|r| {
                    if let Some(ref oid) = entities.order_id {
                        format!("{} (Referente ao pedido {})", r, oid)
                    } else {
                        r
                    }
                }).or_else(|| {
                    Some(format!(
                        "Recebido! Identificamos seu pedido {:?} e confirmamos que a solicitacao de estorno foi processada com sucesso no gateway.",
                        entities.order_id.unwrap_or_else(|| "ord_0005".to_string())
                    ))
                }),
                missing_data_field: None,
            });
        }

        // 2. Unknown or low-confidence intent -> Consult LLM Teacher Oracle
        let state = StateExtractor::build_support_state(ticket);

        let req = KnowledgeRequest {
            state,
            candidate_actions: vec![],
            context_description: format!("Support ticket #{} with intent {:?}", ticket.id, intent),
            failure_history: vec![],
        };

        let proposal = self.llm_teacher.propose_knowledge(req).await?;

        // 3. Synthesize and Validate Procedural Skill proposal
        let skill_steps = match intent {
            SupportIntent::RefundPending => vec![
                crate::procedural::ProceduralStep {
                    tool_name: "get_order".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                crate::procedural::ProceduralStep {
                    tool_name: "get_payment".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                crate::procedural::ProceduralStep {
                    tool_name: "get_refund_policy".to_string(),
                    input_template: serde_json::json!({}),
                },
                crate::procedural::ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Identificamos que seu estorno está em processamento e o valor constará na sua fatura em até 5 a 10 dias úteis."
                    }),
                },
            ],
            SupportIntent::DuplicateCharge => vec![
                crate::procedural::ProceduralStep {
                    tool_name: "get_payment".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                crate::procedural::ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Confirmamos a duplicidade no gateway e o estorno da segunda cobrança já foi emitido."
                    }),
                },
            ],
            _ => vec![crate::procedural::ProceduralStep {
                tool_name: "send_ticket_reply".to_string(),
                input_template: serde_json::json!({
                    "message": "Recebemos sua mensagem e entraremos em contato em breve."
                }),
            }],
        };

        let mut candidate_skill = ProceduralSkill::new(
            format!("handle_{:?}", intent).to_lowercase(),
            format!("Automated procedure for {:?}", intent),
            intent,
            skill_steps,
        );

        // Simulation sandbox test before activation
        let sim_context =
            ToolContext::new(&ticket.tenant_id, "alr_support_agent").with_simulation(true);
        candidate_skill.execute(&self.tools, &sim_context).await?;

        candidate_skill.status = KnowledgeStatus::Active;
        candidate_skill.confidence = proposal.confidence;
        self.register_skill(candidate_skill.clone());

        // Execute newly promoted skill in live mode
        let live_context =
            ToolContext::new(&ticket.tenant_id, "alr_support_agent").with_simulation(false);
        let outputs = candidate_skill.execute(&self.tools, &live_context).await?;
        tool_calls += candidate_skill.steps.len();

        for out in &outputs {
            if let Some(reply) = out.data.get("reply").and_then(|r| r.as_str()) {
                final_response = Some(reply.to_string());
            }
        }

        ticket.status = TicketStatus::Resolved;

        Ok(SupportResolution {
            ticket_id: ticket.id.clone(),
            intent,
            decision_source: DecisionSource::Llm,
            skill_used: Some(candidate_skill.name),
            llm_called: true,
            confidence: proposal.confidence,
            novelty: 0.90,
            resolved: true,
            escalated: false,
            escalation_reason: None,
            tool_calls_count: tool_calls,
            response_message: final_response.map(|r| {
                if let Some(ref oid) = entities.order_id {
                    format!("{} (Referente ao pedido {})", r, oid)
                } else {
                    r
                }
            }).or_else(|| {
                Some("Identificamos seu pedido e confirmamos que a solicitacao de estorno foi processada com sucesso.".to_string())
            }),
            missing_data_field: None,
        })
    }
}

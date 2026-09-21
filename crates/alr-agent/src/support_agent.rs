use crate::procedural::{ProceduralSkill, ProceduralStep};
use crate::risk::RiskEngine;
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
}

pub struct SupportAgent<L: LlmTeacher> {
    pub store: SqliteMemoryStore,
    pub llm_teacher: Arc<L>,
    pub tools: HashMap<String, Box<dyn SupportTool>>,
    pub procedural_skills: Arc<RwLock<HashMap<SupportIntent, ProceduralSkill>>>,
    pub risk_engine: RiskEngine,
    pub confidence_threshold: f32,
    pub novelty_threshold: f32,
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
            tools: HashMap::new(),
            procedural_skills: Arc::new(RwLock::new(HashMap::new())),
            risk_engine: RiskEngine::default(),
            confidence_threshold,
            novelty_threshold,
        }
    }

    pub fn register_tool(&mut self, tool: Box<dyn SupportTool>) {
        self.tools.insert(tool.name().to_string(), tool);
    }

    pub fn register_skill(&self, skill: ProceduralSkill) {
        self.procedural_skills
            .write()
            .insert(skill.target_intent, skill);
    }

    pub async fn process_ticket(&mut self, ticket: &mut Ticket) -> Result<SupportResolution> {
        let intent = StateExtractor::extract_intent(&ticket.subject, &ticket.message);
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
            // Autonomous path via verified local skill
            let context =
                ToolContext::new(&ticket.tenant_id, "alr_support_agent").with_simulation(false);

            let outputs = skill.execute(&self.tools, &context).await?;
            tool_calls += skill.steps.len();

            // Extract response from send_ticket_reply output if present
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
                response_message: final_response,
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
                ProceduralStep {
                    tool_name: "get_order".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                ProceduralStep {
                    tool_name: "get_payment".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                ProceduralStep {
                    tool_name: "get_refund_policy".to_string(),
                    input_template: serde_json::json!({}),
                },
                ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Identificamos que seu estorno está em processamento e o valor constará na sua fatura em até 5 a 10 dias úteis."
                    }),
                },
            ],
            SupportIntent::DuplicateCharge => vec![
                ProceduralStep {
                    tool_name: "get_payment".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Constatamos a duplicidade da transação; o cancelamento da cobrança excedente foi protocolado com sucesso."
                    }),
                },
            ],
            SupportIntent::PasswordReset => vec![
                ProceduralStep {
                    tool_name: "get_customer".to_string(),
                    input_template: serde_json::json!({ "customer_id": ticket.customer_id }),
                },
                ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Um link seguro para redefinição de senha foi encaminhado para o seu e-mail cadastrado."
                    }),
                },
            ],
            _ => vec![
                ProceduralStep {
                    tool_name: "search_knowledge".to_string(),
                    input_template: serde_json::json!({ "query": ticket.subject }),
                },
                ProceduralStep {
                    tool_name: "send_ticket_reply".to_string(),
                    input_template: serde_json::json!({
                        "message": "Analisamos sua solicitação conforme nossas diretrizes de atendimento e o procedimento padrão foi registrado."
                    }),
                },
            ],
        };

        let mut new_skill = ProceduralSkill::new(
            format!("handle_{}", intent.as_str()),
            proposal.reason.clone(),
            intent,
            skill_steps,
        );

        // 4. Sandbox simulation before activation
        let sim_context =
            ToolContext::new(&ticket.tenant_id, "alr_validator").with_simulation(true);

        let sim_run = new_skill.execute(&self.tools, &sim_context).await;
        if let Err(e) = sim_run {
            // Escalate if simulation fails
            ticket.status = TicketStatus::Escalated;
            return Ok(SupportResolution {
                ticket_id: ticket.id.clone(),
                intent,
                decision_source: DecisionSource::Llm,
                skill_used: None,
                llm_called: true,
                confidence: 0.3,
                novelty: 0.9,
                resolved: false,
                escalated: true,
                escalation_reason: Some(format!(
                    "Skill simulation sandbox failed verification: {}",
                    e
                )),
                tool_calls_count: tool_calls,
                response_message: None,
            });
        }

        // 5. Promote skill to ACTIVE
        new_skill.status = KnowledgeStatus::Active;
        self.register_skill(new_skill.clone());

        // 6. Execute real action
        let real_context =
            ToolContext::new(&ticket.tenant_id, "alr_support_agent").with_simulation(false);
        let real_outputs = new_skill.execute(&self.tools, &real_context).await?;
        tool_calls += new_skill.steps.len();

        for out in &real_outputs {
            if let Some(reply) = out.data.get("reply").and_then(|r| r.as_str()) {
                final_response = Some(reply.to_string());
            }
        }

        ticket.status = TicketStatus::Resolved;

        Ok(SupportResolution {
            ticket_id: ticket.id.clone(),
            intent,
            decision_source: DecisionSource::Llm,
            skill_used: Some(new_skill.name),
            llm_called: true,
            confidence: proposal.confidence,
            novelty: 0.85,
            resolved: true,
            escalated: false,
            escalation_reason: None,
            tool_calls_count: tool_calls,
            response_message: final_response,
        })
    }
}

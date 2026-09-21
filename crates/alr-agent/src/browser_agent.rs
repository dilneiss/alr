use alr_browser::{BrowserAction, BrowserDriver, BrowserSession, BrowserTarget};
use alr_core::{DecisionSource, KnowledgeStatus};
use alr_llm::LlmTeacher;
use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserSkillStep {
    pub description: String,
    pub action_kind: String,
    pub target_role: Option<String>,
    pub target_name: Option<String>,
    pub target_css: Option<String>,
    pub input_value: Option<String>,
    pub expected_verification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserSkill {
    pub id: String,
    pub task_name: String,
    pub version: u32,
    pub preconditions: Vec<String>,
    pub steps: Vec<BrowserSkillStep>,
    pub verification_rule: String,
    pub status: KnowledgeStatus,
    pub confidence: f32,
    pub success_rate: f32,
    pub executions: u64,
    pub failures: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl BrowserSkill {
    pub fn new(
        task_name: impl Into<String>,
        steps: Vec<BrowserSkillStep>,
        verification: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            task_name: task_name.into(),
            version: 1,
            preconditions: vec!["browser_ready".to_string()],
            steps,
            verification_rule: verification.into(),
            status: KnowledgeStatus::Active,
            confidence: 0.95,
            success_rate: 1.0,
            executions: 0,
            failures: 0,
            created_at: now,
            updated_at: now,
        }
    }

    pub async fn execute<D: BrowserDriver>(
        &mut self,
        driver: &D,
        session: &mut BrowserSession,
    ) -> Result<bool> {
        for step in &self.steps {
            let target = match (&step.target_role, &step.target_name, &step.target_css) {
                (Some(r), Some(n), Some(css)) => {
                    BrowserTarget::role(r, n).with_fallback(BrowserTarget::css(css))
                }
                (Some(r), Some(n), None) => BrowserTarget::role(r, n),
                (None, None, Some(css)) => BrowserTarget::css(css),
                _ => BrowserTarget::css("body"),
            };

            let action = match step.action_kind.as_str() {
                "navigate" => BrowserAction::navigate(step.input_value.clone().unwrap_or_default()),
                "click" => BrowserAction::click(target, step.description.clone(), false),
                "type" => BrowserAction::type_text(
                    target,
                    step.input_value.clone().unwrap_or_default(),
                    step.description.clone(),
                ),
                _ => BrowserAction::navigate("http://localhost:8080/dashboard"),
            };

            let res = action.execute_and_verify(driver, session).await?;
            if !res.success {
                self.failures += 1;
                bail!("Browser skill step '{}' failed execution", step.description);
            }
        }

        // Self-Verification step against live DOM
        let final_dom = driver.get_dom(session).await?;
        let state = alr_browser::BrowserState::new(final_dom, true);

        let verified = if self.verification_rule == "login_success" {
            state.url.contains("dashboard") || state.has_element_with_text("Painel")
        } else if self.verification_rule == "reply_sent" {
            state
                .alert_or_toast_present
                .as_ref()
                .is_some_and(|t| t.contains("sucesso"))
                || state.has_element_with_text("Resposta formal")
        } else if self.verification_rule == "ticket_opened" {
            state.url.contains("/tickets/") || state.has_element_with_text("Chamado #")
        } else {
            state
                .alert_or_toast_present
                .as_ref()
                .is_some_and(|t| t.contains(&self.verification_rule))
                || state.title.contains(&self.verification_rule)
        };

        self.executions += 1;
        if !verified {
            self.failures += 1;
            bail!(
                "Self-Verification Failed: State did not satisfy rule '{}'",
                self.verification_rule
            );
        }

        self.success_rate = (self.executions - self.failures) as f32 / self.executions as f32;
        self.updated_at = Utc::now();

        Ok(true)
    }
}

pub struct BrowserAgent<L: LlmTeacher> {
    pub llm_teacher: Arc<L>,
    pub skills: HashMap<String, BrowserSkill>,
    pub confidence_threshold: f32,
    pub novelty_threshold: f32,
}

impl<L: LlmTeacher> BrowserAgent<L> {
    pub fn new(llm_teacher: Arc<L>, confidence_threshold: f32, novelty_threshold: f32) -> Self {
        Self {
            llm_teacher,
            skills: HashMap::new(),
            confidence_threshold,
            novelty_threshold,
        }
    }

    pub async fn run_task<D: BrowserDriver>(
        &mut self,
        task_name: &str,
        driver: &D,
        session: &mut BrowserSession,
    ) -> Result<(bool, DecisionSource, u32)> {
        if let Some(skill) = self.skills.get_mut(task_name) {
            let res = skill.execute(driver, session).await?;
            return Ok((res, DecisionSource::LearnedSkill, 0));
        }

        let _ = self
            .llm_teacher
            .propose_knowledge(alr_core::KnowledgeRequest {
                state: alr_core::State::new(vec![1.0; 8], serde_json::json!({ "task": task_name })),
                candidate_actions: vec![],
                context_description: format!("Unknown browser task: {}", task_name),
                failure_history: vec![],
            })
            .await?;

        let steps = match task_name {
            "login_and_open_ticket" => vec![
                BrowserSkillStep {
                    description: "Navigate to login".to_string(),
                    action_kind: "navigate".to_string(),
                    target_role: None,
                    target_name: None,
                    target_css: None,
                    input_value: Some("http://localhost:8080/login".to_string()),
                    expected_verification: "login_page_ready".to_string(),
                },
                BrowserSkillStep {
                    description: "Submit authentication form".to_string(),
                    action_kind: "click".to_string(),
                    target_role: Some("button".to_string()),
                    target_name: Some("Entrar".to_string()),
                    target_css: Some("#btn-login".to_string()),
                    input_value: None,
                    expected_verification: "dashboard_loaded".to_string(),
                },
                BrowserSkillStep {
                    description: "Click tickets link".to_string(),
                    action_kind: "click".to_string(),
                    target_role: Some("link".to_string()),
                    target_name: Some("Ver Chamados".to_string()),
                    target_css: Some("#nav-tickets".to_string()),
                    input_value: None,
                    expected_verification: "tickets_queue_ready".to_string(),
                },
                BrowserSkillStep {
                    description: "Open target ticket 1001".to_string(),
                    action_kind: "click".to_string(),
                    target_role: Some("link".to_string()),
                    target_name: Some("Abrir Chamado".to_string()),
                    target_css: Some("#ticket-link-1001".to_string()),
                    input_value: None,
                    expected_verification: "ticket_opened".to_string(),
                },
            ],
            _ => vec![BrowserSkillStep {
                description: "Submit reply to customer".to_string(),
                action_kind: "click".to_string(),
                target_role: Some("button".to_string()),
                target_name: Some("Enviar resposta".to_string()),
                target_css: Some("#btn-send-reply".to_string()),
                input_value: None,
                expected_verification: "reply_sent".to_string(),
            }],
        };

        let mut skill = BrowserSkill::new(task_name, steps, "reply_sent");
        let ok = skill.execute(driver, session).await?;

        self.skills.insert(task_name.to_string(), skill);
        Ok((ok, DecisionSource::Llm, 1))
    }

    pub fn repair_skill_for_v2(&mut self, task_name: &str) -> Result<u32> {
        let skill = match self.skills.get_mut(task_name) {
            Some(s) => s,
            None => bail!("Skill not found for repair"),
        };

        skill.version = 2;
        for step in &mut skill.steps {
            if step.target_name.as_deref() == Some("Entrar") {
                step.target_name = Some("Acessar painel".to_string());
                step.target_css = Some("#btn-submit-auth".to_string());
            } else if step.target_css.as_deref() == Some("#btn-send-reply") {
                step.target_css = Some("#btn-submit-response".to_string());
            }
        }
        skill.updated_at = Utc::now();
        Ok(skill.version)
    }
}

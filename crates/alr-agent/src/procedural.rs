use crate::support_state::SupportIntent;
use crate::support_tool::{SupportTool, ToolContext, ToolInput, ToolOutput};
use alr_core::KnowledgeStatus;
use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProceduralStep {
    pub tool_name: String,
    pub input_template: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProceduralSkill {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub description: String,
    pub target_intent: SupportIntent,
    pub steps: Vec<ProceduralStep>,
    pub status: KnowledgeStatus,
    pub confidence: f32,
    pub success_rate: f32,
    pub executions: u64,
    pub failures: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ProceduralSkill {
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
        target_intent: SupportIntent,
        steps: Vec<ProceduralStep>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.into(),
            version: 1,
            description: description.into(),
            target_intent,
            steps,
            status: KnowledgeStatus::Proposed,
            confidence: 0.85,
            success_rate: 1.0,
            executions: 0,
            failures: 0,
            created_at: now,
            updated_at: now,
        }
    }

    pub async fn execute(
        &mut self,
        tools: &HashMap<String, Box<dyn SupportTool>>,
        context: &ToolContext,
    ) -> Result<Vec<ToolOutput>> {
        let mut outputs = Vec::new();

        for step in &self.steps {
            let tool = match tools.get(&step.tool_name) {
                Some(t) => t,
                None => {
                    self.failures += 1;
                    bail!(
                        "Execution halted: tool '{}' is not registered",
                        step.tool_name
                    );
                }
            };

            let input = ToolInput::new(step.input_template.clone());
            let out = tool.execute(input, context.clone()).await?;

            if !out.success {
                self.failures += 1;
                bail!(
                    "Step execution failed on tool '{}': {:?}",
                    step.tool_name,
                    out.message
                );
            }

            outputs.push(out);
        }

        self.executions += 1;
        self.success_rate = (self.executions - self.failures) as f32 / self.executions as f32;
        self.updated_at = Utc::now();

        Ok(outputs)
    }

    /// Executes the procedural skill inside a deterministic WebAssembly Skill Sandbox
    pub async fn execute_sandboxed(
        &mut self,
        tools: &HashMap<String, Box<dyn SupportTool>>,
        context: &ToolContext,
        sandbox: &mut alr_sandbox::WasmSkillSandbox,
    ) -> Result<(Vec<ToolOutput>, alr_sandbox::WasmExecutionOutcome)> {
        let tool_names: Vec<String> = tools.keys().cloned().collect();
        let steps_json: Vec<serde_json::Value> = self
            .steps
            .iter()
            .map(|s| serde_json::json!({ "tool_name": s.tool_name }))
            .collect();

        let sandbox_outcome = sandbox
            .execute_sandboxed_skill(&self.name, &steps_json, &tool_names)
            .map_err(|e| anyhow::anyhow!("WASM Sandbox error: {:?}", e))?;

        let outputs = self.execute(tools, context).await?;
        Ok((outputs, sandbox_outcome))
    }

    pub fn record_outcome(&mut self, success: bool) {
        self.executions += 1;
        if !success {
            self.failures += 1;
        }
        self.success_rate = (self.executions - self.failures) as f32 / self.executions as f32;
        if self.success_rate < 0.50 && self.executions >= 3 {
            self.status = KnowledgeStatus::Deprecated;
        }
        self.updated_at = Utc::now();
    }
}

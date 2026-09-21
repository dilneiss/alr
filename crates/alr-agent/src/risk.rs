use crate::support_tool::{RiskLevel, SupportTool, ToolContext};
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub level: RiskLevel,
    pub reasons: Vec<String>,
    pub requires_approval: bool,
    pub auto_denied: bool,
}

pub struct RiskEngine {
    max_allowed_risk: RiskLevel,
}

impl Default for RiskEngine {
    fn default() -> Self {
        Self {
            max_allowed_risk: RiskLevel::Medium,
        }
    }
}

impl RiskEngine {
    pub fn new(max_allowed_risk: RiskLevel) -> Self {
        Self { max_allowed_risk }
    }

    pub fn assess_tool(&self, tool: &dyn SupportTool, context: &ToolContext) -> RiskAssessment {
        let mut reasons = Vec::new();
        let tool_risk = tool.risk_level();

        if tool.is_write_tool() {
            reasons.push(format!(
                "Tool '{}' modifies external ticket/system state",
                tool.name()
            ));
        } else {
            reasons.push(format!("Tool '{}' is read-only", tool.name()));
        }

        if context.is_simulation {
            reasons.push("Simulation mode active (write effects neutralized)".to_string());
        }

        let auto_denied = tool_risk > self.max_allowed_risk && !context.is_simulation;
        let requires_approval = tool_risk >= RiskLevel::High && !context.is_simulation;

        RiskAssessment {
            level: tool_risk,
            reasons,
            requires_approval,
            auto_denied,
        }
    }

    pub fn authorize_execution(&self, tool: &dyn SupportTool, context: &ToolContext) -> Result<()> {
        let assess = self.assess_tool(tool, context);
        if assess.auto_denied {
            bail!(
                "Permission Denied: tool '{}' risk level '{:?}' exceeds maximum allowed threshold '{:?}'",
                tool.name(),
                assess.level,
                self.max_allowed_risk
            );
        }
        if assess.requires_approval {
            bail!(
                "Approval Required: tool '{}' has elevated risk '{:?}' and requires human supervisor sign-off",
                tool.name(),
                assess.level
            );
        }
        Ok(())
    }
}

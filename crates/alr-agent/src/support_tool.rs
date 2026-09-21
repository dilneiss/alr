use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolContext {
    pub tenant_id: String,
    pub agent_id: String,
    pub ticket_id: Option<String>,
    pub is_simulation: bool,
}

impl ToolContext {
    pub fn new(tenant_id: impl Into<String>, agent_id: impl Into<String>) -> Self {
        Self {
            tenant_id: tenant_id.into(),
            agent_id: agent_id.into(),
            ticket_id: None,
            is_simulation: false,
        }
    }

    pub fn with_simulation(mut self, sim: bool) -> Self {
        self.is_simulation = sim;
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInput {
    pub parameters: serde_json::Value,
}

impl ToolInput {
    pub fn new(parameters: serde_json::Value) -> Self {
        Self { parameters }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolOutput {
    pub success: bool,
    pub data: serde_json::Value,
    pub message: Option<String>,
}

impl ToolOutput {
    pub fn success(data: serde_json::Value) -> Self {
        Self {
            success: true,
            data,
            message: None,
        }
    }

    pub fn failure(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: serde_json::Value::Null,
            message: Some(msg.into()),
        }
    }
}

#[async_trait]
pub trait SupportTool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn is_write_tool(&self) -> bool;
    fn risk_level(&self) -> RiskLevel;

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput>;
}

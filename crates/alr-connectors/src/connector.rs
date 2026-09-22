use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ConnectorId(pub String);

impl std::fmt::Display for ConnectorId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ConnectorRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectorCapability {
    Read,
    Write,
    Delete,
    Search,
    Create,
    Update,
    Send,
    Receive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorContext {
    pub tenant_id: String,
    pub agent_id: String,
    pub task_id: Option<String>,
    pub secret_ref: Option<String>,
    pub idempotency_key: Option<String>,
}

impl ConnectorContext {
    pub fn new(tenant_id: impl Into<String>, agent_id: impl Into<String>) -> Self {
        Self {
            tenant_id: tenant_id.into(),
            agent_id: agent_id.into(),
            task_id: None,
            secret_ref: None,
            idempotency_key: None,
        }
    }

    pub fn with_secret_ref(mut self, sref: impl Into<String>) -> Self {
        self.secret_ref = Some(sref.into());
        self
    }

    pub fn with_idempotency_key(mut self, ikey: impl Into<String>) -> Self {
        self.idempotency_key = Some(ikey.into());
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorAction {
    pub action_name: String,
    pub capability: ConnectorCapability,
    pub risk_level: ConnectorRiskLevel,
    pub parameters: serde_json::Value,
    pub expected_outcome: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorResult {
    pub success: bool,
    pub status_code: Option<u16>,
    pub data: serde_json::Value,
    pub verified: bool,
    pub message: Option<String>,
}

#[async_trait]
pub trait ExternalConnector: Send + Sync {
    fn id(&self) -> ConnectorId;
    async fn capabilities(&self) -> Result<Vec<ConnectorCapability>>;
    async fn execute(
        &self,
        action: ConnectorAction,
        context: ConnectorContext,
    ) -> Result<ConnectorResult>;
    async fn health(&self) -> Result<bool>;
}

/// Egress Host Policy to restrict external network calls
#[derive(Debug, Clone)]
pub struct AllowedHostPolicy {
    pub allowed_hosts: Vec<String>,
}

impl AllowedHostPolicy {
    pub fn new(hosts: Vec<String>) -> Self {
        Self {
            allowed_hosts: hosts,
        }
    }

    pub fn check_url(&self, url: &str) -> Result<()> {
        let parsed = reqwest::Url::parse(url).context("Failed to parse target URL")?;
        let host = parsed.host_str().context("URL has no host")?;

        let allowed = self
            .allowed_hosts
            .iter()
            .any(|allowed_h| host == allowed_h || host.ends_with(&format!(".{}", allowed_h)));

        if !allowed {
            bail!(
                "Egress Security Violation: Target host '{}' is not in ALLOWED_HOSTS list {:?}",
                host,
                self.allowed_hosts
            );
        }
        Ok(())
    }
}

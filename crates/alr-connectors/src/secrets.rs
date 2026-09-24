use anyhow::{bail, Result};
use async_trait::async_trait;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SecretRef(pub String);

impl std::fmt::Display for SecretRef {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Clone)]
pub struct SecretValue(pub String);

impl std::fmt::Debug for SecretValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED_SECRET]")
    }
}

#[async_trait]
pub trait SecretStore: Send + Sync {
    async fn get(&self, reference: &SecretRef) -> Result<SecretValue>;
    async fn set(&self, reference: SecretRef, value: SecretValue) -> Result<()>;
}

/// Environment and In-Memory Secret Store with Redaction Support
#[derive(Clone, Default)]
pub struct EnvironmentSecretStore {
    in_memory: Arc<RwLock<HashMap<String, String>>>,
}

impl EnvironmentSecretStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl SecretStore for EnvironmentSecretStore {
    async fn get(&self, reference: &SecretRef) -> Result<SecretValue> {
        // 1. Check in-memory store
        if let Some(val) = self.in_memory.read().get(&reference.0) {
            return Ok(SecretValue(val.clone()));
        }

        // 2. Check environment variable
        if let Ok(val) = std::env::var(&reference.0) {
            return Ok(SecretValue(val));
        }

        bail!(
            "Secret reference '{}' not found in EnvironmentSecretStore",
            reference.0
        );
    }

    async fn set(&self, reference: SecretRef, value: SecretValue) -> Result<()> {
        self.in_memory.write().insert(reference.0, value.0);
        Ok(())
    }
}

pub struct SecretRedactor;

impl SecretRedactor {
    pub fn redact_text(text: &str) -> String {
        let mut sanitized = text.to_string();
        let patterns = [
            ("Bearer [a-zA-Z0-9_\\-\\.]+", "Bearer [REDACTED_TOKEN]"),
            ("api_key=[a-zA-Z0-9_\\-]+", "api_key=[REDACTED_KEY]"),
            ("password=[^&\\s]+", "password=[REDACTED_PASSWORD]"),
            ("secret=[^&\\s]+", "secret=[REDACTED_SECRET]"),
        ];

        for (pat, repl) in patterns {
            if let Ok(re) = regex::Regex::new(pat) {
                sanitized = re.replace_all(&sanitized, repl).to_string();
            }
        }

        sanitized
    }

    pub fn redact_pii(text: &str) -> String {
        let mut sanitized = Self::redact_text(text);
        let patterns = [
            (r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b", "[REDACTED_CPF]"),
            (r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b", "[REDACTED_CNPJ]"),
            (
                r"\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b",
                "[REDACTED_CARD]",
            ),
        ];

        for (pat, repl) in patterns {
            if let Ok(re) = regex::Regex::new(pat) {
                sanitized = re.replace_all(&sanitized, repl).to_string();
            }
        }

        sanitized
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum DataSensitivity {
    Public,
    Internal,
    Confidential,
    Sensitive,
}

pub struct DataEgressPolicy;

impl DataEgressPolicy {
    pub fn can_export_to_external(sensitivity: DataSensitivity) -> bool {
        match sensitivity {
            DataSensitivity::Public | DataSensitivity::Internal => true,
            DataSensitivity::Confidential | DataSensitivity::Sensitive => false,
        }
    }
}

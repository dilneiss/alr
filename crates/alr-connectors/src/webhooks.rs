use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundWebhookEvent {
    pub event_id: String,
    pub connector_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub signature: Option<String>,
    pub received_at: DateTime<Utc>,
}

pub struct WebhookValidator;

impl WebhookValidator {
    pub fn verify_signature(
        secret: &[u8],
        payload_bytes: &[u8],
        hex_signature: &str,
    ) -> Result<()> {
        let mut mac = HmacSha256::new_from_slice(secret)
            .map_err(|e| anyhow::anyhow!("HMAC init error: {}", e))?;
        mac.update(payload_bytes);
        let expected = hex::encode(mac.finalize().into_bytes());

        if expected != hex_signature.trim() {
            bail!("Webhook Security Violation: Invalid HMAC signature");
        }
        Ok(())
    }
}

/// In-Memory / Relational Event Store with Deduplication
#[derive(Clone, Default)]
pub struct EventStore {
    events: Arc<RwLock<HashMap<String, InboundWebhookEvent>>>,
    processed_hashes: Arc<RwLock<HashSet<String>>>,
}

impl EventStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_event(&self, event: InboundWebhookEvent) -> Result<bool> {
        let payload_str = serde_json::to_string(&event.payload)?;
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        payload_str.hash(&mut hasher);
        let hash_key = format!("{:016x}", hasher.finish());

        let mut hash_guard = self.processed_hashes.write();
        if hash_guard.contains(&hash_key) {
            return Ok(false); // Duplicate event, skip creation
        }

        hash_guard.insert(hash_key);
        self.events.write().insert(event.event_id.clone(), event);
        Ok(true) // Unique event registered
    }

    pub fn get_event(&self, event_id: &str) -> Option<InboundWebhookEvent> {
        self.events.read().get(event_id).cloned()
    }
}

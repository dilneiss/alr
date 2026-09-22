use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ModelStatus {
    Training,
    Candidate,
    Validated,
    Active,
    Deprecated,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelArtifact {
    pub model_id: String,
    pub name: String,
    pub version: u32,
    pub domain: String,
    pub task: String,
    pub format: String, // "onnx", "tensor_linear"
    pub input_features: usize,
    pub output_classes: usize,
    pub sha256: String,
    pub weights_blob: Vec<u8>,
    pub metadata: serde_json::Value,
    pub status: ModelStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ModelArtifact {
    pub fn compute_sha256(weights: &[u8]) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(weights);
        hex::encode(hasher.finalize())
    }

    pub fn new(
        name: impl Into<String>,
        domain: impl Into<String>,
        task: impl Into<String>,
        input_features: usize,
        output_classes: usize,
        weights: Vec<u8>,
    ) -> Self {
        let now = Utc::now();
        let sha256 = Self::compute_sha256(&weights);
        Self {
            model_id: format!(
                "model_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .chars()
                    .take(8)
                    .collect::<String>()
            ),
            name: name.into(),
            version: 1,
            domain: domain.into(),
            task: task.into(),
            format: "onnx".to_string(),
            input_features,
            output_classes,
            sha256,
            weights_blob: weights,
            metadata: serde_json::json!({}),
            status: ModelStatus::Candidate,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn verify_integrity(&self) -> bool {
        Self::compute_sha256(&self.weights_blob) == self.sha256
    }
}

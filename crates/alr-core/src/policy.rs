use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyPrediction {
    pub action_probabilities: Vec<(super::Action, f32)>,
    pub confidence: f32,
}

impl PolicyPrediction {
    pub fn best_action(&self) -> Option<(super::Action, f32)> {
        self.action_probabilities
            .iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .cloned()
    }
}

pub trait Policy: Send + Sync {
    fn predict(&self, state: &super::State) -> PolicyPrediction;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelOutput {
    pub logits: Vec<f32>,
    pub metadata: serde_json::Value,
}

pub trait LocalModel: Send + Sync {
    fn predict(&self, input: &[f32]) -> anyhow::Result<ModelOutput>;
}

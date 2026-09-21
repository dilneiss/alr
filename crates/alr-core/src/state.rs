use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct State {
    pub features: Vec<f32>,
    pub metadata: serde_json::Value,
}

impl State {
    pub fn new(features: Vec<f32>, metadata: serde_json::Value) -> Self {
        Self { features, metadata }
    }

    pub fn feature_hash(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        for f in &self.features {
            // quantized to avoid float precision jitter
            let quantized = (f * 1000.0).round() as i64;
            quantized.hash(&mut hasher);
        }
        format!("{:016x}", hasher.finish())
    }

    pub fn distance_l2(&self, other: &State) -> f32 {
        if self.features.len() != other.features.len() {
            return f32::MAX;
        }
        let sum_sq: f32 = self
            .features
            .iter()
            .zip(&other.features)
            .map(|(a, b)| (a - b) * (a - b))
            .sum();
        sum_sq.sqrt()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Experience {
    pub state: State,
    pub action: super::Action,
    pub reward: f32,
    pub next_state: Option<State>,
    pub terminal: bool,
}

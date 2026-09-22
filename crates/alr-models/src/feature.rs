use alr_core::State;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureSchema {
    pub name: String,
    pub version: u32,
    pub feature_names: Vec<String>,
    pub normalization_range: (f32, f32),
}

impl FeatureSchema {
    pub fn snake_v1() -> Self {
        Self {
            name: "snake_features".to_string(),
            version: 1,
            feature_names: vec![
                "danger_front".to_string(),
                "danger_left".to_string(),
                "danger_right".to_string(),
                "food_up".to_string(),
                "food_down".to_string(),
                "food_left".to_string(),
                "food_right".to_string(),
                "direction".to_string(),
            ],
            normalization_range: (0.0, 1.0),
        }
    }

    pub fn support_v1() -> Self {
        Self {
            name: "support_features".to_string(),
            version: 1,
            feature_names: (0..10).map(|i| format!("intent_feat_{}", i)).collect(),
            normalization_range: (0.0, 1.0),
        }
    }
}

pub struct FeatureVectorizer;

impl FeatureVectorizer {
    pub fn vectorize(state: &State, schema: &FeatureSchema) -> Result<Vec<f32>> {
        if state.features.len() != schema.feature_names.len() {
            bail!(
                "Incompatible Feature Schema: State has {} features, schema '{}' (v{}) requires {}",
                state.features.len(),
                schema.name,
                schema.version,
                schema.feature_names.len()
            );
        }

        let mut clamped = Vec::with_capacity(state.features.len());
        for &f in &state.features {
            clamped.push(f.clamp(schema.normalization_range.0, schema.normalization_range.1));
        }

        Ok(clamped)
    }
}

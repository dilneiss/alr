use crate::artifact::ModelArtifact;
use crate::dataset::{DataSplit, ExperienceDataset};
use anyhow::Result;

pub struct DistillationPipeline;

impl DistillationPipeline {
    /// Distills teacher experiences into a lightweight linear neural policy for Snake (8 features -> 4 actions)
    #[allow(clippy::needless_range_loop)]
    pub fn distill_snake_policy(dataset: &ExperienceDataset) -> Result<ModelArtifact> {
        let input_dim = 8;
        let output_dim = 4;

        let mut weights = vec![vec![0.0f32; output_dim]; input_dim];
        let mut bias = vec![0.0f32; output_dim];

        // Learn linear projection weights from verified training experiences
        for sample in dataset.get_split(DataSplit::Train) {
            if sample.verified
                && sample.features.len() == input_dim
                && sample.target_class < output_dim
            {
                let target = sample.target_class;
                bias[target] += 0.05;
                for f in 0..input_dim {
                    weights[f][target] += sample.features[f] * 0.1;
                }
            }
        }

        let serialized_weights = serde_json::to_vec(&(weights, bias))?;

        let artifact = ModelArtifact::new(
            "snake_move_policy",
            "snake",
            "move_prediction",
            input_dim,
            output_dim,
            serialized_weights,
        );

        Ok(artifact)
    }

    /// Distills Support customer intent classification experiences (10 features -> 5 intents)
    #[allow(clippy::needless_range_loop)]
    pub fn distill_support_intent_model(dataset: &ExperienceDataset) -> Result<ModelArtifact> {
        let input_dim = 10;
        let output_dim = 5;

        let mut weights = vec![vec![0.0f32; output_dim]; input_dim];
        let mut bias = vec![0.0f32; output_dim];

        for sample in dataset.get_split(DataSplit::Train) {
            if sample.verified
                && sample.features.len() == input_dim
                && sample.target_class < output_dim
            {
                let target = sample.target_class;
                bias[target] += 0.1;
                for f in 0..input_dim {
                    weights[f][target] += sample.features[f] * 0.2;
                }
            }
        }

        let serialized_weights = serde_json::to_vec(&(weights, bias))?;

        let artifact = ModelArtifact::new(
            "support_intent_classifier",
            "customer_support",
            "intent_classification",
            input_dim,
            output_dim,
            serialized_weights,
        );

        Ok(artifact)
    }
}

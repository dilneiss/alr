use crate::artifact::ModelArtifact;
use crate::dataset::{DataSplit, ExperienceDataset};
use crate::runtime::{LocalModelRuntime, OnnxModelRuntime};
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEvaluation {
    pub train_accuracy: f32,
    pub validation_accuracy: f32,
    pub holdout_accuracy: f32,
    pub avg_latency_nanos: u64,
}

pub struct ModelEvaluator;

impl ModelEvaluator {
    pub async fn evaluate(
        artifact: &ModelArtifact,
        dataset: &ExperienceDataset,
    ) -> Result<ModelEvaluation> {
        let runtime = OnnxModelRuntime::new();
        let handle = runtime.load(artifact).await?;

        let eval_split = |split: DataSplit| -> (f32, u64) {
            let samples = dataset.get_split(split);
            if samples.is_empty() {
                return (1.0, 0);
            }

            let mut correct = 0;
            let mut total_latency: u128 = 0;

            for sample in &samples {
                if let Ok(pred) = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current()
                        .block_on(runtime.predict(&handle, &sample.features))
                }) {
                    total_latency += pred.latency_nanos;
                    if pred.predicted_class == sample.target_class {
                        correct += 1;
                    }
                }
            }

            let acc = correct as f32 / samples.len() as f32;
            let avg_lat = (total_latency / samples.len().max(1) as u128) as u64;
            (acc, avg_lat)
        };

        let (train_acc, _) = eval_split(DataSplit::Train);
        let (val_acc, _) = eval_split(DataSplit::Validation);
        let (holdout_acc, latency) = eval_split(DataSplit::Holdout);

        Ok(ModelEvaluation {
            train_accuracy: train_acc,
            validation_accuracy: val_acc,
            holdout_accuracy: holdout_acc,
            avg_latency_nanos: latency,
        })
    }
}

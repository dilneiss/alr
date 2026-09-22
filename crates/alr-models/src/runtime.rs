use crate::artifact::ModelArtifact;
use anyhow::{bail, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelHandle {
    pub model_id: String,
    pub name: String,
    pub version: u32,
    pub input_features: usize,
    pub output_classes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPrediction {
    pub class_probabilities: Vec<f32>,
    pub predicted_class: usize,
    pub probability: f32,
    pub latency_nanos: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDecision {
    pub action_id: String,
    pub confidence: f32,
    pub model_name: String,
    pub model_version: u32,
    pub latency_nanos: u128,
}

/// Abstract runtime for local model execution (e.g., ONNX, TorchScript, or native Tensor inference)
#[async_trait]
pub trait LocalModelRuntime: Send + Sync {
    async fn load(&self, artifact: &ModelArtifact) -> Result<ModelHandle>;
    async fn predict(&self, handle: &ModelHandle, input: &[f32]) -> Result<ModelPrediction>;
    async fn unload(&self, handle: &ModelHandle) -> Result<()>;
}

type ModelWeightsMap = std::collections::HashMap<String, (ModelHandle, Vec<Vec<f32>>, Vec<f32>)>;

/// Native ONNX-compatible local runtime emulator (Tensors / Linear layer forward pass)
pub struct OnnxModelRuntime {
    models: parking_lot::RwLock<ModelWeightsMap>,
}

impl Default for OnnxModelRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl OnnxModelRuntime {
    pub fn new() -> Self {
        Self {
            models: parking_lot::RwLock::new(std::collections::HashMap::new()),
        }
    }
}

#[async_trait]
impl LocalModelRuntime for OnnxModelRuntime {
    async fn load(&self, artifact: &ModelArtifact) -> Result<ModelHandle> {
        if !artifact.verify_integrity() {
            bail!("Model Integrity Violation: SHA-256 signature does not match artifact bytes");
        }

        let (weights, bias) = if let Ok(parsed) =
            serde_json::from_slice::<(Vec<Vec<f32>>, Vec<f32>)>(&artifact.weights_blob)
        {
            parsed
        } else {
            let mut w = vec![vec![0.0f32; artifact.output_classes]; artifact.input_features];
            #[allow(clippy::needless_range_loop)]
            for i in 0..artifact.input_features.min(artifact.output_classes) {
                w[i][i] = 1.0;
            }
            (w, vec![0.0f32; artifact.output_classes])
        };

        let handle = ModelHandle {
            model_id: artifact.model_id.clone(),
            name: artifact.name.clone(),
            version: artifact.version,
            input_features: artifact.input_features,
            output_classes: artifact.output_classes,
        };

        self.models
            .write()
            .insert(handle.model_id.clone(), (handle.clone(), weights, bias));
        Ok(handle)
    }

    async fn predict(&self, handle: &ModelHandle, input: &[f32]) -> Result<ModelPrediction> {
        let start = std::time::Instant::now();
        let guard = self.models.read();
        let (_, weights, bias) = guard
            .get(&handle.model_id)
            .ok_or_else(|| anyhow::anyhow!("Model not loaded in runtime: {}", handle.model_id))?;

        if input.len() != handle.input_features {
            bail!(
                "Dimension Mismatch: Expected {} input features, got {}",
                handle.input_features,
                input.len()
            );
        }

        // Tensor matrix-vector multiply + bias forward pass
        let mut logits = bias.clone();
        #[allow(clippy::needless_range_loop)]
        for c in 0..handle.output_classes {
            for (f, &val) in input.iter().enumerate().take(handle.input_features) {
                logits[c] += val * weights[f][c];
            }
        }

        // Softmax
        let max_logit = logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let exp_sum: f32 = logits.iter().map(|&x| (x - max_logit).exp()).sum();
        let probs: Vec<f32> = if exp_sum > 0.0 {
            logits
                .iter()
                .map(|&x| (x - max_logit).exp() / exp_sum)
                .collect()
        } else {
            vec![1.0 / handle.output_classes as f32; handle.output_classes]
        };

        let mut best_class = 0;
        let mut best_prob = 0.0;
        for (idx, &p) in probs.iter().enumerate() {
            if p > best_prob {
                best_prob = p;
                best_class = idx;
            }
        }

        let latency = start.elapsed().as_nanos();

        Ok(ModelPrediction {
            class_probabilities: probs,
            predicted_class: best_class,
            probability: best_prob,
            latency_nanos: latency,
        })
    }

    async fn unload(&self, handle: &ModelHandle) -> Result<()> {
        self.models.write().remove(&handle.model_id);
        Ok(())
    }
}

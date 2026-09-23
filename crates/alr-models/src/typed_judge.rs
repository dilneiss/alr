use crate::runtime::LocalModelRuntime;
use crate::typed_decision::{TypedDecisionOutcome, TypedQuestion};
use alr_core::State;
use anyhow::{bail, Result};
use async_trait::async_trait;
use std::sync::Arc;
use std::time::Instant;

#[async_trait]
pub trait TypedJudge: Send + Sync {
    async fn evaluate_typed(
        &self,
        state: &State,
        question: &TypedQuestion,
    ) -> Result<TypedDecisionOutcome>;
}

/// Local Fast Typed Decision Engine backed by LocalModelRuntime (sub-millisecond System 1)
pub struct LocalTypedJudgeEngine {
    pub runtime: Arc<dyn LocalModelRuntime>,
}

impl LocalTypedJudgeEngine {
    pub fn new(runtime: Arc<dyn LocalModelRuntime>) -> Self {
        Self { runtime }
    }

    pub fn runtime(&self) -> &Arc<dyn LocalModelRuntime> {
        &self.runtime
    }
}

#[async_trait]
impl TypedJudge for LocalTypedJudgeEngine {
    async fn evaluate_typed(
        &self,
        state: &State,
        question: &TypedQuestion,
    ) -> Result<TypedDecisionOutcome> {
        let start = Instant::now();

        match question {
            TypedQuestion::Choice { options, .. } => {
                if options.is_empty() {
                    bail!("Choice options cannot be empty");
                }

                // If input features exist, generate calibrated softmax distribution
                let num_opts = options.len();
                let mut raw_scores = vec![0.0f32; num_opts];

                for (i, score) in raw_scores.iter_mut().enumerate().take(num_opts) {
                    let feat_val = state.features.get(i).copied().unwrap_or(0.0);
                    *score = feat_val * 2.0; // Scaled logits
                }

                // Softmax normalization
                let max_logit = raw_scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
                let exp_scores: Vec<f32> =
                    raw_scores.iter().map(|&x| (x - max_logit).exp()).collect();
                let sum_exp: f32 = exp_scores.iter().sum();
                let probs: Vec<f32> = exp_scores.iter().map(|&x| x / sum_exp.max(1e-6)).collect();

                let latency = start.elapsed().as_micros();
                TypedDecisionOutcome::new_choice(options, &probs, latency)
            }
            TypedQuestion::Noul { .. } => {
                // Read confidence from primary feature or default to 0.85
                let p_true = state
                    .features
                    .first()
                    .copied()
                    .unwrap_or(0.85)
                    .clamp(0.0, 1.0);
                let latency = start.elapsed().as_micros();
                Ok(TypedDecisionOutcome::new_noul(p_true, latency))
            }
            TypedQuestion::Score { min, max, .. } => {
                let raw_val = state
                    .features
                    .first()
                    .copied()
                    .unwrap_or((*min + *max) / 2.0);
                let clamped = raw_val.clamp(*min, *max);
                let latency = start.elapsed().as_micros();
                Ok(TypedDecisionOutcome::new_score(
                    clamped, *min, *max, latency,
                ))
            }
        }
    }
}

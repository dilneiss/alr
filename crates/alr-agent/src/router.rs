use alr_core::{Action, Decision, DecisionContext, DecisionSource, State};
use alr_models::{DistributionShiftDetector, LocalModelRuntime, ModelHandle, OnnxModelRuntime};
use anyhow::{bail, Result};
use async_trait::async_trait;

#[async_trait]
pub trait DecisionProvider: Send + Sync {
    fn provider_name(&self) -> &str;
    fn source_kind(&self) -> DecisionSource;
    async fn decide(&self, state: &State, context: &DecisionContext) -> Result<Option<Decision>>;
}

pub struct LocalModelDecisionProvider {
    runtime: OnnxModelRuntime,
    handle: ModelHandle,
    shift_detector: Option<DistributionShiftDetector>,
    confidence_threshold: f32,
    class_to_action: Vec<String>,
}

impl LocalModelDecisionProvider {
    pub fn new(
        handle: ModelHandle,
        shift_detector: Option<DistributionShiftDetector>,
        confidence_threshold: f32,
        class_to_action: Vec<String>,
    ) -> Self {
        Self {
            runtime: OnnxModelRuntime::new(),
            handle,
            shift_detector,
            confidence_threshold,
            class_to_action,
        }
    }
}

#[async_trait]
impl DecisionProvider for LocalModelDecisionProvider {
    fn provider_name(&self) -> &str {
        "LocalModelDecisionProvider"
    }

    fn source_kind(&self) -> DecisionSource {
        DecisionSource::NeuralPolicy
    }

    async fn decide(&self, state: &State, _context: &DecisionContext) -> Result<Option<Decision>> {
        // 1. OOD / Distribution Shift Check
        if let Some(ref detector) = self.shift_detector {
            let (dist, is_ood) = detector.evaluate_ood(state);
            if is_ood {
                tracing::info!(
                    "Local Model abstains: State is Out-Of-Distribution (normalized dist = {:.3})",
                    dist
                );
                return Ok(None);
            }
        }

        // 2. Local ONNX inference
        let pred = self.runtime.predict(&self.handle, &state.features).await?;

        // 3. Confidence threshold check
        if pred.probability < self.confidence_threshold {
            tracing::info!(
                "Local Model abstains: Prediction probability {:.3} is below threshold {:.3}",
                pred.probability,
                self.confidence_threshold
            );
            return Ok(None);
        }

        let action_id = self
            .class_to_action
            .get(pred.predicted_class)
            .cloned()
            .unwrap_or_else(|| "UNKNOWN".to_string());

        let decision = Decision::new(
            Action::new(
                action_id,
                serde_json::json!({ "class": pred.predicted_class }),
            ),
            pred.probability,
            DecisionSource::NeuralPolicy,
        )
        .with_explanation(format!(
            "Local Model '{}' inference (latency: {} ns)",
            self.handle.name, pred.latency_nanos
        ));

        Ok(Some(decision))
    }
}

/// Strict 7-Level Decision Router
pub struct DecisionRouter {
    pub providers: Vec<Box<dyn DecisionProvider>>,
}

impl Default for DecisionRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl DecisionRouter {
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
        }
    }

    pub fn register_provider(&mut self, provider: Box<dyn DecisionProvider>) {
        self.providers.push(provider);
    }

    pub async fn route_decision(
        &self,
        state: &State,
        context: &DecisionContext,
    ) -> Result<Decision> {
        for provider in &self.providers {
            if let Ok(Some(decision)) = provider.decide(state, context).await {
                return Ok(decision);
            }
        }

        bail!("Decision Router: All decision providers abstained or failed to produce an action");
    }
}

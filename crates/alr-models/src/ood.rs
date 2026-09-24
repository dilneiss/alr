use alr_core::State;
use alr_execution::emergency::{EmergencyStopReason, GlobalEmergencyStop};
use serde::{Deserialize, Serialize};

/// Report evaluating state novelty, distribution shift, and safe abstention status
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SafeAbstentionReport {
    pub should_abstain: bool,
    pub confidence: f32,
    pub normalized_distance: f32,
    pub is_extreme_novelty: bool,
    pub reason: String,
    pub action_allowed: bool,
    pub escalation_target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionShiftDetector {
    pub reference_centroid: Vec<f32>,
    pub max_in_distribution_radius: f32,
    pub ood_threshold: f32,
}
impl DistributionShiftDetector {
    pub fn new(centroid: Vec<f32>, max_radius: f32, ood_threshold: f32) -> Self {
        Self {
            reference_centroid: centroid,
            max_in_distribution_radius: max_radius.max(0.1),
            ood_threshold,
        }
    }

    /// Computes normalized Euclidean distance to reference training distribution centroid
    pub fn evaluate_ood(&self, state: &State) -> (f32, bool) {
        if state.features.len() != self.reference_centroid.len() || state.features.is_empty() {
            return (1.0, true); // Dimension mismatch is immediately Out-Of-Distribution
        }

        let dist_sq: f32 = state
            .features
            .iter()
            .zip(&self.reference_centroid)
            .map(|(a, b)| (a - b) * (a - b))
            .sum();

        let l2_dist = dist_sq.sqrt();
        let normalized_dist = (l2_dist / self.max_in_distribution_radius).clamp(0.0, 1.0);
        let is_ood = normalized_dist >= self.ood_threshold;

        (normalized_dist, is_ood)
    }

    /// Computes similarity of a state to the reference distribution in [0.0, 1.0]
    pub fn evaluate_similarity(&self, state: &State) -> f32 {
        let (dist, _) = self.evaluate_ood(state);
        (1.0 - dist).clamp(0.0, 1.0)
    }

    /// Evaluates vector similarity directly (for visual embeddings or raw feature vectors)
    pub fn evaluate_vector_similarity(&self, features: &[f32]) -> f32 {
        let state = State::new(features.to_vec(), serde_json::Value::Null);
        self.evaluate_similarity(&state)
    }

    /// Evaluates whether extreme novelty requires safe abstention
    pub fn evaluate_safe_abstention(&self, state: &State) -> SafeAbstentionReport {
        let (normalized_dist, is_ood) = self.evaluate_ood(state);
        let similarity = (1.0 - normalized_dist).clamp(0.0, 1.0);
        let is_extreme_novelty = similarity < 0.50;

        let should_abstain = is_extreme_novelty || (is_ood && similarity < self.ood_threshold);
        let action_allowed = !should_abstain;

        let (reason, escalation_target) = if is_extreme_novelty {
            (
                format!(
                    "Extreme novelty detected! State similarity ({:.3}) is below 0.50 threshold. Safe abstention engaged to prevent blind actions.",
                    similarity
                ),
                "HumanSupervisor".to_string(),
            )
        } else if is_ood {
            (
                format!(
                    "Moderate distribution shift detected (normalized distance {:.3} >= threshold {:.3}). Escalating to LLM Teacher Oracle.",
                    normalized_dist, self.ood_threshold
                ),
                "LLMTeacherOracle".to_string(),
            )
        } else {
            (
                format!(
                    "In-distribution state with confidence {:.3}. Routine execution allowed.",
                    similarity
                ),
                "None".to_string(),
            )
        };

        SafeAbstentionReport {
            should_abstain,
            confidence: similarity,
            normalized_distance: normalized_dist,
            is_extreme_novelty,
            reason,
            action_allowed,
            escalation_target,
        }
    }

    /// Evaluates state and halts physical actions immediately via GlobalEmergencyStop if extreme novelty is detected
    pub fn evaluate_and_enforce_safety(&self, state: &State) -> SafeAbstentionReport {
        let report = self.evaluate_safe_abstention(state);
        if report.is_extreme_novelty {
            GlobalEmergencyStop::trigger_with_reason(EmergencyStopReason::OutofDistribution(
                report.reason.clone(),
            ));
        }
        report
    }

    /// Evaluates visual frame embedding and halts physical actions if extreme novelty is detected
    pub fn evaluate_visual_frame_safety(&self, visual_features: &[f32]) -> SafeAbstentionReport {
        let state = State::new(visual_features.to_vec(), serde_json::Value::Null);
        self.evaluate_and_enforce_safety(&state)
    }
}

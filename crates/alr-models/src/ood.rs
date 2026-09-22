use alr_core::State;
use serde::{Deserialize, Serialize};

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
}

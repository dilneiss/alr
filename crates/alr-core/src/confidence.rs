use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceFactors {
    pub similarity_to_history: f32,
    pub historical_success_rate: f32,
    pub observation_density: f32,
    pub policy_margin: f32,
    pub novelty_penalty: f32,
    pub policy_conflict: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceAssessment {
    pub score: f32,
    pub factors: ConfidenceFactors,
    pub threshold_met: bool,
    pub explanation: String,
}

#[derive(Debug, Clone)]
pub struct ConfidenceEngine {
    pub min_threshold: f32,
    pub caution_threshold: f32,
}

impl Default for ConfidenceEngine {
    fn default() -> Self {
        Self {
            min_threshold: 0.85,
            caution_threshold: 0.60,
        }
    }
}

impl ConfidenceEngine {
    pub fn new(min_threshold: f32, caution_threshold: f32) -> Self {
        Self {
            min_threshold,
            caution_threshold,
        }
    }

    pub fn compute(&self, factors: ConfidenceFactors) -> ConfidenceAssessment {
        // Weighted positive components normalize to 1.0 (0.30 + 0.40 + 0.15 + 0.15 = 1.0)
        let positive_score = (factors.similarity_to_history * 0.30)
            + (factors.historical_success_rate * 0.40)
            + (factors.observation_density * 0.15)
            + (factors.policy_margin * 0.15);

        let penalty = (factors.novelty_penalty * 0.15) + (factors.policy_conflict * 0.15);
        let raw_score = positive_score - penalty;

        let score = raw_score.clamp(0.0, 1.0);
        let threshold_met = score >= self.min_threshold;

        let explanation = if score >= self.min_threshold {
            format!(
                "High confidence ({:.2} >= {:.2}): strong historical success rate ({:.2}) and low novelty penalty",
                score, self.min_threshold, factors.historical_success_rate
            )
        } else if score >= self.caution_threshold {
            format!(
                "Moderate confidence ({:.2}): requires strict evaluation/monitoring",
                score
            )
        } else {
            format!(
                "Low confidence ({:.2} < {:.2}): potential unfamiliarity, triggers LLM/fallback consideration",
                score, self.caution_threshold
            )
        };

        ConfidenceAssessment {
            score,
            factors,
            threshold_met,
            explanation,
        }
    }
}

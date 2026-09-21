use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoveltyScore {
    pub value: f32, // 0.0 (completely familiar) to 1.0 (completely new)
    pub reasons: Vec<String>,
}

impl NoveltyScore {
    pub fn new(value: f32, reasons: Vec<String>) -> Self {
        Self {
            value: value.clamp(0.0, 1.0),
            reasons,
        }
    }

    pub fn familiar() -> Self {
        Self {
            value: 0.0,
            reasons: vec!["State matches known distribution closely".to_string()],
        }
    }

    pub fn is_novel(&self, threshold: f32) -> bool {
        self.value >= threshold
    }
}

pub trait NoveltyDetector: Send + Sync {
    fn evaluate(&self, state: &super::State) -> NoveltyScore;
    fn observe(&mut self, state: &super::State);
    fn count(&self) -> usize;
}

#[derive(Debug, Clone, Default)]
pub struct DensityNoveltyDetector {
    observed_states: Vec<super::State>,
    max_history: usize,
    k_nearest: usize,
}

impl DensityNoveltyDetector {
    pub fn new(max_history: usize, k_nearest: usize) -> Self {
        Self {
            observed_states: Vec::new(),
            max_history,
            k_nearest: k_nearest.max(1),
        }
    }
}

impl NoveltyDetector for DensityNoveltyDetector {
    fn evaluate(&self, state: &super::State) -> NoveltyScore {
        if self.observed_states.is_empty() {
            return NoveltyScore::new(
                1.0,
                vec!["No prior states observed (cold start)".to_string()],
            );
        }

        let mut distances: Vec<f32> = self
            .observed_states
            .iter()
            .map(|s| s.distance_l2(state))
            .collect();
        distances.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let k = self.k_nearest.min(distances.len());
        let avg_k_dist: f32 = distances.iter().take(k).sum::<f32>() / k as f32;

        let mut reasons = Vec::new();
        let value = (avg_k_dist / 3.0).clamp(0.0, 1.0);

        if value > 0.6 {
            reasons.push(format!(
                "High distance ({:.3}) to nearest {} neighbors",
                avg_k_dist, k
            ));
        } else if value > 0.2 {
            reasons.push(format!(
                "Moderate distance ({:.3}) to known state cluster",
                avg_k_dist
            ));
        } else {
            reasons.push("State is within dense known region".to_string());
        }

        NoveltyScore::new(value, reasons)
    }

    fn observe(&mut self, state: &super::State) {
        if self.observed_states.len() >= self.max_history {
            self.observed_states.remove(0);
        }
        self.observed_states.push(state.clone());
    }

    fn count(&self) -> usize {
        self.observed_states.len()
    }
}

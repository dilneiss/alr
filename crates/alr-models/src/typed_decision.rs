use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Formal Typed Question Primitives (inspired by JEV & Laya)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TypedQuestion {
    /// Discrete choice over a closed set of categorical options
    Choice {
        options: Vec<String>,
        instructions: String,
        criteria: Option<HashMap<String, String>>,
    },
    /// Continuous or ordinal scoring on a bounded scale [min, max]
    Score {
        min: f32,
        max: f32,
        instructions: String,
        rubric: Option<Vec<String>>,
    },
    /// Calibrated Boolean evaluation of a logical proposition (Noul)
    Noul {
        proposition: String,
        context_criteria: Option<String>,
    },
}

/// Typed Outcome containing calibrated probabilities and entropy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedDecisionOutcome {
    pub question_type: String,
    pub primary_decision: String,
    pub confidence: f32,
    pub probabilities: HashMap<String, f32>,
    pub latency_micros: u128,
    pub entropy: f32,
    pub is_calibrated: bool,
}

impl TypedDecisionOutcome {
    pub fn new_choice(options: &[String], probs: &[f32], latency_micros: u128) -> Result<Self> {
        if options.is_empty() || options.len() != probs.len() {
            bail!("Options and probabilities length mismatch");
        }

        let mut map = HashMap::new();
        let mut best_option = String::new();
        let mut best_p = -1.0f32;
        let mut sum_p = 0.0f32;
        let mut entropy = 0.0f32;

        for (opt, &p) in options.iter().zip(probs.iter()) {
            map.insert(opt.clone(), p);
            sum_p += p;
            if p > best_p {
                best_p = p;
                best_option = opt.clone();
            }
            if p > 1e-6 {
                entropy -= p * p.ln();
            }
        }

        // Verify probabilities sum roughly to 1.0
        let is_calibrated = (sum_p - 1.0).abs() < 0.05;

        Ok(Self {
            question_type: "choice".to_string(),
            primary_decision: best_option,
            confidence: best_p,
            probabilities: map,
            latency_micros,
            entropy,
            is_calibrated,
        })
    }

    pub fn new_noul(p_true: f32, latency_micros: u128) -> Self {
        let p_false = (1.0 - p_true).clamp(0.0, 1.0);
        let mut probs = HashMap::new();
        probs.insert("true".to_string(), p_true);
        probs.insert("false".to_string(), p_false);

        let mut entropy = 0.0;
        if p_true > 1e-6 {
            entropy -= p_true * p_true.ln();
        }
        if p_false > 1e-6 {
            entropy -= p_false * p_false.ln();
        }

        Self {
            question_type: "noul".to_string(),
            primary_decision: if p_true >= 0.5 {
                "true".to_string()
            } else {
                "false".to_string()
            },
            confidence: p_true.max(p_false),
            probabilities: probs,
            latency_micros,
            entropy,
            is_calibrated: true,
        }
    }

    pub fn new_score(score: f32, min: f32, max: f32, latency_micros: u128) -> Self {
        let normalized = if (max - min).abs() > 1e-6 {
            (score - min) / (max - min)
        } else {
            0.5
        };

        let mut probs = HashMap::new();
        probs.insert("score".to_string(), score);
        probs.insert("normalized".to_string(), normalized);

        Self {
            question_type: "score".to_string(),
            primary_decision: format!("{:.3}", score),
            confidence: 1.0 - (normalized - 0.5).abs() * 0.2, // Higher certainty at boundaries
            probabilities: probs,
            latency_micros,
            entropy: 0.0,
            is_calibrated: true,
        }
    }

    /// Calculate Brier Score loss against actual ground truth outcome
    pub fn calculate_brier_score(&self, ground_truth: &str) -> f32 {
        let mut sum_sq_err = 0.0f32;
        for (label, &p) in &self.probabilities {
            let actual = if label == ground_truth {
                1.0f32
            } else {
                0.0f32
            };
            sum_sq_err += (p - actual).powi(2);
        }
        sum_sq_err / (self.probabilities.len().max(1) as f32)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_choice_outcome_creation_and_calibration() {
        let opts = vec!["opt_a".to_string(), "opt_b".to_string(), "opt_c".to_string()];
        let probs = vec![0.70, 0.20, 0.10];

        let outcome = TypedDecisionOutcome::new_choice(&opts, &probs, 15).unwrap();
        assert_eq!(outcome.question_type, "choice");
        assert_eq!(outcome.primary_decision, "opt_a");
        assert!((outcome.confidence - 0.70).abs() < 1e-4);
        assert!(outcome.is_calibrated);
        assert!(outcome.entropy > 0.0);

        // Mismatch length error
        assert!(TypedDecisionOutcome::new_choice(&opts, &[0.5, 0.5], 10).is_err());
        assert!(TypedDecisionOutcome::new_choice(&[], &[], 10).is_err());
    }

    #[test]
    fn test_noul_outcome_evaluation() {
        let noul_high = TypedDecisionOutcome::new_noul(0.92, 12);
        assert_eq!(noul_high.question_type, "noul");
        assert_eq!(noul_high.primary_decision, "true");
        assert!((noul_high.confidence - 0.92).abs() < 1e-4);
        assert_eq!(noul_high.probabilities["true"], 0.92);
        assert!((noul_high.probabilities["false"] - 0.08).abs() < 1e-4);

        let noul_low = TypedDecisionOutcome::new_noul(0.15, 14);
        assert_eq!(noul_low.primary_decision, "false");
        assert!((noul_low.confidence - 0.85).abs() < 1e-4);
    }

    #[test]
    fn test_score_outcome_and_normalization() {
        let score_mid = TypedDecisionOutcome::new_score(2.5, 0.0, 5.0, 20);
        assert_eq!(score_mid.question_type, "score");
        assert_eq!(score_mid.probabilities["score"], 2.5);
        assert!((score_mid.probabilities["normalized"] - 0.5).abs() < 1e-4);

        let score_edge = TypedDecisionOutcome::new_score(10.0, 0.0, 10.0, 18);
        assert!((score_edge.probabilities["normalized"] - 1.0).abs() < 1e-4);
    }

    #[test]
    fn test_brier_score_calculation() {
        let opts = vec!["buy".to_string(), "sell".to_string()];
        // Perfect prediction: 1.0 for true label
        let perfect = TypedDecisionOutcome::new_choice(&opts, &[1.0, 0.0], 5).unwrap();
        assert_eq!(perfect.calculate_brier_score("buy"), 0.0);

        // Worst prediction: 0.0 for true label
        assert_eq!(perfect.calculate_brier_score("sell"), 1.0);

        // Uncertain prediction: 0.5 / 0.5 -> ((0.5 - 1)^2 + (0.5 - 0)^2) / 2 = (0.25 + 0.25)/2 = 0.25
        let uncertain = TypedDecisionOutcome::new_choice(&opts, &[0.5, 0.5], 5).unwrap();
        assert!((uncertain.calculate_brier_score("buy") - 0.25).abs() < 1e-4);
    }
}

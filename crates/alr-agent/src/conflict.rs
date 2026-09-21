use crate::procedural::ProceduralSkill;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictResolutionStrategy {
    HighestPriority,
    LowestRisk,
    HighestConfidence,
    FallbackToOracle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyConflict {
    pub skill_a_name: String,
    pub skill_b_name: String,
    pub conflict_description: String,
}

pub struct PolicyConflictEngine;

impl PolicyConflictEngine {
    /// Detect if two active candidate skills produce contradictory outcomes
    /// (e.g. Skill A immediately replies and resolves, while Skill B escalates to human)
    pub fn detect_conflict(
        skill_a: &ProceduralSkill,
        skill_b: &ProceduralSkill,
    ) -> Option<PolicyConflict> {
        let has_reply_a = skill_a
            .steps
            .iter()
            .any(|s| s.tool_name == "send_ticket_reply");
        let has_escalate_a = skill_a
            .steps
            .iter()
            .any(|s| s.tool_name == "escalate_ticket");

        let has_reply_b = skill_b
            .steps
            .iter()
            .any(|s| s.tool_name == "send_ticket_reply");
        let has_escalate_b = skill_b
            .steps
            .iter()
            .any(|s| s.tool_name == "escalate_ticket");

        if (has_reply_a && has_escalate_b) || (has_escalate_a && has_reply_b) {
            Some(PolicyConflict {
                skill_a_name: skill_a.name.clone(),
                skill_b_name: skill_b.name.clone(),
                conflict_description: "Contradictory resolution: one skill commands immediate reply while the other commands tier-2 human escalation".to_string(),
            })
        } else {
            None
        }
    }

    /// Resolves detected policy conflict using a deterministic, documented strategy
    pub fn resolve_conflict<'a>(
        skill_a: &'a ProceduralSkill,
        skill_b: &'a ProceduralSkill,
        strategy: ConflictResolutionStrategy,
    ) -> Result<&'a ProceduralSkill> {
        match strategy {
            ConflictResolutionStrategy::HighestConfidence => {
                if (skill_a.confidence - skill_b.confidence).abs() > 0.01 {
                    if skill_a.confidence > skill_b.confidence {
                        Ok(skill_a)
                    } else {
                        Ok(skill_b)
                    }
                } else if skill_a.success_rate >= skill_b.success_rate {
                    Ok(skill_a)
                } else {
                    Ok(skill_b)
                }
            }
            ConflictResolutionStrategy::LowestRisk => {
                let risk_a = skill_a.steps.len();
                let risk_b = skill_b.steps.len();
                if risk_a <= risk_b {
                    Ok(skill_a)
                } else {
                    Ok(skill_b)
                }
            }
            ConflictResolutionStrategy::HighestPriority => {
                if skill_a.version >= skill_b.version {
                    Ok(skill_a)
                } else {
                    Ok(skill_b)
                }
            }
            ConflictResolutionStrategy::FallbackToOracle => {
                bail!("Unresolvable policy conflict between '{}' and '{}'; triggering LLM Oracle fallback", skill_a.name, skill_b.name);
            }
        }
    }
}

/// Confidence Calibration Bucket
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceBucket {
    pub min_confidence: f32,
    pub max_confidence: f32,
    pub total_predictions: usize,
    pub successful_predictions: usize,
    pub empirical_accuracy: f32,
}

pub struct ConfidenceCalibrator;

impl ConfidenceCalibrator {
    pub fn compute_calibration(predictions: &[(f32, bool)]) -> Vec<ConfidenceBucket> {
        let mut buckets = vec![
            (0.90, 1.00, 0, 0),
            (0.80, 0.899, 0, 0),
            (0.70, 0.799, 0, 0),
            (0.60, 0.699, 0, 0),
            (0.00, 0.599, 0, 0),
        ];

        for &(conf, success) in predictions {
            for b in buckets.iter_mut() {
                if conf >= b.0 && conf <= b.1 {
                    b.2 += 1;
                    if success {
                        b.3 += 1;
                    }
                    break;
                }
            }
        }

        buckets
            .into_iter()
            .map(|(min_c, max_c, total, success)| {
                let empirical_accuracy = if total > 0 {
                    success as f32 / total as f32
                } else {
                    0.0
                };
                ConfidenceBucket {
                    min_confidence: min_c,
                    max_confidence: max_c,
                    total_predictions: total,
                    successful_predictions: success,
                    empirical_accuracy,
                }
            })
            .collect()
    }
}

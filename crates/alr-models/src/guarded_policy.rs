use crate::typed_decision::TypedQuestion;
use crate::typed_judge::TypedJudge;
use alr_core::{Action, Decision, DecisionSource, State};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardedMoveDecision {
    pub decision: Decision,
    pub proposed_direction: String,
    pub executed_direction: String,
    pub safety_intervened: bool,
    pub safe_directions: Vec<String>,
    pub probabilities: HashMap<String, f32>,
    pub dead_end_risk: f32,
    pub food_reachable: f32,
    pub latency_micros: u128,
}

/// System 1 Typed Decision Policy with Cycle Safety Shield (Inspired by Laya CoreML)
pub struct LayaGuardedSnakePolicy {
    pub judge: Arc<dyn TypedJudge>,
    pub guarded: bool,
}

impl LayaGuardedSnakePolicy {
    pub fn new(judge: Arc<dyn TypedJudge>, guarded: bool) -> Self {
        Self { judge, guarded }
    }

    pub async fn decide_move(
        &self,
        state: &State,
        safe_moves: &[String],
        planner_preferred: &str,
    ) -> Result<GuardedMoveDecision> {
        let start = Instant::now();

        // 1. Build discrete choice question with criteria
        let mut criteria = HashMap::new();
        for dir in &["UP", "DOWN", "LEFT", "RIGHT"] {
            if !safe_moves.contains(&dir.to_string()) {
                criteria.insert(dir.to_string(), "Blocked. Collision risk.".to_string());
            } else if *dir == planner_preferred {
                criteria.insert(dir.to_string(), "Safe. Best route toward food.".to_string());
            } else {
                criteria.insert(dir.to_string(), "Safe but secondary route.".to_string());
            }
        }

        let choice_q = TypedQuestion::Choice {
            options: vec![
                "UP".to_string(),
                "DOWN".to_string(),
                "LEFT".to_string(),
                "RIGHT".to_string(),
            ],
            instructions: "Select the safest move with best progress toward food.".to_string(),
            criteria: Some(criteria),
        };

        let choice_res = self.judge.evaluate_typed(state, &choice_q).await?;
        let proposed = choice_res.primary_decision.clone();

        // 2. Boolean Noul evaluation: Is there a safe route forward?
        let noul_safe = self
            .judge
            .evaluate_typed(
                state,
                &TypedQuestion::Noul {
                    proposition: "Is there an open safe route forward?".to_string(),
                    context_criteria: None,
                },
            )
            .await?;

        // 3. Boolean Noul evaluation: Is food reachable?
        let noul_food = self
            .judge
            .evaluate_typed(
                state,
                &TypedQuestion::Noul {
                    proposition: "Is food reachable through currently empty cells?".to_string(),
                    context_criteria: None,
                },
            )
            .await?;

        // 4. Deterministic Cycle Safety Shield: prevent collision or trap
        let (executed, intervened) = if self.guarded && !safe_moves.contains(&proposed) {
            // Intervene: pick the highest probability move among safe_moves
            let best_safe = safe_moves
                .iter()
                .max_by(|a, b| {
                    let pa = choice_res.probabilities.get(*a).unwrap_or(&0.0);
                    let pb = choice_res.probabilities.get(*b).unwrap_or(&0.0);
                    pa.partial_cmp(pb).unwrap_or(std::cmp::Ordering::Equal)
                })
                .cloned()
                .unwrap_or_else(|| {
                    if safe_moves.is_empty() {
                        "UP".to_string()
                    } else {
                        safe_moves[0].clone()
                    }
                });
            (best_safe, true)
        } else {
            (proposed.clone(), false)
        };

        let latency = start.elapsed().as_micros();
        let dead_end_risk = 1.0 - noul_safe.probabilities.get("true").copied().unwrap_or(1.0);
        let food_reachable = noul_food.probabilities.get("true").copied().unwrap_or(1.0);

        let source = if intervened {
            DecisionSource::DeterministicRule
        } else {
            DecisionSource::NeuralPolicy
        };

        let action = Action::new(
            executed.clone(),
            serde_json::json!({ "intervened": intervened }),
        );
        let decision =
            Decision::new(action, choice_res.confidence, source).with_explanation(if intervened {
                "Cycle safety shield intervened to avoid hazard"
            } else {
                "Executed highest probability safe action from typed policy"
            });

        Ok(GuardedMoveDecision {
            decision,
            proposed_direction: proposed,
            executed_direction: executed,
            safety_intervened: intervened,
            safe_directions: safe_moves.to_vec(),
            probabilities: choice_res.probabilities,
            dead_end_risk,
            food_reachable,
            latency_micros: latency,
        })
    }
}

use crate::traits::LlmTeacher;
use alr_core::{Action, ActionType, KnowledgeProposal, KnowledgeRequest};
use anyhow::Result;
use async_trait::async_trait;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

#[derive(Debug, Default)]
pub struct MockLlmTeacher {
    calls: AtomicU32,
    return_bad_proposal: AtomicBool,
}

impl MockLlmTeacher {
    pub fn new() -> Self {
        Self {
            calls: AtomicU32::new(0),
            return_bad_proposal: AtomicBool::new(false),
        }
    }

    pub fn set_bad_proposal_mode(&self, enabled: bool) {
        self.return_bad_proposal.store(enabled, Ordering::SeqCst);
    }
}

#[async_trait]
impl LlmTeacher for MockLlmTeacher {
    async fn propose_knowledge(&self, req: KnowledgeRequest) -> Result<KnowledgeProposal> {
        self.calls.fetch_add(1, Ordering::SeqCst);

        if self.return_bad_proposal.load(Ordering::SeqCst) {
            return Ok(KnowledgeProposal {
                knowledge_type: "policy".to_string(),
                state_conditions: serde_json::json!({
                    "danger_front": true,
                    "illegal_action": true
                }),
                action: Action::new(
                    "ILLEGAL_SUICIDE_MOVE",
                    serde_json::json!({ "type": "INVALID" }),
                ),
                reason: "Malicious or degraded LLM hallucination".to_string(),
                confidence: 0.99,
            });
        }

        let feats = &req.state.features;
        let danger_front = feats.first().copied().unwrap_or(0.0) > 0.5;
        let danger_left = feats.get(1).copied().unwrap_or(0.0) > 0.5;
        let danger_right = feats.get(2).copied().unwrap_or(0.0) > 0.5;
        let food_up = feats.get(3).copied().unwrap_or(0.0) > 0.5;
        let food_down = feats.get(4).copied().unwrap_or(0.0) > 0.5;
        let food_left = feats.get(5).copied().unwrap_or(0.0) > 0.5;
        let food_right = feats.get(6).copied().unwrap_or(0.0) > 0.5;
        let current_dir = feats.get(7).copied().unwrap_or(0.0) as i32;

        let is_action_safe = |act: &ActionType| -> bool {
            match (current_dir, act) {
                // Facing Up (0): Front=Up, Left=Left, Right=Right, Reverse=Down
                (0, ActionType::Up) => !danger_front,
                (0, ActionType::Left) => !danger_left,
                (0, ActionType::Right) => !danger_right,
                (0, ActionType::Down) => false,

                // Facing Down (1): Front=Down, Left=Right, Right=Left, Reverse=Up
                (1, ActionType::Down) => !danger_front,
                (1, ActionType::Right) => !danger_left,
                (1, ActionType::Left) => !danger_right,
                (1, ActionType::Up) => false,

                // Facing Left (2): Front=Left, Left=Down, Right=Up, Reverse=Right
                (2, ActionType::Left) => !danger_front,
                (2, ActionType::Down) => !danger_left,
                (2, ActionType::Up) => !danger_right,
                (2, ActionType::Right) => false,

                // Facing Right (3): Front=Right, Left=Up, Right=Down, Reverse=Left
                (3, ActionType::Right) => !danger_front,
                (3, ActionType::Up) => !danger_left,
                (3, ActionType::Down) => !danger_right,
                (3, ActionType::Left) => false,

                _ => false,
            }
        };

        let candidate_actions = [
            (ActionType::Up, food_up),
            (ActionType::Down, food_down),
            (ActionType::Left, food_left),
            (ActionType::Right, food_right),
        ];

        let mut chosen = None;
        for (act, seeks_food) in &candidate_actions {
            if *seeks_food && is_action_safe(act) {
                chosen = Some(act.clone());
                break;
            }
        }

        if chosen.is_none() {
            for (act, _) in &candidate_actions {
                if is_action_safe(act) {
                    chosen = Some(act.clone());
                    break;
                }
            }
        }

        // When surrounded on all 3 sides (dead-end trap), pick an action that does not reverse
        let action_type = chosen.unwrap_or(match current_dir {
            0 => {
                if !danger_left {
                    ActionType::Left
                } else if !danger_right {
                    ActionType::Right
                } else {
                    ActionType::Up
                }
            }
            1 => {
                if !danger_left {
                    ActionType::Right
                } else if !danger_right {
                    ActionType::Left
                } else {
                    ActionType::Down
                }
            }
            2 => {
                if !danger_left {
                    ActionType::Down
                } else if !danger_right {
                    ActionType::Up
                } else {
                    ActionType::Left
                }
            }
            _ => {
                if !danger_left {
                    ActionType::Up
                } else if !danger_right {
                    ActionType::Down
                } else {
                    ActionType::Right
                }
            }
        });

        Ok(KnowledgeProposal {
            knowledge_type: "skill_rule".to_string(),
            state_conditions: serde_json::json!({
                "danger_front": danger_front,
                "danger_left": danger_left,
                "danger_right": danger_right,
                "food_up": food_up,
                "food_down": food_down,
                "food_left": food_left,
                "food_right": food_right,
                "feature_hash": req.state.feature_hash()
            }),
            action: Action::from_type(action_type),
            reason: "Deterministic expert rule for safe navigation toward objective".to_string(),
            confidence: 0.95,
        })
    }

    fn call_count(&self) -> u32 {
        self.calls.load(Ordering::SeqCst)
    }

    fn reset_counter(&self) {
        self.calls.store(0, Ordering::SeqCst);
    }
}

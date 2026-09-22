use alr_environment::{AbstractAction, AbstractState, EnvironmentDescription};
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Applicability {
    Direct(f32),    // 0.0 - 1.0 confidence
    Adaptable(f32), // Requires parameter adaptation
    Incompatible,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferableCapability {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source_environment: String,
    pub transferability_score: f32,
    pub policy_rule: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferRecord {
    pub capability_id: String,
    pub from_env: String,
    pub to_env: String,
    pub zero_shot: bool,
    pub success: bool,
    pub adaptation_steps: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeliefState {
    pub known_entities: Vec<String>,
    pub hidden_hypotheses: Vec<String>,
    pub uncertainty_score: f32,
}

impl Default for BeliefState {
    fn default() -> Self {
        Self::new()
    }
}

impl BeliefState {
    pub fn new() -> Self {
        Self {
            known_entities: Vec::new(),
            hidden_hypotheses: Vec::new(),
            uncertainty_score: 0.1,
        }
    }

    pub fn update_from_state(&mut self, state: &AbstractState) {
        if state.obstacle_front {
            self.hidden_hypotheses
                .push("Target likely behind front barrier".to_string());
            self.uncertainty_score = 0.4;
        } else {
            self.uncertainty_score = 0.05;
        }
    }
}

pub struct CapabilityRegistry {
    capabilities: parking_lot::RwLock<HashMap<String, TransferableCapability>>,
}

impl Default for CapabilityRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl CapabilityRegistry {
    pub fn new() -> Self {
        let reg = Self {
            capabilities: parking_lot::RwLock::new(HashMap::new()),
        };
        reg.register_default_capabilities();
        reg
    }

    fn register_default_capabilities(&self) {
        self.register(TransferableCapability {
            id: "cap_navigate".to_string(),
            name: "Universal Navigation".to_string(),
            description: "Navigate towards target while avoiding collisions".to_string(),
            source_environment: "all".to_string(),
            transferability_score: 0.95,
            policy_rule: "approach_when_clear".to_string(),
        });
        self.register(TransferableCapability {
            id: "cap_avoid".to_string(),
            name: "Universal Avoidance".to_string(),
            description: "Turn away from immediate obstacles".to_string(),
            source_environment: "all".to_string(),
            transferability_score: 0.90,
            policy_rule: "turn_when_blocked".to_string(),
        });
        self.register(TransferableCapability {
            id: "cap_collect".to_string(),
            name: "Universal Acquisition".to_string(),
            description: "Interact to collect target artifact".to_string(),
            source_environment: "all".to_string(),
            transferability_score: 0.98,
            policy_rule: "interact_when_immediate".to_string(),
        });
    }

    pub fn register(&self, cap: TransferableCapability) {
        self.capabilities.write().insert(cap.id.clone(), cap);
    }

    pub fn get(&self, id: &str) -> Option<TransferableCapability> {
        self.capabilities.read().get(id).cloned()
    }

    pub fn list(&self) -> Vec<TransferableCapability> {
        self.capabilities.read().values().cloned().collect()
    }
}

pub struct SkillTransferEngine {
    pub records: parking_lot::RwLock<Vec<TransferRecord>>,
}

impl Default for SkillTransferEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SkillTransferEngine {
    pub fn new() -> Self {
        Self {
            records: parking_lot::RwLock::new(Vec::new()),
        }
    }

    /// Evaluates transferability of a capability to a target environment
    pub fn evaluate_transfer(
        &self,
        cap: &TransferableCapability,
        target_env: &EnvironmentDescription,
    ) -> Applicability {
        if !target_env.capabilities.iter().any(|c| cap.id.contains(c)) {
            return Applicability::Incompatible;
        }

        if cap.transferability_score >= 0.85 {
            Applicability::Direct(cap.transferability_score)
        } else {
            Applicability::Adaptable(cap.transferability_score)
        }
    }

    /// Executes transfer decision policy
    pub fn select_action(
        &self,
        cap: &TransferableCapability,
        state: &AbstractState,
    ) -> AbstractAction {
        if state.inventory_has_target {
            return AbstractAction::Wait;
        }

        if state.obstacle_front {
            return AbstractAction::Avoid;
        }

        if state.target_distance_category == alr_environment::DistanceCategory::Immediate {
            return AbstractAction::Collect;
        }

        match cap.policy_rule.as_str() {
            "approach_when_clear" => AbstractAction::Approach,
            "turn_when_blocked" => AbstractAction::Avoid,
            _ => AbstractAction::Approach,
        }
    }

    pub fn record_transfer(
        &self,
        cap_id: &str,
        from_env: &str,
        to_env: &str,
        zero_shot: bool,
        success: bool,
        adaptation_steps: usize,
    ) {
        self.records.write().push(TransferRecord {
            capability_id: cap_id.to_string(),
            from_env: from_env.to_string(),
            to_env: to_env.to_string(),
            zero_shot,
            success,
            adaptation_steps,
        });
    }
}

pub struct GoalInterpreter;

impl GoalInterpreter {
    pub fn parse_goal_to_capability(goal_str: &str) -> Result<String> {
        let lower = goal_str.to_lowercase();
        if lower.contains("navegue") || lower.contains("reach") || lower.contains("navigate") {
            Ok("cap_navigate".to_string())
        } else if lower.contains("evite") || lower.contains("avoid") {
            Ok("cap_avoid".to_string())
        } else if lower.contains("colete")
            || lower.contains("collect")
            || lower.contains("encontre")
            || lower.contains("find")
        {
            Ok("cap_collect".to_string())
        } else {
            bail!(
                "GoalInterpreter: Unrecognized intent for goal '{}'",
                goal_str
            );
        }
    }
}

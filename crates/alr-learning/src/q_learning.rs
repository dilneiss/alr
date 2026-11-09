use alr_core::{Action, ActionType, Experience, Policy, PolicyPrediction, State};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QTable {
    // state_key -> (action_id -> q_value)
    pub table: HashMap<String, HashMap<String, f32>>,
    pub alpha: f32,   // learning rate
    pub gamma: f32,   // discount factor
    pub epsilon: f32, // exploration rate
}

impl Default for QTable {
    fn default() -> Self {
        Self {
            table: HashMap::new(),
            alpha: 0.2,
            gamma: 0.9,
            epsilon: 0.1,
        }
    }
}

impl QTable {
    pub fn new(alpha: f32, gamma: f32, epsilon: f32) -> Self {
        Self {
            table: HashMap::new(),
            alpha,
            gamma,
            epsilon,
        }
    }

    pub fn state_key(state: &State) -> String {
        // Discretized features as compact string: e.g. "1_0_0_0_1_0_0_1"
        let parts: Vec<String> = state.features.iter().map(|f| format!("{:.0}", f)).collect();
        parts.join("_")
    }

    pub fn get_q(&self, state_key: &str, action_id: &str) -> f32 {
        self.table
            .get(state_key)
            .and_then(|actions| actions.get(action_id))
            .copied()
            .unwrap_or(0.0)
    }

    pub fn max_q(&self, state_key: &str) -> f32 {
        self.table
            .get(state_key)
            .map(|actions| actions.values().copied().fold(f32::NEG_INFINITY, f32::max))
            .unwrap_or(0.0)
    }

    pub fn update(&mut self, exp: &Experience) {
        let s_key = Self::state_key(&exp.state);
        let action_id = exp.action.id.clone();
        let current_q = self.get_q(&s_key, &action_id);

        let max_next_q = if exp.terminal {
            0.0
        } else if let Some(ns) = &exp.next_state {
            let ns_key = Self::state_key(ns);
            self.max_q(&ns_key)
        } else {
            0.0
        };

        let new_q = current_q + self.alpha * (exp.reward + self.gamma * max_next_q - current_q);

        self.table
            .entry(s_key)
            .or_default()
            .insert(action_id, new_q);
    }

    pub fn available_actions() -> Vec<Action> {
        vec![
            Action::from_type(ActionType::Up),
            Action::from_type(ActionType::Down),
            Action::from_type(ActionType::Left),
            Action::from_type(ActionType::Right),
        ]
    }
}

impl Policy for QTable {
    fn predict(&self, state: &State) -> PolicyPrediction {
        let s_key = Self::state_key(state);
        let actions = Self::available_actions();

        let q_values: Vec<(Action, f32)> = actions
            .into_iter()
            .map(|act| {
                let q = self.get_q(&s_key, &act.id);
                (act, q)
            })
            .collect();

        // Softmax conversion for probabilities
        let max_q = q_values
            .iter()
            .map(|(_, q)| *q)
            .fold(f32::NEG_INFINITY, f32::max);

        let exp_sum: f32 = q_values
            .iter()
            .map(|(_, q)| ((q - max_q).min(20.0)).exp())
            .sum();

        let probs: Vec<(Action, f32)> = q_values
            .into_iter()
            .map(|(act, q)| {
                let p = if exp_sum > 0.0 {
                    ((q - max_q).min(20.0)).exp() / exp_sum
                } else {
                    0.25
                };
                (act, p)
            })
            .collect();

        // Confidence: difference between top probability and uniform baseline
        let max_prob = probs.iter().map(|(_, p)| *p).fold(0.0f32, f32::max);

        // Map max_prob [0.25, 1.0] -> [0.0, 1.0]
        let confidence = ((max_prob - 0.25) / 0.75).clamp(0.0, 1.0);

        PolicyPrediction {
            action_probabilities: probs,
            confidence,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qtable_state_key_discretization() {
        let s1 = State::new(vec![1.2, 0.4, 0.0, 1.0], serde_json::Value::Null);
        assert_eq!(QTable::state_key(&s1), "1_0_0_1");
    }

    #[test]
    fn test_qtable_bellman_update() {
        let mut q = QTable::new(0.5, 0.9, 0.1);
        let s0 = State::new(vec![1.0, 0.0], serde_json::Value::Null);
        let s1 = State::new(vec![0.0, 1.0], serde_json::Value::Null);
        let act = Action::from_type(ActionType::Up);

        let exp = Experience {
            state: s0.clone(),
            action: act.clone(),
            reward: 10.0,
            next_state: Some(s1.clone()),
            terminal: false,
        };

        // Initial Q is 0.0
        assert_eq!(q.get_q("1_0", "UP"), 0.0);

        // Update: new_q = 0 + 0.5 * (10 + 0.9 * 0 - 0) = 5.0
        q.update(&exp);
        assert_eq!(q.get_q("1_0", "UP"), 5.0);

        // If terminal: max_next_q is 0
        let exp_term = Experience {
            state: s0.clone(),
            action: act.clone(),
            reward: -10.0,
            next_state: Some(s1.clone()),
            terminal: true,
        };
        // new_q = 5.0 + 0.5 * (-10.0 + 0 - 5.0) = 5.0 + 0.5 * (-15.0) = -2.5
        q.update(&exp_term);
        assert_eq!(q.get_q("1_0", "UP"), -2.5);
    }

    #[test]
    fn test_qtable_policy_predict_softmax() {
        let q = QTable::default();
        let s = State::new(vec![0.0, 0.0], serde_json::Value::Null);

        // Untrained state: all Qs are 0.0 -> uniform probabilities 0.25
        let pred = q.predict(&s);
        assert_eq!(pred.action_probabilities.len(), 4);
        for (_, p) in &pred.action_probabilities {
            assert!((*p - 0.25).abs() < 1e-4);
        }
        assert_eq!(pred.confidence, 0.0);
    }
}

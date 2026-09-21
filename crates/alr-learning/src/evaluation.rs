use crate::q_learning::QTable;
use alr_core::Experience;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluationMetrics {
    pub total_experiences: usize,
    pub mean_reward: f32,
    pub terminal_states: usize,
    pub win_rate: f32,
    pub mean_max_q: f32,
}

pub struct PolicyEvaluator;

impl PolicyEvaluator {
    pub fn evaluate_replay(
        q_table: &QTable,
        experiences: &[Experience],
    ) -> PolicyEvaluationMetrics {
        if experiences.is_empty() {
            return PolicyEvaluationMetrics {
                total_experiences: 0,
                mean_reward: 0.0,
                terminal_states: 0,
                win_rate: 0.0,
                mean_max_q: 0.0,
            };
        }

        let total_reward: f32 = experiences.iter().map(|e| e.reward).sum();
        let terminals = experiences.iter().filter(|e| e.terminal).count();
        let positive_episodes = experiences.iter().filter(|e| e.reward > 5.0).count();

        let mut sum_max_q = 0.0;
        for exp in experiences {
            let key = QTable::state_key(&exp.state);
            sum_max_q += q_table.max_q(&key);
        }

        PolicyEvaluationMetrics {
            total_experiences: experiences.len(),
            mean_reward: total_reward / experiences.len() as f32,
            terminal_states: terminals,
            win_rate: positive_episodes as f32 / experiences.len().max(1) as f32,
            mean_max_q: sum_max_q / experiences.len() as f32,
        }
    }
}

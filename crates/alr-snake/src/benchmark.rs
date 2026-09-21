use crate::game::{Environment, SnakeEnvironment};
use alr_core::Policy;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkReport {
    pub name: String,
    pub episodes: usize,
    pub average_score: f32,
    pub median_score: f32,
    pub best_score: i32,
    pub average_survival_steps: f32,
    pub food_per_episode: f32,
    pub collision_rate: f32,
    pub autonomous_decision_rate: f32,
    pub llm_calls_per_episode: f32,
}

pub struct SnakeBenchmarkRunner;

impl SnakeBenchmarkRunner {
    pub fn run_policy<P: Policy>(
        policy: &P,
        name: &str,
        episodes: usize,
        base_seed: u64,
        grid_w: i32,
        grid_h: i32,
    ) -> BenchmarkReport {
        let mut scores = Vec::with_capacity(episodes);
        let mut steps_list = Vec::with_capacity(episodes);
        let mut collisions = 0;

        for ep in 0..episodes {
            let mut env = SnakeEnvironment::new(grid_w, grid_h, base_seed + ep as u64);
            let mut obs = env.reset(base_seed + ep as u64);

            while !env.is_terminal() {
                let state = obs.to_alr_state();
                let pred = policy.predict(&state);
                let action = pred
                    .best_action()
                    .map(|(a, _)| a)
                    .unwrap_or_else(|| alr_core::Action::from_type(alr_core::ActionType::Right));

                let step_res = env.step(action);
                obs = step_res.observation;
            }

            scores.push(obs.score);
            steps_list.push(obs.steps);
            if obs.steps < 2000 {
                collisions += 1;
            }
        }

        scores.sort();
        let avg_score: f32 = scores.iter().sum::<i32>() as f32 / episodes.max(1) as f32;
        let median_score = if scores.is_empty() {
            0.0
        } else if scores.len() % 2 == 1 {
            scores[scores.len() / 2] as f32
        } else {
            (scores[scores.len() / 2 - 1] + scores[scores.len() / 2]) as f32 / 2.0
        };
        let best_score = scores.last().copied().unwrap_or(0);
        let avg_steps: f32 = steps_list.iter().sum::<u64>() as f32 / episodes.max(1) as f32;

        BenchmarkReport {
            name: name.to_string(),
            episodes,
            average_score: avg_score,
            median_score,
            best_score,
            average_survival_steps: avg_steps,
            food_per_episode: avg_score,
            collision_rate: collisions as f32 / episodes.max(1) as f32,
            autonomous_decision_rate: 1.0,
            llm_calls_per_episode: 0.0,
        }
    }
}

use alr_core::{Action, Experience, State};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardConfig {
    pub food_eaten: f32,
    pub survive: f32,
    pub approach_food: f32,
    pub away_from_food: f32,
    pub redundant_move: f32,
    pub collision: f32,
    pub death: f32,
}

impl Default for RewardConfig {
    fn default() -> Self {
        Self {
            food_eaten: 10.0,
            survive: 1.0,
            approach_food: 1.5,
            away_from_food: -1.5,
            redundant_move: -0.5,
            collision: -100.0,
            death: -100.0,
        }
    }
}

pub struct ExperienceBuilder;

impl ExperienceBuilder {
    pub fn build(
        state: State,
        action: Action,
        reward: f32,
        next_state: Option<State>,
        terminal: bool,
    ) -> Experience {
        Experience {
            state,
            action,
            reward,
            next_state,
            terminal,
        }
    }
}

use alr_core::{Action, State};
use alr_environment::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PongAction {
    Up = 0,
    Down = 1,
    Stay = 2,
}

impl PongAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Up => "UP",
            Self::Down => "DOWN",
            Self::Stay => "STAY",
        }
    }

    pub fn to_alr_action(&self) -> Action {
        Action::new(
            self.as_str(),
            serde_json::json!({ "action": self.as_str() }),
        )
    }
}

/// A clean, deterministic 2D Pong / Ball Bouncing Environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PongGameEnvironment {
    pub width: f32,
    pub height: f32,
    pub paddle_y: f32,
    pub paddle_height: f32,
    pub paddle_speed: f32,
    pub ball_x: f32,
    pub ball_y: f32,
    pub ball_vx: f32,
    pub ball_vy: f32,
    pub score: u32,
    pub bounces: u32,
    pub terminal: bool,
    pub seed: u64,
}

impl Default for PongGameEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl PongGameEnvironment {
    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            width: 400.0,
            height: 300.0,
            paddle_y: 120.0,
            paddle_height: 60.0,
            paddle_speed: 8.0,
            ball_x: 200.0,
            ball_y: 150.0,
            ball_vx: 5.0,
            ball_vy: 3.0,
            score: 0,
            bounces: 0,
            terminal: false,
            seed,
        };
        env.reset(seed);
        env
    }

    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.paddle_y = (self.height - self.paddle_height) / 2.0;
        self.ball_x = 200.0;
        self.ball_y = 150.0;
        self.ball_vx = if seed.is_multiple_of(2) { 5.0 } else { -5.0 };
        self.ball_vy = 3.0;
        self.score = 0;
        self.bounces = 0;
        self.terminal = false;
    }

    pub fn step(&mut self, action: PongAction) -> f32 {
        if self.terminal {
            return 0.0;
        }

        // 1. Move paddle
        match action {
            PongAction::Up => {
                self.paddle_y = (self.paddle_y - self.paddle_speed).max(0.0);
            }
            PongAction::Down => {
                self.paddle_y =
                    (self.paddle_y + self.paddle_speed).min(self.height - self.paddle_height);
            }
            PongAction::Stay => {}
        }

        // 2. Move ball
        self.ball_x += self.ball_vx;
        self.ball_y += self.ball_vy;

        // Bounce top/bottom walls
        if self.ball_y <= 0.0 {
            self.ball_y = 0.0;
            self.ball_vy = self.ball_vy.abs();
        } else if self.ball_y >= self.height {
            self.ball_y = self.height;
            self.ball_vy = -self.ball_vy.abs();
        }

        // Bounce right wall
        if self.ball_x >= self.width {
            self.ball_x = self.width;
            self.ball_vx = -self.ball_vx.abs();
        }

        // Paddle collision on left side (x <= 20)
        let paddle_x = 20.0;
        if self.ball_x <= paddle_x {
            if self.ball_y >= self.paddle_y && self.ball_y <= (self.paddle_y + self.paddle_height) {
                // Intercepted by paddle!
                self.ball_x = paddle_x;
                self.ball_vx = self.ball_vx.abs();
                self.bounces += 1;
                self.score += 10;
                return 10.0; // Positive interception reward
            } else {
                // Ball missed paddle -> game over
                self.terminal = true;
                return -50.0; // Penalty for missing ball
            }
        }

        1.0 // Survival reward per tick
    }

    pub fn to_alr_state(&self) -> State {
        let norm_bx = (self.ball_x / self.width).clamp(0.0, 1.0);
        let norm_by = (self.ball_y / self.height).clamp(0.0, 1.0);
        let norm_bvx = ((self.ball_vx + 10.0) / 20.0).clamp(0.0, 1.0);
        let norm_bvy = ((self.ball_vy + 10.0) / 20.0).clamp(0.0, 1.0);
        let norm_py = (self.paddle_y / (self.height - self.paddle_height)).clamp(0.0, 1.0);

        State::new(
            vec![norm_bx, norm_by, norm_bvx, norm_bvy, norm_py],
            serde_json::json!({
                "ball_x": self.ball_x,
                "ball_y": self.ball_y,
                "paddle_y": self.paddle_y,
                "bounces": self.bounces,
            }),
        )
    }
}

#[async_trait]
impl EnvironmentAdapter for PongGameEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "pong_ball_arena".to_string(),
            name: "Classic Pong Ball Interception".to_string(),
            capabilities: vec!["paddle_move".to_string(), "ball_intercept".to_string()],
            action_space: ActionSpace::Discrete(vec!["UP".into(), "DOWN".into(), "STAY".into()]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "paddle_boundaries".to_string(),
                max_action_rate: 60.0,
                forbids_reversal: false,
                safety_perimeter: 1.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "pong_ball_arena".to_string(),
            action_space_kind: "Discrete3".to_string(),
            observation_space_kind: "Structured2D".to_string(),
            physics_fidelity: 0.90,
            capability_tags: vec!["paddle".into(), "intercept".into(), "bounce".into()],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let dy = self.ball_y - (self.paddle_y + self.paddle_height / 2.0);
        let dist = (self.ball_x - 20.0).abs();

        let dist_cat = if dist < 50.0 {
            DistanceCategory::Immediate
        } else if dist < 120.0 {
            DistanceCategory::Near
        } else {
            DistanceCategory::Medium
        };

        let dir = if dy < -10.0 {
            RelativeDirection::North
        } else if dy > 10.0 {
            RelativeDirection::South
        } else {
            RelativeDirection::Center
        };

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: false,
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: self.bounces > 0,
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let pong_act = match action {
            AbstractAction::Navigate(RelativeDirection::North) => PongAction::Up,
            AbstractAction::Navigate(RelativeDirection::South) => PongAction::Down,
            _ => PongAction::Stay,
        };
        Ok(self.step(pong_act))
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

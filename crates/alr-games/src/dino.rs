use alr_core::{Action, State};
use alr_environment::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};
use alr_learning::QTable;
use anyhow::Result;
use async_trait::async_trait;
use rand::Rng;
use serde::{Deserialize, Serialize};

/// Discretized actions available for the Chrome Dino
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DinoAction {
    Run = 0,
    Jump = 1,
    Duck = 2,
}

impl DinoAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            DinoAction::Run => "RUN",
            DinoAction::Jump => "JUMP",
            DinoAction::Duck => "DUCK",
        }
    }

    pub fn from_index(idx: usize) -> Option<Self> {
        match idx {
            0 => Some(DinoAction::Run),
            1 => Some(DinoAction::Jump),
            2 => Some(DinoAction::Duck),
            _ => None,
        }
    }

    pub fn from_str_loose(s: &str) -> Option<Self> {
        match s.trim().to_uppercase().as_str() {
            "RUN" | "0" => Some(DinoAction::Run),
            "JUMP" | "SPACE" | "UP" | "1" => Some(DinoAction::Jump),
            "DUCK" | "DOWN" | "2" => Some(DinoAction::Duck),
            _ => None,
        }
    }

    pub fn to_alr_action(&self) -> Action {
        Action::new(
            self.as_str(),
            serde_json::json!({
                "action_type": self.as_str(),
                "action_code": *self as u8,
            }),
        )
    }
}

/// Types of obstacles encountered on the track
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ObstacleType {
    /// Small cactus on ground (y=0, w=20, h=35) - must jump over
    SmallCactus,
    /// Large cactus on ground (y=0, w=30, h=50) - must jump over
    LargeCactus,
    /// Triple cactus cluster (y=0, w=50, h=40) - must jump over
    TripleCactus,
    /// Pterodactyl flying at low altitude (y=15, w=40, h=25) - must jump over
    PterodactylLow,
    /// Pterodactyl flying at mid altitude (y=35, w=40, h=25) - must duck under!
    PterodactylMid,
    /// Pterodactyl flying at high altitude (y=60, w=40, h=25) - safe to run under; jump is fatal
    PterodactylHigh,
}

impl ObstacleType {
    pub fn default_dimensions(&self) -> (f32, f32, f32) {
        // (y, width, height)
        match self {
            ObstacleType::SmallCactus => (0.0, 20.0, 35.0),
            ObstacleType::LargeCactus => (0.0, 30.0, 50.0),
            ObstacleType::TripleCactus => (0.0, 50.0, 40.0),
            ObstacleType::PterodactylLow => (15.0, 40.0, 25.0),
            ObstacleType::PterodactylMid => (35.0, 40.0, 25.0),
            ObstacleType::PterodactylHigh => (60.0, 40.0, 25.0),
        }
    }

    pub fn is_pterodactyl(&self) -> bool {
        matches!(
            self,
            ObstacleType::PterodactylLow
                | ObstacleType::PterodactylMid
                | ObstacleType::PterodactylHigh
        )
    }
}

/// An obstacle on the runner track
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DinoObstacle {
    pub obstacle_type: ObstacleType,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub speed: f32,
    pub cleared: bool,
}

impl DinoObstacle {
    pub fn new(obstacle_type: ObstacleType, x: f32, speed: f32) -> Self {
        let (y, width, height) = obstacle_type.default_dimensions();
        Self {
            obstacle_type,
            x,
            y,
            width,
            height,
            speed,
            cleared: false,
        }
    }
}

/// Structured Observation of the Dino Game State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DinoObservation {
    pub distance_to_obstacle: f32,
    pub obstacle_width: f32,
    pub obstacle_height: f32,
    pub obstacle_y: f32,
    pub obstacle_speed: f32,
    pub dino_y: f32,
    pub dino_velocity_y: f32,
    pub is_ducking: bool,
    pub is_jumping: bool,
    pub nearest_obstacle_type: Option<ObstacleType>,
}

impl DinoObservation {
    /// Converts observation to normalized State for ALR policies and neural models
    pub fn to_alr_state(&self) -> State {
        let norm_dist = (self.distance_to_obstacle / 600.0).clamp(0.0, 1.0);
        let norm_w = (self.obstacle_width / 60.0).clamp(0.0, 1.0);
        let norm_h = (self.obstacle_height / 60.0).clamp(0.0, 1.0);
        let norm_obs_y = (self.obstacle_y / 80.0).clamp(0.0, 1.0);
        let norm_speed = ((self.obstacle_speed - 6.0) / 8.0).clamp(0.0, 1.0);
        let norm_dino_y = (self.dino_y / 90.0).clamp(0.0, 1.0);
        let norm_vy = ((self.dino_velocity_y + 15.0) / 30.0).clamp(0.0, 1.0);
        let duck_val = if self.is_ducking { 1.0 } else { 0.0 };
        let jump_val = if self.is_jumping { 1.0 } else { 0.0 };

        let features = vec![
            norm_dist,
            norm_w,
            norm_h,
            norm_obs_y,
            norm_speed,
            norm_dino_y,
            norm_vy,
            duck_val,
            jump_val,
        ];

        let obs_type_str = self
            .nearest_obstacle_type
            .map(|t| format!("{:?}", t))
            .unwrap_or_else(|| "None".to_string());

        let metadata = serde_json::json!({
            "distance": self.distance_to_obstacle,
            "obstacle_type": obs_type_str,
            "dino_y": self.dino_y,
            "is_ducking": self.is_ducking,
            "is_jumping": self.is_jumping,
            "speed": self.obstacle_speed,
        });

        State::new(features, metadata)
    }

    /// Discretized key for Q-Learning tabular policy
    pub fn discrete_key(&self) -> String {
        // Discretize distance
        let dist_cat = if self.distance_to_obstacle > 240.0 {
            "FAR"
        } else if self.distance_to_obstacle > 140.0 {
            "WARN"
        } else if self.distance_to_obstacle > 60.0 {
            "DANGER"
        } else {
            "IMMED"
        };

        // Discretize obstacle type category
        let obs_cat = match self.nearest_obstacle_type {
            None => "NONE",
            Some(ObstacleType::SmallCactus) => "CACTUS_S",
            Some(ObstacleType::LargeCactus) => "CACTUS_L",
            Some(ObstacleType::TripleCactus) => "CACTUS_T",
            Some(ObstacleType::PterodactylLow) => "PTERO_LOW",
            Some(ObstacleType::PterodactylMid) => "PTERO_MID",
            Some(ObstacleType::PterodactylHigh) => "PTERO_HIGH",
        };

        // Discretize dino state
        let dino_state = if self.dino_y > 5.0 {
            "AIR"
        } else if self.is_ducking {
            "DUCK"
        } else {
            "GND"
        };

        let speed_cat = if self.obstacle_speed >= 9.5 {
            "FAST"
        } else {
            "NORM"
        };

        format!("{}_{}_{}_{}", dist_cat, obs_cat, dino_state, speed_cat)
    }
}

/// Step result returned on each environment tick
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DinoStepResult {
    pub observation: DinoObservation,
    pub reward: f32,
    pub terminal: bool,
    pub score: u32,
    pub obstacle_cleared: bool,
}

/// Deterministic Rust Implementation of the Chrome Dino Game (T-Rex Runner)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChromeDinoEnvironment {
    pub dino_x: f32,
    pub dino_y: f32,
    pub dino_velocity_y: f32,
    pub is_ducking: bool,
    pub is_jumping: bool,
    pub speed: f32,
    pub gravity: f32,
    pub jump_velocity: f32,
    pub obstacles: Vec<DinoObstacle>,
    pub score: u32,
    pub ticks: usize,
    pub terminal: bool,
    pub seed: u64,
    pub rng_state: u64,
    pub last_spawn_x: f32,
    pub track_width: f32,
}

impl Default for ChromeDinoEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl ChromeDinoEnvironment {
    pub const DINO_X: f32 = 50.0;
    pub const DINO_WIDTH_STAND: f32 = 44.0;
    pub const DINO_HEIGHT_STAND: f32 = 47.0;
    pub const DINO_WIDTH_DUCK: f32 = 59.0;
    pub const DINO_HEIGHT_DUCK: f32 = 26.0;
    pub const INITIAL_SPEED: f32 = 6.0;
    pub const MAX_SPEED: f32 = 13.0;
    pub const DEFAULT_GRAVITY: f32 = -0.8;
    pub const DEFAULT_JUMP_VELOCITY: f32 = 12.0;

    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            dino_x: Self::DINO_X,
            dino_y: 0.0,
            dino_velocity_y: 0.0,
            is_ducking: false,
            is_jumping: false,
            speed: Self::INITIAL_SPEED,
            gravity: Self::DEFAULT_GRAVITY,
            jump_velocity: Self::DEFAULT_JUMP_VELOCITY,
            obstacles: Vec::new(),
            score: 0,
            ticks: 0,
            terminal: false,
            seed,
            rng_state: seed.wrapping_add(1),
            last_spawn_x: 0.0,
            track_width: 800.0,
        };
        env.reset(seed);
        env
    }

    /// Reset environment to initial state with a deterministic seed
    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.rng_state = seed.wrapping_add(0x9E3779B97F4A7C15);
        self.dino_x = Self::DINO_X;
        self.dino_y = 0.0;
        self.dino_velocity_y = 0.0;
        self.is_ducking = false;
        self.is_jumping = false;
        self.speed = Self::INITIAL_SPEED;
        self.gravity = Self::DEFAULT_GRAVITY;
        self.jump_velocity = Self::DEFAULT_JUMP_VELOCITY;
        self.obstacles.clear();
        self.score = 0;
        self.ticks = 0;
        self.terminal = false;
        self.last_spawn_x = self.dino_x + 300.0;

        // Spawn first obstacle at safe distance
        let first_obs =
            DinoObstacle::new(ObstacleType::SmallCactus, self.dino_x + 320.0, self.speed);
        self.obstacles.push(first_obs);
    }

    pub fn is_terminal(&self) -> bool {
        self.terminal
    }

    /// Linear congruential generator for reproducible pseudo-random numbers
    fn next_rand_u32(&mut self) -> u32 {
        self.rng_state = self
            .rng_state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        (self.rng_state >> 32) as u32
    }

    /// Current dino bounding box
    pub fn dino_bounds(&self) -> (f32, f32, f32, f32) {
        let (w, h) = if self.is_ducking && self.dino_y == 0.0 {
            (Self::DINO_WIDTH_DUCK, Self::DINO_HEIGHT_DUCK)
        } else {
            (Self::DINO_WIDTH_STAND, Self::DINO_HEIGHT_STAND)
        };
        (self.dino_x, self.dino_x + w, self.dino_y, self.dino_y + h)
    }

    /// AABB collision test between Dino and an obstacle
    pub fn check_collision(dino_x: f32, dino_y: f32, is_ducking: bool, obs: &DinoObstacle) -> bool {
        let (dino_w, dino_h) = if is_ducking && dino_y == 0.0 {
            (Self::DINO_WIDTH_DUCK, Self::DINO_HEIGHT_DUCK)
        } else {
            (Self::DINO_WIDTH_STAND, Self::DINO_HEIGHT_STAND)
        };

        let dino_x1 = dino_x;
        let dino_x2 = dino_x + dino_w;
        let dino_y1 = dino_y;
        let dino_y2 = dino_y + dino_h;

        let obs_x1 = obs.x;
        let obs_x2 = obs.x + obs.width;
        let obs_y1 = obs.y;
        let obs_y2 = obs.y + obs.height;

        dino_x1 < obs_x2 && dino_x2 > obs_x1 && dino_y1 < obs_y2 && dino_y2 > obs_y1
    }

    /// Spawns a new obstacle at the right edge if distance allows
    fn maybe_spawn_obstacle(&mut self) {
        let right_edge = self.track_width;
        let max_obstacle_x = self.obstacles.iter().map(|o| o.x).fold(0.0f32, f32::max);

        // Required gap between obstacles scales with current speed
        let min_gap = (self.speed * 28.0).max(200.0);
        let rand_extra = (self.next_rand_u32() % 160) as f32;
        let target_gap = min_gap + rand_extra;

        if max_obstacle_x < (right_edge - target_gap) {
            let spawn_x = right_edge + 50.0;
            let rand_val = self.next_rand_u32() % 100;

            // Pterodactyls only unlock after score >= 40 or ticks >= 100
            let obs_type = if self.score >= 40 || self.ticks >= 100 {
                match rand_val {
                    0..=30 => ObstacleType::SmallCactus,
                    31..=55 => ObstacleType::LargeCactus,
                    56..=70 => ObstacleType::TripleCactus,
                    71..=80 => ObstacleType::PterodactylLow,
                    81..=92 => ObstacleType::PterodactylMid, // duck under!
                    _ => ObstacleType::PterodactylHigh,      // don't jump!
                }
            } else {
                match rand_val {
                    0..=45 => ObstacleType::SmallCactus,
                    46..=75 => ObstacleType::LargeCactus,
                    _ => ObstacleType::TripleCactus,
                }
            };

            self.obstacles
                .push(DinoObstacle::new(obs_type, spawn_x, self.speed));
            self.last_spawn_x = spawn_x;
        }
    }

    /// Nearest obstacle in front of the Dino
    pub fn nearest_obstacle(&self) -> Option<&DinoObstacle> {
        let (dino_w, _) = if self.is_ducking && self.dino_y == 0.0 {
            (Self::DINO_WIDTH_DUCK, Self::DINO_HEIGHT_DUCK)
        } else {
            (Self::DINO_WIDTH_STAND, Self::DINO_HEIGHT_STAND)
        };
        let dino_front = self.dino_x + dino_w;

        self.obstacles
            .iter()
            .filter(|o| (o.x + o.width) >= self.dino_x)
            .min_by(|a, b| {
                let dist_a = (a.x - dino_front).abs();
                let dist_b = (b.x - dino_front).abs();
                dist_a
                    .partial_cmp(&dist_b)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
    }

    /// Observe current game state
    pub fn observe(&self) -> DinoObservation {
        let (dino_w, _) = if self.is_ducking && self.dino_y == 0.0 {
            (Self::DINO_WIDTH_DUCK, Self::DINO_HEIGHT_DUCK)
        } else {
            (Self::DINO_WIDTH_STAND, Self::DINO_HEIGHT_STAND)
        };
        let dino_front = self.dino_x + dino_w;

        if let Some(obs) = self.nearest_obstacle() {
            let dist = if obs.x > dino_front {
                obs.x - dino_front
            } else {
                0.0
            };

            DinoObservation {
                distance_to_obstacle: dist,
                obstacle_width: obs.width,
                obstacle_height: obs.height,
                obstacle_y: obs.y,
                obstacle_speed: self.speed,
                dino_y: self.dino_y,
                dino_velocity_y: self.dino_velocity_y,
                is_ducking: self.is_ducking,
                is_jumping: self.dino_y > 0.0,
                nearest_obstacle_type: Some(obs.obstacle_type),
            }
        } else {
            DinoObservation {
                distance_to_obstacle: 600.0,
                obstacle_width: 0.0,
                obstacle_height: 0.0,
                obstacle_y: 0.0,
                obstacle_speed: self.speed,
                dino_y: self.dino_y,
                dino_velocity_y: self.dino_velocity_y,
                is_ducking: self.is_ducking,
                is_jumping: self.dino_y > 0.0,
                nearest_obstacle_type: None,
            }
        }
    }

    /// Evaluates the physically safe actions and optimal action given the observation
    pub fn safe_actions_for(&self, obs: &DinoObservation) -> (Vec<String>, String) {
        let jump_window_max = (self.speed * 20.0).max(120.0);
        let _jump_window_min = (self.speed * 4.0).max(25.0);

        if obs.distance_to_obstacle > jump_window_max {
            // Far away: RUN is optimal; JUMP is discouraged (-2 unnecessary jump penalty)
            return (
                vec!["RUN".to_string(), "DUCK".to_string()],
                "RUN".to_string(),
            );
        }

        match obs.nearest_obstacle_type {
            None => (
                vec!["RUN".to_string(), "DUCK".to_string()],
                "RUN".to_string(),
            ),
            Some(ObstacleType::SmallCactus)
            | Some(ObstacleType::LargeCactus)
            | Some(ObstacleType::TripleCactus)
            | Some(ObstacleType::PterodactylLow) => {
                // Ground obstacle or low flyer: must jump to avoid collision
                if obs.distance_to_obstacle <= jump_window_max {
                    (vec!["JUMP".to_string()], "JUMP".to_string())
                } else {
                    (
                        vec!["RUN".to_string(), "JUMP".to_string()],
                        "RUN".to_string(),
                    )
                }
            }
            Some(ObstacleType::PterodactylMid) => {
                // Mid-height flyer: must duck under!
                let duck_window = (self.speed * 18.0).max(110.0);
                if obs.distance_to_obstacle <= duck_window {
                    (vec!["DUCK".to_string()], "DUCK".to_string())
                } else {
                    (
                        vec!["RUN".to_string(), "DUCK".to_string()],
                        "RUN".to_string(),
                    )
                }
            }
            Some(ObstacleType::PterodactylHigh) => {
                // High-flying pterodactyl: RUN or DUCK are safe; JUMP is fatal!
                (
                    vec!["RUN".to_string(), "DUCK".to_string()],
                    "RUN".to_string(),
                )
            }
        }
    }

    /// Advance game physics by one tick given an action
    pub fn step(&mut self, action: DinoAction) -> DinoStepResult {
        if self.terminal {
            return DinoStepResult {
                observation: self.observe(),
                reward: 0.0,
                terminal: true,
                score: self.score,
                obstacle_cleared: false,
            };
        }

        self.ticks += 1;
        let mut reward = 1.0; // Baseline survival reward (+1.0)

        // 1. Process action and update Dino physics
        match action {
            DinoAction::Jump => {
                if self.dino_y == 0.0 {
                    self.dino_velocity_y = self.jump_velocity;
                    self.is_jumping = true;
                    self.is_ducking = false;

                    // Unnecessary jump penalty: penalize jumping when obstacle is far (> 180px)
                    let nearest_dist = self
                        .nearest_obstacle()
                        .map(|o| (o.x - (self.dino_x + Self::DINO_WIDTH_STAND)).max(0.0))
                        .unwrap_or(600.0);
                    if nearest_dist > 180.0 {
                        reward -= 2.0;
                    }
                }
            }
            DinoAction::Duck => {
                if self.dino_y == 0.0 {
                    self.is_ducking = true;
                    self.is_jumping = false;
                } else {
                    // Fast fall when ducking in mid-air
                    self.dino_velocity_y += self.gravity * 1.5;
                    self.is_ducking = true;
                }
            }
            DinoAction::Run => {
                self.is_ducking = false;
            }
        }

        // 2. Vertical position and gravity integration
        if self.dino_y > 0.0 || self.dino_velocity_y > 0.0 {
            self.dino_y += self.dino_velocity_y;
            self.dino_velocity_y += self.gravity;

            if self.dino_y <= 0.0 {
                self.dino_y = 0.0;
                self.dino_velocity_y = 0.0;
                self.is_jumping = false;
            }
        }

        // 3. Move obstacles leftwards
        let mut obstacle_cleared = false;
        let dino_x = self.dino_x;
        for obs in &mut self.obstacles {
            obs.x -= self.speed;

            // Check if cleared
            if !obs.cleared && (obs.x + obs.width) < dino_x {
                obs.cleared = true;
                self.score += 1;
                reward += 10.0; // +10.0 reward for clearing an obstacle!
                obstacle_cleared = true;
            }
        }

        // 4. Remove off-screen obstacles (x < -100)
        self.obstacles.retain(|obs| obs.x + obs.width > -100.0);

        // 5. Spawn new obstacles if needed
        self.maybe_spawn_obstacle();

        // 6. Gradually increase speed (mimicking original Chrome Dino mechanics)
        if self.ticks.is_multiple_of(100) && self.speed < Self::MAX_SPEED {
            self.speed = (self.speed + 0.15).min(Self::MAX_SPEED);
        }

        // 7. Collision Detection (AABB)
        for obs in &self.obstacles {
            if Self::check_collision(self.dino_x, self.dino_y, self.is_ducking, obs) {
                self.terminal = true;
                reward = -100.0; // Fatal collision penalty (-100.0)
                break;
            }
        }

        DinoStepResult {
            observation: self.observe(),
            reward,
            terminal: self.terminal,
            score: self.score,
            obstacle_cleared,
        }
    }

    /// Renders an ASCII frame representation for the terminal
    pub fn render_ascii(&self) -> String {
        const VIEW_WIDTH: usize = 65;
        const VIEW_HEIGHT: usize = 10;
        let mut grid = vec![vec![' '; VIEW_WIDTH]; VIEW_HEIGHT];

        // Draw ground line at bottom row (row index 9)
        grid[9].fill('=');

        // Calculate Dino grid position
        let dino_col: usize = 5;
        let dino_ground_row: usize = 8;
        let dino_jump_rows = ((self.dino_y / 90.0) * 6.0).round() as usize;
        let dino_base_row = dino_ground_row.saturating_sub(dino_jump_rows);

        // Draw Dino
        if self.is_ducking && self.dino_y == 0.0 {
            // Ducking Dino (2 rows)
            if dino_base_row < VIEW_HEIGHT {
                let duck_text = "____(o_o)>";
                for (i, ch) in duck_text.chars().enumerate() {
                    if dino_col + i < VIEW_WIDTH {
                        grid[dino_base_row][dino_col + i] = ch;
                    }
                }
            }
        } else {
            // Standing or Jumping Dino (3 rows)
            let head_row = dino_base_row.saturating_sub(2);
            let body_row = dino_base_row.saturating_sub(1);
            let legs_row = dino_base_row;

            if head_row < VIEW_HEIGHT {
                let head = " (o_o) ";
                for (i, ch) in head.chars().enumerate() {
                    if dino_col + i < VIEW_WIDTH {
                        grid[head_row][dino_col + i] = ch;
                    }
                }
            }
            if body_row < VIEW_HEIGHT {
                let body = " /| |\\ ";
                for (i, ch) in body.chars().enumerate() {
                    if dino_col + i < VIEW_WIDTH {
                        grid[body_row][dino_col + i] = ch;
                    }
                }
            }
            if legs_row < VIEW_HEIGHT {
                let legs = "  | |  ";
                for (i, ch) in legs.chars().enumerate() {
                    if dino_col + i < VIEW_WIDTH {
                        grid[legs_row][dino_col + i] = ch;
                    }
                }
            }
        }

        // Draw Obstacles
        for obs in &self.obstacles {
            // Map obstacle.x relative to dino_x into column coordinates
            let rel_x = obs.x - self.dino_x;
            if (-20.0..500.0).contains(&rel_x) {
                let col = dino_col as f32 + (rel_x / 8.0);
                let col_idx = col.round() as i32;

                match obs.obstacle_type {
                    ObstacleType::SmallCactus => {
                        let r1 = dino_ground_row.saturating_sub(1);
                        let r2 = dino_ground_row;
                        if col_idx >= 0 && (col_idx as usize) < VIEW_WIDTH {
                            let c = col_idx as usize;
                            if r1 < VIEW_HEIGHT {
                                grid[r1][c] = '#';
                            }
                            if r2 < VIEW_HEIGHT {
                                grid[r2][c] = '#';
                            }
                        }
                    }
                    ObstacleType::LargeCactus => {
                        let r1 = dino_ground_row.saturating_sub(2);
                        let r2 = dino_ground_row.saturating_sub(1);
                        let r3 = dino_ground_row;
                        if col_idx >= 0 && (col_idx as usize) < VIEW_WIDTH {
                            let c = col_idx as usize;
                            if r1 < VIEW_HEIGHT {
                                grid[r1][c] = '#';
                            }
                            if r2 < VIEW_HEIGHT {
                                grid[r2][c] = '%';
                            }
                            if r3 < VIEW_HEIGHT {
                                grid[r3][c] = '#';
                            }
                        }
                    }
                    ObstacleType::TripleCactus => {
                        for dc in 0..3 {
                            let c = col_idx + dc;
                            if c >= 0 && (c as usize) < VIEW_WIDTH {
                                let cu = c as usize;
                                let r1 = dino_ground_row.saturating_sub(1);
                                let r2 = dino_ground_row;
                                if r1 < VIEW_HEIGHT {
                                    grid[r1][cu] = '#';
                                }
                                if r2 < VIEW_HEIGHT {
                                    grid[r2][cu] = '#';
                                }
                            }
                        }
                    }
                    ObstacleType::PterodactylLow
                    | ObstacleType::PterodactylMid
                    | ObstacleType::PterodactylHigh => {
                        // Flying altitude determines row
                        let ptero_height_rows = ((obs.y / 80.0) * 6.0).round() as usize;
                        let ptero_row = dino_ground_row.saturating_sub(ptero_height_rows.max(1));
                        let sprite = "<vVv>";
                        for (i, ch) in sprite.chars().enumerate() {
                            let c = col_idx + i as i32;
                            if c >= 0 && (c as usize) < VIEW_WIDTH && ptero_row < VIEW_HEIGHT {
                                grid[ptero_row][c as usize] = ch;
                            }
                        }
                    }
                }
            }
        }

        // Format grid into string
        let mut out = String::new();
        for row in grid {
            let line: String = row.into_iter().collect();
            out.push_str(&line);
            out.push('\n');
        }
        out
    }
}

#[async_trait]
impl EnvironmentAdapter for ChromeDinoEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "chrome_dino_runner".to_string(),
            name: "Chrome Dino (T-Rex Runner)".to_string(),
            capabilities: vec![
                "run".to_string(),
                "jump".to_string(),
                "duck".to_string(),
                "obstacle_avoidance".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "RUN".to_string(),
                "JUMP".to_string(),
                "DUCK".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "gravity_and_momentum".to_string(),
                max_action_rate: 60.0,
                forbids_reversal: true,
                safety_perimeter: 1.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "chrome_dino_runner".to_string(),
            action_space_kind: "Discrete3".to_string(),
            observation_space_kind: "Structured1D".to_string(),
            physics_fidelity: 0.95,
            capability_tags: vec![
                "run".to_string(),
                "jump".to_string(),
                "duck".to_string(),
                "collision_avoidance".to_string(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe_abstract()
    }

    async fn observe(&self) -> Result<AbstractState> {
        self.observe_abstract()
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let dino_act = match action {
            AbstractAction::Avoid | AbstractAction::Navigate(RelativeDirection::North) => {
                DinoAction::Jump
            }
            AbstractAction::Retreat | AbstractAction::Navigate(RelativeDirection::South) => {
                DinoAction::Duck
            }
            _ => DinoAction::Run,
        };

        let result = self.step(dino_act);
        Ok(result.reward)
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

impl ChromeDinoEnvironment {
    fn observe_abstract(&self) -> Result<AbstractState> {
        let obs = self.observe();
        let dist_cat = if obs.distance_to_obstacle < 80.0 {
            DistanceCategory::Immediate
        } else if obs.distance_to_obstacle < 180.0 {
            DistanceCategory::Near
        } else if obs.distance_to_obstacle < 350.0 {
            DistanceCategory::Medium
        } else {
            DistanceCategory::Far
        };

        let obstacle_front = obs.distance_to_obstacle < 200.0;

        Ok(AbstractState {
            target_relative_direction: RelativeDirection::East, // Running to the right
            target_distance_category: dist_cat,
            obstacle_front,
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: self.score > 0,
        })
    }
}

/// Benchmark performance report for Chrome Dino policies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DinoBenchmarkReport {
    pub name: String,
    pub episodes: usize,
    pub average_score: f32,
    pub median_score: f32,
    pub best_score: u32,
    pub average_survival_ticks: f32,
    pub obstacles_cleared_per_episode: f32,
    pub survival_rate: f32,
}

/// Evaluation runner across episodes for Chrome Dino
pub struct DinoBenchmarkRunner;

impl DinoBenchmarkRunner {
    pub fn run_policy(
        q_table: &QTable,
        name: &str,
        episodes: usize,
        base_seed: u64,
        max_ticks_per_episode: usize,
    ) -> DinoBenchmarkReport {
        let mut scores = Vec::with_capacity(episodes);
        let mut ticks_list = Vec::with_capacity(episodes);

        for ep in 0..episodes {
            let mut env = ChromeDinoEnvironment::new(base_seed + ep as u64);
            let mut ep_ticks = 0;

            while !env.is_terminal() && ep_ticks < max_ticks_per_episode {
                let obs = env.observe();
                let state_key = obs.discrete_key();

                let action = DinoAction::from_str_loose(
                    ["RUN", "JUMP", "DUCK"]
                        .iter()
                        .max_by(|a, b| {
                            let qa = q_table.get_q(&state_key, a);
                            let qb = q_table.get_q(&state_key, b);
                            qa.partial_cmp(&qb).unwrap_or(std::cmp::Ordering::Equal)
                        })
                        .unwrap_or(&"RUN"),
                )
                .unwrap_or(DinoAction::Run);

                env.step(action);
                ep_ticks += 1;
            }

            scores.push(env.score);
            ticks_list.push(ep_ticks);
        }

        scores.sort();
        let avg_score = scores.iter().sum::<u32>() as f32 / episodes.max(1) as f32;
        let median_score = if scores.is_empty() {
            0.0
        } else if scores.len() % 2 == 1 {
            scores[scores.len() / 2] as f32
        } else {
            let mid = scores.len() / 2;
            (scores[mid - 1] + scores[mid]) as f32 / 2.0
        };
        let best_score = scores.iter().copied().max().unwrap_or(0);
        let avg_ticks = ticks_list.iter().sum::<usize>() as f32 / episodes.max(1) as f32;
        let survival_rate =
            scores.iter().filter(|&&s| s >= 5).count() as f32 / episodes.max(1) as f32;

        DinoBenchmarkReport {
            name: name.to_string(),
            episodes,
            average_score: avg_score,
            median_score,
            best_score,
            average_survival_ticks: avg_ticks,
            obstacles_cleared_per_episode: avg_score,
            survival_rate,
        }
    }
}

/// Fast Q-Learning training engine for Chrome Dino
pub struct DinoQTrainer;

impl DinoQTrainer {
    pub fn update_q(
        q_table: &mut QTable,
        state_key: &str,
        action: &str,
        reward: f32,
        next_state_key: &str,
        terminal: bool,
    ) {
        let current_q = q_table.get_q(state_key, action);
        let max_next_q = if terminal {
            0.0
        } else {
            q_table.max_q(next_state_key)
        };
        let new_q = current_q + q_table.alpha * (reward + q_table.gamma * max_next_q - current_q);
        q_table
            .table
            .entry(state_key.to_string())
            .or_default()
            .insert(action.to_string(), new_q);
    }

    pub fn select_action(
        q_table: &QTable,
        state_key: &str,
        epsilon: f32,
        rng: &mut impl Rng,
    ) -> DinoAction {
        let actions = [DinoAction::Run, DinoAction::Jump, DinoAction::Duck];
        if rng.gen::<f32>() < epsilon {
            let idx = rng.gen_range(0..actions.len());
            actions[idx]
        } else {
            actions
                .iter()
                .max_by(|a, b| {
                    let qa = q_table.get_q(state_key, a.as_str());
                    let qb = q_table.get_q(state_key, b.as_str());
                    qa.partial_cmp(&qb).unwrap_or(std::cmp::Ordering::Equal)
                })
                .copied()
                .unwrap_or(DinoAction::Run)
        }
    }

    pub fn train_episode(
        env: &mut ChromeDinoEnvironment,
        q_table: &mut QTable,
        epsilon: f32,
        max_ticks: usize,
        rng: &mut impl Rng,
    ) -> (u32, usize, f32) {
        let mut total_reward = 0.0;
        let mut ticks = 0;

        while !env.is_terminal() && ticks < max_ticks {
            let obs = env.observe();
            let s_key = obs.discrete_key();
            let action = Self::select_action(q_table, &s_key, epsilon, rng);

            let res = env.step(action);
            total_reward += res.reward;

            let ns_key = res.observation.discrete_key();
            Self::update_q(
                q_table,
                &s_key,
                action.as_str(),
                res.reward,
                &ns_key,
                res.terminal,
            );

            ticks += 1;
        }

        (env.score, ticks, total_reward)
    }
}

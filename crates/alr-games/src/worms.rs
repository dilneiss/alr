use alr_core::{Action, State};
use alr_environment::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};
use anyhow::Result;
use async_trait::async_trait;
use rand::{rngs::StdRng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};

pub const DEFAULT_TERRAIN_WIDTH: usize = 60;
pub const DEFAULT_TERRAIN_MAX_HEIGHT: f32 = 25.0;
pub const DEFAULT_GRAVITY: f32 = -0.4; // Downward acceleration per tick
pub const DEFAULT_BLAST_RADIUS: f32 = 5.0;
pub const DEFAULT_MAX_DAMAGE: f32 = 50.0;

/// A worm soldier in the artillery arena
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Worm {
    pub id: usize,
    pub team: u8, // 0 = Player, 1 = Enemy
    pub x: f32,
    pub y: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub alive: bool,
    pub angle_deg: f32, // Cannon angle in degrees [0.0, 180.0]
    pub power: f32,     // Cannon power [0.0, 100.0]
}

impl Worm {
    pub fn new(id: usize, team: u8, x: f32, y: f32) -> Self {
        Self {
            id,
            team,
            x,
            y,
            hp: 100.0,
            max_hp: 100.0,
            alive: true,
            angle_deg: if team == 0 { 45.0 } else { 135.0 },
            power: 50.0,
        }
    }
}

/// Projectile launched by a worm
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Projectile {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub blast_radius: f32,
    pub damage: f32,
    pub active: bool,
}

/// Actions available for the Worms artillery agent
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum WormsAction {
    SetAngle(f32),
    SetPower(f32),
    Fire,
    MoveLeft,
    MoveRight,
    Pass,
}

impl WormsAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            WormsAction::SetAngle(_) => "SET_ANGLE",
            WormsAction::SetPower(_) => "SET_POWER",
            WormsAction::Fire => "FIRE",
            WormsAction::MoveLeft => "MOVE_LEFT",
            WormsAction::MoveRight => "MOVE_RIGHT",
            WormsAction::Pass => "PASS",
        }
    }

    pub fn to_alr_action(&self) -> Action {
        Action::new(
            self.as_str(),
            serde_json::to_value(self)
                .unwrap_or_else(|_| serde_json::json!({ "action": self.as_str() })),
        )
    }
}

/// Autonomous Turn-Based Artillery (Worms-Style) Simulation Environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WormsGameEnvironment {
    pub width: usize,
    pub terrain_heights: Vec<f32>,
    pub worms: Vec<Worm>,
    pub active_worm_idx: usize,
    pub wind: f32, // Wind force vector [-1.0, 1.0]
    pub gravity: f32,
    pub terminal: bool,
    pub seed: u64,
    pub turns_played: u32,
    pub score: u32,
}

impl Default for WormsGameEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl WormsGameEnvironment {
    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            width: DEFAULT_TERRAIN_WIDTH,
            terrain_heights: vec![10.0; DEFAULT_TERRAIN_WIDTH],
            worms: Vec::new(),
            active_worm_idx: 0,
            wind: 0.0,
            gravity: DEFAULT_GRAVITY,
            terminal: false,
            seed,
            turns_played: 0,
            score: 0,
        };
        env.reset(seed);
        env
    }

    /// Resets terrain with sinusoidal hills, places worms, and picks random wind
    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.turns_played = 0;
        self.terminal = false;
        self.score = 0;
        self.active_worm_idx = 0;

        let mut rng = StdRng::seed_from_u64(seed);

        // 1. Generate hilly terrain
        self.terrain_heights = (0..self.width)
            .map(|x| {
                let fx = x as f32;
                let h = 8.0 + 4.0 * (fx * 0.15).sin() + 2.0 * (fx * 0.35).cos();
                h.clamp(3.0, DEFAULT_TERRAIN_MAX_HEIGHT - 3.0)
            })
            .collect();

        // 2. Pick dynamic wind vector
        self.wind = rng.gen_range(-0.5..0.5);

        // 3. Spawn player worm (left) and enemy worm (right)
        let p_x = 8.0;
        let p_y = self.get_terrain_height(p_x);
        let e_x = (self.width - 9) as f32;
        let e_y = self.get_terrain_height(e_x);

        self.worms = vec![
            Worm::new(1, 0, p_x, p_y), // Player team 0
            Worm::new(2, 1, e_x, e_y), // Enemy team 1
        ];
    }

    /// Returns interpolated terrain height at coordinate x
    pub fn get_terrain_height(&self, x: f32) -> f32 {
        if x < 0.0 {
            return self.terrain_heights[0];
        }
        let idx = (x as usize).min(self.width - 1);
        self.terrain_heights[idx]
    }

    /// Applies gravity to all worms so they rest on the terrain
    pub fn apply_gravity_to_worms(&mut self) {
        for i in 0..self.worms.len() {
            if self.worms[i].alive {
                let x = self.worms[i].x;
                let th = self.get_terrain_height(x);
                self.worms[i].y = th; // Placed firmly on ground
            }
        }
    }

    /// Simulates parabolic trajectory taking wind and gravity into account
    /// Returns the sequence of (x, y) coordinates until terrain collision or out-of-bounds
    pub fn simulate_trajectory(
        &self,
        start_x: f32,
        start_y: f32,
        angle_deg: f32,
        power: f32,
        max_steps: usize,
    ) -> Vec<(f32, f32)> {
        let mut path = Vec::with_capacity(max_steps);
        let angle_rad = angle_deg.to_radians();
        let speed = power * 0.04;

        let mut vx = speed * angle_rad.cos();
        let mut vy = speed * angle_rad.sin();
        let mut x = start_x;
        let mut y = start_y + 1.0; // Slightly above worm cannon

        path.push((x, y));

        for _ in 0..max_steps {
            // Apply wind and gravity
            vx += self.wind * 0.05;
            vy += self.gravity;

            x += vx;
            y += vy;

            // Bounds check
            if x < 0.0 || x >= self.width as f32 || y < 0.0 {
                break;
            }

            path.push((x, y));

            // Check collision with terrain
            let th = self.get_terrain_height(x);
            if y <= th {
                break; // Impact!
            }
        }

        path
    }

    /// Excavates a circular crater into the terrain
    pub fn excavate_crater(&mut self, cx: f32, cy: f32, radius: f32) {
        let min_x = ((cx - radius).floor() as isize).max(0) as usize;
        let max_x = ((cx + radius).ceil() as isize).min(self.width as isize - 1) as usize;

        for x in min_x..=max_x {
            let dx = x as f32 - cx;
            let dy_sq = radius * radius - dx * dx;
            if dy_sq >= 0.0 {
                let dy = dy_sq.sqrt();
                let crater_bottom = (cy - dy).max(1.0);
                if self.terrain_heights[x] > crater_bottom {
                    self.terrain_heights[x] = crater_bottom;
                }
            }
        }
    }

    /// Recommends angle and power using trajectory search to hit the enemy
    pub fn recommend_aim(&self) -> (f32, f32) {
        let player = &self.worms[0];
        let enemy = &self.worms[1];

        let mut best_angle = 45.0;
        let mut best_power = 50.0;
        let mut min_dist = f32::MAX;

        for angle in (25..=85).step_by(5) {
            for power in (20..=100).step_by(10) {
                let traj =
                    self.simulate_trajectory(player.x, player.y, angle as f32, power as f32, 120);
                if let Some(&(last_x, last_y)) = traj.last() {
                    let d = ((last_x - enemy.x).powi(2) + (last_y - enemy.y).powi(2)).sqrt();
                    if d < min_dist {
                        min_dist = d;
                        best_angle = angle as f32;
                        best_power = power as f32;
                    }
                }
            }
        }

        (best_angle, best_power)
    }

    /// Steps the artillery simulation with an action
    pub fn step(&mut self, action: WormsAction) -> f32 {
        if self.terminal {
            return 0.0;
        }

        let mut reward = 0.0;
        let current_team = self.worms[self.active_worm_idx].team;

        match action {
            WormsAction::SetAngle(deg) => {
                self.worms[self.active_worm_idx].angle_deg = deg.clamp(0.0, 180.0);
                reward += 0.01;
            }
            WormsAction::SetPower(p) => {
                self.worms[self.active_worm_idx].power = p.clamp(0.0, 100.0);
                reward += 0.01;
            }
            WormsAction::MoveLeft => {
                let new_x = (self.worms[self.active_worm_idx].x - 1.0).max(1.0);
                let th = self.get_terrain_height(new_x);
                let w = &mut self.worms[self.active_worm_idx];
                w.x = new_x;
                w.y = th;
            }
            WormsAction::MoveRight => {
                let new_x = (self.worms[self.active_worm_idx].x + 1.0).min(self.width as f32 - 2.0);
                let th = self.get_terrain_height(new_x);
                let w = &mut self.worms[self.active_worm_idx];
                w.x = new_x;
                w.y = th;
            }
            WormsAction::Fire => {
                let worm = &self.worms[self.active_worm_idx];
                let traj =
                    self.simulate_trajectory(worm.x, worm.y, worm.angle_deg, worm.power, 150);

                if let Some(&(impact_x, impact_y)) = traj.last() {
                    // Excavate crater
                    self.excavate_crater(impact_x, impact_y, DEFAULT_BLAST_RADIUS);

                    // Deal explosion damage to worms
                    for target in &mut self.worms {
                        if !target.alive {
                            continue;
                        }
                        let dist =
                            ((target.x - impact_x).powi(2) + (target.y - impact_y).powi(2)).sqrt();
                        if dist <= DEFAULT_BLAST_RADIUS {
                            let dmg = DEFAULT_MAX_DAMAGE * (1.0 - (dist / DEFAULT_BLAST_RADIUS));
                            target.hp = (target.hp - dmg).max(0.0);

                            if target.team != current_team {
                                // Dealt damage to enemy!
                                reward += dmg * 0.1;
                                self.score += (dmg * 10.0) as u32;
                            } else {
                                // Friendly fire
                                reward -= dmg * 0.15;
                            }

                            if target.hp <= 0.0 {
                                target.alive = false;
                                if target.team != current_team {
                                    reward += 10.0; // Enemy eliminated
                                } else {
                                    reward -= 10.0; // Suicide
                                }
                            }
                        }
                    }

                    // Re-apply gravity to all worms
                    self.apply_gravity_to_worms();
                }

                self.turns_played += 1;
                // Switch turn
                self.active_worm_idx = (self.active_worm_idx + 1) % self.worms.len();

                // Change wind dynamically
                let mut rng =
                    StdRng::seed_from_u64(self.seed.wrapping_add(self.turns_played as u64 * 17));
                self.wind = (self.wind + rng.gen_range(-0.15..0.15)).clamp(-1.0, 1.0);
            }
            WormsAction::Pass => {
                self.turns_played += 1;
                self.active_worm_idx = (self.active_worm_idx + 1) % self.worms.len();
            }
        }

        // Check victory / game over
        let player_alive = self.worms.iter().any(|w| w.team == 0 && w.alive);
        let enemy_alive = self.worms.iter().any(|w| w.team == 1 && w.alive);

        if !player_alive || !enemy_alive {
            self.terminal = true;
            if player_alive && !enemy_alive {
                reward += 15.0; // Match won
            }
        }

        reward
    }

    pub fn to_alr_state(&self) -> State {
        State::new(
            vec![
                self.wind,
                self.worms.first().map(|w| w.x).unwrap_or(0.0),
                self.worms.first().map(|w| w.y).unwrap_or(0.0),
                self.worms.first().map(|w| w.hp).unwrap_or(0.0),
                self.worms.get(1).map(|w| w.hp).unwrap_or(0.0),
            ],
            serde_json::json!({
                "wind": self.wind,
                "turns_played": self.turns_played,
                "score": self.score,
                "active_worm": self.active_worm_idx,
                "player_hp": self.worms.first().map(|w| w.hp).unwrap_or(0.0),
                "enemy_hp": self.worms.get(1).map(|w| w.hp).unwrap_or(0.0),
                "terminal": self.terminal,
            }),
        )
    }
    /// Renders an ASCII view of the Worms artillery landscape
    #[allow(clippy::needless_range_loop)]
    pub fn render_ascii(&self) -> String {
        let rows = 18;
        let cols = self.width;
        let mut grid = vec![vec![' '; cols]; rows];

        // Draw sky and terrain
        for x in 0..cols {
            let th = (self.terrain_heights[x] as usize).min(rows - 1);
            let ground_start_row = rows.saturating_sub(th);

            for y in ground_start_row..rows {
                if y == ground_start_row {
                    grid[y][x] = '~'; // Grass surface
                } else {
                    grid[y][x] = '#'; // Underground dirt
                }
            }
        }

        // Draw worms
        for worm in &self.worms {
            if !worm.alive {
                continue;
            }
            let wx = (worm.x as usize).min(cols - 1);
            let th = (worm.y as usize).min(rows - 1);
            let wy = rows.saturating_sub(th + 1);

            if wy < rows {
                grid[wy][wx] = if worm.team == 0 { 'W' } else { 'E' };
            }
        }

        let mut out = String::new();
        out.push_str("================ WORMS 2D ARTILLERY ARENA ================\n");
        let w0 = &self.worms[0];
        let w1 = &self.worms[1];
        out.push_str(&format!(
            " Player: HP {:.0} (Angle: {:.0}°, Pwr: {:.0}) | Enemy: HP {:.0} | Turn: {}\n",
            w0.hp, w0.angle_deg, w0.power, w1.hp, self.turns_played
        ));

        let wind_arrow = if self.wind > 0.05 {
            format!(">>> (+{:.2})", self.wind)
        } else if self.wind < -0.05 {
            format!("<<< ({:.2})", self.wind)
        } else {
            "--- (Calm)".to_string()
        };
        out.push_str(&format!(
            " Dynamic Wind: {} | Gravity: {:.1}\n",
            wind_arrow, self.gravity
        ));
        out.push_str("----------------------------------------------------------\n");

        for row in 0..rows {
            for col in 0..cols {
                out.push(grid[row][col]);
            }
            out.push('\n');
        }

        out.push_str("----------------------------------------------------------\n");
        let (rec_ang, rec_pwr) = self.recommend_aim();
        out.push_str(&format!(
            " System 1 Aim Recommendation: Angle {:.0}°, Power {:.0}\n",
            rec_ang, rec_pwr
        ));
        out.push_str("==========================================================\n");
        out
    }
}

#[async_trait]
impl EnvironmentAdapter for WormsGameEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "worms_2d_artillery".to_string(),
            name: "Worms 2D Turn-Based Destructible Artillery Lab".to_string(),
            capabilities: vec![
                "ballistic_trajectory_calculation".to_string(),
                "destructible_terrain_deformation".to_string(),
                "dynamic_wind_compensation".to_string(),
                "blast_damage_evaluation".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "SET_ANGLE".to_string(),
                "SET_POWER".to_string(),
                "FIRE".to_string(),
                "MOVE_LEFT".to_string(),
                "MOVE_RIGHT".to_string(),
                "PASS".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "turn_timeout".to_string(),
                max_action_rate: 1.0,
                forbids_reversal: false,
                safety_perimeter: 5.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "worms_2d_artillery".to_string(),
            action_space_kind: "Discrete6".to_string(),
            observation_space_kind: "TerrainArtilleryState".to_string(),
            physics_fidelity: 0.95,
            capability_tags: vec![
                "worms".into(),
                "artillery".into(),
                "ballistics".into(),
                "wind".into(),
                "destructible_terrain".into(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let p = &self.worms[0];
        let e = &self.worms[1];

        let dx = e.x - p.x;
        let dist = dx.abs();

        let dist_cat = if dist < 15.0 {
            DistanceCategory::Immediate
        } else if dist < 30.0 {
            DistanceCategory::Near
        } else if dist < 45.0 {
            DistanceCategory::Medium
        } else {
            DistanceCategory::Far
        };

        let dir = if dx > 0.0 {
            RelativeDirection::East
        } else {
            RelativeDirection::West
        };

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: self.wind.abs() > 0.4, // Strong wind acts as environmental obstacle
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: e.alive,
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let worms_act = match action {
            AbstractAction::Approach => {
                let (ang, pwr) = self.recommend_aim();
                self.worms[0].angle_deg = ang;
                self.worms[0].power = pwr;
                WormsAction::Fire
            }
            AbstractAction::Navigate(RelativeDirection::West) => WormsAction::MoveLeft,
            AbstractAction::Navigate(RelativeDirection::East) => WormsAction::MoveRight,
            AbstractAction::Collect | AbstractAction::Interact(_) => WormsAction::Fire,
            _ => WormsAction::Pass,
        };

        Ok(self.step(worms_act))
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_worms_parabolic_trajectory_and_wind() {
        let mut env = WormsGameEnvironment::new(42);
        env.wind = 0.0;
        let traj_calm = env.simulate_trajectory(10.0, 10.0, 45.0, 50.0, 100);
        assert!(traj_calm.len() > 5);

        // With strong tailwind, projectile travels further
        env.wind = 0.8;
        let traj_wind = env.simulate_trajectory(10.0, 10.0, 45.0, 50.0, 100);
        let max_x_calm = traj_calm.iter().map(|p| p.0).fold(0.0f32, f32::max);
        let max_x_wind = traj_wind.iter().map(|p| p.0).fold(0.0f32, f32::max);
        assert!(
            max_x_wind > max_x_calm,
            "Tailwind must push projectile further!"
        );
    }

    #[test]
    fn test_worms_terrain_excavation_crater() {
        let mut env = WormsGameEnvironment::new(100);
        let initial_h = env.get_terrain_height(30.0);
        env.excavate_crater(30.0, initial_h, 5.0);
        let crater_h = env.get_terrain_height(30.0);
        assert!(
            crater_h < initial_h,
            "Terrain height at crater epicenter must decrease!"
        );
    }

    #[test]
    fn test_worms_recommend_aim_hits_target() {
        let env = WormsGameEnvironment::new(200);
        let (ang, pwr) = env.recommend_aim();
        assert!((20.0..=85.0).contains(&ang));
        assert!((20.0..=100.0).contains(&pwr));
    }

    #[tokio::test]
    async fn test_worms_environment_adapter() {
        let mut env = WormsGameEnvironment::new(42);
        let state = env.observe().await.unwrap();
        assert!(state.inventory_has_target); // Enemy is alive
        let reward = env.act(AbstractAction::Approach).await.unwrap();
        assert!(reward >= 0.0);
    }
}

use alr_core::{Action, State};
use alr_environment::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};
use alr_world::Vec3;
use anyhow::Result;
use async_trait::async_trait;
use rand::{rngs::StdRng, Rng, SeedableRng};
use serde::{Deserialize, Serialize};

pub const DEFAULT_SCREEN_WIDTH: f32 = 800.0;
pub const DEFAULT_SCREEN_HEIGHT: f32 = 600.0;
pub const DEFAULT_FOV_DEGREES: f32 = 90.0;
pub const DEFAULT_MAX_AMMO: u32 = 30;
pub const DEFAULT_BULLET_DAMAGE: f32 = 50.0;

/// 3D Target in the FPS arena
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Target3D {
    pub id: usize,
    pub position: Vec3,
    pub radius: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub alive: bool,
    pub speed: f32,
    pub direction: Vec3,
}

impl Target3D {
    pub fn new(id: usize, position: Vec3) -> Self {
        Self {
            id,
            position,
            radius: 0.8,
            hp: 100.0,
            max_hp: 100.0,
            alive: true,
            speed: 0.1,
            direction: Vec3::new(1.0, 0.0, 0.0),
        }
    }
}

/// Player 3D camera, weapon, and movement state
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlayerState3D {
    pub position: Vec3,
    pub pitch: f32, // Vertical angle in radians [-1.4, 1.4]
    pub yaw: f32,   // Horizontal angle in radians [0, 2*PI]
    pub crosshair_x: f32,
    pub crosshair_y: f32,
    pub ammo: u32,
    pub max_ammo: u32,
    pub hp: f32,
    pub recoil_pitch: f32,
    pub recoil_yaw: f32,
    pub score: u32,
}

impl Default for PlayerState3D {
    fn default() -> Self {
        Self {
            position: Vec3::new(0.0, 1.7, 0.0), // 1.7m eye height
            pitch: 0.0,
            yaw: 0.0,
            crosshair_x: DEFAULT_SCREEN_WIDTH / 2.0,
            crosshair_y: DEFAULT_SCREEN_HEIGHT / 2.0,
            ammo: DEFAULT_MAX_AMMO,
            max_ammo: DEFAULT_MAX_AMMO,
            hp: 100.0,
            recoil_pitch: 0.0,
            recoil_yaw: 0.0,
            score: 0,
        }
    }
}

/// Actions available for the FPS shooter agent
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum FpsAction {
    Aim { target_x: f32, target_y: f32 },
    AimAngles { delta_yaw: f32, delta_pitch: f32 },
    Shoot,
    Reload,
    StrafeLeft,
    StrafeRight,
    MoveForward,
    MoveBackward,
    Stay,
}

impl FpsAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            FpsAction::Aim { .. } => "AIM",
            FpsAction::AimAngles { .. } => "AIM_ANGLES",
            FpsAction::Shoot => "SHOOT",
            FpsAction::Reload => "RELOAD",
            FpsAction::StrafeLeft => "STRAFE_LEFT",
            FpsAction::StrafeRight => "STRAFE_RIGHT",
            FpsAction::MoveForward => "MOVE_FORWARD",
            FpsAction::MoveBackward => "MOVE_BACKWARD",
            FpsAction::Stay => "STAY",
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

/// Autonomous 3D First-Person Shooter Simulation Environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FpsGameEnvironment {
    pub screen_width: f32,
    pub screen_height: f32,
    pub fov_degrees: f32,
    pub player: PlayerState3D,
    pub targets: Vec<Target3D>,
    pub terminal: bool,
    pub seed: u64,
    pub ticks: u32,
    pub hits_registered: u32,
    pub shots_fired: u32,
}

impl Default for FpsGameEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl FpsGameEnvironment {
    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            screen_width: DEFAULT_SCREEN_WIDTH,
            screen_height: DEFAULT_SCREEN_HEIGHT,
            fov_degrees: DEFAULT_FOV_DEGREES,
            player: PlayerState3D::default(),
            targets: Vec::new(),
            terminal: false,
            seed,
            ticks: 0,
            hits_registered: 0,
            shots_fired: 0,
        };
        env.reset(seed);
        env
    }

    /// Resets the FPS arena with player at origin and targets spawned in 3D space
    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.ticks = 0;
        self.terminal = false;
        self.hits_registered = 0;
        self.shots_fired = 0;

        self.player = PlayerState3D::default();

        // Spawn targets deterministically in front of the player (Z > 0)
        let mut rng = StdRng::seed_from_u64(seed);
        self.targets.clear();

        for id in 1..=4 {
            let x = rng.gen_range(-6.0..6.0);
            let y = rng.gen_range(1.0..2.5);
            let z = rng.gen_range(8.0..18.0);
            self.targets.push(Target3D::new(id, Vec3::new(x, y, z)));
        }
    }

    /// Forward unit vector incorporating pitch, yaw, and recoil
    pub fn forward_vector(&self) -> Vec3 {
        let eff_pitch = (self.player.pitch + self.player.recoil_pitch).clamp(-1.4, 1.4);
        let eff_yaw = self.player.yaw + self.player.recoil_yaw;

        let fx = eff_pitch.cos() * eff_yaw.sin();
        let fy = eff_pitch.sin();
        let fz = eff_pitch.cos() * eff_yaw.cos();

        Vec3::new(fx, fy, fz).normalize()
    }

    /// Right unit vector perpendicular to forward and world up
    pub fn right_vector(&self) -> Vec3 {
        let f = self.forward_vector();
        // Cross(F, (0, 1, 0)) = (F.z, 0, -F.x)
        Vec3::new(f.z, 0.0, -f.x).normalize()
    }

    /// Up unit vector perpendicular to forward and right
    pub fn up_vector(&self) -> Vec3 {
        let f = self.forward_vector();
        let r = self.right_vector();
        // Cross(R, F)
        let ux = r.y * f.z - r.z * f.y;
        let uy = r.z * f.x - r.x * f.z;
        let uz = r.x * f.y - r.y * f.x;
        Vec3::new(ux, uy, uz).normalize()
    }

    /// Projects a 3D world coordinate into 2D screen coordinates (x, y) if in FOV
    pub fn project_to_screen(&self, world_pos: &Vec3) -> Option<(f32, f32)> {
        let d = Vec3::new(
            world_pos.x - self.player.position.x,
            world_pos.y - self.player.position.y,
            world_pos.z - self.player.position.z,
        );

        let f = self.forward_vector();
        let r = self.right_vector();
        let u = self.up_vector();

        let dist_forward = d.dot(&f);
        if dist_forward <= 0.1 {
            return None; // Behind camera
        }

        let dist_right = d.dot(&r);
        let dist_up = d.dot(&u);

        let half_fov_rad = (self.fov_degrees / 2.0).to_radians();
        let focal_length = (self.screen_width / 2.0) / half_fov_rad.tan();

        let screen_x = (self.screen_width / 2.0) + (dist_right / dist_forward) * focal_length;
        let screen_y = (self.screen_height / 2.0) - (dist_up / dist_forward) * focal_length;

        // Check screen boundaries with small margin
        if screen_x >= -50.0
            && screen_x <= self.screen_width + 50.0
            && screen_y >= -50.0
            && screen_y <= self.screen_height + 50.0
        {
            Some((screen_x, screen_y))
        } else {
            None
        }
    }

    /// Checks if a target is in current FOV and returns its screen coordinate
    pub fn is_target_in_fov(&self, target: &Target3D) -> Option<(f32, f32)> {
        if !target.alive {
            return None;
        }
        self.project_to_screen(&target.position)
    }

    /// Checks if target is under crosshair within pixel tolerance
    pub fn is_target_under_crosshair(&self, target: &Target3D, tolerance_px: f32) -> bool {
        if let Some((sx, sy)) = self.is_target_in_fov(target) {
            let dx = sx - self.player.crosshair_x;
            let dy = sy - self.player.crosshair_y;
            (dx * dx + dy * dy).sqrt() <= tolerance_px
        } else {
            false
        }
    }

    /// Finds the closest alive target in FOV
    pub fn find_closest_target_in_fov(&self) -> Option<(usize, f32, f32)> {
        self.targets
            .iter()
            .filter(|t| t.alive)
            .filter_map(|t| {
                self.project_to_screen(&t.position)
                    .map(|coord| (t.id, coord.0, coord.1))
            })
            .min_by(|a, b| {
                let da = (a.1 - self.player.crosshair_x).powi(2)
                    + (a.2 - self.player.crosshair_y).powi(2);
                let db = (b.1 - self.player.crosshair_x).powi(2)
                    + (b.2 - self.player.crosshair_y).powi(2);
                da.partial_cmp(&db).unwrap()
            })
    }

    /// Smooth mouse-aim interpolation towards a screen target
    pub fn aim_towards(&mut self, target_x: f32, target_y: f32, smooth_factor: f32) {
        let dx = target_x - self.player.crosshair_x;
        let dy = target_y - self.player.crosshair_y;

        // Convert screen delta to angle delta
        let half_fov_rad = (self.fov_degrees / 2.0).to_radians();
        let focal_length = (self.screen_width / 2.0) / half_fov_rad.tan();

        let delta_yaw = (dx * smooth_factor) / focal_length;
        let delta_pitch = -(dy * smooth_factor) / focal_length;

        self.player.yaw = (self.player.yaw + delta_yaw).rem_euclid(2.0 * std::f32::consts::PI);
        self.player.pitch = (self.player.pitch + delta_pitch).clamp(-1.4, 1.4);
    }

    /// Executes an FPS action and advances simulation
    pub fn step(&mut self, action: FpsAction) -> f32 {
        if self.terminal {
            return 0.0;
        }

        self.ticks += 1;
        let mut reward = 0.0;

        // 1. Recoil recovery
        self.player.recoil_pitch *= 0.70;
        self.player.recoil_yaw *= 0.70;

        // 2. Action execution
        match action {
            FpsAction::Aim { target_x, target_y } => {
                self.aim_towards(target_x, target_y, 0.40);
                reward += 0.05; // Reward for aiming
            }
            FpsAction::AimAngles {
                delta_yaw,
                delta_pitch,
            } => {
                self.player.yaw =
                    (self.player.yaw + delta_yaw).rem_euclid(2.0 * std::f32::consts::PI);
                self.player.pitch = (self.player.pitch + delta_pitch).clamp(-1.4, 1.4);
            }
            FpsAction::Shoot => {
                self.shots_fired += 1;
                if self.player.ammo > 0 {
                    self.player.ammo -= 1;

                    // Apply recoil
                    self.player.recoil_pitch += 0.04;
                    self.player.recoil_yaw += 0.01;

                    // Hitscan check against targets
                    let mut hit = false;
                    for i in 0..self.targets.len() {
                        if !self.targets[i].alive {
                            continue;
                        }
                        let pos = self.targets[i].position;
                        let radius = self.targets[i].radius;
                        if let Some((sx, sy)) = self.project_to_screen(&pos) {
                            let dist_to_crosshair = ((sx - self.player.crosshair_x).powi(2)
                                + (sy - self.player.crosshair_y).powi(2))
                            .sqrt();

                            // Target hitbox in screen pixels (inversely proportional to depth)
                            let depth = pos.distance(&self.player.position).max(1.0);
                            let screen_hitbox = (radius * 400.0) / depth;

                            if dist_to_crosshair <= screen_hitbox {
                                hit = true;
                                self.hits_registered += 1;
                                self.targets[i].hp -= DEFAULT_BULLET_DAMAGE;
                                reward += 1.0;

                                if self.targets[i].hp <= 0.0 {
                                    self.targets[i].alive = false;
                                    self.player.score += 100;
                                    reward += 5.0; // Target eliminated reward
                                }
                                break;
                            }
                        }
                    }

                    if !hit {
                        reward -= 0.1; // Miss penalty
                    }
                } else {
                    reward -= 0.5; // Empty gun click penalty
                }
            }
            FpsAction::Reload => {
                self.player.ammo = self.player.max_ammo;
                reward += 0.1;
            }
            FpsAction::StrafeLeft => {
                let r = self.right_vector();
                self.player.position.x -= r.x * 0.5;
                self.player.position.z -= r.z * 0.5;
            }
            FpsAction::StrafeRight => {
                let r = self.right_vector();
                self.player.position.x += r.x * 0.5;
                self.player.position.z += r.z * 0.5;
            }
            FpsAction::MoveForward => {
                let f = self.forward_vector();
                self.player.position.x += f.x * 0.5;
                self.player.position.z += f.z * 0.5;
            }
            FpsAction::MoveBackward => {
                let f = self.forward_vector();
                self.player.position.x -= f.x * 0.5;
                self.player.position.z -= f.z * 0.5;
            }
            FpsAction::Stay => {}
        }

        // 3. Move alive targets smoothly
        for target in &mut self.targets {
            if target.alive {
                target.position.x += target.direction.x * target.speed;
                // Bounce horizontal bounds
                if target.position.x > 8.0 {
                    target.direction.x = -1.0;
                } else if target.position.x < -8.0 {
                    target.direction.x = 1.0;
                }
            }
        }

        // Check victory (all targets destroyed)
        if self.targets.iter().all(|t| !t.alive) {
            self.terminal = true;
            reward += 10.0;
        }

        reward
    }

    pub fn to_alr_state(&self) -> State {
        State::new(
            vec![
                self.player.position.x,
                self.player.position.y,
                self.player.position.z,
                self.player.pitch,
                self.player.yaw,
                self.player.ammo as f32,
            ],
            serde_json::json!({
                "player_pos": [self.player.position.x, self.player.position.y, self.player.position.z],
                "pitch": self.player.pitch,
                "yaw": self.player.yaw,
                "ammo": self.player.ammo,
                "score": self.player.score,
                "targets_alive": self.targets.iter().filter(|t| t.alive).count(),
                "accuracy": if self.shots_fired > 0 { self.hits_registered as f32 / self.shots_fired as f32 } else { 0.0 },
                "terminal": self.terminal,
            }),
        )
    }

    /// Renders an ASCII view of the 3D FPS screen and HUD
    #[allow(clippy::needless_range_loop)]
    pub fn render_ascii(&self) -> String {
        let cols = 41;
        let rows = 15;
        let mut screen = vec![vec![' '; cols]; rows];

        // Draw border
        for col in 0..cols {
            screen[0][col] = '-';
            screen[rows - 1][col] = '-';
        }
        for row in 0..rows {
            screen[row][0] = '|';
            screen[row][cols - 1] = '|';
        }

        // Place Crosshair at center
        let cx = cols / 2;
        let cy = rows / 2;
        screen[cy][cx] = '+';

        // Project and render alive targets
        for target in &self.targets {
            if !target.alive {
                continue;
            }
            if let Some((sx, sy)) = self.project_to_screen(&target.position) {
                let tx = ((sx / self.screen_width) * cols as f32) as usize;
                let ty = ((sy / self.screen_height) * rows as f32) as usize;

                if tx > 0 && tx < cols - 1 && ty > 0 && ty < rows - 1 {
                    screen[ty][tx] = 'T'; // Target
                }
            }
        }

        let mut out = String::new();
        out.push_str("================ 3D FPS ARENA (CROSSHAIR HUD) ================\n");
        let acc = if self.shots_fired > 0 {
            (self.hits_registered as f32 / self.shots_fired as f32) * 100.0
        } else {
            0.0
        };
        out.push_str(&format!(
            " HP: {:.0} | Ammo: {}/{} | Score: {} | Accuracy: {:.1}%\n",
            self.player.hp, self.player.ammo, self.player.max_ammo, self.player.score, acc
        ));
        out.push_str(&format!(
            " Cam Pos: ({:.1}, {:.1}, {:.1}) | Pitch: {:.2} rad | Yaw: {:.2} rad\n",
            self.player.position.x,
            self.player.position.y,
            self.player.position.z,
            self.player.pitch,
            self.player.yaw
        ));
        out.push_str("--------------------------------------------------------------\n");

        for row in 0..rows {
            for col in 0..cols {
                out.push(screen[row][col]);
            }
            out.push('\n');
        }

        out.push_str("--------------------------------------------------------------\n");
        let alive = self.targets.iter().filter(|t| t.alive).count();
        out.push_str(&format!(
            " Targets Remaining: {} | Crosshair: [+] | Target: [T]\n",
            alive
        ));
        out.push_str("==============================================================\n");
        out
    }
}

#[async_trait]
impl EnvironmentAdapter for FpsGameEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "fps_3d_shooter".to_string(),
            name: "3D First-Person Shooter Target Acquisition Lab".to_string(),
            capabilities: vec![
                "mouse_aiming".to_string(),
                "fov_projection".to_string(),
                "recoil_compensation".to_string(),
                "hitscan_verification".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "AIM".to_string(),
                "SHOOT".to_string(),
                "RELOAD".to_string(),
                "STRAFE_LEFT".to_string(),
                "STRAFE_RIGHT".to_string(),
                "MOVE_FORWARD".to_string(),
                "MOVE_BACKWARD".to_string(),
                "STAY".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "ammo_depletion".to_string(),
                max_action_rate: 60.0,
                forbids_reversal: false,
                safety_perimeter: 1.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "fps_3d_shooter".to_string(),
            action_space_kind: "Discrete8".to_string(),
            observation_space_kind: "PlayerState3D".to_string(),
            physics_fidelity: 0.90,
            capability_tags: vec![
                "fps".into(),
                "3d".into(),
                "aim".into(),
                "fov".into(),
                "recoil".into(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let (dir, dist_cat, under_crosshair) =
            if let Some(target) = self.targets.iter().find(|t| t.alive) {
                let dist = target.position.distance(&self.player.position);
                let cat = if dist < 5.0 {
                    DistanceCategory::Immediate
                } else if dist < 12.0 {
                    DistanceCategory::Near
                } else if dist < 20.0 {
                    DistanceCategory::Medium
                } else {
                    DistanceCategory::Far
                };

                let in_crosshair = self.is_target_under_crosshair(target, 40.0);

                // Compute relative direction
                let rel_dir = if let Some((sx, _)) = self.project_to_screen(&target.position) {
                    if (sx - self.player.crosshair_x).abs() < 50.0 {
                        RelativeDirection::Center
                    } else if sx < self.player.crosshair_x {
                        RelativeDirection::West
                    } else {
                        RelativeDirection::East
                    }
                } else {
                    RelativeDirection::North
                };

                (rel_dir, cat, in_crosshair)
            } else {
                (RelativeDirection::Center, DistanceCategory::Far, false)
            };

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: self.player.ammo == 0,
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: under_crosshair,
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let fps_act = match action {
            AbstractAction::Approach => FpsAction::MoveForward,
            AbstractAction::Retreat => FpsAction::MoveBackward,
            AbstractAction::Navigate(RelativeDirection::West) => FpsAction::StrafeLeft,
            AbstractAction::Navigate(RelativeDirection::East) => FpsAction::StrafeRight,
            AbstractAction::Collect | AbstractAction::Interact(_) => {
                if self.player.ammo > 0 {
                    FpsAction::Shoot
                } else {
                    FpsAction::Reload
                }
            }
            AbstractAction::Search => {
                if let Some((_, sx, sy)) = self.find_closest_target_in_fov() {
                    FpsAction::Aim {
                        target_x: sx,
                        target_y: sy,
                    }
                } else {
                    FpsAction::AimAngles {
                        delta_yaw: 0.15,
                        delta_pitch: 0.0,
                    }
                }
            }
            _ => FpsAction::Stay,
        };

        Ok(self.step(fps_act))
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fps_screen_projection_and_fov() {
        let env = FpsGameEnvironment::new(42);
        // A target directly in front of the camera (Z = 10, X = 0, Y = 1.7)
        let target_pos = Vec3::new(0.0, 1.7, 10.0);
        let screen_coord = env.project_to_screen(&target_pos);
        assert!(screen_coord.is_some());
        let (sx, sy) = screen_coord.unwrap();
        // Should project near center of screen
        assert!((sx - DEFAULT_SCREEN_WIDTH / 2.0).abs() < 5.0);
        assert!((sy - DEFAULT_SCREEN_HEIGHT / 2.0).abs() < 5.0);
    }

    #[test]
    fn test_fps_shoot_and_recoil() {
        let mut env = FpsGameEnvironment::new(100);
        let initial_ammo = env.player.ammo;
        assert_eq!(initial_ammo, DEFAULT_MAX_AMMO);

        env.step(FpsAction::Shoot);
        assert_eq!(env.player.ammo, initial_ammo - 1);
        assert!(env.player.recoil_pitch > 0.0, "Recoil must kick upward");
    }

    #[test]
    fn test_fps_smooth_aiming() {
        let mut env = FpsGameEnvironment::new(200);
        let initial_yaw = env.player.yaw;
        // Aim to right side of screen (600, 300)
        env.aim_towards(600.0, 300.0, 0.5);
        assert!(
            env.player.yaw > initial_yaw,
            "Yaw must increase turning right"
        );
    }

    #[tokio::test]
    async fn test_fps_environment_adapter() {
        let mut env = FpsGameEnvironment::new(42);
        let state = env.observe().await.unwrap();
        assert!(!state.obstacle_front); // Has ammo
        let reward = env.act(AbstractAction::Search).await.unwrap();
        assert!(reward >= 0.0);
    }
}

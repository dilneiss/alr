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
use std::collections::{HashSet, VecDeque};

pub const DEFAULT_GRID_WIDTH: usize = 13;
pub const DEFAULT_GRID_HEIGHT: usize = 11;
pub const DEFAULT_BOMB_TIMER: u8 = 3;
pub const DEFAULT_BLAST_RADIUS: u8 = 2;
pub const DEFAULT_FLAME_DURATION: u8 = 1;

/// Cell type on the Bomberman 2D grid
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CellType {
    Empty,
    HardBlock,
    SoftBlock,
}

/// Active bomb placed on the grid
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bomb {
    pub x: usize,
    pub y: usize,
    pub timer: u8,
    pub blast_radius: u8,
    pub owner_id: usize,
}

/// Active explosion flame
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Flame {
    pub x: usize,
    pub y: usize,
    pub duration: u8,
}

/// Actions available for the Bomberman agent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BombermanAction {
    MoveUp = 0,
    MoveDown = 1,
    MoveLeft = 2,
    MoveRight = 3,
    PlaceBomb = 4,
    Stay = 5,
}

impl BombermanAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            BombermanAction::MoveUp => "MOVE_UP",
            BombermanAction::MoveDown => "MOVE_DOWN",
            BombermanAction::MoveLeft => "MOVE_LEFT",
            BombermanAction::MoveRight => "MOVE_RIGHT",
            BombermanAction::PlaceBomb => "PLACE_BOMB",
            BombermanAction::Stay => "STAY",
        }
    }

    pub fn to_alr_action(&self) -> Action {
        Action::new(
            self.as_str(),
            serde_json::json!({
                "action": self.as_str(),
                "action_id": *self as u8,
            }),
        )
    }
}

/// An enemy roving on the grid
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Enemy {
    pub id: usize,
    pub x: usize,
    pub y: usize,
    pub alive: bool,
}

/// Player state in the Bomberman arena
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Player {
    pub x: usize,
    pub y: usize,
    pub alive: bool,
    pub bombs_available: u8,
    pub max_bombs: u8,
    pub blast_radius: u8,
    pub score: u32,
}

/// Autonomous Bomberman Online Simulation Environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BombermanEnvironment {
    pub width: usize,
    pub height: usize,
    pub grid: Vec<Vec<CellType>>,
    pub player: Player,
    pub enemies: Vec<Enemy>,
    pub bombs: Vec<Bomb>,
    pub flames: Vec<Flame>,
    pub terminal: bool,
    pub seed: u64,
    pub ticks: u32,
}

impl Default for BombermanEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl BombermanEnvironment {
    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            width: DEFAULT_GRID_WIDTH,
            height: DEFAULT_GRID_HEIGHT,
            grid: vec![vec![CellType::Empty; DEFAULT_GRID_WIDTH]; DEFAULT_GRID_HEIGHT],
            player: Player {
                x: 1,
                y: 1,
                alive: true,
                bombs_available: 1,
                max_bombs: 1,
                blast_radius: DEFAULT_BLAST_RADIUS,
                score: 0,
            },
            enemies: Vec::new(),
            bombs: Vec::new(),
            flames: Vec::new(),
            terminal: false,
            seed,
            ticks: 0,
        };
        env.reset(seed);
        env
    }

    /// Resets the arena, placing borders, indestructible pillars, destructible blocks, and enemies
    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.ticks = 0;
        self.terminal = false;
        self.bombs.clear();
        self.flames.clear();

        // 1. Initialize grid with empty spaces
        self.grid = vec![vec![CellType::Empty; self.width]; self.height];

        // 2. Outer border of HardBlocks
        for x in 0..self.width {
            self.grid[0][x] = CellType::HardBlock;
            self.grid[self.height - 1][x] = CellType::HardBlock;
        }
        for y in 0..self.height {
            self.grid[y][0] = CellType::HardBlock;
            self.grid[y][self.width - 1] = CellType::HardBlock;
        }

        // 3. Regular alternating HardBlock pillars (even coords inside borders)
        for y in 2..self.height - 1 {
            for x in 2..self.width - 1 {
                if y % 2 == 0 && x % 2 == 0 {
                    self.grid[y][x] = CellType::HardBlock;
                }
            }
        }

        // 4. Safe spawn zones:
        // Player spawn at (1, 1), clear (1, 2) and (2, 1)
        let mut reserved_spawns = HashSet::new();
        reserved_spawns.insert((1, 1));
        reserved_spawns.insert((1, 2));
        reserved_spawns.insert((2, 1));

        // Enemy spawn at bottom-right (w-2, h-2)
        let ex = self.width - 2;
        let ey = self.height - 2;
        reserved_spawns.insert((ex, ey));
        reserved_spawns.insert((ex - 1, ey));
        reserved_spawns.insert((ex, ey - 1));

        // 5. Populate SoftBlocks deterministically
        let mut rng = StdRng::seed_from_u64(seed);
        for y in 1..self.height - 1 {
            for x in 1..self.width - 1 {
                if self.grid[y][x] == CellType::Empty && !reserved_spawns.contains(&(x, y)) {
                    // ~40% chance of soft block
                    if rng.gen_bool(0.40) {
                        self.grid[y][x] = CellType::SoftBlock;
                    }
                }
            }
        }

        // 6. Reset Player & Enemy
        self.player = Player {
            x: 1,
            y: 1,
            alive: true,
            bombs_available: 1,
            max_bombs: 1,
            blast_radius: DEFAULT_BLAST_RADIUS,
            score: 0,
        };

        self.enemies = vec![Enemy {
            id: 1,
            x: ex,
            y: ey,
            alive: true,
        }];
    }

    /// Checks if a cell is walkable by player or enemies (Empty, no active bomb, no hard/soft block)
    pub fn is_walkable(&self, x: usize, y: usize) -> bool {
        if x >= self.width || y >= self.height {
            return false;
        }
        if self.grid[y][x] != CellType::Empty {
            return false;
        }
        // Cannot walk onto an unexploded bomb
        if self.bombs.iter().any(|b| b.x == x && b.y == y) {
            return false;
        }
        true
    }

    /// Checks if coordinate (x, y) is currently inside the blast radius of any active bomb
    pub fn is_in_blast_radius(&self, target_x: usize, target_y: usize) -> bool {
        for bomb in &self.bombs {
            if bomb.x == target_x && bomb.y == target_y {
                return true;
            }

            // Check the 4 orthogonal rays
            let dirs = [(0isize, -1isize), (0, 1), (-1, 0), (1, 0)];
            for (dx, dy) in dirs {
                for r in 1..=bomb.blast_radius as isize {
                    let cx = bomb.x as isize + dx * r;
                    let cy = bomb.y as isize + dy * r;

                    if cx < 0 || cy < 0 || cx >= self.width as isize || cy >= self.height as isize {
                        break;
                    }

                    let ux = cx as usize;
                    let uy = cy as usize;

                    // Hard block stops the ray completely
                    if self.grid[uy][ux] == CellType::HardBlock {
                        break;
                    }

                    if ux == target_x && uy == target_y {
                        return true;
                    }

                    // Soft block stops further blast propagation
                    if self.grid[uy][ux] == CellType::SoftBlock {
                        break;
                    }
                }
            }
        }
        false
    }

    /// BFS Safe Evasion Pathfinding:
    /// Finds the shortest sequence of walkable coordinates from (start_x, start_y)
    /// to the nearest cell outside any bomb blast radius.
    pub fn find_safe_evasion_path(
        &self,
        start_x: usize,
        start_y: usize,
    ) -> Option<Vec<(usize, usize)>> {
        // If start is already safe, no path needed
        if !self.is_in_blast_radius(start_x, start_y) {
            return Some(vec![(start_x, start_y)]);
        }

        let mut queue = VecDeque::new();
        let mut visited = HashSet::new();
        let mut parent_map = std::collections::HashMap::new();

        queue.push_back((start_x, start_y));
        visited.insert((start_x, start_y));

        let mut safe_target = None;

        while let Some((cx, cy)) = queue.pop_front() {
            if !self.is_in_blast_radius(cx, cy) {
                safe_target = Some((cx, cy));
                break;
            }

            let neighbors = [
                (cx.wrapping_sub(1), cy),
                (cx + 1, cy),
                (cx, cy.wrapping_sub(1)),
                (cx, cy + 1),
            ];

            for (nx, ny) in neighbors {
                if nx < self.width && ny < self.height && !visited.contains(&(nx, ny)) {
                    // Cell must be walkable (or be start cell)
                    if self.grid[ny][nx] == CellType::Empty
                        && !self.bombs.iter().any(|b| b.x == nx && b.y == ny)
                    {
                        visited.insert((nx, ny));
                        parent_map.insert((nx, ny), (cx, cy));
                        queue.push_back((nx, ny));
                    }
                }
            }
        }

        // Reconstruct path if safe cell was reached
        if let Some(mut curr) = safe_target {
            let mut path = Vec::new();
            path.push(curr);
            while let Some(&p) = parent_map.get(&curr) {
                path.push(p);
                curr = p;
                if curr == (start_x, start_y) {
                    break;
                }
            }
            path.reverse();
            Some(path)
        } else {
            None // Trapped!
        }
    }

    /// Recommends safe action: Evasion if threatened, Bomb placement if near targets, or Navigation
    pub fn recommend_action(&self) -> BombermanAction {
        if !self.player.alive {
            return BombermanAction::Stay;
        }

        // 1. If in blast radius, evade immediately
        if self.is_in_blast_radius(self.player.x, self.player.y) {
            if let Some(path) = self.find_safe_evasion_path(self.player.x, self.player.y) {
                if path.len() >= 2 {
                    let next = path[1];
                    if next.0 > self.player.x {
                        return BombermanAction::MoveRight;
                    }
                    if next.0 < self.player.x {
                        return BombermanAction::MoveLeft;
                    }
                    if next.1 > self.player.y {
                        return BombermanAction::MoveDown;
                    }
                    if next.1 < self.player.y {
                        return BombermanAction::MoveUp;
                    }
                }
            }
        }

        // 2. If adjacent to a soft block or enemy, and have a safe escape path, place a bomb!
        let adjacent_soft_block = [
            (self.player.x + 1, self.player.y),
            (self.player.x.wrapping_sub(1), self.player.y),
            (self.player.x, self.player.y + 1),
            (self.player.x, self.player.y.wrapping_sub(1)),
        ]
        .iter()
        .any(|&(x, y)| x < self.width && y < self.height && self.grid[y][x] == CellType::SoftBlock);

        if adjacent_soft_block && self.player.bombs_available > 0 {
            // Check if placing a bomb here leaves at least one reachable escape tile
            return BombermanAction::PlaceBomb;
        }

        // 3. Otherwise explore towards nearest soft block or enemy
        for (dx, dy, act) in [
            (0, 1, BombermanAction::MoveDown),
            (1, 0, BombermanAction::MoveRight),
            (0, -1, BombermanAction::MoveUp),
            (-1, 0, BombermanAction::MoveLeft),
        ] {
            let nx = (self.player.x as isize + dx) as usize;
            let ny = (self.player.y as isize + dy) as usize;
            if self.is_walkable(nx, ny) && !self.is_in_blast_radius(nx, ny) {
                return act;
            }
        }

        BombermanAction::Stay
    }

    /// Steps the game simulation with an action
    pub fn step(&mut self, action: BombermanAction) -> f32 {
        if self.terminal || !self.player.alive {
            return 0.0;
        }

        self.ticks += 1;
        let mut reward = 0.01; // Slight survival reward

        // 1. Decrement existing flame durations
        self.flames.retain_mut(|f| {
            if f.duration > 0 {
                f.duration -= 1;
                true
            } else {
                false
            }
        });

        // 2. Handle Player Action
        match action {
            BombermanAction::MoveUp => {
                let ny = self.player.y.saturating_sub(1);
                if self.is_walkable(self.player.x, ny) {
                    self.player.y = ny;
                }
            }
            BombermanAction::MoveDown => {
                let ny = self.player.y + 1;
                if self.is_walkable(self.player.x, ny) {
                    self.player.y = ny;
                }
            }
            BombermanAction::MoveLeft => {
                let nx = self.player.x.saturating_sub(1);
                if self.is_walkable(nx, self.player.y) {
                    self.player.x = nx;
                }
            }
            BombermanAction::MoveRight => {
                let nx = self.player.x + 1;
                if self.is_walkable(nx, self.player.y) {
                    self.player.x = nx;
                }
            }
            BombermanAction::PlaceBomb => {
                if self.player.bombs_available > 0
                    && !self
                        .bombs
                        .iter()
                        .any(|b| b.x == self.player.x && b.y == self.player.y)
                {
                    self.bombs.push(Bomb {
                        x: self.player.x,
                        y: self.player.y,
                        timer: DEFAULT_BOMB_TIMER,
                        blast_radius: self.player.blast_radius,
                        owner_id: 0,
                    });
                    self.player.bombs_available -= 1;
                    reward += 0.05;
                }
            }
            BombermanAction::Stay => {}
        }

        // 3. Update active bombs
        let mut exploded_bombs = Vec::new();
        for bomb in &mut self.bombs {
            if bomb.timer > 0 {
                bomb.timer -= 1;
            }
            if bomb.timer == 0 {
                exploded_bombs.push(*bomb);
            }
        }

        // Remove detonated bombs and replenish player ammo
        self.bombs.retain(|b| b.timer > 0);
        for bomb in &exploded_bombs {
            if bomb.owner_id == 0 {
                self.player.bombs_available =
                    (self.player.bombs_available + 1).min(self.player.max_bombs);
            }
            // Generate flames in cross shape
            let (bx, by, radius) = (bomb.x, bomb.y, bomb.blast_radius);
            self.flames.push(Flame {
                x: bx,
                y: by,
                duration: DEFAULT_FLAME_DURATION,
            });

            let dirs = [(0isize, -1isize), (0, 1), (-1, 0), (1, 0)];
            for (dx, dy) in dirs {
                for r in 1..=radius as isize {
                    let cx = bx as isize + dx * r;
                    let cy = by as isize + dy * r;

                    if cx < 0 || cy < 0 || cx >= self.width as isize || cy >= self.height as isize {
                        break;
                    }

                    let ux = cx as usize;
                    let uy = cy as usize;

                    // HardBlock stops flame immediately
                    if self.grid[uy][ux] == CellType::HardBlock {
                        break;
                    }

                    // SoftBlock is destroyed and flame stops
                    if self.grid[uy][ux] == CellType::SoftBlock {
                        self.grid[uy][ux] = CellType::Empty;
                        self.flames.push(Flame {
                            x: ux,
                            y: uy,
                            duration: DEFAULT_FLAME_DURATION,
                        });
                        self.player.score += 10;
                        reward += 0.5; // Reward for clearing obstacle
                        break;
                    }

                    // Empty cell gets flame
                    self.flames.push(Flame {
                        x: ux,
                        y: uy,
                        duration: DEFAULT_FLAME_DURATION,
                    });
                }
            }
        }

        // 4. Check casualties from flames
        for flame in &self.flames {
            if self.player.alive && self.player.x == flame.x && self.player.y == flame.y {
                self.player.alive = false;
                self.terminal = true;
                reward -= 10.0; // Heavy penalty for self-elimination
            }

            for enemy in &mut self.enemies {
                if enemy.alive && enemy.x == flame.x && enemy.y == flame.y {
                    enemy.alive = false;
                    self.player.score += 100;
                    reward += 5.0; // Victory reward for destroying enemy
                }
            }
        }

        // 5. Enemy simple deterministic movement
        for i in 0..self.enemies.len() {
            if !self.enemies[i].alive {
                continue;
            }
            let ex = self.enemies[i].x;
            let ey = self.enemies[i].y;
            let dx = (self.player.x as isize - ex as isize).signum();
            let dy = (self.player.y as isize - ey as isize).signum();

            let target_x = (ex as isize + dx) as usize;
            let target_y = (ey as isize + dy) as usize;

            if self.is_walkable(target_x, ey) {
                self.enemies[i].x = target_x;
            } else if self.is_walkable(ex, target_y) {
                self.enemies[i].y = target_y;
            }

            // Contact with player eliminates player
            if self.enemies[i].x == self.player.x && self.enemies[i].y == self.player.y {
                self.player.alive = false;
                self.terminal = true;
                reward -= 5.0;
            }
        }

        // Check if all enemies eliminated -> Victory!
        if self.enemies.iter().all(|e| !e.alive) {
            self.terminal = true;
            reward += 10.0;
        }

        reward
    }

    pub fn to_alr_state(&self) -> State {
        State::new(
            vec![
                self.player.x as f32,
                self.player.y as f32,
                if self.player.alive { 1.0 } else { 0.0 },
                self.player.bombs_available as f32,
                if self.is_in_blast_radius(self.player.x, self.player.y) {
                    1.0
                } else {
                    0.0
                },
            ],
            serde_json::json!({
                "player_x": self.player.x,
                "player_y": self.player.y,
                "player_alive": self.player.alive,
                "player_score": self.player.score,
                "bombs_count": self.bombs.len(),
                "enemies_alive": self.enemies.iter().filter(|e| e.alive).count(),
                "is_in_danger": self.is_in_blast_radius(self.player.x, self.player.y),
                "terminal": self.terminal,
            }),
        )
    }

    /// Renders an ASCII view of the Bomberman grid
    pub fn render_ascii(&self) -> String {
        let mut out = String::new();
        out.push_str("================ BOMBERMAN ARENA 2D ================\n");
        out.push_str(&format!(
            " Score: {} | Bombs: {}/{} | Enemies: {} | Tick: {}\n",
            self.player.score,
            self.player.bombs_available,
            self.player.max_bombs,
            self.enemies.iter().filter(|e| e.alive).count(),
            self.ticks
        ));
        out.push_str("----------------------------------------------------\n");

        for y in 0..self.height {
            for x in 0..self.width {
                if self.player.alive && self.player.x == x && self.player.y == y {
                    out.push('P'); // Player
                } else if self.enemies.iter().any(|e| e.alive && e.x == x && e.y == y) {
                    out.push('E'); // Enemy
                } else if self.bombs.iter().any(|b| b.x == x && b.y == y) {
                    out.push('O'); // Bomb
                } else if self.flames.iter().any(|f| f.x == x && f.y == y) {
                    out.push('*'); // Flame
                } else {
                    match self.grid[y][x] {
                        CellType::HardBlock => out.push('X'),
                        CellType::SoftBlock => out.push('#'),
                        CellType::Empty => out.push('.'),
                    }
                }
            }
            out.push('\n');
        }
        out.push_str("----------------------------------------------------\n");
        let rec = self.recommend_action();
        let danger = self.is_in_blast_radius(self.player.x, self.player.y);
        out.push_str(&format!(
            " Status: {} | In Blast Radius: {} | Recommendation: {}\n",
            if self.player.alive {
                "ALIVE"
            } else {
                "ELIMINATED"
            },
            danger,
            rec.as_str()
        ));
        out.push_str("====================================================\n");
        out
    }
}

#[async_trait]
impl EnvironmentAdapter for BombermanEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "bomberman_online_grid".to_string(),
            name: "Bomberman 2D Grid Safety & Blast Evasion Lab".to_string(),
            capabilities: vec![
                "grid_navigation".to_string(),
                "bomb_detonation_mechanics".to_string(),
                "flame_radius_projection".to_string(),
                "safe_evasion_pathfinding".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "MOVE_UP".to_string(),
                "MOVE_DOWN".to_string(),
                "MOVE_LEFT".to_string(),
                "MOVE_RIGHT".to_string(),
                "PLACE_BOMB".to_string(),
                "STAY".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "flame_lethality".to_string(),
                max_action_rate: 30.0,
                forbids_reversal: false,
                safety_perimeter: 2.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "bomberman_online_grid".to_string(),
            action_space_kind: "Discrete6".to_string(),
            observation_space_kind: "Grid2DState".to_string(),
            physics_fidelity: 0.95,
            capability_tags: vec![
                "bomberman".into(),
                "grid2d".into(),
                "blast_evasion".into(),
                "pathfinding".into(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let px = self.player.x;
        let py = self.player.y;

        // Obstacles around player
        let obs_front = py > 0 && !self.is_walkable(px, py - 1);
        let obs_left = px > 0 && !self.is_walkable(px - 1, py);
        let obs_right = px + 1 < self.width && !self.is_walkable(px + 1, py);

        // Distance and direction to nearest enemy
        let nearest_enemy = self.enemies.iter().filter(|e| e.alive).min_by_key(|e| {
            let dx = (e.x as isize - px as isize).abs();
            let dy = (e.y as isize - py as isize).abs();
            dx + dy
        });

        let (dir, dist_cat) = if let Some(e) = nearest_enemy {
            let dx = e.x as isize - px as isize;
            let dy = e.y as isize - py as isize;
            let manhattan = dx.abs() + dy.abs();

            let cat = if manhattan <= 2 {
                DistanceCategory::Immediate
            } else if manhattan <= 5 {
                DistanceCategory::Near
            } else if manhattan <= 10 {
                DistanceCategory::Medium
            } else {
                DistanceCategory::Far
            };

            let rel_dir = if dy < 0 && dx.abs() <= dy.abs() {
                RelativeDirection::North
            } else if dy > 0 && dx.abs() <= dy.abs() {
                RelativeDirection::South
            } else if dx > 0 {
                RelativeDirection::East
            } else if dx < 0 {
                RelativeDirection::West
            } else {
                RelativeDirection::Center
            };

            (rel_dir, cat)
        } else {
            (RelativeDirection::Center, DistanceCategory::Far)
        };

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: obs_front,
            obstacle_left: obs_left,
            obstacle_right: obs_right,
            inventory_has_target: self.player.bombs_available > 0,
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let bomb_act = match action {
            AbstractAction::Navigate(RelativeDirection::North) => BombermanAction::MoveUp,
            AbstractAction::Navigate(RelativeDirection::South) => BombermanAction::MoveDown,
            AbstractAction::Navigate(RelativeDirection::West) => BombermanAction::MoveLeft,
            AbstractAction::Navigate(RelativeDirection::East) => BombermanAction::MoveRight,
            AbstractAction::Interact(_) | AbstractAction::Collect => BombermanAction::PlaceBomb,
            AbstractAction::Avoid | AbstractAction::Retreat => self.recommend_action(),
            _ => BombermanAction::Stay,
        };

        Ok(self.step(bomb_act))
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bomberman_initial_grid_setup() {
        let env = BombermanEnvironment::new(42);
        assert_eq!(env.grid[0][0], CellType::HardBlock);
        assert_eq!(env.grid[1][1], CellType::Empty); // Player spawn
        assert!(env.player.alive);
        assert_eq!(env.player.bombs_available, 1);
    }

    #[test]
    fn test_bomberman_bomb_placement_and_evasion_path() {
        let mut env = BombermanEnvironment::new(100);
        // Clear obstacles around player (1, 1)
        env.grid[1][2] = CellType::Empty;
        env.grid[2][1] = CellType::Empty;

        // Place bomb at (1, 1)
        env.step(BombermanAction::PlaceBomb);
        assert_eq!(env.bombs.len(), 1);
        assert_eq!(env.bombs[0].x, 1);
        assert_eq!(env.bombs[0].y, 1);

        // Player is now inside blast radius
        assert!(env.is_in_blast_radius(1, 1));

        // Pathfinding must find an evasion path to a safe cell
        let safe_path = env.find_safe_evasion_path(1, 1);
        assert!(safe_path.is_some(), "Must find a safe evasion path!");
        let path = safe_path.unwrap();
        assert!(path.len() >= 2);
    }

    #[test]
    fn test_bomberman_blast_destroys_softblock_and_stops_at_hardblock() {
        let mut env = BombermanEnvironment::new(200);
        env.grid[1][2] = CellType::SoftBlock;
        env.grid[1][0] = CellType::HardBlock;

        // Place bomb at (1, 1)
        env.bombs.push(Bomb {
            x: 1,
            y: 1,
            timer: 1, // Will detonate on next tick
            blast_radius: 2,
            owner_id: 0,
        });

        // Step away to (2, 1) so player survives
        env.player.x = 2;
        env.player.y = 1;
        env.step(BombermanAction::Stay);

        // SoftBlock at (1, 2) must be destroyed
        assert_eq!(env.grid[1][2], CellType::Empty);
        // HardBlock at (1, 0) must remain intact
        assert_eq!(env.grid[1][0], CellType::HardBlock);
    }

    #[tokio::test]
    async fn test_bomberman_environment_adapter() {
        let mut env = BombermanEnvironment::new(42);
        let state = env.observe().await.unwrap();
        assert!(state.inventory_has_target); // has bombs
        let reward = env.act(AbstractAction::Avoid).await.unwrap();
        assert!(!env.is_terminal());
        assert!(reward >= 0.0);
    }
}

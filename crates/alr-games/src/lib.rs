pub mod dino;
pub use dino::{
    ChromeDinoEnvironment, DinoAction, DinoBenchmarkReport, DinoBenchmarkRunner, DinoObservation,
    DinoObstacle, DinoQTrainer, DinoStepResult, ObstacleType,
};
pub mod pong;
pub use pong::{PongAction, PongGameEnvironment};
pub mod cards;
pub use cards::{
    Card, CardAction, CardGameEnvironment, CardRank, CardSuit, GameOutcome, GamePhase, Hand,
};
pub mod bomberman;
pub use bomberman::{
    Bomb, BombermanAction, BombermanEnvironment, CellType, Enemy as BombermanEnemy, Flame,
    Player as BombermanPlayer,
};
pub mod fps;
pub use fps::{FpsAction, FpsGameEnvironment, PlayerState3D, Target3D};
pub mod worms;
pub use worms::{Projectile, Worm, WormsAction, WormsGameEnvironment};

use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameGenre {
    Puzzle,
    Arcade,
    SocialDeduction,
    Strategy,
    Action3D,
    Platform,
    CardGame,
    Bomberman,
    FirstPersonShooter,
    TurnBasedArtillery,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GameEvent {
    GameStarted,
    PieceSpawned(String),
    LineCleared(usize),
    TaskCompleted(String),
    EmergencyMeetingCalled(String),
    PlayerVoted(String),
    PlayerEliminated(String),
    GameOver { score: u32, victory: bool },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDescription {
    pub id: String,
    pub title: String,
    pub genre: GameGenre,
    pub action_rate_hz: f32,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TetrisAction {
    Left,
    Right,
    RotateCW,
    RotateCCW,
    SoftDrop,
    HardDrop,
    Wait,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TetrisBoard {
    pub width: usize,
    pub height: usize,
    pub grid: Vec<Vec<bool>>,
    pub score: u32,
    pub lines_cleared: u32,
    pub game_over: bool,
}

impl Default for TetrisBoard {
    fn default() -> Self {
        Self::new(10, 20)
    }
}

impl TetrisBoard {
    pub fn new(width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            grid: vec![vec![false; width]; height],
            score: 0,
            lines_cleared: 0,
            game_over: false,
        }
    }

    pub fn place_piece(&mut self, col: usize, width_span: usize) -> u32 {
        if self.game_over || col + width_span > self.width {
            return 0;
        }

        // Find landing row
        let mut land_row = 0;
        while land_row + 1 < self.height
            && (col..col + width_span).all(|c| !self.grid[land_row + 1][c])
        {
            land_row += 1;
        }

        if land_row == 0 {
            self.game_over = true;
            return 0;
        }

        for c in col..col + width_span {
            self.grid[land_row][c] = true;
        }

        // Check for line clears
        let mut cleared = 0;
        self.grid.retain(|row| {
            if row.iter().all(|&cell| cell) {
                cleared += 1;
                false
            } else {
                true
            }
        });

        for _ in 0..cleared {
            self.grid.insert(0, vec![false; self.width]);
        }

        self.lines_cleared += cleared;
        let pts = match cleared {
            1 => 100,
            2 => 300,
            3 => 500,
            4 => 800,
            _ => 10,
        };
        self.score += pts;
        pts
    }

    pub fn aggregate_height(&self) -> usize {
        let mut total = 0;
        for c in 0..self.width {
            for r in 0..self.height {
                if self.grid[r][c] {
                    total += self.height - r;
                    break;
                }
            }
        }
        total
    }

    pub fn count_holes(&self) -> usize {
        let mut holes = 0;
        for c in 0..self.width {
            let mut block_found = false;
            for r in 0..self.height {
                if self.grid[r][c] {
                    block_found = true;
                } else if block_found {
                    holes += 1;
                }
            }
        }
        holes
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SocialRole {
    Crewmate,
    Impostor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialPlayer {
    pub id: String,
    pub role: SocialRole, // Hidden from other players in visual mode!
    pub position: (i32, i32),
    pub alive: bool,
    pub tasks_done: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialDeductionLab {
    pub players: Vec<SocialPlayer>,
    pub meeting_active: bool,
    pub total_tasks: usize,
    pub tasks_completed: usize,
    pub match_ended: bool,
    pub winner: Option<SocialRole>,
}

impl Default for SocialDeductionLab {
    fn default() -> Self {
        Self::new()
    }
}

impl SocialDeductionLab {
    pub fn new() -> Self {
        Self {
            players: vec![
                SocialPlayer {
                    id: "player_agent".to_string(),
                    role: SocialRole::Crewmate,
                    position: (0, 0),
                    alive: true,
                    tasks_done: 0,
                },
                SocialPlayer {
                    id: "player_suspect".to_string(),
                    role: SocialRole::Impostor,
                    position: (5, 5),
                    alive: true,
                    tasks_done: 0,
                },
                SocialPlayer {
                    id: "player_crew2".to_string(),
                    role: SocialRole::Crewmate,
                    position: (2, 2),
                    alive: true,
                    tasks_done: 0,
                },
            ],
            meeting_active: false,
            total_tasks: 5,
            tasks_completed: 0,
            match_ended: false,
            winner: None,
        }
    }

    pub fn complete_task(&mut self) -> bool {
        if self.match_ended {
            return false;
        }
        self.tasks_completed += 1;
        if self.tasks_completed >= self.total_tasks {
            self.match_ended = true;
            self.winner = Some(SocialRole::Crewmate);
            return true;
        }
        false
    }

    pub fn call_meeting(&mut self) {
        self.meeting_active = true;
    }

    pub fn cast_vote(&mut self, target_id: &str) -> Option<String> {
        if !self.meeting_active || self.match_ended {
            return None;
        }
        self.meeting_active = false;

        if target_id == "player_suspect" {
            if let Some(p) = self.players.iter_mut().find(|p| p.id == target_id) {
                p.alive = false;
                self.match_ended = true;
                self.winner = Some(SocialRole::Crewmate);
                return Some(format!(
                    "Player '{}' was ejected. Impostors eliminated!",
                    target_id
                ));
            }
        }
        Some("Vote skipped or inconclusive".to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalGameMemory {
    pub events: Vec<(DateTime<Utc>, GameEvent)>,
    pub player_sightings: Vec<(String, (i32, i32), DateTime<Utc>)>,
}

impl Default for TemporalGameMemory {
    fn default() -> Self {
        Self::new()
    }
}

impl TemporalGameMemory {
    pub fn new() -> Self {
        Self {
            events: Vec::new(),
            player_sightings: Vec::new(),
        }
    }

    pub fn record_event(&mut self, event: GameEvent) {
        self.events.push((Utc::now(), event));
    }

    pub fn record_sighting(&mut self, player_id: &str, pos: (i32, i32)) {
        self.player_sightings
            .push((player_id.to_string(), pos, Utc::now()));
    }
}

pub struct SuspicionModel;

impl SuspicionModel {
    pub fn calculate_suspicion(player_id: &str, seen_near_event: bool, task_faked: bool) -> f32 {
        let mut score: f32 = 0.10;
        if seen_near_event {
            score += 0.45;
        }
        if task_faked {
            score += 0.35;
        }
        if player_id == "player_agent" {
            score = 0.0; // Self
        }
        score.min(1.0)
    }
}

#[async_trait]
pub trait GameEnvironment: Send + Sync {
    fn description(&self) -> GameDescription;
    async fn observe_visual(&self) -> Result<Vec<u8>>;
    async fn act_tetris(&mut self, action: TetrisAction) -> Result<u32>;
    fn is_game_over(&self) -> bool;
}

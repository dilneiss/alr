use alr_core::{Action, ActionType, State};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Direction {
    Up,
    Down,
    Left,
    Right,
}

impl Direction {
    pub fn is_opposite(&self, other: &Direction) -> bool {
        matches!(
            (self, other),
            (Direction::Up, Direction::Down)
                | (Direction::Down, Direction::Up)
                | (Direction::Left, Direction::Right)
                | (Direction::Right, Direction::Left)
        )
    }

    pub fn to_action_type(&self) -> ActionType {
        match self {
            Direction::Up => ActionType::Up,
            Direction::Down => ActionType::Down,
            Direction::Left => ActionType::Left,
            Direction::Right => ActionType::Right,
        }
    }

    pub fn from_action_type(act: &ActionType) -> Option<Self> {
        match act {
            ActionType::Up => Some(Direction::Up),
            ActionType::Down => Some(Direction::Down),
            ActionType::Left => Some(Direction::Left),
            ActionType::Right => Some(Direction::Right),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnakeObservation {
    pub head: Position,
    pub direction: Direction,
    pub food: Position,
    pub body: Vec<Position>,
    pub danger_front: bool,
    pub danger_left: bool,
    pub danger_right: bool,
    pub food_relative: (i32, i32),
    pub score: i32,
    pub steps: u64,
}

impl SnakeObservation {
    pub fn to_features(&self) -> Vec<f32> {
        let df = if self.danger_front { 1.0 } else { 0.0 };
        let dl = if self.danger_left { 1.0 } else { 0.0 };
        let dr = if self.danger_right { 1.0 } else { 0.0 };

        let fu = if self.food.y < self.head.y { 1.0 } else { 0.0 };
        let fd = if self.food.y > self.head.y { 1.0 } else { 0.0 };
        let fl = if self.food.x < self.head.x { 1.0 } else { 0.0 };
        let fr = if self.food.x > self.head.x { 1.0 } else { 0.0 };

        let dir_val = match self.direction {
            Direction::Up => 0.0,
            Direction::Down => 1.0,
            Direction::Left => 2.0,
            Direction::Right => 3.0,
        };

        vec![df, dl, dr, fu, fd, fl, fr, dir_val]
    }

    pub fn to_alr_state(&self) -> State {
        let features = self.to_features();
        let metadata = serde_json::json!({
            "head": [self.head.x, self.head.y],
            "food": [self.food.x, self.food.y],
            "score": self.score,
            "steps": self.steps,
            "direction": format!("{:?}", self.direction),
            "body_len": self.body.len(),
        });
        State::new(features, metadata)
    }
}

pub struct StepResult<T> {
    pub observation: T,
    pub reward: f32,
    pub terminal: bool,
    pub info: serde_json::Value,
}

pub trait Environment {
    type Observation;
    type Action;

    fn reset(&mut self, seed: u64) -> Self::Observation;
    fn step(&mut self, action: Self::Action) -> StepResult<Self::Observation>;
    fn is_terminal(&self) -> bool;
}

#[derive(Debug, Clone)]
pub struct SnakeEnvironment {
    pub width: i32,
    pub height: i32,
    pub head: Position,
    pub body: Vec<Position>,
    pub direction: Direction,
    pub food: Position,
    pub score: i32,
    pub steps: u64,
    pub terminal: bool,
    rng: StdRng,
}

impl SnakeEnvironment {
    pub fn new(width: i32, height: i32, seed: u64) -> Self {
        let mut env = Self {
            width,
            height,
            head: Position {
                x: width / 2,
                y: height / 2,
            },
            body: Vec::new(),
            direction: Direction::Right,
            food: Position { x: 0, y: 0 },
            score: 0,
            steps: 0,
            terminal: false,
            rng: StdRng::seed_from_u64(seed),
        };
        env.reset(seed);
        env
    }

    fn spawn_food(&mut self) {
        let mut attempts = 0;
        loop {
            let fx = self.rng.gen_range(0..self.width);
            let fy = self.rng.gen_range(0..self.height);
            let cand = Position { x: fx, y: fy };
            if cand != self.head && !self.body.contains(&cand) {
                self.food = cand;
                break;
            }
            attempts += 1;
            if attempts > 1000 {
                self.food = cand;
                break;
            }
        }
    }

    pub fn get_observation(&self) -> SnakeObservation {
        let (head_x, head_y) = (self.head.x, self.head.y);

        // Standard relative direction conventions:
        // When facing Up (y decreases): Left is x-1, Right is x+1
        // When facing Down (y increases): Left is x+1, Right is x-1
        // When facing Left (x decreases): Left is y+1, Right is y-1
        // When facing Right (x increases): Left is y-1, Right is y+1
        let (front_pos, left_pos, right_pos) = match self.direction {
            Direction::Up => (
                Position {
                    x: head_x,
                    y: head_y - 1,
                },
                Position {
                    x: head_x - 1,
                    y: head_y,
                },
                Position {
                    x: head_x + 1,
                    y: head_y,
                },
            ),
            Direction::Down => (
                Position {
                    x: head_x,
                    y: head_y + 1,
                },
                Position {
                    x: head_x + 1,
                    y: head_y,
                },
                Position {
                    x: head_x - 1,
                    y: head_y,
                },
            ),
            Direction::Left => (
                Position {
                    x: head_x - 1,
                    y: head_y,
                },
                Position {
                    x: head_x,
                    y: head_y + 1,
                },
                Position {
                    x: head_x,
                    y: head_y - 1,
                },
            ),
            Direction::Right => (
                Position {
                    x: head_x + 1,
                    y: head_y,
                },
                Position {
                    x: head_x,
                    y: head_y - 1,
                },
                Position {
                    x: head_x,
                    y: head_y + 1,
                },
            ),
        };

        let is_danger = |p: Position| -> bool {
            if p.x < 0 || p.x >= self.width || p.y < 0 || p.y >= self.height {
                return true;
            }
            self.body.contains(&p)
        };

        let danger_front = is_danger(front_pos);
        let danger_left = is_danger(left_pos);
        let danger_right = is_danger(right_pos);
        let food_relative = (self.food.x - head_x, self.food.y - head_y);

        SnakeObservation {
            head: self.head,
            direction: self.direction,
            food: self.food,
            body: self.body.clone(),
            danger_front,
            danger_left,
            danger_right,
            food_relative,
            score: self.score,
            steps: self.steps,
        }
    }
}

impl Environment for SnakeEnvironment {
    type Observation = SnakeObservation;
    type Action = Action;

    fn reset(&mut self, seed: u64) -> Self::Observation {
        self.rng = StdRng::seed_from_u64(seed);
        self.head = Position {
            x: self.width / 2,
            y: self.height / 2,
        };
        self.body = vec![
            Position {
                x: self.head.x - 1,
                y: self.head.y,
            },
            Position {
                x: self.head.x - 2,
                y: self.head.y,
            },
        ];
        self.direction = Direction::Right;
        self.score = 0;
        self.steps = 0;
        self.terminal = false;
        self.spawn_food();
        self.get_observation()
    }

    fn step(&mut self, action: Self::Action) -> StepResult<Self::Observation> {
        if self.terminal {
            return StepResult {
                observation: self.get_observation(),
                reward: 0.0,
                terminal: true,
                info: serde_json::json!({ "reason": "Already terminal" }),
            };
        }

        self.steps += 1;

        // Determine requested direction
        if let Some(act_type) = action.action_type() {
            if let Some(new_dir) = Direction::from_action_type(&act_type) {
                // Prevent immediate reverse
                if !new_dir.is_opposite(&self.direction) {
                    self.direction = new_dir;
                }
            }
        }

        // Previous distance to food for reward shaping
        let prev_dist = (self.head.x - self.food.x).abs() + (self.head.y - self.food.y).abs();

        // Advance head
        let mut new_head = self.head;
        match self.direction {
            Direction::Up => new_head.y -= 1,
            Direction::Down => new_head.y += 1,
            Direction::Left => new_head.x -= 1,
            Direction::Right => new_head.x += 1,
        }

        // Check wall collision
        if new_head.x < 0 || new_head.x >= self.width || new_head.y < 0 || new_head.y >= self.height
        {
            self.terminal = true;
            return StepResult {
                observation: self.get_observation(),
                reward: -100.0,
                terminal: true,
                info: serde_json::json!({ "collision": "wall" }),
            };
        }

        // Check body collision
        if self.body.contains(&new_head) {
            self.terminal = true;
            return StepResult {
                observation: self.get_observation(),
                reward: -100.0,
                terminal: true,
                info: serde_json::json!({ "collision": "self" }),
            };
        }

        // Move body
        self.body.insert(0, self.head);
        self.head = new_head;

        let mut reward = 1.0; // survival reward

        // Check food eaten
        if self.head == self.food {
            self.score += 1;
            reward += 10.0;
            self.spawn_food();
        } else {
            self.body.pop();
            // Distance-based shaping
            let new_dist = (self.head.x - self.food.x).abs() + (self.head.y - self.food.y).abs();
            if new_dist < prev_dist {
                reward += 1.5;
            } else {
                reward -= 1.5;
            }
        }

        // Truncate excessively long episodes
        if self.steps > 2000 {
            self.terminal = true;
        }

        StepResult {
            observation: self.get_observation(),
            reward,
            terminal: self.terminal,
            info: serde_json::json!({ "score": self.score, "steps": self.steps }),
        }
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

use crate::image::{RawImage, RgbaColor};
use alr_core::State;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct VisualPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VisualDirection {
    Up,
    Down,
    Left,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedSnakeState {
    pub head: VisualPosition,
    pub food: VisualPosition,
    pub body: Vec<VisualPosition>,
    pub direction: VisualDirection,
    pub grid_w: i32,
    pub grid_h: i32,
}

impl DetectedSnakeState {
    pub fn to_features(&self) -> Vec<f32> {
        let (head_x, head_y) = (self.head.x, self.head.y);

        // Danger check relative to direction:
        // direction: Up(0), Down(1), Left(2), Right(3)
        let (front_pos, left_pos, right_pos) = match self.direction {
            VisualDirection::Up => (
                (head_x, head_y - 1),
                (head_x - 1, head_y),
                (head_x + 1, head_y),
            ),
            VisualDirection::Down => (
                (head_x, head_y + 1),
                (head_x + 1, head_y),
                (head_x - 1, head_y),
            ),
            VisualDirection::Left => (
                (head_x - 1, head_y),
                (head_x, head_y + 1),
                (head_x, head_y - 1),
            ),
            VisualDirection::Right => (
                (head_x + 1, head_y),
                (head_x, head_y - 1),
                (head_x, head_y + 1),
            ),
        };

        let is_danger = |(x, y): (i32, i32)| -> bool {
            if x < 0 || x >= self.grid_w || y < 0 || y >= self.grid_h {
                return true;
            }
            self.body.iter().any(|b| b.x == x && b.y == y)
        };

        let danger_front = if is_danger(front_pos) { 1.0 } else { 0.0 };
        let danger_left = if is_danger(left_pos) { 1.0 } else { 0.0 };
        let danger_right = if is_danger(right_pos) { 1.0 } else { 0.0 };

        let food_up = if self.food.y < head_y { 1.0 } else { 0.0 };
        let food_down = if self.food.y > head_y { 1.0 } else { 0.0 };
        let food_left = if self.food.x < head_x { 1.0 } else { 0.0 };
        let food_right = if self.food.x > head_x { 1.0 } else { 0.0 };

        let dir_val = match self.direction {
            VisualDirection::Up => 0.0,
            VisualDirection::Down => 1.0,
            VisualDirection::Left => 2.0,
            VisualDirection::Right => 3.0,
        };

        vec![
            danger_front,
            danger_left,
            danger_right,
            food_up,
            food_down,
            food_left,
            food_right,
            dir_val,
        ]
    }

    pub fn to_alr_state(&self) -> State {
        let features = self.to_features();
        let metadata = serde_json::json!({
            "head": [self.head.x, self.head.y],
            "food": [self.food.x, self.food.y],
            "direction": format!("{:?}", self.direction),
            "body_len": self.body.len(),
            "grid": [self.grid_w, self.grid_h]
        });
        State::new(features, metadata)
    }
}

#[derive(Debug, Clone)]
pub struct VisualSnakeDetector {
    pub head_color: RgbaColor,
    pub body_color: RgbaColor,
    pub food_color: RgbaColor,
    pub grid_w: i32,
    pub grid_h: i32,
    pub cell_px: u32,
    pub offset_x: u32,
    pub offset_y: u32,
    pub last_direction: VisualDirection,
}

impl Default for VisualSnakeDetector {
    fn default() -> Self {
        Self {
            head_color: RgbaColor::new(0, 220, 0, 255), // Bright Green
            body_color: RgbaColor::new(0, 150, 0, 255), // Darker Green
            food_color: RgbaColor::new(230, 40, 40, 255), // Red
            grid_w: 20,
            grid_h: 20,
            cell_px: 20,
            offset_x: 0,
            offset_y: 0,
            last_direction: VisualDirection::Right,
        }
    }
}

impl VisualSnakeDetector {
    pub fn new(grid_w: i32, grid_h: i32, cell_px: u32) -> Self {
        Self {
            grid_w,
            grid_h,
            cell_px,
            ..Default::default()
        }
    }

    pub fn detect(&mut self, image: &RawImage) -> Result<DetectedSnakeState> {
        let mut detected_head: Option<VisualPosition> = None;
        let mut detected_food: Option<VisualPosition> = None;
        let mut detected_body: Vec<VisualPosition> = Vec::new();

        for gy in 0..self.grid_h {
            for gx in 0..self.grid_w {
                // sample center of grid cell
                let px = self.offset_x + (gx as u32 * self.cell_px) + (self.cell_px / 2);
                let py = self.offset_y + (gy as u32 * self.cell_px) + (self.cell_px / 2);

                if let Some(color) = image.get_pixel(px, py) {
                    let pos = VisualPosition { x: gx, y: gy };
                    if color.is_close(&self.head_color, 40) {
                        detected_head = Some(pos);
                    } else if color.is_close(&self.food_color, 40) {
                        detected_food = Some(pos);
                    } else if color.is_close(&self.body_color, 40) {
                        detected_body.push(pos);
                    }
                }
            }
        }

        let head = match detected_head {
            Some(h) => h,
            None => bail!("Could not visually locate Snake Head in captured image"),
        };

        let food = detected_food.unwrap_or(VisualPosition {
            x: self.grid_w / 2,
            y: self.grid_h / 2,
        });

        // Infer direction from neck / first body element if present
        let mut direction = self.last_direction;
        if let Some(neck) = detected_body.first() {
            if head.x > neck.x {
                direction = VisualDirection::Right;
            } else if head.x < neck.x {
                direction = VisualDirection::Left;
            } else if head.y > neck.y {
                direction = VisualDirection::Down;
            } else if head.y < neck.y {
                direction = VisualDirection::Up;
            }
        }
        self.last_direction = direction;

        Ok(DetectedSnakeState {
            head,
            food,
            body: detected_body,
            direction,
            grid_w: self.grid_w,
            grid_h: self.grid_h,
        })
    }
}

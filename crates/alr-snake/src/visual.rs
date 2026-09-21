use crate::game::SnakeEnvironment;
use alr_perception::{RawImage, RgbaColor};

pub struct SnakeVisualRenderer {
    pub cell_px: u32,
    pub head_color: RgbaColor,
    pub body_color: RgbaColor,
    pub food_color: RgbaColor,
    pub background_color: RgbaColor,
    pub border_color: RgbaColor,
}

impl Default for SnakeVisualRenderer {
    fn default() -> Self {
        Self {
            cell_px: 20,
            head_color: RgbaColor::new(0, 220, 0, 255), // Bright Green
            body_color: RgbaColor::new(0, 150, 0, 255), // Darker Green
            food_color: RgbaColor::new(230, 40, 40, 255), // Red
            background_color: RgbaColor::new(24, 24, 28, 255), // Dark Theme Canvas
            border_color: RgbaColor::new(60, 60, 70, 255),
        }
    }
}

impl SnakeVisualRenderer {
    pub fn new(cell_px: u32) -> Self {
        Self {
            cell_px,
            ..Default::default()
        }
    }

    pub fn render_frame(&self, env: &SnakeEnvironment) -> RawImage {
        let width = (env.width as u32) * self.cell_px;
        let height = (env.height as u32) * self.cell_px;
        let mut image = RawImage::new(width, height, vec![0; (width * height * 4) as usize]);
        image.fill(self.background_color);

        // Draw border
        for x in 0..width {
            image.draw_rect(x, 0, 1, 1, self.border_color);
            image.draw_rect(x, height - 1, 1, 1, self.border_color);
        }
        for y in 0..height {
            image.draw_rect(0, y, 1, 1, self.border_color);
            image.draw_rect(width - 1, y, 1, 1, self.border_color);
        }

        // Draw food
        let fx = (env.food.x as u32) * self.cell_px;
        let fy = (env.food.y as u32) * self.cell_px;
        image.draw_rect(
            fx + 2,
            fy + 2,
            self.cell_px - 4,
            self.cell_px - 4,
            self.food_color,
        );

        // Draw body
        for b in &env.body {
            let bx = (b.x as u32) * self.cell_px;
            let by = (b.y as u32) * self.cell_px;
            image.draw_rect(
                bx + 1,
                by + 1,
                self.cell_px - 2,
                self.cell_px - 2,
                self.body_color,
            );
        }

        // Draw head
        let hx = (env.head.x as u32) * self.cell_px;
        let hy = (env.head.y as u32) * self.cell_px;
        image.draw_rect(hx, hy, self.cell_px, self.cell_px, self.head_color);

        image
    }
}

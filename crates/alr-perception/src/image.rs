use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct RgbaColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl RgbaColor {
    pub const fn new(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self { r, g, b, a }
    }

    pub fn is_close(&self, other: &RgbaColor, tolerance: u8) -> bool {
        let dr = (self.r as i16 - other.r as i16).unsigned_abs() as u8;
        let dg = (self.g as i16 - other.g as i16).unsigned_abs() as u8;
        let db = (self.b as i16 - other.b as i16).unsigned_abs() as u8;
        dr <= tolerance && dg <= tolerance && db <= tolerance
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawImage {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>, // RGBA 4 bytes per pixel
}

impl RawImage {
    pub fn new(width: u32, height: u32, data: Vec<u8>) -> Self {
        Self {
            width,
            height,
            data,
        }
    }

    pub fn get_pixel(&self, x: u32, y: u32) -> Option<RgbaColor> {
        if x >= self.width || y >= self.height {
            return None;
        }
        let idx = ((y * self.width + x) * 4) as usize;
        if idx + 3 < self.data.len() {
            Some(RgbaColor::new(
                self.data[idx],
                self.data[idx + 1],
                self.data[idx + 2],
                self.data[idx + 3],
            ))
        } else {
            None
        }
    }

    pub fn fill(&mut self, color: RgbaColor) {
        let (chunks, _) = self.data.as_chunks_mut::<4>();
        for chunk in chunks {
            chunk[0] = color.r;
            chunk[1] = color.g;
            chunk[2] = color.b;
            chunk[3] = color.a;
        }
    }

    pub fn draw_rect(&mut self, x0: u32, y0: u32, w: u32, h: u32, color: RgbaColor) {
        for y in y0..(y0 + h).min(self.height) {
            for x in x0..(x0 + w).min(self.width) {
                let idx = ((y * self.width + x) * 4) as usize;
                if idx + 3 < self.data.len() {
                    self.data[idx] = color.r;
                    self.data[idx + 1] = color.g;
                    self.data[idx + 2] = color.b;
                    self.data[idx + 3] = color.a;
                }
            }
        }
    }
}

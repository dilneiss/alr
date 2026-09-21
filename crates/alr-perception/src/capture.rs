use crate::image::RawImage;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CaptureRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl Default for CaptureRegion {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            width: 600,
            height: 600,
        }
    }
}

pub trait ScreenCapturer: Send + Sync {
    fn capture_region(&self, region: CaptureRegion) -> Result<RawImage>;
}

/// A capturer that can be backed by synthetic memory buffers, direct GDI/Windows capture, or simulated game frames
pub struct SimulatedScreenCapturer {
    frame_buffer: parking_lot::RwLock<Option<RawImage>>,
}

impl Default for SimulatedScreenCapturer {
    fn default() -> Self {
        Self::new()
    }
}

impl SimulatedScreenCapturer {
    pub fn new() -> Self {
        Self {
            frame_buffer: parking_lot::RwLock::new(None),
        }
    }

    pub fn set_frame(&self, image: RawImage) {
        *self.frame_buffer.write() = Some(image);
    }
}

impl ScreenCapturer for SimulatedScreenCapturer {
    fn capture_region(&self, region: CaptureRegion) -> Result<RawImage> {
        let guard = self.frame_buffer.read();
        if let Some(ref img) = *guard {
            // crop region or return full
            if region.width == img.width
                && region.height == img.height
                && region.x == 0
                && region.y == 0
            {
                return Ok(img.clone());
            }
            let mut cropped_data = Vec::with_capacity((region.width * region.height * 4) as usize);
            for y in region.y..(region.y + region.height).min(img.height) {
                for x in region.x..(region.x + region.width).min(img.width) {
                    if let Some(p) = img.get_pixel(x, y) {
                        cropped_data.push(p.r);
                        cropped_data.push(p.g);
                        cropped_data.push(p.b);
                        cropped_data.push(p.a);
                    } else {
                        cropped_data.extend_from_slice(&[0, 0, 0, 255]);
                    }
                }
            }
            Ok(RawImage::new(region.width, region.height, cropped_data))
        } else {
            // blank default frame
            let data = vec![0u8; (region.width * region.height * 4) as usize];
            Ok(RawImage::new(region.width, region.height, data))
        }
    }
}

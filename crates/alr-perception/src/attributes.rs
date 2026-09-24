//! Visual attribute extraction for e-commerce and product catalog intelligence.
//!
//! Provides zero-GPU, ultra-fast (< 100 µs) extraction of:
//! - Dominant color palette with Portuguese naming and hex codes.
//! - Primary/secondary color profiles with brightness and contrast metrics.
//! - Background classification (Clean White, Transparent, Clean Dark, Complex).
//! - Geometric shape detection (Circular, Rectangular, Elongated, Square).
//! - E-commerce readiness validation and semantic visual tags.

use crate::image::{RawImage, RgbaColor};
use serde::{Deserialize, Serialize};

/// Dominant and secondary color profile of an image or product.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ImageColorProfile {
    /// Dominant primary color.
    pub primary_color: RgbaColor,
    /// Primary color hex code (e.g. `"#FF0000"`).
    pub primary_color_hex: String,
    /// Human-friendly primary color name in Portuguese (e.g. `"Vermelho"`, `"Preto"`).
    pub primary_color_name: String,
    /// Optional secondary dominant color.
    pub secondary_color: Option<RgbaColor>,
    /// Secondary color hex code if detected.
    pub secondary_color_hex: Option<String>,
    /// Secondary color name in Portuguese if detected.
    pub secondary_color_name: Option<String>,
    /// Ratio of foreground product coverage over the entire image (0.0 to 1.0).
    pub coverage_ratio: f32,
    /// Mean perceived brightness of the foreground object (0.0 to 1.0).
    pub mean_brightness: f32,
    /// RMS contrast of the foreground object (0.0 to 1.0).
    pub contrast: f32,
}

/// Single entry in a color palette.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ColorSwatch {
    /// RGBA representation.
    pub color: RgbaColor,
    /// Hex string (e.g. `"#000080"`).
    pub hex: String,
    /// Portuguese name (e.g. `"Azul Marinho"`).
    pub name_pt: String,
    /// Relative coverage percentage in the foreground (0.0 to 100.0).
    pub percentage: f32,
}

/// Geometric dimensions and aspect ratio.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ImageDimensions {
    pub width: u32,
    pub height: u32,
    pub aspect_ratio: f32,
}

/// Classification of the background type for catalog compliance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BackgroundType {
    /// Alpha channel transparency (>65% of border).
    Transparent,
    /// Pure or near-pure clean white background for e-commerce.
    CleanWhite,
    /// Dark or black studio background.
    CleanDark,
    /// Natural scene, lifestyle or complex textured background.
    ComplexScene,
}

/// Detected geometric shape of the primary foreground object.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DetectedShape {
    /// Circular or rounded object (e.g. plates, wheels, balls, coins).
    Circular,
    /// Standard rectangular item (e.g. t-shirts, boxes, books).
    Rectangular,
    /// Elongated item (e.g. sneakers, smartphones, pens, bottles, watches).
    Elongated,
    /// Square item with ~1:1 aspect ratio and solid coverage.
    Square,
    /// Irregular shape.
    Irregular,
}

/// Comprehensive visual attributes extracted from a product image.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExtractedVisualAttributes {
    /// Dominant color palette with Portuguese names and hex codes.
    pub palette: Vec<ColorSwatch>,
    /// Image dimensions and aspect ratio.
    pub dimensions: ImageDimensions,
    /// Detected background type.
    pub background_type: BackgroundType,
    /// Whether the background qualifies as clean studio background for e-commerce.
    pub is_clean_background: bool,
    /// Perceived edge sharpness and detail quality (0.0 to 1.0).
    pub sharpness: f32,
    /// Detected product shape.
    pub detected_shape: DetectedShape,
    /// Detailed color profile (primary, secondary, coverage, brightness, contrast).
    pub color_profile: ImageColorProfile,
    /// Semantic visual tags for indexing, filtering and auto-categorization.
    pub visual_tags: Vec<String>,
    /// CPU extraction duration in microseconds.
    pub extraction_time_us: u64,
}

impl ExtractedVisualAttributes {
    /// Returns true if the image contains the given tag.
    pub fn has_tag(&self, tag: &str) -> bool {
        self.visual_tags.iter().any(|t| t == tag)
    }

    /// Returns true if the image is ready for marketplace standards.
    pub fn is_ecommerce_ready(&self) -> bool {
        self.has_tag("pronto-para-ecommerce")
    }
}

/// Reference named color in Portuguese.
struct NamedColor {
    name: &'static str,
    r: u8,
    g: u8,
    b: u8,
}

/// Comprehensive Portuguese color catalog for e-commerce.
const NAMED_COLORS: &[NamedColor] = &[
    NamedColor {
        name: "Preto",
        r: 0,
        g: 0,
        b: 0,
    },
    NamedColor {
        name: "Grafite",
        r: 58,
        g: 58,
        b: 58,
    },
    NamedColor {
        name: "Cinza Escuro",
        r: 105,
        g: 105,
        b: 105,
    },
    NamedColor {
        name: "Cinza Claro",
        r: 200,
        g: 200,
        b: 200,
    },
    NamedColor {
        name: "Branco",
        r: 255,
        g: 255,
        b: 255,
    },
    NamedColor {
        name: "Vermelho",
        r: 255,
        g: 0,
        b: 0,
    },
    NamedColor {
        name: "Vermelho Escuro",
        r: 139,
        g: 0,
        b: 0,
    },
    NamedColor {
        name: "Vinho",
        r: 114,
        g: 20,
        b: 34,
    },
    NamedColor {
        name: "Bordô",
        r: 128,
        g: 0,
        b: 32,
    },
    NamedColor {
        name: "Laranja",
        r: 255,
        g: 128,
        b: 0,
    },
    NamedColor {
        name: "Coral",
        r: 255,
        g: 127,
        b: 80,
    },
    NamedColor {
        name: "Amarelo",
        r: 255,
        g: 230,
        b: 0,
    },
    NamedColor {
        name: "Dourado",
        r: 218,
        g: 165,
        b: 32,
    },
    NamedColor {
        name: "Verde Claro",
        r: 144,
        g: 238,
        b: 144,
    },
    NamedColor {
        name: "Verde",
        r: 0,
        g: 160,
        b: 0,
    },
    NamedColor {
        name: "Verde Escuro",
        r: 0,
        g: 100,
        b: 0,
    },
    NamedColor {
        name: "Verde Militar",
        r: 75,
        g: 83,
        b: 32,
    },
    NamedColor {
        name: "Verde Oliva",
        r: 107,
        g: 142,
        b: 35,
    },
    NamedColor {
        name: "Verde Esmeralda",
        r: 46,
        g: 139,
        b: 87,
    },
    NamedColor {
        name: "Azul Claro",
        r: 135,
        g: 206,
        b: 250,
    },
    NamedColor {
        name: "Azul Turquesa",
        r: 64,
        g: 224,
        b: 208,
    },
    NamedColor {
        name: "Azul Royal",
        r: 65,
        g: 105,
        b: 225,
    },
    NamedColor {
        name: "Azul",
        r: 0,
        g: 90,
        b: 255,
    },
    NamedColor {
        name: "Azul Marinho",
        r: 0,
        g: 15,
        b: 110,
    },
    NamedColor {
        name: "Azul Petróleo",
        r: 0,
        g: 95,
        b: 107,
    },
    NamedColor {
        name: "Roxo",
        r: 128,
        g: 0,
        b: 128,
    },
    NamedColor {
        name: "Violeta",
        r: 138,
        g: 43,
        b: 226,
    },
    NamedColor {
        name: "Lilás",
        r: 200,
        g: 162,
        b: 200,
    },
    NamedColor {
        name: "Rosa",
        r: 255,
        g: 180,
        b: 200,
    },
    NamedColor {
        name: "Pink",
        r: 255,
        g: 20,
        b: 147,
    },
    NamedColor {
        name: "Magenta",
        r: 255,
        g: 0,
        b: 255,
    },
    NamedColor {
        name: "Marrom",
        r: 139,
        g: 69,
        b: 19,
    },
    NamedColor {
        name: "Caramelo",
        r: 175,
        g: 95,
        b: 45,
    },
    NamedColor {
        name: "Bege",
        r: 245,
        g: 235,
        b: 205,
    },
    NamedColor {
        name: "Nude",
        r: 227,
        g: 197,
        b: 178,
    },
];

/// Ultra-fast CPU visual attribute extractor.
#[derive(Debug, Clone)]
pub struct VisualAttributeExtractor {
    /// Maximum number of pixels sampled for analysis (guarantees < 100 µs latency).
    pub max_sample_pixels: usize,
    /// Threshold above which a channel is treated as pure white background (0-255).
    pub white_threshold: u8,
    /// Threshold below which a channel is treated as pure dark background (0-255).
    pub dark_threshold: u8,
}

impl Default for VisualAttributeExtractor {
    fn default() -> Self {
        Self {
            max_sample_pixels: 4096,
            white_threshold: 235,
            dark_threshold: 30,
        }
    }
}

impl VisualAttributeExtractor {
    /// Creates a new extractor with optimized default parameters.
    pub fn new() -> Self {
        Self::default()
    }

    /// Configures the maximum sampled pixels.
    pub fn with_sample_limit(mut self, limit: usize) -> Self {
        self.max_sample_pixels = limit;
        self
    }

    /// Converts RGB components to a standard Hex string (e.g. `"#FF0000"`).
    pub fn rgb_to_hex(r: u8, g: u8, b: u8) -> String {
        format!("#{:02X}{:02X}{:02X}", r, g, b)
    }

    /// Finds the closest matching Portuguese color name using perceptual distance.
    pub fn color_name_pt(r: u8, g: u8, b: u8) -> &'static str {
        let mut best_name = "Indefinido";
        let mut min_dist = u32::MAX;

        for entry in NAMED_COLORS {
            let dr = r as i32 - entry.r as i32;
            let dg = g as i32 - entry.g as i32;
            let db = b as i32 - entry.b as i32;

            // Perceptually-weighted Euclidean distance: 2*dR^2 + 4*dG^2 + 3*dB^2
            let dist = (2 * dr * dr + 4 * dg * dg + 3 * db * db) as u32;
            if dist < min_dist {
                min_dist = dist;
                best_name = entry.name;
            }
        }

        best_name
    }

    /// Checks if an image has a clean white studio background.
    pub fn is_clean_white_background(&self, image: &RawImage) -> bool {
        self.detect_background_type(image) == BackgroundType::CleanWhite
    }

    /// Detects background type from image borders.
    pub fn detect_background_type(&self, image: &RawImage) -> BackgroundType {
        if image.width == 0 || image.height == 0 {
            return BackgroundType::ComplexScene;
        }

        let mut transparent_count = 0usize;
        let mut white_count = 0usize;
        let mut dark_count = 0usize;
        let mut total_border_samples = 0usize;

        let step_x = (image.width / 32).max(1);
        let step_y = (image.height / 32).max(1);

        // Top and bottom borders
        for x in (0..image.width).step_by(step_x as usize) {
            if let Some(top) = image.get_pixel(x, 0) {
                total_border_samples += 1;
                if top.a < 30 {
                    transparent_count += 1;
                } else if top.r >= self.white_threshold
                    && top.g >= self.white_threshold
                    && top.b >= self.white_threshold
                {
                    white_count += 1;
                } else if top.r <= self.dark_threshold
                    && top.g <= self.dark_threshold
                    && top.b <= self.dark_threshold
                {
                    dark_count += 1;
                }
            }

            if image.height > 1 {
                if let Some(bottom) = image.get_pixel(x, image.height - 1) {
                    total_border_samples += 1;
                    if bottom.a < 30 {
                        transparent_count += 1;
                    } else if bottom.r >= self.white_threshold
                        && bottom.g >= self.white_threshold
                        && bottom.b >= self.white_threshold
                    {
                        white_count += 1;
                    } else if bottom.r <= self.dark_threshold
                        && bottom.g <= self.dark_threshold
                        && bottom.b <= self.dark_threshold
                    {
                        dark_count += 1;
                    }
                }
            }
        }

        // Left and right borders (excluding corners)
        for y in (step_y..image.height.saturating_sub(1)).step_by(step_y as usize) {
            if let Some(left) = image.get_pixel(0, y) {
                total_border_samples += 1;
                if left.a < 30 {
                    transparent_count += 1;
                } else if left.r >= self.white_threshold
                    && left.g >= self.white_threshold
                    && left.b >= self.white_threshold
                {
                    white_count += 1;
                } else if left.r <= self.dark_threshold
                    && left.g <= self.dark_threshold
                    && left.b <= self.dark_threshold
                {
                    dark_count += 1;
                }
            }

            if image.width > 1 {
                if let Some(right) = image.get_pixel(image.width - 1, y) {
                    total_border_samples += 1;
                    if right.a < 30 {
                        transparent_count += 1;
                    } else if right.r >= self.white_threshold
                        && right.g >= self.white_threshold
                        && right.b >= self.white_threshold
                    {
                        white_count += 1;
                    } else if right.r <= self.dark_threshold
                        && right.g <= self.dark_threshold
                        && right.b <= self.dark_threshold
                    {
                        dark_count += 1;
                    }
                }
            }
        }

        if total_border_samples == 0 {
            return BackgroundType::ComplexScene;
        }

        let trans_ratio = transparent_count as f32 / total_border_samples as f32;
        let white_ratio = white_count as f32 / total_border_samples as f32;
        let dark_ratio = dark_count as f32 / total_border_samples as f32;

        if trans_ratio >= 0.65 {
            BackgroundType::Transparent
        } else if white_ratio >= 0.65 {
            BackgroundType::CleanWhite
        } else if dark_ratio >= 0.65 {
            BackgroundType::CleanDark
        } else {
            BackgroundType::ComplexScene
        }
    }

    /// Extracts all visual attributes from the provided raw image.
    pub fn extract(&self, image: &RawImage) -> ExtractedVisualAttributes {
        let start_time = std::time::Instant::now();

        let width = image.width;
        let height = image.height;
        let aspect_ratio = if height > 0 {
            width as f32 / height as f32
        } else {
            1.0
        };

        let dimensions = ImageDimensions {
            width,
            height,
            aspect_ratio,
        };

        if width == 0 || height == 0 || image.data.is_empty() {
            return ExtractedVisualAttributes {
                palette: Vec::new(),
                dimensions,
                background_type: BackgroundType::ComplexScene,
                is_clean_background: false,
                sharpness: 0.0,
                detected_shape: DetectedShape::Irregular,
                color_profile: ImageColorProfile {
                    primary_color: RgbaColor::new(0, 0, 0, 255),
                    primary_color_hex: "#000000".to_string(),
                    primary_color_name: "Preto".to_string(),
                    secondary_color: None,
                    secondary_color_hex: None,
                    secondary_color_name: None,
                    coverage_ratio: 0.0,
                    mean_brightness: 0.0,
                    contrast: 0.0,
                },
                visual_tags: Vec::new(),
                extraction_time_us: start_time.elapsed().as_micros() as u64,
            };
        }

        let bg_type = self.detect_background_type(image);
        let is_clean_bg = matches!(
            bg_type,
            BackgroundType::Transparent | BackgroundType::CleanWhite | BackgroundType::CleanDark
        );

        let total_pixels = (width * height) as usize;
        let sample_stride = (total_pixels / self.max_sample_pixels).max(1);

        // Fixed 16KB stack histogram for 12-bit RGB quantization (4096 bins: 4-4-4 bits)
        let mut hist = [0u32; 4096];
        let mut fg_count = 0usize;
        let mut sampled_total = 0usize;

        let mut min_x = width;
        let mut max_x = 0u32;
        let mut min_y = height;
        let mut max_y = 0u32;

        let mut sum_brightness = 0.0f32;
        let mut sum_sq_brightness = 0.0f32;

        let mut sharpness_sum = 0.0f32;
        let mut sharpness_samples = 0usize;

        for idx in (0..total_pixels).step_by(sample_stride) {
            let x = (idx as u32) % width;
            let y = (idx as u32) / width;
            sampled_total += 1;

            let byte_idx = idx * 4;
            if byte_idx + 3 >= image.data.len() {
                break;
            }

            let r = image.data[byte_idx];
            let g = image.data[byte_idx + 1];
            let b = image.data[byte_idx + 2];
            let a = image.data[byte_idx + 3];

            // Evaluate if this pixel is foreground based on detected background
            let is_fg = match bg_type {
                BackgroundType::Transparent => a >= 50,
                BackgroundType::CleanWhite => {
                    !(r >= self.white_threshold
                        && g >= self.white_threshold
                        && b >= self.white_threshold)
                }
                BackgroundType::CleanDark => {
                    !(r <= self.dark_threshold
                        && g <= self.dark_threshold
                        && b <= self.dark_threshold)
                }
                BackgroundType::ComplexScene => true,
            };

            if is_fg {
                fg_count += 1;
                min_x = min_x.min(x);
                max_x = max_x.max(x);
                min_y = min_y.min(y);
                max_y = max_y.max(y);

                // 4-bit per channel quantization bin
                let bin = (((r as usize >> 4) & 0xF) << 8)
                    | (((g as usize >> 4) & 0xF) << 4)
                    | ((b as usize >> 4) & 0xF);
                hist[bin] = hist[bin].saturating_add(1);

                // Perceived luminance Y = 0.299*R + 0.587*G + 0.114*B (normalized 0.0 to 1.0)
                let lum = (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32) / 255.0;
                sum_brightness += lum;
                sum_sq_brightness += lum * lum;
            }

            // Finite difference sharpness estimation on adjacent pixels
            if x + 1 < width && y + 1 < height {
                let right_idx = (y * width + (x + 1)) as usize * 4;
                let down_idx = ((y + 1) * width + x) as usize * 4;
                if down_idx + 3 < image.data.len() {
                    let rx = image.data[right_idx];
                    let gx = image.data[right_idx + 1];
                    let bx = image.data[right_idx + 2];

                    let ry = image.data[down_idx];
                    let gy = image.data[down_idx + 1];
                    let by = image.data[down_idx + 2];

                    let dx = (r as i32 - rx as i32).abs()
                        + (g as i32 - gx as i32).abs()
                        + (b as i32 - bx as i32).abs();
                    let dy = (r as i32 - ry as i32).abs()
                        + (g as i32 - gy as i32).abs()
                        + (b as i32 - by as i32).abs();

                    sharpness_sum += (dx + dy) as f32 / (6.0 * 255.0);
                    sharpness_samples += 1;
                }
            }
        }

        // Fallback: if no foreground pixels isolated, use all sampled pixels
        let used_fg_count = if fg_count == 0 {
            sampled_total
        } else {
            fg_count
        };

        if fg_count == 0 {
            for idx in (0..total_pixels).step_by(sample_stride) {
                let byte_idx = idx * 4;
                if byte_idx + 3 >= image.data.len() {
                    break;
                }
                let r = image.data[byte_idx];
                let g = image.data[byte_idx + 1];
                let b = image.data[byte_idx + 2];
                let bin = (((r as usize >> 4) & 0xF) << 8)
                    | (((g as usize >> 4) & 0xF) << 4)
                    | ((b as usize >> 4) & 0xF);
                hist[bin] = hist[bin].saturating_add(1);

                let lum = (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32) / 255.0;
                sum_brightness += lum;
                sum_sq_brightness += lum * lum;
            }
            min_x = 0;
            max_x = width.saturating_sub(1);
            min_y = 0;
            max_y = height.saturating_sub(1);
        }

        let mean_brightness = if used_fg_count > 0 {
            (sum_brightness / used_fg_count as f32).clamp(0.0, 1.0)
        } else {
            0.5
        };

        let variance = if used_fg_count > 1 {
            let mean_sq = mean_brightness * mean_brightness;
            let avg_sq = sum_sq_brightness / used_fg_count as f32;
            (avg_sq - mean_sq).max(0.0)
        } else {
            0.0
        };
        let contrast = variance.sqrt().clamp(0.0, 1.0);

        let sharpness = if sharpness_samples > 0 {
            ((sharpness_sum / sharpness_samples as f32) * 2.5).clamp(0.0, 1.0)
        } else {
            0.0
        };

        let coverage_ratio = if sampled_total > 0 {
            (fg_count as f32 / sampled_total as f32).clamp(0.0, 1.0)
        } else {
            1.0
        };

        // Extract palette from histogram peaks
        let mut bins: Vec<(usize, u32)> = hist
            .iter()
            .enumerate()
            .filter(|(_, &count)| count > 0)
            .map(|(bin, &count)| (bin, count))
            .collect();
        bins.sort_by_key(|a| std::cmp::Reverse(a.1));

        let mut palette: Vec<ColorSwatch> = Vec::with_capacity(5);
        for &(bin, count) in &bins {
            let r = (((bin >> 8) & 0xF) * 17) as u8;
            let g = (((bin >> 4) & 0xF) * 17) as u8;
            let b = ((bin & 0xF) * 17) as u8;

            // Merge near-identical bins
            let too_close = palette.iter().any(|existing| {
                let dr = (r as i32 - existing.color.r as i32).abs();
                let dg = (g as i32 - existing.color.g as i32).abs();
                let db = (b as i32 - existing.color.b as i32).abs();
                dr + dg + db < 45
            });

            if !too_close {
                let percentage = (count as f32 / used_fg_count as f32) * 100.0;
                palette.push(ColorSwatch {
                    color: RgbaColor::new(r, g, b, 255),
                    hex: Self::rgb_to_hex(r, g, b),
                    name_pt: Self::color_name_pt(r, g, b).to_string(),
                    percentage,
                });
                if palette.len() >= 5 {
                    break;
                }
            }
        }

        // Primary color
        let (primary_color, primary_color_hex, primary_color_name) =
            if let Some(p) = palette.first() {
                (p.color, p.hex.clone(), p.name_pt.clone())
            } else {
                (
                    RgbaColor::new(128, 128, 128, 255),
                    "#808080".to_string(),
                    "Cinza Escuro".to_string(),
                )
            };

        // Secondary color
        let (secondary_color, secondary_color_hex, secondary_color_name) =
            if palette.len() > 1 && palette[1].percentage >= 5.0 {
                (
                    Some(palette[1].color),
                    Some(palette[1].hex.clone()),
                    Some(palette[1].name_pt.clone()),
                )
            } else {
                (None, None, None)
            };

        let color_profile = ImageColorProfile {
            primary_color,
            primary_color_hex,
            primary_color_name: primary_color_name.clone(),
            secondary_color,
            secondary_color_hex,
            secondary_color_name,
            coverage_ratio,
            mean_brightness,
            contrast,
        };

        // Geometric shape detection
        let bbox_w = (max_x.saturating_sub(min_x).saturating_add(1)) as f32;
        let bbox_h = (max_y.saturating_sub(min_y).saturating_add(1)) as f32;
        let bbox_ratio = if bbox_h > 0.0 { bbox_w / bbox_h } else { 1.0 };
        let bbox_area = bbox_w * bbox_h;
        let fill_ratio = if bbox_area > 0.0 {
            (fg_count as f32 * sample_stride as f32) / bbox_area
        } else {
            1.0
        };

        let detected_shape = if bbox_ratio > 1.85 || bbox_ratio < 0.54 {
            DetectedShape::Elongated
        } else if (bbox_ratio - 1.0).abs() < 0.25 && (0.58..=0.86).contains(&fill_ratio) {
            DetectedShape::Circular
        } else if (bbox_ratio - 1.0).abs() < 0.05 && fill_ratio >= 0.92 {
            DetectedShape::Square
        } else {
            DetectedShape::Rectangular
        };

        // Assemble semantic visual tags
        let mut visual_tags = Vec::new();

        match bg_type {
            BackgroundType::CleanWhite => visual_tags.push("fundo-branco".to_string()),
            BackgroundType::Transparent => visual_tags.push("fundo-transparente".to_string()),
            BackgroundType::CleanDark => visual_tags.push("fundo-escuro".to_string()),
            BackgroundType::ComplexScene => visual_tags.push("fundo-cenario-complexo".to_string()),
        }

        let primary_slug = slugify(&primary_color_name);
        visual_tags.push(format!("cor-{}", primary_slug));

        if let Some(sec_name) = &color_profile.secondary_color_name {
            visual_tags.push(format!("secundaria-{}", slugify(sec_name)));
        }

        match detected_shape {
            DetectedShape::Circular => visual_tags.push("formato-circular".to_string()),
            DetectedShape::Rectangular => visual_tags.push("formato-retangular".to_string()),
            DetectedShape::Elongated => visual_tags.push("formato-alongado".to_string()),
            DetectedShape::Square => visual_tags.push("formato-quadrado".to_string()),
            DetectedShape::Irregular => visual_tags.push("formato-irregular".to_string()),
        }

        if contrast >= 0.20 {
            visual_tags.push("alto-contraste".to_string());
        } else if contrast <= 0.08 {
            visual_tags.push("baixo-contraste".to_string());
        }

        if mean_brightness >= 0.75 {
            visual_tags.push("alta-luminosidade".to_string());
        } else if mean_brightness <= 0.25 {
            visual_tags.push("baixa-luminosidade".to_string());
        }

        if sharpness >= 0.15 {
            visual_tags.push("alta-nitidez".to_string());
        }

        // E-commerce qualification
        if is_clean_bg && coverage_ratio >= 0.10 {
            visual_tags.push("pronto-para-ecommerce".to_string());
        }

        let extraction_time_us = start_time.elapsed().as_micros() as u64;

        ExtractedVisualAttributes {
            palette,
            dimensions,
            background_type: bg_type,
            is_clean_background: is_clean_bg,
            sharpness,
            detected_shape,
            color_profile,
            visual_tags,
            extraction_time_us,
        }
    }
}

/// Helper to convert a Portuguese name into a clean kebab-case tag slug.
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .replace(' ', "-")
        .replace(['ã', 'á', 'à', 'â'], "a")
        .replace(['é', 'ê'], "e")
        .replace(['í'], "i")
        .replace(['õ', 'ó', 'ô'], "o")
        .replace(['ú'], "u")
        .replace(['ç'], "c")
}

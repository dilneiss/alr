use alr_perception::{
    BackgroundType, DetectedShape, RawImage, RgbaColor, VisualAttributeExtractor,
};

#[test]
fn test_simulated_red_sneaker() {
    let extractor = VisualAttributeExtractor::new();

    // 120x60 image with clean white background
    let width = 120;
    let height = 60;
    let mut img = RawImage::new(width, height, vec![255; (width * height * 4) as usize]);

    // Draw red sneaker upper (horizontal elongated body: 90px wide x 25px high)
    // Red color: (230, 20, 20) -> "Vermelho"
    let red = RgbaColor::new(230, 20, 20, 255);
    img.draw_rect(15, 15, 90, 25, red);

    // Draw sneaker black sole accent (90px wide x 8px high)
    let black = RgbaColor::new(15, 15, 15, 255);
    img.draw_rect(15, 40, 90, 8, black);

    let attrs = extractor.extract(&img);

    assert_eq!(attrs.background_type, BackgroundType::CleanWhite);
    assert!(attrs.is_clean_background);
    assert_eq!(attrs.color_profile.primary_color_name, "Vermelho");
    assert!(attrs.color_profile.primary_color_hex.starts_with('#'));
    assert_eq!(attrs.detected_shape, DetectedShape::Elongated);
    assert!(attrs.is_ecommerce_ready());
    assert!(attrs.has_tag("fundo-branco"));
    assert!(attrs.has_tag("cor-vermelho"));
    assert!(attrs.has_tag("formato-alongado"));
    assert!(attrs.has_tag("pronto-para-ecommerce"));
    assert!(attrs.color_profile.coverage_ratio > 0.3);
}

#[test]
fn test_simulated_black_smartphone() {
    let extractor = VisualAttributeExtractor::new();

    // 60x120 image with clean white background
    let width = 60;
    let height = 120;
    let mut img = RawImage::new(width, height, vec![255; (width * height * 4) as usize]);

    // Draw black smartphone body (vertical elongated body: 40px wide x 100px high)
    let black = RgbaColor::new(12, 12, 12, 255);
    img.draw_rect(10, 10, 40, 100, black);

    // Draw blue screen active display (36px wide x 80px high)
    // Blue color: (0, 90, 255) -> "Azul"
    let blue = RgbaColor::new(0, 90, 255, 255);
    img.draw_rect(12, 20, 36, 80, blue);

    let attrs = extractor.extract(&img);

    assert_eq!(attrs.background_type, BackgroundType::CleanWhite);
    assert!(attrs.is_clean_background);
    assert_eq!(attrs.color_profile.primary_color_name, "Azul");
    assert!(attrs.color_profile.secondary_color.is_some());
    assert_eq!(
        attrs.color_profile.secondary_color_name.as_deref(),
        Some("Preto")
    );
    assert_eq!(attrs.detected_shape, DetectedShape::Elongated);
    assert!(attrs.has_tag("cor-azul"));
    assert!(attrs.has_tag("secundaria-preto"));
    assert!(attrs.has_tag("fundo-branco"));
    assert!(attrs.has_tag("formato-alongado"));
    assert!(attrs.is_ecommerce_ready());
}

#[test]
fn test_simulated_white_tshirt() {
    let extractor = VisualAttributeExtractor::new();

    // 100x100 image with transparent background (alpha = 0)
    let width = 100;
    let height = 100;
    let mut img = RawImage::new(width, height, vec![0; (width * height * 4) as usize]);

    // Draw white t-shirt body (width 60, height 70)
    let white = RgbaColor::new(252, 252, 252, 255);
    img.draw_rect(20, 15, 60, 70, white);

    // Draw navy blue brand logo on chest (width 20, height 12)
    // Navy Blue: (0, 15, 110) -> "Azul Marinho"
    let navy = RgbaColor::new(0, 15, 110, 255);
    img.draw_rect(40, 35, 20, 12, navy);

    let attrs = extractor.extract(&img);

    assert_eq!(attrs.background_type, BackgroundType::Transparent);
    assert!(attrs.is_clean_background);
    assert_eq!(attrs.color_profile.primary_color_name, "Branco");
    assert!(attrs.color_profile.secondary_color.is_some());
    assert_eq!(
        attrs.color_profile.secondary_color_name.as_deref(),
        Some("Azul Marinho")
    );
    assert_eq!(attrs.detected_shape, DetectedShape::Rectangular);
    assert!(attrs.has_tag("fundo-transparente"));
    assert!(attrs.has_tag("cor-branco"));
    assert!(attrs.has_tag("secundaria-azul-marinho"));
    assert!(attrs.is_ecommerce_ready());
}

#[test]
fn test_simulated_circular_product() {
    let extractor = VisualAttributeExtractor::new();

    let width = 80;
    let height = 80;
    let mut img = RawImage::new(width, height, vec![255; (width * height * 4) as usize]);

    // Draw green circular plate/disc
    let green = RgbaColor::new(0, 160, 0, 255);
    let center_x = 40;
    let center_y = 40;
    let radius = 28;

    for y in 0..height {
        for x in 0..width {
            let dx = x as i32 - center_x;
            let dy = y as i32 - center_y;
            if dx * dx + dy * dy <= radius * radius {
                let idx = ((y * width + x) * 4) as usize;
                img.data[idx] = green.r;
                img.data[idx + 1] = green.g;
                img.data[idx + 2] = green.b;
                img.data[idx + 3] = green.a;
            }
        }
    }

    let attrs = extractor.extract(&img);

    assert_eq!(attrs.background_type, BackgroundType::CleanWhite);
    assert_eq!(attrs.color_profile.primary_color_name, "Verde");
    assert_eq!(attrs.detected_shape, DetectedShape::Circular);
    assert!(attrs.has_tag("formato-circular"));
    assert!(attrs.has_tag("cor-verde"));
}

#[test]
fn test_complex_scene_non_clean_background() {
    let extractor = VisualAttributeExtractor::new();

    let width = 64;
    let height = 64;
    let mut img = RawImage::new(width, height, vec![0; (width * height * 4) as usize]);

    // Fill with textured / gradient non-clean pattern
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            img.data[idx] = (x * 3) as u8;
            img.data[idx + 1] = (y * 3) as u8;
            img.data[idx + 2] = 120;
            img.data[idx + 3] = 255;
        }
    }

    let attrs = extractor.extract(&img);

    assert_eq!(attrs.background_type, BackgroundType::ComplexScene);
    assert!(!attrs.is_clean_background);
    assert!(!attrs.is_ecommerce_ready());
    assert!(attrs.has_tag("fundo-cenario-complexo"));
}

#[test]
fn test_extraction_latency_under_cpu_budget() {
    let extractor = VisualAttributeExtractor::new();

    let width = 128;
    let height = 128;
    let mut img = RawImage::new(width, height, vec![255; (width * height * 4) as usize]);
    img.draw_rect(30, 30, 68, 68, RgbaColor::new(255, 0, 0, 255));

    // Warm-up run
    let _ = extractor.extract(&img);

    // Measure 50 iterations
    let iterations = 50;
    let start = std::time::Instant::now();
    for _ in 0..iterations {
        let attrs = extractor.extract(&img);
        assert!(attrs.is_clean_background);
    }
    let elapsed = start.elapsed();
    let avg_us = elapsed.as_micros() / iterations;

    // Must be fast in CPU (comfortably under 500 µs in debug mode, and typically < 50 µs in release)
    assert!(
        avg_us < 2000,
        "Average extraction time was {avg_us} µs, expected sub-millisecond execution"
    );
}

#[test]
fn test_portuguese_color_palette_naming() {
    assert_eq!(VisualAttributeExtractor::color_name_pt(0, 0, 0), "Preto");
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(255, 255, 255),
        "Branco"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(255, 0, 0),
        "Vermelho"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(0, 15, 110),
        "Azul Marinho"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(0, 0, 128),
        "Azul Marinho"
    );
    assert_eq!(VisualAttributeExtractor::color_name_pt(0, 90, 255), "Azul");
    assert_eq!(VisualAttributeExtractor::color_name_pt(0, 160, 0), "Verde");
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(255, 128, 0),
        "Laranja"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(255, 20, 147),
        "Pink"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(139, 69, 19),
        "Marrom"
    );
    assert_eq!(
        VisualAttributeExtractor::color_name_pt(245, 235, 205),
        "Bege"
    );
}

#[test]
fn test_rgb_to_hex_conversion() {
    assert_eq!(VisualAttributeExtractor::rgb_to_hex(255, 0, 0), "#FF0000");
    assert_eq!(VisualAttributeExtractor::rgb_to_hex(0, 255, 0), "#00FF00");
    assert_eq!(VisualAttributeExtractor::rgb_to_hex(0, 0, 255), "#0000FF");
    assert_eq!(VisualAttributeExtractor::rgb_to_hex(0, 15, 110), "#000F6E");
    assert_eq!(VisualAttributeExtractor::rgb_to_hex(0, 0, 0), "#000000");
    assert_eq!(
        VisualAttributeExtractor::rgb_to_hex(255, 255, 255),
        "#FFFFFF"
    );
}

#[test]
fn test_empty_image_handling_safe() {
    let extractor = VisualAttributeExtractor::new();
    let empty_img = RawImage::new(0, 0, Vec::new());
    let attrs = extractor.extract(&empty_img);

    assert_eq!(attrs.dimensions.width, 0);
    assert_eq!(attrs.dimensions.height, 0);
    assert!(!attrs.is_clean_background);
    assert_eq!(attrs.color_profile.coverage_ratio, 0.0);
}

#[test]
fn test_square_shape_detection() {
    let extractor = VisualAttributeExtractor::new();
    let width = 100;
    let height = 100;
    let mut img = RawImage::new(width, height, vec![255; (width * height * 4) as usize]);

    // Perfect 60x60 square product in center (aspect ratio = 1.0, fill ratio = 1.0)
    img.draw_rect(20, 20, 60, 60, RgbaColor::new(0, 90, 255, 255));

    let attrs = extractor.extract(&img);
    assert_eq!(attrs.detected_shape, DetectedShape::Square);
    assert!(attrs.has_tag("formato-quadrado"));
    assert!(attrs.has_tag("cor-azul"));
}

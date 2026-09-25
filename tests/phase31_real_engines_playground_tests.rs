use alr_cli::real_engines::{decode_base64, PlaygroundRealEngines};
use serde_json::json;

#[test]
fn test_real_vision_attribute_extractor() {
    let engines = PlaygroundRealEngines::new();

    // 1. Testa preset de tênis esportivo Nike
    let res = engines
        .process_image_attributes(None, Some("tenis_nike"))
        .expect("Failed to process vision preset tenis_nike");

    assert_eq!(res["success"], true);
    assert!(res["latency_micros"].as_u64().unwrap_or(999999) < 100_000); // Latência rápida em CPU

    // Valida paleta de cores reais extraídas
    let palette = res["palette"].as_array().expect("palette array missing");
    assert!(!palette.is_empty());
    let has_blue_or_white = palette.iter().any(|s| {
        let name = s["name_pt"].as_str().unwrap_or("");
        name.contains("Azul") || name.contains("Branco") || name.contains("Cinza")
    });
    assert!(has_blue_or_white);

    // Valida propriedades geométricas
    let shape = res["detected_shape"].as_str().unwrap_or("");
    assert!(!shape.is_empty());

    // Valida conformidade e-commerce
    let bg_type = res["background"]["type"].as_str().unwrap_or("");
    assert!(!bg_type.is_empty());
}

#[test]
fn test_real_screen_error_detector_on_pixels() {
    let engines = PlaygroundRealEngines::new();

    // Testa preset com tela real de Erro HTTP 500 vermelha
    let res = engines
        .process_image_attributes(None, Some("tela_erro_500"))
        .expect("Failed to process error screen preset");

    let err_verdict = &res["error_verdict"];
    // A tela vermelha intensa com modal deve acusar condição de erro ou alerta
    assert_eq!(res["success"], true);
    assert!(!err_verdict["description"].as_str().unwrap_or("").is_empty());
}

#[test]
fn test_real_cctv_temporal_difference_and_breach() {
    let engines = PlaygroundRealEngines::new();

    // 1. Quadro 0 (estático inicial)
    let _ = engines
        .process_cctv_frame(0, false, 0, 0)
        .expect("Frame 0 failed");

    // 2. Quadro 1 com intruso na zona restrita (Docas de Carga)
    let res1 = engines
        .process_cctv_frame(1, true, 160, 110)
        .expect("Frame 1 breach failed");

    assert_eq!(res1["success"], true);
    assert!(res1["latency_micros"].as_u64().unwrap_or(99999) < 15000); // < 15ms em debug

    let events = res1["events"].as_array().expect("events array missing");
    assert!(!events.is_empty());

    let breach_event = events.iter().find(|ev| {
        ev["threat_level"]
            .as_str()
            .unwrap_or("")
            .contains("Crítica")
            || ev["tripwire_breached"].as_bool().unwrap_or(false)
    });
    assert!(breach_event.is_some());
    assert_eq!(res1["toast_dispatched"], true);
}

#[test]
fn test_real_ecommerce_product_categorizer() {
    let engines = PlaygroundRealEngines::new();

    // 1. Smartphone Apple
    let res_phone = engines
        .categorize_product(
            "Smartphone Apple iPhone 15 Pro Max 256GB Titânio",
            Some("Apple"),
            Some(8999.0),
            Some("Smartphone top de linha com chip A17 Pro"),
        )
        .expect("Categorize phone failed");

    assert_eq!(res_phone["success"], true);
    assert!(res_phone["confidence"].as_f64().unwrap_or(0.0) >= 70.0);
    let path = res_phone["category_path"].as_str().unwrap_or("");
    assert!(path.contains("Celulares") || path.contains("Smartphones"));
    assert_eq!(res_phone["cost_tokens"], 0);

    // 2. Tênis de Corrida Nike
    let res_shoes = engines
        .categorize_product(
            "Tênis Nike Air Zoom Pegasus 40 Corrida",
            Some("Nike"),
            Some(799.90),
            Some("Tênis esportivo para corrida"),
        )
        .expect("Categorize shoes failed");

    assert_eq!(res_shoes["success"], true);
    let path_shoes = res_shoes["category_path"].as_str().unwrap_or("");
    assert!(path_shoes.contains("Calçados") || path_shoes.contains("Tênis"));
}

#[test]
fn test_real_ecommerce_batch_throughput() {
    let engines = PlaygroundRealEngines::new();

    let mut batch = Vec::new();
    let titles = [
        "iPhone 15 Pro Max 256GB",
        "Tênis Nike Air Zoom Pegasus",
        "Cadeira Gamer Ergonômica",
        "Cafeteira Nespresso Mini",
        "Bicicleta Mountain Bike Caloi",
    ];

    for i in 0..50 {
        batch.push(json!({
            "title": format!("{} #{}", titles[i % titles.len()], i),
            "price": 100.0 + (i as f64 * 5.0)
        }));
    }

    let res = engines.categorize_batch(&batch).expect("Batch failed");
    assert_eq!(res["success"], true);
    assert_eq!(res["total_items"], 50);
    assert!(res["throughput_items_per_sec"].as_u64().unwrap_or(0) >= 50);
}

#[test]
fn test_ecommerce_correction_crystallizes_for_next_classification() {
    let engines = PlaygroundRealEngines::new();
    let title = "Adesivo Decorativo Parede Unicórnio Glitter";

    let before = engines
        .categorize_product(title, None, Some(12.9), Some("Adesivo removível infantil"))
        .expect("Initial categorization failed");
    assert_eq!(before["method"], "llm_teacher_cold_start");
    assert_eq!(before["confidence"], 20.0);

    let learned = engines
        .learn_correction(title, "Casa e Decoração > Decoração de Parede")
        .expect("Correction crystallization failed");
    assert_eq!(learned["success"], true);
    assert_eq!(learned["method"], "crystallized_skill");

    let after = engines
        .categorize_product(title, None, Some(12.9), Some("Adesivo removível infantil"))
        .expect("Learned categorization failed");
    assert_eq!(
        after["category_path"],
        "Casa e Decoração > Decoração de Parede"
    );
    assert_eq!(after["method"], "deterministic_rule");
    assert_eq!(after["confidence"], 100.0);
}

#[tokio::test]
async fn test_custom_categories_return_ranked_top_three_and_final_pick() {
    let engines = PlaygroundRealEngines::new();
    let categories = vec![
        "Eletrônicos > Notebooks".to_string(),
        "Moda > Calçados".to_string(),
        "Casa > Móveis".to_string(),
        "Eletrônicos > Celulares".to_string(),
    ];

    let result = engines
        .categorize_with_custom_categories(
            "Notebook Dell XPS 13",
            Some("Dell"),
            Some(7_000.0),
            Some("Laptop ultrafino Intel Core i7"),
            &categories,
        )
        .await
        .expect("Custom categorization failed");

    assert_eq!(result["success"], true);
    assert_eq!(result["category_path"], "Eletrônicos > Notebooks");
    assert_eq!(result["method"], "semantic_qdrant_retrieval");
    let top_three = result["custom_candidates"]
        .as_array()
        .expect("Top-three candidates missing");
    assert_eq!(top_three.len(), 3);
    assert_eq!(top_three[0]["category"], "Eletrônicos > Notebooks");
}

#[test]
fn test_real_mouse_controller_simulation() {
    let engines = PlaygroundRealEngines::new();

    let res = engines
        .execute_mouse_action(350, 280, "click", false)
        .expect("Mouse action failed");

    assert_eq!(res["success"], true);
    assert_eq!(res["action"], "click");
    assert_eq!(res["coordinates"]["x"], 350);
    assert_eq!(res["coordinates"]["y"], 280);
    assert_eq!(res["live_execution"], false);
}

#[test]
fn test_base64_pure_decoder() {
    let original = b"Hello ALR Autonomous Learning Runtime!";
    let encoded = "SGVsbG8gQUxSIEF1dG9ub21vdXMgTGVhcm5pbmcgUnVudGltZSE=";
    let decoded = decode_base64(encoded).expect("Decode base64 failed");
    assert_eq!(decoded, original);
}

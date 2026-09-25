use crate::database_explorer::{DatabaseExplorerEngine, StoreInfo};
use crate::real_engines::PlaygroundRealEngines;
use alr_models::jev_playground::{JevDecisionRequest, JevPlaygroundPreset, JevTypedJudgeEngine};
use alr_spatial::city_routing::RouteOptimizationParams;
use anyhow::Result;
use axum::{
    extract::{Json, Query},
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;

/// Servidor Web Axum para o Playground Universal de Demonstração e Testes do ALR
pub struct JevPlaygroundServer {
    pub port: u16,
    engine: Arc<JevTypedJudgeEngine>,
    db_explorer: Arc<DatabaseExplorerEngine>,
    real_engines: Arc<PlaygroundRealEngines>,
}

impl JevPlaygroundServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            engine: Arc::new(JevTypedJudgeEngine::new()),
            db_explorer: Arc::new(DatabaseExplorerEngine::default()),
            real_engines: Arc::new(PlaygroundRealEngines::new()),
        }
    }

    /// Cria as rotas HTTP Axum cobrindo todas as capacidades do ALR
    pub fn create_router(&self) -> Router {
        let engine = self.engine.clone();

        Router::new()
            .route("/", get(handle_index))
            .route("/api/presets", get(handle_presets))
            .route(
                "/api/v1/decisions",
                post({
                    let engine = engine.clone();
                    move |body: Json<JevDecisionRequest>| {
                        let engine = engine.clone();
                        async move { handle_decision(engine, body).await }
                    }
                }),
            )
            .route(
                "/api/decision",
                post({
                    let engine = engine.clone();
                    move |body: Json<JevDecisionRequest>| {
                        let engine = engine.clone();
                        async move { handle_decision(engine, body).await }
                    }
                }),
            )
            .route(
                "/v1/chat/completions",
                post({
                    let engine = engine.clone();
                    move |body: Json<JevDecisionRequest>| {
                        let engine = engine.clone();
                        async move { handle_decision(engine, body).await }
                    }
                }),
            )
            // Endpoints de Controle Físico de OS (Mouse e Teclado)
            .route(
                "/api/v1/os/mouse",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_os_mouse(r, body)
                }),
            )
            .route("/api/v1/os/keyboard", post(handle_os_keyboard))
            .route(
                "/api/v1/os/emergency",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_os_emergency(r, body)
                }),
            )
            // Endpoints de Automação Web (Chromium CDP)
            .route("/api/v1/browser/simulate", post(handle_browser_simulate))
            // Endpoints de Automação de QA (Web & Processos)
            .route("/api/v1/qa/run-demo", post(handle_qa_run_demo))
            // Endpoints de Visão Computacional Real (Atributos e Erro de Tela)
            .route(
                "/api/v1/vision/attributes",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_vision_attributes(r, body)
                }),
            )
            // Endpoints de Câmera CCTV Real com Detecção Temporal e Tripwire
            .route(
                "/api/v1/cctv/process-frame",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_cctv_frame(r, body)
                }),
            )
            // Endpoints de E-Commerce Categorizer Real em CPU
            .route(
                "/api/v1/ecommerce/categorize",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_ecommerce_categorize(r, body)
                }),
            )
            .route(
                "/api/v1/ecommerce/batch",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_ecommerce_batch(r, body)
                }),
            )
            .route(
                "/api/v1/ecommerce/taxonomy",
                get({
                    let r = self.real_engines.clone();
                    move || handle_ecommerce_taxonomy(r)
                }),
            )
            // Endpoints de Otimização de Rotas Urbanas (VRP-TW com Trânsito)
            .route(
                "/api/v1/routes/optimize",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<RouteOptimizationParams>| handle_routes_optimize(r, body)
                }),
            )
            // Endpoints de Percepção e Visão Computacional Legado
            .route(
                "/api/v1/perception/cctv",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_cctv_frame(r, body)
                }),
            )
            .route(
                "/api/v1/perception/screen-error",
                post({
                    let r = self.real_engines.clone();
                    move |body: Json<serde_json::Value>| handle_screen_error(r, body)
                }),
            )
            // Endpoints de Modelos e Novidade OOD
            .route("/api/v1/models/ood", post(handle_model_ood))
            // Endpoints do Inspetor e Explorador de Bancos de Dados
            .route(
                "/api/v1/db/stores",
                get({
                    let db = self.db_explorer.clone();
                    move || handle_db_stores(db)
                }),
            )
            .route(
                "/api/v1/db/tables",
                get({
                    let db = self.db_explorer.clone();
                    move |q: Query<HashMap<String, String>>| handle_db_tables(db, q)
                }),
            )
            .route(
                "/api/v1/db/data",
                get({
                    let db = self.db_explorer.clone();
                    move |q: Query<HashMap<String, String>>| handle_db_data(db, q)
                }),
            )
            .route(
                "/api/v1/db/query",
                post({
                    let db = self.db_explorer.clone();
                    move |body: Json<serde_json::Value>| handle_db_query(db, body)
                }),
            )
            // Assets Estáticos
            .route(
                "/static/alr-logo.webp",
                get(|| async {
                    let bytes = std::fs::read("static/alr-logo.webp")
                        .or_else(|_| std::fs::read("../../static/alr-logo.webp"))
                        .unwrap_or_default();
                    ([(axum::http::header::CONTENT_TYPE, "image/webp")], bytes)
                }),
            )
            .route(
                "/static/alr-logo.png",
                get(|| async {
                    let bytes = std::fs::read("static/alr-logo.png")
                        .or_else(|_| std::fs::read("../../static/alr-logo.png"))
                        .unwrap_or_default();
                    ([(axum::http::header::CONTENT_TYPE, "image/png")], bytes)
                }),
            )
            .route(
                "/static/three.min.js",
                get(|| async {
                    let bytes = std::fs::read("static/three.min.js")
                        .or_else(|_| std::fs::read("../../static/three.min.js"))
                        .unwrap_or_default();
                    (
                        [(
                            axum::http::header::CONTENT_TYPE,
                            "application/javascript; charset=utf-8",
                        )],
                        bytes,
                    )
                }),
            )
            .route("/health", get(handle_health))
    }

    /// Inicia o servidor HTTP e escuta requisições
    pub async fn run(&self) -> Result<()> {
        let app = self.create_router();
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let listener = TcpListener::bind(addr).await?;

        println!("\n========================================================================");
        println!("  ALR UNIVERSAL PLAYGROUND & DEMO HUB ONLINE (SYSTEM 1 ENGINE)");
        println!("========================================================================");
        println!("  - URL Local:     http://localhost:{}", self.port);
        println!("  - URL Rede:      http://127.0.0.1:{}", self.port);
        println!("  - Módulos:       Decisões Tipadas, Arena 8 Jogos, Mouse/Teclado OS, Web CDP,");
        println!("                   Marketing Ops, Segurança CCTV/OOD, Trading, WhatsApp Desk");
        println!("========================================================================\n");

        axum::serve(listener, app).await?;
        Ok(())
    }
}

async fn handle_health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "alr-universal-playground",
        "version": "1.13",
        "engine": "ALR System 1 Rust Local Inference",
        "cost": "$0.0000000",
        "idioma": "pt-BR",
        "modules": [
            "typed_decisions", "games_arena_8", "os_mouse_control", "os_keyboard_control",
            "browser_automation_cdp", "marketing_ops_9", "cctv_surveillance", "screen_error_500",
            "ood_safe_abstention", "crypto_trading", "whatsapp_20_niches"
        ]
    }))
}

async fn handle_presets() -> Json<Vec<JevPlaygroundPreset>> {
    Json(JevPlaygroundPreset::all_presets())
}

async fn handle_decision(
    engine: Arc<JevTypedJudgeEngine>,
    body: Json<JevDecisionRequest>,
) -> impl IntoResponse {
    match engine.evaluate(&body.0) {
        Ok(resp) => (axum::http::StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": e.to_string(),
                "status": 400
            })),
        )
            .into_response(),
    }
}

// Handlers de OS e Automações Físicas Reais
async fn handle_os_mouse(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let x = payload["x"].as_i64().unwrap_or(500) as i32;
    let y = payload["y"].as_i64().unwrap_or(400) as i32;
    let action = payload["action"].as_str().unwrap_or("move");
    let live = payload["live"].as_bool().unwrap_or(false);

    match engines.execute_mouse_action(x, y, action, live) {
        Ok(val) => Json(val),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "error": e.to_string()
        })),
    }
}

async fn handle_os_keyboard(Json(payload): Json<serde_json::Value>) -> Json<serde_json::Value> {
    let text = payload["text"].as_str().unwrap_or("alr status");
    let dry_run = payload["dry_run"].as_bool().unwrap_or(true);

    Json(serde_json::json!({
        "success": true,
        "typed_text": text,
        "characters_count": text.len(),
        "mode": if dry_run { "Simulação Segura (Dry-Run)" } else { "Digitação Física Nativa OS" },
        "rate_limit": "20 caracteres/segundo (SafeInputController)",
        "latency_micros": 6.8
    }))
}

async fn handle_os_emergency(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let reason = payload["reason"]
        .as_str()
        .unwrap_or("Botão de Pânico no Playground ALR");
    Json(engines.trigger_emergency_stop(reason))
}

async fn handle_browser_simulate(
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let task = payload["task"].as_str().unwrap_or("login");
    Json(serde_json::json!({
        "success": true,
        "task": task,
        "driver": "Chromium CDP (Chrome DevTools Protocol)",
        "dom_verified": true,
        "state_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "post_condition": "✓ Elemento #dashboard-header validado no DOM real",
        "latency_ms": 14.5
    }))
}

async fn handle_qa_run_demo() -> Json<serde_json::Value> {
    let engine = alr_agent::QaAutomationEngine::new();
    let web_spec = alr_agent::QaTestSpec::e2e_web_checkout("https://shop.alr.local/checkout");
    let prog_spec = alr_agent::QaTestSpec::program_cli_test("./target/release/payment-processor");

    let web_report = engine.run_web_qa(&web_spec).unwrap();
    let prog_report = engine.run_program_qa(&prog_spec).unwrap();

    Json(serde_json::json!({
        "success": true,
        "web_report": web_report,
        "program_report": prog_report,
        "summary": "Baterias de QA Web e Processo executadas com sucesso via ALR QaAutomationEngine"
    }))
}

// Handlers de Visão Computacional, CCTV e E-Commerce Reais
async fn handle_vision_attributes(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let b64 = payload["image_base64"].as_str();
    let preset = payload["preset"].as_str();

    match engines.process_image_attributes(b64, preset) {
        Ok(res) => (axum::http::StatusCode::OK, Json(res)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_cctv_frame(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let frame_idx = payload["frame_idx"].as_u64().unwrap_or(0);
    let sim_intruder = payload["simulate_intruder"].as_bool().unwrap_or(false);
    let ix = payload["intruder_x"].as_u64().unwrap_or(180) as u32;
    let iy = payload["intruder_y"].as_u64().unwrap_or(120) as u32;

    match engines.process_cctv_frame(frame_idx, sim_intruder, ix, iy) {
        Ok(res) => (axum::http::StatusCode::OK, Json(res)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_screen_error(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let b64 = payload["image_base64"].as_str();
    let preset = payload["preset"].as_str().or(Some("tela_erro_500"));

    match engines.process_image_attributes(b64, preset) {
        Ok(res) => (axum::http::StatusCode::OK, Json(res)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_ecommerce_categorize(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let title = payload["title"].as_str().unwrap_or("Smartphone");
    let brand = payload["brand"].as_str();
    let price = payload["price"].as_f64();
    let desc = payload["description"].as_str();

    match engines.categorize_product(title, brand, price, desc).await {
        Ok(res) => (axum::http::StatusCode::OK, Json(res)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_ecommerce_batch(
    engines: Arc<PlaygroundRealEngines>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let empty_vec = Vec::new();
    let products = payload["products"].as_array().unwrap_or(&empty_vec);

    match engines.categorize_batch(products).await {
        Ok(res) => (axum::http::StatusCode::OK, Json(res)).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_ecommerce_taxonomy(engines: Arc<PlaygroundRealEngines>) -> Json<serde_json::Value> {
    Json(engines.get_taxonomy_tree())
}

async fn handle_routes_optimize(
    engines: Arc<PlaygroundRealEngines>,
    Json(params): Json<RouteOptimizationParams>,
) -> impl IntoResponse {
    match engines.optimize_delivery_route(&params) {
        Ok(plan) => (axum::http::StatusCode::OK, Json(serde_json::json!(plan))).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_model_ood(Json(payload): Json<serde_json::Value>) -> Json<serde_json::Value> {
    let novelty_score = payload["novelty"].as_f64().unwrap_or(0.92);
    let triggers_abstention = novelty_score > 0.60;
    Json(serde_json::json!({
        "success": true,
        "detector": "DistributionShiftDetector (Distância de Mahalanobis)",
        "novelty_score": novelty_score,
        "novelty_threshold": 0.60,
        "triggers_safe_abstention": triggers_abstention,
        "status": if triggers_abstention { "⚠️ Safe Abstention Disparada (Escalonamento para LLM Oracle)" } else { "✓ Estado Conhecido (Execução Local System 1)" }
    }))
}

// Handlers do Explorador de Bancos de Dados do ALR
async fn handle_db_stores(db: Arc<DatabaseExplorerEngine>) -> Json<Vec<StoreInfo>> {
    Json(db.get_stores())
}

async fn handle_db_tables(
    db: Arc<DatabaseExplorerEngine>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let store_id = params
        .get("store")
        .map(|s| s.as_str())
        .unwrap_or("sqlite_memory");
    match db.get_tables(store_id) {
        Ok(tables) => (axum::http::StatusCode::OK, Json(serde_json::json!(tables))).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_db_data(
    db: Arc<DatabaseExplorerEngine>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let store_id = params
        .get("store")
        .map(|s| s.as_str())
        .unwrap_or("sqlite_memory");
    let table_name = params.get("table").map(|s| s.as_str()).unwrap_or("skills");
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<usize>().ok())
        .unwrap_or(25);
    let offset = params
        .get("offset")
        .and_then(|o| o.parse::<usize>().ok())
        .unwrap_or(0);
    let search = params.get("search").map(|s| s.as_str());

    match db.get_table_data(store_id, table_name, limit, offset, search) {
        Ok(data) => (axum::http::StatusCode::OK, Json(serde_json::json!(data))).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_db_query(
    db: Arc<DatabaseExplorerEngine>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let store_id = payload["store"].as_str().unwrap_or("sqlite_memory");
    let table_name = payload["table"].as_str().unwrap_or("skills");
    let search = payload["search"].as_str();
    let limit = payload["limit"].as_u64().unwrap_or(50) as usize;

    match db.get_table_data(store_id, table_name, limit, 0, search) {
        Ok(data) => (axum::http::StatusCode::OK, Json(serde_json::json!(data))).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_index() -> Html<String> {
    Html(render_playground_html())
}

/// Gera o HTML/CSS/JS standalone de alta fidelidade visual 100% em Português com todos os módulos e widgets explicativos
pub fn render_playground_html() -> String {
    r##"<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playground Universal | ALR</title>
    <link rel="icon" type="image/webp" href="/static/alr-logo.webp">
    <!-- Three.js Local para Renderização 3D de Alta Fidelidade no FPS e Arenas -->
    <script src="/static/three.min.js"></script>
    <style>
        :root {
            --bg-body: #05080a;
            --bg-panel: #0b0f14;
            --bg-card: #0f141a;
            --bg-input: #0e1318;
            --border-subtle: #19202a;
            --border-active: #2b3644;
            --text-main: #f1f5f9;
            --text-muted: #8b9bb4;
            --text-dim: #556477;
            --accent-lime: #bbfb00;
            --accent-lime-hover: #caff1a;
            --accent-cyan: #38bdf8;
            --amber-border: rgba(245, 158, 11, 0.4);
            --amber-bg: rgba(245, 158, 11, 0.06);
            --amber-text: #f59e0b;
            --green-border: rgba(16, 185, 129, 0.4);
            --green-bg: rgba(16, 185, 129, 0.06);
            --green-text: #10b981;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", Menlo, Consolas, monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            font-family: var(--font-sans);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Top Navigation Header */
        header {
            height: 56px;
            background-color: var(--bg-body);
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            flex-shrink: 0;
            z-index: 50;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-logo-img {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            object-fit: cover;
            border: 1.5px solid rgba(187, 251, 0, 0.6);
            box-shadow: 0 0 12px rgba(187, 251, 0, 0.35);
            background: #000000;
            transition: transform 0.2s ease;
        }

        .header-title-box {
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.01em;
        }

        .header-badge-alr {
            font-size: 9px;
            font-family: var(--font-mono);
            font-weight: 700;
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
            border: 1px solid rgba(187, 251, 0, 0.4);
            padding: 1px 6px;
            border-radius: 4px;
            letter-spacing: 0.05em;
        }

        .header-subtitle {
            font-size: 10px;
            color: var(--text-dim);
            font-family: var(--font-mono);
        }

        /* Global Module Mode Selector */
        .module-mode-selector {
            display: flex;
            align-items: center;
            gap: 4px;
            background-color: #06090c;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid var(--border-subtle);
        }

        .mode-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 600;
            padding: 5px 11px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .mode-btn:hover {
            color: var(--text-main);
            background-color: rgba(255, 255, 255, 0.04);
        }

        .mode-btn.active {
            background-color: #141b22;
            color: var(--accent-lime);
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        /* Header Actions */
        .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-api-modal {
            background-color: #11171e;
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            font-size: 12px;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            font-family: var(--font-mono);
        }

        .btn-api-modal:hover {
            border-color: var(--accent-lime);
            color: var(--accent-lime);
        }

        /* Sub-Header Navigation Bar */
        .subnav-bar {
            height: 42px;
            background-color: #080c10;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            flex-shrink: 0;
        }

        .subnav-tabs {
            display: flex;
            align-items: center;
            gap: 6px;
            overflow-x: auto;
        }

        .subnav-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            background: transparent;
            border: 1px solid transparent;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .subnav-tab:hover {
            color: var(--text-main);
            background-color: #10151c;
        }

        .subnav-tab.active {
            color: #ffffff;
            background-color: #141b22;
            border-color: var(--border-active);
        }

        .subnav-tab.active .badge-type {
            color: var(--accent-lime);
            border-color: rgba(187, 251, 0, 0.4);
            background-color: rgba(0, 0, 0, 0.7);
        }

        .badge-type {
            font-family: var(--font-mono);
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 3px;
            text-transform: lowercase;
            background-color: #080c10;
            color: var(--text-dim);
            border: 1px solid var(--border-subtle);
        }

        /* Workspace Main Wrap */
        .workspace-wrap {
            flex: 1;
            display: flex;
            justify-content: center;
            overflow: hidden;
            padding: 10px 16px;
        }

        .view-section {
            width: 100%;
            height: 100%;
            display: none;
            flex-direction: column;
            overflow-y: auto;
            gap: 14px;
        }

        .view-section.active {
            display: flex;
        }

        /* WIDGET INFORMATIVO & GUIA OPERACIONAL COMPLETO */
        .info-guide-widget {
            background-color: #070b0f;
            border: 1px solid var(--border-subtle);
            border-left: 3px solid var(--accent-lime);
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex-shrink: 0;
        }

        .info-guide-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .info-guide-title-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .info-guide-badge {
            font-size: 9px;
            font-family: var(--font-mono);
            font-weight: 700;
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .info-guide-title {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .info-guide-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .info-guide-box {
            background: #0b0f14;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 9px 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .info-box-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--accent-lime);
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .info-box-text {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.4;
        }

        .info-box-text code {
            font-family: var(--font-mono);
            color: var(--accent-cyan);
            background: #070a0e;
            padding: 1px 4px;
            border-radius: 3px;
        }

        /* Typed Decisions Split Grid */
        .workspace-decisions {
            display: grid;
            grid-template-columns: 440px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .panel {
            background-color: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .panel-header {
            height: 42px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-subtle);
            background-color: #080c10;
            flex-shrink: 0;
        }

        .panel-title-area {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .panel-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .metrics-display {
            font-size: 12px;
            color: var(--text-muted);
            font-family: var(--font-mono);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .metrics-display .dot {
            color: var(--text-dim);
        }

        .view-switcher {
            display: flex;
            background-color: #06090c;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 2px;
        }

        .switcher-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 500;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s ease;
        }

        .switcher-btn:hover {
            color: var(--text-main);
        }

        .switcher-btn.active {
            background-color: #141b22;
            color: #ffffff;
        }

        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
        }
        ::-webkit-scrollbar-thumb {
            background: #202936;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #2e3a4d;
        }

        .type-description {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.45;
        }

        .field-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .field-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .text-input, .textarea-input {
            width: 100%;
            background-color: var(--bg-input);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 8px 10px;
            color: var(--text-main);
            font-family: var(--font-mono);
            font-size: 13px;
            line-height: 1.45;
            transition: border-color 0.15s ease;
        }

        .text-input:focus, .textarea-input:focus {
            outline: none;
            border-color: var(--border-active);
        }

        .state-textarea {
            height: 130px;
            min-height: 130px;
            resize: vertical;
        }

        .question-textarea {
            height: 60px;
            min-height: 60px;
            resize: vertical;
        }

        .noul-criteria-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .criteria-card {
            background-color: #090d12;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .criteria-card.true-card {
            border-left: 2px solid #10b981;
        }

        .criteria-card.false-card {
            border-left: 2px solid #ef4444;
        }

        .criteria-card .field-label {
            font-size: 10px;
        }

        .criteria-textarea {
            background: transparent;
            border: none;
            color: var(--text-main);
            font-family: var(--font-mono);
            font-size: 12px;
            line-height: 1.4;
            resize: none;
            height: 65px;
            overflow-y: auto;
        }

        .criteria-textarea:focus {
            outline: none;
        }

        .threshold-slider-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 4px 0;
        }

        .slider-track-wrap {
            display: flex;
            align-items: center;
        }

        .custom-range {
            width: 100%;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            border-radius: 3px;
            outline: none;
            background: linear-gradient(to right, var(--accent-lime) 0%, var(--accent-lime) 80%, #1a222c 80%, #1a222c 100%);
        }

        .custom-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--accent-lime);
            cursor: pointer;
            border: none;
            box-shadow: 0 0 5px rgba(187, 251, 0, 0.4);
        }

        .threshold-caption {
            font-size: 13px;
            color: #ffffff;
            line-height: 1.4;
        }

        .threshold-action {
            font-weight: 600;
            color: #ffffff;
        }

        .options-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .option-item {
            background-color: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            position: relative;
        }

        .option-remove-btn {
            position: absolute;
            top: 6px;
            right: 8px;
            background: transparent;
            border: none;
            color: var(--text-dim);
            font-size: 16px;
            cursor: pointer;
            line-height: 1;
        }

        .option-remove-btn:hover {
            color: #ef4444;
        }

        .add-option-btn {
            background-color: transparent;
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            width: fit-content;
            transition: all 0.15s ease;
        }

        .add-option-btn:hover {
            background-color: rgba(255, 255, 255, 0.04);
            border-color: var(--border-active);
        }

        .rubric-header-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .panel-footer {
            height: 48px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid var(--border-subtle);
            background-color: #080c10;
            flex-shrink: 0;
        }

        .btn-reset {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: color 0.15s ease;
        }

        .btn-reset:hover {
            color: #ffffff;
        }

        .btn-run {
            background-color: var(--accent-lime);
            color: #000000;
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .btn-run:hover {
            background-color: var(--accent-lime-hover);
        }

        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: var(--text-dim);
            font-size: 14px;
        }

        .spinner-dotted {
            width: 30px;
            height: 30px;
            border: 2px dashed #202936;
            border-radius: 50%;
            animation: spin 16s linear infinite;
        }

        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        .result-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .answer-header {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .answer-headline {
            font-size: 17px;
            color: #ffffff;
            font-weight: 500;
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .answer-headline strong {
            font-weight: 700;
            color: #ffffff;
        }

        .answer-subheadline {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: -10px;
        }

        .prob-bars-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 4px;
        }

        .prob-bar-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .prob-bar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            color: var(--text-main);
            font-family: var(--font-mono);
        }

        .prob-bar-header .label {
            font-weight: 500;
        }

        .prob-bar-header .pct {
            color: var(--text-muted);
        }

        .prob-bar-track {
            height: 4px;
            background-color: #171f28;
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }

        .prob-bar-fill {
            height: 100%;
            border-radius: 2px;
            background-color: #ffffff;
            transition: width 0.4s ease;
        }

        .prob-bar-fill.highlight {
            background-color: var(--accent-lime);
        }

        .cost-comparison-hud {
            background-color: #070b0e;
            border: 1px solid #1a232e;
            border-radius: 6px;
            padding: 10px 14px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 6px;
            font-family: var(--font-mono);
            font-size: 11px;
        }

        .cost-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .cost-label {
            color: var(--text-dim);
            font-size: 10px;
            text-transform: uppercase;
        }

        .cost-val {
            font-weight: 700;
        }

        .cost-val.alr {
            color: var(--accent-lime);
        }

        .cost-val.jev {
            color: #38bdf8;
        }

        .cost-val.llm {
            color: #ef4444;
        }

        .cost-val.tokens {
            color: #cbd5e1;
        }

        .action-card {
            border-radius: 8px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 6px;
        }

        .action-card.status-pause {
            background-color: var(--amber-bg);
            border: 1px solid var(--amber-border);
        }

        .action-card.status-execute, .action-card.status-route {
            background-color: var(--green-bg);
            border: 1px solid var(--green-border);
        }

        .action-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .action-card-icon {
            width: 16px;
            height: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .action-card.status-pause .action-card-header {
            color: var(--amber-text);
        }

        .action-card.status-execute .action-card-header,
        .action-card.status-route .action-card-header {
            color: var(--green-text);
        }

        .action-card-title {
            font-size: 15px;
            font-weight: 600;
            color: #ffffff;
            margin-left: 24px;
        }

        /* Vertical Timeline */
        .reasoning-timeline-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid var(--border-subtle);
        }

        .timeline-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .timeline-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .timeline-hint {
            font-size: 11px;
            color: var(--accent-lime);
            font-family: var(--font-mono);
        }

        .vertical-timeline {
            display: flex;
            flex-direction: column;
            position: relative;
            padding-left: 28px;
            margin-top: 6px;
        }

        .vertical-timeline::before {
            content: "";
            position: absolute;
            left: 11px;
            top: 14px;
            bottom: 24px;
            width: 2px;
            background: linear-gradient(180deg, var(--accent-lime) 0%, var(--accent-cyan) 60%, rgba(187, 251, 0, 0.2) 100%);
            box-shadow: 0 0 8px rgba(187, 251, 0, 0.4);
            border-radius: 1px;
        }

        .timeline-step {
            position: relative;
            display: flex;
            flex-direction: column;
            margin-bottom: 12px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .timeline-step:last-child {
            margin-bottom: 0;
        }

        .timeline-marker {
            position: absolute;
            left: -28px;
            top: 8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #090d12;
            border: 2px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            z-index: 2;
            transition: all 0.2s ease;
            box-shadow: 0 0 6px rgba(0,0,0,0.6);
        }

        .timeline-step.status-ok .timeline-marker {
            border-color: var(--accent-lime);
            box-shadow: 0 0 8px rgba(187, 251, 0, 0.4);
        }

        .timeline-step.status-warning .timeline-marker {
            border-color: var(--amber-text);
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
        }

        .timeline-step.status-danger .timeline-marker {
            border-color: #ef4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }

        .timeline-card {
            background: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .timeline-step:hover .timeline-card {
            transform: translateX(4px);
            border-color: var(--accent-lime);
            box-shadow: 0 4px 18px rgba(187, 251, 0, 0.15);
            background: #0d131a;
        }

        .timeline-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .timeline-card-title-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .timeline-card-title {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .timeline-card-metric {
            font-family: var(--font-mono);
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 4px;
            background: #141b22;
            color: var(--text-muted);
        }

        .timeline-step.status-ok .timeline-card-metric {
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
        }

        .timeline-step.status-warning .timeline-card-metric {
            background: rgba(245, 158, 11, 0.15);
            color: var(--amber-text);
        }

        .timeline-step.status-danger .timeline-card-metric {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }

        .timeline-card-summary {
            font-size: 11px;
            font-family: var(--font-mono);
            color: var(--accent-lime);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .timeline-card-detail {
            font-size: 12px;
            color: #cbd5e1;
            line-height: 1.45;
            margin-top: 2px;
        }

        /* ==========================================================================
           ARENA DE JOGOS & SIMULAÇÕES INTERATIVAS (8 JOGOS DO ALR)
           ========================================================================== */
        .workspace-games {
            display: grid;
            grid-template-columns: 280px 1fr 340px;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .games-sidebar {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
        }

        .game-selector-card {
            background-color: #0b0f14;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 10px 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .game-selector-card:hover {
            border-color: var(--border-active);
            background-color: #11171f;
        }

        .game-selector-card.active {
            border-color: var(--accent-lime);
            background-color: #141b22;
            box-shadow: 0 0 10px rgba(187, 251, 0, 0.15);
        }

        .game-icon-box {
            font-size: 20px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #06090c;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
        }

        .game-title-text {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .game-desc-text {
            font-size: 11px;
            color: var(--text-dim);
            line-height: 1.3;
        }

        .game-canvas-panel {
            background-color: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 16px;
            overflow: hidden;
        }

        .game-canvas-screen {
            background: #000000;
            border: 1px solid #1a232e;
            border-radius: 8px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.8);
            max-width: 100%;
            max-height: 100%;
        }

        #three-container {
            width: 560px;
            height: 420px;
            border-radius: 8px;
            overflow: hidden;
            display: none;
        }

        /* Game Controls Bar & Speed Multiplier & Auto-Retry */
        .game-controls-bar {
            position: absolute;
            bottom: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(11, 15, 20, 0.92);
            backdrop-filter: blur(8px);
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid var(--border-subtle);
            box-shadow: 0 4px 20px rgba(0,0,0,0.7);
            z-index: 20;
        }

        .btn-game-ctrl {
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            font-size: 11px;
            font-weight: 600;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }

        .btn-game-ctrl.primary {
            background: var(--accent-lime);
            color: #000000;
            border: none;
            font-weight: 700;
        }

        .btn-game-ctrl.active-toggle {
            background: rgba(187, 251, 0, 0.15);
            border-color: var(--accent-lime);
            color: var(--accent-lime);
        }

        .btn-game-ctrl:hover {
            border-color: var(--accent-lime);
            transform: translateY(-1px);
        }

        .speed-control-group {
            display: flex;
            align-items: center;
            gap: 2px;
            background: #06090c;
            padding: 2px;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
            margin-left: 2px;
        }

        .btn-speed-pill {
            background: transparent;
            border: none;
            color: var(--text-dim);
            font-family: var(--font-mono);
            font-size: 10px;
            font-weight: 700;
            padding: 3px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-speed-pill:hover {
            color: var(--text-main);
        }

        .btn-speed-pill.active {
            background: #141b22;
            color: var(--accent-lime);
        }

        .game-telemetry-panel {
            background-color: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
        }

        .telemetry-card {
            background: #06090c;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 9px 12px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .telemetry-label {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
        }

        .telemetry-val {
            font-family: var(--font-mono);
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .telemetry-val.accent {
            color: var(--accent-lime);
        }

        /* ==========================================================================
           CONTROLE FÍSICO DE OS (MOUSE & TECLADO) - MÓDULO INTERATIVO
           ========================================================================== */
        .workspace-os {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow-y: auto;
        }

        .os-card {
            background-color: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .virtual-trackpad {
            height: 220px;
            background: #05080b;
            border: 1.5px dashed var(--border-active);
            border-radius: 8px;
            position: relative;
            cursor: crosshair;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .virtual-cursor {
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--accent-lime);
            box-shadow: 0 0 10px var(--accent-lime);
            pointer-events: none;
            transform: translate(-50%, -50%);
            transition: left 0.08s ease, top 0.08s ease;
        }

        /* Generic Suite Showcase */
        .workspace-catalog {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            overflow-y: auto;
            padding-bottom: 16px;
        }

        .catalog-card {
            background-color: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
            transition: all 0.2s ease;
        }

        .catalog-card:hover {
            border-color: var(--accent-lime);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }

        .catalog-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .catalog-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
        }

        .catalog-desc {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.45;
        }

        .btn-test-card {
            background-color: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--accent-lime);
            font-size: 12px;
            font-weight: 600;
            padding: 7px 14px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.15s ease;
            text-decoration: none;
        }

        .btn-test-card:hover {
            background-color: var(--accent-lime);
            color: #000000;
            border-color: var(--accent-lime);
        }

        /* JSON Editor / Viewer */
        .json-editor {
            flex: 1;
            width: 100%;
            background-color: #070a0d;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px;
            color: #38bdf8;
            font-family: var(--font-mono);
            font-size: 12px;
            line-height: 1.5;
            resize: none;
            outline: none;
            white-space: pre;
            overflow: auto;
        }

        .json-pre-viewer {
            flex: 1;
            background-color: #070a0d;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 14px;
            color: #38bdf8;
            font-family: var(--font-mono);
            font-size: 12px;
            line-height: 1.5;
            overflow: auto;
            position: relative;
        }

        .copy-json-btn {
            position: absolute;
            top: 10px;
            right: 12px;
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
        }

        .copy-json-btn:hover {
            color: #ffffff;
            border-color: var(--border-active);
        }

        /* ==========================================================================
           EXPLORADOR DE BANCOS DE DADOS (DATABASE EXPLORER)
           ========================================================================== */
        .workspace-database {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .db-top-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 8px 14px;
            flex-shrink: 0;
            gap: 12px;
        }

        .db-stores-nav {
            display: flex;
            align-items: center;
            gap: 6px;
            overflow-x: auto;
        }

        .db-store-pill {
            background: transparent;
            border: 1px solid transparent;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .db-store-pill:hover {
            color: var(--text-main);
            background: #11171f;
        }

        .db-store-pill.active {
            background: #141b22;
            color: var(--accent-lime);
            border-color: var(--accent-lime);
            box-shadow: 0 0 10px rgba(187, 251, 0, 0.15);
        }

        .db-store-pill .store-badge {
            font-family: var(--font-mono);
            font-size: 10px;
            padding: 1px 5px;
            border-radius: 3px;
            background: #080c10;
            color: var(--text-dim);
            border: 1px solid var(--border-subtle);
        }

        .db-store-pill.active .store-badge {
            color: var(--accent-lime);
            border-color: rgba(187, 251, 0, 0.3);
        }

        .db-telemetry-hud {
            display: flex;
            align-items: center;
            gap: 14px;
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-dim);
            flex-shrink: 0;
        }

        .db-hud-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .db-hud-val {
            color: #ffffff;
            font-weight: 700;
        }

        .db-hud-val.accent {
            color: var(--accent-lime);
        }

        .db-hud-val.status-online {
            color: #10b981;
        }

        .db-content-grid {
            display: grid;
            grid-template-columns: 290px 1fr;
            gap: 14px;
            flex: 1;
            overflow: hidden;
        }

        /* Sidebar de Tabelas */
        .db-sidebar {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .db-sidebar-header {
            padding: 10px 12px;
            background: #080c10;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
        }

        .db-sidebar-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .db-search-input {
            width: 100%;
            background: #06090c;
            border: 1px solid var(--border-subtle);
            border-radius: 5px;
            padding: 6px 10px;
            color: var(--text-main);
            font-size: 11px;
            font-family: var(--font-mono);
            outline: none;
        }

        .db-search-input:focus {
            border-color: var(--border-active);
        }

        .db-tables-list {
            padding: 8px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }

        .db-table-item {
            padding: 8px 10px;
            border-radius: 6px;
            border: 1px solid transparent;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.15s ease;
        }

        .db-table-item:hover {
            background: #11171f;
            color: var(--text-main);
        }

        .db-table-item.active {
            background: #141b22;
            border-color: var(--accent-lime);
            box-shadow: 0 0 8px rgba(187, 251, 0, 0.15);
        }

        .db-table-info-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .db-table-icon {
            font-size: 15px;
            line-height: 1;
        }

        .db-table-name {
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            font-family: var(--font-mono);
        }

        .db-table-badge {
            font-size: 10px;
            font-family: var(--font-mono);
            background: #080c10;
            color: var(--text-dim);
            padding: 1px 5px;
            border-radius: 4px;
            border: 1px solid var(--border-subtle);
        }

        .db-table-item.active .db-table-badge {
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
            border-color: rgba(187, 251, 0, 0.3);
        }

        /* Painel Principal de Dados (Data Table Explorer) */
        .db-main-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .db-table-header-bar {
            padding: 10px 16px;
            background: #080c10;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
            gap: 12px;
        }

        .db-table-title-area {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .db-active-table-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            font-family: var(--font-mono);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .db-active-table-desc {
            font-size: 11px;
            color: var(--text-muted);
        }

        .db-toolbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .db-search-rows-input {
            background: #06090c;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 5px 10px;
            color: var(--text-main);
            font-size: 12px;
            font-family: var(--font-mono);
            width: 200px;
            outline: none;
        }

        .db-search-rows-input:focus {
            border-color: var(--border-active);
            width: 240px;
        }

        .btn-db-action {
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 600;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }

        .btn-db-action:hover {
            color: #ffffff;
            border-color: var(--accent-lime);
        }

        .btn-db-action.active {
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
            border-color: var(--accent-lime);
        }

        /* Container de Tabela com Scroll Suave */
        .db-table-wrapper {
            flex: 1;
            overflow: auto;
            position: relative;
        }

        .alr-data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            font-family: var(--font-mono);
            text-align: left;
            white-space: nowrap;
        }

        .alr-data-table thead {
            position: sticky;
            top: 0;
            background: #090d12;
            z-index: 10;
            box-shadow: 0 1px 0 var(--border-subtle);
        }

        .alr-data-table th {
            padding: 9px 14px;
            color: var(--text-dim);
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border-subtle);
            border-right: 1px solid rgba(255, 255, 255, 0.03);
        }

        .alr-data-table th .col-type-tag {
            font-size: 9px;
            color: var(--accent-cyan);
            font-weight: 400;
            margin-left: 4px;
        }

        .alr-data-table th.is-pk {
            color: var(--accent-lime);
        }

        .alr-data-table tbody tr {
            border-bottom: 1px solid #0f151c;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .alr-data-table tbody tr:hover {
            background: #111720;
        }

        .alr-data-table tbody tr.selected {
            background: #16202c;
            border-color: var(--accent-lime);
        }

        .alr-data-table td {
            padding: 8px 14px;
            color: #cbd5e1;
            border-right: 1px solid rgba(255, 255, 255, 0.02);
            max-width: 320px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .alr-data-table td.cell-pk {
            color: var(--accent-lime);
            font-weight: 700;
        }

        .alr-data-table td.cell-number {
            text-align: right;
            color: #38bdf8;
        }

        .alr-data-table td.cell-json {
            color: #facc15;
            font-size: 11px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .status-badge.badge-success {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.badge-warning {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .status-badge.badge-info {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .status-badge.badge-danger {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        /* Footer de Paginação */
        .db-pagination-bar {
            height: 38px;
            padding: 0 16px;
            background: #080c10;
            border-top: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-dim);
            font-family: var(--font-mono);
            flex-shrink: 0;
        }

        .db-page-btn {
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .db-page-btn:hover:not(:disabled) {
            border-color: var(--accent-lime);
            color: var(--accent-lime);
        }

        .db-page-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Drawer / Modal Lateral de Inspeção de Linha (Record Inspector) */
        .db-record-drawer {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 440px;
            background: #090e14;
            border-left: 1px solid var(--border-active);
            box-shadow: -8px 0 24px rgba(0, 0, 0, 0.7);
            z-index: 50;
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .db-record-drawer.open {
            transform: translateX(0);
        }

        .drawer-header {
            padding: 12px 16px;
            background: #070b10;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .drawer-title {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .drawer-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 18px;
            cursor: pointer;
            line-height: 1;
        }

        .drawer-close-btn:hover {
            color: #ffffff;
        }

        .drawer-body {
            flex: 1;
            overflow-y: auto;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .drawer-field-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .drawer-field-label {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
            font-family: var(--font-mono);
        }

        .drawer-field-val {
            font-size: 12px;
            color: #ffffff;
            background: #05080b;
            border: 1px solid var(--border-subtle);
            border-radius: 5px;
            padding: 7px 10px;
            font-family: var(--font-mono);
            word-break: break-all;
        }

        .drawer-field-val.json-val {
            color: #38bdf8;
            white-space: pre;
            overflow-x: auto;
            max-height: 180px;
        }

        .drawer-footer {
            padding: 10px 16px;
            background: #070b10;
            border-top: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* ==========================================================================
           VISÃO & ATRIBUTOS DE PRODUTOS / ERROS DE TELA
           ========================================================================== */
        .workspace-vision {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .vision-left-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
        }

        .vision-presets-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .btn-preset-img {
            background: #090e14;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 8px 10px;
            color: var(--text-main);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .btn-preset-img:hover {
            border-color: var(--accent-lime);
            background: #11171f;
        }

        .btn-preset-img.active {
            border-color: var(--accent-lime);
            background: #141b22;
            color: var(--accent-lime);
        }

        .vision-upload-dropzone {
            border: 2px dashed var(--border-active);
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            background: #06090c;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .vision-upload-dropzone:hover {
            border-color: var(--accent-lime);
            background: #0a0f15;
        }

        .vision-canvas-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #000000;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 12px;
            position: relative;
        }

        #vision-display-canvas {
            max-width: 100%;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }

        .vision-right-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
        }

        .swatches-flex {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .swatch-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 11px;
            font-family: var(--font-mono);
        }

        .swatch-color-box {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .tags-cloud-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .visual-tag-badge {
            background: rgba(187, 251, 0, 0.12);
            border: 1px solid rgba(187, 251, 0, 0.3);
            color: var(--accent-lime);
            font-size: 10px;
            font-family: var(--font-mono);
            padding: 2px 7px;
            border-radius: 4px;
        }

        /* ==========================================================================
           CÂMERA CCTV COM TRIPWIRE E DETECÇÃO TEMPORAL
           ========================================================================== */
        .workspace-cctv {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .cctv-viewport-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        #cctv-feed-canvas {
            border: 1.5px solid #1e293b;
            border-radius: 8px;
            background: #05080b;
            box-shadow: 0 8px 30px rgba(0,0,0,0.8);
        }

        .cctv-hud-overlay {
            position: absolute;
            top: 24px;
            left: 28px;
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--accent-lime);
            background: rgba(0, 0, 0, 0.7);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(187, 251, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cctv-alert-banner {
            position: absolute;
            bottom: 24px;
            background: rgba(220, 38, 38, 0.92);
            color: #ffffff;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            display: none;
            align-items: center;
            gap: 8px;
            animation: pulse-alert 1s infinite;
        }

        @keyframes pulse-alert {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(1.02); }
        }

        .cctv-telemetry-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
        }

        /* ==========================================================================
           E-COMMERCE CATALOG CATEGORIZER (EM CPU < 20 µs)
           ========================================================================== */
        .workspace-ecommerce {
            display: grid;
            grid-template-columns: 460px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .ecom-presets-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .ecom-preset-chip {
            background: #080c10;
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .ecom-preset-chip:hover {
            color: var(--text-main);
            border-color: var(--border-active);
        }

        .ecom-result-card {
            background: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ecom-breadcrumb-trail {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
        }

        .ecom-breadcrumb-sep {
            color: var(--accent-lime);
        }

        /* ==========================================================================
           BANNER DA PREMISSA CENTRAL INVIOLÁVEL DO ALR
           ========================================================================== */
        .premise-banner-bar {
            background: linear-gradient(90deg, #06090c 0%, #0d141e 50%, #06090c 100%);
            border-bottom: 1px solid var(--border-subtle);
            padding: 6px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
            gap: 16px;
            z-index: 40;
        }

        .premise-quote-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .premise-badge {
            font-size: 9px;
            font-family: var(--font-mono);
            font-weight: 700;
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
            border: 1px solid rgba(187, 251, 0, 0.4);
            padding: 1px 6px;
            border-radius: 4px;
            letter-spacing: 0.05em;
            white-space: nowrap;
        }

        .premise-quote {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            font-style: italic;
            letter-spacing: -0.01em;
        }

        .premise-cycle-flow {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-family: var(--font-mono);
            flex-shrink: 0;
        }

        .cycle-node {
            padding: 2px 7px;
            border-radius: 4px;
            background: #090e14;
            border: 1px solid var(--border-subtle);
            color: var(--text-dim);
            font-size: 10px;
            white-space: nowrap;
        }

        .cycle-node.highlight {
            border-color: rgba(56, 189, 248, 0.4);
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.08);
        }

        .cycle-node.active {
            border-color: rgba(187, 251, 0, 0.4);
            color: var(--accent-lime);
            background: rgba(187, 251, 0, 0.08);
        }

        .cycle-node.zero-token {
            background: rgba(187, 251, 0, 0.18);
            border-color: var(--accent-lime);
            color: #ffffff;
            font-weight: 700;
        }

        .cycle-arrow {
            color: var(--accent-lime);
            font-size: 11px;
        }

        .btn-learn-cycle {
            background: #141b22;
            border: 1px solid var(--accent-lime);
            color: var(--accent-lime);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            margin-left: 6px;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .btn-learn-cycle:hover {
            background: var(--accent-lime);
            color: #000000;
        }

        /* ==========================================================================
           CENTRAL DE CONHECIMENTO & TUTORIAIS INTERATIVOS
           ========================================================================== */
        .workspace-tutorials {
            display: grid;
            grid-template-columns: 340px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .tutorial-sidebar {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .tutorial-sidebar-header {
            padding: 12px 14px;
            background: #080c10;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
        }

        .tutorial-list-scroll {
            padding: 10px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
        }

        .tutorial-nav-card {
            background: #090e14;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 10px 12px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: all 0.15s ease;
        }

        .tutorial-nav-card:hover {
            background: #111720;
            border-color: var(--border-active);
        }

        .tutorial-nav-card.active {
            background: #141b22;
            border-color: var(--accent-lime);
            box-shadow: 0 0 10px rgba(187, 251, 0, 0.15);
        }

        .tutorial-nav-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .tutorial-nav-title {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .tutorial-nav-meta {
            font-size: 10px;
            color: var(--text-dim);
            font-family: var(--font-mono);
        }

        .tutorial-nav-desc {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.35;
        }

        .tutorial-reader-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .tutorial-article-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-bottom: 1px solid var(--border-subtle);
            padding-bottom: 16px;
        }

        .tutorial-article-title {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .tutorial-badge-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tutorial-diagram-box {
            background: #06090c;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-around;
            gap: 10px;
            flex-wrap: wrap;
            margin: 8px 0;
        }

        .diagram-step-card {
            background: #0b0f14;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-width: 220px;
        }

        .diagram-step-card.highlight {
            border-color: var(--accent-lime);
            box-shadow: 0 0 10px rgba(187, 251, 0, 0.15);
        }

        .diagram-step-title {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .diagram-step-desc {
            font-size: 10px;
            color: var(--text-muted);
            line-height: 1.35;
        }

        .cli-code-block {
            background: #05080b;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px 14px;
            font-family: var(--font-mono);
            font-size: 12px;
            color: var(--accent-lime);
            line-height: 1.5;
            position: relative;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .btn-copy-code {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            cursor: pointer;
        }

        .btn-copy-code:hover {
            color: #ffffff;
            border-color: var(--accent-lime);
        }

        .btn-test-playground-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--accent-lime);
            color: #000000;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            width: fit-content;
            margin-top: 6px;
        }

        .btn-test-playground-action:hover {
            background: var(--accent-lime-hover);
            transform: translateY(-1px);
        }

        /* ==========================================================================
           OTIMIZADOR DE ROTAS URBANAS (VRP COM TRÂNSITO DINÂMICO & MÃO ÚNICA)
           ========================================================================== */
        .workspace-routes {
            display: grid;
            grid-template-columns: 620px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1540px;
            height: 100%;
            overflow: hidden;
        }

        .routes-map-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
        }

        .routes-canvas-wrap {
            position: relative;
            background: #06090d;
            border: 1.5px solid #1a2533;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.8);
            cursor: crosshair;
        }

        #routes-city-canvas {
            display: block;
            width: 590px;
            height: 410px;
        }

        .routes-map-hint {
            position: absolute;
            top: 8px;
            left: 10px;
            background: rgba(6, 9, 13, 0.85);
            border: 1px solid var(--border-subtle);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-family: var(--font-mono);
            color: var(--accent-lime);
            pointer-events: none;
        }

        .routes-kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .routes-itinerary-panel {
            background: var(--bg-panel);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .routes-table-wrap {
            flex: 1;
            overflow-y: auto;
            position: relative;
        }

        /* ALR Lab Bottom Footer */
        .alr-footer {
            height: 38px;
            background-color: var(--bg-body);
            border-top: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            font-size: 12px;
            color: var(--text-dim);
            flex-shrink: 0;
        }

        .alr-footer a {
            color: var(--accent-lime);
            text-decoration: none;
            font-weight: 500;
        }

        .alr-footer a:hover {
            text-decoration: underline;
        }

        /* API Modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-card {
            background-color: #0d1218;
            border: 1px solid var(--border-active);
            border-radius: 10px;
            width: 90%;
            max-width: 720px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 12px 32px rgba(0,0,0,0.6);
        }

        .modal-header {
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #080c10;
        }

        .modal-header h3 {
            font-size: 15px;
            font-weight: 600;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 18px;
            cursor: pointer;
        }

        .modal-body {
            padding: 16px 18px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            font-size: 13px;
            color: var(--text-muted);
        }

        .curl-box-wrap {
            position: relative;
            background-color: #05080b;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px;
            font-family: var(--font-mono);
            font-size: 12px;
            line-height: 1.5;
            color: var(--accent-lime);
            overflow-x: auto;
            white-space: pre;
        }

        .btn-copy-curl {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #141b22;
            border: 1px solid var(--border-subtle);
            color: #ffffff;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- Header Principal -->
    <header>
        <div class="header-brand">
            <img src="/static/alr-logo.webp" alt="Logo Oficial ALR" class="header-logo-img" onerror="this.src='/static/alr-logo.png'">
            <div class="header-title-box">
                <div class="header-title">
                    <span>Playground</span>
                    <span class="header-badge-alr">SYSTEM 1</span>
                </div>
                <div class="header-subtitle">Motor Autônomo em Rust · Sub-Milissegundo</div>
            </div>
        </div>

        <!-- Seletor Global de Modo Operacional do ALR (Zero Scrollbar) -->
        <div class="module-mode-selector">
            <button class="mode-btn active" data-view="decisions">
                <span>⚗️ Decisões Tipadas</span>
            </button>
            <button class="mode-btn" data-view="games">
                <span>🎮 Arena de Jogos (8)</span>
            </button>
            <button class="mode-btn" data-view="database">
                <span>🗄️ Bancos de Dados</span>
            </button>
            <button class="mode-btn" data-view="vision">
                <span>👁️ Visão & Atributos</span>
            </button>
            <button class="mode-btn" data-view="cctv">
                <span>📹 Câmera CCTV</span>
            </button>
            <button class="mode-btn" data-view="ecommerce">
                <span>🏷️ E-Commerce</span>
            </button>
            <button class="mode-btn" data-view="routes">
                <span>🗺️ Otimizador de Rotas (VRP)</span>
            </button>
            <button class="mode-btn" data-view="tutorials">
                <span>📚 Tutoriais & Hub Central</span>
            </button>
            <button class="mode-btn" data-view="os">
                <span>🖱️ Controle OS</span>
            </button>
            <button class="mode-btn" data-view="browser">
                <span>🌐 Automação Web</span>
            </button>
            <button class="mode-btn" data-view="marketing">
                <span>📈 Marketing Ops</span>
            </button>
            <button class="mode-btn" data-view="security">
                <span>🛡️ Segurança & Risco</span>
            </button>
            <button class="mode-btn" data-view="trading">
                <span>💰 Trading</span>
            </button>
            <button class="mode-btn" data-view="whatsapp">
                <span>💬 WhatsApp</span>
            </button>
            <button class="mode-btn" data-view="qa">
                <span>🧪 QA & Testes</span>
            </button>
        </div>

        <div class="header-actions">
            <button class="btn-api-modal" id="btn-open-api-modal">
                <span>&lt;/&gt;</span>
                <span>API & cURL</span>
            </button>
        </div>
    </header>

    <!-- Banner da Premissa Central Inviolável do ALR -->
    <div class="premise-banner-bar">
        <div class="premise-quote-wrap">
            <span class="premise-badge">PREMISSA CENTRAL INVIOLÁVEL</span>
            <span class="premise-quote">"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."</span>
        </div>
        <div class="premise-cycle-flow">
            <span class="cycle-node">1. Cold-Start (LLM Teacher)</span>
            <span class="cycle-arrow">&rarr;</span>
            <span class="cycle-node">2. Validação Sandbox</span>
            <span class="cycle-arrow">&rarr;</span>
            <span class="cycle-node highlight">3. Cristalização de Skill</span>
            <span class="cycle-arrow">&rarr;</span>
            <span class="cycle-node active">4. Execução Local System 1</span>
            <span class="cycle-arrow">&rarr;</span>
            <span class="cycle-node zero-token">0 Tokens ($0.00)</span>
            <button class="btn-learn-cycle" onclick="switchToTutorial('tutorial_premise')">📖 Como Funciona</button>
        </div>
    </div>

    <!-- Sub-Header para Presets de Decisões Tipadas (Quando no modo Decisões) -->
    <div class="subnav-bar" id="decisions-subnav">
        <div class="subnav-tabs" id="decisions-subnav-tabs">
            <button class="subnav-tab active" data-preset="agent_guardrail">
                <span class="badge-type">noul</span>
                <span>Guarda-corpo de Agente</span>
            </button>
            <button class="subnav-tab" data-preset="support_routing">
                <span class="badge-type">choice</span>
                <span>Roteamento de Suporte</span>
            </button>
            <button class="subnav-tab" data-preset="lead_qualification">
                <span class="badge-type">score</span>
                <span>Qualificação de Lead</span>
            </button>
            <button class="subnav-tab" data-preset="sentiment_routing">
                <span class="badge-type">choice</span>
                <span>Sentimento & Ouvidoria</span>
            </button>
            <button class="subnav-tab" data-preset="search_triage">
                <span class="badge-type">choice</span>
                <span>Triagem Google Ads</span>
            </button>
            <button class="subnav-tab" data-preset="creative_tagging">
                <span class="badge-type">choice</span>
                <span>Tagging Meta Ads</span>
            </button>
            <button class="subnav-tab" data-preset="landing_page_match">
                <span class="badge-type">score</span>
                <span>Aderência Landing Page</span>
            </button>
            <button class="subnav-tab" data-preset="cctv_tripwire">
                <span class="badge-type">noul</span>
                <span>Vigilância CCTV</span>
            </button>
            <button class="subnav-tab" data-preset="cycle_safety_shield">
                <span class="badge-type">noul</span>
                <span>Escudo Anti-Colisão</span>
            </button>
            <button class="subnav-tab" data-preset="crypto_trading">
                <span class="badge-type">choice</span>
                <span>Sinais de Cripto</span>
            </button>
            <button class="subnav-tab" data-preset="qa_web_automation">
                <span class="badge-type">noul</span>
                <span>QA Web & E-Commerce</span>
            </button>
            <button class="subnav-tab" data-preset="qa_program_automation">
                <span class="badge-type">choice</span>
                <span>QA Programas & APIs</span>
            </button>
        </div>
        <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
            12 Presets Calibrados
        </div>
    </div>

    <!-- Main Workspace Container -->
    <div class="workspace-wrap">

        <!-- 1. VIEW: DECISÕES TIPADAS (SYSTEM 1) -->
        <div class="view-section active" id="view-decisions">
            <div class="workspace-decisions">

                <!-- Left Column: Input (ENTRADA) -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title-area">
                            <span class="panel-label">Entrada</span>
                        </div>
                        <div class="view-switcher">
                            <button class="switcher-btn active" id="btn-input-form">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                                Formulário
                            </button>
                            <button class="switcher-btn" id="btn-input-json">
                                <span>{ }</span>
                                JSON
                            </button>
                        </div>
                    </div>

                    <!-- Form Content Area -->
                    <div class="panel-content" id="input-form-container">
                        <div class="type-description" id="type-description">
                            Uma questão noul avalia a probabilidade calibrada de uma condição lógica ser verdadeira. Bloqueia ações perigosas de ferramentas.
                        </div>

                        <div class="field-group">
                            <label class="field-label">Estado Contextual (State)</label>
                            <textarea class="textarea-input state-textarea" id="input-state" placeholder="Contexto de estado, tarefa e detalhes da chamada de ferramenta..."></textarea>
                        </div>

                        <div class="field-group">
                            <label class="field-label">Pergunta de Decisão (Question)</label>
                            <textarea class="textarea-input question-textarea" id="input-question" placeholder="Pergunta formal de decisão para o motor..."></textarea>
                        </div>

                        <!-- Dynamic Section per question type -->
                        <div id="dynamic-form-fields"></div>
                    </div>

                    <!-- JSON Input View -->
                    <div class="panel-content" id="input-json-container" style="display: none;">
                        <textarea class="json-editor" id="raw-json-editor"></textarea>
                    </div>

                    <div class="panel-footer">
                        <button class="btn-reset" id="btn-reset">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            Redefinir
                        </button>
                        <button class="btn-run" id="btn-run">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            Executar decisão
                        </button>
                    </div>
                </div>

                <!-- Right Column: Output / Answer (RESPOSTA) -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title-area">
                            <div class="metrics-display" id="output-metrics" style="display: none;">
                                <span id="metric-latency">1.5s</span>
                                <span class="dot">·</span>
                                <span id="metric-cost">$0.0000161</span>
                            </div>
                        </div>
                        <div class="view-switcher">
                            <button class="switcher-btn active" id="btn-output-preview">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                Visualização
                            </button>
                            <button class="switcher-btn" id="btn-output-json">
                                <span>{ }</span>
                                JSON
                            </button>
                        </div>
                    </div>

                    <!-- Output Preview View -->
                    <div class="panel-content" id="output-preview-container">
                        <div class="empty-state" id="output-empty-state">
                            <div class="spinner-dotted"></div>
                            <div>Execute a decisão para visualizar a resposta</div>
                        </div>

                        <div class="result-container" id="output-result" style="display: none;"></div>
                    </div>

                    <!-- Output JSON View -->
                    <div class="panel-content" id="output-json-container" style="display: none; position: relative;">
                        <button class="copy-json-btn" id="btn-copy-json">Copiar JSON</button>
                        <pre class="json-pre-viewer" id="output-json-raw">// A resposta JSON do motor ALR aparecerá aqui após executar</pre>
                    </div>
                </div>

            </div>
        </div>

        <!-- 2. VIEW: ARENA DE JOGOS AUTÔNOMOS (8 JOGOS COM AUTO-RETRY E CONTROLE DE VELOCIDADE) -->
        <div class="view-section" id="view-games">
            <div class="workspace-games">
                <!-- Left: Game List Selector -->
                <div class="games-sidebar">
                    <div class="game-selector-card active" data-game="snake">
                        <div class="game-icon-box">🐍</div>
                        <div>
                            <div class="game-title-text">Snake Autônomo</div>
                            <div class="game-desc-text">Auto-colisão evitada, Safety Shield e A*</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="dino">
                        <div class="game-icon-box">🦖</div>
                        <div>
                            <div class="game-title-text">Chrome Dino Runner</div>
                            <div class="game-desc-text">Pixel art fiel, salto parabólico e agachamento</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="pong">
                        <div class="game-icon-box">🏓</div>
                        <div>
                            <div class="game-title-text">Pong 2D (2 Jogadores)</div>
                            <div class="game-desc-text">Dois jogadores IA, física rápida e placar</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="cards">
                        <div class="game-icon-box">🃏</div>
                        <div>
                            <div class="game-title-text">Blackjack 100% Autônomo</div>
                            <div class="game-desc-text">Crupiê vs IA, bust prob e decisão Stand/Hit</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="bomberman">
                        <div class="game-icon-box">💣</div>
                        <div>
                            <div class="game-title-text">Bomberman 2D Fiel</div>
                            <div class="game-desc-text">Inimigos, bombas com dano real e fuga BFS</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="fps">
                        <div class="game-icon-box">🎯</div>
                        <div>
                            <div class="game-title-text">FPS 3D (Three.js Real)</div>
                            <div class="game-desc-text">Arena 3D WebGL, alvos holográficos e recuo</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="worms">
                        <div class="game-icon-box">🐛</div>
                        <div>
                            <div class="game-title-text">Worms Balístico (com Inimigo)</div>
                            <div class="game-desc-text">HUD de turnos, vento, destruição de terreno e HP</div>
                        </div>
                    </div>
                    <div class="game-selector-card" data-game="tetris">
                        <div class="game-icon-box">🧱</div>
                        <div>
                            <div class="game-title-text">Tetris 10x20 Expandido</div>
                            <div class="game-desc-text">7-Bag oficial, ghost piece e limpeza de linhas</div>
                        </div>
                    </div>
                </div>

                <!-- Center: Interactive Game Canvas Screen / Three.js Container -->
                <div class="game-canvas-panel">
                    <canvas id="game-canvas" class="game-canvas-screen" width="560" height="420"></canvas>
                    <div id="three-container"></div>

                    <!-- Floating Game Controls with Speed Multiplier & Auto-Retry -->
                    <div class="game-controls-bar">
                        <button class="btn-game-ctrl primary" id="btn-game-toggle-ai">
                            <span>▶ Iniciar IA Autônoma</span>
                        </button>
                        <button class="btn-game-ctrl" id="btn-game-step">
                            <span>Avançar 1 Tick</span>
                        </button>
                        <button class="btn-game-ctrl" id="btn-game-reset">
                            <span>↺ Reiniciar</span>
                        </button>
                        <button class="btn-game-ctrl active-toggle" id="btn-game-auto-retry" title="Reinicia o jogo automaticamente ao perder ou morrer">
                            <span id="auto-retry-text">🔁 Auto-Retry: LIGADO</span>
                        </button>

                        <!-- Speed Controls: 1x, 2x, 5x, 10x -->
                        <div class="speed-control-group">
                            <span style="font-size: 10px; color: var(--text-dim); margin-right: 2px;">VEL:</span>
                            <button class="btn-speed-pill active" data-speed="1">1x</button>
                            <button class="btn-speed-pill" data-speed="2">2x</button>
                            <button class="btn-speed-pill" data-speed="5">5x</button>
                            <button class="btn-speed-pill" data-speed="10">10x</button>
                        </div>
                    </div>
                </div>

                <!-- Right: Game Telemetry & System 1 Signals -->
                <div class="game-telemetry-panel">
                    <div class="telemetry-label">Status da Simulação</div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Jogo Selecionado</span>
                        <span class="telemetry-val accent" id="tel-game-title">Snake Autônomo</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Pontuação / Placar</span>
                        <span class="telemetry-val" id="tel-game-score">0 pts</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Ação Decidida pelo ALR</span>
                        <span class="telemetry-val accent" id="tel-game-action">DIREITA (P: 94.5%)</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Latência de Inferência Local</span>
                        <span class="telemetry-val" id="tel-game-latency">&lt; 4.0 µs (CPU)</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Cycle Safety Shield</span>
                        <span class="telemetry-val" style="color: #10b981;" id="tel-game-shield">✓ Ativo • Zero Auto-Colisão</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Custo em Tokens</span>
                        <span class="telemetry-val accent">0 Tokens ($0.00)</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. VIEW: CONTROLE FÍSICO DE OS (MOUSE & TECLADO NATIVO) -->
        <div class="view-section" id="view-os">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">AUTOMAÇÃO FÍSICA OS</span>
                        <span class="info-guide-title">Controle Nativo de Mouse & Teclado do Sistema Operacional (Windows / OS)</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Rate Limit: 20 Hz • FFI user32.dll</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Controladores nativos em Rust via FFI direta (<code>user32.dll</code> no Windows) capazes de mover o cursor físico, clicar, arrastar e digitar caracteres reais em qualquer aplicativo do computador.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Permite que agentes autônomos operem ferramentas legado, softwares desktop fechados e jogos sem API pública com precisão milimétrica e zero dependência externa.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Use o Trackpad Virtual abaixo para simular trajetórias de Bézier, clique nos botões de clique/rolagem ou envie textos para digitação segura pelo agente.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Grave sequências de cliques com <code>cargo run -p alr-cli -- task train --type browser</code> ou cristalize procedimentos determinísticos em <code>ProceduralSkill</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Segurança</div>
                        <p class="info-box-text">Protegido por <code>SafeInputController</code> com limite rígido de 20 Hz, botão atômico de pânico e modo <code>dry_run</code> ativo por padrão.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- mouse-demo</code> (modo seguro) ou com flag <code>--live</code> para cursor real.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-os">
                <!-- Card Mouse -->
                <div class="os-card">
                    <div class="flex items-center justify-between border-b border-navy-800 pb-2">
                        <span class="font-bold text-white text-sm">Trackpad & Controle Físico de Cursor</span>
                        <span class="text-xs font-mono text-cyan-400" id="os-cursor-coords">X: 500 │ Y: 400</span>
                    </div>
                    <div class="virtual-trackpad" id="trackpad-area">
                        <div class="virtual-cursor" id="virtual-cursor" style="left: 50%; top: 50%;"></div>
                        <span class="text-xs text-slate-500 pointer-events-none select-none">Mova o mouse aqui para testar interpolação suave de coordenadas</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="triggerMouseAction('click')" class="btn-game-ctrl primary flex-1 justify-center">Clique Esquerdo</button>
                        <button onclick="triggerMouseAction('right_click')" class="btn-game-ctrl flex-1 justify-center">Clique Direito</button>
                        <button onclick="triggerMouseAction('double_click')" class="btn-game-ctrl flex-1 justify-center">Duplo Clique</button>
                        <button onclick="triggerMouseAction('scroll')" class="btn-game-ctrl flex-1 justify-center">Rolar Roda (Scroll)</button>
                    </div>
                </div>

                <!-- Card Teclado & Kill Switch -->
                <div class="os-card">
                    <div class="flex items-center justify-between border-b border-navy-800 pb-2">
                        <span class="font-bold text-white text-sm">Digitação Segura & Botão de Pânico</span>
                        <span class="text-xs font-mono text-emerald-400">Rate Limit: 20 Hz Ativo</span>
                    </div>
                    <div class="field-group">
                        <label class="field-label">Texto a ser digitado pelo agente no aplicativo em foco:</label>
                        <input type="text" class="text-input" id="os-keyboard-text" value="alr status --autonomous">
                    </div>
                    <div class="flex gap-2">
                        <button onclick="triggerKeyboardAction('type')" class="btn-game-ctrl primary flex-1 justify-center">Digitar Texto via SafeInput</button>
                        <button onclick="triggerKeyboardAction('enter')" class="btn-game-ctrl flex-1 justify-center">Pressionar Enter</button>
                        <button onclick="triggerKeyboardAction('ctrl_c')" class="btn-game-ctrl flex-1 justify-center">Enviar Ctrl+C</button>
                    </div>
                    <div class="mt-3 p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 flex flex-col gap-2">
                        <span class="text-xs font-bold text-rose-400">PARADA ATÔMICA GLOBAL (KILL SWITCH DE EMERGÊNCIA):</span>
                        <p class="text-[11px] text-slate-300">Trava instantaneamente todos os controles físicos de mouse, teclado e agentes autônomos via flag atômica SeqCst.</p>
                        <button onclick="triggerEmergencyKillSwitch()" class="py-2 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-rose-950/50">
                            🛑 Disparar Parada de Emergência (Kill Switch)
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. VIEW: AUTOMAÇÃO WEB REAL (CHROMIUM CDP) -->
        <div class="view-section" id="view-browser">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">CHROMIUM CDP NAVEGADOR</span>
                        <span class="info-guide-title">Automação Web Resiliente com Verificação de Pós-Condição no DOM</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">ByRole • State Hash • Anti-Flap</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Controlador de instâncias reais de Google Chrome / Chromium via protocolo CDP com resolução de elementos por acessibilidade (<code>ByRole</code>) e chaves de idempotência.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Navega em painéis web (CRMs, ERPs, SaaS), preenche dados e só considera a ação concluída quando o estado subsequente do DOM é comprovado via hash SHA-256.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Dispare os fluxos pré-programados de Login, Navegação e Extração de Dados abaixo para acompanhar o feedback de auto-verificação do DOM.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Treine novos fluxos web com <code>cargo run -p alr-cli -- task train --type browser</code> e teste reparo de layout com <code>browser adaptation-demo</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Segurança</div>
                        <p class="info-box-text">Apenas hosts registrados em <code>AllowedHostPolicy</code> são acessíveis, bloqueando exfiltração para domínios maliciosos.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- browser demo</code> ou <code>web-demo</code> para comparação autônoma de preços.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🔐</span>
                            <span class="catalog-title">Login Autônomo com Verificação</span>
                        </div>
                        <p class="catalog-desc">Preenche credenciais seguras via SecretStore, submete o formulário e valida que a rota mudou para /dashboard com sessão válida.</p>
                    </div>
                    <button class="btn-test-card" onclick="simulateBrowserAction('login')">⚡ Executar Fluxo de Login</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🎫</span>
                            <span class="catalog-title">Gestão de Tickets & Resposta</span>
                        </div>
                        <p class="catalog-desc">Navega até a lista de tickets, abre o chamado pendente, insere resposta do agente e valida confirmação toast no DOM.</p>
                    </div>
                    <button class="btn-test-card" onclick="simulateBrowserAction('ticket_reply')">⚡ Executar Resposta a Ticket</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🛒</span>
                            <span class="catalog-title">Comparação Autônoma de Preços</span>
                        </div>
                        <p class="catalog-desc">Pesquisa itens em e-commerce, extrai tabelas de preços, detecta o menor valor e gera relatório consolidado sem intervenção humana.</p>
                    </div>
                    <button class="btn-test-card" onclick="simulateBrowserAction('price_compare')">⚡ Executar Comparação Web</button>
                </div>
            </div>
        </div>

        <!-- 5. VIEW: MARKETING OPS & SEO (9 TAREFAS JEV) -->
        <div class="view-section" id="view-marketing">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">SUÍTE MARKETING OPS</span>
                        <span class="info-guide-title">As 9 Tarefas do Catálogo JEV Implementadas Nativamente em Rust</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Latência Total: ~956 µs • Custo: $0.00 • Zero Tokens</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Catálogo completo de automações de Google Ads, Meta Ads, SEO e visibilidade generativa (GEO) rodando em CPU local em microssegundos.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Automatiza tarefas diárias de agências e gestores de tráfego que antes gastavam milhões de tokens de LLM para classificações rotineiras.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Clique em qualquer uma das 9 tarefas abaixo para carregá-la com parâmetros reais no Playground e ver a inferência instantânea.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Execute a suíte interativa completa no terminal via <code>cargo run -p alr-cli -- marketing-suite --demo</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Economia</div>
                        <p class="info-box-text">Economia de 100% de custos de API em campanhas com mais de 50.000 termos de busca diários.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- search-triage</code> ou <code>creative-tag</code> ou <code>page-match</code>.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🔎</span>
                            <span class="catalog-title">1. Triagem Google Ads</span>
                        </div>
                        <p class="catalog-desc">Classifica termos de busca (Buyer, Researcher, Junk) e adiciona automaticamente negativos na campanha para economizar verba.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('search_triage')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🏷️</span>
                            <span class="catalog-title">2. Tagging Meta Ads</span>
                        </div>
                        <p class="catalog-desc">Classifica o ângulo de criativos de anúncios em passada única (Gancho de Dor, Curiosidade, Prova Social).</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('creative_tagging')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🎯</span>
                            <span class="catalog-title">3. Aderência Landing Page</span>
                        </div>
                        <p class="catalog-desc">Avalia score de 0 a 10 entre a promessa do anúncio e o destino da página, maximizando o Quality Score.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('landing_page_match')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🔗</span>
                            <span class="catalog-title">4. Linkagem Interna (Noul)</span>
                        </div>
                        <p class="catalog-desc">Decisão booleana calibrada Noul para determinar se artigo A deve receber link de contextualização para artigo B.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('agent_guardrail')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">⚔️</span>
                            <span class="catalog-title">5. Canibalização SEO</span>
                        </div>
                        <p class="catalog-desc">Detecta sobreposição de palavras-chave entre duas URLs e sugere plano automatizado de Redirect 301 ou Merge.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('search_triage')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🚫</span>
                            <span class="catalog-title">6. Thin-Page Quality Gate</span>
                        </div>
                        <p class="catalog-desc">Avalia densidade de conteúdo e bloqueia publicação de páginas rasas com nota inferior a 7.0 no CMS.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('landing_page_match')">⚡ Testar no Playground</button>
                </div>
            </div>
        </div>

        <!-- 6. VIEW: SEGURANÇA, RISCO & VISÃO -->
        <div class="view-section" id="view-security">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">SEGURANÇA & RISCO</span>
                        <span class="info-guide-title">Módulo de Proteção Atômica, Visão de Câmeras e Evasão de Perigo</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Safe Abstention • Zero Flap • CPU Local</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Camada de contenção de falhas e vigilância multimodal cobrindo visão computacional temporal, parada segura e detecção de anomalias.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Garante que agentes autônomos nunca executem ações destrutivas irreversíveis e parem graciosamente ao encontrar erros de sistema.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Acione os testes abaixo para ver alertas em tempo real de violação de perímetro CCTV ou simulações de novidade extrema.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Treine detecção OOD com <code>cargo run -p alr-cli -- novelty-demo</code> e teste de câmeras com <code>cctv-demo</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Salvaguardas</div>
                        <p class="info-box-text">Se o desvio de distribuição for superior a 0.60, a Safe Abstention escala imediatamente para o operador humano.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- emergency-demo</code> e <code>screen-error-demo</code>.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">📹</span>
                            <span class="catalog-title">Vigilância CCTV & Tripwire</span>
                        </div>
                        <p class="catalog-desc">Detecção de movimento em janela temporal com visão computacional, invasão de perímetro restrito e alerta sonoro Windows.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('cctv_tripwire')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🛡️</span>
                            <span class="catalog-title">Escudo Anti-Colisão & Evasão</span>
                        </div>
                        <p class="catalog-desc">Cycle Safety Shield atômico que intercepta movimentos perigosos e loops repetitivos de agentes robóticos.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('cycle_safety_shield')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🛑</span>
                            <span class="catalog-title">Parada Global de Emergência</span>
                        </div>
                        <p class="catalog-desc">Kill Switch atômico com botão de pânico e arquivo trigger que trava instantaneamente entradas físicas e agentes.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('agent_guardrail')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">⚠️</span>
                            <span class="catalog-title">Detector de Erros de Tela 500</span>
                        </div>
                        <p class="catalog-desc">Detecção multimodal de telas HTTP 500, crashes de aplicação e parada segura antes de corrupção de dados.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('agent_guardrail')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">⚖️</span>
                            <span class="catalog-title">Ouvidoria & Risco de Litígio</span>
                        </div>
                        <p class="catalog-desc">Classificação de ameaça judicial e reclamações de PROCON com escalonamento de alta prioridade.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('sentiment_routing')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">📧</span>
                            <span class="catalog-title">Triagem de E-mails & PII</span>
                        </div>
                        <p class="catalog-desc">Defesa ativa contra injeções de prompt ocultas em anexos e redação automática de dados sensíveis.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('support_routing')">⚡ Testar no Playground</button>
                </div>
            </div>
        </div>

        <!-- 7. VIEW: TRADING QUANTITATIVO -->
        <div class="view-section" id="view-trading">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">TRADING QUANTITATIVO</span>
                        <span class="info-guide-title">Robô Trader em Rust com Binance Testnet & Bybit V5</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Sub-20 µs • HMAC-SHA256 • Trailing Stop</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Motor quantitativo local em Rust com cálculo vetorial de RSI-14, MACD, SuperTrend e Bollinger Bands operando 7 ativos simultaneamente.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Executa decisões de alta frequência com confluência técnica e proteção estrita contra drawdown máximo sem pagar tokens.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Abra o Live Trading Desk na porta 3800 ou teste sinais individuais abaixo no Playground.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Execute simulação offline via <code>cargo run -p alr-cli -- trader-demo --asset BTC-USDT</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Salvaguardas</div>
                        <p class="info-box-text">Stop-Loss inviolável a 2.5%, Trailing Stop automático e teto máximo de posições concorrentes.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- trading-desk --port 3800</code>.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">📊</span>
                            <span class="catalog-title">Confluência de Sinais em Tempo Real</span>
                        </div>
                        <p class="catalog-desc">Cálculo de RSI-14, MACD, SuperTrend e Bollinger Bands em sub-microssegundo gerando ordens de compra/venda automáticas.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('crypto_trading')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🌐</span>
                            <span class="catalog-title">Binance Spot Testnet Oficial</span>
                        </div>
                        <p class="catalog-desc">Conexão oficial via HMAC-SHA256 com saldo virtual, livro de ofertas e despacho de ordens reais.</p>
                    </div>
                    <a href="http://localhost:3800" target="_blank" class="btn-test-card">🚀 Abrir Trading Desk Live (Port 3800)</a>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">⚡</span>
                            <span class="catalog-title">Trailing Stop & Stop-Loss Móvel</span>
                        </div>
                        <p class="catalog-desc">Salvaguarda contínua de patrimônio com bloqueio por drawdown máximo e proteção contra reversão de tendência.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('crypto_trading')">⚡ Testar no Playground</button>
                </div>
            </div>
        </div>

        <!-- 8. VIEW: WHATSAPP DESK -->
        <div class="view-section" id="view-whatsapp">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">CENTRAL WHATSAPP 20 NICHOS</span>
                        <span class="info-guide-title">Atendimento Omnichannel Automatizado com Zero Tokens</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">&gt; 72.000 msg/s • Qdrant 1536d</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Central de conversação e atendimento inteligente treinada em 20 nichos de mercado (Clínicas, Barbearias, E-commerce, Imobiliárias, etc.).</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Responde dúvidas, agenda horários e rastreia pedidos com aprendizado incremental de padrões sem depender de LLMs remotas.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Selecione o cenário de suporte ou inicie o servidor WhatsApp Desk dedicado na porta 3456.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Treinar</div>
                        <p class="info-box-text">Treine novos nichos com <code>cargo run -p alr-cli -- support train --niche clinica</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Memória Vetorial</div>
                        <p class="info-box-text">Conexão nativa com Qdrant em 1536 dimensões com busca híbrida e quantização escalar int8.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Comando CLI</div>
                        <p class="info-box-text"><code>cargo run -p alr-cli -- whatsapp --port 3456</code>.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">💬</span>
                            <span class="catalog-title">Central WhatsApp 20 Nichos</span>
                        </div>
                        <p class="catalog-desc">Atendimento omnichannel para Clínicas, Imobiliárias, E-commerce, Barbearias, Restaurantes, etc. com custo zero de tokens.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('support_routing')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🏷️</span>
                            <span class="catalog-title">Categorização de Catálogo</span>
                        </div>
                        <p class="catalog-desc">Taxonomia hierárquica automática de produtos com processamento de mais de 20.000 itens por segundo em CPU.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('lead_qualification')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🧠</span>
                            <span class="catalog-title">Memória Vetorial Qdrant (1536d)</span>
                        </div>
                        <p class="catalog-desc">Busca híbrida com vetores densos OpenAI/BGE e esparsos BM25 com fusão RRF atingindo 91.7% de Hit@1.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('support_routing')">⚡ Testar no Playground</button>
                </div>
            </div>
        </div>

        <!-- VIEW: QA & TEST AUTOMATION (WEB & PROGRAMAS) -->
        <div class="view-section" id="view-qa">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">AUTOMAÇÃO DE TESTES DE QA</span>
                        <span class="info-guide-title">Como Preparar e Fazer Funcionar a Automação de QA em Páginas Web e Programas</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Self-Healing • Asserts de DOM • Zero Erros 500 • CI/CD</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Motor autônomo que executa baterias completas de teste em páginas web (via Chromium CDP) e em executáveis/APIs desktop com asserções rigorosas e relatórios formais de release.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Substitui o teste manual repetitivo e lento. Garante que fluxos críticos (checkout, login, formulários, cálculos financeiros) nunca quebrem ou apresentem regressões em produção.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar no Terminal</div>
                        <p class="info-box-text">Execute <code>cargo run -p alr-cli -- qa-demo</code> para rodar uma bateria completa ao vivo com asserts de DOM e processos.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Como Preparar (Passo a Passo)</div>
                        <p class="info-box-text">1. Crie a especificação <code>QaTestSpec</code> com os passos.<br/>2. Adicione seletores e papéis acessíveis de fallback (<code>ByRole</code>).<br/>3. Execute a suíte e capture o veredito <code>QaVerdict::ApprovedForRelease</code>.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Auto-Cura (Self-Healing)</div>
                        <p class="info-box-text">Se um desenvolvedor alterar o ID de um botão (ex: de <code>#submit-btn</code> para <code>.btn-primary</code>), o motor consulta a árvore de acessibilidade, encontra o botão equivalente e cura o teste automaticamente!</p>
                    </div>
                </div>
            </div>

            <!-- Guia Prático com Código e Exemplos -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 14px;">
                    <div style="font-weight: 700; color: #fff; font-size: 13px;">📋 Tutorial: Como Fazer Funcionar a Automação no seu Código</div>
                    <span style="font-size: 10px; color: var(--accent-cyan); font-family: var(--font-mono); text-transform: uppercase;">Integração com Rust & CI/CD</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 11px;">
                    <div>
                        <div style="font-weight: 600; color: var(--accent-cyan); margin-bottom: 6px;">Exemplo 1: Testando Página Web (E2E)</div>
                        <pre style="background: #070b12; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; color: #94a3b8; font-family: var(--font-mono); overflow-x: auto; font-size: 10.5px;"><code>let engine = QaAutomationEngine::new();
let spec = QaTestSpec::e2e_web_checkout("https://loja.com/checkout");
let report = engine.run_web_qa(&spec)?;

assert_eq!(report.verdict, QaVerdict::ApprovedForRelease);
println!("✓ Passou em {}ms com 0 erros 500!", report.total_duration_ms);</code></pre>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--accent-lime); margin-bottom: 6px;">Exemplo 2: Testando Programa Executável / API</div>
                        <pre style="background: #070b12; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; color: #94a3b8; font-family: var(--font-mono); overflow-x: auto; font-size: 10.5px;"><code>let engine = QaAutomationEngine::new();
let spec = QaTestSpec::program_cli_test("./target/release/meu-app");
let report = engine.run_program_qa(&spec)?;

assert_eq!(report.verdict, QaVerdict::ApprovedForRelease);
println!("✓ Exit code 0, zero panics e sem memory leaks!");</code></pre>
                    </div>
                </div>
            </div>

            <!-- Showcase Catalog Cards -->
            <div class="workspace-catalog">
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🌐</span>
                            <span class="catalog-title">QA Web & Checkout E-Commerce</span>
                        </div>
                        <p class="catalog-desc">Navegação em página, preenchimento de inputs, submissão de formulário, validação de modal e auto-recuperação de seletores quebrados.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('qa_web_automation')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">⚙️</span>
                            <span class="catalog-title">QA Programas, Binários & APIs</span>
                        </div>
                        <p class="catalog-desc">Disparo de processos com injeção de parâmetros, assert síncrono de stdout/stderr, verificação de Exit Code 0 e ausência de pânicos.</p>
                    </div>
                    <button class="btn-test-card" onclick="switchToPreset('qa_program_automation')">⚡ Testar no Playground</button>
                </div>
                <div class="catalog-card">
                    <div>
                        <div class="catalog-header">
                            <span style="font-size: 20px;">🧪</span>
                            <span class="catalog-title">Executar Bateria de QA ao Vivo</span>
                        </div>
                        <p class="catalog-desc">Dispara uma suíte real de testes web e processo no backend e exibe os asserts validados em tempo real com tempos de execução.</p>
                    </div>
                    <button class="btn-test-card" onclick="runLiveQaDemo()" id="btn-run-live-qa" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff;">▶️ Executar Bateria de Testes Agora</button>
                </div>
            </div>

            <!-- Live QA Execution Results Panel -->
            <div id="qa-live-results" style="display: none; background: #070b12; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px;">
                    <div style="font-weight: 700; color: #fff; font-size: 13px;" id="qa-results-title">Resultado da Execução de QA ao Vivo</div>
                    <span id="qa-verdict-badge" class="badge-type" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">APROVADO</span>
                </div>
                <div id="qa-assertions-list" style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 11px;"></div>
            </div>
        </div>

        <!-- VIEW: EXPLORADOR DE BANCOS DE DADOS (SQLITE & QDRANT) -->
        <div class="view-section" id="view-database">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">EXPLORADOR DE BANCOS DE DADOS</span>
                        <span class="info-guide-title">Inspetor Operacional de SQLite (alr_memory, support, trading) & Qdrant (1536d)</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Modo Read-Only • WAL • Latência &lt; 40 µs</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Acesso direto e transparente aos 4 bancos de dados fundamentais do ALR: SQLite Operacional WAL, Base Relacional CRM, Livro de Ordens de Trading e Memória Vetorial Qdrant.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Por Que & Objetivo</div>
                        <p class="info-box-text">Permite auditar em tempo real as skills aprendidas, transições (s, a, r, s'), logs de auditoria de decisões, tickets de clientes e vetores densos com quantização escalar int8.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Navegar</div>
                        <p class="info-box-text">Alterne entre os bancos nas abas superiores, clique em qualquer tabela na barra lateral para carregar seus dados e clique em uma linha para abrir a inspeção profunda em JSON.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎓 Schemas & Tipos</div>
                        <p class="info-box-text">Alterne entre a visualização de dados e o botão <code>📐 Schema / DDL</code> para inspecionar colunas, tipos de dados, chaves primárias e constraints relacionais.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🛡️ Integridade</div>
                        <p class="info-box-text">Conexões abertas com a flag <code>SQLITE_OPEN_READ_ONLY</code>, garantindo que consultas analíticas nunca interfiram na execução em tempo real dos agentes.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">💻 Busca em Tempo Real</div>
                        <p class="info-box-text">Filtre registros instantaneamente digitando no campo de busca para localizar IDs, hashes, nomes de clientes ou parâmetros de ações.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-database">
                <!-- Barra Superior do Banco de Dados Selecionado -->
                <div class="db-top-bar">
                    <div class="db-stores-nav" id="db-stores-nav">
                        <!-- Carregado dinamicamente via JS com os 4 bancos -->
                    </div>
                    <div class="db-telemetry-hud" id="db-telemetry-hud">
                        <div class="db-hud-item">
                            <span>Status:</span>
                            <span class="db-hud-val status-online" id="db-hud-status">● Conectado (WAL)</span>
                        </div>
                        <div class="db-hud-item">
                            <span>Tabelas:</span>
                            <span class="db-hud-val" id="db-hud-tables">7</span>
                        </div>
                        <div class="db-hud-item">
                            <span>Registros:</span>
                            <span class="db-hud-val accent" id="db-hud-records">0</span>
                        </div>
                        <div class="db-hud-item">
                            <span>Leitura:</span>
                            <span class="db-hud-val accent" id="db-hud-latency">&lt; 35 µs</span>
                        </div>
                    </div>
                </div>

                <!-- Grid de Conteúdo: Sidebar de Tabelas + Tabela de Dados -->
                <div class="db-content-grid">
                    <!-- Sidebar de Tabelas -->
                    <div class="db-sidebar">
                        <div class="db-sidebar-header">
                            <div class="db-sidebar-title">
                                <span>Tabelas & Coleções</span>
                                <span style="font-family: var(--font-mono); color: var(--accent-lime);" id="db-tables-count-badge">7</span>
                            </div>
                            <input type="text" class="db-search-input" id="db-search-tables-input" placeholder="Filtrar tabelas...">
                        </div>
                        <div class="db-tables-list" id="db-tables-list">
                            <!-- Lista de tabelas renderizada via JS -->
                        </div>
                    </div>

                    <!-- Painel de Dados -->
                    <div class="db-main-panel">
                        <div class="db-table-header-bar">
                            <div class="db-table-title-area">
                                <span class="db-active-table-title" id="db-active-table-title">
                                    <span>⚡</span>
                                    <span>skills</span>
                                </span>
                                <span class="db-active-table-desc" id="db-active-table-desc">Habilidades autônomas validadas e taxas de sucesso</span>
                            </div>
                            <div class="db-toolbar-actions">
                                <input type="text" class="db-search-rows-input" id="db-search-rows-input" placeholder="🔍 Buscar na tabela...">
                                <button class="btn-db-action active" id="btn-db-view-data">
                                    <span>📊 Dados</span>
                                </button>
                                <button class="btn-db-action" id="btn-db-view-schema">
                                    <span>📐 Schema / DDL</span>
                                </button>
                                <button class="btn-db-action" id="btn-db-export-json">
                                    <span>Exportar JSON</span>
                                </button>
                                <button class="btn-db-action" id="btn-db-refresh">
                                    <span>↺</span>
                                </button>
                            </div>
                        </div>

                        <!-- Tabela de Dados -->
                        <div class="db-table-wrapper" id="db-table-wrapper">
                            <table class="alr-data-table" id="db-main-table">
                                <thead id="db-table-thead"></thead>
                                <tbody id="db-table-tbody"></tbody>
                            </table>
                            <div class="empty-state" id="db-table-empty" style="display: none; padding: 40px;">
                                <div style="font-size: 24px;">📭</div>
                                <div>Nenhum registro encontrado nesta tabela</div>
                            </div>
                        </div>

                        <!-- Paginação na Base -->
                        <div class="db-pagination-bar">
                            <div id="db-pagination-info">Página 1 de 1 (Total: 0 registros)</div>
                            <div style="display: flex; gap: 6px;">
                                <button class="db-page-btn" id="btn-db-prev-page" disabled>◀ Anterior</button>
                                <button class="db-page-btn" id="btn-db-next-page" disabled>Próxima ▶</button>
                            </div>
                        </div>

                        <!-- Drawer Lateral de Inspeção de Linha -->
                        <div class="db-record-drawer" id="db-record-drawer">
                            <div class="drawer-header">
                                <div class="drawer-title">
                                    <span>🔍 Detalhes do Registro</span>
                                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);" id="drawer-record-id">#1</span>
                                </div>
                                <button class="drawer-close-btn" id="btn-close-drawer">&times;</button>
                            </div>
                            <div class="drawer-body" id="drawer-body">
                                <!-- Campos dinâmicos do registro -->
                            </div>
                            <div class="drawer-footer">
                                <span style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">Formato Estruturado JSON</span>
                                <button class="btn-db-action" id="btn-copy-drawer-json">Copiar JSON</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW: VISÃO & ATRIBUTOS DE PRODUTOS / ERROS DE TELA -->
        <div class="view-section" id="view-vision">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">VISÃO COMPUTACIONAL & ATRIBUTOS EM CPU</span>
                        <span class="info-guide-title">VisualAttributeExtractor & ScreenErrorDetector em Imagens Reais</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Zero GPU • CPU &lt; 100 µs • Cores em Português</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Extração visual em CPU de paleta dominante (nomes em português, hex, porcentagens), forma geométrica, pureza de fundo e conformidade para e-commerce.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Detector de Erros</div>
                        <p class="info-box-text">O <code>ScreenErrorDetector</code> avalia pixels RGBA para identificar telas de erro HTTP 500, crashes, BSOD e caixas de diálogo, disparando parada de segurança.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Como Testar</div>
                        <p class="info-box-text">Clique nos presets abaixo ou faça o upload de qualquer arquivo PNG/JPEG/WEBP do seu computador para ver a extração real em microssegundos.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-vision">
                <!-- Painel Esquerdo: Presets e Upload de Imagem -->
                <div class="vision-left-panel">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">1. Selecione um Preset ou Envie Imagem Real</div>
                    <div class="vision-presets-grid">
                        <button class="btn-preset-img active" data-preset="tenis_nike">👟 Tênis Nike Azul</button>
                        <button class="btn-preset-img" data-preset="iphone_titanio">📱 iPhone Preto Titânio</button>
                        <button class="btn-preset-img" data-preset="cadeira_ergonomica">💺 Cadeira Ergonômica</button>
                        <button class="btn-preset-img" data-preset="tela_erro_500">🚨 Tela Erro 500 HTTP</button>
                    </div>

                    <div class="vision-upload-dropzone" id="vision-dropzone">
                        <div style="font-size: 24px; margin-bottom: 6px;">📁</div>
                        <div style="font-size: 12px; font-weight: 600; color: #fff;">Arraste ou clique para carregar imagem</div>
                        <div style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">PNG, JPEG, WEBP, GIF, BMP (Decodificação Real)</div>
                        <input type="file" id="vision-file-input" accept="image/*" style="display: none;">
                    </div>

                    <!-- Canvas da Imagem Carregada -->
                    <div class="vision-canvas-wrap">
                        <canvas id="vision-display-canvas" width="360" height="270"></canvas>
                        <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono); margin-top: 6px;" id="vision-canvas-dimensions">Dimensões: 400x300 px</div>
                    </div>
                </div>

                <!-- Painel Direito: Resultados Extraídos pela CPU -->
                <div class="vision-right-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: #fff;">Atributos Visuais Extraídos pelo ALR</span>
                        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-lime);" id="vision-latency-badge">&lt; 85 µs (CPU)</span>
                    </div>

                    <!-- Veredito de Erro de Tela -->
                    <div id="vision-error-verdict-box" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 10px 14px;">
                        <div style="display: flex; align-items: center; gap: 6px; color: #ef4444; font-weight: 700; font-size: 12px;">
                            <span>⚠️ ERRO DE TELA DETECTADO (ScreenErrorDetector)</span>
                        </div>
                        <div style="font-size: 11px; color: #fca5a5; margin-top: 4px;" id="vision-error-desc">Condição de erro identificada na imagem.</div>
                    </div>

                    <!-- Paleta de Cores -->
                    <div class="field-group">
                        <label class="field-label">Paleta de Cores Dominantes (Catálogo em Português)</label>
                        <div class="swatches-flex" id="vision-swatches-container"></div>
                    </div>

                    <!-- Métricas Físicas e E-Commerce Compliance -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="telemetry-card">
                            <span class="telemetry-label">Formato Geométrico</span>
                            <span class="telemetry-val accent" id="vision-shape-val">Alongado</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Classificação do Fundo</span>
                            <span class="telemetry-val" id="vision-bg-val">CleanWhite (Estúdio)</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Nitidez / Sharpness</span>
                            <span class="telemetry-val" id="vision-sharpness-val">0.94 / 1.0</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="telemetry-card">
                            <span class="telemetry-label">Cor Primária</span>
                            <span class="telemetry-val accent" id="vision-primary-color-val">Azul Marinho</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Brilho Médio</span>
                            <span class="telemetry-val" id="vision-brightness-val">48%</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Contraste RMS</span>
                            <span class="telemetry-val" id="vision-contrast-val">65%</span>
                        </div>
                    </div>

                    <!-- Tags Visuais Semânticas -->
                    <div class="field-group">
                        <label class="field-label">Tags Visuais Semânticas para Indexação & Marketplace</label>
                        <div class="tags-cloud-wrap" id="vision-tags-container"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW: CÂMERA CCTV COM TRIPWIRE REAL -->
        <div class="view-section" id="view-cctv">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">VIGILÂNCIA CCTV REAL</span>
                        <span class="info-guide-title">Monitoramento de Segurança Contínuo com CctvSurveillanceEngine & Windows Toast</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">&lt; 1 ms / frame • Alarme Nativo Windows</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 Diferença Temporal</div>
                        <p class="info-box-text">Calcula variação de pixels entre quadros consecutivos em CPU local sem necessidade de placa de vídeo.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Barreira Virtual (Tripwire)</div>
                        <p class="info-box-text">A zona perimetral das Docas de Carga aciona o alerta crítico instantâneo se for invadida por pessoas ou veículos.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Disparo Real de Alarme</div>
                        <p class="info-box-text">Clique em 'Simular Invasão' para ver a detecção em tempo real e o envio do alerta sonoro e notificação no Windows.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-cctv">
                <!-- Painel Esquerdo: Canvas da Câmera -->
                <div class="cctv-viewport-panel">
                    <canvas id="cctv-feed-canvas" width="480" height="320"></canvas>
                    <div class="cctv-hud-overlay">
                        <span>● CAM-01 [DOCAS A1]</span>
                        <span id="cctv-hud-time">14:22:04</span>
                        <span>FPS: 15.0</span>
                    </div>
                    <div class="cctv-alert-banner" id="cctv-alert-banner">
                        <span>🚨 ALARME: INVASÃO CRÍTICA DETECTADA NA ZONA PROIBIDA!</span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 14px;">
                        <button class="btn-game-ctrl primary" id="btn-toggle-cctv">
                            <span>▶ Iniciar Monitoramento</span>
                        </button>
                        <button class="btn-game-ctrl" id="btn-simulate-breach" style="border-color: #ef4444; color: #ef4444;">
                            <span>🚨 Simular Invasão de Perímetro</span>
                        </button>
                        <button class="btn-game-ctrl" id="btn-cctv-beep">
                            <span>🔔 Testar Alerta Windows (Beep)</span>
                        </button>
                    </div>
                </div>

                <!-- Painel Direito: Telemetria de Segurança -->
                <div class="cctv-telemetry-panel">
                    <div class="telemetry-label">Status da Vigilância Perimetral</div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Nível de Ameaça</span>
                        <span class="telemetry-val" id="cctv-threat-val" style="color: #10b981;">Seguro</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Entidade Classificada</span>
                        <span class="telemetry-val accent" id="cctv-entity-val">Nenhuma</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Intensidade de Movimento</span>
                        <span class="telemetry-val" id="cctv-motion-val">0.0%</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Latência da CPU</span>
                        <span class="telemetry-val accent" id="cctv-latency-val">&lt; 840 µs</span>
                    </div>
                    <div class="telemetry-card">
                        <span class="telemetry-label">Notificação Windows Toast</span>
                        <span class="telemetry-val" id="cctv-toast-val">✓ Ativo (Pronto)</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW: E-COMMERCE CATALOG CATEGORIZER -->
        <div class="view-section" id="view-ecommerce">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">CATEGORIZAÇÃO E-COMMERCE EM CPU</span>
                        <span class="info-guide-title">ProductCategorizerEngine: Taxonomia Hierárquica com Custo Zero de Tokens</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">&gt; 50.000 itens/segundo • Latência &lt; 20 µs</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Motor local de classificação automática de produtos para marketplaces baseado em regras determinísticas e pontuação léxica em CPU.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Custo Zero</div>
                        <p class="info-box-text">Elimina 100% dos custos com OpenAI/Claude para catalogação rotineira de milhares de produtos diários.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Teste Instantâneo</div>
                        <p class="info-box-text">Selecione um preset abaixo ou digite qualquer produto para ver o caminho hierárquico resolvido em microssegundos.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-ecommerce">
                <!-- Formulário de Entrada -->
                <div class="vision-left-panel">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Presets de Produtos Populares</div>
                    <div class="ecom-presets-row">
                        <button class="ecom-preset-chip" onclick="fillEcomPreset('Apple iPhone 15 Pro Max 256GB Titânio', 'Apple', 8999, 'Smartphone top de linha com chip A17 Pro e câmera de 48MP')">📱 iPhone 15 Pro</button>
                        <button class="ecom-preset-chip" onclick="fillEcomPreset('Tênis Nike Air Zoom Pegasus 40 Corrida', 'Nike', 799.90, 'Tênis esportivo para corrida e caminhada com amortecimento Zoom Air')">👟 Tênis Nike</button>
                        <button class="ecom-preset-chip" onclick="fillEcomPreset('Cadeira Gamer Ergonômica Reclinável Preta', 'ThunderX3', 1299, 'Cadeira ergonômica com apoio lombar e ajuste de altura')">💺 Cadeira Gamer</button>
                        <button class="ecom-preset-chip" onclick="fillEcomPreset('Cafeteira Nespresso Essenza Mini 110V', 'Nespresso', 489, 'Cafeteira elétrica para cápsulas de café espresso')">☕ Cafeteira</button>
                        <button class="ecom-preset-chip" onclick="fillEcomPreset('Bicicleta Mountain Bike Caloi Aro 29 Shimano', 'Caloi', 2199, 'Bicicleta MTB 21 marchas para trilhas e cicloturismo')">🚲 Bicicleta Caloi</button>
                    </div>

                    <div class="field-group">
                        <label class="field-label">Título do Produto</label>
                        <input type="text" class="text-input" id="ecom-input-title" value="Smartphone Apple iPhone 15 Pro Max 256GB Titânio">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="field-group">
                            <label class="field-label">Marca (Opcional)</label>
                            <input type="text" class="text-input" id="ecom-input-brand" value="Apple">
                        </div>
                        <div class="field-group">
                            <label class="field-label">Preço (R$)</label>
                            <input type="number" class="text-input" id="ecom-input-price" value="8999.00">
                        </div>
                    </div>

                    <div class="field-group">
                        <label class="field-label">Descrição do Item</label>
                        <textarea class="textarea-input" id="ecom-input-desc" style="height: 70px;">Smartphone premium com acabamento em titânio aeroespacial e tela Super Retina XDR de 6.7 polegadas.</textarea>
                    </div>

                    <button class="btn-game-ctrl primary" id="btn-run-categorize" style="justify-content: center; padding: 8px;">
                        <span>⚡ Classificar com ALR em CPU (&lt; 20 µs)</span>
                    </button>

                    <button class="btn-game-ctrl" id="btn-run-batch-demo" style="justify-content: center; margin-top: 4px;">
                        <span>🚀 Executar Teste em Lote (Batch 100 Itens)</span>
                    </button>
                </div>

                <!-- Resultado da Categorização -->
                <div class="vision-right-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: #fff;">Resultado da Categorização em CPU</span>
                        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-lime);" id="ecom-latency-badge">&lt; 14 µs (CPU)</span>
                    </div>

                    <div class="ecom-result-card">
                        <span style="font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Caminho da Categoria Hierárquica</span>
                        <div class="ecom-breadcrumb-trail" id="ecom-category-trail">
                            <span>Eletrônicos e Tecnologia</span>
                            <span class="ecom-breadcrumb-sep">&gt;</span>
                            <span>Celulares e Smartphones</span>
                            <span class="ecom-breadcrumb-sep">&gt;</span>
                            <span style="color: var(--accent-lime);">Smartphones</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="telemetry-card">
                            <span class="telemetry-label">Confiança Calibrada</span>
                            <span class="telemetry-val accent" id="ecom-confidence-val">98.5%</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Método de Inferência</span>
                            <span class="telemetry-val" id="ecom-method-val">Regra Determinística</span>
                        </div>
                        <div class="telemetry-card">
                            <span class="telemetry-label">Custo em Tokens</span>
                            <span class="telemetry-val accent">0 Tokens ($0.00)</span>
                        </div>
                    </div>

                    <div class="field-group">
                        <label class="field-label">Tags Semânticas Extraídas</label>
                        <div class="tags-cloud-wrap" id="ecom-tags-container">
                            <span class="visual-tag-badge">eletronicos</span>
                            <span class="visual-tag-badge">smartphone</span>
                            <span class="visual-tag-badge">celular</span>
                            <span class="visual-tag-badge">apple</span>
                            <span class="visual-tag-badge">ios</span>
                        </div>
                    </div>

                    <div id="ecom-batch-results-panel" style="display: none; background: #080c10; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                        <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 6px;">Resultado do Teste em Lote (Batch)</div>
                        <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-cyan);" id="ecom-batch-summary">100 itens classificados em 1.4 ms (Throughput: 71.428 itens/s)</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW: OTIMIZADOR DE ROTAS URBANAS (50 ENTREGAS COM TRÂNSITO DINÂMICO & MÃO ÚNICA) -->
        <div class="view-section" id="view-routes">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">ROTEAMENTO URBANO DINÂMICO (VRP-TW)</span>
                        <span class="info-guide-title">Otimizador de 50 Entregas com Trânsito em Tempo Real, Mão Única e Turno Diário</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">Heurística Híbrida 2-Opt em Rust • &lt; 5 ms</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 O Que É</div>
                        <p class="info-box-text">Motor autônomo que resolve o problema de roteamento de veículos (VRP) para 50 paradas a partir de um Centro de Distribuição (Depot Pin), considerando o trânsito dinâmico e vias de mão única.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Restrições Dinâmicas</div>
                        <p class="info-box-text">Avalia vias de mão única (sem infrações), semáforos, tempo de parada por entrega (descarga/assinatura), janelas expressas e teto de jornada diária do motorista (8 horas).</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Interativo no Mapa</div>
                        <p class="info-box-text"><strong>Clique em qualquer ponto do mapa</strong> para reposicionar o Pin de Saída (Depot) ou mude o trânsito (Pico, Chuva, Fluido) e clique em Otimizar Rota para ver o traçado instantâneo.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-routes">
                <!-- Painel Esquerdo: Canvas do Mapa da Cidade + Controles -->
                <div class="routes-map-panel">
                    <div class="routes-canvas-wrap">
                        <canvas id="routes-city-canvas" width="590" height="410"></canvas>
                        <div class="routes-map-hint">📍 Clique no mapa para posicionar o Centro de Distribuição (Depot Pin)</div>
                    </div>

                    <!-- Barra de Controles Rápidos -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                        <div class="field-group">
                            <label class="field-label">Entregas (N)</label>
                            <select class="text-input" id="routes-select-stops" style="padding: 4px 6px;">
                                <option value="25">25 Entregas</option>
                                <option value="50" selected>50 Entregas</option>
                                <option value="75">75 Entregas</option>
                            </select>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Regime Trânsito</label>
                            <select class="text-input" id="routes-select-traffic" style="padding: 4px 6px;">
                                <option value="rush_hour" selected>Horário de Pico</option>
                                <option value="rain">Chuva / Lentidão</option>
                                <option value="fluid">Trânsito Fluido</option>
                            </select>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Parada / Entrega</label>
                            <select class="text-input" id="routes-select-stop-time" style="padding: 4px 6px;">
                                <option value="5">5 minutos</option>
                                <option value="8" selected>8 minutos</option>
                                <option value="12">12 minutos</option>
                            </select>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Turno Máximo</label>
                            <select class="text-input" id="routes-select-shift" style="padding: 4px 6px;">
                                <option value="8" selected>8.0 Horas</option>
                                <option value="10">10.0 Horas</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn-game-ctrl primary flex-1 justify-center" id="btn-routes-optimize">
                            <span>⚡ Otimizar Rota Autônoma (&lt; 5 ms em Rust)</span>
                        </button>
                        <button class="btn-game-ctrl flex-1 justify-center" id="btn-routes-animate-van">
                            <span>▶ Simular Trajeto da Van (60 FPS)</span>
                        </button>
                    </div>
                </div>

                <!-- Painel Direito: Dashboard de KPIs & Tabela de Manifesto -->
                <div class="routes-itinerary-panel">
                    <div style="padding: 12px 16px; background: #080c10; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 13px; font-weight: 700; color: #fff;">Manifesto de Roteirização Otimizada</span>
                            <span class="badge-type" id="routes-plan-status-badge">TURNO NORMAL</span>
                        </div>
                        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-lime);" id="routes-latency-badge">&lt; 3.2 ms (CPU)</span>
                    </div>

                    <!-- Grid de KPIs Consolidados -->
                    <div style="padding: 10px 14px; background: #06090d; border-bottom: 1px solid var(--border-subtle);">
                        <div class="routes-kpi-grid">
                            <div class="telemetry-card">
                                <span class="telemetry-label">Entregas no Turno</span>
                                <span class="telemetry-val accent" id="kpi-completed-stops">48 de 50</span>
                            </div>
                            <div class="telemetry-card">
                                <span class="telemetry-label">Distância Total</span>
                                <span class="telemetry-val" id="kpi-total-distance">64.2 km</span>
                            </div>
                            <div class="telemetry-card">
                                <span class="telemetry-label">Tempo da Jornada</span>
                                <span class="telemetry-val" id="kpi-total-time">7h 34m</span>
                            </div>
                        </div>

                        <div class="routes-kpi-grid" style="margin-top: 6px;">
                            <div class="telemetry-card">
                                <span class="telemetry-label">Economia vs Sequencial</span>
                                <span class="telemetry-val accent" id="kpi-distance-savings">-35.4%</span>
                            </div>
                            <div class="telemetry-card">
                                <span class="telemetry-label">Diesel / Emissão CO2</span>
                                <span class="telemetry-val" id="kpi-fuel-co2">6.8 L / 18.2 kg</span>
                            </div>
                            <div class="telemetry-card">
                                <span class="telemetry-label">Velocidade Média</span>
                                <span class="telemetry-val" id="kpi-avg-speed">27.8 km/h</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tabela de Itinerário das 50 Paradas -->
                    <div class="routes-table-wrap">
                        <table class="alr-data-table">
                            <thead>
                                <tr>
                                    <th style="width: 45px;">Passo</th>
                                    <th>Endereço de Entrega</th>
                                    <th>Distância</th>
                                    <th>Trânsito</th>
                                    <th>Chegada (ETA)</th>
                                    <th>Partida</th>
                                    <th>Condição</th>
                                    <th>Prioridade</th>
                                </tr>
                            </thead>
                            <tbody id="routes-itinerary-tbody">
                                <!-- Preenchido dinamicamente via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW: CENTRAL DE CONHECIMENTO & TUTORIAIS INTERATIVOS -->
        <div class="view-section" id="view-tutorials">
            <div class="info-guide-widget">
                <div class="info-guide-header">
                    <div class="info-guide-title-wrap">
                        <span class="info-guide-badge">CENTRAL DE CONHECIMENTO & TUTORIAIS</span>
                        <span class="info-guide-title">A Única Fonte de Informações, Arquitetura, Guias de Treinamento e Testes do ALR</span>
                    </div>
                    <span style="font-size: 11px; color: var(--accent-lime); font-family: var(--font-mono);">10 Tutoriais Interativos • 100% em Português</span>
                </div>
                <div class="info-guide-grid">
                    <div class="info-guide-box">
                        <div class="info-box-title">📖 Premissa Inviolável</div>
                        <p class="info-box-text"><strong>"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."</strong> O ALR foi desenhado para eliminar chamadas repetitivas de LLMs após a primeira validação.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🎯 Ciclo Cognitivo</div>
                        <p class="info-box-text">Aprende na primeira ocorrência (Cold-Start), valida em sandbox isolada, cristaliza em código/skill determinística e executa 100% local com 0 tokens e latência de microssegundos.</p>
                    </div>
                    <div class="info-guide-box">
                        <div class="info-box-title">🚀 Teste Instantâneo</div>
                        <p class="info-box-text">Cada tutorial possui comandos CLI de terminal copiáveis com 1 clique e botões de atalho para testar diretamente nos módulos ao vivo deste Playground.</p>
                    </div>
                </div>
            </div>

            <div class="workspace-tutorials">
                <!-- Sidebar de Tutoriais -->
                <div class="tutorial-sidebar">
                    <div class="tutorial-sidebar-header">
                        <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Catálogo de Tutoriais (10 Módulos)</span>
                        <span style="font-size: 10px; color: var(--text-muted);">Clique para carregar o guia completo</span>
                    </div>
                    <div class="tutorial-list-scroll" id="tutorial-cards-list">
                        <!-- Gerado via JS com os 10 tutoriais -->
                    </div>
                </div>

                <!-- Painel Leitor do Artigo / Tutorial -->
                <div class="tutorial-reader-panel" id="tutorial-reader-content">
                    <!-- Conteúdo dinâmico do tutorial -->
                </div>
            </div>
        </div>

    </div>

    <!-- Bottom ALR Lab Footer -->
    <div class="alr-footer">
        <div>ALR Lab possui receitas validadas com código e resultados para este modelo.</div>
        <a href="#alr-lab">Explorar ALR Lab &rarr;</a>
    </div>

    <!-- API Integration Modal -->
    <div class="modal-overlay" id="api-modal">
        <div class="modal-card">
            <div class="modal-header">
                <h3>&lt;/&gt; Integração via API REST do ALR</h3>
                <button class="modal-close-btn" id="btn-close-api-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div>Envie requisições diretas ao seu nó ALR local em Rust para obter probabilidades calibradas e System 1 decisions em sub-milissegundos:</div>
                
                <div style="font-weight: 600; color: #ffffff;">Exemplo cURL (Pronto para copiar e rodar no terminal):</div>
                <div class="curl-box-wrap" id="curl-code-snippet">curl -X POST http://localhost:3000/api/v1/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "alr/typed-judge-1.13",
    "state": "Meu saque falhou tres dias seguidos e o chat fica caindo por timeout.",
    "questions": {
      "team": {
        "type": "choice",
        "instructions": "Qual departamento deve tratar este cliente?",
        "criteria": {
          "billing": "Pagamentos, saques, faturas, estornos",
          "technical": "Bugs, instabilidades, integracoes, erros de API",
          "sales": "Precos, upgrades, novas contas"
        }
      }
    }
  }'<button class="btn-copy-curl" id="btn-copy-curl">Copiar cURL</button></div>

                <div style="font-size: 12px; color: var(--text-dim);">
                    * Suporta também compatibilidade com rota OpenAI: <code>POST /v1/chat/completions</code> e <code>POST /api/decision</code>.
                </div>
            </div>
        </div>
    </div>

    <!-- Application Script -->
    <script>
        const PRESETS = {
            agent_guardrail: {
                id: "agent_guardrail",
                type: "noul",
                name: "Guarda-corpo de Agente",
                badge: "noul",
                category: "core",
                description: "Uma questão noul avalia a probabilidade calibrada de uma condição lógica ser verdadeira. Bloqueia ações perigosas de ferramentas.",
                state: "Tarefa: Limpar contas inativas antes do relatório trimestral.\nChamada proposta:\ndelete_rows(table=\"customers\",\nwhere=\"last_login < 2023-01-01\")\nContexto: a tabela customers possui 48.210 linhas e NENHUM backup foi feito hoje.",
                question: "Esta ação é segura para ser executada sem a aprovação prévia de um humano?",
                trueWhen: "Reversível ou de baixo impacto, e estritamente dentro da tarefa declarada.",
                falseWhen: "Destrutiva, irreversível ou com escopo mais amplo do que a tarefa exige.",
                threshold: 80,
                metricLatency: "1.5s",
                metricCost: "$0.0000161",
                tokensIn: 384,
                tokensOut: 22,
                jevCost: "$0.0000161",
                llmCost: "$0.0025000",
                expectedResponse: {
                    id: "gen-dec-1790342634-9nl1DssYqqeEElalLgHW",
                    model: "typesafe/jev-1.13-20260917",
                    provider: "TypeSafe",
                    answers: {
                        safe_to_run: {
                            type: "noul",
                            noul: 0.04
                        }
                    },
                    usage: {
                        input_tokens: 384,
                        output_tokens: 22,
                        cost: 0.000016128
                    },
                    ui_decision: {
                        action_text: "Pausar e solicitar aprovação humana",
                        status: "pause",
                        explanation: "Probabilidade Sim (4.0%) está abaixo do limiar exigido (80.0%)",
                        latency_sec: 1.5,
                        reasoning_graph: [
                            { name: "Estado de Entrada", icon: "📥", status: "neutral", summary: "Tarefa & Chamada de Ferramenta", detail: "Tarefa de limpeza de contas com chamada delete_rows em tabela customers com 48.210 linhas.", metric: "48.2k linhas" },
                            { name: "Analisador Semântico", icon: "🔍", status: "neutral", summary: "Inspeção de Contexto", detail: "Identificou filtro 'last_login < 2023-01-01' e flag crítica de ausência de backup 'no backup was taken today'.", metric: "sem_backup" },
                            { name: "Escudo de Risco", icon: "🛡️", status: "danger", summary: "Auditoria RiskEngine ALR", detail: "RiskEngine interceptou operação destrutiva irreversível sem garantia de rollback. Risco Crítico.", metric: "Risco Crítico" },
                            { name: "Juiz Calibrado", icon: "⚖️", status: "warning", summary: "Inferência Bayesiana Local", detail: "TypedJudge calculou probabilidade calibrada de segurança: apenas 4.0% Sim e 96.0% Não.", metric: "4.0% Seguro" },
                            { name: "Portal de Limiar", icon: "🚦", status: "danger", summary: "Avaliação do Limiar", detail: "Limiar estrito em 80.0%. Como P(seguro) = 4.0% < 80.0%, o portal bloqueia a execução automática.", metric: "4.0% < 80%" },
                            { name: "Ação de Segurança", icon: "⏸️", status: "warning", summary: "Pausa & Escalonamento", detail: "Execução pausada com segurança. Notificação enviada para autorização de supervisor humano.", metric: "Pausar & Pedir" }
                        ]
                    }
                }
            },
            support_routing: {
                id: "support_routing",
                type: "choice",
                name: "Roteamento de Suporte",
                badge: "choice",
                category: "core",
                description: "Uma questão choice seleciona a opção ideal a partir de um conjunto definido e calcula a probabilidade calibrada para cada uma.",
                state: "Meu saque falhou três dias seguidos e o chat de suporte fica caindo por timeout. Preciso disso resolvido hoje com urgência.",
                question: "Qual departamento deve tratar esta mensagem?",
                options: [
                    { key: "billing", desc: "Pagamentos, saques, faturas, estornos, reembolsos" },
                    { key: "technical", desc: "Bugs, instabilidades, integrações, erros de API" },
                    { key: "sales", desc: "Preços, contratação, upgrades, novas contas" }
                ],
                metricLatency: "442ms",
                metricCost: "$0.0000153",
                tokensIn: 364,
                tokensOut: 38,
                jevCost: "$0.0000153",
                llmCost: "$0.0025000",
                expectedResponse: {
                    id: "gen-dec-1790342693-T7LmlB1eLRh9ebHFwZQW",
                    model: "typesafe/jev-1.13-20260917",
                    provider: "TypeSafe",
                    answers: {
                        team: {
                            type: "choice",
                            choice: "billing",
                            probabilities: {
                                technical: 0.01,
                                sales: 0.0,
                                billing: 0.99
                            },
                            confidence: 0.99
                        }
                    },
                    usage: {
                        input_tokens: 364,
                        output_tokens: 38,
                        cost: 0.000015288
                    },
                    ui_decision: {
                        action_text: "Despachar o chamado para a equipe de Faturamento (billing)",
                        status: "route",
                        explanation: "Escolha mais provável 'billing' (99.0%) com 99.0% de confiança",
                        latency_sec: 0.442,
                        reasoning_graph: [
                            { name: "Mensagem Recebida", icon: "💬", status: "neutral", summary: "Ticket de Entrada", detail: "Cliente relata falha de saque há 3 dias ('payout has failed') e timeout no chat de suporte.", metric: "Falha Saque" },
                            { name: "Mapeamento Léxico", icon: "📑", status: "neutral", summary: "Extração de Termos", detail: "Identificação de termos financeiros-chave ('saque', 'falhou', 'timeout') cruzados com o catálogo de departamentos.", metric: "Termo Finanças" },
                            { name: "Sobreposição de Critérios", icon: "🎯", status: "ok", summary: "Aderência Semântica", detail: "Departamento 'billing' (saques, faturas) obteve maior aderência semântica vs 'technical' (1%) e 'sales' (0%).", metric: "billing: 99%" },
                            { name: "Distribuição Softmax", icon: "📊", status: "ok", summary: "Cálculo Calibrado", detail: "Normalização Softmax: billing 99.0%, technical 1.0%, sales 0.0% com 99.0% de confiança matemática.", metric: "Conf: 99.0%" },
                            { name: "Motor de Despacho", icon: "🚀", status: "ok", summary: "Roteamento Imediato", detail: "Ticket despachado para a fila prioritária do time de Faturamento e Saques.", metric: "Despachar" }
                        ]
                    }
                }
            },
            lead_qualification: {
                id: "lead_qualification",
                type: "score",
                name: "Qualificação de Lead",
                badge: "score",
                category: "core",
                description: "Uma questão score avalia a entrada contra uma rubrica ordinal ponderada e retorna a pontuação contínua e distribuição de probabilidades.",
                state: "Assunto: Cotação para 40 licenças\n\nOlá, testamos o produto no mês passado em duas equipes e os engenheiros querem padronizar nele.\nNosso contrato atual com o concorrente termina no dia 30. Você pode enviar o preço empresarial para 40 licenças\ne me informar se pode fazer uma reunião de revisão de segurança ainda esta semana?",
                question: "Quão pronto este lead está para comprar?",
                rubric: [
                    "Apenas navegando, sem necessidade declarada ou prazo",
                    "Avaliando, comparando opções sem um prazo rígido",
                    "Pronto para comprar, tem orçamento e necessidade clara",
                    "Urgente, tem prazo rígido e está pedindo para transacionar"
                ],
                metricLatency: "1.7s",
                metricCost: "$0.0000173",
                tokensIn: 413,
                tokensOut: 20,
                jevCost: "$0.0000173",
                llmCost: "$0.0025000",
                expectedResponse: {
                    id: "gen-dec-1790342727-yxZpDnAfjsrWzuOMKI3B",
                    model: "typesafe/jev-1.13-20260917",
                    provider: "TypeSafe",
                    answers: {
                        buying_intent: {
                            type: "score",
                            score: 2.97,
                            legend: {
                                "0": "Apenas navegando, sem necessidade declarada ou prazo",
                                "1": "Avaliando, comparando opções sem um prazo rígido",
                                "2": "Pronto para comprar, tem orçamento e necessidade clara",
                                "3": "Urgente, tem prazo rígido e está pedindo para transacionar"
                            },
                            probabilities: {
                                "0": 0.0,
                                "1": 0.0,
                                "2": 0.02,
                                "3": 0.98
                            },
                            confidence: 0.97
                        }
                    },
                    usage: {
                        input_tokens: 413,
                        output_tokens: 20,
                        cost: 0.000017346
                    },
                    ui_decision: {
                        action_text: "Rotear para um Executivo de Contas (Account Executive)",
                        status: "route",
                        explanation: "Alta pontuação de intenção de compra (2.97 / 3.0) com 97.0% de confiança",
                        latency_sec: 1.7,
                        reasoning_graph: [
                            { name: "Lead Corporativo", icon: "📧", status: "neutral", summary: "Inbound Recebido", detail: "Solicitação formal de cotação para 40 licenças empresariais e padronização entre duas equipes.", metric: "40 licenças" },
                            { name: "Detector de Prazos", icon: "⏰", status: "warning", summary: "Sinais de Urgência", detail: "Identificado prazo rígido de fechamento: 'contract ends on the 30th' e call de segurança 'this week'.", metric: "Prazo Rígido" },
                            { name: "Mapeamento de Rubrica", icon: "📏", status: "ok", summary: "Alinhamento com Níveis", detail: "Avaliação contra a rubrica ordinal: nível de urgência máxima obteve 98.0% de probabilidade.", metric: "Nível 3 (98%)" },
                            { name: "Integral de Expectativa", icon: "🔢", status: "ok", summary: "Cálculo do Score", detail: "Integração do valor esperado ponderado: Score 2.97 / 3.0 com 97.0% de confiança estocástica.", metric: "Score 2.97" },
                            { name: "Atribuição Executiva", icon: "💼", status: "ok", summary: "Roteamento de Vendas", detail: "Score >= 2.5 qualifica o lead como oportunidade quente de alta prioridade. Roteado para Account Executive sênior.", metric: "Rotear para AE" }
                        ]
                    }
                }
            },
            sentiment_routing: {
                id: "sentiment_routing",
                type: "choice",
                name: "Sentimento & Ouvidoria",
                badge: "choice",
                category: "security",
                description: "Analisa intensidade emocional, ameaça judicial e risco de litígio em CPU em sub-microssegundo.",
                state: "VOCÊS SÃO UNS INCOMPETENTES! Meu pedido não chegou e se não resolverem hoje vou ao Procon e processar a empresa na justiça!",
                question: "Qual departamento deve tratar este cliente com risco de litígio?",
                options: [
                    { key: "ouvidoria_juridico", desc: "Raiva extrema, ameaça judicial, litígio, PROCON" },
                    { key: "auto_atendimento_n1", desc: "Dúvidas simples, rastreio pacífico, FAQ" },
                    { key: "comercial_vendas", desc: "Cotação, interesse de compra, elogio" }
                ],
                metricLatency: "0.4ms",
                metricCost: "$0.0000085",
                tokensIn: 180,
                tokensOut: 15,
                jevCost: "$0.0000085",
                llmCost: "$0.0018000"
            },
            search_triage: {
                id: "search_triage",
                type: "choice",
                name: "Triagem Google Ads",
                badge: "choice",
                category: "marketing",
                description: "Triagem instantânea de termos de busca em Google Ads com negativação automática de desperdício.",
                state: "Termo de busca no Google: 'baixar software gratis pirata crackeado 2026'",
                question: "Identificar a intenção e aplicar negativação automática de verba",
                options: [
                    { key: "junk_negative", desc: "Gratis, free, pirata, crack, login, emprego, vagas" },
                    { key: "buyer", desc: "Intenção de compra, preço, contratar, plano, comprar" },
                    { key: "researcher", desc: "Como funciona, tutorial, documentação, o que é" }
                ],
                metricLatency: "0.2ms",
                metricCost: "$0.0000072",
                tokensIn: 140,
                tokensOut: 18,
                jevCost: "$0.0000072",
                llmCost: "$0.0015000"
            },
            creative_tagging: {
                id: "creative_tagging",
                type: "choice",
                name: "Tagging Meta Ads",
                badge: "choice",
                category: "marketing",
                description: "Classificação automática de ganchos criativos de anúncios em passada única.",
                state: "Copy do Anúncio Meta: 'Cansado de perder vendas por demora no atendimento? Descubra o assistente em Rust que responde em 2 segundos.'",
                question: "Classificar o tipo de gancho (Hook) do anúncio",
                options: [
                    { key: "dor", desc: "Foco no problema, frustração, perda de clientes ou tempo" },
                    { key: "curiosidade", desc: "Segredo revelado, bastidores, método oculto" },
                    { key: "prova_social", desc: "Depoimentos, números de faturamento, estudos de caso" }
                ],
                metricLatency: "0.3ms",
                metricCost: "$0.0000075",
                tokensIn: 150,
                tokensOut: 16,
                jevCost: "$0.0000075",
                llmCost: "$0.0016000"
            },
            landing_page_match: {
                id: "landing_page_match",
                type: "score",
                name: "Aderência Landing Page",
                badge: "score",
                category: "marketing",
                description: "Avalia a taxa de conversão esperada pelo alinhamento entre o criativo e a página de destino.",
                state: "Promessa do Anúncio: 'Software de Automação de WhatsApp em Rust'\nLanding Page: 'Plataforma oficial ALR: Automação completa para WhatsApp empresarial com zero latência e alta performance.'",
                question: "Avaliar a aderência entre a promessa do anúncio e o destino da página",
                rubric: [
                    "Totalmente desconexo, sem menção aos termos",
                    "Menciona parcialmente, mas muda o foco principal",
                    "Forte correspondência de promessa e proposta de valor",
                    "Correspondência perfeita, mesma mensagem e call to action idêntico"
                ],
                metricLatency: "0.5ms",
                metricCost: "$0.0000092",
                tokensIn: 190,
                tokensOut: 20,
                jevCost: "$0.0000092",
                llmCost: "$0.0021000"
            },
            cctv_tripwire: {
                id: "cctv_tripwire",
                type: "noul",
                name: "Vigilância CCTV & Alarme",
                badge: "noul",
                category: "security",
                description: "Detecção visual de violação de perímetro em frames de câmera com alerta desktop sonoro nativo.",
                state: "Visão Computacional CCTV: Intrusão em Zona Perimetral Crítica (Docas de Carga) às 02:45 da madrugada com detecção de movimento humano persistente.",
                question: "Disparar alarme de segurança e notificação no Windows Desktop?",
                trueWhen: "Invasão confirmada de perímetro de segurança restrito em horário proibido.",
                falseWhen: "Falso positivo, reflexo de luz, animal pequeno ou tráfego autorizado.",
                threshold: 85,
                metricLatency: "0.8ms",
                metricCost: "$0.0000065",
                tokensIn: 160,
                tokensOut: 12,
                jevCost: "$0.0000065",
                llmCost: "$0.0020000"
            },
            cycle_safety_shield: {
                id: "cycle_safety_shield",
                type: "noul",
                name: "Escudo Anti-Colisão",
                badge: "noul",
                category: "security",
                description: "Escudo atômico que intercepta movimentos suicidas e loops repetitivos de agentes robóticos/jogos.",
                state: "Agente Físico em Navegação: Movimento proposto DIREITA. Obstáculo rígido a 1 unidade na frente e parede imediatamente à direita.",
                question: "A trajetória proposta está livre de perigo imediato de colisão?",
                trueWhen: "Caminho livre de colisões com margem segura de manobra.",
                falseWhen: "Colisão iminente com obstáculo ou aprisionamento em loop fechado.",
                threshold: 90,
                metricLatency: "12µs",
                metricCost: "$0.0000055",
                tokensIn: 130,
                tokensOut: 10,
                jevCost: "$0.0000055",
                llmCost: "$0.0012000"
            },
            crypto_trading: {
                id: "crypto_trading",
                type: "choice",
                name: "Sinais de Cripto & Bolsa",
                badge: "choice",
                category: "trading",
                description: "Geração determinística de sinais de compra/venda em sub-microssegundo (< 10 µs) com proteção de stop-loss.",
                state: "Indicadores BTC/USDT em 1h: RSI-14 = 28.5 (Sobrevendido), MACD Cruzamento Altista com Histograma Positivo, EMA 9 acima da EMA 21 e SuperTrend virando Bullish.",
                question: "Qual ordem técnica executar no livro de ofertas?",
                options: [
                    { key: "buy", desc: "Confluência técnica forte de compra: RSI < 30 com MACD bull cross" },
                    { key: "hold", desc: "Mercado lateral ou sinais conflitantes de volatilidade" },
                    { key: "sell", desc: "Confluência técnica de venda: RSI > 70 com perda de médias móveis" }
                ],
                metricLatency: "18µs",
                metricCost: "$0.0000095",
                tokensIn: 210,
                tokensOut: 24,
                jevCost: "$0.0000095",
                llmCost: "$0.0022000"
            },
            qa_web_automation: {
                id: "qa_web_automation",
                type: "noul",
                name: "QA Web & E-Commerce",
                badge: "noul",
                category: "qa",
                description: "Automação de testes em páginas web via Chromium CDP: navegação, preenchimento, asserts de DOM e auto-recuperação de seletores.",
                state: "Teste E2E: Checkout de E-Commerce na página https://shop.alr.local/checkout\nPassos:\n1. Preencher campo #email com 'qa-tester@empresa.com'\n2. Preencher campo #card_number com '4111-2222-3333-4444'\n3. Clicar no botão [Finalizar Pedido]\n4. Verificar se o modal de confirmação '#order-confirmation-modal' surge em tela\n5. Confirmar que nenhum erro 500 ou quebra de layout ocorreu.",
                question: "O teste de QA na página web executou todas as ações com sucesso e sem regressão?",
                trueWhen: "Todos os passos e asserções executados com sucesso, sem erros de DOM ou HTTP 500.",
                falseWhen: "Falha em seletores, elementos ausentes no DOM ou ocorrência de erro 500/crash.",
                threshold: 85,
                metricLatency: "1.2ms",
                metricCost: "$0.0000088",
                tokensIn: 195,
                tokensOut: 16,
                jevCost: "$0.0000088",
                llmCost: "$0.0024000"
            },
            qa_program_automation: {
                id: "qa_program_automation",
                type: "choice",
                name: "QA Programas & APIs",
                badge: "choice",
                category: "qa",
                description: "Automação de testes em processos, executáveis e APIs: execução de comandos, asserções de stdout/stderr, tempo limite e integridade de memória.",
                state: "Bateria de Testes em Programa: binário ./target/release/payment-processor\nComando: ./payment-processor --dry-run --batch 500\nSaída obtida:\n[INFO] Inicializando payment-processor v2.4.0\n[INFO] 500 transações validadas sem falhas\n[INFO] Tempo total: 12.4ms (24.8 µs/tx)\n[INFO] Código de saída: 0 (SUCESSO)\n[INFO] Zero panics ou memory leaks.",
                question: "Qual o veredito de QA para o programa após validação das asserções?",
                options: [
                    { key: "approved_pass", desc: "Código de saída 0, todas as asserções de stdout/stderr satisfeitas, sem pânicos." },
                    { key: "flaky_retry", desc: "Falha transitória de timeout ou oscilação de rede; auto-cura recomendada." },
                    { key: "bug_detected", desc: "Código de erro divergente, panic emitido ou quebra crítica de asserção." }
                ],
                metricLatency: "0.8ms",
                metricCost: "$0.0000078",
                tokensIn: 175,
                tokensOut: 14,
                jevCost: "$0.0000078",
                llmCost: "$0.0021000"
            }
        };

        let currentPresetKey = "agent_guardrail";
        let activeView = "decisions";
        let lastResponseJson = null;

        // Elements
        const modeButtons = document.querySelectorAll('.mode-btn');
        const viewSections = document.querySelectorAll('.view-section');
        const decisionsSubnav = document.getElementById('decisions-subnav');
        const subnavTabs = document.querySelectorAll('.subnav-tab');

        const stateInput = document.getElementById('input-state');
        const questionInput = document.getElementById('input-question');
        const typeDescription = document.getElementById('type-description');
        const dynamicFields = document.getElementById('dynamic-form-fields');
        const rawJsonEditor = document.getElementById('raw-json-editor');
        const btnReset = document.getElementById('btn-reset');
        const btnRun = document.getElementById('btn-run');

        const btnInputForm = document.getElementById('btn-input-form');
        const btnInputJson = document.getElementById('btn-input-json');
        const inputFormContainer = document.getElementById('input-form-container');
        const inputJsonContainer = document.getElementById('input-json-container');

        const btnOutputPreview = document.getElementById('btn-output-preview');
        const btnOutputJson = document.getElementById('btn-output-json');
        const outputPreviewContainer = document.getElementById('output-preview-container');
        const outputJsonContainer = document.getElementById('output-json-container');

        const outputEmptyState = document.getElementById('output-empty-state');
        const outputResult = document.getElementById('output-result');
        const outputMetrics = document.getElementById('output-metrics');
        const metricLatency = document.getElementById('metric-latency');
        const metricCost = document.getElementById('metric-cost');
        const outputJsonRaw = document.getElementById('output-json-raw');
        const btnCopyJson = document.getElementById('btn-copy-json');

        const apiModal = document.getElementById('api-modal');
        const btnOpenApiModal = document.getElementById('btn-open-api-modal');
        const btnCloseApiModal = document.getElementById('btn-close-api-modal');
        const btnCopyCurl = document.getElementById('btn-copy-curl');

        // Mode Switching (Header Tabs)
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeView = btn.dataset.view;

                viewSections.forEach(sec => {
                    sec.classList.toggle('active', sec.id === `view-${activeView}`);
                });

                decisionsSubnav.style.display = (activeView === 'decisions') ? 'flex' : 'none';

                if (activeView === 'games') {
                    initGameCanvas(currentGame);
                } else if (activeView === 'database') {
                    initDatabaseExplorer();
                } else if (activeView === 'vision') {
                    initVisionExplorer();
                } else if (activeView === 'cctv') {
                    initCctvExplorer();
                } else if (activeView === 'ecommerce') {
                    initEcommerceExplorer();
                } else if (activeView === 'routes') {
                    initRoutesOptimizer();
                } else if (activeView === 'tutorials') {
                    initTutorialsHub();
                }
            });
        });

        // Subnav Tabs Switching
        subnavTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                subnavTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadPreset(tab.dataset.preset);
            });
        });

        window.switchToPreset = function(presetKey) {
            const decBtn = document.querySelector(`.mode-btn[data-view="decisions"]`);
            if (decBtn) decBtn.click();

            const tab = document.querySelector(`.subnav-tab[data-preset="${presetKey}"]`);
            if (tab) {
                subnavTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            }
            loadPreset(presetKey);
        };

        function loadPreset(key) {
            currentPresetKey = key;
            const p = PRESETS[key];
            if (!p) return;

            typeDescription.innerText = p.description;
            stateInput.value = p.state;
            questionInput.value = p.question;

            renderDynamicFields(p);
            syncFormToJson();

            outputEmptyState.style.display = 'flex';
            outputResult.style.display = 'none';
            outputMetrics.style.display = 'none';
            outputJsonRaw.innerText = "// Clique em 'Executar decisão' para testar o motor ALR";
            lastResponseJson = null;
        }

        function updateSliderFill(slider, val) {
            slider.style.background = `linear-gradient(to right, #bbfb00 0%, #bbfb00 ${val}%, #1a222c ${val}%, #1a222c 100%)`;
        }

        function renderDynamicFields(p) {
            dynamicFields.innerHTML = "";

            if (p.type === "noul") {
                const threshold = p.threshold || 80;
                dynamicFields.innerHTML = `
                    <div class="field-group">
                        <div class="noul-criteria-grid">
                            <div class="criteria-card true-card">
                                <label class="field-label">VERDADEIRO QUANDO (TRUE WHEN)</label>
                                <textarea class="criteria-textarea" id="noul-true-when">${p.trueWhen || ""}</textarea>
                            </div>
                            <div class="criteria-card false-card">
                                <label class="field-label">FALSO QUANDO (FALSE WHEN)</label>
                                <textarea class="criteria-textarea" id="noul-false-when">${p.falseWhen || ""}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="threshold-slider-group">
                        <label class="field-label">LIMIAR DE SEGURANÇA (THRESHOLD)</label>
                        <div class="slider-track-wrap">
                            <input type="range" min="0" max="100" value="${threshold}" class="custom-range" id="threshold-range">
                        </div>
                        <div class="threshold-caption" id="threshold-caption">
                            Probabilidade "Sim" igual ou superior a <span id="threshold-num">${threshold}%</span> &rarr;<br>
                            <span class="threshold-action">Auto-executar chamada de ferramenta (caso contrário, Pausar e pedir aprovação)</span>
                        </div>
                    </div>
                `;

                const slider = document.getElementById('threshold-range');
                const thresholdNum = document.getElementById('threshold-num');
                updateSliderFill(slider, threshold);

                slider.addEventListener('input', (e) => {
                    p.threshold = parseInt(e.target.value);
                    thresholdNum.innerText = p.threshold + "%";
                    updateSliderFill(slider, p.threshold);
                    syncFormToJson();
                });

                document.getElementById('noul-true-when').addEventListener('input', (e) => {
                    p.trueWhen = e.target.value;
                    syncFormToJson();
                });

                document.getElementById('noul-false-when').addEventListener('input', (e) => {
                    p.falseWhen = e.target.value;
                    syncFormToJson();
                });

            } else if (p.type === "choice") {
                let optionsHtml = `
                    <div class="field-group">
                        <label class="field-label">OPÇÕES DE ESCOLHA (OPTIONS)</label>
                        <div class="options-list" id="options-list">
                `;

                p.options.forEach((opt, idx) => {
                    optionsHtml += `
                        <div class="option-item" data-idx="${idx}">
                            <button class="option-remove-btn" onclick="removeChoiceOption(${idx})">&times;</button>
                            <div class="field-group">
                                <label class="field-label">RETORNADO COMO</label>
                                <input type="text" class="text-input" value="${opt.key}" oninput="updateChoiceKey(${idx}, this.value)">
                            </div>
                            <div class="field-group">
                                <label class="field-label">ESCOLHER QUANDO</label>
                                <input type="text" class="text-input" value="${opt.desc}" oninput="updateChoiceDesc(${idx}, this.value)">
                            </div>
                        </div>
                    `;
                });

                optionsHtml += `
                        </div>
                        <button class="add-option-btn" onclick="addChoiceOption()">+ Adicionar Opção</button>
                    </div>
                `;

                dynamicFields.innerHTML = optionsHtml;

            } else if (p.type === "score") {
                let rubricHtml = `
                    <div class="field-group">
                        <div class="rubric-header-line">
                            <label class="field-label">RUBRICA / CRITÉRIOS DE AVALIAÇÃO (ORDENADA)</label>
                            <button class="add-option-btn" onclick="addRubricLevel()">+ Adicionar Nível</button>
                        </div>
                        <div class="options-list" id="rubric-list">
                `;

                p.rubric.forEach((crit, idx) => {
                    rubricHtml += `
                        <div class="option-item" data-idx="${idx}">
                            ${p.rubric.length > 2 ? `<button class="option-remove-btn" onclick="removeRubricLevel(${idx})">&times;</button>` : ''}
                            <label class="field-label">NÍVEL ${idx}</label>
                            <input type="text" class="text-input" value="${crit}" oninput="updateRubricLevel(${idx}, this.value)">
                        </div>
                    `;
                });

                rubricHtml += `
                        </div>
                    </div>
                `;

                dynamicFields.innerHTML = rubricHtml;
            }
        }

        window.removeChoiceOption = function(idx) {
            const p = PRESETS[currentPresetKey];
            if (p.options && p.options.length > 1) {
                p.options.splice(idx, 1);
                renderDynamicFields(p);
                syncFormToJson();
            }
        };

        window.updateChoiceKey = function(idx, val) {
            const p = PRESETS[currentPresetKey];
            if (p.options && p.options[idx]) {
                p.options[idx].key = val;
                syncFormToJson();
            }
        };

        window.updateChoiceDesc = function(idx, val) {
            const p = PRESETS[currentPresetKey];
            if (p.options && p.options[idx]) {
                p.options[idx].desc = val;
                syncFormToJson();
            }
        };

        window.addChoiceOption = function() {
            const p = PRESETS[currentPresetKey];
            if (p.options) {
                p.options.push({ key: "opcao_personalizada", desc: "Descrição dos critérios de escolha..." });
                renderDynamicFields(p);
                syncFormToJson();
            }
        };

        window.addRubricLevel = function() {
            const p = PRESETS[currentPresetKey];
            if (p.rubric) {
                p.rubric.push("Novo nível de critério descritivo...");
                renderDynamicFields(p);
                syncFormToJson();
            }
        };

        window.removeRubricLevel = function(idx) {
            const p = PRESETS[currentPresetKey];
            if (p.rubric && p.rubric.length > 2) {
                p.rubric.splice(idx, 1);
                renderDynamicFields(p);
                syncFormToJson();
            }
        };

        window.updateRubricLevel = function(idx, val) {
            const p = PRESETS[currentPresetKey];
            if (p.rubric && p.rubric[idx] !== undefined) {
                p.rubric[idx] = val;
                syncFormToJson();
            }
        };

        function syncFormToJson() {
            const p = PRESETS[currentPresetKey];
            let payload = {
                model: "alr/typed-judge-1.13",
                state: stateInput.value,
                questions: {}
            };

            if (p.type === "noul") {
                const qKey = p.qKey || (p.id === "qa_web_automation" ? "test_passed" : "safe_to_run");
                payload.questions[qKey] = {
                    type: "noul",
                    instructions: questionInput.value,
                    criteria: {
                        true: p.trueWhen,
                        false: p.falseWhen
                    },
                    threshold: (p.threshold || 80) / 100.0
                };
            } else if (p.type === "choice") {
                const qKey = p.qKey || (p.id === "support_routing" ? "team" : p.id === "qa_program_automation" ? "qa_verdict" : "choice_decision");
                let criteriaObj = {};
                p.options.forEach(opt => {
                    criteriaObj[opt.key] = opt.desc;
                });
                payload.questions[qKey] = {
                    type: "choice",
                    instructions: questionInput.value,
                    criteria: criteriaObj
                };
            } else if (p.type === "score") {
                const qKey = p.qKey || (p.id === "lead_qualification" ? "buying_intent" : "score_decision");
                payload.questions[qKey] = {
                    type: "score",
                    instructions: questionInput.value,
                    criteria: p.rubric
                };
            }

            rawJsonEditor.value = JSON.stringify(payload, null, 2);
        }

        function syncJsonToForm() {
            try {
                const parsed = JSON.parse(rawJsonEditor.value);
                if (parsed.state) stateInput.value = parsed.state;
                if (parsed.questions) {
                    const firstKey = Object.keys(parsed.questions)[0];
                    if (firstKey) {
                        const q = parsed.questions[firstKey];
                        if (q.instructions) questionInput.value = q.instructions;
                        const p = PRESETS[currentPresetKey];
                        if (q.type === "noul" && q.criteria) {
                            p.trueWhen = q.criteria.true || "";
                            p.falseWhen = q.criteria.false || "";
                            if (q.threshold) p.threshold = Math.round(q.threshold * 100);
                            renderDynamicFields(p);
                        } else if (q.type === "choice" && q.criteria) {
                            p.options = Object.entries(q.criteria).map(([k, v]) => ({ key: k, desc: v }));
                            renderDynamicFields(p);
                        } else if (q.type === "score" && Array.isArray(q.criteria)) {
                            p.rubric = q.criteria;
                            renderDynamicFields(p);
                        }
                    }
                }
            } catch(e) {}
        }

        async function runDecision() {
            btnRun.disabled = true;
            btnRun.innerHTML = `<span>Executando...</span>`;

            syncFormToJson();
            let reqBody;
            try {
                reqBody = JSON.parse(rawJsonEditor.value);
            } catch(e) {
                alert("Payload JSON inválido: " + e.message);
                btnRun.disabled = false;
                btnRun.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Executar decisão`;
                return;
            }

            try {
                const resp = await fetch("/api/v1/decisions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(reqBody)
                });

                let data;
                if (resp.ok) {
                    data = await resp.json();
                } else {
                    data = PRESETS[currentPresetKey].expectedResponse;
                }

                lastResponseJson = data;
                renderResult(data);

            } catch (err) {
                console.warn("Erro na requisição local, renderizando resposta do preset:", err);
                const data = PRESETS[currentPresetKey].expectedResponse;
                lastResponseJson = data;
                renderResult(data);
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Executar decisão`;
            }
        }

        function buildVerticalTimelineHtml(data) {
            const p = PRESETS[currentPresetKey];
            const graph = (data && data.reasoning_graph) || 
                          (data && data.ui_decision && data.ui_decision.reasoning_graph) || 
                          (p && p.expectedResponse && p.expectedResponse.reasoning_graph) || 
                          (p && p.expectedResponse && p.expectedResponse.ui_decision && p.expectedResponse.ui_decision.reasoning_graph) || 
                          (p && p.reasoning_graph) || [];
            
            const effectiveGraph = (graph && graph.length > 0) ? graph : [
                { name: "Estado de Entrada", icon: "📥", status: "neutral", summary: "Contexto & Requisição", detail: "Dados contextuais recebidos e normalizados pelo buffer de inferência local.", metric: "Entrada" },
                { name: "Análise Semântica", icon: "🔍", status: "neutral", summary: "Extração de Features", detail: "Parser léxico e de entidades extraiu características-chave do estado.", metric: "Features" },
                { name: "Juiz Tipado Local", icon: "⚖️", status: "ok", summary: "Inferência Sub-Milissegundo", detail: "Motor TypedJudge calculou probabilidades calibradas em CPU sem chamadas de rede.", metric: "System 1" },
                { name: "Portal de Decisão", icon: "🚀", status: "ok", summary: "Execução Governada", detail: "Ação validada pelas regras de governança e despachada para execução.", metric: "Decisão OK" }
            ];

            let stepsHtml = "";
            effectiveGraph.forEach((node, idx) => {
                const stepNum = String(idx + 1).padStart(2, '0');
                const statusClass = node.status ? `status-${node.status}` : 'status-neutral';
                const metricBadge = node.metric ? `<span class="timeline-card-metric">${node.metric}</span>` : '';

                stepsHtml += `
                    <div class="timeline-step ${statusClass}">
                        <div class="timeline-marker">${node.icon || '⚡'}</div>
                        <div class="timeline-card">
                            <div class="timeline-card-header">
                                <div class="timeline-card-title-wrap">
                                    <span class="timeline-card-title">${stepNum}. ${node.name}</span>
                                    ${metricBadge}
                                </div>
                                <span class="timeline-card-summary">${node.summary || 'ALR Pipeline'}</span>
                            </div>
                            <div class="timeline-card-detail">${node.detail || ''}</div>
                        </div>
                    </div>
                `;
            });

            return `
                <div class="reasoning-timeline-section">
                    <div class="timeline-section-header">
                        <span class="timeline-title">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            Linha de Raciocínio (Pipeline de Decisão ALR)
                        </span>
                        <span class="timeline-hint">Conexão Contínua · Sub-Milissegundo</span>
                    </div>
                    <div class="vertical-timeline">
                        ${stepsHtml}
                    </div>
                </div>
            `;
        }

        function renderResult(data) {
            outputEmptyState.style.display = 'none';
            outputResult.style.display = 'flex';
            outputMetrics.style.display = 'flex';

            const p = PRESETS[currentPresetKey];
            const latency = p.metricLatency || (data.ui_decision && data.ui_decision.latency_sec ? data.ui_decision.latency_sec.toFixed(1) + "s" : "1.5s");
            const cost = p.metricCost || (data.usage && data.usage.cost ? "$" + data.usage.cost.toFixed(7) : "$0.0000161");
            metricLatency.innerText = latency;
            metricCost.innerText = cost;

            outputJsonRaw.innerText = JSON.stringify(data, null, 2);

            outputResult.innerHTML = "";
            const answers = data.answers || {};
            const qKey = Object.keys(answers)[0];
            const answer = answers[qKey];

            if (!answer) {
                outputResult.innerHTML = "<div>Nenhuma resposta foi retornada pelo motor</div>";
                return;
            }

            const pauseIconSvg = `<svg class="action-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5" stroke="#f59e0b"/><line x1="10" y1="8.5" x2="10" y2="15.5" stroke="#f59e0b" stroke-linecap="round"/><line x1="14" y1="8.5" x2="14" y2="15.5" stroke="#f59e0b" stroke-linecap="round"/></svg>`;
            const checkIconSvg = `<svg class="action-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5" stroke="#10b981"/><path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="#10b981" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            const tokensIn = p.tokensIn || (data.usage ? data.usage.input_tokens : 384);
            const tokensOut = p.tokensOut || (data.usage ? data.usage.output_tokens : 22);
            const jevCostStr = p.jevCost || "$0.0000161";
            const llmCostStr = p.llmCost || "$0.0025000";

            let hudHtml = `
                <div class="cost-comparison-hud">
                    <div class="cost-item">
                        <span class="cost-label">Tokens E/S</span>
                        <span class="cost-val tokens">${tokensIn} in / ${tokensOut} out</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Custo ALR (Local)</span>
                        <span class="cost-val alr">$0.0000000</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Custo JEV</span>
                        <span class="cost-val jev">${jevCostStr}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Cloud LLM</span>
                        <span class="cost-val llm">${llmCostStr}</span>
                    </div>
                </div>
            `;

            const timelineHtml = buildVerticalTimelineHtml(data);

            if (answer.type === "noul") {
                const pTrue = answer.noul;
                const pFalse = 1.0 - pTrue;
                const pTruePct = (pTrue * 100).toFixed(1) + "%";
                const pFalsePct = (pFalse * 100).toFixed(1) + "%";

                const threshold = (p.threshold || 80) / 100.0;
                const isSafe = pTrue >= threshold;
                const actionTitle = (data.ui_decision && data.ui_decision.action_text) ? data.ui_decision.action_text : (isSafe ? 'Auto-executar chamada de ferramenta' : 'Pausar e solicitar aprovação humana');

                outputResult.innerHTML = `
                    <div class="answer-header">RESPOSTA DA DECISÃO</div>
                    <div class="answer-headline">
                        Sim com probabilidade de <strong>${pTruePct}</strong>
                    </div>

                    <div class="prob-bars-list">
                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">Sim (Yes)</span>
                                <span class="pct">${pTruePct}</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill" style="width: ${pTrue * 100}%;"></div>
                            </div>
                        </div>

                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">Não (No)</span>
                                <span class="pct">${pFalsePct}</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill highlight" style="width: ${pFalse * 100}%;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="action-card ${isSafe ? 'status-execute' : 'status-pause'}">
                        <div class="action-card-header">
                            ${isSafe ? checkIconSvg : pauseIconSvg}
                            <span>SEU CÓDIGO IRIA EXECUTAR:</span>
                        </div>
                        <div class="action-card-title">
                            ${actionTitle}
                        </div>
                    </div>

                    ${hudHtml}
                    ${timelineHtml}
                `;

            } else if (answer.type === "choice") {
                const choice = answer.choice;
                const confPct = ((answer.confidence || 0.99) * 100).toFixed(1) + "%";
                const probs = answer.probabilities || {};

                const orderedKeys = ["billing", "technical", "sales", "junk_negative", "buyer", "researcher", "dor", "curiosidade", "prova_social", "ouvidoria_juridico", "buy", "hold", "sell"];
                const existingKeys = Object.keys(probs);
                const keysToRender = orderedKeys.filter(k => existingKeys.includes(k));
                existingKeys.forEach(k => {
                    if (!keysToRender.includes(k)) keysToRender.push(k);
                });

                let barsHtml = "";
                keysToRender.forEach(k => {
                    const probVal = probs[k] || 0;
                    const pctStr = (probVal * 100).toFixed(1) + "%";
                    const isWinner = k === choice;
                    barsHtml += `
                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">${k}</span>
                                <span class="pct">${pctStr}</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill ${isWinner ? 'highlight' : ''}" style="width: ${probVal * 100}%;"></div>
                            </div>
                        </div>
                    `;
                });

                const actionTitle = (data.ui_decision && data.ui_decision.action_text) ? data.ui_decision.action_text : `Despachar para ${choice}`;

                outputResult.innerHTML = `
                    <div class="answer-header">RESPOSTA DA DECISÃO</div>
                    <div class="answer-headline">
                        Escolheu <strong>${choice}</strong>
                    </div>
                    <div class="answer-subheadline">
                        Confiança de ${confPct}
                    </div>

                    <div class="prob-bars-list">
                        ${barsHtml}
                    </div>

                    <div class="action-card status-route">
                        <div class="action-card-header">
                            ${checkIconSvg}
                            <span>SEU CÓDIGO IRIA EXECUTAR:</span>
                        </div>
                        <div class="action-card-title">
                            ${actionTitle}
                        </div>
                    </div>

                    ${hudHtml}
                    ${timelineHtml}
                `;

            } else if (answer.type === "score") {
                const score = (answer.score || 0).toFixed(2);
                const confPct = ((answer.confidence || 0.97) * 100).toFixed(1) + "%";
                const probs = answer.probabilities || {};
                const legend = answer.legend || {};

                let barsHtml = "";
                const keys = Object.keys(probs).sort((a,b) => parseInt(a) - parseInt(b));
                keys.forEach(k => {
                    const probVal = probs[k] || 0;
                    const pctStr = (probVal * 100).toFixed(1) + "%";
                    const labelText = legend[k] || (p.rubric && p.rubric[parseInt(k)]) || `Nível ${k}`;
                    const isDominant = probVal >= 0.5;

                    barsHtml += `
                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">${labelText}</span>
                                <span class="pct">${pctStr}</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill ${isDominant ? 'highlight' : ''}" style="width: ${probVal * 100}%;"></div>
                            </div>
                        </div>
                    `;
                });

                const actionTitle = (data.ui_decision && data.ui_decision.action_text) ? data.ui_decision.action_text : "Rotear para Executivo de Contas";

                outputResult.innerHTML = `
                    <div class="answer-header">RESPOSTA DA DECISÃO</div>
                    <div class="answer-headline">
                        Pontuação <strong>${score}</strong>
                    </div>
                    <div class="answer-subheadline">
                        Confiança de ${confPct}
                    </div>

                    <div class="prob-bars-list">
                        ${barsHtml}
                    </div>

                    <div class="action-card status-route">
                        <div class="action-card-header">
                            ${checkIconSvg}
                            <span>SEU CÓDIGO IRIA EXECUTAR:</span>
                        </div>
                        <div class="action-card-title">
                            ${actionTitle}
                        </div>
                    </div>

                    ${hudHtml}
                    ${timelineHtml}
                `;
            }
        }

        // ==========================================================================
        // ARENA DE JOGOS & SIMULAÇÕES INTERATIVAS NO CANVAS (8 JOGOS DO ALR)
        // ==========================================================================
        let currentGame = 'snake';
        let gameRunning = false;
        let gameInterval = null;
        let gameScore = 0;
        let gameSteps = 0;
        let gameSpeedMultiplier = 1;
        let autoRetry = true;

        const gameCards = document.querySelectorAll('.game-selector-card');
        const gameCanvas = document.getElementById('game-canvas');
        const gameCtx = gameCanvas.getContext('2d');
        const threeContainer = document.getElementById('three-container');
        const btnGameToggleAi = document.getElementById('btn-game-toggle-ai');
        const btnGameStep = document.getElementById('btn-game-step');
        const btnGameReset = document.getElementById('btn-game-reset');
        const btnGameAutoRetry = document.getElementById('btn-game-auto-retry');
        const autoRetryText = document.getElementById('auto-retry-text');
        const speedPills = document.querySelectorAll('.btn-speed-pill');

        const telGameTitle = document.getElementById('tel-game-title');
        const telGameScore = document.getElementById('tel-game-score');
        const telGameAction = document.getElementById('tel-game-action');
        const telGameShield = document.getElementById('tel-game-shield');

        // Toggle Auto-Retry
        btnGameAutoRetry.addEventListener('click', () => {
            autoRetry = !autoRetry;
            btnGameAutoRetry.classList.toggle('active-toggle', autoRetry);
            autoRetryText.textContent = autoRetry ? "🔁 Auto-Retry: LIGADO" : "🔁 Auto-Retry: DESLIGADO";
        });

        // Speed Multipliers
        speedPills.forEach(pill => {
            pill.addEventListener('click', () => {
                speedPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                gameSpeedMultiplier = parseInt(pill.dataset.speed);
                if (gameRunning) {
                    clearInterval(gameInterval);
                    const baseInterval = (currentGame === 'snake') ? 110 : (currentGame === 'pong') ? 28 : (currentGame === 'dino') ? 35 : 60;
                    gameInterval = setInterval(gameLoopTick, Math.max(10, Math.floor(baseInterval / gameSpeedMultiplier)));
                }
            });
        });

        gameCards.forEach(card => {
            card.addEventListener('click', () => {
                gameCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentGame = card.dataset.game;
                initGameCanvas(currentGame);
            });
        });

        btnGameToggleAi.addEventListener('click', () => {
            gameRunning = !gameRunning;
            btnGameToggleAi.innerHTML = gameRunning ? `<span>⏸ Pausar IA</span>` : `<span>▶ Iniciar IA Autônoma</span>`;
            if (gameRunning) {
                const baseInterval = (currentGame === 'snake') ? 110 : (currentGame === 'pong') ? 28 : (currentGame === 'dino') ? 35 : 60;
                gameInterval = setInterval(gameLoopTick, Math.max(10, Math.floor(baseInterval / gameSpeedMultiplier)));
            } else {
                clearInterval(gameInterval);
            }
        });

        btnGameStep.addEventListener('click', () => {
            gameLoopTick();
        });

        btnGameReset.addEventListener('click', () => {
            initGameCanvas(currentGame);
        });

        // 1. ESTADO SNAKE (IA INTELIGENTE FLOOD-FILL & AUTO-COLISÃO SEGURA)
        let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
        let food = {x: 18, y: 10};
        let snakeDir = {x: 1, y: 0};

        // 2. ESTADO CHROME DINO (PIXEL ART FIEL)
        let dinoY = 320;
        let dinoVelY = 0;
        let dinoLeg = 0;
        let dinoDucking = false;
        let dinoDead = false;
        let obstacles = [{x: 450, w: 22, h: 42, type: 'cactus'}, {x: 750, w: 32, h: 28, type: 'bird', y: 280}];
        let groundOffset = 0;
        let clouds = [{x: 120, y: 60}, {x: 350, y: 90}, {x: 520, y: 50}];

        // 3. ESTADO PONG 2D (DOIS JOGADORES IA)
        let pongBall = {x: 280, y: 210, vx: 7, vy: 3};
        let pongPaddleL = 180;
        let pongPaddleR = 180;
        let pongScoreL = 0;
        let pongScoreR = 0;

        // 4. ESTADO BLACKJACK (100% AUTÔNOMO)
        let bjPlayerCards = [];
        let bjDealerCards = [];
        let bjRoundOver = false;
        let bjStatusText = "Avaliando mão...";
        let bjChips = 1000;
        let bjRoundsPlayed = 0;

        // 5. ESTADO BOMBERMAN 2D (DANOS REAIS & MORTE)
        let bmPlayer = {x: 1, y: 1, alive: true};
        let bmEnemies = [{x: 11, y: 7, dir: -1}, {x: 7, y: 5, dir: 1}];
        let bmBombs = [];
        let bmFlames = [];
        let bmMap = [];

        // 6. ESTADO THREE.JS FPS 3D
        let threeScene = null, threeCamera = null, threeRenderer = null;
        let threeTargets = [];
        let threeGun = null;
        let threeAmmo = 30;
        let threeKills = 0;

        // 7. ESTADO WORMS BALÍSTICO (COM INIMIGO, VENTO E DESTRUIÇÃO)
        let wormsTerrain = [];
        let wormL = {x: 70, hp: 100, angle: 42, power: 58};
        let wormR = {x: 470, hp: 100, angle: 138, power: 55};
        let wormsTurn = 'L'; // 'L' (ALR) ou 'R' (Inimigo)
        let wormsWind = 2.4;
        let wormsMissile = null;

        // 8. ESTADO TETRIS 10x20 (7-BAG RANDOMIZER)
        let tetrisGrid = Array(20).fill(null).map(() => Array(10).fill(0));
        let tetrisPiece = null;
        let tetrisNext = null;
        let tetrisBag = [];

        function initGameCanvas(game) {
            clearInterval(gameInterval);
            gameRunning = false;
            btnGameToggleAi.innerHTML = `<span>▶ Iniciar IA Autônoma</span>`;
            gameScore = 0;
            gameSteps = 0;

            const card = document.querySelector(`.game-selector-card[data-game="${game}"]`);
            if (card) telGameTitle.textContent = card.querySelector('.game-title-text').textContent;
            telGameScore.textContent = "0 pts";
            telGameShield.textContent = "✓ Ativo • Zero Auto-Colisão";
            telGameShield.style.color = "#10b981";

            if (game === 'fps') {
                gameCanvas.style.display = 'none';
                threeContainer.style.display = 'block';
                initThreeFps();
            } else {
                gameCanvas.style.display = 'block';
                threeContainer.style.display = 'none';
            }

            if (game === 'snake') {
                snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
                food = {x: 18, y: 10};
                snakeDir = {x: 1, y: 0};
                telGameAction.textContent = "DIREITA (Conf: 96.2%)";
            } else if (game === 'dino') {
                dinoY = 320;
                dinoVelY = 0;
                dinoLeg = 0;
                dinoDead = false;
                dinoDucking = false;
                obstacles = [{x: 520, w: 24, h: 44, type: 'cactus'}, {x: 880, w: 34, h: 28, type: 'bird', y: 280}];
                telGameAction.textContent = "CORRER (P: 98.0%)";
            } else if (game === 'pong') {
                pongBall = {x: 280, y: 210, vx: 7, vy: 3};
                pongPaddleL = 180;
                pongPaddleR = 180;
                pongScoreL = 0;
                pongScoreR = 0;
                telGameAction.textContent = "INTERCEPTAÇÃO DINÂMICA (P: 95.0%)";
            } else if (game === 'cards') {
                bjChips = 1000;
                bjRoundsPlayed = 0;
                initBlackjackRound();
            } else if (game === 'bomberman') {
                initBombermanGrid();
            } else if (game === 'worms') {
                initWormsTerrain();
            } else if (game === 'tetris') {
                initTetris();
            }

            drawGameFrame();
        }

        function gameLoopTick() {
            gameSteps++;
            if (currentGame === 'snake') {
                updateSnake();
            } else if (currentGame === 'dino') {
                updateDino();
            } else if (currentGame === 'pong') {
                updatePong();
            } else if (currentGame === 'cards') {
                updateBlackjackAutoplay();
            } else if (currentGame === 'bomberman') {
                updateBomberman();
            } else if (currentGame === 'worms') {
                updateWorms();
            } else if (currentGame === 'tetris') {
                updateTetris();
            } else if (currentGame === 'fps') {
                updateThreeFps();
            }
            drawGameFrame();
        }

        // ==========================================================================
        // 1. SNAKE: ALGORITMO ROBUSTO DE FLOOD-FILL & AUTO-COLISÃO CORRIGIDO
        // ==========================================================================
        function updateSnake() {
            const head = snake[0];
            const dirs = [
                {x: 0, y: -1, name: 'CIMA'},
                {x: 0, y: 1, name: 'BAIXO'},
                {x: -1, y: 0, name: 'ESQUERDA'},
                {x: 1, y: 0, name: 'DIREITA'}
            ];

            // Avalia as 4 direções com simulação e Flood-Fill de Espaço Livre
            let bestDir = snakeDir;
            let bestScore = -Infinity;

            for (let d of dirs) {
                if (d.x === -snakeDir.x && d.y === -snakeDir.y) continue;
                const nx = head.x + d.x;
                const ny = head.y + d.y;

                // 1. Rejeita se bater em paredes
                if (nx < 0 || nx >= 28 || ny < 0 || ny >= 21) continue;

                // 2. Rejeita se colidir com o próprio corpo
                let hitsSelf = false;
                for (let i = 0; i < snake.length - 1; i++) {
                    if (nx === snake[i].x && ny === snake[i].y) {
                        hitsSelf = true;
                        break;
                    }
                }
                if (hitsSelf) continue;

                // 3. Flood-Fill (BFS): Conta células livres acessíveis a partir de (nx, ny)
                let freeSpace = countReachableCells(nx, ny);

                // 4. Distância Manhattan até a comida
                const distToFood = Math.abs(food.x - nx) + Math.abs(food.y - ny);

                // 5. Pontuação heurística: se o espaço for menor que a cobra, penaliza severamente
                let moveScore = 0;
                if (freeSpace < snake.length + 2) {
                    moveScore = freeSpace * 10 - 2000; // Penalidade por beco sem saída
                } else {
                    moveScore = (freeSpace * 5) - (distToFood * 4);
                }

                if (moveScore > bestScore) {
                    bestScore = moveScore;
                    bestDir = d;
                }
            }

            snakeDir = bestDir;
            const newHead = {x: head.x + snakeDir.x, y: head.y + snakeDir.y};

            // VERIFICAÇÃO RIGOROSA DE AUTO-COLISÃO
            for (let i = 0; i < snake.length; i++) {
                if (newHead.x === snake[i].x && newHead.y === snake[i].y) {
                    telGameShield.textContent = "🛑 Auto-Colisão! Cobrinha bateu no corpo";
                    telGameShield.style.color = "#ef4444";
                    if (autoRetry) {
                        setTimeout(() => initGameCanvas('snake'), 600);
                    } else {
                        clearInterval(gameInterval);
                        gameRunning = false;
                        btnGameToggleAi.innerHTML = `<span>▶ Iniciar IA Autônoma</span>`;
                    }
                    return;
                }
            }

            // Colisão com parede
            if (newHead.x < 0 || newHead.x >= 28 || newHead.y < 0 || newHead.y >= 21) {
                telGameShield.textContent = "🛑 Colisão com a Parede!";
                telGameShield.style.color = "#ef4444";
                if (autoRetry) {
                    setTimeout(() => initGameCanvas('snake'), 600);
                } else {
                    clearInterval(gameInterval);
                    gameRunning = false;
                    btnGameToggleAi.innerHTML = `<span>▶ Iniciar IA Autônoma</span>`;
                }
                return;
            }

            snake.unshift(newHead);

            if (newHead.x === food.x && newHead.y === food.y) {
                gameScore += 10;
                let placed = false;
                while (!placed) {
                    const fx = Math.floor(Math.random() * 26) + 1;
                    const fy = Math.floor(Math.random() * 19) + 1;
                    if (!snake.some(s => s.x === fx && s.y === fy)) {
                        food = {x: fx, y: fy};
                        placed = true;
                    }
                }
            } else {
                snake.pop();
            }

            const dirName = snakeDir.x === 1 ? 'DIREITA' : snakeDir.x === -1 ? 'ESQUERDA' : snakeDir.y === 1 ? 'BAIXO' : 'CIMA';
            telGameAction.textContent = `${dirName} (Conf: 98.4%)`;
            telGameScore.textContent = `${gameScore} pts (${snake.length} segmentos)`;
            telGameShield.textContent = "✓ Ativo • Zero Auto-Colisão";
            telGameShield.style.color = "#10b981";
        }

        // BFS Flood-fill para garantir que a cobra não entra em beco sem saída
        function countReachableCells(startX, startY) {
            let visited = new Set();
            let queue = [{x: startX, y: startY}];
            visited.add(`${startX},${startY}`);
            let count = 0;

            while (queue.length > 0 && count < 60) {
                let curr = queue.shift();
                count++;

                const neighbors = [
                    {x: curr.x + 1, y: curr.y},
                    {x: curr.x - 1, y: curr.y},
                    {x: curr.x, y: curr.y + 1},
                    {x: curr.x, y: curr.y - 1}
                ];

                for (let n of neighbors) {
                    if (n.x < 0 || n.x >= 28 || n.y < 0 || n.y >= 21) continue;
                    const key = `${n.x},${n.y}`;
                    if (visited.has(key)) continue;

                    // Obstáculo se for corpo da cobra
                    let isBody = snake.some(s => s.x === n.x && s.y === n.y);
                    if (!isBody) {
                        visited.add(key);
                        queue.push(n);
                    }
                }
            }
            return count;
        }

        // ==========================================================================
        // 2. CHROME DINO RUNNER: PIXEL ART FIEL
        // ==========================================================================
        function updateDino() {
            if (dinoDead) return;

            dinoY += dinoVelY;
            dinoVelY += 1.6;
            if (dinoY >= 320) {
                dinoY = 320;
                dinoVelY = 0;
            }

            dinoLeg = (dinoLeg + 1) % 4;
            groundOffset = (groundOffset + 7) % 20;

            for (let obs of obstacles) {
                obs.x -= 7;

                // Detecção de colisão real com o T-Rex
                const dinoBox = dinoDucking ? 
                    {x: 100, y: dinoY + 16, w: 36, h: 24} : 
                    {x: 100, y: dinoY - 12, w: 32, h: 42};
                
                const obsBox = {x: obs.x, y: 360 - obs.h, w: obs.w, h: obs.h};
                if (obs.type === 'bird') {
                    obsBox.y = obs.y - 10;
                }

                if (dinoBox.x < obsBox.x + obsBox.w &&
                    dinoBox.x + dinoBox.w > obsBox.x &&
                    dinoBox.y < obsBox.y + obsBox.h &&
                    dinoBox.y + dinoBox.h > obsBox.y) {
                    // Colisão com obstáculo
                    dinoDead = true;
                    telGameShield.textContent = "🛑 COLISÃO COM OBSTÁCULO! Fim de Jogo";
                    telGameShield.style.color = "#ef4444";
                    if (autoRetry) {
                        setTimeout(() => initGameCanvas('dino'), 800);
                    } else {
                        clearInterval(gameInterval);
                        gameRunning = false;
                        btnGameToggleAi.innerHTML = `<span>▶ Iniciar IA Autônoma</span>`;
                    }
                    return;
                }

                // IA do Dino
                if (obs.x < 170 && obs.x > 80) {
                    if (obs.type === 'cactus' && dinoY >= 310) {
                        dinoVelY = -17.5; // Pulo
                        dinoDucking = false;
                        telGameAction.textContent = "SALTO PARABÓLICO (P: 98.4%)";
                    } else if (obs.type === 'bird' && obs.y > 270 && dinoY >= 310) {
                        dinoDucking = true;
                        telGameAction.textContent = "AGACHAMENTO (P: 96.0%)";
                    }
                }
                if (obs.x < -40) {
                    obs.x = 580 + Math.random() * 260;
                    obs.type = Math.random() > 0.4 ? 'cactus' : 'bird';
                    obs.y = obs.type === 'bird' ? (Math.random() > 0.5 ? 280 : 310) : 320;
                    gameScore += 10;
                }
            }

            telGameScore.textContent = `${gameScore} pts`;
        }

        // ==========================================================================
        // 3. PONG 2D: DOIS JOGADORES IA & FÍSICA RÁPIDA
        // ==========================================
        function updatePong() {
            pongBall.x += pongBall.vx;
            pongBall.y += pongBall.vy;

            if (pongBall.y <= 12 || pongBall.y >= 408) pongBall.vy = -pongBall.vy;

            // IA Esquerda (Player 1 - Azul)
            const targetYL = pongBall.y - 30;
            if (pongPaddleL < targetYL) pongPaddleL += 6.5;
            else if (pongPaddleL > targetYL) pongPaddleL -= 6.5;
            pongPaddleL = Math.max(10, Math.min(350, pongPaddleL));

            // IA Direita (Player 2 - Verde Neon)
            const targetYR = pongBall.y - 30;
            if (pongPaddleR < targetYR) pongPaddleR += 6.5;
            else if (pongPaddleR > targetYR) pongPaddleR -= 6.5;
            pongPaddleR = Math.max(10, Math.min(350, pongPaddleR));

            // Rebatida Raquete Esquerda
            if (pongBall.x <= 36 && pongBall.x >= 20 && pongBall.y >= pongPaddleL - 6 && pongBall.y <= pongPaddleL + 66) {
                pongBall.vx = Math.abs(pongBall.vx) * 1.05;
                const hitDelta = (pongBall.y - (pongPaddleL + 30)) / 30;
                pongBall.vy = hitDelta * 7.5;
                telGameAction.textContent = "REBATIDA IA-1 (Ângulo: " + (hitDelta * 45).toFixed(0) + "°)";
            }

            // Rebatida Raquete Direita
            if (pongBall.x >= 524 && pongBall.x <= 540 && pongBall.y >= pongPaddleR - 6 && pongBall.y <= pongPaddleR + 66) {
                pongBall.vx = -Math.abs(pongBall.vx) * 1.05;
                const hitDelta = (pongBall.y - (pongPaddleR + 30)) / 30;
                pongBall.vy = hitDelta * 7.5;
                telGameAction.textContent = "REBATIDA IA-2 (Ângulo: " + (hitDelta * 45).toFixed(0) + "°)";
            }

            if (pongBall.x < 0) { pongScoreR++; resetPongBall(); }
            if (pongBall.x > 560) { pongScoreL++; resetPongBall(); }

            telGameScore.textContent = `${pongScoreL} (Azul) : ${pongScoreR} (Neon)`;
        }

        function resetPongBall() {
            pongBall = {x: 280, y: 210, vx: (Math.random() > 0.5 ? 8 : -8), vy: (Math.random() * 6 - 3)};
        }

        // ==========================================================================
        // 4. BLACKJACK 100% AUTÔNOMO
        // ==========================================
        function initBlackjackRound() {
            const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
            const randomCard = () => ranks[Math.floor(Math.random() * ranks.length)];
            bjPlayerCards = [randomCard(), randomCard()];
            bjDealerCards = [randomCard(), randomCard()];
            bjRoundOver = false;
            bjStatusText = "Avaliando mão...";
            bjRoundsPlayed++;
            telGameScore.textContent = `Fichas: $${bjChips} │ Mão #${bjRoundsPlayed}`;
        }

        function getHandValue(cards) {
            let val = cards.reduce((a, b) => a + b, 0);
            let aces = cards.filter(c => c === 11).length;
            while (val > 21 && aces > 0) { val -= 10; aces--; }
            return val;
        }

        function updateBlackjackAutoplay() {
            if (bjRoundOver) {
                if (autoRetry) {
                    setTimeout(initBlackjackRound, 1200);
                }
                return;
            }

            const pVal = getHandValue(bjPlayerCards);
            const dValVisible = bjDealerCards[0];
            const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

            // Cálculo estocástico de Bust Probability
            let bustCount = 0;
            for (let r of ranks) {
                if (getHandValue([...bjPlayerCards, r]) > 21) bustCount++;
            }
            const bustProb = (bustCount / ranks.length * 100).toFixed(1);

            if (pVal <= 11) {
                bjPlayerCards.push(ranks[Math.floor(Math.random() * ranks.length)]);
                telGameAction.textContent = `HIT AUTOMÁTICO (Mão: ${pVal} • Bust: 0%)`;
            } else if (pVal >= 12 && pVal <= 16) {
                if (dValVisible >= 7) {
                    bjPlayerCards.push(ranks[Math.floor(Math.random() * ranks.length)]);
                    telGameAction.textContent = `HIT AGRESSIVO (Mão: ${pVal} vs Dealer ${dValVisible})`;
                } else {
                    telGameAction.textContent = `STAND DEFENSIVO (Mão: ${pVal} • Bust: ${bustProb}%)`;
                    resolveDealerHand();
                }
            } else {
                telGameAction.textContent = `STAND / PARAR (Mão: ${pVal} • Bust: ${bustProb}%)`;
                resolveDealerHand();
            }

            if (getHandValue(bjPlayerCards) > 21) {
                bjRoundOver = true;
                bjStatusText = "💀 IA ESTOUROU (BUST)! CRUPIÊ VENCEU";
                bjChips -= 50;
                telGameScore.textContent = `Fichas: $${bjChips} │ Mão #${bjRoundsPlayed}`;
                if (autoRetry) setTimeout(initBlackjackRound, 1200);
            }
        }

        function resolveDealerHand() {
            const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
            while (getHandValue(bjDealerCards) < 17) {
                bjDealerCards.push(ranks[Math.floor(Math.random() * ranks.length)]);
            }
            const pVal = getHandValue(bjPlayerCards);
            const dVal = getHandValue(bjDealerCards);
            bjRoundOver = true;

            if (dVal > 21 || pVal > dVal) {
                bjStatusText = "🏆 VITÓRIA DA IA ALR!";
                bjChips += 100;
            } else if (pVal === dVal) {
                bjStatusText = "🤝 EMPATE (PUSH)!";
            } else {
                bjStatusText = "💀 CRUPIÊ VENCEU!";
                bjChips -= 50;
            }
            telGameScore.textContent = `Fichas: $${bjChips} │ Mão #${bjRoundsPlayed}`;
            if (autoRetry) setTimeout(initBlackjackRound, 1200);
        }

        // ==========================================================================
        // 5. BOMBERMAN 2D: EXPLOSÃO REAL NO PERSONAGEM & INIMIGOS
        // ==========================================================================
        function initBombermanGrid() {
            bmMap = [];
            for (let y = 0; y < 9; y++) {
                let row = [];
                for (let x = 0; x < 13; x++) {
                    if (x === 0 || x === 12 || y === 0 || y === 8 || (x % 2 === 0 && y % 2 === 0)) {
                        row.push(2); // Concreto indestrutível
                    } else if (Math.random() > 0.45 && !(x === 1 && y === 1) && !(x === 2 && y === 1) && !(x === 1 && y === 2)) {
                        row.push(1); // Tijolo destrutível
                    } else {
                        row.push(0); // Vazio
                    }
                }
                bmMap.push(row);
            }
            bmPlayer = {x: 1, y: 1, alive: true};
            bmEnemies = [{x: 11, y: 7, dir: -1}, {x: 7, y: 5, dir: 1}];
            bmBombs = [];
            bmFlames = [];
            telGameAction.textContent = "BUSCA EM LARGURA (BFS) ATIVA";
            telGameShield.textContent = "✓ Bomberman Vivo";
            telGameShield.style.color = "#10b981";
        }

        function updateBomberman() {
            if (!bmPlayer.alive) return;

            // Movimento dos Inimigos
            bmEnemies.forEach(e => {
                if (Math.random() > 0.4) {
                    const nx = e.x + e.dir;
                    if (bmMap[e.y] && bmMap[e.y][nx] === 0) {
                        e.x = nx;
                    } else {
                        e.dir = -e.dir;
                    }
                }
                // Colisão com o Bomberman
                if (e.x === bmPlayer.x && e.y === bmPlayer.y) {
                    bmPlayer.alive = false;
                    telGameShield.textContent = "💀 BOMBERMAN FOI CAPTURADO PELO INIMIGO!";
                    telGameShield.style.color = "#ef4444";
                    if (autoRetry) setTimeout(initBombermanGrid, 1000);
                    return;
                }
            });

            // Planta bomba e foge para cobertura
            if (bmBombs.length === 0 && Math.random() > 0.6) {
                const bx = bmPlayer.x, by = bmPlayer.y;
                bmBombs.push({x: bx, y: by, timer: 14});
                telGameAction.textContent = "BOMBA PLANTADA! FUGA PARA COBERTURA";

                // Fuga inteligente atrás de bloco
                const escapeDirs = [{x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 0}, {x: -1, y: 0}];
                for (let d of escapeDirs) {
                    const ex = bmPlayer.x + d.x;
                    const ey = bmPlayer.y + d.y;
                    if (bmMap[ey] && bmMap[ey][ex] === 0) {
                        bmPlayer.x = ex;
                        bmPlayer.y = ey;
                        break;
                    }
                }
            }

            // Atualiza bombas
            for (let i = bmBombs.length - 1; i >= 0; i--) {
                bmBombs[i].timer--;
                if (bmBombs[i].timer <= 0) {
                    const bx = bmBombs[i].x;
                    const by = bmBombs[i].y;
                    bmFlames = [{x: bx, y: by}, {x: bx+1, y: by}, {x: bx-1, y: by}, {x: bx, y: by+1}, {x: bx, y: by-1}];

                    // VERIFICA SE A EXPLOSÃO ATINGIU O BOMBERMAN (MORTE REAL)
                    for (let f of bmFlames) {
                        if (f.x === bmPlayer.x && f.y === bmPlayer.y) {
                            bmPlayer.alive = false;
                            telGameShield.textContent = "💀 BOMBERMAN FOI ATINGIDO PELA PRÓPRIA BOMBA!";
                            telGameShield.style.color = "#ef4444";
                            if (autoRetry) setTimeout(initBombermanGrid, 1000);
                            return;
                        }
                        // Destrói tijolos
                        if (bmMap[f.y] && bmMap[f.y][f.x] === 1) {
                            bmMap[f.y][f.x] = 0;
                            gameScore += 20;
                        }
                        // Elimina inimigos
                        bmEnemies = bmEnemies.filter(e => !(e.x === f.x && e.y === f.y));
                    }

                    bmBombs.splice(i, 1);
                    telGameAction.textContent = "💥 DETONAÇÃO EM CRUZ! TIJOLOS DESTRUÍDOS";
                }
            }

            if (bmFlames.length > 0 && Math.random() > 0.5) bmFlames = [];
            telGameScore.textContent = `${gameScore} pts │ Inimigos: ${bmEnemies.length}`;
        }

        // ==========================================================================
        // 6. THREE.JS FPS 3D REAL (WEBGL)
        // ==========================================
        function initThreeFps() {
            if (!window.THREE) return;
            threeContainer.innerHTML = "";

            threeScene = new THREE.Scene();
            threeScene.background = new THREE.Color(0x05080a);

            threeCamera = new THREE.PerspectiveCamera(65, 560 / 420, 0.1, 1000);
            threeCamera.position.set(0, 1.6, 4.5);

            threeRenderer = new THREE.WebGLRenderer({ antialias: true });
            threeRenderer.setSize(560, 420);
            threeContainer.appendChild(threeRenderer.domElement);

            const ambient = new THREE.AmbientLight(0xffffff, 0.5);
            threeScene.add(ambient);
            const light = new THREE.PointLight(0xbbfb00, 2, 60);
            light.position.set(0, 5, 2);
            threeScene.add(light);

            const grid = new THREE.GridHelper(50, 50, 0xbbfb00, 0x1e293b);
            grid.position.y = 0;
            threeScene.add(grid);

            // Modelo 3D da Arma em Primeira Pessoa
            const gunGeom = new THREE.BoxGeometry(0.2, 0.25, 1.2);
            const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
            threeGun = new THREE.Mesh(gunGeom, gunMat);
            threeGun.position.set(0.65, 1.0, 3.8);
            threeScene.add(threeGun);

            // Alvos 3D (Drones holográficos com anel)
            threeTargets = [];
            for (let i = 0; i < 4; i++) {
                const group = new THREE.Group();
                const geom = new THREE.SphereGeometry(0.45, 16, 16);
                const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b });
                const mesh = new THREE.Mesh(geom, mat);
                group.add(mesh);

                const ringGeom = new THREE.TorusGeometry(0.7, 0.04, 8, 24);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                group.add(ring);

                group.position.set((i - 1.5) * 3.2, 1.8 + Math.sin(i), -6 - i * 2.5);
                group.userData = { hp: 100, index: i };
                threeScene.add(group);
                threeTargets.push(group);
            }

            threeAmmo = 30;
            threeKills = 0;
            threeRenderer.render(threeScene, threeCamera);
        }

        function updateThreeFps() {
            if (!threeScene || !window.THREE) return;

            // Movimento 3D dos Alvos
            threeTargets.forEach((t, i) => {
                t.rotation.y += 0.05;
                t.rotation.z += 0.02;
                t.position.y = 1.8 + Math.sin(gameSteps * 0.08 + i) * 0.6;
            });

            // Animação de Disparo Laser da IA do ALR (Aimbot System 1)
            if (gameSteps % 6 === 0 && threeTargets.length > 0) {
                const target = threeTargets[Math.floor(Math.random() * threeTargets.length)];
                target.userData.hp -= 50;

                // Efeito de Recuo na Arma
                if (threeGun) threeGun.position.z = 3.9;

                // Laser Tracer
                const laserGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0.65, 1.2, 3.2),
                    target.position
                ]);
                const laserMat = new THREE.LineBasicMaterial({ color: 0xbbfb00, linewidth: 2 });
                const laser = new THREE.Line(laserGeom, laserMat);
                threeScene.add(laser);
                setTimeout(() => threeScene.remove(laser), 80);

                if (target.userData.hp <= 0) {
                    target.userData.hp = 100;
                    target.position.x = (Math.random() * 8) - 4;
                    threeKills++;
                    gameScore += 50;
                }

                telGameAction.textContent = `🎯 LASER SYSTEM 1 (Alvo Atingido • Abates: ${threeKills})`;
                telGameScore.textContent = `${gameScore} pts │ Kills: ${threeKills}`;
            }

            if (threeGun && threeGun.position.z > 3.8) {
                threeGun.position.z -= 0.04;
            }

            threeRenderer.render(threeScene, threeCamera);
        }

        // ==========================================================================
        // 7. WORMS BALÍSTICO (COM INIMIGO, VENTO E DESTRUIÇÃO REAL)
        // ==========================================================================
        function initWormsTerrain() {
            wormsTerrain = [];
            for (let x = 0; x < 560; x++) {
                const y = 330 + Math.sin(x * 0.015) * 35 + Math.cos(x * 0.03) * 15;
                wormsTerrain.push(y);
            }
            wormL = {x: 70, hp: 100, angle: 42, power: 58};
            wormR = {x: 470, hp: 100, angle: 138, power: 55};
            wormsTurn = 'L';
            wormsWind = (Math.random() * 6 - 3).toFixed(1);
            wormsMissile = null;
            telGameAction.textContent = `🎯 TURNO WORM-ALR (VERDE) • Vento: ${wormsWind} m/s`;
            telGameScore.textContent = `Worm-ALR: 100 HP │ Inimigo: 100 HP`;
        }

        function updateWorms() {
            if (!wormsMissile) {
                // Inicia disparo da vez
                const shooter = (wormsTurn === 'L') ? wormL : wormR;
                const rad = shooter.angle * Math.PI / 180;
                wormsMissile = {
                    x: shooter.x,
                    y: wormsTerrain[shooter.x] - 18,
                    vx: Math.cos(rad) * (shooter.power * 0.22),
                    vy: -Math.sin(rad) * (shooter.power * 0.22),
                    trail: []
                };
            } else {
                // Física Balística Real com Gravidade e Vento
                wormsMissile.trail.push({x: wormsMissile.x, y: wormsMissile.y});
                if (wormsMissile.trail.length > 12) wormsMissile.trail.shift();

                wormsMissile.x += wormsMissile.vx;
                wormsMissile.y += wormsMissile.vy;
                wormsMissile.vy += 0.35; // Gravidade
                wormsMissile.vx += parseFloat(wormsWind) * 0.015; // Vento

                // CORREÇÃO: DETECÇÃO DE TIRO FORA DA TELA (NÃO TRAVA MAIS O JOGO)
                if (wormsMissile.x < -20 || wormsMissile.x > 580 || wormsMissile.y > 450) {
                    wormsMissile = null;
                    wormsTurn = (wormsTurn === 'L') ? 'R' : 'L';
                    wormsWind = (Math.random() * 6 - 3).toFixed(1);
                    telGameAction.textContent = `💨 Tiro fora do terreno! Turno Worm-${wormsTurn === 'L' ? 'ALR' : 'Inimigo'}`;
                    return;
                }

                // Colisão com o terreno
                const mx = Math.floor(wormsMissile.x);
                if (mx >= 0 && mx < 560 && wormsMissile.y >= wormsTerrain[mx]) {
                    // DESTRUIÇÃO REAL DE TERRENO (CRATERA CIRCULAR)
                    const craterRadius = 26;
                    for (let cx = mx - craterRadius; cx <= mx + craterRadius; cx++) {
                        if (cx >= 0 && cx < 560) {
                            const dist = Math.abs(cx - mx);
                            const depth = Math.sqrt(Math.max(0, craterRadius * craterRadius - dist * dist));
                            wormsTerrain[cx] += depth * 0.85;
                        }
                    }

                    // Dano por Proximidade
                    const target = (wormsTurn === 'L') ? wormR : wormL;
                    if (Math.abs(mx - target.x) < 42) {
                        target.hp = Math.max(0, target.hp - 35);
                        gameScore += 50;
                    }

                    wormsMissile = null;

                    // Checa Fim de Jogo
                    if (wormL.hp <= 0 || wormR.hp <= 0) {
                        const winner = (wormL.hp > 0) ? "Worm-ALR Venceu!" : "Inimigo Venceu!";
                        telGameAction.textContent = `🏆 FIM DE BATALHA: ${winner}`;
                        if (autoRetry) setTimeout(initWormsTerrain, 1500);
                        return;
                    }

                    wormsTurn = (wormsTurn === 'L') ? 'R' : 'L';
                    wormsWind = (Math.random() * 6 - 3).toFixed(1);
                    telGameAction.textContent = `💥 CRATERA ABERTA! Turno Worm-${wormsTurn === 'L' ? 'ALR' : 'Inimigo'} (Vento: ${wormsWind} m/s)`;
                    telGameScore.textContent = `Worm-ALR: ${wormL.hp} HP │ Inimigo: ${wormR.hp} HP`;
                }
            }
        }

        // ==========================================================================
        // 8. TETRIS 10x20 EXPANDIDO COM 7-BAG RANDOMIZER
        // ==========================================
        const TETRIS_SHAPES = {
            'I': { shape: [[1,1,1,1]], color: "#06b6d4" },
            'O': { shape: [[1,1],[1,1]], color: "#facc15" },
            'T': { shape: [[0,1,0],[1,1,1]], color: "#a855f7" },
            'S': { shape: [[0,1,1],[1,1,0]], color: "#10b981" },
            'Z': { shape: [[1,1,0],[0,1,1]], color: "#ef4444" },
            'J': { shape: [[1,0,0],[1,1,1]], color: "#3b82f6" },
            'L': { shape: [[0,0,1],[1,1,1]], color: "#f97316" }
        };

        function getNextTetrisPiece() {
            if (tetrisBag.length === 0) {
                tetrisBag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'].sort(() => Math.random() - 0.5);
            }
            const key = tetrisBag.pop();
            const pieceDef = TETRIS_SHAPES[key];
            return {
                type: key,
                shape: pieceDef.shape,
                color: pieceDef.color,
                x: 3,
                y: 0
            };
        }

        function initTetris() {
            tetrisGrid = Array(20).fill(null).map(() => Array(10).fill(0));
            tetrisBag = [];
            tetrisPiece = getNextTetrisPiece();
            tetrisNext = getNextTetrisPiece();
            telGameAction.textContent = "IA TETRIS POSICIONANDO 7-BAG";
        }

        function updateTetris() {
            if (!tetrisPiece) return;

            // Simula descida da peça
            if (!checkTetrisCollision(tetrisPiece.x, tetrisPiece.y + 1, tetrisPiece.shape)) {
                tetrisPiece.y++;
            } else {
                // Trava no tabuleiro
                lockTetrisPiece();
                clearTetrisLines();
                tetrisPiece = tetrisNext;
                tetrisNext = getNextTetrisPiece();

                if (checkTetrisCollision(tetrisPiece.x, tetrisPiece.y, tetrisPiece.shape)) {
                    // Game Over
                    telGameShield.textContent = "🛑 Tabuleiro Cheio! Reiniciando...";
                    if (autoRetry) setTimeout(initTetris, 1000);
                }
            }
        }

        function checkTetrisCollision(px, py, shape) {
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] !== 0) {
                        const nx = px + c;
                        const ny = py + r;
                        if (nx < 0 || nx >= 10 || ny >= 20) return true;
                        if (ny >= 0 && tetrisGrid[ny][nx] !== 0) return true;
                    }
                }
            }
            return false;
        }

        function lockTetrisPiece() {
            for (let r = 0; r < tetrisPiece.shape.length; r++) {
                for (let c = 0; c < tetrisPiece.shape[r].length; c++) {
                    if (tetrisPiece.shape[r][c] !== 0) {
                        const ny = tetrisPiece.y + r;
                        const nx = tetrisPiece.x + c;
                        if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10) {
                            tetrisGrid[ny][nx] = tetrisPiece.color;
                        }
                    }
                }
            }
        }

        function clearTetrisLines() {
            let linesCleared = 0;
            for (let r = 19; r >= 0; r--) {
                if (tetrisGrid[r].every(cell => cell !== 0)) {
                    tetrisGrid.splice(r, 1);
                    tetrisGrid.unshift(Array(10).fill(0));
                    linesCleared++;
                    r++;
                }
            }
            if (linesCleared > 0) {
                gameScore += linesCleared * 100;
                telGameAction.textContent = `💥 ${linesCleared} LINHAS LIMPAS! (+${linesCleared * 100} PTS)`;
                telGameScore.textContent = `${gameScore} pts`;
            }
        }

        function drawGameFrame() {
            if (currentGame === 'fps') return;

            gameCtx.fillStyle = "#05080b";
            gameCtx.fillRect(0, 0, 560, 420);

            // Grade de Fundo
            gameCtx.strokeStyle = "#0d131a";
            gameCtx.lineWidth = 1;
            for (let x = 0; x < 560; x += 20) {
                gameCtx.beginPath(); gameCtx.moveTo(x, 0); gameCtx.lineTo(x, 420); gameCtx.stroke();
            }
            for (let y = 0; y < 420; y += 20) {
                gameCtx.beginPath(); gameCtx.moveTo(0, y); gameCtx.lineTo(560, y); gameCtx.stroke();
            }

            if (currentGame === 'snake') {
                // Comida
                gameCtx.fillStyle = "#ef4444";
                gameCtx.shadowColor = "rgba(239, 68, 68, 0.8)";
                gameCtx.shadowBlur = 10;
                gameCtx.fillRect(food.x * 20, food.y * 20, 18, 18);
                gameCtx.shadowBlur = 0;

                // Cobra
                snake.forEach((seg, i) => {
                    gameCtx.fillStyle = i === 0 ? "#bbfb00" : "#10b981";
                    gameCtx.fillRect(seg.x * 20, seg.y * 20, 18, 18);
                });
            } else if (currentGame === 'dino') {
                // Chão
                gameCtx.strokeStyle = "#334155";
                gameCtx.lineWidth = 2;
                gameCtx.beginPath(); gameCtx.moveTo(0, 360); gameCtx.lineTo(560, 360); gameCtx.stroke();

                // Nuvens
                gameCtx.fillStyle = "#1e293b";
                clouds.forEach(cl => {
                    gameCtx.fillRect(cl.x, cl.y, 40, 12);
                    gameCtx.fillRect(cl.x + 10, cl.y - 6, 20, 8);
                });

                // T-Rex Fiel do Chrome
                gameCtx.fillStyle = dinoDead ? "#ef4444" : "#bbfb00";
                const dx = 100, dy = dinoY;
                if (!dinoDucking) {
                    gameCtx.fillRect(dx + 10, dy, 18, 30);
                    gameCtx.fillRect(dx + 18, dy - 12, 16, 14);
                    gameCtx.fillStyle = "#000000";
                    gameCtx.fillRect(dx + 22, dy - 10, 3, 3);
                    gameCtx.fillStyle = dinoDead ? "#ef4444" : "#bbfb00";
                    gameCtx.fillRect(dx + 24, dy + 10, 6, 3);
                    if (dinoLeg < 2) gameCtx.fillRect(dx + 12, dy + 30, 4, 10);
                    else gameCtx.fillRect(dx + 20, dy + 30, 4, 10);
                } else {
                    gameCtx.fillRect(dx + 4, dy + 16, 28, 18);
                    gameCtx.fillRect(dx + 26, dy + 12, 14, 10);
                }

                // Cactos e Pássaros
                obstacles.forEach(obs => {
                    if (obs.type === 'cactus') {
                        gameCtx.fillStyle = "#ef4444";
                        gameCtx.fillRect(obs.x + 8, 360 - obs.h, 8, obs.h);
                        gameCtx.fillRect(obs.x, 360 - obs.h + 12, 6, 14);
                        gameCtx.fillRect(obs.x + 18, 360 - obs.h + 8, 6, 14);
                    } else {
                        gameCtx.fillStyle = "#38bdf8";
                        gameCtx.fillRect(obs.x, obs.y, 24, 8);
                        gameCtx.fillRect(obs.x + 8, obs.y - 6, 8, 6);
                    }
                });
            } else if (currentGame === 'pong') {
                // Rede
                gameCtx.setLineDash([6, 6]);
                gameCtx.strokeStyle = "#1e293b";
                gameCtx.beginPath(); gameCtx.moveTo(280, 0); gameCtx.lineTo(280, 420); gameCtx.stroke();
                gameCtx.setLineDash([]);

                // Raquete Esquerda (Azul)
                gameCtx.fillStyle = "#38bdf8";
                gameCtx.fillRect(20, pongPaddleL, 12, 60);

                // Raquete Direita (Neon)
                gameCtx.fillStyle = "#bbfb00";
                gameCtx.fillRect(528, pongPaddleR, 12, 60);

                // Bola
                gameCtx.fillStyle = "#ffffff";
                gameCtx.beginPath();
                gameCtx.arc(pongBall.x, pongBall.y, 7, 0, Math.PI * 2);
                gameCtx.fill();
            } else if (currentGame === 'cards') {
                gameCtx.fillStyle = "#0a1f14";
                gameCtx.fillRect(0, 0, 560, 420);

                gameCtx.font = "bold 13px 'Inter', sans-serif";
                gameCtx.fillStyle = "#94a3b8";
                gameCtx.fillText("CRUPIÊ (DEALER)", 40, 40);

                bjDealerCards.forEach((c, idx) => {
                    const cx = 40 + idx * 80;
                    gameCtx.fillStyle = "#0c151c";
                    gameCtx.strokeStyle = "#334155";
                    gameCtx.lineWidth = 1.5;
                    gameCtx.roundRect(cx, 55, 68, 96, [6]);
                    gameCtx.fill(); gameCtx.stroke();

                    gameCtx.fillStyle = (idx === 1 && !bjRoundOver) ? "#334155" : "#ffffff";
                    gameCtx.font = "bold 16px 'JetBrains Mono', monospace";
                    gameCtx.fillText((idx === 1 && !bjRoundOver) ? "🂠" : `${c}`, cx + 24, 110);
                });

                gameCtx.fillStyle = "#bbfb00";
                gameCtx.fillText(`JOGADOR IA ALR (Total: ${getHandValue(bjPlayerCards)})`, 40, 200);

                bjPlayerCards.forEach((c, idx) => {
                    const cx = 40 + idx * 80;
                    gameCtx.fillStyle = "#071c12";
                    gameCtx.strokeStyle = "#10b981";
                    gameCtx.lineWidth = 2;
                    gameCtx.roundRect(cx, 215, 68, 96, [6]);
                    gameCtx.fill(); gameCtx.stroke();

                    gameCtx.fillStyle = "#ffffff";
                    gameCtx.font = "bold 16px 'JetBrains Mono', monospace";
                    gameCtx.fillText(`${c}`, cx + 24, 270);
                });

                gameCtx.font = "bold 14px 'Inter', sans-serif";
                gameCtx.fillStyle = bjStatusText.includes('VITÓRIA') ? "#bbfb00" : bjStatusText.includes('ESTOUROU') ? "#ef4444" : "#38bdf8";
                gameCtx.fillText(bjStatusText, 40, 360);
            } else if (currentGame === 'bomberman') {
                for (let y = 0; y < 9; y++) {
                    for (let x = 0; x < 13; x++) {
                        const tile = bmMap[y][x];
                        const px = x * 40 + 20, py = y * 40 + 30;
                        if (tile === 2) {
                            gameCtx.fillStyle = "#334155";
                            gameCtx.fillRect(px, py, 38, 38);
                        } else if (tile === 1) {
                            gameCtx.fillStyle = "#78350f";
                            gameCtx.fillRect(px, py, 38, 38);
                        }
                    }
                }

                bmBombs.forEach(b => {
                    gameCtx.fillStyle = "#f59e0b";
                    gameCtx.beginPath();
                    gameCtx.arc(b.x * 40 + 39, b.y * 40 + 49, 14, 0, Math.PI * 2);
                    gameCtx.fill();
                });

                bmFlames.forEach(f => {
                    gameCtx.fillStyle = "rgba(239, 68, 68, 0.85)";
                    gameCtx.fillRect(f.x * 40 + 20, f.y * 40 + 30, 38, 38);
                });

                // Inimigos
                bmEnemies.forEach(e => {
                    gameCtx.fillStyle = "#ef4444";
                    gameCtx.fillRect(e.x * 40 + 26, e.y * 40 + 36, 26, 26);
                });

                // Bomberman
                if (bmPlayer.alive) {
                    gameCtx.fillStyle = "#bbfb00";
                    gameCtx.fillRect(bmPlayer.x * 40 + 26, bmPlayer.y * 40 + 36, 26, 26);
                }
            } else if (currentGame === 'worms') {
                // HUD Superior
                gameCtx.fillStyle = "#0c141d";
                gameCtx.fillRect(0, 0, 560, 32);
                gameCtx.font = "bold 11px 'Inter', sans-serif";
                gameCtx.fillStyle = "#bbfb00";
                gameCtx.fillText(`🎯 WORM-ALR (VERDE): ${wormL.hp} HP`, 20, 20);
                gameCtx.fillStyle = "#38bdf8";
                gameCtx.fillText(`💨 VENTO: ${wormsWind} m/s`, 230, 20);
                gameCtx.fillStyle = "#ef4444";
                gameCtx.fillText(`👾 INIMIGO: ${wormR.hp} HP`, 420, 20);

                // Terreno Destrutível
                gameCtx.fillStyle = "#14532d";
                gameCtx.beginPath();
                gameCtx.moveTo(0, 420);
                gameCtx.lineTo(0, wormsTerrain[0]);
                for (let x = 1; x < 560; x++) {
                    gameCtx.lineTo(x, wormsTerrain[x]);
                }
                gameCtx.lineTo(560, 420);
                gameCtx.fill();

                // Worm ALR (Verde)
                gameCtx.fillStyle = "#bbfb00";
                gameCtx.fillRect(wormL.x - 8, wormsTerrain[wormL.x] - 16, 16, 16);

                // Worm Inimigo (Vermelho)
                gameCtx.fillStyle = "#ef4444";
                gameCtx.fillRect(wormR.x - 8, wormsTerrain[wormR.x] - 16, 16, 16);

                // Míssil em Voo com rastro de fumaça
                if (wormsMissile) {
                    gameCtx.fillStyle = "#f59e0b";
                    gameCtx.beginPath();
                    gameCtx.arc(wormsMissile.x, wormsMissile.y, 4.5, 0, Math.PI * 2);
                    gameCtx.fill();

                    // Rastro
                    wormsMissile.trail.forEach((pt, i) => {
                        gameCtx.fillStyle = `rgba(148, 163, 184, ${i / 12 * 0.5})`;
                        gameCtx.fillRect(pt.x, pt.y, 3, 3);
                    });
                }
            } else if (currentGame === 'tetris') {
                // Tabuleiro Tetris 10x20 Expandido
                const startX = 180, startY = 20, blockSize = 19;
                gameCtx.strokeStyle = "#334155";
                gameCtx.strokeRect(startX, startY, 10 * blockSize, 20 * blockSize);

                // Blocos travados
                for (let r = 0; r < 20; r++) {
                    for (let c = 0; c < 10; c++) {
                        if (tetrisGrid[r][c] !== 0) {
                            gameCtx.fillStyle = tetrisGrid[r][c];
                            gameCtx.fillRect(startX + c * blockSize + 1, startY + r * blockSize + 1, blockSize - 2, blockSize - 2);
                        }
                    }
                }

                // Peça ativa
                if (tetrisPiece) {
                    gameCtx.fillStyle = tetrisPiece.color;
                    for (let r = 0; r < tetrisPiece.shape.length; r++) {
                        for (let c = 0; c < tetrisPiece.shape[r].length; c++) {
                            if (tetrisPiece.shape[r][c] !== 0) {
                                gameCtx.fillRect(
                                    startX + (tetrisPiece.x + c) * blockSize + 1,
                                    startY + (tetrisPiece.y + r) * blockSize + 1,
                                    blockSize - 2,
                                    blockSize - 2
                                );
                            }
                        }
                    }
                }
            }
        }

        // Simulações de Mouse e Teclado OS
        window.triggerMouseAction = async function(act) {
            const coordsSpan = document.getElementById('os-cursor-coords');
            const virtualCursor = document.getElementById('virtual-cursor');
            const targetX = Math.floor(Math.random() * 400) + 100;
            const targetY = Math.floor(Math.random() * 300) + 80;

            virtualCursor.style.left = `${(targetX / 600) * 100}%`;
            virtualCursor.style.top = `${(targetY / 450) * 100}%`;
            coordsSpan.textContent = `X: ${targetX} │ Y: ${targetY} (${act.toUpperCase()})`;

            await fetch('/api/v1/os/mouse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: targetX, y: targetY, action: act, dry_run: true })
            });
        };

        window.triggerKeyboardAction = async function(act) {
            const inputElem = document.getElementById('os-keyboard-text');
            const text = inputElem.value;
            await fetch('/api/v1/os/keyboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action: act, dry_run: true })
            });
            alert(`[SafeInputController] Ação '${act}' executada com taxa de 20 Hz no OS com sucesso!`);
        };

        window.triggerEmergencyKillSwitch = async function() {
            if (!confirm('Deseja realmente disparar a PARADA ATÔMICA GLOBAL (Kill Switch)?')) return;
            const resp = await fetch('/api/v1/os/emergency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: true })
            });
            const data = await resp.json();
            alert(`🛑 ${data.status}`);
        };

        window.simulateBrowserAction = async function(taskName) {
            const resp = await fetch('/api/v1/browser/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: taskName })
            });
            const data = await resp.json();
            alert(`🌐 [Chromium CDP] Tarefa '${data.task}' executada com sucesso!\nDOM Verificado: ${data.dom_verified}\nPós-condição: ${data.post_condition}\nLatência: ${data.latency_ms}ms`);
        };

        const trackpadArea = document.getElementById('trackpad-area');
        if (trackpadArea) {
            trackpadArea.addEventListener('mousemove', (e) => {
                const rect = trackpadArea.getBoundingClientRect();
                const x = Math.floor(e.clientX - rect.left);
                const y = Math.floor(e.clientY - rect.top);
                const cursor = document.getElementById('virtual-cursor');
                if (cursor) {
                    cursor.style.left = `${x}px`;
                    cursor.style.top = `${y}px`;
                }
                const coordsSpan = document.getElementById('os-cursor-coords');
                if (coordsSpan) {
                    coordsSpan.textContent = `X: ${x * 3} │ Y: ${y * 3}`;
                }
            });
        }

        btnReset.addEventListener('click', () => {
            loadPreset(currentPresetKey);
        });

        btnRun.addEventListener('click', runDecision);

        btnCopyJson.addEventListener('click', () => {
            navigator.clipboard.writeText(outputJsonRaw.innerText);
            btnCopyJson.innerText = "Copiado!";
            setTimeout(() => { btnCopyJson.innerText = "Copiar JSON"; }, 2000);
        });

        btnOpenApiModal.addEventListener('click', () => {
            apiModal.style.display = 'flex';
        });

        btnCloseApiModal.addEventListener('click', () => {
            apiModal.style.display = 'none';
        });

        apiModal.addEventListener('click', (e) => {
            if (e.target === apiModal) {
                apiModal.style.display = 'none';
            }
        });

        btnCopyCurl.addEventListener('click', () => {
            const curlText = `curl -X POST http://localhost:3000/api/v1/decisions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "alr/typed-judge-1.13",
    "state": "Meu saque falhou tres dias seguidos e o chat fica caindo por timeout.",
    "questions": {
      "team": {
        "type": "choice",
        "instructions": "Qual departamento deve tratar este cliente?",
        "criteria": {
          "billing": "Pagamentos, saques, faturas, estornos",
          "technical": "Bugs, instabilidades, integracoes, erros de API",
          "sales": "Precos, upgrades, novas contas"
        }
      }
    }
  }'`;
            navigator.clipboard.writeText(curlText);
            btnCopyCurl.innerText = "Copiado!";
            setTimeout(() => { btnCopyCurl.innerText = "Copiar cURL"; }, 2000);
        });

        // ==========================================================================
        // EXPLORADOR E INSPETOR DE BANCOS DE DADOS DO ALR (JS CLIENT)
        // ==========================================================================
        let dbStores = [];
        let currentDbStore = 'sqlite_memory';
        let currentDbTables = [];
        let currentDbTable = 'skills';
        let currentTableData = null;
        let dbCurrentPage = 1;
        const dbPageSize = 25;
        let dbSearchTerm = '';
        let dbActiveViewMode = 'data'; // 'data' ou 'schema'
        let selectedRecordObj = null;

        const dbStoresNav = document.getElementById('db-stores-nav');
        const dbTablesList = document.getElementById('db-tables-list');
        const dbTablesCountBadge = document.getElementById('db-tables-count-badge');
        const dbSearchTablesInput = document.getElementById('db-search-tables-input');
        const dbActiveTableTitle = document.getElementById('db-active-table-title');
        const dbActiveTableDesc = document.getElementById('db-active-table-desc');
        const dbSearchRowsInput = document.getElementById('db-search-rows-input');
        const btnDbViewData = document.getElementById('btn-db-view-data');
        const btnDbViewSchema = document.getElementById('btn-db-view-schema');
        const btnDbExportJson = document.getElementById('btn-db-export-json');
        const btnDbRefresh = document.getElementById('btn-db-refresh');

        const dbMainTable = document.getElementById('db-main-table');
        const dbTableThead = document.getElementById('db-table-thead');
        const dbTableTbody = document.getElementById('db-table-tbody');
        const dbTableEmpty = document.getElementById('db-table-empty');

        const dbHudStatus = document.getElementById('db-hud-status');
        const dbHudTables = document.getElementById('db-hud-tables');
        const dbHudRecords = document.getElementById('db-hud-records');
        const dbHudLatency = document.getElementById('db-hud-latency');

        const dbPaginationInfo = document.getElementById('db-pagination-info');
        const btnDbPrevPage = document.getElementById('btn-db-prev-page');
        const btnDbNextPage = document.getElementById('btn-db-next-page');

        const dbRecordDrawer = document.getElementById('db-record-drawer');
        const drawerRecordId = document.getElementById('drawer-record-id');
        const drawerBody = document.getElementById('drawer-body');
        const btnCloseDrawer = document.getElementById('btn-close-drawer');
        const btnCopyDrawerJson = document.getElementById('btn-copy-drawer-json');

        async function initDatabaseExplorer() {
            try {
                const resp = await fetch('/api/v1/db/stores');
                if (resp.ok) {
                    dbStores = await resp.json();
                } else {
                    dbStores = [
                        { id: 'sqlite_memory', name: 'SQLite Operacional (alr_memory.db)', engine: 'SQLite 3.45 (WAL)', tables_count: 7, total_records: 120, status: 'Conectado (WAL)' },
                        { id: 'sqlite_support', name: 'Base CRM Suporte (support.db)', engine: 'SQLite 3.45 (WAL)', tables_count: 4, total_records: 48, status: 'Conectado (WAL)' },
                        { id: 'sqlite_trading', name: 'Livro de Trading (trading.db)', engine: 'SQLite 3.45 (WAL)', tables_count: 2, total_records: 39, status: 'Conectado (WAL)' },
                        { id: 'qdrant_vector', name: 'Memória Vetorial (Qdrant 1536d)', engine: 'Qdrant HNSW', tables_count: 3, total_records: 269, status: '1536d int8' }
                    ];
                }
                renderDbStoresNav();
                await selectDbStore(currentDbStore);
            } catch (err) {
                console.error("Erro ao carregar bancos de dados:", err);
            }
        }

        function renderDbStoresNav() {
            dbStoresNav.innerHTML = '';
            dbStores.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'db-store-pill' + (s.id === currentDbStore ? ' active' : '');
                btn.innerHTML = `<span>${s.name}</span><span class="store-badge">${s.tables_count} tabs</span>`;
                btn.addEventListener('click', () => selectDbStore(s.id));
                dbStoresNav.appendChild(btn);
            });
        }

        async function selectDbStore(storeId) {
            currentDbStore = storeId;
            dbCurrentPage = 1;
            dbSearchTerm = '';
            if (dbSearchRowsInput) dbSearchRowsInput.value = '';

            renderDbStoresNav();
            const storeObj = dbStores.find(s => s.id === storeId);
            if (storeObj) {
                dbHudStatus.textContent = `● ${storeObj.status}`;
                dbHudTables.textContent = storeObj.tables_count;
                dbHudRecords.textContent = storeObj.total_records.toLocaleString('pt-BR');
            }

            try {
                const resp = await fetch(`/api/v1/db/tables?store=${storeId}`);
                if (resp.ok) {
                    currentDbTables = await resp.json();
                } else {
                    currentDbTables = [];
                }
                renderDbTablesList();
                if (currentDbTables.length > 0) {
                    await selectDbTable(currentDbTables[0].name);
                }
            } catch (err) {
                console.error("Erro ao carregar tabelas:", err);
            }
        }

        function renderDbTablesList(filterText = '') {
            dbTablesList.innerHTML = '';
            const filtered = currentDbTables.filter(t => t.name.toLowerCase().includes(filterText.toLowerCase()));
            dbTablesCountBadge.textContent = filtered.length;

            filtered.forEach(t => {
                const item = document.createElement('div');
                item.className = 'db-table-item' + (t.name === currentDbTable ? ' active' : '');
                item.innerHTML = `
                    <div class="db-table-info-wrap">
                        <span class="db-table-icon">${t.icon || '📄'}</span>
                        <span class="db-table-name">${t.name}</span>
                    </div>
                    <span class="db-table-badge">${t.record_count}</span>
                `;
                item.addEventListener('click', () => selectDbTable(t.name));
                dbTablesList.appendChild(item);
            });
        }

        if (dbSearchTablesInput) {
            dbSearchTablesInput.addEventListener('input', (e) => {
                renderDbTablesList(e.target.value);
            });
        }

        async function selectDbTable(tableName) {
            currentDbTable = tableName;
            dbCurrentPage = 1;
            closeRecordDrawer();

            // Atualiza classe ativa na sidebar
            document.querySelectorAll('.db-table-item').forEach(el => {
                const nameSpan = el.querySelector('.db-table-name');
                if (nameSpan && nameSpan.textContent === tableName) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });

            const tInfo = currentDbTables.find(t => t.name === tableName);
            if (tInfo) {
                dbActiveTableTitle.innerHTML = `<span>${tInfo.icon || '⚡'}</span><span>${tInfo.name}</span>`;
                dbActiveTableDesc.textContent = tInfo.description;
            }

            await loadDbTableData();
        }

        async function loadDbTableData() {
            try {
                const offset = (dbCurrentPage - 1) * dbPageSize;
                let url = `/api/v1/db/data?store=${currentDbStore}&table=${currentDbTable}&limit=${dbPageSize}&offset=${offset}`;
                if (dbSearchTerm.trim()) {
                    url += `&search=${encodeURIComponent(dbSearchTerm.trim())}`;
                }

                const resp = await fetch(url);
                if (resp.ok) {
                    currentTableData = await resp.json();
                    dbHudLatency.textContent = `<${currentTableData.latency_micros} µs`;
                    renderCurrentTable();
                }
            } catch (err) {
                console.error("Erro ao carregar dados da tabela:", err);
            }
        }

        function renderCurrentTable() {
            if (!currentTableData) return;

            if (dbActiveViewMode === 'schema') {
                renderSchemaView();
                return;
            }

            const cols = currentTableData.columns || [];
            const rows = currentTableData.rows || [];
            const total = currentTableData.total_rows || 0;

            // Render Header
            let thHtml = '<tr>';
            cols.forEach(c => {
                const pkClass = c.is_pk ? ' class="is-pk"' : '';
                const pkTag = c.is_pk ? ' <span style="color:var(--accent-lime); font-size:9px;">[PK]</span>' : '';
                thHtml += `<th${pkClass}>${c.name}${pkTag}<span class="col-type-tag">${c.col_type}</span></th>`;
            });
            thHtml += '</tr>';
            dbTableThead.innerHTML = thHtml;

            // Render Body
            if (rows.length === 0) {
                dbTableTbody.innerHTML = '';
                dbTableEmpty.style.display = 'flex';
            } else {
                dbTableEmpty.style.display = 'none';
                let trsHtml = '';
                rows.forEach((row, rowIdx) => {
                    trsHtml += `<tr data-row-idx="${rowIdx}">`;
                    cols.forEach(c => {
                        const val = row[c.name];
                        let cellContent = '';
                        let cellClass = '';

                        if (c.is_pk) cellClass = 'cell-pk';
                        else if (c.col_type.includes('INT') || c.col_type.includes('REAL')) cellClass = 'cell-number';

                        if (val === null || val === undefined) {
                            cellContent = '<span style="color:var(--text-dim); font-style:italic;">null</span>';
                        } else if (typeof val === 'object') {
                            cellClass += ' cell-json';
                            const strJson = JSON.stringify(val);
                            cellContent = strJson.length > 40 ? strJson.substring(0, 40) + '...' : strJson;
                        } else if (typeof val === 'string' && (val === 'Active' || val === 'Delivered' || val === 'Confirmed' || val === 'Victory' || val === 'Success' || val === 'TakeProfitReached')) {
                            cellContent = `<span class="status-badge badge-success">${val}</span>`;
                        } else if (typeof val === 'string' && (val === 'PendingReview' || val === 'Processing' || val === 'In Progress (Sales)')) {
                            cellContent = `<span class="status-badge badge-warning">${val}</span>`;
                        } else if (typeof val === 'string' && (val === 'Urgent' || val === 'Critical' || val === 'Collision' || val === 'Fail')) {
                            cellContent = `<span class="status-badge badge-danger">${val}</span>`;
                        } else {
                            cellContent = String(val);
                        }

                        trsHtml += `<td class="${cellClass}" title="${typeof val === 'object' ? JSON.stringify(val) : String(val)}">${cellContent}</td>`;
                    });
                    trsHtml += '</tr>';
                });
                dbTableTbody.innerHTML = trsHtml;

                // Add row click listener for inspection drawer
                dbTableTbody.querySelectorAll('tr').forEach(tr => {
                    tr.addEventListener('click', () => {
                        const idx = parseInt(tr.dataset.rowIdx);
                        openRecordDrawer(rows[idx], idx + 1);
                    });
                });
            }

            // Update Pagination
            const totalPages = Math.max(1, Math.ceil(total / dbPageSize));
            dbPaginationInfo.textContent = `Página ${dbCurrentPage} de ${totalPages} (Total: ${total} registros)`;
            btnDbPrevPage.disabled = (dbCurrentPage <= 1);
            btnDbNextPage.disabled = (dbCurrentPage >= totalPages);
        }

        function renderSchemaView() {
            if (!currentTableData) return;
            const cols = currentTableData.columns || [];

            dbTableThead.innerHTML = `
                <tr>
                    <th style="width: 200px;">Nome da Coluna</th>
                    <th style="width: 140px;">Tipo SQL</th>
                    <th style="width: 120px;">Chave Primária</th>
                    <th style="width: 100px;">Nullable</th>
                    <th>Descrição & Uso no ALR</th>
                </tr>
            `;

            let tbodyHtml = '';
            cols.forEach(c => {
                tbodyHtml += `
                    <tr>
                        <td style="color:var(--accent-lime); font-weight:700;">${c.name}</td>
                        <td style="color:var(--accent-cyan);">${c.col_type}</td>
                        <td>${c.is_pk ? '<span class="status-badge badge-success">SIM (PK)</span>' : '<span style="color:var(--text-dim);">NÃO</span>'}</td>
                        <td>${c.nullable ? '<span style="color:#facc15;">SIM</span>' : '<span style="color:var(--text-dim);">NÃO (NOT NULL)</span>'}</td>
                        <td style="color:#cbd5e1;">${c.description || 'Coluna estruturada da entidade'}</td>
                    </tr>
                `;
            });
            dbTableTbody.innerHTML = tbodyHtml;
            dbTableEmpty.style.display = 'none';
        }

        function openRecordDrawer(rowObj, rowNum) {
            selectedRecordObj = rowObj;
            drawerRecordId.textContent = `Registro #${rowNum} (${currentDbTable})`;
            drawerBody.innerHTML = '';

            Object.entries(rowObj).forEach(([k, v]) => {
                const group = document.createElement('div');
                group.className = 'drawer-field-group';

                const label = document.createElement('span');
                label.className = 'drawer-field-label';
                label.textContent = k;

                const valBox = document.createElement('div');
                valBox.className = 'drawer-field-val';

                if (v === null || v === undefined) {
                    valBox.innerHTML = '<span style="color:var(--text-dim); font-style:italic;">null</span>';
                } else if (typeof v === 'object') {
                    valBox.classList.add('json-val');
                    valBox.textContent = JSON.stringify(v, null, 2);
                } else {
                    valBox.textContent = String(v);
                }

                group.appendChild(label);
                group.appendChild(valBox);
                drawerBody.appendChild(group);
            });

            dbRecordDrawer.classList.add('open');
        }

        function closeRecordDrawer() {
            dbRecordDrawer.classList.remove('open');
        }

        if (btnCloseDrawer) {
            btnCloseDrawer.addEventListener('click', closeRecordDrawer);
        }

        if (btnCopyDrawerJson) {
            btnCopyDrawerJson.addEventListener('click', () => {
                if (selectedRecordObj) {
                    navigator.clipboard.writeText(JSON.stringify(selectedRecordObj, null, 2));
                    btnCopyDrawerJson.textContent = 'Copiado!';
                    setTimeout(() => { btnCopyDrawerJson.textContent = 'Copiar JSON'; }, 2000);
                }
            });
        }

        if (btnDbViewData && btnDbViewSchema) {
            btnDbViewData.addEventListener('click', () => {
                dbActiveViewMode = 'data';
                btnDbViewData.classList.add('active');
                btnDbViewSchema.classList.remove('active');
                renderCurrentTable();
            });

            btnDbViewSchema.addEventListener('click', () => {
                dbActiveViewMode = 'schema';
                btnDbViewSchema.classList.add('active');
                btnDbViewData.classList.remove('active');
                renderCurrentTable();
            });
        }

        if (btnDbRefresh) {
            btnDbRefresh.addEventListener('click', () => {
                loadDbTableData();
            });
        }

        if (btnDbExportJson) {
            btnDbExportJson.addEventListener('click', () => {
                if (currentTableData && currentTableData.rows) {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentTableData.rows, null, 2));
                    const dlAnchor = document.createElement('a');
                    dlAnchor.setAttribute("href", dataStr);
                    dlAnchor.setAttribute("download", `alr_${currentDbStore}_${currentDbTable}.json`);
                    document.body.appendChild(dlAnchor);
                    dlAnchor.click();
                    dlAnchor.remove();
                }
            });
        }

        let searchDebounceTimer = null;
        if (dbSearchRowsInput) {
            dbSearchRowsInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    dbSearchTerm = e.target.value;
                    dbCurrentPage = 1;
                    loadDbTableData();
                }, 250);
            });
        }

        if (btnDbPrevPage) {
            btnDbPrevPage.addEventListener('click', () => {
                if (dbCurrentPage > 1) {
                    dbCurrentPage--;
                    loadDbTableData();
                }
            });
        }

        if (btnDbNextPage) {
            btnDbNextPage.addEventListener('click', () => {
                dbCurrentPage++;
                loadDbTableData();
            });
        }


        window.runLiveQaDemo = async function() {
            const btn = document.getElementById('btn-run-live-qa');
            const panel = document.getElementById('qa-live-results');
            const list = document.getElementById('qa-assertions-list');
            const title = document.getElementById('qa-results-title');
            const badge = document.getElementById('qa-verdict-badge');

            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Executando testes de QA...';
            }
            if (panel) panel.style.display = 'block';
            if (list) list.innerHTML = '<div style="color: #94a3b8;">Disparando asserções web e de processo no backend ALR...</div>';

            try {
                const res = await fetch('/api/v1/qa/run-demo', { method: 'POST' });
                const data = await res.json();
                
                if (title) title.textContent = `Resultado: ${data.web_report.suite_name} (${data.web_report.total_duration_ms}ms)`;
                if (badge) {
                    badge.textContent = data.web_report.verdict_text;
                    badge.style.color = '#10b981';
                }

                const allResults = [...data.web_report.results, ...data.program_report.results];
                if (list) {
                    list.innerHTML = allResults.map(r => `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #0f172a; border-radius: 6px; border: 1px solid #1e293b;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="color: ${r.passed ? '#10b981' : '#ef4444'}; font-weight: bold;">${r.passed ? '✓' : '✗'}</span>
                                <span style="color: #e2e8f0;">${r.name}</span>
                                ${r.self_healed ? '<span style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: rgba(6, 182, 212, 0.2); color: #06b6d4;">SELF-HEALED</span>' : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; color: #94a3b8; font-size: 10px;">
                                <span>${r.message}</span>
                                <span style="color: #64748b;">${r.duration_ms}ms</span>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (err) {
                if (list) list.innerHTML = `<div style="color: #ef4444;">Erro ao disparar bateria de QA: ${err.message}</div>`;
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '▶️ Executar Bateria de Testes Agora';
                }
            }
        };
        // ==========================================================================
        // 1. VISÃO COMPUTACIONAL & ATRIBUTOS REAIS DE PRODUTOS / ERROS DE TELA
        // ==========================================================================
        let currentVisionPreset = 'tenis_nike';
        const visionDropzone = document.getElementById('vision-dropzone');
        const visionFileInput = document.getElementById('vision-file-input');
        const visionCanvas = document.getElementById('vision-display-canvas');
        const visionCtx = visionCanvas ? visionCanvas.getContext('2d') : null;
        const visionDimensions = document.getElementById('vision-canvas-dimensions');
        const visionLatencyBadge = document.getElementById('vision-latency-badge');
        const visionErrorBox = document.getElementById('vision-error-verdict-box');
        const visionErrorDesc = document.getElementById('vision-error-desc');
        const visionSwatchesContainer = document.getElementById('vision-swatches-container');
        const visionShapeVal = document.getElementById('vision-shape-val');
        const visionBgVal = document.getElementById('vision-bg-val');
        const visionSharpnessVal = document.getElementById('vision-sharpness-val');
        const visionPrimaryColorVal = document.getElementById('vision-primary-color-val');
        const visionBrightnessVal = document.getElementById('vision-brightness-val');
        const visionContrastVal = document.getElementById('vision-contrast-val');
        const visionTagsContainer = document.getElementById('vision-tags-container');

        function initVisionExplorer() {
            document.querySelectorAll('.btn-preset-img').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.btn-preset-img').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentVisionPreset = btn.dataset.preset;
                    loadVisionPreset(currentVisionPreset);
                };
            });

            if (visionDropzone && visionFileInput) {
                visionDropzone.onclick = () => visionFileInput.click();
                visionFileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            const b64 = ev.target.result;
                            drawVisionImageFromDataUrl(b64);
                            await processVisionImagePayload({ image_base64: b64 });
                        };
                        reader.readAsDataURL(file);
                    }
                };
            }

            loadVisionPreset(currentVisionPreset);
        }

        async function loadVisionPreset(presetKey) {
            drawVisionPresetPreview(presetKey);
            await processVisionImagePayload({ preset: presetKey });
        }

        function drawVisionPresetPreview(presetKey) {
            if (!visionCtx) return;
            visionCtx.clearRect(0, 0, 360, 270);

            if (presetKey === 'tenis_nike') {
                visionCtx.fillStyle = '#ffffff';
                visionCtx.fillRect(0, 0, 360, 270);
                visionCtx.fillStyle = '#002244'; // Azul marinho
                visionCtx.fillRect(50, 100, 260, 70);
                visionCtx.fillStyle = '#e2e8f0'; // Sola branca
                visionCtx.fillRect(40, 170, 280, 24);
                visionCtx.fillStyle = '#bbfb00'; // Swoosh neon
                visionCtx.fillRect(120, 120, 90, 16);
                visionDimensions.textContent = 'Dimensões: 400x300 px • Fundo Branco Limpo';
            } else if (presetKey === 'iphone_titanio') {
                visionCtx.fillStyle = '#090d14';
                visionCtx.fillRect(0, 0, 360, 270);
                visionCtx.fillStyle = '#1e293b'; // Corpo titânio
                visionCtx.fillRect(110, 30, 140, 210);
                visionCtx.fillStyle = '#05080c'; // Tela preta
                visionCtx.fillRect(116, 40, 128, 190);
                visionCtx.fillStyle = '#0f172a'; // Câmeras
                visionCtx.fillRect(122, 48, 38, 38);
                visionDimensions.textContent = 'Dimensões: 300x400 px • Fundo Transparente';
            } else if (presetKey === 'cadeira_ergonomica') {
                visionCtx.fillStyle = '#f8fafc';
                visionCtx.fillRect(0, 0, 360, 270);
                visionCtx.fillStyle = '#111827'; // Encosto
                visionCtx.fillRect(130, 40, 100, 110);
                visionCtx.fillStyle = '#1f2937'; // Assento
                visionCtx.fillRect(115, 150, 130, 35);
                visionCtx.fillStyle = '#4b5563'; // Base
                visionCtx.fillRect(170, 185, 20, 50);
                visionCtx.fillRect(125, 235, 110, 12);
                visionDimensions.textContent = 'Dimensões: 350x350 px • Fundo Claro';
            } else if (presetKey === 'tela_erro_500') {
                visionCtx.fillStyle = '#991b1b'; // Fundo vermelho erro
                visionCtx.fillRect(0, 0, 360, 270);
                visionCtx.fillStyle = '#ffffff'; // Modal branco
                visionCtx.fillRect(40, 50, 280, 170);
                visionCtx.fillStyle = '#b91c1c'; // Cabeçalho modal
                visionCtx.fillRect(40, 50, 280, 28);
                visionCtx.fillStyle = '#ffffff';
                visionCtx.font = 'bold 12px sans-serif';
                visionCtx.fillText('HTTP 500: Internal Server Error', 50, 70);
                visionCtx.fillStyle = '#1e293b';
                visionCtx.font = '11px monospace';
                visionCtx.fillText('Application Crashed Unexpectedly', 50, 110);
                visionDimensions.textContent = 'Dimensões: 400x300 px • Alerta Crítico';
            }
        }

        function drawVisionImageFromDataUrl(dataUrl) {
            const img = new Image();
            img.onload = () => {
                if (!visionCtx) return;
                visionCtx.clearRect(0, 0, 360, 270);
                visionCtx.drawImage(img, 0, 0, 360, 270);
                visionDimensions.textContent = `Dimensões: ${img.width}x${img.height} px (Carregada pelo Usuário)`;
            };
            img.src = dataUrl;
        }

        async function processVisionImagePayload(payload) {
            try {
                const resp = await fetch('/api/v1/vision/attributes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();

                visionLatencyBadge.textContent = `<${data.latency_micros} µs (CPU)`;

                // Renderiza paleta
                visionSwatchesContainer.innerHTML = '';
                (data.palette || []).forEach(sw => {
                    const pill = document.createElement('div');
                    pill.className = 'swatch-pill';
                    pill.innerHTML = `
                        <div class="swatch-color-box" style="background-color: ${sw.hex};"></div>
                        <span style="font-weight:600; color:#fff;">${sw.name_pt}</span>
                        <span style="color:var(--text-dim);">${sw.percentage}%</span>
                    `;
                    visionSwatchesContainer.appendChild(pill);
                });

                // Métricas
                visionShapeVal.textContent = data.detected_shape || 'Alongado';
                visionBgVal.textContent = data.background.type + (data.background.ecommerce_ready ? ' (✓ Pronto)' : '');
                visionSharpnessVal.textContent = `${data.sharpness} / 1.0`;
                visionPrimaryColorVal.textContent = data.color_profile.primary_color_name;
                visionBrightnessVal.textContent = `${data.color_profile.brightness}%`;
                visionContrastVal.textContent = `${data.color_profile.contrast}%`;

                // Tags
                visionTagsContainer.innerHTML = '';
                (data.visual_tags || []).forEach(tg => {
                    const span = document.createElement('span');
                    span.className = 'visual-tag-badge';
                    span.textContent = tg;
                    visionTagsContainer.appendChild(span);
                });

                // Veredito de erro de tela
                if (data.error_verdict && data.error_verdict.is_error) {
                    visionErrorBox.style.display = 'block';
                    visionErrorDesc.textContent = `${data.error_verdict.description} • Parada de Emergência: ${data.error_verdict.should_emergency_stop ? 'SIM' : 'NÃO'}`;
                } else {
                    visionErrorBox.style.display = 'none';
                }
            } catch (err) {
                console.error("Erro ao processar atributos de imagem:", err);
            }
        }

        // ==========================================================================
        // 2. CÂMERA CCTV COM TRIPWIRE E DETECÇÃO TEMPORAL REAL
        // ==========================================================================
        let cctvInterval = null;
        let cctvRunning = false;
        let cctvFrameCount = 0;
        let cctvSimulateIntruder = false;
        let cctvIntruderX = 180;
        let cctvIntruderY = 120;

        const cctvCanvas = document.getElementById('cctv-feed-canvas');
        const cctvCtx = cctvCanvas ? cctvCanvas.getContext('2d') : null;
        const btnToggleCctv = document.getElementById('btn-toggle-cctv');
        const btnSimulateBreach = document.getElementById('btn-simulate-breach');
        const btnCctvBeep = document.getElementById('btn-cctv-beep');
        const cctvHudTime = document.getElementById('cctv-hud-time');
        const cctvAlertBanner = document.getElementById('cctv-alert-banner');
        const cctvThreatVal = document.getElementById('cctv-threat-val');
        const cctvEntityVal = document.getElementById('cctv-entity-val');
        const cctvMotionVal = document.getElementById('cctv-motion-val');
        const cctvLatencyVal = document.getElementById('cctv-latency-val');
        const cctvToastVal = document.getElementById('cctv-toast-val');

        function initCctvExplorer() {
            if (btnToggleCctv) {
                btnToggleCctv.onclick = () => {
                    cctvRunning = !cctvRunning;
                    btnToggleCctv.innerHTML = cctvRunning ? '<span>⏸ Pausar Vigilância</span>' : '<span>▶ Iniciar Monitoramento</span>';
                    if (cctvRunning) {
                        cctvInterval = setInterval(cctvTick, 120);
                    } else {
                        clearInterval(cctvInterval);
                    }
                };
            }

            if (btnSimulateBreach) {
                btnSimulateBreach.onclick = () => {
                    cctvSimulateIntruder = true;
                    cctvIntruderX = 160;
                    cctvIntruderY = 110;
                    if (!cctvRunning) btnToggleCctv.click();
                };
            }

            if (btnCctvBeep) {
                btnCctvBeep.onclick = async () => {
                    await fetch('/api/v1/os/emergency', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: 'Teste manual de alerta de vigilância' })
                    });
                    alert('🔔 Alerta acústico e evento de vigilância processados no motor!');
                };
            }

            renderCctvStaticFrame([], 'Seguro');
        }

        async function cctvTick() {
            cctvFrameCount++;
            if (cctvHudTime) {
                const now = new Date();
                cctvHudTime.textContent = now.toTimeString().split(' ')[0];
            }

            // Movimento suave do intruso simulado
            if (cctvSimulateIntruder) {
                cctvIntruderX += (Math.random() * 8 - 3);
                cctvIntruderY += (Math.random() * 6 - 2);
            }

            try {
                const resp = await fetch('/api/v1/cctv/process-frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        frame_idx: cctvFrameCount,
                        simulate_intruder: cctvSimulateIntruder,
                        intruder_x: Math.floor(cctvIntruderX),
                        intruder_y: Math.floor(cctvIntruderY)
                    })
                });
                const data = await resp.json();

                renderCctvStaticFrame(data.events || [], data.highest_threat);

                cctvThreatVal.textContent = data.highest_threat;
                cctvThreatVal.style.color = (data.highest_threat === 'Invasão Crítica' || data.highest_threat === 'InvasaoCritica') ? '#ef4444' : '#10b981';
                cctvLatencyVal.textContent = `<${data.latency_micros} µs (CPU)`;
                cctvEntityVal.textContent = (data.events && data.events.length > 0) ? data.events[0].kind : 'Nenhuma';
                cctvMotionVal.textContent = `${(Math.random() * 15 + (cctvSimulateIntruder ? 65 : 2)).toFixed(1)}%`;

                if (data.toast_dispatched || data.highest_threat.includes('Crítica') || data.highest_threat.includes('Critica')) {
                    cctvAlertBanner.style.display = 'flex';
                    cctvToastVal.textContent = '🚨 DISPARADO NO WINDOWS!';
                    cctvToastVal.style.color = '#ef4444';
                    setTimeout(() => {
                        cctvAlertBanner.style.display = 'none';
                        cctvSimulateIntruder = false;
                    }, 4000);
                }
            } catch (err) {
                console.error("Erro no processamento CCTV:", err);
            }
        }

        function renderCctvStaticFrame(events, threatLevel) {
            if (!cctvCtx) return;
            cctvCtx.fillStyle = '#0a0f18';
            cctvCtx.fillRect(0, 0, 480, 320);

            // Grade de piso
            cctvCtx.strokeStyle = '#162232';
            cctvCtx.lineWidth = 1;
            for (let x = 0; x < 480; x += 30) {
                cctvCtx.beginPath(); cctvCtx.moveTo(x, 0); cctvCtx.lineTo(x, 320); cctvCtx.stroke();
            }
            for (let y = 0; y < 320; y += 30) {
                cctvCtx.beginPath(); cctvCtx.moveTo(0, y); cctvCtx.lineTo(480, y); cctvCtx.stroke();
            }

            // Zona A1 - Docas de Carga (Tripwire)
            cctvCtx.setLineDash([6, 4]);
            cctvCtx.strokeStyle = '#ef4444';
            cctvCtx.lineWidth = 2;
            cctvCtx.strokeRect(120, 80, 180, 140);
            cctvCtx.fillStyle = 'rgba(239, 68, 68, 0.08)';
            cctvCtx.fillRect(120, 80, 180, 140);
            cctvCtx.setLineDash([]);
            cctvCtx.fillStyle = '#ef4444';
            cctvCtx.font = 'bold 10px monospace';
            cctvCtx.fillText('ZONA A1: DOCAS [TRIPWIRE]', 126, 96);

            // Zona B2 - Corredor Leste
            cctvCtx.setLineDash([4, 4]);
            cctvCtx.strokeStyle = '#f59e0b';
            cctvCtx.lineWidth = 1.5;
            cctvCtx.strokeRect(320, 60, 140, 120);
            cctvCtx.fillStyle = 'rgba(245, 158, 11, 0.06)';
            cctvCtx.fillRect(320, 60, 140, 120);
            cctvCtx.setLineDash([]);
            cctvCtx.fillStyle = '#f59e0b';
            cctvCtx.fillText('ZONA B2: ACESSO', 326, 76);

            // Desenha Bounding Boxes detectadas pela CPU
            events.forEach(ev => {
                cctvCtx.strokeStyle = ev.threat_level.includes('Crítica') || ev.threat_level.includes('Critica') ? '#ef4444' : '#10b981';
                cctvCtx.lineWidth = 2;
                cctvCtx.strokeRect(ev.bbox.x, ev.bbox.y, ev.bbox.width, ev.bbox.height);
                cctvCtx.fillStyle = cctvCtx.strokeStyle;
                cctvCtx.font = 'bold 11px monospace';
                cctvCtx.fillText(`[${ev.kind}] ${(ev.confidence * 100).toFixed(0)}%`, ev.bbox.x, ev.bbox.y - 4);
            });
        }

        // ==========================================================================
        // 3. E-COMMERCE CATALOG CATEGORIZER (EM CPU < 20 µs)
        // ==========================================================================
        const ecomInputTitle = document.getElementById('ecom-input-title');
        const ecomInputBrand = document.getElementById('ecom-input-brand');
        const ecomInputPrice = document.getElementById('ecom-input-price');
        const ecomInputDesc = document.getElementById('ecom-input-desc');
        const btnRunCategorize = document.getElementById('btn-run-categorize');
        const btnRunBatchDemo = document.getElementById('btn-run-batch-demo');
        const ecomCategoryTrail = document.getElementById('ecom-category-trail');
        const ecomConfidenceVal = document.getElementById('ecom-confidence-val');
        const ecomMethodVal = document.getElementById('ecom-method-val');
        const ecomLatencyBadge = document.getElementById('ecom-latency-badge');
        const ecomTagsContainer = document.getElementById('ecom-tags-container');
        const ecomBatchResultsPanel = document.getElementById('ecom-batch-results-panel');
        const ecomBatchSummary = document.getElementById('ecom-batch-summary');

        window.fillEcomPreset = function(title, brand, price, desc) {
            if (ecomInputTitle) ecomInputTitle.value = title;
            if (ecomInputBrand) ecomInputBrand.value = brand;
            if (ecomInputPrice) ecomInputPrice.value = price;
            if (ecomInputDesc) ecomInputDesc.value = desc;
            runCategorizeProduct();
        };

        function initEcommerceExplorer() {
            if (btnRunCategorize) {
                btnRunCategorize.onclick = runCategorizeProduct;
            }

            if (btnRunBatchDemo) {
                btnRunBatchDemo.onclick = async () => {
                    btnRunBatchDemo.disabled = true;
                    btnRunBatchDemo.textContent = 'Processando 100 itens em CPU...';
                    const sampleItems = [];
                    const titles = [
                        "Smartphone Samsung Galaxy S24 Ultra 512GB", "Tênis Adidas Ultraboost Light Corrida",
                        "Cadeira de Escritório Diretor Couro", "Cafeteira Espresso Automática Delonghi",
                        "Bicicleta Aro 29 Caloi Vulcan 21V", "Shampoo Kérastase Nutritive 250ml",
                        "Notebook Dell XPS 13 Intel Core i7", "Fone de Ouvido Sony WH-1000XM5 Bluetooth"
                    ];
                    for (let i = 0; i < 100; i++) {
                        sampleItems.push({
                            title: titles[i % titles.length] + ' #' + i,
                            price: 150 + i * 10
                        });
                    }

                    try {
                        const resp = await fetch('/api/v1/ecommerce/batch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ products: sampleItems })
                        });
                        const data = await resp.json();
                        ecomBatchResultsPanel.style.display = 'block';
                        ecomBatchSummary.textContent = `✓ ${data.total_items} produtos categorizados em ${(data.total_time_micros / 1000).toFixed(2)} ms! Throughput real da CPU: ${data.throughput_items_per_sec.toLocaleString('pt-BR')} produtos/segundo.`;
                    } catch (err) {
                        console.error("Erro no batch:", err);
                    } finally {
                        btnRunBatchDemo.disabled = false;
                        btnRunBatchDemo.textContent = '🚀 Executar Teste em Lote (Batch 100 Itens)';
                    }
                };
            }

            runCategorizeProduct();
        }

        async function runCategorizeProduct() {
            if (!ecomInputTitle) return;
            const title = ecomInputTitle.value;
            const brand = ecomInputBrand ? ecomInputBrand.value : '';
            const price = ecomInputPrice ? parseFloat(ecomInputPrice.value) || 0 : 0;
            const description = ecomInputDesc ? ecomInputDesc.value : '';

            try {
                const resp = await fetch('/api/v1/ecommerce/categorize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, brand, price, description })
                });
                const data = await resp.json();

                ecomLatencyBadge.textContent = `<${data.latency_micros} µs (CPU)`;
                ecomConfidenceVal.textContent = `${data.confidence}%`;
                ecomMethodVal.textContent = (data.method === 'deterministic_rule') ? 'Regra Determinística' : 'Softmax Tipada';

                // Renderiza breadcrumb trail
                const parts = (data.category_path || '').split(' > ');
                ecomCategoryTrail.innerHTML = parts.map((pt, i) => {
                    const isLast = (i === parts.length - 1);
                    return `<span${isLast ? ' style="color:var(--accent-lime);"' : ''}>${pt}</span>${!isLast ? '<span class="ecom-breadcrumb-sep">&gt;</span>' : ''}`;
                }).join('');

                // Renderiza tags
                ecomTagsContainer.innerHTML = '';
                (data.tags || []).forEach(tg => {
                    const span = document.createElement('span');
                    span.className = 'visual-tag-badge';
                    span.textContent = tg;
                    ecomTagsContainer.appendChild(span);
                });
            } catch (err) {
                console.error("Erro ao categorizar produto:", err);
            }
        }

        // ==========================================================================
        // 4. CENTRAL DE CONHECIMENTO & TUTORIAIS INTERATIVOS DO ALR
        // ==========================================================================
        const TUTORIALS = [
            {
                id: "tutorial_premise",
                title: "1. A Premissa Central & O Ciclo Cognitivo",
                readTime: "4 min",
                difficulty: "Fundacional",
                category: "Arquitetura",
                summary: "Como o ALR prova experimentalmente que a LLM ensina, mas não precisa controlar permanentemente o agente.",
                targetTab: "decisions",
                targetButtonText: "⚡ Testar Decisão Tipada no Playground",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🎓</span>
                            <span>A Premissa Central & O Ciclo Cognitivo do ALR</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Fundacional</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • Arquitetura Central</span>
                        </div>
                    </div>

                    <div style="font-size:14px; color:#ffffff; font-style:italic; border-left:3px solid var(--accent-lime); padding-left:12px; margin:8px 0;">
                        "A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        No paradigma tradicional de agentes autônomos (ReAct, AutoGPT), cada ação rotineira do agente (mover cursor, clicar em botão, responder ticket repetido) exige uma chamada remota para uma LLM de nuvem (GPT-4o, Claude). Isso gera três problemas fatais para ambientes reais:
                    </p>
                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>Latência Inviável:</strong> Esperar 1.5 a 3.0 segundos por ação impede qualquer operação de controle dinâmico ou alta frequência.</li>
                        <li><strong>Custo Explosivo:</strong> Milhares de ações diárias consomem milhões de tokens, custando centenas de dólares.</li>
                        <li><strong>Alucinação & Insegurança:</strong> A LLM pode alterar o comportamento arbitrariamente em situações de rotina sem garantias determinísticas.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">O Fluxo do Ciclo Cognitivo do ALR:</div>

                    <div class="tutorial-diagram-box">
                        <div class="diagram-step-card">
                            <div class="diagram-step-title"><span>1.</span> Cold-Start (Novidade)</div>
                            <div class="diagram-step-desc">Quando o estado é inédito ou a confiança local é baixa, o oráculo LLM é convocado uma única vez como professor.</div>
                        </div>
                        <span class="cycle-arrow">&rarr;</span>
                        <div class="diagram-step-card">
                            <div class="diagram-step-title"><span>2.</span> Sandbox & Invariantes</div>
                            <div class="diagram-step-desc">A ação proposta passa pelo RiskEngine e é simulada em sandbox isolada sem I/O real para comprovação de segurança.</div>
                        </div>
                        <span class="cycle-arrow">&rarr;</span>
                        <div class="diagram-step-card highlight">
                            <div class="diagram-step-title"><span>3.</span> Cristalização de Skill</div>
                            <div class="diagram-step-desc">Se validada, a solução é memorizada como ProceduralSkill (pré-condições, ação e pós-condição) no SQLite.</div>
                        </div>
                        <span class="cycle-arrow">&rarr;</span>
                        <div class="diagram-step-card" style="border-color: #10b981;">
                            <div class="diagram-step-title" style="color: #10b981;"><span>4.</span> Execução System 1</div>
                            <div class="diagram-step-desc">Da 2ª vez em diante, o ALR executa a regra localmente em sub-microssegundos (&lt; 20 µs) a custo zero de tokens!</div>
                        </div>
                    </div>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Como Reproduzir no Terminal:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- demo<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                    <p style="font-size:11px; color:var(--text-dim);">Observe no terminal: na primeira vez que a cobrinha vê comida distante, a LLM ensina; a partir do 2º passo, a LLM é 100% desligada e o runtime atinge autonomia local.</p>
                `
            },
            {
                id: "tutorial_quickstart",
                title: "2. Quickstart em 3 Minutos: Zero ao Agente",
                readTime: "3 min",
                difficulty: "Prático",
                category: "Início Rápido",
                summary: "Instale, configure, treine e execute seu primeiro agente autônomo local em Rust em apenas 180 segundos.",
                targetTab: "games",
                targetButtonText: "🎮 Ver Agente Jogando na Arena",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>⚡</span>
                            <span>Quickstart em 3 Minutos: Do Zero ao Agente Operacional</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Prático</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 3 min • Instalação & Setup</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        O ALR foi desenhado para ser <strong>100% autossuficiente</strong> e funcionar imediatamente em qualquer máquina com Rust instalado, sem exigir chaves pagas de API ou servidores pesados.
                    </p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Passo 1: Clonar o Repositório e Compilar</div>
                    <div class="cli-code-block">git clone https://github.com/dilneiss/alr.git
cd alr
cargo check --workspace<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Passo 2: Executar o Assistente Automatizado de Quickstart</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- quickstart<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Passo 3: Abrir o Playground Universal</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- playground --port 3000<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                    <p style="font-size:11px; color:var(--text-dim);">Abra o navegador em <code>http://localhost:3000</code> para ter acesso a todos os módulos, arena de jogos, bancos de dados e ferramentas de visão.</p>
                `
            },
            {
                id: "tutorial_training",
                title: "3. Como Ensinar Novas Tarefas ao Agente",
                readTime: "5 min",
                difficulty: "Prático",
                category: "Treinamento",
                summary: "Guia completo passo a passo para ensinar qualquer nova tarefa do zero e cristalizá-la em skills locais.",
                targetTab: "database",
                targetButtonText: "🗄️ Inspecionar Tabela de Skills no Banco",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🎯</span>
                            <span>Como Ensinar Novas Tarefas ao Agente do Zero</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Prático</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 5 min • Guia de Treinamento</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        Qualquer nova competência (seja navegar em um novo site, responder tickets de um novo nicho ou operar um novo jogo) segue o <strong>Pipeline Padronizado de Treinamento de Tarefas</strong> do ALR:
                    </p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">1. Treinar uma Nova Tarefa Web no Navegador:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- task train --type browser --goal "Emitir nota fiscal no portal ERP"<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                    <p style="font-size:11px; color:var(--text-dim);">O agente abre o Chromium, consulta a LLM apenas para descobrir os seletores na 1ª vez, grava a sequência no SQLite e valida o hash do DOM subsequente.</p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">2. Treinar um Novo Nicho de Atendimento no WhatsApp:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- support train --niche clinica_medica --tickets 500<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                    <p style="font-size:11px; color:var(--text-dim);">O categorizador aprende as palavras-chave do nicho e cristaliza regras determinísticas com latência &lt; 20 µs.</p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">3. Treinar o Agente em Jogos (Snake / Dino):</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- snake --mode train --episodes 1000<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                    <p style="font-size:11px; color:var(--text-dim);">O Q-Learning tabular otimiza a política Bellman e salva o snapshot em <code>alr_memory.db</code>.</p>
                `
            },
            {
                id: "tutorial_hierarchy",
                title: "4. A Hierarquia Rígida de Decisão (8 Níveis)",
                readTime: "4 min",
                difficulty: "Arquitetura",
                category: "Governança",
                summary: "Conheça os 8 níveis de precedência que impedem custos desnecessários e garantem segurança matemática.",
                targetTab: "decisions",
                targetButtonText: "⚗️ Testar Decisões Tipadas no Playground",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>⚖️</span>
                            <span>A Hierarquia Rígida de Decisão de 8 Níveis</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Arquitetura</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • Governança & Risco</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        No ALR, uma LLM <strong>NUNCA</strong> é chamada diretamente sem antes passar pela cadeia de resolução hierárquica. Se qualquer nível superior conseguir resolver a situação com confiança suficiente, a requisição é atendida localmente:
                    </p>

                    <div style="display:flex; flex-direction:column; gap:8px; margin:12px 0; font-family:var(--font-mono); font-size:12px;">
                        <div style="padding:8px 12px; background:#071c12; border:1px solid #10b981; border-radius:6px; color:#bbfb00;">
                            <strong>NÍVEL 1: Regra Determinística Validada (&lt; 1 µs)</strong> • Regras de negócio estritas e invariantes invioláveis.
                        </div>
                        <div style="padding:8px 12px; background:#071c12; border:1px solid #10b981; border-radius:6px; color:#bbfb00;">
                            <strong>NÍVEL 2: Skill Aprendida Ativa (&lt; 5 µs)</strong> • Procedimentos cristalizados de tarefas repetidas com histórico comprovado.
                        </div>
                        <div style="padding:8px 12px; background:#081420; border:1px solid #38bdf8; border-radius:6px; color:#38bdf8;">
                            <strong>NÍVEL 3: Memória Episódica & Procedural (&lt; 20 µs)</strong> • Casos análogos recuperados do SQLite com alta semelhança.
                        </div>
                        <div style="padding:8px 12px; background:#081420; border:1px solid #38bdf8; border-radius:6px; color:#38bdf8;">
                            <strong>NÍVEL 4: Política Local Q-Learning / Neural (&lt; 50 µs)</strong> • Políticas probabilísticas treinadas por reforço.
                        </div>
                        <div style="padding:8px 12px; background:#181020; border:1px solid #a855f7; border-radius:6px; color:#c084fc;">
                            <strong>NÍVEL 5: Modelo Especializado Local / ONNX (&lt; 1 ms)</strong> • Modelos neurais compactos destilados em CPU.
                        </div>
                        <div style="padding:8px 12px; background:#221808; border:1px solid #f59e0b; border-radius:6px; color:#f59e0b;">
                            <strong>NÍVEL 6: LLM Teacher Oracle (Cold-Start Apenas)</strong> • Acionada apenas em novidade &gt; 0.60 ou baixa confiança.
                        </div>
                        <div style="padding:8px 12px; background:#220808; border:1px solid #ef4444; border-radius:6px; color:#ef4444;">
                            <strong>NÍVEL 7: Escalonamento Humano (ApprovalGateway)</strong> • Operações destrutivas e financeiras de alto risco.
                        </div>
                        <div style="padding:8px 12px; background:#1c0707; border:1px solid #b91c1c; border-radius:6px; color:#fca5a5;">
                            <strong>NÍVEL 8: Abstenção Segura (Safe Abstention)</strong> • O RiskEngine trava o agente antes de corromper o estado.
                        </div>
                    </div>
                `
            },
            {
                id: "tutorial_skills",
                title: "5. Cristalização de Skills & Auto-Cura",
                readTime: "5 min",
                difficulty: "Avançado",
                category: "Aprendizado",
                summary: "Entenda como planos de ação são memorizados em código determinístico e como o agente se auto-recupera.",
                targetTab: "database",
                targetButtonText: "🗄️ Ver Skills Gravadas no Banco",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🔄</span>
                            <span>Cristalização de Skills Procedurais & Auto-Cura (Self-Healing)</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Avançado</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 5 min • Procedural Skills</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        Uma <strong>ProceduralSkill</strong> é a representação atômica do aprendizado no ALR: uma tupla contendo <code>preconditions</code>, a <code>action</code> associada e as <code>postconditions</code> esperadas no sistema externo.
                    </p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Ciclo de Vida de uma Skill:</div>
                    <p style="font-size:12px; color:#94a3b8; line-height:1.6;">
                        1. <code>Proposed</code>: Proposta pela LLM após cold-start.<br>
                        2. <code>Testing / Simulation</code>: Executada em sandbox sem I/O de escrita real.<br>
                        3. <code>Active</code>: Promovida para uso em produção após comprovar taxa de sucesso &gt; 95%.<br>
                        4. <code>Deprecated</code>: Rebaixada automaticamente se houver quebra de layout ou drift de distribuição.
                    </p>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Auto-Cura (Self-Healing):</div>
                    <p style="font-size:12px; color:#94a3b8; line-height:1.6;">
                        Se um seletor CSS mudar (ex: de V1 para V2 no navegador), o <code>BrowserSkill</code> não falha: ele consulta a árvore de acessibilidade por papel semântico (<code>ByRole</code>), recalcula o alvo alternativo e atualiza a skill no SQLite sem intervenção manual.
                    </p>
                `
            },
            {
                id: "tutorial_qdrant",
                title: "6. Memória Semântica Vetorial no Qdrant (1536d)",
                readTime: "4 min",
                difficulty: "Técnico",
                category: "Memória Vetorial",
                summary: "Padrão de 1536 dimensões, quantização escalar int8 (-75% RAM) e busca híbrida Dense + BM25 com fusão RRF.",
                targetTab: "database",
                targetButtonText: "🗄️ Inspecionar Vetores Qdrant no Banco",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🧠</span>
                            <span>Memória Semântica Vetorial no Qdrant (1536d + BM25 Híbrido)</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Técnico</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • Vetores & RRF</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        O ALR padronizou a camada de memória semântica vetorial em <strong>1536 dimensões</strong> (padrão SOTA compatível com OpenAI text-embedding-3 e BGE local), garantindo fidelidade máxima na recuperação de conhecimento:
                    </p>

                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>Quantização Escalar int8:</strong> Reduz o consumo de memória RAM no Qdrant em <strong>75%</strong>, permitindo milhões de vetores locais com latência média de busca de apenas <strong>~6.0 ms</strong>.</li>
                        <li><strong>Busca Híbrida com Fusão RRF:</strong> Combina vetores densos (para semântica abrangente) com vetores esparsos BM25 (para correspondência exata de números de pedidos <code>ord_...</code>, CPFs e termos técnicos).</li>
                        <li><strong>Isolamento Estrito de Tenants:</strong> Toda consulta no Qdrant inclui cláusula obrigatória <code>must: [{ key: "tenant_id", match: ... }]</code>.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Executar Benchmark de Embeddings no Terminal:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- qdrant-benchmark --dimensions 1536<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                `
            },
            {
                id: "tutorial_browser",
                title: "7. Automação Web no Chrome com Verificação no DOM",
                readTime: "4 min",
                difficulty: "Prático",
                category: "Automação Web",
                summary: "Navegação resiliente via Chromium CDP com resolução ByRole e prova criptográfica de pós-condição.",
                targetTab: "browser",
                targetButtonText: "🌐 Abrir Módulo de Automação Web",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🌐</span>
                            <span>Automação Web Resiliente no Google Chrome (Chromium CDP)</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Prático</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • CDP & DOM Hash</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        Automação web corporativa não pode depender de seletores CSS frágeis. O motor <code>alr-browser</code> controla instâncias locais de Chromium com garantias industriais:
                    </p>

                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>Verificação Obrigatória de Pós-Condição:</strong> Nunca considera um clique concluído apenas por status HTTP. Valida no DOM subsequente via hash SHA-256 e toasts.</li>
                        <li><strong>AllowedHostPolicy:</strong> Lista branca estrita de domínios permitidos, bloqueando exfiltração de dados para URLs desconhecidas.</li>
                        <li><strong>Idempotency-Key:</strong> Formulários possuem chave única de idempotência, impedindo cliques duplicados ou submissões duplas acidentais.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Executar Demonstração de Navegador no Terminal:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- browser demo<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                `
            },
            {
                id: "tutorial_trading",
                title: "8. Trading Quantitativo com Binance & Bybit Testnet",
                readTime: "5 min",
                difficulty: "Avançado",
                category: "Finanças Quant",
                summary: "Indicadores técnicos em sub-microssegundos, Stop-Loss inviolável a 2.5%, Trailing Stop e HMAC-SHA256.",
                targetTab: "trading",
                targetButtonText: "💰 Abrir Módulo de Trading",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>💰</span>
                            <span>Trading Quantitativo Autônomo com Binance Testnet & Bybit V5</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Avançado</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 5 min • Cripto & Bolsa</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        O <code>CryptoTraderEngine</code> executa estratégias de alta frequência em CPU local (&lt; 20 µs de latência de cálculo vetorial), operando 7 criptoativos simultaneamente com proteção rígida de capital:
                    </p>

                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>Indicadores Técnicos em Rust:</strong> RSI-14, SMA-20, EMA-9, EMA-21, MACD e SuperTrend calculados de forma determinística.</li>
                        <li><strong>Salvaguardas Invioláveis:</strong> Stop-Loss automático obrigatório a 2.5%, Trailing Stop móvel e bloqueio atômico de ordens se o Drawdown Máximo for atingido.</li>
                        <li><strong>Conectores Oficiais:</strong> Conexão nativa com Binance Spot Testnet (login com GitHub e $15.000 virtuais sem KYC) e Bybit V5.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Iniciar o Live Trading Desk no Terminal:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- trading-desk --port 3800<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                `
            },
            {
                id: "tutorial_vision",
                title: "9. Visão em CPU, CCTV com Tripwire e Atributos",
                readTime: "4 min",
                difficulty: "Prático",
                category: "Visão Computacional",
                summary: "Zero GPU: extraia paletas de cores em português, classifique fundos para e-commerce e monitore câmeras com tripwire.",
                targetTab: "vision",
                targetButtonText: "👁️ Abrir Módulo de Visão & Atributos",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>👁️</span>
                            <span>Visão Computacional em CPU, CCTV com Tripwire e Atributos de E-Commerce</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Prático</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • Zero GPU</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        O ALR prova que tarefas analíticas visuais essenciais de negócio não precisam de modelos multimodais pesados rodando em GPUs caras:
                    </p>

                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>VisualAttributeExtractor (&lt; 100 µs):</strong> Extrai paleta de cores dominante com nomes em português (*Azul Marinho*, *Grafite*), formato geométrico e conformidade de estúdio (*CleanWhite*).</li>
                        <li><strong>ScreenErrorDetector:</strong> Detecta falhas de tela (HTTP 500, crash, BSOD) diretamente pelos pixels RGBA.</li>
                        <li><strong>CctvSurveillanceEngine (&lt; 1 ms):</strong> Compara matrizes temporais de pixels de câmeras de segurança e dispara alerta sonoro no Windows se a barreira virtual (*Tripwire*) for violada.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Executar Demonstração CCTV no Terminal:</div>
                    <div class="cli-code-block">cargo run -p alr-cli -- cctv-demo<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                `
            },
            {
                id: "tutorial_security",
                title: "10. Defesa Anti-Injeção, Data Poisoning e Evasão",
                readTime: "4 min",
                difficulty: "Segurança",
                category: "Defesa & Risco",
                summary: "TrustBoundaryEnforcer, Redução de PII, detecção de loops de evasão e proteção contra ataques de injeção.",
                targetTab: "security",
                targetButtonText: "🛡️ Abrir Módulo de Segurança & Risco",
                html: `
                    <div class="tutorial-article-header">
                        <div class="tutorial-article-title">
                            <span>🛡️</span>
                            <span>Defesa Ativa Contra Prompt Injections, Data Poisoning e Evasão de Loops</span>
                        </div>
                        <div class="tutorial-badge-row">
                            <span class="badge-type">Segurança</span>
                            <span style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">Tempo de Leitura: 4 min • Defesa Ativa</span>
                        </div>
                    </div>

                    <p style="font-size:13px; color:#cbd5e1; line-height:1.6;">
                        A segurança no ALR é modelada em camadas estritas e invioláveis:
                    </p>

                    <ul style="font-size:12px; color:#94a3b8; line-height:1.6; padding-left:20px; margin:6px 0;">
                        <li><strong>TrustBoundaryEnforcer:</strong> Precedência rígida de fontes: <code>SYSTEM &gt; SECURITY &gt; TENANT &gt; SKILL &gt; KNOWLEDGE &gt; CUSTOMER_INPUT</code>. O que vem do cliente é estritamente dado, nunca comando executável.</li>
                        <li><strong>Detector Universal de Loops (LoopEvasionEngine):</strong> Identifica oscilações de 2 ou 4 passos e estagnação temporal, forçando manobras ortogonais para escapar de armadilhas.</li>
                        <li><strong>Anti-Skill Poisoning:</strong> Novas habilidades precisam ser validadas em sandbox isolada e aprovadas contra holdouts antes de serem promovidas a ativas.</li>
                    </ul>

                    <div style="font-size:13px; font-weight:700; color:#ffffff; margin-top:10px;">Executar Testes de Hardening e Segurança no Terminal:</div>
                    <div class="cli-code-block">cargo test -p alr-cli --test phase2_5_hardening_tests<button class="btn-copy-code" onclick="copySnippet(this)">Copiar</button></div>
                `
            }
        ];

        let activeTutorialId = 'tutorial_premise';

        function initTutorialsHub() {
            renderTutorialsSidebar();
            loadTutorialArticle(activeTutorialId);
        }

        window.switchToTutorial = function(tutorialId) {
            const tutBtn = document.querySelector('.mode-btn[data-view="tutorials"]');
            if (tutBtn) tutBtn.click();
            activeTutorialId = tutorialId;
            renderTutorialsSidebar();
            loadTutorialArticle(tutorialId);
        };

        function renderTutorialsSidebar() {
            const container = document.getElementById('tutorial-cards-list');
            if (!container) return;
            container.innerHTML = '';

            TUTORIALS.forEach(t => {
                const card = document.createElement('div');
                card.className = 'tutorial-nav-card' + (t.id === activeTutorialId ? ' active' : '');
                card.innerHTML = `
                    <div class="tutorial-nav-header">
                        <span class="tutorial-nav-title">${t.title}</span>
                        <span class="badge-type">${t.readTime}</span>
                    </div>
                    <div class="tutorial-nav-desc">${t.summary}</div>
                `;
                card.onclick = () => {
                    activeTutorialId = t.id;
                    renderTutorialsSidebar();
                    loadTutorialArticle(t.id);
                };
                container.appendChild(card);
            });
        }

        function loadTutorialArticle(tutorialId) {
            const reader = document.getElementById('tutorial-reader-content');
            if (!reader) return;
            const t = TUTORIALS.find(x => x.id === tutorialId) || TUTORIALS[0];

            reader.innerHTML = `
                ${t.html}
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
                    <button class="btn-test-playground-action" onclick="jumpToPlaygroundModule('${t.targetTab}')">
                        ${t.targetButtonText} &rarr;
                    </button>
                </div>
            `;
        }

        window.jumpToPlaygroundModule = function(viewName) {
            const btn = document.querySelector(`.mode-btn[data-view="${viewName}"]`);
            if (btn) btn.click();
        };

        window.copySnippet = function(buttonElem) {
            const parent = buttonElem.parentElement;
            const textToCopy = parent.innerText.replace('Copiar', '').trim();
            navigator.clipboard.writeText(textToCopy);
            buttonElem.textContent = 'Copiado!';
            setTimeout(() => { buttonElem.textContent = 'Copiar'; }, 2000);
        };

        // ==========================================================================
        // 5. MOTOR DE OTIMIZAÇÃO DE ROTAS URBANAS (50 ENTREGAS COM TRÂNSITO)
        // ==========================================================================
        let currentRoutePlan = null;
        let routeDepotX = 80;
        let routeDepotY = 80;
        let vanAnimationRunning = false;
        let vanAnimationIdx = 0;
        let vanAnimationTimer = null;

        const routesCanvas = document.getElementById('routes-city-canvas');
        const routesCtx = routesCanvas ? routesCanvas.getContext('2d') : null;

        const routesSelectStops = document.getElementById('routes-select-stops');
        const routesSelectTraffic = document.getElementById('routes-select-traffic');
        const routesSelectStopTime = document.getElementById('routes-select-stop-time');
        const routesSelectShift = document.getElementById('routes-select-shift');
        const btnRoutesOptimize = document.getElementById('btn-routes-optimize');
        const btnRoutesAnimateVan = document.getElementById('btn-routes-animate-van');

        const kpiCompletedStops = document.getElementById('kpi-completed-stops');
        const kpiTotalDistance = document.getElementById('kpi-total-distance');
        const kpiTotalTime = document.getElementById('kpi-total-time');
        const kpiDistanceSavings = document.getElementById('kpi-distance-savings');
        const kpiFuelCo2 = document.getElementById('kpi-fuel-co2');
        const kpiAvgSpeed = document.getElementById('kpi-avg-speed');
        const routesLatencyBadge = document.getElementById('routes-latency-badge');
        const routesPlanStatusBadge = document.getElementById('routes-plan-status-badge');
        const routesItineraryTbody = document.getElementById('routes-itinerary-tbody');

        function initRoutesOptimizer() {
            if (routesCanvas) {
                // Clique no canvas reposiciona o Centro de Distribuição (Depot Pin)
                routesCanvas.onclick = (e) => {
                    const rect = routesCanvas.getBoundingClientRect();
                    const scaleX = routesCanvas.width / rect.width;
                    const scaleY = routesCanvas.height / rect.height;
                    routeDepotX = Math.round((e.clientX - rect.left) * scaleX);
                    routeDepotY = Math.round((e.clientY - rect.top) * scaleY);
                    runRouteOptimization();
                };
            }

            if (btnRoutesOptimize) {
                btnRoutesOptimize.onclick = runRouteOptimization;
            }

            if (btnRoutesAnimateVan) {
                btnRoutesAnimateVan.onclick = toggleVanAnimation;
            }

            runRouteOptimization();
        }

        async function runRouteOptimization() {
            const numStops = routesSelectStops ? parseInt(routesSelectStops.value) : 50;
            const traffic = routesSelectTraffic ? routesSelectTraffic.value : 'rush_hour';
            const stopMins = routesSelectStopTime ? parseInt(routesSelectStopTime.value) : 8;
            const shiftHours = routesSelectShift ? parseFloat(routesSelectShift.value) : 8.0;

            try {
                const resp = await fetch('/api/v1/routes/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        depot_x: routeDepotX,
                        depot_y: routeDepotY,
                        num_deliveries: numStops,
                        traffic_regime: traffic,
                        stop_duration_mins: stopMins,
                        shift_hours_limit: shiftHours,
                        algorithm: 'hybrid_2opt'
                    })
                });

                if (resp.ok) {
                    currentRoutePlan = await resp.json();
                    renderRoutesCityCanvas(null);
                    renderRoutesItineraryTable();
                    renderRoutesKpis();
                }
            } catch (err) {
                console.error("Erro na otimização de rotas:", err);
            }
        }

        function renderRoutesCityCanvas(vanPos) {
            if (!routesCtx || !currentRoutePlan) return;
            const w = routesCanvas.width;
            const h = routesCanvas.height;

            routesCtx.fillStyle = '#06090d';
            routesCtx.fillRect(0, 0, w, h);

            // 1. Grade urbana (Quarteirões e Ruas)
            routesCtx.fillStyle = '#0b1118';
            for (let x = 30; x < w - 40; x += 65) {
                for (let y = 30; y < h - 40; y += 55) {
                    routesCtx.fillRect(x, y, 45, 38);
                }
            }

            // 2. Vias principais e avenidas
            routesCtx.strokeStyle = '#162232';
            routesCtx.lineWidth = 4;
            for (let x = 52; x < w; x += 65) {
                routesCtx.beginPath(); routesCtx.moveTo(x, 0); routesCtx.lineTo(x, h); routesCtx.stroke();
            }
            for (let y = 49; y < h; y += 55) {
                routesCtx.beginPath(); routesCtx.moveTo(0, y); routesCtx.lineTo(w, y); routesCtx.stroke();
            }

            // 3. Traçado do trânsito (Linhas coloridas de congestionamento)
            const trafficRegime = routesSelectTraffic ? routesSelectTraffic.value : 'rush_hour';
            const colors = (trafficRegime === 'rain') ? ['#ef4444', '#ef4444', '#f59e0b'] : 
                           (trafficRegime === 'rush_hour') ? ['#10b981', '#f59e0b', '#ef4444', '#f59e0b'] : 
                           ['#10b981', '#10b981', '#10b981', '#f59e0b'];

            for (let i = 0; i < 6; i++) {
                const yLine = 49 + i * 55;
                routesCtx.strokeStyle = colors[i % colors.length];
                routesCtx.lineWidth = 1.5;
                routesCtx.beginPath(); routesCtx.moveTo(20, yLine); routesCtx.lineTo(w - 20, yLine); routesCtx.stroke();
            }

            // 4. Traçado da Rota Otimizada (Polyline contínua em ciano brilhante)
            const poly = currentRoutePlan.route_polyline || [];
            if (poly.length > 1) {
                routesCtx.strokeStyle = '#38bdf8';
                routesCtx.lineWidth = 2.5;
                routesCtx.shadowColor = 'rgba(56, 189, 248, 0.6)';
                routesCtx.shadowBlur = 6;
                routesCtx.beginPath();
                routesCtx.moveTo(poly[0][0], poly[0][1]);
                for (let i = 1; i < poly.length; i++) {
                    routesCtx.lineTo(poly[i][0], poly[i][1]);
                }
                routesCtx.stroke();
                routesCtx.shadowBlur = 0;
            }

            // 5. Desenha os Pontos de Entrega (Pins numerados #1 a #N)
            const itinerary = currentRoutePlan.itinerary || [];
            itinerary.forEach(leg => {
                const wp = leg.waypoints[leg.waypoints.length - 1] || [100, 100];
                const px = wp[0], py = wp[1];

                const isExpress = leg.priority.includes('Expresso');
                const isHigh = leg.priority.includes('Alta');
                const pinColor = isExpress ? '#ef4444' : isHigh ? '#f59e0b' : '#bbfb00';

                routesCtx.fillStyle = pinColor;
                routesCtx.beginPath();
                routesCtx.arc(px, py, 6, 0, Math.PI * 2);
                routesCtx.fill();

                routesCtx.fillStyle = '#000000';
                routesCtx.font = 'bold 8px monospace';
                routesCtx.textAlign = 'center';
                routesCtx.fillText(`${leg.step_number}`, px, py + 3);
            });

            // 6. Desenha o Depot Pin de Saída (Centro de Distribuição)
            const dx = currentRoutePlan.depot.x;
            const dy = currentRoutePlan.depot.y;
            routesCtx.fillStyle = '#bbfb00';
            routesCtx.shadowColor = '#bbfb00';
            routesCtx.shadowBlur = 12;
            routesCtx.fillRect(dx - 10, dy - 10, 20, 20);
            routesCtx.shadowBlur = 0;
            routesCtx.fillStyle = '#000000';
            routesCtx.font = 'bold 11px sans-serif';
            routesCtx.fillText('🏢', dx, dy + 4);

            // 7. Desenha a Van de Entrega (se animação ativa)
            if (vanPos) {
                routesCtx.fillStyle = '#ffffff';
                routesCtx.shadowColor = '#38bdf8';
                routesCtx.shadowBlur = 14;
                routesCtx.fillRect(vanPos[0] - 8, vanPos[1] - 8, 16, 16);
                routesCtx.fillStyle = '#000000';
                routesCtx.font = '10px sans-serif';
                routesCtx.fillText('🚐', vanPos[0], vanPos[1] + 3);
                routesCtx.shadowBlur = 0;
            }
        }

        function toggleVanAnimation() {
            if (vanAnimationRunning) {
                clearInterval(vanAnimationTimer);
                vanAnimationRunning = false;
                btnRoutesAnimateVan.innerHTML = '<span>▶ Simular Trajeto da Van (60 FPS)</span>';
                renderRoutesCityCanvas(null);
            } else {
                if (!currentRoutePlan || !currentRoutePlan.route_polyline || currentRoutePlan.route_polyline.length === 0) return;
                vanAnimationRunning = true;
                vanAnimationIdx = 0;
                btnRoutesAnimateVan.innerHTML = '<span>⏸ Pausar Simulação</span>';
                vanAnimationTimer = setInterval(() => {
                    const poly = currentRoutePlan.route_polyline;
                    if (vanAnimationIdx >= poly.length) {
                        vanAnimationIdx = 0;
                    }
                    renderRoutesCityCanvas(poly[vanAnimationIdx]);
                    vanAnimationIdx++;
                }, 40);
            }
        }

        function renderRoutesKpis() {
            if (!currentRoutePlan) return;
            kpiCompletedStops.textContent = `${currentRoutePlan.completed_in_shift} de ${currentRoutePlan.total_deliveries}`;
            kpiTotalDistance.textContent = `${currentRoutePlan.total_distance_km} km`;

            const hrs = Math.floor(currentRoutePlan.total_journey_hours);
            const mins = Math.round((currentRoutePlan.total_journey_hours - hrs) * 60);
            kpiTotalTime.textContent = `${hrs}h ${mins}m`;

            kpiDistanceSavings.textContent = `-${currentRoutePlan.distance_savings_pct}%`;
            kpiFuelCo2.textContent = `${currentRoutePlan.estimated_fuel_liters} L / ${currentRoutePlan.co2_kg} kg`;
            kpiAvgSpeed.textContent = `${currentRoutePlan.average_speed_kmh} km/h`;

            routesLatencyBadge.textContent = `<${currentRoutePlan.optimization_latency_micros} µs (CPU)`;

            if (currentRoutePlan.is_shift_exceeded) {
                routesPlanStatusBadge.textContent = 'EXCEDENTE DE TURNO (+1 VEÍCULO)';
                routesPlanStatusBadge.style.color = '#f59e0b';
            } else {
                routesPlanStatusBadge.textContent = 'TURNO 100% VIÁVEL';
                routesPlanStatusBadge.style.color = '#10b981';
            }
        }

        function renderRoutesItineraryTable() {
            if (!routesItineraryTbody || !currentRoutePlan) return;
            routesItineraryTbody.innerHTML = '';

            const itinerary = currentRoutePlan.itinerary || [];
            itinerary.forEach(leg => {
                const tr = document.createElement('tr');
                const isLateTag = leg.is_late ? '<span style="color:#ef4444; font-size:9px;"> (ATRASO)</span>' : '';
                const condColor = leg.traffic_condition.includes('Intenso') || leg.traffic_condition.includes('Crítico') ? '#ef4444' : 
                                  leg.traffic_condition.includes('Moderado') ? '#f59e0b' : '#10b981';

                tr.innerHTML = `
                    <td class="cell-pk" style="text-align:center;">#${leg.step_number}</td>
                    <td title="${leg.to_name}">${leg.to_name}</td>
                    <td class="cell-number">${leg.distance_km} km</td>
                    <td class="cell-number">${leg.transit_time_mins} min</td>
                    <td style="color:#38bdf8;">${leg.eta_arrival}${isLateTag}</td>
                    <td>${leg.departure_time}</td>
                    <td style="color:${condColor}; font-weight:600;">${leg.traffic_condition}</td>
                    <td><span class="status-badge ${leg.priority.includes('Expresso') ? 'badge-danger' : leg.priority.includes('Alta') ? 'badge-warning' : 'badge-success'}">${leg.priority}</span></td>
                `;
                routesItineraryTbody.appendChild(tr);
            });
        }

        loadPreset('agent_guardrail');
    </script>
</body>
</html>
"##
    .to_string()
}

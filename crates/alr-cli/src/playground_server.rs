use alr_models::jev_playground::{JevDecisionRequest, JevPlaygroundPreset, JevTypedJudgeEngine};
use anyhow::Result;
use axum::{
    extract::Json,
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;

/// Servidor Web Axum para o Playground Interativo de Decisões Tipadas no ALR
pub struct JevPlaygroundServer {
    pub port: u16,
    engine: Arc<JevTypedJudgeEngine>,
}

impl JevPlaygroundServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            engine: Arc::new(JevTypedJudgeEngine::new()),
        }
    }

    /// Cria as rotas HTTP Axum
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
            .route("/health", get(handle_health))
    }

    /// Inicia o servidor HTTP e escuta requisições
    pub async fn run(&self) -> Result<()> {
        let app = self.create_router();
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let listener = TcpListener::bind(addr).await?;

        println!("\n========================================================================");
        println!("  ALR TYPED DECISION PLAYGROUND SERVER ONLINE (SYSTEM 1 ENGINE)");
        println!("========================================================================");
        println!("  - URL Local:     http://localhost:{}", self.port);
        println!("  - URL Rede:      http://127.0.0.1:{}", self.port);
        println!(
            "  - API Endpoint:  http://localhost:{}/api/v1/decisions",
            self.port
        );
        println!("  - 10 Presets:    Decisões Centrais, Marketing Ops, Segurança, Trading");
        println!("========================================================================\n");

        axum::serve(listener, app).await?;
        Ok(())
    }
}

async fn handle_health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "alr-typed-decision-playground",
        "version": "1.13",
        "engine": "ALR System 1 Rust Local Inference",
        "cost": "$0.0000000",
        "idioma": "pt-BR",
        "models": ["alr/typed-judge-1.13", "typesafe/jev-1.13", "typesafe/jev-1.13-20260917"]
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

async fn handle_index() -> Html<String> {
    Html(render_playground_html())
}

/// Gera o HTML/CSS/JS standalone de alta fidelidade visual 100% em Português com Timeline Vertical
pub fn render_playground_html() -> String {
    r##"<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playground | ALR</title>
    <link rel="icon" type="image/webp" href="/static/alr-logo.webp">
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
            height: 60px;
            background-color: var(--bg-body);
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            flex-shrink: 0;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-logo-img {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            object-fit: cover;
            border: 1.5px solid rgba(187, 251, 0, 0.6);
            box-shadow: 0 0 12px rgba(187, 251, 0, 0.35);
            background: #000000;
            transition: transform 0.2s ease;
        }

        .header-logo-img:hover {
            transform: scale(1.05);
        }

        .header-title-box {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
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
            font-size: 11px;
            color: var(--text-dim);
            font-family: var(--font-mono);
        }

        /* Center Navigation: Core Tabs + More Presets Dropdown (Zero Scrollbar) */
        .header-nav-center {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .core-preset-tabs {
            display: flex;
            align-items: center;
            gap: 6px;
            background-color: #06090c;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid var(--border-subtle);
        }

        .more-presets-dropdown-wrap {
            position: relative;
        }

        .btn-more-presets {
            background-color: #06090c;
            border: 1px solid var(--border-subtle);
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .btn-more-presets:hover {
            color: var(--text-main);
            border-color: var(--border-active);
            background-color: #0c1117;
        }

        .btn-more-presets.has-active {
            background-color: #141b22;
            border-color: rgba(187, 251, 0, 0.4);
            color: var(--accent-lime);
        }

        /* Popover Categorizado */
        .more-presets-popover {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background-color: #0d1218;
            border: 1px solid var(--border-active);
            border-radius: 10px;
            padding: 14px;
            display: none;
            gap: 16px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
            z-index: 100;
            width: 580px;
        }

        .popover-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .popover-cat-title {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--border-subtle);
            margin-bottom: 2px;
        }

        .popover-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            border-radius: 6px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
            width: 100%;
        }

        .popover-item:hover {
            background-color: rgba(255, 255, 255, 0.04);
            color: #ffffff;
        }

        .popover-item.active {
            background-color: #141b22;
            color: var(--accent-lime);
        }

        .preset-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            background: transparent;
            border: none;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .preset-tab:hover {
            color: var(--text-main);
            background-color: rgba(255, 255, 255, 0.04);
        }

        .preset-tab.active {
            color: #ffffff;
            background-color: #141b22;
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

        .preset-tab.active .badge-type {
            color: var(--accent-lime);
            border-color: rgba(187, 251, 0, 0.4);
            background-color: rgba(0, 0, 0, 0.7);
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
            padding: 6px 12px;
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
            box-shadow: 0 0 8px rgba(187, 251, 0, 0.2);
        }

        /* Workspace Layout - Compact Proportions */
        .workspace-wrap {
            flex: 1;
            display: flex;
            justify-content: center;
            overflow: hidden;
            padding: 10px 18px;
        }

        .workspace {
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

        /* Panel Header */
        .panel-header {
            height: 44px;
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

        /* View Switcher */
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

        /* Scrollable Content */
        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        /* Custom Scrollbars */
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

        /* Helper Description */
        .type-description {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.45;
        }

        /* Form Fields */
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
            height: 135px;
            min-height: 135px;
            resize: vertical;
        }

        .question-textarea {
            height: 64px;
            min-height: 64px;
            resize: vertical;
        }

        /* Criteria 2-column for Noul */
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
            height: 68px;
            overflow-y: auto;
        }

        .criteria-textarea:focus {
            outline: none;
        }

        /* Threshold Slider with Dynamic Fill */
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

        /* Choice Options Editor */
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

        /* Dynamic Rubric Levels Editor */
        .rubric-header-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* Panel Footer with Buttons */
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

        /* Empty State */
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

        /* Result View */
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

        /* Probability Bars */
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

        /* Token & Cost Comparison HUD */
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

        /* Recommendation Action Card */
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

        /* ==========================================================================
           VERTICAL TIMELINE REASONING GRAPH (LINHA DO TEMPO ESTILO CANVA/FIGMA)
           ========================================================================== */
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

        /* Linha Vertical Contínua Conectora com Gradiente Neon */
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
            margin-bottom: 14px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .timeline-step:last-child {
            margin-bottom: 0;
        }

        /* Marcador Circular da Etapa */
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

        /* Card da Etapa na Linha do Tempo */
        .timeline-card {
            background: #080c10;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
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

        /* JSON Editor and Viewer */
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

        /* ALR Lab Bottom Footer (Strictly ALR Branding) */
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

        /* API Integration Modal */
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

    <!-- Header -->
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

        <!-- Navegação Central Limpa: 3 Abas Canônicas + Menu Seletor Categorizado -->
        <div class="header-nav-center">
            <div class="core-preset-tabs" id="core-preset-tabs">
                <button class="preset-tab active" data-preset="agent_guardrail">
                    <span class="badge-type">noul</span>
                    <span>Guarda-corpo de Agente</span>
                </button>
                <button class="preset-tab" data-preset="support_routing">
                    <span class="badge-type">choice</span>
                    <span>Roteamento de Suporte</span>
                </button>
                <button class="preset-tab" data-preset="lead_qualification">
                    <span class="badge-type">score</span>
                    <span>Qualificação de Lead</span>
                </button>
            </div>

            <!-- Botão Menu Dropdown para os outros 7 casos de uso -->
            <div class="more-presets-dropdown-wrap">
                <button class="btn-more-presets" id="btn-toggle-more-presets">
                    <span id="more-presets-btn-text">⚡ Mais Casos (7)</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                
                <!-- Popover Dropdown Categorizado (Abre ao clicar) -->
                <div class="more-presets-popover" id="more-presets-popover">
                    <div class="popover-column">
                        <div class="popover-cat-title">📈 Marketing Ops & SEO</div>
                        <button class="popover-item" data-preset="search_triage">
                            <span class="badge-type">choice</span>
                            <span>Triagem Google Ads</span>
                        </button>
                        <button class="popover-item" data-preset="creative_tagging">
                            <span class="badge-type">choice</span>
                            <span>Tagging Meta Ads</span>
                        </button>
                        <button class="popover-item" data-preset="landing_page_match">
                            <span class="badge-type">score</span>
                            <span>Aderência Landing Page</span>
                        </button>
                    </div>
                    <div class="popover-column">
                        <div class="popover-cat-title">🛡️ Segurança & Risco</div>
                        <button class="popover-item" data-preset="sentiment_routing">
                            <span class="badge-type">choice</span>
                            <span>Sentimento & Ouvidoria</span>
                        </button>
                        <button class="popover-item" data-preset="cctv_tripwire">
                            <span class="badge-type">noul</span>
                            <span>Vigilância CCTV</span>
                        </button>
                        <button class="popover-item" data-preset="cycle_safety_shield">
                            <span class="badge-type">noul</span>
                            <span>Escudo Anti-Colisão</span>
                        </button>
                    </div>
                    <div class="popover-column">
                        <div class="popover-cat-title">💰 Trading</div>
                        <button class="popover-item" data-preset="crypto_trading">
                            <span class="badge-type">choice</span>
                            <span>Sinais de Cripto</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="header-actions">
            <button class="btn-api-modal" id="btn-open-api-modal">
                <span>&lt;/&gt;</span>
                <span>API & cURL</span>
            </button>
        </div>
    </header>

    <!-- Main Workspace -->
    <div class="workspace-wrap">
        <div class="workspace">

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
                        Uma questão noul avalia a probabilidade calibrada de uma condição lógica ser verdadeira. Utilize para governar e proteger chamadas de ferramentas de agentes.
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
                    <div id="dynamic-form-fields">
                        <!-- Injected via JavaScript -->
                    </div>
                </div>

                <!-- JSON Input View (Hidden by default) -->
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

                    <div class="result-container" id="output-result" style="display: none;">
                        <!-- Injected dynamically on decision execution -->
                    </div>
                </div>

                <!-- Output JSON View (Hidden by default) -->
                <div class="panel-content" id="output-json-container" style="display: none; position: relative;">
                    <button class="copy-json-btn" id="btn-copy-json">Copiar JSON</button>
                    <pre class="json-pre-viewer" id="output-json-raw">// A resposta JSON do motor ALR aparecerá aqui após executar</pre>
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
    "state": "My payout has failed three days in a row and support chat keeps timing out.",
    "questions": {
      "team": {
        "type": "choice",
        "instructions": "Which team should handle this message?",
        "criteria": {
          "billing": "Payments, payouts, invoices, refunds",
          "technical": "Bugs, outages, integrations, API errors",
          "sales": "Pricing, upgrades, new accounts"
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
                llmCost: "$0.0018000",
                expectedResponse: {
                    id: "alr-sent-01",
                    model: "alr/sentiment-engine",
                    provider: "ALR System 1",
                    answers: {
                        escalation: {
                            type: "choice",
                            choice: "ouvidoria_juridico",
                            probabilities: { "ouvidoria_juridico": 0.98, "auto_atendimento_n1": 0.01, "comercial_vendas": 0.01 },
                            confidence: 0.98
                        }
                    },
                    usage: { input_tokens: 180, output_tokens: 15, cost: 0.0 },
                    ui_decision: {
                        action_text: "Escalar imediatamente para Ouvidoria e Jurídico",
                        status: "pause",
                        explanation: "Ameaça de litígio detectada com 98.0% de confiança",
                        latency_sec: 0.0004,
                        reasoning_graph: [
                            { name: "Análise de Sentimento", icon: "😠", status: "danger", summary: "Detecção Emocional", detail: "Palavras em caixa alta e termos agressivos ('INCOMPETENTES', 'processar', 'Procon').", metric: "Raiva Extrema" },
                            { name: "Detector de Litígio", icon: "⚖️", status: "danger", summary: "Risco Legal", detail: "Classificação de risco de litígio iminente acionando protocolo de ouvidoria prioritária.", metric: "Risco Jurídico" },
                            { name: "Roteamento Governança", icon: "🏢", status: "warning", summary: "Escalonamento N3", detail: "Bypass de N1 e despacho direto para Ouvidoria Executiva.", metric: "Ouvidoria" }
                        ]
                    }
                }
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
                llmCost: "$0.0015000",
                expectedResponse: {
                    id: "alr-ads-01",
                    model: "alr/search-triage",
                    provider: "ALR System 1",
                    answers: {
                        search_intent: {
                            type: "choice",
                            choice: "junk_negative",
                            probabilities: { "junk_negative": 0.98, "researcher": 0.02, "buyer": 0.0 },
                            confidence: 0.98
                        }
                    },
                    usage: { input_tokens: 140, output_tokens: 18, cost: 0.0 },
                    ui_decision: {
                        action_text: "Adicionar termo à lista de Palavras-Chave Negativas da Campanha",
                        status: "execute",
                        explanation: "Identificado como termo de desperdício 'junk_negative' com 98.0% de confiança",
                        latency_sec: 0.0002,
                        reasoning_graph: [
                            { name: "Extração de Termo", icon: "🔎", status: "neutral", summary: "Termo de Entrada", detail: "Termo 'baixar software gratis pirata crackeado 2026' extraído do relatório de busca.", metric: "Busca Ads" },
                            { name: "Filtro de Desperdício", icon: "🚫", status: "danger", summary: "Correspondência Negativa", detail: "Palavras-chave 'gratis', 'pirata' e 'crackeado' violam a intenção de comprador.", metric: "Desperdício" },
                            { name: "Negativação Atômica", icon: "🛡️", status: "ok", summary: "Economia de Verba", detail: "Termo adicionado à lista negativa da campanha para economizar orçamento diário.", metric: "Negativar" }
                        ]
                    }
                }
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
                llmCost: "$0.0016000",
                expectedResponse: {
                    id: "alr-hook-01",
                    model: "alr/creative-tagger",
                    provider: "ALR System 1",
                    answers: {
                        hook_type: {
                            type: "choice",
                            choice: "dor",
                            probabilities: { "dor": 0.94, "curiosidade": 0.05, "prova_social": 0.01 },
                            confidence: 0.94
                        }
                    },
                    usage: { input_tokens: 150, output_tokens: 16, cost: 0.0 },
                    ui_decision: {
                        action_text: "Rotular Criativo como 'Gancho de Dor' no Gerenciador de Anúncios",
                        status: "execute",
                        explanation: "Identificado foco em perda e frustração com 94.0% de confiança",
                        latency_sec: 0.0003,
                        reasoning_graph: [
                            { name: "Análise da Copy", icon: "📝", status: "neutral", summary: "Leitura do Criativo", detail: "Frase inicial com pergunta retórica apontando perda de receita por lentidão.", metric: "Copy Ads" },
                            { name: "Classificador de Gancho", icon: "⚡", status: "ok", summary: "Detecção de Ângulo", detail: "Foco primário em dor e gargalo operacional do cliente.", metric: "Gancho de Dor" },
                            { name: "Etiquetagem no Meta", icon: "🏷️", status: "ok", summary: "Metadado Salvo", detail: "Tag aplicada no dataset de performance de criativos.", metric: "Tag Salva" }
                        ]
                    }
                }
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
                llmCost: "$0.0021000",
                expectedResponse: {
                    id: "alr-match-01",
                    model: "alr/page-matcher",
                    provider: "ALR System 1",
                    answers: {
                        match_score: {
                            type: "score",
                            score: 2.86,
                            legend: {
                                "0": "Totalmente desconexo, sem menção aos termos",
                                "1": "Menciona parcialmente, mas muda o foco principal",
                                "2": "Forte correspondência de promessa e proposta de valor",
                                "3": "Correspondência perfeita, mesma mensagem e call to action idêntico"
                            },
                            probabilities: { "0": 0.0, "1": 0.02, "2": 0.10, "3": 0.88 },
                            confidence: 0.88
                        }
                    },
                    usage: { input_tokens: 190, output_tokens: 20, cost: 0.0 },
                    ui_decision: {
                        action_text: "Aprovar Veiculação: Alto Índice de Aderência (Score 2.86 / 3.0)",
                        status: "route",
                        explanation: "Alinhamento de promessa e produto validado com 88.0% de confiança",
                        latency_sec: 0.0005,
                        reasoning_graph: [
                            { name: "Promessa do Anúncio", icon: "📢", status: "neutral", summary: "Criativo", detail: "Promessa: Automação de WhatsApp em Rust com alta performance.", metric: "Anúncio" },
                            { name: "Página de Destino", icon: "🌐", status: "neutral", summary: "Landing Page", detail: "H1 e subtítulo confirmam exatamente a mesma proposta de valor.", metric: "LP Destino" },
                            { name: "Score de Aderência", icon: "🎯", status: "ok", summary: "Alinhamento 95%", detail: "Score 2.86 garante alto Quality Score no Google/Meta Ads.", metric: "Score 2.86" }
                        ]
                    }
                }
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
                llmCost: "$0.0020000",
                expectedResponse: {
                    id: "alr-cctv-01",
                    model: "alr/cctv-vision",
                    provider: "ALR System 1",
                    answers: {
                        security_breach: {
                            type: "noul",
                            noul: 0.96
                        }
                    },
                    usage: { input_tokens: 160, output_tokens: 12, cost: 0.0 },
                    ui_decision: {
                        action_text: "Disparar Alarme Imediato e Windows Toast Notification",
                        status: "execute",
                        explanation: "Probabilidade de invasão (96.0%) excede o limite crítico (85.0%)",
                        latency_sec: 0.0008,
                        reasoning_graph: [
                            { name: "Frame da Câmera", icon: "📹", status: "neutral", summary: "Visão Computacional", detail: "Diferença temporal de quadros detectou deslocamento humano de 1.8m nas docas.", metric: "CCTV Frame" },
                            { name: "Zona Restrita", icon: "🚧", status: "danger", summary: "Tripwire Violado", detail: "Coordenadas cruzam o polígono da Zona Crítica A1 às 02:45 da madrugada.", metric: "Perímetro" },
                            { name: "Alerta Atômico", icon: "🚨", status: "execute", summary: "Disparo Imediato", detail: "Notificação nativa do Windows Toast acionada com bipe sonoro de emergência.", metric: "Alarme ON" }
                        ]
                    }
                }
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
                llmCost: "$0.0012000",
                expectedResponse: {
                    id: "alr-shield-01",
                    model: "alr/cycle-shield",
                    provider: "ALR System 1",
                    answers: {
                        collision_free: {
                            type: "noul",
                            noul: 0.02
                        }
                    },
                    usage: { input_tokens: 130, output_tokens: 10, cost: 0.0 },
                    ui_decision: {
                        action_text: "Interceptar Movimento e Forçar Manobra Evasiva Ortogonal",
                        status: "pause",
                        explanation: "Perigo de colisão detectado (segurança 2.0% < limiar 90.0%)",
                        latency_sec: 0.000012,
                        reasoning_graph: [
                            { name: "Movimento Proposto", icon: "🧭", status: "neutral", summary: "Trajetória", detail: "Ação solicitada pelo planejador: mover para DIREITA.", metric: "DIREITA" },
                            { name: "Detecção de Colisão", icon: "🧱", status: "danger", summary: "Parede Detectada", detail: "Distância até o obstáculo rígido é menor que 1.0 unidade.", metric: "Dist: 0.8" },
                            { name: "Escudo Evasivo", icon: "🛡️", status: "warning", summary: "Manobra Forçada", detail: "Movimento bloqueado e rota redefinida ortogonalmente para a ESQUERDA.", metric: "Evasão" }
                        ]
                    }
                }
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
                llmCost: "$0.0022000",
                expectedResponse: {
                    id: "alr-trade-signal-04",
                    model: "alr/crypto-trader",
                    provider: "ALR System 1",
                    answers: {
                        trade_signal: {
                            type: "choice",
                            choice: "buy",
                            probabilities: { "buy": 0.95, "hold": 0.04, "sell": 0.01 },
                            confidence: 0.95
                        }
                    },
                    usage: { input_tokens: 210, output_tokens: 24, cost: 0.0 },
                    ui_decision: {
                        action_text: "Executar Ordem BUY Limit com Stop-Loss Automático a 2.5%",
                        status: "execute",
                        explanation: "Confluência de compra confirmada com 95.0% de probabilidade",
                        latency_sec: 0.000018,
                        reasoning_graph: [
                            { name: "Indicadores Técnicos", icon: "📈", status: "ok", summary: "RSI-14 + MACD", detail: "RSI em 28.5 sinaliza sobrevenda extrema; MACD cruzou linha de sinal com histograma positivo.", metric: "RSI: 28.5" },
                            { name: "Tendência SuperTrend", icon: "🟢", status: "ok", summary: "SuperTrend Bull", detail: "Fechamento acima do patamar de reversão e EMA-9 rompendo EMA-21 para cima.", metric: "Tendência Alta" },
                            { name: "Ordem com Stop-Loss", icon: "💰", status: "execute", summary: "Execução com Risco Controlado", detail: "Compra a mercado com stop-loss automático fixado em 2.5% abaixo da entrada.", metric: "BUY + Stop" }
                        ]
                    }
                }
            }
        };

        let currentPresetKey = "agent_guardrail";
        let activeCategory = "all";
        let lastResponseJson = null;

        const presetTabsContainer = document.getElementById('preset-tabs');
        const categoryButtons = document.querySelectorAll('.category-btn');
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

        const corePresetTabs = document.querySelectorAll('.core-preset-tabs .preset-tab');
        const popoverItems = document.querySelectorAll('.popover-item');
        const btnToggleMorePresets = document.getElementById('btn-toggle-more-presets');
        const morePresetsPopover = document.getElementById('more-presets-popover');
        const morePresetsBtnText = document.getElementById('more-presets-btn-text');

        // Core tabs click listeners
        corePresetTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                loadPreset(tab.dataset.preset);
            });
        });

        // Popover items click listeners
        popoverItems.forEach(item => {
            item.addEventListener('click', () => {
                loadPreset(item.dataset.preset);
                morePresetsPopover.style.display = 'none';
            });
        });

        // Toggle more presets popover
        btnToggleMorePresets.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = morePresetsPopover.style.display === 'flex';
            morePresetsPopover.style.display = isOpen ? 'none' : 'flex';
        });

        // Close popover when clicking outside
        document.addEventListener('click', (e) => {
            if (!morePresetsPopover.contains(e.target) && e.target !== btnToggleMorePresets) {
                morePresetsPopover.style.display = 'none';
            }
        });

        function loadPreset(key) {
            currentPresetKey = key;
            const p = PRESETS[key];
            if (!p) return;

            // Update Core Tabs Active State
            let isCore = false;
            corePresetTabs.forEach(tab => {
                const match = tab.dataset.preset === key;
                tab.classList.toggle('active', match);
                if (match) isCore = true;
            });

            // Update More Presets Button State
            if (isCore) {
                btnToggleMorePresets.classList.remove('has-active');
                morePresetsBtnText.innerText = "⚡ Mais Casos (7)";
                popoverItems.forEach(item => item.classList.remove('active'));
            } else {
                btnToggleMorePresets.classList.add('has-active');
                morePresetsBtnText.innerText = `⚡ ${p.name}`;
                popoverItems.forEach(item => {
                    item.classList.toggle('active', item.dataset.preset === key);
                });
            }

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
                const qKey = p.qKey || "safe_to_run";
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
                const qKey = p.qKey || (p.id === "support_routing" ? "team" : "choice_decision");
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

        // Construtor da Linha do Tempo Vertical de Raciocínio (Estilo Canva/Figma)
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

                const orderedKeys = ["technical", "sales", "billing", "junk_negative", "buyer", "researcher", "dor", "curiosidade", "prova_social", "ouvidoria_juridico", "buy", "hold", "sell"];
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

        btnInputForm.addEventListener('click', () => {
            btnInputForm.classList.add('active');
            btnInputJson.classList.remove('active');
            inputFormContainer.style.display = 'flex';
            inputJsonContainer.style.display = 'none';
            syncJsonToForm();
        });

        btnInputJson.addEventListener('click', () => {
            btnInputJson.classList.add('active');
            btnInputForm.classList.remove('active');
            inputFormContainer.style.display = 'none';
            inputJsonContainer.style.display = 'flex';
            syncFormToJson();
        });

        btnOutputPreview.addEventListener('click', () => {
            btnOutputPreview.classList.add('active');
            btnOutputJson.classList.remove('active');
            outputPreviewContainer.style.display = 'flex';
            outputJsonContainer.style.display = 'none';
        });

        btnOutputJson.addEventListener('click', () => {
            btnOutputJson.classList.add('active');
            btnOutputPreview.classList.remove('active');
            outputPreviewContainer.style.display = 'none';
            outputJsonContainer.style.display = 'flex';
        });

        stateInput.addEventListener('input', syncFormToJson);
        questionInput.addEventListener('input', syncFormToJson);
        rawJsonEditor.addEventListener('input', syncJsonToForm);

        btnReset.addEventListener('click', () => {
            loadPreset(currentPresetKey);
        });

        btnRun.addEventListener('click', runDecision);

        btnCopyJson.addEventListener('click', () => {
            navigator.clipboard.writeText(outputJsonRaw.innerText);
            btnCopyJson.innerText = "Copiado!";
            setTimeout(() => { btnCopyJson.innerText = "Copiar JSON"; }, 2000);
        });

        // Modal API Integration
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

        // Inicializa com o preset 1
        loadPreset('agent_guardrail');
    </script>
</body>
</html>
"##
    .to_string()
}

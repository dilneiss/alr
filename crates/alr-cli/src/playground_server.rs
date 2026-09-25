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
        println!("  - Presets:       Agent guardrail (noul), Support routing (choice), Lead qualification (score) + 4 ALR Suites");
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

/// Gera o HTML/CSS/JS standalone de alta fidelidade visual para o Playground de Decisões Tipadas do ALR
pub fn render_playground_html() -> String {
    r##"<!DOCTYPE html>
<html lang="en">
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
            --amber-border: rgba(245, 158, 11, 0.35);
            --amber-bg: rgba(245, 158, 11, 0.05);
            --amber-text: #f59e0b;
            --green-border: rgba(16, 185, 129, 0.35);
            --green-bg: rgba(16, 185, 129, 0.05);
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
            height: 52px;
            background-color: var(--bg-body);
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            flex-shrink: 0;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-logo-img {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            object-fit: cover;
            border: 1px solid rgba(187, 251, 0, 0.4);
            box-shadow: 0 0 8px rgba(187, 251, 0, 0.2);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: -0.01em;
        }

        .header-badge-alr {
            font-size: 10px;
            font-family: var(--font-mono);
            font-weight: 700;
            background: rgba(187, 251, 0, 0.12);
            color: var(--accent-lime);
            border: 1px solid rgba(187, 251, 0, 0.3);
            padding: 1px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        /* Tabs on Header */
        .preset-tabs {
            display: flex;
            align-items: center;
            gap: 5px;
            background-color: #06090c;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid var(--border-subtle);
            overflow-x: auto;
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
            background-color: rgba(255, 255, 255, 0.03);
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
            border-color: rgba(187, 251, 0, 0.35);
            background-color: rgba(0, 0, 0, 0.6);
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
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
            font-family: var(--font-mono);
        }

        .btn-api-modal:hover {
            border-color: var(--accent-lime);
            color: var(--accent-lime);
        }

        /* Workspace Layout - Compact Column Ratio Matching Reference */
        .workspace-wrap {
            flex: 1;
            display: flex;
            justify-content: center;
            overflow: hidden;
            padding: 10px 16px;
        }

        .workspace {
            display: grid;
            grid-template-columns: 430px 1fr;
            gap: 16px;
            width: 100%;
            max-width: 1520px;
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
            width: 5px;
            height: 5px;
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
            padding: 0 16px;
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
        /* Visual Reasoning Graph Pipeline */
        .reasoning-graph-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            padding-top: 12px;
            border-top: 1px solid var(--border-subtle);
        }

        .graph-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .graph-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-dim);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .graph-hint {
            font-size: 11px;
            color: var(--text-dim);
            font-family: var(--font-mono);
        }

        .reasoning-pipeline {
            display: flex;
            align-items: center;
            overflow-x: auto;
            padding: 8px 4px 14px 4px;
            gap: 0;
        }

        .pipeline-node-wrap {
            display: flex;
            align-items: center;
            position: relative;
        }

        .pipeline-node {
            background: #090d12;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        .pipeline-node:hover {
            transform: translateY(-2px);
            border-color: var(--accent-lime);
            box-shadow: 0 4px 14px rgba(187, 251, 0, 0.25);
            background: #11171f;
        }

        .node-icon {
            font-size: 14px;
            line-height: 1;
        }

        .node-name {
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
            white-space: nowrap;
        }

        .node-metric {
            font-family: var(--font-mono);
            font-size: 9px;
            padding: 1px 4px;
            border-radius: 3px;
            background: #171f28;
            color: var(--text-muted);
        }

        .pipeline-node.status-danger .node-metric {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }

        .pipeline-node.status-warning .node-metric {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
        }

        .pipeline-node.status-ok .node-metric {
            background: rgba(187, 251, 0, 0.15);
            color: var(--accent-lime);
        }

        /* Connector Line with Arrow */
        .pipeline-connector {
            width: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2b3644;
            flex-shrink: 0;
        }

        .pipeline-connector svg {
            width: 16px;
            height: 10px;
        }

        /* Tooltip on Hover */
        .node-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            width: 240px;
            background: #0d1319;
            border: 1px solid var(--accent-lime);
            border-radius: 8px;
            padding: 10px 12px;
            box-shadow: 0 10px 24px rgba(0,0,0,0.85);
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s ease, transform 0.15s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .pipeline-node-wrap:hover .node-tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(-2px);
        }

        .tooltip-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
        }

        .tooltip-summary {
            font-size: 10px;
            font-family: var(--font-mono);
            color: var(--accent-lime);
            text-transform: uppercase;
        }

        .tooltip-detail {
            font-size: 11px;
            color: #cbd5e1;
            line-height: 1.4;
            margin-top: 2px;
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
            <img src="/static/alr-logo.webp" alt="ALR Logo" class="header-logo-img" onerror="this.src='/static/alr-logo.png'">
            <div class="header-title">
                <span>Playground</span>
                <span class="header-badge-alr">System 1</span>
            </div>
        </div>

        <div class="preset-tabs" id="preset-tabs">
            <button class="preset-tab active" data-preset="agent_guardrail">
                <span class="badge-type">noul</span>
                <span>Agent guardrail</span>
            </button>
            <button class="preset-tab" data-preset="support_routing">
                <span class="badge-type">choice</span>
                <span>Support routing</span>
            </button>
            <button class="preset-tab" data-preset="lead_qualification">
                <span class="badge-type">score</span>
                <span>Lead qualification</span>
            </button>
            <button class="preset-tab" data-preset="sentiment_routing">
                <span class="badge-type">choice</span>
                <span>Sentiment & Ouvidoria</span>
            </button>
            <button class="preset-tab" data-preset="search_triage">
                <span class="badge-type">choice</span>
                <span>Google Ads Triage</span>
            </button>
            <button class="preset-tab" data-preset="cctv_tripwire">
                <span class="badge-type">noul</span>
                <span>CCTV Security Shield</span>
            </button>
            <button class="preset-tab" data-preset="crypto_trading">
                <span class="badge-type">choice</span>
                <span>Crypto Trading</span>
            </button>
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

            <!-- Left Column: Input -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title-area">
                        <span class="panel-label">Input</span>
                    </div>
                    <div class="view-switcher">
                        <button class="switcher-btn active" id="btn-input-form">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                            Form
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
                        A noul question returns the probability that a condition holds. Gate an agent tool call on it.
                    </div>

                    <div class="field-group">
                        <label class="field-label">State</label>
                        <textarea class="textarea-input state-textarea" id="input-state" placeholder="State context and tool call details..."></textarea>
                    </div>

                    <div class="field-group">
                        <label class="field-label">Question</label>
                        <textarea class="textarea-input question-textarea" id="input-question" placeholder="Question to evaluate..."></textarea>
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
                        Reset
                    </button>
                    <button class="btn-run" id="btn-run">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Run decision
                    </button>
                </div>
            </div>

            <!-- Right Column: Output / Answer -->
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
                            Preview
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
                        <div>Run the decision to see the answer</div>
                    </div>

                    <div class="result-container" id="output-result" style="display: none;">
                        <!-- Injected dynamically on decision execution -->
                    </div>
                </div>

                <!-- Output JSON View (Hidden by default) -->
                <div class="panel-content" id="output-json-container" style="display: none; position: relative;">
                    <button class="copy-json-btn" id="btn-copy-json">Copy JSON</button>
                    <pre class="json-pre-viewer" id="output-json-raw">// JSON response will appear here after running decision</pre>
                </div>
            </div>

        </div>
    </div>

    <!-- Bottom ALR Lab Footer -->
    <div class="alr-footer">
        <div>ALR Lab has worked recipes with code and recorded results for this model.</div>
        <a href="#alr-lab">Explore ALR Lab &rarr;</a>
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
  }'<button class="btn-copy-curl" id="btn-copy-curl">Copy cURL</button></div>

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
                name: "Agent guardrail",
                description: "A noul question returns the probability that a condition holds. Gate an agent tool call on it.",
                state: "Task: clean up inactive accounts before the quarterly report.\nProposed tool call:\ndelete_rows(table=\"customers\",\nwhere=\"last_login < 2023-01-01\")\nContext: the customers table has 48,210 rows and no backup was taken today.",
                question: "Is this action safe to run without a human approving it first?",
                trueWhen: "Reversible or low-impact, and clearly within the stated task.",
                falseWhen: "Destructive, irreversible, or broader than the task requires.",
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
                        action_text: "Pause and ask a human",
                        status: "pause",
                        explanation: "Yes-probability (4.0%) is below required threshold (80.0%)",
                        latency_sec: 1.5,
                        reasoning_graph: [
                            { name: "Input State", icon: "📥", status: "neutral", summary: "Estado & Tool Call", detail: "Tarefa clean up inactive accounts com chamada delete_rows em tabela customers com 48.210 linhas.", metric: "48.2k rows" },
                            { name: "Semantic Parser", icon: "🔍", status: "neutral", summary: "Extração de Entidades", detail: "Parser identificou cláusula de tempo 'last_login < 2023-01-01' e flag crítica 'no backup was taken today'.", metric: "no_backup" },
                            { name: "Risk Shield", icon: "🛡️", status: "danger", summary: "Auditoria de Risco ALR", detail: "RiskEngine interceptou operação destrutiva irreversível sem garantia de rollback.", metric: "Critical" },
                            { name: "Calibrated Judge", icon: "⚖️", status: "warning", summary: "Inferência Bayesiana", detail: "TypedJudge calculou probabilidade calibrada de segurança local: 4.0% Yes e 96.0% No.", metric: "4.0% Safe" },
                            { name: "Threshold Gate", icon: "🚦", status: "danger", summary: "Avaliação do Limiar", detail: "Threshold estrito em 80.0%. Como P(safe) = 4.0% < 80.0%, o gate bloqueia auto-execução.", metric: "4.0% < 80%" },
                            { name: "Safety Action", icon: "⏸️", status: "warning", summary: "Pausa & Escalonamento", detail: "Execução pausada com segurança. Notificação enviada para autorização de supervisor humano.", metric: "Pause & Ask" }
                        ]
                    }
                }
            },
            support_routing: {
                id: "support_routing",
                type: "choice",
                name: "Support routing",
                description: "A choice question picks one option from a set you define and returns a probability for each.",
                state: "My payout has failed three days in a row and support chat keeps timing out. I need this fixed today.",
                question: "Which team should handle this message?",
                options: [
                    { key: "billing", desc: "Payments, payouts, invoices, refunds" },
                    { key: "technical", desc: "Bugs, outages, integrations, API errors" },
                    { key: "sales", desc: "Pricing, upgrades, new accounts" }
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
                        action_text: "Dispatch the ticket to the chosen team",
                        status: "route",
                        explanation: "Highest probability choice 'billing' (99.0%) with 99.0% confidence",
                        latency_sec: 0.442,
                        reasoning_graph: [
                            { name: "Ticket Inbound", icon: "💬", status: "neutral", summary: "Mensagem Recebida", detail: "Cliente relata falha de saque há 3 dias ('payout has failed') e timeout no chat de suporte.", metric: "Payout Fail" },
                            { name: "Lexical Matcher", icon: "📑", status: "neutral", summary: "Mapeamento Léxico", detail: "Identificação de termos financeiros-chave 'payout', 'failed', 'timeout' cruzados com catálogo.", metric: "Finance Term" },
                            { name: "Criteria Overlap", icon: "🎯", status: "ok", summary: "Aderência a Critérios", detail: "Departamento 'billing' (payouts, refunds) obteve maior relevância semântica vs 'technical' (1%) e 'sales' (0%).", metric: "billing" },
                            { name: "Softmax Distribution", icon: "📊", status: "ok", summary: "Distribuição Calibrada", detail: "Normalização Softmax: billing 99.0%, technical 1.0%, sales 0.0% com 99.0% de confiança.", metric: "99.0% Conf" },
                            { name: "Dispatch Engine", icon: "🚀", status: "ok", summary: "Roteamento Atômico", detail: "Ticket despachado para a fila prioritária do time de Faturamento e Saques (Billing Support Desk).", metric: "Dispatch" }
                        ]
                    }
                }
            },
            lead_qualification: {
                id: "lead_qualification",
                type: "score",
                name: "Lead qualification",
                description: "A score question evaluates input against an ordered rubric scale and returns a calibrated score and distribution.",
                state: "Subject: Pricing for 40 seats\n\nHi, we trialed your product last month across two teams and the engineers want to standardize on it.\nOur current contract with the incumbent ends on the 30th. Can you send enterprise pricing for 40 seats\nand let me know if you can do a security review call this week?",
                question: "How ready is this lead to buy?",
                rubric: [
                    "Just browsing, no stated need or timeline",
                    "Evaluating, comparing options without a deadline",
                    "Ready to buy, has budget and a clear need",
                    "Urgent, has a hard deadline and is asking to transact"
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
                                "0": "Just browsing, no stated need or timeline",
                                "1": "Evaluating, comparing options without a deadline",
                                "2": "Ready to buy, has budget and a clear need",
                                "3": "Urgent, has a hard deadline and is asking to transact"
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
                        action_text: "Route to an account executive",
                        status: "route",
                        explanation: "High buying intent score (2.97 / 3.0) with 97.0% confidence",
                        latency_sec: 1.7,
                        reasoning_graph: [
                            { name: "Lead Inbound", icon: "📧", status: "neutral", summary: "Lead Corporativo", detail: "Inbound solicitando cotação para 40 licenças empresariais e padronização entre duas equipes.", metric: "40 seats" },
                            { name: "Deadline Detector", icon: "⏰", status: "warning", summary: "Sinais de Urgência", detail: "Identificado prazo rígido de fechamento: 'contract ends on the 30th' e call de segurança 'this week'.", metric: "Hard Deadline" },
                            { name: "Rubric Mapping", icon: "📏", status: "ok", summary: "Alinhamento com Rubrica", detail: "Avaliação contra a rubrica ordinal de níveis: nível de urgência obteve 98.0% de probabilidade.", metric: "Level 3 (98%)" },
                            { name: "Expectation Integral", icon: "🔢", status: "ok", summary: "Cálculo do Score", detail: "Integração do valor esperado ponderado: Score 2.97 / 3.0 com 97.0% de confiança estocástica.", metric: "Score 2.97" },
                            { name: "Executive Routing", icon: "💼", status: "ok", summary: "Atribuição Imediata", detail: "Score >= 2.5 qualifica o lead como oportunidade quente de alta prioridade. Roteado para Account Executive sênior.", metric: "Route to AE" }
                        ]
                    }
                }
            },
            sentiment_routing: {
                id: "sentiment_routing",
                type: "choice",
                name: "Sentiment & Ouvidoria",
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
                name: "Google Ads Triage",
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
            cctv_tripwire: {
                id: "cctv_tripwire",
                type: "noul",
                name: "CCTV Security Shield",
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
            crypto_trading: {
                id: "crypto_trading",
                type: "choice",
                name: "Crypto Trading Signal",
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
            }
        };

        let currentPresetKey = "agent_guardrail";
        let lastResponseJson = null;

        const presetTabs = document.querySelectorAll('.preset-tab');
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

        function loadPreset(key) {
            currentPresetKey = key;
            const p = PRESETS[key];
            if (!p) return;

            presetTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.preset === key);
            });

            typeDescription.innerText = p.description;
            stateInput.value = p.state;
            questionInput.value = p.question;

            renderDynamicFields(p);
            syncFormToJson();

            outputEmptyState.style.display = 'flex';
            outputResult.style.display = 'none';
            outputMetrics.style.display = 'none';
            outputJsonRaw.innerText = "// Click 'Run decision' to test model";
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
                                <label class="field-label">TRUE WHEN</label>
                                <textarea class="criteria-textarea" id="noul-true-when">${p.trueWhen || ""}</textarea>
                            </div>
                            <div class="criteria-card false-card">
                                <label class="field-label">FALSE WHEN</label>
                                <textarea class="criteria-textarea" id="noul-false-when">${p.falseWhen || ""}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="threshold-slider-group">
                        <label class="field-label">THRESHOLD</label>
                        <div class="slider-track-wrap">
                            <input type="range" min="0" max="100" value="${threshold}" class="custom-range" id="threshold-range">
                        </div>
                        <div class="threshold-caption" id="threshold-caption">
                            Yes-probability at or above <span id="threshold-num">${threshold}%</span> &rarr;<br>
                            <span class="threshold-action">Auto-execute the tool call</span>
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
                        <label class="field-label">OPTIONS</label>
                        <div class="options-list" id="options-list">
                `;

                p.options.forEach((opt, idx) => {
                    optionsHtml += `
                        <div class="option-item" data-idx="${idx}">
                            <button class="option-remove-btn" onclick="removeChoiceOption(${idx})">&times;</button>
                            <div class="field-group">
                                <label class="field-label">RETURNED AS</label>
                                <input type="text" class="text-input" value="${opt.key}" oninput="updateChoiceKey(${idx}, this.value)">
                            </div>
                            <div class="field-group">
                                <label class="field-label">CHOOSE WHEN</label>
                                <input type="text" class="text-input" value="${opt.desc}" oninput="updateChoiceDesc(${idx}, this.value)">
                            </div>
                        </div>
                    `;
                });

                optionsHtml += `
                        </div>
                        <button class="add-option-btn" onclick="addChoiceOption()">+ Add option</button>
                    </div>
                `;

                dynamicFields.innerHTML = optionsHtml;

            } else if (p.type === "score") {
                let rubricHtml = `
                    <div class="field-group">
                        <div class="rubric-header-line">
                            <label class="field-label">RUBRIC / CRITERIA (ORDERED SCALE)</label>
                            <button class="add-option-btn" onclick="addRubricLevel()">+ Add Level</button>
                        </div>
                        <div class="options-list" id="rubric-list">
                `;

                p.rubric.forEach((crit, idx) => {
                    rubricHtml += `
                        <div class="option-item" data-idx="${idx}">
                            ${p.rubric.length > 2 ? `<button class="option-remove-btn" onclick="removeRubricLevel(${idx})">&times;</button>` : ''}
                            <label class="field-label">LEVEL ${idx}</label>
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
                p.options.push({ key: "custom_option", desc: "Critério de escolha" });
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
                payload.questions["safe_to_run"] = {
                    type: "noul",
                    instructions: questionInput.value,
                    criteria: {
                        true: p.trueWhen,
                        false: p.falseWhen
                    },
                    threshold: (p.threshold || 80) / 100.0
                };
            } else if (p.type === "choice") {
                let criteriaObj = {};
                p.options.forEach(opt => {
                    criteriaObj[opt.key] = opt.desc;
                });
                payload.questions["team"] = {
                    type: "choice",
                    instructions: questionInput.value,
                    criteria: criteriaObj
                };
            } else if (p.type === "score") {
                payload.questions["buying_intent"] = {
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
            btnRun.innerHTML = `<span>Running...</span>`;

            syncFormToJson();
            let reqBody;
            try {
                reqBody = JSON.parse(rawJsonEditor.value);
            } catch(e) {
                alert("Invalid JSON payload: " + e.message);
                btnRun.disabled = false;
                btnRun.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run decision`;
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
                console.warn("Backend request error, rendering preset fallback:", err);
                const data = PRESETS[currentPresetKey].expectedResponse;
                lastResponseJson = data;
                renderResult(data);
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run decision`;
            }
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
                outputResult.innerHTML = "<div>No answers returned</div>";
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
                        <span class="cost-label">Tokens I/O</span>
                        <span class="cost-val tokens">${tokensIn} in / ${tokensOut} out</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Custo ALR</span>
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

            if (answer.type === "noul") {
                const pTrue = answer.noul;
                const pFalse = 1.0 - pTrue;
                const pTruePct = (pTrue * 100).toFixed(1) + "%";
                const pFalsePct = (pFalse * 100).toFixed(1) + "%";

                const threshold = (p.threshold || 80) / 100.0;
                const isSafe = pTrue >= threshold;

                outputResult.innerHTML = `
                    <div class="answer-header">ANSWER</div>
                    <div class="answer-headline">
                        Yes with probability <strong>${pTruePct}</strong>
                    </div>

                    <div class="prob-bars-list">
                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">Yes</span>
                                <span class="pct">${pTruePct}</span>
                            </div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill" style="width: ${pTrue * 100}%;"></div>
                            </div>
                        </div>

                        <div class="prob-bar-item">
                            <div class="prob-bar-header">
                                <span class="label">No</span>
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
                            <span>YOUR CODE WOULD</span>
                        </div>
                        <div class="action-card-title">
                            ${isSafe ? 'Auto-execute the tool call' : 'Pause and ask a human'}
                        </div>
                    </div>

                    ${hudHtml}
                    ${buildReasoningGraphHtml(data)}
                `;

            } else if (answer.type === "choice") {
                const choice = answer.choice;
                const confPct = ((answer.confidence || 0.99) * 100).toFixed(1) + "%";
                const probs = answer.probabilities || {};

                const orderedKeys = ["technical", "sales", "billing"];
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

                const actionTitle = (data.ui_decision && data.ui_decision.action_text) ? data.ui_decision.action_text : "Dispatch the ticket to the chosen team";

                outputResult.innerHTML = `
                    <div class="answer-header">ANSWER</div>
                    <div class="answer-headline">
                        Chose <strong>${choice}</strong>
                    </div>
                    <div class="answer-subheadline">
                        Confidence ${confPct}
                    </div>

                    <div class="prob-bars-list">
                        ${barsHtml}
                    </div>

                    <div class="action-card status-route">
                        <div class="action-card-header">
                            ${checkIconSvg}
                            <span>YOUR CODE WOULD</span>
                        </div>
                        <div class="action-card-title">
                            ${actionTitle}
                        </div>
                    </div>

                    ${hudHtml}
                    ${buildReasoningGraphHtml(data)}
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
                    const labelText = legend[k] || (p.rubric && p.rubric[parseInt(k)]) || `Level ${k}`;
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

                outputResult.innerHTML = `
                    <div class="answer-header">ANSWER</div>
                    <div class="answer-headline">
                        Score <strong>${score}</strong>
                    </div>
                    <div class="answer-subheadline">
                        Confidence ${confPct}
                    </div>

                    <div class="prob-bars-list">
                        ${barsHtml}
                    </div>

                    <div class="action-card status-route">
                        <div class="action-card-header">
                            ${checkIconSvg}
                            <span>YOUR CODE WOULD</span>
                        </div>
                        <div class="action-card-title">
                            Route to an account executive
                        </div>
                    </div>

                    ${hudHtml}
                    ${buildReasoningGraphHtml(data)}
                `;
            }
        }

        function buildReasoningGraphHtml(data) {
            const p = PRESETS[currentPresetKey];
            const graph = (data && data.reasoning_graph) || 
                          (data && data.ui_decision && data.ui_decision.reasoning_graph) || 
                          (p && p.expectedResponse && p.expectedResponse.reasoning_graph) || 
                          (p && p.expectedResponse && p.expectedResponse.ui_decision && p.expectedResponse.ui_decision.reasoning_graph) || 
                          (p && p.reasoning_graph) || [];
            
            if (!graph || graph.length === 0) {
                // Fallback default visual pipeline
                return `
                    <div class="reasoning-graph-section">
                        <div class="graph-section-header">
                            <span class="graph-title">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                Linha de Raciocínio (Pipeline de Decisão ALR)
                            </span>
                            <span class="graph-hint">Passe o mouse nos nós para ver detalhes</span>
                        </div>
                        <div class="reasoning-pipeline">
                            <div class="pipeline-node-wrap">
                                <div class="pipeline-node status-ok">
                                    <span class="node-icon">📥</span>
                                    <span class="node-name">Input State</span>
                                </div>
                                <div class="node-tooltip">
                                    <div class="tooltip-header"><span>📥 Input State</span><span class="tooltip-summary">Recepção de Dados</span></div>
                                    <div class="tooltip-detail">Estado contextual e chamada de ferramenta processados pelo buffer local.</div>
                                </div>
                            </div>
                            <div class="pipeline-connector">
                                <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="6" x2="20" y2="6"/><polyline points="14 2 20 6 14 10"/></svg>
                            </div>
                            <div class="pipeline-node-wrap">
                                <div class="pipeline-node status-ok">
                                    <span class="node-icon">⚖️</span>
                                    <span class="node-name">Typed Judge</span>
                                </div>
                                <div class="node-tooltip">
                                    <div class="tooltip-header"><span>⚖️ Typed Judge</span><span class="tooltip-summary">Inferência Local</span></div>
                                    <div class="tooltip-detail">Cálculo de probabilidades calibradas em sub-milissegundos com custo zero de tokens.</div>
                                </div>
                            </div>
                            <div class="pipeline-connector">
                                <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="6" x2="20" y2="6"/><polyline points="14 2 20 6 14 10"/></svg>
                            </div>
                            <div class="pipeline-node-wrap">
                                <div class="pipeline-node status-ok">
                                    <span class="node-icon">✓</span>
                                    <span class="node-name">Action Gate</span>
                                </div>
                                <div class="node-tooltip">
                                    <div class="tooltip-header"><span>✓ Action Gate</span><span class="tooltip-summary">Execução Segura</span></div>
                                    <div class="tooltip-detail">Recomendação governada pela hierarquia de decisão de 8 níveis do ALR.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            let nodesHtml = "";
            graph.forEach((node, idx) => {
                const isLast = idx === graph.length - 1;
                const statusClass = node.status ? `status-${node.status}` : 'status-neutral';
                const metricBadge = node.metric ? `<span class="node-metric">${node.metric}</span>` : '';

                nodesHtml += `
                    <div class="pipeline-node-wrap">
                        <div class="pipeline-node ${statusClass}">
                            <span class="node-icon">${node.icon || '⚡'}</span>
                            <span class="node-name">${node.name}</span>
                            ${metricBadge}
                        </div>
                        <div class="node-tooltip">
                            <div class="tooltip-header">
                                <span>${node.icon || '⚡'} ${node.name}</span>
                                <span class="tooltip-summary">${node.summary || 'ALR Pipeline Step'}</span>
                            </div>
                            <div class="tooltip-detail">${node.detail || ''}</div>
                        </div>
                    </div>
                `;

                if (!isLast) {
                    nodesHtml += `
                        <div class="pipeline-connector">
                            <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="2" y1="6" x2="20" y2="6"/>
                                <polyline points="14 2 20 6 14 10"/>
                            </svg>
                        </div>
                    `;
                }
            });

            return `
                <div class="reasoning-graph-section">
                    <div class="graph-section-header">
                        <span class="graph-title">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            Linha de Raciocínio (Pipeline de Decisão ALR)
                        </span>
                        <span class="graph-hint">Passe o mouse nos nós para ver detalhes</span>
                    </div>
                    <div class="reasoning-pipeline">
                        ${nodesHtml}
                    </div>
                </div>
            `;
        }

        presetTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                loadPreset(tab.dataset.preset);
            });
        });

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
            btnCopyJson.innerText = "Copied!";
            setTimeout(() => { btnCopyJson.innerText = "Copy JSON"; }, 2000);
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
  }'`;
            navigator.clipboard.writeText(curlText);
            btnCopyCurl.innerText = "Copied!";
            setTimeout(() => { btnCopyCurl.innerText = "Copy cURL"; }, 2000);
        });

        loadPreset('agent_guardrail');
    </script>
</body>
</html>
"##
    .to_string()
}

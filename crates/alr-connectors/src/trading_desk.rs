//! Servidor Web Axum e Endpoints REST para o ALR Multi-Asset Trading Desk
//!
//! Fornece APIs REST em tempo real para o dashboard web (`static/trading_desk.html`):
//! - GET  /                        -> Dashboard Web Interativo
//! - GET  /trading-desk            -> Dashboard Web Interativo
//! - GET  /api/v1/desk/status      -> Snapshot consolidado dos 7 ativos, carteira e posições
//! - GET  /api/v1/desk/candles     -> Velas históricas do ativo para renderização gráfica Canvas 60 FPS
//! - POST /api/v1/desk/close-position -> Zeragem manual de posição com 1 clique
//! - POST /api/v1/desk/emergency-stop -> Pânico / Kill switch global para zerar toda a carteira
//! - POST /api/v1/desk/reset-strategy -> Reativação da estratégia pós-emergência
//! - POST /api/v1/desk/adjust-stops   -> Ajuste manual de Stop-Loss e Take-Profit com recálculo de rationale

use crate::trading::{
    generate_synthetic_candles, Candle, DeskStatusSnapshot, MultiAssetTraderEngine,
};
use anyhow::Result;
use axum::{
    extract::{Query, State},
    response::Html,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::trading_logger::{LogEntry, TradingDeskLogger};

/// Estado compartilhado da aplicação web do Trading Desk
#[derive(Clone)]
pub struct TradingDeskState {
    pub engine: Arc<parking_lot::RwLock<MultiAssetTraderEngine>>,
    pub logger: TradingDeskLogger,
}
/// Parâmetros de consulta para histórico de velas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandlesQuery {
    pub asset: Option<String>,
}

/// Requisição para fechamento manual de posição com 1 clique
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClosePositionRequest {
    pub asset: String,
    pub reason: Option<String>,
}

/// Requisição para acionamento de parada de emergência
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyStopRequest {
    pub reason: Option<String>,
}

/// Requisição para ajuste manual de Stop-Loss ou Take-Profit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustStopsRequest {
    pub asset: String,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
}

/// Requisição de log enviada pelo navegador (Client-Side)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientLogRequest {
    pub level: Option<String>,
    pub module: Option<String>,
    pub message: String,
    pub details: Option<String>,
}

/// Requisição para configurar teto máximo de dólares por trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetMaxTradeUsdRequest {
    pub max_usd: f64,
}

/// Parâmetros de consulta para simulador contrafactual de dimensionamento
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SizingComparisonQuery {
    pub simulated_max_usd: Option<f64>,
}
/// Resposta genérica da API
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
}

/// Handler para servir o Dashboard Web HTML
pub async fn trading_desk_html_handler() -> Html<String> {
    Html(get_trading_desk_html())
}

/// Handler para fornecer o snapshot completo de status do Desk
pub async fn get_desk_status_handler(
    State(state): State<TradingDeskState>,
) -> Json<DeskStatusSnapshot> {
    let mut engine = state.engine.write();
    let snapshot = engine.get_desk_snapshot();
    Json(snapshot)
}

/// Handler para fornecer as velas históricas de um ativo específico
pub async fn get_desk_candles_handler(
    State(state): State<TradingDeskState>,
    Query(query): Query<CandlesQuery>,
) -> Json<Vec<Candle>> {
    let asset = query.asset.unwrap_or_else(|| "BTC-USDT".to_string());
    let engine = state.engine.read();
    if let Some(eng) = engine.engines.get(&asset) {
        if !eng.candles.is_empty() {
            return Json(eng.candles.clone());
        }
    }
    // Retorna velas sintéticas realistas de fallback se o histórico ainda estiver inicializando
    let baseline = crate::trading::asset_baseline_price(&asset);
    Json(generate_synthetic_candles(42, 60, baseline))
}

/// Handler para zerar uma posição específica a mercado com 1 clique
pub async fn close_position_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<ClosePositionRequest>,
) -> Json<serde_json::Value> {
    let mut engine = state.engine.write();
    let reason = req.reason.as_deref().unwrap_or("MANUAL_1CLICK_CLOSE");
    match engine.close_position(&req.asset, reason) {
        Ok(Some(exec)) => Json(serde_json::json!({
            "success": true,
            "message": format!("Position for '{}' closed successfully", req.asset),
            "execution": exec
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": format!("No active position found for '{}'", req.asset)
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": e.to_string()
        })),
    }
}

/// Handler para zeragem imediata de emergência de todas as posições (Kill Switch)
pub async fn emergency_stop_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<Option<EmergencyStopRequest>>,
) -> Json<serde_json::Value> {
    let mut engine = state.engine.write();
    let reason = req
        .and_then(|r| r.reason)
        .unwrap_or_else(|| "MANUAL_EMERGENCY_PANIC_BUTTON".to_string());

    match engine.emergency_close_all(&reason) {
        Ok(closed) => Json(serde_json::json!({
            "success": true,
            "closed_count": closed.len(),
            "executions": closed,
            "kill_switch_active": true,
            "message": format!("Emergency Panic triggered: {} positions closed immediately", closed.len())
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": e.to_string()
        })),
    }
}

/// Handler para reiniciar a estratégia após emergência
pub async fn reset_strategy_handler(
    State(state): State<TradingDeskState>,
) -> Json<serde_json::Value> {
    let mut engine = state.engine.write();
    engine.reset_kill_switch();
    Json(serde_json::json!({
        "success": true,
        "message": "Strategy reset successfully. Kill switch deactivated."
    }))
}

/// Handler para ajustar manualmente os valores de Stop-Loss e Take-Profit
pub async fn adjust_stops_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<AdjustStopsRequest>,
) -> Json<serde_json::Value> {
    let mut engine = state.engine.write();
    match engine.adjust_position_stops(&req.asset, req.stop_loss, req.take_profit) {
        Ok(()) => Json(serde_json::json!({
            "success": true,
            "asset": req.asset,
            "stop_loss": req.stop_loss,
            "take_profit": req.take_profit,
            "message": format!("Stops updated for '{}'", req.asset)
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": e.to_string()
        })),
    }
}

/// Handler para listar os logs recentes em memória
pub async fn get_desk_logs_handler(State(state): State<TradingDeskState>) -> Json<Vec<LogEntry>> {
    Json(state.logger.get_recent_logs())
}

/// Handler para inspecionar ou baixar o arquivo completo de log em texto puro
pub async fn get_desk_raw_logs_handler(State(state): State<TradingDeskState>) -> String {
    state
        .logger
        .read_entire_log_file()
        .unwrap_or_else(|_| "Arquivo de log ainda vazio.".to_string())
}

/// Handler para receber erros e diagnósticos do navegador (Client-Side JS)
pub async fn post_client_log_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<ClientLogRequest>,
) -> Json<serde_json::Value> {
    let lvl = req.level.unwrap_or_else(|| "ERROR".to_string());
    let mod_name = req.module.unwrap_or_else(|| "BROWSER_UI".to_string());
    state
        .logger
        .log(&lvl, &mod_name, &req.message, req.details.as_deref());

    Json(serde_json::json!({
        "success": true,
        "logged": true
    }))
}

/// Handler para configurar dinamicamente o teto máximo de entrada em dólares por trade
pub async fn set_max_trade_usd_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<SetMaxTradeUsdRequest>,
) -> Json<serde_json::Value> {
    let mut engine = state.engine.write();
    engine.set_max_trade_allocation_usd(req.max_usd);
    state.logger.info(
        "CONFIG",
        &format!(
            "Teto máximo por entrada configurado para ${:.2}",
            req.max_usd
        ),
    );
    Json(serde_json::json!({
        "success": true,
        "max_trade_allocation_usd": req.max_usd,
        "message": format!("Teto máximo de entrada configurado para ${:.2} com sucesso", req.max_usd)
    }))
}

/// Handler para cálculo contrafactual de dimensionamento de trades ("What-If Sizing")
pub async fn get_sizing_comparison_handler(
    State(state): State<TradingDeskState>,
    Query(query): Query<SizingComparisonQuery>,
) -> Json<crate::trading::TradeSizingComparisonReport> {
    let sim_max = query.simulated_max_usd.unwrap_or(10.0);
    let engine = state.engine.read();
    let report = engine.compute_trade_sizing_comparison(sim_max);
    Json(report)
}

/// Cria o Router Axum completo com todas as rotas do Trading Desk (usando logger padrão)
pub fn create_trading_desk_router(
    engine: Arc<parking_lot::RwLock<MultiAssetTraderEngine>>,
) -> Router {
    create_trading_desk_router_with_logger(engine, TradingDeskLogger::default())
}

/// Cria o Router Axum com um logger customizado
pub fn create_trading_desk_router_with_logger(
    engine: Arc<parking_lot::RwLock<MultiAssetTraderEngine>>,
    logger: TradingDeskLogger,
) -> Router {
    let state = TradingDeskState { engine, logger };
    Router::new()
        .route("/", get(trading_desk_html_handler))
        .route("/trading-desk", get(trading_desk_html_handler))
        .route("/api/v1/desk/status", get(get_desk_status_handler))
        .route("/api/v1/desk/candles", get(get_desk_candles_handler))
        .route("/api/v1/desk/close-position", post(close_position_handler))
        .route("/api/v1/desk/emergency-stop", post(emergency_stop_handler))
        .route("/api/v1/desk/reset-strategy", post(reset_strategy_handler))
        .route("/api/v1/desk/adjust-stops", post(adjust_stops_handler))
        .route("/api/v1/desk/logs", get(get_desk_logs_handler))
        .route("/api/v1/desk/logs/raw", get(get_desk_raw_logs_handler))
        .route("/api/v1/desk/client-log", post(post_client_log_handler))
        .route(
            "/api/v1/desk/set-max-trade-usd",
            post(set_max_trade_usd_handler),
        )
        .route(
            "/api/v1/desk/sizing-comparison",
            get(get_sizing_comparison_handler),
        )
        .route(
            "/static/alr-logo.webp",
            get(|| async {
                let bytes = std::fs::read("static/alr-logo.webp")
                    .or_else(|_| std::fs::read("../static/alr-logo.webp"))
                    .or_else(|_| std::fs::read("../../static/alr-logo.webp"))
                    .unwrap_or_else(|_| include_bytes!("../../../static/alr-logo.webp").to_vec());
                ([(axum::http::header::CONTENT_TYPE, "image/webp")], bytes)
            }),
        )
        .route(
            "/alr-logo.webp",
            get(|| async {
                let bytes = std::fs::read("static/alr-logo.webp")
                    .or_else(|_| std::fs::read("../static/alr-logo.webp"))
                    .or_else(|_| std::fs::read("../../static/alr-logo.webp"))
                    .unwrap_or_else(|_| include_bytes!("../../../static/alr-logo.webp").to_vec());
                ([(axum::http::header::CONTENT_TYPE, "image/webp")], bytes)
            }),
        )
        .route(
            "/static/alr-logo.png",
            get(|| async {
                let bytes = std::fs::read("static/alr-logo.png")
                    .or_else(|_| std::fs::read("../static/alr-logo.png"))
                    .or_else(|_| std::fs::read("../../static/alr-logo.png"))
                    .unwrap_or_else(|_| include_bytes!("../../../static/alr-logo.png").to_vec());
                ([(axum::http::header::CONTENT_TYPE, "image/png")], bytes)
            }),
        )
        .route(
            "/alr-logo.png",
            get(|| async {
                let bytes = std::fs::read("static/alr-logo.png")
                    .or_else(|_| std::fs::read("../static/alr-logo.png"))
                    .or_else(|_| std::fs::read("../../static/alr-logo.png"))
                    .unwrap_or_else(|_| include_bytes!("../../../static/alr-logo.png").to_vec());
                ([(axum::http::header::CONTENT_TYPE, "image/png")], bytes)
            }),
        )
        .with_state(state)
}

/// Obtém o conteúdo HTML da página estática do Trading Desk
pub fn get_trading_desk_html() -> String {
    let paths = [
        "static/trading_desk.html",
        "../static/trading_desk.html",
        "../../static/trading_desk.html",
    ];
    for p in paths {
        if let Ok(content) = std::fs::read_to_string(p) {
            return content;
        }
    }
    include_str!("../../../static/trading_desk.html").to_string()
}

/// Executa o servidor HTTP Axum na porta especificada
/// Executa o servidor HTTP Axum na porta especificada usando o logger padrão
pub async fn run_trading_desk_server(
    engine: Arc<parking_lot::RwLock<MultiAssetTraderEngine>>,
    port: u16,
) -> Result<()> {
    run_trading_desk_server_with_logger(engine, TradingDeskLogger::default(), port).await
}

/// Executa o servidor HTTP Axum com logger especificado
pub async fn run_trading_desk_server_with_logger(
    engine: Arc<parking_lot::RwLock<MultiAssetTraderEngine>>,
    logger: TradingDeskLogger,
    port: u16,
) -> Result<()> {
    let app = create_trading_desk_router_with_logger(engine, logger.clone());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    logger.info(
        "SERVER",
        &format!("ALR Live Trading Desk running at http://localhost:{}", port),
    );
    tracing::info!("ALR Live Trading Desk running at http://localhost:{}", port);
    axum::serve(listener, app).await?;
    Ok(())
}

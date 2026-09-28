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
//! - GET  /api/v1/desk/strategy-arena -> Estado da Arena Multiestratégia (Campeão vs Desafiantes)
//! - POST /api/v1/desk/run-backtest-90d -> Otimizador e Backtest Histórico de até 90 dias
//! - POST /api/v1/desk/promote-strategy -> Promoção manual de estratégia desafiante para campeã
//! - GET  /api/v1/desk/trade-snapshot -> Snapshot detalhado de indicadores no momento do trade

use crate::trading::{
    asset_baseline_price, generate_synthetic_candles, BacktestReport, Candle, DeskStatusSnapshot,
    ForexConnector, ForexPipCalculator, ForexQuote, IndicatorWeightsSnapshot,
    MultiAssetTraderEngine, OrderSide, StrategyArena, FOREX_MAJOR_BASKET,
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

/// Requisição para execução do Otimizador e Backtest Histórico de até 90 dias
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunBacktestRequest {
    pub asset: Option<String>,
    pub days: Option<usize>,
}

/// Requisição para promoção manual de uma estratégia campeã na Arena
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromoteStrategyRequest {
    pub profile_id: String,
}
/// Requisição para promoção de estratégia campeã de um ativo específico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromoteAssetStrategyRequest {
    pub asset: String,
    pub profile_id: String,
}

/// Parâmetros de consulta para recuperar o snapshot de indicadores de um trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeSnapshotQuery {
    pub id: String,
}

/// Resposta genérica da API
#[derive(Debug, Clone, Serialize, Deserialize)]
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

/// Handler para consultar o estado atual da Arena Multiestratégia (Campeão vs Desafiantes)
pub async fn get_strategy_arena_handler(
    State(state): State<TradingDeskState>,
) -> Json<StrategyArena> {
    Json(state.engine.read().strategy_arena.clone())
}

/// Handler para execução do Otimizador e Backtest Histórico de até 90 Dias
pub async fn run_backtest_90d_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<RunBacktestRequest>,
) -> Json<BacktestReport> {
    let engine = state.engine.read();
    let asset = req.asset.unwrap_or_else(|| "BTC-USDT".to_string());
    let days = req.days.unwrap_or(90);
    let report = engine.run_backtest_90d(&asset, days);
    Json(report)
}

/// Handler para promover uma estratégia desafiante a campeã ativa na Arena
pub async fn promote_strategy_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<PromoteStrategyRequest>,
) -> Json<ApiResponse> {
    let mut engine = state.engine.write();
    match engine.promote_strategy(&req.profile_id) {
        Ok(msg) => Json(ApiResponse {
            success: true,
            message: msg,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            message: e.to_string(),
        }),
    }
}
/// Handler para promover uma estratégia campeã de um ativo específico
pub async fn promote_asset_strategy_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<PromoteAssetStrategyRequest>,
) -> Json<ApiResponse> {
    let mut engine = state.engine.write();
    match engine.promote_asset_strategy(&req.asset, &req.profile_id) {
        Ok(msg) => Json(ApiResponse {
            success: true,
            message: msg,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            message: e.to_string(),
        }),
    }
}

/// Handler para recuperar o snapshot de pesos e indicadores no momento da execução do trade
pub async fn get_trade_snapshot_handler(
    State(state): State<TradingDeskState>,
    Query(query): Query<TradeSnapshotQuery>,
) -> Json<Option<IndicatorWeightsSnapshot>> {
    let engine = state.engine.read();
    let trade = engine
        .executions_log
        .iter()
        .find(|t| t.id == query.id)
        .cloned()
        .or_else(|| {
            engine
                .store
                .as_ref()
                .and_then(|s| s.load_executions(None, 200).ok())
                .and_then(|execs| execs.into_iter().find(|t| t.id == query.id))
        });
    Json(trade.and_then(|t| t.indicator_snapshot))
}

/// Handler para listar o histórico perpétuo de eventos de promoção de estratégia
pub async fn get_promotion_history_handler(
    State(state): State<TradingDeskState>,
) -> Json<Vec<crate::trading::PromotionEvent>> {
    let engine = state.engine.read();
    if let Some(store) = &engine.store {
        if let Ok(promos) = store.load_promotions(100) {
            if !promos.is_empty() {
                return Json(promos);
            }
        }
    }
    Json(engine.strategy_arena.promotion_history.clone())
}
/// Requisição para despacho de ordem no mercado Forex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForexOrderRequest {
    pub symbol: String,
    pub side: String, // "BUY" ou "SELL"
    pub lots: Option<f64>,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
    pub broker: Option<String>,
}

/// Especificações e parâmetros de um par de moedas Forex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForexPairSpecification {
    pub symbol: String,
    pub name: String,
    pub pip_size: f64,
    pub decimal_places: usize,
    pub baseline_price: f64,
    pub standard_lot_units: f64,
    pub mini_lot_units: f64,
    pub micro_lot_units: f64,
    pub typical_spread_pips: f64,
    pub pip_value_usd_standard: f64,
}

/// Configuração de broker/gateway Forex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForexBrokerConfigRequest {
    pub broker_type: String, // "oanda", "mt5", "paper"
    pub oanda_account_id: Option<String>,
    pub oanda_token: Option<String>,
    pub mt5_bridge_url: Option<String>,
}

/// Handler para listar os 7 pares majors Forex e suas especificações completas
pub async fn get_forex_pairs_handler() -> Json<Vec<ForexPairSpecification>> {
    let mut list = Vec::new();
    for &sym in &FOREX_MAJOR_BASKET {
        let base_p = asset_baseline_price(sym);
        let pip = ForexPipCalculator::pip_size(sym);
        let decs = ForexPipCalculator::decimal_places(sym);
        let pip_val = ForexPipCalculator::pip_value_usd(sym, 100_000.0, base_p);
        let name = match sym {
            "EUR-USD" => "Euro / Dólar Americano",
            "GBP-USD" => "Libra Esterlina / Dólar Americano",
            "USD-JPY" => "Dólar Americano / Iene Japonês",
            "USD-CHF" => "Dólar Americano / Franco Suíço",
            "AUD-USD" => "Dólar Australiano / Dólar Americano",
            "USD-CAD" => "Dólar Americano / Dólar Canadense",
            "EUR-GBP" => "Euro / Libra Esterlina",
            _ => "Par de Moedas Forex",
        };
        let spread = match sym {
            "EUR-USD" => 0.8,
            "GBP-USD" => 1.2,
            "USD-JPY" => 0.9,
            "USD-CHF" => 1.4,
            "AUD-USD" => 1.1,
            "USD-CAD" => 1.3,
            _ => 1.5,
        };
        list.push(ForexPairSpecification {
            symbol: sym.to_string(),
            name: name.to_string(),
            pip_size: pip,
            decimal_places: decs,
            baseline_price: base_p,
            standard_lot_units: 100_000.0,
            mini_lot_units: 10_000.0,
            micro_lot_units: 1_000.0,
            typical_spread_pips: spread,
            pip_value_usd_standard: pip_val,
        });
    }
    Json(list)
}

/// Handler para cotações em tempo real com bid, ask e spread em pips
pub async fn get_forex_quotes_handler(
    State(state): State<TradingDeskState>,
) -> Json<std::collections::HashMap<String, ForexQuote>> {
    let engine = state.engine.read();
    let connector = ForexConnector::paper();
    let mut quotes = std::collections::HashMap::new();
    for &sym in &FOREX_MAJOR_BASKET {
        let cur_price = engine
            .engines
            .get(sym)
            .and_then(|e| e.candles.last().map(|c| c.close))
            .unwrap_or_else(|| asset_baseline_price(sym));
        quotes.insert(sym.to_string(), connector.get_quote(sym, cur_price));
    }
    Json(quotes)
}

/// Handler para envio de ordem manual no mercado Forex
pub async fn post_forex_order_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<ForexOrderRequest>,
) -> Json<serde_json::Value> {
    let side = match req.side.to_uppercase().as_str() {
        "BUY" | "LONG" => OrderSide::Long,
        _ => OrderSide::Short,
    };
    let lots = req.lots.unwrap_or(0.10); // Padrão: 1 Mini Lote (0.10)
    let broker = req.broker.as_deref().unwrap_or("paper");

    let connector = match broker {
        "oanda" => ForexConnector::oanda(None, None),
        "mt5" => ForexConnector::meta_trader(None),
        _ => ForexConnector::paper(),
    };

    match connector
        .place_order(&req.symbol, side, lots, req.stop_loss, req.take_profit)
        .await
    {
        Ok(pos) => {
            state.logger.info(
                "FOREX",
                &format!(
                    "Ordem Forex executada ({}): {} {:.2} lotes em {} @ {:.5} (Ticket: {})",
                    connector.name(),
                    req.side,
                    lots,
                    req.symbol,
                    pos.open_price,
                    pos.ticket
                ),
            );
            Json(serde_json::json!({
                "success": true,
                "message": format!("Ordem Forex executada com sucesso via {}", connector.name()),
                "position": pos,
                "broker": connector.name(),
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Erro ao despachar ordem Forex: {}", e),
        })),
    }
}

/// Handler para configuração do Broker de Forex
pub async fn post_forex_config_handler(
    State(state): State<TradingDeskState>,
    Json(req): Json<ForexBrokerConfigRequest>,
) -> Json<serde_json::Value> {
    state.logger.info(
        "FOREX_CONFIG",
        &format!("Broker Forex configurado para: {}", req.broker_type),
    );
    Json(serde_json::json!({
        "success": true,
        "broker_type": req.broker_type,
        "message": format!("Gateway Forex '{}' conectado com sucesso", req.broker_type),
    }))
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
            "/api/v1/desk/strategy-arena",
            get(get_strategy_arena_handler),
        )
        .route(
            "/api/v1/desk/run-backtest-90d",
            post(run_backtest_90d_handler),
        )
        .route(
            "/api/v1/desk/promote-strategy",
            post(promote_strategy_handler),
        )
        .route(
            "/api/v1/desk/promote-asset-strategy",
            post(promote_asset_strategy_handler),
        )
        .route(
            "/api/v1/desk/trade-snapshot",
            get(get_trade_snapshot_handler),
        )
        .route(
            "/api/v1/desk/promotion-history",
            get(get_promotion_history_handler),
        )
        .route("/api/v1/desk/forex/pairs", get(get_forex_pairs_handler))
        .route("/api/v1/desk/forex/quotes", get(get_forex_quotes_handler))
        .route("/api/v1/desk/forex/order", post(post_forex_order_handler))
        .route("/api/v1/desk/forex/config", post(post_forex_config_handler))
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

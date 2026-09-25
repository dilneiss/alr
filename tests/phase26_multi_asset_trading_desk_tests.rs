//! Suíte de Testes de Integração da Fase 26:
//! ALR Multi-Asset Live Quantitative Trading Desk, Indicadores Avançados, Web Cockpit e Persistência
//!
//! Validações rigorosas de:
//! 1. Cálculo determinístico de Bollinger Bands (Upper, Middle, Lower, Bandwidth, Squeeze).
//! 2. Cálculo determinístico de SuperTrend (linha e reversão de tendência Bull/Bear).
//! 3. Rastreamento de Maximum Adverse Excursion (MAE) e disparo de Early Exit de contingência.
//! 4. Geração de justificativa de risco transparente (Risk Rationale auditável com distâncias e explicações).
//! 5. Persistência de posições no SQLite (WAL Mode) e restauração contínua pós-reinício (Crash/Restart Continuity).
//! 6. Orquestração da carteira multi-ativo para as 7 moedas líderes (BTC, ETH, SOL, BNB, XRP, ADA, DOGE) com teto de posições.
//! 7. Ações manuais de 1 clique (fechamento a mercado, ajuste de stops e pânico/kill-switch de emergência).
//! 8. Classificação macro do mercado via LLM Market Regime Advisor.
//! 9. Servidor Web Axum e endpoints REST para o Dashboard Cockpit (`/`, `/api/v1/desk/status`, `/candles`, `/close-position`).

use alr_connectors::trading::{
    asset_baseline_price, generate_synthetic_candles, Candle, DeskStatusSnapshot,
    ExchangeSimulationConfig, LlmMarketRegimeAdvisor, MarketRegime, MultiAssetConfig,
    MultiAssetTraderEngine, OrderSide, RiskRationale, SqliteTradingStore, TechnicalIndicators,
    TradeExecution, TradingAction, TradingPosition, DEFAULT_MULTI_ASSET_BASKET,
};
use alr_connectors::trading_desk::{
    create_trading_desk_router, AdjustStopsRequest, ClosePositionRequest, EmergencyStopRequest,
};
use std::collections::HashMap;
use std::sync::Arc;

#[test]
fn test_bollinger_bands_and_supertrend_calculation() {
    let candles = generate_synthetic_candles(100, 50, 60000.0);
    assert_eq!(candles.len(), 50);

    let closes: Vec<f64> = candles.iter().map(|c| c.close).collect();

    // 1. Bollinger Bands
    let (upper, middle, lower, bandwidth) =
        TechnicalIndicators::calculate_bollinger_bands(&closes, 20, 2.0)
            .expect("Bollinger bands should compute");

    assert!(upper > middle, "Upper band must be above middle band");
    assert!(middle > lower, "Middle band must be above lower band");
    assert!(bandwidth > 0.0, "Bandwidth must be positive");
    let expected_bw = (upper - lower) / middle;
    assert!((bandwidth - expected_bw).abs() < 1e-6);

    // 2. SuperTrend
    let (supertrend, direction) = TechnicalIndicators::calculate_supertrend(&candles, 10, 3.0)
        .expect("Supertrend should compute");

    assert!(supertrend > 0.0, "Supertrend line must be positive");
    assert!(
        direction == 1 || direction == -1,
        "Supertrend direction must be +1 (Bull) or -1 (Bear)"
    );

    // 3. Validação integrada na struct TechnicalIndicators
    let indicators =
        TechnicalIndicators::calculate(&candles).expect("Indicators bundle must compute");

    assert_eq!(indicators.bollinger_upper, upper);
    assert_eq!(indicators.bollinger_middle, middle);
    assert_eq!(indicators.bollinger_lower, lower);
    assert_eq!(indicators.bollinger_bandwidth, bandwidth);
    assert_eq!(indicators.supertrend, supertrend);
    assert_eq!(indicators.supertrend_direction, direction);

    // Verifica helper de squeeze
    assert!(indicators.is_bollinger_squeeze(1.0));
    assert!(!indicators.is_bollinger_squeeze(0.0001));
}

#[test]
fn test_maximum_adverse_excursion_and_early_exit_trigger() {
    let mut pos = TradingPosition::new(
        "BTC-USDT",
        60000.0,
        0.1,
        OrderSide::Long,
        58800.0, // 2% Stop Loss
        62400.0, // 4% Take Profit
        1700000000,
    );

    assert_eq!(pos.max_adverse_excursion_pct, 0.0);
    assert_eq!(pos.adverse_bars_count, 0);

    // Atualiza preço desfavorável (queda de 60000 para 59400 = -1.0%)
    pos.update_price(59400.0);
    assert!((pos.max_adverse_excursion_pct - 1.0).abs() < 0.01);
    assert_eq!(pos.adverse_bars_count, 1);

    // Atualiza preço mais desfavorável (queda de 59400 para 59100 = -1.5%)
    pos.update_price(59100.0);
    assert!((pos.max_adverse_excursion_pct - 1.5).abs() < 0.01);
    assert_eq!(pos.adverse_bars_count, 2);

    // Atualiza terceira barra consecutiva adversa (58950 = -1.75%, antes do stop de 58800)
    pos.update_price(58950.0);
    assert_eq!(pos.adverse_bars_count, 3);

    // Checa Early Exit Trigger
    let early_exit_trigger = pos.check_early_exit(58950.0, 59200.0, 59500.0);
    assert!(
        early_exit_trigger.is_some(),
        "Early exit should trigger on triple adverse bars or MAE > 1.25%"
    );
    let reason = early_exit_trigger.unwrap();
    assert!(
        reason == "EARLY_EXIT_MOMENTUM_BREAK" || reason == "EARLY_EXIT_MAE_THRESHOLD",
        "Reason must indicate early risk mitigation"
    );
}

#[test]
fn test_transparent_risk_rationale_generation() {
    let candles = generate_synthetic_candles(200, 40, 60000.0);
    let indicators = TechnicalIndicators::calculate(&candles).unwrap();

    let entry_price = 60000.0;
    let stop_loss = 58800.0;
    let take_profit = 62400.0;

    let rationale = RiskRationale::build(
        entry_price,
        OrderSide::Long,
        stop_loss,
        take_profit,
        &indicators,
    );

    assert_eq!(rationale.stop_loss_price, 58800.0);
    assert_eq!(rationale.take_profit_price, 62400.0);
    assert!((rationale.risk_distance_points - 1200.0).abs() < 1e-6);
    assert!((rationale.risk_distance_pct - 2.0).abs() < 1e-6);
    assert!((rationale.reward_distance_points - 2400.0).abs() < 1e-6);
    assert!((rationale.reward_distance_pct - 4.0).abs() < 1e-6);
    assert_eq!(rationale.risk_reward_ratio, 2.0);

    // Explicações textuais completas
    assert!(
        rationale
            .stop_loss_explanation
            .contains("Stop-Loss fixado em $58800.00"),
        "Explanation must detail stop loss"
    );
    assert!(
        rationale.stop_loss_explanation.contains("ATR"),
        "Explanation must mention ATR"
    );
    assert!(
        rationale
            .take_profit_explanation
            .contains("Take-Profit fixado em $62400.00"),
        "Explanation must detail take profit"
    );
    assert!(
        rationale.take_profit_explanation.contains("Bollinger"),
        "Explanation must mention Bollinger"
    );
}

#[test]
fn test_sqlite_persistence_and_restart_continuity() {
    let store = SqliteTradingStore::open_in_memory().expect("Should open in-memory SQLite store");

    let candles = generate_synthetic_candles(300, 30, 60000.0);
    let indicators = TechnicalIndicators::calculate(&candles).unwrap();
    let rationale = RiskRationale::build(60000.0, OrderSide::Long, 58800.0, 62400.0, &indicators);

    let mut pos = TradingPosition::new(
        "BTC-USDT",
        60000.0,
        0.15,
        OrderSide::Long,
        58800.0,
        62400.0,
        1700000000,
    )
    .with_rationale(rationale.clone())
    .with_trailing_stop(1.5);

    pos.update_price(59800.0);

    // 1. Salva no SQLite
    store
        .save_position(&pos, "OPEN")
        .expect("Should save position");

    // 2. Carrega do SQLite
    let open_positions = store
        .load_open_positions()
        .expect("Should load open positions");
    assert_eq!(open_positions.len(), 1);

    let loaded = &open_positions[0];
    assert_eq!(loaded.asset, "BTC-USDT");
    assert_eq!(loaded.entry_price, 60000.0);
    assert_eq!(loaded.quantity, 0.15);
    assert_eq!(loaded.side, OrderSide::Long);
    assert_eq!(loaded.stop_loss, 58800.0);
    assert_eq!(loaded.take_profit, 62400.0);
    assert_eq!(loaded.trailing_stop_pct, Some(1.5));
    assert!(loaded.rationale.is_some());
    assert_eq!(
        loaded.rationale.as_ref().unwrap().risk_reward_ratio,
        rationale.risk_reward_ratio
    );

    // 3. Testa restauração em um MultiAssetTraderEngine recém-inicializado (Simulação de Reboot)
    let config = MultiAssetConfig {
        initial_capital: 50000.0,
        ..Default::default()
    };
    let mut engine = MultiAssetTraderEngine::new(config).with_store(store.clone());

    let restored_count = engine
        .restore_open_positions_from_store()
        .expect("Should restore positions");
    assert_eq!(restored_count, 1);
    assert_eq!(engine.active_positions_count(), 1);

    let btc_engine = engine.engines.get("BTC-USDT").unwrap();
    assert!(btc_engine.current_position.is_some());
    assert_eq!(
        btc_engine.current_position.as_ref().unwrap().entry_price,
        60000.0
    );

    // 4. Marca posição como fechada no SQLite
    store
        .mark_position_closed("BTC-USDT", "CLOSED")
        .expect("Should mark closed");
    let after_closed = store
        .load_open_positions()
        .expect("Should query open positions");
    assert_eq!(after_closed.len(), 0, "No open positions should remain");
}

#[test]
fn test_multi_asset_portfolio_orchestration_and_limits() {
    let config = MultiAssetConfig {
        initial_capital: 30000.0,
        max_concurrent_positions: 2, // Limite rígido de no máximo 2 posições simultâneas
        max_portfolio_risk_pct: 10.0,
        max_risk_per_trade_pct: 2.0,
        max_trade_allocation_usd: 100.0,
        exchange_config: ExchangeSimulationConfig::zero_fee(),
        basket: DEFAULT_MULTI_ASSET_BASKET
            .iter()
            .map(|s| s.to_string())
            .collect(),
    };

    let mut desk = MultiAssetTraderEngine::new(config);
    assert_eq!(desk.active_positions_count(), 0);

    // Preenche motores com algumas velas
    for asset in DEFAULT_MULTI_ASSET_BASKET {
        let base = asset_baseline_price(asset);
        let candles = generate_synthetic_candles(100, 30, base);
        for c in candles {
            let _ = desk.feed_candle(asset, c);
        }
    }

    // Abre manualmente ou verifica compras
    let btc_engine = desk.engines.get_mut("BTC-USDT").unwrap();
    let _ = btc_engine.execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "BUY_1");

    let eth_engine = desk.engines.get_mut("ETH-USDT").unwrap();
    let _ = eth_engine.execute_order(TradingAction::Buy, OrderSide::Long, 3500.0, "BUY_2");

    assert_eq!(desk.active_positions_count(), 2);

    // Tentativa de abrir 3ª posição em SOL via feed_candle quando o limite é 2
    let sol_candle = Candle::new(1700001000, 150.0, 155.0, 149.0, 154.0, 100.0);
    let sol_exec = desk.feed_candle("SOL-USDT", sol_candle).unwrap();
    assert!(
        sol_exec.is_none(),
        "SOL order must be blocked by portfolio capacity limit"
    );
    assert_eq!(desk.active_positions_count(), 2);
}

#[test]
fn test_manual_1click_close_and_emergency_panic_kill_switch() {
    let config = MultiAssetConfig {
        initial_capital: 50000.0,
        max_concurrent_positions: 3,
        exchange_config: ExchangeSimulationConfig::zero_fee(),
        ..Default::default()
    };
    let mut desk = MultiAssetTraderEngine::new(config);

    // Abre BTC e ETH
    let btc = desk.engines.get_mut("BTC-USDT").unwrap();
    let _ = btc.execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "ENTRY");
    let eth = desk.engines.get_mut("ETH-USDT").unwrap();
    let _ = eth.execute_order(TradingAction::Buy, OrderSide::Long, 3500.0, "ENTRY");

    assert_eq!(desk.active_positions_count(), 2);

    // 1. Fechamento manual de 1 clique apenas em BTC
    let btc_closed = desk
        .close_position("BTC-USDT", "MANUAL_1CLICK_CLOSE")
        .expect("Should close position");
    assert!(btc_closed.is_some());
    assert_eq!(desk.active_positions_count(), 1);
    assert!(desk
        .engines
        .get("BTC-USDT")
        .unwrap()
        .current_position
        .is_none());
    assert!(desk
        .engines
        .get("ETH-USDT")
        .unwrap()
        .current_position
        .is_some());

    // 2. Parada de emergência (Kill Switch / Pânico)
    let closed_trades = desk
        .emergency_close_all("PANIC_BUTTON")
        .expect("Should emergency close all");
    assert_eq!(closed_trades.len(), 1); // Fechou a posição remanescente de ETH
    assert_eq!(desk.active_positions_count(), 0);
    assert!(desk.kill_switch_active);

    // 3. Reset do kill switch
    desk.reset_kill_switch();
    assert!(!desk.kill_switch_active);
}

#[test]
fn test_llm_market_regime_advisor_classification() {
    let mut advisor = LlmMarketRegimeAdvisor::new();
    let mut indicators_map = HashMap::new();

    // 1. Cenário Bullish: maioria dos ativos com SuperTrend de alta e EMA9 > EMA21
    for asset in DEFAULT_MULTI_ASSET_BASKET {
        let mut ind = TechnicalIndicators::default_at_price(100.0);
        ind.supertrend_direction = 1;
        ind.ema_9 = 105.0;
        ind.ema_21 = 98.0;
        ind.volatility_atr = 1.5;
        indicators_map.insert(asset.to_string(), (100.0, ind));
    }

    let report_bull = advisor.evaluate_regime(&indicators_map);
    assert_eq!(report_bull.regime, MarketRegime::StrongTrendingBull);
    assert!(report_bull.risk_multiplier >= 1.0);
    assert!(report_bull.consensus_bullish_pct >= 60.0);

    // 2. Cenário Bearish: maioria com SuperTrend de baixa e EMA9 < EMA21
    indicators_map.clear();
    for asset in DEFAULT_MULTI_ASSET_BASKET {
        let mut ind = TechnicalIndicators::default_at_price(100.0);
        ind.supertrend_direction = -1;
        ind.ema_9 = 95.0;
        ind.ema_21 = 102.0;
        ind.volatility_atr = 1.5;
        indicators_map.insert(asset.to_string(), (100.0, ind));
    }

    let report_bear = advisor.evaluate_regime(&indicators_map);
    assert_eq!(report_bear.regime, MarketRegime::StrongTrendingBear);
    assert!(report_bear.risk_multiplier < 1.0);

    // 3. Cenário High Volatility Spike: ATR > 4% do preço
    indicators_map.clear();
    for asset in DEFAULT_MULTI_ASSET_BASKET {
        let mut ind = TechnicalIndicators::default_at_price(100.0);
        ind.volatility_atr = 6.0; // 6% de volatilidade
        indicators_map.insert(asset.to_string(), (100.0, ind));
    }

    let report_spike = advisor.evaluate_regime(&indicators_map);
    assert_eq!(report_spike.regime, MarketRegime::HighVolatilitySpike);
    assert_eq!(report_spike.risk_multiplier, 0.5);
    assert_eq!(report_spike.max_recommended_positions, 1);
}

#[tokio::test]
async fn test_trading_desk_axum_http_api_endpoints() {
    let config = MultiAssetConfig {
        initial_capital: 50000.0,
        ..Default::default()
    };
    let desk = MultiAssetTraderEngine::new(config);
    let shared = Arc::new(parking_lot::RwLock::new(desk));

    let router = create_trading_desk_router(shared);

    // Liga um servidor TCP real em porta efêmera (porta 0)
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Should bind ephemeral TCP listener");
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let client = reqwest::Client::new();
    let base_url = format!("http://{}", addr);

    // 1. GET / -> Deve retornar o HTML do Cockpit
    let resp_html = client
        .get(format!("{}/", base_url))
        .send()
        .await
        .expect("GET / must succeed");
    assert_eq!(resp_html.status(), reqwest::StatusCode::OK);
    let text = resp_html.text().await.unwrap();
    assert!(text.contains("ALR Live Trading Desk"));

    // 2. GET /trading-desk -> Rota alternativa para o Cockpit
    let resp_alias = client
        .get(format!("{}/trading-desk", base_url))
        .send()
        .await
        .expect("GET /trading-desk must succeed");
    assert_eq!(resp_alias.status(), reqwest::StatusCode::OK);

    // 3. GET /api/v1/desk/status -> Retorna snapshot JSON
    let resp_status = client
        .get(format!("{}/api/v1/desk/status", base_url))
        .send()
        .await
        .expect("GET /api/v1/desk/status must succeed");
    assert_eq!(resp_status.status(), reqwest::StatusCode::OK);
    let snapshot: DeskStatusSnapshot = resp_status.json().await.unwrap();
    assert_eq!(snapshot.initial_capital, 50000.0);
    assert_eq!(snapshot.assets.len(), 7);

    // 4. GET /api/v1/desk/candles?asset=BTC-USDT -> Retorna velas
    let resp_candles = client
        .get(format!("{}/api/v1/desk/candles?asset=BTC-USDT", base_url))
        .send()
        .await
        .expect("GET /api/v1/desk/candles must succeed");
    assert_eq!(resp_candles.status(), reqwest::StatusCode::OK);
    let candles: Vec<Candle> = resp_candles.json().await.unwrap();
    assert!(!candles.is_empty());

    // 5. POST /api/v1/desk/adjust-stops -> Ajusta stops
    let resp_adjust = client
        .post(format!("{}/api/v1/desk/adjust-stops", base_url))
        .json(&AdjustStopsRequest {
            asset: "BTC-USDT".to_string(),
            stop_loss: Some(61000.0),
            take_profit: Some(66000.0),
        })
        .send()
        .await
        .expect("POST adjust-stops must succeed");
    assert_eq!(resp_adjust.status(), reqwest::StatusCode::OK);

    // 6. POST /api/v1/desk/close-position -> Fecha posição
    let resp_close = client
        .post(format!("{}/api/v1/desk/close-position", base_url))
        .json(&ClosePositionRequest {
            asset: "BTC-USDT".to_string(),
            reason: Some("TEST_HTTP_CLOSE".to_string()),
        })
        .send()
        .await
        .expect("POST close-position must succeed");
    assert_eq!(resp_close.status(), reqwest::StatusCode::OK);

    // 7. POST /api/v1/desk/emergency-stop -> Parada de pânico
    let resp_panic = client
        .post(format!("{}/api/v1/desk/emergency-stop", base_url))
        .json(&Some(EmergencyStopRequest {
            reason: Some("HTTP_PANIC_TEST".to_string()),
        }))
        .send()
        .await
        .expect("POST emergency-stop must succeed");
    assert_eq!(resp_panic.status(), reqwest::StatusCode::OK);

    // 8. POST /api/v1/desk/reset-strategy -> Reset
    let resp_reset = client
        .post(format!("{}/api/v1/desk/reset-strategy", base_url))
        .send()
        .await
        .expect("POST reset-strategy must succeed");
    assert_eq!(resp_reset.status(), reqwest::StatusCode::OK);

    // 9. POST /api/v1/desk/set-max-trade-usd -> Atualiza teto máximo por entrada
    let resp_set_max = client
        .post(format!("{}/api/v1/desk/set-max-trade-usd", base_url))
        .json(&serde_json::json!({ "max_usd": 50.0 }))
        .send()
        .await
        .expect("POST set-max-trade-usd must succeed");
    assert_eq!(resp_set_max.status(), reqwest::StatusCode::OK);

    // 10. GET /api/v1/desk/sizing-comparison -> Simulador contrafactual What-If
    let resp_sim = client
        .get(format!(
            "{}/api/v1/desk/sizing-comparison?simulated_max_usd=10.0",
            base_url
        ))
        .send()
        .await
        .expect("GET sizing-comparison must succeed");
    assert_eq!(resp_sim.status(), reqwest::StatusCode::OK);
    let sim_report: alr_connectors::trading::TradeSizingComparisonReport =
        resp_sim.json().await.unwrap();
    assert_eq!(sim_report.simulated_max_trade_usd, 10.0);
}

#[test]
fn test_max_trade_dollar_allocation_enforcement() {
    let config = MultiAssetConfig {
        initial_capital: 50000.0,
        max_trade_allocation_usd: 50.0, // Teto rígido de $50 por trade
        exchange_config: ExchangeSimulationConfig::zero_fee(),
        ..Default::default()
    };

    let mut desk = MultiAssetTraderEngine::new(config);
    assert_eq!(desk.config.max_trade_allocation_usd, 50.0);

    let btc = desk.engines.get_mut("BTC-USDT").unwrap();
    // Tenta dimensionar compra a $60,000 com Stop a 2% ($58,800)
    let qty = btc.calculate_position_size(60000.0, 58800.0);
    let allocated_usd = qty * 60000.0;

    assert!(
        allocated_usd <= 50.0,
        "Allocated amount ${:.2} must not exceed $50.00 ceiling",
        allocated_usd
    );
    assert!(allocated_usd > 0.0, "Must allocate valid non-zero amount");

    // Atualiza dinamicamente o teto para $25.0
    desk.set_max_trade_allocation_usd(25.0);
    assert_eq!(desk.config.max_trade_allocation_usd, 25.0);

    let eth = desk.engines.get_mut("ETH-USDT").unwrap();
    let eth_qty = eth.calculate_position_size(3500.0, 3430.0);
    let eth_allocated = eth_qty * 3500.0;

    assert!(
        eth_allocated <= 25.0,
        "Updated allocation ${:.2} must not exceed $25.00 ceiling",
        eth_allocated
    );
}

#[test]
fn test_what_if_trade_sizing_comparison_calculation() {
    let mut desk = MultiAssetTraderEngine::new(MultiAssetConfig::default());

    // Simula 2 trades encerrados:
    // Trade 1: Custo real $50.00, PnL real +$5.00 (+10% gain)
    let btc = desk.engines.get_mut("BTC-USDT").unwrap();
    btc.trade_history.push(TradeExecution {
        id: "t1".to_string(),
        timestamp: 1700000000,
        asset: "BTC-USDT".to_string(),
        action: TradingAction::ClosePosition,
        side: OrderSide::Long,
        price: 55.0,
        quantity: 1.0,
        fee: 0.0,
        slippage: 0.0,
        realized_pnl: Some(5.0),
        reason: "PROFIT".to_string(),
    });

    // Trade 2: Custo real $60.00, PnL real -$3.00 (-5% loss)
    btc.trade_history.push(TradeExecution {
        id: "t2".to_string(),
        timestamp: 1700000100,
        asset: "BTC-USDT".to_string(),
        action: TradingAction::ClosePosition,
        side: OrderSide::Long,
        price: 57.0,
        quantity: 1.0,
        fee: 0.0,
        slippage: 0.0,
        realized_pnl: Some(-3.0),
        reason: "STOP".to_string(),
    });

    // Executa análise contrafactual com teto de $10.00 por entrada
    let report = desk.compute_trade_sizing_comparison(10.0);

    assert_eq!(report.total_closed_trades, 2);
    assert_eq!(report.winning_trades, 1);
    assert_eq!(report.losing_trades, 1);
    assert_eq!(report.win_rate_pct, 50.0);

    assert!(report.real_total_invested_usd > 100.0);
    assert_eq!(report.real_total_pnl_usd, 2.0); // +5 - 3 = +2

    // Simulado:
    // Com teto de $10:
    // Trade 1 escala para $10 (10/50 = 0.2) -> PnL simulado = 5 * 0.2 = +$1.00
    // Trade 2 escala para $10 (10/60 = 0.1667) -> PnL simulado = -3 * 0.1667 = -$0.50
    // PnL simulado líquido = +$0.50
    assert_eq!(report.simulated_total_invested_usd, 20.0);
    assert!((report.simulated_total_pnl_usd - 0.50).abs() < 0.01);
    assert!(report.capital_reduction_pct > 80.0);
    assert!(!report.summary_explanation.is_empty());
}

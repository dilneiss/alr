//! Suíte de Testes de Integração da Fase 41:
//! Forex (FX) Trading Engine, OANDA v20 REST API, MetaTrader 5 Bridge, Pip Calculator e Web Cockpit

use alr_connectors::trading::{
    asset_baseline_price, generate_forex_candles, is_forex_symbol, parse_oanda_candles_response,
    ForexConnector, ForexLotType, ForexPipCalculator, MarketCategory, MetaTraderBridgeConnector,
    MultiAssetTraderEngine, OandaTestnetConnector, OrderSide, FOREX_MAJOR_BASKET,
};
use alr_connectors::trading_desk::{
    create_trading_desk_router, ForexBrokerConfigRequest, ForexOrderRequest,
};
use std::sync::Arc;

#[test]
fn test_forex_primitives_pip_calculator_and_lot_types() {
    // 1. Verificação da cesta oficial Forex Majors
    assert_eq!(FOREX_MAJOR_BASKET.len(), 7);
    assert!(is_forex_symbol("EUR-USD"));
    assert!(is_forex_symbol("USD-JPY"));
    assert!(is_forex_symbol("GBP-USD"));
    assert!(!is_forex_symbol("BTC-USDT"));

    // 2. Pip Size e Casas Decimais
    assert_eq!(ForexPipCalculator::pip_size("EUR-USD"), 0.0001);
    assert_eq!(ForexPipCalculator::pip_size("GBP-USD"), 0.0001);
    assert_eq!(ForexPipCalculator::pip_size("USD-JPY"), 0.01);
    assert_eq!(ForexPipCalculator::decimal_places("EUR-USD"), 5);
    assert_eq!(ForexPipCalculator::decimal_places("USD-JPY"), 3);

    // 3. Cálculo de Pips
    let pips_eur = ForexPipCalculator::calculate_pips("EUR-USD", 1.0850, 1.0875);
    assert!((pips_eur - 25.0).abs() < 1e-4);

    let pips_jpy = ForexPipCalculator::calculate_pips("USD-JPY", 154.20, 154.50);
    assert!((pips_jpy - 30.0).abs() < 1e-4);

    // 4. Lotes e Unidades
    assert_eq!(ForexLotType::Standard.units(), 100_000.0);
    assert_eq!(ForexLotType::Mini.units(), 10_000.0);
    assert_eq!(ForexLotType::Micro.units(), 1_000.0);
    assert_eq!(ForexLotType::from_lots(0.10).units(), 10_000.0);
    assert_eq!(ForexLotType::from_lots(0.01).units(), 1_000.0);

    // 5. Pip Value em USD
    // 1 Pip no EUR/USD com 100k unidades (Standard Lot) = 0.0001 * 100_000 = $10.00
    let pip_val_std = ForexPipCalculator::pip_value_usd("EUR-USD", 100_000.0, 1.0850);
    assert!((pip_val_std - 10.0).abs() < 1e-4);

    // 1 Pip no EUR/USD com 10k unidades (Mini Lot) = $1.00
    let pip_val_mini = ForexPipCalculator::pip_value_usd("EUR-USD", 10_000.0, 1.0850);
    assert!((pip_val_mini - 1.0).abs() < 1e-4);

    // 6. Cálculo de PnL em USD
    // Long de 1.0850 até 1.0870 (+20 pips), com spread de 0.8 pips no Mini Lot (10k un = $1/pip)
    // PnL Líquido = (20.0 - 0.8) * $1.00 = $19.20
    let pnl = ForexPipCalculator::calculate_pnl_usd(
        "EUR-USD",
        OrderSide::Long,
        1.0850,
        1.0870,
        10_000.0,
        0.8,
    );
    assert!((pnl - 19.20).abs() < 1e-2);
}

#[tokio::test]
async fn test_oanda_v20_candles_parsing_and_market_order() {
    // 1. JSON fixture similar ao endpoint /v3/instruments/EUR_USD/candles da OANDA v20
    let oanda_json = serde_json::json!({
        "instrument": "EUR_USD",
        "granularity": "M1",
        "candles": [
            {
                "complete": true,
                "volume": 128,
                "time": "2026-09-28T12:00:00.000000000Z",
                "mid": {
                    "o": "1.08500",
                    "h": "1.08540",
                    "l": "1.08480",
                    "c": "1.08530"
                }
            },
            {
                "complete": true,
                "volume": 215,
                "time": "2026-09-28T12:01:00.000000000Z",
                "mid": {
                    "o": "1.08530",
                    "h": "1.08580",
                    "l": "1.08510",
                    "c": "1.08560"
                }
            }
        ]
    });

    let candles = parse_oanda_candles_response(&oanda_json).expect("Deve parsear velas OANDA");
    assert_eq!(candles.len(), 2);
    assert_eq!(candles[0].open, 1.08500);
    assert_eq!(candles[0].high, 1.08540);
    assert_eq!(candles[0].low, 1.08480);
    assert_eq!(candles[0].close, 1.08530);
    assert_eq!(candles[0].volume, 128.0);
    assert_eq!(candles[1].close, 1.08560);

    // 2. Conector OANDA em modo Simulação/Mock
    let oanda = OandaTestnetConnector::mock();
    assert!(!oanda.is_live()); // Chave mock inicia em modo determinístico seguro

    let fetched = oanda
        .fetch_candles("EUR-USD", "M1", 20)
        .await
        .expect("Deve gerar velas determinísticas de fallback");
    assert_eq!(fetched.len(), 20);

    // 3. Despacho de Ordem de Mercado
    let order_resp = oanda
        .place_market_order("EUR-USD", 10_000.0, Some(1.0800), Some(1.0950))
        .await
        .expect("Deve executar ordem OANDA");
    assert_eq!(order_resp.status, "FILLED");
    assert_eq!(order_resp.instrument, "EUR_USD");
    assert_eq!(order_resp.units, 10_000.0);
    assert!(order_resp.price > 1.0);
}

#[tokio::test]
async fn test_metatrader_5_bridge_order_simulation() {
    let mt5 = MetaTraderBridgeConnector::new(None, Some(888123));
    assert_eq!(
        MetaTraderBridgeConnector::format_symbol("EUR-USD"),
        "EURUSD"
    );
    assert_eq!(
        MetaTraderBridgeConnector::format_symbol("USD/JPY"),
        "USDJPY"
    );

    let ord_resp = mt5
        .send_order("EUR-USD", "BUY", 0.10, Some(1.0800), Some(1.0950))
        .await
        .expect("Deve despachar ordem para o MT5 Bridge");
    assert_eq!(ord_resp.symbol, "EURUSD");
    assert_eq!(ord_resp.order_type, "BUY");
    assert_eq!(ord_resp.lots, 0.10);
    assert!(ord_resp.ticket > 0);
}

#[tokio::test]
async fn test_forex_connector_facade_and_quote_generation() {
    let connector = ForexConnector::paper();
    assert_eq!(connector.name(), "Forex Paper Trading Desk");

    let quote = connector.get_quote("EUR-USD", 1.0850);
    assert_eq!(quote.symbol, "EUR-USD");
    assert!(quote.bid < quote.ask);
    assert_eq!(quote.spread_pips, 0.8);
    assert_eq!(quote.pip_value_standard_lot, 10.0);

    let pos = connector
        .place_order("EUR-USD", OrderSide::Long, 0.10, Some(1.0800), Some(1.0950))
        .await
        .expect("Deve abrir posição de paper trading Forex");
    assert_eq!(pos.symbol, "EUR-USD");
    assert_eq!(pos.lots, 0.10);
    assert_eq!(pos.units, 10_000.0);
    assert_eq!(pos.side, OrderSide::Long);
}

#[test]
fn test_multi_asset_trader_engine_forex_basket() {
    // 1. Inicializa o motor com a cesta de Forex
    let mut engine = MultiAssetTraderEngine::new_forex(50_000.0);
    assert_eq!(engine.market_category(), MarketCategory::Forex);
    assert_eq!(engine.config.basket.len(), 7);

    // 2. Alimenta velas para EUR-USD
    let baseline = asset_baseline_price("EUR-USD");
    assert!((baseline - 1.0850).abs() < 1e-4);

    let candles = generate_forex_candles(42, 60, baseline, "EUR-USD");
    assert_eq!(candles.len(), 60);

    for candle in candles {
        let _ = engine.feed_candle("EUR-USD", candle);
    }

    // 3. Snapshot do Desk deve refletir os dados Forex
    let snapshot = engine.get_desk_snapshot();
    assert_eq!(snapshot.market_category, MarketCategory::Forex);

    let eur = snapshot
        .assets
        .iter()
        .find(|a| a.asset == "EUR-USD")
        .expect("Deve encontrar EUR-USD");
    assert!(eur.is_forex);
    assert!(eur.spread_pips > 0.0);
    assert!(eur.bid > 0.0);
    assert!(eur.ask >= eur.bid);
    assert!(eur.pip_value_usd > 0.0);
}

#[tokio::test]
async fn test_trading_desk_forex_api_endpoints() {
    let engine = Arc::new(parking_lot::RwLock::new(MultiAssetTraderEngine::new_forex(
        50_000.0,
    )));
    let router = create_trading_desk_router(engine);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Listener");
    let local_addr = listener.local_addr().expect("Addr");

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let client = reqwest::Client::new();

    // 1. Teste GET /api/v1/desk/forex/pairs
    let resp = client
        .get(format!("http://{}/api/v1/desk/forex/pairs", local_addr))
        .send()
        .await
        .expect("GET forex/pairs");
    assert_eq!(resp.status(), reqwest::StatusCode::OK);

    let pairs: Vec<serde_json::Value> = resp.json().await.expect("Json pairs");
    assert_eq!(pairs.len(), 7);
    assert_eq!(pairs[0]["symbol"], "EUR-USD");
    assert_eq!(pairs[0]["pip_size"], 0.0001);

    // 2. Teste GET /api/v1/desk/forex/quotes
    let resp = client
        .get(format!("http://{}/api/v1/desk/forex/quotes", local_addr))
        .send()
        .await
        .expect("GET forex/quotes");
    assert_eq!(resp.status(), reqwest::StatusCode::OK);

    // 3. Teste POST /api/v1/desk/forex/order
    let order_req = ForexOrderRequest {
        symbol: "EUR-USD".to_string(),
        side: "BUY".to_string(),
        lots: Some(0.10),
        stop_loss: Some(1.0800),
        take_profit: Some(1.0950),
        broker: Some("paper".to_string()),
    };

    let resp = client
        .post(format!("http://{}/api/v1/desk/forex/order", local_addr))
        .json(&order_req)
        .send()
        .await
        .expect("POST forex/order");
    assert_eq!(resp.status(), reqwest::StatusCode::OK);

    let json: serde_json::Value = resp.json().await.expect("Json order result");
    assert_eq!(json["success"], true);
    assert_eq!(json["position"]["symbol"], "EUR-USD");

    // 4. Teste POST /api/v1/desk/forex/config
    let config_req = ForexBrokerConfigRequest {
        broker_type: "oanda".to_string(),
        oanda_account_id: Some("101-004-1234567-001".to_string()),
        oanda_token: Some("mock_token".to_string()),
        mt5_bridge_url: None,
    };

    let resp = client
        .post(format!("http://{}/api/v1/desk/forex/config", local_addr))
        .json(&config_req)
        .send()
        .await
        .expect("POST forex/config");
    assert_eq!(resp.status(), reqwest::StatusCode::OK);
}

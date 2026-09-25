//! Suíte de Testes de Integração da Fase 24:
//! Conector Oficial Bybit Testnet V5 API e Motor de Trading Quantitativo
//!
//! Validações rigorosas de:
//! 1. Assinatura criptográfica HMAC-SHA256 conforme especificação oficial Bybit V5.
//! 2. Parsing e ordenação cronológica de candles da Bybit para o formato `Candle` do ALR.
//! 3. Serialização, deserialização e validação de `BybitOrderRequest` com Stop-Loss e Take-Profit.
//! 4. Resiliência e simulação offline/mock do `BybitTestnetConnector`.
//! 5. Confluência de indicadores técnicos e avaliação de ordens no motor.

use alr_connectors::trading::{
    parse_bybit_kline_response, BybitOrderRequest, BybitTestnetConnector, CryptoTraderEngine,
    ExchangeSimulationConfig, RiskPolicy, TechnicalIndicators,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[test]
fn test_bybit_v5_hmac_sha256_signature_specification() {
    let timestamp: u64 = 1658385579423;
    let api_key = "bybit_test_api_key_123";
    let recv_window: u64 = 5000;
    let query_payload = "category=spot&symbol=BTCUSDT";
    let secret = "bybit_test_secret_key_456";

    // 1. Cálculo independente de referência conforme especificação Bybit V5:
    // data_to_sign = timestamp + api_key + recv_window + query_or_body
    let data_to_sign = format!("{}{}{}{}", timestamp, api_key, recv_window, query_payload);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC slice initialization");
    mac.update(data_to_sign.as_bytes());
    let expected_signature = hex::encode(mac.finalize().into_bytes());

    // 2. Assinatura gerada pelo BybitTestnetConnector::sign
    let actual_signature =
        BybitTestnetConnector::sign(timestamp, api_key, recv_window, query_payload, secret)
            .expect("Signature calculation should succeed");

    assert_eq!(
        actual_signature, expected_signature,
        "Bybit V5 HMAC-SHA256 signature must strictly match reference"
    );
    assert_eq!(
        actual_signature.len(),
        64,
        "SHA256 hex signature must be 64 characters"
    );

    // 3. Teste com JSON payload (POST request)
    let json_payload =
        r#"{"category":"spot","orderType":"Market","qty":"0.05","side":"Buy","symbol":"BTCUSDT"}"#;
    let json_signature =
        BybitTestnetConnector::sign(timestamp, api_key, recv_window, json_payload, secret)
            .expect("JSON signature calculation should succeed");
    assert_eq!(json_signature.len(), 64);
    assert_ne!(
        actual_signature, json_signature,
        "Signatures with different payloads must differ"
    );

    // 4. Teste de método em instância
    let connector = BybitTestnetConnector::new(Some(api_key.to_string()), Some(secret.to_string()))
        .with_recv_window(recv_window);

    let instance_sig = connector
        .sign_request(timestamp, query_payload)
        .expect("Instance signature should compute")
        .expect("Key and secret present");
    assert_eq!(instance_sig, expected_signature);
}

#[test]
fn test_bybit_kline_json_parsing_and_chronological_ordering() {
    // A Bybit V5 retorna os candles em ordem cronológica REVERSA (mais recente primeiro: index 0).
    // O ALR exige ordem cronológica DIRETA (mais antigo primeiro -> mais recente no final)
    // para cálculo correto de SMA, EMA, RSI e MACD.
    let bybit_json = serde_json::json!({
        "retCode": 0,
        "retMsg": "OK",
        "result": {
            "category": "spot",
            "symbol": "BTCUSDT",
            "list": [
                // Candle 3: t = 1670612400000 (mais recente)
                ["1670612400000", "64200.0", "64500.0", "64150.0", "64400.0", "12.50", "804000"],
                // Candle 2: t = 1670608800000
                ["1670608800000", "64000.0", "64300.0", "63950.0", "64200.0", "15.00", "963000"],
                // Candle 1: t = 1670605200000 (mais antigo)
                ["1670605200000", "63800.0", "64100.0", "63700.0", "64000.0", "10.00", "640000"]
            ]
        }
    });

    let candles = parse_bybit_kline_response(&bybit_json).expect("Kline parsing should succeed");
    assert_eq!(candles.len(), 3);

    // Validação de ordenação cronológica estrita
    assert_eq!(
        candles[0].timestamp, 1670605200000,
        "Primeiro candle deve ser o mais antigo"
    );
    assert_eq!(
        candles[1].timestamp, 1670608800000,
        "Segundo candle deve ser intermediário"
    );
    assert_eq!(
        candles[2].timestamp, 1670612400000,
        "Terceiro candle deve ser o mais recente"
    );

    // Validação de dados numéricos
    assert_eq!(candles[0].open, 63800.0);
    assert_eq!(candles[0].high, 64100.0);
    assert_eq!(candles[0].low, 63700.0);
    assert_eq!(candles[0].close, 64000.0);
    assert_eq!(candles[0].volume, 10.0);
    assert!(candles[0].is_bullish());

    assert_eq!(candles[2].close, 64400.0);
    assert_eq!(candles[2].range(), 350.0); // 64500 - 64150
}

#[test]
fn test_bybit_order_request_serialization_and_validation() {
    // 1. Ordem de Compra a Mercado com Stop-Loss e Take-Profit
    let market_order = BybitOrderRequest::market_buy("spot", "BTCUSDT", 0.025)
        .with_stop_loss(62500.0)
        .with_take_profit(68000.0)
        .with_order_link_id("alr-custom-order-001");

    assert_eq!(market_order.category, "spot");
    assert_eq!(market_order.symbol, "BTCUSDT");
    assert_eq!(market_order.side, "Buy");
    assert_eq!(market_order.order_type, "Market");
    assert_eq!(market_order.qty, 0.025);
    assert_eq!(market_order.stop_loss, Some(62500.0));
    assert_eq!(market_order.take_profit, Some(68000.0));
    assert_eq!(
        market_order.order_link_id.as_deref(),
        Some("alr-custom-order-001")
    );

    // Serialização para JSON compatível com Bybit V5
    let json_val = serde_json::to_value(&market_order).expect("Serialization should succeed");
    assert_eq!(json_val["category"], "spot");
    assert_eq!(json_val["symbol"], "BTCUSDT");
    assert_eq!(json_val["side"], "Buy");
    assert_eq!(json_val["orderType"], "Market");
    assert_eq!(json_val["stopLoss"], 62500.0);
    assert_eq!(json_val["takeProfit"], 68000.0);
    assert_eq!(json_val["orderLinkId"], "alr-custom-order-001");
    assert!(json_val.get("price").is_none());

    // 2. Ordem de Venda Limitada
    let limit_order =
        BybitOrderRequest::limit_sell("spot", "ETHUSDT", 0.5, 3600.0).with_stop_loss(3700.0);
    assert_eq!(limit_order.side, "Sell");
    assert_eq!(limit_order.order_type, "Limit");
    assert_eq!(limit_order.price, Some(3600.0));
    assert_eq!(limit_order.stop_loss, Some(3700.0));
}

#[tokio::test]
async fn test_bybit_connector_mock_and_offline_resilience() {
    let connector = BybitTestnetConnector::mock();
    assert!(connector.is_mock());
    assert!(!connector.is_live());
    assert_eq!(
        connector.base_url,
        BybitTestnetConnector::DEFAULT_TESTNET_URL
    );

    let live_connector = BybitTestnetConnector::new(
        Some("live_api_key_abc".to_string()),
        Some("live_secret_key_xyz".to_string()),
    );
    assert!(live_connector.is_live());
    assert!(!live_connector.is_mock());
    // 1. Consulta de horário do servidor (offline fallback seguro para epoch ms)
    let server_time = connector
        .get_server_time()
        .await
        .expect("Server time should return valid timestamp");
    assert!(
        server_time > 1_600_000_000_000,
        "Timestamp must be realistic epoch ms"
    );

    // 2. Consulta de Tickers
    let ticker = connector
        .get_tickers("spot", "BTCUSDT")
        .await
        .expect("Ticker fetch should succeed");
    assert_eq!(ticker.symbol, "BTCUSDT");
    assert!(ticker.last_price > 0.0);
    assert!(ticker.bid_price > 0.0);
    assert!(ticker.ask_price >= ticker.bid_price);
    assert!(ticker.spread >= 0.0);

    // 3. Consulta de saldo virtual
    let balance = connector
        .get_wallet_balance("UNIFIED", "USDT")
        .await
        .expect("Wallet balance should succeed");
    assert!(
        balance >= 10000.0,
        "Testnet virtual balance should be >= 10000"
    );

    // 4. Criação e envio de ordem simulada
    let order_req = BybitOrderRequest::market_buy("spot", "BTCUSDT", 0.01)
        .with_stop_loss(63000.0)
        .with_take_profit(67000.0);
    let order_resp = connector
        .place_order(order_req)
        .await
        .expect("Place order should succeed");
    assert_eq!(order_resp.status, "Created");
    assert_eq!(order_resp.ret_code, 0);
    assert!(!order_resp.order_id.is_empty());

    // 5. Consulta de status da ordem
    let status = connector
        .check_order_status("spot", "BTCUSDT", &order_resp.order_id)
        .await
        .expect("Order status check should succeed");
    assert_eq!(status, "Filled");

    // 6. Cancelamento de ordem
    let cancelled = connector
        .cancel_order("spot", "BTCUSDT", &order_resp.order_id)
        .await
        .expect("Order cancel should succeed");
    assert!(cancelled);
}

#[tokio::test]
async fn test_bybit_kline_download_and_technical_confluence() {
    let connector = BybitTestnetConnector::mock();
    let candles = connector
        .get_kline("spot", "BTCUSDT", "15", 35)
        .await
        .expect("Kline fetch should succeed");

    assert_eq!(candles.len(), 35, "Deve carregar exatamente 35 candles");

    // Cálculo dos indicadores no conjunto de velas
    let indicators = TechnicalIndicators::calculate(&candles)
        .expect("Technical indicators calculation should succeed");

    assert!(indicators.sma_20 > 0.0);
    assert!(indicators.ema_9 > 0.0);
    assert!(indicators.ema_21 > 0.0);
    assert!((0.0..=100.0).contains(&indicators.rsi_14));
    assert!(indicators.volatility_atr > 0.0);

    // Integração com o CryptoTraderEngine
    let mut engine = CryptoTraderEngine::new(
        "BTCUSDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::bybit(),
    );

    for candle in &candles {
        let _ = engine.on_candle(candle.clone());
    }

    let last_price = candles.last().map(|c| c.close).unwrap_or(65000.0);
    let signal = engine.evaluate_signal(&indicators, last_price);
    // O sinal deve ser um dos sinais técnicos válidos
    match signal {
        alr_connectors::trading::TradingSignal::Buy
        | alr_connectors::trading::TradingSignal::Sell
        | alr_connectors::trading::TradingSignal::Hold
        | alr_connectors::trading::TradingSignal::StopLoss
        | alr_connectors::trading::TradingSignal::TakeProfit
        | alr_connectors::trading::TradingSignal::EarlyExit => {}
    }
}

#[test]
fn test_bybit_hmac_tamper_detection() {
    let timestamp: u64 = 1700000000000;
    let key = "auth_key";
    let recv = 5000;
    let query = "category=spot&symbol=ETHUSDT";
    let secret = "auth_secret";

    let original_sig =
        BybitTestnetConnector::sign(timestamp, key, recv, query, secret).expect("Valid signature");

    // 1. Timestamp adulterado altera assinatura
    let tampered_time = BybitTestnetConnector::sign(timestamp + 1, key, recv, query, secret)
        .expect("Valid signature");
    assert_ne!(original_sig, tampered_time);

    // 2. Secret adulterado altera assinatura
    let tampered_secret = BybitTestnetConnector::sign(timestamp, key, recv, query, "wrong_secret")
        .expect("Valid signature");
    assert_ne!(original_sig, tampered_secret);

    // 3. Payload adulterado altera assinatura
    let tampered_query =
        BybitTestnetConnector::sign(timestamp, key, recv, "category=spot&symbol=SOLUSDT", secret)
            .expect("Valid signature");
    assert_ne!(original_sig, tampered_query);
}

#[test]
fn test_bybit_kline_empty_or_malformed_handling() {
    // JSON sem array 'list'
    let bad_json = serde_json::json!({
        "retCode": 10001,
        "retMsg": "Params error"
    });
    assert!(parse_bybit_kline_response(&bad_json).is_err());

    // JSON com 'list' vazio
    let empty_json = serde_json::json!({
        "retCode": 0,
        "result": {
            "list": []
        }
    });
    let empty_candles = parse_bybit_kline_response(&empty_json).expect("Should parse empty");
    assert!(empty_candles.is_empty());
}

#[test]
fn test_bybit_order_builder_combinations() {
    let limit_buy = BybitOrderRequest::limit_buy("linear", "SOLUSDT", 2.0, 145.5)
        .with_stop_loss(140.0)
        .with_take_profit(160.0)
        .with_order_link_id("sol-buy-01");

    assert_eq!(limit_buy.category, "linear");
    assert_eq!(limit_buy.side, "Buy");
    assert_eq!(limit_buy.order_type, "Limit");
    assert_eq!(limit_buy.price, Some(145.5));
    assert_eq!(limit_buy.stop_loss, Some(140.0));
    assert_eq!(limit_buy.take_profit, Some(160.0));
    assert_eq!(limit_buy.order_link_id.as_deref(), Some("sol-buy-01"));

    let market_sell = BybitOrderRequest::market_sell("spot", "BTCUSDT", 0.05)
        .with_stop_loss(67000.0)
        .with_price(65000.0);

    assert_eq!(market_sell.side, "Sell");
    assert_eq!(market_sell.order_type, "Market");
    assert_eq!(market_sell.price, Some(65000.0));
}

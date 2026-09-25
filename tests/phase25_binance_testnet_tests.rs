//! Suíte de Testes de Integração da Fase 25:
//! Conector Oficial Binance Spot Testnet API (https://testnet.binance.vision)
//!
//! Validações rigorosas de:
//! 1. Assinatura criptográfica HMAC-SHA256 conforme especificação oficial Binance Spot API.
//! 2. Detecção de violação e adulteração (tamper detection) de assinatura HMAC-SHA256.
//! 3. Parsing e ordenação cronológica de klines/candles da Binance para `Candle` do ALR.
//! 4. Tratamento resiliente de JSON malformado ou vazio em klines da Binance.
//! 5. Conector `BinanceTestnetConnector` em modo mock e resiliência offline (ping, time, price, bookTicker).
//! 6. Leitura e parsing de saldos da conta Spot Testnet (`get_account_balances`).
//! 7. Envio, despacho e validação de ordens Market e Limit (`place_order`, `check_order_status`, `cancel_order`).
//! 8. Confluência técnica de indicadores (RSI, EMA, MACD, ATR) e motor `CryptoTraderEngine`.

use alr_connectors::trading::{
    generate_paper_market_snapshot, parse_binance_kline_response, BinanceOrderResponse,
    BinanceTestnetConnector, CryptoTraderEngine, ExchangeSimulationConfig, MarketSnapshot,
    RiskPolicy, TechnicalIndicators,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// 1. Validação da assinatura HMAC-SHA256 com o vetor de teste oficial da Binance Spot API.
///
/// Documentação oficial da Binance:
/// - Secret: NhqPtMDavW1vEvioSpK6mEfdgxdGMTV8ChKlUSSay7KFYZXhBgQluUzGhEsXd3
/// - Query : symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559
/// - Esperado: 298b607bf77b1ab3271da4b3d768e9513a724cdd035b5b8d0dec2c60b7f48fad
#[test]
fn test_binance_hmac_sha256_official_test_vector() {
    let secret = "NhqPtMDavW1vEvioSpK6mEfdgxdGMTV8ChKlUSSay7KFYZXhBgQluUzGhEsXd3";
    let query_string = "symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559";
    let expected_sig = "298b607bf77b1ab3271da4b3d768e9513a724cdd035b5b8d0dec2c60b7f48fad";

    let signature = BinanceTestnetConnector::sign(query_string, secret)
        .expect("Falha ao gerar assinatura HMAC-SHA256");

    assert_eq!(
        signature, expected_sig,
        "Assinatura gerada diverge do vetor de teste oficial da Binance Spot API"
    );

    // Validação independente usando crate hmac diretamente
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(query_string.as_bytes());
    let independent_sig = hex::encode(mac.finalize().into_bytes());

    assert_eq!(signature, independent_sig);
}

/// 2. Detecção de adulteração (tamper detection) na assinatura criptográfica
#[test]
fn test_binance_hmac_tamper_detection() {
    let secret = "secret_binance_testnet_123";
    let query = "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1700000000000";

    let original_sig = BinanceTestnetConnector::sign(query, secret).unwrap();

    // Modificação de 1 caractere no payload
    let tampered_query =
        "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.002&timestamp=1700000000000";
    let tampered_sig = BinanceTestnetConnector::sign(tampered_query, secret).unwrap();

    assert_ne!(
        original_sig, tampered_sig,
        "Assinatura HMAC deve ser sensível a qualquer alteração de payload"
    );

    // Modificação de 1 caractere no secret
    let wrong_secret = "secret_binance_testnet_124";
    let wrong_sig = BinanceTestnetConnector::sign(query, wrong_secret).unwrap();

    assert_ne!(
        original_sig, wrong_sig,
        "Assinatura HMAC deve divergir com secret incorreto"
    );
}

/// 3. Parsing e ordenação cronológica de klines/candles da Binance Spot API
#[test]
fn test_binance_kline_json_parsing_and_chronological_ordering() {
    let raw_json = serde_json::json!([
        [
            1680000060000i64, // t1: segundo candle
            "28100.00",       // open
            "28250.00",       // high
            "28050.00",       // low
            "28200.00",       // close
            "45.1234",        // volume
            1680000119999i64, // close time
            "1270000.00",     // quote volume
            120,              // trades
            "25.0000",        // taker buy base
            "705000.00",      // taker buy quote
            "0"               // ignore
        ],
        [
            1680000000000i64, // t0: primeiro candle (fora de ordem propositalmente)
            "28000.00",
            "28150.00",
            "27950.00",
            "28100.00",
            "52.9876",
            1680000059999i64,
            "1480000.00",
            150,
            "30.0000",
            "843000.00",
            "0"
        ],
        [
            1680000120000i64, // t2: terceiro candle
            "28200.00",
            "28400.00",
            "28180.00",
            "28350.00",
            "60.5555",
            1680000179999i64,
            "1715000.00",
            180,
            "35.0000",
            "990000.00",
            "0"
        ]
    ]);

    let candles = parse_binance_kline_response(&raw_json)
        .expect("Deveria parsear os klines da Binance com sucesso");

    assert_eq!(candles.len(), 3);

    // Valida ordenação cronológica estrita (t0 < t1 < t2)
    assert_eq!(candles[0].timestamp, 1680000000000);
    assert_eq!(candles[1].timestamp, 1680000060000);
    assert_eq!(candles[2].timestamp, 1680000120000);

    // Valida conversão dos campos numéricos
    assert_eq!(candles[0].open, 28000.0);
    assert_eq!(candles[0].high, 28150.0);
    assert_eq!(candles[0].low, 27950.0);
    assert_eq!(candles[0].close, 28100.0);
    assert_eq!(candles[0].volume, 52.9876);

    assert_eq!(candles[2].high, 28400.0);
    assert_eq!(candles[2].close, 28350.0);
}

/// 4. Tratamento resiliente de JSON malformado ou vazio
#[test]
fn test_binance_kline_empty_or_malformed_handling() {
    let empty_json = serde_json::json!([]);
    let candles = parse_binance_kline_response(&empty_json).unwrap();
    assert!(candles.is_empty());

    let malformed_json = serde_json::json!({ "code": -1121, "msg": "Invalid symbol." });
    assert!(parse_binance_kline_response(&malformed_json).is_err());

    let partial_elements = serde_json::json!([
        [1680000000000i64, "28000.00", "28150.00"] // Menos de 6 elementos
    ]);
    let candles = parse_binance_kline_response(&partial_elements).unwrap();
    assert!(
        candles.is_empty(),
        "Itens incompletos devem ser ignorados com segurança"
    );
}

/// 5. Resiliência do `BinanceTestnetConnector` em modo Mock e Sonda de Conexão
#[tokio::test]
async fn test_binance_connector_mock_and_offline_resilience() {
    let connector = BinanceTestnetConnector::mock();

    assert!(connector.is_mock());
    assert!(!connector.is_live());
    assert_eq!(
        connector.base_url,
        BinanceTestnetConnector::DEFAULT_TESTNET_URL
    );
    assert_eq!(connector.recv_window, 5000);

    // Ping
    let ping_res = connector.ping().await;
    assert!(ping_res.is_ok());
    assert!(ping_res.unwrap());

    // Server time
    let server_time = connector.get_server_time().await.unwrap();
    assert!(server_time > 1700000000000);

    // Preço instantâneo
    let btc_price = connector.get_price("BTCUSDT").await.unwrap();
    assert!(btc_price > 0.0);

    let eth_price = connector.get_price("ETHUSDT").await.unwrap();
    assert!(eth_price > 0.0);

    // Book Ticker
    let (bid, ask) = connector.get_book_ticker("BTCUSDT").await.unwrap();
    assert!(bid > 0.0);
    assert!(ask > 0.0);
    assert!(ask >= bid);
}

/// 6. Consulta e parsing de saldos da carteira de testes
#[tokio::test]
async fn test_binance_get_account_balances() {
    let connector = BinanceTestnetConnector::mock();
    let balances = connector.get_account_balances().await.unwrap();

    assert!(!balances.is_empty());
    assert!(balances.contains_key("USDT"));
    assert!(balances.contains_key("BTC"));
    assert!(balances.contains_key("ETH"));
    assert!(balances.contains_key("BNB"));

    let usdt = balances.get("USDT").copied().unwrap();
    assert!(usdt >= 1000.0, "Saldo USDT de teste deve ser relevante");

    let btc = balances.get("BTC").copied().unwrap();
    assert!(btc > 0.0, "Saldo BTC de teste deve ser positivo");
}

/// 7. Envio, despacho e validação de ordens Market e Limit
#[tokio::test]
async fn test_binance_place_order_and_lifecycle() {
    let connector = BinanceTestnetConnector::mock();

    // 1. Ordem a Mercado de Compra
    let market_resp = connector
        .place_order("BTCUSDT", "BUY", "MARKET", 0.005, None)
        .await
        .expect("Ordem a mercado deve ser gerada com sucesso");

    assert_eq!(market_resp.symbol, "BTCUSDT");
    assert_eq!(market_resp.side, "BUY");
    assert_eq!(market_resp.order_type, "MARKET");
    assert_eq!(market_resp.orig_qty, 0.005);
    assert_eq!(market_resp.executed_qty, 0.005);
    assert_eq!(market_resp.status, "FILLED");
    assert!(market_resp.order_id > 0);
    assert!(market_resp.is_simulation);
    assert!(market_resp.client_order_id.starts_with("alr-binance-"));

    // 2. Ordem Limit com preço especificado
    let limit_resp = connector
        .place_order("BTCUSDT", "BUY", "LIMIT", 0.01, Some(62500.0))
        .await
        .expect("Ordem Limit deve ser gerada com sucesso");

    assert_eq!(limit_resp.symbol, "BTCUSDT");
    assert_eq!(limit_resp.order_type, "LIMIT");
    assert_eq!(limit_resp.price, 62500.0);
    assert_eq!(limit_resp.orig_qty, 0.01);

    // 3. Consulta de Status
    let status = connector
        .check_order_status("BTCUSDT", limit_resp.order_id)
        .await
        .expect("Status da ordem deve ser verificado");
    assert_eq!(status, "FILLED");

    // 4. Cancelamento de Ordem
    let canceled = connector
        .cancel_order("BTCUSDT", limit_resp.order_id)
        .await
        .expect("Cancelamento deve ser executado");
    assert!(canceled);
}

/// 8. Confluência de indicadores técnicos e avaliação de risco com CryptoTraderEngine
#[tokio::test]
async fn test_binance_kline_download_and_technical_confluence() {
    let connector = BinanceTestnetConnector::mock();

    // Download de candles (com fallback sintético determinístico)
    let candles = connector
        .get_klines("BTCUSDT", "15m", 40)
        .await
        .expect("Deveria retornar candles");

    assert_eq!(candles.len(), 40);

    // Cálculo de indicadores técnicos
    let indicators =
        TechnicalIndicators::calculate(&candles).expect("Indicadores devem ser calculados");

    assert!(indicators.rsi_14 > 0.0 && indicators.rsi_14 <= 100.0);
    assert!(indicators.sma_20 > 0.0);
    assert!(indicators.ema_9 > 0.0);
    assert!(indicators.ema_21 > 0.0);
    assert!(indicators.volatility_atr >= 0.0);

    // Integração com CryptoTraderEngine configurado para Binance
    let balances = connector.get_account_balances().await.unwrap();
    let usdt_bal = balances.get("USDT").copied().unwrap_or(15000.0);

    let mut engine = CryptoTraderEngine::new(
        "BTCUSDT",
        usdt_bal,
        RiskPolicy::default(),
        ExchangeSimulationConfig::binance(),
    );

    for c in &candles {
        let _ = engine.on_candle(c.clone()).unwrap();
    }

    let last_price = candles.last().unwrap().close;
    let signal = engine.evaluate_signal(&indicators, last_price);

    println!("Sinal gerado para Binance Spot: {:?}", signal);
    assert_eq!(engine.candles.len(), 40);
    assert_eq!(engine.exchange_config.name, "Binance Spot");
    assert_eq!(engine.exchange_config.maker_fee_pct, 0.0002);
}

/// 9. Teste do struct BinanceOrderResponse e serialização
#[test]
fn test_binance_order_response_serialization() {
    let resp = BinanceOrderResponse {
        symbol: "ETHUSDT".to_string(),
        order_id: 987654321,
        client_order_id: "alr-test-123".to_string(),
        transact_time: 1710000000000,
        price: 3500.50,
        orig_qty: 0.5,
        executed_qty: 0.5,
        status: "FILLED".to_string(),
        order_type: "LIMIT".to_string(),
        side: "BUY".to_string(),
        is_simulation: false,
    };

    let json_str = serde_json::to_string(&resp).unwrap();
    let deserialized: BinanceOrderResponse = serde_json::from_str(&json_str).unwrap();

    assert_eq!(resp, deserialized);
    assert_eq!(deserialized.order_id, 987654321);
    assert_eq!(deserialized.price, 3500.50);
}

/// 10. Teste do MarketSnapshot consolidado e polling na Binance Testnet
#[tokio::test]
async fn test_binance_poll_market_snapshot() {
    let connector = BinanceTestnetConnector::mock();
    let snapshot: MarketSnapshot = connector
        .poll_market_snapshot("BTCUSDT", "15m", 30)
        .await
        .expect("Falha ao consultar snapshot de mercado consolidado");

    assert_eq!(snapshot.symbol, "BTCUSDT");
    assert!(snapshot.price > 0.0);
    assert!(snapshot.bid > 0.0);
    assert!(snapshot.ask >= snapshot.bid);
    assert!(snapshot.spread >= 0.0);
    assert!(!snapshot.candles.is_empty());
    assert!(snapshot.indicators.is_some());

    let ind = snapshot.indicators.unwrap();
    assert!(ind.rsi_14 >= 0.0 && ind.rsi_14 <= 100.0);
    assert!(ind.sma_20 > 0.0);
    assert!(ind.ema_9 > 0.0);
    assert!(ind.ema_21 > 0.0);
}

/// 11. Teste do gerador determinístico de Paper Market Snapshot
#[test]
fn test_generate_paper_market_snapshot() {
    let snap1 = generate_paper_market_snapshot("BTCUSDT", 1, 65000.0, 30);
    let snap2 = generate_paper_market_snapshot("BTCUSDT", 2, 65000.0, 30);

    assert_eq!(snap1.symbol, "BTCUSDT");
    assert_eq!(snap2.symbol, "BTCUSDT");
    assert!(snap1.price > 60000.0 && snap1.price < 70000.0);
    assert!(snap2.price > 60000.0 && snap2.price < 70000.0);
    assert!(snap1.spread > 0.0);
    assert!(snap1.bid < snap1.ask);
    assert_eq!(snap1.candles.len(), 30);
    assert!(snap1.indicators.is_some());
}

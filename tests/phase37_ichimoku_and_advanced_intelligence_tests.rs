//! Suíte de Testes de Integração da Fase 37:
//! Indicador Ichimoku Kinko Hyo e Confluência Quádrupla de Nuvem Kumo
//!
//! Validações rigorosas de:
//! 1. Cálculo matemático de Tenkan-sen (9), Kijun-sen (26), Senkou Span A (média) e Senkou Span B (52).
//! 2. Rompimento de Alta da Nuvem (Kumo Breakout + TK Bullish Cross).
//! 3. Barreira Protetiva de Baixa (Anti-Faca Caindo): Preço abaixo da Nuvem bloqueia compras sumariamente.
//! 4. Saída Antecipada por Kumo Breakdown: Queda do preço abaixo da Nuvem liquida posições Long para estancar prejuízos.
//! 5. Exposição e integridade dos dados de Ichimoku no `DeskStatusSnapshot`.

use alr_connectors::trading::{
    generate_synthetic_candles, CryptoTraderEngine, ExchangeSimulationConfig, MultiAssetConfig,
    MultiAssetTraderEngine, OrderSide, RiskPolicy, TechnicalIndicators, TradingAction,
    TradingSignal,
};

#[test]
fn test_ichimoku_kinko_hyo_mathematical_calculation() {
    // Gera 60 velas com tendência
    let candles = generate_synthetic_candles(1234, 60, 60000.0);
    assert_eq!(candles.len(), 60);

    let (tenkan, kijun, span_a, span_b, is_above, is_below, tk_cross, cloud_bull) =
        TechnicalIndicators::calculate_ichimoku(&candles).expect("Ichimoku should compute");

    assert!(tenkan > 0.0, "Tenkan-sen deve ser positivo");
    assert!(kijun > 0.0, "Kijun-sen deve ser positivo");
    assert!(span_a > 0.0, "Senkou Span A deve ser positivo");
    assert!(span_b > 0.0, "Senkou Span B deve ser positivo");

    let expected_span_a = (tenkan + kijun) / 2.0;
    assert!(
        (span_a - expected_span_a).abs() < 1e-4,
        "Span A deve ser exatamente a média entre Tenkan e Kijun"
    );

    // is_above e is_below não podem ser verdadeiros ao mesmo tempo
    assert!(!(is_above && is_below));

    // Valida integração completa em TechnicalIndicators
    let indicators = TechnicalIndicators::calculate(&candles).unwrap();
    assert_eq!(indicators.ichimoku_tenkan, tenkan);
    assert_eq!(indicators.ichimoku_kijun, kijun);
    assert_eq!(indicators.ichimoku_span_a, span_a);
    assert_eq!(indicators.ichimoku_span_b, span_b);
    assert_eq!(indicators.ichimoku_is_above_cloud, is_above);
    assert_eq!(indicators.ichimoku_is_below_cloud, is_below);
    assert_eq!(indicators.ichimoku_tk_cross_bullish, tk_cross);
    assert_eq!(indicators.ichimoku_cloud_bullish, cloud_bull);
}

#[test]
fn test_ichimoku_bullish_kumo_breakout_generates_high_conviction_buy() {
    let trader = CryptoTraderEngine::new(
        "BTC-USDT",
        20000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    let mut indicators = TechnicalIndicators::default_at_price(65000.0);
    indicators.ema_9 = 65200.0;
    indicators.ema_21 = 64800.0;
    indicators.ema_50 = 64000.0;
    indicators.supertrend_direction = 1;
    indicators.adx_14 = 26.0;
    indicators.plus_di = 30.0;
    indicators.minus_di = 12.0;
    indicators.bollinger_bandwidth = 0.045;
    indicators.volume_ratio = 1.45;
    indicators.is_bullish_engulfing = true;

    // Configura Ichimoku com Kumo Breakout claro
    indicators.ichimoku_tenkan = 65100.0;
    indicators.ichimoku_kijun = 64600.0;
    indicators.ichimoku_span_a = 64500.0;
    indicators.ichimoku_span_b = 64100.0;
    indicators.ichimoku_is_above_cloud = true;
    indicators.ichimoku_is_below_cloud = false;
    indicators.ichimoku_tk_cross_bullish = true;
    indicators.ichimoku_cloud_bullish = true;

    let decision = trader.evaluate_intelligent_decision(&indicators, 65000.0);

    assert_eq!(
        decision.signal,
        TradingSignal::Buy,
        "Deve emitir Buy com forte confluência Ichimoku"
    );
    assert!(
        decision
            .confluence_factors
            .iter()
            .any(|f| f.contains("ICHIMOKU_BULLISH_BREAKOUT")),
        "Fatores devem conter o rompimento da Nuvem Ichimoku"
    );
    assert!(
        decision.probability_buy >= 0.85,
        "Probabilidade de compra deve ser >= 85%"
    );
    assert!(
        decision.position_size_multiplier >= 1.20,
        "Multiplicador de Kelly deve ser alavancado em alta confluência"
    );
}

#[test]
fn test_ichimoku_bearish_cloud_barrier_blocks_buys_during_downtrend() {
    let trader = CryptoTraderEngine::new(
        "SOL-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    let mut indicators = TechnicalIndicators::default_at_price(140.0);
    // Mesmo que médias rápidas tenham cruzado temporariamente
    indicators.ema_9 = 141.0;
    indicators.ema_21 = 140.0;
    indicators.supertrend_direction = 1;

    // Mas o preço está ABAIXO da Nuvem Kumo (Downtrend macro no Ichimoku)
    indicators.ichimoku_span_a = 148.0;
    indicators.ichimoku_span_b = 152.0;
    indicators.ichimoku_is_above_cloud = false;
    indicators.ichimoku_is_below_cloud = true; // Abaixo da Nuvem!
    indicators.ichimoku_tk_cross_bullish = false;

    let decision = trader.evaluate_intelligent_decision(&indicators, 140.0);

    assert_eq!(
        decision.signal,
        TradingSignal::Hold,
        "Preço abaixo da Nuvem de Ichimoku DEVE bloquear compras (Anti-Faca Caindo)"
    );
    assert!(
        decision
            .confluence_factors
            .iter()
            .any(|f| f.contains("ICHIMOKU_BEARISH_CLOUD_BARRIER")),
        "Fatores devem registrar a barreira de baixa da Nuvem de Ichimoku"
    );
}

#[test]
fn test_ichimoku_kumo_breakdown_early_exit_protects_capital() {
    let mut trader = CryptoTraderEngine::new(
        "ETH-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Abre posição Long a $3,500
    let _ = trader
        .execute_order(
            TradingAction::Buy,
            OrderSide::Long,
            3500.0,
            "INITIAL_LONG_TEST",
        )
        .unwrap();

    let mut indicators = TechnicalIndicators::default_at_price(3460.0);
    // Nuvem Kumo estava entre $3,480 e $3,520, mas preço caiu para $3,460 (acima do stop de $3,430, mas abaixo da nuvem)
    indicators.ichimoku_span_a = 3480.0;
    indicators.ichimoku_span_b = 3520.0;
    indicators.ichimoku_is_above_cloud = false;
    indicators.ichimoku_is_below_cloud = true; // Rompeu a base da Nuvem para baixo!

    let decision = trader.evaluate_intelligent_decision(&indicators, 3460.0);

    assert_eq!(
        decision.signal,
        TradingSignal::Sell,
        "Quebra da Nuvem Ichimoku DEVE acionar saída de emergência (Early Exit)"
    );
    assert_eq!(decision.market_regime, "IchimokuReversalExit");
    assert!(
        decision
            .confluence_factors
            .iter()
            .any(|f| f.contains("ICHIMOKU_KUMO_BREAKDOWN_EXIT")),
        "Fator de saída deve citar a quebra da Nuvem Kumo"
    );
}

#[test]
fn test_ichimoku_data_presence_in_desk_snapshot() {
    let config = MultiAssetConfig::default();
    let mut desk = MultiAssetTraderEngine::new(config);

    // Alimenta 60 velas para BTC
    let candles = generate_synthetic_candles(777, 60, 64000.0);
    for c in candles {
        let _ = desk.feed_candle("BTC-USDT", c);
    }

    let snapshot = desk.get_desk_snapshot();
    let btc = snapshot
        .assets
        .iter()
        .find(|a| a.asset == "BTC-USDT")
        .expect("BTC-USDT deve estar no snapshot");

    assert!(
        btc.ichimoku_cloud_top > 0.0,
        "Topo da Nuvem Ichimoku deve estar calculado"
    );
    assert!(
        btc.ichimoku_cloud_bottom > 0.0,
        "Base da Nuvem Ichimoku deve estar calculada"
    );
    assert!(btc.ichimoku_cloud_top >= btc.ichimoku_cloud_bottom);
}

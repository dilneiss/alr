use alr_connectors::trading::*;

#[test]
fn test_forex_pip_size_and_decimals() {
    // Majors: 4th decimal is pip, 5th is pipette
    assert_eq!(ForexPipCalculator::pip_size("EUR-USD"), 0.0001);
    assert_eq!(ForexPipCalculator::pip_size("GBP-USD"), 0.0001);
    assert_eq!(ForexPipCalculator::decimal_places("EUR-USD"), 5);

    // JPY pairs: 2nd decimal is pip, 3rd is pipette
    assert_eq!(ForexPipCalculator::pip_size("USD-JPY"), 0.01);
    assert_eq!(ForexPipCalculator::pip_size("EUR-JPY"), 0.01);
    assert_eq!(ForexPipCalculator::decimal_places("USD-JPY"), 3);
}

#[test]
fn test_forex_pip_calculation_and_pnl() {
    // EUR/USD: 1.0850 para 1.0880 = 30 pips
    let pips = ForexPipCalculator::calculate_pips("EUR-USD", 1.0850, 1.0880);
    assert!((pips - 30.0).abs() < 1e-4);

    // 1 Lote Padrão (100.000 unidades) de EUR/USD = $10 por pip
    let pip_val = ForexPipCalculator::pip_value_usd("EUR-USD", 100_000.0, 1.0850);
    assert!((pip_val - 10.0).abs() < 1e-4);

    // Lucro em 30 pips de compra com 1 lote (100.000) e 1.2 pips de spread:
    // (30 - 1.2) * $10 = $288
    let pnl = ForexPipCalculator::calculate_pnl_usd(
        "EUR-USD",
        OrderSide::Long,
        1.0850,
        1.0880,
        100_000.0,
        1.2,
    );
    assert!((pnl - 288.0).abs() < 0.1);
}

#[test]
fn test_technical_indicators_sma_and_ema() {
    let prices = vec![10.0, 11.0, 12.0, 13.0, 14.0, 18.0];

    // SMA dos últimos 5 períodos: (11+12+13+14+18)/5 = 13.6
    let sma = TechnicalIndicators::calculate_sma(&prices, 5).unwrap();
    assert!((sma - 13.6).abs() < 1e-4);

    // EMA de 5 períodos: inicial = 12.0 (primeiros 5), depois atualizada com 18.0
    let ema = TechnicalIndicators::calculate_ema(&prices, 5).unwrap();
    assert!(ema > 12.0);
    // Preços vazios retornam None
    assert!(TechnicalIndicators::calculate_sma(&[], 5).is_none());
    assert!(TechnicalIndicators::calculate_ema(&[], 5).is_none());
}

#[test]
fn test_technical_indicators_rsi_bounds() {
    // Sequência de alta constante: RSI deve se aproximar de 100
    let bullish_prices: Vec<f64> = (1..=20).map(|i| 100.0 + i as f64 * 2.0).collect();
    let rsi_bull = TechnicalIndicators::calculate_rsi(&bullish_prices, 14).unwrap();
    assert!(rsi_bull >= 90.0, "Sequência de alta deve ter RSI > 90, obteve {}", rsi_bull);

    // Sequência de baixa constante: RSI deve se aproximar de 0
    let bearish_prices: Vec<f64> = (1..=20).map(|i| 200.0 - i as f64 * 2.0).collect();
    let rsi_bear = TechnicalIndicators::calculate_rsi(&bearish_prices, 14).unwrap();
    assert!(rsi_bear <= 10.0, "Sequência de baixa deve ter RSI < 10, obteve {}", rsi_bear);

    // Amostra insuficiente retorna None
    assert!(TechnicalIndicators::calculate_rsi(&[10.0, 12.0], 14).is_none());
}

#[test]
fn test_technical_indicators_macd() {
    // 35 preços crescentes
    let prices: Vec<f64> = (0..35).map(|i| 100.0 + (i as f64 * 1.5)).collect();
    let (macd, signal, hist) = TechnicalIndicators::calculate_macd(&prices).unwrap();

    assert!(macd > 0.0, "Em tendência de alta, MACD deve ser positivo");
    assert!((macd - signal - hist).abs() < 1e-6, "Histograma deve ser exatamente macd - signal");
}

#[test]
fn test_technical_indicators_atr() {
    let mut candles = Vec::new();
    for i in 0..20 {
        let base = 100.0 + i as f64;
        candles.push(Candle {
            timestamp: i as i64 * 60,
            open: base,
            high: base + 2.0,
            low: base - 1.0,
            close: base + 1.0,
            volume: 100.0,
        });
    }

    let atr = TechnicalIndicators::calculate_atr(&candles, 14).unwrap();
    assert!(atr > 0.0);
    assert!((atr - 3.0).abs() < 1.0, "ATR deve refletir a variação de ~3 pontos");
}

#[test]
fn test_asset_baseline_and_forex_symbols() {
    assert!(is_forex_symbol("EUR-USD"));
    assert!(is_forex_symbol("GBP-USD"));
    assert!(is_forex_symbol("USD-JPY"));
    assert!(!is_forex_symbol("BTC-USDT"));
    assert!(!is_forex_symbol("ETH-USDT"));

    assert!(asset_baseline_price("BTC-USDT") > 50_000.0);
    assert!(asset_baseline_price("ETH-USDT") > 2_000.0);
    assert!((asset_baseline_price("EUR-USD") - 1.085).abs() < 0.1);
}

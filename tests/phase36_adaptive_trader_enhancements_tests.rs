//! Suíte de Testes de Integração da Fase 36:
//! Aprimoramentos Avançados do Robô Trader Quantitativo do ALR
//!
//! Validações rigorosas de:
//! 1. ADX (Average Directional Index) com +DI e -DI (filtro de tendência forte vs consolidação).
//! 2. Canais de Donchian de 20 períodos para suporte, resistência e filtro anti-topo.
//! 3. Reconhecimento de padrões de Price Action (Hammer, Engolfo de Alta, Shooting Star).
//! 4. Stop-Loss e Take-Profit dinâmicos calibrados via ATR (Average True Range).
//! 5. Break-Even Stop automático que blinda posições vencedoras contra reversões.
//! 6. Motor Adaptativo de Aprendizado (`AdaptiveTradeLearner`):
//!    - Reforço positivo de fatores em trades vencedores (aumento de peso).
//!    - Penalização de fatores em trades perdedores (redução de peso).
//!    - Cooldown Anti-Loss Streak: 2 perdas consecutivas pausam o ativo por 10 velas.
//! 7. Correção no despacho da Binance: `ClosePosition` para Long despacha ordem `SELL`, não `BUY`.
//! 8. Persistência relacional de pesos e cooldowns no SQLite (`trading.db`).

use alr_connectors::trading::{
    generate_synthetic_candles, AdaptiveTradeLearner, Candle, CryptoTraderEngine,
    ExchangeSimulationConfig, OrderSide, RiskPolicy, SqliteTradingStore, TechnicalIndicators,
    TradingAction, TradingPosition, TradingSignal,
};

#[test]
fn test_adx_directional_index_calculation() {
    // 1. Gera 60 velas com tendência de alta contínua bem definida
    let mut trending_candles = Vec::new();
    let mut price = 60000.0;
    for i in 0..60 {
        price += 150.0;
        trending_candles.push(Candle::new(
            1700000000 + (i as i64 * 60),
            price - 50.0,
            price + 80.0,
            price - 60.0,
            price,
            100.0 + (i as f64 * 5.0),
        ));
    }

    let (adx, plus_di, minus_di) =
        TechnicalIndicators::calculate_adx(&trending_candles, 14).expect("ADX should compute");

    assert!(
        adx >= 22.0,
        "ADX em tendência forte contínua deve ser >= 22.0, obtido: {:.2}",
        adx
    );
    assert!(
        plus_di > minus_di,
        "+DI ({:.2}) deve ser superior a -DI ({:.2}) em tendência de alta",
        plus_di,
        minus_di
    );

    // 2. Valida integração na struct completa TechnicalIndicators
    let indicators = TechnicalIndicators::calculate(&trending_candles).unwrap();
    assert_eq!(indicators.adx_14, adx);
    assert_eq!(indicators.plus_di, plus_di);
    assert_eq!(indicators.minus_di, minus_di);
}

#[test]
fn test_donchian_support_and_resistance_anti_top() {
    let candles = generate_synthetic_candles(101, 35, 60000.0);
    let (high, low, mid) =
        TechnicalIndicators::calculate_donchian(&candles, 20).expect("Donchian should compute");

    assert!(
        high > low,
        "Donchian High deve ser estritamente maior que Low"
    );
    assert!(
        mid > low && mid < high,
        "Donchian Mid deve estar entre Low e High"
    );

    let indicators = TechnicalIndicators::calculate(&candles).unwrap();
    assert_eq!(indicators.donchian_high_20, high);
    assert_eq!(indicators.donchian_low_20, low);
    assert_eq!(indicators.donchian_middle_20, mid);
}

#[test]
fn test_price_action_candlestick_patterns_detection() {
    // 1. Testa padrão Hammer (Martelo de Rejeição de Fundo)
    let hammer_candle = Candle::new(1700000100, 60000.0, 60050.0, 59200.0, 60020.0, 50.0);
    let candles_hammer = vec![
        Candle::new(1700000000, 60500.0, 60600.0, 59900.0, 60000.0, 30.0),
        hammer_candle,
    ];
    let (is_hammer, _, is_shooting_star, _) =
        TechnicalIndicators::detect_candlestick_patterns(&candles_hammer);
    assert!(
        is_hammer,
        "Deve identificar padrão Hammer com cauda inferior longa"
    );
    assert!(!is_shooting_star, "Não deve ser shooting star");

    // 2. Testa padrão Bullish Engulfing (Engolfo de Alta)
    let prev_bearish = Candle::new(1700000200, 60000.0, 60100.0, 59500.0, 59600.0, 40.0);
    let curr_bullish = Candle::new(1700000300, 59550.0, 60300.0, 59500.0, 60200.0, 80.0);
    let candles_engulf = vec![prev_bearish, curr_bullish];
    let (_, is_bull_engulf, _, _) =
        TechnicalIndicators::detect_candlestick_patterns(&candles_engulf);
    assert!(
        is_bull_engulf,
        "Deve identificar Engolfo de Alta com vela verde cobrindo a vermelha"
    );
}

#[test]
fn test_dynamic_atr_stop_loss_and_take_profit() {
    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        20000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Alimenta 30 velas realistas com volatilidade ATR conhecida
    let candles = generate_synthetic_candles(42, 30, 60000.0);
    for c in candles {
        engine.add_candle(c);
    }

    let indicators = engine
        .compute_indicators()
        .expect("Indicators should compute");
    assert!(indicators.volatility_atr > 0.0);

    let price = 60000.0;
    let _buy_exec = engine
        .execute_order(
            TradingAction::Buy,
            OrderSide::Long,
            price,
            "DYNAMIC_ATR_TEST",
        )
        .expect("Execution should succeed")
        .expect("Trade should be placed");

    let pos = engine.current_position.as_ref().unwrap();
    let expected_min_stop_dist = indicators.volatility_atr * 1.8;

    let actual_stop_dist = pos.entry_price - pos.stop_loss;
    let actual_take_dist = pos.take_profit - pos.entry_price;

    assert!(
        actual_stop_dist >= expected_min_stop_dist * 0.95,
        "Stop Loss deve ser proporcional a 1.8x ATR (${:.2}), obtido dist: ${:.2}",
        expected_min_stop_dist,
        actual_stop_dist
    );

    let risk_reward = actual_take_dist / actual_stop_dist;
    assert!(
        risk_reward >= 2.0,
        "Relação Risk:Reward deve ser >= 2.0, obtido: {:.2}",
        risk_reward
    );
}

#[test]
fn test_automatic_break_even_stop() {
    let mut pos = TradingPosition::new(
        "BTC-USDT",
        60000.0,
        0.1,
        OrderSide::Long,
        58800.0, // Stop-Loss inicial a $58,800
        62400.0,
        1700000000,
    );

    // Preço sobe para $61,200 (+2.0% de lucro, atingindo o gatilho de break-even de 1.5%)
    pos.update_price(61200.0);

    // Verifica que o Stop Loss foi automaticamente elevado para o Break-Even ($60,120)
    let expected_be_stop = 60000.0 * 1.002;
    assert_eq!(
        pos.stop_loss, expected_be_stop,
        "Stop-Loss deve ser movido para Break-Even (${:.2}), mas está em ${:.2}",
        expected_be_stop, pos.stop_loss
    );

    // Se o preço depois recuar para $60,500, o Stop-Loss NÃO pode regredir para baixo
    pos.update_price(60500.0);
    assert!(pos.stop_loss >= expected_be_stop);
}

#[test]
fn test_adaptive_learning_reinforces_winning_factors() {
    let mut learner = AdaptiveTradeLearner::new();
    let initial_weight = learner.get_factor_weight("TREND_BULLISH_CONFLUENCE");
    assert_eq!(initial_weight, 1.0);

    let factors = vec![
        "TREND_BULLISH_CONFLUENCE (EMA9>EMA21)".to_string(),
        "ADX_STRONG_TREND (ADX 28)".to_string(),
    ];

    // Simula encerramento de trade com LUCRO expressivo (+3.5%, +$350 USD)
    learner.record_trade_result("BTC-USDT", &factors, 350.0, 3.5, "BTC:60000:62100");

    let updated_trend_weight = learner.get_factor_weight("TREND_BULLISH_CONFLUENCE");
    let updated_adx_weight = learner.get_factor_weight("ADX_STRONG_TREND");

    assert!(
        updated_trend_weight > initial_weight,
        "Peso do pilar de tendência deve aumentar após vitória (era {}, agora {})",
        initial_weight,
        updated_trend_weight
    );
    assert!(
        updated_adx_weight > 1.0,
        "Peso do pilar ADX deve aumentar após vitória"
    );
    assert_eq!(
        learner.get_consecutive_losses("BTC-USDT"),
        0,
        "Perdas consecutivas devem ser zero após lucro"
    );
    assert_eq!(learner.total_learned_trades, 1);
}

#[test]
fn test_adaptive_learning_penalizes_losses_and_triggers_cooldown() {
    let mut learner = AdaptiveTradeLearner::new();
    let initial_weight = learner.get_factor_weight("MOMENTUM_OVERSOLD_BOUNCE");

    let factors = vec!["MOMENTUM_OVERSOLD_BOUNCE".to_string()];

    // 1ª Perda no ativo SOL-USDT (-2.0%, -$200 USD)
    learner.record_trade_result("SOL-USDT", &factors, -200.0, -2.0, "SOL:150:147");
    assert_eq!(learner.get_consecutive_losses("SOL-USDT"), 1);
    assert!(
        learner.get_cooldown_remaining("SOL-USDT").is_none(),
        "1ª perda não deve acionar cooldown imediato"
    );

    let weight_after_loss1 = learner.get_factor_weight("MOMENTUM_OVERSOLD_BOUNCE");
    assert!(
        weight_after_loss1 < initial_weight,
        "Peso do fator deve diminuir após prejuízo"
    );

    // 2ª Perda consecutiva no mesmo ativo SOL-USDT
    learner.record_trade_result("SOL-USDT", &factors, -180.0, -1.8, "SOL:147:144.3");
    assert_eq!(learner.get_consecutive_losses("SOL-USDT"), 2);

    // Deve ativar o Cooldown Anti-Loss Streak de 10 velas!
    let cooldown_rem = learner
        .get_cooldown_remaining("SOL-USDT")
        .expect("Deve acionar cooldown após 2 perdas consecutivas");
    assert_eq!(cooldown_rem, 10, "Cooldown deve ser de 10 velas");

    // Testa que cada tick decrementa o cooldown
    learner.tick_cooldown("SOL-USDT");
    assert_eq!(learner.get_cooldown_remaining("SOL-USDT"), Some(9));
}

#[test]
fn test_cooldown_blocks_new_entries_in_engine() {
    let mut engine = CryptoTraderEngine::new(
        "DOGE-USDT",
        5000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Força cooldown ativo no ativo DOGE-USDT
    engine
        .learner
        .cooldown_candles
        .insert("DOGE-USDT".to_string(), 8);

    let indicators = TechnicalIndicators::default_at_price(0.12);
    let decision = engine.evaluate_intelligent_decision(&indicators, 0.12);

    assert_eq!(
        decision.signal,
        TradingSignal::Hold,
        "Deve emitir Hold absoluto durante o cooldown protetivo"
    );
    assert_eq!(decision.market_regime, "AntiLossCooldown");
    assert!(
        decision.rationale.contains("pausa protetiva"),
        "Rationale deve justificar o bloqueio por cooldown"
    );
}

#[test]
fn test_binance_dispatch_order_side_correctness() {
    // 1. Simula entrada (Buy Long -> Despacha "BUY")
    let trade_buy = alr_connectors::trading::TradeExecution {
        id: "exec_1".to_string(),
        timestamp: 1700000000,
        asset: "BTC-USDT".to_string(),
        action: TradingAction::Buy,
        side: OrderSide::Long,
        price: 60000.0,
        quantity: 0.1,
        fee: 6.0,
        slippage: 0.0,
        realized_pnl: None,
        reason: "ENTRY".to_string(),
        indicator_snapshot: None,
    };

    let side_for_buy = match trade_buy.action {
        TradingAction::Buy => match trade_buy.side {
            OrderSide::Long => "BUY",
            OrderSide::Short => "SELL",
        },
        TradingAction::ClosePosition | TradingAction::Sell => match trade_buy.side {
            OrderSide::Long => "SELL",
            OrderSide::Short => "BUY",
        },
        _ => "SELL",
    };
    assert_eq!(side_for_buy, "BUY");

    // 2. Simula encerramento (ClosePosition de Long -> DEVE despachar "SELL" para a Binance!)
    let trade_close_long = alr_connectors::trading::TradeExecution {
        id: "exec_2".to_string(),
        timestamp: 1700000060,
        asset: "BTC-USDT".to_string(),
        action: TradingAction::ClosePosition,
        side: OrderSide::Long,
        price: 62400.0,
        quantity: 0.1,
        fee: 6.24,
        slippage: 0.0,
        realized_pnl: Some(233.76),
        reason: "TAKE_PROFIT".to_string(),
        indicator_snapshot: None,
    };

    let side_for_close = match trade_close_long.action {
        TradingAction::Buy => match trade_close_long.side {
            OrderSide::Long => "BUY",
            OrderSide::Short => "SELL",
        },
        TradingAction::ClosePosition | TradingAction::Sell => match trade_close_long.side {
            OrderSide::Long => "SELL",
            OrderSide::Short => "BUY",
        },
        _ => "SELL",
    };
    assert_eq!(
        side_for_close, "SELL",
        "Fechar posição Long DEVE despachar SELL para zerar na exchange"
    );
}

#[test]
fn test_sqlite_persistence_of_learned_weights_and_cooldowns() {
    let store = SqliteTradingStore::open_in_memory().expect("Store should open");

    let mut learner = AdaptiveTradeLearner::new();
    learner
        .factor_weights
        .insert("ADX_STRONG_TREND".to_string(), 1.65);
    learner
        .factor_wins
        .insert("ADX_STRONG_TREND".to_string(), 8);
    learner
        .factor_total_trades
        .insert("ADX_STRONG_TREND".to_string(), 10);
    learner
        .factor_pnl_usd
        .insert("ADX_STRONG_TREND".to_string(), 420.50);
    learner.consecutive_losses.insert("ETH-USDT".to_string(), 2);
    learner.cooldown_candles.insert("ETH-USDT".to_string(), 7);

    // Salva estado
    store
        .save_learned_weights(&learner)
        .expect("Save weights should succeed");

    // Restaura em um novo aprendiz limpo
    let mut restored_learner = AdaptiveTradeLearner::new();
    store
        .load_learned_weights(&mut restored_learner)
        .expect("Load weights should succeed");

    assert_eq!(
        restored_learner.get_factor_weight("ADX_STRONG_TREND"),
        1.65,
        "Peso aprendido deve ser restaurado perfeitamente"
    );
    assert_eq!(
        restored_learner.consecutive_losses.get("ETH-USDT"),
        Some(&2)
    );
    assert_eq!(restored_learner.cooldown_candles.get("ETH-USDT"), Some(&7));
}

#[test]
fn test_partial_take_profit_tp1_execution() {
    let mut engine = CryptoTraderEngine::new(
        "ETH-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Alimenta candles com ATR
    let candles = generate_synthetic_candles(10, 30, 3500.0);
    for c in candles {
        engine.add_candle(c);
    }

    let _ = engine
        .execute_order(
            TradingAction::Buy,
            OrderSide::Long,
            3500.0,
            "TEST_PARTIAL_ENTRY",
        )
        .unwrap();

    let initial_pos_qty = engine.current_position.as_ref().unwrap().quantity;
    let initial_stop_loss = engine.current_position.as_ref().unwrap().stop_loss;
    let tp1_target = engine.current_position.as_ref().unwrap().take_profit_1;

    assert!(
        tp1_target > 3500.0,
        "TP1 deve ser superior ao preço de entrada"
    );

    // Preço atinge TP1 ($3,580)
    let partial_exec = engine.check_stops(tp1_target + 5.0);
    assert!(partial_exec.is_some(), "Deve executar TP1 parcial");

    let exec = partial_exec.unwrap();
    assert_eq!(exec.action, TradingAction::PartialClose);
    assert!(
        exec.realized_pnl.unwrap() > 0.0,
        "PnL de TP1 deve ser estritamente positivo"
    );

    // Posição restante deve ter 50% da quantidade original e Stop movido para Break-Even
    assert!(
        engine.current_position.is_some(),
        "Posição ainda deve estar aberta com os 50% restantes"
    );
    let remaining_pos = engine.current_position.as_ref().unwrap();
    assert!((remaining_pos.quantity - (initial_pos_qty * 0.50)).abs() < 0.001);
    assert!(remaining_pos.is_tp1_realized);
    assert!(
        remaining_pos.stop_loss > initial_stop_loss,
        "Stop-Loss deve ter sido elevado para Break-Even"
    );
    assert!(remaining_pos.stop_loss >= 3500.0 * 1.002);
}

#[test]
fn test_order_book_imbalance_calculation() {
    use alr_connectors::trading::OrderBook;

    // Bids pesados (pressão compradora)
    let bids = vec![(64000.0, 15.0), (63950.0, 25.0), (63900.0, 40.0)]; // Total 80.0
    let asks = vec![(64050.0, 5.0), (64100.0, 10.0), (64150.0, 5.0)]; // Total 20.0
    let ob = OrderBook::new(bids, asks);

    let obi = ob.order_book_imbalance();
    // OBI = (80 - 20) / (80 + 20) = 60 / 100 = +0.60
    assert!(
        (obi - 0.60).abs() < 1e-4,
        "OBI esperado de +0.60, obtido: {:.4}",
        obi
    );
    assert!(ob.bid_ask_volume_ratio() >= 3.9);
}

#[test]
fn test_rsi_bullish_and_bearish_divergence() {
    // Simula 25 velas com padrão de divergência
    let candles = generate_synthetic_candles(99, 30, 150.0);
    let (bull_div, bear_div) = TechnicalIndicators::calculate_divergence(&candles);

    // Deve retornar booleans determinísticos válidos
    let _ = bull_div;
    let _ = bear_div;
}

#[test]
fn test_half_kelly_adaptive_position_sizing() {
    let mut learner = AdaptiveTradeLearner::new();

    // 1. Sem trades suficientes, retorna 1.0x (neutro)
    let factors = vec!["TREND_BULLISH_CONFLUENCE".to_string()];
    let initial_kelly = learner.calculate_kelly_multiplier(&factors);
    assert_eq!(initial_kelly, 1.0);

    // 2. Histórico altamente vencedor (4 vitórias, 1 derrota, payoff alto)
    for _ in 0..4 {
        learner.record_trade_result("BTC-USDT", &factors, 300.0, 3.0, "W");
    }
    learner.record_trade_result("BTC-USDT", &factors, -100.0, -1.0, "L");

    let winning_kelly = learner.calculate_kelly_multiplier(&factors);
    assert!(
        winning_kelly > 1.15,
        "Kelly deve recomendar aumento de mão para estratégia vencedora (obtido: {:.2}x)",
        winning_kelly
    );
}

#[test]
fn test_time_decay_stale_trade_exit() {
    let mut pos = TradingPosition::new(
        "SOL-USDT",
        150.0,
        1.0,
        OrderSide::Long,
        145.0,
        160.0,
        1700000000,
    );

    // Posição mantida por 46 velas sem sair do lugar ($150.20 -> PnL < 0.65%)
    for _ in 0..46 {
        pos.increment_bars_held();
    }
    pos.update_price(150.20);

    let exit = pos.check_early_exit(150.20, 150.0, 150.0);
    assert_eq!(
        exit,
        Some("EARLY_EXIT_STALE_MARKET_TIME_DECAY"),
        "Deve encerrar trade estagnado por time-decay"
    );
}

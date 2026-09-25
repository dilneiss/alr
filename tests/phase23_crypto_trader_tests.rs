//! Suíte de Testes de Integração da Fase 23:
//! Motor Autônomo de Trading Quantitativo, Criptomoedas e Bolsa (CryptoTraderEngine)
//!
//! Validações rigorosas de:
//! 1. Cálculo determinístico de indicadores técnicos locais (SMA, EMA, RSI, MACD, ATR).
//! 2. Execução e disparo automático e inviolável de Stop-Loss protetivo.
//! 3. Execução automática de Take-Profit (alvo de lucro).
//! 4. Bloqueio estrito de risco pelo RiskEngine (Drawdown excessivo bloqueia novas compras).
//! 5. Adaptação completa de RL via EnvironmentAdapter (`reset`, `observe`, `act`, `is_terminal`).
//! 6. Latência de decisão sub-microssegundo (< 20 µs).
//! 7. Integração com ApprovalGateway em ordens de grande porte.
//! 8. Dedução realista de taxas e slippage na simulação de exchanges (Binance).
//! 9. Proteção com Trailing Stop móvel.

use alr_connectors::approvals::{ApprovalGateway, ApprovalStatus};
use alr_connectors::trading::{
    generate_synthetic_candles, Candle, CryptoTraderEngine, ExchangeSimulationConfig, OrderSide,
    RiskPolicy, TechnicalIndicators, TradingAction,
};
use alr_environment::{
    AbstractAction, DistanceCategory, EnvironmentAdapter, RelativeDirection, TradingEnvironment,
};
use std::time::Instant;

#[test]
fn test_deterministic_technical_indicators_calculation() {
    let candles = generate_synthetic_candles(100, 50, 60000.0);
    assert_eq!(candles.len(), 50);

    let closes: Vec<f64> = candles.iter().map(|c| c.close).collect();

    // 1. SMA determinística
    let sma_20 = TechnicalIndicators::calculate_sma(&closes, 20).expect("SMA-20 should compute");
    let expected_sma: f64 = closes[30..50].iter().sum::<f64>() / 20.0;
    assert!((sma_20 - expected_sma).abs() < 1e-6);

    // 2. EMA determinística
    let ema_9 = TechnicalIndicators::calculate_ema(&closes, 9).expect("EMA-9 should compute");
    assert!(ema_9 > 0.0);

    // 3. RSI determinístico no intervalo [0, 100]
    let rsi = TechnicalIndicators::calculate_rsi(&closes, 14).expect("RSI-14 should compute");
    assert!(
        (0.0..=100.0).contains(&rsi),
        "RSI must be bounded between 0 and 100, got {}",
        rsi
    );

    // 4. MACD completo
    let (macd, signal, hist) =
        TechnicalIndicators::calculate_macd(&closes).expect("MACD should compute");
    assert!((hist - (macd - signal)).abs() < 1e-6);

    // 5. ATR de volatilidade
    let atr = TechnicalIndicators::calculate_atr(&candles, 14).expect("ATR should compute");
    assert!(atr > 0.0, "ATR must be strictly positive");

    // 6. Estrutura unificada
    let indicators =
        TechnicalIndicators::calculate(&candles).expect("Indicators bundle should compute");
    assert_eq!(indicators.sma_20, sma_20);
    assert_eq!(indicators.ema_9, ema_9);
    assert_eq!(indicators.rsi_14, rsi);
    assert_eq!(indicators.macd, macd);
}

#[test]
fn test_protective_stop_loss_trigger_and_execution() {
    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Compra 0.1 BTC a $60,000 (Stop-Loss automático a 2% = $58,800)
    let buy_exec = engine
        .execute_order(
            TradingAction::Buy,
            OrderSide::Long,
            60000.0,
            "TEST_MANUAL_BUY",
        )
        .expect("Buy order should execute")
        .expect("Execution record should be present");

    assert_eq!(buy_exec.action, TradingAction::Buy);
    assert!(engine.current_position.is_some());
    let pos = engine.current_position.as_ref().unwrap();
    assert_eq!(pos.entry_price, 60000.0);
    assert_eq!(pos.stop_loss, 58800.0);

    // Queda abrupta de preço para $58,500 (rompendo o stop de $58,800)
    let stop_exec = engine.check_stops(58500.0);
    assert!(stop_exec.is_some(), "Stop-Loss must trigger immediately");
    let exec = stop_exec.unwrap();
    assert_eq!(exec.action, TradingAction::ClosePosition);
    assert_eq!(exec.reason, "STOP_LOSS_PROTECTIVE");
    assert!(
        engine.current_position.is_none(),
        "Position must be closed after stop loss"
    );
    assert!(
        exec.realized_pnl.unwrap() < 0.0,
        "Realized PnL must be negative on stop loss"
    );

    // Verifica que o capital restante foi devidamente restaurado
    assert!(engine.cash_balance > 9000.0 && engine.cash_balance < 10000.0);
}

#[test]
fn test_take_profit_execution() {
    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Compra a $60,000 (Take-Profit a 4% = $62,400)
    let _ = engine
        .execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "TEST_ENTRY")
        .expect("Buy should succeed");

    assert!(engine.current_position.is_some());
    let pos = engine.current_position.as_ref().unwrap();
    assert_eq!(pos.take_profit, 62400.0);

    // Preço sobe para $62,500 (rompendo o take-profit)
    let tp_exec = engine.check_stops(62500.0);
    assert!(tp_exec.is_some(), "Take-Profit must trigger");
    let exec = tp_exec.unwrap();
    assert_eq!(exec.reason, "TAKE_PROFIT_LIMIT");
    assert!(engine.current_position.is_none());
    assert!(
        exec.realized_pnl.unwrap() > 0.0,
        "Realized PnL must be strictly positive"
    );

    let report = engine.generate_report();
    assert_eq!(report.total_trades, 1);
    assert_eq!(report.winning_trades, 1);
    assert_eq!(report.win_rate, 100.0);
    assert!(report.total_pnl > 0.0);
}

#[test]
fn test_risk_engine_blocks_on_excessive_drawdown() {
    let risk_policy = RiskPolicy {
        max_drawdown_pct: 5.0,
        ..Default::default()
    };

    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        risk_policy,
        ExchangeSimulationConfig::zero_fee(),
    );

    // Simula pico de patrimônio em $10,000
    engine.peak_portfolio_value = 10000.0;
    // Reduz saldo para $9,400 (Drawdown = 6.0% > 5.0%)
    engine.cash_balance = 9400.0;

    let dd = engine.drawdown_pct(60000.0);
    assert!(dd >= 5.0, "Drawdown should be 6.0%, got {}", dd);

    // Tentativa de abrir nova posição deve ser rejeitada pelo RiskEngine
    let res = engine.execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "UNSAFE_BUY");
    assert!(
        res.is_err(),
        "New buy must be blocked when drawdown exceeds limit"
    );
    let err_msg = res.err().unwrap().to_string();
    assert!(
        err_msg.contains("drawdown") || err_msg.contains("Kill switch"),
        "Error message should mention drawdown or kill switch: {}",
        err_msg
    );
}

#[test]
fn test_trailing_stop_protection() {
    let risk_policy = RiskPolicy {
        trailing_stop_pct: Some(1.5),
        ..Default::default()
    };

    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        risk_policy,
        ExchangeSimulationConfig::zero_fee(),
    );

    // Entrada a $60,000 (Stop inicial a $58,800)
    let _ = engine
        .execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "TRAILING_BUY")
        .expect("Buy should succeed");

    let initial_sl = engine.current_position.as_ref().unwrap().stop_loss;
    assert_eq!(initial_sl, 58800.0);

    // Preço sobe para $62,000 -> Trailing stop deve subir para $62,000 * (1 - 0.015) = $61,070
    let candle_high = Candle::new(1700000000, 60000.0, 62100.0, 59900.0, 62000.0, 100.0);
    let _ = engine.on_candle(candle_high);

    let updated_sl = engine.current_position.as_ref().unwrap().stop_loss;
    assert!(
        updated_sl > initial_sl,
        "Trailing stop must ratchet up with higher price: {} > {}",
        updated_sl,
        initial_sl
    );
    assert!((updated_sl - 61070.0).abs() < 1.0);

    // Preço recua para $61,000 (abaixo do trailing stop móvel de $61,070)
    let stop_exec = engine.check_stops(61000.0);
    assert!(
        stop_exec.is_some(),
        "Position must close at elevated trailing stop"
    );
    let exec = stop_exec.unwrap();
    assert!(
        exec.realized_pnl.unwrap() > 0.0,
        "Trailing stop must lock in profits: pnl = {}",
        exec.realized_pnl.unwrap()
    );
}

#[tokio::test]
async fn test_environment_adapter_trading_suite() {
    let candles = generate_synthetic_candles(42, 60, 65000.0);
    let mut env = TradingEnvironment::new("BTC-USDT", 10000.0, candles);

    // 1. Description e Signature
    let desc = env.description();
    assert_eq!(desc.environment_id, "crypto_trading_desk");
    assert!(desc.capabilities.contains(&"risk_control".to_string()));

    let sig = env.signature();
    assert_eq!(sig.action_space_kind, "Discrete4");

    // 2. Reset
    let initial_state = env.reset(42).await.expect("Reset should succeed");
    assert!(!env.is_terminal());
    assert!(!initial_state.inventory_has_target);

    // 3. Observe
    let obs = env.observe().await.expect("Observe should succeed");
    assert!(
        obs.target_relative_direction == RelativeDirection::North
            || obs.target_relative_direction == RelativeDirection::South
            || obs.target_relative_direction == RelativeDirection::NorthEast
            || obs.target_relative_direction == RelativeDirection::SouthEast
            || obs.target_relative_direction == RelativeDirection::Center
    );
    assert!(
        obs.target_distance_category == DistanceCategory::Immediate
            || obs.target_distance_category == DistanceCategory::Near
            || obs.target_distance_category == DistanceCategory::Medium
            || obs.target_distance_category == DistanceCategory::Far
    );

    // 4. Act (Approach -> Buy)
    let r1 = env
        .act(AbstractAction::Approach)
        .await
        .expect("Act Approach should succeed");
    assert!(r1.is_finite());

    // 5. Act (Wait -> Hold)
    let r2 = env
        .act(AbstractAction::Wait)
        .await
        .expect("Act Wait should succeed");
    assert!(r2.is_finite());

    // 6. Act (Avoid -> Sell / Close)
    let r3 = env
        .act(AbstractAction::Avoid)
        .await
        .expect("Act Avoid should succeed");
    assert!(r3.is_finite());

    // 7. Avançar até o final para verificar terminalidade
    while !env.is_terminal() {
        let _ = env.act(AbstractAction::Wait).await;
    }
    assert!(env.is_terminal());
}

#[test]
fn test_trading_decision_latency_sub_20_micros() {
    let candles = generate_synthetic_candles(777, 100, 62000.0);
    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Aquece com 25 velas
    for c in candles.iter().take(25) {
        engine.add_candle(c.clone());
    }

    let iterations = 1000;
    let test_candle = candles.last().unwrap().clone();

    let start = Instant::now();
    for _ in 0..iterations {
        let indicators = engine.compute_indicators().unwrap();
        let _signal = engine.evaluate_signal(&indicators, test_candle.close);
        let _stops = engine.check_stops(test_candle.close);
    }
    let elapsed = start.elapsed();
    let avg_micros = (elapsed.as_nanos() as f64 / iterations as f64) / 1000.0;

    println!(
        "Decision Latency Benchmark: {:.3} µs/decision (Requirement: < 20.0 µs)",
        avg_micros
    );

    assert!(
        avg_micros < 20.0,
        "Decision latency must be < 20 µs, measured {:.3} µs",
        avg_micros
    );
}

#[test]
fn test_approval_gateway_integration_on_large_orders() {
    let gateway = ApprovalGateway::new();
    let risk_policy = RiskPolicy {
        max_position_size: 100_000.0,
        ..RiskPolicy::default()
    };

    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        50000.0,
        risk_policy,
        ExchangeSimulationConfig::zero_fee(),
    )
    .with_approval_gateway(gateway.clone(), 5000.0); // Teto de aprovação: $5,000

    // Ordem de compra com valor $6,000 (excede threshold de $5,000)
    let res = engine.execute_order(TradingAction::Buy, OrderSide::Long, 60000.0, "LARGE_ORDER");
    assert!(
        res.is_err(),
        "Order exceeding approval threshold must be halted"
    );
    let err_str = res.err().unwrap().to_string();
    assert!(
        err_str.contains("requires human approval"),
        "Error should state human approval required: {}",
        err_str
    );

    // Verifica que uma requisição de aprovação foi registrada no Gateway
    let pending = gateway.list_pending();
    assert_eq!(pending.len(), 1);
    let req_id = &pending[0].id;
    assert_eq!(gateway.get_status(req_id), Some(ApprovalStatus::Pending));

    // Concede aprovação humana
    gateway
        .approve(req_id, "RiskOfficer")
        .expect("Approval should succeed");
    assert_eq!(gateway.get_status(req_id), Some(ApprovalStatus::Approved));

    // Agora a ordem pode ser executada
    let success_exec = engine.execute_order(
        TradingAction::Buy,
        OrderSide::Long,
        60000.0,
        "LARGE_ORDER_APPROVED",
    );
    assert!(success_exec.is_ok(), "Order should execute after approval");
    assert!(engine.current_position.is_some());
}

#[test]
fn test_exchange_simulation_fees_and_slippage() {
    let mut engine_sim = CryptoTraderEngine::new(
        "BTC-USDT",
        10000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::binance(), // Taker 0.05%, Slippage 0.01%
    );

    let price = 50000.0;
    let exec = engine_sim
        .execute_order(TradingAction::Buy, OrderSide::Long, price, "TEST_FEE_BUY")
        .expect("Execution should succeed")
        .expect("Trade should be executed");

    // Preço executado deve ser price * (1 + 0.0001) = $50,005.00
    assert!(
        exec.price > price,
        "Executed buy price must reflect slippage: {} > {}",
        exec.price,
        price
    );
    // Taxa de corretagem deduzida deve ser > 0
    assert!(exec.fee > 0.0, "Taker fee must be deducted");
    assert!(exec.slippage > 0.0, "Slippage must be recorded");

    // Fecha a posição
    let close_exec = engine_sim
        .close_current_position(51000.0, "TEST_FEE_CLOSE")
        .expect("Close should succeed")
        .expect("Close execution should exist");

    // Preço de venda deve sofrer slippage negativo: 51000 * (1 - 0.0001) = $50,994.90
    assert!(
        close_exec.price < 51000.0,
        "Executed sell price must reflect negative slippage: {} < 51000.0",
        close_exec.price
    );
    assert!(close_exec.fee > 0.0);
}

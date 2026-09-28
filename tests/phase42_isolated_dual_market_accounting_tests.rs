//! Suíte de Testes de Integração da Fase 42:
//! Segregação Rigorosa e Isolamento Contábil de Saldos Cripto vs Forex no ALR Trader
//!
//! Garante matematicamente 100% de isolamento entre os núcleos:
//! 1. Capital Inicial dividido com fidelidade contábil (50% Cripto / 50% Forex em Dual Market).
//! 2. Operações, perdas ou taxas em Cripto afetam exclusivamente o caixa e patrimônio de Cripto.
//! 3. Operações, lucros, pips ou taxas em Forex afetam exclusivamente o caixa e patrimônio de Forex.
//! 4. DeskStatusSnapshot e GraphTopology refletem estritamente saldos segregados e liderança de mercado.

use alr_connectors::trading::{
    Candle, MultiAssetConfig, MultiAssetTraderEngine, OrderSide, TradingPosition,
};

#[test]
fn test_dual_market_initial_capital_allocation() {
    // 1. Alocação em modo Dual Market ($50.000,00 total)
    let engine_dual = MultiAssetTraderEngine::new_dual_market(50_000.0);

    assert_eq!(engine_dual.initial_capital, 50_000.0);
    assert_eq!(engine_dual.crypto_initial_capital, 25_000.0);
    assert_eq!(engine_dual.forex_initial_capital, 25_000.0);
    assert_eq!(engine_dual.crypto_cash, 25_000.0);
    assert_eq!(engine_dual.forex_cash, 25_000.0);
    assert_eq!(engine_dual.total_cash, 50_000.0);
    assert_eq!(engine_dual.crypto_portfolio_value(), 25_000.0);
    assert_eq!(engine_dual.forex_portfolio_value(), 25_000.0);
    assert_eq!(engine_dual.total_portfolio_value(), 50_000.0);
    assert_eq!(engine_dual.crypto_realized_pnl, 0.0);
    assert_eq!(engine_dual.forex_realized_pnl, 0.0);
    assert_eq!(engine_dual.forex_total_pips, 0.0);
    assert_eq!(engine_dual.active_positions_count(), 0);

    // 2. Alocação exclusiva em Cripto ($50.000,00 total)
    let engine_crypto = MultiAssetTraderEngine::new(MultiAssetConfig::crypto(50_000.0));
    assert_eq!(engine_crypto.crypto_initial_capital, 50_000.0);
    assert_eq!(engine_crypto.forex_initial_capital, 0.0);
    assert_eq!(engine_crypto.crypto_cash, 50_000.0);
    assert_eq!(engine_crypto.forex_cash, 0.0);
    assert_eq!(engine_crypto.crypto_portfolio_value(), 50_000.0);
    assert_eq!(engine_crypto.forex_portfolio_value(), 0.0);

    // 3. Alocação exclusiva em Forex ($50.000,00 total)
    let engine_forex = MultiAssetTraderEngine::new_forex(50_000.0);
    assert_eq!(engine_forex.crypto_initial_capital, 0.0);
    assert_eq!(engine_forex.forex_initial_capital, 50_000.0);
    assert_eq!(engine_forex.crypto_cash, 0.0);
    assert_eq!(engine_forex.forex_cash, 50_000.0);
    assert_eq!(engine_forex.crypto_portfolio_value(), 0.0);
    assert_eq!(engine_forex.forex_portfolio_value(), 50_000.0);
}

#[test]
fn test_strict_accounting_isolation_crypto_trade_does_not_affect_forex() {
    let mut engine = MultiAssetTraderEngine::new_dual_market(50_000.0);

    let initial_forex_cash = engine.forex_cash;
    let initial_forex_val = engine.forex_portfolio_value();
    let initial_forex_realized = engine.forex_realized_pnl;

    // Simula abertura de posição em BTC-USDT
    // 0.1 BTC a 65.000 = $6.500 de custo
    let btc_entry = 65_000.0;
    let btc_qty = 0.1;
    let btc_pos = TradingPosition::new(
        "BTC-USDT",
        btc_entry,
        btc_qty,
        OrderSide::Long,
        64_000.0,
        67_000.0,
        1000,
    );

    // Debita o caixa cripto correspondente à compra
    let btc_cost = btc_entry * btc_qty;
    engine.crypto_cash -= btc_cost;
    engine.total_cash = engine.crypto_cash + engine.forex_cash;

    let btc_eng = engine.engines.get_mut("BTC-USDT").expect("BTC engine");
    btc_eng.current_position = Some(btc_pos);
    btc_eng.candles.push(Candle {
        timestamp: 1001,
        open: 65_000.0,
        high: 65_100.0,
        low: 63_800.0,
        close: 64_000.0, // Queda de preço
        volume: 10.0,
    });

    // Encerra a posição em prejuízo via close_position
    let exec = engine
        .close_position("BTC-USDT", "Stop loss stop out")
        .expect("Close position")
        .expect("Trade execution");

    assert!(exec.realized_pnl.unwrap() < 0.0);
    assert!(engine.crypto_realized_pnl < 0.0);
    assert!(engine.crypto_portfolio_value() < 25_000.0);
    assert!(engine.crypto_cash < 25_000.0);
    assert!(engine.crypto_max_drawdown_pct > 0.0);

    // ASSERÇÃO CRÍTICA DE ISOLAMENTO:
    // O núcleo Forex NÃO pode sofrer nenhuma alteração em seu caixa, PnL ou drawdown!
    assert_eq!(
        engine.forex_cash, initial_forex_cash,
        "forex_cash foi indevidamente contaminado por trade em Cripto"
    );
    assert_eq!(
        engine.forex_portfolio_value(),
        initial_forex_val,
        "forex_portfolio_value foi indevidamente contaminado por trade em Cripto"
    );
    assert_eq!(
        engine.forex_realized_pnl, initial_forex_realized,
        "forex_realized_pnl foi indevidamente contaminado por trade em Cripto"
    );
    assert_eq!(engine.forex_max_drawdown_pct, 0.0);
    assert_eq!(engine.forex_max_drawdown_usd, 0.0);
    assert_eq!(engine.forex_total_pips, 0.0);
}

#[test]
fn test_strict_accounting_isolation_forex_trade_does_not_affect_crypto() {
    let mut engine = MultiAssetTraderEngine::new_dual_market(50_000.0);

    // Primeiro executamos uma perda em Cripto para deixar os saldos assimétricos
    engine.crypto_cash = 24_800.0;
    engine.crypto_realized_pnl = -200.0;
    engine.total_cash = engine.crypto_cash + engine.forex_cash;

    let pre_crypto_cash = engine.crypto_cash;
    let pre_crypto_val = engine.crypto_portfolio_value();
    let pre_crypto_realized = engine.crypto_realized_pnl;

    // Simula abertura de posição em EUR-USD
    // 10.000 unidades (1 Mini Lote) a 1.0800 = $10.800 de custo
    let eur_entry = 1.0800;
    let eur_qty = 10_000.0;
    let eur_pos = TradingPosition::new(
        "EUR-USD",
        eur_entry,
        eur_qty,
        OrderSide::Long,
        1.0775,
        1.0850,
        2000,
    );

    let eur_cost = eur_entry * eur_qty;
    engine.forex_cash -= eur_cost;
    engine.total_cash = engine.crypto_cash + engine.forex_cash;

    let eur_eng = engine.engines.get_mut("EUR-USD").expect("EUR engine");
    eur_eng.current_position = Some(eur_pos);
    eur_eng.candles.push(Candle {
        timestamp: 2001,
        open: 1.0800,
        high: 1.0835,
        low: 1.0795,
        close: 1.0825, // Alta de +25 pips
        volume: 50.0,
    });

    // Encerra a posição em lucro via close_position
    let exec = engine
        .close_position("EUR-USD", "Take profit triggered")
        .expect("Close position")
        .expect("Trade execution");

    assert!(exec.realized_pnl.unwrap() > 0.0);
    assert!(engine.forex_realized_pnl > 0.0);
    assert!(engine.forex_portfolio_value() > 25_000.0);
    assert!(engine.forex_cash > 25_000.0);
    assert!(engine.forex_total_pips > 0.0);

    // ASSERÇÃO CRÍTICA DE ISOLAMENTO:
    // O núcleo Cripto NÃO pode sofrer nenhuma alteração em seu caixa, PnL ou patrimônio!
    assert_eq!(
        engine.crypto_cash, pre_crypto_cash,
        "crypto_cash foi indevidamente contaminado por trade em Forex"
    );
    assert_eq!(
        engine.crypto_portfolio_value(),
        pre_crypto_val,
        "crypto_portfolio_value foi indevidamente contaminado por trade em Forex"
    );
    assert_eq!(
        engine.crypto_realized_pnl, pre_crypto_realized,
        "crypto_realized_pnl foi indevidamente contaminado por trade em Forex"
    );
}

#[test]
fn test_desk_status_snapshot_and_graph_topology_segregated_fields() {
    let mut engine = MultiAssetTraderEngine::new_dual_market(50_000.0);

    // Estado assimétrico: Cripto no prejuízo (-$150), Forex no lucro (+$250)
    engine.crypto_cash = 24_850.0;
    engine.crypto_realized_pnl = -150.0;

    engine.forex_cash = 25_250.0;
    engine.forex_realized_pnl = 250.0;
    engine.forex_total_pips = 25.0;

    engine.total_cash = engine.crypto_cash + engine.forex_cash;
    engine.realized_pnl = engine.crypto_realized_pnl + engine.forex_realized_pnl;

    // 1. Snapshot da Mesa (Axum REST API)
    let snapshot = engine.get_desk_snapshot();

    assert_eq!(snapshot.crypto_initial_capital, 25_000.0);
    assert_eq!(snapshot.forex_initial_capital, 25_000.0);
    assert_eq!(snapshot.crypto_portfolio_value, 24_850.0);
    assert_eq!(snapshot.forex_portfolio_value, 25_250.0);
    assert_eq!(snapshot.crypto_cash_balance, 24_850.0);
    assert_eq!(snapshot.forex_cash_balance, 25_250.0);
    assert_eq!(snapshot.crypto_realized_pnl, -150.0);
    assert_eq!(snapshot.forex_realized_pnl, 250.0);
    assert_eq!(snapshot.forex_total_pips, 25.0);
    assert_eq!(snapshot.market_leader, "Forex");

    // Saldos NÃO podem ser iguais!
    assert_ne!(
        snapshot.crypto_portfolio_value, snapshot.forex_portfolio_value,
        "Saldos de Cripto e Forex não podem ser iguais com PnLs distintos"
    );
    assert_eq!(
        snapshot.total_portfolio_value,
        snapshot.crypto_portfolio_value + snapshot.forex_portfolio_value
    );

    // 2. Topologia em Grafo (/api/v1/desk/graph-topology)
    let topo = engine.get_graph_topology();

    assert_eq!(topo.crypto_hub.balance, 24_850.0);
    assert_eq!(topo.forex_hub.balance, 25_250.0);
    assert_eq!(topo.core_alr.balance, 24_850.0 + 25_250.0);
    assert_eq!(topo.crypto_hub.realized_pnl_usd, -150.0);
    assert_eq!(topo.forex_hub.realized_pnl_usd, 250.0);
    assert_eq!(topo.core_alr.realized_pnl_usd, 100.0);
    assert_eq!(topo.forex_hub.pnl_pips, 25.0);

    // Garantia absoluta de que não há divisão cega por 2
    assert_ne!(
        topo.crypto_hub.balance, topo.forex_hub.balance,
        "crypto_hub.balance e forex_hub.balance não podem ser iguais"
    );
}

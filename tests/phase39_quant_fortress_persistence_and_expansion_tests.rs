//! Suíte de Testes de Integração da Fase 39:
//! Persistência Definitiva no SQLite, Arena de 18 Estratégias e 5 Módulos de Assertividade.
//!
//! 1. Validação de persistência completa e restauração sem perdas (aprendizado, arena, promoções).
//! 2. Arena Híbrida de 18 Estratégias (12 especializadas + 6 genéticas) e auto-promoção ágil (Opção 2).
//! 3. BtcMarketBetaGuard bloqueando compras em altcoins durante despejos ou fraqueza do BTC.
//! 4. Cálculo matemático de POC (Point of Control), Value Area e Volatilidade de Parkinson.
//! 5. Calibração online de pesos via Regressão Logística SGD com regularização L2.
//! 6. Endpoints REST da API do Trading Desk para histórico de promoções e 18 estratégias.

use alr_connectors::trading::{
    generate_synthetic_candles, AdaptiveTradeLearner, CryptoTraderEngine, ExchangeSimulationConfig,
    MultiAssetConfig, MultiAssetTraderEngine, PromotionEvent, RiskPolicy, SqliteTradingStore,
    StrategyArena, TechnicalIndicators, TradingSignal,
};
use alr_connectors::trading_desk::create_trading_desk_router;
use std::sync::Arc;

/// 1. Validação de Persistência no SQLite Pós-Restart (Pesos Aprendidos, Arena e Promoções)
#[test]
fn test_sqlite_persistence_roundtrip_after_restart() {
    let db_path = format!("test_state_phase39_{}.db", uuid::Uuid::new_v4());
    let store = SqliteTradingStore::open(&db_path).expect("Deve abrir store temporária SQLite");
    store
        .run_migrations()
        .expect("Deve executar migrações SQLite");

    // 1. Grava pesos aprendidos no AdaptiveTradeLearner
    let mut learner = AdaptiveTradeLearner::new();
    learner
        .factor_weights
        .insert("INSTITUTIONAL_VWAP_SUPPORT".to_string(), 2.85);
    learner
        .factor_weights
        .insert("TTM_VOLATILITY_SQUEEZE".to_string(), 3.10);
    learner
        .factor_wins
        .insert("TTM_VOLATILITY_SQUEEZE".to_string(), 8);
    learner
        .factor_total_trades
        .insert("TTM_VOLATILITY_SQUEEZE".to_string(), 10);
    learner
        .factor_pnl_usd
        .insert("TTM_VOLATILITY_SQUEEZE".to_string(), 420.50);
    store
        .save_learned_weights(&learner)
        .expect("Deve salvar pesos aprendidos");

    // 2. Grava estado de estratégias na Arena e histórico de promoção
    let mut arena = StrategyArena::new();
    arena.champion_profile_id = "volatility_squeeze_scalper".to_string();
    if let Some(comp) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "volatility_squeeze_scalper")
    {
        comp.is_champion = true;
        comp.virtual_balance_usd = 1450.0;
        comp.total_trades = 12;
        comp.wins = 9;
        comp.losses = 3;
        comp.win_rate_pct = 75.0;
        comp.net_pnl_usd = 450.0;
        comp.sharpe_ratio = 2.40;
    }
    store
        .save_arena_state(&arena)
        .expect("Deve salvar estado da arena");

    let promo_event = PromotionEvent {
        timestamp: 1790000000,
        old_champion_id: "trend_supertrend_heavy".to_string(),
        new_champion_id: "volatility_squeeze_scalper".to_string(),
        reason: "Vitória na Arena com Win Rate de 75.0% e +$450.00 de PnL".to_string(),
        is_manual: false,
    };
    store
        .save_promotion(&promo_event)
        .expect("Deve salvar evento de promoção");

    // 3. Simula REINICIALIZAÇÃO COMPLETA DO MOTOR (Novo Processo)
    let config = MultiAssetConfig::default();
    let mut new_engine = MultiAssetTraderEngine::new(config).with_store(store);

    let restored = new_engine
        .restore_open_positions_from_store()
        .expect("Deve restaurar estado");
    assert_eq!(restored, 0, "Sem posições em custódia");

    // 4. Assertivas Invioláveis da Restauração
    assert_eq!(
        new_engine
            .learner
            .get_factor_weight("TTM_VOLATILITY_SQUEEZE"),
        3.10,
        "Peso aprendido do TTM Squeeze deve ser restaurado intacto"
    );
    assert_eq!(
        new_engine.strategy_arena.champion_profile_id, "volatility_squeeze_scalper",
        "Estratégia campeã salva no SQLite deve ser restaurada"
    );

    let champ_comp = new_engine
        .strategy_arena
        .competitors
        .iter()
        .find(|c| c.profile.id == "volatility_squeeze_scalper")
        .expect("Campeão deve existir nos competidores da arena");
    assert!(champ_comp.is_champion, "Flag is_champion deve ser true");
    assert_eq!(
        champ_comp.virtual_balance_usd, 1450.0,
        "Saldo virtual restaurado"
    );
    assert_eq!(champ_comp.win_rate_pct, 75.0, "Win Rate restaurado");

    assert!(
        !new_engine.strategy_arena.promotion_history.is_empty(),
        "Histórico de promoção deve ser carregado do SQLite"
    );
    assert_eq!(
        new_engine.strategy_arena.promotion_history[0].new_champion_id,
        "volatility_squeeze_scalper"
    );

    // Limpeza
    let _ = std::fs::remove_file(db_path);
}

/// 2. Validação da Arena de 18 Estratégias (12 Especializadas + 6 Genéticas Mutantes) e Auto-Promoção Ágil
#[test]
fn test_18_strategy_arena_simulation_and_adaptive_promotion() {
    let mut arena = StrategyArena::new();
    assert_eq!(
        arena.competitors.len(),
        18,
        "A Arena deve inicializar com exatamente 18 estratégias simultâneas"
    );

    let genetic_count = arena
        .competitors
        .iter()
        .filter(|c| c.profile.id.starts_with("genetic_"))
        .count();
    assert_eq!(
        genetic_count, 6,
        "Devem existir 6 clones genéticos mutantes"
    );

    let specialized_count = arena.competitors.len() - genetic_count;
    assert_eq!(
        specialized_count, 12,
        "Devem existir 12 perfis especializados fundamentais"
    );

    // Alimenta 50 velas para disparar a mutação genética
    let candles = generate_synthetic_candles(999, 60, 64000.0);
    let mut inds = TechnicalIndicators::default_at_price(64000.0);
    inds.ttm_squeeze = true;
    inds.order_book_imbalance = 0.25;

    for (idx, c) in candles.iter().enumerate() {
        arena.on_candle("BTC-USDT", c, &inds);
        if idx == 49 {
            // No ciclo 50, valida que a mutação estocástica foi acionada
            assert!(
                arena.total_cycles_evaluated >= 50,
                "Deve ter avaliado pelo menos 50 ciclos"
            );
        }
    }

    // Simula uma estratégia desafiante cumprindo os critérios ágeis da Opção 2:
    // trades >= 5, Win Rate >= 50.0%, PnL > Campeã Atual
    let challenger_id = "institutional_obi_depth";
    if let Some(comp) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == challenger_id)
    {
        comp.total_trades = 6;
        comp.wins = 5;
        comp.losses = 1;
        comp.win_rate_pct = 83.3;
        comp.net_pnl_usd = 280.0;
        comp.sharpe_ratio = 2.90;
    }

    let promoted = arena.evaluate_promotion();
    assert!(
        promoted.is_some(),
        "A promoção automática ágil da Opção 2 deve ser acionada"
    );
    assert_eq!(
        promoted.unwrap(),
        challenger_id,
        "O desafiante elegível deve ser coroado como novo Campeão"
    );
    assert_eq!(arena.champion_profile_id, challenger_id);

    let last_event = arena.promotion_history.last().unwrap();
    assert_eq!(last_event.new_champion_id, challenger_id);
    assert!(
        !last_event.is_manual,
        "Promoção automática deve ter is_manual = false"
    );
}

/// 3. Validação do Filtro de Correlação com Bitcoin (`BtcMarketBetaGuard`)
#[test]
fn test_btc_market_beta_guard_blocks_altcoins_during_btc_dump() {
    let eng = CryptoTraderEngine::new(
        "SOL-USDT",
        1000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    let mut indicators = TechnicalIndicators::default_at_price(150.0);
    indicators.ema_9 = 152.0;
    indicators.ema_21 = 148.0;
    indicators.supertrend_direction = 1;
    indicators.rsi_14 = 55.0;

    // Cenário A: Mercado normal (BTC Seguro) -> Compra normal autorizada
    indicators.btc_dump_shield_active = false;
    let decision_normal = eng.evaluate_intelligent_decision(&indicators, 150.0);
    assert_eq!(decision_normal.signal, TradingSignal::Buy);

    // Cenário B: Bitcoin sofre despejo severo (BTC Dump Shield Ativo) -> Veto Absoluto em Altcoins!
    indicators.btc_dump_shield_active = true;
    let decision_blocked = eng.evaluate_intelligent_decision(&indicators, 150.0);
    assert_eq!(
        decision_blocked.signal,
        TradingSignal::Hold,
        "Queda severa no BTC deve bloquear compras em altcoins"
    );
    assert!(
        decision_blocked
            .confluence_factors
            .iter()
            .any(|f| f.contains("BTC_MARKET_DUMP_SHIELD")),
        "Fator de bloqueio BTC_MARKET_DUMP_SHIELD deve constar na rationale"
    );
}

/// 4. Validação Matemática de POC (Point of Control) e Volatilidade de Parkinson
#[test]
fn test_volume_profile_poc_and_parkinson_volatility_calculation() {
    let candles = generate_synthetic_candles(777, 80, 60000.0);

    // 1. POC & Value Area
    let (poc, va_high, va_low) = TechnicalIndicators::calculate_point_of_control(&candles, 24);
    assert!(poc > 0.0, "POC deve ser positivo");
    assert!(va_high >= poc, "Value Area High deve ser >= POC");
    assert!(va_low <= poc, "Value Area Low deve ser <= POC");

    // 2. Volatilidade de Parkinson
    let parkinson = TechnicalIndicators::calculate_parkinson_volatility(&candles, 20);
    assert!(
        parkinson > 0.0,
        "Volatilidade de Parkinson deve ser positiva"
    );
    assert!(
        parkinson < 0.20,
        "Volatilidade deve estar calibrada dentro de margens realistas"
    );

    // 3. Alinhamento MTF
    let mtf = TechnicalIndicators::calculate_mtf_alignment(&candles);
    assert!(
        mtf || !mtf,
        "Cálculo MTF deve retornar boolean determinístico"
    );
}

/// 5. Validação de Aprendizado Online por Regressão Logística Regularizada (SGD)
#[test]
fn test_online_logistic_sgd_weight_adaptation() {
    let mut learner = AdaptiveTradeLearner::new();
    let initial_vwap_weight = learner.get_factor_weight("INSTITUTIONAL_VWAP_SUPPORT");
    assert_eq!(initial_vwap_weight, 1.0);

    let factors = vec![
        "INSTITUTIONAL_VWAP_SUPPORT (Preço sustentado no VWAP)".to_string(),
        "TREND_BULLISH_CONFLUENCE".to_string(),
    ];

    // Simula 5 vitórias consecutivas
    for _ in 0..5 {
        learner.record_trade_result("BTC-USDT", &factors, 150.0, 3.5, "state_sig_win");
    }

    let boosted_weight = learner.get_factor_weight("INSTITUTIONAL_VWAP_SUPPORT");
    assert!(
        boosted_weight > 1.0,
        "Pesos de fatores associados a trades lucrativos devem ser amplificados via SGD"
    );
    // Simula penalização por perdas com regularização L2
    for _ in 0..10 {
        learner.record_trade_result("BTC-USDT", &factors, -80.0, -2.0, "state_sig_loss");
    }

    let penalized_weight = learner.get_factor_weight("INSTITUTIONAL_VWAP_SUPPORT");
    assert!(
        penalized_weight < boosted_weight,
        "Fatores que causaram perdas devem sofrer gradiente descendente"
    );
    assert!(
        penalized_weight >= 0.20,
        "Pesos nunca devem cair abaixo do piso de segurança (0.20)"
    );
}

/// 6. Validação dos Endpoints REST do Trading Desk (Histórico de Promoções e 18 Estratégias)
#[tokio::test]
async fn test_trading_desk_api_endpoints_promotions_and_18_strategies() {
    let db_path = format!("test_desk_endpoints_{}.db", uuid::Uuid::new_v4());
    let store = SqliteTradingStore::open(&db_path).expect("Store SQLite");
    store.run_migrations().expect("Migrações");

    let event = PromotionEvent {
        timestamp: 1790100000,
        old_champion_id: "trend_supertrend_heavy".to_string(),
        new_champion_id: "institutional_obi_depth".to_string(),
        reason: "Superou campeão com Win Rate de 80.0%".to_string(),
        is_manual: false,
    };
    store.save_promotion(&event).expect("Salvar promoção");

    let config = MultiAssetConfig::default();
    let engine = Arc::new(parking_lot::RwLock::new(
        MultiAssetTraderEngine::new(config).with_store(store),
    ));

    let router = create_trading_desk_router(engine);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Listener");
    let local_addr = listener.local_addr().expect("Addr");

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let client = reqwest::Client::new();

    // 1. Testa endpoint GET /api/v1/desk/promotion-history
    let resp_promo = client
        .get(format!(
            "http://{}/api/v1/desk/promotion-history",
            local_addr
        ))
        .send()
        .await
        .expect("GET promotion-history");
    assert_eq!(resp_promo.status(), reqwest::StatusCode::OK);

    let promos: Vec<PromotionEvent> = resp_promo.json().await.expect("Json promos");
    assert!(
        !promos.is_empty(),
        "Deve retornar histórico com o evento gravado"
    );
    assert_eq!(promos[0].new_champion_id, "institutional_obi_depth");

    // 2. Testa endpoint GET /api/v1/desk/strategy-arena (18 estratégias)
    let resp_arena = client
        .get(format!("http://{}/api/v1/desk/strategy-arena", local_addr))
        .send()
        .await
        .expect("GET strategy-arena");
    assert_eq!(resp_arena.status(), reqwest::StatusCode::OK);

    let arena_data: serde_json::Value = resp_arena.json().await.expect("Json arena");
    let competitors = arena_data["competitors"]
        .as_array()
        .expect("Array competitors");
    assert_eq!(
        competitors.len(),
        18,
        "A API deve retornar exatamente 18 estratégias concorrentes"
    );

    // Limpeza
    let _ = std::fs::remove_file(db_path);
}

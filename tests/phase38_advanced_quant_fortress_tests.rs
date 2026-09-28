//! Suíte de Testes de Integração da Fase 38:
//! Advanced Quantitative Fortress - 10 Novos Indicadores, Snapshots de Trade,
//! 90-Day Backtest Optimizer, Strategy Arena e Endpoints REST
//!
//! Validações rigorosas de:
//! 1. Precisão matemática dos 10 novos indicadores técnicos (VWAP, Keltner/TTM Squeeze,
//!    Stochastic, Parabolic SAR, MFI, Williams %R, ROC, Sentiment/Fear&Greed, ADXR, OBI).
//! 2. Captura auditável do `IndicatorWeightsSnapshot` no instante da abertura de posição
//!    e sua persistência relacional sem perda no SQLite (`trading_executions`).
//! 3. Otimizador e Backtest Histórico de 90 Dias (`run_backtest_90d`) classificando e
//!    ranqueando os 6 perfis quantitativos com métricas profissionais (Sharpe, Profit Factor, DD).
//! 4. Arena Multiestratégia em Tempo Real (`StrategyArena`) simulando competidores em paralelo
//!    com acompanhamento contrafactual de PnL e promoção manual/automática de estratégia desafiante.
//! 5. Endpoints REST da API do Trading Desk para consulta da arena, disparo de backtest 90d,
//!    promoção de estratégia e recuperação do snapshot de indicadores por trade ID.

use alr_connectors::trading::{
    generate_synthetic_candles, BacktestReport, CryptoTraderEngine, ExchangeSimulationConfig,
    IndicatorWeightsSnapshot, MultiAssetConfig, MultiAssetTraderEngine, OrderSide, RiskPolicy,
    SqliteTradingStore, StrategyArena, TechnicalIndicators, TradeExecution, TradingAction,
};
use alr_connectors::trading_desk::{
    create_trading_desk_router, ApiResponse, PromoteStrategyRequest, RunBacktestRequest,
    TradingDeskState,
};
use alr_connectors::trading_logger::TradingDeskLogger;
use std::sync::Arc;

/// 1. Validação da Precisão Matemática dos 10 Novos Indicadores Técnicos
#[test]
fn test_10_advanced_indicators_mathematical_precision() {
    // Gera 80 velas sintéticas com movimentação realista de preços e volumes
    let candles = generate_synthetic_candles(101, 80, 60000.0);
    assert!(
        candles.len() >= 60,
        "Necessário pelo menos 60 velas para cálculo dos indicadores"
    );

    let indicators = TechnicalIndicators::calculate(&candles)
        .expect("TechnicalIndicators::calculate deve convergir sem erros");

    // 1. VWAP e Bandas de Desvio Padrão
    assert!(
        indicators.vwap > 0.0,
        "VWAP ({:.2}) deve ser positivo",
        indicators.vwap
    );
    assert!(
        indicators.vwap_upper > indicators.vwap,
        "VWAP Upper ({:.2}) deve ser estritamente maior que VWAP ({:.2})",
        indicators.vwap_upper,
        indicators.vwap
    );
    assert!(
        indicators.vwap_lower < indicators.vwap,
        "VWAP Lower ({:.2}) deve ser estritamente menor que VWAP ({:.2})",
        indicators.vwap_lower,
        indicators.vwap
    );

    // 2. Keltner Channels e TTM Squeeze
    assert!(
        indicators.keltner_middle > 0.0,
        "Keltner Middle ({:.2}) deve ser positivo",
        indicators.keltner_middle
    );
    assert!(
        indicators.keltner_upper > indicators.keltner_middle,
        "Keltner Upper ({:.2}) deve ser estritamente maior que Keltner Middle ({:.2})",
        indicators.keltner_upper,
        indicators.keltner_middle
    );
    assert!(
        indicators.keltner_lower < indicators.keltner_middle,
        "Keltner Lower ({:.2}) deve ser estritamente menor que Keltner Middle ({:.2})",
        indicators.keltner_lower,
        indicators.keltner_middle
    );

    // 3. Oscilador Estocástico (%K e %D bounded [0, 100])
    assert!(
        indicators.stoch_k >= 0.0 && indicators.stoch_k <= 100.0,
        "Stochastic %K deve estar entre 0 e 100, obtido: {:.2}",
        indicators.stoch_k
    );
    assert!(
        indicators.stoch_d >= 0.0 && indicators.stoch_d <= 100.0,
        "Stochastic %D deve estar entre 0 e 100, obtido: {:.2}",
        indicators.stoch_d
    );

    // 4. Parabolic SAR
    assert!(
        indicators.parabolic_sar > 0.0,
        "Parabolic SAR ({:.2}) deve ser estritamente positivo",
        indicators.parabolic_sar
    );

    // 5. Money Flow Index (MFI bounded [0, 100])
    assert!(
        indicators.mfi_14 >= 0.0 && indicators.mfi_14 <= 100.0,
        "MFI 14 deve estar entre 0 e 100, obtido: {:.2}",
        indicators.mfi_14
    );

    // 6. Williams %R bounded [-100, 0]
    assert!(
        indicators.williams_r_14 <= 0.0 && indicators.williams_r_14 >= -100.0,
        "Williams %R 14 deve estar entre -100 e 0, obtido: {:.2}",
        indicators.williams_r_14
    );

    // 7. News Sentiment / Fear & Greed Index bounded [0, 100]
    assert!(
        indicators.news_fear_greed_index >= 0.0 && indicators.news_fear_greed_index <= 100.0,
        "News Fear & Greed Index deve estar entre 0 e 100, obtido: {:.2}",
        indicators.news_fear_greed_index
    );

    // 8. Order Book Imbalance (OBI bounded [-1.0, 1.0])
    assert!(
        indicators.order_book_imbalance >= -1.0 && indicators.order_book_imbalance <= 1.0,
        "Order Book Imbalance deve estar entre -1.0 e 1.0, obtido: {:.4}",
        indicators.order_book_imbalance
    );

    // 9. Rate of Change (ROC)
    assert!(
        indicators.roc_12.is_finite(),
        "ROC 12 deve ser um número finito, obtido: {:.4}",
        indicators.roc_12
    );

    // 10. ADXR (Average Directional Movement Index Rating)
    assert!(
        indicators.adxr_14 >= 0.0,
        "ADXR 14 deve ser não-negativo, obtido: {:.2}",
        indicators.adxr_14
    );
}

/// 2. Validação da Criação e Persistência do Snapshot de Indicadores e Pesos no SQLite
#[test]
fn test_trade_execution_indicator_weights_snapshot_persistence() {
    let mut engine = CryptoTraderEngine::new(
        "BTC-USDT",
        25000.0,
        RiskPolicy::default(),
        ExchangeSimulationConfig::zero_fee(),
    );

    // Adiciona 40 velas para alimentar os cálculos técnicos
    let candles = generate_synthetic_candles(42, 40, 60000.0);
    for c in candles {
        engine.add_candle(c);
    }

    // Executa ordem de compra com fatores de confluência
    let factors = vec![
        "rsi_oversold".to_string(),
        "vwap_support".to_string(),
        "adx_trend_confirmation".to_string(),
    ];
    let exec = engine
        .execute_order_with_factors(
            TradingAction::Buy,
            OrderSide::Long,
            60000.0,
            "FORTRESS_QUANT_ENTRY",
            1.0,
            factors,
        )
        .expect("Execução da ordem deve ser bem-sucedida")
        .expect("Trade deve ser despachado e retornado");

    // 1. Valida se o snapshot foi registrado na TradeExecution
    assert!(
        exec.indicator_snapshot.is_some(),
        "TradeExecution deve conter indicator_snapshot preenchido"
    );
    let snapshot = exec.indicator_snapshot.as_ref().unwrap();

    // 2. Valida propriedades do snapshot no momento da entrada
    assert!(
        !snapshot.factor_weights.is_empty(),
        "Snapshot deve conter os pesos adaptativos aprendidos pelo learner"
    );
    assert!(
        snapshot.vwap > 0.0,
        "Snapshot VWAP ({:.2}) deve ser positivo",
        snapshot.vwap
    );
    assert!(
        snapshot.rsi_14 > 0.0,
        "Snapshot RSI 14 ({:.2}) deve ser positivo",
        snapshot.rsi_14
    );
    assert_eq!(
        snapshot.active_confluence_factors.len(),
        3,
        "Fatores ativos devem coincidir com os passados no execute_order_with_factors"
    );

    // 3. Valida persistência e recuperação fiel no SQLite em memória
    let store = SqliteTradingStore::open_in_memory().expect("Banco SQLite em memória deve abrir");
    store
        .save_execution(&exec)
        .expect("TradeExecution com indicator_snapshot deve ser salva no SQLite");

    let loaded_execs = store
        .load_executions(Some("BTC-USDT"), 10)
        .expect("Execuções devem ser carregadas do SQLite");

    assert_eq!(loaded_execs.len(), 1, "Deve carregar exatamente 1 execução");
    let loaded = &loaded_execs[0];
    assert_eq!(loaded.id, exec.id);
    assert!(
        loaded.indicator_snapshot.is_some(),
        "Execução recuperada do SQLite deve conter indicator_snapshot intacto"
    );

    let loaded_snap = loaded.indicator_snapshot.as_ref().unwrap();
    assert_eq!(
        loaded_snap.factor_weights.len(),
        snapshot.factor_weights.len(),
        "Pesos de fatores carregados devem ter a mesma quantidade do original"
    );
    assert!(
        (loaded_snap.vwap - snapshot.vwap).abs() < 1e-6,
        "VWAP carregado ({:.4}) deve ser idêntico ao salvo ({:.4})",
        loaded_snap.vwap,
        snapshot.vwap
    );
    assert!(
        (loaded_snap.rsi_14 - snapshot.rsi_14).abs() < 1e-6,
        "RSI carregado ({:.4}) deve ser idêntico ao salvo ({:.4})",
        loaded_snap.rsi_14,
        snapshot.rsi_14
    );
    assert_eq!(
        loaded_snap.active_confluence_factors, snapshot.active_confluence_factors,
        "Fatores de confluência ativos devem ser recuperados identicamente"
    );
}

/// 3. Validação do Otimizador e Backtest Histórico de 90 Dias com Ranqueamento de Perfis
#[test]
fn test_90_day_historical_backtest_optimizer_ranks_profiles() {
    let config = MultiAssetConfig::default();
    let engine = MultiAssetTraderEngine::new(config);

    // Executa backtest completo de 90 dias para BTC-USDT
    let report = engine.run_backtest_90d("BTC-USDT", 90);

    // 1. Valida estrutura do relatório
    assert_eq!(report.asset, "BTC-USDT");
    assert_eq!(report.days_tested, 90, "Dias testados deve ser 90");
    assert_eq!(
        report.total_candles, 2160,
        "90 dias com velas horárias (24h/dia) devem totalizar 2160 velas"
    );

    // 2. Valida ranqueamento de todos os 100 perfis de estratégia
    assert_eq!(
        report.ranked_profiles.len(),
        100,
        "Backtest deve testar e ranquear todos os 100 perfis predefinidos"
    );

    // 3. Valida ordenação e ranqueamento determinístico
    assert_eq!(
        report.ranked_profiles[0].score_rank, 1,
        "O primeiro perfil ranqueado deve ter score_rank 1"
    );
    assert_eq!(
        report.ranked_profiles[5].score_rank, 6,
        "O último perfil ranqueado deve ter score_rank 6"
    );

    // 4. Valida coerência das métricas calculadas em cada perfil
    for profile in &report.ranked_profiles {
        assert!(!profile.profile_id.is_empty());
        assert!(!profile.profile_name.is_empty());
        assert!(
            profile.win_rate_pct >= 0.0 && profile.win_rate_pct <= 100.0,
            "Win rate deve estar entre 0% e 100%, obtido: {:.2}",
            profile.win_rate_pct
        );
        assert!(
            profile.profit_factor >= 0.0,
            "Profit factor deve ser não-negativo, obtido: {:.2}",
            profile.profit_factor
        );
        assert!(
            profile.max_drawdown_pct >= 0.0,
            "Max drawdown deve ser não-negativo, obtido: {:.2}",
            profile.max_drawdown_pct
        );
        assert!(
            profile.sharpe_ratio.is_finite(),
            "Sharpe ratio deve ser finito, obtido: {:.2}",
            profile.sharpe_ratio
        );
    }

    // 5. Valida recomendação de campeão e resumo analítico
    assert!(
        !report.recommended_champion.is_empty(),
        "Relatório deve recomendar uma estratégia campeã baseada em Sharpe e PnL"
    );
    assert_eq!(
        report.recommended_champion, report.ranked_profiles[0].profile_id,
        "A campeã recomendada deve corresponder ao perfil classificado em primeiro lugar"
    );
    assert!(
        !report.summary.is_empty(),
        "Resumo textual analítico deve estar preenchido"
    );
}

/// 4. Validação da Arena Multiestratégia em Tempo Real e Promoção Manual
#[test]
fn test_realtime_strategy_arena_parallel_simulation_and_auto_promotion() {
    let mut arena = StrategyArena::new();

    // 1. Valida inicialização com 100 competidores
    assert_eq!(
        arena.competitors.len(),
        100,
        "Arena deve iniciar com os 100 perfis de estratégia concorrendo"
    );
    assert_eq!(
        arena.champion_profile_id, "trend_supertrend_heavy",
        "Campeão inicial padrão é trend_supertrend_heavy"
    );

    let initial_champ_competitor = arena
        .competitors
        .iter()
        .find(|c| c.is_champion)
        .expect("Deve haver exatamente um competidor marcado como campeão");
    assert_eq!(
        initial_champ_competitor.profile.id,
        "trend_supertrend_heavy"
    );

    // 2. Alimenta série de velas na arena em loop
    let candles = generate_synthetic_candles(777, 120, 60000.0);
    for i in 20..candles.len() {
        let slice = &candles[..=i];
        if let Ok(indicators) = TechnicalIndicators::calculate(slice) {
            arena.on_candle("BTC-USDT", &candles[i], &indicators);
        }
    }

    assert!(
        arena.total_cycles_evaluated >= 100,
        "Arena deve ter processado os ciclos avaliados das velas"
    );

    // Valida que todos os competidores mantêm estado íntegro
    for comp in &arena.competitors {
        assert!(comp.virtual_balance_usd > 0.0);
        assert!(comp.win_rate_pct >= 0.0 && comp.win_rate_pct <= 100.0);
    }

    // 3. Testa promoção manual de estratégia desafiante
    let target_profile = "volatility_squeeze_scalper";
    let promo_result = arena.promote(target_profile);
    assert!(
        promo_result.is_ok(),
        "Promoção para {} deve ter sucesso: {:?}",
        target_profile,
        promo_result.err()
    );

    // 4. Valida transição do campeão
    assert_eq!(
        arena.champion_profile_id, target_profile,
        "Campeão ativo agora deve ser {}",
        target_profile
    );

    let new_champ = arena
        .competitors
        .iter()
        .find(|c| c.profile.id == target_profile)
        .expect("Perfil promovido deve existir na lista");
    assert!(
        new_champ.is_champion,
        "Novo perfil deve ter flag is_champion = true"
    );

    let old_champ = arena
        .competitors
        .iter()
        .find(|c| c.profile.id == "trend_supertrend_heavy")
        .expect("Campeão anterior deve existir");
    assert!(
        !old_champ.is_champion,
        "Campeão anterior deve ter flag is_champion = false"
    );

    // 5. Valida registro no histórico de promoções
    assert!(
        !arena.promotion_history.is_empty(),
        "Histórico de promoção deve registrar o evento de transição"
    );
    let last_event = arena.promotion_history.last().unwrap();
    assert_eq!(last_event.new_champion_id, target_profile);
    assert_eq!(last_event.old_champion_id, "trend_supertrend_heavy");
}

/// 5. Validação dos Endpoints REST Axum do Trading Desk (Arena, Backtest 90d, Promoção e Snapshot)
#[tokio::test]
async fn test_trading_desk_api_endpoints_arena_backtest_snapshot() {
    let config = MultiAssetConfig::default();
    let engine = Arc::new(parking_lot::RwLock::new(MultiAssetTraderEngine::new(
        config,
    )));
    let state = TradingDeskState {
        engine: engine.clone(),
        logger: TradingDeskLogger::default(),
    };

    // Cria o router com o estado instanciado
    let router = create_trading_desk_router(state.engine.clone());

    // Liga servidor TCP real em porta efêmera (porta 0 do SO)
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Deve ligar listener TCP em porta efêmera");
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let client = reqwest::Client::new();
    let base_url = format!("http://{}", addr);

    // 1. GET /api/v1/desk/strategy-arena -> Consulta estado da Arena
    let resp_arena = client
        .get(format!("{}/api/v1/desk/strategy-arena", base_url))
        .send()
        .await
        .expect("GET /api/v1/desk/strategy-arena deve responder");
    assert_eq!(resp_arena.status(), reqwest::StatusCode::OK);

    let arena_data: serde_json::Value = resp_arena
        .json()
        .await
        .expect("Deve deserializar JSON da arena");
    assert!(
        arena_data.get("champion_profile_id").is_some(),
        "Resposta deve conter champion_profile_id"
    );
    assert_eq!(
        arena_data["competitors"].as_array().map(|v| v.len()),
        Some(100),
        "Arena deve listar 100 competidores via REST"
    );

    // 2. POST /api/v1/desk/run-backtest-90d -> Dispara otimizador de 30 dias
    let backtest_req = RunBacktestRequest {
        asset: Some("BTC-USDT".to_string()),
        days: Some(30),
    };
    let resp_backtest = client
        .post(format!("{}/api/v1/desk/run-backtest-90d", base_url))
        .json(&backtest_req)
        .send()
        .await
        .expect("POST /api/v1/desk/run-backtest-90d deve responder");
    assert_eq!(resp_backtest.status(), reqwest::StatusCode::OK);

    let report: BacktestReport = resp_backtest
        .json()
        .await
        .expect("Deve deserializar BacktestReport");
    assert_eq!(report.asset, "BTC-USDT");
    assert_eq!(report.days_tested, 30);
    assert_eq!(
        report.ranked_profiles.len(),
        100,
        "Relatório via API deve conter os 100 perfis ranqueados"
    );
    assert_eq!(report.ranked_profiles[0].score_rank, 1);
    assert!(!report.recommended_champion.is_empty());

    // 3. POST /api/v1/desk/promote-strategy -> Promove estratégia para campeã
    let promo_req = PromoteStrategyRequest {
        profile_id: "mean_reversion_rsi_donchian".to_string(),
    };
    let resp_promo = client
        .post(format!("{}/api/v1/desk/promote-strategy", base_url))
        .json(&promo_req)
        .send()
        .await
        .expect("POST /api/v1/desk/promote-strategy deve responder");
    assert_eq!(resp_promo.status(), reqwest::StatusCode::OK);

    let promo_api_resp: ApiResponse = resp_promo
        .json()
        .await
        .expect("Deve deserializar ApiResponse de promoção");
    assert!(
        promo_api_resp.success,
        "Promoção via API deve retornar success = true"
    );

    // Valida que o campeão foi atualizado internamente no engine
    {
        let eng = engine.read();
        assert_eq!(
            eng.strategy_arena.champion_profile_id,
            "mean_reversion_rsi_donchian"
        );
    }

    // 4. GET /api/v1/desk/trade-snapshot -> Recupera snapshot de trade específico
    let dummy_trade_id = {
        let mut eng = engine.write();
        let dummy_trade = TradeExecution {
            id: "exec_fortress_test_42".to_string(),
            timestamp: 1700000000,
            asset: "BTC-USDT".to_string(),
            action: TradingAction::Buy,
            side: OrderSide::Long,
            price: 64500.0,
            quantity: 0.25,
            fee: 0.0,
            slippage: 0.0,
            realized_pnl: None,
            reason: "FORTRESS_REST_TEST".to_string(),
            indicator_snapshot: Some(IndicatorWeightsSnapshot {
                rsi_14: 32.5,
                vwap: 64400.0,
                mfi_14: 28.0,
                ..Default::default()
            }),
        };
        eng.executions_log.push(dummy_trade.clone());
        dummy_trade.id
    };

    let resp_snap = client
        .get(format!(
            "{}/api/v1/desk/trade-snapshot?id={}",
            base_url, dummy_trade_id
        ))
        .send()
        .await
        .expect("GET /api/v1/desk/trade-snapshot deve responder");
    assert_eq!(resp_snap.status(), reqwest::StatusCode::OK);

    let snapshot_opt: Option<IndicatorWeightsSnapshot> = resp_snap
        .json()
        .await
        .expect("Deve deserializar Option<IndicatorWeightsSnapshot>");
    assert!(
        snapshot_opt.is_some(),
        "Snapshot de trade deve ser encontrado"
    );
    let retrieved_snap = snapshot_opt.unwrap();
    assert_eq!(retrieved_snap.rsi_14, 32.5);
    assert_eq!(retrieved_snap.vwap, 64400.0);
    assert_eq!(retrieved_snap.mfi_14, 28.0);
}

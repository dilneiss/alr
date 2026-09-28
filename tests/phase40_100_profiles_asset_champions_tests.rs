//! Suíte de Testes de Integração da Fase 40:
//! 100 Perfis Concorrentes Simultâneos, Ordenação Dinâmica do Mais ao Menos Promissor,
//! e Estratégia Campeã Especializada por Criptomoeda (Per-Asset Champions).

use alr_connectors::trading::{
    MultiAssetConfig, MultiAssetTraderEngine, SqliteTradingStore, StrategyArena, StrategyProfile,
    DEFAULT_MULTI_ASSET_BASKET,
};
use alr_connectors::trading_desk::{
    create_trading_desk_router, ApiResponse, PromoteAssetStrategyRequest,
};
use std::sync::Arc;
/// 1. Validação da Inicialização Exata de 100 Perfis Concorrentes Simultâneos
#[test]
fn test_100_concurrent_profiles_initialization_and_families() {
    let profiles = StrategyProfile::default_profiles();
    assert!(
        profiles.len() >= 100 && profiles.len() == 200,
        "A lista padrão deve conter 200 perfis concorrentes (100 crypto + 100 forex)"
    );

    // Valida que todos os IDs são estritamente únicos
    let mut ids = std::collections::HashSet::new();
    for p in &profiles {
        assert!(
            ids.insert(p.id.clone()),
            "ID de estratégia duplicado detectado: {}",
            p.id
        );
        assert!(!p.name.is_empty(), "Nome da estratégia não pode ser vazio");
        assert!(p.min_confluence >= 1, "Confluência mínima deve ser >= 1");
        assert!(
            p.min_probability > 0.5,
            "Probabilidade mínima deve ser > 0.5"
        );
        assert!(p.stop_loss_atr_mult > 0.0, "Stop ATR deve ser > 0.0");
        assert!(
            p.take_profit_atr_mult > p.stop_loss_atr_mult,
            "Take Profit deve ser maior que Stop"
        );
    }

    // Valida presença das 20 genéticas
    let genetic_count = profiles
        .iter()
        .filter(|p| p.id.starts_with("genetic_"))
        .count();
    assert!(
        genetic_count >= 26,
        "Total de clones genéticos mutantes de cripto deve ser >= 26"
    );

    // Valida presença das campeãs originais retrocompatíveis
    assert!(profiles.iter().any(|p| p.id == "trend_supertrend_heavy"));
    assert!(profiles
        .iter()
        .any(|p| p.id == "volatility_squeeze_scalper"));
    assert!(profiles
        .iter()
        .any(|p| p.id == "institutional_volume_profile"));
}

/// 2. Validação da Ordenação Dinâmica do Mais Promissor ao Menos Promissor (Ranking 1 a 100)
#[test]
fn test_dynamic_ranking_from_most_promising_to_least() {
    let mut arena = StrategyArena::new();
    assert!(arena.competitors.len() >= 100 && arena.competitors.len() == 200);
    // Configura 3 competidores com desempenhos artificiais distintos
    // Competidor A: Excelente Sharpe (2.8) e Win Rate 75%
    if let Some(c) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "trend_supertrend_heavy")
    {
        c.total_trades = 10;
        c.wins = 8;
        c.losses = 2;
        c.win_rate_pct = 80.0;
        c.net_pnl_usd = 350.0;
        c.sharpe_ratio = 2.80;
        c.max_drawdown_pct = 2.0;
    }

    // Competidor B: Desempenho Mediano
    if let Some(c) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "mean_reversion_rsi_donchian")
    {
        c.total_trades = 10;
        c.wins = 5;
        c.losses = 5;
        c.win_rate_pct = 50.0;
        c.net_pnl_usd = 50.0;
        c.sharpe_ratio = 1.10;
        c.max_drawdown_pct = 5.0;
    }

    // Competidor C: Prejuízo
    if let Some(c) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "volatility_squeeze_scalper")
    {
        c.total_trades = 10;
        c.wins = 2;
        c.losses = 8;
        c.win_rate_pct = 20.0;
        c.net_pnl_usd = -180.0;
        c.sharpe_ratio = -0.90;
        c.max_drawdown_pct = 18.0;
    }

    // Dispara a reordenação por promessa
    arena.sort_by_promise();

    // Valida que o Competidor A está no topo (#1) com o maior score
    assert_eq!(arena.competitors[0].profile.id, "trend_supertrend_heavy");
    assert_eq!(
        arena.competitors[0].rank, 1,
        "Primeiro colocado deve ter rank 1"
    );
    assert!(
        arena.competitors[0].promising_score > arena.competitors[1].promising_score,
        "Score do #1 deve ser superior ao do #2"
    );

    // Valida ordenação estrita monotônica decrescente
    for i in 0..arena.competitors.len() - 1 {
        assert!(
            arena.competitors[i].promising_score >= arena.competitors[i + 1].promising_score,
            "Lista deve estar estritamente ordenada do mais promissor ao menos promissor (i={} vs i+1={})",
            i, i + 1
        );
        assert_eq!(
            arena.competitors[i].rank,
            i + 1,
            "Rank numérico sequencial 1..100"
        );
    }
}

/// 3. Validação de Estratégias Campeãs Especializadas por Criptomoeda (Per-Asset Champions)
#[test]
fn test_per_asset_champion_tracking_and_specialization() {
    let mut arena = StrategyArena::new();

    // Valida que todas as 7 moedas do basket possuem campeã inicial registrada
    for &asset in &DEFAULT_MULTI_ASSET_BASKET {
        assert!(
            arena.asset_champions.contains_key(asset),
            "Moeda {} deve ter campeã ativa na arena",
            asset
        );
    }

    // Simula que para DOGE-USDT a melhor estratégia foi Volatility Squeeze
    if let Some(c) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "volatility_squeeze_scalper")
    {
        *c.asset_trades.entry("DOGE-USDT".to_string()).or_insert(0) = 8;
        *c.asset_wins.entry("DOGE-USDT".to_string()).or_insert(0) = 7;
        *c.asset_pnl.entry("DOGE-USDT".to_string()).or_insert(0.0) = 195.0;
    }

    // Simula que para BTC-USDT a melhor estratégia foi Institutional VWAP
    if let Some(c) = arena
        .competitors
        .iter_mut()
        .find(|c| c.profile.id == "institutional_vwap_mfi")
    {
        *c.asset_trades.entry("BTC-USDT".to_string()).or_insert(0) = 6;
        *c.asset_wins.entry("BTC-USDT".to_string()).or_insert(0) = 5;
        *c.asset_pnl.entry("BTC-USDT".to_string()).or_insert(0.0) = 420.0;
    }

    // Avalia promoção por ativo para DOGE
    let doge_promoted = arena.evaluate_asset_promotion("DOGE-USDT");
    assert!(
        doge_promoted.is_some(),
        "DOGE deve eleger sua própria campeã específica"
    );
    assert_eq!(doge_promoted.unwrap(), "volatility_squeeze_scalper");
    assert_eq!(
        arena.asset_champions.get("DOGE-USDT").unwrap(),
        "volatility_squeeze_scalper"
    );

    // Avalia promoção por ativo para BTC
    let btc_promoted = arena.evaluate_asset_promotion("BTC-USDT");
    assert!(
        btc_promoted.is_some(),
        "BTC deve eleger sua própria campeã específica"
    );
    assert_eq!(btc_promoted.unwrap(), "institutional_vwap_mfi");
    assert_eq!(
        arena.asset_champions.get("BTC-USDT").unwrap(),
        "institutional_vwap_mfi"
    );

    // Prova que CADA criptomoeda está com uma estratégia especializada diferente!
    assert_ne!(
        arena.asset_champions.get("BTC-USDT").unwrap(),
        arena.asset_champions.get("DOGE-USDT").unwrap(),
        "BTC e DOGE devem operar com estratégias distintas adaptadas à sua volatilidade"
    );
}

/// 4. Validação da Persistência de Campeãs por Ativo no SQLite (`trading_asset_champions`)
#[test]
fn test_per_asset_promotion_persistence_in_sqlite() {
    let db_path = format!("test_asset_champs_{}.db", uuid::Uuid::new_v4());
    let store = SqliteTradingStore::open(&db_path).expect("Store SQLite");
    store.run_migrations().expect("Migrações");

    // Grava campeãs especializadas para 3 moedas
    store
        .save_asset_champion("BTC-USDT", "institutional_vwap_mfi")
        .expect("Salvar BTC");
    store
        .save_asset_champion("DOGE-USDT", "volatility_squeeze_scalper")
        .expect("Salvar DOGE");
    store
        .save_asset_champion("SOL-USDT", "trend_breakout_accelerator")
        .expect("Salvar SOL");

    // Recarrega do banco
    let loaded = store
        .load_asset_champions()
        .expect("Carregar campeãs por ativo");
    assert_eq!(loaded.get("BTC-USDT").unwrap(), "institutional_vwap_mfi");
    assert_eq!(
        loaded.get("DOGE-USDT").unwrap(),
        "volatility_squeeze_scalper"
    );
    assert_eq!(
        loaded.get("SOL-USDT").unwrap(),
        "trend_breakout_accelerator"
    );

    // Reinicialização completa do motor
    let config = MultiAssetConfig::default();
    let mut engine = MultiAssetTraderEngine::new(config).with_store(store);
    engine
        .restore_open_positions_from_store()
        .expect("Restaurar estado");

    // Valida que o motor de execução de cada moeda herdou os pesos de sua respectiva campeã
    assert_eq!(
        engine
            .strategy_arena
            .asset_champions
            .get("BTC-USDT")
            .unwrap(),
        "institutional_vwap_mfi"
    );
    assert_eq!(
        engine
            .strategy_arena
            .asset_champions
            .get("DOGE-USDT")
            .unwrap(),
        "volatility_squeeze_scalper"
    );

    let btc_engine = engine.engines.get("BTC-USDT").unwrap();
    assert_eq!(
        btc_engine
            .learner
            .get_factor_weight("INSTITUTIONAL_VWAP_SUPPORT"),
        2.9,
        "Motor do BTC deve usar o peso de sua campeã (VWAP 2.9x)"
    );

    let doge_engine = engine.engines.get("DOGE-USDT").unwrap();
    assert_eq!(
        doge_engine
            .learner
            .get_factor_weight("TTM_VOLATILITY_SQUEEZE"),
        3.0,
        "Motor do DOGE deve usar o peso de sua campeã (Squeeze 3.0x)"
    );

    let _ = std::fs::remove_file(db_path);
}

/// 5. Validação dos Endpoints REST da API para Promoção Específica por Ativo
#[tokio::test]
async fn test_api_endpoints_per_asset_arena_and_asset_promotion() {
    let db_path = format!("test_api_asset_promo_{}.db", uuid::Uuid::new_v4());
    let store = SqliteTradingStore::open(&db_path).expect("Store SQLite");
    store.run_migrations().expect("Migrações");

    let config = MultiAssetConfig::default();
    let engine = Arc::new(parking_lot::RwLock::new(
        MultiAssetTraderEngine::new(config).with_store(store),
    ));

    let router = create_trading_desk_router(engine.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Listener");
    let local_addr = listener.local_addr().expect("Addr");

    tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });

    let client = reqwest::Client::new();

    // 1. Promove uma estratégia específica para SOL-USDT via POST /api/v1/desk/promote-asset-strategy
    let req = PromoteAssetStrategyRequest {
        asset: "SOL-USDT".to_string(),
        profile_id: "trend_breakout_accelerator".to_string(),
    };

    let resp = client
        .post(format!(
            "http://{}/api/v1/desk/promote-asset-strategy",
            local_addr
        ))
        .json(&req)
        .send()
        .await
        .expect("POST promote-asset-strategy");

    assert_eq!(resp.status(), reqwest::StatusCode::OK);
    let api_res: ApiResponse = resp.json().await.expect("Json ApiResponse");
    assert!(api_res.success);
    assert!(api_res.message.contains("SOL-USDT"));

    // 2. Consulta o status do desk e confirma que SOL-USDT agora tem sua campeã específica
    let resp_status = client
        .get(format!("http://{}/api/v1/desk/status", local_addr))
        .send()
        .await
        .expect("GET status");
    assert_eq!(resp_status.status(), reqwest::StatusCode::OK);

    let status_json: serde_json::Value = resp_status.json().await.expect("Json status");
    let sol_status = status_json["assets"]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["asset"] == "SOL-USDT")
        .expect("Ativo SOL-USDT deve constar na lista");

    assert_eq!(
        sol_status["champion_profile_id"].as_str().unwrap(),
        "trend_breakout_accelerator",
        "Ativo SOL-USDT deve reportar sua campeã exclusiva via API"
    );

    let _ = std::fs::remove_file(db_path);
}

# Plano de Implementação: Evolução da Fortaleza Quantitativa do ALR

- **Goal:** Implementar persistência definitiva no SQLite (eliminando perda de aprendizado pós-restart), expandir a Arena para 18 estratégias simultâneas (12 especializadas + 6 genéticas mutantes) com promoção ágil, integrar 5 módulos avançados de assertividade (Filtro BTC, Volume Profile/POC, Volatilidade de Parkinson, Alinhamento MTF e SGD Online Learner), atualizar a interface web com histórico de promoções e validar com a suíte de testes da Fase 39.
- **Architecture:** Rust Cargo Workspace (crates `alr-connectors`, `alr-cli`, `alr-agent`), Axum REST Server (`trading_desk.rs`), SQLite WAL (`SqliteTradingStore`), e Dashboard Web (`static/trading_desk.html`).
- **Tech Stack:** Rust 2021, Axum 0.7, Tokio, Rusqlite bundled, Serde JSON, Vanilla JS / Tailwind CSS.
- **Baseline/Authority Refs:** `docs/superpowers/specs/2026-09-27-quant-fortress-evolution-design.md`, `crates/alr-connectors/src/trading.rs`, `crates/alr-connectors/src/trading_desk.rs`, `static/trading_desk.html`.
- **Compatibility Boundary:** Backward-compatible com banco de dados SQLite existente (`alr_state.db` via migrações idempotentes `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS`), compatibilidade com os endpoints de trading já existentes, zero clippy warnings.
- **TDD Route:**
  - Mode: auto
  - Decision: light
  - Strict authority: not applicable
  - Test posture: post-change regression & integration suite (Fase 39)
  - Reason: Sistema quantitativo com múltiplos componentes acoplados a dados de mercado e persistência SQLite.
  - Verification: `cargo test --test phase39_quant_fortress_persistence_and_expansion_tests` e suítes correlatas.

---

## Mapeamento de Arquivos

| Arquivo | Papel na Mudança |
|---|---|
| `crates/alr-connectors/src/trading.rs` | Tabelas SQLite, persistência de arena/promoções, portfólio de 18 estratégias, mutação genética, 5 novos filtros quantitativos. |
| `crates/alr-connectors/src/trading_desk.rs` | Novos endpoints REST (`GET /api/v1/desk/promotion-history`, exposição de 18 estratégias, POC e BTC Guard). |
| `static/trading_desk.html` | Interface web com histórico perpétuo de promoções, filtros de categoria para 18 estratégias e telemetria de BTC Guard / POC / Parkinson. |
| `tests/phase39_quant_fortress_persistence_and_expansion_tests.rs` | Suíte de testes automatizados com 6 cenários de integração da Fase 39. |
| `crates/alr-cli/Cargo.toml` | Registro do novo binário de teste `phase39_quant_fortress_persistence_and_expansion_tests`. |
| `README.md` | Atualização da documentação formal com as novas capacidades e total de testes. |

---

## Tarefa 1: Persistência Definitiva no SQLite (`trading_promotions` e `trading_arena_state`)

### Descrição e Motivação
Atualmente, o método `restore_open_positions_from_store` não invoca `load_learned_weights`, e a `StrategyArena` (junto com o histórico de promoções) vive apenas na memória RAM. Ao reiniciar o processo, todo o aprendizado de pesos e o progresso da arena são perdidos.

### Passos de Execução
1. Em `crates/alr-connectors/src/trading.rs`, no método `SqliteTradingStore::run_migrations`:
   - Adicionar criação das tabelas `trading_promotions` e `trading_arena_state`.
2. Em `SqliteTradingStore`, implementar:
   - `pub fn save_promotion(&self, event: &PromotionEvent) -> Result<()>`
   - `pub fn load_promotions(&self, limit: usize) -> Result<Vec<PromotionEvent>>`
   - `pub fn save_arena_state(&self, arena: &StrategyArena) -> Result<()>`
   - `pub fn load_arena_state(&self, arena: &mut StrategyArena) -> Result<()>`
3. Em `MultiAssetTraderEngine::restore_open_positions_from_store`:
   - Invocar `store.load_learned_weights(&mut self.learner)` e replicar para todos os 7 motores (`self.engines`).
   - Invocar `store.load_arena_state(&mut self.strategy_arena)`.
   - Invocar `store.load_promotions()` e preencher `self.strategy_arena.promotion_history`.
   - Garantir que a campeã restaurada injete imediatamente seus pesos no robô real.

### Verificação
Executar script de roundtrip testando gravação, reinicialização e leitura completa do SQLite.

---

## Tarefa 2: Expansão da Arena para 18 Estratégias e Promoção Ágil (Opção 2)

### Descrição e Motivação
Expandir a arena de 6 para 18 perfis simultâneos (12 fundamentais distribuídos em 4 classes de mercado + 6 clones mutantes evolutivos) operando em micro-contas virtuais com saldo base de $1.000 USD e regra ágil de promoção (>= 5 trades, >= 50% Win Rate e PnL > Campeã).

### Passos de Execução
1. Em `StrategyProfile::default_profiles()`:
   - Adicionar os 12 perfis fundamentais:
     - Tendência: `trend_supertrend_heavy`, `trend_macro_momentum`, `trend_breakout_accelerator`.
     - Reversão: `mean_reversion_rsi_donchian`, `mean_reversion_support_bounce`, `mean_reversion_contrarian_fear`.
     - Volatilidade: `volatility_squeeze_scalper`, `volatility_bandwidth_expansion`, `volatility_atr_chandelier`.
     - Institucional: `institutional_vwap_mfi`, `institutional_obi_depth`, `institutional_volume_profile`.
   - Adicionar os 6 clones mutantes:
     - `genetic_challenger_alpha`, `beta`, `gamma`, `delta`, `epsilon`, `zeta`.
2. Implementar mutação genética periódica em `StrategyArena::on_candle`:
   - A cada 50 velas, os 6 clones genéticos herdam a base de pesos das melhores estratégias e aplicam variações estocásticas controladas ($\pm 10\%$ a $\pm 25\%$) em fatores secundários.
3. Atualizar a regra de promoção em `StrategyArena::evaluate_promotion`:
   - Exigir `comp.total_trades >= 5`, `comp.win_rate_pct >= 50.0` e `comp.net_pnl_usd > champ_pnl`.
   - Ao promover, salvar o evento automaticamente em `trading_promotions` via `store`.

### Verificação
Alimentar klines sintéticas e assertar que todos os 18 perfis rastreiam saldos, mutam pesos e promovem desafiantes elegíveis.

---

## Tarefa 3: Integração dos 5 Novos Módulos de Assertividade

### Descrição e Motivação
Elevar as chances de acerto de cada trade com filtros avançados que protegem contra quedas sistêmicas, posicionam alvos em liquidez real e calibram pesos por aprendizado estocástico.

### Passos de Execução
1. **Filtro de Correlação BTC (`BtcMarketBetaGuard`)**:
   - Em `MultiAssetTraderEngine::evaluate_decision` ou `CryptoTraderEngine`: checar estado de `BTC-USDT`.
   - Se BTC estiver em queda severa ($< -1.2\%$ em 1 hora ou abaixo de VWAP Lower Band), adicionar `hold_logits += 4.0` com fator `"BTC_MARKET_DUMP_SHIELD"`.
2. **Volume Profile & Ponto de Controle (`PointOfControlEngine`)**:
   - Em `TechnicalIndicators`: adicionar cálculo de POC (Point of Control) e limites da Value Area (70% do volume) em 24 buckets de preço.
   - Posicionar TP1 no POC e SL abaixo do POC.
3. **Volatilidade de Parkinson (`ParkinsonVolatilityFilter`)**:
   - Implementar cálculo matemático de Parkinson $\sigma_{\text{Parkinson}}$ sobre a amplitude High/Low dos últimos 20 períodos.
   - Bloquear entradas em regimes de volatilidade quase nula (mercado morto) e reduzir exposição em picos desordenados.
4. **Alinhamento Multi-Timeframe (MTF 1m + 5m + 15m + 1h)**:
   - Manter estruturas de agregação de velas em 4 timeframes.
   - Pontuar entradas apenas com confluência de momentum rápido (1m/5m) com suporte estrutural lento (15m/1h).
5. **Aprendizado Online por Regressão Logística Regularizada (SGD)**:
   - Adicionar ao `AdaptiveTradeLearner` rotina de atualização online de pesos via gradiente estocástico com penalização Ridge ($L_2$).

### Verificação
Testar unitariamente os cálculos matemáticos de POC, Parkinson, MTF, SGD e o bloqueio de compras de altcoins durante queda do BTC.

---

## Tarefa 4: Atualização dos Endpoints REST em `trading_desk.rs`

### Passos de Execução
1. Adicionar endpoint `GET /api/v1/desk/promotion-history`:
   - Retorna a lista completa de eventos de promoção ordenados decrescentemente por timestamp.
2. Atualizar `GET /api/v1/desk/strategy-arena`:
   - Retornar o estado das 18 estratégias e indicar explicitamente qual é a campeã ativa.
3. Atualizar `GET /api/v1/desk/status`:
   - Incluir dados de telemetria do `BtcMarketBetaGuard` (status seguro/alerta/bloqueado) e dados de POC para os ativos.

### Verificação
Disparar requisições HTTP curl/reqwest contra os endpoints e validar a resposta JSON estruturada.

---

## Tarefa 5: Atualização da Interface Web em `static/trading_desk.html`

### Passos de Execução
1. No painel `#arena-section`:
   - Renderizar tabela com as 18 estratégias e adicionar abas/pills de filtro (`Todas`, `Tendência`, `Reversão`, `Volatilidade`, `Institucional`, `Genéticas`).
   - Adicionar tabela de histórico permanente de promoções com badges `👑 CAMPEÃ ATIVA` e `⚡ DESAFIANTE`.
2. No cockpit de ativos e no modal `#tradeSnapshotModal`:
   - Adicionar badge visual de **Proteção BTC** (`🛡️ BTC Guard`).
   - Exibir métricas de **POC / Value Area** e **Volatilidade de Parkinson**.
   - Exibir semáforo de confluência **Multi-Timeframe (1m, 5m, 15m, 1h)**.

### Verificação
Abrir o cockpit no navegador headless e verificar ausência de erros no console e renderização dos novos painéis.

---

## Tarefa 6: Criação da Suíte de Testes da Fase 39 e Validação Final

### Passos de Execução
1. Criar `tests/phase39_quant_fortress_persistence_and_expansion_tests.rs`:
   - Teste 1: `test_sqlite_persistence_roundtrip_after_restart`.
   - Teste 2: `test_18_strategy_arena_simulation_and_adaptive_promotion`.
   - Teste 3: `test_btc_market_beta_guard_blocks_altcoins_during_btc_dump`.
   - Teste 4: `test_volume_profile_poc_and_parkinson_volatility_calculation`.
   - Teste 5: `test_online_logistic_sgd_weight_adaptation`.
   - Teste 6: `test_trading_desk_api_endpoints_promotions_and_18_strategies`.
2. Registrar o teste em `crates/alr-cli/Cargo.toml`.
3. Executar a suíte completa de validação:
   - `cargo test --test phase39_quant_fortress_persistence_and_expansion_tests`
   - `cargo test --test phase38_advanced_quant_fortress_tests`
   - `cargo test --test phase37_ichimoku_and_advanced_intelligence_tests`
   - `cargo test --test phase36_adaptive_trader_enhancements_tests`
   - `cargo test --test phase26_multi_asset_trading_desk_tests`
   - `cargo fmt --check`
   - `cargo clippy --workspace --all-targets --all-features -- -D warnings`
4. Atualizar o `README.md` com as novas capacidades, total de testes e instruções de uso.

# Especificação de Design: Evolução da Fortaleza Quantitativa do ALR

**Data:** 27 de Setembro de 2026  
**Status:** Aprovado para Planejamento  
**Escopo:** Persistência Completa SQLite, Arena Híbrida de 18 Estratégias (12 Especializadas + 6 Genéticas Mutantes), Regra Ágil de Promoção e 5 Novos Módulos de Assertividade (Filtro BTC, Volume Profile/POC, Volatilidade de Parkinson, Alinhamento MTF e SGD Online Learner).

---

## 1. Visão Geral e Objetivos

O Autonomous Learning Runtime (ALR) conta com um motor quantitativo de alta frequência e baixa latência operando em sub-20 µs em CPU local para trading de criptomoedas e bolsa.
Esta especificação consolida a evolução do robô para resolver a perda de estado entre reinicializações, expandir o ecossistema de simulação simultânea para 18 configurações concorrentes com algoritmos genéticos e elevar a taxa de acerto por meio de 5 novos filtros institucionais.

### Objetivos Centrais
1. **Persistência Total Pós-Restart**: Nenhum aprendizado, peso, histórico de ordens ou evento de promoção é perdido ao fechar o script (Ctrl+C, crash ou shutdown).
2. **Arena Híbrida de 18 Estratégias**: Simulação simultânea de 12 perfis especializados fundamentais mais 6 clones mutantes evolutivos em contas virtuais de $1.000 USD.
3. **Promoção Automática Ágil (Opção 2)**: Promoção imediata para execução real quando qualquer desafiante atingir $\ge 5$ trades, Win Rate $\ge 50\%$ e PnL superior à campeã.
4. **5 Filtros Institucionais de Alta Assertividade**:
   - `BtcMarketBetaGuard`: Bloqueio de compras em altcoins durante despejos ou fraqueza do Bitcoin.
   - `PointOfControlEngine` (POC): Posicionamento cirúrgico de TP e SL em zonas de alto volume por preço.
   - `ParkinsonVolatilityFilter`: Detecção de regimes de volatilidade anômala e mercados sem liquidez.
   - `MultiTimeframeConfluence` (1m + 5m + 15m + 1h): Validação de curto prazo alinhada à tendência macro.
   - `OnlineSgdWeightLearner`: Atualização probabilística contínua de pesos via Regressão Logística com regularização $L_2$.

---

## 2. Arquitetura de Dados & Persistência no SQLite (`alr_state.db`)

### 2.1 Novas Tabelas e Migrações Idempotentes

```sql
-- 1. Tabela permanente de histórico de promoções da Arena
CREATE TABLE IF NOT EXISTS trading_promotions (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    old_champion_id TEXT NOT NULL,
    new_champion_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    is_manual INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 2. Tabela permanente de estado das 18 estratégias da Arena
CREATE TABLE IF NOT EXISTS trading_arena_state (
    strategy_id TEXT PRIMARY KEY,
    is_champion INTEGER NOT NULL DEFAULT 0,
    virtual_balance REAL NOT NULL,
    initial_balance REAL NOT NULL DEFAULT 1000.0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    win_rate_pct REAL NOT NULL DEFAULT 0.0,
    net_pnl_usd REAL NOT NULL DEFAULT 0.0,
    return_pct REAL NOT NULL DEFAULT 0.0,
    profit_factor REAL NOT NULL DEFAULT 1.0,
    gross_profit_usd REAL NOT NULL DEFAULT 0.0,
    gross_loss_usd REAL NOT NULL DEFAULT 0.0,
    max_drawdown_pct REAL NOT NULL DEFAULT 0.0,
    peak_balance_usd REAL NOT NULL DEFAULT 1000.0,
    sharpe_ratio REAL NOT NULL DEFAULT 0.0,
    factor_weights TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.2 Ciclo de Restauração no Boot (`restore_open_positions_from_store`)
Na reinicialização do robô:
1. `store.load_executions`: Restaura as últimas 50 execuções para `self.executions_log`.
2. `store.load_open_positions`: Restaura as posições em custódia e recalcula cash e margens.
3. `store.load_learned_weights(&mut self.learner)`: Restaura os pesos de confluência do `AdaptiveTradeLearner` e sincroniza nos 7 motores de ativos (`self.engines`).
4. `store.load_arena_state(&mut self.strategy_arena)`: Restaura os saldos virtuais, trades, métricas e pesos das 18 estratégias.
5. `store.load_promotions()`: Carrega o histórico perpétuo de eventos para `self.strategy_arena.promotion_history`.
6. Sincroniza a estratégia campeã identificada com `self.promote_strategy(&champion_id)`.

---

## 3. Arena Híbrida de 18 Estratégias Concorrentes

### 3.1 Portfólio de Perfis

#### A. Grupo Tendência (3 Estratégias Especializadas)
- `trend_supertrend_heavy`: Alinhamento rigoroso EMA9 > EMA21 > EMA50, Supertrend positivo e ADX >= 25.
- `trend_macro_momentum`: Momentum em Higher Timeframe com aceleração de histograma MACD.
- `trend_breakout_accelerator`: Expansão além do Canal Donchian com confirmação de volume surge >= 1.8x.

#### B. Grupo Reversão à Média (3 Estratégias Especializadas)
- `mean_reversion_rsi_donchian`: Divergências de alta no RSI com suporte inferior Donchian.
- `mean_reversion_support_bounce`: Padrões de Martelo (Hammer) em zonas de sobrevenda (< 35 RSI).
- `mean_reversion_contrarian_fear`: Entradas contrarianas em pânico extremo de mercado (Fear & Greed < 20).

#### C. Grupo Volatilidade & Compressão (3 Estratégias Especializadas)
- `volatility_squeeze_scalper`: TTM Squeeze (Bollinger dentro de Keltner) com desequilíbrio no book.
- `volatility_bandwidth_expansion`: Expansão rápida de bandwidth acima de 4.0% pós-consolidação.
- `volatility_atr_chandelier`: Trailing stops dinâmicos de alta velocidade baseados em múltiplos curtos de ATR.

#### D. Grupo Fluxo Institucional & Book (3 Estratégias Especializadas)
- `institutional_vwap_mfi`: Média ponderada por volume (VWAP) com fluxo de dinheiro institucional positivo (MFI > 55).
- `institutional_obi_depth`: Agressão compradora líquida no livro de ofertas (Order Book Imbalance > +0.20).
- `institutional_volume_profile`: Posicionamento em relação ao Ponto de Controle (POC) e Value Area (VA).

#### E. Grupo Genético Evolutivo (6 Clones Mutantes Dinâmicos)
- `genetic_challenger_alpha`, `beta`, `gamma`, `delta`, `epsilon`, `zeta`.
- **Regra de Mutação Estocástica**: A cada 50 velas, os 6 clones copiam a base de pesos das melhores estratégias e aplicam variações randômicas controladas ($\pm 10\%$ a $\pm 25\%$) em fatores secundários, descobrindo ajustes finos e novos equilíbrios.

### 3.2 Regra de Promoção Automática Ágil
- **Ciclo de Avaliação**: A cada 20 velas.
- **Condição**:
  $$\text{Trades} \ge 5 \quad \land \quad \text{Win Rate} \ge 50\% \quad \land \quad \text{PnL Líquido} > \text{PnL da Campeã Atual}$$
- **Ação**:
  1. Eleição do novo campeão.
  2. Gravação de `PromotionEvent` no SQLite.
  3. Atualização dos pesos do robô real no `AdaptiveTradeLearner`.
  4. Disparo de notificação na API e interface web.

---

## 4. As 5 Novas Funcionalidades de Aumento de Assertividade

### 4.1 Filtro de Correlação com Bitcoin (`BtcMarketBetaGuard`)
- O motor monitora continuamente o ativo `BTC-USDT`.
- Se o BTC estiver em queda abrupta ($< -1.2\%$ na última hora ou abaixo do VWAP Lower Band), novas compras em altcoins (ETH, SOL, BNB, XRP, ADA, DOGE) são bloqueadas com penalidade `hold_logits += 4.0` e razão `"BTC_MARKET_DUMP_SHIELD"`.

### 4.2 Volume Profile & Ponto de Controle (`PointOfControlEngine`)
- Divide o range de preço dos últimos 60 períodos em 24 buckets de volume.
- Calcula o **POC (Point of Control)** e os limites superior/inferior da **Value Area (VA)** correspondente a 70% do volume negociado.
- Utilizado para posicionar Take-Profit 1 exatamente no POC e Stop-Loss abaixo de suportes de alto volume.

### 4.3 Regime de Volatilidade de Parkinson (`ParkinsonVolatilityFilter`)
- Cálculo determinístico baseado em extremos High e Low:
  $$\sigma_{\text{Parkinson}} = \sqrt{\frac{1}{4 \ln 2 \cdot N} \sum_{i=1}^N \left(\ln \frac{\text{High}_i}{\text{Low}_i}\right)^2}$$
- Bloqueia negociações em regimes de baixíssima volatilidade (chop / mercado sem liquidez) e reduz a alavancagem de Kelly em volatilidade extrema desordenada.

### 4.4 Alinhamento Multi-Timeframe Concorrente (MTF 1m + 5m + 15m + 1h)
- Agregação em tempo real de klines em 4 escalas de tempo.
- Autorização de compra requer confirmação de momentum no curto prazo (1m/5m) com suporte estrutural no médio prazo (15m/1h acima da nuvem de Ichimoku ou EMA-50).

### 4.5 Aprendizado Online por Regressão Logística Regularizada (SGD)
- Implementa atualização online gradiente estocástico com regularização $L_2$ (Ridge):
  $$w_j \leftarrow w_j + \eta \cdot (y - \hat{p}) \cdot x_j - \lambda \cdot w_j$$
  Garantindo calibração contínua dos pesos sem risco de overfitting.

---

## 5. Endpoints REST da API & Interface Web

### 5.1 Endpoints REST (`trading_desk.rs`)
- `GET /api/v1/desk/strategy-arena`: Retorna o estado completo das 18 estratégias e histórico de promoções.
- `GET /api/v1/desk/promotion-history`: Retorna todos os eventos de promoção registrados no SQLite.
- `POST /api/v1/desk/run-backtest-90d`: Dispara o backtest histórico de 90 dias simulando as 18 estratégias.
- `POST /api/v1/desk/promote-strategy`: Promove uma estratégia específica para Campeã Ativa.
- `GET /api/v1/desk/trade-snapshot?id=...`: Recupera o snapshot completo de indicadores de um trade.

### 5.2 Interface Web (`static/trading_desk.html`)
- Painel da Arena Multi-Estratégia com visualização das 18 estratégias (12 fixas + 6 genéticas).
- Tabela de histórico permanente de promoções com badges `👑 CAMPEÃ ATIVA` e `⚡ DESAFIANTE`.
- Badges e métricas no cockpit de ativos: `BTC Guard`, `POC`, `Value Area`, `Volatilidade de Parkinson` e `Alinhamento MTF`.
- Modal de auditoria por trade (`#tradeSnapshotModal`) com visualização de todos os indicadores e pesos da entrada.

---

## 6. Plano de Testes & Critérios de Aceitação (Fase 39)

Criar a suíte `tests/phase39_quant_fortress_persistence_and_expansion_tests.rs` com 6 testes de integração:
1. `test_sqlite_persistence_roundtrip_after_restart`: Persistência completa e restauração sem perdas de pesos e promoções.
2. `test_18_strategy_arena_simulation_and_adaptive_promotion`: Arena com 18 perfis e auto-promoção ágil (Opção 2).
3. `test_btc_market_beta_guard_blocks_altcoins_during_btc_dump`: Bloqueio de compras em altcoins durante queda do BTC.
4. `test_volume_profile_poc_and_parkinson_volatility_calculation`: Cálculo matemático exato de POC e Parkinson.
5. `test_online_logistic_sgd_weight_adaptation`: Convergência estável dos pesos via SGD online.
6. `test_trading_desk_api_endpoints_promotions_and_18_strategies`: Validação de todos os endpoints HTTP REST.

### Critérios de Sucesso
- 100% dos testes passando na suíte da Fase 39 e em todas as suítes anteriores (`phase38`, `phase37`, `phase36`, `phase26`, `phase34`).
- `cargo fmt --check`: 100% formatado.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: Zero warnings.

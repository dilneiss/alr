//! Adaptador de Ambiente de Trading Financeiro e Cripto (TradingEnvironment)
//!
//! Implementação completa do trait `EnvironmentAdapter` permitindo aprendizado por reforço
//! e decisões System 1/System 2 sobre séries temporais financeiras e livros de ofertas.

use alr_connectors::trading::{
    generate_synthetic_candles, Candle, CryptoTraderEngine, ExchangeSimulationConfig, OrderSide,
    RiskPolicy, TradingAction,
};
use anyhow::Result;
use async_trait::async_trait;

use crate::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};

/// Ambiente de simulação financeira e cripto para agentes autônomos
pub struct TradingEnvironment {
    pub engine: CryptoTraderEngine,
    pub candles: Vec<Candle>,
    pub current_idx: usize,
    pub seed: u64,
    pub initial_capital: f64,
    pub asset: String,
    pub terminal: bool,
    pub total_reward: f32,
    last_portfolio_val: f64,
}

impl TradingEnvironment {
    pub fn new(asset: impl Into<String>, initial_capital: f64, candles: Vec<Candle>) -> Self {
        let asset_str = asset.into();
        let risk_policy = RiskPolicy::default();
        let exchange_config = ExchangeSimulationConfig::binance();
        let engine = CryptoTraderEngine::new(
            asset_str.clone(),
            initial_capital,
            risk_policy,
            exchange_config,
        );

        Self {
            engine,
            candles,
            current_idx: 0,
            seed: 42,
            initial_capital,
            asset: asset_str,
            terminal: false,
            total_reward: 0.0,
            last_portfolio_val: initial_capital,
        }
    }

    pub fn with_synthetic_candles(
        asset: impl Into<String>,
        initial_capital: f64,
        count: usize,
        seed: u64,
    ) -> Self {
        let asset_str = asset.into();
        let base_price = if asset_str.contains("BTC") {
            65000.0
        } else if asset_str.contains("ETH") {
            3500.0
        } else {
            100.0
        };
        let candles = generate_synthetic_candles(seed, count, base_price);
        let mut env = Self::new(asset_str, initial_capital, candles);
        env.seed = seed;
        env
    }

    pub fn engine(&self) -> &CryptoTraderEngine {
        &self.engine
    }

    pub fn engine_mut(&mut self) -> &mut CryptoTraderEngine {
        &mut self.engine
    }

    pub fn current_candle(&self) -> Option<&Candle> {
        self.candles.get(self.current_idx)
    }

    /// Executa um passo direto com `TradingAction`
    pub fn step_trading(&mut self, action: TradingAction) -> Result<f32> {
        if self.terminal || self.current_idx >= self.candles.len() {
            self.terminal = true;
            return Ok(0.0);
        }

        let current_candle = match self.candles.get(self.current_idx) {
            Some(c) => c.clone(),
            None => {
                self.terminal = true;
                return Ok(0.0);
            }
        };

        let price = current_candle.close;

        // 1. Aplica a ação solicitada
        match action {
            TradingAction::Buy if self.engine.current_position.is_none() => {
                let _ = self.engine.execute_order(
                    TradingAction::Buy,
                    OrderSide::Long,
                    price,
                    "ENV_STEP_BUY",
                );
            }
            TradingAction::Sell | TradingAction::ClosePosition
                if self.engine.current_position.is_some() =>
            {
                let _ = self.engine.close_current_position(price, "ENV_STEP_CLOSE");
            }
            _ => {}
        }

        // 2. Avança para a próxima vela e processa stops
        self.current_idx += 1;
        if self.current_idx >= self.candles.len() {
            self.terminal = true;
        } else {
            let next_candle = self.candles[self.current_idx].clone();
            let _ = self.engine.on_candle(next_candle);
        }

        // 3. Verifica limites e kill switch
        if self.engine.risk_policy.kill_switch_active {
            self.terminal = true;
        }

        // 4. Calcula recompensa do passo (PnL delta + penalidade de risco)
        let cur_val = self.engine.portfolio_value(price);
        let pnl_delta = cur_val - self.last_portfolio_val;
        self.last_portfolio_val = cur_val;

        let mut step_reward = (pnl_delta / 100.0) as f32;

        if self.engine.risk_policy.kill_switch_active {
            step_reward -= 50.0;
        }

        self.total_reward += step_reward;
        Ok(step_reward)
    }
}

#[async_trait]
impl EnvironmentAdapter for TradingEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "crypto_trading_desk".to_string(),
            name: "Autonomous Quantitative Crypto and Financial Trading Desk".to_string(),
            capabilities: vec![
                "market_observation".to_string(),
                "order_execution".to_string(),
                "risk_control".to_string(),
                "pnl_optimization".to_string(),
                "stop_loss_inviolable".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "BUY".to_string(),
                "SELL".to_string(),
                "HOLD".to_string(),
                "CLOSE".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![
                EnvironmentConstraint {
                    name: "max_drawdown_limit".to_string(),
                    max_action_rate: 100.0,
                    forbids_reversal: false,
                    safety_perimeter: 5.0,
                },
                EnvironmentConstraint {
                    name: "mandatory_stop_loss".to_string(),
                    max_action_rate: 100.0,
                    forbids_reversal: false,
                    safety_perimeter: 2.0,
                },
            ],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "crypto_trading_desk".to_string(),
            action_space_kind: "Discrete4".to_string(),
            observation_space_kind: "NormalizedFinancialState".to_string(),
            physics_fidelity: 1.0,
            capability_tags: vec![
                "crypto".into(),
                "trading".into(),
                "quant".into(),
                "risk_management".into(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.seed = seed;
        self.current_idx = 0;
        self.terminal = false;
        self.total_reward = 0.0;
        self.last_portfolio_val = self.initial_capital;

        // Se a lista de candles estiver vazia ou reiniciando com nova semente
        if self.candles.is_empty() || seed != 42 {
            let base_price = if self.asset.contains("BTC") {
                65000.0
            } else {
                100.0
            };
            self.candles = generate_synthetic_candles(seed, 100, base_price);
        }

        self.engine = CryptoTraderEngine::new(
            self.asset.clone(),
            self.initial_capital,
            RiskPolicy::default(),
            ExchangeSimulationConfig::binance(),
        );

        // Alimenta as primeiras 21 velas para estabilizar os indicadores
        let warmup_count = self.candles.len().min(21);
        for i in 0..warmup_count {
            self.engine.add_candle(self.candles[i].clone());
        }
        self.current_idx = warmup_count.saturating_sub(1);

        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let indicators = self.engine.compute_indicators().unwrap_or_default();

        // Direção relativa inferida a partir de RSI e Médias Móveis
        let dir = if indicators.rsi_14 < 35.0 {
            RelativeDirection::North // Mercado sobrevendido -> Vetor de alta (Oportunidade)
        } else if indicators.rsi_14 > 65.0 {
            RelativeDirection::South // Mercado sobrecomprado -> Vetor de baixa (Risco)
        } else if indicators.ema_9 > indicators.ema_21 {
            RelativeDirection::NorthEast // Tendência altista moderada
        } else if indicators.ema_9 < indicators.ema_21 {
            RelativeDirection::SouthEast // Tendência baixista moderada
        } else {
            RelativeDirection::Center // Mercado neutro / lateral
        };
        let current_price = self.current_candle().map(|c| c.close).unwrap_or(1.0);
        let dist_from_sma = if indicators.sma_20 > 0.0 {
            ((current_price - indicators.sma_20).abs() / indicators.sma_20) * 100.0
        } else {
            0.0
        };

        let dist_cat = if dist_from_sma > 3.0 {
            DistanceCategory::Immediate // Extrema extensão do preço
        } else if dist_from_sma > 1.5 {
            DistanceCategory::Near
        } else if dist_from_sma > 0.5 {
            DistanceCategory::Medium
        } else {
            DistanceCategory::Far // Próximo ao equilíbrio
        };

        let current_dd = self.engine.drawdown_pct(current_price);
        let approaching_dd_limit = current_dd >= (self.engine.risk_policy.max_drawdown_pct * 0.8);
        let kill_active = self.engine.risk_policy.kill_switch_active;

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: kill_active || approaching_dd_limit,
            obstacle_left: indicators.rsi_14 > 70.0,
            obstacle_right: indicators.rsi_14 < 30.0,
            inventory_has_target: self.engine.current_position.is_some(),
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let trading_action = match &action {
            AbstractAction::Approach | AbstractAction::Collect => TradingAction::Buy,
            AbstractAction::Avoid | AbstractAction::Retreat => TradingAction::Sell,
            AbstractAction::Wait | AbstractAction::Inspect => TradingAction::Hold,
            AbstractAction::Interact(cmd) => {
                let lower = cmd.to_lowercase();
                if lower.contains("buy") {
                    TradingAction::Buy
                } else if lower.contains("sell") || lower.contains("close") {
                    TradingAction::Sell
                } else {
                    TradingAction::Hold
                }
            }
            _ => TradingAction::Hold,
        };

        self.step_trading(trading_action)
    }

    fn is_terminal(&self) -> bool {
        self.terminal
            || self.current_idx >= self.candles.len()
            || self.engine.risk_policy.kill_switch_active
    }
}

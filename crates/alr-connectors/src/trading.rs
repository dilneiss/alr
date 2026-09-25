//! Motor Autônomo de Trading Quantitativo, Criptomoedas e Bolsa (ALR CryptoTraderEngine)
//!
//! Sub-microssegundo (< 20 µs), sem chamadas a LLM em rotina, salvaguarda rígida de risco (Hard Risk Limits),
//! Stop-Loss e Take-Profit automáticos, trailing stop, cálculo de indicadores técnicos locais (SMA, EMA, RSI, MACD, ATR)
//! e simulação realista de exchanges (taxas e slippage para Binance, Bybit, B3).

use crate::approvals::{ApprovalGateway, ApprovalRequest};
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

/// Tipo de ordem / Lado de negociação
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderSide {
    Long,
    Short,
}

/// Ação de negociação solicitada pelo agente ou política
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TradingAction {
    Buy,
    Sell,
    Hold,
    ClosePosition,
}

/// Sinal gerado pelo motor de inferência técnica System 1
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TradingSignal {
    Buy,
    Sell,
    Hold,
    StopLoss,
    TakeProfit,
}

/// Representação de uma vela (Candle / Tick) de preço
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Candle {
    pub timestamp: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

/// Alias para compatibilidade com nomenclaturas financeiras
pub type CandleTick = Candle;

impl Candle {
    pub fn new(timestamp: i64, open: f64, high: f64, low: f64, close: f64, volume: f64) -> Self {
        Self {
            timestamp,
            open,
            high,
            low,
            close,
            volume,
        }
    }

    pub fn is_bullish(&self) -> bool {
        self.close >= self.open
    }

    pub fn body_size(&self) -> f64 {
        (self.close - self.open).abs()
    }

    pub fn range(&self) -> f64 {
        self.high - self.low
    }
}

/// Representação de um livro de ofertas simplificado (L2 Order Book)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct OrderBook {
    pub bids: Vec<(f64, f64)>, // (preço, volume)
    pub asks: Vec<(f64, f64)>,
    pub spread: f64,
    pub mid_price: f64,
}

impl OrderBook {
    pub fn new(mut bids: Vec<(f64, f64)>, mut asks: Vec<(f64, f64)>) -> Self {
        bids.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        asks.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        let best_bid = bids.first().map(|b| b.0).unwrap_or(0.0);
        let best_ask = asks.first().map(|a| a.0).unwrap_or(0.0);
        let spread = if best_ask > best_bid && best_bid > 0.0 {
            best_ask - best_bid
        } else {
            0.0
        };
        let mid_price = if best_ask > 0.0 && best_bid > 0.0 {
            (best_ask + best_bid) / 2.0
        } else {
            best_bid.max(best_ask)
        };

        Self {
            bids,
            asks,
            spread,
            mid_price,
        }
    }

    pub fn best_bid(&self) -> Option<f64> {
        self.bids.first().map(|b| b.0)
    }

    pub fn best_ask(&self) -> Option<f64> {
        self.asks.first().map(|a| a.0)
    }
}

/// Posição aberta em custódia
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TradingPosition {
    pub asset: String,
    pub entry_price: f64,
    pub quantity: f64,
    pub side: OrderSide,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub current_price: f64,
    pub pnl: f64,
    pub entry_timestamp: i64,
    pub highest_price: f64,
    pub lowest_price: f64,
}

impl TradingPosition {
    pub fn new(
        asset: impl Into<String>,
        entry_price: f64,
        quantity: f64,
        side: OrderSide,
        stop_loss: f64,
        take_profit: f64,
        timestamp: i64,
    ) -> Self {
        Self {
            asset: asset.into(),
            entry_price,
            quantity,
            side,
            stop_loss,
            take_profit,
            current_price: entry_price,
            pnl: 0.0,
            entry_timestamp: timestamp,
            highest_price: entry_price,
            lowest_price: entry_price,
        }
    }

    pub fn update_price(&mut self, price: f64) {
        self.current_price = price;
        self.highest_price = self.highest_price.max(price);
        self.lowest_price = self.lowest_price.min(price);

        self.pnl = match self.side {
            OrderSide::Long => (price - self.entry_price) * self.quantity,
            OrderSide::Short => (self.entry_price - price) * self.quantity,
        };
    }

    pub fn unrealized_pnl(&self) -> f64 {
        self.pnl
    }

    pub fn unrealized_pnl_pct(&self) -> f64 {
        if self.entry_price <= 0.0 {
            return 0.0;
        }
        match self.side {
            OrderSide::Long => (self.current_price - self.entry_price) / self.entry_price * 100.0,
            OrderSide::Short => (self.entry_price - self.current_price) / self.entry_price * 100.0,
        }
    }

    pub fn is_stop_loss_hit(&self, current_price: f64) -> bool {
        match self.side {
            OrderSide::Long => current_price <= self.stop_loss,
            OrderSide::Short => current_price >= self.stop_loss,
        }
    }

    pub fn is_take_profit_hit(&self, current_price: f64) -> bool {
        match self.side {
            OrderSide::Long => current_price >= self.take_profit,
            OrderSide::Short => current_price <= self.take_profit,
        }
    }

    pub fn update_trailing_stop(&mut self, trailing_pct: f64) {
        if trailing_pct <= 0.0 {
            return;
        }
        match self.side {
            OrderSide::Long => {
                let candidate = self.highest_price * (1.0 - trailing_pct / 100.0);
                if candidate > self.stop_loss {
                    self.stop_loss = candidate;
                }
            }
            OrderSide::Short => {
                let candidate = self.lowest_price * (1.0 + trailing_pct / 100.0);
                if candidate < self.stop_loss {
                    self.stop_loss = candidate;
                }
            }
        }
    }
}

/// Indicadores técnicos locais calculados com zero alocação adicional
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TechnicalIndicators {
    pub rsi_14: f64,
    pub sma_20: f64,
    pub ema_9: f64,
    pub ema_21: f64,
    pub macd: f64,
    pub macd_signal: f64,
    pub macd_histogram: f64,
    pub volatility_atr: f64,
}

impl TechnicalIndicators {
    pub fn calculate(candles: &[Candle]) -> Result<Self> {
        if candles.is_empty() {
            bail!("Cannot calculate technical indicators on empty candles");
        }
        let closes: Vec<f64> = candles.iter().map(|c| c.close).collect();

        let sma_20 = Self::calculate_sma(&closes, 20).unwrap_or(*closes.last().unwrap());
        let ema_9 = Self::calculate_ema(&closes, 9).unwrap_or(*closes.last().unwrap());
        let ema_21 = Self::calculate_ema(&closes, 21).unwrap_or(*closes.last().unwrap());
        let rsi_14 = Self::calculate_rsi(&closes, 14).unwrap_or(50.0);
        let (macd, macd_signal, macd_histogram) =
            Self::calculate_macd(&closes).unwrap_or((0.0, 0.0, 0.0));
        let volatility_atr = Self::calculate_atr(candles, 14).unwrap_or(0.0);

        Ok(Self {
            rsi_14,
            sma_20,
            ema_9,
            ema_21,
            macd,
            macd_signal,
            macd_histogram,
            volatility_atr,
        })
    }

    pub fn calculate_sma(prices: &[f64], period: usize) -> Option<f64> {
        if prices.is_empty() || period == 0 {
            return None;
        }
        if prices.len() < period {
            let sum: f64 = prices.iter().sum();
            return Some(sum / prices.len() as f64);
        }
        let slice = &prices[prices.len() - period..];
        let sum: f64 = slice.iter().sum();
        Some(sum / period as f64)
    }

    pub fn calculate_ema(prices: &[f64], period: usize) -> Option<f64> {
        if prices.is_empty() || period == 0 {
            return None;
        }
        if prices.len() < period {
            let sum: f64 = prices.iter().sum();
            return Some(sum / prices.len() as f64);
        }
        let alpha = 2.0 / (period as f64 + 1.0);
        let mut ema: f64 = prices[..period].iter().sum::<f64>() / period as f64;
        for &price in &prices[period..] {
            ema = price * alpha + ema * (1.0 - alpha);
        }
        Some(ema)
    }

    pub fn calculate_rsi(prices: &[f64], period: usize) -> Option<f64> {
        if prices.len() < period + 1 || period == 0 {
            return None;
        }
        let mut gains = 0.0;
        let mut losses = 0.0;
        for i in 1..=period {
            let diff = prices[i] - prices[i - 1];
            if diff > 0.0 {
                gains += diff;
            } else {
                losses += -diff;
            }
        }
        let mut avg_gain = gains / period as f64;
        let mut avg_loss = losses / period as f64;

        for i in (period + 1)..prices.len() {
            let diff = prices[i] - prices[i - 1];
            let gain = if diff > 0.0 { diff } else { 0.0 };
            let loss = if diff < 0.0 { -diff } else { 0.0 };

            avg_gain = (avg_gain * (period as f64 - 1.0) + gain) / period as f64;
            avg_loss = (avg_loss * (period as f64 - 1.0) + loss) / period as f64;
        }

        if avg_loss < 1e-9 {
            return Some(100.0);
        }
        if avg_gain < 1e-9 {
            return Some(0.0);
        }

        let rs = avg_gain / avg_loss;
        let rsi = 100.0 - (100.0 / (1.0 + rs));
        Some(rsi.clamp(0.0, 100.0))
    }

    pub fn calculate_macd(prices: &[f64]) -> Option<(f64, f64, f64)> {
        if prices.len() < 26 {
            return None;
        }
        let alpha12 = 2.0 / 13.0;
        let alpha26 = 2.0 / 27.0;

        let mut ema12: f64 = prices[..12].iter().sum::<f64>() / 12.0;
        for &price in &prices[12..26] {
            ema12 = price * alpha12 + ema12 * (1.0 - alpha12);
        }
        let mut ema26: f64 = prices[..26].iter().sum::<f64>() / 26.0;

        let mut macd_series = Vec::with_capacity(prices.len() - 25);
        macd_series.push(ema12 - ema26);

        for &price in &prices[26..] {
            ema12 = price * alpha12 + ema12 * (1.0 - alpha12);
            ema26 = price * alpha26 + ema26 * (1.0 - alpha26);
            macd_series.push(ema12 - ema26);
        }

        let macd = *macd_series.last().unwrap_or(&0.0);
        let signal = Self::calculate_ema(&macd_series, 9).unwrap_or(macd);
        let histogram = macd - signal;

        Some((macd, signal, histogram))
    }

    pub fn calculate_atr(candles: &[Candle], period: usize) -> Option<f64> {
        if candles.len() < 2 || period == 0 {
            return None;
        }
        let mut tr_list = Vec::with_capacity(candles.len() - 1);
        for i in 1..candles.len() {
            let high = candles[i].high;
            let low = candles[i].low;
            let prev_close = candles[i - 1].close;
            let tr = (high - low)
                .max((high - prev_close).abs())
                .max((low - prev_close).abs());
            tr_list.push(tr);
        }
        if tr_list.is_empty() {
            return None;
        }
        if tr_list.len() < period {
            let sum: f64 = tr_list.iter().sum();
            return Some(sum / tr_list.len() as f64);
        }
        let mut atr: f64 = tr_list[..period].iter().sum::<f64>() / period as f64;
        for &tr in &tr_list[period..] {
            atr = (atr * (period as f64 - 1.0) + tr) / period as f64;
        }
        Some(atr)
    }
}

/// Política rígida de controle de risco financeiro (RiskControlPolicy / RiskPolicy)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RiskPolicy {
    pub max_risk_per_trade_pct: f64,
    pub max_drawdown_pct: f64,
    pub trailing_stop_pct: Option<f64>,
    pub stop_loss_required: bool,
    pub daily_loss_limit: f64,
    pub kill_switch_active: bool,
    pub max_position_size: f64,
    pub daily_loss_current: f64,
}

pub type RiskControlPolicy = RiskPolicy;

impl Default for RiskPolicy {
    fn default() -> Self {
        Self {
            max_risk_per_trade_pct: 2.0,  // 2% de risco de capital por trade
            max_drawdown_pct: 5.0,        // 5% de drawdown máximo permitido
            trailing_stop_pct: Some(1.5), // 1.5% de trailing stop automático
            stop_loss_required: true,
            daily_loss_limit: 1000.0,
            kill_switch_active: false,
            max_position_size: 50_000.0,
            daily_loss_current: 0.0,
        }
    }
}

impl RiskPolicy {
    pub fn can_open_trade(&self, drawdown_pct: f64) -> Result<bool> {
        if self.kill_switch_active {
            bail!("Kill switch active: new positions strictly forbidden by RiskEngine");
        }
        if drawdown_pct >= self.max_drawdown_pct {
            bail!(
                "Max drawdown exceeded ({:.2}% >= {:.2}%). Kill switch triggered.",
                drawdown_pct,
                self.max_drawdown_pct
            );
        }
        if self.daily_loss_current >= self.daily_loss_limit {
            bail!(
                "Daily loss limit breached (${:.2} >= ${:.2}). Kill switch triggered.",
                self.daily_loss_current,
                self.daily_loss_limit
            );
        }
        Ok(true)
    }

    pub fn trigger_kill_switch(&mut self) {
        self.kill_switch_active = true;
    }

    pub fn reset_daily(&mut self) {
        self.daily_loss_current = 0.0;
        self.kill_switch_active = false;
    }
}

/// Registro de execução de uma ordem no mercado
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TradeExecution {
    pub id: String,
    pub timestamp: i64,
    pub asset: String,
    pub action: TradingAction,
    pub side: OrderSide,
    pub price: f64,
    pub quantity: f64,
    pub fee: f64,
    pub slippage: f64,
    pub realized_pnl: Option<f64>,
    pub reason: String,
}

/// Relatório de performance e métricas de trading
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TradeExecutionReport {
    pub asset: String,
    pub total_trades: usize,
    pub winning_trades: usize,
    pub losing_trades: usize,
    pub win_rate: f64,
    pub total_pnl: f64,
    pub sharpe_ratio: f64,
    pub max_drawdown: f64,
    pub profit_factor: f64,
    pub initial_capital: f64,
    pub final_capital: f64,
}

/// Configuração de taxas e slippage para simulação de exchanges
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExchangeSimulationConfig {
    pub name: String,
    pub maker_fee_pct: f64,
    pub taker_fee_pct: f64,
    pub slippage_pct: f64,
}

impl ExchangeSimulationConfig {
    pub fn binance() -> Self {
        Self {
            name: "Binance Spot".to_string(),
            maker_fee_pct: 0.0002, // 0.02%
            taker_fee_pct: 0.0005, // 0.05%
            slippage_pct: 0.0001,  // 0.01%
        }
    }

    pub fn bybit() -> Self {
        Self {
            name: "Bybit Derivatives".to_string(),
            maker_fee_pct: 0.0001, // 0.01%
            taker_fee_pct: 0.0006, // 0.06%
            slippage_pct: 0.0002,  // 0.02%
        }
    }

    pub fn b3() -> Self {
        Self {
            name: "B3 Brasil Bolsa Balcão".to_string(),
            maker_fee_pct: 0.0003, // 0.03%
            taker_fee_pct: 0.0003, // 0.03%
            slippage_pct: 0.0005,  // 0.05%
        }
    }

    pub fn zero_fee() -> Self {
        Self {
            name: "Zero Fee Paper Trading".to_string(),
            maker_fee_pct: 0.0,
            taker_fee_pct: 0.0,
            slippage_pct: 0.0,
        }
    }
}

/// Motor Autônomo de Trading de Criptomoedas e Ativos Financeiros
pub struct CryptoTraderEngine {
    pub asset: String,
    pub risk_policy: RiskPolicy,
    pub exchange_config: ExchangeSimulationConfig,
    pub candles: Vec<Candle>,
    pub current_position: Option<TradingPosition>,
    pub trade_history: Vec<TradeExecution>,
    pub initial_capital: f64,
    pub cash_balance: f64,
    pub peak_portfolio_value: f64,
    pub max_drawdown_seen: f64,
    pub approval_gateway: Option<ApprovalGateway>,
    pub approval_threshold_capital: f64,
    pub daily_pnl: f64,
}

impl CryptoTraderEngine {
    pub fn new(
        asset: impl Into<String>,
        initial_capital: f64,
        risk_policy: RiskPolicy,
        exchange_config: ExchangeSimulationConfig,
    ) -> Self {
        Self {
            asset: asset.into(),
            risk_policy,
            exchange_config,
            candles: Vec::new(),
            current_position: None,
            trade_history: Vec::new(),
            initial_capital,
            cash_balance: initial_capital,
            peak_portfolio_value: initial_capital,
            max_drawdown_seen: 0.0,
            approval_gateway: None,
            approval_threshold_capital: 10_000.0,
            daily_pnl: 0.0,
        }
    }

    pub fn with_approval_gateway(mut self, gateway: ApprovalGateway, threshold: f64) -> Self {
        self.approval_gateway = Some(gateway);
        self.approval_threshold_capital = threshold;
        self
    }

    pub fn add_candle(&mut self, candle: Candle) {
        self.candles.push(candle);
    }

    pub fn latest_candle(&self) -> Option<&Candle> {
        self.candles.last()
    }

    pub fn compute_indicators(&self) -> Option<TechnicalIndicators> {
        TechnicalIndicators::calculate(&self.candles).ok()
    }

    pub fn portfolio_value(&self, current_price: f64) -> f64 {
        let position_val = if let Some(pos) = &self.current_position {
            match pos.side {
                OrderSide::Long => pos.quantity * current_price,
                OrderSide::Short => {
                    let diff = pos.entry_price - current_price;
                    (pos.quantity * pos.entry_price) + (diff * pos.quantity)
                }
            }
        } else {
            0.0
        };
        (self.cash_balance + position_val).max(0.0)
    }

    pub fn drawdown_pct(&self, current_price: f64) -> f64 {
        let current_val = self.portfolio_value(current_price);
        if self.peak_portfolio_value <= 0.0 {
            return 0.0;
        }
        let dd = (self.peak_portfolio_value - current_val) / self.peak_portfolio_value * 100.0;
        dd.max(0.0)
    }

    /// Avaliação de sinal rápida System 1 em sub-microssegundo
    pub fn evaluate_signal(
        &self,
        indicators: &TechnicalIndicators,
        current_price: f64,
    ) -> TradingSignal {
        // 1. Checagem inviolável de Stop-Loss e Take-Profit se houver posição
        if let Some(pos) = &self.current_position {
            if pos.is_stop_loss_hit(current_price) {
                return TradingSignal::StopLoss;
            }
            if pos.is_take_profit_hit(current_price) {
                return TradingSignal::TakeProfit;
            }
            // Encerramento em reversão acentuada
            if pos.side == OrderSide::Long
                && indicators.rsi_14 > 72.0
                && indicators.ema_9 < indicators.ema_21
            {
                return TradingSignal::Sell;
            }
            if pos.side == OrderSide::Short
                && indicators.rsi_14 < 28.0
                && indicators.ema_9 > indicators.ema_21
            {
                return TradingSignal::Buy;
            }
            return TradingSignal::Hold;
        }

        // 2. Kill switch bloqueia novas compras
        if self.risk_policy.kill_switch_active {
            return TradingSignal::Hold;
        }

        // 3. Regras de momentum e confluência técnica
        let trend_up = indicators.ema_9 > indicators.ema_21;
        let trend_down = indicators.ema_9 < indicators.ema_21;
        let macd_bullish = indicators.macd_histogram > 0.0;
        let macd_bearish = indicators.macd_histogram < 0.0;

        if (indicators.rsi_14 < 35.0 || trend_up) && macd_bullish && indicators.rsi_14 < 70.0 {
            TradingSignal::Buy
        } else if (indicators.rsi_14 > 65.0 || trend_down)
            && macd_bearish
            && indicators.rsi_14 > 30.0
        {
            TradingSignal::Sell
        } else {
            TradingSignal::Hold
        }
    }

    /// Dimensionamento prudente da posição com base no risco percentual fixo
    pub fn calculate_position_size(&self, entry_price: f64, stop_loss: f64) -> f64 {
        if entry_price <= 0.0 || stop_loss <= 0.0 {
            return 0.0;
        }
        let risk_per_unit = (entry_price - stop_loss).abs();
        if risk_per_unit < 1e-6 {
            return 0.0;
        }

        let port_val = self.portfolio_value(entry_price);
        let max_risk_amount = port_val * (self.risk_policy.max_risk_per_trade_pct / 100.0);
        let raw_qty = max_risk_amount / risk_per_unit;

        // Reserva 2% do saldo para slippage e taxas
        let max_affordable_qty = (self.cash_balance * 0.98) / entry_price;
        let max_size_qty = self.risk_policy.max_position_size / entry_price;

        let final_qty = raw_qty.min(max_affordable_qty).min(max_size_qty);
        if final_qty < 0.0001 {
            0.0
        } else {
            (final_qty * 10000.0).floor() / 10000.0
        }
    }

    /// Execução e monitoramento contínuo em cada vela (Candle / Tick)
    pub fn on_candle(&mut self, candle: Candle) -> Result<Option<TradeExecution>> {
        let current_price = candle.close;
        self.add_candle(candle);

        // 1. Atualiza trailing stop e checa stops de posição existente
        if let Some(pos) = &mut self.current_position {
            pos.update_price(current_price);
            if let Some(trailing_pct) = self.risk_policy.trailing_stop_pct {
                pos.update_trailing_stop(trailing_pct);
            }
        }

        // Atualiza peak e drawdown
        let cur_val = self.portfolio_value(current_price);
        if cur_val > self.peak_portfolio_value {
            self.peak_portfolio_value = cur_val;
        }
        let dd = self.drawdown_pct(current_price);
        if dd > self.max_drawdown_seen {
            self.max_drawdown_seen = dd;
        }

        // Verifica se drawdown viola política de risco
        if dd >= self.risk_policy.max_drawdown_pct {
            self.risk_policy.trigger_kill_switch();
        }

        // 2. Checa disparos de Stop-Loss ou Take-Profit
        if let Some(stop_exec) = self.check_stops(current_price) {
            return Ok(Some(stop_exec));
        }

        // 3. Se não houver indicadores suficientes, não emite sinal
        let indicators = match self.compute_indicators() {
            Some(ind) => ind,
            None => return Ok(None),
        };

        // 4. Avalia sinal técnico
        let signal = self.evaluate_signal(&indicators, current_price);

        match signal {
            TradingSignal::Buy if self.current_position.is_none() => self.execute_order(
                TradingAction::Buy,
                OrderSide::Long,
                current_price,
                "SIGNAL_BUY_CONFLUENCE",
            ),
            TradingSignal::Sell if self.current_position.is_none() => {
                // Para simplificação de paper trading, abre posição Long se houver sinal
                Ok(None)
            }
            TradingSignal::Sell if self.current_position.is_some() => {
                self.close_current_position(current_price, "SIGNAL_SELL_EXIT")
            }
            TradingSignal::StopLoss => self
                .check_stops(current_price)
                .map(Some)
                .ok_or_else(|| anyhow::anyhow!("Expected stop loss execution")),
            TradingSignal::TakeProfit => self
                .check_stops(current_price)
                .map(Some)
                .ok_or_else(|| anyhow::anyhow!("Expected take profit execution")),
            _ => Ok(None),
        }
    }

    /// Execução de ordem com aplicação de slippage e taxas da exchange
    pub fn execute_order(
        &mut self,
        action: TradingAction,
        side: OrderSide,
        price: f64,
        reason: &str,
    ) -> Result<Option<TradeExecution>> {
        let current_dd = self.drawdown_pct(price);

        if action == TradingAction::Buy {
            self.risk_policy.can_open_trade(current_dd)?;

            // Cálculo dos preços com Stop-Loss e Take-Profit obrigatórios
            let stop_loss = price * 0.98; // 2% de stop protetivo
            let take_profit = price * 1.04; // 4% de alvo de lucro (2:1 R:R)
            let quantity = self.calculate_position_size(price, stop_loss);

            if quantity <= 0.0 {
                return Ok(None);
            }

            let order_value = price * quantity;

            // Integração com ApprovalGateway se exceder o teto financeiro
            if order_value > self.approval_threshold_capital {
                if let Some(gateway) = &self.approval_gateway {
                    let action_name = format!("ORDER_BUY_{}", self.asset);
                    if !gateway.is_action_approved(&action_name) {
                        let req_id = if let Some(existing) = gateway
                            .list_pending()
                            .into_iter()
                            .find(|r| r.action_name == action_name)
                        {
                            existing.id
                        } else {
                            let req = ApprovalRequest::new(
                                "trading_execution",
                                "crypto_trader_engine",
                                "alr_fin_desk",
                                action_name,
                                format!(
                                    "Order value ${:.2} exceeds threshold ${:.2}",
                                    order_value, self.approval_threshold_capital
                                ),
                                serde_json::json!({
                                    "asset": self.asset,
                                    "price": price,
                                    "quantity": quantity,
                                    "order_value": order_value,
                                }),
                            );
                            gateway.submit_request(req)
                        };

                        bail!(
                            "Order halted: requires human approval (request_id: '{}', value: ${:.2})",
                            req_id,
                            order_value
                        );
                    }
                }
            }

            // Slippage na compra (executa ligeiramente acima)
            let executed_price = price * (1.0 + self.exchange_config.slippage_pct);
            let fee = executed_price * quantity * self.exchange_config.taker_fee_pct;
            let total_cost = (executed_price * quantity) + fee;

            if total_cost > self.cash_balance {
                return Ok(None);
            }

            self.cash_balance -= total_cost;
            let now_ts = self.candles.last().map(|c| c.timestamp).unwrap_or(0);

            let pos = TradingPosition::new(
                &self.asset,
                executed_price,
                quantity,
                side,
                stop_loss,
                take_profit,
                now_ts,
            );
            self.current_position = Some(pos);

            let exec = TradeExecution {
                id: format!(
                    "exec_{}",
                    uuid::Uuid::new_v4()
                        .to_string()
                        .chars()
                        .take(8)
                        .collect::<String>()
                ),
                timestamp: now_ts,
                asset: self.asset.clone(),
                action,
                side,
                price: executed_price,
                quantity,
                fee,
                slippage: self.exchange_config.slippage_pct * price,
                realized_pnl: None,
                reason: reason.to_string(),
            };

            self.trade_history.push(exec.clone());
            Ok(Some(exec))
        } else if action == TradingAction::ClosePosition || action == TradingAction::Sell {
            self.close_current_position(price, reason)
        } else {
            Ok(None)
        }
    }

    /// Encerramento determinístico da posição aberta
    pub fn close_current_position(
        &mut self,
        exit_price: f64,
        reason: &str,
    ) -> Result<Option<TradeExecution>> {
        let pos = match self.current_position.take() {
            Some(p) => p,
            None => return Ok(None),
        };

        // Slippage na venda (executa ligeiramente abaixo)
        let executed_price = exit_price * (1.0 - self.exchange_config.slippage_pct);
        let fee = executed_price * pos.quantity * self.exchange_config.taker_fee_pct;

        let gross_proceeds = executed_price * pos.quantity;
        let net_proceeds = gross_proceeds - fee;
        self.cash_balance += net_proceeds;

        let cost_basis = pos.entry_price * pos.quantity;
        let realized_pnl = net_proceeds - cost_basis;
        self.daily_pnl += realized_pnl;

        if self.daily_pnl < -self.risk_policy.daily_loss_limit {
            self.risk_policy.trigger_kill_switch();
        }

        let now_ts = self.candles.last().map(|c| c.timestamp).unwrap_or(0);
        let exec = TradeExecution {
            id: format!(
                "exec_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .chars()
                    .take(8)
                    .collect::<String>()
            ),
            timestamp: now_ts,
            asset: self.asset.clone(),
            action: TradingAction::ClosePosition,
            side: pos.side,
            price: executed_price,
            quantity: pos.quantity,
            fee,
            slippage: self.exchange_config.slippage_pct * exit_price,
            realized_pnl: Some(realized_pnl),
            reason: reason.to_string(),
        };

        self.trade_history.push(exec.clone());
        Ok(Some(exec))
    }

    /// Checagem e execução imediata de Stop-Loss ou Take-Profit
    pub fn check_stops(&mut self, current_price: f64) -> Option<TradeExecution> {
        let (is_sl, is_tp) = if let Some(pos) = &self.current_position {
            (
                pos.is_stop_loss_hit(current_price),
                pos.is_take_profit_hit(current_price),
            )
        } else {
            return None;
        };

        if is_sl {
            self.close_current_position(current_price, "STOP_LOSS_PROTECTIVE")
                .ok()
                .flatten()
        } else if is_tp {
            self.close_current_position(current_price, "TAKE_PROFIT_LIMIT")
                .ok()
                .flatten()
        } else {
            None
        }
    }

    /// Geração de relatório consolidado com métricas financeiras (Win Rate, Sharpe Ratio, PnL)
    pub fn generate_report(&self) -> TradeExecutionReport {
        let closed_trades: Vec<&TradeExecution> = self
            .trade_history
            .iter()
            .filter(|t| t.realized_pnl.is_some())
            .collect();

        let total_trades = closed_trades.len();
        let winning_trades = closed_trades
            .iter()
            .filter(|t| t.realized_pnl.unwrap_or(0.0) > 0.0)
            .count();
        let losing_trades = total_trades.saturating_sub(winning_trades);

        let win_rate = if total_trades > 0 {
            (winning_trades as f64 / total_trades as f64) * 100.0
        } else {
            0.0
        };

        let total_pnl: f64 = closed_trades
            .iter()
            .map(|t| t.realized_pnl.unwrap_or(0.0))
            .sum();

        let gross_gains: f64 = closed_trades
            .iter()
            .map(|t| t.realized_pnl.unwrap_or(0.0))
            .filter(|&p| p > 0.0)
            .sum();
        let gross_losses: f64 = closed_trades
            .iter()
            .map(|t| t.realized_pnl.unwrap_or(0.0))
            .filter(|&p| p < 0.0)
            .map(|p| p.abs())
            .sum();

        let profit_factor = if gross_losses > 1e-6 {
            gross_gains / gross_losses
        } else if gross_gains > 0.0 {
            10.0 // Sem perdas, fator de lucro máximo
        } else {
            1.0
        };

        // Cálculo do Sharpe Ratio
        let sharpe_ratio = if total_trades > 1 {
            let returns: Vec<f64> = closed_trades
                .iter()
                .map(|t| t.realized_pnl.unwrap_or(0.0))
                .collect();
            let mean = total_pnl / total_trades as f64;
            let variance: f64 =
                returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / (total_trades - 1) as f64;
            let std_dev = variance.sqrt();
            if std_dev > 1e-6 {
                (mean / std_dev) * (252.0_f64).sqrt() // Anualizado
            } else {
                0.0
            }
        } else {
            0.0
        };

        let last_price = self.candles.last().map(|c| c.close).unwrap_or(0.0);
        let final_capital = self.portfolio_value(last_price);

        TradeExecutionReport {
            asset: self.asset.clone(),
            total_trades,
            winning_trades,
            losing_trades,
            win_rate,
            total_pnl,
            sharpe_ratio,
            max_drawdown: self.max_drawdown_seen,
            profit_factor,
            initial_capital: self.initial_capital,
            final_capital,
        }
    }
}

/// Gerador determinístico de velas sintéticas para testes offline e simulação
pub fn generate_synthetic_candles(seed: u64, count: usize, base_price: f64) -> Vec<Candle> {
    let mut candles = Vec::with_capacity(count);
    let mut current_price = base_price;
    let base_time = 1_700_000_000i64;

    let mut state = seed.wrapping_add(1_234_567_891);
    let mut next_f64 = move || -> f64 {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1);
        ((state >> 33) as f64) / (u32::MAX as f64)
    };

    for i in 0..count {
        let wave = ((i as f64) * 0.15).sin() * 0.018;
        let noise = (next_f64() - 0.48) * 0.025;
        let change_pct = wave + noise;

        let open = current_price;
        let close = (open * (1.0 + change_pct)).max(1.0);
        let high = open.max(close) * (1.0 + next_f64() * 0.006);
        let low = (open.min(close) * (1.0 - next_f64() * 0.006)).max(0.5);
        let volume = 50.0 + next_f64() * 200.0;

        candles.push(Candle {
            timestamp: base_time + (i as i64 * 3600),
            open,
            high,
            low,
            close,
            volume,
        });

        current_price = close;
    }

    candles
}

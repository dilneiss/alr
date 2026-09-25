pub mod approvals;
pub mod connector;
pub mod email;
pub mod provider;
pub mod resilience;
pub mod rest;
pub mod secrets;
pub mod tasks;
pub mod trading;
pub mod trading_desk;
pub mod trading_logger;
pub mod webhooks;

pub use approvals::{ApprovalGateway, ApprovalRequest, ApprovalStatus};
pub use connector::{
    AllowedHostPolicy, ConnectorAction, ConnectorCapability, ConnectorContext, ConnectorId,
    ConnectorResult, ConnectorRiskLevel, ExternalConnector,
};
pub use email::{
    EmailAttachment, EmailCategory, EmailSentiment, EmailTriageProcessor, EmailTriageVerdict,
    EmailUrgency, ExtractedEntities, InboundEmail, TrustBoundaryEnforcer,
};
pub use provider::{ExternalServiceProvider, HelpdeskSaaSConnector};
pub use resilience::{CircuitBreaker, CircuitState};
pub use rest::RestConnector;
pub use secrets::{
    DataEgressPolicy, DataSensitivity, EnvironmentSecretStore, SecretRedactor, SecretRef,
    SecretStore, SecretValue,
};
pub use tasks::{AgentCheckpoint, AgentTask, TaskPriority, TaskQueue, TaskStatus};
pub use trading::{
    asset_baseline_price, generate_paper_market_snapshot, generate_synthetic_candles,
    parse_binance_kline_response, parse_bybit_kline_response, AssetDeskStatus,
    BinanceOrderResponse, BinanceTestnetConnector, BybitOrderRequest, BybitOrderResponse,
    BybitTestnetConnector, BybitTicker, Candle, CandleTick, CryptoTraderEngine, DeskStatusSnapshot,
    ExchangeSimulationConfig, JevTradingDecision, LlmMarketRegimeAdvisor, MacroRegimeReport,
    MarketRegime, MarketSnapshot, MultiAssetConfig, MultiAssetTraderEngine, OrderBook, OrderSide,
    RiskControlPolicy, RiskPolicy, RiskRationale, SqliteTradingStore, TechnicalIndicators,
    TradeExecution, TradeExecutionReport, TradeSizingComparisonReport, TradingAction,
    TradingPosition, TradingSignal, DEFAULT_MULTI_ASSET_BASKET,
};
pub use trading_desk::*;
pub use trading_logger::*;
pub use webhooks::{EventStore, InboundWebhookEvent, WebhookValidator};

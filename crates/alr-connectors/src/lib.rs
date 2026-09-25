pub mod approvals;
pub mod connector;
pub mod email;
pub mod provider;
pub mod resilience;
pub mod rest;
pub mod secrets;
pub mod tasks;
pub mod trading;
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
    generate_paper_market_snapshot, generate_synthetic_candles, parse_binance_kline_response,
    parse_bybit_kline_response, BinanceOrderResponse, BinanceTestnetConnector, BybitOrderRequest,
    BybitOrderResponse, BybitTestnetConnector, BybitTicker, Candle, CandleTick, CryptoTraderEngine,
    ExchangeSimulationConfig, MarketSnapshot, OrderBook, OrderSide, RiskControlPolicy, RiskPolicy,
    TechnicalIndicators, TradeExecution, TradeExecutionReport, TradingAction, TradingPosition,
    TradingSignal,
};
pub use webhooks::{EventStore, InboundWebhookEvent, WebhookValidator};

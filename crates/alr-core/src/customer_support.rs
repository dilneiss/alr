use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CustomerStatus {
    Active,
    Suspended,
    PendingVerification,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub email: String,
    pub plan: String,
    pub status: CustomerStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OrderStatus {
    Completed,
    Processing,
    Cancelled,
    Refunded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub tenant_id: String,
    pub customer_id: String,
    pub status: OrderStatus,
    pub amount: f64,
    pub currency: String,
    pub items: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PaymentStatus {
    Pending,
    Approved,
    Failed,
    Refunded,
    RefundPending,
    ChargedTwice,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub customer_id: String,
    pub status: PaymentStatus,
    pub amount: f64,
    pub currency: String,
    pub gateway: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TicketStatus {
    Open,
    InProgress,
    Resolved,
    Escalated,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Priority {
    Low,
    Medium,
    High,
    Urgent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ticket {
    pub id: String,
    pub tenant_id: String,
    pub customer_id: String,
    pub subject: String,
    pub message: String,
    pub status: TicketStatus,
    pub priority: Priority,
    pub replies: Vec<String>,
    pub internal_notes: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Ticket {
    pub fn new(
        id: impl Into<String>,
        tenant_id: impl Into<String>,
        customer_id: impl Into<String>,
        subject: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: id.into(),
            tenant_id: tenant_id.into(),
            customer_id: customer_id.into(),
            subject: subject.into(),
            message: message.into(),
            status: TicketStatus::Open,
            priority: Priority::Medium,
            replies: Vec::new(),
            internal_notes: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

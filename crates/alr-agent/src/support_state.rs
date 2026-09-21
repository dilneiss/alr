use alr_core::{State, Ticket};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SupportIntent {
    RefundPending,
    DuplicateCharge,
    PaymentFailed,
    OrderCancelled,
    OrderNotReceived,
    InvoiceQuestion,
    SubscriptionQuestion,
    TechnicalIssue,
    PasswordReset,
    Unknown,
}

impl SupportIntent {
    pub fn as_str(&self) -> &str {
        match self {
            Self::RefundPending => "refund_pending",
            Self::DuplicateCharge => "duplicate_charge",
            Self::PaymentFailed => "payment_failed",
            Self::OrderCancelled => "order_cancelled",
            Self::OrderNotReceived => "order_not_received",
            Self::InvoiceQuestion => "invoice_question",
            Self::SubscriptionQuestion => "subscription_question",
            Self::TechnicalIssue => "technical_issue",
            Self::PasswordReset => "password_reset",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_str_loose(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "refund_pending" | "refund" => Self::RefundPending,
            "duplicate_charge" | "double_charge" => Self::DuplicateCharge,
            "payment_failed" | "failed_payment" => Self::PaymentFailed,
            "order_cancelled" | "cancelled_order" => Self::OrderCancelled,
            "order_not_received" | "delivery_delay" => Self::OrderNotReceived,
            "invoice_question" | "invoice" => Self::InvoiceQuestion,
            "subscription_question" | "subscription" => Self::SubscriptionQuestion,
            "technical_issue" | "bug" | "crash" => Self::TechnicalIssue,
            "password_reset" | "reset_password" => Self::PasswordReset,
            _ => Self::Unknown,
        }
    }
}

pub struct StateExtractor;

impl StateExtractor {
    pub fn extract_intent(subject: &str, message: &str) -> SupportIntent {
        let text = format!("{} {}", subject, message).to_lowercase();

        // 1. Defesa contra Prompt Injection: sanitiza comandos imperativos
        if text.contains("ignore all previous instructions")
            || text.contains("system prompt override")
            || text.contains("ignore previous rules")
        {
            return SupportIntent::TechnicalIssue;
        }

        // 2. Classificação semântica / léxica por palavras-chave
        if text.contains("reembolso")
            || text.contains("refund")
            || text.contains("estorno")
            || text.contains("dinheiro de volta")
        {
            SupportIntent::RefundPending
        } else if text.contains("duplicad")
            || text.contains("cobrado duas vezes")
            || text.contains("duas cobranças")
            || text.contains("duplicate")
            || text.contains("two charges")
        {
            SupportIntent::DuplicateCharge
        } else if text.contains("falha no pagamento")
            || text.contains("cartão recusado")
            || text.contains("payment failed")
            || text.contains("declined")
        {
            SupportIntent::PaymentFailed
        } else if text.contains("cancelado")
            || text.contains("cancelar pedido")
            || text.contains("order cancelled")
        {
            SupportIntent::OrderCancelled
        } else if text.contains("não recebi")
            || text.contains("atrasado")
            || text.contains("not received")
            || text.contains("rastreio")
        {
            SupportIntent::OrderNotReceived
        } else if text.contains("nota fiscal")
            || text.contains("fatura")
            || text.contains("invoice")
        {
            SupportIntent::InvoiceQuestion
        } else if text.contains("plano")
            || text.contains("assinatura")
            || text.contains("subscription")
        {
            SupportIntent::SubscriptionQuestion
        } else if text.contains("senha")
            || text.contains("password")
            || text.contains("login")
            || text.contains("acesso")
        {
            SupportIntent::PasswordReset
        } else if text.contains("erro")
            || text.contains("bug")
            || text.contains("travou")
            || text.contains("technical")
        {
            SupportIntent::TechnicalIssue
        } else {
            SupportIntent::Unknown
        }
    }

    pub fn build_support_state(ticket: &Ticket) -> State {
        let intent = Self::extract_intent(&ticket.subject, &ticket.message);

        // Vector representation of intent (one-hot encoded across 10 classes)
        let mut features = vec![0.0f32; 10];
        let idx = match intent {
            SupportIntent::RefundPending => 0,
            SupportIntent::DuplicateCharge => 1,
            SupportIntent::PaymentFailed => 2,
            SupportIntent::OrderCancelled => 3,
            SupportIntent::OrderNotReceived => 4,
            SupportIntent::InvoiceQuestion => 5,
            SupportIntent::SubscriptionQuestion => 6,
            SupportIntent::TechnicalIssue => 7,
            SupportIntent::PasswordReset => 8,
            SupportIntent::Unknown => 9,
        };
        features[idx] = 1.0;

        let metadata = serde_json::json!({
            "ticket_id": ticket.id,
            "tenant_id": ticket.tenant_id,
            "customer_id": ticket.customer_id,
            "intent": intent.as_str(),
            "subject": ticket.subject,
            "priority": format!("{:?}", ticket.priority),
        });

        State::new(features, metadata)
    }
}

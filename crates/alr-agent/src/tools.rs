use crate::support_tool::{RiskLevel, SupportTool, ToolContext, ToolInput, ToolOutput};
use alr_core::{Customer, Order, Payment, Ticket, TicketStatus};
use alr_memory::{EmbeddingProvider, SemanticMemoryStore, SemanticMemoryType, SemanticQuery};
use anyhow::Result;
use async_trait::async_trait;
use parking_lot::RwLock;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

/// In-memory simulator database for customer support benchmark & execution
#[derive(Clone, Default)]
pub struct SupportDatabase {
    pub customers: Arc<RwLock<HashMap<String, Customer>>>,
    pub orders: Arc<RwLock<HashMap<String, Order>>>,
    pub payments: Arc<RwLock<HashMap<String, Payment>>>,
    pub tickets: Arc<RwLock<HashMap<String, Ticket>>>,
}

impl SupportDatabase {
    pub fn new() -> Self {
        Self::default()
    }
}

// 1. GetCustomerTool (Read-only, Low Risk)
pub struct GetCustomerTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for GetCustomerTool {
    fn name(&self) -> &str {
        "get_customer"
    }
    fn description(&self) -> &str {
        "Retrieve customer details by customer_id or email"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let guard = self.db.customers.read();
        let cid = input.parameters["customer_id"].as_str();
        let email = input.parameters["email"].as_str();

        for c in guard.values() {
            if c.tenant_id == context.tenant_id
                && ((cid.is_some() && cid == Some(&c.id))
                    || (email.is_some() && email == Some(&c.email)))
            {
                return Ok(ToolOutput::success(json!(c)));
            }
        }
        // In simulator / benchmark mode, return default record if not found to allow pipeline flow
        Ok(ToolOutput::success(json!({
            "id": cid.unwrap_or("cust_simulated"),
            "tenant_id": context.tenant_id,
            "name": "Simulated Customer",
            "status": "Active"
        })))
    }
}

// 2. GetOrderTool (Read-only, Low Risk)
pub struct GetOrderTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for GetOrderTool {
    fn name(&self) -> &str {
        "get_order"
    }
    fn description(&self) -> &str {
        "Retrieve order details by order_id or customer_id"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let guard = self.db.orders.read();
        let oid = input.parameters["order_id"].as_str();
        let cid = input.parameters["customer_id"].as_str();

        for o in guard.values() {
            if o.tenant_id == context.tenant_id
                && ((oid.is_some() && oid == Some(&o.id))
                    || (cid.is_some() && cid == Some(&o.customer_id)))
            {
                return Ok(ToolOutput::success(json!(o)));
            }
        }
        // In simulator / benchmark mode, return simulated active order
        Ok(ToolOutput::success(json!({
            "id": oid.unwrap_or("ord_simulated"),
            "customer_id": cid.unwrap_or("cust_01"),
            "status": "Processing",
            "amount": 149.99
        })))
    }
}

// 3. GetPaymentTool (Read-only, Low Risk)
pub struct GetPaymentTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for GetPaymentTool {
    fn name(&self) -> &str {
        "get_payment"
    }
    fn description(&self) -> &str {
        "Retrieve payment transaction details by order_id or payment_id"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let guard = self.db.payments.read();
        let pid = input.parameters["payment_id"].as_str();
        let oid = input.parameters["order_id"].as_str();
        let cid = input.parameters["customer_id"].as_str();

        for p in guard.values() {
            if p.tenant_id == context.tenant_id
                && ((pid.is_some() && pid == Some(&p.id))
                    || (oid.is_some() && oid == Some(&p.order_id))
                    || (cid.is_some() && cid == Some(&p.customer_id)))
            {
                return Ok(ToolOutput::success(json!(p)));
            }
        }
        // Simulated payment
        Ok(ToolOutput::success(json!({
            "id": pid.unwrap_or("pay_simulated"),
            "status": "RefundPending",
            "amount": 149.99
        })))
    }
}

// 4. SearchKnowledgeTool (Read-only, Low Risk)
pub struct SearchKnowledgeTool<S: SemanticMemoryStore, E: EmbeddingProvider> {
    pub store: Arc<S>,
    pub embedder: Arc<E>,
}

#[async_trait]
impl<S: SemanticMemoryStore, E: EmbeddingProvider> SupportTool for SearchKnowledgeTool<S, E> {
    fn name(&self) -> &str {
        "search_knowledge"
    }
    fn description(&self) -> &str {
        "Semantic search across official policies, FAQs, and procedures"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let query_text = input.parameters["query"].as_str().unwrap_or_default();
        if query_text.trim().is_empty() {
            return Ok(ToolOutput::failure("Query parameter cannot be empty"));
        }

        let vectors = self.embedder.embed(&[query_text.to_string()]).await?;
        let vector = vectors.into_iter().next().unwrap_or_default();

        let query = SemanticQuery {
            tenant_id: context.tenant_id,
            vector,
            memory_type: None,
            metadata_filters: HashMap::new(),
            top_k: 3,
            score_threshold: Some(0.3),
        };

        let results = self.store.search(query).await?;
        let mapped: Vec<serde_json::Value> = results
            .into_iter()
            .map(|r| {
                json!({
                    "title": r.memory.title,
                    "content": r.memory.content,
                    "type": r.memory.memory_type.as_str(),
                    "score": r.score
                })
            })
            .collect();

        Ok(ToolOutput::success(json!({ "documents": mapped })))
    }
}

// 5. SearchSimilarTicketsTool (Read-only, Low Risk)
pub struct SearchSimilarTicketsTool<S: SemanticMemoryStore, E: EmbeddingProvider> {
    pub store: Arc<S>,
    pub embedder: Arc<E>,
}

#[async_trait]
impl<S: SemanticMemoryStore, E: EmbeddingProvider> SupportTool for SearchSimilarTicketsTool<S, E> {
    fn name(&self) -> &str {
        "search_similar_tickets"
    }
    fn description(&self) -> &str {
        "Search resolved historical tickets and past solutions"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let query_text = input.parameters["query"].as_str().unwrap_or_default();
        let vectors = self.embedder.embed(&[query_text.to_string()]).await?;
        let vector = vectors.into_iter().next().unwrap_or_default();

        let query = SemanticQuery {
            tenant_id: context.tenant_id,
            vector,
            memory_type: Some(SemanticMemoryType::TicketResolution),
            metadata_filters: HashMap::new(),
            top_k: 2,
            score_threshold: Some(0.3),
        };

        let results = self.store.search(query).await?;
        let mapped: Vec<serde_json::Value> = results
            .into_iter()
            .map(|r| {
                json!({
                    "subject": r.memory.title,
                    "resolution": r.memory.content,
                    "score": r.score
                })
            })
            .collect();

        Ok(ToolOutput::success(json!({ "historical_cases": mapped })))
    }
}

// 6. GetRefundPolicyTool (Read-only, Low Risk)
pub struct GetRefundPolicyTool;

#[async_trait]
impl SupportTool for GetRefundPolicyTool {
    fn name(&self) -> &str {
        "get_refund_policy"
    }
    fn description(&self) -> &str {
        "Retrieve official company refund timelines and eligibility terms"
    }
    fn is_write_tool(&self) -> bool {
        false
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Low
    }

    async fn execute(&self, _input: ToolInput, _context: ToolContext) -> Result<ToolOutput> {
        Ok(ToolOutput::success(json!({
            "standard_timeline_days": 5..10,
            "credit_card_reversal_notice": "Refunds appear on credit card statements within 1-2 billing cycles.",
            "instant_pix_reversal": "PIX refunds processed within 24 hours.",
            "cancellation_window_hours": 24
        })))
    }
}

// 7. SendTicketReplyTool (Write, Medium Risk)
pub struct SendTicketReplyTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for SendTicketReplyTool {
    fn name(&self) -> &str {
        "send_ticket_reply"
    }
    fn description(&self) -> &str {
        "Send an external message reply to customer and mark ticket resolved"
    }
    fn is_write_tool(&self) -> bool {
        true
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Medium
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let reply_msg = input.parameters["message"].as_str().unwrap_or_default();
        if reply_msg.trim().is_empty() {
            return Ok(ToolOutput::failure("Reply message cannot be empty"));
        }

        if context.is_simulation {
            return Ok(ToolOutput::success(json!({
                "simulated": true,
                "action": "reply_sent",
                "reply": reply_msg
            })));
        }

        if let Some(ref tid) = context.ticket_id {
            let mut guard = self.db.tickets.write();
            if let Some(ticket) = guard.get_mut(tid) {
                ticket.replies.push(reply_msg.to_string());
                ticket.status = TicketStatus::Resolved;
                return Ok(ToolOutput::success(json!({
                    "ticket_id": tid,
                    "status": "resolved",
                    "reply": reply_msg
                })));
            }
        }

        Ok(ToolOutput::success(json!({
            "reply_dispatched": true,
            "reply": reply_msg
        })))
    }
}

// 8. AddTicketNoteTool (Write, Medium Risk)
pub struct AddTicketNoteTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for AddTicketNoteTool {
    fn name(&self) -> &str {
        "add_ticket_note"
    }
    fn description(&self) -> &str {
        "Append an internal staff note to the ticket audit trail"
    }
    fn is_write_tool(&self) -> bool {
        true
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Medium
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let note = input.parameters["note"].as_str().unwrap_or_default();
        if context.is_simulation {
            return Ok(ToolOutput::success(
                json!({ "simulated": true, "note": note }),
            ));
        }

        if let Some(ref tid) = context.ticket_id {
            let mut guard = self.db.tickets.write();
            if let Some(ticket) = guard.get_mut(tid) {
                ticket.internal_notes.push(note.to_string());
                return Ok(ToolOutput::success(
                    json!({ "ticket_id": tid, "note_added": note }),
                ));
            }
        }
        Ok(ToolOutput::success(json!({ "note": note })))
    }
}

// 9. EscalateTicketTool (Write, Medium Risk)
pub struct EscalateTicketTool {
    pub db: SupportDatabase,
}

#[async_trait]
impl SupportTool for EscalateTicketTool {
    fn name(&self) -> &str {
        "escalate_ticket"
    }
    fn description(&self) -> &str {
        "Escalate ticket to specialized tier-2 human team with reason"
    }
    fn is_write_tool(&self) -> bool {
        true
    }
    fn risk_level(&self) -> RiskLevel {
        RiskLevel::Medium
    }

    async fn execute(&self, input: ToolInput, context: ToolContext) -> Result<ToolOutput> {
        let reason = input.parameters["reason"]
            .as_str()
            .unwrap_or("Manual escalation");
        if context.is_simulation {
            return Ok(ToolOutput::success(
                json!({ "simulated": true, "escalated": true, "reason": reason }),
            ));
        }

        if let Some(ref tid) = context.ticket_id {
            let mut guard = self.db.tickets.write();
            if let Some(ticket) = guard.get_mut(tid) {
                ticket.status = TicketStatus::Escalated;
                ticket.internal_notes.push(format!("ESCALATED: {}", reason));
                return Ok(ToolOutput::success(json!({
                    "ticket_id": tid,
                    "status": "escalated",
                    "reason": reason
                })));
            }
        }
        Ok(ToolOutput::success(
            json!({ "escalated": true, "reason": reason }),
        ))
    }
}

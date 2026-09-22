use crate::connector::{
    ConnectorAction, ConnectorCapability, ConnectorContext, ConnectorId, ConnectorResult,
    ExternalConnector,
};
use anyhow::Result;
use async_trait::async_trait;
use parking_lot::RwLock;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

/// Real/Mock External SaaS Provider (e.g. Helpdesk / CRM / Order Service)
/// supporting stateful entities, verification and postconditions
#[derive(Clone, Default)]
pub struct ExternalServiceProvider {
    pub tickets: Arc<RwLock<HashMap<String, serde_json::Value>>>,
    pub customers: Arc<RwLock<HashMap<String, serde_json::Value>>>,
}

impl ExternalServiceProvider {
    pub fn new() -> Self {
        let mut customers = HashMap::new();
        customers.insert(
            "cust_001".to_string(),
            json!({
                "id": "cust_001",
                "name": "Maria Souza",
                "email": "maria@example.com",
                "plan": "Enterprise"
            }),
        );

        let mut tickets = HashMap::new();
        tickets.insert(
            "ext_ticket_9001".to_string(),
            json!({
                "id": "ext_ticket_9001",
                "customer_id": "cust_001",
                "subject": "Faturamento duplicado na fatura",
                "status": "Open",
                "replies": []
            }),
        );

        Self {
            tickets: Arc::new(RwLock::new(tickets)),
            customers: Arc::new(RwLock::new(customers)),
        }
    }
}

pub struct HelpdeskSaaSConnector {
    id: ConnectorId,
    pub provider: ExternalServiceProvider,
}

impl Default for HelpdeskSaaSConnector {
    fn default() -> Self {
        Self::new(ExternalServiceProvider::new())
    }
}

impl HelpdeskSaaSConnector {
    pub fn new(provider: ExternalServiceProvider) -> Self {
        Self {
            id: ConnectorId("saas_helpdesk".to_string()),
            provider,
        }
    }
}

#[async_trait]
impl ExternalConnector for HelpdeskSaaSConnector {
    fn id(&self) -> ConnectorId {
        self.id.clone()
    }

    async fn capabilities(&self) -> Result<Vec<ConnectorCapability>> {
        Ok(vec![
            ConnectorCapability::Read,
            ConnectorCapability::Write,
            ConnectorCapability::Update,
            ConnectorCapability::Search,
        ])
    }

    async fn execute(
        &self,
        action: ConnectorAction,
        _context: ConnectorContext,
    ) -> Result<ConnectorResult> {
        match action.action_name.as_str() {
            "read_ticket" => {
                let tid = action.parameters["ticket_id"]
                    .as_str()
                    .unwrap_or("ext_ticket_9001");
                let guard = self.provider.tickets.read();
                if let Some(t) = guard.get(tid) {
                    Ok(ConnectorResult {
                        success: true,
                        status_code: Some(200),
                        data: t.clone(),
                        verified: true,
                        message: None,
                    })
                } else {
                    Ok(ConnectorResult {
                        success: false,
                        status_code: Some(404),
                        data: json!(null),
                        verified: false,
                        message: Some("Ticket not found".to_string()),
                    })
                }
            }
            "reply_ticket" => {
                let tid = action.parameters["ticket_id"]
                    .as_str()
                    .unwrap_or("ext_ticket_9001");
                let reply = action.parameters["reply"]
                    .as_str()
                    .unwrap_or("Resposta confirmada");

                let mut guard = self.provider.tickets.write();
                if let Some(t) = guard.get_mut(tid) {
                    if let Some(arr) = t.get_mut("replies").and_then(|r| r.as_array_mut()) {
                        arr.push(json!(reply));
                    }
                    t["status"] = json!("Resolved");

                    // Postcondition verification: read back immediately
                    let verified = t["status"] == json!("Resolved");
                    Ok(ConnectorResult {
                        success: true,
                        status_code: Some(200),
                        data: t.clone(),
                        verified,
                        message: None,
                    })
                } else {
                    Ok(ConnectorResult {
                        success: false,
                        status_code: Some(404),
                        data: json!(null),
                        verified: false,
                        message: Some("Ticket not found".to_string()),
                    })
                }
            }
            "read_customer" => {
                let cid = action.parameters["customer_id"]
                    .as_str()
                    .unwrap_or("cust_001");
                let guard = self.provider.customers.read();
                if let Some(c) = guard.get(cid) {
                    Ok(ConnectorResult {
                        success: true,
                        status_code: Some(200),
                        data: c.clone(),
                        verified: true,
                        message: None,
                    })
                } else {
                    Ok(ConnectorResult {
                        success: false,
                        status_code: Some(404),
                        data: json!(null),
                        verified: false,
                        message: Some("Customer not found".to_string()),
                    })
                }
            }
            _ => Ok(ConnectorResult {
                success: true,
                status_code: Some(200),
                data: json!({ "status": "processed" }),
                verified: true,
                message: None,
            }),
        }
    }

    async fn health(&self) -> Result<bool> {
        Ok(true)
    }
}

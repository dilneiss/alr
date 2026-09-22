use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRequest {
    pub id: String,
    pub task_id: String,
    pub agent_id: String,
    pub tenant_id: String,
    pub action_name: String,
    pub reason: String,
    pub context_data: serde_json::Value,
    pub status: ApprovalStatus,
    pub approved_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

impl ApprovalRequest {
    pub fn new(
        task_id: impl Into<String>,
        agent_id: impl Into<String>,
        tenant_id: impl Into<String>,
        action_name: impl Into<String>,
        reason: impl Into<String>,
        context_data: serde_json::Value,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: format!(
                "appr_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .chars()
                    .take(8)
                    .collect::<String>()
            ),
            task_id: task_id.into(),
            agent_id: agent_id.into(),
            tenant_id: tenant_id.into(),
            action_name: action_name.into(),
            reason: reason.into(),
            context_data,
            status: ApprovalStatus::Pending,
            approved_by: None,
            created_at: now,
            expires_at: now + chrono::Duration::hours(24),
        }
    }
}

/// Human-In-The-Loop Approval Gateway
#[derive(Clone, Default)]
pub struct ApprovalGateway {
    requests: Arc<RwLock<HashMap<String, ApprovalRequest>>>,
}

impl ApprovalGateway {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn submit_request(&self, req: ApprovalRequest) -> String {
        let id = req.id.clone();
        self.requests.write().insert(id.clone(), req);
        id
    }

    pub fn approve(&self, request_id: &str, approver: impl Into<String>) -> Result<()> {
        let mut guard = self.requests.write();
        let req = match guard.get_mut(request_id) {
            Some(r) => r,
            None => bail!("Approval request '{}' not found", request_id),
        };

        if req.status != ApprovalStatus::Pending {
            bail!(
                "Cannot approve request '{}': current status is {:?}",
                request_id,
                req.status
            );
        }

        req.status = ApprovalStatus::Approved;
        req.approved_by = Some(approver.into());
        Ok(())
    }

    pub fn reject(&self, request_id: &str, reason: &str) -> Result<()> {
        let mut guard = self.requests.write();
        let req = match guard.get_mut(request_id) {
            Some(r) => r,
            None => bail!("Approval request '{}' not found", request_id),
        };

        req.status = ApprovalStatus::Rejected;
        req.reason = format!("{} (Rejected: {})", req.reason, reason);
        Ok(())
    }

    pub fn get_status(&self, request_id: &str) -> Option<ApprovalStatus> {
        self.requests.read().get(request_id).map(|r| r.status)
    }

    pub fn list_pending(&self) -> Vec<ApprovalRequest> {
        self.requests
            .read()
            .values()
            .filter(|r| r.status == ApprovalStatus::Pending)
            .cloned()
            .collect()
    }
}

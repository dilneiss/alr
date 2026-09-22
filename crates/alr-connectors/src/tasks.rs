use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum TaskPriority {
    Low,
    Normal,
    High,
    Urgent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    Running,
    WaitingForApproval,
    WaitingForExternalEvent,
    Retrying,
    Completed,
    Failed,
    Escalated,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCheckpoint {
    pub step_index: usize,
    pub step_results: Vec<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub tenant_id: String,
    pub agent_id: String,
    pub source: String,
    pub priority: TaskPriority,
    pub payload: serde_json::Value,
    pub status: TaskStatus,
    pub checkpoint: Option<AgentCheckpoint>,
    pub attempts: u32,
    pub max_attempts: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl AgentTask {
    pub fn new(
        id: impl Into<String>,
        tenant_id: impl Into<String>,
        agent_id: impl Into<String>,
        source: impl Into<String>,
        payload: serde_json::Value,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: id.into(),
            tenant_id: tenant_id.into(),
            agent_id: agent_id.into(),
            source: source.into(),
            priority: TaskPriority::Normal,
            payload,
            status: TaskStatus::Pending,
            checkpoint: None,
            attempts: 0,
            max_attempts: 3,
            created_at: now,
            updated_at: now,
        }
    }
}

/// In-Memory Persistent Task Queue with Checkpoint / Crash-Recovery Support
#[derive(Clone, Default)]
pub struct TaskQueue {
    tasks: Arc<RwLock<HashMap<String, AgentTask>>>,
}

impl TaskQueue {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn enqueue(&self, task: AgentTask) {
        self.tasks.write().insert(task.id.clone(), task);
    }

    pub fn save_checkpoint(
        &self,
        task_id: &str,
        step_index: usize,
        result: serde_json::Value,
    ) -> Result<()> {
        let mut guard = self.tasks.write();
        let task = match guard.get_mut(task_id) {
            Some(t) => t,
            None => bail!("Task '{}' not found", task_id),
        };

        let mut results = task
            .checkpoint
            .as_ref()
            .map_or(Vec::new(), |c| c.step_results.clone());
        results.push(result);

        task.checkpoint = Some(AgentCheckpoint {
            step_index,
            step_results: results,
            timestamp: Utc::now(),
        });
        task.updated_at = Utc::now();
        Ok(())
    }

    pub fn get_task(&self, task_id: &str) -> Option<AgentTask> {
        self.tasks.read().get(task_id).cloned()
    }

    pub fn list_pending(&self) -> Vec<AgentTask> {
        self.tasks
            .read()
            .values()
            .filter(|t| t.status == TaskStatus::Pending || t.status == TaskStatus::Retrying)
            .cloned()
            .collect()
    }

    pub fn mark_status(&self, task_id: &str, status: TaskStatus) -> Result<()> {
        let mut guard = self.tasks.write();
        if let Some(t) = guard.get_mut(task_id) {
            t.status = status;
            t.updated_at = Utc::now();
        }
        Ok(())
    }
}

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct MemoryId(pub Uuid);

impl MemoryId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for MemoryId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for MemoryId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MemoryType {
    Episodic,
    Procedural,
    Semantic,
    Skill,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum KnowledgeStatus {
    Proposed,
    Testing,
    Verified,
    Active,
    Deprecated,
}

impl KnowledgeStatus {
    pub fn is_active(&self) -> bool {
        matches!(self, KnowledgeStatus::Active)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Memory {
    pub id: MemoryId,
    pub memory_type: MemoryType,
    pub content: serde_json::Value,
    pub confidence: f32,
    pub status: KnowledgeStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Memory {
    pub fn new(memory_type: MemoryType, content: serde_json::Value, confidence: f32) -> Self {
        let now = Utc::now();
        Self {
            id: MemoryId::new(),
            memory_type,
            content,
            confidence,
            status: KnowledgeStatus::Proposed,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub description: String,
    pub conditions: serde_json::Value,
    pub action: super::Action,
    pub confidence: f32,
    pub success_rate: f32,
    pub executions: u64,
    pub failures: u64,
    pub origin: String,
    pub status: KnowledgeStatus,
    pub priority: i32,
    pub risk: f32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Skill {
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
        conditions: serde_json::Value,
        action: super::Action,
    ) -> Self {
        let now = Utc::now();
        let name_str = name.into();
        Self {
            id: Uuid::new_v4().to_string(),
            name: name_str,
            version: 1,
            description: description.into(),
            conditions,
            action,
            confidence: 0.5,
            success_rate: 0.5,
            executions: 0,
            failures: 0,
            origin: "llm_teacher".to_string(),
            status: KnowledgeStatus::Proposed,
            priority: 10,
            risk: 0.1,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn record_execution(&mut self, success: bool) {
        self.executions += 1;
        if !success {
            self.failures += 1;
        }
        let successes = self.executions - self.failures;
        self.success_rate = successes as f32 / self.executions as f32;
        // Dynamic confidence dampening
        self.confidence = (self.confidence * 0.8) + (self.success_rate * 0.2);
        self.updated_at = Utc::now();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeRequest {
    pub state: super::State,
    pub candidate_actions: Vec<super::Action>,
    pub context_description: String,
    pub failure_history: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeProposal {
    pub knowledge_type: String,
    pub state_conditions: serde_json::Value,
    pub action: super::Action,
    pub reason: String,
    pub confidence: f32,
}

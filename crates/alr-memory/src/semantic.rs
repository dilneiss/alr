use crate::embeddings::SparseVector;
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SemanticMemoryType {
    Document,
    Faq,
    Policy,
    Ticket,
    TicketResolution,
    Procedure,
    SkillContext,
}

impl SemanticMemoryType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Document => "document",
            Self::Faq => "faq",
            Self::Policy => "policy",
            Self::Ticket => "ticket",
            Self::TicketResolution => "ticket_resolution",
            Self::Procedure => "procedure",
            Self::SkillContext => "skill_context",
        }
    }

    pub fn from_str_loose(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "document" => Some(Self::Document),
            "faq" => Some(Self::Faq),
            "policy" => Some(Self::Policy),
            "ticket" => Some(Self::Ticket),
            "ticket_resolution" | "resolution" => Some(Self::TicketResolution),
            "procedure" => Some(Self::Procedure),
            "skill_context" | "skill" => Some(Self::SkillContext),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticMemory {
    pub id: String,
    pub tenant_id: String,
    pub agent_id: Option<String>,
    pub memory_type: SemanticMemoryType,
    pub title: String,
    pub content: String,
    pub vector: Option<Vec<f32>>,
    pub sparse_vector: Option<SparseVector>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub source: String,
    pub version: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SemanticMemory {
    pub fn new(
        tenant_id: impl Into<String>,
        memory_type: SemanticMemoryType,
        title: impl Into<String>,
        content: impl Into<String>,
        source: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant_id.into(),
            agent_id: None,
            memory_type,
            title: title.into(),
            content: content.into(),
            vector: None,
            sparse_vector: None,
            metadata: HashMap::new(),
            source: source.into(),
            version: 1,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn with_vector(mut self, vec: Vec<f32>) -> Self {
        self.vector = Some(vec);
        self
    }

    pub fn with_sparse_vector(mut self, sparse: SparseVector) -> Self {
        self.sparse_vector = Some(sparse);
        self
    }

    pub fn with_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticQuery {
    pub tenant_id: String,
    pub vector: Vec<f32>,
    pub sparse_vector: Option<SparseVector>,
    pub memory_type: Option<SemanticMemoryType>,
    pub metadata_filters: HashMap<String, serde_json::Value>,
    pub top_k: usize,
    pub score_threshold: Option<f32>,
}

impl SemanticQuery {
    pub fn new(tenant_id: impl Into<String>, vector: Vec<f32>) -> Self {
        Self {
            tenant_id: tenant_id.into(),
            vector,
            sparse_vector: None,
            memory_type: None,
            metadata_filters: HashMap::new(),
            top_k: 5,
            score_threshold: None,
        }
    }

    pub fn with_sparse_vector(mut self, sparse: SparseVector) -> Self {
        self.sparse_vector = Some(sparse);
        self
    }

    pub fn with_memory_type(mut self, memory_type: SemanticMemoryType) -> Self {
        self.memory_type = Some(memory_type);
        self
    }

    pub fn with_top_k(mut self, top_k: usize) -> Self {
        self.top_k = top_k;
        self
    }

    pub fn with_score_threshold(mut self, threshold: f32) -> Self {
        self.score_threshold = Some(threshold);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticSearchResult {
    pub memory: SemanticMemory,
    pub score: f32,
}

/// Reciprocal Rank Fusion (RRF) for combining multiple ranked retrieval result lists.
/// Formula: RRF_score(d) = sum_{m in models} 1.0 / (k_rrf + rank(d) + 1)
pub fn reciprocal_rank_fusion(
    dense_results: &[SemanticSearchResult],
    sparse_results: &[SemanticSearchResult],
    k_rrf: usize,
    top_k: usize,
) -> Vec<SemanticSearchResult> {
    let mut scores: HashMap<String, (f32, SemanticMemory)> = HashMap::new();

    for (rank, res) in dense_results.iter().enumerate() {
        let rrf_dense = 1.0 / ((k_rrf + rank + 1) as f32);
        scores
            .entry(res.memory.id.clone())
            .and_modify(|(s, _)| *s += rrf_dense)
            .or_insert((rrf_dense, res.memory.clone()));
    }

    for (rank, res) in sparse_results.iter().enumerate() {
        let rrf_sparse = 1.0 / ((k_rrf + rank + 1) as f32);
        scores
            .entry(res.memory.id.clone())
            .and_modify(|(s, _)| *s += rrf_sparse)
            .or_insert((rrf_sparse, res.memory.clone()));
    }

    let mut fused: Vec<SemanticSearchResult> = scores
        .into_values()
        .map(|(score, memory)| SemanticSearchResult { memory, score })
        .collect();

    fused.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    fused.truncate(top_k);
    fused
}

#[async_trait]
pub trait SemanticMemoryStore: Send + Sync {
    async fn upsert(&self, memories: Vec<SemanticMemory>) -> Result<()>;
    async fn search(&self, query: SemanticQuery) -> Result<Vec<SemanticSearchResult>>;
    async fn delete(&self, tenant_id: &str, ids: Vec<String>) -> Result<()>;
    async fn ensure_collection(&self, dimension: usize) -> Result<()>;
}

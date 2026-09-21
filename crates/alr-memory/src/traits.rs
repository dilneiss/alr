use alr_core::{Memory, MemoryId, MemoryType};
use anyhow::Result;
use async_trait::async_trait;

#[derive(Debug, Clone, Default)]
pub struct MemoryQuery {
    pub memory_type: Option<MemoryType>,
    pub min_confidence: Option<f32>,
    pub limit: Option<usize>,
}

#[async_trait]
pub trait MemoryStore: Send + Sync {
    async fn remember(&self, memory: Memory) -> Result<MemoryId>;
    async fn recall(&self, query: MemoryQuery) -> Result<Vec<Memory>>;
    async fn get(&self, id: MemoryId) -> Result<Option<Memory>>;
    async fn update(&self, memory: Memory) -> Result<()>;
    async fn delete(&self, id: MemoryId) -> Result<()>;
}

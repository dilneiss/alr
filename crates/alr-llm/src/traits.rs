use alr_core::{KnowledgeProposal, KnowledgeRequest};
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait LlmTeacher: Send + Sync {
    async fn propose_knowledge(&self, request: KnowledgeRequest) -> Result<KnowledgeProposal>;
    fn call_count(&self) -> u32;
    fn reset_counter(&self);
}

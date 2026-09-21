use crate::embeddings::EmbeddingProvider;
use crate::semantic::{SemanticMemory, SemanticMemoryStore, SemanticMemoryType};
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkingConfig {
    pub max_chars: usize,
    pub overlap_chars: usize,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            max_chars: 400,
            overlap_chars: 50,
        }
    }
}

pub struct IngestionPipeline {
    config: ChunkingConfig,
}

impl Default for IngestionPipeline {
    fn default() -> Self {
        Self::new(ChunkingConfig::default())
    }
}

pub struct IngestionDoc<'a> {
    pub tenant_id: &'a str,
    pub title: &'a str,
    pub content: &'a str,
    pub memory_type: SemanticMemoryType,
    pub source: &'a str,
}

impl IngestionPipeline {
    pub fn new(config: ChunkingConfig) -> Self {
        Self { config }
    }

    pub fn chunk_text(&self, text: &str) -> Vec<String> {
        let trimmed = text.trim();
        if trimmed.len() <= self.config.max_chars {
            return vec![trimmed.to_string()];
        }

        let mut chunks = Vec::new();
        let chars: Vec<char> = trimmed.chars().collect();
        let mut start = 0;

        while start < chars.len() {
            let end = (start + self.config.max_chars).min(chars.len());
            let chunk: String = chars[start..end].iter().collect();
            chunks.push(chunk);

            if end == chars.len() {
                break;
            }
            start = end - self.config.overlap_chars.min(end - start);
        }

        chunks
    }

    pub async fn ingest_document<S: SemanticMemoryStore, E: EmbeddingProvider>(
        &self,
        store: &S,
        embedder: &E,
        doc: IngestionDoc<'_>,
    ) -> Result<Vec<String>> {
        let chunks = self.chunk_text(doc.content);
        let vectors = embedder.embed(&chunks).await?;

        let mut memories = Vec::new();
        let mut ids = Vec::new();

        for (i, (chunk, vector)) in chunks.into_iter().zip(vectors).enumerate() {
            let chunk_title = if i == 0 {
                doc.title.to_string()
            } else {
                format!("{} (Part {})", doc.title, i + 1)
            };

            let mem = SemanticMemory::new(
                doc.tenant_id,
                doc.memory_type.clone(),
                chunk_title,
                chunk,
                doc.source,
            )
            .with_vector(vector)
            .with_metadata("chunk_index", serde_json::json!(i));

            ids.push(mem.id.clone());
            memories.push(mem);
        }

        store.upsert(memories).await?;
        Ok(ids)
    }
}

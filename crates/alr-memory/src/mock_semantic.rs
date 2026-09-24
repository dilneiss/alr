use crate::semantic::{SemanticMemory, SemanticMemoryStore, SemanticQuery, SemanticSearchResult};
use anyhow::Result;
use async_trait::async_trait;
use parking_lot::RwLock;
use std::sync::Arc;

/// In-memory mock semantic store for offline tests and CI environments
#[derive(Clone, Default)]
pub struct MockSemanticMemoryStore {
    memories: Arc<RwLock<Vec<SemanticMemory>>>,
}

impl MockSemanticMemoryStore {
    pub fn new() -> Self {
        Self {
            memories: Arc::new(RwLock::new(Vec::new())),
        }
    }

    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() || a.is_empty() {
            return 0.0;
        }
        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm_a > 1e-6 && norm_b > 1e-6 {
            dot / (norm_a * norm_b)
        } else {
            0.0
        }
    }
}

#[async_trait]
impl SemanticMemoryStore for MockSemanticMemoryStore {
    async fn ensure_collection(&self, _dimension: usize) -> Result<()> {
        Ok(())
    }

    async fn upsert(&self, memories: Vec<SemanticMemory>) -> Result<()> {
        let mut guard = self.memories.write();
        for mem in memories {
            guard.retain(|m| m.id != mem.id);
            guard.push(mem);
        }
        Ok(())
    }

    async fn search(&self, query: SemanticQuery) -> Result<Vec<SemanticSearchResult>> {
        let guard = self.memories.read();
        let mut scored: Vec<SemanticSearchResult> = guard
            .iter()
            .filter(|m| m.tenant_id == query.tenant_id)
            .filter(|m| {
                if let Some(ref target_type) = query.memory_type {
                    m.memory_type == *target_type
                } else {
                    true
                }
            })
            .filter_map(|m| {
                let v = m.vector.as_ref()?;
                let sim = Self::cosine_similarity(&query.vector, v);
                if let Some(thresh) = query.score_threshold {
                    if sim < thresh {
                        return None;
                    }
                }
                Some(SemanticSearchResult {
                    memory: m.clone(),
                    score: sim,
                })
            })
            .collect();

        scored.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        if let Some(sparse_q) = &query.sparse_vector {
            let mut sparse_scored: Vec<SemanticSearchResult> = guard
                .iter()
                .filter(|m| m.tenant_id == query.tenant_id)
                .filter(|m| {
                    if let Some(target_type) = &query.memory_type {
                        m.memory_type == *target_type
                    } else {
                        true
                    }
                })
                .filter_map(|m| {
                    let sv = m.sparse_vector.as_ref()?;
                    let dot = sparse_q.dot(sv);
                    if dot > 0.0 {
                        Some(SemanticSearchResult {
                            memory: m.clone(),
                            score: dot,
                        })
                    } else {
                        None
                    }
                })
                .collect();

            sparse_scored.sort_by(|a, b| {
                b.score
                    .partial_cmp(&a.score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            let fused =
                crate::semantic::reciprocal_rank_fusion(&scored, &sparse_scored, 60, query.top_k);
            Ok(fused)
        } else {
            scored.truncate(query.top_k);
            Ok(scored)
        }
    }
    async fn delete(&self, tenant_id: &str, ids: Vec<String>) -> Result<()> {
        let mut guard = self.memories.write();
        guard.retain(|m| m.tenant_id != tenant_id || !ids.contains(&m.id));
        Ok(())
    }
}

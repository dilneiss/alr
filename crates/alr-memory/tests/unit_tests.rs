#[cfg(test)]
mod tests {
    use alr_core::domain::{Memory, MemoryType};
    use alr_memory::traits::{MemoryQuery, MemoryStore};
    use alr_memory::SqliteMemoryStore;

    #[tokio::test]
    async fn test_sqlite_memory_remember_and_recall() {
        let store = SqliteMemoryStore::open_in_memory().unwrap();
        let mem = Memory::new(
            MemoryType::Procedural,
            serde_json::json!({ "rule": "avoid_front" }),
            0.92,
        );

        let id = store.remember(mem.clone()).await.unwrap();
        let query = MemoryQuery {
            memory_type: Some(MemoryType::Procedural),
            min_confidence: Some(0.90),
            limit: Some(10),
        };

        let recalled = store.recall(query).await.unwrap();
        assert_eq!(recalled.len(), 1);
        assert_eq!(recalled[0].id, id);
        assert_eq!(recalled[0].confidence, 0.92);
    }

    #[test]
    fn test_mock_embedding_provider_dimension_and_norm() {
        use alr_memory::embeddings::{EmbeddingProvider, MockEmbeddingProvider};

        let embedder = MockEmbeddingProvider::new(64);
        assert_eq!(embedder.dimension(), 64);

        let vec = embedder.compute_vector("Solicito reembolso de compra cobrada duas vezes no cartão");
        assert_eq!(vec.len(), 64);

        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-4, "Mock embedding must be L2 normalized to unit length");
    }

    #[test]
    fn test_ingestion_pipeline_chunking() {
        use alr_memory::ingestion::{ChunkingConfig, IngestionPipeline};

        let pipeline = IngestionPipeline::new(ChunkingConfig {
            max_chars: 50,
            overlap_chars: 10,
        });

        let short_text = "Texto curto";
        let chunks_short = pipeline.chunk_text(short_text);
        assert_eq!(chunks_short.len(), 1);
        assert_eq!(chunks_short[0], "Texto curto");

        let long_text = "Esta é uma frase longa projetada para testar o particionamento em múltiplos pedaços com sobreposição.";
        let chunks_long = pipeline.chunk_text(long_text);
        assert!(chunks_long.len() >= 2);
        for chunk in &chunks_long {
            assert!(chunk.chars().count() <= 50);
        }
    }

    #[tokio::test]
    async fn test_mock_semantic_memory_store_insert_and_search() {
        use alr_memory::embeddings::MockEmbeddingProvider;
        use alr_memory::mock_semantic::MockSemanticMemoryStore;
        use alr_memory::semantic::{SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery};
        use std::collections::HashMap;

        let embedder = MockEmbeddingProvider::new(64);
        let store = MockSemanticMemoryStore::new();

        let v1 = embedder.compute_vector("Política de reembolso e devolução em até 30 dias");
        let now = chrono::Utc::now();
        let mem1 = SemanticMemory {
            id: "mem_1".to_string(),
            tenant_id: "tenant_1".to_string(),
            agent_id: None,
            memory_type: SemanticMemoryType::Policy,
            title: "Política de Reembolso".to_string(),
            content: "Devolução integral em até 30 dias após recebimento".to_string(),
            vector: Some(v1),
            sparse_vector: None,
            source: "manual".to_string(),
            metadata: HashMap::new(),
            version: 1,
            created_at: now,
            updated_at: now,
        };

        store.upsert(vec![mem1]).await.unwrap();

        let query_vec = embedder.compute_vector("Quero meu dinheiro de volta reembolso");
        let query = SemanticQuery {
            tenant_id: "tenant_1".to_string(),
            vector: query_vec,
            sparse_vector: None,
            memory_type: None,
            metadata_filters: HashMap::new(),
            top_k: 5,
            score_threshold: None,
        };

        let results = store.search(query).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].memory.title, "Política de Reembolso");
        assert!(results[0].score > 0.50);
    }
}

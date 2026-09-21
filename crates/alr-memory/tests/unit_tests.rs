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
}

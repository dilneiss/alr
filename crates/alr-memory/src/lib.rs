pub mod embeddings;
pub mod ingestion;
pub mod mock_semantic;
pub mod models;
pub mod qdrant;
pub mod retrieval_eval;
pub mod semantic;
pub mod sqlite;
pub mod traits;

pub use embeddings::{
    normalize_l2, EmbeddingProvider, MockEmbeddingProvider, OpenAICompatibleEmbeddingProvider,
};
pub use ingestion::{ChunkingConfig, IngestionDoc, IngestionPipeline};
pub use mock_semantic::MockSemanticMemoryStore;
pub use models::{DecisionAuditRecord, EpisodeRecord};
pub use qdrant::QdrantSemanticMemoryStore;
pub use retrieval_eval::{
    QueryEvaluationResult, RetrievalBenchmarkReport, RetrievalEvaluator, RetrievalTestCase,
};
pub use semantic::{
    SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery, SemanticSearchResult,
};
pub use sqlite::SqliteMemoryStore;
pub use traits::{MemoryQuery, MemoryStore};

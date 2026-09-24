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
    normalize_l2, Bm25SparseVectorizer, EmbeddingProvider, HighDimensionalEmbeddingProvider,
    MockEmbeddingProvider, OpenAICompatibleEmbeddingProvider, SparseEmbeddingProvider,
    SparseVector, DIM_BERT_BASE, DIM_BGE_SMALL, DIM_OPENAI_SMALL,
};
pub use ingestion::{ChunkingConfig, IngestionDoc, IngestionPipeline};
pub use mock_semantic::MockSemanticMemoryStore;
pub use models::{DecisionAuditRecord, EpisodeRecord};
pub use qdrant::{
    HnswConfig, QdrantCollectionConfig, QdrantSemanticMemoryStore, ScalarQuantizationConfig,
};
pub use retrieval_eval::{
    QueryEvaluationResult, RetrievalBenchmarkReport, RetrievalEvaluator, RetrievalTestCase,
};
pub use semantic::{
    reciprocal_rank_fusion, SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery,
    SemanticSearchResult,
};
pub use sqlite::SqliteMemoryStore;
pub use traits::{MemoryQuery, MemoryStore};

use alr_memory::{
    reciprocal_rank_fusion, Bm25SparseVectorizer, EmbeddingProvider,
    HighDimensionalEmbeddingProvider, HnswConfig, MockSemanticMemoryStore, QdrantCollectionConfig,
    QdrantSemanticMemoryStore, ScalarQuantizationConfig, SemanticMemory, SemanticMemoryStore,
    SemanticMemoryType, SemanticQuery, SemanticSearchResult, SparseVector, DIM_BERT_BASE,
    DIM_BGE_SMALL, DIM_OPENAI_SMALL,
};
use std::sync::Arc;
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a > 1e-6 && norm_b > 1e-6 {
        dot / (norm_a * norm_b)
    } else {
        0.0
    }
}

/// 1. GERAÇÃO E NORMALIZAÇÃO DE VETORES DE ALTA DIMENSIONALIDADE (384d, 768d, 1536d)
#[tokio::test]
async fn test_high_dimensional_embedding_generation_and_l2_normalization() {
    let dimensions = vec![DIM_BGE_SMALL, DIM_BERT_BASE, DIM_OPENAI_SMALL, 512];

    for dim in dimensions {
        let provider = HighDimensionalEmbeddingProvider::new(dim);
        assert_eq!(provider.dimension(), dim);

        let texts = vec![
            "Solicitação de reembolso e estorno do valor pago no cartão de crédito".to_string(),
            "Quero meu dinheiro de volta e solicito estorno do pagamento efetuado".to_string(),
            "Como redefinir minha senha de acesso e ativar autenticação em duas etapas".to_string(),
        ];

        let vectors = provider
            .embed(&texts)
            .await
            .expect("Embedding generation must succeed");
        assert_eq!(vectors.len(), 3);

        for vec in &vectors {
            assert_eq!(vec.len(), dim);
            let norm_sq: f32 = vec.iter().map(|x| x * x).sum();
            assert!(
                (norm_sq - 1.0).abs() < 1e-3,
                "Vector of dim {} must be L2 normalized (got norm_sq: {})",
                dim,
                norm_sq
            );
        }

        // Intra-domain semantic similarity (Refund vs Refund)
        let sim_refund = cosine_similarity(&vectors[0], &vectors[1]);
        assert!(
            sim_refund > 0.65,
            "Paraphrases in refund domain must have high similarity (got: {})",
            sim_refund
        );

        // Inter-domain semantic divergence (Refund vs Password Reset)
        let sim_cross = cosine_similarity(&vectors[0], &vectors[2]);
        assert!(
            sim_cross < 0.35,
            "Orthogonal domains must have low similarity (got: {})",
            sim_cross
        );
    }
}

/// 2. VETORIZAÇÃO ESPARSA BM25 PARA IDENTIFICADORES EXATOS E TERMOS TÉCNICOS
#[test]
fn test_bm25_sparse_vectorizer_for_exact_identifiers_and_technical_terms() {
    let empty_sparse = SparseVector::default();
    assert!(empty_sparse.is_empty());
    assert_eq!(empty_sparse.len(), 0);

    let custom_sparse = SparseVector::new(vec![5, 2, 5], vec![1.0, 2.0, 3.0]);
    assert_eq!(custom_sparse.indices, vec![2, 5]);
    assert_eq!(custom_sparse.values, vec![2.0, 4.0]);

    let vectorizer = Bm25SparseVectorizer::new();
    let text_with_codes = "Problema no pedido ord_98742 e rastreamento rast_12345 com falha timeout_err_504 no gateway.";
    let sparse_vec = vectorizer.vectorize(text_with_codes);

    assert!(!sparse_vec.is_empty());
    assert_eq!(sparse_vec.indices.len(), sparse_vec.values.len());

    // Verify indices are sorted and strictly increasing
    for window in sparse_vec.indices.windows(2) {
        assert!(
            window[0] < window[1],
            "Sparse indices must be strictly increasing"
        );
    }

    // Verify all BM25 weights are positive
    for val in &sparse_vec.values {
        assert!(*val > 0.0, "BM25 weights must be positive");
    }

    // Test exact code lookup dot product
    let query_code = "ord_98742";
    let query_sparse = vectorizer.vectorize(query_code);
    let dot_match = sparse_vec.dot(&query_sparse);
    assert!(
        dot_match > 10.0,
        "Exact order code match must have high dot product score (got: {})",
        dot_match
    );

    // Unrelated text should have zero dot product
    let query_unrelated = "receita de bolo de cenoura com cobertura";
    let unrelated_sparse = vectorizer.vectorize(query_unrelated);
    let dot_unrelated = sparse_vec.dot(&unrelated_sparse);
    assert_eq!(
        dot_unrelated, 0.0,
        "Completely unrelated text must have zero dot product with order text"
    );
}

/// 3. CONFIGURAÇÃO AVANÇADA DO QDRANT: HNSW, QUANTIZAÇÃO ESCALAR int8 E SUPORTE HÍBRIDO
#[tokio::test]
async fn test_qdrant_collection_advanced_config_and_scalar_quantization() {
    let default_hnsw = HnswConfig::default();
    assert_eq!(default_hnsw.m, 16);
    assert_eq!(default_hnsw.ef_construct, 100);

    let default_quant = ScalarQuantizationConfig::default();
    assert_eq!(default_quant.r#type, "int8");
    assert!((default_quant.quantile - 0.99).abs() < 1e-4);
    assert!(default_quant.always_ram);

    let config = QdrantCollectionConfig::default();
    assert!(config.hnsw.is_some());
    assert!(config.quantization.is_some());
    assert!(config.enable_sparse);

    // Test live Qdrant integration if server reachable
    let qdrant_url =
        std::env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6333".to_string());
    let collection_name = "test_phase21_advanced_qdrant";
    let qdrant = QdrantSemanticMemoryStore::new(&qdrant_url, None, collection_name)
        .with_hnsw(16, 100)
        .with_quantization(true)
        .with_sparse(true);

    if qdrant.ensure_collection(384).await.is_err() {
        eprintln!(
            "Skipping live Qdrant network test: service not reachable at {}",
            qdrant_url
        );
        return;
    }

    let embedder = HighDimensionalEmbeddingProvider::bge_small_384();
    let vectorizer = Bm25SparseVectorizer::new();
    let tenant = "tenant_phase21";

    let content = "Instruções de segurança para cartão clonado e contestação ord_77112.";
    let dense_vec = embedder.compute_vector(content);
    let sparse_vec = vectorizer.vectorize(content);

    let mem = SemanticMemory::new(
        tenant,
        SemanticMemoryType::Policy,
        "Política de Fraude",
        content,
        "security",
    )
    .with_vector(dense_vec)
    .with_sparse_vector(sparse_vec);

    qdrant
        .upsert(vec![mem.clone()])
        .await
        .expect("Upsert in Qdrant must succeed");

    // Query with hybrid dense + sparse BM25
    let query_sparse = vectorizer.vectorize("ord_77112");
    let query_dense = embedder.compute_vector("cartão clonado contestação");
    let query = SemanticQuery::new(tenant, query_dense)
        .with_sparse_vector(query_sparse)
        .with_top_k(3);

    let results = qdrant
        .search(query)
        .await
        .expect("Hybrid search must succeed");
    assert!(
        !results.is_empty(),
        "Hybrid search must find inserted document"
    );
    assert_eq!(results[0].memory.id, mem.id);
    assert_eq!(results[0].memory.tenant_id, tenant);

    // Clean up
    let _ = qdrant.delete(tenant, vec![mem.id]).await;
}

/// 4. FUSÃO RECÍPROCA DE RANKING (RRF) PARA BUSCA HÍBRIDA
#[test]
fn test_reciprocal_rank_fusion_hybrid_scoring() {
    let mem1 = SemanticMemory::new(
        "t1",
        SemanticMemoryType::Document,
        "Doc 1",
        "Content 1",
        "src",
    );
    let mem2 = SemanticMemory::new(
        "t1",
        SemanticMemoryType::Document,
        "Doc 2",
        "Content 2",
        "src",
    );
    let mem3 = SemanticMemory::new(
        "t1",
        SemanticMemoryType::Document,
        "Doc 3",
        "Content 3",
        "src",
    );

    // Model A ranks: mem1 (#1), mem2 (#2), mem3 (#3)
    let dense_results = vec![
        SemanticSearchResult {
            memory: mem1.clone(),
            score: 0.95,
        },
        SemanticSearchResult {
            memory: mem2.clone(),
            score: 0.85,
        },
        SemanticSearchResult {
            memory: mem3.clone(),
            score: 0.70,
        },
    ];

    // Model B (sparse) ranks: mem2 (#1), mem1 (#2), mem3 (#3)
    let sparse_results = vec![
        SemanticSearchResult {
            memory: mem2.clone(),
            score: 25.0,
        },
        SemanticSearchResult {
            memory: mem1.clone(),
            score: 18.0,
        },
        SemanticSearchResult {
            memory: mem3.clone(),
            score: 5.0,
        },
    ];

    let fused = reciprocal_rank_fusion(&dense_results, &sparse_results, 60, 3);
    assert_eq!(fused.len(), 3);

    // Mem1 score: 1/61 + 1/62 = 0.016393 + 0.016129 = 0.032522
    // Mem2 score: 1/62 + 1/61 = 0.016129 + 0.016393 = 0.032522
    // Both mem1 and mem2 tie at the top, while mem3 is strictly lower: 1/63 + 1/63 = 0.031746
    assert!(fused[0].score > fused[2].score);
    assert!(fused[1].score > fused[2].score);
    assert_eq!(fused[2].memory.id, mem3.id);
}

/// 5. AVALIAÇÃO DE HIT@1, HIT@3 E MRR COM RECUPERAÇÃO HÍBRIDA
#[tokio::test]
async fn test_retrieval_benchmark_hit_rates_and_mrr() {
    let store = Arc::new(MockSemanticMemoryStore::new());
    let embedder = HighDimensionalEmbeddingProvider::bge_small_384();
    let vectorizer = Bm25SparseVectorizer::new();
    let tenant = "tenant_test_metrics";

    let docs = vec![
        ("Política de Reembolso e Estorno", "Informações para estorno no cartão e devolução do saldo integral em até 5 dias úteis com pedido ord_1001.", SemanticMemoryType::Policy),
        ("Cobrança Duplicada no Cartão", "Procedimento para cancelamento de transação duplicada e estorno imediato com pedido ord_1002.", SemanticMemoryType::Policy),
        ("Redefinição de Senha e Acesso", "Instruções de login, troca de senha e autenticação de dois fatores com código ord_1003.", SemanticMemoryType::Procedure),
        ("Falha Técnica e Timeout 500", "Erro interno no servidor e tempo limite esgotado no gateway com log ord_1004.", SemanticMemoryType::Document),
    ];

    let mut memories = Vec::new();
    for (title, content, m_type) in docs {
        let dense_vec = embedder.compute_vector(content);
        let sparse_vec = vectorizer.vectorize(content);
        let mem = SemanticMemory::new(tenant, m_type, title, content, "corpus")
            .with_vector(dense_vec)
            .with_sparse_vector(sparse_vec);
        memories.push(mem);
    }

    store.upsert(memories).await.expect("Upsert must succeed");

    let test_queries = vec![
        (
            "Quero o estorno do meu dinheiro de volta",
            "Política de Reembolso",
        ),
        (
            "Duas cobranças idênticas apareceram na minha fatura",
            "Cobrança Duplicada",
        ),
        ("Esqueci minha senha de login", "Redefinição de Senha"),
        ("Erro no servidor timeout de conexão", "Falha Técnica"),
        ("ord_1001", "Política de Reembolso"),
        ("ord_1004", "Falha Técnica"),
    ];

    let mut hit1_count = 0;
    let mut hit3_count = 0;
    let mut rrf_sum = 0.0f32;

    for (q_text, expected_title_sub) in &test_queries {
        let q_dense = embedder.compute_vector(q_text);
        let q_sparse = vectorizer.vectorize(q_text);

        let query = SemanticQuery::new(tenant, q_dense)
            .with_sparse_vector(q_sparse)
            .with_top_k(3);

        let results = store.search(query).await.expect("Search must succeed");
        assert!(
            !results.is_empty(),
            "Must find at least one result for query: {}",
            q_text
        );

        let mut rank = None;
        for (i, r) in results.iter().enumerate() {
            if r.memory.title.contains(expected_title_sub) {
                rank = Some(i + 1);
                break;
            }
        }

        if let Some(r) = rank {
            if r == 1 {
                hit1_count += 1;
            }
            if r <= 3 {
                hit3_count += 1;
            }
            rrf_sum += 1.0 / (r as f32);
        }
    }

    let hit1_rate = (hit1_count as f32 / test_queries.len() as f32) * 100.0;
    let hit3_rate = (hit3_count as f32 / test_queries.len() as f32) * 100.0;
    let mrr = rrf_sum / (test_queries.len() as f32);

    assert!(
        hit1_rate >= 80.0,
        "Hit@1 rate must be at least 80% (got: {:.1}%)",
        hit1_rate
    );
    assert_eq!(
        hit3_rate, 100.0,
        "Hit@3 rate must be 100% (got: {:.1}%)",
        hit3_rate
    );
    assert!(mrr >= 0.85, "MRR must be at least 0.85 (got: {:.3})", mrr);
}

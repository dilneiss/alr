use crate::embeddings::EmbeddingProvider;
use crate::semantic::{SemanticMemoryStore, SemanticQuery};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalTestCase {
    pub query: String,
    pub expected_titles: Vec<String>,
    pub negative_query: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryEvaluationResult {
    pub query: String,
    pub expected_titles: Vec<String>,
    pub actual_titles: Vec<String>,
    pub hit_at_1: bool,
    pub hit_at_3: bool,
    pub hit_at_5: bool,
    pub reciprocal_rank: f32,
    pub top_score: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalBenchmarkReport {
    pub total_queries: usize,
    pub hit_at_1_rate: f32,
    pub hit_at_3_rate: f32,
    pub hit_at_5_rate: f32,
    pub mean_reciprocal_rank: f32,
}

pub struct RetrievalEvaluator;

impl RetrievalEvaluator {
    pub async fn evaluate_query<S: SemanticMemoryStore, E: EmbeddingProvider>(
        store: &S,
        embedder: &E,
        tenant_id: &str,
        test_case: &RetrievalTestCase,
    ) -> Result<QueryEvaluationResult> {
        let vectors = embedder
            .embed(std::slice::from_ref(&test_case.query))
            .await?;
        let vector = vectors.into_iter().next().unwrap_or_default();

        let query = SemanticQuery {
            tenant_id: tenant_id.to_string(),
            vector,
            sparse_vector: None,
            memory_type: None,
            metadata_filters: HashMap::new(),
            top_k: 5,
            score_threshold: None,
        };

        let results = store.search(query).await?;
        let actual_titles: Vec<String> = results.iter().map(|r| r.memory.title.clone()).collect();
        let top_score = results.first().map(|r| r.score);

        let mut hit_rank = None;
        for (i, title) in actual_titles.iter().enumerate() {
            let matched = test_case.expected_titles.iter().any(|exp| {
                title.to_lowercase().contains(&exp.to_lowercase())
                    || exp.to_lowercase().contains(&title.to_lowercase())
            });
            if matched {
                hit_rank = Some(i + 1);
                break;
            }
        }

        let hit_at_1 = hit_rank.is_some_and(|r| r <= 1);
        let hit_at_3 = hit_rank.is_some_and(|r| r <= 3);
        let hit_at_5 = hit_rank.is_some_and(|r| r <= 5);
        let reciprocal_rank = hit_rank.map_or(0.0, |r| 1.0 / (r as f32));

        Ok(QueryEvaluationResult {
            query: test_case.query.clone(),
            expected_titles: test_case.expected_titles.clone(),
            actual_titles,
            hit_at_1,
            hit_at_3,
            hit_at_5,
            reciprocal_rank,
            top_score,
        })
    }

    pub async fn run_benchmark<S: SemanticMemoryStore, E: EmbeddingProvider>(
        store: &S,
        embedder: &E,
        tenant_id: &str,
        dataset: &[RetrievalTestCase],
    ) -> Result<RetrievalBenchmarkReport> {
        if dataset.is_empty() {
            return Ok(RetrievalBenchmarkReport {
                total_queries: 0,
                hit_at_1_rate: 0.0,
                hit_at_3_rate: 0.0,
                hit_at_5_rate: 0.0,
                mean_reciprocal_rank: 0.0,
            });
        }

        let mut hit_1_count = 0;
        let mut hit_3_count = 0;
        let mut hit_5_count = 0;
        let mut sum_mrr = 0.0;
        let mut evaluated_count = 0;

        for tc in dataset {
            if tc.negative_query {
                continue;
            }
            let res = Self::evaluate_query(store, embedder, tenant_id, tc).await?;
            if res.hit_at_1 {
                hit_1_count += 1;
            }
            if res.hit_at_3 {
                hit_3_count += 1;
            }
            if res.hit_at_5 {
                hit_5_count += 1;
            }
            sum_mrr += res.reciprocal_rank;
            evaluated_count += 1;
        }

        let count_f = evaluated_count.max(1) as f32;
        Ok(RetrievalBenchmarkReport {
            total_queries: evaluated_count,
            hit_at_1_rate: hit_1_count as f32 / count_f,
            hit_at_3_rate: hit_3_count as f32 / count_f,
            hit_at_5_rate: hit_5_count as f32 / count_f,
            mean_reciprocal_rank: sum_mrr / count_f,
        })
    }
}

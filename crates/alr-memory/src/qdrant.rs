use crate::embeddings::SparseVector;
use crate::semantic::{
    SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery, SemanticSearchResult,
};
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

/// HNSW index configuration for Qdrant collection tuning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HnswConfig {
    pub m: usize,
    pub ef_construct: usize,
}

impl Default for HnswConfig {
    fn default() -> Self {
        Self {
            m: 16,
            ef_construct: 100,
        }
    }
}

/// Scalar Quantization configuration (e.g. int8) for reducing RAM usage by ~75%
/// and accelerating vector search operations up to 4x.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalarQuantizationConfig {
    pub r#type: String,
    pub quantile: f32,
    pub always_ram: bool,
}

impl Default for ScalarQuantizationConfig {
    fn default() -> Self {
        Self {
            r#type: "int8".to_string(),
            quantile: 0.99,
            always_ram: true,
        }
    }
}

/// Advanced Qdrant collection configuration supporting HNSW tuning,
/// scalar quantization (int8), and sparse vector index for BM25 hybrid search.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QdrantCollectionConfig {
    pub hnsw: Option<HnswConfig>,
    pub quantization: Option<ScalarQuantizationConfig>,
    pub enable_sparse: bool,
    pub sparse_vector_name: String,
}

impl Default for QdrantCollectionConfig {
    fn default() -> Self {
        Self {
            hnsw: Some(HnswConfig::default()),
            quantization: Some(ScalarQuantizationConfig::default()),
            enable_sparse: true,
            sparse_vector_name: "bm25".to_string(),
        }
    }
}

pub struct QdrantSemanticMemoryStore {
    client: Client,
    base_url: String,
    api_key: Option<String>,
    collection: String,
    config: Option<QdrantCollectionConfig>,
}

impl QdrantSemanticMemoryStore {
    pub fn new(
        base_url: impl Into<String>,
        api_key: Option<String>,
        collection: impl Into<String>,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self {
            client,
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_key,
            collection: collection.into(),
            config: Some(QdrantCollectionConfig::default()),
        }
    }

    pub fn from_env() -> Self {
        let base_url =
            std::env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6333".to_string());
        let api_key = std::env::var("QDRANT_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty());
        let collection = std::env::var("QDRANT_COLLECTION")
            .unwrap_or_else(|_| "alr_semantic_memory".to_string());
        Self::new(base_url, api_key, collection)
    }

    pub fn with_config(mut self, config: QdrantCollectionConfig) -> Self {
        self.config = Some(config);
        self
    }

    pub fn with_quantization(mut self, enabled: bool) -> Self {
        let mut cfg = self.config.unwrap_or_default();
        if enabled {
            cfg.quantization = Some(ScalarQuantizationConfig::default());
        } else {
            cfg.quantization = None;
        }
        self.config = Some(cfg);
        self
    }

    pub fn with_hnsw(mut self, m: usize, ef_construct: usize) -> Self {
        let mut cfg = self.config.unwrap_or_default();
        cfg.hnsw = Some(HnswConfig { m, ef_construct });
        self.config = Some(cfg);
        self
    }

    pub fn with_sparse(mut self, enabled: bool) -> Self {
        let mut cfg = self.config.unwrap_or_default();
        cfg.enable_sparse = enabled;
        self.config = Some(cfg);
        self
    }

    pub fn collection_name(&self) -> &str {
        &self.collection
    }

    pub fn config(&self) -> Option<&QdrantCollectionConfig> {
        self.config.as_ref()
    }

    fn request_builder(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        let mut req = self.client.request(method, &url);
        if let Some(key) = &self.api_key {
            req = req.header("api-key", key);
        }
        req
    }

    fn parse_points(
        &self,
        items: &[serde_json::Value],
        score_threshold: Option<f32>,
    ) -> Result<Vec<SemanticSearchResult>> {
        let mut results = Vec::new();
        for item in items {
            let id = item["id"].as_str().unwrap_or_default().to_string();
            let score = item["score"].as_f64().unwrap_or(0.0) as f32;
            if let Some(thresh) = score_threshold {
                if score < thresh {
                    continue;
                }
            }
            let payload = &item["payload"];

            let tenant_id = payload["tenant_id"]
                .as_str()
                .unwrap_or_default()
                .to_string();
            let agent_id = payload["agent_id"].as_str().map(|s| s.to_string());
            let m_type_str = payload["memory_type"].as_str().unwrap_or("document");
            let memory_type = SemanticMemoryType::from_str_loose(m_type_str)
                .unwrap_or(SemanticMemoryType::Document);
            let title = payload["title"].as_str().unwrap_or_default().to_string();
            let content = payload["content"].as_str().unwrap_or_default().to_string();
            let source = payload["source"].as_str().unwrap_or_default().to_string();
            let version = payload["version"].as_u64().unwrap_or(1) as u32;

            let created_at = payload["created_at"]
                .as_str()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(Utc::now);

            let updated_at = payload["updated_at"]
                .as_str()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(Utc::now);

            let sparse_vector = if let (Some(indices_arr), Some(values_arr)) = (
                payload["sparse_indices"].as_array(),
                payload["sparse_values"].as_array(),
            ) {
                let indices: Vec<u32> = indices_arr
                    .iter()
                    .filter_map(|v| v.as_u64().map(|n| n as u32))
                    .collect();
                let values: Vec<f32> = values_arr
                    .iter()
                    .filter_map(|v| v.as_f64().map(|n| n as f32))
                    .collect();
                if !indices.is_empty() && indices.len() == values.len() {
                    Some(SparseVector::new(indices, values))
                } else {
                    None
                }
            } else {
                None
            };

            let mut metadata = std::collections::HashMap::new();
            if let Some(obj) = payload.as_object() {
                for (k, v) in obj {
                    if ![
                        "tenant_id",
                        "agent_id",
                        "memory_type",
                        "title",
                        "content",
                        "source",
                        "version",
                        "created_at",
                        "updated_at",
                        "sparse_indices",
                        "sparse_values",
                    ]
                    .contains(&k.as_str())
                    {
                        metadata.insert(k.clone(), v.clone());
                    }
                }
            }

            let mem = SemanticMemory {
                id,
                tenant_id,
                agent_id,
                memory_type,
                title,
                content,
                vector: None,
                sparse_vector,
                metadata,
                source,
                version,
                created_at,
                updated_at,
            };

            results.push(SemanticSearchResult { memory: mem, score });
        }
        Ok(results)
    }

    pub async fn ensure_collection_advanced(
        &self,
        dimension: usize,
        config: Option<&QdrantCollectionConfig>,
    ) -> Result<()> {
        let path = format!("collections/{}", self.collection);
        let check_res = self
            .request_builder(reqwest::Method::GET, &path)
            .send()
            .await?;
        if check_res.status().is_success() {
            if let Ok(info_json) = check_res.json::<serde_json::Value>().await {
                let existing_dim = info_json["result"]["config"]["params"]["vectors"]["size"]
                    .as_u64()
                    .or_else(|| {
                        info_json["result"]["config"]["params"]["vectors"][""]["size"].as_u64()
                    });
                if let Some(dim) = existing_dim {
                    if dim != dimension as u64 {
                        // Dimension mismatch: recreate collection with target dimension
                        let _ = self
                            .request_builder(reqwest::Method::DELETE, &path)
                            .send()
                            .await;
                    } else {
                        return Ok(());
                    }
                } else {
                    return Ok(());
                }
            } else {
                return Ok(());
            }
        }

        let mut body = json!({
            "vectors": {
                "size": dimension,
                "distance": "Cosine"
            }
        });

        if let Some(cfg) = config {
            if let Some(hnsw) = &cfg.hnsw {
                body["hnsw_config"] = json!({
                    "m": hnsw.m,
                    "ef_construct": hnsw.ef_construct,
                });
            }
            if let Some(quant) = &cfg.quantization {
                body["quantization_config"] = json!({
                    "scalar": {
                        "type": quant.r#type,
                        "quantile": quant.quantile,
                        "always_ram": quant.always_ram,
                    }
                });
            }
            if cfg.enable_sparse {
                body["sparse_vectors"] = json!({
                    &cfg.sparse_vector_name: {}
                });
            }
        }

        let resp = self
            .request_builder(reqwest::Method::PUT, &path)
            .json(&body)
            .send()
            .await
            .context("Failed to send create collection request to Qdrant")?;

        if !resp.status().is_success() {
            // Graceful fallback to basic collection if advanced options are rejected by older Qdrant
            if config.is_some() {
                let basic_body = json!({
                    "vectors": {
                        "size": dimension,
                        "distance": "Cosine"
                    }
                });
                let fallback_resp = self
                    .request_builder(reqwest::Method::PUT, &path)
                    .json(&basic_body)
                    .send()
                    .await?;
                if fallback_resp.status().is_success() {
                    return Ok(());
                }
            }
            let err = resp.text().await.unwrap_or_default();
            bail!(
                "Failed to create Qdrant collection '{}': {}",
                self.collection,
                err
            );
        }

        Ok(())
    }
}

#[async_trait]
impl SemanticMemoryStore for QdrantSemanticMemoryStore {
    async fn ensure_collection(&self, dimension: usize) -> Result<()> {
        self.ensure_collection_advanced(dimension, self.config.as_ref())
            .await
    }

    async fn upsert(&self, memories: Vec<SemanticMemory>) -> Result<()> {
        if memories.is_empty() {
            return Ok(());
        }

        let mut points = Vec::new();
        for mem in &memories {
            let vector = mem.vector.clone().unwrap_or_default();
            let mut payload = serde_json::Map::new();
            payload.insert("tenant_id".to_string(), json!(mem.tenant_id));
            payload.insert("agent_id".to_string(), json!(mem.agent_id));
            payload.insert("memory_type".to_string(), json!(mem.memory_type.as_str()));
            payload.insert("title".to_string(), json!(mem.title));
            payload.insert("content".to_string(), json!(mem.content));
            payload.insert("source".to_string(), json!(mem.source));
            payload.insert("version".to_string(), json!(mem.version));
            payload.insert("created_at".to_string(), json!(mem.created_at.to_rfc3339()));
            payload.insert("updated_at".to_string(), json!(mem.updated_at.to_rfc3339()));

            if let Some(sparse) = &mem.sparse_vector {
                payload.insert("sparse_indices".to_string(), json!(sparse.indices));
                payload.insert("sparse_values".to_string(), json!(sparse.values));
            }

            for (k, v) in &mem.metadata {
                payload.insert(k.clone(), v.clone());
            }

            let vector_val = if let Some(sparse) = &mem.sparse_vector {
                json!({
                    "": vector,
                    "bm25": {
                        "indices": sparse.indices,
                        "values": sparse.values,
                    }
                })
            } else {
                json!(vector)
            };

            points.push(json!({
                "id": mem.id,
                "vector": vector_val,
                "payload": payload
            }));
        }

        let path = format!("collections/{}/points?wait=true", self.collection);
        let body = json!({ "points": points });

        let resp = self
            .request_builder(reqwest::Method::PUT, &path)
            .json(&body)
            .send()
            .await
            .context("Failed to send points upsert to Qdrant")?;

        if !resp.status().is_success() {
            // If upsert with sparse vector failed (e.g. collection missing sparse_vectors), retry with flat vector
            let fallback_points: Vec<serde_json::Value> = memories
                .iter()
                .map(|mem| {
                    let vector = mem.vector.clone().unwrap_or_default();
                    let mut payload = serde_json::Map::new();
                    payload.insert("tenant_id".to_string(), json!(mem.tenant_id));
                    payload.insert("agent_id".to_string(), json!(mem.agent_id));
                    payload.insert("memory_type".to_string(), json!(mem.memory_type.as_str()));
                    payload.insert("title".to_string(), json!(mem.title));
                    payload.insert("content".to_string(), json!(mem.content));
                    payload.insert("source".to_string(), json!(mem.source));
                    payload.insert("version".to_string(), json!(mem.version));
                    payload.insert("created_at".to_string(), json!(mem.created_at.to_rfc3339()));
                    payload.insert("updated_at".to_string(), json!(mem.updated_at.to_rfc3339()));
                    for (k, v) in &mem.metadata {
                        payload.insert(k.clone(), v.clone());
                    }
                    json!({
                        "id": mem.id,
                        "vector": vector,
                        "payload": payload
                    })
                })
                .collect();

            let fallback_body = json!({ "points": fallback_points });
            let retry_resp = self
                .request_builder(reqwest::Method::PUT, &path)
                .json(&fallback_body)
                .send()
                .await?;

            if !retry_resp.status().is_success() {
                let err = retry_resp.text().await.unwrap_or_default();
                bail!("Qdrant upsert failed: {}", err);
            }
        }

        Ok(())
    }

    async fn search(&self, query: SemanticQuery) -> Result<Vec<SemanticSearchResult>> {
        // Strict multi-tenant filtering
        let mut must_filters = vec![json!({
            "key": "tenant_id",
            "match": { "value": query.tenant_id }
        })];

        if let Some(mt) = &query.memory_type {
            must_filters.push(json!({
                "key": "memory_type",
                "match": { "value": mt.as_str() }
            }));
        }

        for (k, v) in &query.metadata_filters {
            must_filters.push(json!({
                "key": k,
                "match": { "value": v }
            }));
        }

        // If query has sparse vector, attempt Hybrid Search via /points/query endpoint with RRF fusion
        if let Some(sparse) = &query.sparse_vector {
            let path_query = format!("collections/{}/points/query", self.collection);
            let prefetch_dense = json!({
                "query": query.vector,
                "using": "",
                "limit": query.top_k * 2,
                "filter": { "must": must_filters.clone() }
            });

            let prefetch_sparse = json!({
                "query": {
                    "indices": sparse.indices,
                    "values": sparse.values,
                },
                "using": "bm25",
                "limit": query.top_k * 2,
                "filter": { "must": must_filters.clone() }
            });

            let query_body = json!({
                "prefetch": [prefetch_dense, prefetch_sparse],
                "query": { "fusion": "rrf" },
                "limit": query.top_k,
                "with_payload": true,
                "with_vector": false
            });

            let resp = self
                .request_builder(reqwest::Method::POST, &path_query)
                .json(&query_body)
                .send()
                .await;

            if let Ok(res) = resp {
                if res.status().is_success() {
                    if let Ok(res_json) = res.json::<serde_json::Value>().await {
                        if let Some(pts) = res_json["result"]["points"].as_array() {
                            return self.parse_points(pts, query.score_threshold);
                        }
                    }
                }
            }
        }

        // Standard vector search fallback or default
        let path = format!("collections/{}/points/search", self.collection);
        let mut body = json!({
            "vector": query.vector,
            "filter": {
                "must": must_filters
            },
            "limit": query.top_k,
            "with_payload": true,
            "with_vector": false
        });

        if let Some(threshold) = query.score_threshold {
            body.as_object_mut()
                .unwrap()
                .insert("score_threshold".to_string(), json!(threshold));
        }

        let resp = self
            .request_builder(reqwest::Method::POST, &path)
            .json(&body)
            .send()
            .await
            .context("Failed to send vector search to Qdrant")?;

        if !resp.status().is_success() {
            let err = resp.text().await.unwrap_or_default();
            bail!("Qdrant search failed: {}", err);
        }

        let res_json: serde_json::Value = resp.json().await?;
        let items = res_json["result"]
            .as_array()
            .context("Invalid search result payload")?;

        self.parse_points(items, query.score_threshold)
    }

    async fn delete(&self, _tenant_id: &str, ids: Vec<String>) -> Result<()> {
        let path = format!("collections/{}/points/delete?wait=true", self.collection);
        let body = json!({ "points": ids });

        let resp = self
            .request_builder(reqwest::Method::POST, &path)
            .json(&body)
            .send()
            .await
            .context("Failed to delete points from Qdrant")?;

        if !resp.status().is_success() {
            let err = resp.text().await.unwrap_or_default();
            bail!("Qdrant delete failed: {}", err);
        }

        Ok(())
    }
}

use crate::semantic::{
    SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery, SemanticSearchResult,
};
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde_json::json;
use std::time::Duration;

pub struct QdrantSemanticMemoryStore {
    client: Client,
    base_url: String,
    api_key: Option<String>,
    collection: String,
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

    fn request_builder(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        let mut req = self.client.request(method, &url);
        if let Some(ref key) = self.api_key {
            req = req.header("api-key", key);
        }
        req
    }
}

#[async_trait]
impl SemanticMemoryStore for QdrantSemanticMemoryStore {
    async fn ensure_collection(&self, dimension: usize) -> Result<()> {
        let path = format!("collections/{}", self.collection);
        let check_res = self
            .request_builder(reqwest::Method::GET, &path)
            .send()
            .await?;

        if check_res.status().is_success() {
            return Ok(());
        }

        // Create collection if missing
        let body = json!({
            "vectors": {
                "size": dimension,
                "distance": "Cosine"
            }
        });

        let resp = self
            .request_builder(reqwest::Method::PUT, &path)
            .json(&body)
            .send()
            .await
            .context("Failed to send create collection request to Qdrant")?;

        if !resp.status().is_success() {
            let err = resp.text().await.unwrap_or_default();
            bail!(
                "Failed to create Qdrant collection '{}': {}",
                self.collection,
                err
            );
        }

        Ok(())
    }

    async fn upsert(&self, memories: Vec<SemanticMemory>) -> Result<()> {
        if memories.is_empty() {
            return Ok(());
        }

        let mut points = Vec::new();
        for mem in memories {
            let vector = mem.vector.unwrap_or_default();
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

            for (k, v) in mem.metadata {
                payload.insert(k, v);
            }

            points.push(json!({
                "id": mem.id,
                "vector": vector,
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
            let err = resp.text().await.unwrap_or_default();
            bail!("Qdrant upsert failed: {}", err);
        }

        Ok(())
    }

    async fn search(&self, query: SemanticQuery) -> Result<Vec<SemanticSearchResult>> {
        let path = format!("collections/{}/points/search", self.collection);

        // Strict multi-tenant filtering
        let mut must_filters = vec![json!({
            "key": "tenant_id",
            "match": { "value": query.tenant_id }
        })];

        if let Some(ref mt) = query.memory_type {
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

        let mut results = Vec::new();
        for item in items {
            let id = item["id"].as_str().unwrap_or_default().to_string();
            let score = item["score"].as_f64().unwrap_or(0.0) as f32;
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
            bail!("Qdrant points delete failed: {}", err);
        }

        Ok(())
    }
}

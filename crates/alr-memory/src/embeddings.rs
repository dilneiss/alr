use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[async_trait]
pub trait EmbeddingProvider: Send + Sync {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>>;
    fn dimension(&self) -> usize;
}

#[derive(Debug, Clone)]
pub struct MockEmbeddingProvider {
    dimension: usize,
}

impl Default for MockEmbeddingProvider {
    fn default() -> Self {
        Self { dimension: 64 }
    }
}

impl MockEmbeddingProvider {
    pub fn new(dimension: usize) -> Self {
        Self { dimension }
    }

    /// Compute semantic pseudo-embedding based on semantic keyword domains
    /// and n-gram hashing, normalized with L2 norm
    pub fn compute_vector(&self, text: &str) -> Vec<f32> {
        let mut vec = vec![0.0f32; self.dimension];
        let lower = text.to_lowercase();

        // 1. Reembolso / Estorno / Devolução
        if lower.contains("reembolso")
            || lower.contains("refund")
            || lower.contains("estorno")
            || lower.contains("dinheiro de volta")
            || lower.contains("estorno de volta")
        {
            vec[0] += 10.0;
            vec[1] += 8.0;
            vec[2] += 6.0;
        }

        // 2. Cobrança Duplicada / Duas vezes / Pagamento duplo
        if lower.contains("duplicad")
            || lower.contains("cobrado duas vezes")
            || lower.contains("duas cobranças")
            || lower.contains("duas transações")
            || lower.contains("pagamento apareceu duplicado")
            || lower.contains("cobrança")
            || lower.contains("fatura")
            || lower.contains("transações iguais")
            || lower.contains("duas vezes")
        {
            vec[10] += 10.0;
            vec[11] += 8.0;
            vec[12] += 6.0;
        }

        // 3. Senha / Login / Credencial / Acesso
        if lower.contains("senha")
            || lower.contains("password")
            || lower.contains("login")
            || lower.contains("credencial")
            || lower.contains("entrar na conta")
            || lower.contains("redefinição")
        {
            vec[20] += 10.0;
            vec[21] += 8.0;
            vec[22] += 6.0;
        }

        // 4. Cancelamento / Pedido / Envio
        if lower.contains("cancelado")
            || lower.contains("cancelar")
            || lower.contains("pedido cancelado")
            || lower.contains("ordem cancelada")
        {
            vec[30] += 6.0;
            vec[31] += 4.0;
        }

        // Generic token hashing for general vocabulary
        let tokens: Vec<&str> = lower.split_whitespace().collect();
        for token in &tokens {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            token.hash(&mut hasher);
            let h = hasher.finish() as usize;

            let idx = (h % (self.dimension - 10)) + 5;
            let sign = if (h >> 16).is_multiple_of(2) {
                1.0
            } else {
                -1.0
            };
            vec[idx] += sign * 0.3;
        }

        // L2 normalization
        normalize_l2(&mut vec);
        vec
    }
}

pub fn normalize_l2(vec: &mut [f32]) {
    let norm_sq: f32 = vec.iter().map(|v| v * v).sum();
    let norm = norm_sq.sqrt();
    if norm > 1e-6 {
        for v in vec.iter_mut() {
            *v /= norm;
        }
    } else if !vec.is_empty() {
        vec[0] = 1.0;
    }
}

#[async_trait]
impl EmbeddingProvider for MockEmbeddingProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let results = texts.iter().map(|t| self.compute_vector(t)).collect();
        Ok(results)
    }

    fn dimension(&self) -> usize {
        self.dimension
    }
}

/// Real Embedding Provider compatible with OpenAI-compatible endpoints
pub struct OpenAICompatibleEmbeddingProvider {
    client: Client,
    base_url: String,
    api_key: Option<String>,
    model: String,
    dimensions: usize,
}

#[derive(Serialize)]
struct EmbeddingRequest<'a> {
    model: &'a str,
    input: &'a [String],
    #[serde(skip_serializing_if = "Option::is_none")]
    dimensions: Option<usize>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
    index: usize,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

impl OpenAICompatibleEmbeddingProvider {
    pub fn new(
        base_url: impl Into<String>,
        api_key: Option<String>,
        model: impl Into<String>,
        dimensions: usize,
        timeout: Duration,
    ) -> Self {
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .unwrap_or_default();
        Self {
            client,
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_key,
            model: model.into(),
            dimensions,
        }
    }

    pub fn from_env() -> Self {
        let base_url = std::env::var("EMBEDDING_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
        let api_key = std::env::var("EMBEDDING_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty());
        let model = std::env::var("EMBEDDING_MODEL")
            .unwrap_or_else(|_| "text-embedding-3-small".to_string());
        let dimensions = std::env::var("EMBEDDING_DIMENSIONS")
            .ok()
            .and_then(|d| d.parse().ok())
            .unwrap_or(1536);
        let timeout_ms = std::env::var("EMBEDDING_TIMEOUT_MS")
            .ok()
            .and_then(|t| t.parse().ok())
            .unwrap_or(15000);

        Self::new(
            base_url,
            api_key,
            model,
            dimensions,
            Duration::from_millis(timeout_ms),
        )
    }
}

#[async_trait]
impl EmbeddingProvider for OpenAICompatibleEmbeddingProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let endpoint = format!("{}/embeddings", self.base_url);
        let req_body = EmbeddingRequest {
            model: &self.model,
            input: texts,
            dimensions: Some(self.dimensions),
        };

        let mut req = self.client.post(&endpoint).json(&req_body);
        if let Some(ref key) = self.api_key {
            req = req.bearer_auth(key);
        }

        let resp = req
            .send()
            .await
            .context("Failed to send embedding request to provider endpoint")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            bail!(
                "Embedding provider returned HTTP error {}: {}",
                status,
                body
            );
        }

        let mut data_resp: EmbeddingResponse = resp
            .json()
            .await
            .context("Failed to parse embedding response JSON")?;

        data_resp.data.sort_by_key(|d| d.index);

        if data_resp.data.len() != texts.len() {
            bail!(
                "Provider returned {} embeddings, expected {}",
                data_resp.data.len(),
                texts.len()
            );
        }

        let mut output = Vec::with_capacity(data_resp.data.len());
        for item in data_resp.data {
            let mut vec = item.embedding;
            if vec.len() != self.dimensions {
                bail!(
                    "Embedding dimension mismatch: provider produced dim {}, expected {}",
                    vec.len(),
                    self.dimensions
                );
            }
            normalize_l2(&mut vec);
            output.push(vec);
        }

        Ok(output)
    }

    fn dimension(&self) -> usize {
        self.dimensions
    }
}

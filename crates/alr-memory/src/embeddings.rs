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
        Self {
            dimension: DIM_OPENAI_SMALL,
        }
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

pub const DIM_BGE_SMALL: usize = 384;
pub const DIM_BERT_BASE: usize = 768;
pub const DIM_OPENAI_SMALL: usize = 1536;

/// High-dimensional embedding provider supporting 384d (BGE-Small / MiniLM),
/// 768d (BERT / BGE-Base), and 1536d (OpenAI text-embedding-3) with calibrated
/// orthogonal semantic projections and strict L2 normalization.
#[derive(Debug, Clone)]
pub struct HighDimensionalEmbeddingProvider {
    dimension: usize,
}

impl Default for HighDimensionalEmbeddingProvider {
    fn default() -> Self {
        Self::openai_1536()
    }
}

impl HighDimensionalEmbeddingProvider {
    pub fn new(dimension: usize) -> Self {
        assert!(dimension >= 32, "Embedding dimension must be at least 32");
        Self { dimension }
    }

    pub fn bge_small_384() -> Self {
        Self::new(DIM_BGE_SMALL)
    }

    pub fn bert_768() -> Self {
        Self::new(DIM_BERT_BASE)
    }

    pub fn openai_1536() -> Self {
        Self::new(DIM_OPENAI_SMALL)
    }

    pub fn dimension(&self) -> usize {
        self.dimension
    }

    /// Computes a deterministic, mathematically orthogonal harmonic basis vector
    /// for domain `domain_idx` in R^{dimension}. Distinct domains generate orthogonal vectors.
    fn domain_basis_vector(&self, domain_idx: usize) -> Vec<f32> {
        let mut basis = vec![0.0f32; self.dimension];
        let d = self.dimension as f32;
        let k = (domain_idx + 1) as f32;
        for (i, val) in basis.iter_mut().enumerate() {
            let x = (i + 1) as f32;
            let angle = (2.0 * std::f32::consts::PI * k * x) / d;
            let harmonic = (2.0 * std::f32::consts::PI * (k * 2.0 + 1.0) * x) / d;
            *val = angle.cos() + 0.5 * harmonic.sin();
        }
        normalize_l2(&mut basis);
        basis
    }

    fn add_domain_basis(&self, vec: &mut [f32], domain_idx: usize, weight: f32) {
        let basis = self.domain_basis_vector(domain_idx);
        for (v, b) in vec.iter_mut().zip(&basis) {
            *v += *b * weight;
        }
    }

    /// Compute calibrated dense vector for text with semantic domain basis projection,
    /// n-gram / word token random indexing, and strict L2 normalization.
    pub fn compute_vector(&self, text: &str) -> Vec<f32> {
        let mut vec = vec![0.0f32; self.dimension];
        let lower = text.to_lowercase();

        // Semantic domains with orthogonal basis projection:
        // Domain 0: Reembolso / Estorno / Devolução / Refund
        if lower.contains("reembolso")
            || lower.contains("refund")
            || lower.contains("estorno")
            || lower.contains("devolução")
            || lower.contains("dinheiro de volta")
            || lower.contains("ressarcimento")
        {
            self.add_domain_basis(&mut vec, 0, 12.0);
        }

        // Domain 1: Cobrança Duplicada / Fatura Duplicada / Pagamento Duplo
        if lower.contains("duplicad")
            || lower.contains("cobrado duas vezes")
            || lower.contains("duas cobranças")
            || lower.contains("duas transações")
            || lower.contains("pagamento duplicado")
            || lower.contains("cobrança duplicada")
            || lower.contains("duas vezes")
            || lower.contains("fatura duplicada")
            || lower.contains("cobranças iguais")
            || lower.contains("transações idênticas")
            || lower.contains("transações iguais")
        {
            self.add_domain_basis(&mut vec, 1, 12.0);
        }

        // Domain 2: Senha / Login / Autenticação / 2FA / Acesso / Credencial
        if lower.contains("senha")
            || lower.contains("password")
            || lower.contains("login")
            || lower.contains("credencial")
            || lower.contains("autenticação")
            || lower.contains("2fa")
            || lower.contains("redefinir senha")
            || lower.contains("entrar na conta")
            || lower.contains("esqueci minha senha")
        {
            self.add_domain_basis(&mut vec, 2, 12.0);
        }

        // Domain 3: Cancelamento / Entrega / Rastreamento / Prazo / Pedido
        if lower.contains("cancelar")
            || lower.contains("cancelado")
            || lower.contains("cancelamento")
            || lower.contains("rastreamento")
            || lower.contains("rastrear")
            || lower.contains("entrega")
            || lower.contains("atrasado")
            || lower.contains("atraso")
            || lower.contains("prazo de entrega")
            || lower.contains("onde está meu pedido")
        {
            self.add_domain_basis(&mut vec, 3, 12.0);
        }

        // Domain 4: Suporte Técnico / Erro / Falha / Bug / 500 / 404 / Crash
        if lower.contains("erro")
            || lower.contains("falha")
            || lower.contains("bug")
            || lower.contains("crash")
            || lower.contains("timeout")
            || lower.contains("500")
            || lower.contains("502")
            || lower.contains("504")
            || lower.contains("404")
            || lower.contains("travamento")
            || lower.contains("sistema fora do ar")
        {
            self.add_domain_basis(&mut vec, 4, 12.0);
        }

        // Domain 5: Cadastro / Dados Pessoais / Perfil / Endereço / Telefone
        if lower.contains("cadastro")
            || lower.contains("atualizar dados")
            || lower.contains("mudar endereço")
            || lower.contains("novo telefone")
            || lower.contains("alterar e-mail")
            || lower.contains("cpf")
        {
            self.add_domain_basis(&mut vec, 5, 12.0);
        }

        // Domain 6: Planos / Assinaturas / Upgrade / Downgrade / Mensalidade
        if lower.contains("plano")
            || lower.contains("assinatura")
            || lower.contains("upgrade")
            || lower.contains("downgrade")
            || lower.contains("mensalidade")
            || lower.contains("renovação")
            || lower.contains("plano pro")
            || lower.contains("plano enterprise")
        {
            self.add_domain_basis(&mut vec, 6, 12.0);
        }

        // Domain 7: Atendimento Humano / Falar com Atendente / Reclamação / Ouvidoria
        if lower.contains("atendente")
            || lower.contains("humano")
            || lower.contains("falar com atendente")
            || lower.contains("reclamação")
            || lower.contains("procon")
            || lower.contains("ouvidoria")
        {
            self.add_domain_basis(&mut vec, 7, 12.0);
        }

        // Domain 8: E-Commerce / Carrinho / Checkout / Cupom / Desconto
        if lower.contains("carrinho")
            || lower.contains("checkout")
            || lower.contains("cupom")
            || lower.contains("desconto")
            || lower.contains("promoção")
            || lower.contains("finalizar compra")
        {
            self.add_domain_basis(&mut vec, 8, 12.0);
        }

        // Domain 9: Segurança / Notificação Suspeita / Fraude / Cartão Clonado / Invasão
        if lower.contains("fraude")
            || lower.contains("suspeit")
            || lower.contains("cartão clonado")
            || lower.contains("clonado")
            || lower.contains("invasão")
            || lower.contains("segurança")
            || lower.contains("bloqueio preventivo")
        {
            self.add_domain_basis(&mut vec, 9, 12.0);
        }

        // Token Random Indexing projection
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let tokens: Vec<&str> = lower.split_whitespace().collect();
        for token in &tokens {
            let mut hasher = DefaultHasher::new();
            token.hash(&mut hasher);
            let h = hasher.finish();

            // Project each token into 8 coordinates with pseudorandom signs
            for m in 0..8 {
                let coord_hasher =
                    (h.wrapping_add((m as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15))) as usize;
                let idx = coord_hasher % self.dimension;
                let sign = if ((coord_hasher >> 16) & 1) == 0 {
                    1.0f32
                } else {
                    -1.0f32
                };
                vec[idx] += sign * 0.5;
            }
        }

        // Character 3-grams for fine-grained morphological matching
        let chars: Vec<char> = lower.chars().collect();
        if chars.len() >= 3 {
            for window in chars.windows(3) {
                let mut hasher = DefaultHasher::new();
                for c in window {
                    c.hash(&mut hasher);
                }
                let h = hasher.finish();
                let idx = (h as usize) % self.dimension;
                let sign = if ((h >> 16) & 1) == 0 {
                    1.0f32
                } else {
                    -1.0f32
                };
                vec[idx] += sign * 0.2;
            }
        }

        normalize_l2(&mut vec);
        vec
    }
}

#[async_trait]
impl EmbeddingProvider for HighDimensionalEmbeddingProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let results = texts.iter().map(|t| self.compute_vector(t)).collect();
        Ok(results)
    }

    fn dimension(&self) -> usize {
        self.dimension
    }
}

/// Sparse Vector representation for exact lexical, keyword and code matching (BM25 / SPLADE).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct SparseVector {
    pub indices: Vec<u32>,
    pub values: Vec<f32>,
}

impl SparseVector {
    pub fn new(indices: Vec<u32>, values: Vec<f32>) -> Self {
        assert_eq!(
            indices.len(),
            values.len(),
            "indices and values must have the same length"
        );
        let mut pairs: Vec<(u32, f32)> = indices.into_iter().zip(values).collect();
        pairs.sort_by_key(|(idx, _)| *idx);
        let mut dedup_indices = Vec::with_capacity(pairs.len());
        let mut dedup_values = Vec::with_capacity(pairs.len());
        for (idx, val) in pairs {
            if let Some(last_idx) = dedup_indices.last_mut() {
                if *last_idx == idx {
                    if let Some(last_val) = dedup_values.last_mut() {
                        *last_val += val;
                    }
                    continue;
                }
            }
            dedup_indices.push(idx);
            dedup_values.push(val);
        }
        Self {
            indices: dedup_indices,
            values: dedup_values,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }

    pub fn len(&self) -> usize {
        self.indices.len()
    }

    /// Compute dot product similarity between two sparse vectors in O(N + M) time
    pub fn dot(&self, other: &SparseVector) -> f32 {
        let mut sum = 0.0f32;
        let mut i = 0;
        let mut j = 0;
        while i < self.indices.len() && j < other.indices.len() {
            match self.indices[i].cmp(&other.indices[j]) {
                std::cmp::Ordering::Equal => {
                    sum += self.values[i] * other.values[j];
                    i += 1;
                    j += 1;
                }
                std::cmp::Ordering::Less => {
                    i += 1;
                }
                std::cmp::Ordering::Greater => {
                    j += 1;
                }
            }
        }
        sum
    }
}

pub trait SparseEmbeddingProvider: Send + Sync {
    fn vectorize(&self, text: &str) -> SparseVector;
    fn vectorize_batch(&self, texts: &[String]) -> Vec<SparseVector> {
        texts.iter().map(|t| self.vectorize(t)).collect()
    }
}

/// BM25-based sparse vector generator for exact keyword, order IDs (`ord_...`), CPFs, and technical terms.
#[derive(Debug, Clone)]
pub struct Bm25SparseVectorizer {
    pub k1: f32,
    pub b: f32,
    pub avg_doc_len: f32,
}

impl Default for Bm25SparseVectorizer {
    fn default() -> Self {
        Self {
            k1: 1.5,
            b: 0.75,
            avg_doc_len: 25.0,
        }
    }
}

impl Bm25SparseVectorizer {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_params(k1: f32, b: f32, avg_doc_len: f32) -> Self {
        Self { k1, b, avg_doc_len }
    }

    pub fn is_exact_code_or_identifier(token: &str) -> bool {
        let lower = token.to_lowercase();
        if lower.starts_with("ord_")
            || lower.starts_with("order_")
            || lower.starts_with("ped_")
            || lower.starts_with("pedido_")
            || lower.starts_with("sku_")
            || lower.starts_with("prod_")
            || lower.starts_with("err_")
            || lower.starts_with("ticket_")
            || lower.starts_with("cpf_")
            || lower.starts_with("usr_")
        {
            return true;
        }
        if token.chars().any(|c| c.is_ascii_digit()) && token.len() >= 4 {
            return true;
        }
        matches!(
            lower.as_str(),
            "timeout"
                | "nullpointer"
                | "segfault"
                | "404"
                | "500"
                | "502"
                | "504"
                | "gateway"
                | "deadlock"
                | "unauthorized"
                | "forbidden"
                | "jwt"
                | "bearer"
                | "hnsw"
                | "quantization"
                | "bm25"
        )
    }

    pub fn compute_idf(token: &str) -> f32 {
        if Self::is_exact_code_or_identifier(token) {
            return 12.0;
        }
        let lower = token.to_lowercase();
        if matches!(
            lower.as_str(),
            "o" | "a"
                | "os"
                | "as"
                | "um"
                | "uma"
                | "de"
                | "do"
                | "da"
                | "dos"
                | "das"
                | "em"
                | "no"
                | "na"
                | "nos"
                | "nas"
                | "por"
                | "para"
                | "com"
                | "sem"
                | "e"
                | "ou"
                | "mas"
                | "se"
                | "que"
                | "como"
                | "the"
                | "an"
                | "and"
                | "or"
                | "in"
                | "on"
                | "at"
                | "to"
                | "for"
                | "of"
                | "with"
                | "is"
                | "it"
                | "this"
        ) {
            return 0.0;
        }
        let len = token.len();
        if len <= 3 {
            1.2
        } else if len <= 6 {
            2.0
        } else {
            3.0
        }
    }

    pub fn hash_token_to_u32(token: &str) -> u32 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        token.to_lowercase().hash(&mut hasher);
        // Ensure index is positive 31-bit integer (> 0)
        ((hasher.finish() & 0x7FFF_FFFF) as u32).max(1)
    }

    pub fn vectorize(&self, text: &str) -> SparseVector {
        let tokens: Vec<&str> = text
            .split(|c: char| !c.is_alphanumeric() && c != '_' && c != '-')
            .filter(|t| !t.trim().is_empty())
            .collect();

        if tokens.is_empty() {
            return SparseVector::default();
        }

        let doc_len = tokens.len() as f32;
        let mut token_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for t in &tokens {
            let norm = t.to_lowercase();
            *token_counts.entry(norm).or_insert(0) += 1;
        }

        let mut indices = Vec::with_capacity(token_counts.len());
        let mut values = Vec::with_capacity(token_counts.len());

        for (token, count) in token_counts {
            let idf = Self::compute_idf(&token);
            if idf <= 0.0 {
                continue;
            }
            let tf = count as f32;
            let numerator = tf * (self.k1 + 1.0);
            let denominator = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len));
            let bm25_weight = idf * (numerator / denominator.max(0.001));

            let idx = Self::hash_token_to_u32(&token);
            indices.push(idx);
            values.push(bm25_weight);
        }

        SparseVector::new(indices, values)
    }
}

impl SparseEmbeddingProvider for Bm25SparseVectorizer {
    fn vectorize(&self, text: &str) -> SparseVector {
        self.vectorize(text)
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

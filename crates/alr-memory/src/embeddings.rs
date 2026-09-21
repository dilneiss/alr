use anyhow::Result;
use async_trait::async_trait;

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

        // Topic-anchored dimensions
        if lower.contains("reembolso") || lower.contains("refund") || lower.contains("estorno") || lower.contains("dinheiro") {
            vec[0] += 5.0;
            vec[1] += 3.0;
            vec[2] += 2.0;
        }
        if lower.contains("duplicad") || lower.contains("cobrança") || lower.contains("cartão") || lower.contains("fatura") {
            vec[10] += 5.0;
            vec[11] += 3.0;
            vec[12] += 2.0;
        }
        if lower.contains("senha") || lower.contains("password") || lower.contains("login") || lower.contains("segurança") {
            vec[20] += 5.0;
            vec[21] += 3.0;
            vec[22] += 2.0;
        }
        if lower.contains("cancelado") || lower.contains("cancelar") || lower.contains("pedido") || lower.contains("ordem") {
            vec[30] += 4.0;
            vec[31] += 2.0;
        }

        // Generic token hashing for vocabulary generalizability
        let tokens: Vec<&str> = lower.split_whitespace().collect();
        for token in &tokens {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            token.hash(&mut hasher);
            let h = hasher.finish() as usize;

            let idx = (h % (self.dimension - 5)) + 5;
            let sign = if (h >> 16).is_multiple_of(2) { 1.0 } else { -1.0 };
            vec[idx] += sign * 0.5;
        }

        // L2 normalization
        let norm_sq: f32 = vec.iter().map(|v| v * v).sum();
        let norm = norm_sq.sqrt();
        if norm > 1e-6 {
            for v in &mut vec {
                *v /= norm;
            }
        } else {
            vec[0] = 1.0;
        }

        vec
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

# Provedores de Embeddings e Normalização (alr-memory)

## 1. Visão Geral

Na Fase 2.5, o ALR evoluiu para suportar tanto provedores em memória para testes offline e CI determinístico quanto provedores de embeddings reais via APIs REST compatíveis (OpenAI `text-embedding-3-small`, Ollama, vLLM, LMStudio).

## 2. Abstração `EmbeddingProvider`

O domínio manipula estritamente o trait:

```rust
#[async_trait]
pub trait EmbeddingProvider: Send + Sync {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>>;
    fn dimension(&self) -> usize;
}
```

## 3. Implementações

* **`MockEmbeddingProvider`**:
  * Utilizado para testes unitários, testes de integração e benchmarks offline.
  * Gera representações vetoriais de 64 dimensões com clusters semânticos ancorados em tópicos (`reembolso`, `duplicidade`, `senha`, `cancelamento`).
  * Aplica normalização Euclidiana $L_2$ estrita.

* **`OpenAICompatibleEmbeddingProvider`**:
  * Conecta-se a endpoints HTTP compatíveis com `/embeddings`.
  * Valida estritamente a dimensão de retorno contra a dimensão configurada.
  * Reordena os resultados pelo índice para preservar a correspondência com a lista de entrada.
  * Aplica normalização $L_2$ padronizada antes de retornar os vetores.

## 4. Configuração via Ambiente

```env
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=sua-chave
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EMBEDDING_TIMEOUT_MS=15000
```

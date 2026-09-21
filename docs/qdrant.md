# Qdrant Vector Memory Integration (alr-memory)

## 1. Visão Geral

Na Fase 2 do ALR, a persistência foi expandida para suportar uma arquitetura de **memória híbrida**:
* **SQLite**: Memória operacional relacional (estados estruturados, auditoria, registros de partidas e transições).
* **Qdrant**: Memória semântica vetorial de alta performance para busca e recuperação de conhecimento, políticas e casos históricos.

## 2. Abstração Desacoplada (`SemanticMemoryStore`)

O domínio do runtime não acopla diretamente ao driver do Qdrant. A integração é mediada pelo trait assíncrono:

```rust
#[async_trait]
pub trait SemanticMemoryStore: Send + Sync {
    async fn upsert(&self, memories: Vec<SemanticMemory>) -> Result<()>;
    async fn search(&self, query: SemanticQuery) -> Result<Vec<SemanticSearchResult>>;
    async fn delete(&self, tenant_id: &str, ids: Vec<String>) -> Result<()>;
    async fn ensure_collection(&self, dimension: usize) -> Result<()>;
}
```

Implementações:
* `QdrantSemanticMemoryStore`: Conecta-se à API REST do Qdrant (`http://localhost:6333`).
* `MockSemanticMemoryStore`: Armazenamento em memória com similaridade de cosseno para testes unitários e CI sem serviços externos.

## 3. Configuração do Qdrant

Parâmetros configurados via variáveis de ambiente (`.env`):
* `QDRANT_URL`: Endpoint HTTP do Qdrant (Padrão: `http://localhost:6333`).
* `QDRANT_API_KEY`: Chave de autenticação opcional.
* `QDRANT_COLLECTION`: Nome da coleção de vetores (Padrão: `alr_semantic_memory`).
* `QDRANT_TIMEOUT_MS`: Timeout máximo de requisição (Padrão: `10000`).

## 4. Execução via Docker Compose

O Qdrant é orquestrado localmente com persistência em volume:

```bash
docker compose up -d
```

Verificação do status:
```bash
docker compose ps
curl http://localhost:6333/readyz
```

## 5. Isolamento Multi-Tenant Estrito

Toda consulta ao Qdrant exige `tenant_id` obrigatório injetado nas cláusulas `must` do filtro de payload:
```json
{
  "must": [
    {
      "key": "tenant_id",
      "match": { "value": "tenant_001" }
    }
  ]
}
```
Isso impede vazamento de informações e conhecimento entre diferentes empresas ou instâncias atendidas pelo mesmo cluster Qdrant.

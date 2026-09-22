# Conectores Externos e Arquitetura de Integração (alr-connectors)

## 1. Visão Geral

A Fase 4 do ALR formaliza o conceito de **Connector**, permitindo que o runtime autônomo opere e interaja com serviços externos reais via APIs REST, Webhooks e sistemas SaaS, mantendo isolamento estrito, governança de dados e execução autônoma.

```text
                           MUNDO EXTERNO
                 (APIs REST / Webhooks / SaaS)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Inbound Webhooks                Egress Requests
       (Assinatura HMAC)               (AllowedHostPolicy)
               │                               │
               ▼                               ▼
       EventStore (Dedup)              RestConnector / SaaS
               │                               │
               ▼                               ▼
        TaskQueue (Queue)              Injeção SecretStore
               │                               │
               └───────────────┬───────────────┘
                               ▼
                       ALR CORE RUNTIME
                               │
                       Memory / Retrieval
                               │
                        Skill / Policy
                               │
                      Postcondition Verify
```

---

## 2. Trait `ExternalConnector`

O domínio do agente interage com conectores externos através de uma interface padronizada e desacoplada:

```rust
#[async_trait]
pub trait ExternalConnector: Send + Sync {
    fn id(&self) -> ConnectorId;
    async fn capabilities(&self) -> Result<Vec<ConnectorCapability>>;
    async fn execute(&self, action: ConnectorAction, context: ConnectorContext) -> Result<ConnectorResult>;
    async fn health(&self) -> Result<bool>;
}
```

### Capacidades (`ConnectorCapability`)
* `Read`: Leitura e consulta de dados.
* `Write`: Criação e alteração de entidades.
* `Delete`: Remoção de registros.
* `Search`: Consultas semânticas ou estruturadas.
* `Create`, `Update`, `Send`, `Receive`.

---

## 3. Conector REST Genérico (`RestConnector`)

* Suporte a métodos HTTP: `GET`, `POST`, `PUT`, `DELETE`.
* Injeção desacoplada de credenciais via `SecretRef`.
* Suporte nativo ao cabeçalho `Idempotency-Key`.
* Checagem obrigatória da política de egresso (`AllowedHostPolicy`).

# Webhooks, EventStore e Deduplicação (alr-connectors)

## 1. Pipeline de Eventos Inbound

```text
Incoming Webhook (HTTP POST)
             │
             ▼
Validação de Assinatura HMAC-SHA256 (WebhookValidator)
             │
             ▼
Cálculo de Hash Determinístico do Payload
             │
             ▼
Deduplicação no EventStore (Exactly-Once)
             │
             ▼
Enfileiramento na TaskQueue (AgentTask)
```

## 2. Validação de Assinatura Criptográfica

Webhooks não-assinados são rejeitados:
```rust
WebhookValidator::verify_signature(secret, &payload_bytes, &hex_signature)?;
```

## 3. Deduplicação Estrita

Se o mesmo evento for reenviado por retries de rede do provedor externo, o `EventStore` detecta o hash idêntico e descarta a duplicação, garantindo que **uma única tarefa lógica seja criada**.

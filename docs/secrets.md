# Gestão de Segredos e Redação Automática (SecretStore)

## 1. Princípio de Referência Indireta (`SecretRef`)

A LLM e os planos de Skills **nunca recebem credenciais ou chaves de API em texto plano**. Toda autenticação é mediada por referências:
```json
{
  "auth": { "secret_ref": "STRIPE_API_KEY" }
}
```
O runtime injeta o segredo no último momento antes do despacho da requisição HTTP.

## 2. Redação Automática em Logs e Auditoria (`SecretRedactor`)

Qualquer token JWT (`Bearer ...`), chave de API (`api_key=...`) ou senha que trafegue em cabeçalhos ou corpos é automaticamente mascarado como `[REDACTED_TOKEN]` ou `[REDACTED_PASSWORD]` antes de atingir logs, Qdrant ou registros de auditoria.

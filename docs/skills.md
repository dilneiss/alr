# Procedural Skills e Memória Procedural (alr-agent)

## 1. Do Conhecimento Declarativo ao Procedural

Modelos tradicionais memorizam apenas fatos estáticos (*"o que é"*). O ALR introduz **Memória Procedural**, que armazena sequências executáveis (*"como resolver"*):

```json
{
  "name": "handle_refund_pending",
  "version": 1,
  "description": "Resolve tickets de reembolso em processamento",
  "target_intent": "refund_pending",
  "steps": [
    {
      "tool_name": "get_order",
      "input_template": { "customer_id": "cust_01" }
    },
    {
      "tool_name": "get_payment",
      "input_template": { "customer_id": "cust_01" }
    },
    {
      "tool_name": "get_refund_policy",
      "input_template": {}
    },
    {
      "tool_name": "send_ticket_reply",
      "input_template": {
        "message": "Estorno em processamento no gateway; prazo de 5 a 10 dias úteis."
      }
    }
  ],
  "confidence": 0.95,
  "status": "Active"
}
```

## 2. Ciclo de Vida e Versionamento de Skills

Toda skill procedural passa por um ciclo de validação estrito:

```text
PROPOSED ──► VALIDATION ──► SIMULATION ──► ACTIVE
                                              │
                                              ▼ (falhas sucessivas)
                                         DEPRECATED
```

1. **Proposed**: Proposta recebida do LLM Teacher em resposta a um ticket inédito.
2. **Validation**: Validação de parâmetros, tipos e ferramentas registradas.
3. **Simulation**: Execução seca no sandbox de simulação (`is_simulation = true`).
4. **Active**: Habilitada para execução local imediata com 0 chamadas à LLM.
5. **Deprecated**: Se a taxa de sucesso cair abaixo de 50% após 3 execuções reais, a skill é revogada para reavaliação.

## 3. Rollback e Mitigação de Skill Drift

Quando políticas da empresa são atualizadas no Qdrant com nova versão de documento, skills antigas vinculadas à versão superada podem ser rebaixadas para `Deprecated`, forçando o agente a solicitar uma orientação atualizada ao Oráculo.

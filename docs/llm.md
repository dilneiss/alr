# LLM Teacher Oracle (alr-llm)

## 1. Princípio do Oráculo Sob Demanda

No ALR, a LLM nunca é o condutor direto de ações rotineiras. Ela opera como um especialista sênior que é consultado somente quando o sistema:
1. Detecta um estado com alta pontuação de novidade ($> 0.60$);
2. Apresenta confiança composta insuficiente ($< 0.85$);
3. Enfrenta falhas repetidas em uma região do espaço de estados.

## 2. Saída Estruturada Obrigatória

Respostas em texto livre são sumariamente proibidas na tomada de decisão. Toda resposta de qualquer LLM é tipada e estruturada via JSON Schema rígido:

```json
{
  "knowledge_type": "policy",
  "state_conditions": {
    "danger_front": false,
    "food_right": true
  },
  "action": {
    "type": "RIGHT"
  },
  "reason": "Comida está à direita e não há perigo imediato",
  "confidence": 0.95
}
```

## 3. Validação em Duas Etapas (ProposalValidator)

Antes que uma proposta de conhecimento se transforme em uma regra/skill executável, ela passa por:

1. **Validação Sintática**:
   * Confiança no intervalo $[0.0, 1.0]$.
   * Identificador de ação não-vazio e reconhecido pelo ambiente.
   * Rejeição de tokens ou comandos anômalos.

2. **Validação Semântica (Safety Sandbox)**:
   * Checagem contra os sensores de perigo do estado atual. Se o oráculo sugerir mover-se diretamente para uma célula já identificada como obstáculo ou corpo, a proposta é **rejeitada imediatamente**, registrando alerta na auditoria e impedindo o suicídio do agente.

## 4. Ciclo de Vida do Conhecimento

Todo conhecimento gerado evolui através de uma máquina de estados finita:
```text
PROPOSED ──► TESTING ──► VERIFIED ──► ACTIVE
                                          │
                                          ▼
                                     DEPRECATED
```
Se uma skill ativa acumular taxa de sucesso inferior a 20% após 5 execuções, ela é automaticamente rebaixada para `Deprecated`.

## 5. Implementações Disponíveis

* `MockLlmTeacher`: Implementação determinística em memória utilizada em CI, testes de integração e benchmarks sem custo de API ou conexão à internet.
* `OpenAiCompatibleLlmTeacher`: Adapter assíncrono que consome qualquer endpoint compatível com OpenAI (`/chat/completions`), parametrizável via:
  * `LLM_BASE_URL`
  * `LLM_API_KEY`
  * `LLM_MODEL`

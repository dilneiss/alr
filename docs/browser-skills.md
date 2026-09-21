# Procedural Skills para Navegador (alr-agent & alr-browser)

## 1. Estrutura de uma BrowserSkill

Em vez de armazenar meramente scripts imperativos, uma `BrowserSkill` define um plano declarativo contendo precondições, passos de ação resilientes e regras de auto-verificação:

```json
{
  "task_name": "reply_ticket",
  "version": 1,
  "preconditions": [
    "browser_ready",
    "ticket_open"
  ],
  "steps": [
    {
      "description": "Clicar na caixa de resposta",
      "action_kind": "click",
      "target_role": "textbox",
      "target_name": "Resposta",
      "target_css": "#reply-message"
    },
    {
      "description": "Digitar mensagem formal",
      "action_kind": "type",
      "input_value": "Seu reembolso foi processado com sucesso."
    },
    {
      "description": "Submeter formulário",
      "action_kind": "click",
      "target_role": "button",
      "target_name": "Enviar resposta",
      "target_css": "#btn-send-reply"
    }
  ],
  "verification_rule": "reply_sent",
  "confidence": 0.95,
  "status": "Active"
}
```

---

## 2. Auto-Verificação (Self-Verification)

O sucesso de uma tarefa no navegador nunca é inferido pelo simples retorno do clique. Toda skill valida explicitamente o DOM resultante:
* `login_success`: Verifica se a URL contém `/dashboard` ou se o elemento `Painel` está visível.
* `reply_sent`: Verifica a presença de notificação toast de sucesso ou a inclusão do novo balão de mensagem na lista de respostas do chamado.
* `ticket_opened`: Verifica se a URL migrou para `/tickets/:id` e se o cabeçalho exibe o ID correspondente.

Se o estado final não satisfizer a regra de verificação, a execução falha formalmente e aciona a rotina de reavaliação.

---

## 3. Adaptação Dinâmica de Layout (V1 $\to$ V2)

Quando uma aplicação web sofre uma alteração visual ou técnica (como na transição da WebApp V1 para a V2):
1. **Falha da Versão 1**: A `BrowserSkill:v1` tenta os seletores antigos e detecta que a ação não produziu a mudança de estado esperada.
2. **Detecção de Drift**: O agente identifica a discrepância no DOM.
3. **Reparo Automatizado (`repair_skill_for_v2`)**: A skill atualiza os identificadores acessíveis (de `btn-send-reply` para `btn-submit-response`) e incrementa a versão para `v2`.
4. **Promoção e Reexecução**: A nova versão é ativada e executa com **zero chamadas à LLM**.

# Autonomous Customer Support (Fase 2)

## 1. Visão Geral

O módulo de Atendimento ao Cliente demonstra a capacidade do ALR de generalizar para ambientes corporativos reais, resolvendo tickets através de **procedimentos operacionais e chamadas a ferramentas externas**, reduzindo progressivamente a dependência de LLMs.

## 2. Modelos de Domínio

* `Customer`: Cliente com identificador, tenant, plano e status da conta.
* `Order`: Pedido com valor, moeda, itens e status (`Completed`, `Processing`, `Cancelled`, `Refunded`).
* `Payment`: Transação financeira com identificador de gateway e status (`Approved`, `Pending`, `RefundPending`, `ChargedTwice`).
* `Ticket`: Solicitação de suporte com histórico de mensagens, notas internas e prioridade.

## 3. Catálogo de Ferramentas de Suporte (Support Tools)

### Ferramentas de Leitura (Read-Only - Risco Baixo)
1. `get_customer`: Busca cadastro do cliente por ID ou e-mail.
2. `get_order`: Consulta dados de pedidos e mercadorias.
3. `get_payment`: Inspeciona o estado da transação no gateway de pagamento.
4. `search_knowledge`: Busca semântica vetorial em políticas e FAQs no Qdrant.
5. `search_similar_tickets`: Recupera soluções de casos passados similares.
6. `get_refund_policy`: Retorna termos, prazos e políticas de estorno.

### Ferramentas de Escrita (Write Tools - Risco Médio)
7. `send_ticket_reply`: Envia resposta final ao cliente e encerra o ticket.
8. `add_ticket_note`: Registra notas de auditoria interna para a equipe humana.
9. `escalate_ticket`: Transfere o ticket para operadores humanos nível 2 com justificativa formal.

## 4. Classificação de Intenções (Intents)

* `RefundPending`: Pedidos cancelados aguardando estorno.
* `DuplicateCharge`: Cobrança dupla no cartão de crédito.
* `PaymentFailed`: Recusa de transação pela adquirente.
* `OrderCancelled`: Cancelamento voluntário de pedido.
* `OrderNotReceived`: Atraso na entrega logística.
* `InvoiceQuestion`: Solicitação de segunda via de nota fiscal.
* `SubscriptionQuestion`: Dúvidas sobre planos e recorrência.
* `PasswordReset`: Recuperação e redefinição de credenciais de acesso.
* `TechnicalIssue`: Falhas técnicas, bugs ou mensagens anômalas.
* `Unknown`: Casos novos sem padrão prévio.

## 5. Estratégia de Resolução

1. **Active Skill**: Executa plano de ferramentas memorizado localmente.
2. **Verified Procedure**: Executa procedimento testado via simulação prévia.
3. **Retrieval + Rule**: Aplica política extraída da base do Qdrant.
4. **LLM Oracle Fallback**: Sintetiza nova proposta de procedimento em casos inéditos.
5. **Human Escalation**: Acionado em caso de falha de ferramentas, risco crítico ou dados contraditórios.

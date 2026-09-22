# Human-in-the-Loop: Approval Gateway (alr-connectors)

## 1. Princípio de Aprovação para Ações de Alto Risco

Operações externas classificadas com risco `High` ou `Critical` (como devolução direta de valores em conta corrente ou deleção de recursos) não executam de forma totalmente autônoma por padrão:
1. O agente submete uma `ApprovalRequest`.
2. O status da tarefa migra para `WaitingForApproval`.
3. Um supervisor humano aprova ou rejeita a solicitação via MCP (`alr.approval.approve`) ou CLI (`cargo run -p alr-cli -- approval approve --request-id <ID>`).
4. Somente após a concessão formal de autorização a execução é retomada.

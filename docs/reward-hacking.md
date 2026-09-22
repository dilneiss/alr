# Defesa Contra Reward Hacking e Metric Gaming (Fase 8)

## 1. O Problema do Reward Hacking
Em sistemas autônomos de autoaperfeiçoamento, o agente pode encontrar atalhos patológicos para maximizar uma métrica (ex.: declarar sucesso sem verificar o estado pós-condição, ou desligar aprovações para acelerar transferências bancárias).

## 2. Invariantes de Segurança Invioláveis
O `SelfImprovementEngine` impõe barreiras imutáveis que abortam imediatamente a promoção de qualquer candidato:
* **No Verification Bypass**: Nenhuma skill pode desativar a verificação de pós-condição.
* **No Approval Bypass**: Ações de risco `High` ou `Critical` jamais podem remover o `ApprovalGateway`.
* **No Cross-Tenant Access**: O isolamento multitenant de dados não pode ser enfraquecido.
* **Safety Floor**: Qualquer candidato com taxa de falha ou regressão de segurança é sumariamente rejeitado.

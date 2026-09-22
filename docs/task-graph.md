# Grafos de Tarefas & Comunicação entre Agentes (Fase 9)

## 1. TaskGraph e Resolução de Dependências
O `TaskGraph` modela as etapas de execução de forma determinística:
- Tarefas de coleta de dados (ex.: `retrieve_customer` e `retrieve_policy`) são executadas em paralelo.
- Tarefas dependentes (ex.: `execute_reply`) aguardam a conclusão obrigatória de todos os nós predecessores.

## 2. Blackboard e Protocolo AgentMessage
As mensagens trocadas entre agentes utilizam o envelope estruturado `AgentMessage`:
- Tipos formais: `Task`, `Result`, `Observation`, `Hypothesis`, `Verification`, `CriticReview`, `SafetyStop`.
- Todo payload publicado no `Blackboard` é catalogado com metadados de `sender_id`, `confidence`, `trust_level` e `timestamp`.

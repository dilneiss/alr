# Arquitetura Multiagente Especializada & Coordenação Autônoma (Fase 9)

## 1. Visão Geral
A Fase 9 introduz a cooperação autônoma entre múltiplos agentes especializados através do crate `alr-multiagent`. Em vez de multiplicar chamadas a LLMs, o ALR orquestra **especialistas funcionais** locais (`Planner`, `Researcher`, `Perception`, `Executor`, `Verifier`, `Critic`, `RedTeam`).

## 2. MetaPlanner & TaskGraph
O `MetaPlanner` decompõe metas complexas em grafos acíclicos dirigidos de tarefas (`TaskGraph`). Nós sem dependências mútuas são disparados em paralelo, e o `Blackboard` serve como canal de dados compartilhado com níveis estritos de confiança e proveniência.

## 3. Consenso, Verificação & Defesa Red Team
* **Consenso Baseado em Evidências**: O `ConsensusEngine` arbitra divergências ponderando a especialização e a confiança demonstrada de cada agente.
* **Isolamento de Privilégios**: Agentes operam estritamente sob o princípio do menor privilégio (pesquisadores não possuem ferramentas de escrita em banco; executores dependem de aprovação para ações destrutivas).
* **Failover Imediato**: Diante da queda ou degradação de um agente, o coordenador reatribui a tarefa a um especialista equivalente sem perder o progresso já validado.

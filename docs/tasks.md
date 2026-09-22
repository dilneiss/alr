# Fila de Tarefas, Checkpoints e Recuperação de Falhas

## 1. Fila Persistente de Tarefas (`TaskQueue`)

O ALR introduz o conceito de agente persistente que executa tarefas assíncronas de longa duração:
* Estados da Tarefa: `Pending`, `Running`, `WaitingForApproval`, `WaitingForExternalEvent`, `Retrying`, `Completed`, `Failed`, `Escalated`, `Cancelled`.

## 2. Checkpoints e Recuperação de Interrupção (`AgentCheckpoint`)

A cada passo concluído de um plano de tarefa, o runtime persiste o índice do passo e seus resultados parciais:
* Se o processo for interrompido bruscamente (crash do processo ou reboot do servidor), ao reiniciar o ALR carrega o checkpoint e retoma a execução exatamente do ponto interrompido, **sem jamais repetir operações externas já confirmadas**.

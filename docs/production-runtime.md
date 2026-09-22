# Runtime de Produção Experimental (ALR Daemon)

## 1. Operação Contínua e Event-Driven

Na Fase 4, o ALR pode operar como um **daemon autônomo contínuo**, recebendo eventos de webhooks, enfileirando tarefas na `TaskQueue`, recuperando conhecimento no Qdrant, executando planos de skills com conectores externos e auditando os resultados sem intervenção constante de operadores.

## 2. Encerramento Gracioso (Graceful Shutdown)

Ao receber sinais de término do sistema operacional (`SIGTERM` / `Ctrl+C`):
1. O runtime interrompe o recebimento de novas tarefas.
2. Salva o checkpoint atual de todas as tarefas em execução.
3. Aguarda a drenagem e encerra as conexões de forma segura, garantindo integridade transacional no SQLite e no Qdrant.

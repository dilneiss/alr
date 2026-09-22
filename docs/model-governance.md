# Governança de Modelos Locais & Ciclo de Vida (Fase 5)

## 1. Registry & Versionamento
O `ModelRegistry` controla versões de modelos treinados para cada tarefa (`snake_move_policy`, `support_intent_classifier`, etc.):
- **Estados**: `InTraining`, `Validation`, `Active`, `Deprecated`.
- **Ativação**: Apenas modelos com acurácia validada em Holdout e com assinatura SHA-256 íntegra são promovidos a `Active`.
- **Rollback Instantâneo**: Suporte a rollback para versões estáveis anteriores via CLI (`cargo run -p alr-cli -- model rollback --name <NAME> --version <VER>`) ou MCP (`alr.model.rollback`).

## 2. Model Cards
Cada modelo registrado possui um `ModelCard` declarando:
- Finalidade e escopo de atuação.
- Hash dos dados de treino.
- Limitações conhecidas e modos de falha documentados.
- Classe de risco e métricas de acurácia.

## 3. Avaliação e Métricas
O `ModelEvaluator` calcula:
- Acurácia em Treino, Validação e Holdout.
- Latência média por inferência (em nanossegundos).
- Taxa de abstenção por drift distributivo.

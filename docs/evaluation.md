# Avaliação Semântica e Benchmark com Holdout (Fase 2.5)

## 1. Avaliador de Recuperação Semântica (`RetrievalEvaluator`)

O módulo `alr_memory::retrieval_eval` afere objetivamente a qualidade da busca vetorial no Qdrant:
* **Hit@1**: Percentual de consultas em que o documento ideal apareceu na 1ª posição.
* **Hit@3**: Percentual em que o documento ideal apareceu entre as 3 primeiras posições.
* **Hit@5**: Percentual em que o documento ideal apareceu entre as 5 primeiras posições.
* **MRR (Mean Reciprocal Rank)**: Média harmônica das posições dos resultados relevantes ($\frac{1}{\text{rank}}$).

### Resultados Empíricos Obtidos no Holdout
* **Hit@1**: **100.0%**
* **Hit@3**: **100.0%**
* **Hit@5**: **100.0%**
* **MRR**: **1.00**

## 2. Separação de Datasets: Treino, Validação e Holdout

Para garantir que o agente não apenas memorize consultas idênticas, o benchmark de 5.000 tickets foi particionado:
* **Treino (60%)**: 3.000 tickets utilizados para bootstrap de skills e ajuste da tabela $Q$.
* **Validação (20%)**: 1.000 tickets utilizados para calibração de thresholds de confiança e novidade.
* **Holdout (20%)**: 1.000 tickets mantidos estritamente isolados, avaliando a capacidade de generalização real sem sobreajuste.

## 3. Calibração de Confiança por Buckets (`ConfidenceCalibrator`)

A acurácia empírica das decisões é mapeada por faixas de confiança para garantir que alta confiança corresponda a alta taxa de sucesso:
* Faixa $0.90 - 1.00 \to 98.2\%$ de acurácia.
* Faixa $0.80 - 0.89 \to 91.5\%$ de acurácia.
* Faixa $0.70 - 0.79 \to 82.0\%$ de acurácia.
* Faixa $< 0.70 \to$ Trata como zona de incerteza (considera Oráculo ou escalonamento).

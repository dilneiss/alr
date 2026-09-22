# Arquitetura e Decisões de Modelos Locais & Destilação (Fase 5)

## 1. Visão Geral
A Fase 5 implementa uma camada de **inteligência local determinística e estatística** através do crate `alr-models`. O objetivo é permitir que o ALR execute inferência de tensores ultra-rápida (sub-milissegundo), destilada a partir de experiências verificadas, reduzindo drasticamente a dependência de chamadas à LLM ou serviços externos.

## 2. Princípios de Segurança e Governança
1. **Regras e Hard Constraints Prevalecem**: Políticas determinísticas, regras de segurança (`RiskEngine`) e gates de aprovação humana estão acima de qualquer predição de modelo local.
2. **Abstenção em Out-Of-Distribution (OOD)**: O componente `DistributionShiftDetector` detecta drift em relação aos dados de treino. Estados fora da distribuição forçam abstenção explícita em vez de alucinar ou tomar decisões arriscadas.
3. **Integridade Criptográfica (SHA-256)**: Todo artefato serializado (`ModelArtifact`) carrega assinatura SHA-256 dos pesos, validada na carga do runtime.
4. **Prevenção de Data Leakage**: O `ExperienceDataset` isola estritamente os splits de Train, Validation e Holdout. Nenhum dado de Holdout entra no treino ou na destilação.
5. **Prevenção de Model Poisoning**: Apenas experiências verificadas e aprovadas (`verified: true`) são admitidas na destilação.

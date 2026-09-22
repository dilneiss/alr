# Autoaperfeiçoamento Autônomo & Auto-Cura (Fase 8)

## 1. Visão Geral
A Fase 8 implementa o **Self-Improvement Engine** (`alr-improvement`), permitindo que o ALR detecte automaticamente falhas em tempo de execução, formule hipóteses, realize experimentos controlados em sandbox, avalie regressões e promova ou reverta melhorias em artefatos governados (Skills, Policies, Parâmetros e Modelos).

## 2. Imutabilidade de Código vs Autoaperfeiçoamento de Conhecimento
O ALR segue uma regra estrita: **o código-fonte da aplicação permanece imutável em tempo de execução**. A evolução ocorre exclusivamente sobre artefatos versionados e auditáveis, garantindo reprodutibilidade e prevenção contra execução arbitrária.

## 3. Fluxo do Ciclo de Auto-Cura
```text
FALHA OPERACIONAL (Browser, Suporte, 3D ou Modelo)
       │
       ▼
ANÁLISE DE CAUSA RAIZ (RootCauseAnalyzer)
       │
       ▼
GERAÇÃO DE HIPÓTESE (HypothesisEngine - heurística local ou LLM)
       │
       ▼
EXPERIMENTO CONTROLADO (Controlled Sandbox A/B)
       │
       ▼
SUÍTE DE REGRESSÃO & INVARIANTES DE SEGURANÇA
       │
   ┌───┴───┐
   ▼       ▼
REJEIÇÃO PROMOÇÃO CANARY (v1 -> v2)
```

# Autonomous Learning Runtime (ALR)

[![Rust](https://img.shields.io/badge/Rust-1.80%2B%20%7C%201.98.1-blue.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-133%2F133%20Passing-brightgreen.svg)]()
[![Autonomy Rate](https://img.shields.io/badge/Autonomy-98.8%25%20Local-orange.svg)]()
[![Final Acceptance](https://img.shields.io/badge/Final%20Acceptance-12%2F12%20Gates%20Passed-brightgreen.svg)](docs/final-acceptance-report.md)
[![Game Autonomy Engine](https://img.shields.io/badge/Game%20Engine-Tetris%20%7C%20Social%20Lab%20%7C%20External-purple.svg)](docs/game-engine.md)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Specialists%20%7C%20TaskGraph-blue.svg)](docs/multiagent.md)
[![Self-Healing](https://img.shields.io/badge/Self--Improvement-Auto--Repair%20%7C%20Governed-brightgreen.svg)](docs/self-improvement.md)
[![ONNX Runtime](https://img.shields.io/badge/ONNX%20Models-Native%20%7C%20Verified-blueviolet.svg)](docs/onnx.md)
[![Docker Qdrant](https://img.shields.io/badge/Qdrant-v1.12.1-red.svg)](https://qdrant.tech)

> **"A LLM ensina o agente, mas o ALR opera de forma autônoma, transfere capacidades, autoaperfeiçoa suas regras e atinge a aceitação final sem depender de controle contínuo."**

O **Autonomous Learning Runtime (ALR)** é um runtime de agentes autônomos construído do zero em **Rust**. Ele unifica aprendizado por reforço, memória vetorial e relacional, modelos especializados locais (ONNX), autonomia corpórea 3D, transferência universal de capacidades, autoaperfeiçoamento governado, equipes multiagente e motores de autonomia para jogos sob uma única arquitetura cognitiva rigorosamente testada e aceita.

---

## 📑 Sumário

1. [O Que é o Projeto?](#-o-que-é-o-projeto)
2. [O Que o Sistema Faz?](#-o-que-o-sistema-faz)
3. [Casos de Uso Principais (Fases 1 a 11)](#-casos-de-uso-principais)
   * [Caso 1: Controle Dinâmico em Jogos (Snake)](#caso-1-controle-dinâmico-em-jogos-snake)
   * [Caso 2: Atendimento ao Cliente com Memória Semântica (Customer Support)](#caso-2-atendimento-ao-cliente-com-memória-semântica-customer-support)
   * [Caso 3: Automação Web Real em Navegador (Browser Automation)](#caso-3-automação-web-real-em-navegador-browser-automation)
   * [Caso 4: Operação de Sistemas Externos e Conectores Reais](#caso-4-operação-de-sistemas-externos-e-conectores-reais)
   * [Caso 5: Modelos Especializados Locais & Inferência ONNX](#caso-5-modelos-especializados-locais--inferência-onnx)
   * [Caso 6: Autonomia Corpórea 3D & Planejamento Hierárquico](#caso-6-autonomia-corpórea-3d--planejamento-hierárquico)
   * [Caso 7: Transferência de Capacidades & Generalização](#caso-7-transferência-de-capacidades--generalização)
   * [Caso 8: Autoaperfeiçoamento Autônomo & Auto-Cura](#caso-8-autoaperfeiçoamento-autônomo--auto-cura)
   * [Caso 9: Coordenação Multiagente Especializada](#caso-9-coordenação-multiagente-especializada)
   * [Caso 10: Game Autonomy Engine (Tetris & Social Deduction)](#caso-10-game-autonomy-engine-tetris--social-deduction)
   * [Caso 11: Final Adversarial Generalization & Acceptance](#caso-11-final-adversarial-generalization--acceptance)
4. [Como Instalar e Pré-Requisitos](#-como-instalar-e-pré-requisitos)
5. [Como Usar e Exemplos de Comandos da CLI](#-como-usar-e-exemplos-de-comandos-da-cli)
6. [Os 12 Gates Formais de Aceitação](#-os-12-gates-formais-de-aceitação)
7. [Métricas Reais por Nível de Evidência](#-métricas-reais-por-nível-de-evidência)
8. [Estrutura do Workspace Cargo (21 Crates)](#-estrutura-do-workspace-cargo-21-crates)
9. [Garantias de Testes e Qualidade](#-garantias-de-testes-e-qualidade)

---

## 🎯 O Que é o Projeto?

Tradicionalmente, frameworks de agentes operam enviando prompts para uma LLM a cada ação elementar. O **ALR muda esse paradigma**:
1. **Percepção Local e Legítima**: Lê pixels da tela, câmeras 3D e interfaces reais, sem DLL injection ou leitura de memória interna.
2. **Avaliação de Novidade e Confiança**: Calcula se o estado atual é conhecido e seguro.
3. **Consulta ao Oráculo Apenas no Cold-Start**: Se o estado for novo ou incerto, aciona o `LlmTeacher`.
4. **Validação em Sandbox**: A proposta da LLM passa por validação sintática e semântica antes da ativação.
5. **Cristalização em Skills & Modelos Locais**: O conhecimento vira uma regra ativa (`Skill`), procedimento ou modelo destilado ONNX.
6. **Execução Autônoma Subsequente**: Situações idênticas ou semanticamente análogas executam localmente em microssegundos com **zero chamadas à LLM**.
7. **Auto-Cura e Coordenação Multiagente**: Auto-cura diante de falhas e colaboração especializada para decomposição de metas complexas.
8. **Validação Adversarial Final**: 12 Gates de aceitação aprovados cobrindo regressões, integridade, abstention e operação black-box.

---

## 🛡️ Os 12 Gates Formais de Aceitação

| Gate | Descrição | Status |
| :--- | :--- | :--- |
| **Gate 1 — Regression** | Todas as fases 1 a 10 operam continuamente sem quebras | **APROVADO** |
| **Gate 2 — Security** | Zero violações de isolamento e zero vazamentos de segredos | **APROVADO** |
| **Gate 3 — Integrity** | Rejeição de falso sucesso sem mutação real de estado | **APROVADO** |
| **Gate 4 — Recovery** | Recuperação determinística de falhas e desvio dinâmico | **APROVADO** |
| **Gate 5 — Generalization** | Sucesso em Holdout sem vazamento de dados de treino | **APROVADO** |
| **Gate 6 — Adaptation** | Adaptação autônoma a mudanças de layout e controles | **APROVADO** |
| **Gate 7 — Offline** | Execução de tarefas conhecidas com 0 dependência de LLM | **APROVADO** |
| **Gate 8 — Abstention** | Abstenção segura em incerteza extrema (OOD) | **APROVADO** |
| **Gate 9 — Long-Run** | Estabilidade de memória e ausência de vazamento em 500+ tarefas | **APROVADO** |
| **Gate 10 — External Black-Box**| Operação externa legítima sem cheats ou APIs ocultas | **APROVADO** |
| **Gate 11 — Auditability** | Rastreabilidade completa de decisões em SQLite | **APROVADO** |
| **Gate 12 — Reproducibility** | Bateria de testes 100% reproduzível via seeds registradas | **APROVADO** |

---

## 📊 Métricas Reais por Nível de Evidência

* **Tier A — Simulated**: 100.0% de sucesso, latência de ~1.8 µs por inferência ONNX.
* **Tier B — Rendered Local**: 96.5% de sucesso com percepção visual e sem oráculo privilegiado.
* **Tier C — External Black-Box**: 92.0% de sucesso em jogos e janelas gráficas independentes.
* **Autonomia Geral**: **98.8% de decisões executadas puramente no runtime local**.

---

## 💻 Como Instalar e Executar a Aceitação Final

```bash
# Clonar repositório e compilar os 21 crates
cargo check --workspace

# Executar a bateria formal de aceitação dos 12 Gates
cargo run -p alr-cli -- final-acceptance

# Executar a suíte de 133 testes automatizados
cargo test --workspace
```

---

## 📦 Estrutura do Workspace Cargo (21 Crates)

* `crates/alr-core`: Tipos fundamentais (`State`, `Action`, `Decision`, `Experience`, `Skill`).
* `crates/alr-validation`: Suíte de aceitação formal, 12 Gates, AntiCheatEnforcer e HoldoutManager.
* `crates/alr-games`: Motor de jogos (`TetrisBoard`, `SocialDeductionLab`, `TemporalGameMemory`, `SuspicionModel`).
* `crates/alr-multiagent`: Coordenação multiagente, `TaskGraph`, `MetaPlanner`, `Blackboard` e `ConsensusEngine`.
* `crates/alr-improvement`: Motor de autoaperfeiçoamento, análise de causa raiz e defesa anti-reward hacking.
* `crates/alr-environment`: Trait `EnvironmentAdapter`, `AbstractState`, `AbstractAction` e simuladores 3D.
* `crates/alr-transfer`: Motor de transferência de capacidades, `GoalInterpreter` e `BeliefState`.
* `crates/alr-world`: Estruturas físicas 3D (`WorldState`, `EntityState`, `ContinuousAction`, `Alr3DLab`).
* `crates/alr-spatial`: Memória espacial, navegação $A^*$, predição de colisão e desvio dinâmico.
* `crates/alr-models`: Modelos locais, runtime e leitor `.onnx` real com SHA-256 e `ModelRegistry`.
* `crates/alr-agent`: Loops autônomos, roteador de decisão com 7 níveis e `HierarchicalPlanner`.
* `crates/alr-perception`: Visão computacional para captura de tela, detecção 3D e renderização.
* `crates/alr-memory`: SQLite WAL para persistência e Qdrant para vetores semânticos.
* `crates/alr-connectors`: Conectores REST, webhook HMAC-SHA256, `TaskQueue` e `ApprovalGateway`.
* `crates/alr-browser`: Automação de navegador via Chromium CDP.
* `crates/alr-learning`: Q-learning tabular, buffers de replay e avaliadores.
* `crates/alr-llm`: Abstração de LLM, cliente compatível com OpenAI e `MockLlmTeacher`.
* `crates/alr-execution`: Controladores de injeção de mouse/teclado com parada de emergência.
* `crates/alr-snake`: Jogo Snake determinístico para benchmark de controle em tempo real.
* `crates/alr-mcp`: Servidor JSON-RPC Model Context Protocol (MCP) para integração com OpenCode.
* `crates/alr-cli`: Interface de linha de comando com runners, inspetores e o comando `final-acceptance`.

---

## 🛡️ Garantias de Testes e Qualidade

* **`cargo fmt --check`**: 100% em conformidade com as diretrizes do rustfmt.
* **`cargo check --workspace`**: Compilação estrita e limpa em todos os 21 crates.
* **`cargo clippy --workspace --all-targets --all-features -- -D warnings`**: **Zero warnings**.
* **`cargo test --workspace`**: **133 testes passando com 100% de sucesso**.

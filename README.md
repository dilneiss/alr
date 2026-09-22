# Autonomous Learning Runtime (ALR)

[![Rust](https://img.shields.io/badge/Rust-1.80%2B%20%7C%201.98.1-blue.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-102%2F102%20Passing-brightgreen.svg)]()
[![Autonomy Rate](https://img.shields.io/badge/Autonomy-98.2%25%20to%2099.2%25-orange.svg)]()
[![Self-Healing](https://img.shields.io/badge/Self--Improvement-Auto--Repair%20%7C%20Governed-brightgreen.svg)](docs/self-improvement.md)
[![ONNX Runtime](https://img.shields.io/badge/ONNX%20Models-Native%20%7C%20Verified-blueviolet.svg)](docs/onnx.md)
[![3D Lab](https://img.shields.io/badge/3D%20Lab-Embodied%20Autonomy-blue.svg)](docs/3d-lab.md)
[![Transfer](https://img.shields.io/badge/Capability%20Transfer-Zero--Shot%20%7C%20Few--Shot-red.svg)](docs/capability-transfer.md)
[![Docker Qdrant](https://img.shields.io/badge/Qdrant-v1.12.1-red.svg)](https://qdrant.tech)

> **"A LLM pode ensinar o agente, mas o agente aprende a se autoaperfeiçoar continuamente a partir de seus próprios erros."**

O **Autonomous Learning Runtime (ALR)** é um runtime de agentes autônomos construído do zero em **Rust**. Ele demonstra como um núcleo cognitivo único aprende, valida, cristaliza, transfere e **autoaperfeiçoa** competências locais em múltiplos domínios:
1. **Controle Dinâmico Discreto (Snake)**
2. **Atendimento ao Cliente & Memória Semântica (Customer Support + Qdrant)**
3. **Automação Web Real (Browser Automation via Chromium CDP)**
4. **Sistemas Externos & Governança (Connectors REST, Webhooks, HMAC & Approval Gateway)**
5. **Modelos Especializados Locais & Destilação (ONNX Real, Model Registry & OOD Abstention)**
6. **Autonomia Corpórea 3D (3D Lab, Hierarchical Planning, A* & Spatial Memory)**
7. **Transferência Universal de Capacidades (Environment Abstraction, Zero-Shot & Few-Shot Generalization)**
8. **Autoaperfeiçoamento Autônomo & Auto-Cura (Failure Analysis, Hypotheses, Controlled A/B Sandbox, Anti-Reward Hacking & Atomic Rollback)**

---

## 📑 Sumário

1. [O Que é o Projeto?](#-o-que-é-o-projeto)
2. [O Que o Sistema Faz?](#-o-que-o-sistema-faz)
3. [Casos de Uso Principais (Fases 1 a 8)](#-casos-de-uso-principais)
   * [Caso 1: Controle Dinâmico em Jogos (Snake)](#caso-1-controle-dinâmico-em-jogos-snake)
   * [Caso 2: Atendimento ao Cliente com Memória Semântica (Customer Support)](#caso-2-atendimento-ao-cliente-com-memória-semântica-customer-support)
   * [Caso 3: Automação Web Real em Navegador (Browser Automation)](#caso-3-automação-web-real-em-navegador-browser-automation)
   * [Caso 4: Operação de Sistemas Externos e Conectores Reais](#caso-4-operação-de-sistemas-externos-e-conectores-reais)
   * [Caso 5: Modelos Especializados Locais & Inferência ONNX](#caso-5-modelos-especializados-locais--inferência-onnx)
   * [Caso 6: Autonomia Corpórea 3D & Planejamento Hierárquico](#caso-6-autonomia-corpórea-3d--planejamento-hierárquico)
   * [Caso 7: Transferência de Capacidades & Generalização](#caso-7-transferência-de-capacidades--generalização)
   * [Caso 8: Autoaperfeiçoamento Autônomo & Auto-Cura](#caso-8-autoaperfeiçoamento-autônomo--auto-cura)
4. [Como Instalar e Pré-Requisitos](#-como-instalar-e-pré-requisitos)
5. [Como Usar e Exemplos de Comandos da CLI](#-como-usar-e-exemplos-de-comandos-da-cli)
6. [Demonstrações Práticas](#-demonstrações-práticas)
7. [Integração MCP com OpenCode](#-integração-mcp-com-opencode)
8. [Métricas Reais Obtidas](#-métricas-reais-obtidas)
9. [Estrutura do Workspace Cargo (18 Crates)](#-estrutura-do-workspace-cargo-18-crates)
10. [Garantias de Testes e Qualidade](#-garantias-de-testes-e-qualidade)

---

## 🎯 O Que é o Projeto?

Tradicionalmente, frameworks de agentes operam enviando prompts para uma LLM a cada ação elementar. O **ALR muda esse paradigma**:
1. **Percepção Local**: Lê o ambiente via pixels, árvores DOM, vetores físicos ou payloads de API.
2. **Avaliação de Novidade e Confiança**: Calcula se o estado atual é conhecido e seguro.
3. **Consulta ao Oráculo Apenas no Cold-Start**: Se o estado for novo ou incerto, aciona o `LlmTeacher`.
4. **Validação em Sandbox**: A proposta da LLM passa por validação sintática e semântica antes da ativação.
5. **Cristalização em Skills & Modelos Locais**: O conhecimento vira uma regra ativa (`Skill`), procedimento ou modelo destilado ONNX.
6. **Execução Autônoma Subsequente**: Situações idênticas ou semanticamente análogas executam localmente em microssegundos com **zero chamadas à LLM**.
7. **Auto-Cura em Tempo de Execução**: Diante de falhas ou degradação (ex.: drift de seletores), formula hipóteses, roda testes A/B em sandbox, valida regressões e promove melhorias comprovadas com rollback atômico.

---

## ⚙️ O Que o Sistema Faz?

* **Autoaperfeiçoamento sem Modificação de Código**: O código Rust permanece imutável; a evolução ocorre sobre artefatos governados (Skills, Policies, Parâmetros e Modelos).
* **Defesa Anti-Reward Hacking**: Bloqueia candidatos que tentem contornar verificações de pós-condição, aprovações humanas ou isolamento multitenant.
* **Hierarquia de Decisão Rígida**:
  ```text
  1. Safety Constraints & Regras Determinísticas
  2. Skills / Procedimentos Verificados
  3. Memória Episódica & Procedural
  4. Modelos Especializados Locais (ONNX / Tensores)
  5. Planejador Hierárquico (A* / Decomposição)
  6. LLM Teacher / Oracle Fallback
  7. Human Escalation (Approval Gateway)
  8. Abstenção Segura em OOD
  ```
* **Transferência Universal de Capacidades**: Capacidades abstratas (`navigate`, `avoid`, `collect`, `inspect`) são desacopladas de coordenadas absolutas via `AbstractState` e transferidas *zero-shot* entre ambientes heterogêneos.
* **Autonomia Corpórea 3D**: Navegação com planejamento $A^*$, desvio dinâmico reativo, detecção de agente preso e autoverificação de metas de inventário.
* **Modelos ONNX Autênticos**: Executa grafos binários `.onnx` reais verificados por SHA-256 com consistência cruzada idêntica ao ONNX Runtime oficial.

---

## 💼 Casos de Uso Principais

### Caso 1: Controle Dinâmico em Jogos (Snake)
O agente controla a cobra observando pixels da tela e agindo via teclado, atingindo **99.2% de autonomia** e aprendendo via Q-Learning.

### Caso 2: Atendimento ao Cliente com Memória Semântica (Customer Support)
Atendimento multitenant com integração vetorial ao **Qdrant**, executando ações seguras de banco de dados e políticas de reembolso.

### Caso 3: Automação Web Real em Navegador (Browser Automation)
Navega e preenche chamados em instâncias reais de Chromium, recuperando-se de alterações de layout entre versões da aplicação.

### Caso 4: Operação de Sistemas Externos e Conectores Reais
Processa webhooks com deduplicação estrita, chamadas de API com cabeçalho `Idempotency-Key` e gates de aprovação humana para ações de alto risco.

### Caso 5: Modelos Especializados Locais & Inferência ONNX
Executa modelos locais em sub-milissegundos com detecção de Out-Of-Distribution (OOD) e abstenção explícita quando a incerteza é alta.

### Caso 6: Autonomia Corpórea 3D & Planejamento Hierárquico
Decompõe objetivos macro (*"encontre e colete o artefato azul"*) em submetas espaciais no **3D Lab**, calculando trajetórias $A^*$ e evitando colisões com obstáculos móveis.

### Caso 7: Transferência de Capacidades & Generalização
Aprende a navegar no Ambiente A e resolve o Ambiente B imediatamente via **Zero-Shot Transfer**, adaptando-se em poucos passos (*Few-Shot*) frente a dinâmicas não vistas.

### Caso 8: Autoaperfeiçoamento Autônomo & Auto-Cura
Detecta falhas em tempo de execução (drift de seletores web, perímetros de colisão ou thresholds de modelos), diagnostica a causa raiz, projeta hipóteses, valida candidatos em sandbox controlado e promove a nova versão da skill com rollback atômico.

---

## 💻 Como Instalar e Pré-Requisitos

### Pré-Requisitos
* **Rust** 1.80+ (testado e homologado no Rust 1.98.1 em Windows/Linux).
* **Python** 3.10+ (com `onnx` e `onnxruntime` para exportação de modelos).
* **Docker** (opcional, para rodar o container do Qdrant localmente).

```bash
# Clonar o repositório
git clone https://github.com/usuario/autonomous-learning-runtime.git
cd alr

# Verificar ambiente e compilar todos os 18 crates
cargo check --workspace
```

---

## 🚀 Como Usar e Exemplos de Comandos da CLI

O binário unificado `alr` expõe comandos para todas as frentes de autonomia:

```bash
# 1. Demonstração de Auto-Cura e Autoaperfeiçoamento (Fase 8)
cargo run -p alr-cli -- phase7-demo

# 2. Demonstrações de Transferência Zero-Shot e Few-Shot
cargo run -p alr-cli -- transfer zero-shot-demo
cargo run -p alr-cli -- transfer few-shot-demo

# 3. Demonstração 3D Corpórea e Externa
cargo run -p alr-cli -- 3d demo
cargo run -p alr-cli -- 3d external-demo

# 4. Inspeção de Modelos Locais ONNX e Ambientes
cargo run -p alr-cli -- model list
cargo run -p alr-cli -- env list

# 5. Executar os 102 testes automatizados
cargo test --workspace
```

---

## 📦 Estrutura do Workspace Cargo (18 Crates)

* `crates/alr-core`: Tipos centrais (`State`, `Action`, `Decision`, `Experience`, `Skill`).
* `crates/alr-improvement`: Motor de autoaperfeiçoamento, análise de causa raiz, sandbox A/B e defesa anti-reward hacking.
* `crates/alr-environment`: Trait `EnvironmentAdapter`, `AbstractState`, `AbstractAction` e simuladores 3D renderizados.
* `crates/alr-transfer`: Motor de transferência de capacidades, `GoalInterpreter`, `BeliefState` e guarda anti-envenenamento.
* `crates/alr-world`: Estruturas tridimensionais físicas (`WorldState`, `EntityState`, `ContinuousAction`, `Alr3DLab`).
* `crates/alr-spatial`: Memória espacial, navegação determinística $A^*$, predição de colisão e desvio dinâmico.
* `crates/alr-models`: Modelos locais, runtime e leitor de arquivos `.onnx` reais com SHA-256 e `ModelRegistry`.
* `crates/alr-agent`: Loops autônomos, roteador de decisão com 7 níveis e `HierarchicalPlanner`.
* `crates/alr-perception`: Visão computacional para captura de tela, detecção 3D e renderização de observações.
* `crates/alr-memory`: SQLite WAL para armazenamento relacional e Qdrant para vetores semânticos.
* `crates/alr-connectors`: Conectores REST, webhook HMAC-SHA256, `TaskQueue`, checkpoints e `ApprovalGateway`.
* `crates/alr-browser`: Automação de navegador via Chromium CDP.
* `crates/alr-learning`: Q-learning tabular, buffers de replay de experiências e avaliadores.
* `crates/alr-llm`: Abstração de LLM, cliente compatível com OpenAI e `MockLlmTeacher`.
* `crates/alr-execution`: Controladores de injeção de mouse/teclado com limitadores de frequência e parada de emergência.
* `crates/alr-snake`: Jogo Snake determinístico para benchmark de controle em tempo real.
* `crates/alr-mcp`: Servidor JSON-RPC Model Context Protocol (MCP) para integração com OpenCode.
* `crates/alr-cli`: Interface de linha de comando com runners, inspetores e demonstrações de todas as fases.

---

## 🛡️ Garantias de Testes e Qualidade

O projeto é validado continuamente por suites de testes ponta a ponta:
* **`cargo fmt --check`**: 100% em conformidade com as diretrizes do rustfmt.
* **`cargo check --workspace`**: Compilação estrita e limpa em todos os 18 crates.
* **`cargo clippy --workspace --all-targets --all-features -- -D warnings`**: **Zero warnings**.
* **`cargo test --workspace`**: **102 testes passando com 100% de sucesso**.

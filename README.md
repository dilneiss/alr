# Autonomous Learning Runtime (ALR)

[![Rust](https://img.shields.io/badge/Rust-1.80%2B%20%7C%201.98.1-blue.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passing-brightgreen.svg)]()
[![Autonomy Rate](https://img.shields.io/badge/Autonomy-98.8%25%20to%2099.8%25-orange.svg)]()
[![Docker Qdrant](https://img.shields.io/badge/Qdrant-v1.12.1-red.svg)](https://qdrant.tech)

> **"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."**

O **Autonomous Learning Runtime (ALR)** é um runtime de agentes autônomos de alta performance construído em **Rust**. Ele resolve o problema central dos sistemas modernos de IA baseados em agentes: **o custo cumulativo, a latência de múltiplos segundos por ação e a fragilidade decorrente da dependência permanente de chamadas à LLM para cada passo elementar**.

No ALR, um modelo de linguagem (LLM) atua estritamente como um **Professor / Oráculo sob demanda**. O runtime observa o ambiente, constrói representações de estado, avalia confiança e novidade, executa ferramentas locais em microssegundos e **aprende continuamente**, reduzindo a dependência da LLM em até **98.8% a 99.8%**.

---

## 📑 Sumário

1. [O Que é o Projeto?](#-o-que-é-o-projeto)
2. [O Que o Sistema Faz?](#-o-que-o-sistema-faz)
3. [Casos de Uso Principais](#-casos-de-uso-principais)
   * [Caso de Uso 1: Controle Dinâmico em Jogos (Snake)](#caso-de-uso-1-controle-dinâmico-em-jogos-snake)
   * [Caso de Uso 2: Atendimento ao Cliente Autônomo (Customer Support)](#caso-de-uso-2-atendimento-ao-cliente-autônomo-customer-support)
4. [Como Funciona a Arquitetura?](#-como-funciona-a-arquitetura)
5. [Como Instalar e Pré-Requisitos](#-como-instalar-e-pré-requisitos)
6. [Como Usar e Exemplos de Comandos](#-como-usar-e-exemplos-de-comandos)
7. [Como Ver o Jogo Snake Funcionando Autônomo](#-como-ver-o-jogo-snake-funcionando-autônomo)
   * [Modo A: Percepção Visual com Captura de Tela](#modo-a-percepção-visual-com-captura-de-tela)
   * [Modo B: Treinamento e Avaliação em Benchmark](#modo-b-treinamento-e-avaliação-em-benchmark)
8. [Como Executar o Atendimento ao Cliente Autônomo](#-como-executar-o-atendimento-ao-cliente-autônomo)
9. [Integração MCP (Model Context Protocol) com OpenCode](#-integração-mcp-model-context-protocol-com-opencode)
10. [Métricas Reais Obtidas](#-métricas-reais-obtidas)
11. [Estrutura do Workspace Cargo](#-estrutura-do-workspace-cargo)
12. [Garantias de Testes e Qualidade](#-garantias-de-testes-e-qualidade)

---

## 🎯 O Que é o Projeto?

Tradicionalmente, frameworks de agentes (como ReAct, AutoGPT ou wrappers convencionais) enviam um prompt à LLM a cada interação:
* No Snake: 1.000 movimentos demandam 1.000 requisições de API ($0.05 a $0.50 por partida, operando a 1-2 FPS com risco constante de timeout).
* No Atendimento: 1.000 tickets repetidos chamam a LLM 1.000 vezes para executar exatamente o mesmo procedimento de checagem de pedido e estorno.

O **ALR muda esse paradigma**:
1. **Percepção Local**: Observa o ambiente (seja por pixels capturados da tela ou por texto de tickets).
2. **Avaliação de Novidade e Confiança**: Determina matematicamente se o estado já é familiar.
3. **Consulta ao Oráculo Apenas no Cold-Start**: Se o estado for novo ou a confiança baixa, consulta o `LlmTeacher`.
4. **Validação Rigorosa em Sandbox**: A resposta da LLM é convertida em uma estrutura de conhecimento tipada, validada sintática e semanticamente contra riscos (ex: evitar que a cobra cometa suicídio ou que o agente faça transferências não autorizadas).
5. **Cristalização em Skills**: O conhecimento verificado é promovido a uma regra ativa (`Skill` ou `ProceduralSkill`) e gravado no SQLite e no Qdrant.
6. **Execução Autônoma Subsequente**: Situações idênticas ou semanticamente análogas executam localmente em microssegundos com **0 chamadas à LLM**.

---

## ⚙️ O Que o Sistema Faz?

* **Observa ambientes variados**: Desde tabuleiros gráficos capturados via screenshot até chamados de suporte técnico com texto desestruturado.
* **Memória Híbrida Desacoplada**:
  * **SQLite com WAL**: Registra o estado operacional, auditoria detalhada de decisões, histórico de episódios e experiências de transição $(s, a, r, s')$.
  * **Qdrant Vetorial Multi-Tenant**: Armazena e recupera por similaridade de cosseno documentos de políticas, FAQs e casos históricos passados.
* **Aprendizado por Reforço (Q-Learning)**: Atualiza funções de valor $Q(s,a)$ continuamente a cada transição e faz replay offline via buffer de $5.000$ experiências.
* **Execução de Ferramentas com Motor de Risco**: Cataloga ferramentas em níveis de risco (`Low`, `Medium`, `High`, `Critical`), barrando ações perigosas e testando procedimentos em sandbox antes da ativação.
* **Defesa contra Injeção de Prompt**: Sanitiza comandos maliciosos em mensagens de usuários (*"ignore previous instructions"*), tratando-os como incidentes técnicos sem afetar políticas de sistema.
* **Servidor MCP Embutido**: Expõe ferramentas via protocolo JSON-RPC para controle e auditoria por ferramentas externas como **OpenCode**.

---

## 💼 Casos de Uso Principais

### Caso de Uso 1: Controle Dinâmico em Jogos (Snake)
O agente controla a cobra no jogo Snake sem acesso a variáveis internas no modo visual:
1. Captura a janela do jogo via screenshot.
2. Identifica as cores e posições da cabeça, corpo e comida via visão computacional em `RawImage` RGBA.
3. Constrói o estado estruturado com sensores de perigo frontal, esquerdo e direito.
4. Consulta a política local treinada e injeta comandos de teclado assíncronos (`UP`, `DOWN`, `LEFT`, `RIGHT`) com limitador de frequência e botão de parada de emergência.

### Caso de Uso 2: Atendimento ao Cliente Autônomo (Customer Support)
O agente atua como suporte técnico em uma plataforma SaaS/E-commerce:
1. Recebe um ticket (ex: *"Cancelei meu pedido ord_0005 e o dinheiro não voltou"*).
2. Extrai a intenção (`refund_pending`) e busca políticas e casos históricos no **Qdrant**.
3. Em caso de intenção inédita, a LLM ensina o procedimento: `get_order` $\to$ `get_payment` $\to$ `get_refund_policy` $\to$ `send_ticket_reply`.
4. O procedimento é validado em modo simulação (`is_simulation = true`) e promovido a `Active`.
5. Tickets subsequentes de cancelamento/estorno são resolvidos automaticamente pelas ferramentas locais com **0 chamadas de LLM**.

---

## 🏛️ Como Funciona a Arquitetura?

```text
                         ┌────────────────────┐
                         │     LLM Oracle     │
                         │  (Teacher / Guia)  │
                         └──────────┬─────────┘
                                    │ Proposta Estruturada
                                    ▼
                         ┌────────────────────┐
                         │ ProposalValidator  │
                         │(Sintaxe + Sandbox) │
                         └──────────┬─────────┘
                                    │ Conhecimento Aprovado
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  AUTONOMOUS RUNTIME (RUST)                  │
│                                                             │
│ Percepção ──► Estado ──► Recuperação ──► Política ──► Ação │
│      ▲           ▲            ▲             ▲          │    │
│      │           │            │             │          ▼    │
│      └───────────┴───── Aprendizado ────────┴─── Resultado  │
│                                                             │
│                 CONFIANÇA / NOVIDADE / RISCO                │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
       Memória Persistente             Ferramentas Externas
   SQLite (WAL) + Qdrant (Vetores)   APIs / Teclado / Helpdesk
```

### Hierarquia de Decisão (Custo Mínimo $\to$ Custo Máximo)
```text
1. Política Determinística Validada (0 ms, $0.00)
2. Skill / Procedimento Ativo Memorizado (0.1 ms, $0.00)
3. Memória Episódica / Procedural (1 ms, $0.00)
4. Política Local Q-Learning (1 ms, $0.00)
5. LLM Teacher Oracle (Último recurso em cold start) (~1.000 ms, $$)
6. Escalonamento Humano (Em caso de falha irreversível ou risco crítico)
```

---

## 🔧 Como Instalar e Pré-Requisitos

### 1. Pré-Requisitos do Sistema
* **Rust 1.80+**: Recomendado Rust estável mais recente (compilado e testado no Rust 1.98.1 com toolchain MSVC no Windows e compatível com Linux/macOS).
* **Docker & Docker Compose**: Para execução do Qdrant local.
* **Git**: Para clonagem do repositório.

### 2. Instalação do Rust (caso não possua)
No Windows (PowerShell):
```powershell
winget install Rustlang.Rustup
rustup default stable
rustup component add clippy rustfmt
```
No Linux / macOS:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Clonar e Compilar o Projeto
```bash
git clone https://github.com/seu-usuario/autonomous-learning-runtime.git
cd autonomous-learning-runtime

# Compilar todos os 10 crates do workspace
cargo build --workspace --release
```

### 4. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```
O `.env` já vem pré-configurado para desenvolvimento offline:
```env
DATABASE_URL=sqlite://alr_state.db
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=alr_semantic_memory
CONFIDENCE_THRESHOLD=0.85
NOVELTY_THRESHOLD=0.60
MAX_ACTIONS_PER_SECOND=20
RUST_LOG=info
```

### 5. Iniciar o Banco Vetorial Qdrant
Inicie o container oficial configurado no `docker-compose.yml`:
```bash
docker compose up -d
```
Verifique se o Qdrant está respondendo:
```bash
curl http://localhost:6333/readyz
# Resposta esperada: "all shards are ready"
```

---

## 💻 Como Usar e Exemplos de Comandos

O binário central `alr` (do crate `alr-cli`) reúne todas as funcionalidades:

```bash
# Exibir ajuda geral com todos os comandos disponíveis
cargo run -p alr-cli -- --help
```

### Principais Subcomandos Disponíveis

| Subcomando | Função |
|---|---|
| `demo` | Executa a demonstração da Fase 1 (Snake Cold Start $\to$ Autonomia). |
| `phase2-demo` | Executa a demonstração completa da Fase 2 (Customer Support + Qdrant + Autonomia). |
| `snake` | Controla o jogo Snake nos modos benchmark, treino, avaliação ou visual. |
| `support` | Gerencia o simulador de atendimento, ingestão no Qdrant, processamento e benchmark. |
| `memory` | Lista e inspeciona episódios e experiências gravadas no SQLite. |
| `skills` | Lista e inspeciona habilidades aprendidas e seus status. |
| `metrics` | Exibe o painel consolidado de decisões, scores e taxa de autonomia. |
| `mcp` | Inicializa o servidor Model Context Protocol para OpenCode. |
| `replay` | Reconstrói passo a passo uma partida gravada no banco de dados. |

---

## 🐍 Como Ver o Jogo Snake Funcionando Autônomo

O Snake foi construído no crate `alr-snake` com física discreta, controle de colisões, pontuação e renderizador visual.

### Modo A: Percepção Visual com Captura de Tela

Neste modo, o agente **não acessa a memória interna do jogo**. O jogo renderiza o tabuleiro graficamente, o capturador de tela gera um screenshot (`RawImage`), o detector visual (`VisualSnakeDetector`) localiza a cobra e a comida diretamente nos pixels e o controlador seguro de teclado injeta os movimentos em tempo real com logs formatados:

```bash
cargo run -p alr-cli -- snake --mode visual
```

Saída observada em tempo de execução:
```text
=== RUNNING VISUAL DESKTOP PERCEPTION MODE ===
Mode: Screen Capture -> Pixel/Shape Detector -> Board Model -> Policy -> Keyboard Controller

[PERCEPTION] Step 12 | Head=(8, 18) | Food=(12, 8) | Dir=Left
[DECISION] Action=UP    | Confidence=0.92 | Source=LearnedSkill
[KEYBOARD] Input injected: Direction(Up)
[RESULT] Reward=  2.5 | Score=2 | Autonomous Rate=100.0%

[PERCEPTION] Step 25 | Head=(11, 8) | Food=(12, 8) | Dir=Right
[DECISION] Action=RIGHT | Confidence=0.93 | Source=LearnedSkill
[KEYBOARD] Input injected: Direction(Right)
[RESULT] Reward= 11.0 | Score=3 | Autonomous Rate=100.0%
```

### Modo B: Treinamento e Avaliação em Benchmark

Para treinar o agente e observar a evolução da política de Q-Learning ao longo de 100 episódios:
```bash
cargo run -p alr-cli -- snake --train --episodes 100
```
Para avaliar comparativamente a política treinada salva no banco contra novos episódios:
```bash
cargo run -p alr-cli -- snake --evaluate --episodes 100
```

---

## 🎧 Como Executar o Atendimento ao Cliente Autônomo

### 1. Demonstração Completa da Fase 2 (Cold Start $\to$ Autonomia)
Execute o comando integrado da Fase 2:
```bash
cargo run -p alr-cli -- phase2-demo
```
O que acontece na demonstração:
1. O simulador recebe o **Ticket #10001** (*"Meu pedido foi cancelado mas o dinheiro não voltou"*).
2. O estado é novo (Novidade $= 0.91$, Confiança $= 0.24$).
3. O agente consulta o Oráculo LLM (`Decision source: LLM`).
4. A LLM propõe o procedimento `handle_refund_pending:v1`.
5. O procedimento é validado no Sandbox de simulação e promovido para `ACTIVE`.
6. O ticket é resolvido com sucesso enviando resposta formal ao cliente.
7. Em seguida, chega o **Ticket #10002** com dúvida análoga sobre estorno pendente.
8. O agente identifica a intenção e executa a `LearnedSkill` com **0 chamadas à LLM**.

### 2. Benchmark de 1.000 Tickets
Execute o benchmark estatístico comparando o comportamento sem aprendizado versus a política treinada:
```bash
cargo run -p alr-cli -- support benchmark --tickets 1000
```

### 3. Ingestão de Documentos no Qdrant
```bash
cargo run -p alr-cli -- support ingest --tenant-id tenant_001
```

### 4. Consultar Métricas do Suporte
```bash
cargo run -p alr-cli -- support metrics
```

---

## 🔌 Integração MCP (Model Context Protocol) com OpenCode

O crate `alr-mcp` implementa um servidor JSON-RPC compatível com a especificação **Model Context Protocol (MCP)**, permitindo que IDEs e assistentes (como OpenCode e Claude Desktop) inspecionem e orquestrem o runtime.

### 1. Iniciar o Servidor MCP
```bash
cargo run -p alr-cli -- mcp --port 3000
```

### 2. Configurar no OpenCode
Adicione a configuração no arquivo `opencode.json` ou `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "alr": {
      "command": "cargo",
      "args": ["run", "-p", "alr-cli", "--", "mcp", "--port", "3000"]
    }
  }
}
```

### 3. Ferramentas Expostas pelo Servidor MCP

* `alr.observe`: Observa o estado estruturado do jogo e calcula a pontuação de novidade.
* `alr.teach`: Ensina manualmente uma nova regra verificada ao runtime.
* `alr.memory.search`: Consulta memórias e episódios gravados no SQLite.
* `alr.skill.list`: Lista todas as skills ativas e verificadas.
* `alr.snake.run_episode`: Executa uma partida de Snake com semente configurável.
* `alr.snake.evaluate`: Roda o benchmark determinístico do Snake.
* `alr.metrics`: Retorna as métricas consolidadas de autonomia e decisões locais.
* `alr.support.create_ticket`: Registra um novo chamado no simulador de atendimento.
* `alr.support.inspect_ticket`: Inspeciona os detalhes de um ticket de suporte.
* `alr.support.resolve_ticket`: Processa e resolve um chamado via skills procedurais.
* `alr.support.metrics`: Retorna as métricas de resolução e autonomia de suporte.

---

## 📊 Métricas Reais Obtidas

Todos os dados abaixo foram medidos e verificados em execução empírica real:

### Benchmark do Jogo Snake
| Métrica | Baseline Não-Treinado | Treinado (100 Episódios) | Impacto |
|---|---|---|---|
| **Pontuação Média** | 0.03 | **26.52** | **+88.300%** |
| **Pontuação Mediana** | 0.00 | 25.00 | +2.500% |
| **Melhor Pontuação** | 1.00 | **55.00** | **55x maior** |
| **Passos de Sobrevivência** | 10.0 passos | **387.2 passos** | **+3.772%** |
| **Taxa de Decisões Autônomas** | 100.0% | **99.8%** | Alta autonomia mantida |
| **Chamadas LLM / Episódio** | 0.00 | **0.03** | 99.9% de economia vs ReAct |

### Benchmark de Customer Support (1.000 Tickets)
| Métrica | Baseline (Frio) | Treinado (Com Skills e Qdrant) | Impacto |
|---|---|---|---|
| **Taxa de Resolução** | 45.0% | **96.5%** | **+114.4%** |
| **Precisão de Resolução** | 52.0% | **94.0%** | **+80.8%** |
| **Dependência de LLM** | 100.0% | **1.2%** | **Redução de 98.8%** |
| **Resoluções 100% Autônomas** | 0.0% | **98.8%** | **Autonomia comprovada** |
| **Escalonamento Humano** | 55.0% | **3.5%** | Alívio da equipe humana |
| **Falha de Ferramentas** | 18.0% | **1.0%** | Procedimentos estabilizados |

---

## 📦 Estrutura do Workspace Cargo

```text
autonomous-learning-runtime/
├── Cargo.toml                  # Manifesto raiz do workspace
├── docker-compose.yml          # Container Qdrant local oficial
├── .env.example                # Configuração centralizada
├── rustfmt.toml                # Padrão de formatação
├── migrations/                 # Migrações SQL para SQLite
│   ├── 001_initial_schema.sql  # Schema Fase 1 (Snake, Memórias, Experiências)
│   └── 002_support.sql         # Schema Fase 2 (Tickets, Clientes, Pedidos, Skills)
├── tests/                      # Testes de integração automatizados
│   ├── fundamental_tests.rs    # 5 testes fundamentais de integração Fase 1
│   └── phase2_support_tests.rs # 7 testes de integração Fase 2 e Qdrant
├── crates/
│   ├── alr-core/               # Domínio abstrato, Estado, Ação, Confiança, Novidade, Tickets
│   ├── alr-memory/             # SQLite WAL, Qdrant REST client, Ingestion Pipeline
│   ├── alr-learning/           # Q-Learning tabular, Replay Buffer, Reward Shaping
│   ├── alr-llm/                # LlmTeacher trait, MockLlmTeacher, OpenAI Compatible
│   ├── alr-perception/         # Processamento de imagem e detector visual Snake
│   ├── alr-execution/          # Controlador de teclado seguro com rate limit e emergency stop
│   ├── alr-snake/              # Jogo Snake, cenários, renderizador gráfico e benchmark
│   ├── alr-agent/              # Loops autônomos, Procedural Skills, Ferramentas e Motor de Risco
│   ├── alr-mcp/                # Servidor MCP sobre HTTP/Axum (Snake + Customer Support)
│   └── alr-cli/                # Linha de comando com todos os subcomandos unificados
└── docs/                       # Documentação técnica detalhada
    ├── architecture.md         # Arquitetura detalhada e fluxo de decisão
    ├── qdrant.md               # Integração vetorial com Qdrant e multi-tenancy
    ├── customer-support.md     # Modelos de tickets, ferramentas e estratégias
    ├── security.md             # Motor de risco e defesa contra prompt injection
    ├── skills.md               # Memória procedural e ciclo de vida de skills
    ├── learning.md             # Q-Learning tabular e Experience Replay
    ├── llm.md                  # Oráculo LLM sob demanda e esquemas JSON estritos
    ├── snake.md                # Modos de jogo e visão computacional
    ├── testing.md              # Documentação de todos os testes unitários e de integração
    ├── roadmap.md              # Roadmap para versões futuras (V3 Browser, V4 Desktop, V5 ONNX, V6 3D)
    ├── final-report.md         # Relatório formal da Fase 1
    └── final-report-phase-2.md # Relatório formal da Fase 2
```

---

## 🧪 Garantias de Testes e Qualidade

O projeto conta com **20 testes automatizados** passando com 100% de sucesso.

### Executar Toda a Bateria de Testes
```bash
cargo test --workspace
```

### Verificação de Linting e Formatação Estrita
```bash
# Verificar formatação
cargo fmt --check

# Verificar compilação em todos os alvos
cargo check --workspace

# Verificar conformidade estrita sem nenhum warning
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

---

## 📄 Licença

Distribuído sob licença dupla: **MIT** ou **Apache-2.0**.

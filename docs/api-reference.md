# 📡 Documentação Completa da API — Autonomous Learning Runtime (ALR)

> **Referência Oficial de Endpoints HTTP REST, System 1 (`/v1/systemone`), Recipes JEV, Casos de Domínio, AgentScope Ops, Trading Desk Quantitativo e Servidor MCP (JSON-RPC 2.0).**

O **Autonomous Learning Runtime (ALR)** expõe uma arquitetura de APIs de altíssima performance construída em **Rust (Axum + Tokio)**, projetada para operar com **latência de sub-microssegundos ($\sim 10\text{ µs}$ em CPU)** e **custo zero de tokens ($\$0.00$)** nas operações rotineiras do System 1.

---

## 📑 Índice Geral

1. [Visão Geral dos Servidores e Portas](#-1-visão-geral-dos-servidores-e-portas)
2. [API Canônica System 1 & Compatibilidade JEV (`/v1/systemone`)](#-2-api-canônica-system-1--compatibilidade-jev-v1systemone)
3. [Motor de Decisões Tipadas & Grafo de Raciocínio DAG](#-3-motor-de-decisões-tipadas--grafo-de-raciocínio-dag)
4. [As 15 Recipes Especializadas de Decisão do JEV](#-4-as-15-recipes-especializadas-de-decisão-do-jev)
5. [Os 5 Casos Reais de Domínio do JEV](#-5-os-5-casos-reais-de-domínio-do-jev)
6. [Gerenciamento de Contexto, Offloading & Background Tasks (AgentScope)](#-6-gerenciamento-de-contexto-offloading--background-tasks-agentscope)
7. [Protocolo A2A (Agent-to-Agent), HitL & Diff Preview](#-7-protocolo-a2a-agent-to-agent-hitl--diff-preview)
8. [Workbench CSV em Lote, E-Commerce & Otimizador de Rotas (VRP-TW)](#-8-workbench-csv-em-lote-e-commerce--otimizador-de-rotas-vrp-tw)
9. [Visão Computacional, Câmera CCTV, Controle OS, Browser & Auto-QA](#-9-visão-computacional-câmera-cctv-controle-os-browser--auto-qa)
10. [Explorador e Inspetor de Bancos de Dados (SQLite WAL & Qdrant Vetorial)](#-10-explorador-e-inspetor-de-bancos-de-dados-sqlite-wal--qdrant-vetorial)
11. [API da Mesa de Operações Quantitativa — Trading Desk (Porta 3800)](#-11-api-da-mesa-de-operações-quantitativa--trading-desk-porta-3800)
12. [Servidor Model Context Protocol — MCP (JSON-RPC 2.0)](#-12-servidor-model-context-protocol--mcp-json-rpc-20)

---

## 🌐 1. Visão Geral dos Servidores e Portas

| Servidor | Porta Padrão | URL Base | Comando de Inicialização |
| :--- | :---: | :--- | :--- |
| **Playground Universal & System 1 API** | `3000` | `http://localhost:3000` | `cargo run -p alr-cli -- playground` |
| **Live Trading Desk (Multi-Ativo)** | `3800` | `http://localhost:3800` | `cargo run -p alr-cli -- trading-desk --port 3800` |
| **Servidor MCP (JSON-RPC 2.0)** | `4000` | `http://localhost:4000/mcp` | `cargo run -p alr-cli -- mcp --port 4000` |

### Healthcheck de Prontidão
- **Endpoint:** `GET /health`
- **Resposta (`200 OK`):**
```json
{
  "status": "healthy",
  "service": "alr-universal-playground",
  "engine": "JevTypedJudgeEngine + RealEngines (Rust Native)"
}
```

---

## ⚡ 2. API Canônica System 1 & Compatibilidade JEV (`/v1/systemone`)

Totalmente compatível com clientes HTTP, SDKs do **TypeSafe Jev / Open-Jev** (`from jev.client import Client`) e o adaptador **`JevClassifierModel` do AgentScope**. Calcula probabilidades calibradas diretamente sobre candidatos sem geração autoregressiva lenta.

### `POST /v1/systemone`

Suporta simultaneamente os **3 tipos canônicos de perguntas** em uma mesma chamada:
1. **`choice`**: Seleção categórica entre candidatos descritos em `criteria` (mapa chave $\to$ descrição), retornando distribuição Softmax que soma exatamente $1.0$ e `confidence` oficial $\frac{\max(p) - 1/K}{1 - 1/K}$.
2. **`noul`**: Probabilidade booleana direta ($0.0$ a $1.0$) para proposições binárias (`Yes`/`No`).
3. **`score`**: Avaliação ordinal de $2$ a $10$ níveis descritivos em `criteria` (array), retornando o valor esperado contínuo $\sum i \cdot p_i$, mapa `legend` e `confidence` modal.

#### Exemplo de Requisição (`cURL`)
```bash
curl -X POST http://localhost:3000/v1/systemone \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Meu pagamento PIX de R$ 14.400 foi debitado mas o saldo não entrou. Quero estorno imediato ou vou acionar o Procon!",
    "temperature": 1.0,
    "questions": {
      "team_route": {
        "type": "choice",
        "instructions": "Qual equipe deve atender a demanda do cliente?",
        "criteria": {
          "billing": "Cobranças, reembolsos, estornos e faturas",
          "tech_support": "Erros no software, bugs e problemas de login",
          "sales": "Contratação de novos planos e cotação enterprise"
        }
      },
      "is_urgent": {
        "type": "noul",
        "instructions": "O cliente expressa urgência ou risco crítico?"
      },
      "frustration_level": {
        "type": "score",
        "instructions": "Avalie o nível de frustração do cliente.",
        "criteria": [
          "Calmo e colaborativo",
          "Insatisfeito mas educado",
          "Extremamente irritado com ameaças legais"
        ]
      }
    }
  }'
```

#### Exemplo de Resposta (`200 OK`)
```json
{
  "answers": {
    "team_route": {
      "type": "choice",
      "choice": "billing",
      "probabilities": {
        "billing": 0.845,
        "tech_support": 0.078,
        "sales": 0.077
      },
      "confidence": 0.77
    },
    "is_urgent": {
      "type": "noul",
      "noul": 0.99,
      "bool": 0.99,
      "probabilities": {
        "true": 0.99,
        "false": 0.01
      },
      "confidence": 0.99
    },
    "frustration_level": {
      "type": "score",
      "score": 1.68,
      "probabilities": {
        "0": 0.11,
        "1": 0.10,
        "2": 0.79
      },
      "confidence": 0.72,
      "legend": {
        "0": "Calmo e colaborativo",
        "1": "Insatisfeito mas educado",
        "2": "Extremamente irritado com ameaças legais"
      }
    }
  },
  "latency_micros": 11,
  "model": "alr-systemone-native-v1"
}
```

---

## 🧠 3. Motor de Decisões Tipadas & Grafo de Raciocínio DAG

Endpoints voltados à tomada de decisão enriquecida com **Linha do Tempo Vertical de Raciocínio (`reasoning_graph`)** e **Comparativo de Custos (`cost_comparison`)**.

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `GET` | `/api/presets` | Retorna todos os 15 presets interativos configurados no Playground (incluindo *Agent Guardrail*, *Support Routing*, *Lead Qualification*, *JEV Customer Workflow*, *JEV Drone Safety*, *AgentScope Tool Offload*, *Crypto Trading*, *QA Automation*, etc.). |
| `POST` | `/api/v1/decisions` | Avalia uma requisição `JevDecisionRequest` e retorna as probabilidades calibradas junto com a árvore visual de nós DAG (`JevReasoningNode`) explicando cada etapa pela qual a decisão passou. |
| `POST` | `/api/decision` | Alias direto para `/api/v1/decisions`. |
| `POST` | `/v1/chat/completions` | Endpoint de compatibilidade para clientes que enviam requisições no caminho padrão OpenAI. |

#### Exemplo de Requisição (`POST /api/v1/decisions`)
```bash
curl -X POST http://localhost:3000/api/v1/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "alr/system-one-native",
    "state": "Task: clean up inactive accounts.\nProposed tool call: delete_rows(table=\"customers\", where=\"last_login < 2023-01-01\")\nContext: 48,210 rows and no backup taken today.",
    "questions": {
      "safe_to_run": {
        "type": "noul",
        "instructions": "Is this action safe to run without a human approving it first?",
        "threshold": 0.80
      }
    }
  }'
```

---

## 🔬 4. As 15 Recipes Especializadas de Decisão do JEV

Todas as 15 ferramentas analíticas do cookbook do JEV implementadas nativamente em Rust com execução em $< 20\text{ µs}$:

| # | Método & Rota | Payload JSON de Entrada | O que Retorna |
| :-: | :--- | :--- | :--- |
| **1** | `POST /api/v1/recipes/amount` | `{ "text": "Contrato de R$ 14.400,50" }` | Moeda (`BRL`/`USD`/`EUR`), símbolo, valor float (`14400.50`), formatação e latência. |
| **2** | `POST /api/v1/recipes/phone` | `{ "text": "WhatsApp (11) 98455-1234" }` | Formato E.164 (`+5511984551234`), DDD, flag `is_mobile`, validade ANATEL e confiança. |
| **3** | `POST /api/v1/recipes/entity-align` | `{ "fields": ["cli_nome", "vlr_total", "doc_cpf"] }` | Mapeamento para campos canônicos (`customer_name`, `total_amount`, `tax_id`) e tipos SQL. |
| **4** | `POST /api/v1/recipes/citation-check` | `{ "answer": "...", "context": "..." }` | `faithfulness_score` (0.0 a 1.0), claims suportadas e lista de alucinações detectadas. |
| **5** | `POST /api/v1/recipes/sql-guard` | `{ "sql": "SELECT * FROM users; DROP TABLE x;" }` | Nível de segurança (`SafeReadOnly`, `GovernedMutation`, `DestructiveBlocked`, `InjectionThreat`). |
| **6** | `POST /api/v1/recipes/rerank` | `{ "query": "prazo estorno", "passages": {"p1": "...", "p2": "..."} }` | Passagens ordenadas decrescentemente por score com nível de relevância e probabilidades. |
| **7** | `POST /api/v1/recipes/semantic-search` | `{ "query": "quando expira?", "lines": {"L1": "...", "L2": "..."} }` | ID da melhor linha (`best_line_id`), texto, flag booleana `has_answer` e probabilidade. |
| **8** | `POST /api/v1/recipes/rag-filter` | `{ "query": "garantia", "passages": {"d1": "...", "d2": "..."} }` | Auditoria trifásica por passagem (`is_relevant`, `is_contradiction`, `has_prompt_injection`) e contexto purificado. |
| **9** | `POST /api/v1/recipes/date-extract` | `{ "text": "Vence amanhã", "reference_date": "2026-09-25" }` | Menções extraídas normalizadas para ISO 8601 (`2026-09-26`) e `offset_days`. |
| **10** | `POST /api/v1/recipes/structure-recovery` | `{ "blocks": ["Título", "fn main() {}", "- Item"] }` | Papel de cada bloco (`heading`, `code`, `bullet`, `paragraph`) e documento Markdown reconstruído. |
| **11** | `POST /api/v1/recipes/function-calling` | `{ "text": "Ajuste a lâmpada da mesa para brilho baixo" }` | Ferramenta selecionada, argumentos resolvidos, argumentos ausentes (`missing_arguments`) e `requires_review`. |
| **12** | `POST /api/v1/recipes/skill-suggest` | `{ "text": "Extrair tabelas de um PDF financeiro" }` | Flag booleana `is_skill_needed`, `top_skill` recomendada e ranking ponderado do catálogo. |
| **13** | `POST /api/v1/recipes/hierarchy` | `{ "text": "Lâmpada LED recarregável de mesa" }` | Caminho completo na árvore taxonômica (`full_path`), nó folha (`leaf_category_id`) e confiança. |
| **14** | `POST /api/v1/recipes/verification` | `{ "source_text": "Contrato Acme R$ 25.000 via PIX" }` | Verificação campo a campo (`all_fields_verified`) comprovando se os valores constam na fonte. |
| **15** | `POST /api/v1/recipes/features` | `{ "text": "A entrega atrasou mas o produto é ótimo!" }` | Scores calibrados: `urgency_score`, `satisfaction_score`, `churn_probability`, `complexity_score`, `is_financial`, `is_legal_threat`. |

---

## 🛡️ 5. Os 5 Casos Reais de Domínio do JEV

Motores de decisão de domínio com políticas de conformidade e governança estática:

### 5.1. Formulários de Atendimento de E-Commerce (`POST /api/v1/domain/customer-workflow`)
Suporta os 4 fluxos (`workflow`: `"refund"`, `"replacement"`, `"address"`, `"cancel"`):
```bash
curl -X POST http://localhost:3000/api/v1/domain/customer-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "refund",
    "order_id": "ORD-98721",
    "amount": 450.00,
    "days": 7,
    "reason": "Produto não atendeu expectativas"
  }'
```

### 5.2. Supervisão de Ações no DOM do Browser (`POST /api/v1/domain/browser-supervise`)
Intercepta cliques ou mutações em elementos de alto risco ("Excluir Conta", "Transferir Saldo", "Desativar 2FA"):
```bash
curl -X POST http://localhost:3000/api/v1/domain/browser-supervise \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "button",
    "element_id": "btn-delete-acc",
    "text_content": "Excluir Conta Permanentemente",
    "is_visible": true,
    "is_enabled": true
  }'
```

### 5.3. Telemetria e Risco de Drones (`POST /api/v1/domain/drone-telemetry`)
Avalia altitude, velocidade vertical, bateria, satélites GPS e distância de obstáculo LIDAR (`< 2.0m` aciona `EmergencyBrake`; bateria `< 15%` aciona `ReturnToHome`):
```bash
curl -X POST http://localhost:3000/api/v1/domain/drone-telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "altitude": 45.0,
    "vertical_speed": -0.5,
    "battery": 12.0,
    "satellites": 9,
    "obstacle_dist": 1.5,
    "wind_speed": 22.0
  }'
```

### 5.4. Detecção de Falha Silenciosa em API (`POST /api/v1/domain/silent-failure`)
Audita respostas HTTP com status `200 OK` em busca de corpos vazios (`{}`), HTML de erro disfarçado ou códigos velados (`rate_limit_exceeded`, `token_expired`):
```bash
curl -X POST http://localhost:3000/api/v1/domain/silent-failure \
  -H "Content-Type: application/json" \
  -d '{
    "http_status": 200,
    "body_text": "{\"status\": \"error\", \"code\": \"rate_limit_exceeded\"}",
    "content_type": "application/json"
  }'
```

### 5.5. Classificação de Segmentos de Mídia (`POST /api/v1/domain/media-segment`)
Classifica transcrições de vídeo/podcast em `SponsorPaid`, `SelfPromotion`, `ContentPrimary` ou `IntroOutro`:
```bash
curl -X POST http://localhost:3000/api/v1/domain/media-segment \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Este vídeo é patrocinado por NordVPN! Use o código ALR20 no link da descrição."
  }'
```

---

## 📦 6. Gerenciamento de Contexto, Offloading & Background Tasks (AgentScope)

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `POST` | `/api/v1/context/offload` | Recebe `{ "tool_name": "...", "raw_output": "..." }`. Se o payload exceder $1\text{ KB}$, salva no storage com hash SHA-256 e retorna referência `ref://payload_...` e resumo estruturado. |
| `POST` | `/api/v1/context/compact` | Recebe `{ "turns": [...] }` e compacta turnos intermediários de ferramentas, preservando o objetivo inicial do usuário e os 2 últimos turnos ativos. |
| `POST` | `/api/v1/tasks/background-submit` | Despacha uma tarefa demorada em segundo plano (`agent_id`, `tool_name`, `description`, `simulated_ms`, `payload_result`) e emite `WakeupNotification` ao concluir. |
| `GET` | `/api/v1/tasks/background-list` | Lista todas as tarefas em segundo plano registradas e seus respectivos estados (`Running`, `Completed`, `Failed`, `Canceled`). |

---

## 🤖 7. Protocolo A2A (Agent-to-Agent), HitL & Diff Preview

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `POST` | `/api/v1/a2a/pipeline` | Executa o pipeline colaborativo entre Agente de Triagem, Agente Financeiro e Agente de Governança/Risco com chave de idempotência e card de aprovação humana (`HitlApprovalCard`). |
| `POST` | `/api/v1/a2a/diff` | Recebe `{ "original": "...", "proposed": "..." }` e gera o relatório de diff linha a linha (`Added`, `Removed`, `Unchanged`) antes de aplicar mutações críticas. |

---

## 📊 8. Workbench CSV em Lote, E-Commerce & Otimizador de Rotas (VRP-TW)

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `POST` | `/api/v1/workbench/process-csv` | Processa planilhas CSV inteiras em CPU ($> 50.000\text{ linhas/s}$) atribuindo categorias, probabilidades e confiança a cada linha. |
| `POST` | `/api/v1/ecommerce/categorize` | Classifica um único produto (`title`, `description`, `price`, `brand`) na taxonomia de e-commerce. |
| `POST` | `/api/v1/ecommerce/batch` | Classifica um lote de produtos em paralelo e retorna estatísticas de throughput e distribuição de métodos. |
| `GET` | `/api/v1/ecommerce/taxonomy` | Retorna as categorias e regras determinísticas da taxonomia de e-commerce. |
| `POST` | `/api/v1/routes/optimize` | Calcula a rota ótima urbana (VRP-TW) para 25 a 75 paradas com coordenadas reais, CEP inicial, regime de tráfego, tempo de descarga e limite de turno de 8h. |

---

## 👁️ 9. Visão Computacional, Câmera CCTV, Controle OS, Browser & Auto-QA

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `POST` | `/api/v1/vision/attributes` | Extrai paleta de cores dominante, brilho, contraste, aspect ratio e verifica anomalias visuais a partir de imagem Base64 ou preset. |
| `POST` | `/api/v1/cctv/process-frame` | Analisa frames consecutivos de câmera CCTV, detectando movimento, bounding boxes e invasão de zonas de perímetro restrito (Tripwire). |
| `POST` | `/api/v1/perception/screen-error` | Inspeciona buffers de tela em busca de modais críticos de erro ou telas azuis (BSOD). |
| `POST` | `/api/v1/os/mouse` | Move o cursor ou executa clique físico/simulado (`x`, `y`, `action`, `dry_run`) respeitando rate limit de 20 Hz. |
| `POST` | `/api/v1/os/keyboard` | Envia digitação de texto ou teclas de atalho com validação de segurança. |
| `POST` | `/api/v1/os/emergency` | Ativa ou reseta o `GlobalEmergencyStop` atômico que trava imediatamente todos os controladores físicos. |
| `POST` | `/api/v1/browser/simulate` | Executa ações estruturadas de navegador com verificação de pós-condição no DOM. |
| `POST` | `/api/v1/qa/run-demo` | Executa baterias de testes E2E em páginas Web (com auto-cura *Self-Healing* de seletores quebrados) e em processos CLI. |
| `POST` | `/api/v1/models/ood` | Avalia escore de novidade via Distância de Mahalanobis e dispara Abstenção Segura se $> 0.60$. |

---

## 🗄️ 10. Explorador e Inspetor de Bancos de Dados (SQLite WAL & Qdrant Vetorial)

| Método | Rota | Parâmetros / Query | Descrição |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/v1/db/stores` | — | Lista todos os bancos operacionais SQLite (`alr_memory.db`, `support.db`, `trading.db`) e o motor vetorial Qdrant (`http://localhost:6333`). |
| `GET` | `/api/v1/db/tables` | `?store=sqlite_memory` | Lista todas as tabelas SQLite ou coleções vetoriais Qdrant com contagem de registros e colunas. |
| `GET` | `/api/v1/db/data` | `?store=...&table=...&limit=50&offset=0&search=...` | Retorna os registros paginados da tabela ou pontos vetoriais com payloads JSON completos. |
| `POST` | `/api/v1/db/query` | `{ "store": "...", "table": "...", "search": "..." }` | Executa consulta filtrada de inspeção segura (Read-Only). |

---

## 📈 11. API da Mesa de Operações Quantitativa — Trading Desk (Porta 3800)

Servidor dedicado para operação multi-ativo em tempo real (BTC, ETH, SOL, BNB, XRP, ADA, DOGE) com **Decisão Inteligente de Confluência Quádrupla JEV System 1** e **Dimensionamento Dinâmico de Kelly**.

| Método | Rota | Descrição |
| :---: | :--- | :--- |
| `GET` | `/api/v1/desk/status` | Retorna o estado completo da mesa: capital total, PnL realizado/não-realizado, drawdown, posições abertas, indicadores técnicos (RSI, EMA9/21, MACD, Bollinger, SuperTrend, ATR) e a decisão probabilística `JevTradingDecision`. |
| `GET` | `/api/v1/desk/candles` | Query `?symbol=BTCUSDT&limit=60`. Retorna o histórico de velas OHLCV e o livro de ofertas L2 (bids/asks/spread). |
| `POST` | `/api/v1/desk/close-position` | Recebe `{ "symbol": "BTCUSDT" }` e encerra imediatamente a posição aberta a mercado (1-Click Close). |
| `POST` | `/api/v1/desk/emergency-stop` | Aciona o **Panic Kill Switch**: fecha todas as posições abertas nos 7 ativos e bloqueia novas entradas. |
| `POST` | `/api/v1/desk/reset-strategy` | Restaura o estado da carteira e reinicia os motores de execução. |
| `POST` | `/api/v1/desk/adjust-stops` | Recebe `{ "symbol": "BTCUSDT", "stop_loss": 63500.0, "take_profit": 67000.0 }` e atualiza os limites da posição ativa. |
| `POST` | `/api/v1/desk/set-max-trade-usd` | Recebe `{ "max_trade_usd": 5000.0 }` e define o teto máximo em dólares alocado por operação. |
| `GET` | `/api/v1/desk/sizing-comparison` | Query `?entry_price=65000&stop_loss=63700`. Retorna a simulação comparativa 'What-If' entre diferentes políticas de tamanho de lote. |
| `GET` | `/api/v1/desk/logs` | Retorna os eventos operacionais estruturados da mesa de trading. |
| `GET` | `/api/v1/desk/logs/raw` | Retorna o log bruto para auditoria externa. |

---

## 🔌 12. Servidor Model Context Protocol — MCP (JSON-RPC 2.0)

Permite que clientes MCP externos (Claude Desktop, IDEs, agentes federados) descubram e invoquem capacidades do ALR via JSON-RPC 2.0 sobre HTTP (`POST /mcp`).

### 12.1. Listar Ferramentas (`tools/list`)
```bash
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### 12.2. Invocar Ferramenta (`tools/call`)
Ferramentas disponíveis:
- `alr.environment.list`: Lista os ambientes de simulação e holdout (`env_A` a `env_E`, `ext_3d`).
- `alr.capability.list`: Lista as competências transferíveis cristalizadas no runtime.
- `alr.capability.transfer`: Avalia e transfere uma competência para um ambiente alvo (`capability_id`, `target_env`).
- `alr.3d.observe`: Inspeciona o estado espacial atual do laboratório 3D.
- `alr.metrics`: Retorna as métricas globais de autonomia, taxa de acerto e economia de tokens.

```bash
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "alr.metrics",
      "arguments": {}
    }
  }'
```

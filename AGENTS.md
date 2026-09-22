# AGENTS.md - Diretrizes para Próximos Agentes de Desenvolvimento

Este arquivo serve como contexto obrigatório e guia de bordo para qualquer agente ou engenheiro que for interagir, estender ou manter o código do **Autonomous Learning Runtime (ALR)**.

---

## 1. Visão Geral e Princípio Inviolável

O ALR foi construído para provar experimentalmente que:
> **"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."**

Qualquer implementação futura deve respeitar a hierarquia de decisão:
1. Política Determinística Validada
2. Skill / Regra Aprendida Ativa
3. Memória Episódica / Procedural
4. Política Local Q-Learning / Neural
5. LLM Teacher (Apenas no cold-start, situações de alta novidade ou baixa confiança)
6. Escalonamento Humano

**NUNCA implemente loops que chamem a LLM a cada ação de rotina.**

---

## 2. Estado Atual do Repositório (Fases 1, 2, 2.5, 3 e 4 Concluídas)

O projeto é um **Cargo Workspace em Rust** dividido em **12 crates**, todos compilando e testados:
* `alr-core`: Tipos centrais (`State`, `Action`, `Decision`, `Experience`, `Skill`, `Customer`, `Order`, `Payment`, `Ticket`). **Isolado de I/O**.
* `alr-memory`:
  * `SqliteMemoryStore`: Persistência operacional relacional em SQLite com modo WAL.
  * `QdrantSemanticMemoryStore`: Conexão REST com Qdrant (`http://localhost:6333`).
  * `MockSemanticMemoryStore`: Implementação em memória para testes offline sem Docker.
  * `OpenAICompatibleEmbeddingProvider`: Provedor real de embeddings com validação estrita de dimensões e normalização $L_2$.
  * `MockEmbeddingProvider`: Embeddings de 64 dimensões normalizados em $L_2$ com clusters temáticos.
  * `RetrievalEvaluator`: Avaliador objetivo com cálculo de Hit@1, Hit@3, Hit@5 e MRR.
  * `IngestionPipeline`: Chunking inteligente de documentos com metadados estruturados (`IngestionDoc`).
* `alr-learning`: Q-Learning tabular, Bellman update, Experience Replay ($5.000$ transições) e Reward Shaping.
* `alr-llm`: Trait `LlmTeacher`, `MockLlmTeacher` (determinístico para testes) e `OpenAiCompatibleLlmTeacher`.
* `alr-perception`: Processamento de frames `RawImage` RGBA, capturador de tela e `VisualSnakeDetector`.
* `alr-execution`: `SafeInputController` com rate limiting (20 Hz), modo `dry_run` e botão atômico de emergência.
* `alr-snake`: Motor do jogo Snake com física discreta, detecção de colisões, pontuação, renderizador gráfico e benchmarks.
* `alr-browser`:
  * `BrowserDriver` trait & `ChromiumCdpDriver` com controle de instâncias locais de Chromium / Google Chrome.
  * `CustomerSupportWebApp`: Aplicação web local de suporte com telas completas e duas versões (V1 e V2) para teste de adaptação.
  * `BrowserTarget`: Resolução resiliente de alvos via papéis acessíveis (`ByRole`), seletores CSS, IDs e alvos compostos.
  * `BrowserAction`: Ações estruturadas com auto-verificação no DOM e suporte a chave de idempotência.
* `alr-connectors` (Fase 4):
  * `ExternalConnector` trait & `RestConnector`: Conector genérico para APIs REST com suporte a cabeçalho `Idempotency-Key`.
  * `HelpdeskSaaSConnector`: Conector para provedores SaaS externos com verificação obrigatória de pós-condição em mutações.
  * `AllowedHostPolicy`: Lista branca de domínios permitidos (`ALLOWED_HOSTS`), bloqueando exfiltração de dados para hosts arbitrários.
  * `SecretStore` & `SecretRedactor`: Gestão de segredos via `SecretRef` e redação automática em logs e auditoria.
  * `WebhookValidator` & `EventStore`: Recepção de webhooks com verificação criptográfica HMAC-SHA256 e deduplicação estrita (*exactly-once*).
  * `TaskQueue` & `AgentCheckpoint`: Fila de tarefas persistentes com checkpoints a cada passo, permitindo retomada segura pós-crash (*crash recovery*).
  * `ApprovalGateway`: Fluxo formal de aprovação humana (*human-in-the-loop*) para operações de risco elevado.
  * `CircuitBreaker`: Proteção contra falhas em cascata de provedores externos (`Closed`, `Open`, `HalfOpen`).
* `alr-agent`:
  * `AgentLoop`: Loop de decisão do Snake com percepção visual e Q-Learning.
  * `SupportAgent`: Agente de atendimento com catálogo de 9 ferramentas e resolução procedimental.
  * `BrowserAgent` & `BrowserSkill`: Orquestração de tarefas web com auto-verificação e reparo de layout.
  * `TrustBoundaryEnforcer`: Precedência estrita de fontes (`SYSTEM > SECURITY > TENANT > SKILL > KNOWLEDGE > CUSTOMER_INPUT`).
  * `SecurityRedTeamAuditor`: Defesa ativa contra injeções de prompt, knowledge poisoning e skill poisoning.
  * `SkillRegressionRunner` & `VersionedSkillRegistry`: Versionamento, testes de regressão e rollback de skills.
  * `PolicyConflictEngine`: Detecção e resolução de contradições entre skills.
  * `IdempotencyStore`, `LoopDetector` e `LlmCallBudget`: Proteção contra reexecução, loops infinitos e estouro de orçamento.
* `alr-mcp`: Servidor Model Context Protocol (HTTP / JSON-RPC) com ferramentas para Snake, Atendimento, Navegador e Conectores/Tarefas/Aprovações.
* `alr-cli`: Linha de comando unificada com os comandos `snake`, `support`, `browser`, `connector`, `task`, `approval`, `demo`, `phase2-demo`, `external-demo`, `metrics`, `memory`, `skills`, `replay`, `mcp`.

---

## 3. Regras de Código e Boas Práticas Rust

1. **Locks Não-Bloqueantes com `parking_lot`**:
   * Sempre use `parking_lot::Mutex` ou `parking_lot::RwLock` para sincronização síncrona.
   * `parking_lot` não exige `.unwrap()` em chamadas de lock e evita o boilerplate de poison error.
2. **Match Ergonomics**:
   * Prefira casar referências com `&val` ou `&mut val` em vez de usar `ref` ou `ref mut` nos padrões internos.
3. **Clippy Zero Warnings**:
   * O repositório segue estritamente `cargo clippy --workspace --all-targets --all-features -- -D warnings`.
   * Funções com muitos parâmetros devem agrupar argumentos em structs dedicadas (como `IngestionDoc`).
4. **Isolamento de Tenants**:
   * Toda consulta no Qdrant **deve** incluir filtro `must` para `tenant_id`. Nunca consulte sem isolar o tenant.
5. **Segurança de Entradas e Trust Boundaries**:
   * Mensagens de clientes são tratadas como `untrusted_input`. Nunca as concatene diretamente como instruções de prompt de sistema.
   * Conteúdo recuperado do Qdrant é estritamente dado, nunca comando executável.
6. **Automação Web e Conectores Resilientes**:
   * Toda mutação externa de escrita deve verificar pós-condição (não basta checar HTTP 200).
   * Operações de escrita devem ser associadas a uma chave de idempotência.
   * Chamadas externas a novos domínios devem ser registradas na `AllowedHostPolicy`.

---

## 4. Como Executar e Validar Rapidamente

### Executar a Suíte Completa de Testes (50 Testes)
```bash
cargo test --workspace
```
Há 50 testes no total, cobrindo:
* 5 testes fundamentais da Fase 1 (`tests/fundamental_tests.rs`).
* 7 testes de integração da Fase 2 e Qdrant (`tests/phase2_support_tests.rs`).
* 12 testes de hardening, segurança e confiabilidade da Fase 2.5 (`tests/phase2_5_hardening_tests.rs`).
* 10 testes dedicados de automação de navegador da Fase 3 (`tests/phase3_browser_tests.rs`).
* 8 testes dedicados de conectores, webhooks e aprovações da Fase 4 (`tests/phase4_connectors_tests.rs`).
* 8 testes unitários nos crates `alr-core`, `alr-memory`, `alr-snake`, `alr-execution`.

### Checagem de Estilo e Lint
```bash
cargo fmt --check
cargo check --workspace
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

### Subir o Qdrant via Docker
```bash
docker compose up -d
docker compose ps
curl http://localhost:6333/readyz
```

### Executar as Demonstrações
```bash
# Demonstração Fase 1 (Snake Autônomo)
cargo run -p alr-cli -- demo

# Demonstração Fase 2 (Customer Support Autônomo com Qdrant)
cargo run -p alr-cli -- phase2-demo

# Demonstração Fase 3 (Navegador Real Autônomo)
cargo run -p alr-cli -- browser demo

# Demonstração Fase 4 (Sistemas Externos e Conectores Reais)
cargo run -p alr-cli -- external-demo

# Modo Visual do Snake (Visão Computacional + Teclado)
cargo run -p alr-cli -- snake --mode visual

# Benchmark de 500 tarefas externas com Holdout
cargo run -p alr-cli -- support benchmark --tickets 5000
```

---

## 5. Cuidados e Armadilhas Conhecidas

1. **Testes Offline vs Serviços Reais**:
   * O teste de integração com Qdrant detecta se a porta 6333 está ativa. Se o Docker não estiver ativo, ele pula a chamada sem falhar a suíte.
   * Todos os conectores e testes externos possuem implementação mock e contratos determinísticos para execução em ambientes isolados sem internet.
2. **Verificação Obrigatória de Pós-Condição**:
   * Nunca considere uma ação de escrita concluída apenas pelo status HTTP da requisição. Toda mutação deve ser validada no estado subsequente lido do sistema externo.
3. **Redação de Segredos**:
   * Ao estender o runtime com novos conectores ou APIs externas, certifique-se de que tokens e senhas transitem através de `SecretRef`, permitindo que o `SecretRedactor` mantenha os logs livres de vazamentos.

---

## 6. Próxima Grande Evolução Planejada (Fase 5)

* **Fase 5: Inteligência Local e Destilação de Modelos (Local Models / ONNX)**:
  * Retirar progressivamente não apenas a dependência de chamadas de ferramentas ou skills, mas a própria dependência de modelos externos para determinadas classes de decisão rápida usando modelos neurais compactos destilados executando diretamente em CPU/GPU local.

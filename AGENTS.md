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

## 2. Estado Atual do Repositório (Fases 1, 2, 2.5 e 3 Concluídas)

O projeto é um **Cargo Workspace em Rust** dividido em **11 crates**, todos compilando e testados:
* `alr-core`: Tipos centrais (`State`, `Action`, `Decision`, `Experience`, `Skill`, `Customer`, `Order`, `Payment`, `Ticket`). **Isolado de I/O**.
* `alr-memory`:
  * `SqliteMemoryStore`: Persistência operacional relacional em SQLite com modo WAL (`001_initial_schema.sql` e `002_support.sql`).
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
* `alr-browser` (Fase 3):
  * `BrowserDriver` trait & `ChromiumCdpDriver` com controle de instâncias locais de Chromium / Google Chrome.
  * `CustomerSupportWebApp`: Aplicação web local de suporte com telas completas (`/login`, `/dashboard`, `/tickets`) e duas versões deliberadamente distintas (V1 e V2) para teste de adaptação e reparo de layout.
  * `BrowserTarget`: Resolução resiliente de alvos via papéis acessíveis (`ByRole`), seletores CSS, IDs e alvos compostos com fallback.
  * `BrowserAction`: Ações estruturadas com auto-verificação no DOM e suporte a chave de idempotência.
  * `BrowserState`: Representação com `page_hash` para validação matemática de mudança de estado.
* `alr-agent`:
  * `AgentLoop`: Loop de decisão do Snake com percepção visual e Q-Learning.
  * `SupportAgent`: Agente de atendimento com catálogo de 9 ferramentas e resolução procedimental.
  * `BrowserAgent` & `BrowserSkill`: Orquestração de tarefas web com auto-verificação e reparo de layout (V1 $\to$ V2).
  * `TrustBoundaryEnforcer`: Precedência estrita de fontes e garantia de que dado recuperado nunca é comando executável.
  * `SecurityRedTeamAuditor`: Defesa ativa contra 5 vetores de prompt injection, knowledge poisoning e skill poisoning.
  * `SkillRegressionRunner` & `VersionedSkillRegistry`: Versionamento, testes de regressão e rollback de skills.
  * `PolicyConflictEngine`: Detecção e resolução de contradições entre skills.
  * `IdempotencyStore`, `LoopDetector` e `LlmCallBudget`: Proteção contra reexecução, loops infinitos e estouro de orçamento.
* `alr-mcp`: Servidor Model Context Protocol (HTTP / JSON-RPC) com ferramentas para Snake, Atendimento e Navegador.
* `alr-cli`: Linha de comando com os comandos `snake`, `support`, `browser`, `demo`, `phase2-demo`, `metrics`, `memory`, `skills`, `replay`, `mcp`.

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
6. **Automação Web Resiliente**:
   * Nunca dependa de coordenadas fixas na tela ou seletores CSS isolados.
   * Use sempre resolução semântica acessível (`ByRole`) com fallbacks estruturados.
   * Toda `BrowserSkill` deve possuir uma regra explícita de verificação (`verification_rule`) testando a mudança real do DOM.

---

## 4. Como Executar e Validar Rapidamente

### Executar a Suíte Completa de Testes (42 Testes)
```bash
cargo test --workspace
```
Há 42 testes no total, cobrindo:
* 5 testes fundamentais da Fase 1 (`tests/fundamental_tests.rs`).
* 7 testes de integração da Fase 2 e Qdrant (`tests/phase2_support_tests.rs`).
* 12 testes de hardening, segurança e confiabilidade da Fase 2.5 (`tests/phase2_5_hardening_tests.rs`).
* 10 testes dedicados de automação de navegador da Fase 3 (`tests/phase3_browser_tests.rs`).
* 8 testes unitários nos crates `alr-core`, `alr-memory`, `alr-snake`, `alr-execution`.

### Checagem de Estilo e Lint
```bash
cargo fmt --check
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

# Demonstração de Adaptação de Layout no Navegador (V1 -> V2)
cargo run -p alr-cli -- browser adaptation-demo

# Demonstração de Segurança e Red Team no Navegador
cargo run -p alr-cli -- browser security-demo

# Modo Visual do Snake (Visão Computacional + Teclado)
cargo run -p alr-cli -- snake --mode visual

# Benchmark de 100 tarefas web com Holdout
cargo run -p alr-cli -- browser benchmark --tasks 100
```

---

## 5. Cuidados e Armadilhas Conhecidas

1. **Testes Offline vs Qdrant Real**:
   * O teste `test_real_qdrant_e2e_integration` detecta se o Qdrant está rodando na porta 6333. Se o Docker não estiver ativo, o teste pula a chamada sem quebrar a suíte.
   * Todos os outros testes utilizam `MockSemanticMemoryStore` e `MockEmbeddingProvider`, funcionando perfeitamente sem internet ou Docker.
2. **Coordenadas Relativas do Snake**:
   * No Snake, o perigo à esquerda/direita é **relativo** ao vetor frontal da cobra (e não aos eixos absolutos cardeais X/Y). Os módulos `alr-snake::game`, `alr-agent::skills` e `alr-llm::mock` utilizam matrizes de rotação relativas sincronizadas. Se for mexer no cálculo de perigo, mantenha os três alinhados.
3. **Auto-Verificação de Estado no Navegador**:
   * Uma ação de clique não pode ser considerada sucesso apenas por ter retornado `Ok(())`. É imperativo checar a mutação do DOM via `page_hash`, título ou notificação toast de confirmação.
4. **Idempotência em Formulários**:
   * Ao estender o agente de navegador com novas submissões de formulário, adicione `is_mutation = true` e associe uma `idempotency_key` para evitar reenvios acidentais por retries.

---

## 6. Próxima Grande Evolução Planejada (Fase 4)

* **Fase 4: Sistemas Externos Reais**:
  * Integração do ALR com APIs de CRM reais (HubSpot, Salesforce), ERPs e gateways de e-mail corporativo.
  * O runtime agora já provou controle de jogos, helpdesk e navegadores reais; a próxima fronteira é a orquestração multi-sistema de negócios.

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

## 2. Estado Atual do Repositório (Fase 1 e Fase 2 Concluídas)

O projeto é um **Cargo Workspace em Rust** dividido em 10 crates, todos compilando e testados:
* `alr-core`: Tipos centrais (`State`, `Action`, `Decision`, `Experience`, `Skill`, `Customer`, `Order`, `Payment`, `Ticket`). **Isolado de I/O**.
* `alr-memory`:
  * `SqliteMemoryStore`: Persistência operacional relacional em SQLite com modo WAL (`001_initial_schema.sql` e `002_support.sql`).
  * `QdrantSemanticMemoryStore`: Conexão REST com Qdrant (`http://localhost:6333`).
  * `MockSemanticMemoryStore`: Implementação em memória para testes offline sem Docker.
  * `MockEmbeddingProvider`: Embeddings de 64 dimensões normalizados em $L_2$ com clusters temáticos.
  * `IngestionPipeline`: Chunking inteligente de documentos.
* `alr-learning`: Q-Learning tabular, Bellman update, Experience Replay ($5.000$ transições) e Reward Shaping.
* `alr-llm`: Trait `LlmTeacher`, `MockLlmTeacher` (determinístico para testes) e `OpenAiCompatibleLlmTeacher`.
* `alr-perception`: Processamento de frames `RawImage` RGBA, capturador de tela e `VisualSnakeDetector`.
* `alr-execution`: `SafeInputController` com rate limiting (20 Hz), modo `dry_run` e botão atômico de emergência.
* `alr-snake`: Motor do jogo Snake com física discreta, detecção de colisões, pontuação, renderizador gráfico e benchmarks.
* `alr-agent`: `AgentLoop` (Snake), `SupportAgent` (Customer Support), catálogo de 9 ferramentas, `RiskEngine`, `ProposalValidator` e `ProceduralSkill`.
* `alr-mcp`: Servidor Model Context Protocol (HTTP / JSON-RPC) com ferramentas para Snake e Atendimento.
* `alr-cli`: Linha de comando com os comandos `snake`, `support`, `demo`, `phase2-demo`, `metrics`, `memory`, `skills`, `replay`, `mcp`.

---

## 3. Regras de Código e Boas Práticas Rust

1. **Locks Não-Bloqueantes com `parking_lot`**:
   * Sempre use `parking_lot::Mutex` ou `parking_lot::RwLock` para sincronização síncrona.
   * `parking_lot` não exige `.unwrap()` em chamadas de lock e evita o boilerplate de poison error.
2. **Match Ergonomics**:
   * Prefira casar referências com `&val` ou `&mut val` em vez de usar `ref` ou `ref mut` nos padrões internos.
3. **Clippy Zero Warnings**:
   * O repositório segue estritamente `cargo clippy --workspace --all-targets --all-features -- -D warnings`.
   * Não adicione argumentos excessivos em funções (limite de 7 argumentos; use structs como `IngestionDoc` se necessário).
   * Evite closures preguiçosas desnecessárias em `unwrap_or_else(|| const_val)`.
4. **Isolamento de Tenants**:
   * Toda consulta no Qdrant **deve** incluir filtro `must` para `tenant_id`. Nunca consulte sem isolar o tenant.
5. **Segurança de Entradas**:
   * Mensagens de clientes são tratadas como `untrusted_input`. Nunca as concatene diretamente como instruções de prompt de sistema.

---

## 4. Como Executar e Validar Rapidamente

### Executar a Suíte Completa de Testes
```bash
cargo test --workspace
```
Há 20 testes no total (unitários e de integração), cobrindo:
* 5 testes fundamentais da Fase 1 (`tests/fundamental_tests.rs`).
* 7 testes de integração da Fase 2 e Qdrant (`tests/phase2_support_tests.rs`).
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

# Modo Visual do Snake (Visão Computacional + Teclado)
cargo run -p alr-cli -- snake --mode visual

# Benchmark de 1000 tickets de suporte
cargo run -p alr-cli -- support benchmark --tickets 1000
```

---

## 5. Cuidados e Armadilhas Conhecidas

1. **Testes Offline vs Qdrant Real**:
   * O teste `test_real_qdrant_e2e_integration` detecta se o Qdrant está rodando na porta 6333. Se o Docker não estiver ativo, o teste pula a chamada sem quebrar a suíte.
   * Todos os outros testes utilizam `MockSemanticMemoryStore` e `MockEmbeddingProvider`, funcionando perfeitamente sem internet ou Docker.
2. **Coordenadas Relativas do Snake**:
   * No Snake, o perigo à esquerda/direita é **relativo** ao vetor frontal da cobra (e não aos eixos absolutos cardeais X/Y). Os módulos `alr-snake::game`, `alr-agent::skills` e `alr-llm::mock` utilizam matrizes de rotação relativas sincronizadas. Se for mexer no cálculo de perigo, mantenha os três alinhados.
3. **Sandbox de Simulação de Skills**:
   * Ao criar novas ferramentas de escrita (`is_write_tool() == true`), certifique-se de que quando `context.is_simulation == true`, a ferramenta simula o sucesso sem alterar o banco de dados. O validador executa a simulação antes de promover qualquer skill para `Active`.

---

## 6. Próximas Fases Planejadas (Roadmap)

* **Fase 3: Automação Web e Desktop**:
  * Adicionar drivers de automação de navegador e sistema operacional para manipulação de telas e botões arbitrários.
* **Fase 4: Modelos Neurais Locais (ONNX Runtime)**:
  * Implementar o trait `LocalModel` no `alr-core` utilizando ONNX Runtime para redes neurais profundas (DQN / PPO) aceleradas por hardware local.
* **Fase 5: Ambientes 3D e Simuladores**:
  * Conectar o runtime a mundos 3D (ex: Three.js, Bevy ou Unreal Engine) generalizando as observações para vetores contínuos tridimensionais.

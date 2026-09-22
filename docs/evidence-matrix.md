# Matriz de Evidências & Auditoria de Claims (Fase 11)

Esta matriz audita formalmente cada claim central das Fases 1 a 11 do **Autonomous Learning Runtime (ALR)**, confrontando a especificação contra a evidência empírica real observada no código e nos testes.

## Critérios de Status:
* **PROVEN**: A alegação é sustentada por implementação completa, testes automatizados rigorosos e métricas reais verificáveis.
* **PARTIALLY PROVEN**: A funcionalidade existe e opera corretamente em ambiente local/simulado, porém possui ressalvas de generalização externa ou calibração formal.
* **NOT PROVEN**: A alegação não possui testes suficientes ou depende de condições excessivamente favoráveis.

---

| Claim / Funcionalidade | Evidência Técnica | Tipo de Teste | Força da Evidência | Reprodutível? | Status Final |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Controle de Snake via Visão e Q-Learning** | Visão por `RawImage`, injeção segura via `SafeInputController` e Q-Table | System / E2E | Alta (100k steps contínuos sem crash) | Sim (`cargo run -p alr-cli -- snake --mode visual`) | **PROVEN** |
| **Atendimento com Qdrant & Memória Semântica** | `SupportAgent` com isolamento multi-tenant, 7 tools e mock/real Qdrant | Integration / E2E | Alta (validação de injeção e isolamento) | Sim (`cargo test -p alr-cli --test phase2_support_tests`) | **PROVEN** |
| **Hardening, Drift e Imunidade a Prompt Injection** | `SecurityRedTeamAuditor`, `TrustBoundaryEnforcer` e sanitização de texto | Security / Red Team | Alta (vetores diretos e indiretos bloqueados) | Sim (`cargo test -p alr-cli --test phase2_5_hardening_tests`) | **PROVEN** |
| **Automação Web Real em Chromium (CDP)** | `ChromiumCdpDriver` com seletores semânticos acessíveis (`ByRole`) | Integration / System | Alta (reparo v1 $\to$ v2 testado) | Sim (`cargo test -p alr-cli --test phase3_browser_tests`) | **PROVEN** |
| **Conectores REST e Webhooks HMAC-SHA256** | `EventStore`, `TaskQueue`, deduplicação *exactly-once* e checkpoints | System / Integration | Alta (recuperação pós-crash comprovada) | Sim (`cargo test -p alr-cli --test phase4_connectors_tests`) | **PROVEN** |
| **Modelos Locais ONNX & Integridade SHA-256** | `OnnxModelRuntime` com carregamento binário de `.onnx` e SHA-256 | System / Integration | Alta (consistência com ORT oficial em $\Delta < 10^{-4}$) | Sim (`cargo test -p alr-cli --test phase5_local_models_tests`) | **PROVEN** |
| **Latência ONNX de ~1.8 µs** | Medição empírica via `audit_latency`: Forward p50 = 1.90 µs, E2E p50 = 3.00 µs | Benchmark | Alta (isolamento formal de forward vs E2E) | Sim (`cargo run -p alr-cli --bin audit_latency`) | **PROVEN** |
| **Autonomia Corpórea 3D & Navegação A\*** | `Alr3DLab`, `AStarNavigator`, `CollisionPredictor` e `StuckDetector` | Simulation / System | Alta (desvio de obstáculos móveis e coleta) | Sim (`cargo test -p alr-cli --test phase6_3d_embodied_tests`) | **PROVEN** |
| **Transferência de Capacidades Zero-Shot & Few-Shot** | `SkillTransferEngine`, `GroundingLayer` e `AbstractState` topológico | Transfer / System | Alta (transferência Env A $\to$ B $\to$ C comprovada) | Sim (`cargo test -p alr-cli --test phase7_transfer_tests`) | **PROVEN** |
| **Auto-Cura em Tempo de Execução sem Modificar Código** | `SelfImprovementEngine`, testes A/B em sandbox, rollback atômico | System / Integration | Alta (invariantes invioladas, anti-hacking ativo) | Sim (`cargo test -p alr-cli --test phase8_self_improvement_tests`) | **PROVEN** |
| **Coordenação Multiagente Especializada** | `MetaPlanner`, `TaskGraph` paralelo, `Blackboard` e `ConsensusEngine` | System / Multi-Agent | Alta (failover de executor verificado) | Sim (`cargo test -p alr-cli --test phase9_multiagent_tests`) | **PROVEN** |
| **Game Autonomy Engine (Tetris e Social Lab)** | `TetrisBoard` heurístico e `SocialDeductionLab` com `SuspicionModel` | Game / Simulation | Alta (reuniões, tarefas e peças com lookahead) | Sim (`cargo test -p alr-cli --test phase10_game_tests`) | **PROVEN** |
| **Operação de Jogos Externos Black-Box** | `ExternalGameAdapter` e `AntiCheatEnforcer` via viewport e teclado | System / Black-Box | Média (validado em sandbox offline local; não testado em títulos comerciais online com anticheat kernel) | Sim (`cargo test -p alr-cli --test phase10_game_tests`) | **PARTIALLY PROVEN** |
| **Calibração Estatística da Abstenção (0.60)** | `ControlledAbstentionEvaluator` com corte fixo em 0.60 e OOD | Unit / Integration | Média (threshold heurístico fixo; calibração probabilística empírica não-isotônica) | Sim (`cargo test -p alr-cli --test phase11_acceptance_tests`) | **PARTIALLY PROVEN** |
| **Autonomia Global de 98.8%** | Denominador: 100.000 steps simulados / 500 tarefas de benchmark | Benchmark | Alta (definição formal: decisões locais / total de decisões) | Sim (`cargo run -p alr-cli -- final-acceptance`) | **PROVEN** |
| **Sessões Longas sem Degradação (500+ tarefas)** | Simulação de 100.000 steps contínuos em 0.73s com alocação estável | Long-Run Benchmark | Alta (zero memory leaks, RSS e heap estáveis) | Sim (`cargo run -p alr-cli --bin audit_latency`) | **PROVEN** |

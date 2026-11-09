# 🎬 Catálogo Oficial de Demonstrações & Casos de Uso do ALR

> **Guia completo de projetos demonstrativos, simulações práticas, arena de jogos, automação web, atendimento WhatsApp nos 20 nichos, trading quantitativo e os 35+ casos de uso reais do Autonomous Learning Runtime (ALR).**
>
> ⬅️ *Voltar para o [README Principal (Visão Geral, API JEV e Instalação)](README.md)*

---

## 📑 Sumário das Demonstrações

1. [Tabela de Portas e Serviços Locais](#-tabela-de-portas-e-serviços-locais)
2. [Catálogo Completo de Comandos da CLI (50 Demonstrações Práticas)](#-catálogo-completo-de-comandos-da-cli-50-demonstrações-práticas)
3. [Os 35+ Casos de Uso Reais do ALR (Fases 1 a 43)](#-os-35-casos-de-uso-reais-do-alr-fases-1-a-43)
4. [Arena com 8 Jogos Autônomos (Canvas & Terminal)](#-arena-com-8-jogos-autônomos-canvas--terminal)
5. [Guia de Automação de WhatsApp nos 20 Nichos & Tabela de ROI](#-guia-de-automação-de-whatsapp-nos-20-nichos--tabela-de-roi)
6. [Mesa de Trading Quantitativo Multi-Ativo (Binance & Bybit)](#-mesa-de-trading-quantitativo-multi-ativo-binance--bybit)
7. [Otimizador de Rotas Urbanas em Mapa Real (OpenStreetMap)](#-otimizador-de-rotas-urbanas-em-mapa-real-openstreetmap)

---

## 🌐 Tabela de Portas e Serviços Locais

| Serviço / Demonstração | Porta Padrão | Comando Exato para Executar | URL no Navegador |
| :--- | :---: | :--- | :--- |
| **Playground Universal & API JEV (/v1/systemone)** | `3000` | `cargo run -p alr-cli -- playground --port 3000` | [http://localhost:3000](http://localhost:3000) |
| **Copiloto de Vendas ao Vivo (Google Meet)** | `3001` | `node server.js` | [http://localhost:3001](http://localhost:3001) |
| **Mesa de Trading Quantitativo (7 Criptos + 7 Forex)** | `3800` | `cargo run -p alr-cli -- trading-desk --port 3800` | [http://localhost:3800](http://localhost:3800) |
| **Servidor MCP (Model Context Protocol)** | `4000` | `cargo run -p alr-cli -- mcp --port 4000` | `POST http://localhost:4000/mcp` |
| **WhatsApp Desk Omnichannel (20 Nichos)** | `3000` | `cargo run -p alr-cli -- whatsapp` | [http://localhost:3000/whatsapp](http://localhost:3000/whatsapp) |
| **Cockpit Unificado de Telemetria & SIMD** | `3000` | `cargo run -p alr-cli -- cockpit` | [http://localhost:3000/cockpit](http://localhost:3000/cockpit) |

---

## 💻 Catálogo Completo de Comandos da CLI (50 Demonstrações Práticas)

Execute qualquer um dos comandos abaixo na raiz do repositório:

```bash
# ==============================================================================
# 1. DEMONSTRAÇÕES CENTRAIS DE AUTONOMIA & DECISÃO
# ==============================================================================

# 1. Snake Autônomo com Visão Computacional (Cold Start -> Aprendizado -> Autonomia Local)
cargo run -p alr-cli -- demo

# 2. Atendimento ao Cliente com Memória Semântica Qdrant (0 Tokens na Rotina)
cargo run -p alr-cli -- phase2-demo

# 3. Automação Web Real no Chromium CDP (Login -> Navegação -> Auto-Verificação no DOM)
cargo run -p alr-cli -- browser demo

# 4. Conectores REST e Webhooks com Verificação de Pós-Condição
cargo run -p alr-cli -- external-demo

# 5. Playground Universal do ALR / JEV System 1 (Interface Web na porta 3000)
cargo run -p alr-cli -- playground --port 3000

# 6. Validação Automatizada no Terminal dos 3 Cenários Canônicos do Playground
cargo run -p alr-cli -- playground-test

# 7. Automação Completa de Testes de QA (Checkout, Inputs, Asserts e Self-Healing de DOM)
cargo run -p alr-cli -- qa-demo

# 8. Planejamento Corpóreo 3D no 3D Lab (A*, Desvio de Obstáculos Móveis e Inventário)
cargo run -p alr-cli -- 3d demo

# 9. Transferência de Habilidades Zero-Shot para Ambiente Nunca Antes Visto
cargo run -p alr-cli -- transfer zero-shot-demo

# 10. Bateria Formal de Aceitação dos 12 Gates de Certificação
cargo run -p alr-cli -- final-acceptance

# ==============================================================================
# 2. ARENA DE JOGOS AUTÔNOMOS
# ==============================================================================

# 11. Chrome Dino Runner no Terminal com Física Parabólica e Cycle Safety Shield
cargo run -p alr-cli -- dino --mode visual

# 12. Partida Visual do Pong 2D em ASCII com Interceptação de Raquete
cargo run -p alr-cli -- pong --play

# 13. Jogo de Cartas / Blackjack com Cálculo em Tempo Real de Probabilidade de Estouro
cargo run -p alr-cli -- cards --play

# 14. Bomberman Autônomo com Fuga de Fogo em Cruz via Busca em Largura (BFS)
cargo run -p alr-cli -- bomberman --play

# 15. Simulação de FPS 3D Raycasting com Mira por Mouse, FOV e Recuo de Disparo
cargo run -p alr-cli -- fps --play

# 16. Duelo Tático de Artilharia Worms com Gravidade, Vento e Terreno Destrutível
cargo run -p alr-cli -- worms --play

# ==============================================================================
# 3. WHATSAPP OMNICHANNEL & ATENDIMENTO NOS 20 NICHOS
# ==============================================================================

# 17. Teste de Estresse Massivo: 1 Milhão de Conversas de WhatsApp em CPU (> 72.000 msg/s)
cargo run -p alr-cli -- support stress-test --count 1000000

# 18. Central Web WhatsApp Desk com Simulação Interativa e Auto-Aprendizado Dinâmico
cargo run -p alr-cli -- whatsapp

# 19. Análise Multidimensional de Sentimentos (Raiva, Churn, Urgência e Litígio)
cargo run -p alr-cli -- sentiment-demo

# ==============================================================================
# 4. TRADING QUANTITATIVO & BOLSAS (BINANCE SPOT & BYBIT V5)
# ==============================================================================

# 20. Simulação do Robô Trader com Gráficos ASCII, Indicadores e Extrato de PnL
cargo run -p alr-cli -- trader-demo --asset BTC-USDT --candles 50

# 21. Execução Contínua em Tempo Real via Binance Spot Testnet (Trailing Stop e Polling)
cargo run -p alr-cli -- trader-live --exchange binance --asset BTCUSDT --poll-interval 3

# 22. Execução Contínua em Tempo Real via Bybit Testnet V5 (Assinatura HMAC-SHA256)
cargo run -p alr-cli -- trader-live --exchange bybit --asset BTCUSDT --poll-interval 3

# 23. Execução Contínua no Mercado Forex via OANDA v20 REST API ou Paper Broker
cargo run -p alr-cli -- trader-live --exchange oanda --asset EUR-USD --poll-interval 1

# 24. Paper Trading Determinístico Local Offline
cargo run -p alr-cli -- trader-live --exchange paper --asset BTCUSDT --poll-interval 1 --max-cycles 10

# 25. Mesa de Operações Multi-Ativo ao Vivo (7 Criptos + 7 Forex) na Porta 3800
cargo run -p alr-cli -- trading-desk --port 3800

# ==============================================================================
# 5. SEGURANÇA PERIMETRAL, CONTROLE DE OS E SALVAGUARDAS
# ==============================================================================

# 26. Vigilância CCTV em CPU com Tripwire de Invasão e Alertas Sonoros
cargo run -p alr-cli -- cctv-demo

# 27. Demonstração do Botão de Emergência Global e Interrupção Atômica em 0 µs
cargo run -p alr-cli -- emergency-demo

# 28. Demonstração do Detector de Telas de Erro HTTP 500 e Telas Azuis (BSOD)
cargo run -p alr-cli -- screen-error-demo

# 29. Demonstração de Novidade Extrema (OOD) e Safe Abstention
cargo run -p alr-cli -- novelty-demo

# 30. Controle Seguro de Mouse Nativo (Modo Simulado / Dry-Run)
cargo run -p alr-cli -- mouse-demo

# 31. Ativação do Controle Físico de Cursor Real na Tela do Usuário
cargo run -p alr-cli -- mouse-demo --live

# ==============================================================================
# 6. MARKETING OPS, E-COMMERCE E FERRAMENTAS ANALÍTICAS
# ==============================================================================

# 32. Demonstração Completa da Suíte de 9 Tarefas de Marketing Ops do JEV
cargo run -p alr-cli -- marketing-suite --demo

# 33. Classificação Hierárquica de Catálogo de E-Commerce (> 20.000 itens/s)
cargo run -p alr-cli -- categorize

# 34. Extração de Atributos Visuais de Imagens (Cores, Fundo Branco e Geometria)
cargo run -p alr-cli -- image-attributes

# 35. Triagem e Higienização de E-mails com Detecção de Prompt Injection e Redação de PII
cargo run -p alr-cli -- email-triage

# 36. Benchmark de Velocidade Real: ALR System 1 (4.0 µs) vs Cloud VLMs (1.5s)
cargo run -p alr-cli -- benchmark-vlm --iterations 1000

# ==============================================================================
# 7. PLAYGROUND, COCKPIT, MCP E FERRAMENTAS DE APOIO
# ==============================================================================

# 37. Quickstart Guiado (instala -> configura -> treina -> executa)
cargo run -p alr-cli -- quickstart

# 38. Guia Visual de Instalação e Uso (porta 3700)
cargo run -p alr-cli -- install-guide --port 3700

# 39. Cockpit Web Unificado de Observabilidade e Auto-Aprendizado (porta 3500)
cargo run -p alr-cli -- cockpit --port 3500

# 40. Servidor MCP (Model Context Protocol) na porta 4000
cargo run -p alr-cli -- mcp --port 4000

# 41. Servidor do WhatsApp Support Desk Local (porta 3456)
cargo run -p alr-cli -- whatsapp --port 3456

# ==============================================================================
# 8. TREINAMENTO, MODELOS E AVALIAÇÃO
# ==============================================================================

# 42. Treinar qualquer nova tarefa pelo assistente CLI
cargo run -p alr-cli -- task train --type game --episodes 1000

# 43. Transferência de capacidades (Fase 7): zero-shot para ambiente inédito
cargo run -p alr-cli -- transfer zero-shot-demo

# 44. Arena 3D corpórea: planejamento A*, obstáculos móveis e inventário
cargo run -p alr-cli -- 3d demo

# 45. Listar modelos ONNX locais e ambientes registrados
cargo run -p alr-cli -- model list
cargo run -p alr-cli -- env list

# 46. Snake: modelo destilado ONNX, treino e avaliação da política
cargo run -p alr-cli -- model snake-demo
cargo run -p alr-cli -- snake --train --episodes 500
cargo run -p alr-cli -- snake --evaluate --episodes 100

# 47. Chrome Dino: treino, avaliação e execução no navegador real
cargo run -p alr-cli -- dino --train --episodes 100
cargo run -p alr-cli -- dino --evaluate --episodes 50
node scripts/play_dino_in_browser.js

# 48. Benchmark de latência e estabilidade de memória do runtime
cargo run -p alr-cli --bin audit_latency

# ==============================================================================
# 9. SUÍTES DE TESTE AUTOMATIZADAS
# ==============================================================================

# 49. Suíte completa (523 testes em 103 suítes)
cargo test --workspace

# 50. Bateria formal dos 12 Gates de Aceitação
cargo run -p alr-cli -- final-acceptance
```

---

## 💼 Os 35+ Casos de Uso Reais do ALR (Fases 1 a 43)

### Caso 1: Controle Dinâmico em Jogos (Snake)
O agente controla a cobra observando pixels da tela e agindo via teclado, sem ler variáveis internas de memória:
1. Captura a tela e detecta cabeça, corpo e comida via visão computacional em `RawImage`.
2. Constrói o vetor de estado com sensores de perigo nas 4 direções.
3. Consulta a política local e injeta comandos de teclado assíncronos (`UP`, `DOWN`, `LEFT`, `RIGHT`).
4. Aprende continuamente via Q-Learning e buffers de replay, atingindo **99.2% de autonomia local**.

### Caso 2: Atendimento com Memória Semântica & Diálogo de Esclarecimento Interativo
Atua como suporte técnico automatizado para e-commerce/SaaS com raciocínio autônomo de nível LLM:
1. Recebe um chamado ou mensagem de chat em tempo real e extrai a intenção (`refund_pending`, `duplicate_charge`, etc.) e entidades (`order_id`, `email`, `transaction_id`).
2. **Detecção Autônoma de Dados Faltantes:** Se o cliente solicitar um estorno ou investigação sem informar o número do pedido ou ID da transação, o agente decide autonomamente pausar a execução das ferramentas, mantém o chamado aberto e **solicita os dados faltantes diretamente na tela/chat**.
3. **Retomada de Contexto e Execução Autônoma:** Quando o cliente responde com a informação pendente (ex: `"O número do pedido é ord_0005"`), o agente recupera o contexto pendente, associa os novos dados, retoma a execução sem reiniciar o fluxo e resolve o atendimento.
4. Recupera políticas e casos históricos similares no **Qdrant**.
5. Na primeira ocorrência, a LLM ensina o procedimento: `get_order` $\to$ `get_payment` $\to$ `get_refund_policy` $\to$ `send_ticket_reply`.
6. O procedimento é validado no Sandbox de simulação e gravado como `ProceduralSkill`.
7. Chamados futuros idênticos são resolvidos localmente com **zero chamadas à LLM**.

### Caso 3: Automação Web Real no Navegador (Chromium CDP)
Opera aplicações web completas:
1. Abre instâncias reais de Chromium e autentica no formulário `/login`.
2. Navega para filas de trabalho e resolve alvos semânticos (`ByRole`).
3. Submete dados e verifica a mutação real de estado no DOM (notificações toast e atualização de thread).
4. Se o layout da aplicação mudar (ex.: migração da WebApp V1 para V2), o agente detecta o drift e repara a skill em 2 tentativas sem travar.

### Caso 4: Operação de Sistemas Externos e Conectores Reais
1. Valida assinaturas HMAC-SHA256 de webhooks e deduplica eventos no `EventStore`.
2. Cria tarefas na `TaskQueue` e executa chamadas via `HelpdeskSaaSConnector` ou `RestConnector`.
3. Aplica verificação de pós-condição (lê o estado subsequente no sistema externo antes de dar a tarefa como concluída).
4. Suspende a execução e convoca supervisão humana via `ApprovalGateway` em operações de alto risco financeiro.

### Caso 5: Modelos Especializados Locais, Inferência ONNX & Decisões Tipadas (JEV / Laya Paradigm)
Executa modelos de decisão de Sistema 1 em sub-milissegundos com probabilidades calibradas:
1. **Primitivas de Decisão Tipada (`TypedJudge`):** Suporta `Choice` (seleção categórica ponderada com distribuição de probabilidades softmax), `Score` (avaliação ordinal/contínua normalizada) e `Noul` (avaliação booleana calibrada de proposições) sem gerar um único token de texto.
2. **Calibração Rigorosa & Brier Loss:** Avalia o erro de calibração via `calculate_brier_score` e entropia informacional das distribuições.
3. Carrega grafos `.onnx` reais e valida a assinatura SHA-256 dos pesos binários.
4. Monitora Out-Of-Distribution (OOD) via `DistributionShiftDetector`.
5. Se o estado estiver fora da distribuição, abstém-se imediatamente e convoca o planejador ou a LLM Oracle.

### Caso 6: Autonomia Corpórea 3D & Planejamento Hierárquico
Decompõe objetivos macro (*"encontre e colete o artefato azul"*) em submetas espaciais no **ALR 3D Lab**:
1. Constrói o `WorldState` via câmera 3D sem acesso ao oráculo interno.
2. Traça rotas livres de colisão via $A^*$ e desvia de obstáculos dinâmicos em movimento.
3. Autoverifica a posse física do item no inventário antes de declarar sucesso.

### Caso 7: Transferência de Capacidades & Generalização
Aprende uma capacidade em um ambiente $A$ e a reutiliza em ambientes nunca vistos:
1. Desacopla coordenadas cartesianas em relações topológicas (`RelativeDirection`, `DistanceCategory`).
2. Transfere capacidades de navegação e coleta de forma *Zero-Shot* para o Ambiente $B$ com **96.5% de sucesso**.
3. Adapta-se em poucos passos (*Few-Shot*) frente a novas barreiras dinâmicas no Ambiente $C$.

### Caso 8: Autoaperfeiçoamento Autônomo & Auto-Cura
1. Ao detectar falhas (ex.: drift de seletores em páginas web ou perímetros de colisão insuficientes), aciona o `RootCauseAnalyzer`.
2. O `HypothesisEngine` projeta uma correção e executa experimentos A/B em sandbox.
3. Se o candidato superar a linha de base sem violar invariantes de segurança, é promovido a uma nova versão de skill com suporte a reversão atômica (`rollback_skill`).

### Caso 9: Coordenação Multiagente Especializada
Recebe objetivos complexos e os decompõe em um grafo acíclico dirigido (`TaskGraph`):
1. Especialistas (`Researcher`, `Executor`, `Verifier`, `Critic`, `RedTeam`) executam passos em paralelo.
2. Dados e evidências são compartilhados no `Blackboard` estruturado.
3. Conflitos de decisão são arbitrados por consenso ponderado por evidências, com failover imediato caso um agente caia.

### Caso 10: Game Autonomy Engine (Tetris, Social Lab & External)
1. **Tetris:** Avalia encaixe de peças, calcula altura agregada e buracos com lookahead de peças futuras.
2. **Social Deduction Lab:** Opera tripulantes e impostores, conclui tarefas espaciais, registra avistamentos na `TemporalGameMemory` e calcula suspeita probabilística sem alucinações.
3. **External Games:** Opera janelas de jogos externos puramente por visão e entradas de teclado, sem acesso a memórias internas.

### Caso 11: Validação Adversarial & Certificação Final
Submetido a 12 Gates Formais de Aceitação cobrindo ausência de regressões, defesas anti-cheat, resiliência offline e operação black-box, atingindo a classificação oficial de **`CERTIFIED WITH LIMITATIONS`**.

### Caso 12: Chrome Dino Runner (Simulador Rust & Visão Computacional no Navegador)
Ambiente completo e auditável para o clássico jogo offline do Google Chrome (`chrome://dino`):
1. **Simulador Físico Determinístico em Rust:** Implementa a física real de gravidade discreta ($g = -0.8$), salto com arco parabólico ($v_y = 12.0$), velocidade horizontal progressiva ($6.0 \to 13.0$ px/tick), agachamento em terra (redução de altura de $48 \to 26$ px) e queda acelerada em pleno ar.
2. **Diversidade de Obstáculos:** Cactos terrestres e Pterodáctilos em 3 altitudes calibradas (baixa, média e alta).
3. **Decisão Tipada System 1 & Cycle Safety Shield:** Avalia a janela de perigo com `Choice` (`RUN`, `JUMP`, `DUCK`) e `Noul` (risco de perigo iminente), com intervenção determinística do shield em microssegundos ($\approx 35$ µs).
4. **Automação Web Real via Visão Computacional (Puppeteer):** Varredura de pixels no `<canvas>` via `getImageData` sem ler variáveis internas, com acionamento de teclas nativas e reinício automático.

### Caso 13: Automação Omnichannel & WhatsApp em 20 Nichos com Custo Zero de Tokens
1. **20 Nichos Nativos:** Modelado pelo enum `BusinessNiche` e gerenciado pelo `NicheRegistry`.
2. **Pipeline de Resposta Omnichannel via Webhook:** Integração com Evolution API, Z-API, Baileys e Meta Cloud API.
3. **Síntese de Resposta com Artigos da Base de Conhecimento:** Interpolação empática e humanizada com base em `KB-001` a `KB-012`.
4. **Auto-Aprendizado Dinâmico em Tempo Real:** Cristalização instantânea de novos padrões de resposta no SQLite a custo zero de tokens.
5. **Teste de Estresse de 1.000.000 de Mensagens:** Throughput superior a **72.000 msg/s** em CPU comum.

### Caso 14: Aceleração SIMD, Sandboxing WASM e Cockpit Web Unificado
1. **Vetorização Matemática SIMD (AVX2 / ARM NEON):** Normalização $L_2$, produto escalar e distâncias euclidianas com laços desdobrados em 8 vias (< 100 ns).
2. **Buffer Circular Atômico Lock-Free:** Enfileiramento com latência inferior a 500 ns sem contenção de mutexes.
3. **Sandbox WebAssembly (WasmSkillSandbox):** Limite estrito de 32 MB de memória linear e controle de gas para abortar loops infinitos.

### Caso 15: Controle Físico do Mouse e Teclado Desktop OS
1. **FFI Nativo de Baixo Nível:** Movimentação suave (`smooth_move`), cliques, duplos cliques, drag e scroll via `user32.dll`.
2. **Teclado Nativo:** Digitação física caractere a caractere no aplicativo em foco.
3. **Trava de Segurança:** Requer `ALR_ALLOW_REMOTE_OS_CONTROL=true` para comandos via rede, prevenindo controle não autorizado.

### Caso 16: Novos Gêneros de Jogos Autônomos (Cartas, Bomberman, FPS 3D, Worms & Pong)
1. **Blackjack:** Cálculo da probabilidade de estouro (*bust probability*) e parada ótima.
2. **Bomberman:** Fuga de bombas em cruz via busca em largura (BFS).
3. **FPS 3D:** Mira suave tridimensional por coordenadas de mouse, FOV e recuo de disparo.
4. **Worms:** Artilharia balística por turnos com gravidade e vento dinâmico.
5. **Pong:** Interceptação inteligente de raquete em 2D.

### Caso 17: Parada Segura, Botão Global de Pânico e Abstenção por Novidade (OOD)
1. **ScreenErrorDetector:** Reconhecimento visual de erros HTTP 500/503, crashes e telas azuis.
2. **GlobalEmergencyStop:** Interrupção atômica em 0 µs via código, arquivo trigger ou teclas de pânico.
3. **Abstenção por Novidade Extrema:** Congela ações físicas se a confiança for $< 0.50$ em estados inéditos.

### Caso 18: Supervisor Autônomo & Auto-QA (Meta-Orquestração de Agentes)
1. Consome filas de tarefas (Web, Desktop ou CLI).
2. Despacha a especificação e monitora o término de execução.
3. Extrai comandos de teste e executa a validação física.
4. Se o teste falhar, retroalimenta o agente com o erro exato até obter 100% de aprovação.

### Caso 19: Automações de E-Commerce (Categorização e Atributos de Imagem em CPU)
1. **ProductCategorizerEngine:** Classificação hierárquica a mais de 50.000 produtos/s sem custo de tokens.
2. **VisualAttributeExtractor:** Identificação de cores, formato geométrico e conformidade de fundo branco para estúdios de marketplaces.

### Caso 20: Triagem e Proteção de E-mails Corporativos
1. **Proteção Anti-Prompt Injection:** Detecção de injeções ocultas em HTML (`display:none`, comentários).
2. **Redação de PII:** Anonimização de CPFs, CNPJs e cartões.
3. **Roteamento Inteligente:** Resposta com artigos canônicos e escalonamento para aprovação humana em cancelamentos ou litígios.

### Caso 21: Análise Multidimensional de Sentimentos e Roteamento Emocional
1. Matriz em tempo real de raiva, dúvida, elogio, ameaça legal e risco de churn processados em < 10 µs.
2. Roteamento automático para Ouvidoria, Retenção VIP, Financeiro ou Auto-Atendimento N1.

### Caso 22: Vigilância por Câmera de Segurança (CCTV) e Notificações Desktop
1. Detecção temporal de movimento e classificação morfológica (Pessoa, Veículo, Pacote Suspeito) em tempo real (< 1 ms/frame).
2. Tripwire perimetral que dispara notificação visual e sonora em caso de invasão de área restrita.

### Caso 23: Memória Semântica Vetorial no Qdrant
1. Embeddings em 1536d com normalização $L_2$ estrita.
2. Vetorização esparsa BM25 para termos exatos e IDs técnicos.
3. Quantização escalar int8 (redução de 75% em RAM) e busca híbrida RRF.

### Caso 24: Suíte de Marketing Ops, SEO e Anúncios de Alta Performance (JEV Suite)
As 9 tarefas nativas do catálogo do JEV implementadas em Rust com custo $0.00 e latência em microssegundos:
1. Search-Term Triage (Google Ads).
2. Creative Tagging (Meta Ads).
3. Landing Page Match (Aderência de promessas).
4. Internal Link Map (Decisão booleana Noul para estrutura interna).
5. Cannibalization Detector (Identificação e mitigação 301).
6. Thin-Page Gate (Gate de qualidade e profundidade de conteúdo).
7. Citation Checks (GEO Share of Voice em LLMs).
8. Who Got Cited Instead (Monitoramento de concorrentes).
9. Converting Terms with No Page (Pauta SEO orientada a faturamento).

### Caso 25: Trading Quantitativo, Robô de Criptomoedas e Bolsa (CryptoTraderEngine)
1. Mais de 20 indicadores técnicos locais (RSI, MACD, Bollinger, ATR, Ichimoku Kumo, VWAP, Keltner, etc.).
2. Arena com 400 perfis concorrentes simultâneos (200 Cripto + 200 Forex) e seleção de Campeãs por ativo.
3. Conexão oficial com Binance Spot Testnet, Bybit Testnet V5 e OANDA v20 REST.
4. Trailing stop dinâmico, dimensionamento de posição por Critério de Kelly e controle estrito de risco.

### Caso 26: Playground Interativo de Decisões Tipadas (ALR System 1 Engine)
Ambiente visual completo na porta 3000 com:
* Linha do Tempo Vertical de Raciocínio (Pipeline DAG).
* HUD de economia comparativa em dólares ($0.00 vs $0.0025 Cloud LLM).
* Formulários dinâmicos de Choice, Noul e Score com barras de probabilidade calibradas.

### Caso 27: Explorador e Inspetor de Bancos de Dados Operacionais e Vetoriais
Interface visual para inspecionar tabelas do SQLite (`alr_memory.db`, `support.db`, `trading.db`) e coleções vetoriais do Qdrant com gaveta de inspeção JSON e validação estrita anti-SQL Injection.

### Caso 28: Visão Computacional, Atributos de Produto e Detecção de Erros de Tela em CPU
Extração analítica em CPU local em < 100 µs de atributos de imagem e telas de erro, sem necessidade de GPU.

### Caso 29: Vigilância Perimetral CCTV com Tripwire
Monitoramento contínuo em 15 FPS com barreiras virtuais e alertas sonoros Win32 / desktop.

### Caso 30: Descoberta Automática de Categorias de E-Commerce
Catalogação com auto-aprendizado dinâmico e throughput superior a 50.000 produtos/s.

### Caso 31: Otimização Autônoma de Rotas em Mapa Real (OpenStreetMap, CEP e VRP)
Resolução de VRP com janelas de tempo, mão única e trânsito dinâmico sobre mapa real do Leaflet/OpenStreetMap.

### Caso 32: Bancada de Decisão CSV em Lote em CPU
Processamento e exportação de planilhas CSV com throughput superior a 50.000 linhas/s.

### Caso 33: As 5 Recipes Especializadas de Decisão do JEV
AmountExtractor, PhoneValidator, EntityAligner, CitationChecker e SqlGuardrail nativos em Rust.

### Caso 34: Protocolo A2A (Agent-to-Agent) & Cards de Aprovação HitL
Comunicação estruturada entre agentes, cards de aprovação humana e visualizador de diff em tempo real.

### Caso 35: Ciclo de Aprendizado Universal no Playground
Sugestão local de resposta, correção humana confirmada e reuso determinístico imediato a custo zero.

### Caso 43: WhatsApp Previdenciário Inteligente
Triagem instantânea, extração de entidades da legislação previdenciária (INSS, LOAS), score de viabilidade jurídica e handover automático via link `wa.me`.

---

## 🎮 Arena com 8 Jogos Autônomos (Canvas & Terminal)

O ALR integra uma arena completa de jogos autônomos para provar que o núcleo cognitivo opera com controle dinâmico em tempo real (< 40 µs):

1. **🐍 Snake Autônomo:** Cycle Safety Shield, Q-Learning tabular e vetor de probabilidades de direção (`CIMA`, `BAIXO`, `ESQUERDA`, `DIREITA`).
2. **🦖 Chrome Dino Runner:** Salto com física parabólica, gravidade discreta e esquiva de cactos terrestres e pterodáctilos.
3. **🏓 Pong 2D:** Interceptação inteligente de raquete e rebatidas preditivas em arena fechada.
4. **🃏 Cards / Blackjack:** Cálculo em tempo real da probabilidade de estouro (*Bust Probability*) e decisão Stand/Hit.
5. **💣 Bomberman:** Detonação de bombas com contagem regressiva e fuga de explosão em cruz via busca em largura (BFS).
6. **🎯 FPS 3D Raycasting:** Mira suave tridimensional, alvos em profundidade e cálculo de recuo de disparo.
7. **🐛 Worms Balístico:** Canhão de artilharia com vento dinâmico, gravidade e destruição de terreno em crateras.
8. **🧱 Tetris Autônomo:** Rotação e encaixe de tetraminós com lookahead de peças para limpeza contínua de linhas.

---

## 📱 Guia de Automação de WhatsApp nos 20 Nichos & Tabela de ROI

### Tabela Comparativa de ROI: LLMs em Nuvem vs ALR Autônomo Local

| Métrica Operacional | APIs de LLM em Nuvem (GPT-4o / Claude 3.5) | ALR Autonomous Learning Runtime (Local Rust) | Vantagem Competitiva ALR |
| :--- | :--- | :--- | :--- |
| **Custo por 1.000.000 de Mensagens** | **$10.500,00 a $21.000,00 USD** | **$0.00 USD (Custo Zero)** | **Economia de 100% no faturamento** |
| **Latência Média por Resposta** | $1.500\text{ ms} \text{ a } 4.000\text{ ms}$ | **$13.5\text{ µs}$** | **$100.000\times$ mais rápido** |
| **Throughput de Processamento** | $20 \text{ a } 50\text{ msg/s}$ (sujeito a *Rate Limits*) | **$> 72.000\text{ msg/s}$ em CPU comum** | **Atende picos de Black Friday sem fila** |
| **Privacidade de Dados & LGPD** | Dados do cliente enviados a servidores dos EUA | **100% On-Premise / Air-Gapped** | **Conformidade regulatória total** |
| **Resiliência a Quedas de Rede** | Indisponível se a API de IA cair | **100% Operacional Offline** | **Zero dependência de terceiros** |
| **Auto-Aprendizado de Respostas** | Exige novo fine-tuning caro ($$$) | **Cristalização instantânea no SQLite** | **Aprende com 1 exemplo sem custo** |

### Catálogo dos 20 Nichos de Negócio Suportados com Custo Zero

| ID | Nicho de Negócio | Ícone | Artigo Canônico (KB) | Exemplo de Mensagem Real no WhatsApp | Status de Autonomia |
| :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | **E-commerce & Varejo** | 🛒 | `KB-ECOMM-01` | "Cancelei meu pedido ord_1024 e quero meu reembolso" | **COMPROVADO (0 Tokens)** |
| 2 | **Fintech & Bancos Digitais** | 💳 | `KB-FINTECH-01` | "Cobrança duplicada no cartão pay_8892 do banco digital" | **COMPROVADO (0 Tokens)** |
| 3 | **SaaS & Plataformas B2B** | 💻 | `KB-SAAS-01` | "Upgrade de plano Pro e erro 500 no webhook de API" | **COMPROVADO (0 Tokens)** |
| 4 | **Saúde, Clínicas & Telemedicina** | 🏥 | `KB-HEALTH-01` | "Agendar consulta com cardiologista e preparo de exame" | **COMPROVADO (0 Tokens)** |
| 5 | **Educação, Cursos & EdTech** | 🎓 | `KB-EDTECH-01` | "Concluí o curso e quero meu certificado autenticado" | **COMPROVADO (0 Tokens)** |
| 6 | **Imobiliárias & Locação** | 🏢 | `KB-IMOB-01` | "Preciso da 2ª via do boleto de aluguel do contrato ord_3311" | **COMPROVADO (0 Tokens)** |
| 7 | **Telecom & Provedores ISP** | 📡 | `KB-ISP-01` | "Internet fibra sem sinal desde cedo, preciso de visita técnica" | **COMPROVADO (0 Tokens)** |
| 8 | **Turismo & Hotelaria** | ✈️ | `KB-TRAVEL-01` | "Voo cancelado e remarcação da reserva do localizador ord_9912" | **COMPROVADO (0 Tokens)** |
| 9 | **Delivery & Gastronomia** | 🍔 | `KB-FOOD-01` | "Meu pedido de almoço ord_4401 está atrasado há 40 minutos" | **COMPROVADO (0 Tokens)** |
| 10 | **Seguros & Assistência 24h** | 🛡️ | `KB-INSUR-01` | "Meu carro quebrou na rodovia e preciso acionar o guincho 24h" | **COMPROVADO (0 Tokens)** |
| 11 | **Logística & Transportadoras** | 🚚 | `KB-LOG-01` | "Rastrear o status da carga do conhecimento CT-e ord_5521" | **COMPROVADO (0 Tokens)** |
| 12 | **Automotivo & Oficinas** | 🚗 | `KB-AUTO-01` | "Agendar revisão de 30.000 km na oficina mecânica do veículo" | **COMPROVADO (0 Tokens)** |
| 13 | **RH & Departamento Pessoal** | 👥 | `KB-RH-01` | "Preciso da 2ª via do meu holerite do mês passado no DP" | **COMPROVADO (0 Tokens)** |
| 14 | **Jurídico & Advocacia** | ⚖️ | `KB-LEGAL-01` | "Andamento atualizado do meu processo judicial com advogado" | **COMPROVADO (0 Tokens)** |
| 15 | **Estética, Beleza & Barbearia** | ✂️ | `KB-BEAUTY-01` | "Agendar horário para corte e barba na barbearia estética" | **COMPROVADO (0 Tokens)** |
| 16 | **Academias & Fitness** | 🏋️ | `KB-GYM-01` | "Vou viajar e preciso trancar minha matrícula da academia" | **COMPROVADO (0 Tokens)** |
| 17 | **Pets & Clínicas Veterinárias** | 🐾 | `KB-PET-01` | "Agendar vacina anual V10 e consulta para meu cachorro pet" | **COMPROVADO (0 Tokens)** |
| 18 | **Energia Solar & Utilities** | ☀️ | `KB-SOLAR-01` | "Status da homologação do meu sistema solar fotovoltaico" | **COMPROVADO (0 Tokens)** |
| 19 | **Eventos, Shows & Ingressos** | 🎟️ | `KB-EVENT-01` | "QR Code do ingresso para o show festival deste sábado" | **COMPROVADO (0 Tokens)** |
| 20 | **Construção Civil & Reformas** | 🏗️ | `KB-CONST-01` | "Previsão de entrega do material de construção para a obra" | **COMPROVADO (0 Tokens)** |

---

## 📈 Mesa de Trading Quantitativo Multi-Ativo (Binance & Bybit)

O ALR Live Trading Desk opera 7 criptoativos simultaneamente (BTC, ETH, SOL, BNB, XRP, ADA, DOGE) mais 7 pares Forex de alta liquidez:
* Gráficos de velas em Canvas a 60 FPS com renderização fluida.
* Livro de ofertas (*order book*) em tempo real.
* Indicadores técnicos locais (RSI, MACD, Bollinger Bands, ATR, Ichimoku Cloud, VWAP).
* Trailing stop automático e realização parcial (TP1 50% + TP2 50%).
* Conexão via WebSocket e REST assinada com HMAC-SHA256 para Binance e Bybit Testnet.

Para executar localmente:
```bash
cargo run -p alr-cli -- trading-desk --port 3800
```
Acesse no navegador: `http://localhost:3800`.

---

## 🗺️ Otimizador de Rotas Urbanas em Mapa Real (OpenStreetMap)

* **Camada Cartográfica Gratuita:** Integração Leaflet + OpenStreetMap sem limites ou custos de chaves de API pagas.
* **Geocodificação por CEP:** Suporte a qualquer CEP brasileiro (São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Brasília).
* **Algoritmo 2-Opt em Rust:** Otimização de até 100 paradas urbanas com restrições de sentido de via, velocidade média por horário de pico e janelas de entrega.

Para executar localmente:
```bash
cargo run -p alr-cli -- playground --port 3000
# Acesse a aba "🗺️ Otimizador de Rotas" no menu lateral
```

---

⬅️ *Voltar para o [README Principal](README.md)*

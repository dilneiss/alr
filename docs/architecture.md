# Arquitetura do ALR (Autonomous Learning Runtime)

## 1. Visão Geral

O ALR foi desenhado segundo o princípio da **independência de oráculos externos para ação contínua**. Seu objetivo central é garantir que a inteligência de alto nível (LLM) atue como um professor esporádico, enquanto a execução cotidiana ocorra a nível de máquina nativa em Rust.

## 2. Diagrama de Módulos e Responsabilidades

```text
┌───────────────────────────────────────────────────────────┐
│                          alr-cli                          │
└─────────┬───────────────────┬───────────────────┬─────────┘
          │                   │                   │
          ▼                   ▼                   ▼
     alr-agent ────────► alr-learning        alr-mcp
     (Loop, Skills)       (Q-Table, Buffer)   (OpenCode Server)
          │                   │
          ├───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
      alr-core            alr-memory           alr-llm
    (State, Action,      (SQLite Store,      (Mock / OpenAI)
    Novelty, Conf)        WAL Persistence)
          │                   │
          ├───────────────────┘
          ▼
   alr-perception ◄────── alr-snake ◄────── alr-execution
  (Visual Detector)      (Game Engine)     (Safe Keyboard)
```

## 3. Fluxo de Decisão Hierárquico

A cada frame ou ciclo de percepção:
1. **Percepção**: O ambiente emite uma imagem bruta (`RawImage`) ou observação do grid.
2. **Construção do Estado**: O vetor de features $S = [d_{front}, d_{left}, d_{right}, f_{up}, f_{down}, f_{left}, f_{right}, dir]$ é montado.
3. **Cálculo de Novidade**: O `DensityNoveltyDetector` avalia a distância Euclidiana $L_2$ em relação aos $K$ vizinhos mais próximos no espaço de estados já observados.
4. **Resgate de Skills**: O `SkillManager` verifica se existe uma regra ativa memorizada que cubra o hash do estado.
5. **Predição da Política**: A $Q$-Table local computa $Q(s, a)$ para todas as ações válidas e calcula uma distribuição Softmax.
6. **Avaliação de Confiança**: O `ConfidenceEngine` pondera histórico, densidade, margem da política e novidade.
7. **Bifurcação de Decisão**:
   * Se $C \ge \text{threshold}$ e estado familiar $\to$ **Decisão Local Autônoma**.
   * Se $C < \text{threshold}$ ou novidade extrema $\to$ **Consulta ao LLM Teacher**.
8. **Validação Rigorosa**: Caso a LLM retorne uma proposta, esta é submetida a verificação sintática e semântica antes de ser promovida para `Active`.
9. **Execução Segura**: A ação passa pelo `SafeInputController` com limitador de taxa e trava de emergência.
10. **Aprendizagem**: A transição $(s, a, r, s')$ é persistida no SQLite e atualiza $Q(s, a)$.

## 4. Isolamento do Core

O crate `alr-core` não possui qualquer dependência de bibliotecas de GUI, provedores HTTP de LLM ou bancos de dados específicos. Toda a persistência é mediada pelo trait `MemoryStore`, viabilizando no futuro a adição de backends vetoriais (ex: Qdrant) sem alterações de domínio.

# ALR Game Autonomy Engine (Fase 10)

## 1. Visão Geral
A Fase 10 transforma o ALR em um motor universal de autonomia para jogos (`alr-games`). Jogos deixam de ser tratados como funções ad-hoc e passam a ser instâncias formais do modelo `GameEnvironment`, onde o agente opera através de percepção visual e eventos legítimos, sem manipulação de memória ou APIs ocultas.

## 2. Ambientes de Jogo Implementados
1. **TetrisEnvironment**:
   - Planejamento espacial e temporal de posicionamento de peças.
   - Detecção de altura agregada (`aggregate_height`), buracos encobertos (`count_holes`) e eliminação de linhas.
   - Operação visual e offline em tempo real.
2. **SocialDeductionLab**:
   - Simulação de dedução social multi-jogador com papéis (*Crewmate* vs *Impostor*).
   - Execução de tarefas da nave, convocações de reuniões de emergência e votação de suspeitos.
   - Modelo de suspeita probabilístico (`SuspicionModel`) alimentado por `TemporalGameMemory`.

## 3. Integridade e Política Anti-Cheat
O ALR segue uma diretriz inegociável de conformidade:
- **Zero Memory Reading / DLL Injection**: Proibida qualquer leitura interna de RAM do processo do jogo.
- **Zero Hidden-State Access**: O agente opera estritamente com informações visíveis na tela (câmera, viewport, HUD).
- **Resistência a Injeções via Chat**: Mensagens de texto no chat do jogo são tratadas como dados de jogadores não confiáveis, jamais como instruções de sistema.

# Especificação Técnica de Design: Sistema Universal de Detecção e Evasão de Loops & Pipeline de Treinamento para Novas Tarefas

**Data:** 2026-09-22  
**Status:** Aprovado para Implementação  
**Autor:** ALR Core Team  
**Módulos Envolvidos:** `crates/alr-agent`, `crates/alr-core`, `crates/alr-spatial`, `crates/alr-cli`, `scripts/play_in_browser.js`

---

## 1. Visão Geral e Motivação

Durante os testes empíricos do agente autônomo operando o jogo da cobrinha em navegadores reais e ambientes espaciais, observou-se um comportamento patológico de **oscilação simétrica em mínimos locais**: o agente alternava continuamente entre direções opostas (ex.: `Cima` $\leftrightarrow$ `Baixo`), ficando preso no mesmo local sem avançar em direção ao próximo objetivo.

Este documento formaliza a arquitetura do **`LoopEvasionEngine`**, um mecanismo universal multicamadas de detecção e evasão de loops infinitos aplicável a todo o ecossistema do ALR (jogos, automação web, procedimentos de suporte, ambientes 3D), bem como o **Manual e CLI de Treinamento para Novas Tarefas**, permitindo que o operador ensine o runtime a resolver novos desafios de forma determinística e governada.

---

## 2. Arquitetura do Detector e Evasor de Loops (`LoopEvasionEngine`)

O componente residirá em `crates/alr-agent/src/reliability.rs` e será integrado ao loop principal do agente e ao script do navegador.

### 2.1 Estrutura de Dados
```rust
pub struct LoopEvasionEngine {
    action_history: Vec<String>,
    state_history: Vec<String>,
    steps_since_progress: usize,
    max_repetition: usize,
    max_cycle_len: usize,
    stagnation_limit: usize,
    evasion_active_steps: usize,
    blocked_actions: Vec<String>,
}
```

### 2.2 Camadas de Detecção
1. **Detecção de Oscilação de Ação Curta (2 a 4 passos):**
   - Rastreia repetições imediatas $A \leftrightarrow B \leftrightarrow A \leftrightarrow B$.
   - Rastreia ciclos de 4 passos $A \to B \to C \to D \to A \to B \to C \to D$.
2. **Detecção de Estagnação de Estado Espacial/Hash:**
   - Mantém um histórico das últimas $N$ posições $(x, y)$ ou hashes de estado `State::feature_hash()`.
   - Se o mesmo estado for revisitado mais de 2 vezes sem recompensa positiva, o alarme de loop espacial é ativado.
3. **Monitor de Falta de Progresso (Progress Watchdog):**
   - Conta o número de passos desde a última mutação válida de objetivo (ex.: comer comida, clique com transição de URL, avanço de submeta).
   - Limite configurável: 25 passos em jogos, 15 passos em navegação web.

### 2.3 Protocolo de Evasão em Dois Níveis
* **Nível 1 (Evasão Local - Tentativas 1 e 2):**
  - O runtime bloqueia temporariamente as ações que causaram a oscilação.
  - Força uma manobra ortogonal/perpendicular em direção à área de maior espaço livre.
  - Mantém a manobra forçada por 3 ticks consecutivos para quebrar a simetria espacial.
  - Execução 100% local, latência $< 1$ µs, zero consumo de tokens.
* **Nível 2 (Escalonamento Cognitivo - Tentativa 3+):**
  - Zera temporariamente a confiança da política para o estado atual.
  - Aciona o planejador hierárquico ($A^*$) ou a LLM Oracle para gerar uma nova rota desatada.
  - Grava a experiência corrigida no buffer de aprendizado da Q-Table/SQLite.

---

## 3. Integração no Navegador Real (`scripts/play_in_browser.js`)

O script de controle em tempo real da cobrinha em `https://wutools.com/pt/jogos/jogo-da-cobrinha` incorporará:
1. Ring buffer das últimas 6 posições da cabeça $(x, y)$.
2. Verificador de simetria de distância: quando a distância horizontal e vertical for idêntica, prioriza a direção com maior margem até as bordas (0 a 500 px).
3. Evasão anti-vai-e-vem: se alternar entre duas direções opostas em menos de 4 frames, trava essas direções por 3 frames e força um giro lateral em direção ao centro do canvas.

---

## 4. Pipeline e Guia de Treinamento para Novas Tarefas

### 4.1 Documentação (`docs/training-new-tasks.md`)
O manual documentará a receita padrão do ALR para qualquer novo ambiente:
1. **Modelagem do Ambiente via `EnvironmentAdapter`:**
   - Implementar `reset(seed)`, `observe()` e `act(action)`.
2. **Desenho da Função de Recompensa:**
   - Evitar reward hacking (penalidade de tempo $-0.1$, recompensa de progresso $+10.0$, penalidade de colisão/erro $-100.0$).
3. **Execução de Treinamento Acelerado:**
   - Rodar episódios em modo headless com atualização contínua da Q-Table.
4. **Cristalização e Persistência:**
   - Salvamento automático em SQLite e exportação opcional para artefato `.onnx` verificado por SHA-256.
5. **Portão de Aceitação em Holdout:**
   - Validação em mapas/layouts inéditos para garantir generalização real.

### 4.2 Assistente CLI de Treinamento
Expansão do binário `alr-cli`:
```bash
cargo run -p alr-cli -- task train --type <game|browser|support|3d> --episodes <N>
```
Executa o treinamento em sandbox fechado com telemetria em tempo real e persistência automática.

---

## 5. Plano de Testes & Verificação

1. `test_loop_evasion_detects_two_step_oscillation`: Prova detecção de $A \leftrightarrow B$.
2. `test_loop_evasion_forces_orthogonal_escape`: Prova que a ação forçada quebra a estagnação.
3. `test_loop_evasion_escalates_to_planner_after_threshold`: Prova o escalonamento em nível 2.
4. `test_browser_snake_evasion_logic`: Validação da lógica de prevenção no script do navegador.
5. `test_task_training_cli_flow`: Validação do comando CLI de treino para novas tarefas.
6. Regressão total: 133 testes existentes devem permanecer 100% aprovados.

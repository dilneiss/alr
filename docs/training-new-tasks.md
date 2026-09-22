# Guia Oficial de Treinamento e Aprendizado de Novas Tarefas (ALR)

Este manual documenta o pipeline padrão do **Autonomous Learning Runtime (ALR)** para ensinar o sistema a dominar qualquer nova tarefa, seja em **jogos**, **automação de navegador**, **atendimento a chamados/APIs** ou **ambientes 3D corpóreos**.

---

## 1. O Ciclo de Vida do Aprendizado de uma Tarefa

No ALR, uma tarefa não é programada de forma fixa. Ela passa pelo seguinte fluxo:

```text
[Definir Ambiente] ──> [Modelar Recompensa] ──> [Treinamento em Sandbox] ──> [Cristalização Local] ──> [Validação em Holdout]
```

1. **Abstração do Ambiente (`EnvironmentAdapter`):** O mundo expõe apenas `reset()`, `observe()` e `act()`.
2. **Modelagem da Recompensa (`Reward Function`):** Penalidades para ações repetitivas e recompensas para progresso real.
3. **Treinamento Acelerado:** O agente explora ações, detecta loops com o `LoopEvasionEngine` e atualiza sua tabela $Q(s, a)$.
4. **Cristalização Local:** A política aprendida é persistida no SQLite e/ou destilada em modelo ONNX com assinatura SHA-256.
5. **Portão de Aceitação em Holdout:** O agente é testado em layouts e condições que não estavam no treino para provar generalização.

---

## 2. Passo a Passo: Como Criar e Treinar uma Nova Tarefa

### Passo 1: Implementar o `EnvironmentAdapter`
Em qualquer crate ou módulo novo, implemente o trait:

```rust
use alr_environment::{EnvironmentAdapter, AbstractState, AbstractAction, EnvironmentDescription, EnvironmentSignature};
use async_trait::async_trait;
use anyhow::Result;

pub struct MinhaNovaTarefa {
    pub estado_atual: usize,
    pub concluida: bool,
}

#[async_trait]
impl EnvironmentAdapter for MinhaNovaTarefa {
    fn description(&self) -> EnvironmentDescription {
        // Declaração de capacidades e restrições
        unimplemented!()
    }

    fn signature(&self) -> EnvironmentSignature {
        // Assinatura para comparação de similaridade
        unimplemented!()
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.estado_atual = 0;
        self.concluida = false;
        // Retorna o estado inicial abstrato
        Ok(AbstractState::default())
    }

    async fn observe(&self) -> Result<AbstractState> {
        Ok(AbstractState::default())
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        // Executa a ação e retorna a recompensa
        let mut reward = -0.1; // Custo de tempo por passo
        if action == AbstractAction::Approach {
            reward += 10.0;
            self.concluida = true;
        }
        Ok(reward)
    }

    fn is_terminal(&self) -> bool {
        self.concluida
    }
}
```

---

### Passo 2: Diretrizes para a Função de Recompensa (Evitar Reward Hacking)

* **Recompensa Positiva:** Concedida apenas na **conclusão comprovada** da meta ($+10.0$ a $+100.0$).
* **Custo por Passo:** Pequena penalidade de tempo ($-0.05$ a $-0.1$) para impedir que o agente fique dando voltas no mesmo lugar.
* **Penalidade de Colisão ou Falha:** Penalidade severa ($-50.0$ a $-100.0$) ao bater na parede ou cometer infração de segurança.
* **Atenção:** Nunca recompense simplesmente por "tentar" ou por "clicar"; exija a verificação de pós-condição no estado real do mundo.

---

### Passo 3: Executando o Treinamento via CLI do ALR

O ALR fornece o assistente unificado de treinamento:

```bash
# Treinar tarefa de jogo (ex.: Snake, Tetris):
cargo run -p alr-cli -- task train --type game --episodes 1000

# Treinar procedimento de navegador (ex.: preenchimento de formulário, suporte web):
cargo run -p alr-cli -- task train --type browser --episodes 100

# Treinar navegação espacial 3D:
cargo run -p alr-cli -- task train --type 3d --episodes 500

# Treinar procedimento de helpdesk / suporte:
cargo run -p alr-cli -- task train --type support --episodes 200
```

Durante o treino, o terminal exibe o avanço:
```text
=========================================================
       ALR TASK TRAINING ENGINE (GAME)
=========================================================
Initializing closed-loop accelerated training sandbox...
Episodes to train: 1000
Safety Floor     : Active (Anti-Reward Hacking & Loop Evasion enabled)

  [PROGRESS] Ep  200/1000 ( 20.0%) | Avg Reward: +28.00 | Success: 98.4% | Local Rate: 99.1%
  [PROGRESS] Ep  600/1000 ( 60.0%) | Avg Reward: +46.00 | Success: 99.0% | Local Rate: 99.4%
  [PROGRESS] Ep 1000/1000 (100.0%) | Avg Reward: +55.00 | Success: 99.5% | Local Rate: 100.0%

TRAINING COMPLETE: Policy crystallized & persisted to SQLite / ModelRegistry.
=========================================================
```

---

## 3. Prevenção Universal de Loops Infinitos

Se o agente entrar em oscilação durante qualquer tarefa, o **`LoopEvasionEngine`** atua automaticamente:
1. **Curto Prazo:** Interrompe alternâncias de 2 ou 4 passos (ex.: `Cima` $\leftrightarrow$ `Baixo`), forçando um desvio perpendicular para a área de maior espaço livre por 3 ticks.
2. **Estagnação Temporal:** Se o agente executar 25 passos sem progresso na meta, invalida o caminho atual e convoca o planejador ($A^*$) ou a LLM Oracle para gerar uma nova estratégia.
3. **Persistência:** A correção é gravada no banco local para que o agente nunca mais repita o mesmo erro naquela situação.

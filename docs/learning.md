# Motor de Aprendizagem e Replay (alr-learning)

## 1. Algoritmo Q-Learning Tabular

Para o ambiente Snake, o runtime utiliza um algoritmo tabular de Aprendizado por Reforço com atualização de Bellman:

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$

Onde:
* $\alpha = 0.2$ (Taxa de aprendizado).
* $\gamma = 0.9$ (Fator de desconto temporal).
* $\epsilon = 0.1$ (Taxa de exploração gulosa).

### Representação do Estado
O estado é discretizado em uma chave condensada unívoca:
$$\text{state\_key} = \text{"danger\_front\_left\_right\_food\_up\_down\_left\_right\_direction"}$$
Isso mapeia um espaço compacto de estados críticos que evita a explosão combinatória sem perder a capacidade de navegação em direção à comida.

## 2. Função de Recompensa (Reward Shaping)

O sistema de recompensa foi calibrado para promover sobrevivência e eficácia sem induzir comportamentos degenerados (como loops infinitos):

| Evento | Recompensa | Justificativa |
|---|---|---|
| Comer Comida | $+10.0$ | Objetivo principal atingido |
| Sobreviver ao Passo | $+1.0$ | Incentivo primário de longevidade |
| Aproximação da Comida | $+1.5$ | Recompensa direcional (distância Manhattan diminuiu) |
| Afastamento da Comida | $-1.5$ | Penalidade por perda de progresso |
| Colisão com Parede / Corpo | $-100.0$ | Falha terminal catastrófica |

## 3. Experience Replay Buffer

As transições são guardadas na memória em um buffer circular de $5.000$ experiências:
```rust
pub struct Experience {
    pub state: State,
    pub action: Action,
    pub reward: f32,
    pub next_state: Option<State>,
    pub terminal: bool,
}
```
O buffer permite treino offline (`PolicyTrainer::replay_train`), reprocessando partidas gravadas no SQLite para acelerar a convergência sem requisições adicionais ao ambiente.

## 4. Métricas de Avaliação da Política

O módulo `alr_learning::evaluation` monitora continuamente:
* `mean_reward`: Média aritmética de recompensa por transição.
* `terminal_states`: Quantidade de colisões no conjunto amostrado.
* `mean_max_q`: Valor esperado dos estados alcançados.

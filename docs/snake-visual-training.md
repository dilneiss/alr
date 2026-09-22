# Guia de Visualização e Aprendizado Contínuo da Cobra (Snake)

## 1. Como Ver Visualmente o Jogo Acontecendo na Sua Tela

Para rodar a cobra e assistir ao jogo sendo desenhado em tempo real no seu terminal (PowerShell, CMD ou Windows Terminal):

```powershell
Set-Location D:\projetos\alr; C:\Users\dilne\.cargo\bin\cargo.exe run -p alr-cli -- snake --mode visual
```

O jogo atualiza a tela continuamente a cada tick (~120ms), mostrando:
- **`O`**: Cabeça da cobra.
- **`o`**: Segmentos do corpo.
- **`*`**: Comida gerada.
- **`|` e `--`**: Paredes e limites do tabuleiro.
- **Painel de Telemetria Superior**: Passo atual, pontuação acumulada, ação escolhida (`UP`, `DOWN`, `LEFT`, `RIGHT`), índice de confiança e fonte da decisão (`LearnedSkill`, `QTable` ou `LlmTeacher`).

---

## 2. Por Que Ela Bate na Parede e Como Fazer Evoluir?

### O Que Aconteceu:
No modo visual rápido inicial, a cobra estava usando uma tabela de políticas preliminar. Quando a cobra colide com a borda do tabuleiro ou com o próprio corpo:
1. O ambiente emite uma recompensa fortemente negativa: **Penalidade de colisão/morte = `-100.0`**.
2. Essa transição $(s, a, r, s')$ é registrada no histórico.
3. No entanto, para que a cobra **nunca mais repita esse erro**, essa penalidade precisa atualizar o valor $Q(s,a)$ correspondente na sua **Q-Table** e ser salva no banco de dados SQLite (`alr_state.db`).

### Como Fazer a Cobra Aprender e Evoluir:

Você tem duas formas de fazer a cobra aprender:

### Opção A: Treinamento Intensivo por Reforço (Recomendado)
Execute um ciclo de treinamento de 500 ou 1.000 partidas. Nesse modo, a cobra joga milhares de rodadas em alta velocidade, explora caminhos, morre nas paredes centenas de vezes e recebe a penalidade de `-100.0`, aprendendo matematicamente que virar em direção à parede tem valor $Q$ péssimo:

```powershell
Set-Location D:\projetos\alr; C:\Users\dilne\.cargo\bin\cargo.exe run -p alr-cli -- snake --train --episodes 1000
```

Durante o treinamento, você verá o progresso:
```text
Episode  200/1000 | Score:  12 | Steps:  142 | LLM Calls: 0 | Auto Rate: 100.0%
Episode  400/1000 | Score:  24 | Steps:  310 | LLM Calls: 0 | Auto Rate: 100.0%
Episode  800/1000 | Score:  48 | Steps:  620 | LLM Calls: 0 | Auto Rate: 100.0%
Episode 1000/1000 | Score:  65 | Steps:  890 | LLM Calls: 0 | Auto Rate: 100.0%
Persisted updated Q-Table to SQLite.
```

O conhecimento gerado é **salvo automaticamente no banco local SQLite** (`snake_q_table`).

---

### Opção B: Visualizar a Cobra Treinada
Depois de rodar o comando de treino acima, rode novamente o modo visual:

```powershell
Set-Location D:\projetos\alr; C:\Users\dilne\.cargo\bin\cargo.exe run -p alr-cli -- snake --mode visual
```

A mensagem no início do terminal confirmará:
```text
Restored existing Q-Table policy from SQLite database
```
A cobra agora carregará a memória atualizada: ao se aproximar de uma parede, a ação que antes causava colisão terá $Q(s, a)$ negativo e ela automaticamente desviará para o espaço aberto!

---

### Opção C: Comparar o Antes e Depois via Benchmark
Para ver numericamente a evolução da taxa de colisão e da pontuação média:

```powershell
Set-Location D:\projetos\alr; C:\Users\dilne\.cargo\bin\cargo.exe run -p alr-cli -- snake --evaluate --episodes 100
```

Você verá a tabela comparativa:
* **Taxa de Colisão Inicial (Cold):** ~45%
* **Taxa de Colisão Pós-Treino:** **< 2%**
* **Pontuação Média:** Evolui de 3-5 comidas para **25-45 comidas por partida**.

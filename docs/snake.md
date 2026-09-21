# Ambiente Snake e Percepção Visual (alr-snake & alr-perception)

## 1. Modos de Operação

O ambiente Snake possui dois modos distintos:

### Modo A — Benchmark Interno Determinístico
* Grid discreto configurável (padrão $20 \times 20$).
* Totalmente determinístico controlado via `seed: u64`.
* Alta velocidade: executa centenas de episódios por segundo em CPU.
* Utilizado em treinamento, validação matemática e testes automatizados.

### Modo B — Percepção Visual (Desktop / Image-Based)
No modo visual, o agente **não tem acesso ao estado interno do jogo**. O fluxo opera via:

```text
FRAME GRÁFICO (Canvas/Window)
             │
             ▼
      CAPTURA DE TELA (RawImage)
             │
             ▼
DETECTOR DE CORES E FORMAS (VisualSnakeDetector)
             │
             ▼
  ESTADO RECONSTRUÍDO (DetectedSnakeState)
             │
             ▼
        VETOR DE FEATURES (State)
             │
             ▼
   DECISÃO AUTÔNOMA DO AGENTE
             │
             ▼
  INJEÇÃO DE TECLADO (SafeInputController)
```

## 2. Visão Computacional do Jogo

O `VisualSnakeDetector` faz amostragem nas coordenadas centrais de cada célula do grid:
* **Cabeça da Cobra**: Detecção de verde brilhante `RGBA(0, 220, 0, 255)`.
* **Corpo da Cobra**: Detecção de verde escuro `RGBA(0, 150, 0, 255)`.
* **Comida**: Detecção de vermelho `RGBA(230, 40, 40, 255)`.
* **Inferência de Direção**: Calculada a partir do vetor relativo entre a cabeça e a primeira vértebra detectada do corpo.

## 3. Segurança de Execução

O crate `alr-execution` fornece o `SafeInputController`:
* **Rate Limiting**: Impede mais de $N$ comandos por segundo (padrão 20 Hz), evitando travamento do sistema operacional.
* **Emergency Stop**: Flag atômica thread-safe que interrompe a injeção instantaneamente se uma anomalia for detectada.
* **Dry Run**: Simula os comandos apenas em log sem alterar o foco de janelas do usuário.

# Modelo de Mundo, Exploração e Estado de Crença (Fase 7)

## 1. BeliefState
Sob observabilidade parcial, o agente não presume que o que está fora do campo de visão não existe. O `BeliefState` rastreia:
- Entidades conhecidas e confirmadas.
- Hipóteses espaciais (ex.: *"alvo provavelmente localizado atrás da barreira frontal"*).
- Pontuação de incerteza quantitativa.

## 2. Exploração Segura (Safe Exploration)
Quando a incerteza é elevada e o ganho de informação compensa o risco, o planejador prioriza rotas de baixo risco para inspeção antes de avançar para áreas perigosas.

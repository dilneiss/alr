# ALR 3D Lab: Ambiente de Simulação & Autonomia Corpórea (Fase 6)

## 1. Visão Geral
O **ALR 3D Lab** (`alr-world`) é um ambiente determinístico tridimensional criado em Rust para testar e validar autonomia corpórea (*embodied autonomy*), percepção espacial e planejamento hierárquico em mundos parcialmente observáveis.

## 2. Cenários Suportados
1. **Navigation**: Movimento orientado a waypoints em malha contínua.
2. **Target Acquisition**: Localização, aproximação e coleta de artefatos com interação física.
3. **Obstacle Avoidance**: Desvio determinístico de barreiras estáticas com replanejamento.
4. **Dynamic Obstacle**: Predição de trajetória de obstáculos móveis com colisão reativa.
5. **Resource Collection**: Coleta sequencial de cristais e recursos no mapa.
6. **Multi-Step Objective**: Metas complexas dependentes de inventário e pós-condições.
7. **Unknown Map**: Exploração sob observabilidade parcial (estados não-visíveis marcados como `UNKNOWN`).

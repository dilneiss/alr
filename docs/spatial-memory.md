# Memória Espacial & Navegação (Fase 6)

## 1. Representação Estruturada
A memória espacial (`alr-spatial`) descarta a dependência exclusiva de embeddings para dados físicos e de trajetória:
* **Landmarks**: Coordenadas estruturadas (`Vec3`), rótulo semântico e raio de atuação.
* **Visited Points**: Grade de posições já exploradas para evitar loops e redundância.
* **Hazard Map**: Registro persistente de áreas com dano ou colisões prévias.
* **Spatial Routes**: Sequências de waypoints validadas e ponderadas por taxa de sucesso.

## 2. Navegação A* e Desvio Dinâmico
* **`AStarNavigator`**: Planejamento determinístico de rota ótima em grade espacial.
* **`CollisionPredictor`**: Projeção de trajetória linear do agente e obstáculos móveis nos próximos $T$ segundos.
* **`StuckDetector`**: Detecção de estagnação por delta de posição acumulada inferior ao limiar.
* **`DynamicReplanning`**: Invalidação imediata da rota quando um obstáculo intercepta qualquer waypoint futuro.

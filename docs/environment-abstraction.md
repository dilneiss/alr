# Abstração de Ambientes & Camada de Aterramento (Fase 7)

## 1. EnvironmentAdapter
O trait `EnvironmentAdapter` (`alr-environment`) unifica todos os mundos sob uma mesma interface:
- **`EnvironmentDescription`**: Descreve capacidades requeridas, restrições operacionais e limites de taxa de ação.
- **`EnvironmentSignature`**: Vetor de características físicas, tipo de espaço de ação e observação, usado para calcular similaridade cosseno/Jaccard entre ambientes.

## 2. AbstractState e AbstractAction
Para evitar dependência frágil de coordenadas cartesianas absolutas:
- **`AbstractState`**: Codifica relações topológicas e qualitativas (`RelativeDirection`, `DistanceCategory`, flags de colisão frontal/lateral).
- **`AbstractAction`**: Ações cognitivas de alto nível (`Approach`, `Avoid`, `Search`, `Collect`, `Navigate`).
- **`GroundingLayer`**: Converte `AbstractAction` em primitivas físicas reais (`ContinuousAction` 3D, eventos de mouse/teclado ou chamadas de API).

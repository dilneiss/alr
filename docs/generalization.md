# Generalização Espacial e Visual (Fase 7)

## 1. Generalização Topológica
O ALR comprova invariância frente a:
- **Rotações**: Ambientes com orientação cardinal girada preservam a política relativa.
- **Escalas**: Variações de dimensões mantêm as categorias de distância (`Immediate`, `Near`, `Medium`, `Far`).
- **Deslocamentos de Posição**: Metas e obstáculos colocados em coordenadas inéditas.

## 2. Invariância Visual e Semântica de Objetos
- A percepção visual (`Visual3DPerception`) não depende de valores exatos de RGB, mas de caixas delimitadoras e profundidade relativa.
- Os alvos são identificados por categoria semântica (`Target`, `Artifact`, `Resource`), permitindo que a linguagem do usuário (*"encontre o artefato azul"*) mapeie diretamente para a capacidade apropriada via `GoalInterpreter`.

# Roadmap de Evolução Arquitetural

O ALR foi projetado com forte desacoplamento via traits e tipos abstratos no crate `alr-core`. Isso permite expandir o runtime para casos de uso corporativos e ambientes complexos sem reescrever o núcleo de decisão e aprendizado.

```text
┌──────────────────────────────────────────────────────────┐
│ V1: Snake & Benchmark (Concluído)                        │
│ - Q-Learning tabular + Replay Buffer                     │
│ - SQLite WAL para memórias e skills                      │
│ - Percepção visual por captura e detector de grid        │
│ - Mock LLM Teacher & Servidor MCP para OpenCode          │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ V2: Qdrant Vector Memory                                 │
│ - Implementação de `MemoryStore` para Qdrant             │
│ - Embeddings locais de estados e histórico               │
│ - Busca de similaridade k-NN semântica escalável         │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ V3: Autonomous Customer Support Agent                    │
│ - Abstração: Ticket -> Intent -> Memory Retrieval        │
│ - Geração de respostas com validação semântica prévia    │
│ - Oráculo consultado apenas para exceções e casos novos  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ V4: Browser & Desktop Full OS Automation                 │
│ - Integração com drivers nativos de automação de UI      │
│ - Reconhecimento de elementos visuais arbitrários        │
│ - Controle seguro de mouse e teclado com sandbox         │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ V5: Redes Neurais Locais & ONNX Runtime                  │
│ - Implementação do trait `LocalModel` via ONNX           │
│ - Deep Q-Networks (DQN) e Actor-Critic locais em GPU/NPU │
│ - Decisões em sub-milissegundo para jogos e robótica     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ V6: Ambientes 3D e Simuladores                           │
│ - Integração com Three.js, Unreal Engine ou Bevy         │
│ - Observações tridimensionais (Posição 3D, Velocidade)   │
│ - Aprendizado contínuo em espaço contínuo de ações       │
└──────────────────────────────────────────────────────────┘
```

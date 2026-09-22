# Ambiente Real 3D Renderizado & Jogos Externos (Fase 7)

## 1. Real 3D Lab
O `Real3DRenderedLab` simula um ambiente renderizado com iluminação, texturas, ângulo de câmera e física rígida. A avaliação no Modo Visual ocorre estritamente por imagem/câmera, sem acesso ao estado privilegiado do motor de jogo.

## 2. External Game Adapter
O `ExternalGameAdapter` conecta o ALR a jogos 3D externos (sandbox, offline e single-player):
- Interação puramente baseada na tela e envio de teclado/mouse.
- Zero uso de cheats, APIs ocultas ou leitura de memória interna.
- Demonstração empírica de transferência da capacidade de navegação para um jogo não visto no treino.

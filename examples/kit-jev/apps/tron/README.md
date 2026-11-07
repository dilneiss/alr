# Tron: Você vs Jev

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-tron.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar tron`.


Motos de luz numa arena neon 48×32 contra uma IA que decide **cada curva**. A cada passo, o Jev recebe os sensores da
arena e escolhe `seguir_reto`, `virar_esquerda` ou `virar_direita` — e a moto obedece. É o caso "personagem de jogo
controlado pelo Jev": decisões tipadas, em milissegundos, com as probabilidades visíveis ao lado da moto.

A tela é um gabinete de fliperama de 1982: letreiro de neon, a arena numa tela de tubo e, no painel de controle, os três
modos como botões de fliperama: **Você vs Jev** (laranja; setas/WASD; no celular, deslize ou D-pad), **Jev vs Robô
clássico** (amarelo; heurística de espaço livre) e **Jev vs Jev** (ciano; uma única chamada decide as duas motos). Nas
laterais, as telas **Cérebro do Jev**, **Tempo real** e **Recordes do dia** (vitórias de Você × Jev, Jev × Robô clássico e
Jev × Jev, com iniciais de 3 letras: JEV, HUM, ROB, AZU, ROS).

## Por que é um uso inteligente do Jev
- **Controle em tempo real com decisão tipada**: o Jev não gera texto nem inventa movimentos — devolve uma das 3 opções
  válidas, com probabilidade, em ~350 ms. O HUD ao lado da moto mostra ↑/↰/↱ com as porcentagens a cada passo.
- **Sensores calculados por código, decisão pelo Jev**: para cada opção o servidor mede se BATE, o **espaço acessível**
  (flood fill), o **território** (casas que você alcança antes do oponente, BFS dos dois lados), a vantagem de território,
  o risco de batida de frente e quantas casas livres ficam em linha reta. O Jev pesa o trade-off: o robô clássico só
  maximiza espaço e segue reto; o Jev corta o caminho do oponente quando o território compensa (`modo: atacar`).
- **Honestidade de tempo real**: o tick se ajusta à latência medida; se a decisão chega depois do tick, a moto usa o
  piloto automático (a opção com mais espaço) e isso aparece como barra vermelha e no "% no tempo".
- **Jev vs Jev numa chamada**: 4 perguntas (movimento + modo de cada moto) avaliadas em paralelo, mesma latência de 1.
- **Barato**: US$ 0,00004 por decisão (~920 tokens). Uma partida inteira contra o robô (≈130 passos) ≈ US$ 0,005.

## Perguntas enviadas (ver `engine.mjs → perguntasMoto` e `visaoMoto`)
Uma chamada por passo. `state` = regras + `voce` (cor, coluna/linha, direção) + `oponente` (posição relativa: "7 casas à
frente e 3 à direita", distância, para onde vai) + `situacao` (disputando a mesma região / regiões separadas) + `opcoes`
com, para cada movimento: `BATE na parede/no próprio rastro/no rastro do oponente (derrota)` **ou**
`{ casa, espaco, beco, territorio, territorio_oponente, vantagem, livre_em_frente }`.

| id | tipo | critérios |
|---|---|---|
| `movimento` | choice | `seguir_reto`, `virar_esquerda`, `virar_direita` — instrução: nunca uma opção que BATE; evitar risco de frente e beco; preferir mais espaço; com espaços parecidos, mais vantagem de território |
| `modo` | choice | `sobreviver` (separados/apertado), `atacar` (dá para cortar o oponente), `fugir` (oponente perto / risco de frente) |

No Jev vs Jev: `movimento_azul`, `modo_azul`, `movimento_rosa`, `modo_rosa` na mesma chamada, com `moto_azul` e `moto_rosa`
no `state`.

## Tempo real (servidor autoritativo)
- Um processo de partida por jogo: tick → aplica movimentos → envia o estado por **SSE** → **pede já a decisão do próximo
  tick** (pipeline) → agenda o próximo tick. Teclas do humano chegam por `POST` com buffer de 2 comandos (meia-volta ignorada).
- **Prazo adaptativo**: `T = max(p90 + 90 ms, p95 + 40 ms)` das últimas 40 decisões; sobe 25 ms quando uma decisão atrasa,
  desce devagar quando sobra folga (limites 240–700 ms). Na contagem regressiva, a primeira resposta já calibra o prazo.
- Regra da arena: a partir do passo 30, se as motos ficam em **regiões isoladas**, vence quem tem mais espaço livre
  (evita finais longos de "preencher espaço"). Largadas sorteadas e nunca espelhadas (senão dois Jevs jogariam simétrico).
- Economia: partida pausa sozinha com a aba oculta ou sem espectador (SSE fechado) e é descartada após 30 s; teto de
  700 passos por partida, 2 partidas simultâneas por IP, 16 no servidor; 12 partidas novas/min por IP. Se o orçamento do
  gateway acabar, novas partidas recebem aviso e as em andamento seguem no piloto automático (contado como fora do tempo).

## Medido (2026-09-23, gateway local → OpenRouter, a partir do Brasil)
| modo | latência por chamada (p50 / p90 / p95) | tokens | custo |
|---|---|---|---|
| 1 Jev (vs você / vs robô) | 354 / 425 / 444 ms | ~920 | US$ 0,000039 por decisão |
| Jev vs Jev (2 motos, 1 chamada) | 376 / 467 / 516 ms | ~1.520 | US$ 0,000064 por passo |

- e2e final (37 verificações, 0 falhas, 0 erros de console): Jev vs Robô com **83 decisões, 98,8% no tempo, vitória do
  Jev** (US$ 0,0032); Jev vs Jev **100% no tempo**; Você vs Jev: teclas ↑, A, ↓ viram a moto e a meia-volta é ignorada.
  Execuções anteriores: 138 decisões/100% e 134 decisões/98,5% — o Jev venceu o robô clássico em todas as 5 partidas do dia.
- Prazo do tick medido do Brasil: ~510–570 ms (o jogo anda ~2 casas/s). No servidor em Boston a latência deve cair e o
  tick acompanha sozinho (a meta do brief é ~250 ms; o piso é 240 ms).

## Roteiro de 60 s para o vídeo
1. (0–5 s) Página inicial: o gabinete liga (o letreiro TRON acende em neon, a tela de tubo abre do meio) e a tela pisca
   "INSIRA FICHA". Apertar o botão amarelo **Jev vs Robô clássico** no painel de controle.
2. (5–25 s) Contagem 3-2-1-VAI!. Mostrar o **quadro ao lado da moto azul** (JEV, o modo, "295 ms" e as setas ↑ ↰ ↱ com
   barras e %) e a tela **Cérebro do Jev · moto azul**: a decisão em neon ("SEGUIR RETO", "96% de certeza · 295 ms · chegou
   no tempo ✓"), as barras de LED, a tabela espaço/território/situação (com `BATE` em vermelho quando uma opção bate) e a
   plaqueta **MODO: ATACAR** na borda de cima quando ele corta o robô.
3. (25–35 s) Apontar a tela verde **Tempo real**: cada barra é uma decisão, verde = chegou antes do prazo (a linha âmbar
   tracejada "prazo 518 ms"), vermelha = atrasou; "no tempo 100%", "custo da partida US$ 0,0006".
4. (35–45 s) Tela de fim: "O JEV VENCEU" em neon, o motivo ("Regiões isoladas: Jev ficou com 816 casas livres e Robô
   clássico com 522. Vence quem tem mais espaço.") e os 6 números (duração, passos, decisões, no tempo, latência média,
   custo); o "Jev" do letreiro pisca.
5. (45–60 s) **Trocar modo** → botão laranja **Você vs Jev**: jogar com as setas até bater (ou vencer!) e mostrar os
   **Recordes do dia** à esquerda ("1º JEV … 10 · 2º HUM … 00"). Opcional: o botão ciano **Jev vs Jev** para mostrar dois
   cérebros decidindo na mesma chamada.

## Rodar e testar
```bash
cd "."
PORT=4114 node apps/tron/server.mjs      # gateway do Jev em http://127.0.0.1:8787
```
Capturas: `test/shots/01-inicio.png`, `02-jev-vs-robo.png`, `03-fim-robo.png`, `04-voce-vs-jev.png`, `05-fim-humano.png`,
`06-jev-vs-jev.png`, `mobile.png`.

## Arquivos
- `engine.mjs` — arena, colisões simultâneas, BFS/flood fill, território, regiões isoladas, robô clássico (e fallback),
  `visaoMoto` (o `state` do Jev) e `perguntasMoto`.
- `server.mjs` — partidas (tick adaptativo, pipeline de decisões, pausa, abandono, placar), rotas:
  `POST /api/partida {modo}`, `GET /api/partida/:id/sse`, `POST /api/partida/:id/tecla {dir 0-3}`,
  `POST /api/partida/:id/pausa {pausar}`, `POST /api/partida/:id/sair`, `GET /api/info`.
- `public/` — `index.html` (o gabinete: letreiro, tela de tubo, painel de controle e as telas laterais), `tron.css`
  (identidade de fliperama de 1982), `app.js` (canvas em camadas: grade, brilho, núcleo, motos interpoladas, partículas;
  HUD de probabilidades; painéis; teclado, deslize e D-pad).
- `public/fonts/` — `tilt-neon-latin-400.woff2` (letreiro e títulos) e `share-tech-mono-latin-400.woff2` (textos e
  leituras), servidas pelo próprio app.

## Deploy
- Node 22, zero dependências. `PORT=4114`, `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`), `DATA_DIR` (padrão
  `apps/tron/data-runtime/`, gitignored) com `placar.json` (placar do dia, fuso de São Paulo).
- SSE: o proxy precisa deixar a conexão aberta e sem buffer (o kit já manda `X-Accel-Buffering: no`; no nginx use
  `proxy_buffering off` e `proxy_read_timeout` ≥ 5 min).
- Partidas vivem em memória: reiniciar o processo encerra as partidas em andamento.

## Limitações conhecidas
- O ritmo do jogo depende da latência do Jev (≈2 casas/s medindo do Brasil). Com latência alta o tick sobe até 700 ms.
- O Jev decide com o estado do passo anterior (como qualquer jogador com reação): uma curva súbita do humano no mesmo
  passo pode causar batida de frente.
- Placar do dia e partidas são por servidor; não há ranking de jogadores.

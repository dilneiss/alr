# Carro Autônomo

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-carro.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar carro`.


O Jev é o cérebro de um carro autônomo. Um simulador 2D visto de cima (canvas, 60 fps) mostra uma avenida de mão única
com 2 faixas à noite: 2 semáforos com cruzamento e tráfego transversal, faixas de pedestres, obras numa faixa, zona
escolar de 30 km/h e carros mais lentos. A cada ~0,35 s o carro manda os sensores para o Jev, que decide **o que fazer
agora** — acelerar, manter, frear suave, frear forte, mudar para a esquerda ou para a direita — e **por quê**. O
público pode soltar cones na pista com um clique, chamar um pedestre ou colocar um carro lento na frente e ver o Jev
reagir ao vivo.

## Por que é um uso inteligente do Jev
- **Tempo real de verdade**: decisão tipada em ~350 ms (p50, medido do Brasil) e 3 perguntas numa única chamada. Um
  LLM que gera texto levaria segundos por decisão — aqui são ~150 decisões por minuto, e o carro anda enquanto decide.
- **O Jev dirige mesmo**: o controlador de baixo nível só executa o comando (curva de aceleração/frenagem suave e troca
  de faixa suave). Sem decisão do Jev, o carro não anda; se as decisões param de chegar por 1,6 s, ele freia por
  segurança. O freio de emergência determinístico (tempo até colisão < 0,7 s) é uma rede de segurança **contada na
  tela** ("Freio de emergência · meta 0") — nos testes ficou em 0.
- **Probabilidades à vista**: no painel de instrumentos, as 6 ações são luzes-espia com a % do Jev (a escolhida acende),
  o medidor de perigo mostra a nota contínua 0–3 com ponteiro e o computador de bordo lista os 3 motivos mais prováveis.
  A fita "Decisões do Jev · últimos 12 s", no pé da tela central, mostra cada decisão colorida pela ação e com altura =
  certeza.
- **Custo de brinquedo**: US$ 0,000052 por decisão (~1.200 tokens de entrada) → ~US$ 0,008 por minuto dirigindo;
  1 milhão de decisões ≈ US$ 52.
- Todo texto que aparece (o balão de "pensamento" junto do carro, o log de viagem) é escrito pelo nosso código a partir
  da escolha do Jev. O Jev escolhe, pontua e estima — não escreve nada.

## Como funciona
```
navegador (sim.js 120 Hz + render.js 60 fps)          servidor (server.mjs + politica.mjs)        gateway → Jev
  sensores (só números/enums) ── POST /api/decidir ──▶ valida, monta o estado em português e ──▶ 1 chamada,
  aplica ação ◀──────────── ação, motivo, perigo, probs ◀── as 3 perguntas (critérios dinâmicos) ◀─ 3 respostas
```
- **Pipeline**: pede a próxima decisão assim que a anterior chega (mínimo 0,33 s entre pedidos). A física não espera.
- **Sensores** (compensados pela latência: a velocidade enviada é a prevista para quando a decisão chegar): velocidade
  e limite (e o próximo limite, na zona escolar), faixa atual e manobra em andamento com o propósito (ultrapassar,
  desviar, voltar), veículo à frente na faixa (distância, velocidade, se está lento para a via, segundos até encostar),
  pedestre atravessando ou esperando (distância), obstáculo na faixa (distância, segundos até chegar), próximo
  semáforo (distância até a linha de parada, cor, há quanto tempo, e se dá para parar antes com frenagem confortável),
  faixas vizinhas (existe? carro ao lado? livre para entrar e seguir? carro à frente/atrás, obstáculo).
- **O navegador nunca manda texto para o Jev**: só números e enumerações, validados e limitados em `politica.mjs`; o
  estado em português é montado no servidor (não dá para usar a rota como proxy genérico do Jev).
- **Máscara de ações** (como num sistema real): as opções de troca de faixa só entram na pergunta quando a faixa existe,
  não há carro ao lado, não há troca em andamento, o carro está andando (ou parado atrás de um obstáculo) e a troca tem
  propósito (a faixa de destino está livre ou a minha está bloqueada) — isso evita o zigue-zague de voltar para trás de
  um carro lento. Entre as opções válidas, quem escolhe é o Jev; as indisponíveis aparecem riscadas no painel.
- **Controlador**: `acelerar` = +2,5 m/s²; `manter` = 0; `frear_suave` = alivia (−0,4 m/s²) enquanto o alvo está longe
  e segue a desaceleração exata para parar no ponto certo (linha de parada, faixa de pedestres, 8 m antes do cone) ou
  igualar a velocidade do carro da frente, até 3,6 m/s²; `frear_forte` = 4 a 8 m/s²; trocas de faixa ao longo de
  14–32 m (suavização cúbica) com checagem de segurança (se a faixa ficar ocupada entre o pedido e a execução, a troca é
  vetada e contada no computador de bordo).

## Perguntas enviadas (uma chamada por decisão — ver `politica.mjs`)
| id | tipo | opções / níveis |
|---|---|---|
| `acao` | choice | `acelerar` · `manter` · `frear_suave` · `frear_forte` · `mudar_para_esquerda` · `mudar_para_direita` (as duas últimas só quando possíveis). Instrução com as regras: respeitar semáforos e limites, parar para pedestres (cruzam todas as faixas), manter-se à direita e usar a esquerda só para ultrapassar/desviar. Cada opção tem critério descritivo (ex.: `manter` inclui "o sinal ficou amarelo tão perto que não dá mais para parar com segurança"). |
| `motivo` | choice | `pista_livre` · `carro_lento_a_frente` · `semaforo_vermelho` · `semaforo_amarelo` · `pedestre` · `obstaculo` · `limite_de_velocidade` → vira o "pensamento" no balão junto do carro ("Sinal vermelho → frear suave") |
| `perigo` | score | 0 seguro · 1 atenção · 2 risco · 3 perigo iminente (contínuo) |

## Medido (2026-09-23, do Brasil, via gateway)
- **Latência por decisão**: p50 346 ms, p90 447 ms (3.156 chamadas, 0 erros). Ida e volta no navegador ≈ +15 ms.
- **Ritmo**: 140–165 decisões por minuto (≈ 2,6/s).
- **Custo**: US$ 0,000052 por decisão; **≈ US$ 0,0082 por minuto de simulação**; sessão de 3 min ≈ US$ 0,025.
- **Qualidade da política** (`node apps/carro/test/cenarios.mjs`): 47/47 situações canônicas com a ação e o motivo
  esperados (sinal vermelho/amarelo, ponto sem retorno no amarelo, fila no semáforo, pedestre atravessando/esperando,
  cones, obras, carro lento com e sem faixa livre, ultrapassagem, voltar para a direita, zona escolar…).
- **E2E, 40 s de direção** (5 execuções): 322–347 m, 0 colisões, 1 parada no vermelho, cone desviado, 0 intervenções
  do freio de emergência, 0 avanços de sinal; no percurso completo (~630 m, ~185 decisões) também 0 quase-acidentes.
- **Desempenho**: o `draw()` custa ~1,3 ms de JS por quadro; com GPU, ~120 fps em 1996×1628 px (DPR 2).

## Roteiro de 60 s para o vídeo
1. **0–5 s** — Página aberta: o cartão "O Jev é o motorista" no para-brisa. Aperte o botão redondo **Dar a partida**
   (a topbar mostra a latência de cada decisão).
2. **5–22 s** — O carro arranca ("Pista livre → acelerar" no balão junto do carro). O sinal fica amarelo a ~60 m:
   "Sinal amarelo → frear suave"; o caminho planejado fica âmbar até o "PONTO DE PARADA". Para no vermelho, pedestres
   atravessam, o tráfego da rua transversal passa. Sinal abre: "Sinal abriu → acelerar". Mostre a tela central do
   painel: *FREAR SUAVE · motivo: sinal vermelho · 98% de certeza*, com a luz-espia "Frear suave" acesa.
3. **22–32 s** — **Clique na pista** uns 40 m à frente do carro (ou a tecla **Cone** do console, tecla C): "Obstáculo
   na faixa → desviar pela esquerda", a luz-espia "Esquerda" pisca, "Desviou do cone" aparece no log de viagem e ele
   volta para a direita.
4. **32–42 s** — **Carro lento** (tecla L): o Jev ultrapassa pela esquerda ("Ultrapassou o carro lento").
5. **42–50 s** — **Pedestre** (tecla P): o Jev freia e espera ("Pedestre atravessando → esperar"). A fita "Decisões do
   Jev", no pé da tela central, fica âmbar.
6. **50–60 s** — Abra **Ver o que o Jev vê** (a lupa na topbar): o carro congela e dá para mostrar, na aba *Estado*, os
   sensores que o Jev leu e, em *Perguntas*/*Respostas*, as 3 perguntas e as probabilidades. Feche (Esc) e o Jev volta
   a dirigir. Termine no computador de bordo: 0 colisões e freio de emergência 0 em "01 Percurso", ~150 decisões/min por
   ~US$ 0,008/min em "02 Consumo do Jev".

Atalhos: **Espaço** pausa/continua · **C** cone · **P** pedestre · **L** carro lento · **1/2** velocidade.

## Controles e proteções de custo
- Botão de partida do console (o mesmo botão redondo dá a partida, pausa e continua), 1×/2× (em 2× a física dobra; as
  decisões continuam a cada ~0,35 s de tempo real) e o botão de reiniciar o percurso (seta circular).
- Pausa automática com a aba oculta (volta sozinha ao reaparecer), enquanto o inspetor está aberto e após 3 min rodando
  (botão continuar). `?maxrun=N` só pode encurtar esse tempo (usado no teste).
- Limites: 240 decisões/min por IP na rota, 2.400 decisões/hora por IP (`CARRO_DECISOES_POR_HORA`), máx. 6 cones,
  3 pedestres chamados e 3 carros lentos ao mesmo tempo; cone não pode cair perto demais do carro (nenhum motorista
  reagiria) nem no meio do cruzamento. Orçamento esgotado (`budget_exhausted`) e limite (`rate_limited`) viram
  mensagens na tela; sem resposta do Jev, o carro freia por segurança.

## Arquivos
- `server.mjs` — rotas `POST /api/decidir` (uma chamada ao Jev), `GET /api/stats` (km e decisões da demo),
  `GET /api/politica` (critérios, só leitura). Grava estatísticas em `DATA_DIR` (padrão `data-runtime/`).
- `politica.mjs` — validação dos sensores, estado em português, perguntas e máscara de ações.
- `public/sim.js` — mundo, física, IDM dos carros comuns, pedestres, semáforos, sensores, freio de emergência, placar.
- `public/render.js` — cidade à noite em 2,5D, câmera que segue o carro, caixas de percepção, minimapa.
- `public/app.js` — pipeline de decisões, painel de instrumentos, controles, pausas; `window.__carro` expõe ganchos de leitura para o teste.
- `public/index.html` + `public/carro.css` — o cockpit (para-brisa, cluster com velocímetro, tela central e medidor de perigo,
  computador de bordo e console); `public/fonts/` — Saira Condensed e Chivo Mono, servidas pelo próprio app.

## Deploy
- Node 22, zero dependências. `PORT` (padrão 4103), `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`),
  `DATA_DIR` (padrão `apps/carro/data-runtime`, precisa ser gravável), `CARRO_DECISOES_POR_HORA` (padrão 2400).
- O limite por IP usa `X-Forwarded-For`: o proxy reverso precisa repassar o IP real do visitante.
- O gasto é contínuo enquanto alguém dirige (~US$ 0,008/min por visitante): o teto diário por app no gateway é a
  proteção final (tela "o orçamento de demonstração acabou por hoje").

## Limitações conhecidas
- A física é cinemática (sem derrapagem) e a cidade é um circuito fechado fixo; os carros comuns seguem o modelo de
  motorista inteligente (IDM) e só trocam de faixa para desviar de obstáculos.
- O primeiro semáforo foi calibrado para fechar quando o carro se aproxima na largada (o vídeo sempre mostra uma
  parada no vermelho); depois disso os ciclos são fixos.
- Com ~0,35–0,7 s entre sensor e ação, o Jev às vezes decide com pouca certeza no meio de uma troca de faixa (oscila
  entre acelerar e manter); isso aparece honestamente nas barras.
- Em 2× o Jev decide metade das vezes por segundo de simulação — dá para ver mais frenagens bruscas.
- Pedestres e cones são desenhados maiores que o real para ficarem visíveis na câmera aérea.

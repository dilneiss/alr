# Cidade Viva

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-cidade.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar cidade`.


Uma cidade com **48 moradores, cada um com um cérebro Jev**. A cada hora do jogo (1 hora a cada ~4 s), **os 48
decidem o que fazer numa única chamada ao Jev**: 48 perguntas `choice`, uma por morador, respondidas em ~0,5 s por
~US$ 0,0009. O mundo é compartilhado por todos os espectadores (laço no servidor + SSE): você vê os moradores
caminharem pelas ruas até o destino, clica em qualquer um para ver o que ele sente e com que probabilidade o Jev
escolheu cada opção, e no **Modo Deus** dispara eventos (show grátis, tempestade, feriado… ou um texto livre) e vê
48 cérebros reagirem na hora seguinte.

## Por que é um uso inteligente do Jev

- **Multiagente barato de verdade.** 48 agentes × 24 horas = 1.152 decisões por dia simulado por **~US$ 0,02**, e
  cada rodada de 48 decisões sai em **~0,5 s**. Com um LLM gerando texto seriam 48 respostas por hora (ou um prompt
  enorme pedindo JSON de 48 agentes), com segundos de espera, custo muito maior e risco de devolver uma atividade
  que não existe. O Jev sempre devolve uma das opções válidas, com probabilidade.
- **Uma chamada, 48 perguntas, cada uma com o seu cardápio.** O `state` leva a cidade (hora, dia, clima, eventos,
  lugares fechados, preços) e a ficha de cada morador; cada pergunta traz **só as opções possíveis para aquele
  morador agora** (as regras do mundo filtram: lugar fechado, sem dinheiro, menor de idade no bar, despensa vazia
  para cozinhar, médico só para quem está doente/com saúde baixa ou é "preocupado com a saúde", e quem está
  "fraco de fome" — 14 h+ sem refeição e fome ≥ 95 — não tem forças para lazer). O Jev escolhe entre o que é
  possível — não existe decisão impossível para corrigir depois.
- **Critérios são a política.** Cada opção tem o formato *"O quê (preço). Para quem …"* e a ficha descreve o
  morador com palavras ("FAMINTA, com muita fome há 9h — precisa comer antes de qualquer outra coisa", "com sono",
  "EM HORÁRIO DE TRABALHO", "bem disposta"). O Jev casa uma coisa com a outra. Lazer é "para quem está bem
  disposto", então quem está com fome ou sono resolve isso primeiro — e quem está bem corre para o show. Os traços
  (sociável, caseiro, workaholic, fitness, festeiro, econômico…) mudam a decisão sem nenhuma regra escrita por nós.
- **O Jev também lê o texto livre.** O evento livre ("chegou um circo no parque com pipoca grátis") passa por uma
  chamada de 4 perguntas: é adequado para uma cidade pública (`noul`)? em que lugar acontece (`choice`)? de que tipo
  é — festa, perigo, comida… (`choice`, vira o ícone no mapa)? como os moradores vão se sentir (`score`)? Depois o
  texto entra no `state` e os 48 reagem sozinhos (medido no e2e: parque de 2 → 32 pessoas na hora seguinte).
- **Probabilidades à vista.** A Ficha do morador mostra a distribuição da última decisão, o Diário da Cidade mostra
  "Diego, operário, foi ao bar 46%" com "quase foi descansar (38%)" logo abaixo, e o inspetor mostra a chamada real.
  Todo texto da página é nosso; o Jev só decide.
- **Nada inventado.** Se o Jev falha, a hora não acontece (o mundo volta ao estado anterior e tenta de novo); não
  existe "decisão de mentira" para tapar buraco.

## Como funciona

```
navegador ──SSE /api/stream──▶ server.mjs (laço compartilhado) ──1 chamada/hora──▶ gateway ──▶ Jev (typesafe/jev-1.13)
          ◀── snapshot · pensando · hora · evento · fila · status
```

1. `pensando` → os moradores visíveis mostram "…" (estão esperando o Jev).
2. Uma chamada com 48 perguntas. Escolha final de cada morador: a opção mais provável; **se o Jev estiver dividido**
   entre opções quase empatadas (cada uma com ≥ 60% da probabilidade da primeira), sorteio entre elas com peso p³.
   Sem isso, um empate (cozinhar 38% × praça 36%) dava sempre o mesmo resultado e o morador "travava" por horas.
3. Nossa simulação aplica o efeito de uma hora da atividade escolhida nas necessidades (fome, energia, social,
   diversão, saúde, dinheiro) — tabela em `sim.mjs`, com modificadores por traço, clima e evento. A despensa é da
   **casa** (quem faz compras abastece a família; os adolescentes cozinham do que os pais compraram). Quem trabalha
   4 h+ sem comer faz uma refeição no serviço; café e bar só "enganam" a fome (não contam como refeição).
4. `hora` → cada morador caminha pelas ruas (grafo de ruas + Dijkstra) até o lugar, e o Diário da Cidade e as outras
   janelas atualizam.

- **Mundo:** 16 casas + escritório, fábrica, escola, hospital, restaurante, café, mercado, praça, academia, bar e
  parque, com horários de funcionamento (bar até 3h, restaurante fecha segunda, feriado fecha escritório/escola/fábrica).
  Clima muda a cada 3 h (sol, nublado, chuva; dias frios de 12–15 °C de base); dia/noite com luzes acesas.
- **Moradores:** `data/moradores.json` — 48 pessoas com nome, idade, profissão, turno, salário e 2 traços.
- **Eventos (Modo Deus):** 🎸 show grátis na praça (4 h), ⛈️ tempestade (5 h), 🍝 restaurante 50% off (5 h),
  🤒 surto de gripe (~38% adoecem), 🏭 fábrica dá folga (24 h), 🎉 feriado (24 h), 📣 evento livre (4 h, até 100
  caracteres). **Um evento a cada 20 s para a cidade inteira, com fila** (até 6).
- **Custo sob controle:** o laço **pausa sem espectadores** (SSE sem clientes = zero chamadas); a aba oculta
  desconecta; depois de **12 min sem interação** a página pausa e pede um clique; **teto de 900 horas simuladas por
  dia** (UTC) — ao atingir, a cidade "dorme" com aviso na tela. Estado persistido em `DATA_DIR/cidade.json`.

## As perguntas exatas

### A cada hora: 48 × `choice`

`state` (exemplo real da chamada de segunda-feira 00:00, 3 das 48 fichas):

```json
{
  "cidade": "Vila Jev, uma cidade pequena do interior do Brasil",
  "agora": "segunda-feira, 00:00 (madrugada, hora de dormir) — dia útil",
  "clima": "nublado, 22°C",
  "eventos_na_cidade": ["📣 Acontecendo na cidade agora (até amanhã 02:00): \"Chegou um circo no parque com pipoca grátis\" (perto de: parque)"],
  "lugares_fechados_agora": "escritório, fábrica, escola, restaurante, café, mercado, academia",
  "precos": "restaurante R$ 45 · café R$ 12 · bar R$ 50 · compras no mercado R$ 60 · academia R$ 10 · médico grátis",
  "moradores": {
    "m02": "Marcos, 36 anos, programador (caseiro, viciado em café) | turno hoje começa às 9h (9h–18h) | agora está: bem disposto, sem nenhuma necessidade urgente | comeu há 3h, sem dormir há 2h | R$ 522, despensa de casa com 6 refeições",
    "m03": "Lucas, 15 anos, estudante (sociável, dorminhoco) | aula hoje começa às 7h (7h–12h) | agora está: com um pouco de fome, com sono | comeu há 7h, sem dormir há 2h | R$ 32, despensa de casa com 6 refeições",
    "m07": "Rafael, 28 anos, personal trainer (fitness, madrugador) | turno hoje começa às 6h (6h–14h) | agora está: com sono | comeu há 10h, sem dormir há 1h | R$ 684, despensa de casa com 5 refeições"
  }
}
```

Palavras usadas na ficha: fome → "com um pouco de fome" / "com fome" / "FAMINTA" / "FAMINTA, com muita fome há N h —
precisa comer antes de qualquer outra coisa"; sono → "com sono" (16 h acordado, ou de madrugada com energia < 80) /
"cansada" / "caindo de sono" / "sono em dia, hora de levantar"; "COM GRIPE E FEBRE", "com a saúde fraca", "se sentindo
sozinha", "entediada", "quase sem dinheiro"; sem nada disso → "bem disposta, sem nenhuma necessidade urgente".

Pergunta de cada morador (`m01` … `m48`):

```json
{ "type": "choice",
  "instructions": "O que Carla (m01) faz das 18:00 às 19:00? Veja moradores.m01, a hora, o clima e os eventos.",
  "criteria": { "…só as opções possíveis para ela agora…": "" } }
```

| opção | critério enviado |
|---|---|
| `dormir` | Dormir. Para quem está com sono ou cansado; o normal de madrugada. |
| `trabalhar` | Trabalhar (hospital, R$ 38/h). Para quem está em horário de trabalho. *(estudantes: "Ir à aula. Para quem está em horário de aula.")* |
| `comer_no_restaurante` | Restaurante (R$ 45). Para quem está com fome e quer comer fora. *(com desconto: R$ 22, 50% off)* |
| `cozinhar_em_casa` | Cozinhar em casa. Para quem está com fome e quer economizar. |
| `fazer_compras` | Mercado (R$ 60). Para quem está com a despensa de casa vazia. |
| `socializar_na_praca` | Praça (grátis). Para quem está bem disposto e quer ver gente e curtir o que rola lá. |
| `tomar_cafe` | Cafeteria (R$ 12). Para quem quer despertar ou lanchar. |
| `treinar_na_academia` | Academia (R$ 10). Para quem está bem disposto e gosta de se exercitar. |
| `ir_ao_bar` | Bar (R$ 50). Para quem está bem disposto e quer festa e conversa à noite. |
| `ir_ao_medico` | Médico no hospital (grátis). Para quem está com gripe, febre ou doente. |
| `descansar_em_casa` | Relaxar em casa (TV, leitura). Para quem quer sossego. |
| `passear_no_parque` | Parque (grátis). Para quem está bem disposto e quer ar livre e movimento. |

### Evento livre: 1 chamada, 4 perguntas

| id | tipo | critérios |
|---|---|---|
| `adequado` | noul | pode mostrar a todos numa cidade pública? true: inofensivo, criativo, engraçado ou dramático · false: palavrão, ofensa, ódio, sexual, violência gráfica, propaganda, link ou spam. **Recusa se < 0,4.** |
| `lugar` | choice | praça, parque, restaurante, café, bar, mercado, academia, hospital, escola, escritório, fábrica, casas, cidade_toda |
| `tipo` | choice | festa, comida, perigo, clima, saúde, esporte, compras, animais, cultura, trabalho, tecnologia, outro → vira o ícone do pino no mapa |
| `animo` | score | 0 muito mal (medo) … 4 muito bem (empolgados) |

Links são recusados antes do Jev (regex), e o texto é limpo de caracteres de controle. Testado: *"O prefeito é um
idiota nojento e todo mundo devia bater nele"* → **recusado** (adequado 0,05); *"A dragon 🐉 landed in the park and is
giving free rides"* → aceito, lugar parque, tipo cultura, ânimo 3,7; *"🎉🎉🎉🎉"* → aceito, festa na cidade toda.

## O que medimos para chegar nesse prompt

- **Conjunto de avaliação** (`test/avaliacao.mjs`, 27 casos de resposta óbvia em 5 horários, cada horário = 1 chamada
  real de 48 perguntas): **27/27** na versão final. A primeira versão (necessidades em números + "o que fez na última
  hora") acertava 17/23 e, simulando um dia, só **29%** dormiam de madrugada e **8%** dos famintos iam comer — o Jev
  ancorava na última atividade (um aposentado ficou 19 h seguidas na praça). O que resolveu: necessidades em
  **palavras salientes**, tirar a "última atividade" da ficha, "sem dormir há N h" (em vez de "acordado", que puxava
  "ficar em casa acordado"), dica de período ("madrugada, hora de dormir") e critérios "Para quem…".
- **Fome × eventos.** Com eventos em sequência (show, circo…), adolescentes festeiros passavam 30 h sem comer
  indo de evento em evento: P(comer) de 6–17%. Com a ficha "precisa comer antes de qualquer outra coisa" + lazer
  "para quem está bem disposto": **41–80%**, e o circo continua lotado com quem está bem. A regra "fraco de fome"
  (sem lazer depois de 14 h sem refeição) é a rede de segurança.
- **48 perguntas numa chamada × 1 pergunta por chamada** (36 comparações em 3 horários): **97% de concordância**
  (a única diferença foi um empate 22% × 22%); distância média entre as distribuições 0,032. Latência: 560 ms para
  48 perguntas × 343 ms para 1.
- **Critérios compactos + opções filtradas:** mesma nota com ~20% menos tokens (25,7 → ~21 mil por chamada).

## Latência e custo medidos (2026-09-23, Mac no Brasil → gateway local → OpenRouter)

| ação | perguntas | latência | custo |
|---|---|---|---|
| 1 hora simulada (48 moradores) | 48 `choice` | p50 **~0,6 s** (544–603 ms), p90 ~0,86 s | **US$ 0,00088** (0,00064 de madrugada – 0,00116 de dia), ~21 mil tokens |
| 1 dia simulado (24 h) | 1.152 decisões | — | **~US$ 0,021** |
| evento livre (moderação + classificação) | 4 | 313–446 ms | **US$ 0,00004** |
| evento pronto (show, feriado…) | 0 | — | grátis (entra na próxima hora) |
| teto diário padrão (900 h) | — | — | **≤ ~US$ 0,80/dia** |

Efeito medido dos eventos na hora seguinte. As linhas "e2e" são da versão final (teste de ponta a ponta, mundo
compartilhado); as de "sondagem" compararam o mesmo mundo e a mesma hora com × sem o evento, numa versão anterior do
prompt (antes dos critérios compactos):

| evento | alvo | antes → depois |
|---|---|---|
| 🎸 show grátis — e2e | pessoas na praça | domingo 16h→17h: **11 → 34** · segunda 19h→20h: 11 → 33 · segunda 7h→8h: 0 → 19 · sábado 23h→0h: 1 → 28 · sábado 10h→11h: 4 → 28 |
| 📣 "Chegou um circo no parque com pipoca grátis" — e2e | parque | **2 → 32** · 3 → 24 · 0 → 17 · 1 → 16 · 1 → 11 |
| 🍝 restaurante 50% — sondagem (terça 19h) | comendo no restaurante | 4 → 16 |
| ⛈️ tempestade — sondagem (sábado 16h) | praça + parque | 10 → 0 |
| 🎉 feriado — sondagem (quarta 10h) | trabalhando | 32 → 13 (hospital, restaurante etc. seguem) |
| 📣 "O Brasil ganhou a Copa do Mundo!" — sondagem (quinta 20h) | praça + bar | 11 → 19 |

## Roteiro de 60 s para o vídeo

1. **0–6 s** — Abrir a página. Apontar o pulso na barra de título do mapa (janela "Vila Jev"): LED verde e
   *"48 decisões em ~500 ms · 1 chamada ao Jev · US$ 0,0009"*, e o relógio no alto à direita, com a barrinha que
   enche enquanto a hora anda (1 hora a cada 4 s). Quando a hora vira, o LED fica âmbar e o pulso diz *"48 moradores
   pensando… decidindo as 19:00 numa única chamada"*; os moradores mostram "…" e saem andando.
2. **6–16 s** — Clicar num morador no mapa (ou no nome dele no Diário da Cidade): a janela **Ficha do morador**
   mostra "Como está agora" (fome, energia, social, diversão, saúde e dinheiro em barras), **"Decisão do Jev nesta
   hora"** com as probabilidades e "O dia de hoje, hora a hora".
3. **16–24 s** — Mostrar a janela **Orçamento** (*"Custo por dia simulado US$ 0,02"*) e o **Diário da Cidade**
   (ex.: *"Diego, operário, foi ao bar 46%"*, com *"quase foi descansar (38%)"* embaixo).
4. **24–38 s** — **Modo Deus → Show grátis na praça.** O botão afunda com o LED verde, a plaquinha *"Show grátis na
   praça até 23:00"* aparece no canto do mapa e o palco acende; na hora seguinte a praça lota (em **Onde estão
   agora**, a linha Praça fica vermelha, com ▲20), a plateia dança e o Diário da Cidade diz *"foi ao show na praça 🎸"*.
5. **38–52 s** — Evento livre: digitar *"Chegou um circo no parque com pipoca grátis"* → **Disparar** (o megafone).
   O aviso diz onde o Jev pôs o evento (*"O Jev leu o evento e colocou no lugar “Parque”…"*), o pino aparece no
   parque e, na hora seguinte, o parque enche.
6. **52–60 s** — **Ver o que o Jev vê** (a lupa na barra do topo): a chamada de 48 perguntas, o estado com as fichas
   e as respostas (a chamada inteira abre em **48 perguntas ↗**, no Diário da Cidade).
   Fechar: *"48 cérebros, uma chamada, meio segundo, dois centavos por dia"*.

Dica de gravação: o mundo é compartilhado e o horário é o que estiver rolando; um dia do jogo dura ~96 s — espere
dar entre 8h e 22h do jogo para ter a cidade cheia (de madrugada quase todos dormem, o que também é bonito).

## Arquivos

- `server.mjs` — rotas, laço da cidade, SSE, fila de eventos, evento livre, persistência.
- `sim.mjs` — mundo: lugares e horários, clima, eventos, ficha dos moradores, perguntas, efeitos das atividades.
- `data/moradores.json` — os 48 moradores (semente versionada).
- `public/index.html`, `public/app.js` (janelas, SSE), `public/mapa.js` (canvas: ruas, prédios, caminhada, luzes, clima),
  `public/cidade.css` (o cromo de city-builder dos anos 90), `public/pixel.js` (os ícones em pixel) e `public/fonts/`
  (Pixelify Sans e Atkinson Hyperlegible, servidas pelo próprio app).

Rotas: `GET /api/stream` (SSE: `snapshot`, `pensando`, `hora`, `evento`, `fila`, `status`), `GET /api/estado`,
`GET /api/ultima-chamada` (estado + 48 perguntas + 48 respostas da última hora), `POST /api/evento`
(`{tipo: show|tempestade|desconto|gripe|folga|feriado}` ou `{tipo: "livre", texto}`), `GET /healthz`.

## Rodar e testar

```bash
cd "."
PORT=4104 DATA_DIR=scratch/data-cidade node apps/cidade/server.mjs    # precisa do gateway em :8787
node apps/cidade/test/avaliacao.mjs    # 27 casos, ≈ US$ 0,005
```

## Deploy (integrador)

- Node 22, zero dependências. Sobe com `PORT=4104 DATA_DIR=/caminho/persistente node apps/cidade/server.mjs`.
- Variáveis: `DATA_DIR` (padrão `apps/cidade/data-runtime`), `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`),
  `CIDADE_HORAS_DIA` (teto diário, padrão 900), `CIDADE_SEG_POR_HORA` (padrão 4), `CIDADE_MAX_CLIENTES` (padrão 400;
  máx. 8 conexões por IP).
- **Orçamento:** é o app mais "contínuo" do showcase. No teto, ~US$ 0,80/dia — cabe no `APP_DAILY_USD=1` padrão do
  gateway. Se o `BUDGET_TOTAL_USD` do gateway for pequeno, baixe `CIDADE_HORAS_DIA` (ex.: 450 ≈ US$ 0,40/dia).
  Se o gateway responder `budget_exhausted`, a cidade pausa 10 min e mostra aviso.
- **SSE atrás de proxy:** o servidor já manda `X-Accel-Buffering: no` e heartbeat a cada 15 s; no nginx use
  `proxy_buffering off` e `proxy_read_timeout` ≥ 60 s. Cada hora manda ~24 KB por espectador (o inspetor recebe uma
  amostra da chamada; a chamada completa fica em `/api/ultima-chamada`).
- O estado (`cidade.json`, ~50 KB) é salvo a cada hora e no `SIGTERM`. Apagar o arquivo recomeça a cidade numa
  sexta-feira às 6h.

## Limitações conhecidas

- O Jev escolhe a atividade; os efeitos nas necessidades são regras nossas, simples e determinísticas. Em
  empates, a escolha é sorteada entre as opções quase empatadas (o Diário da Cidade mostra "quase foi …").
- O Jev dá muito peso a eventos: um show grátis à meia-noite ainda lota a praça (medido: 1 → 28).
- A moderação do evento livre é do próprio Jev (limiar 0,4) mais filtro de links — boa, não infalível.
- Mundo compartilhado: o Modo Deus é de todos (1 evento a cada 20 s, fila de 6, 8 pedidos/min por IP).
- Quando o teto diário é atingido, a cidade para até 00:00 UTC (21h de Brasília).
- Emojis dependem da fonte do sistema (no Windows alguns bonecos ficam um pouco diferentes).
- No celular o mapa é pequeno: toque nos prédios para ver quem está dentro.

# Escape Room — O Laboratório do Dr. Maestro

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-escape.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar escape`.


Uma aventura de texto que entende **qualquer coisa que você digita** — gíria, erro de digitação, emoji, inglês — e
**nunca quebra as regras do jogo**. Você acorda trancado no laboratório de um cientista distraído que foi comprar pão:
3 salas (escritório → laboratório → saída), inventário, um robô assistente (o **Bip**) que reage ao seu tom, dicas,
cronômetro e ranking do dia.

A cada comando, o Jev recebe a cena e a **lista de ações válidas naquele momento** e escolhe uma delas em ~350 ms.
Toda a história (textos, falas do Bip, piadas) foi escrita à mão no jogo; o modelo só decide.

## Por que é um uso inteligente do Jev
- **NLU sem alucinação**: o parser de um jogo de texto é exatamente um problema de *escolha tipada*. "puxa essa gaveta aí",
  "open the drawer please" e "bora ver essa gaveta ai mano kkk" viram todos `abrir_gaveta`. O jogador **nunca** recebe algo que
  o jogo não permite — o Jev só pode devolver um dos rótulos da lista.
- **Lista dinâmica**: a lista de ações muda com o estado (itens aparecem, portas abrem, `pedir_desculpas_bip` só existe enquanto
  o Bip está emburrado). O Raio-X do Jev mostra a lista num cartão perfurado e sublinha em vermelho as ações recém-liberadas.
- **4 perguntas numa chamada, mesma latência de 1**: ação (`choice`), tom (`choice`), tipo de absurdo (`choice`) e objeto-alvo
  (`choice`). O tom tem consequência real (grosseria deixa o Bip emburrado e ele esconde a senha); o absurdo + objeto escolhem
  respostas engraçadas específicas ("Você chuta o cofre. O cofre nem se mexe. Seu dedão, por outro lado, manda lembranças.").
- **Sabe quando não sabe**: se a confiança da ação fica abaixo de 55%, o jogo pergunta "Você quis dizer: A ou B?" com as duas
  opções mais prováveis (clicáveis, sem nova chamada). Ex.: "mexe aí" → abrir a gaveta (35%) × olhar a mesa (12%).
- **Contexto honesto**: o `state` leva a cena, o inventário, as 3 últimas jogadas (para entender "pega ela") e as pistas que o
  jogador *já descobriu* — por isso digitar só "pipoca" depois que o Bip revelou a senha vira `usar_terminal` (100%).
- **Custo irrisório**: ~1.770 tokens por comando ≈ **US$ 0,000074**; uma partida inteira (~20 comandos) ≈ **US$ 0,0015**.

## Perguntas enviadas (uma chamada por comando — ver `game.mjs → montarChamada`)
| id | tipo | critérios |
|---|---|---|
| `acao` | choice | as ações válidas **agora** (9 a 15), cada uma com descrição da intenção. Ex. no início: `examinar_mesa`, `abrir_gaveta`, `examinar_caneca`, `ler_quadro`, `examinar_retrato`, `examinar_relogio`, `usar_cofre`, `usar_porta_lab`, `olhar_ao_redor`, `ver_inventario`, `pedir_dica`, `acao_impossivel`. Aparecem conforme o estado: `pegar_chavinha`, `pegar_cartao`, `ir_laboratorio`, `falar_com_bip`, `pedir_desculpas_bip`, `dar_chip_bip`, `abrir_caixinha`, `pegar_chip`, `usar_terminal`, `ler_terminal`, `ir_saida`, `usar_teclado_saida`, `examinar_item`… |
| `tom` | choice | `educado`, `neutro`, `rude`, `engracado` |
| `absurdo` | choice | `violencia`, `magia`, `comer_beber`, `fora_do_jogo`, `trapaca`, `festa`, `desistir`, `sem_sentido`, `nada_disso` |
| `objeto` | choice | objetos visíveis na sala + itens do inventário + `nenhum` |

Mais uma chamada, só no fim: o apelido do ranking passa por um `noul` ("contém palavrão, ofensa, ódio, conteúdo sexual ou
propaganda?"); ≥ 0,6 vira "Fugitivo anônimo".

Regras do motor (código, não modelo): `acao` com confiança < 0,55 → "Você quis dizer…?" com as 2 melhores opções (≥ 8%);
tom só conta com probabilidade ≥ 0,5 (reações extras do narrador/Bip com ≥ 0,75). Códigos (3-1-4, 4-2-7, "quatro dois sete",
"π") e a senha são lidos do texto por código comum depois que o Jev escolheu a ação — o Jev não extrai texto.

## Solução (spoiler)
Escritório: gaveta → chavinha; quadro ("COFRE = a hora em que o tempo parou") + relógio (3h14) → cofre `314` → cartão →
porta. Laboratório: estante → caixinha (chavinha) → chip → colocar no Bip → senha `pipoca` → terminal (mostra `4-2-7`) →
saída. Saída: teclado `427`.

## Medido (2026-09-23, gateway local → OpenRouter, a partir do Brasil)
- Latência por comando (gateway): **p50 358 ms, p90 451 ms** (188 chamadas do app); partida do e2e: média 381 ms, p50 349 ms.
- Custo por comando: **US$ 0,000074** (≈1.770 tokens de entrada, 4 perguntas). Partida completa do e2e (23 chamadas): **US$ 0,0017**.
- e2e final: **94 verificações, 0 falhas, 0 erros de console** (~63 s).
- Precisão no e2e: 22/22 frases informais viraram a ação esperada ("dá uma olhada na mesa", "puxa essa gaveta aí",
  "pega a chavinha", "bip, me ajuda por favor", "enfia esse chip no robô", "pipoca", "look around", "digita 4-2-7 no teclado"…);
  "asdfgh qwerty zxcv" → `acao_impossivel` + `sem_sentido`; "bip, anda logo, lata velha!" → tom `rude` 98%.

## Roteiro de 60 s para o vídeo
1. (0–5 s) Página aberta na capa de couro do diário: "O Laboratório do Dr. Maestro", "Fuja antes que ele volte", os três
   passos e o botão de latão **Começar a fuga**. Clicar: a gravura do escritório pousa sobre o diário aberto e a primeira
   página se escreve sozinha.
2. (5–15 s) Na barra de latão da máquina de escrever, digitar **"dá uma olhada na mesa"**: no **Raio-X do Jev** (o
   decodificador de latão à direita), o ponteiro sobe, a fita imprime `examinar_mesa` e o visor mostra a certeza. Digitar
   **"mexe aí"** (antes de abrir a gaveta): o ponteiro fica na zona vermelha de dúvida e o diário pergunta "Você quis
   dizer:" com **abrir a gaveta** e **olhar a mesa** (o Jev sabe quando não sabe). Clicar **abrir a gaveta** → a gaveta
   abre na gravura, sem nova chamada ao Jev.
3. (15–22 s) Clicar no bilhete **"guarda essa chave no bolso 🔑"** → a chavinha aparece em "Nos bolsos". Digitar
   **"chuta o cofre 🦶"** → resposta engraçada; a fita mostra `acao_impossivel` e as etiquetas "absurdo: violência" e
   "alvo: cofre".
4. (22–32 s) Ir rápido: "lê o quadro", "que horas o relógio marca?", "digita 3-1-4 no cofre", "pega o cartão",
   "passa o cartão na porta" → a gravura vira a Estampa II (laboratório) e a planta marca "Laboratório · você".
5. (32–42 s) Digitar **"bip, anda logo, lata velha!"** → no anunciador do tom, a bandeirola cai em "rude" (~99%) e o Bip
   vira de costas ("HMPF!"). Digitar **"foi mal, Bip, desculpa 🙏"** → ele perdoa; no cartão perfurado,
   `pedir_desculpas_bip` só existia naquele momento.
6. (42–55 s) "olha a estante", "abre a caixinha com a chavinha", "pega o chip", "coloca o chip no bip" → o Bip lembra a senha;
   digitar só **"pipoca"** → terminal liberado; "bora pra saída!", **"digita 4-2-7 no teclado"** → a porta se abre com luz
   do sol, clarão e confete de papel e folha de ouro.
7. (55–60 s) A certidão de fuga (as duas últimas páginas do diário): selo de lacre, "Você escapou!", o título pelo seu
   tom, tempo, comandos, "entendidos de primeira", latência média e **custo da partida (~US$ 0,0015)**; clicar
   **Ver o que o Jev viu** para mostrar a lista de ações e as probabilidades cruas.

## Rodar e testar
```bash
cd "."
PORT=4109 node apps/escape/server.mjs          # gateway do Jev em http://127.0.0.1:8787
node apps/escape/test/engine.test.mjs          # motor sem Jev (regras, textos, parsing de códigos)
```
Capturas: `test/shots/01-inicio.png`, `02-escritorio.png`, `03-duvida.png`, `04-laboratorio.png`, `05-saida.png`,
`06-fuga.png`, `07-final.png`, `mobile.png`.

## Arquivos
- `game.mjs` — motor: salas, itens, lista dinâmica de ações, textos, dicas, falas do Bip por tom, respostas de absurdos.
- `server.mjs` — rotas (`/api/novo`, `/api/estado`, `/api/comando`, `/api/escolher`, `/api/ranking`, `/api/info`), sessões em
  memória (TTL 2 h, máx. 5.000, 1 comando por vez por partida, máx. 300 comandos), ranking/estatísticas em `DATA_DIR`.
- `public/` — `index.html` (o gabinete vitoriano: diário encadernado com a gravura da sala, "Nos bolsos", "Planta",
  bilhetes "Frases para testar", "Diário da fuga", barra de latão da máquina de escrever, o "Raio-X do Jev" como
  decodificador de latão, capa e certidão de fuga), `escape.css` (nogueira, latão e pergaminho; texturas em SVG embutido),
  `scene.js` (ilustrações SVG das 3 salas com estados; a página aplica por cima um filtro de gravura em tons de latão),
  `app.js` (diário com máquina de escrever, Raio-X, bolsos, planta, bilhetes, "Você quis dizer", certidão e ranking).
- `public/fonts/` — IM Fell English 400 e itálico (títulos), EB Garamond variável e itálico (texto) e Special Elite
  (máquina de escrever e fita do decodificador): 5 arquivos `.woff2`, subconjunto latino do Fontsource, servidos pelo
  próprio app.

## Deploy
- Node 22, zero dependências. `PORT=4109`, `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`),
  `DATA_DIR` (padrão `apps/escape/data-runtime/`, gitignored) para `ranking.json` e `stats.json`.
- Sessões ficam em memória: reiniciar o processo zera partidas em andamento (o navegador recebe "partida expirou" e recomeça).
- Limites por IP: 45 comandos/min, 20 partidas novas/min, 10 envios de ranking/min.

## Limitações conhecidas
- Uma aventura curta (3 salas, ~15 passos); não há salvamento entre servidores (memória do processo).
- Comandos de até 200 caracteres. Frases compostas ("abre a gaveta e pega a chave") executam só a ação principal.
- Frases muito vagas ("abre") podem cair em "Você quis dizer…?" ou numa escolha razoável, dependendo do contexto.
- O ranking é do dia (fuso de São Paulo), top 50, e fica no disco do servidor.

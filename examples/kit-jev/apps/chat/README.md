# Chat com Moderação ao Vivo

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-chat.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar chat`.


Um chat público no estilo live do YouTube em que **cada mensagem passa pelo Jev antes de aparecer** (~350 ms). O público
vê só o que foi aprovado; o console do moderador vê tudo, com as probabilidades de cada decisão. O dono da live escreve
**regras em português comum** ("Proibido falar de futebol") e cada regra vira, na hora, uma pergunta do Jev — inclusive
para as mensagens que já estavam na tela. Multiusuário de verdade (SSE): quem assistir ao vídeo pode entrar e testar.

## Por que é um uso inteligente do Jev
- **Uma chamada por mensagem, todas as perguntas juntas**: categoria (`choice`, 9 opções), toxicidade (`score` 0–3),
  ação sugerida (`choice`, 4) e **uma pergunta `noul` por regra ativa**. 5 ou 27 perguntas custam praticamente a mesma
  latência (medido: 369 ms com 5 perguntas × 345 ms com 27). É isso que permite moderar *antes* de publicar sem travar o chat.
- **Regras em linguagem natural viram perguntas tipadas**: "Proibido falar de futebol" vira
  `noul: "Regra do chat: … A mensagem_nova desrespeita essa regra?"`. Nada de lista de palavras proibidas: o Jev julga
  assunto e intenção ("que aula ANIMAL, matou a pau" não é futebol; "Palmeiras não tem mundial 😂" é).
- **Regra nova vale para o passado, numa chamada só**: ao criar uma regra, o Jev reavalia as últimas mensagens publicadas
  com **uma pergunta por mensagem na mesma chamada** (até 60 perguntas, ~400 ms). As que violam somem da tela com animação.
  Medimos 89/90 de concordância com a avaliação individual, desde que o texto de cada mensagem vá *dentro* da pergunta
  (com ids no estado o modelo trocava mensagens vizinhas — por isso a pergunta é autocontida).
- **Nuance em vez de palavra-chave**: "cuidado com golpe do pix gente" é publicada (é um alerta); "porra, que ferramenta
  boa" sai **com aviso** (palavrão sem alvo); "esse apresentador é um b*ab*ca" é ocultada (xingamento disfarçado).
- **Apelido também passa pelo Jev** (1 `noul`, US$ 0,000016): "vai tomar no c*" é recusado (97% impróprio).
- Todo texto da tela (motivos, avisos, rótulos) é escrito por nós; o Jev só escolhe, pontua e estima. Zero alucinação.

## Perguntas enviadas por mensagem (ver `server.mjs`)
Estado: `{ live: {titulo, tema}, ultimas_mensagens: [5 últimas publicadas], mensagens_recentes_do_autor: [até 3, com status], autor, mensagem_nova }`.

| id | tipo | critérios |
|---|---|---|
| `categoria` | choice | `ok` (mensagem normal), `ofensa_xingamento` (inclusive disfarçado com asteriscos/números), `discurso_de_odio`, `spam_propaganda` (divulgação, corrente, flood), `golpe_dinheiro_pix`, `assedio`, `conteudo_sexual`, `dados_pessoais` (CPF, telefone, cartão…), `fora_do_tema` |
| `toxicidade` | score 0–3 | respeitosa · levemente rude · ofensiva · grave (cada nível com descrição e exemplo) |
| `acao` | choice | `publicar` (mesmo fora do tema — conversa paralela é normal), `publicar_com_aviso`, `ocultar`, `silenciar_autor_5min` |
| `regra_<slug>_<hash>` (1 por regra) | noul | `Regra do chat: "<regra>". A mensagem_nova desrespeita essa regra? Julgue pelo assunto e pela intenção da mensagem, não por palavras soltas.` |

Outras chamadas: **regra aplicada ao histórico** (`noul` por par regra × mensagem, com o texto dentro da pergunta, até 60
por chamada) e **apelido** (`noul apelido_improprio`: ofensivo, obsceno, propaganda ou se passando por moderador/famoso).

### Como a decisão é tomada (limiares em `L`, `server.mjs`)
1. Soma das categorias ruins ≥ 0,50 → **oculta para todos** (motivo = categoria ruim mais provável).
2. Senão, toxicidade ≥ 1,75 → oculta; senão p(ocultar) + p(silenciar) ≥ 0,80 → oculta.
3. Senão, p(publicar_com_aviso) ≥ 0,45, toxicidade ≥ 0,75 ou categorias ruins ≥ 0,30 → **publica com aviso**.
4. Senão → **publica** ("✓ 350 ms").
5. Mensagem ocultada com p(silenciar_autor_5min) ≥ 0,50, ou 2ª ocultada do mesmo autor em 3 min → **autor silenciado
   5 min** (as mensagens seguintes são descartadas sem consultar o Jev — custo zero).
6. Regra pessoal com `noul` ≥ 0,70 → mensagem some **na visão de quem tem a regra**.

### Regras: por que são pessoais (decisão de design)
Para evitar vandalismo público (alguém criar "proibido dizer oi" para todo mundo), as regras valem para a **sessão de
quem editou**: cada visitante é o dono da própria visão do chat. As diretrizes da comunidade (golpe, ofensa, ódio, spam,
dados pessoais…) valem para todos. Tecnicamente, cada mensagem é avaliada contra a **união** das regras dos espectadores
conectados (deduplicadas pelo texto, teto de 24 por chamada) — continua sendo **uma chamada só** — e cada espectador
recebe pelo SSE a sua própria visão. No inspetor, regras de outras pessoas aparecem só como contagem, e mensagens
ocultadas de outros autores aparecem mascaradas no estado (privacidade). O navegador guarda sid, apelido e regras
(`localStorage`) e ressincroniza sozinho se o servidor reiniciar.

## Medido (2026-09-23, servidor local no Brasil → OpenRouter)
| ação | chamadas | latência | custo |
|---|---|---|---|
| enviar mensagem (5–6 perguntas) | 1 | p50 **357 ms**, p90 445 ms | **US$ 0,000063** (~1.500 tokens) → US$ 0,063 por mil mensagens |
| criar regra (reavalia até 40 mensagens) | 1 | 300–450 ms | US$ 0,00002–0,00025 (1 a 60 perguntas) |
| entrar com apelido | 1 | ~350 ms | US$ 0,000016 |
| simular chat (30 mensagens, 29 chamadas) | 29 | ~22 s em 4×, ~55 s em 1× | **US$ 0,0018** no total |

Acerto no roteiro da simulação: **30/30 em todas as rodadas de teste** (4 com a versão final dos critérios: 2 pela API e
2 pelo e2e) — 13 ruins bloqueadas, 13 boas publicadas, 1 com aviso e 3 de futebol que somem só para quem tem a regra. Tokens: ~280 fixos do Jev por chamada + categoria 336 + ação 170 +
toxicidade 144 + estado ~230 + 84 por regra.

## Roteiro de 60 s para gravar o vídeo
1. Abrir a página (1440×900): a sala de controle com a placa **NO AR** acesa. Mostrar: à esquerda, o monitor
   **PGM · Chat ao vivo** ("o que o público vê"); à direita, o **Console do moderador** ("o que o moderador vê"), com a
   ponte de medidores no alto, o monitor **PVW · Decisão do Jev** no meio, as **Regras da sua live** (as chaves) ao lado
   e a fita do **Log ao vivo** embaixo.
2. Clicar **Simular chat** (a tecla creme com o triângulo vermelho, que acende em vermelho e vira "Parar simulação ·
   N/30") → as mensagens entram no PGM com a luz verde e "✓ 3xx ms"; golpe do PIX, spam repetido, xingamento com
   asteriscos, CPF e cantada nunca aparecem no chat, só na fita do log (linhas em tinta vermelha, com a barra
   pontilhada de probabilidade e o carimbo do motivo, ex.: "GOLPE (100%)"). A cada mensagem, o monitor PVW acende na
   cor do veredito e mostra as barras de categoria, ação e toxicidade.
3. Com a simulação rodando, digitar a regra **"Proibido falar de futebol"** (ou clicar na ideia "+ Proibido falar de
   futebol") e clicar **Adicionar** → a regra entra como uma chave acesa; as mensagens de futebol que já estavam na
   tela levam uma tarja azul listrada "ocultada pela sua regra … 98%" e somem (azul é a cor das suas regras; o
   vermelho fica para as diretrizes gerais); o quadro abaixo do campo mostra "O Jev reavaliou N mensagens recentes …
   numa chamada só, em ~400 ms". As próximas mensagens de futebol nem aparecem.
4. Entrar com um apelido e digitar **"o Flamengo vai ganhar hoje"** → a mensagem fica só para você, riscada, com a luz
   azul: "Sua mensagem foi ocultada pela sua regra “Proibido falar de futebol” (97%)". Digitar **"ganhe R$ 500 por
   dia, chama no pix"** → riscada, com a luz vermelha: "Sua mensagem foi ocultada: golpe (100%). Só você vê isto."
5. Mostrar a ponte de medidores (**Bloqueadas** em % com o medidor de segmentos, **Latência** mediana e **Custo**
   **US$ 0,06 por mil mensagens**) e abrir **Ver o que o Jev vê** (o botão do olho na barra do topo) para mostrar a
   regra virando pergunta `noul` na chamada real.

## Rotas
`GET /api/config` · `GET /api/stats` · `GET /api/stream?sid=` (SSE: `init`, `msg`, `sim`, `online`) ·
`POST /api/sessao` (sincroniza apelido/regras, reaplica regras) · `POST /api/entrar` (apelido) ·
`POST /api/regras` (define a lista, reaplica ao histórico) · `POST /api/enviar` · `POST /api/simular` · `POST /api/simular/parar`.
Limites por IP/min: enviar 40 (+ modo lento de 1 s por sessão), regras 20, apelido 12, sessão 60, simular 6
(1 simulação por vez no servidor, teto diário `CHAT_MAX_SIM_DIA`=300), até 30 conexões SSE por IP e 3.000 no total.

## Rodar e testar
```bash
cd "."
PORT=4105 node apps/chat/server.mjs            # precisa do gateway em 127.0.0.1:8787
```
O e2e usa duas sessões (A e B) e confere mensagem a mensagem contra o gabarito de `data/simulacao.json`; capturas em
`test/shots/` (1440×900 e `mobile.png` 390×844). `?velocidade=2..4` na URL acelera a simulação (o teste usa 4).

## Deploy
- Node 22, zero dependências. Variáveis: `PORT` (4105), `DATA_DIR` (padrão `apps/chat/data-runtime/`: `historico.json`
  com as 200 últimas mensagens, `stats.json`, `salt`), `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`),
  `CHAT_MAX_SIM_DIA` (padrão 300).
- **SSE atrás de proxy**: desligar buffering (o kit já manda `X-Accel-Buffering: no`) e usar timeout de leitura longo
  (o kit envia heartbeat a cada 15 s). O IP do cliente vem de `X-Forwarded-For`.
- Estado de sessões, silêncios e simulação fica em memória (um processo só; não escalar horizontalmente).

## Limitações conhecidas
- Mensagem de até 200 caracteres; regra de 4 a 120; até 8 regras por sessão; histórico de 200 mensagens.
- Regras são pessoais: quem não tem a regra continua vendo a mensagem (por design, anti-vandalismo).
- Se mais de 24 regras distintas estiverem ativas entre os conectados, as excedentes não entram na chamada daquela
  mensagem (a visão desses espectadores fica sem essa checagem para ela); ao reabrir a página, o Jev reaplica as regras
  às 40 mensagens mais recentes.
- Silêncio vale por sessão (limpar o navegador cria outra sessão; o limite por IP continua valendo).
- O Jev julga só o texto: não abre links nem confere se um CPF é real.

# Comentários → Oportunidades

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-comentarios.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar comentarios`.


Cole o link de um vídeo do YouTube: o app baixa até 300 comentários pela API oficial e o Jev lê todos em segundos,
separando **leads**, **dúvidas sem resposta do canal**, **pedidos de vídeo**, críticas e **spam**. O resultado chega ao
vivo, lote por lote, como a primeira página de um jornal: o mosaico (um quadradinho por comentário) vai acendendo com a
cor do sentimento e a marca de lápis azul da oportunidade, enquanto a manchete, "Em números", a distribuição por tipo e
as colunas se preenchem.

Na tela (redação de jornal: papel-jornal, tinta preta e o lápis azul do editor, que só aparece onde o Jev decidiu algo):
4 **pautas prontas** (os vídeos recentes do canal configurado (YOUTUBE_CANAL_ID) com mais comentários + o vídeo do David Ondrej que apresentou
o Jev), a **pauta** (cabeçalho do vídeo) com barra de progresso, a **manchete** (a maior oportunidade da edição, com o
número circulado a lápis), **Em números** (comentários, % positivos, leads, sem resposta, pedidos de vídeo, críticas,
spam), o mosaico, o **Humor do público** (barra de sentimento), a **Distribuição por tipo** (clique filtra), o **Resumo
da edição**, escrito por template a partir dos números, as 5 colunas (**Leads quentes**, **Dúvidas sem resposta**,
**Pedidos de vídeo**, **Críticas** e **Spam para remover**; cada item com autor, curtidas, respostas, "canal respondeu"
e link direto para o comentário no YouTube) e os **Classificados** (todos os comentários, com abas por
tipo/oportunidade, ordenação e **Exportar CSV**).

## Por que é um uso inteligente do Jev
- **Centenas de decisões por segundo**: 4 perguntas por comentário, 20 comentários por chamada, 6 chamadas em paralelo.
  155 comentários = 620 decisões em ~0,9 s, por ~US$ 0,003. Cada resposta é sempre uma das opções válidas, com
  probabilidade — nada de categoria inventada nem texto para interpretar.
- **Sai probabilidade, não opinião**: cada lista é uma regra sobre números calibrados — "merece resposta" ≥ 0,6 **e** o
  canal ainda não respondeu (dado da API), lead = interesse em comprar ≥ 0,55. 0,5 é "não sei" e fica de fora.
  No vídeo do Jev, ele marca como spam 6 dos 8 comentários-robô que empurram o livro "The Erased Book of Wealth by
  Leon Price" (até 93%) e separa pergunta retórica ("What exactly is revolutionary here?", merece resposta 0,49 — fica
  de fora) de pergunta de verdade ("how does this compare to other classification models", 0,78).
- **Funciona em português e inglês** com os mesmos critérios em português.
- Todo texto da tela (rótulos, resumo, mensagens) é nosso; o Jev só escolhe, pontua e estima.

## Perguntas enviadas (ver `server.mjs`, função `perguntasPara`)
Por comentário `cNNN` (o `state` leva `{ video: {titulo, canal}, comentarios: { c001: "texto (até 500 caracteres)", … } }`):

| id | tipo | instrução | critérios |
|---|---|---|---|
| `cNNN_tipo` | choice | "Tipo do comentário cNNN" | pergunta: pergunta ou pedido de ajuda · elogio: elogio ou agradecimento · critica_construtiva: crítica respeitosa ou sugestão de melhoria · reclamacao: reclamação ou raiva, sem sugestão · pedido_de_conteudo: pede um vídeo ou tema novo · intencao_de_compra: quer comprar, assinar ou contratar; pergunta preço ou link · compartilha_experiencia: conta experiência ou dá opinião · piada_meme: piada, meme ou ironia · spam_golpe: spam, golpe, autopromoção ou bot · outro: outro |
| `cNNN_resp` | noul | "cNNN merece resposta do criador (pergunta real, pedido de ajuda, problema ou interesse em comprar)?" | — |
| `cNNN_compra` | noul | "O autor de cNNN quer comprar, assinar, contratar ou entrar em curso/comunidade, ou pede preço/link?" | — |
| `cNNN_sent` | score | "Sentimento de cNNN" | muito negativo · negativo · neutro · positivo · muito positivo |

Regras da tela: **lead** = `compra` ≥ 0,55 (ou tipo intencao_de_compra; calibrado nos vídeos de teste: o lead real
ficou em 0,59–0,62 em rodadas diferentes e o comentário ambíguo "i got approved from the waitlist" em 0,50); **sem resposta** = `resp` ≥ 0,6 e sem resposta
do canal entre as respostas que a API devolve; **pedido de vídeo** = tipo pedido_de_conteudo (ou ≥ 0,4 entre os 3 mais
prováveis); **crítica** = tipo mais provável critica_construtiva ou reclamacao (coluna Críticas); **spam** = tipo spam_golpe;
**positivo** = sentimento arredondado ≥ 3. Comentários do próprio canal são
ignorados.

## Como o formato foi escolhido (medido em 2026-09-23 com comentários reais)
- **Custo por tipo de pergunta** (20 comentários por chamada): `choice` de 10 opções ≈ 247 tokens por comentário (cada
  opção custa ~20 tokens, com descrição longa ou curta), `score` de 5 níveis ≈ 56, `noul` 12–30.
- **Critérios longos × curtos**: 578 → 416 tokens por comentário, com 85–92% de concordância no tipo e 95–97% no
  "merece resposta" (80 comentários, PT e EN). Ficaram os curtos.
- **Lote de 20 × 1 comentário por chamada** (40 comentários, formato final): "merece resposta" igual em 40/40, lead em
  39/40, nível de sentimento em 37/40, tipo em 32/40 (as divergências são casos ambíguos: "outro" × "opinião",
  "piada" × "elogio"). O lote custa 40% menos que 20 chamadas avulsas. Lote de 40 dá a mesma concordância; 20 gera
  mais passos de progresso ao vivo.

## Latência e custo medidos
| ação | chamadas | decisões | custo | tempo |
|---|---|---|---|---|
| analisar f6We53TnkbU (155 comentários) | 8 (6 em paralelo) | 620 | **US$ 0,0028** | Jev **0,85–1,9 s** (típico ~0,9 s); clique → fim 1,7–3,0 s (inclui ~0,8 s do YouTube na 1ª vez) |
| analisar lhaPanvj2Vg — Maestros (144) | 8 | 576 | **US$ 0,0027** | Jev 0,83–1,3 s; clique → fim 1,6–2,4 s |
| repetir um vídeo na mesma hora (cache) | 0 | — | US$ 0 | instantâneo (a tela mostra a medição original) |

Por chamada: p50 490 ms, p90 753 ms (186 chamadas, 0 erros; a latência varia com a carga do gateway, que é
compartilhado pelos 15 apps). ~416 tokens por comentário → US$ 0,0000175 por comentário (300 comentários ≈ US$ 0,005;
1 milhão ≈ US$ 17,50). Gasto total de desenvolvimento e testes: ~US$ 0,05.

**Atenção ao teto de US$ 0,002 por ação do brief comum**: uma análise nova passa dele quando o vídeo tem mais de ~115
comentários. Classificar em 10 tipos custa no mínimo ~370 tokens por comentário (medido acima), então não há formato
com os 10 tipos que caiba no teto para 300 comentários — o brief do app já previa ~US$ 0,003. Mitigações: cache de 1 h
por vídeo (exemplos só custam na 1ª análise da hora), análise compartilhada (duas pessoas no mesmo vídeo ao mesmo tempo
pagam uma vez), no máximo 4 análises novas simultâneas no servidor (as demais entram numa fila de até 40) e 6 análises
novas por minuto por IP.

Cota do YouTube (10.000 unidades/dia): 4 unidades por vídeo novo (1 `videos.list` + até 3 `commentThreads.list`); a
lista de exemplos gasta ~13 unidades a cada 12 h.

## Roteiro de 60 s para o vídeo
1. **0–6 s** — Tela inicial, a primeira página do jornal: o nome "Comentários → Oportunidades" com a seta riscada a
   lápis azul, a "Pauta do dia" ("Cole o link de um vídeo…") e as 4 "Pautas prontas" com miniatura.
2. **6–20 s** — Clique na pauta **"Build Anything with Jev, Here’s How" (David Ondrej)**. A página rola sozinha até a
   edição: o mosaico de ~150 quadradinhos acende em blocos de 20, a ponta do lápis corre na barra e o relógio marca ~1 s.
   Mostre o fechamento ao lado da pauta: "153 comentários em ~0,9 s", "por US$ 0,0027" e "8 lotes · 6 em paralelo · 612
   decisões".
3. **20–35 s** — Leia a manchete ("~20 perguntas esperam resposta do canal", com o número circulado a lápis) e "Em
   números". Role até as colunas: "Dúvidas sem resposta" (cada uma com o % de "merece resposta" circulado) e "Spam para
   remover" (os robôs do livro "The Erased Book of Wealth", riscados a lápis). Clique em "abrir no YouTube ↗" num deles.
4. **35–50 s** — Suba e clique na pauta **"Por que estão abandonando o Claude?"** (ou cole o link de um vídeo do Maestros
   da IA): 144 comentários em português, a manchete vira "1 lead quente" ("espero em breve ter condições de consumir os
   seus produtos", ~60%) e a coluna "Dúvidas sem resposta" fica como espaço reservado — o canal responde tudo.
5. **50–60 s** — Clique em **"Exportar CSV"** (na faixa dos Classificados) e na lupa **"Ver o que o Jev vê"** (as 8
   chamadas reais, com as perguntas).

## Limitações conhecidas
- Até 300 conversas (3 páginas da API, ordem de relevância); respostas a comentários não são classificadas.
- "Canal respondeu" usa as até 5 respostas que a API devolve junto de cada conversa: em conversas com mais de 5
  respostas, uma resposta do canal pode não aparecer.
- Vídeos privados, removidos ou com comentários desativados mostram erro amigável. Link de canal, playlist ou de outro
  site é recusado na própria página.
- Cada comentário vai ao Jev com até 500 caracteres (a tela mostra até 1.200).
- Cache em disco (1 h) em `DATA_DIR`; arquivos com mais de 6 h são apagados automaticamente.

## Rodar e testar
```bash
cd "."
PORT=4113 node apps/comentarios/server.mjs     # Node 22, sem dependências npm
```
Variáveis de ambiente: **`YOUTUBE_API_KEY`** (obrigatória em produção; em desenvolvimento, se ausente, lê
`DATA_DIR` (padrão `apps/comentarios/data-runtime/`; guarda comentários, análises e miniaturas em cache e o
`stats.json` — precisa ser gravável). O servidor faz requisições de saída para `www.googleapis.com` (API) e
`i.ytimg.com` (miniaturas, servidas pelo próprio app em `/api/thumb/:id`). A página não chama nenhum domínio externo.
**Proxy reverso**: `/api/analisar` é streaming (NDJSON, um evento por linha, dura ~1–3 s) — o proxy não pode
bufferizar nem comprimir essa rota (o app já envia `X-Accel-Buffering: no`; no Caddy/Traefik, sem `encode` nela) e
deve repassar `X-Forwarded-For` (limite por IP).
Arquivos: `server.mjs` (rotas, perguntas, streaming NDJSON, fila, cache), `youtube.mjs` (API e extração do ID do
link), `public/app.js` (interface), `public/jornal.css` (a identidade de jornal: papel, tinta e o lápis azul),
`public/fonts/` (Newsreader e Libre Franklin em `.woff2`, servidas pelo próprio app; licença OFL em `OFL.txt`),
`data/exemplos.json` (lista-semente usada se a API falhar ao montar os exemplos).

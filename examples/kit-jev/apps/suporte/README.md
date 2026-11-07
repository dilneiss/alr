# Central de Suporte com Triagem

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-suporte.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar suporte`.


Um helpdesk de uma escola online de IA (a fictícia **Sinapse**) em que **cada ticket que chega é triado pelo Jev numa
única chamada de ~350 ms**: departamento, prioridade (P1…P4), frustração, sentimento, quatro sinais de risco (pede
reembolso, risco de cancelar, precisa de humano, ameaça Procon/redes) e **a resposta pronta certa (macro), já preenchida
com o nome do cliente**. A tela é um **painel de partidas de aeroporto**: um ticket novo chega a cada 2–3 s ao painel
de plaquetas (split-flap), o Jev decide e as plaquetas viram até o destino (o departamento), o portão (A1…A7) e a
situação do voo (EMBARCANDO, PRIORIDADE ou ÚLTIMA CHAMADA). Então o ticket **embarca no portão do departamento**,
ordenado por prioridade. Abrir um ticket mostra o **cartão de embarque**, com as probabilidades e a resposta pronta. Um
botão joga **48 tickets de uma vez** (o backlog) e o Jev tria todos em ~0,6 s.

## Por que é um uso inteligente do Jev
- **É exatamente o problema para o qual o Jev existe**: "qual departamento? quão frustrado? qual a chance de pedir
  reembolso?". São decisões fechadas sobre texto livre — o Jev devolve sempre uma opção válida, com probabilidade
  calibrada, sem inventar categoria nem escrever resposta.
- **9 perguntas numa chamada só** (choice + score + noul), pelo preço e pela latência de uma: US$ 0,0001 e ~330 ms por
  ticket. Um atendente humano leva minutos para ler, classificar, priorizar e escolher a macro.
- **Critérios = política da empresa**: a prioridade P1 é definida em palavras ("cobrança indevida com ameaça de Procon,
  Reclame Aqui…"); a macro de retenção só é escolhida para quem pede para sair com educação — quem exige cancelar
  irritado recebe "cancelamento imediato, sem oferta". Mudar a política = editar um texto, sem treinar nada.
- **Tudo o que o cliente lê foi escrito por nós** (20 macros com `{nome}` e `{plano}`); o Jev só **escolhe** qual.
  Zero alucinação, pronto para produção.
- **Lote**: 12 tickets no mesmo estado × 3 perguntas = 36 perguntas por chamada, 4 chamadas em paralelo → 48 tickets em
  ~0,6 s por US$ 0,0017. Medido: departamento idêntico ao da triagem individual em 60/60 tickets.
- **Detalhe sob demanda**: o ticket do lote chega ao portão só com a triagem rápida; ao abrir o cartão de embarque, o
  app faz a triagem completa (9 perguntas) daquele ticket. Gasta só onde alguém olha.

## Perguntas enviadas ao Jev (ver `triagem.mjs`)
Estado: `{ empresa: "Sinapse — … Política: reembolso integral em até 7 dias…", ticket: { canal, cliente, plano, cliente_ha, assunto?, mensagem } }`.

| id | tipo | critérios |
|---|---|---|
| `departamento` | choice | `financeiro`, `acesso_tecnico`, `conteudo_pedagogico`, `comercial_upgrade`, `retencao_cancelamento`, `parcerias_imprensa`, `outro` (cada um com descrição concreta) |
| `prioridade` | score 0–3 | P4 baixa (dúvida, elogio, spam) · P3 normal (pedido administrativo) · P2 alta (dinheiro em jogo, sem acesso ao que pagou, prazo próximo) · P1 urgente (cobrança indevida + ameaça de Procon/Reclame Aqui/redes, cliente furioso reincidente, bloqueado com algo que acontece hoje) |
| `frustracao` | score 0–4 | calmo · levemente incomodado · frustrado · muito irritado (CAPS, ironia, "já pedi") · furioso (ameaça) |
| `sentimento` | score 0–4 | muito negativo → muito positivo |
| `pede_reembolso` | noul | pede reembolso/estorno? |
| `risco_cancelamento` | noul | há risco de cancelar/sair? |
| `precisa_humano` | noul | precisa de atendente sênior (furioso, exceção à política)? |
| `ameaca_publica` | noul | ameaça Procon, Reclame Aqui, redes, processo, chargeback? |
| `macro` | choice (20) | estorno de cobrança · reembolso na garantia · reembolso fora do prazo (análise) · status do reembolso · novo link de pagamento · nota fiscal · reenvio de acesso · troca de e-mail · bug → time técnico · certificado · dúvida de aula → monitor · retenção (pausa/desconto) · cancelamento sem oferta · upgrade · proposta para empresas · parcerias/imprensa · agradecer elogio · pedir detalhes · arquivar spam · escalar para especialista |

Derivados no código: nível de prioridade = `round(score)` (P = 4 − nível), prazo (SLA: P1 1 h, P2 4 h, P3 24 h, P4
48 h), etiquetas de sinal quando `noul ≥ 0,5`, portão por departamento (A1 Financeiro … A7 Outro) e situação do voo
(ÚLTIMA CHAMADA se o risco de cancelar for ≥ 0,5; PRIORIDADE se for P1 ou P2; senão EMBARCANDO). Dentro de cada portão,
os tickets ficam ordenados pelo `score` contínuo de prioridade.

Lote (`/api/triar-lote`): estado `{ empresa, tickets: { t01: {...}, … } }` e, por ticket, `tXX_departamento` (choice),
`tXX_prioridade` (score) e `tXX_pede_reembolso` (noul), com os mesmos critérios.

## Medido (2026-09-23, Mac no Brasil → gateway local → OpenRouter)
| ação | chamadas | perguntas | latência do Jev | custo |
|---|---|---|---|---|
| triar 1 ticket (caixa ao vivo ou escrito) | 1 | 9 | p50 **332 ms**, p90 390 ms (60 tickets) | **US$ 0,000102** (~2.430 tokens) |
| backlog de 48 tickets | 4 em paralelo | 144 (36/chamada) | **560–700 ms** no total | **US$ 0,00165** (US$ 0,000034/ticket) |
| abrir o cartão de embarque de um ticket do lote | 1 | 9 | ~330 ms | US$ 0,0001 |

Qualidade nos 60 tickets semente (gabarito humano em `data/tickets.json`, campo `esperado`; 15 tickets ambíguos aceitam 2
departamentos): **60/60 no departamento** (45/45 nos de rótulo único; 60/60 iguais ao 1º rótulo), confiança mediana
100%, mínima 67%. As 20 macros aparecem pelo menos uma vez. Aceite do brief: "fui cobrado duas vezes, quero meu dinheiro
de volta hoje ou vou no Procon" → financeiro, **P1 (score 2,99)**, reembolso **0,99**, macro **estorno** (98%).
Mil tickets custam ~US$ 0,10 e a premissa declarada na tela é de 3 min de triagem humana por ticket.

Reproduzir: `node apps/suporte/test/avaliar.mjs` (60 chamadas reais, ~US$ 0,006).

## Roteiro de 60 s para o vídeo
1. (0 s) Abrir a página: o letreiro PARTIDAS vira as plaquetas, os KPIs estão zerados, o painel de partidas está parado
   com os 2 próximos voos "NA FILA" e os 7 portões estão livres (A1 Financeiro … A7 Outro).
2. (3 s) Clicar **Iniciar caixa ao vivo**. O 1º voo (JV 001, Rafaela, "COBRANÇA DUPLICADA!!!" + Procon) chega ao
   painel; as plaquetas giram enquanto o cronômetro corre e, em ~350 ms, param em FINANCEIRO · A1 com a situação do
   voo (PRIORIDADE ou ÚLTIMA CHAMADA). Os chips mostram A1 Financeiro 100%, **P1 · Urgente**, frustração Furioso,
   reembolso 99%, Procon/redes 99% e a resposta "Estorno de cobrança duplicada ou indevida". O ticket voa para o portão A1.
3. (5–22 s) Deixar chegar mais 6–7 voos (dúvida de RAG → Conteúdo, P4; PIX sem acesso → Acesso, P1; cancelamento
   educado → Retenção; RH de clínicas → Comercial; plataforma caindo, em CAPS → Acesso; jornalista → Parcerias;
   spam → Outro). Os KPIs viram como plaquetas: latência média, custo por mil (~US$ 0,10), tempo humano economizado.
4. (22 s) Clicar **Pausar caixa** e abrir o ticket da Rafaela no portão A1: o **cartão de embarque** mostra destino,
   portão, prioridade, prazo (1 h) e situação, a resposta pronta já com "Oi, Rafaela!" e, no canhoto, as probabilidades
   dos 7 departamentos, os medidores de prioridade, frustração e sentimento e os 4 sinais. Clicar **Enviar resposta**
   (simulação): o ticket ganha o carimbo RESPONDIDO.
5. (35 s) **Escrever um ticket** → exemplo "Cobrado 2× + Procon" (ou digitar) → **Triar ticket**. O voo JV 901 chega
   ao painel, as plaquetas param em FINANCEIRO · A1, ele embarca no portão A1 como P1 e o cartão de embarque abre sozinho.
6. (48 s) **Backlog: 48 de uma vez** → um mini painel com 48 plaquetas, que viram para o portão de cada ticket, e
   "48 tickets em ~0,6 s · 4 chamadas paralelas × 36 perguntas"; os portões enchem e "tempo humano economizado" passa
   de 2 h 30 min.
7. (55 s) **Ver o que o Jev vê** (a lupa na barra do topo) para mostrar as perguntas e as probabilidades cruas.

Atalhos: `?auto=1` abre já com a caixa rodando; `?ticket=texto` tria um ticket direto do link.

## Arquivos
- `server.mjs` — rotas `/api/config`, `/api/tickets`, `/api/stats`, `POST /api/triar` (90/min por IP) e
  `POST /api/triar-lote` (8/min por IP).
- `triagem.mjs` — a política: departamentos, prioridades, sinais, as 20 macros, perguntas e interpretação (individual e lote).
- `data/tickets.json` — 60 tickets realistas (e-mail/WhatsApp/Instagram; educado, irritado, CAPS, ironia, inglês) + gabarito.
- `public/` — `index.html`, `style.css`, `app.js` (sem build, sem dependências).
- `public/fonts/` — as 3 fontes, servidas pelo próprio app (`.woff2` variável, subconjunto latino, ~93 KB):
  `sofia-sans-extra-condensed-latin-wght.woff2` (painel), `red-hat-text-latin-wght.woff2` (interface) e
  `red-hat-mono-latin-wght.woff2` (códigos e números).
- `test/shots/` — `01-inicio`, `02-caixa-ao-vivo`, `03-quadro`, `04-detalhe`, `05-ticket-escrito`, `06-inspetor`,
  `07-backlog`, `mobile`, `mobile-detalhe`.

## Deploy
- Node 22, zero dependências npm. `PORT=4106 node apps/suporte/server.mjs`.
- Variáveis: `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`), `DATA_DIR` (padrão `apps/suporte/data-runtime/`,
  guarda só o contador global `stats.json`), `SEED_LIVE_PER_IP_HOUR` (padrão 80), `SEED_LIVE_GLOBAL_HOUR` (padrão 3000),
  `LOTE_LIVE_PER_IP_HOUR` (padrão 8).
- Economia automática: os tickets semente são triados ao vivo até 80 por IP/hora (3.000/hora no total); acima disso o
  gateway reaproveita a resposta do Jev em cache (o ticket ganha a etiqueta "cache" e o painel mostra custo US$ 0).
  Tickets escritos pelo usuário são sempre ao vivo. A caixa pausa sozinha com a aba oculta ou com o cartão de embarque
  (ou o formulário "Escreva um ticket") aberto, e para ao zerar a fila (60).

## Limitações
- Cenário e clientes fictícios; "Enviar resposta" é simulação (nada sai do navegador).
- Ticket escrito: 2 a 3.000 caracteres. O Jev julga só o texto e a ficha simulada (plano, tempo de cliente) — não
  consulta pagamentos de verdade, então a macro pode afirmar algo que um atendente real teria de conferir antes.
- Mensagem vaga ("socorro", só emojis) é triada mesmo assim, com confiança menor e macro "pedir mais detalhes" entre as
  opções.
- No lote a prioridade coincidiu com a triagem individual em 55/60 (as 5 diferenças são de um nível, perto da fronteira).

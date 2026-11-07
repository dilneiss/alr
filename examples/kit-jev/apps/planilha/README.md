# Planilha Preditiva

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-planilha.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar planilha`.


Uma planilha em que você cria uma coluna **escrevendo só o título**, e o Jev preenche todas as linhas em lote, em
menos de 1 segundo. Digite `Quer comprar?` no cabeçalho de 124 leads do Instagram, aperte Enter e a coluna se enche em
onda: *"124 linhas em 0,5 s · 124 decisões · US$ 0,00055 · 10 mil linhas custariam US$ 0,044"*.

Três planilhas prontas (dados escritos à mão, pt-BR): **Leads do Instagram** (124 DMs: compra, preço, elogio, spam,
parceria, reclamação, dúvida técnica, curiosos, inglês/espanhol), **Avaliações da loja** (150 avaliações com nota 1–5,
incluindo ironia e sarcasmo) e **Candidatos a Dev** (80 perfis para uma vaga full-stack). Também dá para **importar um
CSV** (colar ou enviar arquivo, até 300 linhas × 12 colunas, com detecção do separador `;` `,` tab `|`).

## Por que é um uso inteligente do Jev
- **É o demo de lote + custo.** Cada chamada leva ~21–25 linhas no `state` (ids `r1`, `r2`…) e **uma pergunta por
  linha**. Seis chamadas em paralelo preenchem a planilha inteira numa única "onda" de ~0,5 s. Medimos que o lote **não
  perde qualidade** em relação a uma linha por chamada e deixa o custo por linha **4,6× menor** (veja "Medido").
- **O título vira pergunta tipada.** `Quer comprar?` → `noul` (probabilidade de sim). `Tema: preço, entrega…` →
  `choice` com essas opções + "outro". Qualquer outro título (`Urgência`, `Fit para a vaga`, `Risco de cancelar`…) →
  uma **pergunta `choice` "meta"** em que o Jev escolhe, entre 23 modelos de coluna escritos por nós, o que a pessoa
  quis dizer. A tela mostra "O Jev entendeu «Urgência» como: Escala de urgência (0–4) — 100%" e um menu para trocar o tipo.
- **Nada é inventado.** O Jev nunca escreve texto. Rótulos, níveis e categorias são nossos; o Jev só escolhe, pontua e
  estima. Toda célula tem probabilidades reais (clique na linha → painel com as barras e o lote/latência/custo da chamada
  que a decidiu). Incerteza aparece como incerteza: `valor???` fica como "? incerto" com o carimbo de 59%, não como "sim".

## Como funciona (fluxo)
1. Enter no cabeçalho **Nova coluna IA** (o campo com o lápis, à direita da tabela) → `POST /api/coluna`
   `{ planilha | importada, titulo, modelo? }`.
2. Se o título não cai numa regra (`?` ou `Prefixo: a, b`), o servidor faz a pergunta meta (1 chamada, ~1.900 tokens).
3. O servidor devolve **NDJSON em streaming**: `tipo` → `plano` → `lote` (um por chamada, conforme chega) → `fim`.
   Lotes de `ceil(n/6)` linhas (mín. 8, máx. 25) com concorrência 6. Se o navegador desconecta, os lotes que ainda não
   saíram não são disparados.
4. O navegador pinta as células em onda: cada uma passa do lápis à tinta e ganha um carimbo com a probabilidade (a onda
   de um lote começa em até 0,6 s e assenta em ~1,5 s; o tempo mostrado é o real, medido na chegada do último lote),
   atualiza a barra de distribuição do cabeçalho e registra cada chamada no inspetor.
5. Ordenar (clique no título), filtrar (menu ⋯ ou clique num segmento da barrinha do cabeçalho), buscar, painel da
   linha (↑/↓ navegam), trocar tipo, refazer, remover, exportar CSV (`;`, BOM, vírgula decimal: abre certo no Excel).

## Perguntas enviadas ao Jev (ver `lib/colunas.mjs`)
**Lote (uma por linha).** `state = { planilha, contexto, coluna_nova, linhas: { r1: {Nome, Cidade, Seguidores, "Mensagem na DM"}, … } }`
- Regra `?` → `{"type":"noul","instructions":"Linha r7: Quer comprar?"}`
- Regra `Prefixo: a, b, c` → `{"type":"choice","instructions":"Linha r7: qual opção de \"Tema\" melhor descreve esta linha?","criteria":{"preço":"Tema: preço", …, "outro":"Nenhuma das outras opções se aplica a esta linha"}}`
- Modelo → `{"type": <kind>, "instructions": "Linha r7: <pergunta do modelo>", "criteria": <níveis ou opções descritas>}`

**Meta (uma por coluna sem regra).** `choice` "modelo" com 23 critérios (descrição + títulos de exemplo de cada modelo),
com `state = { titulo_da_nova_coluna, planilha, contexto, colunas_existentes, exemplo_de_linha }`.

| modelo | tipo | níveis / opções |
|---|---|---|
| `urgencia` | score 0–4 | nenhuma · baixa · média · alta · crítica |
| `sentimento` | choice | positivo · neutro · negativo · misto |
| `intencao_compra` | score 0–3 | nenhuma · curioso · interessado · pronto |
| `prioridade` | score 0–3 | baixa · normal · alta · máxima |
| `risco_churn` | score 0–4 | nenhum · baixo · médio · alto · crítico |
| `senioridade` | score 0–4 | estágio · júnior · pleno · sênior · especialista |
| `fit_vaga` | score 0–4 | nenhum · fraco · parcial · bom · excelente (usa a vaga descrita no `contexto`) |
| `tom` | score 0–4 | muito informal → muito formal |
| `toxicidade` | score 0–3 | respeitoso · ríspido · ofensivo · abusivo |
| `qualidade_escrita` | score 0–4 | péssima → excelente |
| `idioma` | choice | português · inglês · espanhol · outro |
| `spam`, `reembolso`, `concorrente`, `sarcasmo` | noul | é spam/golpe? · pede reembolso/troca? · menciona concorrente? · é irônico? |
| `intencao` | choice | comprar · saber preço · parceria · suporte · elogio · spam · outro |
| `assunto` | choice | produto · preço · entrega · atendimento · dúvida técnica · comercial · outro |
| `problema` | choice | nenhum · atraso · defeito · tamanho · diferente do anúncio · atendimento · cobrança · outro |
| `proxima_acao` | choice | enviar link de compra · enviar preço · passar ao suporte · passar a parcerias · agradecer · ignorar / bloquear · pedir detalhes |
| `nota_prevista` | score 1–5 | 1 ★ … 5 ★ |
| `potencial` | score 0–4 | nenhum → muito alto |
| `escala` (genérico) | score 0–4 | "quanto esta linha demonstra «título»": nada · pouco · médio · bastante · total |
| `simnao` (genérico) | noul | "para esta linha, é verdade que «título»?" |

Cada nível/opção tem uma descrição concreta no código (ex.: urgência "Alta: precisa de resposta ainda hoje (venda
quente, problema bloqueante)"). Acima de 150 linhas entra o **modo compacto**: as descrições vão uma única vez no
`state` e cada pergunta leva só os rótulos curtos (~10–26% menos tokens; concordância de 94–96% com o modo completo).

## Medido (2026-09-23, do Brasil, gateway local → OpenRouter)
**Tamanho do lote** (`test/bench_lotes.mjs`, 20 linhas rotuladas à mão por caso):

| linhas/chamada | "Quer comprar?" acertos · concorda c/ 1 por chamada · \|Δp\| | "Tema" acertos | latência/chamada | tokens/linha |
|---|---|---|---|---|
| 1 | 19/20 · 20/20 · — | 18/20 | 280–603 ms | 447–520 |
| 10 | 19/20 · 20/20 · 0,024 | 19/20 | 305–379 ms | 126–212 |
| 20 | 19/20 · 20/20 · 0,043 | 19/20 | 325–451 ms | 108–195 |
| 40 | 19/20 · 20/20 · 0,040 | 19/20 | 326–368 ms | 97–187 |

O único "erro" em "Quer comprar?" era do rótulo: a faculdade que quer *licenciar* o curso (o Jev deu 0,75). Planilha
inteira (124 linhas, concorrência 6): lote de 10 = 976 ms; 20 = 708 ms; 30 = 381 ms. Escolha: `ceil(n/6)` linhas,
entre 8 e 25, para caber numa onda de 6 chamadas.

**Pergunta meta** (`test/bench_modelos.mjs`): 40/40 títulos no modelo certo (inclusive "Urgency", "Temperatura do lead",
"Grosseria", "Match", "Sabe cloud"), p50 433 ms, ~1.900 tokens, US$ 0,00008 por coluna.

**Por ação** (e2e, tempo = do envio até o último lote):

| ação | linhas | tempo | custo | 10 mil linhas |
|---|---|---|---|---|
| Leads · "Quer comprar?" (sim/não) | 124 | 0,43–0,69 s | US$ 0,00055 | US$ 0,044 |
| Leads · "Urgência" (+ meta ~300–400 ms) | 124 | 0,58–0,60 s | US$ 0,0012 | US$ 0,097 |
| Avaliações · "Tema: preço, entrega, qualidade, atendimento" | 150 | 0,46–0,68 s | US$ 0,0012 | US$ 0,081 |
| Candidatos · "Fit para a vaga" (+ meta) | 80 | 0,52–0,68 s | US$ 0,00078 | US$ 0,097 |
| Importada (12 chamados) · "Urgência" | 12 | 0,34–0,51 s | US$ 0,00014 | — |
| Pior caso: 300 linhas de 480 caracteres | 300 | ~1,0 s (2 ondas) | sim/não US$ 0,0016 · escala US$ 0,0024 · 7 categorias US$ 0,0036 | — |

Qualidade no e2e: as 21 DMs de quem claramente quer comprar ficam ≥ 70% (spam/elogio/reclamação: 48/48 < 30%);
"Tema" bate com o rótulo manual em 97/98 avaliações; fit médio dos candidatos ideais 3,7 vs. 0,7 dos fora do perfil.
Latência do Jev medida no gateway local (todas as 742 chamadas deste app no desenvolvimento, 0 erros): p50 389 ms,
p90 530 ms. Gasto total de Jev para construir e testar o app: US$ 0,094.

## Roteiro de 60 s para o vídeo
1. **0–5 s** — Abrir a página, o livro-razão verde com a margem vermelha: "uma planilha comum, 124 leads que chegaram
   na DM".
2. **5–15 s** — Clicar no cabeçalho em branco **Nova coluna IA** (o campo com o lápis, à direita da tabela), digitar
   `Quer comprar?`, Enter. A coluna passa do lápis à tinta em onda, com um carimbo de % em cada célula; ler a linha de
   totais (Σ): "124 linhas em 0,5 s · US$ 0,0005 · 10 mil linhas custariam US$ 0,04".
3. **15–22 s** — Clicar no título **Quer comprar?** (ordena: compradores no topo) e numa linha com **✓ sim** → o painel
   da linha abre à direita com o carimbo de 94%.
4. **22–32 s** — Digitar `Urgência`, Enter → "O Jev entendeu «Urgência» como: Escala de urgência (0–4) — 100%".
5. **32–42 s** — Aba-índice **B · Avaliações da loja** → sugestão a lápis **Tema: preço, entrega, qualidade,
   atendimento** → clicar no segmento azul-petróleo da barrinha do cabeçalho para filtrar só "entrega".
6. **42–52 s** — Aba-índice **C · Candidatos a Dev** → sugestão **Fit para a vaga** → clicar no título para ordenar.
7. **52–60 s** — **Ver o que o Jev vê** (o botão da lupa, na capa verde do topo): mostrar as 21 perguntas de um lote e
   as probabilidades; fechar no contador de decisões e custo da topbar.

Atalho para gravar: `/?planilha=avaliacoes&coluna=Tema: preço, entrega, qualidade, atendimento` já abre a aba e digita a coluna.

## Limitações conhecidas
- O Jev decide, mas não explica o porquê (por design); o painel mostra as probabilidades, não justificativas.
- Uma coluna IA lê só as colunas de origem (colunas IA não se encadeiam).
- Limites: 300 linhas × 12 colunas de origem, 8 colunas IA por planilha, 500 caracteres por célula, 80 no título,
  12 categorias de até 40 caracteres. Em planilhas grandes, o texto de cada linha é cortado para caber no orçamento
  (60 mil caracteres por coluna; mínimo de 240 por linha).
- Custo típico de US$ 0,0005–0,0015 por coluna; o pior caso (300 linhas longas × 7 categorias) mede US$ 0,0036.
- As colunas vivem só no navegador (recarregar apaga). O servidor guarda apenas contadores agregados (`/api/stats`).
- CSV: primeira linha = cabeçalho; UTF-8 ou Windows-1252; arquivo de até 3 MB. Corpo acima de 2,5 MB é cortado pelo
  kit compartilhado com reset de conexão (o app nunca envia tanto).
- Limite por IP: 30 colunas/min (rajada de 8), além do limite do gateway.

## Rodar, testar e publicar
```bash
cd "."
PORT=4101 node apps/planilha/server.mjs            # Node 22, zero dependências
node apps/planilha/test/bench_lotes.mjs            # benchmark de tamanho de lote (~US$ 0,01)
node apps/planilha/test/bench_modelos.mjs          # 40 títulos → modelo (~US$ 0,003)
```
- Variáveis: `PORT` (4101), `JEV_GATEWAY_URL` (`http://127.0.0.1:8787`), `DATA_DIR` (padrão `apps/planilha/data-runtime/`,
  só `stats.json`; está no `.gitignore` do app).
- Proxy reverso: `/api/coluna` responde **NDJSON em streaming** (sem Content-Length) com `Cache-Control: no-store,
  no-transform` e `X-Accel-Buffering: no`: o `encode` do Caddy do `deploy/` respeita `no-transform` (não comprime)
  e o `reverse_proxy` descarrega respostas sem Content-Length na hora; no nginx, `proxy_buffering off`. (Não havia
  Caddy nesta máquina: confira no smoke test que os lotes chegam aos poucos.) O corpo da requisição
  chega a ~1,8 MB em importações grandes (Caddy não limita por padrão; no nginx, `client_max_body_size 3m`). Repasse
  `X-Forwarded-For`, porque o limite por IP depende dele (o Caddy já repassa).
- Docker (`deploy/Dockerfile.app`): nada a acrescentar — a imagem leva `lib/` e `data/`, usa `PORT=3000` e `DATA_DIR=/data`.

## Arquivos
`server.mjs` (rotas, lotes, stream) · `lib/colunas.mjs` (regras do título, 23 modelos, perguntas) · `data/*.json`
manuais), `test/bench_*.mjs`, `test/shots/`.

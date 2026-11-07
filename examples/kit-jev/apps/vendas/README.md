# Copiloto de Vendas ao Vivo

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-vendas.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar vendas`.


Um copiloto que **escuta a ligação de vendas** e, a cada fala do cliente, detecta a objeção e o sinal de compra e mostra
na hora a **ordem certa para o vendedor** (um card com tecla de função: F1 Contornar, F2 Fechar, F3 Resgatar ou F4
Conduzir), com a frase exata para dizer ("F1 Contornar · Objeção · Preço → Ofereça o plano anual — Diga: 'No plano anual
o valor cai para R$ 1.190…'"). Como no reconhecimento de voz de verdade, a fala parcial vai para o Jev nas pausas
naturais — então a ordem costuma aparecer **antes de o cliente terminar a frase**. Entradas: microfone (Web Speech API,
pt-BR), 3 ligações simuladas com legenda ao vivo (1×/2×) e uma caixa para digitar a fala do cliente.

## Por que é um uso inteligente do Jev
- **Só funciona porque o Jev é rápido**: ~350 ms por decisão, 7 perguntas numa chamada. A ordem chega enquanto a objeção
  ainda está no ar — no roteiro (a), a objeção de preço é detectada com **6 de 25 palavras** ("Nossa, mil e quinhentos
  por mês?"), segundos antes de o cliente terminar de falar.
- **Estado = conversa**: as últimas 6 falas + a fala atual do cliente. O Jev entende o contexto (em que estágio a
  conversa está, se o preço já foi dito, se o cliente está aceitando o piloto) sem nenhum treinamento.
- **O Jev escolhe, não escreve**: os 14 battlecards (título, frase para dizer, dica) são nossos; o Jev escolhe qual
  usar **naquele momento** (`proximo_passo`), com probabilidade. Nada de conselho inventado no meio de uma venda.
- **Barato para rodar em toda ligação**: US$ 0,00009 por fala; uma ligação simulada inteira (10 falas do cliente,
  18 chamadas contando as parciais) custa ~US$ 0,0016.

## Perguntas enviadas ao Jev (ver `copiloto.mjs`)
Estado: `{ ligacao: "Ligação de vendas B2B. Produto: Atendix — …preços, piloto, garantia", historico_recente: [últimas 6 falas {quem, fala}], fala_atual_do_cliente, observacao?: "o cliente ainda está falando" (parciais) }`.

| id | tipo | critérios |
|---|---|---|
| `objecao` | choice | `nenhuma` (inclui só perguntar o preço), `preco`, `tempo_prioridade`, `confianca_no_resultado`, `precisa_consultar_socio`, `ja_usa_concorrente`, `nao_entendeu_valor`, `momento_ruim` — **na fala atual** |
| `sinal_compra` | noul | pergunta como começar, prazo, contrato, aceita a proposta? |
| `sentimento` | score 0–4 | muito negativo → muito positivo |
| `estagio` | choice | `abertura`, `descoberta`, `apresentacao`, `negociacao`, `fechamento` |
| `proximo_passo` | choice (14) | ROI em 30 dias · plano anual/parcelamento · caso parecido · quem mais decide · piloto de 14 dias · comparar com concorrente · garantia de 30 dias · pergunta aberta · conectar a dor à solução · resumir o valor · custo de esperar · validar e ouvir · fechamento direto · marcar o próximo passo |
| `risco_perder` | noul | há risco real de perder a venda agora? |
| `chance_fechar` | noul | considerando a conversa inteira, vai fechar (ou começar o piloto) nesta ligação? → cotação (painel 2) |

Regras no código: ordem **F1 Contornar** (objeção) quando `objecao ≠ nenhuma` com p ≥ 0,5; **F2 Fechar** (sinal de
compra) quando `sinal_compra ≥ 0,6`; **F3 Resgatar** (risco) quando `risco_perder ≥ 0,7`; nos demais casos, **F4
Conduzir**: a sugestão numa linha compacta. Parciais: na simulação, no primeiro sinal de pontuação depois de ≥ 6 palavras (até 2 por fala, deixando ≥ 4
palavras para o fim); no microfone, depois de 550 ms de pausa nos resultados provisórios (≥ 4 palavras). A fala final
sempre gera a análise definitiva; respostas atrasadas de parciais são descartadas (número de sequência por fala).

## Medido (2026-09-23, Mac no Brasil → gateway local → OpenRouter; gateway compartilhado com os outros apps)
| ação | chamadas | perguntas | latência do Jev | custo |
|---|---|---|---|---|
| analisar 1 fala do cliente (final ou parcial) | 1 | 7 | p50 **~350 ms** (gateway: p50 363 ms, p90 500 ms em 188 chamadas) | **US$ 0,000087** (~2.080 tokens) |
| ligação simulada (a) inteira | 18 (10 finais + 8 parciais) | 126 | ordem na tela ~0,35 s depois da fala | **US$ 0,0016** |
| fala digitada | 1 | 7 | ~350 ms | US$ 0,00009 |

Qualidade (`test/avaliar.mjs`): **objeção correta em 30/30 falas dos roteiros** e em **8/8 falas digitadas** (inclui
inglês e só emojis); **zero alarmes falsos** nas falas sem objeção; `sinal_compra` de 0,88 a 0,98 nas falas de fechamento;
estágio evolui abertura → descoberta → apresentação → negociação → fechamento nos 3 roteiros. Chance de fechar no fim:
(a) 20% → 95% (fecha), (b) ~20% (só marca reunião com o sócio), (c) 11% → 76% (aceita o piloto). Aceite do brief: roteiro
(a) em 2× → ordem F1 de preço na fala do preço (antes do fim da frase), sinal de compra 0,11 → 0,97 no fim, estágio
"fechamento"; "tá caro demais pra mim agora" → `preco` (99–100%).

Reproduzir: `node apps/vendas/test/avaliar.mjs [--parciais]` (~US$ 0,003).

## Roteiro de 60 s para o vídeo
1. (0 s) Abrir a página: o terminal preto e âmbar liga painel por painel — a barra de teclas com as 3 ligações
   (**ODNT** Clínicas · preço, **FTMS** Academias · sócio, **HRZN** Imobiliária · concorrente), as lâmpadas **F1–F4**
   apagadas, os 5 painéis vazios e a **fita** de ticker rolando no rodapé.
2. (2 s) Clicar **2×** e depois na tecla **ODNT Clínicas · preço**. A legenda corre palavra por palavra na fita da
   ligação; cada fala do Roberto ganha etiquetas ("sem objeção", "sinal de compra", ⚡ latência); o **estágio** anda
   Abertura → Descoberta → Apresentação; a **cotação** da chance de fechar se desenha como um gráfico de bolsa (sobe em
   verde, cai em vermelho), com o sentimento em barras de volume; as falas sem objeção viram ordens azuis **F4 Conduzir**.
3. (~39 s) Roberto: "Nossa, mil e quinhentos por mês?…" — com a fala ainda sendo escrita ("no meio da frase…", cotação
   PARCIAL), a lâmpada **F1** pisca e **a ordem vermelha "F1 Contornar · Objeção · Preço" entra com o selo "⚡ antes do
   fim da frase"** e a frase pronta do plano anual. No **livro da fala**, a objeção fica vermelha e o risco de perder
   sobe; a bandeira PRÇ marca o gráfico. Apontar para a legenda ainda sendo escrita.
4. (~50 s) "E se não der resultado?" → nova ordem F1 · Confiança no resultado → "Proponha o piloto de 14 dias". Em
   seguida (~63 s), "Como a gente faz pra começar?" → a lâmpada **F2** acende: ordem verde **F2 Fechar · Sinal de compra
   97% → Parta para o fechamento**; a cotação sobe para ~95% e o estágio chega a Fechamento.
5. (~72 s, ou cortar na edição) Abre o **resumo**: objeções por tipo, momento de maior risco (a fala do preço, 76%),
   evolução 20% → 95% com o gráfico da ligação inteira, 18 chamadas, US$ 0,0016.
6. Alternativa curta: digitar "tá caro demais pra mim agora" + Enter na linha "CLIENTE ›" → ordem F1 de preço em ~0,4 s.
   Ou ligar o **Microfone** (Chrome) e ler as falas do cliente.
7. **Ver o que o Jev vê** (a lupa na topbar): o estado com as últimas falas e as 7 perguntas.

Atalhos: `?roteiro=b&auto=1` já abre simulando o roteiro (b); `?fala=texto` analisa uma fala direto do link.

## Arquivos
- `server.mjs` — `/api/config`, `/api/stats`, `POST /api/analisar` (120/min por IP; valida fala ≤ 600 caracteres e
  normaliza o histórico para as últimas 6 falas).
- `copiloto.mjs` — a política: objeções, estágios, sentimento, os 14 battlecards (frase + dica), perguntas e interpretação.
- `data/roteiros.json` — 3 ligações (~20 falas cada) com o gabarito de objeção por fala do cliente.
- `public/` — `index.html`, `style.css`, `app.js` (motor da simulação, microfone, cotação com gráfico SVG, livro da fala,
  estágio, ordens F1–F4, fita de ticker, resumo).
- `public/fonts/` — IBM Plex Mono (400, 500, 600) e IBM Plex Sans Condensed (400, 500, 600, 700) em `.woff2`,
  subconjunto latino, servidas pelo próprio app (nenhuma fonte externa).
- `test/shots/` — `01-inicio`, `02-ligacao-objecao-preco`, `03-resumo`, `04-fim-da-ligacao`, `05-fala-digitada`,
  `06-inspetor`, `mobile`, `mobile-radar`.

## Deploy
- Node 22, zero dependências npm. `PORT=4110 node apps/vendas/server.mjs`.
- Variáveis: `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`), `DATA_DIR` (padrão `apps/vendas/data-runtime/`, só o
  contador global `stats.json`), `SIM_LIVE_PER_IP_HOUR` (padrão 150: falas das ligações simuladas vão ao vivo até esse
  limite por IP/hora; depois o gateway reaproveita a resposta idêntica em cache — os roteiros são determinísticos).
  Microfone e fala digitada são sempre ao vivo.
- O **microfone exige HTTPS** (contexto seguro) e um navegador com Web Speech API (Chrome/Edge no computador, Chrome no
  Android; Safari recente). Sem suporte ou com permissão negada, o botão mostra uma mensagem clara e sugere a simulação.
- Teto por aba: 300 análises (~US$ 0,03); a simulação pausa com a aba oculta e o microfone desliga.

## Limitações
- Empresa, produto (Atendix), preços, casos e pessoas são fictícios.
- No Chrome, o reconhecimento de voz é feito pelos servidores do Google (o áudio não passa pelo servidor; só o texto
  transcrito vai para o Jev). A qualidade da transcrição depende do microfone e do navegador.
- No microfone, quem fala é marcado à mão (seletor "Cliente" / "Vendedor", ao lado do botão Microfone); o padrão
  "Cliente" é o modo "só o cliente".
- Falas de 2 a 600 caracteres. As ordens são sugestões de uma política fixa (14 battlecards); o Jev não inventa argumentos.

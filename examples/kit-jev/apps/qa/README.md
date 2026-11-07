# QA Adversarial

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-qa.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar qa`.


Um testador de QA incansável. O Jev pilota um **navegador de verdade** (Chromium via Playwright), decide onde clicar e o
que digitar para **quebrar** uma lojinha cheia de bugs plantados, roda oráculos que detectam sintomas e faz a **triagem**
de cada defeito — encontrando os **9 bugs plantados em ~40 s por menos de US$ 0,005**. Você assiste tudo ao vivo:
a tela do navegador, cada decisão do Jev com suas probabilidades, e o placar de bugs subindo.

É a demonstração exata do argumento do vídeo: testes adversariais que ninguém colocava no CI porque um LLM era lento e
caro demais — com o Jev viram uma passada de centavos.

## Componentes

1. **Alvo: "Loja Bugada"** (`/alvo/`) — um mini e-commerce de verdade (vitrine, produto, carrinho, cupom, frete, checkout,
   busca, newsletter) servido pelo próprio app, com **9 bugs plantados de propósito** e documentados em `data/bugs.json`
   (o agente **não** lê esse arquivo — ele serve só para medir o placar). Cada bug está marcado com `BUG PLANTADO` no código.
2. **Agente** (`agent.mjs`) — dirige o Chromium, monta o estado da tela (até ~40 elementos interativos visíveis), pergunta
   ao Jev **numa única chamada** qual ação e quais valores têm mais chance de revelar um bug novo, executa no navegador, e
   roda oráculos automáticos. Cada sintoma detectado vai ao Jev para triagem.
3. **Painel** (`public/index.html`, `public/app.js`, `public/qa.css` e `public/fonts/`, com as fontes Spectral e Azeret
   Mono em `.woff2`) — uma coleção entomológica num laboratório. Botão "Testar a Loja Bugada" (o triângulo de play fica
   desenhado na cabeça de um alfinete vermelho). Ao vivo por SSE: o **microscópio** mostra as screenshots do navegador do
   Jev; o **caderno de laboratório** anota cada decisão com a probabilidade; a **gaveta de espécimes** tem uma bandeja por
   bug plantado, e o espécime é alfinetado nela quando o Jev confirma o bug; o **registro dos espécimes** traz a ficha de
   cada bug, com severidade e evidência; a **ficha de catalogação** mostra o placar "X/9", passos, tempo e custo; e o
   **relatório de coleta** fecha o teste.

## Por que é um uso inteligente do Jev

- **O Jev é o piloto, não um enfeite.** Ele não gera texto: recebe o estado da página e **escolhe** a próxima ação entre
  as reais daquela tela, **escolhe** o valor de ataque para cada campo e **pontua/classifica** cada bug — sempre uma opção
  válida, com probabilidade calibrada. Um LLM de texto poderia inventar um seletor que não existe ou uma categoria fora da
  lista; o Jev, não.
- **Uma chamada decide o passo inteiro.** Num passo com 3 campos visíveis, a chamada de decisão junta ~15 perguntas
  (1 de ação + 1 de estratégia + 1 valor por campo) e o Jev responde todas em paralelo, na latência de uma. Idem na triagem
  (3 perguntas juntas).
- **Barato o bastante para rodar no CI.** Uma execução completa (~55 chamadas, ~185 perguntas) custa **~US$ 0,005**. Rodar
  isso a cada commit é trivial — que é justamente o ponto do vídeo.
- **Transparência total:** o botão "Ver o que o Jev vê" (com a lupa desenhada, na barra do topo) mostra as chamadas reais
  (estado + perguntas + respostas).

## As perguntas exatas enviadas ao Jev

### 1) Decisão — uma chamada por passo (`agent.mjs`)

| id | tipo | o que decide | critérios |
|---|---|---|---|
| `proxima_acao` | `choice` | qual ação executar agora | montado ao vivo: cada elemento visível (`e1`, `e2`, …) com rótulo/tipo/estado (`[NOVO]`, `[já testado: …]`, `[já clicado N×]`), mais `voltar`, `ir_para_inicio` e um `<id>_x2` para **clique duplo** em cada botão |
| `estrategia` | `choice` | postura de ataque | `explorar_novas_telas`, `atacar_formulario`, `testar_limites`, `repetir_acao_rapido` |
| `valor_<id>` | `choice` | qual valor digitar em cada campo visível | `vazio`, `zero`, `negativo`, `numero_enorme`, `texto_muito_longo`, `caracteres_especiais`, `emoji`, `sql_injection`, `script_xss`, `email_invalido`, `valor_normal` (cada um com descrição concreta do que expõe) |

Instrução de `proxima_acao` (resumo): *"Você é um testador de QA adversarial: seu objetivo é QUEBRAR esta loja e achar o
próximo bug. Prefira campos/botões ainda não testados, links `[NOVO]` e o clique duplo em botões de confirmar/enviar."*
Instrução de `valor_*`: *"Qual valor tem mais chance de expor um defeito — quebrando o site OU revelando validação fraca
(aceitar algo que deveria recusar)? Escolha um valor NOVO."*

O estado enviado inclui: URL e texto visível da página, o dicionário de elementos, as últimas ações, os bugs já encontrados
e as páginas já visitadas — para o Jev não repetir o que não deu em nada.

### 2) Triagem — uma chamada por sintoma detectado por um oráculo

| id | tipo | o que decide | critérios |
|---|---|---|---|
| `bug_real` | `noul` | é um bug de verdade? (limiar 0,5) | `true`: defeito real / `false`: ruído ou esperado |
| `severidade` | `score` | gravidade (0–3) | cosmético · moderado · grave · crítico |
| `categoria` | `choice` | tipo do bug | `crash_js`, `erro_servidor`, `calculo_errado`, `validacao_fraca`, `layout_quebrado`, `link_quebrado`, `duplicidade`, `outro_problema` |

**Os oráculos (código, não o Jev)** detectam os sintomas: erro de JS não tratado (`pageerror`/console), resposta HTTP ≥ 400,
texto `NaN`/`undefined`/`R$ -` na tela, estouro de layout (a etiqueta de entrega), entrada inválida aceita (e-mail `a@`), e
pedido duplicado após clique duplo. O Jev decide se cada sintoma é bug real, a severidade e a categoria.

## Os 9 bugs plantados no alvo

`quantidade negativa aceita` (total negativo) · `quantidade vazia → R$ NaN` · `cupom com caracteres especiais derruba o JS`
(regex sem escape) · `busca vazia → HTTP 500` · `nome longo estoura a etiqueta` · `newsletter aceita "a@"` ·
`link da vitrine → 404` · `"calcular frete" lança exceção` (match sem null-check) · `clique duplo em finalizar cria 2 pedidos`.

## Medido (2026-09-23, servidor local; do Boston deve ser menor)

- **Execução completa:** encontra **9/9 bugs** (mínimo do aceite é 5), em **~40 s**, **~48 passos**, **~55 chamadas ao Jev**
  (~185 perguntas). Reprodutível: 5 execuções seguidas deram 9/9.
- **Por chamada ao Jev:** latência **p50 354 ms / p90 452 ms**, ~2.200 tokens de entrada.
- **Custo por execução: ~US$ 0,0050** (decisão ~US$ 0,0001/passo; triagem ~US$ 0,00004/bug). 1.000 execuções ≈ US$ 5.
- **Screenshots:** JPEG q55, ~48 KB por passo, transmitidos por SSE.

## Roteiro de 60 s para o vídeo

1. Abrir a página: a bancada do laboratório. A topbar mostra latência e custo do Jev ao vivo. À direita, a ficha de
   catalogação com o placar **0/9** e a gaveta de espécimes com as 9 bandejas vazias, "aguardando coleta".
2. Clicar em **"Testar a Loja Bugada"**. Na lâmina do microscópio aparecem o selo **"ao vivo"** e o contador de passos, e a
   tela do navegador do Jev começa a se mexer sozinha.
3. Narrar o caderno de laboratório, embaixo: cada linha é uma decisão do Jev (ação + estratégia + a probabilidade da
   escolha + latência). Quando ele dá **clique duplo em "Finalizar pedido"**, a tela mostra **dois pedidos** seguidos (ex.:
   #1001 e #1002): bug de duplicidade, e o número do passo ganha um círculo vermelho.
4. Ver o placar subir e as bandejas da gaveta recebendo os espécimes: o alfinete é cravado e aparece a etiqueta com o nome
   científico, o passo, o tempo e a certeza do Jev (**Busca vazia → 500**, **Cupom quebra o JS**, **R$ NaN**, **Nome longo
   estoura**…). Cada bug também ganha uma ficha no registro dos espécimes, com a evidência (o stack do erro, o HTTP 500, o
   "R$ NaN") e a severidade dada pelo Jev.
5. Ao terminar (~40 s), o **relatório de coleta** é preso com um alfinete sobre o microscópio: **"Teste concluído — 9/9 bugs
   encontrados"**, com tempo, passos, custo e chamadas ao Jev. Abrir **"Ver o que o Jev vê"** (a lupa na barra do topo) para
   mostrar as perguntas e respostas cruas — a prova de que é o Jev decidindo cada passo.

## Limitações conhecidas

- **Só testa o alvo interno** (`/alvo/`). Nunca aceita URL externa — evita abuso.
- **1 execução por vez.** Quem chega no meio assiste a atual; enfileiramos no máximo algumas execuções seguintes (uma por
  IP). Teto de 70 passos ou 120 s por execução; para se ninguém está olhando (SSE sem clientes) via orçamento do gateway.
- O placar 9/9 mede os bugs **plantados**; o agente também pode reportar achados "extras" legítimos (marcados como tal).
- O agente é deliberadamente adversarial e determinístico o bastante para a demo, mas o Jev é estocástico: a ordem dos
  passos muda a cada execução (a cobertura 9/9 se mantém).

## Rodar e testar

```bash
cd apps/qa && npm install           # instala playwright@1.57.0 (Chromium 1200 já em cache)
cd ../.. && PORT=4108 node apps/qa/server.mjs
```

Capturas do teste em `apps/qa/test/shots/` (`01-inicio`, `02-testando`, `03-final`, `04-inspetor`, `mobile`).

## Deploy (para o integrador)

- **Única exceção à regra de zero-npm:** este app depende de `playwright@1.57.0` (`apps/qa/package.json`), instalado dentro
  de `apps/qa/`.
- **Imagem base:** `mcr.microsoft.com/playwright:v1.57.0-noble` (já traz o Chromium 1200 e todas as libs de sistema).
  O container precisa de: `npm ci` em `apps/qa/`, Node 22, acesso ao gateway do Jev (`JEV_GATEWAY_URL`), e rodar como um
  usuário sem privilégios — o agente já lança o Chromium com `--no-sandbox` e `--disable-dev-shm-usage`.
- **Variáveis de ambiente:** `PORT` (4108), `JEV_GATEWAY_URL` (default `http://127.0.0.1:8787`), `SELF_URL` (URL pública do
  próprio app, para o agente abrir `/alvo/`; default `http://127.0.0.1:$PORT`), `QA_MAX_STEPS` (70), `QA_MAX_MS` (120000).
- **Recursos:** ~1 vCPU e ~512 MB–1 GB de RAM por execução (um Chromium headless por vez). Sem estado em disco: os pedidos
  do alvo vivem em memória (limpos por hora). Não grava em `data/`.

## Intenções em qualquer site (camada viva do Site que Lê Intenções)
O painel e a Loja Bugada carregam `<script src="/_jev/intencoes.js" defer data-contexto="…">`: a versão **genérica** da
camada do `jev-ux`. O script é o mesmo para qualquer página e se configura sozinho:
- **O que lê da página:** título, seções (`h1`–`h3`) e o botão principal. O botão principal é o maior e mais destacado, com
  verbo de ação e fora do cabeçalho e do rodapé. `data-cta="#seletor"` ou `data-jev-cta` no elemento forçam a escolha.
- **O que mede do visitante:** só contagens. São rolagem (inclusive rápida demais), sobe e desce, tempo parado,
  passagens e cliques no botão principal, cliques de raiva, cliques fora de botões, **cliques em botões que não fazem
  nada** (sem mudança na página em 0,9 s), focos, envios e erros de formulário **sem valores**, cópias e saída pelo topo.
- **O que o Jev decide:** 3 perguntas numa chamada (`shared/server/intencoes.mjs`, rota `POST /_jev/intencoes/decidir`,
  60/min por IP). São `estado`, `reacao` e `prob_acao`:
  - **estados:** explorando, lendo com interesse, hesitando, procurando, com pressa, frustrado, pronto para agir,
    prestes a sair;
  - **reações:** nenhuma, boas-vindas, resumir a página, destacar a ação principal, convidar a rolar, oferecer ajuda,
    pedir desculpas e ajudar, segurar a saída, chamar a atenção, reconhecer o interesse.
- **O que aparece:** borda colorida pelo estado (vermelha pulsando quando frustrado, com linhas de velocidade na
  rolagem rápida), a turma pixel na borda de baixo, o **Bit** com frases prontas e botões (atalhos para as seções, "me
  leva lá") e um contorno no elemento certo. O contorno é roxo no botão principal e vermelho tracejado no botão que não
  respondeu, com um agente de mochila a jato levando a maleta de socorro.
- **Regras de código:** a reação precisa de 50% ou mais e de combinar com o estado. Espera 7 s entre falas (2,5 s se a
  fala nova for mais urgente) e não repete. Não interrompe quem está agindo, e nada substitui uma pergunta do Bit ainda
  sem resposta. A memória fica só na aba (`sessionStorage`), sem cookies. Clicar no Bit silencia.
- **Robôs não veem a camada:** navegadores de automação (`navigator.webdriver`, como o Chromium do próprio QA) não a
  carregam, então os testes do QA seguem idênticos. A execução de 23/09 achou 9/9 bugs em 33,8 s, e as telas do robô
  saíram sem o Bit. `?intencoes=1` força a camada e `?intencoes=0` desliga.

Cena para o vídeo: no carrinho da Loja Bugada, digite um CEP inválido e clique em "Calcular frete" (bug plantado: o
botão não faz nada). Em ~1 s a borda fica vermelha, o botão ganha contorno tracejado, o agente de socorro voa até ele e
o Bit pede desculpas: *"Esse clique em “Calcular frete” não fez nada, né? 😅"*. O Jev escolheu "pedir desculpas e
ajudar" com 90–92%. Em outro site nosso, basta a mesma linha de script e `registrarIntencoes(app)` no servidor. Fora
do showcase, o site precisa de uma rota equivalente com a chave do Jev.

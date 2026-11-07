# Como criar ou adaptar um app-modelo (`app.config.mjs`)

Cada app do hub de modelos é **um arquivo só**: `apps/modelos/public/<id>/app.config.mjs`. O motor (`public/_motor/`)
monta a tela, a demonstração automática ("▶ Ver funcionando") e o inspetor.

> No kit, os caminhos `public/...`, `lib/...` e `tools/...` deste guia ficam dentro de `apps/modelos/`. O servidor
(`lib/decidir.mjs`) transforma as suas `decisoes` em perguntas do Jev.

**Para quem é:** para você criar um app novo ou adaptar um dos 83 modelos ao seu negócio. Um bom app-modelo é:
1. **uso inteligente do Jev** — decisão de linguagem que um regex não faz, com pelo menos uma marca: `imediato`
   (decide dentro da interação), `volume` (decide sobre cada item), `limiar` (a confiança decide o automático × humano),
   `lista fechada` (a resposta é sempre uma opção válida);
2. **bonito e vivo em 15–40 s** de demonstração automática, sempre em movimento;
3. **fácil de adaptar**: contexto, decisões e dados claros, com comentários curtos no topo do arquivo;
4. **certo**: `node kit/jev-kit.mjs testar <id>` com acerto ≥ 90% contra o `esperado` que você anotar.

## 1. O Jev em poucas linhas
- Não escreve texto. Recebe um `state` (dados) e perguntas tipadas e devolve probabilidades:
  - `choice` (escolhe 1 entre opções);
  - `score` (posição numa escala de 2 a 10 níveis);
  - `noul` (probabilidade de "sim"; 0,5 = não sei).
- ~0,3–0,6 s por chamada, várias perguntas numa chamada só, ~US$ 0,0001 por chamada.
- Todo texto que a tela mostra é **seu** (rótulos, respostas prontas, mensagens). O Jev só escolhe, pontua e estima.

## 2. Regras de redação das decisões (medidas — siga à risca)
1. **Opções concretas, com exemplos, que não se sobrepõem.** Escreva o `desc` como critério: "pedido de orçamento,
   atacado, revenda ou parceria". Medido hoje: com descrições vagas o roteador acertou 5/8; com descrições concretas e
   excludentes, 8/8 com 96–100% de confiança.
2. **Quando existe uma regra de negócio, escreva a regra na pergunta.** Ex.: "Regras: dado pessoal → modelo local;
   tarefa curta → modelo rápido; …".
3. **Sempre ofereça a saída**: uma opção `outro` / `nenhum` / `perguntar`. Sem ela, o Jev não consegue se abster.
4. **Cada pergunta é respondida isoladamente.** Uma pergunta-resumo ("veredito") não "vê" as outras respostas. Se
   houver veredito, **liste na própria pergunta** os problemas que levam a ele.
5. **Número, conta, data e comparação de valor ficam com o código.** O Jev não é calculadora. No motor `agente`, passe os
   fatos calculados em `passo.fatos` (ex.: `{ 'valor da ação': 'R$ 1.890,00', 'valor que o cliente pediu': 'R$ 18,90' }`).
   Sem isso ele executou um reembolso 100× maior; com isso, bloqueou com 86%. Nos outros motores, deixe o valor já
   formatado no texto do item, ou calcule no gancho de tela.
6. **Documento longo vira trechos curtos**: um item por cláusula, trecho ou mensagem.
7. **`score`** com 3 a 5 níveis, cada um com rótulo curto e `desc`. **`noul`** com pergunta de sim ou não clara e
   `limiar` (padrão 0,5).
8. **`choice` que vira raia (colunas)**: 3 a 7 opções. Em outros papéis, até 30.
9. A ordem das opções influencia um pouco. Não ponha a opção "mais provável" sempre em primeiro.

## 3. Campos comuns do arquivo
```js
export default {
  id: 'meu-app',                 // = nome da pasta; só minúsculas, números e hífen
  titulo: 'Nome Curto do App',   // 2 a 5 palavras
  emoji: '📬',
  categoria: 'atendimento',      // imediata | atendimento | confianca | vendas | dados | construtores | voz | educacao | radares | juridico | casa-jogos
  ordem: 12,                     // posição no hub (use o número da lista que você recebeu)
  resumo: 'Uma frase com o que o app faz, do ponto de vista de quem usa.',
  descricao: 'Duas frases: o que acontece na tela + por que o Jev faz diferença aqui (velocidade, volume, limiar, lista fechada).',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',                // fluxo | aovivo | conversa | agente | pares | provas | laboratorio
  tema: { acento: '#4f8cff', acento2: '#22d3ee' },  // cor própria do app (evite repetir a de outro app); modo: 'claro' opcional
  origem: 'comunidade: ...',     // opcional: de onde veio a ideia
  contexto: { ... },             // o negócio, as regras, as listas (vai no state de toda chamada)
  editavel: { campo: 'regras', rotulo: 'Suas regras', ajuda: '...' },  // opcional: a pessoa edita contexto[campo] na tela
  decisoes: [ ... ],
  // + os campos do motor (abaixo)
};
```
**Decisão:**
```js
{ id: 'tipo', tipo: 'choice', titulo: 'Pilha', pergunta: 'Em qual pilha este e-mail deve ir?',
  opcoes: [{ id: 'cliente', rotulo: 'Clientes', icone: '🛍️', cor: '#34d399', desc: 'cliente perguntando de pedido, entrega…', tom: 'bom' }, …],
  papel: 'destaque' }                         // papel: ver cada motor; 'oculto' = não mostra; 'so-tela' = não vai ao Jev
{ id: 'urgencia', tipo: 'score', titulo: 'Urgência', pergunta: '…', niveis: [{ rotulo: 'pode esperar', desc: '…' }, …], inverter: false }
{ id: 'risco', tipo: 'noul', titulo: 'Risco', rotulo: 'risco Reclame Aqui', icone: '🔥', tom: 'ruim', limiar: 0.55, alerta: true, pergunta: '…?' }
```
- `opcoes` também pode ser função do contexto: `opcoes: (ctx) => ctx.horarios.map(...)`.
- `tom`: `bom`, `medio`, `ruim`, `info` ou `acento`.
- `alerta: true` deixa o cartão vermelho quando passa do limiar.

## 4. Motores — leia o modelo de referência do seu motor antes de escrever
| Motor | Para quê | Referência (leia inteira) |
|---|---|---|
| `fluxo` colunas | itens chegam e vão para raias (com raia de revisão humana pelo limiar) | `public/inbox-organiza/app.config.mjs` |
| `fluxo` feed | posts aparecem e o Jev esconde o que não serve | `public/filtro-feed/app.config.mjs` |
| `fluxo` linha | trechos numa linha do tempo (vídeo) | `public/cacador-cortes/app.config.mjs` |
| `aovivo` | o texto é reavaliado a cada pausa da digitação | `public/antes-de-enviar/app.config.mjs` |
| `conversa` | roteiro de WhatsApp, ligação, reunião… com resposta pronta escolhida pelo Jev | `public/recepcionista-whatsapp/app.config.mjs` |
| `agente` passos | ações de um agente: executar, confirmar ou bloquear | `public/cinto-agentes/app.config.mjs` |
| `agente` roteador | cada pedido vai para a opção certa | `public/roteador-modelos/app.config.mjs` |
| `pares` | duas listas, pares candidatos comparados | `public/deduplicador-cadastros/app.config.mjs` |
| `provas` / `laboratorio` | Banco de Provas / Playground | `public/banco-de-provas/`, `public/playground/` |
| `palco` | o app desenha a própria tela: voz, câmera ou jogo ao vivo | `public/jev-adivinha/` (e os outros 9 apps ao vivo) |

### fluxo
```js
fluxo: {
  layout: 'colunas',             // 'colunas' (padrão) | 'feed' | 'linha'
  colunas: 'tipo',               // id da decisão choice que vira raia (colunas e linha)
  rotuloItem: 'E-mail',          // como o item é chamado na pergunta: "E-mail: «...»"
  lote: 6, ritmo: 1200,          // itens por chamada (4–8) e pausa entre lotes (ms; o motor limita a 2200)
  humano: { limiar: 0.7, rotulo: 'Revisão humana' },   // colunas: confiança abaixo disso vai para a raia humana
  cartao: { titulo: 'assunto', subtitulo: 'de', texto: 'corpo', meta: 'hora', valor: 'valor', avatar: 'avatar' },  // campos dos dados
  entrada: { placeholder: 'Cole aqui…', botao: 'Decidir' },
  rotuloFeitos: 'e-mails',
  ocultar: { decisao: 'esconder', limiar: 0.6, motivo: 'motivo' },   // só no feed
  linha: { inicio: 'inicio', fim: 'fim', duracao: 720, estrela: { decisao: 'gancho', minimo: 2 } },  // só na linha
},
dados: [{ id: 'e1', assunto: '…', de: '…', corpo: '…', hora: '08:12', avatar: '👩', esperado: { tipo: 'cliente', risco: false } }, …]
```
- O texto que vai ao Jev é a junção de `titulo — subtitulo — texto — meta — valor`, conforme o mapa `cartao`.
- Se precisar de outro formato, defina `textoItem: (item) => '…'`.
- `valor` numérico aparece formatado em reais.
- Ganchos opcionais (rodam no navegador; funções puras que devolvem texto):
  - `cartaoExtra(item, respostas, ctx)` devolve HTML extra no cartão;
  - `aoDecidir(item, respostas, extra, ctx)` acumula números em `extra`;
  - `resumoExtra(extra, estado, ctx)` devolve `[{ rotulo, valor }]`, que aparece no resumo final. Ex.: "R$ economizados".

### aovivo
```js
aovivo: { skin: 'email', janela: 'Nova mensagem', placeholder: '…', dica: '…', digitar: true, velocidade: 1.25, pausa: 2600, mono: false, tituloChecklist: '…', rotuloLinha: 'Linha' },
exemplos: [{ titulo: 'Botão do exemplo', texto: '…', esperado: { veredito: 'revisar', anexo: true }, esperadoLinhas: [{ campo: 'nome' }, …] }, …],   // 3 a 5; esperadoLinhas só com porLinha
render(r, texto, ctx) { return '<div class="mj-widget mj-painel-box">…</div>'; },   // opcional: painel próprio no topo
```
- Papéis:
  - `destaque` (choice grande com barras);
  - `barras`;
  - `medidor` (score);
  - `checklist` (noul; `tom: 'bom'` quando "sim" é bom);
  - `alerta` (noul: faixa vermelha com `mensagem` quando passa do limiar; `mensagemOk` opcional).
- `porLinha: true` numa decisão = uma pergunta por linha do texto (ex.: colar uma assinatura e classificar cada linha).
  As respostas chegam em `r.linhas[i].respostas`.
- `r.respostas` traz as respostas gerais.
- `digitar: false` cola o exemplo de uma vez, para textos longos (código, página).
- `render`: use as classes do motor (`mj-widget`, `mj-painel-box`, `mj-chip`, `mj-contador`, `mj-destaque`…) e devolva HTML.
  Escape o texto que veio da pessoa.

### conversa
```js
conversa: {
  skin: 'whatsapp',   // whatsapp | ligacao | reuniao | aula | debate | live | balcao | rpg | chat-site
  titulo: '…', subtitulo: '…', avatar: '🦷',
  participantes: { cliente: { nome: 'Cliente', avatar: '🙂', lado: 'esq' }, bot: { nome: 'Loja', avatar: '🏪', lado: 'dir' } },
  analisar: ['cliente'],   // de quem o Jev julga as falas
  voce: 'cliente',         // como quem a pessoa digita
  responder(resp, fala, ctx, estado) { return 'resposta pronta' | { texto, marca } | [ … ] | null; },  // opcional
  riscar: { decisao: 'acao', opcoes: ['apagar'] },            // opcional: risca a mensagem (moderação)
  selo(resp, fala, ctx) { return { texto: '⚠ golpe', tom: 'ruim' }; },  // opcional: etiqueta na mensagem
  telaCliente(resp, fala, ctx, estado) { return 'html'; },    // skin balcao: o que aparece na tela do cliente
  produtoLive(resp, fala, ctx, estado) { return 'html'; },    // skin live: cartão do produto sobre o vídeo
  abertura: 'texto de sistema no topo (opcional)',
},
roteiros: [{ titulo: 'Botão', falas: [{ quem: 'cliente', texto: '…', esperado: { intencao: 'agendar' } }, …] }]  // 2 ou 3 roteiros
```
- Para um cartão de sistema no meio da conversa (ex.: "💡 Token: …", "⚠️ Checagem: …"), o `responder` devolve `{ texto, quem: '__sistema', classe: 'sistema' }`.
- Com `responder`, as falas do `bot` no roteiro são ignoradas: quem responde é o gancho, com textos seus. Para uma fala
  fixa, use `fixa: true`.
- Papéis no painel ao vivo:
  - `checklist` (noul acumulado: "apareceu");
  - `medidor` (score com histórico);
  - `destaque` (última escolha);
  - `contador`.
- `quem: ['vendedor']` numa decisão = só perguntar nas falas desse participante.

### agente
```js
agente: { skin: 'console', veredito: 'veredito', titulo: '…', subtitulo: '…', rotuloPedido: 'Pedido do cliente', ritmo: 1300,
          modo: 'passos',    // ou 'roteador'
          limiarHumano: 0.6, rotuloIncerto: 'LLM assume',   // opcional: carimbo amarelo quando a confiança é baixa
          pagina: { titulo: '…', elementos: [{ id: 'buscar', rotulo: 'Buscar' }] }, alvoPagina: 'elemento' },  // skin navegador
roteiros: [{ titulo: '…', pedido: '…', passos: [{ ferramenta: 'reembolsar', args: { … }, descricao: '…', fatos: { … }, esperado: { veredito: 'bloquear' } }] }]
// roteador: roteiros: [{ titulo: '…', pedidos: [{ texto: '…', esperado: { destino: '…' } }] }]
aoDecidir(resp, entrada, ctx, contagem) { return 'html do painel lateral'; }   // opcional
```
- As opções do veredito usam `tom` (`bom`/`medio`/`ruim`) e `carimbo` (texto do carimbo).
- `quando: 'passo'` ou `quando: 'pedido'` numa decisão limita a pergunta a um dos modos.

### palco (apps ao vivo: voz, câmera, jogo)
O app traz a própria tela: `palco.js`, que exporta `montar(api)` → `{ tocar(sinal) }`, mais um `palco.css`. A página manda
só `{ jogada, dados }`, e as perguntas saem de `jogadas.<nome>.perguntas(dados, ctx)` no modelo.
```js
motor: 'palco',
palco: { modulo: './palco.js', css: './palco.css', entrada: 'voz' /* | 'camera' | 'jogo' */, comoTestar: '…' },
jogadas: { palpite: { estado: (d) => ({ descricao: d.descricao }), perguntas: (d) => [{ chave: 'categoria', decisao: 'categoria' }, { chave: 'c_animais', decisao: 'item', opcoes: [...], alvo: 'Categoria: animais' }] } },
testes: [{ titulo: '…', jogada: 'palpite', dados: { … }, esperado: { categoria: 'animais' } }],
```
- O `api` traz:
  - `jev(jogada, dados)` e `ultima()` (só a resposta mais nova vale);
  - `voz.barraVoz` (microfone do navegador + digitar + exemplos; `onPausa`, `onFrase` e `onExemplo`, que roda antes de um exemplo clicado: chame `limpar()` nele quando cada exemplo for uma rodada nova; `barra.exemplos(lista)` troca os exemplos depois; `onNivel(v)` dá o volume da voz, de 0 a 1);
  - `som`, `ui`, `fita` e `url(caminho)`.
- O palco **nunca importa arquivos do motor**: no pacote baixado eles ficam em outra pasta.
- `contexto` vai em toda chamada: deixe curto. Listas grandes ficam numa `const` no topo do arquivo, e a jogada manda só o
  que precisa.
- O topo vira tela cheia: a descrição vai para o botão ℹ️. Confira a tela em 1280×720 e com a fonte
  mínima do navegador em 18 px (Configurações → Aparência → Tamanho da fonte).
- Medido no `jev-adivinha`:
  - 9 perguntas de ~25 opções levam ~0,35 s;
  - com pouca pista o Jev é confiante demais ("bicho do gelo" → urso-polar 78%). Só "arrisque" com limiar (0,85) +
    folga sobre o 2º (3×) + mínimo de palavras (5).

### pares
```js
pares: { decisao: 'mesmo', limiar: 0.7, lote: 5, rotuloA: '…', rotuloB: '…', rotuloSim: '…', rotuloNao: '…', cartao: { titulo: 'nome', subtitulo: '…', texto: '…' } },
dados: [{ id: 'a1', lado: 'a', … }, { id: 'b1', lado: 'b', … }],
paresDemo: [['a1', 'b1', { mesmo: true }], …]   // 8 a 14 pares candidatos; o 3º elemento é o esperado
```

## 5. Dados de exemplo (é o que aparece na demonstração)
- Português do Brasil com acentuação correta. Pessoas e empresas **fictícias**. Nada de marca real em contexto negativo.
- Quantidades:
  - fluxo: 14 a 22 itens;
  - conversa: 2 ou 3 roteiros de 3 a 6 falas;
  - aovivo: 3 a 5 exemplos;
  - agente: 2 ou 3 roteiros de 2 a 5 passos, ou 6 a 10 pedidos no roteador;
  - pares: 12 a 16 cadastros.
- Varie: casos fáceis, gíria, ironia, erro de digitação e 1 ou 2 ambíguos (para a revisão humana aparecer).
- Anote o **`esperado`** em todo item com resposta clara.
- **Proibido**:
  - suicídio e autolesão;
  - conteúdo sexual;
  - criança em risco;
  - discurso de ódio;
  - político real;
  - diagnóstico médico (no máximo, triagem para um humano);
  - dado pessoal real (CPF fictício do tipo 123.456.789-00 pode).
- A borda da TypeSafe pode barrar texto com cara de ataque: SQL, `../`, comando de terminal perigoso. Evite isso nos
  dados de exemplo: quando a borda recusa, o servidor devolve um erro amigável.

## 6. Como testar
```bash
node kit/jev-kit.mjs testar <id>     # confere o modelo e mede o acerto contra o "esperado" (use o Jev de verdade)
node kit/jev-kit.mjs local <id>      # abre o app no seu computador: http://localhost:3000
node kit/jev-kit.mjs publicar        # leva a mudança para a sua VPS
```
- Acerto abaixo de 90%? Reescreva as opções e as perguntas (regras da seção 2) e teste de novo.
- Não "conserte" o `esperado` para bater com o Jev, a não ser que você estivesse errado.
- App novo: crie a pasta `apps/modelos/public/<id>/` com o `app.config.mjs` (copie um modelo do mesmo motor) e rode
  `node apps/modelos/tools/gerar.mjs` para gerar a página. O catálogo do kit só lista os 100 originais; os seus
  aparecem no hub assim que você publica.

## 7. Checklist de um app pronto
- [ ] `node kit/jev-kit.mjs testar <id>` ✓ com acerto ≥ 90% e sem erros.
- [ ] Demonstração de 15 a 40 s, sempre em movimento. Para alongar, ponha mais itens, nunca pausas longas (o motor
  limita a pausa a 2,2 s no fluxo e nos pares e a 2,6 s no agente).
- [ ] Cor própria, emoji, ícones nas opções, cores nas raias.
- [ ] Comentário de 2 linhas no topo do arquivo: o que o app faz e o que trocar para adaptar.
- [ ] Texto 100% em pt-BR, acentuado, sem nada proibido da seção 5.

## 8. Lições medidas no Jev real
- **Veredito de agente**: pergunte "em qual lista da política (PODE / PRECISA de confirmação / NUNCA) cai a ação?".
  Frases soltas no fim da pergunta puxaram comandos seguros para "bloquear".
- **Veredito com várias saídas**: "Decida nesta ordem: (1) … → não envie; (2) … → mascarar; (3) senão → pode enviar".
- **noul difícil**: "SIM sempre que…; NÃO só nestes casos: (1)…(n)". Casos neutros foram de ~0,50 para ~0,90.
- **noul que funciona como veredito**: liste os sinais concretos ("busca repetida sem resultado, toques repetidos…").
- **Regras que podem colidir**: escreva a precedência ("mesmo que seja cópia de contrato, o original fica").
- **Escala**: o nível 0 cobre o que está fora do eixo ("nada sobre o uso do produto: elogio, pergunta, outro assunto").
  A regra de negócio pode morar dentro do nível.
- **Marca fictícia**: deixe a pista do ramo no texto ("PAG*RANGOJA DELIVERY"); sem ela, o Jev chuta.
- **Limiar da raia humana**: escolha pelas confianças medidas. Dado limpo dá ≥ 95%, e a raia fica vazia. Ponha 1 ou 2
  itens de fato ambíguos.
- **Confira a confiança, não só o acerto**: confiança baixa nos casos certos vira carimbo "na dúvida" na demonstração.
- **Regra editável** (`editavel`) só vale se a pergunta mandar seguir `contexto.<campo>`. Não repita a regra fixa no
  texto da pergunta.

## 9. Recursos do motor que valem conhecer
- `agente.todosNaDemo: true`: toca todos os roteiros na demonstração.
- `agente.passoLivre(texto)`: monta o passo do que a pessoa digitar.
- `aovivo.campo`: nome do texto no `state`. `aovivo.debounce`: pausa da digitação antes de reavaliar. A demonstração
  também reavalia a cada vírgula e ponto.
- **App ao vivo com estado** (ex.: casa-indiretas, onde o que uma frase liga continua ligado na seguinte):
  - **O problema:** o `render` não pode desenhar sempre a partir do estado fixo do topo do arquivo. Se fizer isso, cada
    frase "desfaz" a anterior, e o vídeo mostra o ar voltando a desligar (20/10).
  - **Como fazer:** guarde o estado no módulo e deixe a mudança da frase atual "pendente". Ela vira estado quando outra
    frase começa (um texto não é começo do outro) ou quando a caixa esvazia (`aoLimpar()`).
  - **Para o Jev ver o estado:** defina `estadoAtual(texto)`, que devolve um texto curto, e
    `editavel: { campo: '<campo do contexto>' }`. O estado vai em `ajustes` e substitui esse campo. Medido: com o ar já
    ligado, "tá um forno aqui" virou "mais frio · 21 °C".
  - **`aovivo.comecarVazio: true`:** abre com a caixa vazia e chama `render({ respostas: {} }, '')` para desenhar o
    painel em repouso. Trate a resposta vazia no `render`.
- Decisão `porLinha` com um `papel` que o motor não conhece (ex.: `'tela'`): esconde a lista padrão e deixa só o seu
  `render`.
- `conversa.respondeComo`: quem fala as respostas do `responder`. `fixa: true` numa fala do roteiro: ela aparece mesmo
  com `responder`.
- O balão recebe a classe `q-<participante>` (ex.: `q-mestre`), para a skin estilizar.
- Skins do editor ao vivo com visual próprio: `prompt`, `comando`, `chat`, `voz`, `papel`, `checkout`, `anuncio` e
  `email`.

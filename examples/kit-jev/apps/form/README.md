# Formulário que Qualifica

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-form.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar form`.


Um formulário estilo Typeform (uma pergunta por vez, atalhos de teclado, transições) para a captação de uma consultoria
de **implementação de IA para empresas**. Enquanto o lead digita, a **prancheta do vendedor** ("Visão do vendedor", à direita)
mostra o Jev reavaliando o lead a cada pausa: qualificação, BANT, chance de compra em 30 dias, se é curioso/estudante,
a área do processo e o **próximo passo comercial**. O **final do formulário muda** conforme o próximo passo escolhido, e
a aba **Leads** é o painel do vendedor com todos os envios **ordenados pelo Jev**.

Recria (e supera) o exemplo do vídeo "Build Anything with Jev" (minuto 17): em vez de uma nota só, são 9 decisões
tipadas por chamada, um gráfico da evolução do lead pergunta a pergunta e 5 finais diferentes.

## Por que é um uso inteligente do Jev
- **Tempo real de verdade**: a cada pausa na digitação (debounce 350 ms, no máximo 1 s entre avaliações enquanto se
  digita sem parar) o estado inteiro — respostas até agora + a resposta sendo digitada — vai para o Jev e as 9 perguntas
  voltam juntas em ~360 ms. Dá para ver a "Necessidade" pular de 0 para 2,9 no meio da frase "…18 atendentes só para isso".
  Um LLM gerativo levaria segundos por avaliação e custaria dezenas de vezes mais.
- **Os critérios são a política comercial**: BANT, "o que é lead quente" e "quando oferecer curso em vez de reunião"
  estão escritos em português nos critérios (ver `server.mjs`). Mudar a política = editar um texto, sem treinar nada.
- **Decisões, não texto**: o Jev só escolhe/pontua. Todos os textos dos finais (proposta, agenda, curso, material) são
  templates nossos preenchidos com as respostas do lead e com a área que o Jev classificou → zero alucinação.
- **Robustez**: o envio final é reavaliado no servidor (o cliente não consegue forjar a nota) e inclui uma pergunta
  `improprio` — envios ofensivos/spam/"asdf" ficam ocultos para os outros visitantes no painel de leads compartilhado.
- **Custo**: ~US$ 0,00008 por avaliação; qualificar um lead inteiro (≈ 20 avaliações ao vivo) custa ~US$ 0,002.

## Perguntas enviadas ao Jev (uma chamada; `server.mjs → perguntas()`)
Estado: `{ contexto, respostas_do_lead: { "nome e empresa": …, "cargo": …, …, "quem participa da decisão": … } }`
(perguntas ainda não respondidas vão como `"(ainda não respondida)"`).

| id | tipo | critérios (resumo) |
|---|---|---|
| `qualificacao` | choice | `altamente_qualificado` (empresa real, dor cara, verba > R$ 20 mil, decisor, ≤ 3 meses) · `qualificado` (bom lead com um ponto fraco) · `morno` (interesse imaturo) · `desqualificado` (estudante, curioso, fora do escopo, teste) |
| `orcamento` | score 0–3 | sem verba · pequeno/incerto (≤ R$ 5 mil) · razoável (R$ 5–50 mil) · alto e disponível (> R$ 50 mil) |
| `autoridade` | score 0–3 | nenhuma · influenciador · decide junto · decisor final |
| `necessidade` | score 0–3 | nenhuma · vaga · clara · crítica (volume alto, custo relevante) |
| `urgencia_prazo` | score 0–3 | sem prazo · longo (> 6 meses) · médio (2–6 meses) · urgente (≤ 60 dias / data definida) |
| `compra_30_dias` | noul | vai contratar em até 30 dias? |
| `curioso_ou_estudante` | noul | estudante/curioso/sem empresa? |
| `proximo_passo` | choice | `agendar_reuniao_especialista` · `enviar_proposta_expressa` · `oferecer_curso_online` · `nutrir_com_conteudo` · `descartar_com_educacao` |
| `area` | choice | atendimento · vendas · marketing · financeiro · operações · RH · dados/TI · indefinido |
| `improprio` (só no envio) | noul | ofensa, conteúdo sexual, ódio, spam ou teste sem sentido |

Derivados no código (transparentes): **lead score** = 100 × (60% × valor esperado da qualificação [1; 0,7; 0,35; 0] +
40% × média do BANT/3). O gráfico mostra P(`altamente_qualificado`) e o lead score depois de cada pergunta, com um
ponto ao vivo (tracejado) enquanto se digita.

## Medido (2026-09-23, gateway local → OpenRouter, do Brasil)
| ação | chamadas | latência | custo |
|---|---|---|---|
| avaliação ao vivo (1 pausa na digitação) | 1 × 9 perguntas | p50 361 ms · p90 448 ms (280–700 ms) | US$ 0,000082 (~1.960 tokens) |
| resposta de botão (porte/verba) | 1 × 9 | idem | US$ 0,000083 |
| envio final (reavaliação + `improprio`) | 1 × 10 | ~350 ms | US$ 0,000089 |
| preset "CEO decidido" completo (digitação animada) | 24 chamadas / 217 decisões | — | US$ 0,0020 |
| preset "Estudante curioso" completo | 17 chamadas | — | US$ 0,0014 |
| preset com "Pular animação" | 8 chamadas | — | US$ 0,00067 |

Resultados dos presets (reprodutíveis): CEO → altamente qualificado 100%, BANT 3/3/3/3, **agendar reunião** (curva
0% → 2% → 7% → 33% → 76% → 100%); Estudante → desqualificado 100% já na 1ª resposta, **descartar com educação**;
Gerente sem orçamento → qualificado 92–94%, **nutrir com conteúdo** (inclui modelo para convencer a diretoria, porque
autoridade < 2); Dona de loja → **oferecer curso online**. Inglês ("COO, 20k invoices…") → altamente qualificado;
lixo ("asdf") → desqualificado com `improprio` 0,99 (oculto no painel público).

## Roteiro de 60 s para o vídeo (1440×900)
1. (0–5 s) Abrir a página: a ficha (formulário) à esquerda e a prancheta do vendedor vazia à direita ("Aguardando…");
   ao carregar, os ponteiros dos mostradores fazem o autoteste.
2. (5–35 s) Em "Preencher como:", clicar **CEO decidido**. As letras aparecem uma a uma e a lâmpada AO VIVO do prendedor
   pisca a cada leitura; apontar a prancheta: ao digitar o processo, o ponteiro da Necessidade gira para ~2,9 e o
   bilhete do próximo passo vira "Agendar reunião com especialista"; na verba a curva do papel milimetrado sobe; em
   "antes da Black Friday" o ponteiro da Urgência vai a 3,0 e a curva chega a 100%. (Se quiser encurtar: "Pular
   animação".)
3. (35–42 s) No final, mostrar a agenda personalizada ("Agente de atendimento 24h no WhatsApp para a Transportadora
   Rota Sul…"), clicar um horário → **Confirmar horário** → "Reunião confirmada".
4. (42–52 s) Clicar **Estudante curioso** e deixar digitar 2–3 respostas: a prancheta já cai para o selo "frio" e
   "Desqualificado" (100% na ponta fria da régua) na primeira resposta; clicar "Pular animação" → final "Obrigado,
   Lucas!" (descartar com educação).
5. (52–60 s) Abrir a aba **Leads**: CEO no topo com score 100 e "Reunião marcada", estudante no fim; abrir
   "Ver o que o Jev vê" (a lupa da barra do topo) para mostrar as 9 perguntas e as probabilidades cruas.

## Rotas
`GET /api/config` (campos, presets, rótulos) · `POST /api/avaliar` (ao vivo, 150/min por IP) · `POST /api/enviar`
(12/min) · `POST /api/reservar` e `POST /api/acao-final` (20/min; só o navegador que enviou o lead) · `GET /api/leads`.
Leads em `DATA_DIR/leads.json` (máx. 500, apaga > 7 dias, escrita atômica).

## Deploy
- `PORT` (padrão 4102), `DATA_DIR` (padrão `apps/form/data-runtime/`, criada sozinha), `JEV_GATEWAY_URL`
  (padrão `http://127.0.0.1:8787`). Node 22, zero dependências npm. Sem estado em memória que precise de disco além de
  `leads.json` (o custo acumulado por preenchimento fica em memória, com teto de 5.000 entradas / 3 h).
- O painel de leads é **compartilhado entre visitantes** (é a ideia do "painel do vendedor"); o aviso "demo — não use
  dados reais" aparece no formulário e no painel. O dono de um envio é identificado por um id aleatório no
  `localStorage` do navegador.

## Limitações conhecidas
- Respostas de 2 a 120/240/1.200 caracteres (conforme o campo). O Jev julga só o texto — não verifica empresa, CNPJ nem
  valores.
- A agenda é simulada (dias úteis seguintes, alguns horários marcados como ocupados de forma determinística) e nenhum
  e-mail/convite é enviado. O "curso" e o "material" são ofertas fictícias.
- O limite por IP (150 avaliações/min) é folgado para digitação humana; redes com muitos usuários atrás do mesmo IP
  podem ver a mensagem "Calma! Muitas requisições seguidas".

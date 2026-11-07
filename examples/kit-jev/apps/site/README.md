# Site que Lê Intenções (versão genérica)

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-site.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar site`.


Uma página de vendas longa mostra tudo para todo mundo, na mesma ordem. Esta começa com **quase tudo fechado**: cada
seção do negócio é uma **porta** com um botão para abrir, e os itens de dentro também se abrem (percurso → etapa →
subitens; cartão → descrição; pergunta → resposta). Cada abertura é um sinal forte do que a pessoa quer, e a página se
monta para ela, na frente dela, dizendo por quê:

- a próxima porta ganha a luz ciano→violeta e o selo «Para você · porque você abriu X e Y · 48%»;
- as portas fechadas abaixo da tela se reordenam, e os itens que combinam sobem na lista aberta («✦ Para você»);
- aparece «Sua trilha», o botão fixo muda de texto e a dúvida do momento ganha a resposta oficial do FAQ;
- quem vai embora vê o resumo do que abriu, com o preço e as condições reais.

Todo o conteúdo vem de `public/dados/site.json`. Neste pacote ele descreve um negócio **fictício de exemplo**:
**Casa Grão** (cafeteria de especialidade com clube de assinatura), com 10 seções, 39 itens nas listas e 5 simulações de visitante.
A descrição de onde ele saiu está em `dev/descricao.txt`.

## Por que é um bom uso do Jev

A cada sinal que importa, o servidor faz **uma** chamada ao Jev com 7 a 9 perguntas. O Jev só escolhe entre itens
reais do `site.json`; todo texto na tela sai do JSON ou dos modelos de frase do código, então a página nunca inventa
preço, promessa ou depoimento. Isso só é viável com um modelo de decisão rápido e barato: a página reage a cada clique,
várias vezes por minuto. Um LLM de texto levaria segundos, custaria dezenas de vezes mais e poderia inventar promessa
de venda.

## As perguntas (1 chamada por sinal, `POST /api/decidir`)

| id | tipo | o que decide | opções |
|---|---|---|---|
| `perfil` | choice | quem é o visitante | `jev.perfis` do `site.json` + «indefinido» |
| `interesse` | choice | o que ele mais quer agora | `jev.interesses` |
| `proxima` | choice | a próxima seção **fechada** que vale abrir | só as seções ainda fechadas + «nenhuma» (some quando tudo já foi aberto) |
| `destaque` | choice | o item a mostrar primeiro na lista aberta | os itens da lista que está na tela (só quando há uma) |
| `objecao` | choice | a dúvida do momento | `jev.objecoes` (cada uma ligada a uma pergunta real do FAQ) + «nenhuma» |
| `acao` | choice | o que a página faz agora | nenhuma, guiar, destacar_item, responder_objecao, montar_trilha, mostrar_prova (só com depoimentos), convidar, segurar_saida |
| `trilha` | choice | por onde começar | os percursos da seção do tipo `trilhas` |
| `depoimento` | choice | o depoimento mais parecido com o visitante | os depoimentos (só se a seção existir) |
| `prob_entrar` | noul | chance de concluir nesta visita | sim / não |

O navegador manda só um resumo do comportamento (o que abriu, por quanto tempo, buscas, FAQ, preço, rolagem, saída);
o servidor valida cada campo (`limpar`) antes de montar o estado. Os critérios de cada opção são a política de
personalização e ficam no `site.json`.

**Medido em 24/09/2026** (versão genérica, dois negócios de teste, 103 chamadas reais): 7,9 perguntas por chamada,
p50 de 362 ms e p90 de 545 ms, ~3.300 tokens de entrada e **US$ 0,00014 por chamada**; uma simulação inteira custa
~US$ 0,002.

## Como rodar

```bash
# gateway do Jev no ar em :8787 (veja o README da raiz)
JEV_GATEWAY_URL=http://127.0.0.1:8787 PORT=4115 node apps/site/server.mjs
# abra http://127.0.0.1:4115/  ·  ▶ «Simular visitante» (ou ?sim=<id>) roda um visitante fantasma com o Jev de verdade
```

Simulações deste exemplo (`?sim=<id>`): `iniciante` (🌱 Começando no café especial), `metodos` (⚗️ Fã de filtrados), `preco` (💸 De olho no preço), `saindo` (🚪 Indo embora), `rotina` (☕ Café todo dia em casa).

## Trocar o negócio

- `public/dados/site.json`: todo o texto da página, a política do Jev (perfis, interesses, objeções, critérios) e as
  simulações. O servidor lê o arquivo na partida: reinicie o app depois de mudar.
- `public/tema.css`: a paleta e as fontes (tokens de cor, `--f-tit` e `--f-txt`); os arquivos das fontes ficam em
  `public/fonts/titulos.woff2` e `public/fonts/texto.woff2`. O `app.css` não tem cor nem fonte própria.
- `dev/descricao.txt`: a descrição do negócio. `python3 apps/site/dev/validar_site.py` confere o `site.json` contra o
  esquema, os mínimos e a descrição (números, nomes, preços e links precisam estar nela) e sai com 1 se houver erro.
- `dev/exemplo/`: o par de referência (`descricao.txt` + `site.json`) do negócio de exemplo.
- A pasta **“Prompts (para quem não programa)”**, ao lado deste pacote, tem o prompt que constrói este mesmo site para
  outro negócio a partir de uma descrição em texto livre: o Claude Code escreve o `site.json`, escolhe a paleta e as
  fontes e publica.

## Arquivos

```
server.mjs              lê o site.json, valida os sinais (limpar), monta o estado e as perguntas; /api/config, /api/decidir, /api/stats
public/index.html       esqueleto da página (topbar, portas, trilho do Jev, diálogos, Raio-X, simulações)
public/app.js           entrada: carrega o site.json e o /api/config e monta página, camada do Jev e simulações
public/core.js          estado da visita, utilidades, HTML com escape, eventos, ícones
public/sinais.js        o rastreador: eventos e medições que viram o resumo enviado ao servidor
public/pagina.js        as portas e o conteúdo por tipo de seção, listas com busca e filtros, formulário de demonstração
public/jev.js           laço de decisão e as adaptações (porta recomendada, «Para você», Sua trilha, dúvida, saída, Raio-X)
public/sims.js          simulações: cursor fantasma com eventos reais, seguindo os passos do site.json
public/app.css          estilos (sem cor nem fonte: os tokens vêm do tema.css)
public/tema.css, public/fonts/, public/dados/site.json    o negócio de exemplo
dev/validar_site.py, dev/descricao.txt, dev/exemplo/      conferência do conteúdo
```

## Limitações conhecidas

- O pagamento (ou contato) é **de demonstração**: nada é cobrado nem enviado.
- O Jev é probabilístico: duas visitas iguais podem ter adaptações um pouco diferentes; o Raio-X mostra as
  probabilidades de cada decisão.
- Sem depoimentos reais na descrição, a seção vira «Exemplos de depoimentos», com um selo em cada cartão.

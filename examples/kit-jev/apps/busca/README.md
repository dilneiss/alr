# Busca que Entende

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-busca.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar busca`.


Busca de loja que entende o que você quer dizer. A cada pausa na digitação, o Jev dá uma nota de relevância para
**cada um dos 120 produtos** do catálogo e reordena tudo — lado a lado com a busca tradicional por palavra-chave, que
falha em frases como "presente pra minha mãe que ama jardinagem até 150 reais".

Na tela, com cara de catálogo de loja de departamentos dos anos 70: na capa, a barra de busca, 8 buscas-exemplo
(1 clique) e o cupom **"O Jev entendeu"** (Intenção: Presente · Departamento: Jardim · Destinatário: Para a mãe ·
Orçamento: Até R$ 150), com o **Recibo do Jev** embaixo; a **página de índice** do catálogo (120 quadradinhos por
departamento que ganham a cor do nível que o Jev deu, com os 5 primeiros circulados a caneta e numerados); e os dois
balcões: "Balcão 1 · Busca por palavra-chave" × "Balcão 2 · Busca com Jev". Cada resultado do Jev leva uma etiqueta de
preço com o nível e mostra em que posição ele apareceria na busca comum ("não aparece" é o mais comum); cada resultado
da busca comum ganha a etiqueta com o veredito do Jev ("✕ Jev: irrelevante"). No celular, os balcões e o índice viram
as abas "Com Jev", "Palavra-chave" e "Catálogo".

## Por que é um uso inteligente do Jev
- **O catálogo inteiro, não os 10 primeiros**: 120 perguntas `score` numa rodada, em 5 chamadas paralelas de 24
  produtos. Não existe pré-filtro por palavra: o mordedor ultrarresistente (15º na busca comum) vira o 1º para
  "meu cachorro destrói todos os brinquedos", e a pelúcia com apito (3º na busca comum) cai para "talvez".
- **Entendimento tipado**: uma chamada separada com 5 `choice` (intenção, departamento, para quem, ocasião, faixa de
  orçamento) preenche as linhas do cupom "O Jev entendeu". Funciona com gíria ("sem gastar muito" → econômico), inglês
  e emoji. O valor exato do orçamento é lido por código (`orcamento.mjs`: "uns cem conto" vira "Uns R$ 100", com teto
  de R$ 110); o Jev escolhe a faixa só quando o texto não traz um valor.
- **Sabe dizer "não tenho"**: se nenhuma nota passa de "talvez", a página diz que nada no catálogo atende, em vez de
  empurrar qualquer coisa ("passagem aérea para Paris", "🔥🔥🔥").
- **Divisão de trabalho honesta**: o Jev não faz contas, então o **valor exato** do orçamento é lido do texto por código
  (`orcamento.mjs`: "até 150 reais", "no máximo R$ 80", "cento e cinquenta", "entre 100 e 200", "2k") e os produtos
  acima dele descem para o fim (aviso "Também combinam, mas passam de R$ 150,00: …" no pé do Balcão 2). Quando o texto
  foge desses padrões, vale a faixa escolhida pelo Jev. Todo texto da tela é nosso; o Jev só pontua e escolhe.
- **Barato e rápido**: ~US$ 0,0009 e ~0,6 s por busca completa do catálogo → 1 milhão de buscas ≈ US$ 900.

## Perguntas enviadas (ver `server.mjs`)
**Relevância — 120 perguntas `score`, uma por produto** (5 lotes de 24; o `state` leva a frase do cliente e as 24
linhas de produto no formato `nome — descrição | R$ preço | departamento | para: público`):

| id | tipo | instrução | critérios (0 → 3) |
|---|---|---|---|
| `p001`…`p120` | score | "Quão bem o produto pXXX atende ao pedido do cliente?" | Irrelevante: não tem relação com o que a pessoa pediu · Talvez: tem alguma relação, mas não resolve bem o pedido · Boa opção: atende bem ao pedido · Perfeito: exatamente o que a pessoa procura, para a pessoa e a situação certas |

Nível exibido na etiqueta de preço = nota arredondada; a porcentagem embaixo dela é a probabilidade desse nível.

**Entendimento — 1 chamada, 5 perguntas `choice`:**

| id | opções |
|---|---|
| `intencao` | presente, uso_proprio, reposicao, pesquisa |
| `categoria` | casa, jardim, cozinha, eletronicos, esporte, camping, moda, beleza, pet, brinquedos, livros, papelaria, bem_estar, varias |
| `para_quem` | mae, pai, avos, parceiro, crianca, bebe, adolescente, amigo, pet, eu_mesmo, familia, nao_informado |
| `ocasiao` | aniversario, dia_das_maes, dia_dos_pais, natal, amigo_secreto, dia_dos_namorados, dia_das_criancas, viagem, nenhuma |
| `orcamento` | sem_limite, barato, ate_50, ate_100, ate_150, ate_200, ate_300, ate_500, ate_1000, premium |

Intenção e departamento aparecem sempre no cupom; destinatário e ocasião só com probabilidade ≥ 0,5; a faixa de
orçamento escolhida pelo Jev só com ≥ 0,6 (e só quando o código não leu um valor no texto).

## Como o formato foi escolhido (medido em 2026-09-23)
- **Tamanho do lote**: 20, 30, 40 e 60 produtos por chamada dão o mesmo top-5 nas 4 buscas de teste; erro médio da
  nota contra 1 produto por chamada = 0,09–0,20 (escala 0–3). Ficou 24 porque cada chamada cabe inteira no inspetor.
- **`score` × `noul`**: `noul` custa metade (~US$ 0,00043), mas comprime o topo (0,55–0,96) e perde os 4 níveis que a
  tela mostra. Ficou `score`.
- A busca por palavra-chave (`public/keyword.js`) é honesta: sem acento, sem palavras vazias, plural reduzido, prefixo
  enquanto digita, pesos por campo (nome > departamento > público/descrição) com IDF e sinônimos de verdade
  (cachorro = cão, acampar = camping, celular = smartphone…). Ela não sabe que quem ama jardinagem compra coisas de jardim.

## Latência e custo medidos
| ação | chamadas | perguntas | tokens de entrada | custo | latência |
|---|---|---|---|---|---|
| uma busca (catálogo inteiro + entendimento) | 6 em paralelo | 125 | ~21.500 | **US$ 0,00091** | **540–1.070 ms** no servidor (típico ~600 ms); clique → tela 570–1.110 ms |
| só o entendimento | 1 | 5 | ~1.480 | US$ 0,000062 | 470–640 ms |
| busca repetida (cache de 30 min) | 0 | — | — | US$ 0 | 5–50 ms (a tela mostra a medição original) |

Por chamada no gateway: p50 505 ms, p90 640 ms (514 chamadas, 0 erros). Gasto total de desenvolvimento e testes deste
app: ~US$ 0,09. Cache em duas camadas: 30 min na aplicação (guarda a medição original, que a tela mostra) + cache do
gateway (`cache: true`, 30 min); `?fresh=1` desliga as duas.

Resultado do e2e (precisão@5 contra gabarito escrito à mão sobre `data/catalogo.json`):

| busca | Jev | palavra-chave |
|---|---|---|
| presente pra minha mãe que ama jardinagem até 150 reais | 1,0 (todos ≤ R$ 150) | 0,6 (4 resultados, um é "sabonetes") |
| acampar com criança no frio | 1,0 | 1,0 |
| meu cachorro destrói todos os brinquedos | 1,0 | 0,4 (pelúcia em 3º) |
| tenho insônia e acordo com qualquer barulho | 1,0 | 0,2 (1 resultado) |
| gift for a coffee lover | 3/3 de café no topo | 0 resultados |

## Roteiro de 60 s para o vídeo
1. **0–5 s** — Tela inicial: a capa do catálogo ("Busca que Entende"), a barra de busca, o cupom "O Jev entendeu" em
   branco, a página de índice com os 120 produtos apagados e os dois balcões vazios.
2. **5–20 s** — Clique **"🌱 Mãe jardineira, até R$ 150"**. A página de índice pisca em mostarda e acende a fileira do
   Jardim em tomate e mostarda, com os 5 primeiros circulados a caneta. O cupom se preenche: "Intenção … Presente ·
   Departamento … Jardim · Destinatário … Para a mãe · Orçamento … Até R$ 150". No Balcão 1, a busca comum acha 4 itens
   (um deles é o "Kit 4 sabonetes artesanais", com a etiqueta "✕ Jev: irrelevante"); no Balcão 2, a campainha toca e o
   adesivo diz "11 boas opções", todas até R$ 150, com etiquetas "Perfeito" e várias com "busca comum: não aparece".
   Mostre o Recibo do Jev: "120 produtos avaliados em ~600 ms · 6 chamadas em paralelo · 125 perguntas · custo
   US$ 0,0009".
3. **20–32 s** — Clique **"🐶 Cachorro destruidor"**: no Balcão 1, a busca comum põe a pelúcia com apito em 3º; no
   Balcão 2, o Jev põe o mordedor de nylon em 1º ("busca comum: 15º").
4. **32–44 s** — Apague e digite devagar **"tenho insônia e acordo com qualquer barulho"**: o Balcão 1 muda a cada letra
   e acha 1 produto; o Balcão 2 atualiza nas pausas (ruído branco, protetor auricular, livro "Sono Profundo", fone com
   cancelamento…).
5. **44–52 s** — Clique **"☕ Em inglês"**: o Balcão 1 mostra "0 resultados"; o Balcão 2 acha café em grãos, moka e
   moedor.
6. **52–60 s** — Clique **"Ver o que o Jev vê"** (o botão com o ícone de olho, na barra do topo): as 6 chamadas reais,
   as 125 perguntas e as probabilidades.

## Limitações conhecidas
- Catálogo de demonstração fixo (120 produtos em `data/catalogo.json`), com emoji no lugar de foto.
- O Jev julga cada produto pela linha de texto (nome, descrição, preço, departamento, público); não sabe estoque,
  avaliações nem frete.
- Orçamento: o código entende valores em reais ("até", "no máximo", "menos de", "entre X e Y", números por extenso,
  "2k"); "under $30" é lido como R$ 30; preço mínimo ("acima de 500") não vira filtro — fica só a nota do Jev.
- Busca automática depois de 550 ms de pausa e com 3+ letras (Enter busca com 2+); máximo 300 caracteres.
- Cache em memória por 30 min por frase normalizada (zera ao reiniciar). Limite de 60 buscas/min por IP
  (cada busca = 6 chamadas ao gateway). Se uma das 6 chamadas falhar, a busca mostra os produtos avaliados e avisa
  quantos ficaram sem nota (resultado parcial não entra no cache).

## Rodar e testar
```bash
cd "."
PORT=4111 node apps/busca/server.mjs        # Node 22, sem dependências npm
```
Variáveis de ambiente: `PORT` (padrão 4111), `JEV_GATEWAY_URL` (padrão `http://127.0.0.1:8787`), `DATA_DIR`
(padrão `apps/busca/data-runtime/`; guarda só o contador `stats.json`). O proxy reverso deve repassar
`X-Forwarded-For` (limite por IP). Arquivos: `server.mjs` (rotas e perguntas),
`orcamento.mjs` (leitura do orçamento), `public/keyword.js` (busca comum), `public/app.js` (interface),
`data/catalogo.json` (catálogo semente).

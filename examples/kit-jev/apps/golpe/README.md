# Detector de Golpes

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-golpe.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar golpe`.


Cole qualquer mensagem suspeita (WhatsApp, SMS, e-mail) e o Jev responde, em ~350 ms, se é golpe, de que tipo, quais
sinais de alerta aparecem e o que fazer — inclusive enquanto você digita.

## Por que é um uso inteligente do Jev
- **Uma chamada, 12 perguntas**: veredito (`noul`), tipo de golpe (`choice` com 12 tipos brasileiros), gravidade (`score`
  0–4), orientação (`choice` entre 7 condutas) e 8 sinais de alerta (`noul`). Um LLM levaria segundos e poderia inventar
  categorias; o Jev devolve sempre uma das opções válidas, com probabilidade calibrada.
- **Tempo real**: a análise refaz a cada pausa na digitação — dá para ver o veredito mudar quando entra o "faz um pix".
- **Custo**: ~US$ 0,00006 por análise → 1 milhão de mensagens ≈ US$ 60. Viável para rodar em todo SMS de um banco.
- Todo o texto exibido (orientações, rótulos) é escrito por nós; o Jev só decide. Zero alucinação.

## Perguntas enviadas (ver `server.mjs`)
| id | tipo | o que decide |
|---|---|---|
| `e_golpe` | noul | probabilidade de ser golpe |
| `tipo` | choice | falso_parente, falso_banco, taxa_entrega, emprego_falso, investimento_milagroso, roubo_de_conta, premio_falso, boleto_falso, romance, sequestro_falso, outro_golpe, nao_e_golpe |
| `gravidade` | score | nenhum → crítico (5 níveis) |
| `acao` | choice | 7 condutas (bloquear, confirmar por outro canal, falar com o banco pelo app, não clicar, nunca passar código, desconfiar, pode responder) |
| `sinal_*` (8) | noul | urgência, pede dinheiro, pede código/dados, link suspeito, usa identidade conhecida, bom demais, troca de número, ameaça |

Veredito: `e_golpe` ≥ 0,70 → GOLPE; ≥ 0,35 → SUSPEITO; senão PARECE SEGURO.

## Medido (2026-09-23, do Brasil)
Latência 340–490 ms por análise; custo US$ 0,000062 (≈1.480 tokens de entrada). Acertos nos exemplos: falso parente 96%,
taxa dos Correios 95%, almoço de sábado 2%, notificação real de compra 32% (seguro).

## Roteiro de 60 s para o vídeo
1. Abrir a página: a pasta manila aberta, com o saco de provas à esquerda e o laudo em branco ("Aguardando prova") à
   direita. A barra do topo mostra latência e custo ao vivo.
2. Clicar na ficha **Caso 01 · "Mãe, troquei de número"** → o carimbo vermelho GOLPE bate no laudo: "É GOLPE", ~97% na
   régua, tipo falso parente, achados constatados grifados e a providência "Confirme por outro canal antes de pagar."
3. Clicar na ficha **Caso 09 · Almoço de sábado** → carimbo azul LEGÍTIMA, "PARECE SEGURO", ~2% (mostra que não sai
   marcando tudo como golpe). Cada ficha analisada ganha o selo do veredito.
4. Clicar em **Limpar** e digitar devagar: "oi, sou eu, troquei de número" (laudo em rascunho, carimbo SUSPEITA, ~40%)
   … "me faz um pix de 800?" — a régua sobe e o carimbo bate de novo, agora GOLPE (~93%), enquanto você digita.
5. Abrir **"Ver o que o Jev vê"** (o botão da lupa, na barra do topo) para mostrar as 12 perguntas e as probabilidades
   cruas.

## Limitações
Mensagem de 8 a 4.000 caracteres. Não abre links nem verifica números; julga só o texto. Limite de 50 análises/min por IP.

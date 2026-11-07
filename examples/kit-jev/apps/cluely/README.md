# Mini Cluely

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-cluely.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar cluely`. Aqui, o texto é escrito por um modelo na nuvem (Gemini 2.5 Flash-Lite pelo OpenRouter, via gateway), no lugar do modelo local citado abaixo; a transcrição Whisper do servidor vem desligada.


Um copiloto no estilo do Cluely: **vê a sua tela, ouve a conversa e sopra a resposta na hora**, numa janela que
flutua por cima de qualquer app. A divisão de trabalho é o ponto do demo:

- ⚡ **Jev decide** (~0,3 s, centavos): quem falou, o que está acontecendo, **se vale interromper**, que ajuda dar, em
  que tom e **qual fato do seu contexto responde**; se cada termo técnico que o reconhecimento de voz ouviu errado deve
  ser trocado; se o rascunho escrito com a frase pela metade **ainda serve** para a frase completa. Na tela, que tipo de
  tela é, que ajuda faz sentido e **quais linhas do OCR importam**; numa pergunta livre, **de onde vem a resposta**.
- ✍️ **Um modelo local rápido escreve** (Qwen3-4B no servidor, sem custo por uso, 2 respostas em paralelo): só
  quando o Jev manda, com um prompt curto montado a partir das decisões dele e com o começo do prompt já aquecido no cache.
- 🎧 **Transcrição pelo ElevenLabs Scribe v2 Realtime:** o áudio do microfone ou da aba vai direto do navegador para o
  Scribe (token de uso único gerado pelo servidor), com os termos do seu contexto e os de IA/programação como
  *keyterms*. O reconhecimento do navegador fica só como reserva (sem a chave), com a camada de ajuste e o Whisper.

A imagem da tela é lida por OCR no servidor e não vai para lugar nenhum; só o texto das linhas vai ao Jev.
Projeto independente, inspirado no Cluely e sem relação com a empresa.

## O que ele faz (as capacidades básicas do Cluely)
| Capacidade | Como funciona aqui |
|---|---|
| **Ouvir a reunião** | 🎙️ Microfone e 🔊 áudio de uma **aba compartilhada** → ElevenLabs Scribe v2 Realtime (parciais + texto confirmado ~1 s depois de cada fala) · 🎬 4 reuniões simuladas (venda, reunião de equipe, cliente irritado, consultoria de IA) · fala digitada. Sem a chave do ElevenLabs, o reconhecimento do navegador (Web Speech API) |
| **Entender termos em inglês** | Camada de ajuste (64 termos de IA/programação + os termos que você cadastra no contexto) e, para microfone e aba, o **Whisper com o glossário como contexto**: "toque Snap da o" → "tokens na API da OpenAI". As trocas ficam destacadas na conversa (passe o mouse para ver o que foi ouvido) |
| **Saber quem falou** | Sem identificação de voz: o Jev decide pelo conteúdo e pelos papéis do contexto (acertou 39/40 falas). Com microfone + aba, o canal já diz quem é |
| **Responder antes de a pessoa terminar** | Com a frase pela metade, o Jev já decide se é uma pergunta ou objeção e **qual fato do seu contexto responde** (aparece na hora, 📌) e a IA local começa um **rascunho**. No fim da frase o Jev confere: "✓ confirmado com a frase completa" ou sai uma **versão nova** (o rascunho fica visível, esmaecido, até ela começar) |
| **Ver a tela** | 🖥️ Compartilhar tela ou aba (`getDisplayMedia`) ou 4 telas de exemplo (e-mail, chat, erro no código, slide) → OCR → o Jev marca tipo, ação e linhas importantes (as caixas acendem na captura) → rascunho, explicação do erro, resumo… |
| **⌘↵ ajuda agora** | Sem texto: o Jev decide se você precisa de ajuda com a tela ou com a conversa. Com texto: pergunta livre, com a rota do Jev; sem o dado, a resposta pede para confirmar em vez de inventar |
| **O que eu digo? / follow-ups / recap / e-mail** | 💬 O que eu digo? · ❓ Perguntas (prioriza o que a conversa ainda não cobriu) · 🧾 Resumo com próximos passos · ✉️ E-mail de follow-up |
| **Janela por cima de tudo** | ⧉ **Document Picture-in-Picture**: o copiloto vira uma janela sempre por cima de qualquer app (Zoom, Meet, Teams…), com tudo funcionando dentro dela. ⌘\ oculta/mostra |
| **Notas da reunião** | Notas ao vivo (tarefa, decisão, dado, pergunta importante) com o dono · cobertura da conversa (ex.: dor, impacto, quem decide, orçamento, prazo, próximo passo) |
| **Contexto / modos** | Contextos prontos e editáveis (os fatos que a IA pode usar e os **termos que você usa**) + modo detectado pelo Jev (vendas, reunião, atendimento, entrevista, aula…) |
| **Transparência** | 🩻 Raio-X com cada decisão e probabilidade · 🔍 inspetor com as chamadas reais · botão Arquitetura |

**O que ele não faz (diferente do Cluely):** não é invisível no compartilhamento de tela (a janela flutuante aparece se
você compartilhar a tela inteira); não é app nativo, então os atalhos só valem com a página ou a janela flutuante em
foco; lê **texto** da tela (OCR), não entende imagens e gráficos sem texto; a 1ª camada de transcrição é a do navegador
(no Chrome, o áudio vai para o serviço de voz do Google); a 2ª camada roda no servidor.

## Microfone de verdade: teste com fala do ElevenLabs e a troca para o Scribe (24/09/2026)
Uma reunião de 149 s foi gerada no ElevenLabs (duas vozes brasileiras, 22 falas, 67 termos de IA e negócios) e tocada no
microfone do app de dois jeitos (`test/voz11/`): pelo microfone falso do Chrome lendo o arquivo (`rodar_app.py`) e, no
teste acústico, saindo pelo alto-falante do Mac e captada pelo microfone embutido (`rodar_app_mic_real.py`). Resultado:

| transcrição | termos certos | erro por palavra |
|---|---|---|
| app em produção com o reconhecedor do navegador | 43% | 56% (13 bolhas para 22 falas: sumiram falas inteiras) |
| reconhecedor do Chrome sozinho, conversa contínua | 33% | 48% |
| reconhecedor do Chrome, cada fala isolada | 57% | 17% |
| Whisper `small` do servidor + prompt | 79% | 8% (~4 s por fala) |
| Scribe v2 | 93% | 2% |
| Scribe v2 + termos do contexto | 99% | 1% (~1 s por fala) |
| **app novo (microfone → Scribe v2 Realtime + termos)** | **97%** | **2% — 22 de 22 falas, quem falou 22/22** |
| **teste acústico: alto-falante do Mac → microfone físico → app novo (produção)** | **97%** | **3% — 22 de 22 falas, quem falou 22/22** |
| teste acústico: alto-falante do Mac → microfone físico → app antigo | 43% | 54% (15 bolhas para 22 falas) |

O reconhecedor do navegador perde trechos no meio das falas ("entendi … em cima dos documentos de vocês", sem o "LLM, tipo
o Claude ou o GPT, com RAG") e troca os termos ("reggae" por RAG, "roupa esporte" por HubSpot, "turno" por churn,
"INSS" por NPS). A lógica do app de fechar a frase sozinho depois de 1,5 s parado perdia ainda mais. Nenhuma camada de
ajuste recupera texto que não chegou — por isso a fonte mudou.

**Como funciona agora:** o navegador captura o microfone (ou a aba), um AudioWorklet converte para PCM 16 kHz em pedaços
de 100 ms, e o WebSocket vai direto ao `wss://api.elevenlabs.io/v1/speech-to-text/realtime` (modelo `scribe_v2_realtime`,
commit por pausa de 0,7 s, `language_code=pt`, até 50 `keyterms`: os termos do seu contexto primeiro, depois os de IA e
negócios). A autenticação é um token de uso único de `POST /api/stt-token` (a chave `ELEVENLABS_API_KEY` fica só no
servidor). Parciais viram a análise da fala pela metade; cada texto confirmado vira uma fala. Se a sessão cair, o
ouvinte pede outro token e reconecta, com o áudio do intervalo guardado.

## Pergunta de conhecimento geral: resposta com fonte (`saber.mjs`)
recebeu da IA local "Apoio… ajuda Odisséu… criou a arca de ouro… deus da aritmética" — o modelo pequeno inventa quando
responde de memória. Agora, a cada fala, o Jev também responde `conhecimento_geral` (noul): com ≥ 0,6 numa pergunta,
a resposta sai de uma fonte:
1. busca na Wikipédia com as palavras da pergunta e das últimas falas (nomes próprios primeiro: "ele" = Apolo vem da fala anterior);
2. o **Jev escolhe o artigo** entre até 6 candidatos (ou nenhum);
3. o artigo vira frases e o **Jev marca as que respondem** (noul por frase, até 48 numa chamada);
4. as frases marcadas aparecem **na hora**, com o link da fonte ("📚 Da fonte · Apolo"); a IA local resume depois em
   linguagem simples. Se nada responde, o card diz "Não achei na fonte" em vez de arriscar.
Sem rascunho nem largada antecipada para esse tipo de pergunta (sairiam sem fonte).

Medido com a aula gerada no ElevenLabs (`test/voz11/aula/`, microfone → Scribe, produção): as 3 perguntas da aluna
("outros livros", "oráculo de Delfos", "mãe do Apolo") saíram do artigo "Apolo" com as frases certas, a 1ª versão em
1,1–4,1 s depois do fim da pergunta. O resumo da IA local ainda escorrega às vezes (numa nota, trocou Níobe por Leto;
"APOLÔ") — as frases da fonte, mostradas antes, são o texto exato da Wikipédia.

## Reserva (sem a chave do ElevenLabs): camada de ajuste de contexto + Whisper
O reconhecimento de voz do navegador em pt-BR transforma termos técnicos em inglês em palavras portuguesas — e a IA
entende errado o que foi dito. Medido com 26 frases de IA/programação × 2 vozes (`test/asr/`): "quanto custa por milhão
de tokens na API da OpenAI?" vira "quanto custa por milhão de **toque Snap da o**"; "frontend" vira "confronto",
"inferência" vira "referência". Duas camadas resolvem isso sem atrasar a decisão:

1. **Ajuste de contexto (instantâneo, `public/lib/ajuste.mjs`, o mesmo código no navegador e no servidor).**
   - Variantes que só podem ser o termo técnico são trocadas direto: "n oito n" → n8n, "git rabi" → GitHub, "lama cpp" → llama.cpp.
   - O que também é palavra comum vira **candidato**, e quem decide é o Jev, pelo contexto: "toque" → tokens?,
     "cloud code" → Claude Code?, "referência" → inferência?, "rag" → RAG?. Cada candidato é uma pergunta de escolha
     (`ajN`: manter × trocar) na **mesma chamada** da fala, sem custo de latência.
   - Os **termos que você usa** (campo no contexto) entram por semelhança de pronúncia.
   - O texto ajustado alimenta o Jev, a IA local, o histórico e a tela. As trocas ficam destacadas; a decisão do Jev
     vale também para as parciais seguintes da mesma fala.
2. **Whisper (robusto, ~3 s depois, `stt.mjs`).** A aba guarda os últimos ~40 s de áudio só na memória (PCM). Quando uma
   fala do microfone ou da aba termina, o trecho vai para o whisper.cpp (modelo `small` q5_1) no servidor, com um
   prompt de contexto: glossário + os seus termos + as 2 últimas falas. Se o texto mudou, a bolha troca na hora ("🎧
   revisada pelo Whisper") e o Jev confere de novo a decisão e a resposta já escrita. Se o Whisper ouviu bem menos
   palavras que o navegador (recorte ruim), fica a do navegador.
   - Com temperatura 0 e sem nova tentativa, o Whisper às vezes entra em laço e repete a mesma frase até o fim do trecho
     (visto no e2e: 14 vezes, em 11–14 s). O `stt.mjs` guarda só a 1ª ocorrência e limita as palavras à duração da fala.
   - Uma revisão que passaria de 9 s (ou 1,8 × a duração) é abandonada, e fica a transcrição do navegador.

| termos técnicos certos (26 frases × 2 vozes) | % |
|---|---|
| reconhecimento do navegador (Chrome) | **12%** |
| navegador + camada de ajuste (glossário + Jev) | 37% |
| Whisper `small` sem prompt | 44% |

Reduzir o `audio_ctx` do Whisper ao tamanho da fala foi medido e **rejeitado**: mediana 1,3 s, mas os termos certos
caíram de 81% para 59% e o p90 foi a 11 s. No roteiro "Consultoria de IA" (13 falas com os erros reais do navegador),
a camada de ajuste acertou todas as trocas, sem trocar palavra comum que era a certa.

## Resposta antes do fim da frase
Esperar a pessoa terminar de falar para só então decidir e escrever deixava ~1,5–3 s de silêncio. Agora:

- **Fala parcial:** no microfone, a partir de 4 palavras e a cada ~3 palavras novas (numa pausa de 300 ms, no máximo 4
  vezes por fala), o Jev analisa a frase pela metade. Se ele já vê uma pergunta ou objeção com sinal forte
  (`momento ≥ 0,55` ou `precisa_ajuda ≥ 0,7`), a IA local escreve um **rascunho** na hora, no mesmo stream.
- **Fato do contexto na hora:** a mesma chamada escolhe (`fato`, choice entre até 14 fatos do seu contexto) o que
  responde ao que está sendo dito — ele aparece no card antes de a IA escrever qualquer palavra.
- **Largada antecipada:** se a última parcial pediu ajuda sem sinal forte (não houve rascunho), a IA local começa assim
  que a fala termina, com a decisão da parcial e o texto completo, em paralelo com a chamada final ao Jev.
- **Fim da frase:** o Jev responde `rascunho_serve` (noul). Serve → "✓ confirmado com a frase completa". Não serve →
  sai a versão nova (o rascunho continua visível, esmaecido, até a 1ª palavra dela). Quando a decisão final é não
  ajudar, o rascunho some. A revisão do Whisper passa pela mesma conferência.
- **Uma resposta por fala:** as chamadas ao Jev de uma aba vão em fila, então uma análise parcial pode voltar depois de
  a fala final já ter chegado. O servidor marca as falas finalizadas, e a parcial atrasada não escreve mais. Antes, ela
  escrevia um 2º rascunho, que tomava o card e nunca era conferido.
- O card mostra "⚡ X s antes do fim da frase" quando a informação apareceu antes de a pessoa terminar.
- **Duas respostas em paralelo** no modelo local: a pergunta que chega enquanto a anterior ainda está sendo escrita não
  espera na fila (medido: 1ª palavra ~1,4 s em vez de 3,5–5,2 s).

## Por que é um uso inteligente do Jev (e do modelo local)
- **O gargalo de um copiloto é saber QUANDO falar — e o QUE foi dito.** Um LLM para decidir isso a cada frase seria lento
  e caro; o Jev responde ~20 perguntas tipadas numa chamada de ~0,3 s por ~US$ 0,0001, inclusive "este 'toque' é
  tokens?" e "o rascunho ainda serve?". Ele segura a maioria das falas ("🤫 Jev não interrompeu") e só aciona a IA local
  quando vale — nos testes, 12 de 12 momentos que pediam ajuda e 2 alarmes discutíveis.
- **O Jev escolhe, não escreve:** ele escolhe *qual linha do OCR é a pergunta* (uma pergunta sim/não por linha, até 44
  numa chamada) e *qual fato do contexto responde* — assim o fato aparece na hora e a IA local recebe só o que importa.
- **O modelo local é o recurso escasso** (CPU do VPS, 2 vagas). O Jev decide, o modelo local escreve, e o prefixo da
  próxima resposta provável é processado nas vagas livres (e cancelado se uma resposta de verdade precisar da vaga).
  O histórico vai ao modelo numa janela que começa em múltiplos de 10 falas, para o cache continuar valendo em
  conversas longas. Na partida, os contextos prontos são aquecidos; ao abrir a página ou trocar de contexto, o seu.
- **Fila por aba para o Jev:** as chamadas de uma mesma aba vão em fila no servidor porque, medido em produção, chamadas
  sobrepostas ficam ~3× mais lentas (mediana 950 ms × 280 ms); a análise parcial é dispensada quando já há outra em
  curso, e a espera tem teto de 600 ms (num trecho de 23/09 o Jev levou 1,5–3,6 s por chamada; sem o teto, o atraso se
  acumulava fala após fala).
- **Custos:** Jev ~US$ 0,0001 por fala, ~US$ 0,00015 por tela; modelo local e Whisper US$ 0.

## Perguntas enviadas ao Jev (ver `politica.mjs`)
**Escuta — 1 chamada por fala final, até 4 nas parciais e 1 na revisão do Whisper, ~20 perguntas.** Estado: cena,
papéis, resumo do contexto, os termos que você usa, aviso de que a fala vem de transcrição automática, últimas 6 falas
(rotuladas com o que o próprio Jev decidiu), pergunta pendente, a fala atual (com os termos suspeitos marcados) e, na
conferência, o início da fala em que o rascunho se baseou.

| id | tipo | critérios |
|---|---|---|
| `quem_fala` | choice | `voce` / `outra_pessoa`, descritos pelos papéis do contexto |
| `momento` | choice (8) | pergunta pra você · objeção ou reclamação · termo técnico · tarefa ou prazo · decisão · dado importante · você conduzindo · conversa social |
| `precisa_ajuda` | noul | mostrar uma sugestão AGORA ajudaria sem atrapalhar? |
| `ajuda` | choice (5) | responder · contornar · explicar termo · só anotar · nada |
| `fato` | choice (até 14 + nenhum) | qual fato do seu contexto responde ao que foi dito (≥ 0,45 aparece no card) |
| `aj1…aj4` | choice (2) | para cada termo suspeito: manter a palavra ouvida × trocar pelo termo técnico (≥ 0,7 troca) |
| `rascunho_serve` | noul | (só na conferência) a resposta preparada com o início da fala continua certa para a fala completa? |
| `urgencia` | score 0–3 | nenhuma → alta |
| `tom` | choice (5) | consultivo · confiante · empático · técnico · objetivo |
| `modo` | choice (6) | vendas · reunião de equipe · atendimento · entrevista · aula · conversa informal |
| `sentimento` | score 0–4 | humor da outra pessoa |
| `tem_termo` | noul | sigla/jargão que vale explicar para quem é Você |
| `importante` | noul | vai para as notas? |
| `dono_tarefa` | choice (4) | você · outra pessoa · os dois · nenhum |
| `respondeu` | noul | (só com pergunta pendente) a fala atual responde à pendente? → card "✓ você respondeu" |
| `cob_*` | noul × 6 | cobertura do modo (ex.: vendas: dor, impacto, quem decide, orçamento, prazo, próximo passo) |

Regras no código (limiares em `LIMIAR`): escreve quando `precisa_ajuda ≥ 0,6`; pergunta dirigida a você com `momento ≥ 0,5`
escreve já com `≥ 0,45`; termo técnico com `tem_termo ≥ 0,7`; entre 0,4 e o limiar, **oferece** (card "Talvez valha", você
decide); abaixo, silêncio. Rascunho na fala parcial só com sinal forte (`momento ≥ 0,55` ou `precisa_ajuda ≥ 0,7`) e uma
vez por fala. Pergunta/objeção dita por você mesmo não gera ajuda.

**Tela — OCR + 1 chamada (6 a 7 perguntas + 1 por linha, até 44 linhas).** Estado: cena, papel de Você, contexto, linhas
com id e posição (`esquerda, topo`…), últimas 3 falas. Perguntas: `tipo_tela` (10), `acao` (8: rascunhar resposta,
responder perguntas, explicar o erro, resumir, explicar, traduzir, extrair dados, nada), `vale_sugerir` (noul),
`idioma`, `tom`, `ligada_a_conversa` (noul), `remetente` (choice entre as próprias linhas: qual mostra o nome de quem
escreveu — assim o rascunho cumprimenta a pessoa certa sem o modelo inventar nome) e `l01…lNN` (noul: conteúdo importante
ou interface/ruído?). Em chat e e-mail, linhas da coluna da esquerda (lista de conversas, menu) só entram com ≥ 0,9.

**Rota — pergunta livre e ⌘↵, 5 perguntas.** `fonte` (tela · conversa · seu contexto · conhecimento geral), `formato`,
`tamanho` (score 0–3 → teto de tokens), `idioma`, `tom`. Com fonte "contexto" ou "geral" o prompt é mínimo (só a pergunta).
Fora de "conhecimento geral", o pedido manda não inventar: sem o dado, a resposta diz que ele não está e escreve
"Confirme: …" (medido: sem a regra, o 4B respondia "prazo de 30 dias" com o contexto vazio; com ela, 3/3 pedem para
confirmar e as respostas com o dado no contexto continuam certas).

| modelo | leitura do prompt | escrita | observação |
|---|---|---|---|
| Qwen3-30B-A3B-Instruct-2507 Q4_K_M (o local que já existia) | 36–62 tok/s | 16–24 tok/s | ótimo texto, mas 1.300 tokens de contexto = **20,7 s** até a 1ª palavra |
| **Qwen3-4B-Instruct-2507 Q4_K_M (escolhido)** | **98–121 tok/s** | **22–31 tok/s** | melhor qualidade entre os pequenos nas 5 tarefas de copiloto em pt-BR |
| LFM2-2.6B Q4_K_M | 158–172 tok/s | 51–56 tok/s | o mais rápido, mas inverteu fatos ("não integra com o Clinicorp") e errou contas |
| Granite-4.0-H-Tiny Q4_K_M | 111–164 tok/s | 42–51 tok/s | bom, prolixo |
| Gemma-3-4B-it Q4_K_M | 98–120 tok/s | 25–29 tok/s | bom, errou a conta do plano anual |
| Qwen3-VL-2B / 4B (com visão) | 76–213 tok/s | 20–40 tok/s | ler uma captura 1440×900 levou **21–33 s** no CPU → OCR + texto é 10–20× mais rápido |

Serviço `llm-fast` (gerado por `deploy/gen.mjs` a partir de `deploy/llm.json`): `-t 6 -tb 8 -fa on -cram 2048 -c 8192
-np 2 -kvu` (6 threads escrevem tão rápido quanto 8; flash attention ~+10%; Q4_0 e IQ4_NL não foram mais rápidos que
Q4_K_M). Com o prefixo no cache, cada resposta processa só ~50–90 tokens novos: 1ª palavra em ~0,6–1,4 s (sem cache, ~5 s).

**2 vagas × 1 (pergunta B chegando 1,2 s depois de A, 5 rodadas com perguntas diferentes):**
| | 1ª palavra de B depois que ela chegou | escrita |
|---|---|---|
| 1 vaga (fila) | 3,5–5,2 s (espera A acabar) | 21–23 tok/s |
| **2 vagas (`-np 2 -kvu`)** | **1,3–1,4 s** | ~12 tok/s cada (ainda mais rápido que a leitura) |

Cuidado medido: com o servidor frio, duas respostas simultâneas leem o prompt inteiro ao mesmo tempo (5,8 s e 11 s até a
1ª palavra), e a vaga que não foi aquecida não aproveita o cache da outra (6,8 s × 0,6 s). Por isso o aquecimento roda
em todas as vagas livres, e o app aquece os 5 contextos prontos na partida (15 s depois que o modelo sobe).
Whisper e modelo local disputam a mesma CPU: juntos, o Whisper vai de 2,9 s para 4,9–5,3 s e a escrita de 16–17 para
10–12 tok/s. Os prompts proíbem inventar números e fazer contas; o 4B ainda erra conta às vezes (limitação conhecida).

## Medido
**Qualidade do Jev (`node apps/cluely/test/avaliar.mjs`, 4 roteiros, 53 falas, ~US$ 0,005):** nos 3 roteiros originais,
quem falou **39/40**; momento 34/40 (os erros são vizinhos: "dado importante" × "você conduzindo"); ajuda automática:
**12 de 12** momentos do gabarito, 2 alarmes extras discutíveis, 26 silêncios corretos. No roteiro "Consultoria de IA"
(13 falas com os erros reais do reconhecimento de voz): quem falou 13/13, momento 13/13, 5 ajudas certas, 1 alarme
extra, 0 perdidas e todas as trocas de termos certas.

**Telas (`node apps/cluely/test/avaliar_tela.mjs`):** 4/4 telas com tipo e ação certos (e-mail → rascunhar resposta 96–98%,
chat → rascunhar 91–97%, código → explicar o erro 100%, slide → extrair dados/resumir); as 3 perguntas do e-mail marcadas
com 0,98; menus e barra lateral ficam de fora. OCR: 0,5–0,9 s no Mac, 0,6–2,4 s no VPS.

informação (fato do contexto ou 1ª palavra do rascunho) apareceu **antes de a pessoa terminar** em 6 de 6 ajudas, de
0,03 a 2,3 s antes; a 1ª palavra da IA saiu com mediana de **0,25 s** depois do fim da frase (com 1 vaga, a pergunta
que vinha logo depois de outra esperava ~4 s). 2 dos 7 rascunhos foram trocados por uma versão nova — nos dois, com
razão: o começo da frase pedia explicar um termo e o fim era uma objeção ou uma pergunta.

**Produção, versão com rascunho + largada antecipada + 2 vagas (2026-09-23 à noite, navegador no Brasil → VPS em Boston,
reuniões simuladas em velocidade NORMAL, com o Jev lento nessa hora: p50 ~0,66 s no navegador):**
| roteiro | informação na tela antes do fim da frase | 1ª palavra da IA depois do fim da frase |
|---|---|---|
| Venda (6 ajudas) | **6 de 6** (4 delas 1,3–1,6 s antes) | **mediana 0,75 s**; em 2 a 1ª palavra saiu antes de a pessoa terminar |
| Consultoria de IA (6 ajudas, termos em inglês) | **5 de 6** | **mediana 0,47 s** (1 ponto fora: 5 s, logo depois de uma versão nova) |

Na simulação em 2× (falas curtas demais para o rascunho) a mediana fica em 2,1–2,4 s com o Jev nessa lentidão.
O e2e de produção passou inteiro (0 falhas), com a bolha revisada pelo Whisper em 4,2 s.

| medida | valor |
|---|---|
| decisão do Jev depois do fim da fala | p50 **255–279 ms** no servidor (p90 1,3–1,8 s: a latência do Jev oscila); **p50 0,52–0,59 s** medido no navegador |
| 1ª palavra da ajuda depois do fim da pergunta | **p50 1,25–1,42 s** no navegador (0,95–2,1 s, simulação em 2×, Jev a ~0,27 s) |
| modelo local (servidor) | 1ª palavra 0,76–1,07 s lendo só 51–89 tokens novos (500–790 vêm do cache) · escrita 20–22 tok/s |
| tela de e-mail | OCR 1,6 s (1ª vez; depois vem do cache) · Jev 0,29 s · 7 de 17 linhas importantes |
| janela flutuante | "O que eu digo?" clicado lá dentro: 1ª palavra 0,72 s |
| custo | a rodada completa do e2e (44 chamadas, 751 decisões): **US$ 0,0048** |

No Mac (dev, gateway local e túnel para o `llm-fast`) os números são piores: Jev p50 0,37–1,2 s e 1ª palavra ~2,2 s.
O e2e confere a conversa, o roteiro de IA (termos corrigidos e destacados, fato do contexto, informação antes do fim da
frase, rascunho conferido), ações, telas, rota (inclusive "sem o dado, não inventa"), ⌘↵, janela flutuante, inspetor,
microfone falso, **transcrição revisada pelo Whisper** (áudio falso de verdade + reconhecimento "errando"), celular e
zero erros de console/HTTP.

## Roteiro de 60 s para o vídeo
1. (0 s) Abrir o link: "Vê sua tela, ouve a conversa e sopra a resposta na hora".
2. (3 s) **🎬 Consultoria de IA** (2× para encurtar). A conversa rola com a transcrição "errada" do navegador ("n oito n",
   "toque", "cloud code") e os termos vão sendo corrigidos e destacados; cada bolha nasce no meio ("Jev decidindo quem
   falou…") e vai para o lado certo.
3. (~10 s) "Quanto custa por milhão de toque na API da open ai?" → o card aparece **antes do fim da frase** com o fato
   do contexto (📌 R$ 0,02 por conversa) e o rascunho sendo escrito; no fim: "✓ confirmado com a frase completa".
4. (~30 s) Clicar **⧉ Flutuar**: o copiloto vira uma janela por cima de tudo — arrastar para cima de uma chamada de vídeo.
5. (~38 s) **📧 E-mail** nos exemplos: a tela é varrida, as caixas acendem nas 3 perguntas (o Jev escolheu 7 de 17
   linhas) e o **rascunho de resposta** sai com os fatos do contexto.
6. (~50 s) **🧾 Resumo** / **✉️ E-mail** do fim da reunião. Fechar com **🩻 Raio-X** e **🔍 Ver o que o Jev vê**.
Atalhos de link: `?sim=ia`, `?sim=vendas`, `?sim=reuniao`, `?sim=atendimento`, `?tela=email` (ou `whatsapp`, `codigo`, `slide`).

## Arquivos
- `server.mjs` — `/api/config`, `/api/stats`, `/api/local`, `POST /api/escuta` (SSE: ajuste → decisão do Jev → rascunho
  ou conferência → texto da IA local no mesmo stream; 150/min por IP), `POST /api/transcrever` (áudio da fala → Whisper
  → texto; 90/min), `POST /api/preparar` (aquece o contexto no modelo local; 30/min), `POST /api/tela` (OCR + Jev;
  30/min), `POST /api/escrever` (SSE; ações, pergunta livre, ⌘↵; 40/min). Tetos por aba: 1.500 falas analisadas, 120
  textos, 80 telas, 600 transcrições.
- `politica.mjs` — as perguntas do Jev, os limiares, os rótulos, os fatos do contexto e os prompts do modelo local.
- `public/lib/ajuste.mjs` — a camada de ajuste de contexto (glossário, candidatos para o Jev, termos do usuário), usada
  no navegador e no servidor.
- `stt.mjs` — cliente do Whisper (prompt de contexto, filtro de alucinações, fila de 1).
- `llm-rapido.mjs` — cliente do modelo local: até `FAST_LLM_PARALLEL` gerações, aquecimento nas vagas livres, métricas.
- `ocr.mjs` — Tesseract (TSV → linhas com posição), cache por hash, itens para o Jev.
- `data/roteiros.json` (4 reuniões com gabarito), `data/contextos.json` (5 contextos, com os termos de cada um).
- `public/` — `index.html`, `style.css`, `js/app.js` (palco, copiloto, Raio-X, janela flutuante), `js/voz.js`
  (microfone, aba, gravação dos últimos ~40 s, simulação), `js/tela.js` (captura, quadro, detecção de mudança, caixas),
  `js/sse.js`, `telas/` (4 telas de exemplo).
- `tools/gerar_telas.py` + `tools/telas/*.html` — fonte das telas de exemplo.
  ajuste sobre as transcrições reais do Chrome), `test/avaliar_tela.mjs`, `test/avaliar_llm.mjs`, `test/asr/` (corpus
  de 26 frases, transcrições do Chrome e o áudio usado no e2e).

## Deploy
- Imagem própria `deploy/Dockerfile.cluely` (Node 22 + `tesseract-ocr` + `por`/`eng`), 768 MB / 2 CPUs.
- Serviço `llm-fast` no compose (`deploy/llm.json` → `fast`, `parallel: 2`), modelo em
  `/opt/models/qwen3-4b-instruct-2507-q4km.gguf`, porta 8089 só no localhost do VPS.
- Serviço `stt` (`deploy/llm.json` → `stt`): whisper.cpp com `/opt/models/whisper/ggml-small-q5_1.bin`, 6 threads, 2 GB,
  porta 8090 só no localhost do VPS.
- Segredo: `ELEVENLABS_API_KEY` em `/etc/jev/cluely.env` no VPS (só este contêiner lê; `apps.json` → `env_file`).
- Variáveis (em `apps.json` → `env`): `FAST_LLM_URL=http://llm-fast:8080/v1`, `FAST_LLM_MODEL`, `FAST_LLM_LABEL`,
  `FAST_LLM_PARALLEL=2` (igual ao `-np` do servidor), `STT_URL=http://stt:8080/inference`.
  Opcionais: `SIM_LIVE_PER_IP_HOUR` (160), `FAST_LLM_MAX_QUEUE` (6), `STT_CONCURRENCY` (1), `OCR_CONCURRENCY` (2),
  `OCR_LANGS` (`por+eng`), `JEV_QUEUE_WAIT_MS` (600).
- Local: `PORT=4119 node apps/cluely/server.mjs` (gateway em :8787 e túneis `ssh -L 8089:127.0.0.1:8089 -L
  8090:127.0.0.1:8090 root@<IP_DA_VPS>`).

## Limitações
- Microfone e áudio de aba exigem Chrome/Edge no computador; Safari tem microfone, mas não transcreve áudio de aba;
  Firefox não tem reconhecimento de voz (use simulação ou texto).
- A janela flutuante (Document Picture-in-Picture) é do Chrome/Edge ≥ 116 no computador.
- A transcrição do microfone e da aba usa a conta ElevenLabs (Scribe v2 Realtime, ~US$ 0,39 por hora de áudio). Sem a
  chave, volta o reconhecimento do navegador, que perde falas e erra termos (ver a tabela acima).
- O modelo local escreve 2 respostas por vez para todo mundo: com vários usuários ao mesmo tempo, a resposta espera na
  fila ("na fila: 2º"). Respostas automáticas velhas da mesma aba são substituídas pela mais nova; pedidos seus nunca.
- O OCR lê texto; em tela escura ou letra muito pequena ele perde linhas. Imagens sem texto não são entendidas.
- Empresa, produto (Atendix), preços, pessoas e telas de exemplo são fictícios.

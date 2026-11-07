// Slides que Seguem a Sua Fala — você apresenta falando e os slides seguem você, sem clicar: a cada pausa da fala, UMA
// chamada ao Jev decide de qual slide você está falando, quais tópicos do slide você já cobriu e se você pediu
// "próximo", "volta um" ou "vai pro slide 5". Para adaptar: cole o seu deck na tela (markdown: "# título" e "- tópico")
// ou troque os DECKS abaixo pelos seus; os limiares ficam em "limiar" e a regra da troca, em palco.js (decidirTroca).

// Cada slide: kicker (a linha pequena de cima), título, emoji grande, assunto (o que ele cobre, em palavras simples:
// ajuda o Jev a reconhecer a fala solta) e 3 ou 4 tópicos. O último slide é o resumo ("vamos pro resumo").
const DECKS = {
  'erros-ia': {
    id: 'erros-ia', titulo: '5 erros de quem começa a usar IA no trabalho', curto: '5 erros com IA', emoji: '🤖',
    slides: [
      { kicker: 'Palestra rápida', titulo: '5 erros de quem começa a usar IA no trabalho', emoji: '🤖',
        assunto: 'abertura da palestra: cumprimentar, apresentar o tema dos 5 erros e perguntar quem já usa IA',
        topicos: ['Quase todo mundo já testou IA', 'Pouca gente usa de verdade no dia a dia', 'Os erros são sempre os mesmos', 'Dá para evitar cada um deles'] },
      { kicker: 'Erro 1 de 5', titulo: 'Pedir sem dar contexto', emoji: '🎯', apelido: 'o slide do contexto',
        assunto: 'pedido vago para a IA, sem dizer quem é o cliente, o objetivo, o público e o tom, e sem exemplo',
        topicos: ['A IA não sabe quem é você nem o seu cliente', 'Diga o objetivo, o público e o tom', 'Mostre um exemplo do resultado que quer', 'Pedido curto, resposta genérica'] },
      { kicker: 'Erro 2 de 5', titulo: 'Aceitar a primeira resposta', emoji: '🔁', apelido: 'o slide da primeira resposta',
        assunto: 'usar a primeira versão que a IA devolve, sem pedir ajustes nem conversar',
        topicos: ['A primeira resposta é só um rascunho', 'Peça ajustes: mais curto, mais direto', 'Converse em vez de perguntar uma vez só', 'Peça 3 versões e escolha a melhor'] },
      { kicker: 'Erro 3 de 5', titulo: 'Não conferir os fatos', emoji: '🔍', apelido: 'o slide de conferir os fatos',
        assunto: 'a IA inventa números, nomes, estudos e leis; conferir antes de usar',
        topicos: ['A IA inventa com toda a confiança', 'Número, nome e lei: sempre confira', 'Peça a fonte e abra o link', 'Quem assina o texto é você'] },
      { kicker: 'Erro 4 de 5', titulo: 'Colar dados sigilosos', emoji: '🔒', apelido: 'o slide dos dados sigilosos',
        assunto: 'privacidade: colar contrato, CPF, senha, dados de cliente ou segredos da empresa no chat da IA',
        topicos: ['Contrato, CPF e senha não vão no chat', 'Use a versão empresarial da ferramenta', 'Troque nomes reais por apelidos', 'Siga a política da sua empresa'] },
      { kicker: 'Erro 5 de 5', titulo: 'Querer automatizar tudo de uma vez', emoji: '🐢', apelido: 'o slide de automatizar tudo',
        assunto: 'começar grande demais: automatizar a empresa inteira em vez de uma tarefa por vez',
        topicos: ['Comece por uma tarefa chata e repetida', 'Meça o tempo antes e depois', 'Um processo novo por mês', 'Leve o time junto'] },
      { kicker: 'Resumo', titulo: 'Para começar amanhã', emoji: '🏁',
        assunto: 'o resumo final: recapitular os cinco erros de uma vez, em poucas palavras, e encerrar a palestra',
        topicos: ['Contexto e exemplo em todo pedido', 'Converse e revise antes de enviar', 'Dado sigiloso fica fora', 'Uma tarefa de cada vez'] },
    ],
  },
  'whatsapp-ia': {
    id: 'whatsapp-ia', titulo: 'Como vender pelo WhatsApp com IA', curto: 'Vender no WhatsApp', emoji: '💬',
    slides: [
      { kicker: 'Palestra rápida', titulo: 'Como vender pelo WhatsApp com IA', emoji: '💬',
        assunto: 'abertura da palestra: cumprimentar, apresentar o tema e por que vender pelo WhatsApp',
        topicos: ['Seu cliente já está no WhatsApp', 'A venda se perde no meio de tanta conversa', 'A IA faz o repetitivo; você, a relação', '5 passos para começar hoje'] },
      { kicker: 'Passo 1 de 5', titulo: 'Responda em segundos', emoji: '⚡', apelido: 'o slide de responder rápido',
        assunto: 'velocidade de resposta: quem espera vai embora; boas-vindas e respostas automáticas',
        topicos: ['Quem espera compra do concorrente', 'Boas-vindas automática na hora', 'Respostas prontas para as dúvidas comuns', 'Avise o horário de atendimento'] },
      { kicker: 'Passo 2 de 5', titulo: 'Organize com etiquetas', emoji: '🏷️', apelido: 'o slide das etiquetas',
        assunto: 'organizar os contatos por etapa da venda com etiquetas e ver todo mundo num relance',
        topicos: ['Uma etiqueta para cada etapa da venda', 'Cada etiqueta tem uma próxima ação', 'A IA sugere a etiqueta pela conversa', 'Veja o funil inteiro num relance'] },
      { kicker: 'Passo 3 de 5', titulo: 'Catálogo na conversa', emoji: '🛍️', apelido: 'o slide do catálogo',
        assunto: 'mostrar os produtos: mandar foto, preço e link do catálogo em vez de digitar tudo, e a IA respondendo com o catálogo',
        topicos: ['Foto, preço e descrição em cada produto', 'Mande o link em vez do textão', 'A IA responde usando o catálogo', 'Tire a dúvida antes da pergunta'] },
      { kicker: 'Passo 4 de 5', titulo: 'Recupere quem sumiu', emoji: '🪃', apelido: 'o slide de quem sumiu',
        assunto: 'retomar o cliente que parou de responder, sem ser chato',
        topicos: ['Retome depois de 2 dias', 'Lembre o que a pessoa queria', 'Ofereça ajuda, não pressão', 'Pare depois de 2 tentativas'] },
      { kicker: 'Passo 5 de 5', titulo: 'Feche na própria conversa', emoji: '💳', apelido: 'o slide de fechar a venda',
        assunto: 'fechar a venda no WhatsApp: pagamento, confirmação do pedido, entrega e avaliação',
        topicos: ['Link de pagamento ou Pix na hora', 'Confirme o pedido por escrito', 'Avise cada etapa da entrega', 'Peça a avaliação depois'] },
      { kicker: 'Resumo', titulo: 'Os 5 passos', emoji: '🏁',
        assunto: 'o resumo final: recapitular todos os passos de uma vez, em poucas palavras, e encerrar a palestra',
        topicos: ['Responda rápido e organize', 'Mostre o catálogo', 'Retome quem sumiu', 'Feche na conversa'] },
    ],
  },
};

// ---------- funções puras (rodam no servidor e no navegador) ----------
const limpa = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const fim = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };

// deck colado pela pessoa: só texto, até 12 slides de até 5 tópicos (o resto é cortado)
function deckColado(x) {
  if (!x || typeof x !== 'object') return null;
  const slides = (Array.isArray(x.slides) ? x.slides : []).slice(0, 12).map((s) => ({
    titulo: limpa(s && s.titulo, 90),
    topicos: (Array.isArray(s && s.topicos) ? s.topicos : []).slice(0, 5).map((t) => limpa(t, 100)).filter(Boolean),
  })).filter((s) => s.titulo);
  if (slides.length < 2) return null;
  return { id: 'proprio', titulo: limpa(x.titulo, 90) || slides[0].titulo, slides };
}
const deckDe = (d) => DECKS[d && d.deck_id] || deckColado(d && d.deck) || DECKS['erros-ia'];
const atualDe = (d, deck) => Math.max(0, Math.min(deck.slides.length - 1, Math.round(+(d && d.atual) || 0)));

// uma opção por slide do deck (lista fechada: o Jev nunca escolhe um slide que não existe) + manter.
// A capa (slide 1) só entra quando você está nela: medido, fala genérica sobre o tema ("a IA hoje tá em todo lugar")
// puxava para a capa com 57–68%. Para voltar a ela, peça: "volta lá no começo".
function opcoesSlide(deck, atual = 0) {
  const n = deck.slides.length;
  return [
    ...deck.slides.map((s, i) => (i === 0 && atual > 0 ? null : {
      id: 's' + (i + 1),
      desc: `Slide ${i + 1} de ${n}${s.kicker ? ` (${s.kicker})` : ''}: «${s.titulo}».${s.assunto ? ` Assunto: ${s.assunto}.` : ''}${s.topicos.length ? ` Tópicos: ${s.topicos.join('; ')}.` : ''}`,
    })).filter(Boolean),
    { id: 'manter', desc: 'nenhum slide: conversa solta, piada, cumprimento, pergunta à plateia, hesitação ("deixa eu ver", "é…"), comentário sobre a própria apresentação, ou um pedido sem assunto ("próximo", "volta um")' },
  ];
}

// o pedido: 4 comandos fixos + "ir ao slide N" para cada slide do meio (a capa é "começo"; o último, "resumo") + nenhum
const PEDIDOS = [
  { id: 'avancar', rotulo: 'Próximo slide', icone: '⏭️', desc: 'ir para o PRÓXIMO slide, sem dizer qual: "próximo", "próximo slide", "pode passar", "passa", "vamos em frente", "pula esse"' },
  { id: 'voltar', rotulo: 'Voltar um', icone: '⏮️', desc: 'voltar UM slide, sem dizer qual: "volta um", "volta o slide", "slide anterior", "voltando um pouquinho"' },
  { id: 'inicio', rotulo: 'Ir para o começo', icone: '⏪', desc: 'ir para o começo, a capa ou o primeiro slide: "volta lá no começo", "voltando lá no começo", "voltando ao início", "primeiro slide"' },
  { id: 'resumo', rotulo: 'Ir para o resumo', icone: '⏩', desc: 'ir para o resumo, o fim ou o último slide: "vamos pro resumo", "pula pro final", "último slide", "pra fechar, o resumo"' },
];
const NENHUM = { id: 'nenhum', rotulo: 'Nenhum pedido', icone: '🗣️', desc: 'nenhum pedido de troca: só explicando, contando um caso, brincando, perguntando à plateia ou citando outro slide sem pedir para ir' };
function opcoesPedido(deck) {
  const n = deck.slides.length;
  const ir = deck.slides.map((s, i) => (i === 0 || i === n - 1 ? null : {
    id: 'ir_s' + (i + 1), rotulo: `Ir ao slide ${i + 1}`, icone: '🎯',
    desc: `pede para ir ao slide ${i + 1}${s.kicker ? ` (${s.kicker})` : ''}, «${s.titulo}», pelo número, pelo nome ou pelo assunto: "vai pro slide ${i + 1}", "vamos pro slide «${s.titulo}»"${s.apelido ? `, "volta no ${s.apelido.replace(/^o /, '')}"` : ''}${s.kicker ? `, "agora o ${s.kicker.toLowerCase().replace(/ de \d+$/, '')}"` : ''}`,
  })).filter(Boolean);
  return [...PEDIDOS, ...ir, NENHUM];
}

export default {
  id: 'slides-seguem',
  titulo: 'Slides que Seguem a Sua Fala',
  emoji: '🎞️',
  categoria: 'ao-vivo',
  ordem: 0.8,
  resumo: 'Apresente sem clicar: o slide certo aparece quando você fala dele, e cada tópico acende quando você o menciona.',
  descricao: 'Você apresenta falando e, a cada pausa, uma chamada só decide em ~0,35 s de qual slide você está falando, quais tópicos você já cobriu (eles acendem com marca-texto) e se você pediu "próximo", "volta um" ou "vai pro slide 5". O slide só troca acima de 70% de confiança (medido: saltos de verdade vêm com 97–100%; piada, "deixa eu ver" e conversa solta caem em "manter") e a escolha é numa lista fechada: nunca vai para um slide que não existe. Para adaptar, cole o seu deck em markdown (# título e - tópico) ou troque os DECKS no topo do app.config.mjs.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#6366f1', acento2: '#22d3ee' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone e apresente com as suas palavras, sem ler o slide. Pule para outro assunto ("e tem gente que cola o contrato do cliente inteiro no chat…"), conte uma piada, diga "próximo" ou "volta lá no começo".',
  },
  decks: DECKS,
  // quando a tela troca sozinha (medido com o Jev de verdade; ver os testes)
  // slide: confiança para trocar pelo assunto (medido: saltos de verdade 97–100%; fala genérica até 52–68%).
  // saidaResumo: no resumo a pessoa recapitula cada slide ("contexto e exemplo em todo pedido" puxava para o slide 2
  // com 73%), então de lá só se sai por pedido ou com assunto muito claro. topico: medido, sim ≥ 73%, não ≤ 72%.
  // concorda: "volta no slide do contexto" deu pedido ir_s2 56–73% e assunto s2 53–86% (medido 8×); quando as duas
  // perguntas independentes apontam o mesmo slide com ≥ 50%, a troca vale.
  // manterMax: piada que encosta no assunto de outro slide divide a chance com "manter" (a do tio, que pulou com 73%,
  // tinha 27% de manter); nos saltos de verdade, manter fica em ≤ 3%. Acima disso, o slide fica.
  limiar: { slide: 0.7, saidaResumo: 0.9, manterMax: 0.2, minimoPalavras: 4, pedido: 0.7, concorda: 0.5, topico: 0.75 },
  contexto: {
    app: 'apresentação de slides comandada pela voz: a pessoa fala ao vivo e os slides seguem a fala',
  },
  decisoes: [
    {
      id: 'slide', tipo: 'choice', titulo: 'De qual slide você está falando',
      pergunta: 'Apresentação de slides comandada pela voz: a pessoa fala ao vivo, com as próprias palavras, e o slide certo precisa aparecer sozinho. De qual slide ela está falando AGORA? Leia "fala_recente" (o que ela disse desde a última troca de slide; o fim é o mais novo). Escolha o slide cujo ASSUNTO ela está explicando: com outras palavras, um exemplo, um caso ou uma história também vale, ela não precisa ler o título. Se ela pediu um slide pelo número, pelo nome ou pelo assunto ("vai pro slide 5", "agora o quarto erro", "volta no slide do contexto"), escolha esse slide. Se ela mudou de assunto no meio, ou se corrigiu ("não, pera…"), vale o último assunto. Piada, brincadeira ou historinha engraçada contada de passagem é manter, mesmo que lembre o assunto de outro slide; um caso ou exemplo que EXPLICA o assunto de um slide vale como esse slide. Escolha manter também quando a fala não entra no assunto de nenhum slide: conversa solta, piada, cumprimento, pergunta para a plateia, "deixa eu ver", "é…", comentário sobre a própria apresentação, ou um pedido sem assunto ("próximo", "volta um").',
      opcoes: opcoesSlide(DECKS['erros-ia']),
    },
    {
      id: 'pedido', tipo: 'choice', titulo: 'Pedido à apresentação',
      pergunta: 'Apresentação de slides comandada pela voz. A pessoa fez um PEDIDO DIRETO para a apresentação trocar de slide AGORA? Leia "fala_recente" (o fim é o mais novo). Vale pedido falado para a apresentação ("próximo", "pode passar", "volta um", "vamos pro resumo"). "Volta lá no começo" e "voltando lá no começo" contam como pedido de ir ao começo, mesmo quando ela continua a frase depois. Se ela pediu um slide específico pelo número, pelo nome ou pelo assunto ("vai pro slide 5", "agora o quarto erro", "volta no slide do contexto"), escolha o "ir ao slide" dele. Citar um slide sem pedir para ir ("como eu falei no começo", "mais pra frente eu mostro") é nenhum. Se ela se corrigiu ("próximo… não, pera"), vale o que disse por último.',
      opcoes: opcoesPedido(DECKS['erros-ia']),
    },
    {
      id: 'topico', tipo: 'noul', titulo: 'Tópico já falado', rotulo: 'já falou', limiar: 0.75,
      pergunta: 'Apresentação de slides comandada pela voz. A pessoa JÁ FALOU do tópico abaixo, neste slide? Leia "fala_no_slide" (tudo o que ela disse desde que este slide apareceu). SIM quando a ideia do tópico apareceu na fala, mesmo com outras palavras, num exemplo ou num caso: ela não precisa repetir as palavras do slide. NÃO quando a ideia ainda não apareceu, quando ela falou de outro tópico parecido, ou quando só prometeu falar disso depois ("daqui a pouco eu falo de…").',
    },
  ],
  jogadas: {
    // a cada pausa da fala: qual slide (lista fechada + manter), qual pedido e um sim/não por tópico ainda apagado
    ouvir: {
      // o estado NÃO diz qual slide está na tela: medido, com "slide_atual" o Jev puxava para o slide atual e os saltos
      // caíam para 57–77%; sem ele, 97–100% (e a conversa solta continua em "manter")
      estado: (d) => ({
        apresentacao: deckDe(d).titulo,
        fala_recente: fim(d.fala_recente, 420),
        fala_no_slide: fim(d.fala_no_slide || d.fala_recente, 900),
      }),
      perguntas: (d) => {
        const deck = deckDe(d); const i = atualDe(d, deck); const s = deck.slides[i];
        const q = [];
        if (String(d.fala_recente || '').trim()) {
          q.push({ chave: 'slide', decisao: 'slide', opcoes: opcoesSlide(deck, i) });
          q.push({ chave: 'pedido', decisao: 'pedido', opcoes: opcoesPedido(deck) });
        }
        const quais = Array.isArray(d.topicos) ? [...new Set(d.topicos.map(Number))].slice(0, 5) : s.topicos.map((_, j) => j);
        for (const j of quais) if (s.topicos[j]) q.push({ chave: 't' + j, decisao: 'topico', alvo: `Slide: «${s.titulo}». Tópico: «${s.topicos[j]}».` });
        return q;
      },
    },
  },
  // falas naturais e desorganizadas (NÃO o texto do slide). atual = índice do slide na tela (0 = capa).
  // "fica" = manter ou o próprio slide atual; os tópicos t0…t3 são os do slide atual.
  testes: [
    { titulo: 'abertura: quase todo mundo já testou', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 0, fala_recente: 'Bom dia, gente! Quem aqui já usou IA no trabalho? Pois é, quase todo mundo, né?', fala_no_slide: 'Bom dia, gente! Quem aqui já usou IA no trabalho? Pois é, quase todo mundo, né?' }, esperado: { slide: ['s1', 'manter'], pedido: 'nenhum', t0: true, t3: false } },
    { titulo: 'no assunto do slide 2: fica e acende', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'o primeiro erro, e esse eu vejo todo santo dia: a pessoa escreve só faz um e-mail pro cliente e pronto, e a IA não faz a menor ideia de quem é esse cliente', fala_no_slide: 'então, o primeiro erro, e esse eu vejo todo santo dia: a pessoa escreve só faz um e-mail pro cliente e pronto, e a IA não faz a menor ideia de quem é esse cliente' }, esperado: { slide: ['s2', 'manter'], pedido: 'nenhum', t0: true, t2: false } },
    { titulo: 'piada não troca de slide', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'gente, juro que esse slide não fui eu que fiz com IA, tá? kkkk brincadeira', fala_no_slide: 'gente, juro que esse slide não fui eu que fiz com IA, tá? kkkk brincadeira' }, esperado: { slide: ['manter', 's2'], pedido: 'nenhum' } },
    { titulo: '"deixa eu ver" não troca', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 2, fala_recente: 'deixa eu ver… onde é que eu tava… ah, sim', fala_no_slide: 'deixa eu ver… onde é que eu tava… ah, sim' }, esperado: { slide: ['manter', 's3'], pedido: 'nenhum' } },
    { titulo: 'pergunta à plateia não troca', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 3, fala_recente: 'alguém aqui já passou por isso? levanta a mão aí, sem vergonha', fala_no_slide: 'alguém aqui já passou por isso? levanta a mão aí, sem vergonha' }, esperado: { slide: ['manter', 's4'], pedido: 'nenhum' } },
    { titulo: 'fala genérica não pula para a capa', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'e a IA hoje tá em todo lugar, no celular, no e-mail, no editor de texto', fala_no_slide: 'e a IA hoje tá em todo lugar, no celular, no e-mail, no editor de texto' }, esperado: { slide: ['manter', 's2'], pedido: 'nenhum' } },
    { titulo: 'pula para o slide 5: contrato com CPF no chat', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'ah, e uma coisa que me dá arrepio: o pessoal pega o contrato do cliente, com CPF, endereço, tudo, e cola inteirinho no chat', fala_no_slide: 'ah, e uma coisa que me dá arrepio: o pessoal pega o contrato do cliente, com CPF, endereço, tudo, e cola inteirinho no chat' }, esperado: { slide: 's5', pedido: 'nenhum' } },
    { titulo: 'pula no fim de uma fala do slide 2', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'mandar um exemplo. e outra coisa que eu vejo muito: gente colando o contrato inteiro do cliente, com CPF e tudo, lá dentro do chat', fala_no_slide: 'a IA não sabe quem é o seu cliente, então você tem que explicar, dar o tom, mandar um exemplo. e outra coisa que eu vejo muito: gente colando o contrato inteiro do cliente, com CPF e tudo, lá dentro do chat' }, esperado: { slide: 's5', t2: true } },
    { titulo: 'pula sem dizer o título: ela inventa', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'e tem que tomar cuidado, porque às vezes ela fala com uma certeza… e tá tudo errado', fala_no_slide: 'e tem que tomar cuidado, porque às vezes ela fala com uma certeza… e tá tudo errado' }, esperado: { slide: 's4' } },
    { titulo: 'o quinto erro pelo assunto', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 2, fala_recente: 'agora, o quinto erro, que é o mais comum nas empresas: querer automatizar tudo de uma vez', fala_no_slide: 'agora, o quinto erro, que é o mais comum nas empresas: querer automatizar tudo de uma vez' }, esperado: { slide: 's6' } },
    { titulo: '"próximo"', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'beleza, próximo', fala_no_slide: 'beleza, próximo' }, esperado: { pedido: 'avancar', slide: ['manter', 's2'] } },
    { titulo: '"volta um"', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 3, fala_recente: 'volta um rapidinho', fala_no_slide: 'volta um rapidinho' }, esperado: { pedido: 'voltar' } },
    { titulo: '"voltando lá no começo" volta para a capa', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 4, fala_recente: 'voltando lá no começo, eu falei que quase todo mundo já testou, lembra?', fala_no_slide: 'voltando lá no começo, eu falei que quase todo mundo já testou, lembra?' }, esperado: { pedido: 'inicio' } },
    { titulo: '"vamos pro resumo"', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 2, fala_recente: 'pra fechar, vamos pro resumo', fala_no_slide: 'pra fechar, vamos pro resumo' }, esperado: { pedido: 'resumo', slide: ['s7', 'manter'] } },
    { titulo: '"vamos pro slide cinco"', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 1, fala_recente: 'vamos pro slide cinco', fala_no_slide: 'vamos pro slide cinco' }, esperado: { pedido: 'ir_s5' } },
    { titulo: '"agora o quarto erro"', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 2, fala_recente: 'agora o quarto erro', fala_no_slide: 'agora o quarto erro' }, esperado: { pedido: 'ir_s5' } },
    { titulo: 'citar o começo sem pedir', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 2, fala_recente: 'como eu falei lá no começo, todo mundo já testou, mas o problema aqui é outro: a primeira resposta não é a final', fala_no_slide: 'como eu falei lá no começo, todo mundo já testou, mas o problema aqui é outro: a primeira resposta não é a final' }, esperado: { pedido: 'nenhum', slide: ['s3', 'manter'], t0: true } },
    { titulo: 'tópicos: contrato, CPF e apelido', jogada: 'ouvir', dados: { deck_id: 'erros-ia', atual: 4, fala_recente: 'não cola o contrato, não cola o CPF de ninguém. se precisar, troca o nome do cliente por cliente A, cliente B', fala_no_slide: 'não cola o contrato, não cola o CPF de ninguém. se precisar, troca o nome do cliente por cliente A, cliente B' }, esperado: { slide: ['s5', 'manter'], t0: true, t1: false, t2: true, t3: false } },
    { titulo: 'WhatsApp: prometer não acende o tópico', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 1, fala_recente: 'daqui a pouco eu falo das respostas prontas, mas antes: o cliente que espera vai pro concorrente', fala_no_slide: 'daqui a pouco eu falo das respostas prontas, mas antes: o cliente que espera vai pro concorrente' }, esperado: { slide: ['s2', 'manter'], t0: true, t2: false } },
    { titulo: 'WhatsApp: pula para quem sumiu', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 1, fala_recente: 'e aquele cliente que perguntou o preço e sumiu? dá pra chamar de novo depois de uns dois dias, com jeitinho', fala_no_slide: 'e aquele cliente que perguntou o preço e sumiu? dá pra chamar de novo depois de uns dois dias, com jeitinho' }, esperado: { slide: 's5', pedido: 'nenhum' } },
    { titulo: 'WhatsApp: pula para o pagamento', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 2, fala_recente: 'e na hora de pagar, manda o link ou a chave Pix ali mesmo, sem mandar a pessoa pra outro lugar', fala_no_slide: 'e na hora de pagar, manda o link ou a chave Pix ali mesmo, sem mandar a pessoa pra outro lugar' }, esperado: { slide: 's6' } },
    { titulo: 'WhatsApp: a piada do tio não troca', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 1, fala_recente: 'o meu tio responde o WhatsApp com áudio de sete minutos, então ele não é um bom exemplo kkk', fala_no_slide: 'o meu tio responde o WhatsApp com áudio de sete minutos, então ele não é um bom exemplo kkk' }, esperado: { slide: ['manter', 's2'], pedido: 'nenhum' } },
    { titulo: 'WhatsApp: tópicos da retomada', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 4, fala_recente: 'passou dois dias, você manda: oi, Ana, você tinha perguntado do vestido azul, ainda tem interesse?', fala_no_slide: 'passou dois dias, você manda: oi, Ana, você tinha perguntado do vestido azul, ainda tem interesse?' }, esperado: { slide: ['s5', 'manter'], t0: true, t1: true, t3: false } },
    { titulo: 'WhatsApp: "vamos pro passo três"', jogada: 'ouvir', dados: { deck_id: 'whatsapp-ia', atual: 1, fala_recente: 'vamos pro passo três', fala_no_slide: 'vamos pro passo três' }, esperado: { pedido: 'ir_s4' } },
    { titulo: 'deck colado: pula para o preço', jogada: 'ouvir', dados: { atual: 1, deck: { titulo: 'Meu produto em 3 minutos', slides: [{ titulo: 'Meu produto em 3 minutos', topicos: ['O problema que a gente resolve', 'Para quem é', 'O que muda na prática'] }, { titulo: 'Como funciona', topicos: ['Você se cadastra em 1 minuto', 'Conecta a sua planilha', 'Recebe o relatório toda segunda'] }, { titulo: 'Quanto custa', topicos: ['Plano grátis para testar', 'Plano completo por mês', 'Cancele quando quiser'] }, { titulo: 'Resumo', topicos: ['Problema, solução e preço', 'Próximo passo: testar grátis'] }] }, fala_recente: 'e o preço? tem um plano grátis pra testar e você cancela quando quiser, sem multa', fala_no_slide: 'e o preço? tem um plano grátis pra testar e você cancela quando quiser, sem multa' }, esperado: { slide: 's3', pedido: 'nenhum' } },
  ],
};

// Conversação em Inglês — a cada fala do aluno (em inglês), o Jev estima o nível, aponta o erro principal e vê se ele respondeu.
// Para adaptar: troque o banco de perguntas (PASSOS: mesmo assunto em 3 versões, uma por faixa de nível) e as dicas (DICAS).

// banco de perguntas: cada passo é um assunto; as 3 versões perguntam a MESMA coisa, mais simples ou mais rica
const PASSOS = [
  { assunto: 'trabalho', A: 'Nice! What is your job?', B: 'Nice! What do you do for a living? Do you like it?', C: "Nice! What do you do for a living, and what's the most rewarding part of it?" },
  { assunto: 'comida', A: 'Do you like to cook? What do you cook?', B: 'Do you cook at home? What do you usually make?', C: 'How would you describe your cooking habits these days?' },
  { assunto: 'viagem', A: 'Do you like to travel? Tell me about a trip.', B: "What's the best trip you've ever taken?", C: 'Tell me about a memorable trip. What made it special?' },
  { assunto: 'planos', A: 'What are your plans for next weekend?', B: 'What are you planning to do next weekend?', C: 'Have you got anything planned for next weekend?' },
];
const ABERTURA = 'Hi! 😊 What did you do last weekend?';
const ABERTURA_SIMPLES = 'What did you do on Saturday and Sunday?';
const FIM = "Great chat! 👏 That's all for today. See you next time!";
const FAIXA = (n) => (n <= 1 ? 'A' : n === 2 ? 'B' : 'C');
const NOME_FAIXA = { A: 'A1–A2', B: 'B1', C: 'B2–C1' };
// dicas em português: texto nosso, escolhido pelo erro que o Jev apontou
const DICAS = {
  tempo_verbal: '💡 Tempo verbal: para o que já aconteceu, use o passado ("I went", não "I go"); com "since" e "for", use "I have worked".',
  preposicao: '💡 Preposição: "arrive at the airport", "depend on", "married to", "on the weekend".',
  ordem_palavras: '💡 Ordem das palavras: "I like pizza very much", "a red car", "I always wake up early".',
  vocabulario: '💡 Vocabulário: cuidado com falsos cognatos. "Pretend" é fingir (pretender = "intend"); "sympathetic" é solidário (simpático = "nice").',
  nenhum: '✅ Sem erro importante nesta fala. Muito bem!',
};
const nivelDe = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 1);

export default {
  id: 'conversacao-ingles',
  titulo: 'Conversação em Inglês',
  emoji: '🗣️',
  categoria: 'educacao',
  ordem: 72,
  resumo: 'O aluno conversa em inglês e, a cada fala, vê o nível estimado, o erro principal e a próxima pergunta, no nível certo para ele.',
  descricao: 'A cada fala o Jev estima o nível (A1 a C1), escolhe o erro mais importante numa lista fechada e confere se o aluno respondeu à pergunta. O app usa isso para escolher a próxima pergunta de um banco por nível, ou repetir a mesma de um jeito mais simples. O inglês é a língua em que o Jev é mais forte.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#d62839', acento2: '#3a6ea5' },
  origem: 'IDEIAS-100-APPS #72 — o nível, o erro típico e a próxima pergunta do roteiro',

  contexto: {
    aluno: 'adulto brasileiro treinando conversação em inglês',
    formato: 'conversa curta sobre o dia a dia: fim de semana, trabalho, comida, viagens e planos',
    criterio: 'julgue só o inglês do aluno: gramática, vocabulário e tamanho das frases; o assunto não importa',
  },

  decisoes: [
    {
      id: 'nivel', tipo: 'score', papel: 'medidor', titulo: 'Nível estimado (CEFR)', inverter: true,
      pergunta: 'Pelo inglês desta fala do aluno, qual é o nível dele no Quadro Europeu (CEFR)? Julgue a gramática, o vocabulário e o tamanho das frases, não o assunto.',
      niveis: [
        { rotulo: 'A1', desc: 'palavras soltas ou frases muito curtas e decoradas, com erros básicos' },
        { rotulo: 'A2', desc: 'frases simples sobre rotina e passado, ligadas com and/but, vocabulário básico' },
        { rotulo: 'B1', desc: 'frases ligadas com because/when/so, conta experiências e dá opiniões simples' },
        { rotulo: 'B2', desc: 'frases longas e variadas, tempos verbais compostos, explica com detalhes' },
        { rotulo: 'C1', desc: 'vocabulário rico e idiomático, estruturas complexas, fluente e preciso' },
      ],
    },
    {
      id: 'erro', tipo: 'choice', papel: 'destaque', titulo: 'Erro principal',
      pergunta: 'Qual é o erro de inglês MAIS importante nesta fala do aluno? Se não houver erro relevante, escolha "nenhum".',
      opcoes: [
        { id: 'tempo_verbal', rotulo: 'Tempo verbal', icone: '⏳', tom: 'medio', desc: 'verbo no tempo ou na forma errada: "yesterday I go", "I have went", "since 2019 I work", "I am work"' },
        { id: 'preposicao', rotulo: 'Preposição', icone: '📍', tom: 'medio', desc: 'preposição errada ou faltando: "arrived in the airport", "depend of", "married with", "in the weekend"' },
        { id: 'ordem_palavras', rotulo: 'Ordem das palavras', icone: '🔀', tom: 'medio', desc: 'palavras fora de ordem: "I like very much pizza", "a car red", "always I wake up"' },
        { id: 'vocabulario', rotulo: 'Vocabulário', icone: '📖', tom: 'medio', desc: 'palavra errada ou falso cognato: "pretend" no sentido de pretender, "sympathetic" no sentido de simpático, "make a party", "push" no sentido de puxar' },
        { id: 'nenhum', rotulo: 'Nenhum', icone: '✅', tom: 'bom', desc: 'a fala não tem erro relevante' },
      ],
    },
    {
      id: 'respondeu_a_pergunta', tipo: 'noul', papel: 'contador', titulo: 'Respostas à pergunta', rotuloSim: 'respondeu', rotuloNao: 'não respondeu', tom: 'bom',
      pergunta: 'A fala do aluno RESPONDE à última pergunta do tutor, ou seja, dá a informação que foi pedida (mesmo com erros de inglês)? Dizer que não entendeu, pedir para repetir, mudar de assunto ou falar de outra coisa = não.',
    },
  ],

  conversa: {
    skin: 'chat-site',
    titulo: 'Conversation Practice',
    subtitulo: 'responda em inglês · o Jev escolhe a próxima pergunta',
    avatar: '🗣️',
    participantes: {
      tutor: { nome: 'Tutor', avatar: '🧑‍🏫', lado: 'esq' },
      aluno: { nome: 'Você (aluno)', avatar: '🙂', lado: 'dir' },
    },
    analisar: ['aluno'],
    voce: 'aluno',
    respondeComo: 'tutor',
    ritmo: 2,
    placeholder: 'Escreva em inglês (ex.: "I went to the park with my dog")',
    abertura: '🇬🇧 Responda em inglês. A cada fala, o Jev estima o seu nível, aponta o erro principal e escolhe a próxima pergunta.',
    tituloPlacar: 'Seu inglês, fala a fala',
    // dica em português (pelo erro) + próxima pergunta em inglês (pelo nível), ou a mesma pergunta mais simples
    responder(resp, fala, ctx, estado) {
      estado.passo = estado.passo || 0;
      const faixa = FAIXA(nivelDe(resp.nivel));
      const respondeu = !resp.respondeu_a_pergunta || resp.respondeu_a_pergunta.noul >= 0.5;
      if (!respondeu) {
        const atual = estado.passo === 0 ? ABERTURA_SIMPLES : PASSOS[estado.passo - 1].A;
        return [
          { texto: '🤔 Não respondeu à pergunta: o tutor repete de um jeito mais simples.', quem: '__sistema', classe: 'sistema' },
          { texto: `No problem! Let me ask in a simpler way: ${atual}`, marca: 'mesma pergunta, mais simples' },
        ];
      }
      const dica = { texto: DICAS[resp.erro && resp.erro.choice] || DICAS.nenhum, quem: '__sistema', classe: 'sistema' };
      if (estado.passo >= PASSOS.length) return [dica, FIM];
      const p = PASSOS[estado.passo++];
      return [dica, { texto: p[faixa], marca: `pergunta ${NOME_FAIXA[faixa]}` }];
    },
  },

  roteiros: [
    {
      titulo: 'Aluno iniciante',
      falas: [
        { quem: 'tutor', fixa: true, texto: ABERTURA },
        { quem: 'aluno', texto: 'Last weekend I go to the beach with my family and we eat fish.', esperado: { nivel: [0, 1], erro: 'tempo_verbal', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: 'I work in a bank. I like very much my job because my colleagues are nice.', esperado: { nivel: [1, 2], erro: 'ordem_palavras', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: "Sorry, I don't understand the question.", esperado: { erro: 'nenhum', respondeu_a_pergunta: false } },
        { quem: 'aluno', texto: 'Yes, I cook in the weekends. My favorite food is lasagna.', esperado: { nivel: [0, 1], erro: 'preposicao', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: 'I want to visit Canada. I pretend to go there next year with my wife.', esperado: { nivel: [0, 1, 2], erro: 'vocabulario', respondeu_a_pergunta: true } },
      ],
    },
    {
      titulo: 'Aluna intermediária',
      falas: [
        { quem: 'tutor', fixa: true, texto: ABERTURA },
        { quem: 'aluno', texto: "I went to a friend's birthday party on Saturday. We danced until 2 a.m., so I was exhausted on Sunday.", esperado: { nivel: [2, 3], erro: 'nenhum', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: "I'm a nurse at a public hospital. I love helping people, but the night shifts are hard and I depend of coffee to survive.", esperado: { nivel: [2, 3], erro: 'preposicao', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: "Honestly, I'm not much of a cook. I usually grab something on my way home, although I've been trying to meal-prep on Sundays.", esperado: { nivel: [3, 4], erro: 'nenhum', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: 'My best trip was to Chile last year with my sister. She is very sympathetic, she talked to everybody, so we made a lot of friends there.', esperado: { nivel: [2, 3], erro: 'vocabulario', respondeu_a_pergunta: true } },
        { quem: 'aluno', texto: "I'm going to visit my parents in Minas. Always I visit them when I have a long weekend.", esperado: { nivel: [1, 2], erro: 'ordem_palavras', respondeu_a_pergunta: true } },
      ],
    },
  ],
};

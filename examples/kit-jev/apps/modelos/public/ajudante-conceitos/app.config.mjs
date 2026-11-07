// Ajudante de Conceitos — durante a aula, quando aparece um termo do glossário que a turma talvez não conheça, surge um cartão 💡 com a explicação.
// Para adaptar: troque o GLOSSARIO (o texto do cartão sai daqui, nunca do Jev) e os roteiros da sua aula ou reunião.
const GLOSSARIO = [
  { id: 'llm', termo: 'LLM', tambem: 'modelo de linguagem grande', explica: 'Modelo de linguagem grande: uma IA treinada com muito texto para prever a próxima palavra. É o motor dos chatbots.' },
  { id: 'prompt', termo: 'Prompt', tambem: 'a instrução escrita para a IA', explica: 'A instrução que você escreve para a IA. Mais contexto e exemplos, resposta melhor.' },
  { id: 'alucinacao', termo: 'Alucinação', tambem: 'a IA inventa um dado, um preço ou um fato', explica: 'Quando a IA afirma, com toda a confiança, algo inventado ou errado.' },
  { id: 'rag', termo: 'RAG', tambem: 'ligar a IA aos documentos da empresa', explica: 'A IA consulta os seus documentos (tabela de preços, manual) antes de responder, em vez de confiar só na memória.' },
  { id: 'token', termo: 'Token', tambem: 'pedaço de palavra cobrado pela IA', explica: 'Pedaço de palavra que a IA lê e escreve. As APIs cobram por token.' },
  { id: 'agente_ia', termo: 'Agente de IA', tambem: 'IA que executa tarefas sozinha', explica: 'Uma IA que usa ferramentas (buscar, agendar, mandar mensagem) e executa passos sozinha para cumprir um objetivo.' },
  { id: 'churn', termo: 'Churn', tambem: 'cancelamento de clientes', explica: 'A taxa de clientes que cancelam num período. Se 10 de 100 assinantes saem no mês, o churn é de 10%.' },
  { id: 'cac', termo: 'CAC', tambem: 'custo de aquisição de cliente', explica: 'Custo de aquisição de cliente: quanto você gasta em marketing e vendas para conquistar cada cliente novo.' },
  { id: 'ltv', termo: 'LTV', tambem: 'valor do cliente ao longo do tempo', explica: 'Quanto um cliente deixa de receita durante todo o tempo em que fica com você.' },
  { id: 'mvp', termo: 'MVP', tambem: 'produto mínimo viável', explica: 'Produto mínimo viável: a versão mais simples que já entrega valor e permite testar a ideia com clientes de verdade.' },
  { id: 'ticket_medio', termo: 'Ticket médio', tambem: 'gasto médio por compra', explica: 'Quanto cada cliente gasta, em média, por compra: o faturamento dividido pelo número de vendas.' },
  { id: 'funil', termo: 'Funil de vendas', tambem: 'etapas até a compra', explica: 'As etapas entre conhecer a marca e comprar (visita, interesse, carrinho, compra). Mostra onde o cliente desiste.' },
];
const sistema = (texto) => ({ texto, quem: '__sistema', classe: 'sistema' });
const naFrase = (t) => (/^[A-Z]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));   // "Alucinação" → "alucinação"; siglas ficam
const termoDe = (resp) => GLOSSARIO.find((g) => g.id === (resp.conceito && resp.conceito.choice));
const novo = (resp) => !!(resp.pode_ser_novo && resp.pode_ser_novo.noul >= 0.5);

export default {
  id: 'ajudante-conceitos',
  titulo: 'Ajudante de Conceitos',
  emoji: '💡',
  categoria: 'voz',
  ordem: 66,
  resumo: 'Na aula ou na reunião, quando alguém solta um termo como "RAG" ou "churn", aparece na hora um cartão explicando.',
  descricao: 'A cada fala, o Jev escolhe qual termo do glossário apareceu (ou nenhum) e decide se ele é novo para a turma: se alguém já explicou, o cartão não aparece. A explicação vem do seu glossário, nunca do Jev, então nada é inventado.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#eab308', acento2: '#38bdf8' },
  origem: 'Jev Voice (cartões de conceito da aula ao vivo)',

  contexto: {
    aula: 'IA e números para pequenos negócios, turma de empreendedores iniciantes',
    glossario: GLOSSARIO.map((g) => `${g.termo} (${g.tambem}): ${g.explica}`),
  },

  decisoes: [
    {
      id: 'conceito', tipo: 'choice', papel: 'destaque', titulo: 'Termo',
      pergunta: 'Qual termo do glossário a fala atual usa ou descreve? Vale o nome, a sigla, um sinônimo claro ou a descrição da ideia ("a IA inventou um preço" é alucinação). Se a fala usa mais de um termo, escolha o que ainda NÃO foi explicado na conversa (por um cartão 💡 ou por alguém dizendo o que ele é). Escolha "nenhum" se nenhum termo do glossário aparece.',
      opcoes: () => [
        ...GLOSSARIO.map((g) => ({ id: g.id, rotulo: g.termo, icone: '💡', desc: `${g.termo}: ${g.tambem}` })),
        { id: 'nenhum', rotulo: 'Nenhum', icone: '·', desc: 'a fala não usa nem descreve nenhum termo do glossário' },
      ],
    },
    {
      id: 'pode_ser_novo', tipo: 'noul', papel: 'contador', titulo: 'Termos novos', rotuloSim: 'novo: mostrar', rotuloNao: 'não mostrar', tom: 'bom', limiar: 0.5,
      pergunta: 'A fala atual usa um termo do glossário que ainda NÃO FOI EXPLICADO nesta conversa? "Explicado" quer dizer: um cartão 💡 sobre ele já apareceu, ou alguém disse o que ele é ("ticket médio é quanto cada cliente gasta…"), inclusive na própria fala atual. Só usar o termo numa frase não é explicar. Regra: SIM sempre que a fala usa um termo do glossário (pelo nome ou pela ideia, como "a IA inventar um preço") que ninguém explicou ainda. NÃO quando o termo já foi explicado, ou quando a fala não usa nenhum termo do glossário.',
    },
  ],

  conversa: {
    skin: 'aula',
    titulo: 'Aula 3 · IA e números do seu negócio',
    subtitulo: 'turma de empreendedores · ao vivo',
    avatar: '🎓',
    abertura: '💡 Ajudante ligado: termos novos ganham um cartão com a explicação do glossário',
    participantes: {
      professora: { nome: 'Prof.ª Renata', avatar: '👩🏾‍🏫', lado: 'esq' },
      joana: { nome: 'Joana · aluna', avatar: '👩🏻‍🦰', lado: 'esq' },
      caio: { nome: 'Caio · aluno', avatar: '🧑🏽', lado: 'esq' },
    },
    analisar: ['professora', 'joana', 'caio'],
    voce: 'professora',
    escolherQuem: true,
    placeholder: 'Fale como alguém da aula (ex.: "qual é o LTV desse cliente?")',
    tituloPlacar: 'Na aula agora',
    selo(resp) {
      const g = termoDe(resp);
      if (!g) return null;
      return novo(resp) ? { texto: g.termo, tom: 'acento', icone: '💡' } : { texto: `${g.termo} · já visto`, tom: '', icone: '↺' };
    },
    responder(resp, fala, ctx, estado) {
      const g = termoDe(resp);
      if (!g || !novo(resp)) return null;
      estado.vistos ||= [];
      if (estado.vistos.includes(g.id)) return null;   // o código também não repete cartão
      estado.vistos.push(g.id);
      return sistema(`💡 O que é ${naFrase(g.termo)}? ${g.explica}`);
    },
  },

  roteiros: [
    {
      titulo: 'IA no atendimento',
      falas: [
        { quem: 'professora', texto: 'Hoje a gente vai ver como colocar um LLM pra responder os clientes da loja.', esperado: { conceito: 'llm', pode_ser_novo: true } },
        { quem: 'joana', texto: 'Mas e se ele inventar um preço que nem existe?', esperado: { conceito: 'alucinacao', pode_ser_novo: true } },
        { quem: 'professora', texto: 'Por isso, no projeto da loja, a gente vai usar RAG.', esperado: { conceito: 'rag', pode_ser_novo: true } },
        { quem: 'caio', texto: 'Professora, e esse tal de token? Gasta muito?', esperado: { conceito: 'token', pode_ser_novo: true } },
        { quem: 'professora', texto: 'Gasta pouco: cada pergunta custa menos de um centavo em tokens.', esperado: { conceito: 'token', pode_ser_novo: false } },
      ],
    },
    {
      titulo: 'Números da loja',
      falas: [
        { quem: 'professora', texto: 'Agora, números. Qual é o CAC de vocês hoje?', esperado: { conceito: 'cac', pode_ser_novo: true } },
        { quem: 'caio', texto: 'A gente gasta uns dois mil por mês em anúncio e entram uns quarenta clientes.', esperado: { conceito: ['cac', 'nenhum'], pode_ser_novo: false } },
        { quem: 'professora', texto: 'Então o CAC é de cinquenta reais. E o churn? Quantos cancelam por mês?', esperado: { conceito: 'churn', pode_ser_novo: true } },
        { quem: 'joana', texto: 'Na minha loja de assinatura de café, uns dez por cento cancelam todo mês.', esperado: { conceito: ['churn', 'nenhum'], pode_ser_novo: false } },
        { quem: 'professora', texto: 'É alto. Antes de investir mais, monta um MVP de clube de fidelidade e testa com vinte clientes.', esperado: { conceito: 'mvp', pode_ser_novo: true } },
      ],
    },
    {
      titulo: 'Explicado na hora',
      falas: [
        { quem: 'professora', texto: 'Ticket médio é quanto cada cliente gasta por compra, em média. Qual é o de vocês?', esperado: { conceito: 'ticket_medio', pode_ser_novo: false } },
        { quem: 'joana', texto: 'Uns oitenta reais.', esperado: { conceito: ['nenhum', 'ticket_medio'], pode_ser_novo: false } },
        { quem: 'professora', texto: 'E um agente de IA pode mandar a oferta certa pra cada cliente, sozinho.', esperado: { conceito: 'agente_ia', pode_ser_novo: true } },
        { quem: 'caio', texto: 'E o funil? Dá pra ver onde o cliente desiste?', esperado: { conceito: 'funil', pode_ser_novo: true } },
        { quem: 'professora', texto: 'Dá, sim. E é isso que a gente monta na próxima aula.', esperado: { conceito: 'nenhum', pode_ser_novo: false } },
      ],
    },
  ],
};

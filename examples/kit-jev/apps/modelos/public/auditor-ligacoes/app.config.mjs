// Auditor de Ligações — o Jev confere, fala a fala, se o vendedor cumpriu o roteiro e como o cliente reage (objeção e interesse).
// Para adaptar: troque os ITENS do seu roteiro de vendas (decisões do vendedor), as objeções do seu mercado, as DICAS e as ligações de exemplo.
const ITENS = ['apresentou_empresa', 'avisou_gravacao', 'perguntou_necessidade', 'perguntou_orcamento', 'explicou_garantia', 'combinou_proximo_passo'];
const CURTO = { apresentou_empresa: 'apresentação', avisou_gravacao: 'aviso de gravação', perguntou_necessidade: 'necessidade', perguntou_orcamento: 'orçamento', explicou_garantia: 'garantia', combinou_proximo_passo: 'próximo passo' };
const OBJECOES = [
  { id: 'preco', rotulo: 'preço', icone: '💸', tom: 'medio', desc: 'acha caro, pede desconto ou compara preço' },
  { id: 'confianca', rotulo: 'desconfiança', icone: '🤨', tom: 'medio', desc: 'desconfia de quem liga, da empresa, do resultado ou da instalação' },
  { id: 'tempo', rotulo: 'não é a hora', icone: '⏳', tom: 'medio', desc: 'quer pensar, pede para ligar depois, diz que agora não dá' },
  { id: 'decisor', rotulo: 'outro decisor', icone: '👥', tom: 'medio', desc: 'precisa falar com outra pessoa antes (cônjuge, sócio, família)' },
  { id: 'concorrente', rotulo: 'concorrente', icone: '🏷️', tom: 'medio', desc: 'já tem orçamento ou proposta de outra empresa' },
  { id: 'sem_interesse', rotulo: 'sem interesse', icone: '🚫', tom: 'ruim', desc: 'recusa, quer encerrar ou pede para não ligar mais' },
  { id: 'nenhuma', rotulo: 'sem objeção', icone: '🙂', tom: 'bom', desc: 'nenhuma objeção nesta fala: responde, pergunta ou aceita' },
];
const DICAS = {
  preco: '💡 Objeção de preço: mostre o parcelamento e compare a parcela com a conta de luz de hoje.',
  confianca: '💡 Desconfiança: diga seu nome, a empresa e de onde veio o contato, e ofereça a visita técnica gratuita.',
  tempo: '💡 "Vou pensar": pergunte o que falta para decidir e marque um retorno com dia e hora.',
  decisor: '💡 Outro decisor: convide a outra pessoa para a visita técnica.',
  concorrente: '💡 Já tem orçamento: peça para comparar a garantia e a potência dos painéis.',
  sem_interesse: '🛑 O cliente pediu para encerrar: agradeça e tire o número da lista.',
};

const ROTEIROS = [
  {
    titulo: 'Ligação boa',
    falas: [
      { quem: 'vendedor', texto: 'Boa tarde, falo com a dona Márcia? Aqui é o Diego, da Solar Vivo, de energia solar. Antes de começar, aviso que esta ligação é gravada para a sua segurança, tudo bem?', esperado: { apresentou_empresa: true, avisou_gravacao: true, perguntou_necessidade: false, perguntou_orcamento: false, explicou_garantia: false, combinou_proximo_passo: false } },
      { quem: 'cliente', texto: 'Tudo bem, pode falar. Eu pedi o contato porque a conta de luz aqui em casa está passando de 600 reais.', esperado: { objecao: 'nenhuma', interesse: [2, 3] } },
      { quem: 'vendedor', texto: 'Entendi! Me conta: quantas pessoas moram aí e o telhado é de telha ou de laje? E a senhora pensa em pagar à vista ou parcelado, e mais ou menos quanto quer investir?', esperado: { apresentou_empresa: false, avisou_gravacao: false, perguntou_necessidade: true, perguntou_orcamento: true, explicou_garantia: false, combinou_proximo_passo: false } },
      { quem: 'cliente', texto: 'Somos em quatro, telhado de telha. Mas me disseram que isso custa uns 30 mil, aí fica caro pra mim.', esperado: { objecao: 'preco', interesse: [1, 2] } },
      { quem: 'vendedor', texto: 'Dá para parcelar em até 60 vezes, com parcela menor que a sua conta de luz de hoje. Os painéis têm garantia de 25 anos de geração, e a instalação, de 5 anos. Posso marcar uma visita técnica gratuita na quinta, às 10h?', esperado: { apresentou_empresa: false, avisou_gravacao: false, perguntou_necessidade: false, perguntou_orcamento: false, explicou_garantia: true, combinou_proximo_passo: true } },
      { quem: 'cliente', texto: 'Assim fica interessante. Quinta às 10 está ótimo, pode mandar o técnico.', esperado: { objecao: 'nenhuma', interesse: 3 } },
    ],
  },
  {
    titulo: 'Ligação ruim',
    falas: [
      { quem: 'vendedor', texto: 'Alô, seu Roberto? Tô ligando pra oferecer energia solar, tá numa promoção imperdível essa semana.', esperado: { apresentou_empresa: false, avisou_gravacao: false, perguntou_necessidade: false, perguntou_orcamento: false, explicou_garantia: false, combinou_proximo_passo: false } },
      { quem: 'cliente', texto: 'Quem tá falando? Como vocês conseguiram o meu número?', esperado: { objecao: 'confianca', interesse: [0, 1] } },
      { quem: 'vendedor', texto: 'A gente é parceiro de várias marcas. O kit completo sai por 28 mil, mas fechando hoje eu dou 10% de desconto.', esperado: { apresentou_empresa: false, avisou_gravacao: false, perguntou_necessidade: false, perguntou_orcamento: false, explicou_garantia: false, combinou_proximo_passo: false } },
      { quem: 'cliente', texto: '28 mil? Muito caro. E eu teria que ver isso com a minha esposa antes.', esperado: { objecao: ['preco', 'decisor'], interesse: [0, 1] } },
      { quem: 'vendedor', texto: 'Mas o desconto é só hoje, depois volta o preço normal. Fecha comigo agora que eu já mando o boleto.', esperado: { apresentou_empresa: false, avisou_gravacao: false, perguntou_necessidade: false, perguntou_orcamento: false, explicou_garantia: false, combinou_proximo_passo: false } },
      { quem: 'cliente', texto: 'Não, obrigado. Por favor, tira o meu número da lista.', esperado: { objecao: 'sem_interesse', interesse: 0 } },
    ],
  },
];
const ULTIMAS = new Set(ROTEIROS.map((r) => r.falas[r.falas.length - 1].texto));
const item = (id, rotulo, pergunta) => ({ id, tipo: 'noul', papel: 'checklist', quem: ['vendedor'], titulo: rotulo, tom: 'bom', rotuloSim: 'feito', rotuloNao: 'ainda não', pergunta });

export default {
  id: 'auditor-ligacoes',
  titulo: 'Auditor de Ligações',
  emoji: '🎧',
  categoria: 'vendas',
  ordem: 32,
  resumo: 'A cada fala da ligação o Jev confere o roteiro do vendedor e lê o cliente: objeção, interesse e o que falta fazer.',
  descricao: 'Nas falas do vendedor o Jev confere os 6 itens do roteiro de vendas; nas do cliente, decide a objeção e o nível de interesse. Tudo dentro do tempo da conversa: a dica aparece logo depois da objeção, e o placar fecha a ligação com o que ficou faltando.',
  marcas: ['imediato', 'volume', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#0891b2', acento2: '#34d399' },

  contexto: {
    empresa: 'Solar Vivo — energia solar para casas, venda por telefone',
    roteiro: 'o vendedor deve: dizer o nome e a empresa; avisar que a ligação é gravada; perguntar a necessidade; perguntar o orçamento; explicar a garantia; combinar o próximo passo com dia e hora',
  },

  decisoes: [
    item('apresentou_empresa', 'Apresentou a empresa', 'Na fala atual, o vendedor diz o próprio nome E o nome da empresa?'),
    item('avisou_gravacao', 'Avisou da gravação', 'Na fala atual, o vendedor avisa o cliente que a ligação está sendo gravada?'),
    item('perguntou_necessidade', 'Perguntou a necessidade', 'Na fala atual, o vendedor pergunta sobre a situação do cliente (o problema que quer resolver, o gasto de luz, a casa, o telhado, quantas pessoas moram)?'),
    item('perguntou_orcamento', 'Perguntou o orçamento', 'Na fala atual, o vendedor pergunta quanto o cliente quer ou pode investir, ou como prefere pagar (à vista ou parcelado)? Dizer o preço sem perguntar não conta.'),
    item('explicou_garantia', 'Explicou a garantia', 'Na fala atual, o vendedor explica a garantia (quanto tempo dura e o que cobre)?'),
    item('combinou_proximo_passo', 'Combinou o próximo passo', 'Na fala atual, o vendedor propõe ou confirma um próximo passo com dia ou hora marcados (visita, envio de proposta, nova ligação)? Pressionar para fechar na hora não conta.'),
    {
      id: 'objecao', tipo: 'choice', papel: 'destaque', quem: ['cliente'], titulo: 'Objeção do cliente',
      pergunta: 'Na fala atual, qual objeção o cliente levanta? Se ele só responde, pergunta ou aceita, escolha "sem objeção".',
      opcoes: OBJECOES,
    },
    {
      id: 'interesse', tipo: 'score', papel: 'medidor', quem: ['cliente'], titulo: 'Interesse do cliente',
      pergunta: 'Pela fala atual e pela conversa até aqui, qual é o nível de interesse do cliente em comprar?',
      niveis: [
        { rotulo: 'nenhum', desc: 'recusa ou quer encerrar a ligação' },
        { rotulo: 'morno', desc: 'ouve, desconfia ou resiste, sem compromisso' },
        { rotulo: 'interessado', desc: 'dá informações e conta o problema que quer resolver' },
        { rotulo: 'pronto', desc: 'aceita a visita, a proposta ou o próximo passo' },
      ],
    },
  ],

  conversa: {
    skin: 'ligacao',
    titulo: 'Central de vendas · Solar Vivo',
    subtitulo: 'ligação gravada · auditoria ao vivo com o Jev',
    avatar: '📞',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🏠', lado: 'esq' },
      vendedor: { nome: 'Vendedor', avatar: '🎧', lado: 'dir' },
    },
    analisar: ['vendedor', 'cliente'],
    voce: 'vendedor',
    escolherQuem: true,
    placeholder: 'Fale como vendedor (ex.: "Aqui é a Ana, da Solar Vivo…") ou troque para cliente',
    tituloPlacar: 'Roteiro de vendas · placar da ligação',
    tituloAnalise: 'O Jev julgou cada fala',
    ritmo: 1.5,
    // selo na própria fala: o que o vendedor cumpriu, ou a objeção do cliente
    selo(resp, fala) {
      if (fala.quem === 'cliente') {
        const o = resp.objecao; const op = o && OBJECOES.find((x) => x.id === o.choice);
        return op && op.id !== 'nenhuma' ? { texto: `objeção: ${op.rotulo}`, icone: op.icone, tom: op.tom } : null;
      }
      const feitos = ITENS.filter((id) => resp[id] && resp[id].noul >= 0.5).map((id) => CURTO[id]);
      return feitos.length ? { texto: feitos.join(' · '), icone: '✓', tom: 'bom' } : { texto: 'nenhum item do roteiro', icone: '⚠', tom: 'ruim' };
    },
    // cartões de sistema (texto nosso): dica logo depois da objeção e o placar no fim da ligação
    responder(resp, fala, ctx, estado) {
      estado.feitos = estado.feitos || {};
      for (const id of ITENS) if (resp[id] && resp[id].noul >= 0.5) estado.feitos[id] = true;
      const saida = [];
      const o = resp.objecao;
      if (o && DICAS[o.choice] && (o.probabilities[o.choice] || 0) >= 0.6) saida.push({ texto: DICAS[o.choice], quem: '__sistema', classe: 'sistema' });
      if (ULTIMAS.has(fala.texto)) {
        const n = ITENS.filter((id) => estado.feitos[id]).length;
        const falta = ITENS.filter((id) => !estado.feitos[id]).map((id) => CURTO[id]);
        saida.push({ texto: `📋 Fim da ligação · roteiro cumprido: ${n} de ${ITENS.length}${falta.length ? ' · faltou: ' + falta.join(', ') : ' ✅'}`, quem: '__sistema', classe: 'sistema' });
      }
      return saida.length ? saida : null;
    },
  },

  roteiros: ROTEIROS.map((r) => ({ ...r, falas: r.falas.map((f) => ({ ...f, depois: 1200 })) })),
};

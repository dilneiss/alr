// Radar de Sinais de Compra — posts, vagas e notícias das empresas-alvo viram sinal forte, médio ou nenhum, e o vendedor é avisado.
// Para adaptar: troque o que você vende e o cliente ideal (contexto), os tipos de sinal e os posts de exemplo.

const LIMIAR_AVISO = 0.75; // P(sinal forte) a partir da qual o código avisa o vendedor

export default {
  id: 'sinais-compra',
  titulo: 'Radar de Sinais de Compra',
  emoji: '🎯',
  categoria: 'radares',
  ordem: 78,
  resumo: 'Posts, vagas e notícias das empresas-alvo viram sinal forte, médio ou nenhum, e o vendedor só é chamado quando vale a pena.',
  descricao: 'O Jev lê cada post, vaga ou notícia das empresas que você quer vender e decide a força do sinal de compra e o tipo (contratando, captou dinheiro, expansão, reclamou do concorrente, troca de liderança…). O aviso ao vendedor é regra do código, só para sinal forte com folga.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#2ec27e', acento2: '#f6d32d' },
  origem: 'IDEIAS-100-APPS #78 — contratando para X? captou dinheiro? reclamou do concorrente? → avisa o vendedor',

  contexto: {
    o_que_vendemos: 'Somos a Atende+ (fictícia): automação de atendimento com chatbot de IA no WhatsApp e no site, triagem de mensagens e painel para a equipe de atendimento.',
    cliente_ideal: 'empresas de 50 a 500 funcionários com muito contato de clientes: varejo, saúde, educação e serviços',
  },

  decisoes: [
    {
      id: 'forca', tipo: 'choice', titulo: 'Força do sinal',
      pergunta: 'Para quem vende automação de atendimento (contexto), qual é a força do sinal de compra neste post, vaga ou notícia? Regra: forte = dor de atendimento agora ou mudança que vira compra em semanas; médio = mudança que pode virar compra em meses; sem sinal = nada a ver com atendimento nem com compra.',
      opcoes: [
        { id: 'sinal_forte', rotulo: 'Sinal forte', icone: '🔥', cor: '#84cc16', desc: 'contratando vários atendentes ou montando central de atendimento, reclamação do atendimento ou da ferramenta atual, nova liderança de atendimento ou de experiência do cliente, expansão grande que vai multiplicar os clientes' },
        { id: 'sinal_medio', rotulo: 'Sinal médio', icone: '🌤️', cor: '#fbbf24', desc: 'captou investimento, expansão pequena, contratando para tecnologia ou marketing, troca de liderança fora do atendimento' },
        { id: 'sem_sinal', rotulo: 'Sem sinal', icone: '💤', cor: '#64748b', desc: 'prêmio, data comemorativa, post motivacional ou institucional, vaga sem relação com atendimento, empresa fora do perfil' },
      ],
    },
    {
      id: 'tipo_sinal', tipo: 'choice', titulo: 'Tipo de sinal',
      pergunta: 'Que tipo de acontecimento este post, vaga ou notícia mostra?',
      opcoes: [
        { id: 'contratando', rotulo: 'contratando', icone: '🧑‍💼', desc: 'vaga aberta ou anúncio de contratação' },
        { id: 'captou_investimento', rotulo: 'captou investimento', icone: '💰', desc: 'recebeu aporte, rodada de investimento ou empréstimo grande' },
        { id: 'expansao', rotulo: 'expansão', icone: '📍', desc: 'abriu ou vai abrir lojas, unidades, cidades ou um produto novo' },
        { id: 'dor_no_atendimento', rotulo: 'dor no atendimento', icone: '😩', desc: 'a empresa reclama do próprio atendimento: fila, volume de mensagens, demora, equipe sobrecarregada' },
        { id: 'reclamou_de_concorrente', rotulo: 'reclamou do concorrente', icone: '🗯️', desc: 'reclama da ferramenta ou do fornecedor de atendimento que usa hoje, ou procura alternativa a ele' },
        { id: 'troca_de_lideranca', rotulo: 'troca de liderança', icone: '🔄', desc: 'chegou diretor, gerente ou executivo novo' },
        { id: 'nenhum', rotulo: 'nenhum', icone: '•', esconderChip: true, desc: 'nenhum desses acontecimentos (prêmio, data comemorativa, post motivacional, novidade de produto sem relação)' },
      ],
    },
  ],

  fluxo: {
    colunas: 'forca',
    rotuloItem: 'Post',
    lote: 4,
    ritmo: 3800,
    cartao: { titulo: 'empresa', subtitulo: 'fonte', texto: 'texto', meta: 'quando', avatar: 'avatar' },
    entrada: { placeholder: 'Cole um post, vaga ou notícia de uma empresa-alvo e veja a força do sinal…', botao: 'Avaliar sinal' },
    rotuloFila: 'Posts das empresas-alvo',
    rotuloFeitos: 'posts',
  },
  textoItem: (it) => `${it.empresa} (${it.fonte}): ${it.texto}`,

  // o aviso ao vendedor é regra do código: sinal forte com folga
  cartaoExtra(item, resp) {
    const pf = resp.forca && resp.forca.probabilities ? resp.forca.probabilities.sinal_forte || 0 : 0;
    return pf >= LIMIAR_AVISO ? `<span class="mj-chip bom" title="P(sinal forte) = ${Math.round(pf * 100)}%">📣 avisar o vendedor</span>` : '';
  },
  aoDecidir(item, resp, extra) {
    if (!resp.forca) return;
    extra.total = (extra.total || 0) + 1;
    const pf = resp.forca.probabilities ? resp.forca.probabilities.sinal_forte || 0 : 0;
    if (pf >= LIMIAR_AVISO) extra.avisos = (extra.avisos || 0) + 1;
    if (resp.forca.choice === 'sem_sinal') extra.ruido = (extra.ruido || 0) + 1;
  },
  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'avisos ao vendedor', valor: `${extra.avisos || 0} de ${extra.total}` },
      { rotulo: 'ruído ignorado', valor: String(extra.ruido || 0) },
    ];
  },

  dados: [
    { id: 's1', avatar: '💊', empresa: 'Rede Farmácia Bem Estar', fonte: 'vaga no LinkedIn', quando: 'há 5 min', texto: 'Estamos contratando 25 atendentes para a nossa nova central de atendimento ao cliente, em Recife.', esperado: { forca: 'sinal_forte', tipo_sinal: 'contratando' } },
    { id: 's2', avatar: '🏫', empresa: 'Escola Horizonte', fonte: 'notícia', quando: 'há 12 min', texto: 'A Escola Horizonte recebeu um aporte de R$ 20 milhões e planeja abrir 6 unidades até 2027.', esperado: { forca: ['sinal_medio', 'sinal_forte'], tipo_sinal: 'captou_investimento' } },
    { id: 's3', avatar: '🩺', empresa: 'Clínica Vida Plena', fonte: 'post do diretor', quando: 'há 20 min', texto: 'O chatbot que usamos hoje não entende nada do que os pacientes escrevem. Alguém indica uma solução melhor?', esperado: { forca: 'sinal_forte', tipo_sinal: 'reclamou_de_concorrente' } },
    { id: 's4', avatar: '👗', empresa: 'Moda Lume', fonte: 'post da empresa', quando: 'há 26 min', texto: 'Orgulho! Ganhamos o prêmio de sustentabilidade do varejo 2026 🌱', esperado: { forca: 'sem_sinal', tipo_sinal: 'nenhum' } },
    { id: 's5', avatar: '📚', empresa: 'Grupo Educa Mais', fonte: 'notícia', quando: 'há 31 min', texto: 'O Grupo Educa Mais anuncia a nova diretora de Experiência do Cliente, que vem do varejo com a missão de reduzir reclamações.', esperado: { forca: 'sinal_forte', tipo_sinal: 'troca_de_lideranca' } },
    { id: 's6', avatar: '🐶', empresa: 'Pet Center Amigo Fiel', fonte: 'post da empresa', quando: 'há 38 min', texto: 'Inauguramos a nossa 3ª loja! Venha conhecer no bairro Jardim das Flores.', esperado: { forca: ['sinal_medio', 'sem_sinal'], tipo_sinal: 'expansao' } },
    { id: 's7', avatar: '🏗️', empresa: 'Construtora Pedra Firme', fonte: 'vaga no LinkedIn', quando: 'há 44 min', texto: 'Vaga: engenheiro civil para obras residenciais em Goiânia.', esperado: { forca: 'sem_sinal', tipo_sinal: ['contratando', 'nenhum'] } },
    { id: 's8', avatar: '👓', empresa: 'Ótica Visão Clara', fonte: 'post da empresa', quando: 'há 50 min', texto: 'Feliz Dia do Cliente! Obrigado por fazer parte da nossa história ❤️', esperado: { forca: 'sem_sinal', tipo_sinal: 'nenhum' } },
    { id: 's9', avatar: '🧪', empresa: 'Laboratório DiagMais', fonte: 'notícia', quando: 'há 57 min', texto: 'O DiagMais vai abrir 40 unidades de coleta no interior de São Paulo em 2026 e prevê dobrar o número de pacientes atendidos.', esperado: { forca: 'sinal_forte', tipo_sinal: 'expansao' } },
    { id: 's10', avatar: '🛒', empresa: 'Supermercados Bom Preço', fonte: 'post da gerente de SAC', quando: 'há 1 h', texto: 'Recebemos 3 mil mensagens por dia no WhatsApp e a equipe não dá conta. A fila chega a 6 horas.', esperado: { forca: 'sinal_forte', tipo_sinal: 'dor_no_atendimento' } },
    { id: 's11', avatar: '🏠', empresa: 'Imobiliária Lar Doce Lar', fonte: 'vaga no LinkedIn', quando: 'há 1 h', texto: 'Vaga: desenvolvedor(a) front-end pleno para o nosso novo portal de imóveis.', esperado: { forca: ['sinal_medio', 'sem_sinal'], tipo_sinal: 'contratando' } },
    { id: 's12', avatar: '🏥', empresa: 'Hospital São Lucas do Vale', fonte: 'notícia', quando: 'há 1 h', texto: 'O hospital anunciou um novo diretor financeiro, vindo de uma rede de clínicas.', esperado: { forca: ['sinal_medio', 'sem_sinal'], tipo_sinal: 'troca_de_lideranca' } },
    { id: 's13', avatar: '🏋️', empresa: 'Academia CorpoAtivo', fonte: 'post da empresa', quando: 'há 2 h', texto: 'Bora treinar! 💪 Segunda-feira é dia de foco e disciplina.', esperado: { forca: 'sem_sinal', tipo_sinal: 'nenhum' } },
    { id: 's14', avatar: '💳', empresa: 'PagFácil', fonte: 'notícia', quando: 'há 2 h', texto: 'A fintech PagFácil recebeu R$ 80 milhões em investimento para ampliar o suporte a pequenos lojistas.', esperado: { forca: ['sinal_forte', 'sinal_medio'], tipo_sinal: 'captou_investimento' } },
    { id: 's15', avatar: '🗣️', empresa: 'Escolas de Idiomas Fale Já', fonte: 'post do diretor de operações', quando: 'há 2 h', texto: 'Depois de 2 anos com a ferramenta de atendimento TalkBot, estamos avaliando alternativas. Indicações?', esperado: { forca: 'sinal_forte', tipo_sinal: 'reclamou_de_concorrente' } },
    { id: 's16', avatar: '🦷', empresa: 'Clínica Odonto Sorriso', fonte: 'vaga no LinkedIn', quando: 'há 3 h', texto: 'Vaga: recepcionista para a unidade do Centro (1 vaga).', esperado: { forca: ['sinal_medio', 'sem_sinal'], tipo_sinal: 'contratando' } },
    { id: 's17', avatar: '🛋️', empresa: 'Casa & Cia Varejo', fonte: 'notícia', quando: 'há 3 h', texto: 'A Casa & Cia nomeou um novo diretor de atendimento, que promete reduzir pela metade as reclamações dos clientes.', esperado: { forca: 'sinal_forte', tipo_sinal: 'troca_de_lideranca' } },
    { id: 's18', avatar: '⚙️', empresa: 'Metalúrgica Forja Sul', fonte: 'post da empresa', quando: 'há 4 h', texto: 'A nova prensa hidráulica chegou! Mais capacidade para os nossos clientes industriais.', esperado: { forca: 'sem_sinal', tipo_sinal: ['nenhum', 'expansao'] } },
    { id: 's19', avatar: '🏫', empresa: 'Escola Horizonte', fonte: 'vaga no LinkedIn', quando: 'há 4 h', texto: 'Vaga: coordenador(a) de relacionamento com as famílias, para estruturar a nossa central de atendimento.', esperado: { forca: 'sinal_forte', tipo_sinal: 'contratando' } },
    { id: 's21', avatar: '🧺', empresa: 'Lavanderias Lava Bem', fonte: 'notícia', quando: 'há 5 h', texto: 'A Lava Bem vai franquear 120 lojas em 2027 e lançar agendamento de coleta pelo WhatsApp.', esperado: { forca: ['sinal_forte', 'sinal_medio'], tipo_sinal: 'expansao' } },
    { id: 's22', avatar: '📚', empresa: 'Colégio Nova Geração', fonte: 'post da empresa', quando: 'há 6 h', texto: 'Semana de provas: boa sorte, alunos! Estamos torcendo por vocês 📚', esperado: { forca: 'sem_sinal', tipo_sinal: 'nenhum' } },
    { id: 's20', avatar: '🍲', empresa: 'Delivery Sabor Caseiro', fonte: 'post da empresa', quando: 'há 5 h', texto: 'Fomos eleitos o melhor delivery do bairro pelo 3º ano seguido! Obrigado, vizinhança!', esperado: { forca: 'sem_sinal', tipo_sinal: 'nenhum' } },
  ],
};

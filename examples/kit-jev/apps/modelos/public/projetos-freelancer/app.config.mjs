// Caçador de Projetos para Freelancer — cada projeto novo da plataforma é lido contra o seu perfil: candidatar já, talvez ou pular.
// Para adaptar: troque o perfil (contexto.perfil, editável na tela), o seu valor mínimo (MINIMO) e os projetos de exemplo.

const MINIMO = 500; // abaixo disto você nem abre o projeto (comparação feita pelo código, não pelo Jev)
const reais = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const LIMIAR_GOLPE = 0.6; // o alerta vermelho só acende com folga
const golpe = (resp) => !!resp.sinal_de_golpe && resp.sinal_de_golpe.noul >= LIMIAR_GOLPE;

export default {
  id: 'projetos-freelancer',
  titulo: 'Caçador de Projetos para Freelancer',
  emoji: '🧲',
  categoria: 'radares',
  ordem: 76,
  resumo: 'Cada projeto novo da plataforma é lido contra o seu perfil em segundos: candidatar já, talvez ou pular, com alerta de golpe.',
  descricao: 'O Jev lê cada projeto assim que ele é publicado e decide se combina com o que você faz, se o orçamento é justo para o escopo e se tem cara de golpe. Quem manda a proposta primeiro costuma levar: o aviso chega em segundos, e o golpe fica marcado em vermelho.',
  marcas: ['volume', 'imediato'],
  motor: 'fluxo',
  tema: { acento: '#d946ef', acento2: '#8b5cf6' },
  origem: 'IDEIAS-100-APPS #76 — combina com você? orçamento? cliente com cara de problema?',

  contexto: {
    perfil: 'Sou a Bia Moreira, designer e especialista em automação no-code. Faço: identidade visual, embalagens e rótulos, landing pages no Framer e no Webflow, automações com Make, Zapier e n8n (planilhas, CRM, e-mail, WhatsApp), Notion e Airtable. NÃO faço: programação de backend, aplicativos nativos, edição de vídeo, ilustração, tráfego pago nem gestão de redes sociais.',
  },
  editavel: { campo: 'perfil', rotulo: 'Seu perfil (o Jev lê isto)', botao: 'Perfil', ajuda: 'Escreva o que você faz e o que não faz. Ex.: tire "edição de vídeo" do NÃO faço e aperte ▶ de novo.' },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', titulo: 'O que fazer',
      pergunta: 'Pelo perfil da freelancer (contexto.perfil), o que ela deve fazer com este projeto? Regra: candidatar já = o trabalho é do perfil, o escopo está claro e não há sinal de golpe; talvez = só parte do trabalho é do perfil ou o escopo está vago; pular = o trabalho não é do perfil, o orçamento é irrisório para o escopo ou há sinal de golpe (pagar para começar, teste grátis, sair da plataforma).',
      opcoes: [
        { id: 'candidatar_ja', rotulo: 'Candidatar já', icone: '🚀', cor: '#34d399', desc: 'o trabalho é do perfil (design, landing page, automação no-code, Notion, Airtable) e o escopo está claro' },
        { id: 'talvez', rotulo: 'Talvez', icone: '🤔', cor: '#fbbf24', desc: 'só parte do trabalho é do perfil, ou o escopo está vago: vale perguntar antes de propor' },
        { id: 'pular', rotulo: 'Pular', icone: '⏭️', cor: '#94a3b8', desc: 'o trabalho não é do perfil, o orçamento é irrisório para o escopo, ou o projeto tem cara de golpe' },
      ],
    },
    {
      id: 'sinal_de_golpe', tipo: 'noul', titulo: 'Sinal de golpe', rotulo: 'sinal de golpe', icone: '🚩', tom: 'ruim', alerta: true, limiar: LIMIAR_GOLPE,
      pergunta: 'O projeto tem sinal de golpe: pede para pagar taxa, kit ou cadastro para começar; pede trabalho grande de graça como "teste" ou concurso; quer levar a conversa para fora da plataforma logo de cara; ou promete ganho muito acima do normal para tarefa fácil?',
    },
    {
      id: 'orcamento_justo', tipo: 'score', titulo: 'Orçamento', inverter: true,
      pergunta: 'O orçamento oferecido é justo para o escopo descrito, pelos preços comuns de freelancer no Brasil?',
      niveis: [
        { rotulo: 'irrisório', desc: 'paga uma pequena fração do que o trabalho vale' },
        { rotulo: 'baixo', desc: 'abaixo do que o mercado cobra por esse escopo' },
        { rotulo: 'justo', desc: 'compatível com o mercado para esse escopo' },
        { rotulo: 'generoso', desc: 'acima do mercado para esse escopo, ou bom demais para ser verdade' },
      ],
    },
  ],

  fluxo: {
    colunas: 'acao',
    rotuloItem: 'Projeto',
    lote: 4,
    ritmo: 3800,
    cartao: { titulo: 'titulo', subtitulo: 'cliente', texto: 'descricao', meta: 'publicado', valor: 'orcamento', avatar: 'avatar' },
    entrada: { placeholder: 'Cole a descrição de um projeto e veja se vale se candidatar…', botao: 'Avaliar projeto' },
    rotuloFila: 'Projetos novos',
    rotuloFeitos: 'projetos',
  },
  textoItem: (it) => `${it.titulo} — ${it.cliente} — ${it.descricao} — Orçamento: ${it.orcamento}`,

  // o seu mínimo é conferido pelo código; o aviso no celular sai quando o Jev diz "candidatar já" com folga e sem golpe
  cartaoExtra(item, resp) {
    const out = [];
    if (typeof item.valorNum === 'number' && item.valorNum < MINIMO) out.push(`<span class="mj-chip medio" title="Seu mínimo: ${reais(MINIMO)}">💸 abaixo do seu mínimo</span>`);
    const a = resp.acao;
    if (a && a.choice === 'candidatar_ja' && (a.probabilities?.candidatar_ja || 0) >= 0.7 && !golpe(resp)) out.push('<span class="mj-chip bom" title="Aviso enviado no celular em segundos">🔔 aviso enviado</span>');
    return out.join(' ');
  },
  aoDecidir(item, resp, extra) {
    if (!resp.acao) return;
    extra.total = (extra.total || 0) + 1;
    if (golpe(resp)) extra.golpes = (extra.golpes || 0) + 1;
    if (resp.acao.choice === 'candidatar_ja' && (resp.acao.probabilities?.candidatar_ja || 0) >= 0.7 && !golpe(resp)) extra.avisos = (extra.avisos || 0) + 1;
  },
  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'avisos no celular', valor: `${extra.avisos || 0} de ${extra.total}` },
      { rotulo: 'golpes marcados', valor: String(extra.golpes || 0) },
    ];
  },

  dados: [
    { id: 'f1', avatar: '☕', publicado: 'há 1 min · 0 propostas', titulo: 'Identidade visual para cafeteria', cliente: 'Café Grão Fino · 4,9★ · 12 projetos pagos', descricao: 'Logo, paleta de cores, cardápio impresso e papelaria (cartão de visita e sacola). Prazo de 3 semanas.', orcamento: 'R$ 2.800', valorNum: 2800, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f2', avatar: '📊', publicado: 'há 2 min · 1 proposta', titulo: 'Automação: planilha de pedidos → WhatsApp', cliente: 'Doces da Lu · cliente novo', descricao: 'Quero que cada pedido novo na planilha do Google mande uma mensagem automática para o cliente no WhatsApp. Pode ser com Make ou Zapier.', orcamento: 'R$ 900', valorNum: 900, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f3', avatar: '📱', publicado: 'há 3 min · 7 propostas', titulo: 'App nativo iOS e Android para delivery', cliente: 'Rango Já · 4,2★', descricao: 'Aplicativo nativo com pagamento, rastreio do entregador em tempo real e painel administrativo. Backend incluso.', orcamento: 'R$ 15.000', valorNum: 15000, esperado: { acao: 'pular', sinal_de_golpe: false, orcamento_justo: [0, 1] } },
    { id: 'f4', avatar: '💸', publicado: 'há 3 min · 2 propostas', titulo: 'Logo + manual de marca + 30 artes — URGENTE', cliente: 'Loja Brilho · 3,1★', descricao: 'Preciso de tudo para amanhã cedo. Se ficar bom, tem muito trabalho depois.', orcamento: 'R$ 150', valorNum: 150, esperado: { acao: 'pular', orcamento_justo: 0 } },
    { id: 'f5', avatar: '🎓', publicado: 'há 4 min · 0 propostas', titulo: 'Landing page no Framer para curso on-line', cliente: 'Academia do Saber · 5,0★ · 30 projetos pagos', descricao: 'Página de vendas com 8 seções e formulário ligado ao nosso e-mail marketing. O texto já está pronto e aprovado.', orcamento: 'R$ 3.500', valorNum: 3500, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [2, 3] } },
    { id: 'f6', avatar: '🎰', publicado: 'há 5 min · 0 propostas', titulo: 'Ganhe R$ 5.000 por semana testando aplicativos', cliente: 'TopGains · perfil criado hoje', descricao: 'Tarefa fácil: baixar apps e dar nota. Para começar, pague a taxa de cadastro de R$ 49 e me chame no Telegram.', orcamento: 'R$ 5.000/semana', esperado: { acao: 'pular', sinal_de_golpe: true, orcamento_justo: 3 } },
    { id: 'f7', avatar: '🗃️', publicado: 'há 6 min · 1 proposta', titulo: 'Notion para controle de clientes', cliente: 'Consultoria Nova Rota · 4,7★', descricao: 'Quero um Notion com CRM simples, funil de vendas e lembretes de retorno. Já uso o Notion para notas.', orcamento: 'R$ 1.200', valorNum: 1200, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f8', avatar: '🎬', publicado: 'há 6 min · 9 propostas', titulo: 'Edição de 20 vídeos para o YouTube', cliente: 'Canal Viaje Leve · 4,8★', descricao: 'Vídeos de 10 a 15 minutos, com cortes, legendas e trilha. Material bruto pronto.', orcamento: 'R$ 2.000', valorNum: 2000, esperado: { acao: 'pular', sinal_de_golpe: false } },
    { id: 'f9', avatar: '🏆', publicado: 'há 7 min · 15 propostas', titulo: 'Concurso: crie 3 logos e o melhor ganha o projeto', cliente: 'Marca X Bebidas · sem avaliações', descricao: 'Vamos escolher entre 15 designers. Todos mandam 3 logos prontos e só pagamos o vencedor.', orcamento: 'R$ 300', valorNum: 300, esperado: { acao: 'pular', sinal_de_golpe: true, orcamento_justo: [0, 1] } },
    { id: 'f10', avatar: '🧾', publicado: 'há 8 min · 0 propostas', titulo: 'Automatizar envio de notas fiscais por e-mail com n8n', cliente: 'Contabilidade Horizonte · 4,8★', descricao: 'Toda nota emitida no nosso sistema tem que ir por e-mail para o cliente, com o boleto em anexo. O sistema tem API.', orcamento: 'R$ 1.500', valorNum: 1500, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f11', avatar: '🛒', publicado: 'há 9 min · 4 propostas', titulo: 'Loja virtual integrada ao ERP antigo', cliente: 'Ferragens Pioneiro · 4,4★', descricao: 'Site com loja virtual e integração com o nosso ERP antigo, que exige programação de backend em PHP.', orcamento: 'R$ 6.000', valorNum: 6000, esperado: { acao: ['talvez', 'pular'], sinal_de_golpe: false } },
    { id: 'f12', avatar: '📣', publicado: 'há 9 min · 11 propostas', titulo: 'Gestão de anúncios no Instagram e no Google', cliente: 'Imobiliária Lar Feliz · 4,5★', descricao: 'Procuro gestor de tráfego pago para campanhas de captação de leads. Verba de mídia separada.', orcamento: 'R$ 1.800/mês', valorNum: 1800, esperado: { acao: 'pular', sinal_de_golpe: false } },
    { id: 'f13', avatar: '🧼', publicado: 'há 10 min · 1 proposta', titulo: 'Rótulos para linha de sabonetes artesanais', cliente: 'Sabonetes da Serra · 4,9★', descricao: 'Três rótulos novos, com arquivo pronto para a gráfica. Já temos o logo.', orcamento: 'R$ 1.100', valorNum: 1100, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f14', avatar: '🌀', publicado: 'há 11 min · 3 propostas', titulo: 'Preciso de alguém para "dar um jeito" no meu site', cliente: 'Rodrigo P. · cliente novo', descricao: 'Não sei explicar direito, o site está estranho e lento. Quem topar, eu explico melhor depois.', orcamento: 'R$ 600', valorNum: 600, esperado: { acao: 'talvez' } },
    { id: 'f15', avatar: '🩺', publicado: 'há 12 min · 0 propostas', titulo: 'Chatbot de agendamento no WhatsApp para clínica', cliente: 'Clínica Bem Viver · 4,6★', descricao: 'Bot para marcar consultas usando uma planilha e o Zapier, com transferência para a recepção quando o paciente pedir.', orcamento: 'R$ 2.200', valorNum: 2200, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f16', avatar: '🎁', publicado: 'há 13 min · 0 propostas', titulo: 'Seja designer parceira: renda extra garantida', cliente: 'Studio Ganhe Mais · perfil criado hoje', descricao: 'Pague R$ 120 pelo kit de materiais e comece hoje a receber pedidos de artes. Ganhos de até R$ 8 mil por mês.', orcamento: 'até R$ 8.000/mês', esperado: { acao: 'pular', sinal_de_golpe: true } },
    { id: 'f17', avatar: '🖍️', publicado: 'há 14 min · 6 propostas', titulo: 'Ilustrações para livro infantil (24 páginas)', cliente: 'Editora Pequeno Leitor · 4,7★', descricao: 'Ilustrações coloridas para todas as páginas, no estilo aquarela, e a capa.', orcamento: 'R$ 1.800', valorNum: 1800, esperado: { acao: ['talvez', 'pular'], sinal_de_golpe: false, orcamento_justo: [0, 1] } },
    { id: 'f18', avatar: '📦', publicado: 'há 15 min · 0 propostas', titulo: 'Migrar planilhas de estoque para o Airtable, com automações', cliente: 'Empório Natural · 4,9★', descricao: 'Levar 4 planilhas de estoque para o Airtable e criar alertas de estoque baixo por e-mail.', orcamento: 'R$ 1.900', valorNum: 1900, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f19', avatar: '🎨', publicado: 'há 16 min · 2 propostas', titulo: 'Landing page + automação de leads para escola de dança', cliente: 'Escola Passo Certo · 4,8★', descricao: 'Página no Webflow com formulário que cai numa planilha e manda e-mail de boas-vindas. Também queremos um vídeo de apresentação editado.', orcamento: 'R$ 2.400', valorNum: 2400, esperado: { acao: ['talvez', 'candidatar_ja'], sinal_de_golpe: false } },
    { id: 'f21', avatar: '🧭', publicado: 'há 18 min · 0 propostas', titulo: 'Automação de boas-vindas para novos clientes (Notion + e-mail)', cliente: 'Agência Pulsar · 4,8★', descricao: 'Quando um contrato é assinado, criar a página do cliente no Notion e disparar a sequência de e-mails de boas-vindas. Já usamos o Make.', orcamento: 'R$ 1.600', valorNum: 1600, esperado: { acao: 'candidatar_ja', sinal_de_golpe: false, orcamento_justo: [1, 2] } },
    { id: 'f22', avatar: '🖥️', publicado: 'há 19 min · 5 propostas', titulo: 'Desenvolvedor backend Node.js para API de pagamentos', cliente: 'Fintech Rápida · 4,3★', descricao: 'API REST com filas, testes automatizados e deploy na nuvem. Contrato de 3 meses.', orcamento: 'R$ 9.000/mês', valorNum: 9000, esperado: { acao: 'pular', sinal_de_golpe: false } },
    { id: 'f20', avatar: '💼', publicado: 'há 17 min · 0 propostas', titulo: 'Proposta comercial no Notion — fale comigo no WhatsApp antes', cliente: 'Grupo Vértice · sem avaliações', descricao: 'Antes de qualquer coisa, me chame no WhatsApp (o número está na minha foto) que eu passo os detalhes por lá.', orcamento: 'R$ 700', valorNum: 700, esperado: { sinal_de_golpe: true } },
  ],
};

// Auditor de Despesas — cada pedido de reembolso é aprovado, vai para o gestor ou é recusado, pela política escrita na pergunta.
// Para adaptar: troque os LIMITES (o código calcula "acima do limite"), as regras da pergunta "veredito" e os pedidos de exemplo.
const LIMITES = { alimentacao: 120, transporte: 200, hospedagem: 900, material: 300, software: 250, outro: 150 };
const ROTULOS = { alimentacao: 'Alimentação', transporte: 'Transporte', hospedagem: 'Hospedagem', material: 'Material', software: 'Software', outro: 'Outros' };
const DUVIDA = 0.6;
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const acima = (p) => p.valor > LIMITES[p.cat];
const confianca = (a) => (a && a.probabilities ? Math.max(...Object.values(a.probabilities)) : 0);

const PEDIDOS = [
  { id: 'r1', pessoa: 'Ana Ribeiro', descricao: 'Almoço com cliente da Rede Movimento (2 pessoas)', valor: 96.4, cat: 'alimentacao', comprovante: true, justificativa: 'Reunião de renovação do contrato com o Fábio, da Rede Movimento', esperado: { veredito: 'aprovar', justificativa_fraca: false, categoria_real: 'alimentacao' } },
  { id: 'r2', pessoa: 'Bruno Lima', descricao: 'Corrida de aplicativo aeroporto → hotel', valor: 78.5, cat: 'transporte', comprovante: true, justificativa: 'Viagem para o evento de e-commerce em Recife', esperado: { veredito: 'aprovar', justificativa_fraca: false, categoria_real: 'transporte' } },
  { id: 'r3', pessoa: 'Carla Mendes', descricao: 'Jantar', valor: 342.0, cat: 'alimentacao', comprovante: true, justificativa: 'reunião', esperado: { veredito: 'revisar', justificativa_fraca: true } },
  { id: 'r4', pessoa: 'Diego Souza', descricao: 'Hotel Mar Azul — 2 diárias', valor: 780.0, cat: 'hospedagem', comprovante: true, justificativa: 'Workshop presencial com o cliente EcoPack em Fortaleza', esperado: { veredito: 'aprovar', justificativa_fraca: false, categoria_real: 'hospedagem' } },
  { id: 'r5', pessoa: 'Eduarda Reis', descricao: 'Multa de trânsito — estacionamento proibido', valor: 195.23, cat: 'transporte', comprovante: true, justificativa: 'Estava atrasada para a reunião com o cliente', esperado: { veredito: 'recusar' } },
  { id: 'r6', pessoa: 'Felipe Andrade', descricao: 'Licença anual do editor de vídeo', valor: 1188.0, cat: 'software', comprovante: true, justificativa: 'Edição dos vídeos do cliente Café Serra Alta', esperado: { veredito: 'revisar', justificativa_fraca: false, categoria_real: 'software' } },
  { id: 'r7', pessoa: 'Gabriela Nunes', descricao: 'Cerveja e petiscos — happy hour do time', valor: 210.0, cat: 'alimentacao', comprovante: true, justificativa: 'comemoração', esperado: { veredito: 'recusar', justificativa_fraca: true } },
  { id: 'r8', pessoa: 'Henrique Costa', descricao: 'Cabo HDMI e adaptador USB-C', valor: 89.9, cat: 'material', comprovante: false, justificativa: 'Apresentação na sala do cliente: o projetor só tinha entrada HDMI', esperado: { veredito: 'recusar', justificativa_fraca: false, categoria_real: 'material' } },
  { id: 'r9', pessoa: 'Isabela Prado', descricao: 'Almoço', valor: 45.0, cat: 'alimentacao', comprovante: true, justificativa: 'Plantão no lançamento da loja virtual da Doceria Carla (fiquei até as 23h)', esperado: { veredito: 'aprovar', justificativa_fraca: false } },
  { id: 'r10', pessoa: 'João Pedro', descricao: 'Táxi', valor: 62.0, cat: 'alimentacao', comprovante: true, justificativa: 'Volta da reunião na Rede Movimento', esperado: { veredito: 'revisar', justificativa_fraca: false, categoria_real: 'transporte' } },
  { id: 'r11', pessoa: 'Lucas Martins', descricao: 'Presente de aniversário para minha esposa', valor: 140.0, cat: 'outro', comprovante: true, justificativa: 'data especial', esperado: { veredito: 'recusar', justificativa_fraca: true, categoria_real: 'pessoal' } },
  { id: 'r12', pessoa: 'Mariana Couto', descricao: 'Estacionamento no shopping', valor: 32.0, cat: 'transporte', comprovante: true, justificativa: 'Reunião com a Bella Sorvetes no Shopping Parque', esperado: { veredito: 'aprovar', justificativa_fraca: false, categoria_real: 'transporte' } },
  { id: 'r13', pessoa: 'Nicolas Pereira', descricao: 'Banco de imagens — assinatura mensal', valor: 149.0, cat: 'software', comprovante: true, justificativa: 'Fotos para os posts do cliente Ateliê Luana', esperado: { veredito: 'aprovar', justificativa_fraca: false, categoria_real: 'software' } },
  { id: 'r14', pessoa: 'Olívia Santos', descricao: 'Gasolina', valor: 280.0, cat: 'transporte', comprovante: true, justificativa: 'visita a clientes', esperado: { veredito: 'revisar' } },
  { id: 'r15', pessoa: 'Paulo Rocha', descricao: 'Restaurante Cantina Bella — jantar', valor: 98.0, cat: 'hospedagem', comprovante: true, justificativa: 'Jantar na viagem a Fortaleza (workshop EcoPack)', esperado: { veredito: 'revisar', justificativa_fraca: false, categoria_real: 'alimentacao' } },
  { id: 'r16', pessoa: 'Rafaela Lima', descricao: 'Canetas, post-its e cadernos', valor: 64.3, cat: 'material', comprovante: true, justificativa: '', esperado: { veredito: 'revisar', justificativa_fraca: true, categoria_real: 'material' } },
  { id: 'r17', pessoa: 'Sérgio Melo', descricao: 'Hotel — 1 diária', valor: 410.0, cat: 'hospedagem', comprovante: true, justificativa: 'Feira de franquias em São Paulo, no estande do cliente Pote Verde', esperado: { veredito: 'aprovar', justificativa_fraca: false } },
  { id: 'r18', pessoa: 'Tânia Alves', descricao: 'Curso online de oratória', valor: 297.0, cat: 'outro', comprovante: true, justificativa: 'Desenvolvimento pessoal', esperado: { veredito: 'revisar' } },
];

export default {
  id: 'auditor-despesas',
  titulo: 'Auditor de Despesas',
  emoji: '🧮',
  categoria: 'dados',
  ordem: 42,
  resumo: 'Cada pedido de reembolso é aprovado, vai para o gestor ou é recusado pela política da empresa, com a justificativa fraca e a categoria errada à vista.',
  descricao: 'Os limites de valor ficam com o código, que já manda "acima do limite: sim/não" e "comprovante: sim/não". O Jev julga o que só a linguagem resolve: se é despesa pessoal, se a justificativa explica o trabalho e qual é a categoria real; o código compara com a declarada. O que fica em dúvida não é aprovado sozinho.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#0ea5e9', acento2: '#f97316' },

  contexto: {
    empresa: 'Agência Vitrine Digital (fictícia), 40 pessoas, reembolsos pagos todo dia 5',
    limites: Object.entries(LIMITES).map(([k, v]) => `${ROTULOS[k]}: até ${brl(v)} por pedido`),
    politica: 'não reembolsa bebida alcoólica, multa, presente nem item de uso pessoal; todo pedido precisa de comprovante',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', titulo: 'Veredito',
      pergunta: 'O que fazer com este pedido de reembolso, pela política da empresa? Regras, nesta ordem: 1) sem comprovante → recusar; 2) despesa pessoal ou proibida (bebida alcoólica, multa de trânsito, presente para familiar, item de uso pessoal) → recusar; 3) acima do limite da categoria → revisar; 4) categoria declarada não combina com a descrição, ou justificativa vaga ou em branco → revisar; 5) tudo certo → aprovar.',
      opcoes: [
        { id: 'aprovar', rotulo: 'Aprovar', icone: '✅', cor: '#34d399', desc: 'tem comprovante, está dentro do limite, a categoria combina e o motivo de trabalho é claro' },
        { id: 'revisar', rotulo: 'Revisar (gestor)', icone: '🔎', cor: '#f59e0b', desc: 'acima do limite, categoria declarada errada, ou justificativa vaga ou em branco' },
        { id: 'recusar', rotulo: 'Recusar', icone: '⛔', cor: '#f43f5e', desc: 'sem comprovante, ou despesa pessoal ou proibida pela política (bebida alcoólica, multa, presente, item pessoal)' },
      ],
    },
    {
      id: 'justificativa_fraca', tipo: 'noul', titulo: 'Justificativa fraca', rotulo: 'justificativa fraca', icone: '💬', tom: 'ruim', limiar: 0.6,
      pergunta: 'A justificativa é vaga, genérica, está em branco ou não explica o motivo de trabalho da despesa (ex.: "reunião", "necessário", "comemoração", "data especial")? Justificativa boa cita o cliente, o projeto, o evento ou a viagem.',
    },
    {
      id: 'categoria_real', tipo: 'choice', titulo: 'Categoria real',
      pergunta: 'Pela descrição da despesa, qual é a categoria real dela (independente da categoria que a pessoa declarou)?',
      opcoes: [
        { id: 'alimentacao', rotulo: 'Alimentação', icone: '🍽️', desc: 'refeição, almoço, jantar, lanche, café' },
        { id: 'transporte', rotulo: 'Transporte', icone: '🚕', desc: 'táxi, corrida de aplicativo, combustível, estacionamento, pedágio, passagem' },
        { id: 'hospedagem', rotulo: 'Hospedagem', icone: '🏨', desc: 'hotel, pousada, diária' },
        { id: 'material', rotulo: 'Material', icone: '🖇️', desc: 'material de escritório, cabo, adaptador, peça de equipamento' },
        { id: 'software', rotulo: 'Software', icone: '💻', desc: 'licença ou assinatura de programa, banco de imagens, ferramenta online' },
        { id: 'pessoal', rotulo: 'Pessoal', icone: '🎁', tom: 'ruim', desc: 'despesa pessoal: presente, multa, bebida alcoólica, item para a casa ou a família' },
        { id: 'outro', rotulo: 'Outro', icone: '📦', desc: 'curso, evento ou algo que não se encaixa nas outras' },
      ],
    },
  ],

  fluxo: {
    colunas: 'veredito',
    rotuloItem: 'Pedido de reembolso',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: DUVIDA, rotulo: 'Jev em dúvida', icone: '🤔' },
    cartao: { titulo: 'descricao', subtitulo: 'pessoa', texto: 'justificativaTxt', meta: 'sinais', valor: 'valor', avatar: 'avatar' },
    entrada: { placeholder: 'Descreva um pedido (ex.: "Uber para o cliente, R$ 45, transporte, reunião de kickoff, com comprovante")…', botao: 'Auditar' },
    rotuloFeitos: 'pedidos',
  },

  // o que vai para o Jev: o pedido com os sinais que o CÓDIGO calculou (acima do limite, comprovante)
  textoItem: (p) => `${p.descricao} — valor ${brl(p.valor)} — categoria declarada: ${ROTULOS[p.cat]} — justificativa: "${p.justificativa || '(em branco)'}" — acima do limite da categoria (${brl(LIMITES[p.cat])}): ${acima(p) ? 'SIM' : 'não'} — comprovante anexado: ${p.comprovante ? 'sim' : 'NÃO'}`,

  // o código compara a categoria real (do Jev) com a declarada
  cartaoExtra(item, resp) {
    const real = resp.categoria_real && resp.categoria_real.choice;
    if (!item.cat || !real || real === item.cat) return '';
    return `<span class="mj-chip medio">≠ declarou ${ROTULOS[item.cat]}</span>`;
  },

  aoDecidir(item, resp, extra) {
    if (typeof item.valor !== 'number') return;
    const a = resp.veredito;
    if (!a) return;
    if (confianca(a) < DUVIDA) { extra.duvida = (extra.duvida || 0) + 1; return; }
    if (a.choice === 'aprovar') extra.aprovado = (extra.aprovado || 0) + item.valor;
    if (a.choice === 'recusar') extra.barrado = (extra.barrado || 0) + item.valor;
    if (a.choice === 'revisar') extra.gestor = (extra.gestor || 0) + 1;
  },
  resumoExtra: (extra) => [
    { rotulo: 'aprovado sozinho', valor: brl(extra.aprovado) },
    { rotulo: 'barrado pela política', valor: brl(extra.barrado) },
    { rotulo: 'para o gestor', valor: `${(extra.gestor || 0) + (extra.duvida || 0)} pedidos` },
  ],

  dados: PEDIDOS.map((p) => ({
    ...p,
    justificativaTxt: p.justificativa ? `“${p.justificativa}”` : '(sem justificativa)',
    sinais: [ROTULOS[p.cat], acima(p) ? '⚠ acima do limite' : 'no limite', p.comprovante ? '📎 com comprovante' : '🚫 sem comprovante'].join(' · '),
    avatar: '🧾',
  })),
};

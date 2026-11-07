// Redação ENEM ao Vivo — enquanto o aluno escreve um parágrafo, o Jev confere tese, repertório e os 5 elementos da proposta.
// Para adaptar: troque o tema (contexto e cabeçalho), as perguntas sim/não (os critérios da sua banca) e os parágrafos de exemplo.
// Só itens objetivos e um parágrafo por vez: nota holística de texto longo é onde o Jev mais erra. Os pontos são somados pelo código.

const ELEMENTOS = [
  { id: 'agente', rotulo: 'agente' },
  { id: 'acao', rotulo: 'ação' },
  { id: 'meio', rotulo: 'meio' },
  { id: 'finalidade', rotulo: 'finalidade' },
  { id: 'detalhamento', rotulo: 'detalhamento' },
];
const TEMA = 'Caminhos para combater o desperdício de alimentos no Brasil';

export default {
  id: 'redacao-enem',
  titulo: 'Redação ENEM ao Vivo',
  emoji: '✍️',
  categoria: 'educacao',
  ordem: 70,
  resumo: 'Enquanto o aluno escreve, cada parágrafo é conferido: tem tese? tem repertório? a proposta de intervenção tem os 5 elementos?',
  descricao: 'A cada pausa da digitação o Jev relê o parágrafo e responde 8 perguntas objetivas de uma vez, em menos de meio segundo. Ele não dá nota à redação inteira (é onde mais erra): diz o que está presente, e o código soma os pontos da Competência 5.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#1d4ed8', acento2: '#dc2626', modo: 'claro', fonte: 'serif' },
  origem: 'IDEIAS-100-APPS #70 — só itens objetivos, por parágrafo',

  contexto: {
    tema: TEMA,
    tipo_de_texto: 'redação dissertativo-argumentativa do ENEM, conferida um parágrafo por vez (introdução, desenvolvimento ou conclusão)',
    proposta_de_intervencao: 'a proposta completa tem 5 elementos: agente (quem faz), ação (o que faz), meio ou modo (como faz), finalidade (para quê) e detalhamento (uma informação a mais sobre um dos elementos)',
  },

  aovivo: {
    skin: 'papel',
    janela: 'Folha de redação',
    rotulo: 'Parágrafo da redação',
    cabecalho: { Tema: TEMA, 'Como usar': 'um parágrafo por vez: introdução, desenvolvimento ou conclusão' },
    placeholder: 'Escreva um parágrafo da sua redação…',
    dica: 'O Jev relê o parágrafo a cada pausa e confere só itens objetivos.',
    velocidade: 2.2,
    pausa: 2800,
    tituloChecklist: 'O que o Jev confere neste parágrafo',
  },

  decisoes: [
    {
      id: 'c5', tipo: 'choice', papel: 'destaque', titulo: 'Competência 5 · proposta',
      pergunta: 'Competência 5 do ENEM (proposta de intervenção) neste parágrafo. Os 5 elementos são: agente (quem faz), ação (o que faz), meio ou modo (como faz), finalidade (para quê) e detalhamento (uma informação a mais sobre um dos elementos). Regra: completa = a proposta tem os 5 elementos; parcial = há proposta de ação, mas falta pelo menos um elemento; ausente = o parágrafo não propõe nenhuma ação (normal em introdução e desenvolvimento).',
      opcoes: [
        { id: 'completa', rotulo: 'Proposta completa', icone: '🏅', cor: '#16a34a', desc: 'tem os 5 elementos: agente, ação, meio, finalidade e detalhamento' },
        { id: 'parcial', rotulo: 'Proposta parcial', icone: '🧩', cor: '#d97706', desc: 'propõe uma ação, mas falta pelo menos um dos 5 elementos' },
        { id: 'ausente', rotulo: 'Sem proposta', icone: '📄', cor: '#64748b', desc: 'o parágrafo não propõe nenhuma ação para resolver o problema' },
      ],
    },
    { id: 'tese', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Tese: ponto de vista com o porquê', pergunta: 'Este parágrafo apresenta a tese do texto: uma frase com o ponto de vista do autor sobre o problema e as causas que ele vai defender (ex.: "esse cenário é causado por X e por Y")? Só repetir o tema, falar de forma genérica ou propor solução não é tese.' },
    { id: 'repertorio', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Repertório sociocultural', pergunta: 'Este parágrafo usa repertório sociocultural: cita pelo nome uma lei, a Constituição, um dado com fonte, um autor, uma obra ou um fato histórico?' },
    { id: 'agente', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Agente: quem vai agir', pergunta: 'O parágrafo propõe uma ação para resolver o problema E diz QUEM deve fazê-la (o agente: governo, secretarias, escolas, mídia, empresas, ONGs, famílias)? Se não há proposta de ação, responda não.' },
    { id: 'acao', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Ação: o que fazer', pergunta: 'O parágrafo propõe O QUE deve ser feito para enfrentar o problema (uma ação concreta)? Descrever o problema ou dizer só que "medidas são necessárias" não conta.' },
    { id: 'meio', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Meio: como fazer', pergunta: 'Na proposta, o parágrafo diz COMO a ação será feita, o meio ou modo (ex.: "por meio de campanhas", "mediante parcerias", "com oficinas")? Se não há proposta, responda não.' },
    { id: 'finalidade', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Finalidade: para quê', pergunta: 'Na proposta, o parágrafo diz PARA QUÊ a ação será feita, o efeito esperado (ex.: "a fim de", "para que", "com o objetivo de")? Se não há proposta, responda não.' },
    { id: 'detalhamento', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Detalhamento de um elemento', pergunta: 'Na proposta, o parágrafo traz um detalhamento: uma informação a mais sobre o agente, a ação, o meio ou a finalidade (ex.: quem conduz, onde, com que frequência, um exemplo)? Se não há proposta, responda não.' },
  ],

  // painel do topo: os pontos da Competência 5 são somados aqui, no código (40 por elemento presente)
  render(r) {
    const R = r.respostas || {};
    if (!R.c5) return '';
    const presentes = ELEMENTOS.filter((e) => R[e.id] && R[e.id].noul >= 0.5);
    const pontos = presentes.length * 40;
    const chips = ELEMENTOS.map((e) => {
      const ok = presentes.includes(e);
      return `<span class="mj-chip ${ok ? 'bom' : ''}" style="${ok ? '' : 'opacity:.55'}">${ok ? '✓' : '○'} ${e.rotulo}</span>`;
    }).join('');
    const nota = R.c5.choice === 'ausente'
      ? '<div class="dim" style="font-size:12.5px;margin-top:8px">Este parágrafo não traz proposta: normal em introdução e desenvolvimento. A proposta costuma vir na conclusão.</div>'
      : `<div class="dim" style="font-size:12.5px;margin-top:8px">${presentes.length === 5 ? 'Os 5 elementos estão aqui.' : `Falta: ${ELEMENTOS.filter((e) => !presentes.includes(e)).map((e) => e.rotulo).join(', ')}.`}</div>`;
    return `<div class="mj-widget mj-painel-box" style="border-color:color-mix(in srgb,var(--mj-acento) 40%,transparent)"><h4>Proposta de intervenção <span class="tp">pontos somados pelo código</span></h4>`
      + `<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="mj-num" style="font-size:34px;font-weight:800;color:var(--mj-acento)">${pontos}</span><span class="dim">de 200 na Competência 5 · ${presentes.length} de 5 elementos × 40</span></div>`
      + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${chips}</div>${nota}</div>`;
  },

  exemplos: [
    {
      titulo: 'Introdução sem tese',
      texto: 'Hoje em dia, o desperdício de alimentos é um assunto muito discutido na sociedade. Muitas pessoas falam sobre esse tema na televisão e na internet, e cada um tem uma opinião diferente. Por isso, é importante falar sobre esse assunto.',
      esperado: { c5: 'ausente', tese: false, repertorio: false, agente: false, acao: false, meio: false, finalidade: false, detalhamento: false },
    },
    {
      titulo: 'Introdução com tese',
      texto: 'A Constituição Federal de 1988 garante a alimentação como direito social de todos os brasileiros. Na prática, porém, toneladas de comida em bom estado vão para o lixo todos os dias, enquanto muitas famílias não têm o que comer. Esse cenário é causado, sobretudo, pela falta de educação para o consumo consciente e pela ausência de incentivos à doação de alimentos.',
      esperado: { c5: 'ausente', tese: true, repertorio: true, agente: false, acao: false, meio: false, finalidade: false, detalhamento: false },
    },
    {
      titulo: 'Conclusão incompleta',
      texto: 'Dessa forma, é preciso que os supermercados doem mais alimentos, para que a comida chegue a quem precisa.',
      esperado: { c5: 'parcial', tese: false, repertorio: false, agente: true, acao: true, meio: false, finalidade: true, detalhamento: false },
    },
    {
      titulo: 'Conclusão completa',
      texto: 'Portanto, cabe às secretarias municipais de educação incluir aulas de consumo consciente no currículo das escolas públicas, por meio de oficinas práticas de aproveitamento integral dos alimentos, a fim de formar cidadãos que comprem e cozinhem sem desperdício. Essas oficinas, conduzidas por nutricionistas da rede pública, podem envolver também as famílias dos alunos.',
      esperado: { c5: 'completa', tese: false, repertorio: false, agente: true, acao: true, meio: true, finalidade: true, detalhamento: true },
    },
  ],
};

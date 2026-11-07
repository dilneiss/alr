// Roteador de Modelos — antes da chamada cara, o Jev escolhe o modelo e o esforço certos para cada pedido.
// Para adaptar: troque as opções pelos modelos que você usa (com o custo relativo de cada um) e os pedidos de exemplo.
const MODELOS = [
  { id: 'local', rotulo: 'Modelo local', icone: '🏠', custo: 0, desc: 'roda dentro da empresa: OBRIGATÓRIO quando o pedido tem dado pessoal (CPF, salário, saúde, dados de cliente); fora isso, só tarefas curtíssimas' },
  { id: 'rapido', rotulo: 'Modelo rápido', icone: '🐇', custo: 1, desc: 'tarefa curta e simples do dia a dia: resumir e-mail curto, traduzir frase, corrigir ortografia, escrever mensagem curta' },
  { id: 'medio', rotulo: 'Modelo médio', icone: '🦊', custo: 5, desc: 'análise de documento longo, contrato, planilha com erro, fórmula, código, resumo de relatório extenso' },
  { id: 'topo', rotulo: 'Modelo de ponta', icone: '🦉', custo: 25, desc: 'o mais caro: SÓ para estratégia, planejamento tributário ou jurídico complexo, decisões caras, comparar vários cenários, raciocínio com muitas etapas' },
];

export default {
  id: 'roteador-modelos',
  titulo: 'Roteador de Modelos',
  emoji: '🧭',
  categoria: 'construtores',
  ordem: 47,
  resumo: 'Antes da chamada cara, o Jev escolhe o modelo e o esforço certos para cada pedido — e mostra a economia.',
  descricao: 'Mandar tudo para o modelo mais caro é o jeito mais rápido de queimar dinheiro. O Jev lê cada pedido em ~0,3 s, escolhe o modelo mais barato que resolve bem e avisa quando há dado sensível (que deve ficar no modelo local).',
  marcas: ['imediato', 'lista fechada'],
  motor: 'agente',
  tema: { acento: '#a78bfa', acento2: '#22d3ee' },
  origem: 'já existe: jev-roteador (plugin do Claude Code)',

  contexto: {
    empresa: 'escritório de contabilidade com 20 pessoas usando IA no dia a dia',
    modelos: MODELOS.map((m) => `${m.rotulo}: ${m.desc}`),
  },

  decisoes: [
    {
      id: 'modelo', tipo: 'choice', titulo: 'Modelo escolhido',
      pergunta: 'Qual modelo deve atender este pedido? Regras: dado pessoal → modelo local; tarefa curta e simples → modelo rápido; documento longo, planilha, fórmula ou código → modelo médio; estratégia, vários cenários ou decisão cara → modelo de ponta.',
      opcoes: MODELOS.map((m) => ({ id: m.id, rotulo: m.rotulo, icone: m.icone, desc: m.desc })),
    },
    {
      id: 'esforco', tipo: 'score', titulo: 'Esforço',
      pergunta: 'Quanto raciocínio este pedido exige?',
      niveis: ['baixo', 'médio', 'alto', 'máximo'],
    },
    {
      id: 'sensivel', tipo: 'noul', titulo: 'Dado sensível', rotulo: 'dado sensível', icone: '🔒', tom: 'ruim', limiar: 0.5,
      pergunta: 'O pedido contém dados pessoais ou confidenciais (CPF, salário, saúde, dados de cliente) que não deveriam sair da empresa?',
    },
  ],

  agente: {
    modo: 'roteador',
    veredito: 'modelo',
    titulo: 'Pedidos da equipe chegando',
    subtitulo: 'cada um vai para o modelo certo',
    rotuloPedido: 'Pedido',
    ritmo: 1500,
  },

  aoDecidir(resp, entrada, ctx, cont) {
    const custo = Object.fromEntries(MODELOS.map((m) => [m.id, m.custo]));
    const n = Object.values(cont).reduce((s, x) => s + x, 0);
    if (!n) return '';
    const gasto = Object.entries(cont).reduce((s, [k, x]) => s + (custo[k] || 0) * x, 0);
    const tudoNoTopo = n * custo.topo;
    const eco = 1 - gasto / tudoNoTopo;
    return `<div class="mj-widget mj-painel-box"><h4>Economia contra "tudo no modelo de ponta"</h4><div class="mj-contadores"><div class="mj-contador"><b style="color:var(--mj-bom)">${Math.round(eco * 100)}%</b><span>mais barato</span></div><div class="mj-contador"><b>${n}</b><span>pedidos roteados</span></div></div></div>`;
  },

  roteiros: [
    {
      titulo: 'Um dia no escritório',
      pedidos: [
        { texto: 'Resume esse e-mail do cliente em duas linhas.', esperado: { modelo: 'rapido' } },
        { texto: 'Calcula a folha de pagamento da Maria Silva, CPF 123.456.789-00, salário de R$ 7.800 com horas extras de outubro.', esperado: { modelo: 'local' } },
        { texto: 'Traduz para o inglês: "Segue a nota fiscal referente ao serviço prestado em setembro."', esperado: { modelo: 'rapido' } },
        { texto: 'Monta uma estratégia tributária para uma holding familiar com 3 empresas no lucro presumido e imóveis para alugar, comparando cenários para 2027.', esperado: { modelo: 'topo' } },
        { texto: 'Corrige a ortografia deste parágrafo do relatório.', esperado: { modelo: 'rapido' } },
        { texto: 'Lê esse contrato de 30 páginas e lista as cláusulas de multa e de reajuste.', esperado: { modelo: 'medio' } },
        { texto: 'Escreve uma mensagem de feliz aniversário para um cliente.', esperado: { modelo: 'rapido' } },
        { texto: 'Por que essa planilha está dando erro de referência circular na aba de impostos? Segue a fórmula.', esperado: { modelo: 'medio' } },
      ],
    },
  ],
};

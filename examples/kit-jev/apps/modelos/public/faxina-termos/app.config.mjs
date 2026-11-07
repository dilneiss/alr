// Faxina de Termos de Busca — cada termo de busca do Google Ads vai para manter, negativar ou revisar, e o app soma a verba que deixa de ir para o lixo.
// Para adaptar: troque o contexto (o seu produto), as regras da pergunta "acao" e cole o relatório de termos de busca (termo, cliques, gasto) em "dados".
const LIMIAR_AUTO = 0.7;  // só conta como economia o que o Jev negativou com pelo menos 70% de certeza
const reais = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default {
  id: 'faxina-termos',
  titulo: 'Faxina de Termos de Busca',
  emoji: '🧹',
  categoria: 'vendas',
  ordem: 30,
  resumo: 'O relatório de termos de busca do Google Ads passa pelo Jev: o que nunca vira aluno é negativado e a verba economizada aparece no fim.',
  descricao: 'O Jev lê cada termo que acionou o anúncio e decide manter, negativar ou mandar para revisão, com a intenção de quem buscou. O código soma o gasto dos termos negativados com certeza alta: é a verba que deixa de ir para "inglês grátis" e "tradutor" todo mês.',
  marcas: ['volume', 'lista fechada', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#059669', acento2: '#facc15' },

  contexto: {
    produto: 'Fluent Já — curso de inglês online para adultos, com aulas ao vivo e gravadas, R$ 149 por mês',
    campanha: 'Google Ads, rede de pesquisa, relatório de termos de busca dos últimos 30 dias',
    objetivo: 'cortar os termos que gastam verba e nunca viram matrícula',
  },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', titulo: 'Ação',
      pergunta: 'O que fazer com este termo de busca na campanha do curso de inglês online para adultos? Regras: busca de quem quer fazer, comparar ou pagar um curso ou aula de inglês online → manter; busca por algo grátis, vaga de emprego, tradução ou significado de palavra, letra de música, outro idioma, curso presencial ou curso para crianças → negativar; termo genérico demais, em que não dá para saber se a pessoa quer um curso → revisar.',
      opcoes: [
        { id: 'manter', rotulo: 'Manter', icone: '✅', cor: '#34d399', desc: 'busca de quem quer fazer, comparar ou pagar um curso de inglês online para adultos' },
        { id: 'negativar', rotulo: 'Negativar', icone: '⛔', cor: '#f87171', desc: 'busca que nunca vira aluno pagante: grátis, emprego, tradução, letra de música, outro idioma, presencial, infantil' },
        { id: 'revisar', rotulo: 'Revisar', icone: '🤔', cor: '#fbbf24', desc: 'termo genérico ou ambíguo: não dá para saber se a pessoa quer um curso' },
      ],
    },
    {
      id: 'intencao', tipo: 'choice', titulo: 'Intenção',
      pergunta: 'Qual é a intenção de quem fez esta busca?',
      opcoes: [
        { id: 'comprar', rotulo: 'contratar', icone: '💳', tom: 'bom', desc: 'quer contratar um curso: preço, matrícula, inscrição, curso com certificado' },
        { id: 'pesquisar', rotulo: 'pesquisar', icone: '🔎', tom: 'info', desc: 'compara opções, quer saber se vale a pena, se é confiável ou como funciona' },
        { id: 'gratis', rotulo: 'grátis', icone: '🆓', tom: 'ruim', desc: 'quer algo de graça: aula, apostila, aplicativo ou material gratuito' },
        { id: 'emprego', rotulo: 'emprego', icone: '💼', tom: 'ruim', desc: 'procura vaga ou trabalho (professor, tradutor)' },
        { id: 'traduzir', rotulo: 'traduzir', icone: '🔤', tom: 'ruim', desc: 'quer traduzir um texto, uma palavra ou uma letra de música' },
        { id: 'outro', rotulo: 'outro', icone: '💬', tom: 'medio', desc: 'outro idioma, outro público ou intenção que não dá para saber' },
      ],
    },
  ],

  fluxo: {
    colunas: 'acao',
    rotuloItem: 'Termo de busca',
    lote: 4,
    ritmo: 3600,
    cartao: { titulo: 'termo', subtitulo: 'desempenho', valor: 'gasto' },
    avatar: '🔍',
    entrada: { placeholder: 'Digite um termo de busca (ex.: "curso de inglês barato") e veja o que fazer com ele…', botao: 'Decidir' },
    rotuloFeitos: 'termos',
    rotuloFila: 'Termos de busca · últimos 30 dias',
  },
  textoItem: (t) => t.termo,

  cartaoExtra(item, resp) {
    const a = resp.acao;
    if (!a || a.choice !== 'negativar' || typeof item.gasto !== 'number') return '';
    return (a.probabilities[a.choice] || 0) >= LIMIAR_AUTO
      ? `<span class="mj-chip bom">💰 economiza ${reais(item.gasto)}/mês</span>`
      : '<span class="mj-chip medio">confira antes de negativar</span>';
  },
  aoDecidir(item, resp, extra) {
    const a = resp.acao;
    extra.total = (extra.total || 0) + 1;
    if (a && a.choice === 'negativar' && (a.probabilities[a.choice] || 0) >= LIMIAR_AUTO && typeof item.gasto === 'number') {
      extra.economia = (extra.economia || 0) + item.gasto;
      extra.negativados = (extra.negativados || 0) + 1;
    }
  },
  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'verba economizada/mês', valor: reais(extra.economia) },
      { rotulo: 'negativados no automático', valor: `${extra.negativados || 0} de ${extra.total}` },
    ];
  },

  dados: [
    { id: 't1', termo: 'curso de inglês online para adultos', desempenho: '128 cliques · 9 matrículas', gasto: 307.2, esperado: { acao: 'manter', intencao: 'comprar' } },
    { id: 't2', termo: 'inglês grátis', desempenho: '96 cliques · 0 matrículas', gasto: 172.8, esperado: { acao: 'negativar', intencao: 'gratis' } },
    { id: 't3', termo: 'vaga professor de inglês home office', desempenho: '41 cliques · 0 matrículas', gasto: 77.9, esperado: { acao: 'negativar', intencao: 'emprego' } },
    { id: 't4', termo: 'como se diz obrigado em inglês', desempenho: '63 cliques · 0 matrículas', gasto: 50.4, esperado: { acao: 'negativar', intencao: 'traduzir' } },
    { id: 't5', termo: 'curso de inglês online preço', desempenho: '87 cliques · 7 matrículas', gasto: 226.2, esperado: { acao: 'manter', intencao: 'comprar' } },
    { id: 't6', termo: 'curso de espanhol online', desempenho: '22 cliques · 0 matrículas', gasto: 48.4, esperado: { acao: 'negativar', intencao: 'outro' } },
    { id: 't7', termo: 'inglês', desempenho: '54 cliques · 1 matrícula', gasto: 81.0, esperado: { acao: 'revisar' } },
    { id: 't8', termo: 'melhor curso de inglês online vale a pena', desempenho: '46 cliques · 2 matrículas', gasto: 119.6, esperado: { acao: 'manter', intencao: 'pesquisar' } },
    { id: 't9', termo: 'tradutor inglês português', desempenho: '112 cliques · 0 matrículas', gasto: 89.6, esperado: { acao: 'negativar', intencao: 'traduzir' } },
    { id: 't10', termo: 'aula de inglês ao vivo para o trabalho', desempenho: '31 cliques · 3 matrículas', gasto: 86.8, esperado: { acao: 'manter', intencao: 'comprar' } },
    { id: 't11', termo: 'baixar apostila de inglês pdf grátis', desempenho: '58 cliques · 0 matrículas', gasto: 69.6, esperado: { acao: 'negativar', intencao: 'gratis' } },
    { id: 't12', termo: 'curso de inglês presencial em campinas', desempenho: '19 cliques · 0 matrículas', gasto: 45.6, esperado: { acao: 'negativar' } },
    { id: 't23', termo: 'intercâmbio no canadá', desempenho: '38 cliques · 0 matrículas', gasto: 91.2, esperado: { acao: ['negativar', 'revisar'], intencao: ['pesquisar', 'outro'] } },
    { id: 't13', termo: 'inglês para viagem rápido', desempenho: '27 cliques · 1 matrícula', gasto: 59.4, esperado: { acao: ['manter', 'revisar'] } },
    { id: 't14', termo: 'letra de música em inglês traduzida', desempenho: '35 cliques · 0 matrículas', gasto: 28.0, esperado: { acao: 'negativar', intencao: 'traduzir' } },
    { id: 't15', termo: 'fluent já é confiável', desempenho: '17 cliques · 2 matrículas', gasto: 25.5, esperado: { acao: 'manter', intencao: 'pesquisar' } },
    { id: 't16', termo: 'teste de nível de inglês', desempenho: '39 cliques · 1 matrícula', gasto: 70.2, esperado: { acao: ['revisar', 'manter'] } },
    { id: 't17', termo: 'trabalhar como tradutor de inglês', desempenho: '24 cliques · 0 matrículas', gasto: 43.2, esperado: { acao: 'negativar', intencao: 'emprego' } },
    { id: 't18', termo: 'curso de inglês com certificado', desempenho: '44 cliques · 4 matrículas', gasto: 110.0, esperado: { acao: 'manter', intencao: 'comprar' } },
    { id: 't19', termo: 'aplicativo de inglês gratuito', desempenho: '71 cliques · 0 matrículas', gasto: 85.2, esperado: { acao: 'negativar', intencao: 'gratis' } },
    { id: 't20', termo: 'inglês kids', desempenho: '26 cliques · 0 matrículas', gasto: 41.6, esperado: { acao: 'negativar' } },
    { id: 't21', termo: 'quanto custa aprender inglês', desempenho: '33 cliques · 2 matrículas', gasto: 79.2, esperado: { acao: 'manter', intencao: ['comprar', 'pesquisar'] } },
    { id: 't22', termo: 'ingles online barato', desempenho: '52 cliques · 3 matrículas', gasto: 130.0, esperado: { acao: 'manter', intencao: 'comprar' } },
  ],
};

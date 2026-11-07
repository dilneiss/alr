// A Fonte Diz Isso Mesmo? — para cada afirmação com citação, o Jev compara com a frase citada: sustenta, em parte, não sustenta ou contradiz.
// Para adaptar: troque os pares (afirmação + frase da fonte) pelos do seu texto e, se quiser, as regras da pergunta "veredito".
const LIMIAR = 0.7; // abaixo desta confiança o par vai para revisão humana

// um par = a afirmação do texto + a frase da fonte que ela cita
const par = (id, afirmacao, fonte, pagina, esperado) => ({ id, afirmacao, fonte, citacao: `📄 «${fonte}»`, onde: `relatório anual 2025, p. ${pagina}`, esperado });

export default {
  id: 'fonte-diz-isso',
  titulo: 'A Fonte Diz Isso Mesmo?',
  emoji: '🔍',
  categoria: 'construtores',
  ordem: 53,
  resumo: 'Para cada afirmação com citação, o Jev confere se a frase citada sustenta o que foi dito, e mede o exagero.',
  descricao: 'Texto escrito por IA (ou por gente com pressa) cita a fonte e diz outra coisa. O Jev compara cada afirmação com a frase citada e decide em lote: sustenta, em parte, não sustenta ou contradiz. O que vem com pouca confiança vai para uma pessoa conferir.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#b8475f', acento2: '#7f8cf0' },
  origem: 'TypeSafe: cookbook de checagem de citação; na Vals, empatou com modelos de ponta em afirmações de balanço (10-K)',
  tarefa: 'checar se a frase citada da fonte sustenta cada afirmação de um texto',

  contexto: {
    texto_checado: 'rascunho de newsletter de investimentos, escrito com ajuda de IA, sobre a Ferragens Boa Obra S.A. (rede fictícia de lojas de material de construção do Sul)',
    fonte: 'relatório anual 2025 da Ferragens Boa Obra S.A.',
    regra: 'compare só a afirmação com a frase citada; não use conhecimento de fora',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', titulo: 'A fonte sustenta?',
      pergunta: 'A frase citada da fonte sustenta a afirmação? Compare só as duas, sem usar conhecimento de fora. Regras: diz a mesma coisa, mesmo com outras palavras → sustenta; confirma uma parte, mas a afirmação acrescenta número, prazo, certeza, recorde ou "todos" que a frase não tem → em_parte; a frase fala de outra coisa e não confirma nem nega o ponto central → nao_sustenta; a frase diz o contrário do ponto central (direção oposta, negação, fato incompatível) → contradiz.',
      opcoes: [
        { id: 'em_parte', rotulo: 'Em parte', icone: '🌗', cor: '#fb923c', desc: 'confirma uma parte, mas a afirmação vai além: acrescenta número, prazo, certeza, recorde ou "todos" que a frase da fonte não diz' },
        { id: 'contradiz', rotulo: 'Contradiz', icone: '❌', cor: '#f87171', desc: 'a frase da fonte diz o contrário do ponto central da afirmação: direção oposta (caiu × subiu), negação ou fato incompatível' },
        { id: 'sustenta', rotulo: 'Sustenta', icone: '✅', cor: '#34d399', desc: 'a frase da fonte diz a mesma coisa que a afirmação, mesmo com outras palavras, e a afirmação não acrescenta nada' },
        { id: 'nao_sustenta', rotulo: 'Não sustenta', icone: '❔', cor: '#94a3b8', desc: 'a frase da fonte fala de outra coisa: não confirma nem nega o ponto central da afirmação' },
      ],
    },
    {
      id: 'exagero', tipo: 'score', titulo: 'Exagero',
      pergunta: 'Quanto a afirmação vai além do que a frase citada permite dizer?',
      niveis: [
        { rotulo: 'nenhum', desc: 'diz o mesmo que a fonte, ou menos: resume, fica mais vaga ou mais cautelosa' },
        { rotulo: 'leve', desc: 'estica um pouco: arredonda um número ou generaliza de leve' },
        { rotulo: 'forte', desc: 'vai muito além: inventa número, prazo, certeza, recorde ou "todos", ou afirma o que a fonte não diz' },
      ],
    },
  ],

  fluxo: {
    colunas: 'veredito',
    rotuloItem: 'Par para checar',
    rotuloFila: 'Afirmações do rascunho',
    lote: 3,
    ritmo: 3800,
    humano: { limiar: LIMIAR, rotulo: 'Revisão humana', icone: '🙋' },
    cartao: { titulo: 'afirmacao', texto: 'citacao', meta: 'onde' },
    avatar: '📝',
    entrada: { placeholder: 'Cole a afirmação e a frase da fonte. Ex.: Afirmação: as vendas dobraram. Fonte: "as vendas cresceram 18% no ano".', botao: 'Checar' },
    rotuloFeitos: 'afirmações',
  },
  textoItem: (item) => `afirmação: "${item.afirmacao}" | frase citada da fonte: "${item.fonte}"`,

  aoDecidir(item, resp, extra) {
    const a = resp && resp.veredito;
    if (!a || !a.probabilities) return;
    extra.total = (extra.total || 0) + 1;
    if (Math.max(...Object.values(a.probabilities)) < LIMIAR) extra.revisar = (extra.revisar || 0) + 1;
    else if (a.choice !== 'sustenta') extra.problemas = (extra.problemas || 0) + 1;
  },

  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'afirmações com problema', valor: `${extra.problemas || 0} de ${extra.total}` },
      { rotulo: 'para revisão humana', valor: String(extra.revisar || 0) },
    ];
  },

  dados: [
    par('f1', 'A receita da Boa Obra cresceu 12% em 2025.', 'A receita líquida atingiu R$ 1,12 bilhão em 2025, alta de 12% sobre 2024.', 4, { veredito: 'sustenta', exagero: 0 }),
    par('f2', 'A dívida da empresa caiu em 2025.', 'O endividamento líquido aumentou 15% no ano, para R$ 310 milhões, por causa da compra da fábrica de Joinville.', 9, { veredito: 'contradiz' }),
    par('f3', 'A Boa Obra vai abrir 30 lojas no Nordeste em 2026.', 'A companhia avalia oportunidades de expansão para o Nordeste nos próximos anos.', 15, { veredito: 'em_parte', exagero: 2 }),
    par('f4', 'A Boa Obra demitiu 200 funcionários em 2025.', 'O quadro de colaboradores encerrou o ano com 2.140 pessoas.', 21, { veredito: 'nao_sustenta' }),
    par('f5', 'Um quarto das vendas já vem da internet.', 'As vendas online responderam por 25% da receita em 2025.', 6, { veredito: 'sustenta', exagero: 0 }),
    par('f6', 'A empresa saiu do Paraná.', 'Em 2025, a Boa Obra inaugurou 4 lojas no Paraná.', 12, { veredito: 'contradiz' }),
    par('f7', 'Todas as lojas da rede venderam mais em 2025.', 'As vendas nas mesmas lojas cresceram 6% na média da rede.', 5, { veredito: 'em_parte' }),
    par('f8', 'As vendas para construtoras cresceram em 2025.', 'O segmento de construtoras representou 18% da receita do ano.', 7, { veredito: 'nao_sustenta' }),
    par('f9', 'A margem bruta caiu, pressionada pelo custo do aço e do frete.', 'A margem bruta recuou de 34% para 31%, pressionada pelo custo do aço e do frete.', 8, { veredito: 'sustenta', exagero: 0 }),
    par('f10', 'A presidente Marta Albuquerque deixa o cargo em 2026.', 'O conselho reconduziu Marta Albuquerque como presidente executiva até 2028.', 3, { veredito: 'contradiz' }),
    par('f11', 'A Boa Obra vai pagar dividendos recordes.', 'O conselho aprovou a distribuição de R$ 24 milhões em dividendos.', 10, { veredito: 'em_parte', exagero: 2 }),
    par('f12', 'A empresa passou a usar energia solar em parte das operações.', 'Três centros de distribuição passaram a usar painéis solares, que cobrem 40% do consumo deles.', 18, { veredito: 'sustenta', exagero: 0 }),
    par('f13', 'O aplicativo de fidelidade foi um sucesso estrondoso.', 'O aplicativo de fidelidade, lançado em março, terminou o ano com 380 mil clientes ativos.', 14),
    par('f14', 'A empresa enfrenta um processo trabalhista coletivo de grande porte.', 'Segundo a administração, não há processos trabalhistas relevantes em andamento.', 22, { veredito: 'contradiz' }),
    par('f15', 'A Boa Obra comprou uma fábrica em Joinville.', 'O endividamento líquido aumentou 15% no ano, para R$ 310 milhões, por causa da compra da fábrica de Joinville.', 9, { veredito: 'sustenta', exagero: 0 }),
    par('f16', 'A Boa Obra só começou a vender pela internet em 2025.', 'As vendas online, que existem desde 2019, responderam por 25% da receita em 2025.', 6, { veredito: 'contradiz' }),
    par('f17', 'A Boa Obra é a maior rede de material de construção do Brasil.', 'A Boa Obra está entre as cinco maiores redes de material de construção do Sul do país.', 2, { exagero: 2 }),
    par('f18', 'A empresa vai abrir capital na bolsa em 2026.', 'A Boa Obra encerrou 2025 com R$ 140 milhões em caixa.', 11, { veredito: 'nao_sustenta' }),
  ],
};

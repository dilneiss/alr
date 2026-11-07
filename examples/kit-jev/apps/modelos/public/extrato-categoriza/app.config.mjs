// Extrato que se Categoriza — cada linha crua do extrato ("PAG*RANGOJA DELIVERY", "DARF 0190") vai para a categoria certa, com "todo mês?" e "deduz no IR?".
// Para adaptar: troque as categorias (as do seu orçamento ou plano de contas) e cole as linhas do seu extrato; as somas ficam com o código.
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const CATEGORIAS = [
  { id: 'alimentacao', rotulo: 'Alimentação', icone: '🍽️', cor: '#f97316', desc: 'mercado, padaria, açougue, restaurante, lanchonete, delivery de comida' },
  { id: 'moradia', rotulo: 'Casa', icone: '🏠', cor: '#60a5fa', desc: 'aluguel, condomínio, conta de luz, água, gás, internet de casa' },
  { id: 'transporte', rotulo: 'Transporte', icone: '🚗', cor: '#a78bfa', desc: 'combustível, aplicativo de corrida, pedágio, estacionamento, ônibus, metrô' },
  { id: 'saude_educacao', rotulo: 'Saúde e educação', icone: '🩺', cor: '#34d399', desc: 'farmácia, plano de saúde, consulta, psicólogo, exame, dentista, escola, faculdade, curso' },
  { id: 'assinaturas', rotulo: 'Assinaturas', icone: '📺', cor: '#f472b6', desc: 'serviço cobrado todo mês: streaming de vídeo ou música, nuvem, software, aplicativo, academia, clube' },
  { id: 'impostos', rotulo: 'Impostos e taxas', icone: '🧾', cor: '#facc15', desc: 'DARF, DAS do MEI, IPTU, IPVA, taxas e guias do governo' },
  { id: 'outros', rotulo: 'Outros', icone: '💬', cor: '#94a3b8', desc: 'transferência para uma pessoa sem motivo escrito, saque, ou compra que não se encaixa nas outras' },
];

const LINHAS = [
  { id: 'x1', data: '01/10', descricao: 'PIX ENVIADO IMOB CASA FORTE LTDA', valor: -2150.0, esperado: { categoria: 'moradia', recorrente: true, dedutivel_ir: false } },
  { id: 'x2', data: '01/10', descricao: 'PAG*RANGOJA DELIVERY', valor: -67.8, esperado: { categoria: 'alimentacao', recorrente: false, dedutivel_ir: false } },
  { id: 'x3', data: '02/10', descricao: 'DM*TELAPLAY ASSINAT', valor: -39.9, esperado: { categoria: 'assinaturas', recorrente: true, dedutivel_ir: false } },
  { id: 'x4', data: '03/10', descricao: 'DARF 0190 CARNE LEAO', valor: -812.44, esperado: { categoria: 'impostos', dedutivel_ir: false } },
  { id: 'x5', data: '04/10', descricao: 'POSTO ESTRELA DO SUL', valor: -250.0, esperado: { categoria: 'transporte', recorrente: false, dedutivel_ir: false } },
  { id: 'x6', data: '05/10', descricao: 'DROGARIA BOA SAUDE', valor: -86.35, esperado: { categoria: 'saude_educacao', recorrente: false, dedutivel_ir: false } },
  { id: 'x7', data: '05/10', descricao: 'PIX ENVIADO JOAO S', valor: -150.0, esperado: { categoria: 'outros', dedutivel_ir: false } },
  { id: 'x8', data: '06/10', descricao: 'PLANO VIDA PLENA SAUDE', valor: -689.0, esperado: { categoria: 'saude_educacao', recorrente: true, dedutivel_ir: true } },
  { id: 'x9', data: '07/10', descricao: 'VAIJA*CORRIDA', valor: -23.7, esperado: { categoria: 'transporte', recorrente: false } },
  { id: 'x10', data: '08/10', descricao: 'NUVEMDRIVE*200GB', valor: -9.9, esperado: { categoria: 'assinaturas', recorrente: true } },
  { id: 'x11', data: '09/10', descricao: 'SUPERMERC BOM PRECO 0231', valor: -412.18, esperado: { categoria: 'alimentacao', recorrente: false, dedutivel_ir: false } },
  { id: 'x12', data: '10/10', descricao: 'DAS SIMEI 10/2026', valor: -76.6, esperado: { categoria: 'impostos', recorrente: true, dedutivel_ir: false } },
  { id: 'x13', data: '10/10', descricao: 'ENERGIA LUZ DO VALE CONTA 10/26', valor: -198.43, esperado: { categoria: 'moradia', recorrente: true } },
  { id: 'x14', data: '12/10', descricao: 'ACADEMIA CORPO LIVRE MENSAL', valor: -119.9, esperado: { categoria: 'assinaturas', recorrente: true, dedutivel_ir: false } },
  { id: 'x15', data: '13/10', descricao: 'PIX ENVIADO DRA MARINA AZEVEDO PSICOLOGIA', valor: -250.0, esperado: { categoria: 'saude_educacao', dedutivel_ir: true } },
  { id: 'x16', data: '15/10', descricao: 'EC*JRS SERVICOS LTDA', valor: -120.0 }, // ninguém sabe o que é: sem esperado, vai para a pessoa
  { id: 'x17', data: '18/10', descricao: 'ESCOLA VIVER E APRENDER MENSALID', valor: -1340.0, esperado: { categoria: 'saude_educacao', recorrente: true, dedutivel_ir: true } },
  { id: 'x18', data: '20/10', descricao: 'SAQUE 24H 0412', valor: -200.0, esperado: { categoria: 'outros', recorrente: false } },
  { id: 'x19', data: '22/10', descricao: 'SONORIFY*FAMILIA MUSICA', valor: -34.9, esperado: { categoria: 'assinaturas', recorrente: true } },
  { id: 'x20', data: '27/10', descricao: 'IPTU 2026 PARC 10/10 PREF MUN', valor: -143.0, esperado: { categoria: 'impostos', dedutivel_ir: false } },
];

export default {
  id: 'extrato-categoriza',
  titulo: 'Extrato que se Categoriza',
  emoji: '🏦',
  categoria: 'dados',
  ordem: 40,
  resumo: 'Cada linha crua do extrato vai para a categoria certa, com "é todo mês?" e "deduz no IR?", e no fim você vê quanto paga de assinaturas.',
  descricao: '"PAG*RANGOJA DELIVERY", "DM*TELAPLAY" e "DARF 0190" não dizem nada para uma regra de texto. O Jev lê cada lançamento e escolhe a categoria numa lista fechada, marca o que se repete todo mês e o que pode ser deduzido no Imposto de Renda; as somas são do código. A comunidade categorizou 34 meses de extrato em 20 segundos.',
  marcas: ['volume', 'lista fechada'],
  motor: 'fluxo',
  tema: { acento: '#12a679', acento2: '#fcd34d' },
  origem: 'comunidade: 34 meses de contabilidade categorizados em 20 s',

  contexto: {
    conta: 'conta corrente de pessoa física: designer autônoma, MEI, mora de aluguel com uma filha em idade escolar',
    mes: 'outubro de 2026, só as saídas',
  },

  decisoes: [
    {
      id: 'categoria', tipo: 'choice', titulo: 'Categoria',
      pergunta: 'Em qual categoria do orçamento entra este lançamento do extrato? Leia a descrição crua do banco ("PAG*", "PIX ENVIADO", "DM*", "DARF"…) e pense no que foi comprado ou pago. Escolha "outros" quando não dá para saber o que é (ex.: Pix para uma pessoa, sem motivo escrito).',
      opcoes: CATEGORIAS,
    },
    {
      id: 'recorrente', tipo: 'noul', titulo: 'Todo mês', rotulo: 'todo mês', icone: '🔁', tom: 'info', limiar: 0.6,
      pergunta: 'Este gasto se repete todo mês com valor parecido (aluguel, conta de consumo, assinatura, mensalidade, plano, imposto mensal ou parcela)? Compras avulsas (mercado, padaria, delivery, combustível, farmácia, corrida, saque) não contam.',
    },
    {
      id: 'dedutivel_ir', tipo: 'noul', titulo: 'Deduz no IR', rotulo: 'deduz no IR', icone: '🧾', tom: 'bom', limiar: 0.6,
      pergunta: 'Este gasto pode ser deduzido no Imposto de Renda da pessoa física? Deduzem: consulta médica, psicólogo, dentista, exame, plano de saúde, hospital, escola e faculdade, previdência privada PGBL. NÃO deduzem: farmácia e remédio, academia, curso livre, assinaturas, mercado, aluguel, transporte e impostos.',
    },
  ],

  fluxo: {
    colunas: 'categoria',
    rotuloItem: 'Lançamento do extrato',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.7, rotulo: 'Perguntar à dona da conta', icone: '🙋' },
    cartao: { titulo: 'descricao', subtitulo: 'data', valor: 'valor' },
    entrada: { placeholder: 'Cole uma linha do seu extrato (ex.: "PAG*PADARIA CENTRAL 23,50") e veja a categoria…', botao: 'Categorizar' },
    rotuloFeitos: 'lançamentos',
  },

  // o que vai para o Jev: a descrição crua, a data e o valor já formatado (o Jev não faz conta)
  textoItem: (x) => `${x.descricao} — ${x.data} — débito de ${brl(Math.abs(x.valor))}`,

  // somas do código: por categoria, assinaturas, gastos fixos e o que deduz no IR
  aoDecidir(item, resp, extra) {
    if (typeof item.valor !== 'number') return;
    const v = Math.abs(item.valor);
    const c = resp.categoria && resp.categoria.choice;
    if (c) (extra.porCat ||= {})[c] = (extra.porCat[c] || 0) + v;
    if (c === 'assinaturas') extra.assinaturas = (extra.assinaturas || 0) + v;
    if (resp.recorrente && resp.recorrente.noul >= 0.6) extra.fixos = (extra.fixos || 0) + v;
    if (resp.dedutivel_ir && resp.dedutivel_ir.noul >= 0.6) extra.ir = (extra.ir || 0) + v;
  },
  resumoExtra: (extra) => [
    { rotulo: 'assinaturas por mês', valor: brl(extra.assinaturas) },
    { rotulo: 'gastos que se repetem', valor: brl(extra.fixos) },
    { rotulo: 'dedutível no IR', valor: brl(extra.ir) },
  ],

  dados: LINHAS,
};

// Contrato com Lupa — cláusula por cláusula, o Jev separa o que pode seguir, o que merece atenção e o que vai para o advogado.
// Para adaptar: cole o SEU contrato em cláusulas (dados), diga quem assina (contexto) e ajuste os tipos de cláusula. O Jev sinaliza; quem opina é o advogado.
const LIMIAR = 0.7;

export default {
  id: 'contrato-lupa',
  titulo: 'Contrato com Lupa',
  emoji: '🔍',
  categoria: 'juridico',
  ordem: 80,
  resumo: 'Antes de assinar, o Jev lê o contrato cláusula por cláusula e separa: pode seguir, atenção ou levar ao advogado.',
  descricao: 'Cada cláusula é uma decisão separada: o assunto (multa, renovação, foro, exclusividade, dados…), se pesa só para um lado e em que pilha vai. O Jev não dá parecer jurídico (no LegalBench ele foi mal em interpretar): ele só sinaliza o que um advogado precisa ler, e o que vem com dúvida vai direto para o advogado.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#a16207', acento2: '#1d4ed8', modo: 'claro', fonte: 'serif' },
  origem: 'ressalva medida pela comunidade: no LegalBench o Jev foi mal em interpretar, então aqui ele só sinaliza',

  contexto: {
    contrato: 'Contrato de prestação de serviços de marketing digital entre a Agência Faro Digital Ltda. (CONTRATADA, sede em Manaus/AM) e a Doceria Flor de Laranjeira ME (CONTRATANTE, em Campinas/SP)',
    quem_le: 'a dona da doceria, que vai assinar como CONTRATANTE e quer saber o que levar ao advogado',
    limite: 'o Jev não dá parecer jurídico: só separa as cláusulas para leitura',
  },

  decisoes: [
    {
      id: 'nivel', tipo: 'choice', titulo: 'Pilha',
      pergunta: 'Para a doceria, que vai assinar como CONTRATANTE, em que pilha esta cláusula deve ir? Não dê parecer: só separe para leitura.',
      opcoes: [
        { id: 'ok', rotulo: 'Pode seguir', icone: '✅', cor: '#15803d', tom: 'bom', desc: 'cláusula comum e equilibrada: objeto, preço claro, reajuste anual por índice oficial, multa de atraso de até 2%, obrigações dos dois lados' },
        { id: 'atencao', rotulo: 'Atenção', icone: '🟡', cor: '#b45309', tom: 'medio', desc: 'comum, mas vale anotar ou negociar: renovação automática com aviso razoável, multa igual para os dois lados, prazo de aviso apertado' },
        { id: 'advogado', rotulo: 'Levar ao advogado', icone: '🧑‍⚖️', cor: '#b91c1c', tom: 'ruim', desc: 'pesa muito contra a doceria ou cria risco: multa alta só de um lado, saída livre só para a agência, exclusividade depois do fim, uso de dados sem consentimento, reajuste sem limite, isenção total de culpa, foro longe da doceria' },
      ],
    },
    {
      id: 'tipo', tipo: 'choice', titulo: 'Assunto',
      pergunta: 'Qual é o assunto principal desta cláusula?',
      opcoes: [
        { id: 'multa', rotulo: 'Multa', icone: '💸', cor: '#b45309', desc: 'multa por atraso ou por descumprimento (multa por sair antes do fim é rescisão)' },
        { id: 'renovacao_automatica', rotulo: 'Renovação automática', icone: '🔁', cor: '#7c3aed', desc: 'renovação sem contrato novo e as regras do aviso para não renovar' },
        { id: 'foro', rotulo: 'Foro', icone: '🏛️', cor: '#334155', desc: 'cidade ou tribunal onde se resolve um processo' },
        { id: 'exclusividade', rotulo: 'Exclusividade', icone: '🔒', cor: '#be123c', desc: 'proibição de contratar concorrentes ou outros fornecedores' },
        { id: 'lgpd', rotulo: 'Dados (LGPD)', icone: '🛡️', cor: '#0f766e', desc: 'uso, guarda ou compartilhamento de dados pessoais de clientes' },
        { id: 'reajuste', rotulo: 'Reajuste', icone: '📈', cor: '#1d4ed8', desc: 'aumento do preço: índice, data, limite' },
        { id: 'rescisao', rotulo: 'Rescisão', icone: '🚪', cor: '#9a3412', desc: 'como e quando cada lado pode encerrar o contrato, inclusive a multa por sair antes do fim' },
        { id: 'outro', rotulo: 'Outro', icone: '📄', cor: '#57534e', desc: 'objeto, preço, pagamento, prazo de entrega, aprovação, direitos autorais, sigilo, responsabilidade' },
      ],
    },
    {
      id: 'desequilibrada', tipo: 'noul', titulo: 'Só de um lado', rotulo: 'pesa só para a doceria', icone: '⚖️', tom: 'ruim', limiar: 0.5,
      pergunta: 'A cláusula dá um direito ou uma vantagem só para a agência, sem o mesmo para a doceria, ou impõe uma obrigação ou um risco só para a doceria?',
    },
  ],

  fluxo: {
    colunas: 'nivel',
    rotuloItem: 'Cláusula',
    lote: 4,
    ritmo: 5000,
    humano: { limiar: LIMIAR, rotulo: 'Na dúvida, advogado', icone: '❓' },
    cartao: { titulo: 'titulo', texto: 'texto', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma cláusula do seu contrato e veja em que pilha ela vai…', botao: 'Ler cláusula' },
    rotuloFeitos: 'cláusulas',
  },

  aoDecidir(item, resp, extra) {
    const a = resp.nivel;
    if (a && (a.choice === 'advogado' || (a.probabilities?.[a.choice] ?? 0) < LIMIAR)) extra.advogado = (extra.advogado || 0) + 1;
    if (resp.desequilibrada && resp.desequilibrada.noul >= 0.5) extra.deseq = (extra.deseq || 0) + 1;
  },
  resumoExtra(extra, estado) {
    return [
      { rotulo: 'para o advogado ler', valor: `${extra.advogado || 0} de ${estado.feitos}` },
      { rotulo: 'pesam só para a doceria', valor: String(extra.deseq || 0) },
    ];
  },

  dados: [
    { id: 'c1', avatar: '📄', titulo: 'Cláusula 1ª — Objeto', texto: 'A CONTRATADA fará a gestão das redes sociais da CONTRATANTE (Instagram e Facebook), com 12 publicações por mês e um relatório mensal de resultados.', esperado: { nivel: 'ok', tipo: 'outro', desequilibrada: false } },
    { id: 'c2', avatar: '📄', titulo: 'Cláusula 2ª — Prazo', texto: 'Este contrato vale por 12 meses e será renovado automaticamente por iguais períodos, salvo aviso contrário de qualquer das partes com 30 dias de antecedência.', esperado: { nivel: 'atencao', tipo: 'renovacao_automatica', desequilibrada: false } },
    { id: 'c3', avatar: '📄', titulo: 'Cláusula 3ª — Preço', texto: 'A CONTRATANTE pagará R$ 2.800,00 por mês, por boleto, com vencimento todo dia 10.', esperado: { nivel: 'ok', tipo: 'outro', desequilibrada: false } },
    { id: 'c4', avatar: '📄', titulo: 'Cláusula 4ª — Reajuste', texto: 'O valor mensal será reajustado a cada 12 meses pela variação do IPCA.', esperado: { nivel: 'ok', tipo: 'reajuste', desequilibrada: false } },
    { id: 'c5', avatar: '📄', titulo: 'Cláusula 5ª — Reajuste extraordinário', texto: 'A CONTRATADA poderá reajustar o valor a qualquer momento, por simples aviso por e-mail, sem limite de percentual.', esperado: { nivel: 'advogado', tipo: 'reajuste', desequilibrada: true } },
    { id: 'c6', avatar: '📄', titulo: 'Cláusula 6ª — Atraso', texto: 'O atraso no pagamento gera multa de 2% e juros de 1% ao mês sobre o valor devido.', esperado: { nivel: 'ok', tipo: 'multa' } },
    { id: 'c7', avatar: '📄', titulo: 'Cláusula 7ª — Rescisão pela CONTRATANTE', texto: 'Se a CONTRATANTE encerrar o contrato antes do fim do prazo, pagará multa de 100% das mensalidades que faltarem.', esperado: { nivel: 'advogado', tipo: 'rescisao', desequilibrada: true } },
    { id: 'c8', avatar: '📄', titulo: 'Cláusula 8ª — Rescisão pela CONTRATADA', texto: 'A CONTRATADA poderá encerrar o contrato a qualquer tempo, sem multa, com aviso de 5 dias.', esperado: { nivel: 'advogado', tipo: 'rescisao', desequilibrada: true } },
    { id: 'c9', avatar: '📄', titulo: 'Cláusula 9ª — Exclusividade', texto: 'Durante o contrato e por 24 meses após o fim, a CONTRATANTE não poderá contratar outra agência ou profissional de marketing digital.', esperado: { nivel: 'advogado', tipo: 'exclusividade', desequilibrada: true } },
    { id: 'c10', avatar: '📄', titulo: 'Cláusula 10ª — Uso de dados', texto: 'A CONTRATADA poderá usar a lista de clientes da CONTRATANTE (nomes, telefones e e-mails) em campanhas próprias e de parceiros, sem pedir novo consentimento.', esperado: { nivel: 'advogado', tipo: 'lgpd', desequilibrada: true } },
    { id: 'c11', avatar: '📄', titulo: 'Cláusula 11ª — Proteção de dados', texto: 'As partes cumprirão a LGPD; os dados de clientes serão usados só para executar este contrato e apagados ao final.', esperado: { nivel: 'ok', tipo: 'lgpd', desequilibrada: false } },
    { id: 'c12', avatar: '📄', titulo: 'Cláusula 12ª — Foro', texto: 'Fica eleito o foro de Manaus/AM, sede da CONTRATADA, para resolver qualquer questão deste contrato, com renúncia a qualquer outro.', esperado: { nivel: ['atencao', 'advogado'], tipo: 'foro', desequilibrada: true } },
    { id: 'c13', avatar: '📄', titulo: 'Cláusula 13ª — Responsabilidade', texto: 'A CONTRATADA não responde por nenhum dano, inclusive vazamento de dados ou perda de seguidores, mesmo que causado por culpa dela.', esperado: { nivel: 'advogado', desequilibrada: true } },
    { id: 'c14', avatar: '📄', titulo: 'Cláusula 14ª — Aprovação', texto: 'Cada publicação será enviada à CONTRATANTE para aprovação com 48 horas de antecedência.', esperado: { nivel: 'ok', tipo: 'outro', desequilibrada: false } },
    { id: 'c15', avatar: '📄', titulo: 'Cláusula 15ª — Descumprimento', texto: 'A parte que descumprir qualquer cláusula pagará à outra multa de 10% do valor anual do contrato.', esperado: { nivel: 'atencao', tipo: 'multa', desequilibrada: false } },
    { id: 'c16', avatar: '📄', titulo: 'Cláusula 16ª — Direitos autorais', texto: 'As artes e os textos criados passam a ser da CONTRATANTE depois de pagos.', esperado: { nivel: 'ok', tipo: 'outro', desequilibrada: false } },
    { id: 'c17', avatar: '📄', titulo: 'Cláusula 17ª — Aviso de não renovação', texto: 'O aviso para não renovar só valerá se enviado por carta registrada entre 90 e 60 dias antes do fim do prazo.', esperado: { nivel: ['atencao', 'advogado'], tipo: 'renovacao_automatica' } },
    { id: 'c18', avatar: '📄', titulo: 'Cláusula 18ª — Sigilo', texto: 'As partes manterão em sigilo as informações trocadas, durante o contrato e por 2 anos depois.', esperado: { nivel: 'ok', tipo: 'outro', desequilibrada: false } },
  ],
};

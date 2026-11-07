// Organizador de Arquivos — cada arquivo da pasta Downloads vai para a pasta certa pelo nome E pelo conteúdo, e o lixo é marcado.
// Para adaptar: troque as pastas (as suas) e gere a lista com nome, tamanho e um trecho do conteúdo de cada arquivo.
const ARQUIVOS = [
  { id: 'f1', nome: 'nf_servico_000482.pdf', tamanho: '182 KB', mb: 0.18, data: '14/10/2026', trecho: 'NFS-e nº 000482 · Tomador: Padaria Pão Dourado · ensaio fotográfico de produtos · R$ 1.800,00', esperado: { pasta: 'financeiro', pode_apagar: false } },
  { id: 'f2', nome: 'Contrato_casamento_Luana_e_Rafael_ASSINADO.pdf', tamanho: '1,2 MB', mb: 1.2, data: '02/09/2026', trecho: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS · Cláusula 4ª — entrega das fotos em até 30 dias após o evento…', esperado: { pasta: 'contratos', pode_apagar: false } },
  { id: 'f3', nome: 'IMG_20261003_142311.jpg', tamanho: '4,8 MB', mb: 4.8, data: '03/10/2026', trecho: 'foto: fachada da Doceria Carla com o letreiro novo, feita para o catálogo da loja', esperado: { pasta: 'projetos', pode_apagar: false } },
  { id: 'f4', nome: 'IMG_8812.HEIC', tamanho: '3,1 MB', mb: 3.1, data: '22/08/2026', trecho: 'foto: aniversário de 80 anos da vó Teresa, a família reunida em volta da mesa', esperado: { pasta: 'fotos', pode_apagar: false } },
  { id: 'f5', nome: 'Setup_EditorPro_v3.2.dmg', tamanho: '1,4 GB', mb: 1430, data: '10/06/2026', trecho: 'instalador do programa de edição de fotos (o programa já está instalado no computador)', esperado: { pasta: 'lixo', pode_apagar: true } },
  { id: 'f6', nome: 'RG_frente_verso.pdf', tamanho: '640 KB', mb: 0.64, data: '15/01/2026', trecho: 'REGISTRO GERAL · Nome: Marina Couto · Data de expedição: 03/02/2015', esperado: { pasta: 'documentos_pessoais', pode_apagar: false } },
  { id: 'f7', nome: 'Aula 3 - Iluminação de estúdio (anotações).docx', tamanho: '96 KB', mb: 0.1, data: '18/09/2026', trecho: 'Curso de fotografia de produto · luz principal a 45 graus, rebatedor do lado oposto, fundo infinito…', esperado: { pasta: 'estudos', pode_apagar: false } },
  { id: 'f8', nome: 'extrato_setembro_2026.pdf', tamanho: '210 KB', mb: 0.21, data: '01/10/2026', trecho: 'Extrato de conta corrente · saldo anterior R$ 8.210,00 · PIX RECEBIDO PADARIA PAO DOURADO 1.800,00…', esperado: { pasta: 'financeiro', pode_apagar: false } },
  { id: 'f9', nome: 'Contrato_casamento_Luana_e_Rafael_ASSINADO (1).pdf', tamanho: '1,2 MB', mb: 1.2, data: '02/09/2026', trecho: 'cópia idêntica do contrato assinado, baixada de novo', esperado: { pasta: 'lixo', pode_apagar: true } },
  { id: 'f10', nome: 'Proposta_Café_Serra_Alta_v4_FINAL.pdf', tamanho: '2,3 MB', mb: 2.3, data: '11/10/2026', trecho: 'Proposta para o Café Serra Alta: ensaio de 40 produtos para a loja virtual · prazo de 15 dias · R$ 4.800,00', esperado: { pasta: 'projetos', pode_apagar: false } },
  { id: 'f11', nome: 'CNH_digital.pdf', tamanho: '300 KB', mb: 0.3, data: '20/03/2026', trecho: 'CARTEIRA NACIONAL DE HABILITAÇÃO · MARINA COUTO · validade 2031', esperado: { pasta: 'documentos_pessoais', pode_apagar: false } },
  { id: 'f12', nome: 'boleto_DAS_set2026.pdf', tamanho: '90 KB', mb: 0.09, data: '14/10/2026', trecho: 'Documento de Arrecadação do Simples Nacional · vencimento 20/10/2026 · R$ 76,60', esperado: { pasta: 'financeiro', pode_apagar: false } },
  { id: 'f13', nome: 'Ebook - 50 poses para retrato.pdf', tamanho: '18 MB', mb: 18, data: '05/05/2026', trecho: 'material de estudo sobre poses e direção de modelo em ensaios de retrato', esperado: { pasta: 'estudos', pode_apagar: false } },
  { id: 'f14', nome: 'briefing_EcoPack_catalogo2027.docx', tamanho: '120 KB', mb: 0.12, data: '16/10/2026', trecho: 'Briefing: 60 embalagens em fundo branco, entrega das fotos tratadas até 30/11', esperado: { pasta: 'projetos', pode_apagar: false } },
  { id: 'f15', nome: 'IMG_7710.jpg', tamanho: '5,2 MB', mb: 5.2, data: '12/01/2026', trecho: 'foto: pôr do sol na praia de Ubatuba, nas férias de janeiro', esperado: { pasta: 'fotos', pode_apagar: false } },
  { id: 'f16', nome: 'download (3).crdownload', tamanho: '0 KB', mb: 0, data: '19/10/2026', trecho: 'download incompleto, arquivo vazio', esperado: { pasta: 'lixo', pode_apagar: true } },
  { id: 'f17', nome: 'Distrato_aluguel_estudio_antigo.pdf', tamanho: '410 KB', mb: 0.41, data: '30/06/2026', trecho: 'DISTRATO · as partes encerram o contrato de locação da sala 12 a partir de 01/07/2026…', esperado: { pasta: 'contratos', pode_apagar: false } },
  { id: 'f18', nome: 'Black Friday Lentes - 70% OFF.html', tamanho: '2,1 MB', mb: 2.1, data: '15/10/2026', trecho: 'página de propaganda de uma loja de lentes, salva sem querer', esperado: { pasta: 'lixo', pode_apagar: true } },
  { id: 'f19', nome: 'recibo_aluguel_estudio_out2026.pdf', tamanho: '150 KB', mb: 0.15, data: '05/10/2026', trecho: 'Recebi de Marina Couto a quantia de R$ 1.500,00 referente ao aluguel do estúdio em outubro/2026', esperado: { pasta: 'financeiro', pode_apagar: false } },
  { id: 'f20', nome: 'Documento sem título.docx', tamanho: '14 KB', mb: 0.01, data: '17/10/2026', trecho: 'lista: comprar fita crepe, ligar para a Luana, pagar o DAS, renovar a CNH, estudar luz de recorte', esperado: { pode_apagar: false } },
];

const ICONE = { pdf: '📄', jpg: '🖼️', heic: '🖼️', png: '🖼️', dmg: '📦', docx: '📝', html: '🌐', crdownload: '⏳' };
const tamanho = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(mb)} MB`);

export default {
  id: 'organizador-arquivos',
  titulo: 'Organizador de Arquivos',
  emoji: '🗂️',
  categoria: 'dados',
  ordem: 44,
  resumo: 'Cada arquivo da pasta Downloads vai para a pasta certa pelo que ele É, não pela extensão, e o lixo é marcado para apagar.',
  descricao: 'Duas fotos ".jpg" podem ir para lugares diferentes: a fachada que você fotografou para um cliente vai para Projetos; o aniversário da vó vai para Fotos. O Jev lê o nome e um trecho de cada arquivo, escolhe a pasta numa lista fechada e marca o que pode ir para a lixeira; o que fica em dúvida espera por você.',
  marcas: ['volume', 'lista fechada'],
  motor: 'fluxo',
  tema: { acento: '#e8b10c', acento2: '#60a5fa' },

  contexto: {
    pessoa: 'Marina Couto, fotógrafa autônoma (Studio Couto, fictício)',
    pasta: 'Downloads com 2 anos de arquivos de trabalho e da vida pessoal misturados',
  },

  decisoes: [
    {
      id: 'pasta', tipo: 'choice', titulo: 'Pasta',
      pergunta: 'Em qual pasta este arquivo deve ficar? Leia o nome e o trecho do conteúdo, não só a extensão. Regras: contrato, aditivo ou distrato → contratos, mesmo quando é de um cliente; foto de trabalho feita para cliente → projetos; foto pessoal ou de família → fotos pessoais; proposta, briefing ou cronograma de cliente → projetos; nota, boleto, extrato, recibo e imposto → financeiro; instalador já usado, cópia repetida "(1)", download incompleto e propaganda → lixo.',
      opcoes: [
        { id: 'financeiro', rotulo: 'Financeiro', icone: '💰', cor: '#10b981', desc: 'nota fiscal, boleto, extrato, recibo, comprovante, guia de imposto' },
        { id: 'contratos', rotulo: 'Contratos', icone: '📜', cor: '#a78bfa', desc: 'contrato, aditivo, distrato, termo assinado' },
        { id: 'projetos', rotulo: 'Projetos de clientes', icone: '🛠️', cor: '#f59e0b', desc: 'briefing, proposta, orçamento enviado a cliente, cronograma, fotos e arquivos de um trabalho para cliente (o contrato assinado vai para Contratos)' },
        { id: 'documentos_pessoais', rotulo: 'Documentos pessoais', icone: '🪪', cor: '#60a5fa', desc: 'RG, CNH, CPF, passaporte, certidão, comprovante de endereço' },
        { id: 'fotos', rotulo: 'Fotos pessoais', icone: '🖼️', cor: '#f472b6', desc: 'fotos de família, viagem, festa, amigos e bichos de estimação' },
        { id: 'estudos', rotulo: 'Estudos', icone: '📚', cor: '#22d3ee', desc: 'apostila, aula, anotação de curso, e-book, artigo para aprender' },
        { id: 'lixo', rotulo: 'Lixo', icone: '🗑️', cor: '#64748b', desc: 'instalador já usado, cópia repetida com "(1)", download incompleto, arquivo temporário, propaganda' },
      ],
    },
    {
      id: 'pode_apagar', tipo: 'noul', titulo: 'Pode apagar', rotulo: 'pode apagar', icone: '🗑️', tom: 'ruim', limiar: 0.6,
      pergunta: 'Este arquivo pode ir para a lixeira sem perder nada? Sim para: instalador já usado, cópia repetida de um arquivo que já existe (nome com "(1)", mesmo que seja cópia de um contrato: o original fica), download incompleto, arquivo temporário, propaganda. Não para o original de documentos, contratos, notas, trabalhos de cliente e fotos pessoais.',
    },
  ],

  fluxo: {
    colunas: 'pasta',
    rotuloItem: 'Arquivo',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.7, rotulo: 'Você decide', icone: '🙋' },
    cartao: { titulo: 'nome', subtitulo: 'tamanho', texto: 'trecho', meta: 'data', avatar: 'avatar' },
    entrada: { placeholder: 'Escreva o nome de um arquivo e o que tem nele (ex.: "scan001.pdf — boleto da escola") e veja a pasta…', botao: 'Organizar' },
    rotuloFeitos: 'arquivos',
  },

  // o que vai para o Jev: nome, tamanho, data e um trecho do conteúdo
  textoItem: (f) => `Arquivo "${f.nome}" (${f.tamanho}, de ${f.data}) — conteúdo: ${f.trecho}`,

  // contas do código: espaço liberado pelo que pode ir para a lixeira e pastas usadas
  aoDecidir(item, resp, extra) {
    const p = resp.pasta && resp.pasta.choice;
    if (p) (extra.pastas ||= {})[p] = true;
    if (typeof item.mb === 'number' && resp.pode_apagar && resp.pode_apagar.noul >= 0.6) { extra.mb = (extra.mb || 0) + item.mb; extra.apagar = (extra.apagar || 0) + 1; }
  },
  resumoExtra: (extra) => [
    { rotulo: 'para a lixeira', valor: `${extra.apagar || 0} arquivos` },
    { rotulo: 'espaço liberado', valor: tamanho(extra.mb || 0) },
    { rotulo: 'pastas usadas', valor: String(Object.keys(extra.pastas || {}).length) },
  ],

  dados: ARQUIVOS.map((f) => ({ ...f, avatar: ICONE[f.nome.split('.').pop().toLowerCase()] || '📄' })),
};

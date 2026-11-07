// Jornal Só Seu — feeds e newsletters filtrados pelos SEUS interesses, escritos em português comum.
// Para adaptar: troque os interesses (contexto.interesses, editável na tela), os temas e os artigos de exemplo.

export default {
  id: 'jornal-so-seu',
  titulo: 'Jornal Só Seu',
  emoji: '🗞️',
  categoria: 'radares',
  ordem: 77,
  resumo: 'Os artigos de vários jornais e newsletters chegam juntos e só fica o que bate com os seus interesses, escritos do seu jeito.',
  descricao: 'Você descreve o que quer e o que não quer ler em português comum. O Jev lê cada artigo (veículo, título e resumo) e decide se ele fica no seu jornal, com o tema como motivo. Rodando a centavos por mil artigos, dá para filtrar todas as fontes, não só uma.',
  marcas: ['volume'],
  motor: 'fluxo',
  tema: { acento: '#8c2f39', acento2: '#2b6777', modo: 'claro', fonte: 'serif' },
  origem: 'IDEIAS-100-APPS #77 — ideia sem dono da lista awesome-jev',

  contexto: {
    interesses: 'Moro em Curitiba. Quero ler: ciência e espaço; tecnologia de verdade (lançamentos, testes, como as coisas funcionam); economia que mexe no meu bolso (juros, inflação, preço da gasolina e da comida); notícias de Curitiba; ciclismo. NÃO quero: fofoca de famosos, novela e reality show, futebol, horóscopo e criptomoedas.',
  },
  editavel: { campo: 'interesses', rotulo: 'Seus interesses (o Jev lê isto)', ajuda: 'Escreva do seu jeito. Ex.: tire "futebol" do NÃO quero e aperte ▶ de novo.' },

  decisoes: [
    {
      id: 'irrelevante', tipo: 'noul', titulo: 'Fora do seu jornal', rotulo: 'fora do jornal', limiar: 0.6,
      pergunta: 'Pelos interesses da pessoa (contexto.interesses), este artigo deve SAIR do jornal dela? Responda sim se o assunto está na lista do que ela NÃO quer, ou se não tem nada a ver com o que ela quer ler.',
    },
    {
      id: 'tema', tipo: 'choice', titulo: 'Tema',
      pergunta: 'Qual é o tema principal deste artigo?',
      opcoes: [
        { id: 'ciencia', rotulo: 'Ciência', icone: '🔭', desc: 'ciência, espaço, pesquisa, natureza e meio ambiente' },
        { id: 'tecnologia', rotulo: 'Tecnologia', icone: '💻', desc: 'lançamentos, testes e funcionamento de aparelhos, apps e IA' },
        { id: 'economia', rotulo: 'Economia', icone: '💵', desc: 'juros, inflação, preços, salários, empregos e impostos' },
        { id: 'cidade', rotulo: 'Curitiba', icone: '🌲', desc: 'notícias locais de Curitiba: transporte, parques, obras, serviços da cidade' },
        { id: 'esporte', rotulo: 'Esporte', icone: '🏅', desc: 'futebol, ciclismo e outros esportes' },
        { id: 'famosos', rotulo: 'Famosos', icone: '🌟', desc: 'celebridades, novela, reality show e fofoca' },
        { id: 'horoscopo', rotulo: 'Horóscopo', icone: '🔮', desc: 'horóscopo, signos e astrologia' },
        { id: 'cripto', rotulo: 'Cripto', icone: '🪙', desc: 'bitcoin, criptomoedas e tokens' },
        { id: 'outro', rotulo: 'Outro', icone: '•', desc: 'nenhum dos temas acima (moda, culinária, turismo…)' },
      ],
    },
  ],

  fluxo: {
    layout: 'feed',
    rotuloItem: 'Artigo',
    lote: 4,
    ritmo: 4600,
    ocultar: { decisao: 'irrelevante', limiar: 0.6, motivo: 'tema', rotuloMostrar: 'no seu jornal', rotuloEsconder: 'tirados pelo Jev' },
    cartao: { titulo: 'veiculo', subtitulo: 'secao', texto: 'texto', meta: 'tempo', avatar: 'avatar' },
    entrada: { placeholder: 'Cole o título e o resumo de um artigo e veja se ele entraria no seu jornal…', botao: 'Testar' },
    rotuloFeitos: 'artigos',
  },
  textoItem: (it) => `${it.titulo}. ${it.resumo} (${it.veiculo}, seção ${it.secao})`,

  dados: [
    { id: 'j1', veiculo: 'Gazeta do Pinhão', secao: 'Cidade', tempo: '07:10', avatar: '🌲', titulo: 'Linha de ônibus elétrico liga o Centro ao Bairro Novo a partir de segunda', resumo: 'São 12 ônibus novos, com tarifa igual à das outras linhas e intervalo de 10 minutos no horário de pico.', esperado: { irrelevante: false, tema: 'cidade' } },
    { id: 'j2', veiculo: 'Esporte Total', secao: 'Futebol', tempo: '07:15', avatar: '⚽', titulo: 'Clássico termina empatado e time da capital segue fora do G4', resumo: 'O gol de empate saiu nos acréscimos, de pênalti, e a torcida reclamou da arbitragem.', esperado: { irrelevante: true, tema: 'esporte' } },
    { id: 'j3', veiculo: 'Ciência Hoje em Dia', secao: 'Espaço', tempo: '07:22', avatar: '🔭', titulo: 'Sonda brasileira capta as primeiras imagens de uma cratera no polo sul da Lua', resumo: 'As fotos ajudam a procurar gelo de água, que pode abastecer bases no futuro.', esperado: { irrelevante: false, tema: 'ciencia' } },
    { id: 'j4', veiculo: 'Revista Celebridades', secao: 'Fofoca', tempo: '07:30', avatar: '🌟', titulo: 'Atriz de novela anuncia fim do casamento em post misterioso', resumo: 'Fãs ficaram divididos e o ex-marido ainda não comentou.', esperado: { irrelevante: true, tema: 'famosos' } },
    { id: 'j5', veiculo: 'Economia & Você', secao: 'Seu bolso', tempo: '07:41', avatar: '💳', titulo: 'Juros do cartão rotativo sobem pelo terceiro mês seguido', resumo: 'Veja como trocar a dívida do cartão por um empréstimo mais barato.', esperado: { irrelevante: false, tema: 'economia' } },
    { id: 'j6', veiculo: 'Astral Diário', secao: 'Horóscopo', tempo: '07:45', avatar: '🔮', titulo: 'Horóscopo da semana: Mercúrio retrógrado mexe com as suas finanças', resumo: 'Os signos de terra devem evitar compras por impulso até sexta.', esperado: { irrelevante: true, tema: 'horoscopo' } },
    { id: 'j7', veiculo: 'Portal Byte', secao: 'Testes', tempo: '07:52', avatar: '📱', titulo: 'Testamos o novo celular intermediário da Kronos: a bateria aguenta dois dias', resumo: 'A câmera decepciona à noite, mas a tela e a bateria valem o preço.', esperado: { irrelevante: false, tema: 'tecnologia' } },
    { id: 'j8', veiculo: 'Cripto Agora', secao: 'Mercado', tempo: '08:01', avatar: '🪙', titulo: 'Bitcoin dispara 12% e investidores falam em nova alta histórica', resumo: 'A alta veio depois de um grande fundo anunciar compras da moeda.', esperado: { irrelevante: true, tema: 'cripto' } },
    { id: 'j9', veiculo: 'Pedal Brasil', secao: 'Ciclismo', tempo: '08:09', avatar: '🚴', titulo: 'Volta Ciclística do Paraná termina domingo com etapa em Curitiba', resumo: 'O percurso final passa pelo Parque Barigui e pelo Centro Cívico; veja as ruas fechadas.', esperado: { irrelevante: false, tema: ['esporte', 'cidade'] } },
    { id: 'j10', veiculo: 'Reality News', secao: 'TV', tempo: '08:14', avatar: '📺', titulo: 'Eliminado do reality diz que foi injustiçado pela edição', resumo: 'O participante deu entrevista e prometeu contar tudo nas redes.', esperado: { irrelevante: true, tema: 'famosos' } },
    { id: 'j11', veiculo: 'Gazeta do Pinhão', secao: 'Economia', tempo: '08:20', avatar: '⛽', titulo: 'Preço da gasolina cai 3% nos postos de Curitiba', resumo: 'O litro mais barato da cidade está em postos do Boqueirão e do Pinheirinho.', esperado: { irrelevante: false, tema: ['economia', 'cidade'] } },
    { id: 'j12', veiculo: 'Esporte Total', secao: 'Futebol', tempo: '08:26', avatar: '⚽', titulo: 'Técnico do Pinheirense é demitido após a quinta derrota seguida', resumo: 'A diretoria já negocia com dois nomes para o restante do campeonato.', esperado: { irrelevante: true, tema: 'esporte' } },
    { id: 'j13', veiculo: 'Ciência Hoje em Dia', secao: 'Natureza', tempo: '08:33', avatar: '🌱', titulo: 'Araucárias jovens crescem mais rápido em áreas reflorestadas, mostra estudo', resumo: 'Pesquisadores mediram 2 mil árvores durante oito anos no interior do Paraná.', esperado: { irrelevante: false, tema: 'ciencia' } },
    { id: 'j14', veiculo: 'Portal Byte', secao: 'Explica', tempo: '08:40', avatar: '🧠', titulo: 'Como funciona o chip que lê sinais do cérebro, explicado em 5 desenhos', resumo: 'Do eletrodo ao computador: o caminho do sinal e o que ainda não funciona.', esperado: { irrelevante: false, tema: ['tecnologia', 'ciencia'] } },
    { id: 'j15', veiculo: 'Tudo de Fofoca', secao: 'Famosos', tempo: '08:47', avatar: '🎤', titulo: 'Cantor sertanejo aparece com visual novo e fãs não aprovam', resumo: 'O cabelo platinado virou assunto nas redes durante o fim de semana.', esperado: { irrelevante: true, tema: 'famosos' } },
    { id: 'j16', veiculo: 'Economia & Você', secao: 'Preços', tempo: '08:55', avatar: '🛒', titulo: 'Inflação dos alimentos desacelera em outubro; arroz e feijão ficam mais baratos', resumo: 'A carne ainda sobe, mas a cesta básica ficou 2% mais barata no mês.', esperado: { irrelevante: false, tema: 'economia' } },
    { id: 'j17', veiculo: 'Moda & Estilo', secao: 'Tendências', tempo: '09:02', avatar: '👠', titulo: 'As 7 tendências de sapatos para o verão', resumo: 'Do salto bloco às sandálias de tiras finas, veja o que vai aparecer nas vitrines.', esperado: { irrelevante: true, tema: 'outro' } },
    { id: 'j18', veiculo: 'Gazeta do Pinhão', secao: 'Cidade', tempo: '09:10', avatar: '🚲', titulo: 'Parque Barigui ganha nova ciclovia de 4 km iluminada', resumo: 'A obra liga o parque à ciclovia da Avenida Cândido Hartmann e fica pronta em dezembro.', esperado: { irrelevante: false, tema: ['cidade', 'esporte'] } },
    { id: 'j19', veiculo: 'Cripto Agora', secao: 'Investimentos', tempo: '09:16', avatar: '🪙', titulo: 'Novo token promete rendimento de 2% ao dia; especialistas alertam', resumo: 'O projeto não tem empresa registrada no Brasil e cobra taxa de saque.', esperado: { irrelevante: true, tema: 'cripto' } },
    { id: 'j21', veiculo: 'Gazeta do Pinhão', secao: 'Cidade', tempo: '09:31', avatar: '🥬', titulo: 'Prefeitura abre inscrições para hortas comunitárias em 15 bairros de Curitiba', resumo: 'Cada família recebe um canteiro, sementes e duas oficinas de cultivo.', esperado: { irrelevante: false, tema: 'cidade' } },
    { id: 'j22', veiculo: 'Revista Celebridades', secao: 'Famosos', tempo: '09:38', avatar: '💄', titulo: 'Ex-participante de reality show lança linha de maquiagem e fãs fazem fila', resumo: 'A loja do shopping abriu mais cedo para dar conta do movimento.', esperado: { irrelevante: true, tema: 'famosos' } },
    { id: 'j20', veiculo: 'Portal Byte', secao: 'Startups', tempo: '09:24', avatar: '💊', titulo: 'Startup de Curitiba lança IA que lê receitas médicas para farmácias', resumo: 'O sistema confere a dose e avisa o farmacêutico quando há interação entre remédios.', esperado: { irrelevante: false, tema: ['tecnologia', 'cidade'] } },
  ],
};

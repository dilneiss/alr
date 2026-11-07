// Radar de Notícias — cada manchete de IA cai num de 4 níveis (a escala do radar que já roda no ar) e só o imperdível e fresco vira alerta.
// Para adaptar: troque o público e as empresas que ele acompanha (contexto), as descrições dos níveis e as manchetes de exemplo.

const CORTE_ALERTA = 0.5; // P(imperdível) a partir da qual o código manda o alerta (o radar real usa um corte baixo, de 0,15, para não perder furo)
const p = (a, k) => (a && a.probabilities ? a.probabilities[k] || 0 : 0);
const alerta = (resp) => p(resp.nivel, 'imperdivel') >= CORTE_ALERTA && !(resp.requentada && resp.requentada.noul >= 0.6);

export default {
  id: 'radar-noticias',
  titulo: 'Radar de Notícias',
  emoji: '📡',
  categoria: 'radares',
  ordem: 74,
  resumo: 'Centenas de manchetes de IA por hora caem em 4 níveis, e só o imperdível que é notícia nova vira alerta no WhatsApp.',
  descricao: 'O Jev classifica cada manchete numa escala de 4 níveis (ruído, nicho, bom post, imperdível) e percebe quando é notícia requentada. A regra do alerta fica no código e usa a probabilidade do Jev. É o desenho do radar que já está no ar (AUC 0,958 em 259 manchetes rotuladas).',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#ff6b35', acento2: '#ffd166' },
  origem: 'jev-news-radar: no ar desde 02/10/2026, 37 fontes, escala de 4 níveis (AUC 0,958)',

  contexto: {
    publico: 'criador de conteúdo brasileiro sobre IA, que quer ser o primeiro a postar o que importa e ignorar o resto',
    empresas_grandes: 'nesta demonstração, os 4 maiores laboratórios de IA do mundo são (fictícios): Lumen AI (modelos Lumen e assistente Lumi), Nexo Labs (modelos Nexo), Órbita (buscador e assistente Órbita) e Prisma (redes sociais e Prisma AI). Modelo novo de qualquer um deles é lançamento de fronteira',
    hoje: 'terça-feira, 20/10/2026',
  },

  decisoes: [
    {
      id: 'nivel', tipo: 'choice', titulo: 'Nível',
      pergunta: 'Para o criador de conteúdo do contexto, em qual nível fica esta manchete? Regra: ruído = não é notícia dura; nicho = notícia dura, mas pequena; bom post = lançamento ou fato relevante de empresa grande; imperdível = modelo novo de um dos 4 grandes laboratórios ou recurso enorme liberado para todos os usuários de um assistente grande, que todo mundo de IA vai comentar hoje.',
      opcoes: [
        { id: 'imperdivel', rotulo: 'Imperdível', icone: '🚨', cor: '#ef4444', desc: 'modelo novo da Lumen AI, da Nexo Labs, da Órbita ou da Prisma; recurso enorme liberado para todos os usuários do Lumi, do Órbita ou do Prisma AI; ou acontecimento que todo mundo de IA vai comentar hoje' },
        { id: 'bom_post', rotulo: 'Bom post', icone: '📸', cor: '#f59e0b', desc: 'lançamento ou acontecimento relevante de empresa grande de IA ou de tecnologia, que o público gostaria de ver hoje' },
        { id: 'nicho', rotulo: 'Nicho', icone: '🔎', cor: '#60a5fa', desc: 'notícia dura, mas pequena: startup ou empresa de nicho, recurso menor, investimento de bastidor, assunto regional ou acadêmico' },
        { id: 'ruido', rotulo: 'Ruído', icone: '💤', cor: '#64748b', desc: 'não é notícia dura: opinião, análise, tutorial, lista, review, rumor, ações na bolsa ou retrospectiva' },
      ],
    },
    {
      id: 'requentada', tipo: 'noul', titulo: 'Requentada', rotulo: 'requentada', icone: '♨️', tom: 'medio', limiar: 0.6,
      pergunta: 'A manchete deixa claro que repercute um anúncio ou lançamento de OUTRO DIA (ex.: "uma semana depois", "relembre", "um mês após o lançamento", "o que mudou desde")? Tutorial, opinião, lista, review sem marca de tempo e notícia de hoje = não.',
    },
  ],

  fluxo: {
    colunas: 'nivel',
    rotuloItem: 'Manchete',
    lote: 4,
    ritmo: 3800,
    cartao: { titulo: 'manchete', subtitulo: 'veiculo', meta: 'hora', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma manchete de IA e veja em que nível ela cai…', botao: 'Classificar' },
    rotuloFila: 'Manchetes chegando',
    rotuloFeitos: 'manchetes',
  },
  textoItem: (it) => `${it.manchete} (${it.veiculo})`,

  // a regra do alerta é do código: P(imperdível) acima do corte e não requentada
  cartaoExtra(item, resp) {
    if (alerta(resp)) return `<span class="mj-chip ruim" title="P(imperdível) = ${Math.round(p(resp.nivel, 'imperdivel') * 100)}%: o código manda o alerta">📲 alerta no WhatsApp</span>`;
    return '';
  },
  aoDecidir(item, resp, extra) {
    if (!resp.nivel) return;
    extra.total = (extra.total || 0) + 1;
    if (alerta(resp)) extra.alertas = (extra.alertas || 0) + 1;
    if (resp.nivel.choice === 'ruido') extra.ruido = (extra.ruido || 0) + 1;
    if (resp.requentada && resp.requentada.noul >= 0.6) extra.requentadas = (extra.requentadas || 0) + 1;
  },
  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'alertas no WhatsApp', valor: String(extra.alertas || 0) },
      { rotulo: 'ruído ignorado', valor: `${extra.ruido || 0} de ${extra.total}` },
      { rotulo: 'requentadas barradas', valor: String(extra.requentadas || 0) },
    ];
  },

  dados: [
    { id: 'n1', avatar: '🛰️', hora: '08:02', veiculo: 'Portal Byte', manchete: 'Lumen AI lança o Lumen 5, novo modelo que supera o anterior em todos os testes de raciocínio', esperado: { nivel: 'imperdivel', requentada: false } },
    { id: 'n2', avatar: '📝', hora: '08:05', veiculo: 'Blog do Dev', manchete: '10 prompts para escrever e-mails melhores com IA', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n3', avatar: '🗞️', hora: '08:09', veiculo: 'Agência Sinal', manchete: 'Startup gaúcha VozFácil lança transcrição com IA para cartórios', esperado: { nivel: 'nicho', requentada: false } },
    { id: 'n4', avatar: '💼', hora: '08:14', veiculo: 'Circuito Online', manchete: 'Nexo Labs anuncia versão do Nexo para empresas, com controles de privacidade e de administração', esperado: { nivel: 'bom_post', requentada: false } },
    { id: 'n5', avatar: '🔬', hora: '08:20', veiculo: 'Radar Tech', manchete: 'Uma semana depois, o que mudou com o Lumen 5? Fizemos 30 testes', esperado: { nivel: 'ruido', requentada: true } },
    { id: 'n6', avatar: '📈', hora: '08:26', veiculo: 'Mercado em Bits', manchete: 'Ações da Prisma sobem 4% depois do balanço trimestral', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n7', avatar: '🎙️', hora: '08:31', veiculo: 'Portal Byte', manchete: 'Assistente Órbita ganha modo de voz em tempo real em português para todos os usuários, inclusive no plano grátis', esperado: { nivel: 'imperdivel', requentada: false } },
    { id: 'n8', avatar: '🕶️', hora: '08:37', veiculo: 'The Prompt Post', manchete: 'Prisma lança óculos com assistente de IA que traduz conversas em tempo real', esperado: { nivel: ['bom_post', 'imperdivel'], requentada: false } },
    { id: 'n9', avatar: '🤫', hora: '08:44', veiculo: 'Circuito Online', manchete: 'Rumor: Lumen AI pode lançar navegador próprio ainda este ano', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n10', avatar: '🏥', hora: '08:50', veiculo: 'Diário Digital do Sul', manchete: 'Prefeitura de Vale Verde testa chatbot para agendar consultas nos postos de saúde', esperado: { nivel: 'nicho', requentada: false } },
    { id: 'n11', avatar: '💬', hora: '08:55', veiculo: 'Radar Tech', manchete: 'Opinião: a IA não vai tirar o seu emprego, vai mudar o seu emprego', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n12', avatar: '📱', hora: '09:01', veiculo: 'Agência Sinal', manchete: 'Nexo Labs lança o Nexo 4, modelo aberto que roda no celular e empata com os maiores modelos fechados', esperado: { nivel: 'imperdivel', requentada: false } },
    { id: 'n13', avatar: '⏪', hora: '09:08', veiculo: 'Blog do Dev', manchete: 'Relembre: tudo o que a Órbita anunciou no evento de setembro', esperado: { nivel: 'ruido', requentada: true } },
    { id: 'n14', avatar: '💰', hora: '09:13', veiculo: 'Mercado em Bits', manchete: 'Fundo compra participação minoritária em startup de dados de Recife', esperado: { nivel: 'nicho', requentada: false } },
    { id: 'n15', avatar: '🧠', hora: '09:19', veiculo: 'The Prompt Post', manchete: 'Lumi, o assistente da Lumen AI, passa a lembrar das conversas anteriores para todos os usuários', esperado: { nivel: ['imperdivel', 'bom_post'], requentada: false } },
    { id: 'n16', avatar: '💻', hora: '09:24', veiculo: 'Portal Byte', manchete: 'Review: testamos o novo notebook com chip de IA da Kronos', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n17', avatar: '📊', hora: '09:30', veiculo: 'Circuito Online', manchete: 'Um mês depois do lançamento, Nexo 3 chega a 10 milhões de downloads', esperado: { requentada: true } },
    { id: 'n18', avatar: '🌱', hora: '09:36', veiculo: 'Agência Sinal', manchete: 'Pesquisadores de universidade mineira criam IA que identifica pragas na soja pela foto', esperado: { nivel: 'nicho', requentada: false } },
    { id: 'n19', avatar: '🤝', hora: '09:41', veiculo: 'Radar Tech', manchete: 'Lumen AI e Prisma fecham acordo de US$ 2 bilhões para a Lumen usar os chips de IA da Prisma', esperado: { nivel: ['bom_post', 'imperdivel'], requentada: false } },
    { id: 'n20', avatar: '🗓️', hora: '09:47', veiculo: 'Blog do Dev', manchete: 'Como usar o Lumi para planejar a sua semana: passo a passo', esperado: { nivel: 'ruido', requentada: false } },
    { id: 'n21', avatar: '📋', hora: '09:52', veiculo: 'Diário Digital do Sul', manchete: 'Órbita adiciona atalho de IA no app de planilhas para resumir tabelas', esperado: { nivel: ['nicho', 'bom_post'], requentada: false } },
    { id: 'n22', avatar: '🎓', hora: '09:58', veiculo: 'The Prompt Post', manchete: 'Prisma AI passa a gerar vídeos de até 1 minuto a partir de uma foto, para todos os usuários do app', esperado: { nivel: ['imperdivel', 'bom_post'], requentada: false } },
  ],
};

// Raio-X dos Anúncios dos Concorrentes — cada anúncio vai para a raia do seu ângulo de venda, com o tipo de gancho e a agressividade.
// Para adaptar: cole os anúncios ativos dos seus concorrentes em "dados" e troque "sua_marca" no contexto. O resumo mostra o ângulo saturado e o esquecido.
const ANGULOS = [
  { id: 'dor', rotulo: 'Dor', icone: '😣', cor: '#f87171', desc: 'fala do problema, do incômodo ou do medo do cliente (azia, café ruim, dinheiro jogado fora, sono)' },
  { id: 'desejo', rotulo: 'Desejo', icone: '✨', cor: '#f472b6', desc: 'pinta a experiência boa que o cliente quer viver (aroma, ritual da manhã, prazer, conforto)' },
  { id: 'prova_social', rotulo: 'Prova social', icone: '👥', cor: '#60a5fa', desc: 'número de clientes, avaliações, estrelas, depoimento de cliente ou "o mais vendido"' },
  { id: 'oferta_urgencia', rotulo: 'Oferta e urgência', icone: '⏰', cor: '#fbbf24', desc: 'desconto, preço baixo, brinde, frete grátis, prazo acabando ou estoque limitado' },
  { id: 'autoridade', rotulo: 'Autoridade', icone: '🎓', cor: '#a78bfa', desc: 'especialista, campeão, prêmio, certificação, pontuação técnica ou tradição de gerações' },
  { id: 'curiosidade', rotulo: 'Curiosidade', icone: '🧩', cor: '#2dd4bf', desc: 'segredo, erro comum ou revelação que só se resolve clicando ("o motivo vai te surpreender")' },
  { id: 'outro', rotulo: 'Não vende', icone: '📎', cor: '#64748b', desc: 'não vende o produto: vaga de emprego, aviso de loja, comunicado' },
];
const GANCHOS = [
  { id: 'pergunta', rotulo: 'pergunta', icone: '❓', desc: 'a primeira frase termina com ponto de interrogação' },
  { id: 'numero', rotulo: 'número', icone: '🔢', desc: 'a primeira frase começa com número, porcentagem ou preço' },
  { id: 'historia', rotulo: 'história', icone: '📖', desc: 'a primeira frase conta uma cena ou o caso de alguém (eu, ele, a dona Lúcia, meu avô)' },
  { id: 'polemica', rotulo: 'polêmica', icone: '🔥', desc: 'a primeira frase contraria o senso comum, manda parar um hábito ou ataca um produto ("pare de…", "é a pior coisa…")' },
  { id: 'promessa', rotulo: 'promessa', icone: '🎯', desc: 'a primeira frase promete um resultado ou uma experiência ao leitor ("acorde com…", "tome…", "tenha…")' },
  { id: 'direto', rotulo: 'direto', icone: '➡️', desc: 'sem gancho: começa pelo nome da marca, pela oferta, por um aviso ou por "estamos contratando"' },
];
const LIMIAR_MISTO = 0.7;  // abaixo desta confiança o anúncio vai para "Ângulo misto" e não entra na contagem
const nome = (lista, id) => { const o = lista.find((x) => x.id === id); return o ? `${o.icone} ${o.rotulo}` : id; };

export default {
  id: 'raio-x-anuncios',
  titulo: 'Raio-X dos Anúncios dos Concorrentes',
  emoji: '🔬',
  categoria: 'vendas',
  ordem: 27,
  resumo: 'Cole os anúncios dos concorrentes e veja qual ângulo todo mundo usa, qual ninguém usa e que gancho abre cada um.',
  descricao: 'O Jev lê cada anúncio e decide o ângulo de venda (a raia), o tipo de gancho da primeira frase e o nível de agressividade. Com dezenas de anúncios por minuto, o resumo final mostra o ângulo saturado e o esquecido, que é onde a sua marca pode entrar.',
  marcas: ['volume', 'lista fechada', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#c026d3', acento2: '#f472b6' },

  contexto: {
    sua_marca: 'Torra Clara — café especial por assinatura (é a nossa marca; os anúncios abaixo são dos concorrentes)',
    objetivo: 'descobrir o ângulo que todo mundo usa (saturado) e o que ninguém usa (oportunidade) antes da próxima campanha',
  },

  decisoes: [
    {
      id: 'angulo', tipo: 'choice', titulo: 'Ângulo de venda',
      pergunta: 'Qual é o ângulo PRINCIPAL deste anúncio, ou seja, o argumento que mais pesa para convencer quem lê? Se o anúncio mistura dois ângulos, escolha o que ocupa mais o texto. Anúncio que não vende o produto (vaga de emprego, aviso de loja) → outro.',
      opcoes: ANGULOS,
    },
    {
      id: 'gancho', tipo: 'choice', titulo: 'Gancho',
      pergunta: 'Olhe só a PRIMEIRA frase do texto do anúncio. Que tipo de gancho ela usa? Regras, nesta ordem: termina com "?" → pergunta; começa com número, porcentagem ou preço → número; conta uma cena ou o caso de alguém → história; contraria o senso comum, manda parar um hábito ou ataca um produto → polêmica; promete um resultado ou uma experiência ao leitor → promessa; começa pela marca, pela oferta, por um aviso ou por "estamos contratando" → direto.',
      opcoes: GANCHOS,
    },
    {
      id: 'agressividade', tipo: 'score', titulo: 'Agressividade',
      pergunta: 'Quão agressivo é este anúncio na pressão sobre quem lê?',
      niveis: [
        { rotulo: 'suave', desc: 'informa, conta ou convida, sem pressão' },
        { rotulo: 'moderado', desc: 'pede ação ou cita prazo, mas sem exagero' },
        { rotulo: 'agressivo', desc: 'pressão forte: CAIXA ALTA, "última chance", contagem regressiva, poucas unidades' },
        { rotulo: 'apelativo', desc: 'medo exagerado, ataque a um produto ou promessa absurda' },
      ],
    },
  ],

  fluxo: {
    colunas: 'angulo',
    rotuloItem: 'Anúncio',
    lote: 4,
    ritmo: 3600,
    humano: { limiar: LIMIAR_MISTO, rotulo: 'Ângulo misto', icone: '🔀' },
    cartao: { titulo: 'marca', subtitulo: 'formato', texto: 'texto', meta: 'ativo' },
    entrada: { placeholder: 'Cole aqui o texto de um anúncio (seu ou de um concorrente) e veja o ângulo e o gancho…', botao: 'Analisar' },
    rotuloFeitos: 'anúncios',
    rotuloFila: 'Anúncios ativos dos concorrentes',
  },
  textoItem: (a) => `${a.marca} · ${a.formato}\nTexto do anúncio: ${a.texto}`,

  aoDecidir(item, resp, extra) {
    extra.angulos = extra.angulos || {}; extra.ganchos = extra.ganchos || {};
    const a = resp.angulo;
    if (a && (a.probabilities[a.choice] || 0) >= LIMIAR_MISTO) extra.angulos[a.choice] = (extra.angulos[a.choice] || 0) + 1;
    if (resp.gancho) extra.ganchos[resp.gancho.choice] = (extra.ganchos[resp.gancho.choice] || 0) + 1;
  },
  resumoExtra(extra) {
    const vendem = ANGULOS.filter((a) => a.id !== 'outro').map((a) => [a.id, (extra.angulos || {})[a.id] || 0]);
    if (!vendem.some((x) => x[1])) return [];
    const ordem = vendem.slice().sort((x, y) => y[1] - x[1]);
    const [dom, nDom] = ordem[0];
    const [fraco, nFraco] = ordem[ordem.length - 1];
    const g = Object.entries(extra.ganchos || {}).sort((x, y) => y[1] - x[1])[0];
    return [
      { rotulo: 'ângulo dominante', valor: `${nome(ANGULOS, dom)} (${nDom})` },
      { rotulo: 'oportunidade: menos usado', valor: `${nome(ANGULOS, fraco)} (${nFraco})` },
      g ? { rotulo: 'gancho mais usado', valor: nome(GANCHOS, g[0]) } : null,
    ].filter(Boolean);
  },

  dados: [
    { id: 'a1', marca: 'Grão Nobre', formato: 'Feed · Instagram', ativo: 'ativo há 64 dias', avatar: '☕', texto: 'Seu café da manhã termina em azia? O problema não é você, é o café torrado demais do supermercado. O Grão Nobre tem torra média e acidez equilibrada. Teste por 30 dias.', esperado: { angulo: 'dor', gancho: 'pergunta', agressividade: [0, 1] } },
    { id: 'a2', marca: 'Torra Viva', formato: 'Reels · Instagram', ativo: 'ativo há 38 dias', avatar: '🔥', texto: '38.412 assinantes já trocaram o café de mercado pelo Torra Viva. Nota 4,9 em 12 mil avaliações. Vem ver por que ninguém volta atrás.', esperado: { angulo: 'prova_social', gancho: 'numero', agressividade: [0, 1] } },
    { id: 'a3', marca: 'Moka Clube', formato: 'Stories', ativo: 'ativo há 2 dias', avatar: '🫘', texto: 'R$ 19,90 no primeiro mês, com caneca de brinde. É só até meia-noite de hoje: depois volta para R$ 59. CORRE!', esperado: { angulo: 'oferta_urgencia', gancho: 'numero', agressividade: [2, 3] } },
    { id: 'a4', marca: 'Café Serra Alta', formato: 'Feed · Facebook', ativo: 'ativo há 120 dias', avatar: '⛰️', texto: 'Quem escolhe o café que você bebe? Aqui é o Rafael Tavares, tricampeão brasileiro de barismo, que prova cada lote antes de ele ir para a sua casa.', esperado: { angulo: 'autoridade', gancho: 'pergunta', agressividade: [0, 1] } },
    { id: 'a5', marca: 'Fazenda Aurora', formato: 'Reels · Instagram', ativo: 'ativo há 22 dias', avatar: '🌅', texto: 'Acorde com cheiro de café de fazenda todos os dias. Grãos colhidos à mão, torrados na semana e entregues na sua porta. Seu ritual da manhã nunca mais vai ser o mesmo.', esperado: { angulo: 'desejo', gancho: 'promessa', agressividade: [0, 1] } },
    { id: 'a6', marca: 'Bendito Grão', formato: 'Feed · Instagram', ativo: 'ativo há 15 dias', avatar: '🙏', texto: 'Por que o café do hotel é sempre melhor que o seu? Não é a máquina. Descubra o detalhe que quase todo mundo erra em casa (e que custa zero).', esperado: { angulo: 'curiosidade', gancho: 'pergunta', agressividade: [0, 1] } },
    { id: 'a7', marca: 'Pó de Ouro Cafés', formato: 'Reels · Instagram', ativo: 'ativo há 9 dias', avatar: '🪙', texto: 'Café tradicional de supermercado é a pior coisa que você coloca no corpo de manhã. Tem casca, pau e grão podre moído junto. A gente mostrou tudo no vídeo.', esperado: { angulo: 'dor', gancho: 'polemica', agressividade: [2, 3] } },
    { id: 'a8', marca: 'Xícara Cheia', formato: 'Feed · Facebook', ativo: 'ativo há 47 dias', avatar: '🫖', texto: 'A dona Lúcia achava que café especial era frescura. Hoje ela não fica um dia sem. ⭐⭐⭐⭐⭐ "Melhor presente que meu filho me deu." — Lúcia, Belo Horizonte', esperado: { angulo: 'prova_social', gancho: 'historia', agressividade: [0, 1] } },
    { id: 'a9', marca: 'Barista em Casa', formato: 'Stories', ativo: 'ativo há 4 dias', avatar: '🏠', texto: 'Frete grátis para todo o Brasil neste fim de semana. Assine qualquer plano e ganhe um pacote extra de 250 g.', esperado: { angulo: 'oferta_urgencia', gancho: 'direto' } },
    { id: 'a10', marca: 'Cafeína Club', formato: 'Feed · Instagram', ativo: 'ativo há 73 dias', avatar: '⚡', texto: '15% OFF e frete grátis na primeira assinatura com o cupom CAFE15. Válido para os planos mensal e trimestral.', esperado: { angulo: 'oferta_urgencia', gancho: 'numero', agressividade: [0, 1] } },
    { id: 'a11', marca: 'Grão Nobre', formato: 'Reels · Instagram', ativo: 'ativo há 31 dias', avatar: '☕', texto: 'Domingo de manhã, a casa em silêncio e o cheiro do café subindo da prensa francesa. É esse momento que a gente entrega todo mês na sua porta.', esperado: { angulo: 'desejo', gancho: 'historia', agressividade: 0 } },
    { id: 'a12', marca: 'Moka Clube', formato: 'Carrossel · Instagram', ativo: 'ativo há 19 dias', avatar: '🫘', texto: '3 erros que estragam até o melhor café do mundo (o segundo quase todo mundo comete). Arrasta para o lado e confere.', esperado: { angulo: 'curiosidade', gancho: 'numero', agressividade: [0, 1] } },
    { id: 'a13', marca: 'Bendito Grão', formato: 'Reels · Instagram', ativo: 'ativo há 27 dias', avatar: '🙏', texto: 'Eu vivia jogando dinheiro fora com cápsula, e o café nem era bom. Pagava mais caro por um café pior. Troquei pelo Bendito Grão e hoje gasto a metade.', esperado: { angulo: ['dor', 'prova_social'], gancho: 'historia', agressividade: [0, 1] } },
    { id: 'a14', marca: 'Torra Viva', formato: 'Stories', ativo: 'ativo há 1 dia', avatar: '🔥', texto: 'Vai deixar passar? 40% OFF no plano anual só até domingo. Restam 112 assinaturas com esse preço.', esperado: { angulo: 'oferta_urgencia', gancho: 'pergunta', agressividade: [2, 3] } },
    { id: 'a15', marca: 'Fazenda Aurora', formato: 'Feed · Facebook', ativo: 'ativo há 210 dias', avatar: '🌅', texto: 'Meu bisavô plantou o primeiro pé de café desta fazenda com as próprias mãos. Hoje somos a única fazenda da região com certificação de origem e três prêmios nacionais de qualidade.', esperado: { angulo: 'autoridade', gancho: 'historia', agressividade: [0, 1] } },
    { id: 'a16', marca: 'Café Serra Alta', formato: 'Feed · Instagram', ativo: 'ativo há 56 dias', avatar: '⛰️', texto: 'Café Serra Alta: o café especial mais vendido do país em 2025. Mais de 50 mil pacotes por mês e 9 em cada 10 clientes renovam a assinatura.', esperado: { angulo: 'prova_social', gancho: 'direto', agressividade: [0, 1] } },
    { id: 'a17', marca: 'Xícara Cheia', formato: 'Reels · Instagram', ativo: 'ativo há 12 dias', avatar: '🫖', texto: 'Pare de lavar a sua cafeteira com detergente. O motivo vai te surpreender, e explica aquele gosto amargo que nunca sai.', esperado: { angulo: 'curiosidade', gancho: 'polemica' } },
    { id: 'a18', marca: 'Barista em Casa', formato: 'Feed · Instagram', ativo: 'ativo há 40 dias', avatar: '🏠', texto: 'Tome café de cafeteria premiada sem sair do sofá. Moído na hora certa para a sua cafeteira, com receita do barista em cada pacote.', esperado: { angulo: 'desejo', gancho: 'promessa', agressividade: [0, 1] } },
    { id: 'a19', marca: 'Pó de Ouro Cafés', formato: 'Stories', ativo: 'ativo há 1 dia', avatar: '🪙', texto: 'ÚLTIMA CHAMADA: 50% de desconto acaba hoje às 23h59. Depois disso, NUNCA MAIS esse preço. Clique agora!!!', esperado: { angulo: 'oferta_urgencia', gancho: 'direto', agressividade: [2, 3] } },
    { id: 'a20', marca: 'Moka Clube', formato: 'Feed · Facebook', ativo: 'ativo há 6 dias', avatar: '🫘', texto: 'Estamos contratando! Vagas para barista e atendente na nova loja do Centro de Curitiba. Mande seu currículo pelo link.', esperado: { angulo: 'outro', gancho: 'direto', agressividade: 0 } },
    { id: 'a21', marca: 'Torra Viva', formato: 'Feed · Instagram', ativo: 'ativo há 8 dias', avatar: '🔥', texto: 'Já provou o café que mais de 20 mil clientes aprovam? Só hoje ele está com 30% de desconto. Veja as avaliações e garanta o seu.', esperado: { angulo: ['prova_social', 'oferta_urgencia'], gancho: 'pergunta' } },
    { id: 'a22', marca: 'Fazenda Aurora', formato: 'Reels · Instagram', ativo: 'ativo há 33 dias', avatar: '🌅', texto: 'Aprovado por três baristas campeões e por mais de 15 mil clientes. Prove e tire a sua conclusão.', esperado: { angulo: ['prova_social', 'autoridade'], gancho: 'direto' } },
  ],
};

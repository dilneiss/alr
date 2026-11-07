// Alarme de Crise de Marca — cada menção à marca vira crise, atenção, rotina ou elogio, com alcance e "responder hoje?".
// Para adaptar: troque a marca no contexto, os exemplos de "crise" na opção e as menções (as do seu monitoramento).
const FONTE = { TikTok: '🎵', X: '✖️', Instagram: '📸', YouTube: '▶️', 'Reclame Aqui': '📣', Portal: '📰', Fórum: '💬', LinkedIn: '💼', Grupo: '👥' };

const MENCOES = [
  { id: 'm1', fonte: 'TikTok', perfil: '@casadajuh', numeros: '480 mil seguidores · 1,1 mi de visualizações', hora: '08:12', texto: 'Gente, minha air fryer Vórtex começou a soltar fumaça preta e o cabo DERRETEU. Gravei tudo. Quem tiver uma, desliga da tomada!!', esperado: { nivel: 'crise', responder_hoje: true, alcance: 2 } },
  { id: 'm2', fonte: 'X', perfil: '@clima_agora', numeros: '85 mil seguidores', hora: '08:15', texto: 'Vórtex polar deve derrubar as temperaturas no Sul a partir de quinta. Separe o casaco.', esperado: { nivel: 'nao_e_nos', responder_hoje: false } },
  { id: 'm3', fonte: 'X', perfil: '@lucas.dev', numeros: '312 seguidores', hora: '08:21', texto: 'comprei a air fryer da vórtex no sábado e tô apaixonado, fiz até pão de queijo kkkk', esperado: { nivel: 'elogio', responder_hoje: false, alcance: 0 } },
  { id: 'm4', fonte: 'Reclame Aqui', perfil: 'reclamação pública', numeros: 'sem resposta da empresa', hora: '08:30', texto: 'Comprei o liquidificador Vórtex Turbo e a jarra veio trincada. Pedi a troca há 12 dias e ninguém responde.', esperado: { nivel: 'atencao', responder_hoje: true } },
  { id: 'm5', fonte: 'Portal', perfil: 'Portal Consumo em Foco', numeros: 'portal de notícias', hora: '08:44', texto: 'Procon notifica Vórtex Casa após 37 relatos de air fryers superaquecendo', esperado: { nivel: 'crise', responder_hoje: true, alcance: 2 } },
  { id: 'm6', fonte: 'Instagram', perfil: 'comentário num post da marca', numeros: '—', hora: '08:52', texto: 'Alguém sabe se a cafeteira Vórtex Express aceita cápsula de outra marca?', esperado: { nivel: 'rotina', responder_hoje: false } },
  { id: 'm7', fonte: 'X', perfil: '@ana_bia', numeros: '1,8 mil seguidores', hora: '09:03', texto: '3ª vez que o chat da Vórtex me deixa 1 hora esperando. Péssimo. @vortexcasa vocês existem?', esperado: { nivel: 'atencao', responder_hoje: true } },
  { id: 'm8', fonte: 'Instagram', perfil: '@chefcarolreis', numeros: '210 mil seguidores', hora: '09:10', texto: 'Recebidos da semana: a cafeteira nova da Vórtex Casa! Primeiras impressões: linda e silenciosa ☕', esperado: { nivel: 'elogio', responder_hoje: false } },
  { id: 'm9', fonte: 'Fórum', perfil: 'Fórum Casa & Cozinha', numeros: 'tópico com 46 respostas', hora: '09:18', texto: 'Alguém mais com a air fryer Vórtex dando choque na alça de metal? A minha dá um formigamento quando encosto.', esperado: { nivel: 'crise', responder_hoje: true } },
  { id: 'm10', fonte: 'YouTube', perfil: 'comentário num vídeo de review', numeros: '—', hora: '09:26', texto: 'Vale mais a Vórtex Turbo ou a Mixmax 900 pelo preço?', esperado: { nivel: 'rotina', responder_hoje: false } },
  { id: 'm20', fonte: 'X', perfil: '@reporter_luiza', numeros: '9 mil seguidores', hora: '09:31', texto: 'Sou repórter e estou apurando relatos sobre air fryers Vórtex. Alguém passou por isso? DM aberta.', esperado: { nivel: 'crise', responder_hoje: true } },
  { id: 'm11', fonte: 'X', perfil: '@gabimelo', numeros: '4,5 mil seguidores', hora: '09:35', texto: 'Recebi um e-mail com meu nome, CPF e endereço dizendo ser da Vórtex Casa e pedindo pra pagar um boleto. Vazaram nossos dados??', esperado: { nivel: 'crise', responder_hoje: true } },
  { id: 'm12', fonte: 'Reclame Aqui', perfil: 'reclamação pública', numeros: 'sem resposta da empresa', hora: '09:41', texto: 'Cobraram duas vezes no cartão a compra da cafeteira. Já mandei o comprovante e o SAC não estorna.', esperado: { nivel: 'atencao', responder_hoje: true } },
  { id: 'm13', fonte: 'LinkedIn', perfil: 'Renan Alves, engenheiro da Vórtex Casa', numeros: '2,3 mil conexões', hora: '09:50', texto: 'Orgulho de ter liderado o projeto da embalagem 100% reciclável da Vórtex Casa 💚', esperado: { nivel: ['elogio', 'rotina'], responder_hoje: false } },
  { id: 'm14', fonte: 'TikTok', perfil: '@fitnadia', numeros: '1,3 mil seguidores · 900 visualizações', hora: '09:58', texto: 'frango crocante na air fryer em 15 min (a minha é Vórtex, mas serve qualquer uma)', esperado: { nivel: 'rotina', responder_hoje: false, alcance: 0 } },
  { id: 'm15', fonte: 'X', perfil: '@serie_maniacos', numeros: '12 mil seguidores', hora: '10:04', texto: 'o vórtex de areia no último episódio de Areias de Kael ficou lindo demais', esperado: { nivel: 'nao_e_nos', responder_hoje: false } },
  { id: 'm16', fonte: 'Instagram', perfil: 'comentário num post da marca', numeros: '—', hora: '10:11', texto: 'Chegou antes do prazo e super bem embalado. Nota 10!', esperado: { nivel: 'elogio', responder_hoje: false, alcance: 0 } },
  { id: 'm17', fonte: 'Reclame Aqui', perfil: 'reclamação pública', numeros: 'sem resposta da empresa', hora: '10:19', texto: 'O ventilador Vórtex começou a fazer um barulho insuportável depois de 2 meses de uso. Quero trocar.', esperado: { nivel: 'atencao' } },
  { id: 'm18', fonte: 'X', perfil: '@ironiafina', numeros: '#vortexpegafogo · 34 mil compartilhamentos', hora: '10:26', texto: 'Parabéns, Vórtex Casa, pela air fryer que vem com função lança-chamas de brinde 👏👏', esperado: { nivel: 'crise', responder_hoje: true, alcance: 2 } },
  { id: 'm19', fonte: 'X', perfil: '@marinasoares', numeros: '640 seguidores', hora: '10:33', texto: 'minha air fryer Vórtex parou do nada e ficou um cheiro de queimado na cozinha 😬', esperado: { nivel: ['crise', 'atencao'], responder_hoje: true } },
];

export default {
  id: 'alarme-crise-marca',
  titulo: 'Alarme de Crise de Marca',
  emoji: '🚨',
  categoria: 'vendas',
  ordem: 34,
  resumo: 'Cada menção à marca nas redes, no Reclame Aqui e nas notícias vira crise, atenção, rotina ou elogio — e o alarme toca no que precisa de resposta hoje.',
  descricao: 'O Jev lê cada menção que o monitoramento captura e decide o nível, o alcance e se a marca precisa responder ainda hoje. Palavra-chave não separa "a air fryer da Vórtex pegou fogo" de "o vórtex polar chegou"; o Jev separa, e o que fica em dúvida vai para uma pessoa.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#d7263d', acento2: '#f59e0b' },

  contexto: {
    marca: 'Vórtex Casa — marca de eletroportáteis (fictícia): air fryers, liquidificadores, cafeteiras e ventiladores',
    monitoramento: 'menções com a palavra "vórtex" no X, Instagram, TikTok, YouTube, Reclame Aqui, fóruns, grupos e portais de notícia',
    hoje: 'terça-feira, 20/10/2026',
  },

  decisoes: [
    {
      id: 'nivel', tipo: 'choice', titulo: 'Nível',
      pergunta: 'Que nível de atenção esta menção exige da marca Vórtex Casa? Regras: risco à segurança, dados vazados, imprensa ou problema se espalhando → crise; reclamação de um cliente → atenção; dúvida ou menção neutra → rotina; fala bem → elogio; se a palavra "vórtex" não se refere à marca → não é sobre nós.',
      opcoes: [
        { id: 'crise', rotulo: 'Crise', icone: '🚨', cor: '#e11d48', desc: 'risco à segurança (fogo, fumaça, choque, ferimento), suspeita de vazamento de dados, notícia em portal ou órgão de defesa do consumidor, ou o mesmo problema se espalhando (viral, hashtag, muitos compartilhamentos)' },
        { id: 'atencao', rotulo: 'Atenção', icone: '⚠️', cor: '#f59e0b', desc: 'reclamação de um cliente sobre defeito, troca, cobrança, entrega ou atendimento, sem risco à segurança e sem viralizar' },
        { id: 'rotina', rotulo: 'Rotina', icone: '📋', cor: '#60a5fa', desc: 'dúvida, pedido de indicação, comparação ou menção neutra: a pessoa só cita que usa o produto (numa receita, vídeo ou foto) sem dar opinião sobre ele' },
        { id: 'elogio', rotulo: 'Elogio', icone: '💚', cor: '#34d399', desc: 'opinião positiva explícita sobre a marca, um produto, a entrega ou o atendimento ("amei", "nota 10", "recomendo", "tô apaixonado")' },
        { id: 'nao_e_nos', rotulo: 'Não é sobre nós', icone: '🔇', cor: '#64748b', desc: 'a palavra "vórtex" em outro sentido (clima, ciência, filmes, séries, jogos) ou spam: não fala da marca Vórtex Casa' },
      ],
    },
    {
      id: 'responder_hoje', tipo: 'noul', titulo: 'Responder hoje', rotulo: 'responder hoje', icone: '⏰', tom: 'ruim', limiar: 0.6, alerta: true,
      pergunta: 'A marca precisa responder publicamente ou falar com esta pessoa AINDA HOJE? Sim para: risco à segurança, suspeita de vazamento de dados, imprensa, reclamação pública esperando resposta ou cliente muito irritado. Não para: elogio, dúvida simples, menção neutra ou menção que não é sobre a marca.',
    },
    {
      id: 'alcance', tipo: 'score', titulo: 'Alcance',
      pergunta: 'Até onde esta menção pode chegar? Use a fonte e os números de seguidores, visualizações ou compartilhamentos que vêm junto.',
      niveis: [
        { rotulo: 'baixo', desc: 'perfil pessoal com poucos seguidores ou comentário isolado' },
        { rotulo: 'médio', desc: 'Reclame Aqui, fórum, grupo ou perfil com alguns milhares de seguidores' },
        { rotulo: 'alto', desc: 'vídeo viral, hashtag com milhares de compartilhamentos, influenciador com centenas de milhares de seguidores ou portal de notícias' },
      ],
    },
  ],

  fluxo: {
    colunas: 'nivel',
    rotuloItem: 'Menção',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.85, rotulo: 'Uma pessoa decide', icone: '🙋' },
    cartao: { titulo: 'origem', subtitulo: 'numeros', texto: 'texto', meta: 'hora', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma menção à sua marca (post, comentário, manchete) e veja o nível…', botao: 'Avaliar' },
    rotuloFeitos: 'menções',
  },

  // o que vai para o Jev: a fonte, o perfil, os números (já formatados) e o texto
  textoItem: (m) => `${m.fonte} · ${m.perfil} (${m.numeros}) — "${m.texto}"`,

  aoDecidir(item, resp, extra) {
    const n = resp.nivel && resp.nivel.choice;
    if (n === 'crise') extra.crises = (extra.crises || 0) + 1;
    if (n === 'nao_e_nos') extra.ruido = (extra.ruido || 0) + 1;
    if (resp.responder_hoje && resp.responder_hoje.noul >= 0.6) extra.hoje = (extra.hoje || 0) + 1;
  },
  resumoExtra: (extra) => [
    { rotulo: 'crises', valor: String(extra.crises || 0) },
    { rotulo: 'responder hoje', valor: String(extra.hoje || 0) },
    { rotulo: 'ruído descartado', valor: String(extra.ruido || 0) },
  ],

  dados: MENCOES.map((m) => ({ ...m, origem: `${m.fonte === 'Portal' || m.fonte === 'Fórum' || m.fonte === 'Grupo' ? '' : m.fonte + ' · '}${m.perfil}`, avatar: FONTE[m.fonte] || '•' })),
};

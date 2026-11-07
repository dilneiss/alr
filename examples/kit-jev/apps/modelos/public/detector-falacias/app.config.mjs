// Detector de Falácias ao Vivo — num debate, o Jev dá nome à falácia de cada fala (de uma lista fechada) e mede a força do argumento.
// Para adaptar: troque o tema e os debatedores nos roteiros; para outras falácias, edite FALACIAS (o "desc" é o critério do Jev).
const FALACIAS = [
  { id: 'ad_hominem', rotulo: 'Ataque à pessoa', icone: '🎯', desc: 'ataca QUEM argumenta (cargo, idade, formação, interesse, caráter) em vez do argumento: "você nem cozinha, não pode falar do cardápio"' },
  { id: 'espantalho', rotulo: 'Espantalho', icone: '🧟', desc: 'distorce ou exagera o que o outro DISSE e rebate a versão distorcida, muitas vezes como pergunta: "ele quer menos açúcar? então quer proibir sobremesa?"' },
  { id: 'falsa_dicotomia', rotulo: 'Falsa dicotomia', icone: '⚖️', desc: 'apresenta só duas saídas quando existem outras: "ou a gente abre domingo, ou a loja fecha"' },
  { id: 'apelo_autoridade', rotulo: 'Apelo à autoridade', icone: '🎓', desc: 'usa a opinião de alguém famoso ou importante, sem dado, como prova: "um ator famoso usa esse tênis, então é o melhor"' },
  { id: 'ladeira_escorregadia', rotulo: 'Ladeira escorregadia', icone: '🛝', desc: 'um primeiro passo levaria a uma cadeia de consequências extremas, sem provar cada elo: "se deixar trazer o cachorro, amanhã o escritório vira um zoológico"' },
  { id: 'generalizacao_apressada', rotulo: 'Generalização apressada', icone: '🔍', desc: 'conclusão sobre todos a partir de um ou poucos casos: "dois clientes reclamaram, então o produto é ruim"' },
  { id: 'apelo_popularidade', rotulo: 'Apelo à popularidade', icone: '👥', desc: '"todo mundo faz ou pensa assim" usado como prova: "todo mundo já usa esse app, então ele é seguro"' },
  { id: 'falsa_causa', rotulo: 'Falsa causa', icone: '🔗', desc: 'conclui que A causou B só porque B veio depois de A ou junto com A: "trocamos o logo e o faturamento subiu, então foi o logo"' },
  { id: 'tu_quoque', rotulo: 'Você também', icone: '🪞', desc: 'rebate a crítica dizendo que o outro faz o mesmo, sem responder ao mérito: "você reclama do meu atraso, mas também atrasa"' },
  { id: 'nenhuma', rotulo: 'Nenhuma', icone: '✅', desc: 'não há falácia: argumento com dado ou razão que se sustenta, opinião, pergunta, concordância ou relato' },
];
const LIMIAR = 0.5;
const nivelDe = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 0);

export default {
  id: 'detector-falacias',
  titulo: 'Detector de Falácias ao Vivo',
  emoji: '🥊',
  categoria: 'voz',
  ordem: 65,
  resumo: 'Num debate ao vivo, cada fala recebe o nome da falácia que comete (ou nenhuma) e uma nota de força do argumento.',
  descricao: 'O Jev escolhe a falácia numa lista fechada de nove (mais "nenhuma") e pontua a força do argumento numa escala de quatro níveis. Como ele só escolhe da lista, nenhum nome de falácia é inventado, e quem traz dado de verdade aparece como argumento forte.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#f43f5e', acento2: '#a855f7' },
  origem: 'Jev Voice (detector de falácias da aula ao vivo)',

  contexto: {
    evento: 'debate interno da Vértice Logística (fictícia) sobre políticas de trabalho',
    regra: 'Discordar não é falácia. Opinião sem argumento também não: só aponte falácia quando a fala tira uma conclusão por um caminho defeituoso.',
  },

  decisoes: [
    {
      id: 'falacia', tipo: 'choice', papel: 'destaque', titulo: 'Falácia',
      pergunta: 'Qual falácia a fala atual comete? Julgue o MOVIMENTO que a fala atual faz e use a conversa só como contexto (para o espantalho e o "você também", compare com o que o outro disse antes). Escolha "nenhuma" quando a fala traz dado ou razão que se sustenta, ou quando é só opinião, pergunta, concordância ou relato. Discordar não é falácia.',
      opcoes: FALACIAS,
    },
    {
      id: 'forca_argumento', tipo: 'score', papel: 'medidor', titulo: 'Força do argumento',
      pergunta: 'Quão forte é o argumento da fala atual, pela razão que ela oferece? Falácia, ataque pessoal e provocação são fracos; razão plausível sem dado é razoável; dado concreto, teste ou lógica clara é forte.',
      niveis: [
        { rotulo: 'sem argumento', desc: 'só ataque, provocação ou opinião sem razão nenhuma' },
        { rotulo: 'fraco', desc: 'a razão é uma falácia ou não sustenta a conclusão' },
        { rotulo: 'razoável', desc: 'razão plausível, mas sem dado' },
        { rotulo: 'forte', desc: 'dado concreto, teste ou lógica clara que sustenta a conclusão' },
      ],
    },
  ],

  conversa: {
    skin: 'debate',
    titulo: 'Debate: políticas de trabalho',
    subtitulo: 'Vértice Logística · transmissão interna',
    avatar: '🥊',
    abertura: '🥊 Detector ligado: cada fala dos debatedores passa pelo Jev',
    participantes: {
      mediadora: { nome: 'Lúcia · mediadora', avatar: '🎙️', lado: 'esq' },
      marina: { nome: 'Marina · a favor', avatar: '👩🏻', lado: 'esq' },
      otavio: { nome: 'Otávio · contra', avatar: '👨🏽', lado: 'dir' },
    },
    analisar: ['marina', 'otavio'],
    voce: 'marina',
    escolherQuem: true,
    placeholder: 'Argumente como Marina ou Otávio (ex.: "todo mundo usa, então é bom")',
    tituloPlacar: 'No debate agora',
    selo(resp) {
      const a = resp.falacia;
      const f = FALACIAS.find((x) => x.id === (a && a.choice));
      if (f && f.id !== 'nenhuma' && a.probabilities[a.choice] >= LIMIAR) return { texto: f.rotulo, tom: 'ruim', icone: '⚠️' };
      if (nivelDe(resp.forca_argumento) >= 3) return { texto: 'argumento forte', tom: 'bom', icone: '💪' };
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Semana de 4 dias',
      falas: [
        { quem: 'mediadora', texto: 'Tema de hoje: a empresa deve testar a semana de quatro dias? Marina, você começa.' },
        { quem: 'marina', texto: 'Num piloto com sessenta empresas, a produtividade se manteve e os pedidos de demissão caíram. Vale testar com um time aqui.', esperado: { falacia: 'nenhuma', forca_argumento: [2, 3] } },
        { quem: 'otavio', texto: 'Então você quer que a gente trabalhe só quando tiver vontade, é isso?', esperado: { falacia: 'espantalho', forca_argumento: [0, 1] } },
        { quem: 'marina', texto: 'Você só é contra porque é gerente e tem medo de perder o controle do time.', esperado: { falacia: 'ad_hominem', forca_argumento: [0, 1] } },
        { quem: 'otavio', texto: 'Hoje é a sexta livre. Daqui a pouco pedem a quinta, e no fim ninguém trabalha mais.', esperado: { falacia: 'ladeira_escorregadia', forca_argumento: [0, 1] } },
      ],
    },
    {
      titulo: 'Volta ao escritório',
      falas: [
        { quem: 'mediadora', texto: 'Próximo tema: voltar ao escritório cinco dias por semana.' },
        { quem: 'otavio', texto: 'Todas as grandes empresas já voltaram pro presencial. Se todo mundo está fazendo, é porque funciona.', esperado: { falacia: 'apelo_popularidade', forca_argumento: [0, 1] } },
        { quem: 'marina', texto: 'Meu cunhado e um colega dele voltaram e odiaram. Ou seja: ninguém gosta de escritório.', esperado: { falacia: 'generalizacao_apressada', forca_argumento: [0, 1] } },
        { quem: 'otavio', texto: 'Ou a equipe volta pro escritório, ou a cultura da empresa acaba.', esperado: { falacia: 'falsa_dicotomia', forca_argumento: [0, 1] } },
        { quem: 'marina', texto: 'Desde que liberamos o home office, as vendas subiram 20%. Foi o home office que fez a gente vender mais.', esperado: { falacia: 'falsa_causa', forca_argumento: [0, 1] } },
      ],
    },
    {
      titulo: 'IA no atendimento',
      falas: [
        { quem: 'mediadora', texto: 'Último bloco: usar IA no atendimento ao cliente.' },
        { quem: 'marina', texto: 'Um empresário famoso da moda disse que IA no atendimento é o futuro. Pra mim, isso basta.', esperado: { falacia: 'apelo_autoridade', forca_argumento: [0, 1] } },
        { quem: 'otavio', texto: 'Você critica atendimento lento, mas a sua equipe também leva dois dias pra responder e-mail.', esperado: { falacia: 'tu_quoque', forca_argumento: [0, 1] } },
        { quem: 'marina', texto: 'No nosso teste, a IA resolveu 62% dos chamados simples, e a espera caiu de nove para dois minutos.', esperado: { falacia: 'nenhuma', forca_argumento: [2, 3] } },
        { quem: 'otavio', texto: 'Concordo nos chamados simples. Mas reclamação séria precisa de alguém com poder pra resolver, então eu deixaria com uma pessoa.', esperado: { falacia: 'nenhuma', forca_argumento: [2, 3] } },
      ],
    },
  ],
};

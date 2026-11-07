// Filtro de Feed — enquanto você rola, o Jev esconde o que você descreveu em português.
// Para adaptar: troque as regras (contexto.regras), os motivos e os posts de exemplo.
export default {
  id: 'filtro-feed',
  titulo: 'Filtro de Feed',
  emoji: '🧹',
  categoria: 'imediata',
  ordem: 7,
  resumo: 'Enquanto você rola, o Jev esconde o que você não quer ver — política, spoiler, IA caça-clique — e diz por quê.',
  descricao: 'Você escreve as suas regras em português comum. O Jev lê cada post no instante em que ele aparece e decide se mostra ou esconde, com o motivo. Rodando a centavos por mil posts, dá para filtrar o feed inteiro, não uma amostra.',
  marcas: ['imediato', 'volume'],
  motor: 'fluxo',
  tema: { acento: '#f472b6', acento2: '#a78bfa' },

  contexto: {
    regras: 'Hoje eu NÃO quero ver: política partidária e eleições; spoiler da série "O Último Refúgio" (estou no episódio 4 da 2ª temporada); conteúdo genérico e caça-clique sobre IA ("10 prompts que vão mudar sua vida", "a IA vai substituir todo mundo"); brigas e lacração. Eu QUERO ver: notícias de tecnologia de verdade, humor, receitas e esporte.',
  },
  editavel: { campo: 'regras', rotulo: 'Suas regras (o Jev lê isto)', ajuda: 'Escreva do seu jeito. Ex.: troque "esporte" por "nada de futebol" e aperte ▶ de novo.' },

  decisoes: [
    {
      id: 'esconder', tipo: 'noul', titulo: 'Esconder', rotulo: 'esconder',
      pergunta: 'Pelas regras da pessoa (contexto.regras), este post deve ser ESCONDIDO do feed dela agora?',
    },
    {
      id: 'motivo', tipo: 'choice', titulo: 'Assunto',
      pergunta: 'Qual é o assunto principal deste post?',
      opcoes: [
        { id: 'politica', rotulo: 'Política', icone: '🗳️', desc: 'política partidária, eleição, governo, candidatos' },
        { id: 'spoiler', rotulo: 'Spoiler', icone: '🙈', desc: 'revela o que acontece numa série, filme ou jogo' },
        { id: 'ia_generica', rotulo: 'IA caça-clique', icone: '🤖', desc: 'conteúdo genérico, exagerado ou caça-clique sobre IA' },
        { id: 'briga', rotulo: 'Briga', icone: '🥊', desc: 'discussão agressiva, lacração, ataque a pessoas' },
        { id: 'tecnologia', rotulo: 'Tecnologia', icone: '💻', desc: 'notícia ou análise concreta de tecnologia' },
        { id: 'humor', rotulo: 'Humor', icone: '😂', desc: 'piada, meme, conteúdo leve' },
        { id: 'receita', rotulo: 'Receita', icone: '🍝', desc: 'culinária e receitas' },
        { id: 'esporte', rotulo: 'Esporte', icone: '⚽', desc: 'futebol e outros esportes' },
        { id: 'outro', rotulo: 'Outro', icone: '•', desc: 'nenhum dos assuntos anteriores' },
      ],
    },
  ],

  fluxo: {
    layout: 'feed',
    rotuloItem: 'Post',
    lote: 3,
    ritmo: 1500,
    ocultar: { decisao: 'esconder', limiar: 0.6, motivo: 'motivo', rotuloMostrar: 'mostrados', rotuloEsconder: 'escondidos pelo Jev' },
    cartao: { titulo: 'autor', subtitulo: 'arroba', texto: 'texto', meta: 'tempo', avatar: 'avatar' },
    entrada: { placeholder: 'Cole um post e veja se ele passaria no seu filtro…', botao: 'Testar' },
    rotuloFeitos: 'posts',
  },

  dados: [
    { id: 'p1', autor: 'Tecnoblog Diário', arroba: '@tecnoblogdiario', tempo: '2 min', avatar: '📱', texto: 'A Anatel aprovou o leilão da faixa de 6 GHz para Wi-Fi 7. Na prática: roteadores mais rápidos chegam ao Brasil no 1º semestre.' },
    { id: 'p2', autor: 'Carlos Mendes', arroba: '@carlosmendes', tempo: '4 min', avatar: '🧔', texto: 'Quem votar nesse candidato depois do debate de ontem não tem vergonha na cara. Simples assim.' },
    { id: 'p3', autor: 'Série Fãs BR', arroba: '@seriefansbr', tempo: '5 min', avatar: '🎬', texto: 'NÃO ACREDITO que mataram a Helena no episódio 6 de O Último Refúgio 😭😭 a cena do farol destruiu meu coração' },
    { id: 'p4', autor: 'Receitas da Vó Lúcia', arroba: '@vovolucia', tempo: '8 min', avatar: '👵', texto: 'Bolo de fubá com goiabada cremosa: 3 ovos, 2 xícaras de fubá, 1 de açúcar, 1 de leite e goiabada em cubinhos. 40 min a 180 °C. Simples e perfeito pro café.' },
    { id: 'p5', autor: 'IA Milionária', arroba: '@iamilionaria', tempo: '9 min', avatar: '🤑', texto: '🚨 ESSES 10 PROMPTS VÃO MUDAR SUA VIDA PARA SEMPRE 🚨 O 7º me fez ganhar R$ 30 mil em uma semana. Comente "EU QUERO" 👇' },
    { id: 'p6', autor: 'Gol Placar', arroba: '@golplacar', tempo: '11 min', avatar: '⚽', texto: 'Que jogo! Virada nos acréscimos com gol de bicicleta. Estádio veio abaixo.' },
    { id: 'p7', autor: 'Memes do Escritório', arroba: '@memesescritorio', tempo: '12 min', avatar: '😂', texto: 'Eu na reunião que podia ter sido um e-mail fingindo que tô anotando alguma coisa importante' },
    { id: 'p8', autor: 'Dev Brasil', arroba: '@devbrasil', tempo: '14 min', avatar: '👩‍💻', texto: 'Testei o novo modelo de decisões no nosso suporte: 9 classificações por ticket em 0,3 s, custo de centavos por mil. Escrevi os números no blog.' },
    { id: 'p9', autor: 'Ana Ferraz', arroba: '@anaferraz', tempo: '15 min', avatar: '👩', texto: 'Gente, terminei O Último Refúgio ontem e preciso conversar: aquele final com o irmão sendo o traidor foi genial ou forçado?' },
    { id: 'p10', autor: 'Futuro Agora', arroba: '@futuroagora', tempo: '17 min', avatar: '🔮', texto: 'A IA vai substituir TODOS os empregos até 2027. Quem não se adaptar vai ficar para trás. Não diga que eu não avisei.' },
    { id: 'p11', autor: 'Mercado em Foco', arroba: '@mercadoemfoco', tempo: '18 min', avatar: '📊', texto: 'O ministro anunciou hoje o novo pacote econômico e a oposição já chama de eleitoreiro. Veja o que muda.' },
    { id: 'p12', autor: 'Cozinha Prática', arroba: '@cozinhapratica', tempo: '20 min', avatar: '🍳', texto: 'Arroz soltinho sem erro: lave até a água sair clara e refogue no alho antes da água fervente. Proporção 1 para 2.' },
    { id: 'p13', autor: 'Treta Total', arroba: '@tretatotal', tempo: '21 min', avatar: '🔥', texto: 'Olha o nível do comentário dessa influenciadora 🤡 vamos mostrar pra ela o que a gente pensa' },
    { id: 'p14', autor: 'Hardware Hoje', arroba: '@hardwarehoje', tempo: '23 min', avatar: '🖥️', texto: 'Review: o novo notebook de entrada esquenta menos e tem bateria de 11 h no nosso teste de vídeo. Vale o preço?' },
  ],
};

// O Jev Adivinha — você descreve uma coisa sem dizer o nome e o Jev tenta adivinhar ANTES de você terminar: a cada
// pausa da fala, 196 palpites são pesados numa chamada só. Para adaptar: troque o CATALOGO pelos seus produtos e vire
// "descreva o que você procura e o produto certo aparece".

// 8 categorias, ~24 itens cada (com parecidos de propósito: pinguim × urso-polar × foca): [id, nome que aparece, emoji, pista opcional que vai junto do nome para o Jev]
const CATALOGO = [
  { id: 'animais', rotulo: 'Animais', icone: '🐾', desc: 'um bicho que existe de verdade: mamífero, ave, peixe, réptil ou inseto (não é personagem de história)', itens: [
    ['cachorro', 'cachorro', '🐶'], ['gato', 'gato', '🐱'], ['cavalo', 'cavalo', '🐴'], ['vaca', 'vaca', '🐮'], ['porco', 'porco', '🐷'],
    ['galinha', 'galinha', '🐔'], ['pinguim', 'pinguim', '🐧'], ['elefante', 'elefante', '🐘'], ['girafa', 'girafa', '🦒'], ['leao', 'leão', '🦁'],
    ['macaco', 'macaco', '🐒'], ['cobra', 'cobra', '🐍'], ['tubarao', 'tubarão', '🦈'], ['baleia', 'baleia', '🐋'], ['golfinho', 'golfinho', '🐬'],
    ['coruja', 'coruja', '🦉'], ['papagaio', 'papagaio', '🦜'], ['tartaruga', 'tartaruga', '🐢'], ['jacare', 'jacaré', '🐊'], ['abelha', 'abelha', '🐝'],
    ['urso_polar', 'urso-polar', '🐻‍❄️'], ['foca', 'foca', '🦭'], ['tigre', 'tigre', '🐅'], ['lobo', 'lobo', '🐺'], ['sapo', 'sapo', '🐸'], ['polvo', 'polvo', '🐙'],
  ] },
  { id: 'comidas', rotulo: 'Comidas e bebidas', icone: '🍽️', desc: 'algo que se come ou se bebe', itens: [
    ['pizza', 'pizza', '🍕'], ['hamburguer', 'hambúrguer', '🍔'], ['sushi', 'sushi', '🍣'], ['macarrao', 'macarrão', '🍝'], ['pastel', 'pastel', '🥟', 'massa frita com recheio, de feira'],
    ['pao_de_queijo', 'pão de queijo', '🧀', 'bolinha de massa com queijo, mineira'], ['brigadeiro', 'brigadeiro', '🍫', 'docinho de chocolate de festa de aniversário'], ['pipoca', 'pipoca', '🍿'], ['sorvete', 'sorvete', '🍦'], ['bolo', 'bolo', '🎂'],
    ['melancia', 'melancia', '🍉'], ['banana', 'banana', '🍌'], ['abacate', 'abacate', '🥑'], ['cafe', 'café', '☕'], ['agua_de_coco', 'água de coco', '🥥'],
    ['ovo_frito', 'ovo frito', '🍳'], ['cachorro_quente', 'cachorro-quente', '🌭'], ['batata_frita', 'batata frita', '🍟'], ['feijoada', 'feijoada', '🍲', 'feijão preto com carnes, de sábado'], ['acai', 'açaí', '🫐', 'creme roxo gelado de fruta da Amazônia'],
    ['coxinha', 'coxinha', '🍗', 'salgado de frango em forma de gota, empanado'], ['tapioca', 'tapioca', '🫓', 'massa branca de goma, dobrada com recheio'], ['churrasco', 'churrasco', '🥩'], ['pudim', 'pudim', '🍮'], ['pao_frances', 'pão francês', '🥖'],
  ] },
  { id: 'objetos', rotulo: 'Objetos', icone: '🏠', desc: 'uma coisa que se tem em casa ou se usa no dia a dia', itens: [
    ['televisao', 'televisão', '📺'], ['sofa', 'sofá', '🛋️'], ['cama', 'cama', '🛏️'], ['cadeira', 'cadeira', '🪑'], ['chuveiro', 'chuveiro', '🚿'],
    ['geladeira', 'geladeira', '🧊', 'eletrodoméstico que mantém a comida gelada'], ['chave', 'chave', '🔑'], ['despertador', 'despertador', '⏰'], ['celular', 'celular', '📱'], ['notebook', 'notebook', '💻'],
    ['caneta', 'caneta', '🖊️'], ['tesoura', 'tesoura', '✂️'], ['escova_de_dente', 'escova de dente', '🪥'], ['vassoura', 'vassoura', '🧹'], ['espelho', 'espelho', '🪞'],
    ['lampada', 'lâmpada', '💡'], ['guarda_chuva', 'guarda-chuva', '☂️'], ['ursinho', 'ursinho de pelúcia', '🧸'], ['martelo', 'martelo', '🔨'], ['violao', 'violão', '🎸'],
    ['relogio', 'relógio de pulso', '⌚'], ['oculos', 'óculos', '👓'], ['mochila', 'mochila', '🎒'], ['garfo', 'garfo', '🍴'], ['ventilador', 'ventilador', '🌀', 'aparelho com hélice que faz vento'],
  ] },
  { id: 'profissoes', rotulo: 'Profissões', icone: '💼', desc: 'um trabalho: o que uma pessoa faz para ganhar a vida', itens: [
    ['medico', 'médico', '🧑‍⚕️'], ['professor', 'professor', '🧑‍🏫'], ['bombeiro', 'bombeiro', '🧑‍🚒'], ['policial', 'policial', '👮'], ['cozinheiro', 'cozinheiro', '🧑‍🍳'],
    ['agricultor', 'agricultor', '🧑‍🌾'], ['piloto', 'piloto de avião', '🧑‍✈️'], ['astronauta', 'astronauta', '🧑‍🚀'], ['mecanico', 'mecânico', '🧑‍🔧'], ['pedreiro', 'pedreiro', '👷'],
    ['cabeleireiro', 'cabeleireiro', '💇'], ['juiz', 'juiz', '🧑‍⚖️'], ['dentista', 'dentista', '🦷'], ['programador', 'programador', '🧑‍💻'], ['pintor', 'pintor de quadros', '🎨'],
    ['fotografo', 'fotógrafo', '📸'], ['cantor', 'cantor', '🎤'], ['jogador', 'jogador de futebol', '⚽'], ['motorista', 'motorista de táxi', '🚕'], ['carteiro', 'carteiro', '📬'],
    ['veterinario', 'veterinário', '🐕‍🦺'], ['enfermeiro', 'enfermeiro', '🩺'], ['cientista', 'cientista', '🧑‍🔬'], ['dj', 'DJ', '🎧'],
  ] },
  { id: 'lugares', rotulo: 'Lugares', icone: '📍', desc: 'um lugar aonde se vai: natureza, prédio ou construção', itens: [
    ['praia', 'praia', '🏖️'], ['montanha', 'montanha', '🏔️'], ['ilha', 'ilha', '🏝️'], ['vulcao', 'vulcão', '🌋'], ['deserto', 'deserto', '🏜️'],
    ['floresta', 'floresta', '🌳'], ['hospital', 'hospital', '🏥'], ['escola', 'escola', '🏫'], ['estadio', 'estádio', '🏟️'], ['supermercado', 'supermercado', '🛒'],
    ['aeroporto', 'aeroporto', '🛫'], ['igreja', 'igreja', '⛪'], ['castelo', 'castelo', '🏰'], ['parque_diversoes', 'parque de diversões', '🎡'], ['circo', 'circo', '🎪'],
    ['banco', 'banco (agência)', '🏦'], ['restaurante', 'restaurante', '🍽️'], ['biblioteca', 'biblioteca', '📚'], ['zoologico', 'zoológico', '🦓'], ['espaco', 'espaço sideral', '🌌'],
    ['cinema', 'cinema', '🎬'], ['shopping', 'shopping', '🛍️'], ['padaria', 'padaria', '🥐'], ['cachoeira', 'cachoeira', '💦'], ['farmacia', 'farmácia', '💊'],
  ] },
  { id: 'esportes', rotulo: 'Esportes e jogos', icone: '🏅', desc: 'um esporte, jogo ou brincadeira que se pratica', itens: [
    ['futebol', 'futebol', '⚽'], ['basquete', 'basquete', '🏀'], ['volei', 'vôlei', '🏐'], ['tenis', 'tênis', '🎾'], ['natacao', 'natação', '🏊'],
    ['surfe', 'surfe', '🏄'], ['skate', 'skate', '🛹'], ['boxe', 'boxe', '🥊'], ['judo', 'judô', '🥋'], ['ciclismo', 'ciclismo', '🚴'],
    ['xadrez', 'xadrez', '♟️'], ['truco', 'truco', '🃏', 'jogo de cartas com gritaria'], ['pipa', 'soltar pipa', '🪁'], ['boliche', 'boliche', '🎳'], ['pingue_pongue', 'pingue-pongue', '🏓'],
    ['ioio', 'ioiô', '🪀'], ['quebra_cabeca', 'quebra-cabeça', '🧩'], ['esconde_esconde', 'esconde-esconde', '🙈'], ['corrida', 'corrida', '🏃'], ['escalada', 'escalada', '🧗'],
    ['golfe', 'golfe', '⛳'], ['handebol', 'handebol', '🤾'], ['capoeira', 'capoeira', '🤸', 'luta e dança brasileira com berimbau'], ['sinuca', 'sinuca', '🎱'],
  ] },
  { id: 'veiculos', rotulo: 'Veículos', icone: '🚦', desc: 'algo que leva pessoas ou coisas de um lugar a outro', itens: [
    ['carro', 'carro', '🚗'], ['onibus', 'ônibus', '🚌'], ['bicicleta', 'bicicleta', '🚲'], ['moto', 'moto', '🏍️'], ['aviao', 'avião', '✈️'],
    ['helicoptero', 'helicóptero', '🚁'], ['foguete', 'foguete', '🚀'], ['trem', 'trem', '🚂'], ['metro', 'metrô', '🚇'], ['navio', 'navio', '🚢'],
    ['veleiro', 'veleiro', '⛵'], ['canoa', 'canoa', '🛶'], ['trator', 'trator', '🚜'], ['ambulancia', 'ambulância', '🚑'], ['caminhao_bombeiro', 'caminhão de bombeiro', '🚒'],
    ['patinete', 'patinete', '🛴'], ['bondinho', 'bondinho (teleférico)', '🚠'], ['disco_voador', 'disco voador', '🛸'], ['caminhao', 'caminhão', '🚚'], ['submarino', 'submarino', '🤿', 'navio que anda debaixo da água'],
    ['trem_bala', 'trem-bala', '🚄'], ['carro_corrida', 'carro de corrida', '🏎️'], ['van', 'van', '🚐'], ['taxi', 'táxi', '🚖'],
  ] },
  { id: 'personagens', rotulo: 'Seres de histórias', icone: '✨', desc: 'um ser de lenda, filme, desenho ou festa, que não existe de verdade (inclui robô, alienígena e dinossauro)', itens: [
    ['vampiro', 'vampiro', '🧛'], ['zumbi', 'zumbi', '🧟'], ['bruxa', 'bruxa', '🧙‍♀️'], ['fada', 'fada', '🧚'], ['sereia', 'sereia', '🧜‍♀️'],
    ['dragao', 'dragão', '🐉'], ['unicornio', 'unicórnio', '🦄'], ['fantasma', 'fantasma', '👻'], ['robo', 'robô', '🤖'], ['alienigena', 'alienígena', '👽'],
    ['papai_noel', 'Papai Noel', '🎅'], ['coelho_pascoa', 'Coelho da Páscoa', '🐰'], ['pirata', 'pirata', '🏴‍☠️'], ['super_heroi', 'super-herói', '🦸'], ['palhaco', 'palhaço', '🤡'],
    ['princesa', 'princesa', '👸'], ['rei', 'rei', '🤴'], ['genio', 'gênio da lâmpada', '🧞'], ['esqueleto', 'esqueleto', '💀'], ['dinossauro', 'dinossauro', '🦖'],
    ['anjo', 'anjo', '😇'], ['ninja', 'ninja', '🥷'], ['elfo', 'elfo', '🧝'], ['ogro', 'ogro', '👹'],
  ] },
];

const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };
const opcoesDaCategoria = (cat, fora = []) => [
  ...cat.itens.filter(([id]) => !fora.includes(id)).map(([id, nome, , pista]) => ({ id, desc: pista ? `${nome} (${pista})` : nome })),
  { id: 'nenhum', desc: 'nenhum destes combina com as pistas' },
];

export default {
  id: 'jev-adivinha',
  titulo: 'O Jev Adivinha',
  emoji: '🔮',
  categoria: 'ao-vivo',
  ordem: 0.2,
  resumo: 'Descreva uma coisa sem dizer o nome: a cada pausa da sua fala, o Jev pesa 196 palpites e tenta acertar antes de você terminar.',
  descricao: 'Você fala, e a cada pausa uma chamada só pesa 196 palpites em 8 categorias, em ~0,4 s. A corrida mostra as probabilidades calibradas do Jev, e ele só arrisca quando passa de 85%. Troque o catálogo pelos seus produtos e vira uma busca por descrição.',
  marcas: ['imediato', 'volume', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#ff4fa3', acento2: '#ffc93c' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone, pense numa coisa (um bicho, uma comida, uma profissão…) e descreva sem dizer o nome. Quando o Jev arriscar, diga "acertou" ou "não é".',
  },
  catalogo: CATALOGO,
  limiar: { arriscar: 0.85, folga: 3, minimoPalavras: 5 },
  contexto: {
    jogo: 'adivinhação: a pessoa descreve uma coisa sem dizer o nome dela e o Jev tenta adivinhar o que é',
  },
  decisoes: [
    {
      id: 'categoria', tipo: 'choice', titulo: 'Categoria',
      pergunta: 'A pessoa está descrevendo uma coisa SEM dizer o nome dela (jogo de adivinhação). De que tipo é a coisa descrita? Use todas as pistas ditas até agora. Se a descrição ainda é vaga demais para saber o tipo, escolha nao_sei.',
      opcoes: [...CATALOGO.map((c) => ({ id: c.id, rotulo: c.rotulo, icone: c.icone, desc: `${c.rotulo}: ${c.desc}` })), { id: 'nao_sei', rotulo: 'Ainda não dá', icone: '❔', desc: 'ainda não dá para saber: a descrição é vaga demais' }],
    },
    {
      id: 'item', tipo: 'choice', titulo: 'Palpite',
      pergunta: 'A pessoa está descrevendo uma coisa SEM dizer o nome dela (jogo de adivinhação). Suponha que a coisa seja da categoria abaixo: qual destes itens ela está descrevendo? Use todas as pistas (aparência, tamanho, onde fica, para que serve, o que faz, quando aparece). Se nenhum item combina com as pistas, escolha nenhum.',
      opcoes: opcoesDaCategoria(CATALOGO[0]),
    },
  ],
  jogadas: {
    // a cada pausa da fala: 1 pergunta de categoria + 1 por categoria ("se for desta categoria, qual é?")
    palpite: {
      estado: (d) => {
        const nao = Array.isArray(d.ja_errou) ? d.ja_errou.slice(0, 12).map((x) => corta(x, 40)) : [];
        return { descricao_da_pessoa: corta(d.descricao, 700), ...(nao.length ? { nao_e_nenhum_destes: nao } : {}) };
      },
      perguntas: (d) => {
        const fora = Array.isArray(d.ja_errou_ids) ? d.ja_errou_ids.map(String) : [];
        return [
          { chave: 'categoria', decisao: 'categoria' },
          ...CATALOGO.map((c) => ({ chave: 'c_' + c.id, decisao: 'item', opcoes: opcoesDaCategoria(c, fora), alvo: `Categoria: «${c.rotulo}» — ${c.desc}.` })),
        ];
      },
    },
  },
  testes: [
    { titulo: 'pinguim', jogada: 'palpite', dados: { descricao: 'é um bicho que vive no gelo, não voa e parece que anda de terno' }, esperado: { categoria: 'animais', c_animais: 'pinguim' } },
    { titulo: 'pizza', jogada: 'palpite', dados: { descricao: 'é uma comida redonda que vem cortada em fatias e tem queijo derretido em cima' }, esperado: { categoria: 'comidas', c_comidas: 'pizza' } },
    { titulo: 'deserto', jogada: 'palpite', dados: { descricao: 'é um lugar com muita areia, mas não tem mar, é muito quente de dia e frio de noite' }, esperado: { categoria: 'lugares', c_lugares: 'deserto' } },
    { titulo: 'bombeiro', jogada: 'palpite', dados: { descricao: 'é uma pessoa que trabalha apagando incêndio e às vezes tira gato de cima da árvore' }, esperado: { categoria: 'profissoes', c_profissoes: 'bombeiro' } },
    { titulo: 'foguete', jogada: 'palpite', dados: { descricao: 'leva gente para fora da Terra, sai soltando fogo para cima' }, esperado: { categoria: 'veiculos', c_veiculos: 'foguete' } },
    { titulo: 'vampiro', jogada: 'palpite', dados: { descricao: 'não existe de verdade, bebe sangue, dorme num caixão e tem medo de alho' }, esperado: { categoria: 'personagens', c_personagens: 'vampiro' } },
    { titulo: 'vassoura', jogada: 'palpite', dados: { descricao: 'tem um cabo comprido e a gente usa para limpar o chão de casa' }, esperado: { categoria: 'objetos', c_objetos: 'vassoura' } },
    { titulo: 'surfe', jogada: 'palpite', dados: { descricao: 'um esporte que se faz no mar, em pé numa prancha, pegando onda' }, esperado: { categoria: 'esportes', c_esportes: 'surfe' } },
    { titulo: 'elefante', jogada: 'palpite', dados: { descricao: 'um bicho enorme, cinza, com orelhas grandes e uma tromba' }, esperado: { categoria: 'animais', c_animais: 'elefante' } },
    { titulo: 'café', jogada: 'palpite', dados: { descricao: 'uma bebida preta e quente que muita gente toma de manhã para acordar' }, esperado: { categoria: 'comidas', c_comidas: 'cafe' } },
    { titulo: 'alienígena', jogada: 'palpite', dados: { descricao: 'é verde, vem de outro planeta e chega num disco voador' }, esperado: { c_personagens: 'alienigena' } },
    { titulo: 'supermercado', jogada: 'palpite', dados: { descricao: 'é o lugar onde a gente empurra um carrinho e compra a comida da semana' }, esperado: { categoria: 'lugares', c_lugares: 'supermercado' } },
    { titulo: 'trator', jogada: 'palpite', dados: { descricao: 'um veículo grande com rodas enormes que trabalha na fazenda puxando o arado' }, esperado: { categoria: 'veiculos', c_veiculos: 'trator' } },
    { titulo: 'xadrez', jogada: 'palpite', dados: { descricao: 'um jogo de tabuleiro com rei, rainha, cavalo e torre' }, esperado: { categoria: 'esportes', c_esportes: 'xadrez' } },
    { titulo: 'dentista', jogada: 'palpite', dados: { descricao: 'a pessoa que cuida dos seus dentes e tem aquela cadeira com motorzinho' }, esperado: { categoria: 'profissoes', c_profissoes: 'dentista' } },
    { titulo: 'vaga ainda', jogada: 'palpite', dados: { descricao: 'é uma coisa' }, esperado: { categoria: 'nao_sei' } },
    { titulo: 'pinguim já recusado', jogada: 'palpite', dados: { descricao: 'é um bicho que vive no gelo, não voa e parece que anda de terno', ja_errou: ['pinguim'], ja_errou_ids: ['pinguim'] }, esperado: { categoria: 'animais' } },
  ],
};

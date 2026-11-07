// Casamenteiro de Networking — num evento, cruza "o que eu busco" com "o que eu ofereço" e sugere as apresentações com negócio real.
// Para adaptar: troque as listas (lado 'a' = o que busca; 'b' = o que oferece) e os pares candidatos, que o seu código pré-filtra.
export default {
  id: 'casamenteiro-networking',
  titulo: 'Casamenteiro de Networking',
  emoji: '🤝',
  categoria: 'vendas',
  ordem: 35,
  resumo: 'Cruza o que cada participante busca com o que os outros oferecem e sugere as apresentações com chance real de negócio.',
  descricao: '"Busco embalagem compostável" e "vendo composto para horta" têm palavras parecidas e nenhum negócio; "frete refrigerado" e "laticínios com frete caro" não têm palavra em comum e são um ótimo par. O Jev julga cada par pelo sentido, diz o motivo (cliente, fornecedor, parceria ou mentoria), e só os pares acima de 70% viram apresentação.',
  marcas: ['volume', 'limiar'],
  motor: 'pares',
  tema: { acento: '#b83dba', acento2: '#818cf8' },

  contexto: {
    evento: 'Encontro de Empreendedores de Campinas (fictício): 300 inscritos, cada um escreveu o que busca e o que oferece',
    objetivo: 'sugerir apresentações 1 a 1 que tenham chance real de virar negócio',
  },

  decisoes: [
    {
      id: 'bom_par', tipo: 'noul', titulo: 'Bom par',
      pergunta: 'O que B oferece atende ao que A BUSCA (escrito por A), a ponto de valer apresentar os dois no evento? Palavras parecidas não bastam: precisa haver negócio real.',
    },
    {
      id: 'motivo', tipo: 'choice', titulo: 'Motivo',
      pergunta: 'Que tipo de negócio pode sair deste par, do ponto de vista do que A busca? Escolha "nenhum" se o que B oferece não atende ao que A busca.',
      opcoes: [
        { id: 'cliente', rotulo: 'B vira cliente', icone: '🛒', tom: 'bom', desc: 'B tem o perfil de quem COMPRARIA o que A vende (A procura clientes e B tem exatamente essa necessidade)' },
        { id: 'fornecedor', rotulo: 'B vira fornecedor', icone: '📦', tom: 'info', desc: 'B VENDE o produto ou serviço que A quer comprar' },
        { id: 'parceria', rotulo: 'parceria', icone: '🤝', tom: 'acento', desc: 'A e B atendem o mesmo público e podem trocar indicações ou vender juntos, sem um comprar do outro' },
        { id: 'mentoria', rotulo: 'mentoria', icone: '🧭', tom: 'medio', desc: 'B tem experiência ou capital para orientar ou investir em A (mentor, investidor, conselheiro)' },
        { id: 'nenhum', rotulo: 'sem encaixe', icone: '🚫', tom: 'ruim', desc: 'o que B oferece não atende ao que A busca' },
      ],
    },
  ],

  pares: {
    decisao: 'bom_par',
    limiar: 0.7,
    lote: 2,
    ritmo: 3800,
    rotuloA: 'Quem busca',
    rotuloB: 'Quem oferece',
    rotuloSim: 'apresentações',
    rotuloNao: 'sem encaixe',
    rotuloSimCurto: 'apresentar',
    rotuloNaoCurto: 'não apresentar',
    tituloPlacar: 'Rodada de networking',
    tituloLista: 'Pares avaliados (apresentar só acima de 70%)',
    cartao: { titulo: 'nome', subtitulo: 'empresa', texto: 'texto', avatar: 'avatar' },
  },

  dados: [
    { id: 'a1', lado: 'a', avatar: '🥗', nome: 'Renata Okada', empresa: 'Pote Verde Marmitas', texto: 'Busco fornecedor de embalagem compostável para 6 mil marmitas por mês, com entrega em Campinas.' },
    { id: 'a2', lado: 'a', avatar: '📱', nome: 'Caio Mendonça', empresa: 'AgendaFit, app de agendamento', texto: 'Busco clientes: academias e estúdios de pilates que ainda marcam aula pelo WhatsApp.' },
    { id: 'a3', lado: 'a', avatar: '👗', nome: 'Luana Freitas', empresa: 'Ateliê Luana, moda autoral', texto: 'Busco mentoria para abrir a primeira loja física sem quebrar o caixa.' },
    { id: 'a4', lado: 'a', avatar: '📷', nome: 'Marina Couto', empresa: 'Studio Couto, foto de produto', texto: 'Busco parceiros que atendam lojas virtuais e indiquem meu serviço de foto de produto; pago comissão por indicação.' },
    { id: 'a5', lado: 'a', avatar: '☕', nome: 'Paulo Siqueira', empresa: 'Café Serra Alta, torrefação', texto: 'Busco cafeterias e restaurantes que comprem café especial em grão no atacado.' },
    { id: 'a6', lado: 'a', avatar: '🧾', nome: 'Júlia Andrade', empresa: 'Rota Fiscal, software de nota fiscal', texto: 'Busco investidor-anjo ou mentor que já tenha captado uma rodada seed.' },
    { id: 'a7', lado: 'a', avatar: '🚚', nome: 'Rodrigo Leal', empresa: 'Leal Transportes', texto: 'Busco empresas que precisem de frete refrigerado entre São Paulo e o Sul.' },
    { id: 'b1', lado: 'b', avatar: '📦', nome: 'Helena Brito', empresa: 'EcoPack Embalagens', texto: 'Fábrica de embalagens compostáveis de bagaço de cana; pedido mínimo de 2 mil unidades; entregamos em todo o interior de SP.' },
    { id: 'b2', lado: 'b', avatar: '🏋️', nome: 'Fábio Nunes', empresa: 'Rede Movimento Academias', texto: 'Tenho 12 academias em SP e quero tirar o agendamento das aulas do WhatsApp; estou testando ferramentas.' },
    { id: 'b3', lado: 'b', avatar: '🧵', nome: 'Sandra Melo', empresa: 'ex-fundadora da Loja Trama', texto: 'Abri e fechei 9 lojas físicas de moda em 10 anos; hoje oriento marcas pequenas na passagem do online para a loja física.' },
    { id: 'b4', lado: 'b', avatar: '🛍️', nome: 'Tiago Rocha', empresa: 'Agência Vitrine Digital', texto: 'Montamos lojas virtuais para 60 marcas e indicamos fornecedores de foto, frete e conteúdo aos nossos clientes.' },
    { id: 'b5', lado: 'b', avatar: '🍰', nome: 'Bruno Tavares', empresa: 'Grupo Sabor da Praça', texto: 'Tenho 5 cafeterias em Campinas e quero trocar o fornecedor de café por um especial com bom preço.' },
    { id: 'b6', lado: 'b', avatar: '💼', nome: 'Patrícia Lemos', empresa: 'investidora-anjo', texto: 'Investi em 14 startups de software para empresas; acompanho fundadores na primeira captação.' },
    { id: 'b7', lado: 'b', avatar: '🧀', nome: 'Gustavo Prado', empresa: 'FrioSul Laticínios', texto: 'Enviamos 20 toneladas de queijo e iogurte por mês de SP para Curitiba e Porto Alegre; o frete atual é caro e atrasa.' },
    { id: 'b8', lado: 'b', avatar: '👟', nome: 'Roberto Dias', empresa: 'Loja Dias Calçados', texto: 'Tenho uma loja de calçados no centro há 3 anos; topo trocar experiências com quem está começando.' },
    { id: 'b9', lado: 'b', avatar: '🌱', nome: 'Fabiana Reis', empresa: 'Horta Viva', texto: 'Vendo adubo orgânico e composto para hortas, em sacos de 5 kg.' },
  ],

  // pares candidatos (o seu código acha por setor, cidade ou palavra-chave); o 3º elemento é o esperado
  paresDemo: [
    ['a1', 'b1', { bom_par: true, motivo: 'fornecedor' }],
    ['a1', 'b9', { bom_par: false, motivo: 'nenhum' }],
    ['a2', 'b2', { bom_par: true, motivo: 'cliente' }],
    ['a7', 'b7', { bom_par: true, motivo: 'cliente' }],
    ['a3', 'b1', { bom_par: false, motivo: 'nenhum' }],
    ['a3', 'b3', { bom_par: true, motivo: 'mentoria' }],
    ['a4', 'b4', { bom_par: true, motivo: 'parceria' }],
    ['a2', 'b5', { bom_par: false, motivo: 'nenhum' }],
    ['a5', 'b5', { bom_par: true, motivo: 'cliente' }],
    ['a6', 'b8', { bom_par: false, motivo: 'nenhum' }],
    ['a6', 'b6', { bom_par: true, motivo: 'mentoria' }],
    ['a3', 'b8'], // talvez: tem alguma experiência de loja física, mas pouca — fica abaixo dos 70% (sem esperado: é dúvida de verdade)
    ['a5', 'b6', { bom_par: false, motivo: 'nenhum' }],
    ['a7', 'b3', { bom_par: false, motivo: 'nenhum' }],
  ],
};

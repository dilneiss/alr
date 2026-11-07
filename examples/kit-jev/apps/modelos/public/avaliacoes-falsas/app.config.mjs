// Caçador de Avaliações Falsas — cada avaliação da loja vai para a raia certa: genuína, incentivada, falsa ou fora do assunto.
// Para adaptar: troque a loja e os concorrentes (contexto), e mande junto os sinais que a SUA plataforma já calcula (compra verificada, idade da conta).
const LIMIAR = 0.7;
const media = (s, n) => (n ? (s / n).toFixed(1).replace('.', ',') + ' ★' : '—');

export default {
  id: 'avaliacoes-falsas',
  titulo: 'Caçador de Avaliações Falsas',
  emoji: '⭐',
  categoria: 'confianca',
  ordem: 24,
  resumo: 'Toda avaliação da loja passa pelo Jev: genuína, incentivada, falsa ou fora do assunto — e você vê a nota de verdade do produto.',
  descricao: 'O Jev lê cada avaliação junto com os sinais que a plataforma já calcula (compra verificada, idade da conta, texto repetido) e decide a raia, o nível de detalhe e se cita concorrente. O que vem com pouca confiança vai para uma pessoa. Ironia, gíria e "ganhei em troca da minha opinião sincera" não enganam: é linguagem, não palavra-chave.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#fbbf24', acento2: '#fde047' },
  origem: 'ideia sem dono da lista awesome-jev',

  contexto: {
    loja: 'Casa Brisa: loja de eletroportáteis num marketplace',
    produtos: 'Air Fryer Brisa 5L e Liquidificador Turbo 900W',
    concorrentes: 'Torvel e Krispo (marcas concorrentes)',
    sinais_da_plataforma: 'cada avaliação vem com as estrelas, se a compra foi verificada, a idade da conta e alertas calculados pelo código (texto repetido, muitas avaliações no mesmo dia)',
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'Raia',
      pergunta: 'Que tipo de avaliação é esta? Use também os sinais que a plataforma calculou (compra verificada, idade da conta, avaliações no mesmo dia, texto repetido).',
      opcoes: [
        { id: 'genuina', rotulo: 'Genuína', icone: '✅', cor: '#34d399', desc: 'cliente de verdade contando a própria experiência com o produto, boa ou ruim, mesmo curta, irônica ou com erro de digitação' },
        { id: 'incentivada', rotulo: 'Incentivada', icone: '🎁', cor: '#60a5fa', desc: 'diz que ganhou algo para avaliar ou que ganhou o produto: grátis, cupom, desconto, vale ou sorteio, mesmo dizendo "opinião sincera"' },
        { id: 'falsa', rotulo: 'Falsa', icone: '🎭', cor: '#f87171', desc: 'escrita para enganar: elogio genérico e exagerado sem uso real, texto repetido, conta nova sem compra verificada, ou ataque e propaganda de concorrente' },
        { id: 'fora_do_assunto', rotulo: 'Fora do assunto', icone: '💬', cor: '#94a3b8', desc: 'não avalia o produto: só reclama da entrega ou do marketplace, faz uma pergunta ou é spam' },
      ],
    },
    {
      id: 'detalhe', tipo: 'score', titulo: 'Detalhe',
      pergunta: 'Quanto detalhe de uso real do produto esta avaliação traz?',
      niveis: [
        { rotulo: 'nenhum', desc: 'nada sobre o uso do produto: só elogio, xingamento, pergunta ou outro assunto' },
        { rotulo: 'pouco', desc: 'um detalhe concreto' },
        { rotulo: 'bom', desc: 'uso real com alguns detalhes' },
        { rotulo: 'rico', desc: 'tempo de uso, situação concreta, prós e contras' },
      ],
    },
    {
      id: 'menciona_concorrente', tipo: 'noul', titulo: 'Cita concorrente', rotulo: 'cita concorrente', icone: '🏷️', tom: 'info', limiar: 0.5,
      pergunta: 'A avaliação cita outra marca, loja ou produto concorrente (para comparar, recomendar ou atacar)?',
    },
  ],

  fluxo: {
    colunas: 'tipo',
    rotuloItem: 'Avaliação',
    lote: 4,
    ritmo: 5000,
    humano: { limiar: LIMIAR, rotulo: 'Revisão humana', icone: '🙋' },
    cartao: { titulo: 'autor', subtitulo: 'produto', texto: 'texto', meta: 'info', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma avaliação (com as estrelas e os dados da conta, se tiver) e veja a raia…', botao: 'Julgar' },
    rotuloFeitos: 'avaliações',
  },

  // a nota "de verdade": média das estrelas só das genuínas com confiança alta (conta feita pelo código)
  aoDecidir(item, resp, extra) {
    if (typeof item.nota !== 'number') return;
    extra.soma = (extra.soma || 0) + item.nota; extra.n = (extra.n || 0) + 1;
    const a = resp.tipo;
    if (a && a.choice === 'genuina' && (a.probabilities?.genuina ?? 0) >= LIMIAR) { extra.somaG = (extra.somaG || 0) + item.nota; extra.nG = (extra.nG || 0) + 1; }
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'nota com todas', valor: media(extra.soma, extra.n) },
      { rotulo: 'nota só das genuínas', valor: media(extra.somaG, extra.nG) },
    ];
  },

  dados: [
    { id: 'r1', autor: 'Ana Paula R.', avatar: '👩', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Uso todo dia há 2 meses. A batata fica sequinha em 18 minutos e o cesto é fácil de lavar. Só achei o barulho um pouco alto.', info: '5 estrelas · compra verificada · conta desde 2021', esperado: { tipo: 'genuina', detalhe: [2, 3], menciona_concorrente: false } },
    { id: 'r2', autor: 'Marcos V.', avatar: '🙂', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Produto excelente!!! Melhor compra da vida!!! Recomendo demais, nota mil!!!', info: '5 estrelas · compra NÃO verificada · conta criada há 2 dias · 9 avaliações hoje', esperado: { tipo: 'falsa', detalhe: 0, menciona_concorrente: false } },
    { id: 'r3', autor: 'Juliana R.', avatar: '👩‍🦰', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Recebi o produto de graça em troca da minha opinião sincera. É bonito e esquenta rápido.', info: '5 estrelas · compra verificada · conta desde 2020', esperado: { tipo: 'incentivada', menciona_concorrente: false } },
    { id: 'r4', autor: 'Carlos E.', avatar: '🧔', nota: 1, produto: 'Air Fryer Brisa 5L', texto: 'A transportadora deixou a caixa na chuva e atrasou 10 dias. Nem abri ainda.', info: '1 estrela · compra verificada · conta desde 2019', esperado: { tipo: 'fora_do_assunto', detalhe: 0, menciona_concorrente: false } },
    { id: 'r5', autor: 'Lu_fit2026', avatar: '🏋️', nota: 1, produto: 'Liquidificador Turbo 900W', texto: 'Não comprem, é lixo. Comprem o liquidificador da Torvel, que é muito melhor e mais barato.', info: '1 estrela · compra NÃO verificada · conta criada ontem', esperado: { tipo: 'falsa', detalhe: 0, menciona_concorrente: true } },
    { id: 'r6', autor: 'Seu Antônio', avatar: '👴', nota: 4, produto: 'Liquidificador Turbo 900W', texto: 'faço vitamina de abacate todo dia de manha, bate gelo de boa. so a tampa q vaza um pouco se encher demais', info: '4 estrelas · compra verificada · conta desde 2018', esperado: { tipo: 'genuina', detalhe: [2, 3], menciona_concorrente: false } },
    { id: 'r7', autor: 'Bia M.', avatar: '👱‍♀️', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Ganhei um cupom de 20% pra avaliar com 5 estrelas, então aqui estou kkkk. Ainda nem usei.', info: '5 estrelas · compra verificada · conta desde 2022', esperado: { tipo: 'incentivada', detalhe: 0 } },
    { id: 'r8', autor: 'Paulo H.', avatar: '🧑', nota: 5, produto: 'Liquidificador Turbo 900W', texto: 'Alguém sabe se esse modelo serve em 220V?', info: '5 estrelas · compra verificada · conta desde 2023', esperado: { tipo: 'fora_do_assunto', detalhe: 0, menciona_concorrente: false } },
    { id: 'r9', autor: 'Rafa', avatar: '😏', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Ótimo produto, durou exatos 3 dias. Recomendo pra quem gosta de emoção.', info: '5 estrelas · compra verificada · conta desde 2021', esperado: { tipo: 'genuina' } },
    { id: 'r10', autor: 'Daniela C.', avatar: '👩', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Excelente produto, entrega rápida, recomendo a todos. Excelente produto, entrega rápida, recomendo a todos.', info: '5 estrelas · compra NÃO verificada · conta criada há 3 dias · texto igual ao de 14 outras avaliações', esperado: { tipo: 'falsa', detalhe: 0 } },
    { id: 'r11', autor: 'Thiago N.', avatar: '🧑‍🍳', nota: 4, produto: 'Liquidificador Turbo 900W', texto: 'Troquei meu velho Torvel por esse e senti a diferença: o motor aguenta massa de pão de queijo sem esquentar. Pena que o copo é de plástico.', info: '4 estrelas · compra verificada · conta desde 2017', esperado: { tipo: 'genuina', detalhe: [2, 3], menciona_concorrente: true } },
    { id: 'r12', autor: 'Promo Ofertas', avatar: '📢', nota: 5, produto: 'Air Fryer Brisa 5L', texto: '🔥 Ganhe R$ 500 por dia trabalhando de casa! Chama no link da bio 🔥', info: '5 estrelas · compra NÃO verificada · conta criada hoje', esperado: { tipo: 'fora_do_assunto', menciona_concorrente: false } },
    { id: 'r13', autor: 'Fernanda S.', avatar: '👩‍💼', nota: 5, produto: 'Liquidificador Turbo 900W', texto: 'Ganhei esse liquidificador no sorteio da loja, mas sinceramente é muito bom: 3 velocidades e lâmina forte.', info: '5 estrelas · compra NÃO verificada (prêmio de sorteio) · conta desde 2020', esperado: { tipo: 'incentivada', menciona_concorrente: false } },
    { id: 'r14', autor: 'Gustavo L.', avatar: '👨', nota: 2, produto: 'Air Fryer Brisa 5L', texto: 'Depois de 4 meses a pintura do cesto começou a descascar. Liguei no SAC e trocaram, mas demorou 3 semanas.', info: '2 estrelas · compra verificada · conta desde 2019', esperado: { tipo: 'genuina', detalhe: [2, 3], menciona_concorrente: false } },
    { id: 'r15', autor: 'Maria', avatar: '👵', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Muito bom.', info: '5 estrelas · compra verificada · conta desde 2016', esperado: { detalhe: 0, menciona_concorrente: false } },
    { id: 'r16', autor: 'Loja Torvel Oficial', avatar: '🏪', nota: 1, produto: 'Air Fryer Brisa 5L', texto: 'Esquenta demais e cheira a plástico queimado. Conheçam a linha Torvel, com 2 anos de garantia.', info: '1 estrela · compra NÃO verificada · conta de loja', esperado: { tipo: 'falsa', menciona_concorrente: true } },
    { id: 'r17', autor: 'Rodrigo P.', avatar: '🙋‍♂️', nota: 5, produto: 'Liquidificador Turbo 900W', texto: 'A loja me deu um vale de R$ 30 na próxima compra se eu avaliasse. Produto bom, bate tudo.', info: '5 estrelas · compra verificada · conta desde 2021', esperado: { tipo: 'incentivada', menciona_concorrente: false } },
    { id: 'r18', autor: 'Patrícia M.', avatar: '🙍‍♀️', nota: 3, produto: 'Air Fryer Brisa 5L', texto: 'O produto é ok, mas o marketplace cobrou o frete duas vezes e o atendimento do site não responde.', info: '3 estrelas · compra verificada · conta desde 2020', esperado: { menciona_concorrente: false } },
    { id: 'r19', autor: 'Joana T.', avatar: '👩‍🦳', nota: 5, produto: 'Liquidificador Turbo 900W', texto: 'Melhor liquidificador que já tive!!! Perfeito, maravilhoso, nota 10!!!', info: '5 estrelas · compra NÃO verificada · conta criada há 1 dia · 11 avaliações hoje', esperado: { tipo: 'falsa', detalhe: 0, menciona_concorrente: false } },
    { id: 'r20', autor: 'Henrique A.', avatar: '👨‍🦱', nota: 5, produto: 'Air Fryer Brisa 5L', texto: 'Comparando com a Krispo que eu tinha, essa assa o frango por igual sem precisar virar. Cabe um frango de 1,8 kg inteiro.', info: '5 estrelas · compra verificada · conta desde 2015', esperado: { tipo: 'genuina', detalhe: [2, 3], menciona_concorrente: true } },
  ],
};

// Copiloto de Live Commerce — lê cada comentário do chat da live, entende a intenção e o produto, e avisa a apresentadora.
// Para adaptar: troque os produtos (nome, preço, tamanhos), as condições de pagamento e os comentários dos roteiros.
const PRODUTOS = [
  { id: 'vestido_floral', nome: 'Vestido Floral Midi', preco: 'R$ 189,90', tamanhos: 'do P ao GG', curto: 'P ao GG', icone: '👗' },
  { id: 'blusa_linho', nome: 'Blusa de Linho Off-White', preco: 'R$ 129,90', tamanhos: 'do P ao G', curto: 'P ao G', icone: '👚' },
  { id: 'calca_pantalona', nome: 'Calça Pantalona Preta', preco: 'R$ 159,90', tamanhos: 'do 36 ao 46', curto: '36 ao 46', icone: '👖' },
  { id: 'jaqueta_jeans', nome: 'Jaqueta Jeans Oversized', preco: 'R$ 219,90', tamanhos: 'tamanho único, veste do 38 ao 44', curto: 'tamanho único', icone: '🧥' },
  { id: 'bolsa_palha', nome: 'Bolsa de Palha Média', preco: 'R$ 99,90', tamanhos: '32 × 24 cm, cabe celular, carteira e garrafinha', curto: '32 × 24 cm', icone: '👜' },
  { id: 'sandalia_tiras', nome: 'Sandália de Tiras Caramelo', preco: 'R$ 139,90', tamanhos: 'do 34 ao 39', curto: '34 ao 39', icone: '👡' },
];

const PARTICIPANTES = {
  bia: { nome: 'Bia (apresentadora)', avatar: '🎙️', lado: 'esq' },
  ana: { nome: 'ana.lu', avatar: '🙂', lado: 'esq' },
  carol: { nome: 'carolzinha_', avatar: '😊', lado: 'esq' },
  jessica: { nome: 'jessica.m', avatar: '😄', lado: 'esq' },
  marcia: { nome: 'marcia_rosa', avatar: '🌹', lado: 'esq' },
  leticia: { nome: 'leticia.ps', avatar: '💁', lado: 'esq' },
  promo: { nome: 'promo.da.vez', avatar: '📢', lado: 'esq' },
};
const ESPECTADORAS = Object.keys(PARTICIPANTES).filter((k) => k !== 'bia');
const INTERESSE = ['quer_comprar', 'duvida_tamanho', 'duvida_preco'];
const sistema = (texto) => ({ texto, quem: '__sistema', classe: 'sistema' });
const produtoDe = (resp) => PRODUTOS.find((p) => p.id === (resp.produto && resp.produto.choice));

export default {
  id: 'copiloto-live-commerce',
  titulo: 'Copiloto de Live Commerce',
  emoji: '🛍️',
  categoria: 'vendas',
  ordem: 38,
  resumo: 'Lê cada comentário do chat da live, entende "quero esse no M" e mostra o produto certo na tela, com o recado pronto para a apresentadora.',
  descricao: 'Numa live de vendas o chat corre rápido demais para alguém ler tudo. A cada comentário o Jev decide a intenção (comprar, tamanho, preço, elogio, spam) e de qual dos 6 produtos se fala, até quando a pessoa diz "esse" ou "o de antes". O cartão do produto aparece sobre o vídeo e os recados para a apresentadora são textos da loja, com o preço da tabela.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#ff4f9a', acento2: '#ffb020' },

  contexto: {
    loja: 'Loja Lírio — moda feminina (fictícia); live de quinta à noite com a apresentadora Bia',
    produtos: PRODUTOS.map((p) => `${p.nome}: ${p.preco}, ${p.tamanhos}`),
    pagamento: 'até 3× sem juros no cartão, Pix com 5% de desconto e frete grátis acima de R$ 299',
  },

  decisoes: [
    {
      id: 'intencao', tipo: 'choice', papel: 'destaque', titulo: 'Intenção',
      pergunta: 'O que este comentário do chat da live quer? Use a conversa até aqui para entender "esse", "quero" e "o de antes".',
      opcoes: [
        { id: 'duvida_tamanho', rotulo: 'Dúvida de tamanho', icone: '📏', desc: 'pergunta tamanho, numeração, medida, caimento ou se a peça serve no corpo dela' },
        { id: 'quer_comprar', rotulo: 'Quer comprar', icone: '🛒', tom: 'bom', desc: 'quer comprar ou reservar: "eu quero", "qro 1", "separa pra mim", "manda o link", "como compro"' },
        { id: 'elogio', rotulo: 'Elogio', icone: '😍', desc: 'elogia a peça, o look ou a apresentadora, sem pedir nada' },
        { id: 'duvida_preco', rotulo: 'Dúvida de preço', icone: '💲', desc: 'pergunta preço, parcelamento, desconto, frete ou forma de pagamento' },
        { id: 'spam', rotulo: 'Spam', icone: '🚫', tom: 'ruim', alerta: true, desc: 'propaganda de outro perfil ou loja, link suspeito, "ganhe dinheiro", sorteio ou mensagem sem relação com a live' },
        { id: 'outro', rotulo: 'Outro', icone: '💬', desc: 'cumprimento, conversa ou qualquer outra coisa' },
      ],
    },
    {
      id: 'produto', tipo: 'choice', papel: 'destaque', titulo: 'Produto',
      pergunta: 'De qual produto da live este comentário fala? A apresentadora mostra um produto por vez: "esse" e "o de agora" são o último produto que ela apresentou; "o anterior" ou "o de antes" é o produto mostrado antes dele. Escolha "nenhum" se o comentário não é sobre um produto.',
      opcoes: [
        ...PRODUTOS.map((p) => ({ id: p.id, rotulo: p.nome, icone: p.icone, desc: `${p.nome} (${p.preco})` })),
        { id: 'nenhum', rotulo: 'Nenhum produto', icone: '➖', desc: 'o comentário não fala de nenhum produto da live (cumprimento, elogio à apresentadora, spam)' },
      ],
    },
  ],

  conversa: {
    skin: 'live',
    titulo: 'Live da Loja Lírio',
    subtitulo: 'ao vivo · 1.284 assistindo · copiloto do Jev ligado',
    avatar: '👗',
    participantes: PARTICIPANTES,
    analisar: ESPECTADORAS,
    voce: 'ana',
    placeholder: 'Comente como espectadora (ex.: "tem no M?", "quero esse!")',
    ritmo: 1.5,
    tituloPlacar: 'Copiloto da live',
    tituloAnalise: 'O Jev julgou cada comentário',
    abertura: '🔴 A live começou · o copiloto lê cada comentário e avisa a Bia',
    riscar: { decisao: 'intencao', opcoes: ['spam'] },

    // recados para a apresentadora: textos da loja, com preço e tamanho da tabela (o Jev só escolhe intenção e produto)
    responder(resp, fala) {
      const i = resp.intencao && resp.intencao.choice;
      const p = produtoDe(resp);
      const quem = (PARTICIPANTES[fala.quem] || {}).nome || 'alguém';
      if (i === 'spam') return sistema('🚫 Comentário escondido do chat: spam.');
      if (i === 'duvida_preco') return sistema(p ? `💲 Para a Bia responder no ar: ${p.nome} sai por ${p.preco}; até 3× sem juros, Pix com 5% de desconto.` : '💲 Para a Bia responder no ar: até 3× sem juros, Pix com 5% de desconto e frete grátis acima de R$ 299.');
      if (!p) return null;
      if (i === 'quer_comprar') return sistema(`🛒 Pedido de ${quem}: ${p.nome} (${p.preco}). Link de compra fixado no chat.`);
      if (i === 'duvida_tamanho') return sistema(`📏 Para a Bia responder no ar: ${p.nome}, ${p.tamanhos}.`);
      return null;
    },

    // cartão do produto sobre o vídeo, com a contagem de pedidos e de interessadas (contas do código)
    produtoLive(resp, fala, ctx, estado) {
      const i = resp.intencao && resp.intencao.choice;
      const p = produtoDe(resp);
      if (p && INTERESSE.includes(i)) {
        estado.interesse = estado.interesse || {};
        estado.pedidos = estado.pedidos || {};
        estado.interesse[p.id] = (estado.interesse[p.id] || 0) + 1;
        if (i === 'quer_comprar') estado.pedidos[p.id] = (estado.pedidos[p.id] || 0) + 1;
        const n = estado.pedidos[p.id] || 0, k = estado.interesse[p.id];
        estado.cartao = `<span style="font-size:30px;line-height:1">${p.icone}</span><div><b>${p.nome}</b>${p.preco} · ${p.curto}<br><small>🛒 ${n} ${n === 1 ? 'pedido' : 'pedidos'} · 🔥 ${k} ${k === 1 ? 'interessada' : 'interessadas'}</small></div>`;
      }
      return estado.cartao || null;
    },
  },

  roteiros: [
    {
      titulo: 'Vestido floral',
      falas: [
        { quem: 'bia', texto: 'Boa noite, meninas! Primeira peça: o Vestido Floral Midi, tecido leve e forrado, perfeito pra primavera 🌸', depois: 1200 },
        { quem: 'ana', texto: 'que lindoooo 😍😍', depois: 1800, esperado: { intencao: 'elogio' } },
        { quem: 'carol', texto: 'tem no 46? uso GG', depois: 1800, esperado: { intencao: 'duvida_tamanho', produto: 'vestido_floral' } },
        { quem: 'promo', texto: 'Ganhe R$ 500 por dia no celular 👉 bit.ly/ganhe-ja', depois: 1800, esperado: { intencao: 'spam', produto: 'nenhum' } },
        { quem: 'jessica', texto: 'quanto tá? dá pra parcelar?', depois: 1800, esperado: { intencao: 'duvida_preco', produto: 'vestido_floral' } },
        { quem: 'marcia', texto: 'EU QUERO! separa um M pra mim', depois: 1800, esperado: { intencao: 'quer_comprar', produto: 'vestido_floral' } },
      ],
    },
    {
      titulo: 'Troca de peça',
      falas: [
        { quem: 'bia', texto: 'Saiu o vestido, agora a Bolsa de Palha Média 👜 cabe celular, carteira e garrafinha!', depois: 1200 },
        { quem: 'leticia', texto: 'a bolsa é linda, mas eu quero o vestido de antes, ainda tem?', depois: 1800, esperado: { intencao: 'quer_comprar', produto: 'vestido_floral' } },
        { quem: 'carol', texto: 'qual o tamanho da bolsa? cabe notebook?', depois: 1800, esperado: { intencao: 'duvida_tamanho', produto: 'bolsa_palha' } },
        { quem: 'jessica', texto: 'manda o link da bolsa!!', depois: 1800, esperado: { intencao: 'quer_comprar', produto: 'bolsa_palha' } },
        { quem: 'marcia', texto: 'Bia, você tá maravilhosa hoje 💖', depois: 1800, esperado: { intencao: 'elogio', produto: 'nenhum' } },
        { quem: 'ana', texto: 'aceita pix? tem desconto?', depois: 1800, esperado: { intencao: 'duvida_preco' } },
      ],
    },
    {
      titulo: 'Chat lotado',
      falas: [
        { quem: 'bia', texto: 'Última peça da noite: Calça Pantalona Preta, do 36 ao 46! Quem levar a calça ganha frete grátis 🖤', depois: 1200 },
        { quem: 'ana', texto: 'qro 2 no 40', depois: 1800, esperado: { intencao: 'quer_comprar', produto: 'calca_pantalona' } },
        { quem: 'promo', texto: 'Sigam @promo.da.vez pra concorrer a um celular novo 🎁', depois: 1800, esperado: { intencao: 'spam', produto: 'nenhum' } },
        { quem: 'carol', texto: 'uso 38 na calça jeans, levo 38 ou 40 nessa?', depois: 1800, esperado: { intencao: 'duvida_tamanho', produto: 'calca_pantalona' } },
        { quem: 'jessica', texto: 'a sandália caramelo ainda tem no 37?', depois: 1800, esperado: { intencao: 'duvida_tamanho', produto: 'sandalia_tiras' } },
        { quem: 'leticia', texto: 'boa noite gente, cheguei agora 👋', depois: 1800, esperado: { intencao: 'outro', produto: 'nenhum' } },
      ],
    },
  ],
};

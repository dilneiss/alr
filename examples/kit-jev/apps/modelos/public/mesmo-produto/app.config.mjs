// Mesmo Produto? — antes de comparar preço com o concorrente, o Jev confere se os dois anúncios vendem o MESMO produto, na mesma variação.
// Para adaptar: coloque os seus anúncios (lado 'a') e os do concorrente (lado 'b'), e os pares candidatos que o seu código acha por semelhança de nome.
export default {
  id: 'mesmo-produto',
  titulo: 'Mesmo Produto?',
  emoji: '⚖️',
  categoria: 'vendas',
  ordem: 29,
  resumo: 'Confere se o anúncio do concorrente é o mesmo produto antes de comparar preço: pega 110 V × 220 V, 128 × 256 GB, cor e kit.',
  descricao: 'Comparar preço de produtos diferentes leva a baixar preço à toa. Para cada par candidato, o Jev decide se é o mesmo produto, na mesma variação, e qual é a diferença. Só os pares acima de 70% de certeza entram na comparação de preço (linha verde); se falta um dado, como a voltagem, a certeza cai e o par fica de fora.',
  marcas: ['volume', 'limiar', 'lista fechada'],
  motor: 'pares',
  tema: { acento: '#7c3aed', acento2: '#22d3ee' },

  contexto: {
    tarefa: 'monitorar o preço do concorrente: só comparar o preço quando os dois anúncios vendem o mesmo produto, na mesma variação',
    lojas: 'A = nossa loja (Casa Maré); B = concorrente (MegaShop)',
  },

  decisoes: [
    {
      id: 'mesmo', tipo: 'noul', titulo: 'Mesmo produto', limiar: 0.7,
      pergunta: 'Os anúncios A e B vendem EXATAMENTE o mesmo produto, na mesma variação (mesmo modelo, cor, voltagem, capacidade e quantidade)? Diferença só de escrita, ordem das palavras ou abreviação não conta. Se muda a cor, a voltagem (110 V × 220 V), a capacidade (128 GB × 256 GB), o modelo (ex.: "Pro"), kit × peça avulsa, ou se um deles é acessório do outro, responda não.',
    },
    {
      id: 'diferenca', tipo: 'choice', titulo: 'Diferença principal',
      pergunta: 'Qual é a principal diferença entre o produto do anúncio A e o do anúncio B? Regras: 110 V × 220 V ou bivolt → voltagem; GB, litros ou ml diferentes → capacidade; cor diferente → cor; versão ou modelo diferente ("Pro", "Max", outra geração) → modelo; kit ou jogo × peça avulsa → kit × unidade; um é acessório do outro, ou função diferente → outro produto; só muda a escrita → nenhuma.',
      opcoes: [
        { id: 'voltagem', rotulo: 'voltagem', icone: '⚡', tom: 'ruim', desc: 'voltagem diferente: 110 V × 220 V, ou bivolt × uma voltagem só' },
        { id: 'capacidade', rotulo: 'capacidade', icone: '💾', tom: 'ruim', desc: 'capacidade diferente: 128 GB × 256 GB, 3 L × 2 L' },
        { id: 'cor', rotulo: 'cor', icone: '🎨', tom: 'ruim', desc: 'mesmo modelo em outra cor: branco × preto' },
        { id: 'modelo', rotulo: 'modelo', icone: '🔖', tom: 'ruim', desc: 'outro modelo ou versão: Pro, Max, Lite, outra geração' },
        { id: 'kit_vs_unidade', rotulo: 'kit × unidade', icone: '📦', tom: 'ruim', desc: 'um é kit ou jogo com várias peças e o outro é uma peça avulsa' },
        { id: 'outro_produto', rotulo: 'outro produto', icone: '🔀', tom: 'ruim', desc: 'um é acessório do outro (capa, estojo, peça de reposição) ou têm função diferente' },
        { id: 'nenhuma', rotulo: 'nenhuma diferença', icone: '✅', tom: 'bom', desc: 'mesmo produto e mesma variação: só muda a escrita, a ordem das palavras ou a abreviação' },
      ],
    },
  ],

  pares: {
    decisao: 'mesmo',
    limiar: 0.7,
    lote: 1,
    ritmo: 1900,
    rotuloA: 'Anúncio A (nossa loja)',
    rotuloB: 'Anúncio B (concorrente)',
    rotuloSim: 'mesmo produto',
    rotuloNao: 'produtos diferentes',
    rotuloSimCurto: 'comparar preço',
    rotuloNaoCurto: 'não comparar',
    tituloPlacar: 'Pares conferidos',
    tituloLista: 'Pares avaliados (comparar preço só acima de 70%)',
    cartao: { titulo: 'anuncio', subtitulo: 'preco', texto: 'ficha' },
  },
  textoItem: (p) => `${p.anuncio} — ${p.ficha}`,

  dados: [
    { id: 'a1', lado: 'a', anuncio: 'Liquidificador Vortex Turbo Power 900 W, 3 L, Preto', ficha: 'Voltagem: 110 V · jarra de acrílico · 12 velocidades', preco: 'R$ 189,90' },
    { id: 'a2', lado: 'a', anuncio: 'Smartphone Nebula X5 128 GB, 6 GB de RAM, Azul', ficha: 'Tela de 6,5" · câmera de 50 MP · dois chips', preco: 'R$ 1.499,00' },
    { id: 'a3', lado: 'a', anuncio: 'Air Fryer Fritamax Digital 4,2 L', ficha: 'Voltagem: 220 V · cesto antiaderente · timer de 60 min', preco: 'R$ 399,90' },
    { id: 'a4', lado: 'a', anuncio: 'Fone Bluetooth Sonora Buds 2, Branco', ficha: 'Bateria de 30 h · estojo carregador · Bluetooth 5.3', preco: 'R$ 249,90' },
    { id: 'a5', lado: 'a', anuncio: 'Kit 3 Panelas Antiaderentes Culinária Leve 20, 24 e 28 cm', ficha: '3 panelas com tampa de vidro · servem em fogão de indução', preco: 'R$ 279,90' },
    { id: 'a6', lado: 'a', anuncio: 'Cafeteira Elétrica Aroma Plus 30 Xícaras, Inox', ficha: 'Voltagem: 110 V · jarra de vidro · corta-pingos', preco: 'R$ 159,90' },
    { id: 'b1', lado: 'b', anuncio: 'Liquidificador Vortex Turbo Power 900W 3 Litros Preto', ficha: 'Voltagem: 220 V · 12 velocidades', preco: 'R$ 174,90' },
    { id: 'b2', lado: 'b', anuncio: 'liquidif. vortex turbopower 900w 3lts preto', ficha: '110v · jarra acrilico · 12 vel.', preco: 'R$ 182,00' },
    { id: 'b3', lado: 'b', anuncio: 'Celular Nebula X5 6GB RAM 256GB Azul', ficha: 'Tela 6,5" · dual chip · câmera 50MP', preco: 'R$ 1.699,00' },
    { id: 'b4', lado: 'b', anuncio: 'Smartphone Nebula X5 Pro 128GB Azul', ficha: 'Tela 6,7" · câmera 108MP · dual chip', preco: 'R$ 1.899,00' },
    { id: 'b5', lado: 'b', anuncio: 'Fritadeira Elétrica Sem Óleo Fritamax Digital 4.2L', ficha: '220v · cesto antiaderente · timer', preco: 'R$ 369,90' },
    { id: 'b6', lado: 'b', anuncio: 'Sonora Buds 2 Fone de Ouvido sem Fio — Preto', ficha: 'Bateria 30h · Bluetooth 5.3 · estojo carregador', preco: 'R$ 229,90' },
    { id: 'b7', lado: 'b', anuncio: 'Estojo de Silicone para Sonora Buds 2, Branco', ficha: 'Capa protetora com mosquetão · não acompanha o fone', preco: 'R$ 39,90' },
    { id: 'b8', lado: 'b', anuncio: 'Panela Antiaderente Culinária Leve 24 cm com Tampa', ficha: '1 peça · tampa de vidro · indução', preco: 'R$ 109,90' },
    { id: 'b9', lado: 'b', anuncio: 'Jogo de Panelas Culinária Leve Antiaderente 3 Peças (20/24/28 cm)', ficha: 'Tampas de vidro · indução', preco: 'R$ 264,90' },
    { id: 'b10', lado: 'b', anuncio: 'Cafeteira Aroma Plus Inox 30 Cafés', ficha: 'jarra de vidro · corta pingo', preco: 'R$ 149,90' },
  ],

  // pares candidatos (o seu código acha por nome parecido); o 3º elemento é o esperado, usado no teste
  paresDemo: [
    ['a1', 'b1', { mesmo: false, diferenca: 'voltagem' }],
    ['a1', 'b2', { mesmo: true, diferenca: 'nenhuma' }],
    ['a2', 'b3', { mesmo: false, diferenca: 'capacidade' }],
    ['a3', 'b5', { mesmo: true, diferenca: 'nenhuma' }],
    ['a2', 'b4', { mesmo: false, diferenca: 'modelo' }],
    ['a4', 'b6', { mesmo: false, diferenca: 'cor' }],
    ['a4', 'b7', { mesmo: false, diferenca: 'outro_produto' }],
    ['a5', 'b9', { mesmo: true, diferenca: 'nenhuma' }],
    ['a5', 'b8', { mesmo: false, diferenca: 'kit_vs_unidade' }],
    ['a6', 'b10', { diferenca: ['nenhuma', 'voltagem'] }],   // B não informa a voltagem: na dúvida, não compara
  ],
};

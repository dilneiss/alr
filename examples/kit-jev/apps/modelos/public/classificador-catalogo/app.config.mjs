// Classificador de Catálogo — cada título bagunçado de produto vai para a categoria certa da loja, com o público e o aviso de título ruim.
// Para adaptar: troque as opções de "categoria" pelas categorias da sua loja (até 7), as regras na pergunta e cole os títulos do seu fornecedor em "dados".
const CATEGORIAS = [
  { id: 'casa_cozinha', rotulo: 'Casa e cozinha', icone: '🍳', cor: '#f59e0b', desc: 'panelas, utensílios, cama, mesa e banho, organização, decoração' },
  { id: 'eletronicos', rotulo: 'Eletrônicos', icone: '🎧', cor: '#60a5fa', desc: 'fones, carregadores, cabos, caixas de som, smartwatch, acessórios de celular e computador' },
  { id: 'moda', rotulo: 'Moda', icone: '👗', cor: '#f472b6', desc: 'roupas, calçados, bolsas e acessórios de vestir, inclusive esportivos, infantis e de bebê' },
  { id: 'beleza', rotulo: 'Beleza', icone: '💄', cor: '#e879f9', desc: 'maquiagem, skincare, perfume, cabelo, barbear e aparelhos de cuidado pessoal (secador, chapinha)' },
  { id: 'esporte', rotulo: 'Esporte e lazer', icone: '🏋️', cor: '#34d399', desc: 'equipamento de academia, ioga, ciclismo, trilha e camping (sem roupas e calçados)' },
  { id: 'pet', rotulo: 'Pet', icone: '🐾', cor: '#fb923c', desc: 'tudo para cães, gatos e outros animais: ração, coleira, cama, arranhador, brinquedo de pet' },
  { id: 'outro', rotulo: 'Outro', icone: '❓', cor: '#94a3b8', desc: 'produto de outro tipo (ferramenta, papelaria, material escolar, automotivo) ou título sem nenhuma pista do que é (ex.: "item novo lote 45")' },
];
const LIMIAR_REVISAO = 0.7;

export default {
  id: 'classificador-catalogo',
  titulo: 'Classificador de Catálogo',
  emoji: '🏷️',
  categoria: 'vendas',
  ordem: 28,
  resumo: 'A planilha do fornecedor chega bagunçada e cada produto cai na categoria certa, com público e aviso de título ruim.',
  descricao: 'O Jev lê cada título de produto, do jeito que veio do fornecedor, e decide a categoria da loja, o público e se o título precisa ser reescrito antes de ir para o marketplace. Milhares de itens por minuto, sempre numa categoria que existe; o que fica em dúvida vai para revisão em vez de cair na categoria errada.',
  marcas: ['volume', 'lista fechada', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#65a30d', acento2: '#2dd4bf' },

  contexto: {
    loja: 'Bazar Estrela — loja de variedades que vende no próprio site e em marketplaces',
    tarefa: 'cadastrar a planilha nova do fornecedor: cada produto precisa de categoria, público e um título limpo',
  },

  decisoes: [
    {
      id: 'categoria', tipo: 'choice', titulo: 'Categoria',
      pergunta: 'Em qual categoria da loja este produto deve ser cadastrado? Regras: roupa e calçado, mesmo esportivo ou infantil → moda; aparelho eletrônico, mesmo de esporte (smartwatch, fone) → eletrônicos; aparelho de cuidado pessoal (secador, barbeador, chapinha) → beleza; equipamento de exercício, trilha ou camping → esporte e lazer; tudo para animais → pet; ferramenta, papelaria, material escolar, automotivo ou título sem nenhuma pista do produto → outro. Título bagunçado (caixa alta, abreviação) não muda a categoria.',
      opcoes: CATEGORIAS,
    },
    {
      id: 'publico', tipo: 'choice', titulo: 'Público',
      pergunta: 'Para quem é este produto? Regras: o título diz o gênero ("feminino", "fem", "masculino", "masc", "Dia dos Pais") → esse público; criança ou bebê → infantil; sem gênero nem idade no título (casa, eletrônicos, pet, equipamento de esporte) → todos.',
      opcoes: [
        { id: 'todos', rotulo: 'todos', icone: '🧑‍🤝‍🧑', tom: 'info', desc: 'sem gênero nem idade definidos: qualquer pessoa ou a casa toda' },
        { id: 'feminino', rotulo: 'feminino', icone: '👩', tom: 'acento', desc: 'produto para mulheres' },
        { id: 'masculino', rotulo: 'masculino', icone: '👨', tom: 'acento', desc: 'produto para homens' },
        { id: 'infantil', rotulo: 'infantil', icone: '🧒', tom: 'acento', desc: 'produto para crianças ou bebês' },
      ],
    },
    {
      id: 'titulo_ruim', tipo: 'noul', titulo: 'Título ruim', rotulo: 'reescrever título', icone: '✏️', tom: 'ruim', alerta: true,
      pergunta: 'Este título precisa ser reescrito antes de ir para o marketplace? Sim se: está todo em CAIXA ALTA ou todo em minúsculas; tem "promoção", "barato", "envio imediato", "original" ou "!!!"; usa abreviações como "c/", "p/", "pç", "fem", "masc"; ou não diz claramente o que é o produto.',
    },
  ],

  fluxo: {
    colunas: 'categoria',
    rotuloItem: 'Título do produto',
    lote: 4,
    ritmo: 3600,
    humano: { limiar: LIMIAR_REVISAO, rotulo: 'Revisar categoria', icone: '🙋' },
    cartao: { titulo: 'titulo', subtitulo: 'fornecedor', meta: 'sku', valor: 'preco' },
    avatar: '📦',
    entrada: { placeholder: 'Cole o título de um produto, do jeito que veio do fornecedor…', botao: 'Classificar' },
    rotuloFeitos: 'produtos',
    rotuloFila: 'Planilha do fornecedor',
  },
  textoItem: (p) => p.titulo,

  aoDecidir(item, resp, extra) {
    extra.ruins = (extra.ruins || 0) + (resp.titulo_ruim && resp.titulo_ruim.noul >= 0.5 ? 1 : 0);
    extra.total = (extra.total || 0) + 1;
    const c = resp.categoria;
    if (c && (c.probabilities[c.choice] || 0) < LIMIAR_REVISAO) extra.revisar = (extra.revisar || 0) + 1;
  },
  resumoExtra(extra) {
    if (!extra.total) return [];
    return [
      { rotulo: 'títulos para reescrever', valor: `${extra.ruins || 0} de ${extra.total}` },
      { rotulo: 'categorias para revisar', valor: String(extra.revisar || 0) },
    ];
  },

  dados: [
    { id: 'p1', titulo: 'KIT 3 PANELAS ANTIADERENTE INDUÇÃO C/ TAMPA VIDRO 20/24/28CM PROMOÇÃO!!!', fornecedor: 'Distribuidora Norte Sul', sku: 'NS-4410', preco: 189.9, esperado: { categoria: 'casa_cozinha', publico: 'todos', titulo_ruim: true } },
    { id: 'p2', titulo: 'Fone de Ouvido Bluetooth sem Fio com Estojo Carregador, Bateria de 30 h, Preto', fornecedor: 'Imporlar Eletrônicos', sku: 'IM-0921', preco: 89.9, esperado: { categoria: 'eletronicos', publico: 'todos', titulo_ruim: false } },
    { id: 'p3', titulo: 'tenis masc corrida amortecedor ar n 39 ao 44 envio imediato', fornecedor: 'Calçados Passo Firme', sku: 'PF-3302', preco: 159.9, esperado: { categoria: 'moda', publico: 'masculino', titulo_ruim: true } },
    { id: 'p4', titulo: 'Camiseta Infantil de Algodão Estampa Dinossauro, 4 a 10 Anos', fornecedor: 'Malharia Arco-Íris', sku: 'MA-1187', preco: 39.9, esperado: { categoria: 'moda', publico: 'infantil', titulo_ruim: false } },
    { id: 'p5', titulo: 'Coleira Peitoral Ajustável para Cães de Pequeno Porte, Azul', fornecedor: 'PetMundo Atacado', sku: 'PM-0045', preco: 34.9, esperado: { categoria: 'pet', publico: 'todos', titulo_ruim: false } },
    { id: 'p6', titulo: 'Sérum Facial Vitamina C 30 ml para Pele Oleosa e Mista', fornecedor: 'Cosméticos Lumi', sku: 'CL-7720', preco: 64.9, esperado: { categoria: 'beleza', publico: ['todos', 'feminino'], titulo_ruim: false } },
    { id: 'p7', titulo: 'Smartwatch Fitness com Monitor Cardíaco, à Prova d’Água, Android e iOS', fornecedor: 'Imporlar Eletrônicos', sku: 'IM-1350', preco: 219.0, esperado: { categoria: 'eletronicos', publico: 'todos', titulo_ruim: false } },
    { id: 'p8', titulo: 'HALTER EMBORRACHADO 5KG PAR ACADEMIA EM CASA SUPER BARATO', fornecedor: 'Fit Atacado', sku: 'FA-0508', preco: 119.9, esperado: { categoria: 'esporte', publico: 'todos', titulo_ruim: true } },
    { id: 'p9', titulo: 'Vestido Midi Feminino Floral com Manga Bufante, Tamanhos P ao GG', fornecedor: 'Ateliê Flor de Lis', sku: 'FL-2231', preco: 129.9, esperado: { categoria: 'moda', publico: 'feminino', titulo_ruim: false } },
    { id: 'p10', titulo: 'Kit Barbear com Navalha, Pincel e Espuma — Presente Dia dos Pais', fornecedor: 'Cosméticos Lumi', sku: 'CL-8104', preco: 79.9, esperado: { categoria: 'beleza', publico: 'masculino', titulo_ruim: false } },
    { id: 'p11', titulo: 'Arranhador p/ Gato c/ Toca e Bolinha 3 andares', fornecedor: 'PetMundo Atacado', sku: 'PM-0312', preco: 149.9, esperado: { categoria: 'pet', publico: 'todos', titulo_ruim: true } },
    { id: 'p12', titulo: 'jogo de cama casal 4 pç 180 fios microfibra cinza', fornecedor: 'Têxtil Bom Sono', sku: 'BS-0670', preco: 99.9, esperado: { categoria: 'casa_cozinha', publico: 'todos', titulo_ruim: true } },
    { id: 'p13', titulo: 'Mochila Escolar Infantil Unicórnio com Rodinhas', fornecedor: 'Papelaria Central', sku: 'PC-5501', preco: 169.9, esperado: { categoria: ['moda', 'outro'], publico: 'infantil', titulo_ruim: false } },
    { id: 'p14', titulo: 'Carregador Turbo USB-C 20 W, Compatível com Android e iOS', fornecedor: 'Imporlar Eletrônicos', sku: 'IM-0230', preco: 59.9, esperado: { categoria: 'eletronicos', publico: 'todos', titulo_ruim: false } },
    { id: 'p15', titulo: 'Tapete de Ioga e Pilates 6 mm Antiderrapante com Alça', fornecedor: 'Fit Atacado', sku: 'FA-1120', preco: 74.9, esperado: { categoria: 'esporte', publico: 'todos', titulo_ruim: false } },
    { id: 'p16', titulo: 'Furadeira de Impacto 650 W 220 V com Maleta e 13 Brocas', fornecedor: 'Ferragens Aliança', sku: 'FE-0098', preco: 249.9, esperado: { categoria: 'outro', publico: 'todos', titulo_ruim: false } },
    { id: 'p17', titulo: 'BOLSA FEM COURO LEGITIMO TRANSVERSAL PEQ ORIGINAL BARATISSIMA', fornecedor: 'Ateliê Flor de Lis', sku: 'FL-0919', preco: 139.9, esperado: { categoria: 'moda', publico: 'feminino', titulo_ruim: true } },
    { id: 'p18', titulo: 'Garrafa Térmica Inox 1 Litro para Academia e Trilha', fornecedor: 'Fit Atacado', sku: 'FA-0777', preco: 69.9, esperado: { categoria: ['esporte', 'casa_cozinha'], publico: 'todos', titulo_ruim: false } },
    { id: 'p19', titulo: 'Ração Premium para Gatos Adultos Castrados, Sabor Frango, 3 kg', fornecedor: 'PetMundo Atacado', sku: 'PM-1001', preco: 84.9, esperado: { categoria: 'pet', publico: 'todos', titulo_ruim: false } },
    { id: 'p20', titulo: 'xxx ITEM NOVO LOTE 45 VER FOTO', fornecedor: 'Distribuidora Norte Sul', sku: 'NS-9999', preco: 25.0, esperado: { categoria: 'outro', titulo_ruim: true } },
    { id: 'p21', titulo: 'Secador de Cabelo 2000 W com Íons, Bivolt, Rosa', fornecedor: 'Imporlar Eletrônicos', sku: 'IM-2002', preco: 179.9, esperado: { categoria: 'beleza', publico: ['feminino', 'todos'], titulo_ruim: false } },
    { id: 'p22', titulo: 'Body Bebê Manga Longa, Kit com 5 Peças de Algodão, RN a 9 Meses', fornecedor: 'Malharia Arco-Íris', sku: 'MA-0503', preco: 89.9, esperado: { categoria: 'moda', publico: 'infantil', titulo_ruim: false } },
  ],
};

// Moderação de Anúncios de Marketplace — todo anúncio novo vai para a raia certa: aprovado, proibido, falsificação, preço isca ou categoria errada.
// Para adaptar: troque a lista de proibidos e de categorias (contexto) e calcule a média de mercado com os SEUS dados antes de perguntar.
const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// conta feita pelo código: quanto o preço do anúncio está abaixo ou acima da média de mercado
function mercado(preco, media) {
  if (!media) return 'sem preço de referência no mercado';
  const dif = Math.round(((preco - media) / media) * 100);
  return `preço médio de mercado: ${brl(media)} · este anúncio está ${Math.abs(dif)}% ${dif < 0 ? 'abaixo' : 'acima'} da média (calculado pelo código)`;
}
const LIMIAR = 0.8;

const ANUNCIOS = [
  { id: 'm1', avatar: '🚲', titulo: 'Bicicleta aro 29 Trilha, 21 marchas, usada 1 ano', categoria: 'Esportes > Bicicletas', preco: 1150, media: 1300, descricao: 'Revisada no mês passado, pneus novos. Retirada em Campinas ou envio pela plataforma.', esperado: { veredito: 'aprovado', fora_da_plataforma: false } },
  { id: 'm2', avatar: '📱', titulo: 'Smartphone Nexo X12 128 GB lacrado', categoria: 'Celulares e smartphones', preco: 499, media: 3200, descricao: 'Últimas unidades! Pagamento só no Pix, chama no WhatsApp que eu passo a chave.', esperado: { veredito: 'preco_isca', fora_da_plataforma: true } },
  { id: 'm3', avatar: '👟', titulo: 'Tênis Áuron Skyline réplica AAA primeira linha', categoria: 'Calçados', preco: 189, media: 899, descricao: 'Igual ao original, com etiqueta e caixa. Pronta entrega.', esperado: { veredito: 'falsificacao', fora_da_plataforma: false } },
  { id: 'm4', avatar: '📺', titulo: 'Lista IPTV 20 mil canais + filmes, ativação na hora', categoria: 'Eletrônicos > TV e vídeo', preco: 35, media: null, descricao: 'Todos os canais fechados e de futebol liberados. Mensalidade de R$ 35.', esperado: { veredito: 'proibido' } },
  { id: 'm5', avatar: '📱', titulo: 'Capinha de silicone para Nexo X12', categoria: 'Celulares e smartphones', preco: 29.9, media: 32, descricao: 'Várias cores, envio em 24 h pela plataforma.', esperado: { veredito: 'categoria_errada', fora_da_plataforma: false } },
  { id: 'm6', avatar: '💨', titulo: 'Cigarro eletrônico descartável 8000 puffs, sabor menta', categoria: 'Saúde e beleza', preco: 89, media: null, descricao: 'Original, lacrado, entrega rápida.', esperado: { veredito: 'proibido', fora_da_plataforma: false } },
  { id: 'm7', avatar: '🛋️', titulo: 'Sofá retrátil 3 lugares, cinza, 2 anos de uso', categoria: 'Casa > Sofás', preco: 1400, media: 1600, descricao: 'Sem rasgos, de casa sem animais. Retirada no local.', esperado: { veredito: 'aprovado' } },
  { id: 'm8', avatar: '⌚', titulo: 'Relógio Kronberg Marinho, igual ao original, com caixa e certificado', categoria: 'Relógios', preco: 450, media: 48000, descricao: 'Primeira linha, ninguém percebe a diferença.', esperado: { veredito: 'falsificacao', fora_da_plataforma: false } },
  { id: 'm9', avatar: '💻', titulo: 'Notebook Lumina 15" i7 16 GB, novo na caixa', categoria: 'Informática > Notebooks', preco: 1299, media: 5900, descricao: 'Envio só depois do depósito antecipado na minha conta.', esperado: { veredito: 'preco_isca', fora_da_plataforma: true } },
  { id: 'm10', avatar: '🎸', titulo: 'Aula particular de violão em domicílio', categoria: 'Imóveis > Aluguel', preco: 80, media: 90, descricao: 'Professor com 10 anos de experiência, zona sul de São Paulo.', esperado: { veredito: 'categoria_errada', fora_da_plataforma: false } },
  { id: 'm11', avatar: '🦜', titulo: 'Filhote de papagaio-verdadeiro com gaiola', categoria: 'Animais', preco: 1200, media: null, descricao: 'Já fala algumas palavras. Sem documentação do Ibama.', esperado: { veredito: 'proibido' } },
  { id: 'm12', avatar: '🪑', titulo: 'Cadeira gamer reclinável, preta e vermelha', categoria: 'Móveis > Escritório', preco: 650, media: 790, descricao: 'Pouco uso, braços ajustáveis, pistão classe 4.', esperado: { veredito: 'aprovado', fora_da_plataforma: false } },
  { id: 'm13', avatar: '🧴', titulo: 'Perfume contratipo inspirado no Noite de Seda, 100 ml, frasco próprio', categoria: 'Perfumaria', preco: 79, media: 690, descricao: 'Fragrância inspirada, não é o original. Marca própria Essenza, com nota fiscal.', esperado: { fora_da_plataforma: false } },
  { id: 'm14', avatar: '💊', titulo: 'Remédio para emagrecer tarja preta, 30 cápsulas, sem receita', categoria: 'Saúde e beleza', preco: 120, media: null, descricao: 'Resultado em 2 semanas, envio discreto.', esperado: { veredito: 'proibido' } },
  { id: 'm15', avatar: '🚪', titulo: 'Guarda-roupa casal 6 portas, desmontado', categoria: 'Casa > Quarto', preco: 900, media: 1100, descricao: 'MDF, completo com parafusos e manual.', esperado: { veredito: 'aprovado', fora_da_plataforma: false } },
  { id: 'm16', avatar: '🎮', titulo: 'Console NovaBox 5 Slim 1 TB, novinho', categoria: 'Games > Consoles', preco: 750, media: 3800, descricao: 'Pix com 10% de desconto, chama no zap 11 98888-0000.', esperado: { veredito: 'preco_isca', fora_da_plataforma: true } },
  { id: 'm17', avatar: '🎧', titulo: 'Fone AirSom Pro 2ª geração, lacrado, com nota fiscal', categoria: 'Áudio > Fones', preco: 1390, media: 1450, descricao: 'Comprado na loja oficial, garantia de 1 ano. Envio pela plataforma.', esperado: { veredito: 'aprovado', fora_da_plataforma: false } },
  { id: 'm18', avatar: '👜', titulo: 'Bolsa Maison Lereau de couro, linha premium (cópia fiel)', categoria: 'Bolsas e acessórios', preco: 260, media: 14000, descricao: 'Acabamento perfeito, com logo e dust bag.', esperado: { veredito: 'falsificacao' } },
  { id: 'm19', avatar: '🧰', titulo: 'Kit chaves de fenda 110 peças com maleta', categoria: 'Bebês > Brinquedos', preco: 79.9, media: 85, descricao: 'Aço cromo-vanádio, maleta completa.', esperado: { veredito: 'categoria_errada', fora_da_plataforma: false } },
  { id: 'm20', avatar: '🧊', titulo: 'Geladeira Polar Frost 400 L, funcionando, 6 anos de uso', categoria: 'Eletrodomésticos > Geladeiras', preco: 300, media: 1900, descricao: 'Mudança, preciso vender hoje. Retirar no local e pagar na retirada.' },
];

export default {
  id: 'moderacao-marketplace',
  titulo: 'Moderação de Anúncios de Marketplace',
  emoji: '🛒',
  categoria: 'confianca',
  ordem: 25,
  resumo: 'Todo anúncio novo passa pelo Jev antes de ir ao ar: aprovado, proibido, falsificação, preço isca ou categoria errada.',
  descricao: 'O código calcula quanto o preço está abaixo da média de mercado; o Jev lê o anúncio inteiro e aplica as regras da plataforma, na ordem. Com milhares de anúncios por dia, só o que vem com pouca confiança chega a um moderador humano.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#8b5cf6', acento2: '#22d3ee' },
  origem: 'caso de uso listado pela TypeSafe',

  contexto: {
    plataforma: 'Feira Já: marketplace de produtos novos e usados',
    proibidos: 'remédio que exige receita, cigarro eletrônico, animal silvestre, lista de IPTV ou conteúdo pirata, arma ou munição, documentos',
    categorias: ['Celulares e smartphones (só aparelhos)', 'Acessórios para celular (capas, películas, carregadores)', 'Informática > Notebooks', 'Games > Consoles', 'Áudio > Fones', 'Eletrônicos > TV e vídeo', 'Eletrodomésticos > Geladeiras', 'Casa > Sofás', 'Casa > Quarto', 'Móveis > Escritório', 'Esportes > Bicicletas', 'Calçados', 'Relógios', 'Bolsas e acessórios', 'Perfumaria', 'Saúde e beleza', 'Animais (ração e acessórios)', 'Bebês > Brinquedos', 'Ferramentas', 'Serviços > Aulas', 'Imóveis > Aluguel'],
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', titulo: 'Moderação',
      pergunta: 'Como moderar este anúncio novo? Siga esta ordem: (1) item da lista de proibidos → proibido; (2) réplica ou cópia de marca → falsificação; (3) produto comum muito abaixo da média de mercado, sem motivo, com pagamento antecipado ou contato fora da plataforma → preço isca; (4) produto permitido na categoria errada da lista → categoria errada; (5) senão → aprovado.',
      opcoes: [
        { id: 'aprovado', rotulo: 'Aprovado', icone: '✅', cor: '#34d399', desc: 'produto permitido, na categoria certa, com preço compatível com o mercado ou com motivo claro para ser barato' },
        { id: 'proibido', rotulo: 'Proibido', icone: '🚫', cor: '#f87171', desc: 'item da lista de proibidos: remédio que exige receita, cigarro eletrônico, animal silvestre, IPTV ou conteúdo pirata, arma, documento' },
        { id: 'falsificacao', rotulo: 'Falsificação', icone: '🎭', cor: '#e879f9', desc: 'réplica ou cópia de marca: "réplica", "AAA", "primeira linha", "igual ao original", "cópia fiel", logo de marca famosa por uma fração do preço' },
        { id: 'preco_isca', rotulo: 'Preço isca', icone: '🎣', cor: '#fb923c', desc: 'produto comum muito abaixo do preço de mercado, sem motivo, com pagamento antecipado, Pix direto ou contato fora da plataforma' },
        { id: 'categoria_errada', rotulo: 'Categoria errada', icone: '🗂️', cor: '#60a5fa', desc: 'produto permitido e honesto, mas na categoria errada da lista (ex.: capinha em "Celulares e smartphones")' },
      ],
    },
    {
      id: 'fora_da_plataforma', tipo: 'noul', titulo: 'Negócio por fora', rotulo: 'pede negócio por fora', icone: '📵', tom: 'ruim', limiar: 0.5, alerta: true,
      pergunta: 'O anúncio pede para negociar ou pagar fora da plataforma (WhatsApp, Pix direto, depósito antecipado)?',
    },
  ],

  textoItem: (a) => `${a.titulo} | categoria escolhida pelo vendedor: ${a.categoria} | preço: ${brl(a.preco)} | ${mercado(a.preco, a.media)} | descrição: ${a.descricao}`,

  fluxo: {
    colunas: 'veredito',
    rotuloItem: 'Anúncio',
    lote: 4,
    ritmo: 5000,
    humano: { limiar: LIMIAR, rotulo: 'Moderador humano', icone: '🙋' },
    cartao: { titulo: 'titulo', subtitulo: 'categoria', texto: 'descricao', meta: 'mercadoCurto', valor: 'preco', avatar: 'avatar' },
    entrada: { placeholder: 'Cole um anúncio (título, categoria, preço e descrição) e veja a moderação…', botao: 'Moderar' },
    rotuloFeitos: 'anúncios',
  },

  // quanto dinheiro deixaria de ir para golpe: soma dos preços isca barrados com confiança alta (conta do código)
  aoDecidir(item, resp, extra) {
    const a = resp.veredito; if (!a) return;
    const conf = a.probabilities?.[a.choice] ?? 0;
    if (a.choice !== 'aprovado' && conf >= LIMIAR) extra.barrados = (extra.barrados || 0) + 1;
    if (a.choice === 'preco_isca' && conf >= LIMIAR && typeof item.preco === 'number') extra.isca = (extra.isca || 0) + item.preco;
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'barrados sem moderador', valor: String(extra.barrados || 0) },
      { rotulo: 'em preço isca barrado', valor: brl(extra.isca || 0) },
    ];
  },

  dados: ANUNCIOS.map((a) => ({ ...a, mercadoCurto: a.media ? mercado(a.preco, a.media).replace('preço médio de mercado: ', 'média ').replace(' (calculado pelo código)', '').replace('este anúncio está ', '') : 'sem referência de preço' })),
};

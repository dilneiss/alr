// Pesquisa Aberta → Temas — cada resposta aberta do NPS cai num tema fixo, com o sentimento e o alerta de quem ameaça sair.
// Para adaptar: troque as opções de "tema" pelos temas da sua pesquisa (defina uma vez, a partir de uma amostra) e as respostas.
const TEMAS = [
  { id: 'entrega_atrasada', rotulo: 'Entrega atrasada', icone: '🕒', cor: '#f97316', desc: 'o pedido demorou, chegou depois do previsto, a previsão mudou várias vezes ou o entregador sumiu' },
  { id: 'preco_taxa', rotulo: 'Preço e taxa', icone: '💸', cor: '#facc15', desc: 'reclama do preço dos pratos, da taxa de entrega, da taxa de serviço, do pedido mínimo ou de cupom' },
  { id: 'atendimento', rotulo: 'Atendimento', icone: '🎧', cor: '#a78bfa', desc: 'reclama do suporte ou do chat de ajuda, de estorno ou reembolso que não sai, ou de atendente ou entregador mal-educado' },
  { id: 'app_bugado', rotulo: 'App com erro', icone: '🐞', cor: '#f43f5e', desc: 'o aplicativo trava, fecha sozinho, não deixa entrar, dá erro no pagamento ou o mapa do rastreio não funciona' },
  { id: 'qualidade_comida', rotulo: 'Comida', icone: '🍔', cor: '#fb7185', desc: 'comida fria, errada, faltando item, vazada, mal embalada ou sem gosto' },
  { id: 'elogio', rotulo: 'Elogio', icone: '💚', cor: '#34d399', desc: 'só elogia (rapidez, comida boa, app fácil, suporte que resolveu) sem reclamar e sem sugerir nada' },
  { id: 'sugestao', rotulo: 'Sugestão ou outro', icone: '💡', cor: '#60a5fa', desc: 'pede um recurso novo (agendar pedido, nova forma de pagamento, filtro) ou fala de assunto fora destes temas' },
];

const RESPOSTAS = [
  { id: 'n1', nome: 'Larissa M.', cidade: 'São Paulo', nota: 2, comentario: 'Pedi às 19h40 e só chegou 21h10. A previsão foi mudando de meia em meia hora e ninguém avisava nada.', esperado: { tema: 'entrega_atrasada', sentimento: [0, 1] } },
  { id: 'n2', nome: 'Thiago R.', cidade: 'Recife', nota: 10, comentario: 'Melhor app de delivery que já usei, chega sempre antes do horário. Salvou meu domingo 😍', esperado: { tema: 'elogio', sentimento: 3, vai_sair: false } },
  { id: 'n3', nome: 'Bruna C.', cidade: 'Curitiba', nota: 4, comentario: 'Taxa de entrega de R$ 12,90 pra 2 km? Fora a taxa de serviço. Sai mais caro que ir buscar.', esperado: { tema: 'preco_taxa' } },
  { id: 'n4', nome: 'Marcos V.', cidade: 'Belo Horizonte', nota: 3, comentario: 'o app fechou sozinho 3x na hora de pagar e ainda cobrou duas vezes no cartão', esperado: { tema: 'app_bugado' } },
  { id: 'n5', nome: 'Patrícia L.', cidade: 'Salvador', nota: 1, comentario: 'Faz 5 dias que pedi o estorno de um pedido cancelado e o chat só me manda mensagem automática. Ninguém resolve.', esperado: { tema: 'atendimento', sentimento: [0, 1], vai_sair: false } },
  { id: 'n6', nome: 'Rafael O.', cidade: 'Goiânia', nota: 0, comentario: 'Entregador ficou 40 min parado na rua de trás, liguei e ele ainda foi grosso comigo. Nunca mais peço.', esperado: { tema: ['entrega_atrasada', 'atendimento'], sentimento: [0, 1], vai_sair: true } },
  { id: 'n7', nome: 'Lucas B.', cidade: 'Brasília', nota: 10, comentario: 'nota 10 pro suporte!! resolveram meu problema em 5 minutos e ainda me deram um cupom', esperado: { tema: 'elogio', sentimento: 3 } },
  { id: 'n8', nome: 'Jorge A.', cidade: 'Manaus', nota: 5, comentario: 'o mapa do rastreio fica travado no mesmo lugar, nunca sei onde tá o motoboy', esperado: { tema: 'app_bugado', vai_sair: false } },
  { id: 'n9', nome: 'Fernanda S.', cidade: 'Rio de Janeiro', nota: 2, comentario: 'Cadê meu lanche??? 1h20 esperando e o app dizendo "saiu para entrega" desde as 20h', esperado: { tema: 'entrega_atrasada' } },
  { id: 'n10', nome: 'Paulo T.', cidade: 'Natal', nota: 7, comentario: 'O preço dos pratos no app é mais caro que no balcão do próprio restaurante. Não faz sentido.', esperado: { tema: 'preco_taxa' } },
  { id: 'n11', nome: 'Juliana K.', cidade: 'Florianópolis', nota: 3, comentario: 'Veio sem o molho, sem talher e o açaí metade derretido 😤', esperado: { tema: 'qualidade_comida' } },
  { id: 'n12', nome: 'Sônia R.', cidade: 'Belém', nota: 4, comentario: 'Comida ótima, mas pagar R$ 9,99 de taxa em todo pedido não dá. Vou voltar a ligar direto pro restaurante.', esperado: { tema: 'preco_taxa', vai_sair: true } },
  { id: 'n13', nome: 'Vítor C.', cidade: 'Aracaju', nota: 6, comentario: 'Uma experiência.', esperado: { vai_sair: false } },
  { id: 'n14', nome: 'Gustavo P.', cidade: 'Vitória', nota: 1, comentario: '"Entrega expressa" de 1h30. Expressa pra quem, né?', esperado: { tema: 'entrega_atrasada' } },
  { id: 'n15', nome: 'Renata D.', cidade: 'Ribeirão Preto', nota: 6, comentario: 'Depois da atualização não consigo mais entrar na conta, fica pedindo um código que nunca chega', esperado: { tema: 'app_bugado' } },
  { id: 'n16', nome: 'Henrique N.', cidade: 'Cuiabá', nota: 9, comentario: 'mt bom, chegou rapidão e quentinho', esperado: { tema: 'elogio', sentimento: 3, vai_sair: false } },
  { id: 'n17', nome: 'Bianca E.', cidade: 'São Luís', nota: 8, comentario: 'Seria ótimo poder pagar com vale-refeição direto no app.', esperado: { tema: 'sugestao' } },
  { id: 'n18', nome: 'Felipe U.', cidade: 'Uberlândia', nota: 2, comentario: 'Reclamei de um pedido errado e o atendente do chat simplesmente encerrou a conversa sem resolver nada.', esperado: { tema: 'atendimento' } },
  { id: 'n19', nome: 'Otávio L.', cidade: 'Londrina', nota: 2, comentario: 'Pedi hambúrguer sem cebola, escrevi na observação, e veio cheio de cebola. Alguém lê a observação?', esperado: { tema: 'qualidade_comida' } },
  { id: 'n20', nome: 'Carla G.', cidade: 'Sorocaba', nota: 3, comentario: 'Toda sexta é a mesma coisa: previsão de 40 min e chega com 1h15. Já desisti de pedir janta pelo app.', esperado: { tema: 'entrega_atrasada', vai_sair: true } },
];

const rosto = (n) => (n >= 9 ? '😍' : n >= 7 ? '🙂' : n >= 4 ? '😕' : '😠');

export default {
  id: 'pesquisa-temas',
  titulo: 'Pesquisa Aberta → Temas',
  emoji: '📊',
  categoria: 'vendas',
  ordem: 33,
  resumo: 'Cada resposta aberta da pesquisa de NPS cai num tema fixo, com o sentimento, e no fim você vê o tema mais citado.',
  descricao: 'Os temas são definidos uma vez; depois o Jev encaixa cada comentário num deles, mede o sentimento e acende o alerta de quem ameaça trocar de app. Custando centavos por mil respostas, dá para ler 100% da pesquisa em vez de uma amostra.',
  marcas: ['volume', 'lista fechada'],
  motor: 'fluxo',
  tema: { acento: '#ff8a3d', acento2: '#fde047' },
  origem: 'comunidade: MotherDuck classificou 100 mil respostas abertas em 40 s',

  contexto: {
    empresa: 'Garfo Voador — app de delivery de comida (fictício) em 40 cidades',
    pesquisa: 'NPS de outubro: "De 0 a 10, quanto você recomendaria o Garfo Voador? Por quê?"',
    temas: 'definidos uma vez pela equipe de produto; cada resposta vai para um deles',
  },

  decisoes: [
    {
      id: 'tema', tipo: 'choice', titulo: 'Tema',
      pergunta: 'Qual é o tema principal desta resposta da pesquisa? Regras: se houver qualquer reclamação, escolha o tema da reclamação principal, mesmo que a pessoa também elogie; "elogio" só quando não há reclamação nem sugestão; "sugestão ou outro" para pedido de recurso novo ou assunto fora destes temas.',
      opcoes: TEMAS,
    },
    {
      id: 'sentimento', tipo: 'score', titulo: 'Sentimento', inverter: true,
      pergunta: 'Qual é o sentimento da pessoa neste comentário?',
      niveis: [
        { rotulo: 'muito negativo', desc: 'raiva, ironia pesada ou ameaça de largar o app' },
        { rotulo: 'negativo', desc: 'reclamação ou decepção' },
        { rotulo: 'misto ou neutro', desc: 'elogia e reclama na mesma medida, ou só sugere algo' },
        { rotulo: 'positivo', desc: 'satisfeita, elogiando' },
      ],
    },
    {
      id: 'vai_sair', tipo: 'noul', titulo: 'Ameaça sair', rotulo: 'vai sair', icone: '🚪', tom: 'ruim', limiar: 0.6, alerta: true,
      pergunta: 'A pessoa avisa que vai deixar de usar o Garfo Voador (ex.: "nunca mais peço", "vou desinstalar", "vou pedir direto no restaurante", "desisti de pedir pelo app")? Só reclamar, sem dizer que vai sair, não conta.',
    },
  ],

  fluxo: {
    colunas: 'tema',
    rotuloItem: 'Resposta da pesquisa',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.8, rotulo: 'Revisão humana', icone: '🙋' },
    cartao: { titulo: 'nome', subtitulo: 'cidade', texto: 'comentario', meta: 'notaTxt', avatar: 'avatar' },
    entrada: { placeholder: 'Cole aqui uma resposta da sua pesquisa e veja em qual tema ela cai…', botao: 'Classificar' },
    rotuloFeitos: 'respostas',
  },

  // o que vai para o Jev: a nota e o comentário (nome e cidade ficam só na tela)
  textoItem: (r) => `nota ${r.nota}/10 — "${r.comentario}"`,

  // somas feitas pelo código (o Jev não faz conta): temas, NPS da amostra e quem ameaça sair
  aoDecidir(item, resp, extra) {
    const t = resp.tema && resp.tema.choice;
    if (t) (extra.temas ||= {})[t] = (extra.temas[t] || 0) + 1;
    if (typeof item.nota === 'number') {
      extra.n = (extra.n || 0) + 1;
      if (item.nota >= 9) extra.promotores = (extra.promotores || 0) + 1;
      if (item.nota <= 6) extra.detratores = (extra.detratores || 0) + 1;
    }
    if (resp.vai_sair && resp.vai_sair.noul >= 0.6) extra.saindo = (extra.saindo || 0) + 1;
  },
  resumoExtra(extra) {
    const top = Object.entries(extra.temas || {}).sort((a, b) => b[1] - a[1])[0];
    const t = top && TEMAS.find((x) => x.id === top[0]);
    const nps = extra.n ? Math.round((((extra.promotores || 0) - (extra.detratores || 0)) / extra.n) * 100) : null;
    return [
      { rotulo: 'tema mais citado', valor: t ? `${t.icone} ${t.rotulo} (${top[1]})` : '—' },
      { rotulo: 'NPS da amostra', valor: nps == null ? '—' : String(nps) },
      { rotulo: 'ameaçam sair', valor: String(extra.saindo || 0) },
    ];
  },

  dados: RESPOSTAS.map((r) => ({ ...r, notaTxt: `nota ${r.nota}`, avatar: rosto(r.nota) })),
};

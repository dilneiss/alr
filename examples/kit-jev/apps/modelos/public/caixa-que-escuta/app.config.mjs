// Caixa que Escuta — no balcão, o Jev ouve cliente e vendedor e decide SE é hora e O QUE sugerir na tela do cliente.
// Para adaptar: troque a loja e a lista PRODUTOS (o "serve" é o critério do Jev) e ajuste a regra da decisão "hora_de_sugerir".
const PRODUTOS = [
  { id: 'meia_antibolha', nome: 'Meia de corrida antibolha', detalhe: 'kit com 3 pares', preco: 'R$ 49,90', emoji: '🧦', serve: 'quem leva tênis de corrida ou de caminhada, ou reclama de bolha e atrito no pé' },
  { id: 'caneleira', nome: 'Caneleira com tornozeleira', detalhe: 'tamanhos infantil e adulto', preco: 'R$ 59,90', emoji: '🦵', serve: 'quem leva chuteira ou joga futebol e leva pancada na canela' },
  { id: 'touca_silicone', nome: 'Touca de natação de silicone', detalhe: 'não puxa o cabelo', preco: 'R$ 39,90', emoji: '🏊', serve: 'quem leva óculos de natação ou começou a nadar e ainda não tem touca' },
  { id: 'antiembacante', nome: 'Spray antiembaçante', detalhe: 'para óculos de natação', preco: 'R$ 29,90', emoji: '🥽', serve: 'quem reclama que os óculos de natação embaçam na água' },
  { id: 'luva_treino', nome: 'Luva de musculação', detalhe: 'com punho firme', preco: 'R$ 69,90', emoji: '🧤', serve: 'quem leva anilha, halter ou treina com peso e fica com calo na mão' },
  { id: 'garrafa_termica', nome: 'Garrafa térmica 750 ml', detalhe: 'gelada por 12 horas', preco: 'R$ 89,90', emoji: '🧊', serve: 'quem vai fazer trilha, pedal longo ou passar o dia treinando no sol' },
  { id: 'camara_reserva', nome: 'Câmara de ar reserva aro 29', detalhe: 'com espátula', preco: 'R$ 34,90', emoji: '🚲', serve: 'quem leva bicicleta ou pedala e não quer ficar a pé se o pneu furar' },
  { id: 'bomba_bola', nome: 'Bomba de ar com agulha', detalhe: 'cabe na mochila', preco: 'R$ 24,90', emoji: '🏐', serve: 'quem leva bola de vôlei, futebol ou basquete (a bola vem vazia)' },
];

const LIMIAR_HORA = 0.45;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'caixa-que-escuta',
  titulo: 'Caixa que Escuta',
  emoji: '🏅',
  categoria: 'voz',
  ordem: 60,
  resumo: 'Ouve a conversa no balcão e mostra na tela do cliente o complemento certo, só quando é a hora.',
  descricao: 'A cada fala, o Jev escolhe um produto da loja (ou nenhum), decide se é um bom momento para sugerir e percebe quando o cliente muda o pedido. Cliente reclamando ou com pressa não recebe oferta: a tela espera a hora certa.',
  marcas: ['imediato', 'limiar', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#fb923c', acento2: '#facc15' },
  origem: 'planejado no PLANO-INTENCOES-E-CAIXA (ideias 26 e 27)',

  contexto: {
    loja: 'Ponto Esportivo, loja de artigos esportivos de bairro em Campinas',
    produtos: PRODUTOS.map((p) => `${p.nome} (${p.preco}): para ${p.serve}`),
    regra: 'No máximo uma sugestão por vez, e só quando ajuda o cliente. Cliente reclamando ou com pressa não recebe oferta.',
  },

  decisoes: [
    {
      id: 'sugestao', tipo: 'choice', papel: 'destaque', titulo: 'Sugestão',
      pergunta: 'Pelo que o cliente está levando e pelo que contou na conversa (esporte, problema, necessidade), qual destes produtos é o complemento mais útil para ele? Quando o cliente citou um problema (bolha, canela, óculos embaçando…), escolha o produto que resolve esse problema. Escolha "nenhum" se nada da lista combina, se ele já tem ou acabou de recusar o produto, ou se ainda não dá para saber.',
      opcoes: () => [
        ...PRODUTOS.map((p) => ({ id: p.id, rotulo: p.nome, icone: p.emoji, desc: `${p.nome}: para ${p.serve}` })),
        { id: 'nenhum', rotulo: 'Nenhum', icone: '🚫', desc: 'nada da lista combina com o que o cliente leva ou contou, ele já tem ou recusou o produto, ou ainda não dá para saber' },
      ],
    },
    {
      id: 'hora_de_sugerir', tipo: 'noul', titulo: 'Hora de sugerir?', rotuloSim: 'mostrar agora', rotuloNao: 'segurar', tom: 'bom', limiar: LIMIAR_HORA,
      pergunta: 'Agora é um bom momento para mostrar uma sugestão de produto na tela do cliente? Regra da loja: a resposta é SIM sempre que o cliente está calmo e falando da compra (escolheu o produto, contou para que vai usar, contou um problema como bolha ou óculos embaçando, ou o vendedor perguntou se quer mais alguma coisa). A resposta é NÃO só nestes casos: (1) o cliente está reclamando da loja, do produto ou do atendimento; (2) está com pressa ("rápido", "tô atrasado"); (3) acabou de recusar uma oferta; (4) ainda está indeciso entre produtos.',
    },
    {
      id: 'pedido_mudou', tipo: 'noul', papel: 'contador', titulo: 'Mudanças no pedido', rotuloSim: 'mudou', rotuloNao: 'igual', tom: 'medio', quem: ['cliente'],
      pergunta: 'Na fala atual, o cliente MUDA o pedido que já estava combinado: troca tamanho, cor ou modelo, tira um item, desiste de algo ou PEDE com todas as letras um item a mais ("põe a meia também")? NÃO é mudança: recusar uma oferta, confirmar o que já ia levar, perguntar por um produto, reclamar ou contar um problema.',
    },
  ],

  conversa: {
    skin: 'balcao',
    titulo: 'Caixa 2 · Ponto Esportivo',
    subtitulo: 'microfone do balcão ligado · o Jev ouve os dois lados',
    avatar: '🏅',
    rotuloTela: 'Tela virada para o cliente',
    tituloPlacar: 'No balcão agora',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🙂', lado: 'esq' },
      vendedor: { nome: 'Vendedor', avatar: '🧑🏽‍💼', lado: 'dir' },
    },
    analisar: ['cliente', 'vendedor'],
    voce: 'cliente',
    escolherQuem: true,
    placeholder: 'Fale como cliente (ex.: "vou levar essa bola de vôlei")',
    selo(resp) {
      if (resp.pedido_mudou && resp.pedido_mudou.noul >= 0.5) return { texto: 'pedido mudou', tom: 'medio', icone: '🔄' };
      const h = resp.hora_de_sugerir;
      if (h && h.noul < LIMIAR_HORA) return { texto: 'não é hora', tom: 'ruim', icone: '✋' };
      if (h && resp.sugestao && resp.sugestao.choice !== 'nenhum') return { texto: 'hora de sugerir', tom: 'bom', icone: '💡' };
      return null;
    },
    telaCliente(resp, fala, ctx, estado) {
      const mudou = resp.pedido_mudou && resp.pedido_mudou.noul >= 0.5;
      const aviso = mudou ? '<div class="rot" style="color:#fbbf24;margin-bottom:6px">🔄 Pedido atualizado: confira o total</div>' : '';
      const h = resp.hora_de_sugerir;
      const p = PRODUTOS.find((x) => x.id === (resp.sugestao && resp.sugestao.choice));
      if (h && h.noul >= LIMIAR_HORA && p) {
        estado.ultima = p.id;
        return `<div>${aviso}<div class="prod"><span class="e">${p.emoji}</span><div><div class="rot">Sugestão para você</div><b style="display:block;font-size:16px;margin-top:4px">${esc(p.nome)}</b><span style="font-size:13px;color:#94a3b8">${esc(p.detalhe)} · </span><b style="color:#fde68a">${esc(p.preco)}</b></div></div></div>`;
      }
      const nota = h && h.noul < LIMIAR_HORA ? '✋ sugestão segurada: não é a hora' : 'nenhum produto combina com esta compra';
      return `<div>${aviso}<div class="rot">Ponto Esportivo</div><div style="font-size:15px;margin-top:6px">Obrigado pela preferência! 🏅</div><div style="font-size:12px;margin-top:4px;color:#94a3b8">${nota}</div></div>`;
    },
  },

  roteiros: [
    {
      titulo: 'Tênis de corrida',
      falas: [
        { quem: 'cliente', texto: 'Oi! Vou levar esse tênis de corrida azul, no 41.', esperado: { sugestao: 'meia_antibolha', hora_de_sugerir: true, pedido_mudou: false } },
        { quem: 'vendedor', texto: 'Boa escolha! Vai correr na rua ou na esteira?' },
        { quem: 'cliente', texto: 'Na rua, tô começando agora. Só que da última vez fiquei cheio de bolha no pé.', esperado: { sugestao: 'meia_antibolha', hora_de_sugerir: true, pedido_mudou: false } },
        { quem: 'cliente', texto: 'Ah, troca pro 42, por favor? O 41 apertou um pouco.', esperado: { sugestao: 'meia_antibolha', pedido_mudou: true } },
        { quem: 'vendedor', texto: 'Trocado! Vai querer mais alguma coisa?', esperado: { sugestao: 'meia_antibolha', hora_de_sugerir: true } },
      ],
    },
    {
      titulo: 'Troca com pressa',
      falas: [
        { quem: 'cliente', texto: 'Moço, essa chuteira descolou a sola em duas semanas. Quero trocar.', esperado: { hora_de_sugerir: false } },
        { quem: 'vendedor', texto: 'Poxa, desculpa! Faço a troca agora mesmo.' },
        { quem: 'cliente', texto: 'Rápido, por favor, que o jogo do meu filho é às três.', esperado: { hora_de_sugerir: false, pedido_mudou: false } },
        { quem: 'cliente', texto: 'Pode ser a mesma, só que número 36. O pé dele cresceu.', esperado: { pedido_mudou: true } },
        { quem: 'cliente', texto: 'Valeu! Agora, com calma: ele vive reclamando que leva chute na canela.', esperado: { sugestao: 'caneleira', hora_de_sugerir: true, pedido_mudou: false } },
      ],
    },
    {
      titulo: 'Óculos de natação',
      falas: [
        { quem: 'cliente', texto: 'Oi, quero esses óculos de natação. Comecei a nadar no clube.', esperado: { sugestao: ['touca_silicone', 'antiembacante'], hora_de_sugerir: true, pedido_mudou: false } },
        { quem: 'vendedor', texto: 'Legal! Quer levar uma touca também?' },
        { quem: 'cliente', texto: 'Não, obrigado. Só os óculos mesmo.', esperado: { sugestao: ['nenhum', 'antiembacante'], hora_de_sugerir: false, pedido_mudou: false } },
        { quem: 'cliente', texto: 'Mas me diz uma coisa: esses aqui embaçam? Os meus antigos embaçavam toda hora.', esperado: { sugestao: 'antiembacante', hora_de_sugerir: true, pedido_mudou: false } },
      ],
    },
  ],
};

// Monitor do Chatbot — relê as conversas do seu robô de atendimento e acha onde ele inventou, irritou o cliente ou travou.
// Para adaptar: troque a política da loja (contexto.politica, editável na tela), as raias e os trechos (exporte do seu chatbot).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// cada trecho é uma lista de falas: ['c', texto] = cliente, ['b', texto] = bot
const conversa = (x) => ({
  ...x,
  trecho: x.falas.map(([q, t]) => `${q === 'b' ? '🤖' : '👤'} ${t}`).join('   '),
  paraJev: x.falas.map(([q, t]) => `${q === 'b' ? 'Bot' : 'Cliente'}: ${t}`).join('\n'),
});

export default {
  id: 'monitor-chatbot',
  titulo: 'Monitor do Chatbot',
  emoji: '🔍',
  categoria: 'atendimento',
  ordem: 17,
  resumo: 'Relê as conversas do seu chatbot e acha onde ele inventou desconto, travou num loop ou deixou um cliente furioso sem ajuda.',
  descricao: 'Cada trecho de conversa passa pelo Jev com a política da loja do lado: resolvido, cliente irritado, bot inventou ou precisa de humano, com a gravidade. Custando centavos por mil conversas, dá para auditar todas, não uma amostra, e a política muda com um texto.',
  marcas: ['volume', 'lista fechada'],
  motor: 'fluxo',
  tema: { acento: '#f43f5e', acento2: '#818cf8' },

  contexto: {
    loja: 'Casa Alma — loja online de decoração',
    politica: '- Só vendemos online: não temos loja física. Entregamos só no Brasil.\n- Frete grátis acima de R$ 299. Prazo de entrega: de 3 a 10 dias úteis. O bot nunca promete data exata.\n- Troca ou devolução em até 30 dias depois do recebimento, com o produto sem uso.\n- Reembolso em até 7 dias úteis depois que a devolução chega.\n- Parcelamento em até 6x sem juros no cartão. Pix sem desconto.\n- Desconto só com o cupom BEMVINDO10 (10% na primeira compra). Não damos brinde.',
  },
  editavel: { campo: 'politica', rotulo: 'Política da loja (o Jev lê isto)', botao: 'Política', ajuda: 'Teste: mude para "parcelamos em até 12x" ou "Pix com 15% de desconto" e aperte ▶ de novo: o que era invenção vira resposta certa.' },

  decisoes: [
    {
      id: 'situacao', tipo: 'choice', titulo: 'Situação',
      pergunta: 'Como está este trecho de conversa entre o chatbot da loja e o cliente? Siga esta ordem: (1) se o BOT prometeu ou afirmou uma regra, condição ou vantagem que a política da loja (contexto.politica) não tem ou contradiz → bot_inventou (dados do pedido, como status e rastreio, vêm do sistema e não são invenção); (2) senão, se o caso exige uma pessoa (o bot travou ou repetiu a resposta, o cliente pediu um atendente, ameaça de processo, acidente ou problema que o bot não resolve) → precisa_humano; (3) senão, se o cliente está bravo ou irônico, mas o bot respondeu certo → cliente_irritado; (4) senão → resolvido.',
      opcoes: [
        { id: 'resolvido', rotulo: 'Resolvido', icone: '✅', cor: '#22c55e', desc: 'o bot respondeu certo, dentro da política, e o cliente ficou atendido' },
        { id: 'cliente_irritado', rotulo: 'Cliente irritado', icone: '😤', cor: '#f59e0b', desc: 'o cliente está bravo, repetindo ou ironizando, mas o bot respondeu certo e o caso está andando' },
        { id: 'bot_inventou', rotulo: 'Bot inventou', icone: '🤥', cor: '#f43f5e', desc: 'o bot disse algo que a política não tem ou não permite: desconto, prazo ou data exata, brinde, parcelamento, loja física, regra de troca' },
        { id: 'precisa_humano', rotulo: 'Precisa de humano', icone: '🙋', cor: '#818cf8', desc: 'o bot travou ou repetiu a resposta, o cliente pediu um atendente, ameaçou processo, sofreu acidente ou tem um problema que só uma pessoa resolve' },
      ],
    },
    {
      id: 'fora_da_politica', tipo: 'noul', titulo: 'Fora da política', rotulo: 'fora da política', icone: '📕', tom: 'ruim', alerta: true, limiar: 0.5,
      pergunta: 'Alguma resposta do BOT neste trecho contradiz a política da loja (contexto.politica) ou promete algo que ela não permite? Dados do pedido, como status e rastreio, não contam.',
    },
    {
      id: 'gravidade', tipo: 'score', titulo: 'Gravidade',
      pergunta: 'Quão grave é a situação deste trecho para a loja, somando o que o cliente diz e o que o bot fez?',
      niveis: [
        { rotulo: 'tranquilo', desc: 'nada a corrigir' },
        { rotulo: 'atenção', desc: 'vale corrigir o bot ou acompanhar o cliente' },
        { rotulo: 'grave', desc: 'prejuízo, promessa que a loja não vai cumprir, cliente machucado, ameaça de processo ou de reclamação pública' },
      ],
    },
  ],

  fluxo: {
    colunas: 'situacao',
    rotuloItem: 'Trecho de conversa',
    rotuloFila: 'Conversas de hoje',
    lote: 4,
    ritmo: 5500,
    cartao: { titulo: 'cliente', subtitulo: 'canal', texto: 'trecho', meta: 'hora', avatar: 'avatar' },
    entrada: { placeholder: 'Cole um trecho ("Cliente: …" / "Bot: …") e veja o diagnóstico…', botao: 'Auditar' },
    rotuloFeitos: 'conversas',
  },
  textoItem: (x) => x.paraJev,

  // o que fazer com cada caso (texto nosso; o Jev só escolheu a raia)
  cartaoExtra(item, resp) {
    const s = resp.situacao && resp.situacao.choice;
    const acao = { bot_inventou: ['ruim', '🛠 corrigir a resposta do bot'], precisa_humano: ['info', '🙋 atendente assume agora'], cliente_irritado: ['medio', '💛 acompanhar o cliente'] }[s];
    return acao ? `<span class="mj-chip ${acao[0]}">${esc(acao[1])}</span>` : '';
  },
  aoDecidir(item, resp, extra) {
    const s = resp.situacao && resp.situacao.choice;
    if (s === 'bot_inventou') extra.inventou = (extra.inventou || 0) + 1;
    if (s === 'precisa_humano') extra.humano = (extra.humano || 0) + 1;
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'invenções do bot', valor: String(extra.inventou || 0) },
      { rotulo: 'casos para uma pessoa', valor: String(extra.humano || 0) },
    ];
  },

  dados: [
    conversa({ id: 'k1', cliente: 'Ana Ribeiro', avatar: '👩', canal: 'chat do site', hora: '08:14', falas: [['c', 'Qual o prazo de entrega para Recife?'], ['b', 'Entregamos em 3 a 10 dias úteis, dependendo da região. Assim que o pedido sair, você recebe o código de rastreio.'], ['c', 'Perfeito, obrigada!']], esperado: { situacao: 'resolvido', fora_da_politica: false, gravidade: 0 } }),
    conversa({ id: 'k2', cliente: 'Bruno Alves', avatar: '🧔', canal: 'WhatsApp', hora: '08:20', falas: [['c', 'Tem desconto pra pagar no Pix?'], ['b', 'Tem sim! No Pix você ganha 15% de desconto em qualquer produto 😊']], esperado: { situacao: 'bot_inventou', fora_da_politica: true, gravidade: [1, 2] } }),
    conversa({ id: 'k3', cliente: 'Carla Mendes', avatar: '😠', canal: 'WhatsApp', hora: '08:31', falas: [['c', 'PELA TERCEIRA VEZ: meu pedido 8812 não chegou!!! Vocês são uma piada'], ['b', 'Sinto muito, Carla. O pedido 8812 saiu da transportadora ontem, o rastreio é QX123BR e ele está dentro do prazo de 10 dias úteis.']], esperado: { situacao: 'cliente_irritado', fora_da_politica: false } }),
    conversa({ id: 'k4', cliente: 'Diego Santos', avatar: '🧑', canal: 'chat do site', hora: '08:40', falas: [['c', 'quero trocar o tapete, veio de outra cor'], ['b', 'Desculpe, não entendi. Pode reformular?'], ['c', 'TROCAR O TAPETE QUE VEIO ERRADO'], ['b', 'Desculpe, não entendi. Pode reformular?']], esperado: { situacao: 'precisa_humano', fora_da_politica: false } }),
    conversa({ id: 'k5', cliente: 'Elaine Costa', avatar: '👩‍🦰', canal: 'chat do site', hora: '08:52', falas: [['c', 'Comprei a luminária faz 45 dias, ainda posso trocar?'], ['b', 'Claro! Você tem até 90 dias para trocar, é só mandar pelos Correios.']], esperado: { situacao: 'bot_inventou', fora_da_politica: true } }),
    conversa({ id: 'k6', cliente: 'Fábio Lima', avatar: '🙂', canal: 'WhatsApp', hora: '09:03', falas: [['c', 'O frete é grátis numa compra de R$ 320?'], ['b', 'É sim! Acima de R$ 299 o frete é grátis.'], ['c', 'show, vou fechar']], esperado: { situacao: 'resolvido', fora_da_politica: false } }),
    conversa({ id: 'k7', cliente: 'Gabriela Rocha', avatar: '🩹', canal: 'WhatsApp', hora: '09:15', falas: [['c', 'O vaso chegou quebrado e eu cortei a mão abrindo a caixa'], ['b', 'Que pena! Você pode pedir a troca pelo site em até 30 dias.']], esperado: { situacao: 'precisa_humano', gravidade: 2 } }),
    conversa({ id: 'k8', cliente: 'Hugo Martins', avatar: '🧑‍💼', canal: 'chat do site', hora: '09:22', falas: [['c', 'Vocês têm loja física em São Paulo?'], ['b', 'Temos sim! Fica na Av. Paulista, 1200, aberta todos os dias.']], esperado: { situacao: 'bot_inventou', fora_da_politica: true } }),
    conversa({ id: 'k9', cliente: 'Isabela Nunes', avatar: '😒', canal: 'WhatsApp', hora: '09:35', falas: [['c', 'Já é a segunda vez que o cupom não funciona, que raiva'], ['b', 'Entendo! O cupom BEMVINDO10 vale só na primeira compra, por isso não entrou no seu segundo pedido.'], ['c', 'aff, tá bom então']], esperado: { situacao: ['cliente_irritado', 'resolvido'], fora_da_politica: false } }),
    conversa({ id: 'k10', cliente: 'João Pedro', avatar: '😩', canal: 'chat do site', hora: '09:41', falas: [['c', 'Quero falar com uma pessoa'], ['b', 'Posso te ajudar com rastreio, trocas e dúvidas sobre produtos!'], ['c', 'UMA PESSOA, POR FAVOR']], esperado: { situacao: 'precisa_humano' } }),
    conversa({ id: 'k11', cliente: 'Karina Souza', avatar: '🛋️', canal: 'Instagram', hora: '09:50', falas: [['c', 'Se eu comprar 2 almofadas ganho uma de brinde?'], ['b', 'Ganha sim! Na compra de 2 almofadas a 3ª sai de brinde 🎁']], esperado: { situacao: 'bot_inventou', fora_da_politica: true } }),
    conversa({ id: 'k12', cliente: 'Leandro Prado', avatar: '⚖️', canal: 'e-mail', hora: '10:02', falas: [['c', 'Vou processar vocês, já falei com o meu advogado'], ['b', 'Sinto muito pelo transtorno. Pode me contar o que aconteceu?']], esperado: { situacao: 'precisa_humano', gravidade: 2 } }),
    conversa({ id: 'k13', cliente: 'Marina Teles', avatar: '👩‍💻', canal: 'chat do site', hora: '10:10', falas: [['c', 'Como acompanho o meu pedido?'], ['b', 'No e-mail de confirmação tem o link de rastreio. Também dá para ver em Minha Conta > Pedidos.'], ['c', 'achei, valeu!']], esperado: { situacao: 'resolvido', fora_da_politica: false, gravidade: 0 } }),
    conversa({ id: 'k14', cliente: 'Nelson Araújo', avatar: '😤', canal: 'WhatsApp', hora: '10:24', falas: [['c', 'a entrega tá atrasada, que palhaçada'], ['b', 'Peço desculpas pela espera! O seu pedido ainda está dentro do prazo de 10 dias úteis. Se passar disso, eu abro a reclamação com a transportadora.']], esperado: { situacao: 'cliente_irritado', fora_da_politica: false } }),
    conversa({ id: 'k15', cliente: 'Olívia Castro', avatar: '💳', canal: 'chat do site', hora: '10:33', falas: [['c', 'Posso pagar em 12x?'], ['b', 'Pode sim, em até 12x sem juros nas compras acima de R$ 500!']], esperado: { situacao: 'bot_inventou', fora_da_politica: true } }),
    conversa({ id: 'k16', cliente: 'Paulo Henrique', avatar: '🪞', canal: 'Instagram', hora: '10:41', falas: [['c', 'Chegou certinho, amei o espelho!'], ['b', 'Que bom, Paulo! 💛 Obrigada por comprar com a gente.']], esperado: { situacao: 'resolvido', fora_da_politica: false, gravidade: 0 } }),
    conversa({ id: 'k17', cliente: 'Raquel Dias', avatar: '😟', canal: 'WhatsApp', hora: '10:55', falas: [['c', 'Devolvi a mesa há 20 dias e o reembolso não caiu até hoje'], ['b', 'O reembolso sai em até 7 dias úteis depois que a devolução chega. Qual o número do pedido?'], ['c', '9031. E ninguém me responde no e-mail!!']], esperado: { situacao: ['precisa_humano', 'cliente_irritado'], fora_da_politica: false } }),
    conversa({ id: 'k18', cliente: 'Sérgio Moura', avatar: '📦', canal: 'WhatsApp', hora: '11:06', falas: [['c', 'Qual a data exata que chega? Preciso pra sexta'], ['b', 'Chega na sexta com certeza, pode ficar tranquilo!']], esperado: { situacao: 'bot_inventou', fora_da_politica: true } }),
    conversa({ id: 'k19', cliente: 'Tânia Lopes', avatar: '🌍', canal: 'chat do site', hora: '11:15', falas: [['c', 'Vocês entregam em Portugal?'], ['b', 'No momento entregamos só no Brasil. Se quiser, aviso quando tivermos envio internacional.'], ['c', 'ah, que pena, mas ok']], esperado: { situacao: 'resolvido', fora_da_politica: false } }),
    conversa({ id: 'k20', cliente: 'Vera Moraes', avatar: '🙄', canal: 'WhatsApp', hora: '11:28', falas: [['c', 'Isso é um absurdo, comprei há 8 dias e nada! Nunca mais compro aqui'], ['b', 'Sinto muito, Vera. Pelo rastreio, o pedido saiu para entrega hoje. Qualquer problema, me chame aqui que eu abro a reclamação com a transportadora.']], esperado: { situacao: 'cliente_irritado', fora_da_politica: false } }),
  ],
};

// URA que Entende — na ligação, o cliente fala do jeito dele e o Jev escolhe o setor certo; se ele estiver irritado, vai direto para um humano.
// Para adaptar: troque SETORES (o "desc" é o critério do Jev; "frase" e "confirma" são o que a sua URA fala) e o nome do banco.
const SETORES = [
  { id: 'segunda_via', rotulo: 'Segunda via', icone: '🧾', desc: 'quer a segunda via da fatura, do boleto ou da conta, ou o código para pagar', frase: 'Entendi: segunda via da fatura. Mando agora por SMS e por e-mail, tá bom?', confirma: 'a segunda via da fatura' },
  { id: 'desbloqueio_cartao', rotulo: 'Desbloqueio de cartão', icone: '🔓', desc: 'o cartão está bloqueado, foi recusado ou não passa na maquininha, e a pessoa ainda está com ele', frase: 'Entendi: desbloqueio de cartão. Vou confirmar seus dados e liberar em seguida.', confirma: 'desbloquear o seu cartão' },
  { id: 'negociar_divida', rotulo: 'Negociar dívida', icone: '🤝', desc: 'tem parcela, fatura ou empréstimo atrasado ou para vencer e quer parcelar, adiar, renegociar ou ter desconto', frase: 'Entendi: negociação de dívida. Tenho opções de parcelamento para você. Transferindo…', confirma: 'negociar uma dívida' },
  { id: 'cancelar', rotulo: 'Cancelamento', icone: '✂️', desc: 'quer cancelar o cartão, a conta, um serviço ou um seguro', frase: 'Entendi: cancelamento. Antes de seguir, posso te oferecer 12 meses sem anuidade?', confirma: 'cancelar o cartão' },
  { id: 'perda_roubo', rotulo: 'Perda ou roubo', icone: '🚨', desc: 'perdeu o cartão ou o celular, foi roubado ou furtado, ou vê uma compra que não fez', frase: 'Entendi: perda ou roubo. Já bloqueei seu cartão por segurança e vou te passar para a equipe de proteção.', confirma: 'comunicar perda ou roubo' },
  { id: 'falar_atendente', rotulo: 'Falar com atendente', icone: '🙋', desc: 'pede para falar com uma pessoa, um atendente ou um humano, qualquer que seja o motivo', frase: 'Certo, vou te transferir para um atendente. A espera é de menos de 2 minutos.', confirma: 'falar com um atendente' },
  { id: 'encerrar', rotulo: 'Encerrar', icone: '👋', desc: 'agradece, se despede ou diz que era só isso', frase: 'O Banco Aurora agradece a sua ligação. Tenha um ótimo dia!', confirma: 'encerrar a ligação' },
  { id: 'nenhum', rotulo: 'Não entendi', icone: '❔', desc: '"alô", frase cortada, barulho ou assunto fora desta lista', frase: 'Estou ouvindo! Pode me dizer, com suas palavras, o que você precisa?', confirma: '' },
];
const LIMIAR_CONFIRMAR = 0.6;   // abaixo disso, a URA confirma antes de transferir
const pct = (p) => Math.round((p || 0) * 100) + '%';

export default {
  id: 'ura-que-entende',
  titulo: 'URA que Entende',
  emoji: '☎️',
  categoria: 'voz',
  ordem: 61,
  resumo: 'O cliente fala do jeito dele ("meu cartão não passa no mercado") e a ligação vai para o setor certo, sem "digite 1".',
  descricao: 'A cada frase, o Jev escolhe um setor de uma lista fechada e percebe irritação. Com confiança alta, a URA transfere; com confiança baixa, ela confirma antes; com o cliente irritado, ela chama um humano sem fila. Todas as frases da URA são prontas.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'conversa',
  tema: { acento: '#6366f1', acento2: '#06b6d4' },

  contexto: {
    empresa: 'Banco Aurora, banco digital (fictício)',
    canal: 'ligação telefônica; a fala chega transcrita, frase por frase',
    regra: 'Cliente irritado vai para um humano, sem fila. Pedido de pessoa também.',
  },

  decisoes: [
    {
      id: 'setor', tipo: 'choice', papel: 'destaque', titulo: 'Setor',
      pergunta: 'O que o cliente quer resolver com a fala atual (use a ligação até aqui como contexto)? Escolha pelo PROBLEMA que ele descreve, mesmo que não use o nome do serviço. Se ele pedir para falar com uma pessoa, a resposta é "falar_atendente", mesmo que cite o motivo. Use "nenhum" para "alô", frase cortada ou assunto fora da lista.',
      opcoes: SETORES.map(({ id, rotulo, icone, desc }) => ({ id, rotulo, icone, desc })),
    },
    {
      id: 'irritado', tipo: 'noul', papel: 'checklist', titulo: 'Irritação', rotulo: 'cliente irritado', rotuloSim: 'irritado', rotuloNao: 'calmo', tom: 'ruim', alerta: true, limiar: 0.5,
      pergunta: 'O cliente está irritado ou bravo com o banco ou com o atendimento: reclama, xinga, ironiza, diz que já ligou várias vezes ou ameaça cancelar ou processar? Susto, pressa ou preocupação (como ter o cartão roubado) NÃO é irritação.',
    },
  ],

  conversa: {
    skin: 'ligacao',
    titulo: 'Banco Aurora',
    subtitulo: 'URA com o Jev · sem "digite 1"',
    avatar: '🏦',
    abertura: '📞 Ligação em andamento: o Jev ouve cada frase do cliente e escolhe o setor',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🙂', lado: 'esq' },
      bot: { nome: 'URA Banco Aurora', avatar: '🏦', lado: 'dir' },
    },
    analisar: ['cliente'],
    voce: 'cliente',
    placeholder: 'Fale como cliente (ex.: "minha fatura não chegou esse mês")',
    tituloPlacar: 'Na ligação agora',
    selo(resp) {
      if (resp.irritado && resp.irritado.noul >= 0.5) return { texto: 'irritado', tom: 'ruim', icone: '😠' };
      const op = SETORES.find((x) => x.id === (resp.setor && resp.setor.choice));
      return op && op.id !== 'nenhum' ? { texto: op.rotulo, tom: 'acento', icone: op.icone } : null;
    },
    responder(resp, fala, ctx, estado) {
      if (resp.irritado && resp.irritado.noul >= 0.5) {
        estado.humano = true;
        return { texto: 'Sinto muito pela experiência. Vou te passar agora para um atendente, sem fila. 🙏', marca: 'irritado → humano sem fila' };
      }
      const s = resp.setor;
      const op = SETORES.find((x) => x.id === (s && s.choice)) || SETORES[SETORES.length - 1];
      const conf = s && s.probabilities ? s.probabilities[s.choice] : 0;
      if (op.id === 'nenhum') return op.frase;
      if (conf < LIMIAR_CONFIRMAR) return { texto: `Só para confirmar: você quer ${op.confirma}? Pode dizer "sim" ou explicar de novo.`, marca: `confiança ${pct(conf)} → confirma antes` };
      return { texto: op.frase, marca: `${op.icone} ${op.rotulo} · ${pct(conf)}` };
    },
  },

  roteiros: [
    {
      titulo: 'Cartão no mercado',
      falas: [
        { quem: 'bot', fixa: true, texto: 'Banco Aurora, boa tarde! Pode falar, do seu jeito, o que você precisa.' },
        { quem: 'cliente', texto: 'Oi, tô no caixa do mercado e meu cartão não passa de jeito nenhum. Diz que tá bloqueado.', esperado: { setor: 'desbloqueio_cartao', irritado: false } },
        { quem: 'cliente', texto: 'Ah, e aproveita e me manda a segunda via da fatura? Perdi o boleto.', esperado: { setor: 'segunda_via', irritado: false } },
        { quem: 'cliente', texto: 'Só isso, obrigada!', esperado: { setor: 'encerrar', irritado: false } },
      ],
    },
    {
      titulo: 'Bolsa roubada',
      falas: [
        { quem: 'bot', fixa: true, texto: 'Banco Aurora, boa noite! Pode falar, do seu jeito, o que você precisa.' },
        { quem: 'cliente', texto: 'Alô? Alô, tá me ouvindo?', esperado: { setor: 'nenhum', irritado: false } },
        { quem: 'cliente', texto: 'Levaram minha bolsa no ônibus agora há pouco. Carteira, cartão, tudo.', esperado: { setor: 'perda_roubo', irritado: false } },
        { quem: 'cliente', texto: 'E tem como adiar a parcela do empréstimo que vence amanhã? Fiquei sem nada.', esperado: { setor: 'negociar_divida', irritado: false } },
      ],
    },
    {
      titulo: 'Cliente irritado',
      falas: [
        { quem: 'bot', fixa: true, texto: 'Banco Aurora, boa tarde! Pode falar, do seu jeito, o que você precisa.' },
        { quem: 'cliente', texto: 'Boa tarde. Eu queria cancelar o meu cartão de crédito, por favor.', esperado: { setor: 'cancelar', irritado: false } },
        { quem: 'cliente', texto: 'Não quero oferta nenhuma! É a terceira vez que eu ligo pra isso. Me passa pra uma pessoa!', esperado: { setor: 'falar_atendente', irritado: true } },
      ],
    },
  ],
};

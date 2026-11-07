// Recepcionista de WhatsApp — entende o pedido do paciente e escolhe só entre os horários livres de verdade.
// Para adaptar: troque a clínica, os horários livres (de preferência vindos da sua agenda) e as respostas prontas.
const HORARIOS = [
  { id: 'qua_0900', rotulo: 'quarta (21/10) às 9h00' },
  { id: 'qua_1330', rotulo: 'quarta (21/10) às 13h30' },
  { id: 'qua_1500', rotulo: 'quarta (21/10) às 15h00' },
  { id: 'qua_1700', rotulo: 'quarta (21/10) às 17h00' },
  { id: 'qui_1000', rotulo: 'quinta (22/10) às 10h00' },
  { id: 'qui_1430', rotulo: 'quinta (22/10) às 14h30' },
  { id: 'sex_0830', rotulo: 'sexta (23/10) às 8h30' },
  { id: 'sex_1600', rotulo: 'sexta (23/10) às 16h00' },
];

export default {
  id: 'recepcionista-whatsapp',
  titulo: 'Recepcionista de WhatsApp',
  emoji: '🦷',
  categoria: 'atendimento',
  ordem: 9,
  resumo: 'Entende "consigo amanhã depois do almoço, mas saio antes das 4" e marca só em horário livre de verdade.',
  descricao: 'A cada mensagem o Jev decide a intenção do paciente, escolhe UM dos horários livres da agenda (ou "nenhum serve", ou "perguntar") e percebe urgência. As respostas são modelos prontos da clínica: nada de horário inventado nem promessa que ninguém fez.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#25d366', acento2: '#34b7f1' },

  contexto: {
    clinica: 'Clínica Sorriso Pleno — odontologia em Belo Horizonte, Dra. Helena Duarte',
    hoje: 'terça-feira, 20/10/2026, 14h',
    horarios_livres: HORARIOS.map((h) => h.rotulo),
    precos: 'avaliação R$ 120 (abatida do tratamento); limpeza R$ 180',
    convenios: 'Odontoprev, Amil Dental e SulAmérica Odonto',
  },

  decisoes: [
    {
      id: 'intencao', tipo: 'choice', papel: 'destaque', titulo: 'Intenção',
      pergunta: 'O que o paciente quer com a fala atual (considerando a conversa até aqui)?',
      opcoes: [
        { id: 'agendar', rotulo: 'Agendar', icone: '📅', desc: 'quer marcar uma consulta ou está escolhendo dia e horário' },
        { id: 'remarcar', rotulo: 'Remarcar', icone: '🔁', desc: 'quer mudar uma consulta já marcada' },
        { id: 'cancelar', rotulo: 'Cancelar', icone: '❌', desc: 'quer desmarcar sem remarcar' },
        { id: 'confirmar', rotulo: 'Confirmar', icone: '👍', desc: 'aceita ou confirma o horário oferecido pela clínica' },
        { id: 'preco', rotulo: 'Preço', icone: '💰', desc: 'pergunta valor de consulta ou tratamento' },
        { id: 'convenio', rotulo: 'Convênio', icone: '🪪', desc: 'pergunta se atende o plano dele' },
        { id: 'duvida', rotulo: 'Dúvida clínica', icone: '❓', desc: 'pergunta sobre tratamento, dor ou cuidado' },
        { id: 'outro', rotulo: 'Outro', icone: '💬', desc: 'saudação, agradecimento ou outro assunto' },
      ],
    },
    {
      id: 'horario', tipo: 'choice', titulo: 'Horário da agenda',
      pergunta: 'Se o paciente indicou quando pode vir, qual dos horários livres da agenda atende ao que ele disse? Escolha "nenhum" se nenhum horário livre serve, ou "perguntar" se ele não indicou quando pode vir ou foi vago demais.',
      opcoes: () => [
        ...HORARIOS.map((h) => ({ id: h.id, rotulo: h.rotulo, desc: h.rotulo })),
        { id: 'nenhum', rotulo: 'Nenhum serve', desc: 'o paciente pediu um momento em que não há horário livre' },
        { id: 'perguntar', rotulo: 'Perguntar', desc: 'o paciente não disse quando pode vir ou foi vago' },
      ],
    },
    {
      id: 'urgente', tipo: 'noul', papel: 'checklist', titulo: 'Urgência', rotulo: 'urgência', rotuloSim: 'atender hoje', rotuloNao: 'sem urgência', alerta: true, limiar: 0.5,
      pergunta: 'O paciente relata dor forte, sangramento, inchaço, dente quebrado ou febre — algo que precisa de atendimento hoje?',
    },
  ],

  conversa: {
    skin: 'whatsapp',
    titulo: 'Clínica Sorriso Pleno',
    subtitulo: 'online · atendimento automático com o Jev',
    avatar: '🦷',
    participantes: {
      paciente: { nome: 'Paciente', avatar: '🙂', lado: 'esq' },
      bot: { nome: 'Clínica Sorriso Pleno', avatar: '🦷', lado: 'dir' },
    },
    analisar: ['paciente'],
    voce: 'paciente',
    placeholder: 'Escreva como paciente (ex.: "dá pra ser sexta de manhã?")',
    responder(resp, fala, ctx, estado) {
      const intencao = resp.intencao && resp.intencao.choice;
      const h = resp.horario && resp.horario.choice;
      if (resp.urgente && resp.urgente.noul >= 0.5) return { texto: 'Sinto muito! 🙏 Vou passar você agora para a nossa equipe, que encaixa urgências ainda hoje. Só um instante.', marca: 'urgência → equipe' };
      const slot = HORARIOS.find((x) => x.id === h);
      if (['agendar', 'remarcar'].includes(intencao)) {
        if (slot) { estado.ofertado = slot.rotulo; return { texto: `Perfeito! Tenho ${slot.rotulo} com a Dra. Helena. Posso confirmar para você? ✅`, marca: 'horário real da agenda' }; }
        if (h === 'nenhum') return 'Nesse horário a agenda já está cheia 😕 Os mais próximos são quarta às 17h00 ou quinta às 10h00. Algum desses serve?';
        return 'Claro! Qual dia e período ficam melhor para você: manhã, tarde ou fim do dia?';
      }
      if (intencao === 'confirmar') return estado.ofertado ? `Confirmado: ${estado.ofertado}. Você recebe um lembrete na véspera. Até lá! 😊` : 'Combinado! Qual horário você quer confirmar?';
      if (intencao === 'cancelar') return 'Tudo bem, cancelei sua consulta. Quando quiser remarcar é só chamar aqui. 💙';
      if (intencao === 'preco') return `Os valores: ${ctx.precos}. Quer agendar uma avaliação?`;
      if (intencao === 'convenio') return `Atendemos ${ctx.convenios}. Qual é o seu plano?`;
      if (intencao === 'duvida') return 'Boa pergunta! Vou pedir para a Dra. Helena responder você por aqui ainda hoje. 👩‍⚕️';
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Agendar limpeza',
      falas: [
        { quem: 'paciente', texto: 'oi, boa tarde! queria marcar uma limpeza' },
        { quem: 'paciente', texto: 'consigo amanhã depois do almoço, mas tenho que sair antes das 4' },
        { quem: 'paciente', texto: 'pode ser, fechado!' },
      ],
    },
    {
      titulo: 'Remarcar',
      falas: [
        { quem: 'paciente', texto: 'Oi, tenho consulta quinta de manhã mas surgiu uma viagem, dá pra trocar?' },
        { quem: 'paciente', texto: 'amanhã no fim da tarde, depois do trabalho, tipo 6 e meia' },
        { quem: 'paciente', texto: 'ah então quarta às 5 serve sim' },
        { quem: 'paciente', texto: 'confirmado, obrigada!' },
      ],
    },
    {
      titulo: 'Urgência',
      falas: [
        { quem: 'paciente', texto: 'bom dia, vocês atendem amil dental?' },
        { quem: 'paciente', texto: 'é que meu dente quebrou ontem à noite comendo e tá doendo muito, o rosto até inchou' },
      ],
    },
  ],
};

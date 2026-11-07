// Agente de Voz que Sabe Quando Falar — a fala do cliente chega em pedaços e o Jev decide: esperar, continuar, parar ou responder.
// Para adaptar: troque o negócio e os roteiros. Na vida real, o texto da resposta vem do seu agente (LLM); o campo "agente" de cada fala é só para a demonstração.
const ROTEIROS = [
  {
    titulo: 'Pausa para pensar',
    falas: [
      { quem: 'bot', fixa: true, texto: 'Pet Shop Bicho Feliz, boa tarde! Aqui é a assistente virtual. Como posso ajudar?' },
      { quem: 'cliente', texto: 'Oi, boa tarde! Eu queria saber se…', esperado: { tipo_som: 'pausa_para_pensar', terminou_de_falar: false } },
      { quem: 'cliente', texto: 'é… se vocês têm horário pra banho amanhã.', agente: 'Temos, sim! Amanhã às 10h ou às 15h. Qual fica melhor?', esperado: { tipo_som: ['pergunta', 'fim_de_frase'], terminou_de_falar: true } },
      { quem: 'cliente', texto: 'Às dez. Ele é um golden bem grande, tá?', agente: 'Anotado: banho amanhã às 10h, golden de porte grande. Qual é o nome dele?', esperado: { tipo_som: 'fim_de_frase', terminou_de_falar: true } },
      { quem: 'cliente', texto: 'Thor.', agente: 'Pronto, o Thor está agendado. Até amanhã! 🐾', esperado: { tipo_som: 'fim_de_frase', terminou_de_falar: true } },
    ],
  },
  {
    titulo: 'Uhum × peraí',
    falas: [
      { quem: 'bot', fixa: true, texto: 'O banho completo funciona assim: você deixa o Thor às dez, a gente dá banho, seca e escova…' },
      { quem: 'cliente', texto: 'uhum', agente: '…depois corta as unhas, limpa as orelhas e passa um perfume suave no final.', esperado: { tipo_som: 'concordancia', terminou_de_falar: false } },
      { quem: 'cliente', texto: 'não, não, peraí', esperado: { tipo_som: 'interrupcao', terminou_de_falar: false } },
      { quem: 'cliente', texto: 'Perfume não, que ele tem alergia, tá?', agente: 'Entendido! Sem perfume para o Thor. Mais alguma coisa?', esperado: { tipo_som: 'fim_de_frase', terminou_de_falar: true } },
      { quem: 'cliente', texto: 'Não, é só isso. Obrigada!', agente: 'Imagina! Até amanhã às 10h. 🐾', esperado: { tipo_som: 'fim_de_frase', terminou_de_falar: true } },
    ],
  },
  {
    titulo: 'Outra pessoa na sala',
    falas: [
      { quem: 'bot', fixa: true, texto: 'Para fechar: o banho do Thor fica amanhã às 10h. Posso te passar o valor?' },
      { quem: 'cliente', texto: 'Júlia, abaixa a TV, por favor!', esperado: { tipo_som: 'outro', terminou_de_falar: false } },
      { quem: 'cliente', texto: 'Desculpa! Pode falar.', agente: 'O banho completo para porte grande fica R$ 95, pago na retirada.', esperado: { tipo_som: 'fim_de_frase', terminou_de_falar: true } },
      { quem: 'cliente', texto: 'Hum… deixa eu ver se…', esperado: { tipo_som: 'pausa_para_pensar', terminou_de_falar: false } },
      { quem: 'cliente', texto: 'se dá pra pagar no Pix?', agente: 'Dá, sim! O Pix é feito na retirada, no balcão.', esperado: { tipo_som: 'pergunta', terminou_de_falar: true } },
    ],
  },
];
// o que o agente diz em cada fala da demonstração (na vida real, quem escreve é o seu agente)
const FALA_DO_AGENTE = Object.fromEntries(ROTEIROS.flatMap((r) => r.falas.filter((f) => f.agente).map((f) => [f.texto, f.agente])));

const TIPOS = [
  { id: 'concordancia', rotulo: 'Concordância', icone: '👍', tom: 'bom', desc: 'sinal curto de que está ouvindo enquanto o agente fala ("uhum", "aham", "sei", "tá", "certo"); não pede a vez' },
  { id: 'interrupcao', rotulo: 'Interrupção', icone: '✋', tom: 'ruim', desc: 'pedido CURTO para o agente parar de falar e ouvir, dito enquanto ele fala ("peraí", "não, não", "espera", "opa"); ainda não diz o que quer' },
  { id: 'pergunta', rotulo: 'Pergunta', icone: '❓', tom: 'acento', desc: 'pergunta completa que espera resposta ("vocês abrem sábado?", "quanto fica?")' },
  { id: 'pausa_para_pensar', rotulo: 'Pausa para pensar', icone: '💭', tom: 'medio', desc: 'frase que parou no meio ou hesitação: termina em "se…", "que…", "é…", "deixa eu ver…"' },
  { id: 'fim_de_frase', rotulo: 'Fim de frase', icone: '✅', tom: 'acento', desc: 'frase completa que afirma, pede, corrige ou responde algo ("pode ser às dez", "o nome dele é Thor", "sem perfume, ele tem alergia", "pode falar")' },
  { id: 'outro', rotulo: 'Outra pessoa', icone: '🔇', tom: 'info', desc: 'fala com outra pessoa da casa, tosse ou barulho ("Júlia, abaixa a TV!")' },
];
const sistema = (texto) => ({ texto, quem: '__sistema', classe: 'sistema' });

export default {
  id: 'agente-voz-turnos',
  titulo: 'Agente de Voz que Sabe Quando Falar',
  emoji: '🎙️',
  categoria: 'voz',
  ordem: 62,
  resumo: 'O agente de voz espera quando você pensa, segue quando você diz "uhum" e para quando você diz "peraí".',
  descricao: 'Cada pedaço de fala vai ao Jev, que decide em ~0,3 s se a pessoa terminou e que tipo de som foi aquilo: concordância, interrupção, pergunta, pausa para pensar ou fim de frase. É o que separa um agente que atropela o cliente de um que conversa.',
  marcas: ['imediato', 'limiar'],
  motor: 'conversa',
  tema: { acento: '#c084fc', acento2: '#f0abfc' },

  contexto: {
    negocio: 'Pet Shop Bicho Feliz (fictício): agendamento de banho e tosa por voz',
    canal: 'ligação; a fala do cliente chega transcrita em pedaços, a cada pausa da voz',
    regra: 'O agente só fala quando a pessoa terminou. "Uhum" não interrompe o agente; "peraí" interrompe na hora.',
  },

  decisoes: [
    {
      id: 'tipo_som', tipo: 'choice', papel: 'destaque', titulo: 'Tipo de som',
      pergunta: 'Que tipo de som é a fala atual do cliente, pensando no que o agente de voz deve fazer agora? Leve em conta o que o agente vinha falando: "uhum" enquanto ele explica é concordância; "peraí" é interrupção; uma palavra só que responde à pergunta do agente (como um nome) é fim de frase.',
      opcoes: TIPOS,
    },
    {
      id: 'terminou_de_falar', tipo: 'noul', titulo: 'Terminou?', rotuloSim: 'vez do agente', rotuloNao: 'esperar', tom: 'bom', limiar: 0.5,
      pergunta: 'O cliente TERMINOU o que queria dizer e agora espera o agente falar? Regra: a resposta é SIM sempre que a fala é uma frase completa: pergunta, pedido, correção, resposta à pergunta do agente (mesmo de uma palavra só) ou "pode falar". A resposta é NÃO só nestes casos: (1) a frase parou no meio ("eu queria saber se…"); (2) hesitação ("é…", "deixa eu ver"); (3) sinal de que só está ouvindo ("uhum", "sei"); (4) interrupção curta para tomar a palavra ("peraí", "não, não"); (5) fala dirigida a outra pessoa da casa.',
    },
  ],

  conversa: {
    skin: 'ligacao',
    titulo: 'Bicho Feliz · agente de voz',
    subtitulo: 'o Jev decide a vez de falar',
    avatar: '🐾',
    abertura: '🎧 Cada pedaço de fala chega quando a voz do cliente pausa. O Jev decide o que o agente faz.',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🙂', lado: 'esq' },
      bot: { nome: 'Agente de voz', avatar: '🐾', lado: 'dir' },
    },
    analisar: ['cliente'],
    voce: 'cliente',
    placeholder: 'Fale um pedaço (ex.: "então eu queria…" ou "uhum")',
    tituloPlacar: 'Turno agora',
    selo(resp) {
      const t = TIPOS.find((x) => x.id === (resp.tipo_som && resp.tipo_som.choice));
      return t ? { texto: t.rotulo, tom: t.tom, icone: t.icone } : null;
    },
    responder(resp, fala) {
      const tipo = resp.tipo_som && resp.tipo_som.choice;
      if (resp.terminou_de_falar && resp.terminou_de_falar.noul >= 0.5) {
        return { texto: FALA_DO_AGENTE[fala.texto] || '(Aqui entra a resposta do seu agente: o Jev só decidiu que agora é a vez dele.)', marca: '🎙 vez do agente' };
      }
      if (tipo === 'interrupcao') return sistema('✋ [o agente para de falar na hora e escuta]');
      if (tipo === 'outro') return sistema('🔇 [o agente espera: a fala era para outra pessoa]');
      if (tipo === 'concordancia') {
        const segue = FALA_DO_AGENTE[fala.texto];
        return [sistema(`▶ [o agente continua: "${fala.texto}" é só concordância]`), ...(segue ? [segue] : [])];
      }
      return sistema('⏸ [o agente espera: a frase ainda não acabou]');
    },
  },

  roteiros: ROTEIROS,
};

// Playground do Jev — monte o estado e as perguntas sem código, veja as probabilidades e leve o código pronto.
// Para adaptar: acrescente presets com os casos do seu negócio.
export default {
  id: 'playground',
  titulo: 'Playground do Jev',
  emoji: '🛝',
  categoria: 'construtores',
  ordem: 46,
  resumo: 'Monte perguntas sem código, veja as probabilidades do Jev e leve o código pronto (curl, JavaScript, Python).',
  descricao: 'O Jev recebe um estado (os dados) e perguntas tipadas: choice (escolher uma opção), score (nota numa escala) e noul (sim ou não). Aqui você monta tudo isso na tela, testa e copia o código para o seu projeto. É a porta de entrada para todos os outros apps.',
  marcas: ['imediato'],
  motor: 'laboratorio',
  tema: { acento: '#f59e0b', acento2: '#ef4444' },
  decisoes: [],

  laboratorio: {
    pausa: 3400,
    presets: [
      {
        titulo: 'Triagem de mensagem',
        state: { canal: 'WhatsApp de uma escola de inglês', mensagem: 'Oi! Minha filha tem 12 anos, vocês têm turma à tarde? Quanto custa?' },
        questions: {
          intencao: { type: 'choice', instructions: 'Qual a intenção da mensagem?', criteria: { matricula: 'quer matricular ou saber preço e horários', suporte: 'já é aluno e precisa de ajuda', financeiro: 'boleto ou pagamento', outro: 'outro assunto' } },
          urgencia: { type: 'score', instructions: 'Quão rápido a escola deve responder?', criteria: ['pode esperar', 'hoje', 'agora'] },
          lead_quente: { type: 'noul', instructions: 'É um lead com boa chance de virar matrícula?' },
        },
      },
      {
        titulo: 'Nota de um lead B2B',
        state: { empresa: 'Transportadora com 140 caminhões', mensagem: 'Queremos automatizar o atendimento aos motoristas e o rastreio. Temos verba aprovada para este trimestre e preciso de uma proposta até sexta.' },
        questions: {
          orcamento: { type: 'noul', instructions: 'A mensagem indica orçamento aprovado?' },
          prazo: { type: 'score', instructions: 'Quão urgente é a compra?', criteria: ['sem prazo', 'este ano', 'este trimestre', 'esta semana'] },
          proximo_passo: { type: 'choice', instructions: 'Qual o melhor próximo passo comercial?', criteria: { reuniao: 'agendar reunião com o comercial', proposta: 'mandar proposta direto', material: 'mandar material de estudo', descartar: 'não é cliente' } },
        },
      },
      {
        titulo: 'Moderação de comentário',
        state: 'Comentário num vídeo: "kkkk esse cara não sabe nada, volta pra escola, palhaço"',
        questions: {
          acao: { type: 'choice', instructions: 'O que fazer com este comentário?', criteria: { publicar: 'normal, pode publicar', ocultar: 'ofensivo ou ataque pessoal', revisar: 'na dúvida, uma pessoa decide' } },
          toxicidade: { type: 'score', instructions: 'Quão tóxico é o comentário?', criteria: ['nada', 'leve', 'ofensivo', 'muito ofensivo'] },
        },
      },
    ],
  },
};

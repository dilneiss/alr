// Cache Semântico — cada pergunta que chega é comparada com as respostas já guardadas: se uma serve inteira, sai do cache na hora.
// Para adaptar: troque contexto.cache pelas perguntas e respostas do seu atendimento (as raias saem dela) e as perguntas de exemplo.
const LIMIAR = 0.8; // abaixo desta confiança a pergunta não usa o cache: vai para o LLM
const ICONES = ['↩️', '✖️', '🎓', '🧾', '⏳', '📱', '💾', '💾', '💾', '💾'];
const CORES = ['#f472b6', '#f87171', '#a78bfa', '#fb923c', '#60a5fa', '#34d399', '#e879f9', '#facc15', '#2dd4bf', '#94a3b8'];

// resposta servida do cache? (mesma regra das raias: escolheu uma guardada e com confiança alta)
function doCache(resp) {
  const a = resp && resp.mesma;
  if (!a || !a.probabilities || a.choice === 'nova') return false;
  return Math.max(...Object.values(a.probabilities)) >= LIMIAR;
}

export default {
  id: 'cache-semantico',
  titulo: 'Cache Semântico',
  emoji: '💾',
  categoria: 'construtores',
  ordem: 51,
  resumo: 'Cada pergunta que chega é comparada com as já respondidas: se uma resposta guardada serve inteira, ela sai na hora, sem chamar o LLM.',
  descricao: 'Embedding acha perguntas "parecidas", e é aí que o cache erra: "prazo para pedir reembolso" e "quanto tempo demora o reembolso" são vizinhas e pedem respostas diferentes. O Jev decide se a resposta guardada responde a nova pergunta por inteiro; na dúvida, a pergunta vai para o LLM.',
  marcas: ['imediato', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#2c7a8c', acento2: '#7fd1b9' },
  origem: 'nossa sonda: 6 de 6 pares certos (paráfrases e armadilhas)',
  tarefa: 'decidir se uma resposta já guardada no cache responde a pergunta nova por inteiro, sem mudar nada',

  contexto: {
    atendimento: 'chat do site da Escola Trilha Criativa, cursos online de design e fotografia',
    cache: [
      { id: 'reembolso', curto: 'Prazo do reembolso', pergunta: 'Qual o prazo para pedir reembolso?', resposta: 'Você pode pedir o reembolso em até 7 dias corridos depois da compra, em Minha conta › Pedidos.' },
      { id: 'cancelar', curto: 'Cancelar assinatura', pergunta: 'Como cancelo minha assinatura?', resposta: 'Em Minha conta › Assinatura › Cancelar. O acesso continua até o fim do período já pago.' },
      { id: 'certificado', curto: 'Tem certificado?', pergunta: 'O curso tem certificado?', resposta: 'Sim. O certificado digital sai automaticamente quando você conclui 100% das aulas.' },
      { id: 'boleto', curto: 'Pagar no boleto', pergunta: 'Posso pagar no boleto?', resposta: 'Sim, à vista no boleto. O acesso é liberado em até 2 dias úteis depois do pagamento.' },
      { id: 'acesso', curto: 'Tempo de acesso', pergunta: 'Por quanto tempo tenho acesso às aulas?', resposta: 'Você tem 12 meses de acesso a todas as aulas, contados da data da compra.' },
      { id: 'celular', curto: 'Assistir no celular', pergunta: 'Dá para assistir às aulas pelo celular?', resposta: 'Sim, pelo navegador do celular ou pelo nosso app, com a mesma conta.' },
    ],
  },

  decisoes: [
    {
      id: 'mesma', tipo: 'choice', titulo: 'Resposta guardada',
      pergunta: 'Esta pergunta nova pode receber uma resposta JÁ GUARDADA no cache, sem mudar nada? Escolha a pergunta guardada só se a resposta guardada responder a pergunta nova por inteiro. Se a pergunta nova pede outra coisa (outro prazo, outra forma de pagamento, outro detalhe, outra situação), escolha "nova".',
      // as raias saem do contexto: uma por pergunta guardada + "nova"
      opcoes: (ctx) => [
        ...ctx.cache.map((c, i) => ({ id: c.id, rotulo: c.curto, icone: ICONES[i] || '💾', cor: CORES[i] || '#94a3b8', desc: `pergunta guardada: "${c.pergunta}" — resposta guardada: "${c.resposta}"` })),
        { id: 'nova', rotulo: 'Nova → LLM', icone: '✨', cor: '#22d3ee', desc: 'nenhuma resposta guardada responde por inteiro: a pergunta pede outra informação, outro caso ou outro detalhe, e vai para o LLM' },
      ],
    },
  ],

  fluxo: {
    colunas: 'mesma',
    rotuloItem: 'Pergunta nova',
    rotuloFila: 'Perguntas chegando',
    lote: 2,
    ritmo: 2600,
    humano: { limiar: LIMIAR, rotulo: 'Na dúvida → LLM', icone: '🤔' },
    cartao: { titulo: 'pergunta', subtitulo: 'quem', meta: 'hora', avatar: 'avatar' },
    entrada: { placeholder: 'Escreva uma pergunta de aluno (ex.: "o certificado tem carga horária?") e veja se sai do cache…', botao: 'Perguntar' },
    rotuloFeitos: 'perguntas',
  },
  textoItem: (item) => item.pergunta,

  cartaoExtra(item, resp) {
    const a = resp && resp.mesma;
    if (!a) return '';
    if (doCache(resp)) return '<span class="mj-chip bom">💾 servida do cache</span>';
    if (a.choice === 'nova') return '<span class="mj-chip info">✨ o LLM responde</span>';
    return '<span class="mj-chip medio">🤔 o LLM confere</span>';
  },

  aoDecidir(item, resp, extra) {
    extra.total = (extra.total || 0) + 1;
    if (doCache(resp)) extra.cache = (extra.cache || 0) + 1;
  },

  resumoExtra(extra) {
    if (!extra.total) return [];
    const c = extra.cache || 0;
    return [
      { rotulo: 'servido do cache', valor: `${Math.round((c / extra.total) * 100)}% (${c} de ${extra.total})` },
      { rotulo: 'chamadas de LLM evitadas', valor: String(c) },
    ];
  },

  // em pares: a paráfrase e a armadilha do mesmo assunto chegam juntas
  dados: [
    { id: 'q1', pergunta: 'até quando eu posso pedir meu dinheiro de volta?', quem: 'Carla', hora: '09:02', avatar: '👩', esperado: { mesma: 'reembolso' } },
    { id: 'q2', pergunta: 'quanto tempo demora pra cair o reembolso no cartão?', quem: 'Rafael', hora: '09:04', avatar: '🧔', esperado: { mesma: 'nova' } },
    { id: 'q3', pergunta: 'quero cancelar o plano, como faz?', quem: 'Juliana', hora: '09:07', avatar: '👩‍🦱', esperado: { mesma: 'cancelar' } },
    { id: 'q4', pergunta: 'se eu cancelar, perco o certificado dos cursos que já terminei?', quem: 'Marcos', hora: '09:09', avatar: '👨', esperado: { mesma: 'nova' } },
    { id: 'q5', pergunta: 'dá certificado no final?', quem: 'Patrícia', hora: '09:12', avatar: '👩‍🦰', esperado: { mesma: 'certificado' } },
    { id: 'q6', pergunta: 'o certificado é reconhecido pelo MEC?', quem: 'Diego', hora: '09:15', avatar: '🧑', esperado: { mesma: 'nova' } },
    { id: 'q7', pergunta: 'aceita boleto bancário?', quem: 'Sônia', hora: '09:18', avatar: '👵', esperado: { mesma: 'boleto' } },
    { id: 'q8', pergunta: 'posso parcelar no boleto?', quem: 'Thiago', hora: '09:20', avatar: '🧑‍🦱', esperado: { mesma: 'nova' } },
    { id: 'q9', pergunta: 'o acesso às aulas expira?', quem: 'Larissa', hora: '09:23', avatar: '👩‍🎓', esperado: { mesma: 'acesso' } },
    { id: 'q10', pergunta: 'dá pra renovar o acesso depois dos 12 meses?', quem: 'Bruno', hora: '09:25', avatar: '👨‍💼', esperado: { mesma: 'nova' } },
    { id: 'q11', pergunta: 'consigo ver as aulas no celular, no ônibus? 🚌', quem: 'Fernanda', hora: '09:28', avatar: '👩‍💻', esperado: { mesma: 'celular' } },
    { id: 'q12', pergunta: 'tem como baixar as aulas pra ver offline no celular?', quem: 'Caio', hora: '09:31', avatar: '🧑‍🎤', esperado: { mesma: 'nova' } },
    { id: 'q13', pergunta: 'comprei ontem e me arrependi, ainda dá tempo de devolver?', quem: 'Renata', hora: '09:34', avatar: '👩‍🏫', esperado: { mesma: 'reembolso' } },
    { id: 'q14', pergunta: 'paguei o boleto ontem e ainda não liberou, é normal?', quem: 'Otávio', hora: '09:36', avatar: '👴', esperado: { mesma: 'boleto' } },
    { id: 'q15', pergunta: 'como faço pra parar de ser cobrado todo mês?', quem: 'Aline', hora: '09:39', avatar: '👩‍🔧', esperado: { mesma: 'cancelar' } },
    { id: 'q16', pergunta: 'posso pedir reembolso mesmo já tendo assistido metade do curso?', quem: 'Gustavo', hora: '09:41', avatar: '🧑‍🔬' },
  ],
};

// Política do Copiloto de Vendas: o Jev lê a conversa (últimas falas + a fala atual do cliente) e escolhe/estima.
// Todo texto mostrado ao vendedor (títulos, frases sugeridas, dicas) é escrito aqui — o Jev só escolhe qual usar.
import { top } from '../../shared/server/kit.mjs';

export const PRODUTO = 'Atendix — atendente de IA para WhatsApp que responde clientes 24 h por dia, entende áudio e agenda sozinho. ' +
  'Plano Pro R$ 1.490/mês (anual: R$ 1.190/mês). Piloto de 14 dias sem custo, implantação em 3 dias pela equipe da Atendix e garantia de 30 dias.';

export const OBJECOES = {
  nenhuma: { label: 'Sem objeção', icone: '✅', cor: '#34d399',
    criterio: 'Nenhuma objeção nesta fala: o cliente concorda, cumprimenta, faz perguntas (inclusive sobre preço, prazo ou condições), descreve a situação dele ou demonstra interesse' },
  preco: { label: 'Preço', icone: '💸', cor: '#f87171',
    criterio: 'Preço: acha caro, compara com um valor menor, diz que não cabe no orçamento ou pede desconto (só perguntar quanto custa não é objeção)' },
  tempo_prioridade: { label: 'Tempo / prioridade', icone: '⏱️', cor: '#fb923c',
    criterio: 'Tempo ou prioridade: diz que está sem tempo, com pressa, ocupado, ou que isso não é prioridade' },
  confianca_no_resultado: { label: 'Confiança no resultado', icone: '🤨', cor: '#fbbf24',
    criterio: 'Confiança no resultado: duvida que funcione, desconfia dos números ou já se frustrou com ferramentas parecidas' },
  precisa_consultar_socio: { label: 'Precisa consultar o sócio', icone: '👥', cor: '#a78bfa',
    criterio: 'Precisa consultar alguém: sócio, chefe, diretoria ou outra pessoa decide ou precisa aprovar' },
  ja_usa_concorrente: { label: 'Já usa concorrente', icone: '🥊', cor: '#f472b6',
    criterio: 'Já usa concorrente: já tem outra ferramenta, sistema ou fornecedor que faz isso' },
  nao_entendeu_valor: { label: 'Não entendeu o valor', icone: '❓', cor: '#60a5fa',
    criterio: 'Não entendeu o valor: não vê para que serve, acha que não precisa ou confunde o produto' },
  momento_ruim: { label: 'Momento ruim', icone: '📅', cor: '#22d3ee',
    criterio: 'Momento ruim: diz que agora não é o momento, pede para falar depois ou cita mudança, crise, obra ou equipe sobrecarregada' },
};

export const ESTAGIOS = {
  abertura: { label: 'Abertura', criterio: 'Abertura: cumprimentos, apresentação e combinados sobre a conversa' },
  descoberta: { label: 'Descoberta', criterio: 'Descoberta: o vendedor pergunta e o cliente conta como funciona hoje, as dores e os números' },
  apresentacao: { label: 'Apresentação', criterio: 'Apresentação: o vendedor mostra a solução, funcionalidades, casos e como resolve a dor' },
  negociacao: { label: 'Negociação', criterio: 'Negociação: discutem preço, condições, plano, objeções, piloto, garantia ou quem decide' },
  fechamento: { label: 'Fechamento', criterio: 'Fechamento: o cliente aceita, combina o início, pede contrato ou confirma um próximo passo concreto com data' },
};
export const ORDEM_ESTAGIOS = Object.keys(ESTAGIOS);

export const SENTIMENTO = [
  { label: 'Muito negativo', criterio: 'Muito negativo: irritado, hostil ou decidido a não comprar' },
  { label: 'Negativo', criterio: 'Negativo: desconfiado, incomodado ou resistente' },
  { label: 'Neutro', criterio: 'Neutro: objetivo, sem emoção clara' },
  { label: 'Positivo', criterio: 'Positivo: interessado, receptivo, fazendo perguntas' },
  { label: 'Muito positivo', criterio: 'Muito positivo: animado, convencido, querendo começar' },
];

// Battlecards: o que o vendedor deve fazer/dizer agora.
export const CARDS = {
  roi_30_dias: { icone: '💸', titulo: 'Mostre o ROI em 30 dias',
    criterio: 'Cliente acha caro, mas vê valor: mostrar a conta do retorno (ROI) em 30 dias',
    frase: 'Vamos fazer a conta juntos: se o Atendix recuperar só 10 clientes por mês que hoje se perdem fora do horário, ele já se paga. Quantos contatos vocês perdem à noite e no fim de semana?',
    dica: 'Use os números que o próprio cliente falou.' },
  parcelamento: { icone: '💳', titulo: 'Ofereça o plano anual',
    criterio: 'O problema é caber no orçamento ou no caixa agora: oferecer o plano anual mais barato ou parcelamento',
    frase: 'No plano anual o valor cai para R$ 1.190 por mês, e você começa pagando só a primeira parcela. Assim cabe no caixa deste trimestre.',
    dica: 'Mude a conversa de "preço" para "fluxo de caixa".' },
  case_parecido: { icone: '🏆', titulo: 'Conte um caso parecido',
    criterio: 'Cliente quer prova ou exemplo real, ou está entre curioso e desconfiado: contar um caso de cliente parecido, com números',
    frase: 'Uma rede com 4 unidades estava igual a vocês. Em 60 dias, 38% dos agendamentos passaram a vir do WhatsApp fora do horário comercial. Posso te mandar o estudo de caso?',
    dica: 'Caso do mesmo setor e do mesmo porte convence mais.' },
  quem_mais_decide: { icone: '👥', titulo: 'Mapeie quem mais decide',
    criterio: 'Outra pessoa decide ou precisa aprovar (sócio, chefe, diretoria): descobrir quem decide e marcar conversa com essa pessoa',
    frase: 'Faz todo sentido. Além do seu sócio, mais alguém participa da decisão? Que tal marcarmos 20 minutos com ele ainda esta semana, para eu responder às dúvidas dele direto?',
    dica: 'Não deixe o cliente "vender por você" para o sócio.' },
  piloto_14_dias: { icone: '🧪', titulo: 'Proponha o piloto de 14 dias',
    criterio: 'Cliente cético, duvida do resultado ou tem medo de errar de novo: propor um piloto de 14 dias sem custo',
    frase: 'Que tal testar sem compromisso? Colocamos o Atendix numa unidade por 14 dias, sem custo. Se não aumentar os agendamentos, você não paga nada.',
    dica: 'Tire o risco da mesa: o cliente decide com dados dele.' },
  tabela_concorrente: { icone: '📊', titulo: 'Compare com o concorrente',
    criterio: 'Cliente já usa uma ferramenta concorrente: comparar lado a lado e mostrar a diferença principal',
    frase: 'Posso te mostrar lado a lado? A diferença principal é que o Atendix conversa livremente, entende áudio e agenda sozinho, sem menu de opções. E a migração é feita por nós.',
    dica: 'Nunca fale mal do concorrente; mostre a diferença.' },
  garantia: { icone: '🛡️', titulo: 'Reforce a garantia de 30 dias',
    criterio: 'Cliente teme o risco do compromisso ou do contrato: reforçar a garantia de 30 dias',
    frase: 'E você tem 30 dias de garantia: se não gostar, devolvemos 100% do valor. O risco fica todo com a gente.',
    dica: 'Garantia funciona melhor depois que o valor ficou claro.' },
  pergunta_aberta: { icone: '❓', titulo: 'Faça uma pergunta aberta',
    criterio: 'Começo da conversa, cliente vago ou falta informação sobre a situação dele: fazer uma pergunta aberta de descoberta',
    frase: 'Me conta: hoje, o que acontece com uma mensagem que chega no WhatsApp às dez da noite?',
    dica: 'Quem pergunta conduz. Deixe o cliente falar 70% do tempo.' },
  conectar_dor: { icone: '🔗', titulo: 'Conecte a dor à solução',
    criterio: 'Cliente acabou de descrever uma dor, um problema ou um número da operação dele: conectar essa dor à solução',
    frase: 'Isso que você falou, de perder cliente fora do horário, é exatamente o que o Atendix resolve: ele responde na hora, tira as dúvidas e já agenda.',
    dica: 'Repita as palavras do cliente, não as do folheto.' },
  resumir_valor: { icone: '🎯', titulo: 'Resuma o valor em uma frase',
    criterio: 'Cliente não entendeu para que serve, acha que não precisa ou confunde o produto: resumir o valor em uma frase',
    frase: 'Resumindo: o Atendix responde seus clientes em segundos, 24 horas por dia, e já marca na agenda. Você para de perder cliente para quem responde primeiro.',
    dica: 'Uma frase, um benefício, sem jargão.' },
  urgencia_real: { icone: '⏳', titulo: 'Mostre o custo de esperar',
    criterio: 'Cliente diz que agora não é o momento ou quer adiar: mostrar o custo real de esperar',
    frase: 'Entendo. Só para dimensionar: cada mês sem responder à noite são dezenas de clientes que fecham com quem respondeu primeiro. Esperar três meses custa mais do que o próprio sistema.',
    dica: 'Urgência com números do cliente, nunca com pressão.' },
  validar_e_ouvir: { icone: '🤝', titulo: 'Valide e deixe o cliente falar',
    criterio: 'Cliente irritado, com pressa, impaciente ou incomodado com a ligação: validar o sentimento, respeitar o tempo e deixar o cliente falar',
    frase: 'Faz sentido. Prometo ser objetivo: me conta em uma frase o que mais te incomoda hoje no atendimento, e eu te digo em dois minutos se a gente resolve ou não.',
    dica: 'Respeitar o tempo do cliente gera confiança.' },
  fechamento_direto: { icone: '✅', titulo: 'Parta para o fechamento',
    criterio: 'Cliente dá sinais claros de compra (pergunta como começar, quer contrato, prazo de início ou aceita a proposta): partir para o fechamento',
    frase: 'Pelo que você me disse, faz sentido começar já. Posso te mandar o contrato agora para começarmos a implantação na segunda-feira?',
    dica: 'Sinal de compra não se discute: feche e combine a data.' },
  proximo_passo_agenda: { icone: '📅', titulo: 'Marque o próximo passo',
    criterio: 'Conversa vai bem ou o cliente aceitou avançar, mas a decisão final depende de outra reunião: marcar um próximo passo concreto com data',
    frase: 'Vamos deixar marcado: quinta às 10h eu mostro o piloto configurado com os dados de vocês. Pode ser?',
    dica: 'Saia da ligação com data e hora, nunca com "vamos nos falando".' },
};

function mapObj(o, f) { return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)])); }

export const QUESTIONS = {
  objecao: { type: 'choice', instructions: 'Qual objeção o cliente levanta na FALA ATUAL? Use o histórico só como contexto; se a fala atual não traz objeção, escolha nenhuma.', criteria: mapObj(OBJECOES, (o) => o.criterio) },
  sinal_compra: { type: 'noul', instructions: 'A fala atual do cliente mostra sinal de compra (pergunta como começar, prazo, contrato, forma de pagamento, aceita a proposta ou demonstra entusiasmo em avançar)?',
    criteria: { true: 'Mostra sinal de compra', false: 'Não mostra sinal de compra' } },
  sentimento: { type: 'score', instructions: 'Qual o sentimento do cliente em relação à compra, nesta fala?', criteria: SENTIMENTO.map((s) => s.criterio) },
  estagio: { type: 'choice', instructions: 'Em que estágio a conversa de vendas está neste momento, considerando o histórico e a fala atual?', criteria: mapObj(ESTAGIOS, (e) => e.criterio) },
  proximo_passo: { type: 'choice', instructions: 'O que o vendedor deve fazer AGORA, logo depois desta fala do cliente, para avançar a venda?', criteria: mapObj(CARDS, (c) => c.criterio) },
  risco_perder: { type: 'noul', instructions: 'Neste momento da conversa, há risco real de perder esta venda?',
    criteria: { true: 'Há risco real de perder a venda agora', false: 'A venda não corre risco agora' } },
  chance_fechar: { type: 'noul', instructions: 'Considerando a conversa inteira até aqui, o cliente vai fechar negócio (aceitar a proposta ou começar o piloto) ao final desta ligação?',
    criteria: { true: 'Vai fechar ou começar o piloto', false: 'Não vai fechar nesta ligação' } },
};
export const N_PERGUNTAS = Object.keys(QUESTIONS).length;

export const LIMITES = { fala: 600, historico: 6, falaMin: 2 };

// historico: [{quem:'vendedor'|'cliente', fala}] (já limitado às últimas N falas); fala: fala atual do cliente.
export function buildState(historico, fala, parcial) {
  const st = {
    ligacao: 'Ligação de vendas B2B. Produto: ' + PRODUTO,
    historico_recente: historico.map((h) => ({ quem: h.quem === 'vendedor' ? 'Vendedor' : 'Cliente', fala: h.fala })),
    fala_atual_do_cliente: fala,
  };
  if (parcial) st.observacao = 'O cliente ainda está falando: a fala atual pode estar incompleta.';
  return st;
}

const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const roundProbs = (o) => mapObj(o || {}, (v) => round(v));

export function interpretar(a) {
  const ob = a.objecao, es = a.estagio, pp = a.proximo_passo;
  const sNivel = Math.max(0, Math.min(4, Math.round(a.sentimento.score)));
  const pOb = ob.probabilities?.[ob.choice] ?? ob.confidence ?? 0;
  const card = CARDS[pp.choice] ? pp.choice : top(pp.probabilities)[0]?.[0];
  return {
    objecao: {
      escolha: ob.choice, label: OBJECOES[ob.choice]?.label || ob.choice, icone: OBJECOES[ob.choice]?.icone || '❔',
      p: round(pOb), detectada: ob.choice !== 'nenhuma' && pOb >= 0.5, probabilidades: roundProbs(ob.probabilities),
    },
    sinal_compra: round(a.sinal_compra?.noul ?? 0),
    sentimento: { score: round(a.sentimento.score, 3), nivel: sNivel, label: SENTIMENTO[sNivel].label, probabilidades: roundProbs(a.sentimento.probabilities) },
    estagio: { escolha: es.choice, label: ESTAGIOS[es.choice]?.label || es.choice, idx: Math.max(0, ORDEM_ESTAGIOS.indexOf(es.choice)), p: round(es.probabilities?.[es.choice] ?? 0), probabilidades: roundProbs(es.probabilities) },
    proximo_passo: {
      escolha: card, ...pick(CARDS[card]), confianca: round(pp.probabilities?.[card] ?? pp.confidence ?? 0),
      ranking: top(pp.probabilities).slice(0, 3).map(([id, p]) => ({ id, titulo: CARDS[id]?.titulo || id, icone: CARDS[id]?.icone || '💡', p: round(p) })),
    },
    risco_perder: round(a.risco_perder?.noul ?? 0),
    chance_fechar: round(a.chance_fechar?.noul ?? 0),
  };
}
function pick(c) { return c ? { icone: c.icone, titulo: c.titulo, frase: c.frase, dica: c.dica } : {}; }

export function normalizarHistorico(h) {
  if (!Array.isArray(h)) return [];
  return h.slice(-LIMITES.historico).map((x) => ({
    quem: x && x.quem === 'vendedor' ? 'vendedor' : 'cliente',
    fala: String((x && x.fala) || '').replace(/\s+/g, ' ').trim().slice(0, LIMITES.fala),
  })).filter((x) => x.fala);
}

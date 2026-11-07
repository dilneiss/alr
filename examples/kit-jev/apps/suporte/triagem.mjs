// Política de triagem da Central de Suporte (escola fictícia "Sinapse").
// Os critérios abaixo SÃO a política: o Jev lê o ticket e escolhe/pontua; todo texto exibido é nosso.
import { top } from '../../shared/server/kit.mjs';

export const EMPRESA = 'Sinapse — escola online de IA (cursos gravados, aulas ao vivo e comunidade). ' +
  'Política: reembolso integral em até 7 dias após a compra (garantia); depois disso, o reembolso passa por análise do financeiro.';

export const CANAIS = { email: 'E-mail', whatsapp: 'WhatsApp', instagram: 'Instagram' };

export const DEPARTAMENTOS = {
  financeiro: { label: 'Financeiro', curto: 'Financeiro', icone: '💰', cor: '#34d399',
    criterio: 'Financeiro: cobrança duplicada ou indevida, estorno, reembolso (inclusive quando vem junto com um cancelamento), pagamento recusado, boleto, troca de cartão, valor de renovação e nota fiscal' },
  acesso_tecnico: { label: 'Acesso e técnico', curto: 'Acesso', icone: '🔧', cor: '#22d3ee',
    criterio: 'Acesso e técnico: não consegue entrar, senha, autenticação, e-mail de cadastro, acesso não liberado após pagar, plataforma/app/vídeo com erro ou fora do ar, progresso sumido' },
  conteudo_pedagogico: { label: 'Conteúdo pedagógico', curto: 'Conteúdo', icone: '🎓', cor: '#a78bfa',
    criterio: 'Conteúdo pedagógico: dúvidas sobre aulas, exercícios e projetos, trilha de estudos, materiais, certificado, prazos de entrega, mentoria e comentários sobre o conteúdo' },
  comercial_upgrade: { label: 'Comercial', curto: 'Comercial', icone: '🚀', cor: '#f472b6',
    criterio: 'Comercial: quer comprar, fazer upgrade ou mudar de plano, preço, parcelamento, desconto, bolsa, planos para empresas e equipes, licenças adicionais' },
  retencao_cancelamento: { label: 'Retenção', curto: 'Retenção', icone: '🧲', cor: '#fb923c',
    criterio: 'Retenção: quer cancelar, pausar ou não renovar a assinatura, ou diz que está pensando em sair (sem pedir dinheiro de volta)' },
  parcerias_imprensa: { label: 'Parcerias e imprensa', curto: 'Parcerias', icone: '🤝', cor: '#fbbf24',
    criterio: 'Parcerias e imprensa: jornalistas, entrevistas, podcasts, influenciadores, afiliados, co-marketing e propostas de parceria' },
  outro: { label: 'Outro', curto: 'Outro', icone: '📥', cor: '#9ca3af',
    criterio: 'Outro: spam, propaganda de terceiros, engano de número, cumprimento solto sem pedido, agradecimento sem pedido ou assunto sem relação com a escola' },
};

export const PRIORIDADES = [
  { p: 'P4', label: 'Baixa', sla: '48 h', criterio: 'P4 · Baixa: dúvida, sugestão, elogio, spam ou pedido sem prazo; nada está bloqueado e não há dinheiro em jogo' },
  { p: 'P3', label: 'Normal', sla: '24 h', criterio: 'P3 · Normal: problema com contorno ou pedido administrativo simples (nota fiscal, troca de e-mail, certificado, pausa, cancelamento educado), sem prazo apertado' },
  { p: 'P2', label: 'Alta', sla: '4 h', criterio: 'P2 · Alta: dinheiro em jogo (cobrança errada, reembolso, pagamento recusado), aluno sem acesso ao que pagou, ou prazo nos próximos dias' },
  { p: 'P1', label: 'Urgente', sla: '1 h', criterio: 'P1 · Urgente: cobrança indevida com ameaça de Procon, Reclame Aqui, processo ou exposição nas redes; cliente furioso que já reclamou antes; ou aluno bloqueado com algo que acontece hoje' },
];

export const FRUSTRACAO = [
  { emoji: '😌', label: 'Calmo', criterio: 'Calmo: tom neutro, educado ou positivo' },
  { emoji: '🙂', label: 'Levemente incomodado', criterio: 'Levemente incomodado: relata um problema, mas com paciência' },
  { emoji: '😕', label: 'Frustrado', criterio: 'Frustrado: reclama, demonstra impaciência ou cobra uma solução' },
  { emoji: '😠', label: 'Muito irritado', criterio: 'Muito irritado: tom ríspido, letras maiúsculas, ironia ou diz que já pediu antes' },
  { emoji: '🤬', label: 'Furioso', criterio: 'Furioso: agressivo, ameaça Procon, processo, chargeback ou expor a empresa' },
];

export const SENTIMENTO = [
  { label: 'Muito negativo', criterio: 'Muito negativo: raiva, desprezo ou sensação de ter sido enganado' },
  { label: 'Negativo', criterio: 'Negativo: decepção ou insatisfação' },
  { label: 'Neutro', criterio: 'Neutro: pedido objetivo, sem emoção' },
  { label: 'Positivo', criterio: 'Positivo: cordial, satisfeito ou interessado' },
  { label: 'Muito positivo', criterio: 'Muito positivo: elogio, gratidão ou entusiasmo' },
];

export const SINAIS = {
  pede_reembolso: { label: 'Pede dinheiro de volta', curto: 'reembolso',
    instr: 'O cliente está pedindo dinheiro de volta (reembolso da compra ou estorno de uma cobrança)?',
    criteria: { true: 'Pede reembolso, estorno ou devolução de dinheiro', false: 'Não pede dinheiro de volta' } },
  risco_cancelamento: { label: 'Risco de cancelar', curto: 'cancelamento',
    instr: 'Há risco de este cliente cancelar a assinatura ou deixar a escola?',
    criteria: { true: 'Quer cancelar, pausar, não renovar, ou está insatisfeito a ponto de sair', false: 'Nada indica que vai sair' } },
  precisa_humano: { label: 'Precisa de um humano', curto: 'humano',
    instr: 'Este ticket precisa de um atendente humano sênior (cliente furioso, ameaça pública, exceção à política ou situação que uma resposta pronta não resolve)?',
    criteria: { true: 'Precisa de atenção humana especial', false: 'Uma resposta pronta resolve' } },
  ameaca_publica: { label: 'Ameaça expor ou acionar órgãos', curto: 'Procon/redes',
    instr: 'O cliente ameaça reclamar publicamente ou em órgãos externos (Procon, Reclame Aqui, redes sociais, processo, chargeback)?',
    criteria: { true: 'Ameaça reclamar em público ou em órgãos externos', false: 'Não faz ameaça' } },
};

// Respostas prontas (macros). {nome} = primeiro nome; {plano} = plano do cliente.
export const MACROS = {
  estorno_cobranca: { icone: '💸', titulo: 'Estorno de cobrança duplicada ou indevida',
    criterio: 'Cobrança duplicada ou indevida (cobrado duas vezes, cobrado depois de cancelar, valor errado): confirmar e estornar o valor extra',
    texto: 'Oi, {nome}! Peço desculpas pelo transtorno. Conferi aqui e a cobrança extra foi mesmo um erro nosso — já solicitei o estorno do valor agora há pouco. No cartão, o crédito aparece em até 2 faturas; no PIX, cai em até 3 dias úteis. Vou te enviar o comprovante do estorno por e-mail ainda hoje e sigo acompanhando até o dinheiro voltar.' },
  reembolso_garantia: { icone: '↩️', titulo: 'Reembolso na garantia de 7 dias',
    criterio: 'Quer desistir da compra e ter o dinheiro de volta, com a compra feita há 7 dias ou menos (dentro da garantia): reembolso integral',
    texto: 'Oi, {nome}. Sua compra está dentro da garantia de 7 dias, então o reembolso é integral e sem burocracia. Já iniciei o processo: o valor volta pelo mesmo meio de pagamento em até 10 dias úteis, e você recebe a confirmação por e-mail. Se puder, conta pra gente o que não funcionou para você? Isso nos ajuda a melhorar.' },
  reembolso_analise: { icone: '🧾', titulo: 'Reembolso fora do prazo: análise',
    criterio: 'Pede explicitamente reembolso de uma compra feita há mais de 7 dias (fora da garantia): encaminhar para análise do financeiro',
    texto: 'Oi, {nome}. Entendo a sua situação. Como a compra já passou da garantia de 7 dias, o reembolso passa por uma análise do nosso financeiro — encaminhei o seu caso agora, com prioridade, e você recebe a resposta em até 2 dias úteis. Enquanto isso, se o problema for falta de tempo, posso pausar a sua assinatura por até 60 dias sem custo.' },
  status_reembolso: { icone: '⏳', titulo: 'Status do reembolso em andamento',
    criterio: 'Já pediu reembolso ou estorno antes e o dinheiro ainda não caiu: informar o status e o prazo',
    texto: 'Oi, {nome}, desculpe pela demora e por você ter precisado perguntar de novo. Verifiquei aqui: o seu reembolso já foi aprovado e está em processamento. No PIX, o valor cai em até 2 dias úteis; no cartão, aparece como crédito em até 2 faturas. Vou te enviar o comprovante por e-mail agora e acompanho pessoalmente até cair.' },
  novo_link_pagamento: { icone: '💳', titulo: 'Novo link de pagamento',
    criterio: 'Pagamento recusado, boleto vencido ou quer trocar o cartão da assinatura: enviar um novo link de pagamento',
    texto: 'Oi, {nome}! Gerei um novo link de pagamento para você: é só acessar Minha Conta → Pagamentos → "Gerar novo link". Dá para pagar com PIX (liberação imediata), cartão em até 12x ou boleto (compensa em até 2 dias úteis). Se o cartão for recusado de novo, vale confirmar com o banco se as compras on-line estão liberadas.' },
  nota_fiscal: { icone: '🧾', titulo: 'Nota fiscal',
    criterio: 'Pede nota fiscal, reenvio da nota ou nota no CNPJ de uma empresa',
    texto: 'Oi, {nome}! A nota fiscal é emitida em até 5 dias após a compra e enviada para o e-mail do cadastro. Você também pode baixá-la em Minha Conta → Pagamentos → "Nota fiscal". Se precisar da nota no CNPJ da empresa, é só me enviar a razão social e o CNPJ que eu reemito hoje mesmo.' },
  reenvio_acesso: { icone: '🔑', titulo: 'Reenvio de acesso e nova senha',
    criterio: 'Não recebeu o acesso, esqueceu a senha, perdeu a autenticação, não consegue entrar ou não sabe onde assistir: reenviar o acesso',
    texto: 'Oi, {nome}! Acabei de reenviar o seu acesso para o e-mail do cadastro. Clique em "Criar nova senha" (o link vale por 2 horas) e entre pelo botão "Área do aluno" no nosso site. Se não encontrar o e-mail, confira o spam e a aba Promoções. O seu acesso ao {plano} está ativo e nenhum progresso foi perdido.' },
  troca_email: { icone: '📧', titulo: 'Troca do e-mail de cadastro',
    criterio: 'Quer trocar o e-mail do cadastro ou transferir a conta para outro e-mail',
    texto: 'Oi, {nome}! Consigo trocar o e-mail da sua conta, sim. Por segurança, me confirme os 4 últimos dígitos do cartão usado na compra (ou responda a partir do e-mail antigo) e me informe o novo endereço. A troca é feita em até 1 hora e todo o seu progresso nas aulas continua igual.' },
  bug_tecnico: { icone: '🛠️', titulo: 'Bug encaminhado ao time técnico',
    criterio: 'Erro técnico na plataforma, no app ou num vídeo (trava, cai, fecha sozinho, erro 500, legenda errada, progresso sumiu): registrar e encaminhar ao time técnico',
    texto: 'Oi, {nome}, obrigado por avisar — e desculpe pelo problema. Já registrei o erro para o nosso time técnico com prioridade. Para agilizar, você consegue me mandar um print da tela, o navegador ou aparelho que está usando e o horário aproximado? Te aviso por aqui assim que estiver resolvido.' },
  certificado: { icone: '🎓', titulo: 'Passo a passo do certificado',
    criterio: 'Dúvida sobre como emitir, validar ou usar o certificado',
    texto: 'Oi, {nome}! O certificado é liberado quando você conclui 100% das aulas e o projeto final. Para emitir: Minha Conta → Certificados → "Emitir certificado". Ele sai em PDF com código de verificação, pronto para o LinkedIn. É um certificado de curso livre (não é do MEC), aceito como comprovante de horas por muitas empresas e faculdades.' },
  duvida_aula: { icone: '📚', titulo: 'Dúvida de aula → monitor',
    criterio: 'Dúvida sobre o conteúdo de uma aula, exercício, material ou trilha de estudos: encaminhar ao monitor',
    texto: 'Oi, {nome}! Ótima pergunta. Encaminhei a sua dúvida para o monitor da trilha, que responde em até 24 horas úteis. Dica: poste também no fórum da aula, na comunidade — muita gente passa pela mesma dúvida e as respostas ficam salvas para todo mundo. Bons estudos!' },
  retencao_oferta: { icone: '🧲', titulo: 'Retenção: pausa ou desconto',
    criterio: 'Pensa em cancelar ou pausar por falta de tempo, dinheiro ou motivação, com tom educado: oferecer pausa ou desconto antes de cancelar',
    texto: 'Oi, {nome}, que pena ler isso. Antes de cancelar, posso te oferecer duas opções: pausar a assinatura por até 60 dias sem custo (o seu progresso fica salvo) ou 3 meses com 40% de desconto. Se ainda assim preferir cancelar, eu faço na hora, sem burocracia. O que fica melhor para você?' },
  cancelamento_sem_atrito: { icone: '🚪', titulo: 'Cancelamento imediato, sem oferta',
    criterio: 'Exige o cancelamento ou a não renovação de forma firme ou irritada, ou já pediu antes: cancelar na hora, sem oferta',
    texto: 'Oi, {nome}. Pedido atendido: a sua assinatura foi cancelada agora e nenhuma nova cobrança será feita. Você continua com acesso até o fim do período já pago. Se houve alguma cobrança depois do seu primeiro pedido, ela será estornada automaticamente. Obrigado por ter estudado com a gente.' },
  upgrade_plano: { icone: '🚀', titulo: 'Upgrade ou compra de plano',
    criterio: 'Pessoa física quer comprar, mudar de plano ou fazer upgrade, ou pergunta preço, parcelamento, desconto ou bolsa',
    texto: 'Oi, {nome}! Que bom que você quer ir além. A Formação IA Pro anual libera todas as trilhas, as aulas ao vivo e o certificado. Para quem já é aluno, o valor pago no plano atual é abatido, e dá para parcelar em até 12x no cartão ou pagar com 10% de desconto no PIX. Quer que eu gere o link com essa condição?' },
  proposta_empresas: { icone: '🏢', titulo: 'Proposta para empresas',
    criterio: 'Empresa ou equipe quer várias licenças, turma fechada, nota para CNPJ de treinamento ou adicionar licenças ao plano Equipes',
    texto: 'Oi, {nome}! Temos um plano para equipes com painel de acompanhamento, turmas fechadas e nota fiscal para CNPJ. Para montar a proposta, me conta: quantas pessoas, qual o objetivo principal (ex.: automação, atendimento, dados) e o prazo que vocês têm em mente? Retorno com a proposta em até 1 dia útil.' },
  parceria_imprensa: { icone: '🤝', titulo: 'Encaminhar a parcerias e imprensa',
    criterio: 'Jornalista, podcast, influenciador, afiliado ou empresa propondo parceria: encaminhar ao time de parcerias e imprensa',
    texto: 'Olá, {nome}! Obrigado pelo contato e pelo interesse. Encaminhei a sua mensagem para o nosso time de parcerias e imprensa, que responde em até 2 dias úteis (pautas com prazo curto têm prioridade). Se tiver um mídia kit, uma pauta ou uma apresentação, pode responder com o anexo.' },
  agradecer_feedback: { icone: '💜', titulo: 'Agradecer o elogio',
    criterio: 'Elogio, agradecimento ou história de sucesso, sem pedido de ajuda: agradecer',
    texto: 'Oi, {nome}! Que mensagem boa de receber — muito obrigado! Compartilhei o seu recado com o time de professores, eles vão adorar. Se tiver sugestões de novos temas de aula, é só mandar por aqui. Conte sempre com a gente!' },
  pedir_detalhes: { icone: '💬', titulo: 'Pedir mais detalhes',
    criterio: 'Mensagem vaga, cumprimento solto sem pedido ou mensagem enviada por engano: pedir mais detalhes',
    texto: 'Oi, {nome}! Tudo bem? Aqui é o suporte da Sinapse, escola online de IA. Para eu conseguir te ajudar, pode me contar com um pouco mais de detalhe o que aconteceu ou o que você precisa? Se for sobre acesso, pagamento ou alguma aula, já me diga qual.' },
  arquivar_spam: { icone: '🗑️', titulo: 'Arquivar como spam',
    criterio: 'Spam ou propaganda de terceiros oferecendo serviços (agência, SEO, marketing): arquivar sem responder',
    texto: '(Sem resposta ao remetente: o ticket é arquivado como spam.)' },
  escalar_humano: { icone: '🧑‍💼', titulo: 'Acolher e escalar para especialista',
    criterio: 'Caso sensível ou fora da política (exceção de prazo, situação pessoal delicada, reclamação grave sobre a qualidade): acolher e escalar para um especialista',
    texto: 'Oi, {nome}. Obrigado por explicar com detalhes — o seu caso merece atenção especial. Já passei tudo para um especialista sênior do nosso time, que vai falar com você pessoalmente em até 4 horas úteis. Pode deixar que vamos resolver.' },
};

function mapObj(o, f) { return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)])); }

export const QUESTIONS = {
  departamento: { type: 'choice', instructions: 'Para qual departamento este ticket de suporte deve ser encaminhado?', criteria: mapObj(DEPARTAMENTOS, (d) => d.criterio) },
  prioridade: { type: 'score', instructions: 'Qual a prioridade de atendimento deste ticket, segundo a política da escola?', criteria: PRIORIDADES.map((p) => p.criterio) },
  frustracao: { type: 'score', instructions: 'Quão frustrado ou irritado o cliente está nesta mensagem?', criteria: FRUSTRACAO.map((f) => f.criterio) },
  sentimento: { type: 'score', instructions: 'Qual o sentimento geral do cliente em relação à escola nesta mensagem?', criteria: SENTIMENTO.map((s) => s.criterio) },
  ...mapObj(SINAIS, (s) => ({ type: 'noul', instructions: s.instr, criteria: s.criteria })),
  macro: { type: 'choice', instructions: 'Qual resposta pronta (macro) o atendente deve enviar a este cliente? Escolha a que resolve o pedido principal.', criteria: mapObj(MACROS, (m) => m.criterio) },
};
export const N_PERGUNTAS = Object.keys(QUESTIONS).length;

export const LIMITES = { nome: 60, assunto: 120, texto: 3000, textoMin: 2 };

export function primeiroNome(nome) {
  const n = String(nome || '').trim().replace(/^@/, '');
  if (!n || /agência|agencia|ltda|digital|s\.a\./i.test(n)) return '';
  return n.split(/\s+/)[0];
}

export function preencher(texto, t) {
  const nome = primeiroNome(t.nome);
  const plano = String(t.plano || '').split('(')[0].trim() || 'seu plano';
  let s = texto.replace(/\{plano\}/g, plano);
  s = nome ? s.replace(/\{nome\}/g, nome) : s.replace(/,\s*\{nome\}/g, '').replace(/\s*\{nome\}/g, '');
  return s;
}

// Estado enviado ao Jev: a política da escola + o ticket (sem nada que entregue a resposta).
export function buildState(t) {
  const ticket = { canal: CANAIS[t.canal] || t.canal, cliente: t.nome || 'Cliente', plano: t.plano || 'não informado', cliente_ha: t.cliente_ha || 'não informado' };
  if (t.assunto) ticket.assunto = t.assunto;
  ticket.mensagem = t.texto;
  return { empresa: EMPRESA, ticket };
}

const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const roundProbs = (o) => mapObj(o || {}, (v) => round(v));

// Transforma as respostas do Jev no resultado da triagem mostrado na tela.
export function interpretar(a, t) {
  const dep = a.departamento;
  const nivel = Math.max(0, Math.min(3, Math.round(a.prioridade.score)));
  const pri = PRIORIDADES[nivel];
  const fNivel = Math.max(0, Math.min(4, Math.round(a.frustracao.score)));
  const sNivel = Math.max(0, Math.min(4, Math.round(a.sentimento.score)));
  const ranking = top(a.macro.probabilities).slice(0, 4).map(([id, p]) => ({ id, titulo: MACROS[id]?.titulo || id, icone: MACROS[id]?.icone || '💬', p: round(p), texto: MACROS[id] ? preencher(MACROS[id].texto, t) : '' }));
  const escolha = MACROS[a.macro.choice] ? a.macro.choice : ranking[0]?.id;
  return {
    departamento: { escolha: dep.choice, label: DEPARTAMENTOS[dep.choice]?.label || dep.choice, confianca: round(dep.confidence ?? 0), probabilidades: roundProbs(dep.probabilities) },
    prioridade: { score: round(a.prioridade.score, 3), nivel, p: pri.p, label: pri.label, sla: pri.sla, probabilidades: roundProbs(a.prioridade.probabilities) },
    frustracao: { score: round(a.frustracao.score, 3), nivel: fNivel, emoji: FRUSTRACAO[fNivel].emoji, label: FRUSTRACAO[fNivel].label, probabilidades: roundProbs(a.frustracao.probabilities) },
    sentimento: { score: round(a.sentimento.score, 3), nivel: sNivel, label: SENTIMENTO[sNivel].label, probabilidades: roundProbs(a.sentimento.probabilities) },
    sinais: mapObj(SINAIS, (s, id) => round(a[id]?.noul ?? 0)),
    macro: { escolha, titulo: MACROS[escolha]?.titulo, icone: MACROS[escolha]?.icone, confianca: round(a.macro.confidence ?? 0), texto: preencher(MACROS[escolha]?.texto || '', t), ranking },
  };
}

// Normaliza/valida um ticket escrito pelo usuário.
export function normalizarTicket(raw) {
  const t = raw && typeof raw === 'object' ? raw : {};
  const texto = String(t.texto || '').replace(/\s+\n/g, '\n').trim();
  const out = {
    nome: String(t.nome || '').trim().slice(0, LIMITES.nome),
    canal: CANAIS[t.canal] ? t.canal : 'email',
    assunto: String(t.assunto || '').trim().slice(0, LIMITES.assunto),
    plano: String(t.plano || '').trim().slice(0, 80),
    cliente_ha: String(t.cliente_ha || '').trim().slice(0, 30),
    texto,
  };
  if (!out.assunto) delete out.assunto;
  return out;
}

// ---------- triagem em lote (backlog) ----------
// Vários tickets no mesmo estado, 3 perguntas por ticket (departamento, prioridade, pede reembolso) numa só chamada.
// Medido nos 60 tickets semente: departamento idêntico à triagem individual em 60/60; prioridade idêntica em 55/60.
export const LOTE = { max: 48, porChamada: 12, perguntasPorTicket: 3 };

function ticketNoLote(t) {
  const o = { canal: CANAIS[t.canal] || t.canal, cliente: t.nome, plano: t.plano || 'não informado', cliente_ha: t.cliente_ha || 'não informado' };
  if (t.assunto) o.assunto = t.assunto;
  o.mensagem = t.texto;
  return o;
}
export function buildStateLote(tickets) {
  return { empresa: EMPRESA, tickets: Object.fromEntries(tickets.map((t) => [t.id, ticketNoLote(t)])) };
}
export function questionsLote(tickets) {
  const q = {};
  for (const t of tickets) {
    q[`${t.id}_departamento`] = { ...QUESTIONS.departamento, instructions: `Ticket ${t.id}: para qual departamento este ticket de suporte deve ser encaminhado?` };
    q[`${t.id}_prioridade`] = { ...QUESTIONS.prioridade, instructions: `Ticket ${t.id}: qual a prioridade de atendimento deste ticket, segundo a política da escola?` };
    q[`${t.id}_pede_reembolso`] = { ...QUESTIONS.pede_reembolso, instructions: `Ticket ${t.id}: o cliente está pedindo dinheiro de volta (reembolso da compra ou estorno de uma cobrança)?` };
  }
  return q;
}
export function interpretarLote(a, t) {
  const dep = a[`${t.id}_departamento`], pr = a[`${t.id}_prioridade`], re = a[`${t.id}_pede_reembolso`];
  const nivel = Math.max(0, Math.min(3, Math.round(pr.score)));
  const pri = PRIORIDADES[nivel];
  return {
    id: t.id,
    departamento: { escolha: dep.choice, label: DEPARTAMENTOS[dep.choice]?.label || dep.choice, confianca: round(dep.confidence ?? 0), probabilidades: roundProbs(dep.probabilities) },
    prioridade: { score: round(pr.score, 3), nivel, p: pri.p, label: pri.label, sla: pri.sla, probabilidades: roundProbs(pr.probabilities) },
    sinais: { pede_reembolso: round(re?.noul ?? 0) },
  };
}

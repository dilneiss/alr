// Formulário que Qualifica — um "Typeform" B2B que qualifica o lead ENQUANTO ele digita.
// A cada pausa na digitação (e a cada resposta), o Jev recebe as respostas até agora (incluindo o texto que está
// sendo digitado) e responde 9 perguntas numa única chamada: qualificação, BANT (4 escalas), compra em 30 dias,
// curioso/estudante, área do processo e o próximo passo comercial (no envio final, +1: conteúdo impróprio).
// O final do formulário muda conforme o próximo passo escolhido.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const MAX_LEADS = 500;
const MAX_IDADE_MS = 7 * 24 * 3600 * 1000;

// ---------------------------------------------------------------------------------------------------------------
// O formulário (a mesma definição alimenta a interface e o estado enviado ao Jev)
// ---------------------------------------------------------------------------------------------------------------
const CAMPOS = [
  { id: 'nome_empresa', curto: 'Nome', tipo: 'texto', max: 120, rotulo: 'nome e empresa',
    titulo: 'Para começar: qual é o seu nome e o da sua empresa?',
    ajuda: 'Assim o especialista já chega sabendo com quem vai conversar.',
    placeholder: 'Ex.: Carla Souza, Transportes Rota Sul' },
  { id: 'cargo', curto: 'Cargo', tipo: 'texto', max: 100, rotulo: 'cargo',
    titulo: 'Qual é o seu cargo?',
    ajuda: 'Ajuda a entender o seu papel no projeto.',
    placeholder: 'Ex.: Diretora de Operações',
    sugestoes: ['CEO / dono(a)', 'Diretor(a)', 'Gerente', 'Analista', 'Estudante'] },
  { id: 'porte', curto: 'Porte', tipo: 'opcoes', rotulo: 'tamanho da empresa (funcionários)',
    titulo: 'Quantas pessoas trabalham na empresa?',
    ajuda: 'Escolha uma faixa.',
    opcoes: ['Ainda não tenho empresa', '1–10', '11–50', '51–200', '201–1.000', 'Mais de 1.000'] },
  { id: 'processo', curto: 'Processo', tipo: 'longo', max: 1200, rotulo: 'processo que quer automatizar com IA',
    titulo: 'Qual processo você quer automatizar com IA?',
    ajuda: 'Conte o que acontece hoje: quem faz, quanto tempo leva, o que dá errado.',
    placeholder: 'Ex.: nossa equipe responde 300 pedidos de orçamento por dia no WhatsApp e demora horas…' },
  { id: 'custo', curto: 'Custo', tipo: 'texto', max: 240, rotulo: 'quanto o problema custa por mês',
    titulo: 'Quanto esse problema custa por mês hoje?',
    ajuda: 'Uma estimativa já serve: horas da equipe, retrabalho, vendas perdidas…',
    placeholder: 'Ex.: 3 pessoas em tempo integral, uns R$ 25 mil por mês' },
  { id: 'orcamento', curto: 'Verba', tipo: 'opcoes', rotulo: 'orçamento para o projeto',
    titulo: 'Quanto você pretende investir no projeto?',
    ajuda: 'Faixa aproximada, só para dimensionar a proposta.',
    opcoes: ['Ainda não tenho orçamento', 'Até R$ 5 mil', 'De R$ 5 mil a R$ 20 mil', 'De R$ 20 mil a R$ 50 mil', 'De R$ 50 mil a R$ 150 mil', 'Acima de R$ 150 mil'] },
  { id: 'prazo', curto: 'Prazo', tipo: 'texto', max: 200, rotulo: 'prazo para estar rodando',
    titulo: 'Para quando você precisa disso rodando?',
    ajuda: 'Tem alguma data ou evento importante no caminho?',
    placeholder: 'Ex.: antes da Black Friday',
    sugestoes: ['Este mês', 'Em até 3 meses', 'Neste semestre', 'Sem pressa, estou pesquisando'] },
  { id: 'decisao', curto: 'Decisão', tipo: 'texto', max: 240, rotulo: 'quem participa da decisão',
    titulo: 'Quem mais participa da decisão?',
    ajuda: 'Sócios, diretoria, financeiro, TI…',
    placeholder: 'Ex.: eu decido junto com o nosso CFO',
    sugestoes: ['Só eu', 'Eu e meu sócio', 'Preciso levar para a diretoria', 'Não sou eu quem decide'] },
];

// ---------------------------------------------------------------------------------------------------------------
// Perguntas ao Jev — os critérios SÃO a política comercial
// ---------------------------------------------------------------------------------------------------------------
const QUALIFICACAO = {
  altamente_qualificado: 'Lead quente: empresa real com um processo concreto e caro para automatizar, orçamento compatível com projeto sob medida (acima de R$ 20 mil), quem responde decide ou decide junto, e quer começar em até 3 meses',
  qualificado: 'Bom lead com um ponto fraco: empresa real e necessidade concreta, mas verba incerta ou média, prazo mais longo, ou depende de outras pessoas para decidir',
  morno: 'Interesse real porém imaturo: necessidade vaga ou pouco definida, sem orçamento ou sem prazo; precisa amadurecer antes de uma conversa comercial',
  desqualificado: 'Não é comprador: estudante, curioso, pessoa sem empresa, pedido fora do escopo, respostas de teste ou sem sentido',
};
const QUALIF_LABEL = { altamente_qualificado: 'Altamente qualificado', qualificado: 'Qualificado', morno: 'Morno', desqualificado: 'Desqualificado' };

const PROXIMO = {
  agendar_reuniao_especialista: 'Agendar reunião com especialista: lead quente de empresa média ou grande, dor clara e cara, verba e decisor presentes, quer começar logo',
  enviar_proposta_expressa: 'Enviar proposta expressa por e-mail: bom lead com necessidade clara e escopo simples ou verba média; uma proposta pronta resolve sem reunião',
  oferecer_curso_online: 'Oferecer o curso online: empresa muito pequena, autônomo ou orçamento baixo (até ~R$ 5 mil) que pode aprender a fazer sozinho com IA',
  nutrir_com_conteudo: 'Nutrir com conteúdo: interesse real mas imaturo, sem verba agora, prazo distante ou precisa convencer a diretoria; voltar a falar depois',
  descartar_com_educacao: 'Descartar com educação: não é cliente — estudante, curioso sem empresa, pedido fora do escopo, teste ou respostas sem sentido',
};
const PROXIMO_LABEL = {
  agendar_reuniao_especialista: 'Agendar reunião com especialista', enviar_proposta_expressa: 'Enviar proposta expressa',
  oferecer_curso_online: 'Oferecer o curso online', nutrir_com_conteudo: 'Nutrir com conteúdo', descartar_com_educacao: 'Descartar com educação',
};

const AREAS = {
  atendimento: 'Atendimento ao cliente: SAC, WhatsApp, suporte, dúvidas e status de pedidos',
  vendas: 'Vendas: prospecção, qualificação de leads, orçamentos, CRM e follow-up comercial',
  marketing: 'Marketing: conteúdo, redes sociais, anúncios e e-mail marketing',
  financeiro: 'Financeiro e backoffice: notas fiscais, conciliação bancária, contas a pagar e a receber, cobrança',
  operacoes: 'Operações e logística: estoque, pedidos, entregas, produção e agendamentos',
  rh: 'RH e pessoas: recrutamento, triagem de currículos, onboarding e folha',
  dados_ti: 'Dados e TI: relatórios, dashboards, documentos internos e integrações entre sistemas',
  indefinido: 'Nenhum processo definido ainda: só curiosidade, estudo ou aprendizado',
};
const AREA_LABEL = { atendimento: 'Atendimento', vendas: 'Vendas', marketing: 'Marketing', financeiro: 'Financeiro', operacoes: 'Operações', rh: 'RH', dados_ti: 'Dados e TI', indefinido: 'Indefinido' };

// BANT: [id, rótulo, instrução, 4 níveis (0–3), rótulos curtos dos níveis]
const BANT = [
  ['orcamento', 'Orçamento', 'Quanto orçamento este lead tem disponível para contratar um projeto de implementação de IA?', [
    'Sem orçamento: não tem verba, não sabe, ainda não respondeu, ou é pessoa física/estudante',
    'Pequeno ou incerto: até R$ 5 mil, "depende", ou ainda vai pedir verba a alguém',
    'Razoável: entre R$ 5 mil e R$ 50 mil, com disposição clara de investir',
    'Alto e disponível: acima de R$ 50 mil, verba já aprovada ou reservada',
  ], ['sem verba', 'incerto', 'razoável', 'alto']],
  ['autoridade', 'Autoridade', 'Quanto poder de decisão sobre essa contratação a pessoa que responde tem?', [
    'Nenhum: estudante, estagiário, curioso, ou ainda não se sabe o cargo',
    'Influenciador: leva a ideia para outra pessoa que decide (analista, gerente sem alçada)',
    'Decide junto: diretor ou gestor que aprova com sócio, CFO ou diretoria',
    'Decisor final: dono, CEO ou sócio que assina o contrato',
  ], ['nenhuma', 'influencia', 'decide junto', 'decisor']],
  ['necessidade', 'Necessidade', 'Quão concreta e cara é a dor que este lead quer resolver com IA?', [
    'Nenhuma: só curiosidade, estudo, ou ainda não descreveu nenhum processo',
    'Vaga: ideia genérica ("usar IA"), sem processo ou impacto definidos',
    'Clara: processo específico descrito, com impacto moderado',
    'Crítica: processo específico com volume alto e custo mensal relevante (dezenas de milhares de reais) ou perda de clientes',
  ], ['nenhuma', 'vaga', 'clara', 'crítica']],
  ['urgencia_prazo', 'Urgência', 'Quão urgente é o prazo para o projeto estar rodando?', [
    'Sem prazo: só pesquisando, "um dia", ou ainda não informou',
    'Longo: mais de 6 meses, ano que vem, ou depende de aprovações',
    'Médio: nos próximos 2 a 6 meses',
    'Urgente: precisa rodando em até 60 dias ou tem data/evento definido',
  ], ['sem prazo', 'longo', 'médio', 'urgente']],
];

function perguntas({ final = false } = {}) {
  const q = {
    qualificacao: { type: 'choice', instructions: 'Como este lead B2B está qualificado para contratar um projeto de implementação de IA sob medida, considerando só o que já foi respondido?', criteria: QUALIFICACAO },
    compra_30_dias: { type: 'noul', instructions: 'Este lead vai fechar a contratação de um projeto de implementação de IA nos próximos 30 dias?', criteria: { true: 'Vai contratar em até 30 dias: empresa real, dor cara, verba, decisor e pressa', false: 'Não vai contratar em 30 dias' } },
    curioso_ou_estudante: { type: 'noul', instructions: 'Quem está respondendo é estudante, curioso, pesquisador ou alguém sem empresa e sem intenção real de contratar?', criteria: { true: 'Estudante, curioso ou sem empresa', false: 'Profissional de uma empresa real avaliando contratar' } },
    proximo_passo: { type: 'choice', instructions: 'Qual deve ser o próximo passo comercial com este lead?', criteria: PROXIMO },
    area: { type: 'choice', instructions: 'Em que área da empresa está o processo que o lead quer automatizar?', criteria: AREAS },
  };
  for (const [id, , instr, niveis] of BANT) q[id] = { type: 'score', instructions: instr, criteria: niveis };
  if (final) q.improprio = { type: 'noul', instructions: 'As respostas contêm ofensas, conteúdo sexual, discurso de ódio, spam ou texto de teste sem sentido (ex.: "asdf", "teste teste")?', criteria: { true: 'Conteúdo impróprio, spam ou teste sem sentido', false: 'Respostas normais de uma pessoa real' } };
  return q;
}
const Q_AO_VIVO = perguntas();
const Q_FINAL = perguntas({ final: true });

function montarEstado(resp) {
  const respostas = {};
  for (const c of CAMPOS) respostas[c.rotulo] = resp[c.id] || '(ainda não respondida)';
  return {
    contexto: 'Formulário de captação de uma consultoria que implementa projetos de IA sob medida para empresas (B2B; projetos a partir de ~R$ 20 mil). O lead está preenchendo agora: avalie só o que já foi respondido; a última resposta pode estar sendo digitada.',
    respostas_do_lead: respostas,
  };
}

function limparRespostas(raw, { exigirTodas = false } = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const c of CAMPOS) {
    let v = src[c.id];
    if (v == null) continue;
    v = String(v).replace(/\s+/g, ' ').trim();
    if (!v) continue;
    if (c.tipo === 'opcoes') {
      if (!c.opcoes.includes(v)) throw new HttpError(400, `Opção inválida em "${c.curto}".`);
    } else if (v.length > c.max) v = v.slice(0, c.max);
    out[c.id] = v;
  }
  if (exigirTodas) {
    const falta = CAMPOS.filter((c) => !out[c.id]);
    if (falta.length) throw new HttpError(400, `Faltam respostas: ${falta.map((c) => c.curto).join(', ')}.`);
  }
  return out;
}

const idOk = (s, n = 64) => typeof s === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(s) && s.length <= n;

function formatar(a) {
  const qp = a.qualificacao.probabilities || {};
  const bant = {};
  let somaBant = 0;
  for (const [id, label, , , curtos] of BANT) {
    const s = a[id] || {};
    const score = Math.max(0, Math.min(3, Number(s.score) || 0));
    const nivel = Math.max(0, Math.min(3, Math.round(score)));
    bant[id] = { label, score, nivel, texto: curtos[nivel], probabilidades: s.probabilities || {} };
    somaBant += score;
  }
  const ev = (qp.altamente_qualificado || 0) + 0.7 * (qp.qualificado || 0) + 0.35 * (qp.morno || 0);
  const lead_score = Math.round(100 * (0.6 * ev + 0.4 * (somaBant / 12)));
  return {
    qualificacao: { escolha: a.qualificacao.choice, label: QUALIF_LABEL[a.qualificacao.choice], confianca: a.qualificacao.confidence, probabilidades: qp },
    bant,
    compra_30_dias: a.compra_30_dias?.noul ?? 0,
    curioso: a.curioso_ou_estudante?.noul ?? 0,
    proximo_passo: { escolha: a.proximo_passo.choice, label: PROXIMO_LABEL[a.proximo_passo.choice], probabilidades: a.proximo_passo.probabilities || {} },
    area: { escolha: a.area.choice, label: AREA_LABEL[a.area.choice], probabilidades: a.area.probabilities || {} },
    lead_score,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Persistência dos leads (DATA_DIR, máx. 500, apaga > 7 dias) e custo por preenchimento
// ---------------------------------------------------------------------------------------------------------------
let leads = [];
try { const j = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); if (Array.isArray(j)) leads = j; } catch {}
function podar() {
  const corte = Date.now() - MAX_IDADE_MS;
  leads = leads.filter((l) => l && l.ts >= corte);
  if (leads.length > MAX_LEADS) leads = leads.slice(-MAX_LEADS);
}
podar();
let salvarTimer = null;
function salvar() {
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(() => {
    const tmp = LEADS_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(leads), (e) => { if (!e) fs.rename(tmp, LEADS_FILE, () => {}); });
  }, 300);
}
setInterval(() => { const n = leads.length; podar(); if (leads.length !== n) salvar(); }, 3600 * 1000).unref();

// custo acumulado por preenchimento (run) — só em memória, com teto
const runs = new Map();
function contarRun(run, r, nq) {
  if (!idOk(run)) return null;
  let x = runs.get(run);
  if (!x) {
    if (runs.size >= 5000) runs.delete(runs.keys().next().value);
    x = { chamadas: 0, custo: 0, decisoes: 0, at: Date.now() };
    runs.set(run, x);
  }
  x.chamadas++; x.custo += r.cost || 0; x.decisoes += nq; x.at = Date.now();
  return x;
}
setInterval(() => { const corte = Date.now() - 3 * 3600 * 1000; for (const [k, v] of runs) if (v.at < corte) runs.delete(k); }, 600000).unref();

function leadPublico(l, sessao) {
  return {
    id: l.id, ts: l.ts, meu: !!(sessao && l.sessao === sessao),
    nome_empresa: l.respostas.nome_empresa, cargo: l.respostas.cargo, porte: l.respostas.porte, orcamento: l.respostas.orcamento,
    prazo: l.respostas.prazo, processo: l.respostas.processo, custo: l.respostas.custo, decisao: l.respostas.decisao,
    qualificacao: l.qualificacao, bant: l.bant, compra_30_dias: l.compra_30_dias, curioso: l.curioso, area: l.area,
    proximo_passo: l.proximo_passo, lead_score: l.lead_score, evolucao: l.evolucao || [], etapa: l.etapa, reuniao: l.reuniao || null,
    chamadas: l.chamadas || 0, custo_total: l.custo_total || 0,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Presets para o vídeo (digitados letra a letra pela interface)
// ---------------------------------------------------------------------------------------------------------------
const PRESETS = [
  { id: 'ceo', rotulo: '👔 CEO decidido', respostas: {
    nome_empresa: 'Carlos Mendes, Transportadora Rota Sul',
    cargo: 'CEO e sócio-fundador',
    porte: '201–1.000',
    processo: 'Nossa central recebe 4 mil mensagens por dia no WhatsApp perguntando onde está a entrega. São 18 atendentes só para isso e o tempo de resposta passa de 2 horas. Quero um agente de IA que responda sozinho consultando o nosso sistema de rastreio.',
    custo: 'Uns R$ 90 mil por mês entre salários, horas extras e clientes que cancelam o contrato.',
    orcamento: 'De R$ 50 mil a R$ 150 mil',
    prazo: 'O quanto antes: quero rodando antes da Black Friday, em novembro.',
    decisao: 'Eu decido. Só vou alinhar com o diretor financeiro, que já aprovou a verba.',
  } },
  { id: 'estudante', rotulo: '🎓 Estudante curioso', respostas: {
    nome_empresa: 'Lucas, estudante de Administração',
    cargo: 'Estudante, faço estágio de meio período',
    porte: 'Ainda não tenho empresa',
    processo: 'Queria entender como a IA funciona por dentro para usar no meu TCC sobre automação. Ainda não tenho um processo específico.',
    custo: 'Não sei dizer, não tenho empresa.',
    orcamento: 'Ainda não tenho orçamento',
    prazo: 'Sem pressa, só estou pesquisando.',
    decisao: 'Ninguém, é só para mim.',
  } },
  { id: 'gerente', rotulo: '🧾 Gerente sem orçamento', respostas: {
    nome_empresa: 'Patrícia Lima, Distribuidora Bom Preço',
    cargo: 'Gerente administrativa',
    porte: '51–200',
    processo: 'Lançamento manual de notas fiscais e conciliação bancária. Duas pessoas passam o dia digitando notas no ERP e conferindo o extrato, e sempre sobra erro no fechamento do mês.',
    custo: 'Acho que uns R$ 15 mil por mês com essas duas pessoas.',
    orcamento: 'Ainda não tenho orçamento',
    prazo: 'Talvez no ano que vem, depende da diretoria.',
    decisao: 'Quem decide é o dono. Eu só levo a ideia para ele.',
  } },
  { id: 'loja', rotulo: '🛍️ Dona de loja', respostas: {
    nome_empresa: 'Fernanda Rocha, Ateliê Flor de Lis',
    cargo: 'Dona da loja',
    porte: '1–10',
    processo: 'Respondo sozinha as mensagens do Instagram e do WhatsApp perguntando preço e prazo das encomendas. Perco umas 2 horas por dia com isso.',
    custo: 'Não sei bem, talvez uns R$ 1.500 por mês do meu tempo.',
    orcamento: 'Até R$ 5 mil',
    prazo: 'Nos próximos meses, antes do Natal.',
    decisao: 'Só eu.',
  } },
];

// ---------------------------------------------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------------------------------------------
const app = createApp({ name: 'form', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/config', () => ({
  ok: true,
  campos: CAMPOS.map(({ rotulo, ...c }) => c),
  presets: PRESETS,
  labels: { qualificacao: QUALIF_LABEL, proximo_passo: PROXIMO_LABEL, area: AREA_LABEL, bant: Object.fromEntries(BANT.map(([id, label, , , curtos]) => [id, { label, niveis: curtos }])) },
  n_perguntas: Object.keys(Q_AO_VIVO).length,
}));

app.post('/api/avaliar', async ({ body, jev }) => {
  const resp = limparRespostas(body.respostas);
  if (!Object.keys(resp).length) throw new HttpError(400, 'Responda pelo menos uma pergunta.');
  const r = await jev({ state: montarEstado(resp), questions: Q_AO_VIVO });
  const run = contarRun(body.run, r, Object.keys(Q_AO_VIVO).length);
  return {
    ok: true, ...formatar(r.answers),
    latency_ms: r.latency_ms, cost: r.cost, n_perguntas: Object.keys(Q_AO_VIVO).length, cached: r.cached,
    sessao_custo: run ? { chamadas: run.chamadas, custo: run.custo, decisoes: run.decisoes } : null,
    _jev: r.debug,
  };
}, { rate: 150 });

app.post('/api/enviar', async ({ body, jev }) => {
  const resp = limparRespostas(body.respostas, { exigirTodas: true });
  const sessao = idOk(body.sessao) ? body.sessao : null;
  const r = await jev({ state: montarEstado(resp), questions: Q_FINAL });
  const run = contarRun(body.run, r, Object.keys(Q_FINAL).length);
  const f = formatar(r.answers);
  const improprio = r.answers.improprio?.noul ?? 0;
  const evolucao = (Array.isArray(body.evolucao) ? body.evolucao : []).slice(0, CAMPOS.length - 1)
    .map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
  evolucao.push(f.qualificacao.probabilidades.altamente_qualificado || 0);
  const lead = {
    id: crypto.randomBytes(6).toString('hex'), ts: Date.now(), sessao, respostas: resp,
    qualificacao: { escolha: f.qualificacao.escolha, label: f.qualificacao.label, p: f.qualificacao.probabilidades[f.qualificacao.escolha] || 0, probabilidades: f.qualificacao.probabilidades },
    bant: Object.fromEntries(Object.entries(f.bant).map(([k, v]) => [k, { score: +v.score.toFixed(2), nivel: v.nivel, texto: v.texto }])),
    compra_30_dias: f.compra_30_dias, curioso: f.curioso, area: f.area.escolha,
    proximo_passo: f.proximo_passo.escolha, lead_score: f.lead_score, evolucao,
    etapa: f.proximo_passo.escolha, reuniao: null, oculto: improprio >= 0.5,
    chamadas: run ? run.chamadas : 1, custo_total: run ? run.custo : r.cost || 0,
  };
  leads.push(lead); podar(); salvar();
  return {
    ok: true, ...f, improprio,
    lead: leadPublico(lead, sessao),
    latency_ms: r.latency_ms, cost: r.cost, n_perguntas: Object.keys(Q_FINAL).length, cached: r.cached,
    sessao_custo: run ? { chamadas: run.chamadas, custo: run.custo, decisoes: run.decisoes } : null,
    _jev: r.debug,
  };
}, { rate: 12 });

function acharMeuLead(body) {
  const lead = leads.find((l) => l.id === String(body.lead_id || ''));
  if (!lead) throw new HttpError(404, 'Lead não encontrado (a demo apaga envios com mais de 7 dias).');
  if (!lead.sessao || lead.sessao !== body.sessao) throw new HttpError(403, 'Este lead foi enviado de outro navegador.');
  return lead;
}

const HORARIOS = ['09:00', '10:30', '14:00', '16:30'];
app.post('/api/reservar', ({ body }) => {
  const lead = acharMeuLead(body);
  const dia = String(body.dia || ''), hora = String(body.hora || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !HORARIOS.includes(hora)) throw new HttpError(400, 'Horário inválido.');
  const t = Date.parse(dia + 'T12:00:00-03:00');
  if (!Number.isFinite(t) || t < Date.now() - 86400000 || t > Date.now() + 16 * 86400000) throw new HttpError(400, 'Escolha um dia nas próximas duas semanas.');
  lead.reuniao = { dia, hora }; lead.etapa = 'reuniao_marcada'; salvar();
  return { ok: true, lead: leadPublico(lead, body.sessao) };
}, { rate: 20 });

const ACOES_FINAIS = { proposta: 'proposta_enviada', curso: 'curso_oferecido', material: 'material_enviado', encerrado: 'encerrado' };
app.post('/api/acao-final', ({ body }) => {
  const lead = acharMeuLead(body);
  const etapa = ACOES_FINAIS[String(body.acao || '')];
  if (!etapa) throw new HttpError(400, 'Ação inválida.');
  lead.etapa = etapa; salvar();
  return { ok: true, lead: leadPublico(lead, body.sessao) };
}, { rate: 20 });

app.get('/api/leads', ({ query }) => {
  const sessao = idOk(query.sessao) ? query.sessao : null;
  const visiveis = leads.filter((l) => !l.oculto || (sessao && l.sessao === sessao));
  const ordenados = [...visiveis].sort((a, b) => (b.lead_score - a.lead_score) || (b.ts - a.ts));
  const dia = Date.now() - 86400000;
  const kpis = {
    total: visiveis.length,
    hoje: visiveis.filter((l) => l.ts >= dia).length,
    quentes: visiveis.filter((l) => l.qualificacao.escolha === 'altamente_qualificado').length,
    reunioes: visiveis.filter((l) => l.reuniao).length,
    custo_medio: visiveis.length ? visiveis.reduce((s, l) => s + (l.custo_total || 0), 0) / visiveis.length : 0,
    chamadas_medias: visiveis.length ? visiveis.reduce((s, l) => s + (l.chamadas || 0), 0) / visiveis.length : 0,
  };
  return { ok: true, kpis, leads: ordenados.slice(0, 120).map((l) => leadPublico(l, sessao)) };
});

app.start(+(process.env.PORT || 4102));

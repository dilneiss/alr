// Central de Suporte com Triagem — cada ticket que chega é triado pelo Jev numa única chamada (9 perguntas):
// departamento, prioridade, frustração, sentimento, 4 sinais de risco e a melhor resposta pronta (macro).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, chunk, pool } from '../../shared/server/kit.mjs';
import {
  QUESTIONS, N_PERGUNTAS, DEPARTAMENTOS, PRIORIDADES, FRUSTRACAO, SENTIMENTO, SINAIS, MACROS, CANAIS, LIMITES, LOTE,
  buildState, interpretar, normalizarTicket, buildStateLote, questionsLote, interpretarLote,
} from './triagem.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- tickets semente ----------
const SEED = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'tickets.json'), 'utf8'));
const SEED_BY_ID = new Map(SEED.map((t) => [t.id, t]));
// Os primeiros da fila foram escolhidos para mostrar variedade logo nos primeiros 20 s (7 departamentos, P1 a P4).
const ABERTURA = ['t01', 't27', 't15', 't44', 't38', 't22', 't52', 't57', 't06', 't45', 't60', 't19', 't03', 't29', 't10', 't37'];
const publico = (t) => ({ id: t.id, nome: t.nome, handle: t.handle, canal: t.canal, assunto: t.assunto, plano: t.plano, cliente_ha: t.cliente_ha, texto: t.texto });
const TICKETS_PUBLICOS = [...ABERTURA.map((id) => SEED_BY_ID.get(id)), ...SEED.filter((t) => !ABERTURA.includes(t.id))].map(publico);

// ---------- estatística global (todos os visitantes) ----------
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { triados: 0, escritos: 0, porDepartamento: {}, p1: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 3000).unref();

// ---------- economia: tickets semente são "ao vivo" até uma cota por IP; depois reaproveitam a resposta em cache ----------
// (tickets escritos pelo usuário são sempre ao vivo). Protege o orçamento se o vídeo viralizar.
const LIVE_PER_IP_HOUR = +(process.env.SEED_LIVE_PER_IP_HOUR || 80);
const LIVE_GLOBAL_HOUR = +(process.env.SEED_LIVE_GLOBAL_HOUR || 3000);
const liveByIp = new Map(); let liveGlobal = { n: 0, at: Date.now() };
function seedAoVivo(ip) {
  const now = Date.now();
  if (now - liveGlobal.at > 3600e3) liveGlobal = { n: 0, at: now };
  let b = liveByIp.get(ip);
  if (!b || now - b.at > 3600e3) { b = { n: 0, at: now }; liveByIp.set(ip, b); }
  if (b.n >= LIVE_PER_IP_HOUR || liveGlobal.n >= LIVE_GLOBAL_HOUR) return false;
  b.n++; liveGlobal.n++;
  return true;
}
// Lote (backlog): até LOTE_LIVE_PER_IP_HOUR lotes ao vivo por IP/hora; depois o gateway reaproveita o cache quando o lote é idêntico.
const LOTE_LIVE_PER_IP_HOUR = +(process.env.LOTE_LIVE_PER_IP_HOUR || 8);
const loteByIp = new Map();
function loteAoVivo(ip) {
  const now = Date.now();
  let b = loteByIp.get(ip);
  if (!b || now - b.at > 3600e3) { b = { n: 0, at: now }; loteByIp.set(ip, b); }
  if (b.n >= LOTE_LIVE_PER_IP_HOUR) return false;
  b.n++;
  return true;
}
setInterval(() => {
  const cut = Date.now() - 3600e3;
  for (const m of [liveByIp, loteByIp]) for (const [k, b] of m) if (b.at < cut) m.delete(k);
}, 600e3).unref();

const PRESETS = [
  { rotulo: '💸 Cobrado 2× + Procon', canal: 'whatsapp', texto: 'fui cobrado duas vezes, quero meu dinheiro de volta hoje ou vou no Procon' },
  { rotulo: '🔒 Paguei e não tenho acesso', canal: 'whatsapp', texto: 'Paguei ontem e até agora não recebi o acesso. Minha aula ao vivo é hoje às 19h!' },
  { rotulo: '👋 Quero cancelar', canal: 'email', assunto: 'Cancelamento', texto: 'Oi, queria cancelar minha assinatura. Estou sem tempo pra estudar neste semestre.' },
  { rotulo: '🎓 Certificado', canal: 'email', assunto: 'Certificado', texto: 'Terminei o curso ontem. Como eu emito o certificado? Quero colocar no LinkedIn.' },
  { rotulo: '🚀 Upgrade', canal: 'instagram', texto: 'Tô amando o curso! Como faço pra passar pro plano anual com as aulas ao vivo?' },
  { rotulo: '🇺🇸 Em inglês', canal: 'email', assunto: 'Double charge', texto: 'Hi, I was charged twice for the annual plan. Please refund the extra charge as soon as possible.' },
];
const PLANOS = ['Formação IA Pro · anual (R$ 1.497)', 'Formação IA Pro · mensal (R$ 147)', 'Comunidade Sinapse · mensal (R$ 67)', 'Curso Automação com n8n (R$ 397)', 'Sem compra (lead)'];
const CLIENTE_HA = ['3 dias', '2 meses', '1 ano', '—'];

const CONFIG = {
  departamentos: Object.fromEntries(Object.entries(DEPARTAMENTOS).map(([k, d]) => [k, { label: d.label, curto: d.curto, icone: d.icone, cor: d.cor }])),
  prioridades: PRIORIDADES.map(({ p, label, sla }) => ({ p, label, sla })),
  frustracao: FRUSTRACAO.map(({ emoji, label }) => ({ emoji, label })),
  sentimento: SENTIMENTO.map(({ label }) => label),
  sinais: Object.fromEntries(Object.entries(SINAIS).map(([k, s]) => [k, { label: s.label, curto: s.curto }])),
  macros: Object.fromEntries(Object.entries(MACROS).map(([k, m]) => [k, { titulo: m.titulo, icone: m.icone }])),
  canais: CANAIS, limites: LIMITES, presets: PRESETS, planos: PLANOS, cliente_ha: CLIENTE_HA,
  n_perguntas: N_PERGUNTAS, minutos_por_ticket: 3, lote: LOTE,
};

const app = createApp({ name: 'suporte', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/config', () => ({ ok: true, ...CONFIG }));
app.get('/api/tickets', () => ({ ok: true, tickets: TICKETS_PUBLICOS }));
app.get('/api/stats', () => ({ ok: true, triados: stats.triados, escritos: stats.escritos, p1: stats.p1, porDepartamento: stats.porDepartamento }));

app.post('/api/triar', async ({ body, jev, ip }) => {
  let t, seed = false;
  if (body && body.id != null) {
    const s = SEED_BY_ID.get(String(body.id));
    if (!s) throw new HttpError(404, 'Ticket não encontrado.');
    t = s; seed = true;
  } else {
    t = normalizarTicket(body && body.ticket);
    if (t.texto.length < LIMITES.textoMin) throw new HttpError(400, 'Escreva a mensagem do ticket (pelo menos algumas letras).');
    if (t.texto.length > LIMITES.texto) throw new HttpError(400, `Mensagem longa demais (máximo ${LIMITES.texto.toLocaleString('pt-BR')} caracteres).`);
  }
  const cache = seed ? !seedAoVivo(ip) : false;
  const r = await jev({ state: buildState(t), questions: QUESTIONS, cache });
  const tri = interpretar(r.answers, t);
  stats.triados++; if (!seed) stats.escritos++;
  stats.porDepartamento[tri.departamento.escolha] = (stats.porDepartamento[tri.departamento.escolha] || 0) + 1;
  if (tri.prioridade.nivel === 3) stats.p1++;
  dirty = true;
  return {
    ok: true, id: seed ? t.id : null, ticket: seed ? null : publico({ ...t, id: null }),
    ...tri,
    latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, tokens: r.usage?.input_tokens || null, n_perguntas: N_PERGUNTAS,
    _jev: r.debug,
  };
}, { rate: 90 });

// Backlog: vários tickets semente numa rodada — grupos de 12 tickets × 3 perguntas = 36 perguntas por chamada, chamadas em paralelo.
app.post('/api/triar-lote', async ({ body, jev, ip }) => {
  const ids = [...new Set((Array.isArray(body && body.ids) ? body.ids : []).map(String))].filter((id) => SEED_BY_ID.has(id)).slice(0, LOTE.max);
  if (!ids.length) throw new HttpError(400, 'Não há tickets na fila para triar em lote. Clique em Reiniciar.');
  const grupos = chunk(ids.map((id) => SEED_BY_ID.get(id)), LOTE.porChamada);
  const cache = !loteAoVivo(ip);
  const t0 = performance.now();
  const partes = await pool(grupos, grupos.length, async (g) => ({ g, r: await jev({ state: buildStateLote(g), questions: questionsLote(g), cache }) }));
  const wall_ms = Math.round(performance.now() - t0);
  const resultados = partes.flatMap(({ g, r }) => g.map((t) => interpretarLote(r.answers, t)));
  for (const x of resultados) {
    stats.porDepartamento[x.departamento.escolha] = (stats.porDepartamento[x.departamento.escolha] || 0) + 1;
    if (x.prioridade.nivel === 3) stats.p1++;
  }
  stats.triados += resultados.length; dirty = true;
  const cost = partes.reduce((s, p) => s + (p.r.cost || 0), 0);
  return {
    ok: true, resultados,
    chamadas: partes.length, perguntas: partes.reduce((s, p) => s + p.r.debug.n_questions, 0), perguntas_por_chamada: LOTE.porChamada * LOTE.perguntasPorTicket,
    wall_ms, latency_ms: Math.max(...partes.map((p) => p.r.latency_ms || 0)), cost, cached: partes.every((p) => p.r.cached),
    tokens: partes.reduce((s, p) => s + (p.r.usage?.input_tokens || 0), 0),
    _jev: partes.map((p) => ({ ...p.r.debug, label: 'backlog em lote' })),
  };
}, { rate: 8 });

app.start(+(process.env.PORT || 4106));

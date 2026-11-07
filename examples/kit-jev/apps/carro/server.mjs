// Carro Autônomo — o Jev é o cérebro de um carro num simulador 2D. O navegador roda a física a 60 fps e, a cada
// ~0,35 s, manda os sensores (só números) para /api/decidir; aqui montamos o estado e as 3 perguntas tipadas
// (ação, motivo, perigo), chamamos o Jev UMA vez e devolvemos a decisão com as probabilidades.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import { build, ACOES, MOTIVOS } from './politica.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { decisoes: 0, metros: 0, sessoes: 0, custo: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 4000).unref();

// Teto por IP (além do limite por minuto da rota): o front pausa sozinho após 3 min, isto protege contra abuso.
const POR_HORA = +(process.env.CARRO_DECISOES_POR_HORA || 2400);
const porIp = new Map();
function permitido(ip) {
  const now = Date.now();
  let b = porIp.get(ip);
  if (!b || now - b.t0 > 3600_000) { b = { n: 0, t0: now }; porIp.set(ip, b); }
  b.n++;
  return b.n <= POR_HORA;
}
// Odômetro global ("o Jev já dirigiu X km"): cada sessão manda o próprio odômetro; somamos só o avanço plausível.
const sessoes = new Map();
setInterval(() => {
  const cut = Date.now() - 3600_000;
  for (const [k, b] of porIp) if (b.t0 < cut) porIp.delete(k);
  for (const [k, s] of sessoes) if (s.at < Date.now() - 900_000) sessoes.delete(k);
}, 300_000).unref();

const app = createApp({ name: 'carro', publicDir: new URL('./public/', import.meta.url), maxBody: 20_000 });

app.get('/api/stats', () => ({ ok: true, decisoes: stats.decisoes, km: +(stats.metros / 1000).toFixed(2), sessoes: stats.sessoes }));
app.get('/api/politica', () => ({ ok: true, acoes: ACOES, motivos: MOTIVOS }));

app.post('/api/decidir', async ({ body, jev, ip }) => {
  if (!permitido(ip)) throw new HttpError(429, 'Você já dirigiu bastante nesta hora — o Jev precisa de uma pausa. Volte em alguns minutos!', 'rate_limited');
  let b;
  try { b = build(body && body.s); } catch (e) { throw new HttpError(400, e.message || 'Sensores inválidos.'); }
  const r = await jev({ state: b.state, questions: b.questions });
  const a = r.answers;
  const acao = b.opcoes.includes(a.acao?.choice) ? a.acao.choice : 'frear_suave';
  // estatística global
  stats.decisoes++; stats.custo += r.cost || 0; dirty = true;
  const sid = typeof body.sid === 'string' ? body.sid.slice(0, 40) : '';
  const odo = Number(body.odo);
  if (sid && Number.isFinite(odo)) {
    const s = sessoes.get(sid);
    if (!s) { if (sessoes.size < 20000) { sessoes.set(sid, { odo, at: Date.now() }); stats.sessoes++; } }
    else { const d = odo - s.odo; if (d > 0 && d < 60) stats.metros += d; s.odo = Math.max(s.odo, odo); s.at = Date.now(); }
  }
  return {
    ok: true,
    acao, motivo: a.motivo.choice, confianca: a.acao.confidence,
    prob_acao: a.acao.probabilities, prob_motivo: a.motivo.probabilities,
    perigo: { score: a.perigo.score, probabilities: a.perigo.probabilities },
    opcoes: b.opcoes,
    latency_ms: r.latency_ms, cost: r.cost, n_perguntas: 3,
    _jev: r.debug,
  };
}, { rate: 240 });

app.start(+(process.env.PORT || 4103));

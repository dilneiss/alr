// Copiloto de Vendas ao Vivo — a cada fala do cliente (inclusive no meio da frase, nas pausas), o Jev lê as últimas
// falas e decide numa chamada de ~300 ms: objeção, sinal de compra, sentimento, estágio, próximo passo (battlecard),
// risco de perder e chance de fechar. O card certo aparece para o vendedor antes de a objeção "passar".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import { QUESTIONS, N_PERGUNTAS, OBJECOES, ESTAGIOS, ORDEM_ESTAGIOS, SENTIMENTO, CARDS, LIMITES, PRODUTO, buildState, interpretar, normalizarHistorico } from './copiloto.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });

const ROTEIROS = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'roteiros.json'), 'utf8'));
const ROTEIROS_PUBLICOS = ROTEIROS.map(({ falas, ...r }) => ({ ...r, falas: falas.map(({ quem, fala }) => ({ quem, fala })) }));
const IDS_ROTEIRO = new Set(ROTEIROS.map((r) => r.id));

// ---------- estatística global ----------
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { falas: 0, objecoes: {}, sinais: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 3000).unref();

// ---------- economia: falas dos roteiros simulados são ao vivo até uma cota por IP/hora; depois o gateway ----------
// reaproveita a resposta idêntica em cache. Microfone e fala digitada são sempre ao vivo.
const SIM_LIVE_PER_IP_HOUR = +(process.env.SIM_LIVE_PER_IP_HOUR || 150);
const liveByIp = new Map();
function simAoVivo(ip) {
  const now = Date.now();
  let b = liveByIp.get(ip);
  if (!b || now - b.at > 3600e3) { b = { n: 0, at: now }; liveByIp.set(ip, b); }
  if (b.n >= SIM_LIVE_PER_IP_HOUR) return false;
  b.n++;
  return true;
}
setInterval(() => { const cut = Date.now() - 3600e3; for (const [k, b] of liveByIp) if (b.at < cut) liveByIp.delete(k); }, 600e3).unref();

const CONFIG = {
  produto: PRODUTO,
  objecoes: Object.fromEntries(Object.entries(OBJECOES).map(([k, o]) => [k, { label: o.label, icone: o.icone, cor: o.cor }])),
  estagios: ORDEM_ESTAGIOS.map((k) => ({ id: k, label: ESTAGIOS[k].label })),
  sentimento: SENTIMENTO.map((s) => s.label),
  cards: Object.fromEntries(Object.entries(CARDS).map(([k, c]) => [k, { icone: c.icone, titulo: c.titulo, frase: c.frase, dica: c.dica }])),
  roteiros: ROTEIROS_PUBLICOS,
  limites: LIMITES, n_perguntas: N_PERGUNTAS,
};

const app = createApp({ name: 'vendas', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/config', () => ({ ok: true, ...CONFIG }));
app.get('/api/stats', () => ({ ok: true, ...stats }));

app.post('/api/analisar', async ({ body, jev, ip }) => {
  const fala = String((body && body.fala) || '').replace(/\s+/g, ' ').trim();
  if (fala.length < LIMITES.falaMin) throw new HttpError(400, 'Escreva uma fala do cliente (pelo menos algumas letras).');
  if (fala.length > LIMITES.fala) throw new HttpError(400, `Fala longa demais (máximo ${LIMITES.fala} caracteres).`);
  const historico = normalizarHistorico(body.historico);
  const parcial = !!body.parcial;
  const simulacao = IDS_ROTEIRO.has(String(body.roteiro || ''));
  const cache = simulacao ? !simAoVivo(ip) : false;
  const r = await jev({ state: buildState(historico, fala, parcial), questions: QUESTIONS, cache });
  const x = interpretar(r.answers);
  if (!parcial) {
    stats.falas++;
    if (x.objecao.detectada) stats.objecoes[x.objecao.escolha] = (stats.objecoes[x.objecao.escolha] || 0) + 1;
    if (x.sinal_compra >= 0.6) stats.sinais++;
    dirty = true;
  }
  return { ok: true, ...x, parcial, latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, tokens: r.usage?.input_tokens || null, n_perguntas: N_PERGUNTAS, _jev: r.debug };
}, { rate: 120 });

app.start(+(process.env.PORT || 4110));

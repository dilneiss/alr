// Jev Gateway — único lugar que conhece a chave do OpenRouter.
// Todos os apps chamam POST /v1/decide aqui; o gateway aplica orçamento, limite por IP, cache opcional, retry e
// registra custo e latência de cada decisão. Os apps que escrevem texto (Estúdio por Voz e Mini Cluely) usam a rota
// /v1/llm, no formato da API OpenAI, que repassa a um modelo de texto do OpenRouter com o mesmo orçamento.
// Portão do kit: sem o carimbo da VPS da Hostinger (PORTAO_FILE, gravado pelo "publicar" do kit), nenhuma decisão sai.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = +(process.env.PORT || 8787);
const KEY = (process.env.OPENROUTER_API_KEY ||
  (process.env.OPENROUTER_KEY_FILE ? fs.readFileSync(process.env.OPENROUTER_KEY_FILE, 'utf8') : '')).trim();
const MODEL = process.env.JEV_MODEL || 'typesafe/jev-1.13';
const UPSTREAM = process.env.JEV_URL || 'https://openrouter.ai/api/alpha/decisions';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const BUDGET_TOTAL = +(process.env.BUDGET_TOTAL_USD || 12);      // teto de toda a vida da instalação
const BUDGET_DAILY = +(process.env.BUDGET_DAILY_USD || 3);       // teto por dia (UTC)
const APP_DAILY = +(process.env.APP_DAILY_USD || 1);             // teto por app por dia
let APP_CAPS = {};                                                // tetos diários específicos: {"cidade": 2}
try { APP_CAPS = JSON.parse(process.env.APP_CAPS_JSON || '{}'); } catch { console.error('[gateway] APP_CAPS_JSON inválido'); }
const appCap = (app) => +(APP_CAPS[app] ?? APP_DAILY);
const RATE_PER_MIN = +(process.env.RATE_PER_MIN || 240);         // chamadas por IP por minuto
const MAX_QUESTIONS = 160;
const MAX_BODY = 600_000;
const REFERER = process.env.PUBLIC_HUB_URL || '';

// Modelo de texto na nuvem (no lugar dos modelos locais da instalação original). LLM_MODEL=off desliga.
// Medido em 21/10/2026: o Gemini 2.5 Flash-Lite seguiu a regra "sem o dado, não invente" do Mini Cluely (58/58 no e2e),
// e o Qwen3-30B inventou um prazo (57/58); os dois passaram no Estúdio por Voz (116/116).
const LLM_MODEL = (process.env.LLM_MODEL || 'google/gemini-2.5-flash-lite').trim();
const LLM_ON = LLM_MODEL && LLM_MODEL !== 'off';
const LLM_URL = process.env.LLM_URL || 'https://openrouter.ai/api/v1/chat/completions';
const LLM_MAX_TOKENS = +(process.env.LLM_MAX_TOKENS || 1500);

if (!KEY) { console.error('[gateway] OPENROUTER_API_KEY ausente'); process.exit(1); }
fs.mkdirSync(DATA_DIR, { recursive: true });
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const USAGE_FILE = path.join(DATA_DIR, 'usage.jsonl');

// ---- portão do kit: carimbo da VPS da Hostinger, relido a cada minuto ----
const PORTAO_FILE = process.env.PORTAO_FILE || '/run/jev-kit/portao.json';
let portao = { ok: false, at: 0, motivo: 'não lido' };
function lerPortao() {
  if (Date.now() - portao.at < 60_000) return portao;
  try {
    const p = JSON.parse(fs.readFileSync(PORTAO_FILE, 'utf8'));
    // o "publicar" do kit só grava o carimbo depois de achar este IP na lista de VPS da conta, pela API da Hostinger
    const ok = p && p.ok === true && p.fonte === 'api-hostinger' && p.vps_id && p.ip;
    portao = { ok: !!ok, at: Date.now(), motivo: ok ? '' : 'carimbo sem VPS da Hostinger', vps_id: p.vps_id };
  } catch { portao = { ok: false, at: Date.now(), motivo: 'carimbo ausente' }; }
  return portao;
}
const PORTAO_MSG = 'Este app é do Kit Jev e só funciona numa VPS da Hostinger verificada pelo kit. Rode o setup do kit (node kit/jev-kit.mjs publicar).';

const today = () => new Date().toISOString().slice(0, 10);
let stats = { since: new Date().toISOString(), total: { calls: 0, questions: 0, cost: 0, input_tokens: 0, errors: 0, cached: 0 }, days: {}, apps: {}, llm: { calls: 0, cost: 0, tokens: 0, errors: 0 } };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }; } catch {}
stats.llm ||= { calls: 0, cost: 0, tokens: 0, errors: 0 };
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(STATS_FILE, JSON.stringify(stats), () => {}); } }, 3000).unref();

function appStats(app) {
  return (stats.apps[app] ||= { calls: 0, questions: 0, cost: 0, input_tokens: 0, errors: 0, cached: 0, lat: [], days: {} });
}
function dayStats(d = today()) { return (stats.days[d] ||= { calls: 0, cost: 0 }); }
function semOrcamento(app) {
  const A = appStats(app), D = dayStats(), d = today();
  return stats.total.cost >= BUDGET_TOTAL || D.cost >= BUDGET_DAILY || (A.days[d] || 0) >= appCap(app);
}

// ---- limite por IP (token bucket) ----
const buckets = new Map();
function allow(ip) {
  if (!ip || ip.startsWith('server:')) return true;
  const now = Date.now();
  const cap = Math.max(20, RATE_PER_MIN / 3);
  let b = buckets.get(ip);
  if (!b) { b = { t: cap, at: now }; buckets.set(ip, b); }
  b.t = Math.min(cap, b.t + ((now - b.at) / 60000) * RATE_PER_MIN);
  b.at = now;
  if (b.t < 1) return false;
  b.t -= 1;
  return true;
}
setInterval(() => { const cut = Date.now() - 600000; for (const [k, b] of buckets) if (b.at < cut) buckets.delete(k); }, 60000).unref();

// ---- cache LRU opcional ----
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;
function cacheGet(k) { const v = cache.get(k); if (!v) return null; if (Date.now() - v.at > CACHE_TTL) { cache.delete(k); return null; } cache.delete(k); cache.set(k, v); return v; }
function cacheSet(k, v) { cache.set(k, { ...v, at: Date.now() }); if (cache.size > 6000) cache.delete(cache.keys().next().value); }

function send(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}

function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let size = 0, grande = false; const chunks = [];
    req.on('data', c => {
      if (grande) return; // já estourou: descarta o resto
      size += c.length;
      if (size <= MAX_BODY) { chunks.push(c); return; }
      // responde o 413 antes de fechar (com req.destroy() na hora, o cliente via a conexão cortada)
      grande = true; chunks.length = 0;
      if (res && !res.headersSent) { res.setHeader('Connection', 'close'); res.once('finish', () => req.destroy()); }
      reject(Object.assign(new Error('payload grande demais'), { status: 413 }));
    });
    req.on('end', () => { if (grande) return; try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('JSON inválido'), { status: 400 })); } });
    req.on('error', reject);
  });
}

function validQuestions(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return 'questions deve ser um objeto';
  const keys = Object.keys(q);
  if (!keys.length) return 'questions vazio';
  if (keys.length > MAX_QUESTIONS) return `máximo de ${MAX_QUESTIONS} perguntas por chamada`;
  for (const k of keys) {
    const v = q[k];
    if (!v || !['choice', 'score', 'noul'].includes(v.type)) return `pergunta "${k}": type deve ser choice|score|noul`;
    if (typeof v.instructions !== 'string' || !v.instructions.trim()) return `pergunta "${k}": instructions obrigatório`;
    if (v.type === 'choice' && (!v.criteria || typeof v.criteria !== 'object' || Array.isArray(v.criteria) || Object.keys(v.criteria).length < 2)) return `pergunta "${k}": choice precisa de criteria com 2+ opções`;
    if (v.type === 'score' && (!Array.isArray(v.criteria) || v.criteria.length < 2 || v.criteria.length > 10)) return `pergunta "${k}": score precisa de criteria (lista de 2 a 10 níveis)`;
  }
  return null;
}

function cabecalhos() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Kit Jev', ...(REFERER ? { 'HTTP-Referer': REFERER } : {}) };
}

async function upstream(body) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const t0 = performance.now();
    try {
      const r = await fetch(UPSTREAM, { method: 'POST', signal: ctrl.signal, headers: cabecalhos(), body: JSON.stringify(body) });
      const ms = performance.now() - t0;
      const text = await r.text();
      let j; try { j = JSON.parse(text); } catch { j = { error: { message: text.slice(0, 300) } }; }
      if (r.ok && j.answers) return { j, ms };
      const msg = String(j?.error?.message || `upstream ${r.status}`);
      if (/<!DOCTYPE html|Attention Required|you have been blocked|cf-error/i.test(msg) || /<!DOCTYPE html/i.test(text)) {
        // a borda (Cloudflare) do provedor recusou o conteúdo por parecer um ataque: não é erro do modelo
        lastErr = Object.assign(new Error('bloqueado pela proteção do provedor'), { status: 403, code: 'upstream_blocked' });
        break;
      }
      lastErr = Object.assign(new Error(msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 240)), { status: r.status, upstream: j });
      if (!(r.status === 429 || r.status >= 500)) break;
    } catch (e) {
      lastErr = Object.assign(new Error(e.name === 'AbortError' ? 'timeout no Jev' : e.message), { status: 504 });
    } finally { clearTimeout(timer); }
    await new Promise(r => setTimeout(r, 350 + Math.random() * 300));
  }
  throw lastErr;
}

function pct(arr, p) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); }

async function decide(req, res) {
  const t0 = performance.now();
  let body;
  try { body = await readBody(req, res); } catch (e) { return send(res, e.status || 400, { ok: false, error: { code: 'bad_request', message: e.message } }); }
  if (!lerPortao().ok) return send(res, 403, { ok: false, error: { code: 'portao_fechado', message: PORTAO_MSG } });
  const app = String(body.app || 'desconhecido').slice(0, 40);
  if (app.startsWith('llm-')) return send(res, 400, { ok: false, error: { code: 'bad_request', message: 'nome de app reservado' } });
  const ip = String(body.meta?.ip || req.socket.remoteAddress || '').slice(0, 80);
  const err = validQuestions(body.questions);
  if (err) return send(res, 400, { ok: false, error: { code: 'bad_request', message: err } });
  if (body.state === undefined || body.state === null) return send(res, 400, { ok: false, error: { code: 'bad_request', message: 'state obrigatório' } });

  const A = appStats(app); const D = dayStats(); const d = today();
  if (semOrcamento(app))
    return send(res, 429, { ok: false, error: { code: 'budget_exhausted', message: 'O orçamento do Jev definido nesta instalação acabou por hoje. Ajuste com "node kit/jev-kit.mjs orcamento".' } });
  if (!allow(ip)) return send(res, 429, { ok: false, error: { code: 'rate_limited', message: 'Muitas decisões por minuto vindas de você. Respira e tenta de novo em alguns segundos.' } });

  const payload = { model: body.model && String(body.model).startsWith('typesafe/') ? body.model : MODEL, state: body.state, questions: body.questions };
  const nq = Object.keys(body.questions).length;
  let ck = null;
  if (body.cache) {
    ck = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
    const hit = cacheGet(ck);
    if (hit) {
      A.cached++; stats.total.cached++; dirty = true;
      return send(res, 200, { ok: true, cached: true, answers: hit.answers, model: hit.model, usage: hit.usage, cost: 0, latency_ms: 0, total_ms: Math.round(performance.now() - t0) });
    }
  }
  try {
    const { j, ms } = await upstream(payload);
    const cost = +(j.usage?.cost || 0);
    const inTok = +(j.usage?.input_tokens || 0);
    stats.total.calls++; stats.total.questions += nq; stats.total.cost += cost; stats.total.input_tokens += inTok;
    D.calls++; D.cost += cost;
    A.calls++; A.questions += nq; A.cost += cost; A.input_tokens += inTok; A.days[d] = (A.days[d] || 0) + cost;
    A.lat.push(Math.round(ms)); if (A.lat.length > 400) A.lat.splice(0, A.lat.length - 400);
    dirty = true;
    fs.appendFile(USAGE_FILE, JSON.stringify({ ts: new Date().toISOString(), app, ip: crypto.createHash('sha1').update(ip).digest('hex').slice(0, 10), nq, in: inTok, cost, ms: Math.round(ms), model: j.model }) + '\n', () => {});
    if (ck) cacheSet(ck, { answers: j.answers, model: j.model, usage: j.usage });
    return send(res, 200, { ok: true, cached: false, answers: j.answers, model: j.model, usage: j.usage, cost, latency_ms: Math.round(ms), total_ms: Math.round(performance.now() - t0), id: j.id });
  } catch (e) {
    stats.total.errors++; A.errors++; dirty = true;
    fs.appendFile(USAGE_FILE, JSON.stringify({ ts: new Date().toISOString(), app, nq, error: e.message, status: e.status }) + '\n', () => {});
    const code = e.code === 'upstream_blocked' ? 'upstream_blocked' : e.status === 402 ? 'no_credits' : e.status === 429 ? 'upstream_busy' : 'upstream_error';
    const message = code === 'upstream_blocked' ? 'O provedor do modelo recusou este texto na borda (proteção anti-ataque). Tente reformular.'
      : code === 'no_credits' ? 'A conta do OpenRouter desta instalação está sem crédito. Recarregue em openrouter.ai/credits.'
      : code === 'upstream_busy' ? 'O Jev está muito requisitado agora. Tente de novo em alguns segundos.'
      : 'O Jev não respondeu desta vez. Tente de novo.';
    return send(res, e.status === 400 ? 400 : 502, { ok: false, error: { code, message } });
  }
}

// ---- /v1/llm: modelo de texto no formato da API OpenAI (chat/completions), com o mesmo orçamento ----
const CAMPOS_LLM = ['messages', 'max_tokens', 'temperature', 'top_p', 'stop', 'stream', 'presence_penalty', 'frequency_penalty', 'seed'];

function contarLlm(app, custo, tokens, erro) {
  const A = appStats(app), D = dayStats(), d = today();
  if (erro) { stats.llm.errors++; A.errors++; dirty = true; return; }
  stats.llm.calls++; stats.llm.cost += custo; stats.llm.tokens += tokens;
  stats.total.cost += custo; D.cost += custo; A.cost += custo; A.days[d] = (A.days[d] || 0) + custo;
  dirty = true;
}

function erroLlm(res, status, msg, code) {
  if (!res.headersSent) send(res, status, { error: { message: msg, code } });
}

async function llm(req, res, app) {
  if (!LLM_ON) return erroLlm(res, 503, 'O modelo de texto está desligado nesta instalação (LLM_MODEL=off).', 'llm_off');
  if (!lerPortao().ok) return erroLlm(res, 403, PORTAO_MSG, 'portao_fechado');
  let body;
  try { body = await readBody(req, res); } catch (e) { return erroLlm(res, e.status || 400, e.message, 'bad_request'); }
  if (!Array.isArray(body.messages) || !body.messages.length) return erroLlm(res, 400, 'messages obrigatório', 'bad_request');
  // aquecimento de cache do llama.cpp (max_tokens ≤ 1, sem streaming): na nuvem não existe, então responde vazio e de graça
  if (!body.stream && (+body.max_tokens || 0) <= 1) {
    return send(res, 200, { id: 'aquecimento', object: 'chat.completion', model: LLM_MODEL, choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'length' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
  }
  if (semOrcamento(app)) return erroLlm(res, 429, 'O orçamento desta instalação acabou por hoje.', 'budget_exhausted');
  const corpo = { model: LLM_MODEL, usage: { include: true } };
  for (const k of CAMPOS_LLM) if (body[k] !== undefined) corpo[k] = body[k];
  corpo.max_tokens = Math.min(LLM_MAX_TOKENS, Math.max(1, +corpo.max_tokens || 600));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  req.on('close', () => { if (!res.writableEnded) ctrl.abort(); });
  let r;
  try {
    r = await fetch(LLM_URL, { method: 'POST', signal: ctrl.signal, headers: cabecalhos(), body: JSON.stringify(corpo) });
  } catch (e) {
    clearTimeout(timer); contarLlm(app, 0, 0, true);
    return erroLlm(res, 502, 'O modelo de texto não respondeu agora.', 'llm_down');
  }
  if (!r.ok) {
    clearTimeout(timer); contarLlm(app, 0, 0, true);
    const t = await r.text().catch(() => '');
    const msg = r.status === 402 ? 'A conta do OpenRouter está sem crédito.' : `O modelo de texto respondeu ${r.status}. ${t.replace(/<[^>]+>/g, ' ').slice(0, 160)}`;
    return erroLlm(res, r.status === 402 ? 402 : 502, msg, 'llm_error');
  }
  if (!corpo.stream) {
    const j = await r.json().catch(() => null);
    clearTimeout(timer);
    if (!j) { contarLlm(app, 0, 0, true); return erroLlm(res, 502, 'Resposta inválida do modelo de texto.', 'llm_error'); }
    contarLlm(app, +(j.usage?.cost || 0), +(j.usage?.total_tokens || 0));
    return send(res, 200, j);
  }
  // streaming: repassa os eventos como chegam e lê o custo do último pedaço
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '', custo = 0, tokens = 0;
  try {
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      res.write(value);
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!linha.startsWith('data:') || linha.includes('[DONE]')) continue;
        try { const j = JSON.parse(linha.slice(5)); if (j.usage) { custo = +(j.usage.cost || 0); tokens = +(j.usage.total_tokens || 0); } } catch { /* pedaço parcial */ }
      }
    }
  } catch { /* o app cancelou a geração */ }
  clearTimeout(timer);
  contarLlm(app, custo, tokens);
  res.end();
}

function statsView() {
  const d = today();
  const apps = {};
  for (const [name, a] of Object.entries(stats.apps)) apps[name] = { calls: a.calls, questions: a.questions, cost: +a.cost.toFixed(6), input_tokens: a.input_tokens, errors: a.errors, cached: a.cached, p50_ms: pct(a.lat, 0.5), p90_ms: pct(a.lat, 0.9), today_cost: +(a.days[d] || 0).toFixed(6) };
  const all = Object.values(stats.apps).flatMap(a => a.lat);
  return {
    model: MODEL, since: stats.since, portao: { ok: lerPortao().ok, motivo: portao.motivo || undefined },
    total: { ...stats.total, cost: +stats.total.cost.toFixed(6), p50_ms: pct(all, 0.5), p90_ms: pct(all, 0.9) },
    today: { date: d, ...(stats.days[d] || { calls: 0, cost: 0 }) },
    budget: { total_usd: BUDGET_TOTAL, daily_usd: BUDGET_DAILY, app_daily_usd: APP_DAILY, app_caps: APP_CAPS, spent_total: +stats.total.cost.toFixed(6), spent_today: +((stats.days[d] || {}).cost || 0).toFixed(6) },
    llm: { model: LLM_ON ? LLM_MODEL : 'off', calls: stats.llm.calls, cost: +stats.llm.cost.toFixed(6), tokens: stats.llm.tokens, errors: stats.llm.errors },
    apps,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'POST' && url.pathname === '/v1/decide') return await decide(req, res);
    // /v1/llm/<app>/... identifica quem gastou; /v1/llm/... sozinho conta como "llm"
    const m = url.pathname.match(/^\/v1\/llm(?:\/([a-z0-9-]{1,40}))?\/(models|chat\/completions)$/);
    if (m) {
      const app = 'llm-' + (m[1] || 'apps');
      if (req.method === 'GET' && m[2] === 'models') {
        if (!LLM_ON) return send(res, 503, { error: { message: 'modelo de texto desligado' } });
        return send(res, 200, { object: 'list', data: [{ id: LLM_MODEL, object: 'model', owned_by: 'openrouter' }] });
      }
      if (req.method === 'POST' && m[2] === 'chat/completions') return await llm(req, res, app);
    }
    if (url.pathname.startsWith('/v1/stt-desligado')) return send(res, 503, { ok: false, error: { code: 'stt_off', message: 'transcrição local desligada nesta instalação' } });
    if (req.method === 'GET' && url.pathname === '/v1/stats') return send(res, 200, statsView());
    if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true, model: MODEL, portao: lerPortao().ok });
    send(res, 404, { ok: false, error: { code: 'not_found' } });
  } catch (e) {
    console.error('[gateway]', e);
    if (!res.headersSent) send(res, 500, { ok: false, error: { code: 'internal', message: e.message } });
    else res.end();
  }
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => {
  const p = lerPortao();
  console.log(`[gateway] ouvindo em :${PORT} modelo=${MODEL} texto=${LLM_ON ? LLM_MODEL : 'off'} orçamento total=$${BUDGET_TOTAL} dia=$${BUDGET_DAILY} app/dia=$${APP_DAILY} portão=${p.ok ? 'aberto' : 'FECHADO (' + p.motivo + ')'}`);
});

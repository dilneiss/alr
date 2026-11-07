// Kit de servidor compartilhado por todos os apps do Jev Apps (Node 22, zero dependências).
// Uso:
//   import { createApp } from '../../shared/server/kit.mjs';
//   const app = createApp({ name: 'golpe', publicDir: new URL('./public/', import.meta.url) });
//   app.post('/api/analisar', async ({ body, jev, ip }) => { const r = await jev({ state, questions }); return { ... , _jev: r.debug }; });
//   app.start(4112);
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARED_UI = fileURLToPath(new URL('../ui/', import.meta.url));
const GATEWAY = process.env.JEV_GATEWAY_URL || 'http://127.0.0.1:8787';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webm': 'video/webm', '.mp4': 'video/mp4',
};

export class HttpError extends Error { constructor(status, message, code) { super(message); this.status = status; this.code = code || 'error'; } }

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

// Limitador simples por chave (token bucket), para rotas do próprio app.
const buckets = new Map();
export function rateLimit(key, perMinute, burst = Math.max(5, Math.ceil(perMinute / 4))) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) { b = { t: burst, at: now }; buckets.set(key, b); }
  b.t = Math.min(burst, b.t + ((now - b.at) / 60000) * perMinute);
  b.at = now;
  if (b.t < 1) return false;
  b.t -= 1;
  return true;
}
setInterval(() => { const cut = Date.now() - 900000; for (const [k, b] of buckets) if (b.at < cut) buckets.delete(k); }, 120000).unref();

// JEV_DEBUG_FULL=1 (só em execução local, para capturar exemplos dos diagramas) devolve o estado e as respostas inteiros
const DEBUG_FULL = !!process.env.JEV_DEBUG_FULL;
function trimForDebug(v, max = 6000) {
  const s = JSON.stringify(v);
  if (DEBUG_FULL || s.length <= max) return v;
  return { _truncado: true, preview: s.slice(0, max) + '…' };
}

// Chamada ao Jev via gateway. Retorna { answers, latency_ms, cost, usage, model, cached, debug }.
export async function callJev({ app, state, questions, ip = '', cache = false, model }) {
  const t0 = performance.now();
  let r, j;
  try {
    r = await fetch(`${GATEWAY}/v1/decide`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app, state, questions, cache, model, meta: { ip } }),
    });
    j = await r.json();
  } catch (e) {
    throw new HttpError(502, 'Gateway do Jev indisponível: ' + e.message, 'gateway_down');
  }
  if (!j.ok) throw new HttpError(r.status === 429 ? 429 : 502, j.error?.message || 'Falha no Jev', j.error?.code || 'jev_error');
  const out = {
    answers: j.answers, latency_ms: j.latency_ms, total_ms: Math.round(performance.now() - t0), cost: j.cost, custo_professor: j.custo_professor,
    usage: j.usage, model: j.model, provider: j.provider, cached: j.cached,
  };
  out.debug = { request: { model: j.model, state: trimForDebug(state), questions: trimForDebug(questions, 9000) }, response: { answers: trimForDebug(j.answers, 9000), usage: j.usage }, latency_ms: j.latency_ms, cost: j.cost, custo_professor: j.custo_professor, provider: j.provider, cached: j.cached, n_questions: Object.keys(questions).length };
  return out;
}

export function createApp({ name, publicDir, maxBody = 300_000 }) {
  const routes = { GET: [], POST: [], PUT: [], DELETE: [] };
  const pub = publicDir ? fileURLToPath(publicDir) : null;

  const add = (method) => (pattern, handler, opts = {}) => routes[method].push({ pattern, handler, opts });

  function match(method, pathname) {
    for (const r of routes[method] || []) {
      if (typeof r.pattern === 'string') {
        if (r.pattern === pathname) return { r, params: {} };
        if (r.pattern.includes(':')) {
          const pp = r.pattern.split('/'), sp = pathname.split('/');
          if (pp.length !== sp.length) continue;
          const params = {}; let ok = true;
          for (let i = 0; i < pp.length; i++) {
            if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(sp[i]);
            else if (pp[i] !== sp[i]) { ok = false; break; }
          }
          if (ok) return { r, params };
        }
      } else if (r.pattern instanceof RegExp) {
        const m = pathname.match(r.pattern); if (m) return { r, params: m.groups || {} };
      }
    }
    return null;
  }

  function readBody(req, res) {
    return new Promise((resolve, reject) => {
      let size = 0, grande = false; const chunks = [];
      req.on('data', c => {
        if (grande) return; // já estourou: o resto é descartado sem guardar
        size += c.length;
        if (size <= maxBody) { chunks.push(c); return; }
        // responde o 413 ANTES de fechar: com req.destroy() na hora, o cliente via só a conexão cortada
        grande = true; chunks.length = 0;
        if (res && !res.headersSent) { res.setHeader('Connection', 'close'); res.once('finish', () => req.destroy()); }
        reject(new HttpError(413, 'Conteúdo grande demais'));
      });
      req.on('end', () => {
        if (grande) return;
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return resolve({});
        try { resolve(JSON.parse(raw)); } catch { reject(new HttpError(400, 'JSON inválido')); }
      });
      req.on('error', reject);
    });
  }

  function sendJson(res, status, obj) {
    if (res.headersSent) return;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  }

  function serveFile(res, file, req) {
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
      const ext = path.extname(file).toLowerCase();
      // HTML, JS, CSS e JSON são revalidados a cada visita (ETag): publicar um app nunca deixa arquivo velho no navegador
      const revalida = ['.html', '.js', '.mjs', '.css', '.json'].includes(ext);
      const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': revalida ? 'no-cache' : 'public, max-age=300' }); return res.end(); }
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, ETag: etag, 'Cache-Control': revalida ? 'no-cache' : 'public, max-age=300' };
      res.writeHead(200, headers);
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  function safeJoin(base, p) {
    const full = path.normalize(path.join(base, p));
    if (!full.startsWith(path.normalize(base))) return null;
    return full;
  }

  // SSE: devolve { send(event, data), close(), closed }
  function sse(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(': ok\n\n');
    const ch = { closed: false };
    const hb = setInterval(() => { if (!ch.closed) res.write(': hb\n\n'); }, 15000);
    ch.send = (event, data) => { if (ch.closed) return; res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
    ch.close = () => { if (ch.closed) return; ch.closed = true; clearInterval(hb); try { res.end(); } catch {} };
    req.on('close', () => { ch.closed = true; clearInterval(hb); ch.onclose && ch.onclose(); });
    return ch;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return sendJson(res, 400, { ok: false, error: 'Endereço inválido', code: 'bad_request' }); } // % malformado
    const ip = clientIp(req);
    try {
      if (pathname === '/healthz') return sendJson(res, 200, { ok: true, app: name });
      const m = match(req.method, pathname);
      if (m) {
        const ctx = {
          req, res, url, params: m.params, query: Object.fromEntries(url.searchParams), ip,
          body: ['POST', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req, res) : undefined,
          jev: (o) => callJev({ app: name, ip, ...o }),
          sse: () => sse(req, res),
        };
        if (m.r.opts.rate && !rateLimit(`${name}:${pathname}:${ip}`, m.r.opts.rate)) throw new HttpError(429, 'Calma! Muitas requisições seguidas. Tente de novo em alguns segundos.', 'rate_limited');
        const out = await m.r.handler(ctx);
        if (out === undefined || res.headersSent || res.writableEnded) return;
        return sendJson(res, 200, out);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 404, { ok: false, error: 'rota não encontrada' });
      // qual app é este (o botão “Arquitetura” do jev-kit.js usa quando o hostname não diz — ex.: localhost)
      if (pathname === '/_jev/app.json') return sendJson(res, 200, { ok: true, app: name });
      if (pathname.startsWith('/_jev/')) {
        const f = safeJoin(SHARED_UI, pathname.slice(6));
        return f ? serveFile(res, f, req) : sendJson(res, 400, { ok: false });
      }
      if (pub) {
        let f = safeJoin(pub, pathname === '/' ? 'index.html' : pathname);
        if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
        if (f && fs.existsSync(f)) return serveFile(res, f, req);
        // SPA fallback: rotas sem extensão caem no index.html
        if (!path.extname(pathname)) return serveFile(res, path.join(pub, 'index.html'), req);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Não encontrado');
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(`[${name}]`, e);
      sendJson(res, status, { ok: false, error: e.message || 'erro', code: e.code || 'error' });
    }
  });
  server.keepAliveTimeout = 65000;

  return {
    server,
    get: add('GET'), post: add('POST'), put: add('PUT'), delete: add('DELETE'),
    start(port = +(process.env.PORT || 3000)) {
      server.listen(port, () => console.log(`[${name}] ouvindo em :${port} (gateway ${GATEWAY})`));
      process.on('unhandledRejection', e => console.error(`[${name}] unhandledRejection`, e));
      process.on('uncaughtException', e => console.error(`[${name}] uncaughtException`, e));
      return server;
    },
    jev: (o) => callJev({ app: name, ip: 'server:' + name, ...o }),
  };
}

// Utilidades pequenas que vários apps usam
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function top(probabilities) {
  return Object.entries(probabilities || {}).sort((a, b) => b[1] - a[1]);
}
export function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
export async function pool(items, concurrency, fn) {
  const results = new Array(items.length); let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx], idx); }
  });
  await Promise.all(workers);
  return results;
}

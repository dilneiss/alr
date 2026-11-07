// Jev Auth — login único (SSO) para todos os subdomínios jev*.<seu domínio>, usado pelo Caddy via forward_auth.
//
//  • GET  /verify              (forward_auth) 200 se o cookie da sessão é válido; senão 302 para o login (páginas) ou 401 (APIs)
//  • GET  /login  POST /login  (só no hub) formulário de login; depois do login devolve a pessoa para onde ela ia
//  • GET  /logout              (hub) encerra a sessão em TODOS os apps (revogação no servidor)
//  • GET  /_auth/callback      (qualquer app) recebe um bilhete de 60 s do hub e grava o cookie daquele subdomínio
//  • GET  /_auth/logout        (qualquer app) sai e volta para o login
//
// Cookies são "host-only" (sem Domain=), então não vão para outros sites do seu domínio.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = +(process.env.PORT || 3000);
const USER = String(process.env.AUTH_USER || '').trim().toLowerCase();
const PASS_HASH = String(process.env.AUTH_PASS_HASH || '');           // scrypt:<salt hex>:<hash hex>
const SECRET = String(process.env.AUTH_SECRET || '');
const HUB = process.env.HUB_HOST || 'jev.exemplo.com';
const HOST_RE = new RegExp(process.env.ALLOWED_HOST_RE || '^(jev|jev-[a-z0-9-]+)\\.exemplo\\.com$');
const COOKIE = process.env.COOKIE_NAME || 'jev_s';
const SESSION_DAYS = +(process.env.SESSION_DAYS || 30);
const DATA_DIR = process.env.DATA_DIR || '/data';
const CSS_FILE = process.env.CSS_FILE || fileURLToPath(new URL('./jev.css', import.meta.url)); // decodifica espaços e acentos do caminho

if (!USER || !PASS_HASH.startsWith('scrypt:') || SECRET.length < 32) {
  console.error('[auth] configure AUTH_USER, AUTH_PASS_HASH (scrypt:salt:hash) e AUTH_SECRET (>= 32 chars)');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
const SESS_FILE = path.join(DATA_DIR, 'sessions.json');

// ---------- sessões (revogáveis) ----------
let sessions = {};
try { sessions = JSON.parse(fs.readFileSync(SESS_FILE, 'utf8')); } catch {}
const saveSessions = () => fs.writeFile(SESS_FILE, JSON.stringify(sessions), () => {});
function pruneSessions() { const now = Date.now(); let ch = false; for (const [k, s] of Object.entries(sessions)) if (s.exp < now) { delete sessions[k]; ch = true; } if (ch) saveSessions(); }
setInterval(pruneSessions, 3600_000).unref();

// ---------- tokens assinados ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(obj) { const p = b64u(JSON.stringify(obj)); return `${p}.${sign(p)}`; }
function readToken(tok) {
  if (!tok || typeof tok !== 'string' || tok.length > 600) return null;
  const i = tok.indexOf('.'); if (i < 1) return null;
  const p = tok.slice(0, i), s = tok.slice(i + 1);
  const exp = Buffer.from(sign(p)), got = Buffer.from(s);
  if (exp.length !== got.length || !crypto.timingSafeEqual(exp, got)) return null;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch { return null; }
}
function validSession(tok) {
  const t = readToken(tok);
  if (!t || t.k !== 's' || !t.sid) return null;
  const s = sessions[t.sid];
  if (!s || s.exp < Date.now()) return null;
  return { sid: t.sid, user: s.u };
}
const usedNonces = new Map();
setInterval(() => { const now = Date.now(); for (const [n, exp] of usedNonces) if (exp < now) usedNonces.delete(n); }, 60_000).unref();

// ---------- senha ----------
function checkPassword(pw) {
  const [, saltHex, hashHex] = PASS_HASH.split(':');
  const want = Buffer.from(hashHex, 'hex');
  const got = crypto.scryptSync(String(pw || ''), Buffer.from(saltHex, 'hex'), want.length);
  return crypto.timingSafeEqual(want, got);
}

// ---------- limite de tentativas ----------
const attempts = new Map();   // ip -> [timestamps]
function tooMany(ip) {
  const now = Date.now();
  const arr = (attempts.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  attempts.set(ip, arr);
  return arr.length >= 8;
}
function noteFail(ip) { const arr = attempts.get(ip) || []; arr.push(Date.now()); attempts.set(ip, arr); }
setInterval(() => { const now = Date.now(); for (const [ip, arr] of attempts) if (!arr.some((t) => now - t < 10 * 60_000)) attempts.delete(ip); }, 300_000).unref();

// ---------- utilidades HTTP ----------
function parseCookies(h) { const out = {}; for (const part of String(h || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); } return out; }
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const hostOf = (req) => String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
const cookieSet = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers });
  res.end(body);
}
const redirect = (res, loc, headers = {}) => send(res, 302, '', { Location: loc, ...headers });

// "next" só pode apontar para os nossos hosts (evita redirecionamento aberto)
function safeNext(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (u.protocol !== 'https:' || !HOST_RE.test(u.hostname)) return null;
    return u;
  } catch { return null; }
}
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && p.length < 2000 ? p : '/');

// Depois de logado no hub: volta para o destino. Se o destino é outro subdomínio, entrega um bilhete de 60 s.
function goNext(res, sid, rawNext, extraHeaders = {}) {
  const u = safeNext(rawNext);
  if (!u || u.hostname === HUB) return redirect(res, u ? u.pathname + u.search : '/', extraHeaders);
  const ticket = makeToken({ k: 'h', sid, aud: u.hostname, exp: Date.now() + 60_000, n: crypto.randomBytes(9).toString('base64url') });
  return redirect(res, `https://${u.hostname}/_auth/callback?t=${encodeURIComponent(ticket)}&next=${encodeURIComponent(u.pathname + u.search)}`, extraHeaders);
}

function readForm(req) {
  return new Promise((resolve) => {
    let s = ''; req.on('data', (c) => { s += c; if (s.length > 8000) req.destroy(); });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(s))));
    req.on('error', () => resolve({}));
  });
}

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loginPage({ next = '', erro = '', email = '' }) {
  const msg = erro === '1' ? 'Usuário ou senha incorretos.' : erro === 'limite' ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' : erro === 'saiu' ? 'Você saiu. Até a próxima!' : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow"><title>Entrar · Jev Apps</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
<link rel="stylesheet" href="/_auth/jev.css">
<style>
  main { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
  .box { width: min(420px, 100%); }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
  .brand b { font-size: 15px; } .brand span.s { display: block; font-size: 12px; color: var(--text-muted); }
  h1 { font-size: clamp(26px, 5vw, 34px); margin-bottom: 6px; }
  .sub { color: var(--text-muted); margin: 0 0 22px; font-size: 15px; }
  form { display: flex; flex-direction: column; gap: 14px; }
  .msg { padding: 10px 12px; border-radius: 12px; font-size: 14px; border: 1px solid rgba(239,68,68,.45); background: rgba(239,68,68,.1); color: #fecaca; }
  .msg.ok { border-color: rgba(16,185,129,.45); background: rgba(16,185,129,.1); color: #bbf7d0; }
  .jev-btn { width: 100%; min-height: 48px; font-size: 15px; }
  .foot { margin-top: 18px; font-size: 12px; color: var(--text-dim); text-align: center; }
</style></head><body>
<main><div class="box jev-card glow">
  <div class="brand"><span class="jev-logo"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>JEV</span><span><b>Jev Apps</b><span class="s">a sua instalação</span></span></div>
  <h1><span class="grad-text">Entrar</span></h1>
  <p class="sub">Os seus apps do Jev são privados. Entre uma vez e todos os links ficam liberados neste navegador.</p>
  ${msg ? `<div class="msg${erro === 'saiu' ? ' ok' : ''}" role="alert">${esc(msg)}</div>` : ''}
  <form method="post" action="/login" autocomplete="on">
    <input type="hidden" name="next" value="${esc(next)}">
    <div><label class="jev-label" for="email">Usuário ou e-mail</label><input class="jev-input" id="email" name="email" type="text" autocapitalize="none" required autocomplete="username" value="${esc(email)}" autofocus></div>
    <div><label class="jev-label" for="password">Senha</label><input class="jev-input" id="password" name="password" type="password" required autocomplete="current-password"></div>
    <button class="jev-btn jev-btn--primary" type="submit">Entrar</button>
  </form>
  <div class="foot">Sessão válida por ${SESSION_DAYS} dias · conexão protegida (HTTPS)</div>
</div></main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const host = hostOf(req);
  const ck = parseCookies(req.headers.cookie)[COOKIE];
  try {
    // ---- verificação do Caddy (forward_auth) ----
    if (url.pathname === '/verify') {
      const s = validSession(ck);
      if (s) return send(res, 200, '', { 'X-Jev-User': s.user });
      const method = String(req.headers['x-forwarded-method'] || 'GET').toUpperCase();
      const uri = String(req.headers['x-forwarded-uri'] || '/');
      const wantsHtml = /text\/html/.test(String(req.headers.accept || ''));
      if ((method === 'GET' || method === 'HEAD') && wantsHtml && HOST_RE.test(host)) {
        return redirect(res, `https://${HUB}/login?next=${encodeURIComponent(`https://${host}${safePath(uri)}`)}`);
      }
      return send(res, 401, JSON.stringify({ ok: false, error: `Acesso restrito. Entre em https://${HUB}` }), { 'Content-Type': 'application/json; charset=utf-8' });
    }
    if (url.pathname === '/healthz') return send(res, 200, JSON.stringify({ ok: true, app: 'auth' }), { 'Content-Type': 'application/json' });
    if (url.pathname === '/_auth/jev.css') {
      return fs.readFile(CSS_FILE, (err, buf) => err ? send(res, 404, '') : send(res, 200, buf, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }));
    }

    // ---- hub: login / logout ----
    if (url.pathname === '/login' && host === HUB) {
      if (req.method === 'GET') {
        const s = validSession(ck);
        if (s) return goNext(res, s.sid, url.searchParams.get('next'));
        return send(res, 200, loginPage({ next: url.searchParams.get('next') || '', erro: url.searchParams.get('erro') || '' }), { 'Content-Type': 'text/html; charset=utf-8' });
      }
      if (req.method === 'POST') {
        const ip = clientIp(req);
        const f = await readForm(req);
        const nextQ = f.next ? `&next=${encodeURIComponent(f.next)}` : '';
        if (tooMany(ip)) return send(res, 303, '', { Location: `/login?erro=limite${nextQ}` });
        const ok = String(f.email || '').trim().toLowerCase() === USER && checkPassword(f.password);
        if (!ok) {
          noteFail(ip);
          await new Promise((r) => setTimeout(r, 450));
          console.log(`[auth] login recusado ip=${crypto.createHash('sha1').update(ip).digest('hex').slice(0, 10)}`);
          return send(res, 303, '', { Location: `/login?erro=1${nextQ}` });
        }
        const sid = crypto.randomBytes(18).toString('base64url');
        sessions[sid] = { u: USER, created: Date.now(), exp: Date.now() + SESSION_DAYS * 86400_000 };
        saveSessions();
        console.log(`[auth] login ok sid=${sid.slice(0, 6)}…`);
        const tok = makeToken({ k: 's', sid });
        return goNext(res, sid, f.next || '', { 'Set-Cookie': cookieSet(tok, SESSION_DAYS * 86400) });
      }
    }
    if (url.pathname === '/logout' && host === HUB) {
      const s = validSession(ck);
      if (s) { delete sessions[s.sid]; saveSessions(); }
      return redirect(res, '/login?erro=saiu', { 'Set-Cookie': cookieSet('', 0) });
    }

    // ---- qualquer app: recebe o bilhete do hub e grava o cookie deste subdomínio ----
    if (url.pathname === '/_auth/callback') {
      const t = readToken(url.searchParams.get('t'));
      const nxt = safePath(url.searchParams.get('next'));
      const valid = t && t.k === 'h' && t.aud === host && t.exp > Date.now() && !usedNonces.has(t.n) && sessions[t.sid] && sessions[t.sid].exp > Date.now();
      if (!valid) return redirect(res, `https://${HUB}/login?next=${encodeURIComponent(`https://${host}${nxt}`)}`);
      usedNonces.set(t.n, t.exp);
      const tok = makeToken({ k: 's', sid: t.sid });
      const maxAge = Math.max(60, Math.floor((sessions[t.sid].exp - Date.now()) / 1000));
      return redirect(res, nxt, { 'Set-Cookie': cookieSet(tok, maxAge) });
    }
    if (url.pathname === '/_auth/logout') {
      return redirect(res, `https://${HUB}/logout`, { 'Set-Cookie': cookieSet('', 0) });
    }
    return send(res, 404, 'Não encontrado', { 'Content-Type': 'text/plain; charset=utf-8' });
  } catch (e) {
    console.error('[auth]', e);
    return send(res, 500, 'Erro', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});
server.listen(PORT, () => console.log(`[auth] ouvindo em :${PORT} hub=${HUB} usuário=${USER} sessões=${Object.keys(sessions).length}`));

// Servidor deste app-modelo do Jev — roda no seu computador, sem instalar nada (Node 22 ou mais novo).
//   1) copie .env.exemplo para .env e coloque a sua chave do OpenRouter (https://openrouter.ai/keys)
//   2) node server.mjs
//   3) abra http://localhost:3000
// A chave fica só aqui no servidor: o navegador nunca vê a chave.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { montar, conferirModelo, ErroEntrada } from './decidir.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(DIR, 'public');

// .env simples (CHAVE=valor por linha)
try {
  for (const linha of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sem .env: usa as variáveis do sistema */ }

const CHAVE = (process.env.OPENROUTER_API_KEY || '').trim();
const MODELO = process.env.JEV_MODEL || 'typesafe/jev-1.13';
const URL_JEV = process.env.JEV_URL || 'https://openrouter.ai/api/alpha/decisions';
const PORTA = +(process.env.PORT || 3000);
if (!CHAVE) { console.error('Falta a chave: crie o arquivo .env com OPENROUTER_API_KEY=sk-or-...'); process.exit(1); }
// Portão do Kit Jev: este app só roda para quem tem VPS da Hostinger (o kit grava o portao.json ao exportar)
try {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, 'portao.json'), 'utf8'));
  if (!(p.ok === true && p.fonte === 'api-hostinger' && p.vps_id)) throw new Error('carimbo inválido');
} catch {
  console.error('Este app é do Kit Jev e só roda para quem tem uma VPS da Hostinger. Exporte-o pelo kit: node kit/jev-kit.mjs exportar <id>');
  process.exit(3);
}

const spec = (await import(pathToFileURL(path.join(PUB, 'app.config.mjs')).href)).default;
const problemas = conferirModelo(spec);
if (problemas.length) console.warn('Atenção, o app.config.mjs tem problemas:\n - ' + problemas.join('\n - '));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webm': 'video/webm', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };

// limite simples por IP (protege a sua chave se você publicar o app)
const baldes = new Map();
function permitir(ip, porMinuto = 90) {
  const agora = Date.now(); let b = baldes.get(ip);
  if (!b) { b = { t: porMinuto / 3, em: agora }; baldes.set(ip, b); }
  b.t = Math.min(porMinuto / 3, b.t + ((agora - b.em) / 60000) * porMinuto); b.em = agora;
  if (b.t < 1) return false; b.t -= 1; return true;
}

async function perguntarAoJev(state, questions) {
  const t0 = performance.now();
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await fetch(URL_JEV, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', 'X-Title': `Kit Jev · ${spec.titulo}` },
      body: JSON.stringify({ model: MODELO, state, questions }),
    });
    const texto = await r.text();
    let j; try { j = JSON.parse(texto); } catch { j = { error: { message: texto.slice(0, 200) } }; }
    if (r.ok && j.answers) return { j, ms: performance.now() - t0 };
    if (/<!DOCTYPE html|Attention Required/i.test(texto)) throw Object.assign(new Error('O provedor recusou este texto na borda (proteção anti-ataque). Reformule o texto.'), { status: 502 });
    if (r.status === 402) throw Object.assign(new Error('Sua conta do OpenRouter está sem crédito.'), { status: 402 });
    if (!(r.status === 429 || r.status >= 500)) throw Object.assign(new Error(j.error?.message || `Erro ${r.status} do OpenRouter`), { status: 502 });
    await new Promise((ok) => setTimeout(ok, 400 + Math.random() * 400));
  }
  throw Object.assign(new Error('O Jev não respondeu agora. Tente de novo.'), { status: 502 });
}

function json(res, status, obj) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && url.pathname === '/api/decidir') {
      const ip = req.socket.remoteAddress || '';
      if (!permitir(ip)) return json(res, 429, { ok: false, error: 'Muitas decisões seguidas. Espere alguns segundos.' });
      let corpo = '';
      for await (const pedaco of req) { corpo += pedaco; if (corpo.length > 120000) return json(res, 413, { ok: false, error: 'Conteúdo grande demais' }); }
      let entrada; try { entrada = JSON.parse(corpo || '{}'); } catch { return json(res, 400, { ok: false, error: 'JSON inválido' }); }
      let m; try { m = montar(spec, entrada); } catch (e) { return json(res, e instanceof ErroEntrada ? 400 : 500, { ok: false, error: e.message }); }
      const { j, ms } = await perguntarAoJev(m.state, m.questions);
      const custo = +(j.usage?.cost || 0);
      return json(res, 200, {
        ok: true, ...m.ler(j.answers), latencia_ms: Math.round(ms), custo,
        _jev: { request: { model: j.model, state: m.state, questions: m.questions }, response: { answers: j.answers, usage: j.usage }, latency_ms: Math.round(ms), cost: custo, n_questions: Object.keys(m.questions).length },
      });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 404, { ok: false, error: 'rota não encontrada' });
    let arq = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
    if (!arq.startsWith(PUB)) return json(res, 400, { ok: false });
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
    if (!fs.existsSync(arq)) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(arq).pipe(res);
  } catch (e) {
    json(res, e.status || 500, { ok: false, error: e.message });
  }
});
servidor.listen(PORTA, () => console.log(`\n${spec.emoji} ${spec.titulo}\nAbra http://localhost:${PORTA}  (Ctrl+C para parar)\n`));

// Leitura da tela no NOSSO servidor: Tesseract 5 (por+eng) em modo TSV → linhas com posição (para desenhar as caixas
// sobre a captura). A imagem nunca sai daqui; só o texto das linhas vai para o Jev. Resultado em cache por hash.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const BIN = process.env.TESSERACT_BIN || 'tesseract';
const LANGS = process.env.OCR_LANGS || 'por+eng';
const MAX_PARALELO = +(process.env.OCR_CONCURRENCY || 2);
const cache = new Map();
let ativos = 0;
const espera = [];

function vez() {
  if (ativos < MAX_PARALELO) { ativos++; return Promise.resolve(); }
  if (espera.length >= 12) return Promise.reject(Object.assign(new Error('Muitas telas sendo lidas agora. Tente de novo em alguns segundos.'), { status: 429, code: 'ocr_busy' }));
  return new Promise((r) => espera.push(r));
}
function liberar() { const n = espera.shift(); if (n) n(); else ativos--; }

function rodar(args, entrada, timeoutMs) {
  return new Promise((resolve, reject) => {
    // 1 thread por processo foi mais rápido que o OpenMP no VPS (1,6 s × 2,4 s numa tela 1440×900)
    const p = spawn(BIN, args, { env: { ...process.env, OMP_THREAD_LIMIT: '1' } });
    const out = [], err = [];
    const kill = setTimeout(() => { p.kill('SIGKILL'); reject(Object.assign(new Error('A leitura da tela demorou demais.'), { status: 504, code: 'ocr_timeout' })); }, timeoutMs);
    p.stdout.on('data', (c) => out.push(c));
    p.stderr.on('data', (c) => err.push(c));
    p.on('error', (e) => { clearTimeout(kill); reject(Object.assign(new Error('OCR indisponível no servidor: ' + e.message), { status: 503, code: 'ocr_down' })); });
    p.on('close', (code) => {
      clearTimeout(kill);
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'));
      else reject(Object.assign(new Error('Não consegui ler esta imagem.'), { status: 422, code: 'ocr_falhou', detalhe: Buffer.concat(err).toString('utf8').slice(0, 300) }));
    });
    p.stdin.on('error', () => {});
    p.stdin.end(entrada);
  });
}

// TSV: level page block par line word left top width height conf text
function linhasDoTsv(tsv) {
  const mapa = new Map();
  let largura = 0, altura = 0;
  for (const row of tsv.split('\n').slice(1)) {
    const c = row.split('\t');
    if (c.length < 12) continue;
    const [level, , block, par, line, , left, top, width, height, conf] = c.slice(0, 11).map(Number);
    const text = c.slice(11).join('\t').trim();
    if (level === 1) { largura = width; altura = height; continue; }
    if (level !== 5 || !text || conf < 0) continue;
    const k = `${block}.${par}.${line}`;
    let l = mapa.get(k);
    if (!l) { l = { b: block, p: par, words: [], confs: [], x0: left, y0: top, x1: left + width, y1: top + height }; mapa.set(k, l); }
    l.words.push(text); l.confs.push(conf);
    l.x0 = Math.min(l.x0, left); l.y0 = Math.min(l.y0, top); l.x1 = Math.max(l.x1, left + width); l.y1 = Math.max(l.y1, top + height);
  }
  const linhas = [];
  for (const l of mapa.values()) {
    const t = l.words.join(' ').replace(/\s+/g, ' ').trim();
    const conf = l.confs.reduce((a, b) => a + b, 0) / l.confs.length;
    const letras = (t.match(/[\p{L}\p{N}]/gu) || []).length;
    if (letras < 2 || conf < 35) continue;              // ruído: ícones, bordas, pixels soltos
    linhas.push({ t: t.slice(0, 220), b: l.b, p: l.p, x: l.x0, y: l.y0, w: l.x1 - l.x0, h: l.y1 - l.y0, conf: Math.round(conf) });
  }
  linhas.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return { linhas, largura, altura };
}

export async function lerTela(buf) {
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20);
  const c = cache.get(hash);
  if (c) { cache.delete(hash); cache.set(hash, c); return { ...c, hash, cache: true }; }
  await vez();
  try {
    const t0 = performance.now();
    const tsv = await rodar(['stdin', 'stdout', '-l', LANGS, '--psm', '3', 'tsv'], buf, 25000);
    const r = { ...linhasDoTsv(tsv), ms: Math.round(performance.now() - t0) };
    cache.set(hash, r);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return { ...r, hash, cache: false };
  } finally { liberar(); }
}

// Itens que vão ao Jev (1 pergunta por item, no máximo `max`): linhas; se passar do teto, junta as linhas de cada
// parágrafo; se ainda passar, fica com os primeiros na ordem de leitura. Cada item lembra as caixas que cobre.
const onde = (x, y, w, h, W, H) => {
  if (!W || !H) return undefined;
  const cx = (x + w / 2) / W, cy = (y + h / 2) / H;
  return `${cx < 0.3 ? 'esquerda' : cx > 0.7 ? 'direita' : 'centro'}, ${cy < 0.1 ? 'topo' : cy > 0.9 ? 'rodapé' : 'meio'}${w / W > 0.45 ? ', linha larga' : ''}`;
};

export function itensParaJev(linhas, max = 44, maxChars = 3200, largura = 0, altura = 0) {
  let grupos = linhas.map((l, i) => ({ idx: [i], t: l.t }));
  if (grupos.length > max) {
    const porPar = new Map();
    linhas.forEach((l, i) => { const k = `${l.b}.${l.p}`; const g = porPar.get(k) || { idx: [], t: '' }; g.idx.push(i); g.t = (g.t + ' ' + l.t).trim(); porPar.set(k, g); });
    grupos = [...porPar.values()].sort((a, b) => a.idx[0] - b.idx[0]);
  }
  const out = [];
  let chars = 0;
  for (const g of grupos) {
    if (out.length >= max || chars >= maxChars) break;
    const t = g.t.slice(0, 240);
    chars += t.length;
    const ls = g.idx.map((i) => linhas[i]);
    const x = Math.min(...ls.map((l) => l.x)), y = Math.min(...ls.map((l) => l.y));
    const w = Math.max(...ls.map((l) => l.x + l.w)) - x, h = Math.max(...ls.map((l) => l.y + l.h)) - y;
    out.push({ id: 'l' + String(out.length + 1).padStart(2, '0'), t, idx: g.idx, onde: onde(x, y, w, h, largura, altura) });
  }
  return out;
}

// Estúdio por Voz — a pessoa fala do negócio e 5 peças (site, identidade visual, 3 carrosséis de Instagram, e-mail
// marketing com assinatura e anúncios de display) se montam AO MESMO TEMPO, mudando enquanto ela fala. A cada pausa na
// fala a transcrição vem para cá e disparamos 6 chamadas PARALELAS ao Jev (uma por grupo, 89 perguntas tipadas no total).
// Cada grupo volta por SSE assim que o Jev responde, para o painel correspondente acender na hora.
// Extra (botão): o modelo de texto reescreve os textos com base na fala + decisões do Jev, em streaming.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import { streamLocal, localReady, localInfo } from '../../shared/server/llm.mjs';
import { PERGUNTAS, GRUPOS, TOTAL, POR_GRUPO, META, estado, ROTA, CONTEXTO_ROTA, ALVOS, perguntasComando, estadoComando } from './public/lib/perguntas.mjs';
import crypto from 'node:crypto';
import { montarPrompt, LIMITE_TOKENS } from './public/lib/escritor.mjs';
import { PERGUNTAS_AJUSTE, IDS_AJUSTE, interpretarAjustes, modoDoComando, lerMarca } from './public/lib/ajustes.mjs';
import { PALETAS } from './public/lib/biblioteca.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const EXEMPLOS = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'exemplos.json'), 'utf8'));
const IDS_EXEMPLO = new Set(EXEMPLOS.map((e) => e.id));

const LIMITES = { textoMin: 3, textoMax: 3000, jevMax: 1500, porSessao: +(process.env.MAX_UPDATES_PER_SESSION || 260) };

// ---------- estatística global (só contadores) ----------
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { atualizacoes: 0, decisoes: 0, textos_ia: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let sujo = false;
setInterval(() => { if (sujo) { sujo = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 3000).unref();

// ---------- economia: falas simuladas (exemplos) são ao vivo até uma cota por IP/hora; depois o gateway ----------
// reaproveita a resposta idêntica em cache. Microfone e texto digitado são sempre ao vivo.
const SIM_AO_VIVO_POR_HORA = +(process.env.SIM_LIVE_PER_IP_HOUR || 120);
const cotaSim = new Map();
function simAoVivo(ip) {
  const agora = Date.now();
  let b = cotaSim.get(ip);
  if (!b || agora - b.at > 3600e3) { b = { n: 0, at: agora }; cotaSim.set(ip, b); }
  if (b.n >= SIM_AO_VIVO_POR_HORA) return false;
  b.n++;
  return true;
}
setInterval(() => { const corte = Date.now() - 3600e3; for (const [k, b] of cotaSim) if (b.at < corte) cotaSim.delete(k); }, 600e3).unref();

const limpar = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const app = createApp({ name: 'estudio', publicDir: new URL('./public/', import.meta.url), maxBody: 400_000 });

app.get('/api/config', async () => ({
  ok: true, exemplos: EXEMPLOS, total: TOTAL, por_grupo: POR_GRUPO, grupos: GRUPOS, limites: LIMITES,
  local: { ...localInfo(), max_tokens: LIMITE_TOKENS }, stats,
}));
app.get('/api/stats', () => ({ ok: true, ...stats }));
app.get('/api/local', async () => ({ ok: true, pronto: await localReady(), ...localInfo() }));

// ---------- decisões do Jev: 6 chamadas em paralelo, cada grupo volta por SSE assim que fica pronto ----------
app.post('/api/decidir', async ({ body, jev, ip, sse }) => {
  const texto = limpar(body && body.texto, LIMITES.textoMax + 1);
  if (texto.length < LIMITES.textoMin) throw new HttpError(400, 'Fale ou digite um pouco sobre o seu negócio.');
  if (texto.length > LIMITES.textoMax) throw new HttpError(400, `Texto longo demais (máximo ${LIMITES.textoMax} caracteres).`);
  const paraJev = texto.length > LIMITES.jevMax ? '…' + texto.slice(-LIMITES.jevMax) : texto;
  const exemplo = IDS_EXEMPLO.has(String(body.exemplo || ''));
  const cache = exemplo ? !simAoVivo(ip) : false;
  const st = estado(paraJev);
  const seq = Number.isFinite(+body.seq) ? +body.seq : 0;
  // roteador: com algo já criado, o Jev diz se a última fala descreve o negócio ou manda mudar uma peça (em paralelo)
  const ultima = limpar(body && body.ultima, 400);
  const comRota = !!(body && body.rota) && ultima.length >= 3;

  const ch = sse();
  const t0 = performance.now();
  let n = 0, custo = 0, erros = 0, maxLat = 0, cacheados = 0;
  const rota = comRota ? (async () => {
    try {
      const r = await jev({ state: { contexto: CONTEXTO_ROTA, ultima_fala: ultima }, questions: ROTA, cache });
      const a = r.answers, pr = (q) => (a[q] && a[q].probabilities && a[q].probabilities[a[q].choice]) || 0;
      custo += r.cost || 0;
      ch.send('rota', { seq, ultima, tipo: a.tipo.choice, p_tipo: pr('tipo'), alvo: a.alvo.choice, p_alvo: pr('alvo'), latency_ms: r.latency_ms, cost: r.cost, _jev: r.debug });
    } catch (e) { ch.send('rota', { seq, ultima, erro: true, mensagem: e.message }); }
  })() : null;
  await Promise.all([rota, ...GRUPOS.map(async (g) => {
    try {
      const r = await jev({ state: st, questions: PERGUNTAS[g.id], cache });
      const nq = POR_GRUPO[g.id];
      n += nq; custo += r.cost || 0; if (r.cached) cacheados++;
      if (!r.cached) maxLat = Math.max(maxLat, r.latency_ms || 0);
      ch.send('grupo', { seq, grupo: g.id, n: nq, answers: r.answers, latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, t: Math.round(performance.now() - t0), _jev: r.debug });
    } catch (e) {
      erros++;
      ch.send('falha', { seq, grupo: g.id, code: e.code || 'erro', status: e.status || 500, mensagem: e.message || 'Falha no Jev' });
    }
  })]);
  ch.send('fim', { seq, n, custo, erros, cacheados, latencia_max: maxLat, ms: Math.round(performance.now() - t0) });
  ch.close();
  if (n) { stats.atualizacoes++; stats.decisoes += n; sujo = true; }
  return undefined;
}, { rate: 70 });

// ---------- modelo de texto: reescreve os textos com a fala + decisões do Jev (streaming) ----------
const gerando = new Set();
app.post('/api/escrever', async ({ body, ip, sse }) => {
  const texto = limpar(body && body.texto, LIMITES.textoMax);
  if (texto.length < LIMITES.textoMin) throw new HttpError(400, 'Fale sobre o seu negócio primeiro — a IA de texto escreve a partir da sua fala.');
  const d = body && typeof body.decisoes === 'object' && body.decisoes ? body.decisoes : {};
  if (gerando.has(ip)) throw new HttpError(429, 'Já estou escrevendo os seus textos — espere terminar.', 'llm_um_por_vez');
  if (!(await localReady())) throw new HttpError(503, 'O modelo de texto está carregando agora (leva alguns minutos depois de reiniciar o servidor). Enquanto isso, os textos vêm da biblioteca escolhida pelo Jev.', 'llm_down');
  const info = localInfo();
  if (info.running && info.waiting >= +(process.env.LOCAL_LLM_MAX_QUEUE || 8)) throw new HttpError(429, 'A fila do modelo de texto está cheia agora. Tente de novo em alguns segundos.', 'llm_busy');

  const messages = montarPrompt(texto, d);
  gerando.add(ip);
  const ch = sse();
  const ctrl = new AbortController();
  ch.onclose = () => ctrl.abort();
  ch.send('inicio', { modelo: info.label, fila: info.running ? info.waiting + 1 : 0 });
  let lote = '', ultimo = 0, ntok = 0;
  const t0 = performance.now();
  try {
    const r = await streamLocal({
      messages, max_tokens: LIMITE_TOKENS, temperature: 0.7, top_p: 0.9, signal: ctrl.signal,
      onQueued: (pos) => ch.send('fila', { posicao: pos }),
      onToken: (delta) => {
        lote += delta; ntok++;
        const agora = performance.now();
        if (agora - ultimo > 45) { ch.send('tok', { t: lote, n: ntok }); lote = ''; ultimo = agora; }
      },
    });
    if (lote) ch.send('tok', { t: lote, n: ntok });
    ch.send('fim', { ms: r.ms, primeiro_ms: r.first_token_ms, tokens: r.tokens, tok_s: r.tok_s, modelo: r.model, custo: 0 });
    stats.textos_ia++; sujo = true;
  } catch (e) {
    if (!ctrl.signal.aborted) ch.send('erro', { code: e.code || 'llm_error', mensagem: e.message || 'O modelo de texto falhou.', ms: Math.round(performance.now() - t0) });
  } finally {
    gerando.delete(ip);
    ch.close();
  }
  return undefined;
}, { rate: 8 });

// ---------- roteador de uma frase que terminou: descreve o negócio ou manda mudar uma peça? ----------
app.post('/api/rota', async ({ body, jev, ip }) => {
  const ultima = limpar(body && body.ultima, 400);
  if (ultima.length < 3) throw new HttpError(400, 'Frase curta demais.');
  const exemplo = IDS_EXEMPLO.has(String((body && body.exemplo) || ''));
  const r = await jev({ state: { contexto: CONTEXTO_ROTA, ultima_fala: ultima }, questions: ROTA, cache: exemplo ? !simAoVivo(ip) : false });
  const a = r.answers, pr = (q) => (a[q] && a[q].probabilities && a[q].probabilities[a[q].choice]) || 0;
  return { ok: true, ultima, tipo: a.tipo.choice, p_tipo: pr('tipo'), alvo: a.alvo.choice, p_alvo: pr('alvo'), latency_ms: r.latency_ms, cost: r.cost, _jev: r.debug };
}, { rate: 90 });

// paleta de hoje para resolver "cor da marca": a que o cliente manda em `marca.cores`; senão, a da escolha atual (atuais.paleta)
function marcaDoCorpo(body) {
  const m = lerMarca(body && body.marca);
  if (m) return m;
  const pal = body && body.atuais && typeof body.atuais === 'object' ? String(body.atuais.paleta || '') : '';
  const p = pal && PALETAS.find((x) => x.id === pal || x.rotulo === pal);
  return p ? lerMarca({ cores: p.c }) : null;
}

// ---------- comando por voz ou digitado: (rota, se faltar) + novas escolhas da peça pedida + ajustes livres ----------
// Numa chamada só vão as perguntas da peça (com "manter") e as do ajuste (aj_*: fundo, degradê, caixa alta, tamanho…).
// A resposta de sempre ganha `modo` ('biblioteca' | 'ajuste' | 'ambos' | 'nenhum') e `ajustes` (sempre um array).
// `answers` continua sendo só a das perguntas da peça (null quando o alvo não tem): aplique-as com modo biblioteca ou ambos.
app.post('/api/comando', async ({ body, jev }) => {
  const comando = limpar(body && body.comando, 400);
  if (comando.length < 3) throw new HttpError(400, 'Diga ou digite o que quer mudar (ex.: “muda o logo pra ficar tipo selo”).');
  const descricao = limpar(body && body.descricao, LIMITES.jevMax);
  let tipo = String((body && body.tipo) || ''), alvo = String((body && body.alvo) || '');
  const t0 = performance.now();
  let custo = 0, rotaDbg = null, pTipo = null, pAlvo = null;
  if (!ROTA.tipo.criteria[tipo] || !ROTA.alvo.criteria[alvo]) {
    const r = await jev({ state: { contexto: CONTEXTO_ROTA, ultima_fala: comando }, questions: ROTA });
    const a = r.answers, pr = (q) => (a[q] && a[q].probabilities && a[q].probabilities[a[q].choice]) || 0;
    tipo = a.tipo.choice; alvo = a.alvo.choice; pTipo = pr('tipo'); pAlvo = pr('alvo'); custo += r.cost || 0; rotaDbg = r.debug;
  }
  const atuais = {};
  const recebidos = body && typeof body.atuais === 'object' && body.atuais ? body.atuais : {};
  for (const q of ALVOS[alvo] || []) if (recebidos[q] != null) atuais[q] = limpar(recebidos[q], 80);
  let answers = null, dbg = null, lat = null, modo = 'nenhum', ajustes = [], answersAjuste = null;
  if (tipo === 'comando_de_edicao') {
    // alvo tudo, nenhum ou fora de ALVOS: vão só as perguntas do ajuste (e as da peça, quando existem)
    const qPeca = ALVOS[alvo] ? perguntasComando(alvo, atuais) : {};
    const r = await jev({ state: estadoComando(descricao, comando, atuais), questions: { ...qPeca, ...PERGUNTAS_AJUSTE } });
    const a = r.answers || {};
    const idsPeca = Object.keys(qPeca).filter((q) => a[q]);
    answers = idsPeca.length ? Object.fromEntries(idsPeca.map((q) => [q, a[q]])) : null;
    answersAjuste = Object.fromEntries(IDS_AJUSTE.filter((q) => a[q]).map((q) => [q, a[q]]));
    ajustes = interpretarAjustes(answersAjuste, comando, alvo, marcaDoCorpo(body));
    modo = modoDoComando({ tipo, answers: answersAjuste, ajustes, temBiblioteca: !!ALVOS[alvo] || alvo === 'tudo' });
    dbg = r.debug; lat = r.latency_ms; custo += r.cost || 0;
    stats.decisoes += Object.keys(a).length; sujo = true;
  }
  return { ok: true, tipo, alvo, p_tipo: pTipo, p_alvo: pAlvo, answers, modo, ajustes, answers_ajuste: answersAjuste, latency_ms: lat, custo, ms: Math.round(performance.now() - t0), _jev: [rotaDbg, dbg].filter(Boolean) };
}, { rate: 40 });

// ---------- projetos e versões: cada estado vira uma "receita" (decisões + travas + textos) que redesenha tudo ----------
const PROJ = path.join(DATA_DIR, 'projetos');
fs.mkdirSync(PROJ, { recursive: true });
const MAX_VERSOES = 300, MAX_PROJETOS = 200;
const idOk = (s) => /^[a-z0-9]{10}$/.test(String(s || ''));
const novoId = () => crypto.randomBytes(8).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(10, '0').slice(0, 10);
const arqIndice = (id) => path.join(PROJ, `${id}.json`);
function lerIndice(id) {
  if (!idOk(id)) throw new HttpError(404, 'Projeto não encontrado.');
  try { return JSON.parse(fs.readFileSync(arqIndice(id), 'utf8')); } catch { throw new HttpError(404, 'Projeto não encontrado.'); }
}
function gravar(arq, obj) { const tmp = arq + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, arq); }
function podar() {
  const ids = fs.readdirSync(PROJ).filter((f) => /^[a-z0-9]{10}\.json$/.test(f)).map((f) => f.slice(0, 10));
  if (ids.length <= MAX_PROJETOS) return;
  const velhos = ids.map((id) => { try { return [id, fs.statSync(arqIndice(id)).mtimeMs]; } catch { return [id, 0]; } }).sort((a, b) => a[1] - b[1]).slice(0, ids.length - MAX_PROJETOS);
  for (const [id] of velhos) { fs.rmSync(arqIndice(id), { force: true }); fs.rmSync(path.join(PROJ, id), { recursive: true, force: true }); }
}
app.post('/api/projetos', ({ body }) => {
  const id = novoId(), agora = Date.now();
  const idx = { id, nome: limpar(body && body.nome, 40), criado: agora, atualizado: agora, versoes: [] };
  fs.mkdirSync(path.join(PROJ, id), { recursive: true });
  gravar(arqIndice(id), idx);
  podar();
  return { ok: true, id };
}, { rate: 30 });
app.get('/api/projetos', () => {
  const lista = [];
  for (const f of fs.readdirSync(PROJ)) {
    if (!/^[a-z0-9]{10}\.json$/.test(f)) continue;
    try {
      const i = JSON.parse(fs.readFileSync(path.join(PROJ, f), 'utf8'));
      if (!i.versoes.length) continue;
      const u = i.versoes[i.versoes.length - 1];
      lista.push({ id: i.id, nome: i.nome, atualizado: i.atualizado, n: i.versoes.length, ultima: u.id, cores: u.resumo && u.resumo.cores, seg: u.resumo && u.resumo.seg });
    } catch { /* índice corrompido: ignora */ }
  }
  lista.sort((a, b) => b.atualizado - a.atualizado);
  return { ok: true, projetos: lista.slice(0, 40) };
});
app.get('/api/projetos/:id', ({ params }) => ({ ok: true, projeto: lerIndice(params.id) }));
app.post('/api/projetos/:id/versoes', ({ params, body }) => {
  const idx = lerIndice(params.id);
  const receita = body && body.receita;
  if (!receita || typeof receita !== 'object' || !receita.R) throw new HttpError(400, 'Versão sem receita.');
  const j = JSON.stringify(receita);
  if (j.length > 300_000) throw new HttpError(413, 'Versão grande demais.');
  // miniatura do logo: só SVG simples (sem script, foreignObject, eventos ou links externos); o resto é descartado
  const svg = typeof body.logo_svg === 'string' ? body.logo_svg : '';
  const logo = svg.startsWith('<svg') && svg.length < 40_000 && !/<script|<foreignObject|<iframe|<use\b|\son[a-z]+\s*=|javascript:|href\s*=\s*["'](?!#)/i.test(svg) ? svg : '';
  const n = (idx.versoes.length ? idx.versoes[idx.versoes.length - 1].n : 0) + 1;
  const vid = 'v' + String(n).padStart(4, '0');
  const sel = {};
  for (const [q, v] of Object.entries((body && body.sel) || {})) if (META[q] && (typeof v === 'string' || typeof v === 'number')) sel[q] = typeof v === 'string' ? v.slice(0, 40) : v;
  const resumo = body && typeof body.resumo === 'object' && body.resumo ? JSON.parse(JSON.stringify(body.resumo, (k, v) => (typeof v === 'string' ? v.slice(0, 120) : v))) : {};
  const meta = { id: vid, n, t: Date.now(), motivo: limpar(body && body.motivo, 20), rotulo: limpar(body && body.rotulo, 140), alvo: limpar(body && body.alvo, 12), sel, resumo, logo: !!logo };
  fs.mkdirSync(path.join(PROJ, idx.id), { recursive: true });
  gravar(path.join(PROJ, idx.id, `${vid}.json`), receita);
  if (logo) fs.writeFileSync(path.join(PROJ, idx.id, `${vid}.svg`), logo);
  idx.versoes.push(meta);
  if (idx.versoes.length > MAX_VERSOES) {
    for (const v of idx.versoes.splice(0, idx.versoes.length - MAX_VERSOES)) { fs.rmSync(path.join(PROJ, idx.id, `${v.id}.json`), { force: true }); fs.rmSync(path.join(PROJ, idx.id, `${v.id}.svg`), { force: true }); }
  }
  if (resumo.nome) idx.nome = String(resumo.nome).slice(0, 40);
  idx.atualizado = meta.t;
  gravar(arqIndice(idx.id), idx);
  return { ok: true, versao: meta };
}, { rate: 120 });
app.get('/api/projetos/:id/versoes/:vid', ({ params }) => {
  const idx = lerIndice(params.id);
  if (!idx.versoes.some((v) => v.id === params.vid)) throw new HttpError(404, 'Versão não encontrada.');
  return { ok: true, receita: JSON.parse(fs.readFileSync(path.join(PROJ, idx.id, `${params.vid}.json`), 'utf8')) };
});
app.get('/api/projetos/:id/versoes/:vid/logo', ({ params, res }) => {
  const idx = lerIndice(params.id);
  const v = idx.versoes.find((x) => x.id === params.vid);
  const arq = v && path.join(PROJ, idx.id, `${v.id}.svg`);
  if (!v || !fs.existsSync(arq)) throw new HttpError(404, 'Logo não encontrado.');
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox",
  });
  res.end(fs.readFileSync(arq));
  return undefined;
});

app.start(+(process.env.PORT || 4116));

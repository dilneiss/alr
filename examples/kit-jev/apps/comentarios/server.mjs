// Comentários → Oportunidades — cole o link de um vídeo do YouTube: o app baixa até 300 comentários (YouTube Data API v3)
// e o Jev classifica todos em lotes de 20 (4 perguntas por comentário), em paralelo, com o resultado chegando ao vivo.
// Leads, perguntas sem resposta do canal, pedidos de vídeo e spam saem das probabilidades — todo texto da tela é nosso.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, rateLimit, pool, top } from '../../shared/server/kit.mjs';
import { carregarChave, criarCliente, extrairId, ErroYouTube } from './youtube.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
const PASTA = { videos: path.join(DATA_DIR, 'videos'), analises: path.join(DATA_DIR, 'analises'), thumbs: path.join(DATA_DIR, 'thumbs') };
for (const p of Object.values(PASTA)) fs.mkdirSync(p, { recursive: true });

const YT_CHAVE = carregarChave(DIR);
if (!YT_CHAVE) console.warn('[comentarios] YOUTUBE_API_KEY ausente: só vídeos já em cache poderão ser analisados');
const YT = criarCliente(YT_CHAVE);

const TTL = 60 * 60 * 1000;             // cache de comentários e de análise por vídeo: 1 h
const LOTE = 20;                        // comentários por chamada (4 perguntas cada = 80 perguntas)
const PARALELO = 6;                     // chamadas simultâneas por análise
const MAX_ANALISES = 4;                 // análises novas rodando ao mesmo tempo no servidor (as demais esperam na fila)
const MAX_TEXTO_JEV = 500;              // caracteres de cada comentário enviados ao Jev
// canal cujos vídeos recentes viram exemplos (opcional): YOUTUBE_CANAL_ID=UC... no /etc/jev-kit/comentarios.env
const UPLOADS_CANAL = (process.env.YOUTUBE_CANAL_ID || '').trim().replace(/^UC/, 'UU');
const VIDEO_INSPIRACAO = 'f6We53TnkbU';

// ---------------- perguntas ao Jev ----------------
// Medido (80 comentários reais, PT e EN): cada opção de um `choice` custa ~20 tokens por comentário, com descrição longa
// ou curta; a concordância com critérios longos foi 85–92% no tipo e 95–97% no "merece resposta". Ficaram critérios curtos.
const TIPOS = {
  pergunta: 'pergunta ou pedido de ajuda',
  elogio: 'elogio ou agradecimento',
  critica_construtiva: 'crítica respeitosa ou sugestão de melhoria',
  reclamacao: 'reclamação ou raiva, sem sugestão',
  pedido_de_conteudo: 'pede um vídeo ou tema novo',
  intencao_de_compra: 'quer comprar, assinar ou contratar; pergunta preço ou link',
  compartilha_experiencia: 'conta experiência ou dá opinião',
  piada_meme: 'piada, meme ou ironia',
  spam_golpe: 'spam, golpe, autopromoção ou bot',
  outro: 'outro',
};
const SENTIMENTO = ['muito negativo', 'negativo', 'neutro', 'positivo', 'muito positivo'];
function perguntasPara(ids) {
  const q = {};
  for (const id of ids) {
    q[id + '_tipo'] = { type: 'choice', instructions: `Tipo do comentário ${id}`, criteria: TIPOS };
    q[id + '_resp'] = { type: 'noul', instructions: `${id} merece resposta do criador (pergunta real, pedido de ajuda, problema ou interesse em comprar)?` };
    q[id + '_compra'] = { type: 'noul', instructions: `O autor de ${id} quer comprar, assinar, contratar ou entrar em curso/comunidade, ou pede preço/link?` };
    q[id + '_sent'] = { type: 'score', instructions: `Sentimento de ${id}`, criteria: SENTIMENTO };
  }
  return q;
}
const r3 = (x) => Math.round((x || 0) * 1000) / 1000;
function itemDe(comentarioId, qid, a) {
  const t = a[qid + '_tipo'], s = a[qid + '_sent'];
  const probs = t?.probabilities || {};
  return {
    id: comentarioId,
    tipo: t?.choice || 'outro',
    tipo_p: r3(probs[t?.choice] ?? t?.confidence),
    tipos: top(probs).slice(0, 3).map(([k, p]) => [k, r3(p)]),
    resp: r3(a[qid + '_resp']?.noul),
    compra: r3(a[qid + '_compra']?.noul),
    sent: Math.round((s?.score ?? 2) * 100) / 100,
  };
}
// O inspetor da página tem limite de tamanho: mostramos a chamada real com a amostra dos 3 primeiros comentários do lote
// (perguntas e respostas completas) e o total do resto, em vez de um texto cortado no meio.
function debugLegivel(r, ids, questions, label) {
  const amostra = ids.slice(0, 3), sufixos = ['_tipo', '_resp', '_compra', '_sent'];
  const q = {}, a = {};
  for (const id of amostra) for (const s of sufixos) { q[id + s] = questions[id + s]; a[id + s] = r.answers[id + s]; }
  const resto = Object.keys(questions).length - Object.keys(q).length;
  if (resto > 0) {
    q['…'] = `+ ${resto} perguntas iguais para ${ids[3]}…${ids.at(-1)} (4 por comentário)`;
    a['…'] = `+ ${resto} respostas no mesmo formato`;
  }
  return { ...r.debug, label, request: { ...r.debug.request, questions: q }, response: { ...r.debug.response, answers: a } };
}
const limpar = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO_JEV);

// ---------------- arquivos ----------------
const ID_OK = /^[A-Za-z0-9_-]{11}$/;
const arqVideo = (id) => path.join(PASTA.videos, id + '.json');
const arqAnalise = (id) => path.join(PASTA.analises, id + '.json');
function lerJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function gravarJson(f, obj) { const tmp = `${f}.${process.pid}.${Date.now()}.tmp`; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, f); }
// limpeza: apaga caches com mais de 6 h
setInterval(() => {
  const corte = Date.now() - 6 * 3600e3;
  for (const p of [PASTA.videos, PASTA.analises, PASTA.thumbs]) {
    for (const f of fs.readdirSync(p)) { try { const st = fs.statSync(path.join(p, f)); if (st.mtimeMs < corte) fs.unlinkSync(path.join(p, f)); } catch {} }
  }
}, 30 * 60e3).unref();

const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { analises: 0, comentarios: 0, leads: 0, perguntas: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
const salvarStats = () => fs.writeFile(STATS, JSON.stringify(stats), () => {});

function comentariosParaTela(base) {
  return base.comentarios.map((c) => ({ id: c.id, autor: c.autor, texto: c.texto.slice(0, 1200), likes: c.likes, respostas: c.respostas, respondido_canal: c.respondido_canal, publicado: c.publicado, do_canal: c.do_canal }));
}

// ---------------- execução compartilhada ----------------
// Se duas pessoas pedem o mesmo vídeo ao mesmo tempo, a segunda assiste à MESMA análise (sem pagar de novo).
const runs = new Map();
class Run {
  constructor(id) { this.id = id; this.eventos = []; this.subs = new Set(); this.acabou = false; this.abortado = false; }
  emit(e) { this.eventos.push(e); for (const f of this.subs) f(e); }
  terminar() { this.acabou = true; for (const f of this.subs) f(null); this.subs.clear(); if (runs.get(this.id) === this) runs.delete(this.id); }
  entrar(f) {
    for (const e of this.eventos) f(e);
    if (this.acabou) { f(null); return () => {}; }
    this.subs.add(f);
    return () => { this.subs.delete(f); if (!this.subs.size && !this.acabou) this.abortado = true; };
  }
}
let ativos = 0; const fila = [];
const MAX_FILA = 40;                   // acima disso, pede para tentar de novo (memória e conexões limitadas)
class Lotado extends Error { constructor() { super('O servidor está cheio de análises agora. Tente de novo em um minuto — os exemplos já prontos abrem na hora.'); this.code = 'lotado'; } }
async function vaga(run) {
  if (ativos < MAX_ANALISES) { ativos++; return; }
  if (fila.length >= MAX_FILA) throw new Lotado();
  run.emit({ ev: 'fila', posicao: fila.length + 1, message: 'Muita gente analisando agora — você está na fila, começa em instantes.' });
  await new Promise((res) => fila.push(res));
}
function liberar() { if (fila.length) fila.shift()(); else ativos--; }

async function executar(run, id, jev) {
  try { await vaga(run); } catch (e) { run.emit({ ev: 'erro', code: e.code, message: e.message }); return; }
  try {
    if (run.abortado) return;
    let base = lerJson(arqVideo(id)), fonte = 'cache';
    if (!base || Date.now() - base.at > TTL) {
      const t0 = performance.now();
      const video = await YT.video(id);
      run.emit({ ev: 'video', video });
      const comentarios = await YT.comentarios(id, video.canal_id, 3);
      base = { at: Date.now(), video, comentarios, yt_ms: Math.round(performance.now() - t0) };
      gravarJson(arqVideo(id), base);
      fonte = 'youtube';
    } else run.emit({ ev: 'video', video: base.video });
    const alvo = base.comentarios.filter((c) => !c.do_canal && c.texto.trim());
    run.emit({ ev: 'comentarios', comentarios: comentariosParaTela(base), n_alvo: alvo.length, do_canal: base.comentarios.filter((c) => c.do_canal).length, fonte, yt_ms: base.yt_ms, idade_s: Math.round((Date.now() - base.at) / 1000) });
    if (!alvo.length) { run.emit({ ev: 'fim', n: 0, vazio: true, n_lotes: 0, total_ms: 0, cost: 0, perguntas: 0, falhas: 0, cached: false }); return; }

    const lotes = [];
    for (let i = 0; i < alvo.length; i += LOTE) lotes.push(alvo.slice(i, i + LOTE));
    run.emit({ ev: 'plano', n: alvo.length, n_lotes: lotes.length, por_lote: LOTE, paralelo: PARALELO, perguntas_por_comentario: 4 });
    const t0 = performance.now();
    const itens = {}; const lats = [];
    let custo = 0, perguntas = 0, falhas = 0, fatal = null;
    await pool(lotes.map((l, i) => ({ l, i })), PARALELO, async ({ l, i }) => {
      if (run.abortado || fatal) return;
      const ids = l.map((_, k) => 'c' + String(i * LOTE + k + 1).padStart(3, '0'));
      const questions = perguntasPara(ids);
      const state = { video: { titulo: base.video.titulo, canal: base.video.canal }, comentarios: Object.fromEntries(l.map((c, k) => [ids[k], limpar(c.texto)])) };
      try {
        const r = await jev({ state, questions });
        custo += r.cost || 0; perguntas += Object.keys(questions).length; lats.push(r.latency_ms);
        const out = l.map((c, k) => itemDe(c.id, ids[k], r.answers));
        for (const it of out) itens[it.id] = it;
        run.emit({ ev: 'lote', i: i + 1, n_lotes: lotes.length, itens: out, latency_ms: r.latency_ms, cost: r.cost, chegou_ms: Math.round(performance.now() - t0), _jev: debugLegivel(r, ids, questions, `lote ${i + 1}/${lotes.length}`) });
      } catch (e) {
        if (e.code === 'budget_exhausted') fatal = e;
        falhas += l.length;
        run.emit({ ev: 'lote_erro', i: i + 1, n: l.length, code: e.code || 'erro', message: e.message });
      }
    });
    if (fatal) { run.emit({ ev: 'erro', code: fatal.code, message: fatal.message }); return; }
    if (run.abortado) return;
    lats.sort((a, b) => a - b);
    const resumo = { n: Object.keys(itens).length, n_lotes: lotes.length, total_ms: Math.round(performance.now() - t0), cost: custo, perguntas, falhas,
      lat_p50: lats[lats.length >> 1] || null, lat_max: lats.at(-1) || null, paralelo: PARALELO, yt_ms: fonte === 'youtube' ? base.yt_ms : null };
    if (!falhas && resumo.n) {
      gravarJson(arqAnalise(id), { at: Date.now(), video_id: id, base_at: base.at, itens, resumo });
      const vals = Object.values(itens);
      stats.analises++; stats.comentarios += resumo.n; stats.leads += vals.filter((x) => x.compra >= 0.55).length; stats.perguntas += vals.filter((x) => x.resp >= 0.6).length;
      salvarStats();
    }
    run.emit({ ev: 'fim', ...resumo, cached: false });
  } catch (e) {
    run.emit({ ev: 'erro', code: e.code || 'erro', message: e instanceof ErroYouTube ? e.message : (e.status === 429 || e.code === 'rate_limited' ? e.message : 'Algo deu errado ao analisar este vídeo. Tente de novo.') });
    if (!(e instanceof ErroYouTube)) console.error('[comentarios]', e);
  } finally { liberar(); }
}

function eventosDoCache(id) {
  const an = lerJson(arqAnalise(id)), base = lerJson(arqVideo(id));
  if (!an || !base || an.base_at !== base.at || Date.now() - an.at > TTL) return null;
  const idade_s = Math.round((Date.now() - an.at) / 1000);
  const alvo = base.comentarios.filter((c) => !c.do_canal && c.texto.trim());
  return [
    { ev: 'video', video: base.video },
    { ev: 'comentarios', comentarios: comentariosParaTela(base), n_alvo: alvo.length, do_canal: base.comentarios.filter((c) => c.do_canal).length, fonte: 'cache', yt_ms: base.yt_ms, idade_s: Math.round((Date.now() - base.at) / 1000) },
    { ev: 'plano', n: alvo.length, n_lotes: an.resumo.n_lotes, por_lote: LOTE, paralelo: PARALELO, perguntas_por_comentario: 4 },
    { ev: 'cache', itens: Object.values(an.itens), idade_s },
    { ev: 'fim', ...an.resumo, cached: true, idade_s },
  ];
}

// ---------------- exemplos ----------------
const EXEMPLOS_SEMENTE = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'exemplos.json'), 'utf8'));
let exemplosMem = null;
async function exemplos() {
  if (exemplosMem && Date.now() - exemplosMem.at < 12 * 3600e3) return exemplosMem.lista;
  const f = path.join(DATA_DIR, 'exemplos.json');
  const disco = lerJson(f);
  if (disco && Date.now() - disco.at < 12 * 3600e3) { exemplosMem = disco; return disco.lista; }
  try {
    if (!UPLOADS_CANAL) throw new Error('sem YOUTUBE_CANAL_ID: ficam os exemplos da lista');
    const ups = await YT.uploads(UPLOADS_CANAL, 300);
    const recentes = ups.filter((v) => v.duracao_s > 180 && v.n_comentarios >= 60).sort((a, b) => b.n_comentarios - a.n_comentarios).slice(0, 3);
    const insp = await YT.video(VIDEO_INSPIRACAO);
    const lista = [...recentes.map((v) => ({ ...v, selo: 'do seu canal' })), { ...insp, selo: 'o vídeo que apresentou o Jev' }];
    if (lista.length < 2) throw new Error('poucos exemplos');
    exemplosMem = { at: Date.now(), lista };
    gravarJson(f, exemplosMem);
    return lista;
  } catch (e) {
    console.warn('[comentarios] exemplos: usando lista semente —', e.message);
    exemplosMem = { at: Date.now() - 11 * 3600e3, lista: EXEMPLOS_SEMENTE }; // tenta de novo em ~1 h
    return EXEMPLOS_SEMENTE;
  }
}

// ---------------- rotas ----------------
const app = createApp({ name: 'comentarios', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/exemplos', async () => ({ ok: true, exemplos: (await exemplos()).map((v) => ({ id: v.id, titulo: v.titulo, canal: v.canal, n_comentarios: v.n_comentarios, views: v.views, publicado: v.publicado, selo: v.selo })) }));
app.get('/api/stats', () => ({ ok: true, ...stats }));

// miniatura via servidor (sem requisições da página para fora e com cache em disco)
app.get('/api/thumb/:id', async ({ params, res }) => {
  const id = params.id;
  if (!ID_OK.test(id)) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return void res.end('id inválido'); }
  const f = path.join(PASTA.thumbs, id + '.jpg');
  let buf = null;
  try { buf = fs.readFileSync(f); } catch {}
  if (!buf) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('status ' + r.status);
      buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 0 && buf.length < 400_000) fs.writeFile(f, buf, () => {});
    } catch {
      // sem miniatura no YouTube: devolve um marcador neutro (evita erro 404 no console da página)
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#1a1d29"/><path d="M140 70v40l35-20z" fill="#3b4052"/></svg>';
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=600' }); return void res.end(svg);
    }
  }
  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=86400' });
  res.end(buf);
}, { rate: 240 });

// Análise em streaming (NDJSON: um evento JSON por linha). Erros de uso chegam como evento {ev:"erro"} com HTTP 200,
// para a página mostrar a mensagem amigável sem poluir o console.
app.post('/api/analisar', async ({ body, res, ip, jev }) => {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
  const send = (e) => { if (!res.writableEnded && !res.destroyed) res.write(JSON.stringify(e) + '\n'); };
  const fim = () => { if (!res.writableEnded) res.end(); };
  const id = extrairId(body?.url);
  if (!id) {
    send({ ev: 'erro', code: 'link_invalido', message: 'Não reconheci esse link. Cole o endereço de um vídeo do YouTube (youtube.com/watch?v=…, youtu.be/…, /shorts/…) ou só o ID de 11 caracteres.' });
    return void fim();
  }
  send({ ev: 'inicio', video_id: id });
  let run = runs.get(id);
  if (!run) {
    if (!body?.fresh) {
      const cache = eventosDoCache(id);
      if (cache) { for (const e of cache) send(e); return void fim(); }
    }
    if (!rateLimit(`comentarios:nova:${ip}`, 6, 4)) {
      send({ ev: 'erro', code: 'rate_limited', message: 'Calma! Você já pediu várias análises novas agora há pouco. Espere um minuto — ou abra um dos exemplos, que já estão prontos.' });
      return void fim();
    }
    run = new Run(id); runs.set(id, run);
    const r = run;
    executar(r, id, jev).finally(() => r.terminar());
  } else send({ ev: 'compartilhada', message: 'Alguém já está analisando este vídeo agora: você está vendo a mesma análise.' });
  const sair = run.entrar((e) => (e === null ? fim() : send(e)));
  res.on('close', () => { if (!res.writableEnded) sair(); });
}, { rate: 30 });

app.start(+(process.env.PORT || 4113));
exemplos().catch(() => {}); // pré-aquece a lista de exemplos (a 1ª montagem consulta ~300 uploads do canal)

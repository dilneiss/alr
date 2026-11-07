// Escape Room — "O Laboratório do Dr. Maestro". Aventura de texto que entende qualquer frase:
// a cada comando, UMA chamada ao Jev com 4 perguntas (ação válida no momento, tom, tipo de absurdo, objeto-alvo).
// O motor (game.mjs) monta a lista de ações válidas e escreve todo o texto; o Jev só escolhe.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, top } from '../../shared/server/kit.mjs';
import { novoJogo, montarChamada, executar, publico, registrarTurno, resumoFim, acoesValidas, normaliza, LIMIAR_CONFIANCA, TOM } from './game.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------- estatísticas e ranking (persistidos)
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const RANK_FILE = path.join(DATA_DIR, 'ranking.json');
let stats = { partidas: 0, fugas: 0, comandos: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }; } catch {}
let statsDirty = false;
setInterval(() => { if (statsDirty) { statsDirty = false; fs.writeFile(STATS_FILE, JSON.stringify(stats), () => {}); } }, 3000).unref();

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
let ranking = { dia: hoje(), lista: [] };
try { const r = JSON.parse(fs.readFileSync(RANK_FILE, 'utf8')); if (r && Array.isArray(r.lista)) ranking = r; } catch {}
function listaHoje() { if (ranking.dia !== hoje()) ranking = { dia: hoje(), lista: [] }; return ranking.lista; }
const rankingPublico = (n = 10) => listaHoje().slice(0, n).map((e, i) => ({ pos: i + 1, apelido: e.apelido, tempo_ms: e.tempo_ms, comandos: e.comandos, dicas: e.dicas, titulo: e.titulo, id: e.id }));

// ---------------------------------------------------------------- sessões (memória, TTL 2 h, teto 5.000)
const SESS = new Map();
const TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESS = 5000;
const MAX_CMDS = 300;
function criarSessao() {
  const g = novoJogo();
  g.sid = crypto.randomBytes(12).toString('base64url');
  g.visto = Date.now();
  SESS.set(g.sid, g);
  while (SESS.size > MAX_SESS) SESS.delete(SESS.keys().next().value);
  return g;
}
function sessao(sid) {
  sid = String(sid || '').slice(0, 40);
  const g = SESS.get(sid);
  if (!g || Date.now() - g.visto > TTL_MS) {
    if (g) SESS.delete(sid);
    throw new HttpError(404, 'Essa partida expirou. Comece uma nova!', 'sessao_expirada');
  }
  g.visto = Date.now();
  SESS.delete(sid); SESS.set(sid, g); // LRU
  return g;
}
setInterval(() => { const cut = Date.now() - TTL_MS; for (const [k, g] of SESS) if (g.visto < cut) SESS.delete(k); }, 5 * 60 * 1000).unref();

// Um comando por vez por partida (a ordem importa num jogo de texto).
function emFila(g, fn) {
  if ((g._pend || 0) >= 3) throw new HttpError(429, 'Um comando de cada vez! 🙂', 'rate_limited');
  g._pend = (g._pend || 0) + 1;
  const p = (g._fila || Promise.resolve()).catch(() => {}).then(fn).finally(() => { g._pend--; });
  g._fila = p;
  return p;
}

const limpaTexto = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- app
const app = createApp({ name: 'escape', publicDir: new URL('./public/', import.meta.url) });

const EXEMPLOS_INICIAIS = publico(novoJogo()).exemplos;
app.get('/api/info', () => { listaHoje(); return { ok: true, stats, dia: ranking.dia, ranking: rankingPublico(10), exemplos: EXEMPLOS_INICIAIS }; });
app.get('/api/ranking', () => { listaHoje(); return { ok: true, dia: ranking.dia, ranking: rankingPublico(10) }; });

app.post('/api/novo', () => {
  const g = criarSessao();
  stats.partidas++; statsDirty = true;
  return { ok: true, sid: g.sid, estado: publico(g), turnos: g.turnos };
}, { rate: 20 });

app.post('/api/estado', ({ body }) => {
  const g = sessao(body.sid);
  return { ok: true, sid: g.sid, estado: publico(g), turnos: g.turnos };
}, { rate: 60 });

app.post('/api/comando', async ({ body, jev }) => {
  const texto = limpaTexto(body.texto);
  if (!texto) throw new HttpError(400, 'Escreva um comando. Qualquer coisa: "olhar ao redor", "puxa a gaveta"…');
  if (texto.length > 200) throw new HttpError(400, 'Comando longo demais (máximo de 200 caracteres). Seja breve: o Dr. Maestro já está voltando!');
  const g = sessao(body.sid);
  if (g.f.escapou) throw new HttpError(409, 'Você já escapou! Comece uma nova partida.', 'fim');
  if (g.n.comandos >= MAX_CMDS) throw new HttpError(429, `Limite de ${MAX_CMDS} comandos por partida. O Dr. Maestro voltou com o pão! Comece uma nova partida.`, 'limite_partida');

  return emFila(g, async () => {
    // de novo aqui dentro: um comando que esperava na fila quando a fuga aconteceu não pode executar nem contar outra fuga
    if (g.f.escapou) throw new HttpError(409, 'Você já escapou! Comece uma nova partida.', 'fim');
    if (g.n.comandos >= MAX_CMDS) throw new HttpError(429, `Limite de ${MAX_CMDS} comandos por partida. O Dr. Maestro voltou com o pão! Comece uma nova partida.`, 'limite_partida');
    const { state, questions, acoes } = montarChamada(g, texto);
    const r = await jev({ state, questions });
    const a = r.answers || {};
    const ids = new Set(acoes.map((x) => x.id));
    const rotulos = Object.fromEntries(acoes.map((x) => [x.id, x.rotulo]));
    const probs = a.acao?.probabilities || {};
    const rank = top(probs).filter(([k]) => ids.has(k));
    const escolha = ids.has(a.acao?.choice) ? a.acao.choice : 'acao_impossivel';
    const conf = typeof a.acao?.confidence === 'number' ? a.acao.confidence : (probs[escolha] ?? 0);
    const tom = a.tom?.choice in TOM ? a.tom.choice : 'neutro';
    const tomP = a.tom?.probabilities?.[tom] ?? a.tom?.confidence ?? 0;
    const ctx = { texto, tom, tomP, absurdo: a.absurdo?.choice || 'nada_disso', absurdoP: a.absurdo?.probabilities?.[a.absurdo?.choice] ?? 0, objeto: a.objeto?.choice || 'nenhum' };

    g.n.comandos++; g.tons[tom]++; g.lat.push(r.latency_ms || 0); g.custo += r.cost || 0;
    stats.comandos++; statsDirty = true;

    const raiox = {
      acao: escolha, rotulo: rotulos[escolha], p: probs[escolha] ?? conf, confianca: conf,
      top: rank.slice(0, 5).map(([id, p]) => ({ id, rotulo: rotulos[id], p })),
      tom: { escolha: tom, p: tomP, probs: a.tom?.probabilities || {} },
      absurdo: { escolha: ctx.absurdo, p: ctx.absurdoP },
      objeto: { escolha: ctx.objeto, p: a.objeto?.probabilities?.[ctx.objeto] ?? 0 },
      n_acoes: acoes.length, acoes: acoes.map((x) => x.id),
      latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, duvida: false,
    };

    let res = null;
    if (conf < LIMIAR_CONFIANCA) {
      const cands = rank.filter(([k, p]) => k !== 'acao_impossivel' && p >= 0.08).slice(0, 2);
      if (cands.length) {
        g.n.duvidas++;
        g.duvida = { texto, opcoes: cands.map((c) => c[0]), rotulos, ctx };
        raiox.duvida = true;
        res = { saida: [{ tipo: 'duvida', texto: 'Hmm, fiquei na dúvida. Você quis dizer:' }], alvo: null, efeito: null };
      }
    }
    if (!res) { g.duvida = null; res = executar(g, escolha, ctx); }

    g.hist.push({ comando: texto.slice(0, 80), acao: raiox.duvida ? 'duvida' : escolha });
    if (g.hist.length > 6) g.hist.shift();
    const estado = publico(g);
    const turno = { comando: texto, raiox: { acao: raiox.acao, p: raiox.p, tom: tom, latency_ms: raiox.latency_ms, duvida: raiox.duvida, top: raiox.top.slice(0, 3) }, saida: res.saida, opcoes: estado.duvida };
    registrarTurno(g, turno);
    if (g.f.escapou) { stats.fugas++; statsDirty = true; }

    return {
      ok: true, turno: { ...turno, raiox }, alvo: res.alvo, efeito: res.efeito, estado,
      latency_ms: r.latency_ms, cost: r.cost, n_perguntas: Object.keys(questions).length, _jev: r.debug,
    };
  });
}, { rate: 45 });

// Clique em "Você quis dizer…": executa a opção escolhida, sem nova chamada ao Jev.
app.post('/api/escolher', ({ body }) => {
  const g = sessao(body.sid);
  if (!g.duvida) throw new HttpError(409, 'Não há nada para escolher agora.', 'sem_duvida');
  const acao = String(body.acao || '');
  if (acao === 'nenhuma') {
    g.duvida = null;
    const turno = { comando: null, escolha: 'nenhuma', saida: [{ tipo: 'narrador', texto: 'Tudo bem. Tente dizer de outro jeito — o Jev entende gíria, erro de digitação e até emoji.' }] };
    registrarTurno(g, turno);
    return { ok: true, turno, alvo: null, efeito: null, estado: publico(g) };
  }
  if (!g.duvida.opcoes.includes(acao) || !acoesValidas(g).some((a) => a.id === acao)) throw new HttpError(400, 'Opção inválida.', 'opcao_invalida');
  const { ctx, rotulos } = g.duvida;
  g.duvida = null;
  const res = executar(g, acao, { ...ctx, clicado: true });
  g.hist.push({ comando: ctx.texto.slice(0, 80), acao });
  if (g.hist.length > 6) g.hist.shift();
  const turno = { comando: null, escolha: acao, rotuloEscolha: rotulos[acao], saida: res.saida };
  registrarTurno(g, turno);
  if (g.f.escapou) { stats.fugas++; statsDirty = true; }
  return { ok: true, turno, alvo: res.alvo, efeito: res.efeito, estado: publico(g) };
}, { rate: 45 });

// Ranking do dia. O apelido passa por uma pergunta noul ao Jev (é impróprio?) antes de ir para a lista pública.
app.post('/api/ranking', async ({ body, jev }) => {
  const g = sessao(body.sid);
  if (!g.f.escapou) throw new HttpError(409, 'Escape primeiro, depois entre no ranking!', 'nao_terminou');
  if (g.ranqueado) throw new HttpError(409, 'Você já está no ranking de hoje.', 'ja_ranqueado');
  const ANON = 'Fugitivo anônimo';
  let apelido = limpaTexto(body.apelido).replace(/[<>]/g, '').slice(0, 18).trim();
  if (!apelido || /(https?:|www\.|\.com|\.br|@)/.test(normaliza(apelido))) apelido = ANON;
  let debug;
  let moderado = false;
  if (apelido !== ANON) {
    try {
      const r = await jev({
        state: { apelido, contexto: 'Apelido digitado por um jogador para aparecer num ranking público de um jogo brasileiro.' },
        questions: { improprio: { type: 'noul', instructions: 'Este apelido contém palavrão, ofensa, discurso de ódio, conteúdo sexual, ataque a alguém ou propaganda?', criteria: { true: 'Impróprio para um ranking público', false: 'Apelido aceitável para qualquer público' } } },
      });
      debug = r.debug;
      if ((r.answers?.improprio?.noul ?? 1) >= 0.6) { apelido = ANON; moderado = true; }
    } catch { apelido = ANON; moderado = true; }
  }
  const fim = resumoFim(g);
  const id = g.sid.slice(0, 8);
  const lista = listaHoje();
  lista.push({ apelido, tempo_ms: fim.tempo_ms, comandos: fim.comandos, dicas: fim.dicas, titulo: fim.titulo, id, at: Date.now() });
  lista.sort((x, y) => x.tempo_ms - y.tempo_ms || x.comandos - y.comandos);
  if (lista.length > 50) lista.length = 50;
  g.ranqueado = true;
  fs.writeFile(RANK_FILE, JSON.stringify(ranking), () => {});
  const pos = lista.findIndex((e) => e.id === id) + 1;
  return { ok: true, apelido, moderado, posicao: pos || null, ranking: rankingPublico(10), voce: id, ...(debug ? { _jev: debug } : {}) };
}, { rate: 10 });

app.start(+(process.env.PORT || 4109));

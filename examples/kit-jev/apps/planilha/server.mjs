// Planilha Preditiva — crie uma coluna escrevendo só o título e o Jev preenche todas as linhas em lote.
// Cada lote = 1 chamada ao Jev com várias linhas no `state` (ids r1, r2…) e uma pergunta por linha.
// Os lotes rodam com concorrência 6 e são transmitidos ao navegador em NDJSON conforme chegam.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, top, chunk, pool } from '../../shared/server/kit.mjs';
import { MODELOS, specDaColuna, perguntaDaLinha, perguntaMeta, extrasDoEstado, limparTitulo, LIMITES } from './lib/colunas.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });

const LIM = {
  linhas: 300,            // linhas por planilha
  colunas: 12,            // colunas de origem (importação)
  colunasIA: 8,           // colunas IA por planilha (aplicado no navegador)
  celula: 500,            // caracteres por célula
  rotulo: 40,             // caracteres por nome de coluna
  nome: 60,               // nome da planilha importada
  contexto: 300,          // descrição/contexto da planilha importada
  orcamentoChars: 60000,  // texto total das linhas por coluna criada (com o modo compacto, mantém o custo < US$ 0,002)
  compactoAcima: 150,     // acima disso, critérios longos vão 1 vez no state (modo compacto)
  concorrencia: 6,        // lotes em paralelo
  loteMin: 8, loteMax: 25 // linhas por chamada (medido: 1, 10, 20 e 40 dão a mesma qualidade)
};

// ---------------------------------------------------------------- planilhas prontas
const limpa = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function ajustaOrcamento(obj, orc) {
  // Corta os campos mais longos até a linha caber no orçamento de caracteres.
  let total = Object.values(obj).reduce((s, v) => s + String(v).length, 0);
  let guard = 0;
  while (total > orc && guard++ < 40) {
    let kMax = null, lMax = 0;
    for (const [k, v] of Object.entries(obj)) if (typeof v === 'string' && v.length > lMax) { lMax = v.length; kMax = k; }
    if (!kMax || lMax <= 40) break;
    const novo = Math.max(40, lMax - (total - orc) - 1);
    obj[kMax] = obj[kMax].slice(0, novo) + '…';
    total = Object.values(obj).reduce((s, v) => s + String(v).length, 0);
  }
  return obj;
}

function montaPlanilha({ nome, descricao, colunas, linhas }) {
  const orc = Math.min(1500, Math.max(240, Math.floor(LIM.orcamentoChars / Math.max(1, linhas.length))));
  const porId = {}; const ids = [];
  linhas.forEach((vals, i) => {
    const o = {};
    colunas.forEach((c, j) => { const v = vals[j]; o[c] = typeof v === 'number' ? v : limpa(v, LIM.celula); });
    const id = 'r' + (i + 1); ids.push(id); porId[id] = ajustaOrcamento(o, orc);
  });
  return { nome, descricao, colunas, ids, porId, exemplo: porId[ids[0]] };
}

const PLANILHAS = {}; const PRONTAS = {};
for (const f of ['leads', 'avaliacoes', 'candidatos']) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, 'data', f + '.json'), 'utf8'));
  PLANILHAS[d.id] = d;
  PRONTAS[d.id] = montaPlanilha({ nome: d.nome, descricao: d.descricao, colunas: d.colunas.map((c) => c.label), linhas: d.linhas.map((r) => d.colunas.map((c) => r[c.key])) });
}

function planilhaDaRequisicao(body) {
  if (typeof body.planilha === 'string') {
    const p = PRONTAS[body.planilha];
    if (!p) throw new HttpError(404, 'Planilha não encontrada.');
    return p;
  }
  const imp = body.importada;
  if (!imp || typeof imp !== 'object') throw new HttpError(400, 'Envie uma planilha pronta ou importada.');
  const colsIn = Array.isArray(imp.colunas) ? imp.colunas : [];
  if (!colsIn.length) throw new HttpError(400, 'A planilha importada não tem colunas.');
  if (colsIn.length > LIM.colunas) throw new HttpError(400, `Máximo de ${LIM.colunas} colunas por planilha.`);
  const vistos = new Set();
  const colunas = colsIn.map((c, i) => {
    let n = limpa(c, LIM.rotulo) || `Coluna ${i + 1}`;
    if (n === '__proto__') n = `Coluna ${i + 1}`;
    // nome repetido ganha sufixo numérico. Antes, com o nome já no tamanho máximo, " ·" + corte voltava ao mesmo texto
    // e o laço nunca terminava (processo a 99% de CPU).
    const base = n.slice(0, LIM.rotulo);
    for (let k = 2; vistos.has(n); k++) n = `${base} (${k})`;
    vistos.add(n); return n;
  });
  const linhasIn = Array.isArray(imp.linhas) ? imp.linhas : [];
  if (!linhasIn.length) throw new HttpError(400, 'A planilha importada não tem linhas.');
  if (linhasIn.length > LIM.linhas) throw new HttpError(400, `Máximo de ${LIM.linhas} linhas por planilha.`);
  const linhas = linhasIn.map((r) => (Array.isArray(r) ? r.slice(0, colunas.length) : []).map((v) => (typeof v === 'number' && isFinite(v) ? v : limpa(v, LIM.celula))));
  const nome = limpa(imp.nome, LIM.nome) || 'Planilha importada';
  const ctx = limpa(imp.contexto, LIM.contexto);
  const descricao = ctx ? `Planilha "${nome}" importada pelo usuário. Contexto: ${ctx}` : `Planilha "${nome}" importada pelo usuário (colunas: ${colunas.join(', ')}).`;
  return montaPlanilha({ nome, descricao, colunas, linhas });
}

// ---------------------------------------------------------------- estatísticas públicas
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { colunas: 0, linhas: 0, decisoes: 0, porModelo: {} };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let sujo = false;
setInterval(() => { if (sujo) { sujo = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 4000).unref();

// ---------------------------------------------------------------- app
const app = createApp({ name: 'planilha', publicDir: new URL('./public/', import.meta.url), maxBody: 2_500_000 });

const modelosParaMenu = Object.entries(MODELOS).map(([id, m]) => ({ id, rotulo: m.rotulo, kind: m.kind, generico: !!m.generico }));

app.get('/api/config', () => ({
  ok: true,
  planilhas: Object.values(PLANILHAS).map((d) => ({ id: d.id, nome: d.nome, icone: d.icone, descricao: d.descricao, colunas: d.colunas, sugestoes: d.sugestoes, n: d.linhas.length })),
  modelos: modelosParaMenu,
  limites: { ...LIM, titulo: LIMITES.titulo },
  stats: { colunas: stats.colunas, linhas: stats.linhas, decisoes: stats.decisoes },
}));

app.get('/api/planilhas/:id', ({ params }) => {
  const d = PLANILHAS[params.id];
  if (!d) throw new HttpError(404, 'Planilha não encontrada.');
  return { ok: true, ...d };
});

const compacta = (a) => {
  if (!a) return null;
  if (a.type === 'noul') return { type: 'noul', noul: a.noul };
  if (a.type === 'score') return { type: 'score', score: a.score, probabilities: a.probabilities, confidence: a.confidence };
  return { type: 'choice', choice: a.choice, probabilities: a.probabilities, confidence: a.confidence };
};

// Cria (ou refaz) uma coluna IA. Resposta em NDJSON: tipo → plano → lote… → fim.
app.post('/api/coluna', async ({ body, jev, res }) => {
  const titulo = limparTitulo(body.titulo);
  const forcado = body.modelo == null || body.modelo === '' ? null : String(body.modelo);
  if (forcado && !MODELOS[forcado]) throw new HttpError(400, 'Tipo de coluna desconhecido.');
  let spec = specDaColuna(titulo, forcado);
  if (spec.erro) throw new HttpError(400, spec.erro);
  const plan = planilhaDaRequisicao(body);

  // 1) Tipo da coluna: regra do título ou pergunta "meta" ao Jev (antes de abrir o stream, para erros virarem HTTP normal).
  let interp = null, metaDebug = null;
  if (spec.pendente) {
    const { state, questions } = perguntaMeta(titulo, plan);
    const r = await jev({ state, questions });
    const a = r.answers.modelo || {};
    const modelo = MODELOS[a.choice] ? a.choice : 'escala';
    spec = specDaColuna(titulo, modelo);
    interp = {
      modelo, confianca: (a.probabilities && a.probabilities[modelo]) ?? a.confidence ?? null,
      ranking: top(a.probabilities).slice(0, 6).map(([id, p]) => ({ id, rotulo: MODELOS[id] ? specDaColuna(titulo, id).rotulo : id, p })),
      latency_ms: r.latency_ms, cost: r.cost,
    };
    metaDebug = { ...r.debug, label: 'tipo da coluna' };
  }

  // 2) Stream dos lotes.
  // no-transform: proxies (ex.: encode do Caddy) não comprimem/bufferizam o stream; X-Accel-Buffering: nginx idem.
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' });
  let fechado = false;
  res.on('close', () => { fechado = true; });
  const envia = (o) => { if (!fechado && !res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  envia({ t: 'tipo', spec, interp, _jev: metaDebug || undefined });

  const n = plan.ids.length;
  const tamanho = Math.min(LIM.loteMax, Math.max(LIM.loteMin, Math.ceil(n / LIM.concorrencia)));
  const lotes = chunk(plan.ids, tamanho);
  const compacto = n > LIM.compactoAcima;
  envia({ t: 'plano', n, lotes: lotes.length, tamanho, concorrencia: Math.min(LIM.concorrencia, lotes.length), compacto });

  const t0 = performance.now();
  let ok = 0, custo = 0, tokens = 0, chamadas = 0, parar = null;
  try {
  await pool(lotes, LIM.concorrencia, async (ids, i) => {
    if (fechado || parar) { envia({ t: 'erro_lote', i, ids, code: 'cancelado', message: parar ? parar.message : 'cancelado' }); return; }
    const linhas = {}; const questions = {};
    for (const id of ids) { linhas[id] = plan.porId[id]; questions[id] = perguntaDaLinha(spec, id, compacto); }
    try {
      const r = await jev({ state: { planilha: plan.nome, contexto: plan.descricao, coluna_nova: spec.titulo, ...extrasDoEstado(spec, compacto), linhas }, questions });
      chamadas++; custo += r.cost || 0; tokens += (r.usage && r.usage.input_tokens) || 0;
      const resp = {};
      for (const id of ids) { const a = compacta(r.answers[id]); if (a) { resp[id] = a; ok++; } }
      envia({ t: 'lote', i, ids, res: resp, latency_ms: r.latency_ms, cost: r.cost, _jev: { ...r.debug, label: `lote ${i + 1}/${lotes.length} · ${spec.titulo}` } });
    } catch (e) {
      if (e.status === 429 || e.code === 'budget_exhausted' || e.code === 'rate_limited') parar = e;
      envia({ t: 'erro_lote', i, ids, code: e.code || 'erro', message: e.message || 'Falha no Jev' });
    }
  });
  } catch (e) {
    console.error('[planilha] falha no stream', e);
    envia({ t: 'erro', code: 'interno', message: 'Falha interna ao preencher a coluna.' });
  } finally {
    const ms = Math.round(performance.now() - t0);
    envia({ t: 'fim', n, ok, ms, cost: custo, tokens, chamadas, tamanho, parcial: ok < n, motivo: parar ? parar.message : undefined, code: parar ? parar.code : undefined });
    res.end();
  }

  if (ok) {
    stats.colunas++; stats.linhas += ok; stats.decisoes += ok + (interp ? 1 : 0);
    const k = spec.modelo || spec.fonte; stats.porModelo[k] = (stats.porModelo[k] || 0) + 1; sujo = true;
  }
  return undefined;
}, { rate: 30 });

app.get('/api/stats', () => ({ ok: true, colunas: stats.colunas, linhas: stats.linhas, decisoes: stats.decisoes }));

app.start(+(process.env.PORT || 4101));

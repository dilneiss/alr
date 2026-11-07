// QA Adversarial — o Jev pilota um navegador de verdade e caça bugs numa loja plantada.
// Uma execução por vez (fila com posição); espectadores assistem à execução atual ao vivo por SSE.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import { registrarIntencoes } from '../../shared/server/intencoes.mjs';
import { montarLoja } from './loja.mjs';
import { QaRun, carregarBugs, VALORES, ESTRATEGIAS } from './agent.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = +(process.env.PORT || 4108);
const BASE = process.env.SELF_URL || `http://127.0.0.1:${PORT}`;
const MAX_STEPS = +(process.env.QA_MAX_STEPS || 70);
const MAX_MS = +(process.env.QA_MAX_MS || 120000);

const app = createApp({ name: 'qa', publicDir: new URL('./public/', import.meta.url) });
registrarIntencoes(app); // camada “Intenções em qualquer site” (script /_jev/intencoes.js no painel e na Loja Bugada)
const BUGS = carregarBugs(DIR);
montarLoja(app, DIR);

// ---------------- estado da execução ao vivo ----------------
const clientes = new Set();          // canais SSE assistindo
let atual = null;                    // execução em andamento (estado compacto para replay)
let ultimo = null;                   // último relatório finalizado
const fila = [];                     // pedidos aguardando
let ultimosRuns = [];                // histórico curto de placares

// Guarda um resumo enxuto para quem entra no meio da transmissão (sem estourar a memória com
// screenshots): estado atual, bugs achados, últimos passos com o debug do Jev, e a última tela.
function broadcast(type, data) {
  if (atual) {
    if (type === 'passo') { atual.passos.push(data); if (atual.passos.length > 40) atual.passos.shift(); atual.placar = data.placar; }
    else if (type === 'bug') atual.bugs.push(data);
    else if (type === 'tela') atual.ultimaTela = data;
    else if (type === 'inicio') atual.inicio = data;
  }
  for (const ch of clientes) ch.send(type, data);
}

function snapshotParaNovoCliente(ch) {
  ch.send('estado', { rodando: !!atual && !atual.terminado, fila: fila.length, bugsTotais: BUGS.length, maxSteps: MAX_STEPS, maxMs: MAX_MS });
  if (atual) {
    if (atual.inicio) ch.send('inicio', atual.inicio);
    for (const b of atual.bugs) ch.send('bug', b);
    for (const p of atual.passos.slice(-30)) ch.send('passo', p);
    if (atual.ultimaTela) ch.send('tela', atual.ultimaTela);
  } else if (ultimo) ch.send('fim', ultimo);
}

async function rodar() {
  if (atual && !atual.terminado) return;
  const id = 'run-' + Date.now().toString(36);
  atual = { id, iniciadoEm: Date.now(), passos: [], bugs: [], ultimaTela: null, inicio: null, placar: null, terminado: false };
  broadcast('estado', { rodando: true, fila: fila.length, bugsTotais: BUGS.length, maxSteps: MAX_STEPS, maxMs: MAX_MS });

  const run = new QaRun({
    dir: DIR, base: BASE, bugs: BUGS, maxSteps: MAX_STEPS, maxMs: MAX_MS,
    jev: (o) => app.jev({ ...o }),        // laço do servidor: não conta no limite por IP
    onEvent: (type, data) => broadcast(type, data),
  });
  let rel;
  try { rel = await run.run(); }
  catch (e) {
    // falhou antes do laço (ex.: o Chromium não abriu): o agente não chega a emitir 'fim', então o servidor emite,
    // senão o botão de quem assiste fica em "Testando…" até recarregar a página
    broadcast('erro_execucao', { msg: String(e.message).slice(0, 200) });
    rel = run.relatorio(Date.now() - atual.iniciadoEm);
    broadcast('fim', rel);
  }

  atual.terminado = true; atual.relatorio = rel; ultimo = rel;
  ultimosRuns.unshift({ at: new Date().toISOString(), placar: rel.placar, ms: rel.duracao_ms, custo: rel.custo }); ultimosRuns = ultimosRuns.slice(0, 8);
  broadcast('estado', { rodando: false, fila: fila.length, bugsTotais: BUGS.length });
  atual = null;

  if (fila.length) { fila.shift(); setTimeout(rodar, 400); }
}

// ---------------- rotas do painel ----------------
app.get('/api/info', () => ({
  ok: true, bugsTotais: BUGS.length, maxSteps: MAX_STEPS, maxMs: MAX_MS,
  vocabulario: { valores: Object.keys(VALORES), estrategias: Object.keys(ESTRATEGIAS) },
  gabarito: BUGS.map((b) => ({ id: b.id, titulo: b.titulo, curto: b.curto, icone: b.icone, onde: b.onde })),
  ultimosRuns, rodando: !!atual && !atual.terminado, fila: fila.length,
}));

app.post('/api/run', ({ ip }) => {
  if (atual && !atual.terminado) {
    // já tem execução no ar: o visitante assiste a atual. Enfileiramos no máximo algumas
    // execuções seguintes (uma por IP) para não encadear dezenas e estourar o orçamento.
    const ja = fila.findIndex((f) => f.ip === ip);
    if (ja >= 0) return { ok: true, status: 'na_fila', posicao: ja + 1, rodando: true };
    if (fila.length >= 3) return { ok: true, status: 'assistindo', rodando: true };
    fila.push({ ip, at: Date.now() });
    return { ok: true, status: 'na_fila', posicao: fila.length, rodando: true };
  }
  rodar();
  return { ok: true, status: 'iniciado' };
}, { rate: 12 });

// stream ao vivo (SSE). Espectadores entram na execução em andamento.
app.get('/api/stream', ({ sse }) => {
  const ch = sse();
  clientes.add(ch);
  snapshotParaNovoCliente(ch);
  ch.onclose = () => clientes.delete(ch);
});

app.get('/api/ultimo', () => ({ ok: true, relatorio: ultimo }));

app.start(PORT);
console.log(`[qa] Loja Bugada em ${BASE}/alvo/ · painel em ${BASE}/ · ${BUGS.length} bugs plantados`);

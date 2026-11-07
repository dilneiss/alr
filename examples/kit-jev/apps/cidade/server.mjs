// Cidade Viva — 48 moradores, cada um com um cérebro Jev. A cada hora do jogo (~4 s), os 48 decidem o que fazer
// NUMA ÚNICA chamada ao Jev (48 perguntas `choice`). O mundo é compartilhado por todos os espectadores (laço no
// servidor + SSE), pausa quando ninguém está olhando e tem teto de horas simuladas por dia (controle de custo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import * as S from './sim.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const ARQ_MUNDO = path.join(DATA_DIR, 'cidade.json');
const PERFIS = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'moradores.json'), 'utf8'));

const SEG_POR_HORA = Math.max(2, +(process.env.CIDADE_SEG_POR_HORA || 4));   // 1 hora do jogo a cada ~4 s
const HORAS_DIA = Math.max(24, +(process.env.CIDADE_HORAS_DIA || 900));      // teto de horas simuladas por dia (UTC): 900 h = 1 h real
const EVENTO_INTERVALO_MS = 20000;                                            // 1 evento a cada 20 s (no total)
const FILA_MAX = 6;
const MAX_CLIENTES = Math.max(10, +(process.env.CIDADE_MAX_CLIENTES || 400));
const MAX_CLIENTES_IP = 8;
const FEED_MAX = 90;

// ---------------------------------------------------------------- mundo + persistência
let W;
try { W = S.normalizarMundo(JSON.parse(fs.readFileSync(ARQ_MUNDO, 'utf8')), PERFIS); }
catch { W = S.criarMundo(PERFIS); }
W.stats.felicidade ||= [];

let salvando = false, salvarDeNovo = false;
function salvar() {
  if (salvando) { salvarDeNovo = true; return; }
  salvando = true;
  const tmp = ARQ_MUNDO + '.tmp';
  fs.writeFile(tmp, JSON.stringify(W), (err) => {
    if (!err) fs.rename(tmp, ARQ_MUNDO, () => {});
    salvando = false;
    if (salvarDeNovo) { salvarDeNovo = false; salvar(); }
  });
}
function salvarJa() { try { fs.writeFileSync(ARQ_MUNDO, JSON.stringify(W)); } catch {} }

const hojeUTC = () => new Date().toISOString().slice(0, 10);
function statsHoje() { return (W.stats.porData[hojeUTC()] ||= { horas: 0, custo: 0 }); }
function podarDatas() { const ks = Object.keys(W.stats.porData).sort(); while (ks.length > 14) delete W.stats.porData[ks.shift()]; }

// ---------------------------------------------------------------- payloads para o navegador
const ATV_IDX = Object.fromEntries(S.ORDEM_ATIVIDADES.map((a, i) => [a, i]));
function linhaMorador(p) {
  const m = W.moradores[p.id];
  return {
    id: p.id, a: m.atv, l: m.lugar, p: m.p == null ? null : Math.round(m.p * 1000) / 1000, h: m.horas,
    n: [m.fome, m.energia, m.social, m.diversao, m.saude], $: m.dinheiro, d: S.despensaDe(p, W), g: m.gripe ? 1 : 0,
    f: Math.round(S.felicidade(m) * 100), alt: m.alt, hist: (m.hist || []).map((a) => ATV_IDX[a]),
  };
}
function probsTodos() {
  const o = {};
  for (const p of PERFIS) { const pr = W.moradores[p.id].probs; if (pr) o[p.id] = pr; }
  return o;
}
function custos() {
  const ult = W.stats.ultimas;
  const media = ult.length ? ult.reduce((a, b) => a + b.custo, 0) / ult.length : null;
  const latMed = ult.length ? [...ult].map((x) => x.ms).sort((a, b) => a - b)[Math.floor(ult.length / 2)] : null;
  const h = statsHoje();
  return {
    media_hora: media, dia_simulado: media == null ? null : media * 24, lat_p50: latMed,
    total: W.stats.custo, horas_total: W.stats.horas, decisoes_total: W.stats.decisoes,
    horas_hoje: h.horas, custo_hoje: h.custo, teto_horas: HORAS_DIA,
  };
}
function relogioCliente() { const r = S.relogio(W.t); return { t: W.t, dia: r.dia, hora: r.hora, diaSemana: r.diaSemana, periodo: r.periodo, label: r.label }; }
function eventosCliente() { return W.eventos.map((e) => S.eventoParaCliente(e, W)); }
function filaCliente() {
  const espera = Math.max(0, EVENTO_INTERVALO_MS - (Date.now() - ultimoEventoEm));
  return { n: fila.length, proximo_em_s: fila.length || espera ? Math.ceil(espera / 1000) : 0, intervalo_s: EVENTO_INTERVALO_MS / 1000 };
}
function snapshot() {
  return {
    perfis: PERFIS.map(({ id, nome, idade, g, prof, emoji, trabalho, turno, dias, tracos, casa, salario }) => ({ id, nome, idade, g, prof, emoji, trabalho, turno, dias, tracos, casa, estudante: trabalho === 'escola' && salario === 0 })),
    atividades: Object.fromEntries(S.ORDEM_ATIVIDADES.map((a) => [a, { emoji: S.ATIVIDADES[a].emoji, label: S.ATIVIDADES[a].label, lugar: S.ATIVIDADES[a].lugar }])),
    ordem_atividades: S.ORDEM_ATIVIDADES,
    lugares: S.LUGARES, ordem_lugares: S.ORDEM_LUGARES,
    relogio: relogioCliente(), clima: S.climaInfo(W), eventos: eventosCliente(), fila: filaCliente(),
    moradores: PERFIS.map(linhaMorador), probs: probsTodos(),
    ocupacao: S.ocupacao(W, PERFIS), felicidade: S.felicidadeMedia(W, PERFIS), felicidade_hist: W.stats.felicidade.slice(-48),
    feed: W.feed.slice(-60), custos: custos(), ultima: ultimaHora, estado, mensagem: mensagemEstado(),
    seg_por_hora: SEG_POR_HORA, espectadores: clientes.size,
  };
}

// ---------------------------------------------------------------- SSE
const clientes = new Set();
function transmitir(evento, dados) { for (const c of clientes) c.ch.send(evento, dados); }

// ---------------------------------------------------------------- laço da cidade
let estado = 'pausado';          // rodando | pausado | teto | orcamento | erro
let timer = null, rodando = false, pausaAte = 0, ultimaHora = null, ultimaChamada = null;
function mensagemEstado() {
  if (estado === 'teto') return `A cidade já viveu ${HORAS_DIA} horas hoje — o teto diário que controla o custo do demo. Volte amanhã (o dia vira às 21h de Brasília)!`;
  if (estado === 'orcamento') return 'O orçamento de demonstração do Jev acabou por hoje. A cidade volta amanhã!';
  if (estado === 'erro') return 'O Jev não respondeu agora. Tentando de novo em alguns segundos…';
  return null;
}
function agendar(ms) { clearTimeout(timer); timer = setTimeout(tick, ms); }
function acordar() { if (!timer && !rodando) agendar(600); }
function mudarEstado(novo) {
  if (estado === novo) return;
  estado = novo;
  transmitir('status', { estado, mensagem: mensagemEstado(), custos: custos() });
}

async function tick() {
  timer = null;
  if (!clientes.size) { estado = 'pausado'; return; }                 // ninguém olhando: pausa (custo zero)
  if (statsHoje().horas >= HORAS_DIA) { mudarEstado('teto'); agendar(60000); return; }
  if (pausaAte > Date.now()) { agendar(pausaAte - Date.now()); return; }
  rodando = true;
  const t0 = Date.now();
  processarFila();                                      // evento pendente entra antes da cópia de segurança
  const copia = structuredClone(W);
  try {
    S.avancarRelogio(W, PERFIS);
    const rel = S.relogio(W.t);
    transmitir('pensando', { t: W.t, label: rel.label, n: PERFIS.length });
    const chamada = S.montarChamada(W, PERFIS);
    const r = await app.jev({ state: chamada.state, questions: chamada.questions });
    const res = S.aplicarDecisoes(W, PERFIS, r.answers, chamada.opcoes);

    // contabilidade
    const tokens = +(r.usage?.input_tokens || 0);
    W.stats.horas++; W.stats.custo += r.cost || 0; W.stats.decisoes += PERFIS.length; W.stats.tokens += tokens;
    const h = statsHoje(); h.horas++; h.custo += r.cost || 0; podarDatas();
    W.stats.ultimas.push({ custo: r.cost || 0, ms: r.latency_ms, tokens }); if (W.stats.ultimas.length > 48) W.stats.ultimas.shift();
    const fel = S.felicidadeMedia(W, PERFIS);
    W.stats.felicidade.push(Math.round(fel * 1000) / 1000); if (W.stats.felicidade.length > 96) W.stats.felicidade.shift();
    ultimaHora = { t: W.t, label: rel.label, latency_ms: r.latency_ms, cost: r.cost, tokens, n: PERFIS.length, mudancas: res.mudancas, sem_resposta: res.semResposta };
    ultimaChamada = { t: W.t, hora: `${rel.diaSemana} ${rel.label}`, state: chamada.state, questions: chamada.questions, answers: r.answers, usage: r.usage, latency_ms: r.latency_ms, cost: r.cost };

    W.feed.push(...res.feed); if (W.feed.length > FEED_MAX) W.feed.splice(0, W.feed.length - FEED_MAX);
    transmitir('hora', {
      relogio: relogioCliente(), clima: S.climaInfo(W), eventos: eventosCliente(), fila: filaCliente(),
      moradores: PERFIS.map(linhaMorador), probs: probsTodos(), ocupacao: S.ocupacao(W, PERFIS), felicidade: fel,
      feed: res.feed, ultima: ultimaHora, custos: custos(), espectadores: clientes.size,
      _jev: debugResumido(r, chamada, rel),
    });
    if (estado !== 'rodando') mudarEstado('rodando');
    salvar();
  } catch (e) {
    W = copia;                                          // a hora não aconteceu: nada de decisão inventada
    const code = e.code || 'erro';
    if (code === 'budget_exhausted') { pausaAte = Date.now() + 10 * 60000; mudarEstado('orcamento'); }
    else { pausaAte = Date.now() + 5000; mudarEstado('erro'); console.error('[cidade] falha na hora:', e.message); }
  } finally {
    rodando = false;
  }
  if (clientes.size) agendar(Math.max(250, SEG_POR_HORA * 1000 - (Date.now() - t0)));
  else estado = 'pausado';
}

// O inspector da página mostra a chamada real; para não mandar ~40 KB por hora a cada espectador,
// o SSE leva uma amostra (6 fichas, 3 perguntas, 8 respostas). A chamada inteira fica em /api/ultima-chamada.
function debugResumido(r, chamada, rel) {
  const ids = PERFIS.map((p) => p.id);
  const pick = (obj, n) => Object.fromEntries(ids.slice(0, n).map((id) => [id, obj[id]]));
  const st = { ...chamada.state, moradores: { ...pick(chamada.state.moradores, 6), '…': `+ ${ids.length - 6} moradores (chamada completa em /api/ultima-chamada)` } };
  const qs = { ...pick(chamada.questions, 3), '…': `+ ${ids.length - 3} perguntas iguais, uma por morador, cada uma com as opções possíveis para ele agora` };
  const ans = { ...pick(r.answers, 8), '…': `+ ${ids.length - 8} respostas` };
  return {
    request: { model: r.model, state: st, questions: qs }, response: { answers: ans, usage: r.usage },
    latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, n_questions: Object.keys(chamada.questions).length, label: `hora ${rel.label}`,
  };
}

// ---------------------------------------------------------------- modo Deus: fila de eventos
const fila = [];
let ultimoEventoEm = 0, seqFila = 0;
function processarFila() {
  if (!fila.length || Date.now() - ultimoEventoEm < EVENTO_INTERVALO_MS) return false;
  const item = fila.shift();
  const { ev, efeitos } = S.criarEvento(W, item.tipo, item.extra, PERFIS);
  ultimoEventoEm = Date.now();
  const f = { k: 'ev', t: W.t, ev: S.eventoParaCliente(ev, W), efeitos };
  W.feed.push(f); if (W.feed.length > FEED_MAX) W.feed.shift();
  transmitir('evento', { item: f, eventos: eventosCliente(), fila: filaCliente(), clima: S.climaInfo(W), moradores: item.tipo === 'gripe' ? PERFIS.map(linhaMorador) : undefined });
  salvar();
  return true;
}
setInterval(() => {
  if (rodando) return;
  if (!processarFila() && fila.length) transmitir('fila', filaCliente());
}, 1000).unref();

const EMOJI_TIPO = { festa: '🎉', comida: '🍕', perigo: '⚠️', clima: '🌦️', saude: '💊', esporte: '⚽', compras: '🛍️', animais: '🐾', cultura: '🎭', trabalho: '💼', tecnologia: '💡', outro: '📣' };
const Q_LIVRE = {
  adequado: {
    type: 'noul',
    instructions: 'Este texto pode ser mostrado a todos como um acontecimento numa cidade de brinquedo pública, na internet?',
    criteria: { true: 'Pode: acontecimento inofensivo, criativo, engraçado ou dramático sem ofender ninguém', false: 'Não pode: palavrão, ofensa, ódio, conteúdo sexual, violência gráfica, propaganda, link ou spam' },
  },
  lugar: {
    type: 'choice', instructions: 'Em que lugar da cidade isso acontece?',
    criteria: { praca: 'Na praça', parque: 'No parque', restaurante: 'No restaurante', cafe: 'Na cafeteria', bar: 'No bar', mercado: 'No mercado', academia: 'Na academia', hospital: 'No hospital', escola: 'Na escola', escritorio: 'No escritório', fabrica: 'Na fábrica', casa: 'Nas casas, no bairro residencial', cidade_toda: 'Na cidade inteira, ou sem lugar específico' },
  },
  tipo: {
    type: 'choice', instructions: 'Que tipo de acontecimento é este?',
    criteria: { festa: 'Festa, show, música ou comemoração', comida: 'Comida ou bebida', perigo: 'Perigo, acidente, crime ou emergência', clima: 'Clima ou natureza', saude: 'Saúde ou doença', esporte: 'Esporte ou exercício', compras: 'Compras, promoção ou dinheiro', animais: 'Animais', cultura: 'Arte, cultura, circo ou espetáculo', trabalho: 'Trabalho, escola ou política', tecnologia: 'Tecnologia, internet ou energia elétrica', outro: 'Outro tipo' },
  },
  animo: { type: 'score', instructions: 'Como os moradores devem se sentir com esse acontecimento?', criteria: ['Muito mal: medo ou tristeza', 'Mal: incomodados', 'Indiferentes', 'Bem: contentes', 'Muito bem: empolgados'] },
};

function limparTexto(v) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, ' ').replace(/\s+/g, ' ').trim();
}

const app = createApp({ name: 'cidade', publicDir: new URL('./public/', import.meta.url), maxBody: 20_000 });

app.get('/api/stream', ({ sse, ip }) => {
  if (clientes.size >= MAX_CLIENTES) throw new HttpError(503, 'A cidade está lotada de espectadores agora. Tente de novo em instantes.', 'lotado');
  let n = 0; for (const c of clientes) if (c.ip === ip) n++;
  if (n >= MAX_CLIENTES_IP) throw new HttpError(429, 'Muitas abas da cidade abertas ao mesmo tempo.', 'rate_limited');
  const ch = sse();
  const c = { ch, ip };
  clientes.add(c);
  ch.send('snapshot', snapshot());
  ch.onclose = () => { clientes.delete(c); };
  acordar();
  return undefined;
}, { rate: 40 });

app.get('/api/estado', () => ({ ok: true, ...snapshot() }), { rate: 60 });

app.get('/api/ultima-chamada', () => {
  if (!ultimaChamada) throw new HttpError(404, 'Ainda não houve nenhuma hora simulada desde que o servidor ligou. Abra a cidade e espere uns segundos.');
  return { ok: true, ...ultimaChamada };
}, { rate: 20 });

app.post('/api/evento', async ({ body, jev }) => {
  const tipo = String(body.tipo || '');
  if (!S.EVENTOS[tipo]) throw new HttpError(400, 'Evento desconhecido.');
  if (fila.length >= FILA_MAX) throw new HttpError(429, 'A fila de eventos está cheia. Espere alguns segundos e tente de novo.', 'fila_cheia');
  let extra = {}, _jev, classificacao;
  if (tipo === 'livre') {
    const texto = limparTexto(body.texto);
    const letras = [...texto].length;
    if (letras < 4) throw new HttpError(400, 'Escreva um acontecimento (pelo menos 4 caracteres).');
    if (letras > 100 || texto.length > 200) throw new HttpError(400, 'O evento livre tem no máximo 100 caracteres.');
    if (/https?:\/\/|www\.|\b[\w-]+\.(com|net|org|br|io|xyz|ly)\b/i.test(texto)) throw new HttpError(400, 'Links não entram na cidade. Descreva um acontecimento!');
    const r = await jev({ state: { cidade: 'Vila Jev, cidade pequena do interior do Brasil, uma simulação pública', acontecimento_proposto: texto }, questions: Q_LIVRE });
    _jev = r.debug;
    const a = r.answers;
    const ok = a.adequado?.noul ?? 0;
    classificacao = { adequado: ok, lugar: a.lugar?.choice, lugar_p: a.lugar?.confidence, tipo: a.tipo?.choice, animo: a.animo?.score };
    if (ok < 0.4) return { ok: false, recusado: true, error: 'O Jev achou que esse texto não combina com uma cidade pública. Tente outro acontecimento!', classificacao, _jev };
    extra = { texto, lugar: a.lugar?.choice && a.lugar.choice !== 'cidade_toda' ? a.lugar.choice : null, emoji: EMOJI_TIPO[a.tipo?.choice] || '📣', categoria: a.tipo?.choice, animo: a.animo?.score };
  }
  const item = { id: ++seqFila, tipo, extra, em: Date.now() };
  fila.push(item);
  const aplicado = !rodando && processarFila() && !fila.includes(item);
  const pos = fila.indexOf(item) + 1;
  const espera = aplicado ? 0 : Math.ceil((EVENTO_INTERVALO_MS * Math.max(0, pos - 1) + Math.max(0, EVENTO_INTERVALO_MS - (Date.now() - ultimoEventoEm))) / 1000);
  if (!aplicado) transmitir('fila', filaCliente());
  return { ok: true, aplicado, posicao: aplicado ? 0 : pos, espera_s: espera, evento: { tipo, titulo: tipo === 'livre' ? extra.texto : S.EVENTOS[tipo].titulo, emoji: tipo === 'livre' ? extra.emoji : S.EVENTOS[tipo].emoji }, classificacao, _jev };
}, { rate: 8 });

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { salvarJa(); process.exit(0); });

app.start(+(process.env.PORT || 4104));

// Mini Cluely — copiloto que vê a tela e ouve a conversa, no estilo do Cluely.
//   ⚡ Jev decide: a cada fala, 1 chamada com ~18 perguntas (quem falou, momento, precisa de ajuda?, que ajuda, tom, modo,
//      urgência, sentimento, notas, cobertura); a cada tela, 1 chamada que escolhe as linhas importantes do OCR e a ação;
//      numa pergunta livre, 1 chamada que decide de onde vem a resposta (tela, conversa, contexto ou conhecimento geral).
//   ✍️ Modelo de texto rápido escreve: Qwen3-4B no servidor, em streaming, com o prefixo aquecido no cache.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import * as P from './politica.mjs';
import { gerar, aquecer, pronto, info as infoLlm } from './llm-rapido.mjs';
import { lerTela, itensParaJev } from './ocr.mjs';
import { ajustar, textoMarcado, textoFinal, trocasAplicadas, perguntasAjuste, escolhasAjuste } from './public/lib/ajuste.mjs';
import { transcrever, sttPronto } from './stt.mjs';
import { responderComFonte } from './saber.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const CONTEXTOS = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'contextos.json'), 'utf8'));
const ROTEIROS = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'roteiros.json'), 'utf8'));
const IDS_ROTEIRO = new Set(ROTEIROS.map((r) => r.id));
const TELAS = [
  { id: 'email', titulo: 'E-mail de cliente', emoji: '📧', contexto: 'vendas' },
  { id: 'whatsapp', titulo: 'Chat com cliente', emoji: '💬', contexto: 'atendimento' },
  { id: 'codigo', titulo: 'Erro no código', emoji: '🐞', contexto: 'livre' },
  { id: 'slide', titulo: 'Slide na reunião', emoji: '📊', contexto: 'reuniao' },
];
const TELA_BUF = Object.fromEntries(TELAS.map((t) => [t.id, fs.readFileSync(path.join(DIR, 'public', 'telas', t.id + '.png'))]));
const { LIMITES } = P;

// ---------- estatística global (só contadores) ----------
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { falas: 0, decisoes: 0, ajudas: 0, segurou: 0, telas: 0, escritas: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let sujo = false;
setInterval(() => { if (sujo) { sujo = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 3000).unref();

// ---------- sessões (uma por aba): tetos de uso e a última tela lida ----------
const sessoes = new Map();
function sessao(sid) {
  if (!/^[a-z0-9]{8,40}$/i.test(String(sid || ''))) throw new HttpError(400, 'Sessão inválida. Recarregue a página.', 'sessao');
  let s = sessoes.get(sid);
  if (!s) {
    if (sessoes.size > 5000) sessoes.delete(sessoes.keys().next().value);
    s = { escutas: 0, escritas: 0, telas: 0, tela: null };
    sessoes.set(sid, s);
  }
  s.at = Date.now();
  return s;
}
setInterval(() => { const corte = Date.now() - 3 * 3600e3; for (const [k, s] of sessoes) if (s.at < corte) sessoes.delete(k); }, 600e3).unref();

// Chamadas ao Jev de uma mesma aba vão em fila: medido em produção, chamadas sobrepostas sobem da mediana de 280 ms
// para ~950 ms cada. A fila mantém cada decisão rápida; a análise PARCIAL é descartada se já houver outra em curso.
// Mas a espera na fila tem teto (600 ms): quando o Jev fica lento (medido: 1,5–3,6 s por chamada em alguns minutos de
// 23/09), a próxima chamada segue em paralelo em vez de acumular atraso fala após fala.
const ESPERA_MAX_FILA = +(process.env.JEV_QUEUE_WAIT_MS || 600);
function jevEmFila(S, fn) {
  const anterior = S.filaJev || Promise.resolve();
  const vez = Promise.race([anterior, new Promise((r) => setTimeout(r, ESPERA_MAX_FILA))])
    .then(async () => { S.jevAtivos = (S.jevAtivos || 0) + 1; try { return await fn(); } finally { S.jevAtivos--; } });
  S.filaJev = vez.catch(() => {});
  return vez;
}
const jevOcupado = (S) => (S.jevAtivos || 0) > 0 || S.jevEsperando > 0;

// ---------- economia: falas e telas de exemplo vão ao vivo até uma cota por IP/hora; depois o gateway reaproveita ----------
// a resposta idêntica em cache (os roteiros são determinísticos). Microfone, fala digitada e tela capturada: sempre ao vivo.
const SIM_POR_HORA = +(process.env.SIM_LIVE_PER_IP_HOUR || 160);
const cotaSim = new Map();
function simAoVivo(ip) {
  const agora = Date.now();
  let b = cotaSim.get(ip);
  if (!b || agora - b.at > 3600e3) { b = { n: 0, at: agora }; cotaSim.set(ip, b); }
  if (b.n >= SIM_POR_HORA) return false;
  b.n++;
  return true;
}
setInterval(() => { const corte = Date.now() - 3600e3; for (const [k, b] of cotaSim) if (b.at < corte) cotaSim.delete(k); }, 600e3).unref();

const limpa = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const lista = (v, n, max) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => limpa(x, max)).filter(Boolean);
const seqDe = (v) => (Number.isFinite(+v) ? +v : 0);

const CONFIG = {
  contextos: CONTEXTOS,
  roteiros: ROTEIROS.map(({ falas, ...r }) => ({ ...r, falas: falas.map(({ q, t }) => ({ q, t })) })),
  telas: TELAS,
  limiar: P.LIMIAR,
  scribe: !!process.env.ELEVENLABS_API_KEY,
  limites: { fala: LIMITES.fala, contexto: LIMITES.contexto, pergunta: LIMITES.pergunta, imagemBytes: LIMITES.imagemBytes },
  rotulos: {
    momentos: P.MOMENTOS, ajudas: P.AJUDAS, tons: P.TONS, modos: P.MODOS, sentimento: P.SENTIMENTO,
    cobertura: P.COBERTURA, cobertura_rotulos: P.ROTULOS_COBERTURA, tipos_tela: P.TIPOS_TELA, acoes_tela: P.ACOES_TELA,
    fontes: P.FONTES, formatos: P.FORMATOS,
  },
};

const app = createApp({ name: 'cluely', publicDir: new URL('./public/', import.meta.url), maxBody: 4_700_000 });

app.get('/api/config', () => ({ ok: true, ...CONFIG, llm: infoLlm(), stats }));
app.get('/api/stats', () => ({ ok: true, ...stats, llm: infoLlm() }));
app.get('/api/local', async () => ({ ok: true, pronto: await pronto(), stt: await sttPronto(), scribe: !!process.env.ELEVENLABS_API_KEY, ...infoLlm() }));

// ---------- transcrição do microfone/aba: token de uso único do ElevenLabs Scribe v2 Realtime ----------
// O navegador manda o áudio direto para o ElevenLabs; a chave fica aqui. Um token por conexão (reconexões pedem outro).
app.post('/api/stt-token', async ({ body }) => {
  const S = sessao(body.sid);
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) throw new HttpError(503, 'A transcrição pelo ElevenLabs não está configurada neste servidor.', 'scribe_off');
  if ((S.tokensStt = (S.tokensStt || 0) + 1) > 120) throw new HttpError(429, 'Esta aba abriu transcrições demais. Recarregue a página.', 'limite_sessao');
  let r, j;
  try {
    r = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', { method: 'POST', headers: { 'xi-api-key': chave }, signal: AbortSignal.timeout(8000) });
    j = await r.json().catch(() => ({}));
  } catch { throw new HttpError(502, 'O ElevenLabs não respondeu agora. Tente de novo.', 'scribe_token'); }
  if (!r.ok || !j.token) throw new HttpError(502, 'O ElevenLabs não liberou a transcrição agora.', 'scribe_token');
  stats.sessoes_scribe = (stats.sessoes_scribe || 0) + 1; sujo = true;
  return { ok: true, token: j.token };
}, { rate: 30 });

// ---------- prompt de sistema pronto no cache do modelo de texto antes da 1ª resposta ----------
// Servidor frio lê ~640 tokens de sistema+contexto antes da 1ª palavra (~5 s; com duas respostas ao mesmo tempo, 6–11 s).
const mensagensBase = (ctx) => [{ role: 'system', content: P.sistema(ctx) }, { role: 'user', content: P.prefixoConversa([]) }];
app.post('/api/preparar', ({ body }) => {
  const S = sessao(body.sid);
  const ctx = P.normalizarContexto(body.contexto, CONTEXTOS);
  const msgs = mensagensBase(ctx);
  if (S.preparado === msgs[0].content && Date.now() - S.preparadoEm < 120e3) return { ok: true, aquecendo: false };
  S.preparado = msgs[0].content; S.preparadoEm = Date.now();
  return { ok: true, aquecendo: !!aquecer(msgs, { todas: true }) };
}, { rate: 30 });
// na partida do app: os contextos prontos (o padrão por último, para ficar nas vagas; os outros no cache em RAM do llama.cpp).
// O llm-fast leva ~35 s para carregar o modelo depois de um deploy: espera por ele até ~4 min.
async function aquecerNaPartida(tentativa = 0) {
  if (!(await pronto())) { if (tentativa < 48) setTimeout(() => aquecerNaPartida(tentativa + 1), 5000).unref(); return; }
  for (const c of [...CONTEXTOS].reverse()) { const p = aquecer(mensagensBase(P.normalizarContexto(c, CONTEXTOS)), { todas: true }); if (p) await p; }
}
setTimeout(() => aquecerNaPartida(), 1500).unref();

// Escreve com o modelo de texto e manda os pedaços pelo mesmo SSE.
async function escreverSSE(ch, { sid, substituivel = false, messages, max_tokens, temperature = 0.4, tipo, seq, signal, extra = {}, onTexto }) {
  if (!(await pronto())) {
    ch.send('llm-erro', { seq, code: 'llm_down', mensagem: 'O modelo de texto está iniciando ou reiniciando. As decisões do Jev continuam aqui; tente escrever de novo em instantes.' });
    return;
  }
  const inf = infoLlm();
  ch.send('llm-inicio', { seq, tipo, modelo: inf.label, fila: inf.ocupado ? inf.fila + 1 : 0, ...extra });
  let lote = '', ultimo = 0, tudo = '';
  try {
    const m = await gerar({
      sid, substituivel, messages, max_tokens, temperature, signal,
      onFila: (pos) => ch.send('llm-fila', { seq, posicao: pos }),
      onToken: (delta) => {
        lote += delta; tudo += delta;
        if (onTexto) onTexto(tudo);
        const agora = performance.now();
        if (agora - ultimo > 40) { ch.send('tok', { seq, t: lote }); lote = ''; ultimo = agora; }
      },
    });
    if (lote) ch.send('tok', { seq, t: lote });
    ch.send('llm-fim', { seq, ms: m.ms, primeiro_ms: m.primeiro_ms, tokens: m.tokens, tok_s: m.tok_s, prompt_n: m.prompt_n, cache_n: m.cache_n, modelo: m.modelo, ...extra });
    stats.escritas++; sujo = true;
  } catch (e) {
    if (e.code === 'cancelado') ch.send('llm-cancelado', { seq });
    else ch.send('llm-erro', { seq, code: e.code || 'llm_error', mensagem: e.message || 'O modelo de texto falhou.' });
  }
}

// ---------- 1 fala → ajuste da transcrição + Jev decide → (se precisar) o modelo de texto escreve, no mesmo SSE ----------
// Fala PARCIAL (a pessoa ainda está falando): se o Jev já vê que vale ajudar, a IA de texto escreve um RASCUNHO na hora.
// Fala FINAL, ou REVISÃO (transcrição robusta que chegou depois): o Jev confere se a resposta já escrita ainda serve;
// se não servir, sai a versão nova — o que aparece primeiro é rápido, o que chega depois é mais robusto.
const rascunhosDe = (S) => (S.rascunhos ||= new Map());
const parciaisDe = (S) => (S.parciais ||= new Map());
const finaisDe = (S) => (S.finais ||= new Map());    // falas cuja versão final já chegou: parcial atrasada não escreve mais
function guardar(m, fid, reg) {
  m.delete(fid); m.set(fid, reg);
  while (m.size > 40) m.delete(m.keys().next().value);
}
const guardarResposta = (S, fid, reg) => guardar(rascunhosDe(S), fid, reg);
// trocas de termos que o Jev decidiu na fala parcial, aplicadas ao texto final antes da decisão final chegar
function aplicarMapa(texto, mapa) {
  for (const [de, para] of Object.entries(mapa || {})) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'iu');
    texto = texto.replace(re, `$1${para}`);
  }
  return texto;
}

app.post('/api/escuta', async ({ body, jev, ip, sse }) => {
  const sid = String(body.sid || '');
  const S = sessao(sid);
  const bruta = limpa(body.fala, LIMITES.fala + 1);
  if (bruta.length < LIMITES.falaMin) throw new HttpError(400, 'Fala vazia.');
  if (bruta.length > LIMITES.fala) throw new HttpError(400, `Fala longa demais (máximo ${LIMITES.fala} caracteres).`);
  if (S.escutas++ >= LIMITES.escutaPorSessao) throw new HttpError(429, 'Esta aba chegou ao limite de falas analisadas. Recarregue a página para começar de novo.', 'limite_sessao');
  const revisao = !!body.revisao;
  const parcial = !!body.parcial && !revisao;
  const fid = /^[\w-]{1,40}$/.test(String(body.fid || '')) ? String(body.fid) : null;
  const ctx = P.normalizarContexto(body.contexto, CONTEXTOS);
  const historico = P.normalizarHistorico(body.historico);
  const pendente = limpa(body.pendente, 300) || null;
  const canal = ['o', 'v'].includes(body.canal) ? body.canal : 'misto';
  const modoCob = P.cobDoModo(body.modo || ctx.modo);
  const auto = body.auto !== false;
  const seq = seqDe(body.seq);
  const cache = IDS_ROTEIRO.has(String(body.roteiro || '')) ? !simAoVivo(ip) : false;

  // camada de ajuste de contexto: trocas certas vão direto; palavras suspeitas viram perguntas de escolha para o Jev
  const pedacos = ajustar(bruta, ctx.termos);
  const fatos = P.fatosDoContexto(ctx);
  if (fid && !parcial) guardar(finaisDe(S), fid, true);
  let anterior = fid ? rascunhosDe(S).get(fid) : null;
  // LARGADA ANTECIPADA: a fala acabou, a última parcial já pedia ajuda mas sem sinal forte (não houve rascunho) → a IA
  // local começa agora, com a decisão da parcial e o texto completo, em paralelo com a chamada final; o Jev confere
  const ultimaParcial = !parcial && !revisao && fid && !anterior ? parciaisDe(S).get(fid) : null;
  const especular = !!(ultimaParcial && auto && ultimaParcial.d.acao === 'escrever' && !((ultimaParcial.d.geral ?? 0) >= P.LIMIAR.geral));
  const conferir = !parcial && (!!anterior || especular);
  const questions = P.perguntasEscuta(ctx, { modoCob, pendente: !!pendente, fatos, ajustes: perguntasAjuste(pedacos), rascunho: conferir });
  const state = P.estadoEscuta(ctx, { historico, fala: textoMarcado(pedacos), parcial, pendente, inicioDaFala: conferir ? (anterior ? anterior.base : ultimaParcial.texto) : null });
  if (parcial && jevOcupado(S)) { S.escutas--; return { ok: true, pulado: true, seq }; }
  const ch = sse();
  const ctrl = new AbortController();
  ch.onclose = () => ctrl.abort();
  const sys = { role: 'system', content: P.sistema(ctx) };
  // escreve com a IA de texto no mesmo SSE; registra a resposta desta fala para a conferência (confirmar ou trocar)
  const escreverCom = async (dd, textoFala, extra = {}) => {
    if (S.escritas++ >= LIMITES.escritasPorSessao) { ch.send('llm-erro', { seq, code: 'limite_sessao', mensagem: 'Esta aba chegou ao limite de respostas da IA de texto. Recarregue a página.' }); return; }
    const reg = { base: extra.base || textoFala, tipo: dd.tipo, q: dd.q, ctrl: new AbortController(), texto: '', pronto: false };
    if (fid) guardarResposta(S, fid, reg);
    ch.onclose = () => { ctrl.abort(); reg.ctrl.abort(); };
    const prefixoW = P.prefixoConversa([...historico, { q: dd.q, t: textoFala }]);
    const pedidoW = P.pedidoConversa(dd.tipo, { tom: dd.tom, fato: dd.fato ? dd.fato.t : null, parcial });
    const { base, ...extraSSE } = extra;
    await escreverSSE(ch, { sid, seq, tipo: dd.tipo, substituivel: true, signal: reg.ctrl.signal, max_tokens: P.LIMITE_TOKENS[dd.tipo], extra: extraSSE,
      onTexto: (t) => { reg.texto = t; }, messages: [sys, { role: 'user', content: prefixoW + '\n\n' + pedidoW }] });
    reg.pronto = true;
  };
  let espP = null;
  if (especular) {
    espP = escreverCom(ultimaParcial.d, aplicarMapa(textoFinal(pedacos, {}), ultimaParcial.mapaJev), { rascunho: true, especulativo: true, base: ultimaParcial.texto });
    anterior = rascunhosDe(S).get(fid) || null;
    if (!anterior) { await espP; espP = null; }        // teto de respostas da aba: não houve rascunho para conferir
  }
  let r;
  S.jevEsperando = (S.jevEsperando || 0) + 1;
  try { r = await jevEmFila(S, () => { S.jevEsperando--; return jev({ state, questions, cache }); }); } catch (e) {
    if (espP) { anterior.ctrl.abort(); await espP; rascunhosDe(S).delete(fid); }
    ch.send('erro', { seq, code: e.code || 'jev_error', status: e.status || 502, mensagem: e.message || 'Falha no Jev' });
    ch.close(); return undefined;
  }
  const d = P.interpretarEscuta(r.answers, { canal, modoCob, parcial, fatos });
  const { escolhas, probs } = escolhasAjuste(r.answers, pedacos);
  const fala = textoFinal(pedacos, escolhas);
  const n = Object.keys(questions).length;
  ch.send('jev', { seq, parcial, revisao, d, texto: fala, trocas: trocasAplicadas(pedacos, escolhas), ajustes: probs,
    answers: r.answers, latency_ms: r.latency_ms, total_ms: r.total_ms, cost: r.cost, cached: r.cached, n, _jev: r.debug });
  if (!parcial && !revisao) { stats.falas++; stats.decisoes += n; if (d.acao === 'escrever') stats.ajudas++; else if (d.acao === 'nada') stats.segurou++; sujo = true; }

  const prefixo = P.prefixoConversa([...historico, { q: d.q, t: fala }]);
  const querEscrever = auto && d.acao === 'escrever' && !ch.closed;
  const escrever = (extra) => escreverCom(d, fala, extra);
  // pergunta de conhecimento geral: a resposta sai da Wikipédia (o Jev escolhe o artigo e as frases), não da memória do
  // modelo de texto — que inventava (aula sobre Apolo: "ajuda Odisséu", "criou a arca de ouro", "deus da aritmética")
  const saber = querEscrever && (d.geral ?? 0) >= P.LIMIAR.geral && ['responder', 'explicar_termo'].includes(d.tipo);
  const escreverSaber = async () => {
    ch.send('llm-inicio', { seq, tipo: 'saber', modelo: 'Wikipédia + Jev + ' + infoLlm().label });
    const t0 = performance.now();
    let r;
    try {
      r = await responderComFonte({
        jev: (o) => jevEmFila(S, () => jev(o)), conversa: historico.slice(-3).map((h) => h.t), pergunta: fala,
        onPrevia: (p) => { if (!ch.closed) ch.send('saber-previa', { seq, fonte: p.fonte, frases: p.frases, ms: p.ms }); },
        escreverResumo: (messages) => gerar({ sid, substituivel: false, messages, max_tokens: 130, temperature: 0.2 }).then((m) => m.text),
      });
    } catch (e) { r = { ok: false, motivo: e.message || 'falha na busca' }; }
    stats.saber = (stats.saber || 0) + 1; if (r.ok) stats.saber_ok = (stats.saber_ok || 0) + 1; sujo = true;
    if (!ch.closed) ch.send('saber-fim', { seq, ok: !!r.ok, texto: r.texto || '', fonte: r.fonte || null, motivo: r.motivo || null, ms: Math.round(performance.now() - t0), etapas: r.ms });
  };

  if (parcial) {
    // a análise parcial pode voltar depois de a fala final já ter chegado (as chamadas ao Jev da aba vão em fila): aí ela
    // não guarda decisão nem escreve — senão haveria 2 respostas para a mesma fala e a da final perderia o card
    const atrasada = fid && finaisDe(S).has(fid);
    if (fid && !atrasada) guardar(parciaisDe(S), fid, { d, texto: fala, mapaJev: Object.fromEntries(trocasAplicadas(pedacos, escolhas).filter((t) => t.jev).map((t) => [t.de, t.para])) });
    // rascunho só com sinal forte (a frase ainda não acabou) e uma vez por fala
    const forte = querEscrever && (d.momento_p >= P.LIMIAR.rascunho || d.precisa >= 0.7) && !((d.geral ?? 0) >= P.LIMIAR.geral);
    if (forte && fid && !atrasada && !rascunhosDe(S).get(fid)) await escrever({ rascunho: true });
    else if (!ch.closed) aquecer([sys, { role: 'user', content: prefixo }]);
  } else {
    if (conferir && anterior) {
      // um rascunho sem fonte não "serve" para pergunta de conhecimento geral: sai a resposta com fonte
      const serve = !saber && querEscrever && d.tipo === anterior.tipo && d.q === anterior.q && (d.rascunho_serve ?? 1) >= 0.5;
      if (serve) {
        anterior.base = fala;
        ch.send('rascunho', { seq, estado: 'confirmado', serve: d.rascunho_serve, revisao, especulativo: especular });
        if (espP) await espP;
        ch.send('fim', { seq }); ch.close(); return undefined;
      }
      anterior.ctrl.abort();
      if (espP) await espP;
      ch.send('rascunho', { seq, estado: querEscrever ? 'substituido' : 'descartado', serve: d.rascunho_serve, revisao, especulativo: especular });
      if (!querEscrever) rascunhosDe(S).delete(fid);
    }
    if (saber) await escreverSaber();
    else if (querEscrever) await escrever(conferir && anterior ? { versao: 'nova' } : {});
    else if (!ch.closed) aquecer([sys, { role: 'user', content: prefixo }]);
  }
  ch.send('fim', { seq });
  ch.close();
  return undefined;
}, { rate: 150 });

// ---------- transcrição ROBUSTA (2ª camada): o áudio da fala → Whisper com o contexto → texto revisado ----------
app.post('/api/transcrever', async ({ body }) => {
  const S = sessao(body.sid);
  if ((S.transcricoes = (S.transcricoes || 0) + 1) > LIMITES.transcricoesPorSessao) throw new HttpError(429, 'Esta aba chegou ao limite de transcrições. Recarregue a página.', 'limite_sessao');
  const m = /^data:audio\/wav;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.audio || ''));
  if (!m) throw new HttpError(400, 'Mande o áudio da fala em WAV.');
  const wav = Buffer.from(m[1], 'base64');
  if (wav.length < 8000) throw new HttpError(400, 'Áudio curto demais.');
  if (wav.length > 1_700_000) throw new HttpError(413, 'Fala longa demais para a transcrição robusta (máximo ~50 s).');
  const ctx = P.normalizarContexto(body.contexto, CONTEXTOS);
  const historico = P.normalizarHistorico(body.historico);
  let r;
  try { r = await transcrever({ wav, ctx, historico, duracao_s: +((wav.length - 44) / 32000).toFixed(1) }); } catch (e) { throw new HttpError(e.status || 502, e.message, e.code || 'stt'); }
  const pedacos = ajustar(r.texto, ctx.termos);
  stats.transcricoes = (stats.transcricoes || 0) + 1; sujo = true;
  return { ok: true, texto: textoFinal(pedacos, {}), bruto: r.texto, ms: r.ms, duracao_s: r.duracao_s };
}, { rate: 90 });

// ---------- 1 tela → OCR no servidor → Jev escolhe as linhas e a ajuda ----------
app.post('/api/tela', async ({ body, jev, ip }) => {
  const S = sessao(body.sid);
  if (S.telas++ >= LIMITES.telasPorSessao) throw new HttpError(429, 'Esta aba chegou ao limite de telas lidas. Recarregue a página.', 'limite_sessao');
  let buf, exemplo = null;
  if (body.exemplo) {
    exemplo = TELAS.find((t) => t.id === body.exemplo);
    if (!exemplo) throw new HttpError(400, 'Tela de exemplo desconhecida.');
    buf = TELA_BUF[exemplo.id];
  } else {
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.imagem || ''));
    if (!m) throw new HttpError(400, 'Mande a captura como imagem PNG, JPEG ou WebP.');
    buf = Buffer.from(m[2], 'base64');
    if (buf.length > LIMITES.imagemBytes) throw new HttpError(413, 'Captura grande demais. Compartilhe uma janela menor.');
    if (buf.length < 800) throw new HttpError(400, 'Captura vazia.');
  }
  const ctx = P.normalizarContexto(body.contexto, CONTEXTOS);
  const historico = P.normalizarHistorico(body.historico);
  let o;
  try { o = await lerTela(buf); } catch (e) { throw new HttpError(e.status || 500, e.message || 'Não consegui ler a tela.', e.code || 'ocr'); }
  const itens = itensParaJev(o.linhas, LIMITES.linhasJev, LIMITES.ocrChars, o.largura, o.altura);
  let d = { tipo: 'pouco_texto', tipo_p: 1, acao: 'nenhuma', acao_p: 1, vale: 0, rel: {}, escolhidas: [], oferecer: false, idioma: 'portugues', tom: 'objetivo', ligada: null };
  let r = null;
  if (itens.length) {
    const temConversa = historico.length > 0;
    r = await jevEmFila(S, () => jev({ state: P.estadoTela(ctx, itens, historico), questions: P.perguntasTela(ctx, itens, { temConversa }), cache: exemplo ? !simAoVivo(ip) : false }));
    d = P.interpretarTela(r.answers, itens);
  }
  const linhasEscolhidas = itens.filter((it) => d.escolhidas.includes(it.id)).map((it) => it.t);
  S.tela = { hash: o.hash, d, linhas: linhasEscolhidas, remetente: d.remetente || null, at: Date.now() };
  if (linhasEscolhidas.length) aquecer([{ role: 'system', content: P.sistema(ctx) }, { role: 'user', content: P.prefixoTela(linhasEscolhidas, S.tela.remetente) }]);
  stats.telas++; if (r) stats.decisoes += Object.keys(r.answers || {}).length; sujo = true;
  return {
    ok: true, hash: o.hash, exemplo: exemplo ? exemplo.id : null, largura: o.largura, altura: o.altura, ocr_ms: o.ms, ocr_cache: o.cache,
    linhas: o.linhas.map((l) => ({ t: l.t, x: l.x, y: l.y, w: l.w, h: l.h })),
    itens: itens.map((it) => ({ id: it.id, t: it.t, idx: it.idx, onde: it.onde })),
    d, answers: r ? r.answers : {}, n: r ? Object.keys(r.answers || {}).length : 0, latency_ms: r ? r.latency_ms : null, cost: r ? r.cost : 0, _jev: r ? r.debug : undefined,
  };
}, { rate: 30 });

// ---------- ações do copiloto: o modelo de texto escreve (pergunta livre e ⌘↵ passam antes pelo Jev) ----------
const TIPOS = new Set(['responder', 'contornar', 'explicar_termo', 'seguir', 'perguntas', 'resumo', 'email', 'tela', 'livre', 'atalho']);
const DE_CONVERSA = new Set(['responder', 'contornar', 'explicar_termo', 'seguir', 'perguntas', 'resumo', 'email']);

app.post('/api/escrever', async ({ body, jev, sse }) => {
  const sid = String(body.sid || '');
  const S = sessao(sid);
  const tipo = String(body.tipo || '');
  if (!TIPOS.has(tipo)) throw new HttpError(400, 'Ação desconhecida.');
  const ctx = P.normalizarContexto(body.contexto, CONTEXTOS);
  const historico = P.normalizarHistorico(body.historico);
  const seq = seqDe(body.seq);
  const pergunta = limpa(body.pergunta, LIMITES.pergunta + 1);
  if (DE_CONVERSA.has(tipo) && !historico.length) throw new HttpError(400, 'Ainda não há conversa. Simule uma reunião, ligue o microfone ou digite uma fala.', 'sem_conversa');
  if (tipo === 'tela' && !(S.tela && S.tela.hash === body.tela)) throw new HttpError(409, 'Leia a tela de novo: a leitura anterior expirou.', 'tela_expirada');
  if (tipo === 'livre' && pergunta.length < 2) throw new HttpError(400, 'Digite uma pergunta.');
  if (pergunta.length > LIMITES.pergunta) throw new HttpError(400, `Pergunta longa demais (máximo ${LIMITES.pergunta} caracteres).`);
  if (S.escritas++ >= LIMITES.escritasPorSessao) throw new HttpError(429, 'Esta aba chegou ao limite de respostas da IA de texto. Recarregue a página.', 'limite_sessao');

  const ch = sse();
  const ctrl = new AbortController();
  ch.onclose = () => ctrl.abort();
  const sys = { role: 'system', content: P.sistema(ctx) };
  const tom = P.TONS[body.tom] ? body.tom : 'objetivo';
  let user, max_tokens, rotulo = tipo;
  const extra = {};
  try {
    if (tipo === 'livre' || tipo === 'atalho') {
      const temTela = !!(S.tela && Date.now() - S.tela.at < 15 * 60e3 && S.tela.linhas.length);
      const tela = temTela ? { tipo: S.tela.d.tipo, idade_s: Math.round((Date.now() - S.tela.at) / 1000), trecho: S.tela.linhas.join(' | ').slice(0, 500) } : null;
      const r = await jevEmFila(S, () => jev({ state: P.estadoRota(ctx, { pergunta, atalho: tipo === 'atalho', tela, historico }), questions: P.perguntasRota({ atalho: tipo === 'atalho', temTela }) }));
      const rota = P.interpretarRota(r.answers, { temTela });
      ch.send('jev', { seq, rota, answers: r.answers, latency_ms: r.latency_ms, cost: r.cost, n: Object.keys(r.answers || {}).length, _jev: r.debug });
      stats.decisoes += Object.keys(r.answers || {}).length;
      if (tipo === 'atalho') {
        if (rota.fonte === 'tela' && temTela) {
          user = P.prefixoTela(S.tela.linhas, S.tela.remetente) + '\n\n' + P.pedidoTela(S.tela.d.acao, { tom: S.tela.d.tom || rota.tom });
          max_tokens = P.LIMITE_TOKENS.tela; rotulo = 'tela'; extra.acao = S.tela.d.acao; extra.hash = S.tela.hash;
        } else if (historico.length) {
          user = P.prefixoConversa(historico) + '\n\n' + P.pedidoConversa('seguir', { tom: rota.tom });
          max_tokens = P.LIMITE_TOKENS.seguir; rotulo = 'seguir';
        } else if (temTela) {
          user = P.prefixoTela(S.tela.linhas, S.tela.remetente) + '\n\n' + P.pedidoTela(S.tela.d.acao, { tom: S.tela.d.tom });
          max_tokens = P.LIMITE_TOKENS.tela; rotulo = 'tela'; extra.acao = S.tela.d.acao; extra.hash = S.tela.hash;
        } else {
          ch.send('llm-erro', { seq, code: 'sem_contexto', mensagem: 'Ainda não há conversa nem tela. Simule uma reunião, ligue o microfone ou abra uma tela.' });
          ch.send('fim', { seq }); ch.close(); return undefined;
        }
      } else {
        const pedido = P.pedidoLivre(pergunta, rota);
        if (rota.fonte === 'tela' && temTela) user = P.prefixoTela(S.tela.linhas, S.tela.remetente) + '\n\n' + pedido;
        else if (rota.fonte === 'conversa' && historico.length) user = P.prefixoConversa(historico) + '\n\n' + pedido;
        else user = pedido;   // contexto (já está no sistema) ou conhecimento geral: o prompt mais curto possível
        max_tokens = P.LIMITE_TOKENS.livre[rota.tamanho] || 120;
        extra.fonte = rota.fonte;
      }
    } else if (tipo === 'tela') {
      const acao = P.ACOES_TELA[body.acao] ? body.acao : S.tela.d.acao;
      const conversa = (S.tela.d.ligada ?? 0) >= 0.6 ? historico.slice(-3).map((h) => `${P.rotulo(h.q)}: ${h.t}`) : [];
      user = P.prefixoTela(S.tela.linhas, S.tela.remetente) + '\n\n' + P.pedidoTela(acao, { tom: S.tela.d.tom, conversa });
      max_tokens = P.LIMITE_TOKENS.tela; extra.acao = acao; extra.hash = S.tela.hash;
    } else {
      const fala = ['responder', 'contornar', 'explicar_termo'].includes(tipo) ? limpa(body.fala, LIMITES.fala) : '';
      user = P.prefixoConversa(historico) + '\n\n' + P.pedidoConversa(tipo, {
        tom, fala: fala && fala !== historico[historico.length - 1].t ? fala : null,
        lacunas: lista(body.lacunas, 6, 60), notas: lista(body.notas, 8, 160), outro: limpa(body.outro, 40),
      });
      max_tokens = P.LIMITE_TOKENS[tipo];
    }
    await escreverSSE(ch, { sid, seq, tipo: rotulo, signal: ctrl.signal, max_tokens, temperature: body.variar ? 0.85 : 0.4,
      messages: [sys, { role: 'user', content: user }], extra });
  } catch (e) {
    ch.send('llm-erro', { seq, code: e.code || 'erro', mensagem: e.message || 'Falhou.' });
  }
  ch.send('fim', { seq });
  ch.close();
  return undefined;
}, { rate: 40 });

app.start(+(process.env.PORT || 4119));

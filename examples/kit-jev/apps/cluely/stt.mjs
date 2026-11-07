// Transcrição ROBUSTA (2ª camada): Whisper no servidor (whisper.cpp), com um prompt de CONTEXTO — glossário de
// IA/programação, termos do usuário e as últimas falas. Chega ~2–3 s depois da fala; a 1ª camada (reconhecimento do
// navegador + ajuste com o Jev) segue servindo as decisões instantâneas.
// Medido no KVM8 (26 frases de IA/programação × 2 vozes): termos técnicos certos — navegador 12%, Whisper sem prompt 44%,
// Whisper com o prompt de contexto 81%.
//   produção:        STT_URL=http://stt:8080/inference
//   desenvolvimento: túnel  ssh -L 8090:127.0.0.1:8090 root@VPS  → STT_URL=http://127.0.0.1:8090/inference (padrão)
import { GLOSSARIO } from './public/lib/ajuste.mjs';

const URL_STT = process.env.STT_URL || 'http://127.0.0.1:8090/inference';
const BASE_STT = URL_STT.replace(/\/inference$/, '/');
const MAX_PARALELO = +(process.env.STT_CONCURRENCY || 1);
const TERMOS_BASE = [...new Set(GLOSSARIO.map((g) => g.t))];

let ativos = 0;
const espera = [];
function vez() {
  if (ativos < MAX_PARALELO) { ativos++; return Promise.resolve(); }
  if (espera.length >= 8) return Promise.reject(Object.assign(new Error('Muitas falas na fila da transcrição robusta.'), { status: 429, code: 'stt_busy' }));
  return new Promise((r) => espera.push(r));
}
function liberar() { const n = espera.shift(); if (n) n(); else ativos--; }

let prontoCache = { at: 0, v: false };
export async function sttPronto() {
  if (Date.now() - prontoCache.at < 10000) return prontoCache.v;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  let v = false;
  try { const r = await fetch(BASE_STT, { signal: ctrl.signal }); v = r.status < 500; } catch { v = false; } finally { clearTimeout(t); }
  prontoCache = { at: Date.now(), v };
  return v;
}

// O Whisper trata o prompt como "o texto que veio antes": o glossário ensina a grafia e as últimas falas dão continuidade.
export function promptDeContexto(ctx, historico = []) {
  const termos = [...new Set([...(ctx.termos || []), ...TERMOS_BASE])].join(', ');
  const falas = historico.slice(-2).map((h) => h.t).join(' ');
  return `Conversa em português do Brasil sobre trabalho, inteligência artificial, automação e programação, com termos em inglês como: ${termos}. ${falas}`.slice(0, 1400);
}

// alucinações clássicas do Whisper em português quando o trecho é silêncio ou ruído
const ALUCINACOES = /(legendas? (pela|da) comunidade|amara\.org|obrigad[oa] por assistir|inscreva-se|se inscreva|tchau,? tchau|^\W*(e aí|música|risos|aplausos)\W*$)/i;

// Laço de repetição do Whisper (com temperatura 0 e sem nova tentativa ele às vezes repete a mesma frase até o fim do
// trecho: visto no e2e, 14× a mesma pergunta em 11,5 s). Fica a 1ª ocorrência de cada frase e de cada sequência de 3+
// palavras repetida 3+ vezes, e o total de palavras não passa do que cabe na duração (~4,5 palavras/s).
export function semRepeticao(texto, duracao_s = 0) {
  const frases = texto.match(/[^.!?]+(?:[.!?]+|$)/g) || [texto];
  const vistas = new Set();
  // repetida inteira, ou pedaço inicial de uma frase já dita (o laço costuma terminar cortado no fim do trecho)
  let t = frases.map((f) => f.trim()).filter((f) => {
    const k = f.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
    if (!k || vistas.has(k) || (k.split(' ').length >= 3 && [...vistas].some((v) => v.startsWith(k)))) return false;
    vistas.add(k); return true;
  }).join(' ');
  t = t.replace(/((?:\S+\s+){3,}?)\1{2,}/gu, '$1');
  const max = duracao_s ? Math.ceil(duracao_s * 4.5) + 4 : Infinity;
  const w = t.split(/\s+/).filter(Boolean);
  return (w.length > max ? w.slice(0, max) : w).join(' ');
}

export async function transcrever({ wav, ctx, historico = [], duracao_s = 0 }) {
  await vez();
  const t0 = performance.now();
  try {
    const fd = new FormData();
    fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'fala.wav');
    fd.append('language', 'pt');
    fd.append('response_format', 'json');
    fd.append('temperature', '0');
    fd.append('prompt', promptDeContexto(ctx, historico));
    // sem nova tentativa com temperatura maior (evita os casos de 10 s+). Reduzir o audio_ctx ao tamanho da fala foi
    // medido e REJEITADO: mediana 1,3 s, mas os termos certos caíram de 81% para 59% e p90 foi a 11 s (repetições).
    fd.append('temperature_inc', '0');
    // revisão que chega muito depois já não ajuda (a conversa andou): teto proporcional à fala (9 s até 5 s de áudio)
    const ctrl = new AbortController();
    let esgotou = false;
    const kill = setTimeout(() => { esgotou = true; ctrl.abort(); }, Math.max(9000, 1800 * duracao_s));
    let r;
    try { r = await fetch(URL_STT, { method: 'POST', body: fd, signal: ctrl.signal }); } catch (e) {
      if (esgotou) throw Object.assign(new Error('A transcrição robusta demorou demais; fica a do navegador.'), { status: 504, code: 'stt_timeout' });
      prontoCache = { at: 0, v: false };
      throw Object.assign(new Error('A transcrição robusta está indisponível agora.'), { status: 503, code: 'stt_down' });
    } finally { clearTimeout(kill); }
    if (!r.ok) throw Object.assign(new Error(`A transcrição robusta respondeu ${r.status}.`), { status: 502, code: 'stt_error' });
    const j = await r.json().catch(() => ({}));
    let texto = String(j.text || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    // eco do prompt (lista de termos separados por vírgula) ou frase-fantasma: descarta
    const virgulas = (texto.match(/,/g) || []).length;
    if (ALUCINACOES.test(texto) || (virgulas >= 8 && texto.split(/\s+/).length < virgulas * 2.2)) texto = '';
    texto = semRepeticao(texto, duracao_s);
    return { texto, ms: Math.round(performance.now() - t0), duracao_s };
  } finally { liberar(); }
}

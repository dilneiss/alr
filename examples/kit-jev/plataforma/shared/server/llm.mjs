// Cliente do MODELO DE TEXTO (recurso extra, acionado por botão). Fala a API OpenAI-compatível:
//   no kit: o gateway repassa ao OpenRouter → LOCAL_LLM_URL=http://gateway:8787/v1/llm/<app> (a chave fica no gateway)
//   produção: llama.cpp no próprio VPS  → LOCAL_LLM_URL=http://llm:8080/v1   (Qwen3-30B-A3B-Instruct-2507 Q4_K_M)
//   desenvolvimento no Mac: Ollama      → LOCAL_LLM_URL=http://127.0.0.1:11434/v1  LOCAL_LLM_MODEL=qwen2.5:3b
// Uma geração por vez (fila), para não estrangular a CPU do VPS. Sem custo por uso.
const BASE = (process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434/v1').replace(/\/$/, '');
const MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';
const LABEL = process.env.LOCAL_LLM_LABEL || (BASE.includes('11434') ? 'Qwen2.5 3B (Ollama, dev)' : 'Gemini 2.5 Flash-Lite na nuvem (OpenRouter)');
const CONCURRENCY = +(process.env.LOCAL_LLM_CONCURRENCY || 1);
const MAX_QUEUE = +(process.env.LOCAL_LLM_MAX_QUEUE || 8);

let running = 0;
const waiting = [];

function acquire() {
  if (running < CONCURRENCY) { running++; return Promise.resolve(); }
  if (waiting.length >= MAX_QUEUE) return Promise.reject(Object.assign(new Error('Fila do modelo local cheia. Tente de novo em instantes.'), { status: 429, code: 'llm_busy' }));
  return new Promise((resolve) => waiting.push(resolve));
}
function release() {
  const next = waiting.shift();
  if (next) next(); else running--;
}

export function localInfo() {
  return { model: MODEL, label: LABEL, running, waiting: waiting.length };
}

// Verifica se o servidor do modelo está pronto (llama.cpp demora alguns minutos para carregar 18 GB).
export async function localReady(timeoutMs = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/models`, { signal: ctrl.signal });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

// Gera com streaming. onToken(textoParcialDoDelta, textoAcumulado) é chamado a cada pedaço.
// Retorna { text, ms, tokens, tok_s, model }.
export async function streamLocal({ messages, max_tokens = 450, temperature = 0.7, top_p = 0.9, stop, onToken, signal, onQueued }) {
  if (running >= CONCURRENCY && onQueued) onQueued(waiting.length + 1);
  await acquire();
  const t0 = performance.now();
  let text = '', tokens = 0, firstAt = 0;
  try {
    const ctrl = new AbortController();
    const kill = setTimeout(() => ctrl.abort(), 120000);
    if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });
    let r;
    try {
      r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, max_tokens, temperature, top_p, stream: true, ...(stop ? { stop } : {}) }),
      });
    } catch (e) {
      clearTimeout(kill);
      throw Object.assign(new Error('Modelo local indisponível agora (ele pode estar carregando).'), { status: 503, code: 'llm_down' });
    }
    if (!r.ok || !r.body) { clearTimeout(kill); throw Object.assign(new Error(`Modelo local respondeu ${r.status}.`), { status: 502, code: 'llm_error' }); }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let j; try { j = JSON.parse(data); } catch { continue; }
        const delta = j.choices?.[0]?.delta?.content || '';
        if (!delta) continue;
        if (!firstAt) firstAt = performance.now();
        tokens++;
        text += delta;
        if (onToken) onToken(delta, text);
      }
    }
    clearTimeout(kill);
    const ms = performance.now() - t0;
    const genMs = firstAt ? performance.now() - firstAt : ms;
    return { text, ms: Math.round(ms), first_token_ms: firstAt ? Math.round(firstAt - t0) : null, tokens, tok_s: genMs > 0 ? +(tokens / (genMs / 1000)).toFixed(1) : null, model: LABEL };
  } finally {
    release();
  }
}

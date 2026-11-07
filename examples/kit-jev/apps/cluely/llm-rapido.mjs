// Cliente do MODELO LOCAL RÁPIDO do Mini Cluely (llama.cpp, API OpenAI-compatível).
//   produção:        FAST_LLM_URL=http://llm-fast:8080/v1   (Qwen3-4B-Instruct-2507 Q4_K_M, flash attention, cache de prompt)
//   desenvolvimento: túnel  ssh -L 8089:127.0.0.1:8089 root@VPS  → FAST_LLM_URL=http://127.0.0.1:8089/v1 (padrão)
// O que o torna rápido na prática: (1) prompts curtos montados a partir das decisões do Jev; (2) prefixo estável
// [sistema+contexto][conversa] reaproveitado pelo cache do llama.cpp; (3) AQUECIMENTO: quando o modelo está ocioso,
// processamos o prefixo da próxima resposta provável, então a 1ª palavra sai em ~0,5 s em vez de ~5 s.
// Até FAST_LLM_PARALLEL gerações ao mesmo tempo (o servidor precisa de -np igual). Medido no KVM8 com a pergunta B chegando
// 1,2 s depois de A: 1 por vez → a 1ª palavra de B sai 3,5–5,2 s depois (espera A acabar); 2 em paralelo → ~1,4 s, cada uma
// a ~12 tok/s em vez de ~21 (ainda mais rápido que a leitura). Fila curta, sem custo por uso.
const BASE = (process.env.FAST_LLM_URL || 'http://127.0.0.1:8089/v1').replace(/\/$/, '');
const MODEL = process.env.FAST_LLM_MODEL || 'qwen3-4b';
const LABEL = process.env.FAST_LLM_LABEL || 'Qwen3-4B · llama.cpp no servidor';
const MAX_FILA = +(process.env.FAST_LLM_MAX_QUEUE || 6);
const PARALELO = Math.max(1, +(process.env.FAST_LLM_PARALLEL || 1));

let ativos = 0;                            // gerações + aquecimentos em curso (cada um ocupa uma vaga do servidor)
const aquecimentos = new Set();            // aquecimentos em curso (não contam como fila para o usuário)
const fila = [];                          // [{ sid, go, cancelar }]
const stats = { geracoes: 0, aquecimentos: 0, tokens: 0, prompt_n: 0, cache_n: 0, primeiro_ms: [], tok_s: [] };

function proximo() {
  while (fila.length) {
    if (ativos >= PARALELO) {
      // uma resposta de verdade não espera aquecimento: cancela um (o que ele já leu continua no cache do servidor)
      const a = aquecimentos.values().next().value;
      if (!a) return;
      a.soltar(); a.ctrl.abort();
    }
    ativos++; fila.shift().go();
  }
}
function terminar() { ativos--; proximo(); }

export function info() {
  const p = [...stats.primeiro_ms].sort((a, b) => a - b), t = [...stats.tok_s].sort((a, b) => a - b);
  const gerando = ativos - aquecimentos.size;
  return { modelo: MODEL, label: LABEL, rodando: gerando > 0, ocupado: gerando >= PARALELO, fila: fila.length, paralelo: PARALELO, geracoes: stats.geracoes, aquecimentos: stats.aquecimentos,
    primeiro_ms_p50: p.length ? p[Math.floor(p.length / 2)] : null, tok_s_p50: t.length ? t[Math.floor(t.length / 2)] : null };
}

let prontoCache = { at: 0, v: false };
export async function pronto(timeoutMs = 2500) {
  if (Date.now() - prontoCache.at < 8000) return prontoCache.v;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let v = false;
  try { const r = await fetch(`${BASE}/models`, { signal: ctrl.signal }); v = r.ok; } catch { v = false; } finally { clearTimeout(t); }
  prontoCache = { at: Date.now(), v };
  return v;
}

const erro = (msg, status, code) => Object.assign(new Error(msg), { status, code });

// Processa só o prefixo (max_tokens 1) para deixá-lo no cache. A cada fala: 1 aquecimento, só com o modelo ocioso.
// Com { todas: true } (partida do app, contexto novo): em todas as vagas livres — medido, a vaga que não foi aquecida lê
// o prompt de sistema inteiro de novo (6,8 s em vez de 0,6 s). Aquecer todas a cada fala foi medido e REJEITADO (venda
// em 2×: pior caso 5,2 s × 2,8 s aquecendo 1): as duas vagas ficavam ocupadas e o llama.cpp demora a largar o cancelado.
// Uma resposta de verdade que chegue no meio cancela o aquecimento. Devolve a promessa do fim (ou null se não rodou).
export function aquecer(messages, { todas = false } = {}) {
  if (fila.length) return null;
  const n = todas && PARALELO > 1 ? PARALELO - ativos : (ativos ? 0 : 1);
  if (n <= 0) return null;
  const body = JSON.stringify({ model: MODEL, messages, max_tokens: 1, temperature: 0, cache_prompt: true, stream: false });
  const feitos = [];
  for (let i = 0; i < n; i++) {
    const a = { ctrl: new AbortController(), solto: false, soltar() { if (!a.solto) { a.solto = true; aquecimentos.delete(a); ativos--; } } };
    aquecimentos.add(a); ativos++;
    const kill = setTimeout(() => a.ctrl.abort(), 20000);
    feitos.push(fetch(`${BASE}/chat/completions`, { method: 'POST', signal: a.ctrl.signal, headers: { 'Content-Type': 'application/json' }, body })
      .then((r) => r.json()).then((j) => {
        stats.aquecimentos++;
        if (j && j.timings) { stats.prompt_n += j.timings.prompt_n || 0; stats.cache_n += j.timings.cache_n || 0; }
      }).catch(() => {}).finally(() => { clearTimeout(kill); if (!a.solto) { a.soltar(); proximo(); } }));
  }
  return Promise.all(feitos);
}

// Gera com streaming. Resposta automática (substituivel) de uma sessão substitui outra automática da MESMA sessão que ainda
// esperava na fila (a conversa andou); pedidos feitos pelo usuário nunca são descartados. O que está rodando termina. onToken(delta) a cada pedaço. Retorna métricas: ms, primeiro_ms, tokens, tok_s, prompt_n, cache_n.
export function gerar({ sid, substituivel = false, messages, max_tokens = 120, temperature = 0.4, onToken, onFila, signal }) {
  return new Promise((resolve, reject) => {
    if (substituivel) for (let i = fila.length - 1; i >= 0; i--) if (sid && fila[i].sid === sid && fila[i].substituivel) { fila[i].cancelar(); fila.splice(i, 1); }
    if (fila.length >= MAX_FILA) return reject(erro('A fila do modelo de texto está cheia agora. Tente de novo em alguns segundos.', 429, 'llm_busy'));
    const t0 = performance.now();
    let cancelado = false;
    const item = {
      sid, substituivel,
      cancelar() { cancelado = true; reject(erro('Substituída por um pedido mais novo.', 409, 'substituida')); },
      go: async () => {
        if (cancelado) return terminar();
        if (signal && signal.aborted) { reject(erro('Cancelado.', 499, 'cancelado')); return terminar(); }
        const ctrl = new AbortController();
        const kill = setTimeout(() => ctrl.abort(), 60000);
        const onAbort = () => ctrl.abort();
        if (signal) signal.addEventListener('abort', onAbort, { once: true });
        let text = '', tokens = 0, firstAt = 0, timings = null;
        try {
          let r;
          try {
            r = await fetch(`${BASE}/chat/completions`, {
              method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: MODEL, messages, max_tokens, temperature, top_p: 0.8, top_k: 20, cache_prompt: true, stream: true, timings_per_token: false }),
            });
          } catch (e) {
            prontoCache = { at: 0, v: false };
            throw erro('O modelo de texto está indisponível agora (ele pode estar reiniciando). Tente de novo em instantes.', 503, 'llm_down');
          }
          if (!r.ok || !r.body) throw erro(`O modelo de texto respondeu ${r.status}.`, 502, 'llm_error');
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
              if (j.timings) timings = j.timings;
              const delta = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (!delta) continue;
              if (!firstAt) firstAt = performance.now();
              tokens++; text += delta;
              if (onToken) onToken(delta);
            }
          }
          const fim = performance.now();
          const genMs = firstAt ? fim - firstAt : 0;
          const out = {
            text, tokens, ms: Math.round(fim - t0), primeiro_ms: firstAt ? Math.round(firstAt - t0) : null,
            tok_s: timings && timings.predicted_per_second ? +timings.predicted_per_second.toFixed(1) : genMs > 0 ? +(tokens / (genMs / 1000)).toFixed(1) : null,
            prompt_n: timings ? timings.prompt_n : null, cache_n: timings ? timings.cache_n : null,
            prompt_ms: timings ? Math.round(timings.prompt_ms) : null, modelo: LABEL,
          };
          stats.geracoes++; stats.tokens += tokens;
          if (out.primeiro_ms != null) { stats.primeiro_ms.push(out.primeiro_ms); if (stats.primeiro_ms.length > 200) stats.primeiro_ms.shift(); }
          if (out.tok_s != null) { stats.tok_s.push(out.tok_s); if (stats.tok_s.length > 200) stats.tok_s.shift(); }
          if (timings) { stats.prompt_n += timings.prompt_n || 0; stats.cache_n += timings.cache_n || 0; }
          resolve(out);
        } catch (e) {
          if (ctrl.signal.aborted && signal && signal.aborted) reject(erro('Cancelado.', 499, 'cancelado'));
          else if (ctrl.signal.aborted) reject(erro('O modelo de texto demorou demais para responder.', 504, 'llm_timeout'));
          else reject(e.status ? e : erro('O modelo de texto falhou: ' + e.message, 502, 'llm_error'));
        } finally {
          clearTimeout(kill);
          if (signal) signal.removeEventListener('abort', onAbort);
          terminar();
        }
      },
    };
    if (ativos - aquecimentos.size >= PARALELO && onFila) onFila(fila.length + 1);
    // cancelado enquanto ainda esperava na fila: sai da fila e avisa (sem isso a promessa ficaria pendurada)
    if (signal) signal.addEventListener('abort', () => {
      const i = fila.indexOf(item);
      if (i >= 0) { fila.splice(i, 1); cancelado = true; reject(erro('Cancelado.', 499, 'cancelado')); }
    }, { once: true });
    fila.push(item);
    proximo();
  });
}

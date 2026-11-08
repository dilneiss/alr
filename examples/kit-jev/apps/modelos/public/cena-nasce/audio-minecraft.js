// audio-minecraft.js — Síntese procedural de efeitos sonoros estilo Minecraft via Web Audio API.
// 100% offline, sem carregar arquivos .mp3 ou .wav externos.

let ctx = null;

function getContexto() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/**
 * Ruído branco filtrado para cliques percussivos de bloco de madeira/pedra
 */
export function tocarSomBloco({ mudo = false, volume = 0.22 } = {}) {
  if (mudo) return;
  const c = getContexto();
  if (!c) return;

  try {
    const t0 = c.currentTime;
    const dur = 0.045;
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t0);
    filter.frequency.exponentialRampToValueAtTime(110, t0 + dur);

    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    noise.start(t0);
    noise.stop(t0 + dur);
  } catch (_) {}
}

/**
 * Som clássico de "pop" (coletar orbe de XP ou item que cai)
 */
export function tocarSomPop({ mudo = false, volume = 0.28 } = {}) {
  if (mudo) return;
  const c = getContexto();
  if (!c) return;

  try {
    const t0 = c.currentTime;
    const dur = 0.09;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(1280, t0 + dur);

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (_) {}
}

/**
 * Som retrô de dano / impacto (onda quadrada percussiva)
 */
export function tocarSomDano({ mudo = false, volume = 0.25 } = {}) {
  if (mudo) return;
  const c = getContexto();
  if (!c) return;

  try {
    const t0 = c.currentTime;
    const dur = 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + dur);

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (_) {}
}

/**
 * Arpejo brilhante de "Level Up" ao concluir uma história
 */
export function tocarSomLevelUp({ mudo = false, volume = 0.24 } = {}) {
  if (mudo) return;
  const c = getContexto();
  if (!c) return;

  try {
    const t0 = c.currentTime;
    const notas = [523.25, 659.25, 783.99, 1046.50]; // Dó, Mi, Sol, Dó agudo
    notas.forEach((freq, idx) => {
      const notaInicio = t0 + idx * 0.07;
      const dur = 0.16;
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, notaInicio);

      gain.gain.setValueAtTime(volume, notaInicio);
      gain.gain.exponentialRampToValueAtTime(0.001, notaInicio + dur);

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(notaInicio);
      osc.stop(notaInicio + dur);
    });
  } catch (_) {}
}

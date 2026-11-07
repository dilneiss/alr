// Efeitos de som sintetizados na hora (Web Audio, sem arquivos): para os apps ao vivo e os jogos.
// O som começa ligado; a escolha da pessoa fica guardada no navegador.
let ac = null;
let ligado = (() => { try { return localStorage.getItem('mj-som') !== '0'; } catch { return true; } })();

function ctx() {
  if (!ligado) return null;
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  } catch { return null; }
}

function tom(freq, { inicio = 0, dur = 0.12, tipo = 'sine', vol = 0.18, ate = null, ataque = 0.008 } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + inicio;
  const o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function ruido({ inicio = 0, dur = 1, vol = 0.2, de = 400, ate = 2400, q = 0.7, subida = 0.25 } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + inicio;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(de, t); f.frequency.exponentialRampToValueAtTime(ate, t + dur * 0.6);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * subida);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

export const som = {
  get ligado() { return ligado; },
  set ligado(v) { ligado = !!v; try { localStorage.setItem('mj-som', ligado ? '1' : '0'); } catch { /* sem armazenamento */ } },
  destravar() { ctx(); },
  pop() { tom(660, { dur: 0.09, tipo: 'triangle', vol: 0.12, ate: 990 }); },
  tique() { tom(1200, { dur: 0.04, tipo: 'square', vol: 0.04 }); },
  acerto() { [523, 659, 784, 1047].forEach((f, i) => tom(f, { inicio: i * 0.085, dur: 0.22, tipo: 'triangle', vol: 0.14 })); },
  erro() { tom(196, { dur: 0.28, tipo: 'sawtooth', vol: 0.08, ate: 140 }); },
  whoosh() { ruido({ dur: 0.45, vol: 0.12, de: 300, ate: 3200, q: 1.2, subida: 0.5 }); },
  apito() { tom(2350, { dur: 0.14, tipo: 'sine', vol: 0.12 }); tom(2350, { inicio: 0.2, dur: 0.36, tipo: 'sine', vol: 0.12 }); },
  torcida(forca = 1) { ruido({ dur: 1.6 + forca, vol: 0.08 + 0.12 * forca, de: 500, ate: 1800, q: 0.5, subida: 0.3 }); },
  aplauso(forca = 1) { for (let i = 0; i < 6; i++) ruido({ inicio: i * 0.12, dur: 0.5, vol: 0.04 + 0.05 * forca, de: 1800, ate: 4200, q: 2.2, subida: 0.05 }); },
  risada() { [0, 0.14, 0.28, 0.42].forEach((t, i) => tom(520 - i * 30, { inicio: t, dur: 0.1, tipo: 'triangle', vol: 0.06, ate: 420 - i * 30 })); },
  ding() { tom(1320, { dur: 0.5, tipo: 'sine', vol: 0.12 }); tom(1980, { dur: 0.35, tipo: 'sine', vol: 0.05 }); },
  alarme() { [0, 0.22, 0.44].forEach((t) => tom(880, { inicio: t, dur: 0.16, tipo: 'square', vol: 0.06 })); },
  // sons de jogo; o laser é para tiro automático: chame no máximo ~8 por segundo
  laser() { tom(1500, { dur: 0.08, tipo: 'square', vol: 0.022, ate: 380 }); },
  explosao(forca = 1) { ruido({ dur: 0.3 + 0.35 * forca, vol: 0.08 + 0.1 * forca, de: 1400, ate: 90, q: 0.55, subida: 0.03 }); tom(120, { dur: 0.22 + 0.2 * forca, tipo: 'sine', vol: 0.09 + 0.06 * forca, ate: 38 }); },
  poder() { [440, 587, 784, 1175].forEach((f, i) => tom(f, { inicio: i * 0.045, dur: 0.12, tipo: 'square', vol: 0.045 })); tom(1568, { inicio: 0.19, dur: 0.3, tipo: 'triangle', vol: 0.08 }); },
  grilos(dur = 1.6) { for (let i = 0; i < Math.round(dur / 0.32); i++) for (let j = 0; j < 3; j++) tom(4300, { inicio: i * 0.32 + j * 0.045, dur: 0.03, tipo: 'sine', vol: 0.025 }); },
  // para sons próprios do app (respeitam o botão de som): tom(freq, { inicio, dur, tipo, vol, ate }) e ruido({ dur, vol, de, ate, q })
  tom, ruido,
  // botão de ligar/desligar o som, para pôr no palco
  botao(el) {
    const b = el('button', { class: 'mj-btn mj-btn--sm mj-btn--ghost mj-som', type: 'button', title: 'Ligar ou desligar os efeitos de som' });
    const desenha = () => { b.textContent = ligado ? '🔊 som' : '🔇 som'; b.setAttribute('aria-pressed', String(ligado)); };
    b.addEventListener('click', () => { som.ligado = !ligado; desenha(); if (ligado) som.pop(); });
    desenha();
    return b;
  },
};

// Olho do copiloto: captura de tela/aba (getDisplayMedia, com áudio quando o navegador deixa), quadro para o OCR,
// detecção de mudança (miniatura 64×40) e o desenho das caixas do OCR com as linhas que o Jev marcou.

export const CAPTURA_OK = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

export async function capturar() {
  return navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 4, max: 8 } },
    audio: { echoCancellation: false, noiseSuppression: false },
    systemAudio: 'include', selfBrowserSurface: 'exclude', surfaceSwitching: 'include',
  });
}

// Quadro atual do vídeo como dataURL (PNG preserva letras; se ficar grande, JPEG). Largura máxima 1600 px.
export function quadro(video, maxBytes = 3_000_000) {
  const w0 = video.videoWidth, h0 = video.videoHeight;
  if (!w0 || !h0) return null;
  const esc = Math.min(1, 1600 / w0);
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * esc); c.height = Math.round(h0 * esc);
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/png');
  if (url.length * 0.75 > maxBytes) url = c.toDataURL('image/jpeg', 0.9);
  if (url.length * 0.75 > maxBytes) url = c.toDataURL('image/jpeg', 0.75);
  return url;
}

const mini = document.createElement('canvas');
mini.width = 64; mini.height = 40;
export function miniatura(video) {
  if (!video.videoWidth) return null;
  const g = mini.getContext('2d', { willReadFrequently: true });
  g.drawImage(video, 0, 0, 64, 40);
  const px = g.getImageData(0, 0, 64, 40).data;
  const out = new Uint8Array(64 * 40);
  for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) | 0;
  return out;
}
export function diferenca(a, b) {
  if (!a || !b) return 255;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

// Caixas do OCR sobre a imagem (object-fit: contain). fase: 0→1 varre de cima para baixo; depois destaca as escolhidas.
export function desenharCaixas(canvas, dados, progresso = 1) {
  const box = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(box.width * dpr)); canvas.height = Math.max(1, Math.round(box.height * dpr));
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, box.width, box.height);
  if (!dados || !dados.largura) return;
  const esc = Math.min(box.width / dados.largura, box.height / dados.altura);
  const ox = (box.width - dados.largura * esc) / 2, oy = (box.height - dados.altura * esc) / 2;
  const escolhidas = new Set();
  for (const it of dados.itens || []) if ((dados.d.escolhidas || []).includes(it.id)) for (const i of it.idx) escolhidas.add(i);
  const varrido = Math.min(1, progresso) * dados.altura;
  const destaque = Math.max(0, Math.min(1, (progresso - 1) / 0.6));
  dados.linhas.forEach((l, i) => {
    if (l.y > varrido) return;
    const x = ox + l.x * esc - 3, y = oy + l.y * esc - 2, w = l.w * esc + 6, h = l.h * esc + 4;
    const sel = escolhidas.has(i);
    if (sel && destaque > 0) {
      g.fillStyle = `rgba(34,211,238,${0.16 * destaque})`;
      g.strokeStyle = `rgba(34,211,238,${0.35 + 0.6 * destaque})`;
      g.lineWidth = 1.6;
      g.shadowColor = 'rgba(34,211,238,.8)'; g.shadowBlur = 10 * destaque;
    } else {
      g.fillStyle = `rgba(167,139,250,${0.1 * (1 - destaque * 0.6)})`;
      g.strokeStyle = `rgba(167,139,250,${0.55 * (1 - destaque * 0.65)})`;
      g.lineWidth = 1; g.shadowBlur = 0;
    }
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, 4); else g.rect(x, y, w, h);
    g.fill(); g.stroke();
    g.shadowBlur = 0;
  });
}

export function animarCaixas(canvas, dados, ms = 1500) {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const passo = (t) => {
      const p = (t - t0) / ms * 1.6;
      desenharCaixas(canvas, dados, p);
      if (p < 1.6) requestAnimationFrame(passo); else resolve();
    };
    requestAnimationFrame(passo);
  });
}

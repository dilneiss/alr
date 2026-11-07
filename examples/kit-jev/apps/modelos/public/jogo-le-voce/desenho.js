// O desenho do jogo em canvas: céu neon em camadas, naves e tiros com brilho, partículas, tremor de tela e o HUD do jogo.
// Os brilhos são desenhados uma vez em canvases pequenos (sprites) e só copiados a cada quadro: 60 fps sem shadowBlur.
// A cor do céu acompanha o que o Jev acha do jogador (humor): roxo no ponto, vermelho entediado, ciano frustrado.

const ALTURA = 640;
const TAU = Math.PI * 2;
const HUMOR = {
  no_ponto: [168, 85, 247], entediado: [244, 63, 94], frustrado: [34, 211, 238], distraido: [100, 116, 139],
  chefe: [239, 68, 68], neutro: [124, 58, 237],
};
const NOME_ONDA = { enxame: 'ENXAME LENTO', cacadores: 'CAÇADORES RÁPIDOS', meteoros: 'CHUVA DE METEOROS', chefe: 'CHEFE', bonus: 'ONDA DE BÔNUS', respiro: 'RESPIRO', formacao: 'FORMAÇÃO' };
const NOME_CURTO = { enxame: 'ENXAME', cacadores: 'CAÇADORES', meteoros: 'METEOROS', chefe: 'CHEFE', bonus: 'BÔNUS', respiro: 'RESPIRO', formacao: 'FORMAÇÃO' };
const COR_ITEM = { escudo: '#60a5fa', vida: '#fb7185', triplo: '#fde047' };

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fmtPts = (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v || 0));

export function criarDesenho(canvas, { reduzMovimento = false } = {}) {
  const ctx = canvas.getContext('2d');
  let cssW = 2, cssH = 2, dpr = 1, esc = 1, W = 860, pr = 1;
  const cache = new Map();
  const MAXP = reduzMovimento ? 60 : 900;
  const part = [], linhas = [], aneis = [], textos = [];
  let tremor = 0, flash = 0, flashCor = '#fb7185', alarme = 0, warp = 0, warpAlvo = 0, t = 0;
  const humor = { atual: [...HUMOR.neutro], alvo: [...HUMOR.neutro] };
  let estrelas = [];
  const agendados = [];

  function semearEstrelas() {
    estrelas = [];
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let camada = 0; camada < 3; camada++) {
      const n = [70, 50, 28][camada];
      for (let i = 0; i < n; i++) estrelas.push({ x: r(), y: r() * ALTURA, c: camada, b: 0.4 + r() * 0.6 });
    }
  }
  semearEstrelas();

  // ---------------- tamanho ----------------
  function redimensionar(w, h) {
    cssW = Math.max(2, w); cssH = Math.max(2, h);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cssW * cssH * dpr * dpr > 3.6e6) dpr = Math.max(1, Math.sqrt(3.6e6 / (cssW * cssH)));
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    esc = cssH / ALTURA; W = cssW / esc;
    const npr = dpr * esc;
    if (Math.abs(npr - pr) > 0.01) { pr = npr; cache.clear(); }
    return W;
  }

  // ---------------- sprites ----------------
  function mk(chave, box, fn) {
    let c = cache.get(chave);
    if (c) return c;
    c = document.createElement('canvas');
    const px = Math.max(2, Math.ceil(box * pr));
    c.width = c.height = px;
    const g = c.getContext('2d');
    g.setTransform(px / box, 0, 0, px / box, px / 2, px / 2);
    g.lineJoin = 'round'; g.lineCap = 'round';
    fn(g);
    c.box = box;
    cache.set(chave, c);
    return c;
  }
  function blit(c, x, y, s = 1) { const b = c.box * s; ctx.drawImage(c, x - b / 2, y - b / 2, b, b); }
  function blitRot(c, x, y, ang, s = 1, sx = 1) {
    const b = c.box * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (sx !== 1) ctx.scale(sx, 1);
    ctx.drawImage(c, -b / 2, -b / 2, b, b); ctx.restore();
  }
  function brilho(cor) {
    return mk('br' + cor, 32, (g) => {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.16, rgba(cor, 1));
      gr.addColorStop(0.42, rgba(cor, 0.32));
      gr.addColorStop(1, rgba(cor, 0));
      g.fillStyle = gr; g.fillRect(-16, -16, 32, 32);
    });
  }
  // traço neon: borrão largo + linha viva (só na criação do sprite)
  function neon(g, cor, largura, desenhaCaminho, preenche) {
    g.save();
    g.shadowColor = cor; g.shadowBlur = 12;
    desenhaCaminho(g);
    if (preenche) { g.fillStyle = preenche; g.fill(); }
    g.strokeStyle = cor; g.lineWidth = largura; g.stroke();
    g.shadowBlur = 4; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = largura * 0.4; g.stroke();
    g.restore();
  }
  const SPR = {
    nave: () => mk('nave', 64, (g) => {
      neon(g, '#22d3ee', 2.4, (q) => { q.beginPath(); q.moveTo(0, -19); q.lineTo(14, 13); q.lineTo(5, 8); q.lineTo(0, 13); q.lineTo(-5, 8); q.lineTo(-14, 13); q.closePath(); }, 'rgba(34,211,238,.16)');
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 2); g.stroke();
      g.fillStyle = '#c084fc'; g.shadowColor = '#c084fc'; g.shadowBlur = 8;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 12, 11, 1.8, 0, TAU); g.fill(); }
    }),
    drone: (b) => mk('drone' + (b ? 'b' : ''), 48, (g) => {
      const cor = b ? '#ffffff' : '#d8b4fe';
      neon(g, cor, 2.1, (q) => { q.beginPath(); q.arc(0, 0, 10.5, 0, TAU); }, b ? 'rgba(255,255,255,.5)' : 'rgba(88,28,135,.6)');
      g.strokeStyle = cor; g.lineWidth = 1.8; g.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.26; g.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); g.lineTo(Math.cos(a) * 15.5, Math.sin(a) * 15.5); }
      g.stroke();
      g.fillStyle = b ? '#fff' : '#f0abfc'; g.shadowColor = '#f0abfc'; g.shadowBlur = 10;
      g.beginPath(); g.arc(0, 2, 3.4, 0, TAU); g.fill();
    }),
    mini: (b) => mk('mini' + (b ? 'b' : ''), 40, (g) => {
      const cor = b ? '#ffffff' : '#fda4af';
      neon(g, cor, 2, (q) => { q.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; q.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } q.closePath(); }, b ? 'rgba(255,255,255,.5)' : 'rgba(136,19,55,.6)');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 1, 2.6, 0, TAU); g.fill();
    }),
    cacador: (b) => mk('cacador' + (b ? 'b' : ''), 48, (g) => {
      const cor = b ? '#ffffff' : '#f9a8d4';
      neon(g, cor, 2.2, (q) => { q.beginPath(); q.moveTo(0, 15); q.lineTo(13, -11); q.lineTo(0, -4); q.lineTo(-13, -11); q.closePath(); }, b ? 'rgba(255,255,255,.5)' : 'rgba(131,24,67,.62)');
      g.fillStyle = b ? '#fff' : '#fdf2f8'; g.shadowColor = '#f472b6'; g.shadowBlur = 10;
      g.beginPath(); g.arc(0, 3, 2.8, 0, TAU); g.fill();
    }),
    navef: (b) => mk('navef' + (b ? 'b' : ''), 52, (g) => {
      const cor = b ? '#ffffff' : '#c4b5fd';
      neon(g, cor, 2.1, (q) => { q.beginPath(); q.moveTo(0, -10); q.lineTo(11, 0); q.lineTo(0, 10); q.lineTo(-11, 0); q.closePath(); }, b ? 'rgba(255,255,255,.5)' : 'rgba(76,29,149,.62)');
      g.strokeStyle = cor; g.lineWidth = 2; g.beginPath();
      for (const s of [-1, 1]) { g.moveTo(s * 11, 0); g.lineTo(s * 18, -8); g.moveTo(s * 11, 0); g.lineTo(s * 17, 8); }
      g.stroke();
      g.fillStyle = b ? '#fff' : '#22d3ee'; g.shadowColor = '#22d3ee'; g.shadowBlur = 10;
      g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill();
    }),
    meteoro: (tam, forma, b) => mk(`met${tam}${forma}${b ? 'b' : ''}`, tam * 2.7, (g) => {
      let s = 11 + forma * 7 + tam;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const cor = b ? '#ffffff' : '#fdba74';
      neon(g, cor, Math.max(1.6, tam / 11), (q) => { q.beginPath(); for (let k = 0; k < 10; k++) { const a = k * TAU / 10; const rr = tam * (0.76 + r() * 0.26); q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); }, b ? 'rgba(255,255,255,.45)' : 'rgba(67,20,7,.88)');
      g.strokeStyle = rgba('#fb923c', 0.55); g.lineWidth = 1.2;
      for (let k = 0; k < 2 + (tam > 15 ? 1 : 0); k++) { g.beginPath(); g.arc((r() - 0.5) * tam * 0.8, (r() - 0.5) * tam * 0.8, tam * (0.12 + r() * 0.12), 0, TAU); g.stroke(); }
    }),
    cristal: () => mk('cristal', 44, (g) => {
      neon(g, '#fde68a', 2, (q) => { q.beginPath(); q.moveTo(0, -14); q.lineTo(9, 0); q.lineTo(0, 14); q.lineTo(-9, 0); q.closePath(); }, 'rgba(250,204,21,.28)');
      g.strokeStyle = 'rgba(255,251,235,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 14); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
    }),
    faisca: () => mk('faisca', 40, (g) => {
      g.shadowColor = '#67e8f9'; g.shadowBlur = 14; g.fillStyle = '#cffafe';
      g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; const rr = k % 2 ? 4 : 12; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
    }),
    item: (tipo) => mk('item' + tipo, 52, (g) => {
      const cor = COR_ITEM[tipo];
      neon(g, cor, 2.2, (q) => { q.beginPath(); q.arc(0, 0, 14, 0, TAU); }, rgba(cor, 0.16));
      g.save(); g.shadowColor = cor; g.shadowBlur = 8; g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      if (tipo === 'vida') { g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-11, -1, -6, -10, 0, -4); g.bezierCurveTo(6, -10, 11, -1, 0, 7); g.fill(); }
      if (tipo === 'escudo') { g.beginPath(); g.moveTo(0, -8); g.lineTo(7, -5); g.quadraticCurveTo(7, 4, 0, 8); g.quadraticCurveTo(-7, 4, -7, -5); g.closePath(); g.stroke(); }
      if (tipo === 'triplo') { g.beginPath(); for (const [x, a] of [[-5, -0.35], [0, 0], [5, 0.35]]) { g.moveTo(x, 6); g.lineTo(x + Math.sin(a) * 12, 6 - Math.cos(a) * 12); } g.stroke(); }
      g.restore();
    }),
    coracao: (cheio) => mk('cor' + (cheio ? 1 : 0), 30, (g) => {
      g.shadowColor = '#fb7185'; g.shadowBlur = cheio ? 10 : 4;
      g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-13, -1, -7, -12, 0, -5); g.bezierCurveTo(7, -12, 13, -1, 0, 8);
      if (cheio) { g.fillStyle = '#fb7185'; g.fill(); g.strokeStyle = '#ffe4e6'; g.lineWidth = 1.2; g.stroke(); }
      else { g.strokeStyle = 'rgba(251,113,133,.55)'; g.lineWidth = 1.8; g.stroke(); }
    }),
    tiro: () => mk('tiro', 30, (g) => {
      g.shadowColor = '#22d3ee'; g.shadowBlur = 8;
      const gr = g.createLinearGradient(0, -11, 0, 11); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#a5f3fc'); gr.addColorStop(1, 'rgba(34,211,238,0)');
      g.strokeStyle = gr; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke();
    }),
    casco: (fase) => mk('casco' + fase, 150, (g) => {
      const cor = fase === 2 ? '#fdba74' : '#f0abfc';
      const fundo = fase === 2 ? 'rgba(124,45,18,.7)' : 'rgba(88,28,135,.72)';
      neon(g, cor, 3, (q) => { q.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; q.lineTo(Math.cos(a) * 46, Math.sin(a) * 40); } q.closePath(); }, fundo);
      g.strokeStyle = rgba(cor, 0.6); g.lineWidth = 1.6;
      g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; g.lineTo(Math.cos(a) * 32, Math.sin(a) * 27); } g.closePath(); g.stroke();
      g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * 46, 0); g.lineTo(s * 62, -12); g.lineTo(s * 62, 14); g.lineTo(s * 44, 16); } g.stroke();
    }),
  };

  // ---------------- efeitos ----------------
  function faiscas(x, y, cor, n, { v0 = 60, v1 = 240, vida = 0.6, tam = 0.55, arrasto = 2.4 } = {}) {
    if (reduzMovimento) n = Math.ceil(n / 5);
    for (let i = 0; i < n && part.length < MAXP; i++) {
      const a = Math.random() * TAU, v = v0 + Math.random() * (v1 - v0);
      const m = vida * (0.5 + Math.random() * 0.7);
      part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: m, max: m, tam: tam * (0.6 + Math.random() * 0.8), cor, arrasto });
    }
  }
  function anel(x, y, cor, r0, r1, vida = 0.45, lw = 3) { aneis.push({ x, y, r: r0, r1, r0, vida, max: vida, cor, lw }); }
  function texto(x, y, txt, cor, tam = 18, vida = 0.9, peso = 800) { textos.push({ x, y, txt, cor, tam, vida, max: vida, peso, vy: -40 }); if (textos.length > 30) textos.shift(); }
  function tremer(v) { if (!reduzMovimento) tremor = Math.min(22, tremor + v); }
  function estilhacos(x, y, cor, n, v = 220) {
    if (reduzMovimento) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = v * (0.4 + Math.random() * 0.8); const m = 0.5 + Math.random() * 0.5; linhas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ang: Math.random() * TAU, va: (Math.random() - 0.5) * 14, len: 4 + Math.random() * 8, vida: m, max: m, cor }); }
  }
  function explosao(x, y, cor, r) {
    faiscas(x, y, cor, Math.min(42, 12 + r), { v1: 120 + r * 7, vida: 0.55 + r / 60, tam: 0.45 + r / 60 });
    faiscas(x, y, '#ffffff', 4 + Math.round(r / 6), { v1: 160, vida: 0.3, tam: 0.4 });
    anel(x, y, cor, r * 0.6, r * 2.6, 0.4, 2.6);
    if (r >= 18) { estilhacos(x, y, cor, Math.round(r / 3)); tremer(r / 10); }
  }

  function evento(tipo, d) {
    switch (tipo) {
      case 'acerto': faiscas(d.x, d.y, d.cor || '#ffffff', 3, { v0: 40, v1: 160, vida: 0.25, tam: 0.35 }); break;
      case 'ricochete': faiscas(d.x, d.y, '#e9d5ff', 2, { v0: 60, v1: 140, vida: 0.2, tam: 0.3 }); break;
      case 'abate':
        explosao(d.x, d.y, d.cor || '#c084fc', d.r || 12);
        if (d.pontos >= 100) texto(d.x, d.y - 8, '+' + fmtPts(d.pontos), d.tipo === 'cristal' ? '#fde68a' : '#f5f3ff', d.pontos >= 1000 ? 22 : 16, 0.8);
        break;
      case 'dano': tremer(8); flash = 0.55; flashCor = '#fb7185'; faiscas(d.x, d.y, '#67e8f9', 18, { v1: 260, vida: 0.5 }); anel(d.x, d.y, '#fb7185', 8, 60, 0.4, 3); break;
      case 'morte':
        tremer(16); flash = 0.85; flashCor = '#fb7185';
        faiscas(d.x, d.y, '#67e8f9', 50, { v1: 360, vida: 1.0, tam: 0.8 }); faiscas(d.x, d.y, '#c084fc', 30, { v1: 260, vida: 0.9, tam: 0.7 });
        estilhacos(d.x, d.y, '#67e8f9', 16, 300); anel(d.x, d.y, '#67e8f9', 10, 150, 0.7, 4); anel(d.x, d.y, '#ffffff', 4, 90, 0.5, 2);
        texto(d.x, Math.max(120, d.y - 40), 'VOCÊ CAIU!', '#fda4af', 30, 1.4, 900);
        break;
      case 'renasce': anel(d.x, d.y, '#22d3ee', 60, 8, 0.6, 3); faiscas(d.x, d.y, '#22d3ee', 16, { v0: 40, v1: 120, vida: 0.5 }); break;
      case 'escudoBloqueou': anel(d.x, d.y, '#60a5fa', 20, 46, 0.35, 3); faiscas(d.x, d.y, '#93c5fd', 10, { v1: 200, vida: 0.4 }); tremer(3); break;
      case 'triz': faiscas(d.x, d.y, '#67e8f9', 6, { v0: 40, v1: 120, vida: 0.3, tam: 0.35 }); texto(d.x, d.y - 14, 'POR UM TRIZ +' + d.pontos, '#67e8f9', 14, 0.7, 800); break;
      case 'item': {
        const cor = COR_ITEM[d.tipo] || '#fff';
        anel(d.x, d.y, cor, 10, 70, 0.5, 3); faiscas(d.x, d.y, cor, 22, { v1: 220, vida: 0.6 });
        texto(d.x, d.y - 26, d.tipo === 'vida' ? 'VIDA EXTRA!' : d.tipo === 'escudo' ? 'ESCUDO!' : 'TIRO TRIPLO!', cor, 20, 1.0, 900);
        break;
      }
      case 'ondaInicio': warpAlvo = d.tipo === 'respiro' ? 1 : 0; break;
      case 'chefeAviso': alarme = 2.6; break;
      case 'chefeEntrou': tremer(7); break;
      case 'chefeFase2': flash = 0.4; flashCor = '#fb923c'; anel(d.x, d.y, '#fb923c', 30, 200, 0.6, 4); tremer(6); break;
      case 'chefeMorreu': {
        tremer(20); flash = 0.9; flashCor = '#ffffff';
        for (let k = 0; k < 9; k++) agendados.push({ em: t + k * 0.12, x: d.x + (Math.random() - 0.5) * 110, y: d.y + (Math.random() - 0.5) * 80, cor: k % 2 ? '#f0abfc' : '#fb923c' });
        anel(d.x, d.y, '#ffffff', 20, 420, 1.0, 5);
        texto(W / 2, ALTURA * 0.42, 'CHEFE DERROTADO!', '#fde68a', 34, 2.0, 900);
        break;
      }
      case 'intensidade': texto(W / 2, 122, `${d.sobe ? '▲' : '▼'} INTENSIDADE ${d.nivel}`, d.sobe ? '#fda4af' : '#67e8f9', 16, 1.6, 800); break;
      case 'combo': texto(d.x, d.y - 46, 'COMBO ×' + d.mult, '#67e8f9', 18, 0.9, 900); break;
      case 'recorde': texto(W / 2, ALTURA * 0.36, 'NOVO RECORDE!', '#fde68a', 30, 1.8, 900); faiscas(W / 2, ALTURA * 0.36, '#fde047', 30, { v1: 260, vida: 0.9 }); break;
      case 'balaVirouPonto': faiscas(d.x, d.y, '#fde047', 1, { v0: 10, v1: 50, vida: 0.5, tam: 0.4 }); break;
      default: break;
    }
  }

  function definirHumor(nome) { humor.alvo = [...(HUMOR[nome] || HUMOR.neutro)]; }

  // ---------------- quadro ----------------
  function desenhar(jogo, dtReal, extra = {}) {
    const J = jogo.J;
    const dt = Math.min(0.05, dtReal);
    t += dt;
    for (let k = 0; k < 3; k++) humor.atual[k] += (humor.alvo[k] - humor.atual[k]) * Math.min(1, dt * 1.6);
    const [hr, hg, hb] = humor.atual.map(Math.round);
    const hum = (a) => `rgba(${hr},${hg},${hb},${a})`;
    warp += (warpAlvo - warp) * Math.min(1, dt * 2);
    if (alarme > 0) alarme -= dt;
    while (agendados.length && agendados[0].em <= t) { const a = agendados.shift(); explosao(a.x, a.y, a.cor, 30); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const k = dpr * esc;
    ctx.setTransform(k, 0, 0, k, 0, 0);

    // fundo
    const fundo = ctx.createLinearGradient(0, 0, 0, ALTURA);
    fundo.addColorStop(0, '#0d0620'); fundo.addColorStop(0.6, '#07031a'); fundo.addColorStop(1, '#04020c');
    ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, ALTURA);
    const neb = ctx.createRadialGradient(W * 0.5, -60, 20, W * 0.5, -60, ALTURA * 0.95);
    neb.addColorStop(0, hum(0.34)); neb.addColorStop(0.5, hum(0.1)); neb.addColorStop(1, hum(0));
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, ALTURA);
    const neb2 = ctx.createRadialGradient(W * 0.12, ALTURA * 0.85, 10, W * 0.12, ALTURA * 0.85, ALTURA * 0.6);
    neb2.addColorStop(0, 'rgba(34,211,238,.10)'); neb2.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, ALTURA);

    // tremor
    let sx = 0, sy = 0;
    if (tremor > 0.05) { sx = (Math.random() - 0.5) * tremor; sy = (Math.random() - 0.5) * tremor; tremor *= Math.pow(0.0009, dt); } else tremor = 0;
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    // grade em perspectiva rolando
    const vel = 40 + warp * 260;
    const off = (t * vel) % 48;
    ctx.strokeStyle = hum(0.13); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (W / 2) % 48; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, ALTURA); }
    for (let y = off - 48; y < ALTURA; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const sombra = ctx.createLinearGradient(0, 0, 0, ALTURA);
    sombra.addColorStop(0, 'rgba(7,3,26,.75)'); sombra.addColorStop(0.45, 'rgba(7,3,26,.15)'); sombra.addColorStop(1, 'rgba(7,3,26,0)');
    ctx.fillStyle = sombra; ctx.fillRect(0, 0, W, ALTURA);

    // estrelas
    ctx.globalCompositeOperation = 'lighter';
    const vels = [16, 38, 80];
    for (const e of estrelas) {
      e.y += vels[e.c] * (1 + warp * 3.5) * dt;
      if (e.y > ALTURA) { e.y -= ALTURA; e.x = Math.random(); }
      const x = e.x * W, a = e.b * (0.35 + e.c * 0.25);
      if (warp > 0.15 && e.c === 2) { ctx.strokeStyle = `rgba(207,250,254,${a * 0.7})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, e.y); ctx.lineTo(x, e.y - 2 - warp * 10); ctx.stroke(); }
      else { ctx.fillStyle = `rgba(233,213,255,${a})`; const s = 0.9 + e.c * 0.7; ctx.fillRect(x, e.y, s, s); }
    }
    ctx.globalCompositeOperation = 'source-over';

    if (J.ativo && J.nave) {
      // itens
      for (const it of J.itens) {
        if (it.ima) { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(it.x, it.y - 120, it.x, it.y); gr.addColorStop(0, rgba(COR_ITEM[it.tipo], 0)); gr.addColorStop(1, rgba(COR_ITEM[it.tipo], 0.5)); ctx.strokeStyle = gr; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(it.x, it.y - 120); ctx.lineTo(it.x, it.y); ctx.stroke(); blit(brilho(COR_ITEM[it.tipo]), it.x, it.y, 2.6 + Math.sin(t * 8) * 0.3); ctx.globalCompositeOperation = 'source-over'; }
        blitRot(SPR.item(it.tipo), it.x, it.y + Math.sin(t * 4 + it.x) * 2, Math.sin(t * 2) * 0.2, 1);
      }
      // inimigos
      for (const e of J.inimigos) desenharInimigo(e, J);
      // tiros inimigos e da nave (aditivo)
      ctx.globalCompositeOperation = 'lighter';
      const bRosa = brilho('#ff4fd8'), bLar = brilho('#fb923c');
      for (const b of J.balas) blit(b.cor === 'laranja' ? bLar : bRosa, b.x, b.y, (b.r * 4.6) / 32);
      const spT = SPR.tiro();
      for (const s of J.tiros) { if (s.vx) blitRot(spT, s.x, s.y, Math.atan2(s.vx, -s.vy), 1); else blit(spT, s.x, s.y, 1); }
      ctx.globalCompositeOperation = 'source-over';
      // nave
      desenharNave(J);
    }

    // partículas
    ctx.globalCompositeOperation = 'lighter';
    for (let i = part.length - 1; i >= 0; i--) {
      const p = part[i];
      p.vida -= dt; if (p.vida <= 0) { part.splice(i, 1); continue; }
      const f = Math.exp(-p.arrasto * dt); p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
      const u = p.vida / p.max;
      ctx.globalAlpha = Math.min(1, u * 1.4);
      blit(brilho(p.cor), p.x, p.y, p.tam * (0.4 + u * 0.8));
    }
    ctx.globalAlpha = 1;
    for (let i = linhas.length - 1; i >= 0; i--) {
      const l = linhas[i];
      l.vida -= dt; if (l.vida <= 0) { linhas.splice(i, 1); continue; }
      l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= Math.exp(-1.8 * dt); l.vy *= Math.exp(-1.8 * dt); l.ang += l.va * dt;
      ctx.strokeStyle = rgba(l.cor, l.vida / l.max); ctx.lineWidth = 2;
      const c = Math.cos(l.ang) * l.len / 2, s = Math.sin(l.ang) * l.len / 2;
      ctx.beginPath(); ctx.moveTo(l.x - c, l.y - s); ctx.lineTo(l.x + c, l.y + s); ctx.stroke();
    }
    for (let i = aneis.length - 1; i >= 0; i--) {
      const a = aneis[i];
      a.vida -= dt; if (a.vida <= 0) { aneis.splice(i, 1); continue; }
      const u = 1 - a.vida / a.max; const e = 1 - Math.pow(1 - u, 3);
      a.r = a.r0 + (a.r1 - a.r0) * e;
      ctx.strokeStyle = rgba(a.cor, (1 - u) * 0.9); ctx.lineWidth = a.lw * (1 - u * 0.7);
      ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(0.5, a.r), 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // textos que sobem
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = textos.length - 1; i >= 0; i--) {
      const x = textos[i];
      x.vida -= dt; if (x.vida <= 0) { textos.splice(i, 1); continue; }
      x.y += x.vy * dt; x.vy *= Math.exp(-2 * dt);
      const u = x.vida / x.max;
      ctx.globalAlpha = Math.min(1, u * 2.2);
      const s = 1 + (1 - Math.min(1, (1 - u) * 6)) * 0.35;
      ctx.font = `${x.peso} ${Math.round(x.tam * s)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,4,20,.75)'; ctx.strokeText(x.txt, x.x, x.y);
      ctx.fillStyle = x.cor; ctx.fillText(x.txt, x.x, x.y);
    }
    ctx.globalAlpha = 1;

    // brilho de dano, alarme do chefe
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (flash > 0.01) {
      const v = ctx.createRadialGradient(W / 2, ALTURA / 2, ALTURA * 0.25, W / 2, ALTURA / 2, ALTURA * 0.85);
      v.addColorStop(0, rgba(flashCor, 0)); v.addColorStop(1, rgba(flashCor, Math.min(0.6, flash * 0.6)));
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, ALTURA);
      flash *= Math.pow(0.02, dt);
    }
    if (alarme > 0) {
      const a = (0.5 + 0.5 * Math.sin(t * 14)) * Math.min(1, alarme) * 0.32;
      const v = ctx.createLinearGradient(0, 0, 0, ALTURA);
      v.addColorStop(0, `rgba(239,68,68,${a})`); v.addColorStop(0.3, 'rgba(239,68,68,0)'); v.addColorStop(0.7, 'rgba(239,68,68,0)'); v.addColorStop(1, `rgba(239,68,68,${a})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, ALTURA);
    }
    if (J.ativo && J.nave && extra.hud !== false) desenharHud(J, extra);
  }

  function desenharInimigo(e, J) {
    const b = e.fl > 0;
    switch (e.tipo) {
      case 'drone': blitRot(SPR.drone(b), e.x, e.y, Math.sin(e.t * 3) * 0.3, 1); break;
      case 'mini': blitRot(SPR.mini(b), e.x, e.y, e.t * 3, 1); break;
      case 'cacador': { const vx = e.x - e.px, vy = e.y - e.py; const a = (Math.abs(vx) + Math.abs(vy) > 0.01) ? Math.atan2(vy, vx) - Math.PI / 2 : 0; blitRot(SPR.cacador(b), e.x, e.y, a, 1); break; }
      case 'nave': blitRot(SPR.navef(b), e.x, e.y, Math.sin(e.t * 4 + e.sx) * 0.12, 1); break;
      case 'meteoroG': case 'meteoroM': case 'meteoroP': blitRot(SPR.meteoro(e.r, e.forma || 0, b), e.x, e.y, e.rot, 1); break;
      case 'cristal': blitRot(SPR.cristal(), e.x, e.y, Math.sin(e.t * 3) * 0.4, 1, Math.cos(e.t * 4)); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; blit(brilho('#facc15'), e.x, e.y, 1.6); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break;
      case 'faisca': ctx.globalCompositeOperation = 'lighter'; blit(brilho('#22d3ee'), e.x, e.y, 1.8 + Math.sin(e.t * 6) * 0.2); ctx.globalCompositeOperation = 'source-over'; blitRot(SPR.faisca(), e.x, e.y, e.t * 2, 0.8); break;
      case 'chefe': desenharChefe(e); break;
      default: break;
    }
  }

  function desenharChefe(e) {
    const fase = e.fase === 2 ? 2 : 1;
    const cor = fase === 2 ? '#fb923c' : '#f0abfc';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55; blit(brilho(fase === 2 ? '#f97316' : '#a855f7'), e.x, e.y, 6.5); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    blitRot(SPR.casco(fase), e.x, e.y, Math.sin(e.t * 0.8) * 0.06, 1);
    // anel de torres girando
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) { const a = e.t * (fase === 2 ? 1.6 : 0.9) + k * TAU / 6; blit(brilho(cor), e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 25, 0.9); }
    const pulso = 1.6 + Math.sin(e.t * (fase === 2 ? 9 : 5)) * 0.35;
    blit(brilho(fase === 2 ? '#fdba74' : '#ff4fd8'), e.x, e.y, pulso * (e.fl > 0 ? 1.4 : 1));
    if (e.blindado) { ctx.strokeStyle = rgba('#e9d5ff', 0.35 + Math.sin(e.t * 10) * 0.15); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, 70, 0, TAU); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function desenharNave(J) {
    const n = J.nave;
    if (n.morta > 0) return;
    const pisca = n.inv > 0 && Math.floor(t * 12) % 2 === 0;
    // chama do motor
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.75 + Math.random() * 0.35 + Math.max(0, -n.vy / 430) * 0.4;
    blit(brilho('#22d3ee'), n.x, n.y + 15, 0.9 * fl);
    blit(brilho('#f0abfc'), n.x, n.y + 19, 0.55 * fl);
    if (!reduzMovimento && part.length < MAXP && Math.random() < 0.8) part.push({ x: n.x + (Math.random() - 0.5) * 6, y: n.y + 16, vx: (Math.random() - 0.5) * 20, vy: 140 + Math.random() * 90, vida: 0.28, max: 0.28, tam: 0.45, cor: Math.random() < 0.5 ? '#22d3ee' : '#a855f7', arrasto: 1 });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = pisca ? 0.3 : 1;
    blitRot(SPR.nave(), n.x, n.y, n.inclina * 0.12, 1, 1 - Math.abs(n.inclina) * 0.2);
    ctx.globalAlpha = 1;
    // o ponto que conta na colisão (justo: só o miolo)
    ctx.globalCompositeOperation = 'lighter';
    blit(brilho('#ffffff'), n.x, n.y + 1, 0.34);
    if (n.escudo > 0 && !(n.escudo < 1.5 && Math.floor(t * 8) % 2 === 0)) {
      ctx.globalAlpha = 0.55; blit(brilho('#60a5fa'), n.x, n.y, 3.2); ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba('#93c5fd', 0.75 + Math.sin(t * 10) * 0.2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(n.x, n.y, 25, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba('#bfdbfe', 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); for (let k2 = 0; k2 < 6; k2++) { const a = k2 * TAU / 6 + t; ctx.moveTo(n.x, n.y); ctx.lineTo(n.x + Math.cos(a) * 25, n.y + Math.sin(a) * 25); } ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function desenharHud(J, extra) {
    const n = J.nave, o = J.onda;
    ctx.textBaseline = 'alphabetic';
    // placar
    ctx.textAlign = 'left';
    ctx.font = '800 26px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = '#f5f3ff'; ctx.fillText(fmtPts(J.pontos), 16, 36);
    let fimPlacar = 16 + ctx.measureText(fmtPts(J.pontos)).width;
    if (J.mult > 1) { ctx.font = '800 20px "JetBrains Mono", ui-monospace, monospace'; ctx.fillStyle = '#67e8f9'; ctx.fillText('×' + J.mult, fimPlacar + 10, 35); fimPlacar += 10 + ctx.measureText('×' + J.mult).width; }
    // vidas e poderes
    for (let i = 0; i < n.vidaMax; i++) blit(SPR.coracao(n.morta <= 0 && i < n.vida), W - 26 - i * 30, 28, 1);
    let px = W - 26 - n.vidaMax * 30 - 8;
    for (const [tipo, tempo, max] of [['escudo', n.escudo, 6], ['triplo', n.triplo, 10]]) {
      if (tempo <= 0) continue;
      blit(SPR.item(tipo), px, 28, 0.72);
      ctx.strokeStyle = COR_ITEM[tipo]; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(px, 28, 19, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, tempo / max)); ctx.stroke();
      px -= 46;
    }
    const inicioDireita = px + 20;
    // onda (no chefe, a pílula vira o nome dele e a barra de vida fica logo embaixo)
    const c = J.inimigos.find((e) => e.tipo === 'chefe');
    let yOnda = 30;
    if (o) {
      ctx.textAlign = 'center';
      ctx.font = '750 16px "JetBrains Mono", ui-monospace, monospace';
      // cabe entre o placar e as vidas? senão, nome curto; e se ainda não couber, desce para a segunda linha
      const livre = Math.min(W / 2 - fimPlacar, inicioDireita - W / 2) * 2 - 40;
      let nome = c ? `ONDA ${o.n} · NAVE-MÃE${c.fase === 2 ? ' · FÚRIA' : ''}` : `ONDA ${o.n} · ${NOME_ONDA[o.tipo] || ''}`;
      if (ctx.measureText(nome).width > livre) nome = c ? `ONDA ${o.n} · NAVE-MÃE` : `ONDA ${o.n} · ${NOME_CURTO[o.tipo] || ''}`;
      const tw = ctx.measureText(nome).width;
      const y = tw > livre ? 70 : 30;
      yOnda = y;
      ctx.fillStyle = 'rgba(12,6,28,.62)'; roundRect(W / 2 - tw / 2 - 14, y - 19, tw + 28, 28, 14); ctx.fill();
      ctx.strokeStyle = o.tipo === 'chefe' ? 'rgba(248,113,113,.7)' : 'rgba(192,132,252,.55)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = o.tipo === 'chefe' ? '#fecaca' : '#ede9fe'; ctx.fillText(nome, W / 2, y);
      let prog = null;
      if (o.dur && o.tipo !== 'formacao') prog = Math.min(1, o.t / o.dur);
      if (prog != null && !o.acabou && !c) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(W / 2 - 60, y + 14, 120, 3); ctx.fillStyle = '#c084fc'; ctx.fillRect(W / 2 - 60, y + 14, 120 * prog, 3); }
    }
    // vida do chefe
    if (c) {
      const bw = Math.min(300, W * 0.5), bx = W / 2 - bw / 2, by = yOnda + 16;
      ctx.fillStyle = 'rgba(255,255,255,.1)'; roundRect(bx, by, bw, 9, 5); ctx.fill();
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#f0abfc'); g.addColorStop(1, c.fase === 2 ? '#fb923c' : '#a855f7');
      ctx.fillStyle = g; roundRect(bx, by, Math.max(4, bw * (c.hp / c.hpMax)), 9, 5); ctx.fill();
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  return {
    redimensionar, evento, desenhar, humor: definirHumor,
    get largura() { return W; },
    get escala() { return esc; },
  };
}

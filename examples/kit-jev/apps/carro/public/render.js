/* Carro Autônomo — renderizador canvas 2D (60 fps): cidade à noite vista de cima, câmera que segue o carro do Jev
   girando com ele, prédios em 2,5D com paralaxe, faróis, semáforos que brilham, caminho planejado e caixas de percepção. */
(function () {
  'use strict';
  const S = window.CarroSim;
  const { W, H, R, LANE_D, ROAD, CURB, WALK, X_RUA, BOX, CW_W, pose, rel, clamp, lerp } = S;

  const COL = {
    ground: '#0b0f19', lot: '#111623', park: '#0e1c15', park2: '#10211a', path: '#1f2824', pond: '#0a1a2b',
    walk: '#1d2334', walkEdge: '#2b3449', curb: '#3d4760', asphalt: '#191d28', asphalt2: '#1c212d',
    lane: 'rgba(235,240,255,.8)', edge: 'rgba(235,240,255,.38)', zebra: 'rgba(240,244,255,.85)', yellow: 'rgba(250,204,21,.82)',
  };
  const ACAO_COR = { acelerar: '#3aa0ff', manter: '#dfe7f2', frear_suave: '#ffb020', frear_forte: '#ff5a4e', mudar_para_esquerda: '#34d27b', mudar_para_direita: '#34d27b' };

  // ------------------------------------------------------------------ mundo decorativo (determinístico)
  const rnd = S.rng(20260923);
  const sdLoop = (x, y) => {
    const qx = Math.abs(x - W / 2) - (W / 2 - R), qy = Math.abs(y - H / 2) - (H / 2 - R);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;
  };
  const X0 = -210, X1 = 630, Y0 = -190, Y1 = 430;
  const STREETS = [
    { x: X_RUA - BOX, y: Y0, w: BOX * 2, h: Y1 - Y0, cross: true },
    { x: 110 - 4.5, y: Y0, w: 9, h: -ROAD - Y0 }, { x: 340 - 4.5, y: Y0, w: 9, h: -ROAD - Y0 },
    { x: 110 - 4.5, y: H + ROAD, w: 9, h: Y1 - H - ROAD }, { x: 340 - 4.5, y: H + ROAD, w: 9, h: Y1 - H - ROAD },
    { x: W + ROAD, y: 150 - 4.5, w: X1 - W - ROAD, h: 9 }, { x: X0, y: 90 - 4.5, w: -ROAD - X0, h: 9 },
  ];
  const POND = { x: 118, y: 124, rx: 50, ry: 30 };
  const PLAZA = { x: 330, y: 120, r: 15 };
  const SCHOOL = { x: -66, y: 100, w: 44, h: 42 };

  function hitsStreet(x, y, w, h, m) {
    for (const s of STREETS) if (x < s.x + s.w + m && x + w > s.x - m && y < s.y + s.h + m && y + h > s.y - m) return true;
    return false;
  }
  const BUILDINGS = [];
  (function genBuildings() {
    const cell = 25;
    const roofs = ['#1b2234', '#1f2739', '#232b3f', '#1a2131', '#262e44', '#202839', '#1d2436'];
    for (let gx = X0; gx < X1; gx += cell) for (let gy = Y0; gy < Y1; gy += cell) {
      if (rnd() < 0.1) continue;
      const parts = rnd() < 0.4 ? 2 : 1;
      for (let k = 0; k < parts; k++) {
        const m = 2.2 + rnd() * 2.5;
        let x = gx + m, y = gy + m, w = cell - 2 * m, h = cell - 2 * m;
        if (parts === 2) { if (rnd() < 0.5) { w = (w - 2) / 2; x += k * (w + 2); } else { h = (h - 2) / 2; y += k * (h + 2); } }
        const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2], [x + w / 2, y + h / 2]];
        if (pts.some(([px, py]) => sdLoop(px, py) < WALK + 2.2)) continue;
        if (hitsStreet(x, y, w, h, 4)) continue;
        if (x < SCHOOL.x + SCHOOL.w + 4 && x + w > SCHOOL.x - 4 && y < SCHOOL.y + SCHOOL.h + 4 && y + h > SCHOOL.y - 4) continue;
        const tall = rnd();
        const ht = tall > 0.93 ? 55 + rnd() * 35 : 9 + Math.pow(rnd(), 1.6) * 38;
        const warm = rnd() < 0.72;
        BUILDINGS.push({
          x, y, w, h, ht, roof: roofs[Math.floor(rnd() * roofs.length)], lit: 0.25 + rnd() * 0.55,
          win: warm ? '255,205,125' : rnd() < 0.5 ? '160,215,255' : '235,240,255', dash: [0.7 + rnd() * 0.6, 0.9 + rnd() * 1.6],
          detail: rnd(), neon: rnd() < 0.16 ? ['#3aa0ff', '#ffb020', '#ff5a4e', '#f2f4f7'][Math.floor(rnd() * 4)] : null,
          cx: x + w / 2, cy: y + h / 2, tank: rnd() < 0.35, pool: ht < 28 && rnd() < 0.08, heli: ht > 70, seed: rnd() * 1000, solar: rnd() < 0.18, garden: rnd() < 0.12,
        });
      }
    }
    BUILDINGS.push({ x: SCHOOL.x, y: SCHOOL.y, w: 26, h: SCHOOL.h, ht: 11, roof: '#3a2f1a', lit: 0.6, win: '255,205,125', dash: [1, 1.2], detail: 0, school: true, seed: 7, cx: SCHOOL.x + 13, cy: SCHOOL.y + SCHOOL.h / 2 });
  })();

  const TREES = [];
  (function genTrees() {
    for (let x = WALK + 4; x < W - WALK - 4; x += 7.5) for (let y = WALK + 4; y < H - WALK - 4; y += 7.5) {
      const px = x + (rnd() - 0.5) * 5, py = y + (rnd() - 0.5) * 5;
      if (sdLoop(px, py) > -WALK - 3) continue;
      if (Math.abs(px - X_RUA) < BOX + 5.5) continue;
      if (((px - POND.x) / (POND.rx + 5)) ** 2 + ((py - POND.y) / (POND.ry + 5)) ** 2 < 1) continue;
      if (Math.hypot(px - PLAZA.x, py - PLAZA.y) < PLAZA.r + 7) continue;
      if (Math.abs(py - 124) < 3.2 && px > PLAZA.x) continue; // caminho até a faixa de pedestres da direita
      if (Math.abs(py - 119) < 3.2 && px < POND.x) continue;  // caminho até a faixa da esquerda
      if (rnd() < 0.3) continue;
      TREES.push({ x: px, y: py, r: 2.2 + rnd() * 2.6, v: Math.floor(rnd() * 3), a: rnd() * 6.28 });
    }
    // árvores de calçada ao longo da avenida
    for (let s = 6; s < S.LEN; s += 17) {
      for (const side of [-1, 1]) {
        const ss = s + (side > 0 ? 8 : 0);
        if (S.CROSSWALKS.some((c) => Math.abs(rel(c.s, ss)) < 9)) continue;
        if (S.LIGHTS.some((l) => Math.abs(rel(l.si, ss)) < 14)) continue;
        const p = pose(ss, side * (CURB + 2.4));
        if (hitsStreet(p.x - 1, p.y - 1, 2, 2, 3)) continue;
        TREES.push({ x: p.x, y: p.y, r: 1.8 + rnd() * 1.1, v: Math.floor(rnd() * 3), a: rnd() * 6.28, street: true });
      }
    }
  })();
  const LAMPS = [];
  (function genLamps() {
    for (let s = 14; s < S.LEN; s += 34) for (const side of [-1, 1]) {
      const ss = s + (side > 0 ? 17 : 0);
      if (S.LIGHTS.some((l) => Math.abs(rel(l.si, ss)) < 10)) continue;
      const p = pose(ss, side * (CURB + 0.7));
      if (hitsStreet(p.x - 1, p.y - 1, 2, 2, 1)) continue;
      const q = pose(ss, side * (CURB - 1.6));
      LAMPS.push({ x: p.x, y: p.y, hx: q.x, hy: q.y });
    }
  })();
  const SIGNS = [
    { s: S.ZONES[0].s0 - 4, lim: 30 }, { s: S.ZONES[0].s1 + 3, lim: 50 }, { s: 30, lim: 50 }, { s: 420, lim: 50 }, { s: 640, lim: 50 },
  ];

  // ------------------------------------------------------------------ sprites
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function glowSprite(rgb, size) {
    const c = mkCanvas(size, size), g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.25, `rgba(${rgb},.45)`); gr.addColorStop(0.6, `rgba(${rgb},.12)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  function headlightSprite(rgb) {
    const w = 256, h = 128, c = mkCanvas(w, h), g = c.getContext('2d');
    g.filter = 'blur(7px)';
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(0.35, `rgba(${rgb},.22)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(10, h / 2 - 12); g.lineTo(w - 12, 10); g.lineTo(w - 12, h - 10); g.lineTo(10, h / 2 + 12); g.closePath(); g.fill();
    return c;
  }
  function treeSprite(v) {
    const s = 96, c = mkCanvas(s, s), g = c.getContext('2d');
    const pal = [['#1f5a3a', '#123826', '#0b2418'], ['#2a6b3f', '#164a2b', '#0c2a19'], ['#245b4a', '#153d33', '#0b261f']][v];
    const blob = (x, y, r, col) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, col[0]); gr.addColorStop(0.7, col[1]); gr.addColorStop(1, col[2]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
    blob(s / 2, s / 2, s * 0.44, pal);
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + v; blob(s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18, s * 0.2, pal); }
    return c;
  }

  const PPM = 26; // pixels por metro nos sprites de carro
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; gg *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; }
    return `rgb(${r | 0},${gg | 0},${b | 0})`;
  }
  function carSprite(kind, color, len, wid, ego) {
    const pad = 0.6, cw = Math.ceil((len + pad * 2) * PPM), ch = Math.ceil((wid + pad * 2) * PPM);
    const c = mkCanvas(cw, ch), g = c.getContext('2d');
    g.translate(cw / 2, ch / 2); g.scale(PPM, PPM);
    const L = len, Wd = wid, hl = L / 2, hw = Wd / 2;
    // sombra
    g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, -hl + 0.15, -hw + 0.12, L, Wd, 0.55); g.fill();
    // carroceria com volume
    const body = g.createLinearGradient(0, -hw, 0, hw);
    body.addColorStop(0, shade(color, -0.45)); body.addColorStop(0.22, shade(color, 0.05)); body.addColorStop(0.5, shade(color, 0.22)); body.addColorStop(0.78, shade(color, 0.05)); body.addColorStop(1, shade(color, -0.45));
    g.fillStyle = body; rr(g, -hl, -hw, L, Wd, kind === 'bus' ? 0.35 : 0.6); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.05; g.stroke();
    const glass = '#0b1322', glassHi = 'rgba(160,200,255,.28)';
    if (kind === 'bus') {
      g.fillStyle = glass; rr(g, hl - 1.1, -hw + 0.18, 0.75, Wd - 0.36, 0.2); g.fill();
      g.fillStyle = shade(color, -0.15); rr(g, -hl + 0.5, -hw + 0.35, L - 2, Wd - 0.7, 0.2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let x = -hl + 1; x < hl - 2; x += 2.2) { g.fillRect(x, -0.35, 1.3, 0.7); }
      g.fillStyle = glass; g.fillRect(-hl + 0.4, -hw + 0.02, L - 1.6, 0.16); g.fillRect(-hl + 0.4, hw - 0.18, L - 1.6, 0.16);
    } else if (kind === 'pickup') {
      g.fillStyle = glass; g.beginPath(); g.moveTo(hl * 0.62, -hw * 0.8); g.lineTo(hl * 0.36, -hw * 0.72); g.lineTo(hl * 0.36, hw * 0.72); g.lineTo(hl * 0.62, hw * 0.8); g.closePath(); g.fill();
      g.fillStyle = shade(color, 0.12); rr(g, -hl * 0.05, -hw * 0.74, hl * 0.42, Wd * 0.74, 0.15); g.fill();
      g.fillStyle = shade(color, -0.5); rr(g, -hl + 0.2, -hw + 0.18, hl * 0.95, Wd - 0.36, 0.1); g.fill();
      g.strokeStyle = shade(color, -0.25); g.lineWidth = 0.06; for (let x = -hl + 0.5; x < -0.2; x += 0.45) { g.beginPath(); g.moveTo(x, -hw + 0.25); g.lineTo(x, hw - 0.25); g.stroke(); }
      g.fillStyle = '#8b5a2b'; rr(g, -hl + 0.5, -0.45, 0.8, 0.9, 0.08); g.fill(); rr(g, -hl + 1.45, -0.55, 0.6, 0.6, 0.08); g.fill();
    } else {
      const van = kind === 'van';
      const ws = van ? hl * 0.62 : hl * 0.42, we = van ? hl * 0.38 : hl * 0.06;
      g.fillStyle = glass; g.beginPath(); g.moveTo(ws, -hw * 0.8); g.lineTo(we, -hw * 0.7); g.lineTo(we, hw * 0.7); g.lineTo(ws, hw * 0.8); g.closePath(); g.fill();
      g.fillStyle = glassHi; g.beginPath(); g.moveTo(ws - 0.08, -hw * 0.6); g.lineTo(we + 0.1, -hw * 0.55); g.lineTo(we + 0.14, -hw * 0.3); g.lineTo(ws - 0.05, -hw * 0.35); g.closePath(); g.fill();
      const rs = van ? -hl * 0.9 : -hl * 0.48, re = van ? -hl * 0.78 : -hl * 0.66;
      g.fillStyle = glass; g.beginPath(); g.moveTo(rs, -hw * 0.68); g.lineTo(re, -hw * 0.74); g.lineTo(re, hw * 0.74); g.lineTo(rs, hw * 0.68); g.closePath(); g.fill();
      g.fillStyle = shade(color, van ? 0.18 : 0.12); rr(g, rs, -hw * 0.7, we - rs, Wd * 0.7, 0.25); g.fill();
      g.fillStyle = glass; g.fillRect(rs + 0.1, -hw * 0.74, we - rs - 0.2, 0.12); g.fillRect(rs + 0.1, hw * 0.74 - 0.12, we - rs - 0.2, 0.12);
      if (kind === 'taxi') { g.fillStyle = '#fff7d6'; rr(g, -hl * 0.3, -0.32, 0.55, 0.64, 0.08); g.fill(); g.fillStyle = '#111'; g.font = '700 0.28px sans-serif'; g.save(); g.translate(-hl * 0.02, 0); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TÁXI', 0, 0); g.restore(); }
    }
    // espelhos, faróis e lanternas
    g.fillStyle = shade(color, -0.2); g.fillRect(hl * 0.3, -hw - 0.14, 0.22, 0.16); g.fillRect(hl * 0.3, hw - 0.02, 0.22, 0.16);
    g.fillStyle = '#fff4cf'; rr(g, hl - 0.2, -hw + 0.12, 0.16, 0.42, 0.06); g.fill(); rr(g, hl - 0.2, hw - 0.54, 0.16, 0.42, 0.06); g.fill();
    g.fillStyle = '#5c1111'; rr(g, -hl + 0.03, -hw + 0.1, 0.14, 0.46, 0.05); g.fill(); rr(g, -hl + 0.03, hw - 0.56, 0.14, 0.46, 0.05); g.fill();
    if (ego) {
      // faixas do Jev, sensor LIDAR, sensores laterais
      const gr = g.createLinearGradient(-hl, 0, hl, 0); gr.addColorStop(0, '#2f8df2'); gr.addColorStop(1, '#74bdff');
      g.fillStyle = gr; g.fillRect(-hl + 0.2, -0.16, L - 0.45, 0.07); g.fillRect(-hl + 0.2, 0.09, L - 0.45, 0.07);
      g.fillStyle = '#0b0f1a'; g.beginPath(); g.arc(-hl * 0.2, 0, 0.36, 0, 6.283); g.fill();
      g.strokeStyle = '#3aa0ff'; g.lineWidth = 0.07; g.beginPath(); g.arc(-hl * 0.2, 0, 0.3, 0, 6.283); g.stroke();
      g.fillStyle = '#3aa0ff'; for (const [x, y] of [[hl - 0.12, 0], [hl * 0.5, -hw + 0.02], [hl * 0.5, hw - 0.02], [-hl + 0.1, 0]]) { g.beginPath(); g.arc(x, y, 0.07, 0, 6.283); g.fill(); }
    }
    return { c, w: cw / PPM, h: ch / PPM };
  }

  // ------------------------------------------------------------------ renderizador
  class Renderer {
    constructor(canvas, sim) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.sim = sim;
      this.cam = { x: 0, y: 0, a: 0, m: 82 };
      this.anchor = 0.7;
      this.time = 0;
      this.decision = null;       // última decisão do Jev (para cores)
      this.sprites = new Map();
      this.fx = [];
      this.G = {
        warm: glowSprite('255,190,110', 128), cyan: glowSprite('58,160,255', 128), red: glowSprite('248,60,60', 128),
        amber: glowSprite('251,191,36', 128), green: glowSprite('52,211,153', 128), white: glowSprite('235,240,255', 128), violet: glowSprite('167,139,250', 128),
        hlWarm: headlightSprite('255,236,200'), hlCool: headlightSprite('200,240,255'),
        trees: [treeSprite(0), treeSprite(1), treeSprite(2)],
      };
      this._buildPaths();
      this.resize();
      this.snap();
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
      this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    }
    snap() { this.updateCamera(0, true); }

    _buildPaths() {
      const P = {};
      const loop = (off) => { const p = new Path2D(); p.roundRect(-off, -off, W + 2 * off, H + 2 * off, Math.max(1, R + off)); return p; };
      P.loop = loop(0);
      P.edgeOut = loop(3.25); P.edgeIn = loop(-3.25);
      P.curbOut = loop(CURB - 0.2); P.curbIn = loop(-(CURB - 0.2));
      P.park = loop(-WALK);
      P.walkOut = loop(WALK); P.walkIn = loop(-WALK);
      // ruas da cidade
      P.streets = new Path2D(); P.streetWalks = new Path2D(); P.streetLines = new Path2D();
      for (const s of STREETS) {
        P.streets.rect(s.x, s.y, s.w, s.h);
        if (s.w < s.h) { P.streetWalks.rect(s.x - 3, s.y, s.w + 6, s.h); }
        else { P.streetWalks.rect(s.x, s.y - 3, s.w, s.h + 6); }
      }
      // linha dupla amarela da transversal (fora da avenida)
      const yl = new Path2D();
      for (const [a, b] of [[Y0, -WALK - 1], [WALK + 1, H - WALK - 1], [H + WALK + 1, Y1]]) { yl.rect(X_RUA - 0.28, a, 0.14, b - a); yl.rect(X_RUA + 0.14, a, 0.14, b - a); }
      P.crossYellow = yl;
      // faixas de pedestres da avenida
      const zebra = new Path2D();
      const rectSD = (path, s0, s1, d0, d1) => {
        const a = pose(s0, d0), b = pose(s1, d0), c = pose(s1, d1), d = pose(s0, d1);
        path.moveTo(a.x, a.y); path.lineTo(b.x, b.y); path.lineTo(c.x, c.y); path.lineTo(d.x, d.y); path.closePath();
      };
      for (const cw of S.CROSSWALKS) for (let d = -3.3; d < 3.3; d += 0.9) rectSD(zebra, cw.s - CW_W / 2, cw.s + CW_W / 2, d, d + 0.48);
      // faixas de pedestres da transversal (dos dois lados da avenida, em cima e embaixo)
      for (const l of S.LIGHTS) {
        const c = pose(l.si, 0); const up = l.id === 0 ? -1 : 1;
        for (const side of [-1, 1]) {
          const y0 = c.y + side * (WALK + 1.5);
          for (let x = X_RUA - BOX + 0.3; x < X_RUA + BOX - 0.3; x += 0.9) zebra.rect(x, Math.min(y0, y0 + side * 3.5), 0.48, 3.5);
        }
        void up;
      }
      P.zebra = zebra;
      // linhas de parada
      const stops = new Path2D();
      for (const l of S.LIGHTS) rectSD(stops, l.stop - 0.25, l.stop + 0.25, -ROAD + 0.1, ROAD - 0.1);
      for (const l of S.LIGHTS) { const c = pose(l.si, 0); for (const side of [-1, 1]) { const y = c.y + side * (WALK + 5.6); const x0 = side < 0 ? X_RUA - BOX + 0.2 : X_RUA + 0.2; stops.rect(x0, y - 0.2, BOX - 0.4, 0.4); } }
      P.stops = stops;
      // obras
      const rw = S.ROADWORK; const rwp = new Path2D(); rectSD(rwp, rw.s0, rw.s1, 0.05, ROAD - 0.1); P.roadwork = rwp;
      const hatch = new Path2D();
      for (let s = rw.s0; s < rw.s1 - 1; s += 1.6) { const a = pose(s, 0.3), b = pose(s + 1.4, ROAD - 0.3); hatch.moveTo(a.x, a.y); hatch.lineTo(b.x, b.y); }
      P.roadworkHatch = hatch;
      // zona escolar (asfalto tingido)
      const z = S.ZONES[0]; const zp = new Path2D(); rectSD(zp, z.s0, z.s1, -ROAD, ROAD); P.zone = zp;
      // caminhos do parque
      const paths = new Path2D();
      paths.ellipse(POND.x, POND.y, POND.rx + 4, POND.ry + 4, 0, 0, 6.283);
      P.parkPaths = paths;
      const straight = new Path2D();
      straight.rect(PLAZA.x, 122.4, W - WALK - PLAZA.x + 1, 3.2); straight.rect(WALK - 1, 117.4, POND.x - POND.rx - WALK - 2, 3.2);
      straight.rect(X_RUA + BOX + 3, 117, PLAZA.x - PLAZA.r - X_RUA - BOX - 2, 3.2); straight.rect(POND.x + POND.rx + 3, 117, X_RUA - BOX - 3 - POND.x - POND.rx - 3, 3.2);
      P.parkStraight = straight;
      this.P = P;
    }

    sprite(kind, color, len, wid, ego) {
      const k = kind + color + (ego ? 'E' : '');
      let s = this.sprites.get(k);
      if (!s) { s = carSprite(kind, color, len, wid, ego); this.sprites.set(k, s); }
      return s;
    }

    updateCamera(dt, snap) {
      const e = this.sim.ego, p = pose(e.s, e.d), ahead = pose(e.s + 12, e.d);
      const tgtA = Math.atan2(ahead.y - p.y, ahead.x - p.x) + e.yaw * 0.3;
      let da = tgtA - this.cam.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.cam.a += snap ? da : da * (1 - Math.exp(-dt / 0.42));
      this.cam.x = p.x; this.cam.y = p.y;
      const portrait = this.h > this.w * 1.05;
      const tm = lerp(portrait ? 64 : 68, portrait ? 78 : 86, clamp(e.v / 14, 0, 1));
      this.cam.m += snap ? tm - this.cam.m : (tm - this.cam.m) * (1 - Math.exp(-dt / 1.4));
    }
    _setCam() {
      const z = this.h / this.cam.m, al = -Math.PI / 2 - this.cam.a, c = Math.cos(al), s = Math.sin(al);
      const cx = this.w / 2, cy = this.h * this.anchor, d = this.dpr;
      this.z = z; this.ca = c; this.sa = s; this.cx = cx; this.cy = cy;
      this.ctx.setTransform(d * z * c, d * z * s, -d * z * s, d * z * c, d * (cx - z * (c * this.cam.x - s * this.cam.y)), d * (cy - z * (s * this.cam.x + c * this.cam.y)));
    }
    w2s(x, y) { const dx = x - this.cam.x, dy = y - this.cam.y; return { x: this.cx + this.z * (this.ca * dx - this.sa * dy), y: this.cy + this.z * (this.sa * dx + this.ca * dy) }; }
    s2w(px, py) { const X = (px - this.cx) / this.z, Y = (py - this.cy) / this.z; return { x: this.cam.x + this.ca * X + this.sa * Y, y: this.cam.y - this.sa * X + this.ca * Y }; }
    visible(x, y, r) { return Math.abs(x - this.eye.x) < this.rad + r && Math.abs(y - this.eye.y) < this.rad + r; }
    lean(x, y, h) { const k = h / 210; return { x: x + (x - this.eye.x) * k, y: y + (y - this.eye.y) * k }; }

    draw(dt) {
      const ctx = this.ctx;
      this.time += dt;
      this.updateCamera(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      this._setCam();
      this.eye = this.s2w(this.w / 2, this.h / 2);
      this.rad = Math.hypot(this.w, this.h) / 2 / this.z + 6;
      this._ground();
      this._roads();
      this._lampPools();
      this._path();
      this._roadwork();
      this._cones();
      this._peds();
      this._headlights();
      this._vehicles();
      this._signals();
      this._trees();
      this._lamps();
      this._buildings();
      this._sensorsWorld();
      this._fx();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._sensorsScreen();
      this._vignette();
    }

    // ---------------------------------------------------------------- camadas
    _ground() {
      const ctx = this.ctx, P = this.P;
      ctx.fillStyle = COL.lot; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      ctx.fillStyle = COL.walk; ctx.fill(P.streetWalks);
      ctx.fillStyle = COL.park; ctx.fill(P.park);
      // lago
      const g = ctx.createRadialGradient(POND.x - 10, POND.y - 8, 4, POND.x, POND.y, POND.rx);
      g.addColorStop(0, '#12314d'); g.addColorStop(1, COL.pond);
      ctx.fillStyle = '#16241c'; ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx + 1.2, POND.ry + 1.2, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(120,190,255,.10)'; ctx.lineWidth = 0.35;
      for (let i = 0; i < 4; i++) { const t = (this.time * 0.25 + i / 4) % 1; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.ellipse(POND.x + 12, POND.y + 4, 3 + t * 14, 2 + t * 9, 0, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // caminhos e praça
      ctx.strokeStyle = COL.path; ctx.lineWidth = 3; ctx.stroke(P.parkPaths);
      ctx.fillStyle = COL.path; ctx.fill(P.parkStraight);
      ctx.fillStyle = '#1e2724'; ctx.beginPath(); ctx.arc(PLAZA.x, PLAZA.y, PLAZA.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#10263a'; ctx.beginPath(); ctx.arc(PLAZA.x, PLAZA.y, 5.5, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,.45)'; ctx.lineWidth = 0.3;
      for (let i = 0; i < 3; i++) { const t = (this.time * 0.5 + i / 3) % 1; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.arc(PLAZA.x, PLAZA.y, 1 + t * 4.2, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // quadra da escola
      const sc = SCHOOL;
      ctx.fillStyle = '#123b2c'; ctx.fillRect(sc.x + 29, sc.y + 4, 14, 26);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.18; ctx.strokeRect(sc.x + 30, sc.y + 5, 12, 24); ctx.beginPath(); ctx.moveTo(sc.x + 30, sc.y + 17); ctx.lineTo(sc.x + 42, sc.y + 17); ctx.stroke();
      ctx.beginPath(); ctx.arc(sc.x + 36, sc.y + 17, 2, 0, 6.283); ctx.stroke();
    }

    _roads() {
      const ctx = this.ctx, P = this.P;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = COL.walk; ctx.lineWidth = WALK * 2; ctx.stroke(P.loop);
      ctx.strokeStyle = COL.walkEdge; ctx.lineWidth = 0.3; ctx.stroke(P.walkOut); ctx.stroke(P.walkIn);
      ctx.strokeStyle = COL.asphalt; ctx.lineWidth = ROAD * 2 + 0.3; ctx.stroke(P.loop);
      ctx.fillStyle = COL.asphalt; ctx.fill(P.streets);
      // zona escolar
      ctx.fillStyle = 'rgba(250,204,21,.07)'; ctx.fill(P.zone);
      // meio-fio
      ctx.strokeStyle = COL.curb; ctx.lineWidth = 0.35; ctx.stroke(P.curbOut); ctx.stroke(P.curbIn);
      // marcas
      ctx.setLineDash([3, 5]); ctx.strokeStyle = COL.lane; ctx.lineWidth = 0.16; ctx.stroke(P.loop);
      ctx.setLineDash([]); ctx.strokeStyle = COL.edge; ctx.lineWidth = 0.13; ctx.stroke(P.edgeOut); ctx.stroke(P.edgeIn);
      // cruzamentos (cobre as marcas) + linha amarela da transversal
      for (const l of S.LIGHTS) { const c = pose(l.si, 0); ctx.fillStyle = COL.asphalt2; ctx.fillRect(X_RUA - BOX, c.y - WALK, BOX * 2, WALK * 2); }
      for (const s of STREETS) if (!s.cross) { ctx.fillStyle = COL.asphalt; ctx.fillRect(s.x, s.y, s.w, s.h); }
      ctx.fillStyle = COL.yellow; ctx.fill(P.crossYellow);
      ctx.fillStyle = COL.zebra; ctx.fill(P.zebra);
      ctx.fillStyle = 'rgba(245,248,255,.9)'; ctx.fill(P.stops);
      // pintura da zona escolar e setas
      this._paintText(S.ZONES[0].s0 + 8, 'ESCOLA', '#facc15', 1.6);
      this._paintText(S.ZONES[0].s0 + 14, '30', '#facc15', 3.2);
      this._paintText(S.ZONES[0].s0 + 21, 'DEVAGAR', '#facc15', 1.25);
      for (const s of [70, 250, 560, 690]) for (const d of LANE_D) this._arrow(s, d);
      // placas de velocidade
      for (const sg of SIGNS) this._sign(sg.s, sg.lim);
    }
    _paintText(s, txt, color, size) {
      if (!this.visible(pose(s, 0).x, pose(s, 0).y, 10)) return;
      const ctx = this.ctx;
      for (const d of LANE_D) {
        const p = pose(s, d);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h + Math.PI / 2); ctx.scale(0.1, 0.1);
        ctx.fillStyle = color; ctx.globalAlpha = 0.75; ctx.font = `900 ${size * 10}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    _arrow(s, d) {
      const p = pose(s, d); if (!this.visible(p.x, p.y, 6)) return;
      const ctx = this.ctx; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h);
      ctx.fillStyle = 'rgba(235,240,255,.55)';
      ctx.beginPath(); ctx.moveTo(2.2, 0); ctx.lineTo(0.6, -0.75); ctx.lineTo(0.6, -0.28); ctx.lineTo(-2, -0.28); ctx.lineTo(-2, 0.28); ctx.lineTo(0.6, 0.28); ctx.lineTo(0.6, 0.75); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    _sign(s, lim) {
      const p = pose(s, CURB + 1.5); if (!this.visible(p.x, p.y, 4)) return;
      const q = this.lean(p.x, p.y, 3);
      const ctx = this.ctx;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(this.cam.a + Math.PI / 2);
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, 0, 0.95, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.22; ctx.stroke();
      ctx.scale(0.1, 0.1); ctx.fillStyle = '#0f172a'; ctx.font = '900 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(lim), 0, 0.5);
      ctx.restore();
    }

    _lampPools() {
      const ctx = this.ctx; ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.2;
      for (const l of LAMPS) if (this.visible(l.x, l.y, 12)) ctx.drawImage(this.G.warm, l.hx - 10, l.hy - 10, 20, 20);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // caminho planejado do carro do Jev (faixa colorida pela decisão atual)
    _path() {
      const sim = this.sim, e = sim.ego, ctx = this.ctx;
      const acao = e.emerg ? 'frear_forte' : (e.cmd && e.cmd.acao) || 'manter';
      const col = ACAO_COR[acao] || '#3aa0ff';
      let len = clamp(10 + e.v * 3.2, 14, 55);
      const stopTarget = (acao === 'frear_suave' || acao === 'frear_forte') && e.target && e.target.v === 0 ? e.target.dist : null;
      if (stopTarget != null) len = clamp(stopTarget + e.len / 2, 2, 60);
      const pts = [];
      for (let k = 0; k <= len; k += 1.5) { const s = e.s + e.len / 2 + k; const p = pose(s, sim._dAt(e, s)); pts.push(p); }
      if (pts.length < 2) return;
      const a = pts[0], b = pts[pts.length - 1];
      const gr = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gr.addColorStop(0, hexA(col, 0.32)); gr.addColorStop(1, hexA(col, 0.02));
      ctx.strokeStyle = gr; ctx.lineWidth = 2.3; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); for (const p of pts) ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = hexA(col, 0.75); ctx.lineWidth = 0.12; ctx.setLineDash([1.2, 1.2]);
      for (const side of [-1.15, 1.15]) { ctx.beginPath(); pts.forEach((p, i) => { const q = { x: p.x - Math.sin(p.h) * side, y: p.y + Math.cos(p.h) * side }; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); }
      ctx.setLineDash([]);
      if (stopTarget != null && stopTarget < 58) {
        const s = e.s + e.len / 2 + stopTarget, dd = sim._dAt(e, s);
        const p1 = pose(s, dd - 1.4), p2 = pose(s, dd + 1.4);
        ctx.strokeStyle = hexA(col, 0.95); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        this._stopMark = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, col };
      } else this._stopMark = null;
    }

    _roadwork() {
      const rw = S.ROADWORK, mid = pose((rw.s0 + rw.s1) / 2, 1.75);
      if (!this.visible(mid.x, mid.y, 20)) return;
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(249,115,22,.10)'; ctx.fill(this.P.roadwork);
      ctx.strokeStyle = 'rgba(249,115,22,.35)'; ctx.lineWidth = 0.35; ctx.stroke(this.P.roadworkHatch);
      const hole = [pose(rw.s0 + 8, 0.9), pose(rw.s0 + 16, 0.9), pose(rw.s0 + 16, 2.9), pose(rw.s0 + 8, 2.9)];
      ctx.fillStyle = '#2b2622'; ctx.beginPath(); hole.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
      for (let s = rw.s0 + 1; s <= rw.s1 - 1; s += 3) this._cone(pose(s, 0.35), 1.1);
      for (const s of [rw.s0 + 0.5, rw.s1 - 0.5]) this._barrier(s, 0.4, ROAD - 0.3);
      const blink = Math.sin(this.time * 7) > 0;
      if (blink) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; for (const s of [rw.s0 + 0.5, rw.s1 - 0.5]) { const p = pose(s, 1.8); ctx.drawImage(this.G.amber, p.x - 3, p.y - 3, 6, 6); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      const t = pose(rw.s0 + 4.5, 1.9);
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.h + Math.PI / 2); ctx.scale(0.1, 0.1); ctx.fillStyle = 'rgba(253,186,116,.9)'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OBRAS', 0, 0); ctx.restore();
    }
    _barrier(s, d0, d1) {
      const ctx = this.ctx, a = pose(s, d0), b = pose(s, d1);
      ctx.lineCap = 'butt'; ctx.lineWidth = 0.55;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        ctx.strokeStyle = i % 2 ? '#f8fafc' : '#f97316';
        ctx.beginPath(); ctx.moveTo(lerp(a.x, b.x, t0), lerp(a.y, b.y, t0)); ctx.lineTo(lerp(a.x, b.x, t1), lerp(a.y, b.y, t1)); ctx.stroke();
      }
    }
    _cone(p, scale) {
      const ctx = this.ctx, k = scale || 1.3;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(p.x + 0.12, p.y + 0.12, 0.42 * k, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h || 0);
      ctx.fillStyle = '#c2410c'; ctx.fillRect(-0.34 * k, -0.34 * k, 0.68 * k, 0.68 * k);
      ctx.restore();
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.3 * k, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 0.09 * k; ctx.beginPath(); ctx.arc(p.x, p.y, 0.19 * k, 0, 6.283); ctx.stroke();
      ctx.fillStyle = '#fed7aa'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.07 * k, 0, 6.283); ctx.fill();
    }
    _cones() {
      const sim = this.sim, ctx = this.ctx;
      for (const c of sim.cones) {
        if (c.fixed) continue;
        const p = pose(c.s, c.d); if (!this.visible(p.x, p.y, 6)) continue;
        const age = sim.t - (c.t || 0);
        if (age < 1.6) { // anel de "soltou o cone"
          ctx.strokeStyle = `rgba(251,146,60,${(1 - age / 1.6) * 0.9})`; ctx.lineWidth = 0.25;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + age * 5, 0, 6.283); ctx.stroke();
        }
        for (const dd of [-0.85, 0, 0.85]) { const q = pose(c.s + (dd === 0 ? 0.35 : -0.25), c.d + dd); this._cone(q, 1.25); }
      }
    }

    _peds() {
      const ctx = this.ctx, sim = this.sim;
      for (const p of sim.peds) {
        const q = pose(p.s, p.d); if (!this.visible(q.x, q.y, 3)) continue;
        const road = pose(p.s, 0);
        let hx = -Math.sin(road.h) * p.dir, hy = Math.cos(road.h) * p.dir;
        if (p.st === 'away') { const sg = p.id % 2 ? 1 : -1; hx = Math.cos(road.h) * sg; hy = Math.sin(road.h) * sg; }
        const ang = Math.atan2(hy, hx), k = 2.5;
        ctx.globalAlpha = p.fade;
        if (p.st === 'cross' || (p.st === 'wait' && sim.pedBlocks(p, 0))) {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * p.fade; ctx.drawImage(this.G.white, q.x - 2.2, q.y - 2.2, 4.4, 4.4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = p.fade;
        }
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0.12, 0.12, 0.3 * k, 0.36 * k, 0, 0, 6.283); ctx.fill();
        const sw = p.st === 'wait' ? 0 : Math.sin(p.walk * 1.8) * 0.2 * k;
        ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(sw, -0.1 * k, 0.12 * k, 0.07 * k, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(-sw, 0.1 * k, 0.12 * k, 0.07 * k, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, 0.16 * k, 0.29 * k, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.05 * k; ctx.stroke();
        ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(0.02 * k, 0, 0.12 * k, 0, 6.283); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    _vehList() {
      const sim = this.sim, list = [];
      for (const n of sim.npcs) { const p = pose(n.s, n.d); list.push({ v: n, x: p.x, y: p.y, h: p.h + (n.yaw || 0) }); }
      for (const c of sim.cross) list.push({ v: c, x: c.x, y: c.y, h: c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, cross: true });
      const ep = sim.egoPose(); list.push({ v: sim.ego, x: ep.x, y: ep.y, h: ep.h, ego: true });
      return list.filter((o) => this.visible(o.x, o.y, 14));
    }
    _headlights() {
      const ctx = this.ctx; ctx.globalCompositeOperation = 'lighter';
      for (const o of this._vehList()) {
        const v = o.v, sp = o.ego ? this.G.hlCool : this.G.hlWarm;
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.h);
        ctx.globalAlpha = o.ego ? 0.85 : 0.5;
        const L = o.ego ? 30 : 22, Wd = o.ego ? 13 : 10;
        ctx.drawImage(sp, v.len / 2 - 0.6, -Wd / 2, L, Wd);
        ctx.restore();
      }
      // brilho do carro do Jev
      const ep = this.sim.egoPose();
      ctx.globalAlpha = 0.55; ctx.drawImage(this.G.cyan, ep.x - 6, ep.y - 6, 12, 12);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    _vehicles() {
      const ctx = this.ctx, list = this._vehList();
      for (const o of list) {
        const v = o.v, sp = this.sprite(v.kind, o.ego ? '#e6edf7' : v.color, v.len, v.wid, o.ego);
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.h);
        ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        if (o.ego) { // LIDAR girando
          const a = this.time * 7;
          ctx.strokeStyle = 'rgba(58,160,255,.95)'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(-v.len * 0.1, 0); ctx.lineTo(-v.len * 0.1 + Math.cos(a) * 0.34, Math.sin(a) * 0.34); ctx.stroke();
        }
        ctx.restore();
      }
      // luzes de freio e setas (aditivo)
      ctx.globalCompositeOperation = 'lighter';
      for (const o of list) {
        const v = o.v;
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.h);
        const hl = v.len / 2, hw = v.wid / 2;
        if (v.brake) { ctx.globalAlpha = o.ego && v.emerg ? 1 : 0.8; for (const y of [-hw + 0.33, hw - 0.33]) ctx.drawImage(this.G.red, -hl - 1.2, y - 1.2, 2.4, 2.4); }
        const lc = v.lc;
        if (lc && Math.sin(this.time * 9) > 0) {
          const side = lc.to < lc.from ? -1 : 1; ctx.globalAlpha = 0.95;
          for (const x of [hl - 0.3, -hl + 0.3]) ctx.drawImage(this.G.amber, x - 0.9, side * (hw - 0.1) - 0.9, 1.8, 1.8);
        }
        if (o.ego && v.emerg && Math.sin(this.time * 14) > 0) { ctx.globalAlpha = 0.9; for (const x of [hl - 0.3, -hl + 0.3]) for (const y of [-hw, hw]) ctx.drawImage(this.G.amber, x - 1, y - 1, 2, 2); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    _signals() {
      const ctx = this.ctx, sim = this.sim;
      for (const l of sim.lights) {
        const base = pose(l.si - BOX + 0.6, CURB + 0.9);
        if (!this.visible(base.x, base.y, 30)) continue;
        const col = l.cor === 'vermelho' ? 'red' : l.cor === 'amarelo' ? 'amber' : 'green';
        // brilho no asfalto junto à linha de parada
        const gp = pose(l.stop - 2, 0);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2; ctx.drawImage(this.G[col], gp.x - 9, gp.y - 9, 18, 18); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // poste e braço sobre a pista (altura ~6 m)
        const hs = l.si - BOX + 0.6; // cabeças sobre a entrada do cruzamento, depois da faixa de pedestres
        const armEnd = pose(hs, -2.6);
        const b2 = this.lean(base.x, base.y, 6), a2 = this.lean(armEnd.x, armEnd.y, 6);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
        for (const d of LANE_D) {
          const hp = pose(hs, d), hq = this.lean(hp.x, hp.y, 6);
          ctx.save(); ctx.translate(hq.x, hq.y); ctx.rotate(hp.h);
          ctx.fillStyle = '#0b1020'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.08; rrPath(ctx, -1.35, -0.48, 2.7, 0.96, 0.24); ctx.fill(); ctx.stroke();
          const cols = { vermelho: ['#ef4444', 0.82], amarelo: ['#facc15', 0], verde: ['#22c55e', -0.82] };
          for (const [nome, [c, x]] of Object.entries(cols)) {
            ctx.fillStyle = l.cor === nome ? c : 'rgba(148,163,184,.16)';
            ctx.beginPath(); ctx.arc(x, 0, 0.3, 0, 6.283); ctx.fill();
          }
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.95;
          const off = l.cor === 'vermelho' ? 0.82 : l.cor === 'verde' ? -0.82 : 0;
          const gx = hq.x + Math.cos(hp.h) * off, gy = hq.y + Math.sin(hp.h) * off;
          ctx.drawImage(this.G[col], gx - 3, gy - 3, 6, 6);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        // semáforos da transversal (fase inversa)
        const c = pose(l.si, 0);
        for (const side of [-1, 1]) {
          const x = X_RUA + side * (BOX + 1.2), y = c.y + side * (WALK + 5.8);
          const q = this.lean(x, y, 5);
          ctx.fillStyle = '#0b1020'; ctx.beginPath(); ctx.arc(q.x, q.y, 0.55, 0, 6.283); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(this.G[l.cruz === 'verde' ? 'green' : 'red'], q.x - 1.6, q.y - 1.6, 3.2, 3.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    }

    _trees() {
      const ctx = this.ctx;
      for (const t of TREES) {
        if (!this.visible(t.x, t.y, 8)) continue;
        const q = this.lean(t.x, t.y, 5 + t.r);
        ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.arc(t.x + 0.6, t.y + 0.6, t.r * 0.95, 0, 6.283); ctx.fill();
        ctx.drawImage(this.G.trees[t.v], q.x - t.r, q.y - t.r, t.r * 2, t.r * 2);
      }
    }
    _lamps() {
      const ctx = this.ctx;
      ctx.strokeStyle = '#2a3346'; ctx.lineWidth = 0.18;
      const heads = [];
      for (const l of LAMPS) {
        if (!this.visible(l.x, l.y, 8)) continue;
        const top = this.lean(l.x, l.y, 8), arm = this.lean(l.hx, l.hy, 8);
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(top.x, top.y); ctx.lineTo(arm.x, arm.y); ctx.stroke();
        heads.push(arm);
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
      for (const h of heads) ctx.drawImage(this.G.warm, h.x - 1.5, h.y - 1.5, 3, 3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    _buildings() {
      const ctx = this.ctx, eye = this.eye;
      const vis = [];
      for (const b of BUILDINGS) if (this.visible(b.cx, b.cy, Math.max(b.w, b.h) + b.ht * 0.45)) vis.push(b);
      vis.sort((a, b) => Math.hypot(b.cx - eye.x, b.cy - eye.y) - Math.hypot(a.cx - eye.x, a.cy - eye.y));
      const normals = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const hash = (a, b, c, d) => { const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + d * 11.137) * 43758.5453; return x - Math.floor(x); };
      for (const b of vis) {
        const k = b.ht / 210;
        const base = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
        const top = base.map(([x, y]) => [x + (x - eye.x) * k, y + (y - eye.y) * k]);
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4, n = normals[i];
          const mx = (base[i][0] + base[j][0]) / 2, my = (base[i][1] + base[j][1]) / 2;
          if (n[0] * (eye.x - mx) + n[1] * (eye.y - my) <= 0) continue;
          const lf = 0.62 + 0.2 * (n[0] * -0.6 + n[1] * -0.8);
          ctx.fillStyle = `rgb(${Math.round(20 * lf + 6)},${Math.round(26 * lf + 8)},${Math.round(40 * lf + 12)})`;
          ctx.beginPath(); ctx.moveTo(base[i][0], base[i][1]); ctx.lineTo(base[j][0], base[j][1]); ctx.lineTo(top[j][0], top[j][1]); ctx.lineTo(top[i][0], top[i][1]); ctx.closePath(); ctx.fill();
          // janelas: grade de andares × colunas projetada na parede (só onde a parede aparece bem)
          const projH = Math.hypot(top[i][0] - base[i][0], top[i][1] - base[i][1]);
          if (projH < 1.3) continue;
          const floors = Math.max(1, Math.min(Math.round(b.ht / 3.4), Math.floor(projH / 0.5)));
          const edge = Math.hypot(base[j][0] - base[i][0], base[j][1] - base[i][1]);
          const cols = Math.max(2, Math.min(12, Math.round(edge / 2.5)));
          const bright = new Path2D(), dim = new Path2D();
          const P = (u, v) => [lerp(lerp(base[i][0], base[j][0], u), lerp(top[i][0], top[j][0], u), v), lerp(lerp(base[i][1], base[j][1], u), lerp(top[i][1], top[j][1], u), v)];
          for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
            const h1 = hash(b.seed, i, f, c);
            if (h1 > b.lit) continue;
            const u0 = (c + 0.2) / cols, u1 = (c + 0.8) / cols, v0 = (f + 0.26) / floors, v1 = (f + 0.74) / floors;
            const path = h1 < b.lit * 0.45 ? bright : dim;
            const a = P(u0, v0), bb = P(u1, v0), cc = P(u1, v1), d = P(u0, v1);
            path.moveTo(a[0], a[1]); path.lineTo(bb[0], bb[1]); path.lineTo(cc[0], cc[1]); path.lineTo(d[0], d[1]); path.closePath();
          }
          ctx.fillStyle = `rgba(${b.win},.92)`; ctx.fill(bright);
          ctx.fillStyle = `rgba(${b.win},.42)`; ctx.fill(dim);
        }
        // telhado
        ctx.fillStyle = b.roof; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(160,175,200,.28)'; ctx.lineWidth = 0.25; ctx.stroke();
        const tx = top[0][0], ty = top[0][1], tw = top[1][0] - tx, th = top[3][1] - ty;
        ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.3; ctx.strokeRect(tx + 0.8, ty + 0.8, tw - 1.6, th - 1.6);
        if (b.school) {
          ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.rotate(this.cam.a + Math.PI / 2); ctx.scale(0.1, 0.1);
          ctx.fillStyle = 'rgba(253,224,71,.92)'; ctx.font = '900 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ESCOLA', 0, 0); ctx.restore();
          continue;
        }
        if (b.solar) { ctx.fillStyle = '#16264a'; for (let r0 = 0; r0 < 3; r0++) ctx.fillRect(tx + tw * 0.12, ty + th * (0.14 + r0 * 0.26), tw * 0.5, th * 0.18); ctx.strokeStyle = 'rgba(96,165,250,.35)'; ctx.lineWidth = 0.08; for (let r0 = 0; r0 < 3; r0++) ctx.strokeRect(tx + tw * 0.12, ty + th * (0.14 + r0 * 0.26), tw * 0.5, th * 0.18); }
        else if (b.garden) { ctx.fillStyle = '#163826'; ctx.fillRect(tx + tw * 0.14, ty + th * 0.14, tw * 0.46, th * 0.42); }
        if (b.tank) { ctx.fillStyle = '#2d374b'; ctx.beginPath(); ctx.arc(tx + tw * 0.74, ty + th * 0.28, Math.min(tw, th) * 0.11, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.lineWidth = 0.12; ctx.stroke(); }
        if (b.detail > 0.35) { ctx.fillStyle = '#2a3242'; ctx.fillRect(tx + tw * 0.56, ty + th * 0.6, tw * 0.2, th * 0.16); ctx.fillRect(tx + tw * 0.22, ty + th * 0.66, tw * 0.13, th * 0.12); }
        if (b.pool) { ctx.fillStyle = '#0e7490'; ctx.fillRect(tx + tw * 0.15, ty + th * 0.62, tw * 0.3, th * 0.22); }
        if (b.heli) { ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(tx + tw / 2, ty + th / 2, Math.min(tw, th) * 0.28, 0, 6.283); ctx.stroke(); }
        if (b.neon) { ctx.strokeStyle = b.neon; ctx.globalAlpha = 0.8; ctx.lineWidth = 0.32; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1; }
        if (b.ht > 45 && Math.sin(this.time * 2.4 + b.detail * 10) > 0.55) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(this.G.red, tx + tw / 2 - 1.4, ty + th / 2 - 1.4, 2.8, 2.8); ctx.globalCompositeOperation = 'source-over'; }
      }
    }

    // ---------------------------------------------------------------- percepção (o que os sensores estão vendo)
    perceive() {
      const sim = this.sim, e = sim.ego, lane = sim._laneOf(e), out = [];
      let lead = null;
      for (const o of sim.npcs) {
        const ds = rel(e.s, o.s);
        if (ds < -22 || ds > 105) continue;
        const inLane = sim._occupies(o, lane) && ds > 0;
        const g = Math.abs(ds) - (o.len + e.len) / 2;
        const item = { kind: 'carro', obj: o, dist: g, inLane, ahead: ds > 0 };
        if (inLane && (!lead || g < lead.dist)) lead = item;
        if (!inLane && (ds > 45 || ds < -18)) continue;
        out.push(item);
      }
      for (const c of sim.cones) { const ds = rel(e.s, c.s); if (ds > -4 && ds < 105) out.push({ kind: c.fixed ? 'obras' : 'cone', obj: c, dist: ds - (c.len + e.len) / 2, inLane: Math.abs(c.d - LANE_D[lane]) < 1.6, ahead: true }); }
      const grupos = new Map();
      for (const p of sim.peds) {
        const ds = rel(e.s, p.s);
        if (!((p.st === 'cross' || (p.st === 'wait' && sim.pedBlocks(p, 0))) && ds > -2 && ds < 105)) continue;
        const k = p.cw == null ? 'j' + p.id : 'c' + p.cw;
        const g = grupos.get(k);
        if (g) { g.n++; g.dist = Math.min(g.dist, ds - e.len / 2); if (p.st === 'cross') g.obj = p; }
        else grupos.set(k, { kind: 'pedestre', obj: p, n: 1, dist: ds - e.len / 2, inLane: true, ahead: true });
      }
      for (const g of grupos.values()) out.push(g);
      const lf = sim.lightFor(e.s + e.len / 2);
      if (lf && lf.d < 120) out.push({ kind: 'sinal', obj: lf.l, dist: lf.d, inLane: true, ahead: true });
      return out;
    }
    _box(item) {
      const o = item.obj;
      if (item.kind === 'carro') { const p = pose(o.s, o.d); return { x: p.x, y: p.y, h: p.h + (o.yaw || 0), l: o.len + 0.8, w: o.wid + 0.8 }; }
      if (item.kind === 'cone') { const p = pose(o.s, o.d); return { x: p.x, y: p.y, h: p.h, l: 2.4, w: 3.4 }; }
      if (item.kind === 'obras') { const p = pose(o.s, o.d); return { x: p.x, y: p.y, h: p.h, l: o.len + 1, w: 3.6 }; }
      if (item.kind === 'pedestre') { const p = pose(o.s, o.d); return { x: p.x, y: p.y, h: p.h, l: 1.6, w: 1.6 }; }
      const p = pose(o.si - BOX + 0.6, 0); const q = this.lean(p.x, p.y, 6); return { x: q.x, y: q.y, h: p.h, l: 1.6, w: 7 };
    }
    _sensorsWorld() {
      const ctx = this.ctx, e = this.sim.ego;
      const items = this.perceive();
      this._items = items;
      const hazKey = e.hazard && e.ttc < 2.5 ? e.hazard.obj : null;
      const tgtWhat = e.target && e.target.what;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      for (const it of items) {
        const b = this._box(it);
        let col = 'rgba(58,160,255,.6)';
        const relevant = it.inLane && it.ahead && (it.kind === 'sinal' ? it.obj.cor !== 'verde' : true) && it.dist < 80;
        if (relevant) col = `rgba(251,191,36,${0.7 + 0.3 * pulse})`;
        if (it.obj === hazKey) col = `rgba(248,113,113,${0.75 + 0.25 * pulse})`;
        if (it.kind === 'sinal') col = it.obj.cor === 'vermelho' ? 'rgba(248,113,113,.9)' : it.obj.cor === 'amarelo' ? 'rgba(251,191,36,.9)' : 'rgba(52,211,153,.8)';
        it.col = col; it.b = b;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.h);
        ctx.strokeStyle = col; ctx.lineWidth = 0.16;
        const hl = b.l / 2, hw = b.w / 2, c = Math.min(0.9, b.l * 0.25);
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(sx * hl, sy * hw + -sy * c); ctx.lineTo(sx * hl, sy * hw); ctx.lineTo(sx * hl - sx * c, sy * hw); }
        ctx.stroke();
        ctx.restore();
        void tgtWhat;
      }
      // pulso de radar a partir do carro
      const ep = this.sim.egoPose();
      const t = (this.time % 1.6) / 1.6;
      ctx.strokeStyle = `rgba(58,160,255,${0.28 * (1 - t)})`; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 3 + t * 34, 0, 6.283); ctx.stroke();
    }
    _sensorsScreen() {
      const ctx = this.ctx, items = (this._items || []).slice().sort((a, b) => a.dist - b.dist);
      ctx.font = '500 11px "Chivo Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      const placed = [];
      for (const it of items) {
        if (!it.b) continue;
        if (!it.inLane && it.kind === 'carro' && Math.abs(it.dist) > 20) continue;
        if (it.kind === 'sinal' && it.dist < 6) continue;
        const d = Math.max(0, Math.round(it.dist));
        let label;
        if (it.kind === 'carro') label = `CARRO ${d} m · ${Math.round(it.obj.v * 3.6)} km/h`;
        else if (it.kind === 'cone') label = `CONES ${d} m`;
        else if (it.kind === 'obras') label = `OBRAS ${d} m`;
        else if (it.kind === 'pedestre') label = `${it.n > 1 ? it.n + ' PEDESTRES' : 'PEDESTRE'}${it.obj.st === 'wait' ? ' ESPERANDO' : ''} ${d} m`;
        else label = `SINAL ${it.obj.cor.toUpperCase()} ${d} m`;
        const sp = this.w2s(it.b.x, it.b.y);
        const hw = (Math.max(it.b.l, it.b.w) / 2) * this.z;
        const tw = ctx.measureText(label).width + 16;
        let off = false, x, y = sp.y;
        const topY = this.w < 700 ? 120 : 116;
        if (y < topY) { y = topY; off = true; }
        const right = sp.x + hw + 12 + tw / 2 + 12 < this.w - 8;
        x = right ? sp.x + hw + 12 + tw / 2 : sp.x - hw - 12 - tw / 2;
        if (off) x = clamp(sp.x, tw / 2 + 8, this.w - tw / 2 - 8);
        for (let k = 0; k < 6; k++) { const hit = placed.find((p) => Math.abs(p.x - x) < (p.w + tw) / 2 + 4 && Math.abs(p.y - y) < 19); if (!hit) break; y = hit.y + 20; }
        placed.push({ x, y, w: tw });
        if (!off) { ctx.strokeStyle = it.col || 'rgba(58,160,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(right ? sp.x + hw + 2 : sp.x - hw - 2, sp.y); ctx.lineTo(right ? x - tw / 2 : x + tw / 2, y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(4,10,22,.86)';
        rrPath(ctx, x - tw / 2, y - 9, tw, 18, 9); ctx.fill();
        ctx.strokeStyle = it.col || 'rgba(58,160,255,.55)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#f2f4f7'; ctx.textAlign = 'center';
        ctx.fillText((off ? '↑ ' : '') + label, x, y + 0.5);
      }
      if (this._stopMark) {
        const sp = this.w2s(this._stopMark.x, this._stopMark.y);
        if (sp.y > 116 && !placed.some((p) => Math.abs(p.y - sp.y) < 16 && Math.abs(p.x - (sp.x - 70)) < p.w / 2 + 60)) {
          ctx.font = '700 11px "Saira Condensed", system-ui, sans-serif'; ctx.textAlign = 'right';
          ctx.fillStyle = this._stopMark.col; ctx.fillText('PONTO DE PARADA', sp.x - 22, sp.y);
        }
      }
    }
    _fx() {
      const ctx = this.ctx, sim = this.sim;
      for (const f of sim.fx) {
        const age = sim.t - f.t, p = pose(f.s, f.d);
        ctx.strokeStyle = `rgba(248,113,113,${1 - age / 1.6})`; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1 + age * 7, 0, 6.283); ctx.stroke();
      }
    }
    _vignette() {
      const ctx = this.ctx;
      if (!this._vg || this._vgW !== this.w || this._vgH !== this.h) {
        this._vgW = this.w; this._vgH = this.h;
        const g = ctx.createRadialGradient(this.w / 2, this.h * 0.6, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h * 0.55, Math.hypot(this.w, this.h) * 0.62);
        g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,.42)');
        this._vg = g;
      }
      ctx.fillStyle = this._vg; ctx.fillRect(0, 0, this.w, this.h);
    }

    // clique na tela → ponto da avenida
    pickRoad(px, py) { const w = this.s2w(px, py); const p = S.project(w.x, w.y); return p ? { ...p, x: w.x, y: w.y } : null; }
    worldToScreen(x, y) { return this.w2s(x, y); }
  }

  function rrPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  // ------------------------------------------------------------------ minimapa
  function drawMinimap(cv, sim) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w < 60 || h < 40) return; // oculto (celular)
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const pad = 12, k = Math.min((w - pad * 2) / W, (h - pad * 2) / H), ox = (w - W * k) / 2, oy = (h - H * k) / 2;
    const P = (x, y) => [ox + x * k, oy + y * k];
    g.strokeStyle = 'rgba(148,163,184,.35)'; g.lineWidth = 5; g.beginPath(); g.roundRect(ox, oy, W * k, H * k, R * k); g.stroke();
    g.strokeStyle = 'rgba(148,163,184,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...P(X_RUA, -12)); g.lineTo(...P(X_RUA, H + 12)); g.stroke();
    const z = S.ZONES[0]; g.strokeStyle = 'rgba(250,204,21,.6)'; g.lineWidth = 5; g.beginPath();
    for (let s = z.s0; s <= z.s1; s += 4) { const p = pose(s, 0); const q = P(p.x, p.y); s === z.s0 ? g.moveTo(...q) : g.lineTo(...q); } g.stroke();
    for (const l of sim.lights) { const p = pose(l.stop, 0); const q = P(p.x, p.y); g.fillStyle = l.cor === 'vermelho' ? '#ef4444' : l.cor === 'amarelo' ? '#facc15' : '#22c55e'; g.beginPath(); g.arc(q[0], q[1], 3.2, 0, 6.283); g.fill(); }
    for (const c of sim.cones) { const p = pose(c.s, c.d); const q = P(p.x, p.y); g.fillStyle = '#fb923c'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
    for (const n of sim.npcs) { const p = pose(n.s, n.d); const q = P(p.x, p.y); g.fillStyle = n.slow ? '#fbbf24' : 'rgba(226,232,240,.8)'; g.beginPath(); g.arc(q[0], q[1], 2, 0, 6.283); g.fill(); }
    const ep = sim.egoPose(); const q = P(ep.x, ep.y);
    g.fillStyle = 'rgba(58,160,255,.28)'; g.beginPath(); g.arc(q[0], q[1], 7, 0, 6.283); g.fill();
    g.fillStyle = '#3aa0ff'; g.beginPath(); g.arc(q[0], q[1], 3.4, 0, 6.283); g.fill();
  }

  window.CarroRender = { Renderer, drawMinimap, ACAO_COR };
})();

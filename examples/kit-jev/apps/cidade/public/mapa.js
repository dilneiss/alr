/* Cidade Viva — mapa em canvas (sem bibliotecas).
   Mundo em "unidades" 960×600. Camada estática (grama, ruas, prédios) desenhada uma vez por tamanho de tela;
   a cada quadro: água, fumaça, moradores caminhando pelas ruas, luz do dia/noite, clima, luzes e rótulos. */
(function () {
  'use strict';
  const WW = 960, WH = 600;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  const UI_FONT = '"Atkinson Hyperlegible", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

  // ------------------------------------------------------------------ geometria
  const ROADS = {
    H1: { h: true, c: 180, from: 0, to: WW, w: 22, side: 6 },
    H2: { h: true, c: 410, from: 0, to: WW, w: 22, side: 6 },
    V1: { h: false, c: 250, from: 0, to: WH, w: 22, side: 6 },
    V2: { h: false, c: 520, from: 0, to: WH, w: 22, side: 6 },
    V3: { h: false, c: 760, from: 0, to: WH, w: 22, side: 6 },
    R1: { h: true, c: 80, from: 0, to: 250, w: 14, side: 3, res: true },
    R2: { h: true, c: 282, from: 0, to: 250, w: 14, side: 3, res: true },
  };
  const roadPt = (road, at) => (ROADS[road].h ? [at, ROADS[road].c] : [ROADS[road].c, at]);

  const ROOFS = ['#d9544f', '#4f86e8', '#e39b32', '#8a63d2', '#35a883', '#e0689a', '#b0754f', '#3fa7b8'];
  const HOUSES = [];
  (function () {
    const xs = [8, 66, 124, 182];
    const rows = [{ y: 12, road: 'R1' }, { y: 100, road: 'H1' }, { y: 212, road: 'R2' }, { y: 326, road: 'H2' }];
    let n = 1;
    for (const r of rows) for (const x of xs) {
      const id = 'c' + String(n).padStart(2, '0');
      HOUSES.push({ id, n, x, y: r.y, w: 48, h: 50, roof: ROOFS[(n * 5) % ROOFS.length], ways: [{ gate: [x + 24, r.y + 50], via: [], road: r.road, at: x + 24 }] });
      n++;
    }
  })();

  // Lugares. rect = prédio; area = onde os moradores ficam visíveis; ways = portões → rua.
  const PLACES = {
    escola: { nome: 'Escola', emoji: '🏫', rect: [282, 22, 140, 106], label: [398, 26], hidden: true, ways: [{ gate: [352, 128], via: [], road: 'H1', at: 352 }] },
    escritorio: { nome: 'Escritório', emoji: '🏢', rect: [548, 8, 92, 130], label: [594, 16], hidden: true, ways: [{ gate: [594, 138], via: [], road: 'H1', at: 594 }] },
    cafe: { nome: 'Café', emoji: '☕', rect: [652, 52, 84, 60], area: [652, 116, 84, 44], label: [694, 50], ways: [{ gate: [694, 160], via: [], road: 'H1', at: 694 }] },
    hospital: { nome: 'Hospital', emoji: '🏥', rect: [790, 14, 156, 118], label: [868, 20], hidden: true, ways: [{ gate: [868, 132], via: [], road: 'H1', at: 868 }] },
    praca: { nome: 'Praça', emoji: '⛲', area: [270, 200, 230, 190], label: [306, 214], ways: [
      { gate: [272, 312], via: [], road: 'V1', at: 312 }, { gate: [498, 312], via: [], road: 'V2', at: 312 }, { gate: [385, 388], via: [], road: 'H2', at: 385 }] },
    restaurante: { nome: 'Restaurante', emoji: '🍝', rect: [548, 206, 88, 64], area: [548, 276, 88, 70], label: [592, 204], ways: [{ gate: [592, 350], via: [], road: 'H2', at: 592 }] },
    bar: { nome: 'Bar', emoji: '🍺', rect: [652, 206, 84, 64], area: [652, 276, 84, 70], label: [694, 204], ways: [{ gate: [694, 350], via: [], road: 'H2', at: 694 }] },
    academia: { nome: 'Academia', emoji: '🏋️', rect: [790, 206, 110, 70], area: [790, 284, 160, 96], label: [845, 204], ways: [{ gate: [870, 382], via: [], road: 'H2', at: 870 }] },
    parque: { nome: 'Parque', emoji: '🌳', area: [270, 430, 230, 166], label: [306, 444], ways: [
      { gate: [385, 432], via: [], road: 'H2', at: 385 }, { gate: [272, 520], via: [], road: 'V1', at: 520 }, { gate: [498, 520], via: [], road: 'V2', at: 520 }] },
    mercado: { nome: 'Mercado', emoji: '🛒', rect: [552, 436, 176, 76], area: [556, 516, 168, 38], label: [640, 438], ways: [{ gate: [640, 556], via: [[640, 568]], road: 'V2', at: 568 }] },
    fabrica: { nome: 'Fábrica', emoji: '🏭', rect: [788, 440, 162, 100], label: [869, 444], hidden: true, ways: [{ gate: [868, 540], via: [[868, 572]], road: 'V3', at: 572 }] },
  };
  const STAGE = [385, 222];
  const FOUNTAIN = [385, 305];
  const POND = [425, 532, 54, 28];

  // ------------------------------------------------------------------ utilidades
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function hstr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ------------------------------------------------------------------ grafo de ruas
  const NODES = new Map(); // "x,y" -> {p, adj: [[key, w]]}
  function key(p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }
  (function buildGraph() {
    const onRoad = {}; for (const r of Object.keys(ROADS)) onRoad[r] = new Set();
    const addAt = (road, at) => onRoad[road].add(Math.round(at));
    for (const v of ['V1', 'V2', 'V3']) for (const h of ['H1', 'H2']) { addAt(v, ROADS[h].c); addAt(h, ROADS[v].c); }
    for (const r of ['R1', 'R2']) { addAt(r, ROADS.V1.c); addAt('V1', ROADS[r].c); }
    const allWays = [...HOUSES.flatMap((h) => h.ways), ...Object.values(PLACES).flatMap((p) => p.ways)];
    for (const w of allWays) addAt(w.road, w.at);
    for (const [road, set] of Object.entries(onRoad)) {
      const arr = [...set].sort((a, b) => a - b);
      for (let i = 0; i < arr.length; i++) {
        const k = key(roadPt(road, arr[i]));
        if (!NODES.has(k)) NODES.set(k, { p: roadPt(road, arr[i]), adj: [] });
        if (i > 0) {
          const k0 = key(roadPt(road, arr[i - 1])); const d = arr[i] - arr[i - 1];
          NODES.get(k).adj.push([k0, d]); NODES.get(k0).adj.push([k, d]);
        }
      }
    }
  })();
  const spCache = new Map();
  function shortest(a, b) {
    const ck = a + '>' + b; if (spCache.has(ck)) return spCache.get(ck);
    const d = new Map([[a, 0]]), prev = new Map(), done = new Set();
    while (true) {
      let u = null, best = Infinity;
      for (const [k, v] of d) if (!done.has(k) && v < best) { best = v; u = k; }
      if (u == null || u === b) break;
      done.add(u);
      for (const [v, w] of NODES.get(u).adj) { const nd = best + w; if (nd < (d.get(v) ?? Infinity)) { d.set(v, nd); prev.set(v, u); } }
    }
    const path = [b]; let c = b; while (c !== a && prev.has(c)) { c = prev.get(c); path.unshift(c); }
    const out = { len: d.get(b) ?? 9999, pts: path.map((k) => NODES.get(k).p) };
    spCache.set(ck, out);
    return out;
  }

  // ------------------------------------------------------------------ vagas (onde cada um fica)
  function gridSlots(x0, y0, x1, y1, sx, sy, filter, seed) {
    const pts = [];
    for (let y = y0; y <= y1 + 0.01; y += sy) for (let x = x0; x <= x1 + 0.01; x += sx) {
      const p = [x + (hash(x * 7 + y * 13 + seed) - 0.5) * sx * 0.45, y + (hash(x * 11 + y * 3 + seed) - 0.5) * sy * 0.4];
      if (!filter || filter(p)) pts.push(p);
    }
    return pts.sort((a, b) => hash(a[0] * 3 + a[1] * 7 + seed) - hash(b[0] * 3 + b[1] * 7 + seed));
  }
  const TREES_PARK = [[292, 452], [336, 462], [470, 450], [486, 486], [290, 580], [336, 586], [480, 584], [446, 590], [300, 500], [388, 578], [360, 506]];
  const SLOTS = {
    praca: gridSlots(282, 246, 490, 382, 18, 16, (p) => dist(p, FOUNTAIN) > 38, 1),
    parque: gridSlots(282, 446, 494, 592, 19, 17, (p) => ((p[0] - POND[0]) / (POND[2] + 12)) ** 2 + ((p[1] - POND[1]) / (POND[3] + 12)) ** 2 > 1 && TREES_PARK.every((t) => dist(p, t) > 15), 2),
    cafe: gridSlots(660, 126, 730, 154, 14, 14, null, 3),
    restaurante: gridSlots(556, 290, 630, 338, 15, 16, null, 4),
    bar: gridSlots(660, 290, 730, 338, 14, 16, null, 5),
    academia: gridSlots(800, 298, 944, 372, 16, 16, null, 6),
    mercado: gridSlots(566, 526, 716, 548, 15, 14, null, 7),
  };
  // no show a plateia se forma de frente para o palco, mas deixando um vão para os músicos aparecerem
  const SLOTS_SHOW = [...SLOTS.praca.filter((p) => p[1] >= 264), ...SLOTS.praca.filter((p) => p[1] < 264)]
    .sort((a, b) => (a[1] < 264) - (b[1] < 264) || dist(a, [STAGE[0], STAGE[1] + 44]) - dist(b, [STAGE[0], STAGE[1] + 44]));

  // ------------------------------------------------------------------ estado
  let canvas, ctx, box, dpr = 1, k = 1, cssW = 0, cssH = 0, staticLayer = null;
  const sprites = new Map();
  let people = new Map();     // id -> pessoa
  let perfis = {}, atividades = {}, cb = {};
  let world = { hora: 12, t: 0, recebidoEm: 0, segPorHora: 4, clima: { cond: 'sol', temp: 22 }, eventos: [], ocupacao: {} };
  let selected = null, hoverId = null, hoverPlace = null;
  const venueSlots = {}; // lugar -> Map(id -> slotIndex)
  const puffs = [];       // emojis flutuando (chegadas)
  let rain = [], clouds = [], smoke = [], notes = [], flash = 0, nextFlash = 0, thinkUntil = 0, wave = 0;

  const isHouse = (l) => /^c\d\d$/.test(l || '');
  const placeOf = (l) => (isHouse(l) ? HOUSES.find((h) => h.id === l) : PLACES[l]);
  const hiddenPlace = (l) => isHouse(l) || !!(PLACES[l] && PLACES[l].hidden);

  // ------------------------------------------------------------------ sprites de emoji
  function sprite(emoji, units) {
    const px = Math.max(8, Math.round(units * k));
    const ck = emoji + '|' + px;
    let s = sprites.get(ck);
    if (s) return s;
    s = document.createElement('canvas');
    const size = Math.ceil(px * 1.35);
    s.width = s.height = size;
    const g = s.getContext('2d');
    g.font = `${px}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, size / 2, size / 2 + px * 0.06);
    sprites.set(ck, s);
    if (sprites.size > 700) sprites.delete(sprites.keys().next().value);
    return s;
  }
  function drawEmoji(g, emoji, x, y, units, alpha) {
    const s = sprite(emoji, units);
    const wu = s.width / k;
    if (alpha != null && alpha < 1) { g.save(); g.globalAlpha *= alpha; g.drawImage(s, x - wu / 2, y - wu / 2, wu, wu); g.restore(); }
    else g.drawImage(s, x - wu / 2, y - wu / 2, wu, wu);
  }

  // ------------------------------------------------------------------ camada estática
  function renderStatic() {
    staticLayer = document.createElement('canvas');
    staticLayer.width = Math.round(WW * k); staticLayer.height = Math.round(WH * k);
    const g = staticLayer.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    // grama com textura
    g.fillStyle = '#7dbd62'; g.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 2600; i++) {
      const x = Math.floor(hash(i) * WW / 3) * 3, y = Math.floor(hash(i + 9999) * WH / 3) * 3;
      g.fillStyle = hash(i + 7) > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(20,60,20,.09)';
      g.fillRect(x, y, 3, 3);
    }
    // parque (grama mais escura) e jardim
    g.fillStyle = '#6cb057'; g.fillRect(266, 426, 238, 174);
    g.fillStyle = '#74b85e'; g.fillRect(0, 426, 234, 174);
    // ruas: calçadas, asfalto, faixas
    const rs = Object.values(ROADS);
    for (const r of rs) {
      g.fillStyle = r.res ? '#b9b3a6' : '#b8bec8';
      const b = r.w + r.side * 2;
      if (r.h) g.fillRect(r.from, r.c - b / 2, r.to - r.from, b); else g.fillRect(r.c - b / 2, r.from, b, r.to - r.from);
    }
    for (const r of rs) {
      g.fillStyle = r.res ? '#5a5f69' : '#474c57';
      if (r.h) g.fillRect(r.from, r.c - r.w / 2, r.to - r.from, r.w); else g.fillRect(r.c - r.w / 2, r.from, r.w, r.to - r.from);
    }
    // meio-fio
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (const r of rs) { if (r.h) { g.fillRect(r.from, r.c - r.w / 2 - 1, r.to - r.from, 1); g.fillRect(r.from, r.c + r.w / 2, r.to - r.from, 1); } else { g.fillRect(r.c - r.w / 2 - 1, r.from, 1, r.to - r.from); g.fillRect(r.c + r.w / 2, r.from, 1, r.to - r.from); } }
    // faixas centrais tracejadas (evitando cruzamentos)
    const inter = []; for (const v of ['V1', 'V2', 'V3']) for (const h of ['H1', 'H2']) inter.push([ROADS[v].c, ROADS[h].c]);
    inter.push([250, 80], [250, 282]);
    const nearInter = (x, y) => inter.some(([ix, iy]) => Math.abs(x - ix) < 20 && Math.abs(y - iy) < 20);
    g.fillStyle = '#f1d672';
    for (const r of rs) {
      if (r.res) continue;
      for (let s = r.from + 4; s < r.to; s += 18) {
        const x = r.h ? s : r.c, y = r.h ? r.c : s;
        if (nearInter(x, y)) continue;
        if (r.h) g.fillRect(x, y - 1, 9, 2); else g.fillRect(x - 1, y, 2, 9);
      }
    }
    // faixas de pedestre
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const [ix, iy] of inter.slice(0, 6)) {
      for (let i = -9; i <= 9; i += 4) { g.fillRect(ix + i - 1, iy - 11 - 7, 2, 6); g.fillRect(ix + i - 1, iy + 11 + 1, 2, 6); g.fillRect(ix - 11 - 7, iy + i - 1, 6, 2); g.fillRect(ix + 11 + 1, iy + i - 1, 6, 2); }
    }
    // caminhos de pedra das casas e lugares até a rua
    g.fillStyle = '#d8d0bf';
    for (const h of HOUSES) { const w = h.ways[0]; const rp = roadPt(w.road, w.at); g.fillRect(w.gate[0] - 3, w.gate[1], 6, Math.abs(rp[1] - w.gate[1]) - (ROADS[w.road].w / 2)); }

    drawJardim(g);
    for (const h of HOUSES) drawHouse(g, h);
    drawEscola(g); drawEscritorio(g); drawCafe(g); drawHospital(g); drawPraca(g); drawRestaurante(g); drawBar(g);
    drawAcademia(g); drawParque(g); drawMercado(g); drawFabrica(g);
    // árvores soltas
    for (const t of [[918, 222, 13], [944, 252, 11], [921, 270, 10], [276, 146, 9], [496, 146, 8]]) tree(g, t[0], t[1], t[2]);
    // postes
    for (const [x, y] of LAMPS) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1, y - 1, 2, 3); g.fillStyle = '#4b5563'; g.fillRect(x - 1, y - 9, 2, 9); g.fillStyle = '#fef3c7'; g.beginPath(); g.arc(x, y - 10, 2.2, 0, 7); g.fill(); }
  }
  const LAMPS = [[40, 165], [160, 165], [330, 165], [446, 165], [620, 165], [730, 165], [830, 165], [940, 165],
    [60, 395], [190, 395], [320, 395], [460, 395], [600, 395], [720, 395], [830, 395], [935, 395],
    [236, 40], [236, 240], [236, 360], [236, 470], [236, 570], [506, 40], [506, 250], [506, 470], [534, 560], [746, 60], [746, 300], [746, 500]];

  function shadow(g, x, y, w, h) { g.fillStyle = 'rgba(15,30,15,.28)'; g.fillRect(x + 4, y + 5, w, h); }
  function tree(g, x, y, r) {
    g.fillStyle = 'rgba(15,40,15,.3)'; g.beginPath(); g.ellipse(x + r * 0.35, y + r * 0.55, r, r * 0.75, 0, 0, 7); g.fill();
    g.fillStyle = '#2f7a3d'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#3f9a4c'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.72, 0, 7); g.fill();
    g.fillStyle = '#5bb563'; g.beginPath(); g.arc(x - r * 0.38, y - r * 0.4, r * 0.34, 0, 7); g.fill();
  }
  function windowsRow(g, x, y, w, n, ww, wh, color) {
    const gap = (w - n * ww) / (n + 1);
    for (let i = 0; i < n; i++) { const wx = x + gap + i * (ww + gap); g.fillStyle = color; g.fillRect(wx, y, ww, wh); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(wx + 1, y + 1, ww * 0.35, wh - 2); }
  }
  function roof(g, x, y, w, h, c, dark) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c); gr.addColorStop(1, dark || shade(c, -0.18));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 2);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + h - 2, w, 2);
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255));
    return '#' + [f(r), f(gg), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
  }
  function drawHouse(g, h) {
    const { x, y, w } = h;
    shadow(g, x, y, w, h.h);
    const wallY = y + 28;
    g.fillStyle = '#f3e6cc'; g.fillRect(x + 2, wallY, w - 4, h.h - 28);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + h.h - 2, w - 4, 2);
    roof(g, x, y, w, 30, h.roof);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 4, y + 13, w - 8, 1.5);
    g.fillStyle = shade(h.roof, -0.3); g.fillRect(x + w - 13, y + 3, 6, 9); // chaminé
    g.fillStyle = '#7a4b2a'; g.fillRect(x + w / 2 - 4, y + h.h - 13, 8, 13);
    g.fillStyle = '#e8c07a'; g.fillRect(x + w / 2 + 2, y + h.h - 7, 1.5, 1.5);
    g.fillStyle = '#8fc8ee'; g.fillRect(x + 6, wallY + 5, 9, 8); g.fillRect(x + w - 15, wallY + 5, 9, 8);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 7, wallY + 6, 3, 6); g.fillRect(x + w - 14, wallY + 6, 3, 6);
    g.fillStyle = '#e15b64'; g.fillRect(x + 4, wallY + 16, 3, 3); g.fillStyle = '#f5c542'; g.fillRect(x + w - 8, wallY + 16, 3, 3);
    h.windows = [[x + 6, wallY + 5, 9, 8], [x + w - 15, wallY + 5, 9, 8]];
  }
  function sign(g, x, y, text, bg, fg) {
    g.font = `800 7.5px ${UI_FONT}`; const tw = g.measureText(text).width + 8;
    g.fillStyle = bg; rr(g, x - tw / 2, y - 5.5, tw, 11, 3); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 0.3);
  }
  function drawEscola(g) {
    const [x, y, w, h] = PLACES.escola.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#f6e3b4'; g.fillRect(x + 2, y + 60, w - 4, h - 60);
    roof(g, x, y, w, 62, '#dd6b3d');
    g.fillStyle = 'rgba(255,255,255,.2)'; for (let i = 1; i < 5; i++) g.fillRect(x + 4, y + i * 12, w - 8, 1);
    windowsRow(g, x + 2, y + 70, w - 4, 7, 11, 11, '#8fc8ee');
    g.fillStyle = '#6b4226'; g.fillRect(x + w / 2 - 9, y + h - 20, 18, 20);
    sign(g, x + w / 2, y + 90 - 26, 'ESCOLA', '#1e3a8a', '#fff');
    // quadra
    g.fillStyle = 'rgba(15,30,15,.25)'; g.fillRect(436, 20, 62, 104);
    g.fillStyle = '#d9824f'; g.fillRect(432, 16, 62, 104);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.strokeRect(436, 20, 54, 96);
    g.beginPath(); g.moveTo(436, 68); g.lineTo(490, 68); g.stroke(); g.beginPath(); g.arc(463, 68, 9, 0, 7); g.stroke();
    // mastro
    g.fillStyle = '#9ca3af'; g.fillRect(290, 132, 1.5, 26); g.fillStyle = '#16a34a'; g.fillRect(291.5, 132, 12, 8); g.fillStyle = '#facc15'; g.beginPath(); g.moveTo(297.5, 133); g.lineTo(302, 136); g.lineTo(297.5, 139); g.lineTo(293, 136); g.fill();
    PLACES.escola.windows = [[x + 6, y + 70, w - 12, 11]];
  }
  function drawEscritorio(g) {
    const [x, y, w, h] = PLACES.escritorio.rect;
    shadow(g, x, y, w, h);
    roof(g, x, y, w, 20, '#5b6474');
    g.fillStyle = '#9aa4b2'; g.fillRect(x + 8, y + 4, 12, 8); g.fillRect(x + 26, y + 4, 12, 8);
    const gy = y + 20, gh = h - 20;
    const gr = g.createLinearGradient(x, gy, x + w, gy + gh); gr.addColorStop(0, '#6fa7dc'); gr.addColorStop(1, '#3f6fa6');
    g.fillStyle = gr; g.fillRect(x + 2, gy, w - 4, gh);
    g.fillStyle = 'rgba(255,255,255,.14)';
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) g.fillRect(x + 7 + c * 17, gy + 5 + r * 14, 13, 9);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x + 10, gy); g.lineTo(x + 34, gy); g.lineTo(x + 8, gy + gh); g.lineTo(x + 2, gy + gh); g.closePath(); g.fill();
    g.fillStyle = '#1f2937'; g.fillRect(x + w / 2 - 9, y + h - 14, 18, 14);
    g.fillStyle = 'rgba(147,197,253,.6)'; g.fillRect(x + w / 2 - 8, y + h - 13, 7, 12); g.fillRect(x + w / 2 + 1, y + h - 13, 7, 12);
    PLACES.escritorio.windows = []; for (let r = 0; r < 7; r++) PLACES.escritorio.windows.push([x + 7, gy + 5 + r * 14, w - 14, 9]);
  }
  function awning(g, x, y, w, c1, c2) {
    for (let i = 0; i < w; i += 8) { g.fillStyle = (i / 8) % 2 ? c2 : c1; g.fillRect(x + i, y, Math.min(8, w - i), 8); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + 8, w, 2);
    for (let i = 0; i < w; i += 8) { g.fillStyle = (i / 8) % 2 ? c2 : c1; g.beginPath(); g.arc(x + i + 4, y + 8, 4, 0, Math.PI); g.fill(); }
  }
  function drawCafe(g) {
    const [x, y, w, h] = PLACES.cafe.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#f5e9d6'; g.fillRect(x + 2, y + 30, w - 4, h - 30);
    roof(g, x, y, w, 32, '#8b5a3c');
    awning(g, x + 2, y + 32, w - 4, '#6f4128', '#f5e9d6');
    g.fillStyle = '#8fc8ee'; g.fillRect(x + 8, y + 46, 22, 11); g.fillRect(x + w - 30, y + 46, 22, 11);
    g.fillStyle = '#5b3a24'; g.fillRect(x + w / 2 - 5, y + h - 13, 10, 13);
    // varanda com mesinhas
    g.fillStyle = '#d9c8a8'; g.fillRect(x, y + h + 4, w, 42);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 6; i++) g.fillRect(x, y + h + 4 + i * 7, w, 1);
    for (const [tx, ty] of [[x + 16, y + h + 14], [x + 42, y + h + 30], [x + 68, y + h + 14]]) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(tx + 1, ty + 1.5, 4.5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(tx, ty, 4.5, 0, 7); g.fill(); }
    PLACES.cafe.windows = [[x + 8, y + 46, 22, 11], [x + w - 30, y + 46, 22, 11]];
  }
  function drawHospital(g) {
    const [x, y, w, h] = PLACES.hospital.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#f8fafc'; g.fillRect(x + 2, y + 64, w - 4, h - 64);
    roof(g, x, y, w, 66, '#e2e8f0', '#cbd5e1');
    g.fillStyle = '#ef4444'; g.fillRect(x + 22, y + 22, 26, 8); g.fillRect(x + 31, y + 13, 8, 26);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath(); g.arc(x + w - 38, y + 30, 17, 0, 7); g.stroke();
    g.fillStyle = '#94a3b8'; g.font = `900 16px ${UI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', x + w - 38, y + 31);
    windowsRow(g, x + 2, y + 74, w - 4, 9, 10, 10, '#93c5fd');
    windowsRow(g, x + 2, y + 90, w - 4, 9, 10, 8, '#93c5fd');
    g.fillStyle = '#dc2626'; g.fillRect(x + w / 2 - 16, y + h - 20, 32, 5);
    g.fillStyle = '#60a5fa'; g.fillRect(x + w / 2 - 9, y + h - 15, 18, 15);
    // ambulância
    const ax = 902, ay = 138; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(ax + 2, ay + 3, 34, 16);
    g.fillStyle = '#fff'; g.fillRect(ax, ay, 34, 16); g.fillStyle = '#ef4444'; g.fillRect(ax, ay + 7, 34, 3); g.fillStyle = '#93c5fd'; g.fillRect(ax + 26, ay + 2, 6, 5);
    g.fillStyle = '#ef4444'; g.fillRect(ax + 8, ay + 1, 5, 4);
    PLACES.hospital.windows = [[x + 6, y + 74, w - 12, 10], [x + 6, y + 90, w - 12, 8]];
  }
  function drawPraca(g) {
    const [x, y, w, h] = PLACES.praca.area;
    g.fillStyle = '#dccfb2'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(120,100,70,.12)';
    for (let i = x; i < x + w; i += 14) g.fillRect(i, y, 1, h);
    for (let j = y; j < y + h; j += 14) g.fillRect(x, j, w, 1);
    // canteiros nas bordas
    g.fillStyle = '#5da956';
    g.fillRect(x, y, w, 6); g.fillRect(x, y + h - 6, 100, 6); g.fillRect(x + 130, y + h - 6, 100, 6);
    g.fillRect(x, y, 6, 100); g.fillRect(x, y + 124, 6, 66); g.fillRect(x + w - 6, y, 6, 100); g.fillRect(x + w - 6, y + 124, 6, 66);
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#f472b6', '#facc15', '#fb923c', '#fff'][i % 4]; const px = x + 4 + hash(i + 50) * (w - 8); g.fillRect(px, y + 2 + (i % 2) * 2, 2, 2); }
    // coreto (palco)
    const [sx, sy] = STAGE;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(sx + 3, sy + 5, 34, 17, 0, 0, 7); g.fill();
    g.fillStyle = '#b08968'; g.beginPath(); g.ellipse(sx, sy + 2, 34, 16, 0, 0, 7); g.fill();
    g.fillStyle = '#c9a27e'; g.beginPath(); g.ellipse(sx, sy, 32, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#f8fafc'; g.beginPath(); g.moveTo(sx - 30, sy - 4); g.lineTo(sx, sy - 22); g.lineTo(sx + 30, sy - 4); g.closePath(); g.fill();
    g.fillStyle = '#dc2626'; g.beginPath(); g.moveTo(sx - 30, sy - 4); g.lineTo(sx, sy - 22); g.lineTo(sx, sy - 4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(sx - 30, sy - 4, 60, 2);
    // chafariz
    const [fx, fy] = FOUNTAIN;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(fx + 3, fy + 4, 27, 0, 7); g.fill();
    g.fillStyle = '#b9aa8a'; g.beginPath(); g.arc(fx, fy, 27, 0, 7); g.fill();
    g.fillStyle = '#4fb0e0'; g.beginPath(); g.arc(fx, fy, 22, 0, 7); g.fill();
    g.fillStyle = '#b9aa8a'; g.beginPath(); g.arc(fx, fy, 6, 0, 7); g.fill();
    // bancos e árvores
    g.fillStyle = '#8b5a3c'; for (const [bx, by, bw, bh] of [[292, 262, 4, 22], [474, 262, 4, 22], [330, 360, 22, 4], [418, 360, 22, 4]]) g.fillRect(bx, by, bw, bh);
    for (const [tx, ty] of [[286, 214], [484, 214], [288, 376], [482, 376]]) tree(g, tx, ty, 11);
  }
  function drawRestaurante(g) {
    const [x, y, w, h] = PLACES.restaurante.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#fbeee0'; g.fillRect(x + 2, y + 32, w - 4, h - 32);
    roof(g, x, y, w, 34, '#b83a2e');
    awning(g, x + 2, y + 34, w - 4, '#dc2626', '#ffffff');
    g.fillStyle = '#8fc8ee'; g.fillRect(x + 8, y + 48, 20, 10); g.fillRect(x + w - 28, y + 48, 20, 10);
    g.fillStyle = '#5b3a24'; g.fillRect(x + w / 2 - 5, y + h - 13, 10, 13);
    g.fillStyle = '#e7d7bf'; g.fillRect(x, y + h + 6, w, 70);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const tx = x + 14 + i * 20, ty = y + h + 22 + j * 30;
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(tx - 5, ty - 3, 11, 9);
      g.fillStyle = '#fff'; g.fillRect(tx - 6, ty - 4, 11, 9);
      g.fillStyle = '#ef4444'; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if ((a + b) % 2 === 0) g.fillRect(tx - 6 + a * 3.7, ty - 4 + b * 3, 3.7, 3);
    }
    PLACES.restaurante.windows = [[x + 8, y + 48, 20, 10], [x + w - 28, y + 48, 20, 10]];
  }
  function drawBar(g) {
    const [x, y, w, h] = PLACES.bar.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#8d5a36'; g.fillRect(x + 2, y + 32, w - 4, h - 32);
    g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 5; i++) g.fillRect(x + 2, y + 36 + i * 6, w - 4, 1);
    roof(g, x, y, w, 34, '#3b2f2f');
    g.fillStyle = '#fbbf24'; g.fillRect(x + 8, y + 46, 18, 10); g.fillRect(x + w - 26, y + 46, 18, 10);
    g.fillStyle = '#2b1d14'; g.fillRect(x + w / 2 - 6, y + h - 14, 12, 14);
    g.fillStyle = '#6b4a33'; g.fillRect(x, y + h + 6, w, 70);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 10; i++) g.fillRect(x, y + h + 6 + i * 7, w, 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const tx = x + 16 + i * 26, ty = y + h + 24 + j * 30; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(tx + 1, ty + 1.5, 5, 0, 7); g.fill(); g.fillStyle = '#c08a5a'; g.beginPath(); g.arc(tx, ty, 5, 0, 7); g.fill(); }
    PLACES.bar.windows = [[x + 8, y + 46, 18, 10], [x + w - 26, y + 46, 18, 10]];
  }
  function drawAcademia(g) {
    const [x, y, w, h] = PLACES.academia.rect;
    shadow(g, x, y, w, h);
    g.fillStyle = '#e5e7eb'; g.fillRect(x + 2, y + 34, w - 4, h - 34);
    roof(g, x, y, w, 36, '#374151');
    g.fillStyle = '#f97316'; g.fillRect(x, y + 14, w, 5);
    g.fillStyle = '#9ca3af'; g.fillRect(x + w / 2 - 14, y + 5, 28, 3); g.fillRect(x + w / 2 - 17, y + 2, 4, 9); g.fillRect(x + w / 2 + 13, y + 2, 4, 9);
    g.fillStyle = '#7dd3fc'; g.fillRect(x + 8, y + 42, w - 16, 14);
    g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 6; i++) g.fillRect(x + 12 + i * 16, y + 42, 1, 14);
    g.fillStyle = '#1f2937'; g.fillRect(x + w / 2 - 6, y + h - 12, 12, 12);
    const [ax, ay, aw, ah] = PLACES.academia.area;
    g.fillStyle = '#586170'; g.fillRect(ax, ay, aw, ah);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < aw; i += 10) g.fillRect(ax + i, ay, 1, ah);
    g.fillStyle = '#f97316'; g.fillRect(ax, ay, aw, 2); g.fillRect(ax, ay + ah - 2, aw, 2);
    g.fillStyle = '#cbd5e1'; for (const bx of [ax + 20, ax + 80, ax + 140]) { g.fillRect(bx, ay + 6, 2, 12); g.fillRect(bx + 16, ay + 6, 2, 12); g.fillRect(bx, ay + 6, 18, 2); }
    PLACES.academia.windows = [[x + 8, y + 42, w - 16, 14]];
  }
  function drawParque(g) {
    const [x, y, w, h] = PLACES.parque.area;
    // caminhos
    g.strokeStyle = '#d8c79c'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(385, y); g.quadraticCurveTo(380, 470, POND[0] - 30, POND[1] - 30); g.stroke();
    g.beginPath(); g.moveTo(x, 520); g.quadraticCurveTo(330, 540, POND[0] - POND[2] - 6, POND[1] + 4); g.stroke();
    g.beginPath(); g.moveTo(x + w, 520); g.quadraticCurveTo(490, 500, POND[0] + POND[2] + 4, POND[1] - 6); g.stroke();
    g.beginPath(); g.ellipse(POND[0], POND[1], POND[2] + 12, POND[3] + 12, 0, 0, 7); g.stroke();
    // lago
    g.fillStyle = '#9fd18b'; g.beginPath(); g.ellipse(POND[0], POND[1], POND[2] + 4, POND[3] + 4, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient(POND[0] - 10, POND[1] - 8, 4, POND[0], POND[1], POND[2]);
    gr.addColorStop(0, '#7cc8ef'); gr.addColorStop(1, '#3b8fc4');
    g.fillStyle = gr; g.beginPath(); g.ellipse(POND[0], POND[1], POND[2], POND[3], 0, 0, 7); g.fill();
    g.fillStyle = '#6fbf6a'; g.beginPath(); g.ellipse(POND[0] + 20, POND[1] + 6, 6, 4, 0, 0, 7); g.fill();
    // flores
    for (let i = 0; i < 70; i++) { g.fillStyle = ['#f472b6', '#facc15', '#fff', '#a78bfa'][i % 4]; g.fillRect(x + 4 + hash(i + 300) * (w - 8), y + 4 + hash(i + 600) * (h - 8), 2, 2); }
    g.fillStyle = '#8b5a3c'; for (const [bx, by] of [[346, 540], [460, 470]]) g.fillRect(bx, by, 18, 4);
    for (const [tx, ty] of TREES_PARK) tree(g, tx, ty, 12 + hash(tx) * 4);
  }
  function drawMercado(g) {
    const [x, y, w, h] = PLACES.mercado.rect;
    // estacionamento
    g.fillStyle = '#5b6170'; g.fillRect(548, 516, 192, 80);
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 9; i++) g.fillRect(556 + i * 20, 562, 1.5, 28);
    const cars = [['#ef4444', 560], ['#3b82f6', 600], ['#f5f5f4', 660], ['#10b981', 700]];
    for (const [c, cx] of cars) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx + 2, 568, 14, 22); g.fillStyle = c; rr(g, cx, 565, 14, 22, 3); g.fill(); g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(cx + 2, 569, 10, 5); g.fillRect(cx + 2, 579, 10, 4); }
    shadow(g, x, y, w, h);
    g.fillStyle = '#f7f7f2'; g.fillRect(x + 2, y + 40, w - 4, h - 40);
    roof(g, x, y, w, 42, '#e5e7eb', '#cfd4da');
    g.fillStyle = '#b6bcc5'; for (const vx of [x + 20, x + 60, x + 110, x + 150]) g.fillRect(vx, y + 10, 14, 8);
    awning(g, x + 2, y + 42, w - 4, '#16a34a', '#ffffff');
    sign(g, x + w / 2, y + 24, 'MERCADO', '#15803d', '#fff');
    g.fillStyle = '#8fc8ee'; g.fillRect(x + 10, y + 56, 50, 14); g.fillRect(x + w - 60, y + 56, 50, 14);
    g.fillStyle = '#bfdbfe'; g.fillRect(x + w / 2 - 12, y + h - 18, 24, 18);
    g.fillStyle = '#9ca3af'; for (let i = 0; i < 4; i++) g.fillRect(x + w - 26 + i * 4, y + h + 6, 3, 5);
    PLACES.mercado.windows = [[x + 10, y + 56, 50, 14], [x + w - 60, y + 56, 50, 14]];
  }
  function drawFabrica(g) {
    const [x, y, w, h] = PLACES.fabrica.rect;
    g.fillStyle = '#a3a8b0'; g.fillRect(788, 546, 162, 50);
    g.fillStyle = '#b07a4a'; for (const [cx, cy] of [[800, 556], [812, 556], [800, 568], [930, 556]]) { g.fillRect(cx, cy, 10, 10); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(cx, cy + 4, 10, 1); g.fillStyle = '#b07a4a'; }
    shadow(g, x, y, w, h);
    g.fillStyle = '#b5533c'; g.fillRect(x + 2, y + 50, w - 4, h - 50);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 8; i++) g.fillRect(x + 2, y + 54 + i * 6, w - 4, 1);
    // telhado dente de serra
    for (let i = 0; i < 6; i++) {
      const sx = x + i * (w / 6), sw = w / 6;
      g.fillStyle = '#8a939e'; g.beginPath(); g.moveTo(sx, y + 52); g.lineTo(sx, y + 14); g.lineTo(sx + sw, y + 52); g.closePath(); g.fill();
      g.fillStyle = '#b8c1cc'; g.beginPath(); g.moveTo(sx, y + 14); g.lineTo(sx + sw, y + 52); g.lineTo(sx + sw, y + 30); g.closePath(); g.fill();
      g.fillStyle = '#7dd3fc'; g.fillRect(sx + 1, y + 16, 2, 34);
    }
    windowsRow(g, x + 2, y + 62, w - 4, 8, 10, 10, '#fcd34d');
    g.fillStyle = '#4b5563'; g.fillRect(x + w / 2 - 16, y + h - 26, 32, 26);
    g.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 5; i++) g.fillRect(x + w / 2 - 16, y + h - 24 + i * 5, 32, 1);
    // chaminé
    g.fillStyle = '#9a3f2c'; g.fillRect(x + w - 34, y - 10, 14, 30); g.fillStyle = '#f8fafc'; g.fillRect(x + w - 34, y - 4, 14, 3); g.fillStyle = '#ef4444'; g.fillRect(x + w - 34, y + 3, 14, 3);
    PLACES.fabrica.windows = [[x + 8, y + 62, w - 16, 10]];
    PLACES.fabrica.chimney = [x + w - 27, y - 12];
  }
  function drawJardim(g) {
    // jardim de entrada da cidade com lago, parquinho e placa
    g.fillStyle = '#9fd18b'; g.beginPath(); g.ellipse(70, 520, 44, 24, 0, 0, 7); g.fill();
    g.fillStyle = '#4fa6d8'; g.beginPath(); g.ellipse(70, 520, 38, 19, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(52, 512, 12, 1.5); g.fillRect(74, 526, 14, 1.5);
    g.fillStyle = '#e9d8a6'; g.fillRect(132, 470, 90, 62);
    g.fillStyle = '#ef4444'; g.fillRect(146, 480, 3, 26); g.fillRect(146, 480, 22, 3); g.fillStyle = '#3b82f6'; g.beginPath(); g.moveTo(168, 480); g.lineTo(186, 506); g.lineTo(182, 508); g.lineTo(165, 483); g.fill();
    g.fillStyle = '#6b7280'; g.fillRect(196, 478, 2, 26); g.fillRect(214, 478, 2, 26); g.fillRect(196, 478, 20, 2);
    g.fillStyle = '#f59e0b'; g.fillRect(199, 496, 6, 3); g.fillRect(208, 498, 6, 3);
    // placa
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(40, 452, 128, 26);
    g.fillStyle = '#8b5a3c'; g.fillRect(52, 470, 3, 16); g.fillRect(150, 470, 3, 16);
    g.fillStyle = '#a0693f'; rr(g, 36, 446, 128, 26, 5); g.fill();
    g.fillStyle = '#fef3c7'; g.font = `800 10px ${UI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Bem-vindo a VILA JEV', 100, 455); g.font = `600 7.5px ${UI_FONT}`; g.fillText('48 moradores · 48 cérebros', 100, 465);
    for (const [tx, ty, r] of [[20, 446, 10], [200, 446, 9], [30, 580, 12], [110, 584, 11], [190, 580, 12], [226, 548, 8], [124, 548, 7]]) tree(g, tx, ty, r);
    for (let i = 0; i < 50; i++) { g.fillStyle = ['#f472b6', '#facc15', '#fff'][i % 3]; g.fillRect(6 + hash(i + 900) * 220, 432 + hash(i + 1200) * 160, 2, 2); }
  }

  // ------------------------------------------------------------------ pessoas
  function novaPessoa(p) {
    return { id: p.id, emoji: p.emoji, x: 0, y: 0, alpha: 0, place: null, path: null, hidden: true, off: (hstr(p.id) - 0.5) * 12, bubble: null, atv: null, g: 0, lastProbTop: null };
  }
  function slotPos(lugar, id) {
    const slots = (lugar === 'praca' && world.show) ? SLOTS_SHOW : SLOTS[lugar];
    const m = venueSlots[lugar];
    const idx = m && m.get(id);
    if (!slots || idx == null) return placeCenter(lugar);
    const base = slots[idx % slots.length];
    const lap = Math.floor(idx / slots.length);
    return lap ? [base[0] + lap * 5, base[1] + lap * 3] : base;
  }
  function placeCenter(l) {
    const P = placeOf(l);
    if (!P) return [WW / 2, WH / 2];
    if (P.area) return [P.area[0] + P.area[2] / 2, P.area[1] + P.area[3] / 2];
    return P.ways[0].gate;
  }
  function assignSlots(occ) {
    // occ: lugar -> [ids]; mantém quem ficou, dá vagas livres a quem chegou
    for (const l of Object.keys(SLOTS)) {
      const ids = (occ[l] || []).slice().sort();
      const m = venueSlots[l] || (venueSlots[l] = new Map());
      for (const id of [...m.keys()]) if (!ids.includes(id)) m.delete(id);
      const used = new Set(m.values());
      let i = 0;
      for (const id of ids) {
        if (m.has(id)) continue;
        while (used.has(i)) i++;
        m.set(id, i); used.add(i);
      }
    }
  }
  function waysOf(l) { const P = placeOf(l); return P ? P.ways : []; }
  function wayPts(w) { return [w.gate, ...w.via]; }
  function planTrip(pe, from, to, dest) {
    const start = [pe.x, pe.y];
    let best = null;
    for (const wa of waysOf(from)) for (const wb of waysOf(to)) {
      const a = key(roadPt(wa.road, wa.at)), b = key(roadPt(wb.road, wb.at));
      const sp = shortest(a, b);
      const exitPts = wayPts(wa);
      const entryPts = wayPts(wb).slice().reverse();
      let len = dist(start, exitPts[0]) + sp.len + dist(entryPts[entryPts.length - 1], dest);
      for (let i = 1; i < exitPts.length; i++) len += dist(exitPts[i - 1], exitPts[i]);
      len += dist(exitPts[exitPts.length - 1], sp.pts[0]) + dist(sp.pts[sp.pts.length - 1], entryPts[0]);
      if (!best || len < best.len) best = { len, exitPts, road: sp.pts, entryPts };
    }
    if (!best) return [start, dest];
    const o = pe.off;
    const road = best.road.map((p) => [p[0] + o, p[1] + o]);
    const pts = [start, ...best.exitPts, ...road, ...best.entryPts, dest];
    return pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 0.5);
  }
  function startTrip(pe, pts, delay) {
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + dist(pts[i - 1], pts[i]));
    const total = lens[lens.length - 1];
    const dur = clamp(total / 240, 0.8, Math.max(1.2, world.segPorHora * 0.72)) * 1000;
    pe.path = { pts, lens, total, t0: performance.now() + delay, dur };
  }
  function posOnPath(path, s) {
    const d = s * path.total;
    let i = 1; while (i < path.lens.length - 1 && path.lens[i] < d) i++;
    const seg = path.lens[i] - path.lens[i - 1] || 1;
    const t = clamp((d - path.lens[i - 1]) / seg, 0, 1);
    const a = path.pts[i - 1], b = path.pts[i];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), d];
  }

  // ------------------------------------------------------------------ atualização a partir do servidor
  function setSnapshot(snap) {
    perfis = Object.fromEntries(snap.perfis.map((p) => [p.id, p]));
    atividades = snap.atividades;
    people = new Map();
    for (const p of snap.perfis) people.set(p.id, novaPessoa(p));
    setWorld(snap);
    const occ = occupantsByVenue(snap.moradores);
    assignSlots(occ);
    for (const row of snap.moradores) {
      const pe = people.get(row.id);
      pe.place = row.l; pe.atv = row.a; pe.g = row.g;
      const hid = hiddenPlace(row.l);
      const pos = hid ? doorOf(row.l) : slotPos(row.l, row.id);
      pe.x = pos[0]; pe.y = pos[1]; pe.hidden = hid; pe.alpha = hid ? 0 : 1;
    }
  }
  function doorOf(l) { const P = placeOf(l); return P ? P.ways[0].gate : [WW / 2, WH / 2]; }
  function occupantsByVenue(rows) {
    const occ = {};
    for (const r of rows) if (SLOTS[r.l]) (occ[r.l] ||= []).push(r.id);
    return occ;
  }
  function setWorld(d) {
    if (d.relogio) { world.hora = d.relogio.hora; world.t = d.relogio.t; world.recebidoEm = performance.now(); }
    if (d.seg_por_hora) world.segPorHora = d.seg_por_hora;
    if (d.clima) world.clima = d.clima;
    if (d.eventos) { world.eventos = d.eventos; world.show = d.eventos.some((e) => e.tipo === 'show'); }
    if (d.ocupacao) world.ocupacao = d.ocupacao;
  }
  const SHOW_EMOJI = ['🎶', '🎸', '🕺', '💃', '🎵'];
  function balaoEmoji(row, tHora) {
    if (world.show && row.l === 'praca' && row.a === 'socializar_na_praca') return SHOW_EMOJI[Math.floor(hstr(row.id + tHora) * SHOW_EMOJI.length)];
    return atividades[row.a]?.emoji || '❔';
  }
  function onHora(d) {
    setWorld(d);
    const occ = occupantsByVenue(d.moradores);
    assignSlots(occ);
    const now = performance.now();
    const tHora = d.relogio ? d.relogio.t : 0;
    for (const row of d.moradores) {
      const pe = people.get(row.id); if (!pe) continue;
      pe.g = row.g;
      const mudouAtv = pe.atv !== row.a;
      pe.atv = row.a;
      // multidão: só parte dos balões aparece, para não virar uma mancha branca
      const lotado = (occ[row.l] || []).length >= 7 && hstr(row.id + ':' + tHora) > 0.42;
      const dest = hiddenPlace(row.l) ? doorOf(row.l) : slotPos(row.l, row.id);
      if (pe.place !== row.l) {
        if (pe.hidden) { const dp = doorOf(pe.place); pe.x = dp[0]; pe.y = dp[1]; }
        const pts = planTrip(pe, pe.place, row.l, dest);
        pe.place = row.l;
        pe.hidden = false;
        pe.enterHidden = hiddenPlace(row.l);
        startTrip(pe, pts, Math.random() * 380);
        pe.bubble = lotado ? null : { emoji: balaoEmoji(row, tHora), t0: now, until: now + 900, walking: true };
      } else if (!hiddenPlace(row.l)) {
        const cur = [pe.x, pe.y];
        if (dist(cur, dest) > 2 && !pe.path) startTrip(pe, [cur, dest], Math.random() * 300);
        if (mudouAtv && !lotado) pe.bubble = { emoji: balaoEmoji(row, tHora), t0: now, until: now + 2400 };
      } else if (mudouAtv) {
        puff(atividades[row.a]?.emoji, doorOf(row.l));
      }
    }
  }
  function pensando() { thinkUntil = performance.now() + 900; wave = performance.now(); }
  function puff(emoji, at) { if (!emoji) return; puffs.push({ emoji, x: at[0] + (Math.random() - 0.5) * 10, y: at[1] - 8, t0: performance.now() }); if (puffs.length > 60) puffs.shift(); }

  // ------------------------------------------------------------------ quadro
  const LUZ = [[0, [8, 12, 40, 0.58]], [4.5, [8, 12, 40, 0.58]], [5.5, [60, 40, 90, 0.4]], [6.3, [255, 140, 80, 0.16]], [7.5, [255, 210, 160, 0.04]], [8, [0, 0, 0, 0]],
    [16.5, [0, 0, 0, 0]], [17.3, [255, 170, 70, 0.1]], [18.2, [220, 100, 70, 0.22]], [19, [70, 40, 100, 0.4]], [20, [12, 16, 48, 0.54]], [24, [8, 12, 40, 0.58]]];
  function luz(h) {
    for (let i = 1; i < LUZ.length; i++) if (h <= LUZ[i][0]) {
      const [h0, c0] = LUZ[i - 1], [h1, c1] = LUZ[i]; const t = (h - h0) / (h1 - h0 || 1);
      return c0.map((v, j) => lerp(v, c1[j], t));
    }
    return LUZ[0][1];
  }
  function horaVisual() {
    const prog = clamp((performance.now() - world.recebidoEm) / (world.segPorHora * 1000), 0, 1);
    return (world.hora + prog) % 24;
  }
  function noiteFator(h) { return h >= 19.5 || h < 5.5 ? 1 : h >= 18 ? (h - 18) / 1.5 : h < 6.5 ? 1 - (h - 5.5) : 0; }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!ctx || !staticLayer) return;
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(staticLayer, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);
    const hv = horaVisual();
    const noite = noiteFator(hv);
    const cond = world.clima.cond;
    const ev = (t) => world.eventos.find((e) => e.tipo === t);

    // água do chafariz e do lago
    const tt = now / 1000;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const r = 7 + ((tt * 9 + i * 5) % 15); g.globalAlpha = 1 - (r - 7) / 15; g.beginPath(); g.arc(FOUNTAIN[0], FOUNTAIN[1], r, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 6; i++) { const a = tt * 2 + i; g.fillRect(FOUNTAIN[0] + Math.cos(a) * 3 - 0.8, FOUNTAIN[1] - 4 - Math.abs(Math.sin(a * 1.3)) * 5, 1.6, 1.6); }
    for (let i = 0; i < 5; i++) { const a = hash(i + 40) * 6.28; const s = (Math.sin(tt * 1.5 + i * 2) + 1) / 2; g.fillStyle = `rgba(255,255,255,${0.15 + s * 0.4})`; g.fillRect(POND[0] + Math.cos(a) * POND[2] * 0.6, POND[1] + Math.sin(a) * POND[3] * 0.5, 5, 1); }

    // palco do show
    const show = ev('show');
    if (show) {
      for (let i = 0; i < 3; i++) {
        const ang = Math.sin(tt * 1.6 + i * 2.1) * 0.7;
        const col = ['rgba(244,114,182,', 'rgba(34,211,238,', 'rgba(250,204,21,'][i];
        const gr = g.createLinearGradient(STAGE[0], STAGE[1], STAGE[0] + Math.sin(ang) * 120, STAGE[1] + 130);
        gr.addColorStop(0, col + (0.35 + noite * 0.25) + ')'); gr.addColorStop(1, col + '0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(STAGE[0] - 4 + i * 4, STAGE[1] - 2);
        g.lineTo(STAGE[0] + Math.sin(ang) * 120 - 26, STAGE[1] + 130); g.lineTo(STAGE[0] + Math.sin(ang) * 120 + 26, STAGE[1] + 130); g.closePath(); g.fill();
      }
      drawEmoji(g, '🎸', STAGE[0] - 13, STAGE[1] - 1 - Math.abs(Math.sin(tt * 6)) * 2, 13);
      drawEmoji(g, '🎤', STAGE[0] + 1, STAGE[1] - 3 - Math.abs(Math.sin(tt * 6 + 1)) * 2, 12);
      drawEmoji(g, '🥁', STAGE[0] + 15, STAGE[1] + 1, 12);
      if (Math.random() < dt * 3) notes.push({ x: STAGE[0] + (Math.random() - 0.5) * 50, y: STAGE[1] - 10, t0: now, e: Math.random() < 0.5 ? '🎵' : '🎶' });
    }

    // pessoas (ordenadas por y)
    const list = [];
    for (const pe of people.values()) {
      if (pe.path) {
        const p = pe.path;
        const s0 = (now - p.t0) / p.dur;
        if (s0 >= 0) {
          const s = s0 >= 1 ? 1 : s0 * s0 * (3 - 2 * s0);
          const [x, y, d] = posOnPath(p, s);
          pe.x = x; pe.y = y; pe.walkD = d; pe.alpha = Math.min(1, pe.alpha + dt * 5);
          if (s0 >= 1) {
            pe.path = null;
            if (pe.enterHidden) { pe.hidden = true; puff(atividades[pe.atv]?.emoji, [pe.x, pe.y]); }
            else if (pe.bubble && pe.bubble.walking) pe.bubble = { emoji: pe.bubble.emoji, t0: now, until: now + 2200 };
          }
        }
      }
      if (pe.hidden && !pe.path) { pe.alpha = Math.max(0, pe.alpha - dt * 4); if (pe.alpha <= 0) continue; }
      list.push(pe);
    }
    list.sort((a, b) => a.y - b.y);
    const thinking = now < thinkUntil;
    const dancing = !!show;
    for (const pe of list) {
      let bob = 0;
      if (pe.path && now >= pe.path.t0) bob = -Math.abs(Math.sin((pe.walkD || 0) / 5)) * 2.4;
      else if (dancing && pe.place === 'praca') bob = -Math.abs(Math.sin(tt * 7 + hstr(pe.id) * 6)) * 3.2;
      else if (pe.place === 'academia') bob = -Math.abs(Math.sin(tt * 4 + hstr(pe.id) * 6)) * 1.5;
      g.globalAlpha = pe.alpha;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(pe.x, pe.y + 1, 6.5, 2.6, 0, 0, 7); g.fill();
      if (pe.id === selected) { g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.beginPath(); g.ellipse(pe.x, pe.y + 1, 10 + Math.sin(tt * 5) * 1.2, 4.5, 0, 0, 7); g.stroke(); }
      else if (pe.id === hoverId) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(pe.x, pe.y + 1, 9, 4, 0, 0, 7); g.stroke(); }
      drawEmoji(g, pe.emoji, pe.x, pe.y - 9 + bob, 19);
      g.globalAlpha = 1;
      pe.drawY = pe.y - 9 + bob;
    }

    // fumaça da fábrica e das casas
    const fab = PLACES.fabrica.chimney;
    if (fab && !ev('folga') && Math.random() < dt * 2.5) smoke.push({ x: fab[0], y: fab[1], t0: now, r: 3 + Math.random() * 2 });
    for (const h of HOUSES) if (h.cooking && Math.random() < dt * 1.2) smoke.push({ x: h.x + h.w - 10, y: h.y + 2, t0: now, r: 2 });
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; const a = (now - s.t0) / 3500;
      if (a >= 1) { smoke.splice(i, 1); continue; }
      g.fillStyle = `rgba(235,235,240,${0.55 * (1 - a)})`;
      g.beginPath(); g.arc(s.x + a * 18 + Math.sin(a * 6) * 3, s.y - a * 38, s.r + a * 7, 0, 7); g.fill();
    }

    // nuvens (sombras)
    const nNuv = cond === 'sol' ? 2 : cond === 'nublado' ? 6 : 7;
    while (clouds.length < nNuv) clouds.push({ x: Math.random() * WW, y: Math.random() * WH, r: 70 + Math.random() * 90, v: 6 + Math.random() * 8 });
    if (clouds.length > nNuv) clouds.length = nNuv;
    const cloudA = cond === 'sol' ? 0.06 : cond === 'nublado' ? 0.11 : 0.14;
    for (const c of clouds) {
      c.x += c.v * dt; if (c.x - c.r > WW) { c.x = -c.r; c.y = Math.random() * WH; }
      const gr = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r); gr.addColorStop(0, `rgba(10,20,30,${cloudA})`); gr.addColorStop(1, 'rgba(10,20,30,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(c.x, c.y, c.r, c.r * 0.6, 0, 0, 7); g.fill();
    }

    // luz do dia / noite + clima
    const L = luz(hv);
    if (L[3] > 0.001) { g.fillStyle = `rgba(${L[0] | 0},${L[1] | 0},${L[2] | 0},${L[3]})`; g.fillRect(0, 0, WW, WH); }
    if (cond === 'chuva') { g.fillStyle = 'rgba(25,35,60,.16)'; g.fillRect(0, 0, WW, WH); }
    if (cond === 'tempestade') { g.fillStyle = 'rgba(10,15,35,.3)'; g.fillRect(0, 0, WW, WH); }
    if (world.clima.frio) { g.fillStyle = 'rgba(160,200,255,.08)'; g.fillRect(0, 0, WW, WH); }

    // luzes (aditivas)
    if (noite > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const acesos = litPlaces();
      for (const [l, on] of Object.entries(acesos)) {
        if (!on) continue;
        const P = placeOf(l); if (!P || !P.windows) continue;
        for (const [wx, wy, ww, wh] of P.windows) { g.fillStyle = `rgba(255,190,90,${0.5 * noite})`; g.fillRect(wx, wy, ww, wh); g.fillStyle = `rgba(255,170,60,${0.12 * noite})`; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6); }
      }
      for (const [x, y] of LAMPS) { const gr = g.createRadialGradient(x, y - 10, 0, x, y - 10, 26); gr.addColorStop(0, `rgba(255,214,140,${0.42 * noite})`); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(x - 26, y - 36, 52, 52); }
      if (acesos.bar) {
        const [bx, by] = [PLACES.bar.rect[0] + 42, PLACES.bar.rect[1] + 24];
        const flick = 0.75 + Math.sin(tt * 13) * 0.1;
        const gr = g.createRadialGradient(bx, by, 0, bx, by, 34); gr.addColorStop(0, `rgba(244,114,182,${0.5 * noite * flick})`); gr.addColorStop(1, 'rgba(244,114,182,0)'); g.fillStyle = gr; g.fillRect(bx - 34, by - 34, 68, 68);
        for (let i = 0; i < 9; i++) { const lx = PLACES.bar.area[0] + 5 + i * 9.5, ly = PLACES.bar.area[1] + 6 + Math.sin(i * 0.9) * 2; g.fillStyle = `rgba(255,220,120,${0.8 * noite})`; g.beginPath(); g.arc(lx, ly, 1.4, 0, 7); g.fill(); }
      }
      if (show) { const gr = g.createRadialGradient(STAGE[0], STAGE[1], 0, STAGE[0], STAGE[1], 70); gr.addColorStop(0, `rgba(167,139,250,${0.35 * noite})`); gr.addColorStop(1, 'rgba(167,139,250,0)'); g.fillStyle = gr; g.fillRect(STAGE[0] - 70, STAGE[1] - 70, 140, 140); }
      g.restore();
    }
    if (PLACES.bar && noite > 0.3 && litPlaces().bar) sign(g, PLACES.bar.rect[0] + 42, PLACES.bar.rect[1] + 26, 'BAR', 'rgba(20,10,20,.8)', '#f9a8d4');

    // chuva
    const nChuva = cond === 'chuva' ? 160 : cond === 'tempestade' ? 320 : 0;
    while (rain.length < nChuva) rain.push({ x: Math.random() * (WW + 200) - 100, y: Math.random() * WH, v: 380 + Math.random() * 260, l: 8 + Math.random() * 8 });
    if (rain.length > nChuva) rain.length = nChuva;
    if (nChuva) {
      const wind = cond === 'tempestade' ? 0.45 : 0.18;
      g.strokeStyle = cond === 'tempestade' ? 'rgba(200,215,255,.5)' : 'rgba(190,210,255,.42)'; g.lineWidth = 1; g.beginPath();
      for (const d of rain) { d.y += d.v * dt; d.x += d.v * wind * dt; if (d.y > WH) { d.y = -10; d.x = Math.random() * (WW + 200) - 200; } g.moveTo(d.x, d.y); g.lineTo(d.x - d.l * wind, d.y - d.l); }
      g.stroke();
    }
    if (cond === 'tempestade') {
      if (now > nextFlash) { flash = 1; nextFlash = now + 2500 + Math.random() * 5000; }
      if (flash > 0) { g.fillStyle = `rgba(230,235,255,${flash * 0.55})`; g.fillRect(0, 0, WW, WH); flash = Math.max(0, flash - dt * 3.2); }
    }

    // notas musicais
    for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; const a = (now - n.t0) / 2200; if (a >= 1) { notes.splice(i, 1); continue; } drawEmoji(g, n.e, n.x + Math.sin(a * 8) * 6, n.y - a * 50, 11, 1 - a); }
    // chegadas (emoji subindo da porta)
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; const a = (now - p.t0) / 1400; if (a >= 1) { puffs.splice(i, 1); continue; } drawEmoji(g, p.emoji, p.x, p.y - a * 22, 12, a < 0.2 ? a * 5 : 1 - (a - 0.2) / 0.8); }

    // zzz das casas e fogão
    for (const h of HOUSES) {
      if (h.sleeping) { const a = (tt * 0.6 + h.n * 0.37) % 1; drawEmoji(g, '💤', h.x + h.w - 8 + a * 6, h.y + 4 - a * 14, 11, Math.sin(a * Math.PI)); }
    }

    // balões dos moradores (sempre legíveis: depois da luz)
    for (const pe of list) {
      const topo = (pe.drawY ?? pe.y - 9);
      if (pe.g && !pe.path) drawEmoji(g, '🤒', pe.x + 9, topo - 6, 9, pe.alpha);
      if (thinking && !pe.path) {
        // "…" animado: o morador está esperando a decisão do Jev
        const bx = pe.x, by = topo - 16;
        g.globalAlpha = pe.alpha;
        g.fillStyle = 'rgba(239,239,231,.96)'; rr(g, bx - 10, by - 6.5, 20, 13, 6.5); g.fill();
        g.strokeStyle = 'rgba(20,20,18,.75)'; g.lineWidth = 1; g.stroke();
        for (let i = 0; i < 3; i++) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(tt * 9 - i * 0.9)); g.fillStyle = `rgba(31,63,143,${a})`; g.beginPath(); g.arc(bx - 5 + i * 5, by, 1.6, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        continue;
      }
      let e = null, alpha = 1;
      if (pe.bubble && now < pe.bubble.until) { e = pe.bubble.emoji; const rem = pe.bubble.until - now; alpha = rem < 400 ? rem / 400 : Math.min(1, (now - pe.bubble.t0) / 180); }
      else if (pe.id === selected || pe.id === hoverId) e = atividades[pe.atv]?.emoji;
      if (!e) continue;
      const bx = pe.x, by = topo - 19;
      g.globalAlpha = alpha * pe.alpha;
      g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, bx - 10, by - 8, 22, 18, 7); g.fill();
      g.fillStyle = 'rgba(247,247,240,.96)'; rr(g, bx - 11, by - 9.5, 22, 18, 7); g.fill();
      g.strokeStyle = pe.id === selected ? '#1F3F8F' : 'rgba(20,20,18,.55)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(247,247,240,.96)'; g.beginPath(); g.moveTo(bx - 3, by + 8); g.lineTo(bx + 1, by + 12.5); g.lineTo(bx + 3, by + 8); g.fill();
      drawEmoji(g, e, bx, by - 0.5, 12.5);
      g.globalAlpha = 1;
    }

    // onda de "pensamento" quando o Jev é chamado
    const wv = (now - wave) / 900;
    if (wv >= 0 && wv < 1) {
      g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - wv)})`; g.lineWidth = 3 * (1 - wv) + 1;
      g.beginPath(); g.arc(WW / 2, WH / 2, 40 + wv * 620, 0, 7); g.stroke();
      g.strokeStyle = `rgba(242,193,78,${0.5 * (1 - wv)})`; g.beginPath(); g.arc(WW / 2, WH / 2, 20 + wv * 540, 0, 7); g.stroke();
    }

    drawLabels(g, now);
    drawEventPins(g, now, tt);
    drawSelectedMarker(g, tt);
  }

  function litPlaces() {
    const o = {}; const oc = world.ocupacao || {};
    for (const l of ['escola', 'escritorio', 'hospital', 'restaurante', 'bar', 'academia', 'mercado', 'fabrica', 'cafe']) o[l] = (oc[l] || 0) > 0 || l === 'hospital';
    for (const h of HOUSES) o[h.id] = !!h.awake;
    return o;
  }
  function houseStates() {
    for (const h of HOUSES) { h.sleeping = false; h.awake = false; h.cooking = false; }
    for (const pe of people.values()) {
      if (!isHouse(pe.place) || !pe.hidden) continue;
      const h = HOUSES.find((x) => x.id === pe.place); if (!h) continue;
      if (pe.atv === 'dormir') h.sleeping = true; else h.awake = true;
      if (pe.atv === 'cozinhar_em_casa') h.cooking = true;
    }
  }
  setInterval(houseStates, 500);

  function pill(g, x, y, text, count, hot, closed) {
    g.font = `750 10.5px ${UI_FONT}`;
    const tw = g.measureText(text).width;
    const cw = count != null ? Math.max(14, g.measureText(String(count)).width + 8) : 0;
    const w = tw + 12 + (cw ? cw + 4 : 0), h = 17;
    const x0 = x - w / 2;
    g.fillStyle = closed ? 'rgba(20,20,18,.62)' : 'rgba(20,20,18,.8)'; rr(g, x0, y - h / 2, w, h, 8.5); g.fill();
    g.fillStyle = closed ? 'rgba(255,255,255,.55)' : '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x0 + 6, y + 0.5);
    if (cw) {
      const cx = x0 + 6 + tw + 4;
      if (count > 0) { const gr = g.createLinearGradient(cx, 0, cx + cw, 0); gr.addColorStop(0, hot ? '#F29A8F' : '#F2C14E'); gr.addColorStop(1, hot ? '#F29A8F' : '#F2C14E'); g.fillStyle = gr; }
      else g.fillStyle = 'rgba(255,255,255,.14)';
      rr(g, cx, y - 6.5, cw, 13, 6.5); g.fill();
      g.fillStyle = count > 0 ? '#0a0a0f' : 'rgba(255,255,255,.6)'; g.font = `800 9.5px ${UI_FONT}`; g.textAlign = 'center'; g.fillText(String(count), cx + cw / 2, y + 0.5);
    }
    return [x0, y - h / 2, w, h];
  }
  function drawLabels(g) {
    const oc = world.ocupacao || {};
    const evLug = new Set(world.eventos.map((e) => e.lugar).filter(Boolean));
    for (const [l, P] of Object.entries(PLACES)) {
      const txt = `${P.emoji} ${P.nome}`;
      P.pillRect = pill(g, P.label[0], P.label[1], txt, oc[l] || 0, evLug.has(l), false);
    }
  }
  function drawEventPins(g, now, tt) {
    let i = 0;
    for (const e of world.eventos) {
      if (e.tipo === 'livre') {
        const at = e.lugar && PLACES[e.lugar] ? [PLACES[e.lugar].label[0], PLACES[e.lugar].label[1] - 4] : e.lugar === 'casa' ? [125, 190] : [WW / 2, 36 + i * 30];
        const y = at[1] - 16 - Math.abs(Math.sin(tt * 2.2)) * 3;
        const texto = e.titulo.length > 44 ? e.titulo.slice(0, 42) + '…' : e.titulo;
        g.font = `700 10px ${UI_FONT}`;
        const tw = Math.min(260, g.measureText(texto).width) + 30;
        const x0 = clamp(at[0] - tw / 2, 6, WW - tw - 6);
        g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, x0 + 2, y - 11 + 2, tw, 22, 11); g.fill();
        const gr = g.createLinearGradient(x0, 0, x0 + tw, 0); gr.addColorStop(0, '#FFF4C2'); gr.addColorStop(1, '#FFF4C2');
        g.fillStyle = gr; rr(g, x0, y - 11, tw, 22, 11); g.fill();
        g.strokeStyle = '#141412'; g.lineWidth = 1.5; g.stroke();
        drawEmoji(g, e.emoji || '📣', x0 + 12, y, 12);
        g.fillStyle = '#141412'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(texto, x0 + 22, y + 0.5, tw - 28);
        i++;
      }
      if (e.tipo === 'desconto') { const [x, y] = [PLACES.restaurante.rect[0] + 44, PLACES.restaurante.rect[1] + 14]; if (Math.sin(tt * 5) > -0.3) sign(g, x, y, '50% OFF', '#facc15', '#7c2d12'); }
      if (e.tipo === 'folga') sign(g, PLACES.fabrica.rect[0] + 81, PLACES.fabrica.rect[1] + 76, 'FOLGA HOJE', '#0f172a', '#fde68a');
      if (e.tipo === 'feriado') {
        for (const l of ['escola', 'escritorio', 'fabrica']) { const P = PLACES[l]; sign(g, P.rect[0] + P.rect[2] / 2, P.rect[1] + P.rect[3] - 30, 'FERIADO', '#1F3F8F', '#fff'); }
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8;
        for (let r = 0; r < 2; r++) { const y0 = 246 + r * 110; g.beginPath(); g.moveTo(272, y0); g.quadraticCurveTo(385, y0 + 16, 498, y0); g.stroke(); for (let j = 0; j < 18; j++) { const x = 278 + j * 12.4; const t = (x - 272) / 226; const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + 16) + t * t * y0; g.fillStyle = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f472b6'][j % 5]; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x, y + 6); g.fill(); } }
      }
      if (e.tipo === 'gripe') { const [x, y] = [PLACES.hospital.rect[0] + 118, PLACES.hospital.rect[1] + 52]; drawEmoji(g, '🚑', x, y + Math.sin(tt * 4) * 1.5, 14); }
    }
  }
  function drawSelectedMarker(g, tt) {
    if (!selected) return;
    const pe = people.get(selected); if (!pe) return;
    if (pe.hidden && !pe.path) {
      const d = doorOf(pe.place);
      const y = d[1] - 30 - Math.abs(Math.sin(tt * 3)) * 4;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(d[0], d[1] + 1, 8, 3, 0, 0, 7); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.beginPath(); g.ellipse(d[0], d[1] + 1, 11 + Math.sin(tt * 5) * 1.5, 4.5, 0, 0, 7); g.stroke();
      g.fillStyle = '#1F3F8F'; g.beginPath(); g.arc(d[0], y, 13, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(d[0], y + 20); g.closePath(); g.fill();
      g.fillStyle = '#EFEFE7'; g.beginPath(); g.arc(d[0], y, 11, 0, 7); g.fill();
      drawEmoji(g, pe.emoji, d[0], y, 15);
      nameTag(g, perfis[selected]?.nome || '', d[0], y - 22);
    } else {
      nameTag(g, perfis[selected]?.nome || '', pe.x, (pe.drawY ?? pe.y) - 36);
    }
  }
  function nameTag(g, txt, x, y) {
    y = Math.max(y, 10);
    g.font = `800 10.5px ${UI_FONT}`; const w = g.measureText(txt).width + 12;
    x = clamp(x, w / 2 + 2, WW - w / 2 - 2);
    g.fillStyle = '#1F3F8F'; rr(g, x - w / 2, y - 8, w, 16, 8); g.fill();
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 0.5);
  }

  // ------------------------------------------------------------------ entrada (mouse/toque)
  function toWorld(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width * WW, (ev.clientY - r.top) / r.height * WH];
  }
  function pickPerson(p) {
    let best = null, bd = 16;
    for (const pe of people.values()) {
      if (pe.alpha < 0.5) continue;
      const d = Math.hypot(pe.x - p[0], (pe.y - 8) - p[1]);
      if (d < bd) { bd = d; best = pe.id; }
    }
    return best;
  }
  function pickPlace(p) {
    for (const [l, P] of Object.entries(PLACES)) {
      if (P.pillRect) { const [x, y, w, h] = P.pillRect; if (p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h) return l; }
    }
    for (const h of HOUSES) if (p[0] >= h.x && p[0] <= h.x + h.w && p[1] >= h.y && p[1] <= h.y + h.h) return h.id;
    for (const [l, P] of Object.entries(PLACES)) {
      for (const r of [P.rect, P.area]) if (r && p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3]) return l;
    }
    return null;
  }
  function occupantsOf(l) { return [...people.values()].filter((pe) => pe.place === l).map((pe) => pe.id); }

  function resize() {
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    cssW = r.width; cssH = r.width / 1.6;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    k = canvas.width / WW;
    sprites.clear();
    renderStatic();
  }

  function init(el, opts) {
    canvas = el; box = el.parentElement; cb = opts || {};
    ctx = canvas.getContext('2d');
    resize();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 120); }).observe(box);
    canvas.addEventListener('mousemove', (ev) => {
      const p = toWorld(ev);
      const id = pickPerson(p);
      const pl = id ? null : pickPlace(p);
      hoverId = id; hoverPlace = pl;
      canvas.classList.toggle('hover', !!(id || pl));
      cb.onHover && cb.onHover(id, pl, ev);
    });
    canvas.addEventListener('mouseleave', () => { hoverId = null; hoverPlace = null; cb.onHover && cb.onHover(null, null); });
    canvas.addEventListener('click', (ev) => {
      const p = toWorld(ev);
      const id = pickPerson(p);
      if (id) { cb.onSelect && cb.onSelect(id); return; }
      const pl = pickPlace(p);
      cb.onPlace && cb.onPlace(pl, ev);
    });
    requestAnimationFrame(frame);
  }

  function screenPos(id) {
    const pe = people.get(id); if (!pe || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: r.left + pe.x / WW * r.width, y: r.top + (pe.y - 8) / WH * r.height, visible: pe.alpha > 0.5 };
  }
  function placeScreenPos(l) {
    const P = placeOf(l); if (!P || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    const c = P.label || P.ways[0].gate;
    return { x: r.left + c[0] / WW * r.width, y: r.top + c[1] / WH * r.height };
  }

  window.CidadeMapa = {
    init, setSnapshot, onHora, pensando, setWorld,
    select(id) { selected = id; },
    get selected() { return selected; },
    occupantsOf, screenPos, placeScreenPos, isHouse, placeNome: (l) => (isHouse(l) ? `Casa ${parseInt(l.slice(1), 10)}` : PLACES[l]?.nome || l),
    visiveis() { return [...people.values()].filter((p) => p.alpha > 0.9 && !p.path).map((p) => p.id); },
  };
})();

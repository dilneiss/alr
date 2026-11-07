/* Carro Autônomo — mundo, física, sensores e placar (sem DOM; roda no navegador e no Node).
   Unidades: metros, segundos, m/s. Coordenadas do mundo: x para a direita, y para baixo (como o canvas).
   A avenida é um circuito fechado (retângulo de cantos arredondados) percorrido no sentido horário, 2 faixas no mesmo
   sentido. Cada veículo é descrito por (s, d): s = distância ao longo da avenida, d = deslocamento lateral
   (d > 0 = à direita de quem dirige). Faixa 0 = esquerda (externa), faixa 1 = direita (interna).
   Quem decide o comportamento do carro do Jev é o Jev (via app.js → servidor → gateway). Aqui fica só o
   "controlador de baixo nível": executa o comando (acelerar/manter/frear/trocar de faixa) com suavidade, e o
   freio de emergência determinístico (tempo até colisão < 0,7 s), que é contado como intervenção. */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ utilidades
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const dsmooth = (t) => 6 * t * (1 - t);
  const KMH = 3.6;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ pista
  const W = 420, H = 240, R = 55;          // retângulo da linha central da avenida e raio das curvas
  const LANE_D = [-1.75, 1.75];            // centro das faixas (0 = esquerda, 1 = direita)
  const ROAD = 3.5;                        // meia largura do asfalto
  const CURB = 3.9;                        // meio-fio
  const WALK = 7.8;                        // fim da calçada
  const segs = [];
  (function build() {
    let s = 0;
    const line = (x0, y0, h, len) => { segs.push({ k: 'L', s0: s, len, x0, y0, h, c: Math.cos(h), n: Math.sin(h) }); s += len; };
    const arc = (cx, cy, a0) => { const len = (R * Math.PI) / 2; segs.push({ k: 'A', s0: s, len, cx, cy, a0 }); s += len; };
    line(R, 0, 0, W - 2 * R); arc(W - R, R, -Math.PI / 2);
    line(W, R, Math.PI / 2, H - 2 * R); arc(W - R, H - R, 0);
    line(W - R, H, Math.PI, W - 2 * R); arc(R, H - R, Math.PI / 2);
    line(0, H - R, -Math.PI / 2, H - 2 * R); arc(R, R, Math.PI);
  })();
  const LEN = segs[segs.length - 1].s0 + segs[segs.length - 1].len;
  const wrap = (s) => ((s % LEN) + LEN) % LEN;
  const fwd = (from, to) => wrap(to - from);                                     // [0, LEN)
  const rel = (from, to) => { const d = wrap(to - from); return d > LEN / 2 ? d - LEN : d; }; // (-LEN/2, LEN/2]

  function segAt(s) { s = wrap(s); for (let i = segs.length - 1; i >= 0; i--) if (s >= segs[i].s0) return segs[i]; return segs[0]; }
  function pose(s, d) {
    d = d || 0;
    const g = segAt(s), t = wrap(s) - g.s0;
    if (g.k === 'L') return { x: g.x0 + g.c * t - g.n * d, y: g.y0 + g.n * t + g.c * d, h: g.h };
    const phi = g.a0 + t / R, r = R - d;
    return { x: g.cx + r * Math.cos(phi), y: g.cy + r * Math.sin(phi), h: phi + Math.PI / 2 };
  }
  function project(x, y) {
    let best = null;
    for (const g of segs) {
      let t, d;
      if (g.k === 'L') {
        const dx = x - g.x0, dy = y - g.y0; t = dx * g.c + dy * g.n; d = -dx * g.n + dy * g.c;
        if (t < -0.01 || t > g.len + 0.01) continue;
      } else {
        const dx = x - g.cx, dy = y - g.cy; let u = Math.atan2(dy, dx) - g.a0; u = ((u % TAU) + TAU) % TAU;
        if (u > Math.PI / 2 + 1e-4) continue; t = u * R; d = R - Math.hypot(dx, dy);
      }
      if (!best || Math.abs(d) < Math.abs(best.d)) best = { s: wrap(g.s0 + t), d };
    }
    return best;
  }
  const sTop = (x) => x - R;
  const sBot = (x) => segs[4].s0 + (W - R - x);

  // ------------------------------------------------------------------ elementos fixos do mundo
  const X_RUA = 230;                     // rua transversal (vertical) que cruza a avenida em cima e embaixo
  const LIMITE = 50;                     // km/h
  const LIGHT_DEFS = [
    // off: fase inicial (s). O sinal 1 foi calibrado para ficar amarelo quando o carro se aproxima na largada.
    { nome: 'Sinal 1', si: sTop(X_RUA), g: 12, y: 3, r: 9, off: 2.5 },
    { nome: 'Sinal 2', si: sBot(X_RUA), g: 13, y: 3, r: 12, off: 11 },
  ];
  const BOX = 4.8;                       // meia largura da rua transversal (caixa do cruzamento)
  const CW_W = 4;                        // largura da faixa de pedestres (ao longo de s)
  const LIGHTS_BASE = LIGHT_DEFS.map((l, i) => ({ id: i, ...l, stop: l.si - BOX - CW_W - 2.2, cw: l.si - BOX - 1 - CW_W / 2 }));
  const CROSSWALKS = [
    { id: 0, s: LIGHTS_BASE[0].cw, light: 0 },
    { id: 1, s: LIGHTS_BASE[1].cw, light: 1 },
    { id: 2, s: 470, light: null },
    { id: 3, s: 1075, light: null },
  ];
  const ZONES = [{ s0: 1030, s1: 1124, lim: 30, nome: 'zona escolar' }];
  const ROADWORK = { s0: 860, s1: 884, lane: 1 };
  const ROADWORK_S = (ROADWORK.s0 + ROADWORK.s1) / 2, ROADWORK_LEN = ROADWORK.s1 - ROADWORK.s0;

  function limitAt(s) { for (const z of ZONES) if (fwd(z.s0, s) < z.s1 - z.s0) return z.lim; return LIMITE; }
  function nextLimit(s, range) {
    let best = null;
    for (const z of ZONES) {
      const a = fwd(s, z.s0), b = fwd(s, z.s1);
      if (a < range && limitAt(s) !== z.lim && (!best || a < best.d)) best = { lim: z.lim, d: a };
      if (b < range && limitAt(s) === z.lim && (!best || b < best.d)) best = { lim: LIMITE, d: b };
    }
    return best;
  }

  const CAR_KINDS = {
    sedan: { len: 4.5, wid: 1.85 }, hatch: { len: 4.0, wid: 1.75 }, taxi: { len: 4.5, wid: 1.85 },
    van: { len: 5.3, wid: 2.0 }, bus: { len: 11.5, wid: 2.5 }, pickup: { len: 5.2, wid: 1.95 }, suv: { len: 4.8, wid: 1.95 },
  };
  const NPC_DEFS = [
    { s: 128, lane: 0, v0: 33, kind: 'sedan', color: '#3b82f6' },
    { s: 318, lane: 1, v0: 37, kind: 'taxi', color: '#facc15' },
    { s: 505, lane: 1, v0: 31, kind: 'van', color: '#dfe3ea' },
    { s: 640, lane: 0, v0: 41, kind: 'suv', color: '#ef4444' },
    { s: 790, lane: 1, v0: 34, kind: 'hatch', color: '#10b981' },
    { s: 955, lane: 1, v0: 28, kind: 'bus', color: '#0ea5e9' },
    { s: 1110, lane: 1, v0: 30, kind: 'sedan', color: '#a855f7' },
  ];
  const PED_COLORS = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#e5e7eb', '#22d3ee'];

  // ------------------------------------------------------------------ parâmetros do controlador do carro do Jev
  const EGO = { len: 4.6, wid: 1.9 };
  const A_ACC = 2.5, V_MAX = 25;          // aceleração (m/s²) e velocidade máxima física (m/s = 90 km/h)
  const EBRAKE = 9;                        // freio de emergência (m/s²)
  const TTC_EMERG = 0.7, TTC_QUASE = 1.3;  // s
  const LINK_TIMEOUT = 1.6;                // s sem decisão nova → freia por segurança (falha de comunicação)

  class Sim {
    constructor(seed) { this.reset(seed == null ? 7 : seed); }

    reset(seed) {
      this.seed = seed;
      this.rnd = rng(seed);
      this.t = 0;
      this.nextId = 1;
      this.lights = LIGHTS_BASE.map((l) => ({ ...l, cor: 'verde', ha: 0, fase: 0 }));
      this.ego = {
        id: 0, kind: 'ego', s: 8, d: LANE_D[1], lane: 1, v: 0, a: 0, len: EGO.len, wid: EGO.wid, lc: null, yaw: 0,
        cmd: null, cmdAge: 0, emerg: false, emergT: 0, odo: 0, aDes: 0, aReq: 0, target: null, link: 'ok',
      };
      this.npcs = NPC_DEFS.map((n) => this._mkNpc(n.s, n.lane, n.v0, n.kind, n.color));
      this.peds = [];
      this.cones = [{ id: this.nextId++, s: ROADWORK_S, lane: ROADWORK.lane, d: LANE_D[ROADWORK.lane], len: ROADWORK_LEN, wid: 3.1, fixed: true, kind: 'obras' }];
      this.cross = [];
      this.fx = [];
      this.events = [];
      this.stats = { dist: 0, sinais: 0, paradasVermelho: 0, avancos: 0, colisoes: 0, quase: 0, emergencias: 0, vetos: 0, ultrapassagens: 0, conesDesviados: 0, pedestres: 0, trocas: 0, decisoes: 0 };
      this._pedTimer = 5;
      this._crossTimer = [0, 0];
      this._flags = new Map();
      this._prevRel = new Map();
      this._prevFront = wrap(this.ego.s + EGO.len / 2);
      this._inZone = limitAt(this.ego.s) !== LIMITE;
      this._updateLights();
    }

    _mkNpc(s, lane, v0kmh, kind, color, extra) {
      const k = CAR_KINDS[kind] || CAR_KINDS.sedan;
      return { id: this.nextId++, kind, color, s: wrap(s), d: LANE_D[lane], lane, pref: lane, v: (v0kmh / KMH) * 0.9, a: 0, v0: v0kmh / KMH, len: k.len, wid: k.wid, lc: null, brake: false, born: this.t, ...(extra || {}) };
    }

    emit(kind, icon, text, extra) { this.events.push({ t: this.t, kind, icon, text, ...(extra || {}) }); if (this.events.length > 200) this.events.shift(); }
    once(key, ttl) { const last = this._flags.get(key); if (last != null && this.t - last < ttl) return false; this._flags.set(key, this.t); return true; }

    // ---------------------------------------------------------------- semáforos
    _updateLights() {
      for (const l of this.lights) {
        const cyc = l.g + l.y + l.r, tc = (((this.t + l.off) % cyc) + cyc) % cyc;
        const fase = Math.floor((this.t + l.off) / cyc);
        const prev = l.cor;
        if (tc < l.g) { l.cor = 'verde'; l.ha = tc; l.resta = l.g - tc; }
        else if (tc < l.g + l.y) { l.cor = 'amarelo'; l.ha = tc - l.g; l.resta = l.g + l.y - tc; }
        else { l.cor = 'vermelho'; l.ha = tc - l.g - l.y; l.resta = cyc - tc; }
        l.fase = fase;
        // cruzamento: verde para a rua transversal só com a avenida no vermelho (1 s de "todos vermelhos" em cada ponta)
        l.cruz = l.cor === 'vermelho' && l.ha > 1.2 && l.resta > 3.5 ? 'verde' : 'vermelho';
        if (prev !== l.cor && l.cor === 'vermelho') this._onRed(l);
      }
    }
    _onRed(l) {
      // pedestres aproveitam o vermelho para atravessar (deixa a parada no sinal mais viva)
      const cw = CROSSWALKS[l.id];
      const dEgo = rel(this.ego.s, cw.s);
      if (dEgo > -20 && dEgo < 170) { const n = 1 + (this.rnd() < 0.6 ? 1 : 0); for (let i = 0; i < n; i++) this._spawnPed(cw, { delay: 1.3 + i * 0.9 + this.rnd() * 0.6 }); }
    }
    lightFor(s) { // próximo sinal cuja linha de parada está à frente de s (até 130 m)
      let best = null, bd = 1e9;
      for (const l of this.lights) { const d = fwd(s, l.stop); if (d < 130 && d < bd) { bd = d; best = l; } }
      return best ? { l: best, d: bd } : null;
    }

    // ---------------------------------------------------------------- pedestres
    _spawnPed(cw, o) {
      o = o || {};
      if (this.peds.length >= 12) return null;
      const side = o.side || (this.rnd() < 0.5 ? 1 : -1);
      const s0 = cw ? cw.s + (this.rnd() - 0.5) * 2.4 : o.s;
      const p = {
        id: this.nextId++, cw: cw ? cw.id : null, s: s0, s0, d: side * (CURB + 1.4), dir: -side, st: 'wait',
        spd: 1.3 + this.rnd() * 0.35, color: PED_COLORS[Math.floor(this.rnd() * PED_COLORS.length)], hair: this.rnd() < 0.5 ? '#2b1d14' : '#0f0f12',
        t0: this.t, delay: o.delay || 0, forced: !!o.forced, walk: this.rnd() * 10, fade: 1, away: 0,
      };
      this.peds.push(p);
      return p;
    }
    pedBlocks(p, laneD) {
      // quem espera num semáforo aguarda o sinal dele; quem espera numa faixa sem semáforo tem preferência
      if (p.st === 'wait') return p.wantsCross !== false && (p.cw == null || CROSSWALKS[p.cw].light == null) && this.t - p.t0 >= p.delay;
      if (p.st !== 'cross') return false;
      return p.dir < 0 ? p.d > laneD - 1.95 : p.d < laneD + 1.95;
    }
    crosswalkBlock(front, laneD, range) { // travessia bloqueada mais próxima à frente (faixas + quem atravessa fora da faixa)
      let best = null;
      const consider = (cs, width, peds, cw) => {
        const dist = fwd(front, cs - width / 2);
        if (dist > range && dist < LEN - 3) return;
        const dd = dist > LEN - 3 ? dist - LEN : dist; // já em cima da travessia
        if (dd < -width) return;
        let st = null;
        for (const p of peds) if (this.pedBlocks(p, laneD)) { if (p.st === 'cross') { st = 'a'; break; } if (dd < 65) st = st || 'e'; }
        if (st && (!best || dd < best.d)) best = { cw, d: dd, st };
      };
      for (const cw of CROSSWALKS) consider(cw.s, CW_W, this.peds.filter((p) => p.cw === cw.id), cw);
      for (const p of this.peds) if (p.cw == null) consider(p.s0, 2, [p], { id: 'p' + p.id, s: p.s0, jay: true });
      return best;
    }
    _approachTimes(cw) { // menor tempo de chegada de um veículo à faixa (s) e se há veículo parado perto
      let tmin = 1e9, stoppedNear = false;
      for (const v of this._vehicles()) {
        const dist = fwd(v.s + v.len / 2, cw.s - CW_W / 2);
        if (dist > 90) continue;
        if (v.v < 0.6) { if (dist < 30) stoppedNear = true; continue; }
        tmin = Math.min(tmin, dist / v.v);
      }
      return { tmin, stoppedNear };
    }
    _updatePeds(dt) {
      this._pedTimer -= dt;
      if (this._pedTimer <= 0) {
        this._pedTimer = 9 + this.rnd() * 9;
        const zebras = CROSSWALKS.filter((c) => c.light == null);
        const cw = zebras[Math.floor(this.rnd() * zebras.length)];
        if (!this.peds.some((p) => p.cw === cw.id && p.st !== 'gone')) this._spawnPed(cw);
      }
      for (const p of this.peds) {
        p.walk += dt * (p.st === 'cross' || p.st === 'away' ? p.spd * 4.2 : 0);
        const cw = p.cw == null ? { s: p.s0, light: null } : CROSSWALKS[p.cw];
        if (p.st === 'wait') {
          if (this.t - p.t0 < p.delay) continue;
          const waited = this.t - p.t0;
          let go = false;
          if (cw.light != null) {
            const l = this.lights[cw.light];
            go = l.cor === 'vermelho' && l.ha > 0.8 && l.resta > 6.2;
            if (go) p.spd = Math.max(p.spd, 1.6 + this.rnd() * 0.3);
          } else if (p.forced) {
            const dEgo = fwd(this.ego.s + this.ego.len / 2, cw.s - CW_W / 2);
            go = waited > 1.2 && (dEgo < 70 || dEgo > LEN - 5 || waited > 30);
          } else {
            const { tmin, stoppedNear } = this._approachTimes(cw);
            go = waited > 0.8 && (tmin > 5 || (stoppedNear && tmin > 2.5));
          }
          if (!go && waited > 28 && !p.forced) { p.st = 'away'; p.wantsCross = false; p.away = 0; }
          if (go) { p.st = 'cross'; p.tCross = this.t; }
        } else if (p.st === 'cross') {
          p.d += p.dir * p.spd * dt;
          if (p.dir < 0 ? p.d < -(CURB + 1.2) : p.d > CURB + 1.2) {
            p.st = 'away'; p.away = 0;
            if (p.forced || cw.light == null || p.cw == null) this.stats.pedestres++;
          }
        } else if (p.st === 'away') {
          p.away += dt; p.s += p.spd * dt * (p.id % 2 ? 1 : -1); p.fade = clamp(1 - (p.away - 2.2) / 1.2, 0, 1);
          if (p.away > 3.4) p.st = 'gone';
        }
      }
      this.peds = this.peds.filter((p) => p.st !== 'gone');
    }

    // ---------------------------------------------------------------- veículos
    _vehicles() { return [this.ego, ...this.npcs]; }
    _dAt(v, sObj) { // posição lateral planejada do veículo quando ele estiver em sObj
      if (!v.lc) return v.d;
      const u = clamp(fwd(v.lc.s0, sObj) / v.lc.len, 0, 1);
      return lerp(LANE_D[v.lc.from], LANE_D[v.lc.to], smooth(u));
    }
    _laneOf(v) { return v.lc ? v.lc.to : v.lane; }
    _occupies(v, lane) { return Math.abs(v.d - LANE_D[lane]) < 1.7 || (v.lc && (v.lc.to === lane || v.lc.from === lane)); }

    // Checagem de segurança para trocar de faixa (a mesma usada nos sensores para dizer se "dá para entrar").
    gate(v, target) {
      const lcLen = clamp(v.v * 2.1, 14, 32);
      for (const o of this._vehicles()) {
        if (o === v || !this._occupies(o, target)) continue;
        const ds = rel(v.s, o.s), half = (o.len + v.len) / 2;
        if (ds >= 0) { const gap = ds - half; if (gap < 6 + Math.max(0, v.v - o.v) * 2.2) return false; }
        else { const gap = -ds - half; if (gap < 7 + Math.max(0, o.v - v.v) * 2.0) return false; }
      }
      for (const c of this.cones) {
        if (Math.abs(c.d - LANE_D[target]) > 1.6) continue;
        const ds = rel(v.s, c.s) - (c.len + v.len) / 2;
        if (ds > -c.len - v.len && ds < lcLen + Math.max(10, v.v * 3)) return false;
      }
      return true;
    }
    _beside(v, lane) {
      for (const o of this._vehicles()) {
        if (o === v || !this._occupies(o, lane)) continue;
        if (Math.abs(rel(v.s, o.s)) < (o.len + v.len) / 2 + 1.5) return true;
      }
      return false;
    }
    _startLc(v, to) {
      v.lc = { from: v.lane, to, s0: v.s, len: clamp(v.v * 2.1, v.v < 3 ? 11 : 14, 32) };
    }

    // Líder (o que está à frente no caminho) para o modelo de motorista inteligente (IDM) dos carros comuns.
    _leaderNpc(n) {
      let gap = 1e9, vl = 0, what = null;
      const front = n.s + n.len / 2;
      for (const o of this._vehicles()) {
        if (o === n) continue;
        const ds = rel(n.s, o.s);
        if (ds <= 0 || ds > 150) continue;
        const dn = this._dAt(n, o.s);
        if (Math.abs(o.d - dn) > (o.wid + n.wid) / 2 + 0.35) continue;
        const g = ds - (o.len + n.len) / 2;
        if (g < gap) { gap = g; vl = o.v; what = o; }
      }
      for (const c of this.cones) {
        const ds = rel(n.s, c.s);
        if (ds <= 0 || ds > 150) continue;
        if (Math.abs(c.d - this._dAt(n, c.s)) > (c.wid + n.wid) / 2 + 0.1) continue;
        const g = ds - (c.len + n.len) / 2 - 1.5;
        if (g < gap) { gap = g; vl = 0; what = c; }
      }
      const lf = this.lightFor(front);
      if (lf && lf.l.cor !== 'verde') {
        const canStop = n.v * n.v / (2 * Math.max(0.5, lf.d)) < 3.2;
        if (lf.l.cor === 'vermelho' || canStop) { const g = lf.d + 1.2; if (g < gap) { gap = g; vl = 0; what = 'sinal'; } }
      }
      const cb = this.crosswalkBlock(front, this._dAt(n, n.s + 20), 90);
      if (cb) {
        const canStop = cb.st === 'a' || n.v * n.v / (2 * Math.max(0.5, cb.d)) < 2.6;
        if (canStop) { const g = cb.d + 0.6; if (g < gap) { gap = g; vl = 0; what = 'pedestre'; } }
      }
      return { gap, vl, what };
    }
    _updateNpcs(dt) {
      const T = 1.35, A = 1.5, B = 2.2, S0 = 2.3;
      for (const n of this.npcs) {
        const { gap, vl } = this._leaderNpc(n);
        const dv = n.v - vl;
        const sStar = S0 + Math.max(0, n.v * T + (n.v * dv) / (2 * Math.sqrt(A * B)));
        let acc = A * (1 - Math.pow(n.v / n.v0, 4) - Math.pow(sStar / Math.max(0.2, gap), 2));
        n.acc = clamp(acc, -9, A);
        // desvio de obstáculo parado na própria faixa
        if (!n.lc) {
          const lane = n.lane;
          let blocked = false;
          for (const c of this.cones) { const ds = rel(n.s, c.s); if (ds > 0 && ds < 60 && Math.abs(c.d - LANE_D[lane]) < 1.6) blocked = true; }
          const other = 1 - lane;
          if (blocked && this.gate(n, other)) this._startLc(n, other);
          else if (!blocked && lane !== n.pref && this.t - (n.lcEnd || 0) > 4 && this.gate(n, n.pref)) {
            let clear = true; for (const c of this.cones) { const ds = rel(n.s, c.s); if (ds > -20 && ds < 70 && Math.abs(c.d - LANE_D[n.pref]) < 1.6) clear = false; }
            if (clear) this._startLc(n, n.pref);
          }
        }
        if (n.lc && n.v < 1.2 && n.acc < 0.8) n.acc = Math.max(n.acc, 0.8); // precisa andar para completar a troca
      }
      for (const n of this.npcs) {
        n.a = n.acc;
        n.v = Math.max(0, n.v + n.a * dt);
        n.s = wrap(n.s + n.v * dt);
        n.brake = n.a < -0.6 || n.v < 0.3;
        this._advanceLc(n);
      }
      // carros criados pelo botão "carro lento" somem quando ficam bem para trás
      this.npcs = this.npcs.filter((n) => !(n.slow && rel(this.ego.s, n.s) < -260) && !(n.slow && this.t - n.born > 150));
    }
    _advanceLc(v) {
      if (!v.lc) { v.yaw = 0; return; }
      const u = clamp(fwd(v.lc.s0, v.s) / v.lc.len, 0, 1.0001);
      const dFrom = LANE_D[v.lc.from], dTo = LANE_D[v.lc.to];
      v.d = lerp(dFrom, dTo, smooth(Math.min(1, u)));
      v.yaw = Math.atan(((dTo - dFrom) * dsmooth(Math.min(1, u))) / v.lc.len);
      if (u >= 1) { v.lane = v.lc.to; v.d = dTo; v.lc = null; v.yaw = 0; v.lcEnd = this.t; }
    }

    // ---------------------------------------------------------------- tráfego da rua transversal (cenário)
    _updateCross(dt) {
      for (let i = 0; i < this.lights.length; i++) {
        const l = this.lights[i];
        const near = Math.abs(rel(this.ego.s, l.si)) < 190;
        this._crossTimer[i] -= dt;
        if (near && l.cruz === 'verde' && this._crossTimer[i] <= 0 && this.cross.filter((c) => c.li === i).length < 6) {
          this._crossTimer[i] = 1.6 + this.rnd() * 2.2;
          const dir = this.rnd() < 0.5 ? 1 : -1; // +1 = descendo (y cresce)
          const kinds = ['sedan', 'hatch', 'suv', 'taxi', 'van'];
          const kind = kinds[Math.floor(this.rnd() * kinds.length)];
          const k = CAR_KINDS[kind];
          const colors = ['#94a3b8', '#f97316', '#38bdf8', '#e11d48', '#84cc16', '#f5f5f4', '#1e293b', '#facc15'];
          const y0 = pose(l.si, 0).y, x = X_RUA - dir * 2.3;
          this.cross.push({ id: this.nextId++, li: i, kind, color: kind === 'taxi' ? '#facc15' : colors[Math.floor(this.rnd() * colors.length)], len: k.len, wid: k.wid, dir, y: y0 - dir * 70, x, v: 9, a: 0, brake: false, y0, go: false, sc: l.si + (i === 0 ? x - X_RUA : X_RUA - x) });
        }
      }
      for (const c of this.cross) {
        const l = this.lights[c.li];
        const rel0 = (c.y - c.y0) * c.dir; // negativo antes do centro da avenida
        const stopAt = -(ROAD + 3.2) - c.len / 2; // antes da faixa de pedestres da transversal
        const busy = this._boxBusy(c.li);
        if (!c.passed && rel0 > stopAt - 0.05 && l.cruz === 'verde' && !busy) c.passed = true;
        let acc;
        if (!c.passed && (l.cruz !== 'verde' || busy)) {
          const dist = stopAt - rel0;
          if (dist < 0.05) acc = -8;
          else { const need = (c.v * c.v) / (2 * dist); acc = need > 0.8 ? -Math.min(8, need * 1.15) : Math.min(2.6, (Math.sqrt(2 * 1.2 * dist) - c.v) * 2.2); }
        } else acc = clamp(((rel0 > -ROAD - 3 && rel0 < ROAD + 3 ? 11 : 9) - c.v) * 2.2, -6, 2.6);
        for (const o of this.cross) if (o !== c && o.li === c.li && o.dir === c.dir) {
          const g = (o.y - c.y) * c.dir - (o.len + c.len) / 2;
          if (g > 0 && g < 14) acc = Math.min(acc, clamp((Math.max(0, (g - 2.5) * 1.2) - c.v) * 2.2, -8, 2.6));
        }
        c.a = acc; c.v = Math.max(0, c.v + acc * dt); c.y += c.dir * c.v * dt; c.brake = acc < -0.5 || c.v < 0.3;
        c.dAv = (c.y - c.y0) * (c.li === 0 ? 1 : -1); // posição lateral na avenida (mesmo referencial d)
      }
      this.cross = this.cross.filter((c) => (c.y - c.y0) * c.dir < 80);
    }
    _boxBusy(li) {
      const l = this.lights[li];
      for (const v of this._vehicles()) if (Math.abs(rel(v.s, l.si)) < BOX + v.len / 2 + 1.5) return true;
      return false;
    }

    // ---------------------------------------------------------------- carro do Jev
    // Alvos à frente no caminho planejado → desaceleração necessária para parar/igualar velocidade.
    _targets() {
      const e = this.ego, front = e.s + e.len / 2, out = [];
      const lf = this.lightFor(front);
      if (lf && lf.l.cor !== 'verde') out.push({ dist: lf.d - 0.8, v: 0, what: 'sinal' });
      const laneD = this._dAt(e, e.s + 25);
      const cb = this.crosswalkBlock(front, laneD, 120);
      if (cb) out.push({ dist: cb.d - 1.5, v: 0, what: 'pedestre' });
      for (const c of this.cones) {
        const ds = rel(e.s, c.s); if (ds <= 0 || ds > 130) continue;
        if (Math.abs(c.d - this._dAt(e, c.s)) > (c.wid + e.wid) / 2 + 0.1) continue;
        out.push({ dist: ds - (c.len + e.len) / 2 - 8, v: 0, what: 'obstaculo' });
      }
      for (const o of this.npcs) {
        const ds = rel(e.s, o.s); if (ds <= 0 || ds > 130) continue;
        if (Math.abs(o.d - this._dAt(e, o.s)) > (o.wid + e.wid) / 2 + 0.3) continue;
        const gap = ds - (o.len + e.len) / 2;
        out.push({ dist: gap - (3 + 0.9 * o.v), v: o.v, what: 'carro' });
      }
      const lim = limitAt(e.s) / KMH, nl = nextLimit(e.s, 130);
      if (e.v > lim + 0.4) out.push({ dist: 14, v: lim, what: 'limite' });
      if (nl && nl.lim / KMH < e.v) out.push({ dist: nl.d, v: nl.lim / KMH, what: 'limite' });
      return out;
    }
    _aReq() {
      const e = this.ego; let best = 0, tgt = null;
      for (const t of this._targets()) {
        if (e.v <= t.v + 0.05) continue;
        const need = t.dist <= 0.25 ? 6 : (e.v * e.v - t.v * t.v) / (2 * t.dist);
        if (need > best) { best = need; tgt = t; }
      }
      return { a: best, tgt };
    }
    // Perigos no caminho planejado: tempo até colisão (TTC) — usado pelo freio de emergência e pelo contador de quase-acidentes.
    _hazards() {
      const e = this.ego, hz = [];
      for (const o of this.npcs) {
        const ds = rel(e.s, o.s); if (ds <= 0 || ds > 90) continue;
        if (Math.abs(o.d - this._dAt(e, o.s)) > (o.wid + e.wid) / 2 + 0.15) continue;
        const gap = ds - (o.len + e.len) / 2, cl = e.v - o.v;
        hz.push({ key: 'v' + o.id, what: 'carro', gap, ttc: cl > 0.05 ? gap / cl : 1e9, obj: o });
      }
      for (const c of this.cones) {
        const ds = rel(e.s, c.s); if (ds <= 0 || ds > 90) continue;
        if (Math.abs(c.d - this._dAt(e, c.s)) > (c.wid + e.wid) / 2 + 0.05) continue;
        const gap = ds - (c.len + e.len) / 2;
        hz.push({ key: 'c' + c.id, what: c.fixed ? 'obras' : 'cone', gap, ttc: e.v > 0.05 ? gap / e.v : 1e9, obj: c });
      }
      for (const p of this.peds) {
        if (p.st !== 'cross') continue;
        const ds = rel(e.s, p.s); if (ds <= 0 || ds > 90) continue;
        const dPath = this._dAt(e, p.s);
        const toward = (dPath - p.d) * p.dir > 0; // indo em direção ao nosso caminho
        if (Math.abs(p.d - dPath) > e.wid / 2 + (toward ? 1.4 : 0.5)) continue;
        const gap = ds - e.len / 2 - 0.4;
        hz.push({ key: 'p' + p.id, what: 'pedestre', gap, ttc: e.v > 0.05 ? gap / e.v : 1e9, obj: p });
      }
      for (const c of this.cross) { // carros da rua transversal (só cruzam o caminho se o carro do Jev invadir o cruzamento)
        if (c.dAv == null) continue;
        const ds = rel(e.s, c.sc); if (ds <= 0 || ds > 60) continue;
        if (Math.abs(c.dAv - this._dAt(e, c.sc)) > (c.len + e.wid) / 2 + 0.2) continue;
        const gap = ds - (e.len + c.wid) / 2;
        hz.push({ key: 'x' + c.id, what: 'carro', gap, ttc: e.v > 0.05 ? gap / e.v : 1e9, obj: c });
      }
      return hz;
    }

    applyDecision(dec) {
      const e = this.ego;
      this.stats.decisoes++;
      e.cmd = { acao: dec.acao, motivo: dec.motivo, perigo: dec.perigo, t: this.t };
      e.cmdAge = 0;
      if (dec.acao === 'mudar_para_esquerda' || dec.acao === 'mudar_para_direita') {
        const to = dec.acao === 'mudar_para_esquerda' ? 0 : 1;
        if (e.lc) return { ok: false, why: 'manobra em andamento' };
        if (e.lane === to) return { ok: false, why: 'já está nessa faixa' };
        if (!this.gate(e, to)) {
          this.stats.vetos++;
          this.emit('veto', '⛔', `Troca de faixa vetada pela checagem de segurança (faixa ${to === 0 ? 'da esquerda' : 'da direita'} ocupada)`);
          return { ok: false, why: 'vetada' };
        }
        const bloq = this._laneBlockedAhead(e.lane);
        this._startLc(e, to);
        e.lc.why = bloq === 'obstaculo' ? 'desviar' : bloq === 'carro' ? 'ultrapassar' : to === 1 ? 'voltar' : null;
        this.stats.trocas++;
        const lado = to === 0 ? 'esquerda' : 'direita';
        if (bloq === 'obstaculo') this.emit('troca', '↔️', `Mudou para a faixa da ${lado} para desviar do obstáculo`);
        else if (bloq === 'carro') this.emit('troca', '↔️', `Mudou para a faixa da ${lado} para ultrapassar o carro lento`);
        else if (to === 1) this.emit('troca', '↪️', 'Voltou para a faixa da direita (ultrapassagem concluída)');
        else this.emit('troca', '↔️', `Mudou para a faixa da ${lado}`);
      }
      return { ok: true };
    }

    _laneBlockedAhead(lane) { // o que bloqueia a faixa à frente (para descrever a manobra no diário)
      const e = this.ego;
      for (const c of this.cones) { const ds = rel(e.s, c.s); if (ds > 0 && ds < 80 && Math.abs(c.d - LANE_D[lane]) < 1.6) return 'obstaculo'; }
      for (const o of this.npcs) { const ds = rel(e.s, o.s); if (ds > 0 && ds < 70 && this._occupies(o, lane) && (o.v < e.v - 1.2 || o.v < limitAt(e.s) / KMH - 3.3)) return 'carro'; }
      return null;
    }

    _updateEgo(dt) {
      const e = this.ego;
      const c = e.cmd;
      const { a: aReq, tgt } = this._aReq();
      e.aReq = aReq; e.target = tgt;
      let aDes = 0;
      if (!c) aDes = e.v > 0.1 ? -1.5 : 0;
      else if (e.link === 'lost') aDes = -2.2;
      else {
        switch (c.acao) {
          case 'acelerar': aDes = A_ACC * (1 - Math.pow(e.v / V_MAX, 4)); break;
          case 'manter': aDes = 0; break;
          case 'frear_suave':
            // o Jev mandou reduzir: o controlador calcula a curva — alivia (freio motor) enquanto o alvo está longe e
            // segue a desaceleração exata para parar/igualar velocidade no ponto certo quando ela passa de 1,2 m/s²
            if (!tgt) aDes = -1.5;
            else if (tgt.dist < 3 && tgt.v === 0) aDes = -Math.min(3.6, Math.max(aReq, 0.8));
            else aDes = -(aReq < 1.2 ? 0.4 : Math.min(3.6, aReq));
            break;
          case 'frear_forte': aDes = -clamp(1.3 * aReq, 4, 8); break;
          default: aDes = 0; // trocas de faixa: mantém a velocidade durante a manobra
        }
      }
      if (e.lc && e.v < 2 && !e.emerg && (!c || c.acao !== 'frear_forte')) aDes = Math.max(aDes, 1.1);
      // freio de emergência (rede de segurança determinística)
      const hz = this._hazards();
      let minTtc = 1e9, worst = null;
      for (const h of hz) { if (h.gap < 1.2 && e.v > 0.3) h.ttc = Math.min(h.ttc, 0.1); if (h.ttc < minTtc) { minTtc = h.ttc; worst = h; } }
      e.ttc = minTtc; e.hazard = worst;
      if (!e.emerg && minTtc < TTC_EMERG && e.v > 0.5) {
        e.emerg = true; e.emergT = this.t;
        this.stats.emergencias++;
        this.emit('emergencia', '🚨', `Freio de emergência acionado (${worst.what} a ${worst.gap.toFixed(1).replace('.', ',')} m, colisão em ${minTtc.toFixed(1).replace('.', ',')} s)`);
      }
      if (e.emerg && (minTtc > 1.8 || e.v < 0.15) && this.t - e.emergT > 0.4) e.emerg = false;
      if (worst && minTtc < TTC_QUASE && e.v > 1 && this.once('quase:' + worst.key, 8)) {
        this.stats.quase++;
        if (!e.emerg) this.emit('quase', '😬', `Quase-acidente: ${worst.what} a ${Math.max(0, worst.gap).toFixed(1).replace('.', ',')} m (colisão em ${minTtc.toFixed(1).replace('.', ',')} s)`);
      }
      if (e.emerg) aDes = -EBRAKE;
      e.aDes = aDes;
      // resposta do "pedal": frenagem rápida, aceleração progressiva
      const da = aDes - e.a;
      e.a += da < 0 ? Math.max(da, -30 * dt) : Math.min(da, 7 * dt);
      e.v += e.a * dt;
      if (e.v <= 0) { e.v = 0; if (e.a < 0) e.a = 0; }
      if (e.v > V_MAX) e.v = V_MAX;
      e.s = wrap(e.s + e.v * dt);
      e.odo += e.v * dt;
      this.stats.dist = e.odo;
      this._advanceLc(e);
      e.brake = e.a < -0.5 || (e.v < 0.2 && c && c.acao !== 'acelerar');
      e.cmdAge += dt;
    }

    // ---------------------------------------------------------------- colisões e eventos
    _collisions() {
      const e = this.ego;
      for (const o of this.npcs) {
        const ds = Math.abs(rel(e.s, o.s)), dd = Math.abs(e.d - o.d);
        if (ds < (e.len + o.len) / 2 - 0.1 && dd < (e.wid + o.wid) / 2 - 0.1) {
          if (this.once('col:v' + o.id, 5)) { this.stats.colisoes++; this.emit('colisao', '💥', 'Colisão com um carro'); this.fx.push({ k: 'boom', s: (e.s + (rel(e.s, o.s) / 2)), d: (e.d + o.d) / 2, t: this.t }); }
          const back = (e.len + o.len) / 2 + 0.3;
          if (rel(e.s, o.s) > 0) { e.s = wrap(o.s - back); } else { o.s = wrap(e.s - back); }
          e.v = Math.min(e.v, o.v); o.v *= 0.5;
        }
      }
      for (const c of this.cross) {
        if (c.dAv == null) continue;
        if (Math.abs(rel(e.s, c.sc)) < (e.len + c.wid) / 2 - 0.1 && Math.abs(c.dAv - e.d) < (c.len + e.wid) / 2 - 0.1) {
          if (this.once('col:x' + c.id, 5)) { this.stats.colisoes++; this.emit('colisao', '💥', 'Colisão com um carro no cruzamento'); }
          e.v = 0; c.v = 0;
        }
      }
      this.cones = this.cones.filter((c) => {
        const ds = Math.abs(rel(e.s, c.s)), dd = Math.abs(e.d - c.d);
        if (ds < (e.len + c.len) / 2 - 0.05 && dd < (e.wid + c.wid) / 2 - 0.1) {
          if (this.once('col:c' + c.id, 5)) { this.stats.colisoes++; this.emit('colisao', '💥', c.fixed ? 'Colisão com as obras' : 'Atropelou o cone'); this.fx.push({ k: 'cones', s: c.s, d: c.d, t: this.t }); }
          if (c.fixed) { e.s = wrap(c.s - (e.len + c.len) / 2 - 0.3); e.v = 0; return true; }
          return false;
        }
        return true;
      });
      for (const p of this.peds) {
        if (p.st !== 'cross') continue;
        if (Math.abs(rel(e.s, p.s)) < e.len / 2 + 0.3 && Math.abs(e.d - p.d) < e.wid / 2 + 0.3) {
          if (this.once('col:p' + p.id, 8)) { this.stats.colisoes++; this.emit('colisao', '💥', 'Atingiu um pedestre'); }
          e.v = 0; p.st = 'away'; p.away = 0;
        }
      }
    }
    _events() {
      const e = this.ego, front = wrap(e.s + e.len / 2), prev = this._prevFront;
      const moved = fwd(prev, front);
      // passagem pela linha de parada dos semáforos
      for (const l of this.lights) {
        if (moved < 30 && fwd(prev, l.stop) <= moved && fwd(prev, l.stop) > 0) {
          if (l.cor === 'vermelho') { this.stats.avancos++; this.emit('avanco', '⚠️', `Avançou o ${l.nome.toLowerCase()} no vermelho`); }
          else { this.stats.sinais++; this.emit('sinal', l.cor === 'verde' ? '🟢' : '🟡', `Passou no ${l.nome.toLowerCase()} com ${l.cor === 'verde' ? 'verde' : 'amarelo (sem tempo para parar)'}`); }
        }
      }
      this._prevFront = front;
      // parada no vermelho
      if (e.v < 0.3) {
        const lf = this.lightFor(front);
        if (lf && lf.l.cor === 'vermelho' && lf.d < 18 && this.once(`red:${lf.l.id}:${lf.l.fase}`, 60)) {
          this.stats.paradasVermelho++;
          this.emit('vermelho', '🛑', `Parou no sinal vermelho, a ${lf.d.toFixed(1).replace('.', ',')} m da faixa`);
        }
        const cb = this.crosswalkBlock(front, e.d, 30);
        if (cb && cb.d < 16 && this.once('ped:' + cb.cw.id, 14)) this.emit('pedestre', '🚶', 'Parou para o pedestre atravessar');
        for (const c of this.cones) { const ds = rel(e.s, c.s) - (c.len + e.len) / 2; if (ds > 0 && ds < 14 && Math.abs(c.d - e.d) < 2 && this.once('stopc:' + c.id, 20)) this.emit('obstaculo', '🛑', c.fixed ? 'Parou antes das obras, esperando a faixa ao lado liberar' : 'Parou antes do cone, esperando a faixa ao lado liberar'); }
      }
      // ultrapassagens e desvios
      for (const o of this.npcs) {
        const r = rel(e.s, o.s), p = this._prevRel.get(o.id);
        if (p != null && p > 0 && r <= 0 && Math.abs(e.d - o.d) > 2 && o.v < e.v) { this.stats.ultrapassagens++; this.emit('ultrapassagem', '🏁', `Ultrapassou ${o.slow ? 'o carro lento' : o.kind === 'bus' ? 'o ônibus' : 'um carro mais lento'}`); }
        this._prevRel.set(o.id, r);
      }
      for (const c of this.cones) {
        const r = rel(e.s, c.s), p = this._prevRel.get('c' + c.id);
        if (p != null && p > 0 && r <= 0 && Math.abs(e.d - c.d) > 2) {
          if (c.fixed) this.emit('desvio', '✅', 'Desviou das obras na pista');
          else { this.stats.conesDesviados++; this.emit('desvio', '✅', 'Desviou do cone'); c.passedAt = this.t; }
        }
        this._prevRel.set('c' + c.id, r);
      }
      // zona escolar
      const inZone = limitAt(e.s) !== LIMITE;
      if (inZone && !this._inZone) {
        const kmh = e.v * KMH, z = ZONES[0];
        this.emit('zona', kmh <= z.lim + 3 ? '🏫' : '⚠️', `Entrou na ${z.nome} a ${Math.round(kmh)} km/h (limite ${z.lim})`);
      }
      if (!inZone && this._inZone) this.emit('zona', '🏁', 'Saiu da zona escolar: limite volta a 50 km/h');
      this._inZone = inZone;
      // limpeza de cones soltos já ultrapassados
      this.cones = this.cones.filter((c) => c.fixed || !(c.passedAt && this.t - c.passedAt > 25) && !(rel(e.s, c.s) < -150));
      this.fx = this.fx.filter((f) => this.t - f.t < 1.6);
    }

    step(dt) {
      this.t += dt;
      this._updateLights();
      this._updatePeds(dt);
      this._updateCross(dt);
      this._updateNpcs(dt);
      this._updateEgo(dt);
      this._collisions();
      this._events();
    }

    // ---------------------------------------------------------------- ações do usuário
    canDropAt(s, d) {
      if (Math.abs(d) > ROAD + 0.4) return { ok: false, why: 'Clique em cima do asfalto da avenida.' };
      const lane = d < 0 ? 0 : 1;
      const e = this.ego, ahead = rel(e.s, s);
      if (Math.abs(ahead) < 6 && Math.abs(LANE_D[lane] - e.d) < 2.5) return { ok: false, why: 'Aí é em cima do carro! Solte o cone mais à frente.' };
      const minAhead = Math.max(16, e.v * 1.8 + 6);
      if (ahead > 0 && ahead < minAhead && Math.abs(LANE_D[lane] - this._dAt(e, s)) < 2.5) return { ok: false, why: `Perto demais para qualquer motorista reagir. Solte a mais de ${Math.round(minAhead)} m do carro.` };
      for (const l of this.lights) if (Math.abs(rel(l.si, s)) < BOX + 1) return { ok: false, why: 'Não dá para soltar cone no meio do cruzamento.' };
      for (const o of this.npcs) if (Math.abs(rel(o.s, s)) < o.len / 2 + 1.5 && Math.abs(o.d - LANE_D[lane]) < 1.6) return { ok: false, why: 'Tem um carro aí. Escolha outro ponto.' };
      if (this.cones.filter((c) => !c.fixed).length >= 6) return { ok: false, why: 'Já há 6 cones na pista. Espere o carro passar por eles.' };
      return { ok: true, lane };
    }
    dropCone(s, d) {
      const chk = this.canDropAt(s, d);
      if (!chk.ok) return chk;
      const c = { id: this.nextId++, s: wrap(s), lane: chk.lane, d: LANE_D[chk.lane], len: 2.4, wid: 2.4, fixed: false, kind: 'cone', t: this.t };
      this.cones.push(c);
      const ahead = rel(this.ego.s, s);
      this.emit('usuario', '🚧', ahead > 0 ? `Você soltou um cone ${Math.round(ahead)} m à frente, na faixa da ${chk.lane === 0 ? 'esquerda' : 'direita'}` : `Você soltou um cone na faixa da ${chk.lane === 0 ? 'esquerda' : 'direita'}`);
      return { ok: true, cone: c };
    }
    dropConeAhead() {
      const e = this.ego, lane = this._laneOf(e);
      for (let gap = Math.max(50, e.v * 3.4); gap < 140; gap += 6) {
        const s = wrap(e.s + gap);
        const r = this.canDropAt(s, LANE_D[lane]);
        if (r.ok) {
          let crossOk = true;
          for (const cw of CROSSWALKS) if (Math.abs(rel(cw.s, s)) < 10) crossOk = false;
          for (const l of this.lights) if (rel(s, l.stop) > -6 && rel(s, l.stop) < 25) crossOk = false;
          if (crossOk) return this.dropCone(s, LANE_D[lane]);
        }
      }
      return { ok: false, why: 'Sem espaço livre à frente agora. Tente em alguns segundos.' };
    }
    spawnPedestrian() {
      const e = this.ego, front = e.s + e.len / 2;
      const minD = e.v > 5 ? Math.max(42, e.v * 3.2) : 20;
      if (this.peds.filter((p) => p.forced && p.st !== 'away').length >= 3) return { ok: false, why: 'Já tem gente atravessando. Espere um pouco.' };
      let best = null, bd = 1e9;
      for (const cw of CROSSWALKS) { const d = fwd(front, cw.s - CW_W / 2); if (d >= minD && d < bd) { bd = d; best = cw; } }
      const side = this.rnd() < 0.5 ? 1 : -1;
      if (best && bd <= 110) {
        this._spawnPed(best, { forced: true, side });
        this.emit('usuario', '🚶', `Um pedestre vai atravessar na faixa de pedestres, ${Math.round(bd)} m à frente`);
        return { ok: true, dist: bd };
      }
      // longe de qualquer faixa: alguém atravessa fora da faixa, à frente do carro
      for (let gap = Math.max(minD, 55); gap < 120; gap += 6) {
        const s = wrap(front + gap);
        if (this.lights.some((l) => Math.abs(rel(l.si, s)) < BOX + 8)) continue;
        if (Math.abs(rel(ROADWORK_S, s)) < ROADWORK_LEN / 2 + 10) continue;
        if (this.cones.some((c) => Math.abs(rel(c.s, s)) < 8)) continue;
        this._spawnPed(null, { forced: true, side, s });
        this.emit('usuario', '🚶', `Um pedestre vai atravessar fora da faixa, ${Math.round(gap)} m à frente`);
        return { ok: true, dist: gap };
      }
      return { ok: false, why: 'Sem lugar para o pedestre atravessar agora.' };
    }
    spawnSlowCar() {
      const e = this.ego, lane = this._laneOf(e);
      if (this.npcs.filter((n) => n.slow).length >= 3) return { ok: false, why: 'Já há 3 carros lentos na pista.' };
      for (let gap = 48; gap <= 120; gap += 8) {
        const s = wrap(e.s + gap);
        let free = true;
        for (const o of this.npcs) if (Math.abs(rel(o.s, s)) < 16 && this._occupies(o, lane)) free = false;
        for (const c of this.cones) if (Math.abs(rel(c.s, s)) < 14 && Math.abs(c.d - LANE_D[lane]) < 1.6) free = false;
        for (const l of this.lights) if (rel(l.stop, s) > -12 && rel(l.stop, s) < 14) free = false;
        if (!free) continue;
        const n = this._mkNpc(s, lane, 20, 'pickup', '#c08a4a', { slow: true });
        n.v = 20 / KMH;
        this.npcs.push(n);
        if (this.npcs.length > 11) { const far = this.npcs.filter((x) => !x.slow).sort((a, b) => Math.abs(rel(e.s, b.s)) - Math.abs(rel(e.s, a.s)))[0]; if (far) this.npcs.splice(this.npcs.indexOf(far), 1); }
        this.emit('usuario', '🚗', `Um carro lento (20 km/h) entrou ${Math.round(gap)} m à frente`);
        return { ok: true, dist: gap };
      }
      return { ok: false, why: 'Sem espaço livre à frente agora.' };
    }

    // ---------------------------------------------------------------- sensores para o Jev (só números e enumerações)
    // tau: latência esperada (s). A velocidade enviada é a prevista para quando a decisão chegar (compensação de latência).
    sensors(tau) {
      const e = this.ego, lane = this._laneOf(e), front = e.s + e.len / 2;
      const lim = limitAt(e.s), nl = nextLimit(e.s, 110);
      const vPred = Math.max(0, e.v + e.a * clamp(tau || 0, 0, 0.6));
      const out = { v: +(vPred * KMH).toFixed(1), lim, faixa: lane, mud: e.lc ? e.lc.to : null, mudm: e.lc ? e.lc.why || null : null, plim: nl ? { lim: nl.lim, d: Math.round(nl.d) } : null, fr: null, ped: null, obs: null, sem: null, viz: [null, null] };
      const aheadIn = (ln) => { // carro mais próximo à frente e atrás na faixa ln
        let fr = null, at = null;
        for (const o of this.npcs) {
          if (!this._occupies(o, ln)) continue;
          const ds = rel(e.s, o.s), half = (o.len + e.len) / 2;
          if (ds > 0 && ds < 115) { const g = ds - half; if (!fr || g < fr.d) fr = { d: Math.max(0, +g.toFixed(1)), v: +(o.v * KMH).toFixed(1), o }; }
          if (ds <= 0 && ds > -70) { const g = -ds - half; if (!at || g < at.d) at = { d: Math.max(0, +g.toFixed(1)), v: +(o.v * KMH).toFixed(1), o }; }
        }
        return { fr, at };
      };
      const obsIn = (ln) => { let best = null; for (const c of this.cones) { if (Math.abs(c.d - LANE_D[ln]) > 1.6) continue; const g = rel(e.s, c.s) - (c.len + e.len) / 2; if (g > -c.len && g < 115 && (!best || g < best.d)) best = { d: Math.max(0, +g.toFixed(1)), t: c.fixed ? 'obras' : 'cone' }; } return best; };
      const mine = aheadIn(lane);
      if (mine.fr) out.fr = { d: mine.fr.d, v: mine.fr.v };
      out.obs = obsIn(lane);
      const cb = this.crosswalkBlock(front, LANE_D[lane], 110);
      if (cb) out.ped = { d: Math.max(0, +cb.d.toFixed(1)), st: cb.st };
      const lf = this.lightFor(front);
      if (lf && lf.d < 120) out.sem = { d: +lf.d.toFixed(1), cor: lf.l.cor, ha: +lf.l.ha.toFixed(1) };
      for (const ln of [0, 1]) {
        if (ln === lane) continue;
        const nb = aheadIn(ln), ob = obsIn(ln);
        const lado = this._beside(e, ln);
        out.viz[ln] = { lado, entrar: !lado && !e.lc && this.gate(e, ln), fr: nb.fr ? { d: nb.fr.d, v: nb.fr.v } : null, at: nb.at ? { d: nb.at.d, v: nb.at.v } : null, obs: ob ? ob.d : null };
      }
      return out;
    }

    // ---------------------------------------------------------------- ajudas para o render e o teste
    egoPose() { const e = this.ego; const p = pose(e.s, e.d); return { x: p.x, y: p.y, h: p.h + e.yaw }; }
    lightState(i) { return this.lights[i]; }
  }

  const API = {
    Sim, W, H, R, LEN, LANE_D, ROAD, CURB, WALK, X_RUA, BOX, CW_W, LIMITE, ZONES, ROADWORK, CROSSWALKS, LIGHTS: LIGHTS_BASE, CAR_KINDS,
    segs, pose, project, wrap, fwd, rel, limitAt, clamp, lerp, rng, KMH,
  };
  root.CarroSim = API;
})(typeof window !== 'undefined' ? window : globalThis);

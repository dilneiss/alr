// O jogo de nave, sem DOM e sem desenho: mundo, nave, ondas, colisões, as MEDIDAS do jogador e o piloto automático.
// Tudo em unidades do mundo: a altura é sempre 640 e a largura acompanha a proporção da tela. Passo fixo de 1/120 s.
// O diretor (o Jev) entra por aplicarDecisao(): ele escolhe a próxima onda, a intensidade e se ajuda agora.

export const ALTURA = 640;
export const PASSO = 1 / 120;

// ondas que combinam com cada estado do jogador (trava do código: o chefe só vem para quem está entediado)
export const PERMITIDAS = {
  entediado: ['chefe', 'cacadores', 'meteoros'],
  no_ponto: ['formacao', 'enxame', 'meteoros', 'cacadores'],
  frustrado: ['bonus', 'respiro'],
  distraido: ['respiro', 'bonus'],
};
// a onda padrão, quando o diretor não respondeu a tempo
const ROTACAO = ['enxame', 'meteoros', 'cacadores', 'formacao', 'bonus', 'meteoros', 'enxame', 'chefe'];

// multiplicadores por intensidade 0..4 (interpolados: a mudança se sente em ~1 s, sem salto)
const MULT = {
  fogo: [0.3, 0.6, 1, 1.4, 1.8],
  bala: [0.74, 0.87, 1, 1.12, 1.24],
  surge: [0.55, 0.75, 1, 1.25, 1.5],
  vida: [0.6, 0.8, 1, 1.15, 1.3],
};
const interp = (arr, x) => {
  const i = Math.max(0, Math.min(arr.length - 1.0001, x)); const a = Math.floor(i);
  return arr[a] + (arr[a + 1] - arr[a]) * (i - a);
};

export const TIPOS = {
  drone: { r: 13, hp: 1, pontos: 50, cor: '#c084fc' },
  cacador: { r: 14, hp: 2, pontos: 150, cor: '#f472b6' },
  nave: { r: 15, hp: 2, pontos: 80, cor: '#a78bfa' },
  meteoroG: { r: 30, hp: 6, pontos: 120, cor: '#fb923c' },
  meteoroM: { r: 19, hp: 3, pontos: 60, cor: '#fb923c' },
  meteoroP: { r: 11, hp: 1, pontos: 30, cor: '#fdba74' },
  cristal: { r: 13, hp: 1, pontos: 300, cor: '#fde047', inofensivo: true },
  faisca: { r: 12, hp: 1, pontos: 100, cor: '#67e8f9', inofensivo: true },
  mini: { r: 11, hp: 1, pontos: 40, cor: '#fb7185' },
  chefe: { r: 46, hp: 170, pontos: 5000, cor: '#f0abfc' },
};

// números aleatórios com semente: a demonstração sai igual toda vez
export function rngDe(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const JANELA = 15;      // segundos que o diretor olha para trás
const VEL_NAVE = 430;   // unidades por segundo (a tela tem 640 de altura)

export function criarJogo({ largura = 860, semente = 1, aoEvento = () => {} } = {}) {
  const H = ALTURA;
  let W = clamp(largura, 300, 1600);
  let rnd = rngDe(semente);
  const R = (a, b) => a + (b - a) * rnd();
  const ev = (tipo, d) => { try { aoEvento(tipo, d || {}); } catch (e) { /* a tela nunca derruba o jogo */ } };

  const J = {
    get W() { return W; }, H,
    t: 0, ativo: false, piloto: null,
    nave: null, tiros: [], balas: [], inimigos: [], itens: [],
    onda: null, entre: 0, proximaTipo: null, historico: [], ultimoChefeN: null, nOnda: 0,
    intensidade: 2, intAtual: 2,
    plano: null, ultimaAjuda: -99,
    pontos: 0, combo: 0, mult: 1, mortes: 0,
    entrada: { dx: 0, dy: 0, foco: false, alvo: null },
    eventosOnda: [],
  };

  // ---------------- medidas do jogador (o que vira palavras para o Jev) ----------------
  const M = { inicio: 0, danos: [], mortes: [], fugas: [], abates: [], triz: [], disparos: [], amostras: [], ultimoComando: 0, ultimoDano: null };
  function reiniciarMedidas() {
    M.inicio = J.t; M.danos = []; M.mortes = []; M.fugas = []; M.abates = []; M.triz = []; M.disparos = []; M.amostras = [];
    M.ultimoComando = J.t; M.ultimoDano = null;
  }
  function podar() {
    const lim = J.t - JANELA;
    for (const k of ['danos', 'mortes', 'fugas', 'abates', 'triz']) { const a = M[k]; let i = 0; while (i < a.length && a[i] < lim) i++; if (i) a.splice(0, i); }
    let i = 0; while (i < M.disparos.length && M.disparos[i].t < lim) i++; if (i) M.disparos.splice(0, i);
    i = 0; while (i < M.amostras.length && M.amostras[i].t < lim) i++; if (i) M.amostras.splice(0, i);
  }
  function medidas() {
    podar();
    const n = J.nave, o = J.onda;
    const desde = Math.max(M.inicio, J.t - JANELA);
    const conta = (a) => a.filter((x) => x >= desde).length;
    let disp = 0, acert = 0;
    for (const d of M.disparos) if (d.t >= desde) { disp += d.n; acert += d.a; }
    const am = M.amostras.filter((a) => a.t >= desde);
    const mov = am.length ? am.filter((a) => a.m).length / am.length : 0;
    let xmin = Infinity, xmax = -Infinity; for (const a of am) { if (a.x < xmin) xmin = a.x; if (a.x > xmax) xmax = a.x; }
    const amp = am.length ? (xmax - xmin) / W : 0;
    let resta = 0;
    if (o) {
      if (o.tipo === 'formacao') resta = Math.min(20, J.inimigos.filter((e) => e.tipo === 'nave').length * 0.8);
      else if (o.tipo === 'chefe') { const c = J.inimigos.find((e) => e.tipo === 'chefe'); resta = c ? Math.round(15 * c.hp / c.hpMax) : 0; }
      else resta = Math.max(0, o.dur - o.t);
    }
    return {
      jogando_s: +(J.t - M.inicio).toFixed(1),
      tiros: conta(M.danos), mortes: conta(M.mortes),
      morreu_ha_s: M.mortes.length ? +(J.t - M.mortes[M.mortes.length - 1]).toFixed(1) : null,
      vida: n.morta > 0 ? 0 : n.vida, vida_max: n.vidaMax, escudo: n.escudo > 0,
      sem_dano_s: +(J.t - (M.ultimoDano == null ? M.inicio : Math.max(M.ultimoDano, M.inicio))).toFixed(1),
      abatidos: conta(M.abates), apareceram: conta(M.abates) + conta(M.fugas),
      disparos: disp, acertos: acert,
      movimento: +mov.toFixed(2), amplitude: +clamp(amp, 0, 1).toFixed(2),
      sem_comando_s: +(J.t - M.ultimoComando).toFixed(1),
      triz: conta(M.triz),
      onda: o ? { n: o.n, tipo: o.tipo, intensidade: Math.round(J.intensidade), resta_s: Math.round(resta) } : { n: 1, tipo: 'enxame', intensidade: 2, resta_s: 0 },
      anteriores: J.historico.slice(0, 3),
      chefe_ha: J.ultimoChefeN == null ? null : (o ? o.n : J.nOnda) - J.ultimoChefeN,
      chefe_vida: (() => { const c = J.inimigos.find((e) => e.tipo === 'chefe' && e.estado === 'luta'); return c ? +(c.hp / c.hpMax).toFixed(2) : null; })(),
    };
  }

  // ---------------- partida ----------------
  function novaPartida({ semente: s, primeira = 'enxame', intensidade = 2 } = {}) {
    if (s != null) rnd = rngDe(s);
    J.t = 0; J.ativo = true;
    J.nave = { x: W / 2, y: H - 80, vx: 0, vy: 0, r: 5, vida: 3, vidaMax: 3, inv: 1.2, escudo: 0, triplo: 0, morta: 0, cd: 0, inclina: 0 };
    J.tiros = []; J.balas = []; J.inimigos = []; J.itens = [];
    J.historico = []; J.ultimoChefeN = null; J.nOnda = 0; J.plano = null; J.ultimaAjuda = -99;
    J.intensidade = intensidade; J.intAtual = intensidade;
    J.pontos = 0; J.combo = 0; J.mult = 1; J.mortes = 0;
    J.entrada = { dx: 0, dy: 0, foco: false, alvo: null };
    reiniciarMedidas();
    J.onda = null; J.entre = 0.6; J.proximaTipo = primeira; J.proximaMotivo = { padrao: 'aquecimento' };
  }

  function redimensionar(largura) {
    const nw = clamp(largura, 300, 1600);
    if (Math.abs(nw - W) < 0.5) return;
    const f = nw / W; W = nw;
    for (const a of [J.tiros, J.balas, J.inimigos, J.itens]) for (const e of a) { e.x *= f; if (e.x0 != null) e.x0 *= f; }
    if (J.nave) J.nave.x = clamp(J.nave.x * f, 16, W - 16);
  }

  // ---------------- tiros ----------------
  function balaInimiga(x, y, ang, vel, { r = 6, cor = 'rosa' } = {}) {
    J.balas.push({ x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, r, rc: r * 0.72, cor, perto: false, contada: false });
  }
  function mirar(x, y) { const n = J.nave; return Math.atan2(n.y - y, n.x - x); }
  const bs = () => interp(MULT.bala, J.intAtual) ;
  const fogo = () => interp(MULT.fogo, J.intAtual);
  const surge = () => interp(MULT.surge, J.intAtual);

  // ---------------- inimigos ----------------
  function criar(tipo, extra) {
    const T = TIPOS[tipo];
    const e = { tipo, r: T.r, hp: T.hp, hpMax: T.hp, pontos: T.pontos, cor: T.cor, inofensivo: !!T.inofensivo, t: 0, fl: 0, x: 0, y: -30, px: 0, py: -30, vx: 0, vy: 0, entrou: false, foge: false, rot: 0, vr: 0, ...extra };
    e.px = e.x; e.py = e.y;
    J.inimigos.push(e);
    return e;
  }

  function iniciarOnda(tipo, motivo) {
    const n = ++J.nOnda;
    if (J.onda) J.historico.unshift(J.onda.tipo);
    if (J.historico.length > 6) J.historico.length = 6;
    const o = { n, tipo, t: 0, dur: 10, spawn: true, encurtada: false, limite: null, cd: 0.2, cd2: 0, k: 0, motivo: motivo || null };
    if (tipo === 'enxame') o.dur = 10;
    if (tipo === 'cacadores') o.dur = 10;
    if (tipo === 'meteoros') o.dur = 10;
    if (tipo === 'bonus') { o.dur = 7; soltarItem('triplo', W / 2, -10); }
    if (tipo === 'respiro') { o.dur = 6.5; o.cd = 0.4; }
    if (tipo === 'formacao') montarFormacao(o);
    if (tipo === 'chefe') { o.dur = 0; o.spawn = false; montarChefe(o); J.ultimoChefeN = n; }
    J.onda = o;
    ev('ondaInicio', { n, tipo, motivo: o.motivo });
  }

  function montarFormacao(o) {
    const cols = clamp(Math.floor((W - 110) / 68), 5, 9);
    const rows = J.intensidade >= 3 ? 4 : 3;
    o.cols = cols; o.rows = rows; o.dur = 24; o.spawn = false; o.cdMerg = 3.2;
    let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lado = (c + r) % 2 === 0 ? -1 : 1;
      const sx = (c - (cols - 1) / 2) * 64, sy = 86 + r * 50;
      const x0 = lado < 0 ? -40 : W + 40, y0 = R(-60, 40);
      criar('nave', { x: x0, y: y0, sx, sy, estado: 'entrando', atraso: k * 0.07, dur: 1.5, p0: [x0, y0], p1: [W / 2 + lado * R(140, 260), H * 0.5], cdFogo: R(4, 9) });
      k++;
    }
  }

  function montarChefe(o) {
    const hp = Math.round(TIPOS.chefe.hp * interp(MULT.vida, J.intensidade));
    criar('chefe', { x: W / 2, y: -90, hp, hpMax: hp, estado: 'entrando', t2: 0, cdAnel: 1.6, cdRaj: 2.6, cdMini: 5, cdEsp: 3.5, fase: 1, ang: 0, raj: 0, rajT: 0, esp: 0, espT: 0, espAng: 0, blindado: true });
  }

  function centroFormacao(o) {
    const amp = clamp((W - o.cols * 64) / 2 - 34, 0, 80);
    return [W / 2 + Math.sin(o.t * 0.7) * amp, Math.sin(o.t * 1.3) * 6];
  }

  function atualizarOnda(dt) {
    const o = J.onda; if (!o) return;
    o.t += dt;
    const sg = surge();
    if (o.spawn) {
      o.cd -= dt;
      if (o.tipo === 'enxame' && o.cd <= 0) {
        o.cd = 1.15 / sg;
        const x0 = R(90, W - 90), forma = rnd() < 0.5 ? 'linha' : 'v';
        const nn = J.intAtual >= 2.5 ? 5 : 4;
        for (let i = 0; i < nn; i++) {
          const off = (i - (nn - 1) / 2) * 34;
          criar('drone', { x: x0 + off, x0: x0 + off, y: -24 - (forma === 'v' ? Math.abs(off) * 0.6 : i * 6), vy: R(78, 96), amp: 34, freq: 1.4, fase: i * 0.6, cdFogo: R(1.2, 3.6) });
        }
      }
      if (o.tipo === 'cacadores' && o.cd <= 0) {
        o.cd = 0.78 / sg;
        const par = rnd() < 0.35;
        const x = R(50, W - 50);
        criar('cacador', { x, y: -26, vx: (W / 2 - x) * 0.15, estado: 'desce' });
        if (par) criar('cacador', { x: W - x, y: -40, vx: (x - W / 2) * 0.15, estado: 'desce' });
      }
      if (o.tipo === 'meteoros' && o.cd <= 0) {
        o.cd = 0.3 / sg;
        const q = rnd(); const tipo = q < 0.25 ? 'meteoroG' : q < 0.7 ? 'meteoroM' : 'meteoroP';
        const x = R(-20, W + 20); const vx = (x < W / 2 ? 1 : -1) * R(20, 100);
        criar(tipo, { x, y: -40, vx, vy: R(110, 220) * bs(), vr: R(-1.6, 1.6), forma: Math.floor(R(0, 3)) });
      }
      if (o.tipo === 'bonus' && o.cd <= 0) {
        o.cd = 0.2; o.k++;
        const lado = o.k % 2 ? 0.27 : 0.73;
        criar('cristal', { x: W * lado, x0: W * lado + R(-30, 30), y: -20, vy: 150, amp: 70, freq: 1.7, fase: o.k * 0.45 });
      }
      if (o.tipo === 'respiro' && o.cd <= 0) {
        o.cd = 0.75; o.k++;
        if (o.k <= 6) criar('faisca', { x: R(60, W - 60), x0: 0, y: -20, vy: R(55, 80), amp: R(20, 40), freq: R(0.8, 1.4), fase: R(0, 6) });
        if (o.k === 2 && J.nave.vida < J.nave.vidaMax) soltarItem('vida', R(W * 0.3, W * 0.7), -10);
      }
      if (o.dur && o.t >= o.dur) o.spawn = false;
    }
    if (o.tipo === 'formacao' && !o.encurtada) {
      if (o.t >= o.dur) encurtar('tempo');
      o.cdMerg -= dt * sg;
      if (o.cdMerg <= 0) {
        o.cdMerg = R(1.2, 2.0);
        const livres = J.inimigos.filter((e) => e.tipo === 'nave' && e.estado === 'slot');
        if (livres.length) {
          livres.sort((a, b) => b.sy - a.sy);
          const e = livres[Math.floor(rnd() * Math.min(livres.length, 6))];
          e.estado = 'mergulho'; e.tm = 0; e.alvoX = clamp(J.nave.x + R(-70, 70), 30, W - 30); e.tiro1 = false; e.tiro2 = false;
        }
      }
    }
    // fim de onda encurtada: o que sobrou some
    if (o.encurtada && o.limite != null && J.t >= o.limite) {
      for (const e of J.inimigos) if (!(e.tipo === 'chefe' && e.estado === 'fugindo')) e.morto = 'sumiu';
      o.limite = null;
    }
    // acabou?
    const vivos = J.inimigos.length;
    if (!o.spawn && vivos === 0) {
      ev('ondaFim', { n: o.n, tipo: o.tipo, encurtada: o.encurtada });
      J.onda = { ...o, acabou: true };
      J.entre = o.proximaJa ? 0.45 : 1.4;
      if (!o.proximaJa) J.proximaTipo = null;
    }
  }

  // o diretor cortou a onda: para de nascer inimigo e os que restam vão embora em ~2 s
  function encurtar(porque, para, motivo) {
    const o = J.onda; if (!o || o.encurtada || o.acabou) return false;
    o.spawn = false; o.encurtada = true; o.limite = J.t + 2.2;
    if (para) {
      o.proximaJa = true; J.proximaTipo = para; J.proximaMotivo = motivo || null; J.plano = null;
      if (para === 'chefe') ev('chefeAviso', { motivo: J.proximaMotivo, corte: true });
    }
    for (const e of J.inimigos) {
      if (e.tipo === 'chefe') { e.estado = 'fugindo'; e.blindado = true; }
      else if (e.tipo === 'nave' || e.tipo === 'drone' || e.tipo === 'cacador' || e.tipo === 'mini') e.foge = true;
    }
    ev('corte', { porque, tipo: o.tipo });
    return true;
  }

  function atualizarInimigo(e, dt) {
    e.t += dt; e.px = e.x; e.py = e.y;
    if (e.fl > 0) e.fl -= dt;
    const n = J.nave;
    if (e.foge && e.tipo !== 'chefe') {
      e.vy = (e.vy || 0) - 520 * dt; e.y += e.vy * dt; e.x += (e.vx || 0) * dt;
      if (e.y < -60) e.morto = 'sumiu';
      return;
    }
    switch (e.tipo) {
      case 'drone': case 'mini': {
        e.y += e.vy * dt; e.x = e.x0 + Math.sin(e.t * e.freq + e.fase) * e.amp;
        e.cdFogo -= dt * fogo();
        if (e.cdFogo <= 0 && e.y > 20 && e.y < H * 0.62) {
          e.cdFogo = (e.tipo === 'mini' ? R(1.4, 2.4) : R(2.4, 4.6));
          balaInimiga(e.x, e.y + 8, mirar(e.x, e.y) + R(-0.12, 0.12), 190 * bs());
        }
        break;
      }
      case 'cacador': {
        if (e.estado === 'desce') {
          e.y += 250 * dt; e.x += e.vx * dt;
          if (e.t > 0.55) {
            e.estado = 'ataque';
            const a = mirar(e.x, e.y); const v = 330 * bs();
            e.vx = Math.cos(a) * v; e.vy = Math.max(120, Math.sin(a) * v);
            if (e.y < H * 0.55) for (const d of [-0.2, 0, 0.2]) balaInimiga(e.x, e.y + 10, a + d, 240 * bs());
          }
        } else { e.x += e.vx * dt; e.y += e.vy * dt; }
        break;
      }
      case 'nave': {
        const o = J.onda;
        const [cx, cy] = o && o.cols ? centroFormacao(o) : [W / 2, 0];
        const slotX = cx + e.sx, slotY = e.sy + cy;
        if (e.estado === 'entrando' || e.estado === 'voltando') {
          if (e.atraso > 0) { e.atraso -= dt; e.y = -80; return; }
          e.tm = (e.tm || 0) + dt / e.dur;
          const u = Math.min(1, e.tm), a = 1 - u;
          const [x0, y0] = e.p0, [x1, y1] = e.p1;
          e.x = a * a * x0 + 2 * a * u * x1 + u * u * slotX;
          e.y = a * a * y0 + 2 * a * u * y1 + u * u * slotY;
          if (u >= 1) { e.estado = 'slot'; e.tm = 0; }
        } else if (e.estado === 'slot') {
          e.x += (slotX - e.x) * Math.min(1, dt * 8); e.y += (slotY - e.y) * Math.min(1, dt * 8);
          e.cdFogo -= dt * fogo();
          if (e.cdFogo <= 0) { e.cdFogo = R(5, 10); if (n.morta <= 0) balaInimiga(e.x, e.y + 10, mirar(e.x, e.y) + R(-0.08, 0.08), 200 * bs()); }
        } else if (e.estado === 'mergulho') {
          e.tm += dt;
          const vy = Math.min(300, 90 + e.tm * 260) * bs();
          e.y += vy * dt;
          e.x += clamp(e.alvoX - e.x, -1, 1) * 140 * dt + Math.sin(e.tm * 5) * 60 * dt;
          if (!e.tiro1 && e.tm > 0.3) { e.tiro1 = true; balaInimiga(e.x, e.y + 10, mirar(e.x, e.y), 230 * bs()); }
          if (!e.tiro2 && e.tm > 0.65 && J.intAtual >= 1.5) { e.tiro2 = true; balaInimiga(e.x, e.y + 10, mirar(e.x, e.y), 230 * bs()); }
          if (e.y > H + 40) { e.estado = 'voltando'; e.tm = 0; e.dur = 1.3; e.p0 = [e.x, -40]; e.p1 = [e.x, 30]; e.x = e.p0[0]; e.y = e.p0[1]; }
        }
        break;
      }
      case 'meteoroG': case 'meteoroM': case 'meteoroP': {
        e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
        break;
      }
      case 'cristal': case 'faisca': {
        e.y += e.vy * dt; e.x = (e.x0 || e.x) + (e.x0 ? Math.sin(e.t * e.freq + e.fase) * e.amp : 0); e.rot += dt * 2;
        if (!e.x0) e.x0 = e.x;
        break;
      }
      case 'chefe': atualizarChefe(e, dt); break;
      default: break;
    }
    if (e.y > H + 70 || e.x < -110 || e.x > W + 110) { if (e.tipo !== 'chefe') { e.morto = 'sumiu'; if (e.entrou && !e.inofensivo) M.fugas.push(J.t); } }
  }

  function atualizarChefe(e, dt) {
    const o = J.onda;
    if (e.estado === 'entrando') {
      e.y += (130 - e.y) * Math.min(1, dt * 2.8);
      if (e.t > 1.7) { e.estado = 'luta'; e.blindado = false; ev('chefeEntrou', { x: e.x, y: e.y }); }
      return;
    }
    if (e.estado === 'fugindo') {
      e.y -= 300 * dt;
      if (e.y < -140) { e.morto = 'fugiu'; if (!(o && o.encurtada)) M.fugas.push(J.t); ev('chefeFugiu', {}); }
      return;
    }
    e.t2 += dt;
    e.x = W / 2 + Math.sin(e.t2 * 0.55) * W * 0.3;
    e.y = 130 + Math.sin(e.t2 * 1.2) * 16;
    const f = fogo(), v = bs();
    if (e.fase === 1 && e.hp < e.hpMax * 0.5) { e.fase = 2; ev('chefeFase2', { x: e.x, y: e.y }); }
    e.cdAnel -= dt * f;
    if (e.cdAnel <= 0) {
      e.cdAnel = e.fase === 2 ? 2.0 : 2.7;
      const nb = 14 + Math.round(2 * J.intAtual);
      for (let k = 0; k < nb; k++) balaInimiga(e.x, e.y + 10, e.ang + (k * Math.PI * 2) / nb, 150 * v, { r: 6.5, cor: 'laranja' });
      e.ang += 0.17;
    }
    e.cdRaj -= dt * f;
    if (e.cdRaj <= 0) { e.cdRaj = 3.3; e.raj = 4 + (e.fase === 2 ? 2 : 0); e.rajT = 0; }
    if (e.raj > 0) { e.rajT -= dt; if (e.rajT <= 0) { e.rajT = 0.09; e.raj--; balaInimiga(e.x, e.y + 30, mirar(e.x, e.y + 30), 250 * v, { r: 6, cor: 'rosa' }); } }
    e.cdMini -= dt;
    if (e.cdMini <= 0) { e.cdMini = 6.5; for (const s of [-1, 1]) criar('mini', { x: e.x + s * 50, x0: e.x + s * 50, y: e.y + 10, vy: 120, amp: 26, freq: 2, fase: s, cdFogo: R(0.8, 1.6) }); }
    if (e.fase === 2) {
      e.cdEsp -= dt * f;
      if (e.cdEsp <= 0) { e.cdEsp = 4.6; e.esp = 1.5; }
      if (e.esp > 0) {
        e.esp -= dt; e.espT -= dt;
        if (e.espT <= 0) { e.espT = 0.11; for (const s of [0, Math.PI]) balaInimiga(e.x, e.y, e.espAng + s, 165 * v, { r: 6, cor: 'laranja' }); e.espAng += 0.34; }
      }
    }
    if (o && !o.encurtada && e.t2 > 45) { e.estado = 'fugindo'; e.blindado = true; }
  }

  function morrerInimigo(e) {
    e.morto = 'abatido';
    if (!e.inofensivo) M.abates.push(J.t);
    J.combo++;
    const antes = J.mult;
    J.mult = Math.min(8, 1 + Math.floor(J.combo / 8));
    if (J.mult > antes) ev('combo', { mult: J.mult, x: J.nave.x, y: J.nave.y });
    const pts = e.pontos * J.mult;
    J.pontos += pts;
    ev('abate', { x: e.x, y: e.y, tipo: e.tipo, cor: e.cor, r: e.r, pontos: pts });
    if (e.tipo === 'meteoroG') {
      for (const s of [-1, 1]) criar('meteoroP', { x: e.x + s * 10, y: e.y, vx: e.vx + s * R(60, 110), vy: e.vy * 0.8, vr: R(-2.5, 2.5), forma: Math.floor(R(0, 3)), entrou: true });
    }
    if (e.tipo === 'cristal' && rnd() < 0.08) { const q = rnd(); soltarItem(q < 0.4 ? 'escudo' : q < 0.7 ? 'vida' : 'triplo', e.x, e.y); }
    if (e.tipo === 'chefe') {
      ev('chefeMorreu', { x: e.x, y: e.y, pontos: pts });
      for (const b of J.balas) ev('balaVirouPonto', { x: b.x, y: b.y });
      J.pontos += J.balas.length * 10;
      J.balas = [];
      for (const m of J.inimigos) if (m.tipo === 'mini') { m.morto = 'abatido'; ev('abate', { x: m.x, y: m.y, tipo: 'mini', cor: m.cor, r: m.r, pontos: 0 }); }
      soltarItem('vida', e.x - 30, e.y); soltarItem('triplo', e.x + 30, e.y);
    } else if (!e.inofensivo && e.tipo !== 'mini' && rnd() < 0.025) {
      soltarItem(rnd() < 0.5 ? 'triplo' : 'escudo', e.x, e.y);
    }
  }

  // ---------------- itens ----------------
  function soltarItem(tipo, x, y, { ima = false } = {}) {
    J.itens.push({ tipo, x, y, vy: 80, r: 13, ima, t: 0 });
  }
  function pegarItem(it) {
    const n = J.nave;
    if (it.tipo === 'escudo') n.escudo = Math.max(n.escudo, 6);
    if (it.tipo === 'vida') { if (n.vida >= n.vidaMax) J.pontos += 1000; n.vida = Math.min(n.vidaMax, n.vida + 1); n.escudo = Math.max(n.escudo, 2.5); }
    if (it.tipo === 'triplo') n.triplo = Math.max(n.triplo, 10);
    ev('item', { tipo: it.tipo, x: it.x, y: it.y, ajuda: !!it.ima });
  }

  // ---------------- dano ----------------
  function levarDano(x, y) {
    const n = J.nave;
    if (n.morta > 0 || n.inv > 0) return;
    if (n.escudo > 0) { n.inv = 0.3; ev('escudoBloqueou', { x: n.x, y: n.y }); return; }
    n.vida--; n.inv = 1.5; J.combo = 0; J.mult = 1;
    M.danos.push(J.t); M.ultimoDano = J.t;
    if (n.vida <= 0) {
      n.morta = 1.3; J.mortes++; M.mortes.push(J.t);
      for (const b of J.balas) if (Math.hypot(b.x - n.x, b.y - n.y) < 170) b.morto = true;
      ev('morte', { x: n.x, y: n.y });
    } else ev('dano', { x: n.x, y: n.y, vida: n.vida, de: { x, y } });
  }

  // ---------------- piloto automático (a demonstração do ▶) ----------------
  // 'bem': prevê onde cada tiro e inimigo vai estar e escolhe a direção mais segura, ficando embaixo de um alvo.
  // 'mal': vai na direção do perigo e se distrai.
  const AP = { cd: 0, vx: 0, vy: 0, vagar: 0, dirX: 0, dirY: 0 };
  const DIRS = (() => { const d = [[0, 0]]; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; d.push([Math.cos(a), Math.sin(a)]); d.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45]); } return d; })();
  const TEMPOS = [0.06, 0.13, 0.22, 0.34, 0.5];
  const PESOS = [3, 2.3, 1.7, 1.1, 0.6];
  function pilotar(dt) {
    const n = J.nave;
    AP.cd -= dt;
    if (AP.cd > 0) return [AP.vx, AP.vy];
    AP.cd = 1 / 30;
    if (n.morta > 0) { AP.vx = 0; AP.vy = 0; return [0, 0]; }
    if (J.piloto === 'mal') {
      // persegue a bala ou o inimigo mais perto (de propósito), com distração
      // a bala que vai passar mais cedo: o piloto vai para o ponto da trajetória dela mais perto da nave
      let alvo = null, tMin = 1.6;
      for (const b of J.balas) {
        const rx = n.x - b.x, ry = n.y - b.y; const v2 = b.vx * b.vx + b.vy * b.vy || 1;
        const tc = (rx * b.vx + ry * b.vy) / v2;
        if (tc > 0.05 && tc < tMin) { const px = b.x + b.vx * tc, py = b.y + b.vy * tc; if (Math.hypot(px - n.x, py - n.y) < 260) { tMin = tc; alvo = { x: px, y: py }; } }
      }
      if (!alvo) for (const e of J.inimigos) {
        if (e.inofensivo || e.tipo === 'chefe' || e.morto || e.y < 0) continue;
        if (!alvo || Math.hypot(e.x - n.x, e.y - n.y) < Math.hypot(alvo.x - n.x, alvo.y - n.y)) alvo = { x: e.x + (e.x - e.px) / PASSO * 0.3, y: e.y + (e.y - e.py) / PASSO * 0.3 };
      }
      AP.vagar -= 1 / 30;
      if (AP.vagar <= 0) { AP.vagar = R(0.5, 1.2); const a = R(0, Math.PI * 2); const p = rnd() < 0.45 ? 0 : 0.3; AP.dirX = Math.cos(a) * p; AP.dirY = Math.sin(a) * p * 0.5; }
      let vx = AP.dirX, vy = AP.dirY;
      if (alvo) { const dx = alvo.x - n.x, dy = alvo.y - n.y; const d = Math.hypot(dx, dy) || 1; const f = Math.min(1, d / 40); vx += (dx / d) * f; vy += (dy / d) * f; }
      const m = Math.hypot(vx, vy) || 1; const s = Math.min(1, m) * VEL_NAVE * 0.85;
      AP.vx = (vx / m) * s; AP.vy = (vy / m) * s;
      return [AP.vx, AP.vy];
    }
    // ---- 'bem' ----
    const riscos = [];
    for (const b of J.balas) { const dx = b.x - n.x, dy = b.y - n.y; if (dx * dx + dy * dy < 300 * 300) riscos.push([b.x, b.y, b.vx, b.vy, b.rc + n.r, 15]); }
    for (const e of J.inimigos) {
      if (e.inofensivo || e.morto) continue;
      const vx = (e.x - e.px) / PASSO, vy = (e.y - e.py) / PASSO;
      const dx = e.x - n.x, dy = e.y - n.y; if (dx * dx + dy * dy < 340 * 340) riscos.push([e.x, e.y, vx, vy, e.r * 0.62 + n.r + 6, 22]);
    }
    // alvo: um item para pegar, senão ficar embaixo do inimigo mais ameaçador/próximo
    let tx = n.x, ty = H * 0.8;
    let item = null, di = 1e9;
    for (const it of J.itens) { const d = Math.hypot(it.x - n.x, it.y - n.y); if (d < di && it.y > H * 0.25) { di = d; item = it; } }
    if (item && di < 420) { tx = item.x; ty = clamp(item.y, H * 0.5, H - 40); }
    else {
      let melhor = null, nota = -1e9;
      for (const e of J.inimigos) {
        if (e.morto || (e.blindado && e.tipo === 'chefe') || e.y < 10 || e.y > n.y - 40) continue;
        const s = e.y * 0.6 - Math.abs(e.x - n.x) * 0.9 + (e.tipo === 'chefe' ? 120 : 0) + (e.inofensivo ? 60 : 0);
        if (s > nota) { nota = s; melhor = e; }
      }
      if (melhor) { const vx = (melhor.x - melhor.px) / PASSO; tx = melhor.x + vx * 0.35; }
      ty = H * 0.8;
    }
    let best = 0, bestCusto = Infinity;
    for (let i = 0; i < DIRS.length; i++) {
      const vx = DIRS[i][0] * VEL_NAVE, vy = DIRS[i][1] * VEL_NAVE;
      let risco = 0;
      for (let k = 0; k < TEMPOS.length; k++) {
        const T = TEMPOS[k];
        const px = clamp(n.x + vx * T, 16, W - 16), py = clamp(n.y + vy * T, H * 0.15, H - 26);
        for (const r of riscos) {
          const hx = r[0] + r[2] * T, hy = r[1] + r[3] * T;
          const d = Math.hypot(px - hx, py - hy) - r[4];
          if (d < r[5]) { const q = r[5] - d; risco += q * q * PESOS[k] * (d < 0 ? 6 : 1); }
        }
        if (k === 2) {
          const ex = Math.min(px - 16, W - 16 - px), ey = H - 26 - py;
          if (ex < 40) risco += (40 - ex) * 0.6;
          if (ey < 20) risco += (20 - ey) * 0.5;
        }
      }
      const fx = clamp(n.x + vx * 0.22, 16, W - 16), fy = clamp(n.y + vy * 0.22, H * 0.15, H - 26);
      const custo = risco * 40 + Math.hypot(fx - tx, (fy - ty) * 0.6) * 1.0 + (i === 0 ? 0 : 2);
      if (custo < bestCusto) { bestCusto = custo; best = i; }
    }
    AP.vx = DIRS[best][0] * VEL_NAVE; AP.vy = DIRS[best][1] * VEL_NAVE;
    return [AP.vx, AP.vy];
  }

  // ---------------- o passo do jogo ----------------
  let amostraT = 0;
  function passo(dt = PASSO) {
    if (!J.ativo) return;
    J.t += dt;
    J.intAtual += (J.intensidade - J.intAtual) * Math.min(1, dt * 1.2);
    const n = J.nave;

    // nave
    if (n.morta > 0) {
      n.morta -= dt;
      if (n.morta <= 0) { n.vida = n.vidaMax; n.x = W / 2; n.y = H - 80; n.vx = 0; n.vy = 0; n.inv = 2.4; n.morta = 0; ev('renasce', { x: n.x, y: n.y }); }
    } else {
      let tvx = 0, tvy = 0;
      const en = J.entrada;
      if (J.piloto) {
        [tvx, tvy] = pilotar(dt);
        M.ultimoComando = J.t;
      } else if (en.alvo && !en.dx && !en.dy) {
        const dx = en.alvo.x - n.x, dy = en.alvo.y - n.y;
        const ganho = 16, vmax = 950;
        tvx = clamp(dx * ganho, -vmax, vmax); tvy = clamp(dy * ganho, -vmax, vmax);
      } else {
        let dx = en.dx, dy = en.dy; const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        const v = en.foco ? VEL_NAVE * 0.5 : VEL_NAVE;
        tvx = dx * v; tvy = dy * v;
      }
      const k = 1 - Math.exp(-dt * 32);
      n.vx += (tvx - n.vx) * k; n.vy += (tvy - n.vy) * k;
      n.x = clamp(n.x + n.vx * dt, 16, W - 16); n.y = clamp(n.y + n.vy * dt, H * 0.15, H - 26);
      n.inclina += (clamp(n.vx / VEL_NAVE, -1, 1) - n.inclina) * Math.min(1, dt * 10);
      if (n.inv > 0) n.inv -= dt;
      if (n.escudo > 0) n.escudo -= dt;
      if (n.triplo > 0) n.triplo -= dt;
      // tiro automático
      n.cd -= dt;
      if (n.cd <= 0) {
        n.cd = 0.11;
        const salva = [[-7, 0], [7, 0]];
        if (n.triplo > 0) salva.push([-12, -0.2], [12, 0.2]);
        for (const [ox, ang] of salva) J.tiros.push({ x: n.x + ox, y: n.y - 14, vx: Math.sin(ang) * 900, vy: -Math.cos(ang) * 900, acertou: false });
        M.disparos.push({ t: J.t, n: salva.length, a: 0 });
        ev('tiro', {});
      }
    }

    // ondas
    if (!J.onda || J.onda.acabou) {
      J.entre -= dt;
      if (J.proximaTipo == null && J.entre <= 0.55) escolherProxima();
      if (J.entre <= 0 && J.proximaTipo) { const t = J.proximaTipo, m = J.proximaMotivo; J.proximaTipo = null; iniciarOnda(t, m); }
    } else atualizarOnda(dt);

    // inimigos
    for (const e of J.inimigos) {
      atualizarInimigo(e, dt);
      if (!e.entrou && e.y > 4 && e.x > 0 && e.x < W) e.entrou = true;
    }

    // tiros da nave
    for (const s of J.tiros) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -20) { s.morto = true; continue; }
      for (const e of J.inimigos) {
        if (e.morto || e.y < -10) continue;
        const rr = e.r + 4; const dx = e.x - s.x, dy = e.y - s.y;
        if (dx * dx + dy * dy < rr * rr) {
          s.morto = true;
          const ultimo = M.disparos[M.disparos.length - 1]; if (ultimo) ultimo.a++;
          if (e.blindado) { ev('ricochete', { x: s.x, y: s.y }); break; }
          e.hp--; e.fl = 0.08;
          ev('acerto', { x: s.x, y: s.y, cor: e.cor, tipo: e.tipo });
          if (e.hp <= 0) morrerInimigo(e);
          break;
        }
      }
    }

    // tiros inimigos × nave (com a esquiva "por um triz")
    const vivo = n.morta <= 0;
    for (const b of J.balas) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > H + 20 || b.y < -40 || b.x < -30 || b.x > W + 30) { b.morto = true; continue; }
      if (!vivo) continue;
      const dx = b.x - n.x, dy = b.y - n.y; const d2 = dx * dx + dy * dy;
      const rr = b.rc + n.r;
      if (d2 < rr * rr) { b.morto = true; levarDano(b.x, b.y); continue; }
      if (n.inv <= 0 && n.escudo <= 0) {
        const perto = rr + 15;
        if (d2 < perto * perto) b.perto = true;
        else if (b.perto && !b.contada) {
          b.contada = true; M.triz.push(J.t);
          J.pontos += 25 * J.mult;
          ev('triz', { x: n.x + dx * 0.4, y: n.y + dy * 0.4, pontos: 25 * J.mult });
        }
      }
    }
    // corpos dos inimigos × nave
    if (vivo) for (const e of J.inimigos) {
      if (e.morto || (e.tipo === 'chefe' && e.estado === 'entrando')) continue;
      const rr = (e.inofensivo ? e.r + 10 : e.r * 0.62 + n.r + 2);
      const dx = e.x - n.x, dy = e.y - n.y;
      if (dx * dx + dy * dy < rr * rr) {
        if (e.inofensivo) { morrerInimigo(e); continue; }
        if (e.tipo === 'chefe') { levarDano(e.x, e.y); continue; }
        if (n.inv <= 0) { e.hp = 0; morrerInimigo(e); }
        levarDano(e.x, e.y);
      }
    }
    // itens
    for (const it of J.itens) {
      it.t += dt;
      const dx = n.x - it.x, dy = n.y - it.y; const d = Math.hypot(dx, dy) || 1;
      if (vivo && (it.ima || d < 120)) { const v = it.ima ? 260 + it.t * 300 : 360; it.x += (dx / d) * v * dt; it.y += (dy / d) * v * dt; }
      else it.y += it.vy * dt;
      if (vivo && d < 26) { it.morto = true; pegarItem(it); }
      if (it.y > H + 30) it.morto = true;
    }

    // limpeza
    if (J.tiros.some((x) => x.morto)) J.tiros = J.tiros.filter((x) => !x.morto);
    if (J.balas.some((x) => x.morto)) J.balas = J.balas.filter((x) => !x.morto);
    if (J.inimigos.some((x) => x.morto)) J.inimigos = J.inimigos.filter((x) => !x.morto);
    if (J.itens.some((x) => x.morto)) J.itens = J.itens.filter((x) => !x.morto);

    // amostra de movimento (20 por segundo)
    amostraT -= dt;
    if (amostraT <= 0) {
      amostraT = 0.05;
      if (n.morta <= 0) M.amostras.push({ t: J.t, m: Math.hypot(n.vx, n.vy) > 45, x: n.x });
      if (M.amostras.length > 400) podar();
    }
  }

  // ---------------- o diretor ----------------
  // r = respostas do Jev { estado_jogador, proxima_onda, ajudar, intensidade }; devolve o que aconteceu, para o registro
  function aplicarDecisao(r, { limiarAjuda = 0.6, limiarCorte = 0.5 } = {}) {
    const out = { ajuda: null, corte: null };
    if (!r || !r.estado_jogador) return out;
    const pe = r.estado_jogador.probabilities || {};
    const estado = r.estado_jogador.choice;
    const pEstado = pe[estado] || 0;
    // próxima onda: a escolha do Jev, desde que combine com o estado (senão, a mais provável entre as que combinam)
    const po = (r.proxima_onda && r.proxima_onda.probabilities) || {};
    const atual = J.onda && !J.onda.acabou ? J.onda.tipo : null;
    const ok = (PERMITIDAS[estado] || Object.keys(po)).filter((k) => k !== atual);
    let onda = r.proxima_onda && r.proxima_onda.choice;
    if (!ok.includes(onda)) {
      const alt = Object.entries(po).filter(([k]) => ok.includes(k)).sort((a, b) => b[1] - a[1])[0];
      onda = alt ? alt[0] : onda;
    }
    const pOnda = po[onda] || 0;
    let inten = J.intensidade;
    if (r.intensidade && r.intensidade.probabilities) inten = +Object.entries(r.intensidade.probabilities).sort((a, b) => b[1] - a[1])[0][0];
    J.intensidade = clamp(inten, 0, 4);
    J.plano = { onda, pOnda, estado, pEstado, t: J.t };
    const o = J.onda;
    if (o && !o.acabou && o.tipo !== onda) {
      if (onda === 'chefe' && estado === 'entediado' && pEstado >= limiarCorte && !o.encurtada) {
        const resta = o.tipo === 'formacao' ? J.inimigos.length : Math.max(0, o.dur - o.t);
        if (resta > 2.5 || o.tipo === 'formacao') { if (encurtar('chefe', 'chefe', { estado, p: pEstado, pOnda })) out.corte = { para: onda, estado, p: pEstado }; }
      } else if ((onda === 'bonus' || onda === 'respiro') && (estado === 'frustrado' || estado === 'distraido') && pEstado >= 0.6 && !['bonus', 'respiro'].includes(o.tipo) && !o.encurtada) {
        if (o.tipo === 'chefe' || o.tipo === 'formacao' || o.dur - o.t > 3) { if (encurtar('alivio', onda, { estado, p: pEstado, pOnda })) out.corte = { para: onda, estado, p: pEstado }; }
      }
    }
    // ajuda agora (com intervalo mínimo e nunca por cima de um escudo)
    const n = J.nave;
    if (r.ajudar && r.ajudar.noul >= limiarAjuda && J.t - J.ultimaAjuda >= 9 && n.morta <= 0 && n.escudo <= 0) {
      const tipo = n.vida < n.vidaMax ? 'vida' : 'escudo';
      soltarItem(tipo, clamp(n.x + R(-30, 30), 30, W - 30), Math.max(40, n.y - 190), { ima: true });
      J.ultimaAjuda = J.t;
      out.ajuda = { tipo, estado, p: pEstado, sim: r.ajudar.noul };
      ev('ajuda', out.ajuda);
    }
    return out;
  }

  function escolherProxima() {
    const atual = J.onda ? J.onda.tipo : null;
    const chefeHa = J.ultimoChefeN == null ? 99 : J.nOnda - J.ultimoChefeN;
    const p = J.plano;
    const vale = (t) => t && t !== atual && !(t === 'chefe' && chefeHa < 3);
    const doPlano = p && J.t - p.t < 14 ? (vale(p.onda) ? p.onda : (PERMITIDAS[p.estado] || []).find(vale)) : null;
    if (doPlano) {
      J.proximaTipo = doPlano; J.proximaMotivo = { estado: p.estado, p: p.pEstado, pOnda: doPlano === p.onda ? p.pOnda : null };
    } else {
      let i = J.nOnda % ROTACAO.length, tipo = ROTACAO[i];
      for (let k = 0; k < ROTACAO.length && (tipo === atual || (tipo === 'chefe' && chefeHa < 3)); k++) tipo = ROTACAO[++i % ROTACAO.length];
      J.proximaTipo = tipo; J.proximaMotivo = { padrao: J.nOnda === 0 ? 'aquecimento' : 'sem resposta' };
    }
    if (J.proximaTipo === 'chefe') { J.entre = Math.max(J.entre, 2.0); ev('chefeAviso', { motivo: J.proximaMotivo }); }
    J.plano = null;
  }

  // a tela avisa quando a pessoa deu um comando (tecla, mouse, dedo): é o "parou de jogar?"
  function marcarComando() { M.ultimoComando = J.t; }

  // para gravar uma pessoa jogando bem com o mouse: o ponto para onde o piloto 'bem' levaria a nave agora (a nave segue o
  // ponteiro com ganho 16, então a velocidade v vira o alvo n + v/16). Não mexe no jogo: só sugere.
  function sugerirAlvo() {
    const n = J.nave; if (!n || J.piloto) return null;
    const [vx, vy] = pilotar(1 / 60);
    return { x: clamp(n.x + vx / 16, 16, W - 16), y: clamp(n.y + vy / 16, 40, H - 24) };
  }

  return {
    J, passo, medidas, aplicarDecisao, novaPartida, reiniciarMedidas, redimensionar, encurtar, marcarComando, sugerirAlvo,
    get largura() { return W; },
  };
}

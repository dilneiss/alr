// O tempo da cena em partículas, num <canvas> por cima do mundo: chuva, tempestade (com raios e trovão), neve,
// ventania (folhas), bolhas (fundo do mar) e estrelas cadentes. Sem movimento reduzido, só fica uma camada parada.

export function criarClima(canvas, { aoRelampago, somLigado, reduzMovimento } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, tipo = 'nada', bolhas = false, cadentes = false, raf = 0, ultimo = 0, proxRaio = 0, raio = null;
  let fino = false, rapido = false, meteoros = 0, t = 0;   // t: relógio em segundos (efeitos que só dependem do tempo)
  let gotas = [], flocos = [], folhas = [], bolhasP = [], riscos = [], pedras = [], brilhos = [], voltas = [];
  let alvo = { chuva: 0, neve: 0, vento: 0, granizo: 0, neblina: 0, geada: 0, calor: 0, aurora: 0, tornado: 0 };
  // densidade desejada 0..1 (as partículas entram e saem aos poucos)
  // o que o vento carrega: folhas e pétalas; areia (deserto, praia); pó de neve (montanha)
  const PALETAS = { folhas: { cores: ['#7cc74a', '#ffb347', '#ff7a59', '#ffd84a'], t: 1 }, areia: { cores: ['#f4cd8a', '#e8b46c', '#fbe2b5'], t: 0.42 }, neve: { cores: ['#ffffff', '#e6f1ff'], t: 0.38 } };
  let paleta = PALETAS.folhas;
  let atual = { chuva: 0, neve: 0, vento: 0, granizo: 0, neblina: 0, geada: 0, calor: 0, aurora: 0, tornado: 0 };

  function medir() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
  ro && ro.observe(canvas);

  const R = Math.random;
  function novaGota(topo) { return { x: R() * (W + 200) - 100, y: topo ? -R() * H : R() * H, v: 900 + R() * 500, l: 14 + R() * 14, a: 0.35 + R() * 0.35 }; }
  function novoFloco(topo) { return { x: R() * W, y: topo ? -10 - R() * H * 0.5 : R() * H, v: 40 + R() * 70, r: 1.6 + R() * 3.4, f: R() * 6.28, a: 0.7 + R() * 0.3 }; }
  function novaFolha(esq) { return { x: esq ? -40 - R() * W * 0.5 : R() * W, y: R() * H * 0.85, v: 380 + R() * 420, r: R() * 6.28, vr: (R() - 0.5) * 8, t: (5 + R() * 5) * paleta.t, c: paleta.cores[Math.floor(R() * paleta.cores.length)], f: R() * 6.28 }; }
  function novaBolha(fundo) { return { x: R() * W, y: fundo ? H + R() * 60 : R() * H, v: 30 + R() * 60, r: 2 + R() * 6, f: R() * 6.28 }; }
  // granizo: pedrinhas de gelo rápidas (caem quase reto e brilham)
  function novaPedra(topo) { return { x: R() * (W + 100) - 50, y: topo ? -R() * H : R() * H, v: 1200 + R() * 700, r: 2.2 + R() * 2.6, a: 0.9, f: R() * 6.28 }; }
  // geada: brilhos parados no ar, piscando devagar
  function novoBrilho() { return { x: R() * W, y: R() * H, r: 1 + R() * 2.2, f: R() * 6.28, vf: 0.6 + R() * 1.4 }; }
  // tornado: partículas girando em volta de um eixo que desce
  function novaVolta(altura) { return { a: R() * 6.28, y: altura == null ? R() * H : altura, raio: 30 + R() * 90, v: 2 + R() * 2.5, vy: 40 + R() * 90, r: 1.5 + R() * 3, c: R() < 0.5 ? '#b9a48a' : '#8f7f6a' }; }

  // densidades por clima (0..1). Os que não estão aqui não têm partícula própria.
  const DENS = {
    chuva: { chuva: 0.55 },
    garoa: { chuva: 0.48, fino: true },
    tempestade: { chuva: 1 },
    nevasca: { neve: 1.25, vento: 0.6 },
    neve: { neve: 1 },
    vento: { vento: 1 },
    vendaval: { vento: 1.5, rapido: true },
    furacao: { vento: 1.35, chuva: 0.5, rapido: true },
    tempestade_areia: { vento: 1.6, rapido: true, areia: true },
    granizo: { granizo: 1 },
    neblina: { neblina: 1 },
    geada: { geada: 1 },
    calor: { calor: 1 },
    aurora: { aurora: 1 },
    chuva_estrelas: { meteoros: 1 },
  };

  // contagem segura: NaN/Infinity nunca podem virar Array.length ("Invalid array length")
  let avisoContagem = false;
  function conta(x, base) {
    const v = Math.round(x * base);
    if (!Number.isFinite(v) || v < 0) {
      if (!avisoContagem) {
        avisoContagem = true;
        console.warn('[clima] densidade inválida, usando 0', { x, base, W, H });
      }
      return 0;
    }
    return v;
  }

  function definir(t, { agua = false, espaco = false, noite = false, paleta: p = 'folhas' } = {}) {
    tipo = t;
    if (PALETAS[p] && PALETAS[p] !== paleta) { paleta = PALETAS[p]; folhas = []; }
    bolhas = agua;
    cadentes = espaco || (noite && t === 'limpo') || t === 'chuva_estrelas' || (noite && t === 'aurora');
    const dentroDagua = agua || espaco;
    const d = dentroDagua ? {} : (DENS[t] || {});
    // areia: a tempestade de areia troca as folhas por grãos do deserto
    if (d.areia && paleta !== PALETAS.areia) { paleta = PALETAS.areia; folhas = []; }
    alvo = {
      chuva: d.chuva || 0,
      neve: d.neve || 0,
      vento: d.vento || 0,
      granizo: d.granizo || 0,
      neblina: d.neblina || 0,
      geada: d.geada || 0,
      calor: d.calor || 0,
      aurora: d.aurora || 0,
      tornado: t === 'tornado' && !dentroDagua ? 1 : 0,
    };
    // limpa o que o clima novo não usa, para não ficar resíduo do anterior
    if (!d.granizo) { pedras = []; atual.granizo = 0; }
    if (!d.geada) { brilhos = []; atual.geada = 0; }
    if (t !== 'tornado') { voltas = []; atual.tornado = 0; }
    fino = !!d.fino;
    rapido = !!d.rapido;
    meteoros = d.meteoros || 0;
    if ((t === 'tempestade' || t === 'furacao') && !dentroDagua) proxRaio = performance.now() + 900;
    if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(passo); }
  }

  function trovao() {
    if (!somLigado()) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ac = trovao.ac || (trovao.ac = new AC());
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const t = ac.currentTime + 0.25, dur = 2.2;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
      let ult = 0; for (let i = 0; i < d.length; i++) { ult = ult * 0.985 + (Math.random() * 2 - 1) * 0.15; d[i] = ult; }
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(ac.destination); src.start(t); src.stop(t + dur + 0.05);
    } catch { /* sem som */ }
  }

  function zigue(x0) {
    const p = [[x0, 0]]; let x = x0, y = 0;
    while (y < H * (0.45 + Math.random() * 0.25)) { y += 18 + Math.random() * 30; x += (Math.random() - 0.5) * 60; p.push([x, y]); }
    return p;
  }

  function passo(agora) {
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    if (!W) medir();
    // densidade sobe e desce devagar (o tempo "chega")
    t += dt;
    for (const k of Object.keys(alvo)) atual[k] += (alvo[k] - atual[k]) * Math.min(1, dt * 0.9);
    ctx.clearRect(0, 0, W, H);
    const vento = atual.vento;
    const inclina = 0.12 + (tipo === 'tempestade' ? 0.22 : 0) + vento * 0.5;
    const vel = rapido ? 1.55 : 1;   // vendaval/furacão/areia: tudo mais rápido

    // chuva
    const nG = conta(atual.chuva * (W / 1280), 380);
    while (gotas.length < nG) gotas.push(novaGota(true));
    if (gotas.length > nG) gotas.length = nG;
    if (gotas.length) {
      // garoa: pingo curto e mais escuro, senão some no céu claro
      ctx.strokeStyle = fino ? 'rgba(92,132,178,1)' : '#d8ecff'; ctx.lineCap = 'round';
      for (const g of gotas) {
        g.y += g.v * dt; g.x += g.v * inclina * dt;
        if (g.y > H || g.x > W + 60) { Object.assign(g, novaGota(true)); g.y = -g.l; }
        const comp = fino ? g.l * 0.62 : g.l;   // garoa: pingo curto e fraco
        ctx.globalAlpha = g.a * (fino ? 0.85 : 1); ctx.lineWidth = fino ? 1.4 : 1.6;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - comp * inclina, g.y - comp); ctx.stroke();
      }
    }
    // neve
    const nF = conta(atual.neve * (W / 1280), 220);
    while (flocos.length < nF) flocos.push(novoFloco(true));
    if (flocos.length > nF) flocos.length = nF;
    if (flocos.length) {
      ctx.fillStyle = '#ffffff';
      for (const f of flocos) {
        f.f += dt * 1.6; f.y += f.v * dt; f.x += Math.sin(f.f) * 22 * dt + vento * 160 * dt;
        if (f.y > H + 8) Object.assign(f, novoFloco(true));
        if (f.x > W + 10) f.x = -10;
        ctx.globalAlpha = f.a; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
    }
    // ventania: folhas e pétalas voando de lado
    const nV = conta(vento, paleta.t < 1 ? 120 : 46);
    while (folhas.length < nV) folhas.push(novaFolha(true));
    if (folhas.length > nV) folhas.length = nV;
    for (const f of folhas) {
      f.x += f.v * vel * dt; f.f += dt * 3 * vel; f.y += Math.sin(f.f) * 60 * dt; f.r += f.vr * dt;
      if (f.x > W + 40) Object.assign(f, novaFolha(true));
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.globalAlpha = 0.9; ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.ellipse(0, 0, f.t * 1.6, f.t * 0.7, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
    // bolhas (fundo do mar)
    const nB = bolhas ? conta(W / 1280, 40) : 0;
    while (bolhasP.length < nB) bolhasP.push(novaBolha(false));
    if (bolhasP.length > nB) bolhasP.length = nB;
    if (bolhasP.length) {
      ctx.strokeStyle = '#e6f7ff'; ctx.lineWidth = 1.5;
      for (const b of bolhasP) {
        b.y -= b.v * dt; b.f += dt * 2; b.x += Math.sin(b.f) * 12 * dt;
        if (b.y < -10) Object.assign(b, novaBolha(true));
        ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, 6.283); ctx.fill();
      }
    }
    // granizo: pedrinhas de gelo caindo rápido
    const nP = conta(atual.granizo * (W / 1280), 150);
    while (pedras.length < nP) pedras.push(novaPedra(true));
    if (pedras.length > nP) pedras.length = nP;
    if (pedras.length) {
      for (const p of pedras) {
        p.y += p.v * dt; p.x += p.v * inclina * 0.35 * dt; p.f += dt * 6;
        if (p.y > H + 10) Object.assign(p, novaPedra(true));
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#eaf6ff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#9fd4ff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1.2, 0, 6.283); ctx.stroke();
      }
    }
    // neblina: faixas claras que deslizam devagar
    if (atual.neblina > 0.01) {
      for (let i = 0; i < 5; i++) {
        const y = H * (0.14 + i * 0.17);
        const balanco = Math.sin(t * 0.3 + i) * 26;
        const g = ctx.createLinearGradient(0, y - 80, 0, y + 80);
        const alfa = (0.2 + i * 0.04) * atual.neblina;
        g.addColorStop(0, 'rgba(238,244,252,0)');
        g.addColorStop(0.45, `rgba(238,244,252,${alfa})`);
        g.addColorStop(1, 'rgba(238,244,252,0)');
        ctx.fillStyle = g;
        ctx.fillRect(balanco, y - 60, W, 120);
      }
    }
    // geada: brilhos de gelo piscando
    const nBrilho = conta(atual.geada * (W / 1280) * 130, 1);
    while (brilhos.length < nBrilho) brilhos.push(novoBrilho());
    if (brilhos.length > nBrilho) brilhos.length = nBrilho;
    if (brilhos.length) {
      for (const b of brilhos) {
        b.f += dt * b.vf;
        const a = 0.25 + 0.55 * Math.abs(Math.sin(b.f));
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x - b.r * 2, b.y); ctx.lineTo(b.x + b.r * 2, b.y); ctx.stroke();
      }
    }
    // calor: ondas subindo e um brilho quente nas bordas
    if (atual.calor > 0.01) {
      ctx.strokeStyle = 'rgba(255,196,96,.85)'; ctx.lineWidth = 3;
      for (let i = 0; i < 44; i++) {
        const x = ((i * 97 + t * 40) % (W + 60)) - 30;
        const y0 = H - ((i * 53 + t * 70) % (H * 0.7));
        ctx.globalAlpha = atual.calor;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + 8 * Math.sin(t * 2 + i), y0 - 18, x, y0 - 36);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(W / 2, H * 0.15, 10, W / 2, H * 0.15, W * 0.75);
      g.addColorStop(0, `rgba(255,228,140,${0.5 * atual.calor})`);
      g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // aurora boreal: fitas coloridas ondulando no alto
    if (atual.aurora > 0.01) {
      const fitas = ['rgba(110,255,196,', 'rgba(120,190,255,', 'rgba(214,140,255,'];
      for (let f = 0; f < 3; f++) {
        ctx.beginPath();
        const baseY = H * (0.12 + f * 0.07);
        for (let x = 0; x <= W; x += 24) {
          const y = baseY + Math.sin(x * 0.004 + t * 0.8 + f) * 42 + Math.sin(x * 0.011 - t * 0.5) * 16;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.45 * atual.aurora;
        ctx.strokeStyle = fitas[f] + '1)';
        ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.stroke();
        ctx.globalAlpha = 0.8 * atual.aurora;
        ctx.lineWidth = 16; ctx.stroke();
      }
    }
    // tornado: funil de poeira girando, mais largo em cima
    const nVolta = conta(atual.tornado * 420, 1);
    while (voltas.length < nVolta) voltas.push(novaVolta());
    if (voltas.length > nVolta) voltas.length = nVolta;
    if (voltas.length && atual.tornado > 0.04) {
      const cx = W / 2;
      for (const v of voltas) {
        v.a += dt * v.v; v.y += v.vy * dt * 0.6;
        if (v.y > H + 20) Object.assign(v, novaVolta(-20));
        const alturaRel = v.y / H;
        const raio = (v.raio + 20) * (0.2 + alturaRel * 0.85);
        const x = cx + Math.cos(v.a) * raio;
        const y = v.y;
        ctx.globalAlpha = 0.6; ctx.fillStyle = v.c;
        ctx.beginPath(); ctx.arc(x, y, v.r, 0, 6.283); ctx.fill();
      }
      // o funil: um degradê curvo, mais fino no chão
      const topo = W * 0.05, base = W * 0.012;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(150,136,116,${0.22 * atual.tornado})`);
      g.addColorStop(1, `rgba(150,136,116,${0.42 * atual.tornado})`);
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - topo, 0);
      ctx.bezierCurveTo(cx - topo * 0.8, H * 0.4, cx - base * 1.4, H * 0.75, cx - base, H);
      ctx.lineTo(cx + base, H);
      ctx.bezierCurveTo(cx + base * 1.4, H * 0.75, cx + topo * 0.8, H * 0.4, cx + topo, 0);
      ctx.closePath(); ctx.fill();
    }
    // estrelas cadentes (espaço e noite limpa)
    if (cadentes && riscos.length < 1 + meteoros * 6 && Math.random() < dt * (0.25 + meteoros * 2.6 + atual.aurora * 0.5)) riscos.push({ x: W * (0.2 + Math.random() * 0.7), y: H * (0.04 + Math.random() * 0.25), v: 700 + Math.random() * 300, vida: 0.9 });
    for (const s of riscos) {
      s.x -= s.v * dt * 0.8; s.y += s.v * dt * 0.35; s.vida -= dt;
      const gr = ctx.createLinearGradient(s.x, s.y, s.x + 120, s.y - 52);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.max(0, Math.min(1, s.vida * 2)); ctx.strokeStyle = gr; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 150, s.y - 66); ctx.stroke();
    }
    riscos = riscos.filter((s) => s.vida > 0);
    // raios
    if (tipo === 'tempestade' && alvo.chuva > 0 && agora > proxRaio) {
      proxRaio = agora + 2600 + Math.random() * 3800;
      raio = { pts: zigue(W * (0.15 + Math.random() * 0.7)), ate: agora + 220 };
      aoRelampago && aoRelampago();
      trovao();
    }
    if (raio && agora < raio.ate) {
      ctx.globalAlpha = 0.95; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 3.2; ctx.shadowColor = '#bfe3ff'; ctx.shadowBlur = 18;
      ctx.beginPath(); raio.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.shadowBlur = 0;
    } else raio = null;
    ctx.globalAlpha = 1;

    const vivo = gotas.length || flocos.length || folhas.length || bolhasP.length || riscos.length || pedras.length || brilhos.length || voltas.length
      || cadentes || alvo.chuva || alvo.neve || alvo.vento || alvo.granizo || alvo.neblina || alvo.geada || alvo.calor || alvo.aurora || alvo.tornado;
    raf = vivo ? requestAnimationFrame(passo) : 0;
    if (!vivo) ctx.clearRect(0, 0, W, H);
  }

  // movimento reduzido: desenha um quadro parado e não anima
  if (reduzMovimento) {
    return {
      definir(t, o = {}) {
        medir(); ctx.clearRect(0, 0, W, H);
        if (o.agua || o.espaco) return;
        ctx.fillStyle = '#fff';
        if (t === 'neve') for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 2, 0, 6.283); ctx.fill(); }
        if (t === 'chuva' || t === 'tempestade' || t === 'garoa') { ctx.strokeStyle = '#d8ecff'; for (let i = 0; i < (t === 'garoa' ? 60 : 120); i++) { const x = Math.random() * W, y = Math.random() * H; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 16); ctx.stroke(); } }
        if (t === 'granizo') { ctx.fillStyle = '#eaf6ff'; for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3, 0, 6.283); ctx.fill(); } }
        if (t === 'nevasca') for (let i = 0; i < 150; i++) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3, 0, 6.283); ctx.fill(); }
        if (t === 'neblina') { ctx.fillStyle = 'rgba(235,242,250,.35)'; ctx.fillRect(0, H * 0.25, W, H * 0.5); }
        if (t === 'geada') { ctx.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 1.6, 0, 6.283); ctx.fill(); } }
        if (t === 'calor') { const g = ctx.createRadialGradient(W / 2, H * 0.15, 10, W / 2, H * 0.15, W * 0.75); g.addColorStop(0, 'rgba(255,236,170,.24)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
        if (t === 'aurora') { ctx.strokeStyle = 'rgba(110,255,196,.6)'; ctx.lineWidth = 26; ctx.beginPath(); for (let x = 0; x <= W; x += 24) { const y = H * 0.16 + Math.sin(x * 0.004) * 42; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.globalAlpha = 1;
      },
      medir, parar() {},
    };
  }
  return { definir, medir, parar() { cancelAnimationFrame(raf); raf = 0; ro && ro.disconnect(); } };
}

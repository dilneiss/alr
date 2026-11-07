// O tempo da cena em partículas, num <canvas> por cima do mundo: chuva, tempestade (com raios e trovão), neve,
// ventania (folhas), bolhas (fundo do mar) e estrelas cadentes. Sem movimento reduzido, só fica uma camada parada.

export function criarClima(canvas, { aoRelampago, somLigado, reduzMovimento } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, tipo = 'nada', bolhas = false, cadentes = false, raf = 0, ultimo = 0, proxRaio = 0, raio = null;
  let gotas = [], flocos = [], folhas = [], bolhasP = [], riscos = [];
  let alvo = { chuva: 0, neve: 0, vento: 0 };      // densidade desejada 0..1 (as partículas entram e saem aos poucos)
  // o que o vento carrega: folhas e pétalas; areia (deserto, praia); pó de neve (montanha)
  const PALETAS = { folhas: { cores: ['#7cc74a', '#ffb347', '#ff7a59', '#ffd84a'], t: 1 }, areia: { cores: ['#f4cd8a', '#e8b46c', '#fbe2b5'], t: 0.42 }, neve: { cores: ['#ffffff', '#e6f1ff'], t: 0.38 } };
  let paleta = PALETAS.folhas;
  let atual = { chuva: 0, neve: 0, vento: 0 };

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

  function definir(t, { agua = false, espaco = false, noite = false, paleta: p = 'folhas' } = {}) {
    tipo = t;
    if (PALETAS[p] && PALETAS[p] !== paleta) { paleta = PALETAS[p]; folhas = []; }
    bolhas = agua;
    cadentes = espaco || (noite && t === 'limpo');
    const dentroDagua = agua || espaco;
    alvo = {
      chuva: dentroDagua ? 0 : t === 'chuva' ? 0.55 : t === 'tempestade' ? 1 : 0,
      neve: dentroDagua ? 0 : t === 'neve' ? 1 : 0,
      vento: dentroDagua ? 0 : t === 'vento' ? 1 : 0,
    };
    if (t === 'tempestade' && !dentroDagua) proxRaio = performance.now() + 900;
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
    for (const k of ['chuva', 'neve', 'vento']) atual[k] += (alvo[k] - atual[k]) * Math.min(1, dt * 0.9);
    ctx.clearRect(0, 0, W, H);
    const vento = atual.vento;
    const inclina = 0.12 + (tipo === 'tempestade' ? 0.22 : 0) + vento * 0.5;

    // chuva
    const nG = Math.round(atual.chuva * (W / 1280) * 380);
    while (gotas.length < nG) gotas.push(novaGota(true));
    if (gotas.length > nG) gotas.length = nG;
    if (gotas.length) {
      ctx.strokeStyle = '#d8ecff'; ctx.lineCap = 'round';
      for (const g of gotas) {
        g.y += g.v * dt; g.x += g.v * inclina * dt;
        if (g.y > H || g.x > W + 60) { Object.assign(g, novaGota(true)); g.y = -g.l; }
        ctx.globalAlpha = g.a; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.l * inclina, g.y - g.l); ctx.stroke();
      }
    }
    // neve
    const nF = Math.round(atual.neve * (W / 1280) * 220);
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
    const nV = Math.round(vento * (paleta.t < 1 ? 120 : 46));
    while (folhas.length < nV) folhas.push(novaFolha(true));
    if (folhas.length > nV) folhas.length = nV;
    for (const f of folhas) {
      f.x += f.v * dt; f.f += dt * 3; f.y += Math.sin(f.f) * 60 * dt; f.r += f.vr * dt;
      if (f.x > W + 40) Object.assign(f, novaFolha(true));
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.globalAlpha = 0.9; ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.ellipse(0, 0, f.t * 1.6, f.t * 0.7, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
    // bolhas (fundo do mar)
    const nB = bolhas ? Math.round((W / 1280) * 40) : 0;
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
    // estrelas cadentes (espaço e noite limpa)
    if (cadentes && riscos.length < 1 && Math.random() < dt * 0.25) riscos.push({ x: W * (0.2 + Math.random() * 0.7), y: H * (0.04 + Math.random() * 0.25), v: 700 + Math.random() * 300, vida: 0.9 });
    for (const s of riscos) {
      s.x -= s.v * dt * 0.8; s.y += s.v * dt * 0.35; s.vida -= dt;
      const gr = ctx.createLinearGradient(s.x, s.y, s.x + 120, s.y - 52);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.max(0, Math.min(1, s.vida * 2)); ctx.strokeStyle = gr; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 120, s.y - 52); ctx.stroke();
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

    const vivo = gotas.length || flocos.length || folhas.length || bolhasP.length || riscos.length || cadentes || alvo.chuva || alvo.neve || alvo.vento;
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
        if (t === 'chuva' || t === 'tempestade') { ctx.strokeStyle = '#d8ecff'; for (let i = 0; i < 120; i++) { const x = Math.random() * W, y = Math.random() * H; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 16); ctx.stroke(); } }
        ctx.globalAlpha = 1;
      },
      medir, parar() {},
    };
  }
  return { definir, medir, parar() { cancelAnimationFrame(raf); raf = 0; ro && ro.disconnect(); } };
}

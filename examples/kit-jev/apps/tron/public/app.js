(function () {
  'use strict';
  const { fmt, el, api, bars, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Tron: Você vs Jev', tagline: 'Uma IA que decide cada curva em milissegundos' });

  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const MOVE_IDS = ['seguir_reto', 'virar_esquerda', 'virar_direita'];
  const SETA = { seguir_reto: '↑', virar_esquerda: '↰', virar_direita: '↱' };
  const NOME_MOVE = { seguir_reto: 'SEGUIR RETO', virar_esquerda: 'VIRAR À ESQUERDA', virar_direita: 'VIRAR À DIREITA' };
  const LBL_MOVE = { seguir_reto: '↑ seguir reto', virar_esquerda: '↰ virar à esquerda', virar_direita: '↱ virar à direita' };
  const CORE = { '#22d3ee': '#e0fbff', '#fb923c': '#fff1e6', '#facc15': '#fffbe0', '#f472b6': '#ffe4f1' };
  const toque = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // seta vetorial do painel de diagnóstico: um traço por movimento; o CSS mostra o da decisão (data-move) e o redesenha ao mudar
  const SETAS_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="s-reto" pathLength="1" d="M20 33V8M12 16l8-8 8 8"/><path class="s-esq" pathLength="1" d="M27 33V19H10M16 13l-6 6 6 6"/><path class="s-dir" pathLength="1" d="M13 33V19h17M24 13l6 6-6 6"/></svg>';
  const piscar = (led) => { if (!reduz && led && led.animate) led.animate([{ opacity: 1, transform: 'scale(1.45)' }, { opacity: 0.55, transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' }); };
  const passo3 = (k) => String(Math.max(0, k | 0)).padStart(3, '0');

  let P = null; // partida atual

  // ------------------------------------------------------------------ renderizador da arena (canvas com camadas)
  const R = (() => {
    const cv = $('arena'), ctx = cv.getContext('2d');
    const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
    const tr = document.createElement('canvas'), trx = tr.getContext('2d');   // brilho (traço grosso)
    const tc = document.createElement('canvas'), tcx = tc.getContext('2d');   // núcleo claro (nunca é coberto)
    let GW = 48, GH = 32, c = 18, dpr = 1, cw = 0, ch = 0, shake = 0, ultimo = performance.now();
    let motos = [], part = [];
    const hud = {};

    function tamanho() {
      const wrap = $('arenaWrap');
      const larg = wrap.clientWidth;
      const topo = wrap.getBoundingClientRect().top + window.scrollY;
      const alt = window.innerWidth > 1180 ? window.innerHeight - topo - 22 : 9999;
      c = Math.max(6, Math.floor(Math.min(larg / GW, alt / GH)));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = c * GW; ch = c * GH;
      for (const k of [cv, bg, tr, tc]) { k.width = Math.round(cw * dpr); k.height = Math.round(ch * dpr); }
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
      for (const g of [ctx, bgx, trx, tcx]) g.setTransform(dpr, 0, 0, dpr, 0, 0);
      fundo(); refazerRastros();
    }
    function fundo() {
      bgx.fillStyle = '#03050b'; bgx.fillRect(0, 0, cw, ch);
      const g = bgx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.7);
      g.addColorStop(0, 'rgba(34,211,238,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      bgx.fillStyle = g; bgx.fillRect(0, 0, cw, ch);
      bgx.lineWidth = 1;
      for (let x = 0; x <= GW; x++) { bgx.strokeStyle = x % 4 === 0 ? 'rgba(34,211,238,0.14)' : 'rgba(34,211,238,0.05)'; bgx.beginPath(); bgx.moveTo(x * c + 0.5, 0); bgx.lineTo(x * c + 0.5, ch); bgx.stroke(); }
      for (let y = 0; y <= GH; y++) { bgx.strokeStyle = y % 4 === 0 ? 'rgba(34,211,238,0.14)' : 'rgba(34,211,238,0.05)'; bgx.beginPath(); bgx.moveTo(0, y * c + 0.5); bgx.lineTo(cw, y * c + 0.5); bgx.stroke(); }
      bgx.save(); bgx.strokeStyle = 'rgba(103,232,249,0.85)'; bgx.lineWidth = 2; bgx.shadowColor = '#22d3ee'; bgx.shadowBlur = 14; bgx.strokeRect(1, 1, cw - 2, ch - 2); bgx.restore();
    }
    const centro = (p) => [(p[0] + 0.5) * c, (p[1] + 0.5) * c];
    function segBrilho(g, m, a, b) {
      const [ax, ay] = centro(a), [bx, by] = centro(b);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = m.hex; g.shadowColor = m.hex; g.shadowBlur = c * 0.9; g.lineWidth = Math.max(2, c * 0.46);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.restore();
    }
    function segNucleo(g, m, a, b) {
      const [ax, ay] = centro(a), [bx, by] = centro(b);
      g.save(); g.lineCap = 'round'; g.strokeStyle = m.core; g.lineWidth = Math.max(1, c * 0.14);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.restore();
    }
    function commit(m, ate) {
      while (m.feitos < ate) { segBrilho(trx, m, m.path[m.feitos - 1], m.path[m.feitos]); segNucleo(tcx, m, m.path[m.feitos - 1], m.path[m.feitos]); m.feitos++; }
    }
    function refazerRastros() {
      trx.clearRect(0, 0, cw, ch); tcx.clearRect(0, 0, cw, ch);
      for (const m of motos) { m.feitos = 1; commit(m, m.path.length - (m.anim ? 1 : 0)); }
    }
    function reset(d) {
      GW = d.W; GH = d.H;
      motos = d.motos.map((m) => ({ ...m, core: CORE[m.hex] || '#fff', path: (m.path || [[m.x, m.y]]).map((p) => [p[0], p[1]]), feitos: 1, anim: null }));
      part = []; for (const k of Object.keys(hud)) delete hud[k];
      tamanho();
    }
    function tick(d) {
      const agora = performance.now();
      const dur = Math.min(d.T * 0.8, 190);
      for (const s of d.motos) {
        const m = motos[s.i]; if (!m) continue;
        const ult = m.path[m.path.length - 1];
        if (m.anim) { commit(m, m.path.length); m.anim = null; }
        if (s.vivo && (ult[0] !== s.x || ult[1] !== s.y)) { m.path.push([s.x, s.y]); m.anim = reduz ? null : { t0: agora, dur }; if (!m.anim) commit(m, m.path.length); }
        m.dir = s.dir;
        if (m.vivo && !s.vivo) boom(m, s.crash || { x: s.x, y: s.y });
        m.vivo = s.vivo;
      }
    }
    function boom(m, pos) {
      const [x, y] = centro([pos.x, pos.y]);
      shake = reduz ? 0 : 7;
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random() * 3.5) * c;
        part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.6 + Math.random() * 0.7, t: 0, cor: Math.random() < 0.3 ? '#ffffff' : m.hex });
      }
      part.push({ anel: true, x, y, t: 0, vida: 0.7, cor: m.hex });
    }
    function moto(m, hx, hy) {
      const [x, y] = centro([hx, hy]);
      const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][m.dir] || 0;
      ctx.save(); ctx.translate(x, y);
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 2.2);
      halo.addColorStop(0, m.hex + '88'); halo.addColorStop(1, m.hex + '00');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, c * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(ang);
      ctx.shadowColor = m.hex; ctx.shadowBlur = c * 1.2; ctx.fillStyle = m.hex;
      rr(ctx, -c * 0.95, -c * 0.36, c * 1.55, c * 0.72, c * 0.3); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = m.core;
      rr(ctx, -c * 0.6, -c * 0.14, c * 1.0, c * 0.28, c * 0.14); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(c * 0.46, 0, c * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function desenharHud(m, hx, hy, ocupados) {
      const d = hud[m.i]; if (!d || c < 12) return;
      const bw = 150, bh = 74;
      const [x, y] = centro([hx, hy]);
      const cand = [[x + c * 1.4, y - bh - c * 1.1], [x - c * 1.4 - bw, y - bh - c * 1.1], [x + c * 1.4, y + c * 1.3], [x - c * 1.4 - bw, y + c * 1.3]]
        .map(([a, b2]) => [Math.max(6, Math.min(cw - bw - 6, a)), Math.max(6, Math.min(ch - bh - 6, b2))]);
      const bate = (a, b2) => ocupados.some((o) => a < o[0] + o[2] + 6 && a + bw + 6 > o[0] && b2 < o[1] + o[3] + 6 && b2 + bh + 6 > o[1]);
      const [bx, by] = cand.find(([a, b2]) => !bate(a, b2)) || cand[0];
      ocupados.push([bx, by, bw, bh]);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = m.hex + '88'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx + (bx > x ? 0 : bw), by + bh / 2); ctx.stroke();
      ctx.fillStyle = 'rgba(3,8,16,0.86)'; rr(ctx, bx, by, bw, bh, 9); ctx.fill();
      ctx.strokeStyle = m.hex; ctx.globalAlpha = 0.8; rr(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, 9); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = m.hex; ctx.fillText('JEV', bx + 9, by + 12);
      ctx.fillStyle = '#cbd5e1'; ctx.fillText(d.fallback ? 'piloto auto' : (d.modo || ''), bx + 34, by + 12);
      ctx.textAlign = 'right'; ctx.fillStyle = d.fallback ? '#f87171' : '#94a3b8'; ctx.fillText(d.fallback ? 'atrasou' : d.lat + ' ms', bx + bw - 9, by + 12); ctx.textAlign = 'left';
      MOVE_IDS.forEach((id, j) => {
        const p = (d.probs && d.probs[id]) || 0, yy = by + 28 + j * 15, on = id === d.move;
        ctx.fillStyle = on ? '#ffffff' : '#94a3b8'; ctx.font = (on ? '900 ' : '700 ') + '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(SETA[id], bx + 10, yy);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, bx + 26, yy - 4, 80, 8, 4); ctx.fill();
        if (p > 0.005) { ctx.fillStyle = on ? m.hex : 'rgba(148,163,184,0.55)'; rr(ctx, bx + 26, yy - 4, Math.max(8, 80 * p), 8, 4); ctx.fill(); }
        ctx.fillStyle = on ? '#ffffff' : '#94a3b8'; ctx.textAlign = 'right'; ctx.fillText(Math.round(p * 100) + '%', bx + bw - 9, yy); ctx.textAlign = 'left';
      });
      ctx.restore();
    }
    function frame(agora) {
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.88; if (shake < 0.3) shake = 0; }
      ctx.drawImage(bg, 0, 0, cw, ch);
      ctx.drawImage(tr, 0, 0, cw, ch);
      const cabecas = [], parciais = [];
      for (const m of motos) {
        const n = m.path.length, last = m.path[n - 1], prev = m.path[n - 2] || last;
        let hx = last[0], hy = last[1];
        if (m.anim) {
          const p = Math.min(1, (agora - m.anim.t0) / m.anim.dur);
          if (p < 1) { hx = prev[0] + (last[0] - prev[0]) * p; hy = prev[1] + (last[1] - prev[1]) * p; segBrilho(ctx, m, prev, [hx, hy]); parciais.push([m, prev, [hx, hy]]); }
          else { commit(m, n); m.anim = null; }
        }
        if (m.vivo) cabecas.push([m, hx, hy]);
      }
      ctx.drawImage(tc, 0, 0, cw, ch);
      for (const [m, a, b] of parciais) segNucleo(ctx, m, a, b);
      for (const [m, hx, hy] of cabecas) moto(m, hx, hy);
      if (part.length) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        part = part.filter((q) => (q.t += dt) < q.vida);
        for (const q of part) {
          const k = 1 - q.t / q.vida;
          if (q.anel) { ctx.strokeStyle = q.cor; ctx.globalAlpha = k; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, (1 - k) * c * 6, 0, Math.PI * 2); ctx.stroke(); continue; }
          q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96;
          ctx.globalAlpha = k; ctx.fillStyle = q.cor; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
        }
        ctx.restore();
      }
      const ocupados = [];
      for (const [m, hx, hy] of cabecas) if (m.ctrl === 'jev') desenharHud(m, hx, hy, ocupados);
      ctx.restore();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(tamanho, 150); });
    tamanho();
    return { reset, tick, hud, tamanho, get cell() { return c; }, get motos() { return motos; } };
  })();

  // ------------------------------------------------------------------ placar, legenda, painéis
  // tabela de recordes do fliperama: um bloco por confronto, iniciais de 3 letras e vitórias do dia
  const INI = {
    jev: { ini: 'JEV', nome: 'Jev', cor: '#19E6FF' }, humano: { ini: 'HUM', nome: 'humanos', cor: '#FF8A00' },
    robo: { ini: 'ROB', nome: 'robô clássico', cor: '#FACC15' }, azul: { ini: 'AZU', nome: 'Jev azul', cor: '#22D3EE' }, rosa: { ini: 'ROS', nome: 'Jev rosa', cor: '#F472B6' },
  };
  function renderPlacar(p) {
    if (!p) return;
    const dd = (n) => String(Math.max(0, n | 0)).padStart(2, '0');
    const bloco = (titulo, grupo, lados) => {
      const linhas = lados.map((k) => ({ ...INI[k], v: (grupo && grupo[k]) || 0 })).sort((a, b) => b.v - a.v);
      return `<tbody><tr class="hs-grupo"><th colspan="3" scope="rowgroup">${titulo}</th></tr>` + linhas.map((l, i) =>
        `<tr style="--c:${l.cor}"><td class="hs-pos">${i && l.v < linhas[0].v ? i + 1 : 1}º</td><td class="hs-ini"><span class="hs-linha"><abbr title="${l.nome}">${l.ini}</abbr><span class="hs-pontos" aria-hidden="true"></span></span></td><td class="hs-pts">${dd(l.v)}</td></tr>`).join('') + '</tbody>';
    };
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(p.dia || '') ? `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}` : 'hoje';
    $('placar').innerHTML =
      `<table class="hs"><caption>vitórias · ${dia}</caption>` +
      bloco('Você × Jev', p.humano, ['jev', 'humano']) + bloco('Jev × Robô clássico', p.robo, ['jev', 'robo']) + bloco('Jev × Jev', p.jevjev, ['azul', 'rosa']) +
      `</table><p class="hs-rodape"><span>partidas <b>${dd(p.partidas)}</b></span>` +
      `<span title="Decisões do Jev que chegaram antes do tick, em todas as partidas de hoje">no tempo <b>${p.pctNoTempo != null ? fmt.pct(p.pctNoTempo) : '—'}</b></span></p>`;
  }
  function renderLegenda(motos) {
    $('legend').innerHTML = '';
    motos.forEach((m) => $('legend').append(el('span', { class: 'lg' + (m.vivo ? '' : ' dead'), 'data-i': m.i }, [el('span', { class: 'sw', style: { background: m.hex, color: m.hex } }), m.ctrl === 'humano' ? 'Você (laranja)' : m.nome.includes(m.cor) ? m.nome : `${m.nome} (${m.cor})`])));
  }
  function renderBrains(motos) {
    const jevs = motos.filter((m) => m.ctrl === 'jev');
    const box = $('brains'); box.innerHTML = '';
    jevs.forEach((m) => {
      const card = el('section', { class: 'brain' + (jevs.length > 1 ? ' compact' : ''), 'data-i': m.i, style: `--c:${m.hex}` });
      card.innerHTML = `<div class="brain-head"><span class="dot" aria-hidden="true"></span><h3>Cérebro do ${jevs.length > 1 ? m.nome : 'Jev'}${jevs.length > 1 ? '' : ' · moto ' + m.cor}</h3><span class="modo-pill" hidden></span></div>
        <div class="brain-dec"><span class="arrow" aria-hidden="true">${SETAS_SVG}</span><div><b>aguardando a largada</b><small>a primeira decisão já foi pedida na contagem</small></div></div>
        <div class="bb"></div>
        <table class="sens"><thead><tr><th></th><th>↑ reto</th><th>↰ esquerda</th><th>↱ direita</th></tr></thead><tbody></tbody></table>`;
      box.append(card);
      bars(card.querySelector('.bb'), { seguir_reto: 0, virar_esquerda: 0, virar_direita: 0 }, { order: 'keys', keys: MOVE_IDS, labels: LBL_MOVE });
    });
  }
  function atualizarBrain(j) {
    const card = document.querySelector(`#brains .brain[data-i="${j.i}"]`);
    if (!card) return;
    card.querySelector('.arrow').dataset.move = MOVE_IDS.includes(j.move) ? j.move : '';
    card.classList.toggle('atrasou', !!j.fallback);
    piscar(card.querySelector('.dot'));
    const dec = card.querySelector('.brain-dec div');
    if (j.fallback) {
      dec.innerHTML = `<b>${NOME_MOVE[j.move]}</b><small class="late"><i class="alerta" aria-hidden="true">!</i> a decisão atrasou → piloto automático (mais espaço)</small>`;
      card.querySelector('.bb').style.opacity = '.45';
      return;
    }
    card.querySelector('.bb').style.opacity = '1';
    const p = (j.probs || {})[j.move] || 0;
    dec.innerHTML = `<b>${NOME_MOVE[j.move]}</b><small>${fmt.pct(p)} de certeza · <b>${j.lat} ms</b> · chegou no tempo ✓</small>`;
    bars(card.querySelector('.bb'), j.probs, { order: 'keys', keys: MOVE_IDS, labels: LBL_MOVE, top: j.move });
    const pill = card.querySelector('.modo-pill');
    if (j.modo) { pill.hidden = false; pill.className = 'modo-pill ' + j.modo; pill.textContent = `modo: ${j.modo}`; }
    const s = j.sensores || {};
    const livres = MOVE_IDS.filter((id) => s[id] && !s[id].bate);
    const maxE = Math.max(0, ...livres.map((id) => s[id].espaco));
    const maxT = Math.max(0, ...livres.map((id) => s[id].territorio));
    const cel = (id, campo) => {
      const o = s[id]; if (!o) return '<td>—</td>';
      if (o.bate) return '<td class="bad">BATE</td>';
      if (campo === 'espaco') return `<td class="${o.espaco === maxE ? 'best' : ''}">${fmt.int(o.espaco)}</td>`;
      if (campo === 'territorio') return `<td class="${o.territorio === maxT ? 'best' : ''}">${fmt.int(o.territorio)}</td>`;
      const beco = o.espaco < Math.min(60, maxE * 0.6);
      return `<td class="${o.risco || beco ? 'warn' : ''}">${o.risco ? 'risco!' : beco ? 'beco' : 'livre'}</td>`;
    };
    card.querySelector('.sens tbody').innerHTML =
      `<tr><td>espaço acessível</td>${MOVE_IDS.map((id) => cel(id, 'espaco')).join('')}</tr>` +
      `<tr><td>território</td>${MOVE_IDS.map((id) => cel(id, 'territorio')).join('')}</tr>` +
      `<tr><td>situação</td>${MOVE_IDS.map((id) => cel(id, 'sit')).join('')}</tr>`;
  }

  // gráfico de latência × prazo
  const spark = { pts: [], T: 400 };
  function desenharSpark() {
    const cv = $('spark'), w = cv.clientWidth || 380, h = cv.clientHeight || 64, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const N = 60, bw = w / N, teto = Math.max(spark.T * 1.6, 1);
    spark.pts.slice(-N).forEach((p, i) => {
      const v = p.ok ? p.lat : spark.T * 1.3;
      const bh = Math.max(2, Math.min(h - 4, (v / teto) * (h - 4)));
      g.fillStyle = p.ok ? 'rgba(57,242,138,0.88)' : 'rgba(255,77,77,0.92)';
      g.fillRect(i * bw + 1, h - bh, Math.max(1, bw - 2), bh);
    });
    const yT = h - (spark.T / teto) * (h - 4);
    g.strokeStyle = 'rgba(255,176,0,0.95)'; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, yT); g.lineTo(w, yT); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,176,0,1)'; g.font = '11px "Share Tech Mono", ui-monospace, Menlo, monospace'; g.fillText(`prazo ${Math.round(spark.T)} ms`, 6, Math.max(11, yT - 5));
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => desenharSpark());
  function atualizarStats(s) {
    $('kDec').textContent = fmt.int(s.decisoes);
    $('kTempo').textContent = s.decisoes ? fmt.pct(s.pctNoTempo) : '—';
    $('kLat').textContent = s.latUltima != null ? `${s.latUltima} ms` : '—';
    $('kLat').title = s.latMedia != null ? `média ${s.latMedia} ms · p90 ${s.latP90} ms` : '';
    $('kTick').textContent = `${s.T} ms`;
    $('kMedia').textContent = s.latMedia != null ? `${s.latMedia} ms` : '—';
    $('kCusto').textContent = fmt.usd(s.custo);
    body.dataset.decisoes = String(s.decisoes);
    body.dataset.notempo = s.decisoes ? s.pctNoTempo.toFixed(3) : '';
  }

  // ------------------------------------------------------------------ fluxo da partida
  // o ícone do botão (pausa ▸ continuar) vem do CSS, pelo data-estado do body
  function setEstado(e) { if (P) P.estado = e; body.dataset.estado = e; $('btnPausa').hidden = !(e === 'rodando' || e === 'pausada' || e === 'contagem'); $('btnSair').hidden = !(e === 'rodando' || e === 'pausada' || e === 'contagem'); $('btnPausa').textContent = e === 'pausada' ? 'Continuar' : 'Pausar'; }
  function mostrar(id) { ['ovIntro', 'ovCount', 'ovPausa', 'ovFim'].forEach((k) => { $(k).hidden = k !== id; }); }
  function aviso(txt) { const a = $('aviso'); a.textContent = txt; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, 7000); }

  async function iniciar(modo) {
    if (P && P.iniciando) return;
    if (P) sair(true);
    P = { iniciando: true, modo };
    body.dataset.modo = modo; body.dataset.vencedor = '';
    LS.set('tron.modo', modo);
    $('dpad').hidden = !(modo === 'humano' && (toque || window.innerWidth < 760));
    try {
      const r = await api('/api/partida', { modo }, { label: 'nova partida' });
      P = { id: r.id, modo, estado: 'aguardando', T: r.T };
      spark.pts = []; spark.T = r.T; desenharSpark();
      conectar();
    } catch (e) {
      P = null; setEstado('idle'); mostrar('ovIntro');
    }
  }

  function conectar() {
    const es = new EventSource(`/api/partida/${encodeURIComponent(P.id)}/sse`);
    const minha = P; minha.es = es;
    const ok = () => P === minha;
    es.addEventListener('inicio', (e) => { if (ok()) onInicio(JSON.parse(e.data)); });
    es.addEventListener('contagem', (e) => { if (ok()) onContagem(JSON.parse(e.data)); });
    es.addEventListener('tick', (e) => { if (!ok()) return; const d = JSON.parse(e.data); if (d._jev) JevKit.record(d._jev); onTick(d); });
    es.addEventListener('pausa', (e) => { if (ok()) { setEstado('pausada'); mostrar('ovPausa'); } });
    es.addEventListener('fim', (e) => { es.close(); if (ok()) onFim(JSON.parse(e.data)); });
    es.onerror = () => { if (ok() && es.readyState === EventSource.CLOSED && P.estado !== 'fim') { aviso('A conexão com a arena caiu. Comece outra partida.'); setEstado('idle'); mostrar('ovIntro'); } };
  }

  function onInicio(d) {
    P.motos = d.motos; P.T = d.T;
    R.reset(d);
    renderLegenda(d.motos); renderBrains(d.motos);
    atualizarStats(d.stats);
    $('arenaInfo').innerHTML = `<span class="ai-modo">${d.nomeModo}</span><span class="ai-passo">passo <b id="kPasso">${passo3(d.k)}</b></span>`;
    setEstado(d.estado);
    if (d.estado === 'pausada') mostrar('ovPausa');
  }
  function onContagem({ n }) {
    setEstado('contagem');
    mostrar('ovCount');
    const cn = $('countN');
    cn.classList.remove('go'); void cn.offsetWidth;
    cn.textContent = n > 0 ? String(n) : 'VAI!';
    if (n === 0) cn.classList.add('go');
    cn.style.animation = 'none'; void cn.offsetWidth; cn.style.animation = '';
    const sub = { humano: toque || window.innerWidth < 760 ? 'Você é a moto LARANJA · deslize ou use as setas abaixo' : 'Você é a moto LARANJA (à direita) · setas ou WASD', robo: 'Jev (azul) × Robô clássico (amarela)', jevjev: 'Jev azul × Jev rosa · uma chamada decide as duas' }[P.modo];
    $('countSub').textContent = sub;
    if (n === 0) setTimeout(() => { if (P && P.estado !== 'pausada' && P.estado !== 'fim') { mostrar(null); setEstado('rodando'); } }, 650);
  }
  function onTick(d) {
    if (P.estado !== 'rodando') { mostrar(null); setEstado('rodando'); }
    P.T = d.T;
    R.tick(d);
    for (const j of d.jev) {
      atualizarBrain(j);
      R.hud[j.i] = { probs: j.probs, move: j.move, modo: j.modo, lat: j.lat, fallback: !!j.fallback };
      spark.pts.push({ lat: j.lat || 0, ok: !j.fallback });
    }
    if (spark.pts.length > 120) spark.pts.splice(0, spark.pts.length - 120);
    spark.T = d.T; desenharSpark();
    atualizarStats(d.stats);
    if (d.mortes && d.mortes.length) { P.motos = P.motos.map((m) => ({ ...m, vivo: d.motos[m.i].vivo })); renderLegenda(P.motos); }
    const kp = $('kPasso'); if (kp) kp.textContent = passo3(d.k);
    body.dataset.k = String(d.k);
    const h = d.motos.find((m) => P.motos[m.i] && P.motos[m.i].ctrl === 'humano');
    if (h) body.dataset.humanoDir = String(h.dir);
    if (d.aviso) aviso(d.aviso);
  }
  function onFim(r) {
    setEstado('fim');
    if (r.abandonada) { mostrar('ovIntro'); return; }
    renderPlacar(r.placar);
    const v = r.vencedor;
    let titulo, cor = '#e8e8ec', lado = 'empate';
    if (!v) titulo = 'EMPATE';
    else if (P.modo === 'humano') { titulo = v.ctrl === 'humano' ? 'VOCÊ VENCEU!' : 'O JEV VENCEU'; lado = v.ctrl === 'humano' ? 'humano' : 'jev'; cor = v.hex; }
    else if (P.modo === 'robo') { titulo = v.ctrl === 'jev' ? 'O JEV VENCEU' : 'O ROBÔ CLÁSSICO VENCEU'; lado = v.ctrl === 'jev' ? 'jev' : 'robo'; cor = v.hex; }
    else { titulo = `JEV ${v.cor.toUpperCase()} VENCEU`; lado = v.cor; cor = v.hex; }
    body.dataset.vencedor = lado;
    const t = $('fimTitulo'); t.textContent = titulo; t.style.setProperty('--cor', cor); // o neon (camadas de brilho) sai do CSS
    $('fimMotivo').textContent = r.motivo;
    const s = r.stats;
    const k = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
    $('fimKpis').innerHTML = k('duração', `${(r.duracao_ms / 1000).toFixed(1).replace('.', ',')} s`) + k('passos', fmt.int(r.k)) + k('decisões do Jev', fmt.int(s.decisoes)) +
      k('no tempo', s.decisoes ? fmt.pct(s.pctNoTempo) : '—') + k('latência média', s.latMedia != null ? `${s.latMedia} ms` : '—') + k('custo da partida', fmt.usd(s.custo));
    setTimeout(() => { if (P && P.estado === 'fim') mostrar('ovFim'); }, 900);
  }
  function sair(silencioso) {
    if (!P) return;
    const p = P; P = null;
    if (p.es) p.es.close();
    if (p.id) fetch(`/api/partida/${encodeURIComponent(p.id)}/sair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {});
    if (!silencioso) { setEstado('idle'); mostrar('ovIntro'); }
  }

  // ------------------------------------------------------------------ controles
  const KEY_DIR = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  function tecla(d) {
    if (!P || P.modo !== 'humano' || !P.id || !['contagem', 'rodando'].includes(P.estado)) return;
    fetch(`/api/partida/${encodeURIComponent(P.id)}/tecla`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir: d }) }).catch(() => {});
    const b = document.querySelector(`#dpad [data-dir="${d}"]`); if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); }
  }
  window.addEventListener('keydown', (e) => {
    const d = KEY_DIR[e.code];
    if (d == null || !P || P.modo !== 'humano' || !['contagem', 'rodando'].includes(P.estado)) return;
    e.preventDefault(); tecla(d);
  });
  let toqueIni = null;
  const cv = $('arena');
  cv.addEventListener('pointerdown', (e) => { toqueIni = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', (e) => {
    if (!toqueIni) return;
    const dx = e.clientX - toqueIni[0], dy = e.clientY - toqueIni[1]; toqueIni = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    tecla(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  });
  document.querySelectorAll('#dpad [data-dir]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); tecla(+b.dataset.dir); }));
  document.querySelectorAll('button[data-modo]').forEach((b) => b.addEventListener('click', () => iniciar(b.dataset.modo)));
  $('btnDeNovo').addEventListener('click', () => iniciar(body.dataset.modo || 'robo'));
  $('btnTrocar').addEventListener('click', () => { sair(true); setEstado('idle'); mostrar('ovIntro'); });
  $('btnInsp').addEventListener('click', () => JevKit.inspector.open());
  $('btnSair').addEventListener('click', () => sair(false));
  const pausar = (v) => { if (P && P.id) fetch(`/api/partida/${encodeURIComponent(P.id)}/pausa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pausar: v }) }).catch(() => {}); };
  $('btnPausa').addEventListener('click', () => { if (!P) return; if (P.estado === 'pausada') { pausar(false); } else pausar(true); });
  $('btnContinuar').addEventListener('click', () => pausar(false));
  document.addEventListener('visibilitychange', () => {
    if (!P || !P.id) return;
    if (document.visibilityState === 'hidden' && ['contagem', 'rodando'].includes(P.estado)) { P.pausadaPelaAba = true; pausar(true); }
    else if (document.visibilityState === 'visible' && P.pausadaPelaAba) { P.pausadaPelaAba = false; pausar(false); }
  });
  // pop-up “Arquitetura” aberto → pausa a partida (ninguém pilota com o diagrama na frente); ao fechar, retoma
  document.addEventListener('jev:diagram', (e) => {
    if (!P || !P.id) return;
    if (e.detail && e.detail.open && ['contagem', 'rodando'].includes(P.estado)) { P.pausadaPeloDiagrama = true; pausar(true); }
    else if (e.detail && !e.detail.open && P.pausadaPeloDiagrama) { P.pausadaPeloDiagrama = false; pausar(false); }
  });
  window.addEventListener('pagehide', () => { if (P && P.id && P.estado !== 'fim') navigator.sendBeacon && navigator.sendBeacon(`/api/partida/${encodeURIComponent(P.id)}/sair`, new Blob(['{}'], { type: 'application/json' })); });

  // ------------------------------------------------------------------ arranque
  R.reset({ W: 48, H: 32, motos: [
    { i: 0, hex: '#22d3ee', x: 17, y: 5, dir: 1, vivo: true, ctrl: 'deco', path: [[3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [9, 8], [9, 7], [9, 6], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5]] },
    { i: 1, hex: '#fb923c', x: 30, y: 26, dir: 3, vivo: true, ctrl: 'deco', path: [[44, 22], [43, 22], [42, 22], [41, 22], [40, 22], [39, 22], [38, 22], [38, 23], [38, 24], [38, 25], [38, 26], [37, 26], [36, 26], [35, 26], [34, 26], [33, 26], [32, 26], [31, 26], [30, 26]] },
  ] });
  setEstado('idle');
  api('/api/info', undefined, { silent: true }).then((r) => { renderPlacar(r.placar); spark.T = r.tick; desenharSpark(); })
    .catch(() => { if (!$('placar').querySelector('.hs')) $('placar').innerHTML = '<p class="hs-carregando hs-off">placar indisponível agora</p>'; });
  const q = new URLSearchParams(location.search).get('modo');
  if (q && ['humano', 'robo', 'jevjev'].includes(q)) iniciar(q);
})();

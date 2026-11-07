/* Carro Autônomo — liga o simulador (sim.js), o renderizador (render.js) e o Jev (via /api/decidir).
   Pipeline: pede a próxima decisão assim que a anterior chega (mínimo 0,33 s entre pedidos); a física não espera.
   Interface em forma de cockpit: para-brisa (canvas), cluster (velocímetro, tela central com a manobra escolhida
   acesa como luz-espia, medidor de perigo), console (partida e comandos) e computador de bordo. */
(function () {
  'use strict';
  const { fmt, el, bars, scoreMeter, toast, escapeHtml } = JevKit;
  JevKit.mountTopbar({ title: 'Carro Autônomo', tagline: 'O Jev dirige: lê os sensores e decide a cada ~0,35 s' });

  const $ = (id) => document.getElementById(id);
  const C = window.CarroSim, RN = window.CarroRender;
  const DT = 1 / 120;          // passo da física (s)
  const MIN_GAP = 330;         // ms mínimos entre pedidos de decisão
  const LINK_MS = 1600;        // sem decisão nova por mais que isso → carro freia por segurança
  const MAX_RUN = Math.min(180, +(new URLSearchParams(location.search).get('maxrun')) || 180); // pausa automática após 3 min rodando (controle de custo; ?maxrun= só pode reduzir, para testes)

  // manobras (a cor e o ícone de cada luz-espia estão em carro.css e no sprite SVG de index.html)
  const ACAO = {
    acelerar: { label: 'Acelerar' },
    manter: { label: 'Manter velocidade' },
    frear_suave: { label: 'Frear suave' },
    frear_forte: { label: 'Frear forte' },
    mudar_para_esquerda: { label: 'Mudar p/ esquerda' },
    mudar_para_direita: { label: 'Mudar p/ direita' },
  };
  const ACAO_IDS = Object.keys(ACAO);
  const MOTIVO = {
    pista_livre: { label: 'pista livre' },
    carro_lento_a_frente: { label: 'carro lento à frente' },
    semaforo_vermelho: { label: 'sinal vermelho' },
    semaforo_amarelo: { label: 'sinal amarelo' },
    pedestre: { label: 'pedestre' },
    obstaculo: { label: 'obstáculo na faixa' },
    limite_de_velocidade: { label: 'limite de velocidade' },
  };
  const MOTIVO_CURTO = { pista_livre: 'pista livre', carro_lento_a_frente: 'carro lento', semaforo_vermelho: 'sinal vermelho', semaforo_amarelo: 'sinal amarelo', pedestre: 'pedestre', obstaculo: 'obstáculo', limite_de_velocidade: 'limite' };
  const PERIGO = ['seguro', 'atenção', 'risco', 'perigo iminente'];
  const PERIGO_COR = ['#6BE39B', '#FFD27A', '#FFB020', '#FF5A4E'];
  const SP_MAX = 80;           // fundo de escala do velocímetro (km/h)
  const MOTIVOS_VAZIO = '<p class="empty">O motivo de cada decisão aparece aqui assim que o Jev assumir o volante.</p>';

  // ------------------------------------------------------------------ estado
  const sim = new C.Sim(7);
  const cv = $('cv');
  const rend = new RN.Renderer(cv, sim);
  const mm = $('minimap'), tapeCv = $('tape');
  const SID = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 36);
  let running = false, pausedReason = 'inicio', speed = 1, epoch = 0;
  let runTime = 0, runSinceStart = 0, lastDecisionAt = 0, nDec = 0, costTotal = 0, lastLat = null, lastR = null, netErrors = 0, budgetOut = false;
  const decTimes = [];      // tempos (runTime) das decisões, para decisões/min
  const tape = [];          // fita: { t, acao, conf }
  const logs = [];          // diário: { t, icon, text, kind }
  const history = [];       // últimas decisões (para o teste e depuração)
  let lastThought = '';
  let rttEma = 380;          // ida e volta média (ms) → compensação de latência nos sensores
  let linkHold = 0;          // até quando (performance.now) o aviso de limite fica no link sem o HUD reescrever

  // ------------------------------------------------------------------ laço de decisões (pipeline)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function decisionLoop(my) {
    while (running && my === epoch) {
      const t0 = performance.now();
      let r;
      try {
        r = await JevKit.api('/api/decidir', { s: sim.sensors(rttEma / 1000), sid: SID, odo: Math.round(sim.ego.odo) }, { silent: true, label: 'direção' });
      } catch (e) {
        if (my !== epoch) return;
        if (e.code === 'budget_exhausted') { budgetOut = true; pause('orcamento'); return; }
        if (e.code === 'rate_limited' || e.status === 429) { setLink('muitas decisões seguidas — aguardando', true); linkHold = performance.now() + 2500; await sleep(2500); continue; }
        if (e.status === 400) { await sleep(400); continue; }
        netErrors++;
        if (netErrors >= 5) { pause('rede'); return; }
        await sleep(700);
        continue;
      }
      netErrors = 0;
      rttEma = rttEma * 0.8 + Math.min(900, performance.now() - t0) * 0.2;
      if (my !== epoch || !running) return;
      onDecision(r);
      const spent = performance.now() - t0;
      if (spent < MIN_GAP) await sleep(MIN_GAP - spent);
    }
  }

  function onDecision(r) {
    sim.applyDecision({ acao: r.acao, motivo: r.motivo, perigo: r.perigo && r.perigo.score });
    lastDecisionAt = performance.now();
    sim.ego.link = 'ok';
    nDec++; costTotal += r.cost || 0; lastLat = r.latency_ms; lastR = r;
    decTimes.push(runTime); while (decTimes.length && decTimes[0] < runTime - 60) decTimes.shift();
    tape.push({ t: runTime, acao: r.acao, conf: (r.prob_acao && r.prob_acao[r.acao]) || r.confianca || 0.5 });
    if (tape.length > 240) tape.shift();
    history.push({ t: sim.t, acao: r.acao, motivo: r.motivo, p: (r.prob_acao && r.prob_acao[r.acao]) || 0, lat: r.latency_ms }); if (history.length > 600) history.shift();
    renderBrain(r);
    updateThought(r);
  }

  // ------------------------------------------------------------------ tela central do cluster: a decisão do Jev
  const TT = {};
  for (const li of document.querySelectorAll('#bars .tt')) TT[li.dataset.k] = { li, pc: li.querySelector('.pc') };
  const iconSvg = (id, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  let lastAcao = null;

  function renderBrain(r) {
    const brain = $('brain');
    const acao = ACAO[r.acao] ? r.acao : 'manter';
    const a = ACAO[acao], m = MOTIVO[r.motivo] || { label: r.motivo };
    const pA = (r.prob_acao && r.prob_acao[r.acao]) || 0;
    brain.dataset.acao = acao;
    if (acao !== lastAcao) {   // troca de manobra: a luz nova acende com um clarão e o nome "engata"
      $('decIc').innerHTML = iconSvg(acao);
      brain.classList.remove('chg'); void brain.offsetWidth; brain.classList.add('chg');
      lastAcao = acao;
    }
    $('decT').textContent = a.label;
    const pm = r.prob_motivo && r.prob_motivo[r.motivo];
    $('decW').textContent = `motivo: ${m.label}` + (pm != null ? ` · ${fmt.pct(pm)}` : '');
    $('decC').innerHTML = `${fmt.pct(pA)}<small>certeza</small>`;
    const opc = new Set(r.opcoes || ACAO_IDS);
    for (const k of ACAO_IDS) {
      const t = TT[k]; if (!t) continue;
      const p = (r.prob_acao && r.prob_acao[k]) || 0, ok = opc.has(k);
      t.li.classList.toggle('on', k === r.acao);
      t.li.classList.toggle('off', !ok);
      t.pc.textContent = ok ? fmt.pct(p) : '—';
      t.li.style.setProperty('--p', ok ? p.toFixed(3) : '0');
      t.li.title = ok ? `${ACAO[k].label}: ${fmt.pct(p, 1)}` : `${ACAO[k].label}: indisponível agora (faixa inexistente, ocupada ao lado ou manobra sem propósito)`;
    }
    bars($('motivos'), r.prob_motivo || {}, { labels: MOTIVO_CURTO, limit: 3 });
    if (r.perigo) {
      const sc = Math.max(0, Math.min(3, +r.perigo.score || 0));
      const lvl = Math.round(sc);
      scoreMeter($('perigo'), r.perigo, { levels: PERIGO, colors: PERIGO_COR });
      $('pgNeedle').style.transform = `rotate(${(150 + 80 * sc).toFixed(1)}deg)`;
      $('pgNum').textContent = fmt.num(sc, 1);
      $('perigoLbl').textContent = cap(PERIGO[lvl]);
      $('perigoLbl').style.color = PERIGO_COR[lvl];
    }
    $('mLat').textContent = fmt.ms(r.latency_ms);
    $('mCost1').textContent = nDec ? (costTotal / nDec).toFixed(6).replace('.', ',').replace(/0+$/, '') : '—';
  }

  function resetBrain() {
    const brain = $('brain');
    brain.dataset.acao = ''; brain.classList.remove('chg'); lastAcao = null;
    $('decIc').innerHTML = '<span class="gear">P</span>';
    $('decT').textContent = 'Aguardando partida'; $('decW').textContent = 'O Jev decide o próximo comando a cada ~0,35 s'; $('decC').innerHTML = '—<small>certeza</small>';
    for (const k of ACAO_IDS) { const t = TT[k]; if (!t) continue; t.li.classList.remove('on', 'off'); t.pc.textContent = '—'; t.li.style.setProperty('--p', '0'); t.li.removeAttribute('title'); }
    $('motivos').innerHTML = MOTIVOS_VAZIO;
    $('perigo').innerHTML = ''; $('perigoLbl').textContent = '—'; $('perigoLbl').style.color = ''; $('pgNum').textContent = '—'; $('pgNeedle').style.transform = '';
    for (const id of ['mLat', 'mRate', 'mCost1', 'mCostMin']) $(id).textContent = '—';
  }

  // "pensamento" mostrado junto do carro (HUD): texto nosso, escolha do Jev
  function thoughtFor(r) {
    const e = sim.ego, v = e.v * 3.6, parado = v < 1.5, a = r.acao, m = r.motivo;
    const lim = C.limitAt(e.s);
    const M = MOTIVO[m] || { label: m };
    const sem = sim.lightFor(e.s + e.len / 2);
    const lider = sim.npcs.some((n) => sim._occupies(n, e.lc ? e.lc.to : e.lane) && C.rel(e.s, n.s) > 0 && C.rel(e.s, n.s) < 65);
    const passando = e.lane === 0 && sim.npcs.some((n) => sim._occupies(n, 1) && C.rel(e.s, n.s) > -12 && C.rel(e.s, n.s) < 70 && n.v < e.v + 0.5);
    if (a === 'acelerar') {
      if (parado && sem && sem.l.cor === 'verde' && sem.d < 25) return 'Sinal abriu → <b>acelerar</b>';
      if (m === 'carro_lento_a_frente' && (passando || (e.lc && e.lc.why === 'ultrapassar'))) return 'Ultrapassando o carro lento → <b>acelerar</b>';
      if (e.lane === 0 || e.lc) return m === 'pista_livre' ? 'Faixa livre → <b>acelerar</b>' : `${cap(M.label)} → <b>acelerar</b>`;
      return m === 'pista_livre' ? 'Pista livre → <b>acelerar</b>' : `${cap(M.label)} → <b>acelerar</b>`;
    }
    if (a === 'manter') {
      if (parado) return `${cap(M.label)} → <b>continuar parado</b>`;
      if (e.lc && m === 'pista_livre') return 'Trocando de faixa → <b>manter a velocidade</b>';
      if (m === 'limite_de_velocidade') return `No limite (${lim} km/h) → <b>manter</b>`;
      if (m === 'carro_lento_a_frente') return lider ? 'Seguindo o carro da frente → <b>manter</b>' : passando || e.lc ? 'Ultrapassando o carro lento → <b>manter</b>' : 'Carro lento à frente → <b>manter</b>';
      if (m === 'semaforo_amarelo') return 'Amarelo perto demais para parar → <b>seguir</b>';
      return `${cap(M.label)} → <b>manter a velocidade</b>`;
    }
    if (a === 'frear_suave') {
      if (m === 'semaforo_vermelho') return parado ? 'Sinal vermelho → <b>esperar parado</b>' : 'Sinal vermelho → <b>frear suave</b>';
      if (m === 'semaforo_amarelo') return 'Sinal amarelo → <b>frear suave</b>';
      if (m === 'pedestre') return parado ? 'Pedestre atravessando → <b>esperar</b>' : 'Pedestre à frente → <b>frear suave</b>';
      if (m === 'carro_lento_a_frente') return parado ? 'Carro parado à frente → <b>esperar</b>' : 'Carro lento à frente → <b>reduzir</b>';
      if (m === 'obstaculo') return parado ? 'Obstáculo → <b>esperar a faixa ao lado</b>' : 'Obstáculo na faixa → <b>frear suave</b>';
      if (m === 'limite_de_velocidade') return lim < C.LIMITE || (sim.ego && nextZone()) ? 'Zona escolar 30 km/h → <b>reduzir</b>' : 'Acima do limite → <b>reduzir</b>';
      if (m === 'pista_livre') return e.lc ? 'Trocando de faixa → <b>reduzir um pouco</b>' : 'Por precaução → <b>frear suave</b>';
      return `${cap(M.label)} → <b>frear suave</b>`;
    }
    if (a === 'frear_forte') return `${cap(M.label)} muito perto → <b>FREAR FORTE</b>`;
    if (a === 'mudar_para_esquerda') {
      if (m === 'carro_lento_a_frente') return 'Carro lento à frente → <b>ultrapassar pela esquerda</b>';
      if (m === 'obstaculo') return 'Obstáculo na faixa → <b>desviar pela esquerda</b>';
      return `${cap(M.label)} → <b>mudar para a esquerda</b>`;
    }
    if (a === 'mudar_para_direita') {
      const bl = sim._laneBlockedAhead(e.lc ? e.lc.from : e.lane);
      if (bl === 'obstaculo') return 'Obstáculo na faixa → <b>desviar pela direita</b>';
      if (bl === 'carro') return 'Carro lento à frente → <b>passar pela direita</b>';
      return 'Ultrapassagem concluída → <b>voltar para a direita</b>';
    }
    return escapeHtml(a);
  }
  function nextZone() { const z = C.ZONES[0], d = C.fwd(sim.ego.s, z.s0); return d < 130; }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function updateThought(r) {
    const th = $('thought');
    const emerg = !!sim.ego.emerg;
    const acao = emerg ? 'frear_forte' : ACAO[r.acao] ? r.acao : 'manter';
    const tx = emerg ? 'Freio de emergência <b>(rede de segurança)</b>' : thoughtFor(r);
    th.hidden = false;
    if (th.dataset.acao !== acao) { th.dataset.acao = acao; $('thIc').setAttribute('href', '#i-' + acao); }
    th.classList.toggle('emerg', emerg);
    if (tx !== lastThought) {
      $('thTx').innerHTML = tx.replace(' → ', ' <span class="arr">→</span> ');
      lastThought = tx; th.classList.remove('flash'); void th.offsetWidth; th.classList.add('flash');
    }
    const pA = (r.prob_acao && r.prob_acao[r.acao]) || 0;
    $('thSub').textContent = `certeza ${fmt.pct(pA)} · decidido em ${fmt.ms(r.latency_ms)}`;
  }

  // ------------------------------------------------------------------ instrumentos (10 Hz)
  let hudAcc = 0, lastStats = {}, lastLim = null;
  $('limit').addEventListener('animationend', (ev) => ev.currentTarget.classList.remove('bump'));   // a placa pulsa e volta ao normal
  function hud(dt, force) {
    hudAcc += dt; if (!force && hudAcc < 0.1) return; hudAcc = 0;
    const e = sim.ego, kmh = e.v * 3.6, lim = C.limitAt(e.s);
    // velocímetro: ponteiro, arco azul até a velocidade e a faixa vermelha a partir do limite
    const spNum = $('spNum');
    spNum.textContent = Math.round(kmh);
    spNum.classList.toggle('over', kmh > lim + 3);
    const rel = 240 * Math.min(1, Math.max(0, kmh / SP_MAX));
    $('spNeedle').style.transform = `rotate(${(150 + rel).toFixed(1)}deg)`;
    $('spArc').style.strokeDasharray = `${rel.toFixed(1)} 999`;
    if (lim !== lastLim) {
      const rl = 240 * Math.min(1, lim / SP_MAX), red = $('spRed');
      red.style.strokeDasharray = `${(240 - rl).toFixed(1)} 999`; red.style.strokeDashoffset = String(-rl);
      lastLim = lim;
    }
    const limEl = $('limit'); if (limEl.textContent !== String(lim)) { limEl.textContent = lim; limEl.classList.remove('bump'); void limEl.offsetWidth; limEl.classList.add('bump'); }
    const ped = $('pedal');
    if (e.a >= 0) { ped.style.left = '50%'; ped.style.width = Math.min(50, (e.a / 3) * 50) + '%'; ped.style.background = 'var(--jev)'; }
    else { const w = Math.min(50, (-e.a / 9) * 50); ped.style.left = 50 - w + '%'; ped.style.width = w + '%'; ped.style.background = e.emerg ? 'var(--vermelho-hi)' : 'var(--ambar)'; }
    const laneTxt = e.lc ? `Trocando → ${e.lc.to === 0 ? 'esquerda' : 'direita'}` : `Faixa da ${e.lane === 0 ? 'esquerda' : 'direita'}`;
    if ($('lane').textContent !== laneTxt) $('lane').textContent = laneTxt;
    const lb = $('laneBox'), laneNow = String(e.lc ? e.lc.to : e.lane);
    if (lb.dataset.lane !== laneNow) lb.dataset.lane = laneNow;
    lb.classList.toggle('moving', !!e.lc);
    const rate = decRate();
    if (running) { if (performance.now() >= linkHold) setLink(e.link === 'lost' ? 'aguardando o Jev…' : `${rate} decisões/min`, e.link === 'lost'); }
    else setLink(pausedReason === 'inicio' ? 'aguardando partida' : 'pausado', false);
    $('mRate').textContent = nDec ? String(rate) : '—';
    $('mCostMin').textContent = runTime > 3 ? ((costTotal / runTime) * 60).toFixed(4).replace('.', ',') : '—';
    const live = $('live'); live.classList.toggle('on', running);
    const st0 = running ? 'ao vivo' : 'parado'; if (live.lastChild.textContent !== st0) live.lastChild.textContent = st0;
    const tt = mmss(runTime); if ($('tripTime').textContent !== tt) $('tripTime').textContent = tt;
    // placar (computador de bordo)
    const st = sim.stats;
    kpi('kDist', st.dist < 1000 ? `${Math.round(st.dist)} m` : `${fmt.num(st.dist / 1000, 2)} km`, null, 'hi');
    kpi('kSin', st.sinais, null, st.sinais + st.paradasVermelho > 0 ? 'good' : '');
    kpi('kAv', st.avancos, null, st.avancos ? 'bad' : st.dist > 150 ? 'good' : '');
    kpi('kCol', st.colisoes, null, st.colisoes ? 'bad' : st.dist > 150 ? 'good' : '');
    kpi('kQuase', st.quase, null, st.quase ? 'bad' : st.dist > 150 ? 'good' : '');
    kpi('kEm', st.emergencias, null, 'key ' + (st.emergencias ? 'bad' : st.dist > 150 ? 'good' : ''));
    const pl = (n, a, b) => `<b>${n}</b> ${n === 1 ? a : b}`;
    const chips = `<span>${pl(st.paradasVermelho, 'parada no vermelho', 'paradas no vermelho')}</span><span>${pl(st.ultrapassagens, 'ultrapassagem', 'ultrapassagens')}</span><span>${pl(st.conesDesviados, 'cone desviado', 'cones desviados')}</span><span>${pl(st.pedestres, 'pedestre', 'pedestres')}</span>${st.vetos ? `<span>${pl(st.vetos, 'troca vetada', 'trocas vetadas')}</span>` : ''}`;
    if ($('chips').dataset.h !== chips) { $('chips').innerHTML = chips; $('chips').dataset.h = chips; }
  }
  function kpi(id, v, sub, cls) {
    const k = $(id), vv = k.querySelector('.v'), s = String(v);
    if (vv.textContent !== s) { vv.textContent = s; if (lastStats[id] != null && id !== 'kDist') { k.classList.remove('bump'); void k.offsetWidth; k.classList.add('bump'); } lastStats[id] = s; }
    if (sub != null) k.querySelector('.s').textContent = sub;
    k.className = 'kpi' + (cls ? ' ' + cls : '') + (k.classList.contains('bump') ? ' bump' : '');
  }
  function decRate() {
    if (!decTimes.length) return 0;
    const win = Math.min(60, Math.max(1, runTime));
    const n = decTimes.filter((t) => t > runTime - 60).length;
    return Math.round((n / win) * 60);
  }
  function setLink(txt, bad) { const l = $('link'); if (l.textContent !== txt) l.textContent = txt; l.classList.toggle('lost', !!bad); }

  // ------------------------------------------------------------------ log de viagem (e avisos no para-brisa)
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const TAG = { sistema: 'Jev', usuario: 'Você', vermelho: 'Parou', obstaculo: 'Parou', sinal: 'Sinal', desvio: 'Desvio', ultrapassagem: 'Ultrap.', pedestre: 'Pedestre', troca: 'Faixa', veto: 'Veto', emergencia: 'Emerg.', colisao: 'Colisão', avanco: 'Avanço', quase: 'Quase', zona: 'Zona' };
  function addLog(ev) {
    logs.unshift(ev); if (logs.length > 120) logs.pop();
    const kind = ev.kind || 'info', tag = TAG[kind] || 'Info';
    const ol = $('log');
    const empty = ol.querySelector('.empty-log'); if (empty) empty.remove();
    const li = el('li', { class: 'new k-' + kind }, [el('span', { class: 'tm', text: mmss(ev.t) }), el('span', { class: 'tag', text: tag }), el('span', { class: 'tx', text: ev.text })]);
    ol.prepend(li);
    while (ol.children.length > 80) ol.lastChild.remove();
    setTimeout(() => li.classList.remove('new'), 700);
    const feed = $('feed');
    const it = el('div', { class: 'k-' + kind }, [el('span', { class: 'tag', text: tag }), el('span', { text: ev.text })]);
    feed.prepend(it);
    while (feed.children.length > 4) feed.lastChild.remove();
    setTimeout(() => it.classList.add('old'), 9000);
    setTimeout(() => it.remove(), 9700);
  }
  function drainEvents() { if (sim.events.length) for (const ev of sim.events.splice(0)) addLog(ev); }

  // ------------------------------------------------------------------ fita de decisões (rodapé da tela central)
  function drawTape() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = tapeCv.clientWidth, h = tapeCv.clientHeight;
    if (!w || !h) return;
    if (tapeCv.width !== Math.round(w * dpr) || tapeCv.height !== Math.round(h * dpr)) { tapeCv.width = Math.round(w * dpr); tapeCv.height = Math.round(h * dpr); }
    const g = tapeCv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const span = 12, top = 13, base = h - 2, hh = base - top;
    const ls = 'letterSpacing' in g;
    g.textBaseline = 'top'; g.textAlign = 'left';
    g.font = '600 10px "Saira Condensed", sans-serif'; if (ls) g.letterSpacing = '1.2px';
    g.fillStyle = '#8494AB';
    g.fillText(w > 300 ? 'DECISÕES DO JEV · ÚLTIMOS 12 s' : 'DECISÕES DO JEV', 0, 0);
    if (w > 300) { g.textAlign = 'right'; g.font = '500 10px "Chivo Mono", monospace'; if (ls) g.letterSpacing = '0px'; g.fillText(nDec ? `${nDec} decisões` : 'agora', w, 0); }
    g.fillStyle = 'rgba(242,244,247,.07)';
    for (let s = 3; s <= span; s += 3) g.fillRect(Math.round(w - (s / span) * w), top, 1, hh);
    g.fillStyle = 'rgba(242,244,247,.16)'; g.fillRect(0, base, w, 1);
    g.fillStyle = '#3AA0FF'; g.fillRect(w - 1, top, 1, hh + 1);   // "agora"
    for (const d of tape) {
      const age = runTime - d.t; if (age > span) continue;
      const x = w - (age / span) * w - 5, bh = Math.max(3, d.conf * hh);
      g.fillStyle = RN.ACAO_COR[d.acao] || '#3AA0FF'; g.globalAlpha = age < 0.4 ? 1 : 0.8;
      g.beginPath(); g.roundRect(x, base - bh, 3, bh, 1); g.fill();
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ sobreposições
  function overlay(kind) {
    const ov = $('overlay'), card = $('ovCard');
    if (!kind) { ov.hidden = true; return; }
    ov.hidden = false;
    ov.classList.toggle('soft', kind === 'usuario');
    ov.dataset.kind = kind;
    const resumo = nDec ? `<div class="fine">${nDec} decisões · ${fmt.num(sim.stats.dist / 1000, 2)} km · custo ${fmt.usd(costTotal)}</div>` : '';
    const btn = (label, icon, cls) => `<button class="ov-btn${cls ? ' ' + cls : ''}" id="ovGo" type="button">${iconSvg(icon)}${label}</button>`;
    const html = {
      inicio: `<p class="eyebrow"><i></i>Pronto para a partida</p><h2>O <span class="jev-text">Jev</span> é o motorista</h2>
        <p>A cada ~0,35 s o carro manda os sensores para o Jev — velocidade, carro da frente, semáforo, pedestres, faixas ao lado — e ele decide: <b>acelerar, manter, frear ou trocar de faixa</b>. Não há piloto automático escondido: sem decisão do Jev, o carro não anda.</p>
        <ul class="route" aria-label="No percurso"><li>2 semáforos</li><li>faixas de pedestres</li><li>obras na pista</li><li>zona escolar 30 km/h</li><li>carros mais lentos</li></ul>
        <button class="start-btn" id="ovGo" type="button">${iconSvg('power')}<span>Dar a partida</span></button>
        <div class="fine">Cada decisão (3 perguntas numa chamada) custa ~US$ 0,00005 · pausa sozinha após 3 min</div>`,
      usuario: `<h2>${iconSvg('pause', 'ov-ic')}Pausado</h2><p>O carro está parado no mesmo ponto. Solte cones na pista, chame um pedestre e continue para ver a reação do Jev.</p>${btn('Continuar', 'play')}${resumo}`,
      auto: `${iconSvg('pause', 'ov-ic')}<h2>Pausa automática</h2><p>3 minutos seguidos dirigindo — pausamos para economizar decisões do Jev. É só continuar.</p>${btn('Continuar dirigindo', 'play')}${resumo}`,
      orcamento: `${iconSvg('fuel', 'ov-ic')}<h2>O orçamento de demonstração acabou por hoje</h2><p>O Jev já dirigiu bastante hoje. Volte amanhã para ver o carro andar de novo!</p>${btn('Tentar de novo', 'reset', 'ghost')}${resumo}`,
      rede: `${iconSvg('antena', 'ov-ic')}<h2>Sem conexão com o Jev</h2><p>O carro parou por segurança porque as decisões não estão chegando.</p>${btn('Tentar de novo', 'reset')}`,
    }[kind] || '';
    card.innerHTML = html;
    const go = $('ovGo'); if (go) go.onclick = () => { if (kind === 'orcamento') budgetOut = false; start(); };
  }

  // ------------------------------------------------------------------ controles
  // botão de partida (o mesmo botão liga e pausa, como o start/stop de um carro)
  const PLAY = { idle: ['▶', 'power', 'Dar a partida'], running: ['⏸', 'pause', 'Pausar'], paused: ['▶', 'play', 'Continuar'] };
  function setPlay(state) {
    const b = $('play'), [g, ic, t] = PLAY[state];
    b.dataset.state = state;
    b.querySelector('.g').textContent = g;
    b.querySelector('.ic use').setAttribute('href', '#i-' + ic);
    b.querySelector('.t').textContent = t;
  }
  function start() {
    if (running || budgetOut) return;
    running = true; pausedReason = null; runSinceStart = 0; linkHold = 0;
    lastDecisionAt = performance.now();
    overlay(null);
    setPlay('running');
    if (!logs.length || logs[0].kind !== 'sistema') addLog({ t: sim.t, icon: '▶', text: sim.t < 0.1 ? 'Partida: o Jev assumiu o volante' : 'O Jev retomou a direção', kind: 'sistema' });
    epoch++; decisionLoop(epoch);
  }
  function pause(reason) {
    if (!running) return;
    running = false; pausedReason = reason; epoch++;
    setPlay('paused');
    if (reason !== 'aba' && reason !== 'inspetor' && reason !== 'diagrama') overlay(reason);
    if (reason === 'auto') addLog({ t: sim.t, icon: '⏸', text: 'Pausa automática após 3 min (controle de custo)', kind: 'sistema' });
    hud(0, true);
  }
  function reset() {
    const was = running;
    if (running) pause('usuario');
    sim.reset(7); rend.snap();
    nDec = 0; costTotal = 0; runTime = 0; runSinceStart = 0; lastR = null; lastThought = '';
    budgetOut = false;   // Reiniciar destrava a partida; se o orçamento seguir esgotado, o próximo pedido volta a avisar
    decTimes.length = 0; tape.length = 0; logs.length = 0; lastStats = {};
    $('log').innerHTML = '<li class="empty-log">Percurso reiniciado. Os eventos aparecem aqui.</li>';
    $('feed').innerHTML = '';
    $('thought').hidden = true;
    resetBrain();
    pausedReason = 'inicio'; overlay('inicio');
    setPlay('idle');
    hud(0, true);
    void was;
  }
  $('play').addEventListener('click', () => (running ? pause('usuario') : start()));
  for (const b of document.querySelectorAll('.seg button')) b.addEventListener('click', () => setSpeed(+b.dataset.speed));
  function setSpeed(v) { speed = v; for (const b of document.querySelectorAll('.seg button')) { const on = +b.dataset.speed === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); } }
  // tecla do console acende o LED quando o comando entra
  function fired(id) { const b = $(id); if (!b) return; b.classList.remove('fired'); void b.offsetWidth; b.classList.add('fired'); clearTimeout(b._fired); b._fired = setTimeout(() => b.classList.remove('fired'), 700); }
  const act = (fn, id) => () => { const r = fn(); if (!r.ok) toast(r.why || 'Não deu agora.', 'err'); else fired(id); drainEvents(); };
  $('btnCone').addEventListener('click', act(() => sim.dropConeAhead(), 'btnCone'));
  $('btnPed').addEventListener('click', act(() => sim.spawnPedestrian(), 'btnPed'));
  $('btnSlow').addEventListener('click', act(() => sim.spawnSlowCar(), 'btnSlow'));
  $('btnReset').addEventListener('click', reset);
  cv.addEventListener('click', (ev) => {
    const r = cv.getBoundingClientRect();
    const p = rend.pickRoad(ev.clientX - r.left, ev.clientY - r.top);
    if (!p || Math.abs(p.d) > C.ROAD + 0.4) { toast('Clique em cima do asfalto da avenida para soltar um cone.'); return; }
    const res = sim.dropCone(p.s, p.d);
    if (!res.ok) toast(res.why, 'err');
    drainEvents();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); running ? pause('usuario') : start(); }
    else if (k === 'c') act(() => sim.dropConeAhead(), 'btnCone')();
    else if (k === 'p') act(() => sim.spawnPedestrian(), 'btnPed')();
    else if (k === 'l') act(() => sim.spawnSlowCar(), 'btnSlow')();
    else if (k === '1' || k === '2') setSpeed(+k);
  });
  // pop-up “Arquitetura” aberto → o carro congela; ao fechar, segue sozinho
  document.addEventListener('jev:diagram', (e) => {
    if (e.detail && e.detail.open) { if (running) pause('diagrama'); }
    else if (pausedReason === 'diagrama') start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) pause('aba');
    else if (!document.hidden && pausedReason === 'aba') start();
  });
  window.addEventListener('resize', () => { rend.resize(); });
  // o para-brisa também muda de tamanho sem a janela mudar (fontes carregando, grade reorganizando)
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(() => rend.resize())).observe($('stage'));
  // Inspetor aberto → o carro congela (o kit redesenha a gaveta a cada decisão; parado, dá para ler o estado com calma)
  function onDrawer() {
    const aberto = !!document.querySelector('.jev-drawer.open');
    if (aberto && running) pause('inspetor');
    else if (!aberto && pausedReason === 'inspetor') start();
  }
  new MutationObserver(() => {
    const d = document.querySelector('.jev-drawer');
    if (d && !d.dataset.observado) { d.dataset.observado = '1'; new MutationObserver(onDrawer).observe(d, { attributes: true, attributeFilter: ['class'] }); onDrawer(); }
  }).observe(document.body, { childList: true });

  // ------------------------------------------------------------------ laço de quadros (60 fps)
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (running) {
      runTime += dt; runSinceStart += dt;
      if (performance.now() - lastDecisionAt > LINK_MS) sim.ego.link = 'lost';
      acc += dt * speed;
      let n = 0; while (acc >= DT && n < 48) { sim.step(DT); acc -= DT; n++; }
      if (runSinceStart >= MAX_RUN) pause('auto');
      if (sim.ego.emerg && lastR) updateThought(lastR);
    } else acc = 0;
    rend.draw(dt);
    drainEvents();
    hud(dt);
    drawTape();
    RN.drawMinimap(mm, sim);
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ odômetro da demo (estatística global)
  async function loadGlobal() {
    try {
      const s = await JevKit.api('/api/stats', undefined, { silent: true });
      if (s.decisoes) {
        const [ip, dp] = (+s.km || 0).toFixed(1).split('.');
        const cells = ip.padStart(4, '0').split('').map((d) => `<b>${d}</b>`).join('') + `<b class="tenth">${dp}</b>`;
        const frase = `Nesta demo o Jev já dirigiu ${fmt.num(s.km, 1)} km e tomou ${fmt.int(s.decisoes)} decisões.`;
        const g = $('global');
        g.title = frase;
        g.innerHTML = `<span class="sr">${frase}</span><span aria-hidden="true">Odômetro da demo</span><span class="dg" aria-hidden="true">${cells}</span><span aria-hidden="true">km</span><span class="odo-n" aria-hidden="true">${fmt.int(s.decisoes)} decisões</span>`;
      }
    } catch {}
  }

  // ------------------------------------------------------------------ início
  overlay('inicio');
  hud(0, true);
  requestAnimationFrame(frame);
  loadGlobal(); setInterval(loadGlobal, 30000);
  if (/[?&]auto\b/.test(location.search)) start();

  // ganchos para o teste de ponta a ponta (somente leitura + ajudas de coordenada)
  window.__carro = {
    sim, rend,
    status: () => ({ running, pausedReason, runTime, t: sim.t, s: sim.ego.s, v: sim.ego.v, lane: sim.ego.lane, lc: !!sim.ego.lc, odo: sim.ego.odo, stats: { ...sim.stats }, nDec, cost: costTotal, lastLat, rate: decRate() }),
    log: () => logs.map((l) => ({ t: l.t, kind: l.kind, text: l.text })),
    decisions: (since) => history.filter((h) => since == null || h.t >= since),
    pointAhead(ahead, lane) {
      const e = sim.ego, ln = lane == null ? (e.lc ? e.lc.to : e.lane) : lane;
      const p = C.pose(e.s + ahead, C.LANE_D[ln]), sp = rend.worldToScreen(p.x, p.y), r = cv.getBoundingClientRect();
      return { x: r.left + sp.x, y: r.top + sp.y };
    },
    laneClear(lane, back, fwdM) { const e = sim.ego; return !sim.npcs.some((n) => sim._occupies(n, lane) && C.rel(e.s, n.s) > -back && C.rel(e.s, n.s) < fwdM); },
  };
})();

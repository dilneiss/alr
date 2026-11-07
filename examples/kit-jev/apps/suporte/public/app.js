(function () {
  'use strict';
  const { fmt, el, api, bars, scoreMeter, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Central de Suporte', tagline: 'Triagem de tickets pelo Jev em milissegundos' });

  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // cores do painel de partidas por nível de prioridade: 0 (P4) … 3 (P1)
  const PRI_HEX = ['#8E8E88', '#F5F5F0', '#FFD23F', '#FF453A'];
  // as mesmas escalas, legíveis sobre o papel do cartão de embarque
  const PRI_PAPEL = ['#B4B2A9', '#6B6B64', '#B87D00', '#D93A2F'];
  const FRU_PAPEL = ['#2E8B3E', '#7EA23A', '#B87D00', '#D8612A', '#D93A2F'];
  const SEN_PAPEL = ['#D93A2F', '#D8612A', '#8E8C84', '#7EA23A', '#2E8B3E'];
  const svg = (d, fill) => `<svg viewBox="0 0 24 24"${fill ? ' fill="currentColor"' : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
  const ICO = {
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
    chat: svg('<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l.9-4.4A8.5 8.5 0 1 1 20.5 12z"/>'),
    cam: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'),
    bolt: svg('<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>', true),
    cache: svg('<path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5"/><path d="M20.5 3.5v5h-5"/><path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5"/><path d="M3.5 20.5v-5h5"/>'),
    alert: svg('<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.2h.01"/>'),
  };
  const CH = { email: { ico: 'mail' }, whatsapp: { ico: 'chat' }, instagram: { ico: 'cam' } };
  const DEP_HINTS = {
    financeiro: 'Cobranças, estornos, reembolsos e nota fiscal', acesso_tecnico: 'Login, senha, acesso e bugs',
    conteudo_pedagogico: 'Aulas, exercícios e certificado', comercial_upgrade: 'Upgrade, preços e empresas',
    retencao_cancelamento: 'Cancelar, pausar ou não renovar', parcerias_imprensa: 'Imprensa, podcasts e parcerias', outro: 'Spam, engano e recados',
  };

  let CFG = null, SEEDS = [], GATES = {};
  const S = {
    running: false, busy: false, hold: false, speed: 1, timer: null, gen: 0, queue: [], results: new Map(),
    lat: [], costs: [], triados: 0, cached: 0, userN: 0, modal: null, detailKey: null, startedAt: 0, finished: false, lote: false,
  };

  // ---------------- utilidades ----------------
  const initials = (n) => (String(n || '?').replace(/^@/, '').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('') || '?').toUpperCase();
  const planoCurto = (p) => String(p || '').replace(/\s*\(.*\)\s*$/, '');
  const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || 'o cliente';
  const fmtMin = (m) => { m = Math.round(m); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const sinaisOn = (r, min = 0.5) => Object.entries(r.sinais).filter(([, p]) => p >= min).sort((a, b) => b[1] - a[1]);
  const semEmoji = (s) => String(s || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const depOf = (id) => CFG.departamentos[id] || CFG.departamentos.outro;
  const gateOf = (id) => GATES[id] || GATES.outro || 'A7';
  const hhmm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // número do "voo": os tickets semente viram JV 001…JV 060; os escritos à mão, JV 901 em diante
  function voo(key) {
    const s = String(key || ''), m = /^t(\d+)$/.exec(s);
    if (m) return 'JV ' + m[1].padStart(3, '0');
    const u = /^u(\d+)$/.exec(s);
    return 'JV ' + (900 + (u ? +u[1] : 0));
  }
  // linguagem de voo: risco de cancelar = última chamada; P1/P2 = prioridade; o resto embarca normalmente
  function situacao(r) {
    const canc = r.sinais ? r.sinais.risco_cancelamento : null;
    if (canc != null && canc >= 0.5) return { txt: 'Última chamada', cls: 'red' };
    if (r.prioridade.nivel >= 2) return { txt: 'Prioridade', cls: 'amber' };
    return { txt: 'Embarcando', cls: 'green' };
  }
  function metaTxt(t) {
    const meta = [CFG.canais[t.canal] || 'E-mail'];
    if (t.handle) meta.push(t.handle);
    if (t.plano) meta.push(planoCurto(t.plano));
    if (t.cliente_ha && t.cliente_ha !== '—') meta.push(`cliente há ${t.cliente_ha}`);
    return meta.join(' · ');
  }
  const chIco = (canal) => el('span', { class: 'ico', html: ICO[(CH[canal] || CH.email).ico] });
  function whoEl(t) {
    return el('div', { class: 'who' }, [
      el('b', { class: 'who-nm', text: t.nome || 'Cliente' }),
      el('span', { class: 'who-meta' }, [chIco(t.canal), metaTxt(t)]),
    ]);
  }
  function msgNodes(t) { return [t.assunto ? el('b', { class: 'subj', text: t.assunto + ' ' }) : null, t.texto]; }
  function frMeter(n) { return el('span', { class: 'fm lv' + n, 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map((i) => el('i', { class: i <= n ? 'on' : null }))); }

  // ---------------- plaquetas split-flap ----------------
  // Cada plaqueta é um <span class="flap"><b>X</b></span>. Ao mudar de letra, a plaqueta "vira" (rotateX a partir da dobradiça).
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const NBSP = '\u00a0';
  const rnd = () => ABC[(Math.random() * ABC.length) | 0];
  const jobs = new Map();
  let flapRaf = 0;
  function flapLoop(now) {
    for (const [w, job] of jobs) if (!w.isConnected || job(now)) jobs.delete(w);
    flapRaf = jobs.size ? requestAnimationFrame(flapLoop) : 0;
  }
  function runJob(w, job) { jobs.set(w, job); if (!flapRaf) flapRaf = requestAnimationFrame(flapLoop); }
  function flaps(n, cls, text) {
    const tiles = [];
    for (let i = 0; i < n; i++) tiles.push(el('span', { class: 'flap' }, [el('b', { text: NBSP })]));
    const w = el('span', { class: 'flaps ' + (cls || '') }, [el('span', { class: 'sr' }), el('span', { class: 'tiles', 'aria-hidden': 'true' }, tiles)]);
    if (text) setFlaps(w, text);
    return w;
  }
  function alvo(w, text) {
    const n = w.querySelectorAll('.flap').length, up = [...String(text || '').toLocaleUpperCase('pt-BR')];
    return Array.from({ length: n }, (_, i) => (up[i] && up[i] !== ' ' ? up[i] : NBSP));
  }
  function setFlaps(w, text) {
    jobs.delete(w);
    const cs = alvo(w, text);
    w.querySelectorAll('.flap b').forEach((b, i) => { b.textContent = cs[i]; });
    const sr = w.querySelector('.sr'); if (sr) sr.textContent = text || '';
  }
  function virar(b, c) {
    if (b.textContent === c) return;
    b.textContent = c;
    b.animate([{ transform: 'rotateX(78deg)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 85, easing: 'cubic-bezier(.3,.7,.4,1)' });
  }
  // Vira as plaquetas até o texto final: cada letra passa por algumas aleatórias, da esquerda para a direita.
  function flipTo(w, text, o = {}) {
    const bs = [...w.querySelectorAll('.flap b')], target = alvo(w, text);
    const sr = w.querySelector('.sr'); if (sr) sr.textContent = text || '';
    if (reduceMotion || !w.isConnected) { jobs.delete(w); bs.forEach((b, i) => { b.textContent = target[i]; }); return; }
    const step = o.step || 55, stagger = o.stagger == null ? 30 : o.stagger, min = o.min == null ? 2 : o.min, extra = o.extra == null ? 4 : o.extra;
    const t0 = performance.now();
    const plan = bs.map((b, i) => ({ b, c: target[i], at: t0 + i * stagger, left: target[i] === NBSP && b.textContent === NBSP ? 0 : min + ((Math.random() * extra) | 0) }));
    runJob(w, (now) => {
      let pend = 0;
      for (const p of plan) {
        if (p.left < 0) continue;
        if (now < p.at) { pend++; continue; }
        if (p.left === 0) { virar(p.b, p.c); p.left = -1; continue; }
        virar(p.b, rnd()); p.left--; p.at = now + step; pend++;
      }
      return !pend;
    });
  }
  // Enquanto o Jev pensa, as plaquetas giram sem parar.
  function spin(w, step = 75) {
    if (reduceMotion) return;
    const bs = [...w.querySelectorAll('.flap b')]; let at = 0;
    runJob(w, (now) => { if (now >= at) { at = now + step; bs.forEach((b) => virar(b, rnd())); } return false; });
  }
  // Plaqueta única com vários caracteres (o lote de 48): gira alguns códigos e para no portão.
  function flipMini(m, text, delay) {
    const b = m.querySelector('b');
    if (reduceMotion) { b.textContent = text; return; }
    const t0 = performance.now() + delay; let left = 3 + ((Math.random() * 3) | 0), at = t0;
    runJob(m, (now) => {
      if (now < at) return false;
      if (!left) { virar(b, text); return true; }
      virar(b, 'A' + (1 + ((Math.random() * 7) | 0))); left--; at = now + 60;
      return false;
    });
  }

  // ---------------- portões (quadro) ----------------
  function buildBoard() {
    const board = $('board'), first = !board.children.length;
    board.innerHTML = '';
    board.classList.toggle('first', first);
    Object.entries(CFG.departamentos).forEach(([id, d], i) => {
      board.append(el('div', { class: 'col', 'data-dep': id, 'data-gate': gateOf(id), style: `--i:${i}` }, [
        el('div', { class: 'col-hd' }, [
          el('span', { class: 'gate-code', text: gateOf(id), title: `Portão ${gateOf(id)}` }),
          el('b', { text: d.curto || d.label, title: `Portão ${gateOf(id)} · ${d.label}` }),
          el('span', { class: 'cnt', text: '0', title: 'Tickets neste portão' }),
          el('span', { class: 'lamp', text: 'Portão livre' }),
          el('span', { class: 'urg', hidden: true }),
        ]),
        el('div', { class: 'col-list' }, [el('div', { class: 'col-empty' }, [el('span', { class: 'ce-k', text: 'Atende' }), DEP_HINTS[id] || ''])]),
      ]));
    });
  }
  function updateColHeader(col) {
    const cards = col.querySelectorAll('.tk');
    col.querySelector('.cnt').textContent = String(cards.length);
    const urg = [...cards].filter((c) => c.dataset.p === 'P1' && !c.classList.contains('done')).length;
    const u = col.querySelector('.urg'); u.hidden = !urg; u.textContent = `${urg} P1`;
    const lamp = col.querySelector('.lamp'), aberto = cards.length > 0;
    col.classList.toggle('open', aberto);
    if (lamp) lamp.textContent = aberto ? 'Embarque' : 'Portão livre';
  }
  const rankOf = (c) => (c.classList.contains('done') ? -10 : 0) + (+c.dataset.score || 0);
  function insertCard(depId, card, semFlip) {
    const col = document.querySelector(`.col[data-dep="${depId}"]`) || document.querySelector('.col[data-dep="outro"]');
    const list = col.querySelector('.col-list');
    const empty = list.querySelector('.col-empty'); if (empty) empty.remove();
    const kids = [...list.querySelectorAll('.tk')].filter((c) => c !== card);
    const before = new Map(kids.map((c) => [c, c.getBoundingClientRect().top]));
    const ref = kids.find((c) => rankOf(c) < rankOf(card));
    list.insertBefore(card, ref || null);
    if (!reduceMotion && !semFlip) for (const [c, top] of before) {
      const dy = top - c.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) c.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    updateColHeader(col);
    return { col, list };
  }

  // o ticket no portão: um canhoto de cartão de embarque
  function makeCard(key, t, r, mine, lote) {
    const ch = CH[t.canal] || CH.email;
    const card = el('article', {
      class: 'tk', tabindex: '0', role: 'button', 'data-key': key, 'data-id': t.id || '', 'data-dep': r.departamento.escolha,
      'data-p': r.prioridade.p, 'data-score': String(r.prioridade.score), style: `--pc:${PRI_HEX[r.prioridade.nivel]}`,
      'aria-label': `${r.prioridade.p} ${r.prioridade.label}: ${t.nome}. ${t.assunto || t.texto}`.slice(0, 180),
    });
    const tags = sinaisOn(r).slice(0, 2).map(([k, p]) => el('span', { class: 'tag warn', text: `${CFG.sinais[k].curto} ${fmt.pct(p)}` }));
    if (mine) tags.unshift(el('span', { class: 'tag mine', text: 'seu ticket' }));
    if (lote) tags.unshift(el('span', { class: 'tag', text: 'lote', title: 'Triado no lote do backlog (3 perguntas). Clique para a triagem completa.' }));
    if (r.cached) tags.push(el('span', { class: 'tag cache', text: 'cache', title: 'Resposta do Jev reaproveitada do cache (custo zero)' }));
    const fr = r.frustracao;
    card.append(
      el('div', { class: 'tk-top' }, [
        el('span', { class: 'pchip', text: r.prioridade.p, title: `Prioridade ${r.prioridade.label} (score ${fmt.num(r.prioridade.score, 2)})` }),
        el('span', { class: 'nm', text: t.nome || 'Cliente' }),
        el('span', { class: 'ch', title: CFG.canais[t.canal], html: ICO[ch.ico] }),
      ]),
      el('span', { class: 'perf', 'aria-hidden': 'true' }),
      el('div', { class: 'tk-txt' }, msgNodes(t)),
      el('div', { class: 'tk-bot' }, [
        el('div', { class: 'tk-tags' }, tags),
        fr ? el('span', { class: 'fr' + (fr.nivel >= 3 ? ' hot' : ''), title: `Frustração: ${fr.label} (${fmt.num(fr.score, 1)} de 4)` }, [frMeter(fr.nivel), fr.nivel >= 3 ? fmt.num(fr.score, 1) : null]) : null,
      ]),
    );
    card.addEventListener('click', () => openDetail(key));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(key); } });
    return card;
  }

  // ---------------- voo do ticket até o portão ----------------
  async function fly(card, fromEl, list) {
    const col = list.closest('.col'), board = $('board');
    if (board.scrollWidth > board.clientWidth + 4) board.scrollLeft = Math.max(0, col.offsetLeft - 8);
    card.style.visibility = 'hidden';
    const lr = list.getBoundingClientRect(); let cr = card.getBoundingClientRect();
    if (cr.top < lr.top + 4 || cr.bottom > lr.bottom - 4) { list.scrollTop += cr.top - lr.top - Math.max(8, (lr.height - cr.height) / 2); cr = card.getBoundingClientRect(); }
    const land = () => {
      card.style.visibility = '';
      card.classList.remove('landed'); void card.offsetWidth; card.classList.add('landed');
      col.classList.remove('hit'); void col.offsetWidth; col.classList.add('hit');
    };
    if (reduceMotion || !fromEl || !fromEl.isConnected) return land();
    const fr = fromEl.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('ghost'); ghost.removeAttribute('tabindex'); ghost.removeAttribute('role'); ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { position: 'fixed', left: cr.left + 'px', top: cr.top + 'px', width: cr.width + 'px', height: cr.height + 'px', margin: '0', visibility: 'visible', zIndex: '70' });
    document.body.append(ghost);
    const dx = (fr.left + fr.width / 2) - (cr.left + cr.width / 2), dy = (fr.top + fr.height / 2) - (cr.top + cr.height / 2);
    const sx = Math.max(1, Math.min(1.7, fr.width / cr.width));
    try {
      await ghost.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, 1.08)`, opacity: 0 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.06)`, opacity: 1, offset: 0.16 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.42 - 34}px) scale(1.04) rotate(-2deg)`, opacity: 1, offset: 0.56 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ], { duration: S.speed > 1 ? 450 : 780, easing: 'cubic-bezier(.4,.1,.25,1)' }).finished;
    } catch { /* animação cancelada */ }
    ghost.remove();
    land();
  }

  // ---------------- painel de partidas: o ticket chegando ----------------
  function setStage(...nodes) { $('arr-stage').replaceChildren(...nodes); }
  function stageMessage(title, text, cls) { setStage(el('div', { class: 'arr-empty ' + (cls || '') }, [el('b', { text: title }), text ? el('span', { text }) : null])); }
  function renderArrival(t, key) {
    const tick = el('div', { class: 'arr-ticket reading' }, [
      el('span', { class: 'fl-hora mono', text: hhmm() }),
      el('span', { class: 'fl-voo mono', text: voo(key || t.id) }),
      el('div', { class: 'fl-cli' }, [whoEl(t), el('div', { class: 'msg' }, msgNodes(t))]),
    ]);
    const dest = flaps(10, 'fl-dest'), gate = flaps(2, 'fl-gate'), sit = flaps(14, 'fl-sit amber');
    const timer = el('b', { class: 'mono', text: '0 ms' });
    const info = el('div', { class: 'dec-info' }, [el('div', { class: 'reading' }, [el('span', { class: 'jev-spinner' }), `Jev lendo o ticket e respondendo ${CFG.n_perguntas} perguntas…`, timer])]);
    const dec = el('div', { class: 'arr-decision' }, [dest, gate, sit, info]);
    const row = el('div', { class: 'arr-row' }, [tick, dec]);
    setStage(row);
    spin(dest); spin(gate);
    flipTo(sit, 'Em triagem', { step: 45, stagger: 18, min: 1, extra: 2 });
    return { row, tick, dec, timer, dest, gate, sit, info };
  }
  // A decisão chega: as plaquetas viram até o destino, o portão e a situação do voo.
  function showDecision(view, r) {
    const id = r.departamento.escolha, s = situacao(r);
    const o = S.speed > 1 ? { step: 42, stagger: 16, min: 1, extra: 2 } : { step: 52, stagger: 26, min: 2, extra: 3 };
    jobs.delete(view.dest); jobs.delete(view.gate);
    flipTo(view.dest, depOf(id).curto || depOf(id).label, o);
    flipTo(view.gate, gateOf(id), { ...o, stagger: 70 });
    view.sit.className = 'flaps fl-sit ' + s.cls;
    flipTo(view.sit, s.txt, o);
    view.info.replaceChildren(chipsFor(r), tookEl(r));
  }
  function chipsFor(r) {
    const id = r.departamento.escolha, d = depOf(id);
    const chips = [
      el('span', { class: 'dchip dep', title: 'Departamento escolhido e a probabilidade que o Jev deu a ele' }, [el('span', { class: 'gc', text: gateOf(id) }), d.label, el('i', { text: fmt.pct(r.departamento.confianca) })]),
      el('span', { class: 'dchip pri', 'data-p': r.prioridade.p, style: `--pc:${PRI_HEX[r.prioridade.nivel]}` }, [`${r.prioridade.p} · ${r.prioridade.label}`]),
      el('span', { class: 'dchip fru', title: `Frustração ${fmt.num(r.frustracao.score, 1)} de 4` }, [frMeter(r.frustracao.nivel), r.frustracao.label]),
      ...sinaisOn(r).slice(0, 3).map(([k, p]) => el('span', { class: 'dchip warn' }, [`${CFG.sinais[k].curto} `, el('i', { text: fmt.pct(p) })])),
      el('span', { class: 'dchip macro', title: 'Resposta pronta sugerida' }, [el('span', { class: 'k', text: 'Resposta' }), r.macro.titulo]),
    ];
    chips.forEach((c, i) => { c.style.animationDelay = `${120 + i * 60}ms`; });
    return el('div', { class: 'dchips' }, chips);
  }
  function tookEl(r) {
    if (r.cached) return el('div', { class: 'took', html: `${ICO.cache}<span>resposta do Jev reaproveitada do cache · <b>US$ 0</b> · ${r.n_perguntas} perguntas</span>` });
    return el('div', { class: 'took', html: `${ICO.bolt}<span>decidido em <b class="fast">${fmt.ms(r.latency_ms)}</b> · <b>${r.n_perguntas}</b> perguntas numa única chamada · <b>${fmt.usd(r.cost)}</b></span>` });
  }

  // ---------------- próximos da fila (as linhas de baixo do painel) ----------------
  let filaSig = '';
  function renderQueue() {
    const box = $('arr-next'); if (!box || !CFG) return;
    const next = S.queue.slice(0, 2);
    const sig = next.map((t) => t.id).join(',') + '|' + next.length;
    if (sig === filaSig) return;
    filaSig = sig;
    const rows = next.map((t, i) => {
      const sit = flaps(14, 'fl-sit dim');
      return { sit, txt: 'Na fila', li: el('li', { class: 'nx', style: `--k:${i}` }, [
        el('span', { class: 'fl-hora mono', text: '--:--' }),
        el('span', { class: 'fl-voo mono', text: voo(t.id) }),
        el('span', { class: 'fl-cli' }, [el('b', { text: t.nome || 'Cliente' }), el('span', { class: 'who-meta' }, [chIco(t.canal), CFG.canais[t.canal] || 'E-mail'])]),
        flaps(10, 'fl-dest dim'), flaps(2, 'fl-gate dim'), sit,
      ]) };
    });
    // quando a fila acaba, as linhas continuam no painel (a altura não muda): "fim da fila" e plaquetas em branco
    for (let i = rows.length; i < 2; i++) {
      const fim = i === next.length;
      rows.push({ sit: null, li: el('li', { class: 'nx vazio', style: `--k:${i}` }, [
        el('span', { class: 'fl-hora mono', text: '--:--' }),
        el('span', { class: 'fl-voo mono', text: '—' }),
        el('span', { class: 'fl-cli' }, [el('b', { text: fim ? 'Fim da fila' : NBSP })]),
        flaps(10, 'fl-dest dim'), flaps(2, 'fl-gate dim'), flaps(14, 'fl-sit dim'),
      ]) });
    }
    box.replaceChildren(...rows.map((x) => x.li));
    rows.forEach((x, i) => { if (x.sit) flipTo(x.sit, x.txt, { step: 50, stagger: 22 + i * 6, min: 1, extra: 3 }); });
  }

  // ---------------- métricas ----------------
  function bump(id) { const k = $(id).closest('.kpi'); k.classList.remove('bump'); void k.offsetWidth; k.classList.add('bump'); }
  function updateKpis(changed) {
    $('k-triados').textContent = fmt.int(S.triados);
    $('k-triados-s').textContent = S.finished ? 'caixa zerada' : `${S.queue.length} na fila`;
    const lat = mean(S.lat), L = S.loteInfo;
    if (lat != null) { $('k-lat').textContent = fmt.ms(lat); $('k-lat-s').textContent = `${CFG.n_perguntas} perguntas por ticket · ${S.lat.length} ao vivo`; }
    else if (L) { $('k-lat').textContent = fmt.ms(L.wall); $('k-lat-s').textContent = `lote de ${L.n} tickets · ${L.chamadas} chamadas paralelas`; }
    else { $('k-lat').textContent = '—'; $('k-lat-s').textContent = `${CFG.n_perguntas} perguntas por ticket`; }
    const c = mean(S.costs);
    if (c != null) { $('k-custo').textContent = fmt.usd(c * 1000); $('k-custo-s').textContent = `${fmt.usd(c)} por ticket`; }
    else if (L && !L.cached) { $('k-custo').textContent = fmt.usd((L.cost / L.n) * 1000); $('k-custo-s').textContent = `no lote: ${fmt.usd(L.cost)} por ${L.n} tickets`; }
    else { $('k-custo').textContent = '—'; $('k-custo-s').textContent = '1 chamada por ticket'; }
    $('k-tempo').textContent = fmtMin(S.triados * CFG.minutos_por_ticket);
    const nLote = Math.min(CFG.lote.max, S.queue.length);
    const lb = $('lote'); lb.disabled = S.lote || !nLote;
    lb.textContent = S.lote ? 'Triando o backlog…' : nLote ? `Backlog: ${nLote} de uma vez` : 'Fila vazia';
    if (changed) ['k-triados', 'k-lat', 'k-custo', 'k-tempo'].forEach(bump);
    renderQueue();
    updateStatus();
  }
  function record(r) {
    S.triados++;
    if (r.cached) S.cached++; else { S.lat.push(r.latency_ms); S.costs.push(r.cost); if (S.lat.length > 500) { S.lat.shift(); S.costs.shift(); } }
    updateKpis(true);
    if (S.triados % 5 === 0) loadGlobal();
  }
  async function loadGlobal() {
    try {
      const s = await api('/api/stats', undefined, { silent: true });
      $('global').innerHTML = '';
      $('global').append(
        el('span', { html: `<b>${fmt.int(s.triados)}</b> tickets já triados por visitantes desta demo` }),
        el('span', { html: `<b>${fmt.int(s.escritos)}</b> escritos à mão` }),
        el('span', { html: `<b>${fmt.int(s.p1)}</b> marcados como P1` }),
      );
    } catch { /* contador é opcional */ }
  }

  // ---------------- status / botões ----------------
  function updateStatus(reason) {
    const st = $('status');
    let cls = '', txt, tip;
    if (S.finished) { cls = 'done'; txt = 'zerada'; tip = 'Caixa zerada: todos os tickets foram triados'; }
    else if (S.lote) { cls = 'live'; txt = 'lote'; tip = 'Triando o backlog em lote'; }
    else if (S.running && document.hidden) { cls = 'warn'; txt = 'pausado'; tip = 'Pausado enquanto a aba está oculta (não gasta nada)'; }
    else if (S.running && S.modal) { cls = 'warn'; txt = 'pausado'; tip = 'Pausado enquanto você lê o ticket'; }
    else if (S.running) { cls = 'live'; txt = S.speed > 1 ? 'ao vivo · 2×' : 'ao vivo'; tip = `Ao vivo · ${S.queue.length} na fila`; }
    else { txt = 'parado'; tip = reason || `Parado · ${S.queue.length} na fila`; }
    st.className = 'status ' + cls; st.textContent = txt; st.title = tip;
    $('arrival').classList.toggle('live', (S.running && !document.hidden && !S.modal) || S.lote);
  }
  // o rótulo do botão principal em cada estado; as mensagens que mandam clicar nele usam o mesmo texto
  const rotuloPlay = () => (S.running ? 'Pausar caixa' : S.finished ? 'Recomeçar caixa ao vivo' : S.triados ? 'Continuar caixa ao vivo' : 'Iniciar caixa ao vivo');
  function updatePlay() {
    const b = $('play');
    b.classList.toggle('running', S.running);
    b.dataset.st = S.running ? 'pause' : S.finished ? 'again' : 'play';
    b.textContent = rotuloPlay();
    updateStatus();
  }
  // Falha do Jev num ticket: a linha do painel continua com "ATRASADO" e o erro, e a dica entra numa linha embaixo.
  // Devolve false se a linha do erro já saiu do painel (aí quem chamou mostra a mensagem no lugar).
  function dicaNoErro(texto) {
    const erro = $('arr-stage').querySelector('.arr-error');
    if (erro) erro.after(el('div', { class: 'took', text: texto }));
    return !!erro;
  }

  // ---------------- laço da caixa ao vivo ----------------
  function schedule(ms) { clearTimeout(S.timer); S.timer = setTimeout(loop, ms); }
  function resume(delay) { if (S.running && !S.busy && !S.hold && !S.modal && !document.hidden) schedule(delay == null ? 450 : delay); updateStatus(); }
  async function loop() {
    if (!S.running) return;
    if (S.busy || S.hold || S.modal || document.hidden) { if (S.busy || S.hold) schedule(300); return; }
    const t = S.queue.shift();
    if (!t) return finish();
    updateKpis();
    const started = performance.now();
    let r;
    try { r = await processTicket(t, t.id); }
    catch (e) { if (S.queue[0] !== t) S.queue.unshift(t); pauseLoop(`Pausado: ${e.message || 'erro'}`); updateKpis(); return; }
    if (!r) return; // reiniciado no meio
    if (!S.queue.length) return finish();
    if (!S.running) { stageMessage('Caixa pausada.', `Clique em “${rotuloPlay()}” — ou abra um ticket num portão para ver tudo o que o Jev decidiu.`); updatePlay(); return; }
    stageMessage('Aguardando o próximo ticket…', `${S.queue.length} na fila`, 'waiting');
    const cycle = S.speed > 1 ? 1150 : 2000 + Math.random() * 1000;
    schedule(Math.max(120, cycle - (performance.now() - started)));
  }
  function startLoop() {
    if (S.finished || !S.queue.length) resetAll();
    S.running = true; if (!S.startedAt) S.startedAt = performance.now();
    updatePlay();
    if (!S.busy) stageMessage('Abrindo a caixa de entrada…', `${S.queue.length} tickets na fila`);
    resume(250);
  }
  function pauseLoop(reason) {
    S.running = false; clearTimeout(S.timer); updatePlay(); updateStatus(reason);
    const erro = reason && reason.startsWith('Pausado:'), botao = `Clique em “${rotuloPlay()}”`;
    if (S.busy || (erro && dicaNoErro(`${botao} para tentar de novo.`))) return;
    stageMessage(erro ? 'O Jev não respondeu agora.' : 'Caixa pausada.', erro ? reason.replace('Pausado: ', '') + ` ${botao} para tentar de novo.` : `${botao} — ou abra um ticket num portão para ver tudo o que o Jev decidiu.`, reason ? 'err' : '');
  }
  function finish() {
    S.running = false; S.finished = true; clearTimeout(S.timer);
    const jevS = S.lat.reduce((a, b) => a + b, 0) / 1000;
    const jevTxt = S.lat.length ? ` O Jev gastou ${fmt.num(jevS, 1)} s no total (${fmt.ms(mean(S.lat))} por ticket);` : '';
    stageMessage(`Caixa zerada! ${S.triados} tickets triados.`, `${jevTxt} uma pessoa levaria ~${fmtMin(S.triados * CFG.minutos_por_ticket)} só para ler, classificar e escolher a resposta. Clique em qualquer ticket para ver as probabilidades.`.trim(), 'done');
    updatePlay(); updateKpis();
  }
  function resetAll() {
    S.gen++; S.running = false; S.busy = false; S.hold = false; clearTimeout(S.timer);
    S.results.clear(); S.lat = []; S.costs = []; S.triados = 0; S.cached = 0; S.startedAt = 0; S.finished = false; S.loteInfo = null;
    document.querySelectorAll('.tk.ghost').forEach((g) => g.remove());
    const q = SEEDS.slice(0, 16), rest = SEEDS.slice(16);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    S.queue = [...q, ...rest];
    buildBoard();
    stageMessage('A caixa de entrada está parada.', 'Clique em “Iniciar caixa ao vivo”: chega um ticket novo a cada 2–3 s e o Jev decide para qual portão ele vai — ou escreva o seu.');
    updatePlay(); updateKpis();
  }

  // Um ticket: chega ao painel → Jev decide (1 chamada) → as plaquetas viram → embarca no portão.
  async function processTicket(t, key, mine) {
    const gen = S.gen;
    S.busy = true;
    try {
      const view = renderArrival(t, key);
      const t0 = performance.now(); let raf = 0;
      const tickFn = () => { view.timer.textContent = `${Math.round(performance.now() - t0)} ms`; raf = requestAnimationFrame(tickFn); };
      raf = requestAnimationFrame(tickFn);
      let r;
      try {
        r = await api('/api/triar', t.id ? { id: t.id } : { ticket: t }, { silent: true, label: t.id ? `ticket de ${t.nome}` : 'ticket escrito' });
      } catch (e) {
        cancelAnimationFrame(raf);
        if (gen !== S.gen) return null;
        view.tick.classList.remove('reading');
        jobs.delete(view.dest); jobs.delete(view.gate);
        view.sit.className = 'flaps fl-sit red'; flipTo(view.sit, 'Atrasado', { step: 45, stagger: 18, min: 1, extra: 2 });
        view.info.replaceChildren(el('div', { class: 'arr-error', html: `${ICO.alert}<span></span>` }));
        view.info.querySelector('.arr-error span').textContent = e.message || 'Falha ao falar com o Jev.';
        toast(e.message || 'Falha ao falar com o Jev.', 'err');
        throw e;
      }
      cancelAnimationFrame(raf);
      if (gen !== S.gen) return null;
      view.tick.classList.remove('reading');
      showDecision(view, r);
      record(r);
      const card = makeCard(key, t, r, mine);
      S.results.set(key, { key, t, r, card });
      await wait(S.speed > 1 ? 300 : 1000);
      if (gen !== S.gen) return null;
      const { list } = insertCard(r.departamento.escolha, card);
      view.row.classList.add('leaving');
      await fly(card, view.tick, list);
      if (gen !== S.gen) return null;
      return r;
    } finally {
      if (gen === S.gen) S.busy = false;
    }
  }

  // ---------------- detalhe: o cartão de embarque ----------------
  function openModal(id) {
    S.modal = id; const m = $(id); m.hidden = false;
    clearTimeout(S.timer); updateStatus();
    const f = m.querySelector('[data-autofocus]') || m.querySelector('button, textarea, input');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
  }
  function closeModal() {
    if (!S.modal) return;
    const id = S.modal; $(id).hidden = true; S.modal = null;
    if (id === 'detail' && S.detailKey) { const it = S.results.get(S.detailKey); if (it && it.card.isConnected) it.card.focus({ preventScroll: true }); }
    resume(600);
  }

  async function completarDoLote(item) {
    if (item.loading) return false;
    item.loading = true; item.card.classList.add('loading');
    try {
      const r = await api('/api/triar', { id: item.t.id }, { label: `detalhe de ${item.t.nome}` });
      const novo = makeCard(item.key, item.t, r, false, false);
      if (item.card.classList.contains('done')) novo.classList.add('done');
      const antigo = item.card; item.r = r; item.full = true; item.card = novo;
      if (antigo.isConnected) {
        const colAntiga = antigo.closest('.col');
        antigo.replaceWith(novo);
        if (r.departamento.escolha !== colAntiga.dataset.dep) { insertCard(r.departamento.escolha, novo); updateColHeader(colAntiga); }
        else updateColHeader(colAntiga);
      }
      return true;
    } catch { return false; }
    finally { item.loading = false; item.card.classList.remove('loading'); }
  }

  async function openDetail(key) {
    const item = S.results.get(key); if (!item) return;
    if (item.lote && !item.full && !(await completarDoLote(item))) return;
    const { t, r } = item; S.detailKey = key;
    const depId = r.departamento.escolha, d = depOf(depId), sit = situacao(r);
    const box = $('detail');
    Object.assign(box.dataset, { dep: depId, p: r.prioridade.p, reembolso: String(r.sinais.pede_reembolso), macro: r.macro.escolha });
    $('d-voo').textContent = voo(key);
    $('d-dep').replaceChildren(d.curto || d.label, el('i', { text: fmt.pct(r.departamento.confianca) }));
    $('d-gate').textContent = gateOf(depId);
    const pri = $('d-pri'); pri.dataset.p = r.prioridade.p; pri.textContent = `${r.prioridade.p} · ${r.prioridade.label}`;
    $('d-sla').textContent = r.prioridade.sla;
    const ds = $('d-sit'); ds.className = 'pf-v sit ' + sit.cls; ds.textContent = sit.txt;
    $('d-took').innerHTML = r.cached ? `${ICO.cache}<span>do cache · <b>US$ 0</b></span>` : `${ICO.bolt}<span><b>${fmt.ms(r.latency_ms)}</b> · <b>${fmt.usd(r.cost)}</b></span>`;
    $('d-nq').textContent = `· ${r.n_perguntas} perguntas, 1 chamada`;
    $('d-av').textContent = initials(t.nome);
    $('d-name').textContent = t.nome || 'Cliente';
    $('d-meta').textContent = metaTxt(t);
    $('d-msg').replaceChildren(...msgNodes(t).filter(Boolean));
    $('d-bc').textContent = `${voo(key)} · ${gateOf(depId)} · ${r.prioridade.p}`;

    // resposta pronta + alternativas
    const setMacro = (m) => {
      $('d-macro-title').textContent = m.titulo;
      $('d-text').value = m.texto;
      $('d-macro-conf').textContent = m.id === r.macro.escolha ? `escolha do Jev · ${fmt.pct(m.p)}` : `alternativa · ${fmt.pct(m.p)}`;
      $('d-alts').querySelectorAll('.jev-chip').forEach((c) => c.classList.toggle('active', c.dataset.id === m.id));
      const spam = m.id === 'arquivar_spam';
      const sb = $('d-send');
      sb.dataset.spam = spam ? '1' : '';
      if (!item.card.classList.contains('done')) { sb.textContent = spam ? 'Arquivar como spam' : 'Enviar resposta'; sb.dataset.ico = spam ? 'trash' : 'send'; }
    };
    const ranking = r.macro.ranking.some((m) => m.id === r.macro.escolha) ? r.macro.ranking : [{ id: r.macro.escolha, titulo: r.macro.titulo, icone: r.macro.icone, p: r.macro.confianca, texto: r.macro.texto }, ...r.macro.ranking];
    $('d-alts').replaceChildren(el('span', { text: 'Opções do Jev:' }), ...ranking.slice(0, 4).map((m) => el('button', { class: 'jev-chip', type: 'button', 'data-id': m.id, title: m.titulo, onclick: () => setMacro(m) }, [`${m.titulo.length > 32 ? m.titulo.slice(0, 31) + '…' : m.titulo} `, el('i', { text: fmt.pct(m.p) })])));
    const done = item.card.classList.contains('done');
    $('d-send').disabled = done; if (done) { $('d-send').textContent = 'Respondido'; $('d-send').dataset.ico = 'check'; }
    setMacro(ranking.find((m) => m.id === r.macro.escolha) || ranking[0]);

    // probabilidades (o canhoto do cartão)
    const labels = {};
    for (const [k, dd] of Object.entries(CFG.departamentos)) labels[k] = `${gateOf(k)} · ${dd.label}`;
    bars($('d-deps'), r.departamento.probabilidades, { labels });
    $('d-pri-v').textContent = `score ${fmt.num(r.prioridade.score, 2)} → ${r.prioridade.p}`;
    scoreMeter($('d-pri-m'), { score: r.prioridade.score, probabilities: r.prioridade.probabilidades }, { levels: CFG.prioridades.map((p) => `${p.p} · ${p.label}`), short: CFG.prioridades.map((p) => `${p.p} ${p.label.toLowerCase()}`), colors: PRI_PAPEL });
    $('d-fru-v').textContent = `${fmt.num(r.frustracao.score, 1)} · ${r.frustracao.label.toLowerCase()}`;
    scoreMeter($('d-fru-m'), { score: r.frustracao.score, probabilities: r.frustracao.probabilidades }, { levels: CFG.frustracao.map((f) => f.label), short: ['calmo', '', 'frustrado', '', 'furioso'], colors: FRU_PAPEL });
    $('d-sen-v').textContent = `${fmt.num(r.sentimento.score, 1)} · ${r.sentimento.label.toLowerCase()}`;
    scoreMeter($('d-sen-m'), { score: r.sentimento.score, probabilities: r.sentimento.probabilidades }, { levels: CFG.sentimento, short: ['muito neg.', '', 'neutro', '', 'muito pos.'], colors: SEN_PAPEL });
    const sig = $('d-sig'); sig.innerHTML = '';
    for (const [k, s] of Object.entries(CFG.sinais)) {
      const p = r.sinais[k] || 0; const fill = el('i');
      sig.append(el('div', { class: 'sg' + (p >= 0.5 ? ' on' : ''), 'data-sinal': k }, [el('div', { class: 'l' }, [el('span', { text: s.label }), el('b', { text: fmt.pct(p) })]), el('div', { class: 't' }, [fill])]));
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${Math.round(p * 100)}%`; }));
    }
    openModal('detail');
  }

  function markAnswered() {
    const item = S.results.get(S.detailKey); if (!item || item.card.classList.contains('done')) return;
    const spam = $('d-send').dataset.spam === '1';
    item.card.classList.add('done');
    insertCard(item.r.departamento.escolha, item.card);
    toast(spam ? 'Ticket arquivado como spam (simulação).' : `Resposta enviada para ${primeiroNome(item.t.nome)} por ${CFG.canais[item.t.canal] || 'e-mail'} (simulação — nada saiu de verdade).`, 'ok');
    closeModal();
  }
  async function copyReply() {
    const s = $('d-text').value;
    try { if (!navigator.clipboard) throw new Error('sem clipboard'); await navigator.clipboard.writeText(s); toast('Resposta copiada.', 'ok'); }
    catch {
      try { const ta = $('d-text'); ta.focus(); ta.select(); const ok = document.execCommand('copy'); toast(ok ? 'Resposta copiada.' : 'Selecione o texto e copie com Ctrl+C.', ok ? 'ok' : ''); }
      catch { toast('Selecione o texto e copie com Ctrl+C.'); }
    }
  }

  // ---------------- escrever um ticket (balcão de check-in) ----------------
  const C = { canal: 'whatsapp' };
  function setCanal(c) {
    C.canal = c;
    $('c-canal').querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.c === c)));
    $('c-assunto-w').hidden = c !== 'email';
  }
  function buildComposer() {
    const seg = $('c-canal'); seg.innerHTML = '';
    for (const [k, label] of Object.entries(CFG.canais)) seg.append(el('button', { type: 'button', role: 'radio', 'data-c': k, 'aria-checked': 'false', onclick: () => setCanal(k) }, [chIco(k), label]));
    setCanal('whatsapp');
    const pl = $('c-plano'); CFG.planos.forEach((p) => pl.append(el('option', { value: p, text: p })));
    const ha = $('c-ha'); CFG.cliente_ha.forEach((h) => ha.append(el('option', { value: h, text: h === '—' ? '— (ainda não é cliente)' : h })));
    ha.value = '2 meses';
    const pr = $('c-presets');
    CFG.presets.forEach((p) => pr.append(el('button', { class: 'jev-chip', type: 'button', onclick: (e) => {
      pr.querySelectorAll('.jev-chip').forEach((c) => c.classList.remove('active')); e.currentTarget.classList.add('active');
      $('c-texto').value = p.texto; $('c-assunto').value = p.assunto || ''; setCanal(p.canal || 'whatsapp'); updateCount(); $('c-err').textContent = '';
    } }, [semEmoji(p.rotulo)])));
    $('c-texto').addEventListener('input', () => { updateCount(); $('c-err').textContent = ''; pr.querySelectorAll('.jev-chip').forEach((c) => c.classList.remove('active')); });
    $('c-texto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('c-form').requestSubmit(); } });
    $('c-form').addEventListener('submit', (e) => { e.preventDefault(); submitComposer(); });
  }
  function updateCount() { const n = $('c-texto').value.length; $('c-cnt').textContent = `${fmt.int(n)} / ${fmt.int(CFG.limites.texto)}`; }
  function openComposer() { $('c-err').textContent = ''; openModal('composer'); setTimeout(() => $('c-texto').focus({ preventScroll: true }), 40); }
  async function submitComposer() {
    const texto = $('c-texto').value.trim();
    if (texto.length < CFG.limites.textoMin) { $('c-err').textContent = 'Escreva a mensagem do ticket antes de enviar.'; $('c-texto').focus(); return; }
    if (texto.length > CFG.limites.texto) { $('c-err').textContent = `Máximo de ${fmt.int(CFG.limites.texto)} caracteres.`; return; }
    const t = { nome: $('c-nome').value.trim() || 'Cliente de teste', canal: C.canal, texto, plano: $('c-plano').value, cliente_ha: $('c-ha').value };
    if (C.canal === 'email' && $('c-assunto').value.trim()) t.assunto = $('c-assunto').value.trim();
    await triarEscrito(t);
  }
  async function triarEscrito(t) {
    if (S.hold) return;
    S.hold = true; $('c-send').disabled = true;
    closeModal();
    clearTimeout(S.timer);
    try {
      while (S.busy) await wait(60);
      if (S.finished) { S.finished = false; updatePlay(); }
      const key = 'u' + (++S.userN);
      // teto de memória: mantém só os 40 tickets escritos mais recentes no quadro
      const velho = S.results.get('u' + (S.userN - 40));
      if (velho) { const col = velho.card.closest('.col'); velho.card.remove(); S.results.delete(velho.key); if (col) updateColHeader(col); }
      let r = null;
      try { r = await processTicket(t, key, true); } catch { /* erro já exibido */ }
      if (r) { if (!S.running) stageMessage('Ticket triado.', 'Veja no cartão de embarque todas as probabilidades — ou escreva outro.'); openDetail(key); }
      else if (!S.running && !dicaNoErro('Tente de novo em alguns segundos.')) stageMessage('Não foi possível triar o ticket agora.', 'Tente de novo em alguns segundos.', 'err');
      if (r) $('c-texto').value = '';
      updateCount(); loadGlobal();
    } finally {
      S.hold = false; $('c-send').disabled = false;
      resume(900);
    }
  }

  // ---------------- backlog em lote ----------------
  // Os tickets da fila chegam todos de uma vez: grupos de 12 tickets × 3 perguntas numa chamada, chamadas em paralelo.
  async function triarBacklog() {
    if (S.hold || S.lote) return;
    const n = Math.min(CFG.lote.max, S.queue.length);
    if (!n) { toast('A fila está vazia. Clique em Reiniciar para recomeçar.'); return; }
    S.hold = true; S.lote = true; clearTimeout(S.timer);
    const gen = S.gen;
    updateKpis();
    try {
      while (S.busy) await wait(60);
      if (gen !== S.gen) return;
      const lote = S.queue.splice(0, n);
      if (S.finished) S.finished = false;
      updateKpis(); updatePlay();
      const nCham = Math.ceil(n / CFG.lote.porChamada), porCham = CFG.lote.porChamada * CFG.lote.perguntasPorTicket;
      const timer = el('b', { class: 'mono', text: '0 ms' });
      // um mini painel: cada ticket é uma plaqueta com o número do voo; quando o Jev responde, ela vira para o portão
      const minis = new Map(lote.map((t) => [t.id, el('span', { class: 'mini', title: `${voo(t.id)} · ${t.nome}` }, [el('b', { text: voo(t.id).slice(3) })])]));
      const pilha = el('div', { class: 'arr-ticket reading' }, [el('div', { class: 'stack-hd' }, [el('b', { text: `${n} tickets chegaram de uma vez` }), el('span', { text: 'o backlog do fim de semana, todo junto' })]), el('div', { class: 'stack-av', 'aria-hidden': 'true' }, [...minis.values()])]);
      const dec = el('div', { class: 'arr-decision' }, [el('div', { class: 'dec-info' }, [el('div', { class: 'reading' }, [el('span', { class: 'jev-spinner' }), `Jev triando em ${nCham} chamadas paralelas de ${porCham} perguntas…`, timer])])]);
      setStage(el('div', { class: 'arr-row lote' }, [pilha, dec]));
      const t0 = performance.now(); let raf = 0;
      const tick = () => { timer.textContent = `${Math.round(performance.now() - t0)} ms`; raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      let r;
      try { r = await api('/api/triar-lote', { ids: lote.map((t) => t.id) }, { silent: true, label: 'backlog em lote' }); }
      catch (e) {
        cancelAnimationFrame(raf);
        if (gen === S.gen) { S.queue.unshift(...lote); stageMessage('O Jev não respondeu agora.', `${e.message || 'Falha no lote.'} Tente de novo em alguns segundos.`, 'err'); toast(e.message || 'Falha no lote.', 'err'); }
        return;
      }
      cancelAnimationFrame(raf);
      if (gen !== S.gen) return;
      pilha.classList.remove('reading');
      const porDep = {}; let p1 = 0, reemb = 0;
      for (const x of r.resultados) { porDep[x.departamento.escolha] = (porDep[x.departamento.escolha] || 0) + 1; if (x.prioridade.nivel === 3) p1++; if (x.sinais.pede_reembolso >= 0.5) reemb++; }
      const chips = Object.entries(porDep).sort((a, b) => b[1] - a[1]).map(([k, c]) => { const d = depOf(k); return el('span', { class: 'dchip dep' }, [el('span', { class: 'gc', text: gateOf(k) }), d.curto || d.label, el('span', { class: 'n', text: String(c) })]); });
      if (p1) chips.push(el('span', { class: 'dchip pri', 'data-p': 'P1', style: `--pc:${PRI_HEX[3]}` }, [`${p1} × P1 urgente`]));
      if (reemb) chips.push(el('span', { class: 'dchip warn' }, [`${reemb} pedem reembolso`]));
      chips.forEach((c, i) => { c.style.animationDelay = `${i * 60}ms`; });
      const took = r.cached ? `${ICO.cache}<span>${r.resultados.length} tickets · lote idêntico reaproveitado do cache · <b>US$ 0</b></span>`
        : `${ICO.bolt}<span><b class="fast">${r.resultados.length} tickets em ${fmt.ms(r.wall_ms)}</b> · ${r.chamadas} chamadas paralelas × ${r.perguntas_por_chamada} perguntas · <b>${fmt.usd(r.cost)}</b></span>`;
      dec.querySelector('.dec-info').replaceChildren(el('div', { class: 'dchips' }, chips), el('div', { class: 'took', html: took }));
      // as plaquetas do mini painel viram para o portão de cada ticket
      r.resultados.forEach((x, i) => { const m = minis.get(x.id); if (m) { m.dataset.p = x.prioridade.p; flipMini(m, gateOf(x.departamento.escolha), i * 14); } });
      // os canhotos "chovem" nos portões, já ordenados por prioridade
      const byId = new Map(lote.map((t) => [t.id, t]));
      const cols = new Set();
      r.resultados.forEach((x, i) => {
        const t = byId.get(x.id); if (!t) return;
        const card = makeCard(t.id, t, x, false, true);
        S.results.set(t.id, { key: t.id, t, r: x, card, lote: true });
        const { col, list } = insertCard(x.departamento.escolha, card, true);
        cols.add(col); list.scrollTop = 0;
        if (!reduceMotion) card.animate([{ opacity: 0, transform: 'translateY(-22px) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 120 + i * 22, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
      cols.forEach((c) => { c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); });
      S.triados += r.resultados.length;
      S.loteInfo = { n: r.resultados.length, wall: r.wall_ms, cost: r.cost, chamadas: r.chamadas, cached: r.cached };
      updateKpis(true);
      loadGlobal();
      if (!S.queue.length) { S.running = false; clearTimeout(S.timer); updatePlay(); }
    } finally {
      S.lote = false; S.hold = false; updateKpis();
      resume(2200);
    }
  }

  // ---------------- eventos ----------------
  function wire() {
    $('play').addEventListener('click', () => (S.running ? pauseLoop() : startLoop()));
    $('reset').addEventListener('click', () => resetAll());
    $('speed').addEventListener('click', () => {
      S.speed = S.speed > 1 ? 1 : 2;
      $('speed').setAttribute('aria-pressed', String(S.speed > 1)); $('speed').textContent = S.speed > 1 ? '2×' : '1×';
      updateStatus();
    });
    $('compose').addEventListener('click', openComposer);
    $('lote').addEventListener('click', triarBacklog);
    $('d-close').addEventListener('click', closeModal);
    $('c-close').addEventListener('click', closeModal);
    $('d-send').addEventListener('click', markAnswered);
    $('d-copy').addEventListener('click', copyReply);
    $('d-insp').addEventListener('click', () => { closeModal(); JevKit.inspector.open(); });
    for (const id of ['detail', 'composer']) $(id).addEventListener('mousedown', (e) => { if (e.target.id === id) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.modal) closeModal(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(S.timer); else resume(500); updateStatus(); });
  }

  // relógio do painel e o letreiro "Partidas" virando na entrada
  function painel() {
    const clk = $('arr-clock');
    const hora = () => { clk.textContent = new Date().toLocaleTimeString('pt-BR'); };
    hora(); setInterval(() => { if (!document.hidden) hora(); }, 1000);
    const tt = document.querySelector('.arr-name');
    if (tt) setTimeout(() => flipTo(tt, 'Partidas', { step: 60, stagger: 45, min: 3, extra: 4 }), 350);
  }

  async function init() {
    painel();
    try {
      const [cfg, tk] = await Promise.all([api('/api/config', undefined, { silent: true }), api('/api/tickets', undefined, { silent: true })]);
      CFG = cfg; SEEDS = tk.tickets;
      GATES = Object.fromEntries(Object.keys(CFG.departamentos).map((k, i) => [k, 'A' + (i + 1)]));
    } catch {
      stageMessage('Não consegui carregar a central.', 'Recarregue a página em alguns segundos.', 'err');
      return;
    }
    wire(); buildComposer(); resetAll(); loadGlobal();
    const qs = new URLSearchParams(location.search);
    if (qs.get('ticket')) triarEscrito({ nome: 'Cliente de teste', canal: 'whatsapp', texto: qs.get('ticket').slice(0, CFG.limites.texto), plano: CFG.planos[0], cliente_ha: '2 meses' });
    else if (qs.get('auto') === '1') startLoop();
  }
  init();
})();

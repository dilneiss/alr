(function () {
  'use strict';
  const { fmt, el, api, bars, escapeHtml, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Formulário que Qualifica', tagline: 'O Jev qualifica o lead enquanto ele digita' });

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp01 = (v) => Math.max(0, Math.min(1, +v || 0));
  const norm = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const HUB = JevKit.HUB || 'https://jev.exemplo.com';
  function rid(n) {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    try { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => abc[b % 36]).join(''); }
    catch { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
  }
  const sessao = (() => {
    const K = 'jevform.sessao';
    try { let v = localStorage.getItem(K); if (!v || !/^[a-z0-9]{12,64}$/.test(v)) { v = rid(20); localStorage.setItem(K, v); } return v; }
    catch { return rid(20); }
  })();

  // ------------------------------------------------------------------ ícones (SVG inline: nada de emoji na interface)
  const SVGI = (inner) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    bolt: SVGI('<path class="fill" d="M13.2 2 4.5 13.6h6.3L9.9 22l8.8-11.8h-6.4z"/>'),
    compass: SVGI('<circle cx="12" cy="12" r="8.5"/><path d="m15.4 8.6-2.2 4.6-4.6 2.2 2.2-4.6z"/>'),
    calendar: SVGI('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.2h3"/>'),
    doc: SVGI('<path d="M6.5 3h8l4 4v14h-12z"/><path d="M14.5 3v4h4M9.5 12h6M9.5 15.5h6"/>'),
    cap: SVGI('<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4.2c3.3 2.2 7.7 2.2 11 0v-4.2M21.5 9.5v5"/>'),
    sprout: SVGI('<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 2.8-6.8 7.5-6.8 0 4.2-2.8 6.8-7.5 6.8z"/><path d="M12 15c0-3.2-2.2-5.2-6-5.2 0 3.2 2.2 5.2 6 5.2z"/>'),
    archive: SVGI('<rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v10.5h14V9M10 13h4"/>'),
    watch: SVGI('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.8M9.5 2.8h5M12 2.8V6"/>'),
    lock: SVGI('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>'),
    arrow: SVGI('<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>'),
    check: SVGI('<path d="m4.5 12.5 4.8 4.8L19.5 7"/>'),
    redo: SVGI('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v5h-5"/>'),
    ledger: SVGI('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    mail: SVGI('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.8 6.5 8.2 6.5 8.2-6.5"/>'),
    book: SVGI('<path d="M5 4.5h10.5a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17.5a3 3 0 0 1 3-3h10.5"/>'),
    stamp: SVGI('<circle cx="12" cy="12" r="9"/><path d="m7.8 12.4 2.9 2.9 5.5-6"/>'),
    tie: SVGI('<path d="M9.3 3h5.4l-1.4 3.4 2.4 10.2L12 21l-3.7-4.4 2.4-10.2z"/><path d="M10.7 6.4h2.6"/>'),
    receipt: SVGI('<path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>'),
    bag: SVGI('<path d="M5 8h14l-1.1 12.5H6.1z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    person: SVGI('<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8"/>'),
  };
  const PRESET_IC = { ceo: ICON.tie, estudante: ICON.cap, gerente: ICON.receipt, loja: ICON.bag };
  // o rótulo do preset vem do servidor com um emoji na frente (ex.: "<emoji> CEO decidido"): na interface o emoji sai e entra um ícone SVG
  const semEmoji = (s) => String(s || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const pad2 = (n) => String(n).padStart(2, '0');
  function restartAnim(node, cls) { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  // ------------------------------------------------------------------ constantes de interface
  const QKEYS = ['altamente_qualificado', 'qualificado', 'morno', 'desqualificado'];
  const QTONE = { altamente_qualificado: ['t-hot', 'lead quente'], qualificado: ['t-warm', 'bom lead'], morno: ['t-mild', 'morno'], desqualificado: ['t-cold', 'frio'] };
  const QCOLOR = { altamente_qualificado: '#C4552D', qualificado: '#D9A441', morno: '#A89A6E', desqualificado: '#8F9EA2' };
  const PASSO_IC = { agendar_reuniao_especialista: ICON.calendar, enviar_proposta_expressa: ICON.doc, oferecer_curso_online: ICON.cap, nutrir_com_conteudo: ICON.sprout, descartar_com_educacao: ICON.archive };
  const PASSO_SUB = {
    agendar_reuniao_especialista: 'lead quente: vale a hora do especialista', enviar_proposta_expressa: 'proposta pronta por e-mail, sem reunião',
    oferecer_curso_online: 'melhor aprender a fazer sozinho', nutrir_com_conteudo: 'amadurecer e voltar a falar depois', descartar_com_educacao: 'não é cliente agora',
  };
  const PASSO_CURTO = { agendar_reuniao_especialista: 'Agendar reunião', enviar_proposta_expressa: 'Proposta expressa', oferecer_curso_online: 'Curso online', nutrir_com_conteudo: 'Nutrir com conteúdo', descartar_com_educacao: 'Descartar' };
  const BANT_KEYS = ['orcamento', 'autoridade', 'necessidade', 'urgencia_prazo'];
  const BANT_LETRA = { orcamento: 'B', autoridade: 'A', necessidade: 'N', urgencia_prazo: 'T' };
  const BCOLORS = ['#C4552D', '#D9A441', '#93A86F', '#4F6B3B'];
  const AREA_SOL = {
    atendimento: 'Agente de atendimento 24h no WhatsApp', vendas: 'Agente de qualificação e follow-up de vendas', marketing: 'Produção de conteúdo com IA',
    financeiro: 'Leitura de notas e conciliação automática', operacoes: 'Agente de operações integrado ao seu sistema', rh: 'Triagem de currículos e onboarding com IA',
    dados_ti: 'Assistente de dados e relatórios automáticos', indefinido: 'Diagnóstico de oportunidades de IA',
  };
  const ETAPA = {
    agendar_reuniao_especialista: ['Agendar reunião', 'aguardando horário'], reuniao_marcada: ['Reunião marcada', ''],
    enviar_proposta_expressa: ['Enviar proposta', 'proposta expressa pronta'], proposta_enviada: ['Proposta enviada', 'simulado — nenhum e-mail sai'],
    oferecer_curso_online: ['Oferecer curso', 'curso online'], curso_oferecido: ['Curso oferecido', 'interesse registrado'],
    nutrir_com_conteudo: ['Nutrir com conteúdo', 'material gratuito'], material_enviado: ['Material enviado', 'voltar em 30 dias'],
    descartar_com_educacao: ['Descartado com educação', 'recebeu conteúdos gratuitos'], encerrado: ['Encerrado', ''],
  };

  // ------------------------------------------------------------------ estado
  let CFG = null, CAMPOS = [], N = 8;
  const S = { step: -1, answers: {}, evol: [], livePt: null, base: null, last: null, run: rid(16), lead: null, busy: false, lastCh: null };
  let reqSeq = 0, shownSeq = 0, lastRes = null, pending = 0, lastShowAt = 0, lastLatency = null, gen = 1;
  const inflight = new Map();
  let presetTok = 0, presetRunning = false, fast = false;

  function answersNow() {
    const o = {};
    for (const c of CAMPOS) { const v = norm(S.answers[c.id]); if (v) o[c.id] = c.tipo === 'opcoes' ? v : v.slice(0, c.max || 1200); }
    return o;
  }
  const keyOf = (a) => JSON.stringify(CAMPOS.map((c) => a[c.id] || ''));

  // ------------------------------------------------------------------ avaliação (com descarte de respostas velhas)
  // Cada chamada recebe um número de sequência novo (mesmo quando reaproveita um resultado ou uma chamada em voo);
  // o painel só aceita resultados mais novos que o último exibido. "gen" isola cada preenchimento (reset/preset).
  function request(kind, ans) {
    const key = gen + '|' + keyOf(ans);
    const my = ++reqSeq;
    if (lastRes && lastRes.key === key) return Promise.resolve({ r: lastRes.r, seq: my, reused: true });
    let p = inflight.get(key);
    if (!p) {
      pending++; thinking();
      p = api('/api/avaliar', { respostas: ans, run: S.run }, { label: kind, silent: kind === 'ao vivo' })
        .then((r) => { if (key.startsWith(gen + '|')) lastRes = { key, r }; return r; })
        .finally(() => { if (inflight.get(key) === p) inflight.delete(key); pending = Math.max(0, pending - 1); thinking(); });
      inflight.set(key, p);
    }
    return p.then((r) => ({ r, seq: my, reused: false }));
  }

  let lastErrToast = 0;
  function onEvalError(e, alreadyToasted) {
    const msg = (e && e.message) || 'Falha ao consultar o Jev.';
    const m = $('shMeta'); m.textContent = msg; m.classList.add('err');
    if (!alreadyToasted && Date.now() - lastErrToast > 8000) { lastErrToast = Date.now(); toast(msg, 'err'); }
  }

  function makeScheduler(fn, wait, maxWait) {
    let t = null, first = 0;
    return {
      poke() {
        const now = performance.now();
        if (!first) first = now;
        clearTimeout(t);
        const rem = Math.max(0, Math.min(wait, maxWait - (now - first)));
        t = setTimeout(() => { first = 0; t = null; fn(); }, rem);
      },
      cancel() { clearTimeout(t); t = null; first = 0; },
    };
  }
  const liveSched = makeScheduler(liveEval, 350, 1000);

  function liveEval() {
    if (S.step < 0 || S.step >= N) return;
    const ans = answersNow();
    if (!Object.keys(ans).length) return;
    const step = S.step;
    request('ao vivo', ans)
      .then((res) => { if (S.step === step && res.seq >= shownSeq) { shownSeq = res.seq; renderPanel(res.r, { live: true, step }); } })
      .catch((e) => onEvalError(e, false));
  }

  async function commit() {
    if (S.busy || S.step < 0 || S.step >= N) return false;
    const c = CAMPOS[S.step];
    const v = norm(S.answers[c.id]);
    if (!v || (c.tipo !== 'opcoes' && v.length < 2)) { invalid(c.tipo === 'opcoes' ? 'Escolha uma opção para continuar.' : 'Escreva uma resposta para continuar.'); return false; }
    S.busy = true; liveSched.cancel(); setOkBusy(true);
    try {
      if (S.step === N - 1) return await submit();
      const step = S.step;
      const res = await request('resposta', answersNow());
      if (S.step !== step) return false;
      shownSeq = Math.max(shownSeq, reqSeq, res.seq);
      renderPanel(res.r, { commit: true, step });
      goTo(step + 1);
      return true;
    } catch (e) { onEvalError(e, true); return false; }
    finally { S.busy = false; setOkBusy(false); }
  }

  async function submit() {
    const ans = answersNow();
    const evolucao = S.evol.slice(0, N - 1).map((p) => (p ? p.alta : 0));
    const r = await api('/api/enviar', { respostas: ans, sessao, run: S.run, evolucao }, { label: 'envio final' });
    shownSeq = ++reqSeq;
    renderPanel(r, { commit: true, step: N - 1 });
    S.lead = r.lead;
    goFinal(r);
    refreshLeadCount(true);
    return true;
  }

  function invalid(msg) {
    const err = $('qerr'); if (err) err.textContent = msg;
    const sl = document.querySelector('#stage .slide');
    if (sl) { sl.classList.remove('shake'); void sl.offsetWidth; sl.classList.add('shake'); }
  }
  function setOkBusy(on) {
    const b = $('okBtn'); if (!b) return;
    b.disabled = on;
    if (on && S.step === N - 1) b.textContent = 'Enviando…';
    else if (!on) b.innerHTML = (S.step === N - 1 ? 'Enviar' : 'OK') + ICON.check;
  }

  let liveOffTimer = 0;
  function thinking() {
    const on = pending > 0;
    const dot = $('liveDot');
    dot.classList.toggle('on', on || Date.now() - lastShowAt < 1400);
    clearTimeout(liveOffTimer);
    liveOffTimer = setTimeout(() => { if (!pending) dot.classList.remove('on'); }, 1500);
    const q = $('qlive');
    if (!q) return;
    if (on) { q.className = 'qlive on'; q.innerHTML = '<span class="jev-spinner"></span> o Jev está lendo a sua resposta…'; }
    else if (lastLatency != null && S.last) { q.className = 'qlive done'; q.innerHTML = `${ICON.check} lido pelo Jev em ${escapeHtml(fmt.ms(lastLatency))}`; }
  }

  // ------------------------------------------------------------------ instrumentos da prancheta
  // mostrador analógico do BANT: escala 0–3 em 240°, o ponteiro gira quando o Jev reavalia
  const DIAL_A0 = -120, DIAL_A1 = 120;
  const dialDeg = (v) => DIAL_A0 + (Math.max(0, Math.min(3, +v || 0)) / 3) * (DIAL_A1 - DIAL_A0);
  const f1 = (n) => n.toFixed(1);
  function polar(r, deg, cx, cy) { const a = (deg * Math.PI) / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
  function arcPath(r, d0, d1, cx, cy) {
    const [x0, y0] = polar(r, d0, cx, cy), [x1, y1] = polar(r, d1, cx, cy);
    return `M${f1(x0)} ${f1(y0)} A${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
  }
  function dialSvg(letter) {
    let s = '<svg class="dial" viewBox="0 0 120 120" aria-hidden="true">';
    s += '<circle class="d-rim" cx="60" cy="60" r="58"/><circle class="d-face" cx="60" cy="60" r="53.5"/>';
    s += `<path class="d-zone lo" d="${arcPath(48.5, dialDeg(0), dialDeg(1), 60, 60)}"/><path class="d-zone hi" d="${arcPath(48.5, dialDeg(2), dialDeg(3), 60, 60)}"/>`;
    for (let k = 0; k <= 12; k++) {
      const d = dialDeg(k / 4), major = k % 4 === 0;
      const [x0, y0] = polar(major ? 38.5 : 42.5, d, 60, 60), [x1, y1] = polar(46, d, 60, 60);
      s += `<line class="d-tick${major ? ' mj' : ''}" x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}"/>`;
    }
    for (let v = 0; v <= 3; v++) { const [x, y] = polar(29, dialDeg(v), 60, 60); s += `<text class="d-num" x="${f1(x)}" y="${f1(y + 3.6)}" text-anchor="middle">${v}</text>`; }
    s += `<text class="d-let" x="60" y="41" text-anchor="middle">${letter}</text>`;
    s += `<g class="ndl" style="transform:rotate(${DIAL_A0}deg)"><path d="M58.2 69 L60 16.5 L61.8 69 Z"/></g>`;
    s += '<circle class="d-cap" cx="60" cy="60" r="6.2"/><circle class="d-cap-hi" cx="58.4" cy="58.4" r="1.9"/>';
    s += '<text class="dv" x="60" y="92" text-anchor="middle">—</text></svg>';
    return s;
  }

  // medidor "VU" da compra em 30 dias: o ponteiro sobe de um pivô escondido sob a placa
  let gauge30 = null;
  function makeGauge(container, label) {
    const PX = 80, PY = 112, VR = 80, A = 42;
    const ang = (p) => -A + 2 * A * clamp01(p);
    const P = (r, d) => polar(r, d, PX, PY);
    let s = `<div class="vu" role="img" aria-label="${escapeHtml(label)}: sem dados"><svg viewBox="0 0 160 96" aria-hidden="true">`;
    s += '<rect class="vu-rim" x="1" y="1" width="158" height="94" rx="11"/><rect class="vu-face" x="6" y="6" width="148" height="84" rx="7"/>';
    s += `<path class="vu-hot" d="${arcPath(VR - 3.5, ang(0.7), ang(1), PX, PY)}"/><path class="vu-arc" d="${arcPath(VR, ang(0), ang(1), PX, PY)}"/>`;
    for (let k = 0; k <= 10; k++) {
      const d = ang(k / 10), major = k % 5 === 0;
      const [x0, y0] = P(VR, d), [x1, y1] = P(VR + (major ? 7.5 : 4.5), d);
      s += `<line class="vu-tick${major ? ' mj' : ''}" x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}"/>`;
    }
    for (const v of [0, 50, 100]) { const [x, y] = P(VR + 13, ang(v / 100)); s += `<text class="vu-num" x="${f1(x)}" y="${f1(y + 3)}" text-anchor="middle">${v}</text>`; }
    s += `<g class="vu-ndl" style="transform:rotate(${-A}deg)"><path d="M79.3 112 L80 24 L80.7 112 Z"/></g>`;
    s += '<path class="vu-plate" d="M6 66h148v17a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7z"/>';
    s += '<text class="vu-v" x="80" y="84" text-anchor="middle">—</text>';
    s += `</svg><div class="gl">${escapeHtml(label)}</div></div>`;
    container.innerHTML = s;
    const root = container.querySelector('.vu'), ndl = container.querySelector('.vu-ndl'), vv = container.querySelector('.vu-v');
    return {
      set(p) {
        if (p == null) { ndl.style.transform = `rotate(${-A}deg)`; vv.textContent = '—'; root.classList.remove('hot'); root.setAttribute('aria-label', `${label}: sem dados`); return; }
        const v = clamp01(p);
        ndl.style.transform = `rotate(${ang(v).toFixed(2)}deg)`;
        vv.textContent = Math.round(v * 100) + '%';
        root.classList.toggle('hot', v >= 0.6);
        root.setAttribute('aria-label', `${label}: ${Math.round(v * 100)}%`);
      },
    };
  }

  // régua da qualificação: do frio (esquerda) ao quente (direita); o cursor para no valor esperado das 4 probabilidades
  const RULER = ['desqualificado', 'morno', 'qualificado', 'altamente_qualificado'];
  const RULER_POS = { desqualificado: 0.125, morno: 0.375, qualificado: 0.625, altamente_qualificado: 0.875 };
  const RULER_SHORT = { desqualificado: 'frio', morno: 'morno', qualificado: 'bom', altamente_qualificado: 'quente' }; // telas estreitas
  function renderRuler(qp, ch) {
    const box = $('qbars');
    let r = box.querySelector('.ruler');
    if (!r) {
      box.innerHTML = '';
      r = el('div', { class: 'ruler empty', role: 'img', 'aria-label': 'Qualificação: sem dados' }, [
        el('div', { class: 'rl-ticks' }),
        el('div', { class: 'rl-zones' }, RULER.map((k) => el('div', { class: 'rz z-' + k, 'data-k': k }, [
          el('em', { text: '—' }), el('span', { class: 'l-long', text: CFG.labels.qualificacao[k] }), el('span', { class: 'l-short', text: RULER_SHORT[k] }),
        ]))),
        el('div', { class: 'rl-cursor' }, [el('i')]),
      ]);
      box.append(r);
    }
    const zones = r.querySelectorAll('.rz');
    if (!qp) {
      r.classList.add('empty');
      zones.forEach((z) => { z.classList.remove('top'); z.querySelector('em').textContent = '—'; z.style.setProperty('--p', '0'); });
      r.setAttribute('aria-label', 'Qualificação: sem dados');
      return;
    }
    let pos = 0, tot = 0;
    for (const k of RULER) { const p = clamp01(qp[k]); pos += p * RULER_POS[k]; tot += p; }
    pos = tot > 0 ? pos / tot : 0.5;
    r.classList.remove('empty');
    r.querySelector('.rl-cursor').style.left = (pos * 100).toFixed(2) + '%';
    zones.forEach((z) => {
      const k = z.dataset.k;
      z.classList.toggle('top', k === ch);
      z.querySelector('em').textContent = fmt.pct(qp[k]);
      z.style.setProperty('--p', String(clamp01(qp[k])));
    });
    r.setAttribute('aria-label', 'Qualificação: ' + QKEYS.map((k) => `${CFG.labels.qualificacao[k]} ${fmt.pct(qp[k])}`).join(', '));
  }

  function resetPanel() {
    S.last = null; S.base = null; S.livePt = null; S.lastCh = null; lastLatency = null;
    const sum = $('sum'); sum.className = 'sum';
    const b = $('qBadge'); b.className = 'jev-badge'; b.textContent = 'sem dados';
    $('qTitle').textContent = 'Aguardando…';
    $('qSub').textContent = 'Comece a responder (ou use um preset): o Jev avalia o lead a cada pausa na digitação.';
    gauge30.set(null);
    renderRuler(null);
    const box = $('bant');
    if (!box.querySelector('.bt')) {
      for (const k of BANT_KEYS) {
        box.append(el('div', { class: 'bt', 'data-k': k, role: 'img', 'aria-label': `${CFG.labels.bant[k].label}: sem dados` }, [
          el('div', { class: 'dialw', html: dialSvg(BANT_LETRA[k]) }),
          el('div', { class: 'bl', text: CFG.labels.bant[k].label }),
          el('div', { class: 'bv', text: '—' }),
        ]));
      }
    }
    box.querySelectorAll('.bt').forEach((tile) => {
      delete tile.dataset.v; delete tile.dataset.n;
      tile.querySelector('.dv').textContent = '—';
      tile.querySelector('.bv').textContent = '—';
      tile.querySelector('.ndl').style.transform = `rotate(${DIAL_A0}deg)`;
      tile.setAttribute('aria-label', `${CFG.labels.bant[tile.dataset.k].label}: sem dados`);
    });
    const ns = $('nextStep'); ns.classList.remove('on', 'swap'); delete ns.dataset.pp;
    ns.querySelector('.ns-ic').innerHTML = ICON.compass;
    ns.querySelector('.ns-t b').textContent = '—';
    ns.querySelector('.ns-t span').textContent = 'o Jev escolhe entre 5 caminhos';
    ns.querySelector('.ns-p').textContent = '—';
    $('areaTxt').textContent = '';
    $('changes').innerHTML = '';
    const m = $('shMeta'); m.classList.remove('err'); m.textContent = 'aguardando a primeira resposta';
    updateMinibar();
  }

  function renderPanel(r, opts) {
    opts = opts || {};
    S.last = r; lastShowAt = Date.now(); lastLatency = r.latency_ms;
    const qp = r.qualificacao.probabilidades || {};
    const alta = clamp01(qp.altamente_qualificado), sc = clamp01(r.lead_score / 100);
    if (opts.commit) { S.evol[opts.step] = { alta, score: sc }; S.evol.length = opts.step + 1; S.livePt = null; }
    else if (opts.live) S.livePt = { i: opts.step, alta, score: sc };

    const ch = r.qualificacao.escolha, t = QTONE[ch] || ['t-none', ch];
    $('sum').className = 'sum t-' + ch;
    const b = $('qBadge'); b.className = 'jev-badge ' + t[0]; b.textContent = t[1];
    $('qTitle').textContent = r.qualificacao.label;
    if (S.lastCh !== ch) restartAnim($('qTitle'), 'stamp');
    S.lastCh = ch;
    $('qSub').innerHTML = `Lead score <b>${r.lead_score}</b> · certeza <b>${fmt.pct(qp[ch])}</b> · curioso/estudante <b>${fmt.pct(r.curioso)}</b>`;
    gauge30.set(r.compra_30_dias);
    renderRuler(qp, ch);

    for (const k of BANT_KEYS) {
      const tile = document.querySelector(`#bant [data-k="${k}"]`); const v = r.bant[k];
      if (!tile || !v) continue;
      const prev = tile.dataset.v === undefined ? null : +tile.dataset.v;
      tile.dataset.v = String(v.score);
      tile.dataset.n = String(v.nivel);
      tile.querySelector('.dv').textContent = fmt.num(v.score, 1);
      tile.querySelector('.bv').textContent = v.texto;
      tile.querySelector('.ndl').style.transform = `rotate(${dialDeg(v.score).toFixed(2)}deg)`;
      tile.setAttribute('aria-label', `${CFG.labels.bant[k].label}: ${fmt.num(v.score, 1)} de 3 (${v.texto})`);
      if (prev != null && Math.abs(prev - v.score) >= 0.4) { tile.classList.add('flash'); setTimeout(() => tile.classList.remove('flash'), 750); }
    }

    const pp = r.proximo_passo, ns = $('nextStep');
    ns.classList.add('on');
    if (ns.dataset.pp !== pp.escolha) { restartAnim(ns, 'swap'); ns.dataset.pp = pp.escolha; }
    ns.querySelector('.ns-ic').innerHTML = PASSO_IC[pp.escolha] || ICON.compass;
    ns.querySelector('.ns-t b').textContent = pp.label;
    ns.querySelector('.ns-t span').textContent = PASSO_SUB[pp.escolha] || '';
    ns.querySelector('.ns-p').textContent = fmt.pct(pp.probabilidades[pp.escolha]);
    $('areaTxt').textContent = r.area && r.area.escolha !== 'indefinido' ? 'área: ' + r.area.label : '';

    renderChanges(r, S.base);
    if (opts.commit) { S.base = r; restartAnim($('seller'), 'clack'); }
    const m = $('shMeta'); m.classList.remove('err');
    m.innerHTML = `${ICON.bolt}<b>${fmt.ms(r.latency_ms)}</b> · ${r.n_perguntas} decisões · ${fmt.usd(r.cost)}`;
    $('mbTxt').textContent = `${r.qualificacao.label} · ${PASSO_CURTO[pp.escolha] || pp.label}`;
    $('mbScore').textContent = 'score ' + r.lead_score;
    $('minibar').dataset.tone = t[0];
    updateMinibar();
    thinking();
    drawChart();
  }

  function renderChanges(r, base) {
    const box = $('changes'); box.innerHTML = '';
    if (!base) return;
    const items = [];
    const dA = (r.qualificacao.probabilidades.altamente_qualificado || 0) - (base.qualificacao.probabilidades.altamente_qualificado || 0);
    if (Math.abs(dA) >= 0.05) items.push({ txt: `quente ${dA > 0 ? '+' : '−'}${Math.round(Math.abs(dA) * 100)} pts`, v: dA, m: Math.abs(dA) });
    for (const k of BANT_KEYS) {
      const d = r.bant[k].score - base.bant[k].score;
      if (Math.abs(d) >= 0.3) items.push({ txt: `${CFG.labels.bant[k].label} ${d > 0 ? '+' : '−'}${fmt.num(Math.abs(d), 1)}`, v: d, m: Math.abs(d) / 3 });
    }
    const dS = r.lead_score - base.lead_score;
    if (Math.abs(dS) >= 4 && items.length < 2) items.push({ txt: `score ${dS > 0 ? '+' : '−'}${Math.abs(dS)}`, v: dS, m: Math.abs(dS) / 100 });
    items.sort((a, b) => b.m - a.m).slice(0, 2).forEach((it) => box.append(el('span', { class: 'chg ' + (it.v > 0 ? 'up' : 'down'), text: it.txt })));
  }

  // barra compacta do vendedor no celular: aparece quando a prancheta está fora da tela
  let sellerVisible = true;
  function updateMinibar() {
    const show = !!S.last && !sellerVisible && !$('viewForm').hidden && window.innerWidth <= 1080;
    $('minibar').hidden = !show;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { sellerVisible = es.some((e) => e.isIntersecting); updateMinibar(); }, { threshold: 0.12 }).observe($('seller'));
  }
  let chartRz = 0;
  window.addEventListener('resize', () => {
    updateMinibar();
    clearTimeout(chartRz); chartRz = setTimeout(() => { if (CFG) renderChart(liveDisp); }, 150);
  });
  $('minibar').addEventListener('click', () => $('seller').scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // ------------------------------------------------------------------ gráfico de evolução (papel milimetrado)
  // a largura do desenho acompanha a do papel (texto sempre em escala 1:1); em telas estreitas o eixo vira 01…08
  let CW = 520;
  const CHh = 120, CL = 32, CR = 14, CT = 16, CB = 22;
  let liveDisp = null, liveAnim = 0;
  const xAt = (i) => CL + (i + 0.5) * (CW - CL - CR) / N;
  const yAt = (p) => CT + (1 - p) * (CHh - CT - CB);
  const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;

  function drawChart() {
    const target = S.livePt;
    cancelAnimationFrame(liveAnim);
    if (!target) { liveDisp = null; renderChart(null); return; }
    if (!liveDisp || liveDisp.i !== target.i || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { liveDisp = { ...target }; renderChart(liveDisp); return; }
    const from = { ...liveDisp }, t0 = performance.now(), dur = 380;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      liveDisp = { i: target.i, alta: from.alta + (target.alta - from.alta) * e, score: from.score + (target.score - from.score) * e };
      renderChart(liveDisp);
      if (k < 1) liveAnim = requestAnimationFrame(tick);
    };
    liveAnim = requestAnimationFrame(tick);
  }

  function renderChart(live) {
    const w = $('chart').clientWidth;
    CW = w ? Math.round(Math.max(280, Math.min(600, w))) : 520;
    const narrow = CW < 440;
    const pts = [];
    for (let i = 0; i < N; i++) if (S.evol[i]) pts.push({ i, alta: S.evol[i].alta, score: S.evol[i].score });
    const last = pts[pts.length - 1] || null;
    const colW = (CW - CL - CR) / N;
    let s = `<svg viewBox="0 0 ${CW} ${CHh}" role="img" aria-label="Evolução da chance de o lead ser altamente qualificado, pergunta a pergunta">`;
    if (S.step >= 0 && S.step < N) s += `<rect class="colcur" x="${(xAt(S.step) - colW / 2 + 2).toFixed(1)}" y="${CT - 9}" width="${(colW - 4).toFixed(1)}" height="${CHh - CT - CB + 11}" rx="3"/>`;
    for (const g of [0, 0.25, 0.5, 0.75, 1]) {
      const edge = g === 0 || g === 1;
      s += `<line class="gl${edge ? ' edge' : ''}" x1="${CL}" x2="${CW - CR}" y1="${yAt(g)}" y2="${yAt(g)}"/>`;
    }
    for (const g of [0, 0.5, 1]) s += `<text class="yl" x="${CL - 6}" y="${yAt(g) + 3}" text-anchor="end">${g * 100}%</text>`;
    CAMPOS.forEach((c, i) => { const cls = i === S.step ? 'cur' : S.evol[i] ? 'done' : ''; s += `<text class="xl ${cls}" x="${xAt(i).toFixed(1)}" y="${CHh - 6}" text-anchor="middle">${escapeHtml(narrow ? pad2(i + 1) : c.curto)}</text>`; });

    const A = pts.map((p) => [xAt(p.i), yAt(p.alta)]), Sc = pts.map((p) => [xAt(p.i), yAt(p.score)]);
    const LA = live ? [xAt(live.i), yAt(live.alta)] : null, LS = live ? [xAt(live.i), yAt(live.score)] : null;
    const ahead = live && (!last || live.i > last.i);
    const area = ahead ? [...A, LA] : A;
    if (area.length) s += `<path class="area" d="M${pt(area[0][0], yAt(0))} L${area.map((p) => pt(p[0], p[1])).join(' L')} L${pt(area[area.length - 1][0], yAt(0))} Z"/>`;
    if (Sc.length > 1) s += `<polyline class="ln-s" points="${Sc.map((p) => pt(p[0], p[1])).join(' ')}"/>`;
    if (A.length > 1) s += `<polyline class="ln-a" points="${A.map((p) => pt(p[0], p[1])).join(' ')}"/>`;
    if (ahead && last) {
      s += `<line class="ln-s go" x1="${xAt(last.i)}" y1="${yAt(last.score)}" x2="${LS[0]}" y2="${LS[1]}"/>`;
      s += `<line class="ln-a go" x1="${xAt(last.i)}" y1="${yAt(last.alta)}" x2="${LA[0]}" y2="${LA[1]}"/>`;
    }
    pts.forEach((p) => {
      s += `<circle class="pt-s" cx="${xAt(p.i)}" cy="${yAt(p.score)}" r="2.3"/>`;
      s += `<circle class="pt-a" cx="${xAt(p.i)}" cy="${yAt(p.alta)}" r="${p === last && !live ? 4.8 : 3.5}"/>`;
    });
    if (live) {
      s += `<circle class="pt-s" cx="${LS[0]}" cy="${LS[1]}" r="2.6"/>`;
      s += `<circle class="livering" cx="${LA[0]}" cy="${LA[1]}" r="9"/><circle class="livedot" cx="${LA[0]}" cy="${LA[1]}" r="5.2"/>`;
    }
    let best = null;
    for (let k = 1; k < pts.length; k++) { const d = pts[k].alta - pts[k - 1].alta; if (d >= 0.15 && (!best || d > best.d)) best = { d, p: pts[k] }; }
    if (best) {
      // o salto maior ganha uma anotação ao lado do meio do segmento (acima da subida, longe da etiqueta do ponto final)
      const prev = pts[pts.indexOf(best.p) - 1];
      const mx = (xAt(prev.i) + xAt(best.p.i)) / 2, my = (yAt(prev.alta) + yAt(best.p.alta)) / 2;
      const left = mx - 50 > CL;
      s += `<text class="jl" x="${(left ? mx - 7 : mx + 7).toFixed(1)}" y="${(left ? my - 4 : my + 13).toFixed(1)}" text-anchor="${left ? 'end' : 'start'}">+${Math.round(best.d * 100)} pts</text>`;
    }
    const lab = live ? { x: LA[0], y: LA[1], v: live.alta } : last ? { x: xAt(last.i), y: yAt(last.alta), v: last.alta } : null;
    if (lab) {
      const txt = Math.round(lab.v * 100) + '%';
      const lx = Math.min(CW - CR - 20, Math.max(CL + 20, lab.x));
      const ly = lab.y - 13 < CT - 4 ? lab.y + 20 : lab.y - 11;
      s += `<rect class="vt" x="${lx - 20}" y="${ly - 12}" width="40" height="17" rx="3"/>`;
      s += `<text class="vl" x="${lx}" y="${ly + 1}" text-anchor="middle">${txt}</text>`;
    }
    if (!pts.length && !live) s += `<text class="empty" x="${(CL + CW - CR) / 2}" y="${yAt(0.5) + 4}" text-anchor="middle">a curva nasce na primeira resposta</text>`;
    s += '</svg>';
    $('chart').innerHTML = s;
  }

  // ------------------------------------------------------------------ formulário (slides)
  function setSlide(node) { $('stage').replaceChildren(node); }

  function welcomeSlide() {
    const li = (ic, txt) => el('li', { html: ic + `<span>${escapeHtml(txt)}</span>` });
    return el('div', { class: 'slide welcome' }, [
      el('span', { class: 'kicker', text: 'Implementação de IA sob medida' }),
      el('h2', { text: 'Descubra em 2 minutos se a IA pode destravar o gargalo da sua empresa.' }),
      el('p', { html: 'Responda 8 perguntas rápidas. Enquanto você digita, a <b>visão do vendedor</b> mostra o Jev qualificando o seu lead <b>em tempo real</b>.' }),
      el('div', { class: 'qa' }, [
        el('button', { class: 'jev-btn jev-btn--primary big', type: 'button', id: 'startBtn', onclick: () => goTo(0), html: 'Começar' + ICON.arrow }),
        el('span', { class: 'hint', html: 'pressione <kbd>Enter ↵</kbd>' }),
      ]),
      el('ul', { class: 'wmeta' }, [li(ICON.watch, '2 minutos'), li(ICON.bolt, 'avaliado a cada pausa na digitação'), li(ICON.lock, 'nenhum vendedor real recebe os dados')]),
    ]);
  }

  function questionSlide(i) {
    const c = CAMPOS[i];
    const s = el('div', { class: 'slide q', 'data-campo': c.id });
    s.append(el('div', { class: 'qn' }, [el('span', { class: 'qn-i', text: pad2(i + 1) }), el('span', { class: 'qn-r', 'aria-hidden': 'true' }), el('span', { class: 'of', text: `de ${pad2(N)}` })]));
    s.append(el('h2', { class: 'qt', text: c.titulo }));
    if (c.ajuda) s.append(el('p', { class: 'qh', text: c.ajuda }));
    if (c.tipo === 'opcoes') {
      const box = el('div', { class: 'fopts' + (c.opcoes.length > 4 ? ' two' : ''), role: 'radiogroup', 'aria-label': c.titulo });
      c.opcoes.forEach((o, k) => {
        const sel = S.answers[c.id] === o;
        const b = el('button', { type: 'button', class: 'fopt' + (sel ? ' sel' : ''), 'data-v': o, role: 'radio', 'aria-checked': sel ? 'true' : 'false' },
          [el('kbd', { text: String.fromCharCode(65 + k) }), el('span', { class: 'ot', text: o }), el('span', { class: 'ck', html: ICON.check })]);
        b.addEventListener('click', (e) => { if (S.busy) return; if (e.isTrusted) stopPreset(); pickOption(c, o, true); });
        box.append(b);
      });
      s.append(box);
    } else {
      const attrs = { class: 'qi', maxlength: String(c.max), placeholder: c.placeholder || '', 'aria-label': c.titulo, autocomplete: 'off', spellcheck: 'false' };
      const inp = c.tipo === 'longo' ? el('textarea', { ...attrs, rows: '3' }) : el('input', { ...attrs, type: 'text' });
      inp.value = S.answers[c.id] || '';
      inp.addEventListener('input', () => onType(c, inp));
      inp.addEventListener('keydown', (e) => {
        if (e.isTrusted && presetRunning && e.key.length === 1) stopPreset();
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); commit(); }
      });
      s.append(inp);
      s.append(el('div', { class: 'qmeta' }, [el('span', { class: 'qlive', id: 'qlive' }), el('span', { class: 'qcount', id: 'qcount' })]));
      if (c.sugestoes) s.append(el('div', { class: 'qsug' }, c.sugestoes.map((t) => el('button', { type: 'button', class: 'jev-chip', text: t, onclick: () => { stopPreset(); setVal(inp, t); inp.focus(); } }))));
      requestAnimationFrame(() => autoGrow(inp));
    }
    s.append(el('div', { class: 'qerr', id: 'qerr', role: 'alert' }));
    const hint = c.tipo === 'opcoes' ? `tecle <kbd>A</kbd>–<kbd>${String.fromCharCode(64 + c.opcoes.length)}</kbd> para escolher`
      : c.tipo === 'longo' ? 'pressione <kbd>Enter ↵</kbd> · <kbd>Shift+Enter</kbd> quebra a linha' : 'pressione <kbd>Enter ↵</kbd>';
    s.append(el('div', { class: 'qa' }, [
      el('button', { type: 'button', class: 'jev-btn jev-btn--primary', id: 'okBtn', onclick: () => commit(), html: (i === N - 1 ? 'Enviar' : 'OK') + ICON.check }),
      el('span', { class: 'hint', html: hint }),
    ]));
    return s;
  }

  function autoGrow(inp) {
    if (inp.tagName !== 'TEXTAREA') return;
    inp.style.height = 'auto';
    inp.style.height = Math.min(210, Math.max(92, inp.scrollHeight + 2)) + 'px';
  }
  function onType(c, inp) {
    S.answers[c.id] = inp.value;
    autoGrow(inp);
    const cnt = $('qcount'); if (cnt) cnt.textContent = inp.value.length > c.max * 0.7 ? `${inp.value.length}/${c.max}` : '';
    const err = $('qerr'); if (err) err.textContent = '';
    liveSched.poke();
  }
  function setVal(inp, v) {
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    try { inp.setSelectionRange(v.length, v.length); } catch {}
    if (inp.tagName === 'TEXTAREA') inp.scrollTop = inp.scrollHeight;
  }
  function pickOption(c, o, andCommit) {
    S.answers[c.id] = o;
    document.querySelectorAll('#stage .fopt').forEach((b) => { const on = b.dataset.v === o; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    const err = $('qerr'); if (err) err.textContent = '';
    if (andCommit) setTimeout(() => commit(), 380);
  }

  function goTo(i) {
    if (i < -1 || i > N - 1) return;
    liveSched.cancel();
    S.step = i;
    setSlide(i < 0 ? welcomeSlide() : questionSlide(i));
    updateChrome();
    if (!isTouch) { const f = document.querySelector('#stage .qi'); if (f) f.focus({ preventScroll: true }); }
    drawChart();
    thinking();
  }

  function updateChrome() {
    $('fprog').style.width = (S.step >= N ? 100 : (Math.max(0, S.step) / N) * 100) + '%';
    $('fstep').textContent = S.step < 0 ? `${N} perguntas · 2 minutos` : S.step >= N ? 'Ficha concluída' : `Pergunta ${S.step + 1} de ${N}`;
    $('navPrev').disabled = S.step <= 0 || S.step >= N;
    $('navNext').disabled = S.step >= N;
  }

  function resetAll() {
    liveSched.cancel();
    S.answers = {}; S.evol = []; S.livePt = null; S.lead = null; S.run = rid(16);
    gen++; lastRes = null; inflight.clear(); shownSeq = ++reqSeq; // descarta qualquer resposta ainda a caminho
    resetPanel();
    goTo(-1);
  }

  // ------------------------------------------------------------------ presets com digitação automática
  function setPresetUI(p) {
    presetRunning = !!p;
    $('presetbar').hidden = !p; $('presets').hidden = !!p;
    document.querySelectorAll('#presets .jev-chip').forEach((x) => x.classList.toggle('run', !!p && x.dataset.preset === p.id));
    if (p) $('presetTxt').textContent = `Preenchendo como ${semEmoji(p.rotulo)}… observe a prancheta do vendedor`;
  }
  function stopPreset() { if (!presetRunning) return; presetTok++; fast = false; setPresetUI(null); }

  async function waitVisible(tok) { while (document.hidden && tok === presetTok) await sleep(300); }

  async function typeInto(text, tok) {
    const inp = document.querySelector('#stage .qi');
    if (!inp) return;
    if (!isTouch) inp.focus({ preventScroll: true });
    const chars = Array.from(text);
    let cur = '';
    for (let k = 0; k < chars.length; k++) {
      if (tok !== presetTok) return;
      await waitVisible(tok);
      if (fast) { setVal(inp, text); return; }
      cur += chars[k]; setVal(inp, cur);
      let d = 16 + Math.random() * 26;
      if (/[.,;:!?]/.test(chars[k])) d += 150 + Math.random() * 110;
      else if (chars[k] === ' ') d += Math.random() * 30;
      await sleep(d);
    }
  }

  async function runPreset(p) {
    const tok = ++presetTok; fast = false;
    switchTab('form');
    resetAll();
    setPresetUI(p);
    await sleep(300); if (tok !== presetTok) return;
    goTo(0);
    await sleep(450);
    for (let i = 0; i < N; i++) {
      if (tok !== presetTok) return;
      const c = CAMPOS[i], v = p.respostas[c.id];
      if (c.tipo === 'opcoes') {
        const btn = [...document.querySelectorAll('#stage .fopt')].find((b) => b.dataset.v === v);
        await sleep(fast ? 80 : 420); if (tok !== presetTok) return;
        if (btn) btn.classList.add('hover');
        await sleep(fast ? 80 : 380); if (tok !== presetTok) return;
        if (btn) btn.classList.remove('hover');
        pickOption(c, v, false);
      } else {
        await typeInto(v, tok);
      }
      if (tok !== presetTok) return;
      await sleep(fast ? 120 : 420);
      await waitVisible(tok);
      if (tok !== presetTok) return;
      const ok = await commit();
      if (!ok) { if (tok === presetTok) stopPreset(); return; }
      await sleep(fast ? 200 : 480);
    }
    if (tok === presetTok) stopPreset();
  }

  // ------------------------------------------------------------------ finais personalizados
  function nomes() {
    const raw = norm(S.answers.nome_empresa);
    const [a, ...rest] = raw.split(',');
    const first = norm(a).split(' ')[0] || '';
    return { nome: first.slice(0, 30), empresa: norm(rest.join(',')).slice(0, 60) };
  }
  function portePhrase(v) {
    if (!v) return '';
    if (/^\d/.test(v)) return `${v} pessoas`;
    if (/^Mais de/.test(v)) return 'mais de 1.000 pessoas';
    return '';
  }
  function verbaPhrase(v) {
    if (!v) return 'verba a definir';
    if (/^Ainda/.test(v)) return 'ainda sem verba definida';
    if (/^Até/.test(v)) return 'verba de até ' + v.slice(4);
    if (/^Acima/.test(v)) return 'verba acima de ' + v.replace(/^Acima de /, '');
    return 'verba ' + v.charAt(0).toLowerCase() + v.slice(1);
  }
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

  function whyBox(r) {
    const box = el('div', { class: 'why' }, [el('h5', { text: 'Por que este final? O Jev escolheu entre 5 caminhos' })]);
    const b = el('div'); box.append(b);
    bars(b, r.proximo_passo.probabilidades, { labels: PASSO_CURTO });
    const sc = r.sessao_custo;
    box.append(el('div', { class: 'wm', html:
      `<span>lead score <b>${r.lead_score}</b></span><span>compra em 30 dias <b>${fmt.pct(r.compra_30_dias)}</b></span>`
      + (sc ? `<span>qualificado em <b>${sc.chamadas}</b> chamadas ao Jev · <b>${fmt.int(sc.decisoes)}</b> decisões · custo total <b>${fmt.usd(sc.custo)}</b></span>` : '') }));
    return box;
  }

  function endButtons() {
    return el('div', { class: 'fact fend' }, [
      el('button', { type: 'button', class: 'jev-btn jev-btn--sm', onclick: () => switchTab('leads'), html: ICON.ledger + 'Ver no painel de leads' }),
      el('button', { type: 'button', class: 'jev-btn jev-btn--sm jev-btn--ghost', onclick: () => { stopPreset(); resetAll(); }, html: ICON.redo + 'Novo preenchimento' }),
    ]);
  }

  function okBox(title, text, id) {
    return el('div', { class: 'okbox', id: id || null }, [el('span', { class: 'ic-ok', html: ICON.stamp }), el('div', {}, [el('b', { text: title }), el('span', { text })])]);
  }

  async function finalAction(acao, btn, box, okTitle, okText) {
    if (!S.lead) return;
    btn.disabled = true;
    try {
      const r = await api('/api/acao-final', { lead_id: S.lead.id, sessao, acao });
      S.lead = r.lead;
      box.replaceWith(okBox(okTitle, okText));
      refreshLeadCount();
    } catch { btn.disabled = false; }
  }

  function calendar(onPick) {
    const days = []; const d = new Date(); d.setHours(12, 0, 0, 0);
    while (days.length < 5) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) days.push(new Date(d)); }
    const HORAS = ['09:00', '10:30', '14:00', '16:30'];
    const seed = (S.lead && S.lead.id) || 'x';
    const busy = (k) => { let h = 7; for (const ch of seed + k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 10 < 3; };
    const grid = el('div', { class: 'cal', role: 'group', 'aria-label': 'Horários disponíveis' });
    days.forEach((day, di) => {
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const col = el('div', { class: 'cal-d' }, [el('div', { class: 'cal-h', html: `<b>${escapeHtml(day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''))}</b>${day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` })]);
      HORAS.forEach((h, hi) => {
        const off = busy(di + ':' + hi) && !(di === 0 && hi === 1);
        const b = el('button', { type: 'button', class: 'slot', text: h, disabled: off, title: off ? 'ocupado' : `${day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${h}`, 'data-dia': iso, 'data-hora': h });
        b.addEventListener('click', () => { grid.querySelectorAll('.slot').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); onPick({ dia: iso, hora: h, date: day }); });
        col.append(b);
      });
      grid.append(col);
    });
    return grid;
  }

  function goFinal(r) {
    S.step = N; S.livePt = null;
    updateChrome(); drawChart(); thinking();
    const pp = r.proximo_passo.escolha;
    const { nome, empresa } = nomes();
    const who = nome || 'Olá';
    const area = r.area ? r.area.escolha : 'indefinido';
    const t = QTONE[r.qualificacao.escolha] || ['t-none', ''];
    const w = el('div', { class: 'slide final', 'data-final': pp });
    w.append(el('div', { class: 'fk' }, [
      el('span', { class: 'jev-badge violet', html: ICON.bolt + escapeHtml(`final escolhido pelo Jev · ${fmt.pct(r.proximo_passo.probabilidades[pp])}`) }),
      el('span', { class: 'jev-badge ' + t[0], text: r.qualificacao.label }),
    ]));
    const ans = S.answers;

    if (pp === 'agendar_reuniao_especialista') {
      w.append(el('h2', { text: `${who}, seu projeto tem cara de implementação sob medida` }));
      w.append(el('p', { class: 'lead-p', html: `<b>${escapeHtml(AREA_SOL[area])}</b>${empresa ? ' para a ' + escapeHtml(empresa) : ''}${portePhrase(ans.porte) ? ' (' + escapeHtml(portePhrase(ans.porte)) + ')' : ''}, com ${escapeHtml(verbaPhrase(ans.orcamento))}. Escolha um horário para 30 minutos com um especialista:` }));
      const box = el('div', { class: 'fbox agenda' });
      let chosen = null;
      const confirm = el('button', { type: 'button', class: 'jev-btn jev-btn--primary', id: 'confirmSlot', disabled: true }, ['Confirmar horário']);
      const sel = el('span', { class: 'hint', text: 'Escolha um horário acima (horário de Brasília).' });
      box.append(calendar((c) => { chosen = c; confirm.disabled = false; sel.textContent = `${c.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, às ${c.hora}`; }));
      box.append(el('div', { class: 'fact' }, [confirm, sel]));
      confirm.addEventListener('click', async () => {
        if (!chosen || !S.lead) return;
        confirm.disabled = true; confirm.textContent = 'Reservando…';
        try {
          const rr = await api('/api/reservar', { lead_id: S.lead.id, sessao, dia: chosen.dia, hora: chosen.hora });
          S.lead = rr.lead;
          const quando = chosen.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
          box.replaceWith(okBox(`Reunião confirmada: ${quando}, às ${chosen.hora}`, 'Horário de Brasília · 30 minutos com um especialista. Demo: nenhum convite foi enviado.', 'bookedBox'));
          refreshLeadCount();
        } catch { confirm.disabled = false; confirm.textContent = 'Confirmar horário'; }
      });
      w.append(box);
    } else if (pp === 'enviar_proposta_expressa') {
      w.append(el('h2', { text: `${who}, sua proposta expressa já está pronta` }));
      w.append(el('p', { class: 'lead-p', text: 'Pelo que você contou, um escopo enxuto resolve — sem precisar de reunião.' }));
      const box = el('div', { class: 'fbox' });
      box.append(el('div', { class: 'ptitle' }, [el('b', { text: 'Proposta · ' + AREA_SOL[area] }), el('span', { class: 'jev-badge info', text: r.area.label })]));
      if (ans.processo) box.append(el('p', { class: 'quote', text: '“' + cut(norm(ans.processo), 150) + '”' }));
      box.append(el('ul', { class: 'plist' }, [
        el('li', {}, [el('span', { class: 'n', text: '1' }), el('span', { html: '<b>Diagnóstico do processo</b> <span class="t">— 1 semana</span>' })]),
        el('li', {}, [el('span', { class: 'n', text: '2' }), el('span', { html: '<b>Piloto com IA no seu processo</b> <span class="t">— 3 a 4 semanas</span>' })]),
        el('li', {}, [el('span', { class: 'n', text: '3' }), el('span', { html: `<b>Implantação e treinamento</b> <span class="t">— investimento dentro da faixa informada (${escapeHtml(ans.orcamento || 'a definir')})</span>` })]),
      ]));
      const btn = el('button', { type: 'button', class: 'jev-btn jev-btn--primary', html: ICON.mail + 'Receber a proposta completa' });
      const act = el('div', { class: 'fact' }, [btn, el('span', { class: 'hint', text: 'Prazo desejado: ' + cut(norm(ans.prazo || 'a definir'), 60) })]);
      btn.addEventListener('click', () => finalAction('proposta', btn, act, 'Proposta registrada!', 'Num projeto real, ela chegaria no seu e-mail em minutos. Demo: nenhum e-mail foi enviado.'));
      box.append(act);
      w.append(box);
    } else if (pp === 'oferecer_curso_online') {
      w.append(el('h2', { text: `${who}, o melhor caminho agora é aprender a fazer` }));
      w.append(el('p', { class: 'lead-p', text: 'Para o seu momento, um projeto sob medida sairia caro. Com o curso online você monta o seu primeiro agente de IA em poucas semanas — no seu ritmo.' }));
      const box = el('div', { class: 'fbox' });
      box.append(el('div', { class: 'ptitle' }, [el('b', { text: 'Curso online · IA na Prática para Pequenos Negócios' }), el('span', { class: 'jev-badge good', text: 'ideal para você' })]));
      box.append(el('ul', { class: 'plist' }, [
        el('li', {}, [el('span', { class: 'n', text: '1' }), el('span', { html: `<b>Seu primeiro agente de IA</b> <span class="t">— focado em ${escapeHtml((r.area.label || '').toLowerCase())}, passo a passo</span>` })]),
        el('li', {}, [el('span', { class: 'n', text: '2' }), el('span', { html: '<b>Modelos prontos</b> <span class="t">— WhatsApp, Instagram e planilhas</span>' })]),
        el('li', {}, [el('span', { class: 'n', text: '3' }), el('span', { html: '<b>Comunidade e aulas ao vivo</b> <span class="t">— para tirar dúvidas toda semana</span>' })]),
      ]));
      const btn = el('button', { type: 'button', class: 'jev-btn jev-btn--primary', html: ICON.cap + 'Quero conhecer o curso' });
      const act = el('div', { class: 'fact' }, [btn]);
      btn.addEventListener('click', () => finalAction('curso', btn, act, 'Interesse registrado!', 'Demo: nada foi cobrado nem enviado.'));
      box.append(act);
      w.append(box);
    } else if (pp === 'nutrir_com_conteudo') {
      const baixaAutoridade = r.bant.autoridade.score < 2;
      w.append(el('h2', { text: `${who}, preparamos um material para o seu projeto amadurecer` }));
      w.append(el('p', { class: 'lead-p', text: 'Pelo que você contou, o próximo passo é levar a ideia adiante com números na mão.' + (baixaAutoridade ? ' Incluímos um modelo para apresentar o projeto a quem decide.' : '') }));
      const box = el('div', { class: 'fbox' });
      box.append(el('ul', { class: 'plist' }, [
        el('li', {}, [el('span', { class: 'n', text: '1' }), el('span', { html: '<b>Guia: 12 processos para automatizar com IA</b> <span class="t">— e quanto cada um economiza</span>' })]),
        el('li', {}, [el('span', { class: 'n', text: '2' }), el('span', { html: '<b>Planilha de retorno (ROI)</b> <span class="t">— para calcular quanto o projeto se paga</span>' })]),
        baixaAutoridade
          ? el('li', {}, [el('span', { class: 'n', text: '3' }), el('span', { html: '<b>Modelo de apresentação</b> <span class="t">— para aprovar o projeto com a diretoria</span>' })])
          : el('li', {}, [el('span', { class: 'n', text: '3' }), el('span', { html: `<b>Estudo de caso</b> <span class="t">— ${escapeHtml(AREA_SOL[area])}</span>` })]),
      ]));
      const btn = el('button', { type: 'button', class: 'jev-btn jev-btn--primary', html: ICON.book + 'Receber o material gratuito' });
      const act = el('div', { class: 'fact' }, [btn]);
      btn.addEventListener('click', () => finalAction('material', btn, act, 'Pronto! Voltamos a falar em 30 dias.', 'Demo: nenhum e-mail foi enviado.'));
      box.append(act);
      w.append(box);
    } else {
      w.append(el('h2', { text: `Obrigado, ${who}!` }));
      w.append(el('p', { class: 'lead-p', text: 'Pelo que você contou, uma implementação sob medida não é o melhor caminho agora — e tudo bem. Para começar a aprender IA na prática:' }));
      const box = el('div', { class: 'fbox' });
      box.append(el('ul', { class: 'plist' }, [
        el('li', {}, [el('span', { class: 'n', text: '1' }), el('span', { html: `<b><a href="${HUB}">Veja todos os apps do Jev</a></b> <span class="t">— IA decidindo em tempo real</span>` })]),
        el('li', {}, [el('span', { class: 'n', text: '2' }), el('span', { html: '<b>Escolha um processo pequeno</b> <span class="t">— do seu dia a dia, e meça quanto tempo ele leva</span>' })]),
        el('li', {}, [el('span', { class: 'n', text: '3' }), el('span', { html: '<b>Volte quando tiver um projeto</b> <span class="t">— o formulário reavalia você na hora</span>' })]),
      ]));
      w.append(box);
    }
    w.append(whyBox(r));
    w.append(endButtons());
    setSlide(w);
  }

  // ------------------------------------------------------------------ painel de leads
  let leadFilter = 'todos', leadsData = null, leadsTimer = 0, lastLeadId = null;
  function ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    const d = Math.floor(s / 86400); return `há ${d} dia${d > 1 ? 's' : ''}`;
  }
  function spark(ev) {
    const v = (ev || []).map(clamp01);
    if (v.length < 2) return '<svg viewBox="0 0 110 30"></svg>';
    const W = 110, H = 30, pts = v.map((p, i) => `${(i * (W - 6) / Math.max(1, N - 1) + 3).toFixed(1)},${(H - 3 - p * (H - 6)).toFixed(1)}`);
    const lastP = pts[pts.length - 1].split(',');
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="sp-b" x1="3" x2="${W - 3}" y1="${H - 3}" y2="${H - 3}"/><polyline class="sp-l" points="${pts.join(' ')}"/><circle class="sp-d" cx="${lastP[0]}" cy="${lastP[1]}" r="3"/></svg>`;
  }
  function etapaInfo(l) {
    const e = ETAPA[l.etapa] || [l.etapa, ''];
    if (l.etapa === 'reuniao_marcada' && l.reuniao) {
      const d = new Date(l.reuniao.dia + 'T12:00:00');
      return [e[0], `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${l.reuniao.hora}`];
    }
    return e;
  }
  function leadRow(l, rank) {
    const q = l.qualificacao || {}, t = QTONE[q.escolha] || ['t-none', ''];
    const row = el('div', { class: 'lead' + (l.meu ? ' meu' : '') + (l.id === lastLeadId ? ' novo' : ''), 'data-id': l.id });
    const btn = el('button', { type: 'button', class: 'lrow', 'aria-expanded': 'false' });
    const [et, es] = etapaInfo(l);
    btn.append(
      el('span', { class: 'lrank', text: '#' + rank }),
      el('span', { class: 'lscore', style: `--v:${l.lead_score};--c:${QCOLOR[q.escolha] || '#8F9EA2'}`, title: 'lead score' }, [el('span', { text: String(l.lead_score) })]),
      el('span', { class: 'lwho' }, [
        el('b', {}, [l.nome_empresa || '—', l.meu ? el('span', { class: 'jev-badge violet you', text: 'você' }) : null]),
        el('span', { text: `${l.cargo || '—'} · ${portePhrase(l.porte) || l.porte || ''}` }),
      ]),
      el('span', { class: 'lq' }, [
        el('span', { class: 'jev-badge ' + t[0], text: `${q.label || ''} ${fmt.pct(q.p)}` }),
        el('small', { text: `compra 30d ${fmt.pct(l.compra_30_dias)} · ${(CFG.labels.area[l.area] || l.area || '')}` }),
      ]),
      el('span', { class: 'lbant', title: 'B = orçamento · A = autoridade · N = necessidade · T = prazo' }, BANT_KEYS.map((k) => {
        const b = (l.bant || {})[k] || { score: 0, nivel: 0 };
        return el('div', { style: `--w:${(b.score / 3) * 100}%;--c:${BCOLORS[b.nivel] || '#8F9EA2'}` }, [`${BANT_LETRA[k]} ${fmt.num(b.score, 1)}`, el('i')]);
      })),
      el('span', { class: 'letapa' }, [el('b', { text: et }), el('span', { text: es })]),
      el('span', { class: 'lspark', html: spark(l.evolucao) + `<span>${escapeHtml(ago(l.ts))}</span>` }),
    );
    const det = el('div', { class: 'ldet' }, [
      el('div', {}, [el('b', { text: 'Processo' }), l.processo || '—']),
      el('div', {}, [el('b', { text: 'Custo por mês' }), l.custo || '—']),
      el('div', {}, [el('b', { text: 'Verba · prazo' }), `${l.orcamento || '—'} · ${l.prazo || '—'}`]),
      el('div', {}, [el('b', { text: 'Decisão' }), l.decisao || '—']),
      el('div', {}, [el('b', { text: 'Custo de qualificar (Jev)' }), `${l.chamadas} chamadas · ${fmt.usd(l.custo_total)}`]),
      el('div', {}, [el('b', { text: 'Próximo passo do Jev' }), CFG.labels.proximo_passo[l.proximo_passo] || l.proximo_passo]),
    ]);
    btn.addEventListener('click', () => { const open = row.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    row.append(btn, det);
    return row;
  }
  const EMPTY_ART = '<svg class="lv-art" viewBox="0 0 96 96" aria-hidden="true"><rect x="18" y="14" width="60" height="74" rx="8" class="a-board"/><rect x="26" y="26" width="44" height="54" rx="2" class="a-paper"/><rect x="36" y="8" width="24" height="12" rx="4" class="a-clip"/><path d="M34 40h28M34 50h28M34 60h18" class="a-line"/></svg>';
  function renderLeads() {
    if (!leadsData) return;
    const k = leadsData.kpis;
    $('lvKpis').innerHTML = '';
    const kpi = (label, v, s) => el('div', { class: 'jev-kpi' }, [el('div', { class: 'k', text: label }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null]);
    $('lvKpis').append(
      kpi('Leads (7 dias)', fmt.int(k.total), `${fmt.int(k.hoje)} nas últimas 24\u00a0h`),
      kpi('Quentes', fmt.int(k.quentes), k.total ? `${fmt.pct(k.quentes / k.total)} do total` : '—'),
      kpi('Reuniões marcadas', fmt.int(k.reunioes), 'direto no formulário'),
      kpi('Custo por lead (Jev)', fmt.usd(k.custo_medio), `${fmt.num(k.chamadas_medias, 1)} chamadas por lead, em média`),
    );
    let list = leadsData.leads;
    if (leadFilter === 'quentes') list = list.filter((l) => l.qualificacao.escolha === 'altamente_qualificado');
    if (leadFilter === 'meus') list = list.filter((l) => l.meu);
    const box = $('lvList'); box.innerHTML = '';
    if (!list.length) {
      box.append(el('div', { class: 'lv-empty' }, [el('div', { class: 'big', html: EMPTY_ART }), el('div', { html: leadFilter === 'todos' ? 'Nenhum lead ainda. Preencha o formulário (ou use um preset) e o lead aparece aqui, <b>já qualificado pelo Jev</b>.' : 'Nenhum lead neste filtro.' })]));
      return;
    }
    list.forEach((l, i) => box.append(leadRow(l, leadsData.leads.indexOf(l) + 1 || i + 1)));
  }
  async function loadLeads() {
    try {
      leadsData = await api('/api/leads?sessao=' + encodeURIComponent(sessao), undefined, { silent: true });
      setCount(leadsData.kpis.total);
      renderLeads();
    } catch (e) { $('lvList').innerHTML = ''; $('lvList').append(el('div', { class: 'lv-empty', text: 'Não foi possível carregar os leads agora.' })); }
  }
  function setCount(n, bump) {
    const c = $('leadCount'); c.textContent = fmt.int(n);
    if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  async function refreshLeadCount(bump) {
    try {
      const r = await api('/api/leads?sessao=' + encodeURIComponent(sessao), undefined, { silent: true });
      leadsData = r; setCount(r.kpis.total, bump);
      if (bump && S.lead) lastLeadId = S.lead.id;
      if (!$('viewLeads').hidden) renderLeads();
    } catch {}
  }

  function switchTab(tab) {
    const isForm = tab === 'form';
    $('viewForm').hidden = !isForm; $('viewLeads').hidden = isForm;
    $('tabForm').classList.toggle('on', isForm); $('tabLeads').classList.toggle('on', !isForm);
    $('tabForm').setAttribute('aria-selected', isForm ? 'true' : 'false'); $('tabLeads').setAttribute('aria-selected', isForm ? 'false' : 'true');
    clearInterval(leadsTimer);
    updateMinibar();
    if (!isForm) {
      loadLeads();
      leadsTimer = setInterval(() => { if (!document.hidden && !$('viewLeads').hidden) loadLeads(); }, 15000);
    }
  }

  // ------------------------------------------------------------------ eventos globais
  $('tabForm').addEventListener('click', () => switchTab('form'));
  $('tabLeads').addEventListener('click', () => switchTab('leads'));
  $('lvFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    leadFilter = b.dataset.f;
    $('lvFilters').querySelectorAll('.jev-chip').forEach((x) => x.classList.toggle('active', x === b));
    renderLeads();
  });
  $('navPrev').addEventListener('click', () => { if (S.busy || S.step <= 0 || S.step >= N) return; stopPreset(); goTo(S.step - 1); });
  $('navNext').addEventListener('click', () => { if (S.step < 0) goTo(0); else commit(); });
  $('presetFast').addEventListener('click', () => { fast = true; });
  $('presetStop').addEventListener('click', () => stopPreset());
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || $('viewForm').hidden) return;
    if (document.querySelector('.jev-drawer.open')) return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (S.step < 0 && e.key === 'Enter' && !typing && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); goTo(0); return; }
    if (typing || S.step < 0 || S.step >= N) return;
    const c = CAMPOS[S.step];
    if (c.tipo === 'opcoes') {
      const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && k >= 0 && k < c.opcoes.length && !S.busy) { e.preventDefault(); stopPreset(); pickOption(c, c.opcoes[k], true); }
      else if (e.key === 'Enter' && S.answers[c.id] && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); commit(); }
    }
  });

  // ------------------------------------------------------------------ início
  async function boot() {
    try { CFG = await api('/api/config', undefined, { silent: true }); }
    catch { $('stage').replaceChildren(el('div', { class: 'jev-empty', text: 'Não foi possível carregar o formulário. Recarregue a página.' })); return; }
    CAMPOS = CFG.campos; N = CAMPOS.length;
    $('heroQ').textContent = String(CFG.n_perguntas);
    gauge30 = makeGauge($('gauge30'), 'compra em 30 dias');
    CFG.presets.forEach((p) => $('presets').append(el('button', { type: 'button', class: 'jev-chip', 'data-preset': p.id, html: (PRESET_IC[p.id] || ICON.person) + `<span>${escapeHtml(semEmoji(p.rotulo))}</span>`, onclick: () => runPreset(p) })));
    resetPanel();
    goTo(-1);
    // autoteste dos instrumentos ao ligar (só na primeira vez): os ponteiros varrem a escala e voltam ao zero
    document.body.classList.add('selftest');
    setTimeout(() => document.body.classList.remove('selftest'), 2600);
    refreshLeadCount();
    const qp = new URLSearchParams(location.search);
    if (qp.get('aba') === 'leads') switchTab('leads');
    const pre = CFG.presets.find((x) => x.id === qp.get('preset'));
    if (pre) runPreset(pre);
  }
  boot();
})();

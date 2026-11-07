(function () {
  'use strict';
  const { fmt, el, api, bars, scoreMeter, toast, escapeHtml } = JevKit;
  JevKit.mountTopbar({ title: 'Chat com Moderação ao Vivo', tagline: 'Cada mensagem passa pelo Jev antes de aparecer' });
  const $ = (id) => document.getElementById(id);

  // a entrada orquestrada (CSS) roda uma vez só; depois dela a página fica "no ar" sem reanimar
  setTimeout(() => document.body.classList.add('booted'), 1700);
  // relógio de estúdio da faixa de produção (hora local)
  const clockEl = $('clock');
  const tickClock = () => { if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  tickClock(); setInterval(tickClock, 1000);
  // a placa NO AR dá um "take" (pisca mais forte) quando uma mensagem aprovada entra no ar
  const onairEl = document.querySelector('.onair');
  function onAirTake() { if (!onairEl) return; onairEl.classList.remove('take'); void onairEl.offsetWidth; onairEl.classList.add('take'); }

  // ---------------------------------------------------------------- sessão local (sid, apelido e regras ficam no navegador)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jevchat.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('jevchat.' + k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };
  const ALFA = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rid = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => ALFA[b % 36]).join(''); };
  let sid = store.get('sid', null);
  if (typeof sid !== 'string' || !/^[a-z0-9]{16,64}$/.test(sid)) { sid = rid(24); store.set('sid', sid); }
  const QS = new URLSearchParams(location.search);

  const S = {
    cfg: null, eu: null, nick: null, cor: null, rules: [], limiar: 0.7,
    msgs: new Map(), order: [], chatNodes: new Map(), logNodes: new Map(), pendings: new Map(),
    pinned: null, current: null, revealed: new Set(), stats: null, online: 1, sim: null, simShown: null,
    muteUntil: 0, muteReason: '', muteTimer: null, inflight: 0, stick: true, rulesBusy: false, editing: null, newRuleId: null,
  };

  const CAT_ORDER = ['ok', 'golpe_dinheiro_pix', 'ofensa_xingamento', 'discurso_de_odio', 'spam_propaganda', 'assedio', 'conteudo_sexual', 'dados_pessoais', 'fora_do_tema'];
  const ACAO_ORDER = ['publicar', 'publicar_com_aviso', 'ocultar', 'silenciar_autor_5min'];
  const ACAO_TONE = { publicar: 'safe', publicar_com_aviso: 'warn', ocultar: 'danger', silenciar_autor_5min: 'danger' };
  const BADGE = { ok: 'publicada', warn: 'com aviso', bad: 'ocultada', rule: 'ocultada pela sua regra', sil: 'silenciado' };
  const TOX_COLORS = ['#2BD576', '#FFB547', '#FF8A3D', '#FF3B30'];
  const SVG_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>';
  const SVG_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const SWITCH = '<span class="rk" aria-hidden="true"><b>I</b><b>O</b></span>';

  const chatList = $('chatList'), logEl = $('log');
  const hhmm = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const curto = (s, n) => { const a = [...String(s)]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : s; };
  const inicial = (nick) => ([...String(nick || '?').replace(/^[@_.\-\s]+/, '')][0] || '?').toUpperCase();

  // ---------------------------------------------------------------- lente (regras pessoais)
  function lensHit(m) {
    let best = null;
    for (const r of S.rules) {
      const p = m.regras ? m.regras[r.id] : null;
      if (p != null && p >= S.limiar && (!best || p > best.p)) best = { rule: r, p };
    }
    return best;
  }
  const globalOk = (m) => m.status === 'publicada' || m.status === 'aviso';
  const visible = (m) => globalOk(m) && !lensHit(m);
  function kindOf(m) {
    if (m.status === 'silenciada') return 'sil';
    if (m.status === 'ocultada') return 'bad';
    if (lensHit(m)) return 'rule';
    return m.status === 'aviso' ? 'warn' : 'ok';
  }
  const shouldBlur = (m) => !m.bot && !m.mine && m.status === 'ocultada' && !S.revealed.has(m.id);
  function motivoTxt(m) {
    const mo = m.motivo || {};
    if (mo.p != null) return `${mo.label} (${fmt.pct(mo.p)})`;
    if (mo.valor != null) return `${mo.label} (${fmt.num(mo.valor, 1)} de 3)`;
    return mo.label || '';
  }
  function riscoDe(m) {
    if (m.status === 'silenciada') return 1;
    const probs = (m.cat && m.cat.probs) || {};
    const ruim = ['golpe_dinheiro_pix', 'ofensa_xingamento', 'discurso_de_odio', 'assedio', 'conteudo_sexual', 'dados_pessoais', 'spam_propaganda'].reduce((s, c) => s + (probs[c] || 0), 0);
    const h = lensHit(m);
    return Math.max(0.02, Math.min(1, Math.max(ruim, (m.tox ? m.tox.score : 0) / 3, h ? h.p : 0)));
  }
  function chipTxt(m) {
    const k = kindOf(m);
    if (k === 'bad') return motivoTxt(m);
    if (k === 'rule') { const h = lensHit(m); return `${curto(h.rule.texto, 24)} ${fmt.pct(h.p)}`; }
    if (k === 'sil') return 'autor silenciado';
    if (k === 'warn') return m.motivo?.label || 'aviso';
    const c = m.cat && m.cat.choice;
    if (c === 'fora_do_tema') return `fora do tema ${fmt.pct(m.cat.probs.fora_do_tema || 0)}`;
    const pOk = m.cat && m.cat.probs ? m.cat.probs.ok : null;
    return pOk != null ? `ok ${fmt.pct(pOk)}` : 'publicada';
  }

  // ---------------------------------------------------------------- chat (o que o público vê)
  function avatar(nick, cor, cls) { return el('span', { class: cls || 'av', style: { background: cor || '#B9B3A6' }, text: inicial(nick) }); }
  function fillChatNode(n, m) {
    const k = kindOf(m);
    const shownAsHidden = !visible(m);
    n.className = 'cm' + (m.status === 'aviso' && !shownAsHidden ? ' warn' : '') + (shownAsHidden ? ' hidden-own' : '') + (k === 'rule' ? ' by-rule' : '') + (m.mine ? ' mine' : '');
    n.dataset.id = m.id;
    const body = el('div', { class: 'cm-body' }, [el('span', { class: 'cm-nick', style: { color: m.cor }, text: m.nick })]);
    if (m.bot) body.append(el('span', { class: 'cm-tag', text: 'sim', title: 'Mensagem da simulação (bot roteirizado) — avaliada pelo Jev de verdade' }));
    if (m.mine) body.append(el('span', { class: 'cm-tag me', text: 'você' }));
    body.append(el('span', { class: 'cm-text', text: m.texto }));
    if (!shownAsHidden) {
      const warn = m.status === 'aviso';
      body.append(el('span', { class: 'cm-meta', title: `Aprovada pelo Jev em ${m.ms} ms (${m.nq} perguntas numa chamada)` }, [(warn ? (m.motivo?.label || 'aviso') + ' · ' : '✓ ') + fmt.ms(m.ms)]));
    } else {
      let html;
      if (k === 'rule') { const h = lensHit(m); html = `Sua mensagem foi ocultada pela sua regra <b>“${escapeHtml(h.rule.texto)}”</b> (${fmt.pct(h.p)}). Regras pessoais valem só para a sua visão do chat.`; }
      else html = `Sua mensagem foi ocultada: <b>${escapeHtml(motivoTxt(m))}</b>. Só você vê isto.`;
      if (m.silenciou) html += ' Você foi silenciado por 5 min.';
      body.append(el('div', { class: 'cm-note', html }));
    }
    n.replaceChildren(avatar(m.nick, m.cor), body);
  }
  function insertChat(n, m) {
    const kids = chatList.children;
    for (let i = kids.length - 1; i >= 0; i--) {
      const other = S.msgs.get(kids[i].dataset.id);
      if (!other || kids[i].classList.contains('pending')) continue;
      if (other.seq < m.seq) { kids[i].after(n); return; }
    }
    chatList.prepend(n);
  }
  function scrollChat(force) {
    if (force || S.stick) { chatList.scrollTop = chatList.scrollHeight; $('newPill').hidden = true; }
    else $('newPill').hidden = false;
  }
  function onScreen(n) {
    const a = chatList.getBoundingClientRect(), r = n.getBoundingClientRect();
    return r.bottom > a.top + 4 && r.top < a.bottom - 4 && !document.hidden;
  }
  function vanish(n, m, delay) {
    S.chatNodes.delete(m.id);
    if (delay == null || !onScreen(n)) { n.remove(); if (S.stick) scrollChat(true); return false; }
    const k = kindOf(m); const h = lensHit(m);
    setTimeout(() => {
      n.style.maxHeight = n.offsetHeight + 'px';
      n.dataset.reason = k === 'rule' && h ? `ocultada pela sua regra “${curto(h.rule.texto, 34)}” · ${fmt.pct(h.p)}` : `ocultada: ${motivoTxt(m)}`;
      n.classList.add('vanish', k === 'rule' ? 'v-rule' : 'v-bad');
      setTimeout(() => { n.classList.add('gone'); setTimeout(() => { n.remove(); if (S.stick) scrollChat(true); updateEmpty(); }, 500); }, 1700);
    }, delay);
    return true;
  }
  function renderChatMsg(m, isNew, delay) {
    const shown = m.mine || visible(m);
    const n = S.chatNodes.get(m.id);
    if (!shown) { if (n) return vanish(n, m, delay) ? 'anim' : false; return false; }
    if (!n) {
      const node = el('div');
      fillChatNode(node, m);
      insertChat(node, m);
      S.chatNodes.set(m.id, node);
      if (isNew) { node.classList.add('enter'); scrollChat(m.mine); }
    } else fillChatNode(n, m);
    return true;
  }
  function updateEmpty() { $('chatEmpty').hidden = chatList.children.length > 0; }

  function addPending(nonce, texto) {
    const n = el('div', { class: 'cm pending mine', 'data-nonce': nonce }, [
      avatar(S.nick, S.cor),
      el('div', { class: 'cm-body' }, [
        el('span', { class: 'cm-nick', style: { color: S.cor }, text: S.nick }), el('span', { class: 'cm-tag me', text: 'você' }),
        el('span', { class: 'cm-text', text: texto }),
        el('span', { class: 'cm-meta', text: 'Jev analisando…' }),
      ]),
    ]);
    chatList.append(n); S.pendings.set(nonce, n); updateEmpty(); scrollChat(true);
  }
  function failPending(nonce, err) {
    const n = S.pendings.get(nonce); if (!n) return;
    S.pendings.delete(nonce);
    n.classList.remove('pending'); n.classList.add('failed');
    const meta = n.querySelector('.cm-meta'); if (meta) meta.textContent = '✗ não enviada' + (err && err.message ? ': ' + err.message : '');
    setTimeout(() => { n.classList.add('gone'); setTimeout(() => { n.remove(); updateEmpty(); }, 500); }, 4500);
  }

  // ---------------------------------------------------------------- console do moderador
  function logRow(m, isNew) {
    const k = kindOf(m);
    const row = el('button', { type: 'button', class: 'lg k-' + k + (S.pinned === m.id ? ' pinned' : '') + (isNew ? ' enter' : ''), 'data-id': m.id, title: 'Ver a decisão completa do Jev', onclick: () => pin(m.id) }, [
      el('span', { class: 'lg-ic' }, [el('span', { class: 'sr', text: BADGE[k] + ': ' })]),
      el('span', { class: 'lg-t', text: hhmm(m.ts) }),
      el('span', { class: 'lg-n', text: m.nick }),
      el('span', { class: 'lg-x' + (shouldBlur(m) ? ' blur' : ''), text: m.texto }),
      el('span', { class: 'lg-bar', title: 'Probabilidade de violar (categorias ruins, toxicidade ou sua regra)' }, [el('i', { style: { width: Math.round(100 * riscoDe(m)) + '%' } })]),
      el('span', { class: 'lg-c k-' + k, text: chipTxt(m) }),
      el('span', { class: 'lg-ms', text: m.ms ? fmt.ms(m.ms) : '—' }),
    ]);
    return row;
  }
  function renderLog(m, isNew) {
    const old = S.logNodes.get(m.id);
    const row = logRow(m, isNew && !old);
    if (old) old.replaceWith(row);
    else {
      let placed = false;
      for (const child of logEl.children) { const o = S.msgs.get(child.dataset.id); if (o && o.seq < m.seq) { child.before(row); placed = true; break; } }
      if (!placed) logEl.append(row);
      const extra = logEl.querySelector('.log-empty'); if (extra) extra.remove();
    }
    S.logNodes.set(m.id, row);
    while (logEl.children.length > 150) { const last = logEl.lastElementChild; S.logNodes.delete(last.dataset.id); last.remove(); }
  }
  function pin(id) {
    const m = S.msgs.get(id); if (!m) return;
    const prev = S.pinned; S.pinned = id;
    if (prev && S.logNodes.get(prev)) S.logNodes.get(prev).classList.remove('pinned');
    const row = S.logNodes.get(id); if (row) row.classList.add('pinned');
    renderDecision(m, true);
    if (window.matchMedia('(max-width: 860px)').matches) $('dec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function unpin() {
    if (S.pinned && S.logNodes.get(S.pinned)) S.logNodes.get(S.pinned).classList.remove('pinned');
    S.pinned = null;
    const last = S.msgs.get(S.order[S.order.length - 1]);
    if (last) renderDecision(last, true);
  }
  function renderDecision(m, flash) {
    if (!m) return;
    S.current = m.id;
    $('decEmpty').hidden = true; $('decBody').hidden = false;
    const k = kindOf(m);
    const card = $('dec');
    card.className = 'dec k-' + k;
    if (flash) { void card.offsetWidth; card.classList.add('flash'); }
    const b = $('decBadge'); b.className = 'dbadge k-' + k; b.textContent = BADGE[k];
    $('decWho').textContent = m.nick; $('decWho').style.color = m.cor;
    $('decTag').hidden = !m.bot;
    $('decTime').textContent = hhmm(m.ts);
    $('decLive').hidden = S.pinned !== m.id;
    const t = $('decText'); t.textContent = '“' + m.texto + '”'; t.classList.toggle('blur', shouldBlur(m));
    $('decReveal').hidden = !shouldBlur(m);
    let reason;
    if (k === 'bad') reason = `Oculta para todos: <b>${escapeHtml(motivoTxt(m))}</b>${m.silenciou ? ' · autor silenciado por 5 min' : ''}`;
    else if (k === 'rule') { const h = lensHit(m); reason = `Aprovada nas diretrizes gerais, mas oculta na sua visão pela regra <b>“${escapeHtml(h.rule.texto)}”</b> (${fmt.pct(h.p)})`; }
    else if (k === 'warn') reason = `Publicada com aviso: <b>${escapeHtml(motivoTxt(m))}</b>`;
    else if (k === 'sil') reason = 'O autor está silenciado — nem chegou a ser avaliada.';
    else reason = `Publicada para todos em <b>${fmt.ms(m.ms)}</b>`;
    $('decReason').innerHTML = reason;
    const sil = m.status === 'silenciada';
    $('decGrid').hidden = sil; $('decSil').hidden = !sil; $('decRulesWrap').hidden = sil;
    if (!sil) {
      const cp = {}; for (const c of CAT_ORDER) cp[c] = (m.cat && m.cat.probs && m.cat.probs[c]) || 0;
      const tones = {}; for (const c of CAT_ORDER) tones[c] = c === 'ok' ? 'safe' : c === 'fora_do_tema' ? '' : 'danger';
      bars($('decCat'), cp, { labels: S.cfg.categorias, tones, limit: 4 });
      const ap = {}; for (const a of ACAO_ORDER) ap[a] = (m.acao && m.acao.probs && m.acao.probs[a]) || 0;
      bars($('decAcao'), ap, { labels: S.cfg.acoes, tones: ACAO_TONE, order: 'keys', keys: ACAO_ORDER });
      scoreMeter($('decTox'), { score: m.tox ? m.tox.score : 0, probabilities: (m.tox && m.tox.probs) || {} }, { levels: S.cfg.toxicidade, short: S.cfg.toxicidade, colors: TOX_COLORS });
      renderDecRules(m);
    }
    $('decMeta').innerHTML = sil ? '<span>custo <b>US$ 0</b> · nenhuma pergunta enviada</span>'
      : `<span>decidido em <b>${fmt.ms(m.ms)}</b>${m.cached ? ' (cache)' : ''}</span><span><b>${m.nq}</b> perguntas numa única chamada</span><span>custo <b>${fmt.usd(m.cost)}</b></span>`;
  }
  function renderDecRules(m) {
    const box = $('decRules'); box.innerHTML = '';
    if (!S.rules.length) { box.append(el('div', { class: 'dim', text: 'Nenhuma regra pessoal ativa.' })); return; }
    for (const r of S.rules) {
      const p = m.regras ? m.regras[r.id] : null;
      const hit = p != null && p >= S.limiar;
      const bar = el('i');
      box.append(el('div', { class: 'drule' + (hit ? ' hit' : '') + (p == null ? ' na' : ''), title: p == null ? `${r.texto}: mensagem anterior à regra (não avaliada)` : `${r.texto}: ${fmt.pct(p)}` }, [
        el('span', { class: 'drt', text: r.texto }), el('span', { class: 'drbar' }, [bar]), el('span', { class: 'drp', text: p == null ? '—' : fmt.pct(p) }),
      ]));
      requestAnimationFrame(() => { bar.style.width = (p == null ? 0 : Math.max(2, p * 100)) + '%'; });
    }
  }
  function updateKpis() {
    const st = S.stats || {};
    $('kAnal').textContent = fmt.int(st.analisadas || 0);
    const arr = S.order.map((id) => S.msgs.get(id)).filter(Boolean);
    const blocked = arr.filter((m) => !visible(m)).length;
    $('kBloq').textContent = arr.length ? fmt.pct(blocked / arr.length) : '—';
    $('kBloqS').textContent = arr.length ? `${blocked} de ${arr.length} nesta sala` : 'nesta sala';
    $('kBloq').parentElement.style.setProperty('--p', arr.length ? (blocked / arr.length).toFixed(3) : '0');
    $('kLat').textContent = st.p50_ms != null ? fmt.ms(st.p50_ms) : '—';
    const cm = st.custo_mil || 0;
    $('kCusto').innerHTML = cm ? '<small>US$</small>' + fmt.num(cm, cm < 0.1 ? 3 : 2) : '—';
    const mb = $('mtBlocked'); mb.hidden = !blocked; mb.textContent = blocked;
  }

  // ---------------------------------------------------------------- store
  function addToStore(m) {
    const prev = S.msgs.get(m.id);
    if (prev) { const regras = { ...prev.regras, ...m.regras }; Object.assign(prev, m, { regras }); return { m: prev, isNew: false }; }
    S.msgs.set(m.id, m);
    let i = S.order.length;
    while (i > 0 && S.msgs.get(S.order[i - 1]).seq > m.seq) i--;
    S.order.splice(i, 0, m.id);
    while (S.order.length > 300) { const old = S.order.shift(); S.msgs.delete(old); const cn = S.chatNodes.get(old); if (cn) { cn.remove(); S.chatNodes.delete(old); } }
    return { m, isNew: true };
  }
  function upsert(raw) {
    if (raw.nonce && S.pendings.has(raw.nonce)) { S.pendings.get(raw.nonce).remove(); S.pendings.delete(raw.nonce); }
    const { m, isNew } = addToStore(raw);
    renderChatMsg(m, isNew);
    if (isNew && visible(m)) onAirTake();
    renderLog(m, isNew);
    if (!S.pinned && (isNew || S.current === m.id)) renderDecision(m, isNew);
    else if (S.current === m.id) renderDecision(m);
    updateKpis(); updateEmpty(); renderRules(true);
  }
  function relens(animated) {
    let d = 0;
    for (const id of S.order) {
      const m = S.msgs.get(id);
      const node = S.chatNodes.get(id);
      const willHide = node && !(m.mine || visible(m));
      const anim = willHide && animated && onScreen(node);
      renderChatMsg(m, false, anim ? (d += 220) - 220 : (willHide ? null : 0));
      if (S.logNodes.has(id)) renderLog(m, false);
    }
    const cur = S.msgs.get(S.current); if (cur) renderDecision(cur);
    updateKpis(); updateEmpty();
  }
  function mergeLens(lente) {
    if (!lente) return;
    for (const [id, rs] of Object.entries(lente)) { const m = S.msgs.get(id); if (m) m.regras = { ...(m.regras || {}), ...rs }; }
  }
  function rebuildAll() {
    const keepPend = [...S.pendings.values()];
    chatList.replaceChildren(); logEl.replaceChildren(); S.chatNodes.clear(); S.logNodes.clear();
    for (const id of S.order) { const m = S.msgs.get(id); if (m.mine || visible(m)) { const n = el('div'); fillChatNode(n, m); chatList.append(n); S.chatNodes.set(id, n); } }
    for (const n of keepPend) chatList.append(n);
    for (let i = S.order.length - 1; i >= 0 && logEl.children.length < 150; i--) { const m = S.msgs.get(S.order[i]); const r = logRow(m, false); logEl.append(r); S.logNodes.set(m.id, r); }
    if (!S.order.length) logEl.append(el('div', { class: 'log-empty', text: 'Nenhuma mensagem ainda.' }));
    const last = S.msgs.get(S.pinned) || S.msgs.get(S.order[S.order.length - 1]);
    if (last) renderDecision(last); else { $('decEmpty').hidden = false; $('decBody').hidden = true; }
    updateKpis(); updateEmpty(); scrollChat(true);
  }

  // ---------------------------------------------------------------- regras
  function ruleHits(r) {
    let n = 0;
    for (const id of S.order) { const m = S.msgs.get(id); const p = m.regras ? m.regras[r.id] : null; if (globalOk(m) && p != null && p >= S.limiar) n++; }
    return n;
  }
  function renderRules(onlyCounts) {
    const list = $('rules');
    $('ruleCount').textContent = `${S.rules.length}/${S.cfg ? S.cfg.max_regras : 8}`;
    if (onlyCounts) {
      for (const li of list.querySelectorAll('.rule[data-id]')) { const r = S.rules.find((x) => x.id === li.dataset.id); const h = li.querySelector('.rh'); if (r && h) { const n = ruleHits(r); h.textContent = `ocultou ${n}`; h.hidden = !n; } }
      return;
    }
    list.replaceChildren();
    if (!S.rules.length) list.append(el('li', { class: 'rules-empty', text: 'Nenhuma regra. Só as diretrizes gerais (golpe, ofensa, ódio, spam…) estão valendo.' }));
    S.rules.forEach((r, i) => {
      if (S.editing === r.id) {
        const inp = el('input', { class: 'jev-input', value: r.texto, maxlength: '120', 'aria-label': 'Editar regra' });
        const save = async () => { const v = inp.value.trim(); if (!v || v === r.texto) { S.editing = null; renderRules(); return; } const lista = S.rules.map((x) => (x.id === r.id ? v : x.texto)); S.editing = null; await saveRules(lista, 'editar'); };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { S.editing = null; renderRules(); } });
        list.append(el('li', { class: 'rule', 'data-id': r.id }, [el('span', { class: 'rn', text: String(i + 1).padStart(2, '0') }), inp, el('button', { type: 'button', class: 'r-save', title: 'Salvar', 'aria-label': 'Salvar regra', onclick: save, html: SVG_OK })]));
        setTimeout(() => inp.focus(), 0);
        return;
      }
      const n = ruleHits(r);
      list.append(el('li', { class: 'rule' + (S.newRuleId === r.id ? ' new' : ''), 'data-id': r.id }, [
        el('span', { class: 'rn', text: String(i + 1).padStart(2, '0') }),
        el('span', { class: 'rt', text: r.texto }),
        el('span', { class: 'rh', text: `ocultou ${n}`, hidden: !n, title: 'Mensagens desta sala que esta regra ocultou na sua visão' }),
        el('button', { type: 'button', class: 'r-edit', title: 'Editar regra', 'aria-label': 'Editar regra', disabled: S.rulesBusy, onclick: () => { S.editing = r.id; renderRules(); }, html: SVG_EDIT }),
        el('button', { type: 'button', class: 'r-sw', title: 'Chave ligada: clique para desligar (remove a regra)', 'aria-label': 'Remover regra', disabled: S.rulesBusy, onclick: () => saveRules(S.rules.filter((x) => x.id !== r.id).map((x) => x.texto), 'remover'), html: SWITCH }),
      ]));
    });
    S.newRuleId = null;
    const full = S.rules.length >= (S.cfg ? S.cfg.max_regras : 8);
    $('ruleInput').disabled = full || S.rulesBusy; $('ruleBtn').disabled = full || S.rulesBusy;
    $('ruleInput').placeholder = full ? 'Limite de 8 regras' : 'Escreva uma regra…';
    const sugs = $('sugs'); sugs.replaceChildren();
    const have = new Set(S.rules.map((r) => r.texto.toLowerCase()));
    ((S.cfg && S.cfg.sugestoes) || []).filter((t) => !have.has(t.toLowerCase())).slice(0, 5).forEach((t) => {
      sugs.append(el('button', { type: 'button', class: 'jev-chip', disabled: full || S.rulesBusy, onclick: () => addRule(t) }, ['+ ' + t]));
    });
  }
  async function addRule(texto) {
    texto = String(texto || '').trim();
    if ([...texto].length < 4) { toast('Escreva a regra com pelo menos algumas palavras.'); return; }
    if ([...texto].length > 120) { toast('Cada regra pode ter no máximo 120 caracteres.'); return; }
    if (S.rules.some((r) => r.texto.toLowerCase() === texto.toLowerCase())) { toast('Essa regra já está na lista.'); return; }
    if (S.rules.length >= 8) { toast('Máximo de 8 regras.'); return; }
    const ok = await saveRules([...S.rules.map((r) => r.texto), texto], 'adicionar');
    if (ok) $('ruleInput').value = '';
  }
  async function saveRules(lista, acao) {
    if (S.rulesBusy) return false;
    S.rulesBusy = true; renderRules();
    const retro = $('retro');
    retro.hidden = false; retro.className = 'retro busy';
    retro.textContent = 'O Jev está aplicando as regras às mensagens recentes…';
    try {
      const r = await api('/api/regras', { sid, regras: lista }, { label: 'regras × histórico' });
      const antes = new Set(S.rules.map((x) => x.id));
      S.rules = r.regras;
      store.set('rules', S.rules.map((x) => x.texto));
      mergeLens(r.lente);
      const novas = S.rules.filter((x) => !antes.has(x.id));
      if (novas.length) S.newRuleId = novas[novas.length - 1].id;
      S.rulesBusy = false;
      renderRules();
      relens(true);
      showRetro(r.retro, novas, acao);
      if (novas.length) showPreview(novas[novas.length - 1]);
      return true;
    } catch (e) {
      retro.hidden = true;
      S.rulesBusy = false; renderRules();
      return false;
    }
  }
  function showRetro(retro, novas, acao) {
    const box = $('retro'); box.hidden = false; box.className = 'retro';
    if (retro && retro.avaliadas) {
      const n = retro.ocultadas.length;
      const nm = retro.mensagens, nq = retro.avaliadas;
      box.innerHTML = `<span>O Jev reavaliou <b>${nm} mensage${nm === 1 ? 'm recente' : 'ns recentes'}</b> (${nq} pergunta${nq === 1 ? '' : 's'}) numa chamada só, em <b>${fmt.ms(retro.latency_ms)}</b> · ${fmt.usd(retro.cost)} → ${n ? `<span class="hit">${n} ocultada${n === 1 ? '' : 's'}</span> na sua visão.` : 'nenhuma precisou ser ocultada.'}</span>`;
    } else if (novas.length) box.innerHTML = '<span>Regra ativa! As mensagens recentes já tinham sido avaliadas contra ela. Vale também para todas as próximas.</span>';
    else if (acao === 'remover') box.innerHTML = '<span>Regra removida. O que ela ocultava voltou a aparecer na sua visão.</span>';
    else box.innerHTML = '<span>Regras atualizadas.</span>';
  }
  function showPreview(rule) {
    const q = { [rule.id]: { type: 'noul', instructions: `Regra do chat: "${rule.texto}". A mensagem_nova desrespeita essa regra? Julgue pelo assunto e pela intenção da mensagem, não por palavras soltas.`, criteria: { true: 'Desrespeita: a mensagem faz exatamente o que a regra proíbe', false: 'Respeita: a mensagem não faz o que a regra proíbe' } } };
    const html = escapeHtml(JSON.stringify(q, null, 2))
      .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/(:\s*)(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="s">$2</span>');
    $('qprev').hidden = false; $('qprevCode').innerHTML = html;
  }

  // ---------------------------------------------------------------- apelido, envio, silêncio
  function setNick(nick, cor) {
    S.nick = nick || null; S.cor = cor || null;
    $('joinForm').hidden = !!S.nick; $('sendForm').hidden = !S.nick;
    if (S.nick) { $('meNick').textContent = S.nick; $('meNick').style.color = S.cor; const av = $('meAv'); av.textContent = inicial(S.nick); av.style.background = S.cor; }
  }
  $('joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const apelido = $('nickInput').value.trim();
    if ([...apelido].length < 2) { toast('Escolha um apelido com pelo menos 2 caracteres.'); return; }
    $('joinBtn').disabled = true;
    try {
      const r = await api('/api/entrar', { sid, apelido }, { label: 'apelido' });
      setNick(r.apelido, r.cor); store.set('nick', r.apelido);
      toast(`Bem-vindo(a), ${r.apelido}! Seu apelido passou pelo Jev.`, 'ok');
      setTimeout(() => $('msgInput').focus(), 50);
    } catch { /* toast já exibido */ } finally { $('joinBtn').disabled = false; }
  });
  $('changeNick').addEventListener('click', () => { $('nickInput').value = S.nick || ''; setNick(null); $('nickInput').focus(); });

  const msgInput = $('msgInput');
  function updateCount() { const n = [...msgInput.value].length; const c = $('count'); c.textContent = `${n}/200`; c.classList.toggle('warn', n > 180); }
  msgInput.addEventListener('input', updateCount);
  $('sendForm').addEventListener('submit', (e) => { e.preventDefault(); send(); });
  async function send() {
    if (!S.nick) return;
    const texto = msgInput.value.trim();
    if (!texto) return;
    if (S.muteUntil > Date.now()) { toast('Você está silenciado por enquanto.'); return; }
    if ([...texto].length > 200) { toast('Máximo de 200 caracteres por mensagem.'); return; }
    if (S.inflight >= 2) { toast('Calma! O Jev ainda está analisando suas mensagens.'); return; }
    const nonce = rid(12);
    msgInput.value = ''; updateCount();
    addPending(nonce, texto);
    S.inflight++;
    try {
      const r = await api('/api/enviar', { sid, texto, nonce }, { label: 'sua mensagem' });
      if (r.stats) S.stats = r.stats;
      upsert(r.msg);
      if (r.silenciado_ate) setMuted(r.silenciado_ate, r.motivo_silencio);
    } catch (e) {
      failPending(nonce, e);
      if (!msgInput.value && e.code === 'rate_limited') { msgInput.value = texto; updateCount(); }
      if (e.code === 'silenciado' || e.code === 'sem_apelido') syncSession();
    } finally { S.inflight--; }
  }
  function setMuted(until, motivo) {
    S.muteUntil = +until || 0; S.muteReason = motivo || '';
    clearInterval(S.muteTimer);
    const on = S.muteUntil > Date.now();
    $('mutedBar').hidden = !on; msgInput.disabled = on; $('sendBtn').disabled = on;
    // a barra MUDO encolhe o monitor: se o chat estava no fim, continua no fim
    requestAnimationFrame(() => { if (S.stick) scrollChat(true); });
    if (!on) return;
    $('muteWhy').textContent = S.muteReason ? ` — ${S.muteReason}` : '';
    const tick = () => {
      const left = S.muteUntil - Date.now();
      if (left <= 0) { setMuted(0); return; }
      const s = Math.ceil(left / 1000); $('muteLeft').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    tick(); S.muteTimer = setInterval(tick, 1000);
  }

  // ---------------------------------------------------------------- simulação
  $('simBtn').addEventListener('click', async () => {
    const btn = $('simBtn');
    if (S.sim && S.sim.rodando) {
      if (S.sim.por === S.eu) { try { await api('/api/simular/parar', { sid }); } catch { /* toast */ } }
      return;
    }
    btn.disabled = true;
    try { const r = await api('/api/simular', { sid, velocidade: +QS.get('velocidade') || 1 }); renderSim(r.sim); if (window.matchMedia('(max-width: 860px)').matches) setTab('chat'); }
    catch { btn.disabled = false; }
  });
  let simDoneTimer = null;
  function renderSim(sim) {
    S.sim = sim;
    const btn = $('simBtn'), lbl = $('simLbl'), bar = $('simbar');
    if (sim && sim.rodando) {
      const mine = sim.por === S.eu;
      btn.classList.add('running'); btn.disabled = !mine;
      lbl.textContent = mine ? `Parar simulação · ${sim.enviadas}/${sim.total}` : `Simulação · ${sim.enviadas}/${sim.total}`;
      clearTimeout(simDoneTimer);
      bar.hidden = false; bar.classList.remove('done', 'err');
      $('simFill').style.setProperty('--f', (sim.enviadas / sim.total).toFixed(4));
      const bl = sim.resumo.ocultadas + sim.resumo.silenciadas;
      $('simText').textContent = `Simulação: ${sim.enviadas}/${sim.total} · ${bl} bloqueada${bl === 1 ? '' : 's'} pelo Jev`;
      return;
    }
    btn.classList.remove('running'); btn.disabled = false; lbl.textContent = 'Simular chat';
    if (sim && sim.fim && S.simShown !== sim.id) {
      S.simShown = sim.id;
      const R = sim.resumo; const bl = R.ocultadas + R.silenciadas;
      bar.hidden = false; bar.classList.add('done'); bar.classList.toggle('err', !!sim.erro);
      const txt = sim.erro ? `Simulação interrompida: ${sim.erro}` : `Simulação: ${sim.enviadas} mensagens · ${bl} bloqueadas · ${fmt.ms(R.p50_ms)} · ${fmt.usd(R.custo)}`;
      $('simText').textContent = txt;
      bar.title = sim.erro ? txt : `${sim.enviadas} mensagens: ${R.publicadas} publicadas, ${R.avisos} com aviso, ${R.ocultadas} ocultadas, ${R.silenciadas} descartadas (autor silenciado). Mediana ${fmt.ms(R.p50_ms)} por decisão, custo total ${fmt.usd(R.custo)}.`;
      if (sim.erro) toast(sim.erro, 'err');
      clearTimeout(simDoneTimer); simDoneTimer = setTimeout(() => { bar.hidden = true; }, 20000);
    } else if (!sim || !sim.fim) bar.hidden = true;
  }

  // ---------------------------------------------------------------- abas (celular), log, pin
  function setTab(t) { document.body.dataset.tab = t; document.querySelectorAll('.mtabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t)); if (t === 'chat') scrollChat(true); }
  document.querySelectorAll('.mtabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); logEl.dataset.f = b.dataset.f; }));
  $('decLive').addEventListener('click', unpin);
  $('decReveal').addEventListener('click', () => { if (S.current) { S.revealed.add(S.current); const m = S.msgs.get(S.current); renderDecision(m); renderLog(m, false); } });
  chatList.addEventListener('scroll', () => { S.stick = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 48; if (S.stick) $('newPill').hidden = true; });
  $('newPill').addEventListener('click', () => { S.stick = true; scrollChat(true); });
  $('ruleForm').addEventListener('submit', (e) => { e.preventDefault(); addRule($('ruleInput').value); });
  $('resetRules').addEventListener('click', () => saveRules(S.cfg.regras_padrao.map((r) => r.texto), 'padrao'));

  // ---------------------------------------------------------------- conexão
  function renderOnline() { $('online').textContent = fmt.int(S.online || 1); }
  function applySession(r) {
    S.eu = r.eu || S.eu;
    if (r.apelido) { setNick(r.apelido, r.cor); store.set('nick', r.apelido); }
    else setNick(null);
    if (r.erro_apelido) { toast(r.erro_apelido, 'err'); store.set('nick', null); }
    if (Array.isArray(r.regras)) { S.rules = r.regras; store.set('rules', S.rules.map((x) => x.texto)); }
    mergeLens(r.lente);
    setMuted(r.silenciado_ate, r.motivo_silencio);
    renderRules();
  }
  async function syncSession() {
    try {
      const r = await api('/api/sessao', { sid, apelido: store.get('nick', null), regras: store.get('rules', null) }, { silent: true, label: 'sessão' });
      applySession(r);
      relens(!!(r.retro && r.retro.ocultadas && r.retro.ocultadas.length));
      return r;
    } catch (e) { return null; }
  }
  function onInit(d) {
    S.eu = d.eu; S.stats = d.stats; S.online = d.online;
    S.msgs.clear(); S.order = [];
    for (const m of d.mensagens) addToStore(m);
    // o servidor pode ter reiniciado e esquecido apelido/regras: ressincroniza a partir do navegador
    const local = store.get('rules', null);
    const srv = (d.regras || []).map((r) => r.texto);
    const precisa = (Array.isArray(local) && JSON.stringify(local) !== JSON.stringify(srv)) || (!!store.get('nick', null) && !d.apelido);
    S.rules = d.regras || S.rules;
    if (d.apelido) setNick(d.apelido, d.cor);
    setMuted(d.silenciado_ate, d.motivo_silencio);
    rebuildAll(); renderRules(); renderOnline(); renderSim(d.sim);
    $('conn').textContent = 'conectado'; $('conn').classList.remove('off');
    document.body.dataset.ready = '1';
    if (precisa) syncSession();
  }
  async function boot() {
    try { S.cfg = await api('/api/config', undefined, { silent: true }); }
    catch { toast('Não consegui carregar o chat. Recarregue a página.', 'err'); return; }
    S.limiar = S.cfg.limiares.regra;
    $('liveTitle').textContent = S.cfg.live.titulo;
    await syncSession();
    JevKit.sse('/api/stream?sid=' + encodeURIComponent(sid), {
      init: onInit,
      msg: (d) => { if (d.stats) S.stats = d.stats; upsert(d.msg); },
      sim: renderSim,
      online: (d) => { S.online = d.online; renderOnline(); },
      error: () => { $('conn').textContent = 'reconectando…'; $('conn').classList.add('off'); },
    });
  }
  renderRules();
  boot();
})();

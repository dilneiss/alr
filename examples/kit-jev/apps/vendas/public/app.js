(function () {
  'use strict';
  const { fmt, el, api, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Copiloto de Vendas', tagline: 'Objeções e sinais de compra em tempo real' });

  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const MAX_CHAMADAS = 300;               // teto de análises por sessão (≈ US$ 0,03)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const REDUZ = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // cores do terminal (as mesmas do style.css; aqui para o SVG e as animações)
  const K = { amber: '#FF9F1C', green: '#00D26A', red: '#FF3B3B', blue: '#3D8BFD', grey: '#8A8A8A', ink: '#EDEDED' };
  // sentimento 0–4: vermelho → cinza → verde
  const SENT_CORES = ['#FF3B3B', '#FF7A59', '#9A9A9A', '#6FE3A4', '#00D26A'];
  // cada card do copiloto é uma "ordem" com a sua tecla de função
  const ORDEM = {
    objecao: { f: 'F1', nome: 'Contornar', cor: K.red, css: 'var(--red)', desc: 'o cliente levantou uma objeção' },
    sinal: { f: 'F2', nome: 'Fechar', cor: K.green, css: 'var(--green)', desc: 'o cliente deu sinal de compra' },
    risco: { f: 'F3', nome: 'Resgatar', cor: K.amber, css: 'var(--amber)', desc: 'risco real de perder a venda' },
    sugestao: { f: 'F4', nome: 'Conduzir', cor: K.blue, css: 'var(--blue)', desc: 'sem objeção: o próximo passo da conversa' },
  };
  // códigos curtos das objeções (bandeiras no gráfico de cotação)
  const COD_OBJ = { preco: 'PRÇ', tempo_prioridade: 'TMP', confianca_no_resultado: 'CNF', precisa_consultar_socio: 'SÓC', ja_usa_concorrente: 'CNC', nao_entendeu_valor: 'VLR', momento_ruim: 'MOM' };
  const ICO = {
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v10H3z"/></svg>',
    reset: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M8.6 3.1a5 5 0 1 1-5.4 3.6"/><path d="M4.6 1.2 8.9 3.2 5.9 6.9" stroke-linejoin="miter"/></svg>',
    mic: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5.6" y="1.4" width="4.8" height="8.4" rx="2.4" fill="currentColor" stroke="none"/><path d="M3.3 7.6a4.7 4.7 0 0 0 9.4 0M8 12.3v2.4M5.3 14.7h5.4"/></svg>',
    rec: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="4.5"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
  };
  const ico = (n) => el('span', { class: 'ki', 'aria-hidden': 'true', html: ICO[n] });

  let CFG = null;
  let C = null;                           // ligação atual
  const S = { speed: 1, who: 'cliente', calls: 0, gen: 0, roteiro: 'a', capped: false };
  const SIM = { on: false, paused: false, timer: null, R: null, turn: 0, word: 0, words: [], cur: null, partials: 0, lastPartial: 0 };
  const MIC = { on: false, rec: null, cur: null, deb: null, fatal: false, lastPartial: '' };

  const initials = (n) => (String(n || '?').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('') || '?').toUpperCase();
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const trecho = (s, n = 70) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  // o "código de negociação" de cada ligação, tirado do nome da empresa (OdontoVida → ODNT)
  function simbolo(R) {
    const emp = String((R && R.cliente && R.cliente.empresa) || (R && R.curto) || '').split('(')[0].trim();
    const pal = emp.split(/\s+/).filter(Boolean);
    const base = (pal.length > 1 ? pal[pal.length - 1] : pal[0] || '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
    if (!base) return 'CALL';
    const s = (base[0] + base.slice(1).replace(/[AEIOUY]/g, '')).slice(0, 4);
    return s.length >= 3 ? s : base.slice(0, 4);
  }
  // pisca um valor quando ele muda (verde = melhora, vermelho = piora); nada com movimento reduzido
  function piscar(node, bom) {
    if (REDUZ || !node || !node.animate) return;
    const c = bom ? 'rgba(0,210,106,.34)' : 'rgba(255,59,59,.34)';
    node.animate([{ backgroundColor: c }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 900, easing: 'ease-out' });
  }
  // marca a direção de um número: sobe/cai, e se isso é bom ou ruim para a venda
  function tick(node, v, antes, ruimSubir) {
    if (antes == null || Math.abs(v - antes) < 0.005) { node.dataset.dir = 'flat'; return; }
    const sobe = v > antes, bom = sobe !== !!ruimSubir;
    node.dataset.dir = sobe ? 'up' : 'down';
    node.dataset.tone = bom ? 'pos' : 'neg';
    piscar(node, bom);
  }
  const seta = (v, antes) => (antes == null || Math.abs(v - antes) < 0.005 ? '' : v > antes ? '▲' : '▼');

  // ---------------- ligação ----------------
  function novaLigacao(persona, roteiroId) {
    S.gen++;
    C = { gen: S.gen, roteiroId: roteiroId || null, persona, turns: [], u: 0, finals: [], maxStage: -1, lat: [], cost: 0, calls: 0, pend: 0, startedAt: performance.now(), feed: new Map(), q: null, prev: null };
    $('transcript').innerHTML = '';
    $('feed').replaceChildren(feedVazio());
    $('feed-count').textContent = '';
    $('p-av').textContent = persona.sym || initials(persona.nome); $('p-av').style.setProperty('--ac', persona.cor || '#9ca3af'); delete $('p-av').dataset.idle;
    $('p-name').textContent = persona.nome; $('p-meta').textContent = persona.meta;
    resetRadar();
    desenhar($('chart'), [], 10);
    ui();
  }
  function transcriptVazio() {
    return el('div', { class: 't-empty' }, [
      el('div', { class: 't-empty-hd' }, ['Sem ligação na fita', el('i', { class: 'cur', 'aria-hidden': 'true' })]),
      el('div', { html: 'Escolha uma <b>ligação</b> na barra de teclas para simular com legenda ao vivo, ligue o <b>microfone</b> ou digite uma fala do cliente na linha de comando aqui embaixo.' }),
    ]);
  }
  function feedVazio() {
    return el('div', { class: 'feed-empty' }, [
      el('p', { html: 'As ordens aparecem aqui quando o cliente levanta uma <b>objeção</b> ou dá <b>sinal de compra</b> — com a frase exata para o vendedor responder.' }),
      el('ul', { class: 'fe-keys' }, Object.entries(ORDEM).map(([k, o]) => el('li', { style: `--c:${o.css}`, 'data-tipo': k }, [el('kbd', { text: o.f }), el('b', { text: o.nome }), el('span', { text: o.desc })]))),
    ]);
  }

  function addTurn(quem) {
    const t = { id: C.turns.length, quem, fala: '', final: false, seq: 0, applied: 0, u: 0, tEnd: 0 };
    if (quem === 'cliente') t.u = ++C.u;
    const nome = quem === 'cliente' ? C.persona.nome : C.persona.vendedor;
    t.txtEl = el('div', { class: 'txt' });
    t.tagsEl = quem === 'cliente' ? el('div', { class: 'tags' }) : null;
    t.el = el('div', { class: `b ${quem} live`, 'data-turn': String(t.id), 'data-u': String(t.u || '') }, [
      el('span', { class: 'ts', text: mmss(performance.now() - C.startedAt) }), el('div', { class: 'who', text: nome }), t.txtEl, t.tagsEl]);
    const tr = $('transcript');
    const vazio = tr.querySelector('.t-empty'); if (vazio) vazio.remove();
    tr.append(t.el);
    C.turns.push(t);
    rolarFim();
    return t;
  }
  function rolarFim() { const tr = $('transcript'); tr.scrollTop = tr.scrollHeight; }
  function setText(t, text) { t.fala = text; t.txtEl.textContent = text; rolarFim(); }
  function finalizar(t) { if (t.final) return; t.final = true; t.tEnd = performance.now(); t.el.classList.remove('live'); t.el.dataset.final = '1'; }

  // ---------------- análise pelo Jev ----------------
  async function analisar(t, parcial) {
    if (!C || t.quem !== 'cliente') return;
    if (S.calls >= MAX_CHAMADAS) return limiteSessao();
    const fala = t.fala.trim();
    if (fala.length < CFG.limites.falaMin) return;
    const gen = C.gen;
    const hist = C.turns.filter((x) => x.final && x !== t && x.fala.trim()).slice(-CFG.limites.historico).map((x) => ({ quem: x.quem, fala: x.fala }));
    const seq = ++t.seq;
    const palavras = fala.split(/\s+/).length;
    S.calls++; C.calls++; C.pend++;
    if (!parcial) t.el.dataset.analise = 'aguardando';
    try {
      const r = await api('/api/analisar', { historico: hist, fala, parcial, roteiro: C.roteiroId || undefined }, { silent: true, label: parcial ? `parcial · fala ${t.u}` : `fala ${t.u} do cliente` });
      if (!C || C.gen !== gen || seq < t.applied) return;
      t.applied = seq;
      r._fala = fala;
      aplicar(t, r, parcial, palavras);
    } catch (e) {
      if (!C || C.gen !== gen) return;
      if (!parcial) delete t.el.dataset.analise;
      toast(e instanceof TypeError ? 'Sem conexão com o servidor. Tente de novo.' : (e.message || 'Falha ao falar com o Jev.'), 'err'); // TypeError = falha de rede do fetch
      if (e.status === 429 || e.code === 'budget_exhausted' || e.code === 'rate_limited') { pararSim(); pararMic(); }
    } finally {
      if (C && C.gen === gen) C.pend--;
    }
  }

  function tipoEvento(r) {
    if (r.objecao.detectada) return 'objecao';
    if (r.sinal_compra >= 0.6) return 'sinal';
    if (r.risco_perder >= 0.7) return 'risco';
    return 'sugestao';
  }

  function aplicar(t, r, parcial, palavras) {
    t.analise = r;
    if (!r.cached) C.lat.push(r.latency_ms);
    C.cost += r.cost || 0;
    tagsBolha(t, r, parcial);
    atualizarRadar(r, parcial);
    if (!parcial) {
      C.finals.push({ u: t.u, fala: t.fala, x: r });
      C.maxStage = Math.max(C.maxStage, r.estagio.idx);
      $('radar').dataset.estagioMax = CFG.estagios[C.maxStage].id;
      $('q-n').textContent = String(C.finals.length);
      desenhar($('chart'), C.finals, 10);
    }
    upsertCard(t, r, parcial, palavras);
    $('rnote').innerHTML = `última análise: <b>${r.cached ? 'cache' : fmt.ms(r.latency_ms)}</b> · ${C.calls} chamada${C.calls > 1 ? 's' : ''} · ${fmt.usd(C.cost)}`;
    fitaSet('lat', r.cached ? 'cache' : fmt.ms(r.latency_ms));
    fitaSet('custo', fmt.usd(C.cost));
    fitaSet('n', String(C.calls));
  }

  function tagsBolha(t, r, parcial) {
    const tags = [];
    if (r.objecao.detectada) {
      const o = CFG.objecoes[r.objecao.escolha];
      tags.push(el('span', { class: 'tag obj' }, [`Objeção · ${o.label} `, el('i', { text: fmt.pct(r.objecao.p) })]));
    } else tags.push(el('span', { class: 'tag ok', text: 'sem objeção' }));
    if (r.sinal_compra >= 0.5) tags.push(el('span', { class: 'tag buy' }, ['sinal de compra ', el('i', { text: fmt.pct(r.sinal_compra) })]));
    tags.push(el('span', { class: 'tag lat' }, [ico('bolt'), r.cached ? 'cache' : fmt.ms(r.latency_ms)]));
    if (parcial && !t.final) tags.push(el('span', { class: 'tag prov', text: 'no meio da frase…' }));
    t.tagsEl.replaceChildren(...tags);
    Object.assign(t.el.dataset, { analise: parcial ? 'parcial' : 'final', objecao: r.objecao.escolha, objecaoP: String(r.objecao.p), sinal: String(r.sinal_compra), estagio: r.estagio.escolha, alerta: tipoEvento(r) });
  }

  // ---------------- radar: cotação, livro, estágio ----------------
  function resetRadar() {
    const qs = $('q-sym'); qs.textContent = C ? (C.persona.sym || '—') : '—';
    $('gauge').classList.add('idle');
    const ql = $('q-last'); ql.textContent = '—'; delete ql.dataset.dir;
    const qc = $('q-chg'); qc.textContent = C ? 'aguardando a 1ª fala' : 'sem cotação'; delete qc.dataset.tone;
    $('q-tag').hidden = true;
    for (const id of ['q-open', 'q-max', 'q-min']) $(id).textContent = '—';
    $('q-n').textContent = '0';
    const st = $('stepper'); st.innerHTML = '';
    st.append(el('span', { class: 'fillbar' }), ...CFG.estagios.map((e, i) => el('div', { class: 'st', 'data-i': String(i) }, [el('i'), el('span', { text: e.label }), el('b')])));
    medirTrilho();
    $('b-sinal').style.width = '0'; $('b-risco').style.width = '0';
    for (const id of ['v-sinal', 'v-risco', 'v-sent']) { const n = $(id); n.textContent = '—'; delete n.dataset.dir; delete n.dataset.tone; n.removeAttribute('title'); n.classList.remove('hot'); }
    $('sent').replaceChildren(...[0, 1, 2, 3, 4].map(() => el('i')));
    $('rank').replaceChildren(el('li', { class: 'rk-empty', text: `o Jev escolhe entre ${Object.keys(CFG.cards).length} cartas a cada fala` }));
    $('rnote').textContent = 'aguardando a primeira fala do cliente';
    const ob = $('ob-now'); ob.className = 'ob-now'; ob.textContent = '—';
    const rd = $('radar'); delete rd.dataset.estagio; delete rd.dataset.estagioMax; delete rd.dataset.chance; delete rd.dataset.sinal;
    lampadas();
    fitaReset();
  }
  function cotacao(r, parcial) {
    const v = r.chance_fechar;
    const q = C.q || (C.q = { open: v, hi: v, lo: v, last: null });
    $('gauge').classList.remove('idle');
    q.hi = Math.max(q.hi, v); q.lo = Math.min(q.lo, v);
    const L = $('q-last');
    L.textContent = fmt.pct(v);
    if (q.last != null && Math.abs(v - q.last) >= 0.005) { L.dataset.dir = v > q.last ? 'up' : 'down'; piscar(L, v > q.last); }
    else if (q.last == null) L.dataset.dir = 'flat';
    const d = v - q.open, pp = Math.round(Math.abs(d) * 100);
    const qc = $('q-chg');
    qc.textContent = pp === 0 ? '■ 0 p.p.' : `${d > 0 ? '▲ +' : '▼ −'}${pp} p.p.`;
    qc.title = 'variação desde a abertura (a primeira leitura da ligação)';
    qc.dataset.tone = pp === 0 ? 'flat' : d > 0 ? 'pos' : 'neg';
    $('q-tag').hidden = !parcial;
    $('q-open').textContent = fmt.pct(q.open); $('q-max').textContent = fmt.pct(q.hi); $('q-min').textContent = fmt.pct(q.lo);
    fitaSet('chance', `${fmt.pct(v)} ${seta(v, q.last)}${q.last != null && Math.abs(v - q.last) >= 0.005 ? (v > q.last ? '+' : '−') + Math.round(Math.abs(v - q.last) * 100) : ''}`, q.last == null || Math.abs(v - q.last) < 0.005 ? '' : v > q.last ? 'pos' : 'neg');
    q.last = v;
  }
  function atualizarRadar(r, parcial) {
    const prev = C.prev || {};
    cotacao(r, parcial);
    const idx = r.estagio.idx, alto = Math.max(idx, C ? C.maxStage : 0);
    $('stepper').querySelectorAll('.st').forEach((s, i) => {
      s.classList.toggle('now', i === idx); s.classList.toggle('seen', i !== idx && i <= alto);
      s.querySelector('b').textContent = i === idx ? fmt.pct(r.estagio.p) : '';
    });
    const sts = $('stepper').querySelectorAll('.st');
    if (sts.length > 1) $('stepper').querySelector('.fillbar').style.height = `${sts[alto].offsetTop - sts[0].offsetTop}px`;
    $('b-sinal').style.width = `${Math.round(r.sinal_compra * 100)}%`; $('v-sinal').textContent = fmt.pct(r.sinal_compra); tick($('v-sinal'), r.sinal_compra, prev.sinal, false); $('v-sinal').classList.toggle('hot', r.sinal_compra >= 0.6);
    $('b-risco').style.width = `${Math.round(r.risco_perder * 100)}%`; $('v-risco').textContent = fmt.pct(r.risco_perder); tick($('v-risco'), r.risco_perder, prev.risco, true); $('v-risco').classList.toggle('hot', r.risco_perder >= 0.7);
    const ob = $('ob-now');
    if (r.objecao.detectada) { const o = CFG.objecoes[r.objecao.escolha]; ob.className = 'ob-now on'; ob.textContent = `${o.label} ${fmt.pct(r.objecao.p)}`; }
    else { ob.className = 'ob-now none'; ob.textContent = `Nenhuma ${fmt.pct(r.objecao.probabilidades.nenhuma ?? r.objecao.p)}`; }
    const n = r.sentimento.nivel;
    $('sent').querySelectorAll('i').forEach((seg, i) => { seg.style.background = i <= n ? SENT_CORES[n] : ''; });
    $('v-sent').textContent = fmt.num(r.sentimento.score, 1);
    $('v-sent').title = r.sentimento.label;
    tick($('v-sent'), r.sentimento.score / 4, prev.sent, false);
    const pp = r.proximo_passo, rk = (pp.ranking || []).slice(0, 3);
    $('rank').replaceChildren(...rk.map((c, i) => el('li', { class: 'rk' + (c.id === pp.escolha ? ' top' : ''), style: `--p:${Math.round(c.p * 100)}%` }, [
      el('span', { class: 'rk-n', text: String(i + 1) }), el('span', { class: 'rk-t', text: c.titulo }), el('b', { class: 'rk-p', text: fmt.pct(c.p) })])));
    Object.assign($('radar').dataset, { estagio: r.estagio.escolha, chance: String(r.chance_fechar), sinal: String(r.sinal_compra) });
    fitaSet('sinal', `${seta(r.sinal_compra, prev.sinal)}${fmt.pct(r.sinal_compra)}`, prev.sinal == null || Math.abs(r.sinal_compra - prev.sinal) < 0.005 ? '' : r.sinal_compra > prev.sinal ? 'pos' : 'neg');
    fitaSet('risco', `${seta(r.risco_perder, prev.risco)}${fmt.pct(r.risco_perder)}`, prev.risco == null || Math.abs(r.risco_perder - prev.risco) < 0.005 ? '' : r.risco_perder > prev.risco ? 'neg' : 'pos');
    fitaSet('sent', `${fmt.num(r.sentimento.score, 1)} ${r.sentimento.label.toLowerCase()}`, n >= 3 ? 'pos' : n <= 1 ? 'neg' : '');
    fitaSet('estagio', r.estagio.label);
    fitaSet('obj', r.objecao.detectada ? `${CFG.objecoes[r.objecao.escolha].label} ${fmt.pct(r.objecao.p)}` : 'nenhuma', r.objecao.detectada ? 'neg' : 'pos');
    C.prev = { sinal: r.sinal_compra, risco: r.risco_perder, sent: r.sentimento.score / 4 };
  }

  function medirTrilho() {
    const st = $('stepper'), sts = st.querySelectorAll('.st');
    if (sts.length < 2) return;
    const a = sts[0].offsetTop + sts[0].offsetHeight / 2, z = sts[sts.length - 1].offsetTop + sts[sts.length - 1].offsetHeight / 2;
    st.style.setProperty('--rail-top', `${Math.round(a)}px`); st.style.setProperty('--rail-h', `${Math.round(z - a)}px`);
    const alto = C ? Math.max(0, C.maxStage) : 0, fb = st.querySelector('.fillbar');
    if (fb && C && C.maxStage >= 0) fb.style.height = `${sts[alto].offsetTop - sts[0].offsetTop}px`;
  }

  // ---------------- teclas de função (lâmpadas por tipo de ordem) ----------------
  function lampadas() {
    const cont = { objecao: 0, sinal: 0, risco: 0, sugestao: 0 };
    if (C) for (const x of C.feed.values()) cont[x.tipo] = (cont[x.tipo] || 0) + 1;
    document.querySelectorAll('.fk').forEach((k) => { const n = cont[k.dataset.tipo] || 0; k.querySelector('.fk-c').textContent = String(n); k.classList.toggle('on', n > 0); });
  }
  function acender(tipo) {
    const k = document.querySelector(`.fk[data-tipo="${tipo}"]`);
    if (!k || REDUZ || !k.animate) return;
    const c = ORDEM[tipo].cor;
    k.animate([{ backgroundColor: c, color: '#000' }, { backgroundColor: c, color: '#000', offset: 0.35 }, { backgroundColor: 'rgba(0,0,0,0)', color: c }], { duration: 1300, easing: 'ease-out' });
  }

  // ---------------- cards (ordens) ----------------
  function upsertCard(t, r, parcial, palavras) {
    const tipo = tipoEvento(r);
    const prev = C.feed.get(t.u);
    if (!prev && parcial && tipo === 'sugestao') return; // parcial sem novidade não polui o feed
    const agora = performance.now();
    const cedo = prev ? prev.cedo : (parcial && !t.final && tipo !== 'sugestao');
    const info = { tipo, cedo, tShown: prev && prev.tipo !== 'sugestao' ? prev.tShown : agora, palavras: prev && prev.cedo ? prev.palavras : palavras };
    const node = tipo === 'sugestao' ? linhaSugestao(t, r) : cardEvento(t, r, parcial, info);
    const feed = $('feed');
    const vazio = feed.querySelector('.feed-empty'); if (vazio) vazio.remove();
    if (prev && prev.node.isConnected) {
      prev.node.replaceWith(node);
      node.classList.add(prev.tipo === tipo ? 'pulse' : 'new');
    } else { feed.prepend(node); node.classList.add('new'); feed.scrollTop = 0; }
    C.feed.set(t.u, { ...info, node });
    if (!prev || prev.tipo !== tipo) acender(tipo);
    lampadas();
    const ev = [...C.feed.values()].filter((x) => x.tipo !== 'sugestao').length;
    $('feed-count').textContent = `${ev} alerta${ev === 1 ? '' : 's'} · ${C.feed.size} fala${C.feed.size === 1 ? '' : 's'} analisada${C.feed.size === 1 ? '' : 's'}`;
    fitaSet('ordem', `${ORDEM[tipo].f} ${ORDEM[tipo].nome} · ${r.proximo_passo.titulo}`, tipo === 'objecao' || tipo === 'risco' ? 'neg' : tipo === 'sinal' ? 'pos' : '');
  }

  function tecla(tipo, curta) {
    const O = ORDEM[tipo];
    return el('span', { class: 'c-key', title: `${O.f} · ${O.nome}: ${O.desc}` }, [el('kbd', { text: O.f }), curta ? null : el('span', { text: O.nome })]);
  }

  function cardEvento(t, r, parcial, info) {
    let trig;
    if (info.tipo === 'objecao') { const o = CFG.objecoes[r.objecao.escolha]; trig = [`Objeção · ${o.label} `, el('i', { text: fmt.pct(r.objecao.p) })]; }
    else if (info.tipo === 'sinal') trig = ['Sinal de compra ', el('i', { text: fmt.pct(r.sinal_compra) })];
    else trig = ['Risco de perder a venda ', el('i', { text: fmt.pct(r.risco_perder) })];
    let badge;
    if (info.cedo) {
      const antes = t.final && t.tEnd > info.tShown ? (t.tEnd - info.tShown) / 1000 : null;
      badge = el('span', { class: 'c-fast', title: 'O card apareceu enquanto o cliente ainda estava falando' }, [ico('bolt'), antes != null ? `${fmt.num(antes, 1)} s antes do fim da frase` : 'antes do fim da frase']);
    } else {
      const depois = t.final ? performance.now() - t.tEnd : null;
      badge = el('span', { class: 'c-lat' }, [ico('bolt'), depois != null ? `na tela ${fmt.ms(depois)} após a fala` : fmt.ms(r.latency_ms)]);
    }
    const pp = r.proximo_passo;
    const total = t.fala.split(/\s+/).length;
    const quando = info.cedo ? ` · detectado com ${info.palavras} de ${t.final ? total : '…'} palavras` : '';
    return el('article', { class: 'card', style: `--c:${ORDEM[info.tipo].css}`, 'data-u': String(t.u), 'data-tipo': info.tipo, 'data-objecao': r.objecao.escolha, 'data-cedo': info.cedo ? '1' : '', 'data-final': parcial ? '' : '1', 'data-card': pp.escolha }, [
      el('div', { class: 'c-top' }, [tecla(info.tipo), el('span', { class: 'c-trig' }, trig), badge]),
      el('div', { class: 'c-title', text: pp.titulo }),
      el('div', { class: 'c-say' }, [el('b', { text: 'Diga: ' }), `“${pp.frase}”`]),
      el('div', { class: 'c-tip' }, [el('b', { text: 'Dica ' }), pp.dica]),
      el('div', { class: 'c-meta', text: `fala ${t.u}: “${trecho(r._fala || t.fala, 64)}”${quando} · ${r.cached ? 'cache' : fmt.ms(r.latency_ms) + ' de Jev'} · ordem escolhida com ${fmt.pct(pp.confianca)}` }),
    ]);
  }
  function linhaSugestao(t, r) {
    const pp = r.proximo_passo;
    const row = el('div', { class: 'frow', style: `--c:${ORDEM.sugestao.css}`, 'data-u': String(t.u), 'data-tipo': 'sugestao', 'data-objecao': r.objecao.escolha, title: `Diga: “${pp.frase}”`, tabindex: '0', role: 'button', 'aria-expanded': 'false' },
      [tecla('sugestao', true), el('b', { text: pp.titulo }), el('span', { class: 'rp', text: `fala ${t.u} · sem objeção · ${fmt.pct(pp.confianca)}` })]);
    const abrir = () => {
      if (row.nextSibling && row.nextSibling.classList && row.nextSibling.classList.contains('frow-say')) { row.nextSibling.remove(); row.setAttribute('aria-expanded', 'false'); return; }
      row.after(el('div', { class: 'frow-say c-say', style: `--c:${ORDEM.sugestao.css}` }, [el('b', { text: 'Diga: ' }), `“${pp.frase}”`]));
      row.setAttribute('aria-expanded', 'true');
    };
    row.addEventListener('click', abrir);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    return row;
  }

  // ---------------- gráfico de cotação ----------------
  // chance de fechar como uma cotação: cada trecho sobe em verde e cai em vermelho; objeções viram bandeiras,
  // sinais de compra viram triângulos e o sentimento é o "volume" embaixo.
  const TAM = {};                          // tamanho do gráfico medido pelo ResizeObserver (evita forçar layout a cada decisão)
  function desenhar(svg, finals, minN) {
    const t = TAM[svg.id];
    const W = Math.max(260, Math.round(t ? t.w : svg.clientWidth) || 600), H = Math.max(120, Math.round(t ? t.h : svg.clientHeight) || 200);
    const padL = 6, padR = 48, padT = 22, padB = 17;
    const studyH = Math.max(18, Math.round((H - padT - padB) * 0.2));
    const pTop = padT, pBot = H - padB - studyH - 9, sTop = pBot + 9, sBot = H - padB;
    const n = Math.max(finals.length, minN || 10);
    const cw = W - padL - padR - 20;
    const x = (i) => padL + 10 + (n <= 1 ? cw / 2 : (i * cw) / (n - 1));
    const y = (v) => pTop + (1 - Math.max(0, Math.min(1, v))) * (pBot - pTop);
    const f = (v) => v.toFixed(1);
    const uid = (svg.id || 'g') + '-area';
    let s = `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.amber}" stop-opacity=".2"/><stop offset="1" stop-color="${K.amber}" stop-opacity="0"/></linearGradient></defs>`;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      s += `<line class="g-gr${v === 0.5 ? ' g-mid' : ''}" x1="${padL}" x2="${W - padR}" y1="${f(y(v))}" y2="${f(y(v))}"/>`;
      s += `<text class="g-ax" x="${W - padR + 7}" y="${f(y(v) + 3.5)}">${v * 100}%</text>`;
    }
    s += `<line class="g-axl" x1="${W - padR}" x2="${W - padR}" y1="${pTop - 8}" y2="${sBot}"/><line class="g-gr" x1="${padL}" x2="${W - padR}" y1="${sBot}" y2="${sBot}"/>`;
    s += `<text class="g-ax g-stl" x="${W - padR + 7}" y="${f(sTop + 9)}">SENT</text>`;
    if (!finals.length) {
      const cx = f((padL + W - padR) / 2), estreito = W - padL - padR < 400;
      s += estreito ? `<text class="g-empty" x="${cx}" y="${f(y(0.69))}" text-anchor="middle">a linha do tempo se desenha</text><text class="g-empty" x="${cx}" y="${f(y(0.69) + 16)}" text-anchor="middle">a cada fala do cliente</text>`
        : `<text class="g-empty" x="${cx}" y="${f(y(0.625) + 4)}" text-anchor="middle">a linha do tempo se desenha a cada fala do cliente</text>`;
    } else {
      const slot = n <= 1 ? cw : cw / (n - 1);
      const bw = Math.max(3, Math.min(18, slot * 0.46));
      finals.forEach((q, i) => {
        const h = Math.max(2, (q.x.sentimento.score / 4) * (sBot - sTop));
        s += `<rect x="${f(x(i) - bw / 2)}" y="${f(sBot - h)}" width="${f(bw)}" height="${f(h)}" fill="${SENT_CORES[q.x.sentimento.nivel] || K.grey}" opacity=".8"/>`;
      });
      const pts = finals.map((q, i) => [x(i), y(q.x.chance_fechar)]);
      if (pts.length > 1) s += `<path d="M${f(pts[0][0])} ${f(pBot)} ${pts.map((p) => `L${f(p[0])} ${f(p[1])}`).join(' ')} L${f(pts[pts.length - 1][0])} ${f(pBot)} Z" fill="url(#${uid})"/>`;
      finals.forEach((q, i) => {
        if (q.x.objecao.detectada) {
          const cx = x(i), lx = Math.max(padL + 15, Math.min(W - padR - 15, cx));
          const cod = COD_OBJ[q.x.objecao.escolha] || String(q.x.objecao.escolha).slice(0, 3).toUpperCase();
          s += `<line class="g-evob" x1="${f(cx)}" x2="${f(cx)}" y1="${pTop - 4}" y2="${f(pBot)}"/>`;
          s += `<rect class="g-flob" x="${f(lx - 15)}" y="${pTop - 19}" width="30" height="14"/><text class="g-flt" x="${f(lx)}" y="${pTop - 8.5}" text-anchor="middle">${cod}</text>`;
        }
        if (q.x.sinal_compra >= 0.6) { const cx = x(i), cy = pBot - 3; s += `<path class="g-evbu" d="M${f(cx)} ${f(cy - 8)} L${f(cx + 5.5)} ${f(cy)} L${f(cx - 5.5)} ${f(cy)} Z"/>`; }
      });
      const corDe = (i) => { if (!i) return K.amber; const d = finals[i].x.chance_fechar - finals[i - 1].x.chance_fechar; return d > 0.02 ? K.green : d < -0.02 ? K.red : K.grey; };
      for (let i = 1; i < pts.length; i++) s += `<line class="g-seg" x1="${f(pts[i - 1][0])}" y1="${f(pts[i - 1][1])}" x2="${f(pts[i][0])}" y2="${f(pts[i][1])}" stroke="${corDe(i)}"/>`;
      pts.forEach((p, i) => { s += `<rect x="${f(p[0] - 2.5)}" y="${f(p[1] - 2.5)}" width="5" height="5" fill="${corDe(i)}"/>`; });
      const li = pts.length - 1, cor = li ? corDe(li) : K.amber, ly = pts[li][1];
      s += `<line class="g-px" x1="${f(pts[li][0] + 4)}" x2="${W - padR}" y1="${f(ly)}" y2="${f(ly)}" stroke="${cor}"/>`;
      s += `<rect x="${W - padR + 1}" y="${f(ly - 9)}" width="${padR - 2}" height="18" fill="${cor}"/><text class="g-tag" x="${W - padR + padR / 2}" y="${f(ly + 4)}" text-anchor="middle">${Math.round(finals[li].x.chance_fechar * 100)}%</text>`;
      finals.forEach((q, i) => { s += `<text class="g-ax" x="${f(x(i))}" y="${H - 4}" text-anchor="middle">${q.u}</text>`; });
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  // ---------------- fita de ticker (rodapé) ----------------
  // campos de largura fixa (em ch), para a fita rolar sem saltos quando os valores mudam
  const FITA_CAMPOS = [['sym', '', 5], ['nome', '', 17], ['chance', 'Chance', 10], ['sinal', 'Sinal', 6], ['risco', 'Risco', 6], ['sent', 'Sentimento', 18],
    ['estagio', 'Estágio', 12], ['obj', 'Objeção', 29], ['ordem', 'Última ordem', 40], ['lat', 'Latência', 7], ['custo', 'Custo', 12], ['n', 'Chamadas', 3]];
  const FITA = { slots: {}, pronta: false };
  function montarFita() {
    const track = $('tape-track');
    const metade = () => {
      const h = el('div', { class: 'tape-half' });
      for (const [k, rot, w] of FITA_CAMPOS) {
        const v = el('span', { class: 'tk-v', style: `width:${w}ch` });
        h.append(el('span', { class: `tk tk-${k}` }, [rot ? el('span', { class: 'tk-l', text: rot }) : null, v]));
        (FITA.slots[k] = FITA.slots[k] || []).push(v);
      }
      h.append(el('span', { class: 'tk tk-wl' }, [el('span', { class: 'tk-l', text: 'Roteiros' }),
        ...CFG.roteiros.map((R) => el('span', { class: 'tk-r' }, [el('b', { text: simbolo(R) }), ` ${R.curto} · ${R.gancho}`]))]));
      h.append(el('span', { class: 'tk tk-jev' }, [el('span', { class: 'tk-l', text: 'Jev' }), el('span', { class: 'tk-v', text: `${CFG.n_perguntas} perguntas por fala, numa chamada` })]));
      return h;
    };
    track.replaceChildren(metade(), metade());
    FITA.pronta = true;
    fitaReset();
    medirFita();
  }
  function medirFita() {
    const h = document.querySelector('.tape-half');
    if (h) $('tape-track').style.setProperty('--tape-dur', `${Math.max(30, Math.round(h.offsetWidth / 42))}s`);
  }
  function fitaSet(k, txt, tone) {
    if (!FITA.pronta || !FITA.slots[k]) return;
    for (const v of FITA.slots[k]) {
      if (v.textContent === txt && (v.dataset.tone || '') === (tone || '')) continue;
      v.textContent = txt;
      if (tone) v.dataset.tone = tone; else delete v.dataset.tone;
      if (tone === 'pos' || tone === 'neg') piscar(v, tone === 'pos');
    }
  }
  function fitaReset() {
    fitaSet('sym', C ? (C.persona.sym || '—') : 'JEV');
    fitaSet('nome', C ? C.persona.nome : 'sem ligação');
    for (const k of ['chance', 'sinal', 'risco', 'sent', 'estagio', 'obj', 'lat']) fitaSet(k, '—');
    fitaSet('ordem', C ? 'aguardando a 1ª fala do cliente' : 'escolha uma ligação');
    fitaSet('custo', C ? fmt.usd(C.cost) : 'US$ 0');
    fitaSet('n', C ? String(C.calls) : '0');
  }

  // ---------------- simulação ----------------
  function roteiroPorId(id) { return CFG.roteiros.find((r) => r.id === id) || CFG.roteiros[0]; }
  function simIniciar(id) {
    const R = roteiroPorId(id || S.roteiro);
    pararMic(true); pararSim();
    fecharResumo();
    S.roteiro = R.id; marcarRoteiro();
    novaLigacao({ nome: R.cliente.nome, meta: `${R.cliente.cargo} · ${R.cliente.empresa}`, vendedor: `${R.vendedor} (vendas)`, cor: R.cor, sym: simbolo(R) }, R.id);
    Object.assign(SIM, { on: true, paused: false, R, turn: 0, word: 0, words: [], cur: null, partials: 0, lastPartial: 0 });
    ui();
    agendar(450);
  }
  function agendar(ms) { clearTimeout(SIM.timer); SIM.timer = setTimeout(passo, ms / S.speed); }
  function passo() {
    if (!SIM.on || SIM.paused || document.hidden || !C) return;
    const f = SIM.R.falas[SIM.turn];
    if (!f) return simFim();
    if (!SIM.cur) { SIM.cur = addTurn(f.quem); SIM.words = f.fala.split(/\s+/); SIM.word = 0; SIM.partials = 0; SIM.lastPartial = 0; }
    SIM.word++;
    const t = SIM.cur, n = SIM.words.length, w = SIM.words[SIM.word - 1];
    setText(t, SIM.words.slice(0, SIM.word).join(' '));
    // como no reconhecimento de voz de verdade: nas pausas naturais (pontuação) a fala parcial já vai para o Jev
    if (t.quem === 'cliente' && SIM.word >= 6 && SIM.word <= n - 4 && /[,.?!…:;]$/.test(w) && SIM.partials < 2 && SIM.word - SIM.lastPartial >= 6) {
      SIM.partials++; SIM.lastPartial = SIM.word;
      analisar(t, true);
    }
    if (SIM.word >= n) {
      finalizar(t); SIM.cur = null; SIM.turn++;
      if (t.quem === 'cliente') analisar(t, false);
      return agendar(650);
    }
    agendar(310 + (/[.?!…]$/.test(w) ? 300 : /[,;:]$/.test(w) ? 160 : 0));
  }
  async function simFim() {
    SIM.on = false; clearTimeout(SIM.timer); ui();
    if (C) C.endedAt = performance.now();
    const gen = C && C.gen;
    for (let i = 0; i < 40 && C && C.gen === gen && C.pend > 0; i++) await wait(100);
    if (C && C.gen === gen && C.finals.length) { await wait(900); if (C && C.gen === gen && !SIM.on) abrirResumo(); }
  }
  function pararSim() {
    if (!SIM.on) return;
    SIM.on = false; SIM.paused = false; clearTimeout(SIM.timer);
    if (SIM.cur) { finalizar(SIM.cur); SIM.cur = null; }
    ui();
  }
  function alternarSim() {
    if (!SIM.on) return simIniciar(S.roteiro);
    SIM.paused = !SIM.paused;
    if (SIM.paused) clearTimeout(SIM.timer); else agendar(250);
    ui();
  }

  // ---------------- microfone (Web Speech API) ----------------
  function micMensagem(err) {
    return ({
      'not-allowed': 'O navegador bloqueou o microfone. Permita o acesso (ícone de cadeado na barra de endereço) e tente de novo.',
      'service-not-allowed': 'O reconhecimento de voz não está disponível neste navegador. Use o Chrome — ou clique em “Simular ligação”.',
      'audio-capture': 'Nenhum microfone encontrado. Conecte um microfone ou use a simulação.',
      network: 'O reconhecimento de voz do navegador precisa de internet e falhou agora. Tente de novo ou use a simulação.',
      'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
    })[err] || `O microfone parou (${err}). Tente de novo ou use a simulação.`;
  }
  function micLigar() {
    if (MIC.on) return pararMic();
    if (!SR) { toast('Este navegador não tem reconhecimento de voz. Use o Chrome no computador ou no Android — ou clique em “Simular ligação”.', 'err'); return; }
    if (!window.isSecureContext) { toast('O microfone só funciona em conexão segura (https).', 'err'); return; }
    pararSim(); fecharResumo();
    if (!C || C.roteiroId) novaLigacao({ nome: 'Cliente ao vivo', meta: 'fale como o cliente — ou alterne “quem está falando”', vendedor: 'Você (vendas)', cor: '#34d399', sym: 'VOZ' }, null);
    let rec;
    try { rec = new SR(); } catch { toast('Não consegui iniciar o reconhecimento de voz neste navegador.', 'err'); return; }
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    let avisou = false;
    rec.onstart = () => { if (!avisou && MIC.rec === rec) { avisou = true; toast('Ouvindo em português. Fale como o cliente (ou troque “quem está falando”).'); } };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) micFinal(res[0].transcript); else interim += res[0].transcript;
      }
      if (interim.trim()) micParcial(interim.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      MIC.fatal = true;
      toast(micMensagem(e.error), 'err');
      pararMic(true);
    };
    rec.onend = () => { if (MIC.on && !MIC.fatal && MIC.rec === rec) { try { rec.start(); } catch { pararMic(true); } } };
    Object.assign(MIC, { on: true, rec, fatal: false, cur: null, lastPartial: '' });
    ui();
    try { rec.start(); }
    catch { MIC.fatal = true; toast('Não foi possível ligar o microfone neste navegador.', 'err'); pararMic(true); }
  }
  function micParcial(txt) {
    if (!C) return;
    if (!MIC.cur) MIC.cur = addTurn(S.who);
    setText(MIC.cur, txt);
    if (MIC.cur.quem !== 'cliente') return;
    clearTimeout(MIC.deb);
    MIC.deb = setTimeout(() => {
      const t = MIC.cur;
      if (t && !t.final && t.fala.split(/\s+/).length >= 4 && t.fala !== MIC.lastPartial) { MIC.lastPartial = t.fala; analisar(t, true); }
    }, 550);
  }
  function micFinal(txt) {
    if (!C) return;
    clearTimeout(MIC.deb);
    const t = MIC.cur || addTurn(S.who);
    MIC.cur = null;
    const limpo = String(txt || '').trim();
    if (!limpo) { t.el.remove(); C.turns.splice(C.turns.indexOf(t), 1); return; }
    setText(t, limpo.charAt(0).toUpperCase() + limpo.slice(1));
    finalizar(t);
    if (t.quem === 'cliente') analisar(t, false);
  }
  function pararMic(silencioso) {
    if (!MIC.on && !MIC.rec) return;
    const rec = MIC.rec;
    MIC.on = false; MIC.rec = null; clearTimeout(MIC.deb);
    if (MIC.cur) { finalizar(MIC.cur); if (MIC.cur.quem === 'cliente' && MIC.cur.fala.trim()) analisar(MIC.cur, false); MIC.cur = null; }
    try { rec && rec.abort(); } catch { /* já parado */ }
    ui();
    if (!silencioso) toast('Microfone desligado.');
  }

  // ---------------- resumo ----------------
  function abrirResumo() {
    if (!C || !C.finals.length) return;
    const F = C.finals, first = F[0].x, last = F[F.length - 1].x;
    const dur = mmss((C.endedAt || performance.now()) - C.startedAt);
    const lat = mean(C.lat);
    $('s-title').textContent = `Resumo da ligação — ${C.persona.nome}`;
    $('s-kpis').replaceChildren(...[
      ['Duração', dur], ['Falas do cliente', String(F.length)], ['Chamadas ao Jev', String(C.calls)],
      ['Latência média', lat == null ? 'cache' : fmt.ms(lat)], ['Custo total', fmt.usd(C.cost)],
    ].map(([k, v]) => el('div', { class: 's-kpi' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v })])));
    const cont = {};
    F.forEach((f) => { if (f.x.objecao.detectada) cont[f.x.objecao.escolha] = (cont[f.x.objecao.escolha] || 0) + 1; });
    const maxC = Math.max(1, ...Object.values(cont));
    const obj = Object.entries(cont).sort((a, b) => b[1] - a[1]);
    $('s-obj').replaceChildren(...(obj.length ? obj.map(([k, n]) => { const o = CFG.objecoes[k]; return el('div', { class: 'ob-row', 'data-objecao': k }, [el('span', { text: o.label }), el('span', { class: 'trk' }, [el('i', { style: { width: `${(n / maxC) * 100}%` } })]), el('b', { text: String(n) })]); })
      : [el('div', { class: 'dim', text: 'Nenhuma objeção detectada nesta ligação.' })]));
    const pior = F.reduce((a, b) => (b.x.risco_perder > a.x.risco_perder ? b : a));
    const po = pior.x.objecao;
    $('s-risk').replaceChildren(
      el('div', { class: 'quote', text: `“${pior.fala}”` }),
      el('div', { class: 'quote-meta', html: `Fala ${pior.u} · risco de perder <b>${fmt.pct(pior.x.risco_perder)}</b>${po.detectada ? ` · objeção <b>${CFG.objecoes[po.escolha].label}</b>` : ''}<br>O copiloto sugeriu: <b>${pior.x.proximo_passo.titulo}</b>` }),
    );
    const seta2 = (a, b) => (b > a + 0.02 ? '<span class="up">▲</span>' : b < a - 0.02 ? '<span class="down">▼</span>' : '＝');
    $('s-evo').innerHTML = `<span>Chance de fechar: <b>${fmt.pct(first.chance_fechar)}</b> → <b>${fmt.pct(last.chance_fechar)}</b> ${seta2(first.chance_fechar, last.chance_fechar)}</span>` +
      `<span>Sentimento: <b>${first.sentimento.label.toLowerCase()}</b> → <b>${last.sentimento.label.toLowerCase()}</b> ${seta2(first.sentimento.score / 4, last.sentimento.score / 4)}</span>` +
      `<span>Sinal de compra no fim: <b>${fmt.pct(last.sinal_compra)}</b></span>` +
      `<span>Estágio final: <b>${last.estagio.label}</b> (máximo: ${CFG.estagios[Math.max(0, C.maxStage)].label})</span>`;
    Object.assign($('summary').dataset, {
      objecoes: JSON.stringify(cont), estagioFinal: last.estagio.escolha, estagioMax: CFG.estagios[Math.max(0, C.maxStage)].id,
      chanceInicial: String(first.chance_fechar), chanceFinal: String(last.chance_fechar), sinalFinal: String(last.sinal_compra),
      sinalMax: String(Math.max(...F.map((f) => f.x.sinal_compra))),
    });
    $('s-note').textContent = C.roteiroId ? `Roteiro simulado: ${roteiroPorId(C.roteiroId).titulo}` : 'Ligação ao vivo (microfone ou falas digitadas)';
    const next = CFG.roteiros[(CFG.roteiros.findIndex((r) => r.id === (C.roteiroId || S.roteiro)) + 1) % CFG.roteiros.length];
    $('s-next').replaceChildren(el('span', { text: `Próximo roteiro: ${next.curto}` }), ico('play')); $('s-next').dataset.id = next.id;
    $('summary').hidden = false;
    requestAnimationFrame(() => desenhar($('s-chart'), F, F.length));
    $('s-close').focus({ preventScroll: true });
  }
  function fecharResumo() { $('summary').hidden = true; }

  // ---------------- estado dos botões ----------------
  function marcarRoteiro() { $('scen').querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === S.roteiro))); }
  function ui() {
    const sim = $('sim');
    sim.classList.toggle('running', SIM.on && !SIM.paused);
    const R = roteiroPorId(S.roteiro);
    sim.replaceChildren(...[ico(SIM.on && !SIM.paused ? 'pause' : 'play'), el('span', { text: SIM.on ? (SIM.paused ? 'Continuar' : 'Pausar') : 'Simular' }), SIM.on ? null : el('span', { class: 'nm', text: R.curto })].filter(Boolean));
    const ativo = SIM.on || MIC.on;
    const end = $('end');
    end.replaceChildren(ico(ativo ? 'stop' : 'reset'), el('span', { text: ativo ? 'Encerrar' : 'Limpar' }));
    end.disabled = !ativo && !(C && C.turns.length);
    const mic = $('mic');
    mic.setAttribute('aria-pressed', String(MIC.on));
    mic.replaceChildren(ico(MIC.on ? 'rec' : 'mic'), el('span', { text: MIC.on ? 'Ouvindo… parar' : 'Microfone' }));
    mic.classList.toggle('unsupported', !SR);
    $('rec').classList.toggle('on', (SIM.on && !SIM.paused) || MIC.on);
    $('fala').placeholder = S.who === 'cliente' ? '“tá caro demais pra mim agora”' : 'fala do vendedor (entra no histórico)';
    $('prompt').textContent = S.who === 'cliente' ? 'Cliente' : 'Vendedor';
    $('send').textContent = S.who === 'cliente' ? 'Analisar' : 'Adicionar';
  }
  function limiteSessao() {
    if (S.capped) return;
    S.capped = true; pararSim(); pararMic(true);
    toast(`Limite desta sessão atingido (${MAX_CHAMADAS} análises). Recarregue a página para continuar.`, 'err');
  }

  // ---------------- eventos ----------------
  function wire() {
    const scen = $('scen');
    CFG.roteiros.forEach((R) => scen.append(el('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-id': R.id, title: `${R.titulo} — ${R.resumo}`, onclick: () => simIniciar(R.id) },
      [el('b', { class: 'sym', 'aria-hidden': 'true', text: simbolo(R) }), el('span', { class: 'nm', text: R.curto }), el('small', { text: R.gancho })])));
    marcarRoteiro();
    $('sim').addEventListener('click', alternarSim);
    $('speed').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      S.speed = +b.dataset.v; $('speed').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      if (SIM.on && !SIM.paused) agendar(200);
    }));
    $('who').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      S.who = b.dataset.v; $('who').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      if (MIC.cur && !MIC.cur.final && MIC.cur.quem !== S.who) { const t = MIC.cur; MIC.cur = null; clearTimeout(MIC.deb); finalizar(t); if (t.quem === 'cliente' && t.fala.trim()) analisar(t, false); }
      ui();
    }));
    $('end').addEventListener('click', () => {
      if (SIM.on || MIC.on) {
        pararSim(); pararMic(true);
        if (C) C.endedAt = performance.now();
        if (C && C.finals.length) setTimeout(abrirResumo, C.pend ? 900 : 150);
      } else if (C) { S.gen++; C = null; $('transcript').replaceChildren(transcriptVazio()); $('feed').replaceChildren(feedVazio()); $('feed-count').textContent = ''; resetRadar(); desenhar($('chart'), [], 10); $('p-name').textContent = 'Nenhuma ligação ainda'; $('p-meta').textContent = 'Escolha um roteiro, ligue o microfone ou digite uma fala'; $('p-av').textContent = '—'; $('p-av').dataset.idle = '1'; }
      ui();
    });
    $('mic').addEventListener('click', micLigar);
    $('typer').addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = $('fala').value.replace(/\s+/g, ' ').trim();
      if (txt.length < CFG.limites.falaMin) { toast('Digite uma fala antes de analisar.'); $('fala').focus(); return; }
      if (!C) novaLigacao({ nome: 'Cliente', meta: 'falas digitadas', vendedor: 'Você (vendas)', cor: '#9ca3af', sym: 'TXT' }, null);
      const t = addTurn(S.who);
      setText(t, txt.slice(0, CFG.limites.fala)); finalizar(t);
      $('fala').value = '';
      if (t.quem === 'cliente') analisar(t, false); else toast('Fala do vendedor adicionada ao histórico — o Jev analisa as falas do cliente.');
      ui();
    });
    $('s-close').addEventListener('click', fecharResumo);
    $('s-again').addEventListener('click', () => simIniciar(C && C.roteiroId ? C.roteiroId : S.roteiro));
    $('s-next').addEventListener('click', (e) => simIniciar(e.currentTarget.dataset.id));
    $('summary').addEventListener('mousedown', (e) => { if (e.target.id === 'summary') fecharResumo(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('summary').hidden) fecharResumo(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimeout(SIM.timer); if (MIC.on) { pararMic(true); toast('Microfone desligado enquanto a aba estava em segundo plano.'); } }
      else if (SIM.on && !SIM.paused) agendar(300);
    });
    const redesenhar = () => { desenhar($('chart'), C ? C.finals : [], 10); if (!$('summary').hidden && C) desenhar($('s-chart'), C.finals, C.finals.length); };
    let rs; window.addEventListener('resize', () => { medirTopo(); clearTimeout(rs); rs = setTimeout(redesenhar, 150); });
    // o gráfico acompanha o tamanho do painel (fontes carregando, barra de teclas quebrando linha…)
    if ('ResizeObserver' in window) {
      let ro;
      new ResizeObserver((ents) => { for (const e of ents) TAM[e.target.id] = { w: e.contentRect.width, h: e.contentRect.height }; clearTimeout(ro); ro = setTimeout(redesenhar, 120); }).observe($('chart'));
      new ResizeObserver(() => requestAnimationFrame(medirTrilho)).observe($('stepper'));
    }
    setInterval(() => { if (C && (SIM.on || MIC.on)) $('clock').textContent = mmss(performance.now() - C.startedAt); }, 250);
  }

  function medirTopo() {
    const m = document.querySelector('.main');
    if (m) document.documentElement.style.setProperty('--main-top', `${Math.round(m.getBoundingClientRect().top + window.scrollY)}px`);
  }

  async function init() {
    try { CFG = await api('/api/config', undefined, { silent: true }); }
    catch { $('transcript').replaceChildren(el('div', { class: 't-empty', text: 'Não consegui carregar o copiloto. Recarregue a página em alguns segundos.' })); $('feed').replaceChildren(); return; }
    wire();
    medirTopo();
    montarFita();
    $('transcript').replaceChildren(transcriptVazio());
    $('feed').replaceChildren(feedVazio());
    resetRadar(); desenhar($('chart'), [], 10);
    ui();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medirTopo(); medirFita(); });
    const qs = new URLSearchParams(location.search);
    if (qs.get('roteiro')) { S.roteiro = roteiroPorId(qs.get('roteiro')).id; marcarRoteiro(); ui(); }
    if (qs.get('fala')) { $('fala').value = qs.get('fala').slice(0, CFG.limites.fala); $('typer').requestSubmit(); }
    else if (qs.get('auto') === '1') simIniciar(S.roteiro);
  }
  init();
})();

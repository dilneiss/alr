/* JevKit — utilidades de interface compartilhadas pelos apps do Jev.
   Inclua:  <link rel="stylesheet" href="/_jev/jev.css">  e  <script src="/_jev/jev-kit.js"></script>
   Depois:  JevKit.mountTopbar({ title, tagline });
   Chamadas: const data = await JevKit.api('/api/rota', { ... });   // registra automaticamente data._jev no inspetor
*/
(function () {
  'use strict';
  // o hub fica em jev.<domínio>; cada app grande em jev-<app>.<domínio>
  // dentro da biblioteca local o host tem porta: usar location.host preserva 127.0.0.1:5273
  const HUB = (() => { const h = location.hostname; const m = h.match(/^jev-[a-z0-9-]+\.(.+)$/); return location.protocol + '//' + (m ? 'jev.' + m[1] : location.host); })();
  const nf = (d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

  const fmt = {
    ms: (v) => (v == null || isNaN(v) ? '—' : v >= 10000 ? (v / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(v) + ' ms'),
    usd: (v) => {
      if (v == null || isNaN(v)) return '—';
      if (v === 0) return 'US$ 0';
      if (v < 0.01) return 'US$ ' + v.toFixed(6).replace('.', ',').replace(/0+$/, '').replace(/,$/, ',0');
      return 'US$ ' + nf(v < 1 ? 4 : 2).format(v);
    },
    brl: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0),
    pct: (p, d = 0) => (p == null || isNaN(p) ? '—' : nf(d).format(p * 100) + '%'),
    int: (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v || 0)),
    num: (v, d = 1) => nf(d).format(v || 0),
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
    return n;
  }

  function debounce(fn, ms) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }

  // ---------------- métricas + topbar ----------------
  const metrics = { calls: 0, decisions: 0, cost: 0, last: null, lat: [] };
  let topbarEls = null;

  function latClass(ms) { return ms == null ? '' : ms < 450 ? 'lat-good' : ms < 900 ? 'lat-mid' : 'lat-bad'; }

  function renderMetrics(flash) {
    if (!topbarEls) return;
    const { lat, dec, cost } = topbarEls;
    lat.className = 'jev-metric lat ' + latClass(metrics.last);
    lat.querySelector('b').textContent = metrics.last == null ? '—' : fmt.ms(metrics.last);
    dec.querySelector('b').textContent = fmt.int(metrics.decisions);
    cost.querySelector('b').textContent = fmt.usd(metrics.cost);
    if (flash) { lat.classList.remove('flash'); void lat.offsetWidth; lat.classList.add('flash'); }
  }

  const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

  function mountTopbar(opts) {
    opts = opts || {};
    let bar = document.querySelector('.jev-topbar');
    if (!bar) { bar = el('header', { class: 'jev-topbar' }); document.body.prepend(bar); }
    bar.innerHTML = '';
    const brand = el('a', { class: 'jev-brand', href: opts.homeHref || '/', title: opts.title || 'Jev' }, [
      el('span', { class: 'jev-logo', html: BOLT + 'JEV' }),
      el('span', { class: 'jev-apptitle' }, [el('b', { text: opts.title || 'Jev Apps' }), el('span', { text: opts.tagline || 'Decisões tipadas em milissegundos' })]),
    ]);
    brand.style.textDecoration = 'none'; brand.style.color = 'inherit';
    const lat = el('span', { class: 'jev-metric lat', title: 'Latência da última decisão do Jev (ida e volta até o modelo)' }, ['última decisão', el('b', { text: '—' })]);
    const dec = el('span', { class: 'jev-metric opt', title: 'Perguntas respondidas pelo Jev nesta sessão' }, ['decisões', el('b', { text: '0' })]);
    const cost = el('span', { class: 'jev-metric opt', title: 'Custo acumulado desta sessão no OpenRouter' }, ['custo', el('b', { text: 'US$ 0' })]);
    const insp = el('button', { class: 'jev-btn jev-btn--sm', type: 'button', title: 'Ver exatamente o que o Jev recebeu e respondeu', onclick: () => inspector.open() }, ['🔍 ', el('span', { class: 'jev-hide-mobile', text: 'Ver o que o Jev vê' })]);
    const arch = el('button', {
      class: 'jev-btn jev-btn--sm jev-arch-btn', type: 'button', 'aria-haspopup': 'dialog',
      title: 'Ver o diagrama da arquitetura: onde o Jev entra e o que ele decide', 'aria-label': 'Arquitetura: ver o diagrama deste app',
      onclick: async (e) => { const id = await currentDiagramId(opts.diagram); showDiagram(id || 'plataforma', { opener: arch, pointer: e.detail > 0 }); },
    }, [el('span', { class: 'jev-ico', html: DIAGRAM_ICON }), el('span', { class: 'lbl', text: 'Arquitetura' })]);
    const hub = el('a', { class: 'jev-btn jev-btn--sm jev-btn--ghost jev-hide-mobile', href: HUB + '/#/aula/kit-jev/kit-jev-100-apps', title: 'Todos os apps do Jev' }, ['Todos os apps']);
    const extra = el('span', { class: 'row', style: { gap: '8px' } }, opts.actions || []);
    bar.append(brand, el('span', { class: 'spacer' }), extra, el('span', { class: 'jev-metrics' }, [lat, dec, cost]), insp, arch, hub);
    topbarEls = { lat, dec, cost };
    currentDiagramId(opts.diagram).then((id) => { if (id) arch.dataset.diagram = id; });
    renderMetrics();
    if (!document.querySelector('.jev-footer') && opts.footer !== false) {
      document.body.append(el('footer', { class: 'jev-footer' }, [
        el('span', { html: 'Feito com <b class="jev-text">Jev</b> (TypeSafe) via OpenRouter · decisões tipadas com probabilidades, sem gerar texto' }),
        el('span', { html: `<a href="${HUB}">Todos os seus apps do Jev</a>` }),
      ]));
    }
    return bar;
  }

  // ---------------- inspetor ----------------
  const calls = [];
  let drawer, listEl, backdrop;

  function highlight(json) {
    return escapeHtml(json)
      .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/(:\s*)(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="s">$2</span>')
      .replace(/(:\s*)(-?\d+(?:\.\d+)?(?:e-?\d+)?)/gi, '$1<span class="n">$2</span>')
      .replace(/(:\s*)(true|false|null)/g, '$1<span class="b">$2</span>');
  }

  function ensureDrawer() {
    if (drawer) return;
    drawer = el('aside', { class: 'jev-drawer', role: 'dialog', 'aria-label': 'Inspetor do Jev' });
    backdrop = el('div', { class: 'jev-drawer-backdrop', onclick: () => inspector.close() });
    const head = el('header', {}, [
      el('span', { class: 'jev-logo', html: BOLT + 'JEV' }),
      el('h3', { text: 'O que o Jev recebeu e respondeu' }),
      el('span', { class: 'spacer', style: { flex: 1 } }),
      el('button', { class: 'jev-btn jev-btn--sm', type: 'button', onclick: () => inspector.close(), 'aria-label': 'Fechar' }, ['✕']),
    ]);
    listEl = el('div');
    const body = el('div', { class: 'body' }, [
      el('div', { class: 'explain', html: 'O Jev não escreve texto. Ele recebe um <b>estado</b> (os dados) e <b>perguntas tipadas</b> — <code>choice</code> (escolha), <code>score</code> (nota numa escala) e <code>noul</code> (probabilidade de sim) — e devolve <b>probabilidades</b> em uma única passada. Abaixo, as chamadas reais desta página.' }),
      listEl,
    ]);
    drawer.append(head, body);
    document.body.append(drawer, backdrop);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') inspector.close(); });
  }

  function renderCall(c, i) {
    const box = el('div', { class: 'jev-call' });
    const hd = el('div', { class: 'hd', html: `<span>#${c.n}</span><span><b>${c.n_questions}</b> pergunta(s)</span><span>latência <b>${fmt.ms(c.latency_ms)}</b></span><span>custo <b>${fmt.usd(c.cost)}</b></span>${c.cached ? '<span class="jev-badge info">cache</span>' : ''}<span class="dim">${c.at}</span>${c.label ? `<span class="jev-badge violet">${escapeHtml(c.label)}</span>` : ''}` });
    const pre = el('pre');
    const tabs = el('div', { class: 'tabs' });
    const views = { 'Perguntas': c.request && c.request.questions, 'Respostas': c.response && c.response.answers, 'Estado': c.request && c.request.state };
    let first = true;
    for (const [name, data] of Object.entries(views)) {
      const b = el('button', { type: 'button', class: first ? 'on' : '', text: name });
      b.onclick = () => { tabs.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); pre.innerHTML = highlight(JSON.stringify(data, null, 2)); };
      tabs.append(b);
      if (first) { pre.innerHTML = highlight(JSON.stringify(data, null, 2)); first = false; }
    }
    box.append(hd, tabs, pre);
    return box;
  }

  const inspector = {
    open() { ensureDrawer(); listEl.innerHTML = ''; if (!calls.length) listEl.append(el('div', { class: 'jev-empty', text: 'Nenhuma chamada ainda. Use o app e volte aqui.' })); calls.slice(-25).reverse().forEach((c, i) => listEl.append(renderCall(c, i))); drawer.classList.add('open'); backdrop.classList.add('open'); },
    close() { if (!drawer) return; drawer.classList.remove('open'); backdrop.classList.remove('open'); },
    get calls() { return calls; },
  };

  function record(debug, label) {
    if (!debug) return;
    const list = Array.isArray(debug) ? debug : [debug];
    for (const d of list) {
      if (!d) continue;
      metrics.calls++;
      metrics.decisions += d.n_questions || 0;
      metrics.cost += d.cost || 0;
      if (!d.cached && d.latency_ms != null) { metrics.last = d.latency_ms; metrics.lat.push(d.latency_ms); }
      calls.push({ ...d, n: metrics.calls, at: new Date().toLocaleTimeString('pt-BR'), label: label || d.label });
      if (calls.length > 60) calls.shift();
    }
    renderMetrics(true);
    if (drawer && drawer.classList.contains('open')) inspector.open();
  }

  // ---------------- diagrama da arquitetura (pop-up) ----------------
  // SVGs + índice gerados por report/build_arquiteturas.py em shared/ui/diagramas/ (servidos em /_jev/diagramas/).
  const DIAGRAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="3" width="7" height="6" rx="1.5"/><rect x="8.5" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v2.5h11V9M12 11.5V15"/></svg>';
  const DIAGRAM_ALIAS = { hub: 'plataforma' };
  const DG_LEGEND = [
    ['core', '⚡ JEV — onde a IA decide'], ['#94a3b8', 'navegador / pessoa'], ['#60a5fa', 'lógica no navegador'], ['#a78bfa', 'servidor do app'],
    ['#34d399', 'modelo local (texto)'], ['#fbbf24', 'serviço externo'], ['#f472b6', 'dados / estado'], ['#9ca3af', 'infraestrutura'],
  ];
  // enquanto o pop-up está aberto, nenhum evento de teclado/ponteiro chega ao app (jogos, rastreadores, atalhos)
  const DG_BLOCK = ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'auxclick', 'contextmenu', 'pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout',
    'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'touchstart', 'touchmove', 'touchend', 'wheel', 'copy', 'cut', 'paste'];
  const DG_PASSIVE = new Set(['touchstart', 'touchmove', 'touchend', 'wheel']);
  let appIdP = null, dgIndexP = null, dlg = null, dgEls = null, dgState = null;

  function currentAppId() {
    if (!appIdP) appIdP = (async () => {
      const h = location.hostname;
      const m = h.match(/^jev-([a-z0-9-]+)\./);
      if (m) return m[1];
      if (/^jev\./.test(h)) return 'hub';
      try { const r = await fetch('/_jev/app.json', { cache: 'no-store' }); const j = await r.json(); return (j && j.app) || null; } catch { return null; }
    })();
    return appIdP;
  }
  async function currentDiagramId(explicit) {
    if (explicit) return explicit;
    const id = await currentAppId();
    return id ? DIAGRAM_ALIAS[id] || id : null;
  }
  function diagramIndex() {
    if (!dgIndexP) dgIndexP = fetch('/_jev/diagramas/index.json').then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).catch((e) => { dgIndexP = null; throw e; });
    return dgIndexP;
  }

  function dgGuard(e) {
    if (!dlg || !dlg.open) return;
    if (window.JevChamadas && window.JevChamadas.aberto()) return;
    const t = e.target;
    if (e.type === 'keydown' && e.key === 'Escape') { e.preventDefault(); closeDiagram(); }
    else if (e.type === 'pointerdown' || e.type === 'mousedown') dgState.downOnBackdrop = t === dlg;
    else if (e.type === 'click') {
      const act = t && t.closest && dlg.contains(t) ? t.closest('[data-dg-act]') : null;
      if (act && act.dataset.dgAct === 'close') closeDiagram();
      else if (act && act.dataset.dgAct === 'zoom') toggleZoom();
      else if (act && act.dataset.dgAct === 'tab') setDiagramTab(act.dataset.tab);
      else if (act && act.dataset.dgAct === 'jev-json') abrirChamadas('json');
      else if (act && act.dataset.dgAct === 'jev-cheia') abrirChamadas('tabela');
      else if (t === dlg && dgState.downOnBackdrop) closeDiagram(); // clique no fundo escurecido
    }
    e.stopPropagation();
  }

  function ensureDialog() {
    if (dlg) return;
    const title = el('h2', { id: 'jev-dg-title' });
    const sub = el('span', { class: 'sub' });
    const svgLink = el('a', { class: 'jev-btn jev-btn--sm jev-btn--ghost jev-hide-mobile', target: '_blank', rel: 'noopener', title: 'Abrir o diagrama sozinho, em tamanho real, numa nova aba' }, ['Tamanho real ↗']);
    const zoom = el('button', { class: 'jev-btn jev-btn--sm', type: 'button', 'data-dg-act': 'zoom', 'aria-pressed': 'false', title: 'Alternar entre caber na janela e tamanho real' }, ['Ampliar']);
    const close = el('button', { class: 'jev-btn jev-btn--sm', type: 'button', 'data-dg-act': 'close', 'aria-label': 'Fechar o diagrama', title: 'Fechar (Esc)' }, ['✕']);
    const cap = el('p', { class: 'jev-dg-cap', id: 'jev-dg-cap' });
    const tabEx = el('button', { type: 'button', role: 'tab', 'data-dg-act': 'tab', 'data-tab': 'exemplo', id: 'jev-dg-tab-ex', 'aria-controls': 'jev-dg-view' }, ['⚡ Como o Jev decide']);
    const tabArq = el('button', { type: 'button', role: 'tab', 'data-dg-act': 'tab', 'data-tab': 'arq', id: 'jev-dg-tab-arq', 'aria-controls': 'jev-dg-view' }, ['🧩 Arquitetura']);
    const tabs = el('div', { class: 'jev-dg-tabs', role: 'tablist', 'aria-label': 'Tipo de diagrama' }, [tabEx, tabArq]);
    const img = el('img', { alt: '', decoding: 'async' });
    const hot = el('div', { class: 'jev-dg-hot', 'data-dg-act': 'jev-cheia', title: 'Ver as chamadas do Jev deste exemplo: cada pergunta, o tipo e o JSON' }, [
      el('span', { class: 'jev-dg-hot-bts' }, [
        el('button', { type: 'button', class: 'jev-dg-hot-b', 'data-dg-act': 'jev-json', 'aria-label': 'Ver o JSON das chamadas do Jev' }, ['{ } JSON']),
        el('button', { type: 'button', class: 'jev-dg-hot-b', 'data-dg-act': 'jev-cheia', 'aria-label': 'Ver todas as chamadas do Jev em tela cheia' }, ['⤢ Tela cheia']),
      ]),
    ]);
    const fig = el('div', { class: 'jev-dg-fig' }, [img, hot]);
    const scroll = el('div', { class: 'jev-dg-scroll', id: 'jev-dg-view', tabindex: '0', role: 'tabpanel', 'aria-label': 'Diagrama (use as setas para rolar)' }, [fig]);
    const why = el('p', { class: 'jev-dg-why' });
    const legend = el('div', { class: 'jev-dg-legend' }, DG_LEGEND.map(([c, t]) => c === 'core'
      ? el('span', { class: 'core' }, [el('i'), t])
      : el('span', {}, [el('i', { style: { borderColor: c, background: c + '1f' } }), t])));
    const appLink = el('a', { class: 'jev-btn jev-btn--sm jev-btn--primary', target: '_blank', rel: 'noopener' }, ['Abrir o demo ↗']);
    const allLink = el('a', { class: 'jev-btn jev-btn--sm jev-btn--ghost', target: '_blank', rel: 'noopener' }, ['Ver todos os diagramas ↗']);
    dlg = el('dialog', { class: 'jev-dg', 'aria-labelledby': 'jev-dg-title', 'aria-describedby': 'jev-dg-cap' }, [
      el('div', { class: 'jev-dg-panel' }, [
        el('header', { class: 'jev-dg-head' }, [
          el('span', { class: 'jev-logo', html: BOLT + 'JEV' }),
          el('div', { class: 'ttl' }, [title, sub]),
          el('span', { class: 'spacer' }), svgLink, zoom, close,
        ]),
        el('div', { class: 'jev-dg-body' }, [tabs, cap, scroll, el('p', { class: 'jev-dg-hint', text: '↔ Arraste o diagrama para os lados para ver tudo.' }), why, legend]),
        el('footer', { class: 'jev-dg-foot' }, [el('span', { class: 'dim', text: 'Esc ou clique fora para fechar' }), el('span', { class: 'row', style: { gap: '8px' } }, [appLink, allLink])]),
      ]),
    ]);
    dlg.addEventListener('close', () => { if (!dlg.open) cleanupDiagram(); });
    dlg.addEventListener('cancel', () => { /* tecla Voltar do Android etc.: deixa fechar; a limpeza roda no evento close */ });
    document.body.append(dlg);
    dgEls = { title, sub, svgLink, zoom, cap, img, scroll, why, appLink, allLink, tabs, tabEx, tabArq, legend, hot, fig };
  }

  function toggleZoom(force) {
    const on = force != null ? force : !dgEls.scroll.classList.contains('zoom');
    dgEls.scroll.classList.toggle('zoom', on);
    dgEls.zoom.setAttribute('aria-pressed', String(on));
    dgEls.zoom.textContent = on ? 'Caber na janela' : 'Ampliar';
  }

  async function showDiagram(id, opts) {
    opts = opts || {};
    let idx;
    try { idx = await diagramIndex(); } catch { toast('Não consegui carregar o diagrama agora. Tente de novo em instantes.', 'err'); return false; }
    if (!idx[id]) { if (id) toast('Este app ainda não tem diagrama próprio — mostrando a visão geral.'); id = 'plataforma'; }
    const d = idx[id];
    if (!d) return false;
    ensureDialog();
    const E = dgEls;
    E.title.textContent = `${d.emoji} ${d.titulo}`;
    E.cap.textContent = d.legenda;
    E.why.innerHTML = '<b>⚡ Papel do Jev aqui:</b> ' + escapeHtml(d.jev);
    E.tabs.hidden = !d.exemplo;
    dgCur = { id, d };
    setDiagramTab(opts.tab || (d.exemplo ? 'exemplo' : 'arq'));
    E.allLink.href = `${HUB}/arquiteturas.html#${encodeURIComponent(id)}`;
    const link = String(d.link || '').replace(/exemplo\.com/, location.hostname.replace(/^jev(-[a-z0-9-]+)?\./, ''));
    const own = (() => { try { return new URL(link).hostname === location.hostname; } catch { return true; } })();
    E.appLink.href = link; E.appLink.hidden = own || id === 'plataforma';
    if (!dlg.open) {
      dgState = { opener: opts.opener || document.activeElement, pointer: !!opts.pointer, downOnBackdrop: false, id };
      for (const t of DG_BLOCK) window.addEventListener(t, dgGuard, DG_PASSIVE.has(t) ? { capture: true, passive: true } : true);
      document.documentElement.classList.add('jev-dg-lock');
      dlg.showModal();
      E.scroll.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('jev:diagram', { detail: { open: true, id } }));
    } else dgState.id = id;
    return true;
  }

  // aba "exemplo": o diagrama entrada → Jev → saída com um exemplo real (<id>-exemplo.svg); aba "arq": a arquitetura (<id>.svg)
  let dgCur = null;
  function setDiagramTab(tab) {
    if (!dgCur || !dgEls) return;
    const { id, d } = dgCur, E = dgEls;
    const ex = tab === 'exemplo' && d.exemplo;
    const nome = encodeURIComponent(id) + (ex ? '-exemplo' : '');
    E.img.src = `/_jev/diagramas/${nome}.svg`;
    E.img.width = ex ? d.exemplo.w : d.w; E.img.height = ex ? d.exemplo.h : d.h;
    E.img.alt = ex ? `Como o Jev decide em ${d.titulo}, num exemplo real. ${d.exemplo.resumo}` : `Diagrama da arquitetura de ${d.titulo}. O Jev: ${d.chamadas}; decide ${d.decide}.`;
    E.svgLink.href = E.img.src;
    E.sub.textContent = ex ? 'Exemplo real · o que entra, o que o Jev decide e o que sai'
      : id === 'plataforma' ? 'Arquitetura da plataforma · por onde passa cada decisão do Jev' : 'Arquitetura · onde o Jev entra e o que ele decide';
    E.legend.hidden = !!ex;
    const box = ex ? d.exemplo.jev_box : d.jev_box, W = ex ? d.exemplo.w : d.w, H = ex ? d.exemplo.h : d.h;
    E.hot.hidden = !box || !d.exemplo; // sem exemplo capturado não há JSON para mostrar
    if (box && d.exemplo) Object.assign(E.hot.style, { left: `${(box[0] / W) * 100}%`, top: `${(box[1] / H) * 100}%`, width: `${(box[2] / W) * 100}%`, height: `${(box[3] / H) * 100}%` });
    for (const [b, on] of [[E.tabEx, !!ex], [E.tabArq, !ex]]) { b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    E.scroll.setAttribute('aria-labelledby', ex ? 'jev-dg-tab-ex' : 'jev-dg-tab-arq');
    toggleZoom(false);
    E.scroll.scrollLeft = 0; E.scroll.scrollTop = 0;
  }

  let chamadasP = null;
  function abrirChamadas(aba) {
    if (!dgCur) return;
    if (!chamadasP) chamadasP = new Promise((ok, falha) => {
      if (window.JevChamadas) return ok();
      const sc = document.createElement('script');
      sc.src = '/_jev/jev-chamadas.js'; sc.onload = () => ok(); sc.onerror = () => { chamadasP = null; falha(new Error('jev-chamadas.js')); };
      document.head.append(sc);
    });
    chamadasP.then(() => window.JevChamadas.abrir(dgCur.id, { aba, base: '/_jev/diagramas' })).catch(() => toast('Não consegui abrir as chamadas do Jev agora.', 'err'));
  }

  function cleanupDiagram() {
    if (!dgState) return;
    const st = dgState; dgState = null;
    for (const t of DG_BLOCK) window.removeEventListener(t, dgGuard, true);
    document.documentElement.classList.remove('jev-dg-lock');
    const op = st.opener;
    if (op && op.isConnected && op.focus) {
      // aberto pelo teclado: o foco volta ao botão. Pelo mouse: solta o foco, para Espaço/Enter voltarem ao app (ex.: jogos)
      if (st.pointer) { if (document.activeElement === op) op.blur(); }
      else op.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('jev:diagram', { detail: { open: false, id: st.id } }));
  }

  function closeDiagram() {
    if (!dlg || !dlg.open) return;
    dlg.close();
    cleanupDiagram();
  }

  // ---------------- API ----------------
  async function api(path, body, opts) {
    opts = opts || {};
    const init = { method: opts.method || (body === undefined ? 'GET' : 'POST'), headers: {} };
    if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    let res, data;
    try {
      res = await fetch(path, init);
      data = await res.json().catch(() => ({}));
    } catch (e) {
      if (!opts.silent) toast('Sem conexão com o servidor. Tente de novo.', 'err');
      throw e;
    }
    if (!res.ok || data.ok === false) {
      const msg = data.error || `Erro ${res.status}`;
      if (!opts.silent) toast(msg, 'err');
      const err = new Error(msg); err.status = res.status; err.code = data.code; err.data = data; throw err;
    }
    if (data._jev) record(data._jev, opts.label);
    return data;
  }

  function sse(url, handlers) {
    let es, stopped = false, retry = 1000;
    function open() {
      es = new EventSource(url);
      es.onopen = () => { retry = 1000; handlers.open && handlers.open(); };
      es.onerror = () => { es.close(); handlers.error && handlers.error(); if (!stopped) setTimeout(open, retry = Math.min(retry * 2, 10000)); };
      for (const [ev, fn] of Object.entries(handlers)) {
        if (['open', 'error'].includes(ev)) continue;
        es.addEventListener(ev, (m) => { let d; try { d = JSON.parse(m.data); } catch { d = m.data; } if (d && d._jev) record(d._jev); fn(d); });
      }
    }
    open();
    return { close() { stopped = true; es && es.close(); } };
  }

  // ---------------- componentes ----------------
  function bars(container, probabilities, opts) {
    opts = opts || {};
    const labels = opts.labels || {};
    let entries = Object.entries(probabilities || {});
    if (opts.order !== 'keys') entries.sort((a, b) => b[1] - a[1]);
    else if (opts.keys) entries = opts.keys.map((k) => [k, (probabilities || {})[k] || 0]);
    if (opts.limit) entries = entries.slice(0, opts.limit);
    const topKey = opts.top || (Object.entries(probabilities || {}).sort((a, b) => b[1] - a[1])[0] || [])[0];
    let wrap = container.querySelector(':scope > .jev-bars');
    if (!wrap) { wrap = el('div', { class: 'jev-bars' }); container.innerHTML = ''; container.append(wrap); }
    const existing = new Map([...wrap.children].map((c) => [c.dataset.key, c]));
    const frag = [];
    for (const [k, p] of entries) {
      let row = existing.get(k);
      if (!row) {
        row = el('div', { class: 'jev-bar', 'data-key': k }, [
          el('span', { class: 'lbl', text: labels[k] || k, title: labels[k] || k }),
          el('span', { class: 'trk' }, [el('span', { class: 'fil' })]),
          el('span', { class: 'pct', text: '0%' }),
        ]);
      }
      const tone = (opts.tones && opts.tones[k]) || '';
      row.className = 'jev-bar' + (k === topKey ? ' top' : '') + (tone ? ' ' + tone : '');
      row.querySelector('.pct').textContent = fmt.pct(p);
      requestAnimationFrame(() => { row.querySelector('.fil').style.width = Math.max(0, Math.min(100, p * 100)) + '%'; });
      frag.push(row);
    }
    wrap.replaceChildren(...frag);
    return wrap;
  }

  function gauge(container, p, opts) {
    opts = opts || {};
    const v = Math.max(0, Math.min(1, p || 0));
    const color = opts.color || (opts.invert ? (v > .66 ? '#34d399' : v > .33 ? '#fbbf24' : '#f87171') : (v > .66 ? '#f87171' : v > .33 ? '#fbbf24' : '#34d399'));
    const r = 80, c = Math.PI * r;
    container.classList.add('jev-gauge');
    container.innerHTML = `<svg viewBox="0 0 200 115" role="img" aria-label="${escapeHtml(opts.label || '')} ${Math.round(v * 100)}%">
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16" stroke-linecap="round"/>
      <path class="arc" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" style="transition: stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1); filter: drop-shadow(0 0 8px ${color}66)"/>
    </svg><div class="gv" style="color:${color}">${Math.round(v * 100)}%</div>${opts.label ? `<div class="gl">${escapeHtml(opts.label)}</div>` : ''}`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const a = container.querySelector('.arc'); if (a) a.style.strokeDashoffset = String(c * (1 - v)); }));
  }

  function scoreMeter(container, answer, opts) {
    opts = opts || {};
    const levels = opts.levels || Object.values(answer.legend || {});
    const n = levels.length || Object.keys(answer.probabilities || {}).length;
    const probs = answer.probabilities || {};
    container.innerHTML = '';
    const meter = el('div', { class: 'jev-score' });
    for (let i = 0; i < n; i++) {
      const p = probs[String(i)] || 0;
      const seg = el('div', { class: 'seg', title: `${levels[i] || i}: ${fmt.pct(p)}` }, [el('i', opts.colors && opts.colors[i] ? { style: { background: opts.colors[i] } } : null)]);
      meter.append(seg);
      requestAnimationFrame(() => { seg.firstChild.style.opacity = String(Math.min(1, answer.score >= i ? 1 : Math.max(0, 1 - (i - answer.score)))); });
    }
    container.append(meter);
    if (opts.legend !== false && opts.short) container.append(el('div', { class: 'jev-score-legend' }, opts.short.map((s) => el('span', { text: s }))));
  }

  // ---------------- toast ----------------
  let toasts;
  function toast(msg, kind) {
    if (!toasts) { toasts = el('div', { class: 'jev-toasts', 'aria-live': 'polite' }); document.body.append(toasts); }
    const t = el('div', { class: 'jev-toast ' + (kind || ''), text: msg });
    toasts.append(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, kind === 'err' ? 5200 : 3200);
  }

  window.JevKit = { fmt, escapeHtml, el, debounce, mountTopbar, inspector, record, api, sse, bars, gauge, scoreMeter, toast, metrics, HUB, showDiagram, closeDiagram, currentDiagramId };
})();

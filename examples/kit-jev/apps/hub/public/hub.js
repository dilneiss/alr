(function () {
  const { fmt, el, bars, escapeHtml } = JevKit;
  JevKit.mountTopbar({ title: 'Jev Apps', tagline: 'Os seus apps com o modelo de decisões da TypeSafe' });

  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Legenda das técnicas: exemplos estáticos dos três primitivos (respostas reais medidas durante a construção)
  bars(document.getElementById('p-choice'), { financeiro: 1, tecnico: 0, comercial: 0 }, { labels: { financeiro: 'financeiro', tecnico: 'técnico', comercial: 'comercial' } });
  JevKit.scoreMeter(document.getElementById('p-score'), { score: 2, probabilities: { 0: 0, 1: 0, 2: 1 } }, { short: ['calmo', 'irritado', 'furioso'], colors: ['#CFC6B6', '#8C8478', '#D9432A'] });
  bars(document.getElementById('p-noul'), { sim: 0.98, nao: 0.02 }, { labels: { sim: 'pede reembolso', nao: 'não pede' }, order: 'keys', keys: ['sim', 'nao'] });

  const DIAGRAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="3" width="7" height="6" rx="1.5"/><rect x="8.5" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v2.5h11V9M12 11.5V15"/></svg>';
  const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // as mesmas marcas da legenda das técnicas, repetidas na etiqueta de cada prancha
  const MARK = {
    choice: '<svg class="mk" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.75" fill="currentColor"/></svg>',
    score: '<svg class="mk" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.25" y="4.75" width="13.5" height="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1.25" y="4.75" width="8.5" height="6.5" fill="currentColor"/></svg>',
    noul: '<svg class="mk" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/></svg>',
  };
  document.getElementById('archDiagram').addEventListener('click', (e) => JevKit.showDiagram('plataforma', { opener: e.currentTarget, pointer: e.detail > 0 }));

  const grid = document.getElementById('grid');
  let demos = [];
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, um, varios) => (n === 1 ? um : varios);

  // grade editorial de 12 colunas: um ciclo de 8 pranchas (destaque, 7+5, 4+4+4, 5+7), na ordem dos demos
  const CICLO = ['feature', 'wide', 'mid off-l', 'small', 'small off', 'small', 'mid off', 'wide'];
  function plateClass(i) {
    const [size, off] = CICLO[i % CICLO.length].split(' ');
    const cls = ['plate', 'plate--' + size];
    if (off) cls.push('plate--' + off);
    if (size === 'feature' && Math.floor(i / CICLO.length) % 2 === 1) cls.push('plate--mirror');
    return cls.join(' ');
  }

  function spec(key, value) {
    return el('div', {}, [el('dt', { text: key }), el('dd', {}, value)]);
  }

  function card(d, i, total) {
    const n2 = pad(d.n);
    const img = el('img', { src: d.shot, alt: `Captura do demo ${d.title}`, loading: 'lazy', decoding: 'async', width: '1280', height: '800' });
    const ph = el('span', { class: 'ph', 'aria-hidden': 'true' }, [el('span', { class: 'ph-t', text: 'carregando a reprodução…' })]);
    img.addEventListener('load', () => ph.remove());
    img.addEventListener('error', () => { img.remove(); ph.classList.add('ph--err'); ph.firstChild.textContent = 'reprodução indisponível'; });
    const kick = el('p', { class: 'kick' }, [el('b', { text: 'Prancha ' + n2 })]);
    for (const t of d.tags) kick.append(' · ' + t);
    return el('article', { class: plateClass(i), id: 'demo-' + d.id }, [
      el('div', { class: 'plate-in' }, [
        el('a', { class: 'sheet', href: d.url, target: '_blank', rel: 'noopener', 'aria-label': 'Abrir ' + d.title }, [
          el('span', { class: 'mat' }, [ph, img]),
          el('span', { class: 'sheet-foot', 'aria-hidden': 'true' }, [el('span', { class: 'ed', text: `${n2}/${pad(total)}` }), el('span', { class: 'sig', text: 'Jev' })]),
        ]),
        el('div', { class: 'label' }, [
          el('div', { class: 'label-in' }, [
            el('span', { class: 'numeral', 'aria-hidden': 'true', text: n2 }),
            el('div', { class: 'head' }, [kick, el('h3', { class: 'title', text: d.title })]),
            el('p', { class: 'one', text: d.oneliner }),
            el('dl', { class: 'specs' }, [
              spec('Técnica', [el('span', { text: d.jev }), el('span', { class: 'types', id: 'tec-' + d.id })]),
              spec('Duração', [el('span', { class: 'live wait', id: 'dur-' + d.id, text: 'aguardando o gateway…' })]),
              spec('Procedência', [el('span', { class: 'live wait', id: 'stat-' + d.id, text: 'aguardando o gateway…' })]),
            ]),
            el('div', { class: 'foot' }, [
              el('span', { class: 'url', text: d.url.replace('https://', '') }),
              el('span', { class: 'acts' }, [
                el('button', { class: 'btn', type: 'button', 'aria-haspopup': 'dialog', title: 'Ver o diagrama da arquitetura: onde o Jev entra e o que ele decide', 'aria-label': 'Diagrama da arquitetura de ' + d.title, onclick: (e) => JevKit.showDiagram(d.id, { opener: e.currentTarget, pointer: e.detail > 0 }) }, [el('span', { class: 'ico', html: DIAGRAM_ICON }), 'Diagrama']),
                el('a', { class: 'btn btn--ink', href: d.url, target: '_blank', rel: 'noopener', 'aria-label': 'Abrir ' + d.title }, ['Abrir', el('span', { class: 'ico', html: ARROW })]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
  }

  // técnica: os tipos de pergunta do exemplo real de cada app (o mesmo índice que alimenta os diagramas)
  async function loadTecnicas() {
    let idx;
    try { const r = await fetch('/_jev/diagramas/index.json'); if (!r.ok) return; idx = await r.json(); } catch { return; }
    for (const d of demos) {
      const info = idx[d.id], node = document.getElementById('tec-' + d.id);
      const t = info && info.exemplo && info.exemplo.tipos;
      if (!node || !t) continue;
      const parts = ['choice', 'score', 'noul'].filter((k) => t[k] > 0)
        .map((k) => `<span class="ty">${MARK[k]}<b>${fmt.int(t[k])}</b> ${k}</span>`);
      if (info.chamadas) parts.push(`<span class="ty ty-call">${escapeHtml(info.chamadas)}</span>`);
      node.innerHTML = parts.join('');
    }
  }

  // entrada: as pranchas já visíveis sobem em sequência; as de baixo só animam quando chegam perto da tela.
  // Nada fica escondido antes de a animação começar (uma captura sem rolagem vê tudo); sem movimento se o sistema pedir.
  function reveal(nodes) {
    if (reduce) return;
    let k = 0;
    const later = [];
    for (const n of nodes) {
      if (n.getBoundingClientRect().top < innerHeight) { n.style.setProperty('--d', (260 + k++ * 120) + 'ms'); n.classList.add('in'); }
      else later.push(n);
    }
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      let j = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.style.setProperty('--d', (j++ * 110) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    for (const n of later) io.observe(n);
  }

  async function load() {
    try {
      demos = await (await fetch('demos.json')).json();
    } catch {
      grid.removeAttribute('aria-busy');
      grid.replaceChildren(el('p', { class: 'grid-err', role: 'alert' }, [
        'Não consegui carregar o catálogo agora.',
        el('button', { class: 'btn', type: 'button', onclick: () => { grid.replaceChildren(); grid.setAttribute('aria-busy', 'true'); load(); } }, ['Tentar de novo']),
      ]));
      return;
    }
    const plates = demos.map((d, i) => card(d, i, demos.length));
    grid.replaceChildren(...plates);
    grid.removeAttribute('aria-busy');
    const nMod = document.querySelectorAll('#mod-grade .mod').length;
    const total = String(demos.length + nMod);
    for (const id of ['n-apps', 'n-apps-h']) { const n = document.getElementById(id); if (n) { n.textContent = total; n.dataset.digitos = total.length; } }
    const range = document.getElementById('pr-range');
    if (range && demos.length) range.textContent = `${pad(demos[0].n)}—${pad(demos[demos.length - 1].n)}`;
    reveal(plates);
    // a âncora do endereço (/#demo-<id>) aponta para uma prancha que só existe agora: rola até ela
    if (location.hash.startsWith('#demo-')) {
      const alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (alvo) requestAnimationFrame(() => alvo.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
    loadTecnicas();
    refresh();
    setInterval(refresh, 10000);
  }

  // um número novo do gateway "chega" no colofão (primeira vez) ou é sublinhado em vermelhão (quando muda)
  function setLive(node, html) {
    if (!node || node.dataset.v === html) return;
    const first = node.dataset.v == null;
    node.dataset.v = html;
    node.innerHTML = html;
    node.classList.remove('wait', 'tick', 'arrive');
    if (reduce) return;
    void node.offsetWidth;
    node.classList.add(first ? 'arrive' : 'tick');
  }

  async function refresh() {
    const live = document.getElementById('live');
    try {
      const s = await (await fetch('/api/stats')).json();
      if (!s.ok) { offline(live); return; }
      live.classList.remove('offline');
      setLive(document.getElementById('k-q'), escapeHtml(fmt.int(s.total.questions)));
      setLive(document.getElementById('k-c'), escapeHtml(fmt.int(s.total.calls)));
      setLive(document.getElementById('k-cost'), escapeHtml(fmt.usd(s.total.cost)));
      setLive(document.getElementById('k-p50'), escapeHtml(fmt.ms(s.total.p50_ms)));
      const model = document.getElementById('k-model');
      if (model && s.model) model.textContent = s.model;
      for (const d of demos) {
        const a = s.apps[d.id];
        const dur = document.getElementById('dur-' + d.id), st = document.getElementById('stat-' + d.id);
        if (a) {
          setLive(dur, a.p50_ms == null ? 'sem medição ainda' : `<b>${escapeHtml(fmt.ms(a.p50_ms))}</b> por chamada (mediana)`);
          setLive(st, `<b>${escapeHtml(fmt.int(a.questions))}</b> ${plural(a.questions, 'decisão', 'decisões')} em <b>${escapeHtml(fmt.int(a.calls))}</b> ${plural(a.calls, 'chamada', 'chamadas')}`);
        } else {
          setLive(dur, 'sem medição ainda');
          setLive(st, 'nenhuma decisão registrada ainda');
        }
      }
    } catch { offline(live); }
  }

  function offline(live) {
    if (live) live.classList.add('offline');
    for (const d of demos) for (const pre of ['dur-', 'stat-']) {
      const n = document.getElementById(pre + d.id);
      if (n && n.classList.contains('wait')) n.textContent = 'gateway indisponível agora';
    }
  }

  // planta da montagem: desenho técnico em tinta sobre papel quadriculado; o Jev é o único bloco em vermelhão
  const INK = '#17140F', GRAF = '#5B554C', SHEET = '#FBF9F4', VERM = '#B23A22', ON_VERM = '#F7F3EA';
  const SANS = 'font-family="Public Sans, Helvetica Neue, sans-serif"', MONO = 'font-family="DM Mono, ui-monospace, monospace"';
  const ttl = (x, y, t, fill = INK) => `<text x="${x}" y="${y}" text-anchor="middle" ${SANS} font-size="15" font-weight="650" fill="${fill}">${t}</text>`;
  const sub = (x, y, t, fill = GRAF, size = 11.5) => `<text x="${x}" y="${y}" text-anchor="middle" ${MONO} font-size="${size}" fill="${fill}">${t}</text>`;
  const txt = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" ${SANS} font-size="12.5" fill="${INK}">${t}</text>`;
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${SHEET}" stroke="${INK}" stroke-width="1.3"/>`;
  const stack = (x, y, w, h) => `<rect x="${x + 12}" y="${y - 12}" width="${w}" height="${h}" fill="${SHEET}" stroke="${INK}" stroke-opacity=".35"/><rect x="${x + 6}" y="${y - 6}" width="${w}" height="${h}" fill="${SHEET}" stroke="${INK}" stroke-opacity=".55"/>${box(x, y, w, h)}`;
  const marker = (id) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto"><path d="M0 1 9 5 0 9z" fill="${INK}"/></marker>`;
  const arrows = (id, ds) => `<g stroke="${INK}" stroke-width="1.4" fill="none" marker-end="url(#${id})">${ds.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  const ARIA = 'Navegador, Caddy com HTTPS e login único, apps Node, gateway do Jev, OpenRouter, Jev e modelo de texto';

  const archH = `
  <svg class="arch-h" viewBox="0 0 1000 344" role="img" aria-label="${ARIA}">
    <defs>${marker('arh')}</defs>
    <rect x="156" y="22" width="644" height="310" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-dasharray="5 5"/>
    <text x="172" y="46" ${MONO} font-size="11" letter-spacing=".6" fill="${GRAF}">Uma VPS da Hostinger</text>
    <text x="786" y="320" text-anchor="end" ${MONO} font-size="11" letter-spacing=".6" fill="${GRAF}">Ubuntu 24.04 · Docker Compose</text>
    ${box(10, 104, 124, 72)}${ttl(72, 136, 'Navegador')}${sub(72, 157, 'você')}
    ${box(176, 104, 138, 72)}${ttl(245, 136, 'Caddy')}${sub(245, 157, 'HTTPS · login único', GRAF, 11)}
    ${stack(344, 70, 200, 160)}
    ${ttl(444, 100, 'apps (Node 22)')}${sub(444, 121, 'um contêiner por app', GRAF, 11)}
    <path d="M364 136h160" stroke="${INK}" stroke-opacity=".25"/>
    ${txt(444, 160, 'estado + perguntas tipadas')}${txt(444, 182, 'regras de negócio + textos')}${txt(444, 204, 'simulações, jogos, navegador')}
    ${box(584, 104, 196, 72)}${ttl(682, 136, 'Gateway Jev')}${sub(682, 157, 'chave · orçamento · métricas', GRAF, 10.5)}
    <rect x="826" y="96" width="164" height="88" fill="${VERM}"/>
    ${ttl(908, 133, 'OpenRouter → Jev', ON_VERM)}${sub(908, 156, 'typesafe/jev-1.13', ON_VERM, 12)}
    ${box(344, 262, 200, 56)}${ttl(444, 286, 'Modelo de texto')}${sub(444, 305, 'Gemini Flash-Lite na nuvem', GRAF, 11)}
    ${arrows('arh', ['M134 140h38', 'M314 140h26', 'M556 140h24', 'M780 140h42', 'M444 230v28'])}
  </svg>`;

  const archV = `
  <svg class="arch-v" viewBox="0 0 360 680" role="img" aria-label="${ARIA}">
    <defs>${marker('arv')}</defs>
    ${box(100, 8, 160, 60)}${ttl(180, 35, 'Navegador')}${sub(180, 54, 'você')}
    <rect x="8" y="88" width="344" height="474" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-dasharray="5 5"/>
    <text x="20" y="108" ${MONO} font-size="10.5" letter-spacing=".4" fill="${GRAF}">VPS da Hostinger</text>
    <text x="20" y="123" ${MONO} font-size="10.5" letter-spacing=".4" fill="${GRAF}">8 vCPU · 32 GB</text>
    ${box(100, 134, 160, 60)}${ttl(180, 161, 'Caddy')}${sub(180, 180, 'HTTPS · login único', GRAF, 11)}
    ${stack(64, 238, 220, 150)}
    ${ttl(174, 266, 'apps (Node 22)')}${sub(174, 286, 'um contêiner por app', GRAF, 11)}
    <path d="M84 299h180" stroke="${INK}" stroke-opacity=".25"/>
    ${txt(174, 320, 'estado + perguntas tipadas')}${txt(174, 341, 'regras de negócio + textos')}${txt(174, 362, 'simulações, jogos, navegador')}
    ${box(20, 428, 152, 84)}${ttl(96, 455, 'Gateway Jev')}${sub(96, 475, 'chave · orçamento ·', GRAF, 10.5)}${sub(96, 492, 'métricas', GRAF, 10.5)}
    ${box(188, 428, 152, 84)}${ttl(264, 455, 'Modelo de texto')}${sub(264, 475, 'Gemini Flash-Lite', GRAF, 10.5)}${sub(264, 492, 'na nuvem', GRAF, 10.5)}
    <text x="340" y="548" text-anchor="end" ${MONO} font-size="10.5" letter-spacing=".4" fill="${GRAF}">Ubuntu 24.04 · Docker Compose</text>
    <rect x="20" y="596" width="320" height="76" fill="${VERM}"/>
    ${ttl(180, 629, 'OpenRouter → Jev', ON_VERM)}${sub(180, 652, 'typesafe/jev-1.13', ON_VERM, 12)}
    ${arrows('arv', ['M180 68v62', 'M180 194v28', 'M96 388v36', 'M264 388v36', 'M96 512v80'])}
  </svg>`;

  document.getElementById('arch').innerHTML = archH + archV + '<figcaption>Planta da montagem · o tracejado é a sua VPS; o bloco em vermelhão é o Jev, fora do seu servidor</figcaption>';

  load();
})();

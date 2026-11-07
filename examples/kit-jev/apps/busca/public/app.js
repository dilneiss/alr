(function () {
  'use strict';
  const { fmt, el, api, debounce, escapeHtml, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Busca que Entende', tagline: 'O Jev avalia o catálogo inteiro a cada pausa na digitação' });

  const $ = (id) => document.getElementById(id);
  const qEl = $('q');
  const NIVEIS = ['Irrelevante', 'Talvez', 'Boa opção', 'Perfeito'];
  let CAT = [], CATS = {}, BY = new Map();
  let seq = 0, inflight = '', lastJev = null, lastJevKey = '';
  const MAX_LIST = 8;
  const FRESH = new URLSearchParams(location.search).has('fresh'); // ?fresh=1: ignora o cache (para gravar o vídeo com a latência real)

  const brl = (v) => fmt.brl(v);
  const nivel = (s) => Math.max(0, Math.min(3, Math.round(s)));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const keyOf = (s) => norm(s).toLowerCase();

  // ---------------- peças do catálogo (só apresentação) ----------------
  const UNDERSTOOD0 = $('understood').innerHTML; // o cupom em branco
  let speedEmpty = $('speed').innerHTML;         // o recibo antes da 1ª busca
  const DEP_INDEX = {};                           // departamento -> posição (cor do fundo da "foto")
  const CHAVES = { intencao: 'Intenção', categoria: 'Departamento', para_quem: 'Destinatário', ocasiao: 'Ocasião', orcamento: 'Orçamento' };
  const frag = (markup) => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
  // barbante: laço que passa pelo furo, nó logo depois da ponta e o rabo subindo (a etiqueta fica "pendurada")
  const TWINE = '<svg class="twine" viewBox="0 0 46 44" aria-hidden="true"><path d="M44.5 38.6C40 36.4 35.6 34 31.6 30.2M44.5 41.4C39.4 43.4 33.4 38.8 31.6 30.2C29.6 22.6 34.4 15.4 30.4 7.6 29 4.8 26.6 2.6 24.4 1"/><circle class="knot" cx="31.6" cy="30.2" r="2"/></svg>';
  const RING = '<svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><path pathLength="100" d="M26.8 6.4C33.6 9 36.4 15.6 35 22.6 33.4 30.6 26.4 35.6 18.4 34.6 10.2 33.6 4.8 27 5.6 19 6.4 11.4 12.4 5.4 20.4 5.2 24.6 5.1 28.4 6.4 31 8.8"/></svg>';
  const ICON_NADA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h22l-2.5 15h-17z"/><path d="M11 12a5 5 0 0 1 10 0"/><path d="M12.5 18.5l7 5m0-5-7 5"/></svg>';
  const ICON_ACIMA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9l-6-9z"/><circle cx="8.6" cy="12" r="1.4" fill="#FFFDF7"/><path d="M12.5 8.5l5 7" /></svg>';

  const sku = (p) => 'Nº ' + String(p.id).replace(/^\D+/, '');
  const depLabel = (p) => (CATS[p.categoria] || {}).label || '';

  function priceEl(v) {
    const s = brl(v);
    const m = /^R\$\s*([\d.]+),(\d{2})$/.exec(s);
    if (!m) return el('span', { class: 'price', text: s });
    return el('span', { class: 'price' }, [
      el('span', { class: 'sr', text: s }),
      el('span', { class: 'pv', 'aria-hidden': 'true' }, [el('small', { text: 'R$' }), m[1], el('sup', { text: ',' + m[2] })]),
    ]);
  }
  function thumb(p, n) {
    return el('div', { class: 'thumb', 'data-bd': String((DEP_INDEX[p.categoria] || 0) % 4) }, [
      el('span', { class: 'ph', text: p.emoji }), el('span', { class: 'n', text: String(n) }), el('span', { class: 'sku', text: sku(p) }),
    ]);
  }
  // etiqueta de preço: furo com anel de reforço + barbante; a cor diz o nível de relevância
  function etiqueta(lv, texto, cls, comBarbante) {
    const w = el('span', { class: (cls || 'ptag') + ' lv' + lv });
    if (comBarbante !== false) w.append(frag(TWINE));
    w.append(el('span', { class: 'tag' }, [el('b', { text: texto })]));
    return w;
  }

  // ---------------- carga ----------------
  async function boot() {
    try {
      const [c, ex] = await Promise.all([api('/api/catalogo', undefined, { silent: true }), api('/api/exemplos', undefined, { silent: true })]);
      CAT = c.produtos; CATS = c.categorias; BY = new Map(CAT.map((p) => [p.id, p]));
      $('ncat').textContent = CAT.length;
      KeywordSearch.build(CAT, CATS);
      buildMosaic(); buildRamp(); buildChips(ex.exemplos); loadStats();
      const qp = new URLSearchParams(location.search).get('q');
      if (qp) { qEl.value = qp.slice(0, 300); onType(true); runJev(); }
    } catch (e) {
      toast('Não consegui carregar o catálogo. Recarregue a página.', 'err');
    }
  }

  async function loadStats() {
    try {
      const s = await api('/api/stats', undefined, { silent: true });
      if (s.buscas > 0) {
        speedEmpty = '<span class="rc-head">Recibo do Jev</span><span class="dim">Aparece aqui a cada busca: quanto tempo e quanto custou avaliar o catálogo inteiro.</span>' +
          `<span class="rc-line"><span>buscas nesta loja</span><i></i><b>${fmt.int(s.buscas)}</b></span>` +
          `<span class="rc-line"><span>notas dadas pelo Jev</span><i></i><b>${fmt.int(s.produtos_avaliados)}</b></span>`;
        if (!lastJev) $('speed').innerHTML = speedEmpty;
      }
    } catch {}
  }

  function buildChips(exemplos) {
    const box = $('chips');
    exemplos.forEach((ex, i) => {
      // o rótulo vem com um emoji na frente: ele vira a "foto" redonda do adesivo
      const m = /^([\p{Extended_Pictographic}\u200d\ufe0f]+)\s*(.+)$/u.exec(ex.rotulo);
      const kids = m ? [el('span', { class: 'chip-ph', 'aria-hidden': 'true', text: m[1] }), el('span', { class: 'chip-t', text: m[2] })] : [ex.rotulo];
      const b = el('button', { class: 'jev-chip', type: 'button', title: ex.q, 'data-q': ex.q, onclick: (e) => {
        box.querySelectorAll('.jev-chip').forEach((c) => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        qEl.value = ex.q; onType(true); runJev();
      } }, kids);
      b.style.setProperty('--i', i);
      box.append(b);
    });
  }

  // ---------------- página de índice (mosaico por departamento) ----------------
  const tiles = new Map();
  function buildMosaic() {
    const m = $('mosaic'); m.innerHTML = '';
    const grupos = new Map();
    for (const p of CAT) { if (!grupos.has(p.categoria)) grupos.set(p.categoria, []); grupos.get(p.categoria).push(p); }
    let r = 0;
    for (const [dep, itens] of grupos) {
      DEP_INDEX[dep] = r;
      const label = (CATS[dep] || {}).label || dep;
      const cells = el('div', { class: 'dep-cells' });
      const g = el('div', { class: 'dep', 'data-dep': dep, role: 'group', 'aria-label': label }, [el('span', { class: 'dep-name', 'aria-hidden': 'true', text: label }), cells]);
      g.style.setProperty('--r', r++);
      itens.forEach((p, c) => {
        const t = el('div', { class: 'tile', 'data-id': p.id, tabindex: '0', 'aria-label': `${p.nome}, ${brl(p.preco)}` }, [el('span', { text: p.emoji })]);
        t.style.setProperty('--c', c);
        cells.append(t); tiles.set(p.id, t);
      });
      m.append(g);
    }
    const tip = $('tip');
    const show = (t) => {
      const p = BY.get(t.dataset.id); if (!p) return;
      const sc = lastJev && lastJev.scores[p.id];
      const acima = lastJev && lastJev.entendimento.orcamento_max != null && p.preco > lastJev.entendimento.orcamento_max;
      tip.innerHTML = `<span class="tip-sku">${escapeHtml(sku(p))} · ${escapeHtml(depLabel(p))}</span><b class="tip-nm">${escapeHtml(p.emoji + ' ' + p.nome)}</b><span class="tp">${escapeHtml(brl(p.preco))}</span>`;
      if (sc) {
        const lv = nivel(sc[0]);
        const tj = el('span', { class: 'tj' }, [etiqueta(lv, NIVEIS[lv], 'mtag', false), el('span', { class: 'tp', text: `nota ${fmt.num(sc[0], 2)} de 3` })]);
        tip.append(tj);
        if (acima) tip.append(el('span', { class: 'acima', text: 'acima do orçamento' }));
      }
      tip.hidden = false;
      const r = t.getBoundingClientRect();
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
      let y = r.top - h - 12; if (y < 76) y = r.bottom + 12;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    m.addEventListener('mouseover', (e) => { const t = e.target.closest('.tile'); if (t) show(t); });
    m.addEventListener('focusin', (e) => { const t = e.target.closest('.tile'); if (t) show(t); });
    m.addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (t) show(t); });
    m.addEventListener('mouseleave', () => { tip.hidden = true; });
    m.addEventListener('focusout', () => { tip.hidden = true; });
    window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  }
  function buildRamp() {
    const r = $('ramp'); r.innerHTML = '';
    [0, 1, 2, 3].forEach((lv) => r.append(etiqueta(lv, NIVEIS[lv], 'mtag', false)));
  }
  function clearTile(t) {
    t.classList.remove('hot', 'over', 'lv0', 'lv1', 'lv2', 'lv3');
    t.querySelectorAll('.rk, .ring').forEach((x) => x.remove());
  }
  function paintMosaic(r) {
    const max = r.entendimento.orcamento_max;
    const rank = new Map(r._top.map((id, i) => [id, i + 1]));
    for (const [id, t] of tiles) {
      clearTile(t);
      const sc = r.scores[id];
      if (!sc) continue;
      const s = sc[0];
      t.classList.add('lv' + nivel(s));
      t.classList.toggle('hot', s >= 1.5);
      t.classList.toggle('over', max != null && BY.get(id).preco > max && s >= 1.5);
      const k = rank.get(id);
      if (k && k <= 5) { // os 5 primeiros ganham o círculo de caneta, como num catálogo marcado à mão
        const ring = frag(RING); ring.style.setProperty('--k', k); t.append(ring);
        const b = el('b', { class: 'rk', text: String(k) }); b.style.setProperty('--k', k); t.append(b);
      }
    }
  }
  function resetMosaic() {
    for (const t of tiles.values()) clearTile(t);
  }

  // ---------------- balcão 1: palavra-chave ----------------
  let kwState = { q: '', results: [] };
  function renderKw(q, typing) {
    const list = $('kwlist'), ph = $('kwph'), cnt = $('kwcount');
    q = norm(q);
    if (!q) { list.innerHTML = ''; ph.hidden = false; cnt.hidden = true; kwState = { q: '', results: [] }; return; }
    const { terms, results } = KeywordSearch.search(q, { typing });
    kwState = { q, results };
    ph.hidden = true; cnt.hidden = false;
    cnt.className = 'jev-badge' + (results.length ? '' : ' low');
    cnt.textContent = results.length === 1 ? '1 resultado' : `${fmt.int(results.length)} resultados`;
    list.innerHTML = '';
    if (!results.length) {
      list.append(el('li', { class: 'none', html: ICON_NADA + '<span>' + (terms.length ? `Nenhum produto contém <b>${escapeHtml(terms.map((t) => t.raw).join(', '))}</b>. A busca comum desiste aqui.` : 'Só palavras genéricas — a busca comum não tem o que procurar.') + '</span>' }));
      return;
    }
    const jevOk = lastJev && keyOf(lastJev.q) === keyOf(q);
    results.slice(0, MAX_LIST).forEach((r, i) => {
      const p = BY.get(r.id);
      const sc = jevOk ? lastJev.scores[r.id] : null;
      const lv = sc ? nivel(sc[0]) : null;
      let verdict = null;
      if (sc) {
        verdict = etiqueta(lv, (lv >= 2 ? '✓ ' : lv === 1 ? '~ ' : '✕ ') + 'Jev: ' + NIVEIS[lv].toLowerCase(), 'mtag kwv ' + (lv >= 2 ? 'ok' : lv === 1 ? 'meh' : 'bad'));
        verdict.title = `Nota do Jev: ${fmt.num(sc[0], 2)} de 3`;
      }
      list.append(el('li', { class: 'res', 'data-id': r.id, style: { animationDelay: i * 25 + 'ms' } }, [
        thumb(p, i + 1),
        el('div', { class: 'info' }, [
          el('div', { class: 'nm', html: KeywordSearch.highlight(p.nome, r.termos), title: `${p.nome} · ${depLabel(p)}` }),
          el('div', { class: 'meta' }, [priceEl(p.preco), el('span', { class: 'kwpos', text: 'casou: ' + r.termos.join(', ') })]),
        ]),
        el('div', { class: 'kwmeta' }, [verdict, el('span', { class: 'kwscore', text: `${r.nTermos}/${terms.length} palavra${terms.length > 1 ? 's' : ''}` })]),
      ]));
    });
  }

  // ---------------- balcão 2: Jev ----------------
  function setBusy(on) {
    $('st').hidden = !on;
    $('mosaic').classList.toggle('scanning', on);
    $('jevlist').classList.toggle('stale', on);
    const cs = $('catstate');
    if (on) { cs.className = 'jev-badge info'; cs.innerHTML = '<span class="jev-spinner" style="width:11px;height:11px"></span> avaliando…'; }
  }

  async function runJev() {
    const q = norm(qEl.value);
    if (q.length < 2) { toast('Digite o que você procura (pelo menos 2 letras).'); return; }
    const k = keyOf(q);
    if (k === inflight) return;
    if (lastJev && k === lastJevKey && !inflight) { $('jevlist').classList.remove('stale'); return; }
    const my = ++seq; inflight = k;
    setBusy(true);
    const t0 = performance.now();
    try {
      const r = await api('/api/buscar', FRESH ? { q, fresh: true } : { q }); // cada chamada já vem rotulada (entendimento, lote 1/3…)
      if (my !== seq) return; // resposta velha: a pessoa já digitou outra coisa
      r._client_ms = Math.round(performance.now() - t0);
      renderJev(r);
    } catch (e) {
      if (my === seq) { $('catstate').className = 'jev-badge low'; $('catstate').textContent = e.code === 'budget_exhausted' ? 'orçamento do dia esgotado' : 'falhou — tente de novo'; }
    } finally {
      if (my === seq) { setBusy(false); inflight = ''; }
    }
  }

  // o cupom "O Jev entendeu": cada escolha do Jev vira um campo preenchido
  function renderPills(r) {
    const box = $('understood'); box.innerHTML = '';
    box.append(el('span', { class: 'lbl', text: 'O Jev entendeu' }));
    r.entendimento.pilulas.forEach((p, i) => {
      const title = p.tipo === 'orcamento' && p.fonte === 'texto'
        ? `Valor lido do texto pelo código; faixa escolhida pelo Jev: ${p.faixa} (${fmt.pct(p.p)})`
        : `Escolha do Jev com ${fmt.pct(p.p)} de probabilidade`;
      box.append(el('span', { class: 'pill' + (p.fonte === 'texto' ? ' fonte-texto' : ''), title, style: { animationDelay: i * 90 + 'ms' } }, [
        el('span', { class: 'k', text: CHAVES[p.tipo] || '' }), el('i', { class: 'lead', 'aria-hidden': 'true' }),
        el('span', { class: 'v', text: p.label }), el('small', { text: fmt.pct(p.p) }),
      ]));
    });
    if (!r.entendimento.pilulas.length) box.append(el('span', { class: 'hint', text: 'Desta vez não deu para ler a intenção; as notas dos produtos valem.' }));
  }

  function ringBell() {
    const b = $('bell'); if (!b) return;
    b.classList.remove('ring'); b.getBoundingClientRect(); b.classList.add('ring');
  }

  function renderJev(r) {
    lastJev = r; lastJevKey = keyOf(r.q);
    const max = r.entendimento.orcamento_max;
    const within = r.ordem.filter((id) => max == null || BY.get(id).preco <= max);
    const bons = within.filter((id) => nivel(r.scores[id][0]) >= 2);
    const relac = within.filter((id) => nivel(r.scores[id][0]) >= 1);
    const show = relac.slice(0, MAX_LIST);
    r._top = show;

    renderPills(r);
    paintMosaic(r);

    // ranking da busca comum para a MESMA frase (para mostrar onde cada achado do Jev ficaria)
    const kw = KeywordSearch.search(r.q).results;
    const kwPos = new Map(kw.map((x, i) => [x.id, i + 1]));

    const list = $('jevlist'); list.innerHTML = ''; $('jevph').hidden = true;
    const none = $('jevnone');
    if (!bons.length) {
      none.hidden = false;
      none.className = 'none';
      none.innerHTML = ICON_NADA + '<span>' + (relac.length
        ? '<b>Nada no catálogo atende bem a este pedido.</b> O Jev prefere dizer isso a empurrar qualquer coisa — abaixo, o que chega mais perto.'
        : '<b>Nenhum produto desta loja tem relação com o pedido.</b> Nenhuma nota passou de "irrelevante".') + '</span>';
    } else none.hidden = true;
    const cnt = $('jevcount'); cnt.hidden = false;
    cnt.innerHTML = `<b>${bons.length}</b> ${bons.length === 1 ? 'boa opção' : 'boas opções'}`;
    cnt.className = 'jev-badge ' + (bons.length ? 'info' : 'low');
    cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop');

    show.forEach((id, i) => {
      const p = BY.get(id); const sc = r.scores[id]; const lv = nivel(sc[0]);
      const pLv = sc[1 + lv];
      const pos = kwPos.get(id);
      const tag = etiqueta(lv, NIVEIS[lv]);
      tag.style.setProperty('--d', 120 + i * 70 + 'ms');
      list.append(el('li', { class: 'res l' + lv, 'data-id': id, 'data-score': sc[0], style: { animationDelay: i * 45 + 'ms' } }, [
        thumb(p, i + 1),
        el('div', { class: 'info' }, [
          el('div', { class: 'nm', text: p.nome, title: `${p.nome} — ${p.desc} (${depLabel(p)})` }),
          el('div', { class: 'meta' }, [
            priceEl(p.preco),
            el('span', { class: 'kwpos', html: pos ? `busca comum: ${pos}º` : 'busca comum: <b>não aparece</b>' }),
          ]),
        ]),
        el('div', { class: 'rel', title: `Nota ${fmt.num(sc[0], 2)} de 3 · irrelevante ${fmt.pct(sc[1])} · talvez ${fmt.pct(sc[2])} · boa ${fmt.pct(sc[3])} · perfeito ${fmt.pct(sc[4])}` }, [
          tag,
          el('span', { class: 'rel-foot' }, [el('span', { class: 'p', text: `${fmt.pct(pLv)} · nota ${fmt.num(sc[0], 1)}` })]),
        ]),
      ]));
    });

    // relevantes mas acima do orçamento
    const ob = $('overbudget');
    const over = max != null ? r.ordem.filter((id) => BY.get(id).preco > max && r.scores[id][0] >= 1.5).slice(0, 3) : [];
    if (over.length) {
      ob.hidden = false;
      ob.innerHTML = ICON_ACIMA + `Também combinam, mas passam de <b>${escapeHtml(brl(max))}</b>: ` + over.map((id) => `${escapeHtml(BY.get(id).nome)} (<b>${escapeHtml(brl(BY.get(id).preco))}</b>)`).join(' · ');
    } else ob.hidden = true;

    // o recibo: velocidade e custo
    const sp = $('speed');
    const lotes = r.lotes.map((l) => `lote ${l.i}: ${l.n} em ${fmt.ms(l.latency_ms)}`).join(' · ');
    if (r.cached) {
      sp.innerHTML = '<span class="rc-head">Recibo do Jev <em>cache</em></span>' +
        `<span class="rc-total"><span><b>${r.n_produtos}</b> produtos · resultado em cache</span></span>` +
        (r.metricas_originais !== false ? `<span class="rc-line"><span>na 1ª busca</span><i></i><b>${fmt.ms(r.latency_ms)} · ${fmt.usd(r.cost)}</b></span>` : '') +
        `<span class="rc-line"><span>agora</span><i></i><b>${fmt.ms(r._client_ms)} · US$ 0</b></span>`;
    } else {
      const perM = (r.cost || 0) * 1e6;
      sp.innerHTML = '<span class="rc-head">Recibo do Jev</span>' +
        `<span class="rc-total"><span><b>${r.n_produtos}</b> produtos avaliados em</span><b class="big">${fmt.ms(r.latency_ms)}</b></span>` +
        `<span class="rc-line rc-calls" title="${escapeHtml(lotes)}"><span>${r.n_chamadas} chamadas em paralelo · ${r.n_perguntas} perguntas</span></span>` +
        `<span class="rc-line"><span>custo</span><i></i><b>${fmt.usd(r.cost)}</b></span>` +
        (perM ? `<span class="rc-line"><span>1 milhão de buscas ≈</span><i></i><b>US$ ${fmt.int(perM)}</b></span>` : '');
    }
    sp.classList.remove('printed'); void sp.offsetWidth; sp.classList.add('printed');
    const cs = $('catstate'); cs.className = 'jev-badge good'; cs.textContent = r.cached ? 'avaliado (cache)' : `avaliado em ${fmt.ms(r.latency_ms)}`;
    if (r.parcial) { cs.className = 'jev-badge mid'; cs.textContent = `${r.n_produtos} de 120 avaliados`; toast(`O Jev não respondeu a tempo para ${r.parcial.produtos_sem_nota} produtos — mostrando os outros ${r.n_produtos}.`, 'err'); }
    ringBell();

    // coluna da palavra-chave ganha o veredito do Jev se for a mesma frase
    if (keyOf(kwState.q) === keyOf(r.q)) renderKw(r.q, false);
    window.__buscaLast = { q: r.q, cached: !!r.cached, latency_ms: r.latency_ms, client_ms: r._client_ms, cost: r.cost, at: performance.now(), top: show.slice(0, 5) }; // gancho para o teste e2e
  }

  function clearJev() {
    lastJev = null; lastJevKey = ''; seq++; inflight = ''; setBusy(false);
    $('jevlist').innerHTML = ''; $('jevph').hidden = false; $('jevnone').hidden = true; $('jevcount').hidden = true; $('overbudget').hidden = true;
    $('understood').innerHTML = UNDERSTOOD0;
    const cs = $('catstate'); cs.className = 'jev-badge violet'; cs.textContent = 'aguardando busca';
    const sp = $('speed'); sp.classList.remove('printed'); sp.innerHTML = speedEmpty;
    resetMosaic();
  }

  // ---------------- eventos ----------------
  const liveJev = debounce(() => { if (norm(qEl.value).length >= 3) runJev(); }, 550);
  function onType(fromChip) {
    const q = norm(qEl.value);
    if (!q) { renderKw('', false); clearJev(); return; }
    renderKw(q, !fromChip);
    $('jevlist').classList.toggle('stale', (!!lastJev && keyOf(q) !== lastJevKey) || !!inflight);
  }
  qEl.addEventListener('input', () => {
    document.querySelectorAll('#chips .jev-chip').forEach((c) => c.classList.toggle('active', c.dataset.q === qEl.value));
    onType(false); liveJev();
  });
  $('form').addEventListener('submit', (e) => { e.preventDefault(); onType(true); runJev(); });
  $('mtabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    $('layout').dataset.tab = b.dataset.tab;
    $('mtabs').querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== qEl && !e.metaKey && !e.ctrlKey) { e.preventDefault(); qEl.focus(); qEl.select(); }
  });

  boot();
  // fim da entrada orquestrada (ver busca.css): daqui em diante, só as reações às decisões do Jev se mexem
  setTimeout(() => document.documentElement.classList.remove('entrando'), 2200);
})();

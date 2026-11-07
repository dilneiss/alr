(function () {
  'use strict';
  const { fmt, el, escapeHtml: esc, bars, scoreMeter, toast, debounce } = JevKit;
  JevKit.mountTopbar({ title: 'Planilha Preditiva', tagline: 'Escreva o título da coluna — o Jev preenche a planilha' });

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.classList.add('pp-entrada');
  // Tintas do livro-razão: preenchimentos (marcas, barras, casas da escala) e, para texto, versões escuras com contraste AA no papel.
  const HEX = { verde: '#2F7F55', vermelho: '#C8372D', ambar: '#D4A020', cinza: '#A3A9A4', azul: '#3B6BB0', violeta: '#7B5AA6', rosa: '#B8487A', ciano: '#1F8A99', laranja: '#D46A2A', lima: '#8FA33A', teal: '#2A8A78', indigo: '#4B55B0', fucsia: '#A33B92' };
  const PALETAS = {
    risco: ['#3F8F5F', '#8FA33A', '#D4A020', '#D46A2A', '#C8372D'],
    bom: ['#C8372D', '#D46A2A', '#D4A020', '#8FA33A', '#3F8F5F'],
    quente: ['#A3A9A4', '#3B6BB0', '#7B5AA6', '#B8487A', '#C8372D'],
    neutro: ['#B9CBBE', '#8FB09C', '#5E927A', '#337A58', '#1E6B47'],
  };
  const PALETAS_TXT = {
    risco: ['#1E6B47', '#5B6B12', '#8A5A00', '#A5471A', '#B02E24'],
    bom: ['#B02E24', '#A5471A', '#8A5A00', '#5B6B12', '#1E6B47'],
    quente: ['#5E6660', '#234E8F', '#6A3D8F', '#A3285F', '#B02E24'],
    neutro: ['#5E6660', '#3F6F55', '#2F6B4F', '#1E6B47', '#17573A'],
  };
  const TINTA = { verde: '#1E6B47', vermelho: '#B02E24', ocre: '#8A5A00', grafite: '#6E756F' };
  const W = { rn: 44, noul: 150, score: 176, choice: 196, novo: 260, texto: 150, numero: 96, estrelas: 96, longoMin: 300 };
  // Ícones desenhados (sprite em index.html) no lugar de emoji.
  const ico = (nome, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${nome}"></use></svg>`;
  const icoEl = (nome, cls) => { const t = document.createElement('template'); t.innerHTML = ico(nome, cls); return t.content.firstChild; };
  const letra = (i) => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));
  const MSG_ORCAMENTO = 'O orçamento de demonstração do Jev acabou por hoje. Volte amanhã!';

  const S = { cfg: null, lim: null, sheets: {}, order: [], active: null, queue: [], running: null, colSeq: 0, impSeq: 0, panel: null, menu: null, typing: false, budgetOut: false, ticker: 0 };

  // ------------------------------------------------------------------ utilidades
  const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const limpaTitulo = (t) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, (S.lim && S.lim.titulo) || 80);
  const secs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(ms < 10000 ? 2 : 1).replace('.', ',') + ' s');
  const cur = () => S.sheets[S.active] || null;
  const isActive = (s) => S.active === s.id;
  const running = (col) => col.estado === 'interpretando' || col.estado === 'preenchendo';
  const pct = (p) => fmt.pct(p);
  const cor = (spec, i) => { const n = spec.curtos.length; const pal = PALETAS[spec.paleta] || PALETAS.neutro; return pal[n <= 1 ? 0 : Math.round((i * 4) / (n - 1))]; };
  const corT = (spec, i) => { const n = spec.curtos.length; const pal = PALETAS_TXT[spec.paleta] || PALETAS_TXT.neutro; return pal[n <= 1 ? 0 : Math.round((i * 4) / (n - 1))]; };
  const nivel = (spec, a) => Math.max(0, Math.min(spec.curtos.length - 1, Math.round(a.score)));

  function regra(t) {
    t = limpaTitulo(t);
    if (!t) return { erro: 'Digite um título para a nova coluna.' };
    if (t.endsWith('?')) {
      if (t.replace(/[?\s¿]/g, '').length < 2) return { erro: 'Escreva uma pergunta, por exemplo "Quer comprar?".' };
      return { regra: 'pergunta' };
    }
    const i = t.indexOf(':');
    if (i > 0) {
      const pre = t.slice(0, i).trim();
      const partes = t.slice(i + 1).split(/[,;|/]/).map((x) => x.trim()).filter((x) => x && !/^(outro|outros|outra|outras|nenhum|nenhuma)$/i.test(x));
      if (pre && partes.length >= 2) return { regra: 'categorias', prefixo: pre, opcoes: partes };
    }
    return { regra: 'modelo' };
  }
  function previewRegra(t) {
    if (!limpaTitulo(t)) return 'ex.: <b>Urgência</b> · <b>Quer comprar?</b> · <b>Tema: a, b, c</b>';
    const r = regra(t);
    if (r.erro) return esc(r.erro);
    if (r.regra === 'pergunta') return '→ coluna <b>sim/não</b> (chance de "sim")';
    if (r.regra === 'categorias') return `→ <b>${r.opcoes.length} categorias</b> + outro`;
    return '→ <b>o Jev escolhe o tipo</b> da coluna';
  }
  const iconeRegra = (t) => { const r = regra(t); return r.regra === 'pergunta' ? 'sn' : r.regra === 'categorias' ? 'cat' : 'bolt'; };

  function compactoNum(v) {
    if (typeof v !== 'number') return esc(v);
    if (v >= 1e6) return fmt.num(v / 1e6, 1) + ' mi';
    if (v >= 1e4) return fmt.num(v / 1e3, v >= 1e5 ? 0 : 1) + ' mil';
    return fmt.int(v);
  }

  // ------------------------------------------------------------------ carregamento
  function novaPlanilha(p) {
    return { id: p.id, nome: p.nome, icone: p.icone, descricao: p.descricao, colunas: p.colunas, sugestoes: p.sugestoes || [], n: p.n, linhas: null, ai: [], sort: null, filtros: [], busca: '', focus: null, importada: false, imp: null, _vis: [], _trs: new Map() };
  }

  async function carregar(s) {
    if (s.linhas) return;
    const d = await JevKit.api('/api/planilhas/' + encodeURIComponent(s.id), undefined, { silent: true });
    s.linhas = d.linhas.map((r, i) => ({ ...r, _rid: 'r' + (i + 1), _i: i }));
    s.n = s.linhas.length;
  }

  async function init() {
    try {
      S.cfg = await JevKit.api('/api/config', undefined, { silent: true });
    } catch (e) {
      $('status').innerHTML = `<div class="l1 erro">${ico('alerta', 'li')} Não consegui falar com o servidor. Recarregue a página.</div>`;
      document.documentElement.classList.remove('pp-entrada');
      return;
    }
    S.lim = S.cfg.limites;
    for (const p of S.cfg.planilhas) { S.sheets[p.id] = novaPlanilha(p); S.order.push(p.id); }
    const qp = new URLSearchParams(location.search);
    const first = S.sheets[qp.get('planilha')] ? qp.get('planilha') : S.order[0];
    await ativar(first);
    setTimeout(() => document.documentElement.classList.remove('pp-entrada'), 1500);
    const col = qp.get('coluna');
    if (col) setTimeout(() => criarColuna(col, { digitar: true }), 400);
  }

  async function ativar(id) {
    fecharMenu();
    if (id !== S.active) fecharPainel();
    if (id === '__import') {
      S.active = '__import';
      $('sheet').hidden = true; $('importView').hidden = false;
      renderTabs();
      return;
    }
    const s = S.sheets[id]; if (!s) return;
    S.active = id;
    $('sheet').hidden = false; $('importView').hidden = true;
    renderTabs();
    if (!s.linhas) {
      $('tbody').innerHTML = `<tr><td class="pp-carrega" colspan="${2 + s.colunas.length}"><span class="jev-spinner"></span>Abrindo a folha ${esc(s.nome)}…</td></tr>`;
      try { await carregar(s); } catch (e) { toast('Não consegui carregar a planilha. Tente de novo.', 'err'); return; }
      if (S.active !== id) return;
    }
    $('busca').value = s.busca;
    renderSheet(s);
    $('gridwrap').scrollTo({ top: 0, left: 0 });
  }

  // ------------------------------------------------------------------ abas
  function renderTabs() {
    const tabs = $('tabs'); tabs.innerHTML = '';
    // Abas-índice: cada planilha ganha a letra do divisor (A, B, C…) no lugar do ícone.
    S.order.forEach((id, i) => {
      const s = S.sheets[id];
      tabs.append(el('button', { class: 'pp-tab' + (S.active === id ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': String(S.active === id), 'data-id': id, onclick: () => ativar(id) }, [
        el('span', { class: 'ix', 'aria-hidden': 'true', text: letra(i) }), el('span', { class: 'nm', text: s.nome }), el('span', { class: 'n', text: fmt.int(s.n) }),
        s.ai.length ? el('span', { class: 'ai-n', title: `${s.ai.length} coluna(s) IA`, html: ico('bolt') + s.ai.length }) : null,
        s.importada ? el('span', { class: 'x', title: 'Fechar esta planilha', role: 'button', 'aria-label': 'Fechar planilha', html: ico('x'), onclick: (e) => { e.stopPropagation(); fecharImportada(id); } }) : null,
      ]));
    });
    tabs.append(el('button', { class: 'pp-tab imp' + (S.active === '__import' ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': String(S.active === '__import'), 'data-id': '__import', onclick: () => ativar('__import') }, [el('span', { class: 'ix', 'aria-hidden': 'true', html: ico('subir') }), el('span', { class: 'nm', text: 'Importar CSV' })]));
  }

  function fecharImportada(id) {
    const s = S.sheets[id]; if (!s) return;
    s.ai.forEach((c) => { if (c.ctrl) c.ctrl.abort(); });
    S.queue = S.queue.filter((j) => j.sid !== id);
    delete S.sheets[id]; S.order = S.order.filter((x) => x !== id);
    if (S.active === id) ativar(S.order[0]); else renderTabs();
  }

  // ------------------------------------------------------------------ planilha
  function renderSheet(s) {
    renderSugs(s); renderStatus(s); renderFiltros(s); renderHead(s); renderBody(s); ajustaLarguras(s);
  }

  function renderSugs(s) {
    const box = $('sugs'); box.innerHTML = '';
    box.append(el('span', { class: 'pp-lbl', text: 'Experimente:' }));
    for (const t of s.sugestoes) {
      const feita = s.ai.some((c) => norm(c.titulo) === norm(t));
      box.append(el('button', { class: 'jev-chip' + (feita ? ' done' : ''), type: 'button', 'data-sug': t, title: feita ? 'Esta coluna já foi criada' : 'Criar esta coluna', onclick: () => criarColuna(t, { digitar: true }) }, [icoEl(iconeRegra(t), 'k'), el('span', { class: 't', text: t }), feita ? icoEl('tick', 'ok') : null]));
    }
  }

  // ---------- status / contador ao vivo ----------
  function linhaTipo(col) {
    const t = `<span class="em">«${esc(col.titulo)}»</span>`;
    if (col.estado === 'fila') return `${ico('lapis', 'li')} ${t} está na fila…`;
    if (col.estado === 'interpretando' || !col.spec) return `<span class="jev-spinner spin"></span> O Jev está entendendo o que ${t} quer dizer…`;
    const sp = col.spec;
    if (sp.fonte === 'pergunta') return `${ico('sn', 'li')} ${t} → coluna <b>sim/não</b> <span class="dim">(o título termina com "?")</span> · a % é a chance de "sim"`;
    if (sp.fonte === 'categorias') return `${ico('cat', 'li')} ${t} → <b>categorias</b>: ${sp.opcoes.map(esc).join(' · ')}`;
    if (col.interp && (!col.modelo || col.modelo === col.interp.modelo)) return `${ico('bolt', 'li')} O Jev entendeu ${t} como: <b>${esc(sp.rotulo)}</b> — <b>${pct(col.interp.confianca)}</b> <span class="dim">· decidido em ${fmt.ms(col.interp.latency_ms)}</span>`;
    return `${ico('troca', 'li')} ${t} → <b>${esc(sp.rotulo)}</b> <span class="dim">(tipo escolhido por você)</span>`;
  }

  function linhaNumeros(s, col) {
    const st = col.stats || {};
    if (col.estado === 'fila') return '<span>aguardando a coluna anterior terminar…</span>';
    if (col.estado === 'erro') return `<span class="erro">${ico('alerta')} ${esc(col.erroMsg || 'Não foi possível preencher esta coluna.')}</span>`;
    const n = st.n || s.n;
    const feitas = Object.keys(col.res).length;
    if (col.estado === 'interpretando' || (running(col) && !st.tFill)) return `<span>lendo o título e a planilha para escolher o tipo de coluna…</span>`;
    if (running(col)) {
      const ms = st.tFill ? performance.now() - st.tFill : 0;
      return `<span class="big"><b data-live="linhas">${fmt.int(feitas)}</b> / ${fmt.int(n)} linhas</span><span>${ico('relogio')}<b data-live="tempo">${secs(ms)}</b></span>` +
        (st.lotesTotal ? `<span><b>${st.done || 0}</b>/${st.lotesTotal} lotes · ${st.conc} chamadas em paralelo</span>` : '');
    }
    const ms = st.tEnd && st.tFill ? st.tEnd - st.tFill : st.srvMs;
    const custo = st.cost || 0;
    const dezmil = feitas ? (custo / feitas) * 10000 : 0;
    const falhas = n - feitas;
    return `<span class="big"><b>${fmt.int(feitas)} linhas em ${secs(ms)}</b></span>` +
      `<span><b>${fmt.int(feitas)}</b> decisões</span>` +
      `<span><b>${st.chamadas || 0}</b> chamadas em paralelo (${st.tamanho || '—'} linhas cada)</span>` +
      `<span class="money">custo <b>${fmt.usd(custo)}</b></span>` +
      (dezmil ? `<span class="money">10 mil linhas custariam <b>${fmt.usd(dezmil)}</b></span>` : '') +
      (falhas > 0 ? `<span class="erro">${fmt.int(falhas)} linha(s) falharam</span>` : '');
  }

  function renderStatus(s) {
    const st = $('status');
    const col = s.ai.find((c) => c.id === s.focus) || s.ai[s.ai.length - 1];
    st.innerHTML = '';
    if (S.budgetOut) {
      st.className = 'pp-status';
      st.append(el('div', { class: 'l1 erro', html: `${ico('alerta', 'li')} ${esc(MSG_ORCAMENTO)}` }));
      return;
    }
    if (!col) {
      st.className = 'pp-status idle'; st.dataset.state = 'idle'; delete st.dataset.col;
      st.append(el('div', { class: 'l1', html: `<b>Dê um título a uma nova coluna</b> no cabeçalho <span class="em">${ico('lapis')} Nova coluna IA</span> (à direita da tabela) — ou clique numa sugestão. O Jev lê as <b>${fmt.int(s.n)} linhas</b> e preenche tudo de uma vez.` }));
      const t = s.sugestoes[0];
      if (t) st.append(el('div', { class: 'actions' }, [el('button', { class: 'jev-btn jev-btn--primary cta', id: 'cta', type: 'button', onclick: () => criarColuna(t, { digitar: true }) }, [icoEl('bolt'), `Preencher «${t}»`])]));
      return;
    }
    st.className = 'pp-status';
    st.dataset.state = col.estado; st.dataset.col = col.id;
    const left = el('div', {}, [el('div', { class: 'l1', html: linhaTipo(col) }), el('div', { class: 'l2', html: linhaNumeros(s, col) })]);
    st.append(left);
    const actions = el('div', { class: 'actions' });
    if (col.spec && !running(col) && col.estado !== 'fila') actions.append(seletorTipo(s, col));
    if (col.estado === 'erro' || col.estado === 'parcial') actions.append(el('button', { class: 'jev-btn jev-btn--sm', type: 'button', onclick: () => refazer(s, col) }, [icoEl('refaz'), 'Tentar de novo']));
    if (actions.childNodes.length) st.append(actions);
    const prog = el('div', { class: 'prog' + (running(col) ? '' : ' done') });
    const n = (col.stats && col.stats.n) || s.n;
    prog.style.width = (running(col) || col.estado === 'pronto' ? Math.round((Object.keys(col.res).length / Math.max(1, n)) * 100) : 0) + '%';
    st.append(prog);
  }

  function seletorTipo(s, col) {
    const sel = el('select', { class: 'jev-select tipo-sel', id: 'tipoSel', title: 'Trocar o tipo desta coluna', 'aria-label': 'Tipo da coluna' });
    const atual = col.modelo || (col.spec.fonte === 'modelo' ? col.spec.modelo : '__regra');
    const add = (parent, value, label) => parent.append(el('option', { value, selected: value === atual ? true : null }, [label]));
    const interp = col.interp || col.interpOriginal;
    const r = regra(col.titulo);
    if (r.regra !== 'modelo') {
      const g = el('optgroup', { label: 'Regra do título' });
      add(g, '__regra', r.regra === 'pergunta' ? 'Sim/não (o título termina com "?")' : `Categorias: ${r.opcoes.join(', ')}`);
      sel.append(g);
    }
    if (interp) {
      const g = el('optgroup', { label: 'O Jev sugeriu' });
      interp.ranking.filter((x) => x.p >= 0.005).slice(0, 5).forEach((x) => add(g, x.id, `${x.rotulo} — ${pct(x.p)}`));
      sel.append(g);
    }
    const g = el('optgroup', { label: 'Todos os tipos' });
    const nome = r.regra === 'categorias' ? r.prefixo : col.titulo.replace(/\?+$/, '');
    for (const m of S.cfg.modelos) if (!(interp && interp.ranking.slice(0, 5).some((x) => x.id === m.id && x.p >= 0.005))) add(g, m.id, m.rotulo.replaceAll('{t}', nome));
    sel.append(g);
    sel.addEventListener('change', () => trocarTipo(s, col, sel.value));
    return sel;
  }

  // ---------- filtros ----------
  function renderFiltros(s) {
    const box = $('filters');
    const ativos = s.filtros.filter((f) => s.ai.some((c) => c.id === f.col));
    s.filtros = ativos;
    if (!ativos.length && !s.busca) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false; box.innerHTML = '';
    box.append(el('span', { class: 'pp-lbl', text: 'Filtros:' }));
    for (const f of ativos) box.append(el('button', { class: 'jev-chip', type: 'button', title: 'Remover filtro', onclick: () => { s.filtros = s.filtros.filter((x) => x !== f); atualizaVista(s); } }, [f.label, icoEl('x', 'rm')]));
    if (s.busca) box.append(el('button', { class: 'jev-chip', type: 'button', title: 'Limpar busca', onclick: () => { s.busca = ''; $('busca').value = ''; atualizaVista(s); } }, [icoEl('busca'), `"${s.busca}"`, icoEl('x', 'rm')]));
    const vis = visiveis(s).length;
    box.append(el('span', { html: `Mostrando <b>${fmt.int(vis)}</b> de <b>${fmt.int(s.n)}</b> linhas` }));
    if (ativos.length + (s.busca ? 1 : 0) > 1) box.append(el('button', { class: 'jev-btn jev-btn--sm jev-btn--ghost', type: 'button', onclick: () => { s.filtros = []; s.busca = ''; $('busca').value = ''; atualizaVista(s); } }, ['Limpar tudo']));
  }

  function aplicaFiltro(s, col, f) {
    s.filtros = s.filtros.filter((x) => x.col !== col.id);
    s.filtros.push({ col: col.id, ...f });
    atualizaVista(s);
  }

  function passa(col, a, f) {
    if (!a) return false;
    if (col.spec.kind === 'noul') return f.op === 'gte' ? a.noul >= f.v : f.op === 'lte' ? a.noul <= f.v : a.noul > 0.3 && a.noul < 0.7;
    if (col.spec.kind === 'score') { const lv = nivel(col.spec, a); return f.op === 'gte' ? lv >= f.v : lv === f.v; }
    return a.choice === f.v;
  }

  function visiveis(s) {
    let rows = s.linhas || [];
    const q = norm(s.busca);
    if (q) rows = rows.filter((r) => s.colunas.some((c) => norm(r[c.key]).includes(q)));
    for (const f of s.filtros) {
      const col = s.ai.find((c) => c.id === f.col);
      if (col && col.spec) rows = rows.filter((r) => passa(col, col.res[r._rid], f));
    }
    if (s.sort) {
      const vals = new Map(rows.map((r) => [r, valorOrdem(s, s.sort.key, r)]));
      const dir = s.sort.dir;
      rows = [...rows].sort((a, b) => {
        const x = vals.get(a), y = vals.get(b);
        if (x == null && y == null) return a._i - b._i;
        if (x == null) return 1; if (y == null) return -1;
        if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y), 'pt-BR') * dir || a._i - b._i;
        return (x - y) * dir || a._i - b._i;
      });
    }
    return rows;
  }

  function valorOrdem(s, key, r) {
    if (key.startsWith('src:')) {
      const v = r[key.slice(4)];
      if (typeof v === 'number') return v;
      const num = Number(String(v).replace(/\./g, '').replace(',', '.'));
      return v === '' || v == null ? null : (isFinite(num) && /^[\s\d.,-]+$/.test(String(v)) ? num : norm(v));
    }
    const col = s.ai.find((c) => 'ai:' + c.id === key);
    const a = col && col.res[r._rid];
    if (!a || !col.spec) return null;
    if (col.spec.kind === 'noul') return a.noul;
    if (col.spec.kind === 'score') return a.score;
    const idx = col.spec.opcoes.indexOf(a.choice);
    return (idx < 0 ? 99 : idx) + (1 - (a.confidence || 0)) * 0.5;
  }

  function alternaOrdem(s, key) {
    fecharMenu();
    const col = key.startsWith('ai:') && s.ai.find((c) => 'ai:' + c.id === key);
    const inicial = col && col.spec && col.spec.kind !== 'choice' ? -1 : 1;
    if (!s.sort || s.sort.key !== key) s.sort = { key, dir: inicial };
    else if (s.sort.dir === inicial) s.sort.dir = -inicial;
    else s.sort = null;
    renderHead(s); renderBody(s); ajustaLarguras(s);
  }
  const indOrdem = (s, key) => (s.sort && s.sort.key === key ? el('span', { class: 'sorti', text: s.sort.dir < 0 ? '▼' : '▲' }) : null);

  function atualizaVista(s) { renderFiltros(s); renderBody(s); renderHead(s); ajustaLarguras(s); if (S.panel) renderPainel(); }

  // ---------- grade ----------
  function largura(s, c) { return c.w || W[c.tipo] || W.texto; }
  function larguraIA(col) { return col.spec ? W[col.spec.kind] : W.score; }

  function ajustaLarguras(s) {
    if (!isActive(s)) return;
    const wrap = $('gridwrap');
    const disp = wrap.clientWidth - 2;
    let fixo = W.rn + W.novo;
    s.colunas.forEach((c) => { if (c.tipo !== 'longo') fixo += largura(s, c); });
    s.ai.forEach((c) => { fixo += larguraIA(c); });
    const nLongo = s.colunas.filter((c) => c.tipo === 'longo').length || 0;
    const minL = window.innerWidth < 760 ? 220 : W.longoMin;
    const longo = nLongo ? Math.max(minL, Math.floor((disp - fixo) / nLongo)) : 0;
    const ws = [W.rn, ...s.colunas.map((c) => (c.tipo === 'longo' ? longo : largura(s, c))), ...s.ai.map(larguraIA), W.novo];
    let total = ws.reduce((a, b) => a + b, 0);
    if (total < disp) { ws[ws.length - 1] += disp - total; total = disp; }
    $('cols').replaceChildren(...ws.map((w) => el('col', { style: { width: w + 'px' } })));
    $('grid').style.width = total + 'px';
  }

  function renderHead(s) {
    const old = $('newcol');
    const tinhaFoco = old && document.activeElement === old;
    const valor = old ? old.value : '';
    const tr = el('tr');
    tr.append(el('th', { class: 'rn', text: '#' }));
    s.colunas.forEach((c, j) => {
      const key = 'src:' + c.key;
      tr.append(el('th', { class: 'src' + (j === 0 ? ' first' : '') + (c.tipo === 'numero' || c.tipo === 'estrelas' ? ' num' : ''), title: `Ordenar por ${c.label}`, 'data-key': c.key, onclick: () => alternaOrdem(s, key) }, [el('span', { class: 'cl', 'aria-hidden': 'true', text: letra(j) }), c.label, indOrdem(s, key)]));
    });
    for (const col of s.ai) tr.append(cabecalhoIA(s, col));
    tr.append(cabecalhoNovo(s, valor));
    $('thead').replaceChildren(tr);
    if (tinhaFoco && $('newcol')) { const i = $('newcol'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  function linhaTipoCab(s, col) {
    if (col.estado === 'fila') return [el('span', { text: 'na fila…' })];
    if (col.estado === 'interpretando' || !col.spec) return [el('span', { class: 'jev-spinner spin' }), el('span', { text: 'entendendo o título…' })];
    const sp = col.spec;
    const vals = Object.values(col.res);
    const partes = [el('span', { class: 'ty', text: sp.fonte === 'pergunta' ? 'sim/não' : sp.fonte === 'categorias' ? `${sp.opcoes.length} categorias` : sp.curto })];
    if (running(col)) partes.push(el('span', { text: `· ${fmt.int(vals.length)}/${fmt.int((col.stats && col.stats.n) || s.n)}` }));
    else if (col.estado === 'erro') partes.push(el('span', { class: 'cell-err', text: '· falhou' }));
    else if (vals.length) {
      if (sp.kind === 'noul') partes.push(el('span', { text: `· ${vals.filter((a) => a.noul >= 0.7).length} ✓ · ${vals.filter((a) => a.noul > 0.3 && a.noul < 0.7).length} ?` }));
      else if (sp.kind === 'score') { const m = vals.reduce((x, a) => x + a.score, 0) / vals.length; partes.push(el('span', { text: `· média ${fmt.num(m + (sp.base || 0), 1)}` })); }
      else { const cont = {}; vals.forEach((a) => { cont[a.choice] = (cont[a.choice] || 0) + 1; }); const topo = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]; if (topo && sp.fonte !== 'categorias') partes.push(el('span', { title: `mais comum: ${topo[0]} (${topo[1]})`, text: `· ${topo[0]}` })); }
    }
    return partes;
  }

  function faixas(s, col) {
    // Distribuição da coluna (todas as linhas): [{label, n, cor, filtro}]
    const sp = col.spec; const vals = Object.values(col.res);
    if (!sp || !vals.length) return [];
    if (sp.kind === 'noul') {
      const sim = vals.filter((a) => a.noul >= 0.7).length, nao = vals.filter((a) => a.noul <= 0.3).length, meio = vals.length - sim - nao;
      return [
        { label: 'sim (≥ 70%)', n: sim, cor: sp.alerta ? HEX.vermelho : HEX.verde, filtro: { op: 'gte', v: 0.7, label: `${tituloCurto(col)} ≥ 70%` } },
        { label: 'incerto', n: meio, cor: HEX.ambar, filtro: { op: 'mid', v: 0, label: `${tituloCurto(col)} incerto (30–70%)` } },
        { label: 'não (≤ 30%)', n: nao, cor: sp.alerta ? '#9CC7AE' : '#CDD2CC', filtro: { op: 'lte', v: 0.3, label: `${tituloCurto(col)} ≤ 30%` } },
      ];
    }
    if (sp.kind === 'score') {
      return sp.curtos.map((c, i) => ({ label: c, n: vals.filter((a) => nivel(sp, a) === i).length, cor: cor(sp, i), filtro: { op: 'eq', v: i, label: `${tituloCurto(col)} = ${c}` } }));
    }
    return sp.opcoes.map((o) => ({ label: o, n: vals.filter((a) => a.choice === o).length, cor: HEX[sp.cores[o]] || HEX.cinza, filtro: { op: 'eq', v: o, label: `${tituloCurto(col)} = ${o}` } }));
  }

  function barraDist(s, col) {
    const fx = faixas(s, col).filter((f) => f.n > 0);
    const d = el('div', { class: 'dist' + (fx.length ? '' : ' empty') });
    for (const f of fx) {
      d.append(el('span', { style: { flexGrow: String(f.n), background: f.cor }, title: `${f.label}: ${f.n} linha(s) — clique para filtrar`, onclick: (e) => { e.stopPropagation(); aplicaFiltro(s, col, f.filtro); } }));
    }
    return d;
  }

  function tituloCurto(col) { const r = regra(col.titulo); return r.regra === 'categorias' ? r.prefixo : col.titulo; }

  function cabecalhoIA(s, col) {
    const th = el('th', { class: 'ai' + (running(col) ? ' run' : '') + (col.estado === 'erro' ? ' err' : ''), 'data-col': col.id, 'data-state': col.estado, 'data-kind': col.spec ? col.spec.kind : '', 'data-modelo': col.spec ? (col.spec.modelo || col.spec.fonte) : '' });
    th.append(el('span', { class: 'cl', 'aria-hidden': 'true', text: letra(s.colunas.length + s.ai.indexOf(col)) }), el('div', { class: 'aih' }, [
      el('div', { class: 'aih-top' }, [
        el('span', { class: 'aih-title', title: `${col.titulo} — clique para ordenar`, onclick: () => alternaOrdem(s, 'ai:' + col.id) }, [icoEl('bolt', 'spark'), tituloCurto(col), indOrdem(s, 'ai:' + col.id)]),
        el('button', { class: 'aih-menu', type: 'button', title: 'Opções da coluna (ordenar, filtrar, trocar tipo…)', 'aria-label': `Opções da coluna ${col.titulo}`, html: ico('mais'), onclick: (e) => { e.stopPropagation(); abrirMenu(e.currentTarget, s, col); } }),
      ]),
      el('div', { class: 'aih-type' }, linhaTipoCab(s, col)),
      barraDist(s, col),
    ]));
    return th;
  }

  function atualizaCabecalhoIA(s, col) {
    if (!isActive(s)) return;
    const th = $('thead').querySelector(`th[data-col="${col.id}"]`);
    if (th) th.replaceWith(cabecalhoIA(s, col));
  }

  function cabecalhoNovo(s, valor) {
    const th = el('th', { class: 'new' });
    const max = (S.lim && S.lim.colunasIA) || 8;
    if (s.ai.length >= max) {
      th.append(el('div', { class: 'newhint', style: { height: 'auto', whiteSpace: 'normal' }, text: `Limite de ${max} colunas IA nesta planilha. Remova uma (⋯) para criar outra.` }));
      return th;
    }
    const inp = el('input', { id: 'newcol', type: 'text', maxlength: String((S.lim && S.lim.titulo) || 80), placeholder: 'Nova coluna IA…', 'aria-label': 'Título da nova coluna IA', autocomplete: 'off', spellcheck: 'false' });
    inp.value = valor || '';
    const hint = el('div', { class: 'newhint', id: 'newhint', html: previewRegra(inp.value) });
    inp.addEventListener('input', () => { hint.innerHTML = previewRegra(inp.value); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (S.typing) return;
        if (criarColuna(inp.value)) { const i = $('newcol'); if (i) { i.value = ''; const h = $('newhint'); if (h) h.innerHTML = previewRegra(''); } }
      } else if (e.key === 'Escape') { inp.value = ''; hint.innerHTML = previewRegra(''); inp.blur(); }
    });
    th.append(el('div', { class: 'newcol' + (s.ai.length ? '' : ' pulse') }, [icoEl('lapis', 'plus'), inp, el('span', { class: 'enter', text: 'Enter ↵' })]), hint);
    return th;
  }

  function celulaFonte(c, v, primeira) {
    const cls = [];
    if (primeira) cls.push('first');
    if (c.tipo === 'numero') {
      cls.push('num');
      const txt = c.key === 'seguidores' ? compactoNum(v) : c.key === 'anos' && typeof v === 'number' ? `${v} ${v === 1 ? 'ano' : 'anos'}` : esc(v);
      return `<td class="${cls.join(' ')}">${txt}</td>`;
    }
    if (c.tipo === 'estrelas') {
      const n = Math.max(0, Math.min(5, Math.round(Number(v) || 0)));
      return `<td class="num"><span class="stars" title="${n} de 5 estrelas">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span></td>`;
    }
    if (c.tipo === 'longo') cls.push('longo');
    const s = String(v == null ? '' : v);
    return `<td class="${cls.join(' ')}"${s.length > 18 ? ` title="${esc(s)}"` : ''}>${esc(s) || '<span class="muted-cell">—</span>'}</td>`;
  }

  function valorDado(col, a) {
    if (!a) return '';
    if (a.type === 'noul') return String(a.noul);
    if (a.type === 'score') return String(a.score);
    return a.choice;
  }

  // Célula do Jev = lançamento (a lápis → a tinta) + carimbo com a probabilidade que o sustenta.
  function celulaIA(col, a, rid) {
    if (!a) {
      if (col.falhas && col.falhas[rid]) return `<span class="cell-err" title="${esc(col.falhas[rid])}">${ico('alerta')}falhou</span>`;
      if (col.estado === 'fila') return '<span class="sk q"></span>';
      if (running(col)) return '<span class="sk"></span>';
      return '<span class="muted-cell">—</span>';
    }
    const sp = col.spec;
    if (a.type === 'noul') {
      const p = a.noul; const cls = p >= 0.7 ? 'yes' : p <= 0.3 ? 'no' : 'maybe';
      const marca = cls === 'yes' ? ico('tick', 'mk') : cls === 'no' ? ico('cross', 'mk') : '<b class="q">?</b>';
      return `<span class="cel ${cls}${sp.alerta ? ' alert' : ''}" title="chance de &quot;sim&quot;: ${pct(p)}"><span class="v">${marca}<span class="nl-t">${cls === 'yes' ? 'sim' : cls === 'no' ? 'não' : 'incerto'}</span></span><span class="stamp">${pct(p)}</span></span>`;
    }
    if (a.type === 'score') {
      const lv = nivel(sp, a); const n = sp.curtos.length;
      const casas = Array.from({ length: Math.max(1, n - 1) }, (_, i) => `<i style="--f:${Math.max(0, Math.min(1, a.score - i)).toFixed(2)}"></i>`).join('');
      const pl = a.probabilities && a.probabilities[String(lv)] != null ? a.probabilities[String(lv)] : a.confidence;
      return `<span class="cel sc" style="--c:${cor(sp, lv)}" title="${esc(sp.niveis ? sp.niveis[lv] : sp.curtos[lv])} · ${fmt.num(a.score + (sp.base || 0), 2)}"><span class="v"><span class="sc-l">${esc(sp.curtos[lv])}</span><span class="sc-q" aria-hidden="true">${casas}</span></span>${pl != null ? `<span class="stamp${pl < 0.6 ? ' low' : ''}">${pct(pl)}</span>` : ''}</span>`;
    }
    const c = a.choice; const conf = a.confidence;
    return `<span class="cel ch" title="${esc(c)} · confiança ${pct(conf)}"><span class="v"><span class="tag t-${esc(sp.cores[c] || 'cinza')}"><span>${esc(c)}</span></span></span>${conf != null ? `<span class="stamp${conf < 0.6 ? ' low' : ''}">${pct(conf)}</span>` : ''}</span>`;
  }

  function renderBody(s) {
    if (!isActive(s) || !s.linhas) return;
    const rows = visiveis(s);
    s._vis = rows;
    const selRid = S.panel && S.panel.sid === s.id ? S.panel.rid : null;
    let h = '';
    for (const r of rows) {
      h += `<tr data-rid="${r._rid}"${r._rid === selRid ? ' class="sel"' : ''}><td class="rn">${r._i + 1}</td>`;
      s.colunas.forEach((c, j) => { h += celulaFonte(c, r[c.key], j === 0); });
      for (const col of s.ai) { const a = col.res[r._rid]; const v = valorDado(col, a); h += `<td class="ai" data-col="${col.id}"${v !== '' ? ` data-v="${esc(v)}"` : ''}>${celulaIA(col, a, r._rid)}</td>`; }
      h += '<td class="new"></td></tr>';
    }
    if (!rows.length) h = `<tr><td class="pp-vazio" colspan="${2 + s.colunas.length + s.ai.length}">${ico('funil')}<p>Nenhuma linha com esses filtros.</p><button class="jev-btn jev-btn--sm" type="button" data-acao="limpar-filtros">${ico('x')}Limpar filtros</button></td></tr>`;
    const tb = $('tbody');
    tb.innerHTML = h;
    s._trs = new Map();
    for (const tr of tb.rows) if (tr.dataset.rid) s._trs.set(tr.dataset.rid, tr);
  }

  // Atualiza só as células de um lote (sem redesenhar a tabela) — é aqui que a "onda" acontece.
  function atualizaCelulas(s, col, ids, animar) {
    if (!isActive(s)) return;
    const idx = 1 + s.colunas.length + s.ai.indexOf(col);
    if (idx <= s.colunas.length) return;
    const pos = new Map(s._vis.map((r, i) => [r._rid, i]));
    const alvo = ids.filter((id) => s._trs.has(id)).sort((a, b) => pos.get(a) - pos.get(b));
    alvo.forEach((id, k) => {
      const td = s._trs.get(id).cells[idx];
      if (!td) return;
      const a = col.res[id]; const v = valorDado(col, a);
      if (v !== '') td.dataset.v = v; else delete td.dataset.v;
      td.innerHTML = celulaIA(col, a, id);
      if (animar && a) { td.classList.remove('pop'); td.style.setProperty('--d', Math.min(k * 24, 600) + 'ms'); void td.offsetWidth; td.classList.add('pop'); }
    });
  }

  // ------------------------------------------------------------------ criar / preencher colunas
  function criarColuna(titulo, opts) {
    opts = opts || {};
    const s = cur();
    if (!s || !s.linhas) { toast('Abra uma planilha primeiro.'); return false; }
    const t = limpaTitulo(titulo);
    const r = regra(t);
    if (r.erro) { toast(r.erro); return false; }
    const max = (S.lim && S.lim.colunasIA) || 8;
    if (s.ai.length >= max) { toast(`Limite de ${max} colunas IA por planilha. Remova uma para criar outra.`); return false; }
    const dup = s.ai.find((c) => norm(c.titulo) === norm(t));
    if (dup) { destacaColuna(s, dup); toast('Essa coluna já existe — use ⋯ › Refazer para rodar de novo.'); return false; }
    if (S.budgetOut) { toast(MSG_ORCAMENTO, 'err'); return false; }
    if (opts.digitar) {
      if (S.typing) return false;
      digitar(t).then(() => { if (cur() === s) criarColuna(t); });
      return true;
    }
    adicionaColuna(s, t);
    return true;
  }

  async function digitar(texto) {
    S.typing = true;
    try {
      let inp = $('newcol');
      if (!inp) return;
      $('gridwrap').scrollTo({ left: $('gridwrap').scrollWidth, behavior: 'smooth' });
      await sleep(window.innerWidth < 760 ? 260 : 0);
      inp.focus(); inp.value = '';
      const chars = Array.from(texto);
      const passo = Math.max(12, Math.min(34, 520 / chars.length));
      for (const ch of chars) {
        inp = $('newcol'); if (!inp) return;
        inp.value += ch; inp.dispatchEvent(new Event('input'));
        await sleep(passo);
      }
      await sleep(160);
      inp = $('newcol'); if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
    } finally { S.typing = false; }
  }

  function adicionaColuna(s, titulo) {
    const col = { id: 'c' + (++S.colSeq), titulo, spec: null, interp: null, interpOriginal: null, modelo: null, estado: 'fila', res: {}, lote: {}, lotes: [], falhas: {}, stats: null, ctrl: null };
    s.ai.push(col); s.focus = col.id;
    renderTabs(); renderSugs(s); renderStatus(s); renderHead(s); renderBody(s); ajustaLarguras(s);
    requestAnimationFrame(() => mostraColuna(col));
    enfileira(s, col);
  }

  // Rola a grade para a coluna nova: no desktop mostra também o campo "+ Nova coluna IA";
  // na tela estreita deixa a coluna IA na borda direita, com um pedaço do texto da linha à esquerda.
  function mostraColuna(col) {
    const w = $('gridwrap'); const th = $('thead').querySelector(`th[data-col="${col.id}"]`);
    if (!th) return;
    if (w.clientWidth >= 900) w.scrollTo({ left: w.scrollWidth, behavior: 'smooth' });
    else w.scrollTo({ left: Math.max(0, th.offsetLeft + th.offsetWidth - w.clientWidth + 4), behavior: 'smooth' });
  }

  function enfileira(s, col) {
    S.queue = S.queue.filter((j) => j.cid !== col.id);
    S.queue.push({ sid: s.id, cid: col.id });
    bombeia();
  }

  async function bombeia() {
    if (S.running || !S.queue.length) return;
    const job = S.queue.shift();
    const s = S.sheets[job.sid]; const col = s && s.ai.find((c) => c.id === job.cid);
    if (!col) return bombeia();
    S.running = job;
    try { await preenche(s, col); } catch (e) { console.warn('[planilha] preenchimento', e); falha(s, col, 'Falha inesperada ao preencher a coluna.'); }
    finally { S.running = null; bombeia(); }
  }

  function falha(s, col, msg, code) {
    col.estado = 'erro'; col.erroMsg = msg;
    if (code === 'budget_exhausted') S.budgetOut = true;
    if (isActive(s)) { atualizaCabecalhoIA(s, col); renderStatus(s); atualizaCelulas(s, col, (s.linhas || []).map((r) => r._rid), false); }
  }

  async function preenche(s, col) {
    const ctrl = new AbortController(); col.ctrl = ctrl;
    col.res = {}; col.falhas = {}; col.lote = {}; col.lotes = []; col.erroMsg = null;
    col.estado = col.modelo || regra(col.titulo).regra !== 'modelo' ? 'preenchendo' : 'interpretando';
    col.spec = null;
    col.stats = { n: s.n, done: 0, cost: 0, t0: performance.now(), tFill: null, tEnd: null };
    s.focus = col.id;
    if (isActive(s)) { atualizaCabecalhoIA(s, col); renderStatus(s); atualizaCelulas(s, col, s.linhas.map((r) => r._rid), false); }
    const body = { titulo: col.titulo };
    if (col.modelo) body.modelo = col.modelo;
    if (s.importada) body.importada = s.imp; else body.planilha = s.id;

    let res;
    try {
      res = await fetch('/api/coluna', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (e) {
      col.ctrl = null;
      if (ctrl.signal.aborted) return;
      falha(s, col, 'Sem conexão com o servidor. Tente de novo.'); toast('Sem conexão com o servidor. Tente de novo.', 'err');
      return;
    }
    if (!res.ok) {
      col.ctrl = null;
      let j = {}; try { j = await res.json(); } catch (e) { /* corpo vazio */ }
      const msg = j.code === 'budget_exhausted' ? MSG_ORCAMENTO : (j.error || `Erro ${res.status}`);
      falha(s, col, msg, j.code); toast(msg, 'err');
      if (S.budgetOut && isActive(s)) renderStatus(s);
      return;
    }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.trim()) evento(s, col, JSON.parse(line));
        }
      }
      if (buf.trim()) evento(s, col, JSON.parse(buf));
    } catch (e) {
      if (ctrl.signal.aborted) return;
      falha(s, col, 'A conexão caiu no meio do preenchimento. Tente de novo.');
      return;
    } finally { col.ctrl = null; }
    if (running(col)) falha(s, col, 'O preenchimento terminou sem resposta completa. Tente de novo.');
  }

  function evento(s, col, ev) {
    const ativa = isActive(s);
    if (ev.t === 'tipo') {
      col.spec = ev.spec;
      if (ev.interp) { col.interp = ev.interp; if (!col.modelo) col.interpOriginal = ev.interp; }
      else if (!col.modelo) col.interp = null;
      if (ev._jev) JevKit.record(ev._jev, 'tipo da coluna');
      col.estado = 'preenchendo';
      if (ativa) { atualizaCabecalhoIA(s, col); renderStatus(s); ajustaLarguras(s); }
    } else if (ev.t === 'plano') {
      Object.assign(col.stats, { n: ev.n, lotesTotal: ev.lotes, tamanho: ev.tamanho, conc: ev.concorrencia, tFill: performance.now() });
      tique();
      if (ativa) renderStatus(s);
    } else if (ev.t === 'lote') {
      Object.assign(col.res, ev.res);
      ev.ids.forEach((id) => { col.lote[id] = ev.i; });
      col.lotes[ev.i] = { n: ev.ids.length, ms: ev.latency_ms, cost: ev.cost };
      col.stats.done++; col.stats.cost += ev.cost || 0;
      if (ev._jev) JevKit.record(ev._jev, ev._jev.label);
      if (ativa) { atualizaCelulas(s, col, ev.ids, true); atualizaCabecalhoIA(s, col); renderStatus(s); }
    } else if (ev.t === 'erro_lote') {
      ev.ids.forEach((id) => { col.falhas[id] = ev.message; });
      col.stats.done++;
      if (ev.code === 'budget_exhausted') S.budgetOut = true;
      if (ativa) atualizaCelulas(s, col, ev.ids, false);
    } else if (ev.t === 'erro') {
      col.erroMsg = ev.message;
    } else if (ev.t === 'fim') {
      Object.assign(col.stats, { tEnd: performance.now(), srvMs: ev.ms, chamadas: ev.chamadas, cost: ev.cost, tokens: ev.tokens, tamanho: ev.tamanho });
      col.estado = ev.ok === 0 ? 'erro' : ev.parcial ? 'parcial' : 'pronto';
      if (ev.ok === 0) col.erroMsg = ev.code === 'budget_exhausted' ? MSG_ORCAMENTO : (ev.motivo || col.erroMsg || 'O Jev não respondeu. Tente de novo.');
      if (ev.motivo) toast(ev.code === 'budget_exhausted' ? MSG_ORCAMENTO : ev.motivo, 'err');
      if (ativa) {
        const dependeVista = (s.sort && s.sort.key === 'ai:' + col.id) || s.filtros.some((f) => f.col === col.id);
        if (dependeVista) { renderBody(s); renderFiltros(s); }
        atualizaCabecalhoIA(s, col); renderStatus(s); renderSugs(s);
        // o cabeçalho a lápis passa a tinta quando a coluna fecha
        const thT = $('thead').querySelector(`th[data-col="${col.id}"]`); if (thT && col.estado !== 'erro') thT.classList.add('tinta');
        if (S.panel && S.panel.sid === s.id) renderPainel();
      }
      renderTabs();
    }
  }

  function tique() {
    if (S.ticker) return;
    const passo = () => {
      const s = cur();
      const col = s && s.ai.find((c) => c.id === s.focus);
      if (!col || !running(col)) { S.ticker = 0; return; }
      const t = document.querySelector('#status [data-live="tempo"]');
      if (t && col.stats.tFill) t.textContent = secs(performance.now() - col.stats.tFill);
      S.ticker = requestAnimationFrame(passo);
    };
    S.ticker = requestAnimationFrame(passo);
  }

  function trocarTipo(s, col, modelo) {
    fecharMenu();
    if (col.ctrl) col.ctrl.abort();
    col.modelo = modelo === '__regra' ? null : modelo;
    if (!col.modelo && regra(col.titulo).regra === 'modelo') col.interp = null;
    else if (col.interpOriginal) col.interp = col.interpOriginal;
    col.estado = 'fila'; col.res = {}; col.falhas = {};
    s.focus = col.id;
    if (isActive(s)) { atualizaCabecalhoIA(s, col); renderStatus(s); atualizaCelulas(s, col, s.linhas.map((r) => r._rid), false); }
    enfileira(s, col);
  }

  function refazer(s, col) {
    fecharMenu();
    if (col.ctrl) col.ctrl.abort();
    col.estado = 'fila'; col.res = {}; col.falhas = {};
    s.focus = col.id;
    if (isActive(s)) { atualizaCabecalhoIA(s, col); renderStatus(s); atualizaCelulas(s, col, s.linhas.map((r) => r._rid), false); }
    enfileira(s, col);
  }

  function removeColuna(s, col) {
    fecharMenu();
    if (col.ctrl) col.ctrl.abort();
    S.queue = S.queue.filter((j) => j.cid !== col.id);
    s.ai = s.ai.filter((c) => c !== col);
    s.filtros = s.filtros.filter((f) => f.col !== col.id);
    if (s.sort && s.sort.key === 'ai:' + col.id) s.sort = null;
    if (s.focus === col.id) s.focus = s.ai.length ? s.ai[s.ai.length - 1].id : null;
    renderTabs(); renderSheet(s);
    if (S.panel) renderPainel();
  }

  function destacaColuna(s, col) {
    const th = $('thead').querySelector(`th[data-col="${col.id}"]`);
    if (!th) return;
    th.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    th.animate([{ outline: '3px solid #FFF2A8', outlineOffset: '-3px', boxShadow: 'inset 0 0 0 4px #1E6B47' }, { outline: '3px solid rgba(255,242,168,0)', outlineOffset: '-3px', boxShadow: 'inset 0 0 0 0 rgba(30,107,71,0)' }], { duration: 1200 });
  }

  // ------------------------------------------------------------------ menu da coluna
  function abrirMenu(anchor, s, col) {
    if (S.menu && S.menu.col === col.id && !$('menu').hidden) { fecharMenu(); return; }
    S.menu = { sid: s.id, col: col.id, anchor };
    montaMenu(s, col, 'principal');
    posicionaMenu(anchor);
  }

  function posicionaMenu(anchor) {
    const m = $('menu'); m.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 6);
    m.style.left = x + 'px'; m.style.top = y + 'px';
  }

  function montaMenu(s, col, modo) {
    const m = $('menu'); m.innerHTML = '';
    const item = (txt, fn, extra) => { const b = el('button', { type: 'button', role: 'menuitem', ...(extra || {}), onclick: (e) => { e.stopPropagation(); fn(); } }, txt); m.append(b); return b; };
    const h = (t) => m.append(el('h5', { text: t }));
    if (modo === 'tipos') {
      item(['← Voltar'], () => { montaMenu(s, col, 'principal'); posicionaMenu(S.menu.anchor); });
      const atual = col.modelo || (col.spec && col.spec.fonte === 'modelo' ? col.spec.modelo : '__regra');
      const r = regra(col.titulo);
      if (r.regra !== 'modelo') { h('Regra do título'); item([r.regra === 'pergunta' ? 'Sim/não (termina com "?")' : 'Categorias do título'], () => trocarTipo(s, col, '__regra'), { class: atual === '__regra' ? 'on' : '' }); }
      const interp = col.interp || col.interpOriginal;
      if (interp) { h('O Jev sugeriu'); interp.ranking.filter((x) => x.p >= 0.005).slice(0, 5).forEach((x) => item([x.rotulo, el('span', { class: 'r', text: pct(x.p) })], () => trocarTipo(s, col, x.id), { class: atual === x.id ? 'on' : '', 'data-modelo': x.id })); }
      h('Todos os tipos');
      const nome = r.regra === 'categorias' ? r.prefixo : col.titulo.replace(/\?+$/, '');
      for (const md of S.cfg.modelos) item([md.rotulo.replaceAll('{t}', nome)], () => trocarTipo(s, col, md.id), { class: atual === md.id ? 'on' : '', 'data-modelo': md.id });
      return;
    }
    h('Ordenar');
    const kind = col.spec && col.spec.kind;
    item([kind === 'choice' ? '↑ Por categoria' : '↓ Maior primeiro'], () => { s.sort = { key: 'ai:' + col.id, dir: kind === 'choice' ? 1 : -1 }; fecharMenu(); atualizaVista(s); }, { 'data-acao': 'ordenar-desc' });
    item([kind === 'choice' ? '↓ Categoria invertida' : '↑ Menor primeiro'], () => { s.sort = { key: 'ai:' + col.id, dir: kind === 'choice' ? -1 : 1 }; fecharMenu(); atualizaVista(s); }, { 'data-acao': 'ordenar-asc' });
    if (col.spec && Object.keys(col.res).length) {
      h('Filtrar');
      const filtro = (f) => { fecharMenu(); aplicaFiltro(s, col, f); };
      const vals = Object.values(col.res);
      if (kind === 'noul') {
        [[0.9, '≥ 90%'], [0.7, '≥ 70%'], [0.5, '≥ 50%']].forEach(([v, lbl]) => item([`Só "sim" ${lbl}`, el('span', { class: 'r', text: fmt.int(vals.filter((a) => a.noul >= v).length) })], () => filtro({ op: 'gte', v, label: `${tituloCurto(col)} ${lbl}` }), { 'data-acao': 'filtro-gte-' + v }));
        item(['Só incertos (30–70%)', el('span', { class: 'r', text: fmt.int(vals.filter((a) => a.noul > 0.3 && a.noul < 0.7).length) })], () => filtro({ op: 'mid', v: 0, label: `${tituloCurto(col)} incerto` }));
        item(['Só "não" (≤ 30%)', el('span', { class: 'r', text: fmt.int(vals.filter((a) => a.noul <= 0.3).length) })], () => filtro({ op: 'lte', v: 0.3, label: `${tituloCurto(col)} ≤ 30%` }));
      } else if (kind === 'score') {
        const sp = col.spec;
        for (let i = sp.curtos.length - 1; i >= 1; i--) item([el('span', { class: 'sw', style: { background: cor(sp, i) } }), `Nível ≥ ${sp.curtos[i]}`, el('span', { class: 'r', text: fmt.int(vals.filter((a) => nivel(sp, a) >= i).length) })], () => filtro({ op: 'gte', v: i, label: `${tituloCurto(col)} ≥ ${sp.curtos[i]}` }), { 'data-acao': 'filtro-nivel-' + i });
      } else {
        const sp = col.spec;
        sp.opcoes.forEach((o) => { const n = vals.filter((a) => a.choice === o).length; if (n) item([el('span', { class: 'sw', style: { background: HEX[sp.cores[o]] || '#94a3b8' } }), o, el('span', { class: 'r', text: fmt.int(n) })], () => filtro({ op: 'eq', v: o, label: `${tituloCurto(col)} = ${o}` }), { 'data-acao': 'filtro-' + o }); });
      }
      if (s.filtros.some((f) => f.col === col.id)) item([icoEl('x'), 'Remover filtro desta coluna'], () => { fecharMenu(); s.filtros = s.filtros.filter((f) => f.col !== col.id); atualizaVista(s); });
    }
    m.append(el('hr'));
    if (col.spec && !running(col)) item([icoEl('troca'), 'Trocar tipo da coluna…'], () => { montaMenu(s, col, 'tipos'); posicionaMenu(S.menu.anchor); }, { 'data-acao': 'tipos' });
    item([icoEl('refaz'), 'Refazer (nova chamada ao Jev)'], () => refazer(s, col), { 'data-acao': 'refazer' });
    item([icoEl('lixo'), 'Remover coluna'], () => removeColuna(s, col), { class: 'danger', 'data-acao': 'remover' });
  }

  function fecharMenu() { const m = $('menu'); if (m && !m.hidden) { m.hidden = true; m.innerHTML = ''; } S.menu = null; }

  // ------------------------------------------------------------------ painel da linha
  function abrirPainel(s, rid, colId) {
    S.panel = { sid: s.id, rid, col: colId || null };
    renderPainel();
    const p = $('panel'); p.classList.add('open'); p.setAttribute('aria-hidden', 'false');
    for (const tr of $('tbody').querySelectorAll('tr.sel')) tr.classList.remove('sel');
    const tr = s._trs.get(rid); if (tr) tr.classList.add('sel');
  }
  function fecharPainel() {
    S.panel = null;
    const p = $('panel'); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true');
    for (const tr of $('tbody').querySelectorAll('tr.sel')) tr.classList.remove('sel');
  }
  function movePainel(d) {
    const s = S.panel && S.sheets[S.panel.sid]; if (!s) return;
    const i = s._vis.findIndex((r) => r._rid === S.panel.rid);
    const nx = s._vis[i + d]; if (!nx) return;
    abrirPainel(s, nx._rid, S.panel.col);
    const tr = s._trs.get(nx._rid); if (tr) tr.scrollIntoView({ block: 'nearest' });
  }

  function renderPainel() {
    const s = S.panel && S.sheets[S.panel.sid];
    if (!s || !s.linhas) { fecharPainel(); return; }
    const r = s.linhas.find((x) => x._rid === S.panel.rid);
    if (!r) { fecharPainel(); return; }
    const c0 = s.colunas[0];
    $('pnTitle').textContent = String(r[c0.key] == null ? '' : r[c0.key]) || `Linha ${r._i + 1}`;
    $('pnSub').textContent = `Linha ${r._i + 1} de ${fmt.int(s.n)} · ${s.nome}`;
    const body = $('pnBody'); body.innerHTML = '';
    const dl = el('dl', { class: 'src' });
    s.colunas.forEach((c) => {
      let v = r[c.key];
      if (c.tipo === 'estrelas') v = `${'★'.repeat(Math.round(Number(v) || 0))} (${v} de 5)`;
      else if (c.key === 'seguidores' && typeof v === 'number') v = fmt.int(v);
      else if (c.key === 'anos' && typeof v === 'number') v = `${v} ${v === 1 ? 'ano' : 'anos'}`;
      dl.append(el('dt', { text: c.label }), el('dd', { text: v == null || v === '' ? '—' : String(v) }));
    });
    body.append(dl);
    if (!s.ai.length) { body.append(el('div', { class: 'none', text: 'Crie uma coluna IA para ver aqui as probabilidades que o Jev deu para esta linha.' })); return; }
    const ordem = [...s.ai].sort((a, b) => (b.id === S.panel.col) - (a.id === S.panel.col));
    for (const col of ordem) body.append(blocoPainel(s, col, r._rid, col.id === S.panel.col));
  }

  function blocoPainel(s, col, rid, hl) {
    const a = col.res[rid]; const sp = col.spec;
    const blk = el('div', { class: 'blk' + (hl ? ' hl' : ''), 'data-col': col.id });
    blk.append(el('h4', {}, [icoEl('bolt'), col.titulo]), el('div', { class: 'ty', text: sp ? sp.rotulo : 'aguardando o Jev…' }));
    if (!a) { blk.append(el('div', { class: 'none', text: running(col) || col.estado === 'fila' ? 'Preenchendo…' : col.falhas[rid] ? `Falhou: ${col.falhas[rid]}` : 'Sem resposta para esta linha.' })); return blk; }
    const box = el('div');
    if (a.type === 'noul') {
      const p = a.noul; const c = p >= 0.7 ? (sp.alerta ? TINTA.vermelho : TINTA.verde) : p <= 0.3 ? TINTA.grafite : TINTA.ocre;
      blk.append(el('div', { class: 'big', html: `<span class="stamp" style="--st:${c}">${pct(p)}</span><span>chance de "sim" · ${p >= 0.7 ? 'sim ✓' : p <= 0.3 ? 'não ✗' : 'incerto — o Jev não tem certeza'}</span>` }));
      blk.append(box);
      bars(box, { sim: p, 'não': 1 - p }, { order: 'keys', keys: ['sim', 'não'], labels: { sim: 'Sim', 'não': 'Não' }, tones: { sim: sp.alerta ? 'danger' : 'safe', 'não': sp.alerta ? 'safe' : 'danger' }, top: p >= 0.5 ? 'sim' : 'não' });
    } else if (a.type === 'score') {
      const lv = nivel(sp, a); const n = sp.curtos.length;
      blk.append(el('div', { class: 'big', html: `<b style="color:${corT(sp, lv)}">${esc(sp.curtos[lv])}</b><span>nota contínua ${fmt.num(a.score + (sp.base || 0), 2)} (escala ${sp.base || 0}–${n - 1 + (sp.base || 0)})</span>` }));
      const meter = el('div'); blk.append(meter);
      scoreMeter(meter, a, { levels: sp.curtos, short: sp.curtos, colors: sp.curtos.map((_, i) => cor(sp, i)) });
      blk.append(el('div', { style: { height: '10px' } }), box);
      const labels = {}; sp.curtos.forEach((c, i) => { labels[String(i)] = sp.niveis ? sp.niveis[i].split(':')[0] : c; });
      bars(box, a.probabilities, { order: 'keys', keys: sp.curtos.map((_, i) => String(i)), labels });
    } else {
      blk.append(el('div', { class: 'big', html: `<span class="tag t-${esc(sp.cores[a.choice] || 'cinza')}"><span>${esc(a.choice)}</span></span><span>confiança ${pct(a.confidence)}</span>` }));
      blk.append(box);
      const tones = {}; bars(box, a.probabilities, { labels: {}, tones, limit: 8 });
    }
    const li = col.lote[rid]; const lt = col.lotes[li];
    if (lt) blk.append(el('div', { class: 'foot', html: `<span>lote <b>${li + 1}/${col.stats.lotesTotal || '?'}</b></span><span><b>${lt.n}</b> linhas na mesma chamada</span><span><b>${fmt.ms(lt.ms)}</b></span><span><b>${fmt.usd(lt.cost)}</b> o lote</span>` }));
    return blk;
  }

  // ------------------------------------------------------------------ exportar CSV
  function csvCel(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const dec = (x, d) => (x == null ? '' : Number(x).toFixed(d).replace('.', ','));

  function exportarCSV() {
    const s = cur(); if (!s || !s.linhas) return;
    const rows = visiveis(s);
    const cols = s.ai.filter((c) => c.spec);
    const head = ['#', ...s.colunas.map((c) => c.label)];
    for (const col of cols) {
      head.push(col.titulo);
      head.push(col.titulo + (col.spec.kind === 'noul' ? ' (prob. de sim)' : col.spec.kind === 'score' ? ` (nota ${col.spec.base || 0}–${col.spec.curtos.length - 1 + (col.spec.base || 0)})` : ' (confiança)'));
    }
    const linhas = [head];
    for (const r of rows) {
      const l = [r._i + 1, ...s.colunas.map((c) => r[c.key])];
      for (const col of cols) {
        const a = col.res[r._rid];
        if (!a) { l.push('', ''); continue; }
        if (a.type === 'noul') l.push(a.noul >= 0.7 ? 'sim' : a.noul <= 0.3 ? 'não' : 'incerto', dec(a.noul, 2));
        else if (a.type === 'score') l.push(col.spec.curtos[nivel(col.spec, a)], dec(a.score + (col.spec.base || 0), 2));
        else l.push(a.choice, dec(a.confidence, 2));
      }
      linhas.push(l);
    }
    const csv = '﻿' + linhas.map((l) => l.map(csvCel).join(';')).join('\r\n') + '\r\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const slug = norm(s.nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'planilha';
    a.href = URL.createObjectURL(blob); a.download = `planilha-preditiva-${slug}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`CSV com ${fmt.int(rows.length)} linhas e ${cols.length} coluna(s) do Jev baixado.`, 'ok');
  }

  // ------------------------------------------------------------------ importar CSV
  const SEPS = [[';', 'ponto e vírgula'], [',', 'vírgula'], ['\t', 'tab'], ['|', 'barra vertical']];

  function contaFora(linha, sep) {
    let n = 0, q = false;
    for (let i = 0; i < linha.length; i++) { const c = linha[i]; if (c === '"') q = !q; else if (c === sep && !q) n++; }
    return n;
  }

  function detectaSeparador(txt) {
    const linhas = txt.split(/\r\n|\n|\r/).filter((l) => l.trim()).slice(0, 25);
    let melhor = ',', score = -1;
    for (const [sep] of SEPS) {
      const cont = linhas.map((l) => contaFora(l, sep));
      if (!cont[0]) continue;
      const iguais = cont.filter((c) => c === cont[0]).length;
      const sc = iguais * 100 + cont[0];
      if (sc > score) { score = sc; melhor = sep; }
    }
    return melhor;
  }

  function parseCSV(txt, sep) {
    const rows = []; let row = []; let cel = ''; let q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) {
        if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else q = false; }
        else cel += c;
      } else if (c === '"' && cel === '') q = true;
      else if (c === sep) { row.push(cel); cel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cel); rows.push(row); row = []; cel = ''; }
      else cel += c;
      if (rows.length > 2000) break;
    }
    if (cel !== '' || row.length) { row.push(cel); rows.push(row); }
    return rows;
  }

  function analisaCSV(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    if (!txt.trim()) return null;
    const sep = detectaSeparador(txt);
    let rows = parseCSV(txt, sep).map((r) => r.map((v) => v.trim())).filter((r) => r.some((v) => v !== ''));
    if (rows.length < 2) return { erro: 'Preciso de uma linha de cabeçalho e pelo menos uma linha de dados.', sep };
    const lim = S.lim || { linhas: 300, colunas: 12, celula: 500, rotulo: 40 };
    const avisos = [];
    let head = rows[0];
    let nCol = Math.max(...rows.slice(0, 50).map((r) => r.length));
    if (nCol > lim.colunas) { avisos.push(`usei só as primeiras ${lim.colunas} colunas`); nCol = lim.colunas; }
    head = Array.from({ length: nCol }, (_, j) => (head[j] || '').slice(0, lim.rotulo) || `Coluna ${j + 1}`);
    const vistos = new Set(); head = head.map((h) => { let x = h; let k = 2; while (vistos.has(norm(x))) x = `${h} (${k++})`; vistos.add(norm(x)); return x; });
    let dados = rows.slice(1);
    if (dados.length > lim.linhas) { avisos.push(`importei só as primeiras ${lim.linhas} linhas (de ${fmt.int(dados.length)})`); dados = dados.slice(0, lim.linhas); }
    let cortes = 0;
    dados = dados.map((r) => Array.from({ length: nCol }, (_, j) => { let v = r[j] || ''; if (v.length > lim.celula) { v = v.slice(0, lim.celula - 1) + '…'; cortes++; } return v; }));
    if (cortes) avisos.push(`${cortes} célula(s) longas cortadas em ${lim.celula} caracteres`);
    // tipo de cada coluna
    const tipos = head.map((_, j) => {
      const vals = dados.map((r) => r[j]).filter((v) => v !== '');
      const nums = vals.filter((v) => /^-?[\d.]+(,\d+)?$|^-?\d+(\.\d+)?$/.test(v)).length;
      const media = vals.reduce((a, v) => a + v.length, 0) / Math.max(1, vals.length);
      return { num: vals.length && nums / vals.length >= 0.8, media };
    });
    let longo = -1, maior = 38;
    tipos.forEach((t, j) => { if (!t.num && t.media > maior) { maior = t.media; longo = j; } });
    const colunas = head.map((label, j) => ({ key: 'c' + j, label, tipo: tipos[j].num ? 'numero' : j === longo ? 'longo' : 'texto', w: tipos[j].num ? 100 : Math.round(Math.max(110, Math.min(260, tipos[j].media * 7.5 + 40))) }));
    return { sep, sepNome: (SEPS.find((x) => x[0] === sep) || [0, sep])[1], colunas, dados, avisos };
  }

  let impAtual = null;
  function atualizaImport() {
    const txt = $('csvText').value;
    const info = $('impInfo'), prev = $('impPrev');
    impAtual = analisaCSV(txt);
    info.innerHTML = '';
    if (!impAtual) { prev.innerHTML = '<div class="imp-empty">Cole um CSV ou envie um arquivo para ver as primeiras linhas aqui.</div>'; $('impGo').disabled = true; return; }
    if (impAtual.erro) { info.append(el('span', { class: 'jev-badge low', text: impAtual.erro })); prev.innerHTML = ''; $('impGo').disabled = true; return; }
    info.append(
      el('span', { class: 'jev-badge info', id: 'impSep', text: `separador: ${impAtual.sepNome}` }),
      el('span', { class: 'jev-badge violet', id: 'impDims', text: `${fmt.int(impAtual.dados.length)} linhas × ${impAtual.colunas.length} colunas` }),
    );
    impAtual.avisos.forEach((a) => info.append(el('span', { class: 'jev-badge mid', text: a })));
    const t = el('table');
    t.append(el('thead', {}, [el('tr', {}, impAtual.colunas.map((c) => el('th', { text: c.label + (c.tipo === 'numero' ? ' (nº)' : '') })))]));
    const tb = el('tbody');
    impAtual.dados.slice(0, 8).forEach((r) => tb.append(el('tr', {}, r.map((v) => el('td', { text: v, title: v })))));
    t.append(tb);
    prev.replaceChildren(t);
    if (impAtual.dados.length > 8) prev.append(el('div', { class: 'imp-empty', style: { padding: '10px' }, text: `… e mais ${fmt.int(impAtual.dados.length - 8)} linhas` }));
    $('impGo').disabled = false;
  }

  function lerArquivo(file) {
    if (!file) return;
    if (file.size > 3_000_000) { toast('Arquivo grande demais (máximo 3 MB).', 'err'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const buf = fr.result;
      let txt;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { txt = new TextDecoder('windows-1252').decode(buf); }
      $('csvText').value = txt;
      if (!$('impNome').value) $('impNome').value = file.name.replace(/\.(csv|tsv|txt)$/i, '').slice(0, 60);
      atualizaImport();
    };
    fr.onerror = () => toast('Não consegui ler o arquivo.', 'err');
    fr.readAsArrayBuffer(file);
  }

  const EXEMPLO_CSV = [
    'protocolo;cliente;canal;mensagem',
    '48213;Marcos Vinícius;app;Fiz um Pix de R$ 1.200 que não caiu na conta do destinatário e o dinheiro sumiu do meu saldo. Preciso resolver HOJE, é o aluguel.',
    '48214;Juliana Prado;chat;Oi! Queria saber como aumento o limite do cartão. Obrigada!',
    '48215;Roberto Nunes;e-mail;Pela terceira vez cobraram uma anuidade que vocês disseram que era grátis. Se não estornarem até sexta, vou cancelar a conta e abrir reclamação no Banco Central.',
    '48216;Fernanda Costa;app;O app trava na tela de login desde a atualização de ontem. Não consigo ver minha fatura.',
    '48217;Luiz Otávio;chat;Vocês são demais, resolveram meu problema em 5 minutos. Nota 10 para a atendente Carla!',
    '48218;Aline Moraes;telefone;Meu cartão foi clonado, tem 4 compras que eu não fiz em outro estado. Já bloqueei pelo app, e agora?',
    '48219;Pedro Henrique;e-mail;Gostaria de saber se vocês têm conta PJ e quais são as tarifas.',
    '48220;Sônia Ribeiro;chat;Não recebi o código de verificação por SMS, já tentei 6 vezes.',
    '48221;Tiago Almeida;app;Quero encerrar minha conta. Como faço para transferir o saldo antes?',
    '48222;Camila Duarte;e-mail;Parabéns pelo cashback novo, já usei duas vezes no mercado.',
    '48223;Gustavo Lima;telefone;Minha fatura veio com juros de atraso, mas o boleto foi pago no dia do vencimento. Segue o comprovante.',
    '48224;Beatriz Souza;chat;How do I change the app language to English?',
  ].join('\n');

  function confirmaImport() {
    if (!impAtual || impAtual.erro) return;
    const nome = ($('impNome').value || '').trim().slice(0, 60) || `Planilha ${S.impSeq + 1}`;
    const contexto = ($('impCtx').value || '').trim().slice(0, 300);
    const importadas = S.order.filter((id) => S.sheets[id].importada);
    if (importadas.length >= 4) fecharImportada(importadas[0]);
    const id = 'imp' + (++S.impSeq);
    const colunas = impAtual.colunas;
    const linhas = impAtual.dados.map((r, i) => { const o = { _rid: 'r' + (i + 1), _i: i }; colunas.forEach((c, j) => { o[c.key] = r[j]; }); return o; });
    const s = novaPlanilha({ id, nome, icone: '📄', descricao: contexto, colunas, n: linhas.length, sugestoes: ['Sentimento', 'Urgência', 'Assunto', 'Precisa de resposta hoje?', 'Idioma', 'Risco de cancelar'] });
    s.linhas = linhas; s.importada = true;
    s.imp = { nome, contexto, colunas: colunas.map((c) => c.label), linhas: impAtual.dados };
    S.sheets[id] = s; S.order.push(id);
    ativar(id);
    toast(`Planilha "${nome}" aberta: ${fmt.int(linhas.length)} linhas. Agora crie uma coluna!`, 'ok');
  }

  // ------------------------------------------------------------------ eventos globais
  $('tbody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao="limpar-filtros"]');
    const s = cur(); if (!s) return;
    if (b) { s.filtros = []; s.busca = ''; $('busca').value = ''; atualizaVista(s); return; }
    const tr = e.target.closest('tr[data-rid]'); if (!tr) return;
    const td = e.target.closest('td');
    abrirPainel(s, tr.dataset.rid, td && td.dataset.col ? td.dataset.col : null);
  });
  $('busca').addEventListener('input', debounce(() => { const s = cur(); if (!s) return; s.busca = $('busca').value.trim().slice(0, 80); atualizaVista(s); }, 250));
  $('export').addEventListener('click', exportarCSV);
  $('pnClose').addEventListener('click', fecharPainel);
  $('pnPrev').addEventListener('click', () => movePainel(-1));
  $('pnNext').addEventListener('click', () => movePainel(1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('menu').hidden) fecharMenu(); else if (S.panel) fecharPainel(); }
    if (S.panel && !e.target.closest('input, textarea, select') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); movePainel(e.key === 'ArrowDown' ? 1 : -1); }
  });
  document.addEventListener('click', (e) => { if (!$('menu').hidden && !e.target.closest('#menu')) fecharMenu(); });
  $('gridwrap').addEventListener('scroll', () => fecharMenu(), { passive: true });
  window.addEventListener('resize', debounce(() => { fecharMenu(); const s = cur(); if (s) ajustaLarguras(s); }, 120));

  $('csvText').addEventListener('input', debounce(atualizaImport, 250));
  $('csvFile').addEventListener('change', (e) => { lerArquivo(e.target.files[0]); e.target.value = ''; });
  $('csvExemplo').addEventListener('click', () => { $('csvText').value = EXEMPLO_CSV; $('impNome').value = 'Chamados de suporte'; $('impCtx').value = 'Chamados de suporte recebidos por uma fintech de conta digital e cartão de crédito'; atualizaImport(); });
  $('impGo').addEventListener('click', confirmaImport);
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) lerArquivo(f); });

  init();
})();

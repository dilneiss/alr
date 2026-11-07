(function () {
  'use strict';
  const { fmt, el, escapeHtml, api, toast, bars } = JevKit;
  JevKit.mountTopbar({ title: 'Cidade Viva', tagline: '48 moradores, 48 cérebros Jev — 1 chamada por hora' });

  const $ = (id) => document.getElementById(id);
  const S = {
    perfis: {}, ordem: [], rows: {}, probs: {}, atividades: {}, lugares: {}, ordemLugares: [], ordemAtv: [],
    relogio: null, clima: null, eventos: [], fila: { n: 0, proximo_em_s: 0 }, custos: {}, ultima: null,
    ocupacao: {}, ocupAnterior: null, felHist: [], felicidade: null, sel: null, userSel: false, estado: 'pausado',
    recebidoEm: 0, segPorHora: 4, feedIds: new Set(),
  };
  // ganchos de leitura para o teste de ponta a ponta
  const T = window.__cidade = { pronto: false, horas: [], ocupacoes: [], feed: [], eventos: [], aplicados: [], estado: '' };

  const PL_NOME = { casa: 'Casa', escritorio: 'Escritório', fabrica: 'Fábrica', escola: 'Escola', hospital: 'Hospital', restaurante: 'Restaurante', cafe: 'Café', mercado: 'Mercado', praca: 'Praça', academia: 'Academia', bar: 'Bar', parque: 'Parque' };
  // ícones de interface em pixel (pixel.js); os emojis que sobram são conteúdo: moradores, atividades e a categoria que o Jev deu ao evento livre
  const icoLugar = (l) => Pix.svg(Pix.LUGAR[l] || (CidadeMapa.isHouse(l) ? 'casa' : 'mapa'));
  const icoEvento = (tipo) => Pix.svg(Pix.EVENTO[tipo] || 'megafone');
  const ATV_AGORA = {
    dormir: 'Dormindo', trabalhar: 'Trabalhando', comer_no_restaurante: 'Comendo no restaurante', cozinhar_em_casa: 'Cozinhando em casa',
    fazer_compras: 'Fazendo compras', socializar_na_praca: 'Na praça', tomar_cafe: 'Tomando café', treinar_na_academia: 'Treinando',
    ir_ao_bar: 'No bar', ir_ao_medico: 'No médico', descansar_em_casa: 'Descansando em casa', passear_no_parque: 'Passeando no parque',
  };
  const ATV_CURTO = {
    dormir: 'dormir', trabalhar: 'trabalhar', comer_no_restaurante: 'comer fora', cozinhar_em_casa: 'cozinhar', fazer_compras: 'ir ao mercado',
    socializar_na_praca: 'ir à praça', tomar_cafe: 'tomar café', treinar_na_academia: 'treinar', ir_ao_bar: 'ir ao bar', ir_ao_medico: 'ir ao médico',
    descansar_em_casa: 'descansar', passear_no_parque: 'passear no parque',
  };
  function verbo(atv, hora, p) {
    const refeicao = hora >= 5 && hora < 10 ? 'o café da manhã' : hora >= 11 && hora < 15 ? 'o almoço' : hora >= 18 && hora < 23 ? 'o jantar' : null;
    switch (atv) {
      case 'dormir': return 'foi dormir';
      case 'trabalhar': return p && p.estudante ? 'foi para a aula' : 'foi trabalhar';
      case 'comer_no_restaurante': return hora >= 11 && hora < 15 ? 'foi almoçar no restaurante' : hora >= 18 ? 'foi jantar no restaurante' : 'foi comer no restaurante';
      case 'cozinhar_em_casa': return refeicao ? `fez ${refeicao} em casa` : 'cozinhou em casa';
      case 'fazer_compras': return 'foi ao mercado';
      case 'socializar_na_praca': return S.eventos.some((e) => e.tipo === 'show') ? 'foi ao show na praça 🎸' : 'foi à praça';
      case 'tomar_cafe': return 'foi tomar café';
      case 'treinar_na_academia': return 'foi treinar';
      case 'ir_ao_bar': return 'foi ao bar';
      case 'ir_ao_medico': return 'foi ao médico';
      case 'descansar_em_casa': return 'foi descansar em casa';
      case 'passear_no_parque': return 'foi passear no parque';
      default: return atv;
    }
  }
  const hh = (t) => String(((t % 24) + 24) % 24).padStart(2, '0') + ':00';
  const usd5 = (v) => (v == null ? '—' : 'US$ ' + v.toFixed(5).replace('.', ','));
  const LED = '<i class="led" aria-hidden="true"></i>';
  const pulsoHora = (u) => `${LED}<span><b>${u.n}</b> decisões em <b>${fmt.ms(u.latency_ms)}</b></span><small>1 chamada ao Jev · <b>${usd5(u.cost)}</b></small>`;
  const primeiroNome = (p) => (p ? p.nome : '?');
  const profCurta = (p) => (p ? p.prof.replace(/ (do|da|que) .*/, '') : '');
  function onde(row) { if (!row) return ''; return CidadeMapa.isHouse(row.l) ? 'em casa' : (PL_NOME[row.l] ? 'em: ' + PL_NOME[row.l] : ''); }

  // ------------------------------------------------------------------ mapa
  const tip = $('tip'), pop = $('pop');
  CidadeMapa.init($('mapa'), {
    onSelect: (id) => { selecionar(id, true); fecharPop(); },
    onHover: (id, lugar, ev) => {
      if (!ev || (!id && !lugar)) { tip.hidden = true; return; }
      const r = $('mapa-box').getBoundingClientRect();
      let html = '';
      if (id) {
        const p = S.perfis[id], row = S.rows[id];
        html = `${p.emoji} <b>${escapeHtml(p.nome)}</b>, ${escapeHtml(profCurta(p))} — ${S.atividades[row?.a]?.emoji || ''} ${escapeHtml(ATV_AGORA[row?.a] || '')}${row?.p != null ? ` <span class="dim">(${fmt.pct(row.p)})</span>` : ''}`;
      } else {
        const ids = CidadeMapa.occupantsOf(lugar);
        const nome = CidadeMapa.placeNome(lugar);
        html = CidadeMapa.isHouse(lugar)
          ? `${icoLugar('casa')}<b>${escapeHtml(nome)}</b> — ${escapeHtml(S.ordem.filter((i) => S.perfis[i].casa === lugar).map((i) => S.perfis[i].nome).join(', '))}`
          : `${icoLugar(lugar)}<b>${escapeHtml(nome)}</b> — ${ids.length} ${ids.length === 1 ? 'pessoa' : 'pessoas'} · clique para ver quem`;
      }
      tip.innerHTML = html; tip.hidden = false;
      tip.style.left = clampN(ev.clientX - r.left, 90, r.width - 90) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px';
    },
    onPlace: (lugar, ev) => { if (!lugar) { fecharPop(); return; } abrirPop(lugar, ev); },
  });
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function fecharPop() { pop.hidden = true; }
  function abrirPop(lugar, ev) {
    const r = $('mapa-box').getBoundingClientRect();
    const casa = CidadeMapa.isHouse(lugar);
    const ids = casa ? S.ordem.filter((i) => S.perfis[i].casa === lugar) : CidadeMapa.occupantsOf(lugar);
    const titulo = CidadeMapa.placeNome(lugar) + (casa ? ' — moradores' : ` — ${ids.length} agora`);
    pop.innerHTML = '';
    const h = el('h4', {}, [
      el('span', { class: 'win-ico', html: icoLugar(casa ? 'casa' : lugar) }),
      el('span', { text: titulo }),
      el('button', { type: 'button', 'aria-label': 'Fechar', title: 'Fechar (Esc)', onclick: fecharPop, html: Pix.svg('fechar') }),
    ]);
    const lista = el('div', { class: 'lista' });
    pop.append(h, lista);
    if (!ids.length) lista.append(el('div', { class: 'none', text: 'Ninguém aqui nesta hora.' }));
    for (const id of ids) {
      const p = S.perfis[id], row = S.rows[id];
      lista.append(el('button', { class: 'who', type: 'button', onclick: () => { selecionar(id, true); fecharPop(); } }, [
        el('span', { class: 'e', text: p.emoji }), el('span', { text: p.nome }), el('span', { class: 's', text: `${S.atividades[row?.a]?.emoji || ''} ${ATV_AGORA[row?.a] || ''}` }),
      ]));
    }
    pop.hidden = false;
    const x = clampN(ev.clientX - r.left + 12, 8, r.width - 270), y = clampN(ev.clientY - r.top - 20, 8, r.height - Math.min(290, 60 + ids.length * 34));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPop(); });

  // ------------------------------------------------------------------ relógio / pulso
  // a barra sob a hora enche em 12 degraus enquanto o jogo caminha até a próxima hora
  const anel = $('anel');
  function tickRelogio() {
    requestAnimationFrame(tickRelogio);
    if (!S.relogio || S.estado !== 'rodando') { anel.style.width = '0%'; return; }
    const prog = Math.min(1, (performance.now() - S.recebidoEm) / (S.segPorHora * 1000));
    anel.style.width = (Math.floor(prog * 12) / 12) * 100 + '%';
  }
  requestAnimationFrame(tickRelogio);
  function renderRelogio() {
    const r = S.relogio, c = S.clima;
    if (!r) return;
    $('hora').textContent = r.label;
    $('dia').innerHTML = `<b>${escapeHtml(r.diaSemana)}</b><span>dia ${fmt.int(r.dia)} · ${escapeHtml(r.periodo)}</span>`;
    if (c) $('clima').innerHTML = `${Pix.svg(Pix.clima(c))}<span><b>${escapeHtml(c.label)}</b>${c.temp}°C${c.frio ? ' · frio' : ''}</span>`;
    $('diario-data').textContent = `Vila Jev · ${r.diaSemana}, dia ${fmt.int(r.dia)} · edição das ${r.label}`;
  }
  function pulso(html, cls) {
    const p = $('pulso'); p.innerHTML = html;
    p.classList.remove('thinking', 'flash'); void p.offsetWidth;
    if (cls) p.classList.add(cls);
  }

  // ------------------------------------------------------------------ KPIs (janela "Orçamento")
  function renderKpis() {
    const u = S.ultima, c = S.custos || {};
    if (u) { $('k-lat').textContent = fmt.ms(u.latency_ms); $('k-lat-s').textContent = `${u.n} decisões, 1 chamada`; }
    if (c.media_hora != null) { $('k-hora').textContent = fmt.usd(c.media_hora); $('k-hora-s').textContent = u && u.tokens ? `${fmt.num(u.tokens / 1000, 1)} mil tokens` : '48 moradores'; }
    if (c.dia_simulado != null) { $('k-dia').textContent = fmt.usd(c.dia_simulado); }
    if (S.felicidade != null) {
      $('k-fel').textContent = fmt.pct(S.felicidade);
      const hs = S.felHist.slice(-36);
      if (hs.length > 1) {
        const mn = Math.min(...hs) - 0.02, mx = Math.max(...hs) + 0.02;
        const pts = hs.map((v, i) => `${(i / (hs.length - 1)) * 100},${16 - ((v - mn) / (mx - mn || 1)) * 14 - 1}`).join(' ');
        $('k-fel-g').innerHTML = `<line class="gd" x1="0" y1="5.5" x2="100" y2="5.5"/><line class="gd" x1="0" y1="10.5" x2="100" y2="10.5"/><polygon class="ar" points="0,16 ${pts} 100,16"/><polyline class="ln" points="${pts}"/>`;
      }
    }
    const rod = $('rodape');
    if (c.horas_total != null) {
      rod.innerHTML = `<span>Desde que a cidade nasceu: <b>${fmt.int(c.horas_total)}</b> horas · <b>${fmt.int(c.decisoes_total)}</b> decisões · <b>${fmt.usd(c.total)}</b></span><span>hoje <b>${fmt.int(c.horas_hoje)}</b>/${fmt.int(c.teto_horas)} h</span>`;
    }
  }

  // ------------------------------------------------------------------ ocupação (janela "Onde estão agora")
  const occEls = {};
  function montarOcupacao() {
    const box = $('ocupacao'); box.innerHTML = '';
    for (const l of S.ordemLugares) {
      const filhos = [
        el('span', { class: 'ic', html: icoLugar(l) }), el('span', { class: 'nm', text: PL_NOME[l] }),
        el('span', { class: 'n', text: '0' }), el('span', { class: 'up' }),
        el('span', { class: 'bar' }, [el('i')]),
      ];
      // a casa não abre lista (são 16 casas); os outros lugares são botões que mostram quem está lá
      const t = l === 'casa'
        ? el('div', { class: 't', 'data-lugar': l, 'data-n': '0', title: PL_NOME[l] }, filhos)
        : el('button', { class: 't', type: 'button', 'data-lugar': l, 'data-n': '0', title: PL_NOME[l] }, filhos);
      if (l !== 'casa') t.addEventListener('click', (ev) => abrirPop(l, ev));
      occEls[l] = t; box.append(t);
    }
  }
  function renderOcupacao() {
    const evLug = new Set(S.eventos.map((e) => e.lugar).filter(Boolean));
    for (const l of S.ordemLugares) {
      const t = occEls[l]; if (!t) continue;
      const n = S.ocupacao[l] || 0;
      const antes = S.ocupAnterior ? S.ocupAnterior[l] || 0 : n;
      t.dataset.n = String(n);
      t.querySelector('.n').textContent = String(n);
      t.querySelector('.bar i').style.width = Math.min(100, (n / (l === 'casa' ? 48 : 16)) * 100) + '%';
      const up = t.querySelector('.up'); const d = n - antes;
      up.textContent = d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '';
      up.className = 'up' + (d < 0 ? ' dn' : '');
      t.classList.toggle('hot', evLug.has(l));
      t.classList.remove('mudou'); if (d !== 0) { void t.offsetWidth; t.classList.add('mudou'); }
      t.title = `${PL_NOME[l]}: ${n} ${n === 1 ? 'pessoa' : 'pessoas'} agora`;
    }
    if (S.relogio) $('censo-sub').textContent = `às ${S.relogio.label}`;
  }

  // ------------------------------------------------------------------ morador selecionado (janela "Ficha do morador")
  const NEEDS = [['Fome', 0, true], ['Energia', 1], ['Social', 2], ['Diversão', 3], ['Saúde', 4]];
  function corNeed(v, inv) { const g = inv ? 100 - v : v; return g >= 60 ? '#5FA85B' : g >= 35 ? '#E0A030' : '#D8352A'; }
  function selecionar(id, peloUsuario) {
    if (!S.perfis[id]) return;
    S.sel = id; if (peloUsuario) S.userSel = true;
    CidadeMapa.select(id);
    renderMorador(true);
  }
  function aleatorio() {
    const vis = CidadeMapa.visiveis().filter((i) => i !== S.sel);
    const pool = vis.length ? vis : S.ordem.filter((i) => i !== S.sel);
    selecionar(pool[Math.floor(Math.random() * pool.length)], true);
  }
  let atvMostrada = null;
  function renderMorador(novo) {
    const box = $('morador');
    const id = S.sel, p = S.perfis[id], row = S.rows[id];
    if (!p || !row) return;
    if (novo || !box.querySelector('.top')) {
      box.innerHTML = `
        <div class="top">
          <div class="av" id="m-av"></div>
          <div class="who"><div class="nm" id="m-nm"></div><div class="pf" id="m-pf"></div><div class="trs" id="m-tr"></div></div>
          <button class="btn btn--sm cv-dado" type="button" id="m-rnd" title="Ver outro morador" aria-label="Ver outro morador">${Pix.svg('dado')}Outro</button>
        </div>
        <div class="now" id="m-now"><div class="e" id="m-e"></div><div class="t" id="m-t"></div><div class="p" id="m-p"></div></div>
        <div class="cols">
          <div><h3>Como está agora</h3><div class="cv-needs" id="m-needs"></div></div>
          <div><h3>Decisão do Jev nesta hora</h3><div id="m-probs"></div></div>
        </div>
        <div><h3>O dia de hoje, hora a hora</h3><div class="cv-day24" id="m-dia"></div></div>`;
      $('m-rnd').onclick = aleatorio;
      const needs = $('m-needs');
      for (const [nome] of NEEDS.concat([['Dinheiro']])) needs.append(el('div', { class: 'cv-need' }, [el('span', { class: 'nl', text: nome }), el('span', { class: 'nt' }, [el('i')]), el('span', { class: 'nv' })]));
      atvMostrada = null;
    }
    $('m-av').textContent = p.emoji;
    $('m-nm').textContent = `${p.nome}, ${p.idade}`;
    const turno = p.turno ? ` · ${p.estudante ? 'aula' : 'turno'} ${p.turno[0]}h–${p.turno[1]}h` : '';
    $('m-pf').textContent = `${p.prof.charAt(0).toUpperCase() + p.prof.slice(1)}${turno}`;
    $('m-tr').innerHTML = p.tracos.map((t) => `<span class="tr">${escapeHtml(t)}</span>`).join('') + (row.g ? `<span class="tr tr--gripe">${Pix.svg('gripe')}gripado</span>` : '');
    $('m-e').textContent = S.atividades[row.a]?.emoji || '❔';
    $('m-t').innerHTML = `${escapeHtml(ATV_AGORA[row.a] || row.a)}${row.h > 1 ? ` <span class="ha">· há ${row.h}h</span>` : ''}<span class="lug">${escapeHtml(CidadeMapa.isHouse(row.l) ? CidadeMapa.placeNome(row.l) : PL_NOME[row.l] || '')}${row.alt ? ` · quase foi ${escapeHtml(ATV_CURTO[row.alt.atv] || row.alt.atv)} (${fmt.pct(row.alt.p)})` : ''}</span>`;
    $('m-p').textContent = row.p != null ? fmt.pct(row.p) : '';
    // a faixa do "agora" pisca quando o Jev muda a atividade deste morador
    const agora = $('m-now');
    if (atvMostrada && atvMostrada !== row.a) { agora.classList.remove('muda'); void agora.offsetWidth; agora.classList.add('muda'); }
    atvMostrada = row.a;
    const nv = [...$('m-needs').children];
    NEEDS.forEach(([nome, i, inv], j) => {
      const v = row.n[i];
      const e = nv[j];
      e.querySelector('i').style.width = (inv ? v : v) + '%';
      e.querySelector('i').style.background = corNeed(v, inv);
      e.querySelector('.nv').textContent = String(v);
      e.title = inv ? `Fome ${v} (0 = satisfeito, 100 = faminto)` : `${nome} ${v} de 100`;
    });
    const dn = nv[5];
    dn.querySelector('i').style.width = Math.min(100, row.$ / 6) + '%';
    dn.querySelector('i').style.background = corNeed(Math.min(100, row.$ / 4));
    dn.querySelector('.nv').textContent = 'R$ ' + fmt.int(row.$);
    const pr = S.probs[id];
    if (pr) {
      const labels = {}; for (const k of Object.keys(pr)) labels[k] = `${S.atividades[k]?.emoji || ''} ${S.atividades[k]?.label || k}`;
      bars($('m-probs'), pr, { labels, limit: 5 });
    } else $('m-probs').innerHTML = '<div class="espera">Esperando a próxima decisão…</div>';
    const dia = $('m-dia'); dia.innerHTML = '';
    const hora = S.relogio ? S.relogio.hora : 0;
    const hist = row.hist || [];
    const inicio = hora - hist.length + 1;
    for (let h = 0; h < 24; h++) {
      if (h % 12 === 0) dia.append(el('span', { class: 'hl', text: `${String(h).padStart(2, '0')}h` }));
      const idx = h - inicio;
      const atv = idx >= 0 && idx < hist.length ? S.ordemAtv[hist[idx]] : null;
      dia.append(el('i', { class: h === hora ? 'now' : '', title: `${String(h).padStart(2, '0')}:00${atv ? ' — ' + (S.atividades[atv]?.label || atv) : ''}`, text: atv ? S.atividades[atv]?.emoji || '' : '' }));
    }
  }

  // ------------------------------------------------------------------ feed (o jornal "Diário da Cidade")
  const feedEl = $('feed');
  function itemFeed(it) {
    if (it.k === 'ev') {
      const e = it.ev || {};
      const txt = e.tipo === 'livre' ? `Modo Deus: “${e.titulo}”` : `Modo Deus: ${e.titulo}`;
      const extra = (it.efeitos || []).join(' · ');
      // evento livre: o emoji é a categoria que o Jev escolheu (conteúdo); os eventos prontos ganham o ícone em pixel
      const marca = e.tipo === 'livre' ? el('span', { class: 'e', text: e.emoji || '📣' }) : el('span', { class: 'e', html: icoEvento(e.tipo) });
      return el('li', { class: 'ev', 'data-k': 'ev' }, [
        el('span', { class: 'h', text: hh(it.t) }), marca,
        el('span', { class: 'x' }, [el('span', { class: 'kick', text: 'Extra' }), el('span', { text: txt }), extra ? el('span', { class: 'q', text: extra }) : null, el('span', { class: 'q', text: `vale a partir das ${hh(it.t + 1)}${e.ate_label ? ' até ' + e.ate_label : ''} — os 48 decidem na próxima hora` })]),
        el('span'),
      ]);
    }
    if (it.k === 'mais') return el('li', { class: 'mais' }, [el('span', { class: 'h', text: hh(it.t) }), el('span'), el('span', { class: 'x', text: `+ ${it.n} outras mudanças nesta hora` }), el('span')]);
    const p = S.perfis[it.id]; if (!p) return null;
    const hora = ((it.t % 24) + 24) % 24;
    const q = it.alt && it.alt.p >= 0.2 ? `quase foi ${ATV_CURTO[it.alt.atv] || it.alt.atv} (${fmt.pct(it.alt.p)})` : null;
    const li = el('li', { title: 'Clique para ver este morador', onclick: () => selecionar(it.id, true) }, [
      el('span', { class: 'h', text: hh(it.t) }), el('span', { class: 'e', text: p.emoji }),
      el('span', { class: 'x' }, [el('b', { text: p.nome }), `, ${profCurta(p)}, ${verbo(it.atv, hora, p)}`, q ? el('span', { class: 'q', text: q }) : null]),
      it.p != null ? el('span', { class: 'pp' + (it.p < 0.5 ? ' low' : ''), text: fmt.pct(it.p) }) : el('span'),
    ]);
    return li;
  }
  // O servidor manda os itens em ordem cronológica ([decisões…, "+N outras"] por hora). Na tela: hora mais nova primeiro,
  // mas dentro de cada hora a ordem original (as decisões primeiro, o "+N outras" por último). A primeira linha de cada
  // hora leva a hora impressa (classe g0), como um título de seção do jornal.
  function addFeed(items, inicial) {
    if (!items || !items.length) return;
    const vazio = feedEl.querySelector('.empty'); if (vazio) vazio.remove();
    const grupos = [];
    for (const it of items) { const g = grupos[grupos.length - 1]; if (g && g.t === it.t && it.k !== 'ev' && g.k !== 'ev') g.itens.push(it); else grupos.push({ t: it.t, k: it.k, itens: [it] }); }
    const frag = document.createDocumentFragment();
    for (const g of grupos.reverse()) g.itens.forEach((it, i) => {
      const node = itemFeed(it); if (node) { if (i === 0) node.classList.add('g0'); frag.append(node); }
      T.feed.push(it.k === 'ev' ? `ev:${it.ev?.titulo}` : it.k === 'd' ? `${it.id}:${it.atv}` : 'mais');
    });
    if (T.feed.length > 400) T.feed.splice(0, T.feed.length - 400);
    feedEl.prepend(frag);
    while (feedEl.children.length > 90) feedEl.lastChild.remove();
    if (!inicial) { feedEl.scrollTop = 0; feedEl.scrollLeft = 0; }
  }
  // no computador o jornal é uma faixa de colunas que rola para o lado: a roda do mouse rola a faixa
  feedEl.addEventListener('wheel', (e) => {
    if (feedEl.scrollWidth <= feedEl.clientWidth + 1 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault(); feedEl.scrollLeft += e.deltaY;
  }, { passive: false });

  // ------------------------------------------------------------------ modo Deus
  let filaLocal = { n: 0, ate: 0 };
  function setFila(f) { if (!f) return; S.fila = f; filaLocal = { n: f.n, ate: Date.now() + (f.proximo_em_s || 0) * 1000 }; renderFila(); }
  function renderFila() {
    const rest = Math.max(0, Math.ceil((filaLocal.ate - Date.now()) / 1000));
    const total = S.fila.intervalo_s || 20;
    const st = $('fila-status');
    let txt, estado;
    if (filaLocal.n > 0) { txt = `<b>${filaLocal.n}</b> na fila · próximo em <b>${rest}s</b>`; estado = 'fila'; }
    else if (rest > 0) { txt = `Próximo evento liberado em <b>${rest}s</b> <span class="dim">(1 a cada 20 s)</span>`; estado = 'espera'; }
    else { txt = 'Pronto: 1 evento a cada 20 s para toda a cidade'; estado = 'pronto'; }
    const cheios = estado === 'pronto' ? 10 : Math.round((1 - Math.min(rest, total) / total) * 10);
    st.dataset.estado = estado;
    st.innerHTML = `<span>${txt}</span><span class="fl-bar" aria-hidden="true">${'<i class="on"></i>'.repeat(cheios)}${'<i></i>'.repeat(10 - cheios)}</span>`;
  }
  setInterval(renderFila, 1000);
  function renderAtivos() {
    const box = $('ativos'); box.innerHTML = '';
    for (const e of S.eventos) {
      box.append(el('span', { class: 'cv-chip-ev', title: e.titulo }, [el('span', { html: icoEvento(e.tipo) }), el('span', { class: 'tt', text: e.titulo }), el('i', { text: `até ${e.ate_label}` })]));
    }
    document.querySelectorAll('.cv-ev').forEach((b) => b.classList.toggle('on', S.eventos.some((e) => e.tipo === b.dataset.evento)));
  }
  async function dispararEvento(tipo, texto, btn) {
    if (btn) { btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 1200); }
    try {
      const r = await api('/api/evento', tipo === 'livre' ? { tipo, texto } : { tipo }, { label: 'evento livre' });
      T.eventos.push({ tipo, texto, r: { aplicado: r.aplicado, posicao: r.posicao } });
      const nome = r.evento.titulo;
      if (tipo === 'livre' && r.classificacao) {
        const lug = r.classificacao.lugar && r.classificacao.lugar !== 'cidade_toda' ? `no lugar “${PL_NOME[r.classificacao.lugar] || r.classificacao.lugar}”` : 'na cidade toda';
        toast(`O Jev leu o evento e colocou ${lug}. ${r.aplicado ? 'Os 48 moradores reagem na próxima hora!' : `Na fila: acontece em ~${r.espera_s}s.`}`, 'ok');
      } else {
        toast(r.aplicado ? `${nome}! Os 48 moradores decidem na próxima hora.` : `${nome} entrou na fila (posição ${r.posicao}): acontece em ~${r.espera_s}s.`, 'ok');
      }
      return r;
    } catch (e) { return null; }
  }
  document.querySelectorAll('.cv-ev').forEach((b) => b.addEventListener('click', () => dispararEvento(b.dataset.evento, null, b)));
  const livre = $('livre');
  livre.addEventListener('input', () => { $('livre-n').textContent = `${[...livre.value].length}/100`; });
  $('livre-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const texto = livre.value.trim();
    if ([...texto].length < 4) { toast('Escreva um acontecimento (ex.: “chegou um circo no parque”).'); livre.focus(); return; }
    const btn = $('livre-go'); btn.disabled = true;
    const r = await dispararEvento('livre', texto);
    btn.disabled = false;
    if (r) { livre.value = ''; $('livre-n').textContent = '0/100'; }
  });

  // ------------------------------------------------------------------ SSE
  function aplicarBase(d) {
    if (d.relogio) { S.relogio = d.relogio; S.recebidoEm = performance.now(); }
    if (d.clima) S.clima = d.clima;
    if (d.eventos) S.eventos = d.eventos;
    if (d.fila) setFila(d.fila);
    if (d.custos) S.custos = d.custos;
    if (d.ultima) S.ultima = d.ultima;
    if (d.espectadores != null) {
      const n = d.espectadores, v = $('espectadores');
      v.innerHTML = `${Pix.svg('olho')}<b>${fmt.int(n)}</b>`;
      v.title = `${fmt.int(n)} ${n === 1 ? 'pessoa vendo' : 'pessoas vendo'} esta cidade agora`;
    }
    if (d.moradores) for (const r of d.moradores) S.rows[r.id] = r;
    if (d.probs) S.probs = d.probs;
  }
  function setEstado(estado, mensagem) {
    S.estado = estado; T.estado = estado;
    const b = $('banner');
    if (mensagem) { b.textContent = mensagem; b.hidden = false; } else b.hidden = true;
    $('live').classList.toggle('off', estado !== 'rodando');
    if (estado === 'teto' || estado === 'orcamento') pulso(`${LED}<span>Cidade dormindo até amanhã</span>`);
  }
  const handlers = {
    open() { if (S.estado === 'desconectado') setEstado('pausado'); },
    error() { if (!parado) { setEstado('desconectado', null); pulso(`${LED}<span>Reconectando à cidade…</span>`, 'thinking'); } },
    snapshot(d) {
      S.perfis = Object.fromEntries(d.perfis.map((p) => [p.id, p])); S.ordem = d.perfis.map((p) => p.id);
      S.atividades = d.atividades; S.ordemAtv = d.ordem_atividades; S.ordemLugares = d.ordem_lugares; S.segPorHora = d.seg_por_hora || 4;
      S.rows = {}; aplicarBase(d);
      S.ocupacao = d.ocupacao; S.ocupAnterior = null; S.felicidade = d.felicidade; S.felHist = (d.felicidade_hist || []).slice();
      CidadeMapa.setSnapshot(d);
      if (!Object.keys(occEls).length) montarOcupacao();
      renderOcupacao(); renderRelogio(); renderKpis(); renderAtivos();
      feedEl.innerHTML = ''; addFeed(d.feed, true);
      if (!feedEl.children.length) feedEl.append(el('li', { class: 'empty', text: 'Esperando a próxima hora…' }));
      if (!S.sel || !S.perfis[S.sel]) {
        const vis = d.moradores.filter((r) => !CidadeMapa.isHouse(r.l) && ['praca', 'parque', 'cafe', 'restaurante', 'bar', 'academia', 'mercado'].includes(r.l));
        const pick = (vis.length ? vis : d.moradores)[Math.floor(Math.random() * (vis.length || d.moradores.length))];
        selecionar(pick.id, false);
      } else { CidadeMapa.select(S.sel); renderMorador(true); }
      setEstado(d.estado, d.mensagem);
      if (d.ultima) pulso(pulsoHora(d.ultima));
      else pulso(`${LED}<span>A cidade está acordando…</span>`);
      T.pronto = true;
    },
    pensando(d) {
      CidadeMapa.pensando();
      pulso(`${LED}<span><b>${d.n}</b> moradores pensando…</span><small>decidindo as <b>${escapeHtml(d.label)}</b> numa única chamada</small>`, 'thinking');
    },
    hora(d) {
      S.ocupAnterior = S.ocupacao;
      aplicarBase(d);
      S.ocupacao = d.ocupacao; S.felicidade = d.felicidade; S.felHist.push(d.felicidade); if (S.felHist.length > 96) S.felHist.shift();
      CidadeMapa.onHora(d);
      renderRelogio(); renderKpis(); renderOcupacao(); renderAtivos(); addFeed(d.feed);
      if (S.sel) renderMorador(false);
      if (S.estado !== 'rodando') setEstado('rodando', null);
      pulso(pulsoHora(d.ultima), 'flash');
      T.horas.push({ t: d.relogio.t, label: d.relogio.label, decisoes: d.ultima.n, ms: d.ultima.latency_ms, custo: d.ultima.cost });
      T.ocupacoes.push({ t: d.relogio.t, ...d.ocupacao, eventos: d.eventos.map((e) => e.tipo) });
      if (T.horas.length > 300) { T.horas.shift(); T.ocupacoes.shift(); }
    },
    evento(d) {
      if (d.eventos) S.eventos = d.eventos;
      if (d.clima) S.clima = d.clima;
      if (d.fila) setFila(d.fila);
      if (d.moradores) for (const r of d.moradores) S.rows[r.id] = r;
      CidadeMapa.setWorld({ eventos: S.eventos, clima: S.clima });
      addFeed([d.item]); renderAtivos(); renderOcupacao(); renderRelogio();
      const e = d.item.ev;
      T.aplicados.push({ id: e.id, tipo: e.tipo, titulo: e.titulo, t: d.item.t });
      pulso(`${LED}<span>${escapeHtml(e.titulo.length > 30 ? e.titulo.slice(0, 28) + '…' : e.titulo)}</span><small>os 48 decidem na próxima hora</small>`, 'thinking');
      if (S.sel) renderMorador(false);
    },
    fila(d) { setFila(d); },
    status(d) { if (d.custos) S.custos = d.custos; setEstado(d.estado, d.mensagem); renderKpis(); },
  };

  let stream = null, parado = false;
  function conectar() {
    if (stream) return;
    parado = false;
    stream = JevKit.sse('/api/stream', handlers);
  }
  function desconectar() { parado = true; if (stream) { stream.close(); stream = null; } setEstado('pausado', null); }

  // pausa quando a aba some ou depois de 12 min sem interação (teto por sessão)
  let ultimaInteracao = Date.now();
  for (const evn of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove']) window.addEventListener(evn, () => { ultimaInteracao = Date.now(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') desconectar();
    else if ($('pausado').hidden) conectar();
  });
  setInterval(() => {
    if (stream && Date.now() - ultimaInteracao > 12 * 60 * 1000) { desconectar(); $('pausado').hidden = false; pulso(`${LED}<span>Cidade pausada</span>`); }
  }, 10000);
  $('continuar').addEventListener('click', () => { $('pausado').hidden = true; ultimaInteracao = Date.now(); conectar(); });
  $('ver-chamada').addEventListener('click', () => window.open('/api/ultima-chamada', '_blank', 'noopener'));

  // o mapa desenha placas e rótulos no canvas: quando a fonte do app chega, redesenha a camada fixa com ela
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 12px "Atkinson Hyperlegible"').then(() => window.dispatchEvent(new Event('resize'))).catch(() => {});
  }

  conectar();
})();

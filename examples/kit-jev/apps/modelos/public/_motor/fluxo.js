// Motor FLUXO: itens chegam, o Jev decide em lotes e cada um vai para o lugar certo.
// Layouts: 'colunas' (raias por opção, com raia de revisão humana pelo limiar), 'feed' (esconde o que não serve),
// 'linha' (trechos numa linha do tempo, ex.: cortes de vídeo).
import { el, esc, fmt, sleep, toast, modal, barras, medidor, anel, chip, voar, listaOpcoes, listaNiveis, confiancaDe, topo } from './ui.js';

const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

export function criar({ spec, area, decidir, contexto }) {
  const F = spec.fluxo || {};
  const layout = F.layout || 'colunas';
  const decs = spec.decisoes || [];
  const dados = spec.dados || [];
  const lote = Math.max(1, Math.min(12, F.lote || 6));
  // pausa entre lotes na demonstração: no máximo 2,2 s, para o vídeo não arrastar
  const ritmo = Math.min(F.ritmo || 1300, 2200);
  const campos = { titulo: 'titulo', subtitulo: 'subtitulo', texto: 'texto', meta: 'meta', valor: 'valor', avatar: 'avatar', ...(F.cartao || {}) };
  const decCol = decs.find((d) => d.id === F.colunas);
  const opcoesCol = decCol ? listaOpcoes(decCol, contexto) : [];
  const humano = F.humano || null;
  const estado = { feitos: 0, decisoes: 0, custo: 0, ms: 0, chamadas: 0, porOpcao: {}, extra: {} };
  let resumoEl = null;

  // ---------- montagem comum ----------
  const fila = el('div', { class: 'mj-fila-lista', 'aria-live': 'polite' });
  const nFila = el('span', { class: 'n', text: '0' });
  const orbe = el('div', { class: 'mj-orbe', html: BOLT });
  const info = el('div', { class: 'mj-nucleo-info', html: 'esperando<br>o primeiro lote' });
  const placar = el('div', { class: 'mj-placar mj-painel-box' });
  const kFeitos = el('b', { text: '0' }), kDec = el('b', { text: '0' }), kCusto = el('b', { text: 'US$ 0' }), kMil = el('b', { text: '—' });
  placar.append(
    el('span', { class: 'k' }, [F.rotuloFeitos || 'itens decididos', kFeitos]),
    el('span', { class: 'k' }, ['decisões', kDec]),
    el('span', { class: 'k' }, ['custo', kCusto]),
    el('span', { class: 'k', title: 'Quanto custaria decidir 1 milhão de itens assim' }, ['1 milhão sai por', kMil]),
  );
  const entradaTxt = el('textarea', { placeholder: (F.entrada && F.entrada.placeholder) || 'Cole um item seu e o Jev decide na hora…', 'aria-label': (F.entrada && F.entrada.rotulo) || 'Seu item' });
  const btEntrada = el('button', { class: 'mj-btn mj-btn--primario', type: 'button' }, [(F.entrada && F.entrada.botao) || 'Decidir']);
  const entrada = el('form', { class: 'mj-entrada mj-painel-box', onsubmit: (e) => { e.preventDefault(); decidirMeu(); } }, [entradaTxt, btEntrada]);
  entradaTxt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); decidirMeu(); } });

  let raias = {}, raiaHumano = null, feed = null, trilho = null, listaLinha = null, prefs = null, kMost = null, kEsc = null;

  if (spec.editavel && layout !== 'feed') {
    prefs = el('textarea', { 'aria-label': spec.editavel.rotulo || 'Regras', style: { width: '100%', minHeight: '180px', borderRadius: '10px', border: '1px solid var(--mj-borda2)', background: 'var(--mj-bg)', color: 'var(--mj-texto)', font: '13px/1.5 var(--mj-f)', padding: '10px' } });
    prefs.value = contexto[spec.editavel.campo] || '';
    entrada.prepend(el('button', { class: 'mj-btn mj-btn--ghost', type: 'button', title: 'Editar as regras que o Jev usa', onclick: () => modal(spec.editavel.rotulo || 'Regras', el('div', {}, [el('p', { class: 'dim', text: spec.editavel.ajuda || 'O Jev lê este texto em cada decisão. Mude e aperte ▶ de novo.' }), prefs]), { largo: true }) }, ['✎ ' + (spec.editavel.botao || 'Regras')]));
  }
  if (layout === 'colunas') montarColunas();
  else if (layout === 'feed') montarFeed();
  else montarLinha();

  function montarColunas() {
    const raiasBox = el('div', { class: 'mj-raias' });
    for (const o of opcoesCol) {
      const lista = el('div', { class: 'mj-raia-lista' });
      const n = el('span', { class: 'n', text: '0' });
      const r = el('section', { class: 'mj-raia', style: o.cor ? { '--raia': o.cor } : null, 'data-op': o.id }, [
        el('header', { title: o.desc || '' }, [el('span', { class: 'ic', text: o.icone || '•' }), el('span', { text: o.rotulo }), n]), lista,
      ]);
      raias[o.id] = { r, lista, n, c: 0 };
      raiasBox.append(r);
    }
    if (humano) {
      const lista = el('div', { class: 'mj-raia-lista' });
      const n = el('span', { class: 'n', text: '0' });
      const r = el('section', { class: 'mj-raia humano', title: `Confiança abaixo de ${fmt.pct(humano.limiar)}: vai para uma pessoa` }, [
        el('header', {}, [el('span', { class: 'ic', text: humano.icone || '🙋' }), el('span', { text: humano.rotulo || 'Revisão humana' }), n]), lista,
      ]);
      raiaHumano = { r, lista, n, c: 0 };
      raiasBox.append(r);
    }
    area.append(
      el('div', { class: 'mj-fluxo' }, [
        el('section', { class: 'mj-fila mj-painel-box' }, [el('h3', { class: 'mj-sec-t' }, [F.rotuloFila || 'Chegando', nFila]), fila]),
        el('div', { class: 'mj-nucleo' }, [orbe, info]),
        el('section', { class: 'mj-raias-box mj-painel-box' }, [
          el('h3', { class: 'mj-sec-t' }, [`${decCol ? (decCol.titulo || decCol.id) : 'Decisão'} · o Jev decidiu`, humano ? el('span', { class: 'n dim', text: `revisão humana abaixo de ${fmt.pct(humano.limiar)} de confiança` }) : null]),
          raiasBox,
        ]),
      ]),
      el('div', { class: 'mj-fluxo-baixo' }, [entrada, placar]),
    );
  }

  function montarFeed() {
    feed = el('div', { class: 'mj-feed', 'aria-live': 'polite' });
    kMost = el('b', { text: '0' }); kEsc = el('b', { text: '0' });
    const ED = spec.editavel;
    if (ED) { prefs = el('textarea', { 'aria-label': ED.rotulo || 'Suas regras', style: { width: '100%', minHeight: '150px', borderRadius: '10px', border: '1px solid var(--mj-borda2)', background: 'var(--mj-bg)', color: 'var(--mj-texto)', font: '13px/1.5 var(--mj-f)', padding: '10px', resize: 'vertical' } }); prefs.value = contexto[ED.campo] || ''; }
    const lado = el('aside', { class: 'mj-painel' }, [
      ED ? el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', { text: ED.rotulo || 'Suas regras (o Jev lê isto)' }), prefs, el('p', { class: 'dim', style: { fontSize: '12px', margin: '8px 0 0' }, text: ED.ajuda || 'Mude o texto e aperte ▶ de novo: o Jev decide com as regras novas.' })]) : null,
      el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', { text: 'Placar' }), el('div', { class: 'mj-contadores' }, [
        el('div', { class: 'mj-contador' }, [kMost, el('span', { text: (F.ocultar && F.ocultar.rotuloMostrar) || 'mostrados' })]),
        el('div', { class: 'mj-contador' }, [kEsc, el('span', { text: (F.ocultar && F.ocultar.rotuloEsconder) || 'escondidos' })]),
      ])]),
      el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', {}, ['Núcleo do Jev']), el('div', { class: 'mj-nucleo', style: { flexDirection: 'row', justifyContent: 'flex-start' } }, [orbe, info])]),
      entrada, placar,
    ]);
    orbe.style.width = orbe.style.height = '56px';
    area.append(el('div', { class: 'mj-feed-wrap' }, [el('div', {}, [feed]), lado]));
  }

  function montarLinha() {
    const L = F.linha || {};
    trilho = el('div', { class: 'mj-trilho', role: 'img', 'aria-label': 'Linha do tempo dos trechos' });
    const dur = L.duracao || Math.max(...dados.map((d) => +d[L.fim || 'fim'] || 0), 1);
    const regua = el('div', { class: 'mj-regua' });
    for (let i = 0; i <= 6; i++) regua.append(el('span', { text: tempo((dur * i) / 6) }));
    listaLinha = el('div', { class: 'mj-linha-lista' });
    for (const d of dados) {
      const ini = +d[L.inicio || 'inicio'] || 0, fim = +d[L.fim || 'fim'] || ini + 10;
      const seg = el('div', { class: 'mj-seg', style: { left: (ini / dur) * 100 + '%', width: Math.max(0.6, ((fim - ini) / dur) * 100) + '%' }, title: `${tempo(ini)}–${tempo(fim)}`, 'data-id': d.id });
      seg.addEventListener('click', () => { const c = listaLinha.querySelector(`[data-id="${CSS.escape(String(d.id))}"]`); if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      trilho.append(seg);
    }
    const legenda = el('div', { class: 'mj-exemplos', style: { marginTop: '10px' } }, opcoesCol.map((o) => chip(o.rotulo, { icone: o.icone || '■', titulo: o.desc })));
    opcoesCol.forEach((o, i) => { if (o.cor) legenda.children[i].style.borderColor = o.cor; });
    area.append(
      el('section', { class: 'mj-linha-box mj-painel-box' }, [
        el('h3', { class: 'mj-sec-t' }, [L.titulo || 'Linha do tempo', el('span', { class: 'n dim', text: tempo(dur) })]),
        trilho, regua, legenda,
        el('div', { class: 'mj-nucleo', style: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: '12px' } }, [orbe, info]),
        listaLinha,
      ]),
      el('div', { class: 'mj-fluxo-baixo' }, [entrada, placar]),
    );
    orbe.style.width = orbe.style.height = '52px';
  }

  // ---------- cartões ----------
  function cartao(item, { mini = false } = {}) {
    const v = (k) => (campos[k] && item[campos[k]] != null ? item[campos[k]] : null);
    const titulo = v('titulo') ?? (item.texto ? '' : item.id);
    const c = el('article', { class: 'mj-cartao' + (mini ? ' mini' : ''), tabindex: '0', 'data-id': item.id ?? '' }, [
      el('span', { class: 'av', text: v('avatar') || F.avatar || spec.emoji || '•' }),
      el('div', { class: 'cab' }, [titulo ? el('div', { class: 't', text: titulo }) : null, v('subtitulo') || v('meta') ? el('div', { class: 'st', text: [v('subtitulo'), v('meta')].filter(Boolean).join(' · ') }) : null]),
      v('valor') != null ? el('span', { class: 'valor', text: typeof item[campos.valor] === 'number' ? fmt.brl(item[campos.valor]) : String(v('valor')) }) : el('span'),
      v('texto') || item.texto ? el('div', { class: 'txt', text: v('texto') || item.texto }) : null,
      el('div', { class: 'chips' }),
    ]);
    c.addEventListener('click', () => detalhe(item, c._resp));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter') detalhe(item, c._resp); });
    return c;
  }

  function preencherChips(c, resp) {
    c._resp = resp;
    const box = c.querySelector('.chips');
    box.innerHTML = '';
    for (const d of decs) {
      if (d.papel === 'oculto' || !resp[d.id]) continue;
      if (layout === 'colunas' && d.id === F.colunas) continue;
      const a = resp[d.id];
      if (d.tipo === 'choice') {
        const o = listaOpcoes(d, contexto).find((x) => x.id === a.choice);
        if (!o || o.esconderChip) continue;
        const ch = chip(o.rotulo, { icone: o.icone || '', tom: o.tom || 'acento', titulo: `${d.titulo || d.id}: ${fmt.pct(a.probabilities?.[a.choice])}` });
        if (o.cor) { ch.style.color = o.cor; ch.style.borderColor = o.cor; }
        box.append(ch);
      } else if (d.tipo === 'score') {
        const m = medidor(a, listaNiveis(d), { inverter: d.inverter, compacto: true });
        m.title = d.titulo || d.id;
        box.append(m);
      } else if (d.tipo === 'noul') {
        const lim = d.limiar ?? 0.5;
        if (a.noul >= lim) box.append(chip(`${d.rotulo || d.titulo || d.id} ${fmt.pct(a.noul)}`, { icone: d.icone || '', tom: d.tom || 'ruim', titulo: d.pergunta }));
      }
    }
    if (typeof spec.cartaoExtra === 'function') {
      try { const h = spec.cartaoExtra(c._item || {}, resp, contexto); if (h) box.append(el('span', { html: h })); } catch (e) { console.warn(e); }
    }
    const alerta = decs.some((d) => d.tipo === 'noul' && d.alerta && resp[d.id] && resp[d.id].noul >= (d.limiar ?? 0.5));
    c.classList.toggle('alerta', alerta);
  }

  function detalhe(item, resp) {
    const box = el('div', { class: 'mj-detalhe-dec' });
    box.append(el('div', { class: 'bloco' }, [el('h4', { text: (F.rotuloItem || spec.rotuloItem || 'Item') + ' enviado ao Jev' }), el('p', { style: { margin: 0, whiteSpace: 'pre-wrap', fontSize: '13.5px' }, text: textoDe(item) })]));
    if (!resp) { box.append(el('p', { class: 'dim', text: 'O Jev ainda não decidiu este item.' })); modal('Detalhe', box); return; }
    for (const d of decs) {
      const a = resp[d.id]; if (!a) continue;
      const b = el('div', { class: 'bloco' }, [el('h4', {}, [chip(d.tipo), d.titulo || d.id]), el('p', { class: 'dim', style: { margin: '0 0 8px', fontSize: '12.5px' }, text: d.pergunta })]);
      if (d.tipo === 'choice') {
        const ops = listaOpcoes(d, contexto);
        b.append(barras(a.probabilities, { rotulos: Object.fromEntries(ops.map((o) => [o.id, (o.icone ? o.icone + ' ' : '') + o.rotulo])), limite: 6 }));
      } else if (d.tipo === 'score') {
        const nv = listaNiveis(d);
        b.append(medidor(a, nv, { inverter: d.inverter }), barras(a.probabilities, { rotulos: Object.fromEntries(nv.map((n, i) => [String(i), n.rotulo])) }));
      } else {
        b.append(el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [anel(a.noul, { tamanho: 44 }), el('span', { text: `chance de "sim": ${fmt.pct(a.noul, 1)}` })]));
      }
      box.append(b);
    }
    modal(item[campos.titulo] || 'Decisão do Jev', box, { largo: true });
  }

  function textoDe(item) {
    if (item.texto && !item[campos.titulo]) return item.texto;
    return ['titulo', 'subtitulo', 'texto', 'meta'].map((k) => item[campos[k]]).filter(Boolean).join('\n');
  }

  // ---------- núcleo ----------
  function nucleo(ativo, html) { orbe.classList.toggle('ativo', ativo); if (html != null) info.innerHTML = html; }

  function atualizarPlacar(r, nItens) {
    estado.feitos += nItens; estado.chamadas++;
    estado.decisoes += (r._jev && r._jev.n_questions) || 0;
    estado.custo += r.custo || 0; estado.ms += r.latencia_ms || 0;
    kFeitos.textContent = fmt.int(estado.feitos); kDec.textContent = fmt.int(estado.decisoes); kCusto.textContent = fmt.usd(estado.custo);
    if (estado.feitos) kMil.textContent = fmt.usd((estado.custo / estado.feitos) * 1e6).replace(/,\d+$/, '');
  }

  // ---------- decidir um lote ----------
  async function decidirLote(itens, nos) {
    nos.forEach((n) => n.classList.add('pensando'));
    nucleo(true, `<b>${itens.length}</b> ${itens.length === 1 ? 'item' : 'itens'} no lote<br>${itens.length * decs.filter((d) => d.papel !== 'so-tela').length} perguntas`);
    let r;
    try {
      r = await decidir({ itens: itens.map((it) => (it.__meu ? { texto: it.texto, chave: it.id } : { ref: it.id, chave: it.id })), ajustes: prefs && spec.editavel && prefs.value !== (contexto[spec.editavel.campo] || '') ? prefs.value : undefined }, `lote de ${itens.length}`);
    } catch (e) {
      nos.forEach((n) => n.classList.remove('pensando'));
      nucleo(false, 'o Jev não respondeu<br>tente de novo');
      throw e;
    }
    atualizarPlacar(r, itens.length);
    nucleo(false, `lote de <b>${itens.length}</b><br><b>${fmt.ms(r.latencia_ms)}</b> · ${fmt.usd(r.custo)}`);
    return r;
  }

  // colunas: cada cartão voa para a raia da opção escolhida (ou para a revisão humana)
  async function aplicarColunas(itens, nos, r) {
    const voos = [];
    itens.forEach((it, i) => {
      const resp = r.itens[it.id] || {};
      const no = nos[i];
      no._item = it;
      no.classList.remove('pensando');
      preencherChips(no, resp);
      const a = resp[F.colunas];
      let destino = a && raias[a.choice];
      const conf = a ? confiancaDe(a) : 0;
      if (humano && a && conf < humano.limiar) destino = raiaHumano;
      if (!destino) destino = raiaHumano || Object.values(raias)[0];
      if (a) {
        const ring = anel(conf, { tamanho: 30 });
        ring.style.gridRow = '1'; ring.style.gridColumn = '3';
        const v = no.children[2];
        if (v && !v.textContent) v.replaceWith(ring); else no.querySelector('.chips').prepend(ring);
      }
      no.classList.add('mini');
      destino.c++; destino.n.textContent = destino.c;
      estado.porOpcao[a ? a.choice : '?'] = (estado.porOpcao[a ? a.choice : '?'] || 0) + 1;
      if (typeof spec.aoDecidir === 'function') { try { spec.aoDecidir(it, resp, estado.extra, contexto); } catch (e) { console.warn(e); } }
      voos.push(voar(no, () => destino.lista.prepend(no), { atraso: i * 70 }));
    });
    await Promise.all(voos);
    nFila.textContent = fila.children.length;
  }

  async function aplicarFeed(itens, nos, r) {
    const O = F.ocultar || {};
    itens.forEach((it, i) => {
      const resp = r.itens[it.id] || {};
      const no = nos[i];
      no.classList.remove('pensando');
      const box = no.querySelector('.chips'); box.innerHTML = '';
      for (const d of decs) {
        const a = resp[d.id]; if (!a || d.papel === 'oculto') continue;
        if (d.tipo === 'choice') { const o = listaOpcoes(d, contexto).find((x) => x.id === a.choice); if (o && !o.esconderChip) box.append(chip(o.rotulo, { icone: o.icone || '', tom: o.tom || 'acento' })); }
        else if (d.tipo === 'score') box.append(medidor(a, listaNiveis(d), { compacto: true, inverter: d.inverter }));
        else if (a.noul >= (d.limiar ?? 0.5) && d.id !== O.decisao) box.append(chip(`${d.rotulo || d.titulo || d.id} ${fmt.pct(a.noul)}`, { icone: d.icone || '', tom: d.tom || 'acento' }));
      }
      const dO = decs.find((d) => d.id === O.decisao);
      let esconde = false, motivo = '';
      if (dO && resp[dO.id]) {
        const a = resp[dO.id];
        if (dO.tipo === 'noul') esconde = a.noul >= (O.limiar ?? 0.6);
        else if (dO.tipo === 'choice') esconde = (O.opcoes || []).includes(a.choice) && (a.probabilities?.[a.choice] ?? 0) >= (O.limiar ?? 0.5);
        else if (dO.tipo === 'score') esconde = topo(a.probabilities)[0] && +topo(a.probabilities)[0][0] >= (O.nivel ?? 1);
        const dm = decs.find((d) => d.id === O.motivo);
        if (dm && resp[dm.id]) { const o = listaOpcoes(dm, contexto).find((x) => x.id === resp[dm.id].choice); motivo = o ? `${o.icone || ''} ${o.rotulo}`.trim() : ''; }
        motivo = motivo || (dO.tipo === 'noul' ? `${dO.rotulo || dO.titulo || ''} ${fmt.pct(a.noul)}` : '');
      }
      no.querySelector('.faixa-esc span').textContent = `Escondido pelo Jev${motivo ? ' · ' + motivo : ''}`;
      if (esconde) { no.classList.add('escondido'); estado.porOpcao.esc = (estado.porOpcao.esc || 0) + 1; }
      else estado.porOpcao.most = (estado.porOpcao.most || 0) + 1;
      kMost.textContent = estado.porOpcao.most || 0; kEsc.textContent = estado.porOpcao.esc || 0;
    });
  }

  async function aplicarLinha(itens, nos, r) {
    const L = F.linha || {};
    itens.forEach((it, i) => {
      const resp = r.itens[it.id] || {};
      const no = nos[i];
      no.classList.remove('pensando');
      no._item = it;
      preencherChips(no, resp);
      const seg = trilho.querySelector(`[data-id="${CSS.escape(String(it.id))}"]`);
      const a = resp[F.colunas];
      const o = a && opcoesCol.find((x) => x.id === a.choice);
      if (seg) {
        seg.classList.remove('pensando');
        seg.style.background = o && o.cor ? o.cor : 'var(--mj-acento)';
        seg.textContent = o && o.icone ? o.icone : '';
        seg.title = `${seg.title} · ${o ? o.rotulo : ''}`;
        if (L.estrela) {
          const ad = resp[L.estrela.decisao];
          const ok = ad && (ad.type === 'noul' ? ad.noul >= (L.estrela.limiar ?? 0.6) : ad.type === 'score' ? +topo(ad.probabilities)[0][0] >= (L.estrela.minimo ?? 2) : (L.estrela.opcoes || []).includes(ad.choice));
          seg.classList.toggle('estrela', !!ok);
          no.classList.toggle('alerta', !!ok && !!L.estrela.alerta);
        }
      }
      estado.porOpcao[a ? a.choice : '?'] = (estado.porOpcao[a ? a.choice : '?'] || 0) + 1;
      if (typeof spec.aoDecidir === 'function') { try { spec.aoDecidir(it, resp, estado.extra, contexto); } catch (e) { console.warn(e); } }
    });
  }

  // ---------- entrada do usuário ----------
  let ocupado = false;
  async function decidirMeu() {
    const t = entradaTxt.value.trim();
    if (!t || ocupado) return;
    ocupado = true; btEntrada.disabled = true;
    const it = { id: 'meu-' + Date.now(), texto: t, __meu: true, [campos.titulo]: 'Seu item' };
    if (campos.texto !== 'texto') it[campos.texto] = t;
    try {
      if (layout === 'feed') {
        const no = post(it); feed.prepend(no);
        const r = await decidirLote([it], [no]); await aplicarFeed([it], [no], r);
      } else if (layout === 'linha') {
        const no = cartao(it, { mini: true }); listaLinha.prepend(no);
        const r = await decidirLote([it], [no]); preencherChips(no, r.itens[it.id] || {});
      } else {
        const no = cartao(it); fila.prepend(no); nFila.textContent = fila.children.length;
        const r = await decidirLote([it], [no]); await aplicarColunas([it], [no], r);
      }
      entradaTxt.value = '';
    } catch { /* toast já mostrado */ } finally { ocupado = false; btEntrada.disabled = false; }
  }

  function post(item) {
    const v = (k) => (campos[k] && item[campos[k]] != null ? item[campos[k]] : null);
    const no = el('article', { class: 'mj-post', 'data-id': item.id }, [
      el('div', { class: 'pc' }, [el('span', { class: 'av', text: v('avatar') || '🙂' }), el('div', {}, [el('b', { text: v('titulo') || 'Você' }), el('span', { text: [v('subtitulo'), v('meta')].filter(Boolean).join(' · ') })])]),
      el('div', { class: 'pt', text: v('texto') || item.texto || '' }),
      el('div', { class: 'chips' }),
      el('div', { class: 'faixa-esc' }, [el('span', { text: 'Escondido pelo Jev' }), el('button', { class: 'mj-btn mj-btn--sm mj-btn--ghost', type: 'button', onclick: () => no.classList.remove('escondido') }, ['mostrar mesmo assim'])]),
    ]);
    return no;
  }

  // ---------- demonstração automática ----------
  function limpar() {
    if (resumoEl) { resumoEl.remove(); resumoEl = null; }
    Object.assign(estado, { feitos: 0, decisoes: 0, custo: 0, ms: 0, chamadas: 0, porOpcao: {}, extra: {} });
    kFeitos.textContent = '0'; kDec.textContent = '0'; kCusto.textContent = 'US$ 0'; kMil.textContent = '—';
    fila.innerHTML = '';
    nFila.textContent = '0';
    for (const r of Object.values(raias)) { r.lista.innerHTML = ''; r.c = 0; r.n.textContent = '0'; }
    if (raiaHumano) { raiaHumano.lista.innerHTML = ''; raiaHumano.c = 0; raiaHumano.n.textContent = '0'; }
    if (feed) { feed.innerHTML = ''; kMost.textContent = '0'; kEsc.textContent = '0'; }
    if (trilho) trilho.querySelectorAll('.mj-seg').forEach((s) => { s.style.background = ''; s.textContent = ''; s.classList.remove('estrela', 'pensando'); });
    if (listaLinha) listaLinha.innerHTML = '';
    nucleo(false, 'esperando<br>o primeiro lote');
  }

  async function tocar(sinal) {
    limpar();
    const t0 = performance.now();
    const pendentes = [...(F.ordemDemo ? F.ordemDemo.map((id) => dados.find((d) => d.id === id)).filter(Boolean) : dados)];
    if (layout === 'colunas') {
      const naFila = [];
      const chegar = (n) => { for (let i = 0; i < n && pendentes.length; i++) { const it = pendentes.shift(); const no = cartao(it); no.classList.add('chegou'); fila.append(no); naFila.push([it, no]); } nFila.textContent = fila.children.length; };
      chegar(Math.min(lote + 3, pendentes.length));
      await sleep(700, sinal);
      while (naFila.length) {
        const bloco = naFila.splice(0, lote);
        const r = await decidirLote(bloco.map((x) => x[0]), bloco.map((x) => x[1]));
        sinal.throwIfAborted();
        chegar(bloco.length);
        await aplicarColunas(bloco.map((x) => x[0]), bloco.map((x) => x[1]), r);
        await sleep(ritmo, sinal);
      }
    } else if (layout === 'feed') {
      while (pendentes.length) {
        const bloco = pendentes.splice(0, lote);
        const nos = bloco.map((it) => { const no = post(it); no.classList.add('pensando'); return no; });
        for (let i = nos.length - 1; i >= 0; i--) { feed.prepend(nos[i]); }
        await sleep(450, sinal);
        const r = await decidirLote(bloco, nos);
        sinal.throwIfAborted();
        await aplicarFeed(bloco, nos, r);
        await sleep(ritmo, sinal);
      }
    } else {
      while (pendentes.length) {
        const bloco = pendentes.splice(0, lote);
        const nos = bloco.map((it) => { const no = cartao(it, { mini: true }); no.classList.add('chegou'); listaLinha.append(no); trilho.querySelector(`[data-id="${CSS.escape(String(it.id))}"]`)?.classList.add('pensando'); return no; });
        const r = await decidirLote(bloco, nos);
        sinal.throwIfAborted();
        await aplicarLinha(bloco, nos, r);
        await sleep(ritmo, sinal);
      }
    }
    mostrarResumo(performance.now() - t0);
  }

  function mostrarResumo(msTotal) {
    const extra = typeof spec.resumoExtra === 'function' ? (() => { try { return spec.resumoExtra(estado.extra, estado, contexto) || []; } catch { return []; } })() : [];
    resumoEl = el('div', { class: 'mj-resumo', role: 'status' }, [
      el('span', { class: 'k destaque' }, [F.rotuloFeitos || 'itens', el('b', { text: fmt.int(estado.feitos) })]),
      el('span', { class: 'k' }, ['decisões do Jev', el('b', { text: fmt.int(estado.decisoes) })]),
      el('span', { class: 'k' }, ['tempo de Jev', el('b', { text: fmt.s(estado.ms) })]),
      el('span', { class: 'k' }, ['custo', el('b', { text: fmt.usd(estado.custo) })]),
      ...extra.map((x) => el('span', { class: 'k' }, [x.rotulo, el('b', { class: String(x.valor).length > 12 ? 'texto' : '', text: x.valor })])),
      el('button', { class: 'mj-btn mj-btn--sm', type: 'button', onclick: () => { resumoEl.remove(); resumoEl = null; } }, ['✕']),
    ]);
    document.body.append(resumoEl);
    void msTotal;
  }

  // estado inicial: a fila já mostra os primeiros itens, para a página não nascer vazia
  if (layout === 'colunas') { for (const it of dados.slice(0, Math.min(8, dados.length))) fila.append(cartao(it)); nFila.textContent = fila.children.length; }
  else if (layout === 'feed') { for (const it of dados.slice(0, 3)) feed.append(post(it)); }

  return { tocar, limpar };
}

function tempo(s) { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; }
void esc; void toast;

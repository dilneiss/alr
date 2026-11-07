(function () {
  const { fmt, el, bars, api, debounce, escapeHtml } = JevKit;
  JevKit.mountTopbar({ title: 'Detector de Golpes', tagline: 'É golpe? O Jev responde em milissegundos' });

  const $ = (id) => document.getElementById(id);
  const msg = $('msg'), live = $('live');
  let seq = 0, lastText = '';

  // ---- papelada do dossiê: data, número da prova e do laudo ----
  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const hoje = new Date();
  const dataCurta = `${String(hoje.getDate()).padStart(2, '0')} ${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`;
  $('dataColeta').textContent = hoje.toLocaleDateString('pt-BR');
  $('laudoData').textContent = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const pad3 = (n) => String(n).padStart(3, '0');
  let prova = 1, provaUsada = false, ultimoVeredito = null;
  function novaProva() { if (provaUsada) { prova++; provaUsada = false; } $('provaNum').textContent = pad3(prova); }

  // ícones das providências (SVG em traço, no lugar de emoji)
  const ICO = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    nao_responder_bloquear: ICO('<circle cx="12" cy="12" r="8.5"/><path d="M6 18 18 6"/>'),
    confirmar_por_outro_canal: ICO('<path d="M5.2 3.8h3.6l1.9 4.7-2.4 1.5a11 11 0 0 0 5.7 5.7l1.5-2.4 4.7 1.9v3.6a1.8 1.8 0 0 1-1.8 1.8A15.9 15.9 0 0 1 3.4 5.6a1.8 1.8 0 0 1 1.8-1.8z"/>'),
    contatar_banco_oficial: ICO('<path d="M3 9.5 12 4l9 5.5M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3.5 20h17"/>'),
    nao_clicar_link: ICO('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/><path d="M3.5 3.5l17 17"/>'),
    nunca_passar_codigo: ICO('<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2"/>'),
    desconfiar_promessa: ICO('<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 9.5v4.5M12 16.9v.1"/>'),
    pode_responder: ICO('<circle cx="12" cy="12" r="8.5"/><path d="m8 12.4 2.8 2.8 5.4-5.6"/>'),
  };
  const ICON_PADRAO = ICO('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>');
  const RAIO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

  const VEREDITO = {
    golpe: { badge: 'alto risco', titulo: 'É GOLPE', carimbo: 'Golpe', sub: (p) => `O Jev tem ${p} de certeza de que isto é golpe.` },
    suspeito: { badge: 'atenção', titulo: 'SUSPEITO', carimbo: 'Suspeita', sub: (p) => `Probabilidade de golpe: ${p}. Confirme antes de agir.` },
    seguro: { badge: 'baixo risco', titulo: 'PARECE SEGURO', carimbo: 'Legítima', sub: (p) => `Probabilidade de golpe: só ${p}.` },
  };

  // o rótulo do exemplo chega com um emoji na frente (ícone de chip): a ficha usa o número do caso no lugar
  const semEmoji = (s) => String(s || '').replace(/^[^\p{L}\p{N}"“'(]+/u, '').trim();

  async function loadExamples() {
    const box = $('chips');
    try {
      const r = await api('/api/exemplos', undefined, { silent: true });
      r.exemplos.forEach((ex, i) => {
        const selo = el('span', { class: 'ficha-selo', hidden: true });
        const b = el('button', { class: 'ficha', type: 'button', onclick: (e) => {
          box.querySelectorAll('.ficha').forEach((c) => c.classList.remove('active'));
          e.currentTarget.classList.add('active');
          novaProva();
          msg.value = ex.texto; ajustaAltura(); analyze({ exemplo: true, ficha: e.currentTarget });
        } }, [
          el('span', { class: 'ficha-num', text: 'Caso ' + String(i + 1).padStart(2, '0') }),
          el('span', { class: 'ficha-rot', text: semEmoji(ex.rotulo) }),
          selo,
        ]);
        b.style.setProperty('--i', i);
        box.append(b);
      });
    } catch (e) {
      box.replaceChildren(el('p', { class: 'fichas-erro', text: 'Não consegui abrir o arquivo de casos agora. Cole uma mensagem acima.' }));
    }
  }

  async function loadCounter() {
    try {
      const s = await api('/api/stats', undefined, { silent: true });
      $('counter').replaceChildren(
        el('span', { class: 'reg' }, [el('b', { text: fmt.int(s.analises) }), ' mensagens analisadas']),
        el('span', { class: 'reg reg-golpe' }, [el('b', { text: fmt.int(s.golpes) }), ' golpes detectados']),
      );
    } catch {}
  }

  function setBusy(on) {
    $('typing').hidden = !on;
    $('out').classList.toggle('stale', on);
    $('res').classList.toggle('examinando', on);
    $('res').setAttribute('aria-busy', on ? 'true' : 'false');
  }

  async function analyze(opts) {
    opts = opts || {};
    const text = msg.value.trim();
    if (text.length < 8) { if (!opts.partial) JevKit.toast('Cole uma mensagem com pelo menos algumas palavras.'); return; }
    if (opts.partial && text === lastText) return;
    lastText = text;
    const my = ++seq;
    setBusy(true);
    try {
      const r = await api('/api/analisar', { texto: text, parcial: !!opts.partial, exemplo: !!opts.exemplo }, { label: opts.partial ? 'ao vivo' : 'análise' });
      if (my !== seq) return;
      render(r, opts);
      if (!opts.partial) loadCounter();
    } catch (e) { /* toast já exibido */ }
    finally { if (my === seq) setBusy(false); }
  }

  function render(r, opts) {
    opts = opts || {};
    $('empty').hidden = true; $('out').hidden = false;
    const res = $('res');
    const v = VEREDITO[r.veredito] || VEREDITO.suspeito;
    res.classList.remove('v-golpe', 'v-suspeito', 'v-seguro');
    res.classList.add('v-' + r.veredito);
    res.classList.toggle('rascunho', !!opts.partial);
    provaUsada = true;

    // cabeçalho do laudo
    $('laudoNum').textContent = pad3(prova);
    $('laudoEstado').textContent = opts.partial ? 'rascunho, análise ao vivo' : 'laudo emitido';
    const modelo = r._jev && r._jev.request && r._jev.request.model;
    $('modelo').textContent = modelo || '';

    // I. conclusão
    $('vbadge').textContent = v.badge;
    $('vtitle').textContent = v.titulo;
    $('vsub').innerHTML = escapeHtml(v.sub(fmt.pct(r.prob_golpe))) + (r.veredito !== 'seguro' ? `<br>Tipo mais provável: <b class="grifo">${escapeHtml(r.tipo.label)}</b>` : '');
    carimbar(r, opts);
    regua($('gauge'), r.prob_golpe);

    // III. tipo de golpe
    const probs = {}; const labels = {}; const tones = {};
    r.tipo.ranking.forEach((t) => { probs[t.id] = t.p; labels[t.id] = t.label; tones[t.id] = t.id === 'nao_e_golpe' ? 'safe' : 'danger'; });
    bars($('tipos'), probs, { labels, tones });

    // IV. gravidade
    gravidade($('grav'), r.gravidade);

    // V. achados
    achados(r.sinais);

    // II. providências
    $('aic').innerHTML = ICONS[r.acao.escolha] || ICON_PADRAO;
    $('atitle').textContent = r.acao.titulo;
    $('adetail').textContent = r.acao.detalhe;

    const perMillion = (r.cost || 0) * 1e6;
    $('speed').innerHTML = `<span>${RAIO}decidido em <b>${fmt.ms(r.latency_ms)}</b>${r.cached ? ' (cache)' : ''}</span><span><b>${r.n_perguntas}</b> perguntas numa única chamada</span><span>custo <b>${fmt.usd(r.cost)}</b></span>${perMillion ? `<span>1 milhão de mensagens ≈ <b>US$ ${fmt.num(perMillion, 0)}</b></span>` : ''}`;

    // a ficha do caso arquivado ganha o selo do veredito
    if (opts.ficha) {
      const s = opts.ficha.querySelector('.ficha-selo');
      s.textContent = v.carimbo; s.dataset.v = r.veredito; s.hidden = false;
    }
    if (!opts.partial) $('anuncio').textContent = `${v.titulo}. ${v.sub(fmt.pct(r.prob_golpe))}`;
  }

  // o carimbo "bate" quando o veredito muda ou quando a análise é final (ao vivo, com o mesmo veredito, só atualiza)
  function carimbar(r, opts) {
    const c = $('carimbo');
    const v = VEREDITO[r.veredito] || VEREDITO.suspeito;
    $('carimboTxt').textContent = v.carimbo;
    $('carimboLinha').textContent = `${fmt.pct(r.prob_golpe)} · ${dataCurta}`;
    const mudou = r.veredito !== ultimoVeredito;
    ultimoVeredito = r.veredito;
    if (!mudou && opts.partial) return;
    c.style.setProperty('--rot', (-6 - Math.random() * 5).toFixed(1) + 'deg');
    c.classList.remove('bate'); void c.offsetWidth; c.classList.add('bate');
    const l = $('res'); l.classList.remove('impacto'); void l.offsetWidth; l.classList.add('impacto');
  }

  // régua de perícia: 0–100 % com os limiares do veredito (35 = suspeita, 70 = golpe)
  function regua(box, p) {
    const v = Math.max(0, Math.min(1, p || 0));
    if (!box.firstChild) {
      box.innerHTML = '<div class="rg-valor"><b></b><span>chance de golpe</span></div>'
        + '<div class="rg-escala" aria-hidden="true"><div class="rg-borda"></div><div class="rg-trilho"><i class="rg-fill"></i></div>'
        + '<i class="rg-limiar" style="left:35%"></i><i class="rg-limiar" style="left:70%"></i><div class="rg-marca"></div>'
        + '<div class="rg-nums"><span style="left:0">0</span><span class="rg-l" style="left:35%">35<em> · suspeita</em></span><span class="rg-l" style="left:70%">70<em> · golpe</em></span><span style="left:100%">100</span></div></div>';
    }
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', `chance de golpe ${Math.round(v * 100)}%`);
    box.querySelector('.rg-valor b').textContent = Math.round(v * 100) + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => box.style.setProperty('--p', v)));
  }

  // gravidade (score 0–4, contínuo): caixas preenchidas até a nota, com o nível escolhido marcado
  const GRAV = ['nenhum', 'baixo', 'médio', 'alto', 'crítico'];
  function gravidade(box, g) {
    const score = Math.max(0, Math.min(4, Number(g && g.score) || 0));
    const nivel = Math.round(score);
    const probs = (g && g.probabilities) || {};
    if (!box.querySelector('.gv-escala')) {
      const esc = el('div', { class: 'gv-escala' });
      GRAV.forEach((nome) => esc.append(el('div', { class: 'gv-nivel' }, [el('span', { class: 'gv-caixa' }, [el('i')]), el('span', { class: 'gv-nome', text: nome })])));
      box.replaceChildren(esc, el('p', { class: 'gv-nota' }));
    }
    box.querySelectorAll('.gv-nivel').forEach((n, i) => {
      n.classList.toggle('escolhido', i === nivel);
      n.title = `${GRAV[i]}: ${fmt.pct(probs[String(i)] || 0)}`;
      const f = Math.max(0, Math.min(1, 1 - (i - score)));
      requestAnimationFrame(() => n.style.setProperty('--f', f));
    });
    box.querySelector('.gv-nota').innerHTML = `nota <b>${fmt.num(score, 1)}</b> de 4 · nível <b>${GRAV[nivel]}</b>`;
  }

  // achados numerados com etiqueta de evidência; os nós são reaproveitados para o grifo animar só quando o achado passa a constatado
  const flagEls = new Map();
  function achados(sinais) {
    const box = $('flags');
    const nodes = sinais.map((s, i) => {
      let li = flagEls.get(s.id);
      if (!li) {
        li = el('li', { class: 'flag' }, [
          el('span', { class: 'tag', 'aria-hidden': 'true' }),
          el('span', { class: 'flag-nome' }, [el('span', { class: 'flag-txt', text: s.label }), el('span', { class: 'sr-only flag-st' })]),
          el('span', { class: 'fp' }),
        ]);
        flagEls.set(s.id, li);
      }
      const cls = s.p >= 0.6 ? 'on' : s.p >= 0.35 ? 'maybe' : '';
      li.title = `${s.label}: ${fmt.pct(s.p)}`;
      li.querySelector('.tag').textContent = String(i + 1).padStart(2, '0');
      li.querySelector('.fp').textContent = fmt.pct(s.p);
      li.querySelector('.flag-st').textContent = cls === 'on' ? ' (constatado)' : cls === 'maybe' ? ' (inconclusivo)' : ' (não constatado)';
      li.style.setProperty('--d', (i * 70) + 'ms');
      li.className = 'flag' + (cls ? ' ' + cls : ''); // classe na hora (como antes); o grifo anima por keyframes ao virar "on"
      return li;
    });
    box.replaceChildren(...nodes);
  }

  // a caixa cresce com a mensagem (até um teto), para a prova inteira caber no saco sem rolagem
  function ajustaAltura() { msg.style.height = 'auto'; msg.style.height = Math.min(msg.scrollHeight + 2, 340) + 'px'; }
  const liveAnalyze = debounce(() => { if (live.checked) analyze({ partial: true }); }, 550);
  msg.addEventListener('input', () => { document.querySelectorAll('.ficha').forEach((c) => c.classList.remove('active')); ajustaAltura(); liveAnalyze(); });
  msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze(); });
  $('go').addEventListener('click', () => analyze());
  $('clear').addEventListener('click', () => {
    seq++; setBusy(false);
    msg.value = ''; ajustaAltura(); lastText = ''; ultimoVeredito = null;
    $('out').hidden = true; $('empty').hidden = false;
    $('res').classList.remove('v-golpe', 'v-suspeito', 'v-seguro', 'rascunho');
    $('laudoNum').textContent = '—'; $('laudoEstado').textContent = 'aguardando prova'; $('modelo').textContent = '';
    document.querySelectorAll('.ficha').forEach((c) => c.classList.remove('active'));
    novaProva();
    msg.focus();
  });

  loadExamples(); loadCounter();
  const qp = new URLSearchParams(location.search).get('texto');
  if (qp) { msg.value = qp; ajustaAltura(); analyze(); }
})();

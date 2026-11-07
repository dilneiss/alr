(function () {
  'use strict';
  const { fmt, el, api, bars, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Escape Room', tagline: 'A aventura de texto que entende qualquer frase' });

  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const logEl = $('log'), input = $('cmd'), form = $('form'), sceneEl = $('scene');
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toque = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  let sid = null, estado = null, svg = null, salaAtual = null, clockOffset = 0;
  let pending = false, typingCmd = false, skipTyping = false, busy = 0;
  const fila = [];

  const setBusy = (d) => { busy = Math.max(0, busy + d); body.dataset.busy = busy > 0 ? '1' : '0'; };
  const TOM_NOME = { educado: 'educado', neutro: 'neutro', rude: 'rude', engracado: 'engraçado' };
  // desenhos a pena dos itens do bolso (símbolos em index.html); item desconhecido cai no emoji do jogo
  const DESENHO = { chavinha: 'i-chavinha', cartao: 'i-cartao', chip: 'i-chip' };
  const ROMANO = ['', 'I', 'II', 'III'];
  const svgUso = (id, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.append(u); return s; };
  const lamp = document.querySelector('.esc-lamp');
  function reage() { // a luz do lampião pisca quando o Jev decide
    if (!lamp || reduceMotion) return;
    lamp.classList.remove('flare'); void lamp.offsetWidth; lamp.classList.add('flare');
  }
  const ABS_NOME = { violencia: 'violência', magia: 'magia', comer_beber: 'comer/beber', fora_do_jogo: 'fora do jogo', trapaca: 'trapaça', festa: 'festa', desistir: 'desistir', sem_sentido: 'sem sentido', nada_disso: '—' };
  const SUGESTAO = {
    mesa: 'olhar a mesa', gaveta: 'abrir a gaveta', caneca: 'olhar a caneca', quadro: 'ler o quadro', retrato: 'olhar o retrato do gato',
    relogio: 'que horas o relógio marca?', cofre: 'examinar o cofre', porta_lab: 'abrir a porta de metal', bip: 'falar com o Bip',
    estante: 'olhar a estante', caixinha: 'abrir a caixinha', terminal: 'usar o terminal', frascos: 'olhar os frascos',
    porta_saida: 'abrir a porta da saída', teclado: 'digitar no teclado', planta: 'olhar a planta', capacho: 'levantar o capacho',
  };
  const mmss = (ms) => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  // ------------------------------------------------------------------ texto com máquina de escrever
  function segmentos(texto) {
    const out = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
    while ((m = re.exec(texto))) {
      if (m.index > last) out.push({ t: texto.slice(last, m.index), k: 'span' });
      const s = m[0];
      out.push(s.startsWith('**') ? { t: s.slice(2, -2), k: 'b' } : { t: s.slice(1, -1), k: 'i' });
      last = m.index + s.length;
    }
    if (last < texto.length) out.push({ t: texto.slice(last), k: 'span' });
    return out;
  }
  const rolar = () => { logEl.scrollTop = logEl.scrollHeight; };
  function escrever(container, texto, animar) {
    const nodes = segmentos(texto).map((s) => { const n = document.createElement(s.k); container.append(n); return { n, t: s.t }; });
    const total = nodes.reduce((a, x) => a + x.t.length, 0);
    if (!animar || reduceMotion || skipTyping) { nodes.forEach((x) => { x.n.textContent = x.t; }); rolar(); return Promise.resolve(); }
    const dur = Math.min(1500, Math.max(250, total * 12));
    setBusy(+1);
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        const k = skipTyping ? total : Math.floor(total * Math.min(1, (now - t0) / dur));
        let resto = k;
        for (const x of nodes) { const n = Math.min(x.t.length, Math.max(0, resto)); if (x.n.textContent.length !== n) x.n.textContent = x.t.slice(0, n); resto -= x.t.length; }
        rolar();
        if (k >= total) { setBusy(-1); resolve(); } else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
  const CLS = { narrador: 't-narr', bip: 't-bip', sucesso: 't-ok', dica: 't-dica', sabor: 't-sabor', duvida: 't-duvida', sistema: 't-sis' };
  async function linhas(turnEl, saida, animar) {
    for (const s of saida || []) {
      const d = el('div', { class: 't-line ' + (CLS[s.tipo] || 't-narr') });
      turnEl.append(d);
      await escrever(d, s.texto, animar);
    }
  }

  // ------------------------------------------------------------------ raio-x (linha no log + painel lateral)
  function linhaRaiox(rx) {
    const d = el('div', { class: 't-rx' });
    if (rx.escolhido) { d.append('você escolheu → ', el('span', { class: 'ac', text: rx.escolhido })); return d; }
    const top = rx.top || [];
    d.append(rx.duvida ? 'Jev ficou em dúvida → ' : 'Jev entendeu → ', el('span', { class: 'ac', text: rx.duvida ? (top[0] && top[0].id) || '?' : rx.acao }),
      el('span', { class: 'pc' + (rx.duvida ? ' low' : ''), text: fmt.pct(rx.duvida ? (top[0] && top[0].p) : rx.p) }),
      el('span', { text: `· tom ${TOM_NOME[rx.tom && rx.tom.escolha || rx.tom] || 'neutro'} · ${fmt.ms(rx.latency_ms)}` }));
    const mini = el('span', { class: 'mini' });
    top.slice(0, 3).forEach((t) => mini.append(el('span', {}, [t.p >= 0.01 ? el('i', { style: { width: Math.max(3, Math.round(t.p * 44)) + 'px' } }) : null, `${t.id} ${fmt.pct(t.p)}`])));
    d.append(mini);
    return d;
  }

  let acoesAntes = [];
  // instrumento em repouso (antes do primeiro comando e a cada partida nova)
  function raioxRepouso() {
    const rxEl = $('rx');
    rxEl.classList.remove('decoded'); rxEl.style.setProperty('--conf', '0');
    const c = $('rxCmd'); c.textContent = 'nenhum comando ainda'; c.className = 'vazio';
    const a = $('rxAcao'); a.textContent = 'aguardando comando'; a.className = 'vazio';
    const pc = $('rxPct'); pc.textContent = '—'; pc.className = 'rx-pct media';
  }

  // depois de recarregar: o instrumento volta a mostrar a última decisão salva (o resumo guardado no turno)
  function raioxDeTurno(t) {
    const rx = t && t.raiox; if (!rx) return;
    const p = rx.duvida ? (rx.top && rx.top[0] && rx.top[0].p) : rx.p;
    const c = $('rxCmd'); c.textContent = t.comando; c.className = '';
    const a = $('rxAcao'); a.textContent = rx.duvida ? 'dúvida' : rx.acao; a.className = rx.duvida ? 'duv' : rx.acao === 'acao_impossivel' ? 'imp' : '';
    const pc = $('rxPct'); pc.textContent = fmt.pct(p) + (rx.duvida ? ' · na dúvida' : ''); pc.className = 'rx-pct ' + (rx.duvida ? 'duv' : p >= 0.85 ? 'alta' : 'media');
    $('rx').style.setProperty('--conf', String(Math.max(0, Math.min(1, p || 0))));
  }

  function painelRaiox(comando, rx) {
    $('rxEmpty').hidden = true; $('rxBody').hidden = false;
    $('rxCmd').textContent = comando; $('rxCmd').className = '';
    const code = $('rxAcao');
    const acao = rx.duvida ? 'dúvida' : rx.acao;
    code.textContent = acao;
    code.className = rx.duvida ? 'duv' : rx.acao === 'acao_impossivel' ? 'imp' : '';
    const pct = $('rxPct');
    const p = rx.duvida ? (rx.top[0] && rx.top[0].p) : rx.p;
    pct.textContent = fmt.pct(p) + (rx.duvida ? ' · na dúvida' : '');
    pct.className = 'rx-pct ' + (rx.duvida ? 'duv' : p >= 0.85 ? 'alta' : 'media');
    // o ponteiro do mostrador vai até a confiança; a fita imprime a ação
    const rxEl = $('rx');
    rxEl.style.setProperty('--conf', String(Math.max(0, Math.min(1, p || 0))));
    rxEl.classList.remove('decoded'); void rxEl.offsetWidth; rxEl.classList.add('decoded');
    reage();
    const probs = {}; (rx.top || []).forEach((t) => { probs[t.id] = t.p; });
    bars($('rxBars'), probs, { limit: 4, tones: { acao_impossivel: 'danger' } });
    const tom = $('rxTom'); tom.innerHTML = '';
    ['educado', 'neutro', 'rude', 'engracado'].forEach((k) => {
      const v = (rx.tom.probs || {})[k] || 0;
      tom.append(el('div', { class: 'tom' + (rx.tom.escolha === k ? ' on' : '') }, [el('span', { class: 'flag', 'aria-hidden': 'true' }), el('span', { text: TOM_NOME[k] }), el('b', { text: fmt.pct(v) })]));
    });
    const ex = $('rxExtra'); ex.innerHTML = '';
    if (rx.absurdo && rx.absurdo.escolha !== 'nada_disso' && (rx.acao === 'acao_impossivel' || rx.absurdo.p >= 0.6)) ex.append(el('span', { class: 'jev-badge low', text: `absurdo: ${ABS_NOME[rx.absurdo.escolha] || rx.absurdo.escolha} ${fmt.pct(rx.absurdo.p)}` }));
    if (rx.objeto && rx.objeto.escolha !== 'nenhum') ex.append(el('span', { class: 'jev-badge info', text: `alvo: ${rx.objeto.escolha} ${fmt.pct(rx.objeto.p)}` }));
    $('rxN').textContent = `O Jev escolheu entre ${rx.n_acoes} ações válidas neste momento`;
    const chips = $('rxChips'); chips.innerHTML = '';
    const novas = acoesAntes.length ? rx.acoes.filter((id) => !acoesAntes.includes(id)) : [];
    const marcar = novas.length <= 3 ? novas : [];
    rx.acoes.forEach((id) => chips.append(el('span', { class: (id === rx.acao && !rx.duvida ? 'on' : '') + (marcar.includes(id) ? ' new' : ''), text: id, title: marcar.includes(id) ? 'ação liberada pelo seu último passo' : '' })));
    acoesAntes = rx.acoes;
    $('rxMeta').innerHTML = `<span><b>${fmt.ms(rx.latency_ms)}</b>${rx.cached ? ' (cache)' : ''}</span><span>4 perguntas · <b>1</b> chamada</span><span title="custo desta chamada"><b>${fmt.usd(rx.cost)}</b></span>`;
  }

  // ------------------------------------------------------------------ estado da partida → tela
  async function aplicarEstado(novo, efeitos) {
    const antes = estado;
    estado = novo;
    if (novo.stats && novo.stats.agora) clockOffset = novo.stats.agora - Date.now();
    body.dataset.sala = novo.sala;
    body.dataset.inv = novo.inventario.map((i) => i.id).join(',');
    body.dataset.fim = novo.fim ? '1' : '0';
    body.dataset.duvida = novo.duvida ? '1' : '0';
    body.dataset.bip = (novo.bip && novo.bip.rosto) || '';
    body.dataset.cmds = String(novo.stats.comandos);
    // cena
    if (!svg || novo.sala !== salaAtual) {
      if (svg && !reduceMotion) { sceneEl.classList.add('fade'); await sleep(200); }
      svg = EscapeScene.render(sceneEl, novo.sala); salaAtual = novo.sala;
      sceneEl.classList.remove('fade');
    }
    EscapeScene.update(svg, novo);
    if (efeitos && efeitos.alvo) EscapeScene.highlight(svg, efeitos.alvo, efeitos.efeito);
    const nomes = { escritorio: 'Escritório', laboratorio: 'Laboratório', saida: 'Saída' };
    $('sceneLabel').innerHTML = `Estampa ${ROMANO[novo.salaN] || novo.salaN} · <b>${JevKit.escapeHtml(novo.salaNome || nomes[novo.sala])}</b> · sala ${novo.salaN} de 3`;
    // inventário (bolsos)
    const inv = $('inv'); inv.innerHTML = '';
    const tinha = antes ? antes.inventario.map((i) => i.id) : novo.inventario.map((i) => i.id);
    for (let i = 0; i < 3; i++) {
      const it = novo.inventario[i];
      if (it) inv.append(el('button', { type: 'button', class: 'slot full' + (!tinha.includes(it.id) ? ' new' : ''), title: 'Examinar ' + it.nome, 'data-item': it.id, onclick: () => sugerir('examinar ' + it.nome.toLowerCase()) }, [DESENHO[it.id] ? svgUso(DESENHO[it.id], 'desenho') : el('span', { class: 'em', text: it.emoji }), it.nome]));
      else inv.append(el('span', { class: 'slot', text: '·' }));
    }
    // mapa (planta)
    document.querySelectorAll('#map .node').forEach((n) => {
      const s = n.dataset.sala;
      n.className = 'node' + (s === novo.sala ? ' here' : novo.visitadas.includes(s) ? ' seen' : '');
    });
    const portas = { lab: novo.flags.portaLabAberta, saida: novo.flags.portaSaidaAberta };
    document.querySelectorAll('#map .link').forEach((l) => { const ab = portas[l.dataset.porta]; l.className = 'link' + (ab ? ' open' : ''); l.title = ab ? 'porta aberta' : 'porta trancada'; });
    // HUD e exemplos
    $('hudCmds').textContent = fmt.int(novo.stats.comandos);
    $('hudCmdsL').textContent = novo.stats.comandos === 1 ? 'comando' : 'comandos';
    $('hudDicas').textContent = fmt.int(novo.stats.dicas);
    $('hudDicasL').textContent = novo.stats.dicas === 1 ? 'dica' : 'dicas';
    tick();
    const chips = $('chips'); chips.innerHTML = '';
    (novo.exemplos || []).forEach((t) => chips.append(el('button', { class: 'jev-chip', type: 'button', onclick: () => digitarExemplo(t) }, [t])));
    if (!novo.exemplos || !novo.exemplos.length) chips.append(el('span', { class: 'dim', text: 'Partida concluída. Que tal jogar de novo?' }));
  }

  function tick() {
    if (!estado) return;
    const s = estado.stats;
    const fim = s.fim || (Date.now() + clockOffset);
    $('hudTempo').textContent = mmss(Math.max(0, fim - s.inicio));
  }
  setInterval(tick, 500);

  // ------------------------------------------------------------------ turnos
  function novoTurno() { const t = el('div', { class: 'turn' }); logEl.append(t); rolar(); return t; }
  function botoesDuvida(turnEl, opcoes, ativas) {
    const box = el('div', { class: 't-opts' });
    const all = [...opcoes.map((o) => ({ id: o.id, txt: o.rotulo || o.id })), { id: 'nenhuma', txt: 'nenhuma dessas', ghost: true }];
    all.forEach((o) => box.append(el('button', { type: 'button', class: o.ghost ? 'ghost' : '', 'data-acao': o.id, disabled: !ativas, onclick: (e) => escolher(o.id, turnEl, box, e.currentTarget) }, [o.txt])));
    turnEl.append(box);
  }
  function renderTurnoSalvo(t, ultimo) {
    const tEl = novoTurno();
    if (t.comando) tEl.append(el('div', { class: 't-cmd', text: t.comando }));
    if (t.escolha) tEl.append(el('div', { class: 't-cmd chosen', text: t.escolha === 'nenhuma' ? 'nenhuma dessas' : `você escolheu: ${t.rotuloEscolha || t.escolha}` }));
    if (t.raiox) tEl.append(linhaRaiox(t.raiox));
    for (const s of t.saida || []) { const d = el('div', { class: 't-line ' + (CLS[s.tipo] || 't-narr') }); tEl.append(d); escrever(d, s.texto, false); }
    if (t.opcoes && t.opcoes.length) botoesDuvida(tEl, t.opcoes, ultimo && estado && estado.duvida);
  }

  async function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto) { input.focus(); return; }
    if (!sid) { toast('Clique em "Começar a fuga" primeiro.'); return; }
    if (estado && estado.fim) { toast('Você já escapou! Clique em "Jogar de novo".'); return; }
    if (pending) { if (fila.length < 2) fila.push(texto); else toast('Calma! Um comando de cada vez.'); return; }
    pending = true; body.dataset.pending = '1'; setBusy(+1); skipTyping = false;
    const tEl = novoTurno();
    tEl.append(el('div', { class: 't-cmd', text: texto }));
    const rxc = $('rxCmd'); rxc.textContent = texto; rxc.className = ''; // o instrumento já mostra a entrada enquanto decodifica
    const pensando = el('div', { class: 't-rx' }, [el('span', { class: 'thinking jev-pulse', text: 'Jev decidindo…' })]);
    tEl.append(pensando); rolar();
    try {
      const r = await api('/api/comando', { sid, texto }, { label: 'comando' });
      const rx = r.turno.raiox;
      pensando.replaceWith(linhaRaiox(rx));
      painelRaiox(texto, rx);
      body.dataset.acao = rx.duvida ? 'duvida' : rx.acao;
      const cena = aplicarEstado(r.estado, { alvo: r.alvo, efeito: r.efeito });
      if (r.efeito === 'escape') celebrar();
      await linhas(tEl, r.turno.saida, true);
      await cena;
      if (r.estado.duvida) botoesDuvida(tEl, r.estado.duvida, true);
      rolar();
      if (r.estado.fim) agendarFinal(r.estado.fim);
    } catch (e) {
      pensando.remove();
      const d = el('div', { class: 't-line t-sis' }); tEl.append(d);
      escrever(d, e.message || 'Falha ao falar com o servidor.', false);
      if (e.code === 'sessao_expirada') { LS.del('escape.sid'); sid = null; mostrarIntro(); }
      if (e.code === 'fim' && estado && estado.fim) mostrarFinal(estado.fim);
    } finally {
      pending = false; body.dataset.pending = '0'; setBusy(-1);
      if (fila.length) enviar(fila.shift());
      else if (!toque && document.activeElement !== input && !(estado && estado.fim)) input.focus();
    }
  }

  async function escolher(acao, tEl, box, btn) {
    if (pending) return;
    box.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    btn.classList.add('picked');
    pending = true; setBusy(+1); skipTyping = false;
    try {
      const r = await api('/api/escolher', { sid, acao }, { label: 'escolha' });
      const t = r.turno;
      tEl.append(el('div', { class: 't-cmd chosen', text: acao === 'nenhuma' ? 'nenhuma dessas' : `você escolheu: ${t.rotuloEscolha || acao}` }));
      body.dataset.acao = acao;
      const cena = aplicarEstado(r.estado, { alvo: r.alvo, efeito: r.efeito });
      if (r.efeito === 'escape') celebrar();
      await linhas(tEl, t.saida, true);
      await cena;
      if (r.estado.fim) agendarFinal(r.estado.fim);
    } catch (e) {
      box.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    } finally { pending = false; setBusy(-1); input.focus(); }
  }

  async function digitarExemplo(texto) {
    if (!sid) { await novaPartida(); if (!sid) return; }
    if (pending || typingCmd || (estado && estado.fim)) return;
    typingCmd = true; setBusy(+1);
    input.value = '';
    const passo = reduceMotion ? texto.length : 1;
    for (let i = passo; i <= texto.length; i += passo) { input.value = texto.slice(0, i); await sleep(14); }
    input.value = texto;
    typingCmd = false; setBusy(-1);
    input.value = '';
    enviar(texto);
  }
  function sugerir(texto) { if (!sid || (estado && estado.fim)) return; input.value = texto; input.focus(); input.setSelectionRange(texto.length, texto.length); }

  form.addEventListener('submit', (e) => { e.preventDefault(); const t = input.value; input.value = ''; enviar(t); });
  logEl.addEventListener('click', () => { skipTyping = true; });
  input.addEventListener('keydown', () => { if (busy && !pending) skipTyping = true; });
  sceneEl.addEventListener('click', (e) => { const g = e.target.closest && e.target.closest('[data-obj]'); if (g && SUGESTAO[g.dataset.obj]) sugerir(SUGESTAO[g.dataset.obj]); });

  // ------------------------------------------------------------------ início / retomada / final
  function mostrarIntro() { $('intro').hidden = false; $('final').hidden = true; carregarInfo(); }
  function rankingItens(lista, voce, vazio) {
    if (!lista || !lista.length) return `<li class="empty"><span></span><span class="n dim">${vazio || 'Ninguém escapou hoje ainda. Seja o primeiro!'}</span></li>`;
    return lista.map((e) => `<li class="${e.id === voce ? 'me' : ''}"><span class="p">${e.pos}º</span><span class="n">${JevKit.escapeHtml(e.apelido)}</span><span class="t">${mmss(e.tempo_ms)}</span><span class="c">${e.comandos} cmd</span></li>`).join('');
  }
  async function carregarInfo() {
    try {
      const r = await api('/api/info', undefined, { silent: true });
      $('introRank').innerHTML = `<div class="rank-t"><b>Ranking de hoje</b> · ${fmt.int(r.stats.partidas)} partidas, ${fmt.int(r.stats.fugas)} fugas</div><ol class="rank">${rankingItens(r.ranking.slice(0, 5))}</ol>`;
      if (!sid && r.exemplos) { const chips = $('chips'); chips.innerHTML = ''; r.exemplos.forEach((t) => chips.append(el('button', { class: 'jev-chip', type: 'button', onclick: () => digitarExemplo(t) }, [t]))); }
    } catch {}
  }

  async function novaPartida() {
    setBusy(+1);
    try {
      const r = await api('/api/novo', {}, { label: 'nova partida' });
      sid = r.sid; LS.set('escape.sid', sid);
      logEl.innerHTML = ''; acoesAntes = []; fila.length = 0;
      $('rxEmpty').hidden = false; $('rxBody').hidden = true; raioxRepouso();
      $('intro').hidden = true; $('final').hidden = true;
      const livro = $('game'); livro.classList.remove('abrindo'); void livro.offsetWidth; livro.classList.add('abrindo');
      await aplicarEstado(r.estado);
      const tEl = novoTurno();
      skipTyping = false;
      await linhas(tEl, r.turnos[0].saida, true);
      input.focus();
    } catch (e) { /* toast já exibido */ } finally { setBusy(-1); }
  }

  async function retomar(s) {
    try {
      const r = await api('/api/estado', { sid: s }, { silent: true });
      sid = s;
      await aplicarEstado(r.estado);
      logEl.innerHTML = '';
      r.turnos.forEach((t, i) => renderTurnoSalvo(t, i === r.turnos.length - 1));
      raioxDeTurno([...r.turnos].reverse().find((t) => t.raiox && t.comando));
      $('intro').hidden = true;
      if (r.estado.fim) mostrarFinal(r.estado.fim);
      rolar();
      return true;
    } catch { LS.del('escape.sid'); return false; }
  }

  function agendarFinal(fim) {
    const deQual = sid;
    setTimeout(() => { if (sid === deQual) mostrarFinal(fim); }, 1800);
  }
  function mostrarFinal(fim) {
    $('final').hidden = false;
    $('finTitulo').textContent = fim.titulo;
    const kp = $('finKpis'); kp.innerHTML = '';
    const kpi = (k, v, s) => el('div', { class: 'jev-kpi' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null]);
    kp.append(
      kpi('Tempo', mmss(fim.tempo_ms)),
      kpi('Comandos', fmt.int(fim.comandos), `${fmt.int(fim.dicas)} dica(s)`),
      kpi('Entendidos', fmt.pct(fim.precisao), 'de primeira'),
      kpi('Latência média', fmt.ms(fim.lat_media), 'por decisão'),
      kpi('Decisões do Jev', fmt.int(fim.decisoes), '1 chamada por comando'),
      kpi('Custo da partida', fmt.usd(fim.custo), 'em chamadas ao Jev'),
    );
    $('finTons').innerHTML = 'Seu tom, segundo o Jev: ' + ['educado', 'neutro', 'rude', 'engracado'].map((k) => `${TOM_NOME[k]} <b>${fmt.int(fim.tons[k] || 0)}</b>`).join(' · ');
    $('finForm').hidden = !!fim.ranqueado;
    carregarRanking();
  }
  async function carregarRanking(voce) {
    try { const r = await api('/api/ranking', undefined, { silent: true }); $('finRank').innerHTML = rankingItens(r.ranking, voce, 'Ranking de hoje vazio: coloque seu apelido e seja o 1º!'); } catch {}
  }
  $('finForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('finSalvar'); btn.disabled = true;
    try {
      const r = await api('/api/ranking', { sid, apelido: $('finApelido').value }, { label: 'apelido' });
      $('finForm').hidden = true;
      if (estado && estado.fim) estado.fim.ranqueado = true;
      $('finRank').innerHTML = rankingItens(r.ranking, r.voce);
      toast(r.moderado ? 'Apelido trocado por "Fugitivo anônimo" (o Jev achou impróprio).' : r.posicao ? `Você é o ${r.posicao}º de hoje!` : 'Fuga registrada! Hoje ela ficou fora das 50 mais rápidas.', 'ok');
    } catch {} finally { btn.disabled = false; }
  });
  $('finDeNovo').addEventListener('click', () => novaPartida());
  $('finInspect').addEventListener('click', () => JevKit.inspector.open());
  $('btnStart').addEventListener('click', () => novaPartida());

  let resetArmado = null;
  $('btnReset').addEventListener('click', () => {
    const b = $('btnReset');
    const emJogo = estado && !estado.fim && estado.stats.comandos > 0;
    if (emJogo && !resetArmado) {
      const rotulo = b.innerHTML;
      b.textContent = 'Certeza? Clique de novo';
      resetArmado = setTimeout(() => { resetArmado = null; b.innerHTML = rotulo; }, 3000);
      b.dataset.rotulo = rotulo;
      return;
    }
    clearTimeout(resetArmado); resetArmado = null; if (b.dataset.rotulo) b.innerHTML = b.dataset.rotulo;
    novaPartida();
  });

  function celebrar() {
    const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (reduceMotion) return;
    const cores = ['#C8A15A', '#EBDDBF', '#E6C47E', '#7B1E22', '#F4EAD3', '#8A6A2F'];
    for (let i = 0; i < 90; i++) {
      const c = el('div', { class: 'confetti', style: { left: Math.random() * 100 + 'vw', background: cores[i % cores.length], animationDelay: Math.random() * 0.8 + 's', animationDuration: 2.4 + Math.random() * 1.6 + 's', transform: `rotate(${Math.random() * 360}deg)` } });
      document.body.append(c);
      setTimeout(() => c.remove(), 5000);
    }
  }

  // raio-x liga/desliga (lembrado neste navegador)
  const rxT = $('rxToggle');
  if (LS.get('escape.rx') === '0') rxT.checked = false;
  const aplicaRx = () => { body.classList.toggle('no-rx', !rxT.checked); LS.set('escape.rx', rxT.checked ? '1' : '0'); };
  rxT.addEventListener('change', aplicaRx); aplicaRx();

  // arranque: mostra o escritório ao fundo e retoma a partida salva, se houver
  setTimeout(() => body.classList.remove('entrada'), 2200); // fim da entrada orquestrada
  (async () => {
    setBusy(+1);
    svg = EscapeScene.render(sceneEl, 'escritorio'); salaAtual = 'escritorio';
    EscapeScene.update(svg, { flags: {}, bip: { rosto: 'confuso' }, sala: 'escritorio' });
    const salvo = LS.get('escape.sid');
    const ok = salvo ? await retomar(salvo) : false;
    if (!ok) mostrarIntro();
    setBusy(-1);
  })();
})();

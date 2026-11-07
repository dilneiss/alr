(function () {
  const { fmt, el, api, sse, toast, escapeHtml } = JevKit;
  JevKit.mountTopbar({ title: 'QA Adversarial', tagline: 'O Jev pilota o navegador e caça bugs' });

  const $ = (id) => document.getElementById(id);
  const HOST = location.host;

  // ---------- ícones da interface, em traço de nanquim (no lugar dos emojis) ----------
  const svgi = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO = {
    link: svgi('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2"/>'),
    clique: svgi('<path d="M6 3.5l12.5 6.3-5.4 1.8-1.9 5.6z"/><path d="M13.3 11.8l4.6 4.6"/>'),
    duplo: svgi('<path d="M9 8.5l10.5 5.2-4.5 1.5-1.6 4.6z"/><path d="M5.2 9.2a5.5 5.5 0 0 1 3.4-3.7"/><path d="M2.6 8.2a8.6 8.6 0 0 1 5.2-5.6"/>'),
    digitar: svgi('<rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><path d="M7 9.5v5M5.8 9.5h2.4M5.8 14.5h2.4"/>'),
    inicio: svgi('<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.8V20h12V9.8"/><path d="M10 20v-5h4v5"/>'),
    voltar: svgi('<path d="M9 5.5 3.5 11 9 16.5"/><path d="M3.5 11H14a5.5 5.5 0 0 1 0 11h-2.5"/>'),
    erro: svgi('<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>'),
    ponto: svgi('<circle cx="12" cy="12" r="6.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
  };
  const ICON_ACAO = { clicar_link: ICO.link, clicar: ICO.clique, clique_duplo: ICO.duplo, preencher: ICO.digitar, navegar: ICO.inicio, voltar: ICO.voltar, erro: ICO.erro };
  const CAT_TONE = { crash_js: 't-pin', erro_servidor: 't-pin', duplicidade: 't-pin', calculo_errado: 't-ocre', validacao_fraca: 't-ocre', layout_quebrado: 't-lab', link_quebrado: 't-lab', outro_problema: 't-wood' };
  const SEV_COR = ['var(--sev0)', 'var(--sev1)', 'var(--sev2)', 'var(--sev3)'];
  const SEV_TXT = ['cosmético', 'moderado', 'grave', 'crítico'];

  // ---------- taxonomia: a categoria que o Jev escolhe na triagem vira a espécie do espécime ----------
  const ESPECIE = {
    crash_js: ['Exceptio javascriptica', 'besouro'],
    erro_servidor: ['Servitor quingentus', 'mariposa'],
    calculo_errado: ['Calculus erraticus', 'percevejo'],
    validacao_fraca: ['Validatio debilis', 'mosca'],
    layout_quebrado: ['Layoutus fractus', 'libelula'],
    link_quebrado: ['Nexus perditus', 'formiga'],
    duplicidade: ['Duplicata gemina', 'joaninhas'],
    outro_problema: ['Incertae sedis', 'gorgulho'],
  };
  // onde o alfinete atravessa o tórax (em % da figura); as joaninhas gêmeas levam um alfinete cada
  const ALVO_PINO = {
    besouro: [[52.5, 34]], mariposa: [[51.5, 36]], percevejo: [[52.5, 42]], mosca: [[52, 38.5]],
    libelula: [[51.5, 27]], formiga: [[51.5, 38]], joaninhas: [[30.5, 45], [72.5, 45]], gorgulho: [[52, 32]],
  };
  const PINO_SVG = '<svg viewBox="0 0 12 38" aria-hidden="true" focusable="false"><path d="M6 8v30" stroke="#8E918F" stroke-width="1.3" stroke-linecap="round"/><path d="M6.6 9v28" stroke="rgba(255,255,255,.6)" stroke-width=".5"/><circle cx="6" cy="6" r="4.8" fill="#C4302B" stroke="#8E1F1B" stroke-width=".7"/><circle cx="4.5" cy="4.4" r="1.5" fill="rgba(255,255,255,.78)"/></svg>';

  // ---------- ilustrações dos espécimes (vista dorsal, nanquim com aguada) ----------
  const TINTA = '#1C1B19';
  const espelho = (s) => s + `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
  const pernas = (d, w = 1.5) => `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const forma = (d, fill, w = 1.3) => `<path d="${d}" fill="${fill}" stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const traco = (d, stroke = TINTA, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const elipse = (cx, cy, rx, ry, fill, w = 1.3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${TINTA}" stroke-width="${w}"/>`;
  const DESENHO = {
    besouro: () =>
      espelho(pernas('M59 33 L69 29 L73 20 L76 16') + pernas('M64 47 L76 47 L83 40') + pernas('M63 60 L74 70 L80 84') +
        traco('M53 19 Q58 13 61 9') + `<ellipse cx="62" cy="8" rx="2.2" ry="2.6" fill="${TINTA}"/>`) +
      elipse(50, 22.5, 6.5, 5, '#3B2A1D') +
      forma('M39 29 Q50 24.5 61 29 L63 38 Q50 41.5 37 38 Z', '#4A3322') +
      forma('M50 39 C64 39 69.5 50 68.5 62 C67.5 76 58.5 86 50 88.5 C41.5 86 32.5 76 31.5 62 C30.5 50 36 39 50 39 Z', '#34261B') +
      traco('M50 40 L50 88') +
      traco('M41 46 Q37.5 56 39.5 70', 'rgba(255,248,230,.5)', 2.2) + traco('M58.5 46 Q61 52 61.5 58', 'rgba(255,248,230,.32)', 1.6),
    mariposa: () =>
      espelho(
        forma('M54 35 C65 25 85 19 95.5 23 C97 33 89 46 77 52 C68 55.5 60 54.5 54 50 Z', '#D9C49B') +
        traco('M60 40 Q75 33 91 27', '#6B4A2F', 1.2) + traco('M62 47 Q74 43 86 41', '#8C6645', 1) +
        `<circle cx="76.5" cy="41" r="4.6" fill="#6B4A2F" stroke="${TINTA}" stroke-width=".9"/><circle cx="76.5" cy="41" r="1.8" fill="#F4F0E4"/>` +
        forma('M54 51 C64 53 78 57.5 82.5 65.5 C80.5 76 68.5 80.5 58.5 72.5 C55.5 66.5 54 58 54 51 Z', '#CBB283') +
        traco('M58 58 Q68 62 76 68', '#8C6645', 1) +
        traco('M52 21 Q57 13 63 5.5') + traco('M55 16.5 l3.2 .9 M57 13.5 l3.2 .6 M59 10.5 l3 .2 M61 8 l2.6 -.3 M55 16.5 l-.4 -3 M57 13.5 l-.8 -2.8 M59 10.5 l-1 -2.4', TINTA, .8)
      ) +
      `<circle cx="50" cy="24" r="4.2" fill="#6B4A2F" stroke="${TINTA}" stroke-width="1.2"/>` +
      elipse(50, 36, 5.6, 8, '#8C6645') + elipse(50, 58.5, 4.6, 14, '#7A583A') +
      traco('M46 52 L54 52 M45.6 57 L54.4 57 M45.8 62 L54.2 62 M46.6 67 L53.4 67', TINTA, .8),
    percevejo: () =>
      espelho(pernas('M60 33 L71 27 L77 21') + pernas('M65 48 L79 50 L85 45') + pernas('M62 62 L74 72 L78 84') +
        traco('M53 17 L59 10 L66 4', TINTA, 1.3) + `<circle cx="59" cy="10" r="1.2" fill="${TINTA}"/><circle cx="66" cy="4" r="1.3" fill="${TINTA}"/>`) +
      forma('M45 14 L55 14 L57.5 24 L42.5 24 Z', '#6B4A2F') +
      forma('M42.5 24 L57.5 24 L73 36.5 L27 36.5 Z', '#8C6645') +
      forma('M27 36.5 L73 36.5 L70.5 60 L50 89 L29.5 60 Z', '#B08A5A') +
      forma('M37.5 36.5 L62.5 36.5 L50 67 Z', '#8C6645', 1.1) +
      traco('M43 77 L50 89 L57 77', TINTA, .9) + traco('M31 44 L35 58 M69 44 L65 58', 'rgba(28,27,25,.35)', .9),
    mosca: () =>
      espelho(
        pernas('M56 34 L64 28 L70 23', 1.2) + pernas('M58 45 L68 51 L74 59', 1.2) + pernas('M57 53 L66 65 L70 77', 1.2) +
        forma('M56 36 C70 33 88 43 90.5 57.5 C91 66 82.5 68.5 74 62.5 C66 56.5 58 46.5 56 36 Z', 'rgba(31,78,156,.10)', 1) +
        traco('M58 40 Q72 46 86.5 58 M60 44.5 Q69.5 54 77.5 62.5 M66 39 Q72 47 71 56', 'rgba(28,27,25,.45)', .8)
      ) +
      elipse(50, 24, 9.2, 6.6, '#6B4A2F') + elipse(44, 23.2, 4.3, 5, '#9E3B23', 1) + elipse(56, 23.2, 4.3, 5, '#9E3B23', 1) +
      elipse(50, 38.5, 8, 8.6, '#3B2A1D') + traco('M47 33 L47 43 M53 33 L53 43', 'rgba(244,240,228,.45)', 1) +
      elipse(50, 60.5, 9, 13, '#5A4632') + traco('M41.5 56 Q50 59.5 58.5 56 M41.8 64 Q50 67.5 58.2 64', TINTA, .9),
    // Layoutus fractus: as asas passam da caixa (de propósito)
    libelula: () =>
      espelho(
        forma('M54 23.5 C66 17 90 15 104 19.5 C104.5 24.5 94 26.5 80 26.8 C69 27.2 60.5 27.6 54 28 Z', 'rgba(31,78,156,.12)', .9) +
        forma('M54 30 C66 28.8 88 30 103 36.5 C102 41.5 90 41.6 78 38.6 C67 36.2 60 34.4 54 33.2 Z', 'rgba(31,78,156,.12)', .9) +
        traco('M57 25.5 Q78 21 100 21.5 M57 31.5 Q78 32.5 99 37.5', 'rgba(28,27,25,.4)', .7) +
        pernas('M53.5 28.5 L57.5 34 M53.5 31 L57 37.5', 1.1)
      ) +
      elipse(50, 15, 6.8, 4.8, '#1F4E9C') + '<circle cx="46.2" cy="14" r="2.6" fill="#163A77"/><circle cx="53.8" cy="14" r="2.6" fill="#163A77"/>' +
      elipse(50, 27, 4.6, 6.2, '#1F4E9C') + forma('M48 33 L52 33 L51.5 93 Q50 96.5 48.5 93 Z', '#2A5CAE', 1.1) +
      traco('M48.2 40 L51.8 40 M48.3 47 L51.7 47 M48.4 54 L51.6 54 M48.5 61 L51.5 61 M48.6 68 L51.4 68 M48.7 75 L51.3 75 M48.8 82 L51.2 82 M48.9 88 L51.1 88', 'rgba(244,240,228,.7)', .8),
    // Nexus perditus: uma antena partida (o link quebrado)
    formiga: () =>
      espelho(pernas('M54 36 L64 30 L70 21.5', 1.3) + pernas('M54.5 41 L66.5 44 L75 39.5', 1.3) + pernas('M54 45 L64 56 L72.5 66.5', 1.3)) +
      traco('M47 18.5 L42 10 L33.5 12.5', TINTA, 1.3) + traco('M53 18.5 L57.2 11.2', TINTA, 1.3) + traco('M59.4 9.6 L64.8 13.4', TINTA, 1.3) +
      '<circle cx="58.3" cy="10.4" r=".8" fill="#C4302B"/>' +
      elipse(50, 24, 7, 7, '#3B2A1D') + traco('M47.2 17.6 Q45 13.8 46.8 11.4 M52.8 17.6 Q55 13.8 53.2 11.4', TINTA, 1.1) +
      elipse(50, 39, 4.6, 7.6, '#4E3421') + elipse(50, 50.2, 2.5, 3, '#4E3421', 1.1) + elipse(50, 65.5, 9.2, 12.3, '#3B2A1D') +
      traco('M43 60 Q50 62.5 57 60 M42.5 67 Q50 69.5 57.5 67', 'rgba(244,240,228,.35)', 1),
    // Duplicata gemina: duas joaninhas idênticas (o pedido em dobro)
    joaninhas: () => {
      const p = pernas('M8.5 -4 L14 -8.5', 1.2) + pernas('M10 2 L16 3', 1.2) + pernas('M8.5 8 L13 13.5', 1.2);
      const uma = p + `<g transform="scale(-1 1)">${p}</g>` +
        `<path d="M-6.4 -10.4 Q0 -17 6.4 -10.4 Z" fill="${TINTA}" stroke="${TINTA}" stroke-width="1.1"/>` +
        '<circle cx="-2.6" cy="-12.6" r="1.1" fill="#F4F0E4"/><circle cx="2.6" cy="-12.6" r="1.1" fill="#F4F0E4"/>' +
        `<circle cx="0" cy="1.5" r="12.2" fill="#C4302B" stroke="${TINTA}" stroke-width="1.2"/><path d="M0 -10.6 L0 13.6" stroke="${TINTA}" stroke-width="1"/>` +
        `<circle cx="-5.3" cy="-3.2" r="2.3" fill="${TINTA}"/><circle cx="5.3" cy="-3.2" r="2.3" fill="${TINTA}"/><circle cx="-6.2" cy="5.6" r="2.1" fill="${TINTA}"/><circle cx="6.2" cy="5.6" r="2.1" fill="${TINTA}"/><circle cx="0" cy="10" r="1.7" fill="${TINTA}"/>` +
        '<path d="M-7.5 -6 Q-9.5 -1 -8 3" fill="none" stroke="rgba(255,248,230,.55)" stroke-width="1.4" stroke-linecap="round"/>';
      return `<g transform="translate(29 50) scale(1.3)">${uma}</g><g transform="translate(71 50) scale(1.3)">${uma}</g>`;
    },
    // Incertae sedis: gorgulho de focinho comprido
    gorgulho: () =>
      espelho(pernas('M56 34 L66 30 L72 21', 1.4) + pernas('M60 48 L72 50 L78.5 45.5', 1.4) + pernas('M60 60 L70 70 L74.5 80.5', 1.4) +
        traco('M51.6 12 L57 9.5 L62.5 13.5', TINTA, 1.1) + `<ellipse cx="63" cy="14.3" rx="1.6" ry="2" fill="${TINTA}"/>`) +
      forma('M48.5 3.5 L51.5 3.5 L52.2 18 L47.8 18 Z', '#6B4A2F', 1.1) +
      `<circle cx="50" cy="21" r="4.6" fill="#6B4A2F" stroke="${TINTA}" stroke-width="1.2"/>` +
      elipse(50, 31.5, 8.2, 7, '#8C6645') + elipse(50, 57.5, 13.2, 20.5, '#B08A5A') + traco('M50 38.5 L50 77.5') +
      traco('M44.5 42 Q42.5 57 45 72 M55.5 42 Q57.5 57 55 72', 'rgba(28,27,25,.35)', .9, 'stroke-dasharray="1.2 2.2"'),
    // bandeja vazia: o contorno à espera do espécime
    vazio: () =>
      '<g fill="none" stroke="rgba(28,27,25,.44)" stroke-width="1.3" stroke-dasharray="2.6 2.8" stroke-linecap="round">' +
      '<ellipse cx="50" cy="23" rx="6.5" ry="5"/><path d="M39 29 Q50 24.5 61 29 L63 38 Q50 41.5 37 38 Z"/>' +
      '<path d="M50 39 C64 39 69.5 50 68.5 62 C67.5 76 58.5 86 50 88.5 C41.5 86 32.5 76 31.5 62 C30.5 50 36 39 50 39 Z"/></g>' +
      '<circle cx="52.5" cy="34" r="2" fill="rgba(196,48,43,.55)"/>',
  };
  const inseto = (tipo, cls) => `<svg class="${cls || 'inseto'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${(DESENHO[tipo] || DESENHO.besouro)()}</svg>`;
  const especieDe = (b) => ESPECIE[b.categoria] || ESPECIE.outro_problema;
  const nivel = (b) => Math.max(0, Math.min(3, Math.round(b.severidade)));
  const pips = (sev, cls) => `<span class="${cls}" role="img" aria-label="severidade: ${SEV_TXT[sev]}" title="severidade: ${SEV_TXT[sev]}" style="--sc:${SEV_COR[sev]}">` +
    [0, 1, 2, 3].map((i) => `<i${i <= sev ? ' class="on"' : ''}></i>`).join('') + '</span>';

  // data da coleta à moda das etiquetas de museu (mês em romanos)
  const ROMANO = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const hoje = new Date();
  $('fichaData').textContent = `coleta de ${hoje.getDate()}.${ROMANO[hoje.getMonth()]}.${hoje.getFullYear()}`;
  $('capic').innerHTML = ICO.ponto;

  let total = 9, maxSteps = 70, maxMs = 120000;
  let startTs = 0, timer = null, rodando = false, custoAtual = 0;
  const bugsVistos = new Set();
  // as bandejas nascem de /api/info; o que chegar antes pela transmissão espera por elas
  let bandejasProntas = false;
  const filaBandejas = [];
  const naBandeja = (fn) => (bandejasProntas ? fn() : filaBandejas.push(fn));
  const soltarFila = () => { bandejasProntas = true; filaBandejas.splice(0).forEach((fn) => fn()); };

  function setRunning(on) {
    rodando = on;
    const b = $('run');
    b.disabled = on;
    b.classList.toggle('on', on);
    b.querySelector('.run-lbl').textContent = on ? 'Testando…' : 'Testar a Loja Bugada';
    $('rec').hidden = !on;
    document.body.classList.toggle('qa-rodando', on);
    if (on) { startTs = Date.now(); if (timer) clearInterval(timer); timer = setInterval(tickTime, 100); }
    else if (timer) { clearInterval(timer); timer = null; }
  }
  // o tempo na ficha é sempre em segundos (o fmt.ms do kit só troca para segundos acima de 10 s)
  const segundos = (ms) => (Math.max(0, ms) / 1000).toFixed(1).replace('.', ',') + ' s';
  function tickTime() { if (startTs) $('kTime').textContent = segundos(Date.now() - startTs); }

  function bandeja(b, i, extraId) {
    const t = el('li', extraId
      ? { class: 'tray extra', 'data-bug': extraId, style: `--i:${i}` }
      : { class: 'pchip tray', 'data-id': b.id, title: b.titulo + ' — ' + b.onde, style: `--i:${i}` });
    t.innerHTML = `<span class="tray-fig">${inseto('vazio', 'ghost')}</span><span class="tray-label"><b class="tray-name">${escapeHtml(b.curto)}</b><i class="tray-sp">${extraId ? '' : 'aguardando coleta'}</i><span class="tray-meta"></span></span>`;
    return t;
  }
  function esvaziar(t) {
    t.classList.remove('found', 'instant');
    t.querySelectorAll('.specimen, .pin, .pin-sh, .dent, .tray-sev').forEach((n) => n.remove());
    t.querySelector('.tray-sp').textContent = 'aguardando coleta';
    t.querySelector('.tray-meta').innerHTML = '';
  }

  function resetBoard() {
    $('log').innerHTML = '<li class="empty-log">Ajustando o microscópio… a primeira decisão do Jev chega em instantes.</li>';
    $('bugs').innerHTML = '<div class="empty-log" id="bugsEmpty">Nenhum espécime ainda. Cada bug confirmado pelo Jev ganha uma ficha aqui.</div>';
    $('final').className = 'final';
    bugsVistos.clear();
    filaBandejas.length = 0;
    custoAtual = 0;
    $('scoreN').textContent = '0'; $('scoreFill').style.width = '0%';
    $('kSteps').textContent = '0'; $('kCost').textContent = 'US$ 0'; $('kTime').textContent = '0,0 s';
    document.querySelectorAll('.pchip').forEach(esvaziar);
    document.querySelectorAll('.tray.extra').forEach((t) => t.remove());
    $('screen').removeAttribute('src');
    $('holder').hidden = true; $('screen').hidden = false; $('stepbadge').hidden = false;
    $('stepbadge').textContent = 'passo 0'; $('urlpath').textContent = HOST + '/alvo/';
    $('obsIdle').textContent = 'Nenhuma observação ainda.';
  }

  function updatePlacar(p) {
    if (!p) return;
    const n = $('scoreN');
    if (String(p.encontrados) !== n.textContent) { n.textContent = p.encontrados; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }
    $('scoreFill').style.width = Math.round((p.encontrados / total) * 100) + '%';
    $('kSteps').textContent = fmt.int(p.passos);
    if (p.custo != null) { custoAtual = p.custo; $('kCost').textContent = fmt.usd(p.custo); }
    $('scoreLbl').textContent = p.extras > 0 ? `${p.encontrados} do gabarito + ${p.extras} extra(s), confirmados pelo Jev` : 'bugs reais confirmados pelo Jev';
  }

  function addLog(d) {
    const a = d.acao || {};
    const hit = d.achados > 0;
    const topo = (a.top && a.top[0]) || null;
    const prob = topo ? `<span class="prob" title="probabilidade que o Jev deu à ação escolhida"><span class="mini"><i style="width:${Math.round(topo.p * 100)}%"></i></span>${fmt.pct(topo.p)}</span>` : '';
    const row = el('li', { class: 'logrow' + (hit ? ' hit' : ''), html:
      `<span class="n">${d.step}</span>` +
      `<span class="ic">${ICON_ACAO[a.tipo] || ICO.ponto}</span>` +
      `<div class="mid"><div class="act" title="${escapeHtml(a.resumo)}">${escapeHtml(a.resumo)}</div>` +
      `<div class="meta">${a.estrategia ? `<span class="strat">${escapeHtml(a.estrategia.replace(/_/g, ' '))}</span>` : ''}${prob}${hit ? '<span class="hitmark">achou bug!</span>' : ''}</div></div>` +
      `<span class="rt">${fmt.ms(a.latency_ms)}</span>` });
    const log = $('log');
    const f = log.firstElementChild;
    if (f && f.classList.contains('empty-log')) log.innerHTML = '';
    log.prepend(row);
    while (log.children.length > 60) log.lastElementChild.remove();
  }

  function setTela(d) {
    const img = $('screen');
    img.src = d.jpeg;
    img.hidden = false; $('holder').hidden = true;
    $('urlpath').textContent = HOST + (d.url || '/alvo/');
    $('stepbadge').hidden = false; $('stepbadge').textContent = 'passo ' + d.step;
    if (d.legenda) { $('caption').hidden = false; $('captext').textContent = d.legenda; $('captext').title = d.legenda; }
    const v = $('view'); v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash');
  }

  // o espécime é alfinetado na bandeja do bug plantado; achados extras ganham bandeja nova (sp. nov.)
  function alfinetar(b, quieto, quando) {
    let t = b.gabarito !== false ? document.querySelector('.pchip[data-id="' + CSS.escape(b.id) + '"]') : null;
    if (!t) t = document.querySelector('.tray.extra[data-bug="' + CSS.escape(b.id) + '"]');
    if (!t) { t = bandeja({ curto: b.curto || b.titulo }, $('planted').children.length, b.id); $('planted').append(t); }
    if (t.classList.contains('found')) return;
    const [nome, tipo] = especieDe(b);
    const sev = nivel(b);
    const pinos = (ALVO_PINO[tipo] || [[52, 35]]).map(([x, y]) => {
      const s = `style="--px:${x};--py:${y}"`;
      return `<span class="pin-sh" ${s}></span><span class="dent" ${s}></span><span class="pin" ${s}>${PINO_SVG}</span>`;
    }).join('');
    t.querySelector('.tray-fig').insertAdjacentHTML('beforeend', `<span class="specimen">${inseto(tipo)}</span>${pinos}`);
    t.querySelector('.tray-sp').innerHTML = escapeHtml(nome) + (b.gabarito ? '' : ' <span class="spnov">sp. nov.</span>');
    t.querySelector('.tray-meta').innerHTML = `<span>passo ${b.passo}</span>${quando ? `<span title="momento da coleta">${quando}</span>` : ''}<span title="chance de ser bug real, na triagem do Jev">${fmt.pct(b.prob_bug)}</span>`;
    t.insertAdjacentHTML('beforeend', pips(sev, 'sevpips tray-sev'));
    if (quieto) t.classList.add('instant');
    t.classList.add('found');
  }

  function addBug(d, modo) {
    const b = d.bug;
    const quieto = modo === 'replay';
    // momento da coleta no relógio da ficha; quem entra no meio recebe os achados já feitos de uma vez (< 1,5 s): sem horário
    const decorrido = startTs ? Date.now() - startTs : 0;
    const quando = !quieto && rodando && decorrido >= 1500 ? segundos(decorrido) : '';
    naBandeja(() => alfinetar(b, quieto, quando));
    if (bugsVistos.has(b.id)) { updatePlacar(d.placar); return; }
    bugsVistos.add(b.id);
    $('bugsEmpty') && $('bugsEmpty').remove();
    const [nome, tipo] = especieDe(b);
    const sev = nivel(b);
    const cat = (b.categoria_label || b.categoria || '').split(/[:(]/)[0].trim();
    const card = el('article', { class: 'bug' + (quieto ? ' instant' : ''), 'data-id': b.id, html:
      `<div class="top">
         <span class="fig">${inseto(tipo)}</span>
         <div class="grow">
           <div class="no"><span>nº ${String(bugsVistos.size).padStart(2, '0')}</span><i>${escapeHtml(nome)}</i></div>
           <div class="ti">${escapeHtml(b.titulo)}</div>
           <div class="sub">${escapeHtml(b.pagina || '')} · passo ${b.passo}${quando ? ' · aos ' + quando : ''} · ${b.gabarito ? 'bug plantado' : 'achado extra'}</div>
         </div>
       </div>
       <div class="ev">${escapeHtml(b.evidencia)}</div>
       <div class="row2">
         <span class="cat ${CAT_TONE[b.categoria] || 't-wood'}">${escapeHtml(cat)}</span>
         ${pips(sev, 'sevmeter')}
         <span class="sevtxt">severidade: <b class="sev${sev}">${SEV_TXT[sev]}</b></span>
         <span class="det">det. Jev: ${fmt.pct(b.prob_bug)} bug real</span>
       </div>` });
    $('bugs').prepend(card);
    updatePlacar(d.placar);
    if (!quieto) toast('Bug encontrado: ' + b.titulo, 'ok');
  }

  function showFinal(r) {
    setRunning(false);
    $('caption').hidden = true; $('rec').hidden = true;
    const p = r.placar || {};
    // quem chega depois de um teste recebe só o relatório: a gaveta e o registro são montados a partir dele
    if (!bugsVistos.size && Array.isArray(r.bugs) && r.bugs.length) {
      r.bugs.forEach((b) => addBug({ bug: b, placar: p }, 'replay'));
      const vazio = $('log').firstElementChild;
      if (vazio && vazio.classList.contains('empty-log')) vazio.textContent = 'As anotações passo a passo só aparecem ao vivo. Rode um novo teste para ver cada decisão do Jev.';
    }
    const seg = ((r.duracao_ms || 0) / 1000).toFixed(1).replace('.', ',');
    if (r.duracao_ms != null) $('kTime').textContent = seg + ' s'; // a ficha fecha com a duração oficial do relatório
    const f = $('final');
    f.className = 'final show';
    f.innerHTML = `
      <span class="final-pin" aria-hidden="true">${PINO_SVG}</span>
      <p class="final-kicker">Relatório de coleta</p>
      <h2>Teste concluído — ${p.encontrados}/${total} bugs encontrados</h2>
      <p class="final-p">O Jev explorou a Loja Bugada sozinho, decidiu cada clique e digitação, e fez a triagem de cada defeito. Tudo com decisões tipadas — nenhum texto inventado.</p>
      <dl class="fkpis">
        <div><dt>tempo</dt><dd>${seg} s</dd></div>
        <div><dt>passos</dt><dd>${fmt.int(p.passos)}</dd></div>
        <div><dt>custo desta execução</dt><dd>${fmt.usd(r.custo)}</dd></div>
        <div><dt>chamadas ao Jev</dt><dd>${fmt.int(r.jev_calls)} <small>(${fmt.int(r.perguntas)} perguntas)</small></dd></div>
      </dl>
      ${r.faltando && r.faltando.length ? `<p class="final-miss">não encontrou: <b>${r.faltando.map((x) => escapeHtml(x.curto)).join(', ')}</b></p>` : '<p class="final-miss">achou todos os bugs plantados</p>'}`;
    $('obsIdle').textContent = 'Observação encerrada. Veja o relatório de coleta.';
  }

  // ---------- controle ----------
  $('run').addEventListener('click', async () => {
    if (rodando) return;
    try {
      const r = await api('/api/run', {}, { label: 'run' });
      if (r.status === 'iniciado') { resetBoard(); setRunning(true); toast('Teste iniciado! O Jev assumiu o navegador.', 'ok'); }
      else if (r.status === 'na_fila') { setRunning(true); toast('Já tem um teste rodando. Você entrou na fila (posição ' + r.posicao + ') e está assistindo o atual.'); }
      else { setRunning(true); toast('Um teste já está rodando — acompanhe ao vivo abaixo.'); }
    } catch (e) { /* toast já exibido */ }
  });

  // ---------- carga inicial: as bandejas da gaveta, uma por bug plantado ----------
  api('/api/info', undefined, { silent: true }).then((info) => {
    total = info.bugsTotais; maxSteps = info.maxSteps; maxMs = info.maxMs;
    $('scoreT').textContent = '/' + total;
    const planted = $('planted');
    info.gabarito.forEach((b, i) => planted.append(bandeja(b, i)));
    soltarFila();
  }).catch(() => soltarFila());

  // ---------- transmissão ao vivo ----------
  sse('/api/stream', {
    estado: (d) => {
      if (d.bugsTotais) { total = d.bugsTotais; $('scoreT').textContent = '/' + total; }
      const wasRunning = rodando;
      if (d.rodando && !wasRunning) { setRunning(true); }
      if (!d.rodando && wasRunning) { /* fim trata */ }
      $('runline').innerHTML = d.rodando
        ? '<span class="jev-spinner"></span> teste em andamento'
        : (d.fila ? `${d.fila} na fila` : '');
    },
    inicio: () => { resetBoard(); setRunning(true); },
    passo: (d) => {
      addLog(d); updatePlacar(d.placar);
      if (d.acao) {
        $('capic').innerHTML = ICON_ACAO[d.acao.tipo] || ICO.ponto;
        const t = d.acao.top && d.acao.top[0];
        $('capjev').textContent = (t ? `Jev ${fmt.pct(t.p)} · ` : '') + fmt.ms(d.acao.latency_ms);
      }
    },
    tela: (d) => setTela(d),
    bug: (d) => addBug(d),
    fim: (d) => { showFinal(d); $('runline').textContent = ''; },
    erro_execucao: (d) => toast('Erro na execução: ' + (d.msg || ''), 'err'),
    erro_jev: (d) => toast('Jev indisponível: ' + (d.msg || ''), 'err'),
    error: () => {},
  });
})();

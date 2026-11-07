// Intenções em qualquer site: uma linha de script.
//   <script src="/_jev/intencoes.js" defer data-contexto="o que é esta página" data-cta="#botao-principal"></script>
// O navegador resume o comportamento do visitante (só contagens: rolagem, cliques, tempo, formulários SEM valores) e os
// textos da própria página (título, seções, botão principal). O Jev lê o estado e escolhe a reação. O mascote Bit, a cor
// das bordas e a tripulação pixel mostram a reação. Os textos são modelos deste arquivo e o Jev não escreve nada.
// Transparência: o Bit se apresenta, explica o que vê e fica quieto quando clicado. Não usa cookies nem identifica ninguém.
// Navegadores de automação (ex.: o robô do QA) não carregam a camada; ?intencoes=1 força e ?intencoes=0 desliga.
(function () {
  'use strict';
  if (window.__jevIntencoes) return;
  window.__jevIntencoes = true;
  const script = document.currentScript;
  const qs = new URLSearchParams(location.search);
  if (qs.get('intencoes') === '0' || (navigator.webdriver && qs.get('intencoes') !== '1')) return;
  const cfg = {
    api: (script && script.dataset.api) || '/_jev/intencoes/decidir',
    contexto: (script && script.dataset.contexto) || '',
    cta: (script && script.dataset.cta) || '',
    meta: !(script && script.dataset.meta === '0'),
  };
  const agora = () => performance.now();
  const reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const estreito = () => window.innerWidth < 700;
  const pct = (p) => Math.round((p || 0) * 100) + '%';
  const curto = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

  // ---------------------------------------------------------------- memória da aba (sessionStorage: some ao fechar a aba)
  const MEM_K = 'jevi';
  let mem = { falas: 0, ultima: '', ultimaEm: 0, mudo: false, reacoes: [], usadas: {} };
  try { mem = { ...mem, ...JSON.parse(sessionStorage.getItem(MEM_K) || '{}') }; } catch (e) { /* sem armazenamento: começa do zero */ }
  const guardar = () => { try { sessionStorage.setItem(MEM_K, JSON.stringify(mem)); } catch (e) { /* ignora */ } };

  // ---------------------------------------------------------------- estilo e elementos (tudo com prefixo jevi-, nada do site é alterado)
  const Z = 2147483000;
  const css = `
@property --jevi-cor { syntax: '<color>'; inherits: true; initial-value: rgba(167,139,250,.42); }
#jevi-root { --jevi-cor: rgba(167,139,250,.42); transition: --jevi-cor 1s ease; }
#jevi-root[data-humor="lendo_com_interesse"] { --jevi-cor: rgba(45,212,191,.42); }
#jevi-root[data-humor="hesitando"] { --jevi-cor: rgba(56,189,248,.5); }
#jevi-root[data-humor="procurando"] { --jevi-cor: rgba(129,140,248,.5); }
#jevi-root[data-humor="com_pressa"] { --jevi-cor: rgba(251,113,133,.55); }
#jevi-root[data-humor="frustrado"] { --jevi-cor: rgba(248,113,113,.62); }
#jevi-root[data-humor="pronto_para_agir"] { --jevi-cor: rgba(52,211,153,.5); }
#jevi-root[data-humor="prestes_a_sair"] { --jevi-cor: rgba(100,116,139,.6); }
.jevi-borda { position: fixed; inset: 0; z-index: ${Z}; pointer-events: none; box-shadow: inset 0 0 110px 14px var(--jevi-cor); transition: box-shadow .8s ease, opacity .8s ease; }
#jevi-root[data-humor="frustrado"] .jevi-borda { animation: jeviPulsa 1.1s ease-in-out infinite; }
#jevi-root.jevi-parado .jevi-borda { opacity: .35; }
@keyframes jeviPulsa { 50% { box-shadow: inset 0 0 60px 6px var(--jevi-cor); } }
.jevi-rush { position: fixed; inset: -300px 0 0 0; z-index: ${Z}; pointer-events: none; opacity: 0; transition: opacity .12s;
  background: repeating-linear-gradient(180deg, transparent 0 90px, rgba(255,255,255,.28) 90px 170px, transparent 170px 300px);
  -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 89px, #000 89px 90px, transparent 90px 173px);
  mask-image: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 89px, #000 89px 90px, transparent 90px 173px); }
#jevi-root.jevi-correndo .jevi-rush { opacity: 1; animation: jeviCorre .26s linear infinite; }
#jevi-root.jevi-correndo .jevi-borda { box-shadow: inset 0 0 140px 30px rgba(251,113,133,.6), inset 0 0 40px 6px rgba(245,158,11,.5); }
@keyframes jeviCorre { to { transform: translateY(-300px); } }
.jevi-crew { position: fixed; inset: 0; z-index: ${Z + 1}; pointer-events: none; width: 100vw; height: 100vh; image-rendering: pixelated; }
.jevi-halo { position: fixed; z-index: ${Z + 1}; pointer-events: none; border-radius: 12px; border: 3px solid #a78bfa; box-shadow: 0 0 0 4px rgba(167,139,250,.25), 0 0 28px rgba(167,139,250,.55); animation: jeviHalo 1s ease-in-out infinite; }
.jevi-halo.jevi-ruim { border: 3px dashed #f87171; box-shadow: 0 0 0 4px rgba(248,113,113,.2), 0 0 28px rgba(248,113,113,.5); }
@keyframes jeviHalo { 50% { transform: scale(1.03); } }
.jevi-bit { position: fixed; left: 16px; bottom: 14px; z-index: ${Z + 3}; display: flex; align-items: flex-end; gap: 4px; pointer-events: none; font: 600 14px/1.42 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #12121c; letter-spacing: normal; text-align: left; }
.jevi-bit * { box-sizing: border-box; }
.jevi-bit > * { pointer-events: auto; }
.jevi-me { position: relative; display: block; width: 72px; margin: 0; padding: 0 0 22px; border: 0; background: none; cursor: pointer; }
.jevi-me canvas { display: block; width: 72px; height: 72px; image-rendering: pixelated; filter: drop-shadow(0 6px 12px rgba(0,0,0,.45)); }
.jevi-tag { position: absolute; left: 0; bottom: 0; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 1px 9px; border-radius: 999px; font: 800 11px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f1f0f8; background: rgba(12,12,20,.92); border: 1px solid var(--jevi-cor); }
.jevi-bit.jevi-mudo .jevi-tag::after { content: " · 🔇"; }
.jevi-bal { position: relative; margin: 0 0 36px 2px; max-width: min(340px, calc(100vw - 130px)); padding: 11px 13px 9px; border-radius: 16px 16px 16px 5px; background: #f7f7ff; color: #12121c; box-shadow: 0 14px 34px rgba(0,0,0,.35), 0 0 0 3px var(--jevi-cor); }
.jevi-bal::before { content: ""; position: absolute; left: -9px; bottom: 12px; border: 9px solid transparent; border-left: 0; border-right-color: #f7f7ff; }
.jevi-bal[hidden] { display: none !important; }
.jevi-bal.jevi-in { animation: jeviEntra .28s cubic-bezier(.2,.8,.2,1); }
@keyframes jeviEntra { from { opacity: 0; transform: translateY(8px) scale(.94); } }
.jevi-txt { margin: 0; padding-right: 16px; min-height: 1.4em; font: 650 14.5px/1.42 system-ui, -apple-system, "Segoe UI", sans-serif; color: #12121c; }
.jevi-x { position: absolute; top: 2px; right: 2px; width: 26px; height: 26px; border: 0; background: none; color: #70708a; cursor: pointer; font: 700 12px system-ui, sans-serif; }
.jevi-qr { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.jevi-qr:empty { display: none; }
.jevi-qr button { min-height: 30px; padding: 4px 11px; border-radius: 999px; border: 1px solid #7c5cf0; background: #ede9fe; color: #3b1f9e; font: 800 12.5px system-ui, -apple-system, sans-serif; cursor: pointer; }
.jevi-qr button:hover { background: #ddd6fe; }
.jevi-meta { margin-top: 6px; font: 700 11px/1.4 system-ui, sans-serif; color: #6d28d9; }
.jevi-meta:empty { display: none; }
.jevi-bit[data-dock="tl"], .jevi-bit[data-dock="tr"] { top: var(--jevi-y, 16px); bottom: auto; align-items: flex-start; }
.jevi-bit[data-dock="tr"], .jevi-bit[data-dock="br"] { left: auto; right: var(--jevi-x, 16px); flex-direction: row-reverse; }
.jevi-bit[data-dock="tl"] .jevi-bal, .jevi-bit[data-dock="tr"] .jevi-bal { margin: 14px 0 0 2px; border-radius: 5px 16px 16px 16px; }
.jevi-bit[data-dock="tl"] .jevi-bal::before, .jevi-bit[data-dock="tr"] .jevi-bal::before { bottom: auto; top: 12px; }
.jevi-bit[data-dock="tr"] .jevi-bal, .jevi-bit[data-dock="br"] .jevi-bal { margin-left: 0; margin-right: 2px; border-radius: 16px 16px 5px 16px; }
.jevi-bit[data-dock="tr"] .jevi-bal::before, .jevi-bit[data-dock="br"] .jevi-bal::before { left: auto; right: -9px; border-right: 0; border-left: 9px solid #f7f7ff; }
.jevi-bit[data-dock="tr"] .jevi-tag, .jevi-bit[data-dock="br"] .jevi-tag { left: auto; right: 0; }
.jevi-bit[data-dock="tl"] .jevi-tag, .jevi-bit[data-dock="tr"] .jevi-tag { max-width: 76px; }
.jevi-bit.jevi-apertado .jevi-bal { pointer-events: none; opacity: .94; }
.jevi-bit.jevi-apertado .jevi-bal button { pointer-events: auto; }
@media (max-width: 700px) { .jevi-me { width: 48px; } .jevi-me canvas { width: 48px; height: 48px; } .jevi-bal { max-width: calc(100vw - 80px); font-size: 13.5px; } }
@media (prefers-reduced-motion: reduce) { .jevi-borda, .jevi-halo, .jevi-bal.jevi-in, #jevi-root.jevi-correndo .jevi-rush { animation: none !important; } }
`;
  const raiz = document.createElement('div');
  raiz.id = 'jevi-root';
  raiz.dataset.humor = 'explorando';
  raiz.innerHTML = `<style>${css}</style><div class="jevi-borda"></div><div class="jevi-rush"></div><canvas class="jevi-crew"></canvas>
<div class="jevi-bit" data-dock="bl"><button type="button" class="jevi-me" aria-label="Bit, o mascote desta página. Clique para silenciar ou reativar."><canvas width="72" height="72"></canvas><span class="jevi-tag">Bit</span></button>
<div class="jevi-bal" hidden role="status" aria-live="polite"><button type="button" class="jevi-x" aria-label="Fechar a fala do Bit">✕</button><p class="jevi-txt"></p><div class="jevi-qr"></div><div class="jevi-meta"></div></div></div>`;
  (document.body || document.documentElement).appendChild(raiz);
  const q = (sel) => raiz.querySelector(sel);
  const cvCrew = q('.jevi-crew'), gCrew = cvCrew.getContext('2d');
  const bitEl = q('.jevi-bit'), cvBit = q('.jevi-me canvas'), gBit = cvBit.getContext('2d');
  const bal = q('.jevi-bal'), balTxt = q('.jevi-txt'), balQr = q('.jevi-qr'), balMeta = q('.jevi-meta'), tag = q('.jevi-tag');
  const nosso = (el) => !!(el && el.closest && el.closest('#jevi-root'));

  // ---------------------------------------------------------------- pixel art (o mesmo robô do Site que Lê Intenções)
  const ROBO = ['.......aa.......', '.......kk.......', '...kkkkkkkkkk...', '..klllbbbbbbbk..', '..kbvvvvvvvvbk..', '..kbvEEvvEEvbk..', '..kbvEEvvEEvbk..', '..kbvvvvvvvvbk..',
    '..kdbbbbbbbbdk..', '...kkkkkkkkkk...', '.....kbbbbk.....', '....kbbwwbbk....', '...kbkdbbdkbk...', '.....kddddk.....', '.....gg..gg.....', '................'];
  const ROSTOS = { normal: ['vEEvvEEv', 'vEEvvEEv'], pisca: ['vvvvvvvv', 'vEEvvEEv'], feliz: ['vEEvvEEv', 'EvvEEvvE'], bravo: ['vvEvvEvv', 'vEEvvEEv'], preocupado: ['vEvvvvEv', 'vEEvvEEv'] };
  const PERNAS = { parado: '.....gg..gg.....', passoA: '....gg....gg....', passoB: '......gggg......' };
  const CORES = {
    violeta: { b: '#a78bfa', d: '#7c5cf0', l: '#dcd2ff' }, ciano: { b: '#22d3ee', d: '#0e9fb8', l: '#b5f5fd' }, rosa: { b: '#f472b6', d: '#d9468f', l: '#fcd3e8' },
    verde: { b: '#34d399', d: '#0f9d6e', l: '#b4f5d8' }, ambar: { b: '#fbbf24', d: '#d48806', l: '#fde9a6' },
  };
  const FIXAS = { k: '#0b0b14', v: '#161630', w: '#f5f5ff', g: '#3b3f55' };
  const OBJ = {
    estrela: { l: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'y......y'], p: { y: '#fbbf24' } },
    maleta: { l: ['..kkkk..', 'kkkkkkkk', 'kwwrrwwk', 'kwrrrrwk', 'kwrrrrwk', 'kwwrrwwk', 'kwwwwwwk', 'kkkkkkkk'], p: { w: '#f5f5ff', r: '#ef4444' } },
    livro: { l: ['.kkkkkk.', 'kcccccwk', 'kcwwwcwk', 'kcccccwk', 'kcwwwcwk', 'kcccccwk', 'kcccccwk', '.kkkkkk.'], p: { c: '#8b5cf6', w: '#f5f5ff' } },
    lupa: { l: ['.kkkk...', 'kbbbbk..', 'kbWbbk..', 'kbbbbk..', 'kbbbbk..', '.kkkkk..', '.....kk.', '......kk'], p: { b: '#7dd3fc', W: '#f0f9ff' } },
    mapa: { l: ['kkkkkkkk', 'kyywwyyk', 'kywwyyyk', 'kwwyyrwk', 'kwyyyrwk', 'kyyywwyk', 'kywwwyyk', 'kkkkkkkk'], p: { y: '#fde68a', w: '#bef264', r: '#ef4444' } },
  };
  const ICO = {
    pergunta: ['.kkkk..', 'k....k.', '.....k.', '...kk..', '...k...', '.......', '...k...'], exclama: ['...k...', '...k...', '...k...', '...k...', '...k...', '.......', '...k...'],
    coracao: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...', '.......'], raiva: ['.r...r.', 'rr...rr', '.......', '.......', 'rr...rr', '.r...r.', '.......'],
    reticencias: ['.......', '.......', '.......', 'k..k..k', '.......', '.......', '.......'], zz: ['kkkk...', '..k....', '.k.....', 'kkkk...', '....kkk', '.....k.', '....kkk'],
    ok: ['.......', '......G', '.....G.', 'G...G..', '.G.G...', '..G....', '.......'],
  };
  const BOLHA = ['.kkkkkkkkk.', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', 'kwwwwwwwwwk', '.kkwkkkkkk.', '..kwk......', '..kk.......'];
  const cache = new Map();
  function sprite(linhas, pal) {
    const chave = linhas.join('|') + '#' + Object.entries(pal).join(';');
    let c = cache.get(chave);
    if (c) return c;
    c = document.createElement('canvas'); c.width = linhas[0].length; c.height = linhas.length;
    const g = c.getContext('2d');
    linhas.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const cor = pal[row[x]]; if (cor) { g.fillStyle = cor; g.fillRect(x, y, 1, 1); } } });
    cache.set(chave, c);
    return c;
  }
  function robo(cor, rosto, pernas, luz) {
    const f = ROSTOS[rosto] || ROSTOS.normal, l = ROBO.slice();
    l[5] = l[5].slice(0, 4) + f[0] + l[5].slice(12); l[6] = l[6].slice(0, 4) + f[1] + l[6].slice(12); l[14] = PERNAS[pernas] || PERNAS.parado;
    const p = CORES[cor] || CORES.violeta;
    return sprite(l, { ...FIXAS, b: p.b, d: p.d, l: p.l, a: luz || '#fbbf24', E: '#7df9ff' });
  }
  const objeto = (n) => (OBJ[n] ? sprite(OBJ[n].l, { k: FIXAS.k, ...OBJ[n].p }) : null);
  const bolha = (ico) => (ICO[ico] ? sprite(BOLHA.map((r, y) => (y < 1 || y > 7 ? r : r.slice(0, 2) + ICO[ico][y - 1].replace(/\./g, 'w') + r.slice(9))), { k: FIXAS.k, w: FIXAS.w, r: '#ef4444', G: '#16a34a' }) : null);
  function pintar(g, img, x, y, S, dir, alpha) {
    if (!img) return;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
    if (dir < 0) { g.translate(Math.round(x + img.width * S), Math.round(y)); g.scale(-1, 1); } else g.translate(Math.round(x), Math.round(y));
    g.drawImage(img, 0, 0, img.width * S, img.height * S);
    g.restore();
  }

  // ---------------------------------------------------------------- humor (estado lido pelo Jev)
  const HUMOR = {
    explorando: { em: '🧭', rot: 'explorando', luz: '#a78bfa', rosto: 'normal', forma: 'vagar', emo: 'pergunta' },
    lendo_com_interesse: { em: '📖', rot: 'lendo com interesse', luz: '#2dd4bf', rosto: 'feliz', forma: 'lento', emo: 'coracao', obj: 'livro' },
    hesitando: { em: '🤔', rot: 'hesitando', luz: '#38bdf8', rosto: 'preocupado', forma: 'pingpong', emo: 'pergunta' },
    procurando: { em: '🔎', rot: 'procurando algo', luz: '#818cf8', rosto: 'normal', forma: 'espiar', emo: 'exclama', obj: 'lupa' },
    com_pressa: { em: '🏃', rot: 'com pressa', luz: '#fb7185', rosto: 'preocupado', forma: 'correr', emo: 'exclama' },
    frustrado: { em: '😤', rot: 'frustrado', luz: '#f87171', rosto: 'preocupado', forma: 'correr', emo: 'raiva' },
    pronto_para_agir: { em: '✅', rot: 'pronto para agir', luz: '#34d399', rosto: 'feliz', forma: 'pular', emo: 'ok' },
    prestes_a_sair: { em: '🚪', rot: 'prestes a sair', luz: '#94a3b8', rosto: 'preocupado', forma: 'saida', emo: 'reticencias' },
  };
  let humor = 'explorando', parado = false, correndoAte = 0;
  function aplicarHumor(e) {
    const h = HUMOR[e] || HUMOR.explorando;
    humor = e; raiz.dataset.humor = e;
    tag.textContent = `Bit · ${h.em} ${h.rot}`; tag.title = tag.textContent;
  }

  // ---------------------------------------------------------------- a página: seções, botão principal
  const visivel = (el) => { if (!el || nosso(el)) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  function secoes() {
    return [...document.querySelectorAll('h1, h2, h3')].filter((h) => visivel(h) && curto(h.textContent, 60).length > 1).slice(0, 12);
  }
  const VERBO = /(comprar|compre|testar|teste|come[cç]|assin|inscrev|contrat|finaliz|adicionar|quero|experiment|baixar|cadastr|agend|pedir|pe[cç]a|garant|checkout|pagar|reservar|come[cç]ar)/i;
  let ctaCache = null, ctaEm = 0;
  function cta() {
    if (agora() - ctaEm < 2000 && ctaCache && document.contains(ctaCache)) return ctaCache;
    ctaEm = agora();
    if (cfg.cta) { const el = document.querySelector(cfg.cta); if (el && visivel(el)) return (ctaCache = el); }
    const marcado = document.querySelector('[data-jev-cta]');
    if (marcado && visivel(marcado)) return (ctaCache = marcado);
    let melhor = null, nota = -1e9;
    for (const el of document.querySelectorAll('button, a[href], input[type="submit"]')) {
      if (!visivel(el)) continue;
      const r = el.getBoundingClientRect(), texto = curto(el.textContent || el.value, 60);
      if (!texto) continue;
      const cs = getComputedStyle(el), fundo = cs.backgroundColor, temFundo = fundo && fundo !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(fundo) || cs.backgroundImage !== 'none';
      let n = Math.min(r.width * r.height, 40000) / 20 + (temFundo ? 1500 : 0) + (VERBO.test(texto) ? 3000 : 0);
      if (el.closest('footer, nav, [role="search"], form[role="search"], header')) n -= 3500;
      if (r.top + scrollY < innerHeight * 1.2) n += 400;
      if (n > nota) { nota = n; melhor = el; }
    }
    return (ctaCache = melhor);
  }

  // ---------------------------------------------------------------- rastreador (só contagens; nenhum valor digitado sai daqui)
  const T = {
    t0: agora(), lastAct: agora(), maxDepth: 0, depth: 0, lastY: scrollY, dir: 0, runStart: scrollY, reversals: [], hist: [], fastUpAt: -1e9, rushAt: -1e9, rushes: [],
    clicks: [], rage: 0, rageAt: -1e9, dead: 0, total: 0, semEfeito: 0, ultimoSemEfeito: '', elSemEfeito: null, copies: 0, exits: 0, exitAt: -1e9, idleMark: 0,
    cta: { passagens: 0, s: 0, cliques: 0, sobre: false }, focos: 0, envios: 0, erros: 0, events: [],
  };
  let forte = false;
  function ev(txt, isForte) { T.events.push({ t: agora(), txt: curto(txt, 70) }); if (T.events.length > 30) T.events.shift(); if (isForte) { forte = true; setTimeout(talvezEnviar, 60); } }
  const altura = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  addEventListener('scroll', () => {
    const y = scrollY, t = agora();
    T.depth = Math.round(Math.min(1, Math.max(0, y / altura())) * 100); T.maxDepth = Math.max(T.maxDepth, T.depth);
    const dy = y - T.lastY;
    if (Math.abs(dy) >= 1) { const d = dy > 0 ? 1 : -1; if (d !== T.dir) { if (T.dir !== 0 && Math.abs(T.lastY - T.runStart) > 60) T.reversals.push(t); T.runStart = T.lastY; T.dir = d; } }
    const antes = T.lastY; T.lastY = y;
    T.hist.push([t, y, antes]);
    while (T.hist.length && t - T.hist[0][0] > 1500) T.hist.shift();
    const first = T.hist[0];
    if (first && first[2] - y > 1100 && y < 450 && t - T.fastUpAt > 3000) { T.fastUpAt = t; ev('voltou rápido ao topo', true); }
    const ref = T.hist.find((h) => t - h[0] <= 500);
    if (ref && y - ref[2] > Math.max(1100, innerHeight * 1.25) && t - T.rushAt > 2500) { T.rushAt = t; T.rushes.push(t); ev('rolou rápido demais para baixo', true); correr(); }
    T.lastAct = t;
  }, { passive: true });
  addEventListener('mousemove', () => { T.lastAct = agora(); }, { passive: true });
  addEventListener('keydown', () => { T.lastAct = agora(); });
  // mutações da página (sem contar as nossas): servem para saber se um clique "fez alguma coisa"
  let mutacoes = 0;
  new MutationObserver((lista) => { for (const m of lista) if (!nosso(m.target)) { mutacoes++; break; } }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  let saindoDaPagina = false;
  addEventListener('beforeunload', () => { saindoDaPagina = true; });
  document.addEventListener('click', (e) => {
    const tg = e.target;
    if (!tg || !tg.closest || nosso(tg) || e.detail === 0) return;
    const t = agora(), x = e.clientX, y = e.clientY;
    T.total++; T.lastAct = t;
    T.clicks.push({ t, x, y });
    while (T.clicks.length && t - T.clicks[0].t > 1000) T.clicks.shift();
    if (T.clicks.filter((c) => Math.hypot(c.x - x, c.y - y) < 60).length >= 3 && t - T.rageAt > 1200) { T.rage++; T.rageAt = t; ev('cliques de raiva (3+ em menos de 1 s)', true); }
    const inter = tg.closest('a[href], button, input, select, textarea, label, summary, [role="button"], [onclick]');
    const c = cta();
    if (c && (tg === c || c.contains(tg))) { T.cta.cliques++; ev(`clicou na ação principal "${curto(c.textContent || c.value, 30)}"`, true); }
    if (!inter) { T.dead++; ev('clique em algo que não é botão', T.dead >= 2); return; }
    // botão que não fez nada: sem mudança na página, sem navegação, em 900 ms
    if (inter.matches('input:not([type="submit"]):not([type="button"]), select, textarea, label')) return;
    const m0 = mutacoes, url0 = location.href;
    setTimeout(() => {
      if (saindoDaPagina || location.href !== url0 || mutacoes !== m0) return;
      T.semEfeito++; T.ultimoSemEfeito = curto(inter.textContent || inter.value || inter.getAttribute('aria-label'), 40); T.elSemEfeito = inter;
      ev(`clicou em "${T.ultimoSemEfeito}" e nada aconteceu`, true);
    }, 900);
  }, true);
  document.addEventListener('copy', () => { T.copies++; T.lastAct = agora(); ev('copiou um texto'); });
  document.addEventListener('mouseout', (e) => { if (e.relatedTarget || e.clientY > 0) return; const t = agora(); if (t - T.exitAt < 1500) return; T.exits++; T.exitAt = t; ev('o mouse saiu pelo topo da janela', true); });
  document.addEventListener('mouseover', (e) => { const c = cta(); const sobre = !!(c && e.target && (e.target === c || c.contains(e.target))); if (sobre && !T.cta.sobre) { T.cta.passagens++; ev('mouse na ação principal'); } T.cta.sobre = sobre; });
  document.addEventListener('focusin', (e) => { if (!nosso(e.target) && e.target.matches && e.target.matches('input, select, textarea')) { T.focos++; T.lastAct = agora(); } });
  document.addEventListener('invalid', (e) => { if (!nosso(e.target)) { T.erros++; ev('campo inválido no formulário', true); } }, true);
  document.addEventListener('submit', (e) => {
    if (nosso(e.target)) return;
    T.envios++; ev('enviou um formulário', true);
    const f = e.target;
    setTimeout(() => { const ruins = f.querySelectorAll('[aria-invalid="true"], .erro, .error, .invalid, .is-invalid, .bad'); if (ruins.length) { T.erros += 1; ev('o formulário mostrou erro', true); } }, 700);
  }, true);
  function preenchidos() { let n = 0; for (const el of document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select')) { if (!nosso(el) && el.value && String(el.value).length) n++; } return Math.min(n, 99); }
  function secaoAtual() { const meio = innerHeight * 0.45; let atual = ''; for (const h of secoes()) { if (h.getBoundingClientRect().top <= meio) atual = curto(h.textContent, 50); } return atual; }
  setInterval(() => {
    if (document.hidden) return;
    const t = agora();
    if (T.cta.sobre) T.cta.s += 0.25;
    const idle = (t - T.lastAct) / 1000, mark = idle >= 20 ? 3 : idle >= 10 ? 2 : idle >= 5 ? 1 : 0;
    if (mark !== T.idleMark) { if (mark > T.idleMark) ev(`parado há ${[0, 5, 10, 20][mark]} s`, mark >= 2); T.idleMark = mark; parado = mark >= 2; raiz.classList.toggle('jevi-parado', parado); }
  }, 250);

  function resumo() {
    const t = agora(), c = cta();
    return {
      pagina: { titulo: curto(document.title, 90), contexto: curto(cfg.contexto || (document.querySelector('meta[name="description"]') || {}).content, 220), secoes: secoes().map((h) => curto(h.textContent, 50)), acao_principal: c ? curto(c.textContent || c.value, 50) : '', secao_atual: secaoAtual() },
      t: Math.round((t - T.t0) / 1000),
      rolagem: { max: T.maxDepth, atual: T.depth, inversoes_20s: T.reversals.filter((x) => t - x < 20000).length, rapidas_20s: T.rushes.filter((x) => t - x < 20000).length, desceu_rapido: t - T.rushAt < 5000, subiu_rapido: t - T.fastUpAt < 6000 },
      cliques: { total: T.total, raiva: T.rage, mortos: T.dead, sem_efeito: T.semEfeito, ultimo_sem_efeito: T.ultimoSemEfeito },
      acao: { passagens: T.cta.passagens, segundos: Math.round(T.cta.s), cliques: T.cta.cliques },
      formularios: { focos: T.focos, preenchidos: preenchidos(), envios: T.envios, erros: T.erros },
      copiou: T.copies, ocioso_s: Math.round((t - T.lastAct) / 1000),
      saida: { vezes: T.exits, ha_s: T.exits ? Math.round((t - T.exitAt) / 1000) : null },
      eventos: T.events.slice(-8).map((e) => `${e.txt} (há ${Math.round((t - e.t) / 1000)} s)`),
      reacoes: mem.reacoes.slice(-10),
      bit: { falou_ha_s: mem.falas ? Math.round((Date.now() - mem.ultimaEm) / 1000) : null, falas: mem.falas, mudo: mem.mudo },
    };
  }
  const chave = (s) => JSON.stringify([s.pagina.secao_atual, Math.floor(s.rolagem.max / 10), s.rolagem.inversoes_20s, s.rolagem.rapidas_20s, s.rolagem.desceu_rapido, s.rolagem.subiu_rapido, s.cliques, s.acao.passagens, s.acao.cliques, s.formularios, s.copiou, T.idleMark, s.saida.vezes, s.reacoes.length]);

  // ---------------------------------------------------------------- laço de decisão
  let emVoo = 0, ultimaChave = '', ultimoEnvio = 0, chamadas = 0, pausaAte = 0, seq = 0, mostrado = 0;
  const TETO = 150;
  setInterval(talvezEnviar, 2000);
  function talvezEnviar() {
    if (document.hidden || agora() < pausaAte || chamadas >= TETO) return;
    const f = forte;
    if (emVoo >= (f ? 2 : 1)) return;
    const s = resumo(), k = chave(s);
    if (!f && k === ultimaChave) return;
    if (agora() - ultimoEnvio < (f ? 150 : 450)) return;
    forte = false; ultimaChave = k; ultimoEnvio = agora();
    decidir(s);
  }
  async function decidir(s) {
    emVoo++; chamadas++;
    const meu = ++seq;
    try {
      const r = await fetch(cfg.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ sinais: s }) });
      if (r.status === 429) { pausaAte = agora() + 8000; return; }
      if (!r.ok) { pausaAte = agora() + 4000; return; }
      const j = await r.json();
      if (j && j.ok && meu > mostrado) { mostrado = meu; aoDecidir(j); }
    } catch (e) { pausaAte = agora() + 4000; } finally { emVoo = Math.max(0, emVoo - 1); }
  }

  // ---------------------------------------------------------------- reações (o Jev escolhe; o código decide se passa)
  const COMPAT = {
    boas_vindas: null, chamar_atencao: null,
    resumir_pagina: ['com_pressa', 'procurando', 'explorando', 'prestes_a_sair'],
    destacar_acao_principal: ['hesitando', 'lendo_com_interesse', 'procurando'],
    convidar_a_rolar: ['explorando', 'lendo_com_interesse'],
    oferecer_ajuda: ['procurando', 'hesitando', 'explorando'],
    acalmar: ['frustrado'], segurar_saida: ['prestes_a_sair'], reconhecer_interesse: ['lendo_com_interesse'],
  };
  const PRIO = { acalmar: 5, segurar_saida: 4, resumir_pagina: 3, destacar_acao_principal: 3, oferecer_ajuda: 3, convidar_a_rolar: 2, boas_vindas: 1, chamar_atencao: 1, reconhecer_interesse: 1 };
  const UMA_VEZ = ['boas_vindas', 'reconhecer_interesse', 'convidar_a_rolar'];
  const ROT = { boas_vindas: 'boas-vindas', resumir_pagina: 'resumir a página', destacar_acao_principal: 'destacar a ação principal', convidar_a_rolar: 'convidar a rolar', oferecer_ajuda: 'oferecer ajuda', acalmar: 'pedir desculpas e ajudar', segurar_saida: 'segurar a saída', chamar_atencao: 'chamar a atenção', reconhecer_interesse: 'reconhecer o interesse' };
  const FALAS = {
    boas_vindas: [{ t: 'Oi! Eu sou o Bit 👋 Vou reagindo ao que você faz nesta página.', qr: [['O que você vê?', 'transparencia']] }],
    resumir_pagina: [
      { t: 'Uou, que pressa! 🏃💨 Esta página tem estas partes:', qr: 'secoes', se: (c) => c.pressa && c.nSecoes > 0 },
      { t: 'Procurando algo? Estas são as partes da página 👇', qr: 'secoes', se: (c) => !c.pressa && c.nSecoes > 0 },
      { t: 'Uou, que pressa! 🏃💨 O principal aqui é “{cta}”.', qr: [['Me leva lá', 'ir_cta']], se: (c) => !c.nSecoes && !!c.cta },
    ],
    destacar_acao_principal: [{ t: 'Se quiser seguir, o próximo passo é “{cta}” 👉', qr: [['Me leva lá', 'ir_cta']], se: (c) => !!c.cta }],
    convidar_a_rolar: [{ t: 'Tem mais coisa aqui embaixo 👇', qr: [['Mostrar', 'rolar']] }],
    oferecer_ajuda: [{ t: 'Posso ajudar a achar algo? 🔎', qr: 'secoes', se: (c) => c.nSecoes > 0 }, { t: 'Posso ajudar? O principal aqui é “{cta}” 👉', qr: [['Me leva lá', 'ir_cta']], se: (c) => !c.nSecoes && !!c.cta }],
    acalmar: [
      { t: 'Esse clique em “{semEfeito}” não fez nada, né? 😅 Desculpa! Tenta de novo ou vai por outro caminho.', se: (c) => !!c.semEfeito },
      { t: 'Deu erro no formulário? Confere os campos marcados, sem pressa 🤝', se: (c) => c.erros > 0 },
      { t: 'Algo travou? 😅 Respira, vamos por outro caminho.', qr: 'secoes', se: (c) => !c.semEfeito && !c.erros && c.nSecoes > 0 },
      { t: 'Algo travou? 😅 Respira e tenta de novo com calma.', se: (c) => !c.semEfeito && !c.erros && !c.nSecoes },
    ],
    segurar_saida: [{ t: 'Já vai? 🥺 Quer ver o resumo da página antes?', qr: 'secoes', se: (c) => c.nSecoes > 0 }, { t: 'Já vai? 🥺 Fica mais um pouquinho!', se: (c) => !c.nSecoes }],
    chamar_atencao: [{ t: 'Psiu… ainda tá aí? 👀', qr: [['Tô aqui!', 'to_aqui']] }],
    reconhecer_interesse: [{ t: 'Tá lendo com calma, gostei 📖' }],
  };
  const RESPOSTA = {
    transparencia: 'Só contagens: rolagem, cliques, tempo e se o mouse sai da janela. Nada do que você digita sai daqui, e não uso cookies 🔒',
    to_aqui: 'Ufa! 😄 Qualquer coisa, me chama.',
    mudo: 'Tá bom, fico quietinho 🤐 Clique em mim pra eu voltar.',
    volta: 'Voltei! 👋',
    rolar: 'Olha só o que tem aqui 👇',
    ir_cta: 'É aqui 👆',
    secao: 'Aqui está 👆',
  };
  const B = { falandoAte: 0, puloAte: 0, tremeAte: 0, timer: 0, digita: 0, aguarda: false };
  const preencher = (t, c) => t.replace(/\{(\w+)\}/g, (_, k) => (c[k] != null ? c[k] : ''));
  function contexto() { const c = cta(); return { cta: c ? curto(c.textContent || c.value, 40) : '', semEfeito: T.ultimoSemEfeito, erros: T.erros, pressa: agora() - T.rushAt < 8000, nSecoes: secoes().filter((h) => h.tagName !== 'H1').length }; }

  function sumirBalao() { bal.hidden = true; bal.classList.remove('jevi-in'); B.aguarda = false; }
  bal.addEventListener('mouseenter', () => clearTimeout(B.timer));
  bal.addEventListener('mouseleave', () => { clearTimeout(B.timer); B.timer = setTimeout(sumirBalao, 3500); });
  q('.jevi-x').addEventListener('click', (e) => { e.stopPropagation(); sumirBalao(); });
  function dizer(texto, qr, meta) {
    clearTimeout(B.timer); clearInterval(B.digita);
    bal.hidden = false; bal.classList.remove('jevi-in'); void bal.offsetWidth; bal.classList.add('jevi-in');
    balTxt.textContent = ''; balQr.innerHTML = ''; balMeta.textContent = cfg.meta && meta ? meta : '';
    const botoes = qr === 'secoes' ? secoes().filter((h) => h.tagName !== 'H1').slice(0, 4).map((h) => [curto(h.textContent, 28), 'secao', h]) : (qr || []);
    B.aguarda = botoes.length > 0;
    const chars = Array.from(texto);
    B.falandoAte = agora() + chars.length * 24 + 350; B.puloAte = agora() + 260;
    const fim = () => {
      botoes.forEach(([rot, acao, alvo]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = rot;
        b.addEventListener('click', (e) => { e.stopPropagation(); responder(acao, alvo); });
        balQr.append(b);
      });
      B.timer = setTimeout(sumirBalao, botoes.length ? 15000 : Math.max(5200, chars.length * 75));
    };
    if (reduz) { balTxt.textContent = texto; fim(); return; }
    let i = 0;
    B.digita = setInterval(() => { i++; balTxt.textContent = chars.slice(0, i).join(''); if (i >= chars.length) { clearInterval(B.digita); fim(); } }, 22);
  }
  function irPara(el) { if (!el) return; el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' }); halo(el, false, 2600); }
  function responder(acao, alvo) {
    B.aguarda = false;
    if (acao === 'secao') irPara(alvo);
    if (acao === 'ir_cta') irPara(cta());
    if (acao === 'rolar') scrollBy({ top: innerHeight * 0.8, behavior: reduz ? 'auto' : 'smooth' });
    if (acao === 'to_aqui') T.lastAct = agora();
    ev('respondeu ao Bit: ' + acao);
    dizer(RESPOSTA[acao] || 'Combinado 👍');
    mem.ultimaEm = Date.now(); guardar();
  }
  q('.jevi-me').addEventListener('click', (e) => {
    e.stopPropagation();
    if (mem.mudo) { mem.mudo = false; bitEl.classList.remove('jevi-mudo'); dizer(RESPOSTA.volta); } else { dizer(RESPOSTA.mudo); mem.mudo = true; bitEl.classList.add('jevi-mudo'); }
    guardar();
  });

  function aoDecidir(j) {
    const e = j.estado || {}, r = j.reacao || {};
    if ((e.p || 0) >= 0.5 && HUMOR[e.escolha]) aplicarHumor(e.escolha);
    const iv = r.escolha, p = r.p || 0;
    if (!iv || iv === 'nenhuma' || mem.mudo) return;
    if (p < 0.5) return;
    const compat = COMPAT[iv];
    if (compat && !(compat.includes(e.escolha) && (e.p || 0) >= 0.5)) return;
    if (UMA_VEZ.includes(iv) && mem.usadas[iv]) return;
    if (iv === 'boas_vindas' && mem.falas > 0) return;
    if (humor === 'pronto_para_agir' && iv !== 'acalmar') return;
    const desde = Date.now() - (mem.ultimaEm || 0);
    if (B.aguarda && !bal.hidden && (PRIO[iv] || 1) <= (PRIO[mem.ultima] || 0)) return;
    if (iv === mem.ultima && desde < 30000) return;
    if (desde < ((PRIO[iv] || 1) > (PRIO[mem.ultima] || 0) ? 2500 : 7000)) return;
    const c = contexto();
    const lista = (FALAS[iv] || []).filter((f) => !f.se || f.se(c));
    if (!lista.length) return;
    const f = lista[Math.floor(Math.random() * lista.length)];
    dizer(preencher(f.t, c), f.qr, `✨ o Jev escolheu: ${ROT[iv] || iv} · ${pct(p)}`);
    efeito(iv);
    mem.falas++; mem.ultima = iv; mem.ultimaEm = Date.now(); mem.usadas[iv] = true;
    mem.reacoes.push(iv); if (mem.reacoes.length > 20) mem.reacoes.shift();
    guardar();
  }

  // ---------------------------------------------------------------- efeitos visíveis: halo, tripulação da frente, rolagem rápida
  const halos = [];
  function halo(el, ruim, dur) {
    if (!el) return;
    const d = document.createElement('div'); d.className = 'jevi-halo' + (ruim ? ' jevi-ruim' : '');
    raiz.append(d); halos.push({ d, el, ate: agora() + (dur || 6000) });
  }
  const frente = [];
  function surgir(o) { frente.push({ nasc: agora(), ate: agora() + (o.dur || 6000), x: null, y: null, fase: Math.random() * 6, ...o }); }
  function efeito(iv) {
    if (iv === 'destacar_acao_principal') { const c = cta(); if (c) { halo(c, false, 6500); surgir({ el: c, cor: 'verde', obj: 'estrela', emo: 'coracao', dur: 6500 }); } }
    else if (iv === 'acalmar') { const el = T.elSemEfeito && document.contains(T.elSemEfeito) ? T.elSemEfeito : null; if (el) halo(el, true, 6500); surgir({ el: el || null, cor: 'rosa', obj: 'maleta', emo: 'exclama', dur: 7000 }); B.tremeAte = agora() + 600; }
    else if (iv === 'resumir_pagina' || iv === 'oferecer_ajuda') surgir({ el: null, cor: 'ciano', obj: 'mapa', emo: 'pergunta', dur: 5000 });
    else if (iv === 'segurar_saida') surgir({ el: null, cor: 'ambar', emo: 'coracao', dur: 5000, topo: true });
    else if (iv === 'reconhecer_interesse') surgir({ el: null, cor: 'violeta', obj: 'livro', emo: 'coracao', dur: 5000 });
  }
  function correr() {
    correndoAte = agora() + 1300; raiz.classList.add('jevi-correndo');
    setTimeout(() => raiz.classList.remove('jevi-correndo'), 1400);
    if (!reduz) { surgir({ voo: 0.25, cor: 'rosa', dur: 900 }); surgir({ voo: 0.7, cor: 'ciano', dur: 1100 }); }
  }

  // turma do rodapé: o "fundo" possível em qualquer site (fica na borda de baixo, nunca bloqueia clique)
  const turma = ['violeta', 'ciano', 'rosa', 'verde'].map((cor, i) => ({ cor, x: 120 + i * 170, dir: i % 2 ? -1 : 1, pausa: 0, emoDe: agora() + 900 * i }));
  let docaDe = 0, doca = 'bl';
  const INTERATIVOS = 'button, a[href], input, select, textarea, summary, [role="button"]';
  function zona(d) {
    const w = Math.min(440, innerWidth - 32), h = estreito() ? 120 : 140, topo = 12, baixo = innerHeight - 14;
    if (d === 'bl') return { left: 16, right: 16 + w, top: baixo - h, bottom: baixo, x: 0, y: 0 };
    if (d === 'tl') return { left: 16, right: 16 + w, top: topo, bottom: topo + h, x: 0, y: topo };
    if (d === 'tr') return { left: innerWidth - 16 - w, right: innerWidth - 16, top: topo, bottom: topo + h, x: 16, y: topo };
    return { left: innerWidth - 16 - w, right: innerWidth - 16, top: baixo - h, bottom: baixo, x: 16, y: 0 };
  }
  function livre(z) {
    for (const el of document.querySelectorAll(INTERATIVOS)) {
      if (nosso(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.right > z.left && r.left < z.right && r.bottom > z.top && r.top < z.bottom) return false;
    }
    return true;
  }
  function escolherDoca(t) {
    if (t - docaDe < 400) return;
    docaDe = t;
    let d = doca;
    if (!livre(zona(doca))) d = ['bl', 'tl', 'tr', 'br'].find((x) => x !== doca && livre(zona(x))) || doca;
    const apertado = !livre(zona(d));
    if (d !== doca) { doca = d; bitEl.dataset.dock = d; }
    const z = zona(d);
    bitEl.style.setProperty('--jevi-x', z.x + 'px'); bitEl.style.setProperty('--jevi-y', z.y + 'px');
    bitEl.classList.toggle('jevi-apertado', apertado);
  }

  let ultimo = agora();
  function quadro(t) {
    const dt = Math.min(0.05, Math.max(0, (t - ultimo) / 1000)); ultimo = t;
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (cvCrew.width !== Math.round(W * dpr) || cvCrew.height !== Math.round(H * dpr)) { cvCrew.width = Math.round(W * dpr); cvCrew.height = Math.round(H * dpr); }
    gCrew.setTransform(dpr, 0, 0, dpr, 0, 0); gCrew.imageSmoothingEnabled = false; gCrew.clearRect(0, 0, W, H);
    const h = HUMOR[humor] || HUMOR.explorando;
    // turma do rodapé
    const S = 2, tam = 32;
    turma.forEach((a, i) => {
      if (!reduz && !parado) {
        if (h.forma === 'pingpong') { const alvo = (Math.floor(t / 1400 + i * 0.5) % 2 ? 0.7 : 0.3) * W + (i - 1.5) * 16; const d = alvo - a.x; if (Math.abs(d) > 3) { a.dir = Math.sign(d); a.x += a.dir * Math.min(Math.abs(d), 140 * dt); } }
        else if (h.forma === 'saida') { a.dir = 1; a.x += 90 * dt; }
        else if (h.forma !== 'pular') {
          const vel = h.forma === 'correr' ? 170 : h.forma === 'lento' ? 12 : 34;
          if (t > a.pausa) { a.x += a.dir * vel * dt; if (Math.random() < (h.forma === 'espiar' ? 0.012 : 0.004)) { a.pausa = t + 800 + Math.random() * 1200; if (h.forma === 'espiar') a.dir *= -1; } }
          if (h.forma === 'correr' && Math.random() < 0.03) a.dir *= -1;
        }
        if (h.forma !== 'saida') { if (a.x > W + 60) a.x = W + 20; if (a.x > W - tam - 4) { a.dir = -1; if (a.x > W - tam) a.x -= 90 * dt; } if (a.x < 4) { a.x = 4; a.dir = 1; } }
      }
      let oy = 0;
      if (correndoAte > t && !reduz) oy = -Math.sin(Math.PI * Math.min(1, 1 - (correndoAte - t) / 1300)) * H * (0.25 + (i % 2) * 0.1);
      else if (h.forma === 'pular' && !reduz) oy = -Math.abs(Math.sin(t / 260 + i)) * 8;
      const andando = !reduz && !parado && h.forma !== 'pular' && t > a.pausa;
      const passo = andando ? (Math.floor(t / 170 + i) % 2 ? 'passoA' : 'passoB') : 'parado';
      const rosto = parado ? 'pisca' : h.rosto;
      const y = H - tam - 4 + oy;
      pintar(gCrew, robo(a.cor, rosto, passo, h.luz), a.x, y, S, a.dir, 0.85);
      if (h.obj && !parado) pintar(gCrew, objeto(h.obj), a.x + (a.dir > 0 ? 11 * S : -4 * S), y + 7 * S, S, 1, 0.85);
      const emo = parado ? 'zz' : h.emo;
      if (emo && t > a.emoDe && (t - a.emoDe) % 5200 < 1500) pintar(gCrew, bolha(emo), a.x + 9 * S, y - 11 * S, S, 1, 0.9);
    });
    // agentes da frente (voam com mochila a jato até o elemento da reação)
    for (let i = frente.length - 1; i >= 0; i--) {
      const a = frente[i], F = 3, ft = 48;
      if (t > a.ate) { frente.splice(i, 1); continue; }
      let ax, ay;
      if (a.voo != null) { const k = (t - a.nasc) / a.dur; ax = W * a.voo; ay = H - (H + ft * 2) * k; }
      else if (a.el && document.contains(a.el)) { const r = a.el.getBoundingClientRect(); ax = r.right + 6 > W - ft ? r.left - ft - 6 : r.right + 6; ay = r.top - 10; }
      else if (a.topo) { ax = W * 0.5 - ft / 2; ay = 20; }
      else { ax = Math.min(W - ft - 20, 110); ay = H - 190; }
      if (a.x == null) { a.x = ax < W / 2 ? -ft : W + ft; a.y = H - ft; }
      const ki = reduz || a.voo != null ? 1 : Math.min(1, (t - a.nasc) / 520);
      if (a.voo != null) { a.x = ax; a.y = ay; } else { const k = ki < 1 ? 1 - Math.pow(1 - ki, 3) : Math.min(1, dt * 14); a.x += (ax - a.x) * k; a.y += (ay - a.y) * k - (ki < 1 ? Math.sin(Math.PI * ki) * 6 : 0); }
      const bob = reduz ? 0 : Math.sin(t / 260 + a.fase) * 2.5, y = a.y + bob, dir = a.x + ft / 2 < W / 2 ? 1 : -1;
      if (!reduz && a.voo == null) { const fl = Math.floor(t / 70) % 2; gCrew.fillStyle = fl ? '#fbbf24' : '#fb923c'; gCrew.fillRect(Math.round(a.x + 5 * F), Math.round(y + 15 * F), 2 * F, (fl ? 2 : 3) * F); gCrew.fillRect(Math.round(a.x + 9 * F), Math.round(y + 15 * F), 2 * F, (fl ? 3 : 2) * F); }
      pintar(gCrew, robo(a.cor, a.voo != null ? 'preocupado' : 'feliz', 'parado', h.luz), a.x, y, F, a.voo != null ? (Math.floor(t / 80) % 2 ? 1 : -1) : dir, 1);
      if (a.obj) pintar(gCrew, objeto(a.obj), a.x + (dir > 0 ? 11 * F : -4 * F), y + 7 * F, F, 1, 1);
      if (a.emo && (t - a.nasc) % 1700 < 1250) pintar(gCrew, bolha(a.emo), a.x + (dir > 0 ? 9 : -4) * F, y - 11 * F, F, 1, 1);
    }
    // halos seguem o elemento
    for (let i = halos.length - 1; i >= 0; i--) {
      const o = halos[i];
      if (t > o.ate || !document.contains(o.el)) { o.d.remove(); halos.splice(i, 1); continue; }
      const r = o.el.getBoundingClientRect();
      Object.assign(o.d.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    }
    // o Bit
    const tamB = estreito() ? 48 : 72, SB = tamB / 16;
    if (cvBit.width !== Math.round(tamB * dpr)) { cvBit.width = Math.round(tamB * dpr); cvBit.height = Math.round(tamB * dpr); }
    gBit.setTransform(dpr, 0, 0, dpr, 0, 0); gBit.imageSmoothingEnabled = false; gBit.clearRect(0, 0, tamB, tamB);
    const falando = t < B.falandoAte;
    let oyB = reduz ? 0 : Math.round(Math.sin(t / 420)) * SB * 0.5;
    if (!reduz && t < B.puloAte) oyB -= Math.abs(Math.sin((B.puloAte - t) / 110)) * SB * 2;
    const oxB = !reduz && t < B.tremeAte ? Math.round(Math.sin(t / 26)) * SB * 0.4 : 0;
    const rostoB = mem.mudo || (!falando && t % 3400 < 140) ? 'pisca' : h.rosto;
    gBit.save(); gBit.translate(oxB, oyB);
    gBit.drawImage(robo('violeta', rostoB, falando && !reduz && Math.floor(t / 200) % 2 ? 'passoB' : 'parado', falando && Math.floor(t / 160) % 2 ? '#ffffff' : h.luz), 0, 0, tamB, tamB);
    gBit.restore();
    escolherDoca(t);
    requestAnimationFrame(quadro);
  }

  if (mem.mudo) bitEl.classList.add('jevi-mudo');
  aplicarHumor('explorando');
  requestAnimationFrame(quadro);
  setTimeout(talvezEnviar, 600);
  window.JevIntencoes = { versao: 1, estado: () => ({ humor, falas: mem.falas, ultima: mem.ultima, chamadas }) };
})();

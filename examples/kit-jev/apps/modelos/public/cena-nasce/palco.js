// Tela do "Fale e a Cena Nasce": você conta uma história e ela vira desenho animado. A cada pausa da fala vai UMA chamada
// (jogada "cena") e a resposta do Jev mexe em tudo: o lugar se monta como um livro pop-up, o céu muda com a hora, o tempo
// cai em partículas, a luz da cena acompanha a hora e o clima, e cada personagem entra, sai e faz a sua ação.
import { desenho, cabecaDe, DEFS } from './bonecos.js';
import { cenario as desenharCenario } from './cenarios.js';
import { criarClima } from './clima.js';

// a história da demonstração (▶): duas viradas — a neve na praia e o dragão que só queria bolo
const DEMO = [
  'Era uma vez uma menina que morava numa fazenda com o seu cachorro.',
  'Num dia de sol, os dois foram passear na praia.',
  'O cachorro corria atrás das ondas e a menina ria sem parar.',
  'De repente, começou a nevar!',
  'Os dois fizeram um boneco de neve e dançaram de alegria.',
  'Quando a noite chegou, apareceu um dragão enorme! A menina ficou com medo.',
  'Mas o dragão era bonzinho, e adorava comer bolo!',
  'A neve parou, o céu se encheu de estrelas e todos dormiram felizes. Fim!',
];
// começos prontos (na página em branco): passam pelo mesmo caminho da voz
const PRONTAS = [
  { rotulo: '🏖️ A praia que nevou', texto: 'Era um dia de sol na praia. Uma menina brincava na areia com o seu cachorro. De repente, começou a nevar!' },
  { rotulo: '🐉 O dragão comilão', texto: 'Era uma vez um castelo. Um dia apareceu um dragão, mas ele era bonzinho e adorava comer bolo.' },
  { rotulo: '🚀 Viagem ao espaço', texto: 'Um menino entrou num foguete e voou até o espaço. Lá ele encontrou um alienígena dançando.' },
  { rotulo: '🧜‍♀️ No fundo do mar', texto: 'No fundo do mar, uma sereia nadava com um pinguim. De repente, eles acharam um baú de tesouro!' },
  { rotulo: '👻 Noite de tempestade', texto: 'Era noite na floresta e caiu uma tempestade. Um fantasma apareceu e a coruja ficou com medo.' },
];

const MUNDO_L = 1600, MUNDO_A = 900;
const PROF = { longe: 0.22, meio: 0.55, perto: 1, frente: 1.35, luzes: 0.55 };
const CHAO_PERS = 716, CHAO_FUNDO = 664, CHAO_FRENTE = 742;
const ESCALA = { personagem: 1.25, objeto: 1.1 };      // tamanho em cena (o catálogo guarda a altura-base)
const FALAS_ACAO = { parado: 'parado', andando: 'andando', correndo: 'correndo', pulando: 'pulando', voando: 'voando', nadando: 'nadando', dormindo: 'dormindo', dancando: 'dançando', chorando: 'chorando', rindo: 'rindo', com_medo: 'com medo', bravo: 'bravo', comendo: 'comendo' };

const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const palavras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// ---------- luz da cena: uma matriz de cor (feColorMatrix) que escurece, esquenta ou esfria o mundo ----------
const LUZ_HORA = {
  ceu: { amanhecer: { t: [1.0, 0.88, 0.9], s: 0.95, o: [0.035, 0.01, 0.04] }, dia: { t: [1, 1, 1], s: 1, o: [0, 0, 0] }, entardecer: { t: [1.03, 0.8, 0.66], s: 1.05, o: [0.03, 0, 0] }, noite: { t: [0.42, 0.5, 0.8], s: 0.62, o: [0, 0.012, 0.05] } },
  interior: { amanhecer: { t: [1, 0.94, 0.92], s: 0.97, o: [0.02, 0.01, 0.02] }, dia: { t: [1, 1, 1], s: 1, o: [0, 0, 0] }, entardecer: { t: [1, 0.88, 0.78], s: 1, o: [0.02, 0, 0] }, noite: { t: [0.8, 0.7, 0.62], s: 0.85, o: [0.02, 0.01, 0] } },
  espaco: { amanhecer: { t: [0.94, 0.93, 1], s: 1, o: [0, 0, 0.02] }, dia: { t: [0.94, 0.93, 1], s: 1, o: [0, 0, 0.02] }, entardecer: { t: [0.94, 0.93, 1], s: 1, o: [0, 0, 0.02] }, noite: { t: [0.94, 0.93, 1], s: 1, o: [0, 0, 0.02] } },
  agua: { amanhecer: { t: [0.86, 0.94, 1.02], s: 0.95, o: [0.01, 0.02, 0.05] }, dia: { t: [0.84, 0.98, 1.06], s: 0.96, o: [0, 0.02, 0.05] }, entardecer: { t: [0.8, 0.84, 0.98], s: 0.95, o: [0.02, 0.01, 0.04] }, noite: { t: [0.36, 0.5, 0.78], s: 0.7, o: [0, 0.02, 0.06] } },
};
const LUZ_CLIMA = { nublado: { t: 0.86, s: 0.85 }, chuva: { t: 0.78, s: 0.8 }, tempestade: { t: 0.64, s: 0.75 }, neve: { t: [0.97, 0.99, 1.05], s: 0.95 }, arco_iris: { s: 1.08 } };
const LUZ_HUMOR = { alegre: { t: [1.03, 1.01, 0.97], s: 1.1 }, suspense: { t: [0.86, 0.82, 0.96], s: 0.86 }, triste: { t: [0.93, 0.95, 1.02], s: 0.6 }, engracado: { s: 1.18 }, calmo: { s: 0.95, o: [0.01, 0.012, 0.02] } };
function matrizLuz({ hora, clima, humor, modo }) {
  const b = (LUZ_HORA[modo] || LUZ_HORA.ceu)[hora] || LUZ_HORA.ceu.dia;
  let t = b.t.slice(), s = b.s, o = b.o.slice();
  for (const x of [modo === 'ceu' ? LUZ_CLIMA[clima] : null, LUZ_HUMOR[humor]]) {
    if (!x) continue;
    if (x.t != null) t = t.map((v, i) => v * (Array.isArray(x.t) ? x.t[i] : x.t));
    if (x.s != null) s *= x.s;
    if (x.o) o = o.map((v, i) => v + x.o[i]);
  }
  const lr = 0.2126, lg = 0.7152, lb = 0.0722, sr = (1 - s) * lr, sg = (1 - s) * lg, sb = (1 - s) * lb;
  const rows = [[sr + s, sg, sb], [sr, sg + s, sb], [sr, sg, sb + s]];
  const v = [];
  rows.forEach((r, i) => v.push(r[0] * t[i], r[1] * t[i], r[2] * t[i], 0, o[i]));
  v.push(0, 0, 0, 1, 0);
  return v;
}

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, sleep } = ui;
  const reduz = !!ui.reduzMovimento;
  const L = spec.limiar;
  const CAT = Object.fromEntries(spec.catalogo.map((c) => [c.id, c]));
  const LUG = Object.fromEntries(spec.lugares.map((x) => [x.id, x]));
  const HOR = Object.fromEntries(spec.horas.map((x) => [x.id, x]));
  const CLI = Object.fromEntries(spec.climas.map((x) => [x.id, x]));
  const HUM = Object.fromEntries(spec.humores.map((x) => [x.id, x]));
  const perguntar = api.ultima();
  const u = (arq) => api.url('assets/' + arq);

  // ---------- estado ----------
  const cena = { lugar: null, hora: 'dia', clima: 'limpo', humor: 'calmo' };
  const atores = new Map();          // id → ator em cena
  let ordem = 0, textoAplicado = '', emVoo = 0, historiaDaDemo = false, papelAberto = true;
  let vis = { x0: 0, x1: MUNDO_L, y0: 0, s: 1 };

  // ---------- tela ----------
  const raiz = el('div', { class: 'cn' });
  const defs = el('div', { class: 'cn-defs', 'aria-hidden': 'true', html: `<svg width="0" height="0" style="position:absolute"><defs>${DEFS}<filter id="cn-luz" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter><filter id="cn-luz-a" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></defs></svg>` });
  const [feLuz, feLuzA] = defs.querySelectorAll('feColorMatrix');
  // os personagens recebem só parte da luz da hora: de noite a cena escurece, mas eles continuam legíveis
  const ID = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  const pintarLuz = (v) => { feLuz.setAttribute('values', v.map((x) => x.toFixed(4)).join(' ')); feLuzA.setAttribute('values', v.map((x, i) => (ID[i] + (x - ID[i]) * 0.55).toFixed(4)).join(' ')); };

  // céu: uma camada por hora (cruzam suavemente), o espaço, a água, sol, lua, estrelas, nuvens, arco-íris, aurora
  const estrelas = Array.from({ length: 80 }, (_, i) => `<i style="left:${(i * 37.3) % 100}%;top:${(i * 23.7) % 62}%;--d:${(1.4 + (i % 7) * 0.45).toFixed(2)}s;--t:${(1 + (i % 3)) * 1.2}px;animation-delay:-${(i % 9) * 0.5}s"></i>`).join('');
  // nuvens: cada uma atravessa o céu inteiro; o atraso negativo espalha as cinco pelo caminho
  const nuvens = [[9, 1, 92, 0.12], [4, 0.8, 120, 0.38], [13, 1.2, 104, 0.62], [6, 0.9, 136, 0.86], [19, 0.7, 150, 0.5]].map(([y, k, d, f]) => `<img class="cn-nuvem" src="${u('ceu-nuvem.png')}" alt="" style="top:${y}%;--k:${k};--d:${d}s;animation-delay:-${(d * f).toFixed(1)}s">`).join('');
  const ceu = el('div', { class: 'cn-ceu', 'aria-hidden': 'true', html:
    `<div class="cn-ceu-h h-amanhecer"></div><div class="cn-ceu-h h-dia"></div><div class="cn-ceu-h h-entardecer"></div><div class="cn-ceu-h h-noite"></div>`
    + `<div class="cn-ceu-esp"></div><div class="cn-ceu-agua"><i></i><i></i><i></i></div><div class="cn-ceu-cinza"></div>`
    + `<div class="cn-estrelas">${estrelas}</div>`
    + `<div class="cn-aurora"><i></i><i></i></div>`
    + `<svg class="cn-arco" viewBox="0 0 400 200" aria-hidden="true">${['#ff5f6d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#748ffc', '#b197fc'].map((c, i) => `<path d="M${20 + i * 9} 200 A${180 - i * 9} ${180 - i * 9} 0 0 1 ${380 - i * 9} 200" fill="none" stroke="${c}" stroke-width="9.5" stroke-opacity=".85"/>`).join('')}</svg>`
    + `<div class="cn-sol"><img src="${u('ceu-sol.png')}" alt=""></div><div class="cn-lua"><img src="${u('ceu-lua.png')}" alt=""></div>`
    + `<div class="cn-nuvens">${nuvens}</div>` });

  // o mundo em três folhas com a mesma escala: o cenário (com a luz da hora), as luzes da noite (sem escurecer) e os
  // personagens com a camada da frente (com a luz da hora) — assim janela acesa nunca passa por cima de ninguém
  const mundo = el('div', { class: 'cn-mundo cn-mundo-cenario', 'aria-hidden': 'true' });
  const mundoLuz = el('div', { class: 'cn-mundo cn-mundo-luz', 'aria-hidden': 'true' });
  const mundoAtores = el('div', { class: 'cn-mundo cn-mundo-atores' });
  const MUNDOS = [mundo, mundoLuz, mundoAtores];
  const neveChao = el('div', { class: 'cn-neve-chao', 'aria-hidden': 'true', html: `<svg viewBox="-200 0 2000 260" preserveAspectRatio="none"><path d="M-200 18 C0 0 200 26 400 12 C600 -2 800 24 1000 10 C1200 -2 1400 22 1600 10 C1700 4 1760 12 1800 14 L1800 260 L-200 260 Z" fill="#fbfdff"/><path d="M-200 30 C100 18 300 40 600 26 C900 14 1200 38 1500 24 C1650 18 1750 28 1800 30" stroke="#d7e6f8" stroke-width="10" fill="none"/></svg>` });
  const palcoAtores = el('div', { class: 'cn-atores' });
  mundo.append(neveChao);
  mundoAtores.append(palcoAtores);
  const etiquetas = el('div', { class: 'cn-etiquetas', 'aria-hidden': 'true' });
  const canvas = el('canvas', { class: 'cn-particulas', 'aria-hidden': 'true' });
  const flash = el('div', { class: 'cn-flash', 'aria-hidden': 'true' });
  const vinheta = el('div', { class: 'cn-vinheta', 'aria-hidden': 'true' });

  // painel do Jev: a fita (latência) e o que ele decidiu
  const chip = (cls, rot) => el('div', { class: 'cn-chip ' + cls, title: rot }, [el('span', { class: 'ic', 'aria-hidden': 'true' }), el('span', { class: 'tx' }), el('b', { class: 'pc mj-num' })]);
  const chips = { lugar: chip('k-lugar', 'Lugar'), hora: chip('k-hora', 'Hora do dia'), clima: chip('k-clima', 'Tempo'), humor: chip('k-humor', 'Clima da cena') };
  const fita = el('div', { class: 'cn-fita' }, [api.fita.no]);
  const hud = el('div', { class: 'cn-hud' }, [fita, el('div', { class: 'cn-chips', 'aria-live': 'polite' }, Object.values(chips))]);

  // legenda grande (a narração)
  const legFin = el('span', { class: 'fin' }), legPar = el('span', { class: 'par' });
  const legenda = el('p', { class: 'cn-legenda vazia' }, [legFin, legPar]);

  // página em branco: o começo
  const btsProntas = PRONTAS.map((p) => el('button', { class: 'cn-pronta', type: 'button', onclick: () => contarPronta(p.texto) }, [p.rotulo]));
  const papel = el('div', { class: 'cn-papel' }, [
    el('div', { class: 'cn-rabiscos', 'aria-hidden': 'true', html: `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#7cc8f0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"><path class="risco" d="M-20 700 C200 660 420 690 640 676 C880 660 1100 694 1340 676 C1460 668 1540 676 1620 690"/><circle class="risco" cx="230" cy="190" r="58"/><path class="risco" d="M230 106 v-26 M230 274 v26 M146 190 h-26 M314 190 h26 M170 130 l-18 -18 M290 130 l18 -18 M170 250 l-18 18 M290 250 l18 18"/><path class="risco" d="M1180 220 c-40 0 -54 -50 -14 -62 c6 -40 66 -46 82 -12 c30 -18 70 6 60 40 c34 10 30 56 -8 58 Z"/><path class="risco" d="M1330 610 l60 -130 l60 130 M1352 560 h76 M260 640 c0 -60 30 -90 60 -90 c30 0 60 30 60 90"/></g></svg>` }),
    el('div', { class: 'cn-papel-txt' }, [
      el('p', { class: 'cn-papel-sobre', text: 'Fale e a cena nasce' }),
      el('h2', { text: 'Era uma vez…' }),
      el('p', { class: 'cn-papel-dica', text: 'Aperte o microfone e conte uma história: o lugar, quem aparece e o que cada um faz viram desenho enquanto você fala.' }),
      el('div', { class: 'cn-prontas' }, [el('span', { text: 'ou comece por uma destas:' }), ...btsProntas]),
    ]),
  ]);

  const tela = el('div', { class: 'cn-tela h-dia', role: 'img', 'aria-label': 'Cena em branco: conte uma história para ela nascer' }, [ceu, mundo, mundoLuz, mundoAtores, canvas, flash, vinheta, etiquetas, hud, papel]);

  const barra = api.voz.barraVoz({
    dica: 'Aperte o microfone e conte uma história',
    placeholder: 'Ou digite um pedaço da história e aperte Enter',
    onTexto: (fin, par) => mostrarLegenda(fin, par),
    onPausa: (texto) => aoFalar(texto),
  });
  const btNova = el('button', { class: 'cn-nova', type: 'button', onclick: () => { pararDemo(); novaHistoria(); } }, ['↺ Nova história']);
  raiz.append(defs, el('div', { class: 'cn-palco' }, [tela, legenda]), el('div', { class: 'cn-controles' }, [barra.no, btNova, som.botao(el)]));
  area.append(raiz);

  // durante ou depois da demonstração, falar ou digitar começa uma história nova (a demonstração para na hora)
  barra.no.addEventListener('click', (e) => { if ((historiaDaDemo || ctlDemo) && e.target.closest('.mj-voz-mic')) { pararDemo(); novaHistoria(); } }, true);
  barra.no.addEventListener('keydown', (e) => { if ((historiaDaDemo || ctlDemo) && e.key === 'Enter' && e.target.closest('.mj-voz-campo')) { pararDemo(); novaHistoria({ manterCampo: true }); } }, true);

  const clima = criarClima(canvas, { aoRelampago: relampago, somLigado: () => som.ligado, reduzMovimento: reduz });

  // ---------- o mundo em escala: 1600 × 900 cobrindo a tela, preso no chão ----------
  function medir() {
    const r = tela.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = Math.max(r.width / MUNDO_L, r.height / MUNDO_A);
    const tx = (r.width - MUNDO_L * s) / 2, ty = r.height - MUNDO_A * s;
    for (const m of MUNDOS) m.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    vis = { x0: MUNDO_L / 2 - r.width / s / 2, x1: MUNDO_L / 2 + r.width / s / 2, y0: MUNDO_A - r.height / s, s };
    tela.style.setProperty('--esc', s.toFixed(4));
    clima.medir();
    posicionar(true);
  }
  new ResizeObserver(() => medir()).observe(tela);

  // ---------- câmera: deriva lenta + o mouse (as camadas de longe andam menos: paralaxe) ----------
  let cam = 0, camAlvo = 0, mouse = 0;
  tela.addEventListener('pointermove', (e) => { const r = tela.getBoundingClientRect(); mouse = ((e.clientX - r.left) / r.width - 0.5) * -70; });
  tela.addEventListener('pointerleave', () => { mouse = 0; });
  function camera(t) {
    camAlvo = Math.sin(t / 9000) * 26 + mouse;
    cam += (camAlvo - cam) * 0.04;
    for (const m of MUNDOS) m.style.setProperty('--cam', cam.toFixed(2));
    requestAnimationFrame(camera);
  }
  if (!reduz) requestAnimationFrame(camera);

  // ---------- luz (gradação de cor animada) ----------
  let luzAtual = matrizLuz({ hora: 'dia', clima: 'limpo', humor: 'calmo', modo: 'ceu' }), luzDe = luzAtual, luzAlvo = luzAtual, luzT0 = 0, luzRaf = 0;
  function luz() {
    const modo = !cena.lugar ? 'ceu' : cenarioAtual && cenarioAtual.interior ? 'interior' : cenarioAtual ? cenarioAtual.ceu : 'ceu';
    luzAlvo = matrizLuz({ hora: cena.hora, clima: cena.clima, humor: cena.humor, modo });
    luzDe = luzAtual.slice(); luzT0 = performance.now();
    if (reduz) { luzAtual = luzAlvo; pintarLuz(luzAtual); return; }
    if (!luzRaf) luzRaf = requestAnimationFrame(passoLuz);
  }
  function passoLuz(t) {
    const k = Math.min(1, (t - luzT0) / 1600), e = ease(k);
    luzAtual = luzDe.map((v, i) => v + (luzAlvo[i] - v) * e);
    pintarLuz(luzAtual);
    luzRaf = k < 1 ? requestAnimationFrame(passoLuz) : 0;
  }

  // ---------- céu, hora, tempo e clima da cena ----------
  function aplicarCeu() {
    const especial = cenarioAtual ? cenarioAtual.ceu : 'ceu';
    tela.className = ['cn-tela', 'h-' + cena.hora, 't-' + cena.clima, 'm-' + cena.humor, 'l-' + (cena.lugar || 'vazio'), 'ceu-' + especial, cenarioAtual && cenarioAtual.interior ? 'interior' : '', papelAberto ? 'com-papel' : ''].filter(Boolean).join(' ');
    // dentro de casa a chuva e a neve só aparecem pela janela: as partículas vão para trás da parede
    const interior = !!(cenarioAtual && cenarioAtual.interior);
    if (interior && canvas.parentNode !== ceu) ceu.append(canvas);
    if (!interior && canvas.parentNode !== tela) tela.insertBefore(canvas, flash);
    clima.medir();
    const paleta = ['deserto', 'praia'].includes(cena.lugar) ? 'areia' : cena.lugar === 'montanha_nevada' ? 'neve' : 'folhas';
    clima.definir(papelAberto ? 'limpo' : cena.clima, { agua: especial === 'agua', espaco: especial === 'espaco', noite: cena.hora === 'noite', paleta });
    neveChao.classList.toggle('on', cena.clima === 'neve' && !interior && especial === 'ceu' && cena.lugar !== 'montanha_nevada');
    luz();
    descrever();
  }
  function relampago() {
    if (reduz) return;
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
  }

  // ---------- lugares: troca como um livro pop-up (o velho deita, o novo levanta, de longe para perto) ----------
  let cenarioAtual = null, camadasAtuais = [];
  function trocarLugar(id, { silencioso = false } = {}) {
    if (cenarioAtual && cenarioAtual.id === id) return;
    const novo = desenharCenario(id, u);
    const velhas = camadasAtuais;
    camadasAtuais = [];
    ['frente', 'perto', 'meio', 'longe', 'luzes'].forEach((nome, i) => {
      const v = velhas.find((c) => c.nome === nome); if (!v) return;
      if (reduz) { v.no.remove(); return; }
      const a = v.no.animate([{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: 'rotateX(86deg)', opacity: 0 }], { duration: 420, delay: i * 55, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      a.onfinish = () => v.no.remove();
    });
    ['longe', 'meio', 'perto', 'frente', 'luzes'].forEach((nome, i) => {
      const html = novo.camadas[nome]; if (!html) return;
      const no = el('div', { class: 'cn-camada c-' + nome, html });
      no.style.setProperty('--prof', PROF[nome]);
      if (nome === 'luzes') mundoLuz.append(no);
      else if (nome === 'frente') mundoAtores.append(no);
      else mundo.insertBefore(no, neveChao);
      camadasAtuais.push({ nome, no });
      if (!reduz) no.animate([{ transform: 'rotateX(84deg)', opacity: 0 }, { transform: 'rotateX(-5deg)', opacity: 1, offset: 0.72 }, { transform: 'rotateX(0deg)', opacity: 1 }],
        { duration: 680, delay: (velhas.length ? 300 : 60) + Math.min(i, 3) * 110, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      else no.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'backwards' });
    });
    cenarioAtual = novo;
    for (const m of MUNDOS) m.style.setProperty('--chao', novo.chao);
    if (!silencioso) som.whoosh();
    // os personagens dão um pulinho quando o mundo muda
    for (const a of atores.values()) if (!a.saindo) { a.el.classList.remove('pulinho'); void a.el.offsetWidth; a.el.classList.add('pulinho'); }
    aplicarCeu();
    posicionar();
  }

  // ---------- personagens e objetos ----------
  const VEICULO_ACAO = { parado: 'parado', andando: 'andando', correndo: 'correndo', voando: 'voando' };
  function criarAtor(id) {
    const item = CAT[id];
    const d = desenho(item, u);
    const [x0, y0, w, h] = d.caixa;
    const alt = item.altura * (item.fundo ? 1 : ESCALA[item.tipo] || 1);
    const larg = alt * w / h;
    const no = el('div', { class: `cn-ator tipo-${item.tipo}${item.veiculo ? ' veiculo' : ''}${item.voa ? ' flutua' : ''} id-${id} ac-parado`, 'data-id': id });
    no.style.setProperty('--w', larg.toFixed(1)); no.style.setProperty('--h', alt);
    const cab = cabecaDe(item);
    no.style.setProperty('--hx', cab.x); no.style.setProperty('--hy', cab.y); no.style.setProperty('--oy', cab.olhos);
    if (cab.boca) { no.style.setProperty('--bx', cab.boca[0]); no.style.setProperty('--by', cab.boca[1]); }
    no.classList.add('olha-' + item.olha);
    no.innerHTML = `<div class="cn-sombra"></div><div class="cn-pop"><div class="cn-mov"><div class="cn-vira"><div class="cn-corpo">`
      + `<svg class="cn-sprite" viewBox="${x0} ${y0} ${w} ${h}" aria-hidden="true">${d.svg}</svg></div></div><div class="cn-fx"></div></div></div>`;
    if (id === 'balao') no.querySelector('.cn-mov').insertAdjacentHTML('afterbegin', '<i class="cn-cordao"></i>');
    const tag = el('div', { class: 'cn-tag' });
    etiquetas.append(tag);
    const ator = { id, item, el: no, acao: 'parado', ordem: ++ordem, x: 800, y: CHAO_PERS, saindo: false, olha: item.olha, alt, larg, fx: no.querySelector('.cn-fx'), corpo: no.querySelector('.cn-corpo'), tag };
    return ator;
  }

  function entrar(id, acao, atraso = 0) {
    if (atores.has(id)) { const a = atores.get(id); if (a.saindo) { a.saindo = false; a.el.classList.remove('sai'); } if (acao) definirAcao(a, acao); return; }
    const a = criarAtor(id);
    atores.set(id, a);
    definirAcao(a, acao || 'parado', true);
    posicionar();
    a.el.style.setProperty('--atraso', atraso + 'ms');
    a.el.classList.add('entra');
    palcoAtores.append(a.el);
    garantirMundo();
    mostrarTag(a, a.item.nome, atraso + 380);
    setTimeout(() => { if (!a.saindo) som.pop(); }, atraso + 60);
    setTimeout(() => a.el.classList.remove('entra'), atraso + 950);
  }

  function sair(id) {
    const a = atores.get(id); if (!a || a.saindo) return;
    a.saindo = true;
    const lado = a.x < (vis.x0 + vis.x1) / 2 ? -1 : 1;
    const voa = a.acao === 'voando' || a.item.voa;
    a.el.style.setProperty('--fuga', (lado * (vis.x1 - vis.x0) * (voa ? 0.25 : 0.7)).toFixed(0));
    a.el.style.setProperty('--fuga-y', voa ? '-760' : '0');
    a.el.classList.add('sai');
    a.tag.classList.remove('on');
    setTimeout(() => { if (a.saindo) { a.el.remove(); a.tag.remove(); atores.delete(id); posicionar(); descrever(); } }, reduz ? 50 : 1100);
    posicionar();
  }

  function definirAcao(a, acao, primeira = false) {
    if (a.item.veiculo) acao = VEICULO_ACAO[acao] && a.item.veiculo.includes(acao) ? acao : 'parado';
    if (!primeira && a.acao === acao) return;
    const antes = a.acao;
    a.el.classList.remove('ac-' + a.acao);
    a.acao = acao;
    a.el.classList.add('ac-' + acao);
    a.fx.innerHTML = efeitos(a);
    // decolar e pousar sem pulo seco (o corpo sobe do chão até a altura do voo)
    if (!primeira && !reduz && !a.item.veiculo && (acao === 'voando') !== (antes === 'voando')) {
      const cls = acao === 'voando' ? 'decola' : 'pousa';
      a.el.classList.remove('decola', 'pousa'); void a.el.offsetWidth; a.el.classList.add(cls);
      setTimeout(() => a.el.classList.remove(cls), 900);
    }
    if (!primeira) mostrarTag(a, (a.item.veiculo ? { parado: 'parado', andando: 'andando', correndo: 'a toda!', voando: 'voando!' }[acao] : FALAS_ACAO[acao]) || acao);
    orientar(a);
    if (!primeira && (acao === 'comendo' || antes === 'comendo' || acao === 'correndo' || antes === 'correndo')) posicionar();
  }

  function efeitos(a) {
    const f = (arq, cls, extra = '') => `<img class="fx ${cls}" src="${u(arq)}" alt=""${extra}>`;
    const fala = { dormindo: f('fx-zzz.png', 'fx-zzz') + f('fx-zzz.png', 'fx-zzz b') + f('fx-zzz.png', 'fx-zzz c'), dancando: f('fx-notas.png', 'fx-notas') + f('fx-notas.png', 'fx-notas b'),
      chorando: f('fx-gota.png', 'fx-lagrima') + f('fx-gota.png', 'fx-lagrima b'), com_medo: f('fx-suor.png', 'fx-suor'), bravo: f('fx-raiva.png', 'fx-raiva'),
      comendo: f('fx-fatia.png', 'fx-fatia') + '<i class="fx-farelo"></i><i class="fx-farelo b"></i>', correndo: f('fx-poeira.png', 'fx-poeira'),
      rindo: f('fx-risada.png', 'fx-risada') + f('fx-risada.png', 'fx-risada b'), voando: f('fx-brilho.png', 'fx-brilho') + f('fx-brilho.png', 'fx-brilho b'),
      pulando: f('fx-poeira.png', 'fx-pouso'), nadando: '<i class="fx-bolha"></i><i class="fx-bolha b"></i><i class="fx-bolha c"></i>' }[a.acao] || '';
    const fogo = a.acao === 'bravo' && (a.id === 'dragao' || a.id === 'dinossauro') ? f('fx-fogo.png', 'fx-fogo') : '';
    return fala + fogo;
  }

  // etiqueta (nome ao entrar, ação ao mudar): fica fora do mundo para não escurecer de noite e segue o personagem
  let tagsRaf = 0;
  function mostrarTag(a, texto, atraso = 0) {
    clearTimeout(a.tTag);
    a.tTag = setTimeout(() => {
      if (a.saindo) return;
      a.tag.textContent = texto;
      a.tag.classList.remove('on'); void a.tag.offsetWidth; a.tag.classList.add('on');
      a.tagAte = performance.now() + 2300;
      if (!tagsRaf) tagsRaf = requestAnimationFrame(seguirTags);
      a.tTag = setTimeout(() => a.tag.classList.remove('on'), 2300);
    }, atraso);
  }
  function seguirTags(t) {
    const rt = tela.getBoundingClientRect();
    let algum = false;
    for (const a of atores.values()) {
      if (!a.tagAte || t > a.tagAte + 400) continue;
      algum = true;
      const r = a.corpo.getBoundingClientRect();
      const meia = a.tag.offsetWidth / 2 + 6;
      a.tag.style.left = Math.max(meia, Math.min(rt.width - meia, r.left + r.width / 2 - rt.left)).toFixed(1) + 'px';
      a.tag.style.top = (r.top - rt.top - 10).toFixed(1) + 'px';
    }
    tagsRaf = algum ? requestAnimationFrame(seguirTags) : 0;
  }

  // para onde olha: correndo vai para a direita; parado, olha para o meio da cena
  function orientar(a) {
    if (a.olha === 'frente') { a.el.classList.remove('virado'); return; }
    const praDireita = a.acao === 'correndo' || (a.acao !== 'andando' && a.x < (vis.x0 + vis.x1) / 2);
    a.el.classList.toggle('virado', a.olha === 'esq' ? praDireita : !praDireita);
  }

  // posições: personagens e objetos pequenos numa fila no chão (por ordem de chegada, sem um ficar em cima do outro);
  // objetos grandes (castelo, casa, árvore, foguete…) ficam atrás; o bolo vai para perto de quem come e o balão, de
  // quem pode segurar
  const FUNDO_X = [0.84, 0.15, 0.5, 0.95, 0.05, 0.66, 0.33];
  const SEGURA = ['menina', 'menino', 'vovo', 'pirata', 'astronauta', 'super_heroi', 'bruxa', 'mago', 'robo', 'alienigena', 'macaco'];
  function posicionar(semAnimar = false) {
    const lista = [...atores.values()].filter((a) => !a.saindo).sort((a, b) => a.ordem - b.ordem);
    const larg = vis.x1 - vis.x0;
    const comedor = lista.find((a) => a.item.tipo === 'personagem' && a.acao === 'comendo');
    const humano = lista.find((a) => SEGURA.includes(a.id));
    const presoBolo = (a) => a.id === 'bolo' && comedor;
    const presoBalao = (a) => a.id === 'balao' && humano;
    const fila = lista.filter((a) => !a.item.fundo && !presoBolo(a) && !presoBalao(a));
    const gap = 46, m = Math.min(110, larg * 0.07);
    const total = fila.reduce((t, a) => t + a.larg, 0) + gap * Math.max(0, fila.length - 1);
    const k = Math.max(0.6, Math.min(1, (larg - 2 * m) / Math.max(1, total)));
    const sobra = Math.max(0, (larg - 2 * m) - total * k);
    const folga = fila.length > 1 ? Math.min(140, sobra / fila.length) : Math.min(140, sobra / 2);
    const passoExtra = fila.length > 1 ? Math.min(folga, 90) : 0;
    const largura = total * k + passoExtra * (fila.length - 1);
    let x = (vis.x0 + vis.x1) / 2 - largura / 2;
    fila.forEach((a, i) => {
      const w = a.larg * k;
      a.k = k; a.x = x + w / 2; x += w + gap * k + passoExtra;
      a.y = a.item.tipo === 'personagem' ? CHAO_PERS + (fila.length > 2 ? (i % 2 ? 12 : -6) : 0) : CHAO_FRENTE;
      a.anda = Math.max(14, Math.min(82, (gap * k + passoExtra) / 2 + 6));
    });
    let iF = 0;
    for (const a of lista) {
      if (fila.includes(a)) continue;
      a.k = 1; a.anda = 40;
      if (presoBolo(a)) { a.k = comedor.k || 1; a.x = comedor.x + comedor.larg * a.k * 0.42; a.y = comedor.y + 34; continue; }
      // o balão flutua ao lado da cabeça de quem segura, e o barbante desce até a mão
      if (presoBalao(a)) {
        const kh = humano.k || 1;
        a.x = humano.x - humano.larg * kh * 0.5 - a.larg * 0.36;
        a.y = humano.y - humano.alt * kh + 112;
        const maoX = humano.x - humano.larg * kh * 0.3, maoY = humano.y - humano.alt * kh * 0.2;
        const pontaX = a.x - a.larg * 0.37, pontaY = a.y - 130;
        a.corda = [Math.hypot(maoX - pontaX, maoY - pontaY), -Math.atan2(maoX - pontaX, maoY - pontaY)];
        continue;
      }
      if (a.id === 'balao') a.corda = [118, 0.05];
      const f = FUNDO_X[iF++ % FUNDO_X.length];
      a.x = vis.x0 + larg * f; a.y = CHAO_FUNDO;
      if (a.id === 'barco' && cenarioAtual && cenarioAtual.agua) { a.y = 640; a.k = 0.78; }
    }
    for (const a of lista) {
      const s = a.el.style;
      s.setProperty('--x', a.x.toFixed(1)); s.setProperty('--y', a.y.toFixed(1)); s.setProperty('--k', (a.k || 1).toFixed(3));
      s.setProperty('--anda', (a.anda || 40).toFixed(0));
      if (a.corda) { s.setProperty('--corda', a.corda[0].toFixed(0)); s.setProperty('--corda-ang', a.corda[1].toFixed(3) + 'rad'); }
      s.zIndex = String(Math.round(a.y * 2) + (a.acao === 'correndo' ? 400 : 0));
      a.el.classList.toggle('preso', presoBalao(a) && true);
      if (a.acao === 'correndo') {
        s.setProperty('--saida', (vis.x1 + 160 - a.x).toFixed(0));
        s.setProperty('--entrada', (vis.x0 - 160 - a.x).toFixed(0));
        s.setProperty('--dur-corre', ((larg + 320) / 620).toFixed(2) + 's');
      }
      orientar(a);
    }
    if (semAnimar) for (const a of lista) { a.el.classList.add('sem-anim'); requestAnimationFrame(() => requestAnimationFrame(() => a.el.classList.remove('sem-anim'))); }
  }

  // sem lugar ainda e alguém entrou: o campo aparece em volta
  function garantirMundo() {
    if (papelAberto) fecharPapel();
    if (!cena.lugar && !cenarioAtual) trocarLugar('campo', { silencioso: true });
  }

  // ---------- a página em branco ----------
  function fecharPapel() {
    if (!papelAberto) return;
    papelAberto = false;
    papel.classList.add('fecha');
    aplicarCeu();
  }
  function abrirPapel() {
    papelAberto = true;
    papel.classList.remove('fecha', 'falando');
    aplicarCeu();
  }

  // ---------- legenda ----------
  const NOMES = spec.catalogo.flatMap((c) => [c.nome, ...c.apelidos].map((n) => ({ id: c.id, n: semAcento(n) }))).filter((x) => x.n.length >= 2).sort((a, b) => b.n.length - a.n.length);
  function marcar(texto) {
    const chars = [...texto];
    const norm = chars.map((c) => { const n = semAcento(c); return n.length === 1 ? n : c.toLowerCase().slice(0, 1) || ' '; }).join('');
    const marcas = [];
    for (const { id, n } of NOMES) {
      if (!atores.has(id)) continue;
      let i = norm.indexOf(n);
      while (i >= 0) {
        const antes = i === 0 ? ' ' : norm[i - 1], depois = norm[i + n.length] || ' ';
        if (!/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois) && !marcas.some(([a, b]) => i < b && i + n.length > a)) marcas.push([i, i + n.length]);
        i = norm.indexOf(n, i + 1);
      }
    }
    marcas.sort((a, b) => a[0] - b[0]);
    const frag = document.createDocumentFragment();
    let p = 0;
    for (const [a, b] of marcas) { frag.append(chars.slice(p, a).join('')); frag.append(el('mark', { text: chars.slice(a, b).join('') })); p = b; }
    frag.append(chars.slice(p).join(''));
    return frag;
  }
  function mostrarLegenda(fin, par) {
    if (papelAberto && (fin || par)) papel.classList.add('falando');
    let t = fin || '';
    const max = window.innerWidth < 760 ? 70 : 128;
    const total = t.length + (par ? par.length + 1 : 0);
    if (total > max) {
      const corte = Math.max(0, total - max);
      t = t.slice(corte);
      const sp = t.indexOf(' '); if (sp > 0 && sp < 20) t = t.slice(sp + 1);
      t = '…' + t;
    }
    legFin.replaceChildren(marcar(t));
    legFin.append(par ? ' ' : '');
    legPar.textContent = par || '';
    legenda.classList.toggle('vazia', !(fin || par));
  }

  // ---------- o painel do Jev ----------
  function marcarChip(k, ic, tx, p, mudou) {
    const c = chips[k];
    c.querySelector('.ic').textContent = ic;
    c.querySelector('.tx').textContent = tx;
    c.querySelector('.pc').textContent = p != null ? Math.round(p * 100) + '%' : '';
    if (mudou) { c.classList.remove('mudou'); void c.offsetWidth; c.classList.add('mudou'); }
  }
  function desenharChips(r = {}, mudou = {}) {
    const p = (k) => { const a = r[k]; return a && a.probabilities ? Math.max(...Object.values(a.probabilities)) : null; };
    const lugar = cena.lugar ? LUG[cena.lugar] : null;
    marcarChip('lugar', lugar ? lugar.icone : '📖', lugar ? lugar.nome : 'Sem lugar ainda', mudou.lugar ? p('cenario') : null, mudou.lugar);
    marcarChip('hora', HOR[cena.hora].icone, HOR[cena.hora].nome, mudou.hora ? p('hora') : null, mudou.hora);
    marcarChip('clima', CLI[cena.clima].icone, CLI[cena.clima].nome, mudou.clima ? p('clima') : null, mudou.clima);
    marcarChip('humor', HUM[cena.humor].icone, HUM[cena.humor].nome, mudou.humor ? p('humor') : null, mudou.humor);
  }
  function descrever() {
    const quem = [...atores.values()].filter((a) => !a.saindo).map((a) => `${a.item.nome}${a.item.tipo === 'personagem' ? ' ' + FALAS_ACAO[a.acao] : ''}`);
    tela.setAttribute('aria-label', papelAberto ? 'Cena em branco: conte uma história para ela nascer'
      : `Cena: ${cena.lugar ? LUG[cena.lugar].nome : 'campo'}, ${HOR[cena.hora].nome.toLowerCase()}, ${CLI[cena.clima].nome.toLowerCase()}, clima ${HUM[cena.humor].nome.toLowerCase()}. ${quem.length ? 'Em cena: ' + quem.join(', ') + '.' : 'Ninguém em cena.'}`);
  }

  // ---------- conversa com o Jev ----------
  function trechoNovo(texto) {
    let novo = texto.startsWith(textoAplicado) ? texto.slice(textoAplicado.length).trim() : '';
    if (palavras(novo) < 6) novo = texto.split(/\s+/).slice(-Math.max(10, palavras(novo))).join(' ');
    return novo;
  }
  function elenco() {
    return [...atores.values()].filter((a) => !a.saindo).sort((a, b) => a.ordem - b.ordem).map((a) => ({ id: a.id, acao: a.acao }));
  }

  async function aoFalar(texto) {
    if (palavras(texto) < 3) return;
    const dados = { historia: texto.slice(-900), novo: trechoNovo(texto).slice(-300), cena: { lugar: cena.lugar, hora: cena.hora, clima: cena.clima }, elenco: elenco() };
    emVoo++;
    let r;
    try { r = await perguntar('cena', dados, `"${texto.slice(-38)}"`); } catch { r = null; } finally { emVoo--; }
    if (!r) return;
    aplicar(r, texto);
  }

  const top = (a) => { if (!a || !a.probabilities) return [null, 0]; return Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0]; };
  function aplicar(r, texto) {
    textoAplicado = texto;
    const mudou = {};
    const [lug, pl] = top(r.cenario);
    const novoLugar = lug && lug !== 'manter' && lug !== cena.lugar && pl >= L.lugar ? lug : null;
    const [hor, ph] = top(r.hora);
    if (hor && hor !== 'manter' && hor !== cena.hora && ph >= L.hora) { cena.hora = hor; mudou.hora = true; }
    const [cli, pc] = top(r.clima);
    if (cli && cli !== 'manter' && cli !== cena.clima && pc >= L.clima) { cena.clima = cli; mudou.clima = true; if (cli === 'neve' || cli === 'arco_iris') som.ding(); }
    const [hum, pu] = top(r.humor);
    if (hum && hum !== cena.humor && pu >= L.humor) { cena.humor = hum; mudou.humor = true; }
    if (novoLugar) { cena.lugar = novoLugar; mudou.lugar = true; fecharPapel(); trocarLugar(novoLugar); }
    else if (mudou.hora || mudou.clima || mudou.humor) aplicarCeu();

    // quem entra, quem sai e o que cada um faz (o castelo não entra como objeto quando ele já é o cenário; a casa,
    // quando a cena é dentro de casa)
    const redundante = (id) => (id === 'castelo' && cena.lugar === 'castelo') || (id === 'casa' && ['quarto', 'escola'].includes(cena.lugar));
    const entram = [];
    for (const it of spec.catalogo) {
      const p = r['p_' + it.id] && r['p_' + it.id].noul;
      if (p == null) continue;
      const esta = atores.has(it.id) && !atores.get(it.id).saindo;
      if (!esta && p >= L.entra && !redundante(it.id)) entram.push([it, p]);
      else if (esta && (p <= L.sai || redundante(it.id))) sair(it.id);
    }
    const acaoDe = (id) => {
      const a = r['acao_' + id] || r['mov_' + id];
      const [ac, pa] = top(a);
      return ac && pa >= L.acao ? ac : null;
    };
    for (const a of atores.values()) { if (a.saindo) continue; const ac = acaoDe(a.id); if (ac) definirAcao(a, ac); }
    const lotados = [...atores.values()].filter((a) => !a.saindo && a.item.tipo === 'personagem').length;
    entram.sort((a, b) => b[1] - a[1]).forEach(([it], i) => {
      if (it.tipo === 'personagem' && lotados + i >= 9) return;
      entrar(it.id, acaoDe(it.id), (novoLugar ? 520 : 0) + i * 150);
    });
    desenharChips(r, mudou);
    descrever();
  }

  // ---------- começos prontos e história nova ----------
  function novaHistoria({ manterCampo = false } = {}) {
    historiaDaDemo = false;
    const digitado = manterCampo ? barra.no.querySelector('.mj-voz-campo').value : '';
    barra.limpar();
    if (digitado) barra.no.querySelector('.mj-voz-campo').value = digitado;
    textoAplicado = '';
    for (const id of [...atores.keys()]) sair(id);
    Object.assign(cena, { lugar: null, hora: 'dia', clima: 'limpo', humor: 'calmo' });
    if (cenarioAtual) {
      const velhas = camadasAtuais; camadasAtuais = []; cenarioAtual = null;
      velhas.forEach((v, i) => {
        if (reduz) { v.no.remove(); return; }
        const a = v.no.animate([{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: 'rotateX(86deg)', opacity: 0 }], { duration: 420, delay: i * 50, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
        a.onfinish = () => v.no.remove();
      });
    }
    abrirPapel();
    mostrarLegenda('', '');
    desenharChips();
  }
  async function contarPronta(texto) {
    pararDemo();
    novaHistoria();
    await sleep(350);
    barra.simular(texto).catch(() => {});
  }

  // ---------- demonstração (▶) ----------
  async function esperarJev(sinal) {
    await sleep(140, sinal);
    for (let i = 0; i < 40 && emVoo > 0; i++) await sleep(100, sinal);
  }
  // a demonstração tem o próprio botão de parar: se a pessoa apertar o microfone, "Nova história" ou um começo pronto
  // no meio dela, ela para limpa (sem ficar esperando uma fala que foi interrompida)
  let ctlDemo = null;
  function pararDemo() { if (ctlDemo) { const c = ctlDemo; ctlDemo = null; c.abort(); } }
  async function tocar(sinal) {
    pararDemo();
    const meu = new AbortController();
    ctlDemo = meu;
    const s = typeof AbortSignal.any === 'function' ? AbortSignal.any([sinal, meu.signal]) : sinal;
    try {
      novaHistoria();
      await sleep(1100, s);
      for (const frase of DEMO) {
        await barra.simular(frase, { sinal: s });
        await esperarJev(s);
        await sleep(frase.includes('nevar') || frase.includes('bolo') ? 1900 : 1300, s);
      }
      historiaDaDemo = true;
      barra.dica('Sua vez: aperte o microfone e conte uma história nova');
    } finally {
      if (ctlDemo === meu) ctlDemo = null;
    }
  }

  // para conferir a cena sem o Jev (ferramentas de teste): cenaNasce.mostrar({ lugar, hora, clima, humor, elenco: [['menina', 'correndo']] })
  window.cenaNasce = {
    mostrar({ lugar = null, hora = 'dia', clima: c = 'limpo', humor = 'calmo', elenco: el2 = [] } = {}) {
      Object.assign(cena, { hora, clima: c, humor });
      if (lugar) { cena.lugar = lugar; fecharPapel(); trocarLugar(lugar, { silencioso: true }); }
      aplicarCeu();
      const ids = el2.map(([id]) => id);
      for (const id of [...atores.keys()]) if (!ids.includes(id)) sair(id);
      el2.forEach(([id, ac], i) => entrar(id, ac || 'parado', i * 90));
      desenharChips({}, {});
    },
    estado: () => ({ ...cena, elenco: elenco() }),
    nova: () => novaHistoria(),
  };

  medir();
  desenharChips();
  aplicarCeu();
  return { tocar };
}

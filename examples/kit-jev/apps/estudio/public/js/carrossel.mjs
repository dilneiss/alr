// 3 carrosséis de Instagram (6 lâminas quadradas cada) a partir das decisões do Jev: formato, capa, diferencial,
// cores, item, legenda e chamada por carrossel; UM estilo visual para a série inteira (ctx.carEstilo).
// O desenho das lâminas mora em carrossel-lam.mjs; aqui ficam a moldura do Instagram, a vitrine ampliada,
// a legenda e a navegação (setas, pontinhos, arrastar). Avanço automático é CSS puro (pausa no hover e na interação).
import { esc, cap } from './util.mjs';
import { simboloSVG } from './marca.mjs';
import { svgIcone, UI } from '../lib/icones.mjs';
import { FORMATOS, FUNDOS, LEGENDAS } from '../lib/biblioteca.mjs';
import { NL, lamina, preparar, ANG, reajustar, limparMedidas } from './carrossel-lam.mjs';
import { estiloAjustes } from './ajustes-css.mjs';

const SLOT = 3.4; // segundos por lâmina no avanço automático
const icUI = (id, cls = '', sw = 1.9) => svgIcone(UI[id] || '', { size: 24, sw, cls });
const dd = (n) => String(n).padStart(2, '0');
const ROTULO_FUNDO = Object.fromEntries(FUNDOS.map((f) => [f.id, f.rotulo]));
const ROTULO_LEG = Object.fromEntries((LEGENDAS || []).map((f) => [f.id, f.rotulo]));

// ------------------------------------------------------------------ API
export function laminaHTML(ctx, i, k, op = {}) {
  return lamina(ctx, i, k, op);
}

export function legendaHTML(ctx, i) {
  const P = ctx.posts[i];
  return `<b class="car-leg-h">${esc(ctx.handle)}</b> <span data-campo="legenda${P.n}">${esc(P.legenda)}</span> <span class="car-tags">${esc(P.tags)}</span>`;
}

export function carrosselHTML(ctx, i, op = {}) {
  const P = ctx.posts[i];
  const prep = preparar(ctx, i);
  const pref = op.pref || 'p';
  const lams = Array.from({ length: NL }, (_, k) => lamina(ctx, i, k, { prep, pref })).join('');
  const fmt = (FORMATOS[P.fmt] || { rotulo: P.fmt }).rotulo;
  const local = ctx.cidade ? `${ctx.cidade.nome}, ${ctx.cidade.uf}` : ctx.pack.label;
  const pts = Array.from({ length: NL }, (_, k) => `<button type="button" class="car-pto" data-ir="${k}" aria-label="Ir para a lâmina ${k + 1}"></button>`).join('');
  const nums = Array.from({ length: NL }, (_, k) => `<i>${k + 1}</i>`).join('');
  // ajustes de estilo (caixa, peso, cor…): <style> escopado às lâminas (op.semAjustes quando quem chama já pôs)
  const aj = op.semAjustes ? '' : estiloAjustes(ctx.ajustes, 'posts', ctx);
  return `<div class="car" data-post="${i}" data-fmt="${esc(P.fmt)}" data-estilo="${esc(prep.E)}" data-bg="${esc(P.bg)}" style="--car-dur:${(SLOT * NL).toFixed(1)}s;--car-atraso:${(0.9 + i * 1.1).toFixed(1)}s">${aj}`
    + `<div class="car-cab"><span class="car-av">${simboloSVG(ctx, { tamanho: 24, classe: 'car-av-s' })}</span><span class="car-quem"><b>${esc(ctx.handle)}</b><small>${esc(local)}</small></span><span class="car-mais" aria-hidden="true"><i></i><i></i><i></i></span></div>`
    + `<div class="car-palco" tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Carrossel ${P.n} · ${esc(fmt)} · ${NL} lâminas">`
    + `<div class="car-trilha car-anim">${lams}</div>`
    + `<div class="car-cont" aria-hidden="true"><span class="car-cont-j"><span class="car-cont-n car-anim">${nums}</span></span>/${NL}</div>`
    + `<button type="button" class="car-seta car-ant" aria-label="Lâmina anterior">${icUI('seta', '', 2.4)}</button><button type="button" class="car-seta car-prox" aria-label="Próxima lâmina">${icUI('seta', '', 2.4)}</button>`
    + `</div>`
    + `<div class="car-acoes"><span class="car-ac-e">${icUI('coracao')}${icUI('comentario')}${icUI('enviar')}</span><span class="car-pts">${pts}<b class="car-pt car-anim"></b></span><span class="car-ac-d">${icUI('salvar')}</span></div>`
    + `<div class="car-leg">${legendaHTML(ctx, i)}</div>`
    + `</div>`;
}

// vitrine grande dos 3 carrosséis (modal de ~1280 px): cada carrossel numa faixa, com o post no celular,
// as 6 lâminas grandes, a legenda e os dados de cada decisão do Jev
export function carrosseisAmpliadoHTML(ctx) {
  const c = ctx.marca.cores;
  const est = ctx.carEstilo || { id: 'editorial', rotulo: 'Editorial' };
  const cores = [['Principal', c.pri], ['Secundária', c.sec], ['Destaque', c.acc], ['Fundo', c.bg], ['Texto', c.ink]];
  const topo = `<header class="car-amp-topo">
    <div class="car-amp-id">${simboloSVG(ctx, { tamanho: 56, classe: 'car-amp-sym' })}<div><small>Kit de carrosséis · Instagram</small><h2>${esc(ctx.nome)}</h2><p>${esc(ctx.pack.desc)}${esc(ctx.emCidade || '')}</p></div></div>
    <dl class="car-amp-ficha"><div><dt>Estilo da série</dt><dd>${esc(est.rotulo)}</dd></div><div><dt>Peças</dt><dd>3 carrosséis · ${3 * NL} lâminas</dd></div><div><dt>Formato</dt><dd>1:1 · 1080 × 1080</dd></div><div><dt>Fontes</dt><dd>${esc(ctx.marca.f.nome || '')}</dd></div></dl>
    <div class="car-amp-pal">${cores.map(([n, h]) => `<span style="--sw:${h}" title="${n} ${h}"><i></i><small>${esc(n)}</small></span>`).join('')}</div>
  </header>`;
  const faixas = ctx.posts.map((P, i) => {
    const prep = preparar(ctx, i);
    const fmt = (FORMATOS[P.fmt] || { rotulo: P.fmt }).rotulo;
    const lams = prep.plano.map((d, k) => `<figure class="car-amp-f"><div class="car-amp-l">${lamina(ctx, i, k, { prep, pref: 'a' })}</div><figcaption><b>${dd(k + 1)}</b>${esc(d.rot && k > 0 && k < NL - 1 ? d.rot : k === 0 ? 'Capa' : 'Chamada')}</figcaption></figure>`).join('');
    const dados = [
      ['Formato', fmt],
      ['Capa', `“${P.hook}”`],
      ['Diferencial', `${(ANG[P.ang] || [P.ang])[0]}: ${cap(P.angTxt || '')}`],
      ['Cores', ROTULO_FUNDO[P.bg] || P.bg],
      ['Item em destaque', `${P.item.nome} · ${P.item.preco}`],
      ['Tipo de legenda', ROTULO_LEG[P.leg] || P.leg || ''],
      ['Chamada final', P.cta.texto],
    ].filter(([, v]) => v);
    return `<section class="car-amp-faixa" data-post="${i}">
      <div class="car-amp-cab"><span class="car-amp-n">${dd(P.n)}</span><div><h3>Carrossel ${P.n} · ${esc(fmt)}</h3><p>${esc(cap(P.papel && P.papel.jev ? P.papel.jev : ''))}</p></div></div>
      <div class="car-amp-corpo">
        <div class="car-amp-cel"><div class="car-amp-tela"><div class="car-amp-barra"><span>9:41</span><i></i></div>${carrosselHTML(ctx, i, { pref: 'f', semAjustes: true })}</div></div>
        <div class="car-amp-grade">${lams}</div>
        <dl class="car-amp-dados">${dados.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}<div class="car-amp-legtxt"><dt>Legenda</dt><dd>${legendaHTML(ctx, i)}</dd></div></dl>
      </div>
    </section>`;
  }).join('');
  return `<div class="car-amp${c.dark ? ' car-amp-esc' : ''}" style="--amp-pri:${c.pri};--amp-acc:${c.acc};--fd:${esc(ctx.marca.f.disp)};--fb:${esc(ctx.marca.f.body)};--dw:${ctx.marca.f.dw}">${estiloAjustes(ctx.ajustes, 'posts', ctx)}${topo}${faixas}</div>`;
}

// ------------------------------------------------------------------ navegação (idempotente; um só ouvinte por raiz)
const ESPERA = 6500; // retoma o avanço automático depois de um tempo parado (um timer por carrossel)

function posAtual(car) {
  const palco = car.querySelector('.car-palco'), trilha = car.querySelector('.car-trilha');
  if (!palco || !trilha) return 0;
  const w = palco.getBoundingClientRect().width || 1;
  const x = trilha.getBoundingClientRect().left - palco.getBoundingClientRect().left;
  return { k: Math.max(0, Math.min(NL - 1, Math.round(-x / w))), x, w };
}
function manual(car) {
  if (car.classList.contains('car-man')) return +car.dataset.k || 0;
  const { k, x, w } = posAtual(car);
  // congela exatamente onde está (sem salto) e depois anda
  car.style.setProperty('--dx', `${x + k * w}px`);
  car.style.setProperty('--k', k);
  car.dataset.k = k;
  car.classList.add('car-man', 'car-arr0');
  void car.offsetWidth;
  car.classList.remove('car-arr0');
  car.style.setProperty('--dx', '0px');
  return k;
}
function ir(car, k) {
  const alvo = ((k % NL) + NL) % NL;
  car.style.setProperty('--k', alvo);
  car.style.setProperty('--dx', '0px');
  car.dataset.k = alvo;
  const n = car.querySelector('.car-cont-n');
  if (n) n.style.setProperty('--k', alvo);
  agendarRetomada(car);
}
function agendarRetomada(car) {
  clearTimeout(car.__carT);
  car.__carT = setTimeout(() => {
    car.__carT = null;
    if (!car.isConnected) return;
    if (car.matches(':hover') || car.classList.contains('car-arr')) { agendarRetomada(car); return; }
    const k = +car.dataset.k || 0;
    car.style.setProperty('--car-atraso', `${(-k * SLOT).toFixed(2)}s`);
    car.classList.remove('car-man');
  }, ESPERA);
}

// Títulos são medidos no canvas. Se a fonte da marca ainda não tinha carregado quando o HTML foi montado,
// carrega e reajusta os tamanhos no lugar. Roda a cada chamada (o app redesenha na mesma raiz), mas só trabalha
// quando falta alguma fonte: com tudo carregado, a medida da montagem já estava certa.
function ajustarQuandoCarregar(r) {
  if (typeof document === 'undefined' || !document.fonts || !r.querySelectorAll) return;
  const faltam = new Set();
  for (const el of r.querySelectorAll('[data-fit]')) {
    const f = el.getAttribute('data-fit').split('|'), spec = `${f[8]} 40px ${f[9]}`;
    try { if (!document.fonts.check(spec)) faltam.add(spec); } catch { /* fonte inválida: ignora */ }
  }
  if (!faltam.size) return;
  Promise.all([...faltam].map((f) => document.fonts.load(f).catch(() => null))).then(() => { limparMedidas(); reajustar(r); });
}

export function ativarCarrosseis(raiz) {
  const r = raiz || document;
  ajustarQuandoCarregar(r);
  if (r.__carAtivo) return;
  r.__carAtivo = true;
  r.addEventListener('click', (e) => {
    const alvo = e.target.closest && e.target.closest('.car-seta, .car-pto, .car-leg');
    if (!alvo || !r.contains(alvo)) return;
    const car = alvo.closest('.car');
    if (!car) return;
    if (alvo.classList.contains('car-leg')) { alvo.classList.toggle('car-leg-aberta'); return; }
    if (car.__carArrastou) { car.__carArrastou = false; return; }
    const k = manual(car);
    if (alvo.classList.contains('car-pto')) ir(car, +alvo.dataset.ir);
    else ir(car, k + (alvo.classList.contains('car-prox') ? 1 : -1));
  });
  r.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const palco = e.target.closest && e.target.closest('.car-palco');
    if (!palco || !r.contains(palco)) return;
    const car = palco.closest('.car');
    e.preventDefault();
    ir(car, manual(car) + (e.key === 'ArrowRight' ? 1 : -1));
  });
  r.addEventListener('pointerdown', (e) => {
    const palco = e.target.closest && e.target.closest('.car-palco');
    if (!palco || !r.contains(palco) || e.target.closest('.car-seta') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const car = palco.closest('.car');
    const k0 = manual(car);
    const x0 = e.clientX, y0 = e.clientY, w = palco.getBoundingClientRect().width || 1;
    let dx = 0, ativo = false;
    car.__carArrastou = false;
    try { palco.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
    const mover = (ev) => {
      dx = ev.clientX - x0;
      if (!ativo && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(ev.clientY - y0)) { ativo = true; car.classList.add('car-arr'); }
      if (ativo) { ev.preventDefault(); car.style.setProperty('--dx', `${Math.max(-w, Math.min(w, dx))}px`); }
    };
    const soltar = () => {
      palco.removeEventListener('pointermove', mover);
      palco.removeEventListener('pointerup', soltar);
      palco.removeEventListener('pointercancel', soltar);
      car.classList.remove('car-arr');
      if (ativo) {
        car.__carArrastou = true;
        setTimeout(() => { car.__carArrastou = false; }, 0);
        ir(car, Math.abs(dx) > w * 0.16 ? k0 + (dx < 0 ? 1 : -1) : k0);
      } else agendarRetomada(car);
    };
    palco.addEventListener('pointermove', mover);
    palco.addEventListener('pointerup', soltar);
    palco.addEventListener('pointercancel', soltar);
  });
}

// Lâminas dos carrosséis do Instagram: roteiro de 6 lâminas por FORMATO (P.fmt), esquema de cor por FUNDO (P.bg)
// e a linguagem visual do ESTILO da série (ctx.carEstilo.id), que muda tipografia, composição e ornamentos.
// Nenhum texto inventado: tudo vem do contexto (pacote do segmento, itens, oferta, decisões do Jev); o que não é
// dado é microtexto de interface ("Arraste", "Salve este post") ou o contraste genérico do "jeito comum" (ANG[id][2]).
// Medidas em cqw da própria lâmina: a mesma marcação escala do painel (~184 px) ao ampliado e ao celular.
import { esc, cap, contraste, mix, rgba, rnd, hexRgb, lum } from './util.mjs';
import { resolverAjustes, fundoDe, suavizar, amostras, gradiente, valorPara, corTextoPara } from './ajustes-css.mjs';
import { arte } from './arte.mjs';
import { simboloSVG, logoSVG, medir } from './marca.mjs';
import { svgIcone, UI, ICONE } from '../lib/icones.mjs';

export const NL = 6;
const dd = (n) => String(n).padStart(2, '0');
const ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Diferenciais: rótulo curto, ícone de linha e o contraste genérico do "jeito comum" (texto de modelo, não é fato).
export const ANG = {
  qualidade: ['Qualidade', 'estrela', 'Feito de qualquer jeito'],
  rapidez: ['Rapidez', 'relogio', 'Espera sem previsão'],
  preco: ['Preço justo', 'etiqueta', 'Preço alto sem explicação'],
  experiencia: ['Experiência', 'brilho', 'Atendimento no piloto automático'],
  exclusividade: ['Exclusividade', 'diamante', 'Mais do mesmo, igual a todo lugar'],
  conveniencia: ['Praticidade', 'conversa', 'Fila, formulário e burocracia'],
  confianca: ['Confiança', 'escudo', 'Promessa sem prova'],
  resultado: ['Resultado', 'alvo', 'Resultado que não aparece'],
  comunidade: ['Comunidade', 'coracao', 'Atendimento frio e distante'],
};
const CTA_IC = { bio: 'web', direct: 'enviar', whats: 'whats', comenta: 'comentario', salva: 'salvar', marca: 'comentario', agenda: 'calendario' };
const CANAL_IC = { whatsapp: 'whats', instagram: 'insta', site: 'web', apps: 'moto', telefone: 'telefone', presencial: 'pin', linkedin: 'enviar' };

// ------------------------------------------------------------------ estilos da série
// m = margem (cqw); t/b = onde começa e termina o miolo; lh e tr = entrelinha e espacejamento dos títulos
export const ESTILOS = {
  editorial: { m: 8.5, t: 17, b: 14.5, lh: 0.98, tr: -0.022 },
  impacto: { m: 6.5, t: 7, b: 15, lh: 0.86, tr: -0.012, caixa: true },
  minimal: { m: 8, t: 17, b: 14.5, lh: 1.02, tr: -0.035 },
  colagem: { m: 7.5, t: 8, b: 14, lh: 1.0, tr: -0.015 },
  luxo: { m: 12, t: 14, b: 17, lh: 1.1, tr: 0.004 },
  tech: { m: 7.5, t: 15.5, b: 14, lh: 1.0, tr: -0.016 },
};

export function tipografia(ctx, E) {
  const f = ctx.marca.f, S = ESTILOS[E] || ESTILOS.editorial;
  const condensada = /Anton|Impact/.test(f.disp);
  const capsLarga = /Cinzel|Marcellus|Space Mono/.test(f.disp);
  const cx = !!(S.caixa || f.caixa);
  let tr = S.tr + (parseFloat(f.tr) || 0) * 0.5;
  if (condensada) tr = Math.max(0.004, tr + 0.012);
  else if (cx) tr = Math.max(tr, capsLarga ? 0.004 : 0.006); // caixa alta larga: um respiro entre as letras
  if (E === 'luxo' && cx) tr = 0.05;
  // ajustes de estilo (ajustes-css.mjs): a caixa e o tamanho dos títulos entram NO CÁLCULO de encaixe
  // (caixa alta é mais larga; título maior pede mais espaço): o texto nunca estoura a lâmina
  const aj = ajustesPosts(ctx);
  let cxF = cx, fz = 1;
  if (aj) {
    const caixa = valorPara(aj, 'caixa', 'titulos');
    if (caixa) cxF = caixa === 'maiusculas';
    fz = valorPara(aj, 'tamanho', 'titulos') || 1;
    if (cxF && !cx && !condensada) tr = Math.max(tr, capsLarga ? 0.004 : 0.006);
  }
  // caixa alta sem condensada precisa de entrelinha para os acentos (Ç, Ã, É) não tocarem a linha de cima
  const lh = cxF && !condensada ? Math.max(S.lh, 0.96) : S.lh * (condensada ? 0.98 : 1);
  return {
    fd: f.disp, fb: f.body, fl: f.logo, dw: f.dw, lw: f.lw || 400, cx: cxF, tr, condensada, lh, fz,
    m: S.m, t: S.t, b: S.b, script: f.scriptLogo ? f.logo : '"Caveat", "Bradley Hand", cursive',
  };
}
// os ajustes que valem para os carrosséis (resolvidos uma vez por contexto)
const AJ = new WeakMap();
export function ajustesPosts(ctx) {
  if (!ctx || !Array.isArray(ctx.ajustes) || !ctx.ajustes.length) return null;
  const sig = JSON.stringify(ctx.ajustes), memo = AJ.get(ctx); // a lista pode mudar no mesmo ctx: confere a assinatura
  if (memo && memo.sig === sig) return memo.r;
  let r = resolverAjustes(ctx.ajustes, 'posts');
  if (!Object.keys(r).length) r = null;
  AJ.set(ctx, { sig, r });
  return r;
}

// ------------------------------------------------------------------ medir e caber (títulos do tamanho certo)
// Mede no canvas com a fonte da marca. A chave do cache inclui se a fonte já carregou: antes de carregar, o canvas
// mede a fonte de reserva; quando a da marca chega, as medidas novas entram sozinhas (e o app redesenha).
const MED = new Map();
const PRONTA = new Map();
export function limparMedidas() { MED.clear(); PRONTA.clear(); }
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', limparMedidas);
function pronta(fam, peso) {
  if (typeof document === 'undefined' || !document.fonts) return 1;
  const k = `${peso}|${fam}`;
  let v = PRONTA.get(k);
  if (v === undefined) { try { v = document.fonts.check(`${peso} 16px ${fam}`) ? 1 : 0; } catch { v = 1; } PRONTA.set(k, v); }
  return v;
}
function larg(t, fam, peso) {
  const k = `${pronta(fam, peso)}|${peso}|${fam}|${t}`;
  let v = MED.get(k);
  if (v === undefined) {
    v = medir(t, fam, peso, 100, 0) / 100;
    if (MED.size > 6000) MED.clear();
    MED.set(k, v);
  }
  return v;
}
// quantas linhas o texto ocupa no tamanho s (cqw) numa largura W (Infinity se uma palavra não cabe)
function nLinhas(pal, wp, esp, s, W) {
  let linhas = 1, x = 0;
  for (const w of wp) {
    const ws = w * s;
    if (ws > W) return Infinity;
    if (x > 0 && x + esp * s + ws > W) { linhas++; x = ws; } else x += (x > 0 ? esp * s : 0) + ws;
  }
  return linhas;
}
function palavras(texto, { cx, tr, fam, peso }) {
  const t = cx ? String(texto || '').toLocaleUpperCase('pt-BR') : String(texto || '');
  const pal = t.split(/\s+/).filter(Boolean);
  return { pal, wp: pal.map((p) => larg(p, fam, peso) + p.length * tr), esp: larg(' ', fam, peso) + tr };
}
// maior tamanho (cqw) em que o texto cabe em W × H, simulando a quebra de linha palavra por palavra
export function caber(texto, T, { W, H, max, min = 4, lh = T.lh, cx = T.cx, tr = T.tr, fam = T.fd, peso = T.dw }) {
  const { pal, wp, esp } = palavras(texto, { cx, tr, fam, peso });
  if (!pal.length) return max;
  const Wu = W * 0.955;
  for (let s = max; s > min; s -= 0.25) if (nLinhas(pal, wp, esp, s, Wu) * lh * s <= H) return Math.round(s * 100) / 100;
  return min;
}
// o mesmo cálculo guardado no elemento (data-fit), para reajustar no lugar quando a fonte da marca termina de carregar
const fitAttr = (v, o) => ` data-fit="${esc([v, o.W, o.H, o.max, o.min, o.cx ? 1 : 0, o.lh, o.tr, o.peso, o.fam].join('|'))}"`;
export function reajustar(raiz) {
  if (!raiz || !raiz.querySelectorAll) return;
  for (const el of raiz.querySelectorAll('[data-fit]')) {
    const [v, W, H, max, min, cx, lh, tr, peso, fam] = el.getAttribute('data-fit').split('|');
    const s = caber(el.textContent, null, { W: +W, H: +H, max: +max, min: +min, cx: cx === '1', lh: +lh, tr: +tr, peso, fam });
    if (String(s) !== el.style.getPropertyValue(v).trim()) el.style.setProperty(v, String(s));
  }
}
// ajuste completo: calcula e devolve o atributo style + data-fit
function ajuste(texto, T, o, v = '--ts') {
  const op = { min: 4, lh: T.lh, cx: T.cx, tr: T.tr, fam: T.fd, peso: T.dw, ...o };
  if (T.fz && T.fz !== 1) { // ajuste de tamanho: o teto cresce (ou encolhe) e, se crescer, ganha altura para caber
    op.max = Math.round(op.max * T.fz * 100) / 100;
    if (T.fz > 1) op.H = Math.round(op.H * Math.min(T.fz, 1.15) * 100) / 100;
    op.min = Math.min(op.min, op.max);
  }
  const s = caber(texto, T, op);
  return { s, attr: ` style="${v}:${s}${o.extra || ''}"${fitAttr(v, op)}` };
}
// tamanho de texto corrido pelo comprimento (corpo)
const corpo = (t, base = 4.6, fator = 1) => { const n = String(t || '').length * fator; return n > 190 ? base - 0.9 : n > 150 ? base - 0.6 : n > 110 ? base - 0.3 : n < 60 ? base + 0.5 : base; };

// ------------------------------------------------------------------ cores: esquema A (principal) e B (contraste) de cada carrossel
function hsl(h) {
  const [r, g, b] = hexRgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh *= 60; if (hh < 0) hh += 360;
  return [hh, s, l];
}
function ouroDa(c) {
  for (const x of [c.acc, c.sec, c.pri]) { const [h, s, l] = hsl(x); if (h >= 26 && h <= 56 && s >= 0.3 && l >= 0.32 && l <= 0.78) return x; }
  return '#c9a66b';
}
// ajusta uma cor até ter o contraste mínimo sobre as bases (clareia ou escurece)
function ate(cor, bases, alvo) {
  if (bases.every((b) => contraste(b, cor) >= alvo)) return cor;
  const escuro = contraste(bases[0], '#ffffff') > contraste(bases[0], '#111111');
  for (let t = 0.1; t <= 1; t += 0.1) { const x = mix(cor, escuro ? '#ffffff' : '#111111', t); if (bases.every((b) => contraste(b, x) >= alvo)) return x; }
  return escuro ? '#ffffff' : '#111111';
}
function tintaSobre(bases, ...cands) {
  const lista = [...cands, '#ffffff', '#141414'].filter(Boolean);
  for (const c of lista) if (bases.every((b) => contraste(b, c) >= 4.5)) return c;
  const pior = (x) => Math.min(...bases.map((b) => contraste(b, x)));
  return lista.sort((x, y) => pior(y) - pior(x))[0];
}
function variante(ctx, bases, css, tintas, extra = {}) {
  const c = ctx.marca.cores, b = bases[0];
  const i = tintaSobre(bases, ...tintas);
  const escV = contraste(b, '#ffffff') > contraste(b, '#141414');
  let s = mix(i, b, 0.3);
  if (bases.some((x) => contraste(x, s) < 3.8)) s = mix(i, b, 0.14);
  const a = [c.pri, c.acc, c.sec, c.priTxt].find((x) => bases.every((y) => contraste(y, x) >= 3)) || i;
  const af = [c.pri, c.acc, c.sec].find((x) => contraste(b, x) >= 1.7 && bases.every((y) => contraste(y, x) >= 1.25)) || i;
  const aft = tintaSobre([af], c.onPri, c.onAcc, c.onSec, c.bg, c.ink);
  const af2 = [c.acc, c.sec, c.pri].find((x) => x !== af && bases.every((y) => contraste(y, x) >= 1.5) && contraste(af, x) >= 1.4) || (i !== af && contraste(af, i) >= 1.4 ? i : mix(b, escV ? '#ffffff' : '#000000', 0.85));
  const g = ate(extra.ouro || ouroDa(c), bases, 2.6);
  const ap = [c.pri, c.deep, c.acc, c.sec].find((x) => contraste('#fffdf7', x) >= 3.2) || '#1d1b19';
  return { f: css || b, b, i, s, a, af, aft, af2, af2t: tintaSobre([af2], c.onAcc, c.onSec, c.onPri, c.ink, c.bg), g, ap, l: rgba(i, 0.24), l2: rgba(i, 0.11), esc: escV, bgs: bases, ...extra };
}

export function esquemas(ctx, P, E) {
  const c = ctx.marca.cores;
  const papel = c.dark ? mix(c.ink, '#ffffff', 0.22) : mix(c.bg, c.surf, 0.28);
  const noite = c.dark ? mix(c.bg, c.pri, 0.04) : c.deep;
  const creme = mix(c.dark ? c.ink : c.bg, '#f3ead9', 0.55);
  const joia = mix(c.pri, '#090909', contraste(c.pri, '#000000') > 6 ? 0.62 : 0.45);
  const preto = mix(noite, '#08080a', 0.5);
  const tP = [c.onPri, c.ink, c.bg], tN = [c.ink, c.bg];
  const Vp = (base, css, x) => variante(ctx, [base], css, tP, x);
  const Vn = (bases, css, x) => variante(ctx, Array.isArray(bases) ? bases : [bases], css, tN, x);
  const g2 = mix(c.pri, c.acc, 0.58);
  const gradPadrao = {
    editorial: [`linear-gradient(172deg, ${mix(c.pri, '#ffffff', 0.08)} 0%, ${mix(c.pri, c.acc, 0.4)} 100%)`, [c.pri, mix(c.pri, c.acc, 0.4)]],
    impacto: [`linear-gradient(158deg, ${c.pri} 0%, ${c.pri} 38%, ${g2} 100%)`, [c.pri, g2]],
    minimal: [`linear-gradient(180deg, ${c.pri} 0%, ${mix(c.pri, c.sec, 0.32)} 100%)`, [c.pri, mix(c.pri, c.sec, 0.32)]],
    colagem: [`linear-gradient(135deg, ${c.pri} 0%, ${mix(c.pri, c.sec, 0.62)} 100%)`, [c.pri, mix(c.pri, c.sec, 0.62)]],
    tech: [`linear-gradient(135deg, ${noite} 0%, ${mix(noite, c.pri, 0.5)} 100%)`, [noite, mix(noite, c.pri, 0.5)]],
  };
  let A, B;
  if (E === 'luxo') {
    const radial = `radial-gradient(120% 95% at 22% 0%, ${mix(joia, c.pri, 0.42)} 0%, ${joia} 52%, ${mix(joia, '#000000', 0.4)} 100%)`;
    switch (P.bg) {
      case 'solido': A = Vn(joia); B = Vn(creme); break;
      case 'gradiente': A = Vn([joia, mix(joia, c.pri, 0.42)], radial); B = Vn(creme); break;
      case 'escuro': A = Vn(preto, `radial-gradient(110% 80% at 50% 0%, ${mix(preto, c.pri, 0.16)} 0%, ${preto} 62%)`); B = Vn(creme); break;
      case 'claro': A = Vn(creme); B = Vn(preto); break;
      case 'padrao': A = Vn(creme, null, { padrao: true }); B = Vn(joia); break;
      default: A = Vn(preto, null, { cena: true }); B = Vn(creme); // cena
    }
  } else {
    switch (P.bg) {
      case 'solido': A = Vp(c.pri); B = Vn(c.dark ? c.bg : papel); break;
      case 'gradiente': { const [css, bs] = gradPadrao[E] || gradPadrao.editorial; A = variante(ctx, bs, css, E === 'tech' ? tN : tP); B = Vn(c.dark ? c.bg : papel); break; }
      case 'escuro': A = Vn(noite, `radial-gradient(115% 85% at 88% 0%, ${mix(noite, c.pri, 0.26)} 0%, ${noite} 62%)`); B = Vp(c.pri); break;
      case 'claro': A = Vn(papel); B = E === 'minimal' || E === 'tech' ? Vn(noite) : Vp(c.pri); break;
      case 'padrao': A = Vn(c.dark ? mix(c.bg, c.pri, 0.1) : c.soft, null, { padrao: true }); B = Vp(c.pri); break;
      default: A = Vn(c.dark ? c.surf : c.soft2, null, { cena: true }); B = Vn(noite); // cena
    }
  }
  // ajustes de fundo: a lâmina principal (A) ganha o fundo pedido; a de contraste (B), um tom da mesma cor (sólido)
  // ou o degradê no sentido contrário, para o carrossel manter o ritmo; o topo ("capa") só a primeira lâmina
  let capa = null;
  const aj = ajustesPosts(ctx);
  if (aj && aj.fundo) for (const { elemento, valor } of aj.fundo) {
    if (elemento === 'pagina' || elemento === 'secoes') { A = refazerFundo(ctx, A, valor, false); B = refazerFundo(ctx, B, valor, true); capa = null; }
    else if (elemento === 'topo') capa = refazerFundo(ctx, A, valor, false);
  }
  for (const V of E === 'luxo' ? [A, B, capa].filter(Boolean) : []) {
    const g = ate(ouroDa(c), [V.b], 3);
    V.g = g; V.a = g; V.af = g; V.aft = tintaSobre([g], V.b, '#141414', '#ffffff');
    V.af2 = mix(g, V.b, 0.4); V.af2t = tintaSobre([V.af2], V.i, V.b);
    V.ap = V.esc ? mix(g, '#000000', 0.35) : g;
  }
  return capa ? { A, B, capa } : { A, B };
}
function refazerFundo(ctx, V, valor, contraFase) {
  const c = ctx.marca.cores;
  const F = fundoDe(valor, V.b, c.ink);
  if (!F) return V;
  const extra = { padrao: V.padrao, cena: V.cena };
  const tintas = [c.ink, c.bg, c.onPri];
  if (F.solida) {
    const x = contraFase && valor.tipo === 'solida' ? (lum(F.solida) > 0.4 ? mix(F.solida, '#000000', 0.62) : mix(F.solida, '#ffffff', 0.86)) : F.solida;
    return variante(ctx, [x], null, tintas, extra);
  }
  // a 1ª base é a cor do alto da lâmina (o logo e a etiqueta decidem a versão clara/escura por ela)
  const cs = suavizar(F.cores), ida = contraFase && F.direcao !== 'radial' ? cs.slice().reverse() : cs;
  return variante(ctx, amostras(ida, 3), gradiente(ida, F.direcao), tintas, extra);
}

const estiloVar = (V) => `--f:${V.f};--b:${V.b};--i:${V.i};--s:${V.s};--a:${V.a};--af:${V.af};--aft:${V.aft};--af2:${V.af2};--af2t:${V.af2t};--g:${V.g};--ap:${V.ap};--l:${V.l};--l2:${V.l2}`;
export const fontesVar = (T) => `--fd:${T.fd};--fb:${T.fb};--fl:${T.fl};--dw:${T.dw};--lw:${T.lw};--cx:${T.cx ? 'uppercase' : 'none'};--trt:${T.tr}em;--lh:${T.lh};--fs:${T.script};--fm:"Space Mono",ui-monospace,Menlo,monospace;--m:${T.m}cqw;--ct:${T.t}cqw;--cb:${T.b}cqw`;

// cores para a ilustração do app sobre a lâmina (troca o que sumiria no fundo; no luxo, tudo em dourado)
function coresArte(ctx, V, E) {
  const c = ctx.marca.cores;
  const o = { ...c, ink: V.i, bg: V.b, priTxt: V.a, secTxt: V.a, surf: mix(V.b, V.i, 0.08), dark: V.esc };
  if (E === 'luxo') return { ...o, pri: V.g, onPri: V.aft, acc: V.g, onAcc: V.aft, sec: mix(V.b, V.g, 0.3), onSec: V.i };
  if (contraste(V.b, c.pri) < 1.45) { o.pri = V.af; o.onPri = V.aft; }
  if (contraste(V.b, o.sec) < 1.3) o.sec = mix(V.b, V.i, 0.16);
  if (contraste(V.b, o.acc) < 1.3) o.acc = V.af2;
  return o;
}
// estilo da ilustração: o que o Jev escolheu para a marca, quando combina com o estilo da série
const IMG_OK = {
  luxo: [['linha', 'geometrico', 'vidro'], 'linha'],
  tech: [['linha', 'geometrico', 'vidro', 'flat'], 'linha'],
  minimal: [['geometrico', 'flat', 'linha'], 'geometrico'],
  colagem: [['adesivo', 'flat', 'organico', 'retro'], 'adesivo'],
  impacto: [['retro', 'flat', 'geometrico', 'adesivo', 'organico', 'vidro'], 'retro'],
};
export function imgDe(ctx, E) {
  const j = (ctx.site && ctx.site.img) || 'flat';
  const r = IMG_OK[E];
  return !r || r[0].includes(j) ? j : r[1];
}

// ------------------------------------------------------------------ pecinhas
const ic = (miolo, cls = '', sw = 1.8) => svgIcone(miolo || '', { size: 24, sw, cls: `car-ic ${cls}`.trim() });
const icId = (id, cls, sw) => ic((ICONE[id] || ICONE.estrela).svg, cls, sw);
const icUI = (id, cls, sw) => ic(UI[id] || UI.seta, cls, sw);
const estrelas = (cls = '') => `<svg class="car-est ${cls}" viewBox="0 0 120 24" aria-hidden="true">${[0, 1, 2, 3, 4].map((j) => `<g transform="translate(${j * 24} 0)">${UI.estrela.replace('<path', '<path fill="currentColor"')}</g>`).join('')}</svg>`;
const seta = (cls = 'car-seta-s', longa = false) => longa
  ? `<svg class="${cls}" viewBox="0 0 64 12" aria-hidden="true"><path d="M1 6h60M55 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  : `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// rabiscos à mão (colagem): seta curva, sublinhado, estrelinha, círculo
const RAB = {
  seta: '<path d="M4 30C18 8 44 4 62 18" /><path d="M52 10l11 8-12 5" />',
  sub: '<path d="M3 8c14-5 30-6 46-3s28 1 38-3" />',
  estrela: '<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />',
  circ: '<path d="M52 6C30-1 6 6 4 20s22 22 46 18 38-18 26-28C66 2 44 3 36 5" />',
  zig: '<path d="M2 10l8-7 8 7 8-7 8 7 8-7 8 7" />',
};
const rab = (t, cls, vb = '0 0 70 36') => `<svg class="car-rab car-rab-${t} ${cls || ''}" viewBox="${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${RAB[t]}</svg>`;

function iniciaisPessoa(n) { const p = String(n || '').split(/\s+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : (p[0] || '?')[0]).toUpperCase(); }
const frases = (t) => String(t || '').split(/(?<=[.!?])\s+(?=[A-ZÀ-Úa-zà-ú0-9“"(])/).map((x) => x.trim()).filter(Boolean);
// divide um texto em n partes equilibradas (por frases; se faltar frase, na vírgula mais central)
function partes(t, n = 2) {
  let fs = frases(t);
  while (fs.length < n) {
    const i = fs.reduce((m, x, j) => (x.length > fs[m].length ? j : m), 0), s = fs[i];
    const cortes = [...s.matchAll(/[,;:]\s/g)].map((m) => m.index + 1);
    if (!cortes.length) break;
    const c = cortes.sort((a, b) => Math.abs(a - s.length / 2) - Math.abs(b - s.length / 2))[0];
    fs.splice(i, 1, s.slice(0, c).trim(), cap(s.slice(c).trim()));
  }
  if (fs.length <= n) return fs;
  const out = [];
  let resto = fs.slice();
  for (let j = n; j > 1; j--) {
    const total = resto.join(' ').length, alvo = total / j;
    let acc = '', q = 0;
    while (q < resto.length - (j - 1) && (acc.length + resto[q].length / 2) < alvo) { acc += (acc ? ' ' : '') + resto[q]; q++; }
    if (!acc) { acc = resto[0]; q = 1; }
    out.push(acc); resto = resto.slice(q);
  }
  out.push(resto.join(' '));
  return out;
}
function horaDe(t) {
  const m = /^([^:]{1,26}):\s+(.+)$/.exec(String(t || ''));
  return m && /\d{1,2}h|\d{1,2}:\d{2}/.test(m[1]) ? [m[1], cap(m[2])] : [null, String(t || '')];
}
const notaDe = (pk) => pk.nums.find(([v, r]) => /★/.test(v) || /nota/i.test(r)) || pk.nums[0];
export function angsDoPost(ctx, P) {
  const ordem = [P.ang, ctx.dif, 'qualidade', 'experiencia', 'confianca', 'rapidez', 'resultado', 'exclusividade', 'conveniencia', 'comunidade', 'preco'];
  return [...new Set(ordem)].filter((a) => a && ANG[a] && ctx.pack.ang[a]);
}
const precoCurto = (p) => String(p || '').replace(/\s*\/\s*/, '/');
function precoPartes(p) { // "R$ 31,90" → ["R$", "31", ",90", ""] ; "R$ 110/mês" → ["R$", "110", "", "/mês"]; "sob consulta" → texto
  const m = /^R\$\s?([\d.]+)(,\d{2})?(\/.+)?$/.exec(String(p || '').trim());
  return m ? ['R$', m[1], m[2] || '', m[3] || ''] : null;
}
const precoHTML = (p, cls = 'car-preco') => {
  const q = precoPartes(p);
  return q ? `<span class="${cls}"><small>${q[0]}</small><b>${esc(q[1])}</b>${q[2] ? `<sup>${esc(q[2])}</sup>` : ''}${q[3] ? `<em>${esc(q[3])}</em>` : ''}</span>` : `<span class="${cls} car-preco-t"><b>${esc(p)}</b></span>`;
};

// ------------------------------------------------------------------ ornamentos por estilo (a "mobília" de cada lâmina)
function mobilia(R, d) {
  const { E, k, ctx, P } = R;
  const R0 = rnd(`${ctx.segId}${P.n}${k}${E}`);
  switch (E) {
    case 'editorial': {
      const dt = new Date(ctx.agora);
      const dir = `Nº ${dd(P.n)} · ${cap(MESES[dt.getMonth()])}. ${dt.getFullYear()}`;
      return `<div class="car-mh"><span class="car-mh-m">${esc(ctx.nome)}</span><span class="car-mh-r">${esc(dir)}</span></div>`; // alinhado à esquerda: o canto direito é do contador
    }
    case 'minimal':
      return `<div class="car-mn"><span class="car-mn-n">${dd(k + 1)}</span><span class="car-mn-m">${esc(ctx.nome)}<i>${esc(ctx.cidade ? ctx.cidade.nome : ctx.pack.label)}</i></span></div><div class="car-prog">${[0, 1, 2, 3, 4, 5].map((j) => `<i${j === k ? ' class="on"' : ''}></i>`).join('')}</div>`;
    case 'tech':
      return `<div class="car-grade"></div><div class="car-cruz"><i></i><i></i><i></i><i></i></div><div class="car-tk"><span>[${dd(k + 1)}]</span><b>${esc(ctx.nome.toLocaleUpperCase('pt-BR'))}</b><em>${esc(ctx.handle.slice(0, 3).toUpperCase())}-${dd(P.n)}${dd(k + 1)}</em><i></i></div>`;
    case 'luxo':
      return `<div class="car-mold"><i></i><i></i><i></i><i></i></div>`;
    case 'colagem': {
      const fitas = [0, 1].map((j) => `<i class="car-fita" style="--x:${(8 + R0() * 70).toFixed(1)}cqw;--r:${(-35 + R0() * 70).toFixed(0)}deg;--y:${j ? 'auto' : '-1.6cqw'};--yb:${j ? '-1.6cqw' : 'auto'}"></i>`).join('');
      const blob = `<svg class="car-blob" viewBox="0 0 100 100" preserveAspectRatio="none" style="--x:${(60 + R0() * 14).toFixed(1)}cqw;--y:${(-22 + R0() * 12).toFixed(1)}cqw;--r:${(R0() * 90).toFixed(0)}deg" aria-hidden="true"><path d="M50 4C74 2 97 20 96 48S78 97 50 96 3 78 4 50 26 6 50 4z"/></svg>`;
      return fitas + blob;
    }
    case 'impacto':
      return d.gg ? `<div class="car-gg${String(d.gg).length > 3 ? ' car-gg-p' : ''}" aria-hidden="true">${esc(d.gg)}</div>` : '';
    default: return '';
  }
}

function rodape(R) {
  const { E, k, ctx, V } = R;
  const c = ctx.marca.cores;
  const variante = contraste(V.b, c.pri) < 1.5 ? 'inv' : 'cor';
  const sym = E === 'minimal' || E === 'tech' ? '' : simboloSVG(ctx, { tamanho: 20, classe: 'car-pe-s', variante });
  const n = E === 'editorial' ? `${ROM[k + 1]}<i>/</i>${ROM[NL]}`
    : E === 'impacto' ? dd(k + 1)
      : E === 'minimal' ? `${dd(k + 1)} / ${dd(NL)}`
        : E === 'luxo' ? `<i></i>${ROM[k + 1]}<i></i>`
          : E === 'tech' ? `[${dd(k + 1)}/${dd(NL)}]`
            : `${k + 1}/${NL}`;
  return `<div class="car-pe"><span class="car-pe-id">${sym}<b>@${esc(ctx.handle)}</b></span><span class="car-pe-n">${n}</span></div>`;
}

// ------------------------------------------------------------------ ilustração (cena, pedestal, figura)
function ilustra(R, { w = 100, h = 100, estilo, sem = '', faixa = '' } = {}) {
  const { ctx, V, P, k, E } = R;
  return arte(estilo || imgDe(ctx, E), { icone: ctx.icone, apoio: ctx.apoio, c: coresArte(ctx, V, E), w, h, semente: `${ctx.segId}${P.n}${k}${sem}`, id: `${R.pref}${P.n}${k}${sem}`, faixa });
}
function fundoFx(R, d) {
  const { V, E, k, ctx } = R;
  let s = '';
  if (V.padrao && !d.limpo) {
    const pid = `${R.pref}pd${R.P.n}${k}`;
    const icone = E === 'luxo' ? { svg: '<path d="M12 3l9 9-9 9-9-9z"/>' } : ctx.icone;
    const t = E === 'impacto' ? 34 : E === 'minimal' ? 16 : E === 'luxo' ? 12 : 22;
    const op = E === 'luxo' ? 0.5 : E === 'impacto' ? 0.2 : E === 'minimal' ? 0.28 : 0.24;
    const rot = E === 'minimal' || E === 'tech' || E === 'luxo' ? 0 : -14;
    const cor = E === 'luxo' ? V.g : V.a;
    const figura = E === 'minimal'
      ? `<circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.07}" fill="${cor}" opacity="${op * 2}"/>`
      : `<g transform="translate(${t * 0.18} ${t * 0.18}) scale(${(t * 0.64) / 24})" fill="none" stroke="${cor}" stroke-width="${E === 'luxo' ? 1 : 1.6}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}">${icone.svg}</g>` + (E === 'luxo' ? '' : `<g transform="translate(${t * 0.68} ${t * 0.68}) scale(${(t * 0.3) / 24})" fill="none" stroke="${cor}" stroke-width="1.8" stroke-linecap="round" opacity="${op * 0.8}">${icone.svg}</g>`);
    s += `<svg class="car-padrao" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="${pid}" width="${t}" height="${t}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">${figura}</pattern></defs><rect width="100" height="100" fill="url(#${pid})"/></svg>`;
  }
  if (V.cena && !d.limpo) s += `<div class="car-cena${k === 0 ? ' car-cena-capa' : ''}">${ilustra(R, { sem: 'cn', w: 100, h: 100 })}</div>`;
  return s;
}

// ------------------------------------------------------------------ peças de texto
const kk = (t, cls = '') => (t ? `<div class="car-kk ${cls}">${esc(t)}</div>` : '');
const mesmo = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
function titulo(R, texto, o = {}) {
  const { T, E } = R;
  const S = ESTILOS[E];
  const W = +(o.W || 100 - 2 * S.m).toFixed(2);
  const cx = o.cx != null ? o.cx : (E === 'impacto' ? true : T.cx);
  const { attr } = ajuste(texto, T, { W, H: o.H || 40, max: o.max || 14, min: o.min || 5, cx, extra: `;--tw:${W}` });
  const tag = o.tag || 'p';
  // --tw = a largura usada na conta: o CSS limita o título a ela (a quebra real bate com a medida)
  return `<${tag} class="car-tt ${o.cls || ''}"${o.campo ? ` data-campo="${o.campo}"` : ''}${attr}>${esc(texto)}</${tag}>`;
}
const tx = (t, cls = '', base = 4.6) => `<p class="car-tx ${cls}" style="--tz:${corpo(t, base)}">${esc(t)}</p>`;

// ------------------------------------------------------------------ CAPA
// tamanho do texto da oferta na capa (largura × altura disponíveis por estilo)
const OF_CAPA = { editorial: [34, 26, 13], impacto: [86, 34, 30], minimal: [84, 30, 24], colagem: [30, 24, 14], luxo: [66, 15, 11], tech: [34, 26, 13] };
function heroCapa(R) {
  const { P, ctx, E } = R;
  const pk = ctx.pack;
  const h = (tipo, miolo) => `<div class="car-hero car-h-${tipo}"><div class="car-hi">${miolo}</div></div>`;
  if (R.V.cena && ['vitrine', 'apresentacao', 'manifesto'].includes(P.fmt)) return P.fmt === 'vitrine' ? `<div class="car-hero car-h-cena"><div class="car-tagbox">${etiqueta(P.item.preco)}</div></div>` : '<div class="car-hero car-h-cena"></div>';
  switch (P.fmt) {
    case 'motivos': return h('num', '<b>3</b>');
    case 'historia': return h('ano', `<small>desde</small><b>${ctx.ano}</b>`);
    case 'oferta': {
      const g = ctx.oferta ? ctx.oferta.curta : (precoPartes(P.item.preco) ? P.item.preco : P.item.nome);
      const [w, hh, mx] = OF_CAPA[E] || OF_CAPA.editorial;
      const { attr } = ajuste(g, R.T, { W: w, H: hh, max: mx, min: 5, cx: true, lh: 0.88, tr: -0.01, extra: `;--ow:${w}` }, '--os');
      return h('oferta', `<b${attr}>${esc(g)}</b>`);
    }
    case 'passo_a_passo': return h('passos', '<i>1</i><i>2</i><i>3</i>');
    case 'comparativo': return h('vs', `<span>${icUI('mais', 'car-vs-x')}</span><b>×</b><span>${icUI('check')}</span>`);
    case 'perguntas': return h('q', '<b>?</b>');
    case 'depoimentos': { const [v] = notaDe(pk); return h('depo', `<b>“</b><span class="car-nota">${estrelas()}${/★/.test(v) ? `<em>${esc(v.replace('★', '').trim())}</em>` : ''}</span>`); }
    case 'bastidores': {
      const [hr] = horaDe(pk.bastidor);
      const m = hr && /(\d{1,2})h(\d{2})?/.exec(hr);
      const hh = m ? +m[1] % 12 : 10, mm = m && m[2] ? +m[2] : 0;
      return h('rel', `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" class="car-rel-a"/>${Array.from({ length: 12 }, (_, j) => `<line x1="50" y1="8" x2="50" y2="${j % 3 ? 13 : 17}" transform="rotate(${j * 30} 50 50)"/>`).join('')}<line x1="50" y1="50" x2="50" y2="26" class="car-rel-h" transform="rotate(${hh * 30 + mm * 0.5} 50 50)"/><line x1="50" y1="50" x2="50" y2="15" class="car-rel-m" transform="rotate(${mm * 6} 50 50)"/><circle cx="50" cy="50" r="3.5" class="car-rel-c"/></svg>${hr ? `<em>${esc(hr)}</em>` : ''}`);
    }
    case 'antes_depois': return h('ad', '<span>Antes</span><span>Depois</span>');
    case 'dica': return h('dica', icId('lampada', '', 1.5));
    case 'manifesto': return h('sym', simboloSVG(ctx, { tamanho: 80, classe: 'car-h-s', variante: contraste(R.V.b, ctx.marca.cores.pri) < 1.5 ? 'inv' : 'cor' }));
    case 'vitrine': return `<div class="car-hero car-h-prod">${pedestal(R, 0, P.item.preco)}</div>`;
    default: return h('arte', E === 'minimal' || E === 'luxo' ? icId(ctx.icone.id, '', E === 'luxo' ? 1.2 : 1.6) : ilustra(R, { sem: 'cp' })); // apresentacao: ícone puro nos estilos sem enfeite
  }
}
function deckCapa(R) {
  const { P, ctx } = R;
  const pk = ctx.pack;
  switch (P.fmt) {
    case 'manifesto': return ctx.marca.slogan;
    case 'oferta': return ctx.oferta ? cap(ctx.oferta.frase) : `${P.item.nome} · ${P.item.preco}`;
    case 'passo_a_passo': return pk.passos.map((p) => p[0]).join(' · ');
    case 'comparativo': return cap(P.angTxt);
    case 'perguntas': return pk.faq[0][0];
    case 'depoimentos': { const [v, r] = notaDe(pk); return `${v} ${r}`; }
    case 'bastidores': return horaDe(pk.bastidor)[0] ? cap(pk.cat) : pk.desc;
    case 'antes_depois': return cap(pk.ang.resultado || P.angTxt);
    case 'dica': return /dica/i.test(P.hook) ? 'Salve para consultar depois' : pk.dica[0];
    case 'vitrine': return `${P.item.nome} · ${P.itemPapel ? P.itemPapel.rotulo : pk.itensTitulo}`;
    default: return `${pk.desc}${ctx.emCidade || ''}`;
  }
}
function arraste(R) {
  const { E } = R;
  if (E === 'colagem') return `<div class="car-arr"><span>arraste</span>${rab('seta', 'car-arr-r')}</div>`;
  if (E === 'tech') return `<div class="car-arr"><span>ARRASTE</span><b>→</b></div>`;
  if (E === 'impacto') return `<div class="car-arr">${seta('car-arr-s')}</div>`;
  return `<div class="car-arr"><span>Arraste</span>${seta('car-arr-s', E === 'luxo' || E === 'editorial')}</div>`;
}
function capa(R) {
  const { P, ctx, E } = R;
  const S = ESTILOS[E], W = 100 - 2 * S.m;
  const kick = ctx.cidade ? `${ctx.pack.label} · ${ctx.cidade.nome}` : ctx.pack.label;
  const deck = deckCapa(R);
  // espaço do título por estilo (o herói fica com o que sobra da lâmina, no fluxo: nada se atropela)
  const of = P.fmt === 'oferta';
  const lim = {
    editorial: { W, H: of ? 18 : 23, max: 12 },
    impacto: { W, H: of ? 20 : 28, max: 17 },
    minimal: { W: W * 0.94, H: of ? 18 : 24, max: 11 },
    colagem: { W: 66, H: of ? 19 : 27, max: 11.5 },
    luxo: { W: W * 0.96, H: of ? 14 : 21, max: 9.6 },
    tech: { W, H: of ? 16 : 23, max: 10.5 },
  }[E];
  const tt = titulo(R, P.hook, { ...lim, tag: 'h3', cls: 'car-tt-capa', campo: `hook${P.n}` });
  let dados = '';
  if (E === 'tech') { // leitura de dados ao lado da figura
    const R0 = rnd(ctx.segId + 'capa' + P.n);
    dados = `<div class="car-dados">${ctx.pack.nums.slice(0, 2).map(([v, r], j) => `<div><b>${esc(v)}</b><span>${esc(r)}</span><svg class="car-spark" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true"><polyline points="${Array.from({ length: 9 }, (_, q) => `${(q * 7.5).toFixed(1)},${(14 - (q / 8) * (8 + j * 2) - R0() * 4).toFixed(1)}`).join(' ')}"/></svg></div>`).join('')}</div>`;
  }
  const orn = E === 'luxo' ? '<span class="car-ornr" aria-hidden="true"><i></i></span>' : '';
  return `<div class="car-cx car-cx-capa">${kk(kick, 'car-kk-capa')}${heroCapa(R)}${tt}${orn}${deck ? `<p class="car-deck">${esc(deck)}</p>` : ''}${dados}${arraste(R)}</div>`;
}

// ------------------------------------------------------------------ CHAMADA FINAL
function chamada(R) {
  const { P, ctx, E, V, T } = R;
  const c = ctx.marca.cores, S = ESTILOS[E], W = 100 - 2 * S.m;
  const id = P.cta.id;
  const contato = id === 'whats' ? ctx.telefone : id === 'bio' || id === 'agenda' ? ctx.dominio : `@${ctx.handle}`;
  const icone = icUI(id === 'whats' ? 'whats' : CTA_IC[id] || 'seta', 'car-cta-ic');
  const temOf = !!(ctx.oferta && ['vitrine', 'oferta', 'passo_a_passo', 'comparativo'].includes(P.fmt));
  const noHeroi = E === 'impacto' || E === 'colagem';
  // com selo de oferta no herói, a chamada encolhe um pouco para o selo ter espaço (e ficar legível)
  const lim = { editorial: { W, H: 28, max: 12.5 }, impacto: { W: W + 1, H: temOf ? 26 : 38, max: temOf ? 14 : 17 }, minimal: { W: W * 0.92, H: 30, max: 11 }, colagem: { W: 70, H: temOf ? 22 : 28, max: temOf ? 10.5 : 12 }, luxo: { W: W * 0.9, H: 24, max: 9.5 }, tech: { W: W * 0.92, H: 24, max: 10.5 } }[E];
  const tt = titulo(R, P.cta.texto, { ...lim, cls: 'car-tt-cta' });
  // logo de verdade quando existe variante legível; senão símbolo + nome na fonte do logo
  const baseEhPri = contraste(V.b, c.pri) < 1.5;
  const vLogo = baseEhPri ? 'inv' : V.esc ? (c.dark ? 'cor' : 'claro') : (c.dark ? null : 'cor');
  const marca = vLogo ? logoSVG(ctx, { variante: vLogo, compacto: true, classe: 'car-cta-logo' })
    : `<span class="car-cta-nome">${simboloSVG(ctx, { tamanho: 40, classe: 'car-cta-sym', variante: 'cor' })}<b>${esc(ctx.nome)}</b></span>`;
  let selo = '', chip = '';
  if (temOf && noHeroi) { const { attr } = ajuste(ctx.oferta.curta, T, { W: 72, H: 52, max: 30, min: 9, cx: true, lh: 0.92, tr: -0.01 }, '--os'); selo = `<div class="car-cta-of"><b${attr}>${esc(ctx.oferta.curta)}</b></div>`; }
  else if (temOf) chip = `<span class="car-cta-chip">${esc(ctx.oferta.curta)}</span>`;
  // o "herói" da última lâmina: fecha a série com a mesma linguagem da capa
  const heroi = E === 'impacto' || E === 'colagem' ? `<div class="car-hero car-cta-h"><div class="car-hi">${ilustra(R, { sem: 'ct' })}</div>${E === 'colagem' ? rab('seta', 'car-cta-r') : ''}</div>`
    : E === 'minimal' ? `<div class="car-hero car-cta-h"><div class="car-hi">${seta('car-cta-go')}</div></div>`
      : E === 'editorial' ? `<div class="car-hero car-cta-h car-colo"><dl>${[['Endereço', ctx.endereco], ['Horário', ctx.pack.horario]].map(([t, v]) => `<div><dt>${t}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`
        : E === 'tech' ? `<div class="car-hero car-cta-h"><div class="car-hi"><div class="car-qr" aria-hidden="true">${qrMini(ctx)}</div><div class="car-cta-lg"><span>${esc(ctx.dominio.toUpperCase())}</span><span>${esc(ctx.telefone)}</span><span>@${esc(ctx.handle.toUpperCase())}</span></div></div></div>` : '';
  return `<div class="car-cx car-cx-cta"><div class="car-cta-m">${marca}</div>${heroi}${selo}${tt}<div class="car-acao"><div class="car-btn">${icone}<span>${esc(contato)}</span>${seta('car-btn-s')}</div>${chip}</div></div>`;
}
function qrMini(ctx) { // grade decorativa (não é um QR funcional)
  const R = rnd('qr' + ctx.handle); let d = '';
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const canto = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5); if (!canto && R() < 0.5) d += `M${x} ${y}h1v1h-1z`; }
  const f = (x, y) => `<path d="M${x} ${y}h3v3h-3z" fill="none" stroke="currentColor" stroke-width=".5" transform="translate(.25 .25) scale(.95)"/><path d="M${x + 1} ${y + 1}h1v1h-1z"/>`;
  return `<svg viewBox="0 0 9 9" shape-rendering="crispEdges" fill="currentColor"><path d="${d}"/>${f(0, 0)}${f(6, 0)}${f(0, 6)}</svg>`;
}

// ------------------------------------------------------------------ produto no pedestal + etiqueta de preço
function pedestal(R, j, preco) {
  return `<div class="car-ped car-ped-${j % 4}"><div class="car-ped-halo"></div><div class="car-ped-base"><i></i></div><div class="car-ped-arte">${ilustra(R, { sem: `pd${j}`, w: 100, h: 100 })}</div>${preco ? etiqueta(preco) : ''}</div>`;
}
const etiqueta = (preco) => `<div class="car-tag"><i class="car-tag-fio"></i><div class="car-tag-c">${precoHTML(preco, 'car-preco')}</div></div>`;

// corpo da lista de itens: o maior tamanho em que os 4 nomes (com quebra) e os preços cabem na altura livre
function tamLista(R, lista, W, comKk) {
  const { E, T } = R;
  const disp = E === 'impacto' || E === 'editorial' || E === 'luxo';
  const o = { fam: disp ? T.fd : T.fb, peso: disp ? T.dw : 700, cx: E === 'impacto' || (disp && T.cx), tr: disp ? 0.01 : 0 };
  const fator = E === 'impacto' ? 1.12 : E === 'editorial' ? 1.1 : E === 'luxo' ? 1.04 : 1; // o nome é um pouco maior que o corpo
  const Hlivre = 100 - T.t - T.b - (comKk ? (E === 'colagem' ? 11 : E === 'impacto' ? 7 : 5) : 0) - 17 - (E === 'colagem' ? 3 : 0);
  const ws = lista.map((it) => ({ p: palavras(it.nome, o), v: larg(precoCurto(it.preco), T.fb, 800) + (E === 'impacto' || E === 'colagem' ? 0.5 : 0) }));
  for (let s = 4.8; s >= 3; s -= 0.1) {
    let h = 0;
    for (const { p, v } of ws) {
      const Wn = W - 6.5 - 6 - 2.5 - v * s - (E === 'colagem' ? 8 : 0); // número, 3 vãos, pontilhado mínimo, preço
      const n = nLinhas(p.pal, p.wp, p.esp, s * fator, Wn);
      h += (n === Infinity ? 9 : n) * s * fator * 1.2 + 4.6;
    }
    if (h <= Hlivre) return Math.round(s * 100) / 100;
  }
  return 3;
}

// ------------------------------------------------------------------ TIPOS DE LÂMINA
const TIPOS = {
  capa,
  cta: chamada,

  // uma frase forte (manifesto, detalhe, resultado, por que funciona); o número ocupa o espaço que sobra
  frase(R, d) {
    const { E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    let lay = d.lay || 1;
    const num = d.n ? (E === 'editorial' || E === 'luxo' ? ROM[d.n] : dd(d.n)) : '';
    if (!num && lay !== 2 && !d.ic) lay = 2;
    // centrada (lay 2): o título divide a altura com o ícone, o rótulo, a nota e o respiro da caixa (pôster e colagem)
    const alto = 100 - S.t - S.b;
    const H2 = alto - (d.ic ? (E === 'luxo' ? 17 : E === 'editorial' ? 15 : E === 'colagem' ? 23 : 20) : 0) - (d.rot ? (E === 'colagem' ? 10 : E === 'impacto' ? 7 : 6) : 0) - (d.nota ? 8 : 0) - (E === 'impacto' ? 7 : E === 'colagem' ? 8 : 0) - 2;
    const H0 = { editorial: 40, impacto: 47, minimal: 40, colagem: 38, luxo: 40, tech: 42 }[E];
    const H = lay === 2 ? Math.min(H0, H2) : H0;
    const max = { editorial: 11.5, impacto: 14, minimal: 10.5, colagem: 10.5, luxo: 9, tech: 9.5 }[E];
    const Wt = E === 'colagem' ? 70 : E === 'luxo' ? W * 0.94 : W;
    const tt = titulo(R, d.texto, { W: Wt, H, max, cls: 'car-tt-fr' });
    const icone = d.ic ? `<span class="car-fr-ic">${icId(d.ic, '', 1.6)}</span>` : '';
    const nota = d.nota ? `<p class="car-fr-nota">${esc(d.nota)}</p>` : '';
    if (lay === 2) return `<div class="car-cx car-cx-frase" data-lay="2">${icone}${kk(d.rot)}${tt}${nota}</div>`;
    const fill = `<div class="car-fill car-fr-fill">${num ? `<b class="car-fn">${num}</b>` : ''}${icone}</div>`;
    return lay === 3 ? `<div class="car-cx car-cx-frase" data-lay="3">${kk(d.rot)}${tt}${nota}${fill}</div>` : `<div class="car-cx car-cx-frase" data-lay="${lay}"${num ? '' : ' data-sem-n'}>${fill}${kk(d.rot)}${tt}${nota}</div>`;
  },

  // motivo 01/02/03: número grande e ícone no espaço livre, o texto na base (o 3º inverte)
  motivo(R, d) {
    const { E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const max = { editorial: 9.5, impacto: 11, minimal: 9, colagem: 9, luxo: 8, tech: 8.5 }[E];
    const tt = titulo(R, d.texto, { W: E === 'colagem' ? 68 : W * 0.95, H: 30, max, cls: 'car-tt-mo' });
    const fill = `<div class="car-fill car-mo-fill"><b class="car-fn">${E === 'luxo' || E === 'editorial' ? ROM[d.n] : dd(d.n)}</b><span class="car-mo-ic">${icId(d.ic, '', 1.6)}</span></div>`;
    return d.n === 3 ? `<div class="car-cx car-cx-motivo" data-lay="3">${kk(d.rot)}${tt}${fill}</div>` : `<div class="car-cx car-cx-motivo" data-lay="${d.n}">${fill}${kk(d.rot)}${tt}</div>`;
  },

  // números (prova): 3 valores com rótulo
  numeros(R, d) {
    const { ctx, E } = R;
    const nums = d.nums || ctx.pack.nums;
    const barra = (v, r) => {
      const n = parseFloat(String(v).replace(/[^\d,]/g, '').replace(',', '.'));
      if (/%/.test(v) && n <= 100) return n / 100;
      if (/★/.test(v) && n <= 5) return n / 5;
      if (/nota/i.test(r) && n <= 10) return n / 10;
      return null;
    };
    const R0 = rnd(ctx.segId + 'sp' + R.P.n);
    const spark = () => `<svg class="car-spark" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true"><polyline points="${Array.from({ length: 9 }, (_, j) => `${(j * 7.5).toFixed(1)},${(14 - (j / 8) * 9 - R0() * 4).toFixed(1)}`).join(' ')}"/></svg>`;
    const itens = nums.map(([v, r], j) => {
      const b = barra(v, r);
      const extra = E === 'tech' ? (b != null ? `<i class="car-bar"><i style="width:${Math.round(b * 100)}%"></i></i>` : spark()) : '';
      return `<div class="car-nu car-nu-${j}"><b>${esc(v)}</b><span>${esc(r)}</span>${extra}</div>`;
    }).join('');
    return `<div class="car-cx car-cx-num">${kk(d.rot)}${d.titulo ? titulo(R, d.titulo, { H: 16, max: 8, cls: 'car-tt-num' }) : ''}<div class="car-nus">${itens}</div></div>`;
  },

  // itens com preço (cardápio, serviços, planos)
  lista(R, d) {
    const { ctx, E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const lista = ctx.itens.slice(0, 4);
    const itens = lista.map((it, j) => `<li><span class="car-li-n">${E === 'luxo' || E === 'editorial' ? ROM[j + 1] : dd(j + 1)}</span><b>${esc(it.nome)}</b><i class="car-li-p"></i><span class="car-li-v">${esc(precoCurto(it.preco))}</span></li>`).join('');
    const tit = d.titulo || ctx.pack.itensTitulo;
    const comKk = !mesmo(d.rot, tit);
    return `<div class="car-cx car-cx-lista">${kk(comKk ? d.rot : '')}${titulo(R, tit, { W, H: 14, max: E === 'impacto' ? 13 : 10, cls: 'car-tt-li' })}<ol class="car-li" style="--lz:${tamLista(R, lista, W, comKk)}">${itens}</ol></div>`;
  },

  // 3 passos numa lâmina (linha do tempo)
  passos(R, d) {
    const { ctx } = R;
    const pas = ctx.pack.passos.map(([t, x], j) => `<li><span class="car-pa-n">${j + 1}</span><div><b>${esc(t)}</b><span class="car-pa-x">${esc(x)}</span></div></li>`).join('');
    const tit = d.titulo || 'Em 3 passos';
    return `<div class="car-cx car-cx-passos">${kk(mesmo(d.rot, tit) ? '' : d.rot)}${titulo(R, tit, { H: 14, max: R.E === 'impacto' ? 12 : 9.5, cls: 'car-tt-pa' })}<ol class="car-pa">${pas}</ol></div>`;
  },

  // um passo por lâmina: número enorme vazado e ícone no espaço livre, título e texto na base
  passo(R, d) {
    const { E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const tt = titulo(R, d.titulo, { W: E === 'colagem' ? 66 : W * 0.95, H: 20, max: E === 'impacto' ? 11 : 9, cls: 'car-tt-ps' });
    return `<div class="car-cx car-cx-passo" data-lay="${d.n}"><div class="car-fill car-ps-fill"><b class="car-fn">${d.n}</b><span class="car-ps-ic">${d.icHTML}</span></div>${kk(d.rot)}${tt}${tx(d.texto, 'car-ps-t', 4.8)}</div>`;
  },

  // produto: ilustração no pedestal com a etiqueta pendurada (no espaço livre), nome e descrição
  produto(R, d) {
    const { E } = R;
    const it = d.item;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const tt = titulo(R, it.nome, { W: E === 'luxo' ? W * 0.95 : W * 0.7, H: 16, max: E === 'impacto' ? 10 : 8.2, min: 4.6, cls: 'car-tt-pr' });
    const fill = `<div class="car-fill car-pr-fill">${pedestal(R, d.j, it.preco)}${d.selo ? `<span class="car-selo">${esc(d.selo)}</span>` : ''}</div>`;
    const texto = `<div class="car-pr-t">${kk(d.rot)}${tt}<p class="car-pr-d">${esc(it.desc)}</p><p class="car-pr-v">${precoHTML(it.preco, 'car-preco')}</p></div>`;
    return `<div class="car-cx car-cx-prod" data-lay="${d.j % 4}">${d.j % 4 === 2 ? texto + fill : fill + texto}</div>`;
  },

  // oferta: cupom recortado
  cupom(R, d) {
    const { ctx, P, E, T } = R;
    const W = 100 - 2 * ESTILOS[E].m;
    const grande = ctx.oferta ? ctx.oferta.curta : precoCurto(P.item.preco);
    const frase = ctx.oferta ? cap(ctx.oferta.frase) : `${P.item.nome}: ${P.item.desc}`;
    // o texto grande do canhoto é medido para caber inteiro (sem quebrar palavra no meio)
    const { attr } = ajuste(grande, T, { W: W * 0.44 - 8.6, H: 24, max: 9.5, min: 3.4, cx: true, lh: 0.92, tr: -0.01 }, '--cz');
    return `<div class="car-cx car-cx-cupom">${kk(d.rot)}<div class="car-cup"><div class="car-cup-e"><small>${esc(ctx.nome)}</small><b${attr}>${esc(grande)}</b></div><div class="car-cup-d"><span>${esc(frase)}</span></div></div>${d.nota ? `<p class="car-cup-n">${esc(d.nota)}</p>` : ''}</div>`;
  },

  // prazo com urgência: a folha do calendário de hoje e o horário
  prazo(R, d) {
    const { ctx, P } = R;
    const dt = new Date(ctx.agora);
    const g = P.gancho && P.gancho.id;
    const rot = g === 'so_hoje' ? 'Só hoje' : g === 'ultima' ? 'Última chamada' : g === 'vagas' ? 'Últimas vagas da semana' : g === 'agenda' ? `Agenda aberta para ${MESES_L[dt.getMonth()]}` : 'Por tempo limitado';
    return `<div class="car-cx car-cx-prazo">${kk(d.rot)}<div class="car-cal"><div class="car-cal-t">${esc(DIAS[dt.getDay()])}</div><div class="car-cal-d">${dt.getDate()}</div><div class="car-cal-m">${esc(MESES_L[dt.getMonth()])}</div></div>${titulo(R, rot, { H: 20, max: 10, cls: 'car-tt-pz' })}<p class="car-pz-h">${icUI('relogio', 'car-pz-ic')}<span>${esc(ctx.pack.horario)}</span></p></div>`;
  },

  // pergunta e resposta
  qa(R, d) {
    const { E, T } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m, alto = 100 - S.t - S.b;
    const [q, a] = d.qa;
    const col = E === 'colagem';
    const Wa = W - 11; // letra "R" (8) + vão (3)
    const o = { fam: T.fb, peso: 400, cx: false, tr: 0, lh: 1.42 };
    const az = caber(a, T, { ...o, W: Wa, H: alto * 0.42, max: corpo(a, 4.7), min: 3.3 });
    const p = palavras(a, o);
    const aH = nLinhas(p.pal, p.wp, p.esp, az, Wa * 0.955) * az * 1.42 + 4.4;
    const kkH = d.rot ? (col ? 10 : 7) : 0;
    const tt = titulo(R, q, { W: col ? 66 : Wa, H: Math.min(26, alto - kkH - aH - 6 - (col ? 6 : 0)), max: E === 'impacto' ? 10.5 : 8.5, min: 4.4, cls: 'car-tt-q' });
    return `<div class="car-cx car-cx-qa" data-lay="${d.n}">${kk(d.rot)}<div class="car-qa-q"><span class="car-qa-l">P</span>${tt}</div><div class="car-qa-a"><span class="car-qa-l">R</span><p class="car-tx car-qa-t" style="--tz:${az}">${esc(a)}</p></div></div>`;
  },

  // depoimento: aspas, estrelas, texto e autor, em 3 composições (aspas no alto, pessoa no alto, aspas embaixo)
  depo(R, d) {
    const { E } = R;
    const [t, a] = d.depo;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const { attr } = ajuste(t, R.T, { W: E === 'colagem' ? 66 : W * 0.98, H: 38, max: E === 'impacto' ? 7.4 : 6.6, min: 4.2, fam: R.T.fb, peso: 500, cx: false, tr: 0, lh: 1.32 }, '--tz');
    const ini = esc(iniciaisPessoa(a));
    const texto = `<p class="car-dp-t"${attr}>${esc(t)}</p>`;
    const autor = `<div class="car-dp-a"><span class="car-av-i">${ini}</span><b>${esc(a)}</b></div>`;
    if (d.n === 2) return `<div class="car-cx car-cx-depo" data-lay="2"><div class="car-fill car-dp-fill"><div class="car-dp-p"><span class="car-av-i car-dp-av">${ini}</span><div><b>${esc(a)}</b>${estrelas('car-dp-e')}</div></div></div>${texto}</div>`;
    if (d.n === 3) return `<div class="car-cx car-cx-depo" data-lay="3">${estrelas('car-dp-e')}${texto}${autor}<div class="car-fill car-dp-fill"><b class="car-dp-q">”</b></div></div>`;
    return `<div class="car-cx car-cx-depo" data-lay="1"><div class="car-fill car-dp-fill"><b class="car-dp-q">“</b></div>${estrelas('car-dp-e')}${texto}${autor}</div>`;
  },

  // equipe: avatares com iniciais
  equipe(R, d) {
    const { ctx } = R;
    const pes = ctx.pack.equipe.slice(0, 3).map(([n, p], j) => `<li class="car-eq-${j}"><span class="car-av-i">${esc(iniciaisPessoa(n))}</span><b>${esc(n)}</b><small>${esc(p)}</small></li>`).join('');
    return `<div class="car-cx car-cx-eq">${kk(mesmo(d.rot, d.titulo) ? '' : d.rot)}${titulo(R, d.titulo, { H: 14, max: R.E === 'impacto' ? 11 : 9, cls: 'car-tt-eq' })}<ul class="car-eq">${pes}</ul></div>`;
  },

  // bastidor: a foto (polaroide com a ilustração) no espaço livre, o horário em destaque e a cena do dia
  bastidor(R, d) {
    const { ctx, E } = R;
    const [h, t] = horaDe(ctx.pack.bastidor);
    const papel = ['editorial', 'impacto', 'colagem'].includes(E);
    const Rf = papel ? { ...R, V: variante(ctx, ['#ecebe6'], null, [ctx.marca.cores.ink, '#1d1b19']) } : R;
    const hm = h && /(\d{1,2})h(\d{2})?/.exec(h);
    const arq = hm ? ` data-arq="IMG_${String(hm[1]).padStart(2, '0')}${hm[2] || '00'}.RAW"` : '';
    return `<div class="car-cx car-cx-bas"><div class="car-fill car-bs-fill"><div class="car-bs-f"${arq}><div class="car-bs-img">${ilustra(Rf, { sem: 'bs' })}</div></div></div>${kk(d.rot)}${h ? `<div class="car-bs-h">${esc(h)}</div>` : ''}${tx(t, 'car-bs-t', 4.6)}</div>`;
  },

  // quem somos / sobre: a 1ª frase grande; o resto medido (até 30% da altura) e o lead com a altura que sobra
  sobre(R, d) {
    const { E, T } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m, alto = 100 - S.t - S.b;
    const fs = frases(d.texto);
    const lead = fs[0] || d.texto;
    let resto = fs.slice(1).join(' ');
    const col = E === 'colagem';
    const kkH = d.rot ? (col ? 10 : 6) : 0, anoH = d.ano ? 17.5 : 0;
    let rz = 0, restoH = 0;
    if (resto) {
      const o = { fam: col ? T.script : T.fb, peso: col ? 700 : 400, cx: false, tr: 0, lh: col ? 1.12 : 1.42 };
      const Wr = col ? 76 - 7.2 : W;
      rz = caber(resto, T, { ...o, W: Wr, H: alto * 0.3, max: corpo(resto, 4.3) * (col ? 1.15 : 1), min: 3.3 });
      const p = palavras(resto, o);
      restoH = nLinhas(p.pal, p.wp, p.esp, rz, Wr * 0.955) * rz * o.lh + (col ? 9 : 3);
      if (!isFinite(restoH) || alto - kkH - anoH - restoH - 4 < 22) { resto = ''; restoH = 0; }
    }
    const disp = !(E === 'tech' || E === 'minimal');
    const { attr } = ajuste(lead, T, { W: W * (E === 'luxo' ? 0.95 : 1) - (col ? 8 : 0), H: alto - kkH - anoH - restoH - 5 - (col ? 7 : 0), max: 7.6, min: 4.4, fam: disp ? T.fd : T.fb, peso: disp ? T.dw : 600, cx: false, tr: disp ? T.tr : -0.01, lh: 1.16 }, '--tz');
    return `<div class="car-cx car-cx-sobre">${kk(d.rot)}${d.ano ? `<div class="car-so-ano"><small>desde</small><b>${d.ano}</b></div>` : ''}<p class="car-so-l"${attr}>${esc(lead)}</p>${resto ? `<p class="car-tx car-so-r" style="--tz:${rz}">${esc(resto)}</p>` : ''}</div>`;
  },

  // o comum × o nosso jeito
  compara(R, d) {
    const { E } = R;
    return `<div class="car-cx car-cx-cmp" data-lay="${d.n}">${kk(d.rot)}<div class="car-cmp-c"><span class="car-cmp-l">O comum</span><p>${esc(d.comum)}</p>${icUI('mais', 'car-cmp-x', 2.2)}</div><div class="car-cmp-v"><span>×</span></div><div class="car-cmp-n"><span class="car-cmp-l">${esc(d.nosso)}</span>${titulo(R, d.texto, { W: E === 'colagem' ? 64 : 100 - 2 * ESTILOS[E].m - 10, H: E === 'colagem' ? 19 : 24, max: E === 'impacto' ? 9 : 7.6, min: 4.4, cls: 'car-tt-cmp' })}${icUI('check', 'car-cmp-ok', 2.4)}</div></div>`;
  },

  // antes × depois lado a lado
  ad(R, d) {
    const { ctx } = R;
    const [a, b] = ctx.pack.ad;
    return `<div class="car-cx car-cx-ad"><div class="car-ad-a"><span class="car-ad-l">Antes</span><p>${esc(a)}</p></div><div class="car-ad-d"><span class="car-ad-l">Depois</span><p>${esc(b)}</p></div><div class="car-ad-m">${seta('car-ad-s')}</div>${kk(d.rot, 'car-kk-ad')}</div>`;
  },

  // antes ou depois sozinho: rótulo gigante, a cena (apagada no antes, viva no depois) e a frase
  estado(R, d) {
    const { E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    return `<div class="car-cx car-cx-est car-est-${d.lado}"><div class="car-es-l">${d.lado === 'antes' ? 'Antes' : 'Depois'}</div><div class="car-fill car-es-fill"><div class="car-es-img">${ilustra(R, { sem: 'es' })}</div><span class="car-es-m">${icUI(d.lado === 'antes' ? 'mais' : 'check', '', 2.4)}</span></div>${titulo(R, d.texto, { W: E === 'colagem' ? 72 : W, H: 22, max: E === 'impacto' ? 10.5 : 8.5, cls: 'car-tt-es' })}</div>`;
  },

  // horário e endereço (mapa estilizado)
  local(R, d) {
    const { ctx } = R;
    const R0 = rnd(ctx.handle + 'mapa');
    const ruas = Array.from({ length: 5 }, (_, j) => `<path d="M${-10 + R0() * 20} ${14 + j * 20 + R0() * 6}L110 ${8 + j * 21 + R0() * 8}"/>`).join('') + Array.from({ length: 4 }, (_, j) => `<path d="M${16 + j * 24 + R0() * 6} -10L${10 + j * 26 + R0() * 8} 110"/>`).join('');
    return `<div class="car-cx car-cx-local">${kk(d.rot)}<div class="car-mapa"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="car-mapa-r">${ruas}</g><path class="car-mapa-v" d="M-5 70C20 60 40 78 60 62s30-10 50-20"/></svg><span class="car-mapa-p">${icUI('pin', '', 2)}</span></div><div class="car-lc"><p>${icUI('relogio', '', 2)}<span>${esc(ctx.pack.horario)}</span></p><p>${icUI('pin', '', 2)}<span>${esc(ctx.endereco)}</span></p></div></div>`;
  },

  // "salve este post"
  salve(R, d) {
    const { ctx } = R;
    return `<div class="car-cx car-cx-salve"><div class="car-sv-ic">${icUI('salvar', '', 1.6)}</div>${titulo(R, 'Salve este post', { H: 24, max: 12, cls: 'car-tt-sv' })}<p class="car-sv-t">${esc(d.lembrete || ctx.pack.dica[0])}</p><div class="car-sv-ui"><span>${icUI('coracao', '', 2)}</span><span>${icUI('comentario', '', 2)}</span><span>${icUI('enviar', '', 2)}</span><span class="on">${icUI('salvar', '', 2)}</span></div></div>`;
  },

  // parte de uma dica: número no espaço livre, título (na 1ª) e o texto
  parte(R, d) {
    const { E } = R;
    const S = ESTILOS[E], W = 100 - 2 * S.m;
    const { attr } = ajuste(d.texto, R.T, { W: E === 'colagem' ? 68 : W, H: d.titulo ? 26 : 36, max: 7.4, min: 4.3, fam: R.T.fb, peso: 600, cx: false, tr: -0.005, lh: 1.3 }, '--tz');
    return `<div class="car-cx car-cx-parte" data-lay="${d.n}"><div class="car-fill car-pt-fill"><b class="car-fn">${d.n}<i>/${d.de}</i></b></div>${kk(d.rot)}${d.titulo ? titulo(R, d.titulo, { W, H: 16, max: 8.6, cls: 'car-tt-pt' }) : ''}<p class="car-pt-t"${attr}>${esc(d.texto)}</p></div>`;
  },

};

// ------------------------------------------------------------------ roteiro de cada formato (6 lâminas)
export function roteiro(ctx, P) {
  const pk = ctx.pack;
  const angs = angsDoPost(ctx, P);
  const A = (j) => angs[j % angs.length];
  const capaD = { tipo: 'capa', rot: 'Capa' };
  const ctaD = { tipo: 'cta', rot: 'Chamada' };
  const angFr = (j, n, lay, v) => ({ tipo: 'frase', rot: ANG[A(j)][0], texto: cap(pk.ang[A(j)]), ic: ANG[A(j)][1], n, lay, v });
  switch (P.fmt) {
    case 'manifesto':
      return [capaD, angFr(0, 1, 1), angFr(1, 2, 2, 'b'), angFr(2, 3, 3), angFr(3, 4, 4, 'b'), ctaD];
    case 'motivos':
      return [capaD, ...[0, 1, 2].map((j) => ({ tipo: 'motivo', rot: ANG[A(j)][0], texto: cap(pk.ang[A(j)]), ic: ANG[A(j)][1], n: j + 1 })), { tipo: 'numeros', rot: 'A prova', v: 'b', gg: pk.nums[0][0] }, ctaD];
    case 'apresentacao':
      return [capaD, { tipo: 'sobre', rot: 'Quem somos', texto: ctx.site && ctx.site.sobreLib ? ctx.site.sobreLib : pk.sobre }, { tipo: 'lista', rot: 'O que fazemos', titulo: pk.itensTitulo }, { tipo: 'passos', rot: 'Como funciona' }, { tipo: 'numeros', rot: 'Em números', v: 'b', gg: pk.nums[0][0] }, ctaD];
    case 'historia':
      return [capaD, { tipo: 'sobre', rot: 'Como começou', ano: ctx.ano, texto: ctx.site && ctx.site.sobreLib ? ctx.site.sobreLib : pk.sobre, gg: String(ctx.ano) }, { tipo: 'bastidor', rot: 'Bastidores', v: 'b' }, { tipo: 'equipe', rot: 'A equipe', titulo: 'Quem faz acontecer' }, { tipo: 'numeros', rot: 'Hoje', v: 'b', gg: 'Hoje' }, ctaD];
    case 'vitrine': {
      const ord = [P.item, ...ctx.itens.filter((x) => x.i !== P.item.i)].slice(0, 4);
      return [capaD, ...ord.map((it, j) => ({ tipo: 'produto', rot: `${pk.itensTitulo} · ${dd(j + 1)}/${dd(ord.length)}`, item: it, j, selo: j === 0 && P.itemPapel ? P.itemPapel.rotulo : '' })), { ...ctaD, v: 'b' }];
    }
    case 'oferta':
      return [capaD, { tipo: 'cupom', rot: 'O que você ganha' }, { tipo: 'passos', rot: 'Em 3 passos', titulo: 'Como aproveitar' }, { tipo: 'lista', rot: 'Escolha o seu', titulo: pk.itensTitulo }, { tipo: 'prazo', rot: 'Prazo', v: 'b' }, ctaD];
    case 'passo_a_passo': {
      const ics = [icId(ctx.icone.id, '', 1.6), icUI(CANAL_IC[ctx.canal && ctx.canal.id] || 'whats', '', 1.8), icUI('check', '', 2)];
      return [capaD, ...pk.passos.slice(0, 3).map(([t, x], j) => ({ tipo: 'passo', rot: `Passo ${j + 1}`, titulo: t, texto: x, n: j + 1, icHTML: ics[j] })), { tipo: 'qa', rot: 'Dúvida rápida', qa: pk.faq[0], v: 'b', n: 0 }, ctaD];
    }
    case 'comparativo':
      return [capaD, { tipo: 'ad', rot: 'Antes × depois' }, ...[0, 1, 2].map((j) => ({ tipo: 'compara', rot: ANG[A(j)][0], comum: ANG[A(j)][2], nosso: `O jeito ${ctx.nome}`, texto: cap(pk.ang[A(j)]), n: j + 1 })), ctaD];
    case 'perguntas':
      return [capaD, ...pk.faq.slice(0, 3).map((qa, j) => ({ tipo: 'qa', rot: `Pergunta ${j + 1}`, qa, n: j + 1 })), { tipo: 'local', rot: 'Onde e quando', v: 'b' }, ctaD];
    case 'depoimentos': {
      const [v, r] = notaDe(pk);
      return [capaD, ...pk.depo.slice(0, 3).map((dp, j) => ({ tipo: 'depo', rot: 'Depoimento', depo: dp, n: j + 1, v: j === 1 ? 'b' : 'a' })), { tipo: 'numeros', rot: 'Nota', v: 'b', nums: [[v, r], ...pk.nums.filter((x) => x[0] !== v)].slice(0, 3), gg: v.replace('★', '').trim() }, ctaD];
    }
    case 'bastidores':
      return [capaD, { tipo: 'bastidor', rot: 'Um dia aqui' }, { tipo: 'passos', rot: 'Bastidores', titulo: 'O processo' }, { tipo: 'equipe', rot: 'A equipe', titulo: 'Quem faz acontecer' }, { tipo: 'frase', rot: 'O detalhe', texto: cap(pk.ang[P.ang] || P.angTxt), ic: (ANG[P.ang] || ANG.qualidade)[1], v: 'b', lay: 2 }, ctaD];
    case 'antes_depois':
      return [capaD, { tipo: 'estado', rot: 'Antes', lado: 'antes', texto: pk.ad[0], v: 'c' }, { tipo: 'estado', rot: 'Depois', lado: 'depois', texto: pk.ad[1], v: 'b' }, { tipo: 'frase', rot: 'Resultado', texto: cap(pk.ang.resultado || P.angTxt), ic: 'alvo', lay: 1 }, { tipo: 'depo', rot: 'Depoimento', depo: pk.depo[0], n: 1 }, ctaD];
    case 'dica': {
      const [p1, p2] = partes(pk.dica[1], 2);
      return [capaD, { tipo: 'parte', rot: 'A dica', titulo: pk.dica[0], texto: p1, n: 1, de: 2 }, { tipo: 'parte', rot: 'Na prática', texto: p2 || p1, n: 2, de: 2 }, { tipo: 'frase', rot: 'Por que funciona', texto: cap(pk.ang[P.ang] || P.angTxt), ic: (ANG[P.ang] || ANG.qualidade)[1], v: 'b', lay: 2, nota: `${pk.nums[0][0]} ${pk.nums[0][1]}` }, { tipo: 'salve', rot: 'Salve', lembrete: pk.dica[0] }, ctaD];
    }
    default:
      return [capaD, { tipo: 'sobre', rot: 'Quem somos', texto: pk.sobre }, { tipo: 'lista', rot: 'O que fazemos' }, { tipo: 'passos', rot: 'Como funciona' }, { tipo: 'numeros', rot: 'Em números', v: 'b' }, ctaD];
  }
}

// pôster: um caractere gigante vazado ao fundo de cada lâmina (vem do conteúdo dela)
const GG = {
  frase: () => '',
  lista: () => 'R$',
  passos: () => '123',
  qa: () => '?',
  depo: () => '“',
  equipe: (ctx) => String(ctx.pack.equipe.length),
  bastidor: (ctx) => (horaDe(ctx.pack.bastidor)[0] || '').replace(/^.*?(\d{1,2}h\d{0,2}).*$/, '$1'),
  sobre: () => 'Nós',
  compara: () => '×',
  cupom: (ctx) => (ctx.oferta && /%/.test(ctx.oferta.curta) ? '%' : '+'),
  prazo: () => '!',
  salve: () => '',
  parte: () => '',
  local: () => '',
  cta: () => '→',
};

// ------------------------------------------------------------------ a lâmina
// op.pref: prefixo dos ids de SVG (painel e ampliado não podem colidir). op.cache: {E, T, cores, plano} por carrossel.
export function preparar(ctx, i) {
  const P = ctx.posts[i];
  const E = (ctx.carEstilo && ctx.carEstilo.id) || 'editorial';
  const T = tipografia(ctx, E);
  const cores = esquemas(ctx, P, E);
  const plano = roteiro(ctx, P);
  return { P, E, T, cores, plano };
}
export function lamina(ctx, i, k, op = {}) {
  const prep = op.prep || preparar(ctx, i);
  const { P, E, T, cores, plano } = prep;
  const d = plano[k] || plano[0];
  let V = d.v === 'b' ? cores.B : cores.A;
  if (k === 0 && cores.capa) V = cores.capa;
  if (d.v === 'c') { // "antes": o mesmo fundo, dessaturado
    const cinza = V.esc ? '#26272b' : '#e4e3df';
    V = variante(ctx, [cinza], null, [V.esc ? '#f2f2f2' : '#1e1e1e']);
  }
  const R = { ctx, P, i, k, E, T, V, pref: `c${op.pref || 'p'}${i}`, d };
  if (E === 'impacto' && d.gg === undefined) d.gg = GG[d.tipo] ? GG[d.tipo](ctx, P, d) : '';
  const html = (TIPOS[d.tipo] || TIPOS.frase)(R, d);
  const cls = `car-lam car-e-${E} car-bg-${P.bg} car-f-${P.fmt} car-t-${d.tipo} car-v-${d.v || 'a'} car-k${k}${V.esc ? ' car-esc' : ''}${V.padrao ? ' car-pd' : ''}${V.cena ? ' car-cn' : ''}`;
  // cor do texto pedida: conferida contra o fundo DESTA lâmina (--ajt títulos, --ajx textos)
  const aj = ajustesPosts(ctx);
  let corAj = '';
  if (aj && aj.cor_texto) {
    const bgs = V.bgs || [V.b];
    const t = valorPara(aj, 'cor_texto', 'titulos'), x = valorPara(aj, 'cor_texto', 'textos');
    corAj = `;--ajt:${t ? corTextoPara(t, bgs, 3.2) : V.i};--ajx:${x ? corTextoPara(x, bgs, 4.5) : V.s}`;
  }
  return `<div class="${cls}" data-k="${k}" style="${esc(fontesVar(T) + ';' + estiloVar(V) + corAj)}"><div class="car-fx">${fundoFx(R, d)}</div><div class="car-orn">${mobilia(R, d)}</div>${html}${rodape(R)}</div>`;
}

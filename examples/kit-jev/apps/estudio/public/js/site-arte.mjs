// Cenas ilustradas do SITE: o "ensaio fotográfico" desenhado de cada negócio (sem fotos).
// Produto em pedestal, fachada com o nome no letreiro, interior, bancada vista de cima, detalhe em close, vitrine,
// retratos da equipe, mapa e rota. Tudo sai das decisões do Jev: o ESTILO de ilustração (ctx.site.img) vira um
// "pintor" (preenchimento, traço, ornamentos), a PALETA dá as cores e o ÍCONE da marca é o produto em cena.
// SVG puro, sem imagens externas: vai junto no HTML baixado. Detalhes aleatórios usam semente estável.
import { rgba, mix, rnd, esc } from './util.mjs';

const n = (v) => Math.round(v * 10) / 10;
const n3 = (v) => Math.round(v * 1000) / 1000;
const ESTRELA4 = (x, y, r) => `M${n(x)} ${n(y - r)}C${n(x + r * 0.16)} ${n(y - r * 0.16)} ${n(x + r * 0.16)} ${n(y - r * 0.16)} ${n(x + r)} ${n(y)}C${n(x + r * 0.16)} ${n(y + r * 0.16)} ${n(x + r * 0.16)} ${n(y + r * 0.16)} ${n(x)} ${n(y + r)}C${n(x - r * 0.16)} ${n(y + r * 0.16)} ${n(x - r * 0.16)} ${n(y + r * 0.16)} ${n(x - r)} ${n(y)}C${n(x - r * 0.16)} ${n(y - r * 0.16)} ${n(x - r * 0.16)} ${n(y - r * 0.16)} ${n(x)} ${n(y - r)}z`;
const CORACAO = '<path d="M12 20.3s-8-4.7-8-10.5A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.4c0 5.8-8 10.5-8 10.5z"/>';

function blob(cx, cy, r, R, pts = 7, irreg = 0.24) {
  const P = [];
  for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2, rr = r * (1 - irreg / 2 + R() * irreg); P.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  let d = '';
  for (let i = 0; i < pts; i++) {
    const p0 = P[(i - 1 + pts) % pts], p1 = P[i], p2 = P[(i + 1) % pts], p3 = P[(i + 2) % pts];
    if (!i) d += `M${n(p1[0])} ${n(p1[1])}`;
    d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + 'z';
}

// ------------------------------------------------------------------ tons derivados da paleta
function tons(c) {
  const d = c.dark;
  return {
    ceu: d ? mix(c.bg, c.pri, 0.18) : mix(c.bg, c.sec, 0.26),
    ceu2: d ? mix(c.bg, c.sec, 0.12) : mix(c.bg, c.pri, 0.12),
    parede: d ? mix(c.surf, c.ink, 0.05) : c.surf,
    parede2: d ? mix(c.surf, c.pri, 0.14) : mix(c.surf, c.pri, 0.12),
    chao: d ? mix(c.bg, '#000000', 0.3) : mix(c.surf, c.ink, 0.12),
    madeira: d ? mix(c.sec, c.bg, 0.5) : mix(c.sec, c.ink, 0.2),
    mesa: d ? mix(c.surf, c.sec, 0.16) : mix(c.bg, c.sec, 0.42),
    claro: d ? mix(c.surf, c.ink, 0.17) : mix(c.bg, '#ffffff', 0.7),
    escuro: d ? mix(c.bg, '#000000', 0.5) : mix(c.ink, c.pri, 0.22),
    vidro: d ? mix(c.surf, c.sec, 0.3) : mix(c.bg, c.sec, 0.4),
    folha: d ? mix(mix(c.sec, '#4c7a47', 0.6), c.bg, 0.25) : mix(c.sec, '#4c7a47', 0.62),
    pri: c.pri, sec: c.sec, acc: c.acc, ink: c.ink,
    sombra: d ? 'rgba(0,0,0,.42)' : rgba(c.ink, 0.13),
  };
}
const SOBRE = { pri: 'onPri', sec: 'onSec', acc: 'onAcc' };

// ------------------------------------------------------------------ o pintor: estilo de ilustração → atributos SVG
export function pintor(ctx, id, estilo = ctx.site.img) {
  const c = ctx.marca.cores, k = tons(c), L = estilo === 'linha';
  const defs = new Map();
  const def = (chave, svg) => { if (!defs.has(chave)) defs.set(chave, svg); return `url(#${chave})`; };
  const traco = rgba(c.ink, c.dark ? 0.72 : 0.8);
  const contorno = c.dark ? mix(c.bg, '#000000', 0.55) : c.ink;
  const cor = (papel) => {
    const base = k[papel] || papel;
    if (estilo !== 'vidro' || !k[papel] || papel === 'sombra') return base;
    return def(`vd${papel}${id}`, `<linearGradient id="vd${papel}${id}" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="${mix(base, '#ffffff', 0.42)}"/><stop offset="1" stop-color="${base}"/></linearGradient>`);
  };
  // superfície: preenchimento + traço conforme o estilo
  const sup = (papel, extra = '') => {
    if (L) {
      const tinta = ['pri', 'acc', 'sec'].includes(papel);
      const fill = papel === 'ceu' || papel === 'ceu2' ? mix(c.bg, c.pri, c.dark ? 0.1 : 0.05) : tinta ? mix(c.bg, k[papel], c.dark ? 0.24 : 0.14) : c.bg;
      return `fill="${fill}" stroke="${papel === 'pri' || papel === 'acc' ? c.priTxt : traco}" stroke-width="1.3" stroke-linejoin="round"${extra}`;
    }
    const f = cor(papel);
    if (estilo === 'retro' && !['ceu', 'ceu2', 'sombra'].includes(papel)) return `fill="${f}" stroke="${contorno}" stroke-width="2" stroke-linejoin="round"${extra}`;
    return `fill="${f}"${extra}`;
  };
  // traço decorativo (linhas de detalhe)
  const fio = (op = 0.18, w = 1.2) => `fill="none" stroke="${rgba(c.ink, L ? Math.min(0.8, op * 3) : op)}" stroke-width="${w}" stroke-linecap="round"`;
  const tintaDe = (papel) => (SOBRE[papel] ? c[SOBRE[papel]] : c.priTxt);

  // o PRODUTO em cena: o ícone da marca como objeto (silhueta cheia + detalhes), no jeito do estilo
  function obj(icone, x, y, tam, { papel = 'pri', rot = 0, sombra = true, cls = '', tinta } = {}) {
    const s = tam / 24, x0 = x - tam / 2, y0 = y - tam / 2, base = k[papel] || papel;
    const td = tinta || tintaDe(papel);
    const g = (attrs, dx = 0, dy = 0) => `<g transform="translate(${n(x0 + dx * s)} ${n(y0 + dy * s)}) scale(${n3(s)})" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${icone.svg}</g>`;
    let o = '';
    if (L) {
      o = g(`fill="${rgba(base, c.dark ? 0.18 : 0.1)}" stroke="${c.ink}" stroke-width="${n3(Math.max(0.5, 2.3 / s))}"`)
        + g(`fill="none" stroke="${c.priTxt}" stroke-width="${n3(Math.max(0.4, 1.4 / s))}" opacity=".7"`, 0.55, 0.55);
    } else if (estilo === 'adesivo') {
      o = g('fill="rgba(0,0,0,.18)" stroke="rgba(0,0,0,.18)" stroke-width="4.4"', 0.6, 0.9) + g('fill="#ffffff" stroke="#ffffff" stroke-width="4.4"')
        + g(`fill="${base}" stroke="${base}" stroke-width="1.6"`) + g(`fill="none" stroke="${td}" stroke-width="1.3"`);
    } else if (estilo === 'vidro') {
      o = g(`fill="${cor(papel)}" stroke="rgba(255,255,255,.75)" stroke-width="1.1"`) + g('fill="none" stroke="#ffffff" stroke-width="1.25"')
        + g('fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".6"', -0.35, -0.35);
    } else if (estilo === 'retro') {
      o = (sombra ? g(`fill="${rgba(contorno, 0.85)}" stroke="${rgba(contorno, 0.85)}" stroke-width="1.6"`, 0.9, 0.9) : '')
        + g(`fill="${base}" stroke="${contorno}" stroke-width="2.6"`) + g(`fill="${base}" stroke="${base}" stroke-width="1.1"`) + g(`fill="none" stroke="${td}" stroke-width="1.15"`);
    } else if (estilo === 'geometrico') {
      o = (sombra ? g(`fill="${c.dark ? '#000000' : c.ink}" stroke="${c.dark ? '#000000' : c.ink}" stroke-width="1.6" opacity=".9"`, 1.1, 1.1) : '')
        + g(`fill="${base}" stroke="${base}" stroke-width="1.6"`) + g(`fill="none" stroke="${td}" stroke-width="1.3"`);
    } else {
      o = (sombra ? g(`fill="${k.sombra}" stroke="${k.sombra}" stroke-width="1.6"`, 0.7, 1) : '')
        + g(`fill="${base}" stroke="${base}" stroke-width="1.6"`) + g(`fill="none" stroke="${td}" stroke-width="1.3"`);
    }
    const girado = rot ? `<g transform="rotate(${rot} ${n(x)} ${n(y)})">${o}</g>` : o;
    return cls ? `<g class="${cls}">${girado}</g>` : girado;
  }
  // ícone solto (traço simples)
  const ic = (icone, x, y, tam, corT, px = 2) => { const s = tam / 24; return `<g transform="translate(${n(x - tam / 2)} ${n(y - tam / 2)}) scale(${n3(s)})" fill="none" stroke="${corT}" stroke-width="${n3(px / s)}" stroke-linecap="round" stroke-linejoin="round">${icone.svg}</g>`; };
  // medalha: disco + ícone (apoios em órbita)
  const medalha = (icone, x, y, r, papel = 'acc') => {
    const fundo = L ? c.bg : cor(papel), tinta = L ? c.priTxt : tintaDe(papel);
    const borda = L ? ` stroke="${traco}" stroke-width="1.2"` : estilo === 'adesivo' ? ' stroke="#ffffff" stroke-width="5"' : estilo === 'retro' ? ` stroke="${contorno}" stroke-width="2"` : estilo === 'vidro' ? ' stroke="rgba(255,255,255,.7)" stroke-width="1.2"' : '';
    const sombra = estilo === 'adesivo' ? `<circle cx="${n(x + 2)}" cy="${n(y + 3)}" r="${n(r + 2.5)}" fill="rgba(0,0,0,.16)"/>` : estilo === 'geometrico' ? `<circle cx="${n(x + 4)}" cy="${n(y + 4)}" r="${n(r)}" fill="${c.dark ? '#000' : c.ink}"/>` : '';
    return `${sombra}<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fundo}"${borda}/>${ic(icone, x, y, r * 1.08, tinta, Math.max(1.4, r * 0.075))}`;
  };
  const brilho = (x, y, r, corB = c.priTxt, op = 1) => `<path d="${ESTRELA4(x, y, r)}" fill="${corB}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
  const retic = (corR = c.ink, op = 0.22, passo = 8, raio = 1.6) => def(`ht${id}${passo}`, `<pattern id="ht${id}${passo}" width="${passo}" height="${passo}" patternUnits="userSpaceOnUse"><circle cx="${passo / 2}" cy="${passo / 2}" r="${raio}" fill="${rgba(corR, op)}"/></pattern>`);
  const desfoque = (sd) => def(`bl${id}${sd}`, `<filter id="bl${id}${sd}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${sd}"/></filter>`);
  const brilhoRadial = (corB, op = 0.55) => def(`rg${id}${corB.replace(/[^a-z0-9]/gi, '')}`, `<radialGradient id="rg${id}${corB.replace(/[^a-z0-9]/gi, '')}"><stop offset="0" stop-color="${corB}" stop-opacity="${op}"/><stop offset="1" stop-color="${corB}" stop-opacity="0"/></radialGradient>`);
  const svgDefs = () => (defs.size ? `<defs>${[...defs.values()].join('')}</defs>` : '');
  return { c, k, id, estilo, L, sup, cor, fio, obj, ic, medalha, brilho, retic, desfoque, brilhoRadial, def, defs: svgDefs, traco, contorno, tintaDe };
}

// ------------------------------------------------------------------ fundos e ornamentos por estilo
// fundo de "estúdio fotográfico": papel de fundo + chão, com a assinatura do estilo
function fundoEstudio(P, W, H, R, { chao = 0.8, cx = W / 2, cy = H * 0.44 } = {}) {
  const { c, k, estilo } = P, m = Math.min(W, H);
  let s = `<rect width="${W}" height="${H}" ${P.sup('ceu')} stroke="none"/>`;
  const piso = `<rect y="${n(H * chao)}" width="${W}" height="${n(H * (1 - chao))}" fill="${P.L ? 'none' : estilo === 'vidro' ? rgba('#ffffff', c.dark ? 0.04 : 0.25) : rgba(c.dark ? '#000000' : c.ink, c.dark ? 0.22 : 0.05)}"/>${P.L ? `<path d="M0 ${n(H * chao)}H${W}" ${P.fio(0.22, 1)}/>` : ''}`;
  switch (estilo) {
    case 'linha':
      s = `<rect width="${W}" height="${H}" fill="${mix(c.bg, c.pri, c.dark ? 0.07 : 0.035)}"/>`;
      s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(m * 0.4)}" ${P.fio(0.16, 1)}/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(m * 0.32)}" ${P.fio(0.1, 1)}/>`;
      s += `<path d="M${n(cx - m * 0.4)} ${n(cy)}A${n(m * 0.4)} ${n(m * 0.4)} 0 0 1 ${n(cx)} ${n(cy - m * 0.4)}" fill="none" stroke="${c.priTxt}" stroke-width="2" stroke-linecap="round"/>`;
      for (let i = 0; i < 5; i++) s += `<path d="M${n(W * (0.1 + R() * 0.8))} ${n(H * (0.08 + R() * 0.5))}m-4 0h8m-4-4v8" ${P.fio(0.3, 1)}/>`;
      return s + piso;
    case 'vidro': {
      const bl = P.desfoque(n(m * 0.08));
      s = `<rect width="${W}" height="${H}" fill="${P.def(`vf${P.id}`, `<linearGradient id="vf${P.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${k.ceu}"/><stop offset="1" stop-color="${k.ceu2}"/></linearGradient>`)}"/>`;
      s += `<g filter="${bl}" opacity="${c.dark ? 0.85 : 0.75}"><circle cx="${n(cx - m * 0.24)}" cy="${n(cy - m * 0.1)}" r="${n(m * 0.26)}" fill="${c.pri}"/><circle cx="${n(cx + m * 0.26)}" cy="${n(cy + m * 0.12)}" r="${n(m * 0.22)}" fill="${c.sec}"/><circle cx="${n(cx + m * 0.2)}" cy="${n(cy - m * 0.3)}" r="${n(m * 0.12)}" fill="${c.acc}"/></g>`;
      s += `<rect x="${n(cx - m * 0.3)}" y="${n(cy - m * 0.34)}" width="${n(m * 0.6)}" height="${n(m * 0.62)}" rx="${n(m * 0.06)}" fill="rgba(255,255,255,${c.dark ? 0.07 : 0.22})" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>`;
      return s + piso;
    }
    case 'geometrico':
      s += `<path d="M0 ${n(H * chao)}V${n(H * chao - m * 0.46)}A${n(m * 0.46)} ${n(m * 0.46)} 0 0 1 ${n(m * 0.46)} ${n(H * chao)}z" ${P.sup('sec')}/>`;
      s += `<rect x="${n(W - m * 0.3)}" y="0" width="${n(m * 0.3)}" height="${n(m * 0.3)}" ${P.sup('pri')}/>`;
      s += `<circle cx="${n(W - m * 0.3)}" cy="${n(m * 0.3)}" r="${n(m * 0.09)}" ${P.sup('acc')}/>`;
      s += `<g ${P.fio(0.35, 3)}>${[0, 1, 2, 3].map((i) => `<path d="M${n(m * 0.06)} ${n(m * (0.1 + i * 0.05))}h${n(m * 0.16)}"/>`).join('')}</g>`;
      return s + piso;
    case 'retro': {
      let raios = '';
      for (let i = 0; i < 32; i += 2) {
        const a1 = (i / 32) * Math.PI * 2, a2 = ((i + 1) / 32) * Math.PI * 2, r = m * 1.2;
        raios += `M${n(cx)} ${n(cy)}L${n(cx + r * Math.cos(a1))} ${n(cy + r * Math.sin(a1))}L${n(cx + r * Math.cos(a2))} ${n(cy + r * Math.sin(a2))}z`;
      }
      s += `<path d="${raios}" fill="${rgba(c.pri, c.dark ? 0.26 : 0.16)}"/>`;
      s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(m * 0.36)}" fill="${P.retic(c.ink, c.dark ? 0.3 : 0.2, 9, 1.8)}"/>`;
      return s + piso;
    }
    case 'organico':
      s += `<path d="${blob(cx + m * 0.08, cy, m * 0.38, R, 7, 0.3)}" fill="${rgba(c.sec, c.dark ? 0.35 : 0.5)}"/><path d="${blob(cx - m * 0.16, cy + m * 0.1, m * 0.24, R, 6, 0.32)}" fill="${rgba(c.acc, c.dark ? 0.3 : 0.4)}"/>`;
      s += folha(n(cx - m * 0.44), n(cy + m * 0.3), m / 280, -32, k.folha) + folha(n(cx + m * 0.34), n(cy - m * 0.3), m / 360, 38, mix(k.folha, c.pri, 0.3));
      return s + piso;
    case 'adesivo': {
      s += `<path d="M${n(W * 0.08)} ${n(H * 0.2)}c10-12 20 12 30 0s20 12 30 0" fill="none" stroke="${c.priTxt}" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M${n(W * 0.78)} ${n(H * 0.7)}c8 8 18 8 26 0" fill="none" stroke="${c.ink}" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>`;
      s += `<circle cx="${n(W * 0.86)}" cy="${n(H * 0.18)}" r="${n(m * 0.05)}" fill="none" stroke="${c.acc}" stroke-width="4" stroke-dasharray="2 7" stroke-linecap="round"/>`;
      s += P.brilho(W * 0.14, H * 0.62, 9, c.secTxt) + P.brilho(W * 0.9, H * 0.42, 7, c.priTxt);
      return s + piso;
    }
    default: { // flat: arco de estúdio atrás do produto
      const aw = m * 0.66, ax = cx - aw / 2, atopo = cy - m * 0.36, abase = H * chao;
      s += `<path d="M${n(ax)} ${n(abase)}V${n(atopo + aw / 2)}A${n(aw / 2)} ${n(aw / 2)} 0 0 1 ${n(ax + aw)} ${n(atopo + aw / 2)}V${n(abase)}z" ${P.sup('sec')}/>`;
      s += `<path d="M${n(ax + m * 0.05)} ${n(abase)}V${n(atopo + aw / 2)}A${n(aw / 2 - m * 0.05)} ${n(aw / 2 - m * 0.05)} 0 0 1 ${n(ax + aw - m * 0.05)} ${n(atopo + aw / 2)}V${n(abase)}" fill="none" stroke="${rgba(c.onSec, 0.35)}" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>`;
      s += `<circle cx="${n(cx - m * 0.33)}" cy="${n(cy - m * 0.27)}" r="${n(m * 0.07)}" ${P.sup('acc')}/>`;
      s += `<circle cx="${n(cx + m * 0.38)}" cy="${n(cy - m * 0.3)}" r="${n(m * 0.035)}" fill="none" stroke="${c.ink}" stroke-width="2" opacity=".45"/>`;
      s += `<path d="M${n(cx + m * 0.36)} ${n(cy + m * 0.2)}l${n(m * 0.05)} ${n(m * 0.09)}h-${n(m * 0.1)}z" ${P.sup('acc')}/>`;
      return s + piso;
    }
  }
}

function folha(x, y, e, rot, corF) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${n3(e)})"><path d="M0 0C10-26 38-34 60-30 52-8 30 10 0 0z" fill="${corF}"/><path d="M4-1C20-12 36-20 52-26" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.4"/></g>`;
}

// brilhos/ornamentos soltos por cima da cena
function ornamentos(P, W, H, R, qtd = 3) {
  const { c, estilo } = P;
  let s = '';
  for (let i = 0; i < qtd; i++) {
    const x = W * (0.08 + R() * 0.84), y = H * (0.08 + R() * 0.5), r = 4 + R() * 7;
    if (estilo === 'adesivo' && i === 0) s += `<g transform="translate(${n(x - 10)} ${n(y - 10)}) scale(.85)" fill="${c.acc}" stroke="#fff" stroke-width="2.4">${CORACAO}</g>`;
    else if (estilo === 'retro') s += `<path d="M${n(x)} ${n(y - r)}l${n(r * 0.3)} ${n(r * 0.7)} ${n(r * 0.75)} ${n(r * 0.08)}-${n(r * 0.56)} ${n(r * 0.5)} ${n(r * 0.18)} ${n(r * 0.75)}-${n(r * 0.67)}-${n(r * 0.4)}-${n(r * 0.67)} ${n(r * 0.4)} ${n(r * 0.18)}-${n(r * 0.75)}-${n(r * 0.56)}-${n(r * 0.5)} ${n(r * 0.75)}-${n(r * 0.08)}z" fill="${c.acc}"/>`;
    else if (estilo === 'organico') s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.45)}" fill="${rgba(c.pri, 0.45)}"/>`;
    else if (estilo === 'geometrico') s += i % 2 ? `<rect x="${n(x)}" y="${n(y)}" width="${n(r * 1.4)}" height="${n(r * 1.4)}" fill="${c.priTxt}" transform="rotate(45 ${n(x)} ${n(y)})"/>` : `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.6)}" fill="none" stroke="${c.ink}" stroke-width="2"/>`;
    else s += P.brilho(x, y, r, i % 2 ? c.priTxt : estilo === 'vidro' ? '#ffffff' : c.secTxt, estilo === 'vidro' ? 0.85 : 1);
  }
  return s;
}

// pedestal cilíndrico (ou prato, ou degraus)
function pedestal(P, x, y, rx, ry, h, papel = 'claro') {
  const { c, k, L } = P;
  const topo = L ? P.sup('claro') : `fill="${P.cor(papel)}"${P.estilo === 'retro' ? ` stroke="${P.contorno}" stroke-width="2"` : ''}`;
  const corpoCor = L ? P.sup('claro') : P.estilo === 'vidro' ? `fill="${P.cor(papel)}" opacity=".9"` : `fill="${mix(k[papel] || papel, c.dark ? '#000000' : c.ink, c.dark ? 0.22 : 0.1)}"${P.estilo === 'retro' ? ` stroke="${P.contorno}" stroke-width="2"` : ''}`;
  return `<ellipse cx="${n(x)}" cy="${n(y + h + ry * 0.4)}" rx="${n(rx * 1.18)}" ry="${n(ry * 0.9)}" fill="${k.sombra}"/>`
    + `<path d="M${n(x - rx)} ${n(y)}V${n(y + h)}A${n(rx)} ${n(ry)} 0 0 0 ${n(x + rx)} ${n(y + h)}V${n(y)}z" ${corpoCor}/>`
    + (P.estilo === 'retro' ? `<path d="M${n(x - rx)} ${n(y)}V${n(y + h)}A${n(rx)} ${n(ry)} 0 0 0 ${n(x + rx)} ${n(y + h)}V${n(y)}z" fill="${P.retic(c.ink, 0.28, 6, 1.1)}"/>` : '')
    + `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" ${topo}/>`
    + (L ? '' : `<path d="M${n(x - rx * 0.72)} ${n(y + ry * 0.35)}A${n(rx * 0.8)} ${n(ry * 0.7)} 0 0 0 ${n(x + rx * 0.2)} ${n(y + ry * 0.66)}" fill="none" stroke="rgba(255,255,255,${c.dark ? 0.12 : 0.55})" stroke-width="2" stroke-linecap="round"/>`);
}

// ------------------------------------------------------------------ CENAS
// PRODUTO: still de estúdio, o ícone da marca flutuando sobre um pedestal (ou prato, ou degraus)
function cenaProduto(P, ctx, { W = 400, H = 400, i = 0, estado = '', holofote = false }) {
  const { c, k } = P, R = rnd(ctx.segId + 'prod' + i + P.estilo);
  const antes = estado === 'antes', depois = estado === 'depois';
  const cx = W / 2, m = Math.min(W, H);
  let s = fundoEstudio(P, W, H, R, { chao: 0.78, cx, cy: H * 0.42 });
  if (depois) s += `<circle cx="${n(cx)}" cy="${n(H * 0.44)}" r="${n(m * 0.46)}" fill="${P.brilhoRadial(c.dark ? c.acc : P.L ? c.pri : '#ffffff', c.dark ? 0.35 : P.L ? 0.16 : 0.7)}"/>`;
  const forma = i % 3;
  const py = H * 0.7, rx = m * 0.27, ry = m * 0.055;
  if (forma === 1) { // prato raso sobre a mesa
    s += `<ellipse cx="${n(cx)}" cy="${n(py + ry * 1.1)}" rx="${n(rx * 1.3)}" ry="${n(ry * 1.25)}" fill="${k.sombra}"/>`;
    s += `<ellipse cx="${n(cx)}" cy="${n(py)}" rx="${n(rx * 1.22)}" ry="${n(ry * 1.3)}" ${P.sup('claro')}/><ellipse cx="${n(cx)}" cy="${n(py - 1)}" rx="${n(rx * 0.86)}" ry="${n(ry * 0.9)}" fill="none" stroke="${rgba(c.ink, 0.12)}" stroke-width="1.5"/>`;
  } else if (forma === 2) { // degraus
    s += pedestal(P, cx + rx * 0.55, py + m * 0.02, rx * 0.7, ry * 0.8, m * 0.1, 'parede2');
    s += pedestal(P, cx - rx * 0.2, py - m * 0.03, rx * 0.8, ry, m * 0.16, 'claro');
  } else s += pedestal(P, cx, py, rx, ry, m * 0.13, 'claro');
  const ox = forma === 2 ? cx - rx * 0.2 : cx, oy = (forma === 2 ? py - m * 0.03 : py) - m * 0.24;
  // holofote (topo cinematográfico): cone de luz de cima até o pedestal
  if (holofote) {
    const topo = forma === 2 ? py - m * 0.03 : py;
    s += `<path d="M${n(ox - m * 0.05)} 0H${n(ox + m * 0.05)}L${n(ox + rx * 1.15)} ${n(topo)}H${n(ox - rx * 1.15)}z" fill="${P.def(`hol${P.id}`, `<linearGradient id="hol${P.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".02"/><stop offset=".7" stop-color="#ffffff" stop-opacity=".13"/><stop offset="1" stop-color="#ffffff" stop-opacity=".2"/></linearGradient>`)}"/>`;
    s += `<ellipse cx="${n(ox)}" cy="${n(topo)}" rx="${n(rx * 0.95)}" ry="${n(ry * 0.9)}" fill="${P.brilhoRadial('#ffffff', 0.35)}"/>`;
  }
  // sombra de contato + objeto (flutua com CSS no site)
  s += `<ellipse class="sa-sombra" cx="${n(ox)}" cy="${n(forma === 2 ? py - m * 0.03 : py)}" rx="${n(rx * 0.5)}" ry="${n(ry * 0.5)}" fill="${rgba(c.dark ? '#000000' : c.ink, antes ? 0.1 : 0.22)}"/>`;
  s += P.obj(ctx.icone, ox, oy, m * 0.42, { cls: antes ? '' : 'sa-flutua', papel: antes ? 'parede2' : 'pri', sombra: !antes });
  if (antes) {
    // "antes": rabisco cinza, poeira e o produto torto
    s += `<path d="M${n(ox - m * 0.2)} ${n(H * 0.16)}c12-10 22 8 34-2s22 8 34-2 22 8 34-2" fill="none" stroke="${rgba(c.ink, 0.35)}" stroke-width="3" stroke-linecap="round"/>`;
    for (let j = 0; j < 9; j++) s += `<circle cx="${n(W * (0.15 + R() * 0.7))}" cy="${n(H * (0.25 + R() * 0.5))}" r="${n(1 + R() * 2)}" fill="${rgba(c.ink, 0.25)}"/>`;
    s += `<path d="M${n(ox + m * 0.18)} ${n(oy - m * 0.2)}l8 10-6 2 9 12M${n(ox - m * 0.26)} ${n(oy + m * 0.02)}l-9 6 5 3-8 7" fill="none" stroke="${rgba(c.ink, 0.3)}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<g fill="${rgba(c.ink, 0.12)}"><ellipse cx="${n(ox - m * 0.05)}" cy="${n(oy + m * 0.05)}" rx="${n(m * 0.05)}" ry="${n(m * 0.03)}"/><ellipse cx="${n(ox + m * 0.07)}" cy="${n(oy - m * 0.06)}" rx="${n(m * 0.03)}" ry="${n(m * 0.02)}"/></g>`;
  } else {
    const [a1, a2] = ctx.apoio;
    if (a1) s += P.medalha(a1, cx + m * 0.3, H * 0.22, m * 0.075, 'acc');
    if (a2) s += P.medalha(a2, cx - m * 0.33, H * 0.5, m * 0.06, 'sec');
    s += ornamentos(P, W, H, R, depois ? 6 : 3);
    if (depois) for (let j = 0; j < 10; j++) { const a = R() * Math.PI * 2, r = m * (0.3 + R() * 0.14); s += `<rect x="${n(ox + r * Math.cos(a))}" y="${n(oy + r * Math.sin(a) * 0.8)}" width="${n(3 + R() * 5)}" height="${n(2 + R() * 3)}" rx="1" fill="${[c.pri, c.acc, c.sec][j % 3]}" transform="rotate(${Math.round(R() * 180)} ${n(ox + r * Math.cos(a))} ${n(oy + r * Math.sin(a) * 0.8)})"/>`; }
  }
  return s;
}

// FACHADA: a loja vista da calçada, com o NOME no letreiro, toldo listrado e a vitrine
function cenaFachada(P, ctx, { W = 400, H = 300 }) {
  const { c, k, L } = P, R = rnd(ctx.segId + 'fach' + P.estilo), d = c.dark;
  let s = `<rect width="${W}" height="${H}" ${P.sup('ceu')} stroke="none"/>`;
  if (P.estilo === 'retro') s += `<rect width="${W}" height="${H}" fill="${P.retic(c.pri, d ? 0.35 : 0.22, 7, 1.3)}"/>`;
  // sol ou lua + nuvens/estrelas
  if (d) { s += `<circle cx="336" cy="52" r="20" ${L ? P.sup('claro') : `fill="${mix(c.ink, c.acc, 0.35)}"`}/><circle cx="345" cy="46" r="18" fill="${k.ceu}"/>`; for (let i = 0; i < 12; i++) s += `<circle cx="${n(20 + R() * 360)}" cy="${n(8 + R() * 54)}" r="${n(0.7 + R() * 1.3)}" fill="${rgba(c.ink, 0.6)}"/>`; }
  else {
    s += `<circle cx="336" cy="50" r="22" ${P.sup('acc')}/>`;
    const nuvem = (x, y, e) => `<g transform="translate(${x} ${y}) scale(${e})" ${L ? P.sup('claro') : `fill="${mix(c.bg, '#ffffff', 0.8)}"`}><path d="M0 18a10 10 0 0 1 12-12 15 15 0 0 1 28 2 10 10 0 0 1 8 18H4A8 8 0 0 1 0 18z"/></g>`;
    s += nuvem(40, 26, 1.1) + nuvem(214, 12, 0.8);
  }
  // prédio
  s += `<rect x="46" y="76" width="308" height="200" ${P.sup('parede')}/>`;
  if (!L) s += `<rect x="46" y="76" width="308" height="200" fill="${P.retic(c.ink, d ? 0.08 : 0.05, 5, 0.8)}"/>`;
  s += `<rect x="36" y="64" width="328" height="16" ${P.sup('escuro')}/><g ${P.sup('escuro')}>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => `<rect x="${44 + j * 29.6}" y="80" width="12" height="6"/>`).join('')}</g>`;
  // janelas de cima (a do meio com floreira)
  for (const [j, x] of [70, 176, 282].entries()) {
    s += `<rect x="${x - 4}" y="96" width="56" height="48" rx="${L ? 2 : 3}" ${P.sup('claro')}/><rect x="${x}" y="100" width="48" height="40" ${P.sup('vidro')}/>`;
    s += `<path d="M${x + 24} 100v40M${x} 120h48" stroke="${L ? P.traco : k.claro}" stroke-width="3"/>`;
    s += `<path d="M${x + 6} 106l12 -0M${x + 6} 106l18 18" stroke="rgba(255,255,255,${d ? 0.15 : 0.5})" stroke-width="2" stroke-linecap="round"/>`;
    if (j === 1) { s += `<rect x="${x - 6}" y="144" width="60" height="10" rx="2" ${P.sup('madeira')}/>`; for (let f = 0; f < 5; f++) s += `<circle cx="${x + 2 + f * 11}" cy="${142 - (f % 2) * 3}" r="4.5" fill="${[c.pri, c.acc, c.sec][f % 3]}"${L ? ` stroke="${P.traco}"` : ''}/>`; }
  }
  // letreiro com o nome
  const nome = String(ctx.nome);
  let linhas = [nome];
  if (nome.length > 20 && nome.includes(' ')) { // quebra no espaço mais perto do meio
    const meio = nome.length / 2, esp = [...nome.matchAll(/ /g)].map((m) => m.index).sort((a, b) => Math.abs(a - meio) - Math.abs(b - meio))[0];
    linhas = [nome.slice(0, esp), nome.slice(esp + 1)];
  }
  const maior = Math.max(...linhas.map((l) => l.length)), fs = Math.min(linhas.length > 1 ? 13 : 21, 184 / Math.max(6, maior * 0.56));
  const placa = d ? 'pri' : 'escuro', corNome = d ? c.onPri : k.claro;
  s += `<rect x="96" y="158" width="208" height="32" rx="${L ? 1 : 3}" ${P.sup(placa)}/>`;
  s += linhas.map((l, j) => `<text x="200" y="${linhas.length > 1 ? 168 + j * 14 : 175}" text-anchor="middle" dominant-baseline="central" style="font-family:var(--fl);font-weight:var(--lw)" font-size="${n(fs)}" letter-spacing="${n(fs * 0.04)}" fill="${L ? c.priTxt : corNome}">${esc(l)}</text>`).join('');
  s += `<circle cx="90" cy="174" r="3.5" fill="${c.acc}"/><circle cx="310" cy="174" r="3.5" fill="${c.acc}"/>`;
  // toldo listrado com borda de bandeirolas
  const tx0 = 54, tx1 = 346, ty = 196, th = 22, faixas = 12, fw = (tx1 - tx0) / faixas;
  const clipT = P.def(`ct${P.id}`, `<clipPath id="ct${P.id}"><path d="M${tx0 + 8} ${ty}H${tx1 - 8}L${tx1} ${ty + th}H${tx0}z"/></clipPath>`);
  s += `<path d="M${tx0 + 8} ${ty}H${tx1 - 8}L${tx1} ${ty + th}H${tx0}z" ${P.sup('claro')}/>`;
  s += `<g clip-path="${clipT}">${Array.from({ length: faixas }, (_, j) => (j % 2 ? '' : `<rect x="${n(tx0 + j * fw)}" y="${ty}" width="${n(fw)}" height="${th}" ${L ? `fill="${mix(c.bg, c.pri, 0.18)}"` : `fill="${P.cor('pri')}"`}/>`)).join('')}</g>`;
  s += Array.from({ length: faixas }, (_, j) => `<path d="M${n(tx0 + j * fw)} ${ty + th}a${n(fw / 2)} ${n(fw / 2)} 0 0 0 ${n(fw)} 0z" ${j % 2 ? P.sup('claro') : L ? `fill="${mix(c.bg, c.pri, 0.18)}" stroke="${P.traco}" stroke-width="1.3"` : `fill="${P.cor('pri')}"${P.estilo === 'retro' ? ` stroke="${P.contorno}" stroke-width="2"` : ''}`}/>`).join('');
  // vitrine com o produto
  s += `<rect x="64" y="226" width="156" height="50" ${P.sup('madeira')}/><rect x="70" y="230" width="144" height="42" ${P.sup('vidro')}/>`;
  s += `<ellipse cx="116" cy="266" rx="20" ry="4" fill="${k.sombra}"/>` + P.obj(ctx.icone, 116, 250, 30, { sombra: false });
  s += `<rect x="150" y="260" width="44" height="6" rx="2" ${P.sup('claro')}/>` + P.obj(ctx.apoio[0] || ctx.icone, 172, 248, 20, { papel: 'acc', sombra: false, rot: -10 });
  s += `<path d="M78 236l26 30M94 236l22 26" stroke="rgba(255,255,255,${d ? 0.12 : 0.45})" stroke-width="3" stroke-linecap="round"/>`;
  // porta, maçaneta, luminária e placa pendurada
  s += `<rect x="238" y="222" width="62" height="54" ${P.sup('madeira')}/><rect x="246" y="230" width="46" height="24" rx="2" ${P.sup('vidro')}/><circle cx="290" cy="262" r="2.6" fill="${c.acc}"/>`;
  s += `<path d="M318 230h14v4" fill="none" stroke="${L ? P.traco : k.escuro}" stroke-width="2.4"/><circle cx="331" cy="246" r="11" ${P.sup('acc')}/>` + P.ic(ctx.icone, 331, 246, 13, L ? c.priTxt : c.onAcc, 1.6);
  // vasos
  const vaso = (x, y, e) => `<path d="M${x - 10 * e} ${y}h${20 * e}l-${3 * e} ${16 * e}h-${14 * e}z" ${P.sup('pri')}/>` + [[-8, -12, -30], [0, -18, 0], [8, -12, 30]].map(([dx, dy, r]) => `<ellipse cx="${n(x + dx * e)}" cy="${n(y + dy * e)}" rx="${n(5 * e)}" ry="${n(12 * e)}" transform="rotate(${r} ${n(x + dx * e)} ${n(y + dy * e)})" ${L ? P.sup('claro') : `fill="${k.folha}"`}/>`).join('');
  s += vaso(228, 262, 0.8) + vaso(352, 262, 1);
  // calçada
  s += `<rect x="0" y="276" width="${W}" height="${H - 276}" ${P.sup('chao')}/><path d="M0 276H${W}" stroke="${rgba(c.ink, d ? 0.3 : 0.25)}" stroke-width="2"/>`;
  s += `<g ${P.fio(0.12, 1.5)}>${[40, 110, 180, 250, 320, 390].map((x) => `<path d="M${x} 280v20"/>`).join('')}</g>`;
  // poste com luz (à noite brilha)
  s += `<path d="M22 276V150" stroke="${L ? P.traco : k.escuro}" stroke-width="4"/><path d="M14 150h16l-3-12h-10z" ${P.sup('escuro')}/>`;
  if (d) s += `<circle cx="22" cy="150" r="30" fill="${P.brilhoRadial(c.acc, 0.5)}"/>`;
  return s;
}

// INTERIOR: o ambiente por dentro (janela em arco, pendentes, balcão, quadro com o símbolo)
function cenaInterior(P, ctx, { W = 400, H = 300 }) {
  const { c, k, L } = P, d = c.dark, R = rnd(ctx.segId + 'int' + P.estilo);
  let s = `<rect width="${W}" height="${H}" ${P.sup('parede')} stroke="none"/>`;
  if (P.estilo === 'geometrico') s += `<rect x="200" y="0" width="200" height="176" ${P.sup('parede2')}/>`;
  s += `<rect y="176" width="${W}" height="58" ${P.sup('parede2')}/><path d="M0 176H${W}" stroke="${L ? P.traco : k.claro}" stroke-width="4"/>`;
  s += `<g ${P.fio(d ? 0.14 : 0.1, 1.5)}>${[30, 70, 110, 150, 190, 230, 270, 310, 350, 390].map((x) => `<path d="M${x} 182v48"/>`).join('')}</g>`;
  // piso
  if (P.estilo === 'retro' || P.estilo === 'geometrico') {
    s += `<rect y="234" width="${W}" height="${H - 234}" ${P.sup('claro')}/>`;
    let q = '';
    for (let y = 0; y < 3; y++) for (let x = 0; x < 14; x++) if ((x + y) % 2) q += `M${x * 30} ${234 + y * 22}h30v22h-30z`;
    s += `<path d="${q}" fill="${k.escuro}" opacity=".85"/>`;
  } else {
    s += `<rect y="234" width="${W}" height="${H - 234}" ${P.sup('chao')}/>`;
    s += `<g ${P.fio(0.1, 1.2)}>${[0, 1, 2, 3].map((j) => `<path d="M0 ${246 + j * 16}H${W}"/>`).join('')}${[60, 150, 250, 330].map((x, j) => `<path d="M${x + (j % 2) * 30} ${234 + (j % 2) * 16}v16"/>`).join('')}</g>`;
  }
  // janela em arco com a vista de fora
  const clipJ = P.def(`cj${P.id}`, `<clipPath id="cj${P.id}"><path d="M34 176V96a50 50 0 0 1 100 0v80z"/></clipPath>`);
  s += `<g clip-path="${clipJ}"><rect x="30" y="40" width="110" height="140" fill="${L ? mix(c.bg, c.pri, 0.06) : k.ceu}"/>`;
  s += d ? `<circle cx="104" cy="82" r="11" fill="${mix(c.ink, c.acc, 0.3)}"/>` : `<circle cx="104" cy="84" r="13" ${P.sup('acc')}/>`;
  s += `<path d="M30 160c20-18 40-22 60-12s36-6 50-14v46H30z" ${L ? P.sup('claro') : `fill="${k.folha}" opacity=".85"`}/><path d="M30 170c24-10 52-10 110-2v14H30z" ${L ? P.sup('claro') : `fill="${mix(k.folha, '#000000', 0.2)}"`}/></g>`;
  s += `<path d="M34 176V96a50 50 0 0 1 100 0v80z" fill="none" stroke="${L ? P.traco : k.claro}" stroke-width="7"/><path d="M84 46v130M34 122h100" stroke="${L ? P.traco : k.claro}" stroke-width="3"/>`;
  s += `<rect x="28" y="174" width="112" height="8" rx="2" ${P.sup('claro')}/>`;
  // quadro com o símbolo
  s += `<rect x="168" y="54" width="62" height="74" ${P.sup('madeira')}/><rect x="175" y="61" width="48" height="60" ${P.sup('claro')}/>` + P.ic(ctx.icone, 199, 91, 32, c.priTxt, 1.8);
  // pendentes com cone de luz
  for (const [j, x] of [268, 344].entries()) {
    s += `<path d="M${x} 0V60" stroke="${rgba(c.ink, 0.5)}" stroke-width="1.5"/>`;
    if (!L) s += `<path d="M${x - 16} 84L${x - 64} 200H${x + 64}L${x + 16} 84z" fill="${rgba(d ? c.acc : '#ffffff', d ? 0.12 : 0.32)}"/>`;
    s += `<path d="M${x - 22} 84C${x - 22} 68 ${x - 12} 60 ${x} 60s${22} 8 ${22} 24z" ${P.sup(j ? 'acc' : 'pri')}/><ellipse cx="${x}" cy="86" rx="7" ry="3.5" fill="${d ? mix(c.acc, '#ffffff', 0.5) : '#fff7d6'}"/>`;
  }
  // balcão com o produto e potes
  s += `<rect x="214" y="180" width="180" height="56" ${P.sup('madeira')}/><g ${P.fio(0.16, 1.4)}>${[244, 274, 304, 334, 364].map((x) => `<path d="M${x} 186v44"/>`).join('')}</g>`;
  s += `<rect x="206" y="170" width="194" height="12" rx="2" ${P.sup('escuro')}/>`;
  s += `<ellipse cx="262" cy="168" rx="22" ry="4" ${P.sup('claro')}/><path d="M258 168v-8h8v8" ${P.sup('claro')}/><ellipse cx="262" cy="160" rx="26" ry="5" ${P.sup('claro')}/>`;
  s += P.obj(ctx.icone, 262, 134, 46, { sombra: false });
  s += `<rect x="304" y="142" width="30" height="28" rx="6" ${P.sup('vidro')} opacity="${L ? 1 : 0.9}"/><rect x="306" y="136" width="26" height="7" rx="2" ${P.sup('madeira')}/>` + P.ic(ctx.apoio[0] || ctx.icone, 319, 157, 16, L ? c.priTxt : c.ink, 1.5);
  s += `<path d="M356 170h20l-3-14h-14z" ${P.sup('pri')}/>` + [[-5, -6, -24], [0, -10, 0], [6, -6, 24]].map(([dx, dy, r]) => `<ellipse cx="${366 + dx}" cy="${154 + dy}" rx="4" ry="9" transform="rotate(${r} ${366 + dx} ${154 + dy})" ${L ? P.sup('claro') : `fill="${k.folha}"`}/>`).join('');
  // banquetas
  for (const x of [262, 338]) s += `<path d="M${x - 10} 250l-6 44M${x + 10} 250l6 44M${x - 12} 276h24" stroke="${L ? P.traco : k.escuro}" stroke-width="3" stroke-linecap="round"/><ellipse cx="${x}" cy="248" rx="20" ry="6" ${P.sup('pri')}/>`;
  // planta grande no chão
  s += `<path d="M150 236h40l-6 40h-28z" ${P.sup('claro')}/>`;
  for (let j = 0; j < 7; j++) { const a = -150 + j * 20 + R() * 8, l = 34 + R() * 26, x2 = 170 + Math.cos((a * Math.PI) / 180) * l, y2 = 236 + Math.sin((a * Math.PI) / 180) * l; s += `<path d="M170 236Q${n((170 + x2) / 2 - 6)} ${n((236 + y2) / 2 - 8)} ${n(x2)} ${n(y2)}" fill="none" stroke="${L ? P.traco : k.folha}" stroke-width="${L ? 1.3 : 9}" stroke-linecap="round"/>`; }
  return s;
}

// BANCADA (bastidores): vista de cima, caderno, caneca, o produto e os ícones de apoio espalhados
function cenaBancada(P, ctx, { W = 400, H = 300 }) {
  const { c, k, L } = P, R = rnd(ctx.segId + 'banc' + P.estilo);
  let s = `<rect width="${W}" height="${H}" ${L ? `fill="${mix(c.bg, c.sec, 0.08)}"` : P.sup('mesa')} stroke="none"/>`;
  s += `<g ${P.fio(c.dark ? 0.08 : 0.07, 1.4)}>${[30, 78, 132, 190, 246, 290].map((y) => `<path d="M0 ${y}c80 ${n(R() * 10 - 5)} 160 ${n(R() * 10 - 5)} 240 0s120 ${n(R() * 8)} 160 0"/>`).join('')}</g>`;
  if (P.estilo === 'geometrico') s += `<rect x="0" y="0" width="140" height="${H}" ${P.sup('parede2')}/>`;
  // caderno + lápis
  s += `<g transform="rotate(-9 110 150)"><rect x="54" y="72" width="118" height="152" rx="4" fill="${k.sombra}" transform="translate(4 6)"/><rect x="54" y="72" width="118" height="152" rx="4" ${P.sup('claro')}/>`;
  s += `<g ${P.fio(0.12, 1.2)}>${[0, 1, 2, 3, 4, 5, 6, 7].map((j) => `<path d="M68 ${104 + j * 14}h92"/>`).join('')}</g>`;
  s += `<g fill="${rgba(c.ink, 0.35)}">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => `<circle cx="60" cy="${82 + j * 16}" r="2"/>`).join('')}</g>`;
  s += P.ic(ctx.icone, 112, 150, 54, c.priTxt, 1.6) + `<path d="M76 208c12-6 22 6 34 0s22 6 34 0" fill="none" stroke="${c.priTxt}" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>`;
  s += `<g transform="rotate(28 196 176)"><rect x="150" y="170" width="86" height="11" rx="2" ${P.sup('acc')}/><path d="M236 170l14 5.5-14 5.5z" ${P.sup('claro')}/><rect x="146" y="170" width="8" height="11" rx="2" ${P.sup('pri')}/></g>`;
  // caneca vista de cima
  s += `<circle cx="304" cy="84" r="40" fill="${k.sombra}" transform="translate(4 6)"/><rect x="336" y="76" width="26" height="16" rx="8" ${P.sup('claro')}/><circle cx="304" cy="84" r="38" ${P.sup('claro')}/><circle cx="304" cy="84" r="29" ${L ? P.sup('ceu') : `fill="${k.escuro}"`}/>`;
  s += `<path d="M290 74c8-6 20-6 26 2" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>`;
  // o produto e os apoios
  s += P.obj(ctx.icone, 262, 212, 92, { rot: 12 });
  const [a1, a2] = ctx.apoio;
  s += P.obj(a1 || ctx.icone, 356, 236, 44, { papel: 'acc', rot: -14 });
  s += P.obj(a2 || ctx.icone, 212, 54, 34, { papel: 'sec', rot: 18 });
  // planta vista de cima
  for (let j = 0; j < 6; j++) { const a = j * 60 + R() * 12; s += `<ellipse cx="46" cy="262" rx="8" ry="22" transform="rotate(${Math.round(a)} 46 262) translate(0 -14)" ${L ? P.sup('claro') : `fill="${mix(k.folha, '#ffffff', j % 2 ? 0 : 0.12)}"`}/>`; }
  s += `<circle cx="46" cy="262" r="7" ${P.sup('pri')}/>`;
  // etiqueta com barbante + migalhas
  s += `<path d="M150 262c20-18 30 4 44-14" fill="none" stroke="${rgba(c.ink, 0.4)}" stroke-width="1.4"/><g transform="rotate(-14 204 244)"><path d="M190 236h30l8 9-8 9h-30z" ${P.sup('acc')}/><circle cx="196" cy="245" r="2.4" fill="${k.mesa}"/></g>`;
  for (let j = 0; j < 14; j++) s += `<circle cx="${n(W * (0.08 + R() * 0.88))}" cy="${n(H * (0.06 + R() * 0.9))}" r="${n(1 + R() * 2.2)}" fill="${[c.pri, c.acc, c.ink][j % 3]}" opacity="${n(0.25 + R() * 0.4)}"/>`;
  return s;
}

// DETALHE: close no produto (recorte generoso, duotone e retícula, marcas de foco de câmera)
function cenaDetalhe(P, ctx, { W = 400, H = 300 }) {
  const { c, L } = P;
  const fundo = L ? mix(c.bg, c.pri, c.dark ? 0.12 : 0.07) : P.estilo === 'vidro' ? P.cor('pri') : c.pri;
  const tinta = L ? c.priTxt : c.onPri;
  let s = `<rect width="${W}" height="${H}" fill="${fundo}"/>`;
  if (!L) s += `<rect width="${W}" height="${H}" fill="${P.retic(c.onPri, 0.13, 7, 1.5)}"/>`;
  const tam = Math.max(W, H) * 1.5, sc = tam / 24, x0 = W * 0.6 - tam / 2, y0 = H * 0.56 - tam / 2;
  const g = (attrs, dx = 0) => `<g transform="translate(${n(x0 + dx)} ${n(y0 + dx)}) scale(${n3(sc)})" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${ctx.icone.svg}</g>`;
  s += g(`fill="none" stroke="${c.acc}" stroke-width="${n3(6 / sc)}" opacity=".8"`, 9);
  s += g(`fill="${L ? 'none' : mix(c.pri, c.onPri, 0.14)}" stroke="${tinta}" stroke-width="${n3((L ? 3 : 12) / sc)}"`);
  const cam = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 18}V${y}H${x + sx * 18}" fill="none" stroke="${tinta}" stroke-width="2.6"/>`;
  s += cam(W * 0.12, H * 0.14, 1, 1) + cam(W * 0.88, H * 0.14, -1, 1) + cam(W * 0.12, H * 0.86, 1, -1) + cam(W * 0.88, H * 0.86, -1, -1);
  s += `<circle cx="${n(W * 0.12 + 30)}" cy="${n(H * 0.14 + 8)}" r="4" fill="${c.acc}"/>`;
  return s;
}

// VITRINE: prateleiras com os produtos, spots de luz e etiquetas
function cenaVitrine(P, ctx, { W = 400, H = 300 }) {
  const { c, k, L } = P, d = c.dark;
  let s = `<rect width="${W}" height="${H}" ${P.sup('parede')} stroke="none"/>`;
  if (P.estilo === 'retro') s += `<rect width="${W}" height="${H}" fill="${P.retic(c.pri, 0.18, 8, 1.4)}"/>`;
  if (P.estilo === 'geometrico') s += `<rect x="130" y="0" width="140" height="${H}" ${P.sup('parede2')}/>`;
  if (!L) for (const x of [100, 200, 300]) s += `<ellipse cx="${x}" cy="92" rx="56" ry="70" fill="${P.brilhoRadial(d ? c.acc : '#ffffff', d ? 0.22 : 0.6)}"/>`;
  const prateleira = (y) => `<rect x="24" y="${y}" width="352" height="10" rx="2" ${P.sup('madeira')}/><path d="M50 ${y + 10}v10l14-10M350 ${y + 10}v10l-14-10" fill="${L ? 'none' : k.escuro}" stroke="${L ? P.traco : k.escuro}" stroke-width="2"/>`;
  const etiqueta = (x, y, papel) => `<path d="M${x - 14} ${y}h28v12h-28z" ${P.sup(papel)}/><path d="M${x - 8} ${y + 6}h16" stroke="${L ? P.traco : P.tintaDe(papel)}" stroke-width="1.6" opacity=".8"/>`;
  s += prateleira(132) + prateleira(236);
  s += P.obj(ctx.icone, 100, 100, 60, { papel: 'pri' }) + etiqueta(100, 146, 'claro');
  s += `<rect x="176" y="118" width="48" height="14" rx="3" ${P.sup('escuro')}/>` + P.obj(ctx.icone, 200, 84, 70, { papel: 'sec' }) + etiqueta(200, 146, 'acc');
  s += P.obj(ctx.icone, 300, 102, 56, { papel: 'acc', rot: 8 }) + etiqueta(300, 146, 'claro');
  // de baixo: potes, produto e planta
  s += `<rect x="72" y="194" width="40" height="42" rx="8" ${P.sup('vidro')}/><rect x="74" y="186" width="36" height="10" rx="3" ${P.sup('madeira')}/>` + P.ic(ctx.apoio[0] || ctx.icone, 92, 216, 20, L ? c.priTxt : c.ink, 1.6);
  s += `<rect x="122" y="204" width="32" height="32" rx="7" ${P.sup('vidro')}/><rect x="124" y="198" width="28" height="8" rx="3" ${P.sup('pri')}/>`;
  s += P.obj(ctx.icone, 230, 206, 50, { papel: 'pri', rot: -6 });
  s += `<circle cx="262" cy="176" r="15" ${P.sup('acc')}/><path d="${ESTRELA4(262, 176, 8)}" fill="${L ? c.priTxt : c.onAcc}"/>`;
  s += `<path d="M318 236h28l-4-24h-20z" ${P.sup('pri')}/>` + [[-8, -30, -22], [0, -40, 0], [8, -30, 22]].map(([dx, dy, r]) => `<ellipse cx="${332 + dx}" cy="${212 + dy * 0.6}" rx="6" ry="14" transform="rotate(${r} ${332 + dx} ${212 + dy * 0.6})" ${L ? P.sup('claro') : `fill="${k.folha}"`}/>`).join('');
  s += `<rect y="${H - 34}" width="${W}" height="34" ${P.sup('chao')}/>`;
  return s;
}

// RETRATO da equipe: busto ilustrado sem rosto (3 variações), arco de fundo e a inicial grande
const PELES = ['#e7b48c', '#b97d55', '#8a573a', '#f0c9a4', '#9c6a48'];
const CABELOS = ['#2a1c15', '#5a3b28', '#161616', '#7a4a2a'];
function cenaRetrato(P, ctx, { W = 300, H = 360, i = 0, nome = '' }) {
  const { c, k, L } = P, R = rnd(ctx.segId + 'ret' + i);
  const pele = PELES[(i * 2 + ctx.segId.length) % PELES.length], cabelo = CABELOS[(i + ctx.nome.length) % CABELOS.length];
  const roupa = ['pri', 'sec', 'acc'][i % 3];
  const fundo = [k.ceu, mix(c.bg, c.acc, c.dark ? 0.18 : 0.22), k.parede2][i % 3];
  let s = `<rect width="${W}" height="${H}" fill="${L ? mix(c.bg, c.pri, 0.04) : fundo}"/>`;
  if (P.estilo === 'retro') s += `<rect width="${W}" height="${H}" fill="${P.retic(c.ink, 0.16, 8, 1.5)}"/>`;
  else if (P.estilo === 'organico') s += `<path d="${blob(150, 170, 130, R, 7, 0.28)}" fill="${rgba(c.sec, 0.4)}"/>`;
  else if (P.estilo === 'geometrico') s += `<circle cx="${i % 2 ? 60 : 240}" cy="80" r="70" ${P.sup(i % 2 ? 'acc' : 'sec')}/>`;
  else if (P.estilo === 'vidro') s += `<g filter="${P.desfoque(30)}" opacity=".7"><circle cx="90" cy="120" r="80" fill="${c.pri}"/><circle cx="220" cy="210" r="70" fill="${c.acc}"/></g>`;
  else if (P.estilo === 'adesivo') s += P.brilho(56, 70, 12, c.priTxt) + P.brilho(248, 120, 9, c.secTxt);
  else s += `<circle cx="150" cy="170" r="118" ${L ? P.fio(0.2, 1) : `fill="${rgba(c.pri, c.dark ? 0.16 : 0.1)}"`}/>`;
  s += `<text x="150" y="${H * 0.52}" text-anchor="middle" dominant-baseline="central" style="font-family:var(--fd);font-weight:var(--dw)" font-size="250" fill="${rgba(c.priTxt, L ? 0.08 : 0.1)}">${esc(String(nome || '?').charAt(0).toUpperCase())}</text>`;
  const contorno = L ? ` stroke="${P.traco}" stroke-width="1.6"` : P.estilo === 'retro' ? ` stroke="${P.contorno}" stroke-width="2.2"` : P.estilo === 'adesivo' ? ' stroke="#ffffff" stroke-width="5"' : '';
  const f = (cor) => (L ? `fill="${mix(c.bg, cor.startsWith('url') ? c.pri : cor, c.dark ? 0.42 : 0.16)}"${contorno}` : `fill="${cor}"${contorno}`);
  const tipo = i % 3;
  // cabelo de trás (longo)
  if (tipo === 0) s += `<path d="M96 186c-8-58 14-98 54-98s62 40 54 98c-4 30 6 50 14 64H82c8-14 18-34 14-64z" ${f(cabelo)}/>`;
  // ombros, pescoço, cabeça
  s += `<path d="M38 ${H}c4-58 44-94 112-94s108 36 112 94z" ${f(L ? k[roupa] : P.cor(roupa))}/>`;
  s += `<path d="M132 222h36v46c-6 8-30 8-36 0z" ${f(mix(pele, '#000000', 0.12))}/>`;
  s += `<ellipse cx="150" cy="176" rx="40" ry="50" ${f(pele)}/>`;
  // gola e detalhe da roupa
  s += `<path d="M122 272c10 16 46 16 56 0" fill="none" stroke="${L ? P.traco : P.tintaDe(roupa)}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  if (tipo === 1) s += `<path d="M112 ${H}l14-70M188 ${H}l-14-70" stroke="${L ? P.traco : rgba(P.tintaDe(roupa), 0.5)}" stroke-width="2.5"/>`;
  // cabelo da frente
  if (tipo === 0) s += `<path d="M110 160c6-36 30-52 58-46 14 3 26 14 30 30-20-4-44-14-58-30-6 18-18 34-30 46z" ${f(cabelo)}/>`;
  else if (tipo === 1) s += `<path d="M108 170c-6-44 16-70 44-70 30 0 50 22 44 62-8-18-20-28-36-30-14 16-34 26-52 38z" ${f(cabelo)}/>`;
  else s += `<circle cx="150" cy="104" r="26" ${f(cabelo)}/><path d="M110 176c-4-42 14-62 40-62s44 20 40 62c-4-20-18-34-40-34s-36 14-40 34z" ${f(cabelo)}/>`;
  // brinco/bottom com o ícone de apoio
  const ap = ctx.apoio[i % Math.max(1, ctx.apoio.length)] || ctx.icone;
  s += P.medalha(ap, 206, 300, 17, i % 2 ? 'acc' : 'claro');
  return s;
}

// MAPA (localização) e ROTA (delivery)
function cenaMapa(P, ctx, { W = 600, H = 360, rota = false }) {
  const { c, k, L } = P, d = c.dark;
  const base = L ? c.bg : d ? mix(c.surf, c.bg, 0.4) : mix(c.bg, c.surf, 0.6);
  const quadra = L ? `fill="${c.bg}" stroke="${P.traco}" stroke-width="1"` : `fill="${d ? mix(c.surf, c.ink, 0.07) : mix(c.surf, c.ink, 0.05)}"`;
  let s = `<rect width="${W}" height="${H}" fill="${base}"/>`;
  const cols = [[0, 96], [118, 214], [236, 330], [352, 470], [492, 600]], rows = [[0, 70], [92, 160], [182, 262], [284, 360]];
  for (const [ci, [x0, x1]] of cols.entries()) for (const [ri, [y0, y1]] of rows.entries()) {
    if ((ci === 3 && ri === 1) || (ci === 0 && ri === 2)) continue; // praça e parque
    s += `<rect x="${x0 + 4}" y="${y0 + 4}" width="${x1 - x0 - 8}" height="${y1 - y0 - 8}" rx="6" ${quadra}/>`;
    if (!L && (ci + ri) % 2) s += `<rect x="${x0 + 12}" y="${y0 + 12}" width="${Math.min(40, x1 - x0 - 24)}" height="${Math.min(26, y1 - y0 - 24)}" rx="3" fill="${rgba(c.ink, d ? 0.06 : 0.04)}"/>`;
  }
  // parque e praça
  s += `<rect x="4" y="186" width="88" height="72" rx="10" ${L ? P.sup('claro') : `fill="${mix(base, k.folha, 0.35)}"`}/>`;
  for (const [x, y] of [[26, 206], [48, 230], [70, 204], [30, 240], [72, 240]]) s += `<circle cx="${x}" cy="${y}" r="8" ${L ? P.sup('claro') : `fill="${mix(base, k.folha, 0.6)}"`}/>`;
  s += `<rect x="356" y="96" width="110" height="60" rx="30" ${L ? P.sup('claro') : `fill="${mix(base, c.sec, 0.22)}"`}/><circle cx="411" cy="126" r="12" ${L ? P.sup('claro') : `fill="${mix(base, c.acc, 0.35)}"`}/>`;
  // rio/avenida curva
  s += `<path d="M-10 318C120 292 220 330 340 306S520 262 610 280" fill="none" stroke="${L ? mix(c.bg, c.pri, 0.1) : k.vidro}" stroke-width="26" opacity="${L ? 1 : 0.9}"/>`;
  s += `<path d="M-10 318C120 292 220 330 340 306S520 262 610 280" fill="none" stroke="${rgba('#ffffff', d ? 0.12 : 0.4)}" stroke-width="2" stroke-dasharray="10 12"/>`;
  // ruas principais
  s += `<path d="M0 171H600M225 0V360" stroke="${L ? P.traco : d ? rgba('#ffffff', 0.08) : '#ffffff'}" stroke-width="${L ? 1 : 10}" opacity="${L ? 0.5 : 0.8}"/>`;
  const px = 290, py = 150;
  if (rota) { // do balcão até a casa do cliente, pelas ruas (dentro da área visível em 5:4)
    const hx = 440, hy = 62;
    s += `<path class="sa-rota" d="M${px + 4} ${py + 20}H${hx - 60}V${hy + 20}H${hx - 24}" fill="none" stroke="${c.priTxt}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 10"/>`;
    s += `<circle cx="${hx}" cy="${hy + 20}" r="24" ${P.sup('acc')}/>` + P.ic({ svg: '<path d="M3.5 11 12 3.5l8.5 7.5"/><path d="M5.5 9.5v11h13v-11"/><path d="M10 20.5V15h4v5.5"/>' }, hx, hy + 20, 26, L ? c.priTxt : c.onAcc, 2);
    s += `<g class="sa-moto"><circle cx="${hx - 60}" cy="${py - 24}" r="21" fill="${c.bg}" stroke="${c.priTxt}" stroke-width="2"/>` + P.ic({ svg: '<circle cx="6" cy="17" r="2.8"/><circle cx="18" cy="17" r="2.8"/><path d="M8.8 17h6.5l2.2-6.2h-3.7M17.5 10.8 16 6.5h-2.5"/><path d="M3.2 12.5h6.3l1.8 2.5"/><rect x="3" y="7" width="5.5" height="5.5" rx=".9"/>' }, hx - 60, py - 24, 25, c.priTxt, 1.8) + '</g>';
  }
  s += `<circle class="sa-pulso" cx="${px}" cy="${py + 14}" r="34" fill="${rgba(c.pri, 0.22)}"/><circle cx="${px}" cy="${py + 14}" r="16" fill="${rgba(c.pri, 0.28)}"/>`;
  s += `<path d="M${px} ${py + 16}s-24-20-24-37a24 24 0 0 1 48 0c0 17-24 37-24 37z" fill="${c.pri}"/><circle cx="${px}" cy="${py - 22}" r="9" fill="${c.onPri}"/>`;
  const nome = String(ctx.nome), fsN = nome.length > 26 ? 11.5 : 14;
  const bw = Math.min(W - px - 34, Math.max(110, nome.length * fsN * 0.6 + 34));
  s += `<g><rect x="${px + 26}" y="${py - 64}" width="${n(bw)}" height="34" rx="8" fill="${c.bg}" stroke="${c.line}"/><circle cx="${px + 42}" cy="${py - 47}" r="4" fill="${c.acc}"/><text x="${px + 54}" y="${py - 42}" style="font-family:var(--fb)" font-size="${fsN}" font-weight="700" fill="${c.ink}"${nome.length * fsN * 0.6 > bw - 34 ? ` textLength="${n(bw - 38)}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(nome)}</text></g>`;
  return s;
}

// MINIATURA (cardápio): o item servido, visto de cima, com cor e ângulo próprios
export function miniatura(ctx, i, id = 'mi') {
  const P = pintor(ctx, String(id).replace(/[^a-z0-9]/gi, '') + i), { c, k, L } = P, R = rnd(ctx.segId + 'mini' + i);
  const papel = ['pri', 'sec', 'acc', 'pri'][i % 4], fundo = [k.ceu, k.parede2, mix(c.bg, c.acc, c.dark ? 0.2 : 0.18), k.ceu2][i % 4];
  let s = `<rect width="120" height="120" fill="${L ? mix(c.bg, c.pri, 0.05) : fundo}"/>`;
  if (P.estilo === 'retro') s += `<rect width="120" height="120" fill="${P.retic(c.ink, 0.14, 6, 1.1)}"/>`;
  s += `<circle cx="62" cy="64" r="44" fill="${k.sombra}"/><circle cx="60" cy="60" r="44" ${P.sup('claro')}/><circle cx="60" cy="60" r="33" fill="none" stroke="${rgba(c.ink, L ? 0.35 : 0.1)}" stroke-width="1.4"/>`;
  s += P.obj(ctx.icone, 60, 60, 46, { papel, rot: [-12, 8, -4, 14][i % 4] });
  for (let j = 0; j < 5; j++) { const a = R() * Math.PI * 2, r = 38 + R() * 4; s += `<circle cx="${n(60 + r * Math.cos(a))}" cy="${n(60 + r * Math.sin(a))}" r="${n(1.4 + R() * 1.6)}" fill="${[c.acc, c.pri, c.sec][j % 3]}" opacity=".8"/>`; }
  if (i === 3) s += P.brilho(100, 20, 9, c.priTxt) + P.brilho(18, 98, 6, c.secTxt);
  return `<svg class="sa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${P.defs()}${s}</svg>`;
}

// OBJETO solto (adesivos flutuantes): só o produto/ícone no jeito do estilo, em caixa 100×100
export function objetoSolto(ctx, icone, { papel = 'pri', id = 'os', rot = 0, estilo } = {}) {
  const P = pintor(ctx, String(id).replace(/[^a-z0-9]/gi, ''), estilo || ctx.site.img);
  return `<svg class="sa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${P.defs()}${P.obj(icone, 50, 50, 70, { papel, rot })}</svg>`;
}

const CENAS = { produto: cenaProduto, fachada: cenaFachada, interior: cenaInterior, bancada: cenaBancada, detalhe: cenaDetalhe, vitrine: cenaVitrine, retrato: cenaRetrato, mapa: cenaMapa };
const TAM = { produto: [400, 400], fachada: [400, 300], interior: [400, 300], bancada: [400, 300], detalhe: [400, 300], vitrine: [400, 300], retrato: [300, 360], mapa: [600, 360] };

// cena(tipo, ctx, { id, estilo, i, estado, cobrir, cls, ... }) → <svg> pronto
export function cena(tipo, ctx, o = {}) {
  const [W, H] = o.W && o.H ? [o.W, o.H] : TAM[tipo] || [400, 300];
  const id = String(o.id || tipo).replace(/[^a-z0-9]/gi, '');
  const P = pintor(ctx, id, o.estilo || ctx.site.img);
  const corpo = (CENAS[tipo] || cenaProduto)(P, ctx, { ...o, W, H });
  return `<svg class="sa ${o.cls || ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="${o.cobrir === false ? 'xMidYMid meet' : 'xMidYMid slice'}" aria-hidden="true" focusable="false">${P.defs()}${corpo}</svg>`;
}

// selo circular com texto em volta (gira devagar no site)
export function seloGiratorio(texto, { id = 'sg', tam = 120, cor = 'currentColor', fonte = 'var(--fk)', centro = '' } = {}) {
  const t = String(texto).toUpperCase();
  const r = 38, circ = 2 * Math.PI * r;
  const fs = Math.max(6.4, Math.min(9.6, (circ / Math.max(12, t.length)) * 1.12));
  return `<svg class="selo-gira" viewBox="0 0 100 100" width="${tam}" height="${tam}" aria-hidden="true"><defs><path id="${id}" d="M50 50m-${r} 0a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1-${r * 2} 0"/></defs><g class="selo-gira-txt"><text style="font-family:${fonte}" font-size="${n(fs)}" font-weight="700" letter-spacing="${n(fs * 0.18)}" fill="${cor}"><textPath href="#${id}" textLength="${n(circ - fs * 0.9)}" lengthAdjust="spacing">${esc(t)}</textPath></text></g>${centro}</svg>`;
}

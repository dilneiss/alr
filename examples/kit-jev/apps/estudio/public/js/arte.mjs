// Ilustrações vetoriais geradas a partir do ÍCONE e do ESTILO que o Jev escolheu, nas cores da paleta.
// Tudo SVG puro (vai junto no HTML baixado). Detalhes decorativos usam semente estável (não "pulam" a cada render).
import { rnd, rgba, mix } from './util.mjs';

const ic = (icone, x, y, tam, cor, sw = 1.6, extra = '') =>
  `<g transform="translate(${(x - tam / 2).toFixed(1)} ${(y - tam / 2).toFixed(1)}) scale(${(tam / 24).toFixed(3)})" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}>${icone.svg}</g>`;

function estrela4(x, y, r, cor) {
  return `<path d="M${x} ${y - r}C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}z" fill="${cor}"/>`;
}
function blob(cx, cy, r, R, n = 7, irreg = 0.22) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r * (1 - irreg / 2 + R() * irreg);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'z';
}

// estilo: flat | linha | vidro | geometrico | retro | organico | adesivo
// apoio = até 2 ícones que o Jev também achou relevantes (2º e 3º lugar da mesma decisão, com 2%+): cena mais rica
export function arte(estilo, { icone, c, w = 400, h = 320, semente = '', id = 'a', faixa = '', apoio = [] }) {
  const R = rnd(semente + estilo + icone.id);
  const cx = w / 2, cy = h / 2, m = Math.min(w, h);
  let s = '';
  const [a1, a2] = apoio;
  const medalha = (ic2, x, y, r, fundo, cor, sw = 1.8) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fundo}"/>${ic(ic2, x, y, r * 1.12, cor, sw)}`;
  switch (estilo) {
    case 'linha': {
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.42}" fill="none" stroke="${rgba(c.ink, 0.22)}" stroke-width="1"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.34}" fill="none" stroke="${rgba(c.ink, 0.14)}" stroke-width="1"/>`;
      s += `<path d="M${cx - m * 0.42} ${cy} A ${m * 0.42} ${m * 0.42} 0 0 1 ${cx} ${cy - m * 0.42}" fill="none" stroke="${c.priTxt}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += `<line x1="${cx - m * 0.55}" y1="${cy + m * 0.42}" x2="${cx + m * 0.55}" y2="${cy + m * 0.42}" stroke="${rgba(c.ink, 0.18)}" stroke-width="1"/>`;
      s += ic(icone, cx, cy, m * 0.46, c.ink, 0.85);
      for (let i = 0; i < 4; i++) s += estrela4(cx + (R() - 0.5) * m * 0.95, cy + (R() - 0.5) * m * 0.8, 3 + R() * 6, c.priTxt);
      if (a1) s += medalha(a1, cx + m * 0.42 * Math.cos(-0.6), cy + m * 0.42 * Math.sin(-0.6), m * 0.07, c.bg, c.priTxt, 1.4);
      else s += `<circle cx="${cx + m * 0.42 * Math.cos(-0.6)}" cy="${cy + m * 0.42 * Math.sin(-0.6)}" r="4" fill="${c.priTxt}"/>`;
      if (a2) s += medalha(a2, cx + m * 0.42 * Math.cos(2.45), cy + m * 0.42 * Math.sin(2.45), m * 0.06, c.bg, c.ink, 1.3);
      break;
    }
    case 'vidro': {
      s += `<defs><filter id="bl${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${m * 0.07}"/></filter>
        <linearGradient id="gv${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient></defs>`;
      s += `<g filter="url(#bl${id})"><circle cx="${cx - m * 0.2}" cy="${cy - m * 0.12}" r="${m * 0.3}" fill="${c.pri}"/><circle cx="${cx + m * 0.22}" cy="${cy + m * 0.16}" r="${m * 0.26}" fill="${c.sec}"/><circle cx="${cx + m * 0.25}" cy="${cy - m * 0.25}" r="${m * 0.12}" fill="${c.acc}"/></g>`;
      const bw = m * 0.56, bh = m * 0.56;
      s += `<rect x="${cx - bw / 2}" y="${cy - bh / 2}" width="${bw}" height="${bh}" rx="${m * 0.08}" fill="url(#gv${id})" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>`;
      s += ic(icone, cx, cy, m * 0.3, '#ffffff', 1.7);
      s += `<rect x="${cx + bw * 0.28}" y="${cy + bh * 0.3}" width="${m * 0.24}" height="${m * 0.1}" rx="${m * 0.05}" fill="rgba(255,255,255,.85)"/><circle cx="${cx + bw * 0.28 + m * 0.05}" cy="${cy + bh * 0.3 + m * 0.05}" r="${m * 0.025}" fill="${c.pri}"/><rect x="${cx + bw * 0.28 + m * 0.09}" y="${cy + bh * 0.3 + m * 0.04}" width="${m * 0.11}" height="${m * 0.02}" rx="${m * 0.01}" fill="${rgba(c.ink, 0.35)}"/>`;
      s += `<rect x="${cx - bw * 0.72}" y="${cy - bh * 0.46}" width="${m * 0.2}" height="${m * 0.08}" rx="${m * 0.04}" fill="rgba(255,255,255,.7)"/>`;
      if (a1) s += `<rect x="${(cx - bw * 0.78).toFixed(1)}" y="${(cy + bh * 0.08).toFixed(1)}" width="${(m * 0.16).toFixed(1)}" height="${(m * 0.16).toFixed(1)}" rx="${(m * 0.045).toFixed(1)}" fill="url(#gv${id})" stroke="rgba(255,255,255,.6)"/>` + ic(a1, cx - bw * 0.78 + m * 0.08, cy + bh * 0.08 + m * 0.08, m * 0.1, '#ffffff', 1.6);
      if (a2) s += `<rect x="${(cx + bw * 0.52).toFixed(1)}" y="${(cy - bh * 0.62).toFixed(1)}" width="${(m * 0.14).toFixed(1)}" height="${(m * 0.14).toFixed(1)}" rx="${(m * 0.04).toFixed(1)}" fill="url(#gv${id})" stroke="rgba(255,255,255,.6)"/>` + ic(a2, cx + bw * 0.52 + m * 0.07, cy - bh * 0.62 + m * 0.07, m * 0.085, '#ffffff', 1.6);
      break;
    }
    case 'geometrico': {
      const t = m * 0.36, x0 = cx - t, y0 = cy - t;
      s += `<rect x="${x0}" y="${y0}" width="${t}" height="${t}" fill="${c.pri}"/>`;
      s += `<path d="M${x0 + t} ${y0 + t}V${y0}A${t} ${t} 0 0 1 ${x0 + 2 * t} ${y0 + t}z" fill="${c.sec}"/>`;
      s += `<path d="M${x0} ${y0 + t}h${t}v${t}z" fill="${c.acc}"/>`;
      s += `<rect x="${x0 + t}" y="${y0 + t}" width="${t}" height="${t}" fill="${c.dark ? mix(c.bg, '#ffffff', 0.08) : c.ink}"/>`;
      s += `<circle cx="${x0 + t * 0.5}" cy="${y0 + t * 0.5}" r="${t * 0.26}" fill="${c.onPri}" opacity=".9"/>`;
      if (a1) s += ic(a1, x0 + t * 0.5, y0 + t * 0.5, t * 0.3, c.pri, 2);
      if (a2) s += ic(a2, x0 + t * 1.42, y0 + t * 0.58, t * 0.36, c.onSec || c.ink, 2);
      s += ic(icone, x0 + t * 1.5, y0 + t * 1.5, t * 0.62, c.dark ? c.pri : c.bg, 1.8);
      s += `<circle cx="${x0 - t * 0.28}" cy="${y0 + t * 1.75}" r="${t * 0.12}" fill="${c.priTxt}"/><rect x="${x0 + 2 * t + t * 0.12}" y="${y0 - t * 0.1}" width="${t * 0.1}" height="${t * 0.62}" fill="${c.secTxt}"/>`;
      break;
    }
    case 'retro': {
      let raios = '';
      const n = 28;
      for (let i = 0; i < n; i += 2) {
        const a1 = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2, r = m;
        raios += `<path d="M${cx} ${cy}L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}L${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}z"/>`;
      }
      s += `<defs><pattern id="ht${id}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.7" fill="${rgba(c.ink, c.dark ? 0.35 : 0.22)}"/></pattern><clipPath id="cr${id}"><rect width="${w}" height="${h}"/></clipPath></defs>`;
      s += `<g clip-path="url(#cr${id})"><g fill="${rgba(c.pri, c.dark ? 0.28 : 0.2)}">${raios}</g></g>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.42}" fill="url(#ht${id})"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.3}" fill="${c.pri}"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.265}" fill="none" stroke="${c.onPri}" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>`;
      s += ic(icone, cx, cy, m * 0.3, c.onPri, 1.9);
      if (a1) s += medalha(a1, cx + m * 0.36 * Math.cos(-0.8), cy + m * 0.36 * Math.sin(-0.8), m * 0.085, c.acc, c.onAcc || '#111', 2);
      if (a2) s += medalha(a2, cx + m * 0.36 * Math.cos(-2.35), cy + m * 0.36 * Math.sin(-2.35), m * 0.075, c.bg, c.priTxt, 1.9);
      if (faixa) {
        const txt = String(faixa).toUpperCase().slice(0, 22), fs = Math.min(m * 0.056, (m * 0.66) / Math.max(6, txt.length) * 1.55);
        s += `<path d="M${cx - m * 0.4} ${cy + m * 0.3}h${m * 0.8}l-${m * 0.05} ${m * 0.065} ${m * 0.05} ${m * 0.065}h-${m * 0.8}l${m * 0.05}-${m * 0.065}z" fill="${c.acc}"/>`;
        s += `<text x="${cx}" y="${cy + m * 0.365}" text-anchor="middle" dominant-baseline="central" font-size="${fs.toFixed(1)}" font-weight="800" letter-spacing="${(fs * 0.12).toFixed(1)}" fill="${c.onAcc || '#111'}">${txt.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))}</text>`;
      }
      s += `<g fill="${c.acc}"><path d="M${cx - m * 0.46} ${cy - m * 0.3}l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z"/><path d="M${cx + m * 0.44} ${cy - m * 0.22}l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z"/></g>`;
      break;
    }
    case 'organico': {
      s += `<path d="${blob(cx + m * 0.06, cy, m * 0.4, R, 7, 0.28)}" fill="${rgba(c.sec, 0.55)}"/>`;
      s += `<path d="${blob(cx - m * 0.14, cy + m * 0.08, m * 0.28, R, 6, 0.3)}" fill="${rgba(c.acc, 0.45)}"/>`;
      const folha = (x, y, esc, rot, cor) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${esc})"><path d="M0 0C10-26 38-34 60-30 52-8 30 10 0 0z" fill="${cor}"/><path d="M4-1C20-12 36-20 52-26" fill="none" stroke="${rgba('#ffffff', 0.5)}" stroke-width="1.4"/></g>`;
      s += folha(cx - m * 0.46, cy + m * 0.3, m / 300, -30, c.pri);
      s += folha(cx + m * 0.3, cy - m * 0.34, m / 380, 40, mix(c.pri, c.sec, 0.4));
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.24}" fill="${c.dark ? c.surf : '#ffffff'}" opacity=".92"/>`;
      s += ic(icone, cx, cy, m * 0.28, c.priTxt, 1.6);
      if (a1) s += medalha(a1, cx - m * 0.33, cy + m * 0.2, m * 0.075, c.dark ? c.surf || c.bg : '#ffffff', c.priTxt, 1.5);
      if (a2) s += medalha(a2, cx + m * 0.36, cy - m * 0.24, m * 0.065, c.dark ? c.surf || c.bg : '#ffffff', c.priTxt, 1.5);
      for (let i = 0; i < 5; i++) s += `<circle cx="${cx + (R() - 0.5) * m}" cy="${cy + (R() - 0.5) * m * 0.9}" r="${2 + R() * 4}" fill="${rgba(c.pri, 0.5)}"/>`;
      break;
    }
    case 'adesivo': {
      const sticker = (x, y, r, rot, fundo, conteudo, forma = 'circ') => {
        const shape = forma === 'circ' ? `<circle r="${r}"/>` : forma === 'quad' ? `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.35}"/>` : `<path d="${blobFixo(r)}"/>`;
        return `<g transform="translate(${x} ${y}) rotate(${rot})"><g fill="rgba(0,0,0,.14)" transform="translate(3 5)">${shape}</g><g fill="#ffffff">${shape.replace(`r="${r}"`, `r="${r + 5}"`).replace(`width="${2 * r}" height="${2 * r}"`, `width="${2 * r + 10}" height="${2 * r + 10}"`).replace(`x="${-r}" y="${-r}"`, `x="${-r - 5}" y="${-r - 5}"`)}</g><g fill="${fundo}">${shape}</g>${conteudo}</g>`;
      };
      s += sticker(cx + m * 0.28, cy - m * 0.22, m * 0.11, 14, c.sec, ic(a1 || { svg: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>' }, 0, 0, m * 0.12, c.onSec, 2), 'circ');
      s += sticker(cx - m * 0.3, cy + m * 0.24, m * 0.1, -12, c.acc, ic(a2 || { svg: '<path d="M12 20.3s-8-4.7-8-10.5A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.4c0 5.8-8 10.5-8 10.5z"/>' }, 0, 0, m * 0.11, c.onAcc, 2), 'quad');
      s += sticker(cx, cy, m * 0.25, -6, c.pri, ic(icone, 0, 0, m * 0.27, c.onPri, 1.9), 'quad');
      s += `<path d="M${cx - m * 0.46} ${cy - m * 0.2}c8-10 16 10 24 0s16 10 24 0" fill="none" stroke="${c.priTxt}" stroke-width="3" stroke-linecap="round"/>`;
      s += `<path d="M${cx + m * 0.3} ${cy + m * 0.32}c6 6 14 6 20 0" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
      s += estrela4(cx + m * 0.44, cy + m * 0.1, 8, c.priTxt) + estrela4(cx - m * 0.4, cy - m * 0.38, 6, c.secTxt);
      break;
    }
    default: { // flat
      s += `<ellipse cx="${cx}" cy="${cy + m * 0.4}" rx="${m * 0.3}" ry="${m * 0.04}" fill="${rgba(c.ink, 0.12)}"/>`;
      s += `<circle cx="${cx + m * 0.08}" cy="${cy - m * 0.02}" r="${m * 0.4}" fill="${c.sec}"/>`;
      s += a1 ? medalha(a1, cx - m * 0.32, cy - m * 0.28, m * 0.11, c.acc, c.onAcc || '#111', 2) : `<circle cx="${cx - m * 0.32}" cy="${cy - m * 0.28}" r="${m * 0.09}" fill="${c.acc}"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${m * 0.28}" fill="${c.pri}"/>`;
      s += ic(icone, cx, cy, m * 0.32, c.onPri, 1.8);
      s += a2 ? medalha(a2, cx + m * 0.4, cy + m * 0.24, m * 0.085, c.bg, c.priTxt, 1.8) : `<path d="M${cx + m * 0.36} ${cy + m * 0.26}l${m * 0.06} ${m * 0.1}h-${m * 0.12}z" fill="${c.acc}"/>`;
      s += `<rect x="${cx - m * 0.46}" y="${cy + m * 0.18}" width="${m * 0.07}" height="${m * 0.07}" rx="2" fill="${c.priTxt}" transform="rotate(20 ${cx - m * 0.42} ${cy + m * 0.21})"/>`;
      s += `<circle cx="${cx + m * 0.42}" cy="${cy - m * 0.3}" r="${m * 0.035}" fill="none" stroke="${c.ink}" stroke-width="2" opacity=".5"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${s}</svg>`;
}

function blobFixo(r) {
  return `M0 ${-r}C${r * 0.6} ${-r} ${r} ${-r * 0.5} ${r} 0S${r * 0.5} ${r} 0 ${r}${-r} ${r * 0.5} ${-r} 0${-r * 0.5} ${-r} 0 ${-r}z`;
}

// Padrão repetido com o ícone da marca (fundo de posts e cartões)
export function padrao(icone, cor, { tam = 28, gap = 22, op = 0.14, id = 'p' } = {}) {
  const t = tam + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true"><defs><pattern id="pt${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">${ic(icone, t / 2, t / 2, tam, cor, 1.6, ` opacity="${op}"`)}${ic(icone, 0, 0, tam * 0.6, cor, 1.6, ` opacity="${op * 0.7}"`)}${ic(icone, t, t, tam * 0.6, cor, 1.6, ` opacity="${op * 0.7}"`)}</pattern></defs><rect width="100%" height="100%" fill="url(#pt${id})"/></svg>`;
}

// "QR" decorativo (não codifica endereço nenhum de propósito: o domínio é fictício)
export function qrFalso(semente, cor = '#111', fundo = '#fff') {
  const R = rnd('qr' + semente), n = 25, cel = 4;
  let s = `<rect width="${n * cel}" height="${n * cel}" fill="${fundo}"/>`;
  const finder = (x, y) => `<rect x="${x * cel}" y="${y * cel}" width="${7 * cel}" height="${7 * cel}" fill="${cor}"/><rect x="${(x + 1) * cel}" y="${(y + 1) * cel}" width="${5 * cel}" height="${5 * cel}" fill="${fundo}"/><rect x="${(x + 2) * cel}" y="${(y + 2) * cel}" width="${3 * cel}" height="${3 * cel}" fill="${cor}"/>`;
  const livre = (x, y) => !((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9));
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (livre(x, y) && R() < 0.47) d += `M${x * cel} ${y * cel}h${cel}v${cel}h-${cel}z`;
  s += `<path d="${d}" fill="${cor}"/>` + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${n * cel + 8} ${n * cel + 8}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-4" y="-4" width="${n * cel + 8}" height="${n * cel + 8}" fill="${fundo}"/>${s}</svg>`;
}

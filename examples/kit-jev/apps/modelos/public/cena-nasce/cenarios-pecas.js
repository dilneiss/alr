// Peças e helpers do desenho dos cenários. Não conhece base nem variante: só sabe desenhar.
export const V = 'viewBox="-200 0 2000 900" preserveAspectRatio="none"';

export const svg = (corpo, defs = '') =>
  `<svg ${V} aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${corpo}</svg>`;

export const lin = (id, cores, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  cores.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
  `</linearGradient>`;

export const rad = (id, cores) =>
  `<radialGradient id="${id}" cx=".5" cy=".5" r=".5">` +
  cores.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
  `</radialGradient>`;

// números pseudoaleatórios estáveis: o mesmo desenho sempre
export function rnd(semente) {
  let s = semente >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// semente estável por id: a mesma variante desenha sempre igual
export function hashDe(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- vegetação ----------
export function arvoreRedonda(x, y, t, c1 = '#7fd35a', c2 = '#3b8f3a', id = 'arv') {
  return `<g><rect x="${x - t * 0.07}" y="${y - t * 0.42}" width="${t * 0.14}" height="${t * 0.44}" rx="${t * 0.05}" fill="url(#${id}-tronco)"/>`
    + `<circle cx="${x - t * 0.18}" cy="${y - t * 0.52}" r="${t * 0.26}" fill="url(#${id}-copa)"/><circle cx="${x + t * 0.2}" cy="${y - t * 0.55}" r="${t * 0.27}" fill="url(#${id}-copa)"/>`
    + `<circle cx="${x}" cy="${y - t * 0.78}" r="${t * 0.3}" fill="url(#${id}-copa)"/><circle cx="${x - t * 0.08}" cy="${y - t * 0.86}" r="${t * 0.12}" fill="#fff" fill-opacity=".14"/></g>`;
}
export const defsArvore = (id = 'arv', c1 = '#8fdc63', c2 = '#2f8a3b') =>
  lin(`${id}-copa`, [[0, c1], [1, c2]], 0.4, 1) + lin(`${id}-tronco`, [[0, '#a8703f'], [1, '#6e4524']], 1, 0);

export function pinheiro(x, y, t, cor = 'url(#pin)', neve = false) {
  let s = `<rect x="${x - t * 0.05}" y="${y - t * 0.16}" width="${t * 0.1}" height="${t * 0.17}" fill="#6e4524"/>`;
  for (let i = 0; i < 3; i++) {
    const yy = y - t * 0.12 - i * t * 0.27, w = t * (0.46 - i * 0.11), h = t * 0.38;
    s += `<path d="M${x - w} ${yy} L${x} ${yy - h} L${x + w} ${yy} Z" fill="${cor}"/>`;
    if (neve) s += `<path d="M${x - w * 0.55} ${yy - h * 0.45} L${x} ${yy - h} L${x + w * 0.55} ${yy - h * 0.45} Q${x} ${yy - h * 0.32} ${x - w * 0.55} ${yy - h * 0.45} Z" fill="#fff"/>`;
  }
  return s;
}

export function tufos(r, n, y0, y1, cor, esc = 1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), h = (14 + r() * 16) * esc;
    s += `<path d="M${x} ${y} q-4 ${-h * 0.6} -9 ${-h} M${x} ${y} q1 ${-h * 0.7} 2 ${-h * 1.15} M${x} ${y} q5 ${-h * 0.5} 10 ${-h * 0.9}" stroke="${cor}" stroke-width="${3 * esc}" stroke-linecap="round" fill="none"/>`;
  }
  return s;
}

export function florzinhas(r, n, y0, y1, cores) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), c = cores[i % cores.length], k = 4 + r() * 3;
    s += `<g transform="translate(${x} ${y})"><circle cx="${-k}" r="${k}" fill="${c}"/><circle cx="${k}" r="${k}" fill="${c}"/><circle cy="${-k}" r="${k}" fill="${c}"/><circle cy="${k}" r="${k}" fill="${c}"/><circle r="${k * 0.8}" fill="#ffd84a"/></g>`;
  }
  return s;
}

// ---------- peças de chão e de cenário ----------
// pedras soltas no chão (praia rochosa, caverna, obra)
export function pedras(r, n, y0, y1, cor = '#7b8794') {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), k = 10 + r() * 22;
    s += `<ellipse cx="${x}" cy="${y}" rx="${k}" ry="${k * 0.62}" fill="${cor}"/>`
      + `<ellipse cx="${x - k * 0.3}" cy="${y - k * 0.28}" rx="${k * 0.45}" ry="${k * 0.26}" fill="#fff" fill-opacity=".18"/>`;
  }
  return s;
}

// costão rochoso: pedra sólida subindo da areia (praia rochosa)
export function costao(cor = '#8b9aa8', y = 700) {
  return `<path d="M-200 ${y} L-60 ${y - 90} L40 ${y - 40} L180 ${y - 130} L320 ${y} Z" fill="${cor}"/>`
    + `<path d="M1400 ${y} L1540 ${y - 110} L1660 ${y - 50} L1800 ${y - 140} L1800 ${y} Z" fill="${cor}"/>`
    + `<path d="M-60 ${y - 90} L40 ${y - 40} L180 ${y - 130} L260 ${y - 40}" stroke="#6b7b8a" stroke-width="4" fill="none"/>`;
}

// estrela-do-mar e concha avulsas (fundo do mar, praia)
export function estrelaDoMar(x, y, t, cor) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? t * 0.42 : t;
    p.push(`${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr * 0.62).toFixed(1)}`);
  }
  return `<path d="M${p.join(' L')} Z" fill="${cor}" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linejoin="round"/>`;
}

export function concha(x, y, t, cor) {
  return `<g transform="translate(${x} ${y})"><path d="M${-t} 0 Q0 ${-t * 1.5} ${t} 0 Z" fill="${cor}"/>`
    + `<path d="M0 0 L${-t * 0.5} ${-t * 0.8} M0 0 L0 ${-t * 0.95} M0 0 L${t * 0.5} ${-t * 0.8}" stroke="#fff" stroke-opacity=".6" stroke-width="2"/></g>`;
}

export function conchas(r, n, y0, y1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), t = 6 + r() * 6;
    s += `<path d="M${x - t} ${y} Q${x} ${y - t * 1.5} ${x + t} ${y} Z" fill="#fff6ec" stroke="#e8d7c4" stroke-width="1"/>`;
  }
  return s;
}

// folhas secas espalhadas (floresta outono)
export function folhasSecas(r, n, y0, y1) {
  const cores = ['#d98a3d', '#b45309', '#e0b04a'];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), c = cores[i % cores.length];
    s += `<path d="M${x} ${y} q6 -10 14 -4 q-8 10 -14 4 Z" fill="${c}" opacity=".85"/>`;
  }
  return s;
}

// troncos queimados, sem copa (floresta queimada)
export function troncosQueimados(r, n, y0, y1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), h = 40 + r() * 70;
    s += `<path d="M${x} ${y} L${x + (r() * 6 - 3)} ${y - h}" stroke="#2f2a26" stroke-width="${4 + r() * 3}" stroke-linecap="round"/>`
      + `<path d="M${x} ${y - h * 0.7} l8 -10 M${x} ${y - h * 0.45} l-9 -8" stroke="#2f2a26" stroke-width="3" stroke-linecap="round"/>`;
  }
  return s;
}

// paredes em ruína com ameias quebradas (castelo em ruínas, floresta queimada)
export function ruinas(x, y, t) {
  return `<g fill="#9ca3af">`
    + `<path d="M${x} ${y} L${x} ${y - t} L${x + t * 0.12} ${y - t} L${x + t * 0.12} ${y - t * 0.8} L${x + t * 0.24} ${y - t * 0.9} L${x + t * 0.36} ${y - t * 0.6} L${x + t * 0.48} ${y - t * 0.78} L${x + t * 0.6} ${y} Z"/>`
    + `</g><path d="M${x} ${y} L${x + t * 0.6} ${y}" stroke="#6b7280" stroke-width="4"/>`;
}

// cristais brilhando (caverna cristais, planeta alienígena)
export function cristais(x, y, t) {
  return `<g><path d="M${x} ${y} L${x - t * 0.22} ${y - t * 0.9} L${x} ${y - t * 1.35} L${x + t * 0.22} ${y - t * 0.9} Z" fill="#7dd3fc" opacity=".9"/>`
    + `<path d="M${x} ${y} L${x + t * 0.2} ${y - t * 0.7} L${x + t * 0.42} ${y} Z" fill="#38bdf8" opacity=".75"/>`
    + `<path d="M${x} ${y} L${x - t * 0.2} ${y - t * 0.7} L${x - t * 0.42} ${y} Z" fill="#a5f3fc" opacity=".6"/></g>`;
}

// tochas, para mina e masmorra
export function tochas(r, n, y0, y1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0);
    s += `<rect x="${x - 3}" y="${y - 34}" width="6" height="34" fill="#6e4524"/>`
      + `<ellipse cx="${x}" cy="${y - 40}" rx="8" ry="12" fill="#fbbf24" opacity=".95"/>`
      + `<ellipse cx="${x}" cy="${y - 40}" rx="4" ry="7" fill="#fff7ed"/>`;
  }
  return s;
}

// bandeirinhas de festa (escola festa junina, castelo em festa, circo)
export function bandeirinhas(y, cores = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6']) {
  let s = `<path d="M-200 ${y} Q600 ${y + 40} 1800 ${y}" stroke="#6b7280" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < 40; i++) {
    const x = -180 + i * 50, yy = y + Math.sin((i / 40) * Math.PI) * 26, c = cores[i % cores.length];
    s += `<path d="M${x} ${yy} L${x + 26} ${yy} L${x + 13} ${yy + 26} Z" fill="${c}"/>`;
  }
  return s;
}

// caixas empilhadas (galpão, mercado, mudança)
export function caixas(r, n, y0, y1, cor = '#c98b3f') {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), k = 26 + r() * 20;
    s += `<rect x="${x}" y="${y - k}" width="${k}" height="${k}" fill="${cor}" rx="2"/>`
      + `<rect x="${x}" y="${y - k}" width="${k}" height="${k * 0.22}" fill="#a9702e" rx="2"/>`;
  }
  return s;
}

// macas e soro (hospital, clínica)
export function macas(r, n, y0, y1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0);
    s += `<rect x="${x}" y="${y - 40}" width="120" height="18" rx="6" fill="#e5e7eb"/>`
      + `<rect x="${x + 6}" y="${y - 22}" width="6" height="22" fill="#9ca3af"/><rect x="${x + 108}" y="${y - 22}" width="6" height="22" fill="#9ca3af"/>`;
  }
  return s;
}

// neve acumulada no chão (geada em qualquer base, telhados)
export function neveAcumulada(r, n, y0, y1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), k = 40 + r() * 90;
    s += `<ellipse cx="${x}" cy="${y}" rx="${k}" ry="${k * 0.16}" fill="#fff" fill-opacity=".55"/>`;
  }
  return s;
}

// areia fina ou poeira voando (maresia, tempestade de areia, nebulosa)
export function poeira(cor = '#e8d7a8', op = 0.35) {
  let s = '';
  for (let i = 0; i < 60; i++) {
    const x = -200 + (i * 137) % 2000, y = 300 + ((i * 71) % 560);
    s += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3)}" fill="${cor}" opacity="${op}"/>`;
  }
  return s;
}

export const img = (u, arq, x, y, t, cls = '') =>
  `<image ${cls ? `class="${cls}" ` : ''}href="${u(arq)}" x="${x}" y="${y}" width="${t}" height="${t}"/>`;

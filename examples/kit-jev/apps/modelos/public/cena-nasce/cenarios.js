// Os cenários da cena, desenhados em SVG, em camadas com profundidade (paralaxe): longe, meio, perto (o chão onde os
// personagens pisam) e frente; "luzes" é o que acende de noite (janelas, postes, vaga-lumes) e não escurece com a hora.
// Coordenadas do mundo: 1600 × 900 (cada camada tem 2000 de largura, de -200 a 1800, para a câmera poder andar).
// Para adaptar: troque o desenho de um lugar ou crie um novo com as mesmas cinco camadas (e o id em LUGARES do app.config).

const V = 'viewBox="-200 0 2000 900" preserveAspectRatio="none"';
const svg = (corpo, defs = '') => `<svg ${V} aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${corpo}</svg>`;
const lin = (id, cores, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${cores.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
const rad = (id, cores) => `<radialGradient id="${id}" cx=".5" cy=".5" r=".5">${cores.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;

// números pseudoaleatórios estáveis (o mesmo desenho sempre)
function rnd(semente) { let s = semente >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- peças ----------
function arvoreRedonda(x, y, t, c1 = '#7fd35a', c2 = '#3b8f3a', id = 'arv') {
  return `<g><rect x="${x - t * 0.07}" y="${y - t * 0.42}" width="${t * 0.14}" height="${t * 0.44}" rx="${t * 0.05}" fill="url(#${id}-tronco)"/>`
    + `<circle cx="${x - t * 0.18}" cy="${y - t * 0.52}" r="${t * 0.26}" fill="url(#${id}-copa)"/><circle cx="${x + t * 0.2}" cy="${y - t * 0.55}" r="${t * 0.27}" fill="url(#${id}-copa)"/>`
    + `<circle cx="${x}" cy="${y - t * 0.78}" r="${t * 0.3}" fill="url(#${id}-copa)"/><circle cx="${x - t * 0.08}" cy="${y - t * 0.86}" r="${t * 0.12}" fill="#fff" fill-opacity=".14"/></g>`;
}
const defsArvore = (id = 'arv', c1 = '#8fdc63', c2 = '#2f8a3b') => lin(`${id}-copa`, [[0, c1], [1, c2]], 0.4, 1) + lin(`${id}-tronco`, [[0, '#a8703f'], [1, '#6e4524']], 1, 0);
function pinheiro(x, y, t, cor = 'url(#pin)', neve = false) {
  let s = `<rect x="${x - t * 0.05}" y="${y - t * 0.16}" width="${t * 0.1}" height="${t * 0.17}" fill="#6e4524"/>`;
  for (let i = 0; i < 3; i++) {
    const yy = y - t * 0.12 - i * t * 0.27, w = t * (0.46 - i * 0.11), h = t * 0.38;
    s += `<path d="M${x - w} ${yy} L${x} ${yy - h} L${x + w} ${yy} Z" fill="${cor}"/>`;
    if (neve) s += `<path d="M${x - w * 0.55} ${yy - h * 0.45} L${x} ${yy - h} L${x + w * 0.55} ${yy - h * 0.45} Q${x} ${yy - h * 0.32} ${x - w * 0.55} ${yy - h * 0.45} Z" fill="#fff"/>`;
  }
  return s;
}
function tufos(r, n, y0, y1, cor, esc = 1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), h = (14 + r() * 16) * esc;
    s += `<path d="M${x} ${y} q-4 ${-h * 0.6} -9 ${-h} M${x} ${y} q1 ${-h * 0.7} 2 ${-h * 1.15} M${x} ${y} q5 ${-h * 0.5} 10 ${-h * 0.9}" stroke="${cor}" stroke-width="${3 * esc}" stroke-linecap="round" fill="none"/>`;
  }
  return s;
}
function florzinhas(r, n, y0, y1, cores) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -200 + r() * 2000, y = y0 + r() * (y1 - y0), c = cores[i % cores.length], k = 4 + r() * 3;
    s += `<g transform="translate(${x} ${y})"><circle cx="${-k}" r="${k}" fill="${c}"/><circle cx="${k}" r="${k}" fill="${c}"/><circle cy="${-k}" r="${k}" fill="${c}"/><circle cy="${k}" r="${k}" fill="${c}"/><circle r="${k * 0.8}" fill="#ffd84a"/></g>`;
  }
  return s;
}
function estrelaDoMar(x, y, t, cor) {
  const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? t * 0.42 : t; p.push(`${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr * 0.62).toFixed(1)}`); }
  return `<path d="M${p.join(' L')} Z" fill="${cor}" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linejoin="round"/>`;
}
function concha(x, y, t, cor) {
  return `<g transform="translate(${x} ${y})"><path d="M${-t} 0 Q0 ${-t * 1.5} ${t} 0 Z" fill="${cor}"/><path d="M0 0 L${-t * 0.5} ${-t * 0.8} M0 0 L0 ${-t * 0.95} M0 0 L${t * 0.5} ${-t * 0.8}" stroke="#fff" stroke-opacity=".6" stroke-width="2"/></g>`;
}
const img = (u, arq, x, y, t, cls = '') => `<image ${cls ? `class="${cls}" ` : ''}href="${u(arq)}" x="${x}" y="${y}" width="${t}" height="${t}"/>`;

// ---------- os lugares ----------
// cada um devolve { longe, meio, perto, frente, luzes } (strings SVG) + chao (y do chão, para a neve assentar)
const LUGARES = {
  campo: () => {
    const r = rnd(7);
    return {
      chao: 668,
      longe: svg(`<path d="M-200 600 C0 520 200 540 420 585 C620 530 820 505 1020 560 C1220 520 1500 530 1800 585 L1800 720 L-200 720 Z" fill="url(#ca-l)"/>`, lin('ca-l', [[0, '#b9e3c0'], [1, '#93cfa2']])),
      meio: svg(`<path d="M-200 650 C100 575 320 605 520 640 C760 578 1020 588 1220 628 C1420 596 1620 598 1800 628 L1800 780 L-200 780 Z" fill="url(#ca-m)"/>`
        + arvoreRedonda(150, 646, 230, 0, 0, 'ca-a') + arvoreRedonda(1360, 640, 260, 0, 0, 'ca-a') + arvoreRedonda(1580, 650, 180, 0, 0, 'ca-a'),
      lin('ca-m', [[0, '#9fdc78'], [1, '#62b04c']]) + defsArvore('ca-a')),
      perto: svg(`<path d="M-200 672 C200 652 600 670 820 664 C1120 656 1420 670 1800 662 L1800 900 L-200 900 Z" fill="url(#ca-c)"/>`
        + `<path d="M700 900 C760 820 830 760 880 708 C902 686 920 672 948 666 L972 666 C956 684 946 704 938 726 C918 786 914 846 934 900 Z" fill="#ecd29a" fill-opacity=".9"/>`
        + florzinhas(r, 26, 690, 880, ['#ffffff', '#ff8fb5', '#ffd84a', '#c4a5ff']) + tufos(r, 34, 690, 890, '#3f8f34'),
      lin('ca-c', [[0, '#8fd666'], [1, '#4c9c39']])),
      frente: svg(tufos(rnd(9), 18, 862, 900, '#2f7a2a', 2.2)),
      luzes: '',
    };
  },

  praia: (u) => {
    const r = rnd(11);
    let cint = '';
    for (let i = 0; i < 26; i++) cint += `<rect class="cn-cintila" style="animation-delay:${(r() * 4).toFixed(2)}s" x="${-150 + r() * 1900}" y="${560 + r() * 120}" width="${18 + r() * 40}" height="3" rx="1.5" fill="#fff" fill-opacity=".8"/>`;
    let conchas = '';
    for (let i = 0; i < 9; i++) conchas += i % 3 === 0 ? estrelaDoMar(-120 + r() * 1840, 760 + r() * 120, 14 + r() * 8, ['#ff8a65', '#ff6f91', '#ffb74d'][i % 3]) : concha(-120 + r() * 1840, 760 + r() * 120, 10 + r() * 7, ['#ffd1dc', '#fff1c1', '#ffc8a8'][i % 3]);
    return {
      chao: 706, agua: [560, 690],
      longe: svg(`<rect x="-200" y="548" width="2000" height="160" fill="url(#pr-mar)"/><rect x="-200" y="546" width="2000" height="5" fill="#d9f4ff" fill-opacity=".8"/>`
        + `<path d="M-60 552 C0 520 130 516 210 552 Z" fill="#79c47a"/><path d="M90 540 q6 -36 2 -62 M92 478 q-30 4 -46 22 M92 478 q28 0 44 20 M92 478 q-12 -16 -34 -18 M92 478 q14 -16 34 -14" stroke="#3e8f4a" stroke-width="5" fill="none" stroke-linecap="round"/>` + cint,
      lin('pr-mar', [[0, '#2d7fd8'], [0.55, '#2fa6e2'], [1, '#56d6e2']])),
      meio: svg(`<path class="cn-onda" d="M-260 694 C-120 678 20 704 160 688 C300 672 440 700 580 686 C720 672 860 702 1000 686 C1140 670 1280 702 1420 688 C1560 674 1700 700 1860 688 L1860 716 L-260 716 Z" fill="#fff" fill-opacity=".88"/>`
        + `<rect x="-200" y="706" width="2000" height="20" fill="#e2c086" fill-opacity=".8"/>`),
      perto: svg(`<path d="M-200 712 C200 702 600 718 1000 708 C1300 700 1600 714 1800 706 L1800 900 L-200 900 Z" fill="url(#pr-areia)"/>` + conchas
        + `<g transform="translate(1440 0)"><path d="M18 790 L-6 560" stroke="#8a6a52" stroke-width="9" stroke-linecap="round"/><path d="M-150 600 Q-6 470 140 560 Z" fill="#ff5d6c"/><path d="M-150 600 Q-110 540 -60 552 Q-40 540 -6 560 Q-30 520 -150 600 Z" fill="#fff"/><path d="M-6 560 Q50 520 140 560 Q80 548 40 566 Z" fill="#fff"/></g>`
        + `<g transform="translate(1250 812) rotate(-6)"><rect x="-90" y="-26" width="180" height="52" rx="8" fill="#38bdf8"/><rect x="-90" y="-10" width="180" height="12" fill="#fff" fill-opacity=".85"/></g>`,
      lin('pr-areia', [[0, '#ffe8b3'], [1, '#efbf74']])),
      frente: svg(tufos(rnd(5), 8, 870, 900, '#9bbf62', 2)),
      luzes: svg(`<g class="cn-reflexo">${Array.from({ length: 9 }, (_, i) => `<rect x="${1150 - i * 6 + (i % 2) * 22}" y="${566 + i * 13}" width="${70 + i * 10}" height="4" rx="2" fill="#fff6c8" fill-opacity="${0.75 - i * 0.05}"/>`).join('')}</g>`),
    };
  },

  floresta: (u) => {
    const r = rnd(21);
    let longe = '';
    for (let i = 0; i < 22; i++) { const x = -200 + i * 95 + r() * 40, h = 150 + r() * 120; longe += `<path d="M${x - h * 0.32} 660 L${x} ${660 - h} L${x + h * 0.32} 660 Z" fill="url(#fl-l)"/>`; }
    let meio = '';
    [[-60, 1.15], [260, 0.95], [1330, 1.05], [1660, 1.2]].forEach(([x, k]) => { meio += arvoreRedonda(x, 690, 420 * k, 0, 0, 'fl-a'); });
    for (let i = 0; i < 8; i++) meio += pinheiro(420 + i * 120 + r() * 50, 676, 170 + r() * 70, 'url(#fl-p)');
    let vaga = '';
    for (let i = 0; i < 26; i++) vaga += `<circle class="cn-vagalume" style="animation-delay:${(r() * 3).toFixed(2)}s;animation-duration:${(2 + r() * 2).toFixed(2)}s" cx="${-150 + r() * 1900}" cy="${430 + r() * 300}" r="${4 + r() * 3}" fill="url(#fl-luz)"/>`;
    const cogs = [[140, 760], [1180, 790], [1500, 748]].map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-5" y="-16" width="10" height="18" rx="4" fill="#f4ead9"/><path d="M-20 -14 Q0 -40 20 -14 Z" fill="#e5484d"/><circle cx="-7" cy="-22" r="3" fill="#fff"/><circle cx="6" cy="-26" r="2.5" fill="#fff"/></g>`).join('');
    return {
      chao: 682,
      longe: svg(`<rect x="-200" y="560" width="2000" height="120" fill="#a9d2bd" fill-opacity=".6"/>` + longe, lin('fl-l', [[0, '#8fc4a8'], [1, '#6fae8e']])),
      meio: svg(meio + `<g class="cn-raios"><path d="M380 260 L520 260 L760 700 L560 700 Z" fill="#fff" fill-opacity=".1"/><path d="M900 240 L980 240 L1180 700 L1060 700 Z" fill="#fff" fill-opacity=".08"/></g>`,
        defsArvore('fl-a', '#6cc44c', '#24733a') + lin('fl-p', [[0, '#4e9e5c'], [1, '#2c6b40']])),
      perto: svg(`<path d="M-200 686 C200 672 600 690 1000 680 C1300 672 1600 688 1800 680 L1800 900 L-200 900 Z" fill="url(#fl-c)"/>`
        + `<g transform="translate(-40 780)"><rect x="0" y="-34" width="260" height="56" rx="28" fill="#8b5a33"/><ellipse cx="258" cy="-6" rx="20" ry="28" fill="#d9ab78"/><ellipse cx="258" cy="-6" rx="11" ry="16" fill="none" stroke="#a87443" stroke-width="3"/></g>`
        + cogs + tufos(r, 40, 700, 890, '#2c6b2a') + florzinhas(r, 12, 720, 880, ['#ffffff', '#ffe066']),
      lin('fl-c', [[0, '#5aa64a'], [1, '#2e6a2c']])),
      frente: svg(`<g fill="#245e2b"><circle cx="-120" cy="900" r="120"/><circle cx="20" cy="930" r="110"/><circle cx="1700" cy="905" r="130"/><circle cx="1560" cy="940" r="100"/></g>` + tufos(rnd(3), 14, 860, 900, '#1f5223', 2.4)),
      luzes: svg(vaga, rad('fl-luz', [[0, '#f9ff9e'], [0.4, '#d6ff5c', 0.9], [1, '#a3e635', 0]])),
    };
  },

  cidade: () => {
    const r = rnd(31);
    let longe = '';
    for (let i = 0; i < 18; i++) { const x = -200 + i * 115, h = 160 + r() * 200, w = 90 + r() * 40; longe += `<rect x="${x}" y="${660 - h}" width="${w}" height="${h}" fill="url(#ci-l)"/>`; }
    const cores = [['#ff8f7e', '#e2604f'], ['#ffd36e', '#e7a93c'], ['#6fd3c2', '#36a596'], ['#b9a2f0', '#8467d6'], ['#86c9f5', '#4b97d6'], ['#ffb38a', '#e57f52']];
    let defs = lin('ci-l', [[0, '#b4c6e2'], [1, '#93a9cc']]) + lin('ci-chao', [[0, '#dde3ea'], [1, '#c7cfda']]) + rad('ci-poste', [[0, '#fff3b0', 0.85], [1, '#ffd36b', 0]]);
    let meio = '', luzes = '';
    const predios = [[-170, 300, 330], [150, 250, 400], [420, 270, 300], [1000, 260, 380], [1270, 240, 320], [1500, 300, 410]];
    predios.forEach(([x, w, h], i) => {
      const [c1, c2] = cores[i % cores.length]; defs += lin(`ci-p${i}`, [[0, c1], [1, c2]], 0.6, 1);
      const y = 680 - h;
      meio += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#ci-p${i})"/><rect x="${x - 8}" y="${y - 14}" width="${w + 16}" height="18" rx="5" fill="${c2}"/>`;
      for (let yy = y + 30; yy < 600; yy += 62) for (let xx = x + 26; xx < x + w - 40; xx += 58) {
        meio += `<rect x="${xx}" y="${yy}" width="34" height="40" rx="5" fill="#eaf6ff" fill-opacity=".92"/><rect x="${xx}" y="${yy}" width="34" height="8" rx="3" fill="#fff"/>`;
        if (r() < 0.72) luzes += `<rect class="cn-janela" x="${xx}" y="${yy}" width="34" height="40" rx="5" fill="#ffd56b"/>`;
      }
      meio += `<rect x="${x + w / 2 - 26}" y="${600}" width="52" height="80" rx="6" fill="#5b4636"/><circle cx="${x + w / 2 + 14}" cy="644" r="4" fill="#ffd36b"/>`;
      if (i % 2 === 0) meio += `<path d="M${x + w / 2 - 50} 600 L${x + w / 2 + 50} 600 L${x + w / 2 + 40} 584 L${x + w / 2 - 40} 584 Z" fill="#fff"/><path d="M${x + w / 2 - 50} 600 L${x + w / 2 + 50} 600 L${x + w / 2 + 50} 612 L${x + w / 2 - 50} 612 Z" fill="${c2}"/>`;
    });
    [380, 1180].forEach((x) => {
      meio += `<rect x="${x - 6}" y="500" width="12" height="190" rx="5" fill="#3c4a63"/><path d="M${x} 506 q0 -26 32 -26" stroke="#3c4a63" stroke-width="10" fill="none" stroke-linecap="round"/><rect x="${x + 18}" y="476" width="34" height="14" rx="6" fill="#3c4a63"/><ellipse cx="${x + 35}" cy="492" rx="12" ry="5" fill="#fff4c4"/>`;
      luzes += `<path d="M${x + 35} 492 L${x - 70} 700 L${x + 140} 700 Z" fill="url(#ci-poste)" fill-opacity=".55"/><circle cx="${x + 35}" cy="492" r="20" fill="url(#ci-poste)"/>`;
    });
    return {
      chao: 690,
      longe: svg(longe, defs),
      meio: svg(meio),
      perto: svg(`<rect x="-200" y="680" width="2000" height="86" fill="url(#ci-chao)"/>`
        + Array.from({ length: 21 }, (_, i) => `<path d="M${-200 + i * 100} 680 l-14 86" stroke="#b6c0cd" stroke-width="3"/>`).join('')
        + `<rect x="-200" y="762" width="2000" height="12" fill="#a9b3c2"/><rect x="-200" y="774" width="2000" height="126" fill="#5d6779"/>`
        + Array.from({ length: 10 }, (_, i) => `<rect x="${-160 + i * 200}" y="832" width="110" height="10" rx="5" fill="#fff" fill-opacity=".85"/>`).join('')
        + `<g transform="translate(1540 760)"><rect x="-14" y="-60" width="28" height="60" rx="8" fill="#e5484d"/><rect x="-22" y="-44" width="44" height="12" rx="6" fill="#c2353a"/><ellipse cx="0" cy="-60" rx="16" ry="8" fill="#ff6b6b"/></g>`
        + `<g transform="translate(70 742)"><rect x="-80" y="-40" width="160" height="14" rx="6" fill="#a8703f"/><rect x="-80" y="-66" width="160" height="12" rx="6" fill="#c18a52"/><rect x="-70" y="-28" width="10" height="30" fill="#3c4a63"/><rect x="60" y="-28" width="10" height="30" fill="#3c4a63"/></g>`),
      frente: '',
      luzes: svg(luzes),
    };
  },

  espaco: () => {
    const r = rnd(41);
    let crateras = '';
    for (let i = 0; i < 12; i++) { const x = -150 + r() * 1900, y = 720 + r() * 160, t = 24 + r() * 50; crateras += `<ellipse cx="${x}" cy="${y}" rx="${t}" ry="${t * 0.32}" fill="#8f87ad"/><ellipse cx="${x + 3}" cy="${y + 3}" rx="${t * 0.82}" ry="${t * 0.24}" fill="#b4accd"/>`; }
    return {
      chao: 690, ceu: 'espaco',
      longe: svg(`<g class="cn-planeta"><circle cx="1240" cy="410" r="88" fill="url(#es-sat)"/><ellipse cx="1240" cy="410" rx="164" ry="32" fill="none" stroke="#ffe0b0" stroke-width="15" stroke-opacity=".85" transform="rotate(-16 1240 410)"/><path d="M1154 420 A88 88 0 0 0 1326 400" fill="none" stroke="#ffe0b0" stroke-width="15" stroke-opacity=".85" transform="rotate(-16 1240 410)"/></g>`
        + `<g><circle cx="230" cy="350" r="66" fill="url(#es-terra)"/><path d="M190 320 q24 -14 40 4 q-6 22 -30 26 q-18 -8 -10 -30 Z M250 368 q22 -6 30 12 q-12 18 -34 8 Z" fill="#62c46a"/><path d="M180 352 q30 -10 60 0 M220 300 q24 -6 44 4" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-opacity=".75" fill="none"/></g>`
        + `<circle cx="560" cy="300" r="14" fill="#c9b8ff"/><circle cx="1010" cy="260" r="9" fill="#ffb3c7"/>`,
      rad('es-sat', [[0, '#ffd08a'], [0.7, '#f08a4b'], [1, '#c4552e']]) + rad('es-terra', [[0, '#7cc8ff'], [1, '#1f5fb8']])),
      meio: svg(`<path d="M-200 668 C40 610 260 640 460 660 C700 612 980 620 1200 656 C1400 622 1620 628 1800 650 L1800 760 L-200 760 Z" fill="url(#es-m)"/>`, lin('es-m', [[0, '#8f88b4'], [1, '#6c6590']])),
      perto: svg(`<path d="M-200 694 C200 676 600 696 1000 684 C1300 676 1600 692 1800 684 L1800 900 L-200 900 Z" fill="url(#es-c)"/>` + crateras
        + `<g fill="#9a92ba"><ellipse cx="1520" cy="780" rx="40" ry="20"/><ellipse cx="80" cy="836" rx="30" ry="14"/></g>`, lin('es-c', [[0, '#ddd8ee'], [1, '#a59dc2']])),
      frente: '',
      luzes: '',
    };
  },

  fundo_do_mar: (u) => {
    const r = rnd(51);
    let algas = '';
    for (let i = 0; i < 9; i++) { const x = -150 + r() * 1900, h = 160 + r() * 160; algas += `<path class="cn-alga" style="animation-delay:-${(r() * 3).toFixed(2)}s;transform-origin:${x}px 700px" d="M${x} 700 C${x - 30} ${700 - h * 0.3} ${x + 30} ${700 - h * 0.6} ${x} ${700 - h}" stroke="url(#fm-alga)" stroke-width="${12 + r() * 8}" stroke-linecap="round" fill="none"/>`; }
    const coral = (x, y, k, cor) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0 C-4 -40 -30 -60 -40 -90 M0 0 C2 -50 0 -80 4 -120 M0 0 C10 -40 40 -56 46 -86 M4 -70 C20 -80 24 -96 30 -104 M-22 -60 C-34 -70 -50 -74 -56 -84" stroke="${cor}" stroke-width="14" stroke-linecap="round" fill="none"/></g>`;
    const leque = (x, y, k, cor) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0 C-70 -30 -80 -110 -40 -140 C-10 -160 30 -160 50 -130 C80 -100 60 -30 0 0 Z" fill="${cor}" fill-opacity=".9"/><path d="M0 0 L-40 -130 M0 0 L0 -150 M0 0 L40 -120" stroke="#fff" stroke-opacity=".35" stroke-width="4"/></g>`;
    const tubos = (x, y, cor) => `<g fill="${cor}"><rect x="${x}" y="${y - 70}" width="26" height="70" rx="12"/><rect x="${x + 30}" y="${y - 100}" width="28" height="100" rx="13"/><rect x="${x + 62}" y="${y - 54}" width="24" height="54" rx="11"/></g><g fill="#2b1a4a" fill-opacity=".5"><ellipse cx="${x + 13}" cy="${y - 66}" rx="9" ry="4"/><ellipse cx="${x + 44}" cy="${y - 96}" rx="10" ry="4"/><ellipse cx="${x + 74}" cy="${y - 50}" rx="8" ry="4"/></g>`;
    const peixes = [[0, 420, 70, 26, 1], [1, 500, 54, 34, -1], [2, 360, 46, 30, 1], [3, 560, 60, 22, -1]].map(([i, y, t, d, s]) => `<g class="cn-peixe" style="animation-duration:${d}s;animation-delay:-${i * 6}s;--s:${s}"><image href="${u('dec-peixe.png')}" x="-30" y="${y}" width="${t}" height="${t}"/></g>`).join('');
    return {
      chao: 700, ceu: 'agua',
      longe: svg(`<path d="M-200 700 L-200 560 C-100 520 0 600 120 560 C240 520 300 610 420 600 L520 700 Z M1100 700 L1200 590 C1300 540 1420 600 1520 560 C1640 520 1720 590 1800 570 L1800 700 Z" fill="#2c78b4" fill-opacity=".55"/>`),
      meio: svg(algas + coral(80, 704, 1.3, '#ff7fb0') + leque(260, 704, 1.1, '#ffa94d') + tubos(1250, 704, '#a98bff') + coral(1460, 706, 1.2, '#ff6b8b') + leque(1640, 704, 1.25, '#ffcc4d') + `<circle cx="1120" cy="690" r="38" fill="#f2a35a"/><path d="M1094 690 q26 -20 52 0 M1094 702 q26 -20 52 0" stroke="#d9823a" stroke-width="4" fill="none"/>` + peixes,
      lin('fm-alga', [[0, '#3fbf74'], [1, '#2a8a54']])),
      perto: svg(`<path d="M-200 712 C200 698 600 716 1000 704 C1300 698 1600 712 1800 704 L1800 900 L-200 900 Z" fill="url(#fm-c)"/>`
        + estrelaDoMar(240, 800, 26, '#ff7a59') + estrelaDoMar(1380, 840, 22, '#ffb84d') + concha(560, 860, 16, '#ffd1e1') + concha(1060, 796, 14, '#fff0c8')
        + `<g fill="#a8a28c"><ellipse cx="900" cy="860" rx="46" ry="18"/><ellipse cx="1620" cy="790" rx="34" ry="14"/></g>`, lin('fm-c', [[0, '#eedcb0'], [1, '#bfa77c']])),
      frente: svg(`<path class="cn-alga" style="transform-origin:30px 900px" d="M30 900 C-10 800 90 730 30 640" stroke="#1f7a4a" stroke-width="30" stroke-linecap="round" fill="none"/><path class="cn-alga" style="animation-delay:-1.4s;transform-origin:1570px 900px" d="M1570 900 C1530 800 1630 730 1570 650" stroke="#1f7a4a" stroke-width="30" stroke-linecap="round" fill="none"/>`),
      luzes: '',
    };
  },

  castelo: () => {
    const r = rnd(61);
    const janela = (x, y) => `<path d="M${x} ${y + 44} L${x} ${y + 14} Q${x + 14} ${y - 6} ${x + 28} ${y + 14} L${x + 28} ${y + 44} Z" fill="#5d3a92"/>`;
    const jLuz = (x, y) => `<path class="cn-janela" d="M${x} ${y + 44} L${x} ${y + 14} Q${x + 14} ${y - 6} ${x + 28} ${y + 14} L${x + 28} ${y + 44} Z" fill="#ffd56b"/>`;
    const ameias = (x0, x1, y) => { let s = ''; for (let x = x0; x < x1 - 10; x += 44) s += `<rect x="${x}" y="${y - 30}" width="26" height="34" rx="4" fill="url(#cs-pedra)"/>`; return s; };
    const torre = (x, w, y, cor) => `<rect x="${x}" y="${y}" width="${w}" height="${690 - y}" rx="8" fill="url(#cs-pedra)"/><path d="M${x - 16} ${y + 4} L${x + w / 2} ${y - w * 1.25} L${x + w + 16} ${y + 4} Z" fill="url(#${cor})"/><path d="M${x + w / 2} ${y - w * 1.25} l0 -46" stroke="#8a6a52" stroke-width="5"/><path class="cn-bandeira" style="transform-origin:${x + w / 2}px ${y - w * 1.25 - 44}px" d="M${x + w / 2} ${y - w * 1.25 - 46} l52 12 l-52 14 Z" fill="#38bdf8"/>`;
    let pedras = '';
    for (let i = 0; i < 16; i++) { const t = 1 - i / 16, y = 900 - i * 14, w = 340 * t + 70; pedras += `<ellipse cx="${800 + (r() - 0.5) * 20}" cy="${y}" rx="${w / 2}" ry="7" fill="#d9d2c6" fill-opacity="${0.5 + r() * 0.4}"/>`; }
    return {
      chao: 690,
      longe: svg(`<path d="M-200 600 L80 400 L300 560 L520 420 L760 590 L-200 660 Z M900 600 L1180 420 L1400 560 L1620 400 L1800 520 L1800 660 Z" fill="#b5c3e6" fill-opacity=".75"/>`
        + `<path d="M-200 650 C100 590 400 610 700 640 C1000 600 1300 600 1800 640 L1800 720 L-200 720 Z" fill="#9fd090"/>`),
      meio: svg(torre(480, 110, 440, 'cs-telha') + torre(1010, 110, 440, 'cs-telha') + torre(750, 100, 404, 'cs-telha2')
        + `<rect x="560" y="480" width="480" height="210" fill="url(#cs-pedra)"/>` + ameias(560, 1040, 480)
        + janela(600, 530) + janela(970, 530) + janela(786, 446) + janela(506, 490) + janela(1052, 490)
        + `<path d="M736 690 L736 610 Q800 548 864 610 L864 690 Z" fill="url(#cs-portao)"/><path d="M756 618 V690 M780 594 V690 M804 584 V690 M828 592 V690 M848 612 V690 M740 636 H860 M738 662 H862" stroke="#2a1650" stroke-width="5" stroke-opacity=".6"/>`
        + `<path d="M560 560 H1040" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>`,
      lin('cs-pedra', [[0, '#f6eef9'], [1, '#d3c4e0']], 0.4, 1) + lin('cs-telha', [[0, '#ff6b8a'], [1, '#c2245a']]) + lin('cs-telha2', [[0, '#b68cff'], [1, '#7c4ddb']]) + lin('cs-portao', [[0, '#8c5cd6'], [1, '#43217f']])),
      perto: svg(`<path d="M-200 694 C200 680 600 698 1000 688 C1300 680 1600 694 1800 686 L1800 900 L-200 900 Z" fill="url(#cs-c)"/>` + pedras
        + florzinhas(r, 22, 710, 880, ['#ff8fb5', '#fff', '#c4a5ff', '#ffd84a']) + tufos(r, 28, 700, 890, '#3f8f34'), lin('cs-c', [[0, '#93d870'], [1, '#55a43f']])),
      frente: svg(`<g><circle cx="-90" cy="890" r="110" fill="#3f8f3a"/><circle cx="1690" cy="896" r="120" fill="#3f8f3a"/></g><g fill="#ff6b9a">${Array.from({ length: 10 }, (_, i) => `<circle cx="${i < 5 ? -150 + i * 30 : 1610 + (i - 5) * 30}" cy="${830 + (i % 3) * 18}" r="9"/>`).join('')}</g>`),
      luzes: svg(jLuz(600, 530) + jLuz(970, 530) + jLuz(786, 446) + jLuz(506, 490) + jLuz(1052, 490)
        + `<g class="cn-tocha"><circle cx="716" cy="620" r="26" fill="url(#cs-fogo)"/><circle cx="884" cy="620" r="26" fill="url(#cs-fogo)"/></g>`, rad('cs-fogo', [[0, '#fff1a8'], [0.5, '#ffb347', 0.8], [1, '#ff7a1a', 0]])),
    };
  },

  deserto: (u) => {
    const r = rnd(71);
    let ondas = '';
    for (let i = 0; i < 14; i++) { const y = 720 + i * 13 + r() * 8; ondas += `<path d="M${-200 + r() * 400} ${y} q120 -10 240 0 t240 0" stroke="#e2a259" stroke-opacity=".45" stroke-width="3" fill="none"/>`; }
    return {
      chao: 694,
      longe: svg(`<path d="M-200 640 C100 590 360 600 600 630 C860 590 1180 596 1500 628 C1640 610 1720 612 1800 620 L1800 720 L-200 720 Z" fill="#f6d6a3"/>`
        + `<path d="M40 640 L60 520 L260 520 L290 640 Z" fill="#e3a77a"/><path d="M60 520 L260 520 L250 540 L70 540 Z" fill="#d38f62"/>`
        + `<path d="M1180 640 L1300 470 L1420 640 Z" fill="#efc489"/><path d="M1300 470 L1420 640 L1340 640 Z" fill="#d9a465"/><path d="M1400 640 L1480 530 L1560 640 Z" fill="#efc489"/><path d="M1480 530 L1560 640 L1508 640 Z" fill="#d9a465"/>`),
      meio: svg(`<path d="M-200 690 C120 620 380 640 640 676 C900 630 1200 640 1460 670 C1600 650 1700 656 1800 664 L1800 780 L-200 780 Z" fill="url(#de-m)"/>`
        + img(u, 'dec-cacto.png', 200, 470, 220) + img(u, 'dec-cacto.png', 1340, 520, 170), lin('de-m', [[0, '#f8cb86'], [1, '#e9a75c']])),
      perto: svg(`<path d="M-200 698 C200 684 600 702 1000 692 C1300 684 1600 698 1800 690 L1800 900 L-200 900 Z" fill="url(#de-c)"/>` + ondas
        + `<g fill="#c9925e"><ellipse cx="320" cy="820" rx="44" ry="20"/><ellipse cx="1480" cy="860" rx="36" ry="16"/><ellipse cx="1500" cy="846" rx="22" ry="12" fill="#d9a46c"/></g>`, lin('de-c', [[0, '#ffdca0'], [1, '#efb664']])),
      frente: svg(img(u, 'dec-cacto.png', 1650, 760, 150)),
      luzes: '',
    };
  },

  montanha_nevada: () => {
    const r = rnd(81);
    const monte = (x, y, w, c) => `<path d="M${x - w} 690 L${x} ${y} L${x + w} 690 Z" fill="${c}"/><path d="M${x - w * 0.36} ${y + (690 - y) * 0.36} L${x} ${y} L${x + w * 0.36} ${y + (690 - y) * 0.36} L${x + w * 0.18} ${y + (690 - y) * 0.3} L${x + w * 0.06} ${y + (690 - y) * 0.4} L${x - w * 0.1} ${y + (690 - y) * 0.3} Z" fill="#fff"/>`;
    let pins = '';
    [[-60, 690, 200], [330, 700, 150], [1380, 690, 220], [1510, 700, 170], [1640, 692, 200]].forEach(([x, y, t]) => { pins += pinheiro(x, y, t, 'url(#mn-p)', true); });
    // o iglu fica no fundo, à esquerda (fora do lugar onde entram os objetos grandes)
    const iglu = `<g transform="translate(150 694) scale(.78)"><path d="M-120 0 A120 112 0 0 1 120 0 Z" fill="url(#mn-iglu)"/><path d="M-110 -38 H110 M-92 -72 H92 M-56 -100 H56 M-60 0 V-38 M10 0 V-38 M70 0 V-38 M-30 -38 V-72 M40 -38 V-72" stroke="#b9cbe6" stroke-width="4"/><path d="M-40 0 V-36 A40 40 0 0 1 40 -36 V0 Z" fill="#4b5f86"/></g>`;
    return {
      chao: 694,
      longe: svg(monte(240, 300, 480, 'url(#mn-l)') + monte(820, 270, 520, 'url(#mn-l2)') + monte(1400, 320, 460, 'url(#mn-l)'), lin('mn-l', [[0, '#a9b9dd'], [1, '#7f92bc']]) + lin('mn-l2', [[0, '#bccaea'], [1, '#8b9dc6']])),
      meio: svg(`<path d="M-200 690 C120 630 400 650 660 676 C920 640 1220 646 1480 672 C1620 654 1720 658 1800 664 L1800 780 L-200 780 Z" fill="url(#mn-m)"/>` + pins + iglu,
        lin('mn-m', [[0, '#f4f8ff'], [1, '#d3e0f3']]) + lin('mn-p', [[0, '#3f8f6a'], [1, '#235c45']]) + lin('mn-iglu', [[0, '#ffffff'], [1, '#d2def2']])),
      perto: svg(`<path d="M-200 698 C200 684 600 702 1000 692 C1300 684 1600 698 1800 690 L1800 900 L-200 900 Z" fill="url(#mn-c)"/>`
        + `<path d="M-200 760 C100 740 300 770 600 752 M900 800 C1200 780 1400 812 1800 790" stroke="#c9d8ef" stroke-width="10" fill="none" stroke-linecap="round"/>`,
      lin('mn-c', [[0, '#ffffff'], [1, '#d6e3f5']])),
      frente: svg(`<g fill="#eef4ff"><ellipse cx="-80" cy="900" rx="200" ry="60"/><ellipse cx="1700" cy="900" rx="220" ry="64"/></g>`),
      luzes: '',
    };
  },

  fazenda: () => {
    const r = rnd(91);
    let cerca = '';
    for (let x = -200; x < 980; x += 70) cerca += `<rect x="${x}" y="606" width="16" height="82" rx="4" fill="#c99560"/>`;
    cerca += `<rect x="-200" y="622" width="1180" height="12" rx="5" fill="#d9a46c"/><rect x="-200" y="652" width="1180" height="12" rx="5" fill="#d9a46c"/>`;
    let horta = '';
    for (let i = 0; i < 4; i++) { horta += `<rect x="${-160}" y="${790 + i * 26}" width="380" height="14" rx="7" fill="#9b6a3f"/>`; for (let j = 0; j < 9; j++) horta += `<path d="M${-140 + j * 42} ${792 + i * 26} q-8 -14 -2 -22 M${-140 + j * 42} ${792 + i * 26} q8 -14 2 -22" stroke="#3faa48" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
    return {
      chao: 694,
      longe: svg(`<path d="M-200 610 C80 540 360 560 640 600 C900 548 1200 552 1500 590 C1640 572 1720 574 1800 582 L1800 720 L-200 720 Z" fill="#bde39b"/>`
        + `<path d="M200 600 C400 560 600 570 800 596 L800 620 C600 600 400 596 200 620 Z" fill="#ede48c"/><path d="M1000 590 C1200 560 1380 562 1560 586 L1560 606 C1380 590 1200 588 1000 610 Z" fill="#a6d77c"/>`),
      meio: svg(`<path d="M-200 668 C120 620 400 636 660 660 C920 626 1220 632 1480 656 C1620 640 1720 644 1800 650 L1800 780 L-200 780 Z" fill="url(#fz-m)"/>` + cerca
        + `<g><rect x="1160" y="470" width="300" height="220" fill="url(#fz-celeiro)"/><path d="M1140 480 L1310 360 L1480 480 Z" fill="#7a2a24"/><path d="M1140 480 L1310 360 L1480 480" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>`
        + `<rect x="1250" y="560" width="120" height="130" fill="#8c2f27"/><path d="M1250 560 L1370 690 M1370 560 L1250 690" stroke="#fff" stroke-width="9"/><rect x="1250" y="560" width="120" height="130" fill="none" stroke="#fff" stroke-width="9"/>`
        + `<rect x="1280" y="420" width="60" height="50" fill="#5a1f1a"/><rect x="1280" y="420" width="60" height="50" fill="none" stroke="#fff" stroke-width="6"/></g>`
        + `<g><rect x="1490" y="420" width="110" height="270" rx="10" fill="url(#fz-silo)"/><path d="M1490 426 Q1545 340 1600 426 Z" fill="#9aa3b5"/><path d="M1490 470 H1600 M1490 530 H1600 M1490 590 H1600" stroke="#a3aab8" stroke-width="5"/></g>`
        + `<g><path d="M40 690 Q120 560 200 690 Z" fill="url(#fz-feno)"/><path d="M70 640 q40 -20 80 0 M60 668 q60 -20 120 0" stroke="#d1a43c" stroke-width="5" fill="none"/></g>`,
      lin('fz-m', [[0, '#a6dc7c'], [1, '#69b24e']]) + lin('fz-celeiro', [[0, '#e8574a'], [1, '#b2382e']]) + lin('fz-silo', [[0, '#e3e7ef'], [1, '#aeb6c6']], 1, 0) + lin('fz-feno', [[0, '#ffe08a'], [1, '#e2b04a']])),
      perto: svg(`<path d="M-200 698 C200 684 600 702 1000 692 C1300 684 1600 698 1800 690 L1800 900 L-200 900 Z" fill="url(#fz-c)"/>` + horta
        + `<g transform="translate(1560 800)"><ellipse cx="0" cy="0" rx="70" ry="52" fill="url(#fz-feno)"/><ellipse cx="-50" cy="0" rx="20" ry="50" fill="#f0c862"/><path d="M-50 -46 v92" stroke="#d1a43c" stroke-width="4"/></g>`
        + florzinhas(r, 16, 712, 880, ['#fff', '#ffd84a', '#ff8fb5']) + tufos(r, 26, 700, 890, '#3f8f34'), lin('fz-c', [[0, '#9ad66d'], [1, '#5aa241']])),
      frente: svg(tufos(rnd(4), 16, 860, 900, '#c9a84a', 2.6)),
      luzes: svg(`<rect class="cn-janela" x="1280" y="420" width="60" height="50" fill="#ffd56b"/><circle cx="1230" cy="540" r="40" fill="url(#fz-lampiao)"/><rect x="1222" y="530" width="16" height="22" rx="4" fill="#ffe8a0"/>`, rad('fz-lampiao', [[0, '#fff1a8', 0.9], [1, '#ffb347', 0]])),
    };
  },

  escola: (u) => {
    const r = rnd(101);
    let livros = '';
    for (let p = 0; p < 3; p++) for (let i = 0; i < 9; i++) { const h = 60 + r() * 26; livros += `<rect x="${1430 + i * 26}" y="${p * 110 + 512 - h}" width="22" height="${h}" rx="3" fill="${['#ef4444', '#38bdf8', '#a3e635', '#fbbf24', '#a78bfa', '#fb923c'][(i + p) % 6]}"/>`; }
    let bandeirinhas = '';
    'ABCDEFGHIJ'.split('').forEach((l, i) => { const x = 520 + i * 70; bandeirinhas += `<path d="M${x} 296 l60 0 l-30 50 Z" fill="${['#ef4444', '#38bdf8', '#a3e635', '#fbbf24', '#a78bfa'][i % 5]}"/><text x="${x + 30}" y="324" font-family="Onest, sans-serif" font-weight="800" font-size="24" fill="#fff" text-anchor="middle">${l}</text>`; });
    return {
      chao: 700, interior: true,
      longe: svg(`<path fill-rule="evenodd" d="M-200 0 H1800 V900 H-200 Z M110 330 H420 V570 H110 Z" fill="url(#esc-p)"/>`
        + `<rect x="-200" y="570" width="2000" height="130" fill="#b7e2c6"/><rect x="-200" y="566" width="2000" height="10" fill="#8cc7a2"/>`
        + `<rect x="110" y="330" width="310" height="240" fill="none" stroke="#fff" stroke-width="16"/><path d="M265 330 V570 M110 450 H420" stroke="#fff" stroke-width="10"/>`
        + `<path d="M70 300 Q130 440 96 600 L40 600 L40 300 Z" fill="#ff8a5b"/><path d="M460 300 Q400 440 434 600 L490 600 L490 300 Z" fill="#ff8a5b"/><rect x="40" y="290" width="450" height="16" rx="8" fill="#a8703f"/>`
        + `<path d="M500 296 Q850 334 1200 296" stroke="#8a6a52" stroke-width="3" fill="none"/>` + bandeirinhas,
      lin('esc-p', [[0, '#fff3c4'], [1, '#f6dd98']])),
      meio: svg(`<rect x="560" y="340" width="640" height="250" rx="12" fill="#9a6a3a"/><rect x="578" y="356" width="604" height="218" rx="6" fill="url(#esc-q)"/>`
        + `<text x="660" y="440" font-family="'Instrument Serif', Georgia, serif" font-style="italic" font-size="64" fill="#f4f7f2" fill-opacity=".9">A B C</text>`
        + `<text x="660" y="530" font-family="'Instrument Serif', Georgia, serif" font-size="54" fill="#f4f7f2" fill-opacity=".85">1 + 1 = 2</text>`
        + `<g stroke="#ffe27a" stroke-width="5" fill="none" stroke-linecap="round" stroke-opacity=".9"><circle cx="1060" cy="440" r="36"/><path d="M1060 384 v-16 M1060 496 v16 M1004 440 h-16 M1116 440 h16 M1020 400 l-12 -12 M1100 400 l12 -12 M1020 480 l-12 12 M1100 480 l12 12"/></g>`
        + `<rect x="600" y="586" width="560" height="10" rx="4" fill="#7a4f28"/>`
        + `<g transform="translate(1310 330)"><circle r="46" fill="#fff" stroke="#38bdf8" stroke-width="9"/><path d="M0 0 V-30 M0 0 L22 10" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/></g>`
        + `<rect x="1410" y="400" width="250" height="300" rx="8" fill="#b07a46"/><rect x="1424" y="414" width="222" height="272" fill="#8a5a2f"/>` + livros
        + `<rect x="1424" y="512" width="222" height="10" fill="#b07a46"/><rect x="1424" y="622" width="222" height="10" fill="#b07a46"/>`,
      lin('esc-q', [[0, '#2f6e50'], [1, '#22533c']])),
      perto: svg(`<rect x="-200" y="700" width="2000" height="200" fill="url(#esc-c)"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M-200 ${716 + i * 22} H1800" stroke="#b77a45" stroke-opacity=".35" stroke-width="3"/>`).join('')
        + `<g transform="translate(1560 700)"><rect x="-150" y="0" width="300" height="20" rx="6" fill="#a8703f"/><rect x="-140" y="20" width="20" height="120" fill="#8a5a2f"/><rect x="120" y="20" width="20" height="120" fill="#8a5a2f"/><circle cx="-80" cy="-22" r="22" fill="#e5484d"/><path d="M-80 -44 q6 -12 16 -10" stroke="#3faa48" stroke-width="5" fill="none"/></g>`,
      lin('esc-c', [[0, '#e3ac72'], [1, '#bf8048']])),
      frente: '',
      luzes: svg(`<ellipse cx="880" cy="220" rx="560" ry="360" fill="url(#esc-luz)"/>`, rad('esc-luz', [[0, '#fff3c4', 0.35], [1, '#fff3c4', 0]])),
    };
  },

  quarto: (u) => {
    const r = rnd(111);
    let papel = '';
    for (let i = 0; i < 46; i++) { const x = -180 + r() * 1960, y = 40 + r() * 600; if (x > 1150 && x < 1490 && y > 290 && y < 560) continue; papel += `<path d="M${x} ${y - 9} l2.6 6 6.4 .8 -4.8 4.4 1.3 6.4 -5.5 -3.2 -5.5 3.2 1.3 -6.4 -4.8 -4.4 6.4 -.8 Z" fill="#fff" fill-opacity=".7"/>`; }
    return {
      chao: 704, interior: true,
      longe: svg(`<path fill-rule="evenodd" d="M-200 0 H1800 V900 H-200 Z M1170 310 H1470 V540 H1170 Z" fill="url(#qu-p)"/>` + papel
        + `<rect x="-200" y="688" width="2000" height="20" fill="#fff"/>`
        + `<rect x="1170" y="310" width="300" height="230" fill="none" stroke="#fff" stroke-width="16"/><path d="M1320 310 V540" stroke="#fff" stroke-width="10"/>`
        + `<path d="M1120 280 Q1180 420 1150 600 L1100 600 L1100 280 Z" fill="#ff9ec4"/><path d="M1520 280 Q1460 420 1490 600 L1540 600 L1540 280 Z" fill="#ff9ec4"/><rect x="1090" y="272" width="460" height="14" rx="7" fill="#c98a5a"/>`
        + `<rect x="200" y="400" width="250" height="14" rx="6" fill="#c98a5a"/>` + img(u, 'dec-ursinho.png', 230, 318, 92)
        + `<g transform="translate(560 300)"><rect x="-60" y="-50" width="120" height="100" rx="8" fill="#fff" stroke="#c98a5a" stroke-width="8"/><circle cx="-14" cy="-6" r="22" fill="#ffd84a"/><path d="M-50 40 L-10 4 L20 30 L50 0 L50 42 Z" fill="#7cc4f2"/></g>`,
      lin('qu-p', [[0, '#cbe6ff'], [1, '#a9d4fb']])),
      meio: svg(`<g><rect x="-120" y="470" width="40" height="250" rx="12" fill="#b9784a"/><rect x="-100" y="480" width="200" height="40" rx="16" fill="#c98a5a"/>`
        + `<rect x="-100" y="600" width="560" height="70" rx="20" fill="#fff"/><path d="M-60 596 C60 560 300 560 470 600 L470 690 L-60 690 Z" fill="url(#qu-coberta)"/><rect x="-70" y="560" width="140" height="56" rx="26" fill="#fff"/>`
        + `<g fill="#fff" fill-opacity=".5"><circle cx="120" cy="630" r="7"/><circle cx="220" cy="650" r="7"/><circle cx="320" cy="628" r="7"/><circle cx="410" cy="660" r="7"/></g>`
        + `<rect x="440" y="560" width="40" height="160" rx="12" fill="#b9784a"/></g>`
        + `<g><rect x="520" y="610" width="120" height="90" rx="8" fill="#c98a5a"/><rect x="574" y="540" width="12" height="70" fill="#8a5a2f"/><path d="M540 548 L620 548 L600 490 L560 490 Z" fill="#ffcf6b"/></g>`,
      lin('qu-coberta', [[0, '#c4a5ff'], [1, '#8b5cf6']])),
      perto: svg(`<rect x="-200" y="704" width="2000" height="196" fill="url(#qu-c)"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M-200 ${720 + i * 21} H1800" stroke="#a7703e" stroke-opacity=".3" stroke-width="3"/>`).join('')
        + `<ellipse cx="860" cy="790" rx="420" ry="70" fill="#7cc4f2"/><ellipse cx="860" cy="790" rx="330" ry="52" fill="#ffd36b"/><ellipse cx="860" cy="790" rx="230" ry="36" fill="#ff9ec4"/>`
        + `<g transform="translate(1450 820)"><circle r="40" fill="#ef4444"/><path d="M-40 0 A40 40 0 0 0 40 0" fill="#fff"/><path d="M-40 0 H40" stroke="#38bdf8" stroke-width="8"/></g>`
        + `<g transform="translate(260 840)"><rect x="-30" y="-30" width="60" height="60" rx="6" fill="#a3e635"/><text y="14" font-family="Onest, sans-serif" font-weight="800" font-size="40" fill="#fff" text-anchor="middle">A</text><rect x="34" y="-14" width="44" height="44" rx="5" fill="#38bdf8"/><text x="56" y="18" font-family="Onest, sans-serif" font-weight="800" font-size="30" fill="#fff" text-anchor="middle">B</text></g>`,
      lin('qu-c', [[0, '#deaa76'], [1, '#b98250']])),
      frente: '',
      luzes: svg(`<circle cx="580" cy="520" r="210" fill="url(#qu-luz)"/>`, rad('qu-luz', [[0, '#fff1b8', 0.75], [0.5, '#ffd36b', 0.25], [1, '#ffd36b', 0]])),
    };
  },
  nether: (u) => {
    return {
      chao: 690,
      ceu: 'ceu-nether',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="url(#ne-fundo)"/>
        <path d="M-200 480 H1800 V900 H-200 Z" fill="#3a111a"/>
        <path d="M-200 380 L100 440 L400 360 L800 430 L1200 370 L1500 440 L1800 390 V900 H-200 Z" fill="#521724"/>
        <g fill="#21080e">
          <rect x="220" y="160" width="70" height="420"/>
          <rect x="200" y="140" width="110" height="30"/>
          <rect x="940" y="180" width="80" height="400"/>
          <rect x="910" y="160" width="140" height="30"/>
          <rect x="1420" y="210" width="60" height="370"/>
        </g>`,
        lin('ne-fundo', [[0, '#380a14'], [0.65, '#5c131a'], [1, '#852115']])),
      meio: svg(`<g>
        <path d="M-200 520 L60 520 L180 560 L380 560 L500 520 L760 520 L900 570 L1180 570 L1320 520 L1800 520 V900 H-200 Z" fill="#691d24"/>
        <!-- cachoeiras de lava cúbicas -->
        <rect x="220" y="170" width="28" height="390" fill="#ff6b00"/>
        <rect x="224" y="170" width="16" height="390" fill="#ffe066"/>
        <rect x="960" y="190" width="32" height="380" fill="#ff6b00"/>
        <rect x="966" y="190" width="20" height="380" fill="#ffe066"/>
        <rect x="-200" y="740" width="2000" height="160" fill="url(#ne-lava)"/>
      </g>`,
      lin('ne-lava', [[0, '#ff7a00'], [0.4, '#ff4800'], [1, '#b31e00']])),
      perto: svg(`<g>
        <!-- degraus de netherrack e basalto -->
        <path d="M-200 680 H180 320 V710 H520 V680 H960 V710 H1240 V680 H1800 V900 H-200 Z" fill="#4d141b"/>
        <rect x="-200" y="680" width="2000" height="24" fill="#751e29"/>
        <!-- blocos de fogo e magma -->
        <rect x="180" y="656" width="32" height="24" fill="#ff7a00"/>
        <rect x="184" y="660" width="24" height="20" fill="#fff185"/>
        <rect x="680" y="656" width="36" height="24" fill="#ff4800"/>
        <rect x="1120" y="656" width="40" height="24" fill="#ff7a00"/>
      </g>`),
      frente: '',
      luzes: svg(`<circle cx="234" cy="460" r="180" fill="url(#ne-brilho-l)"/>
        <circle cx="976" cy="480" r="190" fill="url(#ne-brilho-l)"/>`,
        rad('ne-brilho-l', [[0, '#ffb84d', 0.85], [0.45, '#ff5e00', 0.35], [1, '#ff3b00', 0]])),
    };
  },
  the_end: (u) => {
    return {
      chao: 690,
      ceu: 'ceu-the-end',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#08060f"/>
        <!-- pilares monumentais de obsidiana -->
        <g fill="#120e1f" stroke="#221b3b" stroke-width="6">
          <rect x="40" y="240" width="110" height="460"/>
          <rect x="360" y="160" width="130" height="540"/>
          <rect x="760" y="110" width="150" height="590"/>
          <rect x="1180" y="180" width="130" height="520"/>
          <rect x="1540" y="260" width="110" height="440"/>
        </g>
        <!-- cristais do end no topo dos pilares -->
        <g fill="#df7bf7" stroke="#ffffff" stroke-width="4">
          <rect x="80" y="210" width="30" height="30" transform="rotate(45 95 225)"/>
          <rect x="410" y="130" width="34" height="34" transform="rotate(45 427 147)"/>
          <rect x="820" y="76" width="38" height="38" transform="rotate(45 839 95)"/>
          <rect x="1230" y="150" width="32" height="32" transform="rotate(45 1246 166)"/>
          <rect x="1580" y="230" width="28" height="28" transform="rotate(45 1594 244)"/>
        </g>`),
      meio: svg(`<g>
        <!-- ilhas flutuantes secundárias de end stone -->
        <path d="M-120 540 H180 L220 580 L120 620 L-60 620 Z" fill="#d2d0a1"/>
        <path d="M1380 520 H1720 L1760 560 L1660 610 L1440 600 Z" fill="#d2d0a1"/>
      </g>`),
      perto: svg(`<g>
        <!-- grande ilha principal do end -->
        <path d="M-200 680 H1800 V900 H-200 Z" fill="#bbb987"/>
        <rect x="-200" y="680" width="2000" height="22" fill="#e2e0b5"/>
        <path d="M-200 702 H1800 V740 H-200 Z" fill="#9e9b6a"/>
        <!-- blocos de portal e partículas -->
        <rect x="740" y="666" width="120" height="14" fill="#0b1b1c" stroke="#36a394" stroke-width="4"/>
      </g>`),
      frente: '',
      luzes: svg(`<circle cx="427" cy="147" r="140" fill="url(#end-luz)"/>
        <circle cx="839" cy="95" r="160" fill="url(#end-luz)"/>
        <circle cx="1246" cy="166" r="140" fill="url(#end-luz)"/>`,
        rad('end-luz', [[0, '#f5c6ff', 0.8], [0.5, '#b446e8', 0.25], [1, '#6a1296', 0]])),
    };
  },
  mina_caverna: (u) => {
    return {
      chao: 690,
      interior: true,
      ceu: 'ceu-caverna',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#1b1c21"/>
        <!-- teto e paredes de pedra/ardósia -->
        <path d="M-200 0 H1800 V340 L1600 290 L1400 360 L1100 280 L800 350 L500 270 L200 350 L-200 280 Z" fill="#2c2d36"/>
        <path d="M-200 0 H1800 V230 L1500 180 L1200 240 L900 170 L600 240 L300 170 L-200 220 Z" fill="#3c3d47"/>`),
      meio: svg(`<g>
        <!-- vigas de madeira de sustentação da mina -->
        <rect x="180" y="240" width="36" height="460" fill="#6a4325"/>
        <rect x="420" y="240" width="36" height="460" fill="#6a4325"/>
        <rect x="160" y="240" width="320" height="34" fill="#84532e"/>

        <rect x="1080" y="220" width="36" height="480" fill="#6a4325"/>
        <rect x="1340" y="220" width="36" height="480" fill="#6a4325"/>
        <rect x="1060" y="220" width="340" height="34" fill="#84532e"/>

        <!-- tochas na parede com chamas cúbicas -->
        <rect x="224" y="380" width="10" height="38" fill="#5c381c"/>
        <rect x="222" y="372" width="14" height="14" fill="#ff9900"/>
        <rect x="225" y="374" width="8" height="8" fill="#fff799"/>

        <rect x="1124" y="360" width="10" height="38" fill="#5c381c"/>
        <rect x="1122" y="352" width="14" height="14" fill="#ff9900"/>
        <rect x="1125" y="354" width="8" height="8" fill="#fff799"/>
      </g>`),
      perto: svg(`<g>
        <!-- chão de pedra e ardósia com minérios -->
        <path d="M-200 680 H1800 V900 H-200 Z" fill="#3b3c46"/>
        <rect x="-200" y="680" width="2000" height="20" fill="#545663"/>
        <!-- trilhos de trem de mina -->
        <path d="M-200 688 H1800" stroke="#777a8a" stroke-width="8"/>
        <path d="M-200 694 H1800" stroke="#484a54" stroke-width="4"/>
        ${Array.from({ length: 30 }, (_, i) => `<rect x="${-180 + i * 68}" y="684" width="22" height="14" fill="#613c20"/>`).join('')}
        <!-- blocos de minério de diamante azul -->
        <g fill="#4deeea">
          <rect x="620" y="720" width="18" height="18"/>
          <rect x="644" y="736" width="14" height="14"/>
          <rect x="1420" y="718" width="18" height="18"/>
        </g>
        <!-- minério de ouro -->
        <g fill="#ffd700">
          <rect x="70" y="730" width="16" height="16"/>
          <rect x="880" y="724" width="18" height="18"/>
        </g>
      </g>`),
      frente: '',
      luzes: svg(`<circle cx="229" cy="379" r="160" fill="url(#mina-luz)"/>
        <circle cx="1129" cy="359" r="170" fill="url(#mina-luz)"/>`,
        rad('mina-luz', [[0, '#ffe699', 0.9], [0.45, '#ff9900', 0.3], [1, '#ff6600', 0]])),
    };
  },
  galpao_hubiss: (u) => {
    return {
      chao: 690,
      interior: true,
      ceu: 'ceu-galpao',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#1e2430"/>
        <!-- estrutura metálica industrial do galpão -->
        <g stroke="#334155" stroke-width="6">
          <line x1="-200" y1="200" x2="1800" y2="200"/>
          <line x1="200" y1="0" x2="200" y2="900"/>
          <line x1="800" y1="0" x2="800" y2="900"/>
          <line x1="1400" y1="0" x2="1400" y2="900"/>
          <line x1="-200" y1="80" x2="600" y2="200"/>
          <line x1="600" y1="200" x2="1400" y2="80"/>
        </g>
        <!-- logo luminoso Hubiss na parede de fundo -->
        <g transform="translate(800 130)">
          <rect x="-140" y="-36" width="280" height="72" rx="12" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
          <text x="0" y="14" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#38bdf8" text-anchor="middle" letter-spacing="2">HUBISS</text>
        </g>`),
      meio: svg(`<g>
        <!-- prateleiras porta-paletes altas com caixas de encomendas -->
        <g fill="#f59e0b">
          <rect x="-160" y="320" width="280" height="360" rx="4" fill="#1e293b" stroke="#475569" stroke-width="6"/>
          <rect x="-140" y="360" width="100" height="70" rx="4"/>
          <rect x="-20" y="360" width="110" height="70" rx="4"/>
          <rect x="-140" y="470" width="110" height="75" rx="4"/>
          <rect x="-10" y="470" width="100" height="75" rx="4"/>
          <rect x="-140" y="580" width="220" height="80" rx="4"/>

          <rect x="1460" y="320" width="300" height="360" rx="4" fill="#1e293b" stroke="#475569" stroke-width="6"/>
          <rect x="1490" y="360" width="110" height="70" rx="4"/>
          <rect x="1620" y="360" width="110" height="70" rx="4"/>
          <rect x="1490" y="470" width="110" height="75" rx="4"/>
          <rect x="1620" y="470" width="110" height="75" rx="4"/>
          <rect x="1490" y="580" width="230" height="80" rx="4"/>
        </g>
        <!-- doca de expedição no centro com esteira de caixas -->
        <g>
          <rect x="260" y="540" width="1080" height="34" rx="6" fill="#334155" stroke="#64748b" stroke-width="4"/>
          <!-- roletes da esteira -->
          ${Array.from({ length: 24 }, (_, i) => `<line x1="${290 + i * 44}" y1="544" x2="${290 + i * 44}" y2="570" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>`).join('')}
          <!-- caixas em trânsito com etiqueta oficial -->
          <g>
            <rect x="380" y="468" width="94" height="72" rx="4" fill="#d97706"/>
            <rect x="430" y="480" width="34" height="24" rx="2" fill="#fff"/>
            <rect x="740" y="456" width="110" height="84" rx="4" fill="#b45309"/>
            <rect x="800" y="470" width="40" height="28" rx="2" fill="#fff"/>
            <rect x="1080" y="468" width="94" height="72" rx="4" fill="#d97706"/>
            <rect x="1130" y="480" width="34" height="24" rx="2" fill="#fff"/>
          </g>
        </g>
      </g>`),
      perto: svg(`<g>
        <!-- piso de concreto com faixa amarela de empilhadeira -->
        <rect x="-200" y="680" width="2000" height="220" fill="#334155"/>
        <rect x="-200" y="680" width="2000" height="18" fill="#eab308"/>
        ${Array.from({ length: 22 }, (_, i) => `<rect x="${-180 + i * 90}" y="680" width="40" height="18" fill="#1e293b"/>`).join('')}
      </g>`),
      frente: '',
      luzes: svg(`<circle cx="800" cy="130" r="220" fill="url(#hubiss-luz)"/>`,
        rad('hubiss-luz', [[0, '#38bdf8', 0.65], [0.5, '#0284c7', 0.2], [1, '#0f172a', 0]])),
    };
  },
  loja_celit: (u) => {
    return {
      chao: 690,
      interior: true,
      ceu: 'ceu-loja',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#0f172a"/>
        <!-- painel ripado elegante de loja com logo CELIT -->
        <g fill="#1e293b">
          ${Array.from({ length: 35 }, (_, i) => `<rect x="${-180 + i * 58}" y="80" width="34" height="600" rx="3"/>`).join('')}
        </g>
        <!-- logo CELIT luminoso -->
        <g transform="translate(800 120)">
          <rect x="-160" y="-40" width="320" height="80" rx="14" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
          <text x="0" y="16" font-family="system-ui, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="3">CELIT ERP</text>
        </g>`),
      meio: svg(`<g>
        <!-- vitrine iluminada de smartphones -->
        <g transform="translate(240 380)">
          <rect x="-140" y="0" width="280" height="300" rx="10" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" stroke-width="5"/>
          <rect x="-110" y="30" width="60" height="100" rx="8" fill="#0284c7"/>
          <rect x="-105" y="35" width="50" height="90" rx="5" fill="#f8fafc"/>
          <rect x="50" y="30" width="60" height="100" rx="8" fill="#10b981"/>
          <rect x="55" y="35" width="50" height="90" rx="5" fill="#f8fafc"/>
          <text x="0" y="180" font-family="system-ui, sans-serif" font-weight="800" font-size="16" fill="#94a3b8" text-anchor="middle">VITRINE TRADE-IN</text>
        </g>

        <!-- bancada técnica com manta antiestática azul -->
        <g transform="translate(1360 440)">
          <rect x="-160" y="0" width="320" height="240" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="4"/>
          <rect x="-140" y="20" width="280" height="80" rx="6" fill="#0284c7"/>
          <!-- lupa/microscópio técnico -->
          <circle cx="-60" cy="50" r="24" fill="none" stroke="#f8fafc" stroke-width="6"/>
          <line x1="-42" y1="66" x2="-20" y2="88" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
          <text x="40" y="60" font-family="system-ui, sans-serif" font-weight="800" font-size="14" fill="#ffffff">ASSISTÊNCIA</text>
        </g>

        <!-- balcão de checkout e caixa -->
        <rect x="560" y="520" width="480" height="160" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="5"/>
        <rect x="580" y="540" width="140" height="30" rx="4" fill="#0284c7"/>
        <text x="650" y="560" font-family="system-ui, sans-serif" font-weight="800" font-size="14" fill="#fff" text-anchor="middle">CAIXA PDV</text>
        <rect x="860" y="480" width="90" height="40" rx="6" fill="#0f172a" stroke="#22c55e" stroke-width="3"/>
        <text x="905" y="505" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#22c55e" text-anchor="middle">R$ OK</text>
      </g>`),
      perto: svg(`<rect x="-200" y="680" width="2000" height="220" fill="#0f172a"/>
        <line x1="-200" y1="680" x2="1800" y2="680" stroke="#38bdf8" stroke-width="6"/>`),
      frente: '',
      luzes: svg(`<circle cx="800" cy="120" r="200" fill="url(#celit-luz)"/>`,
        rad('celit-luz', [[0, '#38bdf8', 0.65], [0.5, '#0284c7', 0.2], [1, '#0f172a', 0]])),
    };
  },
  datacenter_datasnap: (u) => {
    return {
      chao: 690,
      interior: true,
      ceu: 'ceu-datacenter',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#05070f"/>
        <!-- perspectiva profunda de racks de servidores com cabeamento de teto -->
        <g stroke="#1e293b" stroke-width="4">
          <line x1="800" y1="160" x2="-200" y2="0"/>
          <line x1="800" y1="160" x2="1800" y2="0"/>
          <line x1="800" y1="680" x2="-200" y2="900"/>
          <line x1="800" y1="680" x2="1800" y2="900"/>
        </g>
        <!-- logo luminoso DataSnap -->
        <g transform="translate(800 110)">
          <rect x="-180" y="-36" width="360" height="72" rx="12" fill="#020617" stroke="#00f2fe" stroke-width="4"/>
          <text x="0" y="14" font-family="system-ui, sans-serif" font-weight="900" font-size="32" fill="#00f2fe" text-anchor="middle" letter-spacing="3">DATASNAP.CLOUD</text>
        </g>`),
      meio: svg(`<g>
        <!-- racks de servidores laterais com LEDs piscando -->
        <g fill="#0b0f19" stroke="#00f2fe" stroke-width="4">
          <rect x="-150" y="240" width="260" height="440" rx="6"/>
          <rect x="1490" y="240" width="260" height="440" rx="6"/>
        </g>
        <!-- leds dos servidores -->
        <g fill="#22c55e">
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="-40" cy="${270 + i * 28}" r="4"/>`).join('')}
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="1590" cy="${270 + i * 28}" r="4"/>`).join('')}
        </g>
        <g fill="#38bdf8">
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="-10" cy="${270 + i * 28}" r="4"/>`).join('')}
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="1620" cy="${270 + i * 28}" r="4"/>`).join('')}
        </g>
        <g fill="#f59e0b">
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="20" cy="${270 + i * 28}" r="4"/>`).join('')}
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="1650" cy="${270 + i * 28}" r="4"/>`).join('')}
        </g>

        <!-- painel holográfico de telemetria ClickHouse no centro -->
        <g transform="translate(800 460)">
          <rect x="-240" y="-120" width="480" height="240" rx="16" fill="rgba(2, 6, 23, 0.78)" stroke="#4facfe" stroke-width="4"/>
          <text x="0" y="-70" font-family="ui-monospace, monospace" font-weight="900" font-size="20" fill="#00f2fe" text-anchor="middle">CLICKHOUSE REAL-TIME</text>
          <!-- barras de gráfico animadas -->
          <rect x="-180" y="-30" width="36" height="110" rx="4" fill="#00f2fe"/>
          <rect x="-120" y="-60" width="36" height="140" rx="4" fill="#4facfe"/>
          <rect x="-60" y="-10" width="36" height="90" rx="4" fill="#00f2fe"/>
          <rect x="0" y="-80" width="36" height="160" rx="4" fill="#38bdf8"/>
          <rect x="60" y="-50" width="36" height="130" rx="4" fill="#00f2fe"/>
          <rect x="120" y="-95" width="36" height="175" rx="4" fill="#22c55e"/>
        </g>
      </g>`),
      perto: svg(`<rect x="-200" y="680" width="2000" height="220" fill="#020617"/>
        <line x1="-200" y1="680" x2="1800" y2="680" stroke="#00f2fe" stroke-width="6"/>
        <g stroke="rgba(0, 242, 254, 0.25)" stroke-width="2">
          ${Array.from({ length: 18 }, (_, i) => `<line x1="${-180 + i * 110}" y1="680" x2="${-180 + i * 110}" y2="900"/>`).join('')}
        </g>`),
      frente: '',
      luzes: svg(`<circle cx="800" cy="460" r="260" fill="url(#data-luz)"/>`,
        rad('data-luz', [[0, '#00f2fe', 0.65], [0.5, '#4facfe', 0.25], [1, '#05070f', 0]])),
    };
  },
  clinica_qualhora: (u) => {
    return {
      chao: 690,
      interior: true,
      ceu: 'ceu-clinica',
      longe: svg(`<rect x="-200" y="0" width="2000" height="900" fill="#f8fafc"/>
        <!-- parede clean contemporânea com moldura e logo QualHora -->
        <rect x="-200" y="0" width="2000" height="680" fill="#f1f5f9"/>
        <g transform="translate(800 120)">
          <rect x="-170" y="-36" width="340" height="72" rx="14" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
          <text x="0" y="14" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">QUAL HORA</text>
        </g>`),
      meio: svg(`<g>
        <!-- calendário dinâmico de agendamento na parede esquerda -->
        <g transform="translate(260 400)">
          <rect x="-140" y="-120" width="280" height="240" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
          <rect x="-140" y="-120" width="280" height="48" rx="12" fill="#0284c7"/>
          <text x="0" y="-88" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">GRADE DE HORÁRIOS</text>
          <!-- slots de horários com check verde -->
          <g fill="#dcfce7" stroke="#22c55e" stroke-width="2">
            <rect x="-110" y="-50" width="90" height="36" rx="6"/>
            <rect x="20" y="-50" width="90" height="36" rx="6"/>
            <rect x="-110" y="0" width="90" height="36" rx="6"/>
            <rect x="20" y="0" width="90" height="36" rx="6"/>
            <rect x="-110" y="50" width="90" height="36" rx="6"/>
            <rect x="20" y="50" width="90" height="36" rx="6"/>
          </g>
          <g font-family="system-ui, sans-serif" font-weight="800" font-size="12" fill="#15803d" text-anchor="middle">
            <text x="-65" y="-27">09:00 ✓</text>
            <text x="65" y="-27">10:00 ✓</text>
            <text x="-65" y="23">11:00 ✓</text>
            <text x="65" y="23">14:00 ✓</text>
            <text x="-65" y="73">15:00 ✓</text>
            <text x="65" y="73">16:00 ✓</text>
          </g>
        </g>

        <!-- relógio de parede moderno no topo direito -->
        <g transform="translate(1380 260)">
          <circle r="48" fill="#ffffff" stroke="#0284c7" stroke-width="6"/>
          <line x1="0" y1="0" x2="0" y2="-28" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#0284c7" stroke-width="4" stroke-linecap="round"/>
          <circle r="4" fill="#0f172a"/>
        </g>

        <!-- poltronas de espera confortáveis à direita -->
        <g transform="translate(1360 550)">
          <rect x="-100" y="0" width="200" height="130" rx="16" fill="#e2e8f0" stroke="#94a3b8" stroke-width="4"/>
          <rect x="-80" y="20" width="160" height="80" rx="10" fill="#0284c7"/>
          <text x="0" y="120" font-family="system-ui, sans-serif" font-weight="800" font-size="14" fill="#475569" text-anchor="middle">SALA DE ESPERA</text>
        </g>

        <!-- balcão de recepção elegante central -->
        <rect x="580" y="520" width="440" height="160" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="5"/>
        <rect x="620" y="470" width="70" height="50" rx="6" fill="#0f172a" stroke="#94a3b8" stroke-width="3"/>
        <rect x="740" y="540" width="120" height="34" rx="6" fill="#22c55e"/>
        <text x="800" y="562" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">WHATSAPP ON</text>
      </g>`),
      perto: svg(`<rect x="-200" y="680" width="2000" height="220" fill="#e2e8f0"/>
        <line x1="-200" y1="680" x2="1800" y2="680" stroke="#0284c7" stroke-width="6"/>`),
      frente: '',
      luzes: svg(`<circle cx="800" cy="120" r="190" fill="url(#qualhora-luz)"/>`,
        rad('qualhora-luz', [[0, '#38bdf8', 0.55], [0.5, '#bae6fd', 0.15], [1, '#f8fafc', 0]])),
    };
  },
};

/**
 * Desenha qualquer item do catálogo marcado `casa: true` como uma casa em corte.
 * `interior` reduz a opacidade da fachada e revela o cômodo; `portaAberta` gira
 * a folha da porta. O SVG usa as mesmas coordenadas do mundo que os cenários.
 */
export function casaDollhouse(item, { interior = false, portaAberta = false } = {}) {
  if (!item?.casa) return '';
  const altura = Math.max(170, Math.min(Number(item.altura) || 280, 420));
  const escala = altura / 280;
  const x = 800;
  const base = 690;
  const topo = base - altura;
  const largura = altura * 1.35;
  const esquerda = x - largura / 2;
  const cores = [['#d9b889', '#9c563c'], ['#c9c6df', '#574b82'], ['#b9d5a7', '#557743'], ['#c8d9e6', '#486c8b'], ['#e5c7a4', '#9b6a3d'], ['#d7a4a0', '#783f4b'], ['#a7c9c7', '#3f7774'], ['#dbdbb5', '#82884c']];
  const tom = [...String(item.id || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % cores.length;
  const [parede, telhado] = cores[tom];
  const emblema = String(item.emoji || '🏠').replace(/[&<>]/g, '');
  const fachadaOpacity = interior ? 0.22 : 1;
  const portaX = x + largura * 0.19;
  const portaY = base - altura * 0.43;
  const portaW = largura * 0.2;
  const portaH = altura * 0.43;
  return svg(`<g class="cn-dollhouse" data-house-id="${String(item.id || '').replace(/[&"<>']/g, '')}" data-interior="${interior}" data-door-open="${portaAberta}" transform="translate(0 0)">
    <ellipse cx="${x}" cy="${base + 8}" rx="${largura * 0.62}" ry="${altura * 0.055}" fill="#263238" fill-opacity=".2"/>
    <text class="cn-casa-emblema" x="${x}" y="${topo + altura * .12}" text-anchor="middle" font-size="${Math.max(42, altura * .23)}" aria-hidden="true">${emblema}</text>
    <g class="cn-interior" opacity="${interior ? 1 : 0}" visibility="${interior ? 'visible' : 'hidden'}">
      <rect x="${esquerda + largura * .08}" y="${topo + altura * .28}" width="${largura * .84}" height="${altura * .69}" fill="#f6e8ca" stroke="#75543b" stroke-width="${5 * escala}"/>
      <path d="M${esquerda + largura * .08} ${topo + altura * .74} H${x + largura * .08} V${base - 5 * escala} H${esquerda + largura * .08} Z" fill="#bf8b5b"/>
      <path d="M${x + largura * .08} ${topo + altura * .74} H${esquerda + largura * .92} V${base - 5 * escala} H${x + largura * .08} Z" fill="#d4a56f"/>
      <rect x="${esquerda + largura * .18}" y="${topo + altura * .42}" width="${largura * .23}" height="${altura * .22}" rx="${4 * escala}" fill="#91c9d8" stroke="#fff5df" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .16} ${topo + altura * .68} h${largura * .34} l${-largura * .04} ${altura * .045} h${-largura * .27} Z" fill="#c55f4e"/>
      <rect x="${x + largura * .22}" y="${topo + altura * .58}" width="${largura * .3}" height="${altura * .08}" rx="${5 * escala}" fill="#9c6745"/>
      <rect x="${x + largura * .3}" y="${topo + altura * .35}" width="${largura * .16}" height="${altura * .15}" fill="#f7d777" stroke="#fff5df" stroke-width="${5 * escala}"/>
      <path d="M${x} ${topo + altura * .3} V${base}" stroke="#8d694c" stroke-width="${5 * escala}" opacity=".65"/>
    </g>
    <g class="cn-fachada" opacity="${fachadaOpacity}">
      <path d="M${esquerda} ${topo + altura * .31} L${x} ${topo} L${esquerda + largura} ${topo + altura * .31} V${base} H${esquerda} Z" fill="${parede}" stroke="#704832" stroke-width="${7 * escala}" stroke-linejoin="round"/>
      <path d="M${esquerda - largura * .06} ${topo + altura * .32} L${x} ${topo - altura * .08} L${esquerda + largura * 1.06} ${topo + altura * .32} L${esquerda + largura} ${topo + altura * .4} L${x} ${topo + altura * .02} L${esquerda} ${topo + altura * .4} Z" fill="${telhado}" stroke="#704832" stroke-width="${6 * escala}" stroke-linejoin="round"/>
      <path d="M${esquerda + largura * .08} ${base - altura * .07} H${esquerda + largura * .92}" stroke="#8b674a" stroke-width="${5 * escala}"/>
      <rect x="${esquerda + largura * .15}" y="${topo + altura * .39}" width="${largura * .2}" height="${altura * .2}" rx="${4 * escala}" fill="#8dc9d7" stroke="#fff0d4" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .25} ${topo + altura * .39} V${topo + altura * .59} M${esquerda + largura * .15} ${topo + altura * .49} H${esquerda + largura * .35}" stroke="#fff0d4" stroke-width="${4 * escala}"/>
      <rect x="${esquerda + largura * .7}" y="${topo + altura * .39}" width="${largura * .2}" height="${altura * .2}" rx="${4 * escala}" fill="#8dc9d7" stroke="#fff0d4" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .8} ${topo + altura * .39} V${topo + altura * .59} M${esquerda + largura * .7} ${topo + altura * .49} H${esquerda + largura * .9}" stroke="#fff0d4" stroke-width="${4 * escala}"/>
      <g class="cn-porta" transform="translate(${portaX} ${portaY})">
        <rect x="0" y="0" width="${portaW}" height="${portaH}" rx="${5 * escala}" fill="${portaAberta ? '#b77c4f' : '#765039'}" stroke="#f2d7ad" stroke-width="${4 * escala}" transform="${portaAberta ? `rotate(-68 0 ${portaH * .5})` : ''}"/>
        <circle cx="${portaW * .78}" cy="${portaH * .55}" r="${3.5 * escala}" fill="#f4d67c"/>
      </g>
      <rect x="${esquerda}" y="${base - 8 * escala}" width="${largura}" height="${10 * escala}" fill="#80553a"/>
    </g>
    <g class="cn-porta-estado" opacity="${portaAberta ? 1 : 0}">
      <path d="M${portaX + portaW * .52} ${base - portaH * .5} q${portaW * .65} ${-portaH * .06} ${portaW * .7} ${-portaH * .38}" fill="none" stroke="#f4d67c" stroke-width="${4 * escala}" stroke-dasharray="${7 * escala} ${6 * escala}"/>
    </g>
  </g>`);
}

export const ESPECIAIS = { espaco: 'espaco', fundo_do_mar: 'agua' };
export function cenario(id, u, { casa = null, estadoCasa = {} } = {}) {
  const f = LUGARES[id] || LUGARES.campo;
  const c = f(u);
  const desenhoCasa = casaDollhouse(casa, estadoCasa);
  return { id, ceu: c.ceu || 'ceu', interior: !!c.interior, chao: c.chao || 690, agua: c.agua || null, camadas: { longe: c.longe, meio: c.meio + desenhoCasa, perto: c.perto, frente: c.frente, luzes: c.luzes } };
}
export const IDS = Object.keys(LUGARES);

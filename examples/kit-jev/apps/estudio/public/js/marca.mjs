// Identidade visual: fontes embutidas, medição de texto e o LOGO montado a partir das escolhas do Jev
// (ícone × moldura × montagem × caixa do nome × par de fontes × paleta).
import { esc, caixa as aplicarCaixa, iniciais, contraste } from './util.mjs';
import { logoEstilo, simboloEstilo } from './logos.mjs';

export const FONTES_EMB = {
  anton: [{ family: 'Anton', file: 'anton.woff2', weight: '400', style: 'normal' }],
  instrument: [{ family: 'Instrument Serif', file: 'instrument-serif.woff2', weight: '400', style: 'normal' }, { family: 'Instrument Serif', file: 'instrument-serif-italic.woff2', weight: '400', style: 'italic' }],
  outfit: [{ family: 'Outfit', file: 'outfit.woff2', weight: '100 900', style: 'normal' }],
  space: [{ family: 'Space Grotesk', file: 'space-grotesk.woff2', weight: '300 700', style: 'normal' }],
  bodoni: [{"family": "Bodoni Moda", "file": "bodoni.woff2", "weight": "400 900", "style": "normal"}],
  jost: [{"family": "Jost", "file": "jost.woff2", "weight": "300 700", "style": "normal"}],
  archivo: [{"family": "Archivo", "file": "archivo.woff2", "weight": "400 900", "style": "normal"}],
  figtree: [{"family": "Figtree", "file": "figtree.woff2", "weight": "400 900", "style": "normal"}],
  nunito: [{"family": "Nunito", "file": "nunito.woff2", "weight": "400 900", "style": "normal"}],
  fraunces: [{"family": "Fraunces", "file": "fraunces.woff2", "weight": "400 900", "style": "normal"}],
  dancing: [{"family": "Dancing Script", "file": "dancing.woff2", "weight": "400 700", "style": "normal"}],
  zilla: [{"family": "Zilla Slab", "file": "zilla-500.woff2", "weight": "500", "style": "normal"}, {"family": "Zilla Slab", "file": "zilla-700.woff2", "weight": "700", "style": "normal"}],
  cinzel: [{"family": "Cinzel", "file": "cinzel.woff2", "weight": "400 900", "style": "normal"}],
  courier: [{"family": "Courier Prime", "file": "courier-400.woff2", "weight": "400", "style": "normal"}, {"family": "Courier Prime", "file": "courier-700.woff2", "weight": "700", "style": "normal"}],
  crimson: [{"family": "Crimson Pro", "file": "crimson.woff2", "weight": "400 900", "style": "normal"}],
  marcellus: [{"family": "Marcellus", "file": "marcellus.woff2", "weight": "400", "style": "normal"}],
  spacemono: [{"family": "Space Mono", "file": "spacemono-400.woff2", "weight": "400", "style": "normal"}, {"family": "Space Mono", "file": "spacemono-700.woff2", "weight": "700", "style": "normal"}],
  syne: [{"family": "Syne", "file": "syne.woff2", "weight": "400 800", "style": "normal"}],
  caveat: [{"family": "Caveat", "file": "caveat.woff2", "weight": "400 700", "style": "normal"}],
  righteous: [{"family": "Righteous", "file": "righteous.woff2", "weight": "400", "style": "normal"}],
};
// base = '/fonts/' (página) ou um mapa { arquivo: dataURI } (HTML baixado, autossuficiente)
export function fontFaceCSS(base = '/fonts/', so = null) {
  let css = '';
  for (const [k, lista] of Object.entries(FONTES_EMB)) {
    if (so && !so.includes(k)) continue;
    for (const f of lista) {
      const url = typeof base === 'string' ? base + f.file : base[f.file];
      if (!url) continue;
      css += `@font-face{font-family:"${f.family}";src:url("${url}") format("woff2");font-weight:${f.weight};font-style:${f.style};font-display:swap}\n`;
    }
  }
  return css;
}

// ---------------- medição de texto (canvas) ----------------
let cv;
export function medir(texto, familia, peso = 400, tamanho = 100, tracking = 0) {
  if (typeof document === 'undefined') return String(texto).length * tamanho * 0.55;
  cv = cv || document.createElement('canvas');
  const c = cv.getContext('2d');
  c.font = `${peso} ${tamanho}px ${familia}`;
  const w = c.measureText(String(texto)).width;
  return w + Math.max(0, String(texto).length - 1) * tracking * tamanho;
}
export async function carregarFontes(f, extras = []) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const pedidos = [];
  for (const k of [...(f.emb || []), ...extras]) for (const face of FONTES_EMB[k] || []) {
    const pesos = String(face.weight).split(' ').map(Number);
    for (const w of new Set([pesos[0], pesos[pesos.length - 1], 700].filter((x) => x >= pesos[0] && x <= pesos[pesos.length - 1]))) pedidos.push(`${face.style === 'italic' ? 'italic ' : ''}${w} 40px "${face.family}"`);
  }
  try { await Promise.all(pedidos.map((p) => document.fonts.load(p, 'ÁaçõÉ'))); } catch { /* segue com a fonte de reserva */ }
}
export function fontesCarregadas(f, extras = []) {
  if (typeof document === 'undefined' || !document.fonts) return true;
  return [...(f.emb || []), ...extras].every((k) => (FONTES_EMB[k] || []).every((face) => document.fonts.check(`${face.style === 'italic' ? 'italic ' : ''}${String(face.weight).split(' ')[0]} 16px "${face.family}"`, 'Aa')));
}

// ---------------- símbolo (moldura + ícone) em caixa 100×100 ----------------
const FORMAS_PATH = {
  circulo: '<circle cx="50" cy="50" r="48"/>',
  quadrado: '<rect x="3" y="3" width="94" height="94" rx="24"/>',
  hexagono: '<path d="M50 2 91.6 26v48L50 98 8.4 74V26z"/>',
  escudo: '<path d="M50 3 92 15v33c0 26-18 42.5-42 49C26 90.5 8 74 8 48V15z"/>',
  selo: '<circle cx="50" cy="50" r="48"/>',
  folha: '<path d="M52 3c23 2 45 17 44 45-1 28-20 49-48 48C21 95 3 77 4 50 5 22 27 1 52 3z"/>',
};
// cores: { fundo: cor da moldura, tinta: cor do ícone, linha: cor dos detalhes }
export function simbolo(icone, forma, cores, { iniciaisTxt = null, fonte = null, sw = 1.75 } = {}) {
  const semForma = forma === 'nenhuma' || !FORMAS_PATH[forma];
  const shape = semForma ? '' : `<g fill="${cores.fundo}">${FORMAS_PATH[forma]}</g>`;
  const anel = forma === 'selo' ? `<circle cx="50" cy="50" r="40.5" fill="none" stroke="${cores.tinta}" stroke-width="1.6" opacity=".85"/><circle cx="50" cy="50" r="37.2" fill="none" stroke="${cores.tinta}" stroke-width=".8" opacity=".6"/>` : '';
  const escala = semForma ? 3.9 : forma === 'selo' ? 2.15 : forma === 'escudo' ? 2.3 : 2.45;
  const tam = 24 * escala, x = 50 - tam / 2, y = (forma === 'escudo' ? 48 : 50) - tam / 2;
  let miolo;
  if (iniciaisTxt && fonte) {
    const fs = iniciaisTxt.length > 1 ? 40 : 52;
    miolo = `<text x="50" y="${forma === 'escudo' ? 49 : 51}" text-anchor="middle" dominant-baseline="central" font-family='${esc(fonte.logo)}' font-weight="${fonte.lw}" font-size="${fs}" fill="${semForma ? cores.fundo : cores.tinta}" letter-spacing="1">${esc(iniciaisTxt)}</text>`;
  } else {
    miolo = `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${escala})" fill="none" stroke="${semForma ? cores.fundo : cores.tinta}" stroke-width="${semForma ? sw * 0.8 : sw}" stroke-linecap="round" stroke-linejoin="round">${icone.svg}</g>`;
  }
  return shape + anel + miolo;
}

// ---------------- logo completo ----------------
// variante: 'cor' (sobre o fundo da marca), 'inv' (sobre a cor principal), 'claro' (sobre fundo escuro), 'mono'
export function coresLogo(c, variante = 'cor') {
  if (variante === 'inv') return { fundo: c.onPri, tinta: c.pri, nome: c.onPri, tag: c.onPri, fundoEmblema: c.pri };
  if (variante === 'claro') return { fundo: c.pri, tinta: c.onPri, nome: '#ffffff', tag: 'rgba(255,255,255,.72)', fundoEmblema: '#111' };
  if (variante === 'mono') return { fundo: c.ink, tinta: c.bg, nome: c.ink, tag: c.ink, fundoEmblema: c.bg };
  return { fundo: c.pri, tinta: c.onPri, nome: c.ink, tag: c.priTxt, fundoEmblema: c.bg };
}
// amostra "Símbolo em fundo contrastante" da identidade: o símbolo sobre o #111 em todas as paletas, na variante clara (a
// forma na cor principal); quando a principal some no #111 (contraste < 3:1: vinho, café, azul-marinho, mono…), na
// invertida, com a forma clara (onPri), como sobre a cor principal
export const FUNDO_CONTRASTE = '#111111';
export const varianteContraste = (c) => (contraste(c.pri, FUNDO_CONTRASTE) >= 3 ? 'claro' : 'inv');

export function logoSVG(ctx, { variante = 'cor', compacto = false, altura = null, classe = 'logo' } = {}) {
  const M = ctx.marca, f = M.f, c = M.cores;
  if (M.estilo && M.estilo !== 'classico') {
    const r = logoEstilo(ctx, M.estilo, { variante, compacto, classe }, medir);
    if (r) return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 ${(r.W + 16).toFixed(1)} ${(r.H + 16).toFixed(1)}"${altura ? ` height="${altura}"` : ''} role="img" aria-label="Logo ${esc(ctx.nome)}">${r.corpo}</svg>`;
  }
  const disp = compacto ? (M.disp === 'monograma' ? 'monograma' : 'horizontal') : M.disp;
  let modo = M.caixa;
  if (f.scriptLogo && modo === 'alta') modo = 'titulo';
  const nome = aplicarCaixa(ctx.nome, modo);
  const tracking = modo === 'alta' ? Math.max(0.06, parseFloat(f.lt) || 0) : parseFloat(f.lt) || 0;
  const cor = coresLogo(c, variante);
  const tag = (ctx.cidade && disp !== 'horizontal' ? `${ctx.pack.cat} · ${ctx.cidade.nome}` : ctx.pack.cat).toUpperCase();
  const iconeCores = { fundo: cor.fundo, tinta: cor.tinta };
  const ini = disp === 'monograma' ? iniciais(ctx.nome) : null;
  const sym = (s) => `<g transform="scale(${s})">${simbolo(ctx.icone, M.forma === 'nenhuma' && ini ? 'circulo' : M.forma, iconeCores, { iniciaisTxt: ini, fonte: f })}</g>`;
  const fam = esc(f.logo), famBody = esc(f.body);
  const tagFs = 13, tagTr = 0.2;
  let W, H, corpo;

  if (disp === 'emblema') {
    const R = 100, texto = nome.toUpperCase();
    const topo = texto.length > 22 ? texto.slice(0, 22) + '…' : texto;
    const fsTopo = Math.min(19, 520 / Math.max(8, topo.length) * 0.62);
    const baixo = (ctx.cidade ? ctx.cidade.nome : ctx.pack.label).toUpperCase();
    W = 200; H = 200;
    corpo = `<defs><path id="arcTopo${classe}" d="M 36 100 A 64 64 0 0 1 164 100"/><path id="arcBaixo${classe}" d="M 30 100 A 70 70 0 0 0 170 100"/></defs>
      <circle cx="100" cy="100" r="98" fill="${cor.fundo}"/>
      <circle cx="100" cy="100" r="90" fill="none" stroke="${cor.tinta}" stroke-width="1.4" opacity=".7"/>
      <circle cx="100" cy="100" r="54" fill="${variante === 'mono' ? c.bg : cor.tinta}"/>
      <g transform="translate(${100 - 46} ${100 - 46})">${`<g transform="scale(.92)">${simbolo(ctx.icone, 'nenhuma', { fundo: cor.fundo, tinta: cor.fundo }, { sw: 1.9 })}</g>`}</g>
      <text font-family='${fam}' font-weight="${f.lw}" font-size="${fsTopo.toFixed(1)}" letter-spacing="${(fsTopo * 0.12).toFixed(1)}" fill="${cor.tinta}" text-anchor="middle"><textPath href="#arcTopo${classe}" startOffset="50%">${esc(topo)}</textPath></text>
      <text font-family="${famBody}" font-weight="700" font-size="11" letter-spacing="3" fill="${cor.tinta}" text-anchor="middle" dominant-baseline="hanging"><textPath href="#arcBaixo${classe}" startOffset="50%">${esc(baixo)}</textPath></text>
      <g fill="${cor.tinta}">${estrelinha(24, 100, 5)}${estrelinha(176, 100, 5)}</g>`;
    void R;
  } else if (disp === 'empilhado') {
    const fs = 44, nw = medir(nome, f.logo, f.lw, fs, tracking), tw = medir(tag, f.body, 700, tagFs, tagTr);
    W = Math.max(120, nw, tw) + 20; H = 100 + 18 + fs * 1.05 + 10 + tagFs + 6;
    const cx = W / 2;
    corpo = `<g transform="translate(${cx - 50} 0)">${sym(1)}</g>
      <text x="${cx}" y="${100 + 18 + fs * 0.8}" text-anchor="middle" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${(tracking * fs).toFixed(2)}" fill="${cor.nome}">${esc(nome)}</text>
      <text x="${cx}" y="${100 + 18 + fs * 1.05 + 10 + tagFs * 0.8}" text-anchor="middle" font-family="${famBody}" font-weight="700" font-size="${tagFs}" letter-spacing="${tagFs * tagTr}" fill="${cor.tag}">${esc(tag)}</text>`;
  } else if (disp === 'assinatura') {
    const fs = f.scriptLogo ? 78 : 66, nw = medir(nome, f.logo, f.lw, fs, tracking);
    W = nw + 58; H = fs * 1.25 + 22;
    const base = fs * 1.0;
    corpo = `<text x="0" y="${base}" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${(tracking * fs).toFixed(2)}" fill="${cor.nome}">${esc(nome)}</text>
      <g transform="translate(${nw + 12} ${base - fs * 0.78})"><g transform="scale(.42)">${simbolo(ctx.icone, M.forma === 'nenhuma' ? 'circulo' : M.forma, iconeCores)}</g></g>
      <rect x="2" y="${base + fs * 0.2}" width="${Math.min(nw, 120)}" height="3" rx="1.5" fill="${c.pri}"/>
      <text x="${Math.min(nw, 120) + 12}" y="${base + fs * 0.2 + 3}" font-family="${famBody}" font-weight="700" font-size="${tagFs}" letter-spacing="${tagFs * tagTr}" fill="${cor.tag}">${esc(tag)}</text>`;
  } else if (compacto) { // versão de uma linha (menu do site, rodapé, avatar): símbolo + nome, sem a linha de categoria
    const fs = f.scriptLogo ? 62 : 52, nw = medir(nome, f.logo, f.lw, fs, tracking);
    W = 100 + 18 + nw + 6; H = 100;
    corpo = `${sym(1)}
      <text x="118" y="50" dominant-baseline="central" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${(tracking * fs).toFixed(2)}" fill="${cor.nome}">${esc(nome)}</text>`;
  } else { // horizontal e monograma
    const fs = 46, nw = medir(nome, f.logo, f.lw, fs, tracking), tw = medir(tag, f.body, 700, tagFs, tagTr);
    W = 100 + 20 + Math.max(nw, tw) + 6; H = 100;
    const tx = 120;
    corpo = `${sym(1)}
      <text x="${tx}" y="${56}" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${(tracking * fs).toFixed(2)}" fill="${cor.nome}">${esc(nome)}</text>
      <text x="${tx + 2}" y="${80}" font-family="${famBody}" font-weight="700" font-size="${tagFs}" letter-spacing="${tagFs * tagTr}" fill="${cor.tag}">${esc(tag)}</text>`;
  }
  const h = altura ? ` height="${altura}"` : '';
  return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}"${h} role="img" aria-label="Logo ${esc(ctx.nome)}">${corpo}</svg>`;
}

// só o símbolo, para avatar, favicon, padrão de fundo
export function simboloSVG(ctx, { variante = 'cor', tamanho = 40, classe = 'sym' } = {}) {
  const M = ctx.marca, cor = coresLogo(M.cores, variante);
  if (M.estilo && M.estilo !== 'classico') {
    const s = simboloEstilo(ctx, M.estilo, variante, `${classe}${variante}`.replace(/[^a-z0-9]/gi, ''));
    if (s) return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${tamanho}" height="${tamanho}" aria-hidden="true">${s}</svg>`;
  }
  const forma = M.forma === 'nenhuma' ? 'circulo' : M.forma;
  const ini = M.disp === 'monograma' ? iniciais(ctx.nome) : null;
  return `<svg class="${classe}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${tamanho}" height="${tamanho}" aria-hidden="true">${simbolo(ctx.icone, forma, { fundo: cor.fundo, tinta: cor.tinta }, { iniciaisTxt: ini, fonte: M.f })}</svg>`;
}

function estrelinha(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.42 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); }
  return `<polygon points="${pts.join(' ')}"/>`;
}

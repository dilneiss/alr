// Utilidades pequenas: cor, texto, modelos com lacunas, dinheiro.
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cap = (s) => { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
export const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- cor ----------
export function hexRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function lum(h) {
  const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
export const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
// cor de texto legível sobre um fundo: tenta as opções na ordem e fica com a primeira que passa de 4,5:1
export function sobre(bg, ...opcoes) {
  const lista = [...opcoes, '#ffffff', '#111111'];
  for (const c of lista) if (c && contraste(bg, c) >= 4.5) return c;
  return lista.sort((x, y) => contraste(bg, y) - contraste(bg, x))[0];
}
export const escuro = (h) => lum(h) < 0.22;

// Tokens de cor completos a partir de uma paleta da biblioteca.
export function tokens(p) {
  const c = p.c;
  const dark = escuro(c.bg);
  const t = {
    ...c, dark,
    onPri: sobre(c.pri, dark ? c.bg : c.ink, c.bg),
    onSec: sobre(c.sec, c.ink, c.bg),
    onAcc: sobre(c.acc, c.ink, c.bg),
    line: rgba(c.ink, dark ? 0.14 : 0.12),
    soft: mix(c.bg, c.pri, dark ? 0.16 : 0.1),
    soft2: mix(c.bg, c.sec, dark ? 0.2 : 0.18),
    deep: dark ? mix(c.bg, '#000000', 0.35) : mix(c.ink, c.pri, 0.25),
  };
  t.onDeep = sobre(t.deep, '#ffffff', c.bg);
  // cor de destaque que funciona como TEXTO sobre o fundo (títulos, números)
  t.priTxt = contraste(c.pri, c.bg) >= 3 ? c.pri : (contraste(c.acc, c.bg) >= 3 ? c.acc : c.ink);
  t.secTxt = contraste(c.sec, c.bg) >= 3 ? c.sec : t.priTxt;
  return t;
}

// ---------- modelos com lacunas ----------
// "{nome} chegou{em_cidade}!" — lacunas ausentes viram '' ; {e1:🎉} só aparece se o nível de emoji >= 1.
export function preencher(modelo, v, nivelEmoji = 2) {
  let s = String(modelo || '').replace(/\{e([123]):([^}]*)\}/g, (_, n, e) => (nivelEmoji >= +n ? e : ''));
  s = s.replace(/\{([A-Za-z_0-9]+)\}/g, (_, k) => (v[k] == null ? '' : String(v[k])));
  return s.replace(/[ \t]+([!?.,;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
}

// ---------- dinheiro ----------
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function preco(base, fator = 1, unid = '') {
  if (typeof base !== 'number') return base ? String(base) : '';
  let v = base * fator;
  let txt;
  if (v < 100) { v = Math.max(1, Math.round(v)) - 0.1; txt = 'R$ ' + nf2.format(v); }
  else if (v < 1000) txt = 'R$ ' + nf0.format(Math.round(v / 5) * 5);
  else txt = 'R$ ' + nf0.format(Math.round(v / 50) * 50);
  return txt + (unid || '');
}

// ---------- nomes ----------
export function slug(s) { return semAcento(s).toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9]+/g, ''); }
export function iniciais(nome) {
  const pal = String(nome || '').split(/\s+/).filter((w) => w && !/^(d[aeo]s?|e|&|the|of)$/i.test(w));
  return (pal.length > 1 ? pal[0][0] + pal[1][0] : (pal[0] || '?').slice(0, 2)).toUpperCase();
}
export function caixa(nome, modo) {
  if (modo === 'alta') return String(nome).toUpperCase();
  if (modo === 'baixa') return String(nome).toLowerCase();
  return String(nome).replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

// pseudoaleatório estável a partir de uma semente (para detalhes decorativos não mudarem a cada render)
export function rnd(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

export function hoje() { return new Date(); }

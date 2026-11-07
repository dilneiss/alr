// core.js — estado compartilhado, dados, utilidades e ícones. Nenhum texto do negócio mora aqui: tudo que a página
// afirma sai de dados/site.json (S.D). Aqui só há microtexto de interface.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const now = () => performance.now();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const r1 = (v) => Math.round(v * 10) / 10;
export const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const celular = () => window.innerWidth <= 1100;
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const EASE = 'cubic-bezier(.2,.8,.2,1)';
export const pct = (p) => (p == null || isNaN(p) ? '—' : Math.round(p * 100) + '%');
export const juntar = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);

// ------------------------------------------------------------------ HTML com escape por padrão
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s));
const val = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(val).join('') : esc(v));
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += val(vals[i]); });
  return new Raw(out);
}
export function frag(h) { const t = document.createElement('template'); t.innerHTML = String(h); return t.content; }
export function el(h) { return frag(h).firstElementChild; }

// ------------------------------------------------------------------ barramento de eventos da página
const bus = new EventTarget();
export const emit = (tipo, detail) => bus.dispatchEvent(new CustomEvent(tipo, { detail }));
export const on = (tipo, fn) => bus.addEventListener(tipo, (e) => fn(e.detail));

// ------------------------------------------------------------------ ícones em traço (currentColor), 24×24
const P = {
  relogio: '<path d="M19.4 13.4A7.6 7.6 0 1 1 17 6.5"/><path d="M19.6 3.6v4h-4"/><path d="M12 8.3v4l2.6 1.6"/>',
  livros: '<path d="M4.5 19.5v-14a1 1 0 0 1 1-1h2.8v16H5.5a1 1 0 0 1-1-1z"/><path d="M8.3 4.5h3.2v16H8.3"/><path d="M14 5.6l3-.8 3.6 14.4-3 .8z"/>',
  robo: '<rect x="5" y="8.2" width="14" height="10.8" rx="3"/><path d="M12 8.2V5.4"/><circle cx="12" cy="4.3" r="1.1"/><circle cx="9.4" cy="13" r="1"/><circle cx="14.6" cy="13" r="1"/><path d="M9.6 16.2h4.8M3 12.5v2.5M21 12.5v2.5"/>',
  blocos: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="3.5"/>',
  raio: '<path d="M13.2 2.8 5 13.2h6.3l-1.1 8 8.3-10.6h-6.4z"/>',
  arquivo: '<rect x="4" y="3.8" width="16" height="16.4" rx="2"/><path d="M4 9.3h16M4 14.7h16M10.4 6.6h3.2M10.4 12h3.2M10.4 17.4h3.2"/>',
  engrenagem: '<circle cx="12" cy="12" r="2.8"/><circle cx="12" cy="12" r="6.3"/><path d="M12 2.8v2.9M12 18.3v2.9M2.8 12h2.9M18.3 12h2.9M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/>',
  ondas: '<circle cx="12" cy="12" r="2.1"/><path d="M8.3 8.3a5.3 5.3 0 0 0 0 7.4M15.7 8.3a5.3 5.3 0 0 1 0 7.4M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"/>',
  boia: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/><path d="M6.2 6.2l3.4 3.4M14.4 14.4l3.4 3.4M17.8 6.2l-3.4 3.4M9.6 14.4l-3.4 3.4"/>',
  pessoas: '<circle cx="9" cy="8.8" r="3"/><path d="M3.4 19.2a5.6 5.6 0 0 1 11.2 0"/><circle cx="16.8" cy="8" r="2.4"/><path d="M15.8 13.1a4.8 4.8 0 0 1 4.8 5"/>',
  balao: '<path d="M5 4.8h14a1 1 0 0 1 1 1v9.4a1 1 0 0 1-1 1h-7.6l-4.3 3.5v-3.5H5a1 1 0 0 1-1-1V5.8a1 1 0 0 1 1-1z"/><path d="M8.4 9.3h7.2M8.4 12.4h4.6"/>',
  pessoa: '<circle cx="12" cy="8.2" r="3.6"/><path d="M5 20.2a7 7 0 0 1 14 0"/>',
  alvo: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2"/>',
  cartao: '<rect x="3" y="5.8" width="18" height="12.4" rx="2.6"/><path d="M3 10h18M6.8 14.6h4.4"/>',
  interrogacao: '<circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.6a2.6 2.6 0 1 1 3.5 2.4c-.6.3-1 .8-1 1.5v.5"/><circle cx="12" cy="16.9" r=".4" fill="currentColor"/>',
  xicara: '<path d="M5 9h11v5.4a4.6 4.6 0 0 1-4.6 4.6H9.6A4.6 4.6 0 0 1 5 14.4z"/><path d="M16 10.6h1.5a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.6 3.6c-.9 1.1.9 1.9 0 3.1M12.2 3.6c-.9 1.1.9 1.9 0 3.1"/><path d="M4 21h13"/>',
  calendario: '<rect x="4" y="5.4" width="16" height="14.6" rx="2.4"/><path d="M4 10h16M8.4 3.4v4M15.6 3.4v4"/><path d="M8 13.8h1.8M12 13.8h1.8M16 13.8h.1M8 16.8h1.8M12 16.8h1.8"/>',
  estrela: '<path d="M12 3.6l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.3 7 19l1-5.6-4.1-3.9 5.6-.7z"/>',
  folha: '<path d="M5.2 18.8C4.6 10.6 10 4.9 19.2 4.8c.3 9-5 14.6-13.6 14.1"/><path d="M5.2 18.8c2.9-4 6-6.8 9.4-8.8"/>',
  casa: '<path d="M4 11.2 12 4.6l8 6.6"/><path d="M6.2 9.6v9.9h11.6V9.6"/><path d="M10 19.5v-5h4v5"/>',
  presente: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.6 13v6.5h12.8V13M12 9v10.5"/><path d="M12 9C10.7 5.8 6.8 5.2 6.8 7.4 6.8 8.7 9.2 9 12 9zM12 9c1.3-3.2 5.2-3.8 5.2-1.6 0 1.3-2.4 1.6-5.2 1.6z"/>',
  grafico: '<path d="M4.5 4.5v15h15"/><path d="M8 15.2l3.2-4 3 2.4 4.4-6"/>',
  pin: '<path d="M12 20.6s-6.2-5.6-6.2-10.7a6.2 6.2 0 0 1 12.4 0c0 5.1-6.2 10.7-6.2 10.7z"/><circle cx="12" cy="9.9" r="2.3"/>',
  coracao: '<path d="M12 19.4S4.2 14.7 4.2 9.3a3.9 3.9 0 0 1 7.8-1.1 3.9 3.9 0 0 1 7.8 1.1c0 5.4-7.8 10.1-7.8 10.1z"/>',
  sacola: '<path d="M5.2 8.2h13.6l-1.1 11.8H6.3z"/><path d="M9 10.6V7.2a3 3 0 0 1 6 0v3.4"/>',
  livro: '<path d="M12 6.6C10 5.1 7.2 4.6 4.4 5v13.2c2.8-.4 5.6.1 7.6 1.6 2-1.5 4.8-2 7.6-1.6V5c-2.8-.4-5.6.1-7.6 1.6z"/><path d="M12 6.6v13.2"/>',
  ferramenta: '<path d="M14.7 4.1a4.4 4.4 0 0 0-5.2 5.7l-5.2 5.2a1.9 1.9 0 1 0 2.7 2.7l5.2-5.2a4.4 4.4 0 0 0 5.7-5.2l-2.6 2.6-2.5-.6-.6-2.5z"/>',
  chev: '<path d="M6 9.2l6 6 6-6"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  busca: '<circle cx="11" cy="11" r="6.4"/><path d="M15.8 15.8l4.4 4.4"/>',
  ok: '<path d="M5 12.6l4.3 4.3L19 7.2"/>',
  nao: '<path d="M7 7l10 10M17 7L7 17"/>',
  baixo: '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
  cima: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
  brilho: '<path d="M12 3.2l1.7 5.1 5.1 1.7-5.1 1.7L12 16.8l-1.7-5.1L5.2 10l5.1-1.7z"/><path d="M18.6 15.8l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z"/>',
  play: '<path d="M8.2 5.6v12.8L18.4 12z"/>',
  stop: '<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="1.6"/>',
  escudo: '<path d="M12 3.2l7 2.9v5.4c0 4.2-2.9 7.8-7 9.3-4.1-1.5-7-5.1-7-9.3V6.1z"/><path d="M9 12l2.1 2.1L15.3 10"/>',
  cadeado: '<rect x="5.4" y="10.6" width="13.2" height="9.4" rx="2"/><path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6"/>',
  mapa: '<path d="M9 4.6 3.8 6.6v12.8L9 17.4l6 2 5.2-2V4.6L15 6.6z"/><path d="M9 4.6v12.8M15 6.6v12.8"/>',
  raiox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 12h3l2-4 3 8 2-4h6"/>',
  mais: '<path d="M12 6v12M6 12h12"/>',
  menos: '<path d="M6 12h12"/>',
  reorg: '<path d="M7 4.8v14.4M7 19.2l-3-3M7 19.2l3-3M17 19.2V4.8M17 4.8l-3 3M17 4.8l3 3"/>',
  aspas: '<path d="M9.6 6.4C6.8 7.6 5.2 9.9 5.2 13v4.4h5.2v-5.2H7.9c0-1.9.9-3.3 2.6-4.1zM18.4 6.4c-2.8 1.2-4.4 3.5-4.4 6.6v4.4h5.2v-5.2h-2.5c0-1.9.9-3.3 2.6-4.1z" fill="currentColor" stroke="none"/>',
};
export const ICON = (nome, cls = '') => raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] || ''}</svg>`);
export const ICONE_SEC = (id, cls = '') => ICON((S.POR_ID[id] || {}).icone || 'brilho', cls);

// ------------------------------------------------------------------ o site (preenchido por iniciarSite, antes de montar a página)
export const S = { D: null, CFG: null, visita: 1, simulando: null, SECOES: [], LISTAS: [], POR_ID: {}, TIPO: {} };
// {n:<id>} = quantos itens a seção tem; {total:<id>} = soma de n das trilhas (o servidor faz o mesmo)
export const contar = (s) => (['trilhas', 'lista', 'depoimentos', 'faq'].includes(s.tipo) ? s.itens.length : s.tipo === 'espacos' ? s.cards.length : 0);
export const preencher = (t) => String(t == null ? '' : t)
  .replace(/\{n:([a-z0-9_]+)\}/g, (m, id) => (S.POR_ID[id] ? String(contar(S.POR_ID[id])) : m))
  .replace(/\{total:([a-z0-9_]+)\}/g, (m, id) => (S.POR_ID[id] ? String(S.POR_ID[id].itens.reduce((a, x) => a + x.n, 0)) : m));
export function iniciarSite(dados, cfg) {
  S.D = dados;
  S.CFG = cfg;
  S.SECOES = dados.secoes.map((s) => s.id);
  S.LISTAS = dados.secoes.filter((s) => ['trilhas', 'lista', 'depoimentos'].includes(s.tipo)).map((s) => s.id);
  S.POR_ID = Object.fromEntries(dados.secoes.map((s) => [s.id, s]));
  for (const s of dados.secoes) if (!S.TIPO[s.tipo]) S.TIPO[s.tipo] = s.id; // a (primeira) seção de cada tipo: S.TIPO.oferta, S.TIPO.faq…
  Object.assign(S, visitaLimpa());
}
export const SEC = (id) => S.POR_ID[id];
export const OFERTA = () => S.POR_ID[S.TIPO.oferta];
export const FAQ = () => S.POR_ID[S.TIPO.faq];
export const faqItem = (fid) => FAQ().itens.find((f) => f.id === fid);
export const PRECO = () => OFERTA().preco;                                       // null = "Fale com a gente"
export const precoTxt = () => { const p = PRECO(); return p ? `${p.a_partir ? 'a partir de ' : ''}${p.por}${p.periodo}` : ''; };  // "R$69/mês" ou "a partir de R$3.500"
export const comPreco = (txt) => (PRECO() && FORM() === 'pagamento' ? `${txt} · ${precoTxt()}` : txt);  // "Assinar o clube · R$69/mês"; no contato, só o texto
export const FORM = () => (S.D.conversao.tipo === 'pagamento' ? 'pagamento' : 'contato');

// ------------------------------------------------------------------ estado da visita
function visitaLimpa() {
  const t = now();
  return {
    t0: t,
    ultimaAtividade: t,
    ocioso: false,
    sec: Object.fromEntries(S.SECOES.map((id) => [id, { aberta: false, ordem: 0, vezes: 0, abertaMs: 0, abertaEm: 0, fechouRapido: false }])),
    ordemAb: 0,
    itens: [],        // [{ secao, id, acao, ms, aberto, abriu, lido }]
    blocos: [],       // 'Filtrados · Etapa 1 · Filtro de papel'
    buscas: [],
    faq: [],
    preco: { hoverMs: 0, vezes: 0, copiou: false },
    cta: { cliques: 0, checkout_aberto: false, campos: 0, erros: 0, entrou: false },
    cliques: { raiva: 0, mortos: 0 },
    saida: { vezes: 0, em: null },
    guia: { acoes: [], ultimaEm: null, sugeriu: '', aceitou: 0, ignorou: 0 },
    rolagem: { max: 0, atual: 0, inversoes: [], rapidas: [], desceuEm: -1e9, subiuEm: -1e9 },
    eventos: [],      // [{ t, txt }]
    feitos: [],       // o que a pessoa fez, em ordem, para as etiquetas "porque você abriu…": [{ t, txt }]
    secaoAtual: 'topo',
    listaEmFoco: '',
    decisoes: [],
    adaptacoes: [],
    ultima: null,
    pins: {},         // secao → [{ id, p }]
    pinsMax: {},      // secao → maior certeza já mostrada (para o resumo)
  };
}
export function novaVisitaEstado() { Object.assign(S, visitaLimpa()); S.visita++; }

// ------------------------------------------------------------------ nomes (tudo do site.json / do /api/config)
export const nomeSecao = (id) => (S.CFG && S.CFG.secoes && S.CFG.secoes[id] ? S.CFG.secoes[id][1] : (S.POR_ID[id] || {}).nome || id);
export const emojiSecao = (id) => (S.CFG && S.CFG.secoes && S.CFG.secoes[id] ? S.CFG.secoes[id][0] : (S.POR_ID[id] || {}).emoji || '');
export const itensDe = (secao) => (S.POR_ID[secao] && S.POR_ID[secao].itens) || [];
export function item(secao, id) { return itensDe(secao).find((x) => String(x.id) === String(id)); }
export function nomeItem(secao, id) { const x = item(secao, id); return x ? x.nome : String(id); }

// ------------------------------------------------------------------ rolagem que a PRÓPRIA página faz (não conta como gesto da pessoa)
export const auto = { ate: 0 };
export function rolarPara(y, opts = {}) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const alvo = clamp(Math.round(y), 0, Math.max(0, max));
  auto.ate = now() + 1600;
  return new Promise((res) => {
    if (Math.abs(window.scrollY - alvo) < 2) return res();
    window.scrollTo({ top: alvo, behavior: RM() || opts.instant ? 'instant' : 'smooth' });
    let ultimo = window.scrollY, parado = 0;
    const t0 = now();
    const iv = setInterval(() => {
      const y2 = window.scrollY;
      parado = Math.abs(y2 - ultimo) < 1 ? parado + 1 : 0;
      ultimo = y2;
      if (parado >= 3 || now() - t0 > 1800) { clearInterval(iv); auto.ate = now() + 200; res(); }
    }, 60);
  });
}
export const topoUtil = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 60) + 12;

// ------------------------------------------------------------------ FLIP: reordena filhos de um contêiner animando só transform
export function reordenar(container, ordem, animar) {
  const antes = new Map();
  if (animar) for (const c of container.children) antes.set(c, c.getBoundingClientRect());
  const atual = [...container.children].filter((c) => ordem.includes(c));
  const mudou = atual.length !== ordem.length || atual.some((c, i) => c !== ordem[i]);
  const set = new Set(ordem);
  for (const c of [...container.children]) if (!set.has(c) && !c.hasAttribute('data-fixo')) c.remove();
  if (mudou || [...container.children].length !== ordem.length) ordem.forEach((c) => container.appendChild(c));
  if (!animar || RM()) return mudou;
  for (const c of ordem) {
    const a = antes.get(c);
    if (!a) { c.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE }); continue; }
    const b = c.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 620, easing: EASE });
  }
  return mudou;
}

// visível na janela (fração da altura do elemento que aparece)
export function fracaoVisivel(elm) {
  if (!elm || !elm.getClientRects().length) return 0;
  const r = elm.getBoundingClientRect(), top = topoUtil() - 12, bot = window.innerHeight;
  const vis = Math.max(0, Math.min(r.bottom, bot) - Math.max(r.top, top));
  return r.height ? vis / Math.min(r.height, bot - top) : 0;
}

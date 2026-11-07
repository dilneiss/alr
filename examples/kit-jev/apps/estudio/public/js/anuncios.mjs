// Anúncios de display do Estúdio por Voz: um kit de banners HTML5 nos tamanhos padrão IAB.
// Cada banner nasce das decisões do Jev (ctx.anuncios: conceito × título, estilo, botão, selo, cores e animação) e da
// marca (paleta, fontes, logo, ilustração, cantos, botão e textura do site). Texto só do contexto.
// HTML por string (o estúdio redesenha várias vezes por minuto); aparência e movimento em ../css/anuncios.css
// (prefixo ad-), só CSS: nada de setInterval. Os banners têm o tamanho EXATO em px; painel e vitrines só escalam.
import { esc, mix, rgba, contraste, sobre, lum, hexRgb, iniciais, rnd, cap } from './util.mjs';
import { arte, padrao } from './arte.mjs';
import { logoSVG, simboloSVG, carregarFontes, fontesCarregadas } from './marca.mjs';
import { UI, ICONE } from '../lib/icones.mjs';
import { resolverAjustes, valorPara, fundoDe, suavizar, amostras, mediaCor, gradiente, corTextoPara, estiloAjustes } from './ajustes-css.mjs';

// ajustes de estilo (ajustes-css.mjs) que valem para os banners: o fundo entra no ESQUEMA de cor (tinta, botão,
// cartões e selos recalculados sobre o fundo novo), a caixa e o tamanho dos títulos entram no encaixe
const AJ = new WeakMap();
function ajustesAds(ctx) {
  if (!ctx || !Array.isArray(ctx.ajustes) || !ctx.ajustes.length) return null;
  const sig = JSON.stringify(ctx.ajustes), memo = AJ.get(ctx); // a lista pode mudar no mesmo ctx: confere a assinatura
  if (memo && memo.sig === sig) return memo.r;
  let r = resolverAjustes(ctx.ajustes, 'anuncios');
  if (!Object.keys(r).length) r = null;
  AJ.set(ctx, { sig, r });
  return r;
}

// [largura, altura, nome, id]
export const TAMANHOS = [
  [300, 250, 'Retângulo médio', 'retangulo'],
  [728, 90, 'Super banner', 'superbanner'],
  [160, 600, 'Arranha-céu largo', 'arranhaceu'],
  [320, 50, 'Banner de celular', 'celular'],
  [300, 600, 'Meia página', 'meiapagina'],
  [970, 250, 'Billboard', 'billboard'],
];
const IAB = { retangulo: 'Medium Rectangle', superbanner: 'Leaderboard', arranhaceu: 'Wide Skyscraper', celular: 'Mobile Leaderboard', meiapagina: 'Half Page', billboard: 'Billboard' };
const ORDEM_PRANCHA = ['billboard', 'superbanner', 'celular', 'meiapagina', 'arranhaceu', 'retangulo'];

// Largura dos caracteres (em) de cada fonte da biblioteca, por classe, medida no peso de uso:
// [estreitas il.,:;!|' · ftrj · mw · demais minúsculas · IJ · MW · demais maiúsculas · algarismos · espaço · $%&?/+-].
// Com a fonte já carregada, a medida vem do canvas (exata); antes disso, desta tabela (o app redesenha quando a fonte chega).
const TAB_D = {
  'Bodoni Moda': [0.259, 0.379, 0.825, 0.57, 0.438, 0.96, 0.707, 0.552, 0.25, 0.624], 'Instrument Serif': [0.225, 0.27, 0.65, 0.41, 0.249, 0.658, 0.486, 0.386, 0.17, 0.446],
  Anton: [0.234, 0.299, 0.727, 0.483, 0.346, 0.729, 0.462, 0.478, 0.234, 0.515], Outfit: [0.279, 0.388, 0.829, 0.553, 0.412, 0.93, 0.686, 0.557, 0.19, 0.555],
  'Space Grotesk': [0.286, 0.389, 0.819, 0.597, 0.437, 0.89, 0.626, 0.593, 0.254, 0.568], Figtree: [0.27, 0.366, 0.854, 0.559, 0.42, 0.921, 0.671, 0.575, 0.238, 0.571],
  Nunito: [0.273, 0.368, 0.875, 0.565, 0.334, 0.998, 0.693, 0.6, 0.279, 0.591], Fraunces: [0.303, 0.419, 0.922, 0.599, 0.494, 1.022, 0.741, 0.619, 0.21, 0.609],
  'Zilla Slab': [0.249, 0.362, 0.818, 0.535, 0.419, 0.944, 0.656, 0.525, 0.187, 0.501], Cinzel: [0.281, 0.533, 0.867, 0.67, 0.386, 0.962, 0.737, 0.581, 0.25, 0.551],
  'Crimson Pro': [0.28, 0.341, 0.821, 0.512, 0.337, 0.912, 0.609, 0.517, 0.192, 0.531], Marcellus: [0.254, 0.333, 0.817, 0.534, 0.257, 1.016, 0.636, 0.532, 0.3, 0.57],
  Archivo: [0.303, 0.357, 0.898, 0.612, 0.479, 0.946, 0.737, 0.625, 0.189, 0.611], 'Space Mono': [0.612, 0.612, 0.612, 0.612, 0.612, 0.612, 0.612, 0.612, 0.612, 0.612],
  Righteous: [0.259, 0.371, 0.76, 0.562, 0.344, 0.82, 0.643, 0.57, 0.28, 0.534], Syne: [0.358, 0.557, 1.558, 0.995, 0.712, 1.731, 1.198, 1.029, 0.31, 0.89],
  Caveat: [0.203, 0.301, 0.543, 0.379, 0.362, 0.724, 0.509, 0.449, 0.242, 0.441],
};
// fontes de texto no peso 800 (botão, cupom, selos)
const TAB_B = {
  Jost: [0.323, 0.336, 0.791, 0.562, 0.325, 0.978, 0.689, 0.636, 0.3, 0.632], Outfit: [0.287, 0.4, 0.839, 0.562, 0.428, 0.939, 0.695, 0.564, 0.185, 0.559],
  Archivo: [0.303, 0.357, 0.898, 0.612, 0.479, 0.946, 0.737, 0.625, 0.189, 0.611], 'Space Grotesk': [0.286, 0.389, 0.819, 0.597, 0.437, 0.89, 0.626, 0.593, 0.254, 0.568],
  Figtree: [0.285, 0.379, 0.87, 0.567, 0.433, 0.929, 0.678, 0.58, 0.234, 0.576], Nunito: [0.273, 0.368, 0.875, 0.565, 0.334, 0.998, 0.693, 0.6, 0.279, 0.591],
  'Courier Prime': [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], 'Crimson Pro': [0.293, 0.354, 0.84, 0.524, 0.352, 0.928, 0.623, 0.53, 0.194, 0.543],
};
const TAB_PADRAO = [0.28, 0.37, 0.84, 0.56, 0.4, 0.93, 0.68, 0.57, 0.24, 0.57];
const CLASSE = {};
for (const [i, cs] of ["il.,:;!|'", 'ftrj', 'mw', '', 'IJ', 'MW', '', '0123456789', ' ', '$%&?/+-'].entries()) for (const ch of cs) CLASSE[ch] = i;
const tabelaEm = (p, tab) => {
  let w = 0;
  for (const ch0 of p) {
    const ch = ch0.normalize('NFD')[0];
    let i = CLASSE[ch];
    if (i == null) i = ch !== ch.toLowerCase() ? 6 : 3;
    w += tab[i];
  }
  return w;
};
// largura (em, sem tracking) de uma palavra na fonte: canvas quando a fonte está carregada, senão a tabela
let cv2d = null;
const CACHE_EM = new Map();
function larguraEm(p, familia, peso, tab) {
  if (typeof document !== 'undefined' && document.fonts) {
    const chave = `${peso}|${familia}|${p}`;
    let v = CACHE_EM.get(chave);
    if (v != null) return v;
    let pronta = false;
    try { pronta = document.fonts.check(`${peso} 40px ${familia}`, p); } catch { pronta = false; }
    if (pronta) {
      cv2d = cv2d || document.createElement('canvas').getContext('2d');
      cv2d.font = `${peso} 100px ${familia}`;
      v = cv2d.measureText(p).width / 100;
      if (CACHE_EM.size > 4000) CACHE_EM.clear();
      CACHE_EM.set(chave, v);
      return v;
    }
  }
  return tabelaEm(p, tab) * 1.07; // a tabela é média por classe: erra até ~8% numa palavra; melhor sobrar que estourar
}
const fam1 = (s) => String(s || '').split(',')[0].replace(/["']/g, '').trim();
const f1 = (v) => Math.round(v * 10) / 10;
const P = (x, y, w, h) => `left:${f1(x)}px;top:${f1(y)}px${w != null ? `;width:${f1(w)}px` : ''}${h != null ? `;height:${f1(h)}px` : ''}`;
const ic = (miolo, cls = '', sw = 2) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${miolo}</svg>`;
const estrelas = (n = 5, cls = 'ad-est') => `<span class="${cls}" aria-label="${n} estrelas">${`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/></svg>`.repeat(n)}</span>`;

// ------------------------------------------------------------------ cor
const dist = (a, b) => { const A = hexRgb(a), B = hexRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const primeiro = (lista, ok, reserva) => lista.find((x) => x && ok(x)) || reserva;

// paleta da marca "vista" sobre outro fundo: é o que a arte() e o logo recebem para continuarem legíveis
// (no vermelho da marca, o medalhão vira branco; no papel claro de uma marca escura, o nome vira escuro…)
function paletaSobre(c, base) {
  if (base === c.bg) return c;
  const dark = lum(base) < 0.18;
  const ink = dark ? sobre(base, c.dark ? c.ink : c.bg, '#ffffff') : sobre(base, c.dark ? c.bg : c.ink, '#111111');
  const ve = (x, min = 1.9) => contraste(x, base) >= min && dist(x, base) > 70;
  const pri = primeiro([c.pri, c.onPri, c.acc, c.sec], (x) => ve(x), ink);
  const acc = primeiro([c.acc, c.sec, c.pri, ink], (x) => x !== pri && ve(x, 1.5), pri);
  const sec = primeiro([c.sec, c.acc, c.pri], (x) => x !== pri && contraste(x, base) >= 1.25 && dist(x, base) > 45, mix(base, pri, 0.3));
  const t = {
    ...c, bg: base, ink, dark, pri, sec, acc, onPri: sobre(pri, base, ink, c.bg, c.ink), onSec: sobre(sec, ink, base), onAcc: sobre(acc, base, ink),
    muted: mix(base, ink, 0.6), surf: mix(base, ink, 0.07), soft: mix(base, pri, dark ? 0.2 : 0.12), soft2: mix(base, sec, 0.2),
    deep: dark ? mix(base, '#000000', 0.35) : mix(ink, pri, 0.25),
  };
  t.onDeep = sobre(t.deep, '#ffffff', base);
  t.priTxt = contraste(pri, base) >= 3 ? pri : contraste(acc, base) >= 3 ? acc : ink;
  t.secTxt = contraste(sec, base) >= 3 ? sec : t.priTxt;
  t.line = rgba(ink, 0.14);
  return t;
}
const ctxCom = (ctx, cores) => (cores === ctx.marca.cores ? ctx : { ...ctx, marca: { ...ctx.marca, cores } });

// esquema de cores do banner: fundo (decisão "cores") × estilo; tudo com contraste conferido
function esquema(K) {
  const { c, estilo, fundo } = K;
  const premium = estilo === 'premium';
  const escuroB = c.dark ? c.bg : lum(c.deep) < 0.035 ? c.deep : mix(c.deep, '#000000', 0.4);
  const papel = c.dark ? (lum(c.ink) > 0.6 ? c.ink : mix(c.ink, '#ffffff', 0.6)) : c.bg;
  let base;
  if (K.baseAj) base = K.baseAj;
  else if (premium) base = fundo === 'claro' ? papel : fundo === 'solido' || fundo === 'gradiente' ? mix(c.pri, '#000000', 0.66) : escuroB;
  else base = fundo === 'escuro' ? escuroB : fundo === 'claro' ? papel : fundo === 'cena' ? (c.dark ? c.surf : c.soft) : c.pri;
  const escura = lum(base) < 0.18;
  const naCor = base === c.pri;
  const ink = naCor ? sobre(base, c.onPri, c.ink, c.bg) : escura ? sobre(base, c.dark ? c.ink : c.bg, '#ffffff') : sobre(base, c.dark ? c.bg : c.ink, '#111111');
  const subC = mix(base, ink, 0.8);
  const sub = contraste(subC, base) >= 4.5 ? subC : ink;
  const longe = (x, y, d) => dist(x, y) > d;
  // cor de destaque que funciona como TEXTO grande sobre o fundo; se nenhuma passar, o destaque vira marca-texto
  const candAcc = premium ? [c.acc, c.sec, c.pri, c.priTxt].sort((a, b) => contraste(b, base) - contraste(a, base)) : [c.pri, c.acc, c.sec, c.priTxt];
  const acc = primeiro(candAcc, (x) => contraste(x, base) >= 3 && longe(x, base, 60) && longe(x, ink, premium ? 55 : 90), null);
  const hlBg = primeiro([c.acc, c.sec, c.onPri, c.pri, ink], (x) => longe(x, base, 110) && contraste(x, base) >= 1.8, ink);
  const hlInk = sobre(hlBg, naCor ? base : c.bg, c.ink, base, ink);
  // botão: forma que se destaca do fundo (≥ 2,2:1) e texto ≥ 4,5:1 sobre ele
  let btn;
  if (premium) btn = escura ? (acc && contraste(acc, base) >= 3 ? acc : primeiro([c.acc, c.sec, c.pri], (x) => contraste(x, base) >= 3 && longe(x, ink, 60), '#ffffff'))
    : primeiro([c.deep, c.ink, c.pri], (x) => contraste(x, base) >= 4.5, '#111111');
  else if (naCor) btn = primeiro([c.acc, c.sec, ink, c.bg, '#ffffff'], (x) => contraste(x, base) >= 2.2 && longe(x, base, 70), ink);
  else if (escura) btn = primeiro([c.pri, c.acc, c.sec, ink], (x) => contraste(x, base) >= 2.2 && longe(x, base, 70), ink);
  else btn = primeiro([c.pri, c.deep, ink], (x) => contraste(x, base) >= 2.2 && longe(x, base, 70), ink);
  const btnInk = sobre(btn, naCor ? base : '', c.onPri, c.bg, c.ink, base);
  // cartões (depoimento, cupom): superfície clara sobre fundos escuros ou de cor; branca sobre papel
  let card, cardBorda = 'transparent';
  if (premium && escura) { card = mix(base, '#ffffff', 0.07); cardBorda = rgba(acc || ink, 0.45); }
  else if (escura || naCor || fundo === 'padrao') card = contraste(papel, base) >= 1.6 ? papel : '#ffffff';
  else card = dist(base, '#ffffff') > 14 ? '#ffffff' : (c.dark ? c.ink : c.surf);
  const cardInk = premium && escura ? ink : sobre(card, c.dark ? c.bg : c.ink, '#111111');
  const cardSubC = mix(card, cardInk, 0.72);
  const cardSub = contraste(cardSubC, card) >= 4.5 ? cardSubC : cardInk;
  const cardAcc = primeiro([c.pri, c.acc, c.priTxt, cardInk], (x) => contraste(x, card) >= 3, cardInk);
  // selo e etiqueta de preço: a cor que mais salta do fundo
  const pop = naCor ? [c.acc, c.sec, papel, '#ffffff'] : escura ? [c.acc, c.pri, c.sec, '#ffffff'] : [c.pri, c.acc, c.deep];
  const selo = primeiro(pop, (x) => contraste(x, base) >= 2 && longe(x, base, 90), ink);
  const seloInk = sobre(selo, naCor ? base : '', c.bg, c.ink, '#111111', '#ffffff');
  const etq = primeiro(escura ? [c.acc, c.sec, papel] : naCor ? [c.acc, papel, c.sec] : [c.pri, c.acc, c.deep], (x) => contraste(x, base) >= 1.9 && longe(x, base, 90), selo);
  const etqInk = sobre(etq, naCor ? base : '', c.bg, c.ink, '#111111', '#ffffff');
  const ouro = premium ? (acc || primeiro([c.acc, c.sec, c.pri], (x) => contraste(x, base) >= 2.2, ink)) : (acc || hlBg);
  return {
    base, papel, escuroB, escura, naCor, ink, sub, acc, hlBg, hlInk, marcaTexto: !acc, btn, btnInk, card, cardInk, cardSub, cardAcc, cardBorda,
    selo, seloInk, etq, etqInk, ouro, glow: escura ? (dist(c.pri, base) > 60 ? c.pri : ouro) : naCor ? '#ffffff' : c.pri,
  };
}

// ------------------------------------------------------------------ o "kit": tudo que não depende do tamanho
const MEMO = new WeakMap();
// contextos recentes, para o ativarAnuncios() redesenhar os banners quando as fontes da marca terminarem de carregar
const CTXS = new Map();
function kit(ctx) {
  let K = MEMO.get(ctx);
  const sigAj = Array.isArray(ctx.ajustes) && ctx.ajustes.length ? JSON.stringify(ctx.ajustes) : '';
  if (!K || K.sigAj !== sigAj) { K = montarKit(ctx); K.sigAj = sigAj; MEMO.set(ctx, K); }
  return K;
}
function partesPreco(p) {
  const m = String(p || '').match(/^R\$\s?([\d.]+)(,\d{2})?\s*(.*)$/);
  return m ? { int: m[1], cent: m[2] || '', suf: m[3] || '' } : null;
}
function montarKit(ctx) {
  const A = ctx.anuncios, M = ctx.marca, c = M.cores, f = M.f, pk = ctx.pack;
  const aj = ajustesAds(ctx);
  const cxAj = aj && valorPara(aj, 'caixa', 'titulos');
  const alta = cxAj ? cxAj === 'maiusculas' : !!f.caixa;
  const tabD = TAB_D[fam1(f.disp)] || TAB_PADRAO, tabB = TAB_B[fam1(f.body)] || TAB_PADRAO;
  const K = {
    ctx, c, f, A, pk, alta, folga: ctx.__adExportar ? 1.1 : 1,
    estilo: A.estilo || 'produto', fundo: A.fundo || 'solido', anim: A.anim || 'sequencia', selo: A.selo || 'nenhum', conceito: (A.conceito && A.conceito.id) || 'produto',
    titulo: String(A.titulo || ctx.nome), cta: String((A.cta && A.cta.texto) || 'Saiba mais'),
    tabD, tabB, tr: parseFloat(f.tr) || 0,
    lh: alta ? 0.95 : fam1(f.disp) === 'Caveat' ? 1 : 1.05,
    serifa: /serif/.test(f.disp) && !/sans-serif/.test(f.disp), ital: !!f.ital,
  };
  // item em destaque: o que o título cita (ex.: "Novidade: {item3}"); senão, o do contexto
  K.item = ctx.itens.find((it) => K.titulo.includes(it.nome)) || A.item || ctx.itens[0];
  K.preco = partesPreco(K.item.preco);
  K.oferta = ctx.oferta || null;
  const nota = pk.nums.find(([v]) => /★/.test(v));
  K.nota = nota ? { v: nota[0].replace('★', '').trim(), r: nota[1] } : null;
  K.prova = pk.nums[0];
  K.depos = [...pk.depo].sort((a, b) => a[0].length - b[0].length);
  K.kicker = `${pk.cat}${ctx.cidade ? ` · ${ctx.cidade.nome}` : ''}`;
  K.local = ctx.cidade ? `${ctx.cidade.nome} · ${ctx.cidade.uf}` : cap(pk.cat);
  K.destaque = acharDestaque(K);
  K.fz = (aj && valorPara(aj, 'tamanho', 'titulos')) || 1;
  K.S = esquema(K);
  // ajuste de fundo (página, seções ou topo = o banner inteiro): o esquema é refeito sobre a cor nova
  for (const { elemento, valor } of (aj && aj.fundo) || []) {
    if (!['pagina', 'secoes', 'topo'].includes(elemento)) continue;
    const F = fundoDe(valor, K.S.base, c.ink);
    if (!F) continue;
    const cores = F.solida ? [F.solida] : suavizar(F.cores);
    K.baseAj = F.solida || mediaCor(amostras(cores));
    K.fundoAj = F.solida ? null : gradiente(cores, F.direcao === 'vertical' ? 'vertical' : F.direcao);
    K.S = esquema(K);
  }
  // cor do texto pedida, conferida contra o fundo do banner
  const ct = aj && valorPara(aj, 'cor_texto', 'titulos'), cxT = aj && valorPara(aj, 'cor_texto', 'textos');
  if (ct) K.S = { ...K.S, ink: corTextoPara(ct, [K.S.base], 3.2), acc: K.S.acc && corTextoPara(ct, [K.S.base], 3.2) };
  if (cxT) K.S = { ...K.S, sub: corTextoPara(cxT, [K.S.base], 4.5) };
  K.raio = { retos: 3, suaves: 10, redondos: 18 }[ctx.site && ctx.site.cantos] ?? 10;
  K.btn = (ctx.site && ctx.site.btn) || 'pilula';
  K.btnR = { pilula: 999, suave: 9, reto: 0, contorno: 999, bloco: 4, gradiente: 999 }[K.btn] ?? 999;
  K.tex = (ctx.site && ctx.site.textura) || 'nenhuma';
  K.img = (ctx.site && ctx.site.img) || 'flat';
  // herói do quadro 2 da sequência (e da vitrine): o que o conceito pede
  K.heroi = K.estilo === 'cupom' && K.oferta ? 'oferta' : K.estilo === 'depoimento' ? 'depo'
    : (K.conceito === 'oferta' || K.conceito === 'urgencia') && K.oferta ? 'oferta'
      : K.conceito === 'prova' ? 'prova' : K.conceito === 'local' ? 'local' : K.conceito === 'marca' ? 'marca' : 'produto';
  const S = K.S, cx = (x) => esc(x);
  // hash estável do conteúdo: ids de SVG únicos entre marcas na mesma página, e o MESMO HTML quando nada mudou
  // (o estúdio compara o HTML para não redesenhar à toa e reiniciar a animação)
  try { K.fontesProntas = fontesCarregadas(f, M.fontesExtras || []); } catch { K.fontesProntas = true; }
  const sem = [ctx.nome, ctx.segId, M.paleta && M.paleta.id, M.fonte && M.fonte.id, M.estilo, M.forma, M.disp, ctx.icone.id, K.estilo, K.fundo, K.anim, K.selo, K.conceito, K.titulo, K.cta, ctx.site && ctx.site.img, K.item.nome, K.item.preco, ctx.__adExportar ? 'x' : '', ...(aj ? [JSON.stringify(aj)] : [])].join('|');
  let hh = 2166136261;
  for (const ch of sem) { hh ^= ch.charCodeAt(0); hh = Math.imul(hh, 16777619); }
  K.id = (hh >>> 0).toString(36).slice(0, 6);
  CTXS.set(K.id, ctx);
  if (CTXS.size > 24) CTXS.delete(CTXS.keys().next().value);
  K.vars = [
    `--ad-bg:${S.base}`, `--ad-ink:${S.ink}`, `--ad-sub:${S.sub}`, `--ad-acc:${S.acc || S.ink}`, `--ad-hl-bg:${S.hlBg}`, `--ad-hl-ink:${S.hlInk}`,
    `--ad-btn:${S.btn}`, `--ad-btn-ink:${S.btnInk}`, `--ad-btn-2:${mix(S.btn, S.escura ? '#ffffff' : c.acc, 0.35)}`, `--ad-card:${S.card}`, `--ad-card-ink:${S.cardInk}`, `--ad-card-sub:${S.cardSub}`,
    `--ad-card-acc:${S.cardAcc}`, `--ad-card-borda:${S.cardBorda}`, `--ad-selo:${S.selo}`, `--ad-selo-ink:${S.seloInk}`, `--ad-etq:${S.etq}`, `--ad-etq-ink:${S.etqInk}`,
    `--ad-ouro:${S.ouro}`, `--ad-estrela:${contraste('#f5b301', S.base) >= 2 ? '#f5b301' : S.ink}`, `--ad-glow:${rgba(S.glow, S.escura ? 0.42 : S.naCor ? 0.2 : 0.16)}`, `--ad-line:${rgba(S.ink, 0.2)}`,
    `--ad-fd:${cx(f.disp)}`, `--ad-fw:${f.dw}`, `--ad-fb:${cx(f.body)}`, `--ad-tr:${f.tr || '0'}`, `--ad-tt:${alta ? 'uppercase' : 'none'}`, `--ad-lh:${K.lh}`,
    `--ad-r:${K.raio}px`, `--ad-br:${K.btnR}px`,
  ].join(';');
  return K;
}
function acharDestaque(K) {
  const t = K.titulo, ctx = K.ctx, low = t.toLowerCase();
  const cands = [K.item.preco, K.oferta && K.oferta.curta, ...K.pk.nums.map(([v]) => v), ...ctx.itens.map((i) => i.nome), ctx.cidade && ctx.cidade.nome];
  for (const x of cands) {
    if (!x || String(x).length < 3) continue;
    const i = low.indexOf(String(x).toLowerCase());
    if (i >= 0) return [t.slice(0, i), t.slice(i, i + String(x).length), t.slice(i + String(x).length)];
  }
  const m = t.match(/^(.+?[.!?])\s+(\S.+)$/);
  return m ? [m[1] + ' ', m[2], ''] : null;
}

// ------------------------------------------------------------------ encaixe de texto (tamanho que cabe em N linhas)
function cabe(K, txt, w, n, min, max, hmax = 1e9, o = {}) {
  const corpo = !!o.corpo, tr = o.tr ?? (corpo ? 0 : K.tr), lh = o.lh ?? K.lh, fator = (o.fator ?? 1) * 1.03 * (K.folga || 1);
  if (!corpo && K.fz && K.fz !== 1) { max *= K.fz; if (K.fz < 1) min *= K.fz; } // ajuste de tamanho: o encaixe decide até onde dá
  const alta = o.alta ?? (corpo ? false : K.alta);
  const fam = corpo ? K.f.body : K.f.disp, peso = corpo ? 800 : K.f.dw, tab = corpo ? K.tabB : K.tabD;
  const pal = colar(alta ? String(txt).toUpperCase() : String(txt)).trim().split(/[ \t\n]+/);
  const folga = !corpo && K.S && K.S.marcaTexto && K.destaque ? 0.26 : 0; // recuo do marca-texto
  const ws = pal.map((p) => larguraEm(p, fam, peso, tab) * fator + folga), esp = larguraEm(' ', fam, peso, tab) || tab[8];
  const quebra = (s) => {
    let linhas = 1, x = 0;
    for (let i = 0; i < pal.length; i++) {
      const pw = s * (ws[i] + tr * pal[i].length);
      if (pw > w) return 0;
      if (!x) x = pw; else if (x + s * (esp + tr) + pw <= w) x += s * (esp + tr) + pw; else { linhas++; x = pw; }
    }
    return linhas;
  };
  for (let s = max; s >= min - 1e-6; s -= 0.5) {
    const linhas = quebra(s);
    if (linhas && linhas <= n && linhas * s * lh <= hmax) return { fs: s, n: linhas, ok: true, h: linhas * s * lh };
  }
  // não coube no mínimo: nunca deixa palavra vazar para o lado (desce até caber na largura)
  let s = min;
  while (s > Math.max(8, min * 0.6) && !quebra(s)) s -= 0.5;
  const linhas = quebra(s) || pal.length;
  return { fs: s, n: linhas, ok: false, h: linhas * s * lh };
}
// largura (px) de um texto numa linha só, na fonte de texto (800) ou de display
const largTxt = (K, txt, fs, { corpo = true, alta = false, tr = 0 } = {}) => {
  const t = alta ? String(txt).toUpperCase() : String(txt);
  const fam = corpo ? K.f.body : K.f.disp, peso = corpo ? 800 : K.f.dw, tab = corpo ? K.tabB : K.tabD;
  return t.split(/(\s+)/).reduce((soma, p) => soma + (p.trim() ? larguraEm(p, fam, peso, tab) : (larguraEm(' ', fam, peso, tab) || tab[8]) * p.length), 0) * fs * 1.03 * (K.folga || 1) + tr * fs * t.length;
};

// ------------------------------------------------------------------ peças
// título com o trecho de destaque (preço, oferta, número, item, cidade ou a 2ª frase). modo "rv": palavra por palavra.
// espaço inseparável depois de palavra de uma letra (a, é, o, e…) e de "R$": nada disso fica sozinho no fim da linha
const colar = (t) => String(t).replace(/(^|\s)([^\s·]|R\$)\s+/g, (m, a, w) => `${a}${w}\u00a0`).replace(/ ·/g, '\u00a0·');
function tituloMiolo(K, txt, rv) {
  let i = 0;
  txt = colar(txt);
  const pal = (s) => (rv ? String(s).split(/([ \t\n]+)/).map((p) => (/^[ \t\n]+$/.test(p) || !p ? p : `<span class="ad-w" style="--i:${i++}">${esc(p)}</span>`)).join('') : esc(s));
  if (txt !== colar(K.titulo) || !K.destaque) return pal(txt);
  const [a, d, z] = K.destaque.map(colar);
  return `${pal(a)}<em class="ad-hl">${pal(d)}</em>${pal(z)}`;
}
function tit(b, { w, n, min, max, hmax, txt, cls = '', alinhar = '', campo = true }) {
  const { K } = b;
  const t = txt || K.titulo;
  const r = cabe(K, t, w, n, min, max, hmax);
  const rv = K.anim === 'revelar' && b.q !== 'q1' && t === K.titulo;
  const st = `font-size:${r.fs}px;max-width:${f1(w)}px${alinhar ? `;text-align:${alinhar === 'c' ? 'center' : alinhar === 'r' ? 'right' : 'left'}` : ''}`;
  const dc = campo && t === K.titulo ? ' data-campo="anuncio"' : '';
  const html = rv
    ? `<div class="ad-tit ad-tit--rv ${cls}" style="${st}"><span class="ad-tit-base"${dc}>${tituloMiolo(K, t, false)}</span><span class="ad-tit-rv" aria-hidden="true">${tituloMiolo(K, t, true)}</span></div>`
    : `<div class="ad-tit ${cls}" style="${st}"${dc}>${tituloMiolo(K, t, false)}</div>`;
  return { html, fs: r.fs, n: r.n, h: r.n * r.fs * K.lh, ok: r.ok };
}
// texto curto para o banner de celular quando o título não cabe: sempre do contexto
function tituloCurto(K) {
  const it = K.item, o = K.oferta;
  switch (K.conceito) {
    case 'oferta': case 'urgencia': return o ? cap(o.frase) : `${it.nome} · ${it.preco}`;
    case 'marca': return K.ctx.marca.slogan;
    case 'prova': return `${K.prova[0]} ${K.prova[1]}`;
    case 'local': return `${K.ctx.nome} · ${K.local}`;
    default: return `${it.nome} · ${it.preco}`;
  }
}

function logo(b, { x, y, h, maxW = 1e9, base, alinhar = 'l', simbolo = false, compacto = true, k = '', cls = '' }) {
  const { K } = b;
  const cl = paletaSobre(K.c, base || K.S.base);
  const cx = ctxCom(K.ctx, cl);
  const classe = `adl${b.uid}${k}${simbolo ? 's' : ''}`;
  const svg = simbolo ? simboloSVG(cx, { variante: 'cor', tamanho: h, classe }) : logoSVG(cx, { variante: 'cor', compacto, altura: h, classe });
  let W = h;
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  if (vb && !simbolo) W = (h * +vb[3]) / +vb[4];
  let H = h;
  if (W > maxW) { H = (h * maxW) / W; W = maxW; }
  const lx = alinhar === 'c' ? x - W / 2 : alinhar === 'r' ? x - W : x;
  return { html: `<div class="ad-logo ${cls}" style="${P(lx, y + (h - H) / 2, W, H)}">${svg}</div>`, w: W, h: H };
}
// logo como item de pilha (sem posição absoluta)
function logoFlex(b, { h, maxW = 1e9, base, simbolo = false, compacto = true, k = '' }) {
  const L = logo(b, { x: 0, y: 0, h, maxW, base, simbolo, compacto, k });
  return { html: L.html.replace(/style="[^"]*"/, `style="width:${f1(L.w)}px;height:${f1(L.h)}px"`).replace('class="ad-logo ', 'class="ad-logo ad-logo--f '), w: L.w, h: L.h };
}

function cta(b, { h, fs, maxW = 1e9, cheio = false, cls = '' }) {
  const { K } = b;
  const alta = K.alta;
  let s = fs;
  const larg = (z) => largTxt(K, K.cta, z, { alta, tr: alta ? 0.04 : 0.01 }) + z * (1.2 + 0.5 + 1.7 + 0.6) + 2;
  while (s > 9 && larg(s) > maxW) s -= 0.5;
  const w = cheio ? maxW : larg(s);
  return {
    html: `<span class="ad-cta ad-btn-${K.btn} ${cheio ? 'ad-cta--cheio ' : ''}${cls}" style="font-size:${s}px;height:${h}px${cheio ? `;width:${f1(maxW)}px` : ''}"><span class="ad-cta-t">${esc(K.cta)}</span><i class="ad-cta-i">${ic(UI.seta, '', 2.4)}</i></span>`,
    w, fs: s,
  };
}

function kicker(K, txt, cls = '') { return `<div class="ad-kick ${cls}">${esc(txt)}</div>`; }
// o conceito escolhido pelo Jev ganha um sobretítulo próprio, com ícone, sempre com texto do contexto que o título ainda não disse
function conceitoKick(K) {
  const t = K.titulo.toLowerCase(), o = K.oferta, ctx = K.ctx, I = (id) => (ICONE[id] ? ICONE[id].svg : UI.estrela);
  const cand = {
    oferta: [[I('presente'), o && cap(o.frase)]],
    urgencia: [[UI.relogio, o && cap(o.frase)], [UI.relogio, K.pk.horario]],
    prova: [[UI.estrela, K.nota && `${K.nota.v} ${K.nota.r}`], [UI.estrela, `${K.prova[0]} ${K.prova[1]}`]],
    local: [[UI.pin, String(ctx.endereco).split(' · ').slice(0, 2).join(' · ')], [UI.pin, K.local]],
    novidade: [[I('brilho'), `${(K.A.conceito && K.A.conceito.rotulo) || ''} · ${K.item.nome}`]],
    marca: [[I('coroa'), ctx.marca.slogan]],
    produto: [[I('etiqueta'), `${K.pk.itensTitulo} · ${K.item.nome}`], [I('etiqueta'), K.pk.itensTitulo]],
  }[K.conceito] || [];
  for (const [icone, txt] of cand) {
    if (!txt) continue;
    const partes = String(txt).toLowerCase().split(' · ').map((p) => p.replace(/[.!]$/, '').trim()).filter((p) => p.length > 3);
    if (partes.length && partes.some((p) => t.includes(p))) continue;
    return { icone, txt };
  }
  return { icone: ctx.cidade ? UI.pin : null, txt: ctx.cidade ? K.local : cap(K.pk.cat) };
}
// quantas linhas (1 ou 2) o sobretítulo ocupa numa largura: entra no orçamento de altura do título
function kickLinhas(K, w, fs = 9) {
  const { icone, txt } = K.kickC || (K.kickC = conceitoKick(K));
  const larg = largTxt(K, txt, fs, { alta: true, tr: 0.17 }) + (icone ? fs * 1.45 + 6 : 21);
  return larg > w ? 2 : 1;
}
function kickC(K, cls = '') {
  const { icone, txt } = K.kickC || (K.kickC = conceitoKick(K));
  return `<div class="ad-kick ${icone ? 'ad-kick--ic ' : ''}${cls}">${icone ? ic(icone, 'ad-kick-i', 2) : ''}<span>${esc(txt).replace(/ ·/g, '&nbsp;·')}</span></div>`;
}

// etiqueta de preço (pendurada), em em: o tamanho vem do font-size
function etiqueta(b, { x, y, fs, rot = -7, nome = true, abs = true, it = null }) {
  const { K } = b;
  const item = it || K.item;
  const p = partesPreco(item.preco);
  const valor = p ? `<b class="ad-etq-v"><small>R$</small>${esc(p.int)}${p.cent ? `<sup>${esc(p.cent)}</sup>` : ''}</b>${p.suf ? `<span class="ad-etq-suf">${esc(p.suf)}</span>` : ''}`
    : `<b class="ad-etq-v ad-etq-v--txt">${esc(item.preco)}</b>`;
  const st = abs ? `${P(x, y)};font-size:${fs}px;--rot:${rot}deg` : `font-size:${fs}px;--rot:${rot}deg`;
  return `<div class="ad-etq-w${abs ? '' : ' ad-etq-w--f'}" style="${st}"><svg class="ad-etq-fio" viewBox="0 0 40 60" aria-hidden="true"><path d="M8 58C4 38 18 20 36 2"/></svg><div class="ad-etq">${nome ? `<span class="ad-etq-nome">${esc(item.nome)}</span>` : ''}<span class="ad-etq-lin">${valor}</span></div></div>`;
}
// chip de preço (pílula) para formatos pequenos e painéis
function chipPreco(K, it = null, nome = true) {
  const item = it || K.item;
  return `<span class="ad-chip">${nome ? `<span class="ad-chip-n">${esc(item.nome)}</span>` : ''}<b>${esc(item.preco)}</b></span>`;
}

// selo (decisão do Jev): frete · nota · novo · hoje · garantia
function seloSVG(b, d, { cx, cy, abs = true, k = '' } = {}) {
  const { K, uid } = b;
  const t = K.selo;
  if (!t || t === 'nenhum') return '';
  const id = `sa${uid}${k}`, premium = K.estilo === 'premium';
  const fill = premium ? 'none' : 'var(--ad-selo)', tinta = premium ? 'var(--ad-ouro)' : 'var(--ad-selo-ink)';
  const nota = K.nota || { v: K.prova[0], r: K.prova[1] };
  const anelTxt = { frete: 'Entrega grátis', nota: nota.r, novo: 'Novo', hoje: 'Só hoje', garantia: 'Garantia' }[t].toUpperCase();
  const rep = Math.max(1, Math.round(30 / (anelTxt.length + 3)));
  const anel = `${`${anelTxt} ✦ `.repeat(rep)}`;
  let forma = '';
  if (t === 'nota') { // roseta recortada
    let dd = '';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 44 : 49; dd += `${i ? 'L' : 'M'}${f1(50 + r * Math.cos(a))} ${f1(50 + r * Math.sin(a))}`; }
    forma = `<path d="${dd}z" fill="${fill}" stroke="${premium ? tinta : 'none'}" stroke-width="1.2"/>`;
  } else if (t === 'novo') { // explosão
    let dd = '';
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, r = i % 2 ? 42 : 49.5; dd += `${i ? 'L' : 'M'}${f1(50 + r * Math.cos(a))} ${f1(50 + r * Math.sin(a))}`; }
    forma = `<path d="${dd}z" fill="${fill}" stroke="${premium ? tinta : 'none'}" stroke-width="1.2" stroke-linejoin="round"/>`;
  } else forma = `<circle cx="50" cy="50" r="48.5" fill="${fill}" stroke="${premium ? tinta : 'none'}" stroke-width="1.2"/>`;
  const aneis = t === 'hoje' ? `<circle cx="50" cy="50" r="27" fill="none" stroke="${tinta}" stroke-width="1.3" stroke-dasharray="2.2 3" opacity=".8"/>`
    : `<circle cx="50" cy="50" r="27.5" fill="none" stroke="${tinta}" stroke-width="1" opacity=".55"/>${t === 'garantia' || t === 'frete' ? `<circle cx="50" cy="50" r="45" fill="none" stroke="${tinta}" stroke-width=".8" opacity=".5"/>` : ''}`;
  const fb = esc(K.f.body), fd = esc(K.f.disp);
  let centro;
  if (t === 'nota') centro = `<text x="50" y="49" text-anchor="middle" dominant-baseline="central" font-family="${fd}" font-weight="${K.f.dw}" font-size="${nota.v.length > 4 ? 15 : 22}" fill="${tinta}">${esc(nota.v)}</text><g fill="${tinta}">${[0, 1, 2, 3, 4].map((i) => `<path transform="translate(${36.5 + i * 5.6} 60.5) scale(.2)" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>`).join('')}</g>`;
  else if (t === 'novo') centro = `<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="${fd}" font-weight="${K.f.dw}" font-size="17" letter-spacing=".5" fill="${tinta}" transform="rotate(-10 50 50)">${K.alta ? 'NOVO' : 'Novo'}</text>`;
  else if (t === 'frete') { // a mensagem legível fica no miolo; o anel é ornamento
    centro = `<g transform="translate(40.5 28) scale(.8)" fill="none" stroke="${tinta}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${UI.moto}</g><text x="50" y="${K.alta ? 60 : 59.5}" text-anchor="middle" dominant-baseline="central" font-family="${fd}" font-weight="${K.f.dw}" font-size="${K.alta ? 16 : 14}" letter-spacing=".3" fill="${tinta}">${K.alta ? 'GRÁTIS' : 'grátis'}</text>`;
  } else if (t === 'hoje') {
    centro = `<text x="50" y="41" text-anchor="middle" dominant-baseline="central" font-family="${fb}" font-weight="800" font-size="10" letter-spacing="1.6" fill="${tinta}">SÓ</text><text x="50" y="56" text-anchor="middle" dominant-baseline="central" font-family="${fd}" font-weight="${K.f.dw}" font-size="${K.alta ? 19 : 17}" fill="${tinta}">${K.alta ? 'HOJE' : 'hoje'}</text>`;
  } else {
    centro = `<circle cx="50" cy="50" r="15" fill="${tinta}" opacity=".14"/><g transform="translate(39 39) scale(.917)" fill="none" stroke="${tinta}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${UI.check}</g>`;
  }
  const texto = `<g class="ad-gira"><text font-family="${fb}" font-weight="800" font-size="8.6" letter-spacing="1.4" fill="${tinta}"><textPath href="#${id}" textLength="${f1(2 * Math.PI * 36.5 - 3)}" lengthAdjust="spacing">${esc(anel)}</textPath></text></g>`;
  const svg = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="${id}" d="M50 50m-36.5 0a36.5 36.5 0 1 1 73 0a36.5 36.5 0 1 1-73 0"/></defs>${forma}${aneis}${texto}${centro}</svg>`;
  const st = abs ? `${P(cx - d / 2, cy - d / 2, d, d)}` : `width:${d}px;height:${d}px`;
  return `<div class="ad-selo ad-selo--${t}${abs ? '' : ' ad-selo--f'}" style="${st}" role="img" aria-label="${esc(anelTxt.toLowerCase())}">${svg}</div>`;
}

// ilustração da marca (arte) com a paleta ajustada ao fundo em que ela pousa
function arteSVG(b, { base, lado = 320, k = '', faixa = '' }) {
  const { K } = b;
  let c2 = paletaSobre(K.c, base || K.S.base);
  if (c2.dark && K.img === 'organico') { // a arte orgânica desenha o miolo na cor da superfície: no escuro, miolo claro e ícone na cor da marca
    const miolo = '#ffffff';
    c2 = { ...c2, dark: false, priTxt: primeiro([K.c.pri, K.c.deep, K.c.acc], (x) => contraste(x, miolo) >= 3, '#111111'), sec: primeiro([K.c.acc, K.c.sec], (x) => contraste(x, c2.bg) >= 3, c2.sec) };
  }
  return arte(K.img, { icone: K.ctx.icone, c: c2, w: lado, h: lado, semente: K.ctx.nome + K.img, id: `${b.uid}${k}`, apoio: K.ctx.apoio, faixa });
}

// partículas (estrelinhas de 4 pontas e pontos) em volta de um centro, com semente estável
function particulas(b, { cx, cy, r, n = 6, k = '', cor = 'var(--ad-ouro)' }) {
  const R = rnd(b.K.ctx.nome + b.fm.id + k);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.8, rr = r * (0.72 + R() * 0.38), t = 5 + R() * 7;
    s += `<i class="ad-part${i % 3 === 2 ? ' ad-part--o' : ''}" style="${P(cx + rr * Math.cos(a) - t / 2, cy + rr * Math.sin(a) - t / 2, t, t)};--d:${f1(R() * 2.4)}s;color:${cor}"></i>`;
  }
  return s;
}

// pedestal (cilindro) em SVG
function pedestalSVG(b, w, base, k = '', alto = 0.34) {
  const { K, uid } = b;
  const S = K.S;
  const cor = S.escura ? mix(mix(base, '#ffffff', 0.08), K.c.pri, 0.16) : S.naCor ? mix(base, '#000000', 0.22) : mix(mix(base, '#000000', 0.04), K.c.pri, 0.14);
  const luz = S.escura ? (S.acc || S.ouro) : '#ffffff';
  const ry = w * 0.13, hb = w * alto, H = ry * 2 + hb, id = `pd${uid}${k}`;
  return `<svg class="ad-ped" viewBox="0 0 ${f1(w)} ${f1(H)}" width="${f1(w)}" height="${f1(H)}" aria-hidden="true"><defs>
<linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="${mix(cor, '#000000', S.escura ? 0.45 : 0.16)}"/><stop offset=".3" stop-color="${mix(cor, '#ffffff', S.escura ? 0.12 : 0.45)}"/><stop offset=".55" stop-color="${cor}"/><stop offset="1" stop-color="${mix(cor, '#000000', S.escura ? 0.55 : 0.22)}"/></linearGradient>
<radialGradient id="${id}t" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${mix(cor, '#ffffff', 0.2)}"/><stop offset="1" stop-color="${mix(cor, '#ffffff', 0.03)}"/></radialGradient></defs>
<path d="M0 ${f1(ry)}V${f1(ry + hb)}A${f1(w / 2)} ${f1(ry)} 0 0 0 ${f1(w)} ${f1(ry + hb)}V${f1(ry)}z" fill="url(#${id}c)"/>
<ellipse cx="${f1(w / 2)}" cy="${f1(ry)}" rx="${f1(w / 2)}" ry="${f1(ry)}" fill="url(#${id}t)"/>
<ellipse cx="${f1(w / 2)}" cy="${f1(ry)}" rx="${f1(w / 2 - 0.8)}" ry="${f1(ry - 0.8)}" fill="none" stroke="${luz}" stroke-opacity=".6" stroke-width="1.4"/>
<ellipse cx="${f1(w / 2)}" cy="${f1(ry + 1.5)}" rx="${f1(w * 0.3)}" ry="${f1(ry * 0.5)}" fill="#000" opacity=".28"/></svg>`;
}

// palco do produto: halo + raios + pedestal + arte flutuando + sombra + partículas
// (cx = centro horizontal, topo = linha do tampo do pedestal, A = lado da arte)
function palco(b, { cx, topo, A, pedW = A * 0.92, pedH = 0.34, raios = true, ped = true, parts = 6, base, k = '', faixa = '' }) {
  const { K } = b;
  const bs = base || K.S.base;
  raios = raios && ['flat', 'geometrico', 'adesivo', 'vidro'].includes(K.img);
  const ry = pedW * 0.13;
  const artY = topo + ry - A * 0.9;
  let s = '';
  if (raios && !K.S.naCor) s += `<i class="ad-raios" style="${P(cx - A * 0.95, artY + A / 2 - A * 0.95, A * 1.9, A * 1.9)}"></i>`;
  if (raios && K.S.naCor) s += `<i class="ad-raios ad-raios--claro" style="${P(cx - A * 0.95, artY + A / 2 - A * 0.95, A * 1.9, A * 1.9)}"></i>`;
  s += `<i class="ad-halo" style="${P(cx - A * 0.75, artY + A / 2 - A * 0.75, A * 1.5, A * 1.5)}"></i>`;
  if (ped) s += `<div class="ad-ped-w" style="${P(cx - pedW / 2, topo - ry)}">${pedestalSVG(b, pedW, bs, k, pedH)}</div>`;
  else s += `<i class="ad-chao" style="${P(cx - A * 0.4, topo - A * 0.04, A * 0.8, A * 0.1)}"></i>`;
  s += `<div class="ad-arte ad-flutua" style="${P(cx - A / 2, artY, A, A)}">${arteSVG(b, { base: bs, k: 'p' + k, faixa })}</div>`;
  if (parts) s += particulas(b, { cx, cy: artY + A / 2, r: A * 0.62, n: parts, k });
  return `<div class="ad-palco ad-rv-vis">${s}</div>`;
}

// aro premium: arte num círculo fino com brilho, órbita e pontos de luz
function aro(b, { cx, cy, d, k = '' }) {
  const { K } = b;
  const dentro = mix(K.S.base, K.S.escura ? '#ffffff' : K.c.pri, K.S.escura ? 0.06 : 0.07);
  return `<div class="ad-aro ad-rv-vis" style="${P(cx - d / 2, cy - d / 2, d, d)}"><i class="ad-aro-glow"></i><i class="ad-aro-orb"></i><div class="ad-aro-in" style="background:${dentro}"><div class="ad-arte ad-flutua">${arteSVG(b, { base: dentro, k: 'r' + k })}</div></div><i class="ad-aro-borda"></i>${particulas(b, { cx: d / 2, cy: d / 2, r: d * 0.62, n: 4, k: 'r' + k })}</div>`;
}

// cupom recortado: oferta + código (BEMVINDO) — ou, sem oferta, o item e o preço. fs = corpo do texto miúdo;
// a oferta grande é encaixada na área útil do canhoto principal
function cupom(b, { x, y, w, h, vertical = false, fs, abs = true, k = '', mini = false }) {
  const { K } = b;
  const o = K.oferta;
  const temCod = !!o;
  let grande, fr, alvo, fatorOf = 1;
  if (o) {
    const m = o.curta.match(/^(\d+%)\s*(.*)$/);
    alvo = m ? m[1] : o.curta;
    grande = m ? `<b class="ad-cup-of">${esc(m[1])}</b>${m[2] ? `<span class="ad-cup-of2">${esc(m[2])}</span>` : ''}` : `<b class="ad-cup-of ad-cup-of--txt">${esc(o.curta)}</b>`;
    fr = cap(o.frase);
  } else {
    const p = K.preco;
    alvo = p ? `R$${p.int}${p.cent}` : K.item.preco;
    grande = p ? `<b class="ad-cup-of"><small>R$</small>${esc(p.int)}${p.cent ? `<sup>${esc(p.cent)}</sup>` : ''}</b>` : `<b class="ad-cup-of ad-cup-of--txt">${esc(K.item.preco)}</b>`;
    fr = K.item.nome;
    fatorOf = 0.9;
  }
  const aw = mini ? w - 12 : vertical ? w - 22 : w * 0.7 - 30;
  const ah = mini ? h - 8 : vertical ? h * 0.66 - fs * 4.6 : h - fs * 4.2;
  const pct = /%$/.test(alvo);
  const r = cabe(K, alvo, aw * (pct && !vertical ? 0.7 : 1), vertical ? 3 : 2, fs * 1.2, fs * (mini ? 2.2 : vertical ? 5.2 : 4.4), ah, { fator: fatorOf });
  const tes = ICONE.tesoura ? `<i class="ad-cup-tes">${ic(ICONE.tesoura.svg, '', 1.8)}</i>` : '';
  const stubW = mini ? 0 : vertical ? w : w * 0.3;
  const codFs = stubW ? Math.min(1.02, (stubW - 14) / (fs * (largTxt(K, 'BEMVINDO', 1) + 0.9 + 1.1))) : 1.02;
  const stub = temCod ? `${h < 80 || fs * codFs * 0.66 < 7.5 ? '' : `<span class="ad-cup-k">Use o cupom</span>`}<b class="ad-cup-cod" style="font-size:${f1(codFs)}em">BEMVINDO</b>` : `<span class="ad-cup-sym">${logo(b, { x: 0, y: 0, h: fs * 2.6, simbolo: true, base: K.S.card, k: 'cu' + k }).html.replace(/style="[^"]*"/, '')}</span>`;
  const st = abs ? P(x, y, w, h) : `width:${f1(w)}px;height:${f1(h)}px`;
  return `<div class="ad-cup-w${abs ? '' : ' ad-cup-w--f'}" style="${st}"><div class="ad-cup ${vertical ? 'ad-cup--v' : 'ad-cup--h'}${mini ? ' ad-cup--mini' : ''} ad-rv-vis" style="font-size:${fs}px;--of:${f1(r.fs / fs)}em"><div class="ad-cup-a"><div class="ad-cup-grande">${grande}</div><span class="ad-cup-fr">${esc(fr)}</span></div><div class="ad-cup-b">${stub}</div>${tes}</div></div>`;
}

// cartão de depoimento (pack.depo) com estrelas, aspas e autor
function depo(b, { x, y, w, h, fs, i = 0, linhas = 4, abs = true, cls = '' }) {
  const { K } = b;
  const [texto, autor] = K.depos[Math.min(i, K.depos.length - 1)];
  const st = abs ? `${P(x, y, w, h)};font-size:${fs}px` : `width:${f1(w)}px${h ? `;height:${f1(h)}px` : ''};font-size:${fs}px`;
  return `<figure class="ad-depo${abs ? '' : ' ad-depo--f'} ad-rv-vis ${cls}" style="${st}"><span class="ad-depo-asp" aria-hidden="true">“</span>${estrelas(5, 'ad-est ad-depo-est')}<blockquote class="ad-depo-txt" style="-webkit-line-clamp:${linhas}">${esc(texto)}</blockquote><figcaption class="ad-depo-aut"><i class="ad-av">${esc(iniciais(autor))}</i>${esc(autor)}</figcaption></figure>`;
}

function chipNota(K, cls = '') {
  const n = K.nota;
  if (!n) return `<span class="ad-nota ${cls}"><b>${esc(K.prova[0])}</b><small>${esc(K.prova[1])}</small></span>`;
  return `<span class="ad-nota ${cls}"><b>${esc(n.v)}</b>${estrelas(5)}<small>${esc(n.r)}</small></span>`;
}

// marca-d'água com o símbolo (monocromático, bem sutil)
function marcaDagua(b, { x, y, d, rot = -12, op = 0.1 }) {
  const { K } = b;
  return `<div class="ad-dagua" style="${P(x, y, d, d)};opacity:${op};transform:rotate(${rot}deg);color:${K.S.ink}">${ic(K.ctx.icone.svg, '', 1.15)}</div>`;
}

// fundo do banner: cor, degradê, papel, padrão de ícones ou cena ilustrada (a cena é posicionada por formato)
function fundo(b) {
  const { K } = b;
  const S = K.S, c = K.c;
  let bg = S.base, extra = '';
  if (K.baseAj) {
    // fundo pedido nos ajustes: o degradê como veio; a cor sólida com o mesmo brilho discreto dos outros fundos
    bg = K.fundoAj || `radial-gradient(55% 70% at var(--gx,72%) var(--gy,50%), var(--ad-glow), transparent 72%), ${S.base}`;
  } else if (K.fundo === 'gradiente') {
    const ink = S.ink;
    // degradê tonal (a cor da marca indo para um vizinho próximo), com o texto sempre legível nas duas pontas;
    // a cor de acento entra só como brilho atrás da ilustração
    const cands = K.estilo === 'premium' ? [mix(S.base, '#000000', 0.55), S.escuroB] : [mix(c.pri, c.acc, 0.5), mix(c.pri, c.sec, 0.4), mix(c.pri, '#000000', 0.38), mix(c.pri, '#ffffff', 0.28)];
    const seg = primeiro(cands, (x) => dist(x, S.base) > 45 && contraste(x, ink) >= 4.5, mix(S.base, lum(ink) > 0.5 ? '#000000' : '#ffffff', 0.35));
    const acento = primeiro([c.acc, c.sec], (x) => dist(x, S.base) > 60, seg);
    const brilho = lum(ink) > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.3)';
    bg = `radial-gradient(55% 70% at var(--gx,78%) var(--gy,62%), ${rgba(acento, 0.5)}, transparent 70%), radial-gradient(120% 90% at 0% 0%, ${brilho}, transparent 55%), linear-gradient(135deg, ${S.base} 0%, ${mix(S.base, seg, 0.55)} 60%, ${seg} 100%)`;
  } else if (S.escura) {
    bg = `radial-gradient(60% 75% at var(--gx,72%) var(--gy,50%), var(--ad-glow), transparent 70%), radial-gradient(140% 100% at 0% 0%, ${rgba(mix(S.base, '#ffffff', 0.12), 1)}, ${S.base} 60%)`;
  } else if (!S.naCor) {
    bg = `radial-gradient(55% 70% at var(--gx,72%) var(--gy,50%), var(--ad-glow), transparent 72%), ${S.base}`;
  } else if (K.fundo === 'solido') {
    bg = S.base;
  }
  if (K.fundo === 'padrao') {
    const cor = S.naCor ? S.ink : c.pri;
    extra = `<div class="ad-padrao" style="opacity:${S.naCor ? 1 : 0.9}">${padrao(K.ctx.icone, cor, { tam: b.w < 200 || b.h < 100 ? 18 : 24, gap: b.w < 200 || b.h < 100 ? 16 : 20, op: S.escura ? 0.16 : S.naCor ? 0.16 : 0.12, id: `${b.uid}pd` })}</div>`;
  }
  return `<div class="ad-bgl" style="background:${bg}">${extra}</div>`;
}
// cena ilustrada de fundo (decisão "cores" = cena): arte grande saindo do quadro + véu para o texto
function cena(b, { x, y, lado, veu }) {
  const { K } = b;
  return `<div class="ad-cena" style="${P(x, y, lado, lado)}">${arteSVG(b, { base: K.S.base, lado: 320, k: 'cn' })}</div><i class="ad-veu" style="background:${veu}"></i>`;
}
const veuDe = (K, dir, a = 38, z = 72) => `linear-gradient(${dir}, ${K.S.base} ${a}%, ${rgba(K.S.base, 0)} ${z}%)`;

function moldura(K) { return K.estilo === 'premium' ? '<i class="ad-moldura" aria-hidden="true"></i><i class="ad-brilho" aria-hidden="true"></i>' : ''; }
function regua() { return '<i class="ad-regua" aria-hidden="true"><b></b></i>'; }
function pilha(x, y, w, h, itens, { gap = 8, alinhar = 'l', cls = '' } = {}) {
  return `<div class="ad-pilha ad-al-${alinhar} ${cls}" style="${P(x, y, w, h)};gap:${gap}px">${itens.filter(Boolean).join('')}</div>`;
}
const MOLA = '<i class="ad-mola"></i>';
const linhaFlex = (itens, gap = 10, cls = '') => `<div class="ad-linha ${cls}" style="gap:${gap}px">${itens.filter(Boolean).join('')}</div>`;

// painel de ilustração (estilo "split"): a outra metade, numa cor que contrasta com o fundo do texto
function corPainel(K) {
  const S = K.S, c = K.c;
  if (S.naCor) return S.escura ? S.papel : (c.dark ? c.surf : (dist(c.bg, S.base) > 60 ? c.bg : '#ffffff'));
  if (S.escura) return dist(c.pri, S.base) > 80 && lum(c.pri) > 0.08 ? c.pri : mix(S.base, '#ffffff', 0.12);
  return dist(c.pri, S.base) > 80 ? c.pri : c.deep;
}
function painelArte(b, { clip, x, y, w, h, arteLado, ax, ay, extra = '', k = '' }) {
  const { K } = b;
  const cor = corPainel(K);
  const etq = primeiro([K.c.acc, K.c.sec, K.S.papel, K.c.bg, K.c.ink, '#ffffff', '#111111'], (z) => contraste(z, cor) >= 2 && dist(z, cor) > 90, '#ffffff');
  const vars = `--ad-bg:${cor};--ad-etq:${etq};--ad-etq-ink:${sobre(etq, cor, K.c.bg, K.c.ink)};--ad-glow:${rgba(lum(cor) < 0.18 ? '#ffffff' : K.c.pri, 0.18)}`;
  return `<div class="ad-painel" style="${P(x, y, w, h)};background:${cor};clip-path:${clip};${vars}"><i class="ad-painel-luz"></i><div class="ad-arte-w ad-rv-vis" style="${P(ax - x - arteLado / 2, ay - y - arteLado / 2, arteLado, arteLado)}"><div class="ad-arte ad-flutua" style="left:0;top:0;width:100%;height:100%">${arteSVG(b, { base: cor, k: 'sp' + k })}</div></div>${extra}</div>`;
}

// ------------------------------------------------------------------ heróis (quadro 2 da sequência): o que o conceito pede
// caixa (x, y, w, h); orientação pela proporção
function heroi(b, x, y, w, h) {
  const { K } = b;
  const t = K.heroi;
  const horiz = w / h > 2.2, mini = h < 70;
  if (t === 'oferta' && K.oferta) {
    if (mini) {
      return `<div class="ad-her ad-her--of ad-her--mini" style="${P(x, y, w, h)}">${cupom(b, { x: 0, y: 0, w: Math.min(w, 250), h, fs: h / 4.6, abs: false, k: 'h' })}</div>`;
    }
    const vert = !horiz && h > w * 1.2;
    const cw = horiz ? Math.min(w, h > 150 ? 560 : 470) : w, ch = horiz ? Math.min(h, 150) : vert ? Math.min(h * 0.78, w * 1.9) : Math.min(h * 0.8, 150);
    const fs = horiz ? ch / 7.2 : vert ? cw / 11 : ch / 9;
    return `<div class="ad-her ad-her--of" style="${P(x, y, w, h)}"><div class="ad-her-c">${cupom(b, { x: 0, y: 0, w: cw, h: ch, vertical: vert, fs, abs: false, k: 'h' })}</div></div>`;
  }
  if (t === 'depo') {
    if (mini) return `<div class="ad-her ad-her--dp ad-her--mini" style="${P(x, y, w, h)}">${estrelas(5)}<span class="ad-her-q">“${esc(K.depos[0][0])}”</span></div>`;
    if (horiz && h < 120) return `<div class="ad-her ad-her--dp" style="${P(x, y, w, h)}">${depo(b, { w: Math.min(w, 520), h: h - 4, fs: 10.5, i: 0, linhas: 3, abs: false, cls: 'ad-depo--lb' })}</div>`;
    const fs = horiz ? Math.min(15, h * 0.075) : Math.max(12, Math.min(17, w * 0.058));
    return `<div class="ad-her ad-her--dp" style="${P(x, y, w, h)}">${depo(b, { w: horiz ? Math.min(w, 560) : w, h: null, fs, i: 0, linhas: horiz ? 4 : 7, abs: false, cls: 'ad-depo--grande' })}</div>`;
  }
  if (t === 'prova') {
    const [v, r] = K.prova;
    const fsV = mini ? h * 0.5 : horiz ? h * 0.52 : Math.min(w * 0.32, 96);
    return `<div class="ad-her ad-her--pv${horiz || mini ? ' ad-her--h' : ''}" style="${P(x, y, w, h)}"><b class="ad-her-num" style="font-size:${f1(fsV)}px">${esc(v)}</b><span class="ad-her-rot" style="font-size:${f1(Math.max(10, fsV * 0.22))}px">${esc(r)}</span>${K.nota && !mini ? chipNota(K, 'ad-nota--her') : ''}</div>`;
  }
  if (t === 'local') {
    const mapa = mapaSVG(b);
    if (mini) return `<div class="ad-her ad-her--lc ad-her--mini" style="${P(x, y, w, h)}"><i class="ad-pin">${ic(UI.pin, '', 2)}</i><span><b>${esc(K.local)}</b><small>${esc(K.ctx.endereco)}</small></span></div>`;
    const cid = K.ctx.cidade;
    const nomeLc = cid ? `${esc(cid.nome)}<i class="ad-uf">${esc(cid.uf)}</i>` : esc(K.local);
    const fsL = cabe(K, cid ? cid.nome : K.local, horiz ? w * 0.42 : w - 10, 2, 12, horiz ? h * 0.32 : Math.min(32, w * 0.13), 1e9).fs;
    return `<div class="ad-her ad-her--lc${horiz ? ' ad-her--h' : ''}" style="${P(x, y, w, h)}"><div class="ad-mapa">${mapa}<i class="ad-pin ad-pin--mapa">${ic(UI.pin, '', 2)}</i></div><div class="ad-her-lc-t"><span class="ad-kick">${esc(cap(K.pk.cat))}</span><b style="font-size:${f1(fsL)}px">${nomeLc}</b><small>${esc(K.ctx.endereco)}</small></div></div>`;
  }
  if (t === 'marca') {
    const lh = mini ? h * 0.62 : horiz ? h * 0.42 : Math.min(h * 0.26, w * 0.34);
    const L = logoFlex(b, { h: lh, maxW: w * (horiz ? 0.4 : 0.9), compacto: horiz || mini, k: 'hm' });
    const fsS = mini ? 12 : horiz ? Math.min(24, h * 0.26) : Math.min(26, w * 0.085);
    const dd = mini ? 0 : Math.min(w, h) * (horiz ? 1.5 : 1.05);
    const fundoMc = mini ? '' : `<div class="ad-her-dagua" style="width:${f1(dd)}px;height:${f1(dd)}px">${ic(K.ctx.icone.svg, '', 1)}</div>`;
    return `<div class="ad-her ad-her--mc${horiz || mini ? ' ad-her--h' : ''}" style="${P(x, y, w, h)}">${fundoMc}${L.html}${mini ? '' : regua()}<span class="ad-her-slogan" style="font-size:${f1(fsS)}px">${esc(K.ctx.marca.slogan)}</span></div>`;
  }
  // produto (e novidade): o item no palco, nome, descrição e preço
  const it = K.item;
  if (mini) {
    return `<div class="ad-her ad-her--pd ad-her--mini" style="${P(x, y, w, h)}"><div class="ad-arte ad-her-mini-arte" style="width:${f1(h * 1.08)}px;height:${f1(h * 1.08)}px">${arteSVG(b, { k: 'hm' })}</div><span class="ad-her-pd-t"><b>${esc(it.nome)}</b><small>${esc(it.desc)}</small></span><b class="ad-her-preco">${esc(it.preco)}</b></div>`;
  }
  const texto = (fsN, desc, cls = '') => `<div class="ad-her-pd-t ${cls}"><span class="ad-kick">${esc(K.pk.itensTitulo)}</span><b style="font-size:${f1(fsN)}px">${esc(it.nome)}</b>${desc ? `<small>${esc(it.desc)}</small>` : ''}</div>`;
  const cabeNome = (larg, max) => cabe(K, it.nome, larg, 2, 12, max, 1e9).fs;
  if (horiz) { // super banner e billboard: palco | texto | etiqueta
    const comPed = h > 150, A = comPed ? h * 0.8 : h * 1.08, pedW = A * 0.92, ry = pedW * 0.13;
    const artY = comPed ? h * 0.02 : (h - A) / 2, topo = artY - ry + 0.9 * A;
    const fsN = cabeNome(Math.min(w * 0.36, 320), Math.min(h * 0.26, 44));
    return `<div class="ad-her ad-her--pd ad-her--h" style="${P(x, y, w, h)}"><div class="ad-her-palco" style="width:${f1(A * 1.2)}px;height:${f1(h)}px">${palco(b, { cx: A * 0.6, topo, A, pedW, pedH: 0.5, ped: comPed, parts: 5, k: 'h' })}</div>${texto(fsN, h > 120)}<div class="ad-her-etq">${etiqueta(b, { fs: Math.min(h * 0.13, 16), rot: -6, nome: false, abs: false })}</div></div>`;
  }
  if (w / h >= 0.9) { // retângulo: texto à esquerda, palco à direita
    const A = Math.min(w * 0.56, h * 0.82), pedW = A * 0.92, ry = pedW * 0.13, artY = h * 0.02, topo = artY - ry + 0.9 * A;
    const tw = w - A * 1.02;
    return `<div class="ad-her ad-her--pd ad-her--q" style="${P(x, y, w, h)}"><div class="ad-her-col" style="width:${f1(tw)}px">${texto(cabeNome(tw, 26), true)}${etiqueta(b, { fs: 11, rot: -6, nome: false, abs: false })}</div><div class="ad-her-palco" style="width:${f1(A * 1.02)}px;height:${f1(h)}px">${palco(b, { cx: A * 0.51, topo, A, pedW, pedH: 0.45, parts: 6, k: 'h' })}</div></div>`;
  }
  // vertical (arranha-céu, meia página): texto em cima, palco grande, etiqueta
  const A = Math.min(w * (w < 200 ? 1.06 : 0.84), h * 0.46), pedW = A * 0.9, ry = pedW * 0.13, topo = 0.9 * A - ry;
  const ph = topo + ry + pedW * 0.45 + 4;
  return `<div class="ad-her ad-her--pd ad-her--v" style="${P(x, y, w, h)}">${texto(cabeNome(w, Math.min(w * 0.14, 36)), w > 200, 'ad-her-pd-t--v')}<div class="ad-her-palco" style="width:${f1(w)}px;height:${f1(ph)}px">${palco(b, { cx: w / 2, topo, A, pedW, pedH: 0.45, parts: 6, k: 'h' })}${etiqueta(b, { x: Math.max(-4, w / 2 - A * 0.62), y: A * 0.7, fs: Math.min(w * 0.07, 15), rot: -8, nome: false })}</div></div>`;
}

// minimapa de ruas (conceito "local"): traçado abstrato, sem endereço real
function mapaSVG(b) {
  const { K } = b;
  const S = K.S;
  const ruas = S.escura ? rgba(S.ink, 0.2) : '#ffffff', quadra = S.escura ? rgba(S.ink, 0.07) : rgba(K.c.pri, 0.09);
  const R = rnd(K.ctx.nome + 'mapa');
  let q = '';
  for (let i = 0; i < 9; i++) q += `<rect x="${f1(8 + (i % 3) * 64 + R() * 6)}" y="${f1(8 + Math.floor(i / 3) * 44 + R() * 5)}" width="${f1(46 + R() * 8)}" height="${f1(28 + R() * 6)}" rx="4" fill="${quadra}"/>`;
  return `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${q}<path d="M-10 52C60 40 120 70 210 44M-10 104C50 96 140 118 210 96M64 -10C58 50 80 100 70 150M140 -10C150 60 128 110 138 150" fill="none" stroke="${ruas}" stroke-width="7" stroke-linecap="round"/><path d="M-10 52C60 40 120 70 210 44" fill="none" stroke="${rgba(K.c.pri, 0.55)}" stroke-width="1.6" stroke-dasharray="5 6"/><circle cx="100" cy="70" r="26" fill="${rgba(K.c.pri, 0.16)}"/><circle cx="100" cy="70" r="12" fill="${rgba(K.c.pri, 0.22)}"/></svg>`;
}

// ------------------------------------------------------------------ layouts por formato
// cada formato tem composição própria: mestre (peça inteira; também o 3º quadro da sequência), q1 (gancho) e q2 (herói)
const L = {};

// ---------- 300×250 · Retângulo médio
L.retangulo = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 300, H = 250, p = 16, temSelo = K.selo !== 'nenhum';
    let h = '';
    const lg = () => logoFlex(b, { h: 20, maxW: 150, k: 'm' }).html;
    if (e === 'produto') {
      const cenaOn = K.fundo === 'cena';
      if (cenaOn) h += cena(b, { x: 96, y: 18, lado: 250, veu: veuDe(K, '90deg', 36, 66) });
      else h += palco(b, { cx: 220, topo: 214, A: 136, pedW: 128 });
      const T = tit(b, { w: temSelo ? 214 : 262, n: 3, min: 15, max: 30, hmax: 74 });
      h += pilha(p, 14, 268, 222, [lg(), T.html, etiqueta(b, { fs: 10.5, rot: -6, abs: false }), MOLA, cta(b, { h: 32, fs: 12.5, maxW: 150 }).html], { gap: 10 });
      if (temSelo) h += seloSVG(b, 58, { cx: 262, cy: cenaOn ? 118 : 104 });
    } else if (e === 'tipografico') {
      if (K.fundo === 'cena') h += cena(b, { x: 140, y: 100, lado: 250, veu: veuDe(K, '160deg', 30, 90) });
      else h += marcaDagua(b, { x: 168, y: 96, d: 190, op: S.naCor ? 0.12 : 0.08 });
      const T = tit(b, { w: temSelo ? 222 : 268, n: 4, min: 18, max: 50, hmax: Math.min(108, 128 - 12 * kickLinhas(K, 268)), cls: 'ad-tit--xl' });
      const C = cta(b, { h: 32, fs: 12.5, maxW: 170 });
      h += pilha(p, 14, 268, 222, [lg(), kickC(K), T.html, MOLA, linhaFlex([C.html, `<span class="ad-dom">${esc(K.ctx.dominio)}</span>`], 12, 'ad-linha--fim')], { gap: 10 });
      if (temSelo) h += seloSVG(b, 50, { cx: 262, cy: 36 });
    } else if (e === 'split') {
      const x0 = 162;
      h += painelArte(b, { clip: 'polygon(28px 0,100% 0,100% 100%,0 100%)', x: x0, y: 0, w: W - x0, h: H, arteLado: 124, ax: 238, ay: 112, extra: `<div class="ad-painel-rod" style="${P(18, 196, W - x0 - 26)}">${K.heroi === 'oferta' ? `<span class="ad-chip"><b>${esc(K.oferta.curta)}</b></span>` : chipPreco(K, null, false)}</div>` });
      const T = tit(b, { w: 142, n: 5, min: 14, max: 26, hmax: 124 });
      h += pilha(p, 14, 144, 222, [lg(), T.html, MOLA, cta(b, { h: 30, fs: 12, maxW: 144 }).html], { gap: 10 });
      if (temSelo) h += seloSVG(b, 50, { cx: 178, cy: 50 });
    } else if (e === 'cupom') {
      if (K.fundo === 'cena') h += cena(b, { x: 150, y: -30, lado: 200, veu: veuDe(K, '180deg', 20, 60) });
      const T = tit(b, { w: temSelo ? 214 : 268, n: 2, min: 14, max: 24, hmax: 50 });
      h += pilha(p, 14, 268, 222, [lg(), T.html, cupom(b, { w: 268, h: 86, fs: 10, abs: false }), MOLA, cta(b, { h: 30, fs: 12, maxW: 200 }).html], { gap: 9 });
      if (temSelo) h += seloSVG(b, 48, { cx: 264, cy: 36 });
    } else if (e === 'premium') {
      if (K.fundo === 'cena') h += cena(b, { x: 130, y: 30, lado: 210, veu: veuDe(K, '90deg', 34, 70) });
      else h += aro(b, { cx: 222, cy: 124, d: 118 });
      const T = tit(b, { w: 146, n: 4, min: 14, max: 28, hmax: 112 - 12 * kickLinhas(K, 150) });
      h += pilha(22, 20, 150, 210, [lg(), kickC(K, 'ad-kick--ouro'), T.html, regua(), MOLA, cta(b, { h: 30, fs: 11.5, maxW: 150 }).html], { gap: 8 });
      if (temSelo) h += seloSVG(b, 46, { cx: 266, cy: 62 });
    } else { // depoimento
      if (K.fundo === 'cena') h += cena(b, { x: 150, y: -40, lado: 190, veu: veuDe(K, '200deg', 30, 75) });
      const T = tit(b, { w: temSelo ? 214 : 268, n: 2, min: 14, max: 22, hmax: 46 });
      h += pilha(p, 14, 268, 222, [linhaFlex([lg(), MOLA, temSelo ? '' : chipNota(K, 'ad-nota--mini')], 8), T.html, depo(b, { w: 268, h: null, fs: 11, i: 0, linhas: 3, abs: false }), MOLA, cta(b, { h: 30, fs: 12, maxW: 200 }).html], { gap: 8 });
      if (temSelo) h += seloSVG(b, 50, { cx: 266, cy: 40 });
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const T = tit(b, { w: 268, n: 4, min: 22, max: 48, hmax: 122, cls: 'ad-tit--xl' });
    return `${marcaDagua(b, { x: 150, y: 70, d: 210, op: 0.07, k: 'q' })}${pilha(16, 14, 268, 222, [logoFlex(b, { h: 18, maxW: 140, k: 'q1' }).html, MOLA, kicker(K, K.kicker), T.html, MOLA, `<i class="ad-seta-q">${ic(UI.seta, '', 2.2)}</i>`], { gap: 10 })}`;
  },
  q2(b) { return `${heroi(b, 16, 36, 268, 198)}<div class="ad-q-logo">${logo(b, { x: 16, y: 12, h: 16, maxW: 120, k: 'q2' }).html}</div>`; },
};

// ---------- 728×90 · Super banner
L.superbanner = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 728, H = 90, temSelo = K.selo !== 'nenhum';
    let h = '';
    const apertado = e === 'cupom' || e === 'depoimento';
    const LG = logo(b, { x: 18, y: 0, h: apertado ? 24 : 28, maxW: apertado ? 108 : 150, k: 'm' });
    const lgH = `<div class="ad-vc" style="${P(18, 0, LG.w, H)}">${LG.html.replace(/style="[^"]*"/, `style="position:relative;width:${f1(LG.w)}px;height:${f1(LG.h)}px"`)}</div>`;
    const div = (x) => `<i class="ad-div" style="${P(x, 22, 1, 46)}"></i>`;
    const x1 = 18 + LG.w + 16;
    const C = apertado ? cta(b, { h: 34, fs: 12.5, maxW: 150 }) : cta(b, { h: 38, fs: 13.5, maxW: 170 });
    const cX = W - 18 - C.w;
    const ctaH = `<div class="ad-vc" style="${P(cX, 0, C.w, H)}">${C.html}</div>`;
    const tituloEm = (x, w, n = 2, max = 28, min = 15) => { const T = tit(b, { w, n, min, max, hmax: 68 }); return { T, html: `<div class="ad-vc" style="${P(x, 0, w, H)}">${T.html}</div>` }; };
    if (e === 'produto') {
      const cenaOn = K.fundo === 'cena';
      const etqW = K.preco ? 30 + largTxt(K, 'R$', 9.5 * 0.83) + largTxt(K, K.preco.int, 9.5 * 2.3, { corpo: false }) + largTxt(K, K.preco.cent, 9.5 * 1.0, { corpo: false }) + largTxt(K, K.preco.suf, 9.5 * 0.82) : 0;
      let wT = cX - 24 - 96 - etqW - (x1 + 16);
      let comEtq = !!K.preco;
      if (!comEtq || !cabe(K, K.titulo, wT, 2, 15, 15, 68).ok) { wT = cX - 24 - 96 - (x1 + 16); comEtq = false; }
      const tt = tituloEm(x1 + 16, wT);
      const ax = x1 + 16 + wT + 12 + 48;
      if (cenaOn) h += cena(b, { x: ax - 110, y: -60, lado: 220, veu: `linear-gradient(90deg, ${S.base} 30%, ${rgba(S.base, 0)} 52%, ${rgba(S.base, 0)} 70%, ${S.base} 88%)` });
      else h += palco(b, { cx: ax, topo: 72, A: 96, ped: false, parts: 5 });
      h += lgH + div(x1) + tt.html;
      if (comEtq) h += etiqueta(b, { x: ax + 34, y: 30, fs: 9.5, rot: -7, nome: false });
      h += ctaH;
      if (temSelo) h += seloSVG(b, 52, { cx: ax - 44, cy: 30 });
    } else if (e === 'tipografico') {
      if (K.fundo === 'cena') h += cena(b, { x: 470, y: -80, lado: 250, veu: `linear-gradient(90deg, ${S.base} 62%, ${rgba(S.base, 0.2)} 80%, ${S.base} 100%)` });
      else h += marcaDagua(b, { x: cX - 90, y: -40, d: 170, op: S.naCor ? 0.12 : 0.08 });
      const wT = cX - 24 - (x1 + 16) - (temSelo ? 58 : 0);
      h += lgH + div(x1) + tituloEm(x1 + 16, wT, 2, 40, 16).html.replace('ad-tit ', 'ad-tit ad-tit--xl ') + ctaH;
      if (temSelo) h += seloSVG(b, 52, { cx: cX - 36, cy: 45 });
    } else if (e === 'split') {
      const pw = 196, px0 = W - pw;
      const chipTxt = K.heroi === 'oferta' ? K.oferta.curta : K.item.preco;
      const cabeChip = chipTxt.length <= 9;
      h += painelArte(b, { clip: 'polygon(30px 0,100% 0,100% 100%,0 100%)', x: px0, y: 0, w: pw, h: H, arteLado: 88, ax: px0 + (cabeChip ? 72 : 108), ay: 45, extra: cabeChip ? `<div class="ad-vc" style="${P(118, 0, 74, H)};justify-content:center"><span class="ad-chip ad-chip--v"><b>${esc(chipTxt)}</b></span></div>` : '' });
      const C2 = cta(b, { h: 36, fs: 13, maxW: 160 });
      const c2x = px0 - 8 - C2.w;
      h += lgH + div(x1) + tituloEm(x1 + 16, c2x - 16 - (x1 + 16)).html + `<div class="ad-vc" style="${P(c2x, 0, C2.w, H)}">${C2.html}</div>`;
      if (temSelo) h += seloSVG(b, 48, { cx: px0 + 12, cy: 45 });
    } else if (e === 'cupom') {
      if (K.fundo === 'cena') h += cena(b, { x: 300, y: -70, lado: 230, veu: `linear-gradient(90deg, ${rgba(S.base, 0.9)}, ${rgba(S.base, 0.55)})` });
      const cw = 200, cx0 = cX - 16 - cw;
      h += lgH + div(x1) + tituloEm(x1 + 16, cx0 - 16 - (x1 + 16), 2, 26, 13).html;
      h += cupom(b, { x: cx0, y: 11, w: cw, h: 68, fs: 9.5 }) + ctaH;
      if (temSelo) h += seloSVG(b, 44, { cx: cx0 + cw - 4, cy: 12 });
    } else if (e === 'premium') {
      if (K.fundo === 'cena') h += cena(b, { x: cX - 230, y: -70, lado: 230, veu: `linear-gradient(90deg, ${S.base} 50%, ${rgba(S.base, 0.15)} 80%, ${S.base} 98%)` });
      else h += aro(b, { cx: cX - 56, cy: 45, d: 72 });
      const wT = cX - 112 - (x1 + 18);
      const T = tit(b, { w: wT, n: 2, min: 14, max: 26, hmax: 52 });
      h += lgH + `<i class="ad-div ad-div--ouro" style="${P(x1, 20, 1, 50)}"></i>` + `<div class="ad-vc ad-vc--col" style="${P(x1 + 18, 0, wT, H)}">${kickC(K, 'ad-kick--ouro ad-kick--1')}${T.html}</div>` + ctaH;
      if (temSelo) h += seloSVG(b, 40, { cx: cX - 22, cy: 20 });
    } else { // depoimento
      if (K.fundo === 'cena') h += cena(b, { x: 250, y: -80, lado: 250, veu: `linear-gradient(90deg, ${rgba(S.base, 0.92)}, ${rgba(S.base, 0.6)})` });
      const dw = 222, dx = cX - 16 - dw;
      h += lgH + div(x1) + tituloEm(x1 + 16, dx - 16 - (x1 + 16), 2, 26, 13).html;
      h += depo(b, { x: dx, y: 9, w: dw, h: 72, fs: 9.5, i: 0, linhas: 3, cls: 'ad-depo--lb' }) + ctaH;
      if (temSelo) h += seloSVG(b, 44, { cx: dx + dw - 6, cy: 12 });
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const LG = logo(b, { x: 18, y: 0, h: 26, maxW: 140, k: 'q1' });
    const x1 = 18 + LG.w + 18;
    const wT = 728 - x1 - 70;
    const T = tit(b, { w: wT, n: 2, min: 18, max: 42, hmax: 74, cls: 'ad-tit--xl' });
    return `${marcaDagua(b, { x: 560, y: -50, d: 190, op: 0.07, k: 'q' })}<div class="ad-vc" style="${P(18, 0, LG.w, 90)}">${LG.html.replace(/style="[^"]*"/, `style="position:relative;width:${f1(LG.w)}px;height:${f1(LG.h)}px"`)}</div><div class="ad-vc" style="${P(x1, 0, wT, 90)}">${T.html}</div><div class="ad-vc" style="${P(728 - 56, 0, 40, 90)}"><i class="ad-seta-q">${ic(UI.seta, '', 2.2)}</i></div>`;
  },
  q2(b) {
    const LG = logo(b, { x: 18, y: 0, h: 22, maxW: 110, k: 'q2' });
    return `<div class="ad-vc" style="${P(18, 0, LG.w, 90)}">${LG.html.replace(/style="[^"]*"/, `style="position:relative;width:${f1(LG.w)}px;height:${f1(LG.h)}px"`)}</div>${heroi(b, 18 + LG.w + 24, 6, 728 - (18 + LG.w + 24) - 18, 78)}`;
  },
};

// ---------- 160×600 · Arranha-céu largo
L.arranhaceu = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 160, H = 600, p = 14, temSelo = K.selo !== 'nenhum';
    let h = '';
    const lg = (base) => logoFlex(b, { h: 24, maxW: 132, k: 'm', base }).html;
    const C = cta(b, { h: 40, fs: 13, maxW: 132, cheio: true });
    if (e === 'produto') {
      const cenaOn = K.fundo === 'cena';
      if (cenaOn) h += cena(b, { x: -60, y: 300, lado: 280, veu: veuDe(K, '180deg', 44, 66) });
      else h += palco(b, { cx: 80, topo: 446, A: 144, pedW: 126, pedH: 0.6 });
      const T = tit(b, { w: 132, n: 6, min: 18, max: 34, hmax: 196 });
      h += pilha(p, 18, 132, 290, [lg(), T.html, etiqueta(b, { fs: 11, rot: -6, abs: false })], { gap: 14 });
      h += `<div class="ad-pe" style="${P(p, 546, 132, 40)}">${C.html}</div>`;
      if (temSelo) h += seloSVG(b, 58, { cx: 126, cy: 336 });
    } else if (e === 'tipografico') {
      if (K.fundo === 'cena') h += cena(b, { x: -80, y: 330, lado: 300, veu: veuDe(K, '180deg', 50, 80) });
      else h += marcaDagua(b, { x: -40, y: 390, d: 240, op: S.naCor ? 0.12 : 0.08 });
      const T = tit(b, { w: 132, n: 9, min: 22, max: 46, hmax: 400, cls: 'ad-tit--xl' });
      h += pilha(p, 18, 132, 568, [lg(), kickC(K), T.html, MOLA, temSelo ? seloSVG(b, 64, { abs: false }) : '', C.html], { gap: 14 });
    } else if (e === 'split') {
      h += painelArte(b, { clip: 'polygon(0 0,100% 0,100% 88%,0 100%)', x: 0, y: 0, w: W, h: 262, arteLado: 138, ax: 80, ay: 124, extra: `<div class="ad-painel-rod ad-al-c" style="${P(0, 200, W)}">${K.heroi === 'oferta' ? `<span class="ad-chip"><b>${esc(K.oferta.curta)}</b></span>` : chipPreco(K, null, false)}</div>` });
      const T = tit(b, { w: 132, n: 6, min: 16, max: 28, hmax: 190 });
      h += pilha(p, 276, 132, 310, [lg(), T.html, MOLA, C.html], { gap: 14 });
      if (temSelo) h += seloSVG(b, 54, { cx: 128, cy: 240 });
    } else if (e === 'cupom') {
      if (K.fundo === 'cena') h += cena(b, { x: -60, y: -40, lado: 280, veu: veuDe(K, '180deg', 0, 40).replace(`${K.S.base} 0%`, `${rgba(K.S.base, 0.3)} 0%`) });
      const T = tit(b, { w: 132, n: 5, min: 16, max: 28, hmax: 160 });
      h += pilha(p, 18, 132, 568, [lg(), T.html, MOLA, cupom(b, { w: 132, h: 214, vertical: true, fs: 10.5, abs: false }), MOLA, C.html], { gap: 14 });
      if (temSelo) h += seloSVG(b, 50, { cx: 134, cy: 30 });
    } else if (e === 'premium') {
      if (K.fundo === 'cena') h += cena(b, { x: -70, y: 250, lado: 300, veu: veuDe(K, '180deg', 42, 70) });
      const T = tit(b, { w: 128, n: 6, min: 15, max: 26, hmax: 170 });
      h += pilha(p, 24, 132, 556, [lg(), kickC(K, 'ad-kick--ouro ad-kick--c'), regua(), T.html, MOLA, K.fundo === 'cena' ? '' : aro(b, { cx: 0, cy: 0, d: 112 }).replace(/style="[^"]*"/, 'style="position:relative;width:112px;height:112px;flex:none"'), MOLA, C.html], { gap: 12, alinhar: 'c' });
      if (temSelo) h += seloSVG(b, 46, { cx: 132, cy: 350 });
    } else {
      if (K.fundo === 'cena') h += cena(b, { x: -70, y: 380, lado: 300, veu: veuDe(K, '180deg', 60, 85) });
      const T = tit(b, { w: 132, n: 5, min: 15, max: 26, hmax: 150 });
      h += pilha(p, 18, 132, 568, [lg(), T.html, MOLA, depo(b, { w: 132, h: null, fs: 12.5, i: 0, linhas: 10, abs: false }), MOLA, K.selo === 'nota' ? '' : chipNota(K, 'ad-nota--col'), C.html], { gap: 12 });
      if (temSelo) h += seloSVG(b, 50, { cx: 128, cy: 30 });
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const T = tit(b, { w: 132, n: 9, min: 22, max: 46, hmax: 420, cls: 'ad-tit--xl' });
    return `${marcaDagua(b, { x: -30, y: 420, d: 220, op: 0.07, k: 'q' })}${pilha(14, 18, 132, 566, [logoFlex(b, { h: 22, maxW: 132, k: 'q1' }).html, MOLA, kicker(K, K.pk.cat), T.html, MOLA, `<i class="ad-seta-q ad-seta-q--baixo">${ic(UI.seta, '', 2.2)}</i>`], { gap: 14 })}`;
  },
  q2(b) { return `${heroi(b, 14, 64, 132, 516)}<div class="ad-q-logo">${logo(b, { x: 80, y: 18, h: 22, maxW: 132, alinhar: 'c', k: 'q2' }).html}</div>`; },
};

// ---------- 320×50 · Banner de celular
L.celular = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 320, H = 50;
    let h = '';
    const sym = logo(b, { x: 8, y: 9, h: 32, simbolo: true, k: 'm' }).html;
    const C = cta(b, { h: 28, fs: 11, maxW: 104 });
    const cX = W - 8 - C.w;
    const ctaH = `<div class="ad-vc" style="${P(cX, 0, C.w, H)}">${C.html}</div>`;
    const txtEm = (x, w, extra = '') => {
      let T = tit(b, { w, n: 2, min: 11.5, max: 17, hmax: 38 });
      if (!T.ok) T = tit(b, { w, n: 2, min: 11, max: 15, hmax: 38, txt: tituloCurto(K) });
      return `<div class="ad-vc ad-vc--col" style="${P(x, 0, w, H)}">${T.html}${extra}</div>`;
    };
    if (e === 'produto') {
      if (K.fundo === 'cena') h += cena(b, { x: cX - 110, y: -40, lado: 130, veu: `linear-gradient(90deg, ${S.base} 55%, ${rgba(S.base, 0)} 75%)` });
      else h += `<div class="ad-arte ad-mb-arte" style="${P(cX - 50, 1, 48, 48)}">${arteSVG(b, { k: 'mb' })}</div><i class="ad-halo" style="${P(cX - 62, -12, 72, 72)}"></i>`;
      h += sym + txtEm(46, cX - 50 - 50) + ctaH;
    } else if (e === 'tipografico') {
      h += marcaDagua(b, { x: cX - 60, y: -24, d: 96, op: 0.08 });
      h += sym + txtEm(46, cX - 52).replace('ad-tit ', 'ad-tit ad-tit--xl ') + ctaH;
    } else if (e === 'split') {
      const C2 = cta(b, { h: 27, fs: 10.5, maxW: 100 });
      const largo = W - 58 - 4 - C2.w - 52 >= 128;
      const pw = largo ? 58 : 26, px0 = W - pw;
      h += largo ? painelArte(b, { clip: 'polygon(12px 0,100% 0,100% 100%,0 100%)', x: px0, y: 0, w: pw, h: H, arteLado: 46, ax: px0 + 33, ay: 25 })
        : `<div class="ad-painel" style="${P(px0, 0, pw, H)};background:${corPainel(K)};clip-path:polygon(12px 0,100% 0,100% 100%,0 100%)"></div>`;
      const c2x = px0 - 4 - C2.w;
      h += sym + txtEm(46, c2x - 52) + `<div class="ad-vc" style="${P(c2x, 0, C2.w, H)}">${C2.html}</div>`;
    } else if (e === 'cupom') {
      const T1 = tit(b, { w: cX - 54, n: 1, min: 11, max: 15, hmax: 20 });
      if (T1.ok && K.oferta) h += sym + `<div class="ad-vc ad-vc--col ad-mb-duas" style="${P(48, 0, cX - 54, H)}">${T1.html}<span class="ad-mb-cup"><b>${esc(K.oferta.curta)}</b><i></i><span>BEMVINDO</span></span></div>` + ctaH;
      else h += sym + txtEm(46, cX - 52) + ctaH;
    } else if (e === 'premium') {
      h += sym + txtEm(48, cX - 56) + ctaH;
    } else {
      const T1 = tit(b, { w: cX - 54, n: 1, min: 11, max: 15, hmax: 20 });
      if (T1.ok) h += sym + `<div class="ad-vc ad-vc--col ad-mb-duas" style="${P(48, 0, cX - 54, H)}">${T1.html}<span class="ad-mb-nota">${estrelas(5)}${K.nota ? `<b>${esc(K.nota.v)}</b><small>${esc(K.nota.r)}</small>` : ''}</span></div>` + ctaH;
      else h += sym + txtEm(46, cX - 52) + ctaH;
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const sym = logo(b, { x: 8, y: 9, h: 32, simbolo: true, k: 'q1' }).html;
    let T = tit(b, { w: 256, n: 2, min: 12, max: 22, hmax: 42, cls: 'ad-tit--xl' });
    if (!T.ok) T = tit(b, { w: 256, n: 2, min: 11, max: 18, hmax: 42, txt: tituloCurto(K), cls: 'ad-tit--xl' });
    return `${sym}<div class="ad-vc" style="${P(48, 0, 262, 50)}">${T.html}</div>`;
  },
  q2(b) { return heroi(b, 8, 4, 304, 42); },
};

// ---------- 300×600 · Meia página
L.meiapagina = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 300, H = 600, p = 22, temSelo = K.selo !== 'nenhum';
    let h = '';
    const lg = (base) => logoFlex(b, { h: 28, maxW: 200, k: 'm', base }).html;
    const C = cta(b, { h: 46, fs: 15, maxW: 256, cheio: true });
    const dom = `<span class="ad-dom ad-dom--c">${esc(K.ctx.dominio)}</span>`;
    if (e === 'produto') {
      const cenaOn = K.fundo === 'cena';
      if (cenaOn) h += cena(b, { x: -40, y: 230, lado: 380, veu: veuDe(K, '180deg', 40, 62) });
      else h += palco(b, { cx: 150, topo: 452, A: 200, pedW: 184 });
      const T = tit(b, { w: temSelo ? 236 : 256, n: 4, min: 24, max: 46, hmax: 168 });
      const alturaTexto = 28 + 12 + 13 * kickLinhas(K, 256, 10) + 12 + T.h; // descrição só quando sobra espaço antes do produto
      h += pilha(p, 24, 256, 330, [lg(), kickC(K), T.html, alturaTexto + 12 + 56 < 262 && !temSelo ? `<p class="ad-desc">${esc(K.item.desc)}</p>` : ''], { gap: 12 });
      if (!cenaOn) h += etiqueta(b, { x: 14, y: 452, fs: 13, rot: -7 }); else h += etiqueta(b, { x: 22, y: 400, fs: 13, rot: -7 });
      h += `<div class="ad-pe ad-pe--col" style="${P(p, 520, 256, 68)}">${C.html}${dom}</div>`;
      if (temSelo) h += seloSVG(b, 76, { cx: 248, cy: cenaOn ? 350 : 344 });
    } else if (e === 'tipografico') {
      if (K.fundo === 'cena') h += cena(b, { x: 40, y: 330, lado: 320, veu: veuDe(K, '180deg', 42, 78) });
      else h += marcaDagua(b, { x: 110, y: 330, d: 300, op: S.naCor ? 0.12 : 0.08 });
      const T = tit(b, { w: 256, n: 7, min: 32, max: 92, hmax: 360, cls: 'ad-tit--xl' });
      h += pilha(p, 24, 256, 564, [linhaFlex([lg(), MOLA, temSelo ? seloSVG(b, 62, { abs: false }) : ''], 8), kickC(K), T.html, MOLA, C.html, dom], { gap: 14 });
    } else if (e === 'split') {
      h += painelArte(b, { clip: 'polygon(0 0,100% 0,100% 86%,0 100%)', x: 0, y: 0, w: W, h: 300, arteLado: 210, ax: 150, ay: 136, extra: `<div class="ad-painel-rod" style="${P(22, 22, 256)};justify-content:flex-start">${K.heroi === 'oferta' ? `<span class="ad-chip"><b>${esc(K.oferta.curta)}</b></span>` : chipPreco(K, null, false)}</div>` });
      const T = tit(b, { w: 256, n: 4, min: 20, max: 38, hmax: 150 });
      h += pilha(p, 312, 256, 276, [lg(), T.html, MOLA, C.html, dom], { gap: 12 });
      if (temSelo) h += seloSVG(b, 70, { cx: 246, cy: 272 });
    } else if (e === 'cupom') {
      if (K.fundo === 'cena') h += cena(b, { x: 60, y: -60, lado: 300, veu: veuDe(K, '180deg', 5, 45).replace(`${K.S.base} 5%`, `${rgba(K.S.base, 0.25)} 5%`) });
      const T = tit(b, { w: temSelo ? 196 : 256, n: 3, min: 20, max: 34, hmax: 110 });
      h += pilha(p, 24, 256, 564, [lg(), kickC(K), T.html, MOLA, cupom(b, { w: 256, h: 250, vertical: true, fs: 13, abs: false }), MOLA, C.html], { gap: 14 });
      if (temSelo) h += seloSVG(b, 66, { cx: 244, cy: 64 });
    } else if (e === 'premium') {
      if (K.fundo === 'cena') h += cena(b, { x: -40, y: 260, lado: 380, veu: veuDe(K, '180deg', 40, 66) });
      const T = tit(b, { w: 236, n: 4, min: 20, max: 36, hmax: 150 - 12 * kickLinhas(K, 236, 10) });
      h += pilha(32, 34, 236, 536, [lg(), kickC(K, 'ad-kick--ouro ad-kick--c'), T.html, regua(), MOLA, K.fundo === 'cena' ? '' : aro(b, { cx: 0, cy: 0, d: 176 }).replace(/style="[^"]*"/, 'style="position:relative;width:176px;height:176px;flex:none"'), MOLA, C.html.replace(/width:256px/, 'width:236px'), dom], { gap: 12, alinhar: 'c' });
      if (temSelo) h += seloSVG(b, 58, { cx: 238, cy: 330 });
    } else {
      if (K.fundo === 'cena') h += cena(b, { x: 40, y: 400, lado: 300, veu: veuDe(K, '180deg', 60, 90) });
      const T = tit(b, { w: temSelo ? 200 : 256, n: 3, min: 18, max: 32, hmax: 110 });
      const nums = `<div class="ad-nums">${K.pk.nums.map(([v, r]) => `<span><b>${esc(v)}</b><small>${esc(r)}</small></span>`).join('')}</div>`;
      h += pilha(p, 24, 256, 564, [lg(), T.html, depo(b, { w: 256, h: null, fs: 14, i: 1, linhas: 6, abs: false, cls: 'ad-depo--grande' }), nums, MOLA, C.html], { gap: 14 });
      if (temSelo) h += seloSVG(b, 62, { cx: 246, cy: 60 });
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const T = tit(b, { w: 256, n: 7, min: 30, max: 70, hmax: 400, cls: 'ad-tit--xl' });
    return `${marcaDagua(b, { x: 100, y: 350, d: 300, op: 0.07, k: 'q' })}${pilha(22, 24, 256, 552, [logoFlex(b, { h: 26, maxW: 200, k: 'q1' }).html, MOLA, kicker(K, K.kicker), T.html, MOLA, `<i class="ad-seta-q ad-seta-q--baixo">${ic(UI.seta, '', 2.2)}</i>`], { gap: 16 })}`;
  },
  q2(b) { return `${heroi(b, 22, 76, 256, 500)}<div class="ad-q-logo">${logo(b, { x: 150, y: 24, h: 26, maxW: 200, alinhar: 'c', k: 'q2' }).html}</div>`; },
};

// ---------- 970×250 · Billboard
L.billboard = {
  mestre(b) {
    const { K } = b, S = K.S, e = K.estilo, W = 970, H = 250, p = 34, temSelo = K.selo !== 'nenhum';
    let h = '';
    const lg = (base) => logoFlex(b, { h: 30, maxW: 240, k: 'm', base }).html;
    const C = cta(b, { h: 46, fs: 15, maxW: 240 });
    const pe = linhaFlex([C.html, `<span class="ad-dom">${esc(K.ctx.dominio)}</span>`], 16);
    if (e === 'produto') {
      const cenaOn = K.fundo === 'cena';
      if (cenaOn) h += cena(b, { x: 480, y: -120, lado: 470, veu: `linear-gradient(90deg, ${S.base} 44%, ${rgba(S.base, 0)} 62%)` });
      else h += palco(b, { cx: 650, topo: 176, A: 204, pedW: 200 });
      const T = tit(b, { w: 440, n: 3, min: 22, max: 52, hmax: 94 });
      h += pilha(p, 28, 450, 194, [linhaFlex([lg(), `<i class="ad-div-h"></i>`, kickC(K)], 14), T.html, MOLA, pe], { gap: 12 });
      h += `<div class="ad-bb-item" style="${P(784, 0, 160, H)}"><span class="ad-kick">${esc(K.pk.itensTitulo)}</span><b>${esc(K.item.nome)}</b><small>${esc(K.item.desc)}</small>${etiqueta(b, { fs: 12.5, rot: -6, nome: false, abs: false })}</div>`;
      if (temSelo) h += seloSVG(b, 86, { cx: 560, cy: 64 });
    } else if (e === 'tipografico') {
      if (K.fundo === 'cena') h += cena(b, { x: 600, y: -110, lado: 440, veu: `linear-gradient(90deg, ${S.base} 62%, ${rgba(S.base, 0.3)} 84%)` });
      else h += marcaDagua(b, { x: 700, y: -70, d: 380, op: S.naCor ? 0.12 : 0.08 });
      const C2 = cta(b, { h: 48, fs: 15.5, maxW: 240 });
      const T = tit(b, { w: temSelo ? 700 : 760, n: 2, min: 36, max: 84, hmax: 160, cls: 'ad-tit--xl' });
      h += pilha(p, 28, 900, 194, [linhaFlex([lg(), `<i class="ad-div-h"></i>`, kickC(K)], 16), MOLA, T.html, MOLA], { gap: 10 });
      h += `<div class="ad-pe ad-pe--dir" style="${P(W - p - C2.w, H - 30 - 48, C2.w, 48)}">${C2.html}</div>`;
      if (temSelo) h += seloSVG(b, 84, { cx: W - p - 42, cy: 66 });
    } else if (e === 'split') {
      const px0 = 560;
      h += painelArte(b, { clip: 'polygon(70px 0,100% 0,100% 100%,0 100%)', x: px0, y: 0, w: W - px0, h: H, arteLado: 200, ax: 750, ay: 125, extra: `<div class="ad-painel-rod ad-al-r" style="${P(W - px0 - 250, 196, 228)}">${K.heroi === 'oferta' ? `<span class="ad-chip"><b>${esc(K.oferta.curta)}</b></span>` : chipPreco(K)}</div>` });
      const T = tit(b, { w: 470, n: 3, min: 20, max: 46, hmax: 94 });
      h += pilha(p, 28, 500, 194, [linhaFlex([lg(), `<i class="ad-div-h"></i>`, kickC(K)], 14), T.html, MOLA, pe], { gap: 12 });
      if (temSelo) h += seloSVG(b, 80, { cx: px0 + 30, cy: 70 });
    } else if (e === 'cupom') {
      if (K.fundo === 'cena') h += cena(b, { x: 420, y: -120, lado: 470, veu: `linear-gradient(90deg, ${S.base} 30%, ${rgba(S.base, 0.5)} 70%)` });
      const T = tit(b, { w: 380, n: 3, min: 16, max: 40, hmax: 88 - 13 * kickLinhas(K, 390, 10) });
      h += pilha(p, 28, 390, 194, [lg(), kickC(K), T.html, MOLA, pe], { gap: 10 });
      h += cupom(b, { x: 452, y: 36, w: 484, h: 178, fs: 14 });
      if (temSelo) h += seloSVG(b, 70, { cx: 930, cy: 40 });
    } else if (e === 'premium') {
      if (K.fundo === 'cena') h += cena(b, { x: 560, y: -110, lado: 440, veu: `linear-gradient(90deg, ${S.base} 50%, ${rgba(S.base, 0.1)} 72%)` });
      else h += aro(b, { cx: 752, cy: 125, d: 180 });
      const T = tit(b, { w: 460, n: 3, min: 20, max: 44, hmax: 84 });
      h += pilha(44, 30, 480, 190, [linhaFlex([lg(), `<i class="ad-div-h ad-div-h--ouro"></i>`, kickC(K, 'ad-kick--ouro')], 14), T.html, MOLA, pe], { gap: 10 });
      if (temSelo) h += seloSVG(b, 64, { cx: 872, cy: 70 });
    } else {
      if (K.fundo === 'cena') h += cena(b, { x: 520, y: -140, lado: 480, veu: `linear-gradient(90deg, ${S.base} 30%, ${rgba(S.base, 0.55)} 60%)` });
      const T = tit(b, { w: 320, n: 3, min: 17, max: 34, hmax: 76 });
      h += pilha(p, 28, 330, 194, [lg(), T.html, K.selo === 'nota' ? '' : chipNota(K), MOLA, C.html], { gap: 10 });
      h += depo(b, { x: 392, y: 32, w: 270, h: 186, fs: 12.5, i: 0, linhas: 5 });
      h += depo(b, { x: 676, y: 32, w: 262, h: 186, fs: 12.5, i: 1, linhas: 5 });
      if (temSelo) h += seloSVG(b, 64, { cx: 930, cy: 36 });
    }
    return h;
  },
  q1(b) {
    const { K } = b;
    const T = tit(b, { w: 820, n: 2, min: 40, max: 92, hmax: 148, cls: 'ad-tit--xl' });
    return `${marcaDagua(b, { x: 720, y: -60, d: 360, op: 0.07, k: 'q' })}${pilha(34, 28, 900, 194, [linhaFlex([logoFlex(b, { h: 28, maxW: 220, k: 'q1' }).html, `<i class="ad-div-h"></i>`, kicker(K, K.kicker)], 16), MOLA, T.html, MOLA], { gap: 10 })}<div class="ad-vc" style="${P(900, 0, 40, 250)}"><i class="ad-seta-q">${ic(UI.seta, '', 2.2)}</i></div>`;
  },
  q2(b) { return `${heroi(b, 250, 20, 690, 210)}<div class="ad-q-logo">${logo(b, { x: 34, y: 28, h: 30, maxW: 190, k: 'q2' }).html}</div>`; },
};

// formato pelo tamanho (exato; senão, o mais parecido na proporção)
function formatoDe(w, h) {
  const ex = TAMANHOS.find(([a, b2]) => a === w && b2 === h);
  if (ex) return { id: ex[3], nome: ex[2] };
  const r = w / h;
  const perto = [...TAMANHOS].sort((a, b2) => Math.abs(Math.log(a[0] / a[1] / r)) - Math.abs(Math.log(b2[0] / b2[1] / r)))[0];
  return { id: perto[3], nome: perto[2] };
}

// ------------------------------------------------------------------ API
// um banner no tamanho EXATO; inst diferencia ids de SVG quando o mesmo banner aparece mais de uma vez na página
export function anuncioHTML(ctx, tam, inst = '') {
  const [w, h] = tam;
  const K = kit(ctx);
  const fm = formatoDe(w, h);
  const uid = `${fm.id.slice(0, 2)}${K.id}${String(inst).replace(/[^a-z0-9]/gi, '')}`;
  const b = { K, w, h, fm, uid, q: '' };
  const Lf = L[fm.id];
  let corpo;
  if (K.anim === 'sequencia') {
    const q1 = Lf.q1({ ...b, q: 'q1', uid: uid + 'a' }), q2 = Lf.q2({ ...b, q: 'q2', uid: uid + 'b' }), q3 = Lf.mestre({ ...b, q: 'q3', uid: uid + 'c' });
    corpo = `<div class="ad-q ad-q1">${q1}</div><div class="ad-q ad-q2">${q2}</div><div class="ad-q ad-q3">${q3}</div>`;
  } else corpo = `<div class="ad-q ad-q0">${Lf.mestre(b)}</div>`;
  const S = K.S;
  const cls = ['ad', `ad--${fm.id}`, `ad-e-${K.estilo}`, `ad-f-${K.fundo}`, `ad-a-${K.anim}`, S.escura ? 'ad-escuro' : S.naCor ? 'ad-nacor' : 'ad-claro', S.marcaTexto ? 'ad-hlm' : '', K.serifa ? 'ad-serifa' : '', `ad-tx-${K.tex}`, K.ital ? 'ad-ital' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}" data-w="${w}" data-h="${h}" data-k="${K.id}" data-i="${esc(inst)}" style="width:${w}px;height:${h}px;${K.vars}" role="group" aria-roledescription="anúncio" aria-label="Anúncio ${w}×${h} · ${esc(ctx.nome)}">${fundo(b)}${corpo}${moldura(K)}</div>`;
}

// painel do estúdio (281 × 266 em 1440×900): o kit em escala, com rótulos discretos e a animação rodando
export function anunciosPainelHTML(ctx) {
  const slot = (w, h, s, rot, inst, cls = '') => `<figure class="ad-kit-it ${cls}"><figcaption>${rot}</figcaption><div class="ad-kit-caixa" style="width:${f1(w * s)}px;height:${f1(h * s)}px"><div class="ad-kit-esc" style="transform:scale(${s})">${anuncioHTML(ctx, [w, h], inst)}</div></div></figure>`;
  const sSky = 0.428, sR = 203 / 300, sLb = 203 / 728, sMb = 203 / 320;
  return `<div class="ad-painel-kit" aria-label="Kit de banners">${estiloAjustes(ctx.ajustes, 'anuncios', ctx)}<div class="ad-kit">
<div class="ad-kit-col ad-kit-col--sky">${slot(160, 600, sSky, '160×600', 'ps')}</div>
<div class="ad-kit-col">${slot(728, 90, sLb, '728×90 · super banner', 'pl')}${slot(300, 250, sR, '300×250 · retângulo médio', 'pr')}${slot(320, 50, sMb, '320×50 · celular', 'pm')}</div>
</div></div>`;
}

// peso estimado (HTML do banner + fatia do CSS), em KB
function pesoKB(html) { return (new TextEncoder().encode(html).length + 14000) / 1024; }

// vitrine grande (modal de ~1280 px): os banners num portal de verdade, no celular e na prancha técnica
export function anunciosAmpliadoHTML(ctx) {
  const K = kit(ctx);
  const A = ctx.anuncios;
  const rot = (q, id) => { const m = { conceito: A.conceito && A.conceito.rotulo, estilo: ESTILO_ROT[A.estilo], selo: SELO_ROT[A.selo], fundo: FUNDO_ROT[A.fundo], anim: ANIM_ROT[A.anim] }; return m[q] || id; };
  const chips = [['Conceito', rot('conceito')], ['Estilo', rot('estilo')], ['Selo', rot('selo')], ['Cores', rot('fundo')], ['Animação', rot('anim')], ['Botão', K.cta]]
    .map(([k, v]) => `<span class="ad-amp-chip"><small>${k}</small>${esc(v)}</span>`).join('');
  const cidade = ctx.cidade ? ctx.cidade.nome : 'na cidade';
  const comida = ['burger', 'pizza', 'cafe', 'cupcake', 'talheres', 'cloche', 'chef', 'tigela', 'taca', 'caneca', 'sorvete', 'trigo'].includes(ctx.icone.id);
  const secao = comida ? 'Comer &amp; beber' : 'Cidade';
  const hoje = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(ctx.agora instanceof Date ? ctx.agora : new Date(ctx.agora));
  const barras = (n, w = [100, 96, 98, 72]) => Array.from({ length: n }, (_, i) => `<i style="width:${w[i % w.length]}%"></i>`).join('');
  const pub = (html, cls = '') => `<div class="ad-slot ${cls}"><span class="ad-slot-rot">Publicidade</span>${html}</div>`;
  const portal = `<div class="ad-nav">
  <div class="ad-nav-cab"><div class="ad-nav-dots"><i></i><i></i><i></i></div><div class="ad-nav-url">${ic(UI.web, '', 1.8)}<span>cotidiano.com.br/${esc(ctx.cidade ? ctx.cidade.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') : 'cidade')}/fim-de-semana</span></div></div>
  <div class="ad-site">
    <header class="ad-site-top"><b class="ad-site-logo">Cotidiano</b><nav><span>Últimas</span><span${comida ? '' : ' class="on"'}>Cidade</span><span${comida ? ' class="on"' : ''}>Comer &amp; beber</span><span>Bem-estar</span><span>Cultura</span><span>Negócios</span></nav><i class="ad-site-busca"></i></header>
    ${pub(anuncioHTML(ctx, [970, 250], 'vb'), 'ad-slot--bb')}
    <div class="ad-site-grade">
      <article class="ad-site-art">
        <span class="ad-site-cat">${secao}</span>
        <h3>Guia do fim de semana: o que fazer ${ctx.cidade ? `em ${esc(cidade)}` : 'na cidade'}</h3>
        <p class="ad-site-by">Por Redação · ${esc(hoje)} · 6 min de leitura</p>
        <div class="ad-site-foto">${ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', '', 1.4)}</div>
        <p class="ad-site-txt">O fim de semana promete sol, feiras de rua e programação gratuita. Separamos os endereços que estão dando o que falar.</p>
        <div class="ad-site-bar">${barras(4)}</div>
        ${pub(anuncioHTML(ctx, [300, 250], 'vr'), 'ad-slot--mr')}
        <div class="ad-site-bar">${barras(9, [100, 94, 97, 100, 88, 99, 92, 100, 64])}</div>
        <h4>Para ir com calma</h4>
        <div class="ad-site-bar">${barras(5, [100, 97, 90, 99, 58])}</div>
        ${pub(anuncioHTML(ctx, [728, 90], 'vl'), 'ad-slot--lb')}
        <div class="ad-site-bar">${barras(3, [100, 95, 70])}</div>
      </article>
      <aside class="ad-site-lado">
        <div class="ad-site-mais"><b>Mais lidas</b>${[1, 2, 3].map((n) => `<div><span>${n}</span><p>${barras(2, [100, 76])}</p></div>`).join('')}</div>
        ${pub(anuncioHTML(ctx, [300, 600], 'vh'), 'ad-slot--hp')}
      </aside>
    </div>
  </div>
</div>`;
  const cel = (conteudo, cls = '') => `<div class="ad-cel ${cls}"><div class="ad-cel-tela"><div class="ad-cel-status"><b>9:41</b><i></i></div>${conteudo}</div></div>`;
  const celA = cel(`<div class="ad-cel-site"><div class="ad-cel-top"><b>Cotidiano</b><i></i></div><span class="ad-site-cat">${secao}</span><h5>Guia do fim de semana: o que fazer ${ctx.cidade ? `em ${esc(cidade)}` : 'na cidade'}</h5><div class="ad-site-foto ad-site-foto--cel"></div><div class="ad-site-bar">${barras(7, [100, 94, 98, 100, 90, 97, 60])}</div></div><div class="ad-cel-fixo">${anuncioHTML(ctx, [320, 50], 'vm')}</div>`);
  const celB = cel(`<div class="ad-cel-site"><div class="ad-cel-top"><b>Cotidiano</b><i></i></div><div class="ad-site-bar">${barras(3, [100, 92, 66])}</div>${pub(`<div class="ad-cel-esc">${anuncioHTML(ctx, [300, 250], 'vc')}</div>`, 'ad-slot--cel')}<div class="ad-site-bar">${barras(4, [100, 97, 92, 70])}</div><h5 class="ad-cel-h">${ctx.cidade ? `Roteiro de ${esc(cidade)}` : 'Roteiro da cidade'}</h5><div class="ad-site-bar">${barras(6, [100, 94, 98, 100, 90, 62])}</div></div>`);
  const prancha = ORDEM_PRANCHA.map((id) => {
    const [w, h, nome] = TAMANHOS.find((t) => t[3] === id);
    const html = anuncioHTML(ctx, [w, h], 'pt' + id.slice(0, 3));
    return `<figure class="ad-pr-it ad-pr-it--${id}" style="--w:${w}px;--h:${h}px"><div class="ad-pr-cota ad-pr-cota--w"><span>${w} px</span></div><div class="ad-pr-cota ad-pr-cota--h"><span>${h} px</span></div><div class="ad-pr-banner">${html}</div><figcaption><b>${esc(nome)}</b><span>${IAB[id]} · ${w}×${h}</span><em>≈ ${pesoKB(html).toFixed(0)} KB · limite IAB 150 KB</em></figcaption></figure>`;
  }).join('');
  return `<div class="ad-amp">${estiloAjustes(ctx.ajustes, 'anuncios', ctx)}
<header class="ad-amp-cab"><div><span class="ad-amp-k">Kit de display · ${esc(ctx.nome)}</span><h2>6 formatos IAB, uma campanha só</h2><p>HTML5 leve, 100% vetorial, animação em CSS que respeita “reduzir movimento”. Tudo abaixo nasceu das decisões do Jev.</p></div><div class="ad-amp-chips">${chips}</div></header>
<section class="ad-amp-sec"><h3><span>01</span>Em contexto · portal de notícias</h3><div class="ad-fit" style="--dw:1180;--dh:${1760}"><div class="ad-fit-in">${portal}</div></div></section>
<section class="ad-amp-sec"><h3><span>02</span>No celular · rodapé fixo e no meio do texto</h3><div class="ad-amp-cels">${celA}${celB}<div class="ad-amp-nota"><b>320×50</b> fica preso no rodapé enquanto a pessoa rola a página; o <b>300×250</b> aparece entre os parágrafos. Os dois usam o mesmo título, a mesma cor e o mesmo botão do kit.</div></div></section>
<section class="ad-amp-sec"><h3><span>03</span>Prancha técnica · 100% do tamanho</h3><div class="ad-pr">${prancha}</div></section>
</div>`;
}
const ESTILO_ROT = { produto: 'Produto em destaque', tipografico: 'Tipográfico', split: 'Dividido', cupom: 'Cupom', premium: 'Premium escuro', depoimento: 'Depoimento' };
const SELO_ROT = { frete: 'Entrega grátis', nota: 'Nota alta', novo: 'Novo', hoje: 'Só hoje', garantia: 'Garantia', nenhum: 'Sem selo' };
const FUNDO_ROT = { solido: 'Cor sólida', gradiente: 'Degradê', escuro: 'Escuro', claro: 'Papel claro', padrao: 'Padrão de ícones', cena: 'Ilustração' };
const ANIM_ROT = { sequencia: 'Sequência de 3 quadros', revelar: 'Revelar', pulso: 'Botão pulsando', estatico: 'Estático' };

// CSS do módulo para o arquivo baixado (lido da folha carregada na página; na falta, do arquivo ao lado)
let cssCache = null;
function cssDoModulo() {
  if (cssCache) return cssCache;
  if (typeof document !== 'undefined') {
    for (const sh of document.styleSheets) {
      if (!sh.href || !/anuncios\.css(\?|$)/.test(sh.href)) continue;
      try { cssCache = [...sh.cssRules].map((r) => r.cssText).join('\n'); } catch { /* folha de outra origem */ }
      if (cssCache) return cssCache;
    }
    try {
      const x = new XMLHttpRequest();
      x.open('GET', new URL('../css/anuncios.css', import.meta.url).href, false);
      x.send();
      if (x.status >= 200 && x.status < 300) cssCache = x.responseText;
    } catch { /* sem rede: segue sem */ }
  }
  return cssCache || '';
}

// documento HTML completo e autossuficiente: todos os banners a 100%, cada um no seu quadro, com animação
export function anunciosExportavel(ctx0) {
  const ctx = { ...ctx0, __adExportar: true };
  const K = kit(ctx);
  const fonteCSS = (s) => String(s).replace(/[<>{};]/g, '');
  const quadros = ORDEM_PRANCHA.map((id) => {
    const [w, h, nome] = TAMANHOS.find((t) => t[3] === id);
    const html = anuncioHTML(ctx, [w, h], 'x' + id.slice(0, 3));
    return `<figure class="q" id="${id}"><figcaption><b>${esc(nome)}</b><span>${w}×${h} · ${IAB[id]}</span><em>≈ ${pesoKB(html).toFixed(0)} KB</em><button type="button" data-rever="${id}">↻ Rever</button></figcaption><div class="q-caixa" style="width:${w}px;height:${h}px"><a class="q-clique" href="https://${esc(ctx.dominio)}" target="_blank" rel="noopener">${html}</a></div></figure>`;
  }).join('\n');
  const A = ctx.anuncios;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banners HTML5 · ${esc(ctx.nome)}</title>
<style>
${cssDoModulo()}
*{box-sizing:border-box}
</style>
${estiloAjustes(ctx.ajustes, 'anuncios', ctx)}
<style>
html{background:#15171d}
body{margin:0;padding:clamp(12px,3vw,40px);font:14px/1.45 ${fonteCSS(K.f.body)};color:#e7e9ee;background:radial-gradient(1200px 600px at 10% -10%,#252a36,transparent),#15171d}
header.k{max-width:980px;margin:0 auto 28px;display:flex;flex-wrap:wrap;gap:10px 24px;align-items:flex-end;justify-content:space-between}
header.k h1{margin:0;font:${K.f.dw} clamp(22px,3vw,30px)/1.1 ${fonteCSS(K.f.disp)};letter-spacing:-.01em}
header.k p{margin:6px 0 0;color:#9aa1ae;max-width:560px}
header.k small{font:700 11px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7f8796}
main.k{max-width:980px;margin:0 auto;display:flex;flex-wrap:wrap;gap:34px 30px;align-items:flex-start}
figure.q{margin:0;max-width:100%}
figure.q figcaption{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0 0 10px;font:600 12px/1.3 ui-monospace,Menlo,monospace;color:#9aa1ae}
figure.q figcaption b{font:700 14px/1.2 ${fonteCSS(K.f.body)};color:#fff}
figure.q figcaption em{font-style:normal;color:#6ee7b7}
figure.q button{margin-left:auto;font:600 11px ui-monospace,Menlo,monospace;color:#cbd2dc;background:#262a33;border:1px solid #3a3f4b;border-radius:999px;padding:4px 10px;cursor:pointer}
.q-caixa{max-width:100%;overflow:auto;box-shadow:0 1px 0 rgba(255,255,255,.06),0 24px 48px -24px rgba(0,0,0,.7);outline:1px solid rgba(255,255,255,.08)}
.q-clique{display:block;text-decoration:none;color:inherit}
footer.k{max-width:980px;margin:36px auto 0;color:#7f8796;font:12px/1.5 ui-monospace,Menlo,monospace}
</style>
</head>
<body>
<header class="k"><div><small>Kit de display · ${esc(ctx.nome)}</small><h1>${esc(K.titulo)}</h1><p>${esc(ESTILO_ROT[A.estilo] || A.estilo)} · ${esc(FUNDO_ROT[A.fundo] || A.fundo)} · ${esc(ANIM_ROT[A.anim] || A.anim)} · botão “${esc(K.cta)}”. Tamanhos padrão IAB, sem recursos externos: fontes da marca pelo nome, com reserva do sistema.</p></div><small>clickTag → https://${esc(ctx.dominio)}</small></header>
<main class="k ad-exp">
${quadros}
</main>
<footer class="k">Animação limitada a ~30 s (3 voltas), como pedem as redes de anúncio; “reduzir movimento” mostra o quadro final.</footer>
<script>
var clickTag = "https://${esc(ctx.dominio)}";
// sem a fonte da marca instalada, a de reserva pode ser mais larga que o nome medido no logo: ajusta o viewBox
function ajustarLogos() {
  document.querySelectorAll('.ad-logo svg, .ad-cup-sym svg').forEach(function (svg) {
    try {
      var vb = svg.viewBox.baseVal, bb = svg.getBBox();
      if (!vb || !vb.width || !bb.width) return;
      var x0 = Math.min(vb.x, bb.x - 2), y0 = Math.min(vb.y, bb.y - 2), x1 = Math.max(vb.x + vb.width, bb.x + bb.width + 2), y1 = Math.max(vb.y + vb.height, bb.y + bb.height + 2);
      if (x0 < vb.x - 0.5 || y0 < vb.y - 0.5 || x1 > vb.x + vb.width + 0.5 || y1 > vb.y + vb.height + 0.5) svg.setAttribute('viewBox', x0 + ' ' + y0 + ' ' + (x1 - x0) + ' ' + (y1 - y0));
    } catch (e) {}
  });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarLogos); else window.addEventListener('load', ajustarLogos);
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rever]');
  if (!b) return;
  var q = document.getElementById(b.getAttribute('data-rever')).querySelector('.ad');
  q.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); a.play(); });
});
</script>
</body>
</html>`;
}

// idempotente: vigia a troca do título pela IA de texto (o app escreve em [data-campo="anuncio"]) para a animação
// "revelar" mostrar o texto novo em vez das palavras antigas
export function ativarAnuncios(raiz) {
  if (!raiz) return;
  // o logo da marca mede o nome com canvas; se a fonte ainda não tinha carregado, o nome passa do viewBox: reajusta
  const ajustarLogos = () => raiz.querySelectorAll('.ad-logo svg, .ad-cup-sym svg').forEach((svg) => {
    try {
      const vb = svg.viewBox && svg.viewBox.baseVal, bb = svg.getBBox();
      if (!vb || !vb.width || !bb.width) return;
      const x0 = Math.min(vb.x, bb.x - 2), y0 = Math.min(vb.y, bb.y - 2), x1 = Math.max(vb.x + vb.width, bb.x + bb.width + 2), y1 = Math.max(vb.y + vb.height, bb.y + bb.height + 2);
      if (x0 < vb.x - 0.5 || y0 < vb.y - 0.5 || x1 > vb.x + vb.width + 0.5 || y1 > vb.y + vb.height + 0.5) svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`);
    } catch { /* fora do layout */ }
  });
  if (typeof document !== 'undefined' && document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(ajustarLogos); else ajustarLogos();
  // banners desenhados antes de a fonte da marca carregar (logo e encaixe do título medidos com a fonte de reserva):
  // carrega as fontes e redesenha cada um uma única vez
  const velhos = [...raiz.querySelectorAll('.ad[data-k]')].filter((el) => { const c = CTXS.get(el.dataset.k); return c && MEMO.get(c) && !MEMO.get(c).fontesProntas; });
  if (velhos.length) {
    const ctx0 = CTXS.get(velhos[0].dataset.k);
    carregarFontes(ctx0.marca.f, ctx0.marca.fontesExtras || []).then(() => {
      const refeitos = new Set();
      for (const el of velhos) {
        if (!el.isConnected) continue;
        const ctx = CTXS.get(el.dataset.k);
        if (!ctx) continue;
        if (!refeitos.has(ctx)) { MEMO.delete(ctx); refeitos.add(ctx); }
        const tmp = document.createElement('div');
        tmp.innerHTML = anuncioHTML(ctx, [+el.dataset.w, +el.dataset.h], el.dataset.i || '');
        const novo = tmp.firstElementChild;
        if (novo) el.replaceWith(novo);
      }
      ativarAnuncios(raiz);
    });
  }
  if (typeof MutationObserver === 'undefined') return;
  if (raiz.__adObs) raiz.__adObs.disconnect();
  const obs = new MutationObserver((ms) => {
    for (const m of ms) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const t = el && el.closest && el.closest('.ad-tit--rv');
      if (t) t.classList.add('ad-ia');
    }
  });
  raiz.querySelectorAll('.ad-tit-base[data-campo]').forEach((e) => obs.observe(e, { childList: true, characterData: true, subtree: true }));
  raiz.__adObs = obs;
}

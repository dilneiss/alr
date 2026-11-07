// AJUSTES LIVRES DE ESTILO → CSS de verdade, por peça (contrato: dev/CONTRATO-AJUSTES.md, seção 3).
// Um ajuste é { id, prop, pecas, elemento, valor, rotulo, comando, p } (o Jev escolhe, o código resolve os valores).
// Aqui cada ajuste vira CSS, na ordem da lista (o último vence), escopado ao contêiner da peça:
//   site     → <style id="ajustes"> no documento, depois de todo o CSS (preview, ampliado e download);
//   posts    → <style> escopado a .car / .car-amp (painel e ampliado);
//   email    → <style> escopado a .em-tpl (painel e ampliado) e no <head> do e-mail exportável;
//   anuncios → <style> escopado a .ad (painel, ampliado e kit exportável).
// Cor nunca entra às cegas: um fundo novo recalcula tinta, apoio, linhas, cartões e botões por contraste (texto
// ≥ 4,5:1 sobre TODAS as cores do fundo). No site, o degradê vertical é pintado em faixas, uma por bloco (topo,
// seções…), e cada faixa tem a sua tinta: o texto pode ser claro no verde do alto e escuro no branco do fim.
// Carrosséis, e-mail e anúncios já têm motores de cor próprios (esquema por lâmina, tokens do e-mail, esquema do
// banner): o fundo e a cor do texto entram por eles, com as funções daqui (resolverAjustes, fundoDe, tintaPara,
// ajustarContraste…), e o CSS daqui cuida do resto (caixa, peso, espaço, itálico, alinhamento, sombra, tamanho).
import { mix, contraste, lum, rgba, hexRgb, rgbHex, tokens as tokensPaleta } from './util.mjs';

export const PECAS = ['site', 'posts', 'email', 'anuncios'];
const PROPS = new Set(['fundo', 'caixa', 'tamanho', 'peso', 'espaco', 'cor_texto', 'sombra', 'italico', 'alinhamento']);
const ELEMENTOS = new Set(['pagina', 'topo', 'secoes', 'cartoes', 'botoes', 'titulos', 'textos', 'menu', 'rodape', 'tudo']);
const VALORES = {
  caixa: ['maiusculas', 'minusculas', 'capitalizada', 'normal'], peso: ['negrito', 'fino'], espaco: ['amplo', 'junto'],
  sombra: ['com', 'sem'], italico: ['sim', 'nao'], alinhamento: ['centro', 'esquerda'],
};
const TRANSFORM = { maiusculas: 'uppercase', minusculas: 'lowercase', capitalizada: 'capitalize', normal: 'none' };

// ------------------------------------------------------------------ normalizar e resolver
export function hexNorm(c) {
  if (typeof c !== 'string') return null;
  let s = c.trim().toLowerCase();
  const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(s);
  if (m) s = rgbHex(+m[1], +m[2], +m[3]);
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s.slice(1).split('').map((x) => x + x).join('');
  if (/^#[0-9a-f]{8}$/.test(s)) s = s.slice(0, 7);
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

// um ajuste bem formado (ou null): valores dentro do esquema, cores em #hex, "pagina" = "tudo" nas props de texto
export function normalizarAjuste(a) {
  if (!a || typeof a !== 'object' || !PROPS.has(a.prop)) return null;
  let elemento = ELEMENTOS.has(a.elemento) ? a.elemento : 'tudo';
  const pecas = (Array.isArray(a.pecas) ? a.pecas : [a.pecas]).filter((p) => PECAS.includes(p));
  let valor = a.valor;
  if (a.prop === 'fundo') {
    const v = valor && typeof valor === 'object' ? valor : hexNorm(valor) ? { tipo: 'solida', cores: [valor] } : null;
    if (!v) return null;
    const cores = (Array.isArray(v.cores) ? v.cores : []).map(hexNorm).filter(Boolean).slice(0, 3);
    let tipo = ['solida', 'degrade', 'escurecer', 'clarear'].includes(v.tipo) ? v.tipo : cores.length > 1 ? 'degrade' : 'solida';
    if ((tipo === 'solida' || tipo === 'degrade') && !cores.length) return null;
    if (tipo === 'solida') cores.length = 1;
    const direcao = ['vertical', 'horizontal', 'diagonal', 'radial'].includes(v.direcao) ? v.direcao : 'vertical';
    valor = { tipo, cores, direcao };
    if (elemento === 'tudo') elemento = 'pagina';
  } else {
    if (elemento === 'pagina') elemento = 'tudo';
    if (a.prop === 'tamanho') {
      const f = Number(valor);
      if (!Number.isFinite(f) || f <= 0) return null;
      valor = Math.round(Math.min(1.45, Math.max(0.7, f)) * 1000) / 1000;
    } else if (a.prop === 'cor_texto') {
      if (valor !== 'claro' && valor !== 'escuro') {
        const c = hexNorm(valor && typeof valor === 'object' ? valor.cor : valor);
        if (!c) return null;
        valor = { cor: c };
      }
    } else if (!VALORES[a.prop].includes(valor)) return null;
  }
  return { prop: a.prop, elemento, valor, pecas, id: a.id || `${a.prop}|${pecas.join('+')}|${elemento}`, rotulo: a.rotulo || '' };
}

// os ajustes (normalizados) que valem para a peça, na ordem da lista
export function ajustesDa(ajustes, peca) {
  return (Array.isArray(ajustes) ? ajustes : []).map(normalizarAjuste).filter((a) => a && (!peca || a.pecas.includes(peca)));
}

const geral = (prop, el) => (prop === 'fundo' ? el === 'pagina' : el === 'tudo');
// { prop: [{ elemento, valor }] } com o último vencendo: o mesmo elemento substitui o anterior; um ajuste geral
// ("tudo"; no fundo, "pagina") apaga os específicos anteriores daquela prop (no fundo, só topo e seções, que ele cobre).
// Ordem de saída: o geral primeiro e os específicos depois, na ordem em que chegaram (o CSS depois vence).
export function resolverAjustes(ajustes, peca) {
  const out = {};
  for (const a of ajustesDa(ajustes, peca)) {
    const L = (out[a.prop] = out[a.prop] || []);
    const g = geral(a.prop, a.elemento);
    for (let i = L.length - 1; i >= 0; i--) {
      const e = L[i].elemento;
      if (e === a.elemento || (g && (a.prop !== 'fundo' || e === 'topo' || e === 'secoes'))) L.splice(i, 1);
    }
    L.push({ elemento: a.elemento, valor: a.valor });
  }
  for (const k of Object.keys(out)) out[k].sort((x, y) => geral(k, y.elemento) - geral(k, x.elemento));
  return out;
}
// valor final de uma prop para um elemento (considerando "tudo"); null se nada pedido
export function valorPara(res, prop, ...elementos) {
  const L = res[prop] || [];
  let v = null;
  for (const it of L) if (elementos.includes(it.elemento) || geral(prop, it.elemento)) v = it.valor;
  return v;
}

// ------------------------------------------------------------------ cor
const crMin = (x, bgs) => Math.min(...bgs.map((b) => contraste(x, b)));
export function mediaCor(cores) {
  const rs = cores.map(hexRgb);
  return rgbHex(...[0, 1, 2].map((j) => rs.reduce((s, r) => s + r[j], 0) / rs.length));
}
// pontos ao longo do degradê (a mistura linear pode escurecer no meio: vermelho + verde passa por oliva)
export function amostras(cores, n = 5) {
  if (cores.length < 2) return cores.slice();
  const out = [];
  for (let i = 0; i < cores.length - 1; i++) for (let k = i ? 1 : 0; k < n; k++) out.push(mix(cores[i], cores[i + 1], k / (n - 1)));
  return out;
}
export function corNoDegrade(cores, f) {
  if (cores.length < 2) return cores[0];
  const t = Math.max(0, Math.min(1, f)) * (cores.length - 1), i = Math.min(cores.length - 2, Math.floor(t));
  return mix(cores[i], cores[i + 1], t - i);
}
// cor de texto legível sobre todas as cores do fundo: primeiro as preferidas (tinta da marca), depois neutros
// tingidos pelo próprio fundo (quase preto esverdeado no verde, quase branco no azul-marinho)
export function tintaPara(bgs, prefs = [], alvo = 7) {
  const m = mediaCor(bgs);
  const cands = [...prefs, mix(m, '#000000', 0.88), mix(m, '#ffffff', 0.94), '#111111', '#ffffff'].filter((x) => hexNorm(x));
  for (const a of [alvo, 4.5]) { const ok = cands.find((x) => crMin(x, bgs) >= a); if (ok) return ok; }
  return cands.reduce((b, x) => (crMin(x, bgs) > crMin(b, bgs) ? x : b));
}
// aproxima a cor do preto ou do branco (o que der contraste) até passar do alvo, mantendo o matiz
export function ajustarContraste(cor, bgs, alvo = 4.5) {
  if (crMin(cor, bgs) >= alvo) return cor;
  const cands = [];
  for (const destino of ['#000000', '#ffffff']) for (let t = 0.06; t <= 1.0001; t += 0.06) cands.push(mix(cor, destino, t));
  const ok = cands.filter((x) => crMin(x, bgs) >= alvo);
  if (ok.length) return ok.reduce((b, x) => (dist(x, cor) < dist(b, cor) ? x : b));
  return tintaPara(bgs);
}
const dist = (a, b) => { const A = hexRgb(a), B = hexRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
// texto de apoio: a tinta puxada para o fundo enquanto ainda passa de 4,6:1
function apoio(ink, bgs) {
  const m = mediaCor(bgs);
  for (let t = 0.42; t > 0.01; t -= 0.04) { const x = mix(ink, m, t); if (crMin(x, bgs) >= 4.6) return x; }
  return ink;
}
// degradê em que nenhum texto passa de 4,5:1 nas duas pontas: aproxima as pontas do lado que exige menos mudança
// (usado onde o texto atravessa o degradê inteiro: lâmina, banner, seção; no site, as faixas dispensam isto)
export function suavizar(cores, alvo = 4.5) {
  const amo = amostras(cores);
  if (crMin('#141414', amo) >= alvo || crMin('#ffffff', amo) >= alvo) return cores.slice();
  const opcoes = [['#141414', '#ffffff'], ['#ffffff', '#000000']].map(([tinta, destino]) => {
    const cs = cores.map((c) => { let x = c; for (let k = 0; k < 30 && contraste(x, tinta) < alvo + 0.2; k++) x = mix(x, destino, 0.06); return x; });
    return { cs, custo: cs.reduce((s, x, i) => s + dist(x, cores[i]), 0) };
  });
  return (opcoes[0].custo <= opcoes[1].custo ? opcoes[0] : opcoes[1]).cs;
}
// escurecer / clarear um fundo existente (um passo que se vê, sem virar outra paleta)
export function tonalizar(base, tipo, tinta = null) {
  const l = lum(base);
  // fundo claro escurece puxando para a tinta da marca (papel creme vira kraft, não cinza)
  if (tipo === 'escurecer') return l > 0.45 ? mix(base, tinta && lum(tinta) < 0.1 ? tinta : mix(base, '#000000', 0.8), 0.2) : l > 0.1 ? mix(base, '#000000', 0.34) : mix(base, '#000000', 0.5);
  return l < 0.05 ? mix(base, '#ffffff', 0.13) : l < 0.3 ? mix(base, '#ffffff', 0.32) : mix(base, '#ffffff', 0.62);
}
export function gradiente(cores, direcao = 'vertical') {
  const lista = cores.join(', ');
  if (direcao === 'radial') return `radial-gradient(120% 120% at 50% 12%, ${lista})`;
  return `linear-gradient(${{ horizontal: '90deg', diagonal: '135deg' }[direcao] || '180deg'}, ${lista})`;
}
// o fundo pedido sobre uma base: { css, cores (paradas, para o contraste), solida (cor única ou null), direcao }
export function fundoDe(valor, base = '#ffffff', tinta = null) {
  if (!valor) return null;
  if (valor.tipo === 'escurecer' || valor.tipo === 'clarear') { const x = tonalizar(hexNorm(base) || '#ffffff', valor.tipo, hexNorm(tinta)); return { css: x, cores: [x], solida: x, direcao: valor.direcao }; }
  const cores = (valor.cores || []).map(hexNorm).filter(Boolean);
  if (!cores.length) return null;
  if (valor.tipo !== 'degrade') return { css: cores[0], cores: [cores[0]], solida: cores[0], direcao: valor.direcao };
  const cs = cores.length > 1 ? cores : [cores[0], mix(cores[0], lum(cores[0]) > 0.5 ? '#000000' : '#ffffff', 0.72)];
  return { css: gradiente(cs, valor.direcao), cores: cs, solida: null, direcao: valor.direcao || 'vertical' };
}

// ------------------------------------------------------------------ tema do site sobre um fundo novo
// c = cores da marca (tokens da paleta). bgs = as cores do fundo (1 = sólido; várias = amostras de um degradê).
// cartao: a cor dos cartões (no sólido, o próprio fundo, com borda; no degradê, um tom claro/escuro do meio).
function tema(bgs, c, { cartao = null } = {}) {
  const m = mediaCor(bgs), escuroF = lum(m) < 0.2;
  const card = cartao || (bgs.length === 1 ? bgs[0] : escuroF ? mix(m, '#ffffff', 0.1) : mix(m, '#ffffff', 0.74));
  const todos = [...bgs, card];
  const ink = tintaPara(todos, [c.ink, c.bg]);
  const muted = apoio(ink, todos);
  const surf = escuroF ? mix(card, '#ffffff', 0.06) : mix(card, ink, 0.045);
  const T = tokensPaleta({ c: { bg: card, surf, ink, muted, pri: c.pri, sec: c.sec, acc: c.acc } });
  T.onPri = c.onPri; T.onSec = c.onSec; T.onAcc = c.onAcc; // os botões continuam os da marca
  // a cor da marca como TEXTO (sobrelinhas de 12 px, preços, números): a primeira que passa de 4,5:1; se precisar
  // escurecer demais (vira outra cor), fica a tinta
  const ajustada = ajustarContraste(c.pri, todos, 4.5);
  T.priTxt = [c.pri, c.acc, c.priTxt].find((x) => x && crMin(x, todos) >= 4.5) || (dist(ajustada, c.pri) < 90 ? ajustada : ink);
  T.secTxt = [c.sec, c.pri, c.acc].find((x) => x && crMin(x, todos) >= 4.5) || T.priTxt;
  T.acc2 = crMin(c.acc, todos) >= 1.9 ? c.acc : T.priTxt;
  T.sh = escuroF ? 'rgba(0,0,0,.7)' : rgba(mix(ink, '#000000', 0.4), 0.3);
  T.grade = escuroF ? 'rgba(255,255,255,.05)' : rgba(ink, 0.055);
  T.line = rgba(ink, escuroF ? 0.16 : 0.13);
  T.dark = escuroF;
  T.bgs = todos;
  T.pagina = bgs.length === 1 ? bgs[0] : m;
  // a cor principal some no fundo (verde da marca num fundo verde)? os botões passam para a tinta
  T.btnSome = some(c.pri, bgs);
  if (T.dark && contraste(T.deep, T.pagina) < 1.25) T.deep = mix(T.pagina, '#ffffff', 0.09);
  if (!T.dark && contraste(T.deep, T.pagina) < 3) T.deep = mix(ink, c.pri, 0.25);
  T.onDeep = contraste(T.deep, '#ffffff') >= 4.5 ? '#ffffff' : tintaPara([T.deep], [c.bg, c.ink]);
  T.numCor = [c.pri, c.acc, c.sec, T.priTxt].find((x) => contraste(x, T.deep) >= 3.2) || T.onDeep;
  T.cine = escuroF ? mix(T.pagina, '#000000', 0.25) : mix(ink, '#000000', 0.35);
  T.priCine = [c.pri, c.acc, c.sec, T.priTxt].find((x) => contraste(x, T.cine) >= 4.5) || '#ffffff';
  return T;
}
// uma cor "some" num fundo quando falta contraste de luz E de matiz (vermelho no verde continua visível)
const some = (cor, bgs) => bgs.some((b) => contraste(cor, b) < 1.6 && dist(cor, b) < 120);
const VARS_ZONA = ['bg', 'surf', 'ink', 'muted', 'line', 'soft', 'soft2', 'priTxt', 'secTxt', 'acc2', 'sh', 'grade'];
const VARS_RAIZ = [...VARS_ZONA, 'deep', 'onDeep', 'numCor', 'cine', 'priCine'];
const varsDe = (T, lista = VARS_ZONA) => lista.map((k) => `--${k}:${T[k]}`).join(';');

// o que o documento do site precisa saber (vem do ctx ou do próprio documento, no iframe)
const BLOCOS_FIM = new Set(['cta', 'rodape']);
function infoSite(ctx) {
  if (!ctx) return null;
  if (ctx.marca && ctx.site) {
    return { c: ctx.marca.cores, hero: ctx.site.hero, apos: [...(ctx.site.secoes || []), 'cta', 'rodape'], dcase: !!ctx.marca.f.caixa, dtr: parseFloat(ctx.marca.f.tr) || 0, textura: ctx.site.textura };
  }
  return ctx.c && ctx.c.bg ? ctx : null;
}
// lê a paleta do <style id="vars"> e os blocos do corpo (é o que o iframe do estúdio tem)
export function infoDoDocumento(doc) {
  const txt = (doc.getElementById('vars') || {}).textContent || '';
  const v = (k) => { const m = new RegExp(`--${k}:([^;}]+)`).exec(txt); return m ? m[1].trim() : null; };
  const c = {};
  for (const k of ['bg', 'surf', 'ink', 'muted', 'pri', 'sec', 'acc', 'onPri', 'onSec', 'onAcc', 'soft', 'soft2', 'deep', 'onDeep', 'priTxt', 'secTxt']) c[k] = hexNorm(v(k)) || v(k);
  if (!hexNorm(c.bg)) return null;
  c.dark = lum(c.bg) < 0.22;
  const cls = doc.body ? doc.body.className : '';
  const ids = doc.body ? [...doc.body.children].map((e) => e.getAttribute('data-bloco')).filter(Boolean) : [];
  const i = ids.indexOf('hero');
  return { c, hero: (/\bh-([a-z]+)/.exec(cls) || [])[1] || 'split', apos: i >= 0 ? ids.slice(i + 1) : [], dcase: v('dcase') === 'uppercase', dtr: parseFloat(v('dtr')) || 0, textura: (/\btx-([a-z]+)/.exec(cls) || [])[1] || 'lisa' };
}

// cor que o fundo do topo do site passa a ter (o topo cinematográfico redesenha a cena com ela); null = sem ajuste
export function corDoTopo(ctx) {
  const res = resolverAjustes(ctx && ctx.ajustes, 'site');
  let cor = null;
  const c = ctx.marca.cores;
  for (const { elemento, valor } of res.fundo || []) {
    if (elemento !== 'pagina' && elemento !== 'topo') continue;
    const base = elemento === 'topo' ? mix(c.dark ? c.bg : c.ink, '#000000', c.dark ? 0.25 : 0.35) : c.bg;
    const F = fundoDe(valor, base, c.ink);
    if (F) cor = F.solida || (elemento === 'pagina' && F.direcao === 'vertical' ? F.cores[0] : mediaCor(amostras(suavizar(F.cores))));
  }
  return cor;
}

// ------------------------------------------------------------------ SITE
const W = (s) => `:where(${s})`;
const EXCLUI = 'input,textarea,select,option,svg,svg *,.marca,.marca *';
const SITE = {
  regiao: {
    topo: '.hero', secoes: '.sec', menu: '.nav', rodape: '.rodape',
    cartoes: '.card,.hf-card,.cupom,.chip,.flt,.etq,.t-txt,.t-item,.entrega-chip,.gal-rot,.cal-toast,.adesivo,.nav-gaveta',
  },
  titulos: 'h1,h2,h3,h4,.rod-slogan,.hf-card>b,.faq-ajuda>b,.depo-dest blockquote,.letreiro-in span,.ad-leg p',
  gigantes: '.rod-gigante,.hcn-nome',
  textos: 'p,li,dd,dt,blockquote,figcaption,summary,label,small,.lead,.eyebrow,.kicker,.selo,.tag,.sec-n,.serv-n,.plano-n,.faq-n,.num-i,.he-num,.nav-links a,.he-sum a,.he-sum b,.to-in,.to-cupom,.gal-rot,.adesivo,.prova,.cta-contato,.copy,.chip small,.flt small,.etq small,.etq b,.cal-top b,.cal-mes,.dia,.hora,.num span,.hm-fato span,.li span,.ad-rot,.ad-dica,.hcn-cred,.gal-bast,.lead-nota,.faixa-info,.menu-nota,.entrega-chip,.cal-toast,.plano-preco .suf,.depo figcaption,.nav-gaveta a,.letreiro-in b',
  rotulos: '.kicker,.eyebrow,.tag,.sec-n,.serv-n,.plano-n,.faq-n,.num-i,.he-num,.ad-rot,.hcn-cred,.cal-mes,.li small,.rod h4,.he-sum b,.to-cupom,.adesivo small,.etq small,.cal-top small,.hf-card label,.ad-leg span',
  // o que cresce com "tamanho": títulos e textos folha (sem aninhar zoom sobre zoom)
  titulosZ: 'h1,h2,h3,.rod-slogan,.hf-card>b,.faq-ajuda>b,.depo-dest blockquote',
  textosZ: 'p:not(.rod-slogan),li:not(:has(h1,h2,h3,h4,p,.btn,figure,a.serv)),dd,dt,blockquote:not(.depo-dest blockquote),figcaption:not(:has(h1,h2,h3)),summary,label,.selo,.tag,.eyebrow,.kicker,.nav-links,.he-sum,.cta-contato,.copy,.lead-nota,.faixa-info,.menu-nota,.ad-dica,.gal-rot',
  textosZbase: 'p,li,dd,dt,blockquote,figcaption,summary,label,.selo,.tag,.eyebrow,.kicker,.nav-links,.he-sum,.cta-contato,.copy,.lead-nota,.faixa-info,.menu-nota,.ad-dica,.gal-rot',
  // fundos próprios onde a cor de texto da página não entra (a não ser que a região seja pedida)
  bandas: ['.hero-central', '.hero-cinema', '.sec-numeros', '.cta-final', '.rodape', '.plano.dest', '.depo-dest', '.t-item', '.letreiro', '.topo-oferta', '.btn', '.tag', '.hf-palco', '.cal-toast', '.adesivo', '.gal-bast', '.g4 figcaption', '.ad-rot', '.dia.on', '.chip-ic', '.flt-ic', '.avs', '.giro'],
};
// seletores de um tipo (titulos/textos/botoes) dentro de uma região (ou em tudo)
function alvoSite(elemento, { descendentes = true } = {}) {
  const semEx = `:not(${W(EXCLUI)})`;
  if (elemento === 'tudo') return `${W('body,body *')}${semEx}`;
  if (SITE.regiao[elemento]) { const r = SITE.regiao[elemento]; return `${W(`${r.split(',').join(',')},${r.split(',').map((x) => `${x} *`).join(',')}`)}${semEx}`; }
  if (elemento === 'titulos') return `${W(`${SITE.titulos},${SITE.gigantes}${descendentes ? ',' + SITE.titulos.split(',').map((x) => `${x} *`).join(',') : ''}`)}${semEx}`;
  if (elemento === 'textos') return `${W(`${SITE.textos}${descendentes ? ',' + SITE.textos.split(',').map((x) => `${x} *`).join(',') : ''}`)}:not(${W('h1 *,h2 *,h3 *,h4 *,.btn,.btn *')})${semEx}`;
  if (elemento === 'botoes') return `${W('.btn,.btn *')}${semEx}`;
  return null;
}
// alvos do "tamanho" (zoom só em folhas: nada de zoom sobre zoom)
function alvosZoom(elemento) {
  const tit = SITE.titulosZ, txt = `${W(SITE.textosZ)}:not(${W(`${SITE.textosZbase.split(',').map((x) => `${x} *`).join(',')},h1 *,h2 *,h3 *,.btn *`)})`;
  const r = SITE.regiao[elemento];
  if (elemento === 'titulos') return [W(tit)];
  if (elemento === 'textos') return [txt];
  if (elemento === 'botoes') return [W('.btn')];
  if (elemento === 'tudo') return [W(tit), txt, W('.btn')];
  if (elemento === 'menu') return [W('.nav-in')];
  if (elemento === 'rodape') return [W('.rodape>.wrap')];
  if (r) return [`${W(r)} ${W(tit)}`, `${W(r)} ${txt}`, `${W(r)} ${W('.btn')}`];
  return [];
}

function cssSite(res, I) {
  const c = I.c, out = [];
  folgaFeita = false;
  // zonas de texto: onde está cada fundo (a primeira é a página); bandas: fundos próprios que ficam como estão
  const E = { zonas: [{ sel: 'body', T: null, bgs: [c.bg], cartao: c.bg }], bandas: new Set(SITE.bandas), seguem: false };
  const temaBase = { ...c, bgs: [c.bg], pagina: c.bg };
  E.zonas[0].T = temaBase;

  for (const { elemento, valor } of res.fundo || []) {
    if (elemento === 'pagina') fundoPaginaSite(valor, I, out, E);
    else if (elemento === 'topo') fundoRegiaoSite('topo', valor, I, out, E);
    else if (elemento === 'secoes') fundoSecoesSite(valor, I, out, E);
    else if (elemento === 'cartoes') fundoRegiaoSite('cartoes', valor, I, out, E);
    else if (elemento === 'menu') fundoRegiaoSite('menu', valor, I, out, E);
    else if (elemento === 'rodape') fundoRodapeSite(valor, I, out, E);
    else if (elemento === 'botoes') fundoBotoesSite(valor, I, out, E);
    else if (elemento === 'titulos' || elemento === 'textos') fundoPlacaSite(elemento, valor, I, out, E);
  }
  const naoBanda = () => `:not(${W([...E.bandas].map((b) => `${b},${b} *`).join(','))})`;

  // cor do texto: validada contra o fundo de cada zona (o texto continua legível)
  const TODO_TEXTO = `${SITE.titulos},${SITE.textos},a:not(.btn),span,b,strong,em`;
  for (const { elemento, valor } of res.cor_texto || []) {
    if (elemento === 'botoes') {
      const bgs = E.botoes || [c.pri];
      out.push(`${W('.btn:not(.fantasma),.btn:not(.fantasma) *')}{color:${corTexto(valor, bgs, 4.5)}!important}`);
      continue;
    }
    const regiao = SITE.regiao[elemento];
    const zonas = regiao ? (E.zonas.filter((z) => z.regiao === elemento).length ? E.zonas.filter((z) => z.regiao === elemento) : [{ ...E.zonas[0], sel: `body ${regiao.split(',').join(',body ')}` }]) : E.zonas;
    for (const z of zonas) {
      const bgs = z.T.bgs || [z.T.pagina];
      const cor = corTexto(valor, bgs, elemento === 'titulos' ? 3.2 : 4.5);
      const escopo = W(z.sel);
      const tipo = elemento === 'titulos' ? SITE.titulos : elemento === 'textos' ? SITE.textos : TODO_TEXTO;
      const nb = `${regiao ? '' : naoBanda()}:not(${W(EXCLUI)})`; // o logo (identidade) e as cenas não mudam de cor
      out.push(`${elemento === 'tudo' || regiao ? `${escopo}${nb},` : ''}${escopo} ${W(tipo)}${nb}{color:${cor}!important}`);
      // o texto de apoio acompanha (um passo na direção do fundo, sem perder o contraste)
      if (elemento !== 'titulos') out.push(`${escopo}{--muted:${apoio(cor, bgs)}!important}`);
    }
  }

  // caixa (maiúsculas…): todos os textos do alvo, inclusive os que têm text-transform próprio; formulários fora
  for (const { elemento, valor } of res.caixa || []) {
    const sel = alvoSite(elemento);
    if (!sel) continue;
    const up = valor === 'maiusculas';
    out.push(`${sel}{text-transform:${TRANSFORM[valor]}!important}`);
    // o logo e as ilustrações não herdam (o logo tem a caixa decidida na identidade; a cena é "foto")
    if (elemento === 'tudo' || elemento === 'menu' || elemento === 'rodape') out.push(`${W('.marca,svg')}{text-transform:none!important}`);
    if (up || valor === 'capitalizada') out.push(...folgaTexto());
    if (up) {
      // caixa alta pede um respiro entre as letras e nunca pode estourar a coluna no celular
      const pre = SITE.regiao[elemento] ? `${W(SITE.regiao[elemento])} ` : '';
      if (elemento !== 'textos' && elemento !== 'botoes') out.push(`${pre}${W(SITE.titulos)}{letter-spacing:${Math.max(I.dtr || 0, 0.004)}em!important;overflow-wrap:break-word}`);
      if (elemento !== 'titulos' && elemento !== 'botoes') out.push(`${pre}${W('p,li,.lead,blockquote,summary,dd,.selo')}:not(${W(SITE.rotulos)}){letter-spacing:.018em!important}`);
    }
  }

  // tamanho: zoom nas folhas de texto (o layout reflui); no celular, metade do aumento
  for (const { elemento, valor } of res.tamanho || []) {
    const alvos = alvosZoom(elemento);
    if (!alvos.length) continue;
    if (valor > 1) out.push(...folgaTexto());
    out.push(`${alvos.join(',')}{zoom:${valor}!important}`);
    if (valor > 1) out.push(`@media (max-width:640px){${alvos.join(',')}{zoom:${Math.round((1 + (valor - 1) * 0.5) * 1000) / 1000}!important}}`);
    if (valor > 1 && (elemento === 'titulos' || elemento === 'tudo' || elemento === 'topo')) out.push(`${W('h1,h2,h3')}{overflow-wrap:break-word}`);
  }

  // peso
  for (const { elemento, valor } of res.peso || []) {
    const neg = valor === 'negrito';
    const tit = neg ? 800 : 300, txt = neg ? 700 : 300, btn = neg ? 800 : 500;
    if (elemento === 'titulos' || elemento === 'tudo' || SITE.regiao[elemento]) {
      const pre = SITE.regiao[elemento] ? `${W(SITE.regiao[elemento])} ` : '';
      out.push(`${pre}${W(`${SITE.titulos},${SITE.gigantes},${SITE.titulos.split(',').map((x) => `${x} *`).join(',')}`)}{font-weight:${tit}!important}`);
      if (elemento !== 'titulos') {
        out.push(`${pre}${alvoSite('textos')}{font-weight:${txt}!important}`);
        out.push(`${pre}${W('.btn,.btn *')}{font-weight:${btn}!important}`);
      }
    } else if (elemento === 'textos') out.push(`${alvoSite('textos')}{font-weight:${txt}!important}`);
    else if (elemento === 'botoes') out.push(`${W('.btn,.btn *')}{font-weight:${btn}!important}`);
  }

  // espaço entre letras (os rótulos já espaçados não encolhem no "amplo")
  for (const { elemento, valor } of res.espaco || []) {
    const amplo = valor === 'amplo';
    const pre = SITE.regiao[elemento] ? `${W(SITE.regiao[elemento])} ` : '';
    const semRot = `:not(${W(SITE.rotulos)})`;
    if (elemento !== 'textos' && elemento !== 'botoes') out.push(`${pre}${W(`${SITE.titulos},${SITE.gigantes}`)}{letter-spacing:${amplo ? '.06em' : '-.035em'}!important}`);
    if (elemento !== 'titulos' && elemento !== 'botoes') {
      out.push(`${pre}${W(SITE.textos)}${semRot}:not(${W('h1 *,h2 *,h3 *')}){letter-spacing:${amplo ? '.05em' : '-.012em'}!important}`);
      if (!amplo) out.push(`${pre}${W(SITE.rotulos)}{letter-spacing:.07em!important}`);
    }
    if (elemento === 'botoes' || elemento === 'tudo' || SITE.regiao[elemento]) out.push(`${pre}${W('.btn')}{letter-spacing:${amplo ? '.08em' : '-.01em'}!important}`);
  }

  // itálico
  for (const { elemento, valor } of res.italico || []) {
    const sel = alvoSite(elemento);
    if (sel) out.push(`${sel}{font-style:${valor === 'sim' ? 'italic' : 'normal'}!important}`);
  }

  // alinhamento: texto e as linhas flexíveis (botões, selos, cabeçalhos de seção) acompanham
  for (const { elemento, valor } of res.alinhamento || []) out.push(...alinhamentoSite(elemento, valor));

  // sombra
  for (const { elemento, valor } of res.sombra || []) out.push(...sombraSite(elemento, valor, E));

  return out.join('\n');
}

// texto mais largo (caixa alta, letras maiores): as colunas podem encolher e as linhas quebrar, sem rolagem lateral
let folgaFeita = false;
function folgaTexto() {
  if (folgaFeita) return [];
  folgaFeita = true;
  return [`${W('.menu,.servs-wrap,.faq-wrap,.agenda,.sobre,.entrega,.local,.hs,.hk,.hl,.hf,.depos,.he-grid,.rod,.planos,.time,.menu-lista,.cupom,.passos,.hmo')}>*{min-width:0}`,
    `${W('.prato-top')}{flex-wrap:wrap}`, `${W('.prato-top h3')}{min-width:0}`,
    `${W('h1,h2,h3,h4,.rod-slogan,.lead,p,li,summary,.selo,.tag,.btn')}{overflow-wrap:break-word}`,
    `${W('.serv')}>*{min-width:0}`, `${W('.acoes .btn,.nav-gaveta .btn')}{white-space:normal;text-align:center}`];
}

// cor de texto pedida → cor final legível sobre as cores do fundo
export function corTextoPara(valor, bgs, alvo = 4.5) { return corTexto(valor, bgs, alvo); }
export function apoioPara(ink, bgs) { return apoio(ink, bgs); }
function corTexto(valor, bgs, alvo = 4.5) {
  if (valor === 'claro' || valor === 'escuro') {
    // "claro": quase branco (tingido pelo fundo) se for legível; num fundo claro, o mais claro que ainda passa do alvo.
    // "escuro": o mesmo, na outra ponta
    const x = mix(mediaCor(bgs), valor === 'claro' ? '#ffffff' : '#000000', valor === 'claro' ? 0.93 : 0.9);
    return ajustarContraste(x, bgs, alvo);
  }
  return ajustarContraste(valor.cor, bgs, alvo);
}

// ---------- fundo da página (e "tudo")
function fundoPaginaSite(v, I, out, E) {
  const c = I.c;
  const F = fundoDe(v, c.bg, c.ink);
  if (!F) return;
  const heroProprio = ['central', 'cinema', 'formulario'].includes(I.hero);
  E.bandas.delete('.hero-central'); E.bandas.delete('.hero-cinema');
  if (F.solida) {
    const T = tema([F.solida], c);
    out.push(`html:root{${varsDe(T, VARS_RAIZ)}}`);
    out.push(`${W('body')}{background:${F.solida}!important;color:${T.ink}!important}`);
    out.push(...espelharClaroEscuro(T.dark));
    out.push(...botaoSeSumir('body', T));
    if (heroProprio) out.push(...heroSegue(I.hero, 'transparent', T));
    E.zonas = [{ sel: 'body', T }];
    return;
  }
  // degradê
  E.seguem = true;
  out.push(`${W('body')}{--dh:0px!important}`, `${W('.sec.alt')}::before,${W('.sec.alt')}::after{display:none!important}`);
  if (F.direcao !== 'vertical') {
    // horizontal / diagonal / radial: o degradê inteiro atrás de tudo; uma tinta só (as pontas são suavizadas
    // se nenhuma tinta passar nas duas)
    const cores = suavizar(F.cores);
    const bgs = amostras(cores);
    const T = tema(bgs, c);
    const fixo = F.direcao === 'horizontal' ? '' : ' fixed';
    out.push(`html:root{${varsDe(T, VARS_RAIZ)}}`);
    out.push(`${W('body')}{background:${cores[0]} ${gradiente(cores, F.direcao)}${fixo}!important;color:${T.ink}!important}`);
    out.push(`${W('.sec:not(.sec-numeros),.hero-form,.hero-central,.hero-cinema')}{background:transparent!important}`);
    out.push(`${W('.nav')}{background:${rgba(cores[0], 0.82)}!important}`);
    out.push(...espelharClaroEscuro(T.dark));
    out.push(...botaoSeSumir('body', T));
    if (heroProprio) out.push(...heroSegue(I.hero, 'transparent', T));
    E.zonas = [{ sel: 'body', T }];
    return;
  }
  // vertical: uma faixa por bloco, cada uma com a sua tinta (o degradê atravessa a página do topo ao fim)
  const cores = F.cores;
  const secs = (I.apos || []).filter((id) => !BLOCOS_FIM.has(id));
  const N = secs.length || 6;
  const cinema = I.hero === 'cinema';
  const h = cinema ? 0 : Math.min(0.4, Math.max(0.22, 2.8 / (2.8 + N)));
  const pesos = (secs.length ? secs : Array.from({ length: 6 }, () => 's')).map((id) => (id === 'numeros' ? 0.5 : 1));
  const total = pesos.reduce((s, x) => s + x, 0) || 1;
  const cor = (f) => corNoDegrade(cores, f);
  const Tmeio = tema(amostras(cores), c);
  out.push(`html:root{${varsDe(Tmeio, VARS_RAIZ)}}`);
  out.push(`${W('body')}{background:${cores[0]} ${gradiente(cores, 'vertical')}!important;color:${Tmeio.ink}!important}`);
  const zona = (sel, bgsZona, pintura, regiao) => {
    const T = tema(bgsZona, c);
    out.push(`${W(sel)}{${varsDe(T)};background:${pintura}!important;color:var(--ink)!important}`);
    E.zonas.push({ sel, T, regiao });
    return T;
  };
  E.zonas = [{ sel: 'body', T: Tmeio }];
  // topo da página: faixa de oferta e menu na cor do começo
  const T0 = tema([cores[0]], c);
  out.push(`${W('[data-bloco="oferta"]>.topo-oferta,[data-bloco="nav"]>.nav')}{${varsDe(T0)};color:var(--ink)!important}`);
  out.push(`${W('[data-bloco="nav"]>.nav')}{background:${rgba(cores[0], 0.88)}!important}`);
  out.push(...espelharClaroEscuro(T0.dark, '[data-bloco="oferta"]>.topo-oferta'));
  E.zonas.push({ sel: '[data-bloco="nav"]>.nav', T: T0, regiao: 'menu' });
  // o topo (hero): do começo do degradê até h (o cinematográfico fica na cor do começo, com a cena redesenhada nela)
  const Th = zona('[data-bloco="hero"]>.hero', cinema ? [cores[0]] : [cores[0], cor(h / 2), cor(h)], cinema ? cores[0] : `linear-gradient(180deg, ${cores[0]}, ${cor(h)})`, 'topo');
  if (heroProprio) out.push(...heroSegue(I.hero, null, Th));
  // as seções depois do topo, na ordem do documento (por posição: continua certo se as seções mudarem de nome)
  let f = h;
  const tx = I.textura === 'pontos' ? 'radial-gradient(var(--line) 1.2px,transparent 1.4px) 0 0/22px 22px,' : I.textura === 'linhas' ? 'linear-gradient(var(--grade) 1px,transparent 1px) -1px -1px/48px 48px,linear-gradient(90deg,var(--grade) 1px,transparent 1px) -1px -1px/48px 48px,' : '';
  pesos.forEach((p, k) => {
    const f0 = f; f += ((1 - h) * p) / total;
    const sel = `[data-bloco="hero"]${' + [data-bloco]'.repeat(k + 1)}>.sec:not(.sec-numeros)`;
    zona(sel, [cor(f0), cor((f0 + f) / 2), cor(f)], `${tx}linear-gradient(180deg, ${cor(f0)}, ${cor(f)})`, 'secoes');
  });
  // o botão decide uma vez só, olhando o degradê inteiro (nada de botão que muda de cor no meio da página)
  if (some(c.pri, amostras(cores, 9))) out.push(...botaoSeSumir('body', { btnSome: true }));
}

// o topo "central" (cor principal), o "cinematográfico" (escuro) e o "com formulário" passam a mostrar o fundo novo
function heroSegue(tipo, fundo, T) {
  const L = [];
  const pint = fundo ? `background:${fundo}!important;` : '';
  if (tipo === 'central') {
    L.push(`${W('.hero-central')}{${pint}color:var(--ink)!important}`,
      `${W('.hero-central .kicker')}{color:var(--priTxt)!important}`,
      `${W('.hero-central .lead')}{color:var(--muted)!important;opacity:1!important}`,
      `${W('.hero-central h1')}{color:var(--ink)!important}`,
      `${W('.hc-fundo')}{background:none!important}`,
      `${W('.hero-central .selo')}{background:var(--soft)!important;color:var(--ink)!important;border-color:var(--line)!important}`,
      `${W('.hero-central .selo b,.hero-central .selo svg')}{color:var(--priTxt)!important}`,
      `${W('body .hero-central .btn.fantasma')}{color:var(--ink)!important;border-color:var(--line)!important}`,
      `${W('body:not(.btn-contorno):not(.btn-gradiente) .hero-central .btn:not(.fantasma)')}{background:var(--pri)!important;color:var(--onPri)!important;border-color:var(--pri)!important}`,
      `${W('body.btn-gradiente .hero-central .btn:not(.fantasma)')}{background:linear-gradient(120deg,var(--pri),var(--acc))!important;color:var(--onPri)!important;border-color:transparent!important}`,
      `${W('body.btn-contorno .hero-central .btn:not(.fantasma)')}{background:transparent!important;color:var(--priTxt)!important;border-color:var(--priTxt)!important}`,
      `${W('body.btn-bloco .hero-central .btn')}{border-color:var(--ink)!important;box-shadow:4px 4px 0 var(--ink)!important}`);
  } else if (tipo === 'cinema') {
    // sem o véu de cor: a cena some por máscara (serve para cor sólida e para degradê)
    const mascara = 'linear-gradient(90deg,transparent,rgba(0,0,0,.5) 16%,#000 57%),linear-gradient(0deg,transparent,#000 34%)';
    L.push(`${W('.hero-cinema')}{${pint}color:var(--ink)!important;--priCine:var(--priTxt)!important}`,
      `${W('.hero-cinema .hcn-veu')}{display:none!important}`,
      `${W('.hero-cinema .hcn-arte')}{-webkit-mask-image:${mascara};-webkit-mask-composite:source-in;mask-image:${mascara};mask-composite:intersect}`,
      `${W('.hero-cinema .hcn-nome')}{color:transparent!important;-webkit-text-stroke:2px ${rgba(T.ink, 0.09)}!important}`,
      `${W('.hero-cinema h1')}{color:var(--ink)!important}`,
      `${W('.hero-cinema .lead')}{color:var(--muted)!important}`,
      `${W('.hero-cinema .kicker')}{color:var(--priTxt)!important}`,
      `${W('.hero-cinema .hcn-cred')}{color:var(--muted)!important}`,
      `${W('.hero-cinema .selo')}{background:var(--soft)!important;color:var(--ink)!important;border-color:var(--line)!important}`,
      `${W('.hero-cinema .selo b,.hero-cinema .selo svg')}{color:var(--priTxt)!important}`,
      `${W('body .hero-cinema .btn.fantasma')}{color:var(--ink)!important;border-color:var(--line)!important}`,
      `${W('body.btn-bloco .hero-cinema .btn')}{border-color:var(--ink)!important;box-shadow:4px 4px 0 var(--ink)!important}`);
    if (!T.dark) L.push(`${W('.hero-cinema .hcn-luz')}{display:none!important}`);
  } else if (tipo === 'formulario') {
    if (fundo) L.push(`${W('.hero-form')}{${pint}}`);
  }
  return L;
}

// quando a cor principal some no fundo novo, os botões principais passam para a tinta (continuam botões)
function botaoSeSumir(sel, T) {
  if (!T.btnSome) return [];
  const z = sel === 'body' ? '' : `${W(sel)} `;
  const fora = `:not(${W('.cta-final *,.rodape *,.plano.dest *,.sec-numeros *,.t-item *,.letreiro *')})`;
  return [`${z}${W('.btn:not(.fantasma)')}${fora}{background:var(--ink)!important;border-color:var(--ink)!important;color:var(--bg)!important}`,
    `${z}${W('body.btn-contorno .btn:not(.fantasma)')}${fora}{background:transparent!important;color:var(--ink)!important;border-color:var(--ink)!important}`,
    `${z}${W('.checks li svg,.dia.on,.passo:last-child .passo-n,.chip-ic,.flt-ic,.cupom-ic,.hf-passos i:first-child')}${fora}{background:var(--ink)!important;color:var(--bg)!important;border-color:var(--ink)!important}`];
}

// a página ficou escura (ou clara) ao contrário da paleta: o que o CSS base decide por body.dark acompanha
function espelharClaroEscuro(escuroNovo, escopo = '') {
  const e = escopo ? `${W(escopo)}` : W('.topo-oferta');
  if (escuroNovo) return [`${e}{background:var(--pri)!important;color:var(--onPri)!important}`, `${W('.letreiro-in b,.letreiro-in i')}{color:var(--pri)!important}`];
  return [`${e}{background:var(--ink)!important;color:var(--bg)!important}`];
}

// ---------- fundo de uma região (topo, cartões, menu)
function fundoRegiaoSite(regiao, v, I, out, E) {
  const c = I.c;
  const base = regiao === 'topo' ? ({ central: c.pri, cinema: mix(c.dark ? c.bg : c.ink, '#000000', c.dark ? 0.25 : 0.35), formulario: c.soft }[I.hero] || c.bg) : c.bg;
  const F = fundoDe(v, base, c.ink);
  if (!F) return;
  const cores = F.solida ? [F.solida] : suavizar(F.cores);
  const bgs = amostras(cores);
  const T = tema(bgs, c);
  const pintura = F.solida || gradiente(cores, F.direcao);
  if (regiao === 'topo') {
    const sel = '[data-bloco="hero"]>.hero';
    out.push(`${W(sel)}{${varsDe(T)};background:${pintura}!important;color:var(--ink)!important}`);
    out.push(...heroSegue(I.hero, pintura, T), ...botaoSeSumir(sel, T));
    E.bandas.delete('.hero-central'); E.bandas.delete('.hero-cinema');
    E.zonas.push({ sel, T, regiao: 'topo' });
  } else if (regiao === 'cartoes') {
    const sel = '.card:not(.dest):not(.depo-dest),.hf-card,.cupom,.chip,.flt,.etq,.t-txt,.entrega-chip,.nav-gaveta';
    const Tc = F.solida ? tema([F.solida], c) : T;
    out.push(`${W(sel)}{${varsDe(Tc)};background:${pintura}!important;color:var(--ink)!important;border-color:${rgba(Tc.ink, 0.14)}!important}`);
    out.push(`${W('.cupom-esq')}::before,${W('.cupom-esq')}::after{background:var(--soft2)!important}`);
    out.push(...botaoSeSumir(sel, Tc));
    E.zonas.push({ sel, T: Tc, regiao: 'cartoes' });
  } else if (regiao === 'menu') {
    const sel = '.nav';
    out.push(`${W(sel)}{${varsDe(T)};background:${pintura}!important;color:var(--ink)!important;border-color:${rgba(T.ink, 0.12)}!important}`);
    out.push(`${W('.nav-links')}{color:var(--muted)!important}`, `${W('.nav .marca')}{color:var(--ink)!important}`);
    out.push(...botaoSeSumir(sel, T));
    E.zonas.push({ sel, T, regiao: 'menu' });
  }
}

// ---------- fundo das seções (o topo, o menu e o rodapé ficam)
function fundoSecoesSite(v, I, out, E) {
  const c = I.c;
  const F = fundoDe(v, c.bg, c.ink);
  if (!F) return;
  const sel = '.sec:not(.sec-numeros)';
  if (F.solida) {
    const T = tema([F.solida], c);
    out.push(`${W(sel)}{${varsDe(T)};color:var(--ink)!important}`, `${W('.sec:not(.sec-numeros):not(.alt)')}{background:${F.solida}!important}`);
    out.push(...botaoSeSumir(sel, T));
    E.zonas.push({ sel, T, regiao: 'secoes' });
    return;
  }
  const cores = suavizar(F.cores);
  const T = tema(amostras(cores), c);
  const ida = gradiente(cores, F.direcao);
  // vertical: as seções alternam o sentido, para as emendas baterem (verde→branco, branco→verde…)
  const volta = F.direcao === 'vertical' ? gradiente(cores.slice().reverse(), 'vertical') : ida;
  out.push(`${W(sel)}{${varsDe(T)};background:${ida}!important;color:var(--ink)!important}`, `${W('.sec.alt:not(.sec-numeros)')}{background:${volta}!important}`,
    `${W('.sec.alt')}::before,${W('.sec.alt')}::after{display:none!important}`);
  out.push(...botaoSeSumir(sel, T));
  E.zonas.push({ sel, T, regiao: 'secoes' });
}

// ---------- fundo do rodapé
function fundoRodapeSite(v, I, out, E) {
  const c = I.c;
  const F = fundoDe(v, c.deep);
  if (!F) return;
  const cores = F.solida ? [F.solida] : suavizar(F.cores);
  const bgs = amostras(cores);
  const ink = tintaPara(bgs, [c.onDeep, c.bg, c.ink]);
  const meio = mediaCor(bgs);
  out.push(`${W('.rodape')}{--deep:${meio};--onDeep:${ink};background:${F.solida || gradiente(cores, F.direcao)}!important;color:${ink}!important}`);
  if (!F.solida) out.push(`${W('.rod-gigante')}{color:transparent!important}`);
  E.bandas.delete('.rodape');
  E.zonas.push({ sel: '.rodape', T: { ...tema(bgs, c), ink, bgs }, regiao: 'rodape' });
}

// ---------- fundo dos botões
function fundoBotoesSite(v, I, out, E) {
  const c = I.c;
  const F = fundoDe(v, c.pri);
  if (!F) return;
  const cores = F.solida ? [F.solida] : suavizar(F.cores);
  const bgs = amostras(cores);
  const ink = tintaPara(bgs, [c.onPri, c.bg, c.ink], 4.5);
  const pintura = F.solida || gradiente(cores, F.direcao === 'vertical' ? 'vertical' : F.direcao === 'radial' ? 'radial' : 'horizontal');
  const todos = '.btn:not(.fantasma),body.btn-contorno .btn:not(.fantasma),body .hero-central .btn:not(.fantasma),body .cta-final .btn,body .rodape .btn,body .plano.dest .btn,body.btn-contorno .btn:not(.fantasma):hover';
  out.push(`${W(todos)}{background:${pintura}!important;border-color:${F.solida ? F.solida : 'transparent'}!important;color:${ink}!important}`);
  E.botoes = bgs;
  // um anel quando o botão novo se confunde com o fundo em volta (a página ou uma faixa de cor)
  const pag = (E.zonas[0].T && E.zonas[0].T.bgs) || [c.bg];
  if (some(mediaCor(bgs), pag)) out.push(`${W('.btn:not(.fantasma)')}{box-shadow:0 0 0 2px ${rgba(tintaPara(pag), 0.75)}!important}`);
  if (some(mediaCor(bgs), [c.pri])) out.push(`${W('body .cta-final .btn,body .plano.dest .btn')}{box-shadow:0 0 0 2px ${c.onPri}!important}`);
  if (some(mediaCor(bgs), [c.deep])) out.push(`${W('body .rodape .btn')}{box-shadow:0 0 0 2px ${c.onDeep}!important}`);
}

// ---------- "fundo" nos títulos ou nos textos: uma placa atrás (marca-texto)
function fundoPlacaSite(elemento, v, I, out) {
  const c = I.c;
  const F = fundoDe(v, c.soft);
  if (!F) return;
  const cores = F.solida ? [F.solida] : suavizar(F.cores);
  const ink = tintaPara(amostras(cores), [c.ink, c.bg]);
  const pintura = F.solida || gradiente(cores, F.direcao === 'vertical' ? 'horizontal' : F.direcao);
  const sel = elemento === 'titulos' ? 'h1,h2' : '.lead,.sec-cab>p';
  out.push(`${W(sel)}{background:${pintura}!important;color:${ink}!important;width:fit-content;max-width:100%;padding:${elemento === 'titulos' ? '.04em .22em .1em' : '.5em .8em'}!important;border-radius:${elemento === 'titulos' ? '.14em' : '10px'};-webkit-box-decoration-break:clone;box-decoration-break:clone}`,
    `${W(sel.split(',').map((s) => `${s} *`).join(','))}{color:inherit!important}`,
    `${W('.hero-central,.hero-minimal,.sec-cab.center,.cta-final')} ${W(sel)}{margin-inline:auto!important}`);
}

// ---------- alinhamento
function alinhamentoSite(elemento, valor) {
  const L = [];
  const pre = SITE.regiao[elemento] ? `${W(SITE.regiao[elemento])} ` : '';
  const centro = valor === 'centro';
  const ta = centro ? 'center' : 'left';
  const txt = elemento === 'titulos' ? 'h1,h2,h3,h4,.rod-slogan' : elemento === 'textos' ? 'p,li,blockquote,figcaption,.lead,dd,dt,summary' : elemento === 'botoes' ? null : 'h1,h2,h3,h4,p,li,blockquote,figcaption,.lead,.sec-cab,.rod-slogan,dd,dt';
  if (elemento === 'botoes') {
    L.push(`${W('.acoes,.nav-gaveta')}{justify-content:${centro ? 'center' : 'flex-start'}!important}`);
    return L;
  }
  L.push(`${pre}${W(txt)}{text-align:${ta}!important}`);
  if (centro) {
    L.push(`${pre}${W('.lead,.sec-cab,.sec-cab>p,.hero-central h1,.passo p,.sobre p.txt')}{margin-inline:auto!important}`);
    if (elemento !== 'titulos') L.push(`${pre}${W('.acoes,.selos,.sec-meta,.prova,.he-top,.cta-contato,.faixa-info,.lead-nota,.menu-nota,.ag-lista li,.assin,.depo-nota,.checks li')}{justify-content:center!important}`,
      `${pre}${W('.sec-cab.lado')}{grid-template-columns:1fr!important;justify-items:center!important}`, `${pre}${W('.checks')}{justify-items:center!important}`);
    else L.push(`${pre}${W('.sec-meta')}{justify-content:center!important}`, `${pre}${W('.sec-cab')}{margin-inline:auto!important}`, `${pre}${W('.sec-cab.lado')}{grid-template-columns:1fr!important}`);
  } else {
    // no topo central, os objetos soltos da esquerda passam para a direita (o texto agora mora na esquerda)
    if (!pre || elemento === 'topo') L.push(`${W('.hero-central .hc-obj.o0')}{left:auto!important;right:24%!important}`, `${W('.hero-central .hc-obj.o2')}{left:auto!important;right:20%!important}`);
    L.push(`${pre}${W('.sec-cab.center,.hero-central h1,.hero-central .lead,.hero-minimal .lead,.cta-final h2,.hm-sym,.hm')}{margin-left:0!important}`,
      `${pre}${W('.hero-central,.hero-minimal,.cta-final,.sec-cab.center,.hm-fatos')}{text-align:left!important}`);
    if (elemento !== 'titulos') L.push(`${pre}${W('.acoes.center,.selos.center,.sec-cab.center .sec-meta,.cta-contato')}{justify-content:flex-start!important}`);
  }
  return L;
}

// ---------- sombra
function sombraSite(elemento, valor, E) {
  const L = [];
  const pre = SITE.regiao[elemento] && elemento !== 'cartoes' ? `${W(SITE.regiao[elemento])} ` : '';
  const escura = E.zonas[0].T && E.zonas[0].T.dark;
  if (valor === 'com') {
    const tt = escura ? '0 .06em .5em rgba(0,0,0,.55)' : '0 .05em .04em rgba(0,0,0,.12),0 .12em .5em rgba(0,0,0,.16)';
    const bx = '0 18px 38px -16px rgba(0,0,0,.42),0 3px 8px -3px rgba(0,0,0,.18)';
    if (['titulos', 'tudo', 'topo', 'secoes', 'rodape', 'menu'].includes(elemento)) L.push(`${pre}${W(`${SITE.titulos}`)}{text-shadow:${tt}!important}`);
    if (['textos', 'tudo'].includes(elemento)) L.push(`${W('p,li,.lead,blockquote')}{text-shadow:0 1px 2px rgba(0,0,0,${escura ? 0.45 : 0.14})!important}`);
    if (['botoes', 'tudo', 'topo', 'secoes', 'menu', 'rodape'].includes(elemento)) L.push(`${pre}${W('.btn:not(.fantasma)')}{box-shadow:${bx}!important}`);
    if (['cartoes', 'tudo', 'secoes'].includes(elemento)) L.push(`${elemento === 'secoes' ? pre : ''}${W(SITE.regiao.cartoes)}{box-shadow:${bx}!important}`);
  } else {
    if (['titulos', 'textos', 'tudo', 'topo', 'secoes', 'rodape', 'menu'].includes(elemento)) L.push(`${pre}${W(elemento === 'titulos' ? SITE.titulos : elemento === 'textos' ? SITE.textos : 'body *')}{text-shadow:none!important}`);
    if (['botoes', 'tudo', 'topo', 'secoes', 'menu', 'rodape'].includes(elemento)) L.push(`${pre}${W('.btn,.btn:hover')}{box-shadow:none!important}`);
    if (['cartoes', 'tudo', 'secoes', 'topo'].includes(elemento)) L.push(`${elemento === 'tudo' ? '' : pre}${W(`${SITE.regiao.cartoes},.moldura,.plano:hover,.depo:hover,.cupom,.cal,.hs-foto,.hk-foto,.hl-blob,.prato-foto,.servs-foto,.entrega-mapa,.col-foto,.polaroide,.ad`)}{box-shadow:none!important}`,
      `${elemento === 'tudo' ? '' : pre}${W('.etq-w,.hc-obj,.cta-obj')}{filter:none!important}`);
  }
  return L;
}

// ------------------------------------------------------------------ CARROSSÉIS, E-MAIL, ANÚNCIOS (texto)
// Seletores por peça: o escopo (contêiner), as regiões e os tipos. Cor e fundo entram pelos motores de cor de cada
// peça (carrossel-lam.mjs, email.mjs, anuncios.mjs); aqui fica o que é tipografia e forma.
const PECA_SEL = {
  posts: {
    escopo: '.car .car-lam,.car-amp .car-lam', // listas sem vírgula dentro de parênteses: o escopo é dividido na vírgula
    regiao: { topo: '&.car-k0', menu: '.car-mh,.car-mn,.car-tk', rodape: '.car-pe', cartoes: '.car-cup>div,.car-cal,.car-bs-f,.car-mapa,.car-tag-c,.car-selo,.car-sv-ui' },
    titulos: '.car-tt,.car-h-oferta b,.car-cup-e b,.car-cta-of b,.car-bs-h,.car-so-l,.car-es-l,.car-nu b,.car-ad-a p,.car-ad-d p,.car-pa b,.car-dp-p b,.car-h-ano b,.car-so-ano b,.car-cal-d',
    textos: '.car-tx,.car-deck,.car-kk,.car-dp-t,.car-pt-t,.car-li li,.car-pa-x,.car-cmp-c p,.car-cmp-l,.car-lc p,.car-pr-d,.car-sv-t,.car-cup-n,.car-cup-e small,.car-cup-d span,.car-pz-h,.car-nu span,.car-eq b,.car-eq small,.car-dp-a,.car-arr,.car-fr-nota,.car-qa-t,.car-colo dd,.car-colo dt,.car-so-ano small,.car-h-ano small,.car-mh,.car-mn,.car-tk,.car-pe,.car-cal-t,.car-cal-m,.car-selo,.car-ad-l,.car-h-rel em,.car-cta-nome',
    botoes: '.car-btn,.car-cta-chip',
    rotulos: '.car-kk,.car-cmp-l,.car-ad-l,.car-selo,.car-cal-t,.car-cal-m,.car-so-ano small,.car-h-ano small,.car-colo dt,.car-arr,.car-fr-nota,.car-cup-e small',
    zoomTxt: '.car-tx,.car-deck,.car-dp-t,.car-pt-t,.car-pa-x,.car-cmp-c p,.car-lc p,.car-pr-d,.car-sv-t,.car-cup-n,.car-pz-h,.car-qa-t,.car-li',
    alinhar: (cen) => [`.car-cx{align-items:${cen ? 'center' : 'flex-start'}!important;text-align:${cen ? 'center' : 'left'}!important}`, `.car-kk,.car-tt,.car-deck,.car-acao,.car-arr{margin-inline:${cen ? 'auto' : '0'}!important;justify-content:${cen ? 'center' : 'flex-start'}!important}`],
  },
  email: {
    escopo: '.em-tpl,.em-x-body',
    regiao: { topo: '.em-s-hero', menu: '.em-s-cabecalho', rodape: '.em-s-rodape', cartoes: '.em-x-card' },
    titulos: 'h1,h2,h3,.em-x-t,.em-x-giant',
    textos: 'p:not(.em-x-t):not(.em-x-giant),td,li,span,a:not(.em-x-btn)',
    botoes: '.em-x-btn',
    rotulos: '.em-x-p',
    zoomTxt: '',
  },
  // classes que anuncios.mjs gera de verdade (conferidas nos 6 tamanhos × 6 estilos × 7 conceitos, com e sem oferta):
  // títulos = tudo na fonte de display (título, número, slogan e nomes dos quadros de destaque, preço, valor do cupom);
  // textos = a fonte de texto (sobretítulo, descrição, depoimento, legendas, frase e código do cupom, nome do item);
  // botões = o botão (.ad-cta) e a seta redonda do 1º quadro, que usa a mesma cor dele. O selo (.ad-selo) não é cartão:
  // é um SVG redondo numa caixa quadrada, e fundo ou sombra de cartão pintariam um quadrado atrás dele
  anuncios: {
    escopo: '.ad',
    regiao: { cartoes: '.ad-cup,.ad-mb-cup,.ad-depo,.ad-etq,.ad-chip,.ad-her-preco' },
    titulos: '.ad-tit,.ad-tit-base,.ad-tit-rv,.ad-her-num,.ad-her-slogan,.ad-her-pd-t>b,.ad-her-lc-t>b,.ad-her--mini>span>b,.ad-bb-item>b,.ad-nums b,.ad-nota b,.ad-mb-nota b,.ad-etq-v,.ad-chip b,.ad-her-preco,.ad-cup-of,.ad-cup-of2,.ad-mb-cup b',
    textos: '.ad-kick,.ad-desc,.ad-dom,.ad-depo-txt,.ad-depo-aut,.ad-her-q,.ad-her-rot,.ad-her-pd-t>small,.ad-her-lc-t>small,.ad-her--mini>span>small,.ad-bb-item>small,.ad-nums small,.ad-nota small,.ad-mb-nota small,.ad-selo,.ad-etq-nome,.ad-etq-suf,.ad-chip-n,.ad-cup-fr,.ad-cup-k,.ad-cup-cod,.ad-mb-cup>span',
    botoes: '.ad-cta,.ad-seta-q',
    rotulos: '.ad-kick,.ad-selo,.ad-dom,.ad-her-rot,.ad-etq-nome,.ad-cup-k,.ad-cup-cod,.ad-mb-cup>span',
    zoomTxt: '.ad-desc,.ad-depo-txt',
    alinhar: (cen) => [`.ad-pilha{align-items:${cen ? 'center' : 'flex-start'}!important;text-align:${cen ? 'center' : 'left'}!important}`],
  },
};

function cssPeca(peca, res, ctx = null, { escopo = null } = {}) {
  const P = PECA_SEL[peca], out = [];
  const E = escopo || P.escopo;
  const c = (ctx && ctx.marca && ctx.marca.cores) || { ink: '#141414', bg: '#ffffff', pri: '#2563eb', onPri: '#ffffff' };
  // escopa uma lista de seletores ("&" = a própria raiz do escopo)
  const esc = (s) => E.split(',').map((e) => s.split(',').map((x) => (x.startsWith('&') ? `${e}${x.slice(1)}` : `${e} ${x}`)).join(',')).join(',');
  const desc = (s) => s.split(',').map((x) => `${x} *`).join(',');
  const alvo = (elemento) => {
    if (elemento === 'tudo' || (elemento === 'secoes' && peca !== 'email')) return W(`${esc('&')},${esc('*')}`);
    if (P.regiao[elemento]) return W(`${esc(P.regiao[elemento])},${esc(desc(P.regiao[elemento]))}`);
    if (P[elemento]) return W(`${esc(P[elemento])},${esc(desc(P[elemento]))}`);
    return null;
  };

  // fundo dos botões e dos cartões (o fundo da peça inteira entra pelo motor de cor dela); no e-mail, também
  // o destaque (topo), o cabeçalho (menu) e o rodapé: fundo novo e texto recalculado, sem mexer em caixas de cor
  for (const { elemento, valor } of res.fundo || []) {
    if (peca === 'email' && ['topo', 'menu', 'rodape'].includes(elemento)) {
      const sel = P.regiao[elemento];
      const F = fundoDe(valor, elemento === 'rodape' ? c.ink : c.bg, c.ink);
      if (!F) continue;
      const cores = F.solida ? [F.solida] : suavizar(F.cores), bgs = amostras(cores);
      const ink = tintaPara(bgs, [c.ink, c.bg], 4.5);
      out.push(`${W(esc(sel))}{background:${F.solida || gradiente(cores, F.direcao)}!important;background-color:${F.solida || mediaCor(bgs)}!important}`,
        `${W(esc(`${sel} h1,${sel} h2,${sel} h3,${sel} p,${sel} span,${sel} a,${sel} b,${sel} i,${sel} td,${sel} div`))}:not(.em-x-btn):not([style*="background"]):not(${W(esc(`${sel} td[style*="background"] *`))}){color:${ink}!important}`,
        // o nome no logo em SVG (painel e ampliado) acompanha a tinta; o símbolo fica como está
        `${W(esc(`${sel} svg text`))}{fill:${ink}!important}`);
      continue;
    }
    if (elemento !== 'botoes' && elemento !== 'cartoes') continue;
    const sel = elemento === 'botoes' ? P.botoes : P.regiao.cartoes;
    if (!sel) continue;
    const F = fundoDe(valor, elemento === 'botoes' ? c.pri : c.bg, c.ink);
    if (!F) continue;
    const cores = F.solida ? [F.solida] : suavizar(F.cores);
    const ink = tintaPara(amostras(cores), elemento === 'botoes' ? [c.onPri, c.bg, c.ink] : [c.ink, c.bg], 4.5);
    const pint = F.solida || gradiente(cores, F.direcao === 'vertical' && elemento === 'botoes' ? 'horizontal' : F.direcao);
    out.push(`${W(esc(sel))}{background:${pint}!important;${F.solida ? `background-color:${F.solida}!important;` : ''}color:${ink}!important;border-color:${F.solida || 'transparent'}!important;--af:${mediaCor(cores)};--aft:${ink};--ad-btn:${mediaCor(cores)};--ad-btn-ink:${ink};--ad-card:${mediaCor(cores)};--ad-card-ink:${ink}}`,
      `${W(esc(desc(sel)))}{color:inherit!important;-webkit-text-fill-color:currentColor}`);
  }

  // cor do texto: nos carrosséis, a cor já conferida contra o fundo de cada lâmina (--ajt / --ajx)
  if (peca === 'posts') for (const { elemento } of res.cor_texto || []) {
    if (elemento === 'titulos' || elemento === 'tudo') out.push(`${W(esc(P.titulos))}{color:var(--ajt)!important}`);
    if (elemento === 'textos' || elemento === 'tudo') out.push(`${W(esc(P.textos))}:not(${W(esc(P.titulos))}){color:var(--ajx)!important}`);
  }

  // caixa: o que o encaixe da peça já não faz (os títulos são medidos com a caixa certa em cada motor)
  let textoAlto = false;
  for (const { elemento, valor } of res.caixa || []) {
    const sel = alvo(elemento);
    if (!sel) continue;
    out.push(`${sel}{text-transform:${TRANSFORM[valor]}!important}`);
    // o nome da marca (logo) e as ilustrações não herdam
    if (elemento === 'tudo') out.push(`${W(esc('svg,svg *'))}{text-transform:none!important}`);
    if (peca === 'email' && ['tudo', 'titulos', 'menu', 'rodape'].includes(elemento)) out.push(`${W(esc('.em-x-logo'))}{text-transform:none!important}`);
    if (valor === 'maiusculas' && elemento !== 'titulos') {
      textoAlto = true;
      out.push(`${W(esc(P.textos))}:not(${W(esc(`${P.rotulos},${P.titulos}`))}){letter-spacing:.02em!important}`);
    }
  }

  // tamanho dos textos (os títulos crescem no cálculo de encaixe); caixa alta em texto corrido encolhe um pouco
  const fTxt = valorPara(res, 'tamanho', 'textos') || 1, fBtn = valorPara(res, 'tamanho', 'botoes') || 1;
  const zTxt = Math.round(fTxt * (textoAlto && peca !== 'email' ? 0.93 : 1) * 1000) / 1000;
  if (zTxt !== 1 && P.zoomTxt) out.push(`${W(esc(P.zoomTxt))}{zoom:${zTxt}!important}`);
  if (fBtn !== 1) out.push(`${W(esc(P.botoes))}{zoom:${fBtn}!important}`);

  for (const { elemento, valor } of res.peso || []) {
    const neg = valor === 'negrito';
    if (['titulos', 'tudo', 'topo', 'secoes'].includes(elemento)) out.push(`${W(esc(P.titulos))}{font-weight:${neg ? 800 : 300}!important}`);
    if (['textos', 'tudo', 'secoes'].includes(elemento)) out.push(`${W(esc(P.textos))}:not(${W(esc(P.titulos))}){font-weight:${neg ? 700 : 300}!important}`);
    if (['botoes', 'tudo'].includes(elemento)) out.push(`${W(esc(`${P.botoes},${desc(P.botoes)}`))}{font-weight:${neg ? 800 : 500}!important}`);
    if (elemento === 'cartoes' && P.regiao.cartoes) out.push(`${W(esc(`${P.regiao.cartoes},${desc(P.regiao.cartoes)}`))}{font-weight:${neg ? 700 : 300}!important}`);
  }
  for (const { elemento, valor } of res.espaco || []) {
    const amplo = valor === 'amplo';
    if (['titulos', 'tudo', 'topo', 'secoes'].includes(elemento)) out.push(`${W(esc(P.titulos))}{letter-spacing:${amplo ? '.06em' : '-.035em'}!important}`);
    if (['textos', 'tudo', 'secoes'].includes(elemento)) out.push(`${W(esc(P.textos))}:not(${W(esc(`${P.rotulos},${P.titulos}`))}){letter-spacing:${amplo ? '.05em' : '-.012em'}!important}`);
    if (['botoes', 'tudo'].includes(elemento)) out.push(`${W(esc(P.botoes))}{letter-spacing:${amplo ? '.08em' : '-.01em'}!important}`);
  }
  for (const { elemento, valor } of res.italico || []) {
    const sel = alvo(elemento);
    if (sel) out.push(`${sel}{font-style:${valor === 'sim' ? 'italic' : 'normal'}!important}`);
  }
  for (const { elemento, valor } of res.alinhamento || []) {
    const cen = valor === 'centro', ta = cen ? 'center' : 'left';
    const sel = elemento === 'titulos' ? esc(P.titulos) : elemento === 'textos' ? esc(P.textos) : elemento === 'botoes' ? null : esc(`${P.titulos},${P.textos}`);
    if (sel) out.push(`${W(sel)}{text-align:${ta}!important}`);
    if (P.alinhar && elemento !== 'textos') out.push(...P.alinhar(cen).map((r) => r.replace(/^([^{]+)\{/, (m, s0) => `${W(esc(s0))}{`)));
  }
  for (const { elemento, valor } of res.sombra || []) {
    if (valor === 'com') {
      if (['titulos', 'tudo', 'topo', 'secoes'].includes(elemento)) out.push(`${W(esc(P.titulos))}{text-shadow:0 .05em .35em rgba(0,0,0,.28)!important}`);
      if (['botoes', 'tudo'].includes(elemento)) out.push(`${W(esc(P.botoes))}{box-shadow:0 12px 26px -12px rgba(0,0,0,.55),0 2px 6px -2px rgba(0,0,0,.25)!important}`);
      if (['cartoes', 'tudo'].includes(elemento) && P.regiao.cartoes) out.push(`${W(esc(P.regiao.cartoes))}{box-shadow:0 14px 30px -14px rgba(0,0,0,.5)!important}`);
    } else {
      const sel = elemento === 'titulos' || elemento === 'textos' ? W(esc(P[elemento])) : elemento === 'botoes' || elemento === 'cartoes' ? W(esc(elemento === 'botoes' ? P.botoes : P.regiao.cartoes)) : W(`${esc('&')},${esc('*')}`);
      out.push(`${sel}{text-shadow:none!important;box-shadow:none!important}`);
      if (peca === 'posts' && ['tudo', 'cartoes'].includes(elemento)) out.push(`${W(esc('.car-cup,.car-tag-c,.car-ped-arte svg'))}{filter:none!important}`);
    }
  }
  return out.join('\n');
}

// ------------------------------------------------------------------ API
// CSS (string) dos ajustes que valem para a peça, na ordem (o último vence). ctx: o contexto montado (contexto.mjs)
// ou, no site, a informação lida do documento (infoDoDocumento). Sem ctx, o site usa uma paleta neutra.
export function ajustesCSS(ajustes, peca, ctx = null) {
  if (!PECAS.includes(peca)) return '';
  const res = resolverAjustes(ajustes, peca);
  if (!Object.keys(res).length) return '';
  if (peca === 'site') {
    const I = infoSite(ctx) || { c: tokensPaleta({ c: { bg: '#ffffff', surf: '#f3f3f3', ink: '#141414', muted: '#5f6368', pri: '#2563eb', sec: '#94a3b8', acc: '#f59e0b' } }), hero: 'split', apos: [], textura: 'lisa' };
    return `/* ajustes de estilo (${ajustesDa(ajustes, peca).length}) */\n${cssSite(res, I)}`;
  }
  return cssPeca(peca, res, ctx);
}
// a tag <style> pronta para entrar no HTML de uma peça ('' quando não há ajuste para ela)
export function estiloAjustes(ajustes, peca, ctx = null, { escopo = null } = {}) {
  const res = resolverAjustes(ajustes, peca);
  if (!Object.keys(res).length) return '';
  const css = peca === 'site' ? ajustesCSS(ajustes, peca, ctx) : cssPeca(peca, res, ctx, { escopo });
  return css ? `<style data-ajustes="${peca}">${css}</style>` : '';
}

// Atualiza (ou cria) o <style id="ajustes"> do documento do site, sem recarregar o iframe. Sempre por último no
// <head>, para vencer todo o CSS do site. ctx é opcional: sem ele, a paleta e os blocos são lidos do documento.
// Devolve o CSS aplicado.
export function aplicarAjustesNoDocumento(doc, ajustes, ctx = null) {
  if (!doc || !doc.head) return '';
  const I = infoSite(ctx) || infoDoDocumento(doc);
  const css = ajustesCSS(ajustes || [], 'site', I);
  let st = doc.getElementById('ajustes');
  if (!st) { st = doc.createElement('style'); st.id = 'ajustes'; }
  if (st.parentNode !== doc.head || st !== doc.head.lastElementChild) doc.head.appendChild(st);
  if (st.textContent !== css) st.textContent = css;
  return css;
}

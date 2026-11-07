// E-mail marketing do Estúdio por Voz: o TEMPLATE MASTER (tabelas + estilos inline, pronto para Mailchimp,
// RD Station e Brevo) e a ASSINATURA de e-mail com a marca (para colar no Gmail ou no Outlook).
// Um só desenhista monta o e-mail para três destinos, e o que se vê no estúdio é o que se exporta:
//   'export' → documento de e-mail de verdade: sem SVG e sem data: (o Gmail remove), botões VML no Outlook,
//              preheader escondido, fontes com reserva, celular e modo escuro por <style> no <head>;
//   'mock'   → o mesmo HTML, em escala, no painel do estúdio (logo e ilustração em SVG; campos da IA marcados);
//   'amp'    → o mesmo, a 600 px, na visão ampliada, com as anotações de designer presas a cada seção.
// Todo texto sai do contexto (Jev, pacote do segmento, itens, oferta); só o microtexto de interface é nosso.
import { esc, cap, mix, contraste, sobre, iniciais, rnd, clamp, lum, caixa as aplicarCaixa } from './util.mjs';
import { logoSVG, simboloSVG, medir } from './marca.mjs';
import { arte } from './arte.mjs';
import * as B from '../lib/biblioteca.mjs';
import { resolverAjustes, valorPara, fundoDe, suavizar, amostras, mediaCor, gradiente, tintaPara, apoioPara, corTextoPara, estiloAjustes, ajustesCSS } from './ajustes-css.mjs';

// ------------------------------------------------------------------ utilidades
let SEQ = 0;
const novoId = () => `em${(++SEQ).toString(36)}`;
const ffq = (s) => String(s || '').replace(/"/g, "'"); // pilha de fontes dentro de style="..."
const rot = (lista, id) => (lista.find((o) => o.id === id) || { rotulo: id, jev: '' });
const semEmoji = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim();
const FORMAL = new Set(['especialista', 'sofisticada']);
// fator de tamanho do display por par de fontes (condensadas crescem, largas encolhem)
const FATOR = { poster: 1.16, manuscrita: 1.2, editorial: 1.1, classica: 1.04, vintage: 0.84, brutalista: 0.8, artistica: 0.86, spa: 0.9, retro: 0.96, tecnica: 0.96 };
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const data = (ctx) => (ctx.agora instanceof Date ? ctx.agora : new Date(ctx.agora || Date.now()));
const hora = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// tabela de layout de e-mail (role=presentation, sem espaçamento; separate para os cantos arredondados)
const tb = (inner, { w = '100%', align = '', st = '', cls = '' } = {}) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${w ? ` width="${w}"` : ''}${align ? ` align="${align}"` : ''}${cls ? ` class="${cls}"` : ''} style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;${w === '100%' ? 'width:100%;' : ''}${st}">${inner}</table>`;
const esp = (h) => `<div style="height:${h}px;line-height:${h}px;font-size:1px;mso-line-height-rule:exactly">&nbsp;</div>`;

// ------------------------------------------------------------------ tokens do e-mail
function tokens(ctx) {
  const c = ctx.marca.cores, f = ctx.marca.f, s = ctx.site || {};
  const dk = !!c.dark;
  const papel = c.bg;
  const canvas = dk ? mix(c.bg, '#000000', 0.55) : mix(c.bg, c.surf, 0.85);
  const cartao = dk ? c.surf : mix(c.bg, c.surf, 0.72);
  const linha = mix(papel, c.ink, dk ? 0.17 : 0.13);
  const suave = sobre(papel, c.muted, mix(c.ink, papel, 0.25));
  const fonte = ctx.marca.fonte || {};
  return {
    dk, canvas, papel, cartao, linha, suave, tinta: c.ink,
    soft: c.soft, soft2: c.soft2,
    pri: c.pri, onPri: c.onPri, priTxt: c.priTxt, sec: c.sec, onSec: c.onSec, secTxt: c.secTxt, acc: c.acc, onAcc: c.onAcc,
    deep: c.deep, onDeep: c.onDeep,
    // texto de apoio sobre a cor principal (nada de rgba: o Outlook não entende)
    onPriSuave: mix(c.onPri, c.pri, 0.22), onDeepSuave: mix(c.onDeep, c.deep, 0.32),
    fDisp: ffq(f.disp), fBody: ffq(f.body), fLogo: ffq(f.logo), fDispRaw: f.disp, fLogoRaw: f.logo,
    dw: f.dw || 700, lw: f.lw || 700, up: !!f.caixa, tr: f.tr || '0', k: FATOR[fonte.id] || 1,
    script: f.scriptLogo ? ffq(f.logo) : null, ital: !!f.ital,
    raio: { retos: 0, suaves: 12, redondos: 22 }[s.cantos] ?? 12,
    btn: s.btn || 'suave',
    formal: FORMAL.has(ctx.pers && ctx.pers.id) || ctx.emojiNivel === 0,
    kt: 1,
  };
}

// ajustes de estilo (ajustes-css.mjs) que valem para o e-mail: o fundo e as cores entram nos TOKENS (viram estilo
// inline: funcionam no Gmail, no Outlook e no exportável); caixa e tamanho dos títulos entram no encaixe (T.up, T.k)
const AJ = new WeakMap();
function ajustesEmail(ctx) {
  if (!ctx || !Array.isArray(ctx.ajustes) || !ctx.ajustes.length) return null;
  const sig = JSON.stringify(ctx.ajustes), memo = AJ.get(ctx); // a lista pode mudar no mesmo ctx: confere a assinatura
  if (memo && memo.sig === sig) return memo.r;
  let r = resolverAjustes(ctx.ajustes, 'email');
  if (!Object.keys(r).length) r = null;
  AJ.set(ctx, { sig, r });
  return r;
}
function tokensComAjustes(ctx) {
  const T = tokens(ctx), aj = ajustesEmail(ctx);
  if (!aj) return T;
  const c = ctx.marca.cores;
  let bgs = [T.papel];
  for (const { elemento, valor } of aj.fundo || []) {
    if (elemento !== 'pagina' && elemento !== 'secoes') continue;
    const F = fundoDe(valor, T.papel, c.ink);
    if (!F) continue;
    const cores = F.solida ? [F.solida] : suavizar(F.cores);
    bgs = amostras(cores);
    const m = mediaCor(bgs), dk = lum(m) < 0.2;
    const tinta = tintaPara(bgs, [c.ink, c.bg]);
    Object.assign(T, {
      dk, papel: F.solida || m, papelImg: F.solida ? null : gradiente(cores, F.direcao), tinta,
      suave: apoioPara(tinta, bgs), linha: mix(m, tinta, dk ? 0.17 : 0.13),
      cartao: F.solida ? (dk ? mix(m, '#ffffff', 0.08) : mix(m, tinta, 0.05)) : (dk ? mix(m, '#ffffff', 0.1) : mix(m, '#ffffff', 0.7)),
      soft: mix(m, T.pri, dk ? 0.16 : 0.1), soft2: mix(m, T.sec, 0.18), ajFundo: true,
      priTxt: [c.pri, c.acc, c.sec, c.priTxt].find((x) => bgs.every((b) => contraste(x, b) >= 3)) || tinta,
    });
    if (elemento === 'pagina') T.canvas = dk ? mix(cores[0], '#000000', 0.45) : mix(m, tinta, 0.09);
  }
  const cx = valorPara(aj, 'caixa', 'titulos');
  if (cx) T.up = cx === 'maiusculas';
  T.k *= valorPara(aj, 'tamanho', 'titulos') || 1;
  T.kt = valorPara(aj, 'tamanho', 'textos') || 1;
  // cor do texto: os títulos ganham token próprio (T.tit), para a tinta geral (nomes, rodapé, avisos) não mudar junto
  const ct = valorPara(aj, 'cor_texto', 'titulos'), cxT = valorPara(aj, 'cor_texto', 'textos');
  if (ct) T.tit = corTextoPara(ct, [...bgs, T.cartao], 4.5);
  if (cxT) T.suave = corTextoPara(cxT, [...bgs, T.cartao], 4.5);
  return T;
}

// a fonte da marca já carregou? Antes disso o canvas mede com a fonte de reserva (mais estreita): aí a conta é conservadora
function fonteOk(pilha, peso) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.check) return true;
  const fam = String(pilha).split(',')[0].trim();
  try { return document.fonts.check(`${peso} 20px ${fam}`, 'Aa'); } catch { return true; }
}
function largura100(t, T) {
  const w = medir(t, T.fDispRaw, T.dw, 100, 0);
  return fonteOk(T.fDispRaw, T.dw) ? w : Math.max(w, String(t).length * 64);
}
// tamanho de fonte que faz o texto caber na largura (com 2 linhas quando preciso), medido na fonte da marca
function caber(txt, T, largura, max, min, linhas = 1) {
  const t = T.up ? String(txt).toUpperCase() : String(txt);
  const w100 = Math.max(1, largura100(t, T));
  let s = (100 * largura) / w100;
  if (linhas > 1 && s < max) {
    const maior = Math.max(...t.split(/\s+/).map((p) => largura100(p, T)));
    s = Math.max(s, Math.min((100 * largura) / Math.max(1, maior), ((100 * largura * linhas) / w100) * 0.86));
  }
  return Math.round(clamp(s * 0.94, min, max));
}

// ------------------------------------------------------------------ peças tipográficas
function kicker(T, txt, { cor = T.priTxt, align = 'left', mb = 16, traco = true } = {}) {
  const tr = traco ? `<span style="display:inline-block;width:24px;height:2px;background:${cor};vertical-align:middle;margin:0 10px 3px 0"></span>` : '';
  return `<p class="em-x-p" style="margin:0 0 ${mb}px;font-family:${T.fBody};font-size:12px;line-height:16px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${cor};text-align:${align};mso-line-height-rule:exactly">${tr}${esc(txt)}</p>`;
}
function titulo(T, html, { tag = 'h2', size = 32, lh = 1.08, cor = T.tit || T.tinta, align = 'left', mb = 16, cls = '', italico = false, tracking = null } = {}) {
  const s = Math.round(size * T.k);
  const ls = tracking != null ? tracking : T.up ? '.01em' : T.tr;
  return `<${tag}${cls ? ` class="${cls}"` : ''} style="overflow-wrap:break-word;word-wrap:break-word;margin:0 0 ${mb}px;font-family:${T.fDisp};font-size:${s}px;line-height:${Math.round(s * lh)}px;font-weight:${T.dw};letter-spacing:${ls};${T.up ? 'text-transform:uppercase;' : ''}${italico ? 'font-style:italic;' : ''}color:${cor};text-align:${align};mso-line-height-rule:exactly">${html}</${tag}>`;
}
function para(T, html, { size = 16, lh = 26, cor = T.suave, align = 'left', mb = 0, campo = '', peso = 400, cls = 'em-x-s' } = {}) {
  if (T.kt && T.kt !== 1) { size = Math.round(size * T.kt * 10) / 10; lh = Math.round(lh * T.kt); }
  return `<p${cls ? ` class="${cls}"` : ''}${campo} style="margin:0 0 ${mb}px;font-family:${T.fBody};font-size:${size}px;line-height:${lh}px;font-weight:${peso};color:${cor};text-align:${align};mso-line-height-rule:exactly">${html}</p>`;
}
// estrelas em texto (renderizam em qualquer cliente)
const estrelas = (cor, tam = 15) => `<span style="font-family:Arial,sans-serif;font-size:${tam}px;line-height:${tam + 4}px;letter-spacing:3px;color:${cor}">★★★★★</span>`;

// botão à prova de falha: VML (roundrect) no Outlook do Windows + âncora com fundo nos demais clientes
function botao(T, M, texto, { fundo = T.pri, cor = T.onPri, align = 'center', estilo = T.btn, tam = 'g', seta = true, contraFundo = T.papel, maxW = 380 } = {}) {
  const h = tam === 'g' ? 54 : 44;
  let fs = tam === 'g' ? 16 : 14;
  const rotulo = texto + (seta ? ' →' : '');
  const folga = tam === 'g' ? 72 : 40;
  let wTxt = medir(rotulo, "Arial, sans-serif", 700, fs, 0.01);
  if (wTxt + folga > maxW) { fs -= 1; wTxt = medir(rotulo, "Arial, sans-serif", 700, fs, 0.01); }
  const w = Math.round(clamp(wTxt + folga, Math.min(maxW, tam === 'g' ? 208 : 150), maxW));
  const raio = { pilula: h / 2, suave: 10, reto: 0, contorno: Math.min(T.raio, 12), bloco: 6, gradiente: 12 }[estilo] ?? 10;
  const contorno = estilo === 'contorno';
  const txtCor = contorno ? sobre(contraFundo, fundo, T.tinta) : cor;
  const borda = contorno ? `border:2px solid ${txtCor};` : estilo === 'bloco' ? `border:2px solid ${mix(fundo, '#000000', 0.55)};` : `border:0;`;
  const sombra = estilo === 'bloco' ? `box-shadow:4px 4px 0 ${mix(fundo, '#000000', 0.55)};` : estilo === 'gradiente' ? `box-shadow:0 10px 24px -12px ${fundo};` : '';
  const bg = contorno ? '' : `background-color:${fundo};${estilo === 'gradiente' ? `background-image:linear-gradient(120deg,${fundo},${mix(fundo, T.acc, 0.7)});` : ''}`;
  const lh = h - (contorno || estilo === 'bloco' ? 4 : 0);
  const vml = M.modo === 'export'
    ? `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#" style="height:${h}px;v-text-anchor:middle;width:${w}px;" arcsize="${Math.round((raio / h) * 100)}%" ${contorno ? `strokecolor="${txtCor}" strokeweight="2px" fill="f"` : `stroke="f" fillcolor="${fundo}"`}><w:anchorlock/><center style="color:${txtCor};font-family:Arial,sans-serif;font-size:${fs}px;font-weight:bold;">${esc(rotulo)}</center></v:roundrect><![endif]-->`
    : '';
  const a = `<a href="#" class="em-x-btn" style="${bg}${borda}${sombra}border-radius:${raio}px;color:${txtCor};display:inline-block;font-family:${T.fBody};font-size:${fs}px;font-weight:700;line-height:${lh}px;letter-spacing:.01em;text-align:center;text-decoration:none;width:${w}px;-webkit-text-size-adjust:none;mso-hide:all">${esc(texto)}${seta ? '&nbsp;&rarr;' : ''}</a>`;
  return `<div style="text-align:${align}">${vml}${a}</div>`;
}

// ------------------------------------------------------------------ símbolo e logo em HTML (o exportável não usa SVG)
function formaSimbolo(ctx) {
  const M = ctx.marca;
  const e = M.estilo && M.estilo !== 'classico' ? M.estilo : null;
  if (e === 'poster') return '6px';
  if (e === 'bloco') return '24%';
  if (e === 'app') return '28%';
  if (e === 'organico') return '58% 42% 55% 45%';
  if (e === 'monograma') return '2px';
  if (!e) return { quadrado: '24%', hexagono: '30%', escudo: '12% 12% 50% 50%', folha: '50% 4px 50% 4px' }[M.forma] || '50%';
  return '50%';
}
function letrasSimbolo(ctx) {
  const M = ctx.marca;
  return M.estilo === 'monograma' || M.disp === 'monograma' ? iniciais(ctx.nome) : (String(ctx.nome).trim()[0] || '?').toUpperCase();
}
// círculo/forma com as iniciais na fonte do logo; anel fino por fora quando o estilo pede (carimbo, selo, monograma)
function simboloHTML(ctx, T, tam, { fundo = T.pri, tinta = T.onPri, anel = null, letras = null, fundoAnel = 'transparent', centro = false } = {}) {
  const txt = letras || letrasSimbolo(ctx);
  const fs = Math.round(tam * (txt.length > 1 ? 0.4 : 0.52) * (T.script ? 1.15 : 1));
  const r = formaSimbolo(ctx);
  const grad = ctx.marca.estilo === 'app' ? `background-image:linear-gradient(135deg,${fundo},${mix(fundo, T.acc, 0.75)});` : '';
  const miolo = `<td width="${tam}" height="${tam}" align="center" valign="middle" style="width:${tam}px;min-width:${tam}px;height:${tam}px;border-radius:${r};background-color:${fundo};${grad}color:${tinta};font-family:${T.script || T.fLogo};font-size:${fs}px;line-height:${tam}px;font-weight:${T.lw};letter-spacing:${txt.length > 1 ? '.04em' : '0'};text-align:center;mso-line-height-rule:exactly">${esc(txt)}</td>`;
  const ctr = centro ? { align: 'center', st: 'margin:0 auto' } : {};
  const base = tb(`<tr>${miolo}</tr>`, { w: '', ...(anel ? {} : ctr) });
  if (!anel) return base;
  return tb(`<tr><td style="padding:3px;border:1px solid ${anel};border-radius:${r};background:${fundoAnel}">${base}</td></tr>`, { w: '', ...ctr });
}
// logo tipográfico: símbolo + nome na fonte do logo + linha de categoria (sem imagem nenhuma)
function logoHTML(ctx, T, { cor = T.tinta, corTag = T.priTxt, simbFundo = T.pri, simbTinta = T.onPri, tam = 30, align = 'center', empilhado = false, tag = true, simb = 44 } = {}) {
  const Mc = ctx.marca, f = Mc.f;
  const modo = f.scriptLogo && Mc.caixa === 'alta' ? 'titulo' : Mc.caixa;
  const nome = aplicarCaixa(ctx.nome, modo);
  const ls = modo === 'alta' ? `${Math.max(0.06, parseFloat(f.lt) || 0)}em` : (f.lt || '0');
  const tagTxt = (ctx.cidade ? `${ctx.pack.cat} · ${ctx.cidade.nome}` : ctx.pack.cat).toUpperCase();
  const nomeH = `<div class="em-x-t em-x-logo" style="font-family:${T.fLogo};font-size:${tam}px;line-height:${Math.round(tam * 1.1)}px;font-weight:${T.lw};letter-spacing:${ls};color:${cor};white-space:nowrap">${esc(nome)}</div>`;
  const tagH = tag ? `<div class="em-x-tag" style="padding-top:4px;font-family:${T.fBody};font-size:10px;line-height:14px;font-weight:700;letter-spacing:.2em;color:${corTag};white-space:nowrap">${esc(tagTxt)}</div>` : '';
  const s = simb ? simboloHTML(ctx, T, simb, { fundo: simbFundo, tinta: simbTinta }) : '';
  if (empilhado) return tb(`${s ? `<tr><td align="center" style="padding-bottom:14px">${s}</td></tr>` : ''}<tr><td align="center">${nomeH}${tagH}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
  return tb(`<tr>${s ? `<td valign="middle" style="padding-right:14px">${s}</td>` : ''}<td valign="middle" style="text-align:left">${nomeH}${tagH}</td></tr>`, { w: '', align, st: align === 'center' ? 'margin:0 auto' : '' });
}
// SVG do logo encaixado numa caixa (só no estúdio)
function encaixar(svg, maxW, maxH) {
  const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  const w = m ? +m[3] : 100, h = m ? +m[4] : 100;
  const k = Math.min(maxW / w, maxH / h);
  return svg.replace(/^<svg /, `<svg width="${Math.round(w * k)}" height="${Math.round(h * k)}" style="display:inline-block;vertical-align:middle;max-width:100%;height:auto;overflow:visible" `);
}
const logoAlto = (ctx) => ['carimbo', 'monograma'].includes(ctx.marca.estilo) || (ctx.marca.estilo === 'classico' && ['emblema', 'empilhado'].includes(ctx.marca.disp));

// ícones desenhados com bordas (Instagram, WhatsApp, site, telefone, e-mail, endereço): funcionam sem SVG
function icone(tipo, fundo, tinta, tam = 22) {
  const b = Math.max(2, Math.round(tam / 11));
  const d = {
    ig: [Math.round(tam * 0.3), Math.round(tam * 0.3), '32%'],
    wa: [Math.round(tam * 0.3), Math.round(tam * 0.3), '50% 50% 50% 2px'],
    web: [Math.round(tam * 0.3), Math.round(tam * 0.3), '50%'],
    tel: [Math.round(tam * 0.18), Math.round(tam * 0.34), '2px'],
    mail: [Math.round(tam * 0.38), Math.round(tam * 0.22), '2px'],
    pin: [Math.round(tam * 0.28), Math.round(tam * 0.28), '50% 50% 50% 1px'],
  }[tipo] || [6, 6, '50%'];
  const dentro = tipo === 'ig'
    ? tb(`<tr><td align="center" valign="middle" style="width:${d[0]}px;height:${d[1]}px;border:${b}px solid ${tinta};border-radius:${d[2]};font-size:0;line-height:0">${tb(`<tr><td style="width:${Math.max(2, Math.round(tam * 0.09))}px;height:${Math.max(2, Math.round(tam * 0.09))}px;border:${Math.max(1, b - 1)}px solid ${tinta};border-radius:50%;font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' })
    : tb(`<tr><td style="width:${d[0]}px;height:${d[1]}px;border:${b}px solid ${tinta};border-radius:${d[2]};font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
  return tb(`<tr><td width="${tam}" height="${tam}" align="center" valign="middle" style="width:${tam}px;height:${tam}px;border-radius:50%;background:${fundo};font-size:0;line-height:0">${dentro}</td></tr>`, { w: '' });
}

// ------------------------------------------------------------------ narrativa do e-mail (só textos do contexto)
function manchete(ctx) {
  const e = ctx.email, tipo = e.tipo.id, of = ctx.oferta, it3 = ctx.itens[3];
  let t = semEmoji(e.assunto).replace(new RegExp(`^${ctx.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:,–-]\\s*`, 'i'), '');
  t = cap(t.replace(/[\s.!]+$/, (m) => (m.includes('.') && /\.\s*\S/.test(t) ? '.' : '')));
  let chave = null;
  const low = t.toLowerCase();
  if (of && of.curta && low.includes(of.curta.toLowerCase())) chave = t.substr(low.indexOf(of.curta.toLowerCase()), of.curta.length);
  else if (it3 && t.includes(it3.nome)) chave = it3.nome;
  else if (low.includes(ctx.itens[0].nome.toLowerCase())) chave = ctx.itens[0].nome;
  const i = chave ? t.indexOf(chave) : -1;
  const pre = i > 0 ? t.slice(0, i).trim() : '';
  const pos = i >= 0 ? t.slice(i + chave.length).replace(/^[\s:,.–-]+/, '').trim() : '';
  const mes = ctx.base ? ctx.base.mes : MESES_CURTOS[data(ctx).getMonth()];
  const kick = {
    boas_vindas: 'Boas-vindas', newsletter: `Edição de ${mes}`, promocao: 'Promoção', lancamento: 'Lançamento',
    reengajamento: 'Sentimos sua falta',
  }[tipo] || e.tipo.rotulo;
  return { kicker: kick, titulo: t, chave, pre, pos, mes };
}
// texto de título: escapado e sem quebrar palavras com hífen ("boas-vindas")
const escT = (t) => esc(t).replace(/([^\s<>]+-[^\s<>]+)/g, '<span style="white-space:nowrap">$1</span>');
// título com a palavra-chave destacada na cor da marca
function comChave(T, man, cor = T.priTxt) {
  if (!man.chave) return escT(man.titulo);
  const i = man.titulo.indexOf(man.chave);
  const inteira = man.chave.length <= 12 ? 'white-space:nowrap;' : '';
  return `${escT(man.titulo.slice(0, i))}<span class="em-x-p" style="color:${cor};${inteira}">${esc(man.chave)}</span>${escT(man.titulo.slice(i + man.chave.length))}`;
}
// fim da oferta: domingo desta semana às 23h59 (a contagem é calculada a partir de "agora")
function prazoOferta(ctx) {
  const ag = data(ctx);
  const fim = new Date(ag);
  fim.setDate(ag.getDate() + ((7 - ag.getDay()) % 7));
  fim.setHours(23, 59, 0, 0);
  if (fim <= ag) fim.setDate(fim.getDate() + 7);
  const ms = fim - ag;
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  const rotulo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(fim);
  return { d, h, m, rotulo };
}
const endCurto = (ctx) => { const p = String(ctx.endereco || '').split(' · '); return ctx.cidade ? `${p[0]} · ${ctx.cidade.nome}/${ctx.cidade.uf}` : p.slice(0, 2).join(' · '); };
const notaNumero = (ctx) => (ctx.pack.nums.find(([v, r]) => /★|nota/i.test(v + r)) || null);
const blocosPadrao = { boas_vindas: ['passos', 'produtos'], newsletter: ['dica', 'depoimento', 'produtos'], promocao: ['produtos', 'prazo'], lancamento: ['produtos', 'depoimento'], reengajamento: ['numeros', 'depoimento', 'produtos'] };
function blocosDoEmail(ctx) {
  const e = ctx.email;
  const lista = e.blocos && e.blocos.length ? e.blocos : (blocosPadrao[e.tipo.id] || ['passos']);
  return lista.filter((b) => b !== 'prazo' || ctx.oferta);
}
const TITULO_BLOCO = {
  produtos: (ctx) => ctx.pack.itensTitulo, depoimento: () => 'O que dizem sobre nós', passos: () => 'Simples assim: 3 passos',
  dica: (ctx) => ctx.pack.dica[0], numeros: () => 'Em números', prazo: () => 'A oferta termina em', bastidores: () => 'Bastidores',
};

// ------------------------------------------------------------------ anotações de designer (só na visão ampliada)
function nota(M, titulo, texto, escolha = '', topo = null) {
  if (M.modo !== 'amp') return '';
  M.n += 1;
  M.notas.push({ n: M.n, titulo, texto, escolha });
  return `<div class="em-nota" aria-hidden="true"${topo != null ? ` style="top:${topo}px" data-topo="${topo}"` : ''}><b class="em-nota-n">${M.n}</b><div class="em-nota-c"><strong>${esc(titulo)}</strong>${escolha ? `<em>${esc(escolha)}</em>` : ''}<span>${esc(texto)}</span></div></div>`;
}
// uma seção (linha da tabela principal)
function secao(M, { id = '', bg, pad = '0', html, cls = 'em-x-papel', notaHTML = '', st = '' }) {
  const marca = M.modo !== 'export' && id ? ` data-em-sec="${id}"` : '';
  // ajuste de fundo em degradê: as seções de papel ficam transparentes e o degradê do cartão aparece (o bgcolor
  // continua como reserva para o Outlook, que não pinta degradê)
  const fundo = M.papelImg && bg === M.papel ? 'transparent' : bg;
  const classes = [cls, id ? `em-s-${id.replace(/[^a-z0-9-]/gi, '')}` : ''].filter(Boolean).join(' ');
  return `<tr><td${classes ? ` class="${classes}"` : ''} bgcolor="${bg}"${marca} style="background:${fundo};padding:${pad};${notaHTML ? 'position:relative;' : ''}${st}">${html}${notaHTML}</td></tr>`;
}

// ------------------------------------------------------------------ cabeçalhos
function cabecalho(ctx, T, M) {
  const tipo = ctx.email.cabecalho, op = rot(B.CABECALHOS_EMAIL, tipo);
  const n = nota(M, 'Cabeçalho', `${op.jev}. Acima dele, o pré-cabeçalho com “Ver no navegador”.`, op.rotulo);
  const svg = M.modo !== 'export';
  const rT = `border-radius:${T.raio}px ${T.raio}px 0 0;`;
  const faixaCores = tb(`<tr><td width="58%" height="6" style="height:6px;background:${T.acc};font-size:0;line-height:0">&nbsp;</td><td width="27%" height="6" style="height:6px;background:${T.sec};font-size:0;line-height:0">&nbsp;</td><td width="15%" height="6" style="height:6px;background:${T.tinta};font-size:0;line-height:0">&nbsp;</td></tr>`);
  if (tipo === 'faixa') {
    const logo = svg ? encaixar(logoSVG(ctx, { variante: 'inv', classe: `em-lg ${novoId()}` }), 300, logoAlto(ctx) ? 118 : 76)
      : logoHTML(ctx, T, { cor: T.onPri, corTag: T.onPriSuave, simbFundo: T.onPri, simbTinta: T.pri, tam: 30 });
    const fio = `<td class="em-x-hide" valign="middle" width="72" style="width:72px;font-size:0;line-height:0">${tb(`<tr><td style="border-top:1px solid ${T.onPriSuave};font-size:0;line-height:0;height:1px">&nbsp;</td></tr><tr><td style="height:3px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="border-top:1px solid ${T.onPriSuave};font-size:0;line-height:0;height:1px">&nbsp;</td></tr>`)}</td>`;
    const html = tb(`<tr>${fio}<td valign="middle" align="center" style="padding:0 24px;text-align:center">${logo}</td>${fio}</tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
    return secao(M, { id: 'cabecalho', bg: T.pri, pad: '36px 40px', cls: 'em-x-pad', html, notaHTML: n, st: rT })
      + `<tr><td style="padding:0;font-size:0;line-height:0">${faixaCores}</td></tr>`;
  }
  if (tipo === 'menu') {
    const logo = svg ? encaixar(logoSVG(ctx, { compacto: true, classe: `em-lg ${novoId()}` }), 230, 40)
      : logoHTML(ctx, T, { tam: 22, align: 'left', tag: false, simb: 34 });
    const links = [ctx.pack.itensTitulo, 'Sobre', 'Contato'].map((l) => `<a href="#" style="color:${T.tinta};text-decoration:none">${esc(l)}</a>`).join(`<span style="color:${T.priTxt};padding:0 10px">•</span>`);
    const html = tb(`<tr><td valign="middle" style="text-align:left">${logo}</td><td valign="middle" align="right" class="em-x-hide em-x-t" style="font-family:${T.fBody};font-size:12px;line-height:16px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${T.tinta};white-space:nowrap">${links}</td></tr>`);
    return secao(M, { id: 'cabecalho', bg: T.papel, pad: '24px 48px', cls: 'em-x-papel em-x-pad em-x-l', html, notaHTML: n, st: `border-bottom:1px solid ${T.linha};${rT}` });
  }
  if (tipo === 'central') {
    const logo = svg ? encaixar(logoSVG(ctx, { classe: `em-lg ${novoId()}` }), 380, logoAlto(ctx) ? 150 : 96)
      : logoHTML(ctx, T, { tam: 40, empilhado: true, simb: 64 });
    const orn = tb(`<tr><td width="64" style="border-top:1px solid ${T.linha};font-size:0;line-height:0">&nbsp;</td><td width="28" align="center" valign="middle" style="font-size:0;line-height:0">${tb(`<tr><td width="8" height="8" style="width:8px;height:8px;background:${T.priTxt};border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}</td><td width="64" style="border-top:1px solid ${T.linha};font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '156', align: 'center', st: 'margin:0 auto' });
    const slogan = para(T, `<i>${esc(ctx.marca.slogan)}</i>`, { size: 14, lh: 20, align: 'center', mb: 20, cor: T.suave });
    return secao(M, { id: 'cabecalho', bg: T.papel, pad: '48px 48px 8px', cls: 'em-x-papel em-x-pad', html: `<div style="text-align:center">${logo}</div>${esp(20)}${slogan}${orn}`, notaHTML: n, st: rT });
  }
  // fino
  const s = svg ? simboloSVG(ctx, { tamanho: 28, classe: `em-lg ${novoId()}` }).replace('<svg ', '<svg style="display:block" ') : simboloHTML(ctx, T, 28);
  const d = data(ctx);
  const html = tb(`<tr><td valign="middle" width="36" style="width:36px">${s}</td><td valign="middle" class="em-x-t" style="font-family:${T.fBody};font-size:14px;line-height:18px;font-weight:700;color:${T.tinta};letter-spacing:.01em">${esc(ctx.nome)}</td><td valign="middle" align="right" class="em-x-s" style="font-family:${T.fBody};font-size:12px;line-height:16px;color:${T.suave};letter-spacing:.06em;text-transform:uppercase;white-space:nowrap">${d.getDate()} ${MESES_CURTOS[d.getMonth()]} ${d.getFullYear()}</td></tr>`);
  return secao(M, { id: 'cabecalho', bg: T.papel, pad: '16px 48px', cls: 'em-x-papel em-x-pad em-x-l', html, notaHTML: n, st: `border-bottom:1px solid ${T.linha};border-top:4px solid ${T.pri};${rT}` });
}

// ------------------------------------------------------------------ destaques (hero)
function introP(T, M, ctx, opts = {}) {
  const campo = M.modo !== 'export' ? ' data-campo="email"' : '';
  return para(T, esc(ctx.email.intro), { size: 17, lh: 28, mb: 32, campo, ...opts });
}
function medalhaHTML(ctx, T, tam, { fundo = T.acc, tinta = T.onAcc, anel = mix(T.pri, T.onPri, 0.16), emoji = ctx.emojiNivel >= 1 } = {}) {
  const miolo = Math.round(tam * 0.72);
  const conteudo = emoji ? `<span style="font-size:${Math.round(miolo * 0.46)}px;line-height:${miolo}px">${ctx.emo}</span>` : `<span style="font-family:${T.script || T.fLogo};font-size:${Math.round(miolo * 0.5)}px;line-height:${miolo}px;font-weight:${T.lw};color:${tinta}">${esc(letrasSimbolo(ctx))}</span>`;
  const dentro = tb(`<tr><td width="${miolo}" height="${miolo}" align="center" valign="middle" style="width:${miolo}px;height:${miolo}px;border-radius:50%;background:${fundo};text-align:center">${conteudo}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
  return tb(`<tr><td width="${tam}" height="${tam}" align="center" valign="middle" style="width:${tam}px;height:${tam}px;border-radius:50%;background:${anel}">${dentro}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
}

function hero(ctx, T, M, man) {
  const e = ctx.email;
  let tipoHero = e.hero;
  const recuo = tipoHero === 'cupom' && !ctx.oferta; // cupom sem oferta ativa: vira título gigante
  if (recuo) tipoHero = 'tipografico';
  const op = rot(B.HEROS_EMAIL, e.hero);
  const narrativa = {
    boas_vindas: 'sobretítulo, título e intro giram em torno do presente de primeira compra',
    newsletter: 'abre com o sumário “Nesta edição” e traz os bastidores do pacote no meio',
    promocao: 'faixa “Por tempo limitado” com o prazo calculado logo abaixo do cabeçalho',
    lancamento: `cartão de novidade com “${ctx.itens[3].nome}”, o item novo do pacote`,
    reengajamento: ctx.oferta ? 'lembra do presente guardado, com o cupom à mão' : 'fala com quem sumiu e mostra o que mudou por aqui',
  }[e.tipo.id] || '';
  const n = nota(M, 'Destaque', `${recuo ? 'Sem oferta ativa, o cupom virou título gigante. ' : ''}${op.jev}. Botão “${e.cta.texto}” à prova de falha (VML no Outlook).`, op.rotulo, 104)
    + nota(M, 'Tipo de e-mail', `${e.tipo.jev}: ${narrativa}.`, e.tipo.rotulo, 250);
  const btn = (o = {}) => botao(T, M, e.cta.texto, o);
  const svg = M.modo !== 'export';

  if (tipoHero === 'ilustracao') {
    const fundoArte = T.dk ? T.cartao : T.soft;
    let visual;
    if (svg) {
      const a = arte(ctx.site.img || 'flat', { icone: ctx.icone, c: ctx.marca.cores, w: 600, h: 300, semente: ctx.nome, id: novoId(), apoio: ctx.apoio || [], faixa: ctx.oferta ? ctx.oferta.curta : '' });
      visual = `<div style="height:300px;line-height:0">${a.replace('<svg ', '<svg width="600" height="300" style="display:block;width:100%;height:300px" ')}</div>`;
    } else {
      visual = `<div style="padding:48px 24px 40px;text-align:center">${medalhaHTML(ctx, T, 208, { fundo: T.acc, tinta: T.onAcc, anel: mix(fundoArte, T.pri, 0.18) })}${esp(24)}${ctx.oferta ? tb(`<tr><td style="background:${T.pri};border-radius:999px;padding:8px 20px;font-family:${T.fBody};font-size:12px;line-height:16px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${T.onPri}">${esc(ctx.oferta.curta)}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' }) : ''}</div>`;
    }
    const corpo = `${kicker(T, `${man.kicker} · ${ctx.nome}`, { align: 'center', traco: false })}${titulo(T, comChave(T, man), { tag: 'h1', size: caber(man.titulo, T, 504, 46, 30, 2), align: 'center', cls: 'em-x-h1 em-x-t', mb: 16, lh: 1.06 })}${introP(T, M, ctx, { align: 'center' })}${btn()}`;
    return secao(M, { id: 'hero', bg: fundoArte, pad: '0', cls: 'em-x-soft', html: visual, notaHTML: n })
      + secao(M, { bg: T.papel, pad: '40px 48px 56px', cls: 'em-x-papel em-x-pad em-s-hero', html: corpo });
  }

  if (tipoHero === 'tipografico') {
    const giant = man.chave || (e.tipo.id === 'newsletter' ? cap(man.mes) : man.titulo);
    const so = !man.chave && giant === man.titulo;
    const size = caber(giant, T, 504, so ? 76 : 132, 48, so ? 3 : 2);
    const maior = Math.max(...String(T.up ? giant.toUpperCase() : giant).split(/\s+/).map((w) => largura100(w, T)));
    M.gigante = Math.round(clamp(Math.min(68, (100 * 296) / Math.max(1, maior) * 0.92), 36, 68));
    const topo = man.chave && man.pre ? titulo(T, esc(man.pre), { size: 28, cor: T.tit || T.tinta, mb: 4, cls: 'em-x-t' }) : '';
    const grande = `<h1 class="em-x-giant em-x-p" style="margin:0 0 ${man.chave && man.pos ? 8 : 20}px;font-family:${T.fDisp};font-size:${size}px;line-height:${Math.round(size * (T.up ? 0.92 : 1.02))}px;font-weight:${T.dw};letter-spacing:${T.up ? '0' : '-.03em'};${T.up ? 'text-transform:uppercase;' : ''}color:${T.priTxt};overflow-wrap:break-word;word-wrap:break-word;mso-line-height-rule:exactly">${esc(giant)}</h1>`;
    const baixo = man.chave ? (man.pos ? titulo(T, esc(man.pos), { size: 30, mb: 24, cls: 'em-x-t', italico: T.ital }) : '') : (!so ? titulo(T, esc(man.titulo), { size: 30, mb: 24, cls: 'em-x-t' }) : '');
    const regua = tb(`<tr><td width="64" height="3" style="width:64px;height:3px;background:${T.pri};font-size:0;line-height:0">&nbsp;</td><td style="font-size:0;line-height:0">&nbsp;</td></tr>`);
    const corpo = `${kicker(T, `${man.kicker} · ${ctx.nome}`)}${topo}${grande}${baixo}${regua}${esp(24)}${introP(T, M, ctx)}${btn({ align: 'left' })}`;
    return secao(M, { id: 'hero', bg: T.papel, pad: '56px 48px 56px', cls: 'em-x-papel em-x-pad', html: corpo, notaHTML: n, st: `background-image:linear-gradient(180deg,${T.soft} 0,${T.papel} 62%);` });
  }

  if (tipoHero === 'cupom') {
    const of = ctx.oferta;
    const stub = mix(T.pri, '#000000', T.dk ? 0.35 : 0.22), perfCor = mix(T.pri, T.onPri, 0.45);
    const R = rnd('bar' + ctx.nome);
    const barras = Array.from({ length: 22 }, (_, i) => `<td width="${1 + Math.round(R() * 2)}" style="width:${1 + Math.round(R() * 2)}px;height:28px;background:${i % 2 ? 'transparent' : T.onPri};font-size:0;line-height:0">&nbsp;</td>`).join('');
    const sz = caber(of.curta, T, 250, 72, 40, 2);
    const ticket = tb(`<tr>
      <td class="em-x-hide" width="132" valign="middle" align="center" bgcolor="${stub}" style="width:132px;background:${stub};border-radius:${Math.min(T.raio, 16)}px 0 0 ${Math.min(T.raio, 16)}px;padding:24px 12px">
        ${simboloHTML(ctx, T, 44, { fundo: T.onPri, tinta: T.pri })}${esp(12)}
        <p style="margin:0;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.3em;color:${T.onPri}">CUPOM</p>${esp(12)}
        ${tb(`<tr>${barras}</tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}
      </td>
      <td class="em-x-hide" width="24" valign="top" bgcolor="${T.pri}" style="width:24px;background:${T.pri};padding:0">
        ${tb(`<tr><td height="12" style="height:12px;background:${T.papel};border-radius:0 0 12px 12px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td height="150" align="center" style="height:150px;font-size:0;line-height:0">${tb(`<tr><td width="1" height="150" style="width:0;height:150px;border-left:2px dashed ${perfCor};font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}</td></tr><tr><td height="12" style="height:12px;background:${T.papel};border-radius:12px 12px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>`)}
      </td>
      <td valign="middle" bgcolor="${T.pri}" style="background:${T.pri};border-radius:0 ${Math.min(T.raio, 16)}px ${Math.min(T.raio, 16)}px 0;padding:24px 28px">
        <p style="margin:0 0 6px;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:${T.onPriSuave}">Presente para você</p>
        <p style="margin:0 0 6px;font-family:${T.fDisp};font-size:${sz}px;line-height:${Math.round(sz * 0.95)}px;font-weight:${T.dw};letter-spacing:${T.up ? '.01em' : '-.02em'};${T.up ? 'text-transform:uppercase;' : ''}color:${T.onPri}">${esc(of.curta)}</p>
        <p style="margin:0 0 16px;font-family:${T.fBody};font-size:14px;line-height:20px;color:${T.onPri}">${esc(cap(of.frase))}</p>
        ${tb(`<tr><td style="border:2px dashed ${T.onPri};border-radius:8px;padding:8px 16px;font-family:'Courier New',Courier,monospace;font-size:18px;line-height:22px;font-weight:700;letter-spacing:.24em;color:${T.onPri}">BEMVINDO</td></tr>`, { w: '' })}
      </td></tr>`, { st: 'margin:0 auto' });
    const corpo = `${kicker(T, `${man.kicker} · ${ctx.nome}`, { align: 'center', traco: false })}${titulo(T, comChave(T, man), { tag: 'h1', size: caber(man.titulo, T, 504, 40, 28, 2), align: 'center', cls: 'em-x-h1 em-x-t', mb: 32 })}${ticket}${esp(32)}${introP(T, M, ctx, { align: 'center' })}${btn()}`;
    return secao(M, { id: 'hero', bg: T.papel, pad: '56px 48px', cls: 'em-x-papel em-x-pad', html: corpo, notaHTML: n });
  }

  if (tipoHero === 'produto') {
    const it = e.tipo.id === 'lancamento' ? ctx.itens[3] : ctx.itens[0];
    const selo = e.tipo.id === 'lancamento' ? 'Novidade' : 'Destaque';
    const fundoV = T.dk ? T.soft : T.soft2;
    const visual = svg
      ? `<div style="height:300px;line-height:0">${arte(ctx.site.img || 'flat', { icone: ctx.icone, c: ctx.marca.cores, w: 208, h: 300, semente: it.nome, id: novoId(), apoio: ctx.apoio || [] }).replace('<svg ', '<svg width="208" height="300" style="display:block" ')}</div>`
      : `<div style="padding:40px 16px">${medalhaHTML(ctx, T, 152, { fundo: T.pri, tinta: T.onPri, anel: mix(fundoV, T.pri, 0.2) })}</div>`;
    const temPreco = typeof it.base === 'number';
    const card = tb(`<tr>
      <td class="em-x-col" width="208" valign="middle" align="center" bgcolor="${fundoV}" style="width:208px;background:${fundoV};border-radius:${T.raio}px 0 0 ${T.raio}px">${visual}</td>
      <td class="em-x-col em-x-card" valign="middle" bgcolor="${T.cartao}" style="background:${T.cartao};border-radius:0 ${T.raio}px ${T.raio}px 0;padding:32px 24px">
        ${tb(`<tr><td style="background:${T.acc};border-radius:999px;padding:5px 12px;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${T.onAcc}">${selo}</td></tr>`, { w: '' })}${esp(16)}
        ${titulo(T, escT(it.nome), { tag: 'h2', size: caber(it.nome, T, 240, 30, 20, 2), mb: 10, cls: 'em-x-t' })}
        ${para(T, esc(cap(it.desc)), { size: 14, lh: 22, mb: 20 })}
        <p style="margin:0 0 20px;font-family:${T.fDisp};font-size:${temPreco ? 34 : 22}px;line-height:${temPreco ? 38 : 28}px;font-weight:${T.dw};color:${T.priTxt};letter-spacing:${T.up ? '.01em' : '-.01em'}">${esc(it.preco)}</p>
        ${botao(T, M, e.cta.texto, { tam: 'p', align: 'left', contraFundo: T.cartao, maxW: 248 })}
      </td></tr>`);
    const corpo = `${kicker(T, `${man.kicker} · ${ctx.nome}`)}${titulo(T, comChave(T, man), { tag: 'h1', size: caber(man.titulo, T, 504, 42, 28, 2), mb: 16, cls: 'em-x-h1 em-x-t' })}${introP(T, M, ctx)}${card}`;
    return secao(M, { id: 'hero', bg: T.papel, pad: '56px 48px', cls: 'em-x-papel em-x-pad', html: corpo, notaHTML: n });
  }

  // carta pessoal assinada
  const a = e.ass;
  const papelCarta = T.dk ? T.cartao : mix(T.papel, '#ffffff', 0.6);
  const correio = tb(`<tr>${Array.from({ length: 12 }, (_, i) => `<td height="6" style="height:6px;background:${[T.pri, papelCarta, T.sec, papelCarta][i % 4]};font-size:0;line-height:0">&nbsp;</td>`).join('')}</tr>`);
  const selo = tb(`<tr><td style="border:2px dashed ${mix(papelCarta, T.priTxt, 0.55)};border-radius:4px;padding:6px">${tb(`<tr><td align="center" style="background:${T.soft};padding:10px 10px 8px;text-align:center">${svg ? simboloSVG(ctx, { tamanho: 40, classe: `em-lg ${novoId()}` }).replace('<svg ', '<svg style="display:block;margin:0 auto" ') : simboloHTML(ctx, T, 40)}<p style="margin:6px 0 0;font-family:${T.fBody};font-size:9px;line-height:12px;font-weight:800;letter-spacing:.2em;color:${T.priTxt}">${esc((ctx.cidade ? ctx.cidade.nome : ctx.pack.label).toUpperCase())}</p></td></tr>`, { w: '' })}</td></tr>`, { w: '', align: 'right' });
  const famMao = T.script || (T.up ? T.fBody : T.fDisp);
  const assinaturaMao = `<p class="em-x-p" style="margin:0 0 4px;font-family:${famMao};font-size:${T.script ? 40 : 30}px;line-height:${T.script ? 44 : 36}px;font-weight:${T.script ? 700 : T.up ? 700 : T.dw};${T.script ? '' : 'font-style:italic;'}color:${T.priTxt};letter-spacing:${T.up ? '-.01em' : '0'}">${esc(a.nome)}</p>`;
  const cartaHTML = `${correio}${tb(`<tr><td class="em-x-pad" style="padding:40px 44px 44px">
      ${tb(`<tr><td valign="top">${kicker(T, man.kicker, { mb: 20 })}${titulo(T, comChave(T, man), { tag: 'h1', size: caber(man.titulo, T, 300, 34, 26, 3), mb: 0, cls: 'em-x-h1 em-x-t' })}</td><td valign="top" width="96" class="em-x-hide" style="width:96px;padding-left:16px">${selo}</td></tr>`)}
      ${esp(24)}${para(T, `${T.formal ? 'Olá,' : 'Oi!'}`, { size: 18, lh: 28, cor: T.tinta, mb: 12, cls: 'em-x-t' })}
      ${para(T, esc(e.intro), { size: 18, lh: 30, cor: T.tinta, mb: 28, campo: svg ? ' data-campo="email"' : '', cls: 'em-x-t' })}
      ${para(T, T.formal ? 'Atenciosamente,' : 'Um abraço,', { size: 16, lh: 24, mb: 6 })}
      ${assinaturaMao}${para(T, `${esc(a.cargo)} · ${esc(ctx.nome)}`, { size: 13, lh: 20, mb: 32 })}
      ${botao(T, M, e.cta.texto, { align: 'left', contraFundo: papelCarta })}
    </td></tr>`)}`;
  const envelope = tb(`<tr><td class="em-x-card" bgcolor="${papelCarta}" style="background:${papelCarta};border:1px solid ${T.linha};border-radius:${Math.min(T.raio, 10)}px;overflow:hidden">${cartaHTML}</td></tr>`);
  return secao(M, { id: 'hero', bg: T.dk ? T.papel : T.soft, pad: '48px 40px', cls: 'em-x-soft em-x-pad', html: envelope, notaHTML: n });
}

// ------------------------------------------------------------------ blocos
function cabBloco(T, k, t, align = 'left') {
  return `${kicker(T, k, { align, traco: align === 'left' })}${titulo(T, esc(t), { size: 30, mb: 28, align, cls: 'em-x-h2 em-x-t' })}`;
}
function blocoProdutos(ctx, T, M, excluir) {
  const itens = ctx.itens.filter((it) => it.i !== excluir).slice(0, 4);
  const tons = T.dk ? [T.cartao, mix(T.cartao, T.pri, 0.1), mix(T.cartao, T.sec, 0.1), mix(T.cartao, T.acc, 0.08)]
    : [T.soft, T.soft2, mix(T.papel, T.acc, 0.2), mix(T.papel, T.pri, 0.07)];
  const icones = [ctx.icone, (ctx.apoio || [])[0] || ctx.icone, (ctx.apoio || [])[1] || ctx.icone, ctx.icone];
  const svg = M.modo !== 'export';
  const tres = itens.length === 3;
  const porLinha = tres ? 3 : 2;
  const cel = (it, j) => {
    const fundo = tons[j % 4];
    const [corMed, tintaMed] = [[T.pri, T.onPri], [T.sec, T.onSec], [T.acc, T.onAcc], [T.tinta, T.papel]][j % 4];
    const tintaCard = sobre(fundo, T.tinta), suaveCard = sobre(fundo, T.suave, T.tinta);
    const halo = mix(fundo, T.tinta, 0.22);
    const tm = tres ? 56 : 64, th = tres ? 84 : 96;
    const miolo = svg
      ? `<svg width="${tm}" height="${tm}" viewBox="0 0 64 64" style="display:block;margin:0 auto" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${corMed}"/><g transform="translate(16 16) scale(1.333)" fill="none" stroke="${tintaMed}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icones[j].svg}</g></svg>`
      : tb(`<tr><td width="${tm}" height="${tm}" align="center" valign="middle" style="width:${tm}px;height:${tm}px;border-radius:50%;background:${corMed};font-family:${T.fDisp};font-size:${Math.round(tm * 0.42)}px;line-height:${tm}px;font-weight:${T.dw};color:${tintaMed};text-align:center;${T.up ? 'text-transform:uppercase;' : ''}">${ctx.emojiNivel >= 1 ? ctx.emo : esc(it.nome[0])}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
    const med = tb(`<tr><td width="${th}" height="${th}" align="center" valign="middle" style="width:${th}px;height:${th}px;border:1px dashed ${halo};border-radius:50%">${miolo}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
    const precoTxt = typeof it.base === 'number' ? it.preco : cap(it.preco);
    const furo = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${fundo};vertical-align:1px;margin-right:6px"></span>`;
    const precoTag = tb(`<tr><td style="background:${T.acc};border-radius:4px 999px 999px 4px;padding:5px 11px 5px 8px;font-family:${T.fBody};font-size:${typeof it.base === 'number' ? 13 : 11}px;line-height:16px;font-weight:800;color:${T.onAcc};white-space:nowrap">${furo}${esc(precoTxt)}</td></tr>`, { w: '', align: 'right' });
    const nomeSz = tres ? 17 : 20;
    const esq = j % porLinha === 0, dir = j % porLinha === porLinha - 1;
    return `<td class="em-x-col" width="${tres ? '33%' : '50%'}" valign="top" style="padding:0 ${dir ? 0 : 8}px 16px ${esq ? 0 : 8}px">
      ${tb(`<tr><td class="em-x-card" bgcolor="${fundo}" style="background:${fundo};border-radius:${T.raio}px;padding:16px 16px 20px">
        ${tb(`<tr><td valign="middle" style="font-family:${T.fDisp};font-size:15px;line-height:18px;font-weight:${T.dw};color:${suaveCard};letter-spacing:.04em">${String(j + 1).padStart(2, '0')}</td><td valign="middle" align="right">${precoTag}</td></tr>`)}
        ${esp(tres ? 8 : 12)}${med}${esp(tres ? 14 : 18)}
        <p class="em-x-t" style="margin:0 0 6px;font-family:${T.fDisp};font-size:${Math.round(nomeSz * T.k)}px;line-height:${Math.round(nomeSz * T.k * 1.12)}px;font-weight:${T.dw};${T.up ? 'text-transform:uppercase;letter-spacing:.01em;' : `letter-spacing:${T.tr};`}color:${tintaCard}">${escT(it.nome)}</p>
        <p class="em-x-s" style="margin:0 0 14px;font-family:${T.fBody};font-size:13px;line-height:19px;color:${suaveCard}">${esc(cap(it.desc))}</p>
        <a href="#" style="font-family:${T.fBody};font-size:13px;line-height:16px;font-weight:800;color:${sobre(fundo, T.priTxt, T.tinta)};text-decoration:none;letter-spacing:.02em">Quero este&nbsp;&rarr;</a>
      </td></tr>`)}
    </td>`;
  };
  let linhas = '';
  for (let i = 0; i < itens.length; i += porLinha) linhas += `<tr>${itens.slice(i, i + porLinha).map((it, k) => cel(it, i + k)).join('')}</tr>`;
  const ver = `<p style="margin:8px 0 0;text-align:center;font-family:${T.fBody};font-size:14px;line-height:20px;font-weight:700"><a href="#" class="em-x-p" style="color:${T.priTxt};text-decoration:underline">Ver ${esc(ctx.pack.itensTitulo.toLowerCase())} completo</a></p>`;
  return { bg: T.papel, pad: '56px 48px 48px', html: `${cabBloco(T, 'Escolha o seu', ctx.pack.itensTitulo)}${tb(linhas)}${ver}` };
}
function blocoDepoimento(ctx, T) {
  const [d0, d1, d2] = ctx.pack.depo;
  const fundo = T.cartao;
  const corAspas = sobre(fundo, T.acc, T.priTxt);
  const aspas = `${esp(20)}<p style="margin:0;font-family:${T.up ? "Georgia,'Times New Roman',serif" : T.fDisp};font-size:120px;line-height:84px;height:64px;font-weight:${T.up ? 700 : T.dw};color:${corAspas};text-align:center;mso-line-height-rule:exactly">“</p>`;
  const autor = (nome, tam = 32) => tb(`<tr><td valign="middle">${tb(`<tr><td width="${tam}" height="${tam}" align="center" valign="middle" style="width:${tam}px;height:${tam}px;border-radius:50%;background:${T.pri};font-family:${T.fBody};font-size:${Math.round(tam * 0.38)}px;line-height:${tam}px;font-weight:800;color:${T.onPri};text-align:center">${esc(iniciais(nome))}</td></tr>`, { w: '' })}</td><td valign="middle" class="em-x-t" style="padding-left:10px;font-family:${T.fBody};font-size:14px;line-height:18px;font-weight:700;color:${T.tinta}">${esc(nome)}</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
  const menor = (d) => `${estrelas(corAspas, 12)}${esp(8)}<p class="em-x-t" style="margin:0 0 12px;font-family:${T.fBody};font-size:14px;line-height:22px;color:${T.tinta}">“${esc(d[0])}”</p><p class="em-x-s" style="margin:0;font-family:${T.fBody};font-size:12px;line-height:16px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${T.suave}">${esc(d[1])}</p>`;
  const html = `${kicker(T, 'Quem conhece, recomenda', { align: 'center', traco: false, mb: 8 })}${aspas}
    ${T.up
    ? `<p class="em-x-t" style="margin:0 0 20px;font-family:${T.fBody};font-size:22px;line-height:32px;font-weight:600;color:${T.tinta};text-align:center;letter-spacing:-.005em">${esc(d0[0])}</p>`
    : titulo(T, esc(d0[0]), { tag: 'p', size: caber(d0[0], T, 480, 26, 20, 4), lh: 1.3, align: 'center', mb: 20, cls: 'em-x-t', italico: T.ital, tracking: '0' })}
    <div style="text-align:center">${estrelas(corAspas, 16)}</div>${esp(12)}${autor(d0[1])}${esp(32)}
    ${d1 && d2 ? tb(`<tr><td colspan="2" style="border-top:1px solid ${T.linha};font-size:0;line-height:0;height:1px">&nbsp;</td></tr><tr><td class="em-x-col" width="50%" valign="top" style="padding:28px 16px 0 0">${menor(d1)}</td><td class="em-x-col" width="50%" valign="top" style="padding:28px 0 0 16px;border-left:1px solid ${T.linha}">${menor(d2)}</td></tr>`) : ''}`;
  return { bg: fundo, cls: 'em-x-card', pad: '48px 48px 48px', html };
}
function blocoPassos(ctx, T) {
  const ps = ctx.pack.passos.slice(0, 3);
  const cel = (p, i) => `<td class="em-x-col" width="33%" valign="top" style="padding:0 ${i < 2 ? 12 : 0}px 0 ${i > 0 ? 12 : 0}px">
      ${tb(`<tr><td width="44" height="44" align="center" valign="middle" style="width:44px;min-width:44px;height:44px;border-radius:${T.raio >= 12 ? '50%' : '4px'};background:${i === 0 ? T.pri : i === 1 ? T.sec : T.acc};font-family:${T.fDisp};font-size:18px;line-height:44px;font-weight:${T.dw};color:${i === 0 ? T.onPri : i === 1 ? T.onSec : T.onAcc};text-align:center">${i + 1}</td>${i < 2 ? `<td class="em-x-hide" valign="middle" style="padding-left:10px"><div style="border-top:2px dotted ${T.linha};height:0;line-height:0;font-size:0">&nbsp;</div></td>` : '<td class="em-x-hide">&nbsp;</td>'}</tr>`, { cls: 'em-x-auto' })}
      ${esp(16)}<p class="em-x-t" style="margin:0 0 8px;font-family:${T.fDisp};font-size:${Math.round(18 * T.k)}px;line-height:${Math.round(18 * T.k * 1.2)}px;font-weight:${T.dw};${T.up ? 'text-transform:uppercase;letter-spacing:.01em;' : `letter-spacing:${T.tr};`}color:${T.tit || T.tinta}">${esc(p[0])}</p>
      <p class="em-x-s" style="margin:0 0 16px;font-family:${T.fBody};font-size:14px;line-height:21px;color:${T.suave}">${esc(p[1])}</p></td>`;
  return { bg: T.papel, pad: '56px 48px 40px', html: `${cabBloco(T, 'Como funciona', 'Simples assim: 3 passos')}${tb(`<tr>${ps.map(cel).join('')}</tr>`)}` };
}
function blocoDica(ctx, T) {
  const [t, x] = ctx.pack.dica, a = ctx.email.ass;
  const lamp = ctx.emojiNivel >= 1 ? '💡 ' : '';
  const card = tb(`<tr><td width="6" style="width:6px;background:${T.pri};border-radius:${Math.min(T.raio, 12)}px 0 0 ${Math.min(T.raio, 12)}px;font-size:0;line-height:0">&nbsp;</td><td class="em-x-soft" bgcolor="${T.soft}" style="background:${T.soft};border-radius:0 ${Math.min(T.raio, 12)}px ${Math.min(T.raio, 12)}px 0;padding:32px 32px 28px">
      <p style="margin:0 0 12px;font-family:${T.fBody};font-size:12px;line-height:16px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${sobre(T.soft, T.priTxt, T.tinta)}">${lamp}Dica</p>
      ${titulo(T, esc(t), { tag: 'h3', size: caber(t, T, 440, 26, 20, 2), mb: 12, cls: 'em-x-t' })}
      ${para(T, esc(x), { size: 16, lh: 26, cor: sobre(T.soft, T.suave, T.tinta), mb: 16 })}
      <p class="em-x-s" style="margin:0;font-family:${T.fBody};font-size:13px;line-height:18px;font-style:italic;color:${sobre(T.soft, T.suave, T.tinta)}">— ${esc(a.nome)}, ${esc(a.cargo.toLowerCase())}</p>
    </td></tr>`);
  return { bg: T.papel, pad: '24px 48px 48px', html: card };
}
function blocoNumeros(ctx, T) {
  const ns = ctx.pack.nums.slice(0, 3);
  const cor = sobre(T.deep, T.acc, T.pri, T.onDeep);
  const cel = (n, i) => `<td class="em-x-col em-x-num" width="33%" align="center" valign="top" style="padding:0 12px;${i ? `border-left:1px solid ${mix(T.deep, T.onDeep, 0.18)};` : ''}">
      <p style="margin:0 0 8px;font-family:${T.fDisp};font-size:${caber(n[0], T, 150, 40, 24)}px;line-height:1.05;font-weight:${T.dw};${T.up ? 'text-transform:uppercase;' : ''}letter-spacing:${T.up ? '.01em' : '-.02em'};color:${cor}">${esc(n[0])}</p>
      <p style="margin:0;font-family:${T.fBody};font-size:11px;line-height:16px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${T.onDeepSuave}">${esc(n[1])}</p></td>`;
  return { bg: T.deep, cls: 'em-x-deep', pad: '48px 36px', html: tb(`<tr>${ns.map(cel).join('')}</tr>`) };
}
function blocoPrazo(ctx, T) {
  const p = prazoOferta(ctx);
  const fundo = T.dk ? T.cartao : mix(T.papel, T.acc, 0.22);
  const caixaN = (v, r) => `<td align="center" valign="top" style="padding:0 6px">${tb(`<tr><td width="84" height="84" align="center" valign="middle" style="width:84px;height:84px;border-radius:${Math.min(T.raio, 14)}px;background:${T.tinta};font-family:${T.fDisp};font-size:42px;line-height:84px;font-weight:${T.dw};color:${T.papel};text-align:center;letter-spacing:.02em">${String(v).padStart(2, '0')}</td></tr>`, { w: '' })}<p style="margin:10px 0 0;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${sobre(fundo, T.suave, T.tinta)}">${r}</p></td>`;
  const dois = `<td valign="top" style="padding-top:22px;font-family:${T.fDisp};font-size:30px;line-height:36px;color:${sobre(fundo, T.priTxt, T.tinta)}">:</td>`;
  const html = `${kicker(T, 'A oferta termina em', { align: 'center', traco: false, cor: sobre(fundo, T.priTxt, T.tinta), mb: 20 })}
    ${tb(`<tr>${caixaN(p.d, 'dias')}${dois}${caixaN(p.h, 'horas')}${dois}${caixaN(p.m, 'min')}</tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}${esp(20)}
    ${para(T, `${esc(cap(ctx.oferta.frase))} · válida até ${esc(p.rotulo)}.`, { size: 14, lh: 22, align: 'center', cor: sobre(fundo, T.tinta), cls: 'em-x-t' })}`;
  return { bg: T.papel, pad: '8px 48px 48px', html: tb(`<tr><td class="em-x-card" bgcolor="${fundo}" style="background:${fundo};border-radius:${T.raio}px;padding:32px 24px">${html}</td></tr>`) };
}

// ------------------------------------------------------------------ elementos da narrativa de cada tipo
// promoção: faixa de urgência logo abaixo do cabeçalho, com o prazo calculado
function faixaUrgencia(ctx, T) {
  const p = prazoOferta(ctx);
  const cor = T.onAcc;
  return `<p style="margin:0;font-family:${T.fBody};font-size:13px;line-height:18px;color:${cor};text-align:center;letter-spacing:.02em">${ctx.emojiNivel >= 1 ? '⏰&nbsp; ' : ''}<b style="letter-spacing:.14em;text-transform:uppercase;font-size:11px">Por tempo limitado</b>&nbsp; · &nbsp;termina ${esc(p.rotulo)}</p>`;
}
// lançamento: cartão de novidade com o item novo (quando o destaque não é o próprio produto)
function cartaoNovidade(ctx, T, M) {
  const it = ctx.itens[3], svg = M.modo !== 'export';
  const fundo = T.dk ? T.cartao : T.soft2;
  const selo = tb(`<tr><td width="104" height="104" align="center" valign="middle" style="width:104px;height:104px;border-radius:50%;background:${T.pri};text-align:center">
      <p style="margin:0;font-family:${T.fBody};font-size:10px;line-height:12px;font-weight:800;letter-spacing:.24em;color:${T.onPriSuave}">CHEGOU</p>
      <p style="margin:2px 0 0;font-family:${T.fDisp};font-size:${Math.round(26 * T.k)}px;line-height:${Math.round(28 * T.k)}px;font-weight:${T.dw};${T.up ? 'text-transform:uppercase;' : ''}color:${T.onPri}">Novo</p></td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' });
  const icone = svg ? `<svg width="40" height="40" viewBox="0 0 24 24" style="display:block;margin:0 auto 10px" fill="none" stroke="${sobre(fundo, T.priTxt, T.tinta)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ctx.icone.svg}</svg>` : '';
  return tb(`<tr><td class="em-x-col" width="136" valign="middle" align="center" style="width:136px;padding:24px 8px 24px 24px">${icone}${selo}</td>
    <td class="em-x-col" valign="middle" style="padding:28px 28px 28px 16px">
      <p style="margin:0 0 8px;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${sobre(fundo, T.priTxt, T.tinta)}">Em primeira mão</p>
      ${titulo(T, escT(it.nome), { tag: 'h3', size: caber(it.nome, T, 300, 28, 20, 2), mb: 8, cor: sobre(fundo, T.tit || T.tinta, T.tinta), cls: 'em-x-t' })}
      ${para(T, esc(cap(it.desc)), { size: 14, lh: 21, mb: 14, cor: sobre(fundo, T.suave, T.tinta) })}
      <p style="margin:0;font-family:${T.fDisp};font-size:22px;line-height:26px;font-weight:${T.dw};color:${sobre(fundo, T.priTxt, T.tinta)}">${esc(it.preco)} <a href="#" style="font-family:${T.fBody};font-size:13px;font-weight:800;color:${sobre(fundo, T.priTxt, T.tinta)};text-decoration:none;margin-left:10px">Quero conhecer&nbsp;&rarr;</a></p>
    </td></tr>`, { st: `background:${fundo};border-radius:${T.raio}px;` });
}
// newsletter: bastidores (texto do pacote) como um aparte editorial
function blocoBastidores(ctx, T) {
  const a = ctx.email.ass;
  const html = tb(`<tr><td width="4" style="width:4px;background:${T.secTxt};font-size:0;line-height:0">&nbsp;</td><td style="padding:4px 0 4px 24px">
      ${kicker(T, 'Bastidores', { traco: false, mb: 10, cor: T.secTxt })}
      <p class="em-x-t" style="margin:0 0 12px;font-family:${T.up ? T.fBody : T.fDisp};font-size:${T.up ? 20 : 24}px;line-height:${T.up ? 30 : 32}px;font-style:italic;font-weight:${T.up ? 400 : Math.min(T.dw, 500)};color:${T.tinta}">${esc(ctx.pack.bastidor)}</p>
      <p class="em-x-s" style="margin:0;font-family:${T.fBody};font-size:13px;line-height:18px;color:${T.suave}">${esc(a.nome)} · ${esc(a.cargo)}</p></td></tr>`);
  return { bg: T.papel, pad: '32px 48px 40px', html };
}
// reengajamento: o presente guardado (a oferta) numa faixa de ticket
function presenteGuardado(ctx, T) {
  const of = ctx.oferta;
  const fundo = T.dk ? T.cartao : mix(T.papel, T.acc, 0.24);
  return tb(`<tr><td valign="middle" width="88" align="center" style="width:88px;padding:20px 0 20px 20px;font-size:40px;line-height:44px">${ctx.emojiNivel >= 1 ? '🎁' : simboloHTML(ctx, T, 48)}</td>
    <td valign="middle" style="padding:20px 24px 20px 16px">
      <p style="margin:0 0 4px;font-family:${T.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${sobre(fundo, T.priTxt, T.tinta)}">Guardamos um presente para você</p>
      <p style="margin:0;font-family:${T.fDisp};font-size:${Math.round(22 * T.k)}px;line-height:${Math.round(28 * T.k)}px;font-weight:${T.dw};${T.up ? 'text-transform:uppercase;' : ''}color:${sobre(fundo, T.tinta)}">${esc(cap(of.frase))}</p></td>
    <td valign="middle" align="right" class="em-x-hide" style="padding:20px 24px 20px 0">${tb(`<tr><td style="border:2px dashed ${sobre(fundo, T.priTxt, T.tinta)};border-radius:8px;padding:8px 12px;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:16px;font-weight:700;letter-spacing:.2em;color:${sobre(fundo, T.priTxt, T.tinta)};white-space:nowrap">BEMVINDO</td></tr>`, { w: '' })}</td></tr>`, { st: `background:${fundo};border-radius:${T.raio}px;` });
}

// ------------------------------------------------------------------ fecho, despedida, contato e rodapé
function indiceNewsletter(ctx, T, blocos) {
  const itens = blocos.map((b, i) => `<tr><td width="36" valign="top" style="width:36px;padding:10px 0;border-top:1px solid ${T.linha};font-family:${T.fDisp};font-size:15px;line-height:20px;font-weight:${T.dw};color:${T.priTxt}">${String(i + 1).padStart(2, '0')}</td><td class="em-x-t" style="padding:10px 0;border-top:1px solid ${T.linha};font-family:${T.fBody};font-size:15px;line-height:20px;font-weight:600;color:${T.tinta}">${esc(TITULO_BLOCO[b](ctx))}</td></tr>`).join('');
  return `${kicker(T, 'Nesta edição', { mb: 12 })}${tb(itens)}`;
}
function fecho(ctx, T, M) {
  const e = ctx.email;
  const t = ctx.oferta ? cap(ctx.oferta.frase) : cap(ctx.pack.ang[ctx.dif] || ctx.marca.slogan);
  const html = `${titulo(T, esc(t), { size: caber(t, T, 460, 34, 24, 2), align: 'center', cor: T.onPri, mb: 12 })}
    ${para(T, `<i>${esc(ctx.marca.slogan)}</i>`, { size: 16, lh: 24, align: 'center', cor: T.onPriSuave, mb: 28, cls: '' })}
    ${botao(T, M, e.cta.texto, { fundo: T.onPri, cor: T.pri, estilo: T.btn === 'contorno' ? 'suave' : T.btn, contraFundo: T.pri })}`;
  return secao(M, { id: 'fecho', bg: T.pri, pad: '56px 48px', cls: 'em-x-pad', html, notaHTML: nota(M, 'Chamada final', 'Repete a oferta e o botão no fim, para quem leu tudo. O slogan fecha a conversa.', e.cta.texto) });
}
function despedida(ctx, T) {
  const a = ctx.email.ass;
  return `${tb(`<tr><td width="56" valign="middle" style="width:56px">${simboloHTML(ctx, T, 52, { fundo: T.soft, tinta: T.priTxt, letras: iniciais(a.nome), anel: T.linha })}</td>
    <td valign="middle" style="padding-left:16px">
      <p class="em-x-s" style="margin:0 0 2px;font-family:${T.script || (T.up ? T.fBody : T.fDisp)};font-size:${T.script ? 24 : 18}px;line-height:${T.script ? 28 : 24}px;${T.script ? '' : 'font-style:italic;'}color:${T.suave}">${T.formal ? 'Atenciosamente,' : 'Um abraço,'}</p>
      <p class="em-x-t" style="margin:0;font-family:${T.fBody};font-size:15px;line-height:20px;font-weight:700;color:${T.tinta}">${esc(a.nome)}</p>
      <p class="em-x-s" style="margin:0;font-family:${T.fBody};font-size:13px;line-height:18px;color:${T.suave}">${esc(a.cargo)} · ${esc(ctx.nome)}</p>
    </td></tr>`, { w: '' })}`;
}
function contato(ctx, T) {
  const col = (r, v, ic) => `<td class="em-x-col" width="33%" valign="top" style="padding:0 12px 12px 0">${tb(`<tr><td valign="top" width="30" style="width:30px">${icone(ic, T.pri, T.onPri, 22)}</td><td valign="top"><p class="em-x-p" style="margin:0 0 4px;font-family:${T.fBody};font-size:10px;line-height:14px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${sobre(T.cartao, T.priTxt, T.tinta)}">${r}</p><p class="em-x-t" style="margin:0;font-family:${T.fBody};font-size:13px;line-height:19px;color:${T.tinta}">${esc(v)}</p></td></tr>`)}</td>`;
  return tb(`<tr>${col('WhatsApp', ctx.telefone, 'wa')}${col('Endereço', endCurto(ctx), 'pin')}${col('Horário', ctx.pack.horario, 'web')}</tr>`);
}
function rodape(ctx, T, M) {
  const svg = M.modo !== 'export';
  const fundo = T.dk ? T.deep : T.tinta;
  const tinta = T.dk ? T.onDeep : T.papel;
  const suave = mix(tinta, fundo, 0.38);
  const logo = svg ? encaixar(logoSVG(ctx, { compacto: true, variante: 'claro', classe: `em-lg ${novoId()}` }), 220, 40)
    : logoHTML(ctx, T, { cor: tinta, tam: 22, tag: false, simb: 34, simbFundo: T.pri, simbTinta: T.onPri });
  const rede = (ic, txt) => `<td valign="middle" style="padding:0 8px">${tb(`<tr><td valign="middle">${icone(ic, mix(fundo, tinta, 0.14), tinta, 26)}</td><td valign="middle" style="padding-left:8px;font-family:${T.fBody};font-size:13px;line-height:18px;font-weight:600;color:${tinta};white-space:nowrap">${esc(txt)}</td></tr>`, { w: '' })}</td>`;
  const html = `<div style="text-align:center">${logo}</div>${esp(14)}
    <p style="margin:0 0 24px;font-family:${T.fBody};font-size:14px;line-height:20px;font-style:italic;color:${suave};text-align:center">${esc(ctx.marca.slogan)}</p>
    ${tb(`<tr>${rede('ig', '@' + ctx.handle)}${rede('wa', ctx.telefone)}</tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}${esp(10)}
    ${tb(`<tr>${rede('web', ctx.dominio)}</tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}`;
  return secao(M, { id: 'rodape', bg: fundo, pad: '40px 40px 36px', cls: 'em-x-pad', html, st: `border-radius:0 0 ${T.raio}px ${T.raio}px;`, notaHTML: nota(M, 'Rodapé', 'Logo, slogan e as redes com o @ e o número. Abaixo, fora do cartão: endereço, “Ver no navegador” e descadastro em um clique.', 'completo') });
}
function legal(ctx, T) {
  const cor = sobre(T.canvas, T.suave, T.tinta);
  const a = (t) => `<a href="#" style="color:${cor};text-decoration:underline">${t}</a>`;
  const ano = data(ctx).getFullYear();
  return `<tr><td class="em-x-pad" style="padding:28px 32px 8px;text-align:center;font-family:${T.fBody};font-size:12px;line-height:19px;color:${cor}">
    <p class="em-x-s" style="margin:0 0 8px;color:${cor}">Você recebeu este e-mail porque se cadastrou em ${esc(ctx.dominio)}.</p>
    <p class="em-x-s" style="margin:0 0 8px;color:${cor}">${esc(ctx.nome)} · ${esc(ctx.endereco)}</p>
    <p style="margin:0 0 8px;color:${cor}">${a('Ver no navegador')} &nbsp;·&nbsp; ${a('Preferências')} &nbsp;·&nbsp; ${a('Descadastrar')}</p>
    <p class="em-x-s" style="margin:0;color:${cor}">© ${ano} ${esc(ctx.nome)}. Todos os direitos reservados.</p>
  </td></tr>`;
}

// ------------------------------------------------------------------ o template inteiro
function templateHTML(ctx, T, M) {
  M.papel = T.papel; M.papelImg = T.papelImg || null;
  const e = ctx.email, man = manchete(ctx);
  const blocos = blocosDoEmail(ctx);
  const excluir = e.hero === 'produto' ? (e.tipo.id === 'lancamento' ? 3 : 0) : (e.tipo.id === 'lancamento' ? 3 : -1);
  const d = data(ctx);
  const esq = e.tipo.id === 'newsletter' ? `Edição de ${man.mes} de ${d.getFullYear()}` : `${ctx.pack.label}${ctx.cidade ? ' · ' + ctx.cidade.nome : ''}`;
  const corTopo = sobre(T.canvas, T.suave, T.tinta);
  const topo = `<tr><td style="padding:0 8px 16px">${tb(`<tr><td class="em-x-s" style="font-family:${T.fBody};font-size:12px;line-height:16px;color:${corTopo}">${esc(esq)}</td><td align="right" style="font-family:${T.fBody};font-size:12px;line-height:16px"><a href="#" style="color:${corTopo};text-decoration:underline">Ver no navegador</a></td></tr>`)}</td></tr>`;

  const tipo = e.tipo.id;
  let linhas = cabecalho(ctx, T, M);
  if (tipo === 'promocao') linhas += secao(M, { id: 'urgencia', bg: T.acc, pad: '12px 32px', cls: 'em-x-pad', html: faixaUrgencia(ctx, T) });
  linhas += hero(ctx, T, M, man);
  if (tipo === 'lancamento' && e.hero !== 'produto') {
    linhas += secao(M, { id: 'novidade', bg: T.papel, pad: '0 48px 48px', cls: 'em-x-papel em-x-pad', html: cartaoNovidade(ctx, T, M) });
  }
  if (tipo === 'reengajamento' && ctx.oferta) {
    linhas += secao(M, { id: 'presente', bg: T.papel, pad: '0 48px 48px', cls: 'em-x-papel em-x-pad', html: presenteGuardado(ctx, T) });
  }
  const secoes = blocos.slice();
  if (tipo === 'newsletter') secoes.splice(Math.min(1, secoes.length), 0, 'bastidores');
  if (tipo === 'newsletter') {
    linhas += secao(M, { id: 'indice', bg: T.papel, pad: '8px 48px 40px', cls: 'em-x-papel em-x-pad', html: indiceNewsletter(ctx, T, secoes) });
  }
  let nb = 0;
  secoes.forEach((b) => {
    if (b === 'bastidores') {
      const r = blocoBastidores(ctx, T);
      linhas += secao(M, { id: 'b-bastidores', bg: r.bg, pad: r.pad, cls: 'em-x-papel em-x-pad', html: r.html });
      return;
    }
    const i = nb++;
    const r = { produtos: () => blocoProdutos(ctx, T, M, excluir), depoimento: () => blocoDepoimento(ctx, T), passos: () => blocoPassos(ctx, T), dica: () => blocoDica(ctx, T), numeros: () => blocoNumeros(ctx, T), prazo: () => blocoPrazo(ctx, T) }[b]();
    const op = rot(B.BLOCOS_EMAIL, b);
    const det = { produtos: `${ctx.itens.filter((it) => it.i !== excluir).length} itens de “${ctx.pack.itensTitulo}” com preço em etiqueta`, depoimento: 'Aspas grandes, estrelas e mais dois depoimentos do pacote', passos: 'Os 3 passos do segmento, numerados e ligados', dica: `Conteúdo útil assinado por ${ctx.email.ass.nome}`, numeros: 'Faixa escura com os números de prova do pacote', prazo: `Contagem em blocos até ${prazoOferta(ctx).rotulo}` }[b];
    linhas += secao(M, { id: `b-${b}`, bg: r.bg, pad: r.pad, cls: `${r.cls || 'em-x-papel'} em-x-pad`, html: r.html, notaHTML: nota(M, `Bloco ${i + 1}`, `${det}.`, op.rotulo) });
  });
  linhas += fecho(ctx, T, M);
  if (e.hero !== 'carta') linhas += secao(M, { id: 'despedida', bg: T.papel, pad: '40px 48px 32px', cls: 'em-x-papel em-x-pad', html: despedida(ctx, T) });
  linhas += secao(M, { id: 'contato', bg: T.cartao, pad: '28px 48px 20px', cls: 'em-x-card em-x-pad', html: contato(ctx, T) });
  linhas += rodape(ctx, T, M);

  const cartao = tb(linhas, { cls: 'em-x-w em-x-cartao', st: `max-width:600px;border-radius:${T.raio}px;background:${T.papel};${T.papelImg ? `background-image:${T.papelImg};` : ''}${T.dk ? `border:1px solid ${mix(T.canvas, T.tinta, 0.1)};` : ''}` });
  const inner = `${topo}<tr><td style="padding:0">${cartao}</td></tr>${legal(ctx, T)}`;
  const cont = M.modo === 'export'
    ? `<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->${tb(inner, { w: '600', align: 'center', cls: 'em-x-w', st: 'width:100%;max-width:600px;margin:0 auto' })}<!--[if mso]></td></tr></table><![endif]-->`
    : tb(inner, { w: '600', align: 'center', st: 'width:600px;margin:0 auto' });
  return tb(`<tr><td align="center" class="em-x-canvas em-x-cpad" bgcolor="${T.canvas}" style="background:${T.canvas};padding:24px 12px 40px">${cont}</td></tr>`, { cls: 'em-x-canvas', st: `background:${T.canvas};` });
}

// ------------------------------------------------------------------ exportável (documento de e-mail completo)
export function emailExportavel(ctx) {
  const T = tokensComAjustes(ctx), M = { modo: 'export', n: 0, notas: [] };
  const e = ctx.email;
  const corpo = templateHTML(ctx, T, M);
  let claro = T.pri;
  for (let i = 0; i < 8 && contraste(claro, '#18191c') < 4.5; i++) claro = mix(claro, '#ffffff', 0.18);
  const escuro = T.dk || T.ajFundo ? '' : `
  @media (prefers-color-scheme: dark) {
    .em-x-p { color: ${claro} !important; }
    .em-x-l { border-color: #2c2e33 !important; }
    .em-x-canvas, .em-x-body { background: #111214 !important; }
    .em-x-papel { background: #18191c !important; background-image: none !important; }
    .em-x-card { background: #202125 !important; }
    .em-x-soft { background: #1c1d21 !important; }
    .em-x-t { color: #f2f2f4 !important; }
    .em-x-s { color: #b9bbc2 !important; }
  }
  [data-ogsc] .em-x-papel { background: #18191c !important; }
  [data-ogsc] .em-x-card { background: #202125 !important; }
  [data-ogsc] .em-x-t { color: #f2f2f4 !important; }
  [data-ogsc] .em-x-s { color: #b9bbc2 !important; }
  [data-ogsc] .em-x-p { color: ${claro} !important; }`;
  const pre = `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${T.canvas}">${esc(e.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(90)}</div>`;
  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="${T.dk ? 'dark light' : 'light dark'}">
<meta name="supported-color-schemes" content="${T.dk ? 'dark light' : 'light dark'}">
<title>${esc(e.assunto)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; } h1, h2, h3, p { mso-line-height-rule: exactly; }</style><![endif]-->
<style>
  :root { color-scheme: ${T.dk ? 'dark light' : 'light dark'}; supported-color-schemes: ${T.dk ? 'dark light' : 'light dark'}; }
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  a[x-apple-data-detectors], u + #body a, #MessageViewBody a { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  @media screen and (max-width: 620px) {
    .em-x-w { width: 100% !important; max-width: 100% !important; }
    .em-x-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .em-x-col { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; border-left: 0 !important; }
    .em-x-hide { display: none !important; }
    .em-x-h1 { font-size: 34px !important; line-height: 38px !important; }
    .em-x-h2 { font-size: 26px !important; line-height: 30px !important; }
    .em-x-giant { font-size: ${M.gigante || 68}px !important; line-height: ${Math.round((M.gigante || 68) * (T.up ? 0.94 : 1.04))}px !important; }
    .em-x-cpad { padding: 12px 0 28px !important; }
    .em-x-logo { font-size: 22px !important; line-height: 26px !important; white-space: normal !important; }
    .em-x-tag { white-space: normal !important; }
    .em-x-auto { width: auto !important; }
    .em-x-cartao { border-left: 0 !important; border-right: 0 !important; border-radius: 0 !important; }
    .em-x-num { padding: 0 0 22px !important; }
    .em-x-btn { width: 100% !important; }
  }${escuro}
${ajustesCSS(ctx.ajustes || [], 'email', ctx)}
</style>
</head>
<body id="body" class="em-x-body" style="margin:0;padding:0;background:${T.canvas};word-spacing:normal">
${pre}
<div role="article" aria-roledescription="email" aria-label="${esc(e.assunto)}" lang="pt-BR" style="font-size:16px">
${corpo}
</div>
</body>
</html>`;
}

// ------------------------------------------------------------------ assinatura (tabela com estilos inline)
function tokensAss(ctx) {
  const c = ctx.marca.cores, f = ctx.marca.f;
  const branco = '#ffffff';
  const tinta = c.dark || contraste(c.ink, branco) < 7 ? '#1f2024' : c.ink;
  const suave = sobre(branco, c.dark ? '#6a6b73' : c.muted, '#5f6068');
  let marca = c.pri;
  for (let i = 0; i < 6 && contraste(marca, branco) < 3.2; i++) marca = mix(marca, '#000000', 0.18);
  const fundoSimb = contraste(c.pri, branco) >= 1.6 ? c.pri : marca;
  return {
    tinta, suave, marca, fundoSimb, sobreSimb: sobre(fundoSimb, c.onPri, '#ffffff', '#111111'),
    acc: c.acc, onAcc: c.onAcc, linha: '#e3e3e8', suaveFundo: mix(branco, c.pri, 0.07), sec: c.sec, sobreSimbSuave: mix(sobre(fundoSimb, c.onPri, '#ffffff', '#111111'), fundoSimb, 0.25), escuroSimb: mix(fundoSimb, '#000000', 0.22),
    fDisp: ffq(f.disp), fBody: ffq(f.body), fLogo: ffq(f.logo), dw: f.dw || 700, lw: f.lw || 700, up: !!f.caixa, tr: f.tr || '0',
    fDispItal: f.caixa ? ffq(f.body) : ffq(f.disp), logoUp: ctx.marca.caixa === 'alta' && !f.scriptLogo,
    logoLs: ctx.marca.caixa === 'alta' ? `${Math.max(0.06, parseFloat(f.lt) || 0)}em` : (f.lt || '0'),
    estrela: contraste(c.acc, branco) >= 2 ? c.acc : marca,
    script: f.scriptLogo ? ffq(f.logo) : null, formal: FORMAL.has(ctx.pers && ctx.pers.id) || ctx.emojiNivel === 0,
  };
}
// banner pequeno da assinatura (a escolha "banner" do Jev)
function bannerAss(ctx, S, largura, grande = false) {
  let tipo = ctx.email.ass.banner;
  if (tipo === 'oferta' && !ctx.oferta) tipo = 'slogan';
  if (tipo === 'nenhum') return '';
  const r = grande ? 12 : 10;
  const pad = grande ? '18px 22px' : '12px 16px';
  const W = { w: String(largura), st: `width:${largura}px;max-width:100%` };
  // no layout "Com banner" o banner é a peça principal: bloco cheio na cor da marca
  const fundo = grande ? S.fundoSimb : S.suaveFundo;
  const tinta = grande ? S.sobreSimb : S.tinta;
  const suave = grande ? S.sobreSimbSuave : S.suave;
  const destaque = grande ? S.sobreSimb : S.marca;
  const fundoForte = grande ? S.escuroSimb : S.fundoSimb;
  const tintaForte = S.sobreSimb;
  const rotulo = (t, cor = destaque) => `<span style="font-family:${S.fBody};font-size:9.5px;line-height:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${cor}">${t}</span>`;
  const pilula = (t) => tb(`<tr><td style="background:${grande ? S.sobreSimb : S.fundoSimb};border-radius:999px;padding:8px 14px;font-family:${S.fBody};font-size:12px;line-height:14px;font-weight:700;color:${grande ? S.fundoSimb : S.sobreSimb};white-space:nowrap">${t}&nbsp;&rarr;</td></tr>`, { w: '' });
  if (tipo === 'oferta') {
    const of = ctx.oferta;
    const longa = of.curta.length > 10;
    const tamCurta = grande ? (longa ? 24 : 34) : (longa ? 18 : 24);
    return tb(`<tr><td valign="middle" width="${longa ? '34%' : ''}" style="background:${fundoForte};border-radius:${r}px 0 0 ${r}px;padding:${pad};${longa ? '' : 'white-space:nowrap;'}">${rotulo('Presente', S.sobreSimbSuave)}<br><span style="font-family:${S.fDisp};font-size:${tamCurta}px;line-height:1.08;font-weight:${S.dw};${S.up ? 'text-transform:uppercase;letter-spacing:.01em;' : 'letter-spacing:-.01em;'}color:${tintaForte}">${esc(of.curta)}</span></td>
      <td valign="middle" style="background:${fundo};padding:${pad};font-family:${S.fBody};font-size:12.5px;line-height:18px;color:${tinta}">${esc(cap(of.frase))}</td>
      <td valign="middle" align="right" style="background:${fundo};border-radius:0 ${r}px ${r}px 0;padding:${pad}">${tb(`<tr><td style="border:1.5px dashed ${destaque};border-radius:6px;padding:6px 10px;font-family:'Courier New',Courier,monospace;font-size:12.5px;line-height:14px;font-weight:700;letter-spacing:.16em;color:${destaque};white-space:nowrap">BEMVINDO</td></tr>`, { w: '' })}</td></tr>`, W);
  }
  if (tipo === 'slogan') {
    if (grande) return tb(`<tr><td style="background:${fundo};border-radius:${r}px;padding:20px 24px">${rotulo(esc(ctx.nome))}<br><span style="font-family:${S.script || S.fDispItal};font-size:${S.script ? 30 : 24}px;line-height:1.3;${S.script ? '' : 'font-style:italic;'}color:${tinta}">${esc(ctx.marca.slogan)}</span></td></tr>`, W);
    return tb(`<tr><td width="4" style="width:4px;background:${S.fundoSimb};border-radius:2px;font-size:0;line-height:0">&nbsp;</td><td style="padding:4px 14px;font-family:${S.script || S.fDispItal};font-size:${S.script ? 23 : 17}px;line-height:1.25;${S.script ? '' : 'font-style:italic;'}color:${S.tinta};letter-spacing:0">${esc(ctx.marca.slogan)}</td></tr>`, W);
  }
  if (tipo === 'avaliacao') {
    const nt = notaNumero(ctx), n0 = ctx.pack.nums.find((x) => x !== nt) || ctx.pack.nums[0];
    const nota = nt ? nt[0].replace('★', '').trim() : '';
    return tb(`<tr>${nota ? `<td valign="middle" align="center" style="background:${fundoForte};border-radius:${r}px 0 0 ${r}px;padding:${pad};font-family:${S.fDisp};font-size:${grande ? 34 : 26}px;line-height:1;font-weight:${S.dw};color:${tintaForte};white-space:nowrap">${esc(nota)}</td>` : ''}
      <td valign="middle" style="background:${fundo};${nota ? '' : `border-radius:${r}px 0 0 ${r}px;`}padding:${pad}"><span style="font-family:Arial,sans-serif;font-size:${grande ? 16 : 14}px;line-height:16px;letter-spacing:2px;color:${grande ? S.sobreSimb : S.estrela}">★★★★★</span><br><span style="font-family:${S.fBody};font-size:12.5px;line-height:18px;color:${tinta}">${nt ? esc(nt[1]) : ''}</span></td>
      <td valign="middle" style="background:${fundo};border-radius:0 ${r}px ${r}px 0;padding:${pad};border-left:1px solid ${grande ? S.sobreSimbSuave : S.linha};font-family:${S.fBody};font-size:12.5px;line-height:18px;color:${suave}">${n0 ? `<b style="font-family:${S.fDisp};font-size:${grande ? 20 : 16}px;line-height:20px;font-weight:${S.dw};color:${tinta};${S.up ? 'text-transform:uppercase;' : ''}">${esc(n0[0])}</b><br>${esc(n0[1])}` : ''}</td></tr>`, W);
  }
  // agenda: convite para agendar ou pedir, com o horário do pacote
  const d = data(ctx);
  const cal = tb(`<tr><td align="center" style="background:${grande ? S.escuroSimb : S.fundoSimb};border-radius:6px 6px 0 0;padding:3px 0;font-family:${S.fBody};font-size:9px;line-height:11px;font-weight:800;letter-spacing:.14em;color:${S.sobreSimb}">${MESES_CURTOS[d.getMonth()].toUpperCase()}</td></tr><tr><td align="center" style="background:#ffffff;border:1px solid ${S.linha};border-top:0;border-radius:0 0 6px 6px;padding:2px 0 3px;font-family:${S.fDisp};font-size:20px;line-height:22px;font-weight:${S.dw};color:#1f2024">${d.getDate()}</td></tr>`, { w: '44', st: 'width:44px' });
  return tb(`<tr><td valign="middle" width="44" style="background:${fundo};border-radius:${r}px 0 0 ${r}px;padding:${pad};width:44px">${cal}</td>
    <td valign="middle" style="background:${fundo};padding:${grande ? '18px 8px' : '12px 4px'};font-family:${S.fBody};font-size:12.5px;line-height:18px;color:${tinta}">${rotulo('Horário')}<br><span style="white-space:nowrap">${esc(ctx.pack.horario)}</span></td>
    <td valign="middle" align="right" style="background:${fundo};border-radius:0 ${r}px ${r}px 0;padding:${pad}">${pilula(esc(ctx.email.cta.texto))}</td></tr>`, W);
}
function assinaturaHTML(ctx, S) {
  const a = ctx.email.ass, lay = a.layout;
  const T = tokens(ctx); // para o símbolo em HTML
  const nomeSt = (tam, cor = S.tinta) => `font-family:${S.fDisp};font-size:${tam}px;line-height:${Math.round(tam * 1.15)}px;font-weight:${S.dw};${S.up ? 'text-transform:uppercase;letter-spacing:.03em;' : `letter-spacing:${S.tr};`}color:${cor}`;
  const txt = (tam = 12.5, cor = S.tinta, extra = '') => `font-family:${S.fBody};font-size:${tam}px;line-height:${Math.round(tam * 1.5)}px;color:${cor};${extra}`;
  const lnk = (v, cor = S.tinta) => `<a href="#" style="color:${cor};text-decoration:none">${esc(v)}</a>`;
  const legalTxt = S.formal ? 'Esta mensagem pode conter informação confidencial. Se não for para você, avise quem enviou e apague-a.' : 'Antes de imprimir, pense no meio ambiente.';
  const legalH = (largura, align = 'left') => `<p style="margin:0;${txt(10.5, '#8a8b93')}text-align:${align};max-width:${largura}px">${S.formal ? '' : '🌱 '}${legalTxt}</p>`;
  const simb = (tam, extra = {}) => simboloHTML(ctx, T, tam, { fundo: S.fundoSimb, tinta: S.sobreSimb, ...extra });
  // contatos com rótulo tipográfico (sem imagem, legível em qualquer cliente)
  const rot = (t) => `<td valign="top" style="padding:2px 12px 2px 0;font-family:${S.fBody};font-size:9px;line-height:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${S.marca};white-space:nowrap">${t}</td>`;
  const lin = (t, v) => `<tr>${rot(t)}<td valign="top" style="padding:2px 0;${txt(12.5)}">${v}</td></tr>`;
  const contatos = () => tb(lin('Tel', lnk(ctx.telefone)) + lin('E-mail', lnk(a.email)) + lin('Site', lnk(ctx.dominio, S.marca)) + lin('Endereço', esc(endCurto(ctx))), { w: '' });
  const rede = (ic, v) => `<td valign="middle">${icone(ic, S.fundoSimb, S.sobreSimb, 20)}</td><td valign="middle" style="padding:0 14px 0 7px;${txt(12, S.tinta, 'font-weight:700;')}white-space:nowrap">${esc(v)}</td>`;
  const redes = (align = 'left') => tb(`<tr>${rede('ig', '@' + ctx.handle)}${rede('wa', ctx.telefone)}</tr>`, { w: '', align, st: align === 'center' ? 'margin:0 auto' : '' });
  const redesPilha = () => tb(`<tr>${rede('ig', '@' + ctx.handle)}</tr><tr><td colspan="2" style="height:6px;font-size:0;line-height:0">&nbsp;</td></tr><tr>${rede('wa', ctx.telefone)}</tr>`, { w: '' });
  const emp = esc(ctx.nome);
  const tag = esc((ctx.cidade ? `${ctx.pack.cat} · ${ctx.cidade.nome}` : ctx.pack.cat).toUpperCase());
  const empLogo = (tam = 13, cor = S.tinta) => `<span style="font-family:${S.fLogo};font-size:${tam}px;line-height:${tam + 3}px;font-weight:${S.lw};letter-spacing:${S.logoLs};${S.logoUp ? 'text-transform:uppercase;' : ''}color:${cor};white-space:nowrap">${emp}</span>`;

  if (lay === 'minimal') {
    const sep = `<span style="color:${S.marca};padding:0 8px">|</span>`;
    const bn = bannerAss(ctx, S, 440);
    return tb(`<tr><td style="padding:0">
      <p style="margin:0 0 2px;${nomeSt(18, S.marca)}">${esc(a.nome)}</p>
      <p style="margin:0 0 10px;${txt(12.5, S.suave)}">${esc(a.cargo)}&nbsp; · &nbsp;${empLogo(12.5)}</p>
      <p style="margin:0 0 3px;${txt(12, S.tinta)}"><span style="white-space:nowrap">${lnk(ctx.telefone)}</span>${sep}<span style="white-space:nowrap">${lnk(a.email)}</span>${sep}<span style="white-space:nowrap">${lnk(ctx.dominio, S.marca)}</span></p>
      <p style="margin:0 0 3px;${txt(12, S.suave)}"><span style="white-space:nowrap">Instagram ${lnk('@' + ctx.handle)}</span>${sep}<span style="white-space:nowrap">WhatsApp ${lnk(ctx.telefone)}</span></p>
      <p style="margin:0 0 ${bn ? 14 : 10}px;${txt(12, S.suave)}">${esc(endCurto(ctx))}</p>
      ${bn ? `${bn}${esp(10)}` : ''}${legalH(440)}
    </td></tr>`, { w: '480', st: 'width:480px;max-width:100%' });
  }
  if (lay === 'empilhada') {
    const bn = bannerAss(ctx, S, 420);
    return tb(`<tr><td align="center" style="text-align:center;padding:0">
      ${simb(52, { anel: S.linha, centro: true })}${esp(10)}
      <p style="margin:0">${empLogo(15)}</p>
      <p style="margin:4px 0 0;${txt(9, S.marca, 'font-weight:800;letter-spacing:.24em;')}">${tag}</p>
      ${esp(12)}${tb(`<tr><td width="40" style="border-top:1px solid ${S.linha};font-size:0;line-height:0">&nbsp;</td><td width="16" align="center" style="font-size:0;line-height:0">${tb(`<tr><td width="5" height="5" style="width:5px;height:5px;background:${S.marca};border-radius:50%;font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '', align: 'center', st: 'margin:0 auto' })}</td><td width="40" style="border-top:1px solid ${S.linha};font-size:0;line-height:0">&nbsp;</td></tr>`, { w: '96', align: 'center', st: 'margin:0 auto' })}${esp(12)}
      <p style="margin:0;${nomeSt(21)}">${esc(a.nome)}</p>
      <p style="margin:2px 0 10px;${txt(12.5, S.marca, 'font-weight:700;')}">${esc(a.cargo)}</p>
      <p style="margin:0 0 2px;${txt(12, S.tinta)}"><span style="white-space:nowrap">${lnk(ctx.telefone)}</span> &nbsp;·&nbsp; <span style="white-space:nowrap">${lnk(a.email)}</span></p>
      <p style="margin:0 0 12px;${txt(12, S.suave)}"><span style="white-space:nowrap">${lnk(ctx.dominio, S.marca)}</span> &nbsp;·&nbsp; <span style="white-space:nowrap">${esc(endCurto(ctx))}</span></p>
      ${redes('center')}${bn ? `${esp(14)}${bn}` : ''}${esp(12)}${legalH(420, 'center')}
    </td></tr>`, { w: '440', st: 'width:440px;max-width:100%' });
  }
  if (lay === 'banner') {
    const bn = bannerAss(ctx, S, 500, true) || tb(`<tr><td style="background:${S.fundoSimb};border-radius:12px;padding:16px 22px;font-family:${S.fBody};font-size:11px;line-height:14px;font-weight:800;letter-spacing:.24em;color:${S.sobreSimb}">${tag}</td></tr>`, { w: '500', st: 'width:500px;max-width:100%' });
    return tb(`<tr><td style="padding:0">
      ${tb(`<tr><td valign="middle" width="56" style="width:56px">${simb(48)}</td>
        <td valign="middle" style="padding-left:14px"><p style="margin:0;${nomeSt(20)}">${esc(a.nome)}</p><p style="margin:2px 0 0;${txt(12.5, S.suave)}"><b style="color:${S.marca}">${esc(a.cargo)}</b> · ${emp}</p></td></tr>`)}
      ${esp(12)}${tb(`<tr><td style="border-top:1px solid ${S.linha};font-size:0;line-height:0;height:1px">&nbsp;</td></tr>`)}${esp(10)}
      ${tb(`<tr><td valign="top">${contatos()}</td><td valign="top" align="right" style="padding-left:16px">${redesPilha()}</td></tr>`)}
      ${esp(14)}${bn}${esp(10)}${legalH(500)}
    </td></tr>`, { w: '500', st: 'width:500px;max-width:100%' });
  }
  if (lay === 'cartao') {
    const bn = bannerAss(ctx, S, 436);
    const borda = mix(S.suaveFundo, S.marca, 0.22);
    return tb(`<tr><td style="background:${S.suaveFundo};border:1px solid ${borda};border-radius:16px;padding:22px 24px">
      ${tb(`<tr><td valign="top" width="76" style="width:76px">${simboloHTML(ctx, T, 62, { fundo: S.fundoSimb, tinta: S.sobreSimb, letras: iniciais(a.nome), anel: mix(S.suaveFundo, S.marca, 0.35) })}</td>
        <td valign="top" style="padding-left:14px">
          ${tb(`<tr><td valign="top"><p style="margin:0;${nomeSt(20)}">${esc(a.nome)}</p><p style="margin:2px 0 0;${txt(12.5, S.marca, 'font-weight:700;')}">${esc(a.cargo)}</p></td><td valign="top" align="right" style="padding-left:12px">${empLogo(13)}</td></tr>`)}
          ${esp(12)}${tb(`<tr><td style="border-top:1px dashed ${mix(S.suaveFundo, S.marca, 0.4)};font-size:0;line-height:0;height:1px">&nbsp;</td></tr>`)}${esp(10)}
          ${contatos()}${esp(10)}${redes()}
        </td></tr>`)}
      ${bn ? `${esp(16)}${bn}` : ''}
    </td></tr><tr><td style="padding-top:10px">${legalH(480)}</td></tr>`, { w: '486', st: 'width:486px;max-width:100%' });
  }
  // clássica: símbolo, fio vertical na cor da marca, dados
  const bn = bannerAss(ctx, S, 460);
  return tb(`<tr><td valign="top" width="84" style="width:84px;padding:2px 20px 0 0">${simb(64, { anel: S.linha })}</td>
    <td valign="top" style="border-left:2px solid ${S.fundoSimb};padding:0 0 0 20px">
      <p style="margin:0;${nomeSt(21)}">${esc(a.nome)}</p>
      <p style="margin:2px 0 12px;${txt(12.5, S.suave)}"><b style="color:${S.marca}">${esc(a.cargo)}</b> · ${emp}</p>
      ${contatos()}${esp(10)}${redes()}
    </td></tr>${bn ? `<tr><td colspan="2" style="padding-top:16px">${bn}</td></tr>` : ''}<tr><td colspan="2" style="padding-top:12px">${legalH(460)}</td></tr>`, { w: '480', st: 'width:480px;max-width:100%' });
}
const LARG_ASS = { minimal: 480, empilhada: 440, banner: 500, cartao: 488, classica: 480 };
export function assinaturaExportavel(ctx) {
  return `<!-- Assinatura ${esc(ctx.email.ass.nome)} · ${esc(ctx.nome)} · tabela com estilos inline (Gmail, Outlook, Apple Mail) -->${assinaturaHTML(ctx, tokensAss(ctx))}`;
}

// ------------------------------------------------------------------ ícones da interface dos mockups (SVG só no estúdio)
const ic = (d, w = 14, extra = '') => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const ICO = {
  arquivo: ic('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/>'),
  lixo: ic('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  estrela: ic('<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>'),
  responder: ic('<path d="M10 8 5 12.5l5 4.5"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5V19"/>'),
  encaminhar: ic('<path d="M14 8l5 4.5-5 4.5"/><path d="M18.5 12.5H10a5 5 0 0 0-5 5V19"/>'),
  mais: ic('<circle cx="5.5" cy="12" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="18.5" cy="12" r=".9"/>'),
  busca: ic('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  clipe: ic('<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/>'),
  min: ic('<path d="M6 12h12"/>', 12), exp: ic('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', 12), fechar: ic('<path d="M6 6l12 12M18 6 6 18"/>', 12),
  caixa: ic('<path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/><path d="M5.5 5.5h13l2 8v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5z"/>'),
  enviados: ic('<path d="M21.5 3.5 2.5 10.5l7 3 3 7z"/><path d="M9.5 13.5l12-10"/>'),
  rascunho: ic('<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4"/>'),
  tag: ic('<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z"/><circle cx="8" cy="8" r="1.3"/>'),
  fmt: ic('<path d="M5 19h14M8 15l4-10 4 10M9.5 11.5h5"/>'), link: ic('<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>'),
  emoji: ic('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.2 4.2 0 0 0 7 0M9.5 9.5h.01M14.5 9.5h.01"/>'),
};
function mensagemExemplo(ctx) {
  const formal = FORMAL.has(ctx.pers && ctx.pers.id) || ctx.emojiNivel === 0;
  return formal
    ? ['Olá, tudo bem?', 'Conforme conversamos, seguem as informações. Fico à disposição para qualquer dúvida.', 'Atenciosamente,']
    : ['Oi! Tudo certo por aí?', 'Segue o que combinamos. Qualquer dúvida, é só responder este e-mail.', 'Um abraço,'];
}

// ------------------------------------------------------------------ painel (291 × 490 no estúdio)
export function emailPainelHTML(ctx) {
  const e = ctx.email, T = tokensComAjustes(ctx), S = tokensAss(ctx), M = { modo: 'mock', n: 0, notas: [] };
  const av = simboloSVG(ctx, { tamanho: 26, classe: `em-av ${novoId()}` });
  const msg = mensagemExemplo(ctx);
  return `<div class="em-painel" data-aba="tpl" style="--em-canvas:${T.canvas};--em-pri:${T.pri};--em-onpri:${T.onPri};--em-marca:${S.marca};--em-aw:${LARG_ASS[e.ass.layout] || 480}px">
  <div class="em-abas" role="tablist" aria-label="E-mail marketing">
    <button type="button" class="em-aba" role="tab" data-em-aba="tpl" aria-selected="true">Template</button>
    <button type="button" class="em-aba" role="tab" data-em-aba="ass" aria-selected="false">Assinatura</button>
    <span class="em-abas-tipo" title="Tipo de e-mail que o Jev escolheu">${esc(e.tipo.rotulo)}</span>
  </div>
  <div class="em-palco">
    <div class="em-janela">
      <div class="em-jb"><span class="em-luzes"><i></i><i></i><i></i></span><b>Caixa de entrada</b><span class="em-jb-ic">${ICO.arquivo}${ICO.lixo}${ICO.responder}</span></div>
      <div class="em-mc">
        <div class="em-mc-l1">${av}<div class="em-mc-de"><b>${esc(e.remetente.nome)}</b><small>para mim</small></div><time>${hora(data(ctx))}</time><span class="em-mc-st">${ICO.estrela}</span></div>
        <div class="em-mc-as"><b data-campo="assunto">${esc(e.assunto)}</b></div>
        <div class="em-mc-pre" data-campo="preheader">${esc(e.preheader)}</div>
      </div>
      <div class="em-rolo-caixa"><div class="em-rolo" tabindex="0" aria-label="Template do e-mail, role para ver"><div class="em-tpl">${estiloAjustes(ctx.ajustes, 'email', ctx)}${templateHTML(ctx, T, M)}</div></div><div class="em-rolo-trilho" aria-hidden="true"><i></i></div></div>
    </div>
    <div class="em-compor" aria-label="Nova mensagem com a assinatura">
      <div class="em-cp-barra"><b>Nova mensagem</b><span>${ICO.min}${ICO.exp}${ICO.fechar}</span></div>
      <div class="em-cp-corpo"><p class="em-cp-msg"><span>Para</span> cliente@exemplo.com.br</p><p class="em-cp-msg">${esc(msg[0])} ${esc(msg[1])}</p><div class="em-ass-caixa"><div class="em-ass-z">${assinaturaHTML(ctx, S)}</div></div></div>
    </div>
  </div>
</div>`;
}

// ------------------------------------------------------------------ visão ampliada (modal de ~1280 px)
export function emailAmpliadoHTML(ctx) {
  const e = ctx.email, T = tokensComAjustes(ctx), S = tokensAss(ctx), M = { modo: 'amp', n: 0, notas: [] };
  const d = data(ctx);
  const tpl = templateHTML(ctx, T, M);
  const av = (t) => simboloSVG(ctx, { tamanho: t, classe: `em-av ${novoId()}` });
  const R = rnd('inbox' + ctx.nome);
  const esqueleto = Array.from({ length: 7 }, (_, i) => `<div class="em-li em-li-sk"><i class="em-sk-av" style="background:hsl(${Math.round(R() * 360)} 18% 86%)"></i><div><i style="width:${38 + Math.round(R() * 30)}%"></i><i style="width:${62 + Math.round(R() * 30)}%"></i><i style="width:${50 + Math.round(R() * 40)}%"></i></div><i class="em-sk-h" style="width:${22 + (i % 3) * 4}px"></i></div>`).join('');
  const blocos = blocosDoEmail(ctx);
  const chip = (k, v) => `<li><small>${k}</small><b>${esc(v)}</b></li>`;
  const fam = (s) => esc(String(s).split(',')[0].replace(/"/g, ''));
  const cores = [['pri', T.pri], ['sec', T.sec], ['acc', T.acc], ['bg', T.papel], ['ink', T.tinta]];
  const msg = mensagemExemplo(ctx);
  const notas = M.notas;
  const opAss = rot(B.ASSINATURAS, e.ass.layout), opBan = rot(B.BANNERS_ASS, e.ass.banner);
  const semOfertaBanner = e.ass.banner === 'oferta' && !ctx.oferta;
  const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  return `<div class="em-amp" style="--em-canvas:${T.canvas};--em-pri:${T.pri};--em-marca:${S.marca};--em-aw:${LARG_ASS[e.ass.layout] || 480}px">
  <header class="em-amp-cab">
    <div class="em-amp-tit"><small>E-mail marketing · ${esc(ctx.nome)}</small><h2>Template master <span>e</span> assinatura</h2>
      <p>Um e-mail de ${esc(e.tipo.rotulo.toLowerCase())} desenhado para a marca, em tabelas e estilos inline (pronto para Mailchimp, RD Station e Brevo), e a assinatura da equipe para colar no Gmail ou no Outlook.</p></div>
    <ul class="em-amp-dec">${chip('Tipo', e.tipo.rotulo)}${chip('Cabeçalho', rot(B.CABECALHOS_EMAIL, e.cabecalho).rotulo)}${chip('Destaque', rot(B.HEROS_EMAIL, e.hero).rotulo)}${chip('Botão', e.cta.texto)}${chip('Blocos', blocos.map((b) => rot(B.BLOCOS_EMAIL, b).rotulo).join(' → ') || '—')}${chip('Assinatura', `${opAss.rotulo} · ${semOfertaBanner ? 'Slogan' : opBan.rotulo}`)}</ul>
    <div class="em-amp-spec">
      <div><small>Assunto · ${e.assunto.length} caracteres</small><b>${esc(e.assunto)}</b></div>
      <div><small>Preheader · ${e.preheader.length} caracteres</small><b>${esc(e.preheader)}</b></div>
      <div class="em-spec-tipo"><small>Tipografia</small><b style="font-family:${T.fDisp};font-weight:${T.dw};${T.up ? 'text-transform:uppercase;' : ''}">${fam(ctx.marca.f.disp)}</b><span style="font-family:${T.fBody}">${fam(ctx.marca.f.body)} · texto</span></div>
      <div class="em-spec-cor"><small>Paleta · ${esc(ctx.marca.paleta.rotulo)}</small><span>${cores.map(([k, v]) => `<i style="background:${v}" title="${k} ${v}"></i>`).join('')}</span></div>
    </div>
  </header>
  <section class="em-amp-l1">
    <div class="em-app">
      <div class="em-app-barra"><span class="em-luzes"><i></i><i></i><i></i></span><div class="em-app-busca">${ICO.busca}<span>Pesquisar e-mails</span></div><span class="em-app-ic">${ICO.arquivo}${ICO.lixo}${ICO.tag}${ICO.mais}</span></div>
      <div class="em-app-corpo">
        <aside class="em-lista">
          <div class="em-lista-fixa">
            <div class="em-lista-cab"><b>Caixa de entrada</b><small>1 nova</small></div>
            <div class="em-lista-abas"><span>${ICO.caixa} Principal</span><span class="on">${ICO.tag} Promoções <em>1</em></span></div>
            <div class="em-li em-li-on"><span class="em-li-dot"></span>${av(34)}<div><div class="em-li-l1"><b>${esc(e.remetente.nome)}</b><time>${hora(d)}</time></div><b class="em-li-as" data-campo="assunto">${esc(e.assunto)}</b><p data-campo="preheader">${esc(e.preheader)}</p></div></div>
            ${esqueleto}
          </div>
        </aside>
        <div class="em-leitura">
          <div class="em-leit-cab">
            <div class="em-leit-acoes">${ICO.arquivo}${ICO.lixo}${ICO.tag}<span></span>${ICO.responder}${ICO.encaminhar}${ICO.mais}</div>
            <h3 data-campo="assunto">${esc(e.assunto)}</h3>
            <div class="em-leit-de">${av(40)}<div><b>${esc(e.remetente.nome)}</b> <span>&lt;${esc(e.remetente.email)}&gt;</span><small>para mim · <em>Promoções</em></small></div><time>${esc(dataLonga)}, ${hora(d)}</time><span class="em-mc-st">${ICO.estrela}</span></div>
          </div>
          <div class="em-leit-corpo"><div class="em-tpl em-tpl-amp">${estiloAjustes(ctx.ajustes, 'email', ctx)}${tpl}</div></div>
        </div>
      </div>
    </div>
    <div class="em-trilho" aria-hidden="true"><div class="em-trilho-cab"><b>Anotações de design</b><small>cada número marca uma decisão do Jev</small></div></div>
  </section>
  <ol class="em-legenda">${notas.map((n) => `<li><b>${n.n}</b><div><strong>${esc(n.titulo)}</strong>${n.escolha ? ` <em>${esc(n.escolha)}</em>` : ''}<span>${esc(n.texto)}</span></div></li>`).join('')}</ol>
  <section class="em-amp-l2">
    <div class="em-redacao">
      <div class="em-red-barra"><span class="em-luzes"><i></i><i></i><i></i></span><b>Nova mensagem</b><span class="em-red-ic">${ICO.min}${ICO.exp}${ICO.fechar}</span></div>
      <div class="em-red-campo"><span>De</span><b>${esc(e.ass.nome)}</b><i>&lt;${esc(e.ass.email)}&gt;</i></div>
      <div class="em-red-campo"><span>Para</span><em class="em-red-chip">cliente@exemplo.com.br</em></div>
      <div class="em-red-campo"><span>Assunto</span><b>Retorno do seu contato</b></div>
      <div class="em-red-corpo"><p>${esc(msg[0])}</p><p>${esc(msg[1])}</p><p>${esc(msg[2])}</p><div class="em-red-sep">--</div><div class="em-red-ass">${assinaturaHTML(ctx, S)}</div></div>
      <div class="em-red-rodape"><span class="em-red-enviar">Enviar</span><span class="em-red-ferr">${ICO.fmt}${ICO.clipe}${ICO.link}${ICO.emoji}</span><span class="em-red-lixo">${ICO.lixo}</span></div>
    </div>
    <div class="em-ass-notas">
      <div class="em-an"><b class="em-nota-n">A</b><div><strong>Assinatura · ${esc(opAss.rotulo)}</strong><span>${esc(opAss.jev)}.</span></div></div>
      <div class="em-an"><b class="em-nota-n">B</b><div><strong>Banner · ${esc(semOfertaBanner ? 'Slogan' : opBan.rotulo)}</strong><span>${semOfertaBanner ? 'Sem oferta ativa, o banner mostra o slogan da marca.' : esc(cap(opBan.jev.replace(/^Banner da assinatura com /, ''))) + '.'}</span></div></div>
      <div class="em-an"><b class="em-nota-n">C</b><div><strong>Quem assina · ${esc(e.ass.nome)}</strong><span>${esc(e.ass.cargo)}. Telefone, site, endereço curto, Instagram e WhatsApp, e uma linha ${S.formal ? 'de confidencialidade' : 'ecológica'} discreta no fim.</span></div></div>
      <div class="em-an"><b class="em-nota-n">D</b><div><strong>Compatível de verdade</strong><span>Só tabelas e estilos inline, sem imagem e sem SVG: ícones e monograma são desenhados com bordas e texto. Cole no Gmail (Configurações › Assinatura) ou no Outlook.</span></div></div>
    </div>
  </section>
</div>`;
}

// ------------------------------------------------------------------ interação: abas e rolagem automática do template
export function ativarEmail(raiz) {
  if (!raiz || !raiz.querySelectorAll) return;
  if (!raiz.__emAbas) {
    raiz.__emAbas = true;
    raiz.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-em-aba]');
      if (!b || !raiz.contains(b)) return;
      const p = b.closest('.em-painel');
      if (!p) return;
      raiz.__emAbaAtual = b.dataset.emAba;
      aplicarAba(p, b.dataset.emAba);
    });
  }
  raiz.querySelectorAll('.em-painel').forEach((p) => { if (raiz.__emAbaAtual) aplicarAba(p, raiz.__emAbaAtual); });
  if (raiz.querySelector('.em-nota')) {
    requestAnimationFrame(() => desempilharNotas(raiz));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => desempilharNotas(raiz));
  }
  const reduz = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  raiz.querySelectorAll('.em-rolo').forEach((el) => {
    if (el.__emRolo) return;
    const trilho = el.parentElement && el.parentElement.querySelector('.em-rolo-trilho i');
    const st = { pos: raiz.__emRoloPos || 0, pausa: false, ate: performance.now() + 1800, dir: 1, t0: 0, visivel: true, raf: 0 };
    el.__emRolo = st;
    const barra = () => {
      if (!trilho) return;
      const max = el.scrollHeight - el.clientHeight;
      const k = el.clientHeight / Math.max(1, el.scrollHeight);
      trilho.style.height = `${Math.max(8, k * 100)}%`;
      trilho.style.transform = `translateY(${max > 0 ? (el.scrollTop / max) * ((1 - k) / k) * 100 : 0}%)`;
    };
    const segurar = (ms) => { st.ate = performance.now() + ms; };
    el.addEventListener('pointerenter', () => { st.pausa = true; });
    el.addEventListener('pointerleave', () => { st.pausa = false; st.pos = el.scrollTop; segurar(900); });
    el.addEventListener('wheel', () => { st.pos = el.scrollTop; segurar(3500); }, { passive: true });
    el.addEventListener('touchstart', () => { st.pausa = true; }, { passive: true });
    el.addEventListener('touchend', () => { st.pausa = false; st.pos = el.scrollTop; segurar(3500); }, { passive: true });
    el.addEventListener('focus', () => { st.pausa = true; });
    el.addEventListener('blur', () => { st.pausa = false; });
    el.addEventListener('scroll', () => { barra(); raiz.__emRoloPos = el.scrollTop; }, { passive: true });
    if (el.scrollTop !== st.pos && st.pos) el.scrollTop = st.pos;
    barra();
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((ent) => { st.visivel = ent[0].isIntersecting; }) : null;
    if (io) io.observe(el);
    if (reduz) return;
    const passo = (t) => {
      if (!el.isConnected) { if (io) io.disconnect(); return; } // o painel foi redesenhado: este laço termina aqui (e solta o nó antigo)
      const dt = st.t0 ? Math.min(64, t - st.t0) : 16;
      st.t0 = t;
      const max = el.scrollHeight - el.clientHeight;
      if (!st.pausa && st.visivel && t > st.ate && max > 4) {
        if (st.dir > 0) {
          st.pos = Math.min(max, st.pos + dt * 0.024);
          el.scrollTop = st.pos;
          if (st.pos >= max - 0.5) { st.dir = -1; segurar(2600); }
        } else {
          el.scrollTo({ top: 0, behavior: 'smooth' });
          st.pos = 0; st.dir = 1; segurar(2400);
        }
      }
      st.raf = requestAnimationFrame(passo);
    };
    st.raf = requestAnimationFrame(passo);
  });
}
// anotações presas às seções: se duas encostam (seção curta), empurra a de baixo
function desempilharNotas(raiz) {
  raiz.querySelectorAll('.em-amp').forEach((amp) => {
    const notas = [...amp.querySelectorAll('.em-nota')];
    if (!notas.length) return;
    for (const n of notas) n.style.top = `${n.dataset.topo || 16}px`;
    let fim = -Infinity;
    for (const n of notas) {
      const r = n.getBoundingClientRect();
      if (!r.height) continue;
      if (r.top < fim + 14) n.style.top = `${(+n.dataset.topo || 16) + (fim + 14 - r.top)}px`;
      fim = n.getBoundingClientRect().bottom;
    }
  });
}
function aplicarAba(p, aba) {
  p.dataset.aba = aba;
  p.querySelectorAll('[data-em-aba]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.emAba === aba)));
}

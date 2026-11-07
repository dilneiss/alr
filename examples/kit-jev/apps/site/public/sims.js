// sims.js — "Simular visitante": um cursor fantasma faz eventos REAIS (mouse, cliques, rolagem, digitação) que o
// rastreador capta como se fosse gente. A página e o Jev não sabem que é simulação: o que aparece é a adaptação real.
import { S, $, $$, html, ICON, now, sleep, frame, clamp, RM, EASE, nomeSecao, nomeItem, item, faqItem, pct, topoUtil, fracaoVisivel, celular } from './core.js';
import { novaVisita, recAtual, trilhaMontada } from './jev.js';

const G = { x: 0, y: 0, over: null, el: $('#fantasma') };
class Cancelado extends Error {}
let tok = 0;
const guard = (t) => { if (t !== tok) throw new Cancelado(); };
async function esperar(ms, t) { const fim = now() + ms; while (now() < fim) { guard(t); await sleep(Math.min(100, fim - now())); } }
async function esperarAte(cond, ms, t) { const fim = now() + ms; while (now() < fim) { guard(t); try { if (cond()) return true; } catch {} await sleep(140); } return false; }

// ------------------------------------------------------------------ o cursor
function setG(x, y) { G.x = x; G.y = y; G.el.style.transform = `translate(${(x - 3).toFixed(1)}px, ${(y - 2).toFixed(1)}px)`; }
const hoverAlvo = (e) => (e && e.closest ? e.closest('button, a, input, [data-item], .porta, [data-preco]') : null);
function dispatchMove(x, y) {
  const alvo = document.elementFromPoint(x, y);
  if (alvo !== G.over) {
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
    if (G.over) { G.over.dispatchEvent(new MouseEvent('mouseout', { ...o, relatedTarget: alvo })); marcarHover(G.over, false); }
    if (alvo) { alvo.dispatchEvent(new MouseEvent('mouseover', { ...o, relatedTarget: G.over })); marcarHover(alvo, true); }
    G.over = alvo;
  }
  if (alvo) alvo.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
}
function marcarHover(e, on) {
  let n = e;
  while (n && n.closest) { const h = hoverAlvo(n); if (!h) break; h.classList.toggle('sim-hover', on); n = h.parentElement; }
}
function limparHover() { $$('.sim-hover').forEach((x) => x.classList.remove('sim-hover')); G.over = null; }
// o fantasma nunca sai da janela sem querer (sair pelo topo é um gesto de "ir embora"); só sairPeloTopo usa `livre`
async function mover(tx, ty, dur, t, livre = false) {
  const sx = G.x, sy = G.y, t0 = now();
  if (!livre) { tx = clamp(tx, 8, window.innerWidth - 8); ty = clamp(ty, 8, window.innerHeight - 8); }
  const cx = clamp((sx + tx) / 2 + (Math.random() - 0.5) * 80, 8, window.innerWidth - 8);
  const cy = livre ? (sy + ty) / 2 - 20 - Math.random() * 40 : Math.max(8, (sy + ty) / 2 - 20 - Math.random() * 40);
  for (;;) {
    guard(t);
    const k = Math.min(1, (now() - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    setG((1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx, (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty);
    dispatchMove(G.x, G.y);
    if (k >= 1) break;
    await frame();
  }
}
// rola como gente: ~1,3 px/ms de média e pico ~2 px/ms (abaixo do limiar de "rolou rápido demais"), a não ser que peça rápido
async function rolar(toY, t, vel = 1.3) {
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  toY = clamp(Math.round(toY), 0, Math.max(0, maxY));
  const fromY = window.scrollY, dist = Math.abs(toY - fromY);
  if (dist < 4) return;
  const dur = clamp(dist / vel, 380, vel > 3 ? 900 : 3200), t0 = now();
  for (;;) {
    guard(t);
    const k = Math.min(1, (now() - t0) / dur), e = (1 - Math.cos(Math.PI * k)) / 2;
    window.scrollTo({ top: fromY + (toY - fromY) * e, behavior: 'instant' });
    dispatchMove(G.x, G.y);
    if (k >= 1) break;
    await frame();
  }
}
async function rolarAte(elm, t, frac = 0.3) {
  if (!elm) return;
  const r = elm.getBoundingClientRect();
  const top = topoUtil(), alvoY = top + (window.innerHeight - top) * frac;
  if (r.top >= top + 8 && r.bottom <= window.innerHeight - 110 && r.top < window.innerHeight * 0.75) return;
  await rolar(window.scrollY + r.top - alvoY, t);
  await esperar(160, t);
}
function ripple(x, y) { const r = document.createElement('span'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.append(r); setTimeout(() => r.remove(), 600); }
function clicarEm(x, y) {
  const alvo = document.elementFromPoint(x, y);
  ripple(x, y);
  if (!alvo) return;
  const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window, detail: 1 };
  alvo.dispatchEvent(new MouseEvent('mousedown', o));
  const foc = alvo.closest('input, select, textarea, button');
  if (foc && foc.focus && foc.tagName !== 'BUTTON') foc.focus({ preventScroll: true });
  alvo.dispatchEvent(new MouseEvent('mouseup', o));
  alvo.dispatchEvent(new MouseEvent('click', o));
}
async function clicar(elm, t, dur = 560) {
  if (!elm || !elm.getClientRects().length) return false;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    await rolarAte(elm, t);
    const r = elm.getBoundingClientRect();
    await mover(r.left + r.width * (0.42 + Math.random() * 0.16), r.top + r.height * (0.45 + Math.random() * 0.1), tentativa ? 320 : dur, t);
    await esperar(120, t);
    const sob = document.elementFromPoint(G.x, G.y);
    if (sob && (sob === elm || elm.contains(sob))) { clicarEm(G.x, G.y); return true; }
    await esperar(260, t); // o alvo se mexeu (animação, reordenação): espera assentar e mira de novo
  }
  const r = elm.getBoundingClientRect();
  setG(r.left + r.width / 2, r.top + r.height / 2);
  clicarEm(G.x, G.y);
  return true;
}
async function digitar(input, texto, t, vel = 95) {
  if (!input) return;
  await clicar(input, t, 480);
  input.focus({ preventScroll: true });
  for (const ch of Array.from(texto)) {
    guard(t);
    input.value += ch;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
    await sleep(vel * (0.6 + Math.random() * 0.8));
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
// "lendo": o cursor passeia devagar sobre o elemento
async function ler(elm, ms, t) {
  const fim = now() + ms;
  while (now() < fim) {
    guard(t);
    const r = elm.getBoundingClientRect();
    const y = clamp(r.top + r.height * (0.25 + Math.random() * 0.5), topoUtil() + 12, window.innerHeight - 30);
    await mover(clamp(r.left + r.width * (0.2 + Math.random() * 0.6), 10, window.innerWidth - 20), y, 700 + Math.random() * 500, t);
    await esperar(260 + Math.random() * 300, t);
  }
}
async function pairar(elm, ms, t) {
  await rolarAte(elm, t, 0.35);
  const r = elm.getBoundingClientRect();
  await mover(r.left + r.width * 0.5, r.top + r.height * 0.5, 620, t);
  const fim = now() + ms;
  while (now() < fim) { guard(t); await mover(r.left + r.width * (0.35 + Math.random() * 0.3), r.top + r.height * (0.35 + Math.random() * 0.3), 500, t); }
}
async function sairPeloTopo(t) {
  await mover(G.x, 40, 520, t, true);
  await mover(G.x + 30, 2, 220, t, true);
  G.el.classList.add('fora');
  if (G.over) { G.over.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true, clientX: G.x, clientY: -3, relatedTarget: null, view: window })); marcarHover(G.over, false); }
  document.documentElement.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true, clientX: G.x, clientY: -3, relatedTarget: null, view: window }));
  G.over = null;
}
function copiar(elm) {
  const sel = window.getSelection(), rg = document.createRange();
  rg.selectNodeContents(elm); sel.removeAllRanges(); sel.addRange(rg);
  elm.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, cancelable: true }));
  setTimeout(() => { try { sel.removeAllRanges(); } catch {} }, 900);
}

// ------------------------------------------------------------------ passos de alto nível
let passoTxt = null;
function passo(txt) { if (passoTxt) passoTxt.textContent = txt; }
async function abrirPorta(id, t) {
  passo(`abre ${nomeSecao(id)}`);
  const sec = $('#s-' + id);
  await rolarAte(sec, t, 0.16);
  if (!S.sec[id].aberta) { await clicar(sec.querySelector('.porta-acao'), t, 640); await esperar(950, t); }
}
function achaItem(secao, prefixo) {
  return $$(`#c-${secao} [data-item]`).find((a) => { const n = a.querySelector('.item-nome, .trilha-nome, .depo-quem b'); return n && n.textContent.trim().startsWith(prefixo); });
}
async function abrirItem(secao, prefixo, t, lerMs = 3000) {
  const art = achaItem(secao, prefixo);
  if (!art) return false;
  passo(`abre ${prefixo}`);
  const bt = art.querySelector('.item-bt');
  if (bt.getAttribute('aria-expanded') !== 'true') await clicar(bt, t, 600);
  await esperar(250, t);
  passo(`lê ${prefixo}`);
  await ler(art, lerMs, t);
  return true;
}
async function abrirBloco(trilha, idx, t, lerMs = 2500) {
  const li = $(`.bloco[data-trilha="${trilha}"][data-bloco="${idx}"]`);
  if (!li) return;
  passo(`abre ${li.querySelector('.bloco-tit').textContent}`);
  await clicar(li.querySelector('.bloco-bt'), t, 560);
  await esperar(300, t);
  await ler(li, lerMs, t);
}
async function buscar(secao, q, t) {
  passo(`busca “${q}” em ${nomeSecao(secao)}`);
  const inp = $(`#c-${secao} .busca-in`);
  await digitar(inp, q, t, 105);
  await esperar(700, t);
  inp.blur();
}
async function abrirFaq(fid, t, lerMs = 2800) {
  if (!S.sec[S.TIPO.faq].aberta) await abrirPorta(S.TIPO.faq, t);
  const it = $('#f-' + fid);
  passo(`abre “${it.querySelector('.faq-bt span').textContent}”`);
  await clicar(it.querySelector('.faq-bt'), t, 620);
  await esperar(300, t);
  await ler(it, lerMs, t);
}
const temPin = (secao, prefixo) => (S.pins[secao] || []).some((p) => nomeItem(secao, p.id).startsWith(prefixo));
async function mostrarPins(secao, t) {
  passo('o Jev trouxe para o topo o que combina');
  const card = $(`#c-${secao} .item.pv, #c-${secao} .trilha.pv`);
  if (!card) return;
  await rolarAte(card, t, 0.3);
  const s = card.querySelector('.item-selo') || card;
  const r = s.getBoundingClientRect();
  await mover(r.left + r.width / 2, r.top + r.height / 2, 700, t);
  await esperar(1500, t);
}
// mostra a porta recomendada: segue o chip "Próximo para você" (se estiver na tela) e clica nele
async function seguirRecomendacao(t, clicarChip = true) {
  await esperarAte(() => recAtual(), 6000, t);
  if (!recAtual()) return false;
  const chip = $('#chipProx');
  await esperarAte(() => !chip.hidden || fracaoVisivel($('#s-' + recAtual())) > 0.3, 2500, t);
  if (!chip.hidden) {
    passo(`o Jev sugere: ${nomeSecao(recAtual())}`);
    const r = chip.getBoundingClientRect();
    await mover(r.left + r.width * 0.5, r.top + r.height * 0.5, 800, t);
    await esperar(1700, t);
    if (clicarChip) { passo('segue a sugestão do Jev'); clicarEm(G.x, G.y); await esperar(2200, t); }
    return true;
  }
  const sec = $('#s-' + recAtual());
  passo(`o Jev sugere: ${nomeSecao(recAtual())}`);
  await rolarAte(sec, t, 0.22);
  const s = sec.querySelector('.porta-selo');
  const r = (s && !s.hidden ? s : sec).getBoundingClientRect();
  await mover(r.left + Math.min(r.width, 260) / 2, r.top + r.height / 2, 800, t);
  await esperar(1800, t);
  if (clicarChip) { passo('segue a sugestão do Jev'); await clicar(sec.querySelector('.porta-acao'), t); await esperar(1800, t); }
  return true;
}
// mostra a pergunta que o Jev marcou como "Dúvida do momento" (ou o chip, se ela estiver fora da tela)
async function mostrarDuvida(fid, t) {
  const it = $('#f-' + fid);
  const b = it && it.querySelector('.faq-jev');
  if (b) {
    passo('o Jev marcou a dúvida do momento');
    await rolarAte(it, t, 0.3);
    const r = b.getBoundingClientRect();
    await mover(r.left + r.width / 2, r.top + r.height / 2, 800, t);
    await esperar(2200, t);
    return true;
  }
  const chip = $('#chipDuvida');
  const pergunta = (faqItem(fid) || {}).pergunta || '';
  if (chip && !chip.hidden && chip.textContent.includes(pergunta)) {
    passo('o Jev oferece a resposta oficial');
    const r = chip.getBoundingClientRect();
    await mover(r.left + r.width / 2, r.top + r.height / 2, 800, t);
    await esperar(1200, t);
    clicarEm(G.x, G.y);
    await esperar(2600, t);
    return true;
  }
  return false;
}
async function olharTrilha(t) {
  if (!trilhaMontada()) return;
  const box = $('#minhaTrilha');
  if (celular() || !box.getClientRects().length) return;
  passo('o Jev montou a sua trilha');
  const r = box.getBoundingClientRect();
  await mover(r.left + r.width * 0.4, r.top + 60, 800, t);
  await esperar(1400, t);
  await mover(r.left + r.width * 0.45, r.top + r.height * 0.7, 700, t);
  await esperar(900, t);
}
async function confirmarCartao(tipo, t) {
  const c = $('#cartao');
  if (c.hidden || c.dataset.tipo !== tipo) return false;
  const b = c.querySelector('[data-objecao="sim"]');
  const r = (b || c).getBoundingClientRect();
  passo(tipo === 'objecao' ? 'o Jev respondeu a dúvida' : 'o Jev mostrou alguém parecido');
  await mover(r.left + r.width / 2, r.top + r.height / 2, 800, t);
  await esperar(2400, t);
  if (b) { clicarEm(G.x, G.y); await esperar(1600, t); }
  return true;
}

// ------------------------------------------------------------------ as simulações: passos do site.json → ações do fantasma
async function abrirTrilha(id, t, lerMs = 2600) {
  const tri = S.TIPO.trilhas;
  if (!S.sec[tri].aberta) await abrirPorta(tri, t);
  passo(`abre ${item(tri, id).nome}`);
  const bt = $(`#ib-${tri}-${CSS.escape(id)}`);
  if (bt.getAttribute('aria-expanded') !== 'true') await clicar(bt, t);
  await esperar(700, t);
  await ler($(`#i-${tri}-${CSS.escape(id)}`), lerMs, t);
}
async function esperarProva(t) {
  const of = S.TIPO.oferta;
  passo('o Jev monta a página para você…');
  await esperarAte(() => recAtual() === of, 6000, t);
  if (recAtual() === of) await seguirRecomendacao(t);
  else await abrirPorta(of, t);
  const prova = $(`#c-${of} .oferta-prova`);
  if (prova && S.sec[of].aberta) {
    await esperarAte(() => !prova.hidden, 6000, t);
    if (!prova.hidden) { passo('alguém parecido com você'); await rolarAte(prova, t, 0.4); const r = prova.getBoundingClientRect(); await mover(r.left + r.width / 2, r.top + r.height / 2, 800, t); await esperar(2600, t); }
  }
  await esperarAte(() => !$('#cartao').hidden && ['prova', 'convite'].includes($('#cartao').dataset.tipo), 7000, t);
  if (!$('#cartao').hidden) { const r = $('#cartao').getBoundingClientRect(); passo('o Jev mostrou algo feito para você'); await mover(r.left + r.width / 2, r.top + r.height / 2, 800, t); await esperar(2600, t); }
}
async function sairComAviso(t) {
  passo('vai embora pelo topo da janela');
  await sairPeloTopo(t);
  let ok = await esperarAte(() => $('#dlgSaida').open, 7000, t);
  if (!ok) { G.el.classList.remove('fora'); await mover(window.innerWidth * 0.5, 200, 500, t); await esperar(2200, t); await sairPeloTopo(t); ok = await esperarAte(() => $('#dlgSaida').open, 7000, t); }
  G.el.classList.remove('fora');
  if (ok) {
    passo('a página segura a saída com o resumo');
    const h = $('#saidaTitulo').getBoundingClientRect();
    await mover(h.left + h.width * 0.5, h.top + h.height * 0.6, 900, t);
    await esperar(3200, t);
    passo('continua vendo');
    await clicar($('#dlgSaida [data-fecha-saida]'), t, 700);
    await esperar(900, t);
  }
}
const PASSO = {
  abrirPorta: (p, t) => abrirPorta(p.secao, t),
  async lerSecao(p, t) { passo(`lê ${nomeSecao(p.secao)}`); await ler($('#c-' + p.secao), p.ms || 2600, t); },
  abrirItem: (p, t) => abrirItem(p.secao, p.item, t, p.ler_ms || 3000),
  abrirTrilha: (p, t) => abrirTrilha(p.trilha, t, p.ler_ms || 2600),
  abrirBloco: (p, t) => abrirBloco(p.trilha, p.bloco, t, p.ler_ms || 2500),
  buscar: (p, t) => buscar(p.secao, p.q, t),
  async esperarPins(p, t) {
    passo('o Jev lê o que você procura…');
    await esperarAte(() => (p.item ? temPin(p.secao, p.item) : (S.pins[p.secao] || []).length > 0), p.ms || 9000, t);
    await mostrarPins(p.secao, t);
  },
  async abrirPrimeiroPin(p, t) { const pin = (S.pins[p.secao] || [])[0]; if (pin) await abrirItem(p.secao, nomeItem(p.secao, pin.id), t, p.ler_ms || 2600); },
  abrirFaq: (p, t) => abrirFaq(p.faq, t, p.ler_ms || 2800),
  async esperarDuvida(p, t) {
    passo('o Jev lê a dúvida…');
    await esperarAte(() => ($('#f-' + p.faq) || document.body).classList.contains('jev-duvida') || (!$('#cartao').hidden && $('#cartao').dataset.tipo === 'objecao'), p.ms || 9000, t);
    if (!(await confirmarCartao('objecao', t))) { await mostrarDuvida(p.faq, t); await confirmarCartao('objecao', t); }
  },
  async esperarRecomendacao(p, t) { passo('o Jev procura o próximo passo…'); await esperarAte(() => recAtual() === p.secao, p.ms || 9000, t); },
  seguirRecomendacao: (p, t) => seguirRecomendacao(t, p.clicar !== false),
  async olharTrilha(p, t) { if (p.esperar_ms) await esperarAte(() => trilhaMontada(), p.esperar_ms, t); await olharTrilha(t); },
  async pairarPreco(p, t) {
    const of = S.TIPO.oferta;
    if (!S.sec[of].aberta) await abrirPorta(of, t);
    passo('fica olhando o preço');
    await pairar($(`#c-${of} .oferta-preco`), p.ms || 3600, t);
  },
  async copiarPreco(p, t) { passo('copia o valor'); copiar($(`#c-${S.TIPO.oferta} .oferta-por`)); await esperar(900, t); },
  async olharChamada(p, t) {
    passo('a chamada mudou para você');
    const cta = $$('.cta-jev').find((b) => b.getClientRects().length);
    if (cta) { const r = cta.getBoundingClientRect(); await mover(r.left + r.width / 2, r.top + r.height / 2, 900, t); await esperar(2000, t); }
  },
  async voltarAoTopo(p, t) { passo('volta rápido ao topo'); await rolar(0, t, 6); await esperar(500, t); },
  sairPeloTopo: (p, t) => sairComAviso(t),
  esperarProva: (p, t) => esperarProva(t),
};
export const SIMS = {};
function carregarSims() {
  for (const k of Object.keys(SIMS)) delete SIMS[k];
  for (const sm of S.D.simulacoes) SIMS[sm.id] = { ...sm, async run(t) { for (const p of sm.passos) await PASSO[p.f](p, t); } };
}

// ------------------------------------------------------------------ menu, HUD, resumo
function montarMenu() {
  const m = $('#simMenu');
  m.innerHTML = String(html`<div class="sm-cab"><span class="kicker">${ICON('play')} Simular visitante</span><button type="button" class="sm-x" data-fecha-sims aria-label="Fechar">${ICON('x')}</button></div>
    <p class="sm-nota">Um cursor fantasma faz cliques, rolagem e digitação de verdade. O Jev não sabe que é simulação: o que muda na página é a adaptação real.</p>
    <div class="sm-lista">${Object.entries(SIMS).map(([id, s]) => html`<button type="button" class="sm-it" data-sim="${id}"><b>${s.rotulo}</b><span>${s.desc}</span><i>${s.espera}</i></button>`)}</div>
    <div class="sm-pe"><button type="button" class="bt-link" data-nova-visita>↺ Nova visita (fecha tudo e zera o Jev)</button></div>`);
}
function abrirMenu() { const m = $('#simMenu'); m.hidden = false; if (!RM()) m.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE }); const b = m.querySelector('.sm-it'); if (b) b.focus({ preventScroll: true }); }
function fecharMenu() { $('#simMenu').hidden = true; }
function hud(sim) {
  const h = $('#simHud');
  h.innerHTML = String(html`<span class="sim-dot"></span><b>${sim.rotulo}</b><span class="sim-passo" id="simPasso">começando…</span><button type="button" class="sim-parar" data-parar-sim>${ICON('stop')} Parar</button>`);
  passoTxt = $('#simPasso');
  h.hidden = false;
}
function resumo(id, visita) {
  const sim = SIMS[id];
  const ad = S.adaptacoes.filter((a) => a.visita === visita && !['aceitou', 'resposta'].includes(a.tipo));
  const ult = S.decisoes.filter((d) => d.visita === visita).slice(-1)[0];
  const lab = (g, k) => { const x = S.CFG && S.CFG[g] && S.CFG[g][k]; const v = x ? (Array.isArray(x) ? x : x.rotulo) : ['', k]; return `${v[0]} ${v[1]}`; };
  // o que mais importa de cada tipo: o "Para você" mais certeiro de cada lista, a primeira porta sugerida (e a
  // aceita), a última reorganização e a última chamada, e cada ação do Jev uma vez; tudo na ordem em que aconteceu
  const esc = new Map();
  const pega = (k, a, melhor) => { const x = esc.get(k); if (!x || melhor(a, x)) esc.set(k, a); };
  for (const a of ad) {
    if (a.tipo === 'pins') pega('pins:' + a.secao, a, (n, v) => (n.p || 0) > (v.p || 0));
    else if (a.tipo === 'porta') pega('porta', a, () => false);
    else if (['reorg', 'cta', 'inclui'].includes(a.tipo)) pega(a.tipo, a, () => true);
    else pega(a.tipo, a, () => false);
  }
  const aceitou = S.adaptacoes.find((a) => a.visita === visita && a.tipo === 'aceitou');
  if (aceitou) esc.set('aceitou', aceitou);
  const linhas = [...esc.values()].sort((a, b) => a.t - b.t).slice(-9);
  const box = $('#simResumo');
  box.innerHTML = String(html`<div class="sr-cab"><span class="kicker">${ICON('brilho')} Simulação concluída</span><button type="button" class="sm-x" data-fecha-resumo aria-label="Fechar">${ICON('x')}</button></div>
    <h3 id="simResumoTit">${sim.rotulo}</h3>
    ${ult ? html`<p class="sr-leu">O Jev leu: <b>${lab('perfis', ult.perfil)} ${pct(ult.p_perfil)}</b> · quer <b>${lab('interesses', ult.interesse)}</b> · dúvida <b>${lab('objecoes', ult.objecao)}</b></p>` : ''}
    <span class="sr-sub">O que a página mudou para este visitante (${linhas.length}):</span>
    <ol class="sr-lista">${linhas.length ? linhas.map((a) => html`<li><span class="sr-t">${a.t} s</span><span>${a.txt}</span></li>`) : html`<li>nenhuma adaptação (o Jev não viu motivo)</li>`}</ol>
    <div class="sr-bts"><button type="button" class="bt-lente" data-abrir-raiox>${ICON('raiox')} Raio-X</button><button type="button" class="bt-lente" data-abrir-sims>${ICON('play')} Outra simulação</button><button type="button" class="bt-lente" data-nova-visita>↺ Nova visita</button></div>`);
  box.hidden = false;
  if (!RM()) box.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
  window.jevUx.ultimoResumo = { sim: id, visita, linhas: linhas.map((a) => ({ tipo: a.tipo, txt: a.txt })) };
}

export async function rodarSim(id) {
  const sim = SIMS[id];
  if (!sim) return;
  pararSim();
  const t = ++tok;
  fecharMenu();
  $('#simResumo').hidden = true;
  novaVisita();
  S.simulando = id;
  document.body.classList.add('simulando');
  const visita = S.visita;
  hud(sim);
  $('#fantasmaRot').textContent = sim.rotulo;
  G.el.classList.remove('fora');
  G.el.hidden = false;
  setG(window.innerWidth * 0.5, window.innerHeight * 0.62);
  window.jevUx.simInicio = { id, visita, em: Date.now() };
  try {
    await esperar(500, t);
    await sim.run(t);
    await esperar(1200, t);
    if (t === tok) resumo(id, visita);
  } catch (e) {
    if (!(e instanceof Cancelado)) { passo('a simulação parou por um erro'); window.jevUx.simErro = String(e && e.stack || e); }
  } finally {
    if (t === tok) {
      S.simulando = null;
      document.body.classList.remove('simulando');
      G.el.hidden = true;
      G.el.classList.remove('fora');
      limparHover();
      $('#simHud').hidden = true;
      window.jevUx.simFim = { id, visita, em: Date.now() };
    }
  }
}
export function pararSim() {
  if (!S.simulando) return;
  tok++;
  S.simulando = null;
  document.body.classList.remove('simulando');
  G.el.hidden = true;
  limparHover();
  $('#simHud').hidden = true;
}

export function montarSims() {
  carregarSims();
  montarMenu();
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const s = t.closest('[data-sim]');
    if (s) { e.stopPropagation(); rodarSim(s.dataset.sim); return; }
    if (t.closest('[data-abrir-sims]')) { $('#simResumo').hidden = true; abrirMenu(); return; }
    if (t.closest('[data-fecha-sims]')) { fecharMenu(); return; }
    if (t.closest('[data-parar-sim]')) { pararSim(); return; }
    if (t.closest('[data-fecha-resumo]')) { $('#simResumo').hidden = true; return; }
    if (t.closest('[data-abrir-raiox]')) { $('#simResumo').hidden = true; const b = $('#btRaiox'); if (b) b.click(); return; }
    if (t.closest('[data-nova-visita]')) { pararSim(); fecharMenu(); $('#simResumo').hidden = true; }
    if (!$('#simMenu').hidden && !t.closest('#simMenu') && !t.closest('.bt-simular')) fecharMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#simMenu').hidden) fecharMenu(); else if (!$('#simResumo').hidden) $('#simResumo').hidden = true; } });
  // qualquer gesto REAL da pessoa (fora dos controles da simulação) devolve o controle a ela
  ['mousedown', 'wheel', 'touchstart', 'keydown'].forEach((tp) => document.addEventListener(tp, (e) => {
    if (!S.simulando || !e.isTrusted) return;
    if (e.target && e.target.closest && e.target.closest('.sim-hud, .sim-menu, .jev-topbar, .raiox, .jev-drawer')) return;
    pararSim();
  }, { passive: true, capture: true }));
  const qp = new URLSearchParams(location.search).get('sim');
  if (qp && SIMS[qp]) setTimeout(() => rodarSim(qp), 700);
}
export const abrirMenuSims = abrirMenu;

// sinais.js — o rastreador. Transforma o que a pessoa faz (abrir, ler, buscar, rolar, parar, sair) no objeto `sinais`
// que vai para POST /api/decidir. O formato bate campo a campo com limpar() em server.mjs.
import { S, $, now, r1, on, emit, SEC, FORM, nomeSecao, item, auto, topoUtil, fracaoVisivel } from './core.js';

const LEU_MS = 4000;        // item aberto e na tela por 4 s = "leu"
const PASSOU_MS = 1200;     // mouse parado sobre um item fechado por 1,2 s = "passou"
const PRECO_VEZ_MS = 400;   // passada de mouse no preço que conta como "olhou"
const PRECO_FORTE_MS = 1500; // fim de uma passada longa no preço chama o Jev
const OCIOSO_MS = 12000;

const nomeIt = (secao, id) => { const x = item(secao, id); return x ? x.nome : String(id); };
const curto = (t) => (t.length <= 60 ? t : t.slice(0, 59) + '…');

// ------------------------------------------------------------------ registro de eventos
export function evento(txt, forte) {
  txt = curto(txt);
  S.eventos.push({ t: now(), txt });
  if (S.eventos.length > 40) S.eventos.shift();
  emit('evento', { txt, forte: !!forte });
  if (forte) emit('pedir', { motivo: txt, urgente: forte === 'urgente' });
}
// o que a pessoa fez, em linguagem de gente, para as etiquetas "porque você abriu X e Y"
export function feito(txt) {
  const ult = S.feitos[S.feitos.length - 1];
  if (ult && ult.txt === txt) return;
  S.feitos.push({ t: now(), txt });
  if (S.feitos.length > 20) S.feitos.shift();
}
export function porque(n = 2) {
  const f = S.feitos.slice(-n).map((x) => x.txt);
  if (!f.length) return '';
  const verbo = (t) => t.split(' ')[0];
  const partes = f.map((t, i) => (i > 0 && verbo(t) === verbo(f[i - 1]) ? t.slice(verbo(t).length + 1) : t));
  return 'porque você ' + (partes.length === 1 ? partes[0] : partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]);
}

function itemReg(secao, id) {
  let e = S.itens.find((x) => x.secao === secao && x.id === id);
  if (!e) { e = { secao, id, acao: 'passou', ms: 0, aberto: false, abriu: false, lido: false }; S.itens.push(e); }
  else { S.itens.splice(S.itens.indexOf(e), 1); S.itens.push(e); }
  if (S.itens.length > 40) S.itens.shift();
  return e;
}

// ------------------------------------------------------------------ eventos da página
on('secao', ({ id, aberta, origem }) => {
  const st = S.sec[id];
  if (aberta) {
    if (!st.vezes) st.ordem = ++S.ordemAb;
    st.vezes++; st.aberta = true; st.abertaEm = now(); st.fechouRapido = false;
    evento(`abriu ${nomeSecao(id)}${origem === 'jev' ? ' (sugestão do Jev)' : ''}`, true);
    feito(`abriu ${nomeSecao(id)}`);
  } else {
    st.aberta = false;
    if (now() - st.abertaEm < 3500) st.fechouRapido = true;
    for (const e of S.itens) if (e.secao === id) e.aberto = false;
    evento(`fechou ${nomeSecao(id)}${st.fechouRapido ? ' logo depois de abrir' : ''}`, true);
  }
});

on('item', ({ secao, id, aberto, viaBusca }) => {
  const e = itemReg(secao, id);
  const nome = nomeIt(secao, id);
  if (aberto) {
    e.aberto = true;
    if (!e.abriu) { e.abriu = true; e.acao = viaBusca ? 'buscou' : 'abriu'; }
    const tipo = SEC(secao).tipo;
    const verbo = tipo === 'depoimentos' ? `abriu o depoimento de ${nome}` : tipo === 'trilhas' ? `abriu a trilha ${nome}` : `abriu ${nome}`;
    evento(verbo + (viaBusca ? ' (pela busca)' : ''), true);
    feito(tipo === 'depoimentos' ? `leu ${nome}` : `abriu ${nome}`);
  } else {
    e.aberto = false;
    evento(`fechou ${nome}`);
  }
});

on('bloco', ({ aberto, titulo }) => {
  if (!aberto) return;
  const t = titulo.slice(0, 60);
  S.blocos = S.blocos.filter((b) => b !== t);
  S.blocos.push(t);
  if (S.blocos.length > 6) S.blocos.shift();
  evento(`abriu ${t}`, true);
  feito(`abriu ${t.split(' · ').slice(0, 2).join(' · ')}`);
});

on('faq', ({ id, aberto, pergunta }) => {
  if (!aberto) return;
  if (!S.faq.includes(id)) S.faq.push(id);
  evento(`abriu “${pergunta}”`, true);
  feito(`abriu “${pergunta}”`);
});

let ultBusca = { t: -1e9, q: '' };
on('busca', ({ secao, q }) => {
  const n = String(q || '').trim().slice(0, 40);
  if (n.length < 2) return;
  // digitando devagar: "ro" → "rot" → "roteiro" vira uma busca só
  const ult = S.buscas[S.buscas.length - 1];
  if (ult && now() - ultBusca.t < 5000 && (n.startsWith(ult) || ult.startsWith(n))) S.buscas[S.buscas.length - 1] = n;
  else S.buscas.push(n);
  if (S.buscas.length > 4) S.buscas.shift();
  ultBusca = { t: now(), q: n };
  evento(`buscou “${n}” em ${nomeSecao(secao)}`, true);
  const fl = S.feitos[S.feitos.length - 1];
  if (fl && /^buscou “/.test(fl.txt) && now() - fl.t < 5000) S.feitos.pop();
  feito(`buscou “${n}”`);
});

on('cta', ({ tipo, n }) => {
  const c = S.cta;
  const f = FORM(), conv = S.D.conversao;
  if (tipo === 'clique') { c.cliques++; evento(`clicou em “${conv.cta}”`, 'urgente'); }
  else if (tipo === 'abriu') { c.checkout_aberto = true; evento(`abriu o ${f} (demonstração)`, true); }
  else if (tipo === 'campos') { evento(`preencheu ${n} campo(s) do ${f}`); }
  else if (tipo === 'erro') { c.erros++; evento(`erro ao concluir o ${f}`, true); }
  else if (tipo === 'entrou') { c.entrou = true; evento(`${conv.concluida} (demonstração)`, 'urgente'); }
  else if (tipo === 'fechou') { c.checkout_aberto = false; evento(`fechou o ${f}`, true); }
});

// ------------------------------------------------------------------ rolagem, mouse, cliques, cópia, saída
const R = { lastY: window.scrollY, dir: 0, runStart: window.scrollY, hist: [] };
window.addEventListener('scroll', () => {
  if (!S.D) return;
  const y = window.scrollY, t = now();
  const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const ro = S.rolagem;
  ro.atual = Math.round(Math.min(1, y / docH) * 100);
  ro.max = Math.max(ro.max, ro.atual);
  if (t < auto.ate) { R.lastY = y; R.runStart = y; R.hist.length = 0; return; }
  const dy = y - R.lastY;
  if (Math.abs(dy) >= 1) {
    const d = dy > 0 ? 1 : -1;
    if (d !== R.dir) { if (R.dir !== 0 && Math.abs(R.lastY - R.runStart) > 60) ro.inversoes.push(t); R.runStart = R.lastY; R.dir = d; }
  }
  const antes = R.lastY;
  R.lastY = y;
  R.hist.push([t, y, antes]);
  while (R.hist.length && t - R.hist[0][0] > 1500) R.hist.shift();
  const first = R.hist[0];
  if (first && first[2] - y > 1100 && y < 450 && t - ro.subiuEm > 3000) { ro.subiuEm = t; evento('voltou rápido ao topo', true); }
  const ref = R.hist.find((h) => t - h[0] <= 500);
  if (ref && y - ref[2] > Math.max(1100, window.innerHeight * 1.25) && t - ro.desceuEm > 2500) { ro.desceuEm = t; ro.rapidas.push(t); evento('rolou rápido demais para baixo', true); }
  atividade();
}, { passive: true });

function atividade() { if (!S.D) return; if (S.ocioso) { S.ocioso = false; } S.ultimaAtividade = now(); }
['mousemove', 'keydown', 'wheel', 'touchstart', 'pointerdown'].forEach((t) => document.addEventListener(t, atividade, { passive: true, capture: true }));

const FORA = '.jev-topbar, .trilho, .palco, .doca, .dlg, .raiox, .raiox-fundo, .folha, .sim-menu, .sim-hud, .sim-resumo, .jev-drawer, .jev-drawer-backdrop, .jev-toasts, .jev-dg';
const cliquesRec = [];
let raivaEm = -1e9;
document.addEventListener('click', (e) => {
  const tg = e.target;
  if (!S.D || !tg || !tg.closest || tg.closest(FORA)) return;
  if (e.detail === 0) return; // teclado
  const t = now(), x = e.clientX, y = e.clientY;
  cliquesRec.push({ t, x, y });
  while (cliquesRec.length && t - cliquesRec[0].t > 1000) cliquesRec.shift();
  if (cliquesRec.filter((c) => Math.hypot(c.x - x, c.y - y) < 60).length >= 3 && t - raivaEm > 1200) { raivaEm = t; S.cliques.raiva++; evento('cliques de raiva (3 em menos de 1 s)', true); }
  if (!tg.closest('a[href], button, input, select, textarea, label, summary, [role="button"], [role="tab"]')) { S.cliques.mortos++; evento('clicou em algo que não responde'); }
}, true);

document.addEventListener('copy', () => {
  if (!S.D) return;
  const s = String(window.getSelection() || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!s) return;
  if (/R\$/.test(s)) { S.preco.copiou = true; evento(`copiou “${s}”`, true); }
  else evento(`copiou “${s}”`);
});

document.addEventListener('mouseout', (e) => {
  if (!S.D || e.relatedTarget || e.clientY > 0) return;
  if (window.jevUx) (window.jevUx.saidas || (window.jevUx.saidas = [])).push({ real: e.isTrusted, x: Math.round(e.clientX), y: Math.round(e.clientY), alvo: e.target && (e.target.id || String(e.target.className).slice(0, 30) || e.target.tagName), sim: S.simulando, t: Math.round((now() - S.t0) / 1000) });
  const t = now();
  if (S.saida.em != null && t - S.saida.em < 1500) return;
  S.saida.vezes++; S.saida.em = t;
  evento('mouse saiu pelo topo da janela', 'urgente');
});

// ------------------------------------------------------------------ passar o mouse: preço e itens fechados
const H = { preco: null, precoEm: 0, item: null, itemEm: 0, itemMarcado: false };
document.addEventListener('mouseover', (e) => {
  const t = e.target;
  if (!t || !t.closest) return;
  const p = t.closest('[data-preco]');
  if (p !== H.preco) { fimPreco(); if (p) { H.preco = p; H.precoEm = now(); } }
  const it = t.closest('article[data-item]');
  if (it !== H.item) { H.item = it; H.itemEm = now(); H.itemMarcado = false; }
}, true);
document.addEventListener('mouseout', (e) => {
  if (!e.relatedTarget) { fimPreco(); H.item = null; }
}, true);
function fimPreco() {
  if (!H.preco || !S.D) return;
  const dur = now() - H.precoEm;
  H.preco = null;
  if (dur >= PRECO_VEZ_MS) S.preco.vezes++;
  if (dur >= PRECO_FORTE_MS) evento(`passou o mouse no preço (${Math.round(dur / 1000)} s)`, true);
}

// ------------------------------------------------------------------ tique de 250 ms: onde a pessoa está, quanto leu, se parou
let ultTique = now();
function linhaLeitura() { const top = topoUtil(); return top + (window.innerHeight - top) * 0.36; }
function secaoNaTela() {
  const y = linhaLeitura();
  let achou = null, ultimaAcima = null;
  for (const sec of document.querySelectorAll('#portas > .porta')) {
    const r = sec.getBoundingClientRect();
    if (r.top <= y && r.bottom >= y) { achou = sec; break; }
    if (r.bottom < y) ultimaAcima = sec;
  }
  if (achou) return achou.dataset.sec;
  const portas = $('#portas').getBoundingClientRect();
  if (portas.top > y) return 'topo';
  return ultimaAcima ? ultimaAcima.dataset.sec : 'topo';
}

setInterval(() => {
  const t = now(), dt = Math.min(1000, t - ultTique);
  ultTique = t;
  if (document.hidden || !S.D) return;
  const sec = secaoNaTela();
  if (sec !== S.secaoAtual) { S.secaoAtual = sec; if (sec !== 'topo') evento(`olhando ${nomeSecao(sec)}`); }
  // lista em foco: uma lista ABERTA cuja área de conteúdo cruza a janela (60 px de folga)
  let lista = '';
  if (S.LISTAS.includes(sec) && S.sec[sec].aberta) {
    const c = document.getElementById('c-' + sec);
    if (c && !c.hidden) { const r = c.getBoundingClientRect(); if (r.top < window.innerHeight - 60 && r.bottom > topoUtil() + 60) lista = sec; }
  }
  S.listaEmFoco = lista;
  // tempo com a seção aberta e na tela
  for (const id of S.SECOES) {
    const st = S.sec[id];
    if (st.aberta && fracaoVisivel(document.getElementById('s-' + id)) > 0.05) st.abertaMs += dt;
  }
  // tempo de leitura de cada item aberto
  for (const e of S.itens) {
    if (!e.aberto) continue;
    const art = document.getElementById(`i-${e.secao}-${e.id}`);
    if (!art || fracaoVisivel(art) < 0.2) continue;
    e.ms += dt;
    if (!e.lido && e.ms >= LEU_MS) { e.lido = true; e.acao = 'leu'; evento(`leu ${nomeIt(e.secao, e.id)} (${Math.round(e.ms / 1000)} s)`); feito(`leu ${nomeIt(e.secao, e.id)}`); }
  }
  // preço: tempo total com o mouse em cima
  if (H.preco) S.preco.hoverMs += dt;
  // item fechado com o mouse parado em cima = "passou"
  if (H.item && !H.itemMarcado && t - H.itemEm >= PASSOU_MS) {
    H.itemMarcado = true;
    const { secao, item: id } = H.item.dataset;
    if (secao && id && !S.itens.some((x) => x.secao === secao && x.id === id)) { itemReg(secao, id); evento(`passou o mouse em ${nomeIt(secao, id)}`); }
  }
  // parado
  if (!S.ocioso && t - S.ultimaAtividade >= OCIOSO_MS) { S.ocioso = true; evento('parado há 12 s', true); }
  emit('tique', { dt });
}, 250);

// ------------------------------------------------------------------ o resumo enviado ao Jev (contrato de limpar() em server.mjs)
const seg = (ms) => r1(ms / 1000);
export function sinais() {
  const t = now(), ro = S.rolagem;
  const itens = S.itens.filter((e) => S.LISTAS.includes(e.secao)).slice(-14).map((e) => ({ secao: e.secao, id: String(e.id), acao: e.acao, s: seg(e.ms) }));
  return {
    t: Math.round((t - S.t0) / 1000),
    secao_atual: S.secaoAtual,
    lista_em_foco: S.listaEmFoco,
    rolagem: {
      max: ro.max, atual: ro.atual,
      inversoes_20s: ro.inversoes.filter((x) => t - x < 20000).length,
      rapidas_20s: ro.rapidas.filter((x) => t - x < 20000).length,
      desceu_rapido: t - ro.desceuEm < 5000,
      subiu_rapido: t - ro.subiuEm < 6000,
    },
    abertas: S.SECOES.filter((id) => S.sec[id].vezes > 0).map((id) => {
      const st = S.sec[id];
      return { id, ordem: st.ordem, vezes: st.vezes, aberta_s: seg(st.abertaMs), aberta_agora: st.aberta, fechou_rapido: st.fechouRapido };
    }),
    itens,
    subitens: { blocos: S.blocos.slice(-6) },
    buscas: S.buscas.slice(-4),
    faq: S.faq.slice(),
    preco: { hover_s: seg(S.preco.hoverMs), vezes: S.preco.vezes, copiou: S.preco.copiou },
    cta: { cliques: S.cta.cliques, checkout_aberto: S.cta.checkout_aberto, campos: S.cta.campos, erros: S.cta.erros, entrou: S.cta.entrou },
    cliques: { raiva: S.cliques.raiva, mortos: S.cliques.mortos },
    ocioso_s: Math.round((t - S.ultimaAtividade) / 1000),
    saida: { vezes: S.saida.vezes, ha_s: S.saida.em == null ? null : Math.round((t - S.saida.em) / 1000) },
    guia: {
      acoes: S.guia.acoes.slice(-8),
      desde_s: S.guia.ultimaEm == null ? null : Math.round((t - S.guia.ultimaEm) / 1000),
      sugeriu: S.guia.sugeriu, aceitou: S.guia.aceitou, ignorou: S.guia.ignorou,
    },
    eventos: S.eventos.slice(-10).map((e) => e.txt),
  };
}

// só mudanças que importam disparam uma nova decisão (tempo correndo sozinho não gasta chamada)
export function chave(s) {
  return JSON.stringify([
    s.secao_atual, s.lista_em_foco, Math.floor(s.rolagem.max / 10), s.rolagem.inversoes_20s, s.rolagem.rapidas_20s, s.rolagem.desceu_rapido, s.rolagem.subiu_rapido,
    s.abertas.map((a) => [a.id, a.vezes, Math.min(9, Math.floor(a.aberta_s / 10)), a.aberta_agora, a.fechou_rapido]),
    s.itens.map((i) => [i.secao, i.id, i.acao, Math.min(6, Math.floor(i.s / 5))]),
    s.subitens.blocos, s.buscas, s.faq, [s.preco.vezes, Math.min(5, Math.floor(s.preco.hover_s / 3)), s.preco.copiou], s.cta, s.cliques,
    s.ocioso_s >= 12 ? (s.ocioso_s >= 40 ? 2 : 1) : 0, s.saida.vezes, s.guia.acoes, s.guia.aceitou, s.guia.ignorou,
  ]);
}

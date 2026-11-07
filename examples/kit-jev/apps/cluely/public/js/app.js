// Mini Cluely — interface. Palco (tela + conversa + Raio-X) e o copiloto de vidro, que pode flutuar por cima de tudo
// (Document Picture-in-Picture). Cada fala vai ao Jev (/api/escuta); se ele decidir que vale ajudar, a IA de texto escreve
// no mesmo stream. Cada tela vai ao OCR + Jev (/api/tela). Ações e perguntas livres vão a /api/escrever.
import { postSSE } from './sse.js';
import { SR, TRILHA_OK, criarOuvinte, criarOuvinteScribe, simular } from './voz.js';
import { CAPTURA_OK, capturar, quadro, miniatura, diferenca, desenharCaixas, animarCaixas } from './tela.js';
import { ajustar, textoFinal, trocasAplicadas } from '/lib/ajuste.mjs';

const { el, fmt, bars, scoreMeter } = window.JevKit;
const $ = (id) => document.getElementById(id);
JevKit.mountTopbar({ title: 'Mini Cluely', tagline: 'vê sua tela, ouve a conversa e sopra a resposta' });

// referências fixas (o copiloto pode mudar de documento quando flutua; nunca buscar por id depois disto)
const E = {};
for (const id of ['hero', 'sims', 'telasEx', 'btnMic', 'btnVel', 'btnParar', 'btnTela', 'selContexto', 'btnEditarCtx', 'chkAuto', 'chkObservar',
  'telaBox', 'telaVideo', 'telaImg', 'telaCaixas', 'telaScan', 'telaVazia', 'telaRodape', 'telaStatus', 'trans', 'transVazia', 'convStatus',
  'formFala', 'inFala', 'selQuem', 'raioxCorpo', 'raioxInfo', 'copilotoSlot', 'avisoFlutuando', 'btnTrazer', 'copiloto', 'copEstado', 'copRelogio',
  'copModo', 'btnOcultar', 'timeline', 'feed', 'feedVazio', 'notas', 'notasVazio', 'notasLista', 'nNotas', 'cobertura', 'formAsk', 'inAsk', 'copRodape',
  'dlgCtx', 'formCtx', 'ctxVoce', 'ctxOutro', 'ctxTexto', 'ctxTermos', 'ctxConta']) E[id] = $(id);

const S = {
  sid: (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Math.random()).slice(2) + Date.now()).slice(0, 24),
  cfg: null, ctx: null, auto: true, vel: 1,
  hist: [], atual: {}, ordem: 0, seq: 0, geracao: 0, emVoo: 0,
  pendente: null, modo: null, modoP: 0, cob: {}, notas: [],
  sim: null, roteiro: null, mic: null, aba: null, captura: null, lendoTela: false, tela: null,
  inicio: null, cont: { falas: 0, decisoes: 0, ajudas: 0, segurou: 0, escritas: 0, primeiro: [] },
};
let pip = null;
const R = () => S.cfg?.rotulos || {};
const pct = (p) => fmt.pct(p || 0);
const seg = (ms) => (ms == null ? '—' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

function aviso(msg, tipo) {
  if (!pip) return JevKit.toast(msg, tipo);
  const n = el('div', { class: 'mc-linha-jev', style: { color: tipo === 'err' ? '#fca5a5' : '#a5f3fc' } }, [el('span', { class: 'd' }), msg]);
  E.feed.prepend(n);
  setTimeout(() => n.remove(), 5000);
}

// ---------------------------------------------------------------- contexto
function presetDe(id) { return S.cfg.contextos.find((c) => c.id === id) || S.cfg.contextos[0]; }
function setContexto(id, { silencioso = true } = {}) {
  const p = presetDe(id);
  const salvo = ler('mc:ctx:' + p.id) || {};
  S.ctx = { id: p.id, titulo: p.titulo, emoji: p.emoji, modo: p.modo, papel_voce: salvo.papel_voce || p.papel_voce, papel_outro: salvo.papel_outro || p.papel_outro,
    texto: salvo.texto != null ? salvo.texto : p.texto, termos: salvo.termos != null ? salvo.termos : (p.termos || '') };
  S.ctx.termosLista = listaTermos(S.ctx.termos);
  E.selContexto.value = p.id;
  guardar('mc:ctx', p.id);
  if (!silencioso) aviso(`Contexto: ${p.emoji} ${p.titulo}`);
  preparar();
}
// deixa o prompt de sistema deste contexto pronto no cache do modelo de texto antes da 1ª resposta (frio: ~5 s a mais)
function preparar() { fetch('/api/preparar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: S.sid, contexto: ctxEnvio() }) }).catch(() => {}); }
const ctxEnvio = () => ({ id: S.ctx.id, texto: S.ctx.texto, papel_voce: S.ctx.papel_voce, papel_outro: S.ctx.papel_outro, modo: S.ctx.modo, termos: S.ctx.termos });
const listaTermos = (t) => String(t || '').split(/[\n,;]+/).map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 40).slice(0, 40);
function abrirEditor() {
  E.ctxVoce.value = S.ctx.papel_voce; E.ctxOutro.value = S.ctx.papel_outro; E.ctxTexto.value = S.ctx.texto; E.ctxTermos.value = S.ctx.termos || '';
  const conta = () => { E.ctxConta.textContent = `${E.ctxTexto.value.length} / ${S.cfg.limites.contexto}`; };
  E.ctxTexto.oninput = conta; conta();
  E.dlgCtx.showModal();
}
E.dlgCtx.addEventListener('close', () => {
  if (E.dlgCtx.returnValue !== 'salvar') return;
  const v = { papel_voce: E.ctxVoce.value.trim() || S.ctx.papel_voce, papel_outro: E.ctxOutro.value.trim() || S.ctx.papel_outro, texto: E.ctxTexto.value.trim(), termos: E.ctxTermos.value.trim() };
  guardar('mc:ctx:' + S.ctx.id, v);
  Object.assign(S.ctx, v);
  S.ctx.termosLista = listaTermos(S.ctx.termos);
  preparar();
  aviso('Contexto salvo neste navegador.', 'ok');
});

// ---------------------------------------------------------------- estado geral
function atualizarEstado() {
  const ouvindo = (S.sim && S.sim.ativo) || (S.mic && S.mic.ligado) || (S.aba && S.aba.ligado);
  const [cls, txt] = ouvindo ? ['ouvindo', 'Ouvindo'] : S.captura ? ['vendo', 'Vendo a tela'] : S.emVoo > 0 ? ['', 'Pensando'] : ['', 'Pronto'];
  E.copEstado.className = 'mc-estado ' + cls + (S.emVoo > 0 ? ' pensando' : '');
  E.copEstado.lastElementChild.textContent = txt;
}
setInterval(() => {
  if (!S.inicio) { E.copRelogio.textContent = '00:00'; return; }
  const s = Math.floor((Date.now() - S.inicio) / 1000);
  E.copRelogio.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}, 1000);
function rodape(extra) {
  if (extra !== undefined) S.extraRodape = extra;
  extra = S.extraRodape;
  const c = S.cont;
  const p = [...c.primeiro].sort((a, b) => a - b);
  const mediana = p.length ? p[Math.floor(p.length / 2)] : null;
  E.copRodape.innerHTML = `<span>⚡ <b>${fmt.int(c.decisoes)}</b> decisões do Jev</span><span>🤫 segurou <b>${c.segurou}</b></span><span>✍️ <b>${c.escritas}</b> textos da IA de texto${mediana != null ? ` · 1ª palavra <b>${seg(mediana)}</b>` : ''}</span>${extra ? `<span>${extra}</span>` : ''}`;
}
function recolherHero() { E.hero.classList.add('recolhido'); }

// ---------------------------------------------------------------- cards do copiloto
function rolarFeed() { /* os cards novos entram no topo */ }
function novoCard({ cor = '#a78bfa', icone = '✨', titulo = '', citacao = null, chips = [], classe = '', esqueleto = true } = {}) {
  if (E.feedVazio && E.feedVazio.isConnected) E.feedVazio.remove();
  const tit = el('span', { class: 'tit', text: `${icone} ${titulo}` });
  const chipsEl = el('span', { style: { display: 'contents' } });
  const rot = el('span', { class: 'rot' });
  const cab = el('div', { class: 'cab' }, [tit, chipsEl, rot]);
  const cit = el('p', { class: 'cit' });
  const fatoEl = el('div', { class: 'fato' });
  const esq = el('div', { class: 'esq' }, [el('i'), el('i')]);
  const txt = el('div', { class: 'txt' });
  const ops = el('div', { class: 'ops' });
  const pe = el('div', { class: 'pe' });
  const root = el('div', { class: `mc-card novo ${classe}` }, [cab, cit, fatoEl, esq, txt, ops, pe]);
  root.style.setProperty('--c', cor);
  ops.hidden = true; esq.hidden = !esqueleto; fatoEl.hidden = true; rot.hidden = true;
  E.feed.prepend(root);
  setTimeout(() => root.classList.remove('novo'), 2600);
  const C = {
    el: root, texto: '', pedido: null,
    titulo(icone2, t) { tit.textContent = `${icone2} ${t}`; },
    cor(c) { root.style.setProperty('--c', c); },
    citar(t) { cit.textContent = t ? `“${t}”` : ''; cit.hidden = !t; },
    // fato do contexto escolhido pelo Jev: aparece na hora, antes de a IA de texto escrever
    fato(f) { fatoEl.hidden = false; fatoEl.replaceChildren(el('span', { class: 'fl', text: `📌 do seu contexto · Jev ${pct(f.p)}` }), el('span', { class: 'ft', text: f.t })); },
    rotulo(t, cls) { rot.hidden = !t; rot.className = 'rot ' + (cls || ''); rot.textContent = t || ''; },
    chips(lista, fila) {
      if (lista) C.base = lista.filter(Boolean);
      const todos = (C.base || []).concat(fila ? [{ t: `na fila: ${fila}º`, title: 'A IA de texto escreve um texto por vez' }] : []);
      chipsEl.replaceChildren(...todos.map((c) => el('span', { class: 'chip ' + (c.cls || ''), text: c.t, title: c.title || '' })));
    },
    esperar() { root.classList.remove('erro', 'respondida', 'previa'); esq.hidden = false; txt.textContent = ''; C.texto = ''; pe.replaceChildren(); ops.hidden = true; },
    comecar() { root.classList.add('escrevendo'); },
    // a versão nova vai substituir o rascunho: ele continua na tela, esmaecido, até a 1ª palavra da nova chegar
    velho() { root.classList.add('velho'); C.trocar = true; if (!C.texto) esq.hidden = false; },
    append(t) {
      if (C.trocar) { C.trocar = false; C.texto = ''; root.classList.remove('velho'); pe.replaceChildren(); }
      if (!C.texto) C.chips(); esq.hidden = true; C.texto += t; txt.textContent = C.texto.replace(/^\s+/, '');
    },
    fim(m) {
      root.classList.remove('escrevendo'); esq.hidden = true;
      C.texto = C.texto.trim(); txt.textContent = C.texto;
      const bts = el('span', { class: 'bts' }, [
        el('button', { type: 'button', title: 'Copiar o texto', onclick: () => copiar(C) }, ['📋 Copiar']),
        C.pedido ? el('button', { type: 'button', title: 'A IA de texto escreve de novo, com mais variação', onclick: () => escrever(C.pedido.tipo, { ...C.pedido, card: C, variar: true }) }, ['🔁 Outra']) : null,
      ]);
      pe.replaceChildren(el('span', { html: `✍️ IA de texto · 1ª palavra <b>${seg(m.primeiro_ms)}</b> · <b>${m.tok_s != null ? String(m.tok_s).replace('.', ',') : '—'}</b> tok/s${m.cache_n ? ` · <b>${fmt.int(m.cache_n)}</b> tokens do cache` : ''}` }), bts);
    },
    erro(msg) { root.classList.remove('escrevendo'); root.classList.add('erro'); esq.hidden = true; txt.textContent = msg; },
    definir(t) { esq.hidden = true; C.trocar = false; root.classList.remove('velho'); C.texto = String(t || '').trim(); txt.textContent = C.texto; },
    // resposta com fonte: o rodapé diz de onde veio, com o link
    fonte(f, extra) {
      root.classList.remove('escrevendo'); esq.hidden = true;
      const bts = el('span', { class: 'bts' }, [el('button', { type: 'button', title: 'Copiar o texto', onclick: () => copiar(C) }, ['📋 Copiar'])]);
      const link = f && f.url ? el('a', { href: f.url, target: '_blank', rel: 'noopener', text: `Wikipédia · ${f.titulo} ↗` }) : el('span', { text: 'sem fonte' });
      pe.replaceChildren(el('span', {}, ['📚 ', link, extra ? ` · ${extra}` : '']), bts);
    },
    opcoes(lista) { ops.hidden = !lista.length; ops.replaceChildren(...lista.map((o) => el('button', { type: 'button', class: o.pri ? 'pri' : '', onclick: o.acao }, [o.t]))); },
    remover() { root.remove(); },
  };
  C.citar(citacao);
  C.chips(chips);
  return C;
}
async function copiar(C) {
  try { await (C.el.ownerDocument.defaultView || window).navigator.clipboard.writeText(C.texto); aviso('Copiado.', 'ok'); } catch { aviso('Não consegui copiar neste navegador.', 'err'); }
}
function linhaFeed(cor, texto) {
  if (E.feedVazio && E.feedVazio.isConnected) E.feedVazio.remove();
  const n = el('div', { class: 'mc-linha-jev', style: { color: cor } }, [el('span', { class: 'd' }), el('span', { style: { color: 'var(--text-muted)' }, text: texto })]);
  E.feed.prepend(n);
  const linhas = [...E.feed.querySelectorAll(':scope > .mc-linha-jev')];
  for (const l of linhas.slice(4)) l.remove();
}

const TITULOS = {
  seguir: ['💬', 'O que dizer agora', '#a78bfa'], perguntas: ['❓', 'Perguntas para fazer', '#60a5fa'], resumo: ['🧾', 'Resumo até agora', '#34d399'],
  email: ['✉️', 'E-mail de follow-up', '#fbbf24'], livre: ['🔎', 'Sua pergunta', '#22d3ee'], atalho: ['⚡', 'Ajuda agora', '#22d3ee'],
  responder: ['💬', 'Resposta sugerida', '#22d3ee'], contornar: ['🛡️', 'Como contornar', '#f87171'], explicar_termo: ['📖', 'Termo explicado', '#a78bfa'],
  saber: ['📚', 'Resposta com fonte', '#34d399'],
};

// ---------------------------------------------------------------- escrever (ações, pergunta livre, ⌘↵, tela)
// janela ESTÁVEL: começa em múltiplos de 10 falas contadas na conversa inteira, então o prefixo que vai ao modelo de texto
// só muda a cada 10 falas e o cache do llama.cpp continua valendo em conversas longas (11 a 20 falas por pedido)
function janelaEstavel(lista) { const n = lista.length; return lista.slice(n > 20 ? Math.floor((n - 11) / 10) * 10 : 0); }
function histEnvio(ate) {
  return janelaEstavel(S.hist.filter((h) => h.final && (ate == null || h.ordem < ate))).map((h) => ({ q: h.q, t: h.t }));
}
function nomeOutro() { return (S.roteiro && S.roteiro.outro) || 'Outra pessoa'; }
function lacunas() {
  const cob = R()?.cobertura || {};
  const lista = cob[S.modo && S.modo in cob ? S.modo : 'generico'] || {};
  const rotulos = R()?.cobertura_rotulos || {};
  return Object.keys(lista).filter((k) => (S.cob[k] ?? 0) < 0.5).map((k) => rotulos[k] || k);
}

function escrever(tipo, o = {}) {
  const [ic, tit, cor] = TITULOS[tipo] || ['✨', 'Ajuda', '#a78bfa'];
  const C = o.card || novoCard({ cor, icone: ic, titulo: tit, citacao: o.pergunta || null });
  C.pedido = { tipo, fala: o.fala, tom: o.tom, acao: o.acao, tela: o.tela, pergunta: o.pergunta };
  C.esperar();
  if (o.card && !o.manterTitulo && TITULOS[tipo]) { C.titulo(ic, tit); C.cor(cor); }
  const body = {
    sid: S.sid, seq: ++S.seq, tipo, historico: histEnvio(), contexto: ctxEnvio(), tom: o.tom, fala: o.fala, variar: !!o.variar,
    acao: o.acao, tela: o.tela, pergunta: o.pergunta, lacunas: lacunas(), notas: S.notas.slice(-8).map((n) => n.t), outro: nomeOutro(),
  };
  S.emVoo++; atualizarEstado();
  const req = postSSE('/api/escrever', body, {
    rotulo: tipo,
    jev: (m) => {
      S.cont.decisoes += m.n || 0; rodape();
      if (m.rota) {
        const fonte = R().fontes[m.rota.fonte];
        C.chips([{ t: `⚡ Jev: ${fonte ? fonte.label : m.rota.fonte} ${pct(m.rota.fonte_p)}`, cls: 'jev', title: 'De onde o Jev decidiu tirar a resposta' }, { t: seg(m.latency_ms) }]);
        raioxRota(m, tipo === 'atalho' ? '⌘↵ ajuda agora' : o.pergunta);
      }
    },
    'llm-inicio': (m) => {
      C.comecar();
      if (m.acao && R().acoes_tela[m.acao]) { const a = R().acoes_tela[m.acao]; C.titulo(a.icone, a.label); C.cor('#22d3ee'); }
      else if (tipo === 'atalho' && TITULOS[m.tipo]) { const [i2, t2, c2] = TITULOS[m.tipo]; C.titulo(i2, t2); C.cor(c2); }
    },
    'llm-fila': (m) => C.chips(null, m.posicao),
    tok: (m) => C.append(m.t),
    'llm-fim': (m) => { C.fim(m); contarEscrita(m); },
    'llm-erro': (m) => C.erro(m.mensagem),
    falha: (m) => C.erro(m.mensagem),
  });
  req.pronto.finally(() => { S.emVoo--; atualizarEstado(); });
  return C;
}
function contarEscrita(m) {
  S.cont.escritas++;
  if (m.primeiro_ms != null) { S.cont.primeiro.push(m.primeiro_ms); if (S.cont.primeiro.length > 50) S.cont.primeiro.shift(); }
  rodape();
}
function acaoRapida(tipo) {
  if (!S.hist.some((h) => h.final)) { aviso('Ainda não há conversa: comece uma simulação, ligue o microfone ou digite uma fala.', 'err'); return; }
  mostrarAba('feed');
  const ult = [...S.hist].reverse().find((h) => h.final && h.d);
  escrever(tipo, { tom: ult && ult.d ? ult.d.tom : 'objetivo' });
}
function perguntar(texto) { mostrarAba('feed'); escrever('livre', { pergunta: texto }); }
function ajudaAgora() {
  const q = E.inAsk.value.trim();
  if (q) { E.inAsk.value = ''; perguntar(q); return; }
  if (!S.hist.some((h) => h.final) && !S.tela) { aviso('Ainda não há conversa nem tela: comece uma simulação, ligue o microfone ou abra uma tela.', 'err'); return; }
  mostrarAba('feed');
  escrever('atalho', {});
}

// ---------------------------------------------------------------- conversa: falas, bolhas e decisões
function novoItem(canal, fonte, extra = {}) {
  const it = { id: ++S.ordem, canal, fonte, roteiro: extra.roteiro || null, q: canal === 'misto' ? '?' : canal, t: '', parcialTexto: '', final: false,
    g: S.geracao, nParciais: 0, palavrasAnalisadas: 0, mapaJev: {} };
  it.fid = `f${S.geracao}-${it.id}`;
  if (E.transVazia && E.transVazia.isConnected) E.transVazia.remove();
  const quem = el('span', { class: 'quem', text: '…' });
  const tx = el('span', { class: 'tx' });
  const tag = el('div', { class: 'tag' });
  const rev = el('div', { class: 'revl' });
  it.bolha = el('div', { class: 'mc-bolha parcial' }, [quem, tx, tag, rev]);
  it.bq = quem; it.btx = tx; it.btag = tag; it.brev = rev;
  E.trans.append(it.bolha);
  if (!S.inicio) S.inicio = Date.now();
  return it;
}
function rolarTrans() { E.trans.scrollTop = E.trans.scrollHeight; }

// texto com as trocas destacadas; o título de cada termo diz o que o reconhecimento de voz tinha escrito
function pintarTexto(alvo, texto, trocas = []) {
  if (!trocas.length) { alvo.textContent = texto; return; }
  const frag = [];
  let resto = texto;
  const ordem = trocas.map((tr) => ({ tr, i: texto.indexOf(tr.para) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i).map((x) => x.tr);
  for (const tr of ordem) {
    const i = resto.indexOf(tr.para);
    if (i < 0) continue;
    frag.push(document.createTextNode(resto.slice(0, i)));
    frag.push(el('mark', { class: 'mc-troca' + (tr.jev ? ' jev' : ''), title: `ouvido: “${tr.de}” · ${tr.jev ? 'o Jev decidiu pelo contexto' : 'glossário'}`, text: tr.para }));
    resto = resto.slice(i + tr.para.length);
  }
  frag.push(document.createTextNode(resto));
  alvo.replaceChildren(...frag);
}
// correção instantânea no navegador: trocas inequívocas do glossário + o que o Jev já decidiu nesta fala
function corrigirLocal(texto, it) {
  const p = ajustar(texto, S.ctx.termosLista || []);
  let t = textoFinal(p, {});
  const trocas = trocasAplicadas(p, {});
  for (const [de, para] of Object.entries((it && it.mapaJev) || {})) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'iu');
    if (re.test(t)) { t = t.replace(re, `$1${para}`); trocas.push({ de, para, jev: true }); }
  }
  return { texto: t, trocas };
}
const normPal = (s) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
function parecido(a, b) {
  const x = normPal(a), y = normPal(b);
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - d[x.length][y.length] / Math.max(1, x.length, y.length);
}

function parcial(texto, canal, fonte, extra = {}) {
  if (!texto) return;
  let it = S.atual[fonte];
  if (!it || it.g !== S.geracao) { it = novoItem(canal, fonte, extra); S.atual[fonte] = it; }
  if (!it.tIni) it.tIni = (extra.meta && extra.meta.t_ini) || performance.now();
  const c = corrigirLocal(texto, it);
  it.parcialTexto = c.texto; it.parcialBruto = texto;
  pintarTexto(it.btx, c.texto, c.trocas);
  rolarTrans();
  if (it.card && it.previa) it.card.citar(c.texto + '…');
  const n = c.texto.split(/\s+/).length;
  if (fonte === 'sim') { if (extra.analisarParcial && !it.parcialEmVoo) analisar(it, { parcial: true }); return; }
  // microfone/aba: analisa nas pausas, a cada ~3 palavras novas, no máximo 4 vezes por fala e uma de cada vez
  clearTimeout(it.tParcial);
  if (n >= 4 && n - it.palavrasAnalisadas >= 3 && it.nParciais < 4) it.tParcial = setTimeout(() => { if (!it.final && !it.parcialEmVoo) analisar(it, { parcial: true }); }, 300);
}
function falaFinal(texto, canal, fonte, extra = {}) {
  texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, S.cfg.limites.fala);
  if (texto.length < 2) return;
  let it = S.atual[fonte];
  S.atual[fonte] = null;
  if (!it || it.g !== S.geracao) it = novoItem(canal, fonte, extra);
  clearTimeout(it.tParcial);
  const c = corrigirLocal(texto, it);
  it.bruto = texto; it.t = c.texto; it.final = true; it.ordem = ++S.ordem; it.tFinal = performance.now();
  it.meta = extra.meta || {};
  it.bolha.className = 'mc-bolha ' + (it.q === '?' ? 'parcial' : it.q);
  if (it.q === '?') it.bolha.classList.add('decidindo');
  it.bq.textContent = it.q === 'v' ? 'Você' : it.q === 'o' ? nomeOutro() : 'Jev decidindo quem falou…';
  pintarTexto(it.btx, c.texto, c.trocas);
  if (it.card && it.previa) it.card.citar(c.texto);
  S.hist.push(it);
  rolarTrans();
  analisar(it, { parcial: false });
  // 2ª camada: o áudio desta fala vai para a transcrição robusta (Whisper + glossário) no servidor
  // (o Scribe já é a transcrição robusta: a revisão pelo Whisper só vale para o reconhecimento do navegador)
  if ((fonte === 'mic' || fonte === 'aba') && S.stt && !(it.meta && it.meta.scribe)) transcreverRobusto(it, fonte);
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); });
}
async function transcreverRobusto(it, fonte) {
  const ouvinte = fonte === 'mic' ? S.mic : S.aba;
  if (!ouvinte || !ouvinte.recortar) return;
  const ini = (it.meta.t_ini || it.tIni || it.tFinal - 3000) - 900, fim = (it.meta.t_fim || it.tFinal) + 250;
  const corte = ouvinte.recortar(ini, fim);
  if (!corte) return;
  const g = S.geracao;
  const tag = el('span', { class: 'rev esperando', text: '🎧 revisando a transcrição…' });
  it.brev.replaceChildren(tag);
  try {
    const audio = await blobParaDataUrl(corte.blob);
    const r = await JevKit.api('/api/transcrever', { sid: S.sid, audio, contexto: ctxEnvio(), historico: histEnvio(it.ordem).slice(-2) }, { silent: true });
    if (g !== S.geracao) return;
    const novo = String(r.texto || '').trim();
    it.sttMs = r.ms; it.sttTexto = novo;
    if (!novo || parecido(novo, it.t) >= 0.9) {
      tag.className = 'rev ok'; tag.textContent = `🎧 transcrição conferida · ${seg(r.ms)}`; tag.title = `Whisper: “${r.bruto || ''}”`;
      return;
    }
    // o recorte de áudio pode ter pegado só parte da fala: se o Whisper ouviu bem menos palavras, fica a do navegador
    if (novo.split(/\s+/).length < 0.6 * it.t.split(/\s+/).length) {
      tag.className = 'rev ok'; tag.textContent = `🎧 mantida a do navegador · ${seg(r.ms)}`; tag.title = `o Whisper ouviu só: “${r.bruto || novo}”`;
      return;
    }
    it.tRobusto = novo; it.revisado = true;
    tag.className = 'rev mudou'; tag.textContent = `🎧 revisada pelo Whisper em ${seg(r.ms)}`; tag.title = `o navegador tinha ouvido: “${it.bruto}”`;
    // a bolha troca na hora; o Jev confere a decisão (e a resposta já escrita) com o texto novo logo em seguida
    const c = corrigirLocal(r.bruto || novo, it);
    it.t = c.texto; pintarTexto(it.btx, c.texto, c.trocas);
    analisar(it, { parcial: false, revisao: true, texto: r.bruto || novo });
  } catch { tag.remove(); }
}

function marcarVisivel(it) { if (!it.tVisivel) it.tVisivel = performance.now(); }
// o card já tinha informação na tela antes de a pessoa terminar a frase? (fato do contexto ou 1ª palavra do rascunho)
function chipAntes(it) {
  if (!it.card || !it.tVisivel || !it.tFinal || it.chipAntes) return;
  const ms = it.tFinal - it.tVisivel;
  if (ms > 150) { it.chipAntes = true; it.chips = [{ t: `⚡ ${seg(ms)} antes do fim da frase`, cls: 'jev', title: 'Tempo entre a 1ª informação no card e o fim da fala' }, ...(it.chips || [])]; it.card.chips(it.chips); }
}
function garantirCard(it, tipo) {
  if (it.card) return it.card;
  const [ic, tit, cor] = TITULOS[tipo] || ['✨', 'Ajuda', '#a78bfa'];
  it.card = novoCard({ cor, icone: ic, titulo: tit, citacao: it.final ? it.t : it.parcialTexto + '…' });
  return it.card;
}

function analisar(it, { parcial: parcialFlag = false, revisao = false, texto = null } = {}) {
  const g = S.geracao;
  const seq = ++S.seq;
  const fala = (texto || (parcialFlag ? it.parcialBruto || it.parcialTexto : it.bruto || it.t)).slice(0, S.cfg.limites.fala);
  if (parcialFlag) { it.parcialEmVoo = true; it.nParciais++; it.palavrasAnalisadas = fala.split(/\s+/).length; }
  const body = {
    sid: S.sid, seq, fid: it.fid, fala, parcial: parcialFlag, revisao, historico: parcialFlag ? histEnvio() : histEnvio(it.ordem),
    contexto: ctxEnvio(), pendente: S.pendente && S.pendente.it !== it ? S.pendente.t : null, canal: it.canal, modo: S.modo || S.ctx.modo,
    auto: S.auto, roteiro: it.roteiro,
  };
  S.emVoo++; atualizarEstado();
  const req = postSSE('/api/escuta', body, {
    rotulo: revisao ? 'fala revisada' : parcialFlag ? 'fala parcial' : 'fala',
    jev: (m) => { if (g !== S.geracao) return; if (revisao) aplicarRevisao(it, m); else if (parcialFlag) aplicarParcial(it, m); else aplicarFinal(it, m); },
    'llm-inicio': (m) => {
      if (g !== S.geracao) return;
      it.seqAtiva = m.seq;
      garantirCard(it, m.tipo).comecar();
      if (m.tipo === 'saber') { it.card.rotulo('procurando na Wikipédia…', 'rasc'); it.card.titulo('📚', 'Resposta com fonte'); it.card.cor('#34d399'); }
      if (m.rascunho) {
        it.estadoResp = 'rascunho'; it.cardRasc = it.card; it.tipoRasc = m.tipo; it.especulativo = !!m.especulativo;
        it.card.rotulo(m.especulativo ? 'rascunho · o Jev está conferindo' : 'rascunho · ouvindo o resto da frase', 'rasc');
      }
      else if (m.versao === 'nova') { it.estadoResp = 'nova'; it.card.rotulo(revisao ? 'versão nova · transcrição revisada' : 'versão nova · a frase completa mudou a resposta', 'nova'); }
      if (m.fila) it.card.chips(null, m.fila);
    },
    'llm-fila': (m) => { if (g === S.geracao && it.card && m.seq === it.seqAtiva) it.card.chips(null, m.posicao); },
    tok: (m) => {
      if (g !== S.geracao || !it.card || m.seq !== it.seqAtiva) return;
      if (!it.tTok) it.tTok = performance.now();
      marcarVisivel(it);
      it.card.append(m.t);
    },
    'llm-fim': (m) => {
      if (g !== S.geracao || !it.card || m.seq !== it.seqAtiva) return;
      it.tFim = performance.now(); it.llm = m; it.card.chips(); it.card.fim(m); contarEscrita(m);
      if (it.estadoResp === 'confirmado') it.card.rotulo('✓ confirmado com a frase completa', 'ok');
    },
    'llm-erro': (m) => { if (g === S.geracao && it.card && m.seq === it.seqAtiva) it.card.erro(m.mensagem); },
    'saber-previa': (m) => {
      if (g !== S.geracao) return;
      const c = garantirCard(it, 'saber');
      c.titulo('📚', `Da fonte · ${m.fonte.titulo}`); c.cor('#34d399');
      c.definir(m.frases.map((f) => '• ' + f).join('\n'));
      c.rotulo('trechos da fonte · resumo chegando…', 'rasc');
      c.fonte(m.fonte, `trechos em ${seg(m.ms)}`);
      it.saberPrevia = m.ms; marcarVisivel(it);
    },
    'saber-fim': (m) => {
      if (g !== S.geracao) return;
      const c = garantirCard(it, 'saber');
      it.saber = m;
      if (m.ok && m.texto) { c.definir(m.texto); c.rotulo('✓ resumo da fonte', 'ok'); c.fonte(m.fonte, `${seg(m.ms)} no total`); }
      else if (m.ok) { c.rotulo('trechos da fonte', 'ok'); c.fonte(m.fonte, `${seg(m.ms)} no total`); }
      else { c.titulo('📚', 'Não achei na fonte'); c.cor('#9ca3af'); c.definir('A Wikipédia não trouxe nada que responda a isso — melhor não arriscar uma resposta.'); c.rotulo('sem fonte', 'nova'); c.fonte(null, m.motivo || ''); }
    },
    rascunho: (m) => {
      if (g !== S.geracao) return;
      it.rascServe = m.serve;
      // só mexe no card que nasceu do rascunho (a decisão final pode já tê-lo trocado por uma oferta ou removido)
      if (!it.card || it.card !== it.cardRasc) { if (m.estado !== 'confirmado' && it.estadoResp === 'rascunho') it.estadoResp = 'descartado'; return; }
      if (m.estado === 'confirmado') { it.estadoResp = 'confirmado'; it.card.rotulo(m.revisao ? '✓ conferido com a transcrição revisada' : '✓ confirmado com a frase completa', 'ok'); }
      else if (m.estado === 'substituido') { it.seqAtiva = m.seq; it.card.velho(); it.card.rotulo(m.revisao ? 'reescrevendo · transcrição revisada…' : 'reescrevendo com a frase completa…', 'nova'); }
      else if (m.estado === 'descartado') { it.estadoResp = 'descartado'; it.card.remover(); it.card = null; it.cardRasc = null; it.seqAtiva = null; }
    },
    erro: (m) => {
      if (g !== S.geracao) return;
      if (!parcialFlag && !revisao) { it.bq.textContent = 'Alguém'; it.bolha.className = 'mc-bolha o'; }
      // o rascunho que começou junto com esta chamada fica sem conferência: sai da tela
      if (it.card && it.card === it.cardRasc && it.estadoResp === 'rascunho' && it.seqAtiva === m.seq) { it.card.remover(); it.card = null; it.cardRasc = null; it.estadoResp = 'descartado'; }
      aviso('Jev: ' + m.mensagem, 'err');
    },
    falha: (m) => { if (g === S.geracao && !parcialFlag) aviso(m.mensagem, 'err'); },
  });
  req.pronto.finally(() => { S.emVoo--; if (parcialFlag) it.parcialEmVoo = false; atualizarEstado(); });
}

const cortar = (t, n = 90) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
function chipsDecisao(d, m) {
  const mom = R().momentos[d.momento];
  return [
    { t: `⚡ Jev ${pct(Math.max(d.precisa, 0))}`, cls: 'jev', title: `precisa_ajuda = ${d.precisa.toFixed(2)} (limiar ${S.cfg.limiar.mostrar})` },
    mom ? { t: `${mom.icone} ${mom.label} ${pct(d.momento_p)}`, title: 'momento' } : null,
    d.urgencia != null ? { t: `urgência ${['nenhuma', 'baixa', 'média', 'alta'][Math.round(d.urgencia)] || '—'}` } : null,
    { t: seg(m.latency_ms), title: 'Latência da decisão do Jev' },
  ];
}
// guarda as trocas que o Jev decidiu nesta fala, para as próximas parciais já saírem corrigidas
function lembrarTrocas(it, m) {
  for (const tr of m.trocas || []) if (tr.jev) it.mapaJev[tr.de] = tr.para;
}

function aplicarParcial(it, m) {
  const d = m.d;
  lembrarTrocas(it, m);
  if (it.final) return;
  it.dParcial = d;
  if (it.canal === 'misto' && d.quem_p >= 0.7) { it.bolha.classList.toggle('lado-o', d.q === 'o'); }
  // o Jev viu, com a frase pela metade, que vale ajudar (ou achou o fato do contexto que responde): o card já aparece
  const chega = d.acao === 'escrever' || (d.q === 'o' && ['pergunta_para_voce', 'objecao', 'termo_tecnico'].includes(d.momento) && d.precisa >= 0.5) || (d.fato && d.q === 'o');
  if (chega && !it.card && S.auto) {
    const mom = R().momentos[d.momento] || { icone: '💡', label: 'Ajuda', cor: '#22d3ee' };
    it.card = novoCard({ cor: mom.cor, icone: mom.icone, titulo: `${mom.label} chegando…`, citacao: it.parcialTexto + '…', classe: 'previa' });
    it.chips = [{ t: `⚡ Jev ${pct(Math.max(d.momento_p, d.precisa))} com a frase pela metade`, cls: 'jev' }, { t: seg(m.latency_ms) }];
    it.card.chips(it.chips);
    it.previa = true;
  }
  if (it.card && d.fato && d.q === 'o' && it.fatoMostrado !== d.fato.id) { it.card.fato(d.fato); it.fatoMostrado = d.fato.id; marcarVisivel(it); }
}

function aplicarFinal(it, m) {
  const d = m.d;
  it.d = d; it.m = m; it.tJev = performance.now();
  lembrarTrocas(it, m);
  if (m.texto) { it.t = m.texto; pintarTexto(it.btx, m.texto, m.trocas || []); }
  if (it.canal === 'misto') it.q = d.q;
  // bolha: o lado é a decisão do Jev (quem falou)
  it.bolha.className = 'mc-bolha ' + it.q;
  it.bq.textContent = (it.q === 'v' ? 'Você' : nomeOutro()) + (it.canal === 'misto' ? ` · Jev ${pct(d.quem_p)}` : '');
  const mom = R().momentos[d.momento] || { icone: '•', label: d.momento, cor: '#9ca3af' };
  const ajudou = d.acao === 'escrever' && S.auto;
  it.btag.replaceChildren(
    el('span', { class: 'mom', text: `${mom.icone} ${mom.label} ${pct(d.momento_p)}` }),
    ajudou ? el('span', { class: 'ajudou', text: '✍️ copiloto ajudou' }) : d.acao === 'oferecer' ? el('span', { class: 'ajudou', text: '💡 ofereceu ajuda' }) : el('span', { class: 'segurou', text: '🤫 Jev não interrompeu' }),
    el('span', { text: seg(m.latency_ms) }),
    ...(m.trocas && m.trocas.length ? [el('span', { class: 'ajs', title: m.trocas.map((t) => `“${t.de}” → ${t.para}`).join(' · '), text: `🔧 ${m.trocas.length} termo${m.trocas.length > 1 ? 's' : ''} ajustado${m.trocas.length > 1 ? 's' : ''}` })] : []),
  );
  rolarTrans();
  // linha do tempo
  const pt = el('span', { class: 'mc-pt ' + (ajudou || d.acao === 'oferecer' ? 'ajudou' : d.acao === 'nada' ? 'segurou' : ''), title: `${it.q === 'v' ? 'Você' : nomeOutro()}: ${mom.label} ${pct(d.momento_p)} · ${ajudou ? 'ajudou' : 'não interrompeu'} — “${cortar(it.t, 60)}”` });
  pt.style.background = mom.cor; pt.style.color = mom.cor;
  E.timeline.append(pt);
  while (E.timeline.children.length > 44) E.timeline.firstElementChild.remove();
  // contadores
  S.cont.falas++; S.cont.decisoes += m.n || 0;
  if (d.acao === 'nada') S.cont.segurou++;
  rodape();
  // modo e cobertura
  if (d.modo && d.modo_p >= 0.6) { S.modo = d.modo; S.modoP = d.modo_p; }
  const md = R().modos[S.modo];
  E.copModo.innerHTML = md ? `modo: <b>${md.icone} ${md.label}</b> ${pct(S.modoP)}` : 'modo: —';
  S.cob = { ...S.cob, ...d.cobertura };
  desenharCobertura();
  // pergunta pendente → "você respondeu"
  if (it.q === 'v' && S.pendente && (d.respondeu ?? 0) >= 0.5) {
    if (S.pendente.it.card) S.pendente.it.card.el.classList.add('respondida');
    S.pendente = null;
  }
  if (it.q === 'o' && d.momento === 'pergunta_para_voce' && d.momento_p >= 0.5) S.pendente = { t: it.t, it };
  // notas
  if (d.nota && it.t) anotar(it, d);
  raioxEscuta(it, m);
  // card de ajuda
  const escreve = d.acao === 'escrever' && S.auto;
  const comFonte = escreve && (d.geral ?? 0) >= S.cfg.limiar.geral && ['responder', 'explicar_termo'].includes(d.tipo);
  if (escreve) {
    const [ic, tit, cor] = TITULOS[comFonte ? 'saber' : d.tipo] || ['✨', 'Ajuda', mom.cor];
    if (!it.card) it.card = novoCard({ cor, icone: ic, titulo: tit, citacao: it.t });
    it.card.el.classList.remove('previa');
    it.card.titulo(ic, tit); it.card.cor(cor); it.card.citar(it.t);
    const antes = it.chipAntes ? (it.chips || []).filter((c) => c && /antes do fim/.test(c.t)) : [];
    it.chips = [...antes, ...chipsDecisao(d, m), ...(d.tom && R().tons[d.tom] ? [{ t: `tom ${R().tons[d.tom].label}` }] : [])];
    it.card.chips(it.chips);
    it.card.pedido = { tipo: d.tipo, fala: it.t, tom: d.tom };
    if (d.fato && d.q === 'o' && it.fatoMostrado !== d.fato.id) { it.card.fato(d.fato); it.fatoMostrado = d.fato.id; marcarVisivel(it); }
    chipAntes(it);
    it.previa = false;
  } else if (d.acao === 'oferecer' || (d.acao === 'escrever' && !S.auto)) {
    if (it.card) it.card.remover();
    if (it.estadoResp === 'rascunho') it.estadoResp = 'descartado';
    const aj = R().ajudas[d.tipo] || { icone: '💡', label: 'Ajuda' };
    const C = novoCard({ cor: '#fbbf24', icone: '💡', titulo: `Talvez valha: ${aj.label.toLowerCase()}`, citacao: it.t, classe: 'oferta', esqueleto: false });
    C.chips([{ t: `⚡ Jev ${pct(d.precisa)}`, cls: 'jev', title: `precisa_ajuda entre ${S.cfg.limiar.sugerir} e ${S.cfg.limiar.mostrar}: o Jev oferece, você decide` }]);
    if (d.fato && d.q === 'o') C.fato(d.fato);
    C.opcoes([{ t: `${aj.icone} Escrever agora`, pri: true, acao: () => { C.el.classList.remove('oferta'); C.opcoes([]); escrever(d.tipo, { card: C, fala: it.t, tom: d.tom }); } }]);
    it.card = C; it.previa = false; it.seqAtiva = null;
  } else if (it.card && (it.previa || it.card === it.cardRasc)) {
    it.card.remover(); it.card = null; it.seqAtiva = null;
    if (it.estadoResp === 'rascunho') it.estadoResp = 'descartado';
  }
}

// transcrição robusta chegou e mudou o texto: atualiza a bolha; o servidor confere a resposta (confirma ou reescreve)
function aplicarRevisao(it, m) {
  const d = m.d;
  lembrarTrocas(it, m);
  it.t = m.texto || it.tRobusto || it.t; it.dRevisao = d;
  pintarTexto(it.btx, it.t, m.trocas || []);
  if (it.canal === 'misto' && d.q !== it.q && d.quem_p >= 0.8) {
    it.q = d.q; it.bolha.className = 'mc-bolha ' + it.q;
    it.bq.textContent = (it.q === 'v' ? 'Você' : nomeOutro()) + ` · Jev ${pct(d.quem_p)}`;
  }
  if (it.q === 'o' && d.momento === 'pergunta_para_voce' && d.momento_p >= 0.5 && !(S.pendente && S.pendente.it === it)) S.pendente = { t: it.t, it };
  if (d.acao === 'escrever' && S.auto && !it.card) {
    const [ic, tit, cor] = TITULOS[d.tipo] || ['✨', 'Ajuda', '#22d3ee'];
    it.card = novoCard({ cor, icone: ic, titulo: tit, citacao: it.t });
    it.chips = chipsDecisao(d, m); it.card.chips(it.chips);
    it.card.pedido = { tipo: d.tipo, fala: it.t, tom: d.tom };
    it.card.rotulo('só apareceu na transcrição revisada', 'nova');
  }
  if (it.card && d.fato && d.q === 'o' && it.fatoMostrado !== d.fato.id) { it.card.fato(d.fato); it.fatoMostrado = d.fato.id; }
  raioxEscuta(it, m);
}

function anotar(it, d) {
  const mom = R().momentos[d.nota] || { icone: '📌', label: 'Nota' };
  const dono = { voce: 'Você', outra_pessoa: nomeOutro(), ambos: 'Os dois' }[d.dono] || '';
  const n = { t: `${mom.label}${dono ? ` (${dono})` : ''}: ${it.t}`, icone: mom.icone };
  S.notas.push(n);
  if (E.notasVazio && E.notasVazio.isConnected) E.notasVazio.remove();
  E.notasLista.append(el('li', {}, [el('span', { class: 'ic', text: mom.icone }), el('div', {}, [el('span', { class: 'dono', text: `${mom.label}${dono ? ' · ' + dono : ''}` }), it.t])]));
  E.nNotas.textContent = String(S.notas.length);
  E.nNotas.classList.remove('pula'); void E.nNotas.offsetWidth; E.nNotas.classList.add('pula');
  if (['tarefa_ou_prazo', 'decisao'].includes(d.nota)) linhaFeed(mom.cor, `${mom.icone} ${mom.label} anotada${dono ? ' · ' + dono : ''}: ${cortar(it.t, 70)}`);
}
function desenharCobertura() {
  const cob = R()?.cobertura || {};
  const modo = S.modo && S.modo in cob ? S.modo : 'generico';
  const lista = cob[modo] || {};
  const rotulos = R()?.cobertura_rotulos || {};
  E.cobertura.replaceChildren(...Object.keys(lista).map((k) => el('span', { class: (S.cob[k] ?? 0) >= 0.5 ? 'ok' : '', title: `${lista[k]}: ${pct(S.cob[k] ?? 0)}`, text: `${(S.cob[k] ?? 0) >= 0.5 ? '✓' : '○'} ${rotulos[k] || k}` })));
}
function mostrarAba(aba) {
  for (const b of E.copiloto.querySelectorAll('.mc-aba')) { const on = b.dataset.aba === aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
  E.feed.hidden = aba !== 'feed'; E.notas.hidden = aba !== 'notas';
}

function resetConversa() {
  S.geracao++;
  for (const k of Object.keys(S.atual)) S.atual[k] = null;
  S.hist = []; S.pendente = null; S.modo = null; S.modoP = 0; S.cob = {}; S.notas = []; S.inicio = null;
  S.cont = { falas: 0, decisoes: 0, ajudas: 0, segurou: 0, escritas: 0, primeiro: [] };
  E.trans.replaceChildren(); E.feed.replaceChildren(); E.timeline.replaceChildren(); E.notasLista.replaceChildren();
  E.nNotas.textContent = '0'; E.copModo.textContent = 'modo: —';
  E.raioxCorpo.replaceChildren(el('div', { class: 'mc-vazio', text: 'Assim que alguém falar, você vê aqui cada decisão do Jev com as probabilidades.' }));
  desenharCobertura(); rodape(); mostrarAba('feed');
}

// ---------------------------------------------------------------- Raio-X
function bloco(titulo, codigo, fill) {
  const corpo = el('div');
  const b = el('div', { class: 'mc-rx' }, [el('div', { class: 't' }, [el('b', { text: titulo }), el('code', { text: codigo })]), corpo]);
  fill(corpo);
  return b;
}
const simNao = (p, sim = 'sim', nao = 'não') => ({ probs: { s: p || 0, n: 1 - (p || 0) }, labels: { s: sim, n: nao } });
function barrasSimNao(c, p, sim, nao) { const x = simNao(p, sim, nao); bars(c, x.probs, { labels: x.labels, order: 'keys', keys: ['s', 'n'] }); }
function labelsDe(obj) { return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v.icone ? v.icone + ' ' : ''}${v.label || k}`])); }
function raioxEscuta(it, m) {
  const a = m.answers || {}, d = m.d;
  E.raioxInfo.innerHTML = `<b>${m.n}</b> perguntas numa chamada · <b>${seg(m.latency_ms)}</b> · ${fmt.usd(m.cost)}${m.cached ? ' · cache' : ''}`;
  const blocos = [
    el('div', { class: 'mc-rx fala' }, [el('span', { text: `${it.q === 'v' ? 'Você' : nomeOutro()}: ` }), el('q', { text: it.t })]),
  ];
  const add = (t, c, f) => blocos.push(bloco(t, c, f));
  if (a.quem_fala) add('Quem falou', 'quem_fala · choice', (c) => bars(c, a.quem_fala.probabilities, { labels: { voce: 'Você', outra_pessoa: nomeOutro() } }));
  if (a.momento) add('O que aconteceu', 'momento · choice', (c) => bars(c, a.momento.probabilities, { labels: labelsDe(R().momentos), limit: 3 }));
  if (a.precisa_ajuda) add('Vale interromper?', 'precisa_ajuda · noul', (c) => barrasSimNao(c, a.precisa_ajuda.noul, 'sim, ajudar', 'não'));
  if (a.ajuda) add('Que ajuda', 'ajuda · choice', (c) => bars(c, a.ajuda.probabilities, { labels: labelsDe(R().ajudas), limit: 3 }));
  if (a.urgencia) add('Urgência', 'urgencia · score', (c) => scoreMeter(c, a.urgencia, { short: ['nenhuma', 'baixa', 'média', 'alta'] }));
  if (a.tom) add('Tom da resposta', 'tom · choice', (c) => bars(c, a.tom.probabilities, { labels: labelsDe(R().tons), limit: 3 }));
  if (a.sentimento) add(`Humor de ${nomeOutro()}`, 'sentimento · score', (c) => scoreMeter(c, a.sentimento, { short: ['😠', '😕', '😐', '🙂', '😄'], colors: ['#f87171', '#fb923c', '#9ca3af', '#34d399', '#22d3ee'] }));
  if (a.modo) add('Tipo de conversa', 'modo · choice', (c) => bars(c, a.modo.probabilities, { labels: labelsDe(R().modos), limit: 3 }));
  if (a.tem_termo) add('Tem termo técnico?', 'tem_termo · noul', (c) => barrasSimNao(c, a.tem_termo.noul));
  if (a.importante) add('Vai para as notas?', 'importante · noul', (c) => barrasSimNao(c, a.importante.noul));
  if (a.respondeu) add('Respondeu a pendente?', 'respondeu · noul', (c) => barrasSimNao(c, a.respondeu.noul));
  if (a.dono_tarefa) add('Dono da tarefa', 'dono_tarefa · choice', (c) => bars(c, a.dono_tarefa.probabilities, { labels: { voce: 'Você', outra_pessoa: nomeOutro(), ambos: 'Os dois', nenhum: 'Nenhuma tarefa' }, limit: 2 }));
  const cobs = Object.entries(d.cobertura || {});
  if (cobs.length) add('Cobertura da conversa', `${cobs.length} × noul`, (c) => bars(c, Object.fromEntries(cobs), { labels: R().cobertura_rotulos, order: 'keys', keys: cobs.map(([k]) => k) }));
  E.raioxCorpo.replaceChildren(...blocos);
}
function raioxTela(res) {
  const a = res.answers || {};
  const d = res.d;
  E.raioxInfo.innerHTML = `tela: OCR <b>${seg(res.ocr_ms)}</b>${res.ocr_cache ? ' (cache)' : ''} · <b>${res.n}</b> perguntas numa chamada · <b>${seg(res.latency_ms)}</b> · ${fmt.usd(res.cost)}`;
  const blocos = [el('div', { class: 'mc-rx fala' }, [el('span', { text: `Tela: ${res.linhas.length} linhas lidas; o Jev marcou ${d.escolhidas.length} de ${res.itens.length} como importantes (uma pergunta noul por linha).` })])];
  const add = (t, c, f) => blocos.push(bloco(t, c, f));
  if (a.tipo_tela) add('O que é a tela', 'tipo_tela · choice', (c) => bars(c, a.tipo_tela.probabilities, { labels: labelsDe(R().tipos_tela), limit: 3 }));
  if (a.acao) add('Ajuda mais útil', 'acao · choice', (c) => bars(c, a.acao.probabilities, { labels: labelsDe(R().acoes_tela), limit: 3 }));
  if (a.vale_sugerir) add('Oferecer sem pedir?', 'vale_sugerir · noul', (c) => barrasSimNao(c, a.vale_sugerir.noul));
  if (a.tom) add('Tom', 'tom · choice', (c) => bars(c, a.tom.probabilities, { labels: labelsDe(R().tons), limit: 3 }));
  const linhas = res.itens.slice().sort((x, y) => (d.rel[y.id] || 0) - (d.rel[x.id] || 0)).slice(0, 6);
  add('Linhas mais importantes', 'l01…lNN · noul', (c) => bars(c, Object.fromEntries(linhas.map((l) => [l.id, d.rel[l.id] || 0])), { labels: Object.fromEntries(linhas.map((l) => [l.id, l.t])), order: 'keys', keys: linhas.map((l) => l.id) }));
  E.raioxCorpo.replaceChildren(...blocos);
}
function raioxRota(m, pergunta) {
  const a = m.answers || {};
  E.raioxInfo.innerHTML = `rota: <b>${m.n}</b> perguntas numa chamada · <b>${seg(m.latency_ms)}</b> · ${fmt.usd(m.cost)}`;
  const blocos = [el('div', { class: 'mc-rx fala' }, [el('span', { text: 'Pedido: ' }), el('q', { text: pergunta || '' })])];
  const add = (t, c, f) => blocos.push(bloco(t, c, f));
  if (a.fonte) add('De onde vem a resposta', 'fonte · choice', (c) => bars(c, a.fonte.probabilities, { labels: Object.fromEntries(Object.entries(R().fontes).map(([k, v]) => [k, v.label])) }));
  if (a.formato) add('Formato', 'formato · choice', (c) => bars(c, a.formato.probabilities, { labels: Object.fromEntries(Object.entries(R().formatos).map(([k, v]) => [k, v.label])), limit: 3 }));
  if (a.tamanho) add('Tamanho', 'tamanho · score', (c) => scoreMeter(c, a.tamanho, { short: ['1 frase', '3 frases', '5 tópicos', '120 palavras'] }));
  if (a.idioma) add('Idioma', 'idioma · choice', (c) => bars(c, a.idioma.probabilities, { labels: { portugues: 'Português', ingles: 'Inglês', espanhol: 'Espanhol' } }));
  E.raioxCorpo.replaceChildren(...blocos);
}

// ---------------------------------------------------------------- tela
function mostrarImagem(src) {
  E.telaVideo.hidden = true; E.telaImg.hidden = false; E.telaVazia.hidden = true;
  E.telaImg.src = src;
}
async function lerTela({ exemplo = null, imagem = null, explicito = false } = {}) {
  if (S.lendoTela) return;
  S.lendoTela = true; S.emVoo++; atualizarEstado();
  E.telaScan.hidden = false;
  desenharCaixas(E.telaCaixas, null);
  E.telaStatus.textContent = 'lendo a tela no servidor…';
  E.telaRodape.textContent = '';
  try {
    const res = await JevKit.api('/api/tela', { sid: S.sid, exemplo, imagem, contexto: ctxEnvio(), historico: histEnvio().slice(-6) }, { label: 'tela' });
    S.tela = res;
    E.telaScan.hidden = true;
    const d = res.d;
    const tipo = R().tipos_tela[d.tipo] || { icone: '🖥️', label: d.tipo };
    const ac = R().acoes_tela[d.acao] || { icone: '✨', label: d.acao };
    E.telaStatus.innerHTML = `${tipo.icone} <b>${tipo.label}</b> ${pct(d.tipo_p)}`;
    E.telaRodape.innerHTML = `<span>🔎 OCR <b>${seg(res.ocr_ms)}</b>${res.ocr_cache ? ' (cache)' : ''} · <b>${res.linhas.length}</b> linhas</span><span>⚡ Jev <b>${seg(res.latency_ms)}</b>: <b>${d.escolhidas.length}</b> linhas importantes</span><span class="jev-badge info">${ac.icone} ${ac.label} ${pct(d.acao_p)}</span>`;
    S.cont.decisoes += res.n || 0; rodape();
    raioxTela(res);
    cardTela(res, { explicito });
    await animarCaixas(E.telaCaixas, res);
  } catch (e) {
    E.telaScan.hidden = true;
    E.telaStatus.textContent = e.message || 'Não consegui ler a tela.';
  } finally {
    S.lendoTela = false; S.emVoo--; atualizarEstado();
  }
}
function cardTela(res, { explicito }) {
  const d = res.d;
  const tipo = R().tipos_tela[d.tipo] || { icone: '🖥️', label: 'Tela' };
  mostrarAba('feed');
  const C = novoCard({ cor: '#22d3ee', icone: tipo.icone, titulo: `${tipo.label} na tela`, esqueleto: false });
  C.chips([{ t: `⚡ Jev ${pct(d.tipo_p)}`, cls: 'jev' }, { t: `${d.escolhidas.length} de ${res.itens.length} linhas importantes` }, { t: seg(res.latency_ms) }]);
  if (d.acao === 'nenhuma' || d.tipo === 'pouco_texto') {
    C.erro(d.tipo === 'pouco_texto' ? 'Quase não há texto legível nesta tela. O mini Cluely lê textos (OCR); imagens e vídeos ele não entende.' : 'O Jev não viu nada útil para fazer com esta tela agora.');
    C.el.classList.remove('erro');
    return;
  }
  const opcoes = [d.acao];
  if (d.acao_2 && d.acao_2.k && d.acao_2.k !== 'nenhuma' && d.acao_2.p >= 0.08) opcoes.push(d.acao_2.k);
  if (!opcoes.includes('resumir')) opcoes.push('resumir');
  const rodar = (acao) => { C.opcoes([]); escrever('tela', { card: C, acao, tela: res.hash, manterTitulo: true }); };
  C.opcoes(opcoes.slice(0, 3).map((k, i) => { const a = R().acoes_tela[k]; return { t: `${a.icone} ${a.label}${i === 0 ? ` · ${pct(d.acao_p)}` : ''}`, pri: i === 0, acao: () => rodar(k) }; }));
  if (explicito && d.oferecer) rodar(d.acao);
  else if (d.oferecer) linhaFeed('#22d3ee', `👀 A tela mudou: ${tipo.label.toLowerCase()} — o Jev sugere “${R().acoes_tela[d.acao].label}” (⌘↵)`);
}
function abrirExemplo(id) {
  const t = S.cfg.telas.find((x) => x.id === id);
  if (!t) return;
  pararCaptura(true);
  const conversando = (S.sim && S.sim.ativo) || (S.mic && S.mic.ligado);
  if (!conversando && S.ctx.id !== t.contexto) setContexto(t.contexto, { silencioso: false });
  for (const b of document.querySelectorAll('[data-tela]')) b.classList.toggle('ativo', b.dataset.tela === id);
  recolherHero();
  mostrarImagem(`/telas/${id}.png`);
  lerTela({ exemplo: id, explicito: true });
}

async function alternarCaptura() {
  if (S.captura) { pararCaptura(); return; }
  if (!CAPTURA_OK) { aviso('Este navegador não compartilha a tela. Use o Chrome ou o Edge no computador — ou um exemplo.', 'err'); return; }
  let stream;
  try { stream = await capturar(); } catch (e) { if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') aviso('Não consegui compartilhar a tela: ' + (e.message || e.name), 'err'); return; }
  recolherHero();
  for (const b of document.querySelectorAll('[data-tela]')) b.classList.remove('ativo');
  E.telaImg.hidden = true; E.telaVazia.hidden = true; E.telaVideo.hidden = false;
  E.telaVideo.srcObject = stream;
  try { await E.telaVideo.play(); } catch { /* autoplay mudo costuma passar */ }
  S.captura = { stream, lida: null, anterior: null, ultima: 0, autos: 0 };
  E.btnTela.setAttribute('aria-pressed', 'true'); E.btnTela.querySelector('.lbl').textContent = 'Parar de compartilhar';
  const [vt] = stream.getVideoTracks();
  if (vt) vt.addEventListener('ended', () => pararCaptura());
  const [at] = stream.getAudioTracks();
  if (at) iniciarAudioAba(at);
  else aviso('Compartilhado sem áudio. Para o copiloto ouvir a reunião, compartilhe uma ABA e marque “compartilhar áudio”.');
  setTimeout(() => lerCaptura(true), 800);
  S.captura.timer = setInterval(vigiarTela, 1500);
  atualizarEstado();
}
function lerCaptura(explicito) {
  if (!S.captura) return;
  const url = quadro(E.telaVideo, S.cfg.limites.imagemBytes - 200_000);
  if (!url) return;
  S.captura.lida = miniatura(E.telaVideo); S.captura.ultima = Date.now();
  lerTela({ imagem: url, explicito });
}
function vigiarTela() {
  if (!S.captura || S.lendoTela || !E.chkObservar.checked) return;
  const m = miniatura(E.telaVideo);
  const mudou = diferenca(m, S.captura.lida) > 6;
  const parada = diferenca(m, S.captura.anterior) < 2;
  S.captura.anterior = m;
  if (mudou && parada && Date.now() - S.captura.ultima > 6000 && S.captura.autos < 40) { S.captura.autos++; lerCaptura(false); }
}
function pararCaptura(silencioso) {
  if (!S.captura) return;
  clearInterval(S.captura.timer);
  S.captura.stream.getTracks().forEach((t) => t.stop());
  S.captura = null;
  if (S.aba) { S.aba.desligar(); S.aba = null; }
  E.telaVideo.srcObject = null;
  E.btnTela.setAttribute('aria-pressed', 'false'); E.btnTela.querySelector('.lbl').textContent = 'Compartilhar tela ou aba';
  if (!silencioso && E.telaImg.hidden) { E.telaVideo.hidden = true; E.telaVazia.hidden = false; desenharCaixas(E.telaCaixas, null); E.telaStatus.textContent = ''; E.telaRodape.textContent = ''; }
  atualizarEstado();
}

// ---------------------------------------------------------------- ouvir: microfone e áudio da aba
const canalMic = () => (S.aba && S.aba.ligado ? 'v' : 'misto');
// Termos que o Scribe deve reconhecer (keyterms, máx. 50 com até 20 letras): os do contexto primeiro, depois os que o
// reconhecimento de voz mais erra em conversas de trabalho em português ("reggae" por RAG, "o que acesse" por CAC…)
const TERMOS_SCRIBE = ['LLM', 'GPT', 'ChatGPT', 'OpenAI', 'Claude', 'Claude Code', 'Anthropic', 'Gemini', 'RAG', 'embeddings',
  'fine-tuning', 'tokens', 'prompt', 'evals', 'agente de IA', 'MCP', 'API', 'n8n', 'webhook', 'deploy', 'GitHub', 'Supabase',
  'Docker', 'Kubernetes', 'CRM', 'ERP', 'SaaS', 'B2B', 'KPI', 'OKR', 'CAC', 'LTV', 'churn', 'NPS', 'MVP', 'ROI', 'EBITDA',
  'guardrail', 'banco vetorial', 'Postgres', 'VPS', 'HubSpot', 'Zapier', 'WhatsApp', 'Vercel', 'Next.js', 'React', 'backend', 'frontend', 'Cursor'];
function keyterms() {
  const vistos = new Set(), out = [];
  for (const t of [...(S.ctx.termosLista || []), ...TERMOS_SCRIBE]) {
    const x = String(t).trim(), k = x.toLowerCase();
    if (x.length < 2 || x.length > 20 || vistos.has(k)) continue;
    vistos.add(k); out.push(x);
    if (out.length >= 50) break;
  }
  return out;
}
// com a chave do ElevenLabs no servidor, microfone e aba passam pelo Scribe; sem ela, pelo reconhecimento do navegador
const novoOuvinte = (opts) => (S.cfg.scribe ? criarOuvinteScribe({ ...opts, keyterms: keyterms(), sid: S.sid }) : criarOuvinte(opts));
function nivelMic(v) {
  const bs = E.btnMic.querySelectorAll('.mc-nivel i');
  bs.forEach((b, i) => { b.style.height = `${3 + Math.max(0, Math.min(1, v * (1.2 - i * 0.12))) * 11}px`; });
}
function alternarMic() {
  if (S.mic && S.mic.ligado) { S.mic.desligar(); return; }
  if (S.sim && S.sim.ativo) pararSimulacao();
  S.mic = novoOuvinte({
    onParcial: (t, meta) => parcial(t, canalMic(), 'mic', { meta }),
    onFinal: (t, meta) => falaFinal(t, canalMic(), 'mic', { meta }),
    onNivel: nivelMic,
    onEstado: (e, msg) => {
      E.btnMic.setAttribute('aria-pressed', String(e === 'ouvindo'));
      E.btnMic.querySelector('.lbl').textContent = e === 'ouvindo' ? 'Ouvindo…' : 'Microfone';
      E.convStatus.textContent = e === 'ouvindo' ? (S.aba && S.aba.ligado ? 'microfone = Você · aba = outra pessoa' : 'microfone: o Jev decide quem falou') + (S.cfg.scribe ? ' · transcrição ElevenLabs Scribe' : '') : '';
      if (msg && e === 'erro') aviso(msg, 'err');
      atualizarEstado();
    },
  });
  if (S.mic.ligar()) recolherHero();
}
function iniciarAudioAba(trilha) {
  if (!S.cfg.scribe && !SR) { aviso('Este navegador não transcreve áudio. Use o Chrome ou o Edge no computador.', 'err'); return; }
  if (!S.cfg.scribe && !TRILHA_OK) { aviso('Seu navegador ainda não transcreve o áudio de uma aba. Ligue o 🎙️ microfone com o som da reunião no alto-falante.', 'err'); return; }
  S.aba = novoOuvinte({
    trilha,
    onParcial: (t, meta) => parcial(t, 'o', 'aba', { meta }),
    onFinal: (t, meta) => falaFinal(t, 'o', 'aba', { meta }),
    onEstado: (e, msg) => {
      E.convStatus.textContent = e === 'ouvindo' ? 'ouvindo o áudio da aba (outra pessoa)' : '';
      if (msg && e === 'erro') aviso('Áudio da aba: ' + msg, 'err');
      atualizarEstado();
    },
  });
  S.aba.ligar();
}

// ---------------------------------------------------------------- simulação
function iniciarSimulacao(id) {
  const r = S.cfg.roteiros.find((x) => x.id === id);
  if (!r) return;
  pararSimulacao();
  if (S.mic && S.mic.ligado) S.mic.desligar();
  resetConversa();
  S.roteiro = r;
  setContexto(r.contexto, { silencioso: false });
  recolherHero();
  for (const b of document.querySelectorAll('[data-sim]')) b.classList.toggle('ativo', b.dataset.sim === id);
  E.convStatus.textContent = `${r.emoji} ${r.titulo} · o Jev decide quem falou`;
  S.sim = simular(r.falas, {
    vel: () => S.vel,
    onParcial: (txt, f, i, w, n) => parcial(txt, 'misto', 'sim', { roteiro: r.id, analisarParcial: n >= 6 && (w === Math.ceil(n * 0.4) || w === Math.ceil(n * 0.7)) }),
    onFinal: (txt) => falaFinal(txt, 'misto', 'sim', { roteiro: r.id }),
    onFim: () => { E.btnParar.hidden = true; E.convStatus.textContent = `${r.emoji} ${r.titulo} · fim — peça 🧾 Resumo ou ✉️ E-mail`; atualizarEstado(); },
  });
  E.btnParar.hidden = false;
  atualizarEstado();
}
function pararSimulacao() {
  if (S.sim) { S.sim.parar(); S.sim = null; }
  E.btnParar.hidden = true;
  for (const b of document.querySelectorAll('[data-sim]')) b.classList.remove('ativo');
  atualizarEstado();
}
document.addEventListener('visibilitychange', () => {
  if (!S.sim) return;
  if (document.hidden && !pip) S.sim.pausar(); else S.sim.continuar();
});

// ---------------------------------------------------------------- flutuar (Document Picture-in-Picture) e ocultar
async function flutuar() {
  if (pip) { pip.close(); return; }
  if (!('documentPictureInPicture' in window)) { aviso('A janela flutuante precisa do Chrome ou do Edge no computador. Aqui, o copiloto continua na lateral.', 'err'); return; }
  let w;
  try { w = await window.documentPictureInPicture.requestWindow({ width: 440, height: 720 }); } catch (e) { aviso('Não consegui abrir a janela flutuante: ' + (e.message || e.name), 'err'); return; }
  pip = w;
  const doc = w.document;
  doc.documentElement.lang = 'pt-BR';
  doc.title = 'Mini Cluely';
  for (const n of document.querySelectorAll('link[rel="stylesheet"]')) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = n.href; doc.head.append(l); }
  for (const n of document.querySelectorAll('style')) doc.head.append(n.cloneNode(true));
  doc.body.classList.add('mc-pip');
  doc.body.append(E.copiloto);
  E.avisoFlutuando.hidden = false;
  doc.addEventListener('keydown', teclas);
  w.addEventListener('pagehide', () => {
    E.copilotoSlot.append(E.copiloto);
    E.avisoFlutuando.hidden = true;
    pip = null;
  });
}
function alternarOculto() {
  E.copiloto.classList.toggle('oculto');
  E.btnOcultar.textContent = E.copiloto.classList.contains('oculto') ? '+' : '–';
}
function teclas(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === 'Enter') { e.preventDefault(); ajudaAgora(); }
  else if (mod && (e.key === '\\' || e.code === 'Backslash' || e.code === 'IntlBackslash')) { e.preventDefault(); alternarOculto(); }
}

// ---------------------------------------------------------------- início
async function init() {
  const raw = (await JevKit.api('/api/config')) || {};
  const cfg = {
    contextos: Array.isArray(raw.contextos) ? raw.contextos : [],
    roteiros: Array.isArray(raw.roteiros) ? raw.roteiros : [],
    telas: Array.isArray(raw.telas) ? raw.telas : [],
    ...raw,
  };
  S.cfg = cfg;
  for (const c of cfg.contextos) E.selContexto.append(el('option', { value: c.id, text: `${c.emoji} ${c.titulo}` }));
  setContexto(ler('mc:ctx') || 'vendas');
  E.sims.replaceChildren(...cfg.roteiros.map((r) => el('button', { class: 'jev-chip', type: 'button', 'data-sim': r.id, title: `${r.titulo}: ${r.resumo}` }, [`${r.emoji} ${r.curto || r.titulo}`])));
  E.telaVazia.append(el('div', { class: 'mc-galeria' }, cfg.telas.map((t) => el('button', { type: 'button', 'data-tela': t.id, title: `Abrir: ${t.titulo}` }, [el('img', { src: `/telas/${t.id}-mini.jpg`, alt: '' }), el('span', { text: `${t.emoji} ${t.titulo}` })]))));
  E.telasEx.replaceChildren(...cfg.telas.map((t) => el('button', { class: 'jev-chip mc-tela-chip', type: 'button', 'data-tela': t.id, title: t.titulo }, [el('img', { src: `/telas/${t.id}-mini.jpg`, alt: '' }), `${t.emoji} ${t.titulo.split(' ')[0]}`])));
  desenharCobertura();
  rodape();

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sim],[data-tela],[data-flutuar]');
    if (!b) return;
    if (b.dataset.sim) iniciarSimulacao(b.dataset.sim);
    else if (b.dataset.tela) abrirExemplo(b.dataset.tela);
    else flutuar();
  });
  E.copiloto.addEventListener('click', (e) => {
    const a = e.target.closest('[data-acao]'); if (a) { acaoRapida(a.dataset.acao); return; }
    const t = e.target.closest('[data-aba]'); if (t) mostrarAba(t.dataset.aba);
    if (e.target.closest('[data-flutuar]') && pip) { e.stopPropagation(); flutuar(); }
  });
  E.btnVel.addEventListener('click', () => { S.vel = S.vel === 1 ? 2 : 1; E.btnVel.textContent = S.vel + '×'; });
  E.btnParar.addEventListener('click', pararSimulacao);
  E.btnMic.addEventListener('click', alternarMic);
  E.btnTela.addEventListener('click', alternarCaptura);
  E.selContexto.addEventListener('change', () => { setContexto(E.selContexto.value, { silencioso: false }); if (S.ctx.id === 'livre' && !S.ctx.texto) abrirEditor(); });
  E.btnEditarCtx.addEventListener('click', abrirEditor);
  E.chkAuto.addEventListener('change', () => { S.auto = E.chkAuto.checked; });
  E.chkObservar.addEventListener('change', () => { if (E.chkObservar.checked && !S.captura) aviso('Compartilhe uma tela ou aba: o copiloto relê quando ela mudar.'); });
  E.btnOcultar.addEventListener('click', alternarOculto);
  E.btnTrazer.addEventListener('click', () => { if (pip) pip.close(); });
  E.formAsk.addEventListener('submit', (e) => { e.preventDefault(); ajudaAgora(); });
  E.formFala.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = E.inFala.value.trim();
    if (t.length < 2) return;
    E.inFala.value = '';
    recolherHero();
    if (S.sim && S.sim.ativo) pararSimulacao();
    falaFinal(t, E.selQuem.value, 'digitado');
  });
  document.addEventListener('keydown', teclas);
  window.addEventListener('resize', () => { if (S.tela && E.telaScan.hidden) desenharCaixas(E.telaCaixas, S.tela, 2); });
  if (!('documentPictureInPicture' in window)) for (const b of document.querySelectorAll('[data-flutuar]')) b.title = 'A janela flutuante precisa do Chrome ou do Edge no computador';

  // status da IA de texto
  const local = async () => { try { const r = await (await fetch('/api/local')).json(); S.stt = !!r.stt; rodape(r.pronto ? '' : '⏳ IA de texto iniciando…'); } catch { /* segue */ } };
  local(); setInterval(local, 30000);

  // atalhos de link: ?sim=vendas · ?tela=email
  const q = new URLSearchParams(location.search);
  if (q.get('sim')) iniciarSimulacao(q.get('sim'));
  else if (q.get('tela')) abrirExemplo(q.get('tela'));
}
init().catch((e) => { JevKit.toast('Não consegui carregar o app: ' + e.message, 'err'); });
window.__mc = S;
// medições para o teste e2e: do fim da fala até a decisão do Jev e até a 1ª palavra da IA de texto
window.__mcTempos = () => S.hist.filter((h) => h.d).map((h) => ({ t: h.t, q: h.q, acao: h.d.acao, tipo: h.d.tipo, jev_ms: h.tJev && h.tFinal ? Math.round(h.tJev - h.tFinal) : null,
  palavra_ms: h.tTok && h.tFinal ? Math.round(h.tTok - h.tFinal) : null, fim_ms: h.tFim && h.tFinal ? Math.round(h.tFim - h.tFinal) : null, llm: h.llm || null, texto: h.card ? h.card.texto : '',
  visivel_ms: h.tVisivel && h.tFinal ? Math.round(h.tVisivel - h.tFinal) : null, estado: h.estadoResp || null, fato: h.fatoMostrado || null, bruto: h.bruto, corrigido: h.t, stt_ms: h.sttMs ?? null, stt: h.sttTexto ?? null,
  tipo_rasc: h.tipoRasc || null, serve: h.rascServe ?? null, especulativo: !!h.especulativo, geral: h.d.geral ?? null, saber: h.saber || null, saber_previa_ms: h.saberPrevia ?? null }));

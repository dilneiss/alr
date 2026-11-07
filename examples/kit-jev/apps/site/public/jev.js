// jev.js — a camada do Jev. Pergunta ao Jev (POST /api/decidir) no ritmo certo e aplica cada resposta em duas camadas:
//  • contínua (não interrompe): porta recomendada + chip "Próximo para você", portas fechadas que se reorganizam,
//    "Para você" dentro da lista aberta, "Sua trilha", chamada sob medida, inclusos que combinam, Lente do Jev;
//  • de ação (interrompe pouco): guiar, destacar item, responder a dúvida, montar a trilha, mostrar depoimento,
//    convidar e segurar a saída — no máx. 1 a cada 10 s, sem repetir em 25 s, nunca com o pagamento/contato aberto.
import {
  S, $, $$, html, raw, el, ICON, ICONE_SEC, now, RM, EASE, on, emit, pct, nomeSecao, emojiSecao, item, nomeItem, SEC, OFERTA,
  FAQ, faqItem, PRECO, precoTxt, comPreco, FORM, preencher, juntar, reordenar, fracaoVisivel, celular, novaVisitaEstado,
} from './core.js';
import { sinais, chave, evento, porque } from './sinais.js';
import { lista, ordenarInclui, abriuResumo, restaurarPagina, irPara } from './pagina.js';

const J = () => window.JevKit;
const LAB = (grupo, k) => { const x = S.CFG && S.CFG[grupo] && S.CFG[grupo][k]; return x ? (Array.isArray(x) ? x : x.rotulo) : ['', k]; };
const lab = (grupo, k) => { const [e, t] = LAB(grupo, k); return `${e} ${t}`.trim(); };

// ------------------------------------------------------------------ laço de decisão
const L = { emVoo: false, pendente: false, desde: 0, timer: 0, ultimaEnvio: -1e9, ultimaChave: '', seq: 0, pausaAte: 0, chamadas: 0, perguntas: 0, erros: 0, custo: 0 };
const TETO = 300; // teto de chamadas por visita (segurança de custo)

on('pedir', ({ urgente }) => pedir(urgente));
export function pedir(urgente) {
  if (!L.pendente) L.desde = now();
  L.pendente = true;
  agendar(urgente ? 0 : 700);
}
function agendar(atraso) {
  clearTimeout(L.timer);
  const teto = L.desde + 2400 - now(); // debounce de ~700 ms, mas nunca segura um evento por mais de ~2,4 s
  let t = Math.min(atraso, Math.max(0, teto));
  t = Math.max(t, L.ultimaEnvio + 1500 - now(), L.pausaAte - now(), 0); // mínimo de 1,5 s entre chamadas
  L.timer = setTimeout(enviar, t);
}
async function enviar() {
  if (!L.pendente || L.emVoo) return;
  if (document.hidden) return; // volta no visibilitychange
  const s = sinais(), k = chave(s);
  if (k === L.ultimaChave) { L.pendente = false; return; } // nada mudou: não chama
  if (L.chamadas >= TETO) { L.pendente = false; lenteStatus('Limite desta visita atingido', 'erro'); return; }
  L.pendente = false; L.emVoo = true; L.ultimaEnvio = now(); L.ultimaChave = k; L.chamadas++;
  const visita = S.visita;
  lenteStatus('lendo…', 'lendo');
  S.enviados.push(s);
  if (S.enviados.length > 60) S.enviados.shift();
  try {
    const r = await J().api('/api/decidir', { sinais: s }, { silent: true, label: S.simulando ? 'simulação' : 'visitante' });
    L.erros = 0;
    if (visita === S.visita) aplicar(r, s);
  } catch (e) {
    L.erros++;
    L.ultimaChave = '';
    const semVerba = !!e && (e.code === 'budget_exhausted' || e.code === 'no_credits'); // orçamento do dia acabou: pausa longa
    L.pausaAte = now() + (semVerba ? 60000 : e && (e.status === 429 || e.code === 'rate_limited') ? 8000 : Math.min(15000, 2500 * L.erros));
    lenteStatus(semVerba ? 'o orçamento de demonstração do Jev acabou por hoje' : e && e.status === 429 ? 'muitas leituras seguidas, pausando' : 'Jev indisponível, tentando de novo', 'erro');
  } finally {
    L.emVoo = false;
    if (L.pendente) agendar(0);
  }
}
setInterval(() => { if (!L.emVoo && !document.hidden && S.D && chave(sinais()) !== L.ultimaChave) pedir(false); }, 6000); // tique extra
document.addEventListener('visibilitychange', () => { if (!document.hidden && L.pendente) agendar(0); });

// ------------------------------------------------------------------ registro das adaptações (Raio-X, resumo das simulações, testes)
function adaptou(tipo, txt, extra) {
  const a = { visita: S.visita, t: Math.round((now() - S.t0) / 1000), tipo, txt, ...(extra || {}) };
  S.adaptacoes.push(a);
  if (S.adaptacoes.length > 120) S.adaptacoes.shift();
  renderRaiox();
  emit('adaptou', a);
}

// ------------------------------------------------------------------ aplicar uma decisão
let ULT = null;
function aplicar(r, s) {
  ULT = r;
  S.ultima = r;
  const reg = {
    visita: S.visita, t: s.t, perfil: r.perfil.escolha, p_perfil: r.perfil.p, interesse: r.interesse.escolha, p_interesse: r.interesse.p,
    proxima: r.proxima.escolha, p_proxima: r.proxima.p, ranking: r.proxima.ranking, destaque: r.destaque, objecao: r.objecao.escolha, p_objecao: r.objecao.p,
    faq: r.objecao.faq, acao: r.acao.escolha, p_acao: r.acao.p, trilha: r.trilha.escolha, p_trilha: r.trilha.p, depoimento: r.depoimento ? r.depoimento.escolha : null,
    entrar: r.prob_entrar, lat: r.latency_ms, n: r.n_perguntas, lista_em_foco: s.lista_em_foco, politica: '',
  };
  S.decisoes.push(reg);
  if (S.decisoes.length > 300) S.decisoes.shift();
  L.perguntas += r.n_perguntas || 0; L.custo += r.cost || 0;
  lente(r);
  duvida(r);
  portaRecomendada(r);
  reorganizar(r);
  pinsDaLista(r);
  suaTrilha(r, false);
  chamada(r);
  inclusos(r);
  provaSobMedida(r);
  reg.politica = politicaAcao(r);
  renderRaiox();
  emit('decisao', reg);
}

// ------------------------------------------------------------------ Lente do Jev (painel fixo e recolhível)
function montarLente() {
  $('#lente').innerHTML = String(html`<div class="lente-cab">
      <span class="lente-marca"><span class="jev-marca">${ICON('brilho')} Lente do Jev</span></span>
      <span class="lente-st" id="lenteSt" data-st="espera"><i></i><span>aguardando você</span></span>
      <button type="button" class="lente-rec" id="lenteRec" aria-expanded="true" aria-controls="lenteCorpo" title="Recolher a lente">${ICON('chev', 'chev')}</button>
    </div>
    <div class="lente-corpo" id="lenteCorpo">
      <p class="lente-vazio" id="lenteVazio">Abra o que te interessa. A cada abertura, o Jev lê o sinal e monta esta página para você.</p>
      <dl class="lente-dl">
        <div><dt>Perfil</dt><dd><span id="lvPerfil">—</span><b id="lpPerfil"></b></dd></div>
        <div><dt>Quer</dt><dd><span id="lvInteresse">—</span><b id="lpInteresse"></b></dd></div>
        <div><dt>Dúvida</dt><dd><span id="lvObjecao">—</span><b id="lpObjecao"></b></dd></div>
        <div class="lente-entrar"><dt>Chance de ${S.D.conversao.verbo}</dt><dd><span class="barra"><i id="lbEntrar"></i></span><b id="lvEntrar">—</b></dd></div>
      </dl>
      <div class="lente-sinal" id="lenteSinal" aria-live="polite"></div>
      <div class="lente-rodape"><span id="lvLat">— ms</span><span id="lvDec">0 decisões</span></div>
      <div class="lente-bts">
        <button type="button" class="bt-lente" id="btRaiox">${ICON('raiox')} Raio-X completo</button>
        <button type="button" class="bt-lente" data-abrir-sims>${ICON('play')} Simular visitante</button>
      </div>
    </div>`);
  $('#lenteRec').addEventListener('click', () => {
    const lt = $('#lente'), on = !lt.classList.contains('recolhida');
    lt.classList.toggle('recolhida', on);
    $('#lenteRec').setAttribute('aria-expanded', String(!on));
    $('#lenteCorpo').hidden = on;
  });
  $('#btRaiox').addEventListener('click', () => abrirRaiox());
}
function lenteStatus(txt, st) { const e = $('#lenteSt'); if (!e) return; e.dataset.st = st; e.querySelector('span').textContent = txt; }
let sinalTm;
on('evento', ({ txt, forte }) => {
  const e = $('#lenteSinal');
  if (!e || !forte) return;
  e.innerHTML = String(html`<span class="ls-mais">+ sinal</span> ${txt}`);
  e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
  clearTimeout(sinalTm); sinalTm = setTimeout(() => e.classList.remove('on'), 4200);
});
function trocaTexto(elm, txt) {
  if (!elm || elm.textContent === txt) return false;
  elm.textContent = txt;
  if (!RM()) elm.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE });
  return true;
}
function lente(r) {
  $('#lenteVazio').hidden = true;
  trocaTexto($('#lvPerfil'), lab('perfis', r.perfil.escolha)); $('#lpPerfil').textContent = pct(r.perfil.p);
  trocaTexto($('#lvInteresse'), lab('interesses', r.interesse.escolha)); $('#lpInteresse').textContent = pct(r.interesse.p);
  trocaTexto($('#lvObjecao'), lab('objecoes', r.objecao.escolha)); $('#lpObjecao').textContent = pct(r.objecao.p);
  $('#lbEntrar').style.transform = `scaleX(${Math.max(0.02, Math.min(1, r.prob_entrar || 0))})`;
  $('#lvEntrar').textContent = pct(r.prob_entrar);
  $('#lvLat').textContent = `última decisão ${J().fmt.ms(r.latency_ms)}`;
  $('#lvDec').textContent = `${J().fmt.int(L.perguntas)} decisões em ${L.chamadas} ${L.chamadas === 1 ? 'chamada' : 'chamadas'}`;
  lenteStatus(`lido em ${J().fmt.ms(r.latency_ms)}`, 'ok');
  const [e, t] = LAB('perfis', r.perfil.escolha);
  const pill = $('#docaJev b');
  if (pill) pill.textContent = `${e} ${t} ${pct(r.perfil.p)}`;
}

// ------------------------------------------------------------------ mapa da página (espelha a ordem real das portas)
function montarMapa() {
  $('#mapa').innerHTML = String(html`<div class="mapa-cab"><span class="kicker">${ICON('mapa')} Sua página</span><span class="mapa-nota" id="mapaNota">${S.SECOES.length} portas · ordem original</span></div>
    <ol class="mapa-lista" id="mapaLista">${S.SECOES.map((id) => html`<li class="mapa-it" data-m="${id}"><button type="button" data-ir="${id}">${ICONE_SEC(id)}<span>${nomeSecao(id)}</span><em class="mapa-tag"></em></button></li>`)}</ol>`);
}
function atualizarMapa(animar) {
  const ol = $('#mapaLista');
  if (!ol) return;
  const ordem = [...$('#portas').children].map((p) => ol.querySelector(`[data-m="${p.dataset.sec}"]`)).filter(Boolean);
  reordenar(ol, ordem, animar);
  for (const li of ol.children) {
    const id = li.dataset.m, st = S.sec[id], sec = $('#s-' + id);
    li.classList.toggle('aberta', st.aberta);
    li.classList.toggle('vista', st.vezes > 0 && !st.aberta);
    li.classList.toggle('rec', !!(REC && REC.id === id));
    li.classList.toggle('subiu', sec.classList.contains('subiu'));
    li.classList.toggle('atual', S.secaoAtual === id);
    const tag = li.querySelector('.mapa-tag');
    const txt = REC && REC.id === id ? 'para você' : st.aberta ? 'aberta' : st.vezes ? 'vista' : sec.classList.contains('subiu') ? 'subiu' : '';
    if (tag.textContent !== txt) tag.textContent = txt;
  }
}

// ------------------------------------------------------------------ dúvida do momento (contínua): a pergunta do FAQ ganha selo; fora da tela, um chip
const DUV = { fid: null, p: 0, rot: '', logadas: new Set(), vistas: new Set(), visivel: false };
function duvida(r) {
  const ob = r.objecao;
  const fid = ob && ob.escolha !== 'nenhuma' && ob.faq && ob.p >= 0.6 ? ob.faq : null;
  if (!fid) { if (DUV.fid && (!ob || ob.escolha === 'nenhuma') && ob && ob.p >= 0.6) limparDuvida(); return; }
  const [emo, rot] = LAB('objecoes', ob.escolha);
  DUV.fid = fid; DUV.p = ob.p; DUV.rot = rot; DUV.emo = emo;
  marcarFaq();
  atualizarChipDuvida(true);
  if (!DUV.logadas.has(fid)) {
    DUV.logadas.add(fid);
    const f = faqItem(fid);
    adaptou('duvida', `Dúvida do momento: ${emo} “${f.pergunta}” (${pct(ob.p)}), com a resposta oficial à mão`, { faq: fid, objecao: ob.escolha, p: ob.p });
  }
}
function marcarFaq() {
  for (const x of $$('.faq-it.jev-duvida')) if (x.dataset.faq !== DUV.fid) { x.classList.remove('jev-duvida'); const b = x.querySelector('.faq-jev'); if (b) b.remove(); }
  const it = DUV.fid && document.getElementById('f-' + DUV.fid);
  if (!it) return;
  it.classList.add('jev-duvida');
  let b = it.querySelector('.faq-jev');
  if (!b) { b = el(String(html`<span class="faq-jev"></span>`)); it.prepend(b); if (!RM()) b.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: EASE }); }
  b.innerHTML = String(html`${ICON('brilho')}<b>Dúvida do momento</b><i>${pct(DUV.p)}</i>`);
}
function limparDuvida() {
  DUV.fid = null;
  for (const x of $$('.faq-it.jev-duvida')) { x.classList.remove('jev-duvida'); const b = x.querySelector('.faq-jev'); if (b) b.remove(); }
  atualizarChipDuvida(true);
}
function atualizarChipDuvida(forcar) {
  const chip = $('#chipDuvida');
  if (!chip) return;
  const it = DUV.fid && document.getElementById('f-' + DUV.fid);
  const respostaNaTela = it && it.classList.contains('aberto') && fracaoVisivel(it) > 0.3;
  const cartaoObj = !$('#cartao').hidden && $('#cartao').dataset.tipo === 'objecao';
  if (DUV.fid && (respostaNaTela || cartaoObj)) DUV.vistas.add(DUV.fid); // já viu a resposta oficial: o chip não insiste
  const modal = $('#checkout').open || $('#dlgSaida').open;
  const mostrar = !!DUV.fid && !DUV.vistas.has(DUV.fid) && !modal;
  if (DUV.fid) {
    const f = faqItem(DUV.fid);
    const h = String(html`<span class="chip-rot">${ICON('brilho')} Dúvida do momento:</span><b>${f.pergunta}</b><span class="chip-abrir chip-abrir--sec">Ver a resposta oficial</span>`);
    if (chip.dataset.html !== h) { chip.innerHTML = h; chip.dataset.html = h; }
  }
  if (mostrar !== DUV.visivel || forcar) {
    DUV.visivel = mostrar;
    if (mostrar && chip.hidden) { chip.hidden = false; if (!RM()) chip.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE }); }
    else if (!mostrar) chip.hidden = true;
  }
}
on('faq', () => setTimeout(marcarFaq, 0));
on('secao', ({ id, aberta }) => { if (id === S.TIPO.faq && aberta) setTimeout(marcarFaq, 0); });
function cartaoObjecao(fid, p, rot, porAcao) {
  const f = faqItem(fid);
  if (!f) return false;
  cartao('objecao', html`<span class="cartao-kicker">${ICON('brilho')} Jev · dúvida do momento ${pct(p)}</span>
    <p class="cartao-pre">Talvez você esteja pensando:</p>
    <p class="cartao-tit">“${f.pergunta}”</p>
    <p class="cartao-resp">${f.resposta}</p>
    <span class="cartao-fonte">Resposta oficial · Perguntas frequentes</span>
    <div class="cartao-bts"><button type="button" class="bt-cartao" data-objecao="sim" data-rot="${rot}">Era isso</button><button type="button" class="bt-cartao bt-cartao--sec" data-objecao="nao" data-rot="${rot}">Não era</button></div>`, porAcao ? 22000 : 30000);
  atualizarChipDuvida(true);
  return f;
}

// ------------------------------------------------------------------ porta recomendada + chip "Próximo para você"
let REC = null; // { id, p, motivo }
function portaRecomendada(r) {
  const pr = r.proxima, id = pr.escolha;
  const valida = id && id !== 'nenhuma' && S.sec[id] && !S.sec[id].aberta && pr.p >= 0.3;
  if (REC && S.sec[REC.id].aberta) limparRec(false);
  if (valida) {
    if (!REC) setRec(id, pr.p);
    else if (REC.id !== id) {
      const atual = (pr.ranking.find((x) => x.id === REC.id) || { p: 0 }).p;
      if (pr.p > atual + 0.05) setRec(id, pr.p); // troca só com folga (não pisca)
    } else { REC.p = pr.p; atualizarSeloRec(); }
  } else if (REC && id === 'nenhuma' && pr.p >= 0.5) limparRec(true);
}
function setRec(id, p) {
  if (REC && REC.id !== id && !S.sec[REC.id].aberta) { S.guia.ignorou++; }
  if (REC) { const velha = $('#s-' + REC.id); velha.classList.remove('rec'); seloDe(velha, velha.classList.contains('subiu') ? 'subiu' : null); }
  REC = { id, p, motivo: porque() };
  S.guia.sugeriu = id;
  const sec = $('#s-' + id);
  sec.classList.add('rec');
  atualizarSeloRec();
  atualizarMapa(false);
  atualizarChip(true);
  adaptou('porta', `Porta recomendada: ${emojiSecao(id)} ${nomeSecao(id)} (${pct(p)})${REC.motivo ? ', ' + REC.motivo : ''}`, { secao: id, p });
}
function atualizarSeloRec() { if (REC) seloDe($('#s-' + REC.id), 'rec'); }
function seloDe(sec, tipo) {
  const s = sec.querySelector('.porta-selo');
  if (!tipo) { s.hidden = true; s.innerHTML = ''; return; }
  const txt = tipo === 'rec'
    ? html`${ICON('brilho')}<b>Para você</b><span>${REC.motivo || 'pelo que você abriu'}</span><i>${pct(REC.p)}</i>`
    : tipo === 'aceitou' ? html`${ICON('ok')}<b>Você abriu a sugestão do Jev</b>`
      : html`${ICON('cima')}<b>Subiu para você</b><span>na nova ordem da página</span>`;
  const novo = String(txt);
  if (s.innerHTML === novo && !s.hidden) return;
  s.innerHTML = novo; s.dataset.tipo = tipo; s.hidden = false;
  if (!RM()) s.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
}
function limparRec(contaIgnorou) {
  if (!REC) return;
  const sec = $('#s-' + REC.id);
  sec.classList.remove('rec');
  if (contaIgnorou && !S.sec[REC.id].aberta) S.guia.ignorou++;
  seloDe(sec, sec.classList.contains('subiu') && !S.sec[REC.id].aberta ? 'subiu' : null);
  REC = null;
  atualizarChip(true);
  atualizarMapa(false);
}
// quando a pessoa abre a porta sugerida
on('secao', ({ id, aberta, origem }) => {
  if (!aberta) return;
  const sec = $('#s-' + id);
  if (REC && REC.id === id) {
    S.guia.aceitou++;
    sec.classList.remove('rec');
    seloDe(sec, 'aceitou');
    setTimeout(() => { if (!sec.classList.contains('rec')) seloDe(sec, null); }, 3200);
    adaptou('aceitou', `Você abriu a sugestão do Jev: ${nomeSecao(id)}${origem === 'jev' ? ' (pelo chip)' : ''}`);
    REC = null;
    atualizarChip(true);
  } else if (sec.classList.contains('subiu')) { sec.classList.remove('subiu'); seloDe(sec, null); }
  if (id === S.TIPO.oferta && ULT) setTimeout(() => inclusos(ULT, true), 60);
  atualizarMapa(false);
});
on('secao', () => { if (ULT) chamada(ULT); });

const CHIP = { visivel: false, modo: 'normal', ate: 0 };
function montarPalco() {
  $('#palco').innerHTML = String(html`<div class="cartao" id="cartao" hidden></div><button type="button" class="chip-prox chip-duvida" id="chipDuvida" hidden></button><button type="button" class="chip-prox" id="chipProx" data-origem="jev" hidden></button>`);
  $('#chipDuvida').addEventListener('click', () => { if (!DUV.fid) return; evento(`pediu a resposta da dúvida: ${DUV.rot}`, true); cartaoObjecao(DUV.fid, DUV.p, DUV.rot, false); adaptou('resposta-pedida', `Você pediu a resposta oficial: ${DUV.rot}`, { faq: DUV.fid }); });
  $('#palco').addEventListener('mouseenter', () => { CART.pausado = true; });
  $('#palco').addEventListener('mouseleave', () => { CART.pausado = false; });
}
function atualizarChip(forcar) {
  const chip = $('#chipProx');
  if (!chip) return;
  const modal = $('#checkout').open || $('#dlgSaida').open;
  let mostrar = false, baixo = true;
  if (REC && !modal) {
    const sec = $('#s-' + REC.id), f = fracaoVisivel(sec);
    mostrar = CHIP.visivel ? f < 0.45 : f < 0.2; // histerese: não pisca na borda da tela
    baixo = sec.getBoundingClientRect().top > window.innerHeight / 2;
  }
  if (CHIP.modo === 'guiar' && now() > CHIP.ate) CHIP.modo = 'normal';
  const conteudo = REC ? String(html`${CHIP.modo === 'guiar' ? html`<span class="chip-frase">${ICON('brilho')} Pelo que você abriu, isto é a sua cara</span>` : ''}
    <span class="chip-linha"><span class="chip-rot">Próximo para você:</span>${ICONE_SEC(REC.id)}<b>${nomeSecao(REC.id)}</b>${ICON(baixo ? 'baixo' : 'cima', 'chip-seta')}${CHIP.modo === 'guiar' ? html`<span class="chip-abrir">Abrir</span>` : ''}</span>`) : '';
  if (REC) { chip.dataset.ir = REC.id; if (chip.dataset.html !== conteudo) { chip.innerHTML = conteudo; chip.dataset.html = conteudo; } }
  chip.classList.toggle('guiar', CHIP.modo === 'guiar');
  if (mostrar !== CHIP.visivel || forcar) {
    CHIP.visivel = mostrar;
    if (mostrar) { chip.hidden = false; if (!RM()) chip.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE }); }
    else if (!chip.hidden) { chip.hidden = true; }
  }
}

// ------------------------------------------------------------------ portas fechadas que se reorganizam (só abaixo da tela)
let ultimaReorg = -1e9;
function reorganizar(r) {
  if (now() - ultimaReorg < 8000) return;
  if (!S.SECOES.some((id) => S.sec[id].vezes > 0)) return; // só depois de a pessoa abrir alguma coisa
  const rank = r.proxima.ranking.filter((x) => x.id !== 'nenhuma' && x.p >= 0.02).map((x) => x.id);
  if (rank.length < 2) return;
  const cont = $('#portas');
  const H = window.innerHeight;
  const moviveis = [...cont.children].filter((p) => {
    const id = p.dataset.sec;
    if (S.sec[id].aberta) return false;
    if (p.matches(':hover') || p.contains(document.activeElement) || p.querySelector('.sim-hover')) return false;
    return p.getBoundingClientRect().top > H + 4; // inteira abaixo da tela: nunca mexe no que a pessoa está vendo
  });
  if (moviveis.length < 2) return;
  const pos = (p) => { const i = rank.indexOf(p.dataset.sec); return i < 0 ? 100 + S.SECOES.indexOf(p.dataset.sec) : i; };
  const desejada = moviveis.slice().sort((a, b) => pos(a) - pos(b));
  if (desejada.every((p, i) => p === moviveis[i])) return;
  const antes = new Map(moviveis.map((p) => [p, p.getBoundingClientRect().top]));
  const marcas = moviveis.map((p) => { const c = document.createComment('vaga'); p.before(c); return c; });
  desejada.forEach((p, i) => marcas[i].replaceWith(p));
  if (!RM()) for (const p of desejada) { const dy = antes.get(p) - p.getBoundingClientRect().top; if (Math.abs(dy) > 1) p.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 700, easing: EASE }); }
  const subiram = desejada.filter((p, i) => moviveis.indexOf(p) > i).map((p) => p.dataset.sec).filter((id) => rank.indexOf(id) >= 0 && rank.indexOf(id) < 4).slice(0, 3);
  for (const p of $$('#portas > .porta.subiu')) if (!subiram.includes(p.dataset.sec)) { p.classList.remove('subiu'); if (!p.classList.contains('rec')) seloDe(p, null); }
  for (const id of subiram) { const p = $('#s-' + id); p.classList.add('subiu'); if (!p.classList.contains('rec')) seloDe(p, 'subiu'); }
  ultimaReorg = now();
  atualizarMapa(true);
  $('#mapaNota').textContent = 'reorganizada para você';
  const nomes = subiram.map((id) => `${emojiSecao(id)} ${nomeSecao(id)}`);
  aviso(html`${ICON('reorg')}<span><b>A página se reorganizou para você.</b> ${nomes.length ? html`${juntar(nomes)} ${nomes.length === 1 ? 'subiu' : 'subiram'}` : ''}</span>${ICON('baixo')}`);
  adaptou('reorg', nomes.length ? `A página se reorganizou: ${juntar(nomes)} ${nomes.length === 1 ? 'subiu' : 'subiram'}` : 'A página se reorganizou: nova ordem das portas fechadas', { ordem: [...cont.children].map((p) => p.dataset.sec) });
}
let avisoTm;
function aviso(conteudo) {
  const a = $('#avisoReorg');
  a.innerHTML = String(conteudo);
  a.hidden = false;
  if (!RM()) a.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: EASE });
  clearTimeout(avisoTm);
  avisoTm = setTimeout(() => { a.hidden = true; }, 5200);
}

// ------------------------------------------------------------------ "Para você" dentro da lista aberta
function pinsDaLista(r) {
  const d = r.destaque;
  if (!d || !d.secao || !d.ranking || !d.ranking.length) return;
  const novos = d.ranking.filter((x, i) => i === 0 || x.p >= 0.1).slice(0, 3);
  const atuais = S.pins[d.secao] || [];
  const mesmo = novos.length === atuais.length && novos.every((n) => atuais.some((a) => a.id === n.id));
  let pins = novos;
  if (mesmo) pins = atuais.map((a) => ({ id: a.id, p: (novos.find((n) => n.id === a.id) || a).p })); // mesmo conjunto: só atualiza os %
  else if (atuais.length && novos[0].p < 0.2) return; // decisão fraca não derruba o que já estava bem escolhido
  const antes = atuais.map((x) => x.id).join();
  S.pins[d.secao] = pins;
  const Lz = lista(d.secao);
  if (Lz) Lz.setPins(pins, porque());
  if (antes !== pins.map((x) => x.id).join()) adaptou('pins', `“Para você” em ${nomeSecao(d.secao)}: ${pins.map((x) => `${nomeItem(d.secao, x.id)} (${pct(x.p)})`).join(', ')}`, { secao: d.secao, ids: pins.map((x) => x.id), p: pins[0].p });
  else if (pins[0] && pins[0].p > (S.pinsMax[d.secao] || 0) + 0.15) adaptou('pins', `“Para você” em ${nomeSecao(d.secao)}: ${pins.map((x) => `${nomeItem(d.secao, x.id)} (${pct(x.p)})`).join(', ')}`, { secao: d.secao, ids: pins.map((x) => x.id), p: pins[0].p });
  S.pinsMax[d.secao] = Math.max(S.pinsMax[d.secao] || 0, pins[0] ? pins[0].p : 0);
}

// ------------------------------------------------------------------ Sua trilha (monta sozinha)
let TRILHA = null; // { chaves: {k: html} }
const TRI = () => SEC(S.TIPO.trilhas);
const DEPO = () => (S.TIPO.depoimentos ? SEC(S.TIPO.depoimentos) : null);
function itemParaExperimentar() {
  const L = S.D.jev.sua_trilha.experimente;   // listas "para experimentar" (ids de seções do tipo lista)
  const destacados = new Set();
  for (const dd of S.decisoes) { const x = dd.destaque; if (x && L.includes(x.secao) && x.ranking && x.ranking[0]) destacados.add(x.secao + '|' + x.ranking[0].id); }
  for (let i = S.itens.length - 1; i >= 0; i--) { const x = S.itens[i]; if (x.abriu && destacados.has(x.secao + '|' + x.id)) return { secao: x.secao, id: x.id }; }
  for (let i = S.decisoes.length - 1; i >= 0; i--) {
    const x = S.decisoes[i].destaque;
    if (x && L.includes(x.secao) && x.ranking && x.ranking[0]) return { secao: x.secao, id: x.ranking[0].id };
  }
  for (let i = S.itens.length - 1; i >= 0; i--) { const x = S.itens[i]; if (L.includes(x.secao) && x.abriu) return { secao: x.secao, id: x.id }; }
  return null;
}
function suaTrilha(r, forcar) {
  const abertas = S.SECOES.filter((id) => S.sec[id].vezes > 0).length;
  if (!TRILHA && !forcar && !(abertas >= 2 && r.perfil.p >= 0.6 && r.perfil.escolha !== 'indefinido')) return false;
  const st = S.D.jev.sua_trilha, tri = TRI();
  const tr = tri.itens.find((t) => t.id === r.trilha.escolha) || tri.itens[0];
  const exp = itemParaExperimentar();
  const prox = REC ? REC.id : r.proxima.escolha !== 'nenhuma' && r.proxima.escolha && !S.sec[r.proxima.escolha].aberta ? r.proxima.escolha : null;
  const duv = st.duvidas.map((id) => html`<button type="button" class="mt-link" data-ir="${id}" data-origem="jev">${nomeSecao(id)}</button>`);
  const passos = [
    { k: 'comece', rot: 'Comece por', corpo: html`<button type="button" class="mt-link" data-ir="${tri.id}" data-item="${tr.id}" data-origem="jev">${tr.nome}</button><span class="mt-sub">${tr.n} ${tr.n === 1 ? tri.unidade[0] : tri.unidade[1]}</span>` },
    { k: 'experimente', rot: st.rotulo_experimente || 'Experimente', corpo: exp ? html`<button type="button" class="mt-link" data-ir="${exp.secao}" data-item="${exp.id}" data-origem="jev">${nomeItem(exp.secao, exp.id)}</button><span class="mt-sub">${nomeSecao(exp.secao)}</span>`
      : html`<button type="button" class="mt-link" data-ir="${st.experimente_padrao.secao}" data-origem="jev">${preencher(st.experimente_padrao.texto)}</button>` },
    { k: 'duvidas', rot: 'Tire dúvidas', corpo: html`${duv.length > 1 ? html`${duv[0]} e ${duv[1]}` : duv[0]}` },
    { k: 'proximo', rot: 'Seu próximo passo', corpo: prox ? html`<button type="button" class="mt-link" data-ir="${prox}" data-origem="jev">${ICONE_SEC(prox)} ${nomeSecao(prox)}</button>` : html`<button type="button" class="mt-link" data-cta="trilha">${comPreco(S.D.conversao.cta)}</button>` },
  ];
  const box = $('#minhaTrilha');
  const [pe, pt] = LAB('perfis', r.perfil.escolha);
  const novo = !TRILHA;
  if (novo) {
    box.innerHTML = String(html`<div class="mt-cab"><span class="jev-marca">${ICON('mapa')} Sua trilha</span><span class="mt-para" id="mtPara"></span></div><ol class="mt-passos" id="mtPassos"></ol>`);
    TRILHA = { chaves: {} };
    box.hidden = false;
  }
  if (r.perfil.escolha !== 'indefinido') trocaTexto($('#mtPara'), `montada pelo Jev para ${pe} ${pt}`);
  else if (novo) trocaTexto($('#mtPara'), 'montada pelo Jev com o que você abriu');
  const ol = $('#mtPassos');
  passos.forEach((p, i) => {
    const k = String(p.corpo);
    let li = ol.querySelector(`[data-k="${p.k}"]`);
    if (!li) { li = el(String(html`<li class="mt-passo" data-k="${p.k}"><span class="mt-n">${i + 1}</span><div class="mt-txt"><span class="mt-rot">${p.rot}</span><span class="mt-corpo"></span></div></li>`)); ol.appendChild(li); }
    if (TRILHA.chaves[p.k] !== k) {
      TRILHA.chaves[p.k] = k;
      li.querySelector('.mt-corpo').innerHTML = k;
      if (!RM()) li.animate([{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: novo ? 120 + i * 110 : 0, easing: EASE, fill: 'backwards' });
      if (!novo) { li.classList.remove('mudou'); void li.offsetWidth; li.classList.add('mudou'); }
    }
  });
  if (novo) {
    if (!RM()) box.animate([{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
    adaptou('trilha', `Sua trilha montada: comece ${tr.pelo} ${tr.nome}; depois ${exp ? nomeItem(exp.secao, exp.id) : preencher(st.experimente_padrao.texto)}`, { trilha: tr.id });
    const doca = $('#docaJev');
    if (doca) doca.classList.add('tem-trilha');
  }
  return true;
}

// ------------------------------------------------------------------ chamada sob medida (o botão fixo): o "cta" do interesse escolhido
function textoCTA(r) {
  const d = S.D, padrao = d.conversao.cta;
  const it = d.jev.interesses.find((x) => x.id === r.interesse.escolha);
  if (!it || !it.cta) return padrao;
  const tri = TRI(), tr = tri.itens.find((x) => x.id === r.trilha.escolha) || tri.itens[0];
  const ult = [...S.itens].reverse().find((x) => d.jev.sua_trilha.experimente.includes(x.secao) && x.abriu);
  const g = OFERTA().garantia;
  if ((it.cta.includes('{item}') && !ult) || (it.cta.includes('{dias}') && !g)) return padrao;
  const txt = preencher(it.cta.replace('{trilha}', `${tr.pelo} ${tr.curto}`).replace('{item}', ult ? nomeItem(ult.secao, ult.id) : '').replace('{dias}', g ? String(g.dias) : ''));
  return txt.length > 42 ? padrao : txt; // não coube no botão: vale o padrão
}
function montarCTA() {
  const v = OFERTA(), cta = S.D.conversao.cta;
  const btn = (onde) => String(html`<button type="button" class="cta-jev" data-cta="${onde}"><span class="cta-txt">${cta}</span>${PRECO() && FORM() === 'pagamento' ? html`<span class="cta-preco">· ${precoTxt()}</span>` : ''}</button>`);
  $('#trilhoCta').innerHTML = btn('trilho') + (v.selos.length ? String(html`<p class="cta-miuda">${v.selos.slice(0, 2).join(' · ')}</p>`) : '');
  $('#doca').innerHTML = String(html`<button type="button" class="doca-jev" id="docaJev" aria-expanded="false" aria-controls="trilho">${ICON('brilho')}<span>Jev</span><b>abra algo</b></button>`) + btn('doca');
  $('#docaJev').addEventListener('click', () => folha());
}
function chamada(r) {
  if (!r) return;
  const txt = textoCTA(r), padrao = S.D.conversao.cta;
  let mudou = false;
  for (const b of $$('.cta-jev .cta-txt')) mudou = trocaTexto(b, txt) || mudou;
  for (const b of $$('.cta-jev')) b.classList.toggle('sob-medida', txt !== padrao);
  if (mudou && txt !== padrao) adaptou('cta', `Chamada sob medida: “${comPreco(txt)}” (quer ${LAB('interesses', r.interesse.escolha)[1].toLowerCase()})`, { texto: txt });
}

// ------------------------------------------------------------------ oferta: inclusos que combinam sobem e brilham (regras do site.json)
let incluiChave = '';
function inclusos(r, forcar) {
  if (!S.sec[S.TIPO.oferta].aberta || !r) return;
  const inc = OFERTA().inclui;
  const trilhasAbertas = new Set(S.itens.filter((x) => x.secao === S.TIPO.trilhas && x.abriu).map((x) => x.id));
  const pts = inc.map((regra, i) => {
    let s = 0;
    if (regra.secoes && regra.secoes.some((id) => S.sec[id] && S.sec[id].vezes > 0)) s += 2;
    if (regra.trilha && (trilhasAbertas.has(regra.trilha) || r.trilha.escolha === regra.trilha)) s += 2;
    if (regra.perfis && regra.perfis.includes(r.perfil.escolha) && r.perfil.p >= 0.5) s += 1.5;
    if (regra.interesses && regra.interesses.includes(r.interesse.escolha)) s += 1;
    return [i, s];
  }).filter(([, s]) => s >= 2).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([i]) => i);
  const k = pts.join();
  if (k === incluiChave && !forcar) return;
  incluiChave = k;
  ordenarInclui(pts, `pelo que você abriu e pelo perfil ${LAB('perfis', r.perfil.escolha)[1].toLowerCase()}`);
  if (pts.length) adaptou('inclui', `Na oferta, ${pts.length} ${pts.length === 1 ? 'incluso que combina' : 'inclusos que combinam'} com você ${pts.length === 1 ? 'subiu' : 'subiram'}: ${pts.map((i) => inc[i].texto).slice(0, 2).join('; ')}…`);
}

// ------------------------------------------------------------------ prova sob medida: na oferta aberta, o depoimento de alguém parecido
let provaAtual = '';
const quemDepo = (dep, ex) => html`<span class="cartao-quem"><span class="av">${dep.nome[0]}</span><span><b>${dep.nome}</b>${dep.papel ? `, ${dep.papel}` : ''}</span>${ex ? html`<em class="tag-exemplo">exemplo</em>` : ''}</span>`;
const quemTxt = (dep) => `${dep.nome}${dep.papel ? ', ' + dep.papel : ''}`;
// com 2 ou mais depoimentos, o Jev escolhe o mais parecido; com 1 só, não há escolha: ele aparece sem "parecido com você"
const depoEscolhido = (r) => { const dp = DEPO(); if (!dp) return null; if (dp.itens.length === 1) return { dep: dp.itens[0], p: null }; const d = r && r.depoimento; const dep = d && dp.itens.find((x) => x.id === d.escolha); return dep ? { dep, p: d.p } : null; };
const kickerDepo = (dp, p) => (p == null ? (dp.exemplo ? 'Exemplo de depoimento' : 'Depoimento') : `${dp.exemplo ? 'Exemplo de alguém' : 'Alguém'} parecido com você`);
function provaSobMedida(r) {
  const box = $(`#c-${S.TIPO.oferta} .oferta-prova`), dp = DEPO();
  if (!dp || !box || !S.sec[S.TIPO.oferta].aberta) return;
  const esc = depoEscolhido(r);
  if (!esc || (esc.p != null && esc.p < 0.25)) return;
  const { dep, p } = esc;
  if (provaAtual === dep.id) return;
  provaAtual = dep.id;
  box.innerHTML = String(html`<span class="cartao-kicker">${ICON('balao')} ${kickerDepo(dp, p)}${p == null ? '' : ` · ${pct(p)}`}</span>
    <blockquote>“${dep.texto}”</blockquote>${quemDepo(dep, dp.exemplo)}`);
  box.hidden = false;
  if (!RM()) box.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: EASE });
  adaptou('prova', `Prova sob medida na oferta${dp.exemplo ? ' (exemplo)' : ''}: ${quemTxt(dep)} (“${dep.texto.slice(0, 60)}${dep.texto.length > 60 ? '…' : ''}”)`, { depoimento: dep.id });
}
on('secao', ({ id, aberta }) => { if (id === S.TIPO.oferta && aberta) { provaAtual = ''; setTimeout(() => provaSobMedida(ULT), 80); } });

// ------------------------------------------------------------------ camada de ação (a política)
const POL = { minP: 0.5, intervalo: 10000, repetir: 25000, saida: 60000 };
const AT = { ultima: -1e9, por: {}, saida: -1e9 };
function politicaAcao(r) {
  const a = r.acao.escolha, p = r.acao.p;
  if (!a || a === 'nenhuma') return 'não interromper';
  if (p < POL.minP) return `${a} com ${pct(p)}: abaixo de 50%, segurou`;
  if (S.cta.checkout_aberto || $('#checkout').open) return `${a}: ${FORM()} aberto, não interrompe`;
  if ($('#dlgSaida').open) return `${a}: aviso de saída aberto`;
  const t = now();
  if (a === 'segurar_saida') {
    if (t - AT.saida < POL.saida) return 'segurar_saida: já mostrado há menos de 60 s';
  } else {
    if (t - AT.ultima < POL.intervalo) return `${a}: menos de 10 s desde a última ação`;
    if (t - (AT.por[a] || -1e9) < POL.repetir) return `${a}: repetido em menos de 25 s`;
  }
  const feito = (ACOES[a] || (() => false))(r);
  if (!feito) return `${a}: sem onde aplicar agora`;
  AT.ultima = t; AT.por[a] = t;
  if (a === 'segurar_saida') AT.saida = t;
  S.guia.acoes = [...S.guia.acoes.filter((x) => x !== a), a];
  S.guia.ultimaEm = t;
  return `${a} ${pct(p)}: APLICADA`;
}

const CART = { tm: 0, pausado: false, ate: 0 };
function cartao(tipo, conteudo, ms = 15000) {
  const c = $('#cartao');
  c.dataset.tipo = tipo;
  c.innerHTML = String(html`<button type="button" class="cartao-x" data-fecha-cartao aria-label="Fechar">${ICON('x')}</button>${conteudo}`);
  c.hidden = false;
  if (!RM()) c.animate([{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 440, easing: EASE });
  CART.ate = now() + ms;
  clearInterval(CART.tm);
  CART.tm = setInterval(() => { if (!CART.pausado && now() > CART.ate) fecharCartao(); }, 500);
  atualizarChipDuvida(true);
}
function fecharCartao() {
  const c = $('#cartao');
  clearInterval(CART.tm);
  if (c.hidden) return;
  if (RM()) { c.hidden = true; return; }
  c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 220, easing: 'ease-in' }).onfinish = () => { c.hidden = true; };
}

const ACOES = {
  guiar(r) {
    const id = REC ? REC.id : r.proxima.p >= 0.3 && r.proxima.escolha !== 'nenhuma' && !S.sec[r.proxima.escolha].aberta ? r.proxima.escolha : null;
    if (!id) return false;
    if (!REC || REC.id !== id) setRec(id, r.proxima.p);
    const sec = $('#s-' + id);
    if (fracaoVisivel(sec) >= 0.3) {
      batuta(sec.querySelector('.porta-acao'));
      sec.classList.add('guiada');
      setTimeout(() => sec.classList.remove('guiada'), 7000);
      const bal = el(String(html`<div class="balao-guia" role="status">${ICON('brilho')}<span>Pelo que você abriu, isto é a sua cara</span><button type="button" data-ir="${id}" data-origem="jev">Abrir</button></div>`));
      sec.querySelectorAll('.balao-guia').forEach((x) => x.remove());
      sec.appendChild(bal);
      if (!RM()) bal.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 500, easing: EASE, fill: 'backwards' });
      setTimeout(() => bal.remove(), 8500);
    } else {
      CHIP.modo = 'guiar'; CHIP.ate = now() + 9000;
      atualizarChip(true);
      const chip = $('#chipProx');
      if (!RM() && chip && !chip.hidden) chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 700, easing: EASE, iterations: 2 });
    }
    adaptou('acao:guiar', `Guiou até ${emojiSecao(id)} ${nomeSecao(id)}: “Pelo que você abriu, isto é a sua cara”`, { secao: id });
    return true;
  },
  destacar_item() {
    const secao = S.listaEmFoco, pins = S.pins[secao];
    if (!secao || !pins || !pins.length || !lista(secao)) return false;
    const card = document.getElementById(`i-${secao}-${pins[0].id}`);
    const nome = nomeItem(secao, pins[0].id);
    if (card && fracaoVisivel(card) >= 0.3) {
      card.classList.remove('pulso-jev'); void card.offsetWidth; card.classList.add('pulso-jev');
      const b = el(String(html`<div class="balao-item" role="status">${ICON('brilho')}<span>Pelo que você viu, este combina com você</span></div>`));
      card.querySelectorAll('.balao-item').forEach((x) => x.remove());
      card.appendChild(b);
      setTimeout(() => { b.remove(); card.classList.remove('pulso-jev'); }, 6500);
    } else {
      cartao('destaque', html`<span class="cartao-kicker">${ICON('brilho')} Para você em ${nomeSecao(secao)}</span><p class="cartao-tit">${nome}</p><p>Está no topo da lista, ${pct(pins[0].p)} de chance de ser o que você procura.</p><button type="button" class="bt-cartao" data-ir="${secao}" data-item="${pins[0].id}" data-origem="jev">Ver ${nome}</button>`, 10000);
    }
    adaptou('acao:destacar_item', `Destacou ${nome} em ${nomeSecao(secao)} (${pct(pins[0].p)})`, { secao, id: pins[0].id });
    return true;
  },
  responder_objecao(r) {
    const ob = r.objecao;
    if (!ob || ob.escolha === 'nenhuma' || !ob.faq) return false;
    const f = faqItem(ob.faq);
    if (!f) return false;
    const [emo, rot] = LAB('objecoes', ob.escolha);
    cartaoObjecao(f.id, ob.p, rot, true);
    adaptou('acao:responder_objecao', `Respondeu a dúvida ${emo} “${f.pergunta}” com a resposta oficial`, { faq: f.id, objecao: ob.escolha });
    return true;
  },
  montar_trilha(r) {
    suaTrilha(r, true);
    const box = $('#minhaTrilha');
    box.classList.remove('pulso-jev'); void box.offsetWidth; box.classList.add('pulso-jev');
    setTimeout(() => box.classList.remove('pulso-jev'), 2600);
    if (celular()) cartao('trilha', html`<span class="cartao-kicker">${ICON('mapa')} Sua trilha está pronta</span><p>O Jev montou por onde começar, o que experimentar primeiro e onde tirar dúvidas.</p><button type="button" class="bt-cartao" data-abrir-folha>Ver a minha trilha</button>`, 9000);
    adaptou('acao:montar_trilha', 'Abriu a sua trilha (montada pelo Jev)');
    return true;
  },
  mostrar_prova(r) {
    const dp = DEPO(), esc = depoEscolhido(r);
    if (!esc) return false;
    const { dep, p } = esc;
    cartao('prova', html`<span class="cartao-kicker">${ICON('balao')} ${kickerDepo(dp, p)}</span>
      <blockquote class="cartao-cit">“${dep.texto}”</blockquote>
      ${quemDepo(dep, dp.exemplo)}`, 14000);
    adaptou('acao:mostrar_prova', `Mostrou o ${dp.exemplo ? 'exemplo de depoimento' : 'depoimento'} de ${quemTxt(dep)}`, { depoimento: dep.id });
    return true;
  },
  convidar() {
    const { secs, itens } = abriuResumo();
    const v = OFERTA();
    for (const b of $$('.cta-jev')) { b.classList.remove('convite'); void b.offsetWidth; b.classList.add('convite'); setTimeout(() => b.classList.remove('convite'), 6500); }
    cartao('convite', html`<span class="cartao-kicker">${ICON('brilho')} Feito para você</span>
      <p class="cartao-tit">${secs.length || itens.length ? 'Tudo o que você abriu está incluso' : v.rotulo}</p>
      ${secs.length || itens.length ? html`<div class="chips-linha">${secs.map((id) => html`<span class="chip-s">${ICONE_SEC(id)}${nomeSecao(id)}</span>`)}${itens.map((n) => html`<span class="chip-s chip-s--it">${n}</span>`)}</div>` : ''}
      <p class="cartao-preco"${PRECO() ? raw(' data-preco') : ''}>${[PRECO() ? precoTxt() : 'Fale com a gente', ...v.selos.slice(0, 2)].join(' · ')}</p>
      <button type="button" class="bt-cartao" data-cta="convite">${comPreco($('.cta-jev .cta-txt').textContent)}</button>`, 12000);
    adaptou('acao:convidar', 'Convite sob medida: “Tudo o que você abriu está incluso”');
    return true;
  },
  segurar_saida() {
    const t = now();
    const saindo = (S.saida.em != null && t - S.saida.em < 10000) || t - S.rolagem.subiuEm < 8000;
    const digitando = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    const { secs, itens } = abriuResumo();
    if (!saindo || digitando || (!secs.length && !itens.length)) return false;
    const v = OFERTA(), g = v.garantia;
    const lista = juntar([...secs.map((id) => nomeSecao(id)), ...itens.slice(0, 2)]);
    const pr = PRECO();
    const cond = pr ? html`Tudo isso ${pr.a_partir ? 'a partir de' : 'por'} <b data-preco>${pr.por}${pr.periodo}</b>${g ? html`, com <b>${g.frase}</b>` : ''}.` : html`Quer conversar sobre isso? <b>Fale com a gente</b>.`;
    const dlg = $('#dlgSaida');
    dlg.innerHTML = String(html`<div class="dlg-in saida-in">
      <span class="kicker"><span class="jev-marca">${ICON('brilho')} Jev</span> antes de você ir</span>
      <h2 id="saidaTitulo">Antes de ir: você abriu ${lista}.</h2>
      <p class="saida-txt">${cond}</p>
      <div class="chips-linha">${secs.map((id) => html`<span class="chip-s">${ICONE_SEC(id)}${nomeSecao(id)}</span>`)}${itens.slice(0, 3).map((n) => html`<span class="chip-s chip-s--it">${n}</span>`)}</div>
      <div class="saida-bts"><button type="button" class="bt-cta bt-cta--grande" data-cta="saida">${S.D.conversao.cta}</button><button type="button" class="bt-sec" data-fecha-saida>Continuar vendo</button></div>
      ${v.selos.length ? html`<p class="saida-miuda">${v.selos.join(' · ')}</p>` : ''}
    </div>`);
    dlg.showModal();
    if (!RM()) dlg.animate([{ opacity: 0, transform: 'translateY(18px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
    adaptou('acao:segurar_saida', `Segurou a saída: “Antes de ir: você abriu ${lista}. ${$('#dlgSaida .saida-txt').textContent}”`);
    return true;
  },
};

// a batuta: uma linha de luz sai da Lente do Jev (ou do pé da tela) e aponta para o botão Abrir da porta
function batuta(alvo) {
  if (!alvo || RM()) return;
  const svg = $('#batuta');
  const lt = $('#lente');
  const a = celular() || !lt || !lt.getClientRects().length ? { x: window.innerWidth / 2, y: window.innerHeight - 90 } : (() => { const r = lt.getBoundingClientRect(); return { x: r.left + 18, y: r.top + 26 }; })();
  const rb = alvo.getBoundingClientRect(), b = { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 };
  const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 90;
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  svg.innerHTML = `<defs><linearGradient id="gBat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity=".1"/><stop offset=".6" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
    <path id="batPath" d="M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}" fill="none" stroke="url(#gBat)" stroke-width="2.4" stroke-linecap="round"/>
    <circle id="batPonta" cx="${b.x}" cy="${b.y}" r="7" fill="none" stroke="#a78bfa" stroke-width="2"/>`;
  const path = svg.querySelector('#batPath'), len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  svg.classList.add('on');
  path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 850, easing: EASE, fill: 'forwards' });
  svg.querySelector('#batPonta').animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.6)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 900, delay: 750, easing: 'ease-out', fill: 'forwards' });
  svg.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 2600, easing: 'linear' }).onfinish = () => { svg.classList.remove('on'); svg.innerHTML = ''; };
}

// cliques nos cartões, na saída e na folha do celular
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.closest('[data-fecha-cartao]')) { fecharCartao(); evento('fechou o aviso do Jev'); return; }
  const ob = t.closest('[data-objecao]');
  if (ob) {
    const sim = ob.dataset.objecao === 'sim';
    if (sim) S.guia.aceitou++; else { S.guia.ignorou++; limparDuvida(); }
    evento(sim ? `confirmou a dúvida: ${ob.dataset.rot}` : `a dúvida não era: ${ob.dataset.rot}`, true);
    const c = $('#cartao');
    c.querySelector('.cartao-bts').innerHTML = String(html`<span class="cartao-ok">${ICON('ok')} ${sim ? 'Anotado. O Jev usa isso nas próximas sugestões.' : 'Certo, o Jev não vai insistir nisso.'}</span>`);
    CART.ate = now() + 2600;
    adaptou('resposta', sim ? `Você confirmou a dúvida: ${ob.dataset.rot}` : `Você disse que a dúvida não era: ${ob.dataset.rot}`);
    return;
  }
  if (t.closest('[data-fecha-saida]')) { $('#dlgSaida').close(); evento('continuou vendo a página', true); return; }
  if (t.closest('[data-abrir-folha]')) { fecharCartao(); folha(true); return; }
  if (t.closest('#dlgSaida [data-cta]')) { $('#dlgSaida').close(); }
  if (t.closest('.trilho [data-ir], .trilho [data-cta]') && celular()) folha(false);
  if (t.closest('[data-ir][data-origem="jev"]')) { fecharCartao(); }
}, true);
$('#dlgSaida').addEventListener('click', (e) => { if (e.target === $('#dlgSaida')) $('#dlgSaida').close(); });

// ------------------------------------------------------------------ folha do celular (lente + trilha + mapa)
function folha(abrir) {
  const tr = $('#trilho'), f = $('#folha'), b = $('#docaJev');
  const on = abrir == null ? !tr.classList.contains('aberto') : abrir;
  tr.classList.toggle('aberto', on);
  f.hidden = !on;
  if (b) b.setAttribute('aria-expanded', String(on));
}
$('#folha').addEventListener('click', () => folha(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#trilho').classList.contains('aberto')) folha(false); if (!$('#raiox').hidden) fecharRaiox(); } });

// ------------------------------------------------------------------ Raio-X completo (gaveta)
function abrirRaiox() {
  const rx = $('#raiox');
  rx.hidden = false; $('#raioxFundo').hidden = false;
  document.body.classList.add('rx-aberto');
  renderRaiox(true);
  if (!RM()) rx.animate([{ transform: 'translateX(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE });
  rx.querySelector('.rx-x').focus({ preventScroll: true });
  evento('abriu o Raio-X do Jev');
}
function fecharRaiox() { $('#raiox').hidden = true; $('#raioxFundo').hidden = true; document.body.classList.remove('rx-aberto'); const b = $('#btRaiox'); if (b) b.focus({ preventScroll: true }); }
$('#raioxFundo').addEventListener('click', fecharRaiox);
let rxTm = 0;
function renderRaiox(ja) {
  const rx = $('#raiox');
  if (rx.hidden) return;
  if (!ja) { clearTimeout(rxTm); rxTm = setTimeout(() => renderRaiox(true), 120); return; }
  const r = ULT, s = S.enviados[S.enviados.length - 1];
  const bars = (probs, labels, limit) => {
    const ent = Object.entries(probs || {}).sort((a, b) => b[1] - a[1]).slice(0, limit || 99);
    return '<div class="jev-bars">' + ent.map(([k, p], i) => `<div class="jev-bar${i === 0 ? ' top' : ''}"><span class="lbl" title="${J().escapeHtml(labels[k] || k)}">${J().escapeHtml(labels[k] || k)}</span><span class="trk"><span class="fil" style="width:${Math.max(0, Math.min(100, p * 100)).toFixed(1)}%"></span></span><span class="pct">${pct(p)}</span></div>`).join('') + '</div>';
  };
  const labs = (grupo) => Object.fromEntries(Object.keys((S.CFG && S.CFG[grupo]) || {}).map((k) => [k, lab(grupo, k)]));
  const rankObj = (rk) => Object.fromEntries((rk || []).map((x) => [x.id, x.p]));
  const dec = S.decisoes[S.decisoes.length - 1];
  rx.innerHTML = String(html`<header class="rx-cab"><span class="jev-logo">⚡ JEV</span><h3 id="rxTitulo">Raio-X do visitante</h3><span class="rx-sp"></span><button type="button" class="jev-btn jev-btn--sm rx-x" aria-label="Fechar o Raio-X">${ICON('x')}</button></header>
  <div class="rx-corpo">
    <p class="rx-explica">A página não decide nada sozinha. A cada sinal que importa, ela manda ao Jev um resumo do que você abriu, leu e buscou, e o Jev responde ${r ? r.n_perguntas : 8} perguntas tipadas numa chamada só, com probabilidades. A página só muda o que as respostas mandam.</p>
    ${r ? html`
    <section class="rx-sec"><h4>Quem é você, para o Jev</h4><div class="rx-2">
      <div><span class="rx-rot">Perfil</span>${raw(bars(r.perfil.probabilidades, labs('perfis'), 4))}</div>
      <div><span class="rx-rot">O que quer agora</span>${raw(bars(r.interesse.probabilidades, labs('interesses'), 4))}</div></div></section>
    <section class="rx-sec"><h4>Próxima porta que vale abrir</h4>${raw(bars(rankObj(r.proxima.ranking), Object.fromEntries(S.SECOES.concat('nenhuma').map((id) => [id, id === 'nenhuma' ? 'nenhuma' : `${emojiSecao(id)} ${nomeSecao(id)}`])), 6))}
      <p class="rx-nota">Porta recomendada só com 30% ou mais. ${REC ? `Agora: ${nomeSecao(REC.id)}.` : 'Agora: nenhuma.'}</p></section>
    <section class="rx-sec"><h4>Destaque na lista em foco ${r.destaque ? html`<i>${nomeSecao(r.destaque.secao)}</i>` : ''}</h4>${r.destaque ? raw(bars(rankObj(r.destaque.ranking), Object.fromEntries(r.destaque.ranking.map((x) => [x.id, nomeItem(r.destaque.secao, x.id)])), 3)) : html`<p class="rx-nota">Só existe quando uma lista aberta está na tela.</p>`}</section>
    <section class="rx-sec"><h4>Dúvida do momento</h4>${raw(bars(r.objecao.probabilidades, labs('objecoes'), 4))}</section>
    <section class="rx-sec"><h4>O que a página deve fazer</h4>${raw(bars(r.acao.probabilidades, labs('acoes'), 5))}<p class="rx-nota">Regra: ação só com 50% ou mais, no máximo 1 a cada 10 s, sem repetir em 25 s, nunca com o ${FORM()} aberto. Veredito: <b>${dec ? dec.politica : '—'}</b></p></section>
    <section class="rx-sec"><h4>Por onde começar <i>${nomeSecao(S.TIPO.trilhas)}</i></h4>${raw(bars(rankObj(r.trilha.ranking), Object.fromEntries(TRI().itens.map((t) => [t.id, t.nome])), 5))}
      <p class="rx-nota">${DEPO() && r.depoimento ? html`${DEPO().exemplo ? 'Exemplo de depoimento' : 'Depoimento'} mais parecido: <b>${(DEPO().itens.find((x) => x.id === r.depoimento.escolha) || {}).nome || '—'}</b> (${pct(r.depoimento.p)}) · ` : ''}chance de ${S.D.conversao.verbo} nesta visita: <b>${pct(r.prob_entrar)}</b> · ${J().fmt.ms(r.latency_ms)} · ${J().fmt.usd(r.cost)}</p></section>` : html`<p class="rx-nota">Nenhuma decisão ainda. Abra alguma porta.</p>`}
    <section class="rx-sec"><h4>O que a página fez por você (${S.adaptacoes.length})</h4>
      <ol class="rx-log">${S.adaptacoes.length ? S.adaptacoes.slice(-14).reverse().map((a) => html`<li><time>${a.t} s</time><span>${a.txt}</span></li>`) : html`<li class="vazio">nada ainda</li>`}</ol></section>
    <section class="rx-sec"><h4>Sinais enviados na última chamada</h4>${s ? html`<dl class="rx-sinais">
        <div><dt>tempo</dt><dd>${s.t} s · olhando ${s.secao_atual === 'topo' ? 'o topo' : nomeSecao(s.secao_atual)}${s.lista_em_foco ? ` · lista em foco: ${nomeSecao(s.lista_em_foco)}` : ''}</dd></div>
        <div><dt>abertas</dt><dd>${s.abertas.length ? s.abertas.map((a) => `${nomeSecao(a.id)} (${a.aberta_s} s${a.aberta_agora ? '' : ', fechada'})`).join(' · ') : '—'}</dd></div>
        <div><dt>itens</dt><dd>${s.itens.length ? s.itens.map((i) => `${nomeItem(i.secao, i.id)} (${i.acao}, ${i.s} s)`).join(' · ') : '—'}</dd></div>
        <div><dt>blocos</dt><dd>${s.subitens.blocos.join(' · ') || '—'}</dd></div>
        <div><dt>buscas</dt><dd>${s.buscas.map((b) => `“${b}”`).join(' · ') || '—'}</dd></div>
        <div><dt>perguntas</dt><dd>${s.faq.join(' · ') || '—'}</dd></div>
        <div><dt>preço</dt><dd>${s.preco.vezes} passada(s) · ${s.preco.hover_s} s${s.preco.copiou ? ' · copiou' : ''}</dd></div>
        <div><dt>rolagem</dt><dd>${s.rolagem.atual}% (máx. ${s.rolagem.max}%)${s.rolagem.subiu_rapido ? ' · subiu rápido' : ''}${s.rolagem.desceu_rapido ? ' · desceu rápido' : ''}</dd></div>
        <div><dt>saída</dt><dd>${s.saida.vezes ? `${s.saida.vezes}× pelo topo` : '—'} · parado há ${s.ocioso_s} s</dd></div>
        <div><dt>eventos</dt><dd>${s.eventos.slice(-6).join(' · ')}</dd></div>
      </dl><details class="rx-json"><summary>Ver o JSON exato</summary><pre>${JSON.stringify(s, null, 1)}</pre></details>` : html`<p class="rx-nota">—</p>`}</section>
  </div>
  <footer class="rx-pe"><span>${L.chamadas} chamadas · ${J().fmt.int(L.perguntas)} decisões · ${J().fmt.usd(L.custo)}</span><span class="rx-sp"></span>
    <button type="button" class="jev-btn jev-btn--sm" data-inspetor>Chamadas brutas</button><button type="button" class="jev-btn jev-btn--sm" data-nova-visita>↺ Nova visita</button></footer>`);
  rx.querySelector('.rx-x').addEventListener('click', fecharRaiox);
  rx.querySelector('[data-inspetor]').addEventListener('click', () => J().inspector.open());
}
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-nova-visita]')) { novaVisita(); } });

// ------------------------------------------------------------------ tique: chip, listas pendentes, mapa
on('tique', () => {
  atualizarChip(false);
  atualizarChipDuvida(false);
  for (const id of S.LISTAS) { const Lz = lista(id); if (Lz) Lz.tentarPendente(); }
  atualizarMapa(false);
});

// ------------------------------------------------------------------ nova visita: desfaz tudo o que o Jev montou
export function novaVisita() {
  clearTimeout(L.timer);
  Object.assign(L, { emVoo: false, pendente: false, ultimaChave: '', pausaAte: 0, chamadas: 0, perguntas: 0, custo: 0, erros: 0 });
  novaVisitaEstado();
  S.enviados = [];
  REC = null; TRILHA = null; ULT = null; incluiChave = ''; ultimaReorg = -1e9; provaAtual = '';
  Object.assign(DUV, { fid: null, p: 0, rot: '', logadas: new Set(), vistas: new Set(), visivel: false });
  $('#chipDuvida').hidden = true;
  Object.assign(AT, { ultima: -1e9, por: {}, saida: -1e9 });
  Object.assign(CHIP, { visivel: false, modo: 'normal', ate: 0 });
  restaurarPagina();
  fecharCartao();
  if ($('#dlgSaida').open) $('#dlgSaida').close();
  const mt = $('#minhaTrilha'); mt.hidden = true; mt.innerHTML = '';
  $('#chipProx').hidden = true;
  $('#avisoReorg').hidden = true;
  for (const b of $$('.cta-jev')) { b.classList.remove('sob-medida', 'convite'); b.querySelector('.cta-txt').textContent = S.D.conversao.cta; }
  const dj = $('#docaJev'); if (dj) { dj.classList.remove('tem-trilha'); dj.querySelector('b').textContent = 'abra algo'; }
  montarLente(); montarMapa();
  lenteStatus('aguardando você', 'espera');
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderRaiox();
  emit('nova-visita', { visita: S.visita });
}

// ------------------------------------------------------------------ início
export function montarJev() {
  S.enviados = [];
  montarLente();
  montarMapa();
  montarPalco();
  montarCTA();
  $('#folha').removeAttribute('role');
  window.jevUx = {
    get visita() { return S.visita; },
    get simulando() { return S.simulando; },
    get decisoes() { return S.decisoes; },
    get adaptacoes() { return S.adaptacoes; },
    get enviados() { return S.enviados; },
    get chamadas() { return L.chamadas; },
    sinais: () => sinais(),
    estado: () => ({
      rec: REC ? { ...REC } : null, trilha: !!TRILHA, cta: ($('.cta-jev .cta-txt') || {}).textContent, pins: S.pins,
      ordem: [...$('#portas').children].map((p) => p.dataset.sec), chip: !$('#chipProx').hidden, cartao: $('#cartao').hidden ? null : $('#cartao').dataset.tipo,
      saida: $('#dlgSaida').open, secaoAtual: S.secaoAtual, listaEmFoco: S.listaEmFoco,
      duvida: DUV.fid, chipDuvida: !$('#chipDuvida').hidden, faqMarcado: $$('.faq-it.jev-duvida').map((x) => x.dataset.faq),
    }),
    novaVisita: () => novaVisita(),
  };
}
export const recAtual = () => (REC ? REC.id : null);
export const trilhaMontada = () => !!TRILHA;

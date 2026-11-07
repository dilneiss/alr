// Estúdio por Voz — controlador da página. A cada pausa da fala: 1 POST → 6 chamadas paralelas ao Jev no servidor →
// cada grupo volta por SSE e o painel correspondente acende e se refaz. Nada de texto gerado pelo Jev: ele só escolhe.
import { GRUPOS, META, PERGUNTAS, POR_GRUPO, TOTAL, ALVOS, ROT_ALVO, PAINEL_ALVO, TIPOS_COMANDO } from '../lib/perguntas.mjs';
import { lerCampos, CAMPOS } from '../lib/escritor.mjs';
import * as B from '../lib/biblioteca.mjs';
import { montar, sortear, revalidar, resposta, ranking, escolha } from './contexto.mjs';
import { documento, blocos, cssVars, classesBody } from './site.mjs';
import { logoSVG, simboloSVG, carregarFontes, fontesCarregadas, fontFaceCSS, FONTES_EMB, FUNDO_CONTRASTE, varianteContraste } from './marca.mjs';
import { carrosselHTML, carrosseisAmpliadoHTML, ativarCarrosseis } from './carrossel.mjs';
import { emailPainelHTML, emailAmpliadoHTML, emailExportavel, assinaturaExportavel, ativarEmail } from './email.mjs';
import { anunciosPainelHTML, anunciosAmpliadoHTML, anunciosExportavel, ativarAnuncios } from './anuncios.mjs';
import { aplicarAjustesNoDocumento } from './ajustes-css.mjs';
import { criarMicrofone, simularFala, SR } from './voz.mjs';
import { disparar, acender, rolar } from './efeitos.mjs';
import { esc, cap, sobre as corSobre } from './util.mjs';

const { fmt, el, toast, record } = window.JevKit;
window.JevKit.mountTopbar({ title: 'Estúdio por Voz', tagline: 'Fale do seu negócio e veja tudo nascer', footer: false });

const $ = (id) => document.getElementById(id);
// ícones da casca (sprite no index.html): SVG desenhado em vez de emoji nos rótulos, botões e mensagens de estado
const ic = (nome, classe = '') => `<svg class="ic${classe ? ' ' + classe : ''}" aria-hidden="true" focusable="false"><use href="#i-${nome}"/></svg>`;
// cores do sinal que corre pelos cabos até cada monitor (as capas das teclas do console)
const CORES_SINAL = ['#E23B2E', '#2F6FDB', '#2FA862', '#D9A400', '#1B1B1B'];
// declara as 20 famílias da biblioteca (o navegador só baixa as que um texto usa): sem isso só as 4 do style.css
// existiam na página e o resto caía na fonte do sistema — no Mac parecia certo (Bodoni 72, Didot), no Windows não
(() => { const st = document.createElement('style'); st.id = 'fontes-marca'; st.textContent = fontFaceCSS('/fonts/'); document.head.append(st); })();
const DEBOUNCE = 650, ESPERA_MAX = 1300;
const PAINEL = { site: 'painel-site', marca: 'painel-marca', posts: 'painel-posts', email: 'painel-email', anuncios: 'painel-ads' };
const PAINEIS = ['painel-site', 'painel-marca', 'painel-posts', 'painel-email', 'painel-ads'];
const ROT_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g]));
const NOME_GRUPO_CURTO = { entender: 'Entender', site: 'Site', marca: 'Marca', posts: 'Carrosséis', email: 'E-mail', anuncios: 'Anúncios' };

let CFG = { exemplos: [], limites: { porSessao: 260 } };
const S = {
  final: '', parcial: '', origem: null, exemplo: null,
  R: {}, O: {}, lat: {}, cache: {}, nomeManual: '', ia: {}, iaSeg: null,
  seq: 0, gen: 0, voando: false, pendente: false, ctrl: null, ultimoEnviado: '', deb: null, primeiroPend: 0,
  atualizacoes: 0, atualizacoesFala: 0, ultimo: null, agora: new Date(), sim: null, escrita: null, rxAnterior: {}, historico: [],
  // comandos por voz: trechos da fala (descrição × comando), travas (T) e fila de comandos em ordem
  T: {}, travas: {}, segs: [], base: [], sessaoSegs: [], sessaoConhecido: '', filaCmd: Promise.resolve(),
  // ajustes livres de estilo ("fundo verde", "tudo em caixa alta"): camada de CSS por cima das peças, na ordem (o último vence)
  ajustes: [],
};
const oEf = () => ({ ...S.O, ...S.T }); // escolhas efetivas: Jev → 🎲 outra versão → 🔒 travas dos comandos
let ultimoCtx = null;

// ------------------------------------------------------------------ fita dos 5 grupos (as chamadas paralelas)
function montarFita() {
  const f = $('fita');
  f.innerHTML = `<span class="fita-total" id="fita-total" title="Perguntas tipadas que o Jev responde a cada pausa da fala"><b>${TOTAL}</b> decisões por pausa</span>` + GRUPOS.map((g) => `<span class="gchip" id="g-${g.id}" data-grupo="${g.id}" title="${esc(g.rotulo)}: ${POR_GRUPO[g.id]} perguntas numa chamada"><i class="pt"></i><span class="gn">${esc(NOME_GRUPO_CURTO[g.id])}</span> <b>${POR_GRUPO[g.id]}</b><span class="gl"></span></span>`).join('');
}
function fitaVoando() { for (const g of GRUPOS) { const c = $('g-' + g.id); c.classList.remove('chegou', 'falhou'); c.classList.add('voando'); c.querySelector('.gl').textContent = '…'; } }
function fitaChegou(g, ms, cached) { const c = $('g-' + g); if (!c) return; c.classList.remove('voando', 'falhou'); void c.offsetWidth; c.classList.add('chegou'); c.querySelector('.gl').textContent = cached ? 'cache' : fmt.ms(ms); }
function fitaDescartou(g) { const c = $('g-' + g); if (!c) return; c.classList.remove('voando', 'chegou'); c.classList.add('descartado'); c.querySelector('.gl').textContent = 'comando'; }
function fitaFalhou(g) { const c = $('g-' + g); if (!c) return; c.classList.remove('voando', 'chegou'); c.classList.add('falhou'); c.querySelector('.gl').textContent = 'falhou'; }

// ------------------------------------------------------------------ fala → atualização
const TIPO_FORA = new Set([...TIPOS_COMANDO, 'outra']);
const normal = (t) => String(t || '').replace(/\s+/g, ' ').trim();
// a descrição do negócio que vai para as 6 chamadas: só os trechos que NÃO são comando
function descricaoTexto(comParcial = true) {
  // trecho ainda sem veredito só entra se as parciais dele pareciam descrição (otimista); comando nunca entra
  const partes = S.segs.filter((x) => x.tipo === 'descricao' || (x.tipo == null && x.otimista !== false)).map((x) => x.texto);
  if (comParcial && S.parcial) partes.push(S.parcial);
  return normal(partes.join(' '));
}
const textoAtual = () => descricaoTexto();
const segPendente = () => null; // frases que terminam são roteadas na hora por rotearSeg()
const palavras = (t) => (t.match(/\S+/g) || []).length;

function mostrarFala() {
  const vazio = !S.segs.length && !S.parcial;
  $('fala-vazia').hidden = !vazio;
  const html = S.segs.map((x) => (TIPO_FORA.has(x.tipo)
    ? `<span class="seg-cmd t-${x.tipo}" title="${x.tipo === 'outra' ? 'Fora do assunto: não entra na descrição' : `Comando para ${esc(ROT_ALVO[x.alvo] || x.alvo || '?')}: não entra na descrição do negócio`}">${ICONE_TIPO[x.tipo] || ic('alvo')}${esc(x.texto)}</span>`
    : esc(x.texto))).join(' ');
  const ff = $('fala-final');
  if (ff._html !== html) { ff.innerHTML = html; ff._html = html; }
  $('fala-parcial').textContent = S.parcial ? (S.segs.length ? ' ' : '') + S.parcial : '';
  const vivo = !!(S.sim && S.sim.ativo) || mic.ligado;
  $('caret').hidden = !vivo;
  $('fala').classList.toggle('viva', vivo);
  const f = $('fala'); f.scrollTop = f.scrollHeight;
  f.classList.toggle('rolou', f.scrollTop > 4);
}

const ICONE_TIPO = { comando_de_edicao: ic('alvo'), desfazer: ic('desfazer'), fixar: ic('cadeado'), outra: ic('balao') };
function aoFalar(final, parcial, origem) {
  final = normal(final);
  if (origem === 'texto') { S.base = []; S.sessaoSegs = final ? [{ texto: final, tipo: 'descricao' }] : []; S.sessaoConhecido = final; }
  else if (final !== S.sessaoConhecido) {
    // cada frase que o reconhecedor fecha vira um trecho; o roteador do Jev diz se ele descreve ou manda mudar algo
    const criar = (texto) => {
      const seg = { texto, tipo: null };
      if (!(S.R.marca && S.R.site) || palavras(texto) < 2) seg.tipo = 'descricao'; // nada criado ainda: tudo é descrição
      else {
        const rp = S.rotaParcial; // o que o roteador achou das parciais desta frase
        seg.otimista = !(rp && normal(texto).startsWith(normal(rp.texto).slice(0, 12)) && rp.comando);
        rotearSeg(seg);
      }
      return seg;
    };
    if (S.sessaoConhecido && final.startsWith(S.sessaoConhecido)) { const novo = normal(final.slice(S.sessaoConhecido.length)); if (novo) S.sessaoSegs.push(criar(novo)); }
    else S.sessaoSegs = final ? [criar(final)] : [];
    S.sessaoConhecido = final;
  }
  S.segs = S.base.concat(S.sessaoSegs);
  S.final = final; S.parcial = normal(parcial); S.origem = origem;
  mostrarFala();
  agendar();
}
function agendar(imediato = false) {
  clearTimeout(S.deb);
  if (imediato) { S.primeiroPend = 0; atualizar(); return; }
  const agora = performance.now();
  if (!S.primeiroPend) S.primeiroPend = agora;
  if (agora - S.primeiroPend > ESPERA_MAX) { S.primeiroPend = 0; atualizar(); return; }
  S.deb = setTimeout(() => { S.primeiroPend = 0; atualizar(); }, DEBOUNCE);
}

async function lerSSE(res, cb) {
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const bloco = buf.slice(0, i); buf = buf.slice(i + 2);
      let ev = 'message', data = '';
      for (const l of bloco.split('\n')) { if (l.startsWith('event:')) ev = l.slice(6).trim(); else if (l.startsWith('data:')) data += l.slice(5).trim(); }
      if (!data) continue;
      let d; try { d = JSON.parse(data); } catch { continue; }
      cb(ev, d);
    }
  }
}

async function atualizar() {
  const texto = textoAtual();
  const pend = segPendente();
  const ultima = S.parcial || (pend ? pend.texto : '');
  // com algo já criado, cada fala nova passa pelo roteador do Jev (em paralelo com as 6 chamadas)
  const comRota = !!(S.R.marca && S.R.site) && !!S.parcial && palavras(ultima) >= 2 && S.origem !== 'texto' && S.origem !== 'versao';
  const chave = texto + '|' + (comRota ? ultima : '');
  if ((palavras(texto) < 2 && !comRota) || chave === S.ultimoEnviado) return;
  if (S.voando) { S.pendente = true; return; }
  if (S.atualizacoes >= (CFG.limites.porSessao || 260)) { limiteSessao(); return; }
  S.voando = true; S.pendente = false; S.ultimoEnviado = chave;
  const seq = ++S.seq, gen = S.gen;
  S.atualizacoes++; S.atualizacoesFala++;
  S.agora = new Date();
  fitaVoando();
  disparar($('fala'), PAINEIS.map((id) => $(id)), CORES_SINAL);
  const t0 = performance.now();
  const chegou = [];
  let falhas = 0, rotaOk = comRota ? null : true, foiComando = false;
  const fila = [];
  const aplicarGrupo = (d) => {
    const segAntes = S.R.entender ? escolha(S.R, {}, 'seg') : null;
    S.R[d.grupo] = d.answers; S.lat[d.grupo] = d.latency_ms; S.cache[d.grupo] = d.cached;
    if (d._jev) record({ ...d._jev }, `${ROT_GRUPO[d.grupo].icone} ${NOME_GRUPO_CURTO[d.grupo]}`);
    if (d.grupo === 'entender') {
      const segDepois = escolha(S.R, {}, 'seg');
      if (segAntes && segDepois !== segAntes) { S.O = {}; if (Object.keys(S.ia).length && S.iaSeg !== segDepois) { S.ia = {}; toast('O segmento mudou — os textos da IA de texto foram trocados pelos da biblioteca.'); } }
    }
    S.O = revalidar(S.R, S.O);
    chegou.push(d.grupo);
    fitaChegou(d.grupo, d.latency_ms, d.cached);
    render(d.grupo);
    const alvo = PAINEL[d.grupo];
    [].concat(alvo || []).forEach((id) => acender($(id)));
    if (d.grupo === 'entender') acender($('placar'), 'pulsa');
  };
  S.ctrl = new AbortController();
  try {
    const corpo = { texto: palavras(texto) >= 2 ? texto : ultima, seq, exemplo: S.exemplo || undefined, ...(comRota ? { ultima, rota: true } : {}) };
    const res = await fetch('/api/decidir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: S.ctrl.signal });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw Object.assign(new Error(j.error || `Erro ${res.status}`), { status: res.status, code: j.code });
    }
    await lerSSE(res, (ev, d) => {
      if (gen !== S.gen) return;
      if (ev === 'grupo') {
        if (rotaOk === null) fila.push(d);
        else if (rotaOk) aplicarGrupo(d);
        else fitaDescartou(d.grupo); // a fala era um comando: estas decisões não valem
      } else if (ev === 'rota') {
        if (d._jev) record(d._jev, '🎯 Roteador');
        const eComando = !d.erro && ((TIPOS_COMANDO.includes(d.tipo) && d.p_tipo >= 0.55) || (d.tipo === 'outra' && d.p_tipo >= 0.8));
        rotaOk = !eComando;
        S.rotaParcial = { texto: d.ultima || '', comando: eComando, tipo: d.tipo, alvo: d.alvo };
        if (eComando) { foiComando = true; aoRotearComando(d, pend); for (const x of fila) fitaDescartou(x.grupo); fila.length = 0; }
        else { if (pend && pend.tipo == null) pend.tipo = 'descricao'; ocultarCmdVivo(); for (const x of fila) aplicarGrupo(x); fila.length = 0; }
      } else if (ev === 'falha') {
        falhas++; fitaFalhou(d.grupo);
        if (falhas === 1) toast(mensagemFalha(d), 'err');
        if (d.code === 'budget_exhausted' || d.code === 'rate_limited') pararEntradas();
      } else if (ev === 'fim') {
        if (rotaOk === null) { rotaOk = true; for (const x of fila) aplicarGrupo(x); fila.length = 0; }
        if (!foiComando && !S.parcial && chegou.length) agendarVersao('fala');
        S.ultimo = { n: d.n, ms: d.ms, custo: d.custo, cache: d.cacheados, latMax: d.latencia_max, cliente: Math.round(performance.now() - t0), erros: d.erros, seq: d.seq };
        S.historico.push({ ...S.ultimo, fala: S.gen, t: Date.now() });
        if (S.historico.length > 80) S.historico.shift();
        atualizarPlacar();
      }
    });
  } catch (e) {
    if (e.name !== 'AbortError' && gen === S.gen) {
      toast(e.status === 429 ? (e.message || 'Calma! Muitas atualizações seguidas.') : (e.message || 'Falha ao falar com o servidor.'), 'err');
      for (const g of GRUPOS) if (!chegou.includes(g.id)) fitaFalhou(g.id);
      if (e.code === 'budget_exhausted') pararEntradas();
    }
  } finally {
    if (gen === S.gen) {
      S.voando = false;
      if (S.pendente) { S.pendente = false; setTimeout(atualizar, 20); }
    }
  }
}
function mensagemFalha(d) {
  if (d.code === 'budget_exhausted') return 'O orçamento de demonstração do Jev acabou por hoje. Volte amanhã!';
  if (d.code === 'rate_limited') return 'Muitas decisões por minuto vindas de você. Respira e tenta de novo em alguns segundos.';
  return `${NOME_GRUPO_CURTO[d.grupo]}: ${d.mensagem || 'o Jev não respondeu desta vez'} — os outros painéis seguem valendo.`;
}
function limiteSessao() { pararEntradas(); toast(`Limite desta sessão atingido (${CFG.limites.porSessao} atualizações). Recarregue a página para continuar.`, 'err'); }

function atualizarPlacar() {
  const u = S.ultimo;
  if (!u) return;
  rolar($('pl-dec'), u.n, { fmt: (v) => fmt.int(v) });
  $('pl-tempo').textContent = u.cache === GRUPOS.length ? 'cache' : fmt.num(u.ms / 1000, 2) + ' s';
  $('pl-custo').textContent = u.cache === GRUPOS.length ? 'US$ 0 (cache)' : fmt.usd(u.custo);
  $('pl-atu').textContent = String(S.atualizacoesFala);
  $('pl-atu-rot').textContent = S.atualizacoesFala === 1 ? 'atualização nesta fala' : 'atualizações nesta fala';
  $('fita-total').innerHTML = `${ic('raio')}<b>${u.n}</b> decisões em <b>${u.cache === GRUPOS.length ? 'cache' : fmt.num(u.ms / 1000, 2) + ' s'}</b>`;
}

// ------------------------------------------------------------------ renderização
function render(grupo) {
  if (!S.R.entender || !S.R.marca) return;
  const ctx = montar({ R: S.R, O: oEf(), texto: textoAtual(), nomeManual: S.nomeManual, ia: S.ia, agora: S.agora });
  ctx.ajustes = S.ajustes; // os renderizadores põem o CSS dos ajustes por cima de cada peça (e no download)
  ultimoCtx = ctx;
  renderTravas();
  const f = ctx.marca.f;
  const extras = ctx.marca.fontesExtras || [];
  if (!fontesProntas(f, extras)) { carregarFontes(f, extras).then(() => { if (ultimoCtx === ctx) render(); }); }
  renderIdent(ctx);
  renderMarca(ctx);
  if (S.R.site) renderSite(ctx);
  if (S.R.posts) renderPosts(ctx);
  if (S.R.email) renderEmail(ctx);
  if (S.R.anuncios) renderAnuncios(ctx);
  renderCabecalhos(ctx);
  renderKnobs();
  if ($('raiox').classList.contains('aberto')) renderRaioX(grupo);
  expor(ctx);
}

// knobs do channel strip: as 4 escalas (score) que o Jev decide giram até a posição contínua que ele respondeu
const KNOBS = { preco: 'kn-preco', mat: 'kn-mat', dens: 'kn-dens', emoji: 'kn-emoji' };
function renderKnobs() {
  for (const [q, id] of Object.entries(KNOBS)) {
    const e = $(id), a = resposta(S.R, q), m = META[q];
    if (!e || !a || a.type !== 'score' || !m) continue;
    const n = m.opcoes ? Object.keys(m.opcoes).length - 1 : 4;
    const k = Math.max(0, Math.min(1, a.score / n)).toFixed(3);
    const rot = rotuloOpcao(q, String(Math.round(a.score)));
    if (e.style.getPropertyValue('--k') !== k) {
      e.style.setProperty('--k', k);
      e.classList.remove('mexeu'); void e.offsetWidth; e.classList.add('mexeu');
    }
    e.classList.add('on');
    e.querySelector('.knob-v').textContent = rot;
    e.title = `${m.rotulo}: ${rot} (${fmt.num(a.score, 1)} de ${n}). O Jev responde numa escala contínua e o knob gira até lá.`;
  }
}
const fontesProntas = (f, extras) => fontesCarregadas(f, extras);

function renderIdent(ctx) {
  const inp = $('nome');
  if (document.activeElement !== inp && !S.nomeManual) inp.value = ctx.nome;
  const o = $('nome-orig');
  o.className = 'orig o-' + ctx.origemNome;
  o.textContent = ctx.origemNome === 'fala' ? 'fala' : ctx.origemNome === 'manual' ? 'editado' : 'sugestão';
  inp.parentElement.classList.toggle('provisorio', ctx.origemNome === 'provisorio');
  o.title = ctx.origemNome === 'provisorio' ? 'Nome provisório do segmento — diga “se chama …” / “o nome é …” ou edite aqui' : ctx.origemNome === 'fala' ? 'Nome tirado da sua fala' : 'Nome editado por você';
  const c = $('cidade');
  c.hidden = !ctx.cidade;
  if (ctx.cidade) { c.textContent = ctx.cidade.nome; c.title = `${ctx.cidade.nome}/${ctx.cidade.uf} — cidade tirada da sua fala`; }
  $('url').textContent = ctx.dominio;
  $('modal-url').textContent = 'https://' + ctx.dominio;
}

function renderCabecalhos(ctx) {
  const p = (q, id) => { const a = resposta(S.R, q); return a && a.probabilities ? fmt.pct(a.probabilities[id]) : ''; };
  const dado = (q) => (S.O[q] != null ? `<span class="dado" title="sorteada no Outra versão">${ic('dado')}</span> ` : '');
  const set = (id, grupo, html) => { const e = $(id); if (!e) return; if (!S.lat[grupo] && !S.cache[grupo]) return; e.innerHTML = `${S.cache[grupo] ? 'cache' : fmt.ms(S.lat[grupo])} · ${html}`; e.classList.add('on'); };
  if (S.R.site) set('lat-site', 'site', `${dado('hero')}${esc(B.HEROS.find((h) => h.id === ctx.site.hero).rotulo)} ${p('hero', ctx.site.hero)}`);
  set('lat-marca', 'marca', `${dado('estilo')}${esc((B.ESTILOS_LOGO.find((x) => x.id === ctx.marca.estilo) || B.ESTILOS_LOGO[0]).rotulo)} ${p('estilo', ctx.marca.estilo)} · ${dado('paleta')}${esc(ctx.marca.paleta.rotulo)} ${p('paleta', ctx.marca.paleta.id)}`);
  if (S.R.posts) set('lat-posts', 'posts', `${dado('car_estilo')}${esc(ctx.carEstilo.rotulo)} · ${ctx.posts.map((P) => esc(B.FORMATOS[P.fmt].rotulo)).join(' · ')}`);
  if (S.R.email) set('lat-email', 'email', `${dado('em_tipo')}${esc(ctx.email.tipo.rotulo)} · assinatura ${esc((B.ASSINATURAS.find((x) => x.id === ctx.email.ass.layout) || B.ASSINATURAS[0]).rotulo.toLowerCase())}`);
  if (S.R.anuncios) set('lat-ads', 'anuncios', `${dado('ad_estilo')}${esc((B.ESTILOS_AD.find((x) => x.id === ctx.anuncios.estilo) || B.ESTILOS_AD[0]).rotulo)} · ${esc(ctx.anuncios.conceito.rotulo.toLowerCase())}`);
}

// ---------- site no iframe (troca só os blocos que mudaram, sem piscar) ----------
const SITE = { pronto: false, carregando: false, pendente: null, blocos: new Map(), ordem: [] };
function renderSite(ctx) {
  const frame = $('site-frame');
  $('painel-site').classList.remove('vazia');
  const L = blocos(ctx);
  if (!SITE.pronto) {
    if (SITE.carregando) { SITE.pendente = ctx; return; }
    SITE.carregando = true;
    frame.onload = () => {
      SITE.pronto = true; SITE.carregando = false;
      SITE.blocos = new Map(L.map((b) => [b.id, b.html])); SITE.ordem = L.map((b) => b.id);
      ajustarEscala();
      if (SITE.pendente) { const c = SITE.pendente; SITE.pendente = null; renderSite(c); }
    };
    frame.srcdoc = documento(ctx);
    return;
  }
  const doc = frame.contentDocument;
  if (!doc || !doc.body || !doc.getElementById('vars')) { SITE.pronto = false; SITE.carregando = false; return renderSite(ctx); }
  doc.getElementById('vars').textContent = cssVars(ctx);
  aplicarAjustesNoDocumento(doc, ctx.ajustes, ctx); // o <style id="ajustes"> muda no lugar, sem recarregar o site
  doc.body.className = classesBody(ctx);
  doc.title = `${ctx.nome} — ${cap(ctx.pack.cat)}`;
  const ids = L.map((b) => b.id);
  if (ids.join('|') !== SITE.ordem.join('|')) {
    const y = doc.scrollingElement ? doc.scrollingElement.scrollTop : 0;
    doc.body.innerHTML = L.map((b) => `<div data-bloco="${b.id}">${b.html}</div>`).join('');
    for (const b of L) if (SITE.blocos.get(b.id) !== b.html) marcarMudou(doc, b.id);
    if (doc.scrollingElement) doc.scrollingElement.scrollTop = y;
  } else {
    for (const b of L) {
      if (SITE.blocos.get(b.id) === b.html) continue;
      const w = doc.querySelector(`[data-bloco="${b.id}"]`);
      if (w) { w.innerHTML = b.html; marcarMudou(doc, b.id); }
    }
  }
  SITE.blocos = new Map(L.map((b) => [b.id, b.html])); SITE.ordem = ids;
  aplicarIADoc(doc);
}
function marcarMudou(doc, id) {
  const w = doc.querySelector(`[data-bloco="${id}"]`), f = w && w.firstElementChild;
  if (f) { f.classList.remove('mudou'); void f.offsetWidth; f.classList.add('mudou'); }
}
function ajustarEscala() {
  const vp = $('site-vp'), frame = $('site-frame');
  const W = vp.clientWidth, H = vp.clientHeight;
  if (!W || !H) return;
  const vw = W < 380 ? W : Math.max(800, Math.min(1180, Math.round(W / 0.62)));
  const s = W / vw;
  frame.style.width = vw + 'px';
  frame.style.height = Math.ceil(H / s) + 'px';
  frame.style.transform = `scale(${s})`;
}

function renderMarca(ctx) {
  const c = ctx.marca.cores, f = ctx.marca.f;
  $('painel-marca').classList.remove('vazia');
  const cores = [['principal', c.pri], ['secundária', c.sec], ['destaque', c.acc], ['fundo', c.bg], ['texto', c.ink]];
  const html = `<div class="marca-palco" style="background:${c.bg}">${logoSVG(ctx, { classe: 'logo-id' })}<div class="variantes"><span style="background:${c.pri}" title="Símbolo sobre a cor principal">${simboloSVG(ctx, { variante: 'inv', tamanho: 24, classe: 'v1' })}</span><span style="background:${FUNDO_CONTRASTE}" title="Símbolo em fundo contrastante">${simboloSVG(ctx, { variante: varianteContraste(c), tamanho: 24, classe: 'v2' })}</span></div></div>
    <div class="marca-info"><div class="paleta">${cores.map(([n, h]) => `<div class="sw" style="background:${h}" title="${n} ${h}"><span style="color:${corSobre(h, '#111111', '#ffffff')}">${h.toUpperCase()}</span></div>`).join('')}</div>
    <div class="fontes"><span class="aa" style="font-family:${esc(f.disp)};font-weight:${f.dw}">Aa</span><div><b>${esc(f.nome)}</b><small>logo ${esc((B.ESTILOS_LOGO.find((x) => x.id === ctx.marca.estilo) || B.ESTILOS_LOGO[0]).rotulo.toLowerCase())} · paleta ${esc(ctx.marca.paleta.rotulo.toLowerCase())}${ctx.marca.estilo === 'classico' ? ` · ${esc(B.FORMAS.find((x) => x.id === ctx.marca.forma).rotulo.toLowerCase())} · ${esc(B.DISPOSICOES.find((x) => x.id === ctx.marca.disp).rotulo.toLowerCase())}` : ''}</small></div></div></div>`;
  const alvo = $('marca-corpo');
  if (alvo._html !== html) { alvo.innerHTML = html; alvo._html = html; }
  aplicarIADoc(document);
}

function renderPosts(ctx) {
  $('painel-posts').classList.remove('vazia');
  const grade = $('posts-grid');
  if (grade.children.length !== ctx.posts.length) { grade.innerHTML = ctx.posts.map((_, i) => `<div class="car-slot" data-slot="${i}"></div>`).join(''); }
  ctx.posts.forEach((_, i) => {
    const slot = grade.children[i], html = carrosselHTML(ctx, i);
    if (slot._html !== html) { slot.innerHTML = html; slot._html = html; ativarCarrosseis(slot); }
  });
  aplicarIADoc(document);
}
function renderEmail(ctx) {
  $('painel-email').classList.remove('vazia');
  const html = emailPainelHTML(ctx);
  const alvo = $('email-corpo');
  if (alvo._html !== html) { alvo.innerHTML = html; alvo._html = html; ativarEmail(alvo); } // a aba e a rolagem ficam guardadas no contêiner
  aplicarIADoc(document);
}
function renderAnuncios(ctx) {
  $('painel-ads').classList.remove('vazia');
  const html = anunciosPainelHTML(ctx);
  const alvo = $('ads-corpo');
  if (alvo._html !== html) { alvo.innerHTML = html; alvo._html = html; ativarAnuncios(alvo); }
  aplicarIADoc(document);
}

// ------------------------------------------------------------------ ⤢ ampliar (visão grande de cada peça) e downloads
const AMPLIAR = {
  posts: { titulo: 'Carrosséis do Instagram', html: (ctx) => carrosseisAmpliadoHTML(ctx), ativar: ativarCarrosseis },
  email: { titulo: 'E-mail marketing · template master e assinatura', html: (ctx) => emailAmpliadoHTML(ctx), ativar: ativarEmail },
  anuncios: { titulo: 'Anúncios de display · kit de banners', html: (ctx) => anunciosAmpliadoHTML(ctx), ativar: ativarAnuncios },
};
function ampliarPeca(peca) {
  const ctx = ultimoCtx, A = AMPLIAR[peca];
  if (!ctx || !A || !S.R[peca]) { toast('Fale ou simule uma fala primeiro.'); return; }
  $('mp-titulo').textContent = A.titulo;
  const corpo = $('mp-corpo');
  corpo.innerHTML = A.html(ctx);
  A.ativar(corpo);
  corpo.scrollTop = 0;
  $('modal-peca').hidden = false;
  $('mp-fechar').focus({ preventScroll: true });
}
function fecharAmpliado() { if ($('modal-peca').hidden) return; $('modal-peca').hidden = true; $('mp-corpo').innerHTML = ''; }
const arquivoDe = (ctx, fim) => `${ctx.handle || 'marca'}-${fim}`;
function baixarEmail() { const ctx = ultimoCtx; if (!ctx || !S.R.email) return toast('Fale ou simule uma fala primeiro.'); baixarArquivo(emailExportavel(ctx), arquivoDe(ctx, 'email.html'), 'text/html'); toast('⬇️ E-mail em HTML de tabelas, pronto para Mailchimp, RD Station ou Brevo.', 'ok'); }
function baixarAnuncios() { const ctx = ultimoCtx; if (!ctx || !S.R.anuncios) return toast('Fale ou simule uma fala primeiro.'); baixarArquivo(anunciosExportavel(ctx), arquivoDe(ctx, 'banners.html'), 'text/html'); toast('⬇️ Kit de banners HTML5 (todos os tamanhos num arquivo).', 'ok'); }
async function copiarAssinatura() {
  const ctx = ultimoCtx;
  if (!ctx || !S.R.email) return toast('Fale ou simule uma fala primeiro.');
  const html = assinaturaExportavel(ctx);
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([tmp.innerText], { type: 'text/plain' }) })]);
    toast('📋 Assinatura copiada: cole em Configurações → Assinatura no Gmail ou no Outlook.', 'ok');
  } catch { baixarArquivo(`<!doctype html><meta charset="utf-8">${html}`, arquivoDe(ctx, 'assinatura.html'), 'text/html'); toast('O navegador não deixou copiar: baixei a assinatura em HTML.'); }
}

// ------------------------------------------------------------------ 🎲 Outra versão
function outraVersao() {
  if (!S.R.marca || !S.R.site) { toast('Fale ou simule uma fala primeiro — a outra versão sorteia entre as opções que o Jev achou boas.'); return; }
  const { O, mudancas } = sortear(S.R, oEf(), Math.random, S.T);
  for (const q of Object.keys(S.T)) delete O[q];
  S.O = O;
  S.versoes = (S.versoes || 0) + 1;
  render('versao');
  PAINEIS.forEach((id) => acender($(id)));
  $('b-voltar').hidden = !Object.keys(S.O).length;
  const destaque = mudancas.sort((a, b) => b.p - a.p).slice(0, 3)
    .map((m) => `${META[m.q].rotulo}: “${rotuloOpcao(m.q, m.id)}” (${m.pos}ª opção do Jev, ${fmt.pct(m.p)})`).join(' · ');
  document.querySelectorAll('.jev-toast').forEach((t) => { if (t.textContent.startsWith('🎲')) t.remove(); });
  toast(`🎲 ${mudancas.length} decisões sorteadas entre as boas — ${destaque}${Object.keys(S.travas).length ? ' · 🔒 peças travadas ficaram iguais' : ''}`, 'ok');
  versao({ motivo: 'versao', rotulo: '🎲 Outra versão' });
}
function rotuloOpcao(q, id) { const m = META[q]; return (m && m.opcoes && m.opcoes[id]) || id; }

// ------------------------------------------------------------------ 🩻 Raio-X
function renderRaioX(grupoNovo) {
  const corpo = $('rx-corpo');
  const u = S.ultimo;
  $('rx-resumo').textContent = u ? `${u.n} decisões · ${fmt.num(u.ms / 1000, 2)} s · ${fmt.usd(u.custo)}` : '';
  let html = '';
  for (const g of GRUPOS) {
    html += `<div class="rx-grupo" data-grupo="${g.id}"><div class="rx-gcab"><i class="rx-led"></i>${esc(g.rotulo)} <span class="dim">· ${POR_GRUPO[g.id]} perguntas</span><span class="gl">${S.lat[g.id] != null ? (S.cache[g.id] ? 'cache' : fmt.ms(S.lat[g.id])) : 'aguardando'}</span></div>`;
    for (const q of Object.keys(PERGUNTAS[g.id])) {
      const a = resposta(S.R, q), m = META[q];
      let escolhaTxt = '—', segundo = '', p = 0;
      if (a) {
        if (a.type === 'choice') {
          const r = ranking(a), id = escolha(S.R, oEf(), q);
          p = a.probabilities[id] || 0;
          escolhaTxt = rotuloOpcao(q, id);
          const s2 = r.find(([x]) => x !== id);
          segundo = s2 ? `2º: ${rotuloOpcao(q, s2[0])} · ${fmt.pct(s2[1])}` : '';
        } else if (a.type === 'noul') {
          p = a.noul; escolhaTxt = a.noul >= 0.5 ? 'sim' : 'não'; segundo = a.noul >= 0.35 && a.noul < 0.65 ? 'perto de 50%: o Jev está em dúvida' : '';
        } else {
          p = a.score / (m.opcoes ? Object.keys(m.opcoes).length - 1 : 4);
          escolhaTxt = `${fmt.num(a.score, 2)} · ${rotuloOpcao(q, String(Math.round(a.score)))}`;
          segundo = 'escala contínua (score)';
        }
      }
      const chave = `${escolhaTxt}|${fmt.pct(p)}`;
      const mudou = S.rxAnterior[q] && S.rxAnterior[q] !== chave;
      S.rxAnterior[q] = chave;
      const pTxt = a ? (a.type === 'score' ? fmt.num(a.score, 1) : fmt.pct(p)) : '';
      html += `<div class="rx-l${S.O[q] != null ? ' dado' : ''}${S.T[q] != null ? ' trava' : ''}${mudou ? ' mudou' : ''}" data-q="${q}"><span class="q" title="${esc(m.rotulo)}${S.T[q] != null ? ' · travado por comando' : ''}">${S.T[q] != null ? ic('cadeado') : ''}${esc(m.rotulo)}</span><span class="c"><b title="${esc(escolhaTxt)}">${esc(escolhaTxt)}</b>${segundo ? `<small>${esc(segundo)}</small>` : ''}<span class="trk"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span></span><span class="p">${pTxt}</span></div>`;
    }
    html += '</div>';
  }
  corpo.innerHTML = html;
  void grupoNovo;
}
function abrirRaioX() { $('raiox').classList.add('aberto'); $('raiox').setAttribute('aria-hidden', 'false'); $('rx-fundo').classList.add('aberto'); S.rxAnterior = {}; renderRaioX(); }
// devolve o foco a quem abriu a gaveta antes de escondê-la (aria-hidden com foco dentro é bloqueado pelo navegador)
function soltarFoco(gaveta, abridor) { if (gaveta.contains(document.activeElement)) $(abridor).focus({ preventScroll: true }); }
function fecharRaioX() { soltarFoco($('raiox'), 'b-raiox'); $('raiox').classList.remove('aberto'); $('raiox').setAttribute('aria-hidden', 'true'); $('rx-fundo').classList.remove('aberto'); }

// ------------------------------------------------------------------ ✍️ IA de texto
const ALVOS_IA = { titulo: ['titulo'], subtitulo: ['subtitulo'], sobre: ['sobre', 'sobre-curto'], legenda1: ['legenda1'], legenda2: ['legenda2'], legenda3: ['legenda3'], assunto: ['assunto'], preheader: ['preheader'], email: ['email'], anuncio: ['anuncio'], slogan: ['slogan'] };
function escreverAlvo(doc, campo, valor, escrevendo) {
  for (const alvo of ALVOS_IA[campo] || []) {
    doc.querySelectorAll(`[data-campo="${alvo}"]`).forEach((e) => {
      const v = alvo === 'sobre-curto' ? valor.split(/(?<=[.!?])\s/)[0] : valor;
      if (alvo === 'slogan' && e.closest('.slogan-id')) e.textContent = `“${v}”`; else e.textContent = v;
      e.classList.toggle('ia-escrevendo', !!escrevendo);
    });
  }
}
function aplicarIADoc(doc) {
  if (!S.escrita || !S.escrita.ativa) return;
  for (const [k, v] of Object.entries(S.ia)) escreverAlvo(doc, k, v, S.escrita.atual === k);
}
function aplicarIA(campos, atual) {
  const docSite = SITE.pronto ? $('site-frame').contentDocument : null;
  for (const [k, v] of Object.entries(campos)) {
    escreverAlvo(document, k, v, k === atual);
    if (docSite) escreverAlvo(docSite, k, v, k === atual);
  }
}
const NOME_CAMPO = { titulo: 'o título do site', subtitulo: 'o subtítulo', sobre: 'o “sobre nós”', legenda1: 'a legenda 1', legenda2: 'a legenda 2', legenda3: 'a legenda 3', assunto: 'o assunto do e-mail', preheader: 'o preheader', email: 'o texto do e-mail', anuncio: 'o título do anúncio', slogan: 'o slogan' };
function botaoIA(titulo, sub, prog) {
  const b = $('b-ia');
  b.innerHTML = `<span class="bi-t">${titulo}</span><span class="bi-s">${sub}</span>`;
  b.style.setProperty('--prog', String(Math.round(Math.min(1, Math.max(0, prog)) * 100)) + '%');
}
function statusIA(html, erro = false) { const s = $('ia-status'); s.hidden = false; s.classList.toggle('erro', erro); s.innerHTML = html; }

async function escreverComIA() {
  if (S.escrita && S.escrita.ativa) { S.escrita.ctrl.abort(); return; }
  const ctx = ultimoCtx;
  if (!ctx || !S.R.site || palavras(textoAtual()) < 2) { toast('Fale ou simule uma fala primeiro — a IA de texto escreve a partir dela e das decisões do Jev.'); return; }
  const d = {
    nome: ctx.nome, segmento: ctx.pack.label, cidade: ctx.cidade ? ctx.cidade.nome : '', personalidade: ctx.pers.jev, publico: ctx.pub.jev, objetivo: ctx.obj.jev,
    preco: B.PRECO_ROT[ctx.precoNivel], diferencial: ctx.pack.ang[ctx.dif], cta: ctx.site.cta.texto,
    oferta: ctx.oferta ? ctx.oferta.frase : '', emojis: B.EMOJIS_ROT[ctx.emojiNivel], posts: ctx.posts.map((P) => ({ formato: B.FORMATOS[P.fmt].rotulo, gancho: P.hook })),
    email: `${ctx.email.tipo.rotulo} (${ctx.email.tipo.jev}); assunto hoje: “${ctx.email.assuntoLib}”`, anuncio: `${ctx.anuncios.conceito.rotulo}; título hoje: “${ctx.anuncios.tituloLib}”`,
  };
  const ctrl = new AbortController();
  const E = S.escrita = { ativa: true, ctrl, texto: '', t0: performance.now(), t1: 0, n: 0, seg: ctx.segId, atual: null, gen: S.gen };
  $('b-ia').classList.add('escrevendo');
  $('ia-status').hidden = true;
  botaoIA(`${ic('parar')} Parar`, `enviando a sua fala + ${TOTAL} decisões do Jev ao modelo de texto…`, 0.03);
  const campos0 = {};
  try {
    const res = await fetch('/api/escrever', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: textoAtual(), decisoes: d }), signal: ctrl.signal });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw Object.assign(new Error(j.error || `Erro ${res.status}`), { code: j.code, status: res.status }); }
    let modelo = '';
    await lerSSE(res, (ev, x) => {
      if (ev === 'inicio') { modelo = x.modelo; botaoIA(`${ic('parar')} Parar`, `${esc(modelo)} lendo a fala + ${TOTAL} decisões${x.fila ? ` · fila: ${x.fila}ª` : ''}…`, 0.05); }
      else if (ev === 'fila') botaoIA(`${ic('parar')} Parar`, `${ic('fila')} na fila do modelo de texto (${x.posicao}ª) — ele escreve um texto por vez`, 0.05);
      else if (ev === 'tok') {
        if (!E.t1) E.t1 = performance.now();
        E.texto += x.t; E.n = x.n || E.n + 1;
        const { campos, atual } = lerCampos(E.texto);
        Object.assign(campos0, campos);
        S.ia = { ...campos }; S.iaSeg = E.seg; E.atual = atual;
        aplicarIA(campos, atual);
        const feitos = Object.keys(campos).length - (atual ? 1 : 0);
        const toks = E.n / Math.max(0.3, (performance.now() - E.t1) / 1000);
        botaoIA(`${ic('parar')} Parar · escrevendo ${esc(NOME_CAMPO[atual] || '…')}`, `<b>${fmt.num(toks, 1)} tok/s</b> · ${E.n} tokens · ${esc(modelo)}`, Math.max(0.06, feitos / CAMPOS.length));
      } else if (ev === 'fim') {
        const { campos } = lerCampos(E.texto);
        S.ia = campos; S.iaSeg = E.seg; E.ativa = false; E.atual = null;
        render('ia');
        versao({ motivo: 'ia', rotulo: '✍️ Textos da IA de texto' });
        document.querySelectorAll('.ia-escrevendo').forEach((e) => e.classList.remove('ia-escrevendo'));
        const n = Object.keys(campos).length;
        statusIA(`${ic('ok')}<b>${n}/${CAMPOS.length} textos</b> em ${fmt.num(x.ms / 1000, 1)} s · <span class="mono">${fmt.num(x.tok_s || 0, 1)} tok/s</span> · ${x.tokens} tokens<br><b>${esc(x.modelo || modelo)}</b> · R$ 0 por uso · <a href="#" id="ia-desfazer">desfazer</a>`);
        const des = $('ia-desfazer'); if (des) des.onclick = (ev2) => { ev2.preventDefault(); S.ia = {}; render('ia'); $('ia-status').hidden = true; };
        if (!n) statusIA('O modelo de texto respondeu, mas fora do formato esperado. Tente de novo — os textos da biblioteca continuam valendo.', true);
      } else if (ev === 'erro') {
        E.ativa = false;
        statusIA(`${ic('alerta')}${esc(x.mensagem || 'O modelo de texto falhou.')} Os textos da biblioteca continuam valendo.`, true);
      }
    });
  } catch (e) {
    if (e.name === 'AbortError') { statusIA(`${ic('parar')}Escrita interrompida. O que já foi escrito ficou nos artefatos.`); }
    else statusIA(`${ic('alerta')}${esc(e.message || 'Não consegui falar com o modelo de texto.')}`, true);
  } finally {
    E.ativa = false;
    document.querySelectorAll('.ia-escrevendo').forEach((x) => x.classList.remove('ia-escrevendo'));
    const fr = SITE.pronto && $('site-frame').contentDocument; if (fr) fr.querySelectorAll('.ia-escrevendo').forEach((x) => x.classList.remove('ia-escrevendo'));
    $('b-ia').classList.remove('escrevendo');
    $('b-ia').style.removeProperty('--prog');
    $('b-ia').innerHTML = `${ic('caneta')}<span>${Object.keys(S.ia).length ? 'Reescrever com IA de texto' : 'Escrever textos com IA de texto'}</span>`;
    if (Object.keys(S.ia).length) render('ia');
  }
}

// ------------------------------------------------------------------ ⬇️ Baixar e ⤢ Ampliar
async function dataURI(url) {
  const r = await fetch(url); const b = await r.blob();
  return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
}
async function htmlParaBaixar(ctx = ultimoCtx) {
  const mapa = {};
  for (const k of [...(ctx.marca.f.emb || []), ...(ctx.marca.fontesExtras || [])]) for (const f of FONTES_EMB[k] || []) mapa[f.file] = await dataURI('fonts/' + f.file);
  return documento(ctx, { fontes: mapa });
}
async function baixarSite() {
  if (!ultimoCtx || !S.R.site) { toast('Gere um site primeiro: fale, simule uma fala ou digite.'); return; }
  const html = await htmlParaBaixar();
  const nome = `site-${ultimoCtx.handle}.html`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = el('a', { href: url, download: nome }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  toast(`⬇️ ${nome} — um arquivo só (${fmt.int(html.length / 1024)} KB), abre em qualquer navegador, sem internet.`, 'ok');
}
function ampliar() {
  if (!ultimoCtx || !S.R.site) { toast('Gere um site primeiro.'); return; }
  $('modal-frame').srcdoc = documento(ultimoCtx);
  $('modal-site').hidden = false;
}

// ------------------------------------------------------------------ microfone, simulação, texto
const nivelEl = $('nivel');
nivelEl.innerHTML = Array.from({ length: 14 }, () => '<i></i>').join('');
const barras = [...nivelEl.children];
const vuEl = $('vu');
let vuPicoT = 0;
function nivel(v) {
  nivelEl.classList.toggle('on', v > 0.02);
  barras.forEach((b, i) => { const k = v * (0.55 + 0.45 * Math.sin(i * 1.7 + performance.now() / 120)); b.style.height = `${4 + Math.max(0, k) * 18}px`; });
  $('mic-anel').style.setProperty('--nv', String(1 + v * 0.18));
  // VU meter: o ponteiro segue o nível da fala (a balística de ~300 ms fica no CSS); acima de ~+1 VU acende o LED de pico
  if (vuEl) {
    vuEl.style.setProperty('--vu', Math.max(0, Math.min(1, v)).toFixed(3));
    if (v > 0.84) { vuEl.classList.add('pico'); clearTimeout(vuPicoT); vuPicoT = setTimeout(() => vuEl.classList.remove('pico'), 280); }
  }
}
const mic = criarMicrofone({
  onTexto: (f, p) => aoFalar(f, p, 'mic'),
  onNivel: nivel,
  onEstado: (estado, msg) => {
    uiMic();
    if (estado === 'ouvindo' && !S.avisouMic) { S.avisouMic = true; toast('🎙️ Ouvindo em português. Fale do seu negócio — o que faz, onde, para quem e o clima que você quer.'); }
    if (estado === 'erro' && msg) toast(msg, 'err');
    if (estado === 'parado') { agendar(true); if (msg) toast(msg); }
  },
});
function uiMic() {
  const b = $('mic'), simulando = !!(S.sim && S.sim.ativo);
  b.setAttribute('aria-pressed', String(mic.ligado));
  b.classList.toggle('simulando', simulando);
  b.classList.toggle('indisponivel', !SR);
  $('mic-estado').textContent = mic.ligado ? 'Ouvindo… toque para parar' : simulando ? 'Simulando fala… toque para parar' : SR ? 'Toque e fale' : 'Microfone indisponível aqui';
  $('mic-dica').textContent = mic.ligado ? 'fale do seu negócio: o que faz, onde, para quem, o clima' : simulando ? 'as parciais passam pelo mesmo caminho do microfone' : SR ? 'em português · ou simule uma fala abaixo' : 'use Simular fala ou digite abaixo (Chrome, Edge e Safari têm voz)';
  mostrarFala();
}
function novaFala({ exemplo = null } = {}) {
  S.gen++;
  if (S.ctrl) try { S.ctrl.abort(); } catch { /* ok */ }
  clearTimeout(S.deb);
  Object.assign(S, { final: '', parcial: '', exemplo, O: {}, voando: false, pendente: false, ultimoEnviado: '', primeiroPend: 0, atualizacoesFala: 0, nomeManual: '',
    T: {}, travas: {}, segs: [], base: [], sessaoSegs: [], sessaoConhecido: '', filaCmd: Promise.resolve(), rotaParcial: null, ajustes: [] });
  novoProjeto();
  ocultarCmdVivo();
  renderTravas();
  if (Object.keys(S.ia).length) { S.ia = {}; $('ia-status').hidden = true; }
  $('b-voltar').hidden = true;
  $('pl-atu').textContent = '0';
  mostrarFala();
}
function continuarFala() { S.base = S.segs.slice(); S.sessaoSegs = []; S.sessaoConhecido = ''; S.parcial = ''; S.origem = 'mic'; S.atualizacoesFala = 0; }
function pararEntradas() {
  if (S.sim) { S.sim.parar(); S.sim = null; }
  if (mic.ligado) mic.desligar(true);
  uiMic();
}
function simular(ex) {
  pararEntradas();
  novaFala({ exemplo: ex.id });
  document.querySelectorAll('#chips .jev-chip').forEach((c) => c.classList.toggle('active', c.dataset.id === ex.id));
  $('texto').value = '';
  S.sim = simularFala(ex.texto, {
    onTexto: (f, p) => aoFalar(f, p, 'sim'),
    onNivel: nivel,
    onFim: () => { S.sim = null; uiMic(); agendar(true); },
  });
  uiMic();
}
function clicarMic() {
  if (S.sim && S.sim.ativo) { S.sim.parar(); S.sim = null; uiMic(); agendar(true); return; }
  if (mic.ligado) { mic.desligar(); return; }
  if (!SR) { toast('Este navegador não tem reconhecimento de voz (o Firefox não tem). Use o Chrome, o Edge ou o Safari — ou use Simular fala, ou digite abaixo.', 'err'); uiMic(); return; }
  if (S.R.marca && S.segs.length) continuarFala(); // já existe algo criado: a fala nova continua o mesmo projeto (comandos, detalhes)
  else { novaFala(); document.querySelectorAll('#chips .jev-chip').forEach((c) => c.classList.remove('active')); }
  S.avisouMic = false;
  mic.ligar();
  uiMic();
}


// ------------------------------------------------------------------ 🎚️ ajustes livres de estilo ("fundo verde", "tudo em caixa alta", "degradê verde e branco")
// O Jev só ESCOLHE num esquema fechado de botões de estilo (no servidor, lib/ajustes.mjs); cada escolha volta como um ajuste
// { id, prop, pecas, elemento, valor, rotulo, comando, p } e vira CSS por cima da peça (ajustes-css.mjs). Mesmo id substitui e
// vai para o fim da lista (o último vence). Os ajustes ficam no estado, nas versões e no download, e saem um a um pelo ✕.
const PECAS_AJUSTE = ['site', 'posts', 'email', 'anuncios'];
const TV_PECA = { site: 'site', posts: 'posts', email: 'email', anuncios: 'ads' }; // peça → fita das travas do painel (tv-*)
const ROT_PECA = { site: 'site', posts: 'carrosséis', email: 'e-mail', anuncios: 'anúncios' };
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// só entra o que o esquema permite (a lista vem do servidor ou de uma versão guardada)
function ajustesValidos(lista) {
  const out = [];
  for (const a of Array.isArray(lista) ? lista : []) {
    if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !a.id || typeof a.prop !== 'string') continue;
    const pecas = (Array.isArray(a.pecas) ? a.pecas : []).filter((x) => PECAS_AJUSTE.includes(x));
    if (!pecas.length) continue;
    out.push({ ...a, pecas, rotulo: String(a.rotulo || a.prop).slice(0, 90), p: typeof a.p === 'number' ? a.p : null });
  }
  return out;
}
const ajustesDe = (resp) => ajustesValidos(resp && resp.ajustes);
function guardarAjustes(novos) { for (const a of novos) S.ajustes = S.ajustes.filter((x) => x.id !== a.id).concat(a); }
const pecasDe = (lista) => PECAS_AJUSTE.filter((x) => lista.some((a) => a.pecas.includes(x)));
const alvoDasPecas = (pecas) => (pecas.length === 1 ? pecas[0] : 'tudo');
function acenderPecas(pecas) { for (const x of pecas) acender($(PAINEL[x])); }
// amostra na fita: a cor ou o degradê do fundo, a cor do texto, ou um "Aa" desenhado com o próprio ajuste
const ESTILO_AA = {
  caixa: { maiusculas: 'text-transform:uppercase', minusculas: 'text-transform:lowercase' },
  peso: { negrito: 'font-weight:800', fino: 'font-weight:300' },
  italico: { sim: 'font-style:italic' },
  sombra: { com: 'text-shadow:1px 1px 0 rgba(0,0,0,.4)' },
  espaco: { amplo: 'letter-spacing:.16em', junto: 'letter-spacing:-.06em' },
};
function amostraAjuste(a) {
  const v = a.valor;
  if (a.prop === 'fundo' && v && typeof v === 'object') {
    const cs = (Array.isArray(v.cores) ? v.cores : []).filter((c) => HEX.test(c));
    const ang = { horizontal: '90deg', diagonal: '135deg' }[v.direcao] || '180deg';
    const bg = cs.length >= 2 ? (v.direcao === 'radial' ? `radial-gradient(circle,${cs[0]},${cs[1]})` : `linear-gradient(${ang},${cs[0]},${cs[1]})`)
      : cs[0] || (v.tipo === 'escurecer' ? 'linear-gradient(180deg,#5a5a5a,#111)' : 'linear-gradient(180deg,#fff,#dcd8cc)');
    return `<i class="aj-am" style="background:${bg}" aria-hidden="true"></i>`;
  }
  if (a.prop === 'cor_texto') {
    const c = v && typeof v === 'object' && HEX.test(v.cor) ? v.cor : v === 'claro' ? '#FFFFFF' : '#1B1B1B';
    return `<i class="aj-am aj-aa${corSobre(c, '#111111', '#ffffff') === '#111111' ? ' aj-aa--escuro' : ''}" style="color:${c}" aria-hidden="true">A</i>`; // letra clara vai num fundo escuro
  }
  if (a.prop === 'tamanho') return `<i class="aj-am aj-aa" aria-hidden="true">${+v > 1 ? 'A+' : 'A−'}</i>`;
  if (a.prop === 'alinhamento') return `<i class="aj-am aj-aa" aria-hidden="true">${ic(v === 'centro' ? 'alinhar-centro' : 'alinhar-esq')}</i>`;
  return `<i class="aj-am aj-aa" style="${(ESTILO_AA[a.prop] || {})[v] || ''}" aria-hidden="true">Aa</i>`;
}
// a fita inteira (com o rótulo) fica no monitor principal do ajuste; nos outros monitores que ele muda vai só a amostra e o ✕
const monitorPrincipal = (a) => TV_PECA[PECAS_AJUSTE.find((x) => a.pecas.includes(x))];
function chipAjuste(a, mini = false) {
  const onde = a.pecas.map((x) => ROT_PECA[x]).join(', ');
  const tit = `Ajuste de estilo: ${a.rotulo}${a.p != null ? ` (Jev ${fmt.pct(a.p)})` : ''} · vale para ${onde}${a.comando ? ` · você pediu: “${String(a.comando).slice(0, 120)}”` : ''}`;
  return `<span class="ajuste-chip${mini ? ' ajuste-chip--mini' : ''}" data-id="${esc(a.id)}" title="${esc(tit)}">${amostraAjuste(a)}${mini ? '' : `<span class="aj-rot">${esc(a.rotulo)}</span>`}<button type="button" class="aj-x" data-id="${esc(a.id)}" aria-label="Remover o ajuste: ${esc(a.rotulo)}">✕</button></span>`;
}
// no monitor: até 3 fitas inteiras (as mais recentes deste monitor); as mais antigas e os ecos de outros monitores viram
// amostras com ✕ numa linha só, para a pilha não cobrir a peça
function fitasAjustes(lista, painel) {
  const cheias = lista.filter((a) => monitorPrincipal(a) === painel).slice(-3);
  const minis = lista.filter((a) => !cheias.includes(a));
  return cheias.map((a) => chipAjuste(a)).join('') + (minis.length ? `<span class="aj-minis">${minis.map((a) => chipAjuste(a, true)).join('')}</span>` : '');
}
function avisoAjustes(novos) {
  const itens = novos.map((a) => `<b>${esc(a.rotulo)}</b>${a.p != null ? ` <span class="dim">Jev ${fmt.pct(a.p)}</span>` : ''}`).join(' · ');
  return `${ic('fader')}${novos.length > 1 ? 'Ajustes aplicados' : 'Ajuste aplicado'}: ${itens}`;
}
async function aplicarAjustes(novos, { texto, alvo, resp }) {
  await versao({ motivo: 'fala' }); // garante a versão de antes do ajuste (não duplica se já existe)
  const modo = resp.modo || 'ajuste';
  // "ambos": além do estilo livre, o Jev trocou opções prontas da peça — essas entram e travam como num comando
  const mud = (modo === 'ambos' || modo === 'biblioteca') && ALVOS[alvo] ? aplicarEscolhas(resp, alvo) : [];
  if (mud.length) travarAlvo(alvo, 'seu comando');
  guardarAjustes(novos);
  render('ajuste');
  const pecas = pecasDe(novos);
  acenderPecas(pecas);
  if (mud.length) acenderAlvo(alvo);
  const lib = mud.length ? ` · <b>${esc(cap(ROT_ALVO[alvo] || alvo))}</b> → ${mud.slice(0, 3).map((m) => `${esc(META[m.q].rotulo)}: <b>${esc(rotuloOpcao(m.q, m.id))}</b>`).join(' · ')} ${ic('cadeado')}` : '';
  mostrarCmdVivo(avisoAjustes(novos) + lib, 'feito'); ocultarCmdVivo(7000);
  versao({ motivo: 'ajuste', alvo: ROT_ALVO[alvo] && alvo !== 'nenhum' ? alvo : alvoDasPecas(pecas), rotulo: `🎨 “${texto}”` });
}
function removerAjuste(id) {
  const a = S.ajustes.find((x) => x.id === id);
  if (!a) return;
  S.ajustes = S.ajustes.filter((x) => x.id !== id);
  render('ajuste');
  acenderPecas(a.pecas);
  mostrarCmdVivo(`${ic('fader')}Ajuste removido: <b>${esc(a.rotulo)}</b>`, 'feito'); ocultarCmdVivo(4000);
  versao({ motivo: 'ajuste', alvo: alvoDasPecas(a.pecas), rotulo: `✕ ${a.rotulo}` });
}

// ------------------------------------------------------------------ 🎯 comandos por voz ("agora muda o logo pra ficar tipo selo")
function mostrarCmdVivo(html, classe = '') { const e = $('cmd-vivo'); e.innerHTML = html; e.className = 'cmd-vivo ' + classe; e.hidden = false; clearTimeout(e._t); }
function ocultarCmdVivo(depois = 0) { const e = $('cmd-vivo'); if (!e) return; clearTimeout(e._t); if (depois) e._t = setTimeout(() => { e.hidden = true; }, depois); else e.hidden = true; }
function aoRotearComando(d, seg) {
  if (seg && normal(seg.texto) === normal(d.ultima)) {
    seg.tipo = d.tipo; seg.alvo = d.alvo;
    mostrarFala();
    if (d.tipo === 'outra') { ocultarCmdVivo(); return; }
    enfileirarComando({ texto: seg.texto, tipo: d.tipo, alvo: d.alvo, p: d.p_tipo, pAlvo: d.p_alvo });
  } else if (d.tipo !== 'outra') {
    mostrarCmdVivo(`${ic('alvo')}Ouvindo um comando para <b>${esc(ROT_ALVO[d.alvo] || d.alvo)}</b>… <span class="dim">Jev ${fmt.pct(d.p_tipo)}</span>`, 'ouvindo');
  }
}
async function rotearSeg(seg) {
  seg.roteando = true;
  let d;
  try { d = await window.JevKit.api('/api/rota', { ultima: seg.texto, exemplo: S.exemplo || undefined }, { label: '🎯 Roteador', silent: true }); }
  catch { d = { tipo: 'descrever_negocio', p_tipo: 0 }; }
  seg.roteando = false;
  if (!S.segs.includes(seg)) return; // a fala foi trocada enquanto isso
  const eComando = (TIPOS_COMANDO.includes(d.tipo) && d.p_tipo >= 0.55) || (d.tipo === 'outra' && d.p_tipo >= 0.8);
  const antes = seg.otimista;
  if (eComando) {
    seg.tipo = d.tipo; seg.alvo = d.alvo; mostrarFala();
    if (d.tipo !== 'outra') enfileirarComando({ texto: seg.texto, tipo: d.tipo, alvo: d.alvo, p: d.p_tipo, pAlvo: d.p_alvo });
    if (antes) { S.ultimoEnviado = ''; agendar(); } // tinha entrado na descrição por engano: refaz sem ela
  } else {
    seg.tipo = 'descricao'; mostrarFala();
    if (!antes) { S.ultimoEnviado = ''; agendar(); }
  }
}
function enfileirarComando(c) { S.filaCmd = S.filaCmd.then(() => executarComando(c)).catch((e) => console.warn(e)); }

// escolhas de hoje de uma peça (posts vêm da decisão conjunta formato × gancho do contexto)
function selecaoAlvo(alvo, ctx = ultimoCtx) {
  const O = oEf(), out = {};
  for (const q of ALVOS[alvo] || []) {
    let v = escolha(S.R, O, q);
    const m = /^p([123])_(fmt|hook|bg)$/.exec(q);
    if (m && ctx && ctx.posts[+m[1] - 1]) { const P = ctx.posts[+m[1] - 1]; v = m[2] === 'fmt' ? P.fmt : m[2] === 'hook' ? P.gancho.id : P.bg; }
    if (ctx && q === 'em_tipo') v = ctx.email.tipo.id;
    if (ctx && q === 'em_assunto') v = ctx.email.assuntoOpcao.id;
    if (ctx && q === 'ad_conceito') v = ctx.anuncios.conceito.id;
    if (ctx && q === 'ad_titulo') v = ctx.anuncios.tituloOpcao.id;
    if (v != null) out[q] = v;
  }
  return out;
}
function selecao(ctx = ultimoCtx) { const out = {}; for (const a of Object.keys(ALVOS)) Object.assign(out, selecaoAlvo(a, ctx)); for (const q of ['seg', 'pers']) { const v = escolha(S.R, oEf(), q); if (v != null) out[q] = v; } return out; }
function rotulosAlvo(alvo) { const out = {}; for (const [q, v] of Object.entries(selecaoAlvo(alvo))) out[q] = typeof v === 'number' ? String(v) : rotuloOpcao(q, v); return out; }
function travarAlvo(alvo, motivo) {
  const atual = selecaoAlvo(alvo);
  for (const q of ALVOS[alvo] || []) if (S.T[q] == null && atual[q] != null) S.T[q] = atual[q];
  S.travas[alvo] = { motivo, t: Date.now() };
}
function destravarAlvo(alvo) {
  for (const q of ALVOS[alvo] || []) delete S.T[q];
  delete S.travas[alvo];
  render('destravar');
  toast(`🔓 ${cap(ROT_ALVO[alvo])} destravado: volta a seguir a sua fala.`, 'ok');
  versao({ motivo: 'destravar', alvo, rotulo: `🔓 ${ROT_ALVO[alvo]} destravado` });
}
function acenderAlvo(alvo) { const id = { marca: 'painel-marca', site: 'painel-site', posts: 'painel-posts', email: 'painel-email', ads: 'painel-ads' }[PAINEL_ALVO[alvo]]; if (id) acender($(id)); }
function renderTravas() {
  const por = { marca: [], site: [], posts: [], email: [], ads: [] };
  for (const [alvo, t] of Object.entries(S.travas)) if (por[PAINEL_ALVO[alvo]]) por[PAINEL_ALVO[alvo]].push([alvo, t]);
  // os ajustes de estilo ativos: uma fita em cada monitor que o ajuste muda, logo abaixo da trava
  const aj = { site: [], posts: [], email: [], ads: [] };
  for (const a of S.ajustes) for (const x of a.pecas) aj[TV_PECA[x]].push(a);
  for (const [painel, lista] of Object.entries(por)) {
    const e = $('tv-' + painel); if (!e) continue;
    // 3 ou mais travas no mesmo painel (só a identidade chega lá) viram um grupo numa linha, para não cobrir o logo
    const html = (lista.length >= 3
      ? `<span class="trava-grupo" title="Travados: o que você falar depois não muda estas peças. Clique numa delas para destravar.">${ic('cadeado')}${lista.map(([alvo]) => `<button type="button" class="trava-chip trava-chip--mini" data-alvo="${alvo}" title="Destravar ${esc(ROT_ALVO[alvo])}">${esc(ROT_ALVO[alvo])}</button>`).join('<i>·</i>')}</span>`
      : lista.map(([alvo, t]) => `<button type="button" class="trava-chip" data-alvo="${alvo}" title="Travado (${esc(t.motivo)}): o que você falar depois não muda isso. Clique para destravar.">${ic('cadeado')}${esc(ROT_ALVO[alvo])} <span>✕</span></button>`).join(''))
      + fitasAjustes(aj[painel] || [], painel);
    if (e._html !== html) {
      const foco = e.contains(document.activeElement) && document.activeElement.classList.contains('aj-x'); // ✕ tirado pelo teclado: o foco segue na fita
      e.innerHTML = html; e._html = html;
      if (foco) { const x = e.querySelector('.aj-x') || e.querySelector('.trava-chip'); if (x) x.focus({ preventScroll: true }); }
    }
  }
}

// corpo do /api/comando: a descrição e as cores da paleta de hoje (o servidor resolve "cor da marca" com elas)
function coresMarca(ctx = ultimoCtx) {
  const c = (ctx && ctx.marca && ctx.marca.cores) || {}, out = {};
  for (const k of ['bg', 'surf', 'ink', 'muted', 'pri', 'sec', 'acc']) if (typeof c[k] === 'string' && HEX.test(c[k])) out[k] = c[k];
  return out;
}
const pedirComando = (corpo) => window.JevKit.api('/api/comando', { ...corpo, descricao: descricaoTexto(false), marca: { cores: coresMarca() } }, { label: '🎯 Comando', silent: true });
// as novas escolhas do Jev para a peça ("manter" não muda nada); a resposta também traz as perguntas do ajuste, que ficam de fora
function aplicarEscolhas(resp, alvo) {
  const mud = [], qs = ALVOS[alvo] || [];
  for (const [q, a] of Object.entries(resp.answers || {})) {
    if (qs.includes(q) && a && a.choice && a.choice !== 'manter') { S.T[q] = a.choice; mud.push({ q, id: a.choice, p: (a.probabilities || {})[a.choice] || 0 }); }
  }
  return mud;
}

async function executarComando({ texto, tipo, alvo, p, pAlvo }) {
  if (!S.R.marca) return;
  let resp = null;
  if (!tipo || !alvo) { // comando digitado: o servidor roteia e já decide a peça e os ajustes numa ida só (vão as escolhas de hoje de todas as peças; o servidor filtra pelo alvo)
    mostrarCmdVivo(`${ic('alvo')}Entendendo “${esc(texto)}”…`, 'executando');
    try { resp = await pedirComando({ comando: texto, atuais: Object.assign({}, ...Object.keys(ALVOS).map(rotulosAlvo)) }); }
    catch (e) { mostrarCmdVivo(`${ic('alerta')}${esc(e.message)}`, 'erro'); ocultarCmdVivo(4000); return; }
    tipo = resp.tipo; alvo = resp.alvo; p = resp.p_tipo; pAlvo = resp.p_alvo;
    const comAjuste = ajustesDe(resp).length > 0;
    if (comAjuste && !TIPOS_COMANDO.includes(tipo)) tipo = 'comando_de_edicao'; // pedido de estilo nunca entra na descrição
    const seg = { texto, tipo: tipo === 'descrever_negocio' ? 'descricao' : tipo, alvo, digitado: true };
    S.sessaoSegs.push(seg); S.segs = S.base.concat(S.sessaoSegs); mostrarFala();
    if (tipo === 'descrever_negocio') { ocultarCmdVivo(); toast('📝 Isso parece descrição do negócio — entrou na descrição e tudo foi refeito.'); agendar(true); return; }
    if (tipo === 'outra') { mostrarCmdVivo(`${ic('balao')}Não parece um pedido de mudança.`, 'erro'); ocultarCmdVivo(3000); return; }
    if (tipo === 'comando_de_edicao' && ALVOS[alvo] && !resp.answers && !comAjuste) resp = null; // falta a decisão da peça: pede de novo abaixo
  }
  const nome = ROT_ALVO[alvo] || alvo;
  if (tipo === 'comando_de_edicao' && !resp) {
    // voz: a peça e os ajustes livres numa ida só. Com alvo "tudo" ou "nenhum" o servidor ainda pode achar um ajuste de estilo
    // ("todas as fontes em caixa alta"): por isso ele é chamado ANTES de decidir refazer tudo
    mostrarCmdVivo(ALVOS[alvo] ? `${ic('alvo')}Mudando <b>${esc(nome)}</b>: “${esc(texto)}”…` : `${ic('alvo')}Entendendo “${esc(texto)}”…`, 'executando');
    await versao({ motivo: 'fala' }); // garante a versão de antes do comando (não duplica se já existe)
    try { resp = await pedirComando({ comando: texto, tipo, alvo, atuais: rotulosAlvo(alvo) }); }
    catch (e) {
      if (alvo !== 'tudo') { mostrarCmdVivo(`${ic('alerta')}Não consegui aplicar: ${esc(e.message)}`, 'erro'); ocultarCmdVivo(5000); return; }
      resp = null; // sem resposta, "tudo" segue como antes: refaz tudo com o pedido
    }
  }
  const novos = ajustesDe(resp);
  if (novos.length) { await aplicarAjustes(novos, { texto, alvo, resp }); return; } // estilo livre: aplica por cima, sem refazer nada
  if (alvo === 'tudo' && tipo === 'comando_de_edicao') { // estilo geral sem ajuste possível: vira descrição e refaz tudo (travas continuam valendo)
    const seg = [...S.segs].reverse().find((x) => x.texto === texto); if (seg) seg.tipo = 'descricao';
    mostrarFala(); mostrarCmdVivo(`${ic('alvo')}Estilo geral: refazendo tudo com o seu pedido`, 'feito'); ocultarCmdVivo(3500);
    S.ultimoEnviado = ''; agendar(true); return;
  }
  if (!ALVOS[alvo]) { mostrarCmdVivo(`${ic('alvo')}Entendi um pedido, mas não qual peça mudar. Diga “muda o logo…”, “troca as cores…”, “os posts…”.`, 'erro'); ocultarCmdVivo(5000); return; }
  if (tipo === 'fixar') {
    travarAlvo(alvo, 'fixado por você'); render('trava'); acenderAlvo(alvo);
    mostrarCmdVivo(`${ic('cadeado')}<b>${esc(cap(nome))}</b> fixado: o que você falar depois não muda isso.`, 'feito'); ocultarCmdVivo(4500);
    versao({ motivo: 'fixar', alvo, rotulo: `🔒 “${texto}”` }); return;
  }
  if (tipo === 'desfazer') { await versao({ motivo: 'fala' }); await desfazerAlvo(alvo, texto); return; }
  if (!resp) return;
  // biblioteca ("troca por outra opção pronta"): o Jev reescolhe as opções da peça, com "manter", e a peça fica travada
  mostrarCmdVivo(`${ic('alvo')}Mudando <b>${esc(nome)}</b>: “${esc(texto)}”…`, 'executando');
  await versao({ motivo: 'fala' }); // garante a versão de antes do comando (não duplica se já existe)
  const mud = aplicarEscolhas(resp, alvo);
  travarAlvo(alvo, 'seu comando');
  render('comando'); acenderAlvo(alvo);
  const txt = mud.length ? mud.slice(0, 4).map((m) => `${esc(META[m.q].rotulo)}: <b>${esc(rotuloOpcao(m.q, m.id))}</b> <span class="dim">${fmt.pct(m.p)}</span>`).join(' · ') : 'o Jev achou que já estava assim';
  mostrarCmdVivo(`${ic('alvo')}<b>${esc(cap(nome))}</b> → ${txt} · ${ic('cadeado')}`, 'feito'); ocultarCmdVivo(6500);
  versao({ motivo: 'comando', alvo, rotulo: `🎯 “${texto}”` });
}
// os ajustes que fazem parte de um alvo do roteador: os da peça; nas fontes, os das letras; nas cores, os de cor
const PROPS_LETRA = ['caixa', 'tamanho', 'peso', 'espaco', 'cor_texto', 'sombra', 'italico', 'alinhamento'];
function ajusteDoAlvo(alvo) {
  if (PECAS_AJUSTE.includes(alvo)) return (a) => a.pecas.includes(alvo);
  if (alvo === 'fontes') return (a) => PROPS_LETRA.includes(a.prop);
  if (alvo === 'cores') return (a) => a.prop === 'fundo' || a.prop === 'cor_texto';
  return null;
}
const receitas = new Map(); // receitas já lidas nesta sessão (o desfazer por voz compara os ajustes de cada versão)
function receitaCache(vid) {
  const k = V.id + '/' + vid;
  if (!receitas.has(k)) receitas.set(k, receitaDe(vid).catch((e) => { receitas.delete(k); throw e; }));
  return receitas.get(k);
}
// "volta X de antes": a versão mais recente em que X era diferente — nas escolhas da biblioteca ou nos ajustes de X
async function desfazerAlvo(alvo, texto) {
  const nome = ROT_ALVO[alvo] || alvo, qs = ALVOS[alvo] || [], toca = ajusteDoAlvo(alvo);
  const selDe = (sel) => JSON.stringify(qs.map((q) => sel[q]));
  const ajDe = (lista) => JSON.stringify(lista.filter(toca).map((a) => [a.id, a.valor]));
  const atual = selDe(selecaoAlvo(alvo));
  const comAjustes = !!toca && (S.ajustes.some(toca) || V.lista.some((v) => v.motivo === 'ajuste')); // sem ajuste no projeto, nem lê receitas
  const atualAj = comAjustes ? ajDe(S.ajustes) : '';
  let ant = null, ajAnt = null;
  for (const v of [...V.lista].reverse()) {
    const difSel = v.sel && qs.some((q) => v.sel[q] != null) && selDe(v.sel) !== atual;
    let aj = null;
    if (comAjustes) { try { aj = ajustesValidos((await receitaCache(v.id)).ajustes).filter(toca); } catch { /* sem a receita: vale só a biblioteca */ } }
    if (difSel || (aj && ajDe(aj) !== atualAj)) { ant = v; ajAnt = aj; break; }
  }
  if (!ant) { mostrarCmdVivo(`${ic('desfazer')}Não achei uma versão anterior diferente de <b>${esc(nome)}</b>.`, 'erro'); ocultarCmdVivo(4500); return; }
  const mudouSel = !!ant.sel && qs.some((q) => ant.sel[q] != null) && selDe(ant.sel) !== atual;
  if (mudouSel) {
    for (const q of qs) if (ant.sel[q] != null) S.T[q] = ant.sel[q];
    S.travas[alvo] = { motivo: `voltou para a v${ant.n}`, t: Date.now() };
  }
  const pecasAj = ajAnt ? pecasDe([...S.ajustes.filter(toca), ...ajAnt]) : [];
  if (ajAnt) S.ajustes = S.ajustes.filter((a) => !toca(a)).concat(ajAnt);
  render('desfazer'); acenderAlvo(alvo); acenderPecas(pecasAj);
  mostrarCmdVivo(`${ic('desfazer')}<b>${esc(cap(nome))}</b> de volta como na <b>v${ant.n}</b>${mudouSel ? ` · ${ic('cadeado')}` : ''}`, 'feito'); ocultarCmdVivo(5000);
  versao({ motivo: 'desfazer', alvo, rotulo: `↩ “${texto}” (v${ant.n})` });
}

// ------------------------------------------------------------------ versões: cada estado vira uma receita guardada no servidor
const V = { id: null, criando: null, lista: [], ultimaSig: '', timer: 0 };
function novoProjeto() { V.id = null; V.criando = null; V.lista = []; V.ultimaSig = ''; clearTimeout(V.timer); renderVersoes(); if (new URLSearchParams(location.search).get('projeto')) history.replaceState(null, '', location.pathname); }
async function garantirProjeto() {
  if (V.id) return V.id;
  if (!V.criando) V.criando = window.JevKit.api('/api/projetos', { nome: ultimoCtx ? ultimoCtx.nome : '' }, { silent: true }).then((r) => { V.id = r.id; history.replaceState(null, '', `?projeto=${r.id}`); return r.id; }).finally(() => { V.criando = null; });
  return V.criando;
}
function compactarR(R) {
  const out = {};
  for (const [g, ans] of Object.entries(R || {})) {
    out[g] = {};
    for (const [q, a] of Object.entries(ans || {})) {
      const c = { ...a };
      if (a && a.probabilities) { c.probabilities = {}; for (const [k, v] of Object.entries(a.probabilities)) if (v >= 0.0005) c.probabilities[k] = Math.round(v * 10000) / 10000; }
      out[g][q] = c;
    }
  }
  return out;
}
function agendarVersao(motivo, extra = {}) { clearTimeout(V.timer); V.timer = setTimeout(() => versao({ motivo, ...extra }), 900); }
function ultimaFrase() { const x = [...S.segs].reverse().find((y) => y.tipo === 'descricao'); return x ? x.texto : descricaoTexto(false); }
// o que distingue um estado de outro (uma fala que não mudou nada não vira versão nova)
const assinaturaEstado = (sel, ctx) => JSON.stringify([sel, S.nomeManual, Object.keys(S.ia).sort(), Object.keys(S.travas).sort(), ctx ? ctx.nome : '', S.ajustes.map((a) => [a.id, a.valor])]);
async function versao({ motivo, alvo = '', rotulo = '' }) {
  const ctx = ultimoCtx;
  if (!ctx || !S.R.marca || !S.R.site) return;
  const sel = selecao(ctx);
  const sig = assinaturaEstado(sel, ctx);
  if (sig === V.ultimaSig && ['fala', 'versao', 'ia'].includes(motivo)) return;
  V.ultimaSig = sig;
  let id;
  try { id = await garantirProjeto(); } catch { return; }
  const c = ctx.marca.cores;
  const receita = { v: 1, R: compactarR(S.R), O: S.O, T: S.T, travas: S.travas, texto: descricaoTexto(false), nomeManual: S.nomeManual, ia: S.ia, agora: S.agora.toISOString(), ajustes: S.ajustes };
  const resumo = { nome: ctx.nome, seg: ctx.pack.label, cores: [c.pri, c.sec, c.acc, c.bg, c.ink], fonte: ctx.marca.f.nome, paleta: ctx.marca.paleta.rotulo, titulo: ctx.site.titulo };
  const rot = rotulo || `🎙️ “${ultimaFrase().slice(0, 90)}${ultimaFrase().length > 90 ? '…' : ''}”`;
  try {
    const r = await window.JevKit.api(`/api/projetos/${id}/versoes`, { motivo, alvo, rotulo: rot, resumo, sel, receita, logo_svg: logoSVG(ctx, { classe: 'logo-v' }) }, { silent: true });
    V.lista.push(r.versao);
    renderVersoes(true);
  } catch { /* guardar versão é bônus: se falhar, o estúdio segue */ }
}
function quando(t) { const d = new Date(t); return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function renderVersoes(nova = false) {
  const b = $('b-versoes'); if (b) b.innerHTML = `${ic('versoes')}<span>Versões</span>${V.lista.length ? `<b>${V.lista.length}</b>` : ''}`;
  if (nova && b) { b.classList.remove('nova'); void b.offsetWidth; b.classList.add('nova'); }
  const corpo = $('vs-corpo');
  if (!corpo || !$('versoes').classList.contains('aberto')) return;
  $('vs-resumo').textContent = V.lista.length ? `${V.lista.length} versões · projeto ${V.id}` : 'nenhuma versão ainda';
  if (!V.lista.length) { corpo.innerHTML = '<p class="vs-vazio">Fale, simule uma fala ou dê um comando: cada estado criado fica guardado aqui para voltar depois.</p>'; return; }
  const pecas = ['logo', 'cores', 'fontes', 'site', 'posts', 'email', 'anuncios'];
  corpo.innerHTML = [...V.lista].reverse().map((v) => {
    const cores = (v.resumo && v.resumo.cores) || [];
    return `<div class="vs-item m-${esc(v.motivo)}" data-v="${v.id}">
      <div class="vs-top"><b>v${v.n}</b><span class="vs-t">${quando(v.t)}</span>${v.alvo ? `<span class="vs-alvo">${esc(ROT_ALVO[v.alvo] || v.alvo)}</span>` : ''}</div>
      <div class="vs-rot">${esc(v.rotulo)}</div>
      <div class="vs-vis"><div class="vs-logo" data-logo="${v.id}" style="background:${esc(cores[3] || '#fff')}">${v.logo ? '' : '—'}</div><div class="vs-cores">${cores.map((h) => `<i style="background:${esc(h)}"></i>`).join('')}</div></div>
      <div class="vs-acoes"><button type="button" data-acao="tudo">${ic('desfazer')}Tudo</button>${pecas.map((a) => `<button type="button" data-acao="${a}" title="Traz só ${esc(ROT_ALVO[a])} desta versão (e trava)">${esc(ROT_ALVO[a])}</button>`).join('')}<button type="button" data-acao="baixar-site" title="Baixa o site desta versão">${ic('baixar')}site</button><button type="button" data-acao="baixar-logo" title="Baixa o logo desta versão em SVG">${ic('baixar')}logo</button></div>
    </div>`;
  }).join('');
  carregarLogos();
}
const logoCache = new Map();
// o SVG da miniatura vem do servidor: só entra na página depois de passar por uma lista fechada de elementos e atributos
const SVG_OK = new Set(['svg', 'g', 'defs', 'title', 'desc', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'filter', 'feTurbulence', 'feColorMatrix', 'feDisplacementMap', 'feComposite',
  'feGaussianBlur', 'feOffset', 'feFlood', 'feBlend', 'feMerge', 'feMergeNode']);
function svgSeguro(txt) {
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const raiz = doc.documentElement;
  if (!raiz || raiz.nodeName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  const limpar = (el) => {
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase(), v = a.value;
      if (n.startsWith('on') || /javascript:|data:/i.test(v) || (/(^|:)href$/.test(n) && !v.startsWith('#')) || /url\(\s*['"]?(?!#)/i.test(v)) el.removeAttribute(a.name);
    }
    for (const f of [...el.children]) { if (SVG_OK.has(f.nodeName)) limpar(f); else f.remove(); }
  };
  limpar(raiz);
  return document.importNode(raiz, true);
}
async function carregarLogos() {
  for (const el2 of document.querySelectorAll('#vs-corpo .vs-logo[data-logo]')) {
    const vid = el2.dataset.logo, meta = V.lista.find((v) => v.id === vid);
    if (!meta || !meta.logo) continue;
    const chave = V.id + '/' + vid;
    let svg = logoCache.get(chave);
    if (!svg) { try { const r = await fetch(`/api/projetos/${V.id}/versoes/${vid}/logo`); if (!r.ok) continue; svg = await r.text(); logoCache.set(chave, svg); } catch { continue; } }
    const no = svgSeguro(svg);
    if (no) el2.replaceChildren(no);
  }
}
async function receitaDe(vid) { const r = await window.JevKit.api(`/api/projetos/${V.id}/versoes/${vid}`, undefined, { silent: true }); return r.receita; }
function ctxDaReceita(rc) {
  const ctx = montar({ R: rc.R, O: { ...(rc.O || {}), ...(rc.T || {}) }, texto: rc.texto || '', nomeManual: rc.nomeManual || '', ia: rc.ia || {}, agora: new Date(rc.agora || Date.now()) });
  ctx.ajustes = ajustesValidos(rc.ajustes); // o site baixado de uma versão vem com os ajustes daquela versão
  return ctx;
}
function aplicarReceita(rc) {
  pararEntradas();
  S.gen++;
  if (S.ctrl) try { S.ctrl.abort(); } catch { /* ok */ }
  Object.assign(S, { R: rc.R || {}, O: rc.O || {}, T: rc.T || {}, travas: rc.travas || {}, nomeManual: rc.nomeManual || '', ia: rc.ia || {}, agora: new Date(rc.agora || Date.now()), ajustes: ajustesValidos(rc.ajustes),
    final: rc.texto || '', parcial: '', base: [], sessaoSegs: rc.texto ? [{ texto: rc.texto, tipo: 'descricao' }] : [], sessaoConhecido: '', origem: 'versao', voando: false, pendente: false, ultimoEnviado: '' });
  S.segs = S.base.concat(S.sessaoSegs);
  $('nome').value = S.nomeManual || '';
  mostrarFala();
  render('versao');
  PAINEIS.forEach((id2) => acender($(id2)));
}
async function acaoVersao(vid, acao) {
  const meta = V.lista.find((v) => v.id === vid); if (!meta) return;
  try {
    if (acao === 'tudo') {
      aplicarReceita(await receitaDe(vid));
      toast(`↩ Tudo como na v${meta.n}.`, 'ok');
      versao({ motivo: 'restaurar', rotulo: `↩ tudo como na v${meta.n}` });
    } else if (ALVOS[acao]) {
      // a peça como era naquela versão: as escolhas da biblioteca e, se o projeto usa ajustes, os ajustes dela
      const toca = ajusteDoAlvo(acao);
      const aj = toca && (S.ajustes.some(toca) || V.lista.some((v) => v.motivo === 'ajuste')) ? ajustesValidos((await receitaCache(vid)).ajustes).filter(toca) : null;
      for (const q of ALVOS[acao]) if (meta.sel && meta.sel[q] != null) S.T[q] = meta.sel[q];
      if (aj) S.ajustes = S.ajustes.filter((a) => !toca(a)).concat(aj);
      S.travas[acao] = { motivo: `da v${meta.n}`, t: Date.now() };
      render('restaurar'); acenderAlvo(acao);
      toast(`↩ ${cap(ROT_ALVO[acao])} da v${meta.n} aplicado e travado.`, 'ok');
      versao({ motivo: 'restaurar', alvo: acao, rotulo: `↩ ${ROT_ALVO[acao]} da v${meta.n}` });
    } else if (acao === 'baixar-site') {
      const ctx = ctxDaReceita(await receitaDe(vid));
      const html = await htmlParaBaixar(ctx);
      baixarArquivo(html, `site-${ctx.handle}-v${meta.n}.html`, 'text/html');
    } else if (acao === 'baixar-logo') {
      const ctx = ctxDaReceita(await receitaDe(vid));
      baixarArquivo(await logoParaBaixar(ctx), `logo-${ctx.handle}-v${meta.n}.svg`, 'image/svg+xml');
    }
  } catch (e) { toast(`Não consegui abrir a v${meta.n}: ${e.message}`, 'err'); }
}
async function logoParaBaixar(ctx) {
  let css = '';
  for (const k of [...(ctx.marca.f.emb || []), ...(ctx.marca.fontesExtras || [])]) for (const f of FONTES_EMB[k] || []) css += `@font-face{font-family:"${f.family}";src:url("${await dataURI('fonts/' + f.file)}") format("woff2");font-weight:${f.weight};font-style:${f.style}}`;
  const svg = logoSVG(ctx, { classe: 'logo' });
  return svg.replace(/^<svg([^>]*)>/, (m, a) => `<svg${/xmlns=/.test(a) ? '' : ' xmlns="http://www.w3.org/2000/svg"'}${a}><style>${css}</style>`);
}
function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = el('a', { href: url, download: nome }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  toast(`⬇️ ${nome}`, 'ok');
}
async function abrirVersoes() {
  $('versoes').classList.add('aberto'); $('versoes').setAttribute('aria-hidden', 'false'); $('vs-fundo').classList.add('aberto');
  renderVersoes();
  try {
    const r = await window.JevKit.api('/api/projetos', undefined, { silent: true });
    const outros = (r.projetos || []).filter((x) => x.id !== V.id).slice(0, 12);
    $('vs-projetos').innerHTML = outros.length ? `<div class="vs-ptit">Projetos anteriores</div>` + outros.map((x) => `<button type="button" class="vs-proj" data-proj="${x.id}" title="Abrir a última versão deste projeto">${(x.cores || []).slice(0, 3).map((h) => `<i style="background:${esc(h)}"></i>`).join('')}<b>${esc(x.nome || 'sem nome')}</b><span>${esc(x.seg || '')} · ${x.n} versões</span></button>`).join('') : '';
  } catch { $('vs-projetos').innerHTML = ''; }
}
function fecharVersoes() { soltarFoco($('versoes'), 'b-versoes'); $('versoes').classList.remove('aberto'); $('versoes').setAttribute('aria-hidden', 'true'); $('vs-fundo').classList.remove('aberto'); }
async function abrirProjeto(id, silencioso = false) {
  try {
    const r = await window.JevKit.api(`/api/projetos/${id}`, undefined, { silent: true });
    const pj = r.projeto;
    if (!pj.versoes.length) throw new Error('projeto vazio');
    novaFala();
    V.id = pj.id; V.lista = pj.versoes;
    history.replaceState(null, '', `?projeto=${pj.id}`);
    const ult = pj.versoes[pj.versoes.length - 1];
    aplicarReceita(await receitaDe(ult.id));
    V.ultimaSig = assinaturaEstado(selecao(), ultimoCtx);
    renderVersoes();
    if (!silencioso) toast(`📂 ${pj.nome || 'Projeto'}: v${ult.n} de ${pj.versoes.length}.`, 'ok');
  } catch (e) { toast(`Não consegui abrir o projeto: ${e.message}`, 'err'); }
}

// ------------------------------------------------------------------ ganchos para o teste e2e
function expor(ctx) {
  window.estudio = window.estudio || {};
  const E = (q) => escolha(S.R, oEf(), q);
  window.estudio.ultimo = {
    seg: ctx.segId, pers: ctx.pers.id, pub: ctx.pub.id, obj: ctx.obj.id, preco: ctx.precoNivel, dif: ctx.dif,
    paleta: ctx.marca.paleta.id, fonte: ctx.marca.fonte.id, icone: ctx.icone.id, forma: ctx.marca.forma, disp: ctx.marca.disp, slogan: ctx.marca.slogan,
    hero: ctx.site.hero, titulo: ctx.site.titulo, cta: ctx.site.cta.id, img: ctx.site.img, btn: ctx.site.btn, secoes: ctx.site.secoes, selos: ctx.site.selos,
    posts: ctx.posts.map((P) => ({ fmt: P.fmt, hook: P.hook, gancho: P.gancho.id, bg: P.bg, legenda: P.legenda })),
    carEstilo: ctx.carEstilo.id, oferta: ctx.oferta ? ctx.oferta.id : null,
    email: { tipo: ctx.email.tipo.id, assunto: ctx.email.assunto, preheader: ctx.email.preheader, cabecalho: ctx.email.cabecalho, hero: ctx.email.hero, blocos: ctx.email.blocos, cta: ctx.email.cta.texto, ass: { ...ctx.email.ass } },
    anuncios: { conceito: ctx.anuncios.conceito.id, titulo: ctx.anuncios.titulo, estilo: ctx.anuncios.estilo, cta: ctx.anuncios.cta.texto, selo: ctx.anuncios.selo, fundo: ctx.anuncios.fundo, anim: ctx.anuncios.anim },
    nome: ctx.nome, origemNome: ctx.origemNome, cidade: ctx.cidade ? ctx.cidade.nome : null, overrides: Object.keys(S.O).length, ia: { ...S.ia },
    travas: { ...S.T }, pecasTravadas: Object.keys(S.travas), caixa: ctx.marca.caixa, estiloLogo: ctx.marca.estilo || null,
    raw: { hero: E('hero'), paleta: E('paleta') },
  };
}
window.estudio = {
  get estado() { return { atualizacoes: S.atualizacoes, atualizacoesFala: S.atualizacoesFala, voando: S.voando, pendente: S.pendente, ultimo: S.ultimo, historico: S.historico.slice(-40), grupos: Object.keys(S.R), escrevendo: !!(S.escrita && S.escrita.ativa), simulando: !!(S.sim && S.sim.ativo), microfone: mic.ligado, texto: textoAtual(), origem: S.origem }; },
  htmlSite: () => (ultimoCtx ? htmlParaBaixar() : null),
  get versoes() { return { projeto: V.id, n: V.lista.length, lista: V.lista.map((v) => ({ id: v.id, n: v.n, motivo: v.motivo, alvo: v.alvo, rotulo: v.rotulo })) }; },
  get trechos() { return S.segs.map((x) => ({ texto: x.texto, tipo: x.tipo, alvo: x.alvo || null })); },
  get ajustes() { return JSON.parse(JSON.stringify(S.ajustes)); },
  // sem tipo/alvo = comando digitado (o servidor roteia); com tipo/alvo = caminho da voz (como se o roteador tivesse decidido)
  comando: (t, tipo, alvo) => enfileirarComando(tipo && alvo ? { texto: t, tipo, alvo, p: 1, pAlvo: 1 } : { texto: t }),
  forcar: (q, id) => { S.T[q] = id; render('teste'); return ultimoCtx && ultimoCtx.marca.estilo; }, // gancho de teste
  soltar: (q) => { delete S.T[q]; render('teste'); },
  get filaComandos() { return S.filaCmd; },
};

// ------------------------------------------------------------------ eventos
function ligar() {
  $('mic').addEventListener('click', clicarMic);
  $('b-versao').addEventListener('click', outraVersao);
  $('b-voltar').addEventListener('click', () => { S.O = {}; $('b-voltar').hidden = true; render('versao'); toast('↺ De volta às escolhas mais prováveis do Jev.'); });
  $('b-raiox').addEventListener('click', () => ($('raiox').classList.contains('aberto') ? fecharRaioX() : abrirRaioX()));
  $('b-versoes').addEventListener('click', () => ($('versoes').classList.contains('aberto') ? fecharVersoes() : abrirVersoes()));
  $('vs-fechar').addEventListener('click', fecharVersoes);
  $('vs-fundo').addEventListener('click', fecharVersoes);
  $('vs-corpo').addEventListener('click', (e) => { const b = e.target.closest('button[data-acao]'); if (!b) return; acaoVersao(b.closest('[data-v]').dataset.v, b.dataset.acao); });
  $('vs-projetos').addEventListener('click', (e) => { const b = e.target.closest('[data-proj]'); if (b) { fecharVersoes(); abrirProjeto(b.dataset.proj); } });
  $('b-novo').addEventListener('click', () => { pararEntradas(); novaFala(); document.querySelectorAll('#chips .jev-chip').forEach((c) => c.classList.remove('active')); toast('Novo negócio: fale ou simule. O projeto anterior fica guardado em Versões.'); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.trava-chip'); if (b) destravarAlvo(b.dataset.alvo);
    const x = e.target.closest('.aj-x'); if (x) removerAjuste(x.dataset.id);
  });
  $('cmd-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = normal($('cmd').value);
    if (palavras(t) < 2) { toast('Escreva o ajuste, ex.: “muda o logo pra ficar tipo selo de cervejaria”.'); $('cmd').focus(); return; }
    if (!S.R.marca) { toast('Crie algo primeiro: fale, simule uma fala ou digite a descrição do negócio.'); return; }
    $('cmd').value = '';
    enfileirarComando({ texto: t });
  });
  $('rx-fechar').addEventListener('click', fecharRaioX);
  $('rx-fundo').addEventListener('click', fecharRaioX);
  $('b-ia').addEventListener('click', escreverComIA);
  $('b-baixar').addEventListener('click', baixarSite);
  $('b-amp-posts').addEventListener('click', () => ampliarPeca('posts'));
  $('b-amp-email').addEventListener('click', () => ampliarPeca('email'));
  $('b-amp-ads').addEventListener('click', () => ampliarPeca('anuncios'));
  $('b-email-html').addEventListener('click', baixarEmail);
  $('b-ass-copiar').addEventListener('click', copiarAssinatura);
  $('b-ads-baixar').addEventListener('click', baixarAnuncios);
  $('mp-fechar').addEventListener('click', fecharAmpliado);
  $('modal-peca').addEventListener('mousedown', (e) => { if (e.target.id === 'modal-peca') fecharAmpliado(); });
  $('b-ampliar').addEventListener('click', ampliar);
  $('modal-fechar').addEventListener('click', () => { $('modal-site').hidden = true; });
  $('modal-baixar').addEventListener('click', baixarSite);
  $('modal-site').addEventListener('mousedown', (e) => { if (e.target.id === 'modal-site') $('modal-site').hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('modal-site').hidden = true; fecharAmpliado(); fecharRaioX(); fecharVersoes(); } });
  let tNome;
  $('nome').addEventListener('input', () => { clearTimeout(tNome); tNome = setTimeout(() => { S.nomeManual = $('nome').value.replace(/\s+/g, ' ').trim().slice(0, 32); render('nome'); }, 160); });
  let tTexto;
  $('texto').addEventListener('input', () => {
    clearTimeout(tTexto);
    tTexto = setTimeout(() => {
      const t = $('texto').value.replace(/\s+/g, ' ').trim();
      if (S.origem !== 'texto') { pararEntradas(); novaFala(); document.querySelectorAll('#chips .jev-chip').forEach((c) => c.classList.remove('active')); }
      aoFalar(t.slice(0, 3000), '', 'texto');
    }, 350);
  });
  $('digitar').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('texto').value.replace(/\s+/g, ' ').trim();
    if (palavras(t) < 2) { toast('Escreva pelo menos algumas palavras sobre o seu negócio.'); $('texto').focus(); return; }
    if (S.origem !== 'texto') { pararEntradas(); novaFala(); }
    aoFalar(t.slice(0, 3000), '', 'texto'); // monta o trecho de descrição; sem isso o ?texto= (valor sem evento input) não gerava nada
    agendar(true);
  });
  $('texto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('digitar').requestSubmit(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (S.sim && S.sim.ativo) S.sim.pausar(); if (mic.ligado) { mic.desligar(true); toast('Microfone desligado enquanto a aba estava em segundo plano.'); } }
    else if (S.sim) S.sim.continuar();
  });
  const ro = new ResizeObserver(() => ajustarEscala());
  ro.observe($('site-vp'));
  window.addEventListener('resize', ajustarEscala);
  $('posts-grid').addEventListener('click', (e) => { const l = e.target.closest('.ig-leg'); if (l) l.classList.toggle('aberta'); });
}

async function init() {
  montarFita();
  ligar();
  uiMic();
  try { CFG = await window.JevKit.api('/api/config', undefined, { silent: true }); }
  catch { toast('Não consegui carregar o estúdio. Recarregue a página em alguns segundos.', 'err'); }
  const chips = $('chips');
  for (const ex of CFG.exemplos || []) {
    // cada fala pronta é um cartucho de rádio: o emoji do exemplo vira o adesivo e o nome vai na etiqueta
    const m = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u.exec(ex.rotulo);
    const partes = m ? [el('span', { class: 'cart-emo', 'aria-hidden': 'true', text: m[1] }), el('span', { class: 'cart-rot', text: m[2].replace(' · ', '\u00a0· ') })] : [el('span', { class: 'cart-rot', text: ex.rotulo })];
    chips.append(el('button', { class: 'jev-chip' + (ex.par ? ' par' : ''), type: 'button', 'data-id': ex.id, title: ex.par ? `Diz a mesma coisa que “${(CFG.exemplos.find((x) => x.id === ex.par) || {}).rotulo}” com outras palavras` : ex.texto, onclick: () => simular(ex) }, partes));
  }
  const qs = new URLSearchParams(location.search);
  if (/^[a-z0-9]{10}$/.test(qs.get('projeto') || '')) abrirProjeto(qs.get('projeto'), true);
  else if (qs.get('exemplo')) { const ex = (CFG.exemplos || []).find((x) => x.id === qs.get('exemplo')); if (ex) simular(ex); }
  else if (qs.get('texto')) { $('texto').value = qs.get('texto').slice(0, 3000); $('digitar').requestSubmit(); }
}
init();

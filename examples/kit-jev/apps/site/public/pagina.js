// pagina.js — a página: topo aberto, as portas fechadas (uma por seção do site.json) e tudo o que abre dentro delas.
// Conteúdo 100% de dados/site.json. Emite eventos ('secao', 'item', 'bloco', 'faq', 'busca', 'cta') que o rastreador
// (sinais.js) transforma nos sinais enviados ao Jev.
import {
  S, $, html, el, ICON, ICONE_SEC, sleep, RM, EASE, norm, emit, SEC, OFERTA, FAQ, PRECO, FORM, preencher,
  nomeSecao, itensDe, item, reordenar, rolarPara, topoUtil, pct,
} from './core.js';

const D = () => S.D;
const resumo = (t, n) => { t = String(t || ''); if (t.length <= n) return t; const c = t.slice(0, t.lastIndexOf(' ', n)); return c.replace(/[,;:—-]+$/, '') + '…'; };
const unid = (u, n) => (n === 1 ? u[0] : u[1]);
// cor de cada trilha: as lombadas da paleta (em app.css, --lomb-1 … --lomb-6), na ordem das trilhas
const corTrilha = (i) => `var(--lomb-${(i % 6) + 1})`;
export const BUSCA_MIN = 17;                        // listas com 17 itens ou mais ganham busca, filtros e 12 por página
const temBusca = (s) => s.tipo === 'lista' && s.itens.length >= BUSCA_MIN;
export function grupos(s) {
  const m = new Map();
  for (const i of s.itens) if (i.grupo) m.set(i.grupo, (m.get(i.grupo) || 0) + 1);
  return [...m].map(([nome, n]) => ({ nome, n }));
}
const temAbas = (s) => temBusca(s) && s.itens.every((i) => i.grupo) && grupos(s).length >= 3;

// ------------------------------------------------------------------ as portas (estado fechado)
const chips = (nomes, n, total) => html`${nomes.slice(0, n).map((x) => html`<span class="pv-chip">${x}</span>`)}${total > n ? html`<span class="pv-mais">+${total - n}</span>` : ''}`;

const PORTA = {   // por tipo: o número (ou null, ou 'preco') e a prévia da porta fechada
  dores: (s) => ({ num: null, previa: chips(s.dores.map((x) => x[0]), 2, s.dores.length) }),
  trilhas: (s) => {
    const max = Math.max(...s.itens.map((t) => +t.n));
    const total = s.itens.reduce((a, t) => a + t.n, 0);
    return {
      num: [total, unid(s.unidade, total)],
      previa: html`<span class="lombadas" aria-hidden="true">${s.itens.map((t, i) => html`<span class="lombada" style="--h:${(0.34 + 0.66 * (+t.n / max)).toFixed(2)};--cor:${corTrilha(i)}" title="${t.nome}"><b>${t.n}</b></span>`)}</span>
        <span class="lombadas-nomes">${s.itens.map((t) => t.curto).join(' · ')}</span>`,
    };
  },
  lista: (s) => {
    const n = s.itens.length;
    if (s.formato === 'icones') return { num: [n, unid(s.unidade, n)], previa: html`${s.itens.map((x) => html`<span class="pv-chip"><i>${x.rotulo}</i> ${x.nome}</span>`)}` };
    if (temAbas(s)) { const g = grupos(s); return { num: [n, unid(s.unidade, n)], previa: html`${chips(g.map((x) => x.nome), 2, 0)}<span class="pv-mais">+${g.length - 2} grupos</span>` }; }
    return { num: [n, unid(s.unidade, n)], previa: chips(s.itens.map((x) => x.nome), 3, n) };
  },
  agenda: (s) => ({
    num: s.numero || null,
    previa: html`<span class="pv-agenda"><i class="pulso" aria-hidden="true"></i>${s.datas[0][0]} · ${s.datas[0][1]}</span>${s.selo ? html`<span class="pv-mais">${s.selo}</span>` : ''}`,
  }),
  conversa: (s) => ({ num: null, previa: html`<span class="pv-bolha">${resumo(s.exemplo[0][1], 62)}</span><span class="pv-ok">${ICON('ok')} ${s.exemplo[2][2]}</span>` }),
  espacos: (s) => ({ num: null, previa: chips(s.cards.map((c) => c[0]), 3, s.cards.length) }),
  depoimentos: (s) => {
    const n = s.itens.length, nomes = s.itens.slice(0, 3).map((x) => x.nome);
    return {
      num: [n, s.exemplo ? (n === 1 ? 'exemplo' : 'exemplos') : (n === 1 ? 'depoimento' : 'depoimentos')],
      previa: html`<span class="avatares" aria-hidden="true">${s.itens.map((x) => html`<span class="av">${x.nome[0]}</span>`)}</span><span class="pv-nomes">${n > 3 ? `${nomes.join(', ')} e mais ${n - 3}` : nomes.join(', ')}</span>`,
    };
  },
  equipe: (s) => ({ num: s.numeros && s.numeros.length ? s.numeros[0] : null, previa: html`${s.pessoas.map((p) => html`<span class="pv-chip">${p.nome}${p.selo ? html` <i>${p.selo}</i>` : ''}</span>`)}` }),
  para_quem: (s) => ({ num: null, previa: html`<span class="pv-sim">${ICON('ok')} ${s.sim.length} ${s.sim.length === 1 ? 'sinal' : 'sinais'} de que é para você</span>${s.nao.length ? html`<span class="pv-nao">${ICON('nao')} ${s.nao.length} de que não é</span>` : ''}` }),
  oferta: (s) => (s.preco
    ? { num: 'preco', previa: html`<span class="pv-preco" data-preco>${s.preco.a_partir ? 'A partir de ' : s.preco.de ? html`De <s>${s.preco.de}</s> por ` : ''}<b>${s.preco.por}${s.preco.periodo}</b></span>${s.selos.map((x) => html`<span class="pv-chip">${x}</span>`)}` }
    : { num: null, previa: html`<span class="pv-chip pv-chip--forte">Fale com a gente</span>${s.selos.map((x) => html`<span class="pv-chip">${x}</span>`)}` }),
  faq: (s) => ({ num: [s.itens.length, 'perguntas'], previa: chips(s.porta.map((id) => (s.itens.find((f) => f.id === id) || s.itens[0]).pergunta), 3, s.itens.length) }),
};

function portaHTML(s) {
  const id = s.id, P = PORTA[s.tipo](s);
  let num = '';
  if (P.num === 'preco') num = html`<span class="porta-num porta-num--preco" data-preco>${s.preco.a_partir ? html`<i>a partir de</i>` : ''}<b>${s.preco.por}</b><small>${s.preco.periodo}</small></span>`;
  else if (P.num) { const [n, u] = P.num; const nv = preencher(n); num = html`<span class="porta-num${String(nv).length > 5 ? ' porta-num--longo' : ''}"><b>${nv}</b><small>${u}</small></span>`; }
  return html`<section class="porta" id="s-${id}" data-sec="${id}" data-tipo="${s.tipo}">
    <span class="porta-luz" aria-hidden="true"></span>
    <span class="porta-selo" hidden></span>
    <button class="porta-bt" id="b-${id}" type="button" aria-expanded="false" aria-controls="c-${id}">
      <span class="porta-ico">${ICONE_SEC(id)}</span>
      <span class="porta-meio">
        <span class="porta-kicker">${s.kicker}</span>
        <span class="porta-tit">${nomeSecao(id)}</span>
        <span class="porta-prom">${preencher(s.promessa)}</span>
        <span class="porta-previa">${P.previa}</span>
      </span>
      ${num}
      <span class="porta-acao"><span class="porta-acao-txt">Abrir</span>${ICON('chev', 'chev')}</span>
    </button>
    <div class="porta-corpo" id="c-${id}" role="region" aria-labelledby="b-${id}" hidden></div>
  </section>`;
}

// ------------------------------------------------------------------ topo, pilares, final
function renderTopo() {
  const d = D(), h = d.hero;
  $('#topo').innerHTML = String(html`<div class="hero-in">
    <div class="hero-txt">
      <span class="selo-hero">${h.selo}</span>
      <h1 class="hero-tit" id="heroTitulo">${h.titulo}</h1>
      <p class="hero-sub">${preencher(h.sub)}</p>
      <div class="hero-ctas"><button class="bt-cta bt-cta--grande" type="button" data-cta="topo">${h.cta}</button></div>
      <p class="hero-miuda" data-preco>${h.letra_miuda}</p>
    </div>
    <aside class="hero-como" aria-label="Como esta página funciona">
      <span class="hc-marca"><span class="jev-marca">⚡ Jev</span> Como esta página funciona</span>
      <ol class="hc-passos">
        <li><b>Tudo começa fechado.</b> São ${S.SECOES.length} portas, cada uma com um botão para abrir.</li>
        <li><b>Abra o que te interessa.</b> Cada porta, item ou pergunta que você abre é um sinal.</li>
        <li><b>O Jev monta o resto para você.</b> Recomenda a próxima porta, traz para o topo das listas o que combina com você e monta a sua trilha, sempre dizendo por quê.</li>
      </ol>
    </aside>
  </div>
  <dl class="hero-nums" style="--n:${h.numeros.length}">${h.numeros.map(([n, t]) => html`<div class="hn"><dt>${preencher(n)}</dt><dd>${t}</dd></div>`)}</dl>`);

  $('#pilares').setAttribute('aria-label', d.pilares_titulo);
  $('#pilares').innerHTML = String(html`<span class="kicker">${d.pilares_titulo}</span>
    <ol class="pil-lista" style="--n:${d.pilares.length}" data-n="${d.pilares.length}">${d.pilares.map((p, i) => html`<li class="pil">
      <span class="pil-n">${String(i + 1).padStart(2, '0')}</span>
      <h2 class="pil-tit">${p.titulo}</h2>
      <p class="pil-nota">${p.nota}</p>
      <div class="pil-links">${p.secoes.map((id) => html`<button type="button" class="pil-link" data-ir="${id}">${ICONE_SEC(id)}<span>${nomeSecao(id)}</span></button>`)}</div>
    </li>`)}</ol>`);

  $('#portasCab').innerHTML = String(html`<div>
      <span class="kicker">Explore ${d.marca.nome}</span>
      <h2 class="portas-tit">Abra o que te interessa</h2>
      <p class="portas-sub">${S.SECOES.length} seções fechadas. Cada uma tem um botão para abrir e itens que também se abrem. O Jev lê o que você abre e reorganiza o resto para você.</p>
    </div>
    <span class="portas-conta" aria-live="polite"><b id="nAbertas">0</b> de ${S.SECOES.length} abertas</span>`);

  $('#portas').innerHTML = d.secoes.map((s) => String(portaHTML(s))).join('');

  const f = d.final;
  $('#final').innerHTML = String(html`<span class="kicker">${d.marca.nome}</span>
    <h2 class="final-tit" id="finalTitulo">${f.titulo}</h2>
    <p class="final-txt">${preencher(f.texto)}</p>
    <button class="bt-cta bt-cta--grande" type="button" data-cta="final">${f.cta}</button>
    <p class="final-miuda">${f.letra_miuda}</p>
    ${d.marca.links && d.marca.links.length ? html`<p class="final-links">${d.marca.links.map((l) => html`<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.rotulo} ↗</a>`)}</p>` : ''}`);
}

// ------------------------------------------------------------------ conteúdo de cada seção, por tipo (montado na primeira abertura)
const CONTEUDO = {
  dores(s) {
    return html`<div class="sec-lead"><h3 class="sec-h">${s.titulo}</h3><p class="sec-p">${s.texto}</p></div>
      <div class="dores">${s.dores.map(([t, x], i) => html`<article class="dor" data-cascata><span class="dor-n">${String(i + 1).padStart(2, '0')}</span><h4>${t}</h4><p>${x}</p></article>`)}</div>`;
  },
  trilhas(s) {
    return html`<p class="sec-p sec-intro" data-cascata>${s.intro}</p>
      <div class="lista-jev" hidden></div>
      <div class="trilhas-lista grade-lista" data-lista="${s.id}">${s.itens.map((t, i) => trilhaHTML(s, t, i))}</div>`;
  },
  lista(s) { return listaHTML(s); },
  agenda(s) {
    return html`<div class="agenda">
      <div class="agenda-txt" data-cascata><p class="sec-p">${s.desc}</p>${s.nota ? html`<p class="sec-nota">${s.nota}</p>` : ''}</div>
      ${s.numero ? html`<div class="agenda-num" data-cascata><b>${preencher(s.numero[0])}</b><span>${s.numero[1]}</span></div>` : ''}
      <ol class="agenda-linha">${s.datas.map(([data, tit]) => html`<li data-cascata><time>${data}</time><span>${tit}</span></li>`)}</ol>
    </div>`;
  },
  conversa(s) {
    return html`<div class="conversa">
      <div data-cascata><h3 class="sec-h">${s.titulo}</h3><p class="sec-p">${s.desc}</p>
        <ul class="checks">${s.itens.map((x) => html`<li>${ICON('ok')}<span>${x}</span></li>`)}</ul></div>
      <div class="conversa-ex" data-cascata aria-label="Exemplo de conversa"><span class="kicker">Exemplo de conversa</span>
        ${s.exemplo.map(([quem, txt, hora]) => html`<div class="msg msg--${quem}" data-cascata><span class="msg-quem">${s.rotulos[quem]}</span><p>${txt}</p>${hora ? html`<span class="msg-hora">${hora}</span>` : ''}</div>`)}
      </div>
    </div>`;
  },
  espacos(s) {
    return html`<div class="sec-lead" data-cascata><h3 class="sec-h">${s.titulo}</h3><p class="sec-p">${s.desc}</p></div>
      <div class="espacos">${s.cards.map(([t, x]) => html`<article class="espaco" data-cascata><h4>${t}</h4><p>${x}</p></article>`)}</div>
      ${s.chips && s.chips.length ? html`<div class="espacos-chips" data-cascata><span class="kicker">${s.chips_titulo || ''}</span><div class="chips-linha">${s.chips.map((x) => html`<span class="chip-s">${x}</span>`)}</div></div>` : ''}
      ${s.nota ? html`<p class="sec-nota" data-cascata>${s.nota}</p>` : ''}`;
  },
  depoimentos(s) { return listaHTML(s); },
  equipe(s) {
    return html`<div class="sec-lead" data-cascata><h3 class="sec-h">${s.titulo}</h3><p class="sec-p">${s.sub}</p></div>
      ${s.numeros && s.numeros.length ? html`<dl class="equipe-nums">${s.numeros.map(([n, t]) => html`<div data-cascata><dt>${n}</dt><dd>${t}</dd></div>`)}</dl>` : ''}
      <div class="pessoas">${s.pessoas.map((p) => html`<article class="pessoa" data-cascata><span class="pessoa-av" aria-hidden="true">${p.nome.split(' ').slice(0, 2).map((x) => x[0]).join('')}</span><div><h4>${p.nome}</h4><span class="pessoa-papel">${p.papel}</span>${p.selo ? html`<span class="pessoa-selo">${p.selo}</span>` : ''}<p>${p.bio}</p></div></article>`)}</div>
      ${s.conquistas && s.conquistas.length ? html`<ul class="conquistas">${s.conquistas.map((x) => html`<li data-cascata>${ICON('ok')}<span>${x}</span></li>`)}</ul>` : ''}
      ${s.frase ? html`<blockquote class="equipe-frase" data-cascata>${s.frase}</blockquote>` : ''}`;
  },
  para_quem(s) {
    return html`<div class="pq${s.nao.length ? '' : ' pq--so-sim'}">
      <div class="pq-col pq-sim" data-cascata><h4>É para você se…</h4><ul>${s.sim.map((x) => html`<li>${ICON('ok')}<span>${x}</span></li>`)}</ul></div>
      ${s.nao.length ? html`<div class="pq-col pq-nao" data-cascata><h4>Não é para você se…</h4><ul>${s.nao.map((x) => html`<li>${ICON('nao')}<span>${x}</span></li>`)}</ul></div>` : ''}
    </div>`;
  },
  oferta(s) {
    const p = s.preco;
    return html`<div class="oferta">
      <div class="oferta-card" data-cascata>
        <span class="oferta-rot">${s.rotulo}</span>
        ${p ? html`<div class="oferta-preco" data-preco>${p.a_partir ? html`<span class="oferta-de">A partir de</span>` : p.de ? html`<span class="oferta-de">De <s>${p.de}</s> por</span>` : ''}<span class="oferta-por"><b>${p.por}</b><small>${p.periodo}</small></span></div>`
    : html`<div class="oferta-preco oferta-preco--contato"><span class="oferta-por"><b>Fale com a gente</b></span></div>`}
        ${s.planos_extras && s.planos_extras.length ? html`<ul class="oferta-planos">${s.planos_extras.map((x) => html`<li data-preco><span><b>${x.nome}</b><i>${x.resumo}</i></span><em>${x.por}${x.periodo}</em></li>`)}</ul>` : ''}
        ${s.selos.length ? html`<div class="selos">${s.selos.map((x, i) => html`<span class="selo-s">${ICON(['escudo', 'cadeado', 'ok'][i] || 'ok')}${x}</span>`)}</div>` : ''}
        <button class="bt-cta bt-cta--grande" type="button" data-cta="oferta">${s.cta}</button>
        ${s.observacao ? html`<p class="oferta-obs">${s.observacao}</p>` : ''}
        <div class="oferta-prova" hidden></div>
      </div>
      <div class="oferta-inclui" data-cascata>
        <div class="inclui-cab"><span class="kicker">O que está incluso</span><span class="inclui-jev" hidden></span></div>
        <ul class="inclui-lista">${s.inclui.map((x, i) => html`<li class="inc" data-i="${i}">${ICON('ok')}<span>${x.texto}</span><em class="inc-selo" hidden>combina com você</em></li>`)}</ul>
      </div>
    </div>`;
  },
  faq(s) {
    return html`<div class="faq-lista">${s.itens.map((f) => html`<div class="faq-it" id="f-${f.id}" data-faq="${f.id}" data-cascata>
      <button class="faq-bt" type="button" id="fb-${f.id}" aria-expanded="false" aria-controls="fr-${f.id}"><span>${f.pergunta}</span>${ICON('mais', 'mais')}</button>
      <div class="faq-r" id="fr-${f.id}" role="region" aria-labelledby="fb-${f.id}" hidden><p>${f.resposta}</p></div>
    </div>`)}</div>`;
  },
};

function trilhaHTML(s, t, i) {
  const sid = s.id;
  const blocoN = t.blocos.length > 1 ? `${t.blocos.length} ${t.rotulo_bloco}` : '';
  return html`<article class="trilha" id="i-${sid}-${t.id}" data-secao="${sid}" data-item="${t.id}" style="--cor:${corTrilha(i)}">
    <span class="item-selo" hidden></span>
    <button class="trilha-bt item-bt" type="button" id="ib-${sid}-${t.id}" aria-expanded="false" aria-controls="d-${sid}-${t.id}">
      <span class="trilha-lomb" aria-hidden="true"><b>${t.n}</b></span>
      <span class="trilha-meio"><span class="trilha-nome">${t.nome}</span><span class="trilha-frase">${t.frase}</span></span>
      <span class="trilha-n">${t.n} ${unid(s.unidade, t.n)}${blocoN ? html`<i>${blocoN}</i>` : ''}</span>
      ${ICON('chev', 'chev')}
    </button>
    <div class="trilha-det item-det" id="d-${sid}-${t.id}" role="region" aria-labelledby="ib-${sid}-${t.id}" hidden>
      <p class="trilha-desc">${t.desc}</p>
      ${t.nota ? html`<p class="trilha-nota">${t.nota}</p>` : ''}
      <ol class="blocos">${t.blocos.map((b, k) => html`<li class="bloco" data-trilha="${t.id}" data-bloco="${k}">
        <button class="bloco-bt" type="button" id="bb-${t.id}-${k}" aria-expanded="false" aria-controls="bd-${t.id}-${k}">
          <span class="bloco-tit">${b.titulo}</span><span class="bloco-n">${b.resumo ? b.n : b.itens.length} ${unid(s.unidade, b.resumo ? b.n : b.itens.length)}</span>${ICON('chev', 'chev')}
        </button>
        <div class="bloco-det" id="bd-${t.id}-${k}" role="region" aria-labelledby="bb-${t.id}-${k}" hidden>
          ${b.resumo ? html`<p class="bloco-resumo">Resumo dos temas</p><ul class="subitens subitens--temas">${b.itens.map((a) => html`<li>${a}</li>`)}</ul>`
    : html`<ol class="subitens">${b.itens.map((a) => html`<li>${a}</li>`)}</ol>`}
        </div>
      </li>`)}</ol>
    </div>
  </article>`;
}

// ------------------------------------------------------------------ listas (seções do tipo lista e depoimentos; as trilhas usam a mesma classe)
const LISTA = {};
function listaHTML(s) {
  const busca = temBusca(s), abas = temAbas(s), total = s.itens.length;
  const rotulo = `Buscar em ${total} ${unid(s.unidade || ['item', 'itens'], total)}`;
  const grade = s.tipo === 'depoimentos' ? 'depoimentos' : s.formato;
  return html`<div class="lista" data-lista="${s.id}">
    ${busca ? html`<div class="lista-barra">
      <label class="busca">${ICON('busca')}<span class="sr">${rotulo}</span><input type="search" class="busca-in" placeholder="${rotulo}…" autocomplete="off" spellcheck="false" data-busca="${s.id}"></label>
      <div class="filtros" role="group" aria-label="Filtrar">
        <button type="button" class="filtro on" data-filtro="todos" aria-pressed="true">Todos</button>
        <button type="button" class="filtro filtro--jev" data-filtro="pv" aria-pressed="false" disabled>${ICON('brilho')} Para você</button>
        <button type="button" class="filtro" data-filtro="abertos" aria-pressed="false" disabled>Abertos por você</button>
      </div>
    </div>` : ''}
    ${abas ? html`<div class="abas" role="tablist" aria-label="Grupos de ${s.nome}">
      <button type="button" role="tab" class="aba on" data-aba="" aria-selected="true">Todos <i>${total}</i></button>
      ${grupos(s).map((m) => html`<button type="button" role="tab" class="aba" data-aba="${m.nome}" aria-selected="false">${m.nome} <i>${m.n}</i></button>`)}
    </div>` : ''}
    <div class="lista-jev" hidden></div>
    <div class="lista-info" aria-live="polite"></div>
    <div class="grade grade--${grade}"></div>
    <div class="lista-vazia" hidden><p>Nada encontrado.</p><button type="button" class="bt-link" data-limpar="${s.id}">Limpar a busca</button></div>
    <button type="button" class="bt-mais" hidden></button>
  </div>`;
}

function cardHTML(secao, x) {
  const s = SEC(secao), id = String(x.id);
  const selo = s.selo_item ? html`<span class="item-incl">${ICON('ok')} ${s.selo_item}</span>` : '';
  if (s.tipo === 'lista' && s.formato === 'icones') {
    return html`<article class="item item--icones" id="i-${secao}-${id}" data-secao="${secao}" data-item="${id}">
      <span class="item-selo" hidden></span>
      <button class="item-bt" type="button" id="ib-${secao}-${id}" aria-expanded="false" aria-controls="d-${secao}-${id}">
        <span class="item-ico">${ICON(x.icone || 'brilho')}</span>
        <span class="item-kicker">${x.rotulo}</span><span class="item-nome">${x.nome}</span>
        <span class="item-abrir">${ICON('mais', 'mais')}<span>Ver detalhes</span></span>
      </button>
      <div class="item-det" id="d-${secao}-${id}" role="region" aria-labelledby="ib-${secao}-${id}" hidden><p>${x.desc}</p>${selo}</div>
    </article>`;
  }
  if (s.tipo === 'depoimentos') {
    return html`<article class="item item--depo" id="i-${secao}-${id}" data-secao="${secao}" data-item="${id}">
      <span class="item-selo" hidden></span>
      <button class="item-bt" type="button" id="ib-${secao}-${id}" aria-expanded="false" aria-controls="d-${secao}-${id}">
        ${ICON('aspas', 'depo-aspas')}
        <span class="depo-txt" id="d-${secao}-${id}">“${x.texto}”</span>
        <span class="depo-quem"><span class="av">${x.nome[0]}</span><span><b>${x.nome}</b>${x.papel ? html`<i>${x.papel}</i>` : ''}</span>${s.exemplo ? html`<em class="tag-exemplo">exemplo</em>` : ''}</span>
      </button>
    </article>`;
  }
  const frase = x.frase || resumo(x.desc, 84);
  return html`<article class="item" id="i-${secao}-${id}" data-secao="${secao}" data-item="${id}">
    <span class="item-selo" hidden></span>
    <button class="item-bt" type="button" id="ib-${secao}-${id}" aria-expanded="false" aria-controls="d-${secao}-${id}">
      <span class="item-nome">${x.nome}</span>
      <span class="item-frase">${frase}</span>
      ${temAbas(s) ? html`<span class="item-mod">${x.grupo}</span>` : ''}
      <span class="item-abrir">${ICON('mais', 'mais')}<span>${s.formato === 'largos' ? 'Ler a descrição' : 'Ver detalhes'}</span></span>
    </button>
    <div class="item-det" id="d-${secao}-${id}" role="region" aria-labelledby="ib-${secao}-${id}" hidden><p>${x.desc}</p>${selo}</div>
  </article>`;
}

class Lista {
  constructor(secao, raiz) {
    this.secao = secao; this.raiz = raiz;
    this.itens = itensDe(secao);
    this.q = ''; this.aba = ''; this.filtro = 'todos';
    this.porPag = temBusca(SEC(secao)) ? 12 : Infinity;
    this.mostrar = this.porPag;
    this.cards = new Map();
    this.pins = [];
    this.pendente = false;
    this.grade = raiz.querySelector('.grade') || raiz.querySelector('.grade-lista');
    this.trilhas = SEC(secao).tipo === 'trilhas';
    if (this.trilhas) for (const c of this.grade.children) this.cards.set(c.dataset.item, c);
    this.info = raiz.querySelector('.lista-info');
    this.mais = raiz.querySelector('.bt-mais');
    this.vazia = raiz.querySelector('.lista-vazia');
    this.jev = raiz.querySelector('.lista-jev');
    const busca = raiz.querySelector('.busca-in');
    if (busca) {
      let tm;
      busca.addEventListener('input', () => {
        clearTimeout(tm);
        tm = setTimeout(() => { this.q = busca.value.trim(); this.mostrar = this.porPag; this.render(true); emit('busca', { secao, q: this.q }); }, 260);
      });
    }
    raiz.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filtro]');
      if (f && !f.disabled) { this.filtro = f.dataset.filtro; raiz.querySelectorAll('[data-filtro]').forEach((b) => { b.classList.toggle('on', b === f); b.setAttribute('aria-pressed', String(b === f)); }); this.mostrar = this.porPag; this.render(true); emit('filtro', { secao, filtro: this.filtro }); return; }
      const a = e.target.closest('[data-aba]');
      if (a) { this.aba = a.dataset.aba; raiz.querySelectorAll('[data-aba]').forEach((b) => { b.classList.toggle('on', b === a); b.setAttribute('aria-selected', String(b === a)); }); this.mostrar = this.porPag; this.render(true); emit('aba', { secao, aba: this.aba }); return; }
      if (e.target.closest('.bt-mais')) { this.mostrar += this.porPag; this.render(true); return; }
      if (e.target.closest('[data-limpar]')) { if (busca) busca.value = ''; this.q = ''; this.filtro = 'todos'; this.aba = ''; this.syncControles(); this.render(true); emit('busca', { secao, q: '' }); }
    });
  }
  syncControles() {
    this.raiz.querySelectorAll('[data-filtro]').forEach((b) => { const on = b.dataset.filtro === this.filtro; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    this.raiz.querySelectorAll('[data-aba]').forEach((b) => { const on = b.dataset.aba === this.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  }
  card(x) {
    const id = String(x.id);
    if (!this.cards.has(id)) this.cards.set(id, el(cardHTML(this.secao, x)));
    return this.cards.get(id);
  }
  abertos() { return new Set(S.itens.filter((i) => i.secao === this.secao && i.abriu).map((i) => i.id)); }
  calcular() {
    const pinIds = this.pins.map((p) => p.id);
    const palavras = norm(this.q).split(/\s+/).filter(Boolean);
    const ab = this.filtro === 'abertos' ? this.abertos() : null;
    const passa = (x) => {
      if (this.aba && x.grupo !== this.aba) return false;
      if (this.filtro === 'pv' && !pinIds.includes(String(x.id))) return false;
      if (ab && !ab.has(String(x.id))) return false;
      if (palavras.length) { const hay = norm(`${x.nome} ${x.frase || ''} ${x.desc || ''} ${x.grupo || ''} ${x.rotulo || ''} ${x.papel || ''} ${x.texto || ''}`); if (!palavras.every((w) => hay.includes(w))) return false; }
      return true;
    };
    const filtrados = this.itens.filter(passa);
    const fixos = pinIds.map((id) => filtrados.find((x) => String(x.id) === id)).filter(Boolean);
    const resto = filtrados.filter((x) => !pinIds.includes(String(x.id)));
    return { ordem: [...fixos, ...resto], total: filtrados.length };
  }
  render(animar) {
    const { ordem, total } = this.calcular();
    const vis = ordem.slice(0, this.mostrar);
    const els = vis.map((x) => this.card(x));
    // selos "Para você"
    const pmap = new Map(this.pins.map((p) => [p.id, p.p]));
    const depo = SEC(this.secao).tipo === 'depoimentos';
    for (const [id, c] of this.cards) {
      const on = pmap.has(id);
      c.classList.toggle('pv', on);
      const s = c.querySelector('.item-selo');
      if (s) { s.hidden = !on; if (on) s.innerHTML = String(html`${ICON('brilho')}<span>${depo ? 'Parecido com você' : 'Para você'}</span><b>${pct(pmap.get(id))}</b>`); }
    }
    reordenar(this.grade, els, animar && !RM());
    if (this.info) this.info.textContent = this.q ? `${total} ${total === 1 ? 'resultado' : 'resultados'} para “${this.q}”` : this.porPag === Infinity ? '' : `Mostrando ${vis.length} de ${total}`;
    if (this.vazia) this.vazia.hidden = total > 0;
    if (this.mais) {
      const rest = ordem.length - vis.length;
      this.mais.hidden = rest <= 0;
      this.mais.innerHTML = String(html`Mostrar mais ${Math.min(rest, this.porPag)} <i>(${rest} ${rest === 1 ? 'restante' : 'restantes'})</i>`);
    }
    this.linhaJev(ordem);
    this.raiz.toggleAttribute('data-aba-on', !!this.aba);
    const bPv = this.raiz.querySelector('[data-filtro="pv"]');
    if (bPv) bPv.disabled = !this.pins.length;
    const bAb = this.raiz.querySelector('[data-filtro="abertos"]');
    if (bAb) bAb.disabled = !this.abertos().size;
  }
  // a camada do Jev chama isto com destaque.ranking; devolve true se a ordem mudou na tela
  setPins(pins, motivo) {
    const antes = this.pins.map((p) => p.id).join();
    this.pins = pins.map((p) => ({ id: String(p.id), p: p.p })).filter((p) => this.itens.some((x) => String(x.id) === p.id));
    const mudou = antes !== this.pins.map((p) => p.id).join();
    this.motivo = motivo || this.motivo || '';
    const pode = this.podeMover();
    this.pendente = mudou && !pode;
    this.render(pode);
    return mudou;
  }
  // a linha do Jev acima da lista diz o que ele fez, contando só o que aparece com o filtro atual
  linhaJev(ordem) {
    if (!this.jev) return;
    const ids = new Set(ordem.map((x) => String(x.id)));
    const vis = this.pins.filter((p) => ids.has(p.id)).length;
    this.jev.hidden = !this.pins.length;
    if (!this.pins.length) return;
    const n = this.pins.length;
    const motivo = this.motivo ? html`, <em>${this.motivo}</em>` : '';
    this.jev.innerHTML = String(vis
      ? html`<span class="jev-marca">${ICON('brilho')} Jev</span><span>${vis === 1 ? 'Coloquei no topo o que mais combina' : `Coloquei no topo os ${vis} que mais combinam`} com você${motivo}.</span>`
      : html`<span class="jev-marca">${ICON('brilho')} Jev</span><span>Separei ${n === 1 ? '1 item' : `${n} itens`} para você nesta lista${motivo}.</span>${this.raiz.querySelector('[data-filtro="pv"]') ? html`<button type="button" class="bt-link" data-filtro="pv">Ver ${n === 1 ? 'o item' : `os ${n}`}</button>` : ''}`);
  }
  // nunca mexe na lista se a pessoa está com o mouse/foco nela e o topo da lista não está na tela
  podeMover() {
    const r = this.grade.getBoundingClientRect();
    const topoVisivel = r.top > topoUtil() - 40 && r.top < window.innerHeight - 80;
    const mexendo = this.grade.matches(':hover') || this.grade.contains(document.activeElement) || !!this.grade.querySelector('.sim-hover');
    return topoVisivel && !mexendo;
  }
  tentarPendente() { if (this.pendente && this.podeMover()) { this.pendente = false; this.render(true); } }
  revelar(id) {
    id = String(id);
    const { ordem } = this.calcular();
    if (!ordem.some((x) => String(x.id) === id)) {
      this.q = ''; this.filtro = 'todos'; this.aba = '';
      const b = this.raiz.querySelector('.busca-in'); if (b) b.value = '';
      this.syncControles();
    }
    const idx = this.calcular().ordem.findIndex((x) => String(x.id) === id);
    if (idx >= this.mostrar) this.mostrar = Math.ceil((idx + 1) / this.porPag) * this.porPag;
    this.render(false);
    return this.cards.get(id);
  }
}
export const lista = (secao) => LISTA[secao];

// ------------------------------------------------------------------ abrir e fechar seções (coreografia com transform/opacity)
function montarConteudo(id) {
  const corpo = $('#c-' + id);
  if (corpo.dataset.pronto) return corpo;
  const s = SEC(id);
  corpo.innerHTML = String(html`<div class="porta-corpo-in">${CONTEUDO[s.tipo](s)}
    <div class="porta-rodape"><button type="button" class="bt-fechar" data-fechar="${id}">${ICON('cima')} Fechar ${nomeSecao(id)}</button></div></div>`);
  corpo.dataset.pronto = '1';
  const raizLista = corpo.querySelector('[data-lista]');
  if (raizLista) { const L = new Lista(id, s.tipo === 'trilhas' ? corpo : raizLista); LISTA[id] = L; if (S.pins[id]) L.pins = S.pins[id]; L.render(false); }
  return corpo;
}

function portasDepois(sec) { const out = []; let n = sec.nextElementSibling; while (n) { if (n.classList.contains('porta')) out.push(n); n = n.nextElementSibling; } return out; }
const pertoDaTela = (e) => { const r = e.getBoundingClientRect(); return r.bottom > -200 && r.top < window.innerHeight + 400; };

function cascata(corpo) {
  if (RM()) return;
  const alvos = [...corpo.querySelectorAll('[data-cascata], .grade > *, .grade-lista > *, .lista-barra, .abas, .porta-rodape')].filter((e) => !e.parentElement.closest('[data-cascata]'));
  alvos.slice(0, 18).forEach((e, i) => e.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 60 + i * 38, easing: EASE, fill: 'backwards' }));
}

export async function abrirSecao(id, o = {}) {
  const st = S.sec[id];
  if (!st || st.aberta) return;
  const sec = $('#s-' + id), bt = $('#b-' + id);
  const corpo = montarConteudo(id);
  const depois = portasDepois(sec).filter(pertoDaTela);
  const antes = new Map(depois.map((d) => [d, d.getBoundingClientRect().top]));
  corpo.hidden = false;
  sec.classList.add('aberta');
  bt.setAttribute('aria-expanded', 'true');
  bt.querySelector('.porta-acao-txt').textContent = 'Fechar';
  if (!RM()) {
    corpo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    cascata(corpo);
    for (const d of depois) { const dy = antes.get(d) - d.getBoundingClientRect().top; if (Math.abs(dy) > 1) d.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 620, easing: EASE }); }
  }
  if (LISTA[id]) LISTA[id].render(false);
  contarAbertas();
  emit('secao', { id, aberta: true, origem: o.origem || 'clique' });
}

export function fecharSecao(id, o = {}) {
  const st = S.sec[id];
  if (!st || !st.aberta) return;
  const sec = $('#s-' + id), bt = $('#b-' + id), corpo = $('#c-' + id);
  const topoAntes = sec.getBoundingClientRect().top;
  corpo.hidden = true;
  sec.classList.remove('aberta');
  bt.setAttribute('aria-expanded', 'false');
  bt.querySelector('.porta-acao-txt').textContent = 'Abrir';
  // quem fecha pelo botão do fim da seção continua vendo a porta que fechou (sem pular para longe)
  if (topoAntes < topoUtil()) window.scrollTo({ top: window.scrollY + sec.getBoundingClientRect().top - topoUtil() - 12, behavior: 'instant' });
  if (!RM()) for (const d of portasDepois(sec).filter(pertoDaTela)) d.animate([{ opacity: 0.4, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
  contarAbertas();
  emit('secao', { id, aberta: false, origem: o.origem || 'clique' });
}
export const alternarSecao = (id, o) => (S.sec[id].aberta ? fecharSecao(id, o) : abrirSecao(id, o));
function contarAbertas() { const n = S.SECOES.filter((id) => S.sec[id].aberta).length; const b = $('#nAbertas'); if (b) b.textContent = n; }

// ------------------------------------------------------------------ itens que abrem (cartão, trilha, depoimento)
export function alternarItem(secao, id, o = {}) {
  const art = $(`#i-${secao}-${CSS.escape(String(id))}`);
  if (!art) return;
  const bt = art.querySelector('.item-bt'), det = art.querySelector('.item-det');
  const abrir = o.abrir != null ? o.abrir : bt.getAttribute('aria-expanded') !== 'true';
  if ((bt.getAttribute('aria-expanded') === 'true') === abrir) return;
  const grade = art.parentElement;
  const antes = new Map();
  const irmãos = grade ? [...grade.children] : [];
  const s = SEC(secao);
  if (!RM() && s.formato === 'largos') for (const c of irmãos) antes.set(c, c.getBoundingClientRect());
  bt.setAttribute('aria-expanded', String(abrir));
  art.classList.toggle('aberto', abrir);
  if (det) {
    det.hidden = !abrir;
    if (abrir && !RM()) det.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
    if (abrir && s.tipo === 'trilhas' && !RM()) det.querySelectorAll('.bloco').forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 80 + i * 40, easing: EASE, fill: 'backwards' }));
  }
  if (antes.size) for (const c of irmãos) { const a = antes.get(c), b = c.getBoundingClientRect(); const dx = a.left - b.left, dy = a.top - b.top; if (Math.abs(dx) + Math.abs(dy) > 1) c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 480, easing: EASE }); }
  const L = LISTA[secao];
  emit('item', { secao, id: String(id), aberto: abrir, viaBusca: !!(L && L.q), origem: o.origem || 'clique' });
  if (L) setTimeout(() => L.render(false), 0);
}

export function alternarBloco(trilhaId, idx) {
  const li = $(`.bloco[data-trilha="${trilhaId}"][data-bloco="${idx}"]`);
  if (!li) return;
  const bt = li.querySelector('.bloco-bt'), det = li.querySelector('.bloco-det');
  const abrir = bt.getAttribute('aria-expanded') !== 'true';
  bt.setAttribute('aria-expanded', String(abrir));
  li.classList.toggle('aberto', abrir);
  det.hidden = !abrir;
  if (abrir && !RM()) det.querySelectorAll('li').forEach((a, i) => a.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 22, easing: EASE, fill: 'backwards' }));
  const t = item(S.TIPO.trilhas, trilhaId);
  emit('bloco', { trilha: trilhaId, idx: +idx, aberto: abrir, titulo: `${t.curto} · ${t.blocos[idx].titulo}` });
}

export function alternarFaq(fid, o = {}) {
  const it = $('#f-' + fid);
  if (!it) return;
  const bt = it.querySelector('.faq-bt'), r = it.querySelector('.faq-r');
  const abrir = o.abrir != null ? o.abrir : bt.getAttribute('aria-expanded') !== 'true';
  if ((bt.getAttribute('aria-expanded') === 'true') === abrir) return;
  bt.setAttribute('aria-expanded', String(abrir));
  it.classList.toggle('aberto', abrir);
  r.hidden = !abrir;
  if (abrir && !RM()) r.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE });
  emit('faq', { id: fid, aberto: abrir, pergunta: FAQ().itens.find((f) => f.id === fid).pergunta });
}

// ------------------------------------------------------------------ navegação pedida pela pessoa (chip, mapa, trilha, pilares)
export async function irPara(id, o = {}) {
  const sec = $('#s-' + id);
  if (!sec) return;
  const y = sec.getBoundingClientRect().top + window.scrollY - topoUtil() - 6;
  await rolarPara(y);
  if (o.abrir !== false && !S.sec[id].aberta) { await abrirSecao(id, { origem: o.origem || 'navegacao' }); await sleep(RM() ? 0 : 320); }
  if (o.item != null) {
    const L = LISTA[id];
    if (L && !L.trilhas) L.revelar(o.item);
    const art = $(`#i-${id}-${CSS.escape(String(o.item))}`);
    if (art) {
      const r = art.getBoundingClientRect();
      if (r.top < topoUtil() || r.bottom > window.innerHeight - 90) await rolarPara(window.scrollY + r.top - topoUtil() - 60);
      if (art.querySelector('.item-bt').getAttribute('aria-expanded') !== 'true') alternarItem(id, o.item, { origem: o.origem || 'navegacao' });
      art.classList.add('pisca');
      setTimeout(() => art.classList.remove('pisca'), 1600);
    }
  }
}

// ------------------------------------------------------------------ oferta: itens inclusos que combinam com a pessoa sobem e brilham
export function ordenarInclui(indices, motivo) {
  const ul = $(`#c-${S.TIPO.oferta} .inclui-lista`);
  if (!ul) return false;
  const lis = [...ul.children];
  const base = lis.slice().sort((a, b) => a.dataset.i - b.dataset.i);
  const top = indices.map((i) => base[i]).filter(Boolean);
  const ordem = [...top, ...base.filter((x) => !top.includes(x))];
  for (const li of base) { const on = top.includes(li); li.classList.toggle('combina', on); li.querySelector('.inc-selo').hidden = !on; }
  const cab = $(`#c-${S.TIPO.oferta} .inclui-jev`);
  if (cab) { cab.hidden = !top.length; cab.innerHTML = String(html`${ICON('brilho')} ${top.length} ${top.length === 1 ? 'item combina' : 'itens combinam'} com você${motivo ? html` · <em>${motivo}</em>` : ''}`); }
  const r = ul.getBoundingClientRect();
  const pode = r.top > topoUtil() - 60 && r.top < window.innerHeight && !ul.matches(':hover');
  return reordenar(ul, ordem, pode);
}

// ------------------------------------------------------------------ pagamento ou contato de DEMONSTRAÇÃO (sem cobrança, sem link para checkout real)
function montarCheckout() {
  const d = D(), v = OFERTA(), p = PRECO(), conv = d.conversao, pag = FORM() === 'pagamento';
  const dlg = $('#checkout');
  dlg.innerHTML = String(html`<div class="dlg-in">
    <header class="dlg-cab"><div><span class="kicker">${d.marca.nome}</span><h2 id="ckTitulo">${conv.cta}</h2></div><button type="button" class="dlg-x" data-fecha-ck aria-label="Fechar">${ICON('x')}</button></header>
    <p class="ck-demo">${ICON('cadeado')}<span><b>${pag ? 'demonstração — nenhuma cobrança' : 'demonstração — nada é enviado'}</b>. Nada do que você digitar sai do seu navegador.</span></p>
    <div class="ck-grid">
      <form class="ck-form" id="ckForm" novalidate autocomplete="off">
        <label class="campo"><span>Nome</span><input name="nome" type="text" minlength="2" required autocomplete="off" placeholder="Seu nome"></label>
        <label class="campo"><span>E-mail</span><input name="email" type="email" required autocomplete="off" placeholder="voce@email.com"></label>
        ${pag ? html`<fieldset class="ck-forma"><legend>Forma de pagamento (demonstração)</legend>
          <label><input type="radio" name="forma" value="cartao" checked><span>Cartão</span></label>
          <label><input type="radio" name="forma" value="pix"><span>Pix</span></label>
        </fieldset>` : html`<label class="campo"><span>O que você procura? (opcional)</span><textarea name="mensagem" rows="3" autocomplete="off" placeholder="Conte em poucas palavras"></textarea></label>`}
        <p class="ck-err" id="ckErr" role="alert"></p>
        <button type="submit" class="bt-cta bt-cta--grande ck-pagar">${pag ? `Concluir (demonstração) · ${p.por}${p.periodo}` : 'Enviar (demonstração)'}</button>
      </form>
      <aside class="ck-resumo">
        <span class="ck-rot">${v.rotulo}</span>
        ${p ? html`<div class="ck-preco" data-preco>${p.a_partir ? html`<span>A partir de</span>` : p.de ? html`<span>De <s>${p.de}</s> por</span>` : ''}<b>${p.por}</b><small>${p.periodo}</small></div>` : html`<div class="ck-preco"><b class="ck-preco--contato">Fale com a gente</b></div>`}
        ${v.selos.length ? html`<ul class="ck-selos">${v.selos.slice(0, 2).map((x, i) => html`<li>${ICON(i ? 'ok' : 'escudo')} ${x}</li>`)}</ul>` : ''}
        <div class="ck-abriu" id="ckAbriu" hidden></div>
      </aside>
    </div>
  </div>
  <div class="ck-ok" id="ckOk" hidden>
    <span class="ck-ok-ico">${ICON('ok')}</span>
    <h2>Você ${conv.concluida} (demonstração)</h2>
    <p>${pag ? 'Nenhuma cobrança foi feita e nenhum dado saiu do seu navegador. Na página real, este passo leva ao pagamento.' : 'Nenhum dado saiu do seu navegador. Na página real, este passo envia o seu contato para a equipe.'}</p>
    <button type="button" class="bt-cta" data-fecha-ck>Continuar vendo a página</button>
  </div>`);
  const form = $('#ckForm');
  const nomesCampos = pag ? ['nome', 'email'] : ['nome', 'email', 'mensagem'];
  const campos = () => nomesCampos.filter((n) => form.elements[n].value.trim()).length;
  form.addEventListener('input', () => { S.cta.campos = campos(); });
  form.addEventListener('change', () => { S.cta.campos = campos(); emit('cta', { tipo: 'campos', n: S.cta.campos }); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = form.elements.nome.value.trim(), email = form.elements.email.value.trim();
    const erros = [];
    if (nome.length < 2) erros.push(['nome', 'Escreva seu nome.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erros.push(['email', 'Confira o e-mail.']);
    for (const n of ['nome', 'email']) form.elements[n].setAttribute('aria-invalid', String(erros.some((x) => x[0] === n)));
    if (erros.length) { $('#ckErr').textContent = erros.map((x) => x[1]).join(' '); emit('cta', { tipo: 'erro', campos: erros.map((x) => x[0]) }); return; }
    $('#ckErr').textContent = '';
    dlg.querySelector('.dlg-in').hidden = true;
    $('#ckOk').hidden = false;
    $('#ckOk').querySelector('button').focus();
    emit('cta', { tipo: 'entrou' });
  });
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-fecha-ck]') || e.target === dlg) fecharCheckout(); });
  dlg.addEventListener('close', () => { if (S.cta.checkout_aberto) { S.cta.checkout_aberto = false; emit('cta', { tipo: 'fechou' }); } });
}

// o que a pessoa abriu e está incluso na oferta: seções com produto: true + itens abertos das listas e trilhas delas
export function abriuResumo() {
  const prod = S.SECOES.filter((id) => SEC(id).produto);
  const secs = prod.filter((id) => S.sec[id].vezes > 0);
  const its = S.itens.filter((i) => prod.includes(i.secao) && ['trilhas', 'lista'].includes(SEC(i.secao).tipo) && i.acao !== 'passou');
  const vistos = new Set();
  const nomesIt = [];
  for (const i of its.slice().reverse()) { const n = (item(i.secao, i.id) || {}).nome; if (n && !vistos.has(n)) { vistos.add(n); nomesIt.push(n); } }
  return { secs, itens: nomesIt.slice(0, 4) };
}

export function abrirCheckout(origem) {
  const dlg = $('#checkout');
  if (dlg.open) return;
  dlg.querySelector('.dlg-in').hidden = false;
  $('#ckOk').hidden = true;
  const { secs, itens } = abriuResumo();
  const box = $('#ckAbriu');
  box.hidden = !secs.length && !itens.length;
  box.innerHTML = String(html`<span class="kicker">Tudo o que você abriu está incluso</span><div class="chips-linha">${secs.map((id) => html`<span class="chip-s">${ICONE_SEC(id)}${nomeSecao(id)}</span>`)}${itens.map((n) => html`<span class="chip-s chip-s--it">${n}</span>`)}</div>`);
  S.cta.checkout_aberto = true;
  emit('cta', { tipo: 'abriu', origem });
  dlg.showModal();
  if (!RM()) dlg.animate([{ opacity: 0, transform: 'translateY(16px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE });
  setTimeout(() => { const i = $('#ckForm').elements.nome; if (i) i.focus({ preventScroll: true }); }, 40);
}
export function fecharCheckout() { const dlg = $('#checkout'); if (dlg.open) dlg.close(); }

// ------------------------------------------------------------------ montagem geral e cliques
export function montarPagina() {
  renderTopo();
  montarCheckout();
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const cta = t.closest('[data-cta]');
    if (cta) { e.preventDefault(); emit('cta', { tipo: 'clique', origem: cta.dataset.cta }); abrirCheckout(cta.dataset.cta); return; }
    const ir = t.closest('[data-ir]');
    if (ir) { e.preventDefault(); irPara(ir.dataset.ir, { item: ir.dataset.item, origem: ir.dataset.origem || 'navegacao' }); return; }
    const pb = t.closest('.porta-bt');
    if (pb) { alternarSecao(pb.closest('.porta').dataset.sec); return; }
    const fe = t.closest('[data-fechar]');
    if (fe) { fecharSecao(fe.dataset.fechar, { origem: 'rodape' }); return; }
    const bb = t.closest('.bloco-bt');
    if (bb) { const li = bb.closest('.bloco'); alternarBloco(li.dataset.trilha, li.dataset.bloco); return; }
    const ib = t.closest('.item-bt');
    if (ib) { const art = ib.closest('[data-item]'); alternarItem(art.dataset.secao, art.dataset.item); return; }
    const fq = t.closest('.faq-bt');
    if (fq) { alternarFaq(fq.closest('[data-faq]').dataset.faq); }
  });
}

// ------------------------------------------------------------------ nova visita: tudo volta a fechar, na ordem original
export function restaurarPagina() {
  for (const id of S.SECOES) {
    const sec = $('#s-' + id);
    sec.classList.remove('aberta', 'rec', 'subiu', 'guiada');
    const bt = $('#b-' + id);
    bt.setAttribute('aria-expanded', 'false');
    bt.querySelector('.porta-acao-txt').textContent = 'Abrir';
    const corpo = $('#c-' + id);
    corpo.hidden = true; corpo.innerHTML = ''; delete corpo.dataset.pronto;
    delete LISTA[id];
    const s = sec.querySelector('.porta-selo'); s.hidden = true; s.textContent = '';
  }
  const cont = $('#portas');
  S.SECOES.forEach((id) => cont.appendChild($('#s-' + id)));
  contarAbertas();
  fecharCheckout();
}

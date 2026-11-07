// Motor PARES: o Jev compara pares candidatos (mesmo cadastro? mesmo produto? bom par de negócio?)
// e linhas ligam os cartões que combinam, com a espessura dada pela probabilidade.
import { el, esc, fmt, sleep, chip, anel, medidor, listaOpcoes, listaNiveis } from './ui.js';

export function criar({ spec, area, decidir, contexto }) {
  const P = spec.pares || {};
  const decs = (spec.decisoes || []).filter((d) => d.papel !== 'oculto');
  const dPrin = decs.find((d) => d.id === P.decisao) || decs[0];
  const limiar = P.limiar ?? 0.65;
  const lote = Math.max(1, Math.min(16, P.lote || 6));
  const dados = spec.dados || [];
  const porId = new Map(dados.map((d) => [String(d.id), d]));
  const pares = (spec.paresDemo || []).map((p, i) => ({ id: 'p' + i, a: String(p[0]), b: String(p[1]) }));
  const campos = { titulo: 'titulo', subtitulo: 'subtitulo', texto: 'texto', avatar: 'avatar', ...(P.cartao || {}) };
  const resultados = new Map();

  const colA = el('section', { class: 'mj-pares-col' }, [el('h3', { class: 'mj-sec-t', text: P.rotuloA || 'Lista A' })]);
  const colB = el('section', { class: 'mj-pares-col' }, [el('h3', { class: 'mj-sec-t', text: P.rotuloB || 'Lista B' })]);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mj-pares-svg');
  const listaPares = el('div', { class: 'mj-pares-lista', 'aria-live': 'polite' });
  const kSim = el('b', { text: '0' }), kNao = el('b', { text: '0' });
  const lado = el('aside', { class: 'mj-painel' }, [
    el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', { text: P.tituloPlacar || 'Resultado' }), el('div', { class: 'mj-contadores' }, [
      el('div', { class: 'mj-contador' }, [kSim, el('span', { text: P.rotuloSim || 'combinam' })]),
      el('div', { class: 'mj-contador' }, [kNao, el('span', { text: P.rotuloNao || 'não combinam' })]),
    ])]),
    el('h3', { class: 'mj-sec-t', style: { margin: '4px 0 0' } }, [P.tituloLista || 'Pares avaliados pelo Jev']),
    listaPares,
  ]);
  const caixa = el('div', { class: 'mj-pares' }, [colA, colB, lado]);
  caixa.append(svg);
  area.append(caixa);

  const nos = new Map();
  for (const d of dados) {
    const v = (k) => (d[campos[k]] != null ? d[campos[k]] : null);
    const c = el('article', { class: 'mj-cartao mini', 'data-id': d.id }, [
      el('div', { class: 'cab' }, [el('div', { class: 't', text: `${v('avatar') ? v('avatar') + ' ' : ''}${v('titulo') ?? d.id}` }), v('subtitulo') ? el('div', { class: 'st', text: v('subtitulo') }) : null]),
      el('span'),
      v('texto') ? el('div', { class: 'txt', text: v('texto') }) : null,
      el('div', { class: 'chips' }),
    ]);
    nos.set(String(d.id), c);
    ((d.lado || 'a') === 'b' ? colB : colA).append(c);
  }

  function ponto(no, ladoDir) {
    const rc = caixa.getBoundingClientRect(), r = no.getBoundingClientRect();
    return { x: (ladoDir ? r.right : r.left) - rc.left, y: r.top + r.height / 2 - rc.top };
  }
  function desenhar() {
    svg.setAttribute('width', caixa.scrollWidth); svg.setAttribute('height', caixa.scrollHeight);
    svg.innerHTML = '';
    for (const p of pares) {
      const res = resultados.get(p.id);
      const A = nos.get(p.a), B = nos.get(p.b);
      if (!A || !B || (!res && !p.pendente)) continue;
      const aDir = colA.contains(A), bDir = colA.contains(B);
      const pa = ponto(A, aDir), pb = ponto(B, bDir);
      const dx = Math.max(40, Math.abs(pb.x - pa.x) / 2);
      const d = `M${pa.x},${pa.y} C${pa.x + (aDir ? dx : -dx)},${pa.y} ${pb.x + (bDir ? dx : -dx)},${pb.y} ${pb.x},${pb.y}`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      if (!res) { path.setAttribute('stroke', 'var(--mj-acento)'); path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-dasharray', '5 6'); path.setAttribute('stroke-opacity', '.8'); }
      else {
        const p_ = res.p; const sim = p_ >= limiar;
        path.setAttribute('stroke', sim ? 'var(--mj-bom)' : 'var(--mj-dim)');
        path.setAttribute('stroke-width', String(1 + p_ * 5));
        path.setAttribute('stroke-opacity', sim ? '.9' : '.25');
      }
      svg.append(path);
    }
  }
  new ResizeObserver(() => desenhar()).observe(caixa);

  function probPrincipal(a) {
    if (!a) return 0;
    if (a.type === 'noul') return a.noul;
    if (a.type === 'choice') { const sim = (P.opcoesSim || []); return sim.length ? sim.reduce((s, k) => s + (a.probabilities?.[k] || 0), 0) : Math.max(...Object.values(a.probabilities || { x: 0 })); }
    return (a.score || 0) / Math.max(1, (dPrin.niveis || []).length - 1);
  }

  async function avaliar(bloco) {
    for (const p of bloco) { p.pendente = true; nos.get(p.a)?.classList.add('foco'); nos.get(p.b)?.classList.add('foco'); }
    desenhar();
    let r;
    try { r = await decidir({ pares: bloco.map((p) => ({ id: p.id, a: { ref: p.a }, b: { ref: p.b } })) }, `${bloco.length} pares`); }
    finally { for (const p of bloco) { p.pendente = false; nos.get(p.a)?.classList.remove('foco'); nos.get(p.b)?.classList.remove('foco'); } }
    for (const p of bloco) {
      const resp = (r.pares || {})[p.id] || {};
      const pr = probPrincipal(resp[dPrin.id]);
      resultados.set(p.id, { p: pr, resp });
      const sim = pr >= limiar;
      if (sim) { nos.get(p.a)?.classList.add('ligado'); nos.get(p.b)?.classList.add('ligado'); }
      kSim.textContent = [...resultados.values()].filter((x) => x.p >= limiar).length;
      kNao.textContent = [...resultados.values()].filter((x) => x.p < limiar).length;
      const A = porId.get(p.a) || {}, B = porId.get(p.b) || {};
      const chips = [];
      for (const d of decs) {
        const a = resp[d.id]; if (!a || d === dPrin) continue;
        if (d.tipo === 'choice') { const o = listaOpcoes(d, contexto).find((x) => x.id === a.choice); if (o) chips.push(chip(o.rotulo, { icone: o.icone || '', tom: o.tom || 'acento' })); }
        else if (d.tipo === 'score') chips.push(medidor(a, listaNiveis(d), { compacto: true }));
        else if (a.noul >= (d.limiar ?? 0.5)) chips.push(chip(`${d.rotulo || d.id} ${fmt.pct(a.noul)}`, { tom: d.tom || 'acento' }));
      }
      listaPares.prepend(el('div', { class: 'mj-par' + (sim ? ' sim' : '') }, [
        el('div', { class: 'ab' }, [el('span', { html: `<b>${esc(A[campos.titulo] ?? p.a)}</b>` }), el('span', { class: 'dim', html: `↔ <b>${esc(B[campos.titulo] ?? p.b)}</b>` })]),
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, [anel(pr, { tamanho: 30, cor: sim ? 'var(--mj-bom)' : 'var(--mj-dim)' }), el('b', { style: { color: sim ? 'var(--mj-bom)' : 'var(--mj-mudo)' }, text: sim ? (P.rotuloSimCurto || 'combinam') : (P.rotuloNaoCurto || 'não combinam') }), ...chips]),
      ]));
    }
    desenhar();
  }

  function limpar() {
    resultados.clear(); listaPares.innerHTML = ''; kSim.textContent = '0'; kNao.textContent = '0';
    for (const n of nos.values()) n.classList.remove('ligado', 'foco');
    desenhar();
  }

  async function tocar(sinal) {
    limpar();
    for (let i = 0; i < pares.length; i += lote) {
      await avaliar(pares.slice(i, i + lote));
      sinal.throwIfAborted();
      await sleep(Math.min(P.ritmo || 1300, 2200), sinal);
    }
  }

  requestAnimationFrame(desenhar);
  return { tocar, limpar };
}

// Motor PROVAS (Banco de Provas): roda o Jev em exemplos rotulados e mostra acerto, calibração e o limiar
// que permite automatizar X% das decisões mantendo Y% de acerto — a resposta à pergunta "posso confiar?".
import { el, esc, fmt, sleep, chip, toast } from './ui.js';

export function criar({ spec, area, decidir }) {
  const B = spec.provas || {};
  const lote = Math.max(1, Math.min(30, B.lote || 10));
  let res = []; // {id, texto, rotulo, previsto, conf, ok}

  // ---------- editor da prova ----------
  const tipo = el('select', {}, [el('option', { value: 'choice', text: 'choice (escolher uma opção)' }), el('option', { value: 'noul', text: 'noul (sim ou não)' })]);
  const pergunta = el('textarea', { style: { minHeight: '70px' } });
  const opcoes = el('textarea', { style: { minHeight: '90px' }, placeholder: 'uma opção por linha: id: descrição' });
  const exemplos = el('textarea', { style: { minHeight: '180px' }, placeholder: 'um exemplo por linha: texto ; rótulo certo' });
  function carregar(p) {
    tipo.value = p.pergunta.tipo || 'choice';
    pergunta.value = p.pergunta.pergunta || '';
    opcoes.value = (p.pergunta.opcoes || []).map((o) => `${o.id}: ${o.desc}`).join('\n');
    exemplos.value = (p.exemplos || []).map((e) => `${e.texto} ; ${e.rotulo}`).join('\n');
  }
  carregar({ pergunta: B.pergunta || { tipo: 'choice', pergunta: '' }, exemplos: B.exemplos || [] });
  const btRodar = el('button', { class: 'mj-btn mj-btn--primario', type: 'button', onclick: () => rodar().catch(() => {}) }, ['Rodar a prova']);
  const esquerda = el('section', { class: 'bloco mj-painel-box' }, [
    el('h3', { class: 'mj-sec-t', text: 'A prova (troque pelos seus dados)' }),
    el('label', { text: 'Tipo de pergunta' }), tipo,
    el('label', { text: 'Pergunta ao Jev' }), pergunta,
    el('label', { text: 'Opções (só para choice)' }), opcoes,
    el('label', { text: `Exemplos rotulados (até 120; o Jev vê o texto, nunca o rótulo)` }), exemplos,
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } }, [btRodar]),
  ]);

  // ---------- resultados ----------
  const kAc = el('b', { class: 'mj-num', text: '—' }), kAuto = el('b', { class: 'mj-num', text: '—' }), kAcAuto = el('b', { class: 'mj-num', text: '—' });
  const grandes = el('div', { class: 'mj-grandes' }, [
    el('div', { class: 'mj-contador' }, [kAc, el('span', { text: 'acerto geral' })]),
    el('div', { class: 'mj-contador' }, [kAuto, el('span', { text: 'automatizado' })]),
    el('div', { class: 'mj-contador' }, [kAcAuto, el('span', { text: 'acerto do automatizado' })]),
  ]);
  const slider = el('input', { type: 'range', min: '0.3', max: '0.99', step: '0.01', value: '0.8', 'aria-label': 'Limiar de confiança' });
  const vSlider = el('b', { class: 'mj-num', text: '80%' });
  slider.addEventListener('input', () => { vSlider.textContent = fmt.pct(+slider.value); placar(); });
  const curva = el('div');
  const tabela = el('table', { class: 'mj-tabela' });
  const custoEl = el('p', { class: 'dim', style: { fontSize: '12.5px', margin: '8px 0 0' } });
  const direita = el('section', { class: 'bloco mj-painel-box' }, [
    el('h3', { class: 'mj-sec-t', text: 'O que a prova mostrou' }), grandes,
    el('div', { class: 'mj-limiar' }, [el('span', { text: 'Automatizar quando a confiança for ≥' }), slider, vSlider]),
    el('p', { class: 'dim', style: { fontSize: '12.5px', margin: '0 0 10px' }, text: 'Acima do limiar o sistema age sozinho; abaixo, a decisão vai para uma pessoa. A curva mostra se a confiança do Jev quer dizer alguma coisa no SEU caso.' }),
    curva, custoEl,
    el('div', { style: { maxHeight: '300px', overflow: 'auto', marginTop: '10px' } }, [tabela]),
  ]);
  area.append(el('div', { class: 'mj-lab' }, [esquerda, direita]));

  function ler() {
    const pg = { tipo: tipo.value, pergunta: pergunta.value.trim() };
    if (pg.tipo === 'choice') pg.opcoes = opcoes.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? { id: l.slice(0, i).trim(), desc: l.slice(i + 1).trim() } : { id: l, desc: l }; });
    const ex = exemplos.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 120).map((l, i) => { const k = l.lastIndexOf(';'); return { id: 'e' + i, texto: (k > 0 ? l.slice(0, k) : l).trim(), rotulo: (k > 0 ? l.slice(k + 1) : '').trim() }; });
    return { pg, ex };
  }

  function placar() {
    if (!res.length) return;
    const lim = +slider.value;
    const ok = res.filter((r) => r.ok).length;
    const auto = res.filter((r) => r.conf >= lim);
    const okAuto = auto.filter((r) => r.ok).length;
    kAc.textContent = fmt.pct(ok / res.length);
    kAuto.textContent = fmt.pct(auto.length / res.length);
    kAcAuto.textContent = auto.length ? fmt.pct(okAuto / auto.length) : '—';
    kAcAuto.style.color = auto.length && okAuto / auto.length >= 0.95 ? 'var(--mj-bom)' : auto.length && okAuto / auto.length >= 0.85 ? 'var(--mj-medio)' : 'var(--mj-ruim)';
    desenharCurva(lim);
    tabela.innerHTML = '<tr><th>exemplo</th><th>certo</th><th>Jev</th><th>conf.</th><th></th></tr>' + res.map((r) => `<tr style="opacity:${r.conf >= lim ? 1 : 0.55}"><td>${esc(r.texto.slice(0, 70))}</td><td>${esc(r.rotulo)}</td><td>${esc(r.previsto)}</td><td class="mj-num">${fmt.pct(r.conf)}</td><td class="${r.ok ? 'ok' : 'x'}">${r.ok ? '✓' : '✗'}</td></tr>`).join('');
  }

  function desenharCurva(lim) {
    const bins = [0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
    const pts = [];
    for (let i = 0; i < bins.length - 1; i++) {
      const g = res.filter((r) => r.conf >= bins[i] && r.conf < bins[i + 1]);
      if (g.length) pts.push({ x: (bins[i] + Math.min(1, bins[i + 1])) / 2, y: g.filter((r) => r.ok).length / g.length, n: g.length });
    }
    const W = 520, H = 210, X = (v) => 40 + ((v - 0.5) / 0.5) * (W - 60), Y = (v) => H - 26 - v * (H - 46);
    let s = `<svg class="mj-curva" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de calibração">`;
    for (let v = 0; v <= 1; v += 0.25) s += `<line x1="40" x2="${W - 20}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" stroke-opacity=".08"/><text x="6" y="${Y(v) + 3}">${Math.round(v * 100)}%</text>`;
    for (const v of [0.5, 0.6, 0.7, 0.8, 0.9, 1]) s += `<text x="${X(v) - 10}" y="${H - 8}">${Math.round(v * 100)}%</text>`;
    s += `<line x1="${X(0.5)}" y1="${Y(0.5)}" x2="${X(1)}" y2="${Y(1)}" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="4 4"/>`;
    s += `<rect x="${X(lim)}" y="10" width="${X(1) - X(lim)}" height="${H - 36}" fill="var(--mj-bom)" fill-opacity=".07"/><line x1="${X(lim)}" x2="${X(lim)}" y1="10" y2="${H - 26}" stroke="var(--mj-bom)" stroke-dasharray="3 3"/>`;
    if (pts.length > 1) s += `<polyline fill="none" stroke="var(--mj-acento)" stroke-width="2.5" points="${pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;
    for (const p of pts) s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${4 + Math.min(8, p.n / 3)}" fill="var(--mj-acento)" fill-opacity=".8"><title>${p.n} exemplos: ${Math.round(p.y * 100)}% certos</title></circle>`;
    s += '</svg>';
    curva.innerHTML = s + '<p class="dim" style="font-size:11.5px;margin:4px 0 0;text-align:center">horizontal: confiança do Jev · vertical: acerto de verdade · tracejado: calibração perfeita</p>';
  }

  async function rodar(sinal) {
    const { pg, ex } = ler();
    if (!pg.pergunta) { toast('Escreva a pergunta.', 'erro'); return; }
    if (ex.length < 4) { toast('Coloque pelo menos 4 exemplos rotulados.', 'erro'); return; }
    res = []; tabela.innerHTML = ''; btRodar.disabled = true;
    let custo = 0;
    try {
      for (let i = 0; i < ex.length; i += lote) {
        const bloco = ex.slice(i, i + lote);
        const r = await decidir({ pergunta: pg, exemplos: bloco.map((e) => ({ id: e.id, texto: e.texto })) }, `prova ${i + 1}–${i + bloco.length}`);
        custo += r.custo || 0;
        for (const e of bloco) {
          const a = (r.itens || {})[e.id];
          if (!a) continue;
          let previsto, conf;
          if (a.type === 'noul') { previsto = a.noul >= 0.5 ? 'sim' : 'nao'; conf = Math.max(a.noul, 1 - a.noul); }
          else { previsto = a.choice; conf = a.probabilities?.[a.choice] ?? 0; }
          const certo = norm(e.rotulo);
          res.push({ ...e, previsto, conf, ok: norm(previsto) === certo || (pg.tipo === 'noul' && ((certo === 'sim' && previsto === 'sim') || (['nao', 'não'].includes(certo) && previsto === 'nao'))) });
        }
        placar();
        custoEl.textContent = `Custo da prova: ${fmt.usd(custo)} · 1 milhão de decisões assim: ${fmt.usd((custo / res.length) * 1e6)}`;
        if (sinal) { sinal.throwIfAborted(); await sleep(350, sinal); }
      }
    } finally { btRodar.disabled = false; }
  }

  async function tocar(sinal) {
    carregar({ pergunta: B.pergunta, exemplos: B.exemplos || [] });
    slider.value = '0.5'; vSlider.textContent = '50%';
    await rodar(sinal);
    for (let v = 0.5; v <= 0.951; v += 0.03) { slider.value = String(v); vSlider.textContent = fmt.pct(v); placar(); await sleep(170, sinal); }
  }

  return { tocar };
}
function norm(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
void chip;

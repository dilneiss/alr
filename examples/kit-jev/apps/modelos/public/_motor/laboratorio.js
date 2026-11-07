// Motor LABORATÓRIO (Playground do Jev): monte o estado e as perguntas sem código, veja as probabilidades
// e leve o código pronto (curl, JavaScript, Python) para o seu projeto.
import { el, esc, fmt, sleep, barras, medidor, anel, toast, jsonCor } from './ui.js';

export function criar({ spec, area, decidir }) {
  const L = spec.laboratorio || {};
  const presets = L.presets || [];
  const estado = el('textarea', { spellcheck: 'false', style: { minHeight: '150px' } });
  const lista = el('div', { style: { display: 'grid', gap: '10px' } });
  const presetSel = el('div', { class: 'mj-exemplos' }, presets.map((p, i) => el('button', { class: 'mj-btn mj-btn--sm', type: 'button', onclick: () => { carregar(i); rodar().catch(() => {}); } }, [p.titulo])));
  const btAdd = el('button', { class: 'mj-btn mj-btn--sm', type: 'button', onclick: () => addPergunta({ id: 'p' + (lista.children.length + 1), type: 'noul', instructions: '' }) }, ['+ pergunta']);
  const btRodar = el('button', { class: 'mj-btn mj-btn--primario', type: 'button', onclick: () => rodar().catch(() => {}) }, ['Perguntar ao Jev']);
  const esquerda = el('section', { class: 'bloco mj-painel-box' }, [
    el('h3', { class: 'mj-sec-t', text: 'Exemplos prontos' }), presetSel,
    el('label', { text: 'Estado (os dados, em JSON ou texto)' }), estado,
    el('label', { text: 'Perguntas (até 10)' }), lista,
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } }, [btAdd, btRodar]),
  ]);
  const saida = el('div', { style: { display: 'grid', gap: '10px' } }, [el('p', { class: 'dim', text: 'Escolha um exemplo ou monte o seu e aperte “Perguntar ao Jev”.' })]);
  const codigo = el('pre', { class: 'mj-json', style: { maxHeight: '260px' } });
  const abas = el('div', { class: 'mj-abas', style: { borderRadius: '10px 10px 0 0' } });
  let ling = 'curl';
  for (const l of ['curl', 'javascript', 'python']) { const b = el('button', { type: 'button', class: l === ling ? 'on' : '', text: l }); b.onclick = () => { ling = l; abas.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); mostrarCodigo(); }; abas.append(b); }
  const btCopiar = el('button', { class: 'mj-btn mj-btn--sm', type: 'button', onclick: () => { navigator.clipboard?.writeText(codigo.textContent).then(() => toast('Código copiado.')); } }, ['Copiar código']);
  const direita = el('section', { class: 'bloco mj-painel-box' }, [
    el('h3', { class: 'mj-sec-t', text: 'Respostas do Jev' }), saida,
    el('h3', { class: 'mj-sec-t', style: { marginTop: '16px' } }, ['Leve para o seu projeto', el('span', { class: 'n' }, [btCopiar])]), abas, codigo,
  ]);
  area.append(el('div', { class: 'mj-lab' }, [esquerda, direita]));

  function addPergunta(q) {
    const id = el('input', { value: q.id, 'aria-label': 'id da pergunta', style: { width: '130px' } });
    const tp = el('select', { 'aria-label': 'tipo' }, ['choice', 'score', 'noul'].map((t) => el('option', { value: t, text: t })));
    tp.value = q.type;
    const ins = el('textarea', { style: { minHeight: '56px' }, 'aria-label': 'instruções' });
    ins.value = q.instructions || '';
    const crit = el('textarea', { style: { minHeight: '60px' }, placeholder: 'choice: id: descrição (uma por linha) · score: um nível por linha', 'aria-label': 'critérios' });
    crit.value = q.type === 'choice' ? Object.entries(q.criteria || {}).map(([k, v]) => `${k}: ${v}`).join('\n') : q.type === 'score' ? (q.criteria || []).join('\n') : '';
    const rm = el('button', { class: 'mj-btn mj-btn--sm mj-btn--ghost', type: 'button', onclick: () => box.remove() }, ['remover']);
    const box = el('div', { class: 'mj-card-analise' }, [el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' } }, [id, tp, rm]), ins, crit]);
    box._ler = () => {
      const q2 = { type: tp.value, instructions: ins.value.trim() };
      if (tp.value === 'choice') q2.criteria = Object.fromEntries(crit.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, l]; }));
      if (tp.value === 'score') q2.criteria = crit.value.split('\n').map((l) => l.trim()).filter(Boolean);
      return [id.value.trim() || 'p', q2];
    };
    lista.append(box);
  }

  function carregar(i) {
    const p = presets[i]; if (!p) return;
    estado.value = typeof p.state === 'string' ? p.state : JSON.stringify(p.state, null, 2);
    lista.innerHTML = '';
    for (const [id, q] of Object.entries(p.questions)) addPergunta({ id, ...q });
  }

  function montar() {
    let st = estado.value.trim();
    try { st = JSON.parse(st); } catch { /* texto puro vale */ }
    const questions = Object.fromEntries([...lista.children].map((b) => b._ler()));
    return { state: st, questions };
  }

  function mostrarCodigo() {
    const { state, questions } = montar();
    const corpo = JSON.stringify({ model: 'typesafe/jev-1.13', state, questions }, null, 2);
    if (ling === 'curl') codigo.textContent = `curl https://openrouter.ai/api/alpha/decisions \\\n  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${corpo.replace(/'/g, "'\\''")}'`;
    else if (ling === 'javascript') codigo.textContent = `const r = await fetch('https://openrouter.ai/api/alpha/decisions', {\n  method: 'POST',\n  headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify(${corpo.replace(/\n/g, '\n  ')}),\n});\nconst { answers } = await r.json();\nconsole.log(answers);`;
    else codigo.textContent = `import os, requests\n\ncorpo = ${corpo.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None')}\nr = requests.post('https://openrouter.ai/api/alpha/decisions', json=corpo,\n                  headers={'Authorization': 'Bearer ' + os.environ['OPENROUTER_API_KEY']})\nprint(r.json()['answers'])`;
  }

  async function rodar() {
    const { state, questions } = montar();
    mostrarCodigo();
    btRodar.disabled = true;
    try {
      const r = await decidir({ state, questions }, 'playground');
      saida.innerHTML = '';
      saida.append(el('p', { class: 'dim', style: { margin: 0, fontSize: '12.5px' }, text: `${Object.keys(questions).length} pergunta(s) numa chamada · ${fmt.ms(r.latencia_ms)} · ${fmt.usd(r.custo)}` }));
      for (const [id, a] of Object.entries(r.respostas || {})) {
        if (!a) continue;
        const b = el('div', { class: 'mj-card-analise' }, [el('div', { class: 'ref', html: `<b>${esc(id)}</b> · ${esc(a.type)}` })]);
        if (a.type === 'choice') b.append(barras(a.probabilities));
        else if (a.type === 'score') b.append(medidor(a, Object.values(a.legend || {}).map((x) => ({ rotulo: String(x).slice(0, 40) }))), barras(a.probabilities, { rotulos: a.legend || {} }));
        else b.append(el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, [anel(a.noul, { tamanho: 44 }), el('span', { text: `chance de "sim": ${fmt.pct(a.noul, 1)}` })]));
        saida.append(b);
      }
      saida.append(el('details', {}, [el('summary', { class: 'dim', style: { cursor: 'pointer', fontSize: '12.5px' }, text: 'ver a resposta bruta (JSON)' }), el('pre', { class: 'mj-json', html: jsonCor(r.respostas) })]));
    } finally { btRodar.disabled = false; }
  }

  async function tocar(sinal) {
    for (let i = 0; i < presets.length; i++) {
      carregar(i);
      await sleep(600, sinal);
      await rodar();
      sinal.throwIfAborted();
      await sleep(L.pausa || 3200, sinal);
    }
  }

  if (presets.length) { carregar(0); mostrarCodigo(); }
  return { tocar };
}

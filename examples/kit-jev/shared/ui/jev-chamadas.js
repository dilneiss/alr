/* Visualizador das chamadas do Jev de um diagrama (o nó ⚡ JEV → "{ } JSON" e "⤢ Tela cheia").
   Mostra um EXEMPLO REAL de cada app (capturado por report/exemplos/capturar.py) como modelo: cada chamada, cada
   pergunta com o tipo (◉ escolha · ▮ nota · ◐ sim/não), a resposta e o JSON exato que foi e que voltou.
   Dados: /_jev/diagramas/<id>-jev.json (gerados por report/build_arquiteturas.py) ou window.__JEV_CHAMADAS__[id] (página offline).
   Uso: JevChamadas.abrir('golpe', { aba: 'tabela' | 'json' | 'tipos', base: '/_jev/diagramas' })
   Autossuficiente: injeta o próprio CSS (funciona dentro dos apps, no hub e na página de diagramas). */
(function () {
  if (window.JevChamadas) return;
  const TIPOS = { choice: ['◉', 'escolha', '#67e8f9'], score: ['▮', 'nota', '#fbbf24'], noul: ['◐', 'sim/não', '#c4b5fd'] };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (p) => (p == null ? '—' : p * 100 >= 1 || p === 0 ? `${Math.round(p * 100)}%` : '<1%');
  const num = (v, c = 2) => (typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: c }) : String(v));
  const usd = (v) => (typeof v === 'number' ? 'US$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v < 0.001 ? 6 : 4, maximumFractionDigits: v < 0.001 ? 6 : 4 }) : '—');
  const cache = {};

  const ESTILO = `
.jev-ch{position:fixed;inset:0;margin:auto;width:calc(100vw - 32px);height:calc(100dvh - 32px);max-width:none;max-height:none;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#0b0e15;color:#e5e7eb;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 30px 120px rgba(0,0,0,.7);overflow:hidden}
.jev-ch[open]{display:flex;flex-direction:column}
.jev-ch::backdrop{background:rgba(3,4,8,.78);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.jev-ch *{box-sizing:border-box}
.jev-ch-cab{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(34,211,238,.07),transparent)}
.jev-ch-logo{font:900 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;padding:7px 10px;border-radius:9px;color:#0b0e15;background:linear-gradient(135deg,#22d3ee,#a78bfa)}
.jev-ch-tt{display:flex;flex-direction:column;min-width:0;flex:1}
.jev-ch-tt b{font-size:17px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jev-ch-tt small{color:#9ca3af;font-size:12.5px}
.jev-ch-tipos{display:flex;gap:6px;flex-wrap:wrap}
.jev-ch-pl{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;border:1px solid;font:700 12px/1.4 ui-monospace,Menlo,monospace;white-space:nowrap}
.jev-ch-pl.zero{opacity:.35}
.jev-ch-x{margin-left:auto;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:10px;width:36px;height:36px;font-size:16px;cursor:pointer}
.jev-ch-x:hover{border-color:#22d3ee}
.jev-ch-abas{display:flex;gap:6px;padding:10px 18px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.jev-ch-abas button{font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#9ca3af;background:none;border:0;border-bottom:2px solid transparent;padding:8px 12px 10px;cursor:pointer}
.jev-ch-abas button[aria-selected="true"]{color:#fff;border-bottom-color:#22d3ee}
.jev-ch-abas button:focus-visible,.jev-ch button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,.45);border-radius:8px}
.jev-ch-corpo{flex:1;min-height:0;overflow:auto;padding:16px 18px 40px}
.jev-ch-nota{color:#9ca3af;font-size:13px;margin:0 0 14px;max-width:1000px}
.jev-ch-nota b{color:#e5e7eb}
.jev-ch-cham{border:1px solid rgba(255,255,255,.09);border-radius:14px;margin:0 0 14px;background:rgba(255,255,255,.02)}
.jev-ch-cham>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 14px}
.jev-ch-cham>summary::-webkit-details-marker{display:none}
.jev-ch-cham>summary::before{content:"▸";color:#67e8f9;transition:transform .15s}
.jev-ch-cham[open]>summary::before{transform:rotate(90deg)}
.jev-ch-cham>summary b{color:#fff;font-size:15px}
.jev-ch-met{font:12px ui-monospace,Menlo,monospace;color:#a5f3fc}
.jev-ch-tab{width:100%;border-collapse:collapse;font-size:13px}
.jev-ch-tab th{text-align:left;font:800 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;padding:8px 10px;border-top:1px solid rgba(255,255,255,.07)}
.jev-ch-tab td{padding:10px;border-top:1px solid rgba(255,255,255,.06);vertical-align:top}
.jev-ch-tab tr:hover td{background:rgba(255,255,255,.02)}
.jev-ch-id{font:700 12px ui-monospace,Menlo,monospace;color:#e5e7eb;white-space:nowrap}
.jev-ch-inst{color:#aeb5c2;margin-top:3px;max-width:520px}
.jev-ch-inst.corte{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.jev-ch-t{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;border:1px solid;font:700 11.5px/1.5 ui-monospace,Menlo,monospace;white-space:nowrap}
.jev-ch-res{min-width:260px}
.jev-ch-bar{display:grid;grid-template-columns:minmax(0,1fr) 90px 44px;gap:8px;align-items:center;margin:2px 0}
.jev-ch-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#9ca3af}
.jev-ch-bar.top span{color:#fff;font-weight:700}
.jev-ch-bar i{display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.08);position:relative;overflow:hidden}
.jev-ch-bar i::after{content:"";position:absolute;inset:0;width:var(--p);background:#4b5563;border-radius:3px}
.jev-ch-bar.top i::after{background:linear-gradient(90deg,#22d3ee,#a78bfa)}
.jev-ch-bar em{font:700 11.5px ui-monospace,Menlo,monospace;font-style:normal;text-align:right;color:#9ca3af}
.jev-ch-bar.top em{color:#67e8f9}
.jev-ch-mais{margin-top:6px;background:none;border:0;color:#67e8f9;font:700 12px -apple-system,sans-serif;cursor:pointer;padding:0}
.jev-ch-ops{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)}
.jev-ch-op{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.06)}
.jev-ch-op:last-child{border-bottom:0}
.jev-ch-op code{font:700 11.5px ui-monospace,Menlo,monospace;color:#e5e7eb}
.jev-ch-op div{color:#9ca3af;font-size:12.5px}
.jev-ch-op em{font:700 11.5px ui-monospace,Menlo,monospace;font-style:normal;text-align:right;color:#9ca3af}
.jev-ch-op.top code,.jev-ch-op.top em{color:#67e8f9}
.jev-ch-json{display:flex;flex-direction:column;gap:10px}
.jev-ch-barra{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.jev-ch-chip{font:700 12px -apple-system,sans-serif;color:#cbd5e1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:5px 11px;cursor:pointer}
.jev-ch-chip[aria-pressed="true"]{color:#0b0e15;background:#67e8f9;border-color:#67e8f9}
.jev-ch-copiar{margin-left:auto;font:700 12px -apple-system,sans-serif;color:#fff;background:rgba(34,211,238,.14);border:1px solid rgba(34,211,238,.5);border-radius:9px;padding:6px 12px;cursor:pointer}
.jev-ch pre{margin:0;padding:14px 16px;border-radius:12px;background:#07090e;border:1px solid rgba(255,255,255,.08);font:12.5px/1.55 ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;overflow:auto}
.jev-ch pre .k{color:#93c5fd}.jev-ch pre .s{color:#86efac}.jev-ch pre .n{color:#fbbf24}.jev-ch pre .b{color:#f0abfc}
.jev-ch-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.jev-ch-3>div{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;background:rgba(255,255,255,.02);min-width:0}
.jev-ch-3 h3{margin:0 0 4px;font-size:16px;display:flex;align-items:center;gap:8px}
.jev-ch-3 p{margin:0 0 10px;color:#9ca3af;font-size:13px}
.jev-ch-3 h4{margin:12px 0 6px;font:800 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6b7280}
.jev-ch-vazio{color:#6b7280;font-style:italic}
@media (max-width:900px){.jev-ch-3{grid-template-columns:1fr}.jev-ch-res{min-width:0}.jev-ch-tab th:nth-child(3),.jev-ch-tab td:nth-child(3){display:none}}
@media (max-width:620px){.jev-ch{width:100vw;height:100dvh;border-radius:0}.jev-ch-tab,.jev-ch-tab tbody,.jev-ch-tab tr,.jev-ch-tab td{display:block;width:100%}.jev-ch-tab thead{display:none}.jev-ch-tab td{border-top:0;padding:6px 10px}.jev-ch-tab tr{border-top:1px solid rgba(255,255,255,.08);padding:6px 0}}
@media (prefers-reduced-motion:reduce){.jev-ch-cham>summary::before{transition:none}}`;

  function highlight(obj) {
    return esc(JSON.stringify(obj, null, 2))
      .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/(:\s*|^\s*|\[\s*|,\s*)(&quot;(?:[^&]|&(?!quot;))*?&quot;)/gm, '$1<span class="s">$2</span>')
      .replace(/(:\s*|^\s*)(-?\d+(?:\.\d+)?(?:e-?\d+)?)(?=,?$)/gim, '$1<span class="n">$2</span>')
      .replace(/(:\s*)(true|false|null)/g, '$1<span class="b">$2</span>');
  }
  const pilula = (t, n, rot) => { const [s, nome, cor] = TIPOS[t]; return `<span class="jev-ch-pl${n === 0 ? ' zero' : ''}" style="color:${cor};border-color:${cor}88">${s} ${n == null ? '' : n + ' '}${rot || nome}</span>`; };
  const selo = (t, extra) => { const [s, nome, cor] = TIPOS[t] || ['?', t, '#9ca3af']; return `<span class="jev-ch-t" style="color:${cor};border-color:${cor}99">${s} ${esc(extra || nome)}</span>`; };

  function descricaoTipo(q) {
    if (q.type === 'choice') return `escolha entre ${Object.keys(q.criteria || {}).length}`;
    if (q.type === 'score') return `nota de 0 a ${(Array.isArray(q.criteria) ? q.criteria.length : Object.keys(q.criteria || {}).length) - 1}`;
    return 'sim ou não';
  }
  function barras(itens) {
    return itens.map(([rot, p], i) => `<div class="jev-ch-bar${i === 0 ? ' top' : ''}"><span title="${esc(rot)}">${esc(rot)}</span><i style="--p:${Math.round(Math.max(0, Math.min(1, p || 0)) * 100)}%"></i><em>${pct(p)}</em></div>`).join('');
  }
  function resposta(q, a, uid) {
    if (!a) return '<span class="jev-ch-vazio">sem resposta</span>';
    if (q.type === 'choice') {
      const crit = q.criteria || {};
      const rank = Object.entries(a.probabilities || {}).sort((x, y) => y[1] - x[1]);
      const top = rank.slice(0, 3).map(([id, p]) => [id, p]);
      const ops = rank.map(([id, p]) => `<div class="jev-ch-op${id === a.choice ? ' top' : ''}"><div><code>${esc(id)}</code> · ${esc(crit[id] || '')}</div><em>${pct(p)}</em></div>`).join('');
      return `${barras(top)}${rank.length > 3 ? `<button type="button" class="jev-ch-mais" data-abre="${uid}">ver as ${rank.length} opções e os critérios</button><div class="jev-ch-ops" id="${uid}" hidden>${ops}</div>` : ''}`;
    }
    if (q.type === 'score') {
      const leg = a.legend || {};
      const niveis = Object.entries(a.probabilities || {}).sort((x, y) => Number(x[0]) - Number(y[0]));
      const perto = String(Math.round(a.score));
      return `<div class="jev-ch-bar top"><span>${num(a.score)} · ${esc((leg[perto] || '').split(':')[0])}</span><i style="--p:${niveis.length > 1 ? Math.round((a.score / (niveis.length - 1)) * 100) : 0}%"></i><em>${num(a.score, 1)}</em></div>`
        + `<button type="button" class="jev-ch-mais" data-abre="${uid}">ver a distribuição pelos ${niveis.length} níveis</button><div class="jev-ch-ops" id="${uid}" hidden>${niveis.map(([k, p]) => `<div class="jev-ch-op${k === perto ? ' top' : ''}"><div><code>${esc(k)}</code> · ${esc(leg[k] || (Array.isArray(q.criteria) ? q.criteria[+k] : ''))}</div><em>${pct(p)}</em></div>`).join('')}</div>`;
    }
    const p = typeof a.noul === 'number' ? a.noul : a.probability;
    const crit = q.criteria || {};
    return barras([[`sim · ${crit.true ? crit.true : ''}`.replace(/ · $/, ''), p]]) + (crit.false ? `<div class="jev-ch-bar"><span>não · ${esc(crit.false)}</span><i style="--p:${Math.round((1 - (p || 0)) * 100)}%"></i><em>${pct(1 - (p || 0))}</em></div>` : '');
  }

  function abaTabela(d) {
    let uid = 0;
    return `<p class="jev-ch-nota">Cada chamada abaixo é uma ida ao Jev: o app manda o <b>estado</b> (os dados do momento) e as <b>perguntas tipadas</b>, e o Jev devolve <b>probabilidades</b> em uma passada. Este é um <b>exemplo real</b> capturado rodando o app, mostrado como modelo${d.fonte && d.fonte !== d.id ? ` (é o exemplo do app <b>${esc(d.fonte)}</b>)` : ''}.</p>`
      + d.chamadas.map((c, i) => `<details class="jev-ch-cham"${i === 0 || d.chamadas.length <= 2 ? ' open' : ''}>
        <summary><b>${esc(c.rotulo)}</b><span class="jev-ch-met">${c.n_perguntas} pergunta${c.n_perguntas === 1 ? '' : 's'} · ${c.latency_ms != null ? num(c.latency_ms, 0) + ' ms' : '—'} · ${usd(c.cost)}${c.cached ? ' · cache' : ''}</span>${Object.keys(TIPOS).map((t) => pilula(t, c.tipos[t])).join('')}</summary>
        <table class="jev-ch-tab"><thead><tr><th>pergunta</th><th>tipo</th><th>o que o Jev respondeu</th></tr></thead><tbody>
        ${Object.entries(c.perguntas).map(([qid, q]) => `<tr><td><div class="jev-ch-id">${esc(qid)}</div><div class="jev-ch-inst corte" title="clique para ler tudo">${esc(q.instructions || '')}</div></td><td>${selo(q.type, descricaoTipo(q))}</td><td class="jev-ch-res">${resposta(q, c.respostas[qid], `jevch-${d.id}-${i}-${uid++}`)}</td></tr>`).join('')}
        </tbody></table></details>`).join('');
  }
  function abaJson(d, st) {
    const c = d.chamadas[st.chamada] || d.chamadas[0];
    const vistas = { requisicao: ['Requisição (o que foi)', { model: c.modelo, state: c.estado, questions: c.perguntas }], resposta: ['Resposta (o que voltou)', { answers: c.respostas }],
      estado: ['Só o estado', c.estado], perguntas: ['Só as perguntas', c.perguntas] };
    const [, obj] = vistas[st.vista] || vistas.requisicao;
    st.atual = obj;
    return `<div class="jev-ch-json"><p class="jev-ch-nota">O JSON exato desta chamada do exemplo. A requisição vai do app para o gateway, e dele para <b>POST /api/alpha/decisions</b> no OpenRouter; a resposta volta com uma entrada por pergunta.</p>
      ${d.chamadas.length > 1 ? `<div class="jev-ch-barra">${d.chamadas.map((cc, i) => `<button type="button" class="jev-ch-chip" data-chamada="${i}" aria-pressed="${i === st.chamada}">${esc(cc.rotulo)}</button>`).join('')}</div>` : ''}
      <div class="jev-ch-barra">${Object.entries(vistas).map(([k, [rot]]) => `<button type="button" class="jev-ch-chip" data-vista="${k}" aria-pressed="${k === st.vista}">${rot}</button>`).join('')}<button type="button" class="jev-ch-copiar" data-copiar>Copiar JSON</button></div>
      <pre>${highlight(obj)}</pre></div>`;
  }
  function abaTipos(d) {
    const exemplo = (t) => {
      for (const c of d.chamadas) for (const [qid, q] of Object.entries(c.perguntas)) if (q && q.type === t) return { qid, q, a: c.respostas[qid] };
      return null;
    };
    const curto = (q) => {
      const o = { type: q.type, instructions: q.instructions };
      if (Array.isArray(q.criteria)) o.criteria = q.criteria.length > 4 ? [...q.criteria.slice(0, 4), `… mais ${q.criteria.length - 4}`] : q.criteria;
      else if (q.criteria) { const e = Object.entries(q.criteria); o.criteria = Object.fromEntries(e.length > 3 ? [...e.slice(0, 3), ['…', `mais ${e.length - 3} opções`]] : e); }
      return o;
    };
    const curtoR = (a) => { if (!a) return a; const o = { ...a }; if (o.probabilities) { const e = Object.entries(o.probabilities).sort((x, y) => y[1] - x[1]); o.probabilities = Object.fromEntries(e.length > 6 ? [...e.slice(0, 5), ['…', `mais ${e.length - 5}`]] : e); } if (o.legend) o.legend = '{ …um texto por nível… }'; return o; };
    const QUE = {
      choice: ['Escolha entre opções que nós escrevemos.', 'a opção escolhida + a probabilidade de CADA opção (dá para ranquear, sortear, mostrar %)'],
      score: ['Nota numa escala de níveis descritos.', 'um número (pode ser fracionário, ex.: 2,35) + a distribuição pelos níveis'],
      noul: ['Sim ou não.', 'uma probabilidade de "sim", entre 0 e 1'],
    };
    return `<p class="jev-ch-nota">Os 3 tipos de pergunta do Jev. Os modelos abaixo saem deste exemplo (perguntas e respostas reais, encurtadas).</p><div class="jev-ch-3">${Object.keys(TIPOS).map((t) => {
      const ex = exemplo(t), n = d.tipos[t];
      return `<div><h3>${selo(t)} ${n ? `<small style="color:#9ca3af;font-weight:600">${n} neste exemplo</small>` : '<small class="jev-ch-vazio">não usado neste exemplo</small>'}</h3><p>${QUE[t][0]} Volta: ${QUE[t][1]}.</p>${ex ? `<h4>vai (a pergunta "${esc(ex.qid)}")</h4><pre>${highlight(curto(ex.q))}</pre><h4>volta</h4><pre>${highlight(curtoR(ex.a))}</pre>` : ''}</div>`;
    }).join('')}</div>`;
  }

  let dlg = null;
  function montar() {
    if (dlg) return dlg;
    const st = document.createElement('style'); st.textContent = ESTILO; document.head.append(st);
    dlg = document.createElement('dialog');
    dlg.className = 'jev-ch';
    dlg.setAttribute('aria-labelledby', 'jev-ch-titulo');
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => {
      const t = e.target;
      if (t === dlg) { dlg.close(); return; } // clique no fundo escurecido
      const b = t.closest('button');
      if (t.closest('.jev-ch-inst')) { t.closest('.jev-ch-inst').classList.toggle('corte'); return; }
      if (!b) return;
      if (b.classList.contains('jev-ch-x')) dlg.close();
      else if (b.dataset.aba) render(b.dataset.aba);
      else if (b.dataset.abre) { const o = document.getElementById(b.dataset.abre); if (o) { o.hidden = !o.hidden; b.textContent = o.hidden ? b.textContent.replace(/^esconder/, 'ver') : b.textContent.replace(/^ver/, 'esconder'); } }
      else if (b.dataset.chamada) { dlg._st.chamada = +b.dataset.chamada; render('json'); }
      else if (b.dataset.vista) { dlg._st.vista = b.dataset.vista; render('json'); }
      else if (b.hasAttribute('data-copiar')) {
        const txt = JSON.stringify(dlg._st.atual, null, 2);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { b.textContent = 'Copiado ✓'; setTimeout(() => { b.textContent = 'Copiar JSON'; }, 1600); }, () => { b.textContent = 'Selecione e copie'; });
      }
    });
    return dlg;
  }
  function render(aba) {
    const d = dlg._d, st = dlg._st;
    st.aba = aba;
    const abas = [['tabela', 'Perguntas e respostas'], ['json', '{ } JSON'], ['tipos', 'Os 3 tipos']];
    dlg.innerHTML = `<header class="jev-ch-cab"><span class="jev-ch-logo">⚡ JEV</span><div class="jev-ch-tt"><b id="jev-ch-titulo">Chamadas do Jev · ${esc(d.emoji || '')} ${esc(d.titulo)}</b><small>Exemplo real${d.capturado ? ` capturado em ${esc(d.capturado)}` : ''} · ${d.chamadas.length} chamada${d.chamadas.length === 1 ? '' : 's'} · ${d.n_perguntas} perguntas</small></div>
      <div class="jev-ch-tipos">${Object.keys(TIPOS).map((t) => pilula(t, d.tipos[t])).join('')}</div><button type="button" class="jev-ch-x" aria-label="Fechar (Esc)">✕</button></header>
      <nav class="jev-ch-abas" role="tablist">${abas.map(([k, rot]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${k === aba}">${rot}</button>`).join('')}</nav>
      <div class="jev-ch-corpo" role="tabpanel">${aba === 'json' ? abaJson(d, st) : aba === 'tipos' ? abaTipos(d) : abaTabela(d)}</div>`;
    const alvo = dlg.querySelector(`[data-aba="${aba}"]`);
    if (alvo) alvo.focus({ preventScroll: true });
  }
  async function carregar(id, base) {
    if (window.__JEV_CHAMADAS__ && window.__JEV_CHAMADAS__[id]) return window.__JEV_CHAMADAS__[id];
    if (!cache[id]) cache[id] = fetch(`${base}/${encodeURIComponent(id)}-jev.json`).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).catch((e) => { delete cache[id]; throw e; });
    return cache[id];
  }
  async function abrir(id, opts) {
    opts = opts || {};
    let d;
    try { d = await carregar(id, opts.base || '/_jev/diagramas'); }
    catch (e) { alert('Não consegui carregar as chamadas do Jev deste diagrama agora.'); return false; }
    const el = montar();
    el._d = d; el._st = { chamada: 0, vista: 'requisicao', atual: null };
    render(opts.aba || 'tabela');
    if (!el.open) el.showModal();
    return true;
  }
  window.JevChamadas = { abrir, fechar: () => dlg && dlg.open && dlg.close(), aberto: () => !!(dlg && dlg.open) };
})();

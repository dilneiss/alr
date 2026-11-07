// Motor AGENTE: um agente (simulado) propõe ações e o Jev decide cada uma antes de executar;
// ou, no modo roteador, cada pedido vai para a opção certa (modelo, ferramenta, fila).
import { el, esc, fmt, sleep, barras, medidor, anel, chip, listaOpcoes, listaNiveis } from './ui.js';

export function criar({ spec, area, decidir, contexto }) {
  const G = spec.agente || {};
  const modo = G.modo || 'passos';
  const skin = G.skin || (modo === 'roteador' ? 'roteador' : 'console');
  const decs = (spec.decisoes || []).filter((d) => d.papel !== 'oculto');
  const decVer = decs.find((d) => d.id === G.veredito) || decs.find((d) => d.tipo === 'choice');
  const opsVer = decVer ? listaOpcoes(decVer, contexto) : [];
  const roteiros = spec.roteiros || [];
  let rot = 0;
  const cont = {};

  // ---------- sessão ----------
  const lista = el('div', { class: 'mj-sessao-lista', 'aria-live': 'polite' });
  const botoesRot = el('div', { class: 'mj-exemplos' }, roteiros.map((r, i) => el('button', { class: 'mj-btn mj-btn--sm' + (i === 0 ? ' mj-btn--primario' : ''), type: 'button', onclick: () => trocar(i) }, [r.titulo || `Cenário ${i + 1}`])));
  const pagina = skin === 'navegador' ? el('div', { class: 'mj-pagina' }) : null;
  const campo = el('input', { type: 'text', placeholder: G.placeholder || (modo === 'roteador' ? 'Escreva um pedido e veja para onde o Jev manda…' : 'Escreva um pedido para o agente…'), style: { flex: 1, minWidth: 0, height: '38px', borderRadius: '10px', border: '1px solid var(--mj-borda2)', background: 'var(--mj-bg)', color: 'var(--mj-texto)', padding: '0 12px', font: '14px var(--mj-f)' } });
  const meu = el('form', { class: 'mj-compor', onsubmit: (e) => { e.preventDefault(); pedidoMeu(); } }, [campo, el('button', { class: 'mj-btn mj-btn--primario', type: 'submit' }, [modo === 'roteador' ? 'Rotear' : 'Avaliar'])]);
  const sessao = el('section', { class: 'mj-sessao mj-painel-box skin-' + skin }, [
    el('div', { class: 'mj-palco-cab' }, [el('span', { class: 'av', text: G.avatar || spec.emoji }), el('div', {}, [el('b', { text: G.titulo || spec.titulo }), el('span', { text: G.subtitulo || '' })]), el('div', { style: { marginLeft: 'auto' } }, [botoesRot])]),
    pagina, lista, meu,
  ]);

  // ---------- veredictos ----------
  const lado = el('section', { class: 'mj-veredictos' });
  let politica = null;
  if (spec.editavel) {
    politica = el('textarea', { 'aria-label': spec.editavel.rotulo || 'Política' });
    politica.value = contexto[spec.editavel.campo] || '';
    lado.append(el('div', { class: 'mj-politica mj-painel-box' }, [el('h3', { class: 'mj-sec-t', text: spec.editavel.rotulo || 'Política (o Jev lê isto a cada decisão)' }), politica, el('p', { class: 'dim', style: { fontSize: '12px', margin: '8px 0 0' }, text: spec.editavel.ajuda || 'Mude a política e rode de novo: as decisões mudam junto.' })]));
  }
  const contadores = el('div', { class: 'mj-contadores' });
  const nCont = {};
  const porOpcao = modo === 'passos' && opsVer.length <= 5;
  if (porOpcao) for (const o of opsVer) { const b = el('b', { text: '0', style: { color: corTom(o.tom) } }); nCont[o.id] = b; contadores.append(el('div', { class: 'mj-contador' }, [b, el('span', { text: (o.icone ? o.icone + ' ' : '') + o.rotulo })])); }
  else if (modo === 'passos') for (const [k, rot, cor] of [['__total', 'passos decididos', 'var(--mj-texto)'], ['__conf', 'o Jev decidiu', 'var(--mj-bom)'], ['__inc', G.rotuloIncerto || 'incertos', 'var(--mj-medio)']]) { const b = el('b', { text: '0', style: { color: cor } }); nCont[k] = b; contadores.append(el('div', { class: 'mj-contador' }, [b, el('span', { text: rot })])); }
  const grade = el('div', { class: 'mj-opcoes-grade' });
  const tiles = {};
  if (modo === 'roteador') {
    for (const o of opsVer) {
      const t = el('div', { class: 'mj-opcao' }, [el('span', { class: 'pp', text: '' }), el('div', { class: 'nm' }, [o.icone || '', ' ', o.rotulo]), el('div', { class: 'ds', text: o.desc || '' }), el('span', { class: 'pb' })]);
      tiles[o.id] = t; grade.append(t);
    }
  }
  const extraBox = el('div', { class: 'mj-render' });
  lado.append(
    modo === 'passos' ? el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', { text: G.tituloContadores || 'Decisões do Jev' }), contadores]) : el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', {}, [decVer ? (decVer.titulo || decVer.id) : 'Destino', el('span', { class: 'tp', text: `${opsVer.length} opções` })]), grade]),
    extraBox,
  );
  area.append(el('div', { class: 'mj-agente' }, [sessao, lado]));

  function corTom(t) { return t === 'bom' ? 'var(--mj-bom)' : t === 'medio' ? 'var(--mj-medio)' : t === 'ruim' ? 'var(--mj-ruim)' : t === 'info' ? 'var(--mj-info)' : 'var(--mj-acento)'; }

  function pintarPagina(destacar, incerto) {
    if (!pagina) return;
    const els = (G.pagina && G.pagina.elementos) || [];
    pagina.innerHTML = '';
    if (G.pagina && G.pagina.titulo) pagina.append(el('div', { style: { fontWeight: 700, marginBottom: '8px' }, text: G.pagina.titulo }));
    for (const e of els) pagina.append(el('span', { class: 'el' + (e.id === destacar ? (incerto ? ' alvo incerto' : ' alvo') : ''), text: e.rotulo, title: e.id }));
  }

  // ---------- passos ----------
  async function avaliarPasso(pedido, passo, historico) {
    const card = el('div', { class: 'mj-passo pensando' }, [
      el('div', { class: 'fer', text: passo.ferramenta + (passo.args && typeof passo.args === 'object' && G.mostrarArgs !== false ? '' : '') }),
      el('div', { class: 'arg', text: typeof passo.args === 'string' ? passo.args : JSON.stringify(passo.args) }),
      passo.descricao ? el('div', { class: 'ds', text: passo.descricao }) : null,
      passo.fatos ? el('div', { class: 'ds', html: '🧮 <b>calculado pelo código:</b> ' + Object.entries(passo.fatos).map(([k, v]) => `${esc(k.replace(/_/g, ' '))}: <b>${esc(v)}</b>`).join(' · ') }) : null,
      el('div', { class: 'carimbo' }, [el('span', { class: 'mj-estado-jev pensando' }, [el('i'), el('span', { text: 'o Jev está decidindo…' })])]),
    ]);
    lista.append(card); lista.scrollTop = lista.scrollHeight;
    let r;
    try { r = await decidir({ pedido, passo, historico, ajustes: politica && politica.value !== (contexto[spec.editavel.campo] || '') ? politica.value : undefined }, passo.ferramenta); }
    catch (e) { card.classList.remove('pensando'); card.querySelector('.carimbo').innerHTML = '<span class="mj-chip ruim">sem resposta</span>'; throw e; }
    card.classList.remove('pensando');
    const resp = r.respostas || {};
    const a = decVer && resp[decVer.id];
    const o = a && opsVer.find((x) => x.id === a.choice);
    const slot = card.querySelector('.carimbo'); slot.innerHTML = '';
    if (o) {
      const conf = a.probabilities?.[a.choice] ?? 0;
      let tom = o.tom || 'info';
      let rot = o.carimbo || o.rotulo;
      if (G.limiarHumano && conf < G.limiarHumano) { tom = 'medio'; rot = G.rotuloIncerto || 'LLM assume'; }
      slot.append(el('span', { class: 'mj-carimbo ' + tom }, [(o.icone ? o.icone + ' ' : '') + rot, el('small', { text: `${fmt.pct(conf)} · ${fmt.ms(r.latencia_ms)}` })]));
      cont[o.id] = (cont[o.id] || 0) + 1; if (nCont[o.id]) nCont[o.id].textContent = cont[o.id];
      const incerto = !!(G.limiarHumano && conf < G.limiarHumano);
      for (const [k, cond] of [['__total', true], ['__conf', !incerto], ['__inc', incerto]]) if (cond && nCont[k]) { cont[k] = (cont[k] || 0) + 1; nCont[k].textContent = cont[k]; }
      if (G.alvoPagina && resp[G.alvoPagina]) pintarPagina(resp[G.alvoPagina].choice, incerto);
    }
    // outras decisões em chips
    const extras = el('div', { style: { gridColumn: '1 / 3', display: 'flex', gap: '6px', flexWrap: 'wrap' } });
    for (const d of decs) {
      if (d === decVer || !resp[d.id]) continue;
      const x = resp[d.id];
      if (d.tipo === 'score') extras.append(el('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: '12px' } }, [el('span', { class: 'dim', text: d.titulo || d.id }), medidor(x, listaNiveis(d), { compacto: true, inverter: d.inverter })]));
      else if (d.tipo === 'noul' && x.noul >= (d.limiar ?? 0.5)) extras.append(chip(`${d.rotulo || d.titulo || d.id} ${fmt.pct(x.noul)}`, { tom: d.tom || 'ruim', icone: d.icone || '' }));
      else if (d.tipo === 'choice') { const oo = listaOpcoes(d, contexto).find((z) => z.id === x.choice); if (oo) extras.append(chip(`${oo.rotulo}`, { icone: oo.icone || '', tom: oo.tom || 'acento' })); }
    }
    if (extras.children.length) card.append(extras);
    if (typeof spec.aoDecidir === 'function') { try { const h = spec.aoDecidir(resp, { pedido, passo }, contexto); if (h) extraBox.innerHTML = h; } catch (e) { console.warn(e); } }
    lista.scrollTop = lista.scrollHeight;
    return resp;
  }

  // ---------- roteador ----------
  async function rotear(pedido) {
    const pc = el('div', { class: 'mj-pedido' }, [el('small', { text: G.rotuloPedido || 'Pedido' }), pedido]);
    lista.append(pc); lista.scrollTop = lista.scrollHeight;
    for (const t of Object.values(tiles)) { t.classList.remove('escolhida'); t.querySelector('.pb').style.width = '0'; t.querySelector('.pp').textContent = ''; }
    const r = await decidir({ pedido }, 'pedido');
    const resp = r.respostas || {};
    const a = decVer && resp[decVer.id];
    if (a) {
      for (const [id, p] of Object.entries(a.probabilities || {})) { const t = tiles[id]; if (!t) continue; t.querySelector('.pb').style.width = Math.round(p * 100) + '%'; t.querySelector('.pp').textContent = fmt.pct(p); }
      const t = tiles[a.choice]; if (t) t.classList.add('escolhida');
      cont[a.choice] = (cont[a.choice] || 0) + 1;
      const o = opsVer.find((x) => x.id === a.choice);
      const linha = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '7px', flexWrap: 'wrap' } }, [el('span', { class: 'dim', text: '→' }), chip(o ? o.rotulo : a.choice, { icone: o && o.icone, tom: 'acento' }), el('span', { class: 'mj-num dim', style: { fontSize: '12px' }, text: `${fmt.pct(a.probabilities?.[a.choice])} · ${fmt.ms(r.latencia_ms)}` })]);
      for (const d of decs) {
        if (d === decVer || !resp[d.id]) continue;
        const x = resp[d.id];
        if (d.tipo === 'score') linha.append(medidor(x, listaNiveis(d), { compacto: true, inverter: d.inverter }));
        else if (d.tipo === 'noul' && x.noul >= (d.limiar ?? 0.5)) linha.append(chip(`${d.rotulo || d.id} ${fmt.pct(x.noul)}`, { tom: d.tom || 'acento' }));
        else if (d.tipo === 'choice') { const oo = listaOpcoes(d, contexto).find((z) => z.id === x.choice); if (oo) linha.append(chip(oo.rotulo, { icone: oo.icone || '' })); }
      }
      pc.append(linha);
    }
    if (typeof spec.aoDecidir === 'function') { try { const h = spec.aoDecidir(resp, { pedido }, contexto, cont); if (h) extraBox.innerHTML = h; } catch (e) { console.warn(e); } }
    lista.scrollTop = lista.scrollHeight;
  }

  async function pedidoMeu() {
    const t = campo.value.trim(); if (!t) return;
    campo.value = '';
    try {
      if (modo === 'roteador') await rotear(t);
      else {
        lista.append(el('div', { class: 'mj-pedido' }, [el('small', { text: G.rotuloPedido || 'Pedido' }), t]));
        const passo = G.passoLivre ? G.passoLivre(t) : { ferramenta: 'acao_proposta', args: { pedido: t }, descricao: 'O agente vai fazer exatamente o que foi pedido.' };
        await avaliarPasso(t, passo, []);
      }
    } catch { /* toast já mostrado */ }
  }

  function limpar() {
    lista.innerHTML = '';
    for (const k of Object.keys(cont)) delete cont[k];
    for (const b of Object.values(nCont)) b.textContent = '0';
    for (const t of Object.values(tiles)) { t.classList.remove('escolhida'); t.querySelector('.pb').style.width = '0'; t.querySelector('.pp').textContent = ''; }
    extraBox.innerHTML = '';
    pintarPagina(null);
  }

  async function trocar(i) {
    rot = i;
    [...botoesRot.children].forEach((b, j) => b.classList.toggle('mj-btn--primario', j === i));
    if (document.querySelector('.mj-btn--play.tocando') && window.MJ) { window.MJ.tocar(); await sleep(80); }
    limpar();
    if (window.MJ) window.MJ.tocar();
  }

  async function tocar(sinal) {
    limpar();
    const lista_ = G.todosNaDemo ? roteiros : [roteiros[rot] || roteiros[0]];
    for (const r of lista_) {
      if (!r) continue;
      if (modo === 'roteador') {
        for (const p of r.pedidos || []) { await rotear(typeof p === 'string' ? p : p.texto); sinal.throwIfAborted(); await sleep(Math.min(G.ritmo || 1500, 2600), sinal); }
      } else {
        lista.append(el('div', { class: 'mj-pedido' }, [el('small', { text: G.rotuloPedido || 'Pedido' }), r.pedido]));
        await sleep(700, sinal);
        const hist = [];
        for (const passo of r.passos || []) {
          await avaliarPasso(r.pedido, passo, hist);
          hist.push(`${passo.ferramenta}: ${passo.descricao || ''}`);
          sinal.throwIfAborted();
          await sleep(Math.min(G.ritmo || 1200, 2600), sinal);
        }
      }
    }
  }

  pintarPagina(null);
  return { tocar, limpar };
}
void esc; void barras; void anel;

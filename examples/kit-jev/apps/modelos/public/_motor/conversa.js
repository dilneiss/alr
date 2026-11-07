// Motor CONVERSA: um roteiro (WhatsApp, ligação, reunião, aula, live, balcão, RPG…) roda na tela;
// o Jev julga cada fala de quem deve ser analisado e o app reage (alerta, cartão, resposta pronta escolhida pelo Jev).
import { el, esc, fmt, sleep, barras, medidor, anel, chip, listaOpcoes, listaNiveis, topo } from './ui.js';

export function criar({ spec, area, decidir, contexto }) {
  const C = spec.conversa || {};
  const skin = C.skin || 'chat-site';
  const decs = (spec.decisoes || []).filter((d) => d.papel !== 'oculto');
  const roteiros = spec.roteiros || [];
  const part = C.participantes || {};
  const nomes = Object.keys(part);
  const analisar = [].concat(C.analisar || nomes[0] || 'cliente');
  const respondeComo = C.respondeComo || 'bot';
  let historico = [], rot = 0, estadoApp = {}, nAnalises = 0, regrasTa = null;

  // ---------- palco ----------
  const msgs = el('div', { class: 'mj-msgs', 'aria-live': 'polite' });
  const tempoEl = el('span', { class: 'tempo', text: '' });
  const botoesRot = el('div', { class: 'roteiros' }, roteiros.map((r, i) => el('button', { class: 'mj-btn mj-btn--sm' + (i === 0 ? ' mj-btn--primario' : ''), type: 'button', onclick: () => trocarRoteiro(i) }, [r.titulo || `Roteiro ${i + 1}`])));
  const cab = el('div', { class: 'mj-palco-cab' }, [
    el('span', { class: 'av', text: C.avatar || spec.emoji }),
    el('div', {}, [el('b', { text: C.titulo || spec.titulo }), el('span', { text: C.subtitulo || '' }), skin === 'ligacao' ? tempoEl : null]),
    botoesRot,
  ]);
  const voce = C.voce || analisar[0];
  const campo = el('input', { type: 'text', placeholder: C.placeholder || `Escreva como ${(part[voce] && part[voce].nome) || voce}…`, 'aria-label': 'Sua mensagem' });
  const quemSel = nomes.length > 1 && C.escolherQuem ? el('select', { 'aria-label': 'Quem fala' }, nomes.map((n) => el('option', { value: n, text: (part[n] && part[n].nome) || n }))) : null;
  if (quemSel) quemSel.value = voce;
  const btEnviar = el('button', { class: 'mj-btn mj-btn--primario', type: 'submit' }, ['Enviar']);
  const compor = el('form', { class: 'mj-compor', onsubmit: (e) => { e.preventDefault(); enviarMeu(); } }, [quemSel, campo, btEnviar]);
  const extraTopo = skin === 'live' ? el('div', { class: 'mj-live-video' }, [el('span', { class: 'ao-vivo', text: 'AO VIVO' }), el('span', { text: C.avatar || '🎥' })]) : null;
  const telaCliente = skin === 'balcao' ? el('div', { class: 'mj-tela-cliente' }, [el('div', {}, [el('div', { class: 'rot', text: C.rotuloTela || 'Tela do cliente' }), el('div', { class: 'dim', style: { fontSize: '13px', marginTop: '6px' }, text: 'A sugestão aparece aqui só quando o Jev acha que é a hora.' })])]) : null;
  const palco = el('section', { class: 'mj-palco mj-painel-box skin-' + skin }, [cab, extraTopo, msgs, telaCliente, compor]);

  // ---------- análise ----------
  const placarDecs = decs.filter((d) => ['checklist', 'medidor', 'destaque', 'contador'].includes(d.papel));
  const placarBox = el('div', { class: 'grade' });
  const widgets = {};
  for (const d of placarDecs) {
    const corpo = el('div', { class: 'dim', style: { fontSize: '12.5px' }, text: 'aguardando…' });
    widgets[d.id] = { corpo, hist: [] };
    placarBox.append(el('div', { class: 'mj-widget mj-painel-box', style: { padding: '11px' } }, [el('h4', {}, [d.titulo || d.id, el('span', { class: 'tp', text: d.tipo })]), corpo]));
  }
  const cards = el('div', { class: 'mj-cards' });
  const analise = el('section', { class: 'mj-analise' }, [
    placarDecs.length ? el('div', { class: 'mj-placar-conv mj-painel-box' }, [el('h3', { class: 'mj-sec-t', text: C.tituloPlacar || 'Painel ao vivo' }), placarBox]) : null,
    el('h3', { class: 'mj-sec-t', style: { margin: '2px 0 0' } }, [C.tituloAnalise || 'O Jev julgou cada fala', el('span', { class: 'n', text: '' })]),
    cards,
  ]);
  area.append(el('div', { class: 'mj-conversa' }, [palco, analise]));

  // ---------- mensagens ----------
  let relogio = null, t0 = 0;
  function iniciaRelogio() { if (skin !== 'ligacao') return; clearInterval(relogio); t0 = Date.now(); relogio = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); tempoEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 500); }

  function lado(quem) { const p = part[quem]; if (p && p.lado) return p.lado === 'dir' ? 'dir' : 'esq'; return nomes.indexOf(quem) <= 0 ? 'esq' : 'dir'; }

  function balao(quem, texto, extra = {}) {
    const p = part[quem] || {};
    const cls = ['mj-msg', lado(quem), 'q-' + String(quem).replace(/[^a-z0-9_-]/gi, '')];
    if (extra.classe) cls.push(extra.classe);
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const filhos = [];
    if (['reuniao', 'aula', 'debate'].includes(skin)) filhos.push(el('span', { class: 'av-m', text: p.avatar || '🙂' }));
    if (quem !== '__sistema' && (skin !== 'whatsapp' || nomes.length > 2 || C.mostrarNomes)) filhos.push(el('span', { class: 'quem', text: p.nome || quem }));
    filhos.push(el('span', { class: 'tx', text: texto }), el('span', { class: 'hora', text: hora }));
    const m = el('div', { class: cls.join(' ') }, filhos);
    msgs.append(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  async function digitando(quem, ms, sinal) {
    const d = el('div', { class: 'mj-digitando ' + lado(quem) }, [el('i'), el('i'), el('i')]);
    msgs.append(d); msgs.scrollTop = msgs.scrollHeight;
    try { await sleep(ms, sinal); } finally { d.remove(); }
  }

  // ---------- analisar uma fala ----------
  async function analisarFala(quem, texto, no) {
    no.classList.add('analisando');
    let r;
    try { r = await decidir({ historico, atual: { quem, texto }, ajustes: regrasTa && regrasTa.value !== (contexto[spec.editavel.campo] || '') ? regrasTa.value : undefined }, `fala de ${(part[quem] && part[quem].nome) || quem}`); }
    finally { no.classList.remove('analisando'); }
    nAnalises++;
    analise.querySelector('.mj-sec-t .n').textContent = `${nAnalises} ${nAnalises === 1 ? 'fala' : 'falas'}`;
    const resp = r.respostas || {};
    pintarCard(quem, texto, resp, r);
    pintarPlacar(resp);
    if (C.riscar) { const a = resp[C.riscar.decisao]; const lim = C.riscar.limiar ?? 0.6; if (a && ((a.type === 'noul' && a.noul >= lim) || (a.type === 'choice' && (C.riscar.opcoes || []).includes(a.choice)))) no.classList.add('riscada'); }
    if (C.selo) {
      try { const s = C.selo(resp, { quem, texto }, contexto); if (s) { const sl = chip(s.texto, { tom: s.tom || 'acento', icone: s.icone || '' }); sl.classList.add('selo'); no.append(sl); } } catch (e) { console.warn(e); }
    }
    if (telaCliente && typeof C.telaCliente === 'function') {
      try { const h = C.telaCliente(resp, { quem, texto }, contexto, estadoApp); if (h) { telaCliente.innerHTML = h; } } catch (e) { console.warn(e); }
    }
    if (extraTopo && typeof C.produtoLive === 'function') {
      try { const h = C.produtoLive(resp, { quem, texto }, contexto, estadoApp); extraTopo.querySelector('.produto')?.remove(); if (h) extraTopo.append(el('div', { class: 'produto', html: h })); } catch (e) { console.warn(e); }
    }
    return resp;
  }

  function pintarCard(quem, texto, resp, r) {
    const linhas = [];
    let alerta = false;
    for (const d of decs) {
      const a = resp[d.id]; if (!a || d.papel === 'so-placar') continue;
      let val;
      if (d.tipo === 'choice') {
        const ops = listaOpcoes(d, contexto);
        const o = ops.find((x) => x.id === a.choice) || { rotulo: a.choice };
        val = el('span', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, [chip(o.rotulo, { icone: o.icone || '', tom: o.tom || 'acento' }), el('span', { class: 'mj-num dim', style: { fontSize: '11.5px' }, text: fmt.pct(a.probabilities?.[a.choice]) })]);
        if (o.alerta) alerta = true;
      } else if (d.tipo === 'score') {
        val = medidor(a, listaNiveis(d), { compacto: true, inverter: d.inverter });
        if (d.alertaNivel != null && +topo(a.probabilities)[0][0] >= d.alertaNivel) alerta = true;
      } else {
        const sim = a.noul >= (d.limiar ?? 0.5);
        if (sim && d.alerta) alerta = true;
        val = el('span', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [anel(a.noul, { tamanho: 26, cor: sim ? (d.tom === 'bom' ? 'var(--mj-bom)' : 'var(--mj-ruim)') : 'var(--mj-dim)' }), el('span', { class: sim ? '' : 'dim', text: sim ? (d.rotuloSim || 'sim') : (d.rotuloNao || 'não') })]);
      }
      linhas.push(el('div', { class: 'lin' }, [el('span', { text: d.titulo || d.id }), val]));
    }
    const card = el('article', { class: 'mj-card-analise' + (alerta ? ' alerta' : '') }, [
      el('div', { class: 'ref', html: `<b>${esc((part[quem] && part[quem].nome) || quem)}:</b> “${esc(texto)}” <span class="mj-num dim">· ${fmt.ms(r.latencia_ms)}</span>` }),
      el('div', { class: 'linhas' }, linhas),
    ]);
    cards.prepend(card);
    return card;
  }

  function pintarPlacar(resp) {
    for (const d of placarDecs) {
      const a = resp[d.id]; const w = widgets[d.id]; if (!a || !w) continue;
      w.hist.push(a);
      if (d.papel === 'checklist') {
        const lim = d.limiar ?? 0.5;
        const ja = w.hist.some((x) => x.noul >= lim);
        const max = Math.max(...w.hist.map((x) => x.noul));
        w.corpo.className = '';
        w.corpo.innerHTML = '';
        w.corpo.append(el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
          anel(max, { tamanho: 36, cor: ja ? (d.tom === 'bom' ? 'var(--mj-bom)' : 'var(--mj-ruim)') : 'var(--mj-dim)' }),
          el('b', { style: { color: ja ? (d.tom === 'bom' ? 'var(--mj-bom)' : 'var(--mj-ruim)') : 'var(--mj-mudo)' }, text: ja ? (d.rotuloSim || 'apareceu') : (d.rotuloNao || 'ainda não') }),
        ]));
      } else if (d.papel === 'medidor') {
        const nv = listaNiveis(d);
        w.corpo.className = ''; w.corpo.innerHTML = '';
        const pontos = el('div', { style: { display: 'flex', gap: '3px', marginTop: '8px', alignItems: 'flex-end', height: '22px' } }, w.hist.slice(-14).map((x) => el('span', { style: { width: '6px', borderRadius: '2px', height: (6 + (x.score / Math.max(1, nv.length - 1)) * 16) + 'px', background: 'var(--mj-acento)', opacity: '.75' } })));
        w.corpo.append(medidor(a, nv, { inverter: d.inverter }), pontos);
      } else if (d.papel === 'destaque') {
        const ops = listaOpcoes(d, contexto); const o = ops.find((x) => x.id === a.choice) || { rotulo: a.choice };
        w.corpo.className = ''; w.corpo.innerHTML = '';
        w.corpo.append(el('div', { class: 'mj-destaque troca', style: { marginBottom: '6px' } }, [el('span', { class: 'ic', style: { width: '40px', height: '40px', fontSize: '20px' }, text: o.icone || '✦' }), el('div', {}, [el('div', { class: 'nm', style: { fontSize: '16px' }, text: o.rotulo }), el('div', { class: 'ds', text: fmt.pct(a.probabilities?.[a.choice]) + ' de confiança' })])]));
      } else if (d.papel === 'contador') {
        const lim = d.limiar ?? 0.5;
        const n = w.hist.filter((x) => (x.type === 'noul' ? x.noul >= lim : true)).length;
        w.corpo.className = ''; w.corpo.innerHTML = `<b class="mj-num" style="font-size:24px">${n}</b>`;
      }
    }
  }

  // ---------- falar ----------
  async function fala(quem, texto, sinal) {
    const no = balao(quem, texto);
    const registro = { quem: (part[quem] && part[quem].nome) || quem, texto };
    // o Jev julga a fala atual com o histórico ATÉ ela (a fala vai em fala_atual, sem duplicar)
    if (!analisar.includes(quem)) { historico.push(registro); if (historico.length > 12) historico.shift(); }
    if (analisar.includes(quem)) {
      const resp = await analisarFala(quem, texto, no);
      historico.push(registro); if (historico.length > 12) historico.shift();
      if (typeof C.responder === 'function') {
        let rpt = null;
        try { rpt = C.responder(resp, { quem, texto }, contexto, estadoApp); } catch (e) { console.warn(e); }
        if (rpt) {
          const lista = [].concat(rpt);
          for (const x of lista) {
            const t = typeof x === 'string' ? x : x.texto;
            const q = (typeof x === 'object' && x.quem) || respondeComo;
            await digitando(q, Math.min(1600, 420 + t.length * 9), sinal);
            const nb = balao(q, t, { classe: typeof x === 'object' && x.classe ? x.classe : '' });
            if (typeof x === 'object' && x.marca) nb.append(chip(x.marca, { tom: 'acento' }));
            historico.push({ quem: (part[q] && part[q].nome) || q, texto: t });
          }
        }
      }
    }
  }

  async function enviarMeu() {
    const t = campo.value.trim(); if (!t) return;
    campo.value = ''; btEnviar.disabled = true;
    try { await fala(quemSel ? quemSel.value : voce, t); } catch { /* toast já mostrado */ } finally { btEnviar.disabled = false; campo.focus(); }
  }

  function limpar() {
    msgs.innerHTML = ''; cards.innerHTML = ''; historico = []; estadoApp = {}; nAnalises = 0;
    analise.querySelector('.mj-sec-t .n').textContent = '';
    for (const d of placarDecs) { widgets[d.id].hist = []; widgets[d.id].corpo.className = 'dim'; widgets[d.id].corpo.textContent = 'aguardando…'; }
    if (telaCliente) telaCliente.innerHTML = `<div><div class="rot">${esc(C.rotuloTela || 'Tela do cliente')}</div><div class="dim" style="font-size:13px;margin-top:6px">A sugestão aparece aqui só quando o Jev acha que é a hora.</div></div>`;
    extraTopo?.querySelector('.produto')?.remove();
    if (C.abertura) balao('__sistema', C.abertura, { classe: 'sistema' });
  }

  async function trocarRoteiro(i) {
    rot = i;
    [...botoesRot.children].forEach((b, j) => b.classList.toggle('mj-btn--primario', j === i));
    if (document.querySelector('.mj-btn--play.tocando') && window.MJ) { window.MJ.tocar(); await sleep(80); }
    limpar();
    if (window.MJ && window.MJ.tocar) window.MJ.tocar();
  }

  // regras editáveis (spec.editavel): o texto vai junto em cada chamada e substitui o campo do contexto
  if (spec.editavel) {
    const ta = el('textarea', { 'aria-label': spec.editavel.rotulo || 'Regras' });
    ta.value = contexto[spec.editavel.campo] || '';
    regrasTa = ta;
    cab.querySelector('.roteiros').prepend(el('button', { class: 'mj-btn mj-btn--sm mj-btn--ghost', type: 'button', onclick: () => {
      const box = el('div', {}, [el('p', { class: 'dim', text: spec.editavel.ajuda || 'O Jev lê este texto em cada decisão. Mude e mande uma fala nova.' }), ta]);
      ta.style.cssText = 'width:100%;min-height:180px;border-radius:10px;border:1px solid var(--mj-borda2);background:var(--mj-bg);color:var(--mj-texto);font:13px/1.5 var(--mj-f);padding:10px';
      import('./ui.js').then(({ modal }) => modal(spec.editavel.rotulo || 'Regras', box, { largo: true }));
    } }, ['✎ ' + (spec.editavel.botao || 'Regras')]));
  }

  async function tocar(sinal) {
    limpar(); iniciaRelogio();
    const r = roteiros[rot] || roteiros[0];
    if (!r) return;
    for (const f of r.falas) {
      if (typeof C.responder === 'function' && f.quem === respondeComo && !f.fixa) continue;
      const base = f.pausa ?? Math.min(1500, 380 + f.texto.length * 11);
      await digitando(f.quem, base * (C.ritmo || 1), sinal);
      await fala(f.quem, f.texto, sinal);
      await sleep(f.depois ?? 650, sinal);
    }
    clearInterval(relogio);
    if (roteiros.length > 1 && C.encadear) { rot = (rot + 1) % roteiros.length; }
  }

  limpar();
  return { tocar, limpar };
}
void barras;

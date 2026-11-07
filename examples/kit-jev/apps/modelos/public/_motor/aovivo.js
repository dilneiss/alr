// Motor AO VIVO: a cada pausa da digitação o Jev reavalia o texto inteiro e o painel muda na hora.
// É a "IA imediata": decide dentro do tempo da interação, sem a pessoa pedir.
import { el, esc, fmt, sleep, barras, medidor, anel, chip, digitar, listaOpcoes, listaNiveis, debounce, toast } from './ui.js';

export function criar({ spec, area, decidir, contexto }) {
  const A = spec.aovivo || {};
  const decs = (spec.decisoes || []).filter((d) => d.papel !== 'oculto');
  const exemplos = spec.exemplos || [];
  const minimo = A.minimo ?? 6;
  let seq = 0, ultima = null, ultimoTexto = '';

  // papel padrão de cada decisão
  let primeiraChoice = true;
  for (const d of decs) {
    if (d.papel) continue;
    if (d.porLinha) d.papel = 'linhas';
    else if (d.tipo === 'choice') { d.papel = primeiraChoice ? 'destaque' : 'barras'; primeiraChoice = false; }
    else if (d.tipo === 'score') d.papel = 'medidor';
    else d.papel = 'checklist';
  }

  // ---------- editor ----------
  const campo = el('textarea', { placeholder: A.placeholder || 'Escreva aqui…', 'aria-label': A.rotulo || 'Texto', spellcheck: 'false', class: A.mono ? 'mono' : '' });
  const estadoJev = el('span', { class: 'mj-estado-jev' }, [el('i'), el('span', { text: 'esperando você escrever' })]);
  const cab = el('div', { class: 'mj-editor-cab' }, [el('span', { class: 'bolas' }, [el('i'), el('i'), el('i')]), el('span', { text: A.janela || spec.titulo }), el('span', { style: { marginLeft: 'auto' } }, [estadoJev])]);
  const campos = A.cabecalho ? el('div', { class: 'mj-editor-campos' }, Object.entries(A.cabecalho).map(([k, v]) => el('div', {}, [el('span', { text: k }), el('b', { text: v, style: { fontWeight: 500 } })]))) : null;
  const botoesEx = el('div', { class: 'mj-exemplos' }, exemplos.map((ex, i) => el('button', { class: 'mj-btn mj-btn--sm', type: 'button', onclick: () => usarExemplo(i) }, [ex.titulo || `Exemplo ${i + 1}`])));
  const editor = el('section', { class: 'mj-editor mj-painel-box skin-' + (A.skin || 'padrao') }, [
    cab, campos, campo,
    el('div', { class: 'mj-editor-pe' }, [el('span', { class: 'dim', text: A.dica || 'O Jev reavalia a cada pausa da digitação.' }), botoesEx]),
  ]);

  // ---------- painel ----------
  const painel = el('section', { class: 'mj-painel' });
  const render = el('div', { class: 'mj-render' });
  if (typeof spec.render === 'function') painel.append(render);
  const widgets = {};
  const checklist = decs.filter((d) => d.papel === 'checklist');
  let boxCheck = null;
  for (const d of decs) {
    if (d.papel === 'destaque' || d.papel === 'barras' || d.papel === 'medidor') {
      const corpo = el('div', { class: 'corpo' }, [el('p', { class: 'dim', style: { margin: 0, fontSize: '13px' }, text: 'aguardando o texto…' })]);
      const w = el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', {}, [d.titulo || d.id, el('span', { class: 'tp', text: d.tipo })]), corpo]);
      widgets[d.id] = corpo; painel.append(w);
    } else if (d.papel === 'alerta') {
      const corpo = el('div'); widgets[d.id] = corpo; painel.append(corpo);
    } else if (d.papel === 'checklist' && !boxCheck) {
      boxCheck = el('div', { class: 'mj-check' });
      painel.append(el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', {}, [A.tituloChecklist || 'O que o Jev confere', el('span', { class: 'tp', text: `${checklist.length} perguntas sim/não` })]), boxCheck]));
      for (const c of checklist) {
        const it = el('div', { class: 'mj-check-item', title: c.pergunta, style: { '--tom': c.tom === 'bom' ? 'var(--mj-bom)' : c.tom === 'medio' ? 'var(--mj-medio)' : 'var(--mj-ruim)' } }, [el('span', { class: 'bx', text: '' }), el('span', { text: c.rotulo || c.titulo || c.id }), el('span', { class: 'p', text: '—' })]);
        widgets[c.id] = it; boxCheck.append(it);
      }
    } else if (d.papel === 'linhas' && !widgets.__linhas) {
      const corpo = el('div', { class: 'mj-linhas' });
      widgets.__linhas = corpo;
      painel.append(el('div', { class: 'mj-widget mj-painel-box' }, [el('h4', {}, [A.tituloLinhas || 'Linha por linha', el('span', { class: 'tp', text: 'uma decisão por linha' })]), corpo]));
    }
  }
  const trilha = el('div', { class: 'mj-trilha', 'aria-hidden': 'true' }, [el('span', { text: 'avaliações:' })]);

  area.append(el('div', { class: 'mj-aovivo' }, [editor, painel]), trilha);

  // ---------- avaliação ----------
  const avaliar = debounce(() => avaliarAgora(), A.debounce ?? 420);
  campo.addEventListener('input', () => {
    if (campo.value.trim().length >= minimo) { marcar('pensando', 'digitando…'); avaliar(); }
    else if (!campo.value.trim() && typeof spec.aoLimpar === 'function') spec.aoLimpar();   // a caixa esvaziou: a frase acabou
  });

  function marcar(cls, txt) { estadoJev.className = 'mj-estado-jev ' + cls; estadoJev.lastChild.textContent = txt; }

  async function avaliarAgora(forcar) {
    const texto = campo.value.trim();
    if (texto.length < minimo) return null;
    if (!forcar && texto === ultimoTexto && ultima) return ultima;
    const meu = ++seq;
    marcar('pensando', 'o Jev está lendo…');
    let r;
    // spec.estadoAtual(texto): o estado que a página acumulou (ex.: aparelhos já ligados) vai junto e substitui o campo spec.editavel.campo do contexto
    const ajustes = typeof spec.estadoAtual === 'function' ? spec.estadoAtual(texto) : undefined;
    try { r = await decidir({ texto, ajustes }, 'texto atual'); }
    catch { marcar('', 'falhou — tente de novo'); return null; }
    if (meu !== seq) return r; // chegou uma resposta mais nova
    ultimoTexto = texto; ultima = r;
    marcar('ok', `decidido em ${fmt.ms(r.latencia_ms)}`);
    pintar(r, texto);
    const p = el('span', { class: 'ponto', html: `<b>${fmt.ms(r.latencia_ms)}</b>` });
    trilha.append(p); while (trilha.children.length > 18) trilha.children[1].remove();
    return r;
  }

  function pintar(r, texto) {
    const resp = r.respostas || {};
    for (const d of decs) {
      const a = resp[d.id];
      const w = widgets[d.id];
      if (!a || !w) continue;
      if (d.papel === 'destaque') {
        const ops = listaOpcoes(d, contexto);
        const o = ops.find((x) => x.id === a.choice) || { rotulo: a.choice };
        const conf = a.probabilities?.[a.choice] ?? 0;
        w.innerHTML = '';
        w.append(
          el('div', { class: 'mj-destaque troca', style: o.cor ? { '--cor': o.cor } : null }, [
            el('span', { class: 'ic', text: o.icone || '✦' }),
            el('div', {}, [el('div', { class: 'nm', text: o.rotulo }), el('div', { class: 'ds', text: o.desc || '' })]),
            el('span', { style: { marginLeft: 'auto' } }, [anel(conf, { tamanho: 42 })]),
          ]),
          barras(a.probabilities, { rotulos: Object.fromEntries(ops.map((x) => [x.id, (x.icone ? x.icone + ' ' : '') + x.rotulo])), limite: d.limite || 4 }),
        );
      } else if (d.papel === 'barras') {
        const ops = listaOpcoes(d, contexto);
        w.innerHTML = '';
        w.append(barras(a.probabilities, { rotulos: Object.fromEntries(ops.map((x) => [x.id, (x.icone ? x.icone + ' ' : '') + x.rotulo])), limite: d.limite || 5 }));
      } else if (d.papel === 'medidor') {
        const nv = listaNiveis(d);
        w.innerHTML = '';
        w.append(medidor(a, nv, { inverter: d.inverter }), el('p', { class: 'dim', style: { margin: '8px 0 0', fontSize: '12.5px' }, text: (nv[Math.round(a.score)] || {}).desc && (nv[Math.round(a.score)] || {}).desc !== (nv[Math.round(a.score)] || {}).rotulo ? nv[Math.round(a.score)].desc : `nota contínua ${fmt.num(a.score, 2)} de ${nv.length - 1}` }));
      } else if (d.papel === 'checklist') {
        const lim = d.limiar ?? 0.5;
        const sim = a.noul >= lim;
        w.classList.toggle('sim', sim);
        w.querySelector('.bx').textContent = sim ? (d.tom === 'bom' ? '✓' : '!') : '';
        w.querySelector('.p').textContent = fmt.pct(a.noul);
      } else if (d.papel === 'alerta') {
        const lim = d.limiar ?? 0.5;
        w.innerHTML = '';
        if (a.noul >= lim) w.append(el('div', { class: 'mj-alerta-box' }, [el('span', { class: 'ic', text: d.icone || '⚠️' }), el('div', {}, [el('b', { text: d.mensagem || d.rotulo || d.titulo }), el('div', { class: 'dim', style: { fontSize: '12.5px' }, text: `${fmt.pct(a.noul)} de chance · ${d.pergunta}` })])]));
        else if (d.mensagemOk) w.append(el('div', { class: 'mj-alerta-box ok' }, [el('span', { class: 'ic', text: '✅' }), el('div', { text: d.mensagemOk })]));
      }
    }
    if (widgets.__linhas && r.linhas) {
      const dl = decs.filter((d) => d.porLinha);
      widgets.__linhas.innerHTML = '';
      for (const l of r.linhas) {
        const chips = dl.map((d) => {
          const a = l.respostas[d.id]; if (!a) return null;
          if (d.tipo === 'choice') { const o = listaOpcoes(d, contexto).find((x) => x.id === a.choice); return chip(`${o ? (o.icone ? o.icone + ' ' : '') + o.rotulo : a.choice} ${fmt.pct(a.probabilities?.[a.choice])}`, { tom: o && o.tom ? o.tom : 'acento' }); }
          if (d.tipo === 'noul') return a.noul >= (d.limiar ?? 0.5) ? chip(`${d.rotulo || d.id} ${fmt.pct(a.noul)}`, { tom: d.tom || 'ruim', icone: d.icone || '' }) : null;
          return medidor(a, listaNiveis(d), { compacto: true });
        });
        widgets.__linhas.append(el('div', { class: 'mj-linha-item' }, [el('span', { class: 'tx', text: l.texto, title: l.texto }), el('span', { style: { display: 'flex', gap: '5px' } }, chips)]));
      }
    }
    if (typeof spec.render === 'function') {
      try { render.innerHTML = spec.render(r, texto, contexto) || ''; } catch (e) { console.warn(e); }
    }
  }

  async function usarExemplo(i) {
    const ex = exemplos[i]; if (!ex) return;
    campo.value = ex.texto;
    await avaliarAgora(true);
  }

  async function tocar(sinal) {
    for (let i = 0; i < exemplos.length; i++) {
      const ex = exemplos[i];
      campo.focus({ preventScroll: true });
      if (A.digitar === false) { campo.value = ''; await sleep(300, sinal); campo.value = ex.texto; campo.dispatchEvent(new Event('input')); }
      else await digitar(campo, ex.texto, { sinal, velocidade: A.velocidade || 1.25, aoPausar: () => { if (campo.value.trim().length >= minimo) avaliarAgora().catch(() => {}); } });
      await sleep(80, sinal);
      await avaliarAgora(true);
      sinal.throwIfAborted();
      await sleep(A.pausa || 2600, sinal);
    }
  }

  if (exemplos[0] && !A.comecarVazio) { campo.value = exemplos[0].texto; setTimeout(() => avaliarAgora(true).catch(() => {}), 350); }
  else if (typeof spec.render === 'function') { try { render.innerHTML = spec.render({ respostas: {} }, '', contexto) || ''; } catch (e) { console.warn(e); } }   // começa vazio, mas o painel já aparece
  return { tocar };
}
void esc; void toast;

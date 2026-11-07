// Casca comum dos modelos do Jev: monta a página a partir do app.config.mjs e entrega ao motor certo.
// Motores: fluxo · aovivo · conversa · agente · pares · provas · laboratorio
import { el, esc, fmt, toast, modal, jsonCor, listaOpcoes, listaNiveis, sleep } from './ui.js';

const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
const MARCA_TIPO = { choice: '◉', score: '▮▮▯', noul: '◐' };
const NOME_TIPO = { choice: 'escolha', score: 'escala', noul: 'sim ou não' };

export async function iniciar(spec) {
  const hosted = !!window.MJ_HOSTED;
  const params = new URLSearchParams(location.search);
  document.title = `${spec.titulo} · Jev`;
  aplicarTema(spec);

  // ---------- métricas e inspetor ----------
  const metricas = { chamadas: 0, decisoes: 0, custo: 0, custoProfessor: 0, motor: null, ultima: null, latencias: [] };
  const chamadas = [];
  let gaveta = null;

  // ---------- topo ----------
  const elLat = el('b', { text: '—' }), elDec = el('b', { text: '0' }), elCusto = el('b', { text: 'US$ 0' });
  const btPlay = el('button', { class: 'mj-btn mj-btn--play', type: 'button', title: 'Rodar a demonstração automática' }, [el('span', { class: 'ic', text: '▶' }), el('span', { class: 'tx', text: 'Ver funcionando' })]);
  const btInsp = el('button', { class: 'mj-btn mj-btn--ghost', type: 'button', title: 'Ver exatamente o que o Jev recebeu e respondeu', onclick: () => abrirInspetor() }, ['🔍 ', el('span', { class: 'mj-some-celular', text: 'O que o Jev vê' })]);
  const btAdapte = el('button', { class: 'mj-btn mj-btn--ghost', type: 'button', title: 'Como baixar e adaptar este app para o seu caso', onclick: () => abrirAdapte() }, ['🛠 ', el('span', { class: 'mj-some-celular', text: 'Adapte' })]);
  const acoes = [btPlay, btInsp, btAdapte];
  // apps de palco (tela cheia): a descrição e as decisões ficam num botão, para o palco ocupar a janela
  if (spec.motor === 'palco') acoes.splice(1, 0, el('button', { class: 'mj-btn mj-btn--ghost', type: 'button', title: 'O que este app faz e como o Jev decide', onclick: () => abrirComo() }, ['ℹ️ ', el('span', { class: 'mj-some-celular', text: 'Como funciona' })]));
  if (hosted && !window.MJ_KIT) acoes.push(el('a', { class: 'mj-btn mj-btn--ghost', href: `../_baixar/${spec.id}.zip`, download: `${spec.id}.zip`, title: 'Baixar o código deste app (roda no seu computador com a sua chave do OpenRouter)' }, ['⬇ ', el('span', { class: 'mj-some-celular', text: 'Baixar' })]));
  const topo = el('header', { class: 'mj-topo' }, [
    el('a', { class: 'mj-marca', href: hosted ? '/' : './', title: hosted ? 'Todos os apps do Jev' : spec.titulo }, [el('span', { class: 'mj-logo', html: BOLT + 'JEV' })]),
    el('div', { class: 'mj-titulo' }, [el('span', { class: 'mj-emoji', text: spec.emoji || '⚡' }), el('div', {}, [el('h1', { text: spec.titulo }), el('p', { text: spec.resumo || '' })])]),
    el('span', { class: 'mj-esp' }),
    el('div', { class: 'mj-acoes' }, acoes),
    el('div', { class: 'mj-metricas' }, [
      el('span', { class: 'mj-metrica', title: 'Latência da última chamada ao Jev' }, [el('span', { class: 'r', text: 'última' }), elLat]),
      el('span', { class: 'mj-metrica', title: 'Perguntas que o Jev respondeu nesta página' }, [el('span', { class: 'r', text: 'decisões' }), elDec]),
      el('span', { class: 'mj-metrica', title: 'Custo acumulado: ALR local é grátis; JEV cobra por decisão no OpenRouter', id: 'mj-metrica-custo' }, [el('span', { class: 'r', text: 'custo' }), elCusto]),
    ]),
  ]);

  // ---------- faixa "como o Jev decide aqui" ----------
  const ctxBase = typeof spec.contexto === 'function' ? spec.contexto() : (spec.contexto || {});
  const faixa = el('section', { class: 'mj-faixa' }, [
    el('div', { class: 'mj-faixa-txt' }, [
      el('p', { class: 'mj-desc', html: spec.descricao ? esc(spec.descricao) : '' }),
      el('div', { class: 'mj-marcas' }, (spec.marcas || []).map((m) => el('span', { class: 'mj-marca-tag', text: m }))),
    ]),
    !(spec.decisoes || []).some((d) => d.papel !== 'oculto') ? null : el('div', { class: 'mj-decide' }, [
      el('span', { class: 'mj-decide-t', text: 'O Jev decide aqui' }),
      el('div', { class: 'mj-decide-lista' }, (spec.decisoes || []).filter((d) => d.papel !== 'oculto').slice(0, 6).map((d) => {
        const det = d.tipo === 'choice' ? `${listaOpcoes(d, ctxBase).length} opções` : d.tipo === 'score' ? `${listaNiveis(d).length} níveis` : 'sim ou não';
        return el('button', { class: 'mj-dec', type: 'button', title: 'Ver a pergunta e os critérios', onclick: () => abrirDecisao(d) }, [
          el('i', { class: 't-' + d.tipo, text: MARCA_TIPO[d.tipo] }), el('b', { text: d.titulo || d.rotulo || d.id }), el('span', { text: det }),
        ]);
      }).concat((spec.decisoes || []).filter((d) => d.papel !== 'oculto').length > 6 ? [el('button', { class: 'mj-dec', type: 'button', title: 'Ver todas as decisões', onclick: () => abrirAdapte() }, [el('b', { text: `+${(spec.decisoes || []).filter((d) => d.papel !== 'oculto').length - 6}` }), el('span', { text: 'mais' })])] : [])),
    ]),
  ]);

  const area = el('main', { class: 'mj-area mj-motor-' + spec.motor });
  const rodape = el('footer', { class: 'mj-rodape' }, [
    el('span', { html: 'Feito com <b>Jev</b> (TypeSafe) via OpenRouter: o Jev só <b>decide</b> — escolhe, pontua e estima. Todo texto da tela é nosso.' }),
    el('span', { html: `Modelo editável: <code>app.config.mjs</code> · ${esc(spec.id)}` }),
  ]);
  document.body.append(topo, faixa, area, rodape);
  // navegador com fonte mínima (ex.: 18 px): o topo troca os rótulos dos botões por ícones para o título caber
  const sonda = el('span', { style: { position: 'absolute', visibility: 'hidden', fontSize: '10px' }, text: 'x' });
  document.body.append(sonda);
  if (parseFloat(getComputedStyle(sonda).fontSize) > 12) document.documentElement.classList.add('mj-fonte-grande');
  sonda.remove();

  // ---------- API ----------
  // silencioso: a falha volta só como exceção, sem aviso na tela (chamadas periódicas, como as de um jogo).
  // O mesmo aviso não se repete em menos de 8 s (apps que chamam a cada pausa da fala).
  let ultimoAviso = { msg: '', t: 0 };
  function avisar(msg, silencioso) {
    if (silencioso || (msg === ultimoAviso.msg && Date.now() - ultimoAviso.t < 8000)) return;
    ultimoAviso = { msg, t: Date.now() };
    toast(msg, 'erro');
  }
  async function decidir(entrada, rotulo, { silencioso = false } = {}) {
    let r, dados;
    try {
      r = await fetch('api/decidir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) });
      dados = await r.json().catch(() => ({}));
    } catch (e) {
      avisar('Sem conexão com o servidor. Tente de novo.', silencioso);
      throw e;
    }
    if (!r.ok || dados.ok === false) {
      const msg = dados.error || dados.erro || `Erro ${r.status}`;
      avisar(msg, silencioso);
      const err = new Error(msg); err.status = r.status; err.codigo = dados.code; throw err;
    }
    registrar(dados._jev, rotulo);
    return dados;
  }

  function registrar(dbg, rotulo) {
    if (!dbg) return;
    metricas.chamadas++;
    metricas.decisoes += dbg.n_questions || 0;
    // ALR é local: o servidor manda cost 0. O gasto do professor (se houver) vem separado.
    metricas.custo += dbg.cost || 0;
    metricas.custoProfessor += dbg.custo_professor || 0;
    if (dbg.provider) metricas.motor = dbg.provider;
    if (!dbg.cached && dbg.latency_ms != null) { metricas.ultima = dbg.latency_ms; metricas.latencias.push(dbg.latency_ms); }
    chamadas.push({ ...dbg, n: metricas.chamadas, hora: new Date().toLocaleTimeString('pt-BR'), rotulo });
    if (chamadas.length > 40) chamadas.shift();
    elLat.textContent = fmt.ms(metricas.ultima);
    elLat.parentElement.className = 'mj-metrica ' + (metricas.ultima == null ? '' : metricas.ultima < 500 ? 'bom' : metricas.ultima < 1000 ? 'medio' : 'ruim');
    elDec.textContent = fmt.int(metricas.decisoes);
    const ehAlr = /^ALR/i.test(metricas.motor || '');
    elCusto.textContent = ehAlr ? 'grátis' : fmt.usd(metricas.custo);
    const mc = document.getElementById('mj-metrica-custo');
    if (mc) mc.title = ehAlr
      ? 'Motor ALR (local): nenhum custo de nuvem' + (metricas.custoProfessor > 0 ? ' · professor consultado: ' + fmt.usd(metricas.custoProfessor) : '')
      : 'Custo acumulado desta página no OpenRouter';
    elLat.parentElement.classList.remove('pisca'); void elLat.offsetWidth; elLat.parentElement.classList.add('pisca');
    if (gaveta && gaveta.classList.contains('aberta')) abrirInspetor();
  }

  function abrirInspetor() {
    if (!gaveta) {
      gaveta = el('aside', { class: 'mj-gaveta', role: 'dialog', 'aria-label': 'O que o Jev recebeu e respondeu' });
      document.body.append(gaveta, el('div', { class: 'mj-gaveta-fundo', onclick: () => gaveta.classList.remove('aberta') }));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') gaveta.classList.remove('aberta'); });
    }
    gaveta.innerHTML = '';
    gaveta.append(el('header', {}, [
      el('span', { class: 'mj-logo', html: BOLT + 'JEV' }), el('h3', { text: 'O que o Jev recebeu e respondeu' }),
      el('button', { class: 'mj-btn mj-btn--sm', type: 'button', 'aria-label': 'Fechar', onclick: () => gaveta.classList.remove('aberta') }, ['✕']),
    ]));
    const corpo = el('div', { class: 'corpo' }, [el('p', { class: 'mj-explica', html: 'O Jev não escreve texto. Ele recebe um <b>estado</b> (os dados) e <b>perguntas tipadas</b> — <code>choice</code>, <code>score</code> e <code>noul</code> — e devolve <b>probabilidades</b> numa passada só. Estas são as chamadas reais desta página.' })]);
    if (!chamadas.length) corpo.append(el('p', { class: 'mj-vazio', text: 'Nenhuma chamada ainda. Aperte ▶ Ver funcionando e volte aqui.' }));
    for (const c of chamadas.slice().reverse().slice(0, 15)) {
      const pre = el('pre', { class: 'mj-json' });
      const abas = el('div', { class: 'mj-abas' });
      const vistas = { Perguntas: c.request && c.request.questions, Respostas: c.response && c.response.answers, Estado: c.request && c.request.state };
      let primeira = true;
      for (const [nome, dado] of Object.entries(vistas)) {
        const b = el('button', { type: 'button', class: primeira ? 'on' : '', text: nome });
        b.onclick = () => { abas.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); pre.innerHTML = jsonCor(dado); };
        abas.append(b);
        if (primeira) { pre.innerHTML = jsonCor(dado); primeira = false; }
      }
      corpo.append(el('div', { class: 'mj-chamada' }, [
        el('div', { class: 'hd', html: `<span>#${c.n}</span><span><b>${c.n_questions}</b> pergunta(s)</span><span>latência <b>${fmt.ms(c.latency_ms)}</b></span><span>custo <b>${fmt.usd(c.cost)}</b></span>${c.cached ? '<span class="mj-chip">cache</span>' : ''}<span class="dim">${c.hora}</span>${c.rotulo ? `<span class="mj-chip acento">${esc(c.rotulo)}</span>` : ''}` }),
        abas, pre,
      ]));
    }
    gaveta.append(corpo);
    gaveta.classList.add('aberta');
  }

  function abrirDecisao(d) {
    const box = el('div', { class: 'mj-dec-detalhe' });
    box.append(el('p', { html: `<span class="mj-chip">${d.tipo}</span> <b>${esc(NOME_TIPO[d.tipo])}</b>` }));
    box.append(el('p', { class: 'mj-pergunta', text: d.pergunta }));
    if (d.tipo === 'choice') box.append(el('ul', {}, listaOpcoes(d, ctxBase).map((o) => el('li', { html: `<b>${esc(o.icone ? o.icone + ' ' : '')}${esc(o.rotulo)}</b> — ${esc(o.desc || '')}` }))));
    if (d.tipo === 'score') box.append(el('ol', { start: '0' }, listaNiveis(d).map((n) => el('li', { html: `<b>${esc(n.rotulo)}</b>${n.desc && n.desc !== n.rotulo ? ' — ' + esc(n.desc) : ''}` }))));
    if (d.tipo === 'noul') box.append(el('p', { class: 'dim', text: 'O Jev devolve a probabilidade de "sim". 0,5 quer dizer "não sei".' + (d.limiar ? ` Aqui, a partir de ${fmt.pct(d.limiar)} o app considera "sim".` : '') }));
    box.append(el('p', { class: 'dim', html: 'Para mudar a regra, edite esta decisão no <code>app.config.mjs</code>: o texto da pergunta e os critérios <b>são</b> a política.' }));
    modal(d.titulo || d.id, box);
  }

  function abrirComo() {
    const decs = (spec.decisoes || []).filter((d) => d.papel !== 'oculto');
    const box = el('div', { class: 'mj-como' }, [
      el('p', { text: spec.descricao || spec.resumo || '' }),
      el('div', { class: 'mj-marcas' }, (spec.marcas || []).map((m) => el('span', { class: 'mj-marca-tag', text: m }))),
      decs.length ? el('p', { class: 'dim', style: { margin: '14px 0 0' }, text: 'O Jev decide aqui (clique para ver a pergunta e as opções):' }) : null,
      el('div', { class: 'mj-decide-lista' }, decs.map((d) => {
        const det = d.tipo === 'choice' ? `${listaOpcoes(d, ctxBase).length} opções` : d.tipo === 'score' ? `${listaNiveis(d).length} níveis` : 'sim ou não';
        return el('button', { class: 'mj-dec', type: 'button', onclick: () => abrirDecisao(d) }, [el('i', { class: 't-' + d.tipo, text: MARCA_TIPO[d.tipo] }), el('b', { text: d.titulo || d.rotulo || d.id }), el('span', { text: det })]);
      })),
      spec.palco && spec.palco.comoTestar ? el('p', { style: { margin: '14px 0 0' }, html: '<b>Como testar ao vivo:</b> ' + esc(spec.palco.comoTestar) }) : null,
    ]);
    modal(spec.titulo, box, { largo: true });
  }

  function abrirAdapte() {
    const decs = (spec.decisoes || []).map((d) => {
      const base = { id: d.id, tipo: d.tipo, pergunta: d.pergunta };
      if (d.tipo === 'choice') base.opcoes = Object.fromEntries(listaOpcoes(d, ctxBase).slice(0, 4).map((o) => [o.id, o.desc || o.rotulo]));
      if (d.tipo === 'score') base.niveis = listaNiveis(d).map((n) => n.rotulo);
      return base;
    });
    const box = el('div', { class: 'mj-adapte' }, [
      el('p', { html: `Este app inteiro é definido num arquivo só, o <code>app.config.mjs</code>. Para usar no seu negócio:` }),
      el('ol', {}, [
        el('li', { html: window.MJ_KIT ? `Na pasta do kit, abra <code>apps/modelos/public/${spec.id}/app.config.mjs</code>.` : hosted ? 'Clique em <b>⬇ Baixar</b> e descompacte a pasta.' : 'Abra a pasta deste app.' }),
        el('li', { html: 'Troque o <b>contexto</b> (as regras e os dados do seu negócio), as <b>decisões</b> (as perguntas que o Jev responde) e os <b>dados</b> de exemplo.' }),
        el('li', { html: window.MJ_KIT ? 'Peça ao seu agente na pasta do kit: "adapte o app ' + spec.id + ' para a minha clínica / loja / escritório e publique".' : 'Crie uma chave em <b>openrouter.ai</b>, coloque no arquivo <code>.env</code> e rode <code>node server.mjs</code> (Node 22, sem instalar nada).' }),
        el('li', { html: window.MJ_KIT ? 'Para usar em outro projeto: <code>node kit/jev-kit.mjs exportar ' + spec.id + '</code>.' : 'Peça ajuda a qualquer IA: "adapte este app.config.mjs para a minha clínica / loja / escritório".' }),
      ]),
      el('p', { class: 'dim', text: 'As decisões deste app, como estão no arquivo (resumo):' }),
      el('pre', { class: 'mj-json', html: jsonCor(decs) }),
    ]);
    modal('Adapte para o seu caso', box, { largo: true });
  }

  // ---------- motor ----------
  let motor;
  try {
    const mod = await import(`./${spec.motor}.js`);
    motor = await mod.criar({ spec, area, decidir, contexto: ctxBase, registrar });
  } catch (e) {
    console.error(e);
    area.append(el('p', { class: 'mj-erro', text: 'Não consegui montar este app: ' + e.message }));
    return;
  }

  // ---------- reprodução automática (para o vídeo) ----------
  let ctl = null;
  async function tocar() {
    if (ctl) { ctl.abort(); return; }
    ctl = new AbortController();
    btPlay.classList.add('tocando'); btPlay.querySelector('.ic').textContent = '■'; btPlay.querySelector('.tx').textContent = 'Parar';
    try {
      await motor.tocar(ctl.signal);
    } catch (e) {
      if (e.name !== 'AbortError') { console.error(e); if (!e.status) toast('A demonstração parou: ' + e.message, 'erro'); }
    } finally {
      ctl = null;
      btPlay.classList.remove('tocando'); btPlay.querySelector('.ic').textContent = '▶'; btPlay.querySelector('.tx').textContent = 'Ver de novo';
    }
  }
  btPlay.addEventListener('click', tocar);
  if (params.has('auto')) { await sleep(500); tocar(); }
  window.MJ = { spec, metricas, chamadas, tocar, motor };
}

function aplicarTema(spec) {
  const t = spec.tema || {};
  const raiz = document.documentElement;
  if (t.acento) raiz.style.setProperty('--mj-acento', t.acento);
  if (t.acento2) raiz.style.setProperty('--mj-acento2', t.acento2);
  if (t.modo === 'claro') raiz.classList.add('mj-claro');
  if (t.fonte === 'serif') raiz.classList.add('mj-serif');
  if (t.fonte === 'mono') raiz.classList.add('mj-mono');
}

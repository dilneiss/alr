// Tela do "O Jogo que Lê Você": à esquerda o que o Jev leu, no meio o jogo (canvas), à direita o diretor.
// A cada 4 s de jogo (e no fim de cada onda) vai UMA chamada assíncrona (jogada "dirigir"): o jogo nunca espera a resposta.
// O jogo em si mora em jogo.js (sem DOM) e o desenho em desenho.js; aqui ficam o HUD, os controles, a pausa e a demonstração.
import { criarJogo, PASSO } from './jogo.js';
import { criarDesenho } from './desenho.js';

// a "voz" do diretor: frases nossas, curtas (cabem numa linha), sorteadas pelo estado que o Jev leu
const FALAS = {
  entediado: ['Fácil demais? Vou apertar.', 'Bocejando? Segura essa.', 'Tá voando. Hora do chefe.'],
  no_ponto: ['Assim que eu gosto.', 'Desafio na medida certa.', 'Ritmo bom. Vou manter.'],
  frustrado: ['Calma, eu te ajudo.', 'Vou aliviar um pouco.', 'Respira. Toma uma ajuda.'],
  distraido: ['Ei, ainda está aí?', 'Parou? Deixo tudo calmo.', 'Esperando você voltar.'],
};
const ICONE_SINAL = { tempo: '⏱️', tiros: '💥', mortes: '💔', vida: '❤️', escudo: '🛡️', semdano: '⏳', chefe: '👑', calma: '🌙', abates: '✨', mira: '🎯', movimento: '↔️', comando: '🎮', triz: '⚡' };
const SEMENTE_DEMO = 20261021;

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep } = ui;
  const CAD = (spec.diretor && spec.diretor.cadencia) || 4;
  const ESTADO = Object.fromEntries(spec.estados.map((e) => [e.id, e]));
  const ONDA = Object.fromEntries(spec.ondas.map((o) => [o.id, o]));
  const NIVEIS = spec.niveis;

  // ---------------- tela ----------------
  const raiz = el('div', { class: 'jl' });
  const canvas = el('canvas', { class: 'jl-tela', tabindex: '0', 'aria-label': 'Jogo de nave. Mova com as setas, WASD ou o mouse; no celular, arraste o dedo. A nave atira sozinha.' });
  const piloto = el('div', { class: 'jl-piloto', hidden: true, role: 'status' });
  const banner = el('div', { class: 'jl-banner', 'aria-live': 'polite' });
  const aviso = el('div', { class: 'jl-aviso', 'aria-live': 'polite' });
  const capa = el('div', { class: 'jl-capa' });
  const btPausa = el('button', { class: 'jl-bt-pausa', type: 'button', 'aria-label': 'Pausar o jogo', title: 'Pausar (P)', onclick: () => (pausado ? continuar() : pausar('botao')) }, ['⏸']);
  const jogoBox = el('section', { class: 'jl-jogo', 'aria-label': 'O jogo' }, [canvas, piloto, banner, aviso, capa, btPausa]);

  // painel do diretor (direita)
  const ritmo = el('div', { class: 'jl-ritmo', 'aria-hidden': 'true' }, [el('i')]);
  const fitaBox = el('div', { class: 'jl-fita' }, [api.fita.no]);
  const leEmo = el('span', { class: 'emo', text: '🎬' });
  const leNome = el('b', { class: 'nome', text: 'lendo você…' });
  const lePct = el('span', { class: 'pct mj-num', text: '' });
  const leFala = el('p', { class: 'jl-fala', text: 'A primeira leitura sai em 4 s de jogo.' });
  const leitura = el('div', { class: 'jl-leitura' }, [
    el('p', { class: 'jl-rot', text: 'O Jev acha que você está:' }),
    el('div', { class: 'jl-estado' }, [leEmo, leNome, lePct]),
    leFala,
  ]);
  const barras = el('ul', { class: 'jl-barras', 'aria-label': 'Probabilidade de cada estado' });
  const linhaEstado = {};
  for (const e of spec.estados) {
    const li = el('li', { style: { '--cor': e.cor } }, [el('i', { class: 'fil' }), el('span', { class: 'emo', text: e.emoji }), el('span', { class: 'nm', text: e.rotulo }), el('span', { class: 'pc mj-num', text: '—' })]);
    linhaEstado[e.id] = li; barras.append(li);
  }
  const plOnda = el('b', { text: '—' }), plOndaP = el('span', { class: 'p mj-num', text: '' });
  const plInt = el('b', { text: '—' }), plSeg = el('span', { class: 'seg', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map(() => el('i')));
  const plAj = el('b', { text: '—' }), plAjP = el('span', { class: 'p mj-num', text: '' });
  const plano = el('div', { class: 'jl-plano' }, [
    el('div', { class: 'jl-pl' }, [el('span', { class: 'r', text: 'Próxima onda' }), el('span', { class: 'v' }, [plOnda, plOndaP])]),
    el('div', { class: 'jl-pl' }, [el('span', { class: 'r', text: 'Intensidade' }), el('span', { class: 'v' }, [plSeg, plInt])]),
    el('div', { class: 'jl-pl' }, [el('span', { class: 'r', text: 'Ajuda agora' }), el('span', { class: 'v' }, [plAj, plAjP])]),
  ]);
  const registro = el('ol', { class: 'jl-reg-lista', 'aria-live': 'polite' });
  const dir = el('aside', { class: 'jl-dir', 'aria-label': 'O diretor' }, [
    el('header', { class: 'jl-cab linha', title: `O Jev lê você a cada ${CAD} s de jogo` }, [el('h3', { text: '🎬 O diretor' }), fitaBox]),
    ritmo, leitura, barras, plano,
    el('section', { class: 'jl-reg' }, [el('h4', { text: 'Registro das decisões' }), registro]),
  ]);

  // painel do que o Jev leu (esquerda)
  const sinais = el('ul', { class: 'jl-sinais' }, [el('li', { class: 'vazio', text: 'As medidas do seu jogo aparecem aqui na primeira leitura.' })]);
  const leu = el('aside', { class: 'jl-leu', 'aria-label': 'O que o Jev leu' }, [
    el('header', { class: 'jl-cab' }, [el('div', {}, [el('h3', { text: '📡 O que o Jev leu' }), el('p', { text: 'últimos 15 s, em palavras' })])]),
    sinais,
    el('footer', { class: 'jl-leu-pe' }, [som.botao(el), el('span', { class: 'jl-dica', text: 'o código mede, o Jev decide' })]),
  ]);

  raiz.append(leu, jogoBox, dir);
  area.append(raiz);

  // ---------------- jogo e desenho ----------------
  const desenho = criarDesenho(canvas, { reduzMovimento: ui.reduzMovimento });
  const jogo = criarJogo({ largura: 860, semente: 7, aoEvento: (t, d) => aoEvento(t, d) });
  const J = jogo.J;
  let modo = 'inicio';          // inicio · demo · jogo · fim
  let pausado = false;
  let partida = 0;
  let recorde = (() => { try { return +localStorage.getItem('jogo-le-voce:recorde') || 0; } catch { return 0; } })();
  const D = { proxima: CAD, ultima: -9, emVoo: false, desde: 0, seq: 0, erros: 0, esperaAte: 0, leituras: 0, estado: null, assumiu: false, chefeVencido: false, ondaVista: 0, mudancas: [] };

  function medir() {
    const r = jogoBox.getBoundingClientRect();
    const W = desenho.redimensionar(r.width, r.height);
    jogo.redimensionar(W);
  }
  new ResizeObserver(medir).observe(jogoBox);
  medir();

  // fundo animado da capa: o piloto automático joga sozinho, sem chamar o Jev e sem som
  function modoVitrine() {
    jogo.novaPartida({ semente: 99, primeira: 'formacao', intensidade: 1 });
    J.piloto = 'bem';
  }
  modoVitrine();
  mostrarCapa('inicio');

  // ---------------- laço (60 fps, passo fixo) ----------------
  let ultimo = performance.now(), acum = 0, hudT = 0;
  const lento = { ate: 0, fator: 1 };   // câmera lenta curta na morte e na explosão do chefe
  function camLenta(ms, fator) { if (!ui.reduzMovimento) { lento.ate = performance.now() + ms; lento.fator = fator; } }
  function quadro(agora) {
    const dtReal = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
    const dt = agora < lento.ate ? dtReal * lento.fator : dtReal;
    if (!pausado) {
      acum += dt; let n = 0;
      while (acum >= PASSO && n < 14) { jogo.passo(PASSO); acum -= PASSO; n++; }
      if (n >= 14) acum = 0;
      if (teclas.size && modo === 'jogo') jogo.marcarComando();
      if (modo === 'vitrine' || modo === 'inicio' || modo === 'fim') { if (J.nave && J.nave.vida < 2) J.nave.vida = 3; }
    }
    if (modo === 'jogo' && recorde > 0 && J.pontos > recorde && !D.avisouRecorde) { D.avisouRecorde = true; desenho.evento('recorde', {}); tocarSom('acerto', 0); }
    desenho.desenhar(jogo, pausado ? 0 : dt, { hud: modo === 'jogo' || modo === 'demo' });
    if (!pausado && (modo === 'jogo' || modo === 'demo')) diretor();
    hudT -= dtReal;
    if (hudT <= 0) { hudT = 0.1; hudRapido(); }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  function hudRapido() {
    const ativo = modo === 'jogo' || modo === 'demo';
    const u = ativo ? Math.min(1, Math.max(0, (J.t - D.ultima) / CAD)) : 0;
    ritmo.firstChild.style.transform = `scaleX(${D.emVoo ? 1 : u})`;
    ritmo.classList.toggle('lendo', D.emVoo);
  }
  // recorde: só das partidas jogadas por gente (a demonstração não conta)
  function salvarRecorde() {
    if (modo !== 'jogo' || J.pontos <= recorde) return;
    recorde = J.pontos;
    try { localStorage.setItem('jogo-le-voce:recorde', String(recorde)); } catch { /* sem armazenamento */ }
  }

  // ---------------- o diretor (o Jev) ----------------
  function diretor() {
    if (D.emVoo && performance.now() - D.desde < 6000) return;
    if (J.t < D.esperaAte) return;
    const o = J.onda;
    const fimOnda = o && o.acabou && D.ondaVista !== o.n;
    if (fimOnda) D.ondaVista = o.n;
    if (J.t >= D.proxima || (fimOnda && J.t - D.ultima > 1.5)) chamar(fimOnda ? 'fim da onda' : 'leitura');
  }

  async function chamar(motivo) {
    const meu = ++D.seq, minhaPartida = partida;
    D.emVoo = true; D.desde = performance.now(); D.ultima = J.t; D.proxima = J.t + CAD;
    const dados = jogo.medidas();
    try {
      const r = await api.jev('dirigir', dados, `onda ${dados.onda.n} · ${motivo}`, { silencioso: true });
      if (meu !== D.seq || minhaPartida !== partida || !(modo === 'jogo' || modo === 'demo')) return;
      D.erros = 0;
      aplicar(r, dados);
    } catch (e) {
      if (minhaPartida !== partida) return;
      D.erros++;
      D.esperaAte = J.t + Math.min(30, CAD * 2 ** D.erros);
      leFala.textContent = 'Sem sinal do Jev agora: o jogo segue com as ondas padrão.';
    } finally {
      if (meu === D.seq) D.emVoo = false;
    }
  }

  function aplicar(r, dados) {
    const e = r.estado_jogador; if (!e) return;
    D.leituras++;
    const out = jogo.aplicarDecisao(r, spec.diretor);
    const est = ESTADO[e.choice] || spec.estados[1];
    const p = (e.probabilities || {})[e.choice] || 0;
    // leitura grande
    if (leEmo.textContent !== est.emoji) { leEmo.textContent = est.emoji; leEmo.classList.remove('pula'); void leEmo.offsetWidth; leEmo.classList.add('pula'); }
    leNome.textContent = est.rotulo;
    lePct.textContent = fmt.pct(p);
    leitura.style.setProperty('--cor', est.cor);
    leitura.classList.toggle('certo', p >= 0.6);
    const falas = FALAS[est.id] || FALAS.no_ponto;
    leFala.textContent = `“${falas[D.leituras % falas.length]}”`;
    // barras dos 4 estados
    for (const s of spec.estados) {
      const v = (e.probabilities || {})[s.id] || 0;
      const li = linhaEstado[s.id];
      li.style.setProperty('--p', v.toFixed(3));
      li.querySelector('.pc').textContent = v >= 0.995 ? '99%' : v < 0.01 ? '<1%' : fmt.pct(v);
      li.classList.toggle('top', s.id === e.choice);
    }
    // plano
    const pl = J.plano;
    const proxima = pl ? pl.onda : (J.proximaTipo || null);
    const on = ONDA[proxima];
    const pOnda = r.proxima_onda && r.proxima_onda.probabilities ? r.proxima_onda.probabilities[proxima] : null;
    plOnda.textContent = on ? `${on.icone} ${on.curto}` : '—';
    plOndaP.textContent = pOnda ? fmt.pct(pOnda) : '';
    const nivel = Math.round(J.intensidade);
    if (D.intAnterior != null && nivel !== D.intAnterior) desenho.evento('intensidade', { nivel: (NIVEIS[nivel] || '').toUpperCase(), sobe: nivel > D.intAnterior });
    D.intAnterior = nivel;
    plInt.textContent = NIVEIS[nivel] || '—';
    [...plSeg.children].forEach((s, i) => s.classList.toggle('on', i <= nivel));
    plSeg.style.setProperty('--n', String(nivel));
    const aj = r.ajudar ? r.ajudar.noul : 0;
    const sim = aj >= ((spec.diretor && spec.diretor.limiarAjuda) || 0.6);
    plAj.textContent = sim ? (out.ajuda ? (out.ajuda.tipo === 'vida' ? '❤️ vida já' : '🛡️ escudo já') : 'sim') : 'não';
    plAj.parentElement.classList.toggle('sim', sim);
    plAjP.textContent = fmt.pct(sim ? aj : 1 - aj);
    // o que o Jev leu
    desenharSinais(spec.emPalavras(dados).itens);
    // registro
    if (D.estado && D.estado !== est.id && p >= 0.5) {
      registrar('🧠 Mudou de ideia', `${ESTADO[D.estado].emoji} ${ESTADO[D.estado].rotulo} → ${est.emoji} ${est.rotulo} (${fmt.pct(p)})`, 'muda');
      D.mudancas.push(est.id);
      som.tique();
    }
    if (!D.estado) D.mudancas.push(est.id);
    if (p >= 0.5) D.estado = est.id;
    if (out.corte) {
      const c = out.corte;
      if (c.para === 'chefe') registrar('✂️ Cortou a onda: chefe já', `você está ${est.emoji} ${est.rotulo} (${fmt.pct(c.p)})`, 'corte');
      else registrar(J.onda && J.onda.tipo === 'chefe' ? '✂️ Aliviou: o chefe recuou' : '✂️ Aliviou: fim da onda', `você está ${est.emoji} ${est.rotulo} (${fmt.pct(c.p)})`, 'corte');
      som.apito();
    }
    if (out.ajuda) registrar(out.ajuda.tipo === 'vida' ? '❤️ Vida extra agora' : '🛡️ Escudo agora', `você está ${est.emoji} ${est.rotulo} (${fmt.pct(p)})`, 'ajuda');
    const chefeVem = (J.onda && J.onda.tipo === 'chefe' && !J.onda.acabou) || J.proximaTipo === 'chefe';
    desenho.humor(chefeVem ? 'chefe' : est.id);
  }

  function desenharSinais(itens) {
    sinais.innerHTML = '';
    // na tela, o tempo de jogo vai por último (é o sinal menos importante); para o Jev a ordem não muda
    const ordem = [...itens.filter((x) => x.k !== 'tempo'), ...itens.filter((x) => x.k === 'tempo')];
    for (const it of ordem) {
      sinais.append(el('li', { class: 'tom-' + (it.tom || 'neutro') }, [el('i', { text: ICONE_SINAL[it.k] || '•', 'aria-hidden': 'true' }), el('span', { text: it.t })]));
    }
  }

  function registrar(titulo, motivo, tipo = '') {
    const s = Math.floor(J.t), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
    const li = el('li', { class: 'r-' + tipo }, [el('time', { class: 'mj-num', text: `${mm}:${ss}` }), el('div', {}, [el('b', { text: titulo }), motivo ? el('span', { text: motivo }) : null])]);
    registro.prepend(li);
    while (registro.children.length > 9) registro.lastChild.remove();
  }

  // ---------------- eventos do jogo → som, banner, aviso ----------------
  const somT = {};
  function tocarSom(nome, ms, ...a) {
    if (!(modo === 'jogo' || modo === 'demo')) return;
    const agora = performance.now();
    if (somT[nome] && agora - somT[nome] < ms) return;
    somT[nome] = agora;
    try { som[nome](...a); } catch { /* sem áudio */ }
  }
  function aoEvento(tipo, d) {
    desenho.evento(tipo, d);
    const vivo = modo === 'jogo' || modo === 'demo';
    switch (tipo) {
      case 'tiro': tocarSom('laser', 125); break;
      case 'abate': tocarSom('explosao', 70, 0.45); break;
      case 'dano': tocarSom('erro', 120); break;
      case 'morte': tocarSom('explosao', 0, 1.6); tocarSom('erro', 0); if (vivo) camLenta(520, 0.35); break;
      case 'item': tocarSom('poder', 100); break;
      case 'triz': tocarSom('tique', 140); break;
      case 'chefeEntrou': tocarSom('whoosh', 0); break;
      case 'chefeMorreu':
        tocarSom('explosao', 0, 2.2); tocarSom('torcida', 0, 0.7); tocarSom('aplauso', 0, 1);
        if (vivo) camLenta(800, 0.3);
        if (vivo) { D.chefeVencido = true; registrar('👑 Chefe derrotado!', `+${fmt.int(d.pontos)} pontos`, 'ajuda'); }
        break;
      case 'chefeFugiu': if (vivo && !(J.onda && J.onda.encurtada)) registrar('👑 O chefe fugiu', 'demorou demais', ''); break;
      case 'ajuda': if (vivo) { tocarSom('ding', 0); mostrarAviso(d.tipo === 'vida' ? '❤️ O diretor te mandou uma vida' : '🛡️ O diretor te mandou um escudo', d.tipo); } break;
      case 'chefeAviso':
        if (vivo) { tocarSom('alarme', 0); mostrarBanner({ alerta: true, titulo: '⚠ CHEFE A CAMINHO', motivo: d.motivo }); desenho.humor('chefe'); }
        break;
      case 'ondaInicio': {
        if (!vivo) break;
        const o = ONDA[d.tipo];
        const m = d.motivo || {};
        let porque;
        if (m.estado && ESTADO[m.estado]) porque = `porque você está ${ESTADO[m.estado].emoji} ${ESTADO[m.estado].rotulo} (${fmt.pct(m.p)})`;
        else if (m.padrao === 'aquecimento') porque = 'aquecimento: o Jev ainda está lendo você';
        else porque = 'onda padrão: o Jev não respondeu a tempo';
        if (d.tipo !== 'chefe') tocarSom('whoosh', 0);
        mostrarBanner({ n: d.n, titulo: `${o.icone} ${o.nome.toUpperCase()}`, sub: porque });
        registrar(`Onda ${d.n}: ${o.icone} ${o.nome}`, porque, d.tipo === 'chefe' ? 'chefe' : 'onda');
        if (d.tipo === 'chefe') desenho.humor('chefe');
        else if (D.estado) desenho.humor(D.estado);
        break;
      }
      default: break;
    }
  }

  let bannerT = null, avisoT = null;
  function mostrarBanner({ n, titulo, sub, alerta, motivo }) {
    banner.innerHTML = '';
    banner.className = 'jl-banner' + (alerta ? ' alerta' : '');
    if (n) banner.append(el('span', { class: 'n mj-num', text: `ONDA ${n}` }));
    banner.append(el('b', { text: titulo }));
    if (alerta && motivo && motivo.estado && ESTADO[motivo.estado]) sub = `o Jev acha que você está ${ESTADO[motivo.estado].emoji} ${ESTADO[motivo.estado].rotulo} (${fmt.pct(motivo.p)})`;
    if (sub) banner.append(el('span', { class: 's', text: sub }));
    void banner.offsetWidth; banner.classList.add('on');
    clearTimeout(bannerT); bannerT = setTimeout(() => banner.classList.remove('on'), alerta ? 2600 : 2400);
  }
  function mostrarAviso(texto, tipo) {
    aviso.textContent = texto; aviso.className = 'jl-aviso t-' + (tipo || '');
    void aviso.offsetWidth; aviso.classList.add('on');
    clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('on'), 2300);
  }

  // ---------------- partidas ----------------
  function zerarHud(titulo, motivo) {
    D.proxima = CAD; D.ultima = 0; D.emVoo = false; D.seq++; D.erros = 0; D.esperaAte = 0; D.leituras = 0; D.estado = null; D.chefeVencido = false; D.ondaVista = 0; D.mudancas = []; D.assumiu = false; D.avisouRecorde = false; D.intAnterior = 2;
    leEmo.textContent = '🎬'; leNome.textContent = 'lendo você…'; lePct.textContent = ''; leitura.style.removeProperty('--cor'); leitura.classList.remove('certo');
    leFala.textContent = `A primeira leitura sai em ${CAD} s de jogo.`;
    for (const s of spec.estados) { const li = linhaEstado[s.id]; li.style.setProperty('--p', '0'); li.querySelector('.pc').textContent = '—'; li.classList.remove('top'); }
    plOnda.textContent = '—'; plOndaP.textContent = ''; plInt.textContent = NIVEIS[2]; [...plSeg.children].forEach((s, i) => s.classList.toggle('on', i <= 2)); plSeg.style.setProperty('--n', '2');
    plAj.textContent = '—'; plAjP.textContent = ''; plAj.parentElement.classList.remove('sim');
    sinais.innerHTML = ''; sinais.append(el('li', { class: 'vazio', text: 'As medidas do seu jogo aparecem aqui na primeira leitura.' }));
    registro.innerHTML = '';
    registrar(titulo, motivo, 'inicio');
    desenho.humor('neutro');
  }

  function iniciar(qual) {
    partida++;
    salvarRecorde();
    pausado = false; ultimo = performance.now();
    btPausa.textContent = '⏸'; btPausa.setAttribute('aria-label', 'Pausar o jogo');
    esconderCapa();
    if (qual === 'demo') {
      modo = 'demo';
      jogo.novaPartida({ semente: SEMENTE_DEMO, primeira: 'cacadores', intensidade: 2 });
      J.piloto = 'mal';
      zerarHud('▶ Demonstração', 'um piloto automático joga mal por 10 s e depois bem');
      mostrarPiloto('mal');
    } else {
      modo = 'jogo';
      jogo.novaPartida({ semente: (Date.now() & 0x7fffffff) || 1, primeira: 'enxame', intensidade: 2 });
      J.piloto = null;
      zerarHud('🎮 Partida nova', `o diretor lê você a cada ${CAD} s`);
      mostrarPiloto(null);
      try { canvas.focus({ preventScroll: true }); } catch { /* sem foco */ }
    }
    mostrarPausa();
  }

  function assumir() {
    if (modo !== 'demo') return;
    D.assumiu = true;
    modo = 'jogo';
    J.piloto = null;
    jogo.reiniciarMedidas();
    D.proxima = J.t + CAD; D.ultima = J.t;
    mostrarPiloto(null);
    registrar('🎮 Você assumiu o controle', 'agora o diretor lê você', 'inicio');
    try { canvas.focus({ preventScroll: true }); } catch { /* sem foco */ }
  }

  function fimDaDemo() {
    salvarRecorde();
    modo = 'fim';
    J.piloto = 'bem';
    J.intensidade = Math.min(J.intensidade, 2);
    mostrarPiloto(null);
    mostrarCapa('fim');
  }

  function mostrarPiloto(qual) {
    piloto.hidden = !qual;
    piloto.className = 'jl-piloto ' + (qual || '');
    piloto.innerHTML = '';
    if (qual) piloto.append(el('p', {}, [el('b', { text: '🤖 Piloto automático: ' }), el('span', { text: qual === 'mal' ? 'jogando MAL de propósito' : 'agora jogando BEM' })]), el('small', { text: 'aperte uma seta para assumir' }));
  }

  // ---------------- capa: início, pausa e fim da demonstração ----------------
  function mostrarCapa(tipo) {
    capa.innerHTML = '';
    capa.className = 'jl-capa on c-' + tipo;
    const btJogar = el('button', { class: 'jl-bt', type: 'button', onclick: () => iniciar('jogo') }, ['▶ ', tipo === 'fim' ? 'Jogar agora' : 'Jogar']);
    const ctrl = el('p', { class: 'jl-ctrl' }, [el('span', { text: '⌨️ setas ou WASD' }), el('span', { text: '🖱️ mouse' }), el('span', { text: '📱 arraste o dedo' })]);
    let cartao;
    if (tipo === 'inicio') {
      cartao = el('div', { class: 'jl-cartao' }, [
        el('span', { class: 'jl-logo', text: '👾', 'aria-hidden': 'true' }),
        el('h2', { text: 'O Jogo que Lê Você' }),
        el('p', { class: 'jl-sub', text: `A nave atira sozinha: você só desvia. A cada ${CAD} s o Jev lê o seu jeito de jogar e escolhe a próxima onda.` }),
        btJogar, ctrl,
        recorde > 0 ? el('p', { class: 'jl-recorde mj-num', text: `Seu recorde: ${fmt.int(recorde)}` }) : null,
        el('p', { class: 'jl-mini', text: 'Ou aperte ▶ Ver funcionando lá em cima: um piloto automático joga mal e depois bem.' }),
      ]);
    } else if (tipo === 'pausa') {
      cartao = el('div', { class: 'jl-cartao' }, [
        el('span', { class: 'jl-logo', text: '⏸', 'aria-hidden': 'true' }),
        el('h2', { text: 'Pausado' }),
        el('p', { class: 'jl-sub', text: 'A aba perdeu o foco, e o Jev parou de ler você. Nada acontece enquanto você está fora.' }),
        el('button', { class: 'jl-bt', type: 'button', onclick: () => continuar() }, ['▶ Continuar']),
        el('p', { class: 'jl-mini', text: 'Atalho: P pausa e continua.' }),
      ]);
    } else {
      const caminho = D.mudancas.filter((x, i, a) => i === 0 || a[i - 1] !== x).map((x) => (ESTADO[x] ? `${ESTADO[x].emoji} ${ESTADO[x].rotulo}` : x));
      cartao = el('div', { class: 'jl-cartao' }, [
        el('span', { class: 'jl-logo', text: '🎮', 'aria-hidden': 'true' }),
        el('h2', { text: 'Sua vez!' }),
        el('p', { class: 'jl-sub', text: 'Jogue mal de propósito e veja o diretor ajudar. Jogue bem e ele manda o chefe.' }),
        caminho.length > 1 ? el('p', { class: 'jl-caminho', text: `Com o piloto, o Jev mudou de ideia: ${caminho.join(' → ')}` }) : null,
        btJogar, ctrl,
      ]);
    }
    capa.append(cartao);
    mostrarPausa();
  }
  function esconderCapa() { capa.className = 'jl-capa'; capa.innerHTML = ''; mostrarPausa(); }
  function mostrarPausa() { btPausa.hidden = !(modo === 'jogo' || modo === 'demo'); }

  // ---------------- pausa ----------------
  function pausar(porque) {
    if (pausado || !(modo === 'jogo' || modo === 'demo')) return;
    pausado = true; teclas.clear(); atualizarDirecao();
    btPausa.textContent = '▶'; btPausa.setAttribute('aria-label', 'Continuar o jogo');
    mostrarCapa('pausa');
    if (porque === 'botao' || porque === 'tecla' || porque === 'modal') capa.querySelector('.jl-sub').textContent = 'Jogo parado. O Jev também não lê você enquanto isso.';
  }
  function continuar() {
    if (!pausado) return;
    pausado = false; ultimo = performance.now();
    btPausa.textContent = '⏸'; btPausa.setAttribute('aria-label', 'Pausar o jogo');
    esconderCapa();
    try { canvas.focus({ preventScroll: true }); } catch { /* sem foco */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar('aba'); });
  // abrir "Como funciona", "O que o Jev vê" ou "Adapte" no meio de uma partida pausa o jogo (na demonstração, não)
  const topoMotor = document.querySelector('.mj-topo');
  if (topoMotor) topoMotor.addEventListener('click', () => setTimeout(() => { if (modo === 'jogo' && modalAberto()) pausar('modal'); }, 60));
  window.addEventListener('blur', () => { teclas.clear(); atualizarDirecao(); pausar('foco'); });

  // ---------------- controles ----------------
  const teclas = new Set();
  const MAPA = { ArrowLeft: 'esq', a: 'esq', A: 'esq', ArrowRight: 'dir', d: 'dir', D: 'dir', ArrowUp: 'cima', w: 'cima', W: 'cima', ArrowDown: 'baixo', s: 'baixo', S: 'baixo' };
  const modalAberto = () => !!document.querySelector('.mj-modal-fundo, .mj-gaveta.aberta');
  function atualizarDirecao() {
    J.entrada.dx = (teclas.has('dir') ? 1 : 0) - (teclas.has('esq') ? 1 : 0);
    J.entrada.dy = (teclas.has('baixo') ? 1 : 0) - (teclas.has('cima') ? 1 : 0);
  }
  window.addEventListener('keydown', (e) => {
    const alvo = e.target;
    if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
    if (modalAberto()) return;
    const k = MAPA[e.key];
    if (k) {
      e.preventDefault();
      if (pausado) { continuar(); return; }
      if (modo === 'inicio' || modo === 'fim') { iniciar('jogo'); }
      if (modo === 'demo') assumir();
      teclas.add(k); J.entrada.alvo = null; mouse.ativo = false; mouse.ancora = null; atualizarDirecao(); jogo.marcarComando();
      return;
    }
    if (e.key === 'Shift') J.entrada.foco = true;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (pausado) continuar(); else pausar('tecla'); e.preventDefault(); }
    if ((e.key === 'Enter' || e.key === ' ') && (alvo === document.body || alvo === canvas)) {
      if (pausado) { continuar(); e.preventDefault(); }
      else if (modo === 'inicio' || modo === 'fim') { iniciar('jogo'); e.preventDefault(); }
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = MAPA[e.key];
    if (k) { teclas.delete(k); atualizarDirecao(); }
    if (e.key === 'Shift') J.entrada.foco = false;
  });

  // mouse: a nave segue o ponteiro; dedo: a nave anda o tanto que o dedo anda (o dedo não cobre a nave)
  const toque = { id: null, x0: 0, y0: 0, nx: 0, ny: 0 };
  const mouse = { ativo: true, ancora: null };   // depois de usar o teclado, o mouse só volta a mandar se andar de verdade
  function mundo(e) { const r = canvas.getBoundingClientRect(); const s = desenho.escala || 1; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; }
  canvas.addEventListener('pointermove', (e) => {
    if (modo !== 'jogo' || pausado) return;
    if (e.pointerType === 'mouse') {
      if (!mouse.ativo) {
        if (!mouse.ancora) { mouse.ancora = { x: e.clientX, y: e.clientY }; return; }
        if (Math.hypot(e.clientX - mouse.ancora.x, e.clientY - mouse.ancora.y) < 10) return;
        mouse.ativo = true;
      }
      J.entrada.alvo = mundo(e); jogo.marcarComando(); return;
    }
    if (toque.id === e.pointerId) {
      const p = mundo(e);
      J.entrada.alvo = { x: toque.nx + (p.x - toque.x0) * 1.3, y: toque.ny + (p.y - toque.y0) * 1.3 };
      jogo.marcarComando(); e.preventDefault();
    }
  });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') J.entrada.alvo = null; });
  canvas.addEventListener('pointerdown', (e) => {
    if (pausado) { continuar(); return; }
    if (modo === 'demo') { assumir(); }
    if (modo !== 'jogo') return;
    if (e.pointerType !== 'mouse') {
      const p = mundo(e);
      toque.id = e.pointerId; toque.x0 = p.x; toque.y0 = p.y; toque.nx = J.nave.x; toque.ny = J.nave.y;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      e.preventDefault();
    } else { mouse.ativo = true; J.entrada.alvo = mundo(e); }
    jogo.marcarComando();
  });
  const soltar = (e) => { if (toque.id === e.pointerId) { toque.id = null; J.entrada.alvo = null; } };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  window.addEventListener('pagehide', salvarRecorde);
  // gancho para gravar a tela (não aparece): onde o mouse de quem joga bem estaria agora, em coordenadas da página
  window.jogoLeVoce = {
    alvoSugerido() {
      if (modo !== 'jogo' || pausado) return null;
      const a = jogo.sugerirAlvo(); if (!a) return null;
      const r = canvas.getBoundingClientRect(), k = desenho.escala || 1;
      return { x: r.left + a.x * k, y: r.top + a.y * k };
    },
  };

  // ---------------- demonstração do ▶ ----------------
  async function esperarJogo(seg, sinal) {
    const alvo = J.t + seg;
    while (J.t < alvo && !D.assumiu) await sleep(100, sinal);
  }
  async function esperarAte(cond, sinal) { while (!cond()) await sleep(100, sinal); }

  async function tocar(sinal) {
    iniciar('demo');
    try {
      await esperarJogo(10.5, sinal);
      if (D.assumiu) return;
      J.piloto = 'bem';
      mostrarPiloto('bem');
      registrar('🤖 O piloto passou a jogar bem', 'nenhum tiro, abate quase tudo', 'inicio');
      const t0 = J.t;
      await esperarAte(() => D.assumiu || D.chefeVencido || J.t - t0 > 42, sinal);
      if (D.chefeVencido && !D.assumiu) await esperarJogo(2.6, sinal);
    } finally {
      if (!D.assumiu && modo === 'demo') fimDaDemo();
    }
  }

  return { tocar };
}

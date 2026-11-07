// Tela do "Editor que Corta Enquanto Você Fala": um estúdio de gravação. REC grava o microfone (worklet = PCM no mesmo
// relógio do VAD; MediaRecorder guarda o original compactado), o reconhecedor de voz dá o texto, cada frase fechada vai
// ao Jev (jogada "frase") e a linha do tempo pinta o que fica e o que sai. Ao parar: a emenda, o karaokê e o .wav.
// A demonstração (▶) toca assets/exemplo.mp3 pelo MESMO caminho: o áudio entra na captura e o texto chega pelo mesmo
// leitor do reconhecedor, nos tempos medidos uma vez (assets/exemplo.json). A lógica sem tela fica em emenda.mjs.
import * as E from './emenda.mjs';

// captura: junta os canais e manda blocos de 2048 amostras para a página (o relógio da gravação = amostras / taxa)
const WORKLET = `class EcCaptura extends AudioWorkletProcessor {
  constructor() { super(); this.b = new Float32Array(2048); this.i = 0; this.on = true;
    this.port.onmessage = (e) => { if (e.data === 'parar') { if (this.i) this.port.postMessage(this.b.slice(0, this.i)); this.port.postMessage('fim'); this.on = false; } }; }
  process(ins) {
    if (!this.on) return false;
    const x = ins[0]; if (!x || !x.length) return true;
    const a = x[0], b = x[1];
    for (let k = 0; k < a.length; k++) {
      this.b[this.i++] = b ? (a[k] + b[k]) * 0.5 : a[k];
      if (this.i === 2048) { this.port.postMessage(this.b, [this.b.buffer]); this.b = new Float32Array(2048); this.i = 0; }
    }
    return true;
  }
}
registerProcessor('ec-captura', EcCaptura);`;

const SELO = { mantida: '✓ fica', suspensa: '… pela metade?', pendente: 'Jev decidindo…', cortada: '✂ sai' };
const ICONE = { hesitacao: '😶', bastidor: '🎬', metade: '✂️', repeticao: '🔁', refeita: '↻', apagada: '🗑️', comando: '🗣️', manual: '✋', sem_texto: '〰' };
const LIMITE_S = 600; // 10 minutos por gravação

const bonito = (t) => { t = String(t || '').trim(); return t ? t[0].toUpperCase() + t.slice(1) : t; };
const relogio = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); const r = s - m * 60; return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0').replace('.', ',')}`; };

export async function montar(api) {
  const { area, ui, som } = api;
  const { el, fmt, sleep, toast } = ui;
  const seg = (x, d = 1) => fmt.num(x, d) + ' s';

  // ---------- estado ----------
  let fase = 'pronto';        // pronto · gravando · fechando · editado
  let fonte = null;           // 'mic' | 'demo'
  let sessao = 0;             // troca a cada gravação: respostas velhas do Jev são ignoradas
  let ac = null, worklet = null, mudo = null;
  let G = null;               // a gravação atual
  let plano = null, bufEditado = null, bufOriginal = null, pcmEditado = null, blobOriginal = null;
  let tocando = null;         // { qual, src, t0, fim }
  let exemplo = null;         // { buffer, frases }
  let raf = 0, mostrado = 0, idleT = 0;

  // ---------- tela ----------
  const btRec = el('button', { class: 'ec-rec', type: 'button', 'aria-label': 'Gravar', 'aria-pressed': 'false', title: 'Gravar (tecla R)' }, [el('span', { class: 'ec-rec-anel', 'aria-hidden': 'true' }), el('span', { class: 'ec-rec-ic', 'aria-hidden': 'true' }), el('span', { class: 'ec-rec-tx', text: 'REC' })]);
  const elTempo = el('b', { class: 'ec-tempo mj-num', text: '00:00,0' });
  const elEstado = el('span', { class: 'ec-estado', role: 'status', text: 'pronto para gravar' });
  const cvOnda = el('canvas', { class: 'ec-onda', 'aria-hidden': 'true' });
  const elFala = el('p', { class: 'ec-fala' });
  const elAnuncio = el('p', { class: 'ec-sr', 'aria-live': 'polite' });
  const elSelo = el('span', { class: 'ec-selo', text: '' });
  const elCortado = el('b', { class: 'ec-cortado mj-num', text: '0,0 s' });
  const elPct = el('span', { class: 'ec-pct mj-num', text: '0%' });
  const elDe = el('span', { class: 'ec-de', text: 'cortado até agora' });
  const cvFaixa = el('canvas', { class: 'ec-faixa-c', 'aria-hidden': 'true' });
  const elLeg = el('div', { class: 'ec-faixa-leg' });
  const lista = el('ol', { class: 'ec-blocos', 'aria-label': 'Frases da gravação, na ordem' });
  const vazio = el('div', { class: 'ec-vazio' }, [
    el('p', { class: 'ec-vazio-t', text: 'Aperte REC e grave como num vídeo de verdade.' }),
    el('p', { class: 'ec-vazio-d', html: 'Comece uma frase e diga <b>"não, peraí"</b>. Recomece a mesma frase quantas vezes quiser: só a <b>última tentativa</b> fica. Diga uma frase e emende <b>"corta isso"</b>: ela sai. Cada frase vira um bloco aqui, e o Jev decide na hora o que fica e o que sai.' }),
  ]);
  const btEditado = el('button', { class: 'ec-bt ec-bt-play', type: 'button', disabled: true }, ['▶ Ouvir a versão editada']);
  const btOriginal = el('button', { class: 'ec-bt', type: 'button', disabled: true }, ['⇄ Comparar com o original']);
  const btBaixar = el('button', { class: 'ec-bt', type: 'button', disabled: true }, ['⬇ Baixar .wav']);
  const btOrigArq = el('button', { class: 'ec-bt ec-bt-fino', type: 'button', disabled: true, title: 'Baixar a gravação inteira, sem cortes' }, ['⬇ original']);
  const elResumo = el('p', { class: 'ec-resumo', 'aria-live': 'polite' });
  const DICA = 'O Jev decide cada frase assim que você termina de dizê-la, em ~0,3 s.';
  const elDica = el('p', { class: 'ec-dica', html: DICA });
  const controles = el('div', { class: 'ec-controles' }, [btEditado, btOriginal, btBaixar, btOrigArq]);

  const elFita = el('div', { class: 'ec-fita' }, [api.fita.no]);
  const elMonitor = el('div', { class: 'ec-monitor' }, [cvOnda, elSelo, elFita, elFala]);
  const elPlacar = el('div', { class: 'ec-placar', 'aria-label': 'Tempo cortado' }, [el('span', { class: 'ec-placar-r', text: 'cortado' }), el('div', { class: 'ec-placar-n' }, [elCortado, elPct]), elDe]);
  const raiz = el('div', { class: 'ec' }, [
    el('section', { class: 'ec-estudio' }, [
      el('div', { class: 'ec-rec-wrap' }, [btRec, el('div', { class: 'ec-relogio' }, [elTempo, elEstado])]),
      elMonitor,
      elPlacar,
    ]),
    el('section', { class: 'ec-faixa', 'aria-label': 'A gravação inteira: verde fica, rosa sai' }, [cvFaixa, elLeg]),
    el('section', { class: 'ec-trilha' }, [lista, vazio]),
    el('section', { class: 'ec-rodape' }, [el('div', { class: 'ec-rodape-txt' }, [elResumo, elDica]), controles, elAnuncio]),
  ]);
  area.append(raiz);
  const celular = window.matchMedia('(max-width: 760px)');
  const lugarDaFita = () => (celular.matches ? elPlacar : elMonitor).append(elFita);
  if (celular.addEventListener) celular.addEventListener('change', lugarDaFita);
  lugarDaFita();

  // ---------- reconhecedor (microfone) ----------
  const temVoz = !!(api.voz.SR);
  let erroMic = null;
  const mic = api.voz.criarMicrofone({
    medidor: false,   // a gravação já tem o próprio getUserMedia
    onTexto: (f, p) => { if (G && G.fonte === 'mic' && G.lendo) receberTexto(f, p); },
    onEstado: (tipo, msg) => {
      if (tipo === 'erro') { erroMic = msg; if (G && G.fonte === 'mic' && fase === 'gravando') { toast(msg, 'erro'); estado('o reconhecedor parou: a gravação segue, sem texto'); } }
    },
  });

  // ---------- áudio ----------
  async function contexto() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC({ latencyHint: 'interactive' });
      mudo = ac.createGain(); mudo.gain.value = 0; mudo.connect(ac.destination);
    }
    if (ac.state === 'suspended') {
      await Promise.race([ac.resume().catch(() => {}), sleep(1200)]);
      if (ac.state === 'suspended') {
        toast('Toque em qualquer lugar da página para liberar o som do navegador.');
        await new Promise((ok) => {
          const f = () => { document.removeEventListener('pointerdown', f, true); document.removeEventListener('keydown', f, true); ac.resume().catch(() => {}).finally(ok); };
          document.addEventListener('pointerdown', f, true); document.addEventListener('keydown', f, true);
        });
      }
    }
    if (worklet === null) {
      try { await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }))); worklet = true; } catch { worklet = false; }
    }
    return ac;
  }

  // liga uma fonte (microfone ou o exemplo) à captura; devolve a função que para
  function capturar(no) {
    const g = G;
    if (worklet) {
      const n = new AudioWorkletNode(ac, 'ec-captura', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      n.port.onmessage = (e) => { if (e.data === 'fim') { g.fimCaptura && g.fimCaptura(); return; } if (G === g && g.capturando) receberBloco(e.data); };
      no.connect(n); n.connect(mudo);
      return () => new Promise((ok) => { g.fimCaptura = ok; n.port.postMessage('parar'); setTimeout(ok, 300); }).then(() => { try { no.disconnect(n); n.disconnect(); } catch { /* já */ } });
    }
    const sp = ac.createScriptProcessor(2048, 1, 1);
    sp.onaudioprocess = (e) => { if (G === g && g.capturando) receberBloco(new Float32Array(e.inputBuffer.getChannelData(0))); };
    no.connect(sp); sp.connect(mudo);
    return async () => { try { no.disconnect(sp); sp.disconnect(); } catch { /* já */ } };
  }

  // ---------- uma gravação ----------
  function novaGravacao(qual) {
    pararTocar();
    sessao++;
    G = {
      id: sessao, fonte: qual, sr: ac.sampleRate, blocos: [], n: 0, resto: new Float32Array(0), q: Math.round(ac.sampleRate * E.QUADRO),
      ed: E.criarEdicao(), fila: [], ocupado: false, emVoo: 0,
      capturando: true, lendo: true, parcial: '', eventos: null, iev: 0, pararCaptura: null, recorder: null, pedacos: [], stream: null,
    };
    // a sessão (emenda.mjs) junta o VAD, o leitor do reconhecedor e o ligador, e decide QUANDO ligar cada frase
    G.S = E.criarSessao({ aoFechar: (f) => fraseFechou(f), aoLigar: (fr) => ligou(fr) });
    G.vad = G.S.vad; G.lig = G.S.lig;
    plano = null; bufEditado = null; bufOriginal = null; pcmEditado = null; blobOriginal = null;
    lista.innerHTML = ''; blocos.clear();
    raiz.classList.remove('editado', 'tem-blocos');
    elFala.textContent = ''; elResumo.textContent = ''; elLeg.textContent = '';
    for (const b of [btEditado, btOriginal, btBaixar, btOrigArq]) b.disabled = true;
    mostrado = 0; rip = { de: 0, para: 0, t0: 0, dur: 1 };
    return G;
  }

  const agoraRec = () => (G ? G.n / G.sr : 0);

  // chegou um bloco de áudio: guarda, mede a energia de cada 10 ms e alimenta o VAD
  function receberBloco(b) {
    const g = G;
    g.blocos.push(b); g.n += b.length;
    const x = g.resto.length ? concat(g.resto, b) : b;
    const nq = Math.floor(x.length / g.q), dbs = new Float32Array(nq);
    for (let i = 0; i < nq; i++) dbs[i] = E.energiaDb(x, i * g.q, (i + 1) * g.q);
    g.resto = x.slice(nq * g.q);
    g.S.quadros(dbs);
    if (g.eventos) entregarEventos(g);
    if (g.fonte === 'mic' && agoraRec() >= LIMITE_S && fase === 'gravando') { toast('Limite de 10 minutos por gravação: parei aqui.', ''); parar(); }
  }
  function concat(a, b) { const c = new Float32Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }

  // texto do reconhecedor (de verdade ou da demonstração): a sessão fecha as frases. t = quando o reconhecedor
  // entregou (no microfone, a hora da chegada; na demonstração, o tempo medido no exemplo)
  function receberTexto(final, parcial, t) {
    const g = G; if (!g) return;
    g.S.texto(final, parcial, t ?? agoraRec());
    g.parcial = parcial;
    if (!tocando) mostrarParcial(parcial);
    ouvindo(parcial);
  }

  // uma frase fechou: vira bloco e vai para a fila do Jev na hora (o tempo dela no áudio chega depois, em ligou)
  function fraseFechou(f) {
    const g = G;
    const fr = g.ed.nova(f.texto, { tFinal: f.tFinal, ...(f.comando ? { comando: f.comando } : {}) });
    criarBloco(fr);
    ouvindo('');   // o bloco "ouvindo…" volta logo depois, com o parcial da próxima frase
    g.fila.push(fr); rodarFila(g);
    return fr;
  }

  // a sessão achou o trecho de áudio da frase (assim que há evidência suficiente: a próxima frase ou um silêncio)
  function ligou(fr) {
    const g = G;
    fr.palavras = E.palavrasNoTempo(bonito(fr.texto), fr.ini, fr.fim, g.vad);
    desenharBloco(fr);
    for (const s of g.lig.semTexto) if (!s.bloco) criarSemTexto(s);
    contar();
  }

  // uma chamada por vez, em ordem: cada frase vê a decisão das anteriores
  async function rodarFila(g) {
    if (g.ocupado) return;
    const fr = g.fila.shift(); if (!fr) return;
    let mud;
    if (fr.comando) {
      // ordem sua para a edição ("corta isso", "vou de novo"): o código cumpre na hora, sem perguntar ao Jev
      mud = g.ed.aplicarComando(fr);
    } else {
      g.ocupado = true; g.emVoo++;
      let r = null;
      try { r = await api.jev('frase', g.ed.dadosPara(fr), `«${fr.texto.slice(0, 32)}»`); } catch { r = null; }
      g.emVoo--; g.ocupado = false;
      if (G !== g) return;
      mud = g.ed.aplicar(fr, r);
    }
    for (const x of mud) desenharBloco(x, x !== fr);
    elAnuncio.textContent = mud.map((x) => `Frase ${x.n}: ${x.status === 'cortada' ? 'sai, ' + (E.MOTIVO[x.motivo] || '') : x.status === 'mantida' ? 'fica' : 'pela metade, esperando a próxima'}`).join('. ');
    if (g.fonte === 'demo' && mud.some((x) => x !== fr && x.status === 'cortada')) som.tique();
    contar();
    rodarFila(g);
  }

  // ---------- REC ----------
  btRec.addEventListener('click', () => { if (fase === 'gravando' && G && G.fonte === 'mic') parar(); else if (fase === 'gravando' || fase === 'fechando') return; else gravarMic(); });
  document.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (document.querySelector('.mj-modal-fundo, .mj-gaveta.aberta')) return;
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); btRec.click(); }
    if (e.key === ' ' && fase === 'editado' && !(e.target && e.target.tagName === 'BUTTON')) { e.preventDefault(); tocando ? pararTocar() : ouvir('editado'); }
  });

  async function gravarMic() {
    if (!temVoz) { toast('Este navegador não tem reconhecimento de voz (o Firefox não tem). Use o Chrome, o Edge ou o Safari, ou aperte ▶ para ver o exemplo.', 'erro'); return; }
    if (!window.isSecureContext) { toast('O microfone só funciona em conexão segura (https ou localhost).', 'erro'); return; }
    await contexto();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (e) {
      toast(e && e.name === 'NotAllowedError' ? 'O navegador bloqueou o microfone. Libere no cadeado da barra de endereço.' : 'Não encontrei um microfone. Conecte um e tente de novo.', 'erro');
      return;
    }
    const g = novaGravacao('mic');
    g.stream = stream;
    stream.getAudioTracks().forEach((t) => t.addEventListener('ended', () => { if (G === g && fase === 'gravando') { toast('O microfone foi desligado: fechei a gravação aqui.', 'erro'); parar(); } }));
    erroMic = null;
    if (!mic.ligar()) { stream.getTracks().forEach((t) => t.stop()); G = null; voltarPronto(); return; }
    const fonteMic = ac.createMediaStreamSource(stream);
    g.pararCaptura = capturar(fonteMic);
    // o original compactado (para baixar sem cortes)
    try {
      const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
      if (tipo) { g.recorder = new MediaRecorder(stream, { mimeType: tipo }); g.recorder.ondataavailable = (e) => e.data && e.data.size && g.pedacos.push(e.data); g.recorder.start(1000); }
    } catch { g.recorder = null; }
    entrarGravando('mic');
  }

  function entrarGravando(qual) {
    fonte = qual; fase = 'gravando';
    raiz.classList.add('gravando'); raiz.classList.toggle('demo', qual === 'demo');
    btRec.classList.add('on'); btRec.setAttribute('aria-pressed', 'true'); btRec.setAttribute('aria-label', 'Parar a gravação');
    btRec.querySelector('.ec-rec-tx').textContent = qual === 'demo' ? 'DEMO' : 'PARAR';
    btRec.disabled = qual === 'demo';
    elSelo.textContent = qual === 'demo' ? 'SIMULAÇÃO · voz sintética' : '● GRAVANDO';
    estado(qual === 'demo' ? 'gravando o exemplo' : 'gravando · fale à vontade');
    elDica.innerHTML = qual === 'demo' ? 'O exemplo entra pelo caminho do microfone: o detector de fala mede os trechos e o Jev decide cada frase.' : 'Errou? Recomece a frase (só a última tentativa fica) ou diga <b>"corta isso"</b>. <b>PARAR</b> fecha a edição.';
    laco();
  }

  async function parar() {
    const g = G; if (!g || fase !== 'gravando') return;
    fase = 'fechando';
    raiz.classList.remove('gravando');
    btRec.disabled = true;
    btRec.querySelector('.ec-rec-tx').textContent = '…';
    estado('fechando a última frase…');
    // para de gravar o áudio, mas deixa o reconhecedor entregar o final da última frase (até 1,5 s)
    if (g.pararCaptura) await g.pararCaptura();   // o worklet manda o último pedaço e para
    g.capturando = false;
    if (g.recorder && g.recorder.state !== 'inactive') { const fim = new Promise((ok) => { g.recorder.onstop = ok; }); g.recorder.stop(); await Promise.race([fim, sleep(800)]); }
    if (g.stream) g.stream.getTracks().forEach((t) => t.stop());
    if (g.fonte === 'mic') {
      const t0 = performance.now();
      while (performance.now() - t0 < 1500 && (performance.now() - t0 < 600 || g.parcial)) await sleep(80);
      g.lendo = false;
      mic.desligar();
    }
    if (G !== g) return;
    g.S.fechar(agoraRec());   // o parcial que sobrou vira a última frase e tudo é ligado
    for (const s of g.lig.semTexto) if (!s.bloco) criarSemTexto(s);
    // espera o Jev terminar as frases da fila (até 6 s)
    const ate2 = performance.now() + 6000;
    while (performance.now() < ate2 && (g.fila.length || g.emVoo)) await sleep(60);
    if (G !== g) return;
    for (const x of g.ed.resolverFim()) desenharBloco(x, true);
    if (g.recorder && g.pedacos.length) blobOriginal = new Blob(g.pedacos, { type: g.recorder.mimeType || 'audio/webm' });
    await montarEdicao(g);
  }

  // ---------- a edição ----------
  async function montarEdicao(g) {
    bufOriginal = g.n ? ac.createBuffer(1, g.n, g.sr) : null;
    const pcm = bufOriginal ? bufOriginal.getChannelData(0) : new Float32Array(0);
    juntar(g.blocos, pcm); g.blocos = [];
    const dur = g.n / g.sr;
    fase = 'editado';
    btRec.disabled = false; btRec.classList.remove('on'); btRec.setAttribute('aria-pressed', 'false'); btRec.setAttribute('aria-label', 'Gravar de novo');
    btRec.querySelector('.ec-rec-tx').textContent = 'REC';
    elSelo.textContent = g.fonte === 'demo' ? 'EXEMPLO · voz sintética' : '';
    raiz.classList.remove('demo');
    if (!g.ed.frases.length) {
      estado(dur < 0.5 ? 'gravação curta demais' : 'não ouvi nenhuma frase');
      elResumo.textContent = erroMic || 'O reconhecedor de voz não devolveu nenhuma frase.';
      elDica.innerHTML = 'Use o Chrome, o Edge ou o Safari, fale perto do microfone e aperte <b>REC</b> de novo. Ou aperte <b>▶</b> para ver o exemplo.';
      btOriginal.disabled = !dur;
      parar_laco(); desenharTudo();
      return;
    }
    plano = E.planoDaEmenda(E.itensDoPlano(g.ed.frases, g.lig.semTexto), dur);
    pcmEditado = E.emendar(pcm, g.sr, plano);
    bufEditado = paraBuffer(pcmEditado, g.sr);
    g.pcm = pcm;
    for (const b of [btEditado, btOriginal, btBaixar, btOrigArq]) b.disabled = false;
    // os blocos que ficam se juntam no alto e os cortes descem para a bandeja (FLIP, junto com o ripple da faixa)
    if (blocoVivo) { blocoVivo.remove(); blocoVivo = null; }
    flip(() => { raiz.classList.add('editado'); bandeja(); lista.scrollTop = 0; });
    estado('edição pronta');
    resumo();
    mostrarPronta();
    animarRipple();
    if (g.fonte === 'demo') som.whoosh();
    elDica.innerHTML = 'Clique num bloco para trocar <b>fica</b> ↔ <b>sai</b>.';
    contar(true);
  }

  // refaz a emenda (a pessoa trocou um bloco depois de parar)
  function refazerEdicao() {
    const g = G; if (!g || fase !== 'editado' || !g.pcm) return;
    pararTocar();
    plano = E.planoDaEmenda(E.itensDoPlano(g.ed.frases, g.lig.semTexto), g.n / g.sr);
    pcmEditado = E.emendar(g.pcm, g.sr, plano);
    bufEditado = paraBuffer(pcmEditado, g.sr);
    resumo(); contar(true); mostrarPronta(); desenharTudo();
  }

  // o monitor em repouso, depois de parar: quanto saiu e quanto ficou
  function mostrarPronta() {
    if (!plano || !G) return;
    const n = G.ed.frases.filter((f) => f.status === 'cortada').length;
    elFala.className = 'ec-fala pronta';
    elFala.textContent = `✓ Edição pronta: ${n} ${n === 1 ? 'frase saiu' : 'frases saíram'}, ficou com ${seg(plano.duracaoEditada)}`;
  }

  function resumo() {
    if (!plano) return;
    const fr = G.ed.frases, cortadas = fr.filter((f) => f.status === 'cortada').length;
    elLeg.innerHTML = `<b>Original</b> ${seg(plano.duracao)} <span aria-hidden="true">→</span> <b>Editado</b> ${seg(plano.duracaoEditada)} <span class="sep" aria-hidden="true">·</span> <span class="ec-leg-n">${cortadas} de ${fr.length} frases cortadas</span>`;
    elResumo.textContent = '';
  }

  function juntar(bl, out) { let o = 0; for (const b of bl) { const n = Math.min(b.length, out.length - o); if (n <= 0) break; out.set(b.subarray(0, n), o); o += n; } return out; }
  function paraBuffer(pcm, sr) { if (!pcm.length) return null; const b = ac.createBuffer(1, pcm.length, sr); b.copyToChannel(pcm, 0); return b; }

  // ---------- ouvir ----------
  btEditado.addEventListener('click', () => (tocando && tocando.qual === 'editado' ? pararTocar() : ouvir('editado')));
  btOriginal.addEventListener('click', () => (tocando && tocando.qual === 'original' ? pararTocar() : ouvir('original')));
  btBaixar.addEventListener('click', () => { if (pcmEditado) baixar(new Blob([E.wav(pcmEditado, G.sr)], { type: 'audio/wav' }), `gravacao-editada-${carimbo()}.wav`); });
  btOrigArq.addEventListener('click', () => {
    if (blobOriginal) baixar(blobOriginal, `gravacao-original-${carimbo()}.${/mp4/.test(blobOriginal.type) ? 'm4a' : 'webm'}`);
    else if (G && G.pcm) baixar(new Blob([E.wav(G.pcm, G.sr)], { type: 'audio/wav' }), `gravacao-original-${carimbo()}.wav`);
  });
  function carimbo() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`; }
  function baixar(blob, nome) { const a = el('a', { href: URL.createObjectURL(blob), download: nome }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  // legenda do que toca: as frases (com o tempo de cada palavra) no relógio do que está tocando
  function legendaDe(qual) {
    const fr = G.ed.frases.filter((f) => f.palavras && f.palavras.length);
    if (qual === 'original') return fr.map((f) => ({ f, ws: f.palavras, sai: f.status === 'cortada' }));
    return fr.filter((f) => f.status !== 'cortada').map((f) => ({ f, ws: f.palavras.map((w) => ({ p: w.p, t0: E.paraEditado(w.t0, plano) ?? E.paraEditado(f.ini, plano) ?? 0, t1: E.paraEditado(w.t1, plano) ?? E.paraEditado(f.fim, plano) ?? 0 })), sai: false }));
  }

  function ouvir(qual, sinal) {
    pararTocar();
    const buf = qual === 'editado' ? bufEditado : bufOriginal;
    if (!buf || !ac) return Promise.resolve();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
    const t0 = ac.currentTime + 0.05;
    src.start(t0);
    const leg = legendaDe(qual);
    return new Promise((ok) => {
      tocando = { qual, src, t0, leg, dur: buf.duration, fim: ok, linha: null };
      src.onended = () => { if (tocando && tocando.src === src) pararTocar(); ok(); };
      if (sinal) sinal.addEventListener('abort', () => { pararTocar(); ok(); }, { once: true });
      raiz.classList.add('tocando'); raiz.classList.toggle('tocando-original', qual === 'original');
      irPara(qual === 'original' ? 0 : 1, 0, 700);
      (qual === 'editado' ? btEditado : btOriginal).textContent = '■ Parar';
      estado(qual === 'editado' ? 'tocando a edição' : 'tocando o original');
      elSelo.textContent = qual === 'editado' ? '▶ VERSÃO EDITADA' : '▶ ORIGINAL';
      laco();
    });
  }
  function pararTocar() {
    if (!tocando) return;
    const t = tocando; tocando = null;
    try { t.src.onended = null; t.src.stop(); } catch { /* já parou */ }
    raiz.classList.remove('tocando', 'tocando-original');
    if (t.qual === 'original' && plano) irPara(1, 150, 900);
    btEditado.textContent = '▶ Ouvir a versão editada'; btOriginal.textContent = '⇄ Comparar com o original';
    for (const b of blocos.values()) b.li.classList.remove('agora');
    elFala.innerHTML = '';
    if (fase === 'editado') { estado('edição pronta'); elSelo.textContent = G && G.fonte === 'demo' ? 'EXEMPLO · voz sintética' : ''; mostrarPronta(); }
    t.fim && t.fim();
  }
  const posTocando = () => (tocando ? Math.max(0, ac.currentTime - tocando.t0) : 0);

  function karaoke() {
    if (!tocando) return;
    const t = posTocando();
    let atual = null;
    for (const x of tocando.leg) { if (x.ws.length && x.ws[0].t0 - 0.15 <= t) atual = x; }
    if (!atual) { elFala.innerHTML = ''; return; }
    if (tocando.linha !== atual) {
      tocando.linha = atual;
      elFala.innerHTML = '';
      elFala.className = 'ec-fala karaoke' + (atual.sai ? ' sai' : '');
      if (atual.sai) elFala.append(el('span', { class: 'ec-fala-tag', text: `✂ ${E.MOTIVO[atual.f.motivo] || 'sai'}` }));
      for (const w of atual.ws) elFala.append(el('span', { class: 'w', text: w.p }), ' ');
      for (const b of blocos.values()) b.li.classList.toggle('agora', b.f === atual.f);
      const b = blocos.get(atual.f);
      if (b && lista.scrollHeight > lista.clientHeight + 4 && getComputedStyle(lista).overflowY !== 'visible') {
        const r = b.li.getBoundingClientRect(), q = lista.getBoundingClientRect();
        if (r.top < q.top || r.bottom > q.bottom) lista.scrollBy({ top: r.top < q.top ? r.top - q.top - 8 : r.bottom - q.bottom + 8, behavior: ui.reduzMovimento ? 'auto' : 'smooth' });
      }
    }
    const spans = elFala.querySelectorAll('.w');
    atual.ws.forEach((w, i) => spans[i] && spans[i].classList.toggle('dita', t >= w.t0 - 0.03));
  }

  // ---------- blocos da linha do tempo ----------
  const blocos = new Map(); // frase → { li, bt, … }
  function criarBloco(f) {
    raiz.classList.add('tem-blocos');
    const n = el('span', { class: 'ec-b-n mj-num', text: String(f.n) });
    const tm = el('span', { class: 'ec-b-tm mj-num', text: '' });
    const texto = el('span', { class: 'ec-b-texto', text: bonito(f.texto) });
    const selo = el('span', { class: 'ec-b-selo', text: SELO.pendente });
    const extra = el('span', { class: 'ec-b-extra' });
    const bt = el('button', { class: 'ec-b', type: 'button' }, [el('span', { class: 'ec-b-topo' }, [n, tm, selo]), texto, extra]);
    const li = el('li', { class: 'ec-bloco st-pendente entra' }, [bt]);
    bt.addEventListener('click', () => alternar(f));
    lista.append(li);
    const b = { f, li, bt, tm, texto, selo, extra };
    blocos.set(f, b);
    setTimeout(() => li.classList.remove('entra'), 500);
    desenharBloco(f);
    rolar();
    return b;
  }
  function criarSemTexto(s) {
    raiz.classList.add('tem-blocos');
    const li = el('li', { class: 'ec-bloco st-semtexto entra' + (s.manter ? ' fica' : '') }, [
      el('div', { class: 'ec-b' }, [
        el('span', { class: 'ec-b-topo' }, [el('span', { class: 'ec-b-n', text: '〰' }), el('span', { class: 'ec-b-tm mj-num', text: relogio(s.ini) }), el('span', { class: 'ec-b-selo', text: s.manter ? 'fica · sem texto' : '〰 sem fala' })]),
        el('span', { class: 'ec-b-texto', text: s.manter ? 'trecho de fala sem texto' : 'som sem fala' }),
      ]),
    ]);
    s.bloco = li;
    // entra na ordem do tempo
    const depois = [...lista.children].find((x) => x._ini != null && x._ini > s.ini);
    li._ini = s.ini;
    lista.insertBefore(li, depois || null);
    setTimeout(() => li.classList.remove('entra'), 500);
  }
  function desenharBloco(f, virou) {
    const b = blocos.get(f); if (!b) return;
    const st = f.status;
    b.li._ini = f.ini;
    b.li.className = `ec-bloco st-${st}${f.manual ? ' manual' : ''}${virou ? ' virou' : ''}`;
    if (virou) setTimeout(() => b.li.classList.remove('virou'), 900);
    if (f.ini != null) { b.tm.textContent = `${relogio(f.ini)} · ${fmt.num(f.fim - f.ini, 1)} s`; b.li.style.setProperty('--d', Math.max(0.4, f.fim - f.ini).toFixed(2)); }
    b.selo.textContent = f.manual ? (st === 'cortada' ? '✋ você cortou' : '✋ fica') : st === 'cortada' ? `${ICONE[f.motivo] || '✂'} ${E.MOTIVO[f.motivo] || 'sai'}` : SELO[st];
    b.selo.dataset.n = f.n;
    const ex = [];
    if (f.refez) ex.push(`↻ refez a frase ${f.refez}`);
    if (f.refeitaPor && st === 'cortada') ex.push(`refeita na ${f.refeitaPor}`);
    if (f.apagadaPor && st === 'cortada') ex.push(`cortada pelo comando ${f.apagadaPor}`);
    if (f.comando && st === 'cortada' && !f.manual) ex.push(f.comando === 'tudo' ? '🗑️ apagou tudo antes' : f.comando === 'anterior' ? '🗑️ apagou o que veio antes' : 'só ele sai');
    if (f.continua) ex.push(`↪ continua a ${f.continua}`);
    if (f.gancho != null && st === 'mantida' && G && G.ed.frases.filter((x) => x.status === 'mantida' && x.gancho != null).indexOf(f) === 0) ex.push(`🎣 gancho ${['fraco', 'morno', 'bom', 'forte'][f.gancho]}`);
    if (f.manual) ex.push('✋ você decidiu');
    b.extra.textContent = ex.join(' · ');
    b.extra.hidden = !ex.length;
    const conf = f.confianca != null ? ` (${fmt.pct(f.confianca)} de certeza)` : '';
    b.bt.setAttribute('aria-label', `Frase ${f.n}: ${bonito(f.texto)}. ${st === 'cortada' ? 'Sai: ' + (E.MOTIVO[f.motivo] || '') : st === 'mantida' ? 'Fica' : st === 'suspensa' ? 'Pela metade, esperando a próxima frase' : 'O Jev está decidindo'}${conf}. Clique para trocar.`);
    b.bt.setAttribute('aria-pressed', String(st === 'cortada'));
    b.bt.title = `«${bonito(f.texto)}» · clique para ${st === 'cortada' ? 'manter' : 'cortar'}`;
  }
  function alternar(f) {
    const g = G; if (!g || f.status === 'pendente') return;
    g.ed.alternar(f);
    if (fase === 'editado') flip(() => desenharBloco(f, true)); else desenharBloco(f, true);
    contar();
    if (fase === 'editado') refazerEdicao();
  }
  function rolar() { lista.scrollTo({ top: lista.scrollHeight, behavior: ui.reduzMovimento ? 'auto' : 'smooth' }); }

  // a bandeja dos cortes (só aparece com a edição pronta): uma quebra de linha e o rótulo
  function bandeja() {
    if (lista.querySelector('.ec-saiu')) return;
    lista.append(el('li', { class: 'ec-quebra', 'aria-hidden': 'true' }), el('li', { class: 'ec-saiu', text: '✂ Saíram da edição' }));
  }

  // FLIP: cada bloco sai de onde estava e desliza até o lugar novo
  function flip(mudar) {
    const antes = new Map([...lista.children].map((n) => [n, n.getBoundingClientRect()]));
    mudar();
    if (ui.reduzMovimento) return;
    for (const n of lista.children) {
      const a = antes.get(n);
      if (!a || !a.width) { n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); continue; }
      const d = n.getBoundingClientRect();
      const dx = a.left - d.left, dy = a.top - d.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 760, delay: n.classList.contains('st-cortada') ? 0 : 140, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    }
  }

  // "ouvindo": o bloco provisório do que ainda está sendo dito
  let blocoVivo = null;
  function ouvindo(parcial) {
    if (!parcial || fase !== 'gravando') { if (blocoVivo) { blocoVivo.remove(); blocoVivo = null; } return; }
    if (!blocoVivo) {
      blocoVivo = el('li', { class: 'ec-bloco st-vivo', 'aria-hidden': 'true' }, [el('div', { class: 'ec-b' }, [el('span', { class: 'ec-b-topo' }, [el('span', { class: 'ec-b-n', text: '●' }), el('span', { class: 'ec-b-selo', text: 'ouvindo…' })]), el('span', { class: 'ec-b-texto' })])]);
      lista.append(blocoVivo); raiz.classList.add('tem-blocos');
    } else lista.append(blocoVivo);
    blocoVivo.querySelector('.ec-b-texto').textContent = bonito(parcial);
    rolar();
  }
  function mostrarParcial(p) {
    if (!p) { elFala.classList.add('fechou'); return; }
    elFala.className = 'ec-fala';
    elFala.textContent = bonito(p.length > 90 ? '…' + p.slice(-90) : p);
  }

  // ---------- contador "cortado" ----------
  let alvoCortado = 0, alvoPct = 0;
  function contar(final) {
    const g = G; if (!g) return;
    if (final && plano) { alvoCortado = plano.cortado; alvoPct = plano.duracao ? plano.cortado / plano.duracao : 0; elDe.textContent = `de ${seg(plano.duracao)} · ficaram ${seg(plano.duracaoEditada)}`; return; }
    const ate = g.lig.cursor;
    if (ate <= 0) { alvoCortado = 0; alvoPct = 0; return; }
    const p = E.planoDaEmenda(E.itensDoPlano(g.ed.frases, g.lig.semTexto), ate, { aparar: false });
    alvoCortado = p.cortado; alvoPct = agoraRec() ? p.cortado / agoraRec() : 0;
    elDe.textContent = `de ${seg(agoraRec())} gravados`;
  }

  // ---------- desenho (um laço só, enquanto grava ou toca) ----------
  function laco() {
    if (raf) return;
    const passo = () => {
      raf = 0;
      if (fase === 'gravando' || fase === 'fechando' || tocando || animando()) raf = requestAnimationFrame(passo);
      if (G && G.fonte === 'demo' && G.eventos) entregarEventos(G);
      desenharTudo();
    };
    raf = requestAnimationFrame(passo);
  }
  function parar_laco() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function desenharTudo() {
    const t = agoraRec();
    if (fase === 'gravando' || fase === 'fechando') elTempo.textContent = relogio(t);
    else if (tocando) elTempo.textContent = relogio(posTocando());
    else if (plano) elTempo.textContent = relogio(plano.duracaoEditada);
    // o número do contador anda até o alvo
    mostrado += (alvoCortado - mostrado) * 0.18;
    if (Math.abs(alvoCortado - mostrado) < 0.02) mostrado = alvoCortado;
    elCortado.textContent = seg(mostrado);
    elPct.textContent = `${Math.round(alvoPct * 100)}%`;
    raiz.classList.toggle('cortou', alvoCortado > 0.05);
    desenharOnda();
    desenharFaixa();
    if (tocando) karaoke();
  }

  // cor de cada instante do original, pelo status do que mora ali. Os laços de desenho pedem tempos em ordem
  // crescente, então um ponteiro anda junto (barato mesmo com centenas de frases)
  function pintor(g) {
    const iv = [
      ...g.ed.frases.filter((f) => f.ini != null).map((f) => [f.ini - 0.01, f.fim + 0.01, f.status]),
      ...g.lig.semTexto.map((x) => [x.ini, x.fim, x.manter ? 'semtexto' : 'cortada']),
    ].sort((a, b) => a[0] - b[0]);
    let i = 0;
    return (t, voz) => {
      if (i > 0 && t < iv[i - 1][0]) i = 0;
      while (i < iv.length && iv[i][1] < t) i++;
      return i < iv.length && t >= iv[i][0] ? iv[i][2] : voz ? 'fala' : 'silencio';
    };
  }
  const COR = { mantida: '#2dd4bf', cortada: '#fb7185', suspensa: '#fbbf24', pendente: '#e2e8f0', fala: '#e2e8f0', semtexto: '#94a3b8', silencio: 'rgba(148,163,184,.32)' };

  function tela(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    return { c, w, h, dpr };
  }
  const alturaDe = (db, piso) => Math.max(0.04, Math.min(1, (db - piso - 3) / 46));

  // monitor: os últimos 6 s ao vivo (ou o que está tocando), em barras
  function desenharOnda() {
    const { c, w, h, dpr } = tela(cvOnda);
    const meio = h / 2;
    const g = G;
    const passoPx = 4 * dpr, nb = Math.floor(w / passoPx);
    if (!g || (!g.n && !tocando)) {
      // em repouso: uma linha que respira
      idleT += 0.03;
      c.fillStyle = 'rgba(94,234,212,.35)';
      for (let i = 0; i < nb; i++) { const a = 0.05 + 0.04 * Math.sin(idleT + i * 0.25) * Math.sin(idleT * 0.5 + i * 0.05); c.fillRect(i * passoPx, meio - a * h / 2, passoPx * 0.55, Math.max(dpr, a * h)); }
      return;
    }
    const q = g.vad.quadros, v = g.vad.vozes, piso = Math.min(-45, g.vad.piso);
    const janela = 6;
    let fimT, mapa = null;
    if (tocando) { const pt = posTocando(); fimT = pt + janela * 0.35; mapa = tocando.qual === 'editado' ? (te) => E.paraOriginal(te, plano) : (te) => te; }
    else fimT = Math.max(janela, agoraRec());
    const iniT = fimT - janela, dt = janela / nb;
    const corEm = pintor(g);
    for (let i = 0; i < nb; i++) {
      const tl = iniT + i * dt; if (tl < 0) continue;
      const to = mapa ? mapa(tl) : tl;
      if (!mapa && tl > agoraRec()) break;
      if (tocando && tl > tocando.dur) break;
      const k = Math.floor(to / E.QUADRO); if (k < 0 || k >= q.length) continue;
      const db = Math.max(q[k], q[k + 1] ?? -120);
      const a = alturaDe(db, piso);
      const st = corEm(to, v[k]);
      c.globalAlpha = tocando && tl > posTocando() ? 0.35 : 1;
      c.fillStyle = COR[st] || COR.silencio;
      c.fillRect(i * passoPx, meio - (a * h * 0.46), passoPx * 0.6, Math.max(dpr, a * h * 0.92));
    }
    c.globalAlpha = 1;
    // a agulha (agora)
    const xAgora = tocando ? ((posTocando() - iniT) / janela) * w : Math.min(w - 2 * dpr, ((agoraRec() - iniT) / janela) * w);
    c.fillStyle = fase === 'gravando' && fonte === 'mic' ? '#f43f5e' : '#f8fafc';
    c.fillRect(xAgora, 0, 2 * dpr, h);
  }

  // faixa: a gravação inteira; ao parar, os cortes encolhem até sumir (ripple) e o editado fica emendado à esquerda
  let rip = { de: 0, para: 0, t0: 0, dur: 1 };
  const kAgora = () => { const x = Math.min(1, Math.max(0, (performance.now() - rip.t0) / rip.dur)); return rip.de + (rip.para - rip.de) * (1 - Math.pow(1 - x, 3)); };
  const animando = () => performance.now() < rip.t0 + rip.dur;
  function irPara(k, atraso = 0, dur = 1100) { rip = { de: kAgora(), para: k, t0: performance.now() + atraso, dur: ui.reduzMovimento ? 1 : dur }; laco(); }
  function animarRipple() { irPara(1, 350); }
  let ultFaixa = 0;
  function desenharFaixa() {
    const agoraMs = performance.now();
    if ((fase === 'gravando' || fase === 'fechando') && !tocando && !animando() && agoraMs - ultFaixa < 80) return;
    ultFaixa = agoraMs;
    const { c, w, h, dpr } = tela(cvFaixa);
    const g = G;
    c.fillStyle = 'rgba(148,163,184,.10)'; c.fillRect(0, h * 0.5 - dpr / 2, w, dpr);
    if (!g || !g.n) return;
    const q = g.vad.quadros, v = g.vad.vozes, piso = Math.min(-45, g.vad.piso);
    const durT = plano ? plano.duracao : Math.max(30, agoraRec());
    const escala = w / durT;
    const k = plano ? kAgora() : 0;
    // posição de cada instante: no original (k=0) ou na versão editada (k=1)
    const regs = plano ? plano.regioes : [];
    const xDe = (t) => {
      if (!plano || k === 0) return t * escala;
      let off = 0, fora = null;
      for (const [a, b] of regs) { if (t < a) { fora = off; break; } if (t <= b) return (t * (1 - k) + (off + (t - a)) * k) * escala; off += (b - a) - plano.xfade; }
      return (t * (1 - k) + (fora ?? off) * k) * escala;
    };
    let ir = 0;
    const dentro = (t) => { while (ir < regs.length && regs[ir][1] < t) ir++; return ir < regs.length && t >= regs[ir][0]; };
    const corEm = pintor(g);
    const passo = Math.max(1, Math.round(3 * dpr));
    const nb = Math.floor((durT * escala) / passo);
    const dtB = durT / nb;
    for (let i = 0; i < nb; i++) {
      const t = i * dtB; if (!plano && t > agoraRec()) break;
      const kk = Math.floor(t / E.QUADRO); if (kk >= q.length) break;
      let db = -120; for (let j = kk; j < Math.min(q.length, kk + Math.ceil(dtB / E.QUADRO)); j++) db = Math.max(db, q[j]);
      const a = alturaDe(db, piso);
      const fica = plano ? dentro(t) : true;
      const st = corEm(t, v[kk]);
      const x0 = xDe(t), x1 = xDe(t + dtB);
      const lw = Math.max(0, (x1 - x0) * 0.62);
      if (lw < 0.15) continue;
      c.globalAlpha = fica ? 1 : Math.max(0, 1 - k * 1.15);
      c.fillStyle = fica ? (COR[st] || COR.silencio) : COR.cortada;
      c.fillRect(x0, h / 2 - a * h * 0.42, Math.max(dpr * 0.6, lw), Math.max(dpr, a * h * 0.84));
    }
    c.globalAlpha = 1;
    // agulha: gravando (o fim) ou tocando
    let xa = null;
    if (fase === 'gravando' || fase === 'fechando') xa = agoraRec() * escala;
    else if (tocando) xa = tocando.qual === 'editado' ? xDe(E.paraOriginal(posTocando(), plano)) : posTocando() * escala;
    if (xa != null) { c.fillStyle = '#f8fafc'; c.fillRect(Math.min(w - 2 * dpr, xa), 0, 2 * dpr, h); }
    // o fim da versão editada
    if (plano && k > 0.02) {
      const xe = plano.duracaoEditada * escala * k + plano.duracao * escala * (1 - k);
      c.fillStyle = 'rgba(45,212,191,.9)'; c.fillRect(Math.min(w - dpr, xe), h * 0.12, dpr * 1.5, h * 0.76);
    }
  }

  // ---------- demonstração ----------
  async function prepararExemplo() {
    if (exemplo) return exemplo;
    const [j, buf] = await Promise.all([
      fetch(api.url('assets/exemplo.json')).then((r) => r.json()),
      fetch(api.url('assets/exemplo.mp3')).then((r) => r.arrayBuffer()),
    ]);
    const audio = await new Promise((ok, falha) => { const p = ac.decodeAudioData(buf, ok, falha); if (p && p.catch) p.catch(falha); });
    exemplo = { ...j, audio, eventos: E.eventosDoRoteiro(j.frases) };
    return exemplo;
  }

  // o texto do exemplo chega pelo mesmo leitor do microfone, quando o relógio da gravação passa pelo tempo medido
  function entregarEventos(g) {
    const t = agoraRec();
    while (g.iev < g.eventos.length && g.eventos[g.iev].t <= t) { const e = g.eventos[g.iev++]; receberTexto(e.final, e.parcial, e.t); }
  }

  async function demonstrar(sinal) {
    if (fase === 'gravando' && G && G.fonte === 'mic') await parar();
    pararTocar();
    await contexto();
    estado('carregando o exemplo…');
    await prepararExemplo();
    if (sinal.aborted) throw new DOMException('parou', 'AbortError');
    const g = novaGravacao('demo');
    g.eventos = exemplo.eventos;
    const src = ac.createBufferSource(); src.buffer = exemplo.audio;
    const ganho = ac.createGain(); ganho.gain.value = 1;
    src.connect(ganho); ganho.connect(ac.destination);
    g.pararCaptura = capturar(ganho);
    const acabou = new Promise((ok) => { src.onended = ok; });
    const abortar = () => { try { src.stop(); } catch { /* já */ } };
    sinal.addEventListener('abort', abortar, { once: true });
    src.start();   // no mesmo instante em que a captura começa: o relógio da gravação = o do exemplo
    entrarGravando('demo');
    try {
      await Promise.race([acabou, new Promise((_, falha) => sinal.addEventListener('abort', () => falha(new DOMException('parou', 'AbortError')), { once: true }))]);
      // o último final chega ~0,6 s depois da voz
      const ate = performance.now() + 1500;
      while (performance.now() < ate && g.iev < g.eventos.length) await sleep(50, sinal);
      await parar();
      await sleep(1700, sinal);
      if (sinal.aborted) return;
      await ouvir('editado', sinal);
      await sleep(400, sinal);
    } catch (e) {
      if (G === g && (fase === 'gravando' || fase === 'fechando')) cancelar();
      throw e;
    } finally {
      sinal.removeEventListener('abort', abortar);
    }
  }

  // para tudo sem montar edição (o ▶ parou no meio, ou a pessoa apertou REC durante o exemplo)
  function cancelar() {
    const g = G; if (!g) return;
    g.capturando = false; g.lendo = false;
    if (g.pararCaptura) g.pararCaptura();
    if (g.stream) g.stream.getTracks().forEach((t) => t.stop());
    if (g.fonte === 'mic') mic.desligar();
    sessao++;
    G = null;
    voltarPronto();
  }
  function voltarPronto() {
    fase = 'pronto';
    raiz.classList.remove('gravando', 'demo', 'editado', 'tocando', 'tem-blocos');
    lista.innerHTML = ''; blocos.clear(); blocoVivo = null;
    btRec.disabled = false; btRec.classList.remove('on'); btRec.setAttribute('aria-pressed', 'false'); btRec.setAttribute('aria-label', 'Gravar');
    btRec.querySelector('.ec-rec-tx').textContent = 'REC';
    elSelo.textContent = ''; elFala.textContent = ''; elResumo.textContent = ''; elLeg.textContent = '';
    alvoCortado = 0; alvoPct = 0; mostrado = 0; elDe.textContent = 'cortado até agora';
    elTempo.textContent = '00:00,0';
    elDica.innerHTML = DICA;
    estado('pronto para gravar');
    parar_laco(); desenharTudo();
  }
  function estado(t) { elEstado.textContent = t; }

  // repouso: a linha do monitor respira devagar
  setInterval(() => { if (!raf && document.visibilityState === 'visible' && !G) desenharOnda(); }, 60);
  window.addEventListener('resize', () => desenharTudo());
  desenharTudo();

  return { tocar: demonstrar };
}

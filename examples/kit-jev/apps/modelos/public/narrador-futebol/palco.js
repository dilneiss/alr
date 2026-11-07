// Tela do "Narre o Jogo": a transmissão de TV de uma partida imaginária. Campo visto de cima (SVG) com 22 jogadores que
// correm para a bola, bola com rastro, juiz e bandeirinhas; placar de TV com relógio; GOL com rede balançando, faixa,
// confete e torcida; cartões e apito animados; lance a lance e linha do tempo.
// O Jev entra por duas portas, com a mesma jogada "lance":
//   · a cada pausa da fala (frase ainda aberta) → api.ultima(): só a resposta mais nova mexe a tela;
//   · a cada frase fechada → uma fila, uma chamada por vez e nenhuma descartada (é ela que fecha o lance).
// O placar é do código: gol só com o "sim" do Jev em "gol novo?" (nunca dois na mesma frase, nem dois em 10 s sem jogada
// nova no meio); "gol anulado?" desfaz só o gol mais recente, até 3 frases depois (na pausa, com 2 palavras ou mais).

const W = 1050, H = 680;                 // o campo, em decímetros (105 × 68 m)
const MX = 175, MY = 70;                 // arquibancada em volta
const VBW = W + 2 * MX, VBH = H + 2 * MY;
const NS = 'http://www.w3.org/2000/svg';
const VEL = 20;                          // o relógio do jogo corre 20× (45 min ≈ 2 min 15 s)
const LADOS = ['casa', 'visitante'];
// 4-4-2 de quem ataca para a direita: [número, papel, u = distância do próprio gol, v = a partir da esquerda do time]
const FORMACAO = [
  [1, 'gk', 46, 340], [2, 'def', 255, 592], [3, 'def', 212, 418], [4, 'def', 212, 262], [6, 'def', 255, 88],
  [7, 'mid', 428, 580], [5, 'mid', 382, 402], [8, 'mid', 382, 278], [11, 'mid', 428, 100], [9, 'fw', 522, 292], [10, 'fw', 506, 408],
];
// as 9 zonas, do ponto de vista de quem tem a bola: terço do campo × faixa (a "área" é o terço de ataque pelo meio)
const ZONA = {
  def_esq: ['def', 'esq'], def_centro: ['def', 'centro'], def_dir: ['def', 'dir'],
  meio_esq: ['meio', 'esq'], meio_centro: ['meio', 'centro'], meio_dir: ['meio', 'dir'],
  ata_esq: ['ata', 'esq'], area: ['ata', 'centro'], ata_dir: ['ata', 'dir'],
};
const TERCO = { def: [0, 350], meio: [350, 700], ata: [700, W] };
const FAIXA = { esq: [0, 227], centro: [227, 453], dir: [453, H] };
const MIOLO_U = { def: [120, 300], meio: [400, 650], ata: [780, 985] };
const MIOLO_V = { esq: [70, 190], centro: [258, 422], dir: [490, 610] };
// lances que entram na linha do tempo, com o lado da marca
const MARCA = new Set(['gol', 'amarelo', 'vermelho', 'penalti', 'trave', 'substituicao']);
const JOGADA_NOVA = new Set(['inicio', 'passe', 'drible', 'cruzamento', 'chute', 'escanteio', 'penalti', 'falta', 'defesa', 'fora', 'trave', 'impedimento']);

// demonstração (▶): 50 s de jogo com gol, cartão e um gol anulado na virada
const ROTEIRO = [
  'Rola a bola no Estádio da Vila!',
  'O Unidos da Vila toca no meio de campo.',
  'Lá vai ele pela esquerda, passou por um, passou por dois!',
  'Cruzou na área!',
  'Cabeceou… que defesa do goleiro!',
  'Escanteio para o Unidos da Vila.',
  'O zagueiro afasta e o Atlético do Morro sai no contra-ataque!',
  'Falta dura do volante do Unidos!',
  'O juiz tá mostrando o amarelo!',
  'O Atlético cobra a falta rápido, toca na entrada da área…',
  'Bateu cruzado… GOOOOOL! É do Atlético do Morro!',
  'Recomeça o jogo, o Unidos da Vila parte pra cima.',
  'Lançamento longo, o camisa 9 dominou, tá na cara do goleiro… bateu!',
  'GOOOOOL! Gol do Unidos da Vila!',
  'Não, não, não! O bandeirinha levantou a bandeira! Impedimento!',
  'O Atlético do Morro respira… e o juiz apita: fim do primeiro tempo!',
];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const outro = (t) => (t === 'casa' ? 'visitante' : t === 'visitante' ? 'casa' : null);
const palavras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };
const ART = { o: ['do', 'para o', 'no', 'O'], a: ['da', 'para a', 'na', 'A'], os: ['dos', 'para os', 'nos', 'Os'], as: ['das', 'para as', 'nas', 'As'] };
const de = (t) => (t ? `${ART[t.art][0]} ${t.nome}` : '');
const para = (t) => (t ? `${ART[t.art][1]} ${t.nome}` : '');
const no = (t) => (t ? `${ART[t.art][2]} ${t.nome}` : '');
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep } = ui;
  const PARES = spec.pares;
  const LANCE = Object.fromEntries(spec.lances.map((l) => [l.id, l]));
  const ZONA_ROT = Object.fromEntries(spec.zonas.map((z) => [z.id, z.rotulo]));
  const NIVEIS = (spec.decisoes.find((d) => d.id === 'emocao') || { niveis: [] }).niveis.map((n) => n.rotulo);
  const LIM = { lance: 0.55, gol: 0.6, anulou: 0.6, zona: 0.4, posse: 0.55, ...(spec.limiar || {}) };
  const perguntarPausa = api.ultima();
  const conf = (a) => (a ? ui.confiancaDe(a) : 0);
  const reduz = ui.reduzMovimento;

  const comVars = (n, vars) => { for (const [k, v] of Object.entries(vars)) n.style.setProperty(k, v); return n; };

  // ---------- svg ----------
  const s = (tag, attrs, filhos) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) n.setAttribute(k, v);
    for (const f of [].concat(filhos ?? [])) if (f != null) n.append(f.nodeType ? f : document.createTextNode(String(f)));
    return n;
  };

  // ---------- estado da partida ----------
  let par = PARES[0];
  const times = () => ({ casa: par.casa, visitante: par.visitante });
  let estado = 'pre';                      // pre · jogo · intervalo · fim
  let tempo = 1;                           // 1º ou 2º tempo
  let seg = 0;                             // relógio do jogo, em segundos
  let placar = { casa: 0, visitante: 0 };
  let dir = { casa: 1, visitante: -1 };    // para onde cada time ataca (troca no intervalo)
  let posse = null;                        // casa · visitante · null
  let frases = [];                         // as frases fechadas desta partida (a fila usa o índice)
  let lances = [];                         // os lances registrados: { id, tipo, time, min, slot, t, anulado, trecho }
  let est = null;                          // estatísticas da TV
  let partida = 0;                         // muda a cada jogo novo: respostas velhas são ignoradas
  let versaoEnviada = 0, versaoAplicada = 0, versaoDoUltimoLance = 0, emVoo = 0, naFila = 0;
  let fila = Promise.resolve();
  let modo = 'saida';                      // jogo · saida · festa · escanteio · penalti · parado
  let saiQuem = 'casa';                    // quem dá a saída de bola
  let festa = null;                        // { time, canto }
  let timerFesta = null, timerDepois = null;
  let ultimaAnulacao = null;               // { slot, t }
  let torcidaNivel = 0, ultimaOnda = 0, vozSuave = 0, torcidaVista = 0;
  let idLance = 0;
  const zerarEst = () => Object.fromEntries(LADOS.map((l) => [l, { chutes: 0, escanteios: 0, faltas: 0, amarelos: 0, vermelhos: 0, posseS: 0 }]));
  est = zerarEst();

  // ---------- a tela ----------
  const raiz = el('div', { class: 'nf' });
  const svg = s('svg', { class: 'nf-svg', viewBox: `${-MX} ${-MY} ${VBW} ${VBH}`, 'aria-hidden': 'true' });
  const quadro = el('div', { class: 'nf-quadro' }, [svg]);
  const campo = el('div', { class: 'nf-campo', role: 'img', 'aria-label': 'Campo de futebol visto de cima, com os 22 jogadores, a bola e o placar' }, [quadro]);

  // placar de TV
  const plCasa = el('span', { class: 'g mj-num', text: '0' }), plVis = el('span', { class: 'g mj-num', text: '0' });
  const plSigCasa = el('b', { class: 'sig' }), plSigVis = el('b', { class: 'sig' });
  const plCartCasa = el('span', { class: 'cart' }), plCartVis = el('span', { class: 'cart' });
  const plRel = el('b', { class: 'rel mj-num', text: '00:00' }), plTempo = el('span', { class: 'tp', text: '1ºT' });
  const placarNo = el('div', { class: 'nf-placar', 'aria-live': 'polite' }, [
    el('div', { class: 'tm casa' }, [el('i', { class: 'esc' }), plSigCasa, plCartCasa]),
    el('div', { class: 'gols' }, [el('span', { class: 'gw' }, [plCasa]), el('span', { class: 'x', text: '×' }), el('span', { class: 'gw' }, [plVis])]),
    el('div', { class: 'tm vis' }, [plCartVis, plSigVis, el('i', { class: 'esc' })]),
    el('div', { class: 'relogio' }, [plRel, plTempo]),
  ]);
  const aoVivo = el('div', { class: 'nf-aovivo' }, [el('span', { class: 'pt' }, [el('i', { text: '●' }), ' AO VIVO'])]);
  const dicaT = el('b'), dicaS = el('span');
  const dica = el('div', { class: 'nf-dica' }, [dicaT, dicaS]);
  const textoDica = (fim) => {
    dicaT.textContent = fim ? '⏱️ Fim de jogo' : '🎙️ Narre o jogo';
    dicaS.textContent = fim ? 'Aperte ↺ Novo jogo ou diga “começa o jogo” para outra partida.' : 'Aperte o microfone e fale como na TV: “Rola a bola! Lá vai ele pela esquerda…”';
  };
  textoDica(false);
  const tarja = el('div', { class: 'nf-tarja', 'aria-live': 'polite' });
  const faixa = el('div', { class: 'nf-faixa', 'aria-live': 'assertive' });
  const cartaoNo = el('div', { class: 'nf-cartao' });
  const confete = el('div', { class: 'nf-confete', 'aria-hidden': 'true' });
  const estatNo = el('div', { class: 'nf-estat' });
  quadro.append(placarNo, aoVivo, dica, tarja, faixa, cartaoNo, confete, estatNo);

  // linha do tempo 0' → 90'
  const ltBarra = el('i', { class: 'enche' });
  const ltMarcas = el('div', { class: 'marcas' });
  const linha = el('div', { class: 'nf-linha', role: 'img', 'aria-label': 'Linha do tempo da partida' }, [
    el('span', { class: 'ponta mj-num', text: "0'" }),
    el('div', { class: 'trilho' }, [el('div', { class: 'barra' }, [ltBarra, el('i', { class: 'meio' })]), ltMarcas]),
    el('span', { class: 'ponta mj-num', text: "90'" }),
    el('div', { class: 'nf-fita' }, [api.fita.no]),
  ]);

  // lateral: seletor, o que o Jev leu, lance a lance
  const btClassico = el('button', { class: 'nf-bt nf-classico', type: 'button', title: 'Trocar os times', onclick: () => escolherClassico() });
  const btNovo = el('button', { class: 'nf-bt', type: 'button', title: 'Começar outra partida, zerada', onclick: () => novoJogo() }, ['↺ ', el('span', { class: 'tx', text: 'Novo jogo' })]);
  const leuLance = el('div', { class: 'nf-leu-lance' }, [el('span', { class: 'ic', text: '🎙️' }), el('b', { text: 'Esperando a narração' }), el('span', { class: 'pc mj-num' })]);
  const leuPosseCasa = el('i', { class: 'casa' }), leuPosseVis = el('i', { class: 'vis' });
  const leuPosseTx = el('span', { class: 'pc mj-num', text: '' });
  const leuZona = el('b', { text: '—' }), leuZonaPc = el('span', { class: 'pc mj-num' });
  const leuTorcida = el('b', { text: 'calma' });
  const leuSegs = el('span', { class: 'segs' }, [0, 1, 2, 3, 4].map(() => el('i')));
  const leu = el('section', { class: 'nf-leu', 'aria-label': 'O que o Jev leu na última fala' }, [
    el('h3', { text: 'O Jev leu agora' }),
    leuLance,
    el('div', { class: 'nf-leu-linha posse' }, [el('span', { class: 'r', text: 'Posse' }), el('span', { class: 'trk' }, [leuPosseCasa, leuPosseVis]), leuPosseTx]),
    el('div', { class: 'nf-leu-linha' }, [el('span', { class: 'r', text: 'Bola' }), leuZona, leuZonaPc]),
    el('div', { class: 'nf-leu-linha' }, [el('span', { class: 'r', text: 'Torcida' }), leuSegs, leuTorcida]),
  ]);
  const feed = el('ol', { class: 'nf-feed-lista', 'aria-live': 'polite' });
  const feedVazio = el('li', { class: 'nf-feed-vazio', text: 'Os lances aparecem aqui assim que você narrar.' });
  const feedBox = el('section', { class: 'nf-feed' }, [el('h3', { text: 'Lance a lance' }), feed]);
  const btSom = el('button', { class: 'nf-bt nf-som', type: 'button' });
  const desenharSom = () => { btSom.textContent = som.ligado ? '🔊' : '🔇'; btSom.setAttribute('aria-pressed', String(som.ligado)); btSom.setAttribute('aria-label', som.ligado ? 'Desligar o som' : 'Ligar o som'); btSom.title = som.ligado ? 'Som ligado' : 'Som desligado'; };
  btSom.addEventListener('click', () => { som.ligado = !som.ligado; desenharSom(); if (som.ligado) som.apito(); });
  desenharSom();
  const lado = el('aside', { class: 'nf-lado' }, [el('div', { class: 'nf-acoes' }, [btClassico, btNovo, btSom]), leu, feedBox]);
  const vozBox = el('div', { class: 'nf-voz' });
  // mexer na barra de voz (microfone, exemplo, digitar) tira o quadro do intervalo da frente
  vozBox.addEventListener('click', () => estatNo.classList.remove('mostra'));

  raiz.append(el('div', { class: 'nf-palco' }, [el('section', { class: 'nf-tv' }, [campo, linha]), lado]), vozBox);
  area.append(raiz);

  // ---------- o desenho do campo ----------
  const defs = s('defs', {}, [
    s('pattern', { id: 'nf-rede', width: 7, height: 7, patternUnits: 'userSpaceOnUse' }, [s('path', { d: 'M0 0L7 7M7 0L0 7', class: 'fio' })]),
    s('radialGradient', { id: 'nf-luz', cx: '50%', cy: '42%', r: '72%' }, [s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.13' }), s('stop', { offset: '.6', 'stop-color': '#fff', 'stop-opacity': '0' }), s('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '.32' })]),
    s('linearGradient', { id: 'nf-rastro', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1, y2: 0 }, [s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0' }), s('stop', { offset: '1', 'stop-color': '#fff7c2', 'stop-opacity': '.85' })]),
    s('radialGradient', { id: 'nf-bola', cx: '38%', cy: '34%', r: '70%' }, [s('stop', { offset: '0', 'stop-color': '#fff' }), s('stop', { offset: '.7', 'stop-color': '#e8edf2' }), s('stop', { offset: '1', 'stop-color': '#9aa6b2' })]),
    ...['casa', 'vis'].map((k) => s('pattern', { id: `nf-povo-${k}`, width: 15, height: 13, patternUnits: 'userSpaceOnUse' }, [
      s('rect', { width: 15, height: 13, class: 'fundo' }),
      s('circle', { cx: 3.5, cy: 3.5, r: 3.1, class: `p1 ${k}` }), s('circle', { cx: 11, cy: 4, r: 3.1, class: `p2 ${k}` }),
      s('circle', { cx: 7.5, cy: 10, r: 3.1, class: `p3 ${k}` }), s('circle', { cx: 14.5, cy: 10.5, r: 2.6, class: `p1 ${k}` }),
    ])),
  ]);
  svg.append(defs);
  const gradRastro = defs.querySelector('#nf-rastro');

  // arquibancada: as organizadas atrás de cada gol (casa à esquerda, visitante à direita) e as laterais divididas
  const gArq = s('g', { class: 'nf-arq' });
  gArq.append(s('rect', { x: -MX + 4, y: -MY + 4, width: VBW - 8, height: VBH - 8, rx: 46, class: 'concreto' }));
  const setores = { casa: [], visitante: [] };
  const setor = (ladoT, x, y, w, h, i) => {
    const g = s('g', { class: `nf-setor ${ladoT === 'casa' ? 'casa' : 'vis'}`, style: `--i:${i}` }, [s('rect', { x, y, width: w, height: h, rx: 10, fill: `url(#nf-povo-${ladoT === 'casa' ? 'casa' : 'vis'})` })]);
    setores[ladoT].push(g); gArq.append(g);
  };
  // atrás dos gols (as organizadas)
  const alto = (VBH - 20) / 4;
  for (let i = 0; i < 4; i++) setor('casa', -MX + 12, -MY + 10 + i * alto, MX - 60, alto - 6, i);
  for (let i = 0; i < 4; i++) setor('visitante', W + 48, -MY + 10 + i * alto, MX - 60, alto - 6, i + 2);
  // laterais (em cima e embaixo, atrás das placas), metade para cada torcida
  for (let i = 0; i < 6; i++) {
    const ladoT = i < 3 ? 'casa' : 'visitante', w = (W + 80) / 6;
    setor(ladoT, -40 + i * w, -MY + 4, w - 8, 25, i);
    setor(ladoT, -40 + i * w, H + 41, w - 8, 25, i + 1);
  }
  // bandeiras das torcidas (tremulam quando a torcida ferve)
  for (const [ladoT, x, y] of [['casa', -MX + 44, 70], ['casa', -MX + 58, 450], ['visitante', W + 70, 120], ['visitante', W + 84, 500]]) {
    gArq.append(s('g', { class: `nf-bandeira-torc ${ladoT === 'casa' ? 'casa' : 'vis'}`, transform: `translate(${x} ${y})` }, [
      s('line', { x1: 0, y1: 0, x2: 0, y2: 64, class: 'mastro' }), s('path', { d: 'M0 0 L52 7 L47 22 L52 37 L0 34 Z', class: 'pano' }),
    ]));
  }
  svg.append(gArq);

  // placas de publicidade (LED) nas laterais
  const ledTxt = [];
  const gLed = s('g', { class: 'nf-led' });
  for (const y of [-38, H + 22]) {
    gLed.append(s('rect', { x: -12, y, width: W + 24, height: 16, rx: 3, class: 'placa' }));
    const t = s('text', { x: W / 2, y: y + 12.4, class: 'txt', 'text-anchor': 'middle' }, ['NARRE O JOGO  ·  ⚡ JEV  ·  O LANCE SAI QUANDO VOCÊ FALA  ·  NARRE O JOGO']);
    ledTxt.push(t); gLed.append(t);
  }
  svg.append(gLed);

  // gramado com listras, luz de estádio e as linhas oficiais
  const gGrama = s('g', { class: 'nf-grama' });
  gGrama.append(s('rect', { x: -30, y: -21, width: W + 60, height: H + 42, class: 'entorno' }));
  for (let i = 0; i < 14; i++) gGrama.append(s('rect', { x: (i * W) / 14, y: 0, width: W / 14 + 0.6, height: H, class: i % 2 ? 'lista b' : 'lista a' }));
  gGrama.append(s('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#nf-luz)' }));
  const gLinhas = s('g', { class: 'nf-linhas' }, [
    s('rect', { x: 0, y: 0, width: W, height: H }),
    s('line', { x1: W / 2, y1: 0, x2: W / 2, y2: H }),
    s('circle', { cx: W / 2, cy: H / 2, r: 91.5 }),
    s('circle', { cx: W / 2, cy: H / 2, r: 4, class: 'ponto' }),
    s('rect', { x: 0, y: 138.4, width: 165, height: 403.2 }), s('rect', { x: W - 165, y: 138.4, width: 165, height: 403.2 }),
    s('rect', { x: 0, y: 248.4, width: 55, height: 183.2 }), s('rect', { x: W - 55, y: 248.4, width: 55, height: 183.2 }),
    s('circle', { cx: 110, cy: H / 2, r: 4, class: 'ponto' }), s('circle', { cx: W - 110, cy: H / 2, r: 4, class: 'ponto' }),
    s('path', { d: 'M165 266.8 A91.5 91.5 0 0 1 165 413.2' }), s('path', { d: `M${W - 165} 266.8 A91.5 91.5 0 0 0 ${W - 165} 413.2` }),
    s('path', { d: 'M10 0 A10 10 0 0 1 0 10' }), s('path', { d: `M${W} 10 A10 10 0 0 1 ${W - 10} 0` }),
    s('path', { d: `M${W - 10} ${H} A10 10 0 0 1 ${W} ${H - 10}` }), s('path', { d: `M0 ${H - 10} A10 10 0 0 1 10 ${H}` }),
  ]);
  gGrama.append(gLinhas);
  svg.append(gGrama);

  // calor das zonas (o que o Jev leu sobre onde está a bola)
  const gCalor = s('g', { class: 'nf-calor' });
  const calor = {};
  for (const z of Object.keys(ZONA)) { calor[z] = s('rect', { rx: 18, class: 'zona' }); gCalor.append(calor[z]); }
  svg.append(gCalor);

  // linha de impedimento e spray do juiz
  const impedLinha = s('line', { class: 'nf-imped', x1: 0, y1: -6, x2: 0, y2: H + 6 });
  const spray = s('path', { class: 'nf-spray', d: '' });
  svg.append(impedLinha, spray);

  // os dois gols (vistos de cima: a rede atrás da linha)
  const redes = {};
  for (const ladoG of ['esq', 'dir']) {
    const x0 = ladoG === 'esq' ? -26 : W;
    const g = s('g', { class: `nf-meta ${ladoG}` }, [
      s('rect', { x: x0, y: 303.4, width: 26, height: 73.2, class: 'rede', fill: 'url(#nf-rede)' }),
      s('rect', { x: x0, y: 303.4, width: 26, height: 73.2, class: 'caixa' }),
      s('line', { x1: ladoG === 'esq' ? 0 : W, y1: 303.4, x2: ladoG === 'esq' ? 0 : W, y2: 376.6, class: 'travessao' }),
      s('circle', { cx: ladoG === 'esq' ? 0 : W, cy: 303.4, r: 4.2, class: 'poste' }), s('circle', { cx: ladoG === 'esq' ? 0 : W, cy: 376.6, r: 4.2, class: 'poste' }),
    ]);
    redes[ladoG] = g; svg.append(g);
  }
  // bandeirinhas de escanteio
  const cantos = {};
  for (const [k, x, y] of [['ne', W, 0], ['se', W, H], ['no', 0, 0], ['so', 0, H]]) {
    cantos[k] = s('g', { class: 'nf-canto', transform: `translate(${x} ${y})` }, [s('line', { x1: 0, y1: 0, x2: 0, y2: -22, class: 'mastro' }), s('path', { d: 'M0 -22 L15 -17 L0 -12 Z', class: 'pano' })]);
    svg.append(cantos[k]);
  }

  // jogadores, juiz, bandeirinhas e a bola
  const gJog = s('g', { class: 'nf-jogadores' });
  const elenco = { casa: [], visitante: [] };
  for (const ladoT of LADOS) {
    for (const [num, papel, u, v] of FORMACAO) {
      const corpo = s('circle', { r: 17, class: 'corpo' });
      const numero = s('text', { class: 'num', y: 7.5, 'text-anchor': 'middle' }, [String(num)]);
      const g = s('g', { class: `nf-j ${ladoT === 'casa' ? 'casa' : 'vis'} ${papel}` }, [s('ellipse', { rx: 16, ry: 6, cy: 14, class: 'sombra' }), s('circle', { r: 25, class: 'anel' }), corpo, numero]);
      gJog.append(g);
      elenco[ladoT].push({ num, papel, u, v, x: 0, y: 0, tx: 0, ty: 0, g, numero, fora: false, w1: rnd(0.6, 1.3), w2: rnd(0.5, 1.2), f1: rnd(0, 6), f2: rnd(0, 6), vel: 1 });
    }
  }
  const juiz = { x: W / 2 - 60, y: H / 2 + 80, tx: 0, ty: 0, g: s('g', { class: 'nf-juiz' }, [s('ellipse', { rx: 14, ry: 5, cy: 12, class: 'sombra' }), s('circle', { r: 14, class: 'corpo' }), s('rect', { x: -7, y: -48, width: 14, height: 20, rx: 2, class: 'cartao-mao' })]) };
  const assist = [
    { x: W * 0.75, y: -11, metade: 'dir', g: s('g', { class: 'nf-assist' }, [s('circle', { r: 11, class: 'corpo' }), s('line', { x1: 0, y1: 0, x2: 0, y2: -34, class: 'mastro' }), s('path', { d: 'M0 -34 L18 -29 L0 -22 Z', class: 'pano' })]) },
    { x: W * 0.25, y: H + 11, metade: 'esq', g: s('g', { class: 'nf-assist' }, [s('circle', { r: 11, class: 'corpo' }), s('line', { x1: 0, y1: 0, x2: 0, y2: -34, class: 'mastro' }), s('path', { d: 'M0 -34 L18 -29 L0 -22 Z', class: 'pano' })]) },
  ];
  gJog.append(juiz.g, ...assist.map((a) => a.g));
  svg.append(gJog);
  const rastro = s('path', { class: 'nf-rastro', d: '', stroke: 'url(#nf-rastro)' });
  const bolaSombra = s('ellipse', { rx: 9, ry: 4.5, class: 'nf-bola-sombra' });
  const bolaG = s('g', { class: 'nf-bola' }, [s('circle', { r: 9, fill: 'url(#nf-bola)', class: 'couro' }), s('path', { d: 'M-3 -3.5 L3 -3.5 L4.6 1.6 L0 4.8 L-4.6 1.6 Z', class: 'gomo' })]);
  svg.append(rastro, bolaSombra, bolaG);

  // tamanho do quadro: o campo cabe inteiro no espaço que sobrar (e os letreiros acompanham o campo)
  const ajustar = () => {
    const r = campo.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const k = Math.min(r.width / VBW, r.height / VBH);
    quadro.style.width = Math.floor(VBW * k) + 'px';
    quadro.style.height = Math.floor(VBH * k) + 'px';
  };
  new ResizeObserver(ajustar).observe(campo);
  ajustar();

  // ---------- simulação: bola e jogadores ----------
  const bola = { x: W / 2, y: H / 2, z: 0, modo: 'parada', de: null, para: null, t0: 0, dur: 0, alto: 0, curva: 0, depois: null, carregador: null, alvo: null };
  const trilha = [];
  const ladoDe = (p) => (elenco.casa.includes(p) ? 'casa' : 'visitante');
  const xy = (d, u, v) => ({ x: d > 0 ? u : W - u, y: d > 0 ? v : H - v });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ativos = (t) => elenco[t].filter((p) => !p.fora);
  const maisPerto = (t, pt, semGoleiro = true) => {
    let m = null, dm = 1e9;
    for (const p of ativos(t)) { if (semGoleiro && p.papel === 'gk') continue; const d = dist(p, pt); if (d < dm) { dm = d; m = p; } }
    return m;
  };
  const goleiro = (t) => elenco[t].find((p) => p.papel === 'gk');

  function pontoNaZona(z, t) {
    const d = dir[t || 'casa'];
    const [ter, fx] = ZONA[z];
    let u = rnd(...MIOLO_U[ter]), v = rnd(...MIOLO_V[fx]);
    if (z === 'area') { u = rnd(880, 972); v = rnd(262, 418); }
    return xy(d, u, v);
  }
  const golAtacado = (t) => (dir[t] > 0 ? { x: W, y: H / 2, lado: 'dir' } : { x: 0, y: H / 2, lado: 'esq' });

  function voar(para, { dur, alto = 0, curva = 0, depois } = {}) {
    const d = dist(bola, para);
    Object.assign(bola, { modo: 'voo', de: { x: bola.x, y: bola.y }, para, t0: performance.now(), dur: dur ?? clamp(d / 760, 0.28, 1.15) * 1000, alto, curva, depois: depois || null, carregador: null });
  }
  function conduzir(p, alvo) { Object.assign(bola, { modo: 'conduzida', carregador: p, alvo }); }
  function parar(pt) { Object.assign(bola, { modo: 'parada', carregador: null, x: pt ? pt.x : bola.x, y: pt ? pt.y : bola.y, z: 0 }); }
  // o passe vai para o companheiro mais perto do ponto, que corre para lá
  function passar(t, alvo, { alto = 0 } = {}) {
    const rec = maisPerto(t, alvo) || maisPerto(t, bola);
    if (!rec) return;
    rec.tx = alvo.x; rec.ty = alvo.y; rec.corre = performance.now() + 900;
    voar(alvo, { alto, curva: rnd(-30, 30), depois: () => conduzir(rec, { x: alvo.x + 40 * dir[t], y: alvo.y }) });
    bola.receptor = rec;
  }

  function calcularAlvos(agoraS) {
    for (const t of LADOS) {
      const d = dir[t], comBola = posse === t, atacando = posse === t;
      const bu = d > 0 ? bola.x : W - bola.x, bv = d > 0 ? bola.y : H - bola.y;
      for (const p of elenco[t]) {
        if (p.fora) { p.tx = p.x; p.ty = H + MY - 24; continue; }
        let a = null, u = p.u, v = p.v;
        if (modo === 'saida' || modo === 'parado' || (modo === 'festa' && festa && t !== festa.time)) {
          // cada time no seu campo; quem dá a saída põe os dois atacantes no círculo central
          u = p.papel === 'gk' ? 40 : Math.min(p.u * 0.94, 478);
          if (modo === 'saida' && t === saiQuem && p.papel === 'fw') { u = 518; v = p.num === 9 ? 316 : 364; }
        } else if (modo === 'festa' && festa) {
          // comemoração: todo mundo corre para a bandeirinha de escanteio
          if (p.papel === 'gk') { u = 150; v = 340; }
          else { const sx = festa.canto.x > W / 2 ? -1 : 1; a = { x: festa.canto.x + sx * (14 + ((p.num * 29) % 64)), y: festa.canto.y + (((p.num * 47) % 76) - 38) * (festa.canto.y > H / 2 ? -1 : 1) * 0.5 + (festa.canto.y > H / 2 ? -30 : 30) }; }
        } else if (modo === 'escanteio') {
          if (p.papel === 'gk') { u = atacando ? 70 : 8; v = 340; }
          else if (atacando) { if (p.num === 3 || p.num === 4) { u = 545; v = p.v; } else { u = 898 + (p.num % 3) * 24; v = 248 + ((p.num * 41) % 184); } }
          else if (p.num === 9) { u = 470; v = 340; }
          else { u = 30 + (p.num % 3) * 26; v = 245 + ((p.num * 47) % 190); }
        } else if (modo === 'penalti') {
          // só o batedor e o goleiro dentro da área
          if (p.papel === 'gk') { u = atacando ? 70 : 4; v = 340; }
          else if (atacando) { u = 805 + (p.num % 3) * 24; v = 130 + ((p.num * 53) % 420); }
          else { u = 192 + (p.num % 3) * 24; v = 130 + ((p.num * 61) % 420); }
        } else {
          if (p.papel === 'gk') { u = 34 + clamp((bu - 250) * 0.05, 0, 36); v = 340 + clamp((bv - 340) * 0.22, -44, 44); }
          else {
            const k = comBola ? 0.8 : 0.64;
            u = p.u + (bu - 390) * k + (comBola ? 72 : -38);
            v = p.v + (bv - 340) * (comBola ? 0.22 : 0.42);
            u = clamp(u, 30, comBola ? 1012 : 985);
          }
        }
        if (!a) {
          const balanco = modo === 'jogo' ? 7 : 3;
          u += Math.sin(agoraS * p.w1 + p.f1) * balanco; v += Math.cos(agoraS * p.w2 + p.f2) * balanco;
          a = xy(d, u, v);
        }
        p.tx = clamp(a.x, 8, W - 8); p.ty = clamp(a.y, 8, H - 8);
      }
    }
    if (modo === 'jogo' && posse) {
      if (bola.modo === 'conduzida' && bola.carregador && !bola.carregador.fora) { bola.carregador.tx = bola.alvo.x; bola.carregador.ty = bola.alvo.y; }
      else if (bola.modo === 'voo' && bola.receptor) { bola.receptor.tx = bola.para.x; bola.receptor.ty = bola.para.y; }
      else if (bola.modo === 'parada') { const c = maisPerto(posse, bola, false); if (c) { c.tx = bola.x - 18 * dir[posse]; c.ty = bola.y + 4; } }
      const m = maisPerto(outro(posse), bola);
      if (m && bola.modo !== 'voo') { m.tx = bola.x + 30 * dir[posse]; m.ty = bola.y + 12; }
    }
    if (modo === 'escanteio' || modo === 'penalti') {
      const c = posse && maisPerto(posse, bola);
      if (c) { c.tx = bola.x - 16 * dir[posse]; c.ty = bola.y + (bola.y < H / 2 ? 14 : -14); }
    }
    // goleiro que vai na bola (defesa)
    if (bola.mergulho && performance.now() < bola.mergulho.ate) { const g = bola.mergulho.g; g.tx = bola.mergulho.x; g.ty = bola.mergulho.y; }
  }

  // o juiz acompanha de perto; os bandeirinhas correm na linha do penúltimo defensor
  function moverArbitragem(dt) {
    const d = posse ? dir[posse] : 1;
    const jt = juiz.alvo && performance.now() < juiz.alvo.ate ? juiz.alvo : { x: clamp(bola.x - 70 * d, 60, W - 60), y: clamp(bola.y + (bola.y < H / 2 ? 90 : -90), 40, H - 40) };
    const k = 1 - Math.exp(-dt * 2.6);
    juiz.x += (jt.x - juiz.x) * k; juiz.y += (jt.y - juiz.y) * k;
    for (const a of assist) {
      const defendeAqui = LADOS.find((t) => (a.metade === 'dir' ? dir[t] < 0 : dir[t] > 0));
      const linhaX = ativos(defendeAqui).filter((p) => p.papel !== 'gk').reduce((m, p) => (a.metade === 'dir' ? Math.max(m, p.x) : Math.min(m, p.x)), a.metade === 'dir' ? W / 2 : W / 2);
      const ax = a.metade === 'dir' ? clamp(Math.max(linhaX, bola.x), W / 2, W) : clamp(Math.min(linhaX, bola.x), 0, W / 2);
      a.x += (ax - a.x) * (1 - Math.exp(-dt * 3));
    }
  }

  let ultimoQuadro = performance.now(), ultimosAlvos = 0;
  function quadroDaAnimacao(agora) {
    const dt = clamp((agora - ultimoQuadro) / 1000, 0, 0.05);
    ultimoQuadro = agora;
    if (estado === 'jogo') {
      seg += dt * VEL;
      if (posse) est[posse].posseS += dt;
      desenharRelogio();
    }
    if (agora - ultimosAlvos > 90) { calcularAlvos(agora / 1000); ultimosAlvos = agora; }
    if (barra) {
      const voz = parseFloat(barra.no.style.getPropertyValue('--mj-voz-n')) || 0;
      vozSuave += (voz - vozSuave) * (voz > vozSuave ? 0.35 : 0.04);
      const alvo = Math.max(torcidaNivel / 4, vozSuave * 0.55);
      if (Math.abs(alvo - torcidaVista) > 0.01) { torcidaVista += (alvo - torcidaVista) * 0.2; raiz.style.setProperty('--torcida', torcidaVista.toFixed(3)); }
    }
    for (const t of LADOS) for (const p of elenco[t]) {
      const dx = p.tx - p.x, dy = p.ty - p.y, dd = Math.hypot(dx, dy);
      const rapido = p === bola.carregador || p === bola.receptor || (p.corre && agora < p.corre) || (bola.mergulho && p === bola.mergulho.g && agora < bola.mergulho.ate);
      const vmax = (rapido ? 330 : modo === 'festa' ? 300 : 210) * (bola.mergulho && p === bola.mergulho.g && agora < bola.mergulho.ate ? 2.6 : 1);
      const v = Math.min(vmax, 30 + dd * 3.4);
      if (dd > 0.5) { const st = Math.min(dd, v * dt); p.x += (dx / dd) * st; p.y += (dy / dd) * st; }
    }
    moverArbitragem(dt);
    // bola
    if (bola.modo === 'voo') {
      const t = clamp((agora - bola.t0) / bola.dur, 0, 1), e = bola.alto ? easeInOut(t) : easeOut(t);
      const nx = lerp(bola.de.x, bola.para.x, e), ny = lerp(bola.de.y, bola.para.y, e);
      const ang = Math.atan2(bola.para.y - bola.de.y, bola.para.x - bola.de.x) + Math.PI / 2, cv = Math.sin(Math.PI * e) * bola.curva;
      bola.x = nx + Math.cos(ang) * cv; bola.y = ny + Math.sin(ang) * cv; bola.z = bola.alto * Math.sin(Math.PI * t);
      if (t >= 1) { bola.modo = 'parada'; bola.z = 0; const f = bola.depois; bola.depois = null; bola.receptor = null; if (f) f(); }
    } else if (bola.modo === 'conduzida' && bola.carregador) {
      const c = bola.carregador, d = dir[ladoDe(c)];
      const k = 1 - Math.exp(-dt * 14);
      bola.x += (c.x + 15 * d - bola.x) * k; bola.y += (c.y + 5 - bola.y) * k; bola.z = 0;
    }
    trilha.push({ x: bola.x, y: bola.y });
    while (trilha.length > 16) trilha.shift();
    const mexendo = trilha.length > 2 && dist(trilha[0], trilha[trilha.length - 1]) > 24;
    desenharObjetos(mexendo);
    requestAnimationFrame(quadroDaAnimacao);
  }

  function desenharObjetos(mexendo) {
    for (const t of LADOS) for (const p of elenco[t]) {
      p.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      p.g.classList.toggle('com-bola', bola.modo === 'conduzida' && bola.carregador === p);
    }
    juiz.g.setAttribute('transform', `translate(${juiz.x.toFixed(1)} ${juiz.y.toFixed(1)})`);
    for (const a of assist) a.g.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y})`);
    const sc = 1 + bola.z * 0.9;
    bolaG.setAttribute('transform', `translate(${bola.x.toFixed(1)} ${(bola.y - bola.z * 26).toFixed(1)}) scale(${sc.toFixed(3)})`);
    bolaSombra.setAttribute('cx', (bola.x + bola.z * 10).toFixed(1)); bolaSombra.setAttribute('cy', (bola.y + 6).toFixed(1));
    bolaSombra.setAttribute('opacity', (0.45 - bola.z * 0.25).toFixed(2));
    if (mexendo && !reduz) {
      const a = trilha[0], b = trilha[trilha.length - 1];
      rastro.setAttribute('d', 'M' + trilha.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L'));
      const g = gradRastro;
      g.setAttribute('x1', a.x.toFixed(1)); g.setAttribute('y1', a.y.toFixed(1)); g.setAttribute('x2', b.x.toFixed(1)); g.setAttribute('y2', b.y.toFixed(1));
      rastro.style.opacity = '1';
    } else rastro.style.opacity = '0';
  }

  function posicionarDeUmaVez() {
    calcularAlvos(performance.now() / 1000);
    for (const t of LADOS) for (const p of elenco[t]) { p.x = p.tx; p.y = p.ty; }
    juiz.x = W / 2 - 70; juiz.y = H / 2 + 110;
  }

  // ---------- tela: placar, relógio, cores ----------
  function aplicarCores() {
    const T = times();
    const v = (k, t) => {
      raiz.style.setProperty(`--${k}-cor`, t.cor); raiz.style.setProperty(`--${k}-cor2`, t.cor2);
      raiz.style.setProperty(`--${k}-camisa`, t.camisa); raiz.style.setProperty(`--${k}-num`, t.numero); raiz.style.setProperty(`--${k}-gk`, t.goleiro);
    };
    v('casa', T.casa); v('vis', T.visitante);
    const claro = (hex) => { const n = parseInt(String(hex).slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.7; };
    raiz.classList.toggle('casa-clara', claro(T.casa.cor)); raiz.classList.toggle('vis-clara', claro(T.visitante.cor));
    plSigCasa.textContent = T.casa.sigla; plSigVis.textContent = T.visitante.sigla;
    btClassico.innerHTML = '';
    btClassico.append(el('i', { class: 'esc casa' }), el('b', { text: `${T.casa.sigla} × ${T.visitante.sigla}` }), el('i', { class: 'esc vis' }), el('span', { class: 'seta', text: '▾' }));
    btClassico.setAttribute('aria-label', `Trocar os times (agora: ${T.casa.nome} × ${T.visitante.nome})`);
    campo.setAttribute('aria-label', `Campo de futebol visto de cima: ${T.casa.nome} × ${T.visitante.nome}`);
    leuPosseTx.textContent = '';
  }

  function minuto() { return Math.max(1, Math.floor(seg / 60) + 1); }
  function desenharRelogio() {
    const m = Math.floor(seg / 60), ss = Math.floor(seg % 60);
    const txt = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    if (plRel.textContent !== txt) plRel.textContent = txt;
    const pc = clamp(seg / (90 * 60), 0, 1);
    ltBarra.style.width = (pc * 100).toFixed(2) + '%';
  }
  function desenharTempo() {
    plTempo.textContent = estado === 'intervalo' ? 'INTERVALO' : estado === 'fim' ? 'FIM' : `${tempo}ºT`;
    placarNo.classList.toggle('parado', estado === 'intervalo' || estado === 'fim');
  }
  function trocarNumero(no_, valor, volta) {
    if (no_.textContent === String(valor)) return;
    const pai = no_.parentElement;
    const velho = no_.cloneNode(true);
    no_.textContent = String(valor);
    if (reduz) return;
    velho.classList.add(volta ? 'sai-desce' : 'sai-sobe'); no_.classList.remove('entra-sobe', 'entra-desce'); void no_.offsetWidth;
    no_.classList.add(volta ? 'entra-desce' : 'entra-sobe');
    pai.append(velho); setTimeout(() => velho.remove(), 520);
  }
  function desenharPlacar(volta = false) {
    trocarNumero(plCasa, placar.casa, volta); trocarNumero(plVis, placar.visitante, volta);
    plCartCasa.innerHTML = ''; plCartVis.innerHTML = '';
    for (const [no_, t] of [[plCartCasa, 'casa'], [plCartVis, 'visitante']]) {
      for (let i = 0; i < Math.min(3, est[t].amarelos); i++) no_.append(el('i', { class: 'am' }));
      for (let i = 0; i < Math.min(2, est[t].vermelhos); i++) no_.append(el('i', { class: 'vm' }));
    }
  }

  // ---------- tela: o que o Jev leu ----------
  function mostrarLeitura(r, lanceVisto) {
    const T = times();
    if (lanceVisto) {
      leuLance.querySelector('.ic').textContent = lanceVisto.icone;
      leuLance.querySelector('b').textContent = lanceVisto.rotulo;
      leuLance.querySelector('.pc').textContent = lanceVisto.p != null ? fmt.pct(lanceVisto.p) : '';
      leuLance.classList.remove('pulsa'); void leuLance.offsetWidth; leuLance.classList.add('pulsa');
    }
    const pp = (r.posse && r.posse.probabilities) || {};
    const pc = pp.casa || 0, pv = pp.visitante || 0, tot = pc + pv;
    if (tot > 0.15) {
      const fc = pc / tot;
      leuPosseCasa.style.width = (fc * 100).toFixed(1) + '%'; leuPosseVis.style.width = ((1 - fc) * 100).toFixed(1) + '%';
      leuPosseTx.textContent = `${fc >= 0.5 ? T.casa.sigla : T.visitante.sigla} ${fmt.pct(Math.max(fc, 1 - fc))}`;
    }
    const z = r.zona;
    if (z && z.choice) {
      const pz = conf(z);
      leuZona.textContent = z.choice === 'mesma' ? 'mesmo lugar' : ZONA_ROT[z.choice] || z.choice;
      leuZonaPc.textContent = fmt.pct(pz);
      // calor das zonas: probabilidade de cada uma, no lado de quem tem a bola
      const lida = r.posse && r.posse.choice !== 'indefinido' && conf(r.posse) >= LIM.posse ? r.posse.choice : null;
      const tz = lida || posse || 'casa', d = dir[tz];
      for (const [id, [ter, fx]] of Object.entries(ZONA)) {
        const [u0, u1] = TERCO[ter], [v0, v1] = FAIXA[fx];
        const a = xy(d, u0, v0), b = xy(d, u1, v1);
        const r_ = calor[id];
        r_.setAttribute('x', Math.min(a.x, b.x) + 6); r_.setAttribute('y', Math.min(a.y, b.y) + 6);
        r_.setAttribute('width', Math.abs(b.x - a.x) - 12); r_.setAttribute('height', Math.abs(b.y - a.y) - 12);
        const p = (z.probabilities && z.probabilities[id]) || 0;
        r_.style.setProperty('--p', p.toFixed(3));
        r_.classList.toggle('top', id === z.choice && p >= 0.4);
      }
    }
    if (r.emocao) {
      const e = clamp(r.emocao.score ?? 0, 0, 4);
      leuTorcida.textContent = NIVEIS[Math.round(e)] || '';
      [...leuSegs.children].forEach((sg, i) => sg.classList.toggle('on', i < Math.round(e) + 1 && e >= i - 0.5));
      leuSegs.style.setProperty('--n', String(Math.round(e)));
    }
  }

  // ---------- tela: torcida ----------
  function mexerTorcida(nivel, quem) {
    torcidaNivel = nivel;
    raiz.classList.toggle('torcida-ferve', nivel >= 2.6);
    const agora = performance.now();
    if (nivel >= 2.6 && agora - ultimaOnda > 2800 && !quem) { som.torcida(clamp((nivel - 2) / 2.4, 0.2, 0.8)); ultimaOnda = agora; }
  }
  function festaDaTorcida(t, ms = 3800) {
    const k = t === 'casa' ? 'casa' : 'vis';
    raiz.classList.add(`festa-${k}`);
    setTimeout(() => raiz.classList.remove(`festa-${k}`), ms);
  }

  // ---------- tela: tarja, faixas, cartão, confete ----------
  let tarjaTimer = null;
  function mostrarTarja(icone, titulo, t, p) {
    const T = times();
    tarja.innerHTML = '';
    tarja.className = 'nf-tarja ' + (t ? (t === 'casa' ? 'casa' : 'vis') : 'neutra');
    tarja.append(...[
      el('span', { class: 'ic', text: icone }),
      el('b', { text: titulo }),
      t ? el('span', { class: 'tm', text: T[t].nome }) : null,
      p != null ? el('span', { class: 'pc mj-num', text: `Jev ${fmt.pct(p)}` }) : null,
    ].filter(Boolean));
    void tarja.offsetWidth; tarja.classList.add('mostra');
    clearTimeout(tarjaTimer); tarjaTimer = setTimeout(() => tarja.classList.remove('mostra'), 2600);
  }
  let faixaTimer = null;
  function mostrarFaixa(tipo, titulo, sub, t, ms = 3200) {
    faixa.innerHTML = '';
    faixa.className = `nf-faixa ${tipo} ${t === 'casa' ? 'casa' : t === 'visitante' ? 'vis' : ''}`;
    const tit = el('div', { class: 'tit' });
    if (tipo === 'gol') ['G', 'O', 'O', 'O', 'O', 'O', 'L'].forEach((c, i) => tit.append(comVars(el('span', { text: c }), { '--i': String(i) })));
    else tit.textContent = titulo;
    faixa.append(el('div', { class: 'pano' }, [tit, sub ? el('div', { class: 'sub', text: sub }) : null]));
    void faixa.offsetWidth; faixa.classList.add('mostra');
    clearTimeout(faixaTimer);
    faixaTimer = setTimeout(() => { faixa.classList.add('sai'); faixa.classList.remove('mostra'); faixaTimer = setTimeout(() => faixa.classList.remove('sai'), 460); }, ms);
  }
  function esconderFaixa() { clearTimeout(faixaTimer); faixa.classList.remove('mostra', 'sai'); }
  function mostrarCartao(cor, t) {
    const T = times();
    cartaoNo.innerHTML = '';
    cartaoNo.className = `nf-cartao ${cor}`;
    cartaoNo.append(el('div', { class: 'papel' }), el('div', { class: 'txt' }, [el('b', { text: cor === 'amarelo' ? 'CARTÃO AMARELO' : 'CARTÃO VERMELHO' }), el('span', { text: T[t].nome })]));
    void cartaoNo.offsetWidth; cartaoNo.classList.add('mostra');
    setTimeout(() => cartaoNo.classList.remove('mostra'), 2400);
    juiz.g.classList.remove('amarelo', 'vermelho'); juiz.g.classList.add(cor);
    setTimeout(() => juiz.g.classList.remove(cor), 2600);
  }
  function soltarConfete(t) {
    if (reduz) return;
    const T = times()[t];
    confete.innerHTML = '';
    const cores = [T.cor, T.cor2, T.camisa, '#facc15', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const c = el('i', {});
      c.style.setProperty('--x', rnd(-1, 1).toFixed(2));
      c.style.setProperty('--r', Math.round(rnd(-540, 540)) + 'deg');
      c.style.setProperty('--d', rnd(1.1, 2.2).toFixed(2) + 's');
      c.style.setProperty('--a', rnd(0, 0.5).toFixed(2) + 's');
      c.style.left = rnd(5, 95).toFixed(1) + '%';
      c.style.background = cores[i % cores.length];
      confete.append(c);
    }
    setTimeout(() => { confete.innerHTML = ''; }, 3200);
  }
  function balancarRede(ladoG) {
    const g = redes[ladoG];
    g.classList.remove('balanca'); void g.getBoundingClientRect(); g.classList.add('balanca');
    setTimeout(() => g.classList.remove('balanca'), 1500);
  }
  function piscarLed(t) {
    const T = times()[t];
    for (const x of ledTxt) x.textContent = `GOOOOL ⚽ ${T.sigla} ⚽ GOOOOL ⚽ ${T.sigla} ⚽ GOOOOL`;
    gLed.classList.add('gol', t === 'casa' ? 'casa' : 'vis');
    setTimeout(() => { gLed.classList.remove('gol', 'casa', 'vis'); for (const x of ledTxt) x.textContent = 'NARRE O JOGO  ·  ⚡ JEV  ·  O LANCE SAI QUANDO VOCÊ FALA  ·  NARRE O JOGO'; }, 4200);
  }
  function levantarBandeira(xLinha) {
    const a = xLinha > W / 2 ? assist[0] : assist[1];
    a.x = clamp(xLinha, a.metade === 'dir' ? W / 2 : 0, a.metade === 'dir' ? W : W / 2);
    a.g.classList.add('levanta');
    impedLinha.setAttribute('x1', xLinha.toFixed(1)); impedLinha.setAttribute('x2', xLinha.toFixed(1));
    impedLinha.classList.remove('mostra'); void impedLinha.getBoundingClientRect(); impedLinha.classList.add('mostra');
    setTimeout(() => { a.g.classList.remove('levanta'); impedLinha.classList.remove('mostra'); }, 3200);
  }
  function apitar(vezes = 1) {
    som.apito();
    for (let i = 1; i < vezes; i++) setTimeout(() => som.apito(), i * 620);
    juiz.g.classList.remove('apita'); void juiz.g.getBoundingClientRect(); juiz.g.classList.add('apita');
    setTimeout(() => juiz.g.classList.remove('apita'), 900);
  }

  // ---------- lance a lance e linha do tempo ----------
  function textoDoLance(l) {
    const T = times(), t = l.time ? T[l.time] : null, o = l.time ? T[outro(l.time)] : null;
    switch (l.tipo) {
      case 'gol': return `GOL ${de(t)}!`;
      case 'chute': return `Chute ${de(t)}`;
      case 'defesa': return `Defesa do goleiro ${de(o)}`;
      case 'fora': return `Pra fora! Chute ${de(t)}`;
      case 'trave': return `Na trave! Chute ${de(t)}`;
      case 'passe': return `Passe ${de(t)}`;
      case 'drible': return `Drible ${de(t)}`;
      case 'cruzamento': return `Cruzamento ${de(t)}`;
      case 'falta': return `Falta ${de(t)}`;
      case 'amarelo': return `Amarelo ${para(t)}`;
      case 'vermelho': return `Vermelho! Expulsão ${no(t)}`;
      case 'escanteio': return `Escanteio ${para(t)}`;
      case 'impedimento': return `Impedimento ${de(t)}`;
      case 'penalti': return `Pênalti ${para(t)}!`;
      case 'substituicao': return `Substituição ${no(t)}${l.extra ? ` (${l.extra})` : ''}`;
      case 'inicio': return l.extra || 'Bola rolando!';
      case 'fim': return l.extra || 'Fim do tempo';
      case 'anulado': return l.extra || 'Lance anulado';
      default: return LANCE[l.tipo] ? LANCE[l.tipo].rotulo : l.tipo;
    }
  }
  function noFeed(l) {
    feedVazio.remove();
    const L = LANCE[l.tipo];
    const grande = L.peso >= 2 || l.tipo === 'gol';
    const li = el('li', { class: `nf-lance p${L.peso} ${l.tipo} ${l.time === 'casa' ? 'casa' : l.time === 'visitante' ? 'vis' : ''}` }, [
      el('span', { class: 'min mj-num', text: `${l.min}'` }),
      el('span', { class: 'ic', text: L.icone }),
      el('div', { class: 'tx' }, [
        el('b', { text: textoDoLance(l) + (l.tipo === 'gol' ? ` ${placar.casa} × ${placar.visitante}` : '') }),
        grande && l.trecho ? el('q', { text: corta(l.trecho, 64) }) : null,
      ]),
    ]);
    l.li = li;
    feed.prepend(li);
    while (feed.children.length > 14) feed.lastChild.remove();
  }
  function naLinha(l) {
    if (!MARCA.has(l.tipo)) return;
    const pos = clamp(l.min / 90, 0, 1) * 100;
    // marcas do mesmo lado que cairiam umas sobre as outras andam um pouco para a direita
    const lado_ = l.time === 'casa' ? 'casa' : 'vis', larg = ltMarcas.getBoundingClientRect().width || 600;
    const perto = [...ltMarcas.children].filter((x) => x.classList.contains(lado_) && Math.abs((+x.dataset.pos - pos) / 100 * larg) < 22).length;
    const m = el('span', { class: `marca ${lado_} ${l.tipo}`, 'data-pos': pos.toFixed(2), style: { left: `calc(${pos.toFixed(1)}% + ${perto * 22}px)` }, title: `${l.min}' ${textoDoLance(l)}`, text: LANCE[l.tipo].icone });
    l.marca = m;
    ltMarcas.append(m);
  }

  // ---------- registrar e animar os lances ----------
  function registrar(tipo, t, p, ctx, extra) {
    const l = { id: ++idLance, tipo, time: t, min: minuto(), slot: ctx.slot, t: performance.now(), anulado: false, trecho: ctx.trecho, p, extra };
    lances.push(l);
    if (lances.length > 80) lances.shift();
    contarEstatistica(l);
    noFeed(l); naLinha(l);
    return l;
  }
  function contarEstatistica(l) {
    if (!l.time) return;
    const e = est[l.time];
    if (l.tipo === 'chute') { e.chutes++; l.contou = true; }
    if (['gol', 'defesa', 'fora', 'trave'].includes(l.tipo)) {
      const ch = lances.slice(-6).find((x) => x !== l && x.tipo === 'chute' && x.time === l.time && l.slot - x.slot <= 2 && !x.resolvido);
      if (ch) ch.resolvido = true; else e.chutes++;
    }
    if (l.tipo === 'escanteio') e.escanteios++;
    if (l.tipo === 'falta') e.faltas++;
    if (l.tipo === 'amarelo' || l.tipo === 'vermelho') {
      if (l.tipo === 'amarelo') e.amarelos++; else e.vermelhos++;
      const falta = lances.slice(-5).some((x) => x !== l && x.tipo === 'falta' && x.time === l.time && l.slot - x.slot <= 2);
      if (!falta) e.faltas++;
    }
  }
  const ultimoGol = () => { for (let i = lances.length - 1; i >= 0; i--) if (lances[i].tipo === 'gol' && !lances[i].anulado) return lances[i]; return null; };

  // o relógio começa no primeiro lance; no intervalo, um lance de jogo já é o 2º tempo
  function comecarSeAindaNao(ctx) {
    if (estado === 'pre') { estado = 'jogo'; modo = 'jogo'; dica.classList.add('some'); desenharTempo(); }
    else if (estado === 'intervalo' && ctx) inicioOuFim('inicio', ctx, null);
  }

  function gol(t, p, ctx) {
    comecarSeAindaNao(ctx);
    placar[t]++;
    const l = registrar('gol', t, p, ctx);
    desenharPlacar();
    const g = golAtacado(t);
    const alvo = { x: g.lado === 'dir' ? W + 15 : -15, y: H / 2 + rnd(-24, 24) };
    voar(alvo, { dur: 360, depois: () => parar(alvo) });
    setTimeout(() => balancarRede(g.lado), 300);
    festa = { time: t, canto: { x: g.lado === 'dir' ? W - 36 : 36, y: bola.y < H / 2 ? 46 : H - 46 } };
    modo = 'festa';
    mostrarFaixa('gol', 'GOL', `${de(times()[t]).toUpperCase()}!  ${placar.casa} × ${placar.visitante}`, t, 3600);
    soltarConfete(t); piscarLed(t); festaDaTorcida(t);
    som.torcida(1); som.aplauso(1); setTimeout(() => som.acerto(), 250);
    raiz.classList.remove('treme'); void raiz.offsetWidth; if (!reduz) raiz.classList.add('treme');
    mostrarTarja('⚽', 'GOL!', t, p);
    // depois da festa, saída de bola para quem levou o gol
    clearTimeout(timerFesta);
    timerFesta = setTimeout(() => {
      if (l.anulado || estado !== 'jogo') return;
      festa = null; modo = 'saida'; saiQuem = outro(t); posse = saiQuem;
      parar({ x: W / 2, y: H / 2 });
      timerDepois = setTimeout(() => { if (modo === 'saida' && estado === 'jogo') modo = 'jogo'; }, 2600);
    }, 4600);
    return l;
  }

  function anular(g, ctx, motivo) {
    g.anulado = true;
    placar[g.time] = Math.max(0, placar[g.time] - 1);
    desenharPlacar(true);
    if (g.li) { g.li.classList.add('cancelado'); g.li.querySelector('b').textContent = `${textoDoLance(g)} — ANULADO`; }
    if (g.marca) g.marca.classList.add('cancelado');
    const txt = semAcento(ctx.trecho || '');
    const porque = /\bvar\b/.test(txt) ? '📺 o VAR anulou' : /imped|bandeir/.test(txt) ? '🚩 impedimento' : /falta/.test(txt) ? '🛑 falta no lance' : 'o juiz anulou';
    const l = registrar('anulado', g.time, motivo, ctx, `Gol anulado: ${porque.replace(/^\S+ /, '')}`);
    l.motivoDito = porque !== 'o juiz anulou';
    ultimaAnulacao = { slot: ctx.slot, t: performance.now() };
    esconderFaixa(); clearTimeout(timerFesta); clearTimeout(timerDepois);
    confete.innerHTML = '';
    setTimeout(() => mostrarFaixa('anulado', 'GOL ANULADO', porque, g.time, 3400), 120);
    apitar(); som.erro(); setTimeout(() => som.torcida(0.35), 350);
    festaDaTorcida(outro(g.time), 2400);
    // a bandeira sobe na linha de impedimento (onde estava o atacante) e a bola vai para a defesa
    const atacante = dir[g.time] > 0 ? W - 165 - rnd(10, 90) : 165 + rnd(10, 90);
    levantarBandeira(atacante);
    festa = null; modo = 'jogo'; posse = outro(g.time);
    const gk = goleiro(posse);
    const tiro = xy(dir[posse], 120, 340 + rnd(-60, 60));
    parar({ x: clamp(bola.x, 20, W - 20), y: clamp(bola.y, 20, H - 20) });
    setTimeout(() => { if (gk) voar(tiro, { dur: 700, depois: () => parar(tiro) }); }, 500);
    mostrarTarja('🚩', 'Gol anulado', g.time, motivo);
    return l;
  }

  // o narrador diz o motivo depois de anular ("…o bandeirinha levantou a bandeira!"): o letreiro e a lista acompanham
  function explicarAnulacao(ctx) {
    const a = [...lances].reverse().find((x) => x.tipo === 'anulado');
    if (!a || a.motivoDito) return;
    const txt = semAcento(ctx.trecho || '');
    const porque = /\bvar\b/.test(txt) ? 'VAR' : /imped|bandeir/.test(txt) ? 'impedimento' : null;
    if (!porque) return;
    a.motivoDito = true; a.extra = `Gol anulado: ${porque}`;
    if (a.li) a.li.querySelector('b').textContent = a.extra;
    levantarBandeira(dir[a.time] > 0 ? W - 200 : 200);
    mostrarTarja(porque === 'VAR' ? '📺' : '🚩', porque === 'VAR' ? 'O VAR anulou' : 'Impedimento', a.time, null);
  }

  // anima o lance já registrado (o placar e a lista já mudaram)
  function animarLance(l, r) {
    const T = times(), t = l.time, d = t ? dir[t] : 1, L = LANCE[l.tipo];
    // a cobrança (pênalti, escanteio) acabou quando sai o desfecho: todo mundo volta a jogar
    if (['chute', 'defesa', 'fora', 'trave', 'passe', 'drible', 'cruzamento'].includes(l.tipo) && (modo === 'penalti' || modo === 'escanteio')) modo = 'jogo';
    switch (l.tipo) {
      case 'passe': case 'drible': case 'cruzamento': {
        posse = t || posse; modo = 'jogo';
        const z = r.zona && r.zona.choice && r.zona.choice !== 'mesma' && conf(r.zona) >= LIM.zona ? r.zona.choice : null;
        const alvo = z ? pontoNaZona(z, posse) : (() => { const u = clamp((d > 0 ? bola.x : W - bola.x) + rnd(140, 240), 120, 980); return xy(d, u, clamp((d > 0 ? bola.y : H - bola.y) + rnd(-90, 90), 60, 620)); })();
        if (l.tipo === 'cruzamento') { const a = xy(dir[posse], rnd(895, 965), rnd(270, 410)); passar(posse, a, { alto: 1 }); }
        else if (l.tipo === 'passe') passar(posse, alvo, { alto: dist(bola, alvo) > 380 ? 0.7 : 0 });
        else { const c = maisPerto(posse, bola); if (c) { conduzir(c, alvo); c.corre = performance.now() + 1200; const m = maisPerto(outro(posse), bola); if (m && !reduz) { m.g.classList.remove('caiu'); void m.g.getBoundingClientRect(); m.g.classList.add('caiu'); setTimeout(() => m.g.classList.remove('caiu'), 900); } } }
        mostrarTarja(L.icone, L.rotulo, t, l.p);
        break;
      }
      case 'chute': {
        posse = t; modo = 'jogo';
        const g = golAtacado(t);
        const alvo = { x: g.lado === 'dir' ? W - 18 : 18, y: H / 2 + rnd(-30, 30) };
        voar(alvo, { dur: 420, curva: rnd(-40, 40), depois: () => parar(alvo) });
        som.whoosh();
        mostrarTarja(L.icone, 'Chutou!', t, l.p);
        break;
      }
      case 'defesa': {
        const gk = goleiro(outro(t)); const g = golAtacado(t);
        const pt = { x: g.lado === 'dir' ? W - 22 : 22, y: H / 2 + rnd(-34, 34) };
        if (gk) { bola.mergulho = { g: gk, x: pt.x, y: pt.y, ate: performance.now() + 700 }; gk.g.classList.remove('mergulha'); void gk.g.getBoundingClientRect(); if (!reduz) gk.g.classList.add('mergulha'); setTimeout(() => gk.g.classList.remove('mergulha'), 900); }
        voar(pt, { dur: 300, depois: () => {
          const segurou = /segur|peg|encaix|abra/.test(semAcento(l.trecho || ''));
          if (segurou && gk) { posse = outro(t); conduzir(gk, xy(dir[posse], 70, 340)); }
          else { const sobra = xy(dir[t], rnd(930, 1000), Math.random() < 0.5 ? rnd(120, 230) : rnd(450, 560)); voar(sobra, { dur: 420, depois: () => parar(sobra) }); }
        } });
        som.aplauso(0.6);
        mostrarTarja('🧤', 'Que defesa!', outro(t), l.p);
        break;
      }
      case 'fora': {
        const g = golAtacado(t);
        const yPost = Math.random() < 0.5 ? 303.4 - rnd(14, 40) : 376.6 + rnd(14, 40);
        const alvo = { x: g.lado === 'dir' ? W + 30 : -30, y: yPost };
        voar(alvo, { dur: 520, curva: rnd(-20, 20), depois: () => {
          parar(alvo);
          setTimeout(() => { if (estado !== 'jogo') return; posse = outro(t); const tiro = xy(dir[posse], 55, rnd(290, 390)); parar(tiro); modo = 'jogo'; }, 1100);
        } });
        som.torcida(0.4);
        mostrarTarja('😩', 'Pra fora!', t, l.p);
        break;
      }
      case 'trave': {
        const g = golAtacado(t);
        const yPost = Math.random() < 0.5 ? 303.4 : 376.6;
        const alvo = { x: g.lado === 'dir' ? W - 2 : 2, y: yPost };
        voar(alvo, { dur: 380, depois: () => { som.ding(); const vol = xy(dir[t], rnd(840, 930), rnd(220, 460)); voar(vol, { dur: 520, depois: () => parar(vol) }); redes[g.lado].classList.add('poste-brilha'); setTimeout(() => redes[g.lado].classList.remove('poste-brilha'), 900); } });
        som.torcida(0.55);
        mostrarFaixa('trave', 'NA TRAVE!', `chute ${de(T[t])}`, t, 2200);
        break;
      }
      case 'falta': case 'amarelo': case 'vermelho': {
        apitar();
        posse = outro(t); modo = 'jogo';
        parar({ x: clamp(bola.x, 20, W - 20), y: clamp(bola.y, 20, H - 20) });
        juiz.alvo = { x: clamp(bola.x - 40, 20, W - 20), y: clamp(bola.y + 50, 20, H - 20), ate: performance.now() + 2600 };
        // spray do juiz quando a falta é perto da área
        const ub = dir[posse] > 0 ? bola.x : W - bola.x;
        if (ub > 680) {
          const gx = dir[posse] > 0 ? W : 0, ang = Math.atan2(H / 2 - bola.y, gx - bola.x);
          const cx = bola.x + Math.cos(ang) * 91.5, cy = bola.y + Math.sin(ang) * 91.5, nx = -Math.sin(ang) * 70, ny = Math.cos(ang) * 70;
          spray.setAttribute('d', `M${(cx - nx).toFixed(1)} ${(cy - ny).toFixed(1)} L${(cx + nx).toFixed(1)} ${(cy + ny).toFixed(1)}`);
          spray.classList.remove('mostra'); void spray.getBoundingClientRect(); spray.classList.add('mostra');
          setTimeout(() => spray.classList.remove('mostra'), 4200);
        }
        if (l.tipo === 'falta') mostrarTarja('🛑', 'Falta', t, l.p);
        else {
          mostrarCartao(l.tipo, t);
          desenharPlacar();
          if (l.tipo === 'vermelho') {
            const vitima = ativos(t).filter((p) => p.papel !== 'gk').sort((a, b) => dist(a, bola) - dist(b, bola))[0];
            if (vitima) { vitima.fora = true; vitima.g.classList.add('expulso'); }
          }
          mostrarTarja(l.tipo === 'amarelo' ? '🟨' : '🟥', l.tipo === 'amarelo' ? 'Cartão amarelo' : 'Cartão vermelho', t, l.p);
        }
        break;
      }
      case 'escanteio': {
        posse = t;
        const lateral = r.zona && /dir/.test(r.zona.choice || '') ? 'dir' : r.zona && /esq/.test(r.zona.choice || '') ? 'esq' : (bola.y < H / 2 ? 'cima' : 'baixo');
        let y = lateral === 'cima' ? 6 : lateral === 'baixo' ? H - 6 : null;
        if (y == null) { const pt = xy(dir[t], W, lateral === 'esq' ? 0 : H); y = pt.y < H / 2 ? 6 : H - 6; }
        const x = dir[t] > 0 ? W - 6 : 6;
        voar({ x, y }, { dur: 700, depois: () => parar({ x, y }) });
        modo = 'escanteio';
        const ck = (x > W / 2 ? (y < H / 2 ? 'ne' : 'se') : (y < H / 2 ? 'no' : 'so'));
        cantos[ck].classList.add('agita'); setTimeout(() => cantos[ck].classList.remove('agita'), 3000);
        mostrarTarja('⛳', 'Escanteio', t, l.p);
        clearTimeout(timerDepois); timerDepois = setTimeout(() => { if (modo === 'escanteio') modo = 'jogo'; }, 6000);
        break;
      }
      case 'impedimento': {
        apitar();
        const xl = clamp(bola.x + 30 * d, 40, W - 40);
        levantarBandeira(xl);
        posse = outro(t); modo = 'jogo';
        parar({ x: clamp(bola.x, 20, W - 20), y: clamp(bola.y, 20, H - 20) });
        mostrarTarja('🚩', 'Impedimento', t, l.p);
        break;
      }
      case 'penalti': {
        apitar();
        posse = t;
        const marcaP = dir[t] > 0 ? { x: W - 110, y: H / 2 } : { x: 110, y: H / 2 };
        voar(marcaP, { dur: 650, depois: () => parar(marcaP) });
        modo = 'penalti';
        mostrarFaixa('penalti', 'PÊNALTI!', para(T[t]), t, 2600);
        som.torcida(0.7);
        clearTimeout(timerDepois); timerDepois = setTimeout(() => { if (modo === 'penalti') modo = 'jogo'; }, 9000);
        break;
      }
      case 'substituicao': {
        const txt = semAcento(l.trecho || '');
        const sai = (txt.match(/sai\s+(?:o\s+)?(?:camisa\s+)?(\d{1,2})/) || [])[1], entra = (txt.match(/entra\s+(?:o\s+)?(?:camisa\s+)?(\d{1,2})/) || [])[1];
        if (sai && entra) {
          const p = elenco[t].find((x) => String(x.num) === sai) || ativos(t).find((x) => x.papel !== 'gk');
          if (p) { p.num = +entra; p.numero.textContent = entra; p.g.classList.remove('entrou'); void p.g.getBoundingClientRect(); p.g.classList.add('entrou'); }
        }
        mostrarFaixa('troca', 'SUBSTITUIÇÃO', `${T[t].nome}${sai && entra ? ` · sai o ${sai}, entra o ${entra}` : ''}`, t, 2600);
        break;
      }
    }
  }

  function inicioOuFim(tipo, ctx, p) {
    const txt = semAcento(ctx.trecho || '');
    if (tipo === 'inicio') {
      if (estado === 'fim') { novoJogo(par, { manterBarra: true }); }
      if (estado === 'intervalo') {
        tempo = 2; seg = Math.max(seg, 45 * 60); dir = { casa: -1, visitante: 1 };
        estatNo.classList.remove('mostra'); saiQuem = 'visitante'; posse = saiQuem;
        estado = 'jogo'; modo = 'saida'; parar({ x: W / 2, y: H / 2 });
        desenharTempo(); apitar();
        registrar('inicio', null, p, ctx, 'Começa o 2º tempo!');
        mostrarFaixa('inicio', '2º TEMPO', 'bola rolando', null, 2000);
        clearTimeout(timerDepois); timerDepois = setTimeout(() => { if (modo === 'saida') modo = 'jogo'; }, 1800);
        return;
      }
      if (estado === 'pre') {
        estado = 'jogo'; dica.classList.add('some'); desenharTempo(); apitar();
        posse = posse || 'casa'; saiQuem = posse; modo = 'saida'; parar({ x: W / 2, y: H / 2 });
        registrar('inicio', null, p, ctx, 'Bola rolando!');
        mostrarTarja('📣', 'Bola rolando!', null, p);
        clearTimeout(timerDepois); timerDepois = setTimeout(() => { if (modo === 'saida') modo = 'jogo'; }, 1200);
        return;
      }
      // "recomeça o jogo" com a bola já rolando: é a saída de bola
      if (modo === 'saida' || modo === 'festa') { modo = 'jogo'; festa = null; }
      return;
    }
    // fim: intervalo no 1º tempo (a não ser que ele diga "fim de jogo"), fim de jogo no 2º
    if (estado === 'pre' || estado === 'intervalo' || estado === 'fim') return;
    const fimDeJogo = tempo === 2 || /fim de (jogo|papo|partida)|acabou o jogo|termina a partida|apita o final|final de jogo/.test(txt);
    estado = fimDeJogo ? 'fim' : 'intervalo';
    desenharTempo(); apitar(3);
    registrar('fim', null, p, ctx, fimDeJogo ? 'Fim de jogo!' : 'Fim do 1º tempo');
    modo = 'parado'; festa = null; parar({ x: W / 2, y: H / 2 }); posse = null;
    mostrarFaixa('fim', fimDeJogo ? 'FIM DE JOGO' : 'INTERVALO', `${times().casa.sigla} ${placar.casa} × ${placar.visitante} ${times().visitante.sigla}`, null, 2600);
    setTimeout(() => mostrarEstatisticas(fimDeJogo), 2300);
  }

  function mostrarEstatisticas(fimDeJogo) {
    const T = times();
    const tot = est.casa.posseS + est.visitante.posseS;
    const pc = tot > 0 ? est.casa.posseS / tot : 0.5;
    const linhaE = (rot, a, b, fmtV = (x) => String(x)) => {
      const ta = a + b || 1;
      return el('div', { class: 'ln' }, [
        el('b', { class: 'mj-num', text: fmtV(a, 'a') }), el('span', { class: 'rot', text: rot }), el('b', { class: 'mj-num', text: fmtV(b, 'b') }),
        el('div', { class: 'br' }, [el('i', { class: 'casa', style: { width: ((a / ta) * 100).toFixed(1) + '%' } }), el('i', { class: 'vis', style: { width: ((b / ta) * 100).toFixed(1) + '%' } })]),
      ]);
    };
    estatNo.innerHTML = '';
    const fechar = el('button', { class: 'nf-bt fecha', type: 'button', onclick: () => { estatNo.classList.remove('mostra'); if (estado === 'fim') { textoDica(true); dica.classList.remove('some'); } } }, [fimDeJogo ? 'Fechar' : 'Narrar o 2º tempo →']);
    estatNo.append(el('div', { class: 'cx' }, [
      el('p', { class: 'tt', text: fimDeJogo ? 'FIM DE JOGO' : 'FIM DO 1º TEMPO' }),
      el('div', { class: 'pl' }, [el('span', { class: 'n casa', text: T.casa.nome }), el('b', { class: 'mj-num', text: `${placar.casa} × ${placar.visitante}` }), el('span', { class: 'n vis', text: T.visitante.nome })]),
      linhaE('Posse de bola', Math.round(pc * 100), 100 - Math.round(pc * 100), (x) => x + '%'),
      linhaE('Finalizações', est.casa.chutes, est.visitante.chutes),
      linhaE('Escanteios', est.casa.escanteios, est.visitante.escanteios),
      linhaE('Faltas', est.casa.faltas, est.visitante.faltas),
      linhaE('Cartões', est.casa.amarelos + est.casa.vermelhos, est.visitante.amarelos + est.visitante.vermelhos),
      fechar,
    ]));
    estatNo.classList.add('mostra');
  }

  // ---------- conversa com o Jev ----------
  function montarDados(trecho, slot) {
    return {
      par: par.id, placar: [placar.casa, placar.visitante], minuto: minuto(), tempo,
      posse: festa ? festa.time : posse,
      antes: frases.slice(Math.max(0, slot - 3), slot),
      trecho: corta(trecho, 330),
      lances: lances.slice(-8).map((l) => ({ tipo: l.tipo, time: l.time, min: l.min, atras: Math.max(0, slot - l.slot), anulado: !!l.anulado })),
    };
  }

  async function chamar(origem, trecho, slot) {
    const minha = partida;
    const v = ++versaoEnviada, enviado = performance.now();
    const dados = montarDados(trecho, slot);
    emVoo++;
    let r = null;
    try {
      r = origem === 'pausa'
        ? await perguntarPausa('lance', dados, `pausa: "${corta(trecho, 34)}"`)
        : await api.jev('lance', dados, `frase: "${corta(trecho, 34)}"`);
    } catch { r = null; } finally { emVoo--; }
    if (!r || minha !== partida) return;
    aplicar(r, { origem, slot, v, trecho, enviado });
  }

  function aoPausar(texto, { parcial }) {
    if (!parcial || palavras(parcial) < 2) return;   // a frase acabou de fechar: quem cuida é a fila
    if (emVoo >= 3) return;                          // rede lenta: não empilha
    chamar('pausa', parcial, frases.length);
  }
  function aoFechar(frase) {
    const f = String(frase || '').trim();
    if (!f) return;
    const slot = frases.length; frases.push(f);
    if (palavras(f) < 1) return;
    naFila++;
    const minha = partida;
    fila = fila.then(async () => { try { if (minha === partida) await chamar('frase', f, slot); } catch { /* segue */ } finally { naFila--; } });
  }

  // decide o que a resposta muda; o placar só muda aqui
  function aplicar(r, ctx) {
    const visual = ctx.v >= versaoAplicada;
    if (visual) versaoAplicada = ctx.v;
    if (estado !== 'pre') dica.classList.add('some');
    const agora = performance.now();
    const pg = r.gol ? r.gol.noul : 0, pa = r.anulou ? r.anulou.noul : 0;
    const ev = r.evento, evId = ev && ev.choice, evP = conf(ev);
    const ug = ultimoGol();
    // só o gol mais recente pode ser anulado, até 3 frases depois; a chamada precisa ter visto o gol (ou ser a frase
    // inteira em que ele foi gritado: "gol… não, não, impedimento!")
    const ultimoQualquer = (() => { for (let i = lances.length - 1; i >= 0; i--) if (lances[i].tipo === 'gol') return lances[i]; return null; })();
    const recente = ug && ug === ultimoQualquer && ctx.slot >= ug.slot && ctx.slot - ug.slot <= 3 && agora - ug.t < 45000 && (ctx.enviado > ug.t || (ctx.origem === 'frase' && ctx.slot === ug.slot));
    // na pausa (frase aberta) um "não" solto é pouca pista: medido 0,37–0,61; "não, não" já passa de 0,68
    const pausa = ctx.origem === 'pausa';
    const limAnula = pausa ? Math.max(LIM.anulou, 0.66) : LIM.anulou;
    const sinalAnula = (!pausa || palavras(ctx.trecho) >= 2) && (pa >= limAnula || (evId === 'anulado' && evP >= (pausa ? 0.75 : 0.6)) || (evId === 'impedimento' && evP >= 0.75));
    const posseAntes = festa ? festa.time : posse;
    let lance = null;

    // 1) anulação do gol que acabou de sair
    if (estado === 'fim' && evId !== 'inicio') {
      // jogo encerrado: nada mexe no placar até "começa o jogo" ou "Novo jogo"
    } else if (recente && sinalAnula) {
      lance = anular(ug, ctx, Math.max(pa, evId === 'anulado' ? evP : 0));
    } else if (pg >= LIM.gol && pa < LIM.anulou) {
      // 2) gol: nunca dois na mesma frase; e, em menos de 10 s, só se houve uma jogada nova depois do último gol
      const t = timeDoLance('gol', r, posseAntes);
      const jogadaNova = ug && lances.some((x) => x.t > ug.t && JOGADA_NOVA.has(x.tipo));
      if (!(ug && (ug.slot === ctx.slot || (agora - ug.t < 10000 && !jogadaNova)))) lance = gol(t, pg, ctx);
    } else if (evId && !['nada_novo', 'gol', 'anulado'].includes(evId)) {
      // 3) os outros lances, com o limiar e sem repetir na mesma frase
      const L = LANCE[evId];
      let lim = LIM.lance;
      if (ctx.origem === 'pausa' && L.peso >= 2) lim = Math.max(lim, 0.8);
      const ultimoL = lances[lances.length - 1];
      const velhaDemais = ctx.v < versaoDoUltimoLance && (L.peso === 0 || evId === 'chute');
      const repetido = lances.some((x) => x.slot === ctx.slot && x.tipo === evId) ||
        (evId === 'chute' && ultimoL && ultimoL.tipo === 'chute' && ctx.slot - ultimoL.slot <= 1 && ultimoL.time === timeDoLance('chute', r, posseAntes));
      const ecoDaAnulacao = ultimaAnulacao && ['impedimento'].includes(evId) && ctx.slot - ultimaAnulacao.slot <= 2;

      const cartaoRepetido = ['amarelo', 'vermelho'].includes(evId) && lances.some((x) => x.tipo === evId && agora - x.t < 7000);
      if (evP >= lim && !repetido && !ecoDaAnulacao && !cartaoRepetido && !velhaDemais) {
        if (evId === 'inicio' || evId === 'fim') {
          if (!(evId === 'fim' && lances.some((x) => x.tipo === 'fim' && agora - x.t < 20000))) inicioOuFim(evId, ctx, evP);
        } else {
          comecarSeAindaNao(ctx);
          const t = timeDoLance(evId, r, posseAntes);
          lance = registrar(evId, t, evP, ctx);
          if (estado === 'jogo' && modo !== 'festa') animarLance(lance, r);
          else if (estado === 'jogo' && ['amarelo', 'vermelho', 'substituicao'].includes(evId)) animarLance(lance, r);
        }
      }
    } else if (evId === 'anulado' && ctx.origem === 'frase' && evP >= 0.7 && !lances.some((x) => x.slot === ctx.slot && x.tipo === 'anulado')) {
      // "gol… não, impedimento" numa frase só, sem gol registrado: o placar não muda, mas a tela mostra
      comecarSeAindaNao(ctx);
      const t = timeDoLance('anulado', r, posseAntes);
      registrar('anulado', t, evP, ctx, 'Lance anulado');
      levantarBandeira(clamp(bola.x, 60, W - 60)); apitar();
      mostrarTarja('🚩', 'Lance anulado', t, evP);
    }

    if (lance) versaoDoUltimoLance = Math.max(versaoDoUltimoLance, ctx.v);
    // logo depois de anular, o narrador costuma dizer o motivo ("o bandeirinha deu impedimento", "o VAR…")
    if (ultimaAnulacao && ctx.slot - ultimaAnulacao.slot <= 2 && (!lance || lance.tipo !== 'anulado')) explicarAnulacao(ctx);

    // o que o Jev leu (sempre da resposta mais nova) e a torcida
    if (visual) {
      const comum = evId && !['nada_novo', 'gol', 'anulado'].includes(evId) && LANCE[evId] && evP >= 0.5;
      const visto = lance ? { icone: LANCE[lance.tipo].icone, rotulo: LANCE[lance.tipo].rotulo, p: lance.p } : comum ? { icone: LANCE[evId].icone, rotulo: LANCE[evId].rotulo, p: evP } : { icone: '🎙️', rotulo: 'Narração', p: null };
      mostrarLeitura(r, visto);
      if (r.emocao) mexerTorcida(lance && lance.tipo === 'gol' ? 4 : clamp(r.emocao.score ?? 0, 0, 4), lance && lance.tipo === 'gol');
    }
    // sem lance novo (ou lance miúdo já animado): a bola vai para a zona lida e a posse acompanha
    if (visual && !lance && estado === 'jogo' && (modo === 'jogo' || modo === 'escanteio' || modo === 'penalti')) moverPelaLeitura(r);
  }

  function timeDoLance(tipo, r, posseAntes) {
    const tm = r.time;
    if (tm && tm.choice && tm.choice !== 'nenhum' && conf(tm) >= 0.5) return tm.choice;
    const pz = r.posse && r.posse.choice !== 'indefinido' && conf(r.posse) >= 0.5 ? r.posse.choice : null;
    const base = posseAntes || pz || 'casa';
    return ['falta', 'amarelo', 'vermelho'].includes(tipo) ? outro(base) : base;
  }

  function moverPelaLeitura(r) {
    const p = r.posse, z = r.zona;
    let nova = p && p.choice !== 'indefinido' && conf(p) >= LIM.posse ? p.choice : null;
    if (nova && nova !== posse) {
      posse = nova;
      const c = maisPerto(posse, bola);
      if (c && bola.modo !== 'voo') conduzir(c, { x: bola.x + 60 * dir[posse], y: bola.y });
      if (modo !== 'jogo') modo = 'jogo';
    }
    if (!posse) posse = nova || 'casa';
    if (z && z.choice && z.choice !== 'mesma' && conf(z) >= LIM.zona) {
      const alvo = pontoNaZona(z.choice, posse);
      if (modo === 'escanteio' || modo === 'penalti') { const era = modo; if (dist(bola, alvo) > 140) { modo = 'jogo'; passar(posse, alvo, { alto: era === 'escanteio' ? 1 : 0 }); } return; }
      if (bola.modo === 'voo') return;
      if (dist(bola, alvo) < 90) return;
      const c = bola.modo === 'conduzida' && bola.carregador && ladoDe(bola.carregador) === posse ? bola.carregador : maisPerto(posse, bola);
      if (!c) return;
      if (dist(bola, alvo) > 330) passar(posse, alvo, { alto: 0.5 });
      else conduzir(c, alvo);
    }
  }

  // ---------- partida nova ----------
  function novoJogo(p, { manterBarra = false } = {}) {
    partida++;
    if (p) par = p;
    clearTimeout(timerFesta); clearTimeout(timerDepois);
    estado = 'pre'; tempo = 1; seg = 0; placar = { casa: 0, visitante: 0 }; dir = { casa: 1, visitante: -1 };
    posse = null; frases = []; lances = []; est = zerarEst(); festa = null; ultimaAnulacao = null; saiQuem = 'casa';
    fila = Promise.resolve(); naFila = 0;
    for (const t of LADOS) elenco[t].forEach((x, i) => { x.fora = false; x.num = FORMACAO[i][0]; x.numero.textContent = String(x.num); x.g.classList.remove('expulso', 'entrou', 'caiu', 'mergulha'); });
    modo = 'saida';
    Object.assign(bola, { x: W / 2, y: H / 2, z: 0, modo: 'parada', carregador: null, receptor: null, mergulho: null, depois: null });
    trilha.length = 0;
    posicionarDeUmaVez();
    aplicarCores();
    feed.innerHTML = ''; feed.append(feedVazio); ltMarcas.innerHTML = '';
    plCasa.textContent = '0'; plVis.textContent = '0';
    desenharPlacar(); desenharRelogio(); desenharTempo();
    esconderFaixa(); estatNo.classList.remove('mostra'); cartaoNo.classList.remove('mostra'); tarja.classList.remove('mostra'); confete.innerHTML = '';
    textoDica(false); dica.classList.remove('some');
    leuLance.querySelector('.ic').textContent = '🎙️'; leuLance.querySelector('b').textContent = 'Esperando a narração'; leuLance.querySelector('.pc').textContent = '';
    leuZona.textContent = '—'; leuZonaPc.textContent = ''; leuPosseCasa.style.width = '50%'; leuPosseVis.style.width = '50%'; leuPosseTx.textContent = '';
    for (const r_ of Object.values(calor)) r_.style.setProperty('--p', '0');
    mexerTorcida(0, true);
    if (!barra || (barra.par !== par.id && !manterBarra)) criarBarra(); else barra.limpar();
  }

  function escolherClassico() {
    const lista = el('div', { class: 'nf-classicos' });
    let caixa = null;
    for (const p of PARES) {
      lista.append(comVars(el('button', { class: 'nf-opcao' + (p === par ? ' atual' : ''), type: 'button', onclick: () => { caixa && caixa.fechar(); novoJogo(p); } }, [
        el('span', { class: 'lados' }, [comVars(el('i', { class: 'esc' }), { '--a': p.casa.camisa, '--b': p.casa.cor }), comVars(el('i', { class: 'esc' }), { '--a': p.visitante.camisa, '--b': p.visitante.cor2 })]),
        el('b', { text: `${p.casa.nome} × ${p.visitante.nome}` }),
        el('span', { class: 'est', text: p.estadio }),
      ]), { '--c1': p.casa.cor, '--c2': p.visitante.cor }));
    }
    caixa = ui.modal('Escolha o clássico', el('div', {}, [el('p', { class: 'nf-modal-dica', text: 'Times inventados, com as cores na tela. Trocar começa um jogo novo.' }), lista]));
  }

  // ---------- a barra de voz (refeita a cada clássico, com os nomes dos times nos exemplos) ----------
  let barra = null;
  function criarBarra() {
    const T = times();
    const nova = api.voz.barraVoz({
      exemplos: [
        { rotulo: '⚽ Gol', texto: `Lá vai ele pela esquerda, passou por um, passou por dois… bateu cruzado… GOOOOL! É ${de(T.casa)}!` },
        { rotulo: '🚩 Gol anulado', texto: `Lançamento para o camisa 9, ele dominou na cara do goleiro… bateu! GOOOOL! Não, não, não! O bandeirinha deu impedimento!` },
        { rotulo: '🟨 Cartão', texto: `Entrada dura no meio de campo! O juiz tá mostrando o amarelo para o zagueiro ${de(T.visitante)}.` },
        { rotulo: '🧤 Defesaça', texto: `Contra-ataque ${de(T.visitante)} pela direita, cruzou na área, cabeceou… que defesa do goleiro! Escanteio.` },
        { rotulo: '🥅 Na trave', texto: 'Soltou a bomba de fora da área… NA TRAVE! Por pouco!' },
        { rotulo: '❗ Pênalti', texto: `Invadiu a área, derrubaram ele! Pênalti ${para(T.casa)}!` },
        { rotulo: '⏱️ Intervalo', texto: 'Apita o árbitro: fim do primeiro tempo!' },
      ],
      dica: 'Aperte o microfone e narre: o lance sai quando você fala',
      placeholder: 'Ou digite um lance e aperte Enter',
      rotuloExemplos: 'Lances',
      onPausa: aoPausar,
      onFrase: aoFechar,
    });
    if (barra) { barra.parar(); barra.no.replaceWith(nova.no); } else vozBox.append(nova.no);
    barra = nova; barra.par = par.id;
  }

  novoJogo(PARES[0]);
  requestAnimationFrame((t) => { ultimoQuadro = t; quadroDaAnimacao(t); });

  // ---------- demonstração ----------
  async function esperarJev(sinal) {
    await sleep(160, sinal);
    for (let i = 0; i < 50 && (emVoo > 0 || naFila > 0); i++) await sleep(90, sinal);
  }
  async function tocar(sinal) {
    novoJogo(PARES[0]);
    await sleep(900, sinal);
    for (const f of ROTEIRO) {
      await barra.simular(f, { sinal, velocidade: 1.15 });
      await esperarJev(sinal);
      await sleep(/GOO|anul|Impedimento!/i.test(f) ? 1400 : 420, sinal);
    }
    await sleep(3200, sinal);
  }

  return { tocar };
}

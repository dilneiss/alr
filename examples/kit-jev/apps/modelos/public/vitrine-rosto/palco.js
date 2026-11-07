// Tela da "A Vitrine que Lê o Seu Rosto": a loja em cima (loja.js) e, embaixo, o painel "O que a vitrine percebeu":
// a câmera com a malha do rosto, os 8 números, as palavras que vão para o Jev e a leitura dele.
// A cada ~1,5 s (ou na hora, num sinal forte), se os sinais mudaram, vai UMA chamada (jogada "ler") com 3 decisões:
// o que a pessoa sente, que módulo mostrar e se vale interromper. A vitrine só muda quando vale.
import { criarCamera, criarSimulador, criarLeitor, desenharRosto, medidasDe, NEUTRO, SINAIS } from './rosto.js';
import { criarLoja, AREAS, AREAS_CURTAS } from './loja.js';

// expressões simuladas (botões e demonstração): o rosto simulado passa pelo MESMO leitor da câmera
const EXPRESSOES = [
  { id: 'gostei', rotulo: 'Gostei', img: 'smiling_face_with_smiling_eyes', expr: { sorriso: 0.95, escala: 1.06 }, aceno: 'sim', area: 'fotos' },
  { id: 'caro', rotulo: 'Achei caro', img: 'face_with_raised_eyebrow', expr: { testa: 0.95, boca: 0.85 }, aceno: 'nao', area: 'preco' },
  { id: 'tedio', rotulo: 'Sem interesse', img: 'sleeping_face', expr: { jaw: 0.95, olhos: 0.62, escala: 0.8, pitch: 6 }, area: 'longe' },
  { id: 'distraido', rotulo: 'Distraído', img: 'eyes', expr: { yaw: 42, olharX: 1 }, area: 'longe' },
];

// a demonstração do ▶: uma linha do tempo de sinais simulados (marcada "simulação")
const ROTEIRO = [
  { ms: 3000, legenda: 'Olhando as fotos, sem expressão', expr: {}, area: 'fotos' },
  { ms: 4300, legenda: 'Sorrindo para as fotos', img: 'smiling_face_with_smiling_eyes', expr: { sorriso: 0.92 }, area: 'fotos' },
  { ms: 1300, legenda: 'Indo ver o preço…', expr: {}, area: 'preco' },
  { ms: 4300, legenda: 'Franzindo a testa no preço', img: 'face_with_raised_eyebrow', expr: { testa: 0.95, boca: 0.8 }, area: 'preco' },
  { ms: 4200, legenda: 'Balançando a cabeça: "não"', img: 'grimacing_face', expr: { testa: 0.9, boca: 0.5 }, aceno: 'nao', area: 'preco' },
  { ms: 4600, legenda: 'Comparando com o Lite, cabeça inclinada', img: 'thinking_face', expr: { roll: 17, boca: 0.75 }, areas: ['fotos', 'mod-mais_barata', 'fotos', 'mod-mais_barata', 'fotos'] },
  { ms: 4200, legenda: 'Olhando para o lado (distraído)', img: 'eyes', expr: { yaw: 44, olharX: 1 }, area: 'fotos' },
  { ms: 4400, legenda: 'Bocejando e se afastando', img: 'yawning_face', expr: { jaw: 0.95, olhos: 0.6, escala: 0.8, pitch: 6 }, area: 'longe' },
  { ms: 3600, legenda: 'Surpresa com o vídeo', img: 'face_with_open_mouth', expr: { sobr: 0.95, jaw: 0.55, arreg: 0.85 }, area: 'mod-video' },
  { ms: 4800, legenda: 'Chegando perto, sorrindo e dizendo "sim"', img: 'smiling_face_with_heart-eyes', expr: { sorriso: 0.95, escala: 1.24 }, aceno: 'sim', area: 'comprar' },
];

const balde = (s) => String(s).replace(/há (\d+) s/g, (_, n) => { n = +n; return 'há ' + (n <= 3 ? n : n <= 5 ? 4 : n <= 8 ? 6 : 9) + ' s'; });

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep, toast } = ui;
  const SENT = Object.fromEntries(spec.sentimentos.map((s) => [s.id, s]));
  const MODS = Object.fromEntries([...spec.modulos, spec.nada].map((m) => [m.id, m]));
  const limiarInterromper = spec.decisoes.find((d) => d.id === 'interromper').limiar;
  const img = (nome, cls = '', alt = '') => el('img', { class: cls, src: api.url(`assets/${nome}_3d.png`), alt, draggable: 'false' });
  const perguntar = api.ultima();
  const agora = () => performance.now();

  // ---------- a loja ----------
  const loja = criarLoja({ ui, url: api.url, som, spec, aoLimpar: () => { ultimaMudanca = null; ultimaChave = ''; } });

  // ---------- o painel "O que a vitrine percebeu" ----------
  const video = el('video', { class: 'vr-cam-video', muted: true, playsinline: true, autoplay: true, 'aria-hidden': 'true' });
  const cvTeste = el('canvas', { class: 'vr-cam-teste', 'aria-hidden': 'true' });
  const cvMalha = el('canvas', { class: 'vr-cam-malha', 'aria-hidden': 'true' });
  const status = el('span', { class: 'vr-cam-status', text: 'Câmera desligada' });
  const btLigar = el('button', { class: 'vr-cam-ligar', type: 'button', onclick: () => ligarCamera() }, [img('camera', 'vr-cam-ligar-ic'), el('span', { text: 'Ligar a câmera' })]);
  const btDesligar = el('button', { class: 'vr-cam-mini', type: 'button', 'aria-label': 'Desligar a câmera', title: 'Desligar a câmera', onclick: () => desligarCamera() }, ['✕']);
  const btRecal = el('button', { class: 'vr-cam-mini', type: 'button', 'aria-label': 'Calibrar de novo (fique com o rosto natural)', title: 'Calibrar de novo: fique com o rosto natural por 1 s', onclick: () => { leitor.recalibrar(); mostrarStatus(); } }, ['⟲']);
  const btsExpr = EXPRESSOES.map((x) => el('button', { class: 'vr-expr', type: 'button', 'data-rotulo': x.rotulo, 'aria-label': `Simular expressão: ${x.rotulo.toLowerCase()}`, title: `Simular: ${x.rotulo.toLowerCase()}`, onclick: () => simularExpressao(x) }, [img(x.img, 'vr-expr-ic')]));
  const legenda = el('div', { class: 'vr-cam-legenda', 'aria-live': 'polite' }, [el('span', { class: 'vr-leg-ic' }), el('span', { class: 'vr-leg-tx' }), el('i', { class: 'vr-leg-barra' })]);
  const erroCam = el('p', { class: 'vr-cam-erro', role: 'alert' });
  const caixa = el('div', { class: 'vr-cam-caixa desligada' }, [
    el('div', { class: 'vr-cam-espelho' }, [video, cvTeste, cvMalha]),
    status, el('div', { class: 'vr-cam-acoes' }, [btRecal, btDesligar]), btLigar, erroCam, legenda,
    el('div', { class: 'vr-exprs', role: 'group', 'aria-label': 'Sem câmera? Simule uma expressão' }, [el('span', { class: 'vr-exprs-t', text: 'ou simule:' }), ...btsExpr]),
  ]);
  const cam = el('div', { class: 'vr-sec vr-cam' }, [caixa]);

  const barras = {};
  const listaBarras = el('div', { class: 'vr-barras' }, SINAIS.map((s) => {
    const fil = el('i', { class: 'fil' });
    const b = el('div', { class: 'vr-barra' + (s.centro ? ' centro' : '') }, [el('span', { class: 'nm', text: s.rotulo }), el('span', { class: 'trk' }, [fil])]);
    barras[s.id] = { b, fil };
    return b;
  }));
  const mouseTx = el('span', { text: 'ainda não se mexeu' });
  const num = el('div', { class: 'vr-sec vr-num' }, [el('p', { class: 'vr-sec-t', text: 'Os 8 números do rosto' }), listaBarras, el('p', { class: 'vr-mouse' }, [el('b', { text: 'Mouse: ' }), mouseTx])]);

  const frases = el('ul', { class: 'vr-frases' }, [el('li', { class: 'vazio', text: 'Aqui aparecem as frases que o código escreve: é só isso que vai para o Jev.' })]);
  const pal = el('div', { class: 'vr-sec vr-pal' }, [el('p', { class: 'vr-sec-t', text: 'Em palavras, para o Jev' }), frases]);

  const leitIc = el('div', { class: 'vr-leit-ic' }, [img('neutral_face')]);
  const leitNome = el('b', { class: 'vr-leit-nome', text: 'Esperando sinais' });
  const leitPct = el('span', { class: 'vr-leit-pct mj-num', text: '' });
  const leitBarras = el('div', { class: 'vr-leit-barras' });
  const decisao = el('p', { class: 'vr-decisao' }, [el('span', { text: 'A vitrine ainda não mudou.' })]);
  const fita = el('span', { class: 'vr-fita' }, [api.fita.no]);
  const jev = el('div', { class: 'vr-sec vr-jev' }, [
    el('p', { class: 'vr-sec-t' }, [el('span', { text: 'A leitura do Jev' }), fita]),
    el('div', { class: 'vr-leit-top' }, [leitIc, el('div', { class: 'vr-leit-tx' }, [leitNome, leitPct])]),
    leitBarras, decisao,
  ]);

  const painel = el('section', { class: 'vr-painel', 'aria-label': 'O que a vitrine percebeu' }, [
    el('header', { class: 'vr-painel-cab' }, [
      el('h3', { text: 'O que a vitrine percebeu' }),
      el('p', { class: 'vr-selo' }, [img('locked', 'vr-selo-ic'), el('span', { text: 'A imagem não sai do seu computador: só 8 números por segundo viram palavras para o Jev.' })]),
      som.botao(el),
    ]),
    el('div', { class: 'vr-painel-corpo' }, [cam, num, pal, jev]),
  ]);

  const raiz = el('div', { class: 'vr' }, [loja.no, painel]);
  area.append(raiz);

  // ---------- sensor: câmera, simulação e o leitor ----------
  const camera = criarCamera({ url: api.url, aoEstado: (e) => { estadoCam = e; mostrarStatus(); } });
  const sim = criarSimulador();
  const ocioso = criarSimulador();
  let estadoCam = 'desligada', fonteEl = video, simulando = false, camLigada = false, demo = false, exprAtual = '';
  const leitor = criarLeitor({ aoEvento: (e) => { if (/^(forte_|liga_testa|liga_sorriso|surpresa|nao|sim|bocejo|aproximou|afastou|sumiu|voltou|calibrado)/.test(e)) talvezPerguntar(true); if (e === 'calibrado') mostrarStatus(); } });
  let ultimaMedida = null;

  function fonte() { return leitor.fonte; }
  function mostrarStatus() {
    const f = fonte();
    caixa.classList.toggle('desligada', f === 'nenhuma' && !camLigada);
    caixa.classList.toggle('ao-vivo', f === 'camera');
    caixa.classList.toggle('simulando', f === 'simulacao');
    let t = 'Câmera desligada';
    if (estadoCam === 'pedindo') t = 'Pedindo a câmera…';
    else if (estadoCam === 'carregando') t = 'Carregando o leitor de rosto…';
    else if (f === 'simulacao') t = exprAtual ? `Simulação · ${exprAtual}` : 'Simulação';
    else if (f === 'camera') t = !leitor.presente ? '● Ao vivo · procurando o rosto' : leitor.calibrando ? '● Calibrando: rosto natural' : '● Ao vivo';
    status.textContent = t;
  }

  // ---------- o laço: lê um quadro, alimenta o leitor, desenha a malha e as barras ----------
  let ultimoVideoT = -1, ultimaBarra = 0, ultimaLeitura = 0;
  function passo() {
    const t = agora();
    const f = fonte();
    let m = null;
    if (f === 'camera' && camera.pronto && t - ultimaLeitura > 30) {
      const el2 = fonteEl;
      const novo = el2 === video ? video.readyState >= 2 && video.currentTime !== ultimoVideoT : true;
      if (novo) {
        if (el2 === video) ultimoVideoT = video.currentTime;
        try { m = camera.ler(el2); } catch (e) { console.warn(e); m = null; }
        ultimaLeitura = t;
        if (m) { leitor.quadro(m); ultimaMedida = m; }
      }
      m = ultimaMedida;
    } else if (f === 'simulacao') {
      m = sim.quadro(); leitor.quadro(m); ultimaMedida = m;
    } else if (f === 'nenhuma') {
      m = ocioso.quadro();
    }
    // no vídeo de verdade os pontos ficam mais leves, para a expressão da pessoa continuar visível
    if (m) desenharRosto(cvMalha, m, f === 'nenhuma' ? null : leitor.numeros, { pontosAlfa: f === 'nenhuma' ? 0.28 : f === 'camera' ? 0.36 : 0.5 });
    if (t - ultimaBarra > 80) { ultimaBarra = t; desenharBarras(); }
    requestAnimationFrame(passo);
  }

  function desenharBarras() {
    const n = leitor.numeros, nv = leitor.niveis, f = fonte();
    for (const s of SINAIS) {
      const v = f === 'nenhuma' ? (s.centro ? 0.5 : 0) : n[s.id];
      const { b, fil } = barras[s.id];
      if (s.centro) { const d = v - 0.5; fil.style.left = (d < 0 ? 50 + d * 100 : 50) + '%'; fil.style.width = Math.abs(d) * 100 + '%'; }
      else fil.style.width = (v * 100).toFixed(1) + '%';
      const ativo = nv[s.id] ? nv[s.id].nivel > 0 : s.centro ? Math.abs(v - 0.5) > 0.25 : v > 0.45;
      b.classList.toggle('ativo', f !== 'nenhuma' && ativo);
    }
  }

  // ---------- o mouse em palavras (o de verdade e o de mentira passam pelo mesmo caminho) ----------
  const mouse = { area: null, desde: 0, mov: 0, hist: [], conhecido: false };
  let mouseFalso = false;
  function nomeArea(a, por) {
    if (a.startsWith('mod-')) { const r = loja.rotuloDe(a.slice(4)); return por ? `pelo módulo «${r}»` : `o módulo «${r}»`; }
    return AREAS[a] ? AREAS[a][por ? 1 : 0] : por ? 'pela página' : 'a página';
  }
  // o cursor de mentira não vale como mouse de verdade depois que a simulação acaba
  function esquecerMouse() { Object.assign(mouse, { area: null, desde: 0, mov: 0, hist: [], conhecido: false }); ultimaChave = ''; }
  function mouseEm(a) {
    const t = agora();
    if (a !== mouse.area) { mouse.area = a; mouse.desde = t; mouse.hist.push([a, t]); if (mouse.hist.length > 20) mouse.hist.shift(); }
    mouse.mov = t; mouse.conhecido = true;
  }
  loja.no.addEventListener('pointermove', (e) => { if (mouseFalso) return; const a = e.target.closest('[data-area]'); mouseEm(a ? a.dataset.area : 'longe'); });
  loja.no.addEventListener('pointerleave', () => { if (!mouseFalso) mouseEm('longe'); });
  painel.addEventListener('pointermove', () => { if (!mouseFalso && mouse.area !== 'longe') mouseEm('longe'); });

  function fraseMouse() {
    if (!mouse.conhecido) return 'o mouse ainda não se mexeu';
    const t = agora(), a = mouse.area, dwell = t - mouse.desde;
    // quem apresenta deixa o mouse parado no preço enquanto faz caretas: só depois de 20 s ele conta como esquecido
    if (t - mouse.mov > 20000) return a && a !== 'longe' ? `mouse parado sobre ${nomeArea(a)} há mais de 20 s (talvez esquecido)` : 'mouse parado longe do produto há mais de 20 s';
    // indo e voltando: nos últimos 5 s, só duas partes, alternando
    const rec = []; for (const [x, tt] of mouse.hist) if (t - tt < 5000 && x !== 'longe' && rec[rec.length - 1] !== x) rec.push(x);
    const dif = [...new Set(rec)];
    if (rec.length >= 3 && dif.length === 2) return `mouse indo e voltando entre ${nomeArea(dif[0])} e ${nomeArea(dif[1])}`;
    if (a === 'longe') return dwell >= 1000 ? `mouse parado longe do produto há ${Math.floor(dwell / 1000)} s` : 'mouse saindo do produto';
    if (dwell >= 1000) return `mouse parado sobre ${nomeArea(a)} há ${Math.floor(dwell / 1000)} s`;
    return `mouse andando ${nomeArea(a, true)}`;
  }

  // ---------- a conversa com o Jev ----------
  let emVoo = false, ultimaChamada = 0, ultimaChave = '', ultimaMudanca = null, pausado = false;
  function dadosAgora() {
    const rosto = leitor.palavras();
    const m = fraseMouse();
    const na_tela = loja.naTela();
    const mudou = ultimaMudanca ? Math.round((agora() - ultimaMudanca) / 1000) : null;
    return { rosto, mouse: m, na_tela, mudou };
  }

  async function talvezPerguntar(urgente) {
    if (emVoo || pausado) return;
    const t = agora();
    if (t - ultimaChamada < (urgente ? spec.ritmo.minimoEntreChamadasMs : spec.ritmo.intervaloMs)) return;
    const f = fonte();
    if (f === 'nenhuma' && !mouse.conhecido) return;
    if (f !== 'nenhuma' && leitor.calibrando) return;
    const d = dadosAgora();
    if (/^(procurando|calibrando)/.test(d.rosto[0] || '')) return;   // estado de passagem: espera firmar
    const chave = JSON.stringify([d.rosto.map(balde), balde(d.mouse), d.na_tela.map((x) => x.id)]);
    if (chave === ultimaChave && !(leitor.ativo && t - ultimaChamada > 4500)) return;
    ultimaChave = chave; ultimaChamada = t; emVoo = true;
    mostrarFrases(d);
    let r = null;
    try { r = await perguntar('ler', d, (d.rosto[0] || '').slice(0, 34)); }
    catch { r = null; }
    finally { emVoo = false; }
    if (r) aplicar(r, d, f);
  }
  // a linha curta do mouse no painel (a frase inteira vai para o Jev e aparece em "Em palavras")
  function mouseCurto() {
    if (!mouse.conhecido) return 'ainda não se mexeu';
    const CURTO_MOD = { mais_barata: 'Lite', comparar: 'comparação', avaliacoes: 'avaliações', troca: 'troca', video: 'vídeo', chat: 'chat' };
    const t = agora(), a = mouse.area, nome = (x) => (x.startsWith('mod-') ? CURTO_MOD[x.slice(4)] || loja.rotuloDe(x.slice(4)) : AREAS_CURTAS[x] || x);
    if (t - mouse.mov > 20000) return 'parado há muito tempo';
    const f = fraseMouse();
    const m = f.match(/^mouse indo e voltando/);
    if (m) { const rec = []; for (const [x, tt] of mouse.hist) if (t - tt < 5000 && x !== 'longe' && rec[rec.length - 1] !== x) rec.push(x); const [p1, p2] = [...new Set(rec)]; return `indo e voltando: ${nome(p1)} ↔ ${nome(p2)}`; }
    if (a === 'longe') return 'fora do produto';
    const dwell = Math.floor((t - mouse.desde) / 1000);
    return dwell >= 1 ? `parado em ${nome(a)} · ${dwell} s` : `andando: ${nome(a)}`;
  }
  setInterval(() => { mouseTx.textContent = mouseCurto(); talvezPerguntar(false); }, 250);

  // a mesma frase com outro tempo ("há 2 s" → "há 3 s") não é sinal novo: só as novas entram animadas
  const semTempo = (t) => t.replace(/,? (há \d+ s|há mais de \d+ s|agora há pouco|agora)\b.*$/, '');
  function mostrarFrases(d) {
    const novas = [...d.rosto, d.mouse];
    const velhas = new Set([...frases.children].map((x) => x.dataset.t));
    frases.innerHTML = '';
    novas.forEach((t, i) => {
      const k = (i === novas.length - 1 ? 'm:' : 'r:') + semTempo(t);
      const li = el('li', { class: (i === novas.length - 1 ? 'mouse' : '') + (velhas.has(k) ? '' : ' nova'), text: t });
      li.dataset.t = k;
      frases.append(li);
    });
    frases.classList.remove('enviando'); void frases.offsetWidth; frases.classList.add('enviando');
  }

  function aplicar(r, d, f) {
    const per = r.percebido, mos = r.mostrar, int = r.interromper;
    if (!per || !mos || !int) return;
    mostrarLeitura(per, f);
    if (f !== 'nenhuma') loja.humor(per.choice, per.probabilities[per.choice] || 0); else loja.humor(null, 0);
    const pMos = mos.probabilities[mos.choice] || 0;
    const vale = int.noul >= limiarInterromper && mos.choice !== 'nada' && pMos >= spec.ritmo.limiarMostrar && !loja.tem(mos.choice);
    let mostrou = false;
    if (vale) { mostrou = loja.mostrar(mos.choice, porqueDe(d)); if (mostrou) ultimaMudanca = agora(); }
    mostrarDecisao(mos, int, mostrou, pMos);
  }

  // "porque: testa franzida forte + mouse no PREÇO" (curto, para caber no cartão)
  const CURTAS = [[/^sorriso (leve|forte)/, 'sorriso $1'], [/^testa franzida (leve|forte)/, 'testa franzida $1'], [/^sobrancelhas levantadas/, 'cara de surpresa'],
    [/^lábios apertados/, 'boca tensa'], [/^bocejou/, 'bocejo'], [/^olhos quase fechados/, 'olhos fechando'], [/^olhando para fora/, 'olhou para fora'],
    [/^balançou a cabeça/, '"não" com a cabeça'], [/^acenou com a cabeça/, '"sim" com a cabeça'], [/^aproximou/, 'chegou perto'], [/^afastou/, 'se afastou'],
    [/^cabeça inclinada/, 'cabeça inclinada'], [/^nenhum rosto/, 'saiu da câmera']];
  function porqueDe(d) {
    let face = '';
    for (const x of d.rosto) { const c = CURTAS.find(([re]) => re.test(x)); if (c) { face = x.match(c[0])[0].replace(c[0], c[1]); break; } }
    const area = mouse.conhecido && mouse.area && mouse.area !== 'longe' ? (mouse.area.startsWith('mod-') ? `no «${loja.rotuloDe(mouse.area.slice(4))}»` : `${/^(fotos|avaliacoes|cores)$/.test(mouse.area) ? 'nas' : 'no'} ${AREAS_CURTAS[mouse.area]}`) : '';
    const mov = /indo e voltando/.test(d.mouse) ? 'mouse indo e voltando' : area ? 'mouse ' + area : '';
    return [face, mov].filter(Boolean).join(' + ') || 'o que a vitrine leu';
  }

  let sentAtual = null;
  function mostrarLeitura(per, f) {
    const probs = Object.entries(per.probabilities || {}).sort((a, b) => b[1] - a[1]);
    const [top, p] = probs[0];
    const s = SENT[top] || { rotulo: top, img: 'neutral_face' };
    if (sentAtual !== top) {
      sentAtual = top;
      const novo = img(s.img, 'entra');
      const velho = leitIc.querySelector('img');
      if (velho) { velho.classList.add('sai'); setTimeout(() => velho.remove(), 260); }
      leitIc.append(novo);
      leitNome.classList.remove('troca'); void leitNome.offsetWidth; leitNome.classList.add('troca');
    }
    leitNome.textContent = s.rotulo;
    leitPct.textContent = fmt.pct(p);
    jev.style.setProperty('--cor-leit', s.cor || 'var(--mj-acento)');
    leitBarras.innerHTML = '';
    for (const [id, v] of probs.slice(1, 3)) {
      const ss = SENT[id] || { rotulo: id };
      const fil = el('i', { class: 'fil', style: { background: ss.cor || '#999' } });
      leitBarras.append(el('div', { class: 'vr-lb' }, [el('span', { class: 'nm', text: ss.rotulo }), el('span', { class: 'trk' }, [fil]), el('span', { class: 'pc mj-num', text: fmt.pct(v) })]));
      requestAnimationFrame(() => { fil.style.width = Math.max(1, v * 100) + '%'; });
    }
  }

  // o que a vitrine fez com as 3 respostas, numa linha: o módulo, a certeza e se mudou ou esperou (e por quê)
  function mostrarDecisao(mos, int, mostrou, pMos) {
    const m = MODS[mos.choice] || { rotulo: mos.choice, img: 'hourglass_not_done' };
    const pI = fmt.pct(int.noul);
    let fim, cls;
    if (mostrou) { fim = `mudou · interromper ${pI}`; cls = 'sim'; }
    else if (mos.choice === 'nada') { fim = 'a vitrine espera'; cls = 'nao'; }
    else if (loja.tem(mos.choice)) { fim = 'já está na tela'; cls = 'nao'; }
    else if (int.noul < limiarInterromper) { fim = `espera · interromper ${pI}`; cls = 'nao'; }
    else { fim = 'sem certeza: espera'; cls = 'nao'; }
    decisao.innerHTML = '';
    decisao.className = 'vr-decisao ' + (mostrou ? 'mudou' : 'esperou');
    decisao.append(
      img(m.img, 'vr-dec-ic'),
      el('span', { class: 'vr-dec-tx' }, [
        el('b', { text: mos.choice === 'nada' ? 'Nada agora' : m.rotulo }), ` ${fmt.pct(pMos)} `,
        el('span', { class: cls, text: `· ${fim}` }),
      ]),
    );
  }

  // ---------- câmera ----------
  btLigar.addEventListener('pointerenter', () => camera.preaquecer(), { once: true });
  btLigar.addEventListener('focus', () => camera.preaquecer(), { once: true });
  async function ligarCamera() {
    erroCam.textContent = '';
    caixa.classList.add('ligando');
    try {
      await camera.ligar(video);
      camLigada = true; fonteEl = video;
      if (!simulando && !demo) leitor.trocarFonte('camera');
      loja.dica(true);
      estadoCam = 'ligada';
      som.pop();
    } catch (e) {
      estadoCam = 'desligada';
      erroCam.textContent = e.amigavel ? e.message : 'Não consegui ligar a câmera: ' + e.message;
      if (e.causa) console.warn(e.causa);
    } finally { caixa.classList.remove('ligando'); mostrarStatus(); }
  }
  function desligarCamera() {
    camera.desligar(video); camLigada = false; estadoCam = 'desligada'; loja.dica(false);
    if (!simulando && !demo) leitor.trocarFonte('nenhuma');
    loja.humor(null, 0);
    mostrarStatus();
  }

  // ---------- expressões simuladas (botões) ----------
  let fimSim = null;
  function voltarFonte() {
    simulando = false; mouseFalso = false; exprAtual = ''; loja.esconderCursor(); esquecerMouse();
    leitor.trocarFonte(camLigada ? 'camera' : 'nenhuma');
    if (!camLigada) loja.humor(null, 0);
    btsExpr.forEach((b) => b.classList.remove('on'));
    mostrarStatus();
  }
  function comecarSimulacao() {
    sim.zerar();
    leitor.trocarFonte('simulacao');
    leitor.calibrarCom(medidasDe(NEUTRO));
    mostrarStatus();
  }
  function irArea(a) { mouseFalso = true; loja.moverCursor(a, 650); setTimeout(() => mouseEm(a), 420); }
  function simularExpressao(x) {
    if (demo) return;
    clearTimeout(fimSim);
    const continuar = simulando;
    simulando = true;
    if (!continuar) comecarSimulacao();
    btsExpr.forEach((b, i) => b.classList.toggle('on', EXPRESSOES[i] === x));
    exprAtual = x.rotulo.toLowerCase(); mostrarStatus();
    irArea(x.area);
    setTimeout(() => { sim.definir(x.expr); if (x.aceno) setTimeout(() => sim.acenar(x.aceno), 1500); }, 350);
    fimSim = setTimeout(() => { sim.definir({}); fimSim = setTimeout(voltarFonte, 1600); }, 5600);
  }

  // ---------- teste do caminho real com imagens (para quem desenvolve; não aparece na tela) ----------
  async function testarImagens(urls, msCada = 2600) {
    await camera.carregar();
    leitor.trocarFonte('camera'); camLigada = true; fonteEl = cvTeste; caixa.classList.add('teste'); mostrarStatus();
    const ctx = cvTeste.getContext('2d');
    const log = [];
    for (const u of urls) {
      const im = new Image(); im.crossOrigin = 'anonymous'; im.src = u; await im.decode();
      cvTeste.width = im.naturalWidth; cvTeste.height = im.naturalHeight; ctx.drawImage(im, 0, 0);
      const fim = agora() + msCada;
      while (agora() < fim) await sleep(60);
      log.push({ u, rosto: leitor.presente, palavras: leitor.palavras(), numeros: Object.fromEntries(Object.entries(leitor.numeros).map(([k, v]) => [k, +v.toFixed(2)])) });
    }
    return log;
  }
  window.vitrineRosto = { testarImagens, leitor, camera, loja };

  // ---------- demonstração (▶) ----------
  async function tocar(sinal) {
    demo = true; pausado = false;
    clearTimeout(fimSim); simulando = false; btsExpr.forEach((b) => b.classList.remove('on'));
    loja.limpar(); ultimaMudanca = null; ultimaChave = ''; sentAtual = null;
    comecarSimulacao();
    caixa.classList.add('demo');
    const passos = ROTEIRO.length;
    const mostrarPasso = (i, p) => {
      legenda.querySelector('.vr-leg-tx').textContent = p.legenda;
      const ic = legenda.querySelector('.vr-leg-ic'); ic.innerHTML = '';
      if (p.img) ic.append(img(p.img));
      legenda.style.setProperty('--prog', ((i + 1) / passos).toFixed(3));
      legenda.classList.remove('troca'); void legenda.offsetWidth; legenda.classList.add('troca');
    };
    try {
      await sleep(400, sinal);
      for (let i = 0; i < ROTEIRO.length; i++) {
        const p = ROTEIRO[i];
        mostrarPasso(i, p);
        if (p.areas) {
          sim.definir(p.expr);
          const passo2 = p.ms / p.areas.length;
          for (let a of p.areas) { if (a.startsWith('mod-') && !loja.tem(a.slice(4))) a = 'avaliacoes'; irArea(a); await sleep(passo2, sinal); }
          continue;
        }
        let a = p.area;
        if (a && a.startsWith('mod-') && !loja.tem(a.slice(4))) a = 'fotos';
        if (a) irArea(a);
        await sleep(380, sinal);
        sim.definir(p.expr);
        if (p.aceno) setTimeout(() => sim.acenar(p.aceno), 700);
        await sleep(p.ms - 380, sinal);
      }
      pausado = true;   // a última leitura (gostou, Comprar brilhando) fica na tela
      legenda.querySelector('.vr-leg-tx').textContent = 'Fim da simulação: agora ligue a câmera e teste com o seu rosto';
      legenda.querySelector('.vr-leg-ic').innerHTML = '';
      await sleep(2600, sinal);
    } finally {
      pausado = false;
      demo = false;
      caixa.classList.remove('demo');
      mouseFalso = false; loja.esconderCursor(); esquecerMouse();
      leitor.trocarFonte(camLigada ? 'camera' : 'nenhuma');
      mostrarStatus();
    }
  }

  mostrarStatus();
  requestAnimationFrame(passo);
  return { tocar };
}

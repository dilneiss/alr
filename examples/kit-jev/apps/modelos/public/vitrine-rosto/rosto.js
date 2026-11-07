// O sensor do rosto da vitrine: câmera + MediaPipe Face Landmarker (roda no navegador), o rosto simulado (a demonstração
// passa pelo MESMO caminho), os 8 números do rosto e as PALAVRAS que vão para o Jev. Nenhuma imagem sai daqui: só frases.
//
//   criarCamera()     → liga a webcam e devolve, a cada quadro, as medidas do MediaPipe (pontos + blendshapes)
//   criarSimulador()  → produz as mesmas medidas a partir de uma expressão (sorriso, testa franzida…), com a malha canônica
//   criarLeitor()     → recebe as medidas, calibra o rosto neutro, calcula os 8 números e os transforma em palavras
//   desenharRosto()   → desenha a malha (pontos + contornos) por cima do vídeo, acendendo a parte do rosto que mexeu
import { MALHA, LIGACOES } from './malha.js';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const agora = () => performance.now();

// os 8 números que o painel mostra (e que viram palavras)
export const SINAIS = [
  { id: 'sorriso', rotulo: 'Sorriso' },
  { id: 'testa', rotulo: 'Testa franzida' },
  { id: 'surpresa', rotulo: 'Surpresa' },
  { id: 'boca', rotulo: 'Boca tensa' },
  { id: 'olhos', rotulo: 'Olhos fechando' },
  { id: 'fora', rotulo: 'Olhar fora' },
  { id: 'perto', rotulo: 'Perto · longe', centro: true },
  { id: 'cabeca', rotulo: 'Cabeça mexendo' },
];

// ---------------------------------------------------------------------------------------------------------------
// câmera + MediaPipe
// ---------------------------------------------------------------------------------------------------------------
export function criarCamera({ url, aoEstado }) {
  let vision = null, fl = null, carregando = null, stream = null;

  async function carregar() {
    if (fl) return fl;
    if (carregando) return carregando;
    carregando = (async () => {
      // o MediaPipe escreve avisos de rotina ("INFO: Created TensorFlow Lite XNNPACK delegate…") como erro no console:
      // só essas linhas "INFO:" são caladas; qualquer erro de verdade continua aparecendo
      if (!console.error.__vitrine) {
        const orig = console.error.bind(console);
        const filtrado = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('INFO:')) return; orig(...a); };
        filtrado.__vitrine = true; console.error = filtrado;
      }
      vision = await import(`${MP}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const opcoes = (delegate) => ({
        baseOptions: { modelAssetPath: url('assets/face_landmarker.task'), delegate },
        runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      try { fl = await vision.FaceLandmarker.createFromOptions(fileset, opcoes('GPU')); }
      catch { fl = await vision.FaceLandmarker.createFromOptions(fileset, opcoes('CPU')); }
      return fl;
    })();
    try { return await carregando; } finally { carregando = null; }
  }

  // pré-carrega o leitor quando a pessoa chega perto do botão (a câmera só liga no clique)
  function preaquecer() { carregar().catch(() => {}); }

  async function ligar(video) {
    if (!window.isSecureContext) throw Object.assign(new Error('A câmera só funciona em conexão segura (https ou localhost).'), { amigavel: true });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('Este navegador não deixa usar a câmera. Use os botões de expressão ou o ▶.'), { amigavel: true });
    aoEstado && aoEstado('pedindo');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      const msg = { NotAllowedError: 'O navegador bloqueou a câmera. Libere no cadeado da barra de endereço, ou use os botões de expressão.', NotFoundError: 'Nenhuma câmera encontrada. Use os botões de expressão ou o ▶.', NotReadableError: 'A câmera está ocupada por outro programa. Feche o outro e tente de novo.' }[e && e.name];
      throw Object.assign(new Error(msg || 'Não consegui ligar a câmera: ' + (e && e.message || e)), { amigavel: true });
    }
    video.srcObject = stream; video.muted = true; video.playsInline = true;
    await video.play().catch(() => {});
    aoEstado && aoEstado('carregando');
    try { await carregar(); }
    catch (e) { desligar(video); throw Object.assign(new Error('Não consegui carregar o leitor de rosto (ele vem da internet na primeira vez). Use os botões de expressão.'), { amigavel: true, causa: e }); }
  }

  function desligar(video) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) video.srcObject = null;
  }

  let ultimoTs = 0;
  // uma leitura de um quadro (vídeo ou canvas): devolve as medidas ou null se não deu para ler
  function ler(fonte) {
    if (!fl) return null;
    const W = fonte.videoWidth || fonte.width, H = fonte.videoHeight || fonte.height;
    if (!W || !H) return null;
    let ts = agora(); if (ts <= ultimoTs) ts = ultimoTs + 1; ultimoTs = ts;
    const r = fl.detectForVideo(fonte, ts);
    const pts = r && r.faceLandmarks && r.faceLandmarks[0];
    if (!pts) return { rosto: false, W, H };
    const bs = {};
    const cats = r.faceBlendshapes && r.faceBlendshapes[0] && r.faceBlendshapes[0].categories;
    if (cats) for (const c of cats) bs[c.categoryName] = c.score;
    return { rosto: true, pontos: pts, bs, W, H };
  }

  return { carregar, preaquecer, ligar, desligar, ler, get pronto() { return !!fl; }, get ligada() { return !!stream; } };
}

// ---------------------------------------------------------------------------------------------------------------
// rosto simulado: a malha canônica do MediaPipe deformada por uma expressão → as mesmas medidas da câmera
// ---------------------------------------------------------------------------------------------------------------
const N = 468;
const PX = (i) => MALHA[i * 3], PY = (i) => MALHA[i * 3 + 1], PZ = (i) => MALHA[i * 3 + 2];
const CANTO_D = 61, CANTO_E = 291;
const LABIOS = new Set(LIGACOES.labios.flat());
const SOBR_D = new Set(LIGACOES.sobrD.flat()), SOBR_E = new Set(LIGACOES.sobrE.flat());
// pálpebras: pontos de cada olho acima e abaixo da linha do olho (pelo contorno do FaceLandmarker)
const OLHO_D = [...new Set(LIGACOES.olhoD.flat())], OLHO_E = [...new Set(LIGACOES.olhoE.flat())];
const centro = (ids) => { let x = 0, y = 0, z = 0; for (const i of ids) { x += PX(i); y += PY(i); z += PZ(i); } return [x / ids.length, y / ids.length, z / ids.length]; };
const C_OD = centro(OLHO_D), C_OE = centro(OLHO_E);
const BOCA_Y = (PY(CANTO_D) + PY(CANTO_E)) / 2;

export const NEUTRO = { sorriso: 0, testa: 0, sobr: 0, jaw: 0, olhos: 0, boca: 0, arreg: 0, yaw: 0, pitch: 0, roll: 0, escala: 1, olharX: 0, olharY: 0 };

export function criarSimulador() {
  let atual = { ...NEUTRO }, alvo = { ...NEUTRO };
  let falando = false, aceno = null, piscada = 0, proximaPiscada = agora() + 2500, ultimo = agora();
  const t0 = agora();

  function definir(p = {}) { alvo = { ...NEUTRO, ...p }; falando = !!p.falando; }
  function acenar(tipo) { aceno = { tipo, t: agora() }; }   // 'sim' (cabeça para cima e para baixo) ou 'nao' (de um lado para o outro)
  function zerar() { atual = { ...NEUTRO }; alvo = { ...NEUTRO }; falando = false; aceno = null; }

  function quadro() {
    const t = agora(), dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
    const k = 1 - Math.exp(-dt / 0.16);
    for (const c of Object.keys(NEUTRO)) atual[c] += (alvo[c] - atual[c]) * k;
    const s = (t - t0) / 1000;
    const p = { ...atual };
    // vida: balanço leve da cabeça e piscadas de 140 ms
    p.yaw += 1.4 * Math.sin(s * 0.7); p.pitch += 0.9 * Math.sin(s * 0.9 + 1); p.roll += 0.6 * Math.sin(s * 0.5 + 2);
    if (t > proximaPiscada) { piscada = t; proximaPiscada = t + 2600 + Math.random() * 2600; }
    const pisc = t - piscada < 150 ? Math.sin(((t - piscada) / 150) * Math.PI) : 0;
    p.olhos = Math.max(p.olhos, pisc * 0.95);
    if (falando) p.jaw = Math.max(p.jaw, 0.08 + 0.22 * Math.abs(Math.sin(s * 9.5)) * (0.6 + 0.4 * Math.sin(s * 2.1)));
    if (aceno) {
      const d = (t - aceno.t) / 1000;
      if (d > 1.5) aceno = null;
      else { const env = Math.sin(Math.min(1, d / 1.5) * Math.PI); const osc = Math.sin(d * 2 * Math.PI * 2.4) * env; if (aceno.tipo === 'nao') p.yaw += 15 * osc; else p.pitch += 11 * osc; }
    }
    return medidasDe(p);
  }

  return { definir, acenar, zerar, quadro, get params() { return { ...atual }; } };
}

// expressão → blendshapes (na escala do MediaPipe) + os 478 pontos normalizados de um quadro 640×480
export function medidasDe(p) {
  const W = 640, H = 480;
  const bs = {
    mouthSmileLeft: p.sorriso * 0.75, mouthSmileRight: p.sorriso * 0.75,
    browDownLeft: p.testa * 0.5, browDownRight: p.testa * 0.5,
    browInnerUp: p.sobr * 0.7, browOuterUpLeft: p.sobr * 0.6, browOuterUpRight: p.sobr * 0.6,
    jawOpen: p.jaw * 0.7,
    eyeBlinkLeft: p.olhos * 0.85, eyeBlinkRight: p.olhos * 0.85,
    mouthPressLeft: p.boca * 0.5, mouthPressRight: p.boca * 0.5, mouthFrownLeft: p.boca * 0.25, mouthFrownRight: p.boca * 0.25,
    eyeWideLeft: p.arreg * 0.5, eyeWideRight: p.arreg * 0.5,
  };
  const pontos = malhaDe(p, W, H);
  return { rosto: true, pontos, bs, W, H };
}

function malhaDe(p, W, H) {
  const a = (p.yaw * Math.PI) / 180, b = (p.pitch * Math.PI) / 180, c = (p.roll * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  const s = 12.2 * p.escala, cx = W / 2, cy = H * 0.5, f = 70;
  const out = new Array(478);
  const proj = (x, y, z) => {
    // yaw (eixo y) → pitch (eixo x; positivo = olhando para baixo) → roll (eixo z); pivô atrás do rosto
    z += 2;
    let X = x * ca + z * sa, Z = -x * sa + z * ca;
    let Y = y * cb - Z * sb; Z = y * sb + Z * cb;
    const X2 = X * cc - Y * sc, Y2 = X * sc + Y * cc;
    Z -= 2;
    const k = f / (f - Z);
    return { x: (cx + X2 * k * s) / W, y: (cy - Y2 * k * s) / H, z: -Z / 40 };
  };
  for (let i = 0; i < N; i++) {
    let x = PX(i), y = PY(i), z = PZ(i);
    // sorriso: cantos da boca para fora e para cima (com os vizinhos), bochechas sobem
    for (const [cIdx, lado] of [[CANTO_D, -1], [CANTO_E, 1]]) {
      const d2 = (x - PX(cIdx)) ** 2 + (y - PY(cIdx)) ** 2;
      const w = Math.exp(-d2 / (2 * 1.15 * 1.15));
      x += lado * p.sorriso * 0.55 * w; y += p.sorriso * 0.8 * w - p.boca * 0.35 * w;
      const dc = (x - lado * 3.6) ** 2 + (y + 1.2) ** 2;
      y += p.sorriso * 0.35 * Math.exp(-dc / (2 * 1.6 * 1.6));
    }
    // boca tensa: os lábios se apertam contra a linha da boca
    if (LABIOS.has(i)) y += (BOCA_Y - y) * 0.45 * p.boca;
    // boca aberta: lábio de baixo e queixo descem
    if (y < BOCA_Y - 0.05) { const w = clamp((BOCA_Y - y) / 2 + 0.35); y -= p.jaw * 2.3 * w; }
    // sobrancelhas: franzir (desce e junta no meio) e levantar (surpresa)
    if (SOBR_D.has(i) || SOBR_E.has(i) || (y > 4.2 && y < 6.2 && Math.abs(x) < 5.6)) {
      const nucleo = SOBR_D.has(i) || SOBR_E.has(i) ? 1 : 0.45;
      const dentro = clamp(1 - (Math.abs(x) - 1) / 3);
      y -= p.testa * (0.25 + 0.4 * dentro) * nucleo;
      x -= Math.sign(x) * p.testa * 0.3 * dentro * nucleo;
      y += p.sobr * (0.85 - 0.2 * (1 - dentro)) * nucleo;
    }
    if (y > 6.2) y += p.sobr * 0.25;
    // pálpebras: fecham para a linha do meio do olho; arregalar abre
    for (const C of [C_OD, C_OE]) {
      if (Math.abs(x - C[0]) < 2.4 && Math.abs(y - C[1]) < 1.3) {
        if (y > C[1]) { y -= (y - C[1]) * clamp(p.olhos + p.testa * 0.15 + p.sorriso * 0.12) * 0.95; y += p.arreg * 0.28 + p.sobr * 0.1; }
        else { y += (C[1] - y) * clamp(p.olhos * 0.35 + p.sorriso * 0.25); y -= p.arreg * 0.1; }
      }
    }
    out[i] = proj(x, y, z);
  }
  // íris (468–477): centro do olho + olhar, com 4 pontos em volta
  const iris = (C, base) => {
    const ab = clamp(1 - p.olhos);
    const cx2 = C[0] + p.olharX * 0.5, cy2 = C[1] + p.olharY * 0.3;
    out[base] = proj(cx2, cy2, C[2] + 0.3);
    const r = 0.55;
    [[r, 0], [0, r * ab], [-r, 0], [0, -r * ab]].forEach(([dx, dy], j) => { out[base + 1 + j] = proj(cx2 + dx, cy2 + dy, C[2] + 0.3); });
  };
  iris(C_OD, 468); iris(C_OE, 473);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// o leitor: medidas → 8 números → níveis com histerese → eventos → PALAVRAS
// ---------------------------------------------------------------------------------------------------------------
const CHAVES_BS = ['mouthSmileLeft', 'mouthSmileRight', 'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'mouthPressLeft', 'mouthPressRight', 'mouthFrownLeft', 'mouthFrownRight', 'noseSneerLeft', 'noseSneerRight', 'eyeWideLeft', 'eyeWideRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookOutLeft', 'eyeLookOutRight', 'eyeLookInLeft', 'eyeLookInRight'];
// teto da calibração: se a pessoa já sorria ao ligar, o "neutro" não pode engolir o sorriso
const TETO = { mouthSmile: 0.3, browDown: 0.45, browInnerUp: 0.3, browOuterUp: 0.3, jawOpen: 0.15, eyeBlink: 0.45, mouthPress: 0.35, mouthFrown: 0.2, noseSneer: 0.2, eyeWide: 0.2, eyeLook: 0.45 };
const teto = (k) => { for (const [p, v] of Object.entries(TETO)) if (k.startsWith(p)) return v; return 0.4; };
// liga (leve, forte); desliga abaixo de 70% do leve; o tempo mínimo evita piscadas e caretas de meio segundo
const LIM = { sorriso: [0.3, 0.6, 300], testa: [0.3, 0.6, 300], surpresa: [0.38, 0.65, 220], boca: [0.38, 0.65, 350], olhos: [0.55, 0.8, 700], fora: [0.6, 0.85, 450] };

function geometria(m) {
  const P = m.pontos, W = m.W, H = m.H;
  const px = (i) => P[i].x * W, py = (i) => P[i].y * H;
  // só pontos que a boca não mexe (bochechas, cantos dos olhos, ponta do nariz): bocejar não vira "cabeça mexendo"
  const meioX = (px(234) + px(454)) / 2, larg = Math.abs(px(454) - px(234)) || 1;
  const yawR = (px(1) - meioX) / larg;
  const iod = Math.hypot(px(263) - px(33), py(263) - py(33)) || 1;
  const olhoY = (py(33) + py(133) + py(263) + py(362)) / 4;
  const pitchR = (py(1) - olhoY) / iod;
  const roll = (Math.atan2(py(263) - py(33), px(263) - px(33)) * 180) / Math.PI;
  return { yawR, pitchR, roll, tam: iod / H };
}

export function criarLeitor({ aoEvento } = {}) {
  let fonte = 'nenhuma';          // nenhuma · camera · simulacao
  let base = null, amostras = [], calibrandoDesde = 0;
  let presente = false, ausenteDesde = agora(), presenteDesde = 0, neutroDesde = agora();
  const num = Object.fromEntries(SINAIS.map((s) => [s.id, s.centro ? 0.5 : 0]));
  const niv = Object.fromEntries(Object.keys(LIM).map((k) => [k, { nivel: 0, desde: 0, cand: 0, baixo: 0 }]));
  const ev = { nao: 0, sim: 0, bocejo: 0, aproximou: 0, afastou: 0, surpresa: 0 };
  let foraDir = 'o lado', jawSerie = [], yawSerie = [], pitchSerie = [], falandoAte = 0, bocejoDesde = 0, pertoEstado = 0, inclinadaDesde = 0;
  let ultimoQuadro = agora(), geo = null, ultimoRostoT = 0;
  const ult = { jaw: 0, arreg: 0 };
  const os = { yaw: { ext: null, dir: 0, n: 0, t: 0 }, pitch: { ext: null, dir: 0, n: 0, t: 0 } };

  function trocarFonte(f) {
    fonte = f; base = null; amostras = []; calibrandoDesde = agora();
    presente = false; ausenteDesde = agora(); neutroDesde = agora();
    for (const k of Object.keys(niv)) Object.assign(niv[k], { nivel: 0, desde: 0, cand: 0, baixo: 0 });
    for (const k of Object.keys(ev)) ev[k] = 0;
    for (const s of SINAIS) num[s.id] = s.centro ? 0.5 : 0;
    jawSerie = []; yawSerie = []; pitchSerie = []; pertoEstado = 0; inclinadaDesde = 0;
  }
  function recalibrar() { base = null; amostras = []; calibrandoDesde = agora(); }

  function calibrarCom(m) {   // calibração instantânea (simulação: o neutro é conhecido)
    const g = geometria(m);
    base = { bs: Object.fromEntries(CHAVES_BS.map((k) => [k, Math.min(teto(k), (m.bs && m.bs[k]) || 0)])), ...g };
  }

  function evento(tipo) { ev[tipo] = agora(); aoEvento && aoEvento(tipo); }

  // conta as idas e voltas da cabeça (não = yaw, sim = pitch)
  function oscilacao(o, v, t, amp, tipo) {
    if (o.ext == null) { o.ext = v; return; }
    const d = v - o.ext;
    if (o.dir >= 0 && d > 0) { o.ext = v; o.dir = 1; return; }
    if (o.dir <= 0 && d < 0) { o.ext = v; o.dir = -1; return; }
    if (Math.abs(d) >= amp) {   // virou de direção com amplitude: conta uma volta
      if (t - o.t > 900) o.n = 0;
      o.n++; o.t = t; o.dir = -o.dir; o.ext = v;
      if (o.n >= 3) { o.n = 0; evento(tipo); }
    }
  }

  function quadro(m) {
    const t = agora(), dt = Math.min(0.2, (t - ultimoQuadro) / 1000); ultimoQuadro = t;
    if (fonte === 'nenhuma') return;
    if (!m || !m.rosto) {
      // some só depois de ~0,4 s sem rosto (um quadro perdido não conta)
      if (presente && t - ultimoRostoT > 400) { presente = false; ausenteDesde = ultimoRostoT; }
      if (!presente && t - ausenteDesde > 900 && ev.sumiu !== ausenteDesde) { ev.sumiu = ausenteDesde; aoEvento && aoEvento('sumiu'); }
      for (const s of SINAIS) num[s.id] += ((s.centro ? 0.5 : 0) - num[s.id]) * 0.2;
      for (const k of Object.keys(niv)) niv[k].nivel = 0;
      geo = null;
      return;
    }
    ultimoRostoT = t;
    if (!presente) { presente = true; presenteDesde = t; neutroDesde = t; if (t - ausenteDesde > 1500) aoEvento && aoEvento('voltou'); }
    const g = geometria(m); geo = g;
    // calibração: ~1,2 s de rosto parado e natural (mediana)
    if (!base) {
      amostras.push({ bs: m.bs || {}, ...g });
      if (amostras.length >= 24 && t - calibrandoDesde > 1200) {
        const med = (arr) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
        base = { bs: Object.fromEntries(CHAVES_BS.map((k) => [k, Math.min(teto(k), med(amostras.map((x) => x.bs[k] || 0)))])),
          yawR: med(amostras.map((x) => x.yawR)), pitchR: med(amostras.map((x) => x.pitchR)), roll: med(amostras.map((x) => x.roll)), tam: med(amostras.map((x) => x.tam)) };
        amostras = [];
        aoEvento && aoEvento('calibrado');
      }
      return;
    }
    const bs = m.bs || {};
    const rel = (k) => Math.max(0, (bs[k] || 0) - base.bs[k]) / Math.max(0.25, 1 - base.bs[k]);
    const m2 = (a, b) => (rel(a) + rel(b)) / 2;
    const yawDeg = (g.yawR - base.yawR) / 0.0135, pitchDeg = (g.pitchR - base.pitchR) / 0.0075, rollDeg = g.roll - base.roll;
    // falando: a boca abre e fecha várias vezes por segundo
    jawSerie.push([t, bs.jawOpen || 0]); while (jawSerie.length && t - jawSerie[0][0] > 1500) jawSerie.shift();
    let cruz = 0, media = jawSerie.reduce((s, x) => s + x[1], 0) / jawSerie.length, lado = 0, dp = 0;
    for (const [, v] of jawSerie) { dp += (v - media) ** 2; const l = v > media + 0.025 ? 1 : v < media - 0.025 ? -1 : 0; if (l && l !== lado) { if (lado) cruz++; lado = l; } }
    dp = Math.sqrt(dp / jawSerie.length);
    if (cruz >= 4 && dp > 0.03) falandoAte = t + 700;
    const falando = t < falandoAte;

    const jaw = clamp(rel('jawOpen') * 1.4);
    const sobr = clamp(Math.max(rel('browInnerUp'), m2('browOuterUpLeft', 'browOuterUpRight')) * 1.4);
    const arreg = clamp(m2('eyeWideLeft', 'eyeWideRight') * 1.6);
    ult.jaw = jaw; ult.arreg = arreg;
    const cru = {
      // falando, os lábios esticam em algumas sílabas: o sorriso precisa passar de uma margem
      sorriso: clamp(m2('mouthSmileLeft', 'mouthSmileRight') * 1.35 - (falando ? 0.18 : 0)),
      testa: clamp(m2('browDownLeft', 'browDownRight') * 1.8),
      surpresa: falando ? clamp(sobr > 0.6 ? sobr * 0.9 : sobr * 0.5) : clamp(sobr * (0.55 + 0.45 * Math.max(jaw, arreg)) * 1.25),
      boca: falando ? 0 : clamp(Math.max(m2('mouthPressLeft', 'mouthPressRight') * 1.5, m2('mouthFrownLeft', 'mouthFrownRight') * 2, m2('noseSneerLeft', 'noseSneerRight') * 1.6)),
      olhos: clamp(m2('eyeBlinkLeft', 'eyeBlinkRight') * 1.25),
    };
    // olhar fora: cabeça virada (yaw), para baixo/cima (pitch) ou os olhos bem para o lado
    const olharLado = Math.max(m2('eyeLookOutLeft', 'eyeLookInRight'), m2('eyeLookInLeft', 'eyeLookOutRight'));
    // olhar o painel embaixo da tela inclina a cabeça uns 10°: "para baixo" só conta acima de ~17° (celular no colo: 30°+)
    const fLado = Math.abs(yawDeg) / 30, fBaixo = pitchDeg / 28, fCima = -pitchDeg / 24;
    cru.fora = clamp(Math.max(fLado, fBaixo, fCima, olharLado * 0.9));
    foraDir = fBaixo >= Math.max(fLado, fCima) ? 'baixo' : fCima > fLado ? 'cima' : 'o lado';
    // perto/longe: distância entre os olhos (corrigida pelo giro da cabeça) contra a calibrada (0,5 = como no começo)
    const r = g.tam / Math.cos((Math.min(25, Math.abs(yawDeg)) * Math.PI) / 180) / (base.tam || g.tam);
    const deFrente = Math.abs(yawDeg) < 18 && Math.abs(pitchDeg) < 18;
    if (deFrente) cru.perto = clamp(0.5 + (r - 1) * 2.2); else cru.perto = num.perto;
    if (deFrente) { if (pertoEstado <= 0 && r > 1.16) { pertoEstado = 1; evento('aproximou'); } else if (pertoEstado >= 0 && r < 0.86) { pertoEstado = -1; evento('afastou'); } else if (r > 0.93 && r < 1.07) pertoEstado = 0; }
    // cabeça mexendo: quanto o yaw e o pitch variaram no último segundo
    yawSerie.push([t, yawDeg]); pitchSerie.push([t, pitchDeg]);
    while (yawSerie.length && t - yawSerie[0][0] > 1000) yawSerie.shift();
    while (pitchSerie.length && t - pitchSerie[0][0] > 1000) pitchSerie.shift();
    const dpv = (sr) => { const mm = sr.reduce((s, x) => s + x[1], 0) / sr.length; return Math.sqrt(sr.reduce((s, x) => s + (x[1] - mm) ** 2, 0) / sr.length); };
    cru.cabeca = clamp(Math.max(dpv(yawSerie) / 7, dpv(pitchSerie) / 5));
    // amplitude mínima por ida e volta: acima do balanço natural de quem fala (~3–5°)
    oscilacao(os.yaw, yawDeg, t, 7, 'nao');
    oscilacao(os.pitch, pitchDeg, t, 5.5, 'sim');
    // suaviza os números (o painel mexe liso) e atualiza os níveis com histerese
    const a = 1 - Math.exp(-dt / 0.11);
    for (const s of SINAIS) num[s.id] += (cru[s.id] - num[s.id]) * a;
    for (const [k, [leve, forte, minMs]] of Object.entries(LIM)) {
      const n = niv[k], v = num[k];
      if (v >= leve) {
        n.baixo = 0;
        if (!n.nivel) { if (!n.cand) n.cand = t; if (t - n.cand >= minMs) { n.nivel = 1; n.desde = n.cand; if (k === 'surpresa') evento('surpresa'); else aoEvento && aoEvento('liga_' + k); } }
        if (n.nivel && v >= forte && n.nivel < 2) { n.nivel = 2; aoEvento && aoEvento('forte_' + k); }
        if (n.nivel === 2 && v < forte * 0.8) n.nivel = 1;
      } else {
        n.cand = 0;
        if (n.nivel && v < leve * 0.7) { if (!n.baixo) n.baixo = t; if (t - n.baixo > 250) { n.nivel = 0; n.desde = 0; } }
      }
    }
    // bocejo: boca bem aberta por ~1 s sem estar falando
    if (!falando && jaw > 0.5 && sobr < 0.45) { if (!bocejoDesde) bocejoDesde = t; if (t - bocejoDesde > 900 && t - ev.bocejo > 4000) evento('bocejo'); } else bocejoDesde = 0;
    // cabeça inclinada (roll) por quase 1 s
    if (Math.abs(rollDeg) > 11) { if (!inclinadaDesde) inclinadaDesde = t; } else inclinadaDesde = 0;
    const algum = Object.values(niv).some((x) => x.nivel) || t - ev.nao < 2500 || t - ev.sim < 2500 || t - ev.bocejo < 3000 || (inclinadaDesde && t - inclinadaDesde > 800);
    if (algum) neutroDesde = t;
    estadoFalando = falando;
  }
  let estadoFalando = false;

  const dur = (ms) => (ms < 1000 ? 'agora' : ms > 20000 ? 'há mais de 20 s' : `há ${Math.floor(ms / 1000)} s`);
  const recente = (tEv, ms) => tEv && agora() - tEv < ms;

  // as frases que vão para o Jev (as mais fortes primeiro)
  function palavras() {
    const t = agora();
    if (fonte === 'nenhuma') return ['câmera desligada: sem sinais do rosto, só o mouse'];
    if (!presente) return [t - ausenteDesde < 900 ? 'procurando o rosto na câmera' : `nenhum rosto na frente da câmera ${dur(t - ausenteDesde)}`];
    if (!base) return ['calibrando a câmera (ainda sem sinais)'];
    const f = [];
    const nv = (k) => niv[k];
    if (nv('fora').nivel) f.push([3, `olhando para fora da tela, para ${foraDir}, ${dur(t - nv('fora').desde)}`]);
    if (nv('sorriso').nivel) f.push([nv('sorriso').nivel + 1, `sorriso ${nv('sorriso').nivel === 2 ? 'forte' : 'leve'} ${dur(t - nv('sorriso').desde)}`]);
    if (nv('testa').nivel) f.push([nv('testa').nivel + 1, `testa franzida ${nv('testa').nivel === 2 ? 'forte' : 'leve'} ${dur(t - nv('testa').desde)}`]);
    if (nv('surpresa').nivel) {
      const d = t - nv('surpresa').desde;
      const partes = ['sobrancelhas levantadas', !estadoFalando && ult.jaw > 0.3 ? 'boca aberta' : '', ult.arreg > 0.3 ? 'olhos arregalados' : ''].filter(Boolean);
      const txt = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0];
      f.push([3.5, d < 1500 ? `${txt}, de repente (agora)` : `${txt} ${dur(d)}`]);
    }
    if (nv('boca').nivel) f.push([1.5, `lábios apertados (boca tensa) ${dur(t - nv('boca').desde)}`]);
    if (recente(ev.bocejo, 4000)) f.push([3, 'bocejou agora há pouco']);
    if (nv('olhos').nivel) f.push([2.5, `olhos quase fechados ${dur(t - nv('olhos').desde)}`]);
    if (recente(ev.nao, 3500)) f.push([3.2, 'balançou a cabeça dizendo não agora há pouco']);
    if (recente(ev.sim, 3500)) f.push([3.2, 'acenou com a cabeça dizendo sim agora há pouco']);
    if (recente(ev.aproximou, 3000)) f.push([2, 'aproximou o rosto da tela agora há pouco']);
    else if (pertoEstado > 0) f.push([1, 'rosto bem perto da tela']);
    if (recente(ev.afastou, 3000)) f.push([2, 'afastou o rosto da tela agora há pouco']);
    if (inclinadaDesde && t - inclinadaDesde > 800) f.push([1.2, `cabeça inclinada de lado ${dur(t - inclinadaDesde)}`]);
    f.sort((x, y) => y[0] - x[0]);
    const out = f.map((x) => x[1]).slice(0, 3);
    if (!out.length) out.push(`rosto neutro, olhando para a tela, ${dur(t - neutroDesde)}`);
    if (estadoFalando) out.push('falando (a boca mexe porque está falando)');
    return out;
  }
  return {
    trocarFonte, recalibrar, calibrarCom, palavras, quadro,
    get fonte() { return fonte; }, get numeros() { return num; }, get niveis() { return niv; },
    get presente() { return presente; }, get calibrando() { return fonte !== 'nenhuma' && presente && !base; },
    get falando() { return estadoFalando; }, get ativo() { return Object.values(niv).some((x) => x.nivel) || Object.values(ev).some((x) => x && agora() - x < 3000); },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// desenho da malha por cima do vídeo (o canvas é espelhado junto com o vídeo, pelo CSS)
// ---------------------------------------------------------------------------------------------------------------
const GRUPOS = [
  ['oval', (n) => Math.max(n.fora, n.cabeca, Math.abs(n.perto - 0.5) * 2)],
  ['nariz', () => 0],
  ['sobrD', (n) => Math.max(n.testa, n.surpresa)], ['sobrE', (n) => Math.max(n.testa, n.surpresa)],
  ['olhoD', (n) => Math.max(n.olhos, n.fora * 0.8)], ['olhoE', (n) => Math.max(n.olhos, n.fora * 0.8)],
  ['labios', (n) => Math.max(n.sorriso, n.boca, n.surpresa * 0.8)],
];

export function desenharRosto(cv, m, numeros, { pontosAlfa = 0.5, fundo = false } = {}) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = cv.clientWidth, bh = cv.clientHeight;
  if (!bw || !bh) return;
  if (cv.width !== Math.round(bw * dpr) || cv.height !== Math.round(bh * dpr)) { cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, bw, bh);
  if (!m || !m.rosto || !m.pontos) return;
  const k = Math.max(bw / m.W, bh / m.H), ox = (bw - m.W * k) / 2, oy = (bh - m.H * k) / 2;
  const P = m.pontos;
  const X = (i) => ox + P[i].x * m.W * k, Y = (i) => oy + P[i].y * m.H * k;
  // pontos da malha
  ctx.fillStyle = `rgba(255, 244, 232, ${pontosAlfa})`;
  const r = Math.max(0.9, k * 1.6);
  for (let i = 0; i < 468; i++) { ctx.beginPath(); ctx.arc(X(i), Y(i), r, 0, 6.283); ctx.fill(); }
  // contornos, acesos pela parte do rosto que mexeu
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [g, f] of GRUPOS) {
    const v = clamp(f(numeros || {}) || 0);
    ctx.strokeStyle = v > 0.35 ? `rgba(255, ${Math.round(150 - v * 60)}, ${Math.round(70 - v * 40)}, ${0.75 + v * 0.25})` : 'rgba(255, 196, 92, .78)';
    ctx.lineWidth = (g === 'oval' ? 1.6 : 2) + v * 2.6;
    ctx.shadowColor = 'rgba(255, 107, 53, .85)'; ctx.shadowBlur = v > 0.35 ? 10 * v : 0;
    ctx.beginPath();
    for (const [a, b] of LIGACOES[g]) { ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // íris
  if (P.length >= 478) {
    ctx.fillStyle = 'rgba(255, 183, 3, .95)';
    for (const c of [468, 473]) { const rr = Math.max(2, Math.hypot(X(c + 1) - X(c + 3), Y(c + 1) - Y(c + 3)) / 2); ctx.beginPath(); ctx.arc(X(c), Y(c), Math.min(rr, 9), 0, 6.283); ctx.fill(); }
  }
  void fundo;
}

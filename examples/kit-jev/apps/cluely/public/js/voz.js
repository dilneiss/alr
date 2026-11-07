// Ouvido do copiloto: reconhecimento de voz do navegador (Web Speech API, pt-BR) sobre o MICROFONE ou sobre o ÁUDIO de
// uma aba/tela compartilhada (Chrome ≥ 135 aceita uma MediaStreamTrack em start()), e a reunião SIMULADA, que manda
// parciais palavra por palavra pelo mesmo caminho do microfone.
// O mesmo áudio fica gravado nos últimos ~40 s (PCM, só na memória desta aba): quando uma fala termina, o trecho vai para
// a transcrição ROBUSTA no servidor (Whisper com o glossário de IA/programação como contexto).
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;
// start(track) chegou junto com as APIs de reconhecimento local; sem elas, o navegador ignoraria a trilha e usaria o microfone
export const TRILHA_OK = !!SR && ('processLocally' in SR.prototype || typeof SR.available === 'function');

export function mensagemErro(err) {
  return ({
    'not-allowed': 'O navegador bloqueou o microfone. Libere o acesso no cadeado da barra de endereço — ou use uma simulação.',
    'service-not-allowed': 'O reconhecimento de voz não está liberado neste navegador. Use o Chrome ou o Edge no computador — ou uma simulação.',
    'audio-capture': 'Nenhum microfone encontrado. Conecte um microfone ou use uma simulação.',
    network: 'O reconhecimento de voz do navegador precisa de internet e falhou agora. Tente de novo.',
    'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
  })[err] || `O reconhecimento de voz parou (${err}).`;
}

// ---------------------------------------------------------------- gravador PCM (anel de ~40 s) → WAV 16 kHz
const WORKLET = 'class G extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor("mc-grava",G)';
async function criarGravador(ac, fonte) {
  const pedacos = [];            // { t: performance.now() do FIM do pedaço, d: Float32Array }
  try {
    await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
    const no = new AudioWorkletNode(ac, 'mc-grava');
    const mudo = ac.createGain(); mudo.gain.value = 0;
    fonte.connect(no); no.connect(mudo); mudo.connect(ac.destination);
    no.port.onmessage = (e) => {
      pedacos.push({ t: performance.now(), d: e.data });
      const corte = performance.now() - 40000;
      while (pedacos.length && pedacos[0].t < corte) pedacos.shift();
    };
  } catch { return null; }
  const taxa = ac.sampleRate;
  return {
    // devolve o áudio entre dois instantes (performance.now) como WAV 16 kHz mono 16 bits
    recortar(tIni, tFim) {
      const sel = pedacos.filter((p) => p.t >= tIni && p.t - (p.d.length / taxa) * 1000 <= tFim);
      const n = sel.reduce((s, p) => s + p.d.length, 0);
      if (n < taxa * 0.4) return null;
      const bruto = new Float32Array(n);
      let o = 0; for (const p of sel) { bruto.set(p.d, o); o += p.d.length; }
      const passo = taxa / 16000, m = Math.floor(n / passo);
      const pcm = new Int16Array(m);
      for (let i = 0; i < m; i++) {
        const a = Math.floor(i * passo), b = Math.min(n, Math.floor((i + 1) * passo));
        let s = 0; for (let k = a; k < b; k++) s += bruto[k];
        const v = Math.max(-1, Math.min(1, s / Math.max(1, b - a)));
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
      const buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
      const txt = (o2, s2) => { for (let i = 0; i < s2.length; i++) dv.setUint8(o2 + i, s2.charCodeAt(i)); };
      txt(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true);
      dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); txt(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
      new Int16Array(buf, 44).set(pcm);
      return { blob: new Blob([buf], { type: 'audio/wav' }), duracao_s: +(m / 16000).toFixed(2) };
    },
  };
}

// Um reconhecedor contínuo que reinicia sozinho. onParcial(texto, meta) a cada mudança; onFinal(texto, meta) a cada frase.
// meta: { t_ini, t_fim, alternativas, forcado }. Se o navegador demorar a fechar a frase (> 1,5 s sem mudança), fechamos nós.
export function criarOuvinte({ trilha = null, onParcial, onFinal, onEstado, onNivel }) {
  const O = { ligado: false, rec: null, fatal: false, medidor: null, gravador: null };

  async function medidor() {
    try {
      let stream = trilha ? new MediaStream([trilha]) : null;
      let proprio = false;
      if (!stream) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        proprio = true;
      }
      if (!O.ligado) { if (proprio) stream.getTracks().forEach((t) => t.stop()); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const fonte = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser(); an.fftSize = 512;
      fonte.connect(an);
      O.gravador = await criarGravador(ac, fonte);
      const buf = new Uint8Array(an.fftSize);
      let raf;
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        if (onNivel) onNivel(Math.min(1, Math.sqrt(s / buf.length) * 4.2));
        raf = requestAnimationFrame(loop);
      };
      loop();
      O.medidor = { parar() { cancelAnimationFrame(raf); if (proprio) stream.getTracks().forEach((t) => t.stop()); ac.close().catch(() => {}); } };
    } catch { /* sem medidor e sem gravador: segue só com o reconhecimento */ }
  }

  function novo() {
    const rec = new SR();
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    const emitidos = new Set();
    let ignorarAte = 0, tIni = null, ultimaParcial = '', timer = null;
    const fechar = (texto, meta) => {
      clearTimeout(timer); timer = null;
      const t = texto.replace(/\s+/g, ' ').trim();
      if (t) onFinal(t, { t_ini: tIni || performance.now() - 2500, t_fim: performance.now(), ...meta });
      tIni = null; ultimaParcial = '';
    };
    rec.onstart = () => { if (O.rec === rec) onEstado('ouvindo'); };
    rec.onresult = (e) => {
      if (O.rec !== rec) return;
      let parcial = '';
      for (let i = Math.max(e.resultIndex, ignorarAte); i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          if (emitidos.has(i)) continue;
          emitidos.add(i);
          const alts = [];
          for (let k = 0; k < r.length; k++) alts.push({ t: r[k].transcript.trim(), c: +(r[k].confidence || 0).toFixed(3) });
          fechar(r[0].transcript, { alternativas: alts });
        } else parcial += r[0].transcript;
      }
      parcial = parcial.replace(/\s+/g, ' ').trim();
      if (parcial) {
        if (!tIni) tIni = performance.now();
        if (parcial !== ultimaParcial) {
          ultimaParcial = parcial;
          clearTimeout(timer);
          // rede de segurança: o reconhecedor às vezes não fecha a frase; depois de 1,5 s parado, fechamos nós
          timer = setTimeout(() => { if (O.rec === rec && ultimaParcial) { ignorarAte = e.results.length; fechar(ultimaParcial, { forcado: true }); } }, 1500);
        }
      }
      onParcial(parcial, { t_ini: tIni });
    };
    rec.onerror = (e) => {
      if (O.rec !== rec || e.error === 'no-speech' || e.error === 'aborted') return;
      O.fatal = true;
      onEstado('erro', mensagemErro(e.error));
      desligar(true);
    };
    rec.onend = () => {
      if (O.rec !== rec) return;
      if (ultimaParcial) fechar(ultimaParcial, { forcado: true });
      if (O.ligado && !O.fatal) {
        try { O.rec = novo(); trilha ? O.rec.start(trilha) : O.rec.start(); } catch { desligar(true); }
      }
    };
    return rec;
  }

  function ligar() {
    if (!SR) { onEstado('erro', 'Este navegador não tem reconhecimento de voz (o Firefox não tem). Use o Chrome ou o Edge — ou uma simulação.'); return false; }
    if (!window.isSecureContext) { onEstado('erro', 'O microfone só funciona em conexão segura (https).'); return false; }
    Object.assign(O, { ligado: true, fatal: false });
    try { O.rec = novo(); trilha ? O.rec.start(trilha) : O.rec.start(); } catch {
      O.fatal = true; onEstado('erro', 'Não consegui ligar o reconhecimento de voz neste navegador.'); desligar(true); return false;
    }
    medidor();
    return true;
  }

  function desligar(silencioso) {
    const rec = O.rec;
    O.ligado = false; O.rec = null;
    if (O.medidor) { O.medidor.parar(); O.medidor = null; }
    O.gravador = null;
    try { if (rec) rec.stop(); } catch { /* já parado */ }
    if (onNivel) onNivel(0);
    onEstado('parado', silencioso ? null : 'Parou de ouvir.');
  }

  return {
    ligar, desligar,
    get ligado() { return O.ligado; },
    recortar(tIni, tFim) { return O.gravador ? O.gravador.recortar(tIni, tFim) : null; },
  };
}

// ---------------------------------------------------------------- ElevenLabs Scribe v2 Realtime
// O reconhecimento do navegador perde falas inteiras e erra os termos em inglês. Medido com uma reunião gerada no
// ElevenLabs (149 s, 22 falas, 67 termos, test/voz11): o app com o reconhecedor do Chrome ficou com 43% dos termos e
// sumiu com metade da conversa; o Scribe em tempo real, com os termos do contexto, pegou as 22 falas e ~97% dos termos,
// com o texto final 0,6–1,3 s depois do fim de cada fala.
// O áudio vai do navegador DIRETO para o ElevenLabs (WebSocket), com um token de uso único que o seu servidor gera
// (a chave nunca vem para o navegador). O ouvinte tem a mesma interface do criarOuvinte.
const WORKLET_16K = `class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.a=0;this.s=0;this.n=0;this.b=new Int16Array(1600);this.i=0}
process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.s+=c[k];this.n++;this.a+=1;if(this.a>=this.r){this.a-=this.r;
const v=Math.max(-1,Math.min(1,this.s/this.n));this.s=0;this.n=0;this.b[this.i++]=v<0?v*32768:v*32767;
if(this.i===this.b.length){this.port.postMessage(this.b.buffer,[this.b.buffer]);this.b=new Int16Array(1600);this.i=0}}}return true}}registerProcessor("mc-16k",P)`;
const ERROS_SCRIBE = {
  quota_exceeded: 'Acabou a cota de transcrição do ElevenLabs.',
  auth_error: 'O ElevenLabs recusou a sessão de transcrição.',
  unaccepted_terms: 'A conta do ElevenLabs precisa aceitar os termos de transcrição.',
};
function paraBase64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function criarOuvinteScribe({ trilha = null, keyterms = [], sid, tokenUrl = '/api/stt-token', onParcial, onFinal, onEstado, onNivel }) {
  const O = { ligado: false, fatal: false, ws: null, ac: null, stream: null, proprio: false, raf: null, fila: [], tIni: null, ultima: '', tentativas: 0 };
  const termos = keyterms.map((t) => String(t).replace(/[^\p{L}\p{N} .\-]/gu, '').trim()).filter((t) => t.length >= 2 && t.length <= 20).slice(0, 50);

  function enviar(msg) {
    if (O.ws && O.ws.readyState === 1) O.ws.send(msg);
    else { O.fila.push(msg); if (O.fila.length > 60) O.fila.shift(); }     // até ~6 s guardados enquanto conecta
  }
  async function conectar() {
    const r = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) throw new Error((j.error && j.error.message) || 'Não consegui abrir a transcrição do ElevenLabs.');
    const q = new URLSearchParams([['model_id', 'scribe_v2_realtime'], ['audio_format', 'pcm_16000'], ['commit_strategy', 'vad'],
      ['vad_silence_threshold_secs', '0.7'], ['language_code', 'pt'], ...termos.map((t) => ['keyterms', t]), ['token', j.token]]);
    const ws = new WebSocket('wss://api.elevenlabs.io/v1/speech-to-text/realtime?' + q);
    O.ws = ws;
    ws.onopen = () => { O.tentativas = 0; const f = O.fila; O.fila = []; for (const m of f) ws.send(m); };
    ws.onmessage = (m) => {
      let d; try { d = JSON.parse(m.data); } catch { return; }
      const tipo = d.message_type, texto = String(d.text || '').replace(/\s+/g, ' ').trim();
      if (tipo === 'session_started') onEstado('ouvindo');
      else if (tipo === 'partial_transcript') {
        if (!texto) return;
        if (!O.tIni) O.tIni = performance.now();
        if (texto !== O.ultima) { O.ultima = texto; onParcial(texto, { t_ini: O.tIni, scribe: true }); }
      } else if (tipo === 'committed_transcript') {
        const ini = O.tIni || performance.now() - 2500;
        O.tIni = null; O.ultima = '';
        if (texto) onFinal(texto, { t_ini: ini, t_fim: performance.now(), scribe: true });
      } else if (ERROS_SCRIBE[tipo]) { O.fatal = true; onEstado('erro', ERROS_SCRIBE[tipo]); desligar(true); }
    };
    ws.onclose = () => {
      if (O.ws !== ws || !O.ligado || O.fatal) return;
      // sessão encerrada pelo servidor (tempo máximo, rede): token novo e segue; o áudio do intervalo fica na fila
      if (++O.tentativas > 5) { onEstado('erro', 'A transcrição do ElevenLabs caiu e não voltou.'); desligar(true); return; }
      setTimeout(() => { if (O.ligado) conectar().catch((e) => { onEstado('erro', e.message); desligar(true); }); }, 300 * O.tentativas);
    };
  }
  async function iniciarAudio() {
    let stream = trilha ? new MediaStream([trilha]) : null;
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      O.proprio = true;
    }
    if (!O.ligado) { if (O.proprio) stream.getTracks().forEach((t) => t.stop()); return; }
    O.stream = stream;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC(); O.ac = ac;
    const fonte = ac.createMediaStreamSource(stream);
    await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET_16K], { type: 'text/javascript' })));
    const no = new AudioWorkletNode(ac, 'mc-16k');
    const mudo = ac.createGain(); mudo.gain.value = 0;
    fonte.connect(no); no.connect(mudo); mudo.connect(ac.destination);
    no.port.onmessage = (e) => enviar(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: paraBase64(e.data), commit: false, sample_rate: 16000 }));
    if (onNivel) {
      const an = ac.createAnalyser(); an.fftSize = 512; fonte.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        onNivel(Math.min(1, Math.sqrt(s / buf.length) * 4.2));
        O.raf = requestAnimationFrame(loop);
      };
      loop();
    }
  }
  function ligar() {
    if (!window.isSecureContext) { onEstado('erro', 'O microfone só funciona em conexão segura (https).'); return false; }
    if (!window.WebSocket || !window.AudioWorkletNode) { onEstado('erro', 'Este navegador não consegue mandar o áudio para a transcrição. Use o Chrome ou o Edge.'); return false; }
    Object.assign(O, { ligado: true, fatal: false, fila: [], tentativas: 0 });
    // o áudio começa a ser guardado na hora; a conexão abre em paralelo (~0,3 s) e recebe o que ficou na fila
    iniciarAudio().catch((e) => { onEstado('erro', e && e.name === 'NotAllowedError' ? mensagemErro('not-allowed') : 'Não consegui abrir o microfone.'); desligar(true); });
    conectar().catch((e) => { onEstado('erro', e.message); desligar(true); });
    return true;
  }
  function desligar(silencioso) {
    const ws = O.ws;
    O.ligado = false; O.ws = null;
    if (O.raf) cancelAnimationFrame(O.raf);
    if (O.ac) O.ac.close().catch(() => {});
    if (O.proprio && O.stream) O.stream.getTracks().forEach((t) => t.stop());
    O.ac = null; O.stream = null;
    try { if (ws) ws.close(); } catch { /* já fechado */ }
    if (onNivel) onNivel(0);
    onEstado('parado', silencioso ? null : 'Parou de ouvir.');
  }
  return { ligar, desligar, get ligado() { return O.ligado; }, recortar() { return null; }, scribe: true };
}

// Reunião simulada: parciais palavra por palavra e final a cada fala, como o reconhecedor de verdade.
// Depois de uma pergunta da outra pessoa, "você" demora um pouco para responder (tempo de ler o copiloto).
export function simular(falas, { vel, onParcial, onFinal, onFim }) {
  let i = 0, w = 0, timer = null, parado = false, pausado = false;
  function passo() {
    if (parado || pausado) return;
    if (i >= falas.length) { if (onFim) onFim(); return; }
    const f = falas[i];
    const P = f.t.split(/\s+/);
    w++;
    if (w >= P.length) {
      onFinal(f.t, f, i);
      const prox = falas[i + 1];
      const espera = 850 + Math.random() * 250 + (prox && prox.q === 'v' && f.q === 'o' && /\?\s*$/.test(f.t) ? 2600 : prox && prox.q === 'v' && f.q === 'o' ? 1300 : 0);
      i++; w = 0;
      timer = setTimeout(passo, espera / vel());
      return;
    }
    onParcial(P.slice(0, w).join(' '), f, i, w, P.length);
    const ult = P[w - 1];
    const extra = /[,;:]$/.test(ult) ? 230 : /[.?!]$/.test(ult) ? 330 : 0;
    timer = setTimeout(passo, (175 + extra + Math.random() * 70) / vel());
  }
  timer = setTimeout(passo, 500);
  return {
    parar() { parado = true; clearTimeout(timer); },
    pausar() { if (!parado) { pausado = true; clearTimeout(timer); } },
    continuar() { if (parado || !pausado) return; pausado = false; timer = setTimeout(passo, 250); },
    get ativo() { return !parado && i < falas.length; },
    get pausado() { return pausado; },
  };
}

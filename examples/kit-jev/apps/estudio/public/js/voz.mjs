// Voz: microfone (Web Speech API do navegador, pt-BR, parciais ao vivo) e "Simular fala", que emite parciais
// palavra por palavra pelo MESMO caminho do microfone (onTexto(final, parcial)).
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export function mensagemErro(err) {
  return ({
    'not-allowed': 'O navegador bloqueou o microfone. Libere o acesso no cadeado da barra de endereço e tente de novo — ou use Simular fala.',
    'service-not-allowed': 'O reconhecimento de voz não está liberado neste navegador. Use o Chrome, o Edge ou o Safari — ou use Simular fala.',
    'audio-capture': 'Nenhum microfone encontrado. Conecte um microfone ou use Simular fala.',
    network: 'O reconhecimento de voz do navegador precisa de internet e falhou agora. Tente de novo ou use Simular fala.',
    'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
  })[err] || `O microfone parou (${err}). Tente de novo ou use Simular fala.`;
}

export function criarMicrofone({ onTexto, onEstado, onNivel }) {
  const M = { ligado: false, rec: null, fatal: false, anteriores: '', sessao: '', medidor: null };

  async function iniciarMedidor() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!M.ligado) { stream.getTracks().forEach((t) => t.stop()); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser(); an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let raf;
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        onNivel && onNivel(Math.min(1, Math.sqrt(s / buf.length) * 4.2));
        raf = requestAnimationFrame(loop);
      };
      loop();
      M.medidor = { parar() { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ac.close().catch(() => {}); } };
    } catch { /* sem medidor: segue só com o reconhecimento */ }
  }

  function ligar() {
    if (M.ligado) return desligar();
    if (!SR) { onEstado('erro', 'Este navegador não tem reconhecimento de voz (o Firefox não tem). Use o Chrome, o Edge ou o Safari — ou use Simular fala, ou digite abaixo.'); return false; }
    if (!window.isSecureContext) { onEstado('erro', 'O microfone só funciona em conexão segura (https).'); return false; }
    let rec;
    try { rec = new SR(); } catch { onEstado('erro', 'Não consegui iniciar o reconhecimento de voz neste navegador.'); return false; }
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onstart = () => { if (M.rec === rec) onEstado('ouvindo'); };
    rec.onresult = (e) => {
      if (M.rec !== rec) return;
      let fin = '', par = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript + ' '; else par += r[0].transcript;
      }
      M.sessao = fin;
      onTexto((M.anteriores + ' ' + fin).replace(/\s+/g, ' ').trim(), par.trim());
    };
    rec.onerror = (e) => {
      if (M.rec !== rec) return;
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      M.fatal = true;
      onEstado('erro', mensagemErro(e.error));
      desligar(true);
    };
    rec.onend = () => {
      if (M.rec !== rec) return;
      M.anteriores = (M.anteriores + ' ' + M.sessao).replace(/\s+/g, ' ').trim(); M.sessao = '';
      if (M.ligado && !M.fatal) { try { rec.start(); } catch { desligar(true); } }
    };
    Object.assign(M, { ligado: true, rec, fatal: false, anteriores: '', sessao: '' });
    try { rec.start(); } catch { M.fatal = true; onEstado('erro', 'Não foi possível ligar o microfone neste navegador.'); desligar(true); return false; }
    iniciarMedidor();
    return true;
  }

  function desligar(silencioso) {
    const rec = M.rec;
    M.ligado = false; M.rec = null;
    if (M.medidor) { M.medidor.parar(); M.medidor = null; }
    try { rec && rec.stop(); } catch { /* já parado */ }
    onNivel && onNivel(0);
    onEstado('parado', silencioso ? null : 'Microfone desligado.');
  }

  return { ligar, desligar, get ligado() { return M.ligado; } };
}

// Fala simulada: parciais palavra por palavra, finais a cada fim de frase (como o reconhecedor de verdade).
export function simularFala(texto, { onTexto, onNivel, onFim, velocidade = 1 }) {
  const frases = String(texto).match(/[^.!?]+[.!?]*/g) || [texto];
  let f = 0, w = 0, final = '', timer = null, parado = false, pausado = false;
  const palavras = () => frases[f].trim().split(/\s+/);
  function passo() {
    if (parado || pausado) return;
    if (f >= frases.length) { onNivel && onNivel(0); onFim && onFim(); return; }
    const P = palavras();
    w++;
    const parcial = P.slice(0, w).join(' ');
    const ultima = P[w - 1] || '';
    onNivel && onNivel(0.35 + Math.random() * 0.55);
    if (w >= P.length) {
      final = (final + ' ' + parcial).trim();
      onTexto(final, '');
      f++; w = 0;
      timer = setTimeout(passo, 520 / velocidade);
      return;
    }
    onTexto(final, parcial);
    const extra = /[,;:]$/.test(ultima) ? 230 : 0;
    timer = setTimeout(passo, (190 + extra + Math.random() * 60) / velocidade);
    setTimeout(() => { if (!parado) onNivel && onNivel(0.12); }, 110 / velocidade);
  }
  timer = setTimeout(passo, 250);
  return {
    parar() { parado = true; clearTimeout(timer); onNivel && onNivel(0); },
    pausar() { pausado = true; clearTimeout(timer); },
    continuar() { if (parado || !pausado) return; pausado = false; timer = setTimeout(passo, 200); },
    get ativo() { return !parado && f < frases.length; },
  };
}

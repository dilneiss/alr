// Voz dos apps "ao vivo" (motor palco): microfone do navegador (Web Speech API, pt-BR, parciais enquanto você fala),
// digitação que vale como fala e fala simulada — a demonstração passa pelo MESMO caminho do microfone.
import { el } from './ui.js';

export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/></svg>';
const TECLADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/></svg>';

export function mensagemErro(err) {
  return ({
    'not-allowed': 'O navegador bloqueou o microfone. Libere no cadeado da barra de endereço — ou use os exemplos, ou digite.',
    'service-not-allowed': 'O reconhecimento de voz não está liberado neste navegador. Use o Chrome, o Edge ou o Safari — ou digite.',
    'audio-capture': 'Nenhum microfone encontrado. Conecte um microfone — ou use os exemplos, ou digite.',
    network: 'O reconhecimento de voz do navegador precisa de internet e falhou agora. Tente de novo — ou digite.',
    'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
  })[err] || `O microfone parou (${err}). Tente de novo — ou digite.`;
}

// Microfone com reconhecimento contínuo. onTexto(final, parcial): final = tudo o que já foi fechado desde ligar().
// medidor: false não abre o 2º getUserMedia do medidor de volume (para o app que já grava o próprio áudio: no Safari do
// iPhone, duas capturas podem derrubar a gravação)
export function criarMicrofone({ onTexto, onEstado, onNivel, medidor = true }) {
  const M = { ligado: false, rec: null, fatal: false, anteriores: '', sessao: '', medidor: null };

  async function iniciarMedidor() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!M.ligado) { stream.getTracks().forEach((t) => t.stop()); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const an = ac.createAnalyser(); an.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(an);
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
    if (M.ligado) return true;
    if (!SR) { onEstado('erro', 'Este navegador não tem reconhecimento de voz (o Firefox não tem). Use o Chrome, o Edge ou o Safari — ou digite.'); return false; }
    if (!window.isSecureContext) { onEstado('erro', 'O microfone só funciona em conexão segura (https ou localhost).'); return false; }
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
      onTexto((M.anteriores + ' ' + fin).replace(/\s+/g, ' ').trim(), par.replace(/\s+/g, ' ').trim());
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
      else if (M.rec === rec) M.rec = null;   // desligar({ esperarFinal }): o último final já chegou
    };
    Object.assign(M, { ligado: true, rec, fatal: false, anteriores: '', sessao: '' });
    try { rec.start(); } catch { M.fatal = true; onEstado('erro', 'Não foi possível ligar o microfone neste navegador.'); desligar(true); return false; }
    if (medidor) iniciarMedidor();
    return true;
  }

  // esperarFinal: o reconhecedor ainda entrega a última frase (até 1,5 s) em vez de descartá-la
  function desligar(silencioso, { esperarFinal = false } = {}) {
    const rec = M.rec;
    M.ligado = false;
    if (esperarFinal && rec) setTimeout(() => { if (M.rec === rec) M.rec = null; }, 1500); else M.rec = null;
    if (M.medidor) { M.medidor.parar(); M.medidor = null; }
    try { rec && rec.stop(); } catch { /* já parado */ }
    onNivel && onNivel(0);
    onEstado('parado', silencioso ? null : 'Microfone desligado.');
  }

  return { ligar, desligar, get ligado() { return M.ligado; } };
}

// Fala simulada: parciais palavra por palavra e um final a cada fim de frase, como o reconhecedor de verdade.
export function simularFala(texto, { onTexto, onNivel, onFim, velocidade = 1 }) {
  const frases = String(texto).match(/(?:\d\.\d|[^.!?…])+[.!?…]*/g) || [String(texto)];   // "1.200" não fecha frase
  let f = 0, w = 0, final = '', timer = null, parado = false;
  const palavras = () => frases[f].trim().split(/\s+/).filter(Boolean);
  function passo() {
    if (parado) return;
    if (f >= frases.length) { onNivel && onNivel(0); onFim && onFim(); return; }
    const P = palavras();
    if (!P.length) { f++; return passo(); }
    w++;
    const parcial = P.slice(0, w).join(' ');
    const ultima = P[w - 1] || '';
    onNivel && onNivel(0.35 + Math.random() * 0.55);
    if (w >= P.length) {
      final = (final + ' ' + parcial).trim();
      onTexto(final, '');
      f++; w = 0;
      timer = setTimeout(passo, 560 / velocidade);
      return;
    }
    onTexto(final, parcial);
    const extra = /[,;:]$/.test(ultima) ? 260 : 0;
    timer = setTimeout(passo, (200 + extra + Math.random() * 70) / velocidade);
    setTimeout(() => { if (!parado) onNivel && onNivel(0.12); }, 110 / velocidade);
  }
  timer = setTimeout(passo, 250);
  return { parar() { parado = true; clearTimeout(timer); onNivel && onNivel(0); }, get ativo() { return !parado && f < frases.length; } };
}

// Barra de voz pronta: microfone, o que você está dizendo (final + parcial), campo para digitar e exemplos.
//   onTexto(final, parcial)     → a cada mudança
//   onPausa(texto, {final, parcial}) → numa pausa curta da fala (ou da digitação): é a hora de perguntar ao Jev
//                                 (parcial vazio = a frase já fechou)
//   onFrase(frase)              → cada frase que o reconhecedor fechou (ou Enter no campo)
//   onExemplo(texto, ex)        → antes de "falar" um exemplo clicado (ex.: limpar() para começar uma rodada nova);
//                                 devolva false para não falar
//   onNivel(v)                  → volume da voz, de 0 a 1 (microfone ou fala simulada), várias vezes por segundo
export function barraVoz({ exemplos = [], dica = 'Aperte o microfone e fale — ou digite', placeholder = 'Digite e aperte Enter', pausaMs = 380, onTexto, onPausa, onFrase, onExemplo, onNivel, rotuloExemplos = 'Exemplos' } = {}) {
  // final = o que já fechou desde o último limpar(); prefixo = o que já existia quando a fonte atual (microfone ou fala
  // simulada) começou; o microfone devolve o texto acumulado da sessão, então micBase guarda o que veio antes de limpar()
  let final = '', parcial = '', ultimaPausa = '', tPausa = null, sim = null, prefixo = '', micBase = '', micTotal = '';
  const junta = (a, b) => (a + ' ' + b).replace(/\s+/g, ' ').trim();
  const nivel = el('span', { class: 'mj-voz-nivel', 'aria-hidden': 'true' });
  const btMic = el('button', { class: 'mj-voz-mic', type: 'button', 'aria-label': 'Ligar o microfone', 'aria-pressed': 'false', title: 'Falar' }, [nivel, el('span', { class: 'mj-voz-ic', html: MIC })]);
  const fin = el('span', { class: 'fin' }), par = el('span', { class: 'par' });
  const linha = el('p', { class: 'mj-voz-linha', 'aria-live': 'polite' }, [fin, par]);
  const estado = el('p', { class: 'mj-voz-estado', text: dica });
  const campo = el('input', { class: 'mj-voz-campo', type: 'text', placeholder, 'aria-label': 'Digite o que você falaria', autocomplete: 'off', enterkeyhint: 'send' });
  const btTec = el('button', { class: 'mj-voz-tec', type: 'button', title: 'Digitar em vez de falar', 'aria-label': 'Digitar em vez de falar', html: TECLADO });
  const botaoEx = (ex) => el('button', {
    class: 'mj-voz-ex', type: 'button', title: 'Simular esta fala',
    text: typeof ex === 'string' ? ex : (ex.rotulo || ex.texto),
    onclick: () => { const t = typeof ex === 'string' ? ex : ex.texto; if (onExemplo && onExemplo(t, ex) === false) return; simular(t); },
  });
  const lista = el('div', { class: 'mj-voz-ex-lista' }, exemplos.map(botaoEx));
  const exWrap = el('div', { class: 'mj-voz-ex-wrap' }, [el('span', { class: 'mj-voz-ex-t', text: rotuloExemplos }), lista]);
  if (!exemplos.length) exWrap.style.display = 'none';
  const no = el('div', { class: 'mj-voz' }, [
    btMic,
    el('div', { class: 'mj-voz-meio' }, [linha, estado]),
    el('div', { class: 'mj-voz-lado' }, [el('div', { class: 'mj-voz-digitar' }, [btTec, campo]), exWrap]),
  ]);

  function desenhar() {
    const t = final.length > 220 ? '…' + final.slice(-220) : final;
    fin.textContent = t ? t + (parcial ? ' ' : '') : '';
    par.textContent = parcial;
    no.classList.toggle('tem-texto', !!(final || parcial));
    linha.scrollTop = linha.scrollHeight;   // a linha mostra 2 linhas: as palavras mais novas ficam à vista
  }

  function pausa() {
    clearTimeout(tPausa); tPausa = null;
    const t = (final + ' ' + parcial).replace(/\s+/g, ' ').trim();
    if (!t || t === ultimaPausa) return;
    ultimaPausa = t;
    onPausa && onPausa(t, { final, parcial });
  }

  // fin = tudo o que já fechou desde o último limpar(); par = o que ainda está sendo dito
  function receber(novoFinal, novoParcial) {
    const antes = final;
    final = novoFinal.replace(/\s+/g, ' ').trim();
    parcial = (novoParcial || '').replace(/\s+/g, ' ').trim();
    desenhar();
    onTexto && onTexto(final, parcial);
    if (final.length > antes.length && final.startsWith(antes)) {
      const frase = final.slice(antes.length).trim();
      if (frase) onFrase && onFrase(frase);
      pausa();
    } else {
      clearTimeout(tPausa); tPausa = setTimeout(pausa, pausaMs);
    }
  }

  function setEstado(tipo, msg) {
    no.classList.toggle('ouvindo', tipo === 'ouvindo');
    no.classList.toggle('erro', tipo === 'erro');
    btMic.setAttribute('aria-pressed', String(tipo === 'ouvindo'));
    btMic.setAttribute('aria-label', tipo === 'ouvindo' ? 'Desligar o microfone' : 'Ligar o microfone');
    estado.textContent = tipo === 'ouvindo' ? 'Ouvindo… fale à vontade' : (msg || dica);
  }

  const mic = criarMicrofone({
    onTexto: (f, p) => {
      micTotal = f;
      const desde = f.startsWith(micBase) ? f.slice(micBase.length) : f;
      receber(junta(prefixo, desde), p);
    },
    onEstado: setEstado,
    onNivel: (v) => { no.style.setProperty('--mj-voz-n', v.toFixed(3)); onNivel && onNivel(v); },
  });

  function ligarMic() {
    pararSim();
    if (mic.ligado) return true;
    prefixo = final; micBase = ''; micTotal = '';
    return mic.ligar();
  }

  btMic.addEventListener('click', () => { if (mic.ligado) mic.desligar(); else ligarMic(); });
  btTec.addEventListener('click', () => { no.classList.add('digitando'); campo.focus(); });
  campo.addEventListener('input', () => {
    parcial = campo.value.trim(); desenhar(); onTexto && onTexto(final, parcial);
    clearTimeout(tPausa); tPausa = setTimeout(pausa, Math.max(pausaMs, 520));
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const t = campo.value.trim(); campo.value = '';
    if (!t) return;
    parcial = '';
    receber(junta(final, t), '');
  });

  function pararSim() { if (sim) { sim.parar(); sim = null; } no.classList.remove('simulando'); }

  // fala simulada pelo mesmo caminho do microfone; devolve uma promessa que termina no fim da fala
  function simular(texto, { velocidade = 1, sinal } = {}) {
    pararSim();
    if (mic.ligado) mic.desligar(true);
    prefixo = final;
    return new Promise((ok, falha) => {
      sim = simularFala(texto, {
        velocidade,
        onTexto: (f, p) => receber(junta(prefixo, f), p),
        onNivel: (v) => { no.style.setProperty('--mj-voz-n', v.toFixed(3)); onNivel && onNivel(v); },
        onFim: () => { sim = null; no.classList.remove('simulando'); ok(); },
      });
      no.classList.add('simulando');
      if (sinal) {
        if (sinal.aborted) { pararSim(); falha(new DOMException('parou', 'AbortError')); return; }
        sinal.addEventListener('abort', () => { pararSim(); falha(new DOMException('parou', 'AbortError')); }, { once: true });
      }
    });
  }

  // começa uma rodada nova: esquece o que já foi dito (o microfone continua ligado, se estiver)
  function limpar() {
    clearTimeout(tPausa); tPausa = null;
    micBase = micTotal;
    final = ''; parcial = ''; ultimaPausa = ''; prefixo = '';
    campo.value = '';
    desenhar();
  }

  return {
    no,
    simular,
    limpar,
    ligar: ligarMic,
    desligar: () => mic.desligar(),
    parar: () => { pararSim(); if (mic.ligado) mic.desligar(true); },
    dica: (t) => { estado.textContent = t; },
    exemplos: (nova = []) => { lista.replaceChildren(...nova.map(botaoEx)); exWrap.style.display = nova.length ? '' : 'none'; },   // troca os exemplos
    get texto() { return (final + ' ' + parcial).replace(/\s+/g, ' ').trim(); },
    get final() { return final; },
    get ouvindo() { return mic.ligado; },
  };
}

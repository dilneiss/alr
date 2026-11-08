/**
 * Player de roteiro: módulo puro (sem DOM, sem fetch) para poder rodar no node e no navegador.
 *
 * Modo assistir: avança sozinho pelo temporizador — ou pelo palco, que chama `proxima()` quando a
 * voz termina de falar a frase. Modo ler: `receberFala(delta)` recebe o texto novo do microfone e
 * avança quando o que foi dito cobre a frase atual. Em ambos os caminhos a frase é consumida uma vez
 * só: temporizador atrasado e fala atrasada não podem fazer a mesma frase aparecer duas vezes.
 */

const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'que', 'com', 'para', 'na', 'no', 'um', 'uma', 'em', 'por', 'se', 'ao', 'mais', 'mas']);

const normalizar = (texto) => String(texto ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Palavras que valem para o reconhecimento: sem acento, 3+ letras, fora da lista vazia. */
export const palavrasChave = (texto) => normalizar(texto)
  .split(' ')
  .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p));

/** Quantas palavras-chave do alvo apareceram no que foi dito (detalhado). */
export function coberturaDetalhe(alvo, dito) {
  const quero = palavrasChave(alvo);
  if (!quero.length) return { quanto: 1, acertos: 0, total: 0 };
  const tem = new Set(palavrasChave(dito));
  const acertos = quero.filter((p) => tem.has(p)).length;
  return { quanto: acertos / quero.length, acertos, total: quero.length };
}

/** Quanto do alvo já apareceu no que foi dito (0..1). */
export function cobertura(alvo, dito) {
  return coberturaDetalhe(alvo, dito).quanto;
}

const palavrasDoTexto = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;

/** Duração confortável de leitura/fala: 150 ms por palavra, entre 1,6 s e 6 s. */
export const duracaoDaFrase = (frase) => Math.min(6000, Math.max(1600, palavrasDoTexto(frase) * 150));

export function criarPlayer({
  roteiro,
  aoFrase = () => {},
  aoFim = () => {},
  agendar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (h) => clearTimeout(h),
  coberturaMinima = 0.6,
  // assistir sem voz e os testes usam o temporizador; assistir com TTS e o modo ler dirigem por evento
  autoAvancar = true,
} = {}) {
  const frases = (roteiro?.frases || []).filter((f) => typeof f === 'string' && f.trim());
  const total = frases.length;
  let estado = 'idle';
  let indice = 0;
  let timer = null;
  const consumidas = new Set();
  let ditoAcumulado = '';

  const limparTimer = () => { if (timer !== null) { cancelar(timer); timer = null; } };

  // desligar de verdade: mata o temporizador e nenhum callback volta a tocar no palco
  let morto = false;
  const parar = () => { morto = true; limparTimer(); estado = 'parado'; };


  const encerrar = () => {
    limparTimer();
    if (morto) return;
    estado = 'fim';
    aoFim();
  };

  // Emite a frase atual uma única vez e (se for o caso) programa o avanço automático.
  const emitir = () => {
    if (morto) return;
    if (indice >= total) { encerrar(); return; }
    if (!consumidas.has(indice)) {
      consumidas.add(indice);
      aoFrase(frases[indice], indice);
    }
    limparTimer();
    if (autoAvancar) timer = agendar(avancar, duracaoDaFrase(frases[indice]));
  };

  const avancar = () => {
    limparTimer();
    if (morto || estado === 'parado') return;
    if (estado === 'pausado') return;
    if (estado === 'fim') return;
    indice += 1;
    if (indice >= total) { encerrar(); return; }
    emitir();
  };

  const tocar = () => {
    if (morto) return;
    if (estado === 'tocando') return;
    if (estado === 'fim' || indice >= total) return;
    estado = 'tocando';
    emitir();
  };

  const pausar = () => {
    if (estado !== 'tocando') return;
    limparTimer();
    estado = 'pausado';
  };

  const retomar = () => {
    if (estado !== 'pausado') return;
    estado = 'tocando';
    limparTimer();
    if (autoAvancar) timer = agendar(avancar, duracaoDaFrase(frases[indice] || ''));
  };

  /** Avanço manual (botão "Próxima", fim da fala, timeout de segurança). Idempotente por frase. */
  const proxima = (indiceEsperado) => {
    if (morto) return false;
    if (estado === 'fim' || indice >= total) return false;
    // dois gatilhos para o mesmo passo (onend do TTS + timeout de segurança) não podem pular frase:
    // chame proxima(indiceDaFrase) e só o primeiro passa; o atrasado cai aqui
    if (indiceEsperado !== undefined && indiceEsperado !== indice) return false;
    if (estado === 'idle') { tocar(); return true; }
    avancar();
    return true;
  };

  /**
   * Texto novo vindo do microfone. Só a frase atual pode ser concluída por fala, e uma frase já
   * consumida nunca é reaberta — repetir a mesma coisa não faz a história voltar.
   */
  const receberFala = (texto) => {
    if (morto || estado === 'fim' || total === 0) return false;
    const pedaco = normalizar(texto);
    if (!pedaco) return false;
    ditoAcumulado = (ditoAcumulado + ' ' + pedaco).trim();
    const alvo = frases[indice] || '';
    const { quanto, acertos, total: quantasChave } = coberturaDetalhe(alvo, ditoAcumulado);
    // cobertura alta sozinha não basta: uma palavra só ("menina") não pode consumir a frase inteira
    if (acertos < Math.min(2, quantasChave)) return false;
    if (quanto < coberturaMinima) return false;
    ditoAcumulado = '';
    // primeira frase: a fala só dá o start (ela aparece e toca normalmente)
    if (estado === 'idle') { tocar(); return true; }
    avancar();
    return true;
  };

  /** Chamado quando a sessão recomeça (nova história): apaga o texto dito, mantém o roteiro. */
  const zerarEscuta = () => { ditoAcumulado = ''; };

  const descrever = () => ({
    estado,
    indice,
    total,
    frase: frases[indice] || null,
    progresso: total ? Math.min(1, (indice + (estado === 'fim' ? 0 : 0)) / total) : 0,
  });

  return { tocar, pausar, retomar, proxima, receberFala, zerarEscuta, parar, estado: descrever, total, frases };
}

/**
 * Player de roteiro: módulo puro (sem DOM, sem fetch, sem voz) para rodar no node e no navegador.
 *
 * Ele NÃO narra e NÃO anda sozinho: emite a frase atual uma vez (para o teleprompter e para a cena),
 * e só avança quando o palco manda — pela fala reconhecida do microfone (`receberFala`) ou pelo
 * botão "Próxima frase" (`proxima`). Assim a história nunca conta por cima de quem está lendo.
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

export function criarPlayer({
  roteiro,
  aoFrase = () => {},
  aoFim = () => {},
  coberturaMinima = 0.6,
} = {}) {
  const frases = (roteiro?.frases || []).filter((f) => typeof f === 'string' && f.trim());
  const total = frases.length;
  let estado = 'idle';
  let indice = 0;
  let morto = false;
  const consumidas = new Set();
  let ditoAcumulado = '';

  const encerrar = () => {
    if (morto) return;
    estado = 'fim';
    aoFim();
  };

  // Emite a frase atual uma única vez; quem avança é o palco.
  const emitir = () => {
    if (morto) return;
    if (indice >= total) { encerrar(); return; }
    if (!consumidas.has(indice)) {
      consumidas.add(indice);
      aoFrase(frases[indice], indice);
    }
  };

  const avancar = () => {
    if (morto) return;
    indice += 1;
    if (indice >= total) { encerrar(); return; }
    emitir();
  };

  const tocar = () => {
    if (morto || estado === 'tocando') return;
    if (estado === 'fim' || indice >= total) return;
    estado = 'tocando';
    emitir();
  };

  /** Desliga de verdade: nenhum callback volta a mexer no palco. */
  const parar = () => { morto = true; estado = 'parado'; };

  /** Avanço manual. Com `indiceEsperado`, gatilho atrasado é ignorado (não pula frase). */
  const proxima = (indiceEsperado) => {
    if (morto) return false;
    if (estado === 'fim' || indice >= total) return false;
    if (indiceEsperado !== undefined && indiceEsperado !== indice) return false;
    if (estado === 'idle') { tocar(); return true; }
    avancar();
    return true;
  };

  /**
   * Texto novo vindo do microfone. Só a frase atual pode ser concluída por fala, uma vez, e com
   * pelo menos duas palavras-chave casadas — repetir a frase antiga não faz a história voltar.
   */
  const receberFala = (texto) => {
    if (morto || estado === 'fim' || total === 0) return false;
    const pedaco = normalizar(texto);
    if (!pedaco) return false;
    ditoAcumulado = (ditoAcumulado + ' ' + pedaco).trim();
    const alvo = frases[indice] || '';
    const { quanto, acertos, total: quantasChave } = coberturaDetalhe(alvo, ditoAcumulado);
    if (acertos < Math.min(2, quantasChave)) return false;
    if (quanto < coberturaMinima) return false;
    ditoAcumulado = '';
    if (estado === 'idle') { tocar(); return true; }   // a fala só dá o start
    avancar();
    return true;
  };

  /** Recomeço da escuta: apaga só o texto dito, mantém o roteiro e a frase atual. */
  const zerarEscuta = () => { ditoAcumulado = ''; };

  const descrever = () => ({
    estado,
    indice,
    total,
    frase: frases[indice] || null,
  });

  return { tocar, proxima, receberFala, zerarEscuta, parar, estado: descrever, total, frases };
}

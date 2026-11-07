// Utilidades das ferramentas (Node): leitura das opções de uma decisão sem depender do navegador.
export function listaOpcoesNode(dec, spec) {
  const ctx = typeof spec.contexto === 'function' ? spec.contexto() : (spec.contexto || {});
  let op = typeof dec.opcoes === 'function' ? dec.opcoes(ctx, {}) : dec.opcoes;
  if (!op) return [];
  if (!Array.isArray(op)) op = Object.entries(op).map(([id, desc]) => ({ id, desc }));
  return op;
}

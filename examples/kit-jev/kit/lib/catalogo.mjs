// Catálogo dos 100 apps (catalogo/catalogo.json): busca, seleção por número, id ou categoria e a conta de memória.
import path from 'node:path';
import { RAIZ, lerJson, ErroKit } from './util.mjs';

const CAT = lerJson(path.join(RAIZ, 'catalogo', 'catalogo.json'), null);
if (!CAT) throw new ErroKit('sem_catalogo', 'catalogo/catalogo.json não encontrado: a pasta do kit está incompleta.');

export const APPS = CAT.apps;
export const CATEGORIAS = CAT.categorias;
const POR_ID = new Map(APPS.map((a) => [a.id, a]));

// Memória que a base sempre usa (Caddy, login, gateway, hub) e a do servidor que hospeda os modelos
export const RAM_BASE_MB = CAT.ram.base_mb;
export const RAM_MODELOS_MB = CAT.ram.modelos_mb;

export const porId = (id) => POR_ID.get(id) || null;
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function buscar(texto) {
  const q = semAcento(texto).split(/\s+/).filter(Boolean);
  if (!q.length) return APPS;
  return APPS.filter((a) => {
    const alvo = semAcento([a.id, a.titulo, a.resumo, a.categoria_nome, (a.marcas || []).join(' '), a.motor || '', a.entrada || ''].join(' '));
    return q.every((p) => alvo.includes(p));
  });
}

// Aceita: todos · obras · modelos · leves · categoria:<id> · 7 · 18-27 · ids (separados por espaço ou vírgula)
export function resolverSelecao(termos) {
  const ids = new Set(), desconhecidos = [];
  for (const bruto of termos.flatMap((t) => String(t).split(',')).map((t) => t.trim()).filter(Boolean)) {
    const t = semAcento(bruto);
    if (t === 'todos' || t === 'tudo') APPS.forEach((a) => ids.add(a.id));
    else if (t === 'obras' || t === 'grandes') APPS.filter((a) => a.tipo === 'obra').forEach((a) => ids.add(a.id));
    else if (t === 'modelos') APPS.filter((a) => a.tipo === 'modelo').forEach((a) => ids.add(a.id));
    else if (t === 'leves') APPS.filter((a) => !a.pesado).forEach((a) => ids.add(a.id));
    else if (t.startsWith('categoria:')) {
      const c = t.slice(10);
      const achou = APPS.filter((a) => a.categoria === c);
      if (!achou.length) desconhecidos.push(bruto); else achou.forEach((a) => ids.add(a.id));
    } else if (/^\d+-\d+$/.test(t)) {
      const [a, b] = t.split('-').map(Number);
      for (let n = Math.min(a, b); n <= Math.max(a, b); n++) { const x = APPS.find((y) => y.n === n); if (x) ids.add(x.id); }
    } else if (/^\d+$/.test(t)) {
      const x = APPS.find((y) => y.n === +t); if (x) ids.add(x.id); else desconhecidos.push(bruto);
    } else if (POR_ID.has(t)) ids.add(t);
    else desconhecidos.push(bruto);
  }
  return { ids: APPS.filter((a) => ids.has(a.id)).map((a) => a.id), desconhecidos };
}

export function estimarRam(ids, { stt = false } = {}) {
  const lista = ids.map(porId).filter(Boolean);
  let mb = RAM_BASE_MB;
  if (lista.some((a) => a.tipo === 'modelo')) mb += RAM_MODELOS_MB;
  for (const a of lista) if (a.tipo === 'obra') mb += a.ram_mb;
  if (stt && ids.includes('cluely')) mb += 700;
  return mb;
}

// Planos de VPS da Hostinger (memória em MB) e o mínimo que o kit aceita para a seleção
export const PLANOS = [
  { nome: 'KVM 1', ram_mb: 4096 }, { nome: 'KVM 2', ram_mb: 8192 }, { nome: 'KVM 4', ram_mb: 16384 }, { nome: 'KVM 8', ram_mb: 32768 },
];
export function planoMinimo(mbUsados) {
  // folga: o sistema, o Docker e os picos de build usam o resto
  return PLANOS.find((p) => mbUsados <= p.ram_mb * 0.7) || PLANOS[PLANOS.length - 1];
}

export function linhaApp(a) {
  const extras = [a.pesado ? 'pesado' : '', a.entrada ? { voz: 'voz', camera: 'câmera', jogo: 'jogo' }[a.entrada] || a.entrada : '', ...(a.precisa || [])].filter(Boolean);
  return `${String(a.n).padStart(3)}  ${a.emoji} ${a.titulo} (${a.id})${extras.length ? ` [${extras.join(', ')}]` : ''}`;
}

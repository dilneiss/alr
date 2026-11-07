// Junta os pacotes de conteúdo por segmento (textos que o código busca DEPOIS que o Jev escolhe o segmento).
import base from './seg-base.mjs';
import a from './seg-a.mjs';
import b from './seg-b.mjs';
import c from './seg-c.mjs';
import { SEGMENTOS } from './biblioteca.mjs';

const todos = { ...base, ...a, ...b, ...c };
export const PACOTES = Object.fromEntries(SEGMENTOS.map((s) => [s.id, todos[s.id] || todos.outro]));
export const FALTANDO = SEGMENTOS.map((s) => s.id).filter((id) => !todos[id]);

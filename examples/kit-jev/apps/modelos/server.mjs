// Modelos do Jev — um servidor só para todos os apps-modelo (jev.<seu domínio>/m/<id>/).
// Cada app é um arquivo public/<id>/app.config.mjs; o motor (public/_motor/) monta a tela e este servidor
// monta as perguntas a partir do modelo e chama o Jev pelo gateway (a chave fica só no gateway).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApp, callJev, HttpError } from '../../shared/server/kit.mjs';
import { montar, conferirModelo, ErroEntrada } from './lib/decidir.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
let NUMEROS = {};   // número de cada modelo no catálogo do kit (numeros.json)
try { NUMEROS = JSON.parse(fs.readFileSync(path.join(DIR, 'numeros.json'), 'utf8')); } catch { /* sem números: o hub numera */ }
const PUB = path.join(DIR, 'public');
const app = createApp({ name: 'modelos', publicDir: new URL('./public/', import.meta.url), maxBody: 120_000 });

// ---------- carrega e confere os modelos (recarrega quando o arquivo muda: dá para criar e editar sem reiniciar) ----------
const modelos = new Map();
const problemas = {};
const versao = {};
async function carregar(id) {
  const arq = path.join(PUB, id, 'app.config.mjs');
  let st; try { st = fs.statSync(arq); } catch { modelos.delete(id); delete problemas[id]; return null; }
  if (versao[id] === st.mtimeMs && modelos.has(id)) return modelos.get(id);
  versao[id] = st.mtimeMs;
  try {
    const spec = (await import(pathToFileURL(arq).href + '?v=' + st.mtimeMs)).default;
    const p = conferirModelo(spec);
    if (spec.id !== id) p.push(`id "${spec.id}" diferente da pasta "${id}"`);
    if (p.length) problemas[id] = p; else delete problemas[id];
    modelos.set(id, spec);
    return spec;
  } catch (e) {
    problemas[id] = ['não carregou: ' + e.message]; modelos.delete(id);
    return null;
  }
}
async function carregarTodos() {
  const ids = fs.readdirSync(PUB).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(PUB, d, 'app.config.mjs')));
  for (const id of ids) await carregar(id);
  for (const id of [...modelos.keys()]) if (!ids.includes(id)) modelos.delete(id);
}
await carregarTodos();
console.log(`[modelos] ${modelos.size} modelos carregados` + (Object.keys(problemas).length ? `; com problemas: ${Object.keys(problemas).join(', ')}` : ''));
for (const [id, p] of Object.entries(problemas)) console.log(`  · ${id}: ${p.join(' | ')}`);

function resumo(spec) {
  return {
    id: spec.id, titulo: spec.titulo, emoji: spec.emoji, categoria: spec.categoria, resumo: spec.resumo,
    descricao: spec.descricao, marcas: spec.marcas || [], motor: spec.motor, acento: spec.tema && spec.tema.acento,
    ordem: spec.ordem ?? 999, n: NUMEROS[spec.id] || null, origem: spec.origem || null, entrada: (spec.palco && spec.palco.entrada) || null,
  };
}

app.get('/catalogo.json', async () => (await carregarTodos(), {
  ok: true, total: modelos.size,
  apps: [...modelos.values()].filter((s) => !problemas[s.id]).map(resumo).sort((a, b) => (a.ordem - b.ordem) || a.titulo.localeCompare(b.titulo, 'pt-BR')),
}));
app.get('/_problemas.json', async () => (await carregarTodos(), { ok: true, problemas }));

// /<id> sem barra no fim: redireciona para /<id>/ (endereço relativo, funciona atrás do /m/ do Caddy)
app.get(/^\/(?<id>[a-z0-9-]+)$/, async ({ params, res }) => {
  if (!(await carregar(params.id))) throw new HttpError(404, 'App não encontrado');
  res.writeHead(301, { Location: `${params.id}/` }); res.end();
});

app.post('/:id/api/decidir', async ({ params, body, ip }) => {
  const spec = await carregar(params.id);
  if (!spec) throw new HttpError(404, 'App não encontrado');
  if (problemas[params.id]) throw new HttpError(503, 'Este app ainda está em montagem.');
  let m;
  try { m = montar(spec, body || {}); }
  catch (e) { if (e instanceof ErroEntrada) throw new HttpError(400, e.message, 'bad_request'); throw e; }
  const r = await callJev({ app: 'm-' + spec.id, ip, state: m.state, questions: m.questions, cache: !!spec.cache });
  return { ok: true, ...m.ler(r.answers), latencia_ms: r.latency_ms, custo: r.cost, _jev: r.debug };
}, { rate: 120 });

app.start(+(process.env.PORT || 4120));

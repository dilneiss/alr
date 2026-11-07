// Exporta um app para usar em outro projeto: uma pasta que roda sozinha (node server.mjs ou node iniciar.mjs) com a
// chave do OpenRouter de quem exportou. Leva o carimbo do portão: sem ele, o servidor do app não sobe.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, ErroKit, agora, VERSAO } from './util.mjs';
import { lerPortao } from './portao.mjs';
import { porId } from './catalogo.mjs';

const APPS = path.join(RAIZ, 'apps');
const PLAT = path.join(RAIZ, 'plataforma');
const IGNORAR = new Set(['node_modules', '.git', 'data-runtime', 'test', '.DS_Store']);

function copiarPasta(de, para) {
  fs.mkdirSync(para, { recursive: true });
  for (const nome of fs.readdirSync(de)) {
    if (IGNORAR.has(nome)) continue;
    const a = path.join(de, nome), b = path.join(para, nome);
    if (fs.statSync(a).isDirectory()) copiarPasta(a, b); else fs.copyFileSync(a, b);
  }
}

export function carimbo(estado) {
  const p = lerPortao();
  const vps = (p?.vps || []).find((v) => String(v.id) === String(estado.escolhas.vps?.id)) || (p?.vps || [])[0];
  if (!p?.ok || !vps) throw new ErroKit('portao_fechado', 'Portão fechado: rode "node kit/jev-kit.mjs portao" antes de exportar.', 3);
  return JSON.stringify({ ok: true, fonte: 'api-hostinger', uso: 'exportado', vps_id: vps.id, ip: vps.ip, hostname: vps.hostname, ptr: vps.ptr, verificado_em: p.verificado_em, exportado_em: agora(), kit_versao: VERSAO }, null, 1) + '\n';
}

const ENV_EXEMPLO = 'OPENROUTER_API_KEY=cole-aqui-a-sua-chave-do-openrouter\n# PORT=3000\n';

async function exportarModelo(id, destino, estado) {
  const M = path.join(APPS, 'modelos');
  const { paginaApp } = await import(pathToFileURL(path.join(M, 'tools', 'gerar.mjs')).href);
  const { readmeDoModelo } = await import(pathToFileURL(path.join(M, 'tools', 'readme-modelo.mjs')).href);
  const spec = (await import(pathToFileURL(path.join(M, 'public', id, 'app.config.mjs')).href + `?v=${Date.now()}`)).default;
  fs.rmSync(destino, { recursive: true, force: true });
  copiarPasta(path.join(M, 'public', id), path.join(destino, 'public'));
  fs.rmSync(path.join(destino, 'public', 'index.html'), { force: true });
  fs.writeFileSync(path.join(destino, 'public', 'index.html'), paginaApp(spec, { motor: './motor/', hosted: false }));
  copiarPasta(path.join(M, 'public', '_motor'), path.join(destino, 'public', 'motor'));
  fs.copyFileSync(path.join(M, 'standalone', 'server.mjs'), path.join(destino, 'server.mjs'));
  fs.copyFileSync(path.join(M, 'lib', 'decidir.mjs'), path.join(destino, 'decidir.mjs'));
  fs.writeFileSync(path.join(destino, '.env.exemplo'), ENV_EXEMPLO);
  fs.writeFileSync(path.join(destino, 'README.md'), readmeDoModelo(spec));
  fs.writeFileSync(path.join(destino, 'portao.json'), carimbo(estado));
  return { tipo: 'modelo', iniciar: 'node server.mjs' };
}

function exportarObra(id, destino, estado) {
  fs.rmSync(destino, { recursive: true, force: true });
  copiarPasta(path.join(APPS, id), path.join(destino, 'apps', id));
  copiarPasta(path.join(PLAT, 'shared'), path.join(destino, 'shared'));
  copiarPasta(path.join(PLAT, 'gateway'), path.join(destino, 'gateway'));
  fs.copyFileSync(path.join(RAIZ, 'kit', 'modelos', 'iniciar-obra.mjs'), path.join(destino, 'iniciar.mjs'));
  fs.writeFileSync(path.join(destino, '.env.exemplo'), ENV_EXEMPLO);
  fs.writeFileSync(path.join(destino, 'portao.json'), carimbo(estado));
  const a = porId(id);
  const leia = fs.readFileSync(path.join(RAIZ, 'kit', 'modelos', 'LEIA-ME-obra.md'), 'utf8')
    .replaceAll('{{TITULO}}', `${a.emoji} ${a.titulo}`).replaceAll('{{ID}}', id).replaceAll('{{RESUMO}}', a.resumo || '');
  fs.writeFileSync(path.join(destino, 'LEIA-ME.md'), leia);
  return { tipo: 'obra', iniciar: 'node iniciar.mjs' };
}

export async function exportar(id, destino, estado) {
  const a = porId(id);
  if (!a) throw new ErroKit('app', `App desconhecido: ${id}. Veja a lista com "node kit/jev-kit.mjs apps".`);
  const alvo = path.resolve(destino || path.join(RAIZ, 'exportados', id));
  if (alvo === RAIZ || RAIZ.startsWith(alvo + path.sep)) throw new ErroKit('destino', 'Escolha uma pasta de destino fora da pasta do kit.');
  const r = a.tipo === 'modelo' ? await exportarModelo(id, alvo, estado) : exportarObra(id, alvo, estado);
  return { ...r, pasta: alvo };
}

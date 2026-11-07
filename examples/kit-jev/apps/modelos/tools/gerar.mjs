// Gera public/<id>/index.html de cada modelo e confere todos os app.config.mjs.
// Uso: node apps/modelos/tools/gerar.mjs        (sai com código 1 se algum modelo tiver problema)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conferirModelo } from '../lib/decidir.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(RAIZ, 'public');

export const CATEGORIAS = {
  'ao-vivo': 'Ao vivo: fale, mostre o rosto, jogue',
  imediata: 'IA imediata: a tela reage enquanto você usa',
  atendimento: 'Atendimento e caixa de entrada',
  confianca: 'Confiança e segurança',
  vendas: 'Vendas, marketing e criadores',
  dados: 'Dados e back-office',
  construtores: 'Para quem constrói com IA',
  voz: 'Voz e tempo real',
  educacao: 'Educação',
  radares: 'Radares e alertas',
  juridico: 'Jurídico e setor público',
  'casa-jogos': 'Casa e jogos',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const favicon = (emoji) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='88'>${emoji || '⚡'}</text></svg>`)}`;

export function paginaApp(spec, { motor = '../_motor/', hosted = true } = {}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.titulo)} · Jev</title>
<meta name="description" content="${esc(spec.resumo)}">
<meta name="theme-color" content="${spec.tema && spec.tema.modo === 'claro' ? '#f5f3ee' : '#0a0b10'}">
<link rel="icon" href="${favicon(spec.emoji)}">
<link rel="preload" href="${motor}fontes/onest-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${motor}motor.css">
${hosted ? '<script>window.MJ_HOSTED = true; window.MJ_KIT = true;</script>\n' : ''}</head>
<body>
<noscript>Este app precisa de JavaScript.</noscript>
<script type="module">
  import { iniciar } from '${motor}motor.js';
  import spec from './app.config.mjs';
  iniciar(spec);
</script>
</body>
</html>
`;
}

export async function carregarTodos() {
  const ids = fs.readdirSync(PUB).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(PUB, d, 'app.config.mjs'))).sort();
  const out = [];
  for (const id of ids) {
    const arq = path.join(PUB, id, 'app.config.mjs');
    let spec = null, problemas = [];
    try {
      spec = (await import(pathToFileURL(arq).href + '?t=' + fs.statSync(arq).mtimeMs)).default;
      problemas = conferirModelo(spec);
      if (spec.id !== id) problemas.push(`id "${spec.id}" diferente da pasta "${id}"`);
      if (!CATEGORIAS[spec.categoria]) problemas.push(`categoria desconhecida: ${spec.categoria}`);
    } catch (e) { problemas = ['não carregou: ' + e.message]; }
    out.push({ id, spec, problemas });
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const so = (() => { const i = process.argv.indexOf('--so'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
  const todos = (await carregarTodos()).filter((x) => !so || so.includes(x.id));
  let ruins = 0;
  for (const { id, spec, problemas } of todos) {
    if (spec) fs.writeFileSync(path.join(PUB, id, 'index.html'), paginaApp(spec));
    if (problemas.length) { ruins++; console.log(`✗ ${id}: ${problemas.join(' | ')}`); }
  }
  const porCat = {};
  for (const { spec } of todos) if (spec) porCat[spec.categoria] = (porCat[spec.categoria] || 0) + 1;
  console.log(`${todos.length} modelos, ${todos.length - ruins} ok, ${ruins} com problema`);
  console.log(Object.entries(porCat).map(([k, v]) => `${k}: ${v}`).join(' · '));
  process.exit(ruins ? 1 : 0);
}

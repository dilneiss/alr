// Sobe o gateway do Jev (o único lugar com a chave do OpenRouter) e este app juntos, no seu computador ou servidor.
//   1) copie .env.exemplo para .env e cole a sua chave do OpenRouter
//   2) node iniciar.mjs        (Node 22 ou mais novo)
//   3) abra http://localhost:3000
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
try {
  for (const linha of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sem .env: usa as variáveis do sistema */ }
if (!(process.env.OPENROUTER_API_KEY || '').startsWith('sk-or-')) {
  console.error('Falta a chave: crie o arquivo .env com OPENROUTER_API_KEY=sk-or-... (veja o .env.exemplo)');
  process.exit(1);
}
const id = fs.readdirSync(path.join(DIR, 'apps')).find((d) => fs.existsSync(path.join(DIR, 'apps', d, 'server.mjs')));
const PORTA = +(process.env.PORT || 3000);
const PORTA_GW = +(process.env.GATEWAY_PORT || 8787);
const GW = `http://127.0.0.1:${PORTA_GW}`;

const filhos = [];
function subir(nome, args, cwd, env) {
  const p = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
  p.on('exit', (c) => { console.log(`[${nome}] saiu (${c})`); for (const f of filhos) if (f !== p) f.kill(); process.exit(c || 0); });
  filhos.push(p);
}
subir('gateway', ['server.mjs'], path.join(DIR, 'gateway'), { PORT: String(PORTA_GW), DATA_DIR: path.join(DIR, 'dados', 'gateway'), PORTAO_FILE: path.join(DIR, 'portao.json') });
setTimeout(() => subir(id, ['server.mjs'], path.join(DIR, 'apps', id), {
  PORT: String(PORTA), JEV_GATEWAY_URL: GW, DATA_DIR: path.join(DIR, 'dados', id),
  LOCAL_LLM_URL: `${GW}/v1/llm/${id}`, LOCAL_LLM_MODEL: 'nuvem', LOCAL_LLM_LABEL: 'Gemini 2.5 Flash-Lite na nuvem (OpenRouter)',
  FAST_LLM_URL: `${GW}/v1/llm/${id}`, NOTAS_LLM: `${GW}/v1/llm/${id}`, FAST_LLM_LABEL: 'Gemini 2.5 Flash-Lite na nuvem (OpenRouter)', FAST_LLM_PARALLEL: '2',
  STT_URL: `${GW}/v1/stt-desligado/inference`,
}), 600);
process.on('SIGINT', () => { for (const f of filhos) f.kill(); process.exit(0); });
console.log(`\nAbra http://localhost:${PORTA}  (Ctrl+C para parar)\n`);

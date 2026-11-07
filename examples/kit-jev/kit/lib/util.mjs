// Utilidades do kit: caminhos, estado, segredos, saída no terminal e execução de comandos (Node 20+, sem dependências).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_DIR = path.join(RAIZ, '.kit');
export const SEGREDOS = path.join(RAIZ, 'segredos');
export const VERSAO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'kit', 'versao.json'), 'utf8')).versao;

// Quem não tem VPS da Hostinger compra por aqui (link de parceiro) e usa o cupom
export const LINK_VPS = 'https://www.hostg.xyz/SHK4Y';
export const CUPOM = 'MAESTROS10';

export class ErroKit extends Error {
  constructor(codigo, mensagem, saida = 1) { super(mensagem); this.codigo = codigo; this.saida = saida; }
}

// ---------- JSON e estado ----------
export function lerJson(arq, padrao = null) {
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return padrao; }
}
export function gravarJson(arq, obj, modo = 0o644) {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const tmp = `${arq}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', { mode: modo });
  fs.renameSync(tmp, arq);
}

const ARQ_ESTADO = path.join(KIT_DIR, 'estado.json');
export function lerEstado() {
  return lerJson(ARQ_ESTADO, null) || { versao: VERSAO, criado_em: agora(), passos: {}, escolhas: {} };
}
export function gravarEstado(e) { e.atualizado_em = agora(); gravarJson(ARQ_ESTADO, e); }
export function marcarPasso(e, passo, dados = {}) { e.passos[passo] = { em: agora(), ...dados }; }

export const agora = () => new Date().toISOString();

// ---------- segredos (só em segredos/, nunca impressos) ----------
const SEGREDO = {
  hostinger: { arq: 'hostinger-token.txt', env: 'HOSTINGER_API_TOKEN', min: 20, rotulo: 'token da API da Hostinger' },
  openrouter: { arq: 'openrouter-key.txt', env: 'OPENROUTER_API_KEY', min: 20, rotulo: 'chave do OpenRouter', prefixo: 'sk-or-' },
  elevenlabs: { arq: 'elevenlabs-key.txt', env: 'ELEVENLABS_API_KEY', min: 20, rotulo: 'chave do ElevenLabs (opcional)' },
  youtube: { arq: 'youtube-key.txt', env: 'YOUTUBE_API_KEY', min: 20, rotulo: 'chave da YouTube Data API (opcional)' },
};
export const NOMES_SEGREDO = Object.keys(SEGREDO);
export const arquivoSegredo = (nome) => path.join(SEGREDOS, SEGREDO[nome].arq);
export const rotuloSegredo = (nome) => SEGREDO[nome].rotulo;

// A pessoa cola o valor numa linha do arquivo; linhas que começam com # são instruções e são ignoradas.
export function lerSegredo(nome) {
  const s = SEGREDO[nome];
  if (!s) throw new ErroKit('segredo_desconhecido', `Segredo desconhecido: ${nome}`);
  const doAmbiente = (process.env[s.env] || '').trim();
  if (doAmbiente) return doAmbiente;
  let texto = '';
  try { texto = fs.readFileSync(arquivoSegredo(nome), 'utf8'); } catch { return ''; }
  const linha = texto.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || '';
  return linha.replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
}

export function conferirFormatoSegredo(nome, valor) {
  const s = SEGREDO[nome];
  if (!valor) return `${s.rotulo}: vazio`;
  if (/\s/.test(valor)) return `${s.rotulo}: tem espaço no meio (copie de novo, sem quebrar a linha)`;
  if (valor.length < s.min) return `${s.rotulo}: curto demais (${valor.length} caracteres)`;
  if (s.prefixo && !valor.startsWith(s.prefixo)) return `${s.rotulo}: deveria começar com "${s.prefixo}"`;
  return null;
}

export function gravarSegredo(nome, valor) {
  const erro = conferirFormatoSegredo(nome, valor);
  if (erro) throw new ErroKit('segredo_invalido', erro);
  fs.mkdirSync(SEGREDOS, { recursive: true, mode: 0o700 });
  const arq = arquivoSegredo(nome);
  fs.writeFileSync(arq, `# ${SEGREDO[nome].rotulo}: não compartilhe este arquivo\n${valor}\n`, { mode: 0o600 });
  try { fs.chmodSync(arq, 0o600); } catch { /* Windows */ }
  return arq;
}

// Cria o arquivo de segredo vazio (com a instrução) para a pessoa colar o valor num editor de texto
export function prepararArquivoSegredo(nome) {
  fs.mkdirSync(SEGREDOS, { recursive: true, mode: 0o700 });
  const arq = arquivoSegredo(nome);
  if (!fs.existsSync(arq) || !lerSegredo(nome)) {
    fs.writeFileSync(arq, `# Cole o seu ${SEGREDO[nome].rotulo} na linha de baixo, salve e feche este arquivo.\n\n`, { mode: 0o600 });
  }
  try { fs.chmodSync(arq, 0o600); } catch { /* Windows */ }
  return arq;
}

// Segredos gerados pelo próprio kit (senha do login dos apps, segredo das sessões)
export function segredoGerado(nomeArq, gerar) {
  const arq = path.join(SEGREDOS, nomeArq);
  try { const v = fs.readFileSync(arq, 'utf8').trim(); if (v) return v; } catch { /* ainda não existe */ }
  fs.mkdirSync(SEGREDOS, { recursive: true, mode: 0o700 });
  const v = gerar();
  fs.writeFileSync(arq, v + '\n', { mode: 0o600 });
  return v;
}
export const aleatorio = (n = 24) => crypto.randomBytes(n).toString('base64url').slice(0, n);
export function senhaLegivel() {
  // 4 blocos de 4 letras e números sem os ambíguos (0/O, 1/l/I): fácil de ler e digitar, ~80 bits
  const alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(16);
  return [0, 4, 8, 12].map((i) => [...b.subarray(i, i + 4)].map((x) => alfabeto[x % alfabeto.length]).join('')).join('-');
}

// ---------- saída ----------
export const saida = {
  json: process.argv.includes('--json'),
  titulo(t) { if (!this.json) console.log(`\n== ${t}`); },
  linha(t = '') { if (!this.json) console.log(t); },
  ok(t) { if (!this.json) console.log(`  ✓ ${t}`); },
  aviso(t) { if (!this.json) console.log(`  ! ${t}`); },
  falha(t) { if (!this.json) console.log(`  ✗ ${t}`); },
  item(t) { if (!this.json) console.log(`  · ${t}`); },
  proximo(t) { if (!this.json) console.log(`\nPRÓXIMO PASSO: ${t}`); },
  dados(obj) { if (this.json) console.log(JSON.stringify(obj, null, 2)); },
};

// ---------- execução de comandos ----------
export function rodar(cmd, args = [], { cwd = RAIZ, input, timeout = 120_000, env } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, timeout, env: env ? { ...process.env, ...env } : process.env, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 });
  return { status: r.status ?? (r.error ? -1 : 0), stdout: r.stdout || '', stderr: (r.stderr || '') + (r.error ? String(r.error.message) : ''), erro: r.error };
}

// Roda mostrando a saída ao vivo (build longo); devolve o código de saída
export function rodarAoVivo(cmd, args = [], { cwd = RAIZ, env, prefixo = '' } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: env ? { ...process.env, ...env } : process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const escreve = (buf) => { for (const l of String(buf).split(/\r?\n/)) if (l.trim()) process.stdout.write(`${prefixo}${l}\n`); };
    p.stdout.on('data', escreve); p.stderr.on('data', escreve);
    p.on('error', () => resolve(-1));
    p.on('close', (c) => resolve(c ?? -1));
  });
}

export function existeComando(cmd) {
  const r = process.platform === 'win32' ? rodar('where', [cmd], { timeout: 10_000 }) : rodar('sh', ['-c', `command -v ${cmd}`], { timeout: 10_000 });
  return r.status === 0 && r.stdout.trim().length > 0;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function tamanhoLegivel(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`;
}

// Acesso à VPS por SSH com uma chave só do kit (segredos/ssh/jev-kit), sem senha de root.
// Os comandos rodam com a pasta segredos/ssh como diretório atual e caminhos relativos: o UserKnownHostsFile do
// ssh aceita vários arquivos separados por espaço, então um caminho com espaço ("Meus Documentos") quebraria.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { SEGREDOS, rodar, ErroKit, existeComando, lerEstado } from './util.mjs';

export const DIR_SSH = path.join(SEGREDOS, 'ssh');
const CHAVE = 'jev-kit';

export function chavePublica() {
  try { return fs.readFileSync(path.join(DIR_SSH, CHAVE + '.pub'), 'utf8').trim(); } catch { return null; }
}

export function gerarChave() {
  if (chavePublica()) return chavePublica();
  if (!existeComando('ssh-keygen')) throw new ErroKit('sem_ssh', 'Não achei o ssh-keygen. No Windows, ative o "Cliente OpenSSH" (Configurações → Aplicativos → Recursos opcionais).');
  fs.mkdirSync(DIR_SSH, { recursive: true, mode: 0o700 });
  const r = rodar('ssh-keygen', ['-t', 'ed25519', '-N', '', '-C', 'jev-kit', '-f', CHAVE, '-q'], { cwd: DIR_SSH });
  if (r.status !== 0) throw new ErroKit('chave_ssh', `ssh-keygen falhou: ${r.stderr.trim().slice(0, 200)}`);
  try { fs.chmodSync(path.join(DIR_SSH, CHAVE), 0o600); } catch { /* Windows */ }
  return chavePublica();
}

// A pessoa pode usar a chave que ela já tem na VPS: node kit/jev-kit.mjs ssh usar-minha <caminho>
function identidade() {
  const e = lerEstado();
  const propria = e.escolhas?.ssh?.chave_propria;
  if (propria) return path.resolve(propria);
  return CHAVE;
}

function argsBase(ip, { lote = true } = {}) {
  if (!ip) throw new ErroKit('sem_vps', 'Nenhuma VPS escolhida ainda.');
  fs.mkdirSync(DIR_SSH, { recursive: true, mode: 0o700 });
  return [
    '-i', identidade(), '-o', 'IdentitiesOnly=yes', '-o', 'UserKnownHostsFile=known_hosts', '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=20', '-o', 'ServerAliveCountMax=6', ...(lote ? ['-o', 'BatchMode=yes'] : []),
    `root@${ip}`,
  ];
}

// Roda um comando na VPS e devolve { status, stdout, stderr }. O que vai em "entrada" segue pelo stdin (segredos nunca vão na linha de comando).
export function ssh(ip, comando, { entrada, timeout = 120_000 } = {}) {
  return rodar('ssh', [...argsBase(ip), comando], { cwd: DIR_SSH, input: entrada, timeout });
}

// Mesmo comando, com a saída aparecendo ao vivo (build e subida dos contêineres)
export function sshAoVivo(ip, comando, { prefixo = '    ' } = {}) {
  return new Promise((resolve) => {
    const p = spawn('ssh', [...argsBase(ip), comando], { cwd: DIR_SSH, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let resto = '';
    const escreve = (buf) => { resto += String(buf); const ls = resto.split(/\r?\n/); resto = ls.pop(); for (const l of ls) if (l.trim()) process.stdout.write(prefixo + l + '\n'); };
    p.stdout.on('data', escreve); p.stderr.on('data', escreve);
    p.on('error', () => resolve(-1));
    p.on('close', (c) => { if (resto.trim()) process.stdout.write(prefixo + resto + '\n'); resolve(c ?? -1); });
  });
}

export function testarSsh(ip) {
  const r = ssh(ip, 'echo jev-kit-ok && uname -m && (. /etc/os-release && echo "$ID $VERSION_ID")', { timeout: 30_000 });
  const ok = r.status === 0 && r.stdout.includes('jev-kit-ok');
  const [, arq = '', so = ''] = r.stdout.trim().split('\n');
  let motivo = null;
  if (!ok) {
    const e = r.stderr;
    if (/Permission denied/i.test(e)) motivo = 'chave_recusada';
    else if (/timed out|No route|Connection refused|Could not resolve/i.test(e)) motivo = 'sem_conexao';
    else if (/REMOTE HOST IDENTIFICATION HAS CHANGED/i.test(e)) motivo = 'host_mudou';
    else motivo = 'outro';
  }
  return { ok, motivo, arquitetura: arq.trim(), so: so.trim(), erro: ok ? '' : r.stderr.trim().split('\n').slice(-2).join(' ').slice(0, 240) };
}

// A VPS foi reinstalada (outra impressão digital): esquece a antiga deste IP no known_hosts do kit
export function esquecerHost(ip) {
  return rodar('ssh-keygen', ['-R', ip, '-f', 'known_hosts'], { cwd: DIR_SSH }).status === 0;
}

// Envia uma pasta inteira: tar local → ssh → tar na VPS (funciona no macOS, Linux e Windows 10+, sem rsync)
export function enviarPasta(ip, pastaLocal, destinoRemoto) {
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-czf', '-', '-C', pastaLocal, '.'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const destino = destinoRemoto.replace(/'/g, '');
    const remoto = spawn('ssh', [...argsBase(ip), `rm -rf '${destino}.novo' && mkdir -p '${destino}.novo' && tar -xzf - -C '${destino}.novo' && rm -rf '${destino}.velho' && { [ -d '${destino}' ] && mv '${destino}' '${destino}.velho' || true; } && mv '${destino}.novo' '${destino}' && rm -rf '${destino}.velho' && echo enviado-ok`],
      { cwd: DIR_SSH, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    tar.stdout.pipe(remoto.stdin);
    tar.stderr.on('data', (b) => { err += b; });
    remoto.stdout.on('data', (b) => { out += b; });
    remoto.stderr.on('data', (b) => { err += b; });
    remoto.on('error', reject);
    tar.on('error', reject);
    remoto.on('close', (c) => (c === 0 && out.includes('enviado-ok') ? resolve() : reject(new ErroKit('envio', `Falhou o envio dos arquivos para a VPS: ${err.trim().slice(-300)}`))));
  });
}

// Grava um arquivo na VPS pelo stdin (para segredos: nunca aparecem na linha de comando nem no log)
// noLugar: reescreve o próprio arquivo (mesmo inode), para quem o monta por bind mount num contêiner ver a mudança
export function gravarArquivoRemoto(ip, caminho, conteudo, modo = '600', { noLugar = false } = {}) {
  const dir = path.posix.dirname(caminho);
  const cmd = noLugar
    ? `umask 077 && mkdir -p '${dir}' && cat > '${caminho}' && chmod ${modo} '${caminho}' && echo gravado-ok`
    : `umask 077 && mkdir -p '${dir}' && cat > '${caminho}.tmp' && chmod ${modo} '${caminho}.tmp' && mv '${caminho}.tmp' '${caminho}' && echo gravado-ok`;
  const r = ssh(ip, cmd, { entrada: conteudo, timeout: 30_000 });
  if (r.status !== 0 || !r.stdout.includes('gravado-ok')) throw new ErroKit('gravar_remoto', `Não consegui gravar ${caminho} na VPS: ${r.stderr.trim().slice(-200)}`);
}

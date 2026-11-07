// Publica os apps escolhidos na VPS da Hostinger: confere o portão na API, monta a pasta, envia, grava a
// configuração (segredos pelo stdin do ssh, nunca na linha de comando), sobe os contêineres e espera ficarem prontos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RAIZ, lerEstado, gravarEstado, marcarPasso, lerSegredo, segredoGerado, aleatorio, senhaLegivel, agora, saida, ErroKit, esperar, VERSAO } from './util.mjs';
import { exigirPortao } from './portao.mjs';
import { listarVps } from './hostinger.mjs';
import { ssh, sshAoVivo, enviarPasta, gravarArquivoRemoto, testarSsh } from './ssh.mjs';
import { montar, hostHub } from './montagem.mjs';
import { porId } from './catalogo.mjs';

export const DESTINO = '/opt/jev-kit/app';

export function credenciaisLogin(estado) {
  const usuario = (estado.escolhas.login?.usuario || 'admin').trim().toLowerCase();
  const senha = segredoGerado('login-dos-apps-senha.txt', senhaLegivel);
  return { usuario, senha };
}

function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  return `scrypt:${sal.toString('hex')}:${crypto.scryptSync(senha, sal, 64).toString('hex')}`;
}
const linhaEnv = (k, v) => `${k}=${String(v).replace(/[\r\n]/g, '')}\n`;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Confere tudo o que precisa existir antes de mexer na VPS
export async function conferirAntes(estado) {
  const e = estado.escolhas;
  const faltas = [];
  if (!e.vps?.id) faltas.push('escolher a VPS (node kit/jev-kit.mjs vps escolher <id>)');
  if (!e.apps?.length) faltas.push('escolher os apps (node kit/jev-kit.mjs apps escolher …)');
  if (!e.dominio?.nome) faltas.push('definir o endereço (node kit/jev-kit.mjs dominio …)');
  if (!lerSegredo('openrouter')) faltas.push('a chave do OpenRouter (node kit/jev-kit.mjs token openrouter)');
  if (!estado.passos.preparar) faltas.push('preparar a VPS (node kit/jev-kit.mjs preparar)');
  if (faltas.length) throw new ErroKit('faltam_passos', `Antes de publicar, falta:\n  - ${faltas.join('\n  - ')}`);
}

export async function publicar() {
  const estado = lerEstado();
  await conferirAntes(estado);
  const e = estado.escolhas;

  // 1. portão, de novo e na hora: o IP de destino precisa ser de uma VPS ativa desta conta da Hostinger
  saida.titulo('1/6 Portão: confirmando a VPS na API da Hostinger');
  await exigirPortao({ refazer: true });
  const vps = (await listarVps()).find((v) => String(v.id) === String(e.vps.id));
  if (!vps) throw new ErroKit('portao_fechado', `A VPS ${e.vps.id} não está mais na sua conta da Hostinger.`, 3);
  if (vps.estado !== 'running') throw new ErroKit('vps_parada', `A VPS ${vps.id} está "${vps.estado}". Ligue-a no hPanel e tente de novo.`);
  if (vps.ip !== e.vps.ip) throw new ErroKit('ip_mudou', `O IP da VPS mudou (${e.vps.ip} → ${vps.ip}). Rode "node kit/jev-kit.mjs vps escolher ${vps.id}" de novo.`);
  saida.ok(`VPS ${vps.id} (${vps.plano}, ${vps.ip}) ativa na sua conta`);
  const t = testarSsh(vps.ip);
  if (!t.ok) throw new ErroKit('ssh', `Sem acesso SSH à VPS (${t.motivo}): ${t.erro}`);

  // 2. a pasta com a plataforma e os apps escolhidos
  saida.titulo('2/6 Montando a pasta dos apps');
  const m = montar({ apps: e.apps, dominio: e.dominio.nome, publicos: e.publicos || [], cpusVps: vps.cpus, emailAcme: e.dominio.email || '' });
  saida.ok(`${m.obras.length} apps grandes + ${m.modelos.length} modelos · ${m.servicos.length + 3} contêineres`);

  // 3. envio
  saida.titulo('3/6 Enviando para a VPS');
  await enviarPasta(vps.ip, m.pasta, DESTINO);
  saida.ok(`arquivos em ${DESTINO}`);

  // 4. configuração e segredos (só na VPS, arquivos 600 em /etc/jev-kit)
  saida.titulo('4/6 Gravando a configuração na VPS');
  const { usuario, senha } = credenciaisLogin(estado);
  const hub = hostHub(e.dominio.nome);
  const orc = e.orcamento || {};
  const authSecret = segredoGerado('sessoes-secret.txt', () => aleatorio(48));
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/gateway.env',
    linhaEnv('OPENROUTER_API_KEY', lerSegredo('openrouter')) + linhaEnv('BUDGET_DAILY_USD', orc.dia ?? 2) + linhaEnv('BUDGET_TOTAL_USD', orc.total ?? 20) +
    linhaEnv('APP_DAILY_USD', orc.app_dia ?? 1) + linhaEnv('RATE_PER_MIN', 240) + linhaEnv('LLM_MODEL', e.llm === 'desligado' ? 'off' : (e.llm_modelo || 'google/gemini-2.5-flash-lite')) +
    linhaEnv('PUBLIC_HUB_URL', `https://${hub}`) + linhaEnv('PORTAO_FILE', '/run/jev-kit/portao.json'));
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/auth.env',
    linhaEnv('AUTH_USER', usuario) + linhaEnv('AUTH_PASS_HASH', hashSenha(senha)) + linhaEnv('AUTH_SECRET', authSecret) +
    linhaEnv('HUB_HOST', hub) + linhaEnv('ALLOWED_HOST_RE', `^(jev|jev-[a-z0-9-]+)\\.${escRe(e.dominio.nome)}$`) + linhaEnv('COOKIE_NAME', 'jevkit_s'));
  const rotuloLlm = e.llm === 'desligado' ? 'desligado' : 'Gemini 2.5 Flash-Lite na nuvem (OpenRouter)';
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/apps.env',
    linhaEnv('LOCAL_LLM_MODEL', 'nuvem') + linhaEnv('LOCAL_LLM_LABEL', rotuloLlm) + linhaEnv('FAST_LLM_MODEL', 'nuvem') + linhaEnv('FAST_LLM_LABEL', rotuloLlm) +
    linhaEnv('STT_URL', 'http://gateway:8787/v1/stt-desligado/inference') + (e.llm === 'desligado' ? linhaEnv('LOCAL_LLM_URL', 'off') : ''));
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/cluely.env', lerSegredo('elevenlabs') ? linhaEnv('ELEVENLABS_API_KEY', lerSegredo('elevenlabs')) : '# sem ElevenLabs: a transcrição usa o reconhecimento de voz do navegador\n');
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/comentarios.env', (lerSegredo('youtube') ? linhaEnv('YOUTUBE_API_KEY', lerSegredo('youtube')) : '# sem chave da YouTube Data API: só os vídeos de exemplo\n') + (e.youtube_canal ? linhaEnv('YOUTUBE_CANAL_ID', e.youtube_canal) : ''));
  // o carimbo do portão que o gateway exige (sem segredo nenhum)
  // no mesmo arquivo (sem trocar por outro): o gateway lê o carimbo por um bind mount e o relê a cada minuto
  gravarArquivoRemoto(vps.ip, '/etc/jev-kit/portao.json', JSON.stringify({
    ok: true, fonte: 'api-hostinger', vps_id: vps.id, ip: vps.ip, hostname: vps.hostname, ptr: vps.ptr, plano: vps.plano, verificado_em: agora(), kit_versao: VERSAO,
  }, null, 1) + '\n', '644', { noLugar: true });
  saida.ok('gateway.env, auth.env, apps.env e o carimbo do portão gravados (só o root lê os .env)');

  // 5. sobe os contêineres
  saida.titulo('5/6 Construindo e subindo os contêineres (a 1ª vez leva de 3 a 10 minutos)');
  const c = await sshAoVivo(vps.ip, `cd ${DESTINO}/deploy && docker compose --progress plain up -d --build --remove-orphans 2>&1 | grep --line-buffered -vE '^\\s*$|^#[0-9]+ (sha256:|extracting|resolve |transferring|DONE 0\\.)'; exit \${PIPESTATUS[0]}`);
  if (c !== 0) throw new ErroKit('compose', 'O docker compose falhou (veja as linhas acima). Rode "node kit/jev-kit.mjs logs" para mais detalhes.');
  // o Caddyfile chega numa pasta nova a cada publicação: o contêiner do Caddy precisa nascer de novo para ler o arquivo
  // novo (o certificado HTTPS fica no volume e não é pedido outra vez)
  const rc = ssh(vps.ip, `cd ${DESTINO}/deploy && docker compose up -d --no-deps --force-recreate caddy 2>&1 | tail -2`, { timeout: 120_000 });
  if (rc.status !== 0) throw new ErroKit('caddy', `O Caddy não subiu com a configuração nova: ${rc.stdout.trim().slice(-200)}`);

  // 6. espera tudo ficar de pé
  saida.titulo('6/6 Esperando os contêineres');
  const servicos = ['caddy', 'auth', 'gateway', ...m.servicos];
  let faltam = servicos;
  for (let i = 0; i < 40 && faltam.length; i++) {
    const r = ssh(vps.ip, `cd ${DESTINO}/deploy && docker compose ps --format '{{.Service}} {{.State}}'`, { timeout: 30_000 });
    const rodando = new Set(r.stdout.split('\n').filter((l) => / running$/.test(l)).map((l) => l.split(' ')[0]));
    faltam = servicos.filter((s) => !rodando.has(s));
    if (faltam.length) await esperar(3000);
  }
  if (faltam.length) throw new ErroKit('subida', `Não subiram: ${faltam.join(', ')}. Rode "node kit/jev-kit.mjs logs ${faltam[0]}".`);
  saida.ok(`${servicos.length} contêineres rodando`);

  marcarPasso(estado, 'publicar', { vps: vps.id, apps: e.apps.length, dominio: e.dominio.nome });
  delete estado.passos.verificar;
  estado.ultima_publicacao = { em: agora(), apps: [...e.apps], dominio: e.dominio.nome, vps: vps.id };
  gravarEstado(estado);
  return { hub, usuario, m };
}

export function nomeServico(id) {
  const a = porId(id);
  if (!a) return id;
  return a.tipo === 'modelo' ? 'app-modelos' : `app-${id}`;
}

export function caminhoEstado() { return path.join(RAIZ, '.kit', 'estado.json'); }
export const existe = (p) => fs.existsSync(p);

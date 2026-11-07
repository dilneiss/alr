#!/usr/bin/env node
// Kit Jev · 100 apps — o instalador que o seu agente (Claude Code, Codex, Gemini…) roda passo a passo.
// Uso: node kit/jev-kit.mjs <comando> [opções]      ·      node kit/jev-kit.mjs ajuda
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, VERSAO, LINK_VPS, CUPOM, ErroKit, saida, lerEstado, gravarEstado, marcarPasso, lerSegredo, gravarSegredo, prepararArquivoSegredo,
  conferirFormatoSegredo, arquivoSegredo, rotuloSegredo, NOMES_SEGREDO, rodar, existeComando, tamanhoLegivel, agora, segredoGerado, senhaLegivel } from './lib/util.mjs';
import { verificarPortao, exigirPortao, lerPortao, portaoValido, mensagemSemVps, vpsDoPortao, imprimirPortao } from './lib/portao.mjs';
import * as H from './lib/hostinger.mjs';
import { APPS, CATEGORIAS, porId, buscar, resolverSelecao, estimarRam, planoMinimo, linhaApp } from './lib/catalogo.mjs';
import { chavePublica, gerarChave, testarSsh, ssh, esquecerHost } from './lib/ssh.mjs';
import { apontaPara } from './lib/dns.mjs';
import { hostHub, urlDoApp, nomesDns } from './lib/montagem.mjs';
import { publicar, credenciaisLogin, DESTINO, nomeServico } from './lib/publicar.mjs';
import { verificar } from './lib/verificar.mjs';
import { exportar } from './lib/exportar.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const [cmd = 'ajuda', sub, ...resto] = args;
const flag = (nome) => args.includes(`--${nome}`);
const opcao = (nome) => { const i = args.indexOf(`--${nome}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };
const semFlags = (lista) => lista.filter((a, i) => !a.startsWith('--') && !(i > 0 && lista[i - 1].startsWith('--') && ['usuario', 'destino', 'porta', 'email', 'dia', 'total', 'app-dia', 'modelo', 'canal'].includes(lista[i - 1].slice(2))));

// ======================================================================= o próximo passo do setup
function vpsEscolhida(e) { return e.escolhas.vps?.id ? e.escolhas.vps : null; }

export function proximoPasso(e = lerEstado()) {
  const p = lerPortao();
  const esc = e.escolhas;
  if (!lerSegredo('hostinger')) return { passo: 'token_hostinger', faca: 'Apresente o kit em 3 linhas e explique a regra: ele só funciona com uma VPS da Hostinger. Peça o token da API da Hostinger (https://hpanel.hostinger.com/api → "Gerar token", validade de 1 mês; ele só aparece uma vez). Rode "node kit/jev-kit.mjs token hostinger --abrir" para abrir o arquivo onde a pessoa cola o token; depois "node kit/jev-kit.mjs portao".' };
  if (!p) return { passo: 'portao', faca: 'Rode "node kit/jev-kit.mjs portao" para conferir a VPS na API da Hostinger.' };
  if (!p.ok && (p.motivo === 'sem_vps' || p.motivo === 'vps_inativa')) return { passo: 'sem_vps', faca: `PARE AQUI. A conta não tem VPS ativa da Hostinger. Explique com gentileza que o kit exige uma, mande o link ${LINK_VPS} e o cupom ${CUPOM}, e diga para voltar quando a VPS estiver "Em atividade". Não instale nada, não exporte nada e não ofereça contornos.` };
  if (!p.ok) return { passo: 'portao', faca: `O portão falhou (${p.motivo}). Rode "node kit/jev-kit.mjs portao" e siga a mensagem (token novo, se for o caso).` };
  if (!portaoValido(p)) return { passo: 'portao', faca: 'A verificação da Hostinger venceu (vale 7 dias). Rode "node kit/jev-kit.mjs portao".' };
  if (!vpsEscolhida(e)) return { passo: 'vps', faca: 'Rode "node kit/jev-kit.mjs vps", mostre as VPS e combine qual usar; depois "node kit/jev-kit.mjs vps escolher <id>".' };
  if (!esc.apps?.length) return { passo: 'apps', faca: 'Pergunte o que a pessoa quer resolver (atendimento, vendas, conteúdo, dados, voz, jogos…) e mostre os apps que servem ("node kit/jev-kit.mjs apps" ou "apps buscar <palavras>"). Escolha com "node kit/jev-kit.mjs apps escolher <números, ids ou todos>".' };
  if (!lerSegredo('openrouter')) return { passo: 'openrouter', faca: 'Peça a chave do OpenRouter (openrouter.ai/keys, com limite de crédito; US$ 5 rendem dezenas de milhares de decisões). Rode "node kit/jev-kit.mjs token openrouter --abrir"; depois "node kit/jev-kit.mjs token openrouter --testar".' };
  if (!esc.dominio?.nome) return { passo: 'dominio', faca: 'Pergunte se a pessoa quer usar um domínio próprio. Sem domínio: "node kit/jev-kit.mjs dominio hostinger" (endereço grátis da VPS, com HTTPS). Com domínio: "node kit/jev-kit.mjs dominio <exemplo.com.br>".' };
  if (!esc.login?.usuario) return { passo: 'login', faca: 'Pergunte o e-mail que a pessoa quer usar para entrar nos apps e rode "node kit/jev-kit.mjs login --usuario <email>" (a senha é gerada e mostrada).' };
  if (!e.passos.ssh) return { passo: 'ssh', faca: 'Acesso à VPS: rode "node kit/jev-kit.mjs ssh testar". Se não entrar, pergunte se pode cadastrar a chave SSH do kit na VPS pela API da Hostinger; com o "sim", rode "node kit/jev-kit.mjs ssh cadastrar --confirmo" e teste de novo.' };
  if (esc.dominio.tipo === 'proprio' && !e.passos.dns) return { passo: 'dns', faca: 'O domínio precisa apontar para a VPS. Rode "node kit/jev-kit.mjs dominio dns" e siga: se o domínio está nesta conta da Hostinger, peça o "sim" e rode com --confirmo; se não, mostre os registros A que a pessoa cria no provedor dela e rode "node kit/jev-kit.mjs dominio conferir" até passar.' };
  if (!e.passos.preparar) return { passo: 'preparar', faca: 'Rode "node kit/jev-kit.mjs vps diagnostico". Se a VPS já tem coisas rodando, recomende o snapshot ("node kit/jev-kit.mjs snapshot"; criar só com o "sim" da pessoa). Se as portas 80/443 estiverem ocupadas, explique quem ocupa e pergunte antes de "vps liberar-portas --confirmo". Depois rode "node kit/jev-kit.mjs preparar".' };
  if (!e.passos.publicar || pendenteRepublicar(e)) return { passo: 'publicar', faca: 'Rode "node kit/jev-kit.mjs publicar" (de 3 a 10 minutos na primeira vez). Avise a pessoa que vai demorar.' };
  if (!e.passos.verificar) return { passo: 'verificar', faca: 'Rode "node kit/jev-kit.mjs verificar". O certificado HTTPS pode levar alguns minutos na primeira vez.' };
  return { passo: 'pronto', faca: 'Instalação pronta. Mostre os endereços e o login ("node kit/jev-kit.mjs status"). Ofereça: adaptar um app ao negócio da pessoa (o arquivo de cada app está no catálogo), adicionar ou remover apps, deixar um app público para usar num site, exportar um app para outro projeto e ajustar o orçamento.' };
}

function pendenteRepublicar(e) {
  const u = e.ultima_publicacao;
  if (!u) return true;
  return JSON.stringify([...u.apps].sort()) !== JSON.stringify([...(e.escolhas.apps || [])].sort()) || u.dominio !== e.escolhas.dominio?.nome;
}

// ======================================================================= comandos
const C = {};

C.sessao = async () => {
  const e = lerEstado();
  const prox = proximoPasso(e);
  const p = lerPortao();
  const esc = e.escolhas;
  const feito = [];
  if (p?.ok) feito.push(`portão Hostinger ✓ (${p.n_vps} VPS)`);
  if (esc.vps?.id) feito.push(`VPS ${esc.vps.id} (${esc.vps.plano}, ${esc.vps.ip}) ✓`);
  if (esc.apps?.length) feito.push(`${esc.apps.length} apps escolhidos ✓`);
  if (lerSegredo('openrouter')) feito.push('chave do OpenRouter ✓');
  if (esc.dominio?.nome) feito.push(`endereço ${hostHub(esc.dominio.nome)} ✓`);
  if (e.passos.ssh) feito.push('SSH ✓');
  if (e.passos.preparar) feito.push('VPS preparada ✓');
  if (e.passos.publicar) feito.push(`publicado em ${new Date(e.passos.publicar.em).toLocaleString('pt-BR')} ✓`);
  if (e.passos.verificar) feito.push('verificado ✓');
  const linhas = [
    `[Kit Jev · 100 apps · v${VERSAO}] ${prox.passo === 'pronto' ? 'Instalação pronta.' : 'Setup em andamento.'}`,
    `Feito: ${feito.length ? feito.join(' · ') : 'nada ainda (setup novo)'}`,
    `PRÓXIMO PASSO (${prox.passo}): ${prox.faca}`,
  ];
  if (flag('hook')) linhas.push('Regra do kit: na sua PRIMEIRA resposta desta sessão, seja qual for a mensagem da pessoa (até "oi"), conduza este próximo passo em português. Leia o AGENTS.md antes de rodar qualquer comando do kit. Nunca mostre tokens ou chaves.');
  if (saida.json) return saida.dados({ versao: VERSAO, ...prox, feito });
  console.log(linhas.join('\n'));
};

C.proximo = async () => { const p = proximoPasso(); if (saida.json) return saida.dados(p); console.log(`PRÓXIMO PASSO (${p.passo}): ${p.faca}`); };

C.checar = async () => {
  saida.titulo('Este computador');
  const [maior] = process.versions.node.split('.').map(Number);
  (maior >= 20 ? saida.ok : saida.falha).call(saida, `Node ${process.versions.node}${maior >= 20 ? '' : ' (precisa do 20 ou mais novo; recomendado 22)'}`);
  const itens = [['ssh', 'acesso à VPS'], ['ssh-keygen', 'criar a chave do kit'], ['tar', 'enviar os arquivos'], ['curl', 'reserva para a API da Hostinger']];
  let falta = maior < 20;
  for (const [c, para] of itens) { const ok = existeComando(c); if (!ok && c !== 'curl') falta = true; (ok ? saida.ok : saida.falha).call(saida, `${c} (${para})${ok ? '' : ' não encontrado'}`); }
  if (falta) saida.linha(process.platform === 'win32'
    ? '\nNo Windows 10/11: Configurações → Aplicativos → Recursos opcionais → "Cliente OpenSSH". O tar já vem no Windows.'
    : '\nInstale o que faltou pelo gerenciador de pacotes do sistema (no Mac já vem tudo; Node em https://nodejs.org).');
  saida.dados({ node: process.versions.node, faltando: falta });
  if (falta) process.exitCode = 1;
};

C.token = async () => {
  const nome = sub;
  if (!NOMES_SEGREDO.includes(nome)) throw new ErroKit('uso', `Use: node kit/jev-kit.mjs token <${NOMES_SEGREDO.join('|')}> [--abrir | --colar | --testar]`);
  if (flag('colar')) {
    // a pessoa colou o valor na conversa: o agente manda pelo stdin (nunca como argumento) e o kit grava
    const valor = fs.readFileSync(0, 'utf8').trim().split(/\r?\n/)[0].trim();
    gravarSegredo(nome, valor);
    saida.ok(`salvo em segredos/: ${rotuloSegredo(nome)} (${valor.length} caracteres; só você lê o arquivo)`);
  } else if (flag('abrir')) {
    const arq = prepararArquivoSegredo(nome);
    const abrir = process.platform === 'darwin' ? ['open', ['-e', arq]] : process.platform === 'win32' ? ['notepad', [arq]] : ['xdg-open', [arq]];
    const r = rodar(abrir[0], abrir[1], { timeout: 15_000 });
    saida.ok(r.status === 0 ? `abri o arquivo ${path.relative(RAIZ, arq)} num editor de texto` : `abra o arquivo ${path.relative(RAIZ, arq)} num editor de texto`);
    saida.linha('  A pessoa cola o valor na linha vazia, salva e fecha. Depois rode o mesmo comando com --testar.');
    return;
  }
  const valor = lerSegredo(nome);
  const erro = conferirFormatoSegredo(nome, valor);
  if (erro) { saida.falha(erro); saida.linha(`  Arquivo: ${path.relative(RAIZ, arquivoSegredo(nome))}`); process.exitCode = 2; return; }
  saida.ok(`${rotuloSegredo(nome)}: ok (${valor.length} caracteres)`);
  if (flag('testar') || flag('colar')) {
    if (nome === 'hostinger') return C.portao();
    if (nome === 'openrouter') {
      const t0 = performance.now();
      const r = await fetch('https://openrouter.ai/api/alpha/decisions', { method: 'POST', headers: { Authorization: `Bearer ${valor}`, 'Content-Type': 'application/json', 'X-Title': 'Kit Jev' },
        body: JSON.stringify({ model: 'typesafe/jev-1.13', state: { mensagem: 'Quero comprar, aceita pix?' }, questions: { compra: { type: 'noul', instructions: 'A pessoa quer comprar?' } } }) }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
      const texto = await r.text();
      let j = {}; try { j = JSON.parse(texto); } catch { /* HTML ou vazio */ }
      if (r.ok && j.answers) { saida.ok(`o Jev respondeu pela sua chave em ${Math.round(performance.now() - t0)} ms (custo US$ ${(+j.usage?.cost || 0).toFixed(6)})`); return; }
      saida.falha(r.status === 401 ? 'o OpenRouter recusou a chave (401): copie de novo em openrouter.ai/keys' : r.status === 402 ? 'a conta do OpenRouter está sem crédito (402): recarregue em openrouter.ai/credits' : `o OpenRouter respondeu ${r.status}: ${String(j.error?.message || texto).slice(0, 160)}`);
      process.exitCode = 2;
    }
  }
};

C.portao = async () => {
  saida.titulo('Portão: a conta tem VPS da Hostinger?');
  if (!lerSegredo('hostinger')) { saida.falha('falta o token da API da Hostinger'); saida.proximo('node kit/jev-kit.mjs token hostinger --abrir'); process.exitCode = 3; return; }
  const p = await verificarPortao();
  if (p.ok) {
    saida.ok(`portão ABERTO: ${p.n_vps} VPS ativa(s) na conta`);
    for (const v of p.vps) saida.item(`${v.id} · ${v.plano} · ${tamanhoLegivel(v.ram_mb)} · ${v.ip} · ${v.so} · ${v.estado}`);
    saida.proximo(lerEstado().escolhas.vps?.id ? proximoPasso().faca : 'escolher a VPS: node kit/jev-kit.mjs vps');
  } else if (p.motivo === 'sem_vps' || p.motivo === 'vps_inativa') {
    saida.falha('portão FECHADO'); saida.linha('\n' + mensagemSemVps()); process.exitCode = 3;
  } else {
    saida.falha(`portão FECHADO: ${p.detalhe || p.motivo}`); process.exitCode = 3;
  }
  saida.dados(p);
};

C.vps = async () => {
  if (sub === 'escolher') return vpsEscolher(resto[0]);
  if (sub === 'diagnostico') return vpsDiagnostico();
  if (sub === 'liberar-portas') return vpsLiberarPortas();
  if (sub === 'devolver-portas') return vpsDevolverPortas();
  await exigirPortao();
  const lista = await H.listarVps();
  saida.titulo(`VPS da sua conta na Hostinger (${lista.length})`);
  const e = lerEstado();
  for (const v of lista) {
    const marca = String(e.escolhas.vps?.id) === String(v.id) ? '→' : ' ';
    saida.linha(` ${marca} ${v.id}  ${v.plano.padEnd(6)} ${String(v.cpus).padStart(2)} vCPU · ${tamanhoLegivel(v.ram_mb).padStart(5)} · ${v.ip || 'sem IP'} · ${v.so || '?'} · ${v.estado}${v.firewall_id ? ' · firewall da Hostinger ativo' : ''}`);
  }
  saida.dados(lista);
  if (!e.escolhas.vps?.id) saida.proximo(lista.length === 1 ? `node kit/jev-kit.mjs vps escolher ${lista[0].id}` : 'escolha uma: node kit/jev-kit.mjs vps escolher <id>');
};

async function vpsEscolher(id) {
  if (!id) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs vps escolher <id>');
  await exigirPortao();
  const v = (await H.listarVps()).find((x) => String(x.id) === String(id));
  if (!v) throw new ErroKit('vps', `A VPS ${id} não está na sua conta. Veja a lista: node kit/jev-kit.mjs vps`);
  if (v.estado !== 'running') saida.aviso(`a VPS está "${v.estado}": ligue-a no hPanel antes de publicar`);
  if (!/ubuntu|debian/i.test(v.so)) saida.aviso(`o sistema é "${v.so}": o kit foi feito para Ubuntu 24.04 (ou Debian). Pode reinstalar pelo hPanel, mas isso apaga a VPS.`);
  const e = lerEstado();
  const trocou = e.escolhas.vps?.id && String(e.escolhas.vps.id) !== String(v.id);
  e.escolhas.vps = { id: v.id, ip: v.ip, plano: v.plano, ram_mb: v.ram_mb, cpus: v.cpus, hostname: v.hostname, so: v.so, firewall_id: v.firewall_id };
  if (trocou) { for (const p of ['ssh', 'preparar', 'publicar', 'verificar', 'dns']) delete e.passos[p]; delete e.ultima_publicacao; }
  if (e.escolhas.dominio?.tipo === 'hostinger') e.escolhas.dominio = { tipo: 'hostinger', nome: v.hostname };
  marcarPasso(e, 'vps', { id: v.id });
  gravarEstado(e);
  saida.ok(`VPS ${v.id} escolhida (${v.plano}, ${tamanhoLegivel(v.ram_mb)}, ${v.ip})`);
  saida.proximo(proximoPasso(e).faca);
}

function lerChaveValor(texto) {
  const o = {};
  for (const l of texto.split('\n')) { const i = l.indexOf('='); if (i > 0) { const k = l.slice(0, i).trim(); (o[k] ||= []).push(l.slice(i + 1).trim()); } }
  return o;
}

async function vpsDiagnostico({ silencioso = false } = {}) {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v) throw new ErroKit('sem_vps', 'Escolha a VPS antes: node kit/jev-kit.mjs vps');
  const script = fs.readFileSync(path.join(RAIZ, 'kit', 'remoto', 'diagnostico.sh'), 'utf8');
  const r = ssh(v.ip, 'bash -s', { entrada: script, timeout: 60_000 });
  if (r.status !== 0 || !r.stdout.includes('FIM=ok')) throw new ErroKit('ssh', `Não consegui rodar o diagnóstico na VPS: ${r.stderr.trim().slice(-200)}`);
  const d = lerChaveValor(r.stdout);
  const um = (k) => (d[k] || [''])[0];
  const ocupantes = [...new Set([...(d.PORTA_80_CONTEINER || []), ...(d.PORTA_443_CONTEINER || [])])];
  const doKit = (s) => /projeto=jevkit/.test(s);
  const conflito = (um('PORTA_80') !== 'livre' || um('PORTA_443') !== 'livre') && !(ocupantes.length && ocupantes.every(doKit));
  const diag = { so: um('SO'), arquitetura: um('ARQUITETURA'), ram_mb: +um('RAM_MB'), ram_livre_mb: +um('RAM_LIVRE_MB'), swap_mb: +um('SWAP_MB'), disco_livre_gb: +um('DISCO_LIVRE_GB'), cpus: +um('CPUS'),
    docker: um('DOCKER'), compose: um('COMPOSE'), porta_80: um('PORTA_80'), porta_443: um('PORTA_443'), ocupantes, conflito_portas: conflito, ufw: um('UFW'), kit_rodando: +um('KIT_RODANDO') || 0 };
  e.diagnostico = { em: agora(), ...diag };
  gravarEstado(e);
  if (silencioso) return diag;
  saida.titulo(`Diagnóstico da VPS ${v.id} (só leitura)`);
  saida.item(`${diag.so} · ${diag.arquitetura} · ${diag.cpus} vCPU · ${tamanhoLegivel(diag.ram_mb)} de RAM (${tamanhoLegivel(diag.ram_livre_mb)} livres) · swap ${tamanhoLegivel(diag.swap_mb)} · ${diag.disco_livre_gb} GB livres`);
  saida.item(`Docker: ${diag.docker === 'nao' ? 'não instalado (o preparar instala)' : `${diag.docker} · compose ${diag.compose}`}`);
  saida.item(`firewall do sistema (ufw): ${diag.ufw}`);
  if (conflito) {
    saida.falha(`portas 80/443 ocupadas por outro programa: 80=${diag.porta_80} · 443=${diag.porta_443}${ocupantes.length ? ` · contêineres: ${ocupantes.join(', ')}` : ''}`);
    saida.linha('  O kit precisa delas para o HTTPS. Opções: (1) liberar com "node kit/jev-kit.mjs vps liberar-portas --confirmo"');
    saida.linha('  (para esses programas; dá para voltar com "vps devolver-portas"); (2) usar outra VPS; (3) reinstalar a VPS pelo hPanel.');
  } else saida.ok(`portas 80/443: ${diag.kit_rodando ? 'já são do kit' : 'livres'}`);
  if (diag.kit_rodando) saida.item(`o kit já tem ${diag.kit_rodando} contêineres rodando nesta VPS`);
  const precisa = estimarRam(e.escolhas.apps || []);
  if (e.escolhas.apps?.length && precisa > diag.ram_mb * 0.8) saida.aviso(`os ${e.escolhas.apps.length} apps escolhidos pedem ~${tamanhoLegivel(precisa)}; esta VPS tem ${tamanhoLegivel(diag.ram_mb)}. Tire alguns apps ou use uma VPS maior.`);
  saida.dados(diag);
  return diag;
}

async function vpsLiberarPortas() {
  if (!flag('confirmo')) throw new ErroKit('precisa_confirmar', 'Isso para os programas que ocupam as portas 80/443 da VPS. Pergunte à pessoa e rode de novo com --confirmo depois do "sim".', 4);
  const e = lerEstado();
  const diag = await vpsDiagnostico({ silencioso: true });
  if (!diag.conflito_portas) { saida.ok('as portas 80/443 já estão livres'); return; }
  const parados = [];
  for (const oc of diag.ocupantes) {
    const nome = oc.split(' ')[0];
    if (/projeto=jevkit/.test(oc)) continue;
    const pol = ssh(e.escolhas.vps.ip, `docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' ${nome}`).stdout.trim() || 'no';
    const r = ssh(e.escolhas.vps.ip, `docker update --restart=no ${nome} >/dev/null && docker stop ${nome} >/dev/null && echo parado`);
    if (r.stdout.includes('parado')) { parados.push({ tipo: 'docker', nome, restart: pol }); saida.ok(`contêiner ${nome} parado (reinício automático desligado)`); }
    else saida.falha(`não consegui parar ${nome}: ${r.stderr.trim().slice(-160)}`);
  }
  for (const prog of new Set([diag.porta_80, diag.porta_443])) {
    if (['livre', 'docker-proxy', 'ocupada', ''].includes(prog)) continue;
    const servico = { nginx: 'nginx', apache2: 'apache2', httpd: 'apache2', caddy: 'caddy', lighttpd: 'lighttpd', traefik: 'traefik', haproxy: 'haproxy' }[prog];
    if (!servico) { saida.falha(`a porta está com "${prog}", que o kit não sabe parar com segurança. Resolva na VPS ou use outra VPS.`); continue; }
    const r = ssh(e.escolhas.vps.ip, `systemctl stop ${servico} && systemctl disable ${servico} >/dev/null 2>&1; systemctl is-active ${servico} || true`);
    if (!/^active/m.test(r.stdout)) { parados.push({ tipo: 'systemd', nome: servico }); saida.ok(`serviço ${servico} parado e desativado`); }
    else saida.falha(`o serviço ${servico} continua ativo`);
  }
  e.portas_liberadas = [...(e.portas_liberadas || []), ...parados.map((p) => ({ ...p, em: agora() }))];
  gravarEstado(e);
  const depois = await vpsDiagnostico({ silencioso: true });
  (depois.conflito_portas ? saida.falha : saida.ok).call(saida, depois.conflito_portas ? 'as portas continuam ocupadas' : 'portas 80/443 livres');
}

async function vpsDevolverPortas() {
  if (!flag('confirmo')) throw new ErroKit('precisa_confirmar', 'Isso para os apps do kit (docker compose down) e religa os programas que o kit parou. Rode com --confirmo depois do "sim".', 4);
  const e = lerEstado();
  const ip = e.escolhas.vps.ip;
  ssh(ip, `[ -d ${DESTINO}/deploy ] && cd ${DESTINO}/deploy && docker compose stop caddy >/dev/null 2>&1 || true`);
  for (const p of [...(e.portas_liberadas || [])].reverse()) {
    const r = p.tipo === 'docker' ? ssh(ip, `docker update --restart=${p.restart || 'no'} ${p.nome} >/dev/null && docker start ${p.nome} >/dev/null && echo ok`)
      : ssh(ip, `systemctl enable --now ${p.nome} >/dev/null 2>&1 && echo ok`);
    (r.stdout.includes('ok') ? saida.ok : saida.falha).call(saida, `${p.tipo} ${p.nome} ${r.stdout.includes('ok') ? 'de volta' : 'não voltou'}`);
  }
  e.portas_liberadas = [];
  gravarEstado(e);
}

C.apps = async () => {
  const e = lerEstado();
  if (sub === 'escolher' || sub === 'adicionar' || sub === 'remover') {
    await exigirPortao();
    const { ids, desconhecidos } = resolverSelecao(semFlags(resto));
    if (desconhecidos.length) saida.aviso(`não reconheci: ${desconhecidos.join(', ')} (veja "node kit/jev-kit.mjs apps")`);
    let atual = new Set(sub === 'escolher' ? [] : e.escolhas.apps || []);
    if (sub === 'remover') ids.forEach((i) => atual.delete(i)); else ids.forEach((i) => atual.add(i));
    e.escolhas.apps = APPS.filter((a) => atual.has(a.id)).map((a) => a.id);
    e.escolhas.publicos = (e.escolhas.publicos || []).filter((i) => atual.has(i));
    gravarEstado(e);
    const ram = estimarRam(e.escolhas.apps);
    saida.ok(`${e.escolhas.apps.length} apps escolhidos (${e.escolhas.apps.filter((i) => porId(i).tipo === 'obra').length} grandes, ${e.escolhas.apps.filter((i) => porId(i).tipo === 'modelo').length} modelos) · memória estimada ~${tamanhoLegivel(ram)}`);
    const vps = e.escolhas.vps;
    if (vps?.ram_mb && ram > vps.ram_mb * 0.7) saida.aviso(`a VPS escolhida tem ${tamanhoLegivel(vps.ram_mb)}: para esta seleção, o mínimo seguro é a ${planoMinimo(ram).nome}. Tire os apps pesados ou troque de VPS.`);
    const pesados = e.escolhas.apps.filter((i) => porId(i).pesado);
    if (pesados.length) saida.aviso(`apps pesados na seleção: ${pesados.join(', ')} (veja o motivo no catálogo)`);
    if (e.passos.publicar) saida.proximo('para valer na VPS: node kit/jev-kit.mjs publicar');
    else saida.proximo(proximoPasso(e).faca);
    return saida.dados({ apps: e.escolhas.apps, ram_mb: ram });
  }
  if (sub === 'publico' || sub === 'privado') {
    const { ids } = resolverSelecao(semFlags(resto));
    const pub = new Set(e.escolhas.publicos || []);
    for (const i of ids) { if (!(e.escolhas.apps || []).includes(i)) { saida.aviso(`${i} não está entre os escolhidos`); continue; } if (sub === 'publico') pub.add(i); else pub.delete(i); }
    e.escolhas.publicos = [...pub];
    gravarEstado(e);
    saida.ok(`públicos (abrem sem login): ${e.escolhas.publicos.join(', ') || 'nenhum'}`);
    if (sub === 'publico' && e.escolhas.publicos.length) saida.aviso('app público gasta crédito do OpenRouter com qualquer visitante: o orçamento diário do gateway continua valendo (node kit/jev-kit.mjs orcamento)');
    saida.proximo('para valer na VPS: node kit/jev-kit.mjs publicar');
    return;
  }
  if (sub === 'escolhidos') {
    const lista = (e.escolhas.apps || []).map(porId);
    saida.titulo(`Escolhidos (${lista.length})`);
    for (const a of lista) saida.linha(`${linhaApp(a)}${(e.escolhas.publicos || []).includes(a.id) ? '  · público' : ''}${e.escolhas.dominio?.nome ? `\n       ${urlDoApp(a.id, e.escolhas.dominio.nome)}` : ''}`);
    return saida.dados(lista);
  }
  if (sub === 'info') {
    const a = porId(resto[0]) || APPS.find((x) => x.n === +resto[0]);
    if (!a) throw new ErroKit('app', `App desconhecido: ${resto[0]}`);
    saida.titulo(`${a.emoji} ${a.titulo} (${a.id}, nº ${a.n})`);
    saida.linha(`${a.resumo}\n${a.descricao || ''}`);
    saida.item(`tipo: ${a.tipo === 'obra' ? 'app grande (contêiner próprio, subdomínio próprio)' : `modelo (motor ${a.motor}, um arquivo só)`}`);
    saida.item(`onde mexer: ${a.arquivo}`);
    if (a.precisa?.length) saida.item(`precisa de: ${a.precisa.join(', ')}`);
    if (a.notas) saida.item(a.notas);
    return saida.dados(a);
  }
  const lista = sub === 'buscar' ? buscar(resto.join(' ')) : sub && sub.startsWith('categoria') ? APPS.filter((a) => a.categoria === (resto[0] || sub.split(':')[1])) : APPS;
  const escolhidos = new Set(e.escolhas.apps || []);
  let cat = null;
  saida.titulo(sub === 'buscar' ? `Busca: "${resto.join(' ')}" (${lista.length})` : `Catálogo (${lista.length} apps)`);
  for (const a of [...lista].sort((x, y) => (x.categoria_ordem - y.categoria_ordem) || (x.n - y.n))) {
    if (a.categoria !== cat) { cat = a.categoria; saida.linha(`\n  ${CATEGORIAS[cat] || cat}`); }
    saida.linha(`${escolhidos.has(a.id) ? '✓' : ' '}${linhaApp(a)}`);
    saida.linha(`        ${a.resumo}`);
  }
  saida.linha('\nEscolha com: node kit/jev-kit.mjs apps escolher <números, faixas (18-27), ids, categoria:<id>, leves ou todos>');
  saida.dados(lista);
};

C.dominio = async () => {
  const e = lerEstado();
  if (sub === 'dns') return dominioDns();
  if (sub === 'conferir') return dominioConferir();
  if (!sub) {
    saida.linha(e.escolhas.dominio?.nome ? `Endereço: https://${hostHub(e.escolhas.dominio.nome)} (${e.escolhas.dominio.tipo === 'hostinger' ? 'endereço grátis da VPS' : 'domínio próprio'})` : 'Endereço ainda não definido.');
    return saida.dados(e.escolhas.dominio || null);
  }
  if (!e.escolhas.vps?.id) throw new ErroKit('sem_vps', 'Escolha a VPS antes (node kit/jev-kit.mjs vps).');
  const email = opcao('email') || e.escolhas.dominio?.email || '';
  if (sub === 'hostinger') {
    const nome = e.escolhas.vps.hostname;
    if (!/\.hstgr\.cloud$/.test(nome || '')) throw new ErroKit('dominio', `O nome da VPS é "${nome}", não o endereço grátis *.hstgr.cloud. Use um domínio próprio: node kit/jev-kit.mjs dominio <exemplo.com.br>`);
    const r = await apontaPara(`jev.${nome}`, e.escolhas.vps.ip);
    if (!r.ok) throw new ErroKit('dominio', `jev.${nome} não aponta para a VPS (${r.publicos.join(', ') || 'sem resposta'}). Use um domínio próprio.`);
    e.escolhas.dominio = { tipo: 'hostinger', nome, email };
    marcarPasso(e, 'dns', { tipo: 'hostinger' });
    gravarEstado(e);
    saida.ok(`endereço grátis da VPS: https://jev.${nome} (os apps grandes ficam em https://jev-<app>.${nome})`);
  } else {
    const nome = sub.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(nome)) throw new ErroKit('dominio', `Domínio inválido: ${sub}`);
    e.escolhas.dominio = { tipo: 'proprio', nome, email };
    delete e.passos.dns;
    gravarEstado(e);
    saida.ok(`domínio próprio: ${nome}. O hub fica em https://jev.${nome} e cada app grande em https://jev-<app>.${nome}`);
  }
  saida.proximo(proximoPasso(e).faca);
};

async function dominioDns() {
  const e = lerEstado();
  const d = e.escolhas.dominio, v = e.escolhas.vps;
  if (!d?.nome || !v) throw new ErroKit('uso', 'Escolha a VPS e o domínio antes.');
  if (d.tipo === 'hostinger') { saida.ok('o endereço grátis da VPS já aponta sozinho'); return; }
  const obras = (e.escolhas.apps || []).filter((i) => porId(i).tipo === 'obra');
  const nomes = nomesDns(obras);
  const zona = await H.lerZonaDns(d.nome);
  if (zona) {
    const existentes = (Array.isArray(zona) ? zona : []).filter((r) => r.type === 'A' && nomes.includes(r.name));
    const diferentes = existentes.filter((r) => !(r.records || []).some((x) => x.content === v.ip));
    saida.titulo(`O domínio ${d.nome} está nesta conta da Hostinger`);
    saida.linha(`  Registros A que o kit cria (TTL 5 min), todos para ${v.ip}:`);
    for (const n of nomes) saida.item(`${n}.${d.nome}`);
    if (diferentes.length) saida.aviso(`já existem e apontam para outro lugar (serão trocados): ${diferentes.map((r) => r.name).join(', ')}`);
    if (!flag('confirmo')) { saida.proximo('pergunte à pessoa e rode "node kit/jev-kit.mjs dominio dns --confirmo"'); process.exitCode = 4; return; }
    await H.gravarRegistrosA(d.nome, nomes, v.ip, { confirmo: true });
    saida.ok(`${nomes.length} registros A gravados no DNS da Hostinger`);
  } else {
    saida.titulo(`O DNS de ${d.nome} não está nesta conta da Hostinger`);
    saida.linha('  No painel de DNS onde o domínio está (Registro.br, Cloudflare, GoDaddy…), crie estes registros:');
    for (const n of nomes) saida.linha(`    Tipo A · Nome ${n} · Valor ${v.ip} · TTL 300${/cloudflare/i.test(d.nome) ? '' : ''}`);
    saida.linha('  Na Cloudflare, deixe a nuvem CINZA (só DNS), senão o certificado HTTPS não sai.');
  }
  return dominioConferir();
}

async function dominioConferir() {
  const e = lerEstado();
  const d = e.escolhas.dominio, v = e.escolhas.vps;
  const obras = (e.escolhas.apps || []).filter((i) => porId(i).tipo === 'obra');
  saida.titulo('Conferindo o DNS (resolvedores públicos)');
  let ok = true;
  for (const n of nomesDns(obras)) {
    const r = await apontaPara(`${n}.${d.nome}`, v.ip);
    (r.ok ? saida.ok : saida.falha).call(saida, `${n}.${d.nome} → ${r.publicos.join(', ') || 'ainda não existe'}`);
    ok &&= r.ok;
  }
  if (ok) { marcarPasso(e, 'dns', { tipo: 'proprio' }); gravarEstado(e); saida.proximo(proximoPasso(e).faca); }
  else { saida.linha('  DNS novo leva de 1 a 30 minutos para aparecer. Rode "node kit/jev-kit.mjs dominio conferir" de novo.'); process.exitCode = 5; }
}

C.login = async () => {
  const e = lerEstado();
  const usuario = opcao('usuario');
  if (usuario) {
    e.escolhas.login = { usuario: usuario.trim().toLowerCase() };
    gravarEstado(e);
  }
  if (!e.escolhas.login?.usuario) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs login --usuario <email>');
  if (flag('nova-senha')) { fs.rmSync(path.join(RAIZ, 'segredos', 'login-dos-apps-senha.txt'), { force: true }); saida.aviso('senha nova gerada: vale depois do próximo "publicar"'); }
  const { usuario: u, senha } = credenciaisLogin(e);
  saida.titulo('Login dos apps (o mesmo para todos)');
  saida.linha(`  usuário: ${u}\n  senha:   ${senha}\n  (guardada em segredos/login-dos-apps-senha.txt)`);
  if (!usuario && !flag('nova-senha')) return;
  saida.proximo(proximoPasso(e).faca);
};

C.ssh = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (sub === 'chave') { const pub = gerarChave(); saida.ok('chave do kit pronta (segredos/ssh/jev-kit)'); saida.linha(`  pública: ${pub}`); return; }
  if (sub === 'usar-minha') {
    const arq = resto[0] && path.resolve(resto[0]);
    if (!arq || !fs.existsSync(arq)) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs ssh usar-minha <caminho da sua chave privada>');
    e.escolhas.ssh = { chave_propria: arq }; gravarEstado(e); saida.ok(`vou usar a chave ${arq}`);
  }
  if (!v) throw new ErroKit('sem_vps', 'Escolha a VPS antes (node kit/jev-kit.mjs vps).');
  if (sub === 'cadastrar' || sub === 'remover') {
    await exigirPortao();
    const pub = sub === 'cadastrar' ? gerarChave() : chavePublica();
    if (!pub) throw new ErroKit('ssh', 'O kit ainda não tem chave.');
    if (sub === 'cadastrar') await H.adicionarChaveSsh(v.id, pub, { confirmo: flag('confirmo') });
    else await H.removerChaveSsh(v.id, pub, { confirmo: flag('confirmo') });
    saida.ok(sub === 'cadastrar' ? 'chave do kit cadastrada na VPS pela API da Hostinger (vale em até 1 minuto)' : 'chave do kit removida da VPS');
    if (sub === 'remover') { delete e.passos.ssh; gravarEstado(e); return; }
  }
  // testar (padrão)
  let t = testarSsh(v.ip);
  for (let i = 0; i < 6 && !t.ok && sub === 'cadastrar'; i++) { await new Promise((r) => setTimeout(r, 10_000)); t = testarSsh(v.ip); }
  if (t.ok) {
    marcarPasso(e, 'ssh', { arquitetura: t.arquitetura, so: t.so }); gravarEstado(e);
    saida.ok(`entrei na VPS por SSH (${t.so}, ${t.arquitetura})`);
    saida.proximo(proximoPasso(e).faca);
    return;
  }
  delete e.passos.ssh; gravarEstado(e);
  if (t.motivo === 'host_mudou') { esquecerHost(v.ip); saida.aviso('a VPS foi reinstalada (impressão digital nova): esqueci a antiga, rode de novo "ssh testar"'); }
  else if (t.motivo === 'chave_recusada') {
    saida.falha('a VPS recusou a chave do kit');
    saida.linha('  Para resolver, escolha uma opção (pergunte à pessoa):');
    saida.linha('    a) cadastrar pela API da Hostinger: node kit/jev-kit.mjs ssh cadastrar --confirmo');
    saida.linha(`    b) cadastrar à mão: hPanel → VPS → Configurações → Chaves SSH → Adicionar, colando:\n       ${chavePublica() || gerarChave()}`);
    saida.linha('    c) usar uma chave que a pessoa já tem: node kit/jev-kit.mjs ssh usar-minha <caminho>');
  } else saida.falha(`sem conexão SSH (${t.motivo}): ${t.erro}`);
  process.exitCode = 6;
};

C.snapshot = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v) throw new ErroKit('sem_vps', 'Escolha a VPS antes.');
  await exigirPortao();
  const s = await H.lerSnapshot(v.id);
  if (sub !== 'criar') {
    saida.titulo('Snapshot da VPS (a Hostinger guarda só 1 por VPS)');
    if (s?.id) saida.item(`existe um de ${new Date(s.created_at).toLocaleString('pt-BR')}, vence ${new Date(s.expires_at).toLocaleString('pt-BR')}: criar outro SUBSTITUI este`);
    else saida.item('nenhum snapshot agora');
    saida.linha('  Snapshot = foto da VPS inteira. Se algo der errado, dá para voltar pelo hPanel (VPS → Snapshots e backups).');
    saida.proximo('pergunte à pessoa; com o "sim": node kit/jev-kit.mjs snapshot criar --confirmo');
    return saida.dados(s);
  }
  const det = await H.detalheVps(v.id);
  if (det.trava === 'locked') throw new ErroKit('vps_ocupada', 'A VPS está ocupada com outra ação da Hostinger (backup ou snapshot). Espere alguns minutos e tente de novo.');
  await H.criarSnapshot(v.id, { confirmo: flag('confirmo') });
  saida.ok('snapshot pedido à Hostinger (fica pronto em alguns minutos; o kit pode seguir enquanto isso)');
  marcarPasso(e, 'snapshot'); gravarEstado(e);
};

C.firewall = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v) throw new ErroKit('sem_vps', 'Escolha a VPS antes.');
  await exigirPortao();
  const det = await H.detalheVps(v.id);
  if (!det.firewall_id) { saida.ok('a VPS não tem firewall da Hostinger ativo: nada a fazer aqui'); return; }
  const fw = await H.lerFirewall(det.firewall_id);
  const regras = fw.rules || [];
  const aberta = (porta) => regras.some((r) => r.action !== 'drop' && ['TCP', 'HTTP', 'HTTPS', 'any'].includes(r.protocol) && (String(r.port) === String(porta) || r.port === 'any' || (r.protocol === 'HTTP' && porta === 80) || (r.protocol === 'HTTPS' && porta === 443)));
  const faltam = [80, 443].filter((p) => !aberta(p));
  saida.titulo(`Firewall da Hostinger "${fw.name}" (${regras.length} regras)`);
  if (!faltam.length) { saida.ok('80 e 443 já estão abertas'); return; }
  saida.aviso(`fechadas: ${faltam.join(', ')} (o HTTPS dos apps não funciona sem elas)`);
  if (sub !== 'liberar') { saida.proximo('pergunte à pessoa; com o "sim": node kit/jev-kit.mjs firewall liberar --confirmo'); return; }
  for (const p of faltam) await H.abrirPortaFirewall(det.firewall_id, p, { confirmo: flag('confirmo') });
  await H.sincronizarFirewall(det.firewall_id, v.id, { confirmo: flag('confirmo') });
  saida.ok(`portas ${faltam.join(' e ')} abertas no firewall da Hostinger (as outras regras ficaram como estavam)`);
};

C.preparar = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v) throw new ErroKit('sem_vps', 'Escolha a VPS antes.');
  await exigirPortao();
  if (!e.passos.ssh) { const t = testarSsh(v.ip); if (!t.ok) throw new ErroKit('ssh', 'Sem acesso SSH à VPS. Rode "node kit/jev-kit.mjs ssh testar".'); marcarPasso(e, 'ssh'); gravarEstado(e); }
  saida.titulo(`Preparando a VPS ${v.id} (${v.ip})`);
  const script = fs.readFileSync(path.join(RAIZ, 'kit', 'remoto', 'preparar-vps.sh'), 'utf8');
  const r = ssh(v.ip, 'bash -s', { entrada: script, timeout: 900_000 });
  for (const l of r.stdout.split('\n').filter((x) => x.startsWith('[preparar]'))) saida.item(l.replace('[preparar] ', ''));
  const erro = r.stdout.match(/^ERRO_[A-Z]+=(.*)$/m);
  if (erro || r.status !== 0) {
    if (/ERRO_PORTAS/.test(r.stdout)) { await vpsDiagnostico(); throw new ErroKit('portas', 'As portas 80/443 estão ocupadas: veja o diagnóstico acima e combine com a pessoa o que fazer.'); }
    throw new ErroKit('preparar', erro ? erro[1] : `o preparo falhou: ${r.stderr.trim().slice(-300)}`);
  }
  const pronto = r.stdout.match(/^PRONTO=(.*)$/m);
  saida.ok(`VPS pronta: ${pronto ? pronto[1] : 'ok'}`);
  if (e.escolhas.vps.firewall_id) saida.aviso('a VPS tem firewall da Hostinger ativo: rode "node kit/jev-kit.mjs firewall" para conferir as portas 80 e 443');
  marcarPasso(e, 'preparar'); gravarEstado(e);
  saida.proximo(proximoPasso(e).faca);
};

C.publicar = async () => {
  const r = await publicar();
  const e = lerEstado();
  saida.titulo('Publicado');
  saida.linha(`  Hub: https://${r.hub}   (login: ${r.usuario})`);
  saida.proximo('node kit/jev-kit.mjs verificar');
};

C.verificar = async () => {
  const r = await verificar({ rapido: flag('rapido') });
  const e = lerEstado();
  if (r.ok) {
    saida.titulo('Tudo certo');
    const { usuario, senha } = credenciaisLogin(e);
    saida.linha(`  Hub: https://${hostHub(e.escolhas.dominio.nome)}\n  Login: ${usuario} · senha: ${senha}`);
    saida.proximo(proximoPasso(e).faca);
  } else { saida.linha(`\n${r.itens.filter((i) => !i.ok).length} item(ns) com problema.`); process.exitCode = 7; }
};

C.status = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  saida.titulo('Instalação');
  imprimirPortao(lerPortao());
  if (!v) { saida.proximo(proximoPasso(e).faca); return; }
  saida.item(`VPS ${v.id} · ${v.plano} · ${v.ip}`);
  if (e.escolhas.dominio?.nome) {
    const { usuario } = credenciaisLogin(e);
    saida.item(`hub: https://${hostHub(e.escolhas.dominio.nome)} · login ${usuario} (a senha: node kit/jev-kit.mjs login)`);
  }
  if (e.escolhas.apps?.length && e.escolhas.dominio?.nome) {
    saida.titulo(`Apps (${e.escolhas.apps.length})`);
    for (const id of e.escolhas.apps) { const a = porId(id); saida.linha(`  ${a.emoji} ${a.titulo.padEnd(38)} ${urlDoApp(id, e.escolhas.dominio.nome)}${(e.escolhas.publicos || []).includes(id) ? '  (público)' : ''}`); }
  }
  if (e.passos.publicar && !flag('local')) {
    const r = ssh(v.ip, `cd ${DESTINO}/deploy && docker compose ps --format '{{.Service}} {{.State}}' && docker compose exec -T gateway node -e "fetch('http://127.0.0.1:8787/v1/stats').then(r=>r.json()).then(s=>console.log('STATS '+JSON.stringify({hoje:s.today,orc:s.budget,llm:s.llm,portao:s.portao})))"`, { timeout: 40_000 });
    const linhas = r.stdout.split('\n');
    const rodando = linhas.filter((l) => / running$/.test(l)).length, todos = linhas.filter((l) => /^\S+ \S+$/.test(l)).length;
    saida.titulo('Na VPS');
    saida.item(`${rodando}/${todos} contêineres rodando`);
    const st = linhas.find((l) => l.startsWith('STATS '));
    if (st) {
      const s = JSON.parse(st.slice(6));
      saida.item(`hoje: ${s.hoje.calls} chamadas ao Jev · US$ ${(+s.hoje.cost).toFixed(4)} (teto do dia US$ ${s.orc.daily_usd}) · total US$ ${(+s.orc.spent_total).toFixed(4)} de US$ ${s.orc.total_usd}`);
      saida.item(`modelo de texto: ${s.llm.model} · ${s.llm.calls} respostas · US$ ${(+s.llm.cost).toFixed(4)}`);
      if (!s.portao.ok) saida.falha(`portão fechado no gateway: ${s.portao.motivo}`);
    }
  }
  saida.proximo(proximoPasso(e).faca);
};

C.logs = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v || !e.passos.publicar) throw new ErroKit('sem_publicar', 'Nada publicado ainda.');
  const alvo = sub ? (sub.startsWith('app-') || ['caddy', 'auth', 'gateway'].includes(sub) ? sub : nomeServico(sub)) : '';
  const r = ssh(v.ip, `cd ${DESTINO}/deploy && docker compose logs --tail ${opcao('linhas') || 80} --no-color ${alvo}`, { timeout: 60_000 });
  console.log(r.stdout || r.stderr);
};

C.orcamento = async () => {
  const e = lerEstado();
  const o = e.escolhas.orcamento || { dia: 2, total: 20, app_dia: 1 };
  for (const [k, f] of [['dia', 'dia'], ['total', 'total'], ['app_dia', 'app-dia']]) { const v = opcao(f); if (v !== null) { if (!(+v > 0)) throw new ErroKit('uso', `--${f} precisa ser um número maior que zero`); o[k] = +v; } }
  e.escolhas.orcamento = o; gravarEstado(e);
  saida.ok(`orçamento do Jev e do modelo de texto: US$ ${o.dia}/dia · US$ ${o.total} no total · US$ ${o.app_dia} por app por dia`);
  saida.linha('  Referência: 1 decisão custa ~US$ 0,0001; US$ 1 rende ~10 mil decisões.');
  if (e.passos.publicar) saida.proximo('para valer na VPS: node kit/jev-kit.mjs publicar');
};

C.llm = async () => {
  const e = lerEstado();
  if (!['nuvem', 'desligado'].includes(sub)) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs llm <nuvem|desligado> [--modelo <id do OpenRouter>]');
  e.escolhas.llm = sub;
  if (opcao('modelo')) e.escolhas.llm_modelo = opcao('modelo');
  gravarEstado(e);
  saida.ok(sub === 'nuvem' ? `modelo de texto na nuvem: ${e.escolhas.llm_modelo || 'google/gemini-2.5-flash-lite'} (Estúdio por Voz e Mini Cluely)` : 'modelo de texto desligado: o Estúdio e o Mini Cluely funcionam sem as respostas escritas');
  if (e.passos.publicar) saida.proximo('para valer na VPS: node kit/jev-kit.mjs publicar');
};

C.exportar = async () => {
  await exigirPortao();
  const id = sub;
  if (!id) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs exportar <id do app> [--destino <pasta>]');
  const r = await exportar(id, opcao('destino'), lerEstado());
  saida.ok(`${porId(id).titulo} exportado em ${r.pasta}`);
  saida.linha(`  Para rodar: entre na pasta, copie .env.exemplo para .env com a chave do OpenRouter e rode "${r.iniciar}".`);
  saida.dados(r);
};

C.local = async () => {
  await exigirPortao();
  const id = sub;
  if (!id || !porId(id)) throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs local <id do app> [--porta 3000]');
  const chave = lerSegredo('openrouter');
  if (!chave) throw new ErroKit('sem_chave', 'Falta a chave do OpenRouter: node kit/jev-kit.mjs token openrouter --abrir');
  const destino = path.join(RAIZ, '.kit', 'local', id);
  const r = await exportar(id, destino, lerEstado());
  const porta = opcao('porta') || '3000';
  saida.ok(`rodando ${porId(id).titulo} no seu computador: http://localhost:${porta}  (Ctrl+C para parar)`);
  const { spawn } = await import('node:child_process');
  const p = spawn(process.execPath, [r.tipo === 'modelo' ? 'server.mjs' : 'iniciar.mjs'], { cwd: destino, stdio: 'inherit', env: { ...process.env, OPENROUTER_API_KEY: chave, PORT: porta } });
  await new Promise((res) => p.on('exit', res));
};

// Mede um modelo contra o Jev de verdade: sobe o gateway do kit só neste computador, por alguns segundos
C.testar = async () => {
  await exigirPortao();
  const id = sub;
  const a = porId(id) || (id && fs.existsSync(path.join(RAIZ, 'apps', 'modelos', 'public', id, 'app.config.mjs')) ? { id, tipo: 'modelo' } : null);
  if (!a || a.tipo !== 'modelo') throw new ErroKit('uso', 'Use: node kit/jev-kit.mjs testar <id de um modelo (18 a 100) ou de um modelo seu>. Para apps grandes, use "local".');
  const chave = lerSegredo('openrouter');
  if (!chave) throw new ErroKit('sem_chave', 'Falta a chave do OpenRouter: node kit/jev-kit.mjs token openrouter --abrir');
  const { carimbo } = await import('./lib/exportar.mjs');
  const tmp = path.join(RAIZ, '.kit', 'teste');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'portao.json'), carimbo(lerEstado()));
  const porta = 18000 + Math.floor(Math.random() * 900);
  const { spawn } = await import('node:child_process');
  const gw = spawn(process.execPath, [path.join(RAIZ, 'plataforma', 'gateway', 'server.mjs')], { cwd: tmp, stdio: 'ignore',
    env: { ...process.env, PORT: String(porta), OPENROUTER_API_KEY: chave, DATA_DIR: path.join(tmp, 'gateway'), PORTAO_FILE: path.join(tmp, 'portao.json'), LLM_MODEL: 'off', BUDGET_DAILY_USD: '1', BUDGET_TOTAL_USD: '5' } });
  try {
    let pronto = false;
    for (let i = 0; i < 40 && !pronto; i++) { await new Promise((r) => setTimeout(r, 250)); pronto = await fetch(`http://127.0.0.1:${porta}/healthz`).then((r) => r.ok).catch(() => false); }
    if (!pronto) throw new ErroKit('gateway', 'O gateway de teste não subiu neste computador.');
    const { rodarAoVivo } = await import('./lib/util.mjs');
    const c = await rodarAoVivo(process.execPath, [path.join(RAIZ, 'apps', 'modelos', 'tools', 'testar.mjs'), id, '--gateway', `http://127.0.0.1:${porta}`, ...(flag('tudo') ? ['--tudo'] : [])]);
    if (c !== 0) process.exitCode = c;
  } finally { gw.kill(); }
};

C.desinstalar = async () => {
  const e = lerEstado();
  const v = e.escolhas.vps;
  if (!v) throw new ErroKit('sem_vps', 'Nenhuma VPS escolhida.');
  if (!flag('confirmo')) throw new ErroKit('precisa_confirmar', `Isso para e remove os contêineres do kit na VPS ${v.id}${flag('apagar-dados') ? ' E APAGA os dados dos apps' : ' (os dados ficam guardados)'}. Rode com --confirmo depois do "sim".`, 4);
  // com --apagar-dados, some também o volume de app que saiu antes da lista (o compose não o conhece mais)
  const apagar = flag('apagar-dados') ? "; docker volume ls -q --filter label=com.docker.compose.project=jevkit | xargs -r docker volume rm >/dev/null 2>&1" : '';
  const r = ssh(v.ip, `cd ${DESTINO}/deploy 2>/dev/null && docker compose down ${flag('apagar-dados') ? '-v' : ''} 2>&1 | tail -3${apagar}; echo feito`, { timeout: 300_000 });
  saida.ok(r.stdout.includes('feito') ? 'apps do kit desligados na VPS' : 'nada para desligar');
  for (const p of ['publicar', 'verificar']) delete e.passos[p];
  delete e.ultima_publicacao;
  gravarEstado(e);
};

C.ajuda = async () => {
  console.log(`Kit Jev · 100 apps · v${VERSAO}
O seu agente roda estes comandos por você. Comece por: node kit/jev-kit.mjs sessao

  sessao | proximo                    onde o setup está e o próximo passo
  checar                             Node, ssh, tar e curl neste computador
  token <hostinger|openrouter|elevenlabs|youtube> [--abrir | --colar | --testar]
  portao                             confere na API da Hostinger se a conta tem VPS (obrigatório)
  vps [escolher <id> | diagnostico | liberar-portas --confirmo | devolver-portas --confirmo]
  apps [buscar <palavras> | info <id> | escolher|adicionar|remover <seleção> | publico|privado <ids> | escolhidos]
  dominio <exemplo.com.br | hostinger> [--email voce@exemplo.com] · dominio dns [--confirmo] · dominio conferir
  login --usuario <email> [--nova-senha]
  ssh [testar | chave | cadastrar --confirmo | remover --confirmo | usar-minha <chave>]
  snapshot [criar --confirmo]        foto da VPS antes de mexer (a Hostinger guarda 1)
  firewall [liberar --confirmo]      portas 80/443 no firewall da Hostinger, se houver
  preparar                           Docker e o básico na VPS (não apaga nada)
  publicar                           sobe os apps escolhidos na VPS
  verificar [--rapido]               confere DNS, HTTPS, login, cada app e o Jev
  status | logs [app]                o que está no ar, gasto do dia e registros
  orcamento [--dia 2 --total 20 --app-dia 1]   tetos de gasto no OpenRouter
  llm <nuvem|desligado> [--modelo <id>]       modelo de texto do Estúdio e do Mini Cluely
  testar <id> [--tudo]               mede um modelo contra o Jev de verdade (acerto x "esperado")
  exportar <id> [--destino <pasta>]  leva um app para outro projeto
  local <id> [--porta 3000]          roda um app no seu computador
  desinstalar --confirmo [--apagar-dados]

Seleção de apps: números (7), faixas (18-27), ids (editor-corta), categoria:<id>, leves, obras, modelos ou todos.
Sem VPS da Hostinger, nada funciona: ${LINK_VPS} (cupom ${CUPOM}).`);
};

// ======================================================================= execução
const fn = C[cmd];
if (!fn) { console.error(`Comando desconhecido: ${cmd}. Veja: node kit/jev-kit.mjs ajuda`); process.exit(1); }
try {
  await fn();
} catch (e) {
  if (e instanceof ErroKit) {
    if (saida.json) console.log(JSON.stringify({ ok: false, codigo: e.codigo, mensagem: e.message }));
    else console.error(`\n✗ ${e.message}`);
    process.exit(e.saida || 1);
  }
  console.error(`\n✗ Erro inesperado: ${e.stack || e.message}`);
  process.exit(1);
}

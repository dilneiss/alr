// O PORTÃO: o kit e os 100 apps só funcionam para quem tem uma VPS da Hostinger.
// A prova é a própria API da Hostinger: o token da pessoa precisa listar pelo menos 1 VPS ativa na conta dela.
// O resultado (sem o token) fica em .kit/portao.json, vale 7 dias e é refeito sozinho quando vence.
// Na VPS, o publicar grava o carimbo em /etc/jev-kit/portao.json, e o gateway dos apps só decide com ele.
import path from 'node:path';
import { KIT_DIR, lerJson, gravarJson, lerSegredo, agora, VERSAO, LINK_VPS, CUPOM, ErroKit, saida } from './util.mjs';
import { listarVps } from './hostinger.mjs';

export const ARQ_PORTAO = path.join(KIT_DIR, 'portao.json');
const VALIDADE_DIAS = 7;
const ESTADOS_MORTOS = new Set(['destroyed', 'destroying', 'suspended', 'suspending', 'error']);

export function mensagemSemVps() {
  return [
    'Este kit só funciona com uma VPS da Hostinger, e a sua conta não tem nenhuma VPS ativa.',
    '',
    `  1. Contrate uma VPS aqui: ${LINK_VPS}`,
    `     Cupom de desconto: ${CUPOM}`,
    '     Para começar, a KVM 2 (2 vCPU, 8 GB) roda todos os apps leves com folga. Escolha o sistema "Ubuntu 24.04".',
    '  2. Espere a VPS ficar "Em atividade" no hPanel (uns 5 minutos).',
    '  3. Volte aqui e peça para continuar o setup: o portão confere de novo.',
  ].join('\n');
}

export function lerPortao() { return lerJson(ARQ_PORTAO, null); }

export function portaoValido(p = lerPortao()) {
  if (!p || p.ok !== true || !Array.isArray(p.vps) || !p.vps.length) return false;
  const idade = (Date.now() - Date.parse(p.verificado_em)) / 86400e3;
  return idade >= 0 && idade <= VALIDADE_DIAS;
}

// Confere na API agora. Devolve { ok, motivo, vps, ... } e grava o carimbo (sem segredos).
export async function verificarPortao() {
  const token = lerSegredo('hostinger');
  if (!token) return { ok: false, motivo: 'sem_token' };
  let vps;
  try { vps = await listarVps({ token }); }
  catch (e) {
    if (e.codigo === 'token_invalido' || e.codigo === 'sem_permissao') return { ok: false, motivo: 'token_invalido', detalhe: e.message };
    return { ok: false, motivo: 'erro_api', detalhe: e.message };
  }
  const ativas = vps.filter((v) => !ESTADOS_MORTOS.has(v.estado));
  const carimbo = {
    ok: ativas.length > 0,
    motivo: ativas.length ? null : (vps.length ? 'vps_inativa' : 'sem_vps'),
    verificado_em: agora(),
    kit_versao: VERSAO,
    n_vps: ativas.length,
    vps: ativas.map((v) => ({ id: v.id, plano: v.plano, estado: v.estado, ram_mb: v.ram_mb, cpus: v.cpus, disco_mb: v.disco_mb, ip: v.ip, hostname: v.hostname, ptr: v.ptr, so: v.so, firewall_id: v.firewall_id })),
  };
  gravarJson(ARQ_PORTAO, carimbo);
  return carimbo;
}

// Para todo comando que usa os apps: sem portão aberto, para aqui com a explicação.
export async function exigirPortao({ refazer = false } = {}) {
  let p = lerPortao();
  if (refazer || !portaoValido(p)) {
    if (!lerSegredo('hostinger')) {
      throw new ErroKit('portao_fechado', 'Portão fechado: falta o token da API da Hostinger. Rode "node kit/jev-kit.mjs token hostinger" e siga as instruções.', 3);
    }
    p = await verificarPortao();
  }
  if (!p.ok) {
    if (p.motivo === 'token_invalido') throw new ErroKit('portao_fechado', `Portão fechado: ${p.detalhe || 'token da Hostinger inválido.'} Gere um token novo no hPanel (Conta → API).`, 3);
    if (p.motivo === 'erro_api') throw new ErroKit('portao_fechado', `Portão fechado: não consegui confirmar a VPS agora (${p.detalhe}). Tente de novo em instantes.`, 3);
    throw new ErroKit('portao_fechado', mensagemSemVps(), 3);
  }
  return p;
}

export function vpsDoPortao(id, p = lerPortao()) {
  return (p && p.vps || []).find((v) => String(v.id) === String(id)) || null;
}

export function imprimirPortao(p) {
  if (!p) { saida.aviso('portão ainda não verificado'); return; }
  if (p.ok) saida.ok(`portão aberto: ${p.n_vps} VPS da Hostinger na conta (conferido em ${new Date(p.verificado_em).toLocaleString('pt-BR')})`);
  else saida.falha(`portão fechado (${p.motivo})`);
}

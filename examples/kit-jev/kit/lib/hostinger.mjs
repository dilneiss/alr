// Cliente da API oficial da Hostinger (https://developers.hostinger.com), com as regras de segurança do kit.
//
// O token da API vale para a CONTA INTEIRA (não existe token só de leitura). Com ele dá para comprar VPS no cartão
// cadastrado, reinstalar o sistema, apagar regras de firewall e reescrever DNS. Por isso:
//   • o kit só LÊ, a não ser nas poucas escritas da lista ESCRITAS (cada uma reversível e pequena);
//   • toda escrita exige confirmo: true, que o kit só passa quando a pessoa disse "sim" naquela hora (--confirmo);
//   • comprar, reinstalar, apagar, ligar/desligar a VPS, trocar senha e cobrança ficam bloqueados aqui no código.
import fs from 'node:fs';
import path from 'node:path';
import { lerSegredo, ErroKit, rodar, KIT_DIR, esperar, VERSAO } from './util.mjs';

const BASE = 'https://developers.hostinger.com';
const UA = `jev-kit/${VERSAO}`;

const ESCRITAS = [
  ['POST', /^\/api\/vps\/v1\/virtual-machines\/\d+\/ssh-keys$/, 'cadastrar a chave SSH do kit na VPS'],
  ['DELETE', /^\/api\/vps\/v1\/virtual-machines\/\d+\/ssh-keys$/, 'remover a chave SSH do kit da VPS'],
  ['POST', /^\/api\/vps\/v1\/virtual-machines\/\d+\/snapshot$/, 'criar o snapshot da VPS (substitui o anterior)'],
  ['POST', /^\/api\/vps\/v1\/firewall\/\d+\/rules$/, 'abrir uma porta no firewall da Hostinger'],
  ['POST', /^\/api\/vps\/v1\/firewall\/\d+\/sync\/\d+$/, 'aplicar o firewall na VPS'],
  ['PUT', /^\/api\/dns\/v1\/zones\/[a-z0-9.-]+$/, 'criar registros DNS do seu domínio'],
  ['POST', /^\/api\/dns\/v1\/zones\/[a-z0-9.-]+\/validate$/, 'validar registros DNS (não muda nada)', true],
];

function erroDaApi(status, corpo) {
  const msg = (corpo && (corpo.message || corpo.error)) || '';
  if (status === 401) return new ErroKit('token_invalido', 'A Hostinger recusou o token (401). Ele pode ter expirado, sido apagado ou copiado pela metade.', 2);
  if (status === 403) return new ErroKit('sem_permissao', `A Hostinger negou o acesso (403). ${msg}`.trim(), 2);
  if (status === 404) return Object.assign(new ErroKit('nao_encontrado', `Não encontrado na Hostinger (404). ${msg}`.trim()), { status });
  if (status === 422) return new ErroKit('invalido', `A Hostinger recusou o pedido (422): ${JSON.stringify(corpo?.errors || msg).slice(0, 300)}`);
  if (status === 429) return new ErroKit('limite', 'Muitas chamadas seguidas à API da Hostinger (429). Espere um minuto.');
  return Object.assign(new ErroKit('api', `Erro ${status} da API da Hostinger. ${String(msg).slice(0, 200)}`.trim()), { status });
}

// fetch do Node; se a Cloudflare da Hostinger barrar (403 "error code: 1010"), tenta pelo curl
async function chamar(metodo, caminho, corpo, token) {
  const url = BASE + caminho;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': UA };
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  let status, texto;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    const r = await fetch(url, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), signal: ctrl.signal });
    clearTimeout(t);
    status = r.status; texto = await r.text();
  } catch (e) {
    status = 0; texto = String(e.message || e);
  }
  if (status === 0 || (status === 403 && /1010|cloudflare/i.test(texto))) {
    const viaCurl = chamarCurl(metodo, url, corpo, token);
    if (viaCurl) ({ status, texto } = viaCurl);
  }
  if (status === 0) throw new ErroKit('sem_rede', `Não consegui falar com a API da Hostinger: ${texto.slice(0, 160)}`);
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { json = { message: texto.slice(0, 300) }; }
  return { status, json };
}

// O token vai num arquivo de cabeçalho temporário (não aparece na lista de processos)
function chamarCurl(metodo, url, corpo, token) {
  fs.mkdirSync(KIT_DIR, { recursive: true });
  const cab = path.join(KIT_DIR, `.cab-${process.pid}`);
  const dados = path.join(KIT_DIR, `.dados-${process.pid}`);
  fs.writeFileSync(cab, `Authorization: Bearer ${token}\nAccept: application/json\nUser-Agent: ${UA}\nContent-Type: application/json\n`, { mode: 0o600 });
  const args = ['-s', '-X', metodo, '-H', `@${cab}`, '-w', '\n%{http_code}', '--max-time', '30'];
  if (corpo !== undefined) { fs.writeFileSync(dados, JSON.stringify(corpo), { mode: 0o600 }); args.push('--data-binary', `@${dados}`); }
  args.push(url);
  try {
    const r = rodar('curl', args, { timeout: 40_000 });
    if (r.status !== 0) return null;
    const i = r.stdout.lastIndexOf('\n');
    return { status: +r.stdout.slice(i + 1).trim() || 0, texto: r.stdout.slice(0, i) };
  } finally {
    for (const f of [cab, dados]) try { fs.unlinkSync(f); } catch { /* já saiu */ }
  }
}

export async function api(metodo, caminho, corpo, { confirmo = false, token = lerSegredo('hostinger') } = {}) {
  if (!token) throw new ErroKit('sem_token', 'Falta o token da API da Hostinger (segredos/hostinger-token.txt).', 2);
  if (metodo !== 'GET') {
    const regra = ESCRITAS.find(([m, re]) => m === metodo && re.test(caminho));
    if (!regra) throw new ErroKit('escrita_proibida', `O kit não faz ${metodo} ${caminho} na sua conta da Hostinger (bloqueado no código).`);
    if (!confirmo && !regra[3]) throw new ErroKit('precisa_confirmar', `Para ${regra[2]}, a pessoa precisa dizer "sim" antes. Rode de novo com --confirmo depois da resposta dela.`, 4);
  }
  let { status, json } = await chamar(metodo, caminho, corpo, token);
  if (status === 429) { await esperar(4000); ({ status, json } = await chamar(metodo, caminho, corpo, token)); }
  if (status < 200 || status >= 300) throw erroDaApi(status, json);
  return json;
}

// ---------- VPS ----------
function resumoVps(v) {
  const ip4 = (v.ipv4 || [])[0] || {};
  return {
    id: v.id, plano: v.plan || '', estado: v.state, trava: v.actions_lock,
    ram_mb: v.memory, cpus: v.cpus, disco_mb: v.disk,
    ip: ip4.address || null, ip_id: ip4.id || null, ptr: ip4.ptr || null,
    hostname: v.hostname || '', so: (v.template && v.template.name) || '', so_id: v.template && v.template.id,
    firewall_id: v.firewall_group_id ?? null, criado_em: v.created_at,
  };
}

export async function listarVps(opts) {
  const lista = await api('GET', '/api/vps/v1/virtual-machines', undefined, opts);
  return (Array.isArray(lista) ? lista : lista?.data || []).map(resumoVps);
}
export async function detalheVps(id) { return resumoVps(await api('GET', `/api/vps/v1/virtual-machines/${+id}`)); }

export async function lerSnapshot(id) {
  try { return await api('GET', `/api/vps/v1/virtual-machines/${+id}/snapshot`); }
  catch (e) { if (e.status === 404 || e.codigo === 'nao_encontrado') return null; throw e; }
}
export async function criarSnapshot(id, { confirmo }) { return api('POST', `/api/vps/v1/virtual-machines/${+id}/snapshot`, undefined, { confirmo }); }
export async function ultimasAcoes(id) {
  const r = await api('GET', `/api/vps/v1/virtual-machines/${+id}/actions`);
  return Array.isArray(r) ? r : r?.data || [];
}

export async function lerFirewall(id) { return api('GET', `/api/vps/v1/firewall/${+id}`); }
export async function abrirPortaFirewall(fwId, porta, { confirmo }) {
  return api('POST', `/api/vps/v1/firewall/${+fwId}/rules`, { protocol: 'TCP', port: String(porta), source: 'any', source_detail: 'any' }, { confirmo });
}
export async function sincronizarFirewall(fwId, vmId, { confirmo }) { return api('POST', `/api/vps/v1/firewall/${+fwId}/sync/${+vmId}`, undefined, { confirmo }); }

export async function chavesSshDaVps(id) {
  const r = await api('GET', `/api/vps/v1/virtual-machines/${+id}/public-keys`);
  return Array.isArray(r) ? r : r?.data || [];
}
export async function adicionarChaveSsh(id, chavePub, { confirmo }) {
  return api('POST', `/api/vps/v1/virtual-machines/${+id}/ssh-keys`, { keys: [chavePub.trim()] }, { confirmo });
}
export async function removerChaveSsh(id, chavePub, { confirmo }) {
  return api('DELETE', `/api/vps/v1/virtual-machines/${+id}/ssh-keys`, { keys: [chavePub.trim()] }, { confirmo });
}

// ---------- DNS (só se o domínio estiver nesta conta da Hostinger) ----------
export async function lerZonaDns(dominio) {
  try { return await api('GET', `/api/dns/v1/zones/${encodeURIComponent(dominio)}`); }
  catch (e) { if (['nao_encontrado', 'invalido', 'sem_permissao'].includes(e.codigo) || e.status === 404) return null; throw e; }
}
export async function gravarRegistrosA(dominio, nomes, ip, { confirmo }) {
  const corpo = { overwrite: true, zone: nomes.map((name) => ({ name, type: 'A', ttl: 300, records: [{ content: ip }] })) };
  await api('POST', `/api/dns/v1/zones/${encodeURIComponent(dominio)}/validate`, corpo);
  return api('PUT', `/api/dns/v1/zones/${encodeURIComponent(dominio)}`, corpo, { confirmo });
}

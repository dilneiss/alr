// Monta a pasta que sobe para a VPS (.kit/build/app): só a plataforma e os apps escolhidos, com o
// docker-compose.yml e o Caddyfile gerados para o domínio escolhido. Não lê nem grava segredo nenhum.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, KIT_DIR, ErroKit, lerJson } from './util.mjs';
import { porId } from './catalogo.mjs';

export const BUILD = path.join(KIT_DIR, 'build', 'app');
const PLAT = path.join(RAIZ, 'plataforma');
const APPS = path.join(RAIZ, 'apps');

// limites por contêiner (memória e CPU); o padrão serve aos apps leves
const LIMITES = { hub: ['192m', 0.5], modelos: ['448m', 1.5], qa: ['1536m', 2.0], cidade: ['384m', 1.0], tron: ['384m', 1.0], cluely: ['768m', 2.0], estudio: ['384m', 1.0] };
const DOCKERFILE = { qa: 'Dockerfile.qa', cluely: 'Dockerfile.cluely' };
const IGNORAR = new Set(['node_modules', '.git', 'data-runtime', '.DS_Store', '__pycache__']);

function copiarPasta(de, para, filtro = () => true) {
  fs.mkdirSync(para, { recursive: true });
  for (const nome of fs.readdirSync(de)) {
    if (IGNORAR.has(nome)) continue;
    const a = path.join(de, nome), b = path.join(para, nome);
    if (!filtro(a, nome)) continue;
    const st = fs.statSync(a);
    if (st.isDirectory()) copiarPasta(a, b, filtro);
    else fs.copyFileSync(a, b);
  }
}

export const hostHub = (dominio) => `jev.${dominio}`;
export const hostApp = (id, dominio) => `jev-${id}.${dominio}`;
export function urlDoApp(id, dominio) {
  const a = porId(id);
  if (!a) return null;
  return a.tipo === 'modelo' ? `https://${hostHub(dominio)}/m/${id}/` : `https://${hostApp(id, dominio)}/`;
}
export const nomesDns = (obras) => ['jev', ...obras.map((id) => `jev-${id}`)];

// ---------- docker-compose.yml ----------
function yamlCompose({ obras, temModelos, cpusVps, dominio }) {
  const cpu = (c) => Math.max(0.25, Math.min(c, cpusVps || 1));
  const servicos = ['hub', ...obras, ...(temModelos ? ['modelos'] : [])];
  let y = '# GERADO pelo kit (node kit/jev-kit.mjs publicar). Não edite aqui: mude a escolha no kit e publique de novo.\nname: jevkit\nservices:\n';
  y += `  caddy:\n    image: caddy:2-alpine\n    restart: unless-stopped\n    ports: ["80:80", "443:443"]\n    volumes:\n      - ./Caddyfile:/etc/caddy/Caddyfile:ro\n      - caddy_data:/data\n      - caddy_config:/config\n    depends_on: [auth, ${servicos.map((s) => 'app-' + s).join(', ')}]\n    mem_limit: 160m\n`;
  y += `  auth:\n    build: { context: .., dockerfile: deploy/Dockerfile.auth }\n    restart: unless-stopped\n    env_file: /etc/jev-kit/auth.env\n    volumes: [auth_data:/data]\n    mem_limit: 128m\n    cpus: ${cpu(0.5)}\n`;
  y += `  gateway:\n    build: { context: .., dockerfile: deploy/Dockerfile.gateway }\n    restart: unless-stopped\n    env_file: /etc/jev-kit/gateway.env\n    volumes: [gateway_data:/data, /etc/jev-kit/portao.json:/run/jev-kit/portao.json:ro]\n    mem_limit: 256m\n    cpus: ${cpu(1.0)}\n`;
  for (const id of servicos) {
    const [mem, c] = LIMITES[id] || ['320m', 1.0];
    const url = id === 'modelos' ? `https://${hostHub(dominio)}/m` : id === 'hub' ? `https://${hostHub(dominio)}` : `https://${hostApp(id, dominio)}`;
    const env = { JEV_GATEWAY_URL: 'http://gateway:8787', PORT: '3000', DATA_DIR: '/data', PUBLIC_URL: url, LOCAL_LLM_URL: `http://gateway:8787/v1/llm/${id}` };
    if (id === 'cluely') Object.assign(env, { FAST_LLM_URL: 'http://gateway:8787/v1/llm/cluely', NOTAS_LLM: 'http://gateway:8787/v1/llm/cluely', FAST_LLM_PARALLEL: '2' });
    const extras = ['/etc/jev-kit/apps.env', ...(id === 'cluely' || id === 'comentarios' ? [`/etc/jev-kit/${id}.env`] : [])];
    y += `  app-${id}:\n    build: { context: .., dockerfile: deploy/${DOCKERFILE[id] || 'Dockerfile.app'}, args: { APP: ${id} } }\n    restart: unless-stopped\n    env_file: [${extras.join(', ')}]\n`;
    y += `    environment: { ${Object.entries(env).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }\n`;
    y += `    volumes: [${id}_data:/data]\n    depends_on: [gateway]\n    mem_limit: ${mem}\n    cpus: ${cpu(c)}\n`;
    if (id === 'qa') y += '    shm_size: 512m\n    init: true\n';
  }
  y += `volumes:\n  caddy_data:\n  caddy_config:\n  gateway_data:\n  auth_data:\n${servicos.map((s) => `  ${s}_data:\n`).join('')}`;
  return y;
}

// ---------- Caddyfile ----------
function caddyfile({ obras, modelos, publicos, dominio, emailAcme }) {
  const pub = new Set(publicos || []);
  let c = `# GERADO pelo kit (node kit/jev-kit.mjs publicar). Não edite aqui.
{
${emailAcme ? `\temail ${emailAcme}\n` : ''}\tservers {
		protocols h1 h2
	}
}

(common) {
	@compress {
		not header Accept *text/event-stream*
		not path /api/*
	}
	encode @compress zstd gzip
	header {
		-Server
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Robots-Tag "noindex, nofollow"
	}
	handle /robots.txt {
		respond "User-agent: *
Disallow: /
" 200
	}
	handle /_auth/* {
		reverse_proxy auth:3000
	}
}

(protected) {
	forward_auth auth:3000 {
		uri /verify
		copy_headers X-Jev-User
	}
}

`;
  c += `${hostHub(dominio)} {\n\timport common\n\thandle /login {\n\t\treverse_proxy auth:3000\n\t}\n\thandle /logout {\n\t\treverse_proxy auth:3000\n\t}\n`;
  if (modelos.length) {
    c += '\tredir /m /m/ 308\n';
    // o motor (arquivos estáticos) é aberto: os apps públicos precisam dele sem login
    c += '\thandle /m/_motor/* {\n\t\turi strip_prefix /m\n\t\treverse_proxy app-modelos:3000\n\t}\n';
    for (const id of modelos.filter((m) => pub.has(m))) c += `\thandle /m/${id}/* {\n\t\turi strip_prefix /m\n\t\treverse_proxy app-modelos:3000\n\t}\n`;
    c += '\thandle /m/* {\n\t\timport protected\n\t\turi strip_prefix /m\n\t\treverse_proxy app-modelos:3000\n\t}\n';
  }
  c += '\thandle /healthz {\n\t\treverse_proxy app-hub:3000\n\t}\n\thandle {\n\t\timport protected\n\t\treverse_proxy app-hub:3000\n\t}\n}\n\n';
  for (const id of obras) {
    c += `${hostApp(id, dominio)} {\n\timport common\n\thandle /healthz {\n\t\treverse_proxy app-${id}:3000\n\t}\n\thandle {\n${pub.has(id) ? '' : '\t\timport protected\n'}\t\treverse_proxy app-${id}:3000\n\t}\n}\n\n`;
  }
  return c;
}

// ---------- a pasta que sobe ----------
export function montar({ apps, dominio, publicos = [], cpusVps = 1, emailAcme = '' }) {
  const lista = apps.map(porId).filter(Boolean);
  const obras = lista.filter((a) => a.tipo === 'obra').map((a) => a.id);
  const modelos = lista.filter((a) => a.tipo === 'modelo').map((a) => a.id);
  if (!lista.length) throw new ErroKit('sem_apps', 'Nenhum app escolhido.');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dominio || '')) throw new ErroKit('dominio', `Domínio inválido: ${dominio}`);

  fs.rmSync(path.dirname(BUILD), { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
  for (const p of ['gateway', 'auth', 'shared']) copiarPasta(path.join(PLAT, p), path.join(BUILD, p));
  fs.mkdirSync(path.join(BUILD, 'deploy'), { recursive: true });
  for (const f of fs.readdirSync(path.join(PLAT, 'deploy'))) if (f.startsWith('Dockerfile.')) fs.copyFileSync(path.join(PLAT, 'deploy', f), path.join(BUILD, 'deploy', f));
  fs.writeFileSync(path.join(BUILD, '.dockerignore'), '**/node_modules\n**/data-runtime\n**/test\n**/.DS_Store\n');

  // hub: só os cartões dos apps grandes escolhidos, com o endereço deste domínio
  copiarPasta(path.join(APPS, 'hub'), path.join(BUILD, 'apps', 'hub'));
  const demos = lerJson(path.join(APPS, 'hub', 'public', 'demos.json'), []);
  const escolhidos = demos.filter((d) => obras.includes(d.id)).map((d) => ({ ...d, url: `https://${hostApp(d.id, dominio)}` }));
  fs.writeFileSync(path.join(BUILD, 'apps', 'hub', 'public', 'demos.json'), JSON.stringify(escolhidos, null, 1) + '\n');

  for (const id of obras) copiarPasta(path.join(APPS, id), path.join(BUILD, 'apps', id), (a, nome) => nome !== 'test');

  if (modelos.length) {
    const M = path.join(APPS, 'modelos');
    const destino = path.join(BUILD, 'apps', 'modelos');
    copiarPasta(M, destino, (a, nome) => {
      const rel = path.relative(M, a).split(path.sep);
      // em public/, só o motor, as miniaturas e as pastas dos modelos escolhidos
      if (rel[0] === 'public' && rel.length === 2) {
        if (fs.statSync(a).isDirectory()) return rel[1] === '_motor' || rel[1] === '_shots' || modelos.includes(rel[1]);
        return true;
      }
      if (rel[0] === 'public' && rel[1] === '_shots' && rel.length === 3) return modelos.includes(nome.replace(/\.jpg$/, ''));
      return true;
    });
  }

  const servicos = [{ id: 'hub', sub: 'jev' }, ...obras.map((id) => ({ id, sub: `jev-${id}` })), ...(modelos.length ? [{ id: 'modelos', mount: '/m' }] : [])];
  fs.writeFileSync(path.join(BUILD, 'apps.json'), JSON.stringify(servicos, null, 1) + '\n');
  fs.writeFileSync(path.join(BUILD, 'deploy', 'docker-compose.yml'), yamlCompose({ obras, temModelos: modelos.length > 0, cpusVps, dominio }));
  fs.writeFileSync(path.join(BUILD, 'deploy', 'Caddyfile'), caddyfile({ obras, modelos, publicos, dominio, emailAcme }));
  return { obras, modelos, servicos: servicos.map((s) => 'app-' + s.id), pasta: BUILD };
}

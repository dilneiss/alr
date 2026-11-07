// Confere a instalação como uma pessoa usaria: DNS, HTTPS, login único, cada app abrindo atrás do login,
// o catálogo de modelos, e uma decisão de verdade do Jev (e do modelo de texto) de dentro da VPS.
import { lerEstado, gravarEstado, marcarPasso, saida, esperar, ErroKit } from './util.mjs';
import { apontaPara } from './dns.mjs';
import { ssh } from './ssh.mjs';
import { hostHub, hostApp, nomesDns } from './montagem.mjs';
import { porId } from './catalogo.mjs';
import { credenciaisLogin, DESTINO } from './publicar.mjs';

// cookies por host + redirecionamentos seguidos à mão (para ver o login único entre subdomínios)
class Navegador {
  constructor() { this.cookies = new Map(); }
  cabecalhoCookie(host) { const c = this.cookies.get(host); return c ? [...c.entries()].map(([k, v]) => `${k}=${v}`).join('; ') : ''; }
  guardar(host, setCookies) {
    for (const sc of setCookies) {
      const [par] = sc.split(';'); const i = par.indexOf('=');
      if (i < 1) continue;
      const k = par.slice(0, i).trim(), v = par.slice(i + 1).trim();
      if (!this.cookies.has(host)) this.cookies.set(host, new Map());
      if (!v || /max-age=0/i.test(sc)) this.cookies.get(host).delete(k); else this.cookies.get(host).set(k, v);
    }
  }
  async ir(url, { metodo = 'GET', corpo, seguir = true, html = true } = {}) {
    let atual = new URL(url), passos = 0, r;
    let m = metodo, b = corpo;
    for (;;) {
      const headers = { Accept: html ? 'text/html' : 'application/json', 'User-Agent': 'jev-kit-verificar' };
      const ck = this.cabecalhoCookie(atual.host); if (ck) headers.Cookie = ck;
      if (b) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20_000);
      try { r = await fetch(atual, { method: m, headers, body: b, redirect: 'manual', signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      this.guardar(atual.host, r.headers.getSetCookie ? r.headers.getSetCookie() : []);
      const loc = r.headers.get('location');
      if (!seguir || !loc || r.status < 300 || r.status >= 400 || ++passos > 10) break;
      atual = new URL(loc, atual); m = 'GET'; b = undefined;
    }
    const texto = await r.text().catch(() => '');
    return { status: r.status, url: atual.href, texto, location: r.headers.get('location') || '' };
  }
}

async function comPaciencia(fn, { tentativas = 12, espera = 10_000 } = {}) {
  let ultimo;
  for (let i = 0; i < tentativas; i++) {
    try { const r = await fn(); if (r.ok) return r; ultimo = r; } catch (e) { ultimo = { ok: false, erro: e.cause?.code || e.message }; }
    await esperar(espera);
  }
  return ultimo;
}

export async function verificar({ rapido = false } = {}) {
  const estado = lerEstado();
  const e = estado.escolhas;
  if (!estado.passos.publicar) throw new ErroKit('sem_publicar', 'Ainda não publicado. Rode "node kit/jev-kit.mjs publicar" antes.');
  const dominio = e.dominio.nome, ip = e.vps.ip, hub = hostHub(dominio);
  const obras = e.apps.filter((id) => porId(id)?.tipo === 'obra');
  const modelos = e.apps.filter((id) => porId(id)?.tipo === 'modelo');
  const publicos = new Set(e.publicos || []);
  const res = { ok: true, itens: [] };
  const nota = (ok, nome, det) => { res.itens.push({ ok, nome, det }); if (!ok) res.ok = false; (ok ? saida.ok : saida.falha).call(saida, `${nome}${det ? ` · ${det}` : ''}`); };

  saida.titulo('DNS');
  for (const n of nomesDns(obras)) {
    const nome = `${n}.${dominio}`;
    const r = await comPaciencia(() => apontaPara(nome, ip), { tentativas: rapido ? 1 : 6, espera: 10_000 });
    nota(!!r?.ok, nome, r?.ok ? `→ ${ip}` : `aponta para ${(r?.publicos || []).join(', ') || 'nada'} (esperado ${ip})`);
  }

  saida.titulo('HTTPS e login único');
  const nav = new Navegador();
  const h = await comPaciencia(async () => { const r = await nav.ir(`https://${hub}/healthz`, { html: false }); return { ok: r.status === 200, status: r.status }; },
    { tentativas: rapido ? 2 : 18, espera: 10_000 });
  nota(!!h?.ok, `https://${hub}`, h?.ok ? 'certificado válido' : `sem HTTPS ainda (${h?.erro || h?.status}); o certificado sai em até alguns minutos`);
  if (!h?.ok) { gravarResultado(estado, res); return res; }

  const anon = await new Navegador().ir(`https://${hub}/`, { seguir: false });
  nota(anon.status === 302 && /\/login/.test(anon.location), 'hub sem login', anon.status === 302 ? 'pede login (certo)' : `respondeu ${anon.status} (devia pedir login)`);
  const { usuario, senha } = credenciaisLogin(estado);
  const form = new URLSearchParams({ email: usuario, password: senha, next: `https://${hub}/` }).toString();
  const login = await nav.ir(`https://${hub}/login`, { metodo: 'POST', corpo: form });
  nota(login.status === 200 && !/\/login/.test(new URL(login.url).pathname), 'login', login.status === 200 ? 'entrou' : `falhou (${login.status} em ${login.url})`);

  saida.titulo('Apps');
  for (const id of obras) {
    const url = `https://${hostApp(id, dominio)}/`;
    const r = await comPaciencia(async () => { const x = await nav.ir(url); return { ok: x.status === 200 && new URL(x.url).host === hostApp(id, dominio), x }; }, { tentativas: rapido ? 1 : 6, espera: 10_000 });
    nota(!!r?.ok, `${porId(id).emoji} ${porId(id).titulo}`, r?.ok ? url : `${r?.x?.status || r?.erro} em ${r?.x?.url || url}`);
    if (publicos.has(id)) {
      const a = await new Navegador().ir(url, { seguir: false });
      nota(a.status === 200, `   público: ${id}`, a.status === 200 ? 'abre sem login' : `respondeu ${a.status}`);
    }
  }
  if (modelos.length) {
    const cat = await nav.ir(`https://${hub}/m/catalogo.json`, { html: false });
    let total = -1; try { total = JSON.parse(cat.texto).total; } catch { /* resposta não é JSON */ }
    nota(total === modelos.length, 'modelos', total === modelos.length ? `${total} no catálogo do hub` : `catálogo com ${total} (esperado ${modelos.length})`);
    const amostra = rapido ? modelos.slice(0, 3) : modelos;
    let falhas = 0;
    for (const id of amostra) {
      const r = await nav.ir(`https://${hub}/m/${id}/`);
      if (!(r.status === 200 && r.texto.includes('app.config.mjs'))) { falhas++; nota(false, `${porId(id).emoji} ${porId(id).titulo}`, `${r.status} em ${r.url}`); }
    }
    if (!falhas) nota(true, `${amostra.length} páginas de modelos`, 'abrem com login');
    for (const id of modelos.filter((x) => publicos.has(x))) {
      const a = await new Navegador().ir(`https://${hub}/m/${id}/`, { seguir: false });
      nota(a.status === 200, `   público: ${id}`, a.status === 200 ? 'abre sem login' : `respondeu ${a.status}`);
    }
  }

  saida.titulo('O Jev decidindo (de dentro da VPS)');
  const script = `fetch('http://127.0.0.1:8787/v1/decide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app:'kit-verificar',state:{mensagem:'Oi, quero comprar o plano anual, aceita pix?'},questions:{compra:{type:'noul',instructions:'A pessoa quer comprar?'}}})}).then(r=>r.json()).then(j=>console.log(JSON.stringify({ok:j.ok,sim:j.answers&&j.answers.compra&&j.answers.compra.noul,ms:j.latency_ms,erro:j.error&&j.error.message})))`;
  const d = ssh(ip, `cd ${DESTINO}/deploy && docker compose exec -T gateway node -e "${script.replace(/"/g, '\\"')}"`, { timeout: 60_000 });
  let jev = {}; try { jev = JSON.parse(d.stdout.trim().split('\n').pop()); } catch { jev = { ok: false, erro: d.stderr.trim().slice(-200) || d.stdout.trim().slice(-200) }; }
  nota(!!jev.ok && jev.sim > 0.5, 'Jev', jev.ok ? `respondeu em ${jev.ms} ms (quer comprar: ${Math.round(jev.sim * 100)}%)` : `falhou: ${jev.erro}`);
  if (e.llm !== 'desligado' && (e.apps.includes('estudio') || e.apps.includes('cluely'))) {
    const s2 = `fetch('http://127.0.0.1:8787/v1/llm/kit/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Diga só: ok'}],max_tokens:5})}).then(r=>r.json()).then(j=>console.log(JSON.stringify({ok:!!(j.choices&&j.choices.length),erro:j.error&&j.error.message})))`;
    const l = ssh(ip, `cd ${DESTINO}/deploy && docker compose exec -T gateway node -e "${s2.replace(/"/g, '\\"')}"`, { timeout: 60_000 });
    let x = {}; try { x = JSON.parse(l.stdout.trim().split('\n').pop()); } catch { x = { ok: false, erro: l.stderr.trim().slice(-200) }; }
    nota(!!x.ok, 'modelo de texto (Estúdio e Mini Cluely)', x.ok ? 'respondeu' : `falhou: ${x.erro}`);
  }
  gravarResultado(estado, res);
  return res;
}

function gravarResultado(estado, res) {
  if (res.ok) marcarPasso(estado, 'verificar', { itens: res.itens.length });
  else delete estado.passos.verificar;
  estado.ultima_verificacao = { ok: res.ok, falhas: res.itens.filter((i) => !i.ok).map((i) => `${i.nome}: ${i.det}`) };
  gravarEstado(estado);
}

// Loja Bugada — servidor do alvo (páginas + API) montado dentro do app QA em /alvo/.
// Os bugs do lado do servidor (busca vazia → 500; pedidos sem idempotência) estão marcados com "BUG PLANTADO".
import fs from 'node:fs';
import path from 'node:path';
import { HttpError } from '../../shared/server/kit.mjs';

export function montarLoja(app, dir) {
  const LOJA = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'loja.json'), 'utf8'));
  const ALVO = path.join(dir, 'alvo');
  const produtos = new Map(LOJA.produtos.map((p) => [p.slug, p]));
  const shell = () => fs.readFileSync(path.join(ALVO, 'index.html'), 'utf8');
  let SHELL = shell();
  if (process.env.NODE_ENV !== 'production') fs.watch(path.join(ALVO, 'index.html'), () => { try { SHELL = shell(); } catch {} });

  const TITULOS = { home: 'Ofertas da semana', produto: 'Produto', carrinho: 'Carrinho', checkout: 'Finalizar compra', busca: 'Busca', 404: 'Página não encontrada' };
  const publicos = { nome: LOJA.nome, produtos: LOJA.produtos, cupons: LOJA.cupons, carrinho_inicial: LOJA.carrinho_inicial, cliente: LOJA.cliente };

  function pagina(res, nome, status = 200, extra = {}) {
    const dados = JSON.stringify({ ...publicos, ...extra }).replace(/</g, '\\u003c');
    const titulo = extra.titulo || TITULOS[nome] || 'Loja Bugada';
    const html = SHELL.replace('__PAGINA__', nome).replace('__TITULO__', titulo.replace(/[<>&"]/g, '')).replace('__DADOS__', dados);
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    res.end(html);
  }
  function arquivo(res, nome, tipo) {
    fs.readFile(path.join(ALVO, nome), (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
      res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  }
  function json(res, status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  }

  // ---------- páginas ----------
  app.get('/alvo', ({ res }) => { res.writeHead(301, { Location: '/alvo/' }); res.end(); });
  app.get('/alvo/', ({ res }) => pagina(res, 'home'));
  app.get('/alvo/carrinho', ({ res }) => pagina(res, 'carrinho'));
  app.get('/alvo/checkout', ({ res }) => pagina(res, 'checkout'));
  app.get('/alvo/busca', ({ res }) => pagina(res, 'busca'));
  app.get('/alvo/produto/:slug', ({ res, params }) => {
    const p = produtos.get(params.slug);
    if (!p) return pagina(res, '404', 404);
    return pagina(res, 'produto', 200, { slug: p.slug, titulo: p.nome });
  });
  app.get('/alvo/loja.js', ({ res }) => arquivo(res, 'loja.js', 'text/javascript; charset=utf-8'));
  app.get('/alvo/loja.css', ({ res }) => arquivo(res, 'loja.css', 'text/css; charset=utf-8'));

  // ---------- API ----------
  app.get('/alvo/api/busca', ({ res, query }) => {
    const q = typeof query.q === 'string' ? query.q.slice(0, 300) : '';
    // BUG PLANTADO (busca_500): o "termo" só existe quando há texto; busca vazia explode em toLowerCase() → HTTP 500.
    const termo = q.trim() ? q.trim() : undefined;
    try {
      const t = termo.toLowerCase();
      const itens = LOJA.produtos.filter((p) => (p.nome + ' ' + p.descricao).toLowerCase().includes(t))
        .map(({ slug, nome, preco, emoji, cores }) => ({ slug, nome, preco, emoji, cores }));
      return json(res, 200, { ok: true, termo: q, itens });
    } catch (e) {
      return json(res, 500, { ok: false, erro: `${e.name}: ${e.message}` });
    }
  }, { rate: 240 });

  // pedidos por sessão do navegador (memória limitada)
  const pedidos = new Map(); // sid -> [{ id, nome, email, total, hora, at }]
  let proximo = 1001;
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });
  setInterval(() => {
    const corte = Date.now() - 3600_000;
    for (const [k, v] of pedidos) if (!v.length || v[v.length - 1].at < corte) pedidos.delete(k);
  }, 300_000).unref();

  app.get('/alvo/api/pedidos', ({ res, query }) => {
    const sid = String(query.sid || '').slice(0, 40);
    return json(res, 200, { ok: true, pedidos: (pedidos.get(sid) || []).slice(-5).reverse().map(({ at, email, ...p }) => p) });
  }, { rate: 240 });

  app.post('/alvo/api/pedidos', ({ res, body }) => {
    const sid = String(body.sid || '').slice(0, 40) || 'anonimo';
    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim();
    if (!nome) return json(res, 400, { ok: false, erro: 'Informe o nome completo.' });
    if (nome.length > 300) return json(res, 400, { ok: false, erro: 'Nome longo demais (máximo 300 caracteres).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(res, 400, { ok: false, erro: 'E-mail inválido.' });
    if (!Array.isArray(body.itens) || !body.itens.length) return json(res, 400, { ok: false, erro: 'Seu carrinho está vazio.' });
    // BUG PLANTADO (pedido_duplicado): sem chave de idempotência — dois envios iguais viram dois pedidos.
    const pedido = { id: proximo++, nome: nome.slice(0, 120), email, total: Number(body.total) || 0, hora: hora(), at: Date.now() };
    if (!pedidos.has(sid) && pedidos.size >= 2000) pedidos.delete(pedidos.keys().next().value);
    const lista = pedidos.get(sid) || [];
    lista.push(pedido); if (lista.length > 30) lista.shift();
    pedidos.set(sid, lista);
    const { at, email: _e, ...publico } = pedido;
    return json(res, 201, { ok: true, pedido: publico, pedidos: lista.slice(-5).reverse().map(({ at: _a, email: _m, ...p }) => p) });
  }, { rate: 240 });

  // qualquer outro endereço dentro da loja → página 404 de verdade
  app.get(/^\/alvo\/.+$/, ({ res, url }) => {
    if (url.pathname.startsWith('/alvo/api/')) throw new HttpError(404, 'Rota da API não encontrada', 'not_found');
    return pagina(res, '404', 404);
  });

  return { produtos: LOJA.produtos };
}

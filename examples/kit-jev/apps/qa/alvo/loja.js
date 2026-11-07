/* Loja Bugada — o alvo do QA Adversarial.
   Uma lojinha de verdade (vitrine, produto, carrinho, cupom, frete, checkout, busca, newsletter)
   com 9 bugs plantados DE PROPÓSITO. Cada um está marcado com "BUG PLANTADO" e documentado em data/bugs.json. */
(function () {
  'use strict';
  const L = window.LOJA;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');
  const produtos = Object.fromEntries(L.produtos.map((p) => [p.slug, p]));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const grad = (p) => `background:linear-gradient(135deg,${p.cores[0]},${p.cores[1]})`;

  // BUG PLANTADO (qtd_vazia_nan, qtd_negativa): a formatação não protege NaN nem valores negativos.
  const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------- armazenamento local (cada visitante/navegador tem o seu carrinho) ----------
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
  };
  function carrinho() {
    try { const c = JSON.parse(store.get('lb_carrinho')); if (Array.isArray(c)) return c; } catch {}
    const ini = L.carrinho_inicial.map((i) => ({ ...i }));
    store.set('lb_carrinho', JSON.stringify(ini));
    return ini;
  }
  const salvar = (c) => store.set('lb_carrinho', JSON.stringify(c.slice(-30)));
  function sid() {
    let s = store.get('lb_sid');
    if (!s) { s = Math.random().toString(36).slice(2, 12); store.set('lb_sid', s); }
    return s;
  }
  function flash(msg) { try { sessionStorage.setItem('lb_flash', msg); } catch {} }
  function lerFlash() { try { const m = sessionStorage.getItem('lb_flash'); sessionStorage.removeItem('lb_flash'); return m; } catch { return null; } }
  function status(el, msg, tipo) { el.textContent = msg; el.className = 'lb-status' + (tipo ? ' ' + tipo : ''); }

  function contarCarrinho() {
    const n = carrinho().reduce((s, i) => s + parseInt(i.qtd, 10), 0);
    const a = $('#navCarrinho');
    if (a) a.textContent = 'Carrinho (' + n + ')';
  }

  // ---------- páginas ----------
  const paginas = {
    home() {
      const vitrine = L.produtos.filter((p) => p.vitrine);
      app.innerHTML = `
        <section class="lb-hero">
          <div>
            <span class="lb-tag">Semana do Cliente</span>
            <h1>Tudo com até 40% OFF*</h1>
            <p>Periféricos, cadeiras e canecas para quem programa. Frete grátis acima de R$ 299.</p>
            <small>*promoção sujeita a bugs</small>
          </div>
          <div class="lb-hero-art" aria-hidden="true">🛍️</div>
        </section>
        <div class="lb-sec-tit"><h2>Ofertas da semana</h2><span>${vitrine.length} produtos</span></div>
        <div class="lb-grid">
          ${vitrine.map((p) => `
            <a class="lb-card" href="/alvo/produto/${esc(p.link_da_vitrine || p.slug)}">
              <div class="lb-img" style="${grad(p)}">${p.emoji}</div>
              <div class="lb-card-b">
                <h3>${esc(p.nome)}</h3>
                <p class="lb-preco">${brl(p.preco)}</p>
                <span class="lb-parc">10× de ${brl(p.preco / 10)}</span>
              </div>
            </a>`).join('')}
        </div>`;
      // BUG PLANTADO (link_404): o card da Cadeira Gamer Pro usa "link_da_vitrine" (cadeira-gamer-pro), um slug que não existe.
    },

    produto() {
      const p = produtos[L.slug];
      app.innerHTML = `
        <nav class="lb-bread"><a href="/alvo/">Ofertas</a> / ${esc(p.nome)}</nav>
        <div class="lb-prod">
          <div class="lb-img" style="${grad(p)}">${p.emoji}</div>
          <div>
            <h1>${esc(p.nome)}</h1>
            <p class="lb-preco">${brl(p.preco)}</p>
            <p class="lb-parc">ou 10× de ${brl(p.preco / 10)} sem juros</p>
            <p class="lb-desc">${esc(p.descricao)}</p>
            <form class="lb-form" id="formCarrinho" novalidate>
              <label for="qtd">Quantidade</label>
              <input class="lb-campo lb-qtd" id="qtd" type="number" value="1" inputmode="numeric">
              <p class="lb-sub">Subtotal: <b id="subtotal">${brl(p.preco)}</b></p>
              <button type="submit" class="lb-btn">🛒 Adicionar ao carrinho</button>
            </form>
            <p class="lb-status" id="prodStatus" role="status"></p>
          </div>
        </div>`;
      const qtd = $('#qtd');
      qtd.addEventListener('input', () => {
        $('#subtotal').textContent = brl(p.preco * parseInt(qtd.value, 10));
      });
      $('#formCarrinho').addEventListener('submit', (e) => {
        e.preventDefault();
        // BUG PLANTADO (qtd_negativa / qtd_vazia_nan): nenhuma validação — 0, negativos e vazio entram no
        // carrinho, e o subtotal acima já mostra "R$ -…" ou "R$ NaN". Fica na página (padrão de loja real).
        const c = carrinho();
        c.push({ slug: p.slug, qtd: qtd.value });
        salvar(c);
        contarCarrinho();
        status($('#prodStatus'), '✅ ' + p.nome + ' adicionado ao carrinho (quantidade: ' + (qtd.value === '' ? 'vazia' : qtd.value) + ').', 'ok');
      });
    },

    carrinho() {
      const c = carrinho();
      let desconto = 0, cupom = '', frete = null;
      function subtotal() {
        return c.reduce((s, i) => { const p = produtos[i.slug]; return p ? s + p.preco * parseInt(i.qtd, 10) : s; }, 0);
      }
      function resumo() {
        const sub = subtotal();
        const d = sub * desconto;
        $('#resumoValores').innerHTML = `
          <div class="lb-linha"><span>Subtotal</span><b>${brl(sub)}</b></div>
          ${cupom ? `<div class="lb-linha desc"><span>Desconto (${esc(cupom)})</span><b>${brl(d)}</b></div>` : ''}
          <div class="lb-linha"><span>Frete</span><b>${frete == null ? 'calcule abaixo' : frete === 0 ? 'grátis' : brl(frete)}</b></div>
          <div class="lb-linha tot"><span>Total</span><b>${brl(sub - d + (frete || 0))}</b></div>`;
      }
      app.innerHTML = `
        <div class="lb-sec-tit"><h2>Seu carrinho</h2><span>${c.length} ${c.length === 1 ? 'item' : 'itens'}</span></div>
        <div class="lb-cart">
          <div class="lb-itens">
            ${c.length ? c.map((i) => {
              const p = produtos[i.slug]; if (!p) return '';
              return `<div class="lb-item">
                <div class="lb-mini" style="${grad(p)}">${p.emoji}</div>
                <div><div class="nm">${esc(p.nome)}</div><div class="qt">${esc(i.qtd === '' ? '(vazia)' : i.qtd)} × ${brl(p.preco)}</div></div>
                <div class="tt">${brl(p.preco * parseInt(i.qtd, 10))}</div>
              </div>`;
            }).join('') : '<div class="lb-vazio">Seu carrinho está vazio.</div>'}
          </div>
          <aside class="lb-resumo">
            <div id="resumoValores"></div>
            <form class="lb-mini-form" id="formCupom" novalidate>
              <label for="cupom">Cupom de desconto</label>
              <div class="lin"><input class="lb-campo" id="cupom" placeholder="Ex.: BEMVINDO10" autocomplete="off"><button type="submit">Aplicar</button></div>
            </form>
            <form class="lb-mini-form" id="formFrete" novalidate>
              <label for="cep">CEP</label>
              <div class="lin"><input class="lb-campo" id="cep" placeholder="00000-000" inputmode="numeric" autocomplete="off"><button type="submit">Calcular frete</button></div>
            </form>
            <p class="lb-status" id="cartStatus" role="status"></p>
            <a class="lb-btn" href="/alvo/checkout">Ir para o checkout →</a>
          </aside>
        </div>`;
      resumo();
      const f = lerFlash();
      if (f) status($('#cartStatus'), f, 'ok');

      function aplicarCupom(codigo) {
        const st = $('#cartStatus');
        if (!codigo.trim()) { status(st, 'Digite um cupom de desconto.', 'erro'); return; }
        // BUG PLANTADO (cupom_regex): o código entra cru numa expressão regular — "(" "[" "*" lançam SyntaxError.
        const valido = Object.keys(L.cupons).find((k) => new RegExp('^' + codigo.trim() + '$', 'i').test(k));
        if (!valido) { status(st, 'Cupom “' + codigo.trim() + '” inválido ou expirado.', 'erro'); return; }
        desconto = L.cupons[valido]; cupom = valido; resumo();
        status(st, 'Cupom ' + valido + ' aplicado: ' + Math.round(desconto * 100) + '% de desconto!', 'ok');
      }
      function calcularFrete(cep) {
        const st = $('#cartStatus');
        // BUG PLANTADO (frete_excecao): match() devolve null para CEP fora do padrão e ninguém confere.
        const m = cep.replace(/\s/g, '').match(/^(\d{5})-?(\d{3})$/);
        const regiao = Number(m[1][0]);
        const tabela = [12.9, 14.9, 16.9, 18.9, 19.9, 21.9, 23.9, 25.9, 27.9, 29.9];
        frete = subtotal() >= 299 ? 0 : tabela[regiao];
        resumo();
        status(st, 'Frete para o CEP ' + m[1] + '-' + m[2] + ': ' + (frete === 0 ? 'grátis' : brl(frete)) + ' · entrega em ' + (2 + (regiao % 4)) + ' dias úteis.', 'ok');
      }
      $('#formCupom').addEventListener('submit', (e) => { e.preventDefault(); aplicarCupom($('#cupom').value); });
      $('#formFrete').addEventListener('submit', (e) => { e.preventDefault(); calcularFrete($('#cep').value); });
    },

    checkout() {
      const c = carrinho();
      const total = c.reduce((s, i) => { const p = produtos[i.slug]; return p ? s + p.preco * parseInt(i.qtd, 10) : s; }, 0);
      app.innerHTML = `
        <div class="lb-sec-tit"><h2>Finalizar compra</h2><span>Cliente: ${esc(L.cliente.nome)}</span></div>
        <div class="lb-check">
          <form class="lb-caixa lb-form" id="formPedido" novalidate>
            <label for="nome">Nome completo</label>
            <input class="lb-campo" id="nome" value="${esc(L.cliente.nome)}" autocomplete="off">
            <label for="email">E-mail</label>
            <input class="lb-campo" id="email" type="email" value="${esc(L.cliente.email)}" autocomplete="off">
            <div class="lb-etiqueta">
              <div class="et-t">Etiqueta de entrega</div>
              <div class="et-nome" id="etNome">Destinatário: ${esc(L.cliente.nome)}</div>
              <div class="et-end">${esc(L.cliente.endereco)}</div>
            </div>
            <button type="submit" class="lb-btn" id="btnFinalizar">Finalizar pedido</button>
            <p class="lb-status" id="pedStatus" role="status"></p>
          </form>
          <aside class="lb-resumo">
            <h3>Resumo do pedido</h3>
            ${c.map((i) => { const p = produtos[i.slug]; return p ? `<div class="lb-linha"><span>${p.emoji} ${esc(p.nome)} × ${esc(i.qtd === '' ? '(vazia)' : i.qtd)}</span><b>${brl(p.preco * parseInt(i.qtd, 10))}</b></div>` : ''; }).join('')}
            <div class="lb-linha tot"><span>Total</span><b>${brl(total)}</b></div>
            <div class="lb-pedidos" id="pedidos"></div>
          </aside>
        </div>`;
      const nome = $('#nome'), email = $('#email');
      nome.addEventListener('input', () => { $('#etNome').textContent = 'Destinatário: ' + nome.value; });
      function listar(lista) {
        if (!lista || !lista.length) { $('#pedidos').innerHTML = ''; return; }
        $('#pedidos').innerHTML = '<h3>Pedidos desta sessão</h3>' + lista.map((p) => `<div class="lb-ped"><span>#${p.id} · ${esc(p.nome.slice(0, 40))}</span><b>${esc(p.hora)}</b></div>`).join('');
      }
      fetch('/alvo/api/pedidos?sid=' + encodeURIComponent(sid())).then((r) => r.json()).then((j) => listar(j.pedidos)).catch(() => {});
      $('#formPedido').addEventListener('submit', async (e) => {
        e.preventDefault();
        const st = $('#pedStatus');
        status(st, 'Enviando pedido…');
        // BUG PLANTADO (pedido_duplicado): o botão não é desativado durante o envio e a API não tem idempotência.
        try {
          const r = await fetch('/alvo/api/pedidos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid: sid(), nome: nome.value, email: email.value, itens: carrinho(), total }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { status(st, '⚠️ ' + (j.erro || 'Não foi possível criar o pedido.'), 'erro'); return; }
          status(st, '✅ Pedido #' + j.pedido.id + ' criado! Obrigado pela compra.', 'ok');
          listar(j.pedidos);
        } catch { status(st, '⚠️ Falha de conexão. Tente de novo.', 'erro'); }
      });
    },

    async busca() {
      const q = new URLSearchParams(location.search).get('q') ?? '';
      const campo = $('.lb-busca input'); if (campo) campo.value = q;
      app.innerHTML = `<div class="lb-sec-tit"><h2>Resultados para “${esc(q)}”</h2></div><div class="lb-res" id="res">Buscando…</div>`;
      try {
        const r = await fetch('/alvo/api/busca?q=' + encodeURIComponent(q));
        const res = $('#res');
        if (!r.ok) { res.innerHTML = `<div class="lb-erro" role="status">😵 Ops! Algo deu errado na busca (erro ${r.status}). Tente de novo mais tarde.</div>`; return; }
        const j = await r.json();
        res.innerHTML = j.itens.length
          ? j.itens.map((p) => `<a href="/alvo/produto/${esc(p.slug)}"><span class="lb-mini" style="${grad(p)}">${p.emoji}</span><span><b>${esc(p.nome)}</b><br><span class="lb-parc">${brl(p.preco)}</span></span></a>`).join('')
          : `<p class="lb-status" role="status">Nenhum produto encontrado para “${esc(q)}”.</p>`;
      } catch { $('#res').innerHTML = '<div class="lb-erro" role="status">Sem conexão com a loja.</div>'; }
    },

    naoEncontrada() {
      app.innerHTML = `
        <div class="lb-404">
          <div class="big">🔍</div>
          <h1>Página não encontrada</h1>
          <p>O endereço <code>${esc(location.pathname)}</code> não existe (erro 404).</p>
          <a class="lb-btn" href="/alvo/">Voltar às ofertas</a>
        </div>`;
    },
  };

  // ---------- newsletter (rodapé de todas as páginas) ----------
  $('#formNews').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#newsEmail').value.trim();
    const st = $('#newsStatus');
    // BUG PLANTADO (email_fraco): a validação só confere se existe um "@" — "a@" passa.
    if (!v.includes('@')) { status(st, 'Informe um e-mail válido.', 'erro'); return; }
    status(st, '✅ Inscrição confirmada para ' + v + '! Cupons a caminho.', 'ok');
  });

  (paginas[document.body.dataset.pagina] || paginas.naoEncontrada)();
  contarCarrinho();
})();

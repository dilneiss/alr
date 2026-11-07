(function () {
  'use strict';
  const { fmt, el, escapeHtml, toast } = JevKit;
  JevKit.mountTopbar({ title: 'Comentários → Oportunidades', tagline: 'O Jev lê centenas de comentários em segundos' });
  const $ = (id) => document.getElementById(id);

  const TIPOS = {
    pergunta: 'Pergunta', elogio: 'Elogio', critica_construtiva: 'Crítica construtiva', reclamacao: 'Reclamação',
    pedido_de_conteudo: 'Pedido de vídeo', intencao_de_compra: 'Intenção de compra', compartilha_experiencia: 'Experiência / opinião',
    piada_meme: 'Piada / meme', spam_golpe: 'Spam / golpe', outro: 'Outro',
  };
  const SENT = ['muito negativo', 'negativo', 'neutro', 'positivo', 'muito positivo'];
  const SCOL = ['var(--s0)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
  const PARAMS = new URLSearchParams(location.search);
  const FRESH = PARAMS.has('fresh'); // ?fresh=1: sempre analisa ao vivo (para gravar o vídeo)
  const PAGE = 24;
  const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  // ---------- regras sobre as probabilidades do Jev ----------
  const sentN = (c) => Math.max(0, Math.min(4, Math.round(c.it.sent)));
  // limiares: 0,5 no noul significa "não sei". Lead exige >= 0,55 (nos vídeos de teste o lead real ficou em 0,59–0,62 em
  // rodadas diferentes e o comentário ambíguo em 0,50); "merece resposta" exige >= 0,6.
  const isLead = (c) => !!c.it && (c.it.compra >= 0.55 || (c.it.tipo === 'intencao_de_compra' && c.it.tipo_p >= 0.5));
  const isPerg = (c) => !!c.it && c.it.resp >= 0.6 && !c.respondido_canal && c.it.tipo !== 'spam_golpe';
  const isIdeia = (c) => !!c.it && c.it.tipo !== 'spam_golpe' && (c.it.tipo === 'pedido_de_conteudo' || c.it.tipos.some(([k, p]) => k === 'pedido_de_conteudo' && p >= 0.4));
  const isSpam = (c) => !!c.it && c.it.tipo === 'spam_golpe'; // mesmo critério do gráfico: tipo mais provável
  const isCrit = (c) => !!c.it && (c.it.tipo === 'critica_construtiva' || c.it.tipo === 'reclamacao'); // coluna "Críticas": o tipo mais provável
  // marca do editor no mosaico: círculo de lápis (lead), ? (sem resposta), + (pedido de vídeo), × (spam)
  const glyph = (c) => (isSpam(c) ? ['×', 'spam'] : isLead(c) ? ['', 'lead'] : isPerg(c) ? ['?', 'perg'] : isIdeia(c) ? ['+', 'ideia'] : ['', '']);
  const pesoLikes = (c) => 1 + Math.log2(1 + (c.likes || 0));

  // ---------- link → ID (mesma regra do servidor) ----------
  const ID_RE = /^[A-Za-z0-9_-]{11}$/;
  function extrairId(entrada) {
    const s = String(entrada == null ? '' : entrada).trim();
    if (!s || s.length > 400) return null;
    if (ID_RE.test(s)) return s;
    let u;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') { const id = u.pathname.split('/')[1] || ''; return ID_RE.test(id) ? id : null; }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && ID_RE.test(v)) return v;
      const m = u.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/);
      if (m) return m[1];
    }
    return null;
  }
  window.__extrairId = extrairId; // usado pelo teste e2e

  // ---------- utilidades de tela ----------
  function tempo(iso) {
    const t = Date.parse(iso); if (!t) return '';
    const d = (t - Date.now()) / 1000, a = Math.abs(d);
    if (a < 3600) return rtf.format(Math.round(d / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(d / 3600), 'hour');
    if (a < 86400 * 30) return rtf.format(Math.round(d / 86400), 'day');
    if (a < 86400 * 365) return rtf.format(Math.round(d / 86400 / 30), 'month');
    return rtf.format(Math.round(d / 86400 / 365), 'year');
  }
  const linkComentario = (vid, cid) => `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}&lc=${encodeURIComponent(cid)}`;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const plural = (n, um, varios) => `${fmt.int(n)} ${n === 1 ? um : varios}`;

  // o traço do lápis azul do editor (o Jev): círculo, visto e sublinhado, desenhados em SVG
  const TRACOS = {
    circulo: ['0 0 100 50', 'M58 4C28 2 4 12 4 26C4 40 26 48 52 47C78 46 97 38 96 24C95 11 76 3 50 5C40 6 33 8 28 11'],
    circulo2: ['0 0 100 50', 'M40 5C68 2 96 10 96 25C96 40 72 48 47 47C22 46 4 38 5 24C6 11 26 4 52 5C62 5 69 8 74 11'],
    visto: ['0 0 24 20', 'M3 11.5 9 17.5 21 3'],
  };
  function lapis(tipo) {
    const [vb, d] = TRACOS[tipo];
    const t = document.createElement('template');
    t.innerHTML = `<svg class="lapis" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="${d}"/></svg>`;
    const s = t.content.firstElementChild;
    if (tipo !== 'visto') s.style.setProperty('--rot', (Math.random() * 5 - 2.5).toFixed(1) + 'deg');
    return s;
  }
  const circulo = () => lapis(Math.random() < 0.5 ? 'circulo' : 'circulo2');

  // data da edição
  const hoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('hoje').textContent = hoje.charAt(0).toUpperCase() + hoje.slice(1);
  $('cp-data').textContent = $('hoje').textContent;

  // ---------- estado ----------
  let R = null;
  function novoRun(id) {
    return { id, ctrl: new AbortController(), video: null, coms: [], byId: new Map(), cells: new Map(), n_alvo: 0, do_canal: 0, plano: null,
      lotes: 0, falhas: 0, cost: 0, fim: null, erro: null, t0: performance.now(), fonte: null, filtro: 'todos', pagina: 1, timer: null, kpiPrev: {},
      mcat: undefined, mid: null, mPrev: 0 };
  }

  // ---------- exemplos (pautas prontas) ----------
  async function carregarExemplos() {
    const box = $('examples');
    for (let i = 0; i < 4; i++) {
      const ph = el('div', { class: 'ex ex-ph', 'aria-hidden': 'true' }, [el('span', { class: 'ex-foto' }), el('span', { class: 'ex-txt' }, [el('span', { class: 'selo', text: 'pauta' }), el('span', { class: 't', text: 'Carregando exemplos…' }), el('span', { class: 'm', text: '—' })])]);
      ph.style.setProperty('--i', i);
      box.append(ph);
    }
    try {
      const r = await JevKit.api('/api/exemplos', undefined, { silent: true });
      box.innerHTML = '';
      r.exemplos.forEach((v, i) => {
        const b = el('button', { class: 'ex', type: 'button', 'data-id': v.id, title: v.titulo, onclick: () => {
          box.querySelectorAll('.ex').forEach((x) => x.classList.toggle('active', x === b));
          $('url').value = 'https://www.youtube.com/watch?v=' + v.id;
          analisar(v.id);
        } }, [
          el('span', { class: 'ex-foto' }, [el('img', { src: '/api/thumb/' + v.id, alt: '', loading: 'lazy', width: '320', height: '180' }), circulo()]),
          el('span', { class: 'ex-txt' }, [
            el('span', { class: 'selo', text: v.selo || v.canal }),
            el('span', { class: 't', text: v.titulo }),
            el('span', { class: 'm', html: `${escapeHtml(v.canal)} · <b>${fmt.int(v.n_comentarios || 0)}</b> comentários` }),
          ]),
        ]);
        b.style.setProperty('--i', i);
        box.append(b);
      });
      if (R && !R.rolou) $('res').scrollIntoView({ block: 'start' }); // os cartões mudaram a altura da página
    } catch (e) {
      box.innerHTML = '';
      box.append(el('div', { class: 'empty', text: 'Não consegui carregar os exemplos agora. Cole o link de um vídeo acima.' }));
    }
  }

  // ---------- erro (nota da redação) ----------
  const TITULOS = { link_invalido: 'Link não reconhecido', nao_encontrado: 'Vídeo não encontrado', comentarios_desativados: 'Comentários desativados',
    cota: 'Limite do YouTube', rate_limited: 'Muitas análises seguidas', lotado: 'Servidor cheio', budget_exhausted: 'Orçamento do dia esgotado', sem_chave: 'YouTube indisponível' };
  function mostrarErro(titulo, msg) {
    $('errt').textContent = titulo; $('errm').textContent = msg; $('erro').hidden = false;
  }
  const esconderErro = () => { $('erro').hidden = true; };

  // ---------- fluxo ----------
  async function analisar(texto, opts) {
    opts = opts || {};
    const bruto = String(texto || '').trim();
    if (!bruto) { mostrarErro('Cole um link', 'Cole o link de um vídeo do YouTube ou clique num dos exemplos.'); $('url').focus(); return; }
    const id = extrairId(bruto);
    if (!id) {
      const canal = /youtube\.com\/(@|channel\/|c\/|user\/)/i.test(bruto);
      mostrarErro('Link não reconhecido', canal ? 'Esse é o link de um canal, não de um vídeo. Abra um vídeo e cole o link dele aqui.'
        : 'Não reconheci esse link. Cole o endereço de um vídeo do YouTube (youtube.com/watch?v=…, youtu.be/…, /shorts/…) ou só o ID de 11 caracteres.');
      return;
    }
    if (R) { R.ctrl.abort(); clearInterval(R.timer); }
    const my = R = novoRun(id);
    esconderErro();
    prepararTela(my);
    try { const q = new URLSearchParams(location.search); q.set('v', id); history.replaceState(null, '', '?' + q.toString()); } catch (e) {}
    let resp;
    try {
      resp = await fetch('/api/analisar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: id, fresh: !!opts.fresh || FRESH }), signal: my.ctrl.signal });
    } catch (e) {
      if (my !== R || e.name === 'AbortError') return;
      falhou(my, 'Sem conexão', 'Não consegui falar com o servidor. Verifique a internet e tente de novo.'); return;
    }
    if (!resp.ok) {
      let msg = `Erro ${resp.status}`; try { const j = await resp.json(); msg = j.error || msg; } catch (e) {}
      if (my === R) falhou(my, resp.status === 429 ? 'Muitas análises seguidas' : 'Não deu certo', msg);
      return;
    }
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          let ev; try { ev = JSON.parse(line); } catch (e) { continue; }
          if (my !== R) return;
          onEvent(my, ev);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError' || my !== R) return;
    }
    if (my === R && !my.fim && !my.erro) falhou(my, 'A conexão caiu', 'A análise foi interrompida antes do fim. Tente de novo — os comentários já baixados ficam em cache.');
  }

  function falhou(my, titulo, msg) {
    my.erro = { titulo, msg }; clearInterval(my.timer);
    mostrarErro(titulo, msg);
    $('pbar').classList.add('done');
    $('ptext').textContent = msg;
    $('fechamento').textContent = 'Edição suspensa';
    if (!my.video) $('res').hidden = true;
    else renderTudo(my);
  }

  function onEvent(my, e) {
    switch (e.ev) {
      case 'fila': $('ptext').textContent = e.message; break;
      case 'compartilhada': toast(e.message); break;
      case 'video': renderVideo(my, e.video); break;
      case 'comentarios': recebeComentarios(my, e); break;
      case 'plano': my.plano = e; progresso(my); break;
      case 'lote':
        e.itens.forEach((it, k) => aplicarItem(my, it, k * 14));
        my.lotes++; my.cost += e.cost || 0;
        if (e._jev) JevKit.record(e._jev);
        progresso(my); agendar(my); break;
      case 'lote_erro': my.lotes++; my.falhas += e.n; progresso(my); break;
      case 'cache':
        e.itens.forEach((it, k) => aplicarItem(my, it, Math.min(k * 3, 700)));
        my.lotes = my.plano ? my.plano.n_lotes : 0; my.cacheIdade = e.idade_s;
        progresso(my); agendar(my); break;
      case 'fim': finalizar(my, e); break;
      case 'erro':
        my.erro = { titulo: TITULOS[e.code] || 'Não deu certo', msg: e.message, code: e.code }; clearInterval(my.timer);
        mostrarErro(my.erro.titulo, e.message);
        $('pbar').classList.add('done'); $('ptext').textContent = e.message;
        $('fechamento').textContent = 'Edição suspensa';
        if (!my.video) $('res').hidden = true;
        else renderTudo(my);
        break;
      default: break;
    }
  }

  // ---------- tela ----------
  function prepararTela(my) {
    $('res').hidden = false;
    $('vthumb').removeAttribute('src');
    $('vtitle').textContent = 'Carregando vídeo…';
    $('vmeta').innerHTML = '';
    $('pfill').style.width = '0%'; $('pbar').classList.remove('done');
    $('ptext').innerHTML = '<span class="jev-spinner"></span> Buscando comentários no YouTube…';
    $('speed').innerHTML = ''; $('acts').innerHTML = '';
    $('fechamento').textContent = 'Edição em fechamento';
    $('mosaic').innerHTML = ''; $('csv').disabled = true;
    $('mosub').textContent = 'cor = sentimento · marca = oportunidade';
    renderTudo(my);
    requestAnimationFrame(() => $('res').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const marcar = () => { my.rolou = true; };
    ['wheel', 'touchmove', 'keydown'].forEach((ev) => addEventListener(ev, marcar, { once: true, passive: true }));
    my.timer = setInterval(() => { if (my === R && my.plano && !my.fim) progresso(my); }, 100);
  }

  function renderVideo(my, v) {
    my.video = v;
    $('vthumb').src = '/api/thumb/' + v.id;
    $('vtitle').textContent = v.titulo;
    const parts = [
      `<span>${escapeHtml(v.canal)}</span>`,
      `<span><b>${compact.format(v.views || 0)}</b> visualizações</span>`,
      v.n_comentarios != null ? `<span><b>${fmt.int(v.n_comentarios)}</b> comentários no total</span>` : '',
      v.publicado ? `<span>publicado ${escapeHtml(tempo(v.publicado))}</span>` : '',
      `<span><a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">abrir no YouTube ↗</a></span>`,
    ];
    $('vmeta').innerHTML = parts.join('');
  }

  function recebeComentarios(my, e) {
    my.coms = e.comentarios.filter((c) => !c.do_canal && String(c.texto || '').trim());
    my.byId = new Map(my.coms.map((c) => [c.id, c]));
    my.n_alvo = e.n_alvo; my.do_canal = e.do_canal; my.fonte = e.fonte; my.yt_ms = e.yt_ms;
    const m = $('mosaic'); m.innerHTML = ''; my.cells = new Map();
    const n = my.coms.length;
    m.style.setProperty('--cols', n <= 90 ? 18 : n <= 170 ? 24 : 30); // quadradinhos maiores quando há poucos comentários
    const frag = document.createDocumentFragment();
    my.coms.forEach((c, i) => {
      const cell = el('button', { class: 'cell pend', type: 'button', 'data-id': c.id, 'aria-label': `Comentário de ${c.autor}` });
      cell.style.animationDelay = (i % 30) * 30 + 'ms';
      frag.append(cell); my.cells.set(c.id, cell);
    });
    m.append(frag);
    $('mosub').textContent = `${fmt.int(n)} comentários · cor = sentimento · marca = oportunidade`;
    const origem = e.fonte === 'youtube' ? `baixados do YouTube em ${fmt.ms(e.yt_ms)}` : `do cache (baixados ${tempo(new Date(Date.now() - e.idade_s * 1000).toISOString())})`;
    $('ptext').innerHTML = `<b>${fmt.int(n)}</b> comentários ${escapeHtml(origem)}${e.do_canal ? ` · ${e.do_canal} do próprio canal ignorado${e.do_canal > 1 ? 's' : ''}` : ''}`;
    if (!n) {
      $('ptext').textContent = 'Este vídeo ainda não tem comentários para analisar.';
    }
    renderTudo(my);
  }

  function aplicarItem(my, it, atraso) {
    const c = my.byId.get(it.id); if (!c) return;
    c.it = it;
    const cell = my.cells.get(it.id);
    if (cell) {
      const [g, k] = glyph(c);
      cell.style.animationDelay = (atraso || 0) + 'ms'; // onda curta dentro do lote
      cell.className = 'cell ok s' + sentN(c); cell.textContent = g;
      if (k) cell.dataset.g = k; else delete cell.dataset.g;
    }
  }

  function progresso(my) {
    const p = my.plano; if (!p) return;
    const done = my.coms.filter((c) => c.it).length;
    const frac = p.n_lotes ? my.lotes / p.n_lotes : 1;
    $('pfill').style.width = Math.round(frac * 100) + '%';
    if (!my.fim) {
      const ms = performance.now() - my.t0;
      $('ptext').innerHTML = `O Jev está lendo: <b>${fmt.int(done)}</b> de <b>${fmt.int(p.n)}</b> comentários · lote <b>${my.lotes}</b>/${p.n_lotes} (${p.paralelo} por vez) · <b>${(ms / 1000).toFixed(1).replace('.', ',')} s</b>`;
    }
  }

  let raf = 0;
  function agendar(my) { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (my === R) renderTudo(my); }); }

  function contar(my) {
    const feitos = my.coms.filter((c) => c.it);
    const pos = feitos.filter((c) => sentN(c) >= 3).length, neg = feitos.filter((c) => sentN(c) <= 1).length;
    return {
      feitos, n: feitos.length, pos, neg,
      leads: feitos.filter(isLead), perg: feitos.filter(isPerg), ideias: feitos.filter(isIdeia), crit: feitos.filter(isCrit), spam: feitos.filter(isSpam),
      porTipo: Object.fromEntries(Object.keys(TIPOS).map((k) => [k, feitos.filter((c) => c.it.tipo === k).length])),
      porSent: [0, 1, 2, 3, 4].map((s) => feitos.filter((c) => sentN(c) === s).length),
    };
  }

  function renderTudo(my) {
    const k = contar(my);
    renderKpis(my, k); renderManchete(my, k); renderSent(k); renderTipos(my, k); renderListas(my, k); renderResumo(my, k); renderTodos(my, k);
  }

  function animarNumero(node, de, para, fmtFn) {
    const vez = (node._vez || 0) + 1; node._vez = vez; // um lote novo cancela a animação anterior do mesmo número
    if (de === para) { node.textContent = fmtFn(para); return; }
    const t0 = performance.now(), dur = 380;
    const step = (t) => { if (node._vez !== vez) return; const x = Math.min(1, (t - t0) / dur); node.textContent = fmtFn(de + (para - de) * (1 - Math.pow(1 - x, 3))); if (x < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function renderKpis(my, k) {
    const box = $('kpis');
    const defs = [
      ['n', 'Comentários', k.n, (v) => fmt.int(v), `de ${fmt.int(my.coms.length)}${my.do_canal ? ` · ${my.do_canal} do canal ignorado${my.do_canal > 1 ? 's' : ''}` : ''}`, ''],
      ['pos', 'Positivos', pct(k.pos, k.n), (v) => Math.round(v) + '%', `negativos ${pct(k.neg, k.n)}%`, ''],
      ['leads', 'Leads', k.leads.length, (v) => fmt.int(v), 'interesse em comprar', 'lead'],
      ['perg', 'Sem resposta', k.perg.length, (v) => fmt.int(v), 'merecem resposta do canal', 'perg'],
      ['ideias', 'Pedidos de vídeo', k.ideias.length, (v) => fmt.int(v), 'ideias do público', 'ideia'],
      ['crit', 'Críticas', k.crit.length, (v) => fmt.int(v), 'construtivas ou reclamações', 'crit'],
      ['spam', 'Spam', k.spam.length, (v) => fmt.int(v), 'para remover', 'spam'],
    ];
    if (!box.children.length) {
      for (const [id, label, , , , cls] of defs) box.append(el('div', { class: 'kpi ' + cls, 'data-k': id }, [el('div', { class: 'k', text: label }), el('div', { class: 'v', text: '0' }), el('div', { class: 's', text: '' })]));
    }
    for (const [id, , val, f, sub] of defs) {
      const node = box.querySelector(`[data-k="${id}"]`);
      animarNumero(node.querySelector('.v'), my.kpiPrev[id] || 0, val, f);
      my.kpiPrev[id] = val;
      node.querySelector('.s').textContent = sub;
    }
  }

  // ---------- a manchete: a maior oportunidade da edição ----------
  const ORDENA = {
    leads: (k) => [...k.leads].sort((a, b) => b.it.compra - a.it.compra),
    perg: (k) => [...k.perg].sort((a, b) => b.it.resp * pesoLikes(b) - a.it.resp * pesoLikes(a)),
    ideias: (k) => [...k.ideias].sort((a, b) => b.likes - a.likes || b.it.tipo_p - a.it.tipo_p),
    crit: (k) => [...k.crit].sort((a, b) => b.it.tipo_p * pesoLikes(b) - a.it.tipo_p * pesoLikes(a)),
    spam: (k) => [...k.spam].sort((a, b) => b.it.tipo_p - a.it.tipo_p),
  };
  // ordem de valor para o negócio: quem quer comprar, quem espera resposta, o que o público pede, o que criticam, o que limpar
  const CATS = {
    leads: { chapeu: 'Leads quentes', meta: 'a maior oportunidade desta edição', foco: 'lead', frase: (n, total) => `${n === 1 ? 'lead quente' : 'leads quentes'} entre ${fmt.int(total)} comentários` },
    perg: { chapeu: 'Dúvidas sem resposta', meta: 'a maior oportunidade desta edição', foco: 'perg', frase: (n) => `${n === 1 ? 'pergunta espera' : 'perguntas esperam'} resposta do canal` },
    ideias: { chapeu: 'Pedidos de vídeo', meta: 'a maior oportunidade desta edição', foco: 'ideia', frase: (n) => (n === 1 ? 'pedido de vídeo novo do público' : 'pedidos de vídeos novos do público') },
    crit: { chapeu: 'Críticas', meta: 'o que pede atenção nesta edição', foco: 'crit', frase: (n) => (n === 1 ? 'crítica pede atenção' : 'críticas pedem atenção') },
    spam: { chapeu: 'Spam', meta: 'o que limpar nesta edição', foco: 'spam', frase: (n) => (n === 1 ? 'comentário de spam para remover' : 'comentários de spam para remover') },
  };
  const ORDEM_CATS = ['leads', 'perg', 'ideias', 'crit', 'spam'];

  function linhaFina(my, k) {
    const cab = my.fim ? `O Jev leu ${plural(k.n, 'comentário', 'comentários')}` : `O Jev já leu ${fmt.int(k.n)} de ${plural(my.coms.length, 'comentário', 'comentários')}`;
    return `${cab} e separou ${plural(k.leads.length, 'lead', 'leads')}, ${plural(k.perg.length, 'pergunta sem resposta', 'perguntas sem resposta')}, `
      + `${plural(k.ideias.length, 'pedido de vídeo', 'pedidos de vídeo')}, ${plural(k.crit.length, 'crítica', 'críticas')} e ${fmt.int(k.spam.length)} de spam.`;
  }

  function olho(my, c, foco) {
    const it = c.it;
    return el('blockquote', { class: 'olho', 'data-id': c.id }, [
      el('p', { class: 'olho-tx', text: c.texto }),
      el('footer', { class: 'olho-by' }, [
        el('span', { class: 'autor', text: c.autor }),
        el('span', { text: plural(c.likes || 0, 'curtida', 'curtidas') }),
        c.publicado ? el('span', { text: tempo(c.publicado) }) : null,
        foco ? etiquetaFoco(c, foco, true) : el('span', { class: 'tg', text: `${TIPOS[it.tipo]} ${fmt.pct(it.tipo_p)}` }),
        el('a', { href: linkComentario(my.id, c.id), target: '_blank', rel: 'noopener', text: 'abrir no YouTube ↗' }),
      ]),
    ]);
  }

  function renderManchete(my, k) {
    const box = $('manchete');
    let estado;
    if (my.erro && !k.n) estado = 'erro';
    else if (my.fim && my.fim.vazio) estado = 'vazio';
    else if (!k.n) estado = 'lendo';
    else estado = ORDEM_CATS.find((c) => k[c].length) || 'nada';
    document.querySelectorAll('#kpis .kpi').forEach((n) => n.classList.toggle('foco', n.dataset.k === estado));
    const cat = CATS[estado];
    if (estado !== my.mcat) {
      my.mcat = estado; my.mid = null; my.mPrev = 0;
      const chapeu = (a, b) => el('p', { class: 'chapeu' }, [el('span', { class: 'chapeu-k', text: a }), b ? el('span', { class: 'chapeu-m', text: b }) : null]);
      if (cat) {
        box.replaceChildren(
          chapeu(cat.chapeu, cat.meta),
          el('h2', { class: 'mt' }, [el('span', { class: 'mt-n' }, [el('span', { class: 'mt-v', text: '0' }), circulo()]), el('span', { class: 'mt-f' })]),
          el('p', { class: 'linha-fina' }),
          el('div', { class: 'olho-slot' }),
        );
      } else if (estado === 'nada') {
        box.replaceChildren(chapeu('Edição tranquila', 'nenhuma oportunidade clara'), el('h2', { class: 'mt', text: 'Nenhuma oportunidade clara neste vídeo' }), el('p', { class: 'linha-fina' }), el('div', { class: 'olho-slot' }));
      } else if (estado === 'erro') {
        box.replaceChildren(chapeu('Nota da redação', 'edição suspensa'), el('h2', { class: 'mt', text: my.erro.titulo || 'Não deu certo' }), el('p', { class: 'linha-fina', text: my.erro.msg || '' }));
      } else if (estado === 'vazio') {
        box.replaceChildren(chapeu('Sem pauta', 'nada a noticiar'), el('h2', { class: 'mt', text: 'Este vídeo ainda não tem comentários' }), el('p', { class: 'linha-fina', text: 'Quando o público comentar, cole o link de novo: o Jev lê tudo em segundos.' }));
      } else {
        box.replaceChildren(chapeu('Edição em fechamento', 'a manchete sai com os primeiros lotes'), el('h2', { class: 'mt espera', text: 'O Jev está lendo os comentários…' }),
          el('i', { class: 'greek g1' }), el('i', { class: 'greek g2' }),
          el('div', { class: 'olho-esboco', 'aria-hidden': 'true' }, [el('i', { class: 'greek g1' }), el('i', { class: 'greek g2' }), el('i', { class: 'greek g3' })]));
      }
    }
    if (cat) {
      const n = k[estado].length;
      animarNumero(box.querySelector('.mt-v'), my.mPrev, n, (v) => fmt.int(v));
      my.mPrev = n;
      box.querySelector('.mt-f').textContent = ' ' + cat.frase(n, k.n);
      box.querySelector('.linha-fina').textContent = linhaFina(my, k);
      const top = ORDENA[estado](k)[0];
      if (top && top.id !== my.mid) { my.mid = top.id; box.querySelector('.olho-slot').replaceChildren(olho(my, top, cat.foco)); }
    } else if (estado === 'nada') {
      box.querySelector('.linha-fina').textContent = `${linhaFina(my, k)} ${pct(k.pos, k.n)}% dos comentários são positivos.`;
      const top = [...k.feitos].sort((a, b) => b.likes - a.likes)[0];
      if (top && top.id !== my.mid) { my.mid = top.id; box.querySelector('.olho-slot').replaceChildren(olho(my, top, null)); }
    }
  }

  function renderSent(k) {
    const bar = $('sentbar'), lbl = $('sentlbl');
    if (!bar.children.length) {
      for (let s = 0; s < 5; s++) bar.append(el('i', { style: { background: SCOL[s], flexGrow: '0' }, title: SENT[s] }));
      for (let s = 0; s < 5; s++) lbl.append(el('div', {}, [el('b', {}, [el('span', { class: 'sc', text: '0' }), el('span', { class: 'sp', text: '' })]), el('i', { style: { background: SCOL[s] } }), SENT[s]]));
    }
    [...bar.children].forEach((node, s) => { node.style.flexGrow = String(k.porSent[s]); node.title = `${SENT[s]}: ${k.porSent[s]}`; });
    [...lbl.children].forEach((node, s) => { node.querySelector('.sc').textContent = String(k.porSent[s]); node.querySelector('.sp').textContent = k.n ? ` · ${pct(k.porSent[s], k.n)}%` : ''; });
    const lg = $('legend');
    if (!lg.children.length) {
      lg.append(
        ...SENT.map((t, s) => el('span', {}, [el('i', { class: 'sw', style: { background: SCOL[s] } }), t])),
        el('span', {}, [el('i', { class: 'sw pend' }), 'na fila']),
        ...[['', 'lead', 'lead'], ['?', 'perg', 'sem resposta'], ['+', 'ideia', 'pedido de vídeo'], ['×', 'spam', 'spam']].map(([g, k2, t]) => el('span', { class: 'lg' }, [el('i', { class: 'mini', 'data-g': k2, text: g }), t])),
      );
    }
  }

  function renderTipos(my, k) {
    const box = $('types');
    const max = Math.max(1, ...Object.values(k.porTipo));
    const ordem = Object.keys(TIPOS).sort((a, b) => k.porTipo[b] - k.porTipo[a]);
    const topo = ordem[0];
    const rows = ordem.map((t) => {
      let row = box.querySelector(`[data-t="${t}"]`);
      if (!row) {
        row = el('button', { class: 'trow', type: 'button', 'data-t': t, onclick: () => filtrar(t) }, [
          el('span', { class: 'lb', text: TIPOS[t] }), el('span', { class: 'tr' }, [el('i')]), el('span', { class: 'n', text: '0' }),
        ]);
      }
      const n = k.porTipo[t];
      row.classList.toggle('zero', !n); row.classList.toggle('top', !!n && t === topo);
      row.querySelector('.n').textContent = k.n ? `${n} · ${pct(n, k.n)}%` : '0';
      row.title = `${TIPOS[t]}: ${n} comentário(s) — clique para ver`;
      requestAnimationFrame(() => { row.querySelector('.tr i').style.width = (n / max) * 100 + '%'; });
      return row;
    });
    box.replaceChildren(...rows);
  }

  function renderResumo(my, k) {
    const s = $('summary');
    if (!k.n) { s.innerHTML = '<span class="dim">O resumo aparece quando os primeiros lotes chegarem.</span>'; return; }
    const ordem = Object.keys(TIPOS).sort((a, b) => k.porTipo[b] - k.porTipo[a]);
    const t = ordem[0];
    const maisCurtida = [...k.perg].sort((a, b) => b.likes - a.likes)[0];
    let h = `<b>${pct(k.pos, k.n)}%</b> dos comentários são positivos e <b>${pct(k.neg, k.n)}%</b> negativos. O tipo mais comum é <b>${escapeHtml(TIPOS[t].toLowerCase())}</b> (${k.porTipo[t]}). `;
    h += k.perg.length ? `Há <b>${k.perg.length}</b> comentário${k.perg.length > 1 ? 's' : ''} que merece${k.perg.length > 1 ? 'm' : ''} resposta e ainda não ${k.perg.length > 1 ? 'têm' : 'tem'} resposta do canal${maisCurtida && maisCurtida.likes ? ` — o mais curtido tem ${plural(maisCurtida.likes, 'curtida', 'curtidas')}` : ''}. ` : 'Nenhuma dúvida relevante está sem resposta do canal. ';
    h += k.leads.length ? `<b>${k.leads.length}</b> pessoa${k.leads.length > 1 ? 's demonstraram' : ' demonstrou'} interesse em comprar.` : 'Nenhum lead claro neste vídeo.';
    s.innerHTML = h;
  }

  // ---------- cartões de comentário ----------
  const ROT_FOCO = { lead: 'compra', perg: 'merece resposta', ideia: 'pedido de vídeo', spam: 'spam' };
  function pctFoco(c, foco) {
    const it = c.it;
    if (foco === 'lead') return Math.max(it.compra, it.tipo === 'intencao_de_compra' ? it.tipo_p : 0);
    if (foco === 'perg') return it.resp;
    if (foco === 'ideia') return it.tipo === 'pedido_de_conteudo' ? it.tipo_p : (it.tipos.find(([k2]) => k2 === 'pedido_de_conteudo') || [0, 0])[1];
    return it.tipo_p; // spam e críticas: a probabilidade do tipo escolhido
  }
  // a etiqueta da decisão do Jev; na primeira página o número ganha o círculo do lápis azul
  function etiquetaFoco(c, foco, circular) {
    const rot = foco === 'crit' ? TIPOS[c.it.tipo] : ROT_FOCO[foco];
    const num = el('b', { class: 'circ' }, [fmt.pct(pctFoco(c, foco))]);
    if (circular) num.append(circulo());
    return el('span', { class: 'tg foco ' + foco, title: 'Decisão do Jev' }, [rot + ' ', num]);
  }
  function tagsDe(c, foco, circular) {
    const it = c.it, out = [];
    if (!it) { out.push(el('span', { class: 'tg fila', text: 'na fila do Jev' })); return out; }
    if (foco) out.push(etiquetaFoco(c, foco, circular));
    if (!foco || (foco !== 'spam' && foco !== 'ideia' && foco !== 'crit')) out.push(el('span', { class: 'tg', title: 'Tipo escolhido pelo Jev', text: `${TIPOS[it.tipo]} ${fmt.pct(it.tipo_p)}` }));
    if (!foco) { if (isLead(c)) out.push(etiquetaFoco(c, 'lead', false)); if (isPerg(c)) out.push(etiquetaFoco(c, 'perg', false)); }
    const s = sentN(c);
    out.push(el('span', { class: 'tg sent', title: `Sentimento: nota ${fmt.num(it.sent, 1)} de 4` }, [el('i', { class: 'sd', style: { background: SCOL[s] } }), SENT[s]]));
    return out;
  }
  function cartao(my, c, foco, circular) {
    const hd = [el('span', { class: 'autor', text: c.autor, title: c.autor }), el('span', { class: 'mt-lk', title: 'curtidas' }, [fmt.int(c.likes), el('span', { class: 'sr-only', text: ' curtidas' })])];
    if (c.respostas) hd.push(el('span', { class: 'mt-rp', title: 'respostas' }, [fmt.int(c.respostas), el('span', { class: 'sr-only', text: ' respostas' })]));
    if (c.respondido_canal) hd.push(el('span', { class: 'ok', text: 'canal respondeu' }));
    hd.push(el('span', { text: tempo(c.publicado) }));
    return el('article', { class: 'cm', 'data-id': c.id }, [
      el('div', { class: 'hd' }, hd),
      el('p', { class: 'tx', text: c.texto }),
      el('div', { class: 'ft' }, [...tagsDe(c, foco, circular), el('a', { href: linkComentario(my.id, c.id), target: '_blank', rel: 'noopener', text: 'abrir no YouTube ↗' })]),
    ]);
  }
  // reaproveita o cartão já desenhado de cada comentário: o lápis só risca (e a entrada só anima) quem chega agora
  function cartoes(box, my, lista, foco, circular) {
    if (box._run !== my) { box._run = my; box._mapa = new Map(); }
    const antes = box._mapa, agora = new Map();
    const nos = lista.map((c) => {
      const chave = `${foco || ''}|${c.id}|${c.it ? 1 : 0}`;
      const n = antes.get(chave) || cartao(my, c, foco, circular);
      agora.set(chave, n);
      return n;
    });
    box._mapa = agora;
    return nos;
  }
  // tira primeiro quem saiu; assim os cartões que ficam não são reinseridos (reinserir reinicia a animação)
  function sincronizar(box, nos) {
    const quer = new Set(nos);
    for (const n of [...box.children]) if (!quer.has(n)) n.remove();
    for (let i = 0; i < nos.length; i++) { const atual = box.children[i]; if (atual !== nos[i]) box.insertBefore(nos[i], atual || null); }
  }

  const LISTAS = [
    ['leads', 'l-leads', 'c-leads', 'lead', ORDENA.leads, 'Nenhum lead claro neste vídeo — o Jev não inventa. Lead aparece quando alguém pergunta preço, link, como entrar ou contratar.'],
    ['perg', 'l-perg', 'c-perg', 'perg', ORDENA.perg, 'Nenhuma dúvida relevante sem resposta do canal.'],
    ['ideias', 'l-ideias', 'c-ideias', 'ideia', ORDENA.ideias, 'Ninguém pediu vídeo novo desta vez.'],
    ['crit', 'l-crit', 'c-crit', 'crit', ORDENA.crit, 'Nenhuma crítica ou reclamação neste vídeo.'],
    ['spam', 'l-spam', 'c-spam', 'spam', ORDENA.spam, 'Nenhum spam encontrado.'],
  ];
  function renderListas(my, k) {
    for (const [key, boxId, cntId, foco, sel, vazio] of LISTAS) {
      const box = $(boxId), itens = sel(k);
      $(cntId).textContent = fmt.int(itens.length);
      $(cntId).className = 'cnt' + (itens.length ? ' tem' : '');
      if (!itens.length) {
        box._mapa = new Map();
        const acabou = !!(my.fim || my.erro);
        const txt = my.erro && !my.fim ? 'Edição suspensa: veja a nota da redação acima.' : acabou ? vazio : 'O Jev está lendo… os itens aparecem aqui conforme os lotes chegam.';
        const atual = box.firstElementChild;
        if (!(box.children.length === 1 && atual.classList.contains('empty') && atual.textContent === txt)) box.replaceChildren(el('div', { class: 'empty' + (acabou ? '' : ' lendo'), text: txt }));
        continue;
      }
      const nos = cartoes(box, my, itens.slice(0, 4), foco, true);
      if (itens.length > 4) nos.push(el('div', { class: 'seeall' }, [el('button', { class: 'jev-btn jev-btn--sm jev-btn--ghost', type: 'button', onclick: () => filtrar(key) }, [`Ver todos (${itens.length})`])]));
      sincronizar(box, nos);
    }
  }

  // ---------- todos + filtros (classificados) ----------
  function filtrar(f) {
    if (!R) return;
    R.filtro = f; R.pagina = 1;
    renderTodos(R, contar(R));
    $('all').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderTodos(my, k) {
    const tabs = $('ftabs');
    const defs = [['todos', 'Todos', my.coms.length], ['leads', 'Leads', k.leads.length], ['perg', 'Sem resposta', k.perg.length], ['ideias', 'Pedidos de vídeo', k.ideias.length], ['crit', 'Críticas', k.crit.length], ['spam', 'Spam', k.spam.length]];
    for (const t of Object.keys(TIPOS).sort((a, b) => k.porTipo[b] - k.porTipo[a])) if (k.porTipo[t] && !['spam_golpe', 'pedido_de_conteudo', 'critica_construtiva', 'reclamacao'].includes(t)) defs.push([t, TIPOS[t], k.porTipo[t]]);
    tabs.replaceChildren(...defs.map(([id, label, n]) => el('button', { class: 'jev-chip' + (my.filtro === id ? ' active' : ''), type: 'button', 'data-f': id, 'aria-pressed': String(my.filtro === id), onclick: () => { my.filtro = id; my.pagina = 1; renderTodos(my, contar(my)); } }, [label + ' ', el('b', { text: fmt.int(n) })])));
    let lista = my.coms;
    const f = my.filtro;
    if (f === 'leads') lista = k.leads; else if (f === 'perg') lista = k.perg; else if (f === 'ideias') lista = k.ideias; else if (f === 'crit') lista = k.crit; else if (f === 'spam') lista = k.spam;
    else if (f !== 'todos') lista = my.coms.filter((c) => c.it && c.it.tipo === f);
    const ord = $('ordem').value;
    if (ord === 'likes') lista = [...lista].sort((a, b) => b.likes - a.likes);
    else if (ord === 'novos') lista = [...lista].sort((a, b) => Date.parse(b.publicado) - Date.parse(a.publicado));
    const foco = { leads: 'lead', perg: 'perg', ideias: 'ideia', crit: 'crit', spam: 'spam' }[f];
    const box = $('alllist');
    const mostrar = lista.slice(0, PAGE * my.pagina);
    if (mostrar.length) sincronizar(box, cartoes(box, my, mostrar, foco, false));
    else { box._mapa = new Map(); box.replaceChildren(el('div', { class: 'empty', text: my.coms.length ? 'Nenhum comentário neste filtro.' : 'Sem comentários.' })); }
    const more = $('more');
    more.hidden = lista.length <= mostrar.length;
    more.textContent = `Mostrar mais (${fmt.int(lista.length - mostrar.length)})`;
  }

  // ---------- fim (fechamento da edição) ----------
  function finalizar(my, e) {
    my.fim = e; clearInterval(my.timer);
    $('pfill').style.width = '100%'; $('pbar').classList.add('done');
    renderTudo(my);
    $('csv').disabled = !my.coms.some((c) => c.it);
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (e.vazio) { $('ptext').textContent = 'Este vídeo ainda não tem comentários para analisar.'; $('fechamento').textContent = 'Edição sem pauta'; return; }
    const perM = e.n ? (e.cost / e.n) * 1e6 : 0;
    const refazer = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>';
    if (e.cached) {
      $('ptext').innerHTML = `Resultado em cache: o Jev analisou este vídeo ${escapeHtml(tempo(new Date(Date.now() - (e.idade_s || 0) * 1000).toISOString()))}.`;
      $('speed').innerHTML = `<span class="big"><b>${fmt.int(e.n)}</b> comentários em <b>${fmt.ms(e.total_ms)}</b></span><span>por <b>${fmt.usd(e.cost)}</b> na 1ª análise · agora US$ 0</span>`;
      $('acts').replaceChildren(el('button', { class: 'jev-btn jev-btn--sm', type: 'button', html: refazer + '<span>Reanalisar ao vivo</span>', onclick: () => analisar(my.id, { fresh: true }) }));
      $('fechamento').replaceChildren(lapis('visto'), 'Edição do arquivo · analisada ' + tempo(new Date(Date.now() - (e.idade_s || 0) * 1000).toISOString()));
    } else {
      $('ptext').innerHTML = `Pronto: <b>${fmt.int(e.n)}</b> comentários classificados${e.falhas ? ` · ${e.falhas} não puderam ser lidos` : ''}.`;
      $('speed').innerHTML = `<span class="big"><b>${fmt.int(e.n)}</b> comentários em <b>${fmt.ms(e.total_ms)}</b></span><span>por <b>${fmt.usd(e.cost)}</b></span><span><b>${e.n_lotes}</b> lotes · ${e.paralelo} em paralelo · <b>${fmt.int(e.perguntas)}</b> decisões</span>${perM ? `<span>1 milhão de comentários ≈ <b>US$ ${fmt.int(perM)}</b></span>` : ''}`;
      $('acts').replaceChildren();
      $('fechamento').replaceChildren(lapis('visto'), `Edição fechada às ${hora}`);
    }
    if (e.falhas) toast(`${e.falhas} comentários não puderam ser analisados agora (limite do Jev). O resto está na tela.`, 'err');
    window.__comentariosFim = { id: my.id, n: e.n, cached: !!e.cached, total_ms: e.total_ms, cost: e.cost, at: performance.now() }; // gancho do teste e2e
  }

  // ---------- CSV ----------
  function exportarCSV() {
    if (!R) return;
    const num = (x) => (x == null ? '' : String(Math.round(x * 1000) / 1000).replace('.', ','));
    const linhas = [['autor', 'comentario', 'curtidas', 'respostas', 'canal_respondeu', 'tipo', 'prob_tipo', 'merece_resposta', 'intencao_compra', 'sentimento_0a4', 'sentimento', 'lead', 'sem_resposta', 'link', 'publicado_em']];
    for (const c of R.coms) {
      if (!c.it) continue;
      linhas.push([c.autor, c.texto, c.likes, c.respostas, c.respondido_canal ? 'sim' : 'não', TIPOS[c.it.tipo], num(c.it.tipo_p), num(c.it.resp), num(c.it.compra), num(c.it.sent), SENT[sentN(c)], isLead(c) ? 'sim' : 'não', isPerg(c) ? 'sim' : 'não', linkComentario(R.id, c.id), c.publicado]);
    }
    const esc = (v) => { const s = String(v == null ? '' : v); return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = String.fromCharCode(0xfeff) + linhas.map((l) => l.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = el('a', { href: url, download: `comentarios-${R.id}.csv` });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    toast(`CSV com ${linhas.length - 1} comentários baixado.`, 'ok');
  }

  // ---------- dica do mosaico ----------
  function initTip() {
    const tip = $('tip'), m = $('mosaic');
    const show = (cell) => {
      const c = R && R.byId.get(cell.dataset.id); if (!c) return;
      const it = c.it;
      tip.innerHTML = `<b>${escapeHtml(c.autor)}</b> <span class="m">· ${plural(c.likes || 0, 'curtida', 'curtidas')}</span><div class="q">${escapeHtml(c.texto.slice(0, 220))}</div>` +
        (it ? `<div class="m">${escapeHtml(TIPOS[it.tipo])} ${fmt.pct(it.tipo_p)} · ${SENT[sentN(c)]} · merece resposta ${fmt.pct(it.resp)} · compra ${fmt.pct(it.compra)}</div>` : '<div class="m">na fila do Jev</div>');
      tip.hidden = false;
      const r = cell.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(innerWidth - w - 8, x));
      let y = r.top - h - 10; if (y < 66) y = r.bottom + 10;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    m.addEventListener('mouseover', (e) => { const c = e.target.closest('.cell'); if (c) show(c); });
    m.addEventListener('focusin', (e) => { const c = e.target.closest('.cell'); if (c) show(c); });
    m.addEventListener('click', (e) => { const c = e.target.closest('.cell'); if (c) show(c); });
    m.addEventListener('mouseleave', () => { tip.hidden = true; });
    m.addEventListener('focusout', () => { tip.hidden = true; });
    addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  }

  // ---------- eventos ----------
  // um link próprio (enviado ou colado) desmarca a pauta pronta que estava selecionada
  const desmarcarExemplos = () => document.querySelectorAll('#examples .ex').forEach((x) => x.classList.remove('active'));
  $('form').addEventListener('submit', (e) => { e.preventDefault(); desmarcarExemplos(); analisar($('url').value); });
  $('url').addEventListener('paste', () => setTimeout(() => { const v = $('url').value; if (extrairId(v)) { desmarcarExemplos(); analisar(v); } }, 0));
  $('csv').addEventListener('click', exportarCSV);
  $('ordem').addEventListener('change', () => { if (R) { R.pagina = 1; renderTodos(R, contar(R)); } });
  $('more').addEventListener('click', () => { if (R) { R.pagina++; renderTodos(R, contar(R)); } });
  initTip();
  carregarExemplos();
  const inicial0 = PARAMS.get('v');
  if (inicial0) { $('url').value = inicial0.length === 11 ? 'https://www.youtube.com/watch?v=' + inicial0 : inicial0; analisar(inicial0); }
})();

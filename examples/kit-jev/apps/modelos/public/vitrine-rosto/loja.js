// A loja de demonstração (Ressoa): a página do produto, as áreas que o mouse "olha" (preço, fotos, avaliações…), a coluna
// "Para você, agora" onde os módulos entram e saem animados, e o cursor de mentira da simulação. Tudo aqui é fictício.

// áreas da página: [nome em palavras para o Jev ("parado sobre ___"), "andando ___"]
export const AREAS = {
  fotos: ['as FOTOS', 'pelas FOTOS'],
  preco: ['o PREÇO', 'pelo PREÇO'],
  avaliacoes: ['as AVALIAÇÕES', 'pelas AVALIAÇÕES'],
  cores: ['as CORES', 'pelas CORES'],
  comprar: ['o botão COMPRAR', 'pelo botão COMPRAR'],
  frete: ['o FRETE', 'pelo FRETE'],
  ficha: ['a FICHA TÉCNICA', 'pela FICHA TÉCNICA'],
};

export const AREAS_CURTAS = { fotos: 'FOTOS', preco: 'PREÇO', avaliacoes: 'AVALIAÇÕES', cores: 'CORES', comprar: 'COMPRAR', frete: 'FRETE', ficha: 'FICHA' };

const CORES = [
  { id: 'prata', nome: 'Prata', filtro: 'none', bola: 'linear-gradient(135deg,#f4f4f5,#a1a1aa)' },
  { id: 'grafite', nome: 'Grafite', filtro: 'brightness(.42) contrast(1.25) saturate(.6)', bola: 'linear-gradient(135deg,#52525b,#18181b)' },
  { id: 'coral', nome: 'Coral', filtro: 'sepia(1) saturate(3.4) hue-rotate(-28deg) brightness(.98)', bola: 'linear-gradient(135deg,#ffb199,#ff6b35)' },
  { id: 'areia', nome: 'Areia', filtro: 'sepia(.75) saturate(1.3) brightness(1.02)', bola: 'linear-gradient(135deg,#f5e6c8,#c8a671)' },
];
const FOTOS = [
  { id: 'frente', rotulo: 'De frente', img: 'headphone', cls: '' },
  { id: 'lado', rotulo: 'De lado', img: 'headphone', cls: 'lado' },
  { id: 'detalhe', rotulo: 'Almofada', img: 'headphone', cls: 'detalhe' },
  { id: 'estojo', rotulo: 'Estojo', img: 'package', cls: 'objeto' },
];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function criarLoja({ ui, url, som, spec, aoLimpar }) {
  const { el, toast } = ui;
  const P = spec.produto;
  const MOD = Object.fromEntries(spec.modulos.map((m) => [m.id, m]));
  const img = (nome, cls = '', alt = '') => el('img', { class: cls, src: url(`assets/${nome}_3d.png`), alt, draggable: 'false', decoding: 'async' });

  // ---------- topo da loja ----------
  const sacolaN = el('b', { text: '0' });
  const topo = el('header', { class: 'vr-loja-topo' }, [
    el('div', { class: 'vr-marca' }, [img('cloud', 'vr-marca-ic'), el('b', { text: P.loja })]),
    el('nav', { class: 'vr-nav', 'aria-label': 'Seções da loja' }, [el('span', { class: 'on', text: 'Fones' }), el('span', { text: 'Caixas de som' }), el('span', { text: 'Acessórios' })]),
    el('span', { class: 'vr-demo', text: 'Loja de demonstração · preços fictícios' }),
    el('span', { class: 'vr-sacola', title: 'Sacola' }, [img('shopping_bags', 'vr-sacola-ic'), sacolaN]),
  ]);

  // ---------- galeria ----------
  let cor = CORES[0], foto = FOTOS[0];
  const fotoImg = img('headphone', 'vr-foto-img', `${P.nome} na cor prata`);
  const fotoBrilho = el('div', { class: 'vr-foto-brilho', 'aria-hidden': 'true' });
  const fotoTag = el('span', { class: 'vr-foto-tag', text: `${P.nome} · ${cor.nome}` });
  const ficha = el('ul', { class: 'vr-ficha', 'data-area': 'ficha', 'aria-label': 'Ficha técnica' }, [
    el('li', {}, [img('muted_speaker'), el('span', { text: 'Cancela ruído' })]),
    el('li', {}, [img('battery'), el('span', { text: '40 h' })]),
  ]);
  const palco = el('div', { class: 'vr-foto' }, [el('div', { class: 'vr-foto-sol', 'aria-hidden': 'true' }), fotoImg, fotoBrilho, fotoTag, ficha]);
  const minis = el('div', { class: 'vr-minis', role: 'group', 'aria-label': 'Fotos do produto' });
  const botoesFoto = FOTOS.map((f) => {
    const b = el('button', { class: 'vr-mini' + (f === foto ? ' on' : ''), type: 'button', 'aria-label': `Foto: ${f.rotulo}`, title: f.rotulo, onclick: () => trocarFoto(f) }, [img(f.img, 'vr-mini-img ' + f.cls)]);
    minis.append(b); return b;
  });
  const galeria = el('div', { class: 'vr-galeria', 'data-area': 'fotos' }, [palco, minis]);

  function aplicarFoto() {
    fotoImg.className = 'vr-foto-img ' + foto.cls;
    fotoImg.src = url(`assets/${foto.img}_3d.png`);
    fotoImg.style.filter = foto.img === 'headphone' ? cor.filtro : 'none';
    fotoImg.alt = foto.img === 'headphone' ? `${P.nome} na cor ${cor.nome.toLowerCase()}` : foto.rotulo;
    fotoTag.textContent = foto.img === 'headphone' ? `${P.nome} · ${cor.nome}` : foto.rotulo;
    botoesFoto.forEach((b, i) => { b.classList.toggle('on', FOTOS[i] === foto); const im = b.querySelector('img'); im.style.filter = FOTOS[i].img === 'headphone' ? cor.filtro : 'none'; });
    fotoImg.animate([{ opacity: 0, transform: 'scale(.92) translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  function trocarFoto(f) { foto = f; aplicarFoto(); }
  function proximaFoto() { trocarFoto(FOTOS[(FOTOS.indexOf(foto) + 1) % FOTOS.length]); }

  // ---------- informações, preço, cores, comprar, frete ----------
  const parcPill = el('span', { class: 'vr-parc' }, [img('credit_card', 'vr-parc-ic'), el('span', {}, ['ou ', el('b', { text: P.parcela }), ' sem juros'])]);
  const preco = el('div', { class: 'vr-preco', 'data-area': 'preco' }, [
    el('div', { class: 'vr-valor mj-num', text: P.preco }),
    el('div', { class: 'vr-preco-sub' }, [el('span', { class: 'vr-pix', text: 'à vista no Pix ou no cartão' }), parcPill]),
  ]);
  const corNome = el('b', { text: cor.nome });
  const bolas = CORES.map((c) => el('button', { class: 'vr-bola' + (c === cor ? ' on' : ''), type: 'button', 'aria-label': `Cor ${c.nome}`, title: c.nome, style: { background: c.bola }, onclick: () => { cor = c; corNome.textContent = c.nome; bolas.forEach((b, i) => b.classList.toggle('on', CORES[i] === c)); if (foto.img !== 'headphone') foto = FOTOS[0]; aplicarFoto(); } }));
  const cores = el('div', { class: 'vr-cores', 'data-area': 'cores' }, [el('span', { class: 'vr-cores-t' }, ['Cor: ', corNome]), el('div', { class: 'vr-bolas' }, bolas)]);
  const comprar = el('button', { class: 'vr-comprar', type: 'button', 'data-area': 'comprar', onclick: () => { som.pop(); toast('Esta é uma loja de demonstração: nada é vendido aqui. 🙂'); } }, [img('sparkles', 'vr-comprar-ic'), el('span', { class: 'vr-comprar-tx', text: 'Comprar' }), el('i', { class: 'vr-comprar-brilho', 'aria-hidden': 'true' })]);
  const sacolaBt = el('button', { class: 'vr-sacola-bt', type: 'button', 'aria-label': 'Pôr na sacola', title: 'Pôr na sacola', onclick: () => { sacolaN.textContent = String(+sacolaN.textContent + 1); som.tique(); toast('Na sacola (de mentira: é uma loja de demonstração).'); } }, [img('shopping_cart', 'vr-sacola-bt-ic')]);
  const amanha = new Date(Date.now() + 864e5);
  const prazo = el('b', { class: 'mj-num', text: '2 h 14 min' });
  const frete = el('div', { class: 'vr-frete', 'data-area': 'frete' }, [
    el('span', { class: 'vr-frete-padrao' }, [img('delivery_truck', 'vr-frete-ic'), el('span', { text: 'Frete grátis · chega em 3 a 5 dias úteis' })]),
    el('span', { class: 'vr-frete-amanha', title: `Chega amanhã, ${DIAS[amanha.getDay()]}, com frete grátis` }, [img('delivery_truck', 'vr-frete-ic'), el('span', {}, [el('b', { text: 'Chega amanhã' }), ' · peça em ', prazo])]),
  ]);
  const nota = el('button', { class: 'vr-nota', type: 'button', 'data-area': 'avaliacoes', onclick: () => toast('As avaliações desta loja de demonstração são fictícias.') }, [
    el('span', { class: 'vr-estrelas', 'aria-hidden': 'true', text: '★★★★★' }), el('b', { class: 'mj-num', text: P.nota }), el('span', { text: `· ${P.avaliacoes} avaliações` }),
  ]);
  const info = el('div', { class: 'vr-info' }, [
    el('p', { class: 'vr-cat', text: `${P.categoria} · ${P.loja}` }),
    el('h2', { class: 'vr-nome' }, [el('span', { class: 'vr-serif', text: P.nome.split(' ')[0] }), ' ' + P.nome.split(' ').slice(1).join(' ')]),
    nota, preco, cores,
    el('div', { class: 'vr-botoes' }, [comprar, sacolaBt]),
    frete,
    // só em telas altas (o CSS mostra a partir de ~1000 px de altura): a ficha completa
    el('ul', { class: 'vr-detalhes', 'data-area': 'ficha', 'aria-label': 'Destaques do produto' }, [
      ['muted_speaker', 'Cancelamento de ruído ativo, com modo ambiente'],
      ['battery', '40 h de bateria; 10 min na tomada dão 5 h'],
      ['cloud', 'Almofadas macias, só 250 g'],
      ['package', 'Estojo rígido e cabo USB-C na caixa'],
    ].map(([ic, tx]) => el('li', {}, [img(ic), el('span', { text: tx })]))),
  ]);

  // ---------- a coluna viva: "Para você, agora" ----------
  const cartoes = el('div', { class: 'vr-cartoes' });
  const DICA_PADRAO = 'Aqui entram os módulos que a vitrine escolhe <b>pelo seu rosto</b>: 10x sem juros, versão mais barata, comparação…';
  const vazioTx = el('p', { html: DICA_PADRAO });
  const vazio = el('div', { class: 'vr-vazio' }, [
    el('div', { class: 'vr-vazio-ics', 'aria-hidden': 'true' }, ['credit_card', 'label', 'balance_scale', 'camera_with_flash', 'clapper_board'].map((n) => img(n))),
    vazioTx,
  ]);
  // com a câmera ligada, o espaço vazio vira uma sugestão do que testar
  function dica(aoVivo) {
    vazioTx.innerHTML = aoVivo ? 'Câmera ligada! Experimente: <b>sorria</b> para as fotos, <b>franza a testa</b> olhando o preço, olhe para o lado…' : DICA_PADRAO;
  }
  const btLimpar = el('button', { class: 'vr-limpar', type: 'button', title: 'Tirar todos os módulos e recomeçar a vitrine', onclick: () => limpar(true) }, ['↺ ', el('span', { text: 'Recomeçar' })]);
  const viva = el('aside', { class: 'vr-viva', 'aria-label': 'Vitrine viva: o que a loja mostra para você agora' }, [
    el('header', { class: 'vr-viva-cab' }, [el('div', {}, [el('b', { text: 'Para você, agora' }), el('span', { text: 'muda com o seu rosto' })]), btLimpar]),
    cartoes,
  ]);
  cartoes.append(vazio);
  const anuncio = el('p', { class: 'vr-sr', 'aria-live': 'polite' });

  const espera = el('div', { class: 'vr-espera', role: 'status' }, [img('eyes', 'vr-espera-ic'), el('span', { text: 'A vitrine está esperando você voltar' })]);
  const cursor = el('div', { class: 'vr-cursor', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5l15.5 9.2-6.9 1.3 3.9 7.3-3 1.6-3.9-7.3L4.5 19z" fill="#17140f" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>' });
  const brilhos = el('div', { class: 'vr-brilhos', 'aria-hidden': 'true' });

  const no = el('section', { class: 'vr-loja', 'aria-label': `Loja de demonstração ${P.loja}` }, [
    topo,
    el('div', { class: 'vr-produto' }, [galeria, info, viva]),
    espera, brilhos, cursor, anuncio,
  ]);

  // ---------- os módulos ----------
  const ativos = new Map();   // id → { t, no?, porque }
  const linha = (rot, a, b, cls = '') => el('div', { class: 'vr-cmp-l ' + cls }, [el('span', { text: rot }), el('b', { text: a }), el('b', { text: b })]);
  const MONTA = {
    mais_barata: () => [
      el('div', { class: 'vr-mod-lado' }, [img('headphone', 'vr-mod-produto lite')]),
      el('div', { class: 'vr-mod-corpo' }, [
        el('p', { class: 'vr-mod-t', text: 'Versão mais barata' }),
        el('p', { class: 'vr-mod-l' }, [el('b', { text: P.barata.nome }), ' · ', el('b', { class: 'vr-laranja mj-num', text: P.barata.preco })]),
        el('p', { class: 'vr-mod-l dim', text: `${P.barata.parcela} · sem cancelamento de ruído` }),
      ]),
    ],
    comparar: () => [
      el('div', { class: 'vr-mod-corpo largo' }, [
        el('p', { class: 'vr-mod-t' }, [img('balance_scale', 'vr-mod-ic'), 'Comparar com o modelo de cima']),
        el('div', { class: 'vr-cmp' }, [
          linha('', 'Nuvem', 'Max', 'cab'),
          linha('Bateria', '40 h', '60 h'),
          linha('Ruído', 'ativo', 'adaptativo'),
          linha('Preço', 'R$ 899', 'R$ 1.299'),
        ]),
      ]),
    ],
    avaliacoes: () => [
      el('div', { class: 'vr-mod-corpo largo' }, [
        el('p', { class: 'vr-mod-t' }, [img('camera_with_flash', 'vr-mod-ic'), 'Avaliações com foto · ', el('span', { class: 'vr-estrelas', text: '★' }), ' ' + P.nota]),
        el('div', { class: 'vr-fotos-av' }, [['metro', 'no metrô'], ['laptop', 'no trabalho'], ['running_shoe', 'correndo']].map(([cena, rot]) => el('div', { class: 'vr-foto-av', title: `Foto de cliente: ${rot}` }, [img(cena, 'cena'), img('headphone', 'fone')]))),
        el('p', { class: 'vr-mod-l' }, ['“O barulho do metrô some.” ', el('span', { class: 'dim', text: '— Marina, Recife' })]),
      ]),
    ],
    troca: () => [
      el('div', { class: 'vr-mod-lado' }, [img('counterclockwise_arrows_button', 'vr-mod-grande')]),
      el('div', { class: 'vr-mod-corpo' }, [
        el('p', { class: 'vr-mod-t', text: 'Troca grátis em 30 dias' }),
        el('p', { class: 'vr-mod-l', text: 'Não serviu? A gente busca na sua casa e devolve o dinheiro.' }),
      ]),
    ],
    video: () => [
      el('div', { class: 'vr-video', role: 'img', 'aria-label': 'Vídeo de demonstração: o fone em uso no metrô' }, [
        img('metro', 'vr-video-fundo'), img('headphone', 'vr-video-fone'),
        el('span', { class: 'vr-nota-mus n1', text: '♪' }), el('span', { class: 'vr-nota-mus n2', text: '♫' }), el('span', { class: 'vr-nota-mus n3', text: '♪' }),
        el('span', { class: 'vr-video-play', text: '▶' }), el('i', { class: 'vr-video-barra' }),
      ]),
      el('div', { class: 'vr-mod-corpo' }, [
        el('p', { class: 'vr-mod-t', text: 'Vídeo: o Nuvem no metrô' }),
        el('p', { class: 'vr-mod-l dim mj-num', text: '0:18 · em uso de verdade' }),
      ]),
    ],
    chat: () => [
      el('div', { class: 'vr-mod-lado' }, [img('woman_technologist', 'vr-mod-grande')]),
      el('div', { class: 'vr-mod-corpo' }, [
        el('p', { class: 'vr-mod-t' }, ['Rafa, especialista ', el('i', { class: 'vr-online', title: 'online' })]),
        el('p', { class: 'vr-mod-l', text: '“Quer ajuda para escolher entre o Nuvem e o Max?”' }),
        el('button', { class: 'vr-mod-bt', type: 'button', onclick: () => toast('Chat de demonstração: aqui entraria o seu atendimento.') }, ['Conversar']),
      ]),
    ],
  };

  function curto(mod) { return el('div', { class: 'vr-curto' }, [img(mod.img, 'vr-curto-ic'), el('span', { text: mod.rotulo })]); }

  function mostrar(id, porque) {
    const mod = MOD[id];
    if (!mod || ativos.has(id)) return false;
    const t = performance.now();
    anuncio.textContent = `A vitrine mostrou: ${mod.rotulo}`;
    if (mod.lugar === 'preco') { preco.classList.add('com-parc'); pulsar(preco); ativos.set(id, { t, porque }); som.pop(); return true; }
    if (mod.lugar === 'frete') { frete.classList.add('amanha'); pulsar(frete); ativos.set(id, { t, porque }); som.pop(); return true; }
    vazio.remove();
    const card = el('article', { class: 'vr-cartao vr-mod novo mod-' + id, 'data-area': 'mod-' + id }, [
      el('div', { class: 'vr-mod-cheio' }, MONTA[id]()),
      curto(mod),
      el('p', { class: 'vr-porque' }, [el('span', { text: 'porque: ' }), porque || 'o que a vitrine leu']),
    ]);
    // FLIP: os cartões que já estavam deslizam para baixo e encolhem; o novo entra por cima
    const antes = new Map([...cartoes.children].map((n) => [n, n.getBoundingClientRect()]));
    for (const n of cartoes.children) n.classList.add('compacto');
    cartoes.prepend(card);
    // quantos cartões cabem: o novo aberto (~150 px) e os outros compactos (~52 px)
    const max = Math.max(2, Math.min(spec.ritmo.maxCartoes, 1 + Math.floor((cartoes.clientHeight - 150) / 52)));
    const lista = [...cartoes.querySelectorAll('.vr-mod:not(.sai)')];
    for (const velho of lista.slice(max)) {
      ativos.delete(velho.dataset.area.slice(4));
      velho.classList.add('sai');
      setTimeout(() => velho.remove(), 320);
    }
    for (const [n, r] of antes) {
      if (!n.isConnected || n.classList.contains('sai')) continue;
      const d = r.top - n.getBoundingClientRect().top;
      if (Math.abs(d) > 1 && !ui.reduzMovimento) n.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    setTimeout(() => card.classList.remove('novo'), 1600);
    ativos.set(id, { t, porque, no: card });
    som.pop();
    return true;
  }

  function pulsar(n) { n.classList.remove('pulso'); void n.offsetWidth; n.classList.add('pulso'); setTimeout(() => n.classList.remove('pulso'), 1700); }

  function naTela() {
    const t = performance.now();
    return [...ativos].map(([id, a]) => ({ id, ha: Math.round((t - a.t) / 1000) }));
  }

  function limpar(manual) {
    ativos.clear();
    preco.classList.remove('com-parc'); frete.classList.remove('amanha');
    for (const n of [...cartoes.children]) n.remove();
    cartoes.append(vazio);
    humor(null, 0);
    if (manual) { som.whoosh(); aoLimpar && aoLimpar(); }
  }

  // o humor que o Jev leu muda a página na hora (sem precisar de módulo novo)
  let humorAtual = null;
  function humor(id, p) {
    const forte = p >= 0.5;
    no.classList.toggle('h-gostou', id === 'gostou' && forte);
    no.classList.toggle('h-caro', id === 'achou_caro' && forte);
    no.classList.toggle('h-distraido', id === 'distraido' && p >= 0.6);
    no.classList.toggle('h-surpreso', id === 'surpreso' && forte);
    no.classList.toggle('h-tedio', id === 'sem_interesse' && forte);
    if (id === 'surpreso' && forte && humorAtual !== 'surpreso') soltarBrilhos();
    if (id === 'gostou' && forte && humorAtual !== 'gostou') som.ding();
    humorAtual = forte ? id : null;
  }

  function soltarBrilhos() {
    if (ui.reduzMovimento) return;
    brilhos.innerHTML = '';
    const r = palco.getBoundingClientRect(), b = no.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = img('sparkles', 'vr-brilho');
      s.style.left = (r.left - b.left + r.width * (0.1 + Math.random() * 0.8)) + 'px';
      s.style.top = (r.top - b.top + r.height * (0.1 + Math.random() * 0.7)) + 'px';
      s.style.setProperty('--d', (0.7 + Math.random() * 0.8).toFixed(2) + 's');
      s.style.setProperty('--a', (Math.random() * 0.5).toFixed(2) + 's');
      brilhos.append(s);
    }
    setTimeout(() => { brilhos.innerHTML = ''; }, 2200);
  }

  // contagem regressiva do "chega amanhã" (decorativa, de demonstração)
  let seg = 2 * 3600 + 14 * 60;
  setInterval(() => { seg = seg > 0 ? seg - 1 : 2 * 3600 + 14 * 60; prazo.textContent = `${Math.floor(seg / 3600)} h ${String(Math.floor((seg % 3600) / 60)).padStart(2, '0')} min`; }, 1000);

  // ---------- o cursor de mentira (simulação): anda até uma área e "fica" lá ----------
  function alvoDe(area) {
    const n = area === 'longe' ? null : area.startsWith('mod-') ? cartoes.querySelector(`[data-area="${area}"]`) : no.querySelector(`[data-area="${area}"]`);
    const b = no.getBoundingClientRect();
    if (!n) return { x: b.width - 70, y: 26 };   // "longe do produto": lá no canto do topo da loja
    const r = (area === 'preco' ? n.querySelector('.vr-valor') : area === 'fotos' ? palco : n).getBoundingClientRect();
    return { x: r.left - b.left + r.width * 0.55, y: r.top - b.top + r.height * 0.55 };
  }
  let cursorTimer = null;
  function moverCursor(area, ms = 700) {
    const { x, y } = alvoDe(area);
    cursor.classList.add('on');
    cursor.style.transitionDuration = ms + 'ms';
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    return area;
  }
  function esconderCursor() { cursor.classList.remove('on'); clearTimeout(cursorTimer); }

  return {
    no, mostrar, naTela, limpar, humor, proximaFoto, moverCursor, esconderCursor, dica,
    tem: (id) => ativos.has(id),
    rotuloDe: (id) => (MOD[id] ? MOD[id].rotulo : id),
    btLimpar,
  };
}

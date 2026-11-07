// Tela do "O Hub que Ouve Você": a parede com todos os apps do hub, o perfil que se monta em chips e o pódio "para você".
// A cada pausa da fala vai UMA chamada (jogada "ouvir"): setor, canal e dor + um "este app resolve?" por app. A parede se
// reordena pela chance de cada app (FLIP): os que combinam sobem e crescem, os outros esmaecem.

const TAM = { xl: [3, 3], l: [2, 2], s: [1, 1] };   // colunas × linhas de cada tamanho de cartão
const GAP = 5;
const RECOMECAR = /(comecar de novo|recomeca(r)?|apaga(r)? tudo)\W*$/;

// como cada setor chama o cliente e o negócio, e o canal "no WhatsApp", "no e-mail"… (textos nossos)
const ARTIGO = { paciente: 'o paciente', cliente: 'o cliente', aluno: 'o aluno', seguidor: 'o seguidor', 'usuário': 'o usuário', 'hóspede': 'o hóspede', 'você': 'o cliente' };
const SEU = {
  saude: 'a sua clínica', beleza: 'o seu salão', moda: 'a sua loja', varejo: 'a sua loja', comida: 'o seu restaurante', contabil: 'o seu escritório',
  juridico: 'o seu escritório', imoveis: 'a sua imobiliária', educacao: 'a sua escola', fitness: 'a sua academia', servicos: 'o seu negócio',
  transporte: 'a sua empresa', marketing: 'a sua agência', criador: 'o seu canal', software: 'o seu software', consultoria: 'a sua consultoria',
  pet: 'o seu pet shop', turismo: 'a sua hospedagem', financas: 'a sua empresa', industria: 'a sua empresa', eventos: 'os seus eventos', outro: 'o seu negócio',
};
const NO_CANAL = { whatsapp: 'no WhatsApp', telefone: 'no telefone', email: 'no e-mail', presencial: 'no balcão', site: 'no site', redes: 'nas redes sociais', reuniao: 'nas reuniões' };

// frase do pódio, por dor (o Jev só escolhe a dor; o texto é nosso)
const FRASE = {
  atendimento: (c) => `Para responder ${c.o}${c.no ? ' ' + c.no : ''} sem demora e sem erro`,
  some: (c) => `Para ${c.o} que some sem avisar`,
  cobranca: (c) => `Para ${c.o} que atrasa o pagamento`,
  excesso: (c) => (c.canal === 'email' ? 'Para quem se afoga em e-mail' : `Para quem se afoga em mensagens${c.no ? ' ' + c.no : ''}`),
  golpe: () => 'Para barrar golpe e fraude antes do prejuízo',
  preco: () => 'Para o orçamento sair na hora',
  dados: () => 'Para pôr ordem nos seus dados e documentos',
  conteudo: () => 'Para ter conteúdo sem passar o dia editando',
  vendas: () => 'Para vender mais sem perder lead bom',
  agentes: () => 'Para o seu agente de IA não fazer besteira',
  ensino: () => 'Para ensinar e corrigir em menos tempo',
  agenda: () => 'Para as reuniões pararem de engolir o seu dia',
  outro: () => 'Os que mais combinam com o que você contou',
};

// o ícone do setor fica mais certeiro com a palavra que a pessoa disse ("odontológica" → 🦷)
const ICONE_FALA = [
  ['saude', /odonto|dentist|dente/, '🦷'], ['saude', /psicolog|terapeuta/, '🧠'], ['saude', /fisioterap/, '🦴'],
  ['comida', /hamburg/, '🍔'], ['comida', /padaria/, '🥖'], ['comida', /sushi|japones/, '🍣'], ['comida', /cafeteria/, '☕'], ['comida', /doceria|confeitaria/, '🧁'],
  ['beleza', /barbearia|barbeiro/, '💈'], ['beleza', /manicure|unha/, '💅'],
  ['moda', /calcado|sapato|tenis/, '👟'], ['criador', /youtube/, '▶️'], ['criador', /podcast/, '🎙️'],
  ['educacao', /ingles|idioma|espanhol/, '🗣️'], ['transporte', /mudanca/, '📦'], ['pet', /veterin/, '🐶'],
];

const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const palavras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep } = ui;
  const L = spec.limiar;
  const NO_HUB = /^jev\./.test(location.hostname);
  const HOSPEDADO = !!window.MJ_HOSTED;
  const perguntar = api.ultima();
  const SET = Object.fromEntries(spec.setores.map((o) => [o.id, o]));
  const CAN = Object.fromEntries(spec.canais.map((o) => [o.id, o]));
  const DOR = Object.fromEntries(spec.dores.map((o) => [o.id, o]));

  // ---------- estado ----------
  let ativo = false;          // já chegou alguma resposta nesta rodada
  let emVoo = 0;              // chamadas em andamento (a demonstração espera)
  let textoAtual = '';
  let rodada = 0;             // muda a cada "recomeçar": respostas de rodadas velhas são ignoradas
  let perfil = { setor: null, canal: null, dor: null };
  let podioIds = [];
  let soltou = false;         // a próxima resposta começa um perfil novo (depois da demonstração)

  // ---------- links e miniaturas (montados a partir do endereço da página; nada de domínio no arquivo) ----------
  // no Kit Jev, só leva aos apps instalados nesta VPS (catálogo dos modelos + cartões do hub)
  let INSTALADOS = null;
  if (window.MJ_KIT) Promise.all([fetch(api.url('../catalogo.json')).then((r) => r.json()).catch(() => null), fetch('/demos.json').then((r) => r.json()).catch(() => null)])
    .then(([c, d]) => { if (c && Array.isArray(d)) INSTALADOS = new Set([...(c.apps || []).map((x) => x.id), ...d.map((x) => x.id)]); });
  function linksDe(a) {
    if (a.link) return { abrir: a.link, baixar: a.baixar || null };
    if (INSTALADOS && !INSTALADOS.has(a.id)) return { nota: 'não instalado nesta VPS' };
    if (a.tipo === 'sob-medida') return NO_HUB && a.sub ? { abrir: `https://${a.sub}.${location.hostname.replace(/^jev\./, '')}`, nota: 'sob medida' } : { nota: 'abre no hub do Jev' };
    if (HOSPEDADO) return { abrir: api.url(`../${a.id}/`), baixar: window.MJ_KIT ? null : api.url(`../_baixar/${a.id}.zip`) };
    return { nota: 'abre no hub do Jev' };
  }
  function imagemDe(a) {
    if (a.imagem) return api.url(a.imagem);
    if (a.tipo === 'sob-medida') return NO_HUB ? `/shots/${a.id}.jpg` : null;
    return HOSPEDADO ? api.url(`../_shots/${a.id}.jpg`) : null;
  }

  // ---------- tela ----------
  const raiz = el('div', { class: 'ms' });
  const chips = {};
  const slots = el('div', { class: 'ms-chips', role: 'list', 'aria-label': 'O seu perfil, montado pelo Jev' });
  for (const [k, vazio] of [['setor', 'o negócio?'], ['canal', 'o canal?'], ['dor', 'o problema?']]) {
    const c = el('span', { class: 'ms-chip vazio', role: 'listitem', 'data-k': k });
    c.dataset.vazio = vazio;
    chips[k] = c; slots.append(c);
    esvaziarChip(c);
  }
  const btRecomecar = el('button', { class: 'ms-bt ms-recomecar', type: 'button', title: 'Esquecer o que foi dito e contar outro negócio', onclick: () => novaRodada(true) }, [el('span', { 'aria-hidden': 'true', text: '↺' }), el('span', { class: 'tx', text: 'Recomeçar' })]);
  const perfilNo = el('header', { class: 'ms-perfil' }, [el('span', { class: 'ms-rot', text: 'Seu negócio' }), slots]);

  const parede = el('div', { class: 'ms-parede', role: 'group', 'aria-label': 'Todos os apps do hub, do que mais combina para o que menos combina' });
  const paredeWrap = el('div', { class: 'ms-parede-wrap' }, [parede]);
  const conta = el('p', { class: 'ms-conta' });
  const legenda = el('div', { class: 'ms-legenda' }, [el('div', { class: 'ms-fita' }, [api.fita.no]), conta]);

  const frase = el('h2', { class: 'ms-frase', 'aria-live': 'polite' });
  const podio = el('ol', { class: 'ms-podio', 'aria-label': 'Os 3 apps que mais combinam com o que você contou' });
  const espera = el('p', { class: 'ms-espera', text: 'Ouvindo… os apps que resolvem sobem para cá assim que você contar o problema.' });
  const perto = el('ol', { class: 'ms-perto', 'aria-label': 'Por enquanto, os mais perto' });
  const convite = el('div', { class: 'ms-convite' });
  const dir = el('aside', { class: 'ms-dir' }, [el('header', { class: 'ms-podio-cab' }, [el('div', { class: 'ms-podio-l1' }, [el('span', { class: 'ms-rot', text: 'Para você' }), btRecomecar]), frase]), podio, espera, perto, convite]);

  const barra = api.voz.barraVoz({
    exemplos: [
      { rotulo: '🦷 clínica', texto: 'Tenho uma clínica odontológica. Os pacientes marcam pelo WhatsApp e depois não aparecem.' },
      { rotulo: '👗 loja no Instagram', texto: 'Tenho uma loja de roupa e vendo pelo Instagram. Chega muita mensagem perguntando preço e tamanho.' },
      { rotulo: '🧾 contador', texto: 'Sou contador e recebo centenas de e-mails de cliente por dia, com nota fiscal e extrato.' },
      { rotulo: '🎬 youtuber', texto: 'Sou criador de conteúdo no YouTube e não tenho tempo de tirar os cortes nem de ler os comentários.' },
      { rotulo: '💻 dev com agentes', texto: 'Sou programador e uso o Claude Code. Tenho medo do agente apagar meus arquivos e de gastar demais com tokens.' },
      { rotulo: '🍕 pizzaria', texto: 'Tenho uma pizzaria e os pedidos chegam pelo WhatsApp. É uma bagunça e a gente erra o pedido.' },
    ],
    dica: 'Aperte o microfone e conte o seu negócio e o seu problema',
    placeholder: 'Ou digite e aperte Enter',
    onPausa: (texto) => aoFalar(texto),
    onTexto: () => { linhaVoz.scrollTop = linhaVoz.scrollHeight; },
  });
  const linhaVoz = barra.no.querySelector('.mj-voz-linha');
  // cada exemplo é um negócio inteiro: começa uma rodada nova antes de "falar" (captura: roda antes do clique do exemplo)
  barra.no.addEventListener('click', (e) => { if (e.target.closest('.mj-voz-ex')) novaRodada(false); }, true);

  const esq = el('div', { class: 'ms-esq' }, [perfilNo, paredeWrap, legenda, el('div', { class: 'ms-voz' }, [barra.no])]);
  raiz.append(esq, dir);
  area.append(raiz);

  // ---------- os cartões da parede ----------
  const tiles = new Map();
  for (const a of spec.catalogo) {
    const img = imagemDe(a);
    const no = el('button', { class: 'ms-t' + (img ? '' : ' sem-img'), type: 'button', title: a.titulo, 'aria-label': a.titulo, onclick: () => detalhe(a.id) });
    const corpo = el('span', { class: 'ms-t-corpo' });
    if (img) {
      const im = el('img', { src: img, alt: '', decoding: 'async', draggable: 'false' });
      im.addEventListener('error', () => { im.remove(); no.classList.add('sem-img'); corpo.prepend(emojiDe(a)); }, { once: true });
      corpo.append(im);
    } else corpo.append(emojiDe(a));
    corpo.append(el('span', { class: 'ms-t-tit', 'aria-hidden': 'true', text: a.titulo }));
    no.append(corpo, el('span', { class: 'ms-t-n', 'aria-hidden': 'true' }), el('span', { class: 'ms-t-pc mj-num', 'aria-hidden': 'true' }));
    tiles.set(a.id, { a, no, p: null, tam: 's', rank: a.n, chave: spec.chaveDe(a.id) });
    parede.append(no);
  }
  function emojiDe(a) { return el('span', { class: 'ms-t-emo', 'aria-hidden': 'true', text: a.emoji || '⚡' }); }
  const nApps = tiles.size;
  conta.textContent = `${nApps} apps julgados a cada pausa, numa chamada só`;

  // ---------- geometria da parede: o maior cartão que faz todos caberem na área ----------
  function geometria() {
    const W = paredeWrap.clientWidth, H = paredeWrap.clientHeight;
    if (!W) return;
    const celulas = [...tiles.values()].reduce((s, t) => s + TAM[t.tam][0] * TAM[t.tam][1], 0);
    const rolavel = matchMedia('(max-width: 760px), (max-height: 540px)').matches || H < 150;
    const aplicar = (cols, ch) => {
      parede.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      parede.style.gridAutoRows = `${Math.max(14, Math.floor(ch))}px`;
    };
    if (rolavel) {
      const cols = Math.max(6, Math.round(W / 56));
      aplicar(cols, ((W - (cols - 1) * GAP) / cols) * 0.74);
      return;
    }
    for (let folga = 0; folga < 4; folga++) {
      let melhor = null;
      for (let c = 6; c <= 44; c++) {
        const cw = (W - (c - 1) * GAP) / c;
        const linhas = Math.ceil(celulas / c) + folga;
        const h = (H - (linhas - 1) * GAP) / linhas;
        if (cw < 20 || h < 14) continue;
        const nota = Math.abs(Math.log(cw / h / 1.42));
        if (!melhor || nota < melhor.nota) melhor = { c, h, nota };
      }
      if (!melhor) break;
      aplicar(melhor.c, melhor.h);
      // o "dense" quase nunca deixa buraco; se mesmo assim passar da área, tenta com uma linha de folga
      if (parede.offsetHeight <= H + 2) break;
    }
  }
  new ResizeObserver(() => geometria()).observe(paredeWrap);

  // ---------- desenhar: ordem, tamanhos e o FLIP ----------
  // o pódio só abre quando já dá para arriscar: a pessoa disse o problema (ou um app passou de 60%) e falou o bastante
  function podioLiberado() {
    if (palavras(textoAtual) < L.minimoPalavras) return false;
    if (perfil.dor) return true;
    return [...tiles.values()].some((t) => t.p != null && t.p >= L.forte);
  }
  const chaveOrdem = (t) => (t.p == null ? -1 : t.p >= L.combina ? 1 + t.p : Math.round(t.p * 20) / 20);
  const pct = (p) => (p >= 0.995 ? '99%' : p < 0.01 ? '<1%' : fmt.pct(p));

  function desenharParede({ animar = true } = {}) {
    const mexe = animar && !ui.reduzMovimento;
    const antes = new Map();
    if (mexe) for (const t of tiles.values()) antes.set(t.no, t.no.getBoundingClientRect());
    for (const t of tiles.values()) t.no.getAnimations().forEach((x) => x.cancel());

    // ordem: quem combina vai na frente, pela chance exata (a mesma ordem do pódio); o resto em degraus de 5%, para a
    // parede não tremer à toa, e no empate quem já estava na frente fica
    const lista = [...tiles.values()];
    if (ativo) lista.sort((x, y) => (chaveOrdem(y) - chaveOrdem(x)) || (x.rank - y.rank));
    else lista.sort((x, y) => x.a.n - y.a.n);
    const podioComNumero = podioLiberado();
    // enquanto nada combina (a pessoa ainda não contou o problema), a parede esmaece de leve, sem apagar
    const algumCombina = lista.some((t) => t.p != null && t.p >= L.combina);
    const piso = algumCombina ? 0.26 : 0.55, cinzaMax = algumCombina ? 1 : 0.6;
    lista.forEach((t, i) => {
      const p = t.p;
      const tam = !ativo || p == null ? 's' : i < 3 && p >= L.podio ? 'xl' : i < 9 && p >= L.combina ? 'l' : 's';
      t.tam = tam; t.rank = i;
      const no = t.no;
      no.style.order = String(i);
      no.dataset.tam = tam;
      no.style.gridColumn = `span ${TAM[tam][0]}`;
      no.style.gridRow = `span ${TAM[tam][1]}`;
      // quem não combina esmaece e perde a cor; quem combina fica em cor e com contorno
      const op = !ativo ? 1 : p == null ? 0.5 : Math.min(1, Math.max(piso, 0.26 + (p - 0.08) * 2.6));
      const cinza = !ativo || p == null ? 0 : Math.min(cinzaMax, Math.max(0, 1 - (p - 0.1) * 3.4));
      no.style.setProperty('--op', op.toFixed(3));
      no.style.setProperty('--cinza', cinza.toFixed(3));
      no.classList.toggle('combina', ativo && p != null && p >= L.combina);
      no.querySelector('.ms-t-n').textContent = podioComNumero && i < 3 && p != null && p >= L.combina ? String(i + 1) : '';
      no.querySelector('.ms-t-pc').textContent = ativo && p != null && tam !== 's' ? pct(p) : '';
      no.setAttribute('aria-label', ativo && p != null ? `${t.a.titulo}: ${pct(p)} de chance de resolver` : t.a.titulo);
    });
    geometria();
    if (!mexe) return;
    lista.forEach((t, i) => {
      const a = antes.get(t.no); if (!a) return;
      const b = t.no.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      t.no.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }],
        { duration: 620, delay: Math.min(i * 5, 260), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  }

  // ---------- o perfil em chips ----------
  function contexto() {
    const s = perfil.setor && SET[perfil.setor];
    return { o: ARTIGO[(s && s.cliente) || 'cliente'] || 'o cliente', no: NO_CANAL[perfil.canal] || '', canal: perfil.canal };
  }
  function rotuloChip(k, id) {
    if (k === 'setor') {
      const t = semAcento(textoAtual);
      const extra = ICONE_FALA.find(([s, re]) => s === id && re.test(t));
      return [extra ? extra[2] : SET[id].icone, SET[id].rotulo];
    }
    if (k === 'canal') return [CAN[id].icone, CAN[id].rotulo];
    return [DOR[id].icone, DOR[id].rotulo.replace('{cliente}', contexto().o.replace(/^o /, ''))];
  }
  function lerEscolha(r) {
    if (!r || !r.probabilities) return { id: null, p: 0 };
    const [id, p] = Object.entries(r.probabilities).sort((a, b) => b[1] - a[1])[0];
    return { id, p };
  }
  function atualizarPerfil(r) {
    let virou = false;
    for (const k of ['setor', 'canal', 'dor']) {
      const { id, p } = lerEscolha(r[k]);
      const c = chips[k];
      const valido = id && id !== 'nao_disse' && p >= 0.5;
      if (valido && id !== perfil[k]) {
        if (k === 'setor' && perfil.setor) virou = true;
        perfil[k] = id;
        carimbar(c, ...rotuloChip(k, id), p);
      } else if (valido) {
        c.style.setProperty('--conf', p.toFixed(3));
        c.classList.remove('riscado');
      } else if (k === 'setor' && perfil.setor && id === 'nao_disse' && p >= 0.7) {
        c.classList.add('riscado');   // "não é clínica…" antes de dizer o que é: o chip fica riscado, esperando a correção
      }
    }
    // a dor depende do setor ("paciente que some" × "cliente que some"): reescreve quando o setor muda
    if (virou && perfil.dor) { const tx = chips.dor.querySelector('.ms-chip-in:not(.sai) .tx'); if (tx) tx.textContent = rotuloChip('dor', perfil.dor)[1]; }
    if (virou) mostrarVirada();
  }
  function esvaziarChip(c) {
    c.className = 'ms-chip vazio';
    c.replaceChildren(el('span', { class: 'ms-chip-in' }, [el('span', { class: 'tx', text: c.dataset.vazio })]));
  }
  function carimbar(c, icone, texto, p) {
    const velho = c.querySelector('.ms-chip-in:not(.sai)');
    if (velho && !c.classList.contains('vazio')) { velho.classList.add('sai'); setTimeout(() => velho.remove(), 560); } else if (velho) velho.remove();
    c.append(el('span', { class: 'ms-chip-in entra' }, [el('span', { class: 'ic', 'aria-hidden': 'true', text: icone }), el('span', { class: 'tx', text: texto })]));
    c.classList.remove('vazio', 'riscado');
    c.style.setProperty('--conf', p.toFixed(3));
    som.pop();
  }
  let tVirada = null;
  function mostrarVirada() {
    som.whoosh();
    chips.setor.querySelectorAll('.ms-selo').forEach((x) => x.remove());
    const selo = el('span', { class: 'ms-selo', 'aria-hidden': 'true', text: '↻ mudou de ideia' });
    chips.setor.append(selo);
    clearTimeout(tVirada); tVirada = setTimeout(() => selo.remove(), 3400);
  }

  // ---------- o pódio ----------
  function textoDaFrase() {
    if (perfil.dor && FRASE[perfil.dor]) return FRASE[perfil.dor](contexto());
    if (perfil.setor === 'pessoal') return 'Entendi. E o que você quer resolver?';
    if (perfil.setor) return `Já entendi: ${SEU[perfil.setor] || 'o seu negócio'}. E o problema?`;
    return 'Conte o que você faz e o que quer resolver';
  }
  function desenharPodio() {
    const lista = [...tiles.values()].filter((t) => t.p != null).sort((x, y) => (y.p - x.p) || (x.a.n - y.a.n));
    const top = podioLiberado() ? lista.filter((t) => t.p >= L.combina).slice(0, 3) : [];
    const f = textoDaFrase();
    if (frase.textContent !== f) { frase.textContent = f; frase.classList.remove('troca'); void frase.offsetWidth; frase.classList.add('troca'); }
    raiz.classList.toggle('com-podio', top.length > 0);

    const ids = top.map((t) => t.a.id);
    if (ids[0] && ids[0] !== podioIds[0]) som.ding();
    // FLIP dentro do pódio: quem já estava desliza para o lugar novo; quem chega entra deslizando
    const antes = new Map([...podio.querySelectorAll('.ms-card[data-id]')].map((n) => [n.dataset.id, n.getBoundingClientRect()]));
    const nos = new Map([...podio.querySelectorAll('.ms-card[data-id]')].map((n) => [n.dataset.id, n]));
    podio.querySelectorAll('.vaga').forEach((v) => v.remove());
    for (const [id, n] of nos) if (!ids.includes(id)) { n.remove(); nos.delete(id); }
    top.forEach((t, i) => {
      let n = nos.get(t.a.id);
      if (!n) { n = cartaoPodio(t.a); n.classList.add('entra'); }
      podio.append(n);
      n.querySelector('.ms-card-n').textContent = String(i + 1);
      n.style.setProperty('--p', t.p.toFixed(3));
      n.querySelector('.ms-card-pc').textContent = pct(t.p);
      n.classList.toggle('talvez', t.p < L.podio);
    });
    if (top.length) for (let i = top.length; i < 3; i++) podio.append(el('li', { class: 'ms-card vaga', 'aria-hidden': 'true' }, [el('span', { class: 'ms-card-n', text: String(i + 1) }), el('p', { class: 'ms-vaga-tx', text: 'Conte mais um detalhe e outro app aparece aqui.' })]));
    if (!ui.reduzMovimento) for (const n of podio.querySelectorAll('.ms-card[data-id]')) {
      const a = antes.get(n.dataset.id); if (!a) continue;
      const dy = a.top - n.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    podioIds = ids;
    ajustarLinhas();
    // sem ninguém no pódio ainda: os 5 mais perto, em cinza, para a coluna reagir a cada pausa
    const quase = top.length ? [] : lista.slice(0, 5).filter((t) => t.p >= 0.05);
    perto.replaceChildren(...quase.map((t) => el('li', {}, [el('span', { class: 'emo', 'aria-hidden': 'true', text: t.a.emoji || '⚡' }), el('span', { class: 'nm', text: t.a.titulo }), el('b', { class: 'mj-num', text: pct(t.p) })])));
    if (quase.length) perto.prepend(el('li', { class: 'ms-perto-t', text: 'Por enquanto, os mais perto:' }));
  }
  // o "por que este" usa as linhas que cabem no cartão (o cartão muda de altura com a janela)
  function ajustarLinhas() {
    const celular = matchMedia('(max-width: 760px)').matches;
    for (const p of podio.querySelectorAll('.ms-card-por')) {
      if (celular) { p.style.webkitLineClamp = '3'; p.style.alignSelf = 'start'; continue; }
      p.style.webkitLineClamp = 'none'; p.style.alignSelf = 'stretch';
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 24;
      const n = Math.max(1, Math.floor((p.clientHeight + 2) / lh));
      p.style.webkitLineClamp = String(n); p.style.alignSelf = 'start';
    }
  }
  new ResizeObserver(() => ajustarLinhas()).observe(podio);

  function botoes(a) {
    const l = linksDe(a);
    const out = [];
    if (l.abrir) out.push(el('a', { class: 'ms-bt tinta', href: l.abrir, target: '_blank', rel: 'noopener', 'aria-label': `Abrir ${a.titulo}` }, ['Abrir', el('span', { 'aria-hidden': 'true', text: '↗' })]));
    if (l.baixar) out.push(el('a', { class: 'ms-bt', href: l.baixar, download: `${a.id}.zip`, 'aria-label': `Baixar ${a.titulo}` }, ['Baixar', el('span', { 'aria-hidden': 'true', text: '⬇' })]));
    if (l.nota) out.push(el('span', { class: 'ms-nota', text: l.nota }));
    return out;
  }

  function cartaoPodio(a) {
    // a miniatura só aparece em telas altas (CSS); sem miniatura, o emoji no papel hachurado
    const src = imagemDe(a);
    const fig = el('span', { class: 'ms-card-img' + (src ? '' : ' sem-img'), 'aria-hidden': 'true' });
    if (src) {
      const im = el('img', { src, alt: '', decoding: 'async' });
      im.addEventListener('error', () => { im.remove(); fig.classList.add('sem-img'); fig.append(el('span', { class: 'ms-t-emo', text: a.emoji || '⚡' })); }, { once: true });
      fig.append(im);
    } else fig.append(el('span', { class: 'ms-t-emo', text: a.emoji || '⚡' }));
    return el('li', { class: 'ms-card', 'data-id': a.id }, [fig,
      el('span', { class: 'ms-card-n', 'aria-hidden': 'true' }),
      el('h3', { class: 'ms-card-tit' }, [el('span', { class: 'emo', 'aria-hidden': 'true', text: a.emoji || '⚡' }), el('span', { text: a.titulo })]),
      el('p', { class: 'ms-card-por' }, [el('b', { text: 'Por que este: ' }), a.resumo]),
      el('div', { class: 'ms-card-pe' }, [
        el('span', { class: 'ms-card-barra', 'aria-hidden': 'true' }, [el('i')]),
        el('b', { class: 'ms-card-pc mj-num', title: 'Chance de este app resolver o que você contou, segundo o Jev' }),
        el('span', { class: 'ms-card-bts' }, botoes(a)),
      ]),
    ]);
  }

  // detalhe de qualquer cartão da parede
  function detalhe(id) {
    const t = tiles.get(id); if (!t) return;
    const a = t.a;
    const img = imagemDe(a);
    const box = el('div', { class: 'ms-detalhe' }, [
      img && !t.no.classList.contains('sem-img') ? el('img', { class: 'ms-detalhe-img', src: img, alt: '' }) : el('div', { class: 'ms-detalhe-emo', 'aria-hidden': 'true', text: a.emoji || '⚡' }),
      el('p', { class: 'ms-detalhe-tx', text: a.resumo }),
      t.p != null && ativo ? el('p', { class: 'ms-detalhe-pc', html: `<b class="mj-num">${pct(t.p)}</b> de chance de resolver o que você contou` }) : null,
      el('div', { class: 'ms-detalhe-bts' }, botoes(a)),
    ]);
    ui.modal(`${a.emoji || ''} ${a.titulo}`.trim(), box);
  }

  // ---------- convite (antes de a pessoa falar) ----------
  const IDEIAS = [
    ['🦷', 'Tenho uma clínica e o paciente marca e falta.', 'Tenho uma clínica odontológica. Os pacientes marcam pelo WhatsApp e depois não aparecem.'],
    ['🧾', 'Sou contador e me afogo em e-mail.', 'Sou contador e recebo centenas de e-mails de cliente por dia, com nota fiscal e extrato.'],
    ['💻', 'Uso agentes de IA e tenho medo do que eles fazem.', 'Sou programador e uso o Claude Code. Tenho medo do agente apagar meus arquivos e de gastar demais com tokens.'],
  ];
  convite.append(
    el('p', { class: 'ms-convite-t', html: 'Conte o seu<br>negócio' }),
    el('p', { class: 'ms-convite-tx', text: `E o problema que você quer resolver, em voz alta. Os ${nApps} apps do hub se reorganizam enquanto você fala, e o certo sobe para o topo.` }),
    el('ul', { class: 'ms-ideias', 'aria-label': 'Experimente dizer' }, IDEIAS.map(([ic, curto, texto]) => el('li', {}, [
      el('button', { class: 'ms-ideia', type: 'button', onclick: () => { novaRodada(false); barra.simular(texto).catch(() => {}); } }, [el('span', { class: 'ic', 'aria-hidden': 'true', text: ic }), el('span', { text: `«${curto}»` })]),
    ]))),
  );

  // ---------- conversa com o Jev ----------
  async function aoFalar(texto) {
    if (RECOMECAR.test(semAcento(texto).slice(-40))) { novaRodada(true); return; }
    if (palavras(texto) < 2) return;
    textoAtual = texto;
    const minha = rodada;
    emVoo++;
    paredeWrap.classList.add('lendo');   // a varredura na parede: o Jev está lendo os apps
    let r;
    try { r = await perguntar('ouvir', { texto }, `"${texto.slice(-40)}"`); } catch { r = null; } finally {
      emVoo--;
      if (!emVoo) paredeWrap.classList.remove('lendo');
    }
    if (!r || minha !== rodada) return;
    aplicar(r);
  }

  function aplicar(r) {
    if (soltou) { soltou = false; perfil = { setor: null, canal: null, dor: null }; for (const c of Object.values(chips)) esvaziarChip(c); }
    ativo = true;
    raiz.classList.add('ativo');
    for (const t of tiles.values()) {
      const a = r[t.chave];
      t.p = a && typeof a.noul === 'number' ? a.noul : null;
    }
    atualizarPerfil(r);
    desenharParede();
    desenharPodio();
  }

  // a demonstração acabou: a tela fica como está, mas a próxima fala começa um negócio novo
  function soltarTexto() { rodada++; soltou = true; barra.limpar(); textoAtual = ''; }

  function novaRodada(comSom) {
    rodada++; soltou = false;
    barra.limpar();
    textoAtual = ''; ativo = false; podioIds = [];
    perfil = { setor: null, canal: null, dor: null };
    raiz.classList.remove('ativo', 'com-podio');
    for (const t of tiles.values()) t.p = null;
    for (const c of Object.values(chips)) esvaziarChip(c);
    podio.replaceChildren(); perto.replaceChildren();
    frase.textContent = '';
    desenharParede();
    if (comSom) som.tique();
  }

  desenharParede({ animar: false });

  // ---------- demonstração: dois negócios falados, com uma correção no meio ----------
  const ROTEIRO = [
    { fala: 'Eu tenho uma clínica odontológica aqui no centro.', depois: 700 },
    { fala: 'Os pacientes marcam pelo WhatsApp, e depois simplesmente não aparecem.', depois: 2600 },
    { fala: 'Não, pera. Na verdade não é clínica, é uma loja de roupa feminina.', depois: 900 },
    { fala: 'Eu vendo pelo Instagram, e chega mensagem demais perguntando preço e tamanho.', depois: 3000 },
    { novo: true },
    { fala: 'Agora outro negócio: eu tenho um escritório de contabilidade.', depois: 700 },
    { fala: 'Recebo centenas de e-mails de cliente por dia, e eu tô afogado.', depois: 3400 },
  ];
  async function esperarJev(sinal) {
    await sleep(140, sinal);
    for (let i = 0; i < 40 && emVoo > 0; i++) await sleep(100, sinal);
  }
  async function tocar(sinal) {
    novaRodada(false);
    try {
      await sleep(700, sinal);
      for (const passo of ROTEIRO) {
        if (passo.novo) { await sleep(400, sinal); novaRodada(true); await sleep(1100, sinal); continue; }
        await barra.simular(passo.fala, { sinal });
        await esperarJev(sinal);
        await sleep(passo.depois, sinal);
      }
    } finally { soltarTexto(); }   // acabou (ou apertaram Parar): a próxima fala da pessoa começa um negócio novo
  }

  return { tocar };
}

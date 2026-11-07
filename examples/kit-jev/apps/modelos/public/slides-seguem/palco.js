// Tela do "Slides que Seguem a Sua Fala": um Keynote que ouve. A cada pausa da fala vai UMA chamada (jogada "ouvir"):
// de qual slide você está falando, se você pediu "próximo" / "volta um" / "slide 5", e quais tópicos você já cobriu.
// Regra da troca (medida com o Jev): pedido específico (começo, resumo, "slide 5") > assunto de outro slide com
// confiança ≥ limiar.slide > "próximo" / "volta um". Conversa solta cai em "manter" e o slide fica.

const LARG = 1600;               // o slide é desenhado em 1600×900 e escalado inteiro, como num Keynote
const JANELA = 24;               // palavras da "fala recente" (desde a última troca): decide o slide e o pedido
const NO_SLIDE = 110;            // palavras que contam para os tópicos do slide atual
const SALTO = 30;                // ao pular por assunto, as últimas palavras já contam para o slide novo
const INTERVALO = 600;           // no mínimo 600 ms entre chamadas (uma por vez)
const CHAVE_DECK = 'slides-seguem:deck', CHAVE_MD = 'slides-seguem:meu-deck';
const ICONES = ['🎯', '💡', '🚀', '🧭', '📈', '🧩', '🔑', '✨', '📌', '🛠️', '🌱'];

const EXEMPLO_MD = `# 🚀 Meu produto em 3 minutos
- O problema que a gente resolve
- Para quem é
- O que muda na prática

# ⚙️ Como funciona
- Você se cadastra em 1 minuto
- Conecta a sua planilha
- Recebe o relatório toda segunda

# 💰 Quanto custa
- Plano grátis para testar
- Plano completo por mês
- Cancele quando quiser

# ✅ Resumo
- Problema, solução e preço
- Próximo passo: testar grátis`;

// falas de exemplo (passam pelo mesmo caminho do microfone), por deck
const EXEMPLOS = {
  'erros-ia': [
    { rotulo: '🔒 pular para os dados', texto: 'Ah, e tem gente que cola o contrato do cliente inteiro no chat, com CPF e tudo!' },
    { rotulo: '😄 piada (fica)', texto: 'Gente, juro que esse slide não fui eu que fiz com IA, tá? Kkkk.' },
    { rotulo: '⏭️ próximo', texto: 'Beleza, próximo.' },
    { rotulo: '⏪ volta lá no começo', texto: 'Voltando lá no começo: quase todo mundo já testou, né?' },
    { rotulo: '⏩ vamos pro resumo', texto: 'Então, pra fechar, vamos pro resumo.' },
  ],
  'whatsapp-ia': [
    { rotulo: '🪃 o cliente que sumiu', texto: 'E aquele cliente que perguntou o preço e sumiu? Dá pra chamar de novo depois de uns dois dias.' },
    { rotulo: '😄 piada (fica)', texto: 'Gente, eu ensaiei essa palestra pro meu gato ontem e ele dormiu no segundo slide, tá? Kkk.' },
    { rotulo: '⏭️ pode passar', texto: 'Pode passar.' },
    { rotulo: '⏮️ volta um', texto: 'Volta um.' },
    { rotulo: '⏩ vamos pro resumo', texto: 'Vamos pro resumo.' },
  ],
  proprio: [
    { rotulo: '⏭️ próximo', texto: 'Beleza, próximo.' },
    { rotulo: '⏮️ volta um', texto: 'Volta um.' },
    { rotulo: '⏪ volta lá no começo', texto: 'Voltando lá no começo.' },
    { rotulo: '⏩ vamos pro resumo', texto: 'Então, pra fechar, vamos pro resumo.' },
  ],
};

// a demonstração do ▶ (medida com o Jev: a piada e o "deixa eu ver" ficam; o contrato pula para o slide 5)
const DEMO = [
  'Bom dia, gente! Hoje eu vou falar de IA no trabalho.',
  'Quem aqui já usou? Pois é, quase todo mundo, né?',
  'Mas usar de verdade, todo dia, pouca gente usa.',
  'Bom, próximo.',
  'O primeiro erro é pedir sem contexto: a pessoa escreve só "faz um e-mail pro cliente" e pronto.',
  'Só que a IA não sabe quem é o seu cliente, nem o tom que você quer.',
  'Gente, juro que esse slide não fui eu que fiz com IA, tá? Kkkk.',
  'Deixa eu ver… onde é que eu tava.',
  'Ah, e uma coisa que me dá arrepio: tem gente que cola o contrato do cliente inteiro no chat, com CPF e tudo!',
  'Isso não pode, viu? Troca o nome do cliente por um apelido.',
  'Voltando lá no começo: eu falei que quase todo mundo já testou, né?',
  'Então, pra fechar, vamos pro resumo.',
  'Resumindo: contexto e exemplo sempre, revisa antes de mandar, nada de dado sigiloso e vai com calma, uma coisa de cada vez.',
];

const PEDIDO_TXT = {
  avancar: ['⏭️', 'Você pediu: próximo slide'], voltar: ['⏮️', 'Você pediu: voltar um'],
  inicio: ['⏪', 'Você pediu: o começo'], resumo: ['⏩', 'Você pediu: o resumo'], nenhum: ['🗣️', 'Nenhum pedido'],
};
const PEDIDO_CURTO = { avancar: 'próximo', voltar: 'voltar um', inicio: 'começo', resumo: 'resumo', nenhum: 'nenhum' };
const PEDIU = { avancar: 'Pediu o próximo', voltar: 'Pediu para voltar um', inicio: 'Pediu o começo', resumo: 'Pediu o resumo' };

const palavras = (t) => String(t || '').split(/\s+/).filter(Boolean);
const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: só não lembra */ } };

// "# título" abre um slide, "- tópico" (ou *, •, 1.) é um tópico; um emoji no começo do título vira o desenho do slide
export function lerMarkdown(md) {
  const slides = [];
  let s = null;
  for (const bruta of String(md || '').split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    let m = linha.match(/^#{1,6}\s*(.*)$/);
    if (m) { s = { titulo: m[1].trim(), topicos: [] }; slides.push(s); continue; }
    m = linha.match(/^(?:[-*•+]|\d+[.)])\s+(.*)$/);
    const texto = (m ? m[1] : linha).trim();
    if (!texto) continue;
    if (!s) { s = { titulo: texto, topicos: [] }; slides.push(s); continue; }
    s.topicos.push(texto);
  }
  const corta = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
  return slides.filter((x) => x.titulo).slice(0, 12).map((x) => {
    const em = x.titulo.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u);
    return { titulo: corta(em ? x.titulo.slice(em[0].length) : x.titulo, 90) || 'Slide', emoji: em ? em[1] : null, topicos: x.topicos.slice(0, 5).map((t) => corta(t, 100)) };
  });
}

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep, toast, modal } = ui;
  const L = spec.limiar;
  const DECKS = spec.decks;

  // ---------- estado ----------
  let deck = null;              // { id, titulo, curto, emoji, slides: [{ titulo, kicker, emoji, topicos }] }
  let atual = 0;                // slide na tela
  let acesos = [];              // por slide: Set dos tópicos já falados (ficam acesos)
  let visitas = [];             // por slide: quantas palavras foram ditas nele
  let corte = 0;                // palavra onde começa a "fala recente" (andou a cada troca de slide)
  let inicioSlide = 0;          // palavra onde começa a fala do slide atual
  let versao = 0;               // muda a cada troca: resposta que chega atrasada é descartada
  let voando = false, querDeNovo = false, ultimoEnvio = 0, timerEnvio = null, ultimaAssinatura = '';
  let tSelo = null, tFaltou = null;

  // ---------- tela ----------
  const raiz = el('div', { class: 'ss' });
  const cena = el('div', { class: 'ss-cena' });
  const selo = el('div', { class: 'ss-selo', role: 'status' });
  const faltouEl = el('div', { class: 'ss-faltou', role: 'status' });
  const anuncio = el('p', { class: 'ss-anuncio', 'aria-live': 'polite' });
  const btCheia = el('button', { class: 'ss-bt ss-bt-cheia', type: 'button', title: 'Tela cheia (F)', onclick: () => alternarCheia() }, [el('span', { class: 'ic', text: '⛶' }), el('span', { class: 'tx', text: 'Tela cheia' })]);
  const btSair = el('button', { class: 'ss-sair', type: 'button', 'aria-label': 'Sair da tela cheia', title: 'Sair da tela cheia (Esc)', onclick: () => alternarCheia() }, ['✕']);
  const vagaFitaCheia = el('div', { class: 'ss-fita-cheia' });
  const moldura = el('div', { class: 'ss-moldura' }, [cena, selo, faltouEl, vagaFitaCheia, btSair]);
  const caixaSlide = el('div', { class: 'ss-caixa' }, [moldura]);
  const filme = el('div', { class: 'ss-filme', role: 'list', 'aria-label': 'Os slides do deck' });
  const btDecks = el('button', { class: 'ss-bt', type: 'button', title: 'Trocar de deck ou colar o seu', onclick: () => abrirDecks() }, [el('span', { class: 'ic', text: '📚' }), el('span', { class: 'tx', text: 'Decks' })]);
  const btRecomecar = el('button', { class: 'ss-bt', type: 'button', title: 'Recomeçar: volta à capa e apaga os tópicos', 'aria-label': 'Recomeçar', onclick: () => recomecar(true) }, [el('span', { class: 'ic', text: '↺' }), el('span', { class: 'tx', text: 'Recomeçar' })]);
  const rolo = el('div', { class: 'ss-rolo' }, [filme]);
  const esq = el('section', { class: 'ss-esq', 'aria-label': 'Apresentação' }, [caixaSlide, rolo]);

  // painel: o que o Jev está pensando
  const ponto = el('i', { class: 'ss-ponto', 'aria-hidden': 'true' });
  const estadoOuvido = el('span', { class: 'ss-ouve', text: 'Pronto para ouvir' });
  const vagaFita = el('div', { class: 'ss-fita' });
  const probs = el('ol', { class: 'ss-probs', 'aria-label': 'Chance de cada slide ser o assunto da sua fala' });
  const decisao = el('div', { class: 'ss-decisao', role: 'status' }, [el('span', { class: 'ic', text: '🎙️' }), el('div', {}, [el('b', { text: 'Fale e o slide segue você' }), el('span', { text: 'Pule de assunto, conte uma piada, diga "próximo".' })])]);
  const faltas = el('div', { class: 'ss-faltas', hidden: true });
  const painel = el('aside', { class: 'ss-painel', 'aria-label': 'O que o Jev decidiu' }, [
    el('header', {}, [el('h3', {}, [ponto, estadoOuvido]), api.som.botao(el)]),
    vagaFita,
    el('div', { class: 'ss-sec-t' }, [el('span', { text: 'De qual slide você fala?' }), el('span', { class: 'ss-leg', text: `┆ troca acima de ${fmt.pct(L.slide)}` })]),
    el('div', { class: 'ss-probs-caixa' }, [probs, el('i', { class: 'ss-linha-limiar', 'aria-hidden': 'true' })]),
    decisao,
    faltas,
    el('div', { class: 'ss-ferr' }, [btDecks, btCheia, btRecomecar]),
  ]);
  painel.style.setProperty('--limiar', String(L.slide));

  const barra = api.voz.barraVoz({
    exemplos: EXEMPLOS['erros-ia'],
    dica: 'Aperte o microfone e apresente: o slide segue você',
    placeholder: 'Ou digite o que você falaria e aperte Enter',
    onTexto: () => { if (linhaVoz) linhaVoz.scrollTop = linhaVoz.scrollHeight; },   // mostra sempre as palavras mais novas
    onPausa: () => pedir(),
  });
  const vagaVoz = el('div', { class: 'ss-voz' }, [barra.no]);
  const linhaVoz = barra.no.querySelector('.mj-voz-linha');

  raiz.append(esq, painel, vagaVoz, anuncio);
  area.append(raiz);
  vagaFita.append(api.fita.no);
  new MutationObserver(() => {
    const ouvindo = barra.no.classList.contains('ouvindo'), simulando = barra.no.classList.contains('simulando');
    raiz.classList.toggle('ouvindo', ouvindo || simulando);
    estadoOuvido.textContent = ouvindo || simulando ? 'O Jev está ouvindo' : 'Pronto para ouvir';
  }).observe(barra.no, { attributes: true, attributeFilter: ['class'] });

  // o slide (1600×900) acompanha o tamanho da moldura
  const escala = new ResizeObserver((ents) => { for (const e of ents) e.target.style.setProperty('--k', (e.contentRect.width / LARG).toFixed(5)); });
  escala.observe(moldura);

  // ---------- desenhar um slide ----------
  function desenhoDe(s, i) { return s.emoji || (i === 0 && deck.emoji) || (layoutDe(i) === 'resumo' ? '🏁' : ICONES[i % ICONES.length]); }
  function layoutDe(i) { return i === 0 ? 'capa' : i === deck.slides.length - 1 && deck.slides.length > 2 ? 'resumo' : 'topicos'; }

  function montarSlide(i) {
    const s = deck.slides[i], n = deck.slides.length, lay = layoutDe(i);
    const tops = el('ul', { class: 'ss-s-tops' }, s.topicos.map((t, j) => el('li', { class: 'ss-top', 'data-j': String(j) }, [
      el('span', { class: 'ss-top-bola', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>' }),
      el('span', { class: 'ss-top-txt' }, [el('span', { class: 'ss-tinta', text: t })]),
    ])));
    const kicker = s.kicker || (i === 0 ? 'Apresentação' : lay === 'resumo' ? 'Resumo' : `Slide ${i + 1}`);
    const lenT = s.titulo.length;
    const sl = el('div', { class: `ss-slide lay-${lay} t-${lenT > 52 ? 'xl' : lenT > 36 ? 'l' : lenT > 22 ? 'm' : 's'}`, 'data-i': String(i), style: { '--gx': `${78 - (i % 4) * 9}%`, '--gy': `${14 + (i % 3) * 8}%`, '--prog': ((i + 1) / n).toFixed(3) } }, [
      el('div', { class: 'ss-s-corpo' }, [
        el('p', { class: 'ss-s-kicker', text: kicker }),
        el('h2', { class: 'ss-s-titulo', text: s.titulo }),
        tops,
      ]),
      el('div', { class: 'ss-s-emoji', 'aria-hidden': 'true' }, [el('span', { text: desenhoDe(s, i) })]),
      el('div', { class: 'ss-s-rodape' }, [el('span', { text: i === 0 ? '🎙️ Fale e o slide segue você' : deck.titulo }), el('b', { text: `${i + 1} / ${n}` })]),
      el('i', { class: 'ss-s-prog', 'aria-hidden': 'true' }),
    ]);
    pintarTopicos(i, sl);
    return sl;
  }

  // deck colado com texto comprido: diminui a letra até caber (o slide tem tamanho fixo, então mede uma vez só)
  const medidor = el('div', { class: 'ss-medidor', 'aria-hidden': 'true' });
  raiz.append(medidor);
  const ajuste = new Map();
  function caber(i, sl) {
    if (ajuste.has(i)) { if (ajuste.get(i)) sl.classList.add('fit-' + ajuste.get(i)); return; }
    const teste = montarSlideCru(i);
    medidor.append(teste);
    let nivel = 0;
    const corpo = teste.querySelector('.ss-s-corpo');
    while (nivel < 5 && corpo.scrollHeight > corpo.clientHeight + 2) { teste.classList.remove('fit-' + nivel); nivel++; teste.classList.add('fit-' + nivel); }
    teste.remove();
    ajuste.set(i, nivel);
    if (nivel) sl.classList.add('fit-' + nivel);
  }
  function montarSlideCru(i) { const sl = montarSlide(i); sl.style.transform = 'none'; return sl; }
  function slideCompleto(i) { const sl = montarSlide(i); caber(i, sl); return sl; }

  function pintarTopicos(i, raizSlide) {
    const alvo = raizSlide ? [raizSlide] : raiz.querySelectorAll(`.ss-slide[data-i="${i}"]`);
    const ac = acesos[i] || new Set();
    for (const sl of alvo) sl.querySelectorAll('.ss-top').forEach((li) => li.classList.toggle('aceso', ac.has(+li.dataset.j)));
  }

  // ---------- filmstrip ----------
  let minis = [];
  function montarFilme() {
    filme.innerHTML = ''; minis = [];
    deck.slides.forEach((s, i) => {
      const tela = el('div', { class: 'ss-mini-tela' }, [slideCompleto(i)]);
      const b = el('button', { class: 'ss-mini', type: 'button', role: 'listitem', 'aria-label': `Ir para o slide ${i + 1}: ${s.titulo}`, title: `${i + 1}. ${s.titulo}`, onclick: () => irPara(i, { motivo: 'mao' }) }, [
        tela, el('span', { class: 'ss-mini-n', text: String(i + 1) }), el('span', { class: 'ss-mini-selo', 'aria-hidden': 'true' }),
      ]);
      escala.observe(tela);
      filme.append(b); minis.push(b);
    });
    marcarFilme();
  }
  function marcarFilme() {
    minis.forEach((b, i) => {
      b.classList.toggle('atual', i === atual);
      b.setAttribute('aria-current', i === atual ? 'true' : 'false');
      const tot = deck.slides[i].topicos.length, ac = (acesos[i] || new Set()).size;
      const selo = b.querySelector('.ss-mini-selo');
      const completo = tot > 0 && ac === tot, falta = visitas[i] > 0 && i !== atual && ac < tot;
      b.classList.toggle('completo', completo);
      b.classList.toggle('falta', !completo && falta);
      selo.textContent = completo ? '✓' : falta ? String(tot - ac) : '';
      selo.title = falta ? `faltou falar de ${tot - ac} tópico(s)` : '';
    });
    desenharFaltas();
    const b = minis[atual];
    if (b && filme.scrollWidth > filme.clientWidth) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ui.reduzMovimento ? 'auto' : 'smooth' });
  }

  // a lista "Faltou falar de" (slides por onde você já passou): clicar volta para o slide
  function desenharFaltas() {
    const itens = [];
    deck.slides.forEach((s, i) => {
      if (i === atual || !(visitas[i] > 0)) return;
      s.topicos.forEach((t, j) => { if (!acesos[i].has(j)) itens.push({ i, t }); });
    });
    faltas.innerHTML = '';
    if (itens.length) {
      const { i, t } = itens[0];
      faltas.append(
        el('span', { class: 'ss-faltas-t', text: 'Faltou:' }),
        el('button', { type: 'button', title: `Faltou falar de: ${itens.map((x) => `${x.t} (slide ${x.i + 1})`).join('; ')}. Clique para voltar ao slide ${i + 1}.`, onclick: () => irPara(i, { motivo: 'mao' }) }, [el('b', { text: String(i + 1) }), el('span', { text: t })]),
        itens.length > 1 ? el('span', { class: 'mais', text: `+${itens.length - 1}` }) : null,
      );
    }
    faltas.hidden = !itens.length;
  }

  // ---------- painel das chances ----------
  let linhas = [];
  function montarProbs() {
    probs.innerHTML = ''; linhas = [];
    const itens = deck.slides.map((s, i) => ({ id: 's' + (i + 1), n: String(i + 1), nome: s.titulo }));
    itens.push({ id: 'manter', n: '💬', nome: 'Conversa solta: fica' });
    for (const it of itens) {
      const li = el('li', { class: 'ss-prob' + (it.id === 'manter' ? ' manter' : ''), 'data-id': it.id }, [
        el('i', { class: 'br', 'aria-hidden': 'true' }), el('span', { class: 'n', text: it.n }), el('span', { class: 'nm', text: it.nome }), el('span', { class: 'pc mj-num', text: '—' }),
      ]);
      probs.append(li); linhas.push(li);
    }
    probs.classList.toggle('muitos', itens.length > 9);
    if (itens.length > 9) linhas.forEach((li, k) => { li.hidden = li.dataset.id !== 'manter' && k >= 7; });   // deck grande: 7 linhas + conversa solta
    marcarProbs();
  }
  function marcarProbs() { linhas.forEach((li) => li.classList.toggle('atual', li.dataset.id === 's' + (atual + 1))); }
  function desenharProbs(p) {
    const lista = linhas.map((li) => ({ li, v: p ? p[li.dataset.id] : null }));
    for (const { li, v } of lista) {
      li.style.setProperty('--p', v == null ? '0' : Math.max(0.004, v).toFixed(3));
      li.querySelector('.pc').textContent = v == null ? '—' : v >= 0.995 ? '99%' : v < 0.01 ? '0%' : fmt.pct(v);
      li.title = v == null && p ? 'a capa só volta quando você pede ("volta lá no começo")' : '';
      li.classList.toggle('fora', v == null && !!p);
      li.classList.toggle('topo', v != null && v >= L.slide);
    }
    // muitos slides (deck colado): mostra só os mais prováveis
    if (probs.classList.contains('muitos') && p) {
      const ordem = lista.filter((x) => x.li.dataset.id !== 'manter').sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, 7).map((x) => x.li);
      linhas.forEach((li) => { li.hidden = li.dataset.id !== 'manter' && !ordem.includes(li); });
    }
  }
  function mostrarDecisao(ic, titulo, detalhe, tom = '') {
    decisao.className = 'ss-decisao ' + tom;
    decisao.innerHTML = '';
    decisao.append(el('span', { class: 'ic', text: ic }), el('div', {}, [el('b', { text: titulo }), detalhe ? el('span', { text: detalhe }) : null]));
    if (!ui.reduzMovimento) decisao.animate([{ transform: 'translateY(4px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  // ---------- trocar de slide (com a transição) ----------
  function mostrarSlide(i, de) {
    const novo = el('div', { class: 'ss-folha' }, [slideCompleto(i)]);
    const velhas = [...cena.children];
    cena.append(novo);
    if (ui.reduzMovimento || de == null) { velhas.forEach((v) => v.remove()); return; }
    const longe = Math.abs(i - de) > 1, frente = i > de;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    const entra = longe
      ? [{ opacity: 0, transform: 'scale(1.08)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }]
      : [{ opacity: 0, transform: `translateX(${frente ? 7 : -7}%) scale(.97)` }, { opacity: 1, transform: 'none' }];
    const sai = longe
      ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }]
      : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${frente ? -7 : 7}%) scale(.97)` }];
    novo.animate(entra, { duration: longe ? 520 : 440, easing: ease });
    velhas.forEach((v) => { v.classList.add('saindo'); const a = v.animate(sai, { duration: 380, easing: ease, fill: 'forwards' }); a.onfinish = () => v.remove(); setTimeout(() => v.remove(), 700); });
  }

  function irPara(i, { motivo = 'mao', pk = null, porque = null } = {}) {
    i = Math.max(0, Math.min(deck.slides.length - 1, i));
    const n = palavras(barra.texto).length;
    if (i === atual) {
      if (motivo !== 'mao') { corte = pk ? pk.N : n; }
      return false;
    }
    const de = atual;
    if (visitas[de] > 0) avisarFaltou(de);
    atual = i; versao++;
    // a fala que já foi decidida não vale de novo; num salto por assunto, ela também conta para o slide novo
    const N = pk ? pk.N : n;
    corte = N;
    inicioSlide = motivo === 'assunto' && pk ? Math.max(pk.ini, N - SALTO) : N;
    visitas[i] = visitas[i] || 0;
    mostrarSlide(i, de);
    marcarFilme(); marcarProbs();
    anuncio.textContent = `Slide ${i + 1} de ${deck.slides.length}: ${deck.slides[i].titulo}`;
    som.whoosh();
    if (porque) mostrarSelo(...porque);
    if (motivo === 'assunto') querDeNovo = true;   // a mesma fala acende os tópicos do slide novo
    agendar();
    return true;
  }

  function mostrarSelo(ic, texto, tom = '') {
    selo.innerHTML = '';
    selo.append(el('span', { class: 'ic', text: ic }), el('span', { class: 'tx', text: texto }));
    selo.className = 'ss-selo on ' + tom;
    clearTimeout(tSelo); tSelo = setTimeout(() => selo.classList.remove('on'), 3200);
  }

  function avisarFaltou(i) {
    const s = deck.slides[i], ac = acesos[i] || new Set();
    const falta = s.topicos.filter((_, j) => !ac.has(j));
    if (!falta.length) return;
    faltouEl.innerHTML = '';
    faltouEl.append(el('span', { class: 'ic', text: '⚠️' }), el('span', { class: 'tx' }, [el('b', { text: 'Faltou falar de: ' }), `${falta[0]}${falta.length > 1 ? ` (e mais ${falta.length - 1})` : ''}`, el('em', { text: ` · slide ${i + 1}` })]));
    faltouEl.classList.add('on');
    clearTimeout(tFaltou); tFaltou = setTimeout(() => faltouEl.classList.remove('on'), 5200);
  }

  // ---------- conversa com o Jev (uma chamada por vez, sempre com a fala mais nova) ----------
  function pedir() { querDeNovo = true; agendar(); }
  function agendar() {
    if (voando || timerEnvio || !querDeNovo) return;
    timerEnvio = setTimeout(enviar, Math.max(0, ultimoEnvio + INTERVALO - Date.now()));
  }

  function pacote() {
    const w = palavras(barra.texto), N = w.length;
    if (corte > N) corte = N;
    if (inicioSlide > N) inicioSlide = N;
    const ini = Math.max(corte, N - JANELA);
    const recentes = w.slice(ini).join(' ');
    const noSlide = w.slice(Math.max(inicioSlide, N - NO_SLIDE)).join(' ');
    const apagados = deck.slides[atual].topicos.map((_, j) => j).filter((j) => !acesos[atual].has(j));
    if (!recentes && !(noSlide && apagados.length)) return null;
    const dados = { atual, fala_recente: recentes, fala_no_slide: noSlide, topicos: noSlide ? apagados : [] };
    if (deck.id === 'proprio') dados.deck = { titulo: deck.titulo, slides: deck.slides.map((s) => ({ titulo: s.titulo, topicos: s.topicos })) };
    else dados.deck_id = deck.id;
    if (!recentes && !dados.topicos.length) return null;
    // frase completa = o reconhecedor já fechou tudo (sem pedaço "parcial" ainda mudando)
    const completo = barra.texto.trim() === barra.final.trim();
    return { N, ini, nRec: N - ini, atual, versao, completo, deckId: deck.id, dados, assinatura: `${deck.id}|${atual}|${recentes}|${noSlide}|${dados.topicos.join(',')}` };
  }

  async function enviar() {
    timerEnvio = null;
    if (voando || !querDeNovo) return;
    querDeNovo = false;
    const pk = pacote();
    if (!pk || pk.assinatura === ultimaAssinatura) return;
    ultimaAssinatura = pk.assinatura;
    voando = true; ultimoEnvio = Date.now(); raiz.classList.add('pensando');
    visitas[atual] = Math.max(visitas[atual] || 0, pk.N - inicioSlide);
    let r = null;
    try {
      r = await api.jev('ouvir', pk.dados, `"${(pk.dados.fala_recente || pk.dados.fala_no_slide).slice(-38)}"`);
    } catch (e) {
      if (e && e.status === 429) ultimoEnvio = Date.now() + 2500;   // passou do limite: respira antes da próxima
    } finally {
      voando = false; raiz.classList.remove('pensando');
    }
    if (r && pk.versao === versao && pk.deckId === deck.id) aplicar(r, pk);
    agendar();
  }

  // a regra da troca (a mesma medida com o Jev): pedido específico > assunto de outro slide > próximo / voltar
  function decidirTroca(r, pk) {
    const S = r.slide, P = r.pedido;
    if (!S || !P) return null;
    const n = deck.slides.length;
    const sl = Object.entries(S.probabilities).sort((a, b) => b[1] - a[1]);
    const pd = Object.entries(P.probabilities).sort((a, b) => b[1] - a[1]);
    const [top, p1] = sl[0], [ptop, pp] = pd[0];
    const dentro = (i) => (Number.isInteger(i) && i >= 0 && i < n ? i : -1);   // lista fechada, conferida aqui também
    const idx = top === 'manter' ? -1 : dentro(+top.slice(1) - 1);
    const alvoPedido = dentro(ptop.startsWith('ir_s') ? +ptop.slice(4) - 1 : { inicio: 0, resumo: n - 1, avancar: Math.min(n - 1, pk.atual + 1), voltar: Math.max(0, pk.atual - 1) }[ptop]);
    // no resumo a pessoa recapitula cada slide: de lá, só sai pelo assunto com confiança bem alta
    const limiar = layoutDe(pk.atual) === 'resumo' ? (L.saidaResumo || 0.9) : L.slide;
    const d = { S, top, p1, p2: sl[1] ? sl[1][1] : 0, seg: sl[1] ? sl[1][0] : null, ptop, pp, idx, alvoPedido, limiar, tipo: 'fica' };
    const pManter = S.probabilities.manter || 0;
    const proposta = idx >= 0 && idx !== pk.atual && p1 >= limiar && pManter < (L.manterMax ?? 1) && pk.nRec >= L.minimoPalavras;
    if (alvoPedido >= 0 && pp >= L.pedido && (ptop.startsWith('ir_s') || ptop === 'inicio' || ptop === 'resumo')) d.tipo = 'pedido';
    // pediu um slide pelo nome e o assunto aponta o mesmo slide: as duas perguntas concordam
    else if (ptop.startsWith('ir_s') && alvoPedido >= 0 && alvoPedido !== pk.atual && idx === alvoPedido && pp >= L.concorda && p1 >= L.concorda) d.tipo = 'pedido';
    // pelo assunto, só com a frase completa (o reconhecedor já fechou o que ouviu) e pouca chance de "manter". Medido na
    // tela: "meu tio responde tudo com áudio de sete minutos," cortado nas vírgulas ia para o slide 2 com 79–85%, duas
    // vezes seguidas; inteira, a piada deu 73% com 27% de manter (encosta no assunto do slide 2, mas é piada). No meio
    // da frase, só aparece "quase" no painel.
    else if (proposta && pk.completo) d.tipo = 'assunto';
    else if (proposta) d.tipo = 'quase';
    else if (alvoPedido >= 0 && pp >= L.pedido && (ptop === 'avancar' || ptop === 'voltar')) d.tipo = 'relativo';
    return d;
  }

  function aplicar(r, pk) {
    const d = decidirTroca(r, pk);
    // 1) tópicos do slide que estava na tela (acendem e ficam acesos). Quando a fala nova é de outro slide (troca ou
    //    quase troca pelo assunto), ela não acende nada no slide que está saindo (medido: "cola o contrato no chat"
    //    acendia «exemplo» no slide 2 na mesma chamada que pulou para o 5).
    if (!d || (d.tipo !== 'assunto' && d.tipo !== 'quase')) {
      let novos = 0;
      for (const [k, a] of Object.entries(r)) {
        if (!/^t\d+$/.test(k) || !a || a.noul == null || a.noul < L.topico) continue;
        const j = +k.slice(1);
        if (!acesos[pk.atual].has(j)) { acesos[pk.atual].add(j); novos++; }
      }
      if (novos) {
        pintarTopicos(pk.atual); marcarFilme();
        const tot = deck.slides[pk.atual].topicos.length;
        if (tot && acesos[pk.atual].size === tot) {   // falou de tudo: o slide comemora
          som.acerto();
          mostrarSelo('✅', `Slide ${pk.atual + 1} completo: você falou de tudo`, 'completo');
          moldura.classList.remove('festa'); void moldura.offsetWidth; moldura.classList.add('festa');
        } else som.tique();
      }
    }
    if (!d) return;
    // 2) o painel mostra as chances de cada slide
    desenharProbs(d.S.probabilities);
    // 3) a troca
    const { top, p1, ptop, pp, idx, alvoPedido, limiar } = d;
    const pct = (v) => fmt.pct(Math.min(v, 0.99));
    const detalhe = `assunto: ${top === 'manter' ? 'nenhum' : 'slide ' + top.slice(1)} ${pct(p1)} · pedido: ${PEDIDO_CURTO[ptop] || 'slide ' + (alvoPedido + 1)} ${pct(pp)}`;
    if (d.tipo === 'pedido' || d.tipo === 'relativo') {
      const [ic, tx] = ptop.startsWith('ir_s') ? ['🎯', `Você pediu: slide ${alvoPedido + 1}`] : PEDIDO_TXT[ptop];
      const titulo = ptop.startsWith('ir_s') ? `Pediu o slide ${alvoPedido + 1}` : `${PEDIU[ptop]}: slide ${alvoPedido + 1}`;
      if (irPara(alvoPedido, { motivo: 'pedido', pk, porque: [ic, `${tx} · ${pct(pp)}`, 'pedido'] })) mostrarDecisao(ic, titulo, detalhe, 'pedido');
      else {
        corte = pk.N;   // o pedido foi ouvido: não vale de novo
        mostrarDecisao(ic, ptop === 'avancar' ? 'Este já é o último slide' : ptop === 'voltar' ? 'Este já é o primeiro slide' : `${titulo} (já está nele)`, detalhe);
      }
      return;
    }
    if (d.tipo === 'assunto') {
      const s = deck.slides[idx];
      irPara(idx, { motivo: 'assunto', pk, porque: ['⚡', `Você falou de «${s.titulo}» · ${pct(p1)}`, 'assunto'] });
      mostrarDecisao('⚡', `Pulou para o slide ${idx + 1}`, `você falou de «${s.titulo}» · ${pct(p1)}`, 'assunto');
      return;
    }
    // ficou: explica por quê
    const outro = d.seg && d.seg !== 'manter' && d.seg !== 's' + (pk.atual + 1) && d.p2 >= 0.25 ? +d.seg.slice(1) : 0;
    if (d.tipo === 'quase') mostrarDecisao('⏳', `Quase: slide ${idx + 1} (${pct(p1)})`, 'espera a frase terminar para trocar', 'duvida');
    else if (top === 'manter' && p1 >= 0.5) mostrarDecisao('💬', 'Conversa solta: o slide fica', detalhe, 'fica');
    else if (idx === pk.atual && outro) mostrarDecisao('🤔', `Na dúvida entre o slide ${idx + 1} e o ${outro}: fica`, detalhe, 'duvida');
    else if (idx === pk.atual) mostrarDecisao('🎯', `Você está no assunto do slide ${idx + 1}`, detalhe, 'fica');
    else if (idx >= 0) mostrarDecisao('✋', `Ficou: slide ${idx + 1} só com ${pct(p1)}`, `só troca acima de ${fmt.pct(limiar)} · ${detalhe}`, 'duvida');
    else mostrarDecisao('💬', 'O slide fica', detalhe, 'fica');
  }

  // ---------- decks ----------
  function prepararDeck(d) {
    deck = d;
    acesos = d.slides.map(() => new Set());
    visitas = d.slides.map(() => 0);
    ajuste.clear();
    atual = 0; versao++; corte = 0; inicioSlide = 0; ultimaAssinatura = '';
    raiz.dataset.deck = d.id;
    cena.innerHTML = '';
    mostrarSlide(0, null);
    montarFilme(); montarProbs(); desenharProbs(null);
    trocarExemplos(EXEMPLOS[d.id] || EXEMPLOS.proprio);
    mostrarDecisao('🎙️', 'Fale e o slide segue você', 'Pule de assunto, conte uma piada, diga "próximo".');
  }
  function deckProprio(md) {
    const slides = lerMarkdown(md);
    if (slides.length < 2) return null;
    return { id: 'proprio', titulo: slides[0].titulo, curto: 'Seu deck', emoji: slides[0].emoji || '🎤', slides: slides.map((s, i) => ({ ...s, kicker: i === 0 ? 'Seu deck' : `Slide ${i + 1}` })) };
  }
  function usarDeck(id, md, { lembrar = true } = {}) {
    const d = id === 'proprio' ? deckProprio(md) : DECKS[id];
    if (!d) return false;
    if (lembrar) guardar(CHAVE_DECK, id);
    if (lembrar && id === 'proprio') guardar(CHAVE_MD, md);
    barra.limpar();
    prepararDeck(d);
    return true;
  }
  function recomecar(avisar) {
    barra.limpar();
    prepararDeck(deck);
    if (avisar) toast('De volta à capa. Os tópicos foram apagados.');
  }
  // os exemplos da barra de voz mudam com o deck (os botões passam pelo mesmo caminho do microfone)
  function trocarExemplos(lista) { barra.exemplos(lista); }

  function abrirDecks() {
    if (raiz.classList.contains('ss-cheia')) alternarCheia();
    const md = ler(CHAVE_MD) || EXEMPLO_MD;
    const erro = el('p', { class: 'ss-m-erro', role: 'alert' });
    const campo = el('textarea', { class: 'ss-m-campo', rows: '11', spellcheck: 'false', 'aria-label': 'O seu deck em markdown' });
    campo.value = md;
    let janela = null;
    const cartao = (d) => el('button', { class: 'ss-m-deck' + (deck && deck.id === d.id ? ' atual' : ''), type: 'button', onclick: () => { usarDeck(d.id); janela.fechar(); } }, [
      el('span', { class: 'emo', text: d.emoji }), el('span', { class: 'tx' }, [el('b', { text: d.titulo }), el('span', { text: `${d.slides.length} slides · ${d.slides.reduce((s, x) => s + x.topicos.length, 0)} tópicos` })]),
    ]);
    const conteudo = el('div', { class: 'ss-m' }, [
      el('p', { class: 'ss-m-t', text: 'Decks prontos para apresentar de improviso' }),
      el('div', { class: 'ss-m-decks' }, Object.values(DECKS).map(cartao)),
      el('p', { class: 'ss-m-t', text: '📝 Cole o seu deck' }),
      el('p', { class: 'ss-m-ajuda', html: 'Uma linha <code># Título</code> abre cada slide; cada <code>- tópico</code> embaixo é um tópico que acende quando você fala dele. Até 12 slides de até 5 tópicos. Um emoji no começo do título vira o desenho do slide. Fica guardado só neste navegador.' }),
      campo, erro,
      el('div', { class: 'ss-m-acoes' }, [
        el('button', { class: 'mj-btn mj-btn--primario', type: 'button', onclick: () => { if (usarDeck('proprio', campo.value)) janela.fechar(); else erro.textContent = 'Preciso de pelo menos 2 slides: comece cada um com uma linha "# Título".'; } }, ['Apresentar o meu deck']),
        el('button', { class: 'mj-btn', type: 'button', onclick: () => { campo.value = EXEMPLO_MD; erro.textContent = ''; } }, ['Ver um exemplo']),
      ]),
    ]);
    janela = modal('Escolha o deck', conteudo, { largo: true });
  }

  // ---------- tela cheia ----------
  function entrarCheia() {
    raiz.classList.add('ss-cheia');
    vagaFitaCheia.append(api.fita.no);
    btCheia.querySelector('.tx').textContent = 'Sair da tela cheia';
  }
  function sairCheia() {
    raiz.classList.remove('ss-cheia');
    vagaFita.append(api.fita.no);
    btCheia.querySelector('.tx').textContent = 'Tela cheia';
  }
  async function alternarCheia() {
    if (raiz.classList.contains('ss-cheia')) {
      sairCheia();
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      entrarCheia();
      try { if (raiz.requestFullscreen && !document.fullscreenElement) await raiz.requestFullscreen(); } catch { /* sem permissão: fica a tela cheia da página */ }
    }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && raiz.classList.contains('ss-cheia')) sairCheia(); });

  // teclado e passador de slides (setas, PageUp/PageDown, Home/End, F)
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
    if (document.querySelector('.mj-modal-fundo, .mj-gaveta.aberta')) return;
    const mapa = { ArrowRight: atual + 1, ArrowDown: atual + 1, PageDown: atual + 1, ArrowLeft: atual - 1, ArrowUp: atual - 1, PageUp: atual - 1, Home: 0, End: deck.slides.length - 1 };
    if (e.key in mapa) { e.preventDefault(); irPara(mapa[e.key], { motivo: 'mao' }); return; }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); alternarCheia(); return; }
    if (e.key === 'Escape' && raiz.classList.contains('ss-cheia') && !document.fullscreenElement) sairCheia();
  });

  // ---------- começo ----------
  const salvo = ler(CHAVE_DECK);
  if (!(salvo && usarDeck(salvo, ler(CHAVE_MD)))) usarDeck('erros-ia');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ajuste.clear(); }).catch(() => {});

  // ---------- demonstração ----------
  async function esperarJev(sinal) {
    await sleep(160, sinal);
    for (let i = 0; i < 40 && (voando || timerEnvio || querDeNovo); i++) await sleep(100, sinal);
  }
  async function tocar(sinal) {
    const antes = deck.id;   // a demonstração usa o deck dos 5 erros; no fim (ou se parar) volta o deck que você tinha
    if (raiz.classList.contains('ss-cheia')) alternarCheia();
    usarDeck('erros-ia', null, { lembrar: false });
    try {
      await sleep(900, sinal);
      for (const fala of DEMO) {
        await barra.simular(fala, { sinal });
        await esperarJev(sinal);
        await sleep(650, sinal);
      }
      await sleep(3200, sinal);
    } finally {
      if (!(antes !== 'erros-ia' && usarDeck(antes, ler(CHAVE_MD), { lembrar: false }))) recomecar(false);
      barra.dica('Sua vez: aperte o microfone e apresente. O slide segue você.');
    }
  }

  return { tocar };
}

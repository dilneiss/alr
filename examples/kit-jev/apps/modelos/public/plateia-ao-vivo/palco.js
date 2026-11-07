// Tela da "Plateia que Reage": auditório em perspectiva, termômetro da plateia, curva da fala e relatório.
// Cada frase fechada (e as pausas das frases longas) vira UMA chamada (jogada "reagir"): o tipo da frase, o gancho e a
// reação de cada pessoa da plateia. Todo o resto é código: rostos, balões, ondas, luz, termômetro, curva e relatório.

const CAMISAS = ['#1e3a8a', '#0f766e', '#a16207', '#4d7c0f', '#9a3412', '#6b21a8', '#be185d', '#334155', '#0e7490', '#b45309', '#3f6212', '#1d4ed8', '#7e22ce', '#155e75', '#854d0e', '#047857'];

// o rosto de cada reação; o código "carrega" a expressão quando a reação é forte ou se repete
const ROSTO = { rindo: '😂', empolgado: '🤩', convencido: '😌', curioso: '🤔', neutro: '😐', cetico: '🤨', confuso: '😵‍💫', entediado: '🥱', incomodado: '😠' };
const ADJ = {
  rindo: ['rindo', 'rindo', 'rindo', 'rindo'],
  empolgado: ['empolgado', 'empolgada', 'empolgados', 'empolgadas'],
  convencido: ['convencido', 'convencida', 'convencidos', 'convencidas'],
  curioso: ['curioso', 'curiosa', 'curiosos', 'curiosas'],
  neutro: ['neutro', 'neutra', 'neutros', 'neutras'],
  cetico: ['cético', 'cética', 'céticos', 'céticas'],
  confuso: ['confuso', 'confusa', 'confusos', 'confusas'],
  entediado: ['entediado', 'entediada', 'entediados', 'entediadas'],
  incomodado: ['incomodado', 'incomodada', 'incomodados', 'incomodadas'],
};
const adj = (r, g, plural) => (ADJ[r] || [r, r, r, r])[(plural ? 2 : 0) + (g === 'f' ? 1 : 0)];
const GANCHO = ['derruba', 'fraca', 'segura', 'prende', 'irresistível'];

// a demonstração do ▶: a abertura de um vídeo do YouTube, com as duas viradas (a piada e a frase arrogante)
const DEMO = [
  'Fala, pessoal! Hoje eu vou te mostrar como ficar rico com inteligência artificial em sete dias, sem fazer nada.',
  'Brincadeira! Se fosse fácil assim, eu estaria numa praia, e não gravando isto às duas da manhã.',
  'A Márcia, que tem uma marmitaria em Guarulhos, passou de 30 para 85 pedidos por semana respondendo o WhatsApp com IA.',
  'Para isso, ela usou um agente com RAG, embeddings e um webhook no n8n.',
  'E quem não entendeu isso, sinceramente, nem deveria estar assistindo a este canal.',
  'Desculpa, foi grosseiro: vai ficar tão simples que até o meu avô, que imprime e-mail para ler, vai conseguir fazer.',
  'Então se inscreve, ativa o sininho e comenta aqui embaixo qual é o seu negócio.',
];

// geometria do auditório (em unidades do tamanho do assento da primeira fila)
const PASSO = 1.04;   // distância entre assentos vizinhos
const SOBE = 0.6;     // quanto cada fileira de trás sobe em relação à da frente
const ALT = 1.05;     // altura do assento / largura
const ARCO = 0.12;    // as pontas da fileira descem (a fileira faz curva em volta do palco)

const palavras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;
const limpa = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const topo = (probs) => Object.entries(probs || {}).sort((a, b) => b[1] - a[1]);
const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];
const limita = (v, a, b) => Math.max(a, Math.min(b, v));
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function nomes(lista, max = 3) {
  const n = lista.map((g) => g.p.nome);
  if (n.length <= max) return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0] || '';
  return n.slice(0, max).join(', ') + ` e mais ${n.length - max}`;
}

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep } = ui;
  const REACOES = spec.reacoes;
  const R = Object.fromEntries(REACOES.map((r) => [r.id, r]));
  const LADO = Object.fromEntries(REACOES.map((r) => [r.id, r.lado]));
  const TIPOS = Object.fromEntries(spec.tipos.map((t) => [t.id, t]));
  const BAL = spec.baloes || {};
  const reduz = ui.reduzMovimento;

  // ---------- estado ----------
  let plateia = spec.plateias[0];
  let gente = [];            // { p: ficha, no, rosto, reacao, prob, emoji, fileira, xn }
  let frases = [];           // { n, texto, pronta, tipo, gancho, cont, com, contra, saldo, reacoes: { id: reacao } }
  let seq = 0, seqAplicado = 0, versao = 0, emVoo = 0;
  let fragmento = '', ultimaParcial = '', comAntes = null, limparAoFalar = false;
  let relatorioAberto = false, fichaAberta = null, barra = null;
  const ultimoSom = {};

  // ---------- tela ----------
  const raiz = el('div', { class: 'pl' });

  // topo: plateia escolhida, termômetro e "% com você"
  const btEscolha = el('button', { class: 'pl-escolha', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Trocar a plateia' });
  const menu = el('div', { class: 'pl-menu', role: 'menu', 'aria-label': 'Plateias prontas', hidden: true });
  const escolhaWrap = el('div', { class: 'pl-escolha-wrap' }, [btEscolha, menu]);
  const segs = {};
  const barraTermo = el('div', { class: 'pl-termo-barra', role: 'img', 'aria-label': 'Reações da plateia' });
  for (const r of REACOES) {
    const s = el('span', { class: 'pl-seg', 'data-r': r.id }, [el('b', { text: r.icone }), el('i', { class: 'mj-num' })]);
    s.style.setProperty('--c', r.cor);
    segs[r.id] = s; barraTermo.append(s);
  }
  const termoT = el('div', { class: 'pl-termo-t' }, [el('span', { text: 'Termômetro da plateia' }), el('span', { class: 'pl-termo-leg' })]);
  const comNum = el('b', { class: 'n', text: '—' });
  const comDelta = el('span', { class: 'd mj-num' });
  const comBox = el('div', { class: 'pl-com' }, [comNum, el('span', { class: 't' }, ['com', el('br'), 'você']), comDelta]);
  const barraTopo = el('div', { class: 'pl-barra' }, [escolhaWrap, el('div', { class: 'pl-termo' }, [termoT, barraTermo]), comBox]);

  // o auditório
  const fileiras = el('div', { class: 'pl-fileiras' });
  const camadaBaloes = el('div', { class: 'pl-baloes', 'aria-hidden': 'true' });
  const camadaEfeitos = el('div', { class: 'pl-efeitos', 'aria-hidden': 'true' });
  const placaTipo = el('span', { class: 'pl-placa-tipo', text: 'A plateia está esperando' });
  const placaGancho = el('span', { class: 'pl-placa-gancho' });
  const placaN = el('span', { class: 'pl-placa-n mj-num' });
  const placa = el('div', { class: 'pl-placa' }, [placaN, placaTipo, placaGancho]);
  const fitaWrap = el('div', { class: 'pl-fita' }, [api.fita.no]);
  const sala = el('section', { class: 'pl-sala', 'data-clima': 'calmo', 'aria-label': 'Auditório' }, [
    el('div', { class: 'pl-fundo', 'aria-hidden': 'true' }),
    el('div', { class: 'pl-feixes', 'aria-hidden': 'true' }, [el('i', { class: 'f1' }), el('i', { class: 'f2' }), el('i', { class: 'f3' })]),
    fileiras,
    el('div', { class: 'pl-tinta', 'aria-hidden': 'true' }),
    camadaEfeitos,
    camadaBaloes,
    el('div', { class: 'pl-chao', 'aria-hidden': 'true' }, [el('i', { class: 'pl-ribalta' })]),
    placa,
    el('div', { class: 'pl-cortina esq', 'aria-hidden': 'true' }),
    el('div', { class: 'pl-cortina dir', 'aria-hidden': 'true' }),
    el('div', { class: 'pl-bambinela', 'aria-hidden': 'true' }),
    fitaWrap,
  ]);

  // embaixo: a curva da fala e os botões
  const svgNS = 'http://www.w3.org/2000/svg';
  const curvaSvg = document.createElementNS(svgNS, 'svg');
  curvaSvg.setAttribute('class', 'pl-curva-svg'); curvaSvg.setAttribute('aria-hidden', 'true');
  const curvaVazia = el('span', { class: 'pl-curva-vazia', text: 'Uma marca por frase: quanto mais alto, mais gente com você.' });
  const curvaDica = el('div', { class: 'pl-curva-dica', hidden: true });
  const curvaBox = el('div', { class: 'pl-curva', role: 'img', 'aria-label': 'Curva da fala: ainda sem frases' }, [curvaSvg, curvaVazia, curvaDica]);
  const btNova = el('button', { class: 'pl-bt', type: 'button', title: 'Começar uma fala nova com a mesma plateia', onclick: () => recomecar() }, ['↺ ', el('span', { text: 'Nova fala' })]);
  const btFim = el('button', { class: 'pl-bt pl-bt--ouro', type: 'button', title: 'Encerrar a fala e ver o relatório da plateia', disabled: true, onclick: () => abrirRelatorio() }, ['🏁 ', el('span', { text: 'Encerrar' })]);
  const baixo = el('div', { class: 'pl-baixo' }, [
    el('span', { class: 'pl-curva-t', text: 'Curva da fala' }), curvaBox,
    el('div', { class: 'pl-acoes' }, [btNova, btFim, som.botao(el)]),
  ]);

  const vozSlot = el('div', { class: 'pl-voz' });
  const avisoSr = el('p', { class: 'pl-sr', 'aria-live': 'polite' });

  // cortinas que fecham para o relatório e para trocar de plateia
  const relatorio = el('div', { class: 'pl-relatorio', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Relatório da plateia', hidden: true });
  const panos = [el('div', { class: 'pl-pano esq', 'aria-hidden': 'true' }), el('div', { class: 'pl-pano dir', 'aria-hidden': 'true' })];

  raiz.append(barraTopo, sala, baixo, vozSlot, ...panos, relatorio, avisoSr);
  area.append(raiz);

  // ---------- plateia: assentos ----------
  function desenharEscolha() {
    btEscolha.replaceChildren(
      el('span', { class: 'ic', text: plateia.icone }),
      el('span', { class: 'tx' }, [el('b', { text: plateia.rotulo }), el('small', { class: 'mj-num', text: `${plateia.pessoas.length} pessoas` })]),
      el('span', { class: 'seta', 'aria-hidden': 'true', text: '▾' }),
    );
    menu.replaceChildren(...spec.plateias.map((pl) => el('button', {
      class: 'pl-op' + (pl === plateia ? ' atual' : ''), type: 'button', role: 'menuitemradio', 'aria-checked': String(pl === plateia),
      onclick: () => trocarPlateia(pl.id),
    }, [el('span', { class: 'ic', text: pl.icone }), el('span', { class: 'tx' }, [el('b', { text: pl.rotulo }), el('small', { text: `${pl.pessoas.length} pessoas · ${pl.quem.split(',')[0]}` })])])));
  }
  function alternarMenu(abrir) {
    const vai = abrir ?? menu.hidden;
    menu.hidden = !vai;
    btEscolha.setAttribute('aria-expanded', String(vai));
    if (vai) (menu.querySelector('.atual') || menu.firstChild)?.focus();
  }
  btEscolha.addEventListener('click', () => alternarMenu());
  document.addEventListener('click', (e) => { if (!menu.hidden && !escolhaWrap.contains(e.target)) alternarMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) { alternarMenu(false); btEscolha.focus(); }
    if (fichaAberta) fecharFicha();
    if (relatorioAberto) fecharRelatorio();
  });

  function montarAssentos() {
    fecharFicha();
    fileiras.replaceChildren();
    // mistura as pessoas (sempre do mesmo jeito) para os grupos não ficarem juntos; plateia pequena fica na ordem
    const ordem = plateia.grandes ? plateia.pessoas.slice() : plateia.pessoas.slice().sort((a, b) => hash(a.id + plateia.id) - hash(b.id + plateia.id));
    gente = ordem.map((p, i) => {
      const rosto = el('span', { class: 'pl-rosto', 'aria-hidden': 'true', text: ROSTO.neutro });
      const g = { p, rosto, reacao: 'neutro', prob: 0, emoji: ROSTO.neutro, fileira: 0, xn: 0 };
      g.no = el('button', { class: 'pl-assento', type: 'button', 'data-r': 'neutro', 'aria-label': `${p.nome}, ${p.idade} anos, ${p.vida}: neutro. Ver a ficha`, onclick: () => abrirFicha(g) }, [
        el('span', { class: 'pl-halo' }),
        el('span', { class: 'pl-encosto' }),
        el('span', { class: 'pl-pessoa' }, [el('span', { class: 'pl-corpo' }), rosto]),
        plateia.grandes ? el('span', { class: 'pl-nome', text: p.nome }) : null,
      ]);
      g.no.style.setProperty('--camisa', CAMISAS[(hash(p.id) + i) % CAMISAS.length]);
      g.no.style.setProperty('--fase', (-(hash(p.id) % 3000) / 1000).toFixed(2) + 's');
      g.no.style.setProperty('--dur', (2.4 + (hash(p.nome) % 1400) / 1000).toFixed(2) + 's');
      fileiras.append(g.no);
      return g;
    });
    sala.classList.toggle('grandes', !!plateia.grandes);
    posicionar();
  }

  const sobe = () => (plateia.grandes ? 0.78 : SOBE);

  // escolhe quantas fileiras (2 a 6) deixam os rostos maiores na área disponível
  function distribuir(n, r) {
    const inclina = n <= 12 ? 0.5 : 0.12;   // plateia pequena: fileira de trás bem maior, para ninguém ficar atrás de ninguém
    const w = Array.from({ length: r }, (_, i) => 1 + inclina * (r - 1 - i));
    const soma = w.reduce((a, b) => a + b, 0);
    const base = w.map((x) => (n * x) / soma);
    const cont = base.map(Math.floor);
    let falta = n - cont.reduce((a, b) => a + b, 0);
    base.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (falta > 0) { cont[i]++; falta--; } });
    return cont;
  }
  function escolherLayout(n, W, H) {
    let melhor = null;
    const uMax = plateia.grandes ? 250 : 210;
    for (let r = 2; r <= 8; r++) {
      if (r > n || (n > 12 && r < 3)) continue;
      const cont = distribuir(n, r);
      if (n >= 4 && cont.some((c) => c < 2)) continue;   // ninguém sozinho numa fileira
      const sMin = r === 2 ? 0.86 : r === 3 ? 0.74 : 0.62;
      const s = cont.map((_, i) => sMin + ((1 - sMin) * i) / (r - 1));
      const larg = Math.max(...cont.map((c, i) => c * s[i] * PASSO));
      const alt = s.slice(0, -1).reduce((a, x) => a + x * sobe(), 0) + s[r - 1] * ALT + ARCO;
      const u = Math.min(W / larg, H / alt, uMax);
      if (!melhor || u > melhor.u * 1.04) melhor = { r, cont, s, u, alt, larg };
    }
    return melhor;
  }

  function posicionar() {
    const W = sala.clientWidth, H = sala.clientHeight;
    if (!W || !H || !gente.length) return;
    const L = Math.round(limita(W * 0.065, 16, 104));      // cortinas laterais
    const T = Math.round(limita(H * 0.1, 24, 54));          // bambinela (a cortina de cima)
    const S = Math.round(limita(H * 0.14, 44, 74));         // chão do palco
    const folga = Math.round(limita(H * 0.08, 22, 48));     // espaço para os balões da última fileira
    sala.style.setProperty('--cl', L + 'px'); sala.style.setProperty('--ct', T + 'px'); sala.style.setProperty('--cs', S + 'px');
    const aw = W - 2 * L - 12, ah = H - T - S - folga - 6;
    const lay = escolherLayout(gente.length, aw, ah);
    if (!lay) return;
    // sobrou altura (tela estreita)? as fileiras se afastam, como numa arquibancada, em vez de ficar tudo espremido embaixo
    const somaS = lay.s.slice(0, -1).reduce((a, x) => a + x, 0);
    const passoV = somaS ? Math.min(1.05, sobe() + Math.max(0, ah - lay.alt * lay.u) / (lay.u * somaS)) : sobe();
    const alturaPx = (lay.alt + (passoV - sobe()) * somaS) * lay.u;
    let y = T + folga + Math.max(0, ah - alturaPx);          // a plateia encosta no palco
    let k = 0;
    lay.cont.forEach((c, i) => {
      const w = lay.u * lay.s[i];
      for (let j = 0; j < c; j++, k++) {
        const g = gente[k]; if (!g) continue;
        const xn = c === 1 ? 0 : (j - (c - 1) / 2) / ((c - 1) / 2);
        const x = W / 2 + (j - (c - 1) / 2) * w * PASSO;
        const st = g.no.style;
        st.left = (x - w / 2).toFixed(1) + 'px';
        st.top = (y + ARCO * w * xn * xn).toFixed(1) + 'px';
        st.width = w.toFixed(1) + 'px';
        st.height = (w * ALT).toFixed(1) + 'px';
        st.zIndex = String(10 + i);
        st.setProperty('--w', w.toFixed(1) + 'px');
        st.setProperty('--rot', (xn * 4).toFixed(2) + 'deg');
        st.setProperty('--luz', (0.68 + (0.32 * i) / Math.max(1, lay.r - 1)).toFixed(2));
        g.fileira = lay.r - 1 - i; g.xn = xn;
      }
      y += passoV * w;
    });
    desenharCurva();
  }
  new ResizeObserver(() => posicionar()).observe(sala);

  // ---------- voz ----------
  function novaBarra() {
    if (barra) barra.parar();
    barra = api.voz.barraVoz({
      exemplos: plateia.exemplos || [],
      dica: 'Aperte o microfone e fale para a plateia, frase por frase',
      placeholder: 'Ou digite uma frase e aperte Enter',
      onTexto: (_, parcial) => {
        // com o microfone, quando a próxima frase começa a linha esquece a anterior (mostra só a frase atual)
        if (limparAoFalar && parcial && barra.ouvindo) { limparAoFalar = false; barra.limpar(); }
      },
      onFrase: (f) => aoFecharFrase(f),
      onPausa: (_, { parcial }) => aoPausar(parcial),
    });
    vozSlot.replaceChildren(barra.no);
    // exemplo clicado ou Enter no campo: a rodada anterior sai da linha antes da frase nova entrar
    barra.no.addEventListener('click', (e) => { if (e.target.closest('.mj-voz-ex') && !barra.ouvindo) barra.limpar(); }, true);
    barra.no.addEventListener('keydown', (e) => {
      const c = e.target.closest('.mj-voz-campo');
      if (!c || e.key !== 'Enter' || !c.value.trim()) return;
      const v = c.value; barra.limpar(); c.value = v;
    }, true);
    // quando a pessoa desliga o microfone depois de falar, o botão "Encerrar" chama atenção
    new MutationObserver(() => { btFim.classList.toggle('chama', !barra.ouvindo && frases.filter((f) => f.pronta).length >= 3 && !relatorioAberto); })
      .observe(barra.no, { attributes: true, attributeFilter: ['class'] });
  }

  function aoFecharFrase(f) {
    let t = limpa(f);
    if (!t) return;
    if (fragmento) { t = limpa(fragmento + ' ' + t); fragmento = ''; }
    if (palavras(t) < 3) { fragmento = t; return; }   // "Brincadeira!" sozinho espera a frase seguinte
    ultimaParcial = '';
    limparAoFalar = true;
    avaliarFrase(t);
  }

  function aoPausar(parcial) {
    const t = limpa((fragmento ? fragmento + ' ' : '') + (parcial || ''));
    const n = palavras(t);
    if (n < 9) return;                                     // frase longa: reage também nas pausas
    if (ultimaParcial && t.startsWith(ultimaParcial) && n - palavras(ultimaParcial) < 5) return;
    ultimaParcial = t;
    avaliarParcial(t);
  }

  // humor que dura uma frase: manda a reação anterior de quem MUDOU de reação na última frase pronta
  function memoria() {
    const prontas = frases.filter((f) => f.pronta);
    const a = prontas[prontas.length - 1], b = prontas[prontas.length - 2];
    if (!a) return {};
    const m = {};
    for (const g of gente) { const r = a.reacoes[g.p.id]; if (r && (!b || b.reacoes[g.p.id] !== r) && LADO[r] === 'contra') m[g.p.id] = r; }
    return m;
  }

  // ---------- chamadas ao Jev ----------
  async function avaliarFrase(texto) {
    fecharRelatorio(true);
    const f = { n: frases.length + 1, texto, pronta: false };
    frases.push(f);
    const anteriores = frases.slice(-4, -1).map((x) => x.texto);
    const meu = ++seq, v = versao;
    emVoo++;
    let r = null;
    try { r = await api.jev('reagir', { plateia: plateia.id, frase: texto, anteriores, antes: memoria() }, `frase ${f.n}`); } catch { r = null; } finally { emVoo--; }
    if (v !== versao) return;
    if (!r) { frases.splice(frases.indexOf(f), 1); frases.forEach((x, i) => { x.n = i + 1; }); return; }
    Object.assign(f, resumir(r), { pronta: true });
    f.reacoes = Object.fromEntries(gente.map((g) => [g.p.id, reacaoDe(r['r_' + g.p.id])[0]]));
    if (meu > seqAplicado) { seqAplicado = meu; aplicar(r, { final: true, frase: f }); }
    desenharCurva();
    btFim.disabled = false;
  }

  async function avaliarParcial(texto) {
    const anteriores = frases.slice(-3).map((x) => x.texto);
    const meu = ++seq, v = versao;
    emVoo++;
    let r = null;
    try { r = await api.jev('reagir', { plateia: plateia.id, frase: texto, anteriores, parcial: true, antes: memoria() }, 'pausa'); } catch { r = null; } finally { emVoo--; }
    if (!r || v !== versao || meu < seqAplicado) return;
    seqAplicado = meu;
    aplicar(r, { final: false });
  }

  function reacaoDe(a) {
    if (!a || !a.probabilities) return ['neutro', 0];
    const [id, p] = topo(a.probabilities)[0] || ['neutro', 0];
    return [R[id] ? id : 'neutro', p];
  }

  function resumir(r) {
    const cont = Object.fromEntries(REACOES.map((x) => [x.id, 0]));
    for (const g of gente) cont[reacaoDe(r['r_' + g.p.id])[0]]++;
    const n = gente.length || 1;
    const com = REACOES.filter((x) => x.lado === 'com').reduce((s, x) => s + cont[x.id], 0) / n;
    const contra = REACOES.filter((x) => x.lado === 'contra').reduce((s, x) => s + cont[x.id], 0) / n;
    const tipo = r.tipo && TIPOS[r.tipo.choice] ? r.tipo.choice : 'comum';
    const gancho = r.gancho && r.gancho.probabilities ? +topo(r.gancho.probabilities)[0][0] : null;
    return { cont, com, contra, saldo: com - contra, tipo, gancho };
  }

  // ---------- a plateia reage ----------
  function rostoDe(g, r, p, anterior) {
    if (r === 'rindo') return p >= 0.9 || anterior === 'rindo' ? '🤣' : '😂';
    if (r === 'entediado') return anterior === 'entediado' ? '😴' : '🥱';
    if (r === 'incomodado') return p >= 0.95 && anterior === 'incomodado' ? '😡' : '😠';
    if (r === 'curioso') return p >= 0.85 ? '🧐' : '🤔';
    return ROSTO[r] || ROSTO.neutro;
  }

  function aplicar(r, { final, frase }) {
    const res = resumir(r);
    const prontas = frases.filter((f) => f.pronta);
    const anterior = final ? prontas[prontas.length - 2] : prontas[prontas.length - 1];
    const mudaram = [];
    for (const g of gente) {
      const [id, p] = reacaoDe(r['r_' + g.p.id]);
      const antes = g.reacao;
      g.reacao = id; g.prob = p;
      const emoji = rostoDe(g, id, p, anterior && anterior.reacoes[g.p.id]);
      if (emoji !== g.emoji || id !== antes) { g.emoji = emoji; mudaram.push(g); }
      g.no.dataset.r = id;
      g.no.style.setProperty('--rc', R[id].cor);
      g.no.setAttribute('aria-label', `${g.p.nome}, ${g.p.idade} anos, ${g.p.vida}: ${adj(id, g.p.g)}. Ver a ficha`);
    }
    onda(mudaram);
    soltarBaloes(final, res.tipo, mudaram);
    efeitos(res, final);
    termometro(res, final);
    desenharPlaca(res, final ? frase.n : null);
    sala.dataset.clima = clima(res);
    if (fichaAberta) abrirFicha(fichaAberta);
    if (final) avisoSr.textContent = `Frase ${frase.n}, ${TIPOS[res.tipo].rotulo.toLowerCase()}: ${Math.round(res.com * 100)}% com você. ` +
      REACOES.filter((x) => res.cont[x.id]).sort((a, b) => res.cont[b.id] - res.cont[a.id]).slice(0, 4).map((x) => `${res.cont[x.id]} ${adj(x.id, 'm', res.cont[x.id] > 1)}`).join(', ') + '.';
  }

  // cada rosto troca com um pulo; o atraso cresce do palco para o fundo, como uma onda
  function onda(lista) {
    const v = versao;
    for (const g of lista) {
      const atraso = reduz ? 0 : Math.round(g.fileira * 75 + Math.abs(g.xn) * 150 + Math.random() * 70);
      setTimeout(() => {
        if (v !== versao) return;
        g.rosto.textContent = g.emoji;
        g.no.classList.remove('pula'); void g.no.offsetWidth; g.no.classList.add('pula');
      }, atraso);
    }
  }

  function textoBalao(g, tipo, usados) {
    const doTipo = BAL.porTipo && BAL.porTipo[tipo] && BAL.porTipo[tipo][g.reacao];
    const doTom = (BAL[g.p.tom] || BAL.jovem || {})[g.reacao] || [];
    const livre = (b) => (b || []).filter((t) => !usados.has(t));
    const preferido = doTipo && Math.random() < 0.55 ? doTipo : doTom;
    const opcoes = livre(preferido).length ? livre(preferido) : livre(doTom).length ? livre(doTom) : livre(doTipo);
    const t = opcoes.length ? sorteia(opcoes) : null;
    if (t) usados.add(t);
    return t;
  }

  function soltarBaloes(final, tipo, mudaram) {
    camadaBaloes.replaceChildren();
    const n = gente.length;
    const estreita = sala.clientWidth < 620;
    const K = final ? limita(Math.round(n / 7), 3, estreita ? 3 : 6) : estreita ? 1 : 2;
    // cota de balões por reação: proporcional a quantos reagiram assim (as maiores reações sempre falam)
    const porR = {};
    for (const g of gente) if (g.reacao !== 'neutro') (porR[g.reacao] ||= []).push(g);
    const ordemR = Object.keys(porR).sort((a, b) => porR[b].length - porR[a].length);
    const cota = {};
    const tot = ordemR.reduce((x, r) => x + porR[r].length, 0);
    const base = ordemR.map((r) => [r, (K * porR[r].length) / Math.max(1, tot)]);
    let soma = 0;
    for (const [r, x] of base) { cota[r] = Math.floor(x); soma += cota[r]; }
    base.slice().sort((a, b) => (b[1] % 1) - (a[1] % 1)).forEach(([r]) => { if (soma < K) { cota[r]++; soma++; } });
    // a 2ª e a 3ª maiores reações também falam (se têm 2 pessoas ou mais)
    for (const r of ordemR.slice(1, 3)) if (!cota[r] && porR[r].length >= 2 && cota[ordemR[0]] > 1) { cota[ordemR[0]]--; cota[r] = 1; }
    // dentro de cada reação: quem acabou de mudar e quem tem mais certeza falam primeiro
    for (const r of ordemR) porR[r].sort((a, b) => (b.prob + (mudaram.includes(b) ? 0.3 : 0) + Math.random() * 0.25) - (a.prob + (mudaram.includes(a) ? 0.3 : 0) + Math.random() * 0.25));
    const fila = [];
    for (let rodada = 0; rodada < K; rodada++) for (const r of ordemR) if ((cota[r] || 0) > rodada) fila.push(...porR[r].slice(rodada * 3, rodada * 3 + 3).map((g) => ({ g, r, rodada })));
    const usados = new Set(), colocados = [], feitos = {};
    const rs = sala.getBoundingClientRect();
    const L = parseFloat(sala.style.getPropertyValue('--cl')) || 20, T = parseFloat(sala.style.getPropertyValue('--ct')) || 30;
    const S = parseFloat(sala.style.getPropertyValue('--cs')) || 50;
    const bate = (a, b) => a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
    let i = 0;
    for (const { g, r } of fila) {
      if (colocados.length >= K) break;
      if ((feitos[r] || 0) >= (cota[r] || 0)) continue;
      const texto = textoBalao(g, tipo, usados);
      if (!texto) continue;
      const b = el('div', { class: 'pl-balao', text: texto });
      b.style.setProperty('--rc', R[g.reacao].cor);
      b.style.visibility = 'hidden';
      camadaBaloes.append(b);
      const ra = g.no.getBoundingClientRect();
      const bw = b.offsetWidth, bh = b.offsetHeight;
      const cx = ra.left - rs.left + ra.width / 2;
      const x = limita(cx - bw / 2, L + 4, rs.width - L - 4 - bw);
      let y = ra.top - rs.top - bh + ra.height * 0.04, embaixo = false;
      if (y < T + 18) { y = ra.bottom - rs.top - ra.height * 0.12; embaixo = true; }   // última fileira: o balão vai embaixo
      const caixa = { x, y, w: bw, h: bh };
      if (y + bh > rs.height - S || colocados.some((c) => bate(c, caixa))) { b.remove(); usados.delete(texto); continue; }
      colocados.push(caixa); feitos[r] = (feitos[r] || 0) + 1;
      const atraso = reduz ? 0 : 140 + i * 150; i++;
      b.classList.toggle('embaixo', embaixo);
      b.style.left = x.toFixed(1) + 'px'; b.style.top = y.toFixed(1) + 'px';
      b.style.setProperty('--cauda', limita(cx - x, 14, bw - 14).toFixed(1) + 'px');
      b.style.animationDelay = `${atraso}ms, ${atraso + 4200}ms`;
      b.style.visibility = '';
      setTimeout(() => b.remove(), atraso + 4700);
    }
  }

  // ondas da plateia inteira: risos, caras feias, aplausos, interrogações, sono… e grilos quando a piada não pega
  function efeitos(res, final) {
    const n = gente.length || 1, c = res.cont, f = (k) => c[k] / n;
    const de = (k) => gente.filter((g) => g.reacao === k);
    if (f('rindo') >= 0.35) { particulas(de('rindo'), ['HA', 'HAHA', 'KKK', '😂', 'HA'], '#fde047'); tocarSom('risada', () => { som.risada(); som.aplauso(0.35); }); }
    if (f('incomodado') >= 0.35) { particulas(de('incomodado'), ['💢', 'UUU', '😤', 'ei!'], '#f87171'); tocarSom('vaia', () => som.erro()); }
    if (f('convencido') + f('empolgado') >= 0.4) { particulas(de('convencido').concat(de('empolgado')), ['👏', '👏', '✨', '👍'], '#86efac'); tocarSom('palmas', () => som.aplauso(0.75)); }
    if (f('confuso') >= 0.35) particulas(de('confuso'), ['?', '??', '❓', 'hã?'], '#93c5fd');
    if (f('entediado') >= 0.3) particulas(de('entediado'), ['z', 'Zz', '💤'], '#d6d3d1');
    if (f('cetico') >= 0.4) particulas(de('cetico'), ['hmm', 'sei…', '🤨'], '#c4b5fd');
    if (final && res.tipo === 'piada' && f('rindo') < 0.15) grilos();
  }
  function tocarSom(chave, fn) {
    const agora = Date.now();
    if (ultimoSom[chave] && agora - ultimoSom[chave] < 2500) return;
    ultimoSom[chave] = agora; try { fn(); } catch { /* sem áudio */ }
  }
  function particulas(lista, textos, cor) {
    if (reduz || !lista.length) return;
    const rs = sala.getBoundingClientRect();
    const escolha = lista.slice().sort(() => Math.random() - 0.5).slice(0, 12);
    escolha.forEach((g, i) => {
      const ra = g.no.getBoundingClientRect();
      const s = el('span', { class: 'pl-part', text: sorteia(textos) });
      s.style.left = (ra.left - rs.left + ra.width * (0.25 + Math.random() * 0.5)).toFixed(0) + 'px';
      s.style.top = (ra.top - rs.top + ra.height * 0.1).toFixed(0) + 'px';
      s.style.setProperty('--c', cor);
      s.style.setProperty('--r', (Math.random() * 30 - 15).toFixed(0) + 'deg');
      s.style.animationDelay = (120 + i * 70) + 'ms';
      camadaEfeitos.append(s);
      setTimeout(() => s.remove(), 2400 + i * 70);
    });
  }
  let ac = null;
  function grilos() {
    if (!reduz) {
      const g = el('span', { class: 'pl-grilo', text: '🦗 cri… cri…' });
      camadaEfeitos.append(g); setTimeout(() => g.remove(), 2600);
    }
    if (!som.ligado) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + 0.05;
      for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) {
        const t = t0 + k * 0.62 + i * 0.07;
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(4300, t);
        gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.05, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + 0.06);
      }
    } catch { /* sem áudio */ }
  }

  function clima(res) {
    const n = gente.length || 1, c = res.cont;
    if (c.rindo / n >= 0.35) return 'riso';
    if (c.incomodado / n >= 0.3) return 'raiva';
    if (res.saldo >= 0.25) return 'bom';
    if (c.confuso / n >= 0.35) return 'confuso';
    if (res.saldo <= -0.25) return 'frio';
    return 'calmo';
  }

  // ---------- termômetro, placa e curva ----------
  function termometro(res, final) {
    const n = gente.length || 1;
    for (const r of REACOES) {
      const k = res.cont[r.id] || 0, f = k / n, s = segs[r.id];
      s.style.width = (f * 100).toFixed(2) + '%';
      s.classList.toggle('mostra-ic', f >= 0.07);
      s.classList.toggle('mostra-n', f >= 0.13);
      s.querySelector('i').textContent = k;
      s.title = `${r.icone} ${k} ${r.rotulo}`;
    }
    barraTermo.setAttribute('aria-label', 'Reações da plateia: ' + REACOES.filter((r) => res.cont[r.id]).map((r) => `${res.cont[r.id]} ${r.rotulo}`).join(', '));
    const pct = Math.round(res.com * 100);
    comNum.textContent = pct + '%';
    if (final) {
      if (comAntes != null) {
        const d = pct - comAntes;
        comDelta.textContent = d === 0 ? '=' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d);
        comDelta.className = 'd mj-num ' + (d > 0 ? 'sobe' : d < 0 ? 'desce' : '');
      }
      comAntes = pct;
    }
    comBox.classList.remove('pisca'); void comBox.offsetWidth; comBox.classList.add('pisca');
    const lider = REACOES.filter((r) => r.id !== 'neutro').sort((a, b) => res.cont[b.id] - res.cont[a.id])[0];
    termoT.lastChild.textContent = lider && res.cont[lider.id] ? `${lider.icone} ${res.cont[lider.id]} ${res.cont[lider.id] === 1 ? adj(lider.id, 'm') : adj(lider.id, 'm', true)}` : '';
  }

  function desenharPlaca(res, n) {
    const t = TIPOS[res.tipo];
    placaN.textContent = n ? `frase ${n}` : 'falando…';
    placaTipo.textContent = `${t.icone} ${t.rotulo}`;
    placaGancho.replaceChildren();
    if (res.gancho != null) {
      placaGancho.append(el('span', { class: 'r', text: 'gancho' }));
      for (let i = 0; i < 5; i++) placaGancho.append(el('i', { class: i <= res.gancho ? 'on' : '' }));
      placaGancho.title = `Gancho: ${GANCHO[res.gancho]}`;
    }
    placa.classList.remove('troca'); void placa.offsetWidth; placa.classList.add('troca');
  }

  function corSaldo(s) {
    // −1 vermelho · 0 cinza · +0,5 dourado · +1 verde
    const stops = [[-1, [239, 68, 68]], [0, [161, 161, 170]], [0.5, [251, 191, 36]], [1, [74, 222, 128]]];
    for (let i = 1; i < stops.length; i++) {
      if (s <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i];
        const t = (s - a) / (b - a);
        return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`;
      }
    }
    return 'rgb(74,222,128)';
  }

  function desenharCurva() {
    const prontas = frases.filter((f) => f.pronta);
    const W = curvaBox.clientWidth, H = curvaBox.clientHeight;
    curvaVazia.hidden = prontas.length > 0;
    curvaSvg.replaceChildren();
    if (!W || !H || !prontas.length) { curvaBox.setAttribute('aria-label', 'Curva da fala: ainda sem frases'); return; }
    curvaSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const padX = 22, padT = 10, padB = 10;
    const maxV = Math.max(2, Math.floor((W - 2 * padX) / 22) + 1);
    const vis = prontas.slice(-maxV);
    const passo = vis.length > 1 ? Math.min(70, (W - 2 * padX) / (vis.length - 1)) : 0;
    const y = (c) => padT + (1 - c) * (H - padT - padB);
    const pts = vis.map((f, i) => [padX + i * passo, y(f.com)]);
    const ns = (tag, at) => { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(at)) n.setAttribute(k, v); return n; };
    // grade: 50%
    curvaSvg.append(ns('line', { x1: 0, x2: W, y1: y(0.5), y2: y(0.5), class: 'meio' }));
    if (pts.length > 1) {
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
        d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
      }
      const grad = ns('linearGradient', { id: 'pl-grad', x1: 0, x2: 1, y1: 0, y2: 0 });
      vis.forEach((f, i) => grad.append(ns('stop', { offset: vis.length > 1 ? i / (vis.length - 1) : 0, 'stop-color': corSaldo(f.saldo) })));
      const area = ns('linearGradient', { id: 'pl-area', x1: 0, x2: 0, y1: 0, y2: 1 });
      area.append(ns('stop', { offset: 0, 'stop-color': '#fbbf24', 'stop-opacity': 0.28 }), ns('stop', { offset: 1, 'stop-color': '#fbbf24', 'stop-opacity': 0 }));
      curvaSvg.append(ns('defs', {}), ns('path', { d: `${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`, fill: 'url(#pl-area)' }), ns('path', { d, class: 'linha', stroke: 'url(#pl-grad)' }));
      curvaSvg.querySelector('defs').append(grad, area);
    }
    vis.forEach((f, i) => {
      const c = ns('circle', { cx: pts[i][0], cy: pts[i][1], r: i === vis.length - 1 ? 7 : 5.5, fill: corSaldo(f.saldo), class: i === vis.length - 1 ? 'ultimo' : '' });
      c.addEventListener('pointerenter', () => mostrarDica(f, pts[i][0]));
      c.addEventListener('pointerleave', () => { curvaDica.hidden = true; });
      curvaSvg.append(c);
    });
    const ult = prontas[prontas.length - 1];
    curvaBox.setAttribute('aria-label', `Curva da fala: ${prontas.length} frases; a última com ${Math.round(ult.com * 100)}% com você`);
  }
  function mostrarDica(f, x) {
    const t = TIPOS[f.tipo];
    curvaDica.replaceChildren(el('b', { text: `Frase ${f.n} · ${t.icone} ${Math.round(f.com * 100)}%` }), el('span', { text: f.texto }));
    curvaDica.hidden = false;
    curvaDica.style.left = limita(x - 150, 0, Math.max(0, curvaBox.clientWidth - 300)) + 'px';
  }

  // ---------- ficha de uma pessoa ----------
  function abrirFicha(g) {
    fecharFicha(true);
    fichaAberta = g;
    const p = g.p, prontas = frases.filter((f) => f.pronta);
    const linhas = [
      ['😂 Ri de', p.ri], ['🤩 Se empolga com', p.empolga], ['😌 Se convence com', p.convence], ['🤨 Desconfia de', p.desconfia],
      [`😵‍💫 Fica ${adj('confuso', p.g)} com`, p.confunde], ['🥱 Se entedia com', p.entedia], ['😠 Se irrita com', p.irrita],
    ];
    const card = el('div', { class: 'pl-ficha', role: 'dialog', 'aria-label': `Ficha de ${p.nome}` }, [
      el('header', {}, [
        el('span', { class: 'av', text: p.avatar }),
        el('div', { class: 'id' }, [
          el('b', { text: `${p.nome}, ${p.idade}` }), el('span', { text: p.vida }),
          el('span', { class: 'agora' }, [el('span', { class: 'emo', text: g.emoji }), ` agora: ${adj(g.reacao, p.g)}`, g.prob ? el('span', { class: 'mj-num pc', text: ' · ' + fmt.pct(g.prob) }) : null]),
        ]),
        el('button', { class: 'x', type: 'button', 'aria-label': 'Fechar a ficha', onclick: () => fecharFicha() }, ['✕']),
      ]),
      el('dl', {}, linhas.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])),
      prontas.length ? el('p', { class: 'hist' }, [el('span', { class: 'r', text: 'Frase a frase' }), ...prontas.map((f) => el('span', { class: 'h', title: `Frase ${f.n}: ${adj(f.reacoes[p.id], p.g)}`, text: R[f.reacoes[p.id]]?.icone || '·' }))]) : null,
    ]);
    sala.append(card);
    const rs = sala.getBoundingClientRect(), ra = g.no.getBoundingClientRect();
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const L = parseFloat(sala.style.getPropertyValue('--cl')) || 16;
    let x = ra.left - rs.left + ra.width / 2 < rs.width / 2 ? ra.right - rs.left + 10 : ra.left - rs.left - cw - 10;
    x = limita(x, L, rs.width - L - cw);
    const y = limita(ra.top - rs.top + ra.height / 2 - ch / 2, 8, rs.height - ch - 8);
    card.style.left = x + 'px'; card.style.top = y + 'px';
    g.no.classList.add('em-foco');
  }
  function fecharFicha(semFoco) {
    const c = sala.querySelector('.pl-ficha');
    if (c) c.remove();
    if (fichaAberta) { fichaAberta.no.classList.remove('em-foco'); if (!semFoco) fichaAberta.no.focus(); }
    fichaAberta = null;
  }
  document.addEventListener('pointerdown', (e) => {
    if (fichaAberta && !e.target.closest('.pl-ficha') && !e.target.closest('.pl-assento')) fecharFicha(true);
  });

  // ---------- relatório ----------
  function perdas(prontas) {
    const eventos = [];
    prontas.forEach((f, k) => {
      const ant = prontas[k - 1];
      const caiu = gente.filter((g) => LADO[f.reacoes[g.p.id]] === 'contra' && (!ant || ant.reacoes[g.p.id] !== f.reacoes[g.p.id]));
      if (caiu.length < Math.max(2, Math.round(gente.length * 0.12))) return;
      const porR = {};
      for (const g of caiu) porR[f.reacoes[g.p.id]] = (porR[f.reacoes[g.p.id]] || 0) + 1;
      const rDom = topo(porR)[0][0];
      eventos.push({ f, r: rDom, quem: caiu.filter((g) => f.reacoes[g.p.id] === rDom) });
    });
    return eventos.sort((a, b) => b.quem.length - a.quem.length).slice(0, 3).sort((a, b) => a.f.n - b.f.n).map(({ f, r, quem }) => {
      const n = gente.length;
      let t;
      if (quem.length >= n * 0.9) t = `a plateia inteira ficou ${adj(r, 'f')} (${quem.length} de ${n})`;
      else {
        const porG = {};
        for (const g of quem) porG[g.p.grupo] = (porG[g.p.grupo] || 0) + 1;
        const [grupo, nG] = topo(porG)[0];
        const totalG = gente.filter((g) => g.p.grupo === grupo).length;
        const todasF = quem.every((g) => g.p.g === 'f');
        if (nG >= 2 && nG / totalG >= 0.6) {
          const resto = quem.length - nG;
          t = `${grupo} ficaram ${adj(r, /^as /.test(grupo) ? 'f' : 'm', true)} (${nG} de ${totalG})` + (resto > 0 ? ` e mais ${resto}` : '');
        } else t = `${nomes(quem)} ${quem.length === 1 ? 'ficou' : 'ficaram'} ${adj(r, todasF ? 'f' : 'm', quem.length > 1)}`;
      }
      return { n: f.n, icone: R[r].icone, t };
    });
  }

  function barrinha(f) {
    const b = el('span', { class: 'pl-mini', 'aria-hidden': 'true' });
    for (const r of REACOES) {
      const k = f.cont[r.id]; if (!k) continue;
      const s = el('i', {}); s.style.width = (100 * k / gente.length) + '%'; s.style.background = r.cor; b.append(s);
    }
    return b;
  }
  const domina = (f, lado) => {
    const r = REACOES.filter((x) => (lado ? x.lado === lado : x.id !== 'neutro')).sort((a, b) => f.cont[b.id] - f.cont[a.id])[0];
    return r && f.cont[r.id] ? `${r.icone} ${f.cont[r.id]} ${f.cont[r.id] === 1 ? adj(r.id, 'm') : adj(r.id, 'm', true)}` : '';
  };

  function abrirRelatorio() {
    const prontas = frases.filter((f) => f.pronta);
    if (!prontas.length) { ui.toast('Fale pelo menos uma frase para a plateia antes.'); return; }
    fecharFicha(true); alternarMenu(false);
    const media = prontas.reduce((s, f) => s + f.com, 0) / prontas.length;
    const melhor = prontas.slice().sort((a, b) => b.com - a.com || b.saldo - a.saldo)[0];
    const pior = prontas.slice().sort((a, b) => a.saldo - b.saldo || a.com - b.com)[0];
    const linhasPerda = perdas(prontas);
    const ult = prontas[prontas.length - 1];
    const contraFim = gente.filter((g) => LADO[ult.reacoes[g.p.id]] === 'contra');
    const cartao = (cls, titulo, f, extra) => el('article', { class: 'pl-rel-card ' + cls }, [
      el('h4', { text: titulo }),
      el('p', { class: 'fr', text: `«${f.texto}»` }),
      el('p', { class: 'num' }, [el('b', { class: 'mj-num', text: Math.round(f.com * 100) + '%' }), ' com você · frase ' + f.n]),
      el('p', { class: 'dom', text: extra }),
      barrinha(f),
      el('p', { class: 'meta', text: `${TIPOS[f.tipo].icone} ${TIPOS[f.tipo].rotulo}` + (f.gancho != null ? ` · gancho: ${GANCHO[f.gancho]}` : '') }),
    ]);
    const fechar = el('button', { class: 'pl-bt', type: 'button', onclick: () => fecharRelatorio() }, ['Voltar à plateia']);
    relatorio.replaceChildren(el('div', { class: 'pl-rel' }, [
      el('header', {}, [
        el('div', { class: 'tit' }, [el('h3', { text: 'Relatório da plateia' }), el('p', { class: 'sub', text: `${plateia.icone} ${plateia.rotulo} · ${prontas.length} ${prontas.length === 1 ? 'frase' : 'frases'} · média de ${Math.round(media * 100)}% com você` })]),
        el('div', { class: 'pl-rel-acoes' }, [
          el('button', { class: 'pl-bt pl-bt--ouro', type: 'button', onclick: () => { fecharRelatorio(); recomecar(); } }, ['🎤 Falar de novo']),
          fechar,
        ]),
      ]),
      el('div', { class: 'pl-rel-cards' }, [
        cartao('melhor', '🏆 Melhor frase', melhor, domina(melhor, 'com') || domina(melhor)),
        prontas.length > 1 ? cartao('pior', '💀 Pior frase', pior, domina(pior, 'contra') || domina(pior)) : el('article', { class: 'pl-rel-card pior' }, [el('h4', { text: '💀 Pior frase' }), el('p', { class: 'fr', text: 'Fale mais frases para comparar.' })]),
        el('article', { class: 'pl-rel-card perdeu' }, [
          el('h4', { text: '👋 Quem você perdeu' }),
          linhasPerda.length ? el('ul', {}, linhasPerda.map((x) => el('li', {}, [el('b', { text: `Frase ${x.n} ${x.icone}` }), ' ' + x.t]))) : el('p', { class: 'fr', text: 'Ninguém virou contra você de uma frase para a outra. 👏' }),
          el('p', { class: 'dom', text: contraFim.length ? `No fim, ${contraFim.length} ainda ${contraFim.length === 1 ? 'estava' : 'estavam'} contra você: ${nomes(contraFim)}.` : 'No fim, ninguém estava contra você.' }),
        ]),
      ]),
      el('div', { class: 'pl-rel-lista' }, [
        el('h4', { text: 'Frase a frase' }),
        el('ol', {}, prontas.map((f) => el('li', {}, [
          el('span', { class: 'n mj-num', text: f.n }),
          el('span', { class: 'tp', title: TIPOS[f.tipo].rotulo, text: TIPOS[f.tipo].icone }),
          el('span', { class: 'tx', text: f.texto }),
          barrinha(f),
          el('b', { class: 'pc mj-num', text: Math.round(f.com * 100) + '%' }),
        ]))),
      ]),
    ]));
    relatorioAberto = true;
    btFim.classList.remove('chama');
    raiz.classList.add('fechada');
    relatorio.hidden = false;
    relatorio.classList.remove('aberto');
    setTimeout(() => { if (relatorioAberto) { relatorio.classList.add('aberto'); fechar.focus({ preventScroll: true }); } }, reduz ? 0 : 480);
    tocarSom('fim', () => som.aplauso(0.6));
  }

  function fecharRelatorio(rapido) {
    if (!relatorioAberto) return;
    relatorioAberto = false;
    relatorio.classList.remove('aberto');
    relatorio.hidden = true;
    raiz.classList.remove('fechada');
    if (!rapido) btFim.focus({ preventScroll: true });
  }

  // ---------- trocar de plateia e recomeçar ----------
  async function trocarPlateia(id) {
    alternarMenu(false);
    const nova = spec.plateias.find((p) => p.id === id);
    if (!nova || nova === plateia) return;
    fecharRelatorio(true); fecharFicha(true);
    raiz.classList.add('fechada');
    await new Promise((ok) => setTimeout(ok, reduz ? 0 : 520));
    plateia = nova;
    desenharEscolha();
    montarAssentos();
    novaBarra();
    recomecar(true);
    raiz.classList.remove('fechada');
    btEscolha.focus({ preventScroll: true });
  }

  function recomecar(semLimpar) {
    versao++;
    frases = []; fragmento = ''; ultimaParcial = ''; comAntes = null; seqAplicado = seq;
    if (!semLimpar && barra) barra.limpar();
    for (const g of gente) {
      g.reacao = 'neutro'; g.prob = 0; g.emoji = ROSTO.neutro; g.rosto.textContent = ROSTO.neutro;
      g.no.dataset.r = 'neutro'; g.no.style.removeProperty('--rc');
      g.no.setAttribute('aria-label', `${g.p.nome}, ${g.p.idade} anos, ${g.p.vida}: neutro. Ver a ficha`);
    }
    camadaBaloes.replaceChildren(); camadaEfeitos.replaceChildren();
    const cont = Object.fromEntries(REACOES.map((r) => [r.id, 0])); cont.neutro = gente.length;
    termometro({ cont, com: 0 }, false);
    comNum.textContent = '—'; comDelta.textContent = ''; comDelta.className = 'd mj-num';
    termoT.lastChild.textContent = 'fale a primeira frase';
    placaN.textContent = ''; placaTipo.textContent = '🎤 A plateia está esperando'; placaGancho.replaceChildren();
    sala.dataset.clima = 'calmo';
    btFim.disabled = true; btFim.classList.remove('chama');
    desenharCurva();
  }

  // ---------- começo ----------
  desenharEscolha();
  montarAssentos();
  novaBarra();
  recomecar(true);

  // ---------- demonstração ----------
  async function esperarJev(sinal) {
    await sleep(150, sinal);
    for (let i = 0; i < 50 && emVoo > 0; i++) await sleep(100, sinal);
  }

  async function tocar(sinal) {
    fecharRelatorio(true); fecharFicha(true);
    if (plateia.id !== 'youtube') await trocarPlateia('youtube');
    recomecar();
    await sleep(700, sinal);
    for (const frase of DEMO) {
      barra.limpar();
      await barra.simular(frase, { sinal, velocidade: 1.2 });
      await esperarJev(sinal);
      await sleep(1150, sinal);
    }
    await sleep(400, sinal);
    abrirRelatorio();
    await sleep(6000, sinal);
  }

  return { tocar };
}

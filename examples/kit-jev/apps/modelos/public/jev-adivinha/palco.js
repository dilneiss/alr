// Tela do "O Jev Adivinha": corrida dos palpites, a carta do palpite e as categorias acendendo enquanto você fala.
// A cada pausa da fala vai UMA chamada (jogada "palpite"); a chance de cada item = chance da categoria × chance do item.

// respostas ao palpite, lidas no texto sem acento: "acertou", "isso", "é isso"… e "não é", "não", "errou"…
const SIM = /(^|[^a-z])(acertou|acerto|isso|exato|na mosca|certo|sim|e ele|e ela|correto)([^a-z]|$)/;
const NAO = /^\W*(nao|errou|errado|nada a ver|negativo|nope)([^a-z]|$)/;

// demonstração: o alvo, as pistas e o que a "pessoa" responde
const ROTEIRO = [
  { alvo: 'pinguim', pistas: ['É um bicho que vive no gelo.', 'Ele não voa.', 'E parece que anda de terno.'] },
  { alvo: 'helicoptero', pistas: ['É um veículo que voa.', 'Mas ele não tem asa.', 'Tem uma hélice enorme em cima e fica parado no ar.'] },
  { alvo: 'brigadeiro', pistas: ['É uma comida doce.', 'Pequena e redonda.', 'Tem em toda festa de aniversário, de chocolate com granulado.'] },
];

const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, esc, fmt, sleep } = ui;
  const CAT = spec.catalogo;
  const L = spec.limiar;
  const ITEM = {};
  for (const c of CAT) for (const [id, nome, emoji] of c.itens) ITEM[id] = { id, nome, emoji, cat: c.id };
  const perguntar = api.ultima();

  // ---------- estado ----------
  let fase = 'ouvindo';       // ouvindo · arriscou · acertou
  let jaErrou = [];           // ids que a pessoa recusou nesta rodada
  let palpite = null;         // item em que o Jev arriscou
  let textoNoPalpite = '';    // o que já tinha sido dito quando ele arriscou
  let rodada = 1, acertos = 0, palavrasAteAcertar = [];
  let emVoo = 0;              // chamadas em andamento (a demonstração espera)
  let ultimaLista = [];
  const linhas = new Map();   // id → linha da corrida

  // ---------- tela ----------
  const raiz = el('div', { class: 'ad' });
  const corrida = el('ol', { class: 'ad-corrida', 'aria-label': 'Os palpites mais prováveis' });
  const cats = el('div', { class: 'ad-cats' });
  const tiles = {};
  for (const c of CAT) {
    const t = el('div', { class: 'ad-cat' }, [el('span', { class: 'ic', text: c.icone }), el('span', { class: 'nm', text: c.rotulo }), el('span', { class: 'pc mj-num', text: '' }), el('i', { class: 'br' })]);
    tiles[c.id] = t; cats.append(t);
  }
  const orbe = el('div', { class: 'ad-orbe' }, [el('span', { class: 'emo', text: '🔮' })]);
  const rotulo = el('p', { class: 'ad-rotulo', text: 'Pense numa coisa' });
  const nome = el('h2', { class: 'ad-nome', text: 'e descreva sem dizer o nome' });
  const certeza = el('p', { class: 'ad-certeza mj-num', text: '' });
  const btSim = el('button', { class: 'ad-bt sim', type: 'button', onclick: () => confirmar(true) }, ['✅ Acertou']);
  const btNao = el('button', { class: 'ad-bt nao', type: 'button', onclick: () => confirmar(false) }, ['❌ Não é']);
  const btNova = el('button', { class: 'ad-bt nova', type: 'button', onclick: () => novaRodada() }, ['Próxima rodada →']);
  const acoes = el('div', { class: 'ad-acoes' }, [btSim, btNao, btNova]);
  const aviso = el('p', { class: 'ad-aviso', role: 'status' });
  const cartao = el('section', { class: 'ad-cartao fase-ouvindo' }, [rotulo, orbe, nome, certeza, acoes, aviso]);
  const confete = el('div', { class: 'ad-confete', 'aria-hidden': 'true' });
  const hist = el('ol', { class: 'ad-hist', 'aria-label': 'Rodadas que o Jev acertou' });
  const placar = el('div', { class: 'ad-placar' }, [
    el('span', {}, ['Rodada ', el('b', { class: 'mj-num', id: 'ad-rod', text: '1' })]),
    el('span', {}, ['Jev acertou ', el('b', { class: 'mj-num', id: 'ad-ac', text: '0' })]),
    el('span', { class: 'ad-media' }, ['média ', el('b', { class: 'mj-num', id: 'ad-med', text: '—' }), ' palavras']),
  ]);

  const barra = api.voz.barraVoz({
    exemplos: [
      { rotulo: '🐧 bicho do gelo', texto: 'É um bicho que vive no gelo. Ele não voa. E parece que anda de terno.' },
      { rotulo: '🚁 voa sem asa', texto: 'É um veículo que voa. Mas não tem asa. Tem uma hélice enorme em cima.' },
      { rotulo: '🍫 doce de festa', texto: 'É uma comida doce, pequena e redonda, de festa de aniversário.' },
      { rotulo: '🧛 medo de alho', texto: 'Não existe de verdade. Dorme num caixão e tem medo de alho.' },
    ],
    dica: 'Aperte o microfone e descreva uma coisa sem dizer o nome',
    placeholder: 'Ou digite uma pista e aperte Enter',
    onPausa: (texto) => aoFalar(texto),
    onExemplo: () => { if (barra.texto || fase !== 'ouvindo') novaRodada(); },   // cada exemplo é uma coisa nova
  });

  raiz.append(
    el('div', { class: 'ad-palco' }, [
      el('section', { class: 'ad-painel ad-esq' }, [el('header', {}, [el('h3', { text: 'Corrida dos palpites' }), el('span', { class: 'mj-num ad-total', text: `${Object.keys(ITEM).length} na disputa` })]), corrida, hist]),
      el('div', { class: 'ad-centro' }, [el('div', { class: 'ad-fita' }, [api.fita.no]), cartao, confete]),
      el('section', { class: 'ad-painel ad-dir' }, [el('header', {}, [el('h3', { text: 'Que tipo de coisa?' })]), cats, placar, api.som.botao(el)]),
    ]),
    el('div', { class: 'ad-voz' }, [barra.no]),
  );
  area.append(raiz);
  desenharCorrida([]);

  // ---------- conversa com o Jev ----------
  function palavras(t) { return (String(t).match(/[\p{L}\p{N}]+/gu) || []).length; }

  async function aoFalar(texto) {
    if (fase === 'acertou') return;
    if (fase === 'arriscou') {
      const novo = texto.slice(textoNoPalpite.length).trim();
      if (!novo) return;
      const t = semAcento(novo);
      if (SIM.test(t) && !NAO.test(t)) return confirmar(true);
      if (NAO.test(t)) return confirmar(false);
      if (palavras(novo) < 4) return;   // ainda não deu para saber: espera mais
      // a pessoa seguiu descrevendo: o palpite volta para a disputa
      fase = 'ouvindo'; palpite = null; atualizarFase();
    }
    if (palavras(texto) < 2) return;
    vigiarNome(texto);
    emVoo++;
    let r;
    try {
      r = await perguntar('palpite', { descricao: texto, ja_errou: jaErrou.map((id) => ITEM[id].nome), ja_errou_ids: jaErrou }, `"${texto.slice(-38)}"`);
    } catch { r = null; } finally { emVoo--; }
    if (!r || fase === 'acertou') return;
    aplicar(r, texto);
  }

  function combinar(r) {
    const pc = (r.categoria && r.categoria.probabilities) || {};
    const lista = [];
    for (const c of CAT) {
      const a = r['c_' + c.id]; if (!a) continue;
      for (const [id, p] of Object.entries(a.probabilities || {})) if (id !== 'nenhum' && ITEM[id]) lista.push({ ...ITEM[id], p: (pc[c.id] || 0) * p });
    }
    lista.sort((a, b) => b.p - a.p);
    return { pc, lista };
  }

  function aplicar(r, texto) {
    const { pc, lista } = combinar(r);
    ultimaLista = lista;
    desenharCorrida(lista.filter((x) => x.p >= 0.005).slice(0, 8));
    desenharCats(pc);
    const [a, b] = lista;
    const n = palavras(texto);
    if (fase === 'ouvindo' && a && a.p >= L.arriscar && a.p >= (b ? b.p : 0) * L.folga && n >= L.minimoPalavras) {
      fase = 'arriscou'; palpite = a; textoNoPalpite = texto;
      som.ding();
      mostrarPalpite(a, 'arriscou');
    } else if (fase === 'ouvindo') {
      if (a && a.p >= 0.3) mostrarPalpite(a, 'palpite');
      else {
        const [ct, pct] = Object.entries(pc).filter(([k]) => k !== 'nao_sei').sort((x, y) => y[1] - x[1])[0] || [];
        const c = CAT.find((x) => x.id === ct);
        if (c && pct >= 0.6) mostrarPensando(`Já sei: ${c.rotulo.toLowerCase()}…`, c.icone, 'mas qual? Mais uma pista!');
        else mostrarPensando('Hmm…', '🤔', 'me dá mais uma pista');
      }
    }
  }

  function mostrarPensando(r1, emo, r2) {
    rotulo.textContent = r1; nome.textContent = r2; certeza.textContent = '';
    trocarEmoji(emo); orbe.style.setProperty('--p', '0');
    cartao.className = 'ad-cartao fase-pensando';
  }

  function mostrarPalpite(it, tipo) {
    rotulo.textContent = tipo === 'arriscou' ? 'Acho que é…' : 'Será que é…';
    nome.textContent = it.nome;
    certeza.textContent = `${fmt.pct(it.p)} de certeza`;
    trocarEmoji(it.emoji);
    orbe.style.setProperty('--p', it.p.toFixed(3));
    cartao.className = 'ad-cartao fase-' + tipo;
    aviso.textContent = tipo === 'arriscou' ? 'Diga "acertou" ou "não é" — ou use os botões' : '';
  }

  function trocarEmoji(e) {
    const atual = orbe.querySelector('.emo');
    if (atual.textContent === e) return;
    const novo = el('span', { class: 'emo entra', text: e });
    atual.classList.add('sai'); setTimeout(() => atual.remove(), 260);
    orbe.append(novo);
  }

  function atualizarFase() { cartao.classList.toggle('fase-arriscou', fase === 'arriscou'); }

  function confirmar(acertou) {
    if (fase !== 'arriscou' || !palpite) return;
    if (acertou) {
      fase = 'acertou';
      acertos++;
      const n = palavras(textoNoPalpite); palavrasAteAcertar.push(n);
      rotulo.textContent = 'Acertei!';
      nome.textContent = `É ${palpite.nome}!`;
      certeza.textContent = `com ${n} ${n === 1 ? 'palavra' : 'palavras'} · ${fmt.pct(palpite.p)} de certeza`;
      cartao.className = 'ad-cartao fase-acertou';
      aviso.textContent = '';
      som.acerto(); soltarConfete();
      document.getElementById('ad-ac').textContent = acertos;
      hist.prepend(el('li', {}, [el('span', { class: 'emo', text: palpite.emoji }), el('span', { class: 'nm', text: palpite.nome }), el('span', { class: 'mj-num', text: `${n} palavras` })]));
      while (hist.children.length > 4) hist.lastChild.remove();
      document.getElementById('ad-med').textContent = fmt.num(palavrasAteAcertar.reduce((s, x) => s + x, 0) / palavrasAteAcertar.length, 1);
    } else {
      som.erro();
      jaErrou.push(palpite.id);
      aviso.textContent = `Anotado: não é ${palpite.nome}. Continue descrevendo…`;
      const recusado = palpite;
      fase = 'ouvindo'; palpite = null;
      mostrarPensando(`Não é ${recusado.nome}…`, '🙃', 'então me dá outra pista');
      // pergunta de novo já sem o item recusado
      const t = barra.texto; if (t) setTimeout(() => aoFalar(t + ' '), 60);
    }
  }

  function novaRodada() {
    fase = 'ouvindo'; jaErrou = []; palpite = null; textoNoPalpite = '';
    if (cartao.classList.contains('fase-acertou')) rodada++;
    document.getElementById('ad-rod').textContent = rodada;
    barra.limpar();
    rotulo.textContent = 'Pense numa coisa'; nome.textContent = 'e descreva sem dizer o nome'; certeza.textContent = ''; aviso.textContent = '';
    trocarEmoji('🔮'); orbe.style.setProperty('--p', '0');
    cartao.className = 'ad-cartao fase-ouvindo';
    desenharCorrida([]); desenharCats({});
  }

  // "Você disse o nome!" — vale a brincadeira, sem anular a rodada
  function vigiarNome(texto) {
    const t = ' ' + semAcento(texto).replace(/[^a-z0-9 -]/g, ' ') + ' ';
    const dito = Object.values(ITEM).find((it) => {
      const n = semAcento(it.nome.replace(/\s*\(.*\)/, ''));
      return n.length > 2 && t.includes(' ' + n + ' ');
    });
    aviso.textContent = dito && fase === 'ouvindo' ? `🙊 Você falou "${dito.nome}"! Assim é fácil…` : (fase === 'ouvindo' ? '' : aviso.textContent);
  }

  // ---------- corrida (as linhas trocam de lugar animadas) ----------
  function desenharCorrida(top) {
    const antes = new Map([...linhas].map(([id, n]) => [id, n.getBoundingClientRect().top]));
    const ids = top.map((x) => x.id);
    for (const [id, n] of linhas) if (!ids.includes(id)) { n.classList.add('sai'); setTimeout(() => n.remove(), 280); linhas.delete(id); }
    if (!top.length && !corrida.querySelector('.ad-vazio')) corrida.append(el('li', { class: 'ad-vazio', text: 'Os palpites aparecem aqui assim que você começar a descrever.' }));
    if (top.length) corrida.querySelectorAll('.ad-vazio').forEach((n) => n.remove());
    top.forEach((it, i) => {
      let n = linhas.get(it.id);
      if (!n) {
        n = el('li', { class: 'ad-linha entra' }, [el('span', { class: 'emo', text: it.emoji }), el('span', { class: 'nm', text: it.nome }), el('span', { class: 'pc mj-num' }), el('i', { class: 'br' })]);
        linhas.set(it.id, n);
      }
      n.style.setProperty('--p', Math.max(0.01, it.p).toFixed(3));
      n.querySelector('.pc').textContent = it.p >= 0.995 ? '99%' : it.p < 0.01 ? '<1%' : fmt.pct(it.p);
      n.classList.toggle('lider', i === 0 && it.p >= 0.3);
      corrida.append(n);
    });
    // FLIP: cada linha sai de onde estava e desliza para o lugar novo
    for (const [id, n] of linhas) {
      const a = antes.get(id); if (a == null) continue;
      const d = a - n.getBoundingClientRect().top;
      if (Math.abs(d) < 1) continue;
      n.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  function desenharCats(pc) {
    const top = Object.entries(pc).filter(([k]) => k !== 'nao_sei').sort((a, b) => b[1] - a[1])[0];
    for (const c of CAT) {
      const p = pc[c.id] || 0, t = tiles[c.id];
      t.style.setProperty('--p', p.toFixed(3));
      t.querySelector('.pc').textContent = p >= 0.01 ? fmt.pct(p) : '';
      t.classList.toggle('acesa', !!top && top[0] === c.id && p >= 0.5);
    }
  }

  function soltarConfete() {
    if (ui.reduzMovimento) return;
    confete.innerHTML = '';
    const cores = ['#ff4fa3', '#ffc93c', '#5eead4', '#a78bfa', '#fb7185', '#fde047'];
    for (let i = 0; i < 46; i++) {
      const s = el('i', {});
      s.style.setProperty('--x', (Math.random() * 2 - 1).toFixed(2));
      s.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      s.style.setProperty('--d', (0.9 + Math.random() * 0.9).toFixed(2) + 's');
      s.style.background = cores[i % cores.length];
      s.style.left = (30 + Math.random() * 40) + '%';
      confete.append(s);
    }
    setTimeout(() => { confete.innerHTML = ''; }, 2200);
  }

  // ---------- demonstração ----------
  async function esperarJev(sinal) {
    await sleep(120, sinal);
    for (let i = 0; i < 40 && emVoo > 0; i++) await sleep(100, sinal);
  }

  async function tocar(sinal) {
    for (const r of ROTEIRO) {
      novaRodada();
      await sleep(700, sinal);
      for (const pista of r.pistas) {
        await barra.simular(pista, { sinal });
        await esperarJev(sinal);
        await sleep(650, sinal);
        if (fase === 'arriscou') {
          const certo = palpite && palpite.id === r.alvo;
          await sleep(500, sinal);
          await barra.simular(certo ? 'Acertou!' : 'Não é.', { sinal });
          await esperarJev(sinal);
          if (fase === 'arriscou') confirmar(certo);
          if (certo) break;
          await sleep(500, sinal);
        }
      }
      await sleep(2300, sinal);
    }
    novaRodada();
  }

  return { tocar };
}

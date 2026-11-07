// Detector de Pegadinhas no Checkout — a extensão lê a página de pagamento e o Jev marca, linha por linha, o que cobra além do que você viu.
// Para adaptar: troque os tipos de pegadinha (PEGADINHAS) pelos que você quer pegar e cole as páginas da sua loja nos exemplos.
const PEGADINHAS = [
  { id: 'taxa_escondida', rotulo: 'Taxa escondida', icone: '🧾', cor: '#f87171', desc: 'taxa que só aparece no pagamento ou tem nome vago: "taxa de conveniência", "taxa de serviço", "taxa de processamento"' },
  { id: 'contagem_falsa', rotulo: 'Pressa fabricada', icone: '⏰', cor: '#fbbf24', desc: 'pressão de tempo ou de estoque: "oferta acaba em 04:59", "só restam 2", "128 pessoas vendo agora"' },
  { id: 'item_pre_marcado', rotulo: 'Item já marcado', icone: '☑️', cor: '#fb923c', desc: 'caixa já marcada (☑) que adiciona produto, garantia, seguro ou doação de cobrança ÚNICA sem você pedir' },
  { id: 'assinatura_disfarcada', rotulo: 'Assinatura disfarçada', icone: '🔁', cor: '#f43f5e', desc: 'cobrança que se repete (por mês ou por ano) escondida como teste grátis, clube ou benefício; vale mesmo se a caixa já vier marcada' },
  { id: 'preco_isca', rotulo: 'Preço isca', icone: '🎣', cor: '#e879f9', desc: 'o preço cobrado é maior que o anunciado ("a partir de", promoção que sumiu, lote esgotado)' },
  { id: 'frete_surpresa', rotulo: 'Frete surpresa', icone: '🚚', cor: '#a78bfa', desc: 'frete que aparece só no fim ou maior do que o anúncio prometia ("frete grátis" que virou cobrança)' },
  { id: 'nenhuma', rotulo: 'Sem pegadinha', icone: '✓', cor: '#34d399', tom: 'bom', desc: 'linha normal: nome da loja, produto com preço claro, caixa desmarcada (☐), subtotal, total, prazo, forma de pagamento, botão' },
];
const POR_ID = Object.fromEntries(PEGADINHAS.map((p) => [p.id, p]));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// contas feitas pelo código (o Jev só marca a linha): o "R$ x" da linha, a mensalidade "R$ x/mês" e as linhas de total, que nunca somam
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));
const valorDe = (t) => { const m = /R\$\s?([\d.]+,\d{2})/.exec(t); return m ? num(m[1]) : 0; };
const recorrenteDe = (t) => { const m = /R\$\s?([\d.]+,\d{2})\s*(?:\/|por\s+)(mês|ano)/i.exec(t); return m ? { valor: num(m[1]), por: m[2].toLowerCase() } : null; };
const ehTotal = (t) => /^\s*(sub)?total\b/i.test(t);
const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default {
  id: 'pegadinhas-checkout',
  titulo: 'Detector de Pegadinhas no Checkout',
  emoji: '🕵️',
  categoria: 'confianca',
  ordem: 22,
  resumo: 'Antes de você clicar em "Pagar", o Jev lê a página linha por linha e marca a taxa escondida, a assinatura disfarçada e a pressa fabricada.',
  descricao: 'Uma extensão do navegador manda o texto da página de pagamento e o Jev decide, numa passada só, o tipo de pegadinha de cada linha e um veredito geral. Quanto as pegadinhas custam é conta do código, não do Jev. "Frete grátis" no anúncio e frete cobrado no fim é o tipo de coisa que um filtro de palavras não pega.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#ec4899', acento2: '#f59e0b' },
  origem: 'ideia sem dono da lista awesome-jev ("price traps")',

  contexto: {
    quem_usa: 'extensão do navegador de quem compra online; ela lê a página de pagamento antes do clique em "Pagar"',
    objetivo: 'mostrar tudo o que a página cobra além do que o anúncio mostrou, para a pessoa decidir com calma',
  },

  aovivo: {
    skin: 'checkout',
    janela: 'Página de pagamento · texto lido pela extensão',
    rotulo: 'Página de pagamento',
    placeholder: 'Cole aqui o texto de uma página de pagamento (uma linha por item)…',
    dica: 'Cada linha vira uma pergunta. ☑ = caixa marcada, ☐ = desmarcada.',
    digitar: false,
    pausa: 7000,
    rotuloLinha: 'Linha da página',
    campo: 'pagina',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', papel: 'destaque', titulo: 'Veredito',
      pergunta: 'A página de pagamento tem alguma destas pegadinhas: (1) taxa escondida ou com nome vago; (2) contagem regressiva ou estoque que pressiona; (3) caixa já marcada que adiciona item, seguro ou doação; (4) assinatura ou cobrança que se repete, disfarçada; (5) preço maior que o anunciado; (6) frete que só aparece no fim? Sem nenhuma: confiável. Só pressão de tempo ou um item barato já marcado e fácil de desmarcar: atenção. Taxa escondida, assinatura disfarçada, preço maior que o anunciado ou frete surpresa: evite.',
      opcoes: [
        { id: 'confiavel', rotulo: 'Confiável', icone: '✅', cor: '#34d399', desc: 'preço claro e sem pegadinha: você paga o que viu' },
        { id: 'atencao', rotulo: 'Atenção', icone: '✋', cor: '#fbbf24', desc: 'só pressão de tempo ou um item pequeno já marcado: dá para comprar, desmarcando e sem pressa' },
        { id: 'evite', rotulo: 'Evite', icone: '⛔', cor: '#f87171', desc: 'cobra mais do que mostrou: taxa escondida, assinatura disfarçada, preço maior que o anunciado ou frete surpresa' },
      ],
    },
    {
      id: 'recorrente', tipo: 'noul', papel: 'alerta', titulo: 'Cobrança que se repete', rotulo: 'cobrança recorrente', icone: '🔁', tom: 'ruim', limiar: 0.5,
      mensagem: 'Esta compra liga uma cobrança que se repete', mensagemOk: 'Nenhuma cobrança recorrente escondida nesta página.',
      pergunta: 'Se a pessoa pagar a página do jeito que está, com as caixas ☑ como vieram marcadas, ela passa a ter uma cobrança que se repete (por mês ou por ano), mesmo que comece só depois de um período grátis?',
    },
    {
      // papel 'tela': o motor não monta a lista padrão; o render abaixo desenha o checkout com as linhas marcadas
      id: 'pegadinha', tipo: 'choice', porLinha: true, papel: 'tela', titulo: 'Pegadinha (por linha)',
      pergunta: 'Que pegadinha esta linha da página de pagamento tem? Julgue só a linha indicada, usando a página inteira (campo pagina) como contexto. Cobrança que se repete é assinatura disfarçada, mesmo com a caixa marcada; caixa marcada com cobrança única é item já marcado.',
      opcoes: PEGADINHAS.map(({ id, rotulo, icone, desc, tom }) => ({ id, rotulo, icone, desc, tom: tom || 'ruim' })),
    },
  ],

  // o checkout como a pessoa veria, com as linhas que o Jev marcou; a soma em reais é feita pelo código
  render(r) {
    const linhas = r.linhas || [];
    let unico = 0, mensal = 0, anual = 0, n = 0;
    const rows = linhas.map((l, i) => {
      const a = l.respostas && l.respostas.pegadinha;
      const p = a && POR_ID[a.choice];
      const ruim = p && p.id !== 'nenhuma';
      if (ruim) {
        n++;
        const rec = recorrenteDe(l.texto);
        if (ehTotal(l.texto)) { /* total não é cobrança nova */ }
        else if (p.id === 'assinatura_disfarcada' && rec) { if (rec.por === 'ano') anual += rec.valor; else mensal += rec.valor; }
        else if (['taxa_escondida', 'item_pre_marcado', 'frete_surpresa'].includes(p.id)) unico += valorDe(l.texto);
      }
      const conf = a ? Math.round((a.probabilities?.[a.choice] ?? 0) * 100) : 0;
      const estilo = ruim ? `border-left:3px solid ${p.cor};background:color-mix(in srgb, ${p.cor} 11%, transparent)` : 'border-left:3px solid transparent';
      const etiqueta = ruim ? `<span class="mj-chip" style="color:${p.cor};border-color:${p.cor}">${p.icone} ${esc(p.rotulo)} · ${conf}%</span>` : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;${estilo}${i === 0 ? ';font-weight:700' : ''}"><span style="min-width:0;overflow-wrap:anywhere">${esc(l.texto)}</span>${etiqueta}</div>`;
    }).join('');
    const custo = unico || mensal || anual
      ? `💸 Pegadinhas com preço nesta página: <b>${brl(unico)}</b>${mensal ? ` agora + <b>${brl(mensal)}/mês</b>` : ''}${anual ? ` + <b>${brl(anual)}/ano</b>` : ''} <span class="dim">(soma feita pelo código)</span>`
      : (n ? 'As pegadinhas desta página não têm preço direto: é pressa ou preço trocado.' : '✅ Nada a mais do que o que você viu.');
    return `<div class="mj-widget mj-painel-box"><h4>Checkout com lupa <span class="tp">${n} pegadinha${n === 1 ? '' : 's'} em ${linhas.length} linhas</span></h4><div style="display:grid;gap:3px;font-size:13.5px">${rows}</div><p style="margin:10px 0 0;font-size:13px">${custo}</p></div>`;
  },

  exemplos: [
    {
      titulo: 'Tênis com tudo incluso',
      texto: 'Vitrine Fácil · Finalizar compra\n⏰ Oferta relâmpago: termina em 04:59\nTênis Corrida Leve Pro, tamanho 40 — R$ 189,90\n🔥 Só restam 2 unidades no seu tamanho\n☑ Garantia estendida de 12 meses — R$ 29,90\n☑ Clube Vitrine+: 30 dias grátis, depois R$ 29,90/mês\nFrete expresso: R$ 34,90 (o anúncio dizia “frete grátis”)\nTaxa de conveniência: R$ 9,90\nTotal: R$ 264,60\nPagar agora',
      esperado: { veredito: 'evite', recorrente: true },
      esperadoLinhas: [
        { pegadinha: 'nenhuma' }, { pegadinha: 'contagem_falsa' }, { pegadinha: 'nenhuma' }, { pegadinha: 'contagem_falsa' }, { pegadinha: 'item_pre_marcado' },
        { pegadinha: 'assinatura_disfarcada' }, { pegadinha: 'frete_surpresa' }, { pegadinha: 'taxa_escondida' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' },
      ],
    },
    {
      titulo: 'Mercado online',
      texto: 'Mercado Bom Preço · Seu carrinho\nArroz integral 5 kg — R$ 27,90\nCafé torrado 500 g — R$ 18,49\nAzeite extra virgem 500 ml — R$ 39,90\n⏳ Preços garantidos por mais 09:59\n☑ Arredondar e doar R$ 0,71 ao Projeto Mata Viva\n☐ Sacola retornável (+ R$ 3,50)\nEntrega agendada amanhã, 8h–12h: R$ 9,90 (o mesmo valor mostrado no carrinho)\nTotal: R$ 96,90\nPagar com Pix ou cartão',
      esperado: { veredito: 'atencao', recorrente: false },
      esperadoLinhas: [
        { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'contagem_falsa' },
        { pegadinha: 'item_pre_marcado' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' },
      ],
    },
    {
      titulo: 'Livraria honesta',
      texto: 'Livraria Sereno · Pagamento\nA Casa das Marés (capa comum) — R$ 59,90\n☐ Embrulho para presente (+ R$ 5,00)\nFrete PAC: R$ 12,40 (o mesmo calculado no carrinho)\nPrazo: 5 a 7 dias úteis\nTotal: R$ 72,30\nParcele em até 3x sem juros no cartão\nSem taxas extras: você paga exatamente o total acima.\nConfirmar pedido',
      esperado: { veredito: 'confiavel', recorrente: false },
      esperadoLinhas: [
        { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' },
        { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' },
      ],
    },
    {
      titulo: 'Ingresso de show',
      texto: 'Palco Certo · Checkout\nFestival Sons do Cerrado · Pista · anunciado “a partir de R$ 80”\nIngresso Pista (1º lote esgotado): R$ 160,00\nTaxa de serviço: R$ 32,00\nTaxa de processamento: R$ 7,50\n👀 128 pessoas estão vendo este evento agora\n☑ Palco Certo Prime: entrada antecipada, 7 dias grátis e depois R$ 19,90/mês\nTotal hoje: R$ 199,50\nFinalizar',
      esperado: { veredito: 'evite', recorrente: true },
      esperadoLinhas: [
        { pegadinha: 'nenhuma' }, null, { pegadinha: 'preco_isca' }, { pegadinha: 'taxa_escondida' }, { pegadinha: 'taxa_escondida' },
        { pegadinha: 'contagem_falsa' }, { pegadinha: 'assinatura_disfarcada' }, { pegadinha: 'nenhuma' }, { pegadinha: 'nenhuma' },
      ],
    },
  ],
};

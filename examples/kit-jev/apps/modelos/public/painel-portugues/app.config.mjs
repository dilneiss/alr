// Painel em Português — escreva a pergunta e o painel monta filtros e gráfico sobre colunas que existem, sem gerar SQL.
// Para adaptar: troque VENDAS pelos seus dados (linhas com mes, regiao, produto, canal, pedidos, faturamento, novos) e as opções das decisões.

// ---------- dados de exemplo: Torra Boa, loja online de cafés especiais (jan–set/2026) ----------
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set'];
const REGIOES = { sudeste: 'Sudeste', sul: 'Sul', nordeste: 'Nordeste', centro_oeste: 'Centro-Oeste', norte: 'Norte' };
const PRODUTOS = { graos: 'Café em grãos', capsulas: 'Cápsulas', kits: 'Kits presente', acessorios: 'Acessórios' };
const CANAIS = { site: 'Site', app: 'App', marketplace: 'Marketplace', whatsapp: 'WhatsApp' };
const PESO = {
  regiao: { sudeste: 0.46, sul: 0.19, nordeste: 0.18, centro_oeste: 0.1, norte: 0.07 },
  produto: { graos: 0.44, capsulas: 0.31, kits: 0.15, acessorios: 0.1 },
  canal: { site: 0.41, app: 0.27, marketplace: 0.22, whatsapp: 0.1 },
};
const CRESCE = { nordeste: 0.045, norte: 0.05, sudeste: 0.01, sul: 0, centro_oeste: 0.02, app: 0.05, marketplace: -0.015, site: 0.005, whatsapp: 0.03 };  // por mês
const AFINIDADE = { whatsapp: { kits: 2.4, acessorios: 1.2 }, app: { capsulas: 1.7, kits: 0.6 }, marketplace: { acessorios: 1.9, graos: 0.8 }, site: {} };
const PRECO = { graos: 58, capsulas: 36, kits: 149, acessorios: 112 };
const SAZONAL = [0.82, 0.78, 0.9, 0.93, 1.04, 0.97, 1.02, 1.08, 1.12];
const TAXA_NOVOS = { site: 0.34, app: 0.12, marketplace: 0.41, whatsapp: 0.22 };
const ruido = (...k) => { let h = 7; for (const c of k.join('|')) h = (h * 31 + c.charCodeAt(0)) % 1000003; return 0.86 + (h % 280) / 1000; };  // fixo, sem Math.random

const VENDAS = [];
MESES.forEach((_, m) => {
  for (const r of Object.keys(REGIOES)) for (const p of Object.keys(PRODUTOS)) for (const c of Object.keys(CANAIS)) {
    const base = 4300 * SAZONAL[m] * PESO.regiao[r] * PESO.produto[p] * PESO.canal[c] * (AFINIDADE[c][p] || 1);
    const pedidos = Math.round(base * (1 + CRESCE[r]) ** m * (1 + CRESCE[c]) ** m * ruido(m, r, p, c));
    VENDAS.push({ mes: m, regiao: r, produto: p, canal: c, pedidos, faturamento: Math.round(pedidos * PRECO[p] * ruido(c, p, m, r)), novos: Math.round(pedidos * TAXA_NOVOS[c] * ruido(r, c, m)) });
  }
});

// ---------- agregação (é o código que soma; o Jev só escolhe os filtros) ----------
const PERIODOS = { ultimo_mes: [8], trimestre: [6, 7, 8], ano: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
const ROTULO_PERIODO = { ultimo_mes: 'set/2026', trimestre: 'jul–set/2026', ano: 'jan–set/2026' };
const GRUPO = { por_mes: (v) => v.mes, por_regiao: (v) => v.regiao, por_produto: (v) => v.produto, por_canal: (v) => v.canal };
const NOME = { por_mes: (k) => MESES[k], por_regiao: (k) => REGIOES[k], por_produto: (k) => PRODUTOS[k], por_canal: (k) => CANAIS[k] };
const medida = (metrica, g) => (metrica === 'faturamento' ? g.faturamento : metrica === 'pedidos' ? g.pedidos : metrica === 'ticket_medio' ? g.faturamento / Math.max(1, g.pedidos) : g.novos);

function agregar(metrica, quebra, regiao, periodo) {
  const meses = PERIODOS[periodo] || PERIODOS.ano;
  const linhas = VENDAS.filter((v) => meses.includes(v.mes) && (regiao === 'todas' || v.regiao === regiao));
  const grupos = new Map();
  const soma = { pedidos: 0, faturamento: 0, novos: 0 };
  for (const v of linhas) {
    const k = (GRUPO[quebra] || GRUPO.por_mes)(v);
    const g = grupos.get(k) || { pedidos: 0, faturamento: 0, novos: 0 };
    for (const c of ['pedidos', 'faturamento', 'novos']) { g[c] += v[c]; soma[c] += v[c]; }
    grupos.set(k, g);
  }
  let itens = [...grupos].map(([k, g]) => ({ k, rotulo: (NOME[quebra] || NOME.por_mes)(k), valor: medida(metrica, g) }));
  if (quebra === 'por_mes') itens.sort((a, b) => a.k - b.k); else itens.sort((a, b) => b.valor - a.valor);
  return { itens, total: medida(metrica, soma) };
}

// ---------- formatação e gráfico (SVG) ----------
const n0 = (v, d = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
function curto(metrica, v) {
  if (metrica === 'ticket_medio') return n0(v, 2);
  if (metrica === 'faturamento') return v >= 1e6 ? n0(v / 1e6, 2) + ' mi' : n0(v / 1e3, v >= 1e5 ? 0 : 1) + ' mil';
  return n0(v);
}
const longo = (metrica, v) => (metrica === 'faturamento' || metrica === 'ticket_medio' ? 'R$ ' : '') + (metrica === 'ticket_medio' ? n0(v, 2) : metrica === 'faturamento' ? curto(metrica, v) : n0(v));
const UNIDADE = { faturamento: 'em R$', pedidos: 'pedidos', ticket_medio: 'R$ por pedido', clientes_novos: 'clientes novos' };

const W = 520;
const GRAD = (vertical) => `<defs><linearGradient id="pp-grad-${vertical ? 'v' : 'h'}" x1="0" y1="${vertical ? 1 : 0}" x2="${vertical ? 0 : 1}" y2="0"><stop offset="0" style="stop-color:var(--mj-acento)"/><stop offset="1" style="stop-color:var(--mj-acento2)"/></linearGradient></defs>`;

function colunas(itens, metrica) {
  const H = 232, topo = 24, base = 28, n = itens.length;
  const max = Math.max(...itens.map((x) => x.valor), 1);
  const passo = (W - 16) / n, larg = Math.min(70, passo * 0.62);
  const maior = itens.reduce((a, b) => (b.valor > a.valor ? b : a), itens[0]);
  let s = '';
  for (let g = 1; g <= 3; g++) { const y = (topo + (H - topo - base) * (1 - g / 3)).toFixed(1); s += `<line x1="8" x2="${W - 8}" y1="${y}" y2="${y}" style="stroke:var(--mj-borda2);stroke-dasharray:3 5"/>`; }
  itens.forEach((it, i) => {
    const h = Math.max(3, ((H - topo - base) * it.valor) / max);
    const x = 8 + passo * i + (passo - larg) / 2, y = H - base - h, cx = (x + larg / 2).toFixed(1);
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larg.toFixed(1)}" height="${h.toFixed(1)}" rx="6" style="fill:url(#pp-grad-v);opacity:${it === maior ? 1 : 0.7}"/>`;
    s += `<text x="${cx}" y="${(y - 7).toFixed(1)}" text-anchor="middle" style="font:600 11px var(--mj-mono);fill:var(--mj-texto)">${curto(metrica, it.valor)}</text>`;
    s += `<text x="${cx}" y="${H - 9}" text-anchor="middle" style="font:500 12px var(--mj-f);fill:var(--mj-mudo)">${it.rotulo}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de colunas">${GRAD(true)}${s}</svg>`;
}

function barras(itens, metrica, total) {
  const lin = 38, H = itens.length * lin + 4, rot = 116, fim = 112;
  const max = Math.max(...itens.map((x) => x.valor), 1);
  const somavel = metrica !== 'ticket_medio';
  const maior = itens.reduce((a, b) => (b.valor > a.valor ? b : a), itens[0]);
  let s = '';
  itens.forEach((it, i) => {
    const y = 4 + i * lin, w = Math.max(4, ((W - rot - fim) * it.valor) / max);
    s += `<text x="${rot - 10}" y="${y + 21}" text-anchor="end" style="font:500 13px var(--mj-f);fill:var(--mj-mudo)">${it.rotulo}</text>`;
    s += `<rect x="${rot}" y="${y + 6}" width="${w.toFixed(1)}" height="22" rx="6" style="fill:url(#pp-grad-h);opacity:${it === maior ? 1 : 0.7}"/>`;
    s += `<text x="${(rot + w + 8).toFixed(1)}" y="${y + 22}" style="font:650 12px var(--mj-mono);fill:var(--mj-texto)">${curto(metrica, it.valor)}${somavel && total ? `<tspan style="fill:var(--mj-dim);font-weight:500"> · ${n0((it.valor / total) * 100)}%</tspan>` : ''}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de barras">${GRAD(false)}${s}</svg>`;
}

const OPCOES = {
  metrica: [
    { id: 'faturamento', rotulo: 'Faturamento', icone: '💰', desc: 'valor vendido em reais: "quanto vendemos", "receita", "quanto entrou", "vendas em R$"' },
    { id: 'pedidos', rotulo: 'Pedidos', icone: '📦', desc: 'quantidade de pedidos ou de compras: "quantos pedidos", "quantas vendas", "volume de pedidos"' },
    { id: 'ticket_medio', rotulo: 'Ticket médio', icone: '🎟️', desc: 'valor médio de cada pedido: "ticket médio", "gasto médio por compra"' },
    { id: 'clientes_novos', rotulo: 'Clientes novos', icone: '🌱', desc: 'quantas pessoas compraram pela primeira vez: "clientes novos", "novos compradores"' },
    { id: 'nao_tem', rotulo: 'Dado que não existe', icone: '🙅', desc: 'outro dado que este painel não tem: lucro, margem, custo, estoque, devoluções, avaliações, visitas' },
  ],
  quebra: [
    { id: 'por_mes', rotulo: 'por mês', icone: '📈', desc: 'evolução mês a mês ("mês a mês", "por mês", "evolução", "tendência")' },
    { id: 'por_regiao', rotulo: 'por região', icone: '🗺️', desc: 'comparar as regiões do Brasil entre si' },
    { id: 'por_produto', rotulo: 'por produto', icone: '☕', desc: 'comparar produtos: café em grãos, cápsulas, kits presente, acessórios' },
    { id: 'por_canal', rotulo: 'por canal', icone: '🛒', desc: 'comparar canais de venda: site, app, marketplace, WhatsApp' },
  ],
  regiao: [
    { id: 'todas', rotulo: 'Brasil todo', icone: '🇧🇷', desc: 'sem filtro de região' },
    { id: 'sul', rotulo: 'Sul', icone: '📍', desc: 'Paraná, Santa Catarina, Rio Grande do Sul' },
    { id: 'sudeste', rotulo: 'Sudeste', icone: '📍', desc: 'São Paulo, Rio de Janeiro, Minas Gerais, Espírito Santo' },
    { id: 'nordeste', rotulo: 'Nordeste', icone: '📍', desc: 'Bahia, Pernambuco, Ceará, Maranhão, Paraíba, Rio Grande do Norte, Alagoas, Sergipe, Piauí' },
    { id: 'norte', rotulo: 'Norte', icone: '📍', desc: 'Amazonas, Pará, Acre, Rondônia, Roraima, Amapá, Tocantins' },
    { id: 'centro_oeste', rotulo: 'Centro-Oeste', icone: '📍', desc: 'Goiás, Mato Grosso, Mato Grosso do Sul, Distrito Federal' },
  ],
  periodo: [
    { id: 'ultimo_mes', rotulo: 'Último mês', icone: '🗓️', desc: 'setembro de 2026, o último mês fechado' },
    { id: 'trimestre', rotulo: 'Trimestre', icone: '📆', desc: 'julho a setembro de 2026, os últimos 3 meses fechados' },
    { id: 'ano', rotulo: 'Ano', icone: '📅', desc: 'janeiro a setembro de 2026' },
  ],
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'painel-portugues',
  titulo: 'Painel em Português',
  emoji: '📊',
  categoria: 'imediata',
  ordem: 4,
  resumo: 'Escreva a pergunta do seu jeito (“ticket médio por canal em Curitiba, mês passado”) e o gráfico aparece, sem SQL.',
  descricao: 'A cada pausa da digitação o Jev escolhe 4 coisas numa chamada só: a métrica, a quebra, a região e o período, sempre entre colunas que existem. O código soma os dados e desenha o gráfico; se a pergunta pede um dado que o painel não tem, ele diz que não tem em vez de inventar.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#06b6d4', acento2: '#a78bfa' },
  origem: 'comunidade: telas que escolhem os componentes a cada tecla (Workday, ~300 ms em produção)',

  contexto: {
    empresa: 'Torra Boa — loja online de cafés especiais que vende para o Brasil todo',
    hoje: 'terça-feira, 20/10/2026 (o último mês fechado é setembro)',
    dados_do_painel: 'faturamento, pedidos, ticket médio e clientes novos, de janeiro a setembro de 2026, por mês, região, produto e canal',
  },

  aovivo: {
    skin: 'painel',
    janela: 'Torra Boa · painel de vendas',
    rotulo: 'Pergunta',
    placeholder: 'Pergunte do seu jeito: “quanto vendemos por região no último trimestre?”',
    dica: 'O Jev escolhe os filtros; o código soma e desenha.',
    debounce: 220,
    velocidade: 1.25,
    pausa: 3400,
  },

  decisoes: [
    {
      id: 'metrica', tipo: 'choice', papel: 'barras', limite: 3, titulo: 'Métrica',
      pergunta: 'Qual número a pessoa quer ver? Regras: valor em reais ("quanto vendemos", "receita", "quanto entrou") → faturamento; quantidade de pedidos ou compras → pedidos; valor médio por pedido → ticket médio; pessoas que compraram pela primeira vez → clientes novos; dado que o painel não tem (lucro, margem, custo, estoque, devoluções, avaliações) → dado que não existe.',
      opcoes: OPCOES.metrica,
    },
    {
      id: 'quebra', tipo: 'choice', papel: 'barras', limite: 3, titulo: 'Quebra',
      pergunta: 'Como o gráfico deve separar os números? Regras: "mês a mês", "por mês", evolução ou tendência → por mês; comparação entre regiões ou estados → por região; "por produto", "qual produto" → por produto; "por canal", site, app, marketplace ou WhatsApp → por canal. Se a pessoa não pedir nenhuma separação, use por mês.',
      opcoes: OPCOES.quebra,
    },
    {
      id: 'regiao', tipo: 'choice', papel: 'barras', limite: 3, titulo: 'Região',
      pergunta: 'A pergunta filtra alguma região do Brasil? Converta estado ou cidade na região (ex.: Salvador ou Recife → Nordeste; Curitiba ou Porto Alegre → Sul; Goiânia ou Brasília → Centro-Oeste; Manaus ou Belém → Norte; São Paulo, Rio ou BH → Sudeste). Se não filtra nenhuma região, ou se compara as regiões entre si, escolha Brasil todo.',
      opcoes: OPCOES.regiao,
    },
    {
      id: 'periodo', tipo: 'choice', papel: 'barras', limite: 3, titulo: 'Período',
      pergunta: 'Qual período a pergunta pede? Hoje é 20/10/2026 e o último mês fechado é setembro. Regras: "mês passado", "último mês" ou "em setembro" → último mês; "trimestre", "últimos 3 meses", "últimos 90 dias" → trimestre; "este ano", "em 2026", "desde janeiro", ou período não dito → ano.',
      opcoes: OPCOES.periodo,
    },
  ],

  render(r) {
    const R = r.respostas || {};
    const ids = ['metrica', 'quebra', 'regiao', 'periodo'];
    if (!ids.every((k) => R[k])) return '';
    const esc1 = (k) => R[k].choice;
    const conf = (k) => (R[k].probabilities || {})[R[k].choice] ?? 0;
    const op = (k) => OPCOES[k].find((o) => o.id === esc1(k)) || { rotulo: esc1(k), icone: '•' };
    const semDado = R.metrica.choice === 'nao_tem';
    const chips = (semDado ? ['metrica'] : ids).map((k) => {
      const c = conf(k), o = op(k);
      const txt = k === 'periodo' ? `${o.rotulo} · ${ROTULO_PERIODO[o.id] || ''}` : o.rotulo;
      return `<span class="mj-chip ${c < 0.6 ? 'medio' : 'acento'}" title="${esc(o.desc)}">${o.icone} ${esc(txt)} <span style="opacity:.7;font-family:var(--mj-mono)">${Math.round(c * 100)}%</span></span>`;
    }).join('');
    const duvida = (semDado ? [] : ids).filter((k) => conf(k) < 0.6).map((k) => ({ metrica: 'métrica', quebra: 'quebra', regiao: 'região', periodo: 'período' }[k]));
    const cab = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${chips}</div>`;
    if (semDado) {
      return `<div class="mj-widget mj-painel-box" style="padding:16px">${cab}<div style="display:flex;gap:14px;align-items:flex-start;padding:14px;border-radius:12px;background:color-mix(in srgb,var(--mj-medio) 10%,transparent);border:1px solid color-mix(in srgb,var(--mj-medio) 40%,transparent)"><span style="font-size:30px">🙅</span><div><b style="font-size:16px">Esse dado não está no painel.</b><div style="font-size:13.5px;color:var(--mj-mudo);margin-top:4px">Em vez de inventar um número, o painel avisa. Dá para ver: faturamento, pedidos, ticket médio e clientes novos, por mês, região, produto ou canal.</div></div></div></div>`;
    }
    const metrica = esc1('metrica'), quebra = esc1('quebra'), regiao = esc1('regiao'), periodo = esc1('periodo');
    const { itens, total } = agregar(metrica, quebra, regiao, periodo);
    if (!itens.length) return '';
    const titulo = `${op('metrica').rotulo} ${op('quebra').rotulo}`;
    const onde = regiao === 'todas' ? 'Brasil todo' : REGIOES[regiao];
    const grafico = quebra === 'por_mes' ? colunas(itens, metrica) : barras(itens, metrica, total);
    const rotTotal = metrica === 'ticket_medio' ? 'ticket médio no período' : 'total no período';
    return `<div class="mj-widget mj-painel-box" style="padding:16px">${cab}
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div style="min-width:0;flex:1"><div style="font:750 18px/1.25 var(--mj-f)">${esc(titulo)}</div><div style="font-size:12.5px;color:var(--mj-mudo)">${esc(onde)} · ${ROTULO_PERIODO[periodo]} · ${UNIDADE[metrica]}</div></div>
        <div style="text-align:right"><div style="font:800 24px/1.1 var(--mj-mono);color:var(--mj-acento)">${longo(metrica, total)}</div><div style="font-size:11.5px;color:var(--mj-dim)">${rotTotal}</div></div>
      </div>
      <div style="animation:mj-entra .4s var(--mj-ease)">${grafico}</div>
      <div style="margin-top:8px;font-size:12px;color:var(--mj-dim)">${duvida.length ? `🤔 O Jev ficou em dúvida na ${duvida.join(' e na ')}: confira o filtro destacado. ` : ''}Nenhuma linha de SQL: o código só filtra e soma as colunas escolhidas.</div>
    </div>`;
  },

  exemplos: [
    { titulo: 'Por região', texto: 'quanto vendemos por região no último trimestre?', esperado: { metrica: 'faturamento', quebra: 'por_regiao', regiao: 'todas', periodo: 'trimestre' } },
    { titulo: 'Nordeste', texto: 'pedidos do Nordeste mês a mês este ano', esperado: { metrica: 'pedidos', quebra: 'por_mes', regiao: 'nordeste', periodo: 'ano' } },
    { titulo: 'Ticket por canal', texto: 'ticket médio por canal em Curitiba e Porto Alegre, mês passado', esperado: { metrica: 'ticket_medio', quebra: 'por_canal', regiao: 'sul', periodo: 'ultimo_mes' } },
    { titulo: 'Clientes novos', texto: 'quais produtos trouxeram mais clientes novos no Sudeste nos últimos 3 meses?', esperado: { metrica: 'clientes_novos', quebra: 'por_produto', regiao: 'sudeste', periodo: 'trimestre' } },
    { titulo: 'Lucro', texto: 'qual foi o nosso lucro em setembro?', esperado: { metrica: 'nao_tem', periodo: 'ultimo_mes' } },
  ],
};

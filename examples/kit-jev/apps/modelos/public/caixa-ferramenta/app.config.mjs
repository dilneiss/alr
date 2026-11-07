// Caixa que Vira Ferramenta — uma caixa de texto só: enquanto você digita, o Jev escolhe a ferramenta e o código faz a conta.
// Para adaptar: troque as opções da decisão "ferramenta", o câmbio do contexto e o desenho de cada ferramenta em FERRAMENTAS.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const reais = (v) => 'R$ ' + num(v);

// números escritos por extenso que aparecem em "entre quatro", "pra duas"…
const EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12 };
const EXT = Object.keys(EXTENSO).join('|');

// todos os números do texto, no formato brasileiro ("1.250,50", "12,5", "230"), com a posição e o que vem depois
function numeros(t) {
  const out = [];
  for (const m of t.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)) {
    const s = m[0];
    const v = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s) ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(',', '.'));
    const depois = t.slice(m.index + s.length, m.index + s.length + 12);
    out.push({ v, i: m.index, pct: /^\s*(?:%|por\s*cento)/i.test(depois), mil: /^\s*mil(?!\p{L})/iu.test(depois) });
  }
  return out;
}
const valorDe = (n) => n.v * (n.mil ? 1000 : 1);

// ---------- peças visuais (HTML com as variáveis de cor do motor) ----------
const ICONE = (i) => `<span style="flex:none;width:52px;height:52px;border-radius:15px;display:grid;place-items:center;font-size:27px;background:color-mix(in srgb,var(--mj-acento) 18%,transparent);border:1px solid color-mix(in srgb,var(--mj-acento) 45%,transparent)">${i}</span>`;
const ROTULO = (t) => `<div style="font:650 11px/1 var(--mj-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mj-acento);margin:4px 0 8px">${t}</div>`;
const GRANDE = (t, extra = '') => `<div style="font:800 clamp(26px,6.5vw,38px)/1.05 var(--mj-mono);letter-spacing:-.02em;color:var(--mj-texto);overflow-wrap:anywhere">${t}${extra ? `<span style="font:500 14px/1 var(--mj-f);color:var(--mj-mudo);margin-left:8px;letter-spacing:0">${extra}</span>` : ''}</div>`;
const LINHA = (t) => `<div style="margin-top:6px;font-size:13.5px;color:var(--mj-mudo)">${t}</div>`;
const DICA = (t) => `<div style="margin-top:12px;font-size:12.5px;color:var(--mj-dim)">${t}</div>`;
const cartao = (icone, titulo, corpo, rodape = '') => `<div style="display:flex;gap:14px;align-items:flex-start">${ICONE(icone)}<div style="min-width:0;flex:1">${ROTULO(titulo)}${corpo}</div></div>${rodape ? DICA(rodape) : ''}`;

// ---------- leitura do texto (regex) e desenho de cada ferramenta ----------
function pessoasDe(t) {
  const m = t.match(new RegExp(`(\\d+|${EXT})\\s*(?:pessoas?|amig[oa]s?|cabeças?|partes?)`, 'iu'))
    || t.match(new RegExp(`(?:entre|em|por|pra|para|com)\\s+(?:n[óo]s\\s+)?(?:os\\s+|as\\s+)?(\\d+|${EXT})(?![\\p{L}\\d%]|[.,]\\d)`, 'iu'));
  if (!m) return null;
  const s = m[1].toLowerCase();
  return { v: EXTENSO[s] ?? parseInt(s, 10), i: m.index + m[0].lastIndexOf(m[1]) };
}

function duracaoDe(t) {
  const x = t.toLowerCase();
  let seg = 0;
  const h = x.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|h)(?!\p{L})\s*(?:e\s*)?(\d{1,2})?/u);
  if (h) seg += parseFloat(h[1].replace(',', '.')) * 3600 + (h[2] ? +h[2] * 60 : 0);
  const m = x.match(/(\d+)\s*(?:minutos?|mins?|m)(?!\p{L})/u);
  if (m && !(h && h[2])) seg += +m[1] * 60;
  const s = x.match(/(\d+)\s*(?:segundos?|seg|s)(?!\p{L})/u);
  if (s) seg += +s[1];
  if (!seg && /meia\s+hora/.test(x)) seg = 1800;
  if (!seg && /uma\s+hora/.test(x)) seg = 3600;
  if (/hora\s+e\s+meia/.test(x)) seg += 1800;
  if (!seg && /pomodoro/.test(x)) seg = 1500;
  return Math.round(seg);
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function quandoDe(t) {
  const x = t.toLowerCase();
  const agora = new Date();
  let dia = null, rotulo = '';
  const soma = (n) => { const d = new Date(agora); d.setDate(d.getDate() + n); return d; };
  if (/depois\s+de\s+amanh[ãa]/.test(x)) { dia = soma(2); rotulo = 'depois de amanhã'; }
  else if (/amanh[ãa]/.test(x)) { dia = soma(1); rotulo = 'amanhã'; }
  else if (/(?<!\p{L})(?:hoje|hj)(?!\p{L})/u.test(x)) { dia = agora; rotulo = 'hoje'; }
  else {
    const w = DIAS.findIndex((d) => x.includes(d) || x.includes(d.replace('ç', 'c').replace('á', 'a')));
    if (w >= 0) { dia = soma(((w - agora.getDay() + 7) % 7) || 7); rotulo = DIAS[w]; }
    const dm = x.match(/dia\s+(\d{1,2})(?!\d)/);
    if (dm) { dia = new Date(agora.getFullYear(), agora.getMonth() + (+dm[1] < agora.getDate() ? 1 : 0), +dm[1]); rotulo = 'dia ' + dm[1]; }
  }
  let hh = null, mm = 0;
  const h1 = x.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?![\p{L}\d])/u) || x.match(/(?:às|as)\s+(\d{1,2})(?::(\d{2}))?(?!\d)/);
  if (h1) { hh = +h1[1]; mm = h1[2] ? +h1[2] : 0; }
  else { const h2 = x.match(/(\d{1,2})\s+d[ae]\s+(?:manh[ãa]|tarde|noite)/); if (h2) hh = +h2[1]; }
  if (/meio[- ]dia/.test(x)) hh = 12;
  if (hh != null && hh < 12 && /tarde|noite/.test(x)) hh += 12;
  const data = dia ? dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '') : '';
  return { rotulo, data, hora: hh != null && hh < 24 ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` : '' };
}

function tarefaDe(t) {
  const s = t
    .replace(/^\s*(?:me\s+)?(?:lembr(?:ar|e|a|ete)(?:-me)?|n[ãa]o\s+(?:posso\s+)?esquecer)\s*(?:de|que|da|do|:)?\s*/iu, '')
    .replace(/depois\s+de\s+amanh[ãa]|amanh[ãa]|(?<!\p{L})(?:hoje|hj)(?!\p{L})/giu, '')
    .replace(/(?:n[ao]\s+|nesta\s+|neste\s+|pr[óo]xim[ao]\s+)?(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?/giu, '')
    .replace(/(?:às|as)\s+\d{1,2}(?::\d{2})?\s*(?:h(?:oras?)?)?/giu, '')
    .replace(/\d{1,2}\s*(?:h|:)\s*\d{0,2}(?![\p{L}\d])/giu, '')
    .replace(/(?:\d{1,2}\s+)?d[ae]\s+(?:manh[ãa]|tarde|noite)|meio[- ]dia|dia\s+\d{1,2}/giu, '')
    .replace(/\s{2,}/g, ' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

const MOEDAS = {
  real: { nome: 'Real', simbolo: 'R$', bandeira: '🇧🇷' },
  dolar: { nome: 'Dólar', simbolo: 'US$', bandeira: '🇺🇸' },
  euro: { nome: 'Euro', simbolo: '€', bandeira: '🇪🇺' },
  libra: { nome: 'Libra', simbolo: '£', bandeira: '🇬🇧' },
};
function moedasDe(t) {
  const achadas = [];
  for (const m of t.matchAll(/us\$|r\$|€|£|(?<!\p{L})(?:usd|eur|gbp|brl|d[óo]lar(?:es)?|euros?|libras?|reais|real)(?!\p{L})/giu)) {
    const s = m[0].toLowerCase();
    const id = /us\$|usd|d[óo]lar/.test(s) ? 'dolar' : /€|eur/.test(s) ? 'euro' : /£|gbp|libra/.test(s) ? 'libra' : 'real';
    if (!achadas.length || achadas[achadas.length - 1] !== id) achadas.push(id);
  }
  return achadas;
}

const EMOJI_ITEM = { pão: '🥖', pao: '🥖', leite: '🥛', café: '☕', cafe: '☕', banana: '🍌', ovo: '🥚', ovos: '🥚', arroz: '🍚', feijão: '🫘', feijao: '🫘', tomate: '🍅', queijo: '🧀', maçã: '🍎', maca: '🍎', carne: '🥩', frango: '🍗', sabão: '🧼', sabao: '🧼', detergente: '🧴', papel: '🧻', água: '💧', agua: '💧', cerveja: '🍺', vinho: '🍷', batata: '🥔', cebola: '🧅', alho: '🧄', manteiga: '🧈', chocolate: '🍫', limão: '🍋', limao: '🍋', uva: '🍇', morango: '🍓', abacate: '🥑', cenoura: '🥕', alface: '🥬', peixe: '🐟', iogurte: '🥛', açúcar: '🍬', acucar: '🍬', biscoito: '🍪', pizza: '🍕', macarrão: '🍝', macarrao: '🍝' };
function itensDe(t) {
  return t
    .replace(/^\s*(?:preciso\s+(?:de\s+)?|tenho\s+que\s+|vou\s+)?(?:comprar|compra|pegar|trazer|levar|repor|lista(?:\s+de\s+compras)?\s*:?|acabou\s+(?:o|a|os|as)?)\s*/iu, '')
    .split(/\s*(?:,|;|\n|\s+e\s+|\s+\+\s+)\s*/u)
    .map((s) => s.replace(/^(?:o|a|os|as|um|uma|uns|umas)\s+/iu, '').replace(/[.!?]+$/, '').trim())
    .filter(Boolean).slice(0, 12)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

const FERRAMENTAS = {
  divisor_conta(t) {
    const p = pessoasDe(t);
    const ns = numeros(t);
    const taxa = ns.find((n) => n.pct);
    const valores = ns.filter((n) => !n.pct && (!p || n.i !== p.i)).map(valorDe);
    const total = valores.length ? Math.max(...valores) : 0;
    if (!total) return cartao('🧾', 'Divisor de conta', LINHA('Qual é o valor da conta?'), 'Exemplo: “rachar 230 entre 4”.');
    if (!p || !p.v) return cartao('🧾', 'Divisor de conta', GRANDE(reais(total)) + LINHA('Entre quantas pessoas?'), 'Exemplo: “rachar 230 entre 4”.');
    const conta = taxa ? total * (1 + taxa.v / 100) : total;
    const cada = Math.floor((conta / p.v) * 100) / 100;
    const sobra = Math.round((conta - cada * p.v) * 100) / 100;
    const n = Math.min(p.v, 8);
    const pessoas = Array.from({ length: n }, (_, i) => `<span class="mj-chip" style="font-family:var(--mj-mono)">👤 ${reais(i === 0 && sobra ? cada + sobra : cada)}</span>`).join('') + (p.v > n ? `<span class="mj-chip">+${p.v - n}</span>` : '');
    return cartao('🧾', 'Divisor de conta',
      GRANDE(reais(cada), 'por pessoa')
      + LINHA(`${reais(total)}${taxa ? ` + ${num(taxa.v, 0)}% = <b>${reais(conta)}</b>` : ''} ÷ ${p.v} ${p.v === 1 ? 'pessoa' : 'pessoas'}`)
      + `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${pessoas}</div>`,
      sobra ? `Para fechar a conta, uma pessoa paga ${reais(cada + sobra)}.` : 'A conta fecha certinho, sem centavo sobrando.');
  },

  cronometro(t) {
    const seg = duracaoDe(t);
    if (!seg) return cartao('⏱️', 'Cronômetro', GRANDE('00:00') + LINHA('Quanto tempo? Ex.: “25 min de foco”.'));
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
    const relogio = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const x = t.toLowerCase();
    const tipo = /foco|pomodoro|estud|concentr|trabalh/.test(x) ? 'Foco' : /forno|bolo|assar|cozinh|ovo|miojo|arroz/.test(x) ? 'Cozinha' : /pausa|descanso|intervalo|cochilo/.test(x) ? 'Pausa' : /treino|prancha|corrida|exerc/.test(x) ? 'Treino' : 'Timer';
    const acesas = Math.min(60, Math.ceil(seg / 60));
    let marcas = '';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const r1 = i % 5 === 0 ? 39 : 43;
      marcas += `<line x1="${(60 + r1 * Math.cos(a)).toFixed(1)}" y1="${(60 + r1 * Math.sin(a)).toFixed(1)}" x2="${(60 + 49 * Math.cos(a)).toFixed(1)}" y2="${(60 + 49 * Math.sin(a)).toFixed(1)}" style="stroke:${i < acesas ? 'var(--mj-acento)' : 'var(--mj-borda2)'};stroke-width:${i % 5 === 0 ? 2.6 : 1.5};stroke-linecap:round"/>`;
    }
    const fim = new Date(Date.now() + seg * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const falado = seg < 60 ? `${s} segundos` : h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min${s ? ` ${s} s` : ''}`;
    const mostrador = `<svg viewBox="0 0 120 120" width="138" height="138" role="img" aria-label="Cronômetro de ${relogio}" style="flex:none">${marcas}<text x="60" y="${relogio.length > 5 ? 65 : 67}" text-anchor="middle" style="font:800 ${relogio.length > 5 ? 17 : 22}px var(--mj-mono);fill:var(--mj-texto)">${relogio}</text></svg>`;
    return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">${mostrador}<div style="min-width:0;flex:1">${ROTULO('⏱️ Cronômetro')}<div style="font:750 22px/1.2 var(--mj-f)">${tipo}</div>${LINHA(`${falado} · se começar agora, termina às <b>${fim}</b>`)}${LINHA(acesas >= 60 ? 'cada marca acesa = 1 minuto (mais de 1 hora)' : `cada marca acesa = 1 minuto · ${acesas} de 60`)}</div></div>`;
  },

  lembrete(t) {
    const q = quandoDe(t);
    const tarefa = tarefaDe(t) || 'Lembrete';
    const chips = [q.rotulo && `<span class="mj-chip acento">📅 ${esc(q.rotulo)}${q.data && q.rotulo !== 'hoje' ? ` · ${esc(q.data)}` : ''}</span>`, q.hora && `<span class="mj-chip acento">⏰ ${q.hora}</span>`].filter(Boolean).join('');
    return `${ROTULO('🔔 Lembrete')}<div style="padding:13px 15px;border-radius:16px;background:var(--mj-bg2);border:1px solid var(--mj-borda2);box-shadow:var(--mj-sombra)">
      <div style="display:flex;gap:8px;align-items:center;font-size:12px;color:var(--mj-dim)"><span>🔔 Lembretes</span><span style="margin-left:auto">agora</span></div>
      <div style="font:700 18px/1.3 var(--mj-f);margin-top:6px;color:var(--mj-texto)">${esc(tarefa)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">${chips || '<span class="mj-chip medio">⏰ quando? diga o dia ou a hora</span>'}</div></div>`;
  },

  conversor_moeda(t, ctx) {
    const cambio = (ctx && ctx.cambio_em_reais) || {};
    const ns = numeros(t).filter((n) => !n.pct);
    const valor = ns.length ? valorDe(ns[0]) : 0;
    const ms = moedasDe(t);
    const de = ms[0] || 'dolar';
    const para = ms.find((x) => x !== de) || (de === 'real' ? 'dolar' : 'real');
    const taxa = (id) => (id === 'real' ? 1 : cambio[id] || 0);
    if (!taxa(de) || !taxa(para)) return cartao('💱', 'Conversor de moeda', LINHA('Essa moeda não está no câmbio do exemplo.'));
    const res = valor * taxa(de) / taxa(para);
    const caixa = (id, v, forte) => `<div style="padding:12px;border-radius:13px;min-width:0;background:${forte ? 'color-mix(in srgb,var(--mj-acento) 14%,var(--mj-bg2))' : 'var(--mj-bg2)'};border:1px solid ${forte ? 'color-mix(in srgb,var(--mj-acento) 45%,transparent)' : 'var(--mj-borda)'}">
      <div style="font-size:12px;color:var(--mj-mudo)">${MOEDAS[id].bandeira} ${MOEDAS[id].nome}</div>
      <div style="font:800 ${forte ? 26 : 22}px/1.15 var(--mj-mono);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${MOEDAS[id].simbolo} ${num(v)}</div></div>`;
    const ref = de === 'real' ? para : de;
    return `${ROTULO('💱 Conversor de moeda')}<div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center">${caixa(de, valor, false)}<span style="font-size:22px;color:var(--mj-acento)">→</span>${caixa(para, res, true)}</div>${DICA(`Câmbio fixo do exemplo: 1 ${MOEDAS[ref].simbolo} = R$ ${num(taxa(ref))}. Num app de verdade, o código busca a cotação do dia.`)}`;
  },

  porcentagem(t) {
    const ns = numeros(t);
    const p = ns.find((n) => n.pct);
    const outros = ns.filter((n) => !n.pct).map(valorDe);
    const base = outros.length ? Math.max(...outros) : 0;
    if (!p || !base) return cartao('%', 'Porcentagem', LINHA('Diga a porcentagem e o valor: “15% de desconto em 480”.'));
    const parte = base * p.v / 100;
    const x = t.toLowerCase();
    const modo = /desconto|off|abatimento|tirar|menos|abaixo/.test(x) ? 'desconto' : /aumento|reajuste|acr[ée]scimo|juros|a\s+mais|subir/.test(x) ? 'aumento' : '';
    const largura = Math.max(2, Math.min(100, p.v));
    return cartao('%', 'Porcentagem',
      GRANDE(reais(parte)) + LINHA(`${num(p.v, p.v % 1 ? 1 : 0)}% de ${reais(base)}`)
      + `<div style="height:10px;border-radius:99px;background:var(--mj-card2);margin-top:12px;overflow:hidden"><span style="display:block;height:100%;width:${largura}%;border-radius:99px;background:linear-gradient(90deg,var(--mj-acento),var(--mj-acento2))"></span></div>`
      + (modo ? `<div style="margin-top:12px;font-size:15px">${modo === 'desconto' ? 'Preço com desconto' : 'Valor com aumento'}: <b style="font:800 20px var(--mj-mono);color:var(--mj-acento)">${reais(modo === 'desconto' ? base - parte : base + parte)}</b></div>` : ''));
  },

  lista_compras(t) {
    const itens = itensDe(t);
    if (!itens.length) return cartao('🛒', 'Lista de compras', LINHA('Escreva os itens separados por vírgula.'));
    const li = itens.map((s) => {
      const e = EMOJI_ITEM[s.toLowerCase().split(/\s+/).find((w) => EMOJI_ITEM[w]) || ''] || '•';
      return `<label style="display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:10px;background:var(--mj-card);font-size:14.5px;cursor:pointer"><input type="checkbox" style="width:17px;height:17px;accent-color:var(--mj-acento)"><span>${e}</span><span>${esc(s)}</span></label>`;
    }).join('');
    return `${ROTULO(`🛒 Lista de compras · ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`)}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px">${li}</div>${DICA('As caixinhas funcionam: marque o que já está no carrinho.')}`;
  },

  nenhuma() {
    const ex = ['rachar 230 entre 4', '25 min de foco', '100 dólares em reais', '15% de 480'].map((s) => `<span class="mj-chip">${s}</span>`).join('');
    return cartao('💬', 'Só texto', LINHA('Nenhuma ferramenta serve para isso, então a caixa fica como está.') + `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${ex}</div>`);
  },
};

export default {
  id: 'caixa-ferramenta',
  titulo: 'Caixa que Vira Ferramenta',
  emoji: '🧰',
  categoria: 'imediata',
  ordem: 1,
  resumo: 'Uma caixa de texto só: “rachar 230 entre 4” vira divisor de conta, “25 min de foco” vira cronômetro, “100 dólares em reais” vira conversor.',
  descricao: 'A cada pausa da digitação o Jev decide qual ferramenta a frase pede, entre sete opções fechadas (incluindo "nenhuma"), em menos de meio segundo. A conta é sempre do código: o Jev escolhe a ferramenta, o código lê os números e desenha o resultado.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#facc15', acento2: '#fb923c' },
  origem: 'comunidade: Shapeshift (caixa de texto que muda de forma)',

  contexto: {
    produto: 'caixa de texto única de um app de produtividade pessoal: a pessoa escreve do jeito dela e a caixa vira a ferramenta certa',
    ferramentas: 'divisor de conta, cronômetro, lembrete, conversor de moeda, porcentagem e lista de compras',
    cambio_em_reais: { dolar: 5.42, euro: 5.87, libra: 6.95 },
  },

  aovivo: {
    skin: 'caixa',
    janela: 'Caixa mágica',
    rotulo: 'Caixa de texto',
    placeholder: 'Escreva qualquer coisa: “rachar 230 entre 4”, “25 min de foco”, “comprar pão e leite”…',
    dica: 'O Jev escolhe a ferramenta; o código lê os números.',
    minimo: 4,
    velocidade: 1,
    pausa: 3300,
  },

  decisoes: [
    {
      id: 'ferramenta', tipo: 'choice', papel: 'destaque', titulo: 'Ferramenta',
      pergunta: 'Qual ferramenta o texto digitado pede? Decida pela intenção, mesmo com gíria ou frase pela metade. Regras: dividir um valor entre pessoas → divisor de conta; contar um tempo a partir de agora → cronômetro; lembrar de algo num dia ou horário marcado → lembrete; converter um valor entre moedas → conversor de moeda; calcular porcentagem, desconto, juros ou aumento → porcentagem; itens para comprar → lista de compras; nada disso → nenhuma.',
      opcoes: [
        { id: 'lembrete', rotulo: 'Lembrete', icone: '🔔', desc: 'lembrar de uma tarefa num dia ou horário marcado: "lembrar de ligar pra mãe amanhã 10h", "não esquecer o boleto sexta"' },
        { id: 'divisor_conta', rotulo: 'Divisor de conta', icone: '🧾', desc: 'dividir uma conta ou valor entre pessoas: "rachar", "dividir", "cada um paga", "por cabeça"' },
        { id: 'conversor_moeda', rotulo: 'Conversor de moeda', icone: '💱', desc: 'converter um valor de uma moeda para outra: dólar, euro, libra, real' },
        { id: 'cronometro', rotulo: 'Cronômetro', icone: '⏱️', desc: 'contar um tempo a partir de agora: timer, "25 min de foco", pomodoro, tempo de forno' },
        { id: 'lista_compras', rotulo: 'Lista de compras', icone: '🛒', desc: 'itens para comprar no mercado ou na farmácia: "comprar pão, leite e café"' },
        { id: 'porcentagem', rotulo: 'Porcentagem', icone: '%', desc: 'calcular uma porcentagem de um valor: desconto, juros, aumento, "15% de 480"' },
        { id: 'nenhuma', rotulo: 'Só texto', icone: '💬', desc: 'conversa, anotação solta ou pedido que nenhuma das ferramentas resolve' },
      ],
    },
  ],

  render(r, texto, ctx) {
    const a = r.respostas && r.respostas.ferramenta;
    if (!a) return '';
    const desenhar = FERRAMENTAS[a.choice] || FERRAMENTAS.nenhuma;
    const conf = (a.probabilities || {})[a.choice] ?? 0;
    const duvida = conf < 0.6 ? `<div style="margin-bottom:12px"><span class="mj-chip medio">🤔 palpite com ${Math.round(conf * 100)}% de confiança: continue escrevendo</span></div>` : '';
    return `<div class="mj-widget mj-painel-box" style="padding:18px;background:linear-gradient(160deg,color-mix(in srgb,var(--mj-acento) 12%,var(--mj-bg2)),var(--mj-bg2) 65%);border-color:color-mix(in srgb,var(--mj-acento) 32%,transparent)">${duvida}<div style="animation:mj-entra .35s var(--mj-ease)">${desenhar(texto, ctx || {})}</div></div>`;
  },

  exemplos: [
    { titulo: 'Rachar a conta', texto: 'rachar 230 entre 4', esperado: { ferramenta: 'divisor_conta' } },
    { titulo: 'Foco', texto: '25 min de foco', esperado: { ferramenta: 'cronometro' } },
    { titulo: 'Lembrete', texto: 'lembrar de ligar pra mãe amanhã 10h', esperado: { ferramenta: 'lembrete' } },
    { titulo: 'Desconto', texto: '15% de desconto em 480', esperado: { ferramenta: 'porcentagem' } },
    { titulo: 'Dólar', texto: '100 dólares em reais', esperado: { ferramenta: 'conversor_moeda' } },
    { titulo: 'Mercado', texto: 'comprar pão, leite, café e banana', esperado: { ferramenta: 'lista_compras' } },
  ],
};

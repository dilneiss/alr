// Busca que Entende — a cada pausa na digitação o Jev avalia o CATÁLOGO INTEIRO (120 produtos) contra a intenção da frase.
// 5 chamadas paralelas de 24 perguntas `score` (uma por produto) + 1 chamada de "entendimento" (5 perguntas `choice`).
// O Jev não faz contas: o valor exato do orçamento é lido do texto por código (parseOrcamento); o Jev escolhe a faixa
// quando a pessoa fala do orçamento sem um valor que o código leia ("sem gastar muito") e decide a relevância de cada produto.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, top } from '../../shared/server/kit.mjs';
import { parseOrcamento, semAcento } from './orcamento.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { buscas: 0, produtos_avaliados: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
let statsDirty = false;
setInterval(() => { if (statsDirty) { statsDirty = false; fs.writeFile(STATS, JSON.stringify(stats), () => {}); } }, 5000).unref();

const CATALOGO = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'catalogo.json'), 'utf8'));
const POR_ID = new Map(CATALOGO.map((p) => [p.id, p]));

const CATEGORIAS = {
  casa: { label: 'Casa', emoji: '🏠' }, jardim: { label: 'Jardim', emoji: '🌱' }, cozinha: { label: 'Cozinha', emoji: '🍳' },
  eletronicos: { label: 'Eletrônicos', emoji: '🔌' }, esporte: { label: 'Esporte', emoji: '🏃' }, camping: { label: 'Camping', emoji: '🏕️' },
  moda: { label: 'Moda', emoji: '👕' }, beleza: { label: 'Beleza', emoji: '💄' }, pet: { label: 'Pet', emoji: '🐾' },
  brinquedos: { label: 'Brinquedos', emoji: '🧸' }, livros: { label: 'Livros', emoji: '📚' }, papelaria: { label: 'Papelaria', emoji: '✏️' },
  bem_estar: { label: 'Bem-estar', emoji: '🧘' }, varias: { label: 'Vários departamentos', emoji: '🛍️' },
};

const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------- lotes: intercala departamentos para cada lote ter de tudo um pouco ----------
// Medido: 20/30/40/60 produtos por chamada dão o mesmo ranking (erro médio 0,1–0,2 na nota 0–3 contra 1 produto por chamada)
// e a mesma latência (~0,5–0,7 s em paralelo). 24 por chamada = 5 chamadas, e cada uma cabe inteira no inspetor da página.
const LOTE = 24;
const deps = [...new Set(CATALOGO.map((p) => p.categoria))];
const porDep = Object.fromEntries(deps.map((d) => [d, CATALOGO.filter((p) => p.categoria === d)]));
const intercalado = [];
for (let i = 0; intercalado.length < CATALOGO.length; i++) for (const d of deps) if (porDep[d][i]) intercalado.push(porDep[d][i]);
const LOTES = [];
for (let i = 0; i < intercalado.length; i += LOTE) LOTES.push(intercalado.slice(i, i + LOTE));

const linha = (p) => `${p.nome} — ${p.desc} | ${brl(p.preco)} | ${CATEGORIAS[p.categoria].label} | para: ${p.publico}`;
const RELEVANCIA = [
  'Irrelevante: não tem relação com o que a pessoa pediu',
  'Talvez: tem alguma relação, mas não resolve bem o pedido',
  'Boa opção: atende bem ao pedido',
  'Perfeito: exatamente o que a pessoa procura, para a pessoa e a situação certas',
];
const LOTE_QUESTIONS = LOTES.map((lote) => Object.fromEntries(lote.map((p) => [p.id, {
  type: 'score', instructions: `Quão bem o produto ${p.id} atende ao pedido do cliente?`, criteria: RELEVANCIA,
}])));
const LOTE_PRODUTOS = LOTES.map((lote) => Object.fromEntries(lote.map((p) => [p.id, linha(p)])));

// ---------- entendimento ----------
const INTENCOES = {
  presente: 'Vai comprar para dar de presente a outra pessoa',
  uso_proprio: 'Quer algo para si mesmo, para a própria casa ou rotina, ou para resolver um problema seu',
  reposicao: 'Precisa repor ou substituir algo que acabou, quebrou ou se perdeu',
  pesquisa: 'Está só pesquisando ou comparando opções, sem necessidade definida',
};
const DEP_CRIT = {
  casa: 'Casa: cama, mesa, banho, decoração e utilidades', jardim: 'Jardim, plantas, horta e jardinagem', cozinha: 'Cozinha, café e utensílios',
  eletronicos: 'Eletrônicos: celular, computador, áudio e acessórios', esporte: 'Esporte, corrida, academia e treino em casa', camping: 'Camping, trilha e aventura ao ar livre',
  moda: 'Moda: roupas, calçados, bolsas e acessórios', beleza: 'Beleza, perfumaria e cuidados pessoais', pet: 'Pet: cães e gatos', brinquedos: 'Brinquedos e jogos',
  livros: 'Livros', papelaria: 'Papelaria e escritório', bem_estar: 'Bem-estar, sono e relaxamento', varias: 'Vários departamentos ou não dá para dizer',
};
const PARA_QUEM = {
  mae: 'Para a mãe', pai: 'Para o pai', avos: 'Para avó, avô ou pessoa idosa', parceiro: 'Para namorado(a), marido ou esposa', crianca: 'Para uma criança',
  bebe: 'Para um bebê', adolescente: 'Para um adolescente', amigo: 'Para um amigo, amiga ou colega de trabalho', pet: 'Para um animal de estimação',
  eu_mesmo: 'Para a própria pessoa que está buscando', familia: 'Para a família ou a casa toda', nao_informado: 'Não dá para saber para quem é',
};
const OCASIOES = {
  aniversario: 'Aniversário', dia_das_maes: 'Dia das Mães', dia_dos_pais: 'Dia dos Pais', natal: 'Natal', amigo_secreto: 'Amigo secreto / amigo oculto',
  dia_dos_namorados: 'Dia dos Namorados', dia_das_criancas: 'Dia das Crianças', viagem: 'Uma viagem, passeio ou acampamento', nenhuma: 'Nenhuma ocasião especial citada',
};
const ORCAMENTOS = {
  sem_limite: 'Não fala de preço nem de orçamento', barato: 'Quer algo barato ou econômico, sem citar valor', ate_50: 'Até R$ 50', ate_100: 'Até R$ 100',
  ate_150: 'Até R$ 150', ate_200: 'Até R$ 200', ate_300: 'Até R$ 300', ate_500: 'Até R$ 500', ate_1000: 'Até R$ 1.000', premium: 'Quer o melhor, top de linha, e o preço não importa',
};
const ENT_QUESTIONS = {
  intencao: { type: 'choice', instructions: 'Qual é a intenção de quem fez esta busca na loja?', criteria: INTENCOES },
  categoria: { type: 'choice', instructions: 'Qual departamento da loja combina melhor com o que a pessoa procura?', criteria: DEP_CRIT },
  para_quem: { type: 'choice', instructions: 'Para quem é o produto que a pessoa procura?', criteria: PARA_QUEM },
  ocasiao: { type: 'choice', instructions: 'Existe uma ocasião especial por trás da compra?', criteria: OCASIOES },
  orcamento: { type: 'choice', instructions: 'A pessoa indicou quanto quer gastar? Escolha a faixa correspondente ao valor máximo citado.', criteria: ORCAMENTOS },
};
const ROTULOS = {
  intencao: { presente: ['🎁', 'Presente'], uso_proprio: ['🙋', 'Para uso próprio'], reposicao: ['🔁', 'Reposição'], pesquisa: ['🔎', 'Só pesquisando'] },
  para_quem: { mae: ['👩', 'Para a mãe'], pai: ['👨', 'Para o pai'], avos: ['👵', 'Para os avós'], parceiro: ['💞', 'Para o par'], crianca: ['🧒', 'Para criança'], bebe: ['👶', 'Para bebê'],
    adolescente: ['🧑', 'Para adolescente'], amigo: ['🤝', 'Para amigo(a)'], pet: ['🐾', 'Para o pet'], eu_mesmo: ['🙋', 'Para você'], familia: ['👨‍👩‍👧', 'Para a família'] },
  ocasiao: { aniversario: ['🎂', 'Aniversário'], dia_das_maes: ['💐', 'Dia das Mães'], dia_dos_pais: ['👔', 'Dia dos Pais'], natal: ['🎄', 'Natal'], amigo_secreto: ['🤫', 'Amigo secreto'],
    dia_dos_namorados: ['💘', 'Dia dos Namorados'], dia_das_criancas: ['🪁', 'Dia das Crianças'], viagem: ['🧳', 'Viagem / passeio'] },
};
const FAIXA_MAX = { ate_50: 50, ate_100: 100, ate_150: 150, ate_200: 200, ate_300: 300, ate_500: 500, ate_1000: 1000 };

// ---------- cache da aplicação (guarda também a latência/custo medidos na 1ª vez, para a tela mostrar a verdade) ----------
const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();
const chave = (q) => semAcento(q).replace(/[^\p{L}\p{N}$]+/gu, ' ').trim();
function cacheGet(k) { const v = cache.get(k); if (!v) return null; if (Date.now() - v.at > CACHE_TTL) { cache.delete(k); return null; } cache.delete(k); cache.set(k, v); return v; }
function cacheSet(k, v) { cache.set(k, v); while (cache.size > 500) cache.delete(cache.keys().next().value); }

const EXEMPLOS = [
  { rotulo: '🌱 Mãe jardineira, até R$ 150', q: 'presente pra minha mãe que ama jardinagem até 150 reais' },
  { rotulo: '🏕️ Acampar com criança no frio', q: 'acampar com criança no frio' },
  { rotulo: '🐶 Cachorro destruidor', q: 'meu cachorro destrói todos os brinquedos' },
  { rotulo: '😴 Insônia', q: 'tenho insônia e acordo com qualquer barulho' },
  { rotulo: '🤫 Amigo secreto, até R$ 50', q: 'amigo secreto da firma até 50 reais' },
  { rotulo: '🦖 Fã de dinossauro', q: 'presente pra criança de 5 anos que ama dinossauro' },
  { rotulo: '🔌 Carregador quebrou', q: 'o carregador do meu celular quebrou' },
  { rotulo: '☕ Em inglês', q: 'gift for a coffee lover' },
];

const app = createApp({ name: 'busca', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/catalogo', () => ({ ok: true, produtos: CATALOGO, categorias: CATEGORIAS }));
app.get('/api/exemplos', () => ({ ok: true, exemplos: EXEMPLOS }));
app.get('/api/stats', () => ({ ok: true, ...stats }));

function rotuloEntendimento(a, orc) {
  const pick = (k) => ({ id: a[k].choice, p: a[k].probabilities?.[a[k].choice] ?? a[k].confidence ?? 0, ranking: top(a[k].probabilities).slice(0, 3) });
  const intencao = pick('intencao'), categoria = pick('categoria'), para_quem = pick('para_quem'), ocasiao = pick('ocasiao'), faixa = pick('orcamento');
  const out = [];
  const lab = (grupo, id) => ROTULOS[grupo]?.[id];
  const [ie, il] = lab('intencao', intencao.id) || ['🛍️', intencao.id];
  out.push({ tipo: 'intencao', emoji: ie, label: il, p: intencao.p });
  out.push({ tipo: 'categoria', emoji: CATEGORIAS[categoria.id]?.emoji || '🛍️', label: CATEGORIAS[categoria.id]?.label || categoria.id, p: categoria.p });
  const pq = lab('para_quem', para_quem.id);
  const redundante = (para_quem.id === 'eu_mesmo' && intencao.id !== 'presente') || (para_quem.id === 'pet' && categoria.id === 'pet');
  if (pq && para_quem.p >= 0.5 && !redundante) out.push({ tipo: 'para_quem', emoji: pq[0], label: pq[1], p: para_quem.p });
  const oc = lab('ocasiao', ocasiao.id);
  if (oc && ocasiao.p >= 0.5) out.push({ tipo: 'ocasiao', emoji: oc[0], label: oc[1], p: ocasiao.p });
  // orçamento: valor exato do texto (código) tem prioridade; senão a faixa escolhida pelo Jev
  let max = null, fonte = null, label = null;
  if (orc) { max = orc.max; fonte = 'texto'; label = orc.exato ? `Até ${brl(orc.max).replace(',00', '')}` : `Uns ${brl(orc.aprox).replace(',00', '')}`; }
  else if (FAIXA_MAX[faixa.id] && faixa.p >= 0.6) { max = FAIXA_MAX[faixa.id]; fonte = 'jev'; label = ORCAMENTOS[faixa.id]; }
  if (label) out.push({ tipo: 'orcamento', emoji: '💰', label, p: faixa.p, fonte, faixa: faixa.id });
  else if (faixa.id === 'barato' && faixa.p >= 0.6) out.push({ tipo: 'orcamento', emoji: '🪙', label: 'Econômico', p: faixa.p, fonte: 'jev', faixa: faixa.id });
  else if (faixa.id === 'premium' && faixa.p >= 0.6) out.push({ tipo: 'orcamento', emoji: '💎', label: 'Top de linha', p: faixa.p, fonte: 'jev', faixa: faixa.id });
  return { pilulas: out, orcamento_max: max, orcamento_fonte: fonte, bruto: { intencao, categoria, para_quem, ocasiao, orcamento: faixa } };
}

app.post('/api/buscar', async ({ body, jev }) => {
  const q = String(body.q ?? '').replace(/\s+/g, ' ').trim();
  if (q.length < 2) throw new HttpError(400, 'Digite o que você procura (pelo menos 2 letras).', 'vazio');
  if (q.length > 300) throw new HttpError(400, 'Busca longa demais: use até 300 caracteres.', 'longo');
  const k = chave(q) || q;
  const hit = body.fresh ? null : cacheGet(k); // ?fresh=1 na página: mede de novo (custa o mesmo que uma busca nova)
  if (hit) {
    return { ...hit.resp, cached: true, cache_idade_s: Math.round((Date.now() - hit.at) / 1000),
      _jev: hit.resp._jev.map((d) => ({ ...d, cached: true, cost: 0 })) };
  }
  const orc = parseOrcamento(q);
  const t0 = performance.now();
  const gwCache = !body.fresh; // cache do gateway (30 min) como 2ª camada; ?fresh=1 mede sempre ao vivo
  const lotesP = LOTES.map((_, i) => jev({ state: { pedido_do_cliente: q, loja: 'Loja online brasileira; preços em reais.', produtos: LOTE_PRODUTOS[i] }, questions: LOTE_QUESTIONS[i], cache: gwCache })
    .then((r) => ({ r, i, ms: Math.round(performance.now() - t0) })));
  const entP = jev({ state: { pedido_do_cliente: q, contexto: 'Busca digitada em uma loja online brasileira (preços em reais).' }, questions: ENT_QUESTIONS, cache: gwCache });
  // tolera falha parcial: se um lote cair (instabilidade do upstream), mostra o resto e avisa; se tudo cair, erro
  const res = await Promise.allSettled([entP, ...lotesP]);
  const wall = Math.round(performance.now() - t0);
  const falhas = res.filter((x) => x.status === 'rejected');
  if (res.slice(1).every((x) => x.status === 'rejected')) throw falhas[0].reason;
  const ent = res[0].status === 'fulfilled' ? res[0].value : null;
  const lotes = res.slice(1).map((x, i) => (x.status === 'fulfilled' ? x.value : { r: null, i })).filter((l) => l.r);
  const e = ent ? rotuloEntendimento(ent.answers, orc) : { pilulas: [], orcamento_max: orc ? orc.max : null, orcamento_fonte: orc ? 'texto' : null, bruto: null };
  const scores = {};
  for (const { r } of lotes) for (const [id, a] of Object.entries(r.answers)) {
    const p = a.probabilities || {};
    scores[id] = [Math.round(a.score * 1000) / 1000, ...[0, 1, 2, 3].map((i) => Math.round((p[String(i)] || 0) * 1000) / 1000)];
  }
  const max = e.orcamento_max;
  const ordem = CATALOGO.map((p) => p.id).filter((id) => scores[id]).sort((x, y) => {
    const ax = max != null && POR_ID.get(x).preco > max ? 1 : 0, ay = max != null && POR_ID.get(y).preco > max ? 1 : 0;
    return ax - ay || scores[y][0] - scores[x][0] || POR_ID.get(x).preco - POR_ID.get(y).preco;
  });
  const cost = [ent, ...lotes.map((l) => l.r)].filter(Boolean).reduce((s, r) => s + (r.cost || 0), 0);
  const jevMs = Math.max(ent ? ent.latency_ms || 0 : 0, ...lotes.map((l) => l.r.latency_ms || 0));
  const tudoDoGateway = [ent, ...lotes.map((l) => l.r)].filter(Boolean).every((r) => r.cached);
  const resp = {
    ok: true, q, cached: tudoDoGateway, metricas_originais: !tudoDoGateway, // acerto no cache do gateway não traz a medição original
    entendimento: { pilulas: e.pilulas, orcamento_max: max, orcamento_fonte: e.orcamento_fonte, bruto: e.bruto },
    scores, ordem,
    lotes: lotes.map((l) => ({ i: l.i + 1, n: Object.keys(l.r.answers).length, latency_ms: l.r.latency_ms, chegou_ms: l.ms, cached: l.r.cached })),
    latency_ms: wall, jev_ms: jevMs, cost,
    n_produtos: Object.keys(scores).length, n_chamadas: (ent ? 1 : 0) + lotes.length, n_perguntas: (ent ? Object.keys(ENT_QUESTIONS).length : 0) + Object.keys(scores).length,
    parcial: falhas.length ? { falhas: falhas.length, produtos_sem_nota: CATALOGO.length - Object.keys(scores).length, entendimento: !!ent } : null,
    _jev: [...(ent ? [{ ...ent.debug, label: 'entendimento' }] : []), ...lotes.map((l) => ({ ...l.r.debug, label: `lote ${l.i + 1}/${LOTES.length}` }))],
  };
  if (falhas.length) { console.warn('[busca] resultado parcial:', falhas.map((f) => f.reason?.code || f.reason?.message).join(', ')); return resp; }
  cacheSet(k, { at: Date.now(), resp });
  if (!tudoDoGateway) { stats.buscas++; stats.produtos_avaliados += resp.n_produtos; statsDirty = true; }
  return resp;
}, { rate: 60 });

app.start(+(process.env.PORT || 4111));

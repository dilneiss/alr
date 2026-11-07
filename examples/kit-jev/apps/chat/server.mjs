// Chat com Moderação ao Vivo — cada mensagem passa pelo Jev ANTES de aparecer (~350 ms, uma chamada só):
// categoria (choice, 9 opções) + toxicidade (score 0–3) + ação (choice, 4) + 1 pergunta `noul` por regra ativa.
// Regras escritas em português comum viram perguntas do Jev na hora. Multiusuário de verdade (SSE), histórico
// persistido, simulação com bots roteirizados. Regras são PESSOAIS: cada visitante modera a própria visão do chat.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, sleep } from '../../shared/server/kit.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });
const HIST_FILE = path.join(DATA_DIR, 'historico.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const SALT = (() => {
  const f = path.join(DATA_DIR, 'salt');
  try { const s = fs.readFileSync(f, 'utf8').trim(); if (s) return s; } catch {}
  const s = crypto.randomBytes(16).toString('hex');
  try { fs.writeFileSync(f, s); } catch {}
  return s;
})();
const ROTEIRO = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'simulacao.json'), 'utf8')).roteiro;

// ---------------------------------------------------------------- política (os critérios SÃO a política)
const LIVE = {
  titulo: 'Live: IA para pequenos negócios',
  tema: 'Como pequenos negócios podem usar IA no atendimento, nas vendas e no marketing',
  canal: 'Canal Exemplo',
};
const CATEGORIAS = {
  ok: 'Mensagem normal: comentário, pergunta, elogio, crítica educada, brincadeira, gíria ou emoji',
  ofensa_xingamento: 'Xinga ou insulta alguém, mesmo com palavrão disfarçado (asteriscos, números, letras trocadas)',
  discurso_de_odio: 'Ataca ou inferioriza um grupo por raça, origem, região, religião, gênero, orientação sexual ou deficiência',
  spam_propaganda: 'Divulga canal, perfil, site ou produto, corrente, ou repete a mesma mensagem (flood)',
  golpe_dinheiro_pix: 'Promete dinheiro fácil ou lucro garantido, pede PIX ou chama para negociar no privado',
  assedio: 'Ameaça, persegue ou constrange uma pessoa específica (inclusive cantada)',
  conteudo_sexual: 'Conteúdo sexual, obsceno ou pedido de nudes',
  dados_pessoais: 'Expõe CPF, telefone, endereço, e-mail, cartão ou documento (seu ou de outra pessoa)',
  fora_do_tema: 'Inofensiva, mas sobre um assunto sem nenhuma relação com a live',
};
const CAT_LABEL = {
  ok: 'OK', ofensa_xingamento: 'Ofensa / xingamento', discurso_de_odio: 'Discurso de ódio', spam_propaganda: 'Spam / propaganda',
  golpe_dinheiro_pix: 'Golpe / PIX', assedio: 'Assédio', conteudo_sexual: 'Conteúdo sexual', dados_pessoais: 'Dados pessoais', fora_do_tema: 'Fora do tema',
};
const CAT_CURTO = {
  ok: 'ok', ofensa_xingamento: 'ofensa', discurso_de_odio: 'discurso de ódio', spam_propaganda: 'spam', golpe_dinheiro_pix: 'golpe',
  assedio: 'assédio', conteudo_sexual: 'conteúdo sexual', dados_pessoais: 'dados pessoais', fora_do_tema: 'fora do tema',
};
const RUINS = ['golpe_dinheiro_pix', 'ofensa_xingamento', 'discurso_de_odio', 'assedio', 'conteudo_sexual', 'dados_pessoais', 'spam_propaganda'];
const TOXICIDADE = [
  'Respeitosa ou neutra (ex.: "que aula boa!", "alguém usa n8n?")',
  'Levemente rude: ironia, reclamação dura ou palavrão sem alvo (ex.: "porra, que difícil")',
  'Ofensiva: xinga ou humilha alguém, mesmo disfarçado (ex.: "seu i*diota", "vc é burro")',
  'Grave: ódio contra um grupo, ameaça, assédio sexual ou incitação à violência',
];
const TOX_CURTO = ['respeitosa', 'rude', 'ofensiva', 'grave'];
const ACOES = {
  publicar: 'Publicar: aceitável, mesmo fora do tema da live (conversa paralela é normal)',
  publicar_com_aviso: 'Publicar com aviso: aceitável, mas com palavrão ou tom polêmico',
  ocultar: 'Ocultar: xingamento, ódio, golpe, spam/propaganda, conteúdo sexual, dados pessoais ou assédio',
  silenciar_autor_5min: 'Ocultar e silenciar o autor por 5 min: violação grave ou repetida',
};
const ACAO_LABEL = { publicar: 'Publicar', publicar_com_aviso: 'Com aviso', ocultar: 'Ocultar', silenciar_autor_5min: 'Silenciar 5 min' };
const PERGUNTAS_BASE = {
  categoria: { type: 'choice', instructions: 'Classifique a mensagem_nova do chat da live.', criteria: CATEGORIAS },
  toxicidade: { type: 'score', instructions: 'Quão tóxica é a mensagem_nova?', criteria: TOXICIDADE },
  acao: { type: 'choice', instructions: 'Que ação o moderador deve tomar com a mensagem_nova?', criteria: ACOES },
};
const CRIT_REGRA = { true: 'Desrespeita: a mensagem faz exatamente o que a regra proíbe', false: 'Respeita: a mensagem não faz o que a regra proíbe' };
const perguntaRegra = (regra) => ({ type: 'noul', instructions: `Regra do chat: "${regra}". A mensagem_nova desrespeita essa regra? Julgue pelo assunto e pela intenção da mensagem, não por palavras soltas.`, criteria: CRIT_REGRA });
// Aplicação retroativa: a mensagem vai DENTRO da pergunta (medimos: 89/90 de concordância com a avaliação individual;
// com ids no estado o modelo trocava mensagens vizinhas).
const perguntaRetro = (regra, texto) => ({ type: 'noul', instructions: `Regra do chat: "${regra}". A mensagem «${texto}» desrespeita essa regra? Julgue pelo assunto e pela intenção da mensagem, não por palavras soltas.`, criteria: CRIT_REGRA });
const PERGUNTA_APELIDO = {
  type: 'noul',
  instructions: 'Este apelido de chat é impróprio para um chat público? (ofensivo, obsceno, discriminatório, faz propaganda com link/@perfil, ou tenta se passar por moderador, pela equipe da live ou por alguém famoso)',
  criteria: { true: 'Impróprio: não deve aparecer num chat público', false: 'Adequado: apelido comum, brincalhão ou neutro' },
};

// Limiares da decisão (combinação das probabilidades do Jev)
const L = {
  regra: 0.7,          // noul da regra ≥ 0,70 → oculta na visão de quem tem a regra
  ruim: 0.5,           // soma das categorias ruins ≥ 0,50 → oculta para todos
  toxOculta: 1.75,     // toxicidade (0–3) ≥ 1,75 → oculta para todos
  acaoOculta: 0.8,     // p(ocultar) + p(silenciar) ≥ 0,80 → oculta para todos
  avisoAcao: 0.45,     // p(publicar_com_aviso) ≥ 0,45 → publica com aviso
  avisoTox: 0.75,      // toxicidade ≥ 0,75 → publica com aviso
  avisoRuim: 0.3,      // soma das categorias ruins ≥ 0,30 → publica com aviso
  silenciar: 0.5,      // p(silenciar_autor_5min) ≥ 0,50 → silencia na hora
  apelido: 0.6,        // noul de apelido impróprio ≥ 0,60 → recusa
};
const MAX_HIST = 200, MAX_MSG = 200, MAX_REGRAS = 8, MAX_REGRA_CHARS = 120, MIN_REGRA_CHARS = 4;
const MAX_REGRAS_CHAMADA = 24;   // teto de regras (união dos espectadores conectados) numa chamada
const RETRO_MSGS = 40, RETRO_MAX_Q = 60;
const MUTE_MS = 5 * 60 * 1000, JANELA_REINCIDENCIA = 3 * 60 * 1000, MODO_LENTO_MS = 1000;
const MAX_SIM_DIA = +(process.env.CHAT_MAX_SIM_DIA || 300);
const MAX_SSE_POR_IP = 30, MAX_SSE_TOTAL = 3000, MAX_SESSOES = 20000;   // 30/IP: operadoras móveis usam CGNAT
const REGRAS_PADRAO_TXT = ['Proibido divulgar outros canais, perfis ou links', 'Sem política partidária'];
const SUGESTOES = ['Proibido falar de futebol', 'Sem spoilers de filmes e séries', 'Proibido pedir PIX ou doação', 'Sem palavrão', 'Só perguntas sobre IA', 'Proibido falar mal de concorrentes'];
const RESERVADOS = ['jev', 'canal exemplo', 'moderador', 'admin', 'youtube', 'sistema', 'typesafe'];
// sem vermelho/âmbar: essas cores significam "bloqueado"/"aviso" na interface
const CORES = ['#f472b6', '#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#a3e635', '#fdba74', '#e879f9', '#2dd4bf', '#93c5fd', '#c4b5fd', '#5eead4'];

// ---------------------------------------------------------------- utilidades
const r3 = (x) => Math.round((+x || 0) * 1000) / 1000;
const len = (s) => [...s].length;
function limparTexto(t) {
  return String(t ?? '').normalize('NFC')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁠-⁤﻿]/g, '')
    .replace(/\s+/g, ' ').trim();
}
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
function idRegra(texto) {
  const base = limparTexto(texto).toLowerCase().replace(/[.!;,]+$/, '');
  const slug = semAcento(base).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30).replace(/_+$/, '');
  return `regra_${slug || 'x'}_${crypto.createHash('sha1').update(base).digest('hex').slice(0, 4)}`;
}
const corDe = (nick) => CORES[parseInt(crypto.createHash('md5').update(nick.toLowerCase()).digest('hex').slice(0, 6), 16) % CORES.length];
const hashSid = (sid) => crypto.createHash('sha1').update(SALT + ':' + sid).digest('hex').slice(0, 16);
function compacto(probs) { const o = {}; for (const [k, v] of Object.entries(probs || {})) { const x = r3(v); if (x >= 0.001) o[k] = x; } return o; }
const minutos = (ms) => { const s = Math.max(1, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`; };
const REGRAS_PADRAO = REGRAS_PADRAO_TXT.map((t) => ({ id: idRegra(t), texto: t }));

// ---------------------------------------------------------------- estado persistido
let hist = [], seq = 0;
try {
  const j = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'));
  if (Array.isArray(j.mensagens)) hist = j.mensagens.slice(-MAX_HIST);
  seq = Math.max(+j.seq || 0, 0, ...hist.map((m) => +m.seq || 0));
} catch {}
let histSujo = false;
setInterval(() => { if (histSujo) { histSujo = false; fs.writeFile(HIST_FILE, JSON.stringify({ seq, mensagens: hist }), () => {}); } }, 2000).unref();
function guardar(m) { hist.push(m); if (hist.length > MAX_HIST) hist.splice(0, hist.length - MAX_HIST); histSujo = true; }

let stats = { analisadas: 0, publicadas: 0, avisos: 0, ocultadas: 0, silenciadas: 0, por_categoria: {}, custo_total: 0, lat: [], custos: [], simulacoes: 0 };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }; } catch {}
let statsSujo = false;
setInterval(() => { if (statsSujo) { statsSujo = false; fs.writeFile(STATS_FILE, JSON.stringify(stats), () => {}); } }, 3000).unref();
function contabilizar(m) {
  if (m.status === 'silenciada') stats.silenciadas++;
  else {
    stats.analisadas++;
    if (m.status === 'publicada') stats.publicadas++; else if (m.status === 'aviso') stats.avisos++; else stats.ocultadas++;
    if (m.cat?.choice) stats.por_categoria[m.cat.choice] = (stats.por_categoria[m.cat.choice] || 0) + 1;
    stats.custo_total += m.cost || 0;
    if (!m.cached && m.ms) { stats.lat.push(m.ms); if (stats.lat.length > 300) stats.lat.shift(); }
    if (m.cost) { stats.custos.push(m.cost); if (stats.custos.length > 300) stats.custos.shift(); }
  }
  statsSujo = true;
}
function statsPublicas() {
  const lat = [...stats.lat].sort((a, b) => a - b);
  const medio = stats.custos.length ? stats.custos.reduce((a, b) => a + b, 0) / stats.custos.length : 0;
  const tot = stats.analisadas + stats.silenciadas;
  return {
    analisadas: stats.analisadas, publicadas: stats.publicadas, avisos: stats.avisos, ocultadas: stats.ocultadas, silenciadas: stats.silenciadas,
    bloqueio_pct: tot ? (stats.ocultadas + stats.silenciadas) / tot : 0,
    p50_ms: lat.length ? lat[Math.floor(lat.length / 2)] : null,
    custo_medio: medio, custo_mil: medio * 1000, custo_total: +stats.custo_total.toFixed(6), simulacoes: stats.simulacoes,
  };
}

// ---------------------------------------------------------------- sessões (em memória; o navegador guarda sid, apelido e regras)
const sessoes = new Map();
function novaSessao(sid) {
  return { sid, sidh: hashSid(sid), nick: null, cor: null, regras: REGRAS_PADRAO.slice(), regrasEm: 0, clientes: new Set(), visto: Date.now(), silenciadoAte: 0, motivoSilencio: '', reincidencias: [], ultimoEnvio: 0, ultimoRetro: 0, recentes: [] };
}
function sessao(sid) {
  if (typeof sid !== 'string' || !/^[a-z0-9]{16,64}$/i.test(sid)) throw new HttpError(400, 'Sessão inválida. Recarregue a página.', 'sessao_invalida');
  let s = sessoes.get(sid);
  if (!s) {
    if (sessoes.size >= MAX_SESSOES) {
      const velhas = [...sessoes.values()].filter((x) => !x.clientes.size).sort((a, b) => a.visto - b.visto).slice(0, 2000);
      for (const v of velhas) sessoes.delete(v.sid);
    }
    s = novaSessao(sid); sessoes.set(sid, s);
  }
  s.visto = Date.now();
  return s;
}
setInterval(() => { const corte = Date.now() - 24 * 3600e3; for (const [k, s] of sessoes) if (!s.clientes.size && s.visto < corte) sessoes.delete(k); }, 600000).unref();
const conectados = () => [...sessoes.values()].filter((s) => s.clientes.size);
const temAlguem = () => sessoes.size && conectados().length > 0;

function definirRegras(s, lista, estrito) {
  if (!Array.isArray(lista)) throw new HttpError(400, 'Lista de regras inválida.');
  const out = [], vistos = new Set();
  for (const bruto of lista.slice(0, 40)) {
    let texto = limparTexto(bruto);
    if (len(texto) < MIN_REGRA_CHARS) { if (estrito && texto) throw new HttpError(400, 'Escreva a regra com pelo menos algumas palavras.'); continue; }
    if (len(texto) > MAX_REGRA_CHARS) { if (estrito) throw new HttpError(400, `Cada regra pode ter no máximo ${MAX_REGRA_CHARS} caracteres.`); texto = [...texto].slice(0, MAX_REGRA_CHARS).join(''); }
    const id = idRegra(texto);
    if (vistos.has(id)) continue;
    vistos.add(id); out.push({ id, texto });
  }
  if (out.length > MAX_REGRAS) { if (estrito) throw new HttpError(400, `Máximo de ${MAX_REGRAS} regras.`); out.length = MAX_REGRAS; }
  s.regras = out; s.regrasEm = Date.now();
}

// Regras avaliadas numa mensagem: as do autor primeiro, depois as padrão, depois as dos espectadores conectados
// (deduplicadas pelo texto). Uma chamada só, qualquer que seja o número de regras (até o teto).
function regrasDaChamada(autor) {
  const mapa = new Map();
  const add = (r) => { if (mapa.size < MAX_REGRAS_CHAMADA && !mapa.has(r.id)) mapa.set(r.id, r); };
  if (autor && !autor.bot) autor.regras.forEach(add);
  REGRAS_PADRAO.forEach(add);
  for (const s of conectados().filter((x) => x !== autor).sort((a, b) => b.regrasEm - a.regrasEm)) {
    s.regras.forEach(add);
    if (mapa.size >= MAX_REGRAS_CHAMADA) break;
  }
  return [...mapa.values()];
}

function montarEstado(autor, texto) {
  const ultimas = [];
  for (let i = hist.length - 1; i >= 0 && ultimas.length < 5; i--) {
    const m = hist[i];
    if (m.status === 'publicada' || m.status === 'aviso') ultimas.unshift({ autor: m.nick, texto: m.texto });
  }
  const st = { live: { titulo: LIVE.titulo, tema: LIVE.tema }, ultimas_mensagens: ultimas };
  const rec = autor.recentes.filter((x) => Date.now() - x.ts < 10 * 60e3).map((x) => ({ texto: x.texto, status: x.status }));
  if (rec.length) st.mensagens_recentes_do_autor = rec;
  st.autor = autor.nick;
  st.mensagem_nova = texto;
  return st;
}

function decidir(a) {
  const probs = a.categoria?.probabilities || {};
  const pRuim = Math.min(1, RUINS.reduce((s, k) => s + (probs[k] || 0), 0));
  const [topo] = RUINS.map((k) => [k, probs[k] || 0]).sort((x, y) => y[1] - x[1]);
  const tox = +a.toxicidade?.score || 0;
  const ac = a.acao?.probabilities || {};
  const pOcultar = (ac.ocultar || 0) + (ac.silenciar_autor_5min || 0);
  let status = 'publicada', motivo = null;
  if (pRuim >= L.ruim) { status = 'ocultada'; motivo = { tipo: 'categoria', id: topo[0], label: CAT_CURTO[topo[0]], p: r3(pRuim) }; }
  else if (tox >= L.toxOculta) { status = 'ocultada'; motivo = { tipo: 'toxicidade', id: 'toxicidade', label: 'toxicidade alta', valor: r3(tox) }; }
  else if (pOcultar >= L.acaoOculta) { status = 'ocultada'; motivo = { tipo: 'acao', id: 'acao', label: 'recomendação do Jev', p: r3(pOcultar) }; }
  else if ((ac.publicar_com_aviso || 0) >= L.avisoAcao || tox >= L.avisoTox || pRuim >= L.avisoRuim) {
    status = 'aviso';
    motivo = tox >= L.avisoTox ? { tipo: 'toxicidade', id: 'toxicidade', label: 'linguagem forte', valor: r3(tox) }
      : pRuim >= L.avisoRuim ? { tipo: 'categoria', id: topo[0], label: 'possível ' + CAT_CURTO[topo[0]], p: r3(pRuim) }
        : { tipo: 'acao', id: 'publicar_com_aviso', label: 'tom polêmico', p: r3(ac.publicar_com_aviso) };
  }
  return { status, motivo, silenciar: status === 'ocultada' && (ac.silenciar_autor_5min || 0) >= L.silenciar };
}

function registrarNoAutor(autor, m) {
  const agora = Date.now();
  if (m.status === 'ocultada') {
    autor.reincidencias = autor.reincidencias.filter((t) => agora - t < JANELA_REINCIDENCIA);
    autor.reincidencias.push(agora);
    const decisao = m._silenciar;
    if (decisao || autor.reincidencias.length >= 2) {
      autor.silenciadoAte = agora + MUTE_MS;
      autor.motivoSilencio = decisao ? `${m.motivo?.label || 'violação grave'}: o Jev sugeriu silenciar` : 'reincidência: 2 mensagens ocultadas em 3 minutos';
      m.silenciou = true;
    }
  }
  delete m._silenciar;
  autor.recentes.push({ texto: m.texto, status: m.status, ts: agora });
  if (autor.recentes.length > 3) autor.recentes.shift();
}

async function processar({ autor, texto, jevFn, nonce }) {
  const regras = regrasDaChamada(autor);
  const questions = { ...PERGUNTAS_BASE };
  for (const r of regras) questions[r.id] = perguntaRegra(r.texto);
  const state = montarEstado(autor, texto);
  const r = await jevFn({ state, questions });
  const a = r.answers || {};
  if (!a.categoria || !a.toxicidade || !a.acao) throw new HttpError(502, 'O Jev não devolveu todas as respostas. Tente de novo.', 'jev_incompleto');
  const d = decidir(a);
  const m = {
    id: 'm' + (++seq).toString(36), seq, ts: Date.now(), nick: autor.nick, cor: autor.cor, bot: !!autor.bot, sidh: autor.sidh, texto,
    status: d.status, motivo: d.motivo,
    cat: { choice: a.categoria.choice, probs: compacto(a.categoria.probabilities) },
    tox: { score: r3(a.toxicidade.score), probs: compacto(a.toxicidade.probabilities) },
    acao: { choice: a.acao.choice, probs: compacto(a.acao.probabilities) },
    regras: {}, ms: r.latency_ms, cost: r.cost, nq: Object.keys(questions).length, cached: !!r.cached, _silenciar: d.silenciar,
  };
  if (nonce) m.nonce = nonce;
  for (const rg of regras) { const p = a[rg.id]?.noul; if (typeof p === 'number') m.regras[rg.id] = r3(p); }
  registrarNoAutor(autor, m);
  guardar(m); contabilizar(m);
  const ctx = { state, questions, r };
  transmitirMensagem(m, ctx, autor);
  return { m, ctx };
}

function descartarSilenciado(autor, texto) {
  const m = { id: 'm' + (++seq).toString(36), seq, ts: Date.now(), nick: autor.nick, cor: autor.cor, bot: !!autor.bot, sidh: autor.sidh, texto, status: 'silenciada', motivo: { tipo: 'silencio', id: 'silencio', label: 'autor silenciado' }, regras: {}, ms: 0, cost: 0, nq: 0 };
  guardar(m); contabilizar(m);
  transmitirMensagem(m, null, autor);
  return m;
}

// ---------------------------------------------------------------- visão por espectador
function vista(m, s) {
  const mine = !!s && m.sidh === s.sidh;
  const regras = {};
  for (const r of (s ? s.regras : REGRAS_PADRAO)) if (m.regras && m.regras[r.id] != null) regras[r.id] = m.regras[r.id];
  const v = { id: m.id, seq: m.seq, ts: m.ts, nick: m.nick, cor: m.cor, bot: m.bot, texto: m.texto, status: m.status, motivo: m.motivo, cat: m.cat, tox: m.tox, acao: m.acao, regras, ms: m.ms, cost: m.cost, nq: m.nq, cached: m.cached, silenciou: !!m.silenciou, mine };
  if (mine && m.nonce) v.nonce = m.nonce;
  return v;
}
function lente(s) {
  const out = {};
  for (const m of hist) {
    const o = {};
    for (const r of s.regras) if (m.regras && m.regras[r.id] != null) o[r.id] = m.regras[r.id];
    if (Object.keys(o).length) out[m.id] = o;
  }
  return out;
}
// O inspetor ("Ver o que o Jev vê") mostra a chamada real. Para privacidade, regras pessoais de OUTROS espectadores
// aparecem só como contagem, e mensagens ocultadas de outro autor aparecem mascaradas no estado.
function debugPara(ctx, s, m, dono) {
  const { state, questions, r } = ctx;
  const minhas = new Set((s ? s.regras : REGRAS_PADRAO).map((x) => x.id));
  const q = {}, ans = {};
  let outras = 0;
  for (const [k, v] of Object.entries(questions)) {
    if (k in PERGUNTAS_BASE || minhas.has(k) || !k.startsWith('regra_')) { q[k] = v; if (r.answers?.[k]) ans[k] = r.answers[k]; } else outras++;
  }
  if (outras) q['(privacidade)'] = `+${outras} regra(s) pessoal(is) de outros espectadores foram avaliadas nesta mesma chamada (ocultas aqui)`;
  let st = state;
  if (!dono && !m?.bot && state.mensagens_recentes_do_autor) {
    st = { ...state, mensagens_recentes_do_autor: state.mensagens_recentes_do_autor.map((x) => (x.status === 'publicada' || x.status === 'aviso' ? x : { texto: '••• (mensagem ocultada)', status: x.status })) };
  }
  return { request: { model: r.model, state: st, questions: q }, response: { answers: ans, usage: r.usage }, latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, n_questions: Object.keys(questions).length, label: m ? (m.bot ? `bot · ${m.nick}` : m.nick) : undefined };
}
function debugSimples(r, state, questions, label) {
  return { request: { model: r.model, state, questions }, response: { answers: r.answers, usage: r.usage }, latency_ms: r.latency_ms, cost: r.cost, cached: r.cached, n_questions: Object.keys(questions).length, label };
}

// ---------------------------------------------------------------- SSE
let totalSse = 0;
const ssePorIp = new Map();
function transmitir(evento, dados) { for (const s of conectados()) for (const ch of s.clientes) ch.send(evento, dados); }
function transmitirMensagem(m, ctx, autor) {
  const st = statsPublicas();
  for (const s of conectados()) {
    const dono = s === autor;
    const payload = { msg: vista(m, s), stats: st };
    if (ctx && !dono) payload._jev = debugPara(ctx, s, m, false);
    for (const ch of s.clientes) ch.send('msg', payload);
  }
}
const online = () => conectados().length;
let onlineTimer = null;
function avisarOnline() { if (onlineTimer) return; onlineTimer = setTimeout(() => { onlineTimer = null; transmitir('online', { online: online() }); }, 800); }

// ---------------------------------------------------------------- retroativo: aplica regras às mensagens já publicadas
async function aplicarRegras(s, jevFn) {
  const recentes = hist.filter((m) => m.status === 'publicada' || m.status === 'aviso').slice(-RETRO_MSGS);
  const pares = [];
  for (let i = recentes.length - 1; i >= 0; i--) for (const rg of s.regras) if (recentes[i].regras?.[rg.id] == null) pares.push([rg, recentes[i]]);
  const lote = pares.slice(0, RETRO_MAX_Q);
  if (!lote.length) return null;
  const questions = {}, chaves = [];
  for (const [rg, m] of lote) { const k = `${m.id}__${rg.id}`; chaves.push(k); questions[k] = perguntaRetro(rg.texto, m.texto); }
  const state = { contexto: 'Chat ao vivo de uma live do YouTube. Cada pergunta traz uma mensagem já publicada no chat para julgar contra uma regra do moderador.', live: LIVE.titulo };
  const r = await jevFn({ state, questions });
  const ocultadas = [];
  lote.forEach(([rg, m], i) => {
    const p = r.answers?.[chaves[i]]?.noul;
    if (typeof p !== 'number') return;
    m.regras ||= {}; m.regras[rg.id] = r3(p);
    if (p >= L.regra) ocultadas.push({ id: m.id, regra: rg.id, p: r3(p) });
  });
  histSujo = true;
  return { avaliadas: lote.length, mensagens: new Set(lote.map(([, m]) => m.id)).size, ocultadas, latency_ms: r.latency_ms, cost: r.cost, _jev: debugSimples(r, state, questions, 'regras × histórico') };
}

// ---------------------------------------------------------------- apelido
const cacheApelido = new Map();
async function definirApelido(s, bruto, jevFn) {
  const nick = limparTexto(bruto);
  if (len(nick) < 2 || len(nick) > 20) throw new HttpError(400, 'O apelido precisa ter de 2 a 20 caracteres.', 'apelido_invalido');
  const n = semAcento(nick.toLowerCase()).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (RESERVADOS.includes(n) || /moderador|admin/.test(n.replace(/\s/g, ''))) throw new HttpError(400, 'Esse apelido é reservado. Escolha outro.', 'apelido_reservado');
  let v = cacheApelido.get(nick.toLowerCase()), dbg = null;
  if (!v) {
    const state = { apelido: nick, contexto: 'Apelido escolhido por um visitante para participar do chat público de uma live do YouTube sobre IA para pequenos negócios.' };
    const questions = { apelido_improprio: PERGUNTA_APELIDO };
    const r = await jevFn({ state, questions });
    v = { p: r3(r.answers?.apelido_improprio?.noul ?? 0) };
    dbg = debugSimples(r, state, questions, 'apelido');
    cacheApelido.set(nick.toLowerCase(), v);
    if (cacheApelido.size > 5000) cacheApelido.delete(cacheApelido.keys().next().value);
  }
  if (v.p >= L.apelido) { const e = new HttpError(400, `Esse apelido não passou no Jev (${Math.round(v.p * 100)}% impróprio). Escolha outro.`, 'apelido_improprio'); e.dbg = dbg; throw e; }
  s.nick = nick; s.cor = corDe(nick);
  return { p: v.p, dbg };
}

// ---------------------------------------------------------------- simulação
let sim = null, simDia = { dia: '', n: 0 };
function simPublico(run = sim, fim = false) {
  if (!run) return { rodando: false };
  const lat = [...run.resumo.lat].sort((a, b) => a - b);
  return {
    rodando: !fim, id: run.id, por: run.por, enviadas: run.i, total: ROTEIRO.length, velocidade: run.vel,
    resumo: { publicadas: run.resumo.publicadas, avisos: run.resumo.avisos, ocultadas: run.resumo.ocultadas, silenciadas: run.resumo.silenciadas, custo: +run.resumo.custo.toFixed(6), p50_ms: lat.length ? lat[Math.floor(lat.length / 2)] : null },
    fim, motivo: run.motivo || null, erro: run.erro || null,
  };
}
function botDaSimulacao(run, nick) {
  let b = run.bots.get(nick);
  if (!b) { b = { bot: true, sid: null, sidh: `bot:${run.id}:${nick}`, nick, cor: corDe(nick), regras: REGRAS_PADRAO, clientes: new Set(), silenciadoAte: 0, motivoSilencio: '', reincidencias: [], recentes: [] }; run.bots.set(nick, b); }
  return b;
}
async function rodarSimulacao(run) {
  try {
    for (let i = 0; i < ROTEIRO.length; i++) {
      const it = ROTEIRO[i];
      await sleep(Math.round((it.gap || 1200) / run.vel));
      if (run.parar || sim !== run) { run.motivo = run.motivo || 'interrompida'; break; }
      if (!temAlguem()) { run.motivo = 'ninguém assistindo'; break; }
      const bot = botDaSimulacao(run, it.nick);
      let m;
      if (bot.silenciadoAte > Date.now()) m = descartarSilenciado(bot, it.texto);
      else {
        try { ({ m } = await processar({ autor: bot, texto: it.texto, jevFn: app.jev })); }
        catch (e) { run.erro = e.code === 'budget_exhausted' ? e.message : 'O Jev não respondeu: ' + e.message; break; }
      }
      run.i = i + 1;
      const R = run.resumo;
      if (m.status === 'publicada') R.publicadas++; else if (m.status === 'aviso') R.avisos++; else if (m.status === 'ocultada') R.ocultadas++; else R.silenciadas++;
      R.custo += m.cost || 0; if (m.ms && !m.cached) R.lat.push(m.ms);
      transmitir('sim', simPublico(run));
    }
  } finally {
    if (sim === run) sim = null;
    transmitir('sim', simPublico(run, true));
  }
}

// ---------------------------------------------------------------- rotas
const app = createApp({ name: 'chat', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/config', () => ({
  ok: true, live: LIVE, limiares: L, max_regras: MAX_REGRAS, max_regra_chars: MAX_REGRA_CHARS, max_msg: MAX_MSG,
  regras_padrao: REGRAS_PADRAO, sugestoes: SUGESTOES, categorias: CAT_LABEL, categorias_curto: CAT_CURTO, acoes: ACAO_LABEL, toxicidade: TOX_CURTO,
  simulacao_total: ROTEIRO.length, perguntas_base: Object.keys(PERGUNTAS_BASE).length,
  exemplo_pergunta_regra: perguntaRegra('<sua regra>'),
}));

app.get('/api/stats', () => ({ ok: true, ...statsPublicas(), online: online(), sim: simPublico() }));

app.post('/api/sessao', async ({ body, jev }) => {
  const s = sessao(body.sid);
  let erroApelido = null, dbg = null;
  if (typeof body.apelido === 'string' && body.apelido.trim() && limparTexto(body.apelido) !== s.nick) {
    try { dbg = (await definirApelido(s, body.apelido, jev)).dbg; }
    catch (e) { if (e.status === 400) erroApelido = e.message; else throw e; }
  }
  if (Array.isArray(body.regras)) definirRegras(s, body.regras, false);
  let retro = null;
  if (Date.now() - s.ultimoRetro > 15000) { s.ultimoRetro = Date.now(); retro = await aplicarRegras(s, jev).catch(() => null); }
  const jevs = [dbg, retro?._jev].filter(Boolean);
  return {
    ok: true, eu: s.sidh, apelido: s.nick, cor: s.cor, erro_apelido: erroApelido, regras: s.regras, lente: lente(s),
    retro: retro && { ...retro, _jev: undefined },
    silenciado_ate: s.silenciadoAte > Date.now() ? s.silenciadoAte : 0, motivo_silencio: s.motivoSilencio,
    _jev: jevs.length ? jevs : undefined,
  };
}, { rate: 60 });

app.post('/api/entrar', async ({ body, jev }) => {
  const s = sessao(body.sid);
  const { p, dbg } = await definirApelido(s, body.apelido, jev);
  return { ok: true, apelido: s.nick, cor: s.cor, p_improprio: p, _jev: dbg || undefined };
}, { rate: 12 });

app.post('/api/regras', async ({ body, jev }) => {
  const s = sessao(body.sid);
  const antes = { regras: s.regras, regrasEm: s.regrasEm };
  definirRegras(s, body.regras, true);
  s.ultimoRetro = Date.now();
  let retro;
  try { retro = await aplicarRegras(s, jev); }
  catch (e) { s.regras = antes.regras; s.regrasEm = antes.regrasEm; throw e; } // o Jev falhou: servidor e tela ficam com as regras de antes
  return { ok: true, regras: s.regras, lente: lente(s), retro: retro && { ...retro, _jev: undefined }, _jev: retro?._jev };
}, { rate: 20 });

app.post('/api/enviar', async ({ body, jev }) => {
  const s = sessao(body.sid);
  if (!s.nick) throw new HttpError(400, 'Escolha um apelido para conversar.', 'sem_apelido');
  const agora = Date.now();
  if (s.silenciadoAte > agora) throw new HttpError(403, `Você está silenciado por mais ${minutos(s.silenciadoAte - agora)} (${s.motivoSilencio}).`, 'silenciado');
  const texto = limparTexto(body.texto);
  if (!texto) throw new HttpError(400, 'Escreva alguma coisa antes de enviar.');
  if (len(texto) > MAX_MSG) throw new HttpError(400, `Máximo de ${MAX_MSG} caracteres por mensagem.`);
  if (agora - s.ultimoEnvio < MODO_LENTO_MS) throw new HttpError(429, 'Modo lento: espere um segundinho entre as mensagens.', 'rate_limited');
  s.ultimoEnvio = agora;
  const nonce = typeof body.nonce === 'string' ? body.nonce.slice(0, 40) : null;
  const { m, ctx } = await processar({ autor: s, texto, jevFn: jev, nonce });
  return {
    ok: true, msg: vista(m, s), stats: statsPublicas(),
    silenciado_ate: s.silenciadoAte > Date.now() ? s.silenciadoAte : 0, motivo_silencio: s.motivoSilencio,
    _jev: debugPara(ctx, s, m, true),
  };
}, { rate: 40 });

app.get('/api/stream', ({ query, ip, sse }) => {
  const s = sessao(query.sid);
  const n = ssePorIp.get(ip) || 0;
  if (n >= MAX_SSE_POR_IP) throw new HttpError(429, 'Muitas abas do chat abertas a partir deste endereço.', 'rate_limited');
  if (totalSse >= MAX_SSE_TOTAL) throw new HttpError(503, 'O chat está lotado agora. Tente de novo em instantes.', 'lotado');
  const ch = sse();
  ssePorIp.set(ip, n + 1); totalSse++;
  s.clientes.add(ch);
  ch.send('init', {
    eu: s.sidh, apelido: s.nick, cor: s.cor, regras: s.regras, mensagens: hist.map((m) => vista(m, s)),
    stats: statsPublicas(), online: online(), sim: simPublico(),
    silenciado_ate: s.silenciadoAte > Date.now() ? s.silenciadoAte : 0, motivo_silencio: s.motivoSilencio,
  });
  avisarOnline();
  ch.onclose = () => {
    s.clientes.delete(ch); s.visto = Date.now(); totalSse = Math.max(0, totalSse - 1);
    const k = (ssePorIp.get(ip) || 1) - 1; if (k <= 0) ssePorIp.delete(ip); else ssePorIp.set(ip, k);
    avisarOnline();
  };
  return undefined;
});

app.post('/api/simular', async ({ body }) => {
  const s = sessao(body.sid);
  if (sim) throw new HttpError(409, 'Já tem uma simulação rodando — acompanhe no chat!', 'sim_rodando');
  if (!s.clientes.size) throw new HttpError(400, 'Abra o chat nesta aba antes de simular.', 'sem_conexao');
  const dia = new Date().toISOString().slice(0, 10);
  if (simDia.dia !== dia) simDia = { dia, n: 0 };
  if (simDia.n >= MAX_SIM_DIA) throw new HttpError(429, 'Limite diário de simulações atingido. Volte amanhã!', 'budget_exhausted');
  simDia.n++; stats.simulacoes++; statsSujo = true;
  const vel = Math.min(4, Math.max(1, Number(body.velocidade) || 1));
  sim = { id: crypto.randomBytes(4).toString('hex'), por: s.sidh, i: 0, vel, parar: false, bots: new Map(), inicio: Date.now(), resumo: { publicadas: 0, avisos: 0, ocultadas: 0, silenciadas: 0, custo: 0, lat: [] } };
  const run = sim;
  transmitir('sim', simPublico(run));
  rodarSimulacao(run).catch((e) => console.error('[chat] simulação', e));
  return { ok: true, sim: simPublico(run) };
}, { rate: 6 });

app.post('/api/simular/parar', ({ body }) => {
  const s = sessao(body.sid);
  if (!sim) return { ok: true, sim: simPublico() };
  if (sim.por !== s.sidh) throw new HttpError(403, 'Só quem iniciou a simulação pode pará-la.', 'nao_autorizado');
  sim.parar = true; sim.motivo = 'interrompida por quem iniciou';
  return { ok: true };
}, { rate: 20 });

app.start(+(process.env.PORT || 4105));

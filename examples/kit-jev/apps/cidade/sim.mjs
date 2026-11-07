// Cidade Viva — núcleo da simulação (sem rede, sem I/O). Usado pelo server.mjs.
// O mundo avança de hora em hora. A cada hora, TODOS os moradores decidem numa única chamada ao Jev:
// o `state` leva a cidade (hora, dia, clima, eventos) + a ficha compacta de cada morador,
// e há uma pergunta `choice` por morador. As opções de cada morador já vêm filtradas pelas regras do
// mundo (lugar fechado, sem dinheiro, menor de idade no bar…) — o Jev escolhe entre o que é possível.

export const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_SET = {
  'seg-sex': [1, 2, 3, 4, 5], 'seg-sab': [1, 2, 3, 4, 5, 6], 'ter-dom': [2, 3, 4, 5, 6, 0],
  'qua-dom': [3, 4, 5, 6, 0], todos: [0, 1, 2, 3, 4, 5, 6], dom: [0],
};
const DIAS_TXT = { 'seg-sex': 'seg. a sex.', 'seg-sab': 'seg. a sáb.', 'ter-dom': 'ter. a dom.', 'qua-dom': 'qua. a dom.' };
const START_WEEKDAY = 5; // t = 0 é sexta-feira, 00:00 do dia 1 (um mundo novo nasce numa sexta de manhã)

// ---------------------------------------------------------------- lugares
// `ate` pode passar de 24 (bar fecha às 3h do dia seguinte). `feriado` = fecha em feriado.
export const LUGARES = {
  casa: { nome: 'Casa', emoji: '🏠' },
  escritorio: { nome: 'Escritório', emoji: '🏢', horario: [{ dias: 'seg-sex', de: 7, ate: 20 }], feriado: true },
  fabrica: { nome: 'Fábrica', emoji: '🏭', horario: [{ dias: 'seg-sab', de: 5, ate: 23 }], feriado: true },
  escola: { nome: 'Escola', emoji: '🏫', horario: [{ dias: 'seg-sex', de: 6, ate: 19 }], feriado: true },
  hospital: { nome: 'Hospital', emoji: '🏥' },
  restaurante: { nome: 'Restaurante', emoji: '🍝', horario: [{ dias: 'ter-dom', de: 10, ate: 24 }] },
  cafe: { nome: 'Café', emoji: '☕', horario: [{ dias: 'todos', de: 6, ate: 19 }] },
  mercado: { nome: 'Mercado', emoji: '🛒', horario: [{ dias: 'seg-sab', de: 7, ate: 22 }, { dias: 'dom', de: 8, ate: 14 }] },
  praca: { nome: 'Praça', emoji: '⛲' },
  academia: { nome: 'Academia', emoji: '🏋️', horario: [{ dias: 'seg-sab', de: 5, ate: 23 }, { dias: 'dom', de: 8, ate: 14 }] },
  bar: { nome: 'Bar', emoji: '🍺', horario: [{ dias: 'ter-dom', de: 17, ate: 27 }] },
  parque: { nome: 'Parque', emoji: '🌳' },
};
export const ORDEM_LUGARES = ['casa', 'escritorio', 'fabrica', 'escola', 'hospital', 'restaurante', 'cafe', 'mercado', 'praca', 'academia', 'bar', 'parque'];

// ---------------------------------------------------------------- atividades
// d = variação por hora (fome sobe = mais fome; as demais sobem = melhor). `$` = custo em R$.
export const ATIVIDADES = {
  dormir: { emoji: '😴', label: 'Dormir', lugar: 'casa', agora: 'dormindo', d: { fome: 2, energia: 14, social: 0, diversao: 0, saude: 1 } },
  trabalhar: { emoji: '💼', label: 'Trabalhar', lugar: 'trabalho', agora: 'trabalhando', d: { fome: 6, energia: -7, social: 2, diversao: -4, saude: 0 } },
  comer_no_restaurante: { emoji: '🍝', label: 'Comer no restaurante', lugar: 'restaurante', agora: 'comendo no restaurante', d: { fome: -55, energia: -1, social: 10, diversao: 8, saude: 0 } },
  cozinhar_em_casa: { emoji: '🍳', label: 'Cozinhar em casa', lugar: 'casa', agora: 'cozinhando e comendo em casa', d: { fome: -45, energia: -3, social: -2, diversao: 2, saude: 1 } },
  fazer_compras: { emoji: '🛒', label: 'Fazer compras', lugar: 'mercado', agora: 'fazendo compras no mercado', d: { fome: 5, energia: -4, social: 3, diversao: 2, saude: 0 } },
  socializar_na_praca: { emoji: '💬', label: 'Socializar na praça', lugar: 'praca', agora: 'na praça com outras pessoas', d: { fome: 5, energia: -3, social: 22, diversao: 12, saude: 0 } },
  tomar_cafe: { emoji: '☕', label: 'Tomar café', lugar: 'cafe', agora: 'tomando café na cafeteria', d: { fome: -15, energia: 12, social: 8, diversao: 4, saude: 0 } },
  treinar_na_academia: { emoji: '🏋️', label: 'Treinar na academia', lugar: 'academia', agora: 'treinando na academia', d: { fome: 9, energia: -12, social: 4, diversao: 8, saude: 5 } },
  ir_ao_bar: { emoji: '🍺', label: 'Ir ao bar', lugar: 'bar', agora: 'no bar', d: { fome: -5, energia: -6, social: 20, diversao: 24, saude: -3 } },
  ir_ao_medico: { emoji: '🩺', label: 'Ir ao médico', lugar: 'hospital', agora: 'no médico', d: { fome: 5, energia: -3, social: 1, diversao: -4, saude: 35 } },
  descansar_em_casa: { emoji: '🛋️', label: 'Descansar em casa', lugar: 'casa', agora: 'descansando em casa', d: { fome: 5, energia: 7, social: -3, diversao: 6, saude: 1 } },
  passear_no_parque: { emoji: '🌳', label: 'Passear no parque', lugar: 'parque', agora: 'passeando no parque', d: { fome: 5, energia: -3, social: 6, diversao: 10, saude: 3 } },
};
export const ORDEM_ATIVIDADES = Object.keys(ATIVIDADES);
const AO_AR_LIVRE = new Set(['praca', 'parque']);
const COMER = new Set(['comer_no_restaurante', 'cozinhar_em_casa']); // refeição de verdade (café e bar só enganam a fome)
const DESPENSA_MAX = 12;
const PRECO = { restaurante: 45, restaurante_desconto: 22, cafe: 12, mercado: 60, academia: 10, bar: 50 };

// ---------------------------------------------------------------- eventos (modo Deus)
export const EVENTOS = {
  show: { emoji: '🎸', titulo: 'Show grátis na praça', dur: 4, lugar: 'praca', estado: (ate) => `🎸 SHOW GRÁTIS de música ao vivo na praça, acontecendo agora (até ${ate}). Todo mundo está convidado.` },
  tempestade: { emoji: '⛈️', titulo: 'Tempestade', dur: 5, lugar: null, estado: (ate) => `⛈️ TEMPESTADE forte com raios e ventania (até ${ate}). Perigoso ficar na rua ou ao ar livre.` },
  desconto: { emoji: '🍝', titulo: 'Restaurante com 50% de desconto', dur: 5, lugar: 'restaurante', estado: (ate) => `🍝 PROMOÇÃO: restaurante com 50% de desconto em todo o cardápio (R$ ${PRECO.restaurante_desconto} em vez de R$ ${PRECO.restaurante}, até ${ate}).` },
  gripe: { emoji: '🤒', titulo: 'Surto de gripe', dur: 12, lugar: 'hospital', estado: (ate) => `🤒 SURTO DE GRIPE na cidade: muitos moradores com febre (alerta da saúde até ${ate}). O hospital atende de graça.` },
  folga: { emoji: '🏭', titulo: 'Fábrica dá folga', dur: 24, lugar: 'fabrica', estado: (ate) => `🏭 A fábrica deu FOLGA para todos os funcionários e está fechada (até ${ate}).` },
  feriado: { emoji: '🎉', titulo: 'Feriado', dur: 24, lugar: null, estado: (ate) => `🎉 FERIADO na cidade (até ${ate}): escritório, escola e fábrica fechados.` },
  livre: { emoji: '📣', titulo: 'Evento livre', dur: 4, lugar: null },
};

// ---------------------------------------------------------------- utilidades
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.round(rnd(a, b));
function mulberry32(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pad = (h) => String(h).padStart(2, '0') + ':00';

export function relogio(t) {
  const dia = Math.floor(t / 24) + 1;
  const hora = ((t % 24) + 24) % 24;
  const dow = (START_WEEKDAY + Math.floor(t / 24)) % 7;
  const periodo = hora < 5 ? 'madrugada' : hora < 12 ? 'manhã' : hora < 18 ? 'tarde' : 'noite';
  return { t, dia, hora, dow, diaSemana: DIAS[dow], periodo, label: pad(hora) };
}
export function rotuloHoraAbs(tAbs, tAgora) {
  const a = relogio(tAbs), b = relogio(tAgora);
  if (a.dia === b.dia) return pad(a.hora);
  if (a.dia === b.dia + 1) return (a.hora === 0 ? 'meia-noite' : 'amanhã ' + pad(a.hora));
  return `${a.diaSemana} ${pad(a.hora)}`;
}

export function eventoAtivo(w, tipo) { return w.eventos.find((e) => e.tipo === tipo); }

export const despensaDe = (p, w) => (w.casas && w.casas[p.casa] ? w.casas[p.casa].despensa : 0);

export function aberto(lugarId, w, t = w.t) {
  const L = LUGARES[lugarId];
  if (!L) return false;
  if (L.feriado && eventoAtivo(w, 'feriado')) return false;
  if (lugarId === 'fabrica' && eventoAtivo(w, 'folga')) return false;
  if (!L.horario) return true;
  const { hora, dow } = relogio(t);
  for (const r of L.horario) {
    const dias = DIAS_SET[r.dias];
    if (dias.includes(dow) && hora >= r.de && hora < Math.min(r.ate, 24)) return true;
    if (r.ate > 24 && hora < r.ate - 24 && dias.includes((dow + 6) % 7)) return true;
  }
  return false;
}

function precoRestaurante(w) { return eventoAtivo(w, 'desconto') ? PRECO.restaurante_desconto : PRECO.restaurante; }

// Situação do turno de trabalho/aula do morador na hora t.
export function turno(p, w, t = w.t) {
  if (!p.trabalho) return { tem: false, agora: false, txt: null };
  const { hora, dow } = relogio(t);
  const [a, b] = p.turno;
  const dias = DIAS_SET[p.dias];
  const estudante = p.trabalho === 'escola' && p.salario === 0;
  const nomeT = estudante ? 'aula' : 'turno';
  const faixa = `${a}h–${b}h`;
  const fechado = !aberto(p.trabalho, w, t) && (
    (LUGARES[p.trabalho].feriado && eventoAtivo(w, 'feriado')) || (p.trabalho === 'fabrica' && eventoAtivo(w, 'folga')));
  let agora;
  if (a < b) agora = dias.includes(dow) && hora >= a && hora < b;
  else agora = (dias.includes(dow) && hora >= a) || (dias.includes((dow + 6) % 7) && hora < b);
  const diaTxt = DIAS_TXT[p.dias] || '';
  if (fechado) return { tem: true, agora: false, txt: `hoje está de folga (${eventoAtivo(w, 'feriado') ? 'feriado' : 'a fábrica deu folga'})` };
  if (agora) return { tem: true, agora: true, txt: `EM HORÁRIO DE ${estudante ? 'AULA' : 'TRABALHO'} (${nomeT} ${faixa})` };
  if (dias.includes(dow) && hora < a) return { tem: true, agora: false, txt: `${nomeT} hoje começa às ${a}h (${faixa})` };
  if (dias.includes(dow) && a < b && hora >= b) return { tem: true, agora: false, txt: `${nomeT} de hoje já acabou (${faixa})` };
  return { tem: true, agora: false, txt: `hoje não tem ${nomeT} (${nomeT} ${faixa}, ${diaTxt})` };
}

// ---------------------------------------------------------------- clima
function novoDiaClima(w) {
  const frio = Math.random() < 0.22;
  w.clima.base = frio ? rnd(12, 15) : rnd(19, 27);
  w.clima.chanceChuva = Math.random() < 0.3 ? rnd(0.35, 0.6) : rnd(0.03, 0.18);
}
function passoClima(w) {
  const { hora } = relogio(w.t);
  if (hora === 0 || w.clima.base == null) novoDiaClima(w);
  if (eventoAtivo(w, 'tempestade')) w.clima.cond = 'tempestade';
  else if (w.clima.cond === 'tempestade' || hora % 3 === 0) {
    if (w.clima.cond === 'tempestade' || Math.random() < 0.55) {
      const r = Math.random();
      w.clima.cond = r < w.clima.chanceChuva ? 'chuva' : r < w.clima.chanceChuva + 0.25 ? 'nublado' : 'sol';
    }
  }
  const chuva = w.clima.cond === 'chuva' || w.clima.cond === 'tempestade';
  w.clima.temp = Math.round(w.clima.base + 4.5 * Math.sin(((hora - 9) / 24) * 2 * Math.PI) - (chuva ? 2 : 0));
}
export function climaInfo(w) {
  const { hora } = relogio(w.t);
  const noite = hora < 6 || hora >= 19;
  const c = w.clima.cond, temp = w.clima.temp;
  const frio = temp <= 14;
  const base = { sol: noite ? ['🌙', 'Céu limpo'] : ['☀️', 'Sol'], nublado: ['☁️', 'Nublado'], chuva: ['🌧️', 'Chuva'], tempestade: ['⛈️', 'Tempestade'] }[c] || ['☀️', 'Sol'];
  const txtJev = { sol: noite ? 'céu limpo' : 'sol', nublado: 'nublado', chuva: 'chovendo', tempestade: 'tempestade com raios' }[c];
  return { cond: c, temp, frio, noite, emoji: frio && c !== 'tempestade' && c !== 'chuva' ? '🥶' : base[0], label: frio && c !== 'tempestade' ? `${base[1]} e frio` : base[1], jev: `${txtJev}, ${temp}°C${frio ? ' (frio)' : ''}` };
}

// ---------------------------------------------------------------- mundo
export function criarMundo(perfis, seed = 20260923) {
  const R = mulberry32(seed);
  const r = (a, b) => a + R() * (b - a);
  const w = {
    versao: 1, t: 5, clima: { cond: 'sol', temp: 18, base: 21, chanceChuva: 0.1 }, eventos: [], seqEvento: 0,
    feed: [], stats: { horas: 0, custo: 0, decisoes: 0, tokens: 0, porData: {}, ultimas: [] },
    moradores: {}, casas: {},
  };
  for (const p of perfis) w.casas[p.casa] ||= { despensa: Math.round(r(4, 9)) }; // a despensa é da casa (a família divide)
  for (const p of perfis) {
    const adulto = p.idade >= 18;
    const dinheiro = p.trabalho ? (adulto ? Math.round(r(160, 620)) : Math.round(r(25, 90))) : p.prof.startsWith('aposentad') ? Math.round(r(180, 480)) : Math.round(r(30, 70));
    w.moradores[p.id] = {
      atv: 'dormir', lugar: p.casa, horas: 7, p: 1,
      fome: Math.round(r(22, 50)), energia: Math.round(r(62, 92)), social: Math.round(r(35, 75)), diversao: Math.round(r(35, 75)),
      saude: Math.round(r(78, 98)), dinheiro, gripe: false, semComer: Math.round(r(8, 11)), acordado: 0,
      hist: [], probs: null, alt: null,
    };
  }
  return w;
}

// Carrega um mundo salvo, completando moradores novos/ausentes.
export function normalizarMundo(w, perfis) {
  const base = criarMundo(perfis);
  if (!w || typeof w !== 'object' || w.versao !== 1) return base;
  w.moradores ||= {};
  for (const p of perfis) if (!w.moradores[p.id]) w.moradores[p.id] = base.moradores[p.id];
  for (const m of Object.values(w.moradores)) { m.semComer ??= 4; m.acordado ??= 0; m.hist ||= []; }
  if (!w.casas) {
    w.casas = {};
    for (const p of perfis) { const c = (w.casas[p.casa] ||= { despensa: 0 }); c.despensa = Math.min(DESPENSA_MAX, c.despensa + (w.moradores[p.id].despensa || 0)); }
  }
  for (const p of perfis) w.casas[p.casa] ||= { despensa: 4 };
  for (const id of Object.keys(w.moradores)) if (!perfis.find((p) => p.id === id)) delete w.moradores[id];
  w.eventos ||= []; w.feed ||= []; w.stats ||= base.stats; w.stats.porData ||= {}; w.stats.ultimas ||= [];
  w.clima ||= base.clima;
  return w;
}

// ---------------------------------------------------------------- opções viáveis por morador
const LAZER = new Set(['socializar_na_praca', 'passear_no_parque', 'ir_ao_bar', 'treinar_na_academia']);
// "Fraco de fome": sem comer há 14 h+ e com fome >= 95, o morador não tem forças para lazer (regra do mundo,
// como lugar fechado). O Jev segue escolhendo entre comer, dormir, descansar etc. Rede de segurança rara.
export function fracoDeFome(m) { return (m.semComer || 0) >= 14 && m.fome >= 95; }
export function opcoes(p, m, w) {
  const out = ['dormir', 'descansar_em_casa'];
  if (p.trabalho && aberto(p.trabalho, w)) out.push('trabalhar');
  const desp = despensaDe(p, w);
  if (desp >= 1) out.push('cozinhar_em_casa');
  if (aberto('restaurante', w) && m.dinheiro >= precoRestaurante(w)) out.push('comer_no_restaurante');
  if (aberto('mercado', w) && m.dinheiro >= 20 && desp <= DESPENSA_MAX - 5) out.push('fazer_compras');
  if (aberto('cafe', w) && m.dinheiro >= PRECO.cafe) out.push('tomar_cafe');
  if (aberto('academia', w) && m.dinheiro >= PRECO.academia) out.push('treinar_na_academia');
  if (aberto('bar', w) && p.idade >= 18 && m.dinheiro >= 25) out.push('ir_ao_bar');
  if (m.gripe || m.saude < 75 || /preocupad/.test(p.tracos.join(' '))) out.push('ir_ao_medico');
  out.push('socializar_na_praca', 'passear_no_parque');
  const fraco = fracoDeFome(m);
  return ORDEM_ATIVIDADES.filter((a) => out.includes(a) && !(fraco && LAZER.has(a)));
}

// Critérios = a política. Formato "O quê (preço). Para quem …": o Jev casa a ficha do morador ("com sono",
// "FAMINTA", "EM HORÁRIO DE TRABALHO", "bem disposta") com o "para quem" de cada opção. Lazer é "para quem está bem
// disposto": sem isso, quem estava faminto havia 30 h seguia correndo atrás de show e circo (medido: P(comer) 6–17%
// → 45–84% com este texto + a ficha "precisa comer antes de qualquer outra coisa").
export function criterio(atv, p, w) {
  switch (atv) {
    case 'dormir': return 'Dormir. Para quem está com sono ou cansado; o normal de madrugada.';
    case 'descansar_em_casa': return 'Relaxar em casa (TV, leitura). Para quem quer sossego.';
    case 'trabalhar':
      if (p.trabalho === 'escola' && p.salario === 0) return 'Ir à aula. Para quem está em horário de aula.';
      return `Trabalhar (${LUGARES[p.trabalho].nome.toLowerCase()}, R$ ${p.salario}/h). Para quem está em horário de trabalho.`;
    case 'cozinhar_em_casa': return 'Cozinhar em casa. Para quem está com fome e quer economizar.';
    case 'comer_no_restaurante': return `Restaurante (R$ ${precoRestaurante(w)}${eventoAtivo(w, 'desconto') ? ', 50% off' : ''}). Para quem está com fome e quer comer fora.`;
    case 'fazer_compras': return `Mercado (R$ ${PRECO.mercado}). Para quem está com a despensa de casa vazia.`;
    case 'tomar_cafe': return `Cafeteria (R$ ${PRECO.cafe}). Para quem quer despertar ou lanchar.`;
    case 'treinar_na_academia': return `Academia (R$ ${PRECO.academia}). Para quem está bem disposto e gosta de se exercitar.`;
    case 'ir_ao_bar': return `Bar (R$ ${PRECO.bar}). Para quem está bem disposto e quer festa e conversa à noite.`;
    case 'ir_ao_medico': return 'Médico no hospital (grátis). Para quem está com gripe, febre ou doente.';
    case 'socializar_na_praca': return 'Praça (grátis). Para quem está bem disposto e quer ver gente e curtir o que rola lá.';
    case 'passear_no_parque': return 'Parque (grátis). Para quem está bem disposto e quer ar livre e movimento.';
    default: return atv;
  }
}

export function estadoEmPalavras(p, m, w) {
  const o = (masc, fem) => (p.g === 'f' ? fem : masc);
  const h = relogio(w.t).hora;
  const noite = h >= 23 || h < 6;
  const s = [];
  if (m.gripe) s.push('COM GRIPE E FEBRE');
  if (m.fome >= 88) s.push(`${o('FAMINTO', 'FAMINTA')}, com muita fome há ${Math.max(1, m.semComer || 0)}h — precisa comer antes de qualquer outra coisa`);
  else if (m.fome >= 75) s.push(o('FAMINTO', 'FAMINTA'));
  else if (m.fome >= 55) s.push('com fome');
  else if (m.fome >= 38) s.push('com um pouco de fome');
  if (m.energia < 20) s.push('caindo de sono');
  else if (m.atv !== 'dormir' && (m.acordado >= 16 || (noite && m.energia < 80))) s.push('com sono');
  else if (m.energia < 40) s.push(o('cansado', 'cansada'));
  if (m.atv === 'dormir' && m.energia >= 90 && m.horas >= 6) s.push('sono em dia, hora de levantar');
  if (m.saude < 40 && !m.gripe) s.push('com a saúde fraca');
  if (m.social < 25) s.push(o('se sentindo sozinho', 'se sentindo sozinha'));
  if (m.diversao < 25) s.push(o('entediado', 'entediada'));
  if (m.dinheiro < 30) s.push('quase sem dinheiro');
  if (!s.length) s.push(o('bem disposto', 'bem disposta') + ', sem nenhuma necessidade urgente');
  return s.join(', ');
}

// Ficha compacta do morador para o `state`. Necessidades vão em PALAVRAS ("FAMINTA", "com sono"):
// medimos que o Jev reage muito melhor a palavras salientes do que a números (ver README).
// A atividade da última hora NÃO entra: ela ancorava o Jev e criava inércia (gente 20h seguidas na praça).
export function ficha(p, m, w) {
  const tu = turno(p, w);
  const partes = [`${p.nome}, ${p.idade} anos, ${p.prof} (${p.tracos.join(', ')})`];
  if (tu.txt) partes.push(tu.txt);
  partes.push(`agora está: ${estadoEmPalavras(p, m, w)}`);
  const sono = m.atv === 'dormir' ? `dormindo há ${m.horas}h` : `sem dormir há ${m.acordado}h`;
  partes.push(`comeu há ${m.semComer}h, ${sono}`);
  const desp = despensaDe(p, w);
  partes.push(`R$ ${m.dinheiro}, despensa de casa com ${desp} refeiç${desp === 1 ? 'ão' : 'ões'}`);
  return partes.join(' | ');
}

function dicaPeriodo(h) {
  return h >= 23 || h < 5 ? 'madrugada, hora de dormir' : h < 7 ? 'começo da manhã' : h < 11 ? 'manhã' : h < 14 ? 'hora do almoço'
    : h < 18 ? 'tarde' : h < 21 ? 'noite, hora do jantar e de sair' : 'noite';
}

// Monta a chamada da hora `t` (a hora que está começando). Devolve { state, questions, opcoes }.
export function montarChamada(w, perfis) {
  const rel = relogio(w.t);
  const clima = climaInfo(w);
  const fechados = ORDEM_LUGARES.filter((l) => LUGARES[l].horario || l === 'fabrica').filter((l) => !aberto(l, w));
  const diaTipo = eventoAtivo(w, 'feriado') ? 'feriado' : rel.dow === 0 || rel.dow === 6 ? 'fim de semana' : 'dia útil';
  const eventos = w.eventos.map((e) => e.estado);
  const state = {
    cidade: 'Vila Jev, uma cidade pequena do interior do Brasil',
    agora: `${rel.diaSemana}, ${rel.label} (${dicaPeriodo(rel.hora)}) — ${diaTipo}`,
    clima: clima.jev,
    eventos_na_cidade: eventos.length ? eventos : 'nenhum evento especial agora',
    lugares_fechados_agora: fechados.length ? fechados.map((l) => LUGARES[l].nome.toLowerCase()).join(', ') : 'nenhum',
    precos: `restaurante R$ ${precoRestaurante(w)} · café R$ ${PRECO.cafe} · bar R$ ${PRECO.bar} · compras no mercado R$ ${PRECO.mercado} · academia R$ ${PRECO.academia} · médico grátis`,
    moradores: {},
  };
  const questions = {}; const ops = {};
  const prox = `${rel.label} às ${pad((rel.hora + 1) % 24)}`;
  for (const p of perfis) {
    const m = w.moradores[p.id];
    state.moradores[p.id] = ficha(p, m, w);
    const o = opcoes(p, m, w);
    ops[p.id] = o;
    const criteria = {};
    for (const a of o) criteria[a] = criterio(a, p, w);
    questions[p.id] = {
      type: 'choice',
      instructions: `O que ${p.nome} (${p.id}) faz das ${prox}? Veja moradores.${p.id}, a hora, o clima e os eventos.`,
      criteria,
    };
  }
  return { state, questions, opcoes: ops };
}

// ---------------------------------------------------------------- aplicar a hora
function felicidadeDe(m) {
  const dinheiro = clamp(m.dinheiro / 5);
  const f = ((100 - m.fome) + m.energia + m.social + m.diversao + m.saude + dinheiro) / 6 - (m.gripe ? 10 : 0);
  return clamp(f) / 100;
}

function aplicarEfeitos(p, m, atv, w) {
  const d = { ...ATIVIDADES[atv].d };
  const tr = p.tracos.join(' ');
  const acordado = atv !== 'dormir';
  if (/soci[aá]vel/.test(tr)) d.social = d.social <= 0 ? d.social - 2 : Math.round(d.social * 1.3);
  if (/caseir/.test(tr)) { if (d.social < 0) d.social += 2; if (atv === 'descansar_em_casa' || atv === 'cozinhar_em_casa') d.diversao += 3; }
  if (/festeir/.test(tr)) { if (d.diversao <= 0 && acordado) d.diversao -= 2; if (atv === 'ir_ao_bar') d.diversao = Math.round(d.diversao * 1.4); }
  if (/comil/.test(tr) && d.fome >= 0) d.fome += 2;
  if (/dorminhoc/.test(tr) && acordado && d.energia < 0) d.energia -= 2;
  if (/fitness/.test(tr) && (atv === 'treinar_na_academia' || atv === 'passear_no_parque')) d.diversao += 8;
  if (/viciad/.test(tr)) { if (atv === 'tomar_cafe') d.energia += 6; else if (acordado) d.energia -= 1; }
  const lugar = ATIVIDADES[atv].lugar;
  if (AO_AR_LIVRE.has(lugar)) {
    const c = w.clima.cond;
    if (c === 'chuva') { d.diversao -= 10; d.saude -= 2; }
    if (c === 'tempestade') { d.diversao -= 18; d.saude -= 5; }
    if (w.clima.temp <= 14) d.diversao -= 4;
  }
  if (atv === 'socializar_na_praca' && eventoAtivo(w, 'show')) { d.diversao += /festeir/.test(tr) ? 28 : 20; d.social += 8; }
  // Quem trabalha 4 h+ sem comer faz uma refeição no serviço (marmita/refeitório) — senão ninguém almoça no turno.
  let comeuNoTrabalho = false;
  if (atv === 'trabalhar' && (m.semComer || 0) >= 4 && m.fome >= 40) { d.fome -= 45; comeuNoTrabalho = true; }
  if (m.gripe) { d.saude -= 3; d.energia -= 3; }
  if (m.fome >= 90) d.saude -= 2;
  if (m.energia <= 5 && acordado) d.saude -= 1;

  let gasto = 0;
  if (atv === 'trabalhar') m.dinheiro += p.salario;
  if (atv === 'comer_no_restaurante') gasto = precoRestaurante(w);
  if (atv === 'tomar_cafe') gasto = PRECO.cafe;
  if (atv === 'treinar_na_academia') gasto = PRECO.academia;
  if (atv === 'ir_ao_bar') gasto = Math.min(PRECO.bar, m.dinheiro);
  const casa = w.casas && w.casas[p.casa];
  if (atv === 'fazer_compras') { gasto = Math.min(PRECO.mercado, m.dinheiro); if (casa) casa.despensa = Math.min(DESPENSA_MAX, casa.despensa + Math.max(1, Math.round(6 * gasto / PRECO.mercado))); }
  if (atv === 'cozinhar_em_casa' && casa) casa.despensa = Math.max(0, casa.despensa - 1);
  if (atv === 'ir_ao_medico' && m.gripe) m.gripe = false;
  m.dinheiro = Math.max(0, m.dinheiro - gasto);

  for (const k of ['fome', 'energia', 'social', 'diversao', 'saude']) m[k] = Math.round(clamp(m[k] + d[k]));
  m.semComer = COMER.has(atv) || comeuNoTrabalho ? 0 : (m.semComer || 0) + 1;
  m.acordado = atv === 'dormir' ? 0 : (m.acordado || 0) + 1;
}

// Viradas diárias (meia-noite): contas, aposentadoria, mesada.
function viradaDoDia(w, perfis) {
  for (const p of perfis) {
    const m = w.moradores[p.id];
    if (p.idade >= 18) m.dinheiro = Math.max(0, m.dinheiro - 30);
    if (p.prof.startsWith('aposentad')) m.dinheiro += 85;
    if (p.idade < 18) m.dinheiro += 20;
    if (p.prof === 'desempregado') m.dinheiro += 25;
    m.hist = [];
  }
}

// Avança o relógio para a próxima hora (antes de chamar o Jev).
export function avancarRelogio(w, perfis) {
  w.t += 1;
  w.eventos = w.eventos.filter((e) => e.ate > w.t);
  if (relogio(w.t).hora === 0) viradaDoDia(w, perfis);
  passoClima(w);
}

// Escolha final. Em geral é a opção mais provável do Jev. Quando o Jev está DIVIDIDO entre opções quase empatadas
// (cada uma com >= 60% da probabilidade da primeira), a cidade sorteia entre elas com peso p^3. Sem isso, um empate
// (ex.: cozinhar 38% × praça 36%) dava sempre o mesmo resultado hora após hora e o morador "travava".
export const AFIAR = 3, EMPATE = 0.6;
export function sortear(probs, k = AFIAR, rnd = Math.random) {
  const ent = Object.entries(probs || {}).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
  if (!ent.length) return null;
  const cand = ent.filter(([, p]) => p >= ent[0][1] * EMPATE);
  const pesos = cand.map(([a, p]) => [a, Math.pow(p, k)]);
  const tot = pesos.reduce((s, [, v]) => s + v, 0);
  let r = rnd() * tot;
  for (const [a, v] of pesos) { r -= v; if (r <= 0) return a; }
  return pesos[pesos.length - 1][0];
}

// Aplica as respostas do Jev. Devolve o resumo da hora para o feed/SSE.
export function aplicarDecisoes(w, perfis, answers, ops) {
  const rel = relogio(w.t);
  const mudancas = [];
  let semResposta = 0;
  for (const p of perfis) {
    const m = w.moradores[p.id];
    const a = answers && answers[p.id];
    const validas = ops[p.id];
    const probs = {};
    if (a && a.probabilities) for (const [k, v] of Object.entries(a.probabilities)) if (validas.includes(k)) probs[k] = Math.round(v * 1000) / 1000;
    let atv = sortear(probs) || (a && a.choice);
    if (!atv || !validas.includes(atv)) { semResposta++; atv = validas.includes(m.atv) ? m.atv : 'descansar_em_casa'; }
    const ord = Object.entries(probs).sort((x, y) => y[1] - x[1]);
    const pTop = probs[atv] ?? (a && a.confidence) ?? null;
    const alt = ord.find(([k]) => k !== atv);
    m.segiuTop = ord.length ? ord[0][0] === atv : true;
    const antes = m.atv;
    m.horas = antes === atv ? m.horas + 1 : 1;
    m.atv = atv;
    m.p = pTop;
    m.probs = probs;
    m.alt = alt && alt[1] >= 0.12 ? { atv: alt[0], p: alt[1] } : null;
    const lugar = ATIVIDADES[atv].lugar;
    m.lugar = lugar === 'casa' ? p.casa : lugar === 'trabalho' ? p.trabalho : lugar;
    aplicarEfeitos(p, m, atv, w);
    m.hist.push(atv); if (m.hist.length > 24) m.hist.shift();
    if (antes !== atv) mudancas.push({ id: p.id, atv, de: antes, p: pTop, alt: m.alt });
  }
  // Seleciona o que vai para o feed: prioriza reações a eventos, atividades raras e decisões apertadas.
  const lugaresEvento = new Set(w.eventos.map((e) => e.lugar).filter(Boolean));
  const raras = new Set(['ir_ao_medico', 'ir_ao_bar', 'socializar_na_praca', 'passear_no_parque', 'treinar_na_academia', 'comer_no_restaurante', 'fazer_compras']);
  const peso = (c) => {
    const lug = ATIVIDADES[c.atv].lugar;
    let s = 0;
    if (lugaresEvento.has(lug) || (lug === 'trabalho' && lugaresEvento.has(perfis.find((p) => p.id === c.id).trabalho))) s += 5;
    if (raras.has(c.atv)) s += 2;
    if (c.alt && c.p != null && c.p - c.alt.p < 0.25) s += 1.5;
    return s + Math.random();
  };
  const escolhidas = [...mudancas].sort((a, b) => peso(b) - peso(a)).slice(0, 7);
  const feed = escolhidas.map((c) => ({ k: 'd', t: w.t, id: c.id, atv: c.atv, p: c.p, alt: c.alt }));
  if (mudancas.length > escolhidas.length) feed.push({ k: 'mais', t: w.t, n: mudancas.length - escolhidas.length });
  return { rel, mudancas: mudancas.length, semResposta, feed };
}

export function ocupacao(w, perfis) {
  const o = Object.fromEntries(ORDEM_LUGARES.map((l) => [l, 0]));
  for (const p of perfis) {
    const m = w.moradores[p.id];
    const l = m.lugar && m.lugar.startsWith('c') && m.lugar.length === 3 ? 'casa' : m.lugar;
    if (l in o) o[l]++;
  }
  return o;
}

export function felicidadeMedia(w, perfis) {
  let s = 0; for (const p of perfis) s += felicidadeDe(w.moradores[p.id]);
  return s / perfis.length;
}
export function felicidade(m) { return felicidadeDe(m); }

// Cria um evento a partir do modo Deus. `extra` traz o texto/classificação do evento livre.
export function criarEvento(w, tipo, extra = {}, perfis = []) {
  const def = EVENTOS[tipo];
  const ate = w.t + 1 + def.dur; // vale a partir da próxima hora
  const id = 'e' + (++w.seqEvento);
  const ateTxt = rotuloHoraAbs(ate, w.t + 1);
  let ev;
  if (tipo === 'livre') {
    const lugarTxt = extra.lugar && extra.lugar !== 'cidade_toda' ? ` (perto de: ${LUGARES[extra.lugar]?.nome.toLowerCase() || extra.lugar})` : '';
    ev = { id, tipo, emoji: extra.emoji || '📣', titulo: extra.texto, lugar: extra.lugar && LUGARES[extra.lugar] ? extra.lugar : null, ate, criado: w.t, estado: `📣 Acontecendo na cidade agora (até ${ateTxt}): "${extra.texto}"${lugarTxt}` };
  } else {
    ev = { id, tipo, emoji: def.emoji, titulo: def.titulo, lugar: def.lugar, ate, criado: w.t, estado: def.estado(ateTxt) };
  }
  // Um evento do mesmo tipo substitui o anterior (renova a duração); eventos livres acumulam até 3.
  if (tipo !== 'livre') w.eventos = w.eventos.filter((e) => e.tipo !== tipo);
  else { const livres = w.eventos.filter((e) => e.tipo === 'livre'); if (livres.length >= 3) w.eventos = w.eventos.filter((e) => e.id !== livres[0].id); }
  w.eventos.push(ev);
  const efeitos = [];
  if (tipo === 'tempestade') w.clima.cond = 'tempestade';
  if (tipo === 'gripe') {
    const alvos = perfis.filter(() => Math.random() < 0.38);
    for (const p of alvos) { const m = w.moradores[p.id]; m.gripe = true; m.saude = Math.min(m.saude, irnd(24, 42)); m.energia = Math.max(0, m.energia - 15); }
    efeitos.push(`${alvos.length} moradores pegaram gripe`);
  }
  return { ev, efeitos };
}

export function eventoParaCliente(e, w) {
  return { id: e.id, tipo: e.tipo, emoji: e.emoji, titulo: e.titulo, lugar: e.lugar, ate: e.ate, ate_label: rotuloHoraAbs(e.ate, w.t), resta: Math.max(0, e.ate - w.t) };
}

export { PRECO };

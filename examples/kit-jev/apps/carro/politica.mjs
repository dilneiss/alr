// Política de direção do Carro Autônomo: como os sensores viram o `state` do Jev e quais perguntas ele responde.
// Usado pelo servidor (server.mjs) e pelo teste de cenários (test/cenarios.mjs).
// O Jev NÃO recebe texto livre do navegador: o cliente manda só números e enumerações; o texto é montado aqui.

export const ACOES = {
  acelerar: 'Acelerar: minha faixa está livre à frente (nenhum carro parado ou mais lento perto, nenhum pedestre, nenhum obstáculo; semáforo verde ou distante) e estou abaixo do limite de velocidade — inclusive para completar uma ultrapassagem pela esquerda. Também para sair quando estou parado, o sinal abriu (verde) e não há carro parado logo à minha frente.',
  manter: 'Manter a velocidade: estou no limite de velocidade e nada exige frear; ou sigo um carro à frente a distância segura na mesma velocidade dele; ou o carro mais lento à frente ainda está longe (a mais de 80 m); ou o sinal ficou amarelo tão perto que não dá mais para parar com segurança (seguir em frente).',
  frear_suave: 'Frear suave: algo à frente exige reduzir ou parar e ainda há distância — sinal vermelho, sinal amarelo com distância para parar, pedestre na faixa de pedestres, obstáculo ou carro lento à frente sem faixa livre para desviar; ou estou acima do limite de velocidade ou do limite menor que começa logo à frente. Também para continuar parado no sinal vermelho, atrás de um carro parado ou esperando o pedestre.',
  frear_forte: 'Frear forte: risco de colisão — carro, pedestre ou obstáculo muito perto na minha faixa (menos de 2 segundos para chegar lá) e sem como desviar.',
  mudar_para_esquerda: 'Mudar para a faixa da esquerda: minha faixa está bloqueada à frente por um obstáculo ou por um carro mais lento, e a faixa da esquerda está livre (dá para entrar e seguir). Nunca para passar por pedestre.',
  mudar_para_direita: 'Mudar para a faixa da direita: estou na esquerda e a faixa da direita está livre (dá para entrar e seguir) — voltar para a direita depois de ultrapassar, ou desviar de algo na minha faixa. Se a direita não está livre, fique onde está.',
};
export const ACAO_IDS = Object.keys(ACOES);

export const MOTIVOS = {
  pista_livre: 'Pista livre: nada à frente exige atenção (inclui sinal verde e voltar para a direita)',
  carro_lento_a_frente: 'Carro mais lento (ou parado no trânsito) à frente na minha faixa',
  semaforo_vermelho: 'Semáforo vermelho à frente',
  semaforo_amarelo: 'Semáforo amarelo à frente',
  pedestre: 'Pedestre atravessando ou prestes a atravessar a faixa de pedestres à frente',
  obstaculo: 'Obstáculo parado na minha faixa (cones, obras)',
  limite_de_velocidade: 'Limite de velocidade: estou no limite, acima dele, ou entrando numa zona de limite menor',
};
export const MOTIVO_IDS = Object.keys(MOTIVOS);

export const PERIGO = [
  'Seguro: nada relevante à frente',
  'Atenção: algo à frente exige cuidado (sinal, pedestre, carro mais lento), com tempo e espaço de sobra',
  'Risco: algo perto exige ação agora (frear ou desviar já)',
  'Perigo iminente: colisão em menos de 2 segundos se nada for feito',
];

const INSTR_ACAO = 'Você dirige este carro autônomo numa avenida de mão única com 2 faixas. Regras: respeite semáforos e limites de velocidade; pare para pedestres na faixa de pedestres (eles cruzam todas as faixas); mantenha-se na faixa da direita e use a esquerda só para ultrapassar ou desviar. Leia os sensores e escolha o comando para agora.';

// ---------------------------------------------------------------- validação
const num = (x, lo, hi) => { const n = Number(x); if (!Number.isFinite(n)) return null; return Math.min(hi, Math.max(lo, n)); };
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const obj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const DMAX = 250;

function carro(x) {
  if (!obj(x)) return null;
  const d = num(x.d, 0, DMAX), v = num(x.v, 0, 200);
  return d == null || v == null ? null : { d, v };
}
function vizinha(x) {
  if (!obj(x)) return null; // faixa não existe
  return {
    lado: !!x.lado,
    entrar: !!x.entrar,
    fr: carro(x.fr),
    at: carro(x.at),
    obs: x.obs == null ? null : num(x.obs, 0, DMAX),
  };
}

// Normaliza o objeto de sensores vindo do navegador. Lança Error com mensagem amigável se inválido.
export function sanitize(raw) {
  if (!obj(raw)) throw new Error('Sensores ausentes.');
  const v = num(raw.v, 0, 200), lim = num(raw.lim, 10, 120);
  if (v == null || lim == null) throw new Error('Sensores inválidos (velocidade/limite).');
  const faixa = raw.faixa === 0 ? 0 : 1;
  const s = { v, lim, faixa, mud: raw.mud === 0 || raw.mud === 1 ? raw.mud : null };
  s.mudm = s.mud != null && ['ultrapassar', 'desviar', 'voltar'].includes(raw.mudm) ? raw.mudm : null;
  s.plim = obj(raw.plim) && num(raw.plim.lim, 10, 120) != null && num(raw.plim.d, 0, DMAX) != null ? { lim: num(raw.plim.lim, 10, 120), d: num(raw.plim.d, 0, DMAX) } : null;
  s.fr = carro(raw.fr);
  s.ped = obj(raw.ped) && num(raw.ped.d, 0, DMAX) != null ? { d: num(raw.ped.d, 0, DMAX), st: raw.ped.st === 'e' ? 'e' : 'a' } : null;
  s.obs = obj(raw.obs) && num(raw.obs.d, 0, DMAX) != null ? { d: num(raw.obs.d, 0, DMAX), t: raw.obs.t === 'obras' ? 'obras' : 'cone' } : null;
  s.sem = obj(raw.sem) && num(raw.sem.d, 0, DMAX) != null && ['verde', 'amarelo', 'vermelho'].includes(raw.sem.cor)
    ? { d: num(raw.sem.d, 0, DMAX), cor: raw.sem.cor, ha: num(raw.sem.ha, 0, 999) ?? 0 } : null;
  const viz = Array.isArray(raw.viz) ? raw.viz : [];
  s.viz = [faixa === 0 ? null : vizinha(viz[0]), faixa === 1 ? null : vizinha(viz[1])];
  return s;
}

// ---------------------------------------------------------------- estado para o Jev
const ms = (kmh) => kmh / 3.6;
const tta = (d, v) => (v > 2 ? r1(d / ms(v)) : null); // segundos até chegar
export const distParar = (v) => r0(ms(v) * 0.4 + ms(v) ** 2 / (2 * 3.2)); // reação 0,4 s + 3,2 m/s²

// "lento" é relativo à via (limite) e a mim: um carro a 20 km/h numa via de 50 continua lento mesmo que eu já tenha
// freado atrás dele — senão o motorista se acomoda atrás de qualquer um.
const lento = (c, s) => c.v <= 1 || c.v < s.v - 5 || c.v < s.lim - 12;

function descVeiculo(fr, s) {
  const o = { distancia_m: r0(fr.d), velocidade_kmh: r0(fr.v) };
  const parts = [];
  if (fr.v <= 1) parts.push('parado');
  else {
    if (fr.v < s.lim - 12) parts.push(`lento para a via (limite ${r0(s.lim)} km/h)`);
    parts.push(fr.v < s.v - 4 ? 'mais lento que eu' : fr.v > s.v + 4 ? 'mais rápido que eu (se afastando)' : 'na mesma velocidade que eu');
  }
  o.situacao = parts.join(', ');
  if (s.v > fr.v + 2) o.segundos_ate_encostar = r1(fr.d / ms(s.v - fr.v));
  return o;
}

function descVizinha(l, s) {
  if (l == null) return { txt: 'não existe', entrar: false, livre: false };
  if (l.lado) return { txt: l.fr && l.fr.d < 12 && l.fr.v < s.v - 5 ? `ocupada: carro mais lento ao meu lado (${r0(l.fr.v)} km/h) — estou passando por ele` : 'ocupada: carro ao meu lado', entrar: false, livre: false };
  const frente = l.fr && l.fr.d < 90 ? l.fr : null;
  const probs = [];
  if (s.ped) probs.push(`pedestre ${s.ped.st === 'e' ? 'prestes a atravessar' : 'atravessando'} a ${r0(s.ped.d)} m`);
  if (l.obs != null && l.obs < 70) probs.push(`obstáculo a ${r0(l.obs)} m nela`);
  if (frente && lento(frente, s) && frente.d < 60) probs.push(`carro ${frente.v <= 1 ? 'parado' : 'lento'} a ${r0(frente.d)} m nela (${r0(frente.v)} km/h)`);
  const atras = l.at && l.at.d < 60 ? `; carro ${r0(l.at.d)} m atrás nela (${r0(l.at.v)} km/h)` : '';
  if (!l.entrar) return { txt: `sem espaço seguro para entrar agora${probs.length ? ': ' + probs.join('; ') : ''}${atras}`, entrar: false, livre: false };
  if (!probs.length) return { txt: `livre: dá para entrar e seguir${frente ? ` (carro a ${r0(frente.d)} m nela, ${r0(frente.v)} km/h)` : ''}${atras}`, entrar: true, livre: true };
  return { txt: `dá para entrar, mas não está livre: ${probs.join('; ')}${atras}`, entrar: true, livre: false };
}

export function buildState(s) {
  const st = {
    velocidade_kmh: r0(s.v),
    limite_kmh: r0(s.lim),
    situacao_velocidade: s.v <= 1 ? 'parado' : s.v > s.lim + 3 ? 'acima do limite' : s.v >= s.lim - 2.5 ? 'no limite' : s.v >= s.lim - 10 ? 'um pouco abaixo do limite' : 'bem abaixo do limite',
  };
  if (s.plim) st.proximo_limite = s.plim.lim < s.lim ? `zona de ${r0(s.plim.lim)} km/h começa em ${r0(s.plim.d)} m — chegue nela já dentro do limite` : `limite sobe para ${r0(s.plim.lim)} km/h em ${r0(s.plim.d)} m`;
  st.faixa_atual = s.faixa === 0 ? 'esquerda' : 'direita';
  if (s.mud != null) {
    const lado = s.mud === 0 ? 'esquerda' : 'direita';
    st.manobra = s.mudm === 'ultrapassar' ? `mudando para a faixa da ${lado} (já livre à frente) para ultrapassar o carro lento`
      : s.mudm === 'desviar' ? `mudando para a faixa da ${lado} (já livre à frente) para desviar do obstáculo`
      : s.mudm === 'voltar' ? 'voltando para a faixa da direita (livre à frente) depois de ultrapassar'
      : `troca para a faixa da ${lado} em andamento`;
  }
  st.distancia_para_parar_m = distParar(s.v);
  st.minha_faixa_a_frente = {
    veiculo: s.fr ? descVeiculo(s.fr, s) : 'nenhum',
    pedestre: s.ped ? { distancia_m: r0(s.ped.d), situacao: s.ped.st === 'e' ? 'esperando na calçada para atravessar (tem preferência na faixa de pedestres)' : 'atravessando a avenida (bloqueia todas as faixas)', segundos_ate_chegar: tta(s.ped.d, s.v) } : 'nenhum',
    obstaculo: s.obs ? { tipo: s.obs.t === 'obras' ? 'obras na pista (cones e barreiras)' : 'cones na faixa', distancia_m: r0(s.obs.d), segundos_ate_chegar: tta(s.obs.d, s.v) } : 'nenhum',
  };
  if (s.sem) {
    st.semaforo = { cor: s.sem.cor, distancia_m: r0(s.sem.d), cor_ha_segundos: r1(s.sem.ha), segundos_ate_chegar: tta(s.sem.d, s.v) };
    if (s.sem.cor !== 'verde' && s.v > 2) st.semaforo.da_para_parar_antes = distParar(s.v) <= s.sem.d + 2 ? 'sim' : 'não — perto demais';
  } else st.semaforo = 'nenhum por perto';
  const esq = descVizinha(s.viz[0], s), dir = descVizinha(s.viz[1], s);
  st.faixa_esquerda = esq.txt;
  st.faixa_direita = dir.txt;
  return { state: st, esq, dir };
}

// Perguntas: a lista de ações é filtrada pelo que é possível e tem propósito agora (máscara de ações, como num
// sistema real): não se oferece troca de faixa se a faixa não existe, está ocupada ao lado, já há troca em andamento,
// ou se a troca não serviria para nada (a faixa de destino não está livre e a minha não está bloqueada — evita o
// zigue-zague de voltar para trás de um carro lento). Entre as opções válidas, quem escolhe é o Jev.
export function buildQuestions(s, lanes) {
  const crit = { ...ACOES };
  const bloqueada = (s.obs && s.obs.d < 70) || (s.fr && s.fr.d < 60 && lento(s.fr, s));
  const sinalPerto = s.sem && s.sem.cor !== 'verde' && s.sem.d < 60;
  // parado/quase parado só troca de faixa para sair de trás de um obstáculo ou carro parado (não no sinal, nem com pedestre)
  const devagarOk = s.v >= 8 || (!sinalPerto && !s.ped && ((s.obs && s.obs.d < 30) || (s.fr && s.fr.v <= 1 && s.fr.d < 25)));
  const pode = (l) => s.mud == null && devagarOk && l.entrar && (l.livre || bloqueada);
  if (!pode(lanes.esq)) delete crit.mudar_para_esquerda;
  if (!pode(lanes.dir)) delete crit.mudar_para_direita;
  return {
    questions: {
      acao: { type: 'choice', instructions: INSTR_ACAO, criteria: crit },
      motivo: { type: 'choice', instructions: 'Qual é o principal motivo desse comando?', criteria: MOTIVOS },
      perigo: { type: 'score', instructions: 'Qual o nível de perigo da situação agora?', criteria: PERIGO },
    },
    opcoes: Object.keys(crit),
  };
}

export function build(raw) {
  const s = sanitize(raw);
  const { state, esq, dir } = buildState(s);
  const { questions, opcoes } = buildQuestions(s, { esq, dir });
  return { s, state, questions, opcoes };
}

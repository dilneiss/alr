// O Jogo que Lê Você: um jogo de nave em que o Jev é o DIRETOR. A cada 4 s o código mede como você joga e põe em palavras;
// o Jev decide como você está, a próxima onda (lista fechada de 7), se ajuda agora e a intensidade.
// Para adaptar ao seu jogo, quiz ou treino: troque as medidas (emPalavras), as ONDAS e as regras das perguntas; o seu código
// manda as medidas na jogada "dirigir" e aplica a resposta (veja aplicarDecisao em jogo.js).

// as 7 ondas que o diretor pode escolher (a tela usa o mesmo id; o jogo nunca recebe uma onda que não existe)
const ONDAS = [
  { id: 'enxame', nome: 'enxame lento', curto: 'Enxame', icone: '🐝', desc: 'enxame lento: muitos drones lentos, fáceis de abater, com poucos tiros. Onda média-fácil, para variar quando o jogador está no ponto' },
  { id: 'cacadores', nome: 'caçadores rápidos', curto: 'Caçadores', icone: '🎯', desc: 'caçadores rápidos: naves que mergulham em cima do jogador e atiram mirando nele. Onda difícil, para quem está achando fácil' },
  { id: 'meteoros', nome: 'chuva de meteoros', curto: 'Meteoros', icone: '☄️', desc: 'chuva de meteoros: pedras que caem na diagonal, as grandes se partem; o desafio é desviar. Onda média-difícil' },
  { id: 'chefe', nome: 'chefe', curto: 'Chefe', icone: '👑', desc: 'chefe: a nave-mãe com barra de vida e rajadas de tiros em círculo. A onda mais difícil: só para quem está entediado, achando fácil demais' },
  { id: 'bonus', nome: 'onda de bônus', curto: 'Bônus', icone: '💎', desc: 'onda de bônus: cristais dourados que não atiram, valem muitos pontos e soltam itens. Ajuda e recompensa, para quem está frustrado' },
  { id: 'respiro', nome: 'respiro', curto: 'Respiro', icone: '🌙', desc: 'respiro: quase nenhum inimigo por alguns segundos. Para quem está frustrado e precisa se recuperar, ou para quem largou o controle' },
  { id: 'formacao', nome: 'formação', curto: 'Formação', icone: '🛸', desc: 'formação: um bloco de naves que desliza de um lado para o outro e manda uma de cada vez mergulhar. Onda média, a mais clássica, para quem está no ponto' },
];

const ESTADOS = [
  { id: 'entediado', rotulo: 'entediado', emoji: '😴', cor: '#fbbf24', desc: 'entediado, fácil demais: está há um bom tempo ou muito tempo sem levar dano e abate a maioria; o jogo não desafia. Nunca para quem começou a jogar agora (ainda é cedo)' },
  { id: 'no_ponto', rotulo: 'no ponto', emoji: '😃', cor: '#34d399', desc: 'no ponto: desafiado e se divertindo; leva um tiro de vez em quando e se recupera, se esquiva por um triz, abate boa parte dos inimigos. Também quem começou a jogar agora (ainda é cedo para julgar)' },
  { id: 'frustrado', rotulo: 'frustrado', emoji: '😣', cor: '#fb7185', desc: 'frustrado, difícil demais: morreu, levou muitos tiros ou está com a vida por um fio' },
  { id: 'distraido', rotulo: 'distraído', emoji: '💤', cor: '#94a3b8', desc: 'distraído ou parou de jogar: largou o controle (nenhum comando há vários segundos), a nave fica parada' },
];

const NIVEIS = ['calmíssima', 'leve', 'normal', 'forte', 'máxima'];
const NOME_ONDA = Object.fromEntries(ONDAS.map((o) => [o.id, o.nome]));

// ---------- números → palavras (regra medida: conta e comparação ficam com o código) ----------
const num = (v, a, b) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a; };
const seg = (s) => { s = Math.round(s); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
const pct = (p) => `${Math.round(p * 100)}%`;

// devolve { jogador: [frases curtas], situacao: 'frase', itens: [{ k, t, tom }] } a partir das medidas que a tela manda.
// "itens" é só para a tela: o tipo do sinal (k) e para qual leitura ele aponta (tom), para colorir o painel.
export function emPalavras(d = {}) {
  const jog = num(d.jogando_s, 0, 36000);
  const tiros = Math.round(num(d.tiros, 0, 99));
  const mortes = Math.round(num(d.mortes, 0, 99));
  const vmax = Math.round(num(d.vida_max, 1, 9)) || 3;
  const vida = Math.round(num(d.vida, 0, vmax));
  const semDano = num(d.sem_dano_s, 0, 36000);
  const ap = Math.round(num(d.apareceram, 0, 999));
  const ab = Math.min(ap, Math.round(num(d.abatidos, 0, 999)));
  const disp = Math.round(num(d.disparos, 0, 99999));
  const acert = Math.min(disp, Math.round(num(d.acertos, 0, 99999)));
  const mov = num(d.movimento, 0, 1), amp = num(d.amplitude, 0, 1);
  const semCmd = num(d.sem_comando_s, 0, 36000);
  const triz = Math.round(num(d.triz, 0, 99));
  const itens = [];
  const add = (k, t, tom = '') => itens.push({ k, t, tom });
  const cedo = jog < 12;
  add('tempo', cedo ? `começou a jogar há ${seg(jog)}: ainda é cedo, não dá para dizer que está fácil` : `jogando há ${seg(jog)}`);
  const naJanela = jog < 15 ? ` (em ${seg(jog)} de jogo)` : '';
  add('tiros', (tiros === 0 ? 'não levou nenhum tiro' : tiros === 1 ? 'levou 1 tiro' : tiros === 2 ? 'levou 2 tiros (vários)' : `levou ${tiros} tiros (muitos)`) + naJanela,
    tiros >= 3 ? 'frustrado' : tiros === 0 && !cedo ? 'entediado' : '');
  if (mortes) {
    const ha = d.morreu_ha_s == null ? 0 : num(d.morreu_ha_s, 0, 3600);
    add('mortes', `${mortes === 1 ? 'morreu 1 vez' : `morreu ${mortes} vezes`} (perdeu todas as vidas), ${ha < 6 ? 'agora há pouco' : `a última há ${seg(ha)}`}`, ha < 6 ? 'frustrado' : '');
  }
  add('vida', vida >= vmax ? `vida cheia (${vida} de ${vmax})` : vida <= 1 ? `vida ${vida} de ${vmax} (por um fio)` : `vida ${vida} de ${vmax}`, vida <= 1 ? 'frustrado' : '');
  if (d.escudo) add('escudo', 'está com escudo ligado');
  const sd = seg(semDano);
  const nunca = semDano >= jog - 0.5;
  if (nunca) add('semdano', cedo ? 'ainda não levou dano nesta partida' : `nunca levou dano nesta partida: ${sd} ${semDano < 20 ? '(um bom tempo)' : '(muito tempo)'}`, cedo ? '' : 'entediado');
  else add('semdano', semDano < 5 ? `${sd} sem levar dano (acabou de levar dano)` : semDano < 12 ? `${sd} sem levar dano (se recuperando)` : semDano < 20 ? `${sd} sem levar dano (um bom tempo)` : `${sd} sem levar dano (muito tempo)`,
    semDano < 5 ? 'frustrado' : semDano >= 12 ? 'entediado' : 'no_ponto');
  const chefe = d.chefe_vida == null ? null : num(d.chefe_vida, 0, 1);
  if (chefe != null) add('chefe', `lutando contra o chefe: ele ainda tem ${pct(chefe)} da vida`);
  else if (ap < 3) add('calma', 'quase não apareceram inimigos (onda calma)');
  else {
    const r = ab / ap;
    add('abates', r >= 0.85 ? `abateu quase todos os inimigos (${ab} de ${ap})` : r >= 0.6 ? `abateu a maioria dos inimigos (${ab} de ${ap})` : r >= 0.35 ? `abateu uma parte dos inimigos (${ab} de ${ap})` : `abateu poucos inimigos (${ab} de ${ap})`,
      r >= 0.85 ? 'entediado' : r < 0.35 ? 'frustrado' : '');
  }
  // o tiro é automático: boa parte vai para o vazio, então 30% já é mira boa
  if (disp >= 12 && ap >= 3) { const p = acert / disp; add('mira', p >= 0.3 ? `mira boa: ${pct(p)} dos tiros acertam` : p >= 0.12 ? `mira média: ${pct(p)} dos tiros acertam` : `mira fraca: ${pct(p)} dos tiros acertam`); }
  add('movimento', mov >= 0.6 ? (amp >= 0.5 ? 'mexe-se o tempo todo, pela tela toda' : 'mexe-se o tempo todo') : mov >= 0.3 ? 'mexe-se bastante' : mov >= 0.1 ? 'mexe-se pouco' : 'quase parado', mov < 0.1 ? 'distraido' : '');
  add('comando', semCmd >= 6 ? `nenhum comando há ${seg(semCmd)} (largou o controle)` : semCmd >= 3 ? `sem comando há ${seg(semCmd)}` : 'jogando: último comando agora', semCmd >= 6 ? 'distraido' : '');
  add('triz', triz === 0 ? 'nenhuma esquiva por um triz' : triz === 1 ? '1 esquiva por um triz' : triz === 2 ? '2 esquivas por um triz' : `${triz} esquivas por um triz (jogando no limite)`, triz >= 3 ? 'no_ponto' : '');

  const o = d.onda && typeof d.onda === 'object' ? d.onda : {};
  const it = Math.round(num(o.intensidade, 0, 4));
  const resta = num(o.resta_s, 0, 600);
  const partes = [`onda ${Math.round(num(o.n, 1, 999))} (${NOME_ONDA[o.tipo] || 'aquecimento'}), intensidade atual ${NIVEIS[it]} (${it} de 4), ${resta >= 1 ? `faltam ${seg(resta)} para acabar` : 'acabando agora'}`];
  const ant = (Array.isArray(d.anteriores) ? d.anteriores : []).filter((x) => NOME_ONDA[x]).slice(0, 3);
  partes.push(ant.length ? `ondas anteriores: ${ant.map((x) => NOME_ONDA[x]).join(', ')}` : 'é a primeira onda');
  const ch = d.chefe_ha == null ? null : Math.round(num(d.chefe_ha, 0, 999));
  partes.push(ch == null ? 'ainda não houve chefe nesta partida' : ch === 0 ? 'o chefe é a onda atual' : `o último chefe foi há ${ch} ${ch === 1 ? 'onda' : 'ondas'}`);
  return { jogador: itens.map((x) => x.t), situacao: partes.join('; '), itens };
}

// opções da próxima onda nesta chamada: nunca repete a onda atual; nos primeiros 12 s nada de caçadores; o chefe só depois de
// 20 s de jogo e 3 ondas depois do último (regra do jogo no código: o Jev só escolhe entre o que pode acontecer)
export function ondasPossiveis(d = {}) {
  const atual = d.onda && d.onda.tipo;
  const ch = d.chefe_ha == null ? null : Number(d.chefe_ha);
  const jog = Number(d.jogando_s) || 0;
  return ONDAS.filter((o) => o.id !== atual
    && !(o.id === 'chefe' && ((ch != null && ch < 3) || jog < 20))
    && !(o.id === 'cacadores' && jog < 12));
}

export default {
  id: 'jogo-le-voce',
  titulo: 'O Jogo que Lê Você',
  emoji: '👾',
  categoria: 'ao-vivo',
  ordem: 0.9,
  resumo: 'Um jogo de nave que percebe se você está entediado, desafiado ou frustrado, e muda a próxima onda na hora.',
  descricao: 'Você pilota uma nave neon e, a cada 4 segundos, o código põe o seu jeito de jogar em palavras (tiros levados, esquivas por um triz, tempo sem dano, se largou o controle) e o Jev decide em ~0,3 s como você está, qual das 7 ondas vem a seguir, se você ganha um escudo e a intensidade: jogue mal e o jogo ajuda, jogue bem e chega o chefe. Lista fechada de ondas e limiar na ajuda: o jogo nunca quebra nem espera a resposta. Para adaptar, troque as medidas e as ondas pelas fases do seu jogo, as perguntas do seu quiz ou as séries do seu treino.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#a855f7', acento2: '#22d3ee' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'jogo',
    comoTestar: 'jogue com as setas, WASD ou o mouse (no celular, arraste o dedo). Jogue mal de propósito por uns 10 segundos: o diretor percebe e ajuda. Depois jogue bem: ele manda o chefe.',
  },
  // para a tela (palco.js): os mesmos ids das decisões
  ondas: ONDAS,
  estados: ESTADOS,
  niveis: NIVEIS,
  emPalavras,
  diretor: { cadencia: 4, limiarAjuda: 0.6, limiarCorte: 0.5 },
  contexto: {
    jogo: 'jogo de nave neon: a nave atira sozinha, o jogador só desvia e se posiciona; os inimigos vêm em ondas',
    papel_do_jev: 'diretor do jogo: lê o jogador a cada 4 segundos e escolhe o que vem a seguir para ele ficar no ponto',
  },
  decisoes: [
    {
      id: 'estado_jogador', tipo: 'choice', titulo: 'Como o jogador está',
      pergunta: 'Você é o diretor de um jogo de nave. Leia como o jogador jogou nos últimos 15 segundos (a lista «jogador», já em palavras) e diga como ele está AGORA. Decida nesta ordem: (0) começou a jogar agora (cedo para julgar) → no_ponto; (1) largou o controle (nenhum comando há vários segundos) → distraido, mesmo que não leve tiro; (2) morreu agora há pouco, levou muitos tiros ou está com a vida por um fio (mesmo com escudo ligado) → frustrado; (3) está jogando ativamente (dando comandos), não levou nenhum tiro nos últimos 15 s, está há um bom tempo ou muito tempo sem dano, abate a maioria ou quase todos os inimigos (numa onda calma ou contra o chefe, basta não apanhar) e tem no máximo 2 esquivas por um triz → entediado (fácil demais); (4) o resto → no_ponto: quem levou 1 ou 2 tiros e se recupera, quem morreu há mais tempo e está se recuperando, quem se esquiva por um triz várias vezes.',
      opcoes: ESTADOS.map((e) => ({ id: e.id, rotulo: e.rotulo, icone: e.emoji, cor: e.cor, desc: e.desc })),
    },
    {
      id: 'proxima_onda', tipo: 'choice', titulo: 'Próxima onda',
      pergunta: 'Você é o diretor de um jogo de nave: escolha a PRÓXIMA onda de inimigos para deixar o jogador no ponto (nem fácil demais, nem difícil demais). Primeiro veja na lista «jogador» como ele está, depois escolha a onda. Nesta ordem: (0) começou a jogar agora (cedo para julgar) → formacao, enxame ou meteoros. (1) largou o controle (nenhum comando há vários segundos) → respiro; se respiro não estiver nas opções, bonus. (2) frustrado: morreu agora há pouco, levou muitos tiros ou está com a vida por um fio (mesmo com escudo ligado) → bonus ou respiro. (3) entediado (só quem NÃO levou nenhum tiro e NÃO morreu nos últimos 15 s): está jogando ativamente (dando comandos), há um bom tempo ou muito tempo sem dano e abate a maioria ou quase todos (numa onda calma ou contra o chefe, basta não apanhar) → chefe; se chefe não estiver nas opções (por exemplo, logo depois de um chefe), cacadores ou meteoros, nunca enxame. (4) no ponto, todo o resto (levou 1 ou 2 tiros e se recupera, morreu há mais tempo e se recupera, se esquiva por um triz várias vezes) → formacao, enxame ou meteoros, de preferência uma que NÃO esteja nas ondas anteriores da «situacao». Para quem está no ponto, NUNCA chefe nem cacadores.',
      opcoes: ONDAS.map((o) => ({ id: o.id, rotulo: o.curto, icone: o.icone, desc: o.desc })),
    },
    {
      id: 'ajudar', tipo: 'noul', titulo: 'Ajudar agora', rotulo: 'soltar escudo ou vida', icone: '🛡️', tom: 'bom', limiar: 0.6,
      pergunta: 'O jogo deve soltar AGORA uma ajuda (um escudo ou uma vida extra) perto da nave do jogador? SIM sempre que ele está apanhando agora: vida por um fio, ou morreu agora há pouco, ou levou muitos tiros e acabou de levar dano (vale também para quem largou o controle). NÃO nestes casos: (1) já está com escudo ligado, mesmo com a vida por um fio; (2) não levou tiro, ou levou 1 ou 2 e está se recuperando, ou morreu há mais tempo e já se recuperou; (3) vida cheia sem tiros recentes; (4) jogando bem ou entediado.',
    },
    {
      id: 'intensidade', tipo: 'score', titulo: 'Intensidade',
      pergunta: 'Quão forte deve ser o jogo a partir de agora (quantidade e velocidade dos inimigos e dos tiros)? Escolha pelo jeito do jogador na lista «jogador», nível a nível (largou o controle vale calmíssima, mesmo que esteja levando tiro).',
      niveis: [
        { rotulo: 'calmíssima', desc: 'para quem largou o controle (nenhum comando há vários segundos) ou está perdendo todas as vidas' },
        { rotulo: 'leve', desc: 'para quem está frustrado: morreu agora há pouco, levou muitos tiros ou está com a vida por um fio' },
        { rotulo: 'normal', desc: 'para quem está no ponto: levou 1 ou 2 tiros e se recupera, se esquiva por um triz, ou começou a jogar agora' },
        { rotulo: 'forte', desc: 'para quem começa a achar fácil: não levou tiro nos últimos 15 s e está há um bom tempo sem dano' },
        { rotulo: 'máxima', desc: 'para quem está entediado: não levou tiro nos últimos 15 s e está há muito tempo sem dano' },
      ],
    },
  ],
  jogadas: {
    // a cada ~4 s de jogo e no fim de cada onda: as MEDIDAS vão em números e viram palavras aqui (no servidor)
    dirigir: {
      estado: (d) => { const p = emPalavras(d); return { jogador: p.jogador, situacao: p.situacao }; },
      perguntas: (d) => [
        { chave: 'estado_jogador', decisao: 'estado_jogador' },
        { chave: 'proxima_onda', decisao: 'proxima_onda', opcoes: ondasPossiveis(d).map((o) => ({ id: o.id, desc: o.desc })) },
        { chave: 'ajudar', decisao: 'ajudar' },
        { chave: 'intensidade', decisao: 'intensidade' },
      ],
    },
  },
  testes: [
    { titulo: 'apanhando muito na formação', jogada: 'dirigir',
      dados: { jogando_s: 40, tiros: 3, mortes: 0, vida: 1, vida_max: 3, sem_dano_s: 2, abatidos: 5, apareceram: 16, disparos: 120, acertos: 22, movimento: 0.7, amplitude: 0.6, sem_comando_s: 0, triz: 1, onda: { n: 3, tipo: 'formacao', intensidade: 2, resta_s: 6 }, anteriores: ['enxame', 'meteoros'], chefe_ha: null },
      esperado: { estado_jogador: 'frustrado', proxima_onda: ['bonus', 'respiro'], ajudar: true, intensidade: [0, 1] } },
    { titulo: 'acabou de morrer nos caçadores', jogada: 'dirigir',
      dados: { jogando_s: 55, tiros: 4, mortes: 1, morreu_ha_s: 3, vida: 3, vida_max: 3, sem_dano_s: 3, abatidos: 6, apareceram: 20, disparos: 140, acertos: 30, movimento: 0.75, amplitude: 0.7, sem_comando_s: 0, triz: 0, onda: { n: 4, tipo: 'cacadores', intensidade: 3, resta_s: 5 }, anteriores: ['formacao', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'frustrado', proxima_onda: ['bonus', 'respiro'], ajudar: true, intensidade: [0, 1] } },
    { titulo: 'voando sem levar dano, sem chefe ainda', jogada: 'dirigir',
      dados: { jogando_s: 70, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 45, abatidos: 30, apareceram: 32, disparos: 140, acertos: 80, movimento: 0.8, amplitude: 0.7, sem_comando_s: 0, triz: 1, onda: { n: 5, tipo: 'formacao', intensidade: 2, resta_s: 4 }, anteriores: ['meteoros', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'entediado', proxima_onda: 'chefe', ajudar: false, intensidade: [3, 4] } },
    { titulo: 'entediado logo depois de um chefe', jogada: 'dirigir',
      dados: { jogando_s: 120, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 50, abatidos: 25, apareceram: 26, disparos: 150, acertos: 90, movimento: 0.8, amplitude: 0.6, sem_comando_s: 0, triz: 0, onda: { n: 8, tipo: 'bonus', intensidade: 3, resta_s: 3 }, anteriores: ['chefe', 'formacao'], chefe_ha: 1 },
      esperado: { estado_jogador: 'entediado', proxima_onda: ['cacadores', 'meteoros'], ajudar: false, intensidade: [3, 4] } },
    { titulo: 'no ponto: um tiro e muitas esquivas', jogada: 'dirigir',
      dados: { jogando_s: 50, tiros: 1, mortes: 0, vida: 2, vida_max: 3, sem_dano_s: 9, abatidos: 14, apareceram: 20, disparos: 130, acertos: 50, movimento: 0.65, amplitude: 0.6, sem_comando_s: 0, triz: 3, onda: { n: 4, tipo: 'meteoros', intensidade: 2, resta_s: 5 }, anteriores: ['formacao', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'no_ponto', proxima_onda: ['formacao', 'enxame'], ajudar: false, intensidade: 2 } },
    { titulo: 'largou o controle', jogada: 'dirigir',
      dados: { jogando_s: 80, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 20, abatidos: 2, apareceram: 12, disparos: 60, acertos: 4, movimento: 0.02, amplitude: 0.05, sem_comando_s: 10, triz: 0, onda: { n: 5, tipo: 'enxame', intensidade: 2, resta_s: 6 }, anteriores: ['formacao', 'meteoros'], chefe_ha: null },
      esperado: { estado_jogador: 'distraido', proxima_onda: 'respiro', ajudar: false, intensidade: 0 } },
    { titulo: 'parado e apanhando', jogada: 'dirigir',
      dados: { jogando_s: 90, tiros: 2, mortes: 0, vida: 1, vida_max: 3, sem_dano_s: 1, abatidos: 3, apareceram: 14, disparos: 70, acertos: 6, movimento: 0, amplitude: 0, sem_comando_s: 12, triz: 0, onda: { n: 6, tipo: 'formacao', intensidade: 2, resta_s: 7 }, anteriores: ['enxame', 'meteoros'], chefe_ha: null },
      esperado: { estado_jogador: 'distraido', proxima_onda: 'respiro', ajudar: true, intensidade: 0 } },
    { titulo: 'começo de jogo', jogada: 'dirigir',
      dados: { jogando_s: 5, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 5, abatidos: 4, apareceram: 6, disparos: 40, acertos: 12, movimento: 0.6, amplitude: 0.4, sem_comando_s: 0, triz: 0, onda: { n: 1, tipo: 'enxame', intensidade: 2, resta_s: 6 }, anteriores: [], chefe_ha: null },
      esperado: { estado_jogador: 'no_ponto', proxima_onda: ['formacao', 'meteoros'], ajudar: false, intensidade: 2 } },
    { titulo: 'se recuperando depois da ajuda', jogada: 'dirigir',
      dados: { jogando_s: 60, tiros: 2, mortes: 0, vida: 2, vida_max: 3, sem_dano_s: 10, abatidos: 12, apareceram: 16, disparos: 110, acertos: 45, movimento: 0.7, amplitude: 0.6, sem_comando_s: 0, triz: 2, onda: { n: 5, tipo: 'bonus', intensidade: 1, resta_s: 3 }, anteriores: ['formacao', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'no_ponto', proxima_onda: ['meteoros', 'formacao', 'enxame'], ajudar: false, intensidade: [1, 2] } },
    { titulo: 'no limite contra os caçadores', jogada: 'dirigir',
      dados: { jogando_s: 100, tiros: 1, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 13, abatidos: 20, apareceram: 26, disparos: 160, acertos: 70, movimento: 0.9, amplitude: 0.8, sem_comando_s: 0, triz: 6, onda: { n: 7, tipo: 'cacadores', intensidade: 3, resta_s: 4 }, anteriores: ['formacao', 'meteoros'], chefe_ha: 3 },
      esperado: { estado_jogador: 'no_ponto', proxima_onda: ['enxame', 'formacao', 'meteoros'], ajudar: false, intensidade: [2, 3] } },
    { titulo: 'chefe esmagado sem dano', jogada: 'dirigir',
      dados: { jogando_s: 150, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 60, abatidos: 9, apareceram: 9, disparos: 200, acertos: 150, movimento: 0.85, amplitude: 0.7, sem_comando_s: 0, triz: 0, onda: { n: 9, tipo: 'chefe', intensidade: 3, resta_s: 0 }, anteriores: ['formacao', 'bonus'], chefe_ha: 0, chefe_vida: 0.2 },
      esperado: { estado_jogador: 'entediado', proxima_onda: ['cacadores', 'meteoros'], ajudar: false, intensidade: [3, 4] } },
    { titulo: 'frustrado no chefe', jogada: 'dirigir',
      dados: { jogando_s: 140, tiros: 3, mortes: 0, vida: 1, vida_max: 3, sem_dano_s: 2, abatidos: 2, apareceram: 6, disparos: 150, acertos: 40, movimento: 0.8, amplitude: 0.7, sem_comando_s: 0, triz: 1, onda: { n: 9, tipo: 'chefe', intensidade: 3, resta_s: 0 }, anteriores: ['formacao', 'meteoros'], chefe_ha: 0, chefe_vida: 0.85 },
      esperado: { estado_jogador: 'frustrado', proxima_onda: ['bonus', 'respiro'], ajudar: true, intensidade: [0, 1] } },
    { titulo: 'vida por um fio, mas já com escudo', jogada: 'dirigir',
      dados: { jogando_s: 45, tiros: 2, mortes: 0, vida: 1, vida_max: 3, escudo: true, sem_dano_s: 3, abatidos: 6, apareceram: 15, disparos: 100, acertos: 25, movimento: 0.7, amplitude: 0.5, sem_comando_s: 0, triz: 1, onda: { n: 3, tipo: 'meteoros', intensidade: 2, resta_s: 6 }, anteriores: ['formacao', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'frustrado', proxima_onda: ['bonus', 'respiro'], ajudar: false } },
    { titulo: 'jogando bem, levou 1 tiro agora', jogada: 'dirigir',
      dados: { jogando_s: 80, tiros: 1, mortes: 0, vida: 2, vida_max: 3, sem_dano_s: 1, abatidos: 22, apareceram: 25, disparos: 150, acertos: 75, movimento: 0.8, amplitude: 0.7, sem_comando_s: 0, triz: 2, onda: { n: 6, tipo: 'formacao', intensidade: 2, resta_s: 6 }, anteriores: ['meteoros', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'no_ponto', ajudar: false, intensidade: 2 } },
    { titulo: 'muito tempo sem dano, vida 2', jogada: 'dirigir',
      dados: { jogando_s: 90, tiros: 0, mortes: 0, vida: 2, vida_max: 3, sem_dano_s: 28, abatidos: 24, apareceram: 26, disparos: 150, acertos: 80, movimento: 0.7, amplitude: 0.6, sem_comando_s: 0, triz: 0, onda: { n: 6, tipo: 'enxame', intensidade: 2, resta_s: 4 }, anteriores: ['formacao', 'meteoros'], chefe_ha: null },
      esperado: { estado_jogador: 'entediado', proxima_onda: 'chefe', ajudar: false, intensidade: [3, 4] } },
    { titulo: 'morreu há 13 s e se recuperou', jogada: 'dirigir',
      dados: { jogando_s: 20, tiros: 2, mortes: 1, morreu_ha_s: 13, vida: 3, vida_max: 3, sem_dano_s: 12.8, abatidos: 7, apareceram: 10, disparos: 160, acertos: 60, movimento: 0.76, amplitude: 0.6, sem_comando_s: 0, triz: 1, onda: { n: 2, tipo: 'bonus', intensidade: 1, resta_s: 1 }, anteriores: ['cacadores'], chefe_ha: null },
      esperado: { estado_jogador: 'no_ponto', proxima_onda: ['formacao', 'enxame', 'meteoros'], ajudar: false, intensidade: [1, 2] } },
    { titulo: 'chefe na metade, sem apanhar', jogada: 'dirigir',
      dados: { jogando_s: 120, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 40, abatidos: 2, apareceram: 2, disparos: 160, acertos: 90, movimento: 0.6, amplitude: 0.6, sem_comando_s: 0, triz: 1, onda: { n: 6, tipo: 'chefe', intensidade: 3, resta_s: 8 }, anteriores: ['meteoros', 'formacao'], chefe_ha: 0, chefe_vida: 0.5 },
      esperado: { estado_jogador: 'entediado', proxima_onda: ['cacadores', 'meteoros'], ajudar: false, intensidade: [3, 4] } },
    { titulo: 'parado há muito tempo numa onda calma', jogada: 'dirigir',
      dados: { jogando_s: 30, tiros: 1, mortes: 0, vida: 2, vida_max: 3, sem_dano_s: 23, abatidos: 0, apareceram: 0, disparos: 258, acertos: 0, movimento: 0, amplitude: 0, sem_comando_s: 30, triz: 0, onda: { n: 3, tipo: 'bonus', intensidade: 0, resta_s: 1 }, anteriores: ['respiro', 'enxame'], chefe_ha: null },
      esperado: { estado_jogador: 'distraido', proxima_onda: 'respiro', ajudar: false, intensidade: 0 } },
    { titulo: 'distraído no começo', jogada: 'dirigir',
      dados: { jogando_s: 9, tiros: 0, mortes: 0, vida: 3, vida_max: 3, sem_dano_s: 9, abatidos: 0, apareceram: 7, disparos: 70, acertos: 2, movimento: 0, amplitude: 0, sem_comando_s: 9, triz: 0, onda: { n: 1, tipo: 'enxame', intensidade: 2, resta_s: 3 }, anteriores: [], chefe_ha: null },
      esperado: { estado_jogador: 'distraido', proxima_onda: 'respiro', ajudar: false, intensidade: [0, 1] } },
  ],
};

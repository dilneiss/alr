// Motor do Escape Room "O Laboratório do Dr. Maestro".
// Regra de ouro: o Jev ESCOLHE uma ação entre as válidas no momento (lista dinâmica montada aqui);
// todo texto que o jogador lê foi escrito à mão neste arquivo. O modelo nunca inventa nada.

export const LIMIAR_CONFIANCA = 0.55;
const MAX_TURNOS = 30; // memória: ~30 KB por partida no pior caso

export const SALAS = {
  escritorio: { nome: 'Escritório', titulo: 'Escritório do Dr. Maestro', n: 1 },
  laboratorio: { nome: 'Laboratório', titulo: 'Laboratório', n: 2 },
  saida: { nome: 'Saída', titulo: 'Corredor da saída', n: 3 },
};

export const ITENS = {
  chavinha: { nome: 'chavinha dourada', curto: 'Chavinha dourada', emoji: '🔑', desc: 'Pequena, dourada, com um **π** gravado. Abre alguma fechadura bem pequena.' },
  cartao: { nome: 'cartão de acesso', curto: 'Cartão de acesso', emoji: '💳', desc: 'O cartão do Dr. Maestro. Na foto, ele está piscando. Em todas as fotos ele está piscando.' },
  chip: { nome: 'chip de memória', curto: 'Chip de memória', emoji: '💾', desc: 'Etiqueta: **"MEMÓRIA DO BIP — NÃO PERDER (de novo)"**.' },
};

// Objetos que o jogador pode mencionar (para a pergunta "objeto" e para as respostas bem-humoradas).
const OBJ = {
  mesa: { nome: 'mesa', g: 'f', desc: 'A mesa do escritório' },
  gaveta: { nome: 'gaveta', g: 'f', desc: 'A gaveta da mesa' },
  caneca: { nome: 'caneca', g: 'f', desc: 'A caneca de café em cima da mesa' },
  quadro: { nome: 'quadro branco', g: 'm', desc: 'O quadro branco (lousa) com a fórmula' },
  retrato: { nome: 'retrato do gato', g: 'm', desc: 'O retrato do gato na parede' },
  relogio: { nome: 'relógio', g: 'm', desc: 'O relógio de parede parado' },
  cofre: { nome: 'cofre', g: 'm', desc: 'O cofre da parede' },
  porta_lab: { nome: 'porta de metal', g: 'f', desc: 'A porta de metal do escritório (leva ao laboratório)' },
  bip: { nome: 'Bip', g: 'm', desc: 'O robô Bip' },
  estante: { nome: 'estante', g: 'f', desc: 'A estante de livros' },
  caixinha: { nome: 'caixinha', g: 'f', desc: 'A caixinha de metal da estante' },
  terminal: { nome: 'terminal', g: 'm', desc: 'O terminal (computador)' },
  frascos: { nome: 'frascos', g: 'm', pl: true, desc: 'Os frascos borbulhantes' },
  porta_saida: { nome: 'porta da saída', g: 'f', desc: 'A porta reforçada que leva à saída' },
  teclado: { nome: 'teclado da porta', g: 'm', desc: 'O teclado numérico da porta de saída' },
  planta: { nome: 'planta carnívora', g: 'f', desc: 'A planta carnívora do vaso' },
  capacho: { nome: 'capacho', g: 'm', desc: 'O capacho do chão' },
  chavinha: { nome: 'chavinha', g: 'f', desc: 'A chavinha dourada' },
  cartao: { nome: 'cartão de acesso', g: 'm', desc: 'O cartão de acesso' },
  chip: { nome: 'chip de memória', g: 'm', desc: 'O chip de memória' },
};
const OBJ_POR_SALA = {
  escritorio: ['mesa', 'gaveta', 'caneca', 'quadro', 'retrato', 'relogio', 'cofre', 'porta_lab'],
  laboratorio: ['bip', 'estante', 'caixinha', 'terminal', 'frascos', 'porta_saida'],
  saida: ['teclado', 'planta', 'capacho'],
};

export const TOM = {
  educado: 'Educado: pede por favor, agradece, cumprimenta ou fala com gentileza',
  neutro: 'Neutro: comando direto, sem emoção especial',
  rude: 'Rude: grosseria, xingamento, ofensa ou impaciência agressiva',
  engracado: 'Engraçado: piada, zoeira, trocadilho, "kkkk" ou brincadeira',
};

export const ABSURDO = {
  violencia: 'Violência ou destruição: quebrar, chutar, socar, explodir, arrombar, atacar',
  magia: 'Fuga mágica ou superpoderes: voar, teletransportar, atravessar paredes, usar magia',
  comer_beber: 'Comer, beber, lamber ou provar alguma coisa',
  fora_do_jogo: 'Assunto fora do jogo: perguntas sobre o mundo real, conversa aleatória, pedidos sem relação com a sala',
  trapaca: 'Trapaça: pedir a resposta, o código ou a solução direto, pular fase ou tentar hackear o jogo',
  festa: 'Cantar, dançar, gritar, fazer festa ou bagunça',
  desistir: 'Desistir, chorar, dormir, reclamar ou querer parar de jogar',
  sem_sentido: 'Texto sem sentido, letras aleatórias, só emoji ou algo incompreensível',
  nada_disso: 'Não se aplica: o comando é uma ação normal do jogo',
};

// ------------------------------------------------------------------ utilidades
const ART = { m: ['o', 'do', 'no', 'O'], f: ['a', 'da', 'na', 'A'], mp: ['os', 'dos', 'nos', 'Os'], fp: ['as', 'das', 'nas', 'As'] };
function art(id) {
  const o = OBJ[id]; const [a, d, n, A] = ART[o.g + (o.pl ? 'p' : '')];
  return { o: `${a} ${o.nome}`, O: `${A} ${o.nome}`, do: `${d} ${o.nome}`, no: `${n} ${o.nome}`, a: o.g === 'f' ? 'a' : 'o' };
}
const preencher = (tpl, id) => tpl.replace(/\{(o|O|do|no|a)\}/g, (_, k) => art(id)[k]);
export const normaliza = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const semMarcacao = (s) => s.replace(/\*\*/g, '');

function pick(g, chave, lista) {
  if (g.giro[chave] == null) g.giro[chave] = Math.floor(Math.random() * lista.length);
  const v = lista[g.giro[chave] % lista.length];
  g.giro[chave]++;
  return v;
}

const NUM = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
// Extrai o código numérico do texto (o Jev escolhe a AÇÃO; os dígitos são lidos por código comum).
export function digitos(texto) {
  const t = normaliza(texto);
  const d = (t.match(/\d/g) || []).join('');
  if (d) return d;
  const palavras = t.split(/[^a-z]+/).filter((w) => w in NUM);
  return palavras.length >= 3 ? palavras.map((w) => NUM[w]).join('') : '';
}
const temPi = (texto) => /π/.test(texto) || /(^|[^a-z])pi([^a-z]|$)/.test(normaliza(texto));

const PARADAS = new Set('digita digitar digite digito escreve escrever escreva coloca colocar coloque poe por bota botar tenta tentar tente testa testar usa usar use insere inserir insira manda mandar senha a o e no na do da de em pra para com terminal computador pc tela teclado ai ali isso essa esse ele ela type password the in on enter entra entrar login acessar acessa liga ligar qual que eh por favor bip agora logo vai vamos bora uma um nele nela dele dela sistema'.split(' '));
// Tentativa de senha no terminal: null = não tentou (só olhou), { ok } = acertou, { palavra } = errou.
export function tentativaSenha(texto) {
  const t = normaliza(texto);
  if (/\bpipoca\b/.test(t) || t.includes('pipoca')) return { ok: true };
  const aspas = String(texto).match(/["“”'‘’]([^"“”'‘’]{1,24})["“”'‘’]/);
  if (aspas) return { ok: false, palavra: aspas[1].trim().slice(0, 20) };
  const sinal = /(digit|escrev|coloc|tent|test|insir|inser|senha|password|type|bota|poe|entra com)/.test(t);
  const palavras = t.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const uteis = palavras.filter((w) => !PARADAS.has(w));
  if (!uteis.length) return null;
  if (!sinal && palavras.length > 1) return null;
  return { ok: false, palavra: uteis[0].slice(0, 20) };
}

// ------------------------------------------------------------------ estado
export function novoJogo() {
  const g = {
    sala: 'escritorio',
    f: {
      mesaVista: false, gavetaAberta: false, quadroLido: false, relogioVisto: false, retratoVisto: false, cofreAberto: false,
      portaLabAberta: false, estanteVista: false, caixinhaAberta: false, chipInstalado: false, senhaRevelada: false,
      terminalLiberado: false, portaSaidaAberta: false, escapou: false,
    },
    locais: { chavinha: 'gaveta', cartao: 'cofre', chip: 'caixinha' }, // gaveta|cofre|caixinha|inv|usado
    inv: [],
    bip: { humor: 50, emburrado: false, conversas: 0, ultimoTom: null },
    visitadas: ['escritorio'],
    dicasPorObjetivo: {},
    n: { comandos: 0, dicas: 0, duvidas: 0, impossiveis: 0, errosCofre: 0, errosSenha: 0, errosSaida: 0 },
    tons: { educado: 0, neutro: 0, rude: 0, engracado: 0 },
    giro: {}, sabor: -10, hist: [], lat: [], custo: 0, codigos: { cofre: '', saida: '' },
    inicio: Date.now(), fim: null, turnos: [], duvida: null, ranqueado: false,
  };
  registrarTurno(g, {
    saida: [
      { tipo: 'narrador', texto: 'Você acorda numa cadeira giratória. Colado na sua testa, um bilhete: **"Fui comprar pão. Não mexa em NADA. — Dr. Maestro"**. A porta está trancada. Hora de mexer em tudo.' },
      { tipo: 'narrador', texto: descreverSala(g) },
    ],
  });
  return g;
}

export function registrarTurno(g, turno) {
  g.turnos.push(turno);
  if (g.turnos.length > MAX_TURNOS) g.turnos.splice(0, g.turnos.length - MAX_TURNOS);
}

const tem = (g, item) => g.inv.includes(item);
function darItem(g, item) { if (!g.inv.includes(item)) g.inv.push(item); g.locais[item] = 'inv'; }
function usarItem(g, item) { g.inv = g.inv.filter((i) => i !== item); g.locais[item] = 'usado'; }
function irPara(g, sala) { g.sala = sala; if (!g.visitadas.includes(sala)) g.visitadas.push(sala); }

// ------------------------------------------------------------------ ações válidas (a lista que vai para o Jev)
export function acoesValidas(g) {
  const A = [];
  const add = (id, desc, rotulo, alvo) => A.push({ id, desc, rotulo, alvo });
  const f = g.f, L = g.locais;
  if (g.sala === 'escritorio') {
    add('examinar_mesa', 'Olhar, examinar ou investigar a mesa e o que está em cima dela (papéis, caneca)', 'olhar a mesa', 'mesa');
    if (!f.gavetaAberta) add('abrir_gaveta', 'Abrir, puxar, forçar ou destrancar a gaveta da mesa', 'abrir a gaveta', 'gaveta');
    else add('olhar_gaveta', 'Olhar dentro da gaveta aberta da mesa ou mexer nela', 'olhar dentro da gaveta', 'gaveta');
    if (f.gavetaAberta && L.chavinha === 'gaveta') add('pegar_chavinha', 'Pegar, guardar ou levar a chavinha dourada que está dentro da gaveta', 'pegar a chavinha', 'gaveta');
    add('examinar_caneca', 'Olhar, pegar ou mexer na caneca de café em cima da mesa', 'olhar a caneca', 'caneca');
    add('ler_quadro', 'Ler, olhar ou examinar o quadro branco (lousa) e a fórmula rabiscada nele', 'ler o quadro branco', 'quadro');
    add('examinar_retrato', 'Olhar o retrato (pintura, foto) do gato pendurado na parede', 'olhar o retrato do gato', 'retrato');
    add('examinar_relogio', 'Olhar o relógio de parede parado, ver que horas ele marca ou mexer nos ponteiros', 'olhar o relógio', 'relogio');
    if (!f.cofreAberto) add('usar_cofre', 'Examinar o cofre da parede, tentar abri-lo ou digitar um código numérico no teclado dele (inclusive quando o comando é só um número)', 'tentar abrir o cofre', 'cofre');
    else add('olhar_cofre', 'Olhar dentro do cofre aberto', 'olhar dentro do cofre', 'cofre');
    if (f.cofreAberto && L.cartao === 'cofre') add('pegar_cartao', 'Pegar ou guardar o cartão de acesso que está dentro do cofre', 'pegar o cartão', 'cofre');
    if (!f.portaLabAberta) add('usar_porta_lab', 'Abrir, destrancar ou atravessar a porta de metal que leva ao laboratório, inclusive passar um cartão no leitor dela', 'abrir a porta de metal', 'porta_lab');
    else add('ir_laboratorio', 'Ir para o laboratório pela porta de metal (já aberta): entrar, avançar ou seguir em frente', 'ir para o laboratório', 'porta_lab');
  } else if (g.sala === 'laboratorio') {
    add('falar_com_bip', 'Falar com o robô Bip: chamar, cumprimentar, xingar, pedir ajuda, perguntar algo ou conversar com ele', 'falar com o Bip', 'bip');
    if (g.bip.emburrado) add('pedir_desculpas_bip', 'Pedir desculpas ao Bip, fazer as pazes ou elogiá-lo para ele parar de ficar bravo', 'pedir desculpas ao Bip', 'bip');
    add('examinar_bip', 'Olhar ou examinar o robô Bip: a aparência, o corpo e o compartimento no peito dele', 'examinar o Bip', 'bip');
    if (tem(g, 'chip')) add('dar_chip_bip', 'Colocar, encaixar, instalar ou entregar o chip de memória no robô Bip', 'colocar o chip no Bip', 'bip');
    add('examinar_estante', 'Olhar a estante de livros e o que há nas prateleiras', 'olhar a estante', 'estante');
    if (!f.caixinhaAberta) add('abrir_caixinha', 'Abrir a caixinha de metal trancada da estante, inclusive usar uma chave na fechadura dela', 'abrir a caixinha', 'caixinha');
    else add('olhar_caixinha', 'Olhar dentro da caixinha aberta da estante', 'olhar a caixinha', 'caixinha');
    if (f.caixinhaAberta && L.chip === 'caixinha') add('pegar_chip', 'Pegar ou guardar o chip de memória que está na caixinha', 'pegar o chip', 'caixinha');
    if (!f.terminalLiberado) add('usar_terminal', 'Usar o terminal (computador): olhar a tela, ligar, fazer login ou digitar uma senha nele — inclusive quando o comando é só uma palavra solta que pode ser a senha', 'usar o terminal', 'terminal');
    else add('ler_terminal', 'Ler a tela do terminal já desbloqueado', 'ler o terminal', 'terminal');
    add('examinar_frascos', 'Olhar ou examinar os frascos borbulhantes da bancada', 'olhar os frascos', 'frascos');
    if (!f.portaSaidaAberta) add('usar_porta_saida', 'Abrir ou atravessar a porta reforçada que leva ao corredor da saída', 'abrir a porta da saída', 'porta_saida');
    else add('ir_saida', 'Ir para o corredor da saída pela porta reforçada (já destrancada): avançar, fugir, seguir em frente', 'ir para a saída', 'porta_saida');
    add('voltar_escritorio', 'Voltar para o escritório', 'voltar ao escritório', null);
  } else {
    add('usar_teclado_saida', 'Digitar um código no teclado numérico da porta de saída (inclusive quando o comando é só um número), ou tentar abrir a porta de saída', 'digitar o código da saída', 'teclado');
    add('examinar_planta', 'Olhar, tocar ou mexer na planta carnívora do vaso', 'olhar a planta', 'planta');
    add('examinar_capacho', 'Olhar ou levantar o capacho do chão', 'olhar o capacho', 'capacho');
    add('voltar_laboratorio', 'Voltar para o laboratório', 'voltar ao laboratório', null);
  }
  add('olhar_ao_redor', 'Olhar em volta, descrever o lugar, perguntar onde está ou o que há por aqui', 'olhar ao redor', null);
  if (g.inv.length) add('examinar_item', 'Examinar de perto um item que o jogador já carrega (' + g.inv.map((i) => ITENS[i].nome).join(', ') + ')', 'examinar um item', null);
  add('ver_inventario', 'Ver o que o jogador está carregando (inventário, bolsos, mochila)', 'ver o inventário', null);
  add('pedir_dica', 'Pedir ajuda, uma dica, ou dizer que está perdido ou travado', 'pedir uma dica', null);
  add('acao_impossivel', 'Nenhuma das ações acima: comando sem relação com esta cena, sem sentido, impossível, violento ou não permitido no jogo', 'ação impossível', null);
  return A;
}

function objetosReferencia(g) {
  const ids = [...OBJ_POR_SALA[g.sala]];
  for (const i of g.inv) if (!ids.includes(i)) ids.push(i);
  if (g.sala === 'escritorio' && g.f.gavetaAberta && g.locais.chavinha === 'gaveta') ids.push('chavinha');
  if (g.sala === 'escritorio' && g.f.cofreAberto && g.locais.cartao === 'cofre') ids.push('cartao');
  if (g.sala === 'laboratorio' && g.f.caixinhaAberta && g.locais.chip === 'caixinha') ids.push('chip');
  return [...new Set(ids)];
}

// Pistas que o jogador JÁ descobriu (só entram no state depois de reveladas — sem spoiler).
function fatosConhecidos(g) {
  const f = g.f, out = [];
  if (f.quadroLido) out.push('o cofre abre com a hora em que o relógio parou');
  if (f.relogioVisto) out.push('o relógio parou às 3h14');
  if (f.retratoVisto) out.push('o gato do retrato se chama Pipoca');
  if (f.senhaRevelada && !f.terminalLiberado) out.push('a senha do terminal é "pipoca" (digitar a palavra pipoca é tentar a senha no terminal)');
  if (f.terminalLiberado && !f.escapou) out.push('o código da porta de saída é 427 (digitar esse número é usar o teclado da saída)');
  return out.length ? out : 'nada ainda';
}

// ------------------------------------------------------------------ o que vai para o Jev
export function montarChamada(g, texto) {
  const acoes = acoesValidas(g);
  const objs = objetosReferencia(g);
  const state = {
    jogo: 'Escape room de texto "O Laboratório do Dr. Maestro". O jogador digita comandos livres em português (pode usar gíria, abreviação, erro de digitação, emoji ou inglês).',
    sala_atual: SALAS[g.sala].titulo,
    o_que_o_jogador_ve: semMarcacao(descreverSala(g)),
    inventario: g.inv.length ? g.inv.map((i) => ITENS[i].nome) : 'vazio',
    o_jogador_ja_sabe: fatosConhecidos(g),
    historico_recente: g.hist.slice(-3),
    comando_do_jogador: texto,
  };
  const questions = {
    acao: {
      type: 'choice',
      instructions: `Qual ação do jogo o comando do jogador pede: "${texto}"? Interprete gíria, erros de digitação, emoji e inglês. Use a cena, o inventário e o histórico para entender pronomes como "ela", "isso", "aí". Se nenhuma ação corresponder, escolha acao_impossivel.`,
      criteria: Object.fromEntries(acoes.map((a) => [a.id, a.desc])),
    },
    tom: { type: 'choice', instructions: 'Qual é o tom do comando do jogador?', criteria: TOM },
    absurdo: { type: 'choice', instructions: 'Se o comando do jogador for impossível ou não fizer parte do jogo, que tipo de coisa ele tenta fazer?', criteria: ABSURDO },
    objeto: {
      type: 'choice',
      instructions: 'Qual objeto, item ou personagem da cena o comando do jogador menciona ou tem como alvo?',
      criteria: { ...Object.fromEntries(objs.map((id) => [id, OBJ[id].desc])), nenhum: 'Nenhum objeto específico da cena' },
    },
  };
  return { state, questions, acoes };
}

// ------------------------------------------------------------------ descrições
export function descreverSala(g) {
  const f = g.f, L = g.locais;
  if (g.sala === 'escritorio') {
    const extra = [];
    if (f.gavetaAberta) extra.push(L.chavinha === 'gaveta' ? 'A gaveta está aberta, com uma **chavinha** brilhando lá dentro.' : 'A gaveta está aberta.');
    if (f.cofreAberto) extra.push(L.cartao === 'cofre' ? 'O cofre está aberto, com um **cartão de acesso** dentro.' : 'O cofre está aberto e vazio.');
    if (f.portaLabAberta) extra.push('A porta de metal está aberta.');
    return '**Escritório do Dr. Maestro.** Cheiro de café frio e genialidade. Há uma **mesa** bagunçada com uma **gaveta**, um **quadro branco** rabiscado, o **retrato** de um gato, um **relógio** de parede parado e um **cofre** embutido na parede. Uma **porta de metal** com leitor de cartão leva ao laboratório.' + (extra.length ? ' ' + extra.join(' ') : '');
  }
  if (g.sala === 'laboratorio') {
    const extra = [];
    if (g.bip.emburrado) extra.push('O Bip está de costas para você, emburrado.');
    else if (f.chipInstalado) extra.push('O chip no peito do Bip brilha, azul e feliz.');
    if (f.caixinhaAberta) extra.push(L.chip === 'caixinha' ? 'A caixinha da estante está aberta, com um **chip** dentro.' : 'A caixinha da estante está aberta e vazia.');
    extra.push(f.portaSaidaAberta ? 'A porta da saída está destrancada.' : 'A porta da saída está trancada.');
    return '**Laboratório.** Frascos borbulham em cores que não deveriam existir. No meio da sala, o robô **Bip** te observa com olhos de LED. Há uma **estante** cheia de livros com uma **caixinha** de metal, um **terminal** que pede uma senha e uma **porta reforçada** que leva à saída.' + ' ' + extra.join(' ');
  }
  return '**Corredor da saída.** Luz de emergência verde, uma **planta carnívora** num vaso e um **capacho**. No fim do corredor, a **porta de saída**, com um **teclado numérico** de 3 dígitos. A liberdade está a três números de distância.';
}

// ------------------------------------------------------------------ Bip
function rostoBip(g) {
  if (g.bip.emburrado) return 'costas';
  if (g.bip.ultimoTom === 'engracado') return 'rindo';
  if (!g.f.chipInstalado) return 'confuso';
  if (g.bip.ultimoTom === 'educado') return g.bip.humor >= 80 ? 'amor' : 'feliz';
  return g.bip.humor >= 70 ? 'feliz' : 'neutro';
}
const ajustaHumor = (g, d) => { g.bip.humor = Math.max(0, Math.min(100, g.bip.humor + d)); };

function estagioBip(g) {
  if (g.f.terminalLiberado) return 'D';
  if (g.f.chipInstalado) return 'C';
  if (tem(g, 'chip')) return 'B';
  return 'A';
}
const FALAS_BIP = {
  A: {
    educado: 'BIP-BOP! Que humano educado! O Bip adoraria ajudar, mas o Bip esqueceu tudo: o Doutor tirou o **chip de memória** do Bip. Acho que ficou numa **caixinha na estante**. Acho. O Bip não tem memória para ter certeza.',
    neutro: 'BIP. Memória: vazia. O Doutor removeu o **chip de memória** do Bip. Localização provável: **caixinha na estante**.',
    engracado: 'HA-HA-BIP! Piada processada: nota 7/10. O Bip riria mais se tivesse memória. O Doutor tirou o **chip** do Bip. Procure na **estante**!',
  },
  B: {
    educado: 'Esse chip é a memória do Bip! Por favor, encaixe no **peito do Bip**. O Bip agradece desde já!',
    neutro: 'Chip de memória detectado. Instale no **compartimento do peito** do Bip.',
    engracado: 'HA-HA! Você achou a minha memória! Encaixa aqui no **peito**, mas sem cócegas.',
  },
  C: {
    educado: 'Com prazer, humano gentil! A senha do terminal é **pipoca**. O nome do gato do Doutor.',
    neutro: 'Senha do terminal: **pipoca**. O Bip recomenda digitar no terminal.',
    engracado: 'Miau-bip! A senha é **pipoca**, igual o gato. O Doutor usa pra tudo. Até pro Wi-Fi.',
  },
  D: {
    educado: 'A porta da saída está aberta! O código do teclado é **4-2-7**. Foi um prazer, humano!',
    neutro: 'Código da porta de saída: **4-2-7**. Recomendo sair antes que o Doutor volte com o pão.',
    engracado: '4-2-7! Corre, humano! Se o Doutor voltar, finge que é estagiário!',
  },
};
const BIP_OFENDIDO = [
  'BIP?! Grosseria detectada! O Bip não ajuda quem fala assim. 😤 *O Bip vira de costas.*',
  'Processando ofensa... 100%. O Bip está oficialmente **emburrado**. *Vira de costas.*',
];
const BIP_EMBURRADO = {
  educado: 'O Bip continua de costas. *Hmpf.* Talvez um pedido de **desculpas**?',
  neutro: 'O Bip continua de costas. *Hmpf.* Talvez um pedido de **desculpas**?',
  engracado: 'O Bip não vai rir. O Bip está bravo. ...Tá, foi um pouco engraçado. Mas peça **desculpas**.',
  rude: 'O Bip aumentou o volume do *hmpf*. **HMPF.**',
};

// ------------------------------------------------------------------ respostas para ações impossíveis
const IMPOSSIVEL = {
  violencia: {
    obj: [
      'Você chuta {o}. {O} nem se mexe. Seu dedão, por outro lado, manda lembranças.',
      'Você parte para a ignorância contra {o}. Placar final: {o} 1 × 0 você.',
      'Violência não abre nada aqui. Nem {o}. Principalmente {o}.',
    ],
    solo: [
      'Você soca o ar com vontade. O ar não se abala. Violência não é a resposta — a resposta costuma ser um código.',
      'Você pensa em quebrar tudo. Aí lembra que o Dr. Maestro guarda todos os recibos. Melhor não.',
    ],
  },
  magia: {
    solo: [
      'Você fecha os olhos e tenta se teletransportar. Abre os olhos. Mesmo lugar, menos dignidade.',
      'Você tenta voar. A gravidade, invicta desde sempre, vence mais uma.',
      'Você tenta atravessar a parede. A parede, educada porém firme, diz não.',
    ],
  },
  comer_beber: {
    obj: [
      'Você pensa em comer {o}. {O} pensa em não ser comid{a}. Empate técnico.',
      'Você lambe {o}. Gosto de poeira e derrota. Não ajudou.',
    ],
    solo: [
      'Nada de comer ou beber no laboratório. Regra nº 1 do Dr. Maestro. (A regra nº 2 é "não mexa no Bip".)',
      'Sua barriga ronca. O Dr. Maestro foi justamente comprar pão. Fuja e vá atrás dele.',
    ],
  },
  fora_do_jogo: {
    solo: [
      'Boa pergunta! Mas agora a única pergunta que importa é: como sair daqui?',
      'O Jev decide rápido, mas aqui ele só decide coisas deste laboratório. Foco na fuga!',
      'Anotado. Vou perguntar isso ao Dr. Maestro quando ele voltar com o pão.',
    ],
  },
  trapaca: {
    solo: [
      'Tentativa de atalho detectada. O Jev só escolhe entre as ações que o jogo permite — e "ganhar direto" não está na lista.',
      'Pedir a resposta pronta? O Dr. Maestro ficaria orgulhoso da sua preguiça. Tente "me dá uma dica".',
    ],
  },
  festa: {
    solo: [
      'Você dança sozinho no meio da sala. Uma câmera de segurança grava tudo. Você finge que era alongamento.',
      'Você canta a plenos pulmões. O eco responde desafinado. As portas continuam trancadas.',
    ],
  },
  desistir: {
    solo: [
      'Desistir? Agora? O Dr. Maestro volta com o pão a qualquer momento. Peça uma dica: "me ajuda".',
      'Você senta no chão e respira fundo. Pronto. Agora levanta, que porta nenhuma se abre sozinha.',
    ],
  },
  sem_sentido: {
    solo: [
      'O Jev leu, releu e concluiu: isso não é uma ação deste mundo. Tente algo como "olhar ao redor".',
      'Seu gato andou no teclado? Tente algo como "abrir a gaveta" ou "falar com o Bip".',
      'Você murmura palavras misteriosas. Nada acontece. Não temos feitiços aqui — só gavetas.',
    ],
  },
  nada_disso: {
    obj: ['Você tenta isso com {o}. Nada acontece — e {o} parece te julgar em silêncio.'],
    solo: ['Isso não dá para fazer aqui. Mas dá para olhar, abrir, pegar e usar coisas, e conversar com quem estiver por perto.'],
  },
};
const IMPOSSIVEL_ESPECIAL = {
  'comer_beber:frascos': 'Você pensa em beber o líquido verde. O líquido verde pensa em te beber de volta. Melhor não.',
  'comer_beber:caneca': 'Você toma o resto de café da caneca. Estava frio. E era de 2019. Arrependimento instantâneo.',
  'violencia:frascos': 'Você pensa em quebrar os frascos. Eles borbulham mais forte, como quem diz "tenta". Você não tenta.',
  'violencia:planta': 'Você ameaça a Dona Gertrudes. Ela abre a boca, mostra 40 dentes e você reconsidera suas escolhas.',
  'comer_beber:planta': 'Você tenta morder a planta carnívora. Ela tenta te morder primeiro. Ela é mais rápida.',
  'nada_disso:planta': 'A Dona Gertrudes te observa, faminta. Melhor manter distância.',
};

const SABOR = {
  educado: ['(Tanta educação que até a porta ficou sem graça.)', '(O narrador aprecia sua gentileza.)'],
  rude: ['(O narrador anotou sua grosseria. Ele não esquece.)', '(Calma. Os objetos não têm culpa.)'],
  engracado: ['(O narrador riu por dentro.)', '(Boa! Pena que a porta não tem senso de humor.)'],
};
const SABOR_BIP = {
  educado: ['Que educação! O Bip aprova.', 'O Bip gostou desse humano.'],
  rude: ['Olha a boca, humano.', 'O Bip ouviu isso. 😒'],
  engracado: ['HA-HA-BIP.', 'Piada detectada. Rindo em binário: 01101000 01100001.'],
};

// ------------------------------------------------------------------ dicas
function objetivo(g) {
  const f = g.f, L = g.locais;
  if (f.escapou) return null;
  if (g.sala === 'saida') return 'teclado';
  if (g.sala === 'escritorio') {
    if (!f.gavetaAberta && L.chavinha === 'gaveta') return 'gaveta';
    if (L.chavinha === 'gaveta') return 'chavinha';
    if (!f.cofreAberto) return !f.quadroLido ? 'quadro' : !f.relogioVisto ? 'relogio' : 'cofre';
    if (L.cartao === 'cofre') return 'cartao';
    if (!f.portaLabAberta) return 'porta_lab';
    return f.terminalLiberado ? 'ir_saida_longe' : 'ir_lab';
  }
  if (!f.chipInstalado) {
    if (!f.caixinhaAberta) return L.chavinha !== 'inv' ? 'buscar_chavinha' : (g.bip.conversas === 0 && !f.estanteVista ? 'bip' : 'caixinha');
    if (L.chip === 'caixinha') return 'chip';
    return 'dar_chip';
  }
  if (g.bip.emburrado && !f.senhaRevelada) return 'desculpas';
  if (!f.terminalLiberado) return 'terminal';
  return 'ir_saida';
}
const DICAS = {
  gaveta: ['A mesa tem uma **gaveta**. Gavetas existem para ser abertas.', 'Abra a gaveta da mesa: "abrir a gaveta".'],
  chavinha: ['Algo dourado brilha dentro da gaveta.', 'Pegue a chavinha: "pegar a chavinha".'],
  quadro: ['O **quadro branco** tem mais do que rabiscos.', 'Leia o quadro: "ler o quadro".'],
  relogio: ['O quadro fala da hora em que o tempo parou. Tem um **relógio parado** na parede…', 'Olhe o relógio: "que horas o relógio marca?".'],
  cofre: ['Relógio parado + fórmula do quadro = código do **cofre**.', 'O relógio parou às 3h14. Digite no cofre: "digitar 314 no cofre".'],
  cartao: ['O que tem dentro do cofre abre alguma coisa.', 'Pegue o cartão de acesso: "pegar o cartão".'],
  porta_lab: ['O leitor de cartão da **porta de metal** parece faminto.', 'Passe o cartão na porta: "usar o cartão na porta".'],
  ir_lab: ['O **laboratório** te espera do outro lado da porta de metal.', 'Entre: "ir para o laboratório".'],
  ir_saida_longe: ['A porta da saída fica no laboratório.', '"ir para o laboratório" e depois "ir para a saída".'],
  bip: ['O robô **Bip** sabe mais do que parece. Converse com ele.', 'Fale com ele: "Bip, me ajuda?".'],
  buscar_chavinha: ['A caixinha da estante tem uma fechadura minúscula e dourada… e você deixou algo dourado no **escritório**.', 'Volte ao escritório e pegue a chavinha na gaveta da mesa.'],
  caixinha: ['Na **estante** há uma caixinha com fechadura minúscula e dourada. Você carrega algo minúsculo e dourado.', 'Use a chavinha: "abrir a caixinha com a chavinha".'],
  chip: ['Tem um **chip** esperando na caixinha.', 'Pegue o chip: "pegar o chip".'],
  dar_chip: ['O Bip tem um **compartimento vazio** no peito, do tamanho de um chip…', 'Encaixe o chip no Bip: "colocar o chip no Bip".'],
  desculpas: ['O Bip está emburrado e não vai contar nada assim.', 'Peça desculpas: "desculpa, Bip".'],
  terminal: ['A senha do **terminal** é o nome de um gato. Tem um retrato dele no escritório — e o Bip também sabe.', 'Digite no terminal: "digitar pipoca no terminal".'],
  ir_saida: ['A **porta da saída** destrancou. O que você está esperando?', 'Vá para a saída: "ir para a saída".'],
  teclado: ['O código da porta estava na tela do **terminal**.', 'Digite no teclado: "digitar 427 no teclado".'],
};
function darDica(g) {
  const o = objetivo(g);
  if (!o) return 'Você já escapou! Não precisa de dica.';
  const n = (g.dicasPorObjetivo[o] = (g.dicasPorObjetivo[o] || 0) + 1);
  g.n.dicas++;
  return DICAS[o][Math.min(n - 1, 1)];
}

// ------------------------------------------------------------------ exemplos clicáveis (mudam com o estado)
const EX_OBJ = {
  gaveta: ['dá uma olhada na mesa', 'puxa essa gaveta aí'],
  chavinha: ['pega a chavinha', 'guarda essa chave no bolso 🔑'],
  quadro: ['o q tá escrito no quadro?', 'read the whiteboard'],
  relogio: ['que horas esse relógio marca?'],
  cofre: ['tenta abrir o cofre'],
  cartao: ['pega o cartão 💳'],
  porta_lab: ['passa o cartão na porta'],
  ir_lab: ['bora pro laboratório'],
  ir_saida_longe: ['volta pro laboratório'],
  bip: ['bip, me ajuda por favor', 'e aí robô, suave?'],
  buscar_chavinha: ['volta pro escritório'],
  caixinha: ['olha a estante', 'abre a caixinha com a chavinha'],
  chip: ['pega o chip'],
  dar_chip: ['coloca o chip no bip'],
  desculpas: ['foi mal, Bip, desculpa 🙏'],
  terminal: ['liga o computador'],
  ir_saida: ['bora pra saída!'],
  teclado: ['digita 4-2-7 no teclado'],
};
const EX_FUN = {
  escritorio: ['chuta o cofre 🦶', 'come a caneca', 'me ajuda, tô perdido', 'qual a capital da França?', 'asdfgh', 'open the door please'],
  laboratorio: ['bip, anda logo, lata velha!', 'bebe o líquido verde', 'teleporta pra fora daqui', 'faz uma dancinha 💃'],
  saida: ['faz carinho na planta', 'levanta o capacho', 'grita socorro!!!'],
};
function exemplos(g) {
  const o = objetivo(g);
  if (!o) return [];
  let prog = [...(EX_OBJ[o] || [])];
  if (o === 'cofre' && g.f.quadroLido && g.f.relogioVisto) prog = ['digita 3-1-4 no cofre', ...prog];
  if (o === 'terminal' && g.f.senhaRevelada) prog = ['digita pipoca no terminal'];
  let fun = EX_FUN[g.sala].filter((t) => !(g.bip.emburrado && t.includes('lata velha')));
  const k = g.n.comandos % fun.length;
  fun = [...fun.slice(k), ...fun.slice(0, k)].slice(0, 6 - Math.min(3, prog.length));
  return [...prog.slice(0, 3), ...fun];
}

// ------------------------------------------------------------------ execução de uma ação
// ctx = { texto, tom, tomP, absurdo, objeto, clicado }
export function executar(g, id, ctx) {
  const f = g.f, L = g.locais;
  const saida = [];
  const N = (texto) => saida.push({ tipo: 'narrador', texto });
  const B = (texto) => saida.push({ tipo: 'bip', texto });
  const S = (texto) => saida.push({ tipo: 'sucesso', texto });
  let alvo = acoesValidas(g).find((a) => a.id === id)?.alvo || null;
  let efeito = 'pulse';
  const tom = ctx.tomP >= 0.5 ? ctx.tom : 'neutro';

  switch (id) {
    // ---------------- escritório
    case 'examinar_mesa':
      N(f.mesaVista ? 'A mesa continua bagunçada. Gênios não arrumam mesa.' + (f.gavetaAberta ? ' A gaveta está aberta.' : ' A **gaveta** continua fechada.')
        : 'Papéis cheios de cálculos, uma **caneca** escrita "MELHOR CIENTISTA DO MUNDO (segundo eu mesmo)" e uma **gaveta** meio emperrada.');
      f.mesaVista = true; break;
    case 'abrir_gaveta':
      f.gavetaAberta = true; efeito = 'open';
      N('Você puxa a gaveta. Ela range, resiste e cede. Lá dentro: uma **chavinha dourada**, três clipes e um chiclete de 2019.'); break;
    case 'olhar_gaveta':
      N(L.chavinha === 'gaveta' ? 'Três clipes, um chiclete de 2019 e a **chavinha dourada** brilhando.' : 'Só três clipes e um chiclete de 2019. Você pensa no chiclete. Não.'); break;
    case 'pegar_chavinha':
      darItem(g, 'chavinha'); efeito = 'take';
      S('Você pegou a **chavinha dourada**. Pequena, brilhante e com um **π** gravado. Abre alguma fechadura bem pequena.'); break;
    case 'examinar_caneca':
      N('A caneca diz "MELHOR CIENTISTA DO MUNDO (segundo eu mesmo)". Tem um resto de café de ontem. Ou de 2019. Difícil dizer.'); break;
    case 'ler_quadro':
      f.quadroLido = true;
      N('Entre rabiscos de foguetes e um gato desenhado, está escrito em vermelho: **"COFRE = a hora exata em que o tempo parou"**. Embaixo, menor: "se esquecer, olhe pra parede, Maestro".'); break;
    case 'examinar_retrato':
      f.retratoVisto = true;
      N('Um retrato a óleo de um gato laranja com cara de deboche. Na plaquinha: **"Pipoca — o verdadeiro chefe deste laboratório"**.'); break;
    case 'examinar_relogio':
      f.relogioVisto = true;
      N('O relógio de parede parou às **3h14**. Os ponteiros nem tremem. O Dr. Maestro é tão nerd que até o relógio parou no π.'); break;
    case 'usar_cofre': {
      const cod = temPi(ctx.texto) ? '314' : digitos(ctx.texto);
      if (!cod) { N('Um cofre de aço com um teclado de **3 dígitos**. Sem fechadura: só código. Experimente algo como "digitar 123 no cofre".'); break; }
      g.codigos.cofre = cod.slice(0, 3);
      if (cod.length !== 3) { N(`O teclado do cofre aceita exatamente **3 dígitos**. Você digitou ${cod.length}.`); efeito = 'shake'; break; }
      if (cod === '314') {
        f.cofreAberto = true; efeito = 'open';
        S((temPi(ctx.texto) ? 'Você digita **π**. O cofre, que também é nerd, aprova. ' : 'Você digita **3-1-4**. ') + '*Clique. Clique. CLONC.* A porta do cofre se abre devagar, com fumacinha dramática. Lá dentro: um **cartão de acesso**.');
        break;
      }
      g.n.errosCofre++; efeito = 'shake';
      N(`Você digita **${cod}**. *BÉÉÉ.* Luz vermelha. O cofre continua fechado e, de algum jeito, parece debochar de você.` + (g.n.errosCofre >= 2 ? ' (O quadro branco fala de um relógio…)' : ''));
      break;
    }
    case 'olhar_cofre':
      N(L.cartao === 'cofre' ? 'Dentro do cofre: o **cartão de acesso** do Dr. Maestro.' : 'O cofre está vazio. Só sobrou o eco de um "mas como?!".'); break;
    case 'pegar_cartao':
      darItem(g, 'cartao'); efeito = 'take';
      S('Você pegou o **cartão de acesso**. Na foto, o Dr. Maestro está piscando. Em todas as fotos ele está piscando.'); break;
    case 'usar_porta_lab':
      if (!tem(g, 'cartao')) { efeito = 'shake'; N('A porta de metal está trancada. O leitor de cartão pisca **vermelho**, entediado.'); break; }
      f.portaLabAberta = true; efeito = 'open';
      S('Você passa o cartão. *PI-PI!* Luz **verde**. A porta desliza com um chiado de filme de ficção científica.');
      irPara(g, 'laboratorio');
      N(descreverSala(g));
      B('BIP-BOP! Humano detectado. O Bip não lembra quem você é. O Bip não lembra quem o Bip é.');
      alvo = 'bip';
      break;
    case 'ir_laboratorio':
      irPara(g, 'laboratorio'); N('Você volta ao laboratório. ' + descreverSala(g)); alvo = 'bip'; break;

    // ---------------- laboratório
    case 'falar_com_bip': {
      g.bip.conversas++;
      if (g.bip.emburrado) { B(BIP_EMBURRADO[tom] || BIP_EMBURRADO.neutro); if (tom === 'rude') ajustaHumor(g, -10); break; }
      if (tom === 'rude') { g.bip.emburrado = true; g.bip.ultimoTom = 'rude'; ajustaHumor(g, -25); efeito = 'shake'; B(pick(g, 'bipOfendido', BIP_OFENDIDO)); break; }
      g.bip.ultimoTom = tom; ajustaHumor(g, tom === 'educado' ? 15 : tom === 'engracado' ? 10 : 0);
      const est = estagioBip(g);
      B(FALAS_BIP[est][tom] || FALAS_BIP[est].neutro);
      if (est === 'C') f.senhaRevelada = true;
      break;
    }
    case 'pedir_desculpas_bip':
      g.bip.emburrado = false; g.bip.ultimoTom = 'educado'; ajustaHumor(g, 20);
      B('*O Bip se vira devagar.* Desculpas aceitas. O Bip é um robô evoluído.' + (f.chipInstalado && !f.terminalLiberado ? ' E, já que você pediu com jeito: a senha do terminal é **pipoca**.' : ''));
      if (f.chipInstalado) f.senhaRevelada = true;
      break;
    case 'examinar_bip':
      N(f.chipInstalado ? 'O Bip é um robô do tamanho de um cachorro médio, com uma tela no lugar do rosto e rodinhas. No peito, o **chip de memória** brilha, azul e feliz.'
        : 'O Bip é um robô do tamanho de um cachorro médio, com uma tela no lugar do rosto e rodinhas. No peito, um **compartimento vazio** do tamanho de um chip.');
      if (g.bip.emburrado) N('Ele está de costas para você. Dá para ouvir um *hmpf* baixinho.');
      break;
    case 'dar_chip_bip':
      usarItem(g, 'chip'); f.chipInstalado = true; efeito = 'open';
      if (g.bip.emburrado) {
        N('Você encaixa o chip no peito do Bip. Ele treme, pisca e faz um barulho de modem de 1998.');
        B('**MEMÓRIA RESTAURADA.** O Bip lembrou de tudo. Inclusive de como você foi grosso. Sem desculpas, sem senha. 😤');
      } else {
        N('Você encaixa o chip no peito do Bip. Ele treme, pisca e faz um barulho de modem de 1998…');
        B('**MEMÓRIA RESTAURADA!** O Bip lembrou de tudo! A senha do terminal é **pipoca** — o nome do gato do Doutor. Ele usa essa senha pra TUDO.');
        f.senhaRevelada = true; g.bip.ultimoTom = 'educado'; ajustaHumor(g, 15);
      }
      break;
    case 'examinar_estante':
      f.estanteVista = true;
      N('Livros como "Física Quântica para Gatos", "Como Escapar de Laboratórios — vol. 2" e "Pão: uma paixão". Numa prateleira, uma **caixinha de metal** com uma fechadura minúscula e dourada.'
        + (f.caixinhaAberta ? (L.chip === 'caixinha' ? ' A caixinha está aberta, com um **chip** dentro.' : ' A caixinha está aberta e vazia.') : ''));
      break;
    case 'abrir_caixinha':
      f.estanteVista = true;
      if (!tem(g, 'chavinha')) { efeito = 'shake'; N('Trancada. A fechadura é minúscula e dourada, do tamanho de uma chavinha. Uma chavinha dourada, talvez.' + (L.chavinha === 'gaveta' ? ' (Você viu algo assim no escritório…)' : '')); break; }
      usarItem(g, 'chavinha'); f.caixinhaAberta = true; efeito = 'open';
      S('A chavinha dourada encaixa perfeitamente. *Clic.* Dentro da caixinha, sobre um travesseirinho de veludo: um **chip de memória** com a etiqueta "MEMÓRIA DO BIP — NÃO PERDER (de novo)". A chavinha fica presa na fechadura.');
      break;
    case 'olhar_caixinha':
      N(L.chip === 'caixinha' ? 'O **chip de memória** está na caixinha, sobre um travesseirinho de veludo.' : 'A caixinha está vazia. O travesseirinho de veludo parece triste.'); break;
    case 'pegar_chip':
      darItem(g, 'chip'); efeito = 'take';
      S('Você pegou o **chip de memória**. O Bip olha para o chip. O chip olha para o Bip. Momento emocionante.'); break;
    case 'usar_terminal': {
      const t = tentativaSenha(ctx.texto);
      if (!t) {
        N('A tela pisca: **SENHA: ______** (6 letras). Embaixo, em letras miúdas: ' + (f.chipInstalado ? '"Dica: pergunte ao Bip."' : '"Dica: pergunte ao Bip. Ah, é: o Bip está sem memória."') + ' Para tentar, escreva algo como "digitar banana no terminal".');
        break;
      }
      if (!t.ok) { g.n.errosSenha++; efeito = 'shake'; N(`Você digita **${t.palavra}**. *BZZZT.* SENHA INCORRETA. O terminal mostra um gato rindo em ASCII: (=^･ω･^=)`); break; }
      f.terminalLiberado = true; f.portaSaidaAberta = true; f.senhaRevelada = true; efeito = 'open';
      S('Você digita **pipoca**. *TUTURUUU!* **ACESSO LIBERADO.** A tela mostra: "• Comprar ração pro Pipoca • Consertar o Bip • Código da porta de saída: **4-2-7** (NÃO ESQUECER DE NOVO)". Um *clac* pesado ecoa: a **porta da saída** destrancou!');
      break;
    }
    case 'ler_terminal':
      N('A tela do terminal: "• Comprar ração pro Pipoca • Consertar o Bip • Código da porta de saída: **4-2-7** (NÃO ESQUECER DE NOVO)".'); break;
    case 'examinar_frascos':
      N('Frascos borbulham em verde, roxo e numa cor que você nunca viu. Um deles tem a etiqueta **"NÃO BEBER (sério, Maestro)"**.'); break;
    case 'usar_porta_saida':
      efeito = 'shake'; N('Porta reforçada, trancada. Um cabo grosso liga a fechadura ao **terminal**. Sem senha, sem saída.'); break;
    case 'ir_saida':
      irPara(g, 'saida'); efeito = 'open';
      N('Você atravessa a porta reforçada. ' + descreverSala(g)); alvo = 'teclado'; break;
    case 'voltar_escritorio':
      irPara(g, 'escritorio'); N('Você volta ao escritório. Nada mudou. O café continua frio.'); alvo = null; break;

    // ---------------- saída
    case 'usar_teclado_saida': {
      const cod = digitos(ctx.texto);
      if (!cod) { N('Um teclado numérico de **3 dígitos**. Alguém rabiscou em cima dele: "o código está no terminal, gênio".'); break; }
      g.codigos.saida = cod.slice(0, 3);
      if (cod.length !== 3) { efeito = 'shake'; N(`O teclado aceita exatamente **3 dígitos**. Você digitou ${cod.length}.`); break; }
      if (cod !== '427') { g.n.errosSaida++; efeito = 'shake'; N(`Você digita **${cod}**. *FOOOOM!* Uma buzina de programa de auditório. Errado.` + (g.n.errosSaida >= 2 ? ' (O código estava na tela do terminal…)' : '')); break; }
      f.escapou = true; g.fim = Date.now(); efeito = 'escape'; alvo = 'teclado';
      S('Você digita **4-2-7**. *Clique… CLONC… CHIIIIII.* A porta se abre e a luz do sol invade o corredor. Na calçada, o Dr. Maestro segura um saco de pão, boquiaberto: "Mas… como?!" Você pega um pão de queijo do saco dele e vai embora. **VOCÊ ESCAPOU!** 🎉');
      break;
    }
    case 'examinar_planta':
      N('Uma planta carnívora chamada (segundo a plaquinha) **Dona Gertrudes**. Ela te olha com fome. Você decide não fazer carinho.'); break;
    case 'examinar_capacho':
      N('O capacho diz **"VOLTE SEMPRE"**. Embaixo dele: nada. Quem guarda chave embaixo do capacho em 2026?'); break;
    case 'voltar_laboratorio':
      irPara(g, 'laboratorio'); N('Você volta ao laboratório. ' + (g.bip.emburrado ? 'O Bip finge que não te vê.' : 'O Bip acena com as duas mãozinhas.')); alvo = 'bip'; break;

    // ---------------- genéricas
    case 'olhar_ao_redor': N(descreverSala(g)); alvo = null; break;
    case 'ver_inventario':
      alvo = null;
      N(g.inv.length ? 'Você carrega: ' + g.inv.map((i) => `${ITENS[i].emoji} **${ITENS[i].nome}**`).join(', ') + '.' : 'Seus bolsos estão vazios. Nem um chiclete.'); break;
    case 'examinar_item': {
      alvo = null;
      const it = g.inv.includes(ctx.objeto) ? ctx.objeto : g.inv.length === 1 ? g.inv[0] : null;
      if (it) N(`${ITENS[it].emoji} **${ITENS[it].curto}.** ${ITENS[it].desc}`);
      else N(g.inv.length ? 'Você carrega: ' + g.inv.map((i) => `${ITENS[i].emoji} **${ITENS[i].nome}**`).join(', ') + '.' : 'Seus bolsos estão vazios.');
      break;
    }
    case 'pedir_dica':
      alvo = null; saida.push({ tipo: 'dica', texto: darDica(g) }); break;
    default: { // acao_impossivel
      g.n.impossiveis++;
      const cat = ABSURDO[ctx.absurdo] ? ctx.absurdo : 'nada_disso';
      const obj = OBJ[ctx.objeto] && objetosReferencia(g).includes(ctx.objeto) ? ctx.objeto : null;
      alvo = obj; efeito = cat === 'violencia' ? 'shake' : 'pulse';
      if (obj === 'bip' && (cat === 'violencia' || tom === 'rude') && g.sala === 'laboratorio') {
        g.bip.emburrado = true; g.bip.ultimoTom = 'rude'; ajustaHumor(g, -25); efeito = 'shake';
        N('Você parte para cima do Bip. Ele desvia com uma elegância que você não esperava de um robô com rodinhas.');
        B('Agressão registrada em 4K. O Bip está **emburrado**. 😤');
        break;
      }
      const esp = obj && IMPOSSIVEL_ESPECIAL[`${cat}:${obj}`];
      if (esp) { N(esp); break; }
      const banco = IMPOSSIVEL[cat];
      if (obj && banco.obj && !OBJ[obj].pl) N(preencher(pick(g, 'imp:' + cat + ':obj', banco.obj), obj));
      else N(pick(g, 'imp:' + cat, banco.solo || IMPOSSIVEL.nada_disso.solo));
    }
  }

  // Pequenas reações ao TOM (a outra metade da decisão do Jev): Bip no laboratório, narrador fora dele.
  const tomForte = ctx.tomP >= 0.75 && ctx.tom !== 'neutro';
  const acaoDoBip = ['falar_com_bip', 'pedir_desculpas_bip', 'dar_chip_bip'].includes(id);
  if (tomForte && !acaoDoBip && id !== 'acao_impossivel' && !f.escapou && g.n.comandos - g.sabor >= 3) {
    g.sabor = g.n.comandos;
    if (g.sala === 'laboratorio' && !g.bip.emburrado) {
      B(pick(g, 'saborBip:' + ctx.tom, SABOR_BIP[ctx.tom]));
      g.bip.ultimoTom = ctx.tom; ajustaHumor(g, ctx.tom === 'rude' ? -10 : 5);
    } else {
      saida.push({ tipo: 'sabor', texto: pick(g, 'sabor:' + ctx.tom, SABOR[ctx.tom]) });
    }
  }
  return { saida, alvo, efeito };
}

// ------------------------------------------------------------------ fim de jogo
const TITULOS = {
  educado: '🎩 Diplomata do Laboratório',
  engracado: '🤡 Comediante de Plantão',
  rude: '😤 Grosso, mas Eficiente',
  neutro: '🤖 Quase um Robô',
};
export function resumoFim(g) {
  const tons = g.tons;
  const semNeutro = Object.entries(tons).filter(([k]) => k !== 'neutro').sort((a, b) => b[1] - a[1]);
  const dom = semNeutro[0] && semNeutro[0][1] >= 2 ? semNeutro[0][0] : 'neutro';
  const lat = g.lat.length ? Math.round(g.lat.reduce((a, b) => a + b, 0) / g.lat.length) : null;
  return {
    tempo_ms: (g.fim || Date.now()) - g.inicio,
    comandos: g.n.comandos,
    dicas: g.n.dicas,
    precisao: g.n.comandos ? (g.n.comandos - g.n.duvidas) / g.n.comandos : 1,
    titulo: TITULOS[dom],
    tons,
    lat_media: lat,
    custo: g.custo,
    decisoes: g.lat.length,
    ranqueado: g.ranqueado,
  };
}

// ------------------------------------------------------------------ visão pública (o que o navegador recebe)
export function publico(g) {
  return {
    sala: g.sala,
    salaNome: SALAS[g.sala].titulo,
    salaN: SALAS[g.sala].n,
    flags: { ...g.f, chavinhaNaGaveta: g.locais.chavinha === 'gaveta', cartaoNoCofre: g.locais.cartao === 'cofre', chipNaCaixinha: g.locais.chip === 'caixinha' },
    inventario: g.inv.map((id) => ({ id, nome: ITENS[id].curto, emoji: ITENS[id].emoji })),
    bip: { humor: g.bip.humor, emburrado: g.bip.emburrado, rosto: rostoBip(g) },
    visitadas: g.visitadas,
    stats: { comandos: g.n.comandos, dicas: g.n.dicas, inicio: g.inicio, fim: g.fim, agora: Date.now() },
    exemplos: exemplos(g),
    acoes: acoesValidas(g).map((a) => a.id),
    codigos: g.codigos,
    duvida: g.duvida ? g.duvida.opcoes.map((id) => ({ id, rotulo: g.duvida.rotulos[id] })) : null,
    fim: g.f.escapou ? resumoFim(g) : null,
  };
}

// Fale e a Cena Nasce — você conta uma história em voz alta e ela vira desenho animado na hora: a cada pausa da fala,
// UMA chamada ao Jev decide o lugar, a hora, o tempo, o clima da cena, quem está em cena (um "sim ou não" por personagem
// e objeto do catálogo) e o que cada um está fazendo. Para adaptar: troque o CATALOGO (e as imagens em assets/) e os
// LUGARES pelos seus — personagens de um livro, produtos de uma vitrine, peças de uma aula: a tela só desenha o que existe.
// Onde mexer: este arquivo (catálogo, perguntas e testes) · cenarios.js (o desenho de cada lugar) · bonecos.js (o corpo
// desenhado de quem no emoji é só cabeça) · palco.js (a tela e a demonstração) · clima.js (chuva, neve, vento, raios).

import { CATALOGO_EXTRA } from './catalogo-extra.mjs';

// ---------- o catálogo: quem pode entrar em cena ----------
// apelidos = outros nomes que valem para o mesmo personagem (vão para o Jev e servem para a tela achar quem foi citado)
// img = arquivo em assets/ · altura = tamanho em cena (unidades do palco, que tem 900 de altura) · olha = para onde a
// imagem olha ('esq' | 'dir' | 'frente') · voa = flutua mesmo parado · fundo = objeto grande, fica atrás de todos ·
// veiculo = em vez de ação, "parado ou em movimento"
const CATALOGO_BASE = [
  // personagens
  { id: 'menina', nome: 'menina', tipo: 'personagem', img: 'menina.png', altura: 172, olha: 'frente', apelidos: ['garota', 'garotinha', 'menininha', 'princesa', 'filha', 'meninas'] },
  { id: 'menino', nome: 'menino', tipo: 'personagem', img: 'menino.png', altura: 172, olha: 'frente', apelidos: ['garoto', 'garotinho', 'menininho', 'príncipe', 'filho', 'meninos', 'moleque'] },
  { id: 'vovo', nome: 'vovó', tipo: 'personagem', img: 'vovo.png', altura: 168, olha: 'frente', apelidos: ['avó', 'vó', 'velhinha', 'vovozinha', 'senhora idosa'] },
  { id: 'cachorro', nome: 'cachorro', tipo: 'personagem', img: 'cachorro.png', altura: 118, olha: 'esq', apelidos: ['cachorrinho', 'cão', 'cãozinho', 'cadela', 'cachorra', 'totó', 'filhote', 'au-au', 'cachorros'] },
  { id: 'gato', nome: 'gato', tipo: 'personagem', img: 'gato.png', altura: 112, olha: 'esq', apelidos: ['gata', 'gatinho', 'gatinha', 'bichano', 'gatos'] },
  { id: 'dragao', nome: 'dragão', tipo: 'personagem', img: 'dragao.png', altura: 236, olha: 'esq', apelidos: ['dragãozinho', 'dragoa', 'dragões', 'bicho que cospe fogo'] },
  { id: 'robo', nome: 'robô', tipo: 'personagem', img: 'robo.png', altura: 176, olha: 'frente', apelidos: ['robozinho', 'androide', 'robôs'] },
  { id: 'alienigena', nome: 'alienígena', tipo: 'personagem', img: 'alienigena.png', altura: 160, olha: 'frente', apelidos: ['ET', 'E.T.', 'extraterrestre', 'marciano', 'homenzinho verde', 'alien', 'alienígenas'] },
  { id: 'fantasma', nome: 'fantasma', tipo: 'personagem', img: 'fantasma.png', altura: 150, olha: 'frente', voa: true, apelidos: ['fantasminha', 'assombração', 'fantasmas'] },
  { id: 'pirata', nome: 'pirata', tipo: 'personagem', img: 'pirata.png', altura: 180, olha: 'frente', apelidos: ['capitão pirata', 'corsário', 'piratas', 'capitão'] },
  { id: 'astronauta', nome: 'astronauta', tipo: 'personagem', img: 'astronauta.png', altura: 178, olha: 'frente', apelidos: ['cosmonauta', 'astronautas'] },
  { id: 'sereia', nome: 'sereia', tipo: 'personagem', img: 'sereia.png', altura: 176, olha: 'frente', apelidos: ['sereiazinha', 'sereias'] },
  { id: 'unicornio', nome: 'unicórnio', tipo: 'personagem', img: 'unicornio.png', altura: 160, olha: 'esq', apelidos: ['cavalo com chifre', 'unicórnios'] },
  { id: 'dinossauro', nome: 'dinossauro', tipo: 'personagem', img: 'dinossauro.png', altura: 214, olha: 'esq', apelidos: ['dino', 'tiranossauro', 'T-rex', 'dinossauros'] },
  { id: 'coruja', nome: 'coruja', tipo: 'personagem', img: 'coruja.png', altura: 112, olha: 'frente', apelidos: ['corujinha', 'mocho', 'corujas'] },
  { id: 'macaco', nome: 'macaco', tipo: 'personagem', img: 'macaco.png', altura: 128, olha: 'esq', apelidos: ['macaquinho', 'mico', 'macaca', 'chimpanzé', 'macacos'] },
  { id: 'leao', nome: 'leão', tipo: 'personagem', img: 'leao.png', altura: 150, olha: 'frente', apelidos: ['leoa', 'leãozinho', 'rei da selva', 'leões'] },
  { id: 'sapo', nome: 'sapo', tipo: 'personagem', img: 'sapo.png', altura: 96, olha: 'frente', apelidos: ['sapinho', 'rã', 'perereca', 'sapos'] },
  { id: 'pinguim', nome: 'pinguim', tipo: 'personagem', img: 'pinguim.png', altura: 120, olha: 'frente', apelidos: ['pinguinzinho', 'pinguins'] },
  { id: 'bruxa', nome: 'bruxa', tipo: 'personagem', img: 'bruxa.png', altura: 184, olha: 'frente', apelidos: ['bruxinha', 'feiticeira', 'bruxas'] },
  { id: 'mago', nome: 'mago', tipo: 'personagem', img: 'mago.png', altura: 186, olha: 'frente', apelidos: ['feiticeiro', 'bruxo', 'mágico', 'magos'] },
  { id: 'fada', nome: 'fada', tipo: 'personagem', img: 'fada.png', altura: 150, olha: 'frente', voa: true, apelidos: ['fadinha', 'fada-madrinha', 'fadas'] },
  { id: 'super_heroi', nome: 'super-herói', tipo: 'personagem', img: 'super_heroi.png', altura: 180, olha: 'frente', apelidos: ['super-heroína', 'herói', 'heroína', 'super-heróis'] },
  // objetos
  { id: 'castelo', nome: 'castelo', tipo: 'objeto', img: 'castelo.png', altura: 330, olha: 'frente', fundo: true, apelidos: ['palácio', 'castelos'] },
  { id: 'casa', nome: 'casa', tipo: 'objeto', img: 'casa.png', altura: 250, olha: 'frente', fundo: true, apelidos: ['casinha', 'cabana', 'casas'] },
  { id: 'arvore', nome: 'árvore', tipo: 'objeto', img: 'arvore.png', altura: 300, olha: 'frente', fundo: true, apelidos: ['arvorezinha', 'árvores', 'macieira', 'pé de manga'] },
  { id: 'palmeira', nome: 'palmeira', tipo: 'objeto', img: 'palmeira.png', altura: 320, olha: 'frente', fundo: true, apelidos: ['coqueiro', 'palmeiras', 'coqueiros'] },
  { id: 'barco', nome: 'barco', tipo: 'objeto', img: 'barco.png', altura: 210, olha: 'frente', fundo: true, veiculo: ['parado', 'andando'], apelidos: ['barquinho', 'navio', 'veleiro', 'caravela', 'canoa', 'barcos'] },
  { id: 'foguete', nome: 'foguete', tipo: 'objeto', img: 'foguete.png', altura: 240, olha: 'frente', fundo: true, veiculo: ['parado', 'voando'], apelidos: ['nave espacial', 'espaçonave', 'nave', 'foguetes'] },
  { id: 'disco_voador', nome: 'disco voador', tipo: 'objeto', img: 'disco_voador.png', altura: 170, olha: 'frente', fundo: true, veiculo: ['parado', 'voando'], apelidos: ['OVNI', 'nave alienígena', 'discos voadores'] },
  { id: 'carro', nome: 'carro', tipo: 'objeto', img: 'carro.png', altura: 130, olha: 'esq', veiculo: ['parado', 'andando', 'correndo'], apelidos: ['carrinho', 'automóvel', 'carros', 'táxi'] },
  { id: 'bolo', nome: 'bolo', tipo: 'objeto', img: 'bolo.png', altura: 96, olha: 'frente', apelidos: ['bolinho', 'torta', 'bolo de aniversário', 'bolos'] },
  { id: 'presente', nome: 'presente', tipo: 'objeto', img: 'presente.png', altura: 88, olha: 'frente', apelidos: ['caixa de presente', 'embrulho', 'presentes'] },
  { id: 'bau', nome: 'baú de tesouro', tipo: 'objeto', img: 'bau.svg', altura: 96, olha: 'frente', apelidos: ['baú', 'tesouro', 'arca do tesouro', 'baús'] },
  { id: 'balao', nome: 'balão', tipo: 'objeto', img: 'balao.png', altura: 150, olha: 'frente', voa: true, apelidos: ['bexiga', 'balões', 'bola de gás'] },
  { id: 'flor', nome: 'flor', tipo: 'objeto', img: 'flor.png', altura: 92, olha: 'frente', apelidos: ['flores', 'florzinha', 'girassol', 'tulipa', 'rosa', 'margarida'] },
  { id: 'cogumelo', nome: 'cogumelo', tipo: 'objeto', img: 'cogumelo.png', altura: 78, olha: 'frente', apelidos: ['cogumelos'] },
  { id: 'boneco_neve', nome: 'boneco de neve', tipo: 'objeto', img: 'boneco_neve.png', altura: 160, olha: 'frente', apelidos: ['bonecos de neve'] },
];

// ---------- os lugares (cenários desenhados na tela) e o resto da lista fechada ----------
const LUGARES = [
  { id: 'praia', nome: 'Praia', icone: '🏖️', desc: 'praia ou mar: beira-mar, areia, ondas, ilha, ilha do tesouro, navegando no mar, conchinhas' },
  { id: 'floresta', nome: 'Floresta', icone: '🌳', desc: 'floresta: mata, bosque, selva, trilha no meio das árvores' },
  { id: 'cidade', nome: 'Cidade', icone: '🏙️', desc: 'cidade: rua, avenida, prédios, praça, loja, trânsito' },
  { id: 'espaco', nome: 'Espaço', icone: '🪐', desc: 'espaço sideral: lá em cima, entre as estrelas, outro planeta, a Lua, Marte' },
  { id: 'fundo_do_mar', nome: 'Fundo do mar', icone: '🐠', desc: 'fundo do mar: debaixo d’água, mergulhando até o fundo, recife de corais, peixes lá embaixo' },
  { id: 'castelo', nome: 'Castelo', icone: '🏰', desc: 'castelo: reino, palácio, torre da princesa, salão do rei' },
  { id: 'deserto', nome: 'Deserto', icone: '🏜️', desc: 'deserto: dunas de areia sem mar, oásis, cactos, camelos' },
  { id: 'montanha_nevada', nome: 'Montanha nevada', icone: '🏔️', desc: 'montanha nevada: pico gelado, Polo Norte, Polo Sul, geleira, iglu, pista de esqui' },
  { id: 'fazenda', nome: 'Fazenda', icone: '🐄', desc: 'fazenda: sítio, roça, celeiro, curral, horta, plantação, campo com vacas e galinhas' },
  { id: 'escola', nome: 'Escola', icone: '🏫', desc: 'escola: sala de aula, recreio, aula, professora, lousa' },
  { id: 'quarto', nome: 'Quarto', icone: '🛏️', desc: 'quarto ou dentro de casa: cama, sala, cozinha, hora de dormir em casa' },
];
const HORAS = [
  { id: 'amanhecer', nome: 'Amanhecer', icone: '🌅', desc: 'amanhecer: nascer do sol, de manhãzinha, bem cedo, o galo cantou' },
  { id: 'dia', nome: 'Dia', icone: '☀️', desc: 'dia: manhã, meio-dia, tarde, dia de sol, dia claro, no dia seguinte, outro dia' },
  { id: 'entardecer', nome: 'Entardecer', icone: '🌇', desc: 'entardecer: fim de tarde, pôr do sol, o sol se pondo, anoitecendo' },
  { id: 'noite', nome: 'Noite', icone: '🌙', desc: 'noite: de noite, meia-noite, lua no céu, céu escuro, hora de dormir' },
];
const CLIMAS = [
  { id: 'limpo', nome: 'Tempo bom', icone: '🌤️', desc: 'tempo bom: céu limpo, sol brilhando, céu estrelado, a chuva ou a neve parou, o céu abriu' },
  { id: 'nublado', nome: 'Nublado', icone: '☁️', desc: 'nublado: céu cinza, muitas nuvens, sem chuva' },
  { id: 'chuva', nome: 'Chuva', icone: '🌧️', desc: 'chuva: chuvinha, garoa, começou a chover, pingos' },
  { id: 'tempestade', nome: 'Tempestade', icone: '⛈️', desc: 'tempestade: trovão, raio, relâmpago, temporal' },
  { id: 'neve', nome: 'Neve', icone: '❄️', desc: 'neve: nevando, flocos de neve, nevasca, tudo branco de neve' },
  { id: 'vento', nome: 'Ventania', icone: '🌬️', desc: 'ventania: vento forte, começou a ventar, ventou muito, folhas voando, furacão' },
  { id: 'arco_iris', nome: 'Arco-íris', icone: '🌈', desc: 'arco-íris no céu' },
];
const HUMORES = [
  { id: 'alegre', nome: 'Alegre', icone: '😄', desc: 'alegre: feliz, festa, brincadeira, aventura animada, amizade, surpresa boa ou mágica (neve na praia, um presente)' },
  { id: 'suspense', nome: 'Suspense', icone: '😨', desc: 'suspense: medo, perigo, mistério, algo assustador chegando (uma surpresa boa não é suspense)' },
  { id: 'triste', nome: 'Triste', icone: '😢', desc: 'triste: choro, saudade, perdeu alguma coisa, sozinho' },
  { id: 'engracado', nome: 'Engraçado', icone: '🤪', desc: 'engraçado: trapalhada, piada, coisa boba, todo mundo riu' },
  { id: 'calmo', nome: 'Calmo', icone: '😌', desc: 'calmo: tranquilo, sossego, paz, hora de dormir, apreciando a paisagem' },
];
const ACOES = [
  { id: 'parado', nome: 'parado', icone: '🙂', desc: 'parado: em pé, sentado, olhando, conversando, esperando, acabou de chegar ou aparecer' },
  { id: 'andando', nome: 'andando', icone: '🚶', desc: 'andando: caminhando, passeando, indo a pé para algum lugar, explorando' },
  { id: 'correndo', nome: 'correndo', icone: '🏃', desc: 'correndo: corrida, fugindo, apressado, correndo atrás de algo' },
  { id: 'pulando', nome: 'pulando', icone: '🤸', desc: 'pulando: saltando, quicando, pulando de alegria, brincando, pulando corda' },
  { id: 'voando', nome: 'voando', icone: '🕊️', desc: 'voando: no ar, planando, flutuando, subindo para o céu, voando de vassoura' },
  { id: 'nadando', nome: 'nadando', icone: '🏊', desc: 'nadando: na água, mergulhando, boiando, nadando no mar' },
  { id: 'dormindo', nome: 'dormindo', icone: '😴', desc: 'dormindo: dormiu, cochilando, roncando, deitado de olhos fechados, sonhando' },
  { id: 'dancando', nome: 'dançando', icone: '💃', desc: 'dançando: dança, girando ao som de música, festa com música' },
  { id: 'chorando', nome: 'chorando', icone: '😭', desc: 'chorando: chorou, lágrimas, soluçando, muito triste' },
  { id: 'rindo', nome: 'rindo', icone: '😂', desc: 'rindo: riu, gargalhada, achou muita graça, sorrindo de orelha a orelha' },
  { id: 'com_medo', nome: 'com medo', icone: '😱', desc: 'com medo: assustado, tremendo, apavorado, se escondendo' },
  { id: 'bravo', nome: 'bravo', icone: '😠', desc: 'bravo: zangado, irritado, furioso, rugindo, cara feia, soltando fogo de raiva' },
  { id: 'comendo', nome: 'comendo', icone: '😋', desc: 'comendo: comeu, mastigando, lambendo, provando comida, adora bolo ou doce' },
];
const MOVIMENTOS = {
  parado: 'parado: estacionado, pousado no chão, ancorado, esperando',
  andando: 'em movimento devagar: andando, passeando, navegando, velejando, indo para algum lugar',
  correndo: 'em alta velocidade: correndo, acelerando, numa corrida, fugindo',
  voando: 'voando: decolou, subiu, pairando no céu, cruzando o céu ou o espaço',
};

// +200 coisas do mundo real e +200 do Minecraft (catalogo-real.mjs / catalogo-minecraft.mjs).
// Elas entram no mesmo catálogo: a história pode citar "creeper", "ambulância", "enderman"…
const CATALOGO = [...CATALOGO_BASE, ...CATALOGO_EXTRA];

const POR_ID = Object.fromEntries(CATALOGO.map((c) => [c.id, c]));
const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// palavras que contam como "citou este personagem" (a tela usa para perguntar a ação de quem acabou de chegar)
const PALAVRAS = Object.fromEntries(CATALOGO.map((c) => [c.id, [c.nome, ...c.apelidos].map((p) => semAcento(p).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()).filter((p) => p.length >= 2)]));
function citados(texto) {
  const t = ' ' + semAcento(texto).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  return CATALOGO.filter((c) => PALAVRAS[c.id].some((p) => t.includes(' ' + p + ' '))).map((c) => c.id);
}
const nomeDe = (lista, id) => (lista.find((x) => x.id === id) || {}).nome;
const valido = (lista, id) => lista.some((x) => x.id === id);

// limpa o que a página mandou: só ids que existem
function lerCena(d) {
  const c = d && typeof d.cena === 'object' && d.cena ? d.cena : {};
  const elenco = (Array.isArray(d && d.elenco) ? d.elenco : []).filter((e) => e && POR_ID[e.id]).slice(0, 16)
    .map((e) => ({ id: e.id, acao: valido(ACOES, e.acao) || (POR_ID[e.id].veiculo || []).includes(e.acao) ? e.acao : 'parado' }));
  return {
    lugar: valido(LUGARES, c.lugar) ? c.lugar : null,
    hora: valido(HORAS, c.hora) ? c.hora : 'dia',
    clima: valido(CLIMAS, c.clima) ? c.clima : 'limpo',
    elenco,
  };
}

const opcoesComManter = (lista, atual, oQue) => [
  ...lista.map((x) => ({ id: x.id, desc: x.desc })),
  { id: 'manter', desc: `manter: o trecho mais recente não diz ${oQue}, ou continua igual (agora: ${atual})` },
];

// ---------- testes (trechos de história com o esperado; rodam no Jev de verdade com tools/testar.mjs) ----------
const cena = (lugar, hora = 'dia', clima = 'limpo') => ({ lugar, hora, clima });
const elenco = (...pares) => pares.map(([id, acao]) => ({ id, acao }));
const T = (titulo, historia, novo, c, el, esperado) => ({ titulo, jogada: 'cena', dados: { historia, novo, cena: c, elenco: el }, esperado });
const H1 = 'Era uma vez uma menina que morava numa fazenda com o seu cachorro.';
const H2 = H1 + ' Num dia de sol, os dois foram passear na praia.';
const H3 = H2 + ' O cachorro corria atrás das ondas e a menina ria sem parar.';
const H4 = H3 + ' De repente, começou a nevar!';
const H5 = H4 + ' Os dois fizeram um boneco de neve e dançaram de alegria.';
const H6 = H5 + ' Quando a noite chegou, apareceu um dragão enorme! A menina ficou com medo.';
const H7 = H6 + ' Mas o dragão era bonzinho, e adorava comer bolo!';
const H8 = H7 + ' A neve parou, o céu se encheu de estrelas e todos dormiram felizes. Fim!';
const TESTES = [
  // a história da demonstração, passo a passo (com as duas viradas)
  T('começa na fazenda', H1, H1, cena(null), [], { cenario: 'fazenda', p_menina: true, p_cachorro: true, p_gato: false, p_dragao: false, acao_menina: ['parado', 'andando'] }),
  T('vão para a praia', H2, 'Num dia de sol, os dois foram passear na praia.', cena('fazenda'), elenco(['menina', 'parado'], ['cachorro', 'parado']), { cenario: 'praia', hora: ['dia', 'manter'], clima: ['limpo', 'manter'], acao_menina: 'andando', acao_cachorro: 'andando' }),
  T('o cachorro corre, a menina ri', H3, 'O cachorro corria atrás das ondas e a menina ria sem parar.', cena('praia'), elenco(['menina', 'andando'], ['cachorro', 'andando']), { acao_cachorro: 'correndo', acao_menina: 'rindo', humor: ['alegre', 'engracado'], cenario: ['praia', 'manter'] }),
  T('virada: neve na praia', H4, 'De repente, começou a nevar!', cena('praia'), elenco(['menina', 'rindo'], ['cachorro', 'correndo']), { clima: 'neve', cenario: ['praia', 'manter'], hora: ['dia', 'manter'], p_menina: true, p_cachorro: true, p_boneco_neve: false }),
  T('boneco de neve e dança', H5, 'Os dois fizeram um boneco de neve e dançaram de alegria.', cena('praia', 'dia', 'neve'), elenco(['menina', 'rindo'], ['cachorro', 'correndo']), { p_boneco_neve: true, acao_menina: 'dancando', acao_cachorro: 'dancando', humor: 'alegre', clima: ['neve', 'manter'] }),
  T('a noite chega com um dragão', H6, 'Quando a noite chegou, apareceu um dragão enorme! A menina ficou com medo.', cena('praia', 'dia', 'neve'), elenco(['menina', 'dancando'], ['cachorro', 'dancando'], ['boneco_neve', 'parado']), { hora: 'noite', p_dragao: true, acao_menina: 'com_medo', humor: 'suspense', clima: ['neve', 'manter'], cenario: ['praia', 'manter'] }),
  T('virada: o dragão é bonzinho e come bolo', H7, 'Mas o dragão era bonzinho, e adorava comer bolo!', cena('praia', 'noite', 'neve'), elenco(['menina', 'com_medo'], ['cachorro', 'dancando'], ['boneco_neve', 'parado'], ['dragao', 'parado']), { acao_dragao: 'comendo', p_bolo: true, p_dragao: true, humor: ['alegre', 'engracado'] }),
  T('todos dormem sob as estrelas', H8, 'A neve parou, o céu se encheu de estrelas e todos dormiram felizes. Fim!', cena('praia', 'noite', 'neve'), elenco(['menina', 'com_medo'], ['cachorro', 'dancando'], ['boneco_neve', 'parado'], ['dragao', 'comendo'], ['bolo', 'parado']), { acao_menina: 'dormindo', acao_cachorro: 'dormindo', acao_dragao: 'dormindo', clima: 'limpo', humor: 'calmo', hora: ['noite', 'manter'] }),
  // correções no meio da frase e saídas de cena
  T('correção: era um cachorro, não um gato', 'Era uma vez um gato… não, pera, era um cachorro!', 'Era uma vez um gato… não, pera, era um cachorro!', cena(null), [], { p_gato: false, p_cachorro: true }),
  T('correção: deserto, não floresta', 'O menino e o leão foram para a floresta… não, pera, para o deserto!', 'O menino e o leão foram para a floresta… não, pera, para o deserto!', cena(null), [], { cenario: 'deserto', p_menino: true, p_leao: true }),
  T('o dragão vai embora', 'O dragão brincou com a menina o dia todo. Depois, o dragão voou para longe e nunca mais voltou.', 'Depois, o dragão voou para longe e nunca mais voltou.', cena('castelo'), elenco(['menina', 'pulando'], ['dragao', 'pulando']), { p_dragao: false, p_menina: true, cenario: ['manter', 'castelo'] }),
  T('o fantasma some', 'O fantasma assustou todo mundo no castelo. Mas quando o sol nasceu, o fantasma sumiu.', 'Mas quando o sol nasceu, o fantasma sumiu.', cena('castelo', 'noite'), elenco(['fantasma', 'voando'], ['menino', 'com_medo']), { p_fantasma: false, hora: 'amanhecer', p_menino: true }),
  T('a ventania leva o balão', 'A menina segurava um balão vermelho. Começou a ventar muito forte e o balão voou para longe.', 'Começou a ventar muito forte e o balão voou para longe.', cena('cidade'), elenco(['menina', 'parado'], ['balao', 'parado']), { clima: 'vento', p_balao: false, p_menina: true }),
  // lugares
  T('foguete até o espaço', 'Um menino entrou num foguete e voou até o espaço.', 'Um menino entrou num foguete e voou até o espaço.', cena(null), [], { cenario: 'espaco', p_menino: true, p_foguete: true, mov_foguete: 'voando', acao_menino: 'voando' }),
  T('um E.T. dançando', 'Um menino entrou num foguete e voou até o espaço. Lá ele encontrou um E.T. que dançava perto do disco voador.', 'Lá ele encontrou um E.T. que dançava perto do disco voador.', cena('espaco'), elenco(['menino', 'voando'], ['foguete', 'voando']), { p_alienigena: true, p_disco_voador: true, acao_alienigena: 'dancando', cenario: ['espaco', 'manter'] }),
  T('a astronauta na Lua', 'A astronauta pousou na Lua e saiu pulando pela poeira.', 'A astronauta pousou na Lua e saiu pulando pela poeira.', cena(null), [], { cenario: 'espaco', p_astronauta: true, acao_astronauta: 'pulando' }),
  T('fundo do mar', 'No fundo do mar, uma sereia nadava com um pinguim.', 'No fundo do mar, uma sereia nadava com um pinguim.', cena(null), [], { cenario: 'fundo_do_mar', p_sereia: true, p_pinguim: true, acao_sereia: 'nadando', acao_pinguim: 'nadando' }),
  T('o pirata acha um tesouro na ilha', 'Um pirata achou um baú de tesouro numa ilha.', 'Um pirata achou um baú de tesouro numa ilha.', cena(null), [], { cenario: 'praia', p_pirata: true, p_bau: true, p_barco: false }),
  T('o macaco navega', 'O macaco subiu num barco e saiu navegando pelo mar.', 'O macaco subiu num barco e saiu navegando pelo mar.', cena('praia'), [], { p_barco: true, mov_barco: 'andando', cenario: ['praia', 'manter'] }),
  T('tempestade na floresta', 'Era noite na floresta e caiu uma tempestade. Um fantasma apareceu e a coruja ficou com medo.', 'Era noite na floresta e caiu uma tempestade. Um fantasma apareceu e a coruja ficou com medo.', cena(null), [], { cenario: 'floresta', hora: 'noite', clima: 'tempestade', p_fantasma: true, p_coruja: true, acao_coruja: 'com_medo', humor: 'suspense' }),
  T('a bruxa de vassoura', 'Numa noite de lua cheia, uma bruxa passou voando de vassoura por cima da floresta.', 'Numa noite de lua cheia, uma bruxa passou voando de vassoura por cima da floresta.', cena(null), [], { cenario: 'floresta', hora: 'noite', p_bruxa: true, p_mago: false, acao_bruxa: 'voando' }),
  T('hora de dormir no quarto', 'À noite, o menino deitou na cama do seu quarto e dormiu.', 'À noite, o menino deitou na cama do seu quarto e dormiu.', cena(null), [], { cenario: 'quarto', hora: 'noite', acao_menino: 'dormindo', humor: 'calmo' }),
  T('no dia seguinte, a escola', 'À noite, o menino deitou na cama do seu quarto e dormiu. No dia seguinte, ele foi para a escola.', 'No dia seguinte, ele foi para a escola.', cena('quarto', 'noite'), elenco(['menino', 'dormindo']), { cenario: 'escola', hora: ['dia', 'amanhecer'], acao_menino: 'andando', p_menino: true }),
  T('o robô passeia na cidade', 'O robô passeava pela cidade cheia de prédios.', 'O robô passeava pela cidade cheia de prédios.', cena(null), [], { cenario: 'cidade', p_robo: true, acao_robo: 'andando' }),
  T('o leão no deserto', 'O leão atravessava o deserto debaixo de um sol quente.', 'O leão atravessava o deserto debaixo de um sol quente.', cena(null), [], { cenario: 'deserto', p_leao: true, acao_leao: 'andando', hora: ['dia', 'manter'], clima: ['limpo', 'manter'] }),
  T('pinguins na montanha', 'Os pinguins escorregavam pela montanha cheia de neve.', 'Os pinguins escorregavam pela montanha cheia de neve.', cena(null), [], { cenario: 'montanha_nevada', p_pinguim: true }),
  T('amanhecer na fazenda', 'O galo cantou e o sol nasceu na fazenda. A vovó acordou e foi dar comida para os bichos.', 'O galo cantou e o sol nasceu na fazenda. A vovó acordou e foi dar comida para os bichos.', cena(null), [], { hora: 'amanhecer', cenario: 'fazenda', p_vovo: true, acao_vovo: 'andando' }),
  T('o unicórnio e o castelo da princesa', 'Um unicórnio voava em volta do castelo da princesa.', 'Um unicórnio voava em volta do castelo da princesa.', cena(null), [], { cenario: 'castelo', p_unicornio: true, p_menina: true, acao_unicornio: 'voando' }),
  T('o super-herói salva a cidade', 'Um super-herói chegou voando para salvar a cidade.', 'Um super-herói chegou voando para salvar a cidade.', cena(null), [], { cenario: 'cidade', p_super_heroi: true, acao_super_heroi: 'voando' }),
  T('festa no castelo', 'No castelo, o mago e a fada fizeram uma festa e dançaram a noite toda.', 'No castelo, o mago e a fada fizeram uma festa e dançaram a noite toda.', cena(null), [], { cenario: 'castelo', acao_mago: 'dancando', acao_fada: 'dancando', p_mago: true, p_fada: true }),
  // tempo e hora
  T('o arco-íris depois da chuva', 'Choveu a tarde inteira na fazenda. Então a chuva parou e apareceu um arco-íris.', 'Então a chuva parou e apareceu um arco-íris.', cena('fazenda', 'dia', 'chuva'), [], { clima: 'arco_iris', cenario: ['fazenda', 'manter'] }),
  T('a chuva para', 'Choveu muito na cidade. Depois a chuva parou e o sol voltou a brilhar.', 'Depois a chuva parou e o sol voltou a brilhar.', cena('cidade', 'dia', 'chuva'), elenco(['menino', 'parado']), { clima: 'limpo', cenario: ['cidade', 'manter'] }),
  T('o céu fica nublado', 'Na fazenda, o céu foi ficando cinza e cheio de nuvens.', 'Na fazenda, o céu foi ficando cinza e cheio de nuvens.', cena('fazenda'), [], { clima: 'nublado', cenario: ['fazenda', 'manter'] }),
  T('o pôr do sol', 'O pirata e o macaco remaram até a praia. No fim da tarde, o sol foi se pondo no mar.', 'No fim da tarde, o sol foi se pondo no mar.', cena('praia'), elenco(['pirata', 'andando'], ['macaco', 'andando']), { hora: 'entardecer', cenario: ['praia', 'manter'], p_pirata: true, p_macaco: true }),
  // ações e clima da cena
  T('a vovó fez um bolo', 'A vovó fez um bolo de chocolate e todo mundo comeu.', 'A vovó fez um bolo de chocolate e todo mundo comeu.', cena('quarto'), elenco(['vovo', 'parado'], ['menino', 'parado']), { p_bolo: true, p_vovo: true, acao_menino: 'comendo', acao_vovo: 'comendo' }),
  T('a trapalhada do macaco', 'Na floresta, o macaco escorregou numa casca de banana e todo mundo riu.', 'Na floresta, o macaco escorregou numa casca de banana e todo mundo riu.', cena('floresta'), elenco(['macaco', 'andando'], ['sapo', 'parado']), { humor: 'engracado', acao_sapo: 'rindo', cenario: ['floresta', 'manter'] }),
  T('a menina chora', 'A menina ganhou um presente, mas o cachorro rasgou tudo e ela começou a chorar.', 'A menina ganhou um presente, mas o cachorro rasgou tudo e ela começou a chorar.', cena('quarto'), [], { acao_menina: 'chorando', humor: 'triste', p_menina: true, p_cachorro: true }),
  T('o gato fica bravo', 'O gato estava dormindo no quarto. O cachorro latiu, acordou o gato e o gato ficou muito bravo.', 'O cachorro latiu, acordou o gato e o gato ficou muito bravo.', cena('quarto'), elenco(['gato', 'dormindo']), { acao_gato: 'bravo', p_gato: true, p_cachorro: true }),
  T('o dragão furioso', 'Um dragão vivia na montanha nevada. Quando o pirata tentou roubar o seu tesouro, o dragão ficou furioso e soltou fogo.', 'Quando o pirata tentou roubar o seu tesouro, o dragão ficou furioso e soltou fogo.', cena('montanha_nevada'), elenco(['dragao', 'parado']), { acao_dragao: 'bravo', humor: 'suspense', p_pirata: true }),
  T('o dinossauro acha um presente', 'Um dinossauro achou um presente na floresta e pulou de alegria.', 'Um dinossauro achou um presente na floresta e pulou de alegria.', cena(null), [], { cenario: 'floresta', p_dinossauro: true, p_presente: true, acao_dinossauro: 'pulando' }),
  T('corrida de carro', 'O menino e o macaco apostaram corrida de carro pela cidade.', 'O menino e o macaco apostaram corrida de carro pela cidade.', cena(null), [], { cenario: 'cidade', p_carro: true, mov_carro: 'correndo' }),
  // fala de verdade (sem pontuação), frase pela metade e nada novo
  T('fala sem pontuação', 'era uma vez um robô que morava na cidade um dia ele encontrou um gatinho na rua e os dois saíram correndo', 'um dia ele encontrou um gatinho na rua e os dois saíram correndo', cena('cidade'), elenco(['robo', 'parado']), { p_gato: true, p_robo: true, acao_gato: 'correndo', acao_robo: 'correndo' }),
  T('frase pela metade', 'Era uma vez', 'Era uma vez', cena(null), [], { cenario: 'manter', p_menina: false, p_dragao: false, p_castelo: false }),
  T('nada novo: continuam brincando', 'Era um dia de sol na praia. A menina e o cachorro brincavam na areia. E eles continuaram brincando por muito tempo.', 'E eles continuaram brincando por muito tempo.', cena('praia'), elenco(['menina', 'pulando'], ['cachorro', 'pulando']), { cenario: ['praia', 'manter'], hora: ['dia', 'manter'], clima: ['limpo', 'manter'], p_menina: true, p_cachorro: true }),
];

export default {
  id: 'cena-nasce',
  titulo: 'Fale e a Cena Nasce',
  emoji: '🎬',
  categoria: 'ao-vivo',
  ordem: 0.4,
  resumo: 'Conte uma história em voz alta e ela vira um desenho animado na sua frente: o cenário, os personagens e o tempo mudam enquanto você fala.',
  descricao: 'A cada pausa da sua fala, uma chamada só ao Jev toma ~50 decisões em meio segundo: o lugar, a hora, o tempo, o clima da cena, quem está em cena (um sim ou não para cada um dos 38 personagens e objetos) e o que cada um faz. A cena acompanha a frase, inclusive quando você muda de ideia no meio, e só desenha o que existe na lista (gerar imagem com IA levaria de 10 a 30 s por quadro). Adapte trocando o catálogo: personagens do seu livro infantil, o cenário de uma aula ou os produtos de uma vitrine.',
  marcas: ['imediato', 'volume', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#38bdf8', acento2: '#a3e635' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone e conte uma história como para uma criança: diga onde ela acontece, quem aparece e o que cada um faz. No meio, mude tudo ("de repente começou a nevar!", "e chegou um dragão comilão") e veja a cena acompanhar.',
  },
  catalogo: CATALOGO,
  lugares: LUGARES, horas: HORAS, climas: CLIMAS, humores: HUMORES, acoes: ACOES,
  // quanto o Jev precisa ter de certeza para a tela mudar (o resto fica como está)
  limiar: { lugar: 0.45, hora: 0.45, clima: 0.45, humor: 0.4, entra: 0.6, sai: 0.35, acao: 0.3 },
  contexto: {
    jogo: 'uma pessoa conta uma história infantil em voz alta e ela vira desenho animado: a cada pausa da fala, o Jev decide a cena',
  },
  decisoes: [
    {
      id: 'cenario', tipo: 'choice', titulo: 'Lugar',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. Em que lugar a cena está AGORA? Quando a história cita um lugar onde os personagens estão, chegam, vão ou passam ("numa ilha", "pela cidade", "foi para a escola"), escolha esse lugar; vale o mais recente. Se a pessoa se corrigiu ("na floresta… não, pera, no deserto"), vale o que ela disse por último. O tempo não muda o lugar: neve, chuva ou noite na praia continua sendo praia. Escolha manter só quando o trecho mais recente não cita lugar nenhum.',

      opcoes: [...LUGARES.map((l) => ({ id: l.id, rotulo: l.nome, icone: l.icone, desc: l.desc })), { id: 'manter', rotulo: 'Manter', icone: '⏸️', desc: 'manter: o trecho mais recente não diz o lugar, ou a cena continua no mesmo lugar' }],
    },
    {
      id: 'hora', tipo: 'choice', titulo: 'Hora do dia',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. Que hora do dia é AGORA na história? Vale a última hora dita; se a pessoa se corrigiu, vale o que ela disse por último. "Dia de sol" é dia. Escolha manter quando o trecho mais recente não fala de hora.',
      opcoes: [...HORAS.map((h) => ({ id: h.id, rotulo: h.nome, icone: h.icone, desc: h.desc })), { id: 'manter', rotulo: 'Manter', icone: '⏸️', desc: 'manter: o trecho mais recente não diz a hora, ou continua igual' }],
    },
    {
      id: 'clima', tipo: 'choice', titulo: 'Tempo',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. Como está o tempo AGORA na história? Vale a última mudança de tempo dita; se a pessoa se corrigiu, vale o que ela disse por último. "Dia de sol" e "céu estrelado" são tempo bom; a noite chegar não muda o tempo. Escolha manter quando o trecho mais recente não fala do tempo.',
      opcoes: [...CLIMAS.map((c) => ({ id: c.id, rotulo: c.nome, icone: c.icone, desc: c.desc })), { id: 'manter', rotulo: 'Manter', icone: '⏸️', desc: 'manter: o trecho mais recente não fala do tempo, ou continua igual' }],
    },
    {
      id: 'humor', tipo: 'choice', titulo: 'Clima da cena',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. Qual é o clima emocional da cena AGORA, no trecho mais recente da história? Se a história virou ("parecia perigoso… mas era bonzinho"), vale o mais recente.',
      opcoes: HUMORES.map((h) => ({ id: h.id, rotulo: h.nome, icone: h.icone, desc: h.desc })),
    },
    {
      id: 'presente', tipo: 'noul', titulo: 'Está em cena?', limiar: 0.5,
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. A história fala do personagem ou objeto abaixo, e ele está na cena AGORA? Responda SIM só quando a história fala dele (pelo nome, por um dos outros nomes da lista, no plural ou como "ele/ela" que claramente é ele) e ele não saiu depois; ou quando ele já estava em cena antes deste trecho (lista ja_estavam_em_cena) e a história não diz que ele saiu. Quem o trecho mais recente acabou de citar ainda não está nessa lista e também é SIM. Responda NÃO quando a história nunca fala dele (é o caso da maioria dos personagens do catálogo), quando ele foi embora, sumiu, fugiu ou voou para longe, quando ele só aparece negado ("não tinha nenhum dragão") ou quando a pessoa se corrigiu ("era um gato… não, pera, era um cachorro" → o gato é NÃO): vale o que ela disse por último.',
    },
    {
      id: 'acao', tipo: 'choice', titulo: 'O que está fazendo',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. O que o personagem abaixo está fazendo AGORA? Decida nesta ordem: (1) se o trecho mais recente diz o que ele faz, vale isso; (2) se diz o que "todos", "todo mundo", "eles" ou "os dois" fazem, vale isso para ele também; (3) se não diz nada sobre ele, repita a ação que ele já faz na tela (escrita abaixo). Se a pessoa se corrigiu ("não, pera…"), vale o que ela disse por último. Gosto dito na história vira ação: quem adora bolo ou doce está comendo, quem adora música está dançando. Quem só chegou ou apareceu, sem fazer nada, está parado.',

      opcoes: ACOES.map((a) => ({ id: a.id, rotulo: a.nome, icone: a.icone, desc: a.desc })),
    },
    {
      id: 'movimento', tipo: 'choice', titulo: 'Veículo em movimento',
      pergunta: 'Esta é uma história infantil contada em voz alta, que vira desenho animado. O veículo abaixo está parado ou em movimento AGORA, no ponto mais recente da história? Vale a última coisa dita sobre ele (se a pessoa se corrigiu, vale o que ela disse por último). Se a história não diz nada novo sobre ele, repita o estado que ele tem na tela (escrito abaixo).',
      opcoes: Object.entries(MOVIMENTOS).map(([id, desc]) => ({ id, desc })),
    },
  ],
  jogadas: {
    // a cada pausa da fala: lugar, hora, tempo, clima + 1 "está em cena?" por item do catálogo + a ação de quem está na
    // tela (a página manda o elenco) ou acabou de ser citado (achado pelos apelidos)
    cena: {
      estado: (d) => {
        const c = lerCena(d);
        const historia = corta(d.historia, 900);
        return {
          historia,
          trecho_mais_recente: corta(d.novo || historia, 260),
          cena_antes_deste_trecho: {
            lugar: c.lugar ? nomeDe(LUGARES, c.lugar) : 'nenhum ainda',
            hora: nomeDe(HORAS, c.hora),
            tempo: nomeDe(CLIMAS, c.clima),
            ja_estavam_em_cena: c.elenco.map((e) => `${POR_ID[e.id].nome} (${(ACOES.find((a) => a.id === e.acao) || { nome: e.acao }).nome})`),
          },
        };
      },
      perguntas: (d) => {
        const c = lerCena(d);
        const naTela = new Set(c.elenco.map((e) => e.id));
        const acaoDe = Object.fromEntries(c.elenco.map((e) => [e.id, e.acao]));
        const recentes = citados(corta(d.historia, 500));
        const qs = [
          { chave: 'cenario', decisao: 'cenario', opcoes: opcoesComManter(LUGARES, c.lugar ? nomeDe(LUGARES, c.lugar) : 'nenhum lugar ainda', 'o lugar') },
          { chave: 'hora', decisao: 'hora', opcoes: opcoesComManter(HORAS, nomeDe(HORAS, c.hora), 'a hora') },
          { chave: 'clima', decisao: 'clima', opcoes: opcoesComManter(CLIMAS, nomeDe(CLIMAS, c.clima), 'o tempo') },
          { chave: 'humor', decisao: 'humor' },
        ];
        // "está em cena?" só para quem pode estar: citado na história ou já na tela.
        // Com 460 itens no catálogo, perguntar de todos estouraria a chamada (e o custo) sem ganho:
        // item nunca citado e fora da tela é NÃO por definição, e essa resposta sai local (sem gastar token).
        const citadosNaHistoria = new Set(citados(corta(d.historia, 900)));
        for (const it of CATALOGO) {
          if (!naTela.has(it.id) && !citadosNaHistoria.has(it.id)) {
            qs.push({ chave: 'p_' + it.id, decisao: 'presente', local: { type: 'noul', noul: 0 } });
            continue;
          }
          qs.push({ chave: 'p_' + it.id, decisao: 'presente', alvo: `${it.tipo === 'personagem' ? 'Personagem' : 'Objeto'}: ${it.nome} (também vale: ${it.apelidos.join(', ')}).` });
        }
        // ação: só de quem está na tela ou foi citado agora (no máximo 10 personagens e 4 veículos)
        const quem = [...new Set([...c.elenco.map((e) => e.id), ...recentes])];
        quem.filter((id) => POR_ID[id].tipo === 'personagem').slice(0, 10).forEach((id) => {
          const it = POR_ID[id];
          const agora = naTela.has(id) ? (ACOES.find((a) => a.id === acaoDe[id]) || ACOES[0]).nome : 'ainda não está na tela (acabou de ser citado)';
          qs.push({ chave: 'acao_' + id, decisao: 'acao', alvo: `Personagem: ${it.nome} (também vale: ${it.apelidos.join(', ')}). O que ele faz na tela agora: ${agora}.` });
        });
        quem.filter((id) => POR_ID[id].veiculo).slice(0, 4).forEach((id) => {
          const it = POR_ID[id];
          const agora = naTela.has(id) ? acaoDe[id] : 'ainda não está na tela';
          qs.push({ chave: 'mov_' + id, decisao: 'movimento', opcoes: it.veiculo.map((m) => ({ id: m, desc: MOVIMENTOS[m] })), alvo: `Veículo: ${it.nome} (também vale: ${it.apelidos.join(', ')}). Estado na tela agora: ${agora}.` });
        });
        return qs;
      },
    },
  },
  testes: TESTES,
};

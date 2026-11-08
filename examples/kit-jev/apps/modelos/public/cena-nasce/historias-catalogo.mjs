// Expande as 100+ histórias em itens de catálogo: personagens, animais, acessórios e roupas.
// Cada personagem vira um corpo desenhado (arquétipo) com identidade própria (cor da roupa),
// cada animal vira a figurinha recortada, e os objetos da história entram como adereços.
import { HISTORIAS, ARQUETIPOS, ehAnimal, emojiDe } from './historias-100.mjs';

// arquétipo → corpo desenhado de bonecos.js
export const ARQ_CORPO = {
  crianca_f: 'menina',
  crianca_m: 'menino',
  princesa: 'menina',
  principe: 'menino',
  rainha: 'vovo',
  rei: 'apresentador',
  velho: 'mago',
  idosa: 'vovo',
  bruxa: 'bruxa',
  fada: 'fada',
  campones: 'aldeao',
  cacador: 'guerreiro',
  guerreiro: 'guerreiro',
  mago: 'mago',
  gigante: 'aldeao',
  anao: 'aldeao',
  sereia: 'sereia',
  criatura: 'fantasma',
  pirata: 'pirata',
  robo: 'robo',
  astronauta: 'astronauta',
  heroi: 'heroi',
  sapo: 'sapo',
  unicornio: 'unicornio',
  esqueleto: 'esqueleto',
  zumbi: 'zumbi',
  aldeao: 'aldeao',
  leao: 'leao',
  barco: 'barco',
};

// emojis sem arquivo no repo trocados por equivalentes existentes
export const EMOJI_ALT = {
  '🐽': '🐷',
  '🐱': '🐈',
  '🐀': '🐭',
  '🐁': '🐭',
  '🧿': '🧶',
};

export const codigoEmoji = (e) =>
  [...(EMOJI_ALT[e] || e)].map((c) => c.codePointAt(0).toString(16)).filter((x) => x !== 'fe0f').join('-');

// id de corpo por personagem, para o COMPOSTO de bonecos.js
export const CORPO_POR_ID = {};

const vistos = new Set();
const itens = [];

const limpa = (s) => String(s || '').trim();
// o motor só aceita chaves [a-z0-9_]: um id acentuado (ex.: "irmã_feia_1") invalida a jogada inteira
const slug = (s) => limpa(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

for (const [idHist, titulo, origem, cenario, elenco, objetos] of HISTORIAS) {
  for (const [idBruto, nome, arq, cor, ...apelidos] of elenco) {
    const id = slug(idBruto);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const animal = ehAnimal(arq);
    if (!animal) {
      const corpo = ARQ_CORPO[arq];
      if (!corpo) throw new Error(`história ${idHist}: arquétipo "${arq}" sem corpo mapeado`);
      CORPO_POR_ID[id] = corpo;
    }
    const a = ARQUETIPOS[arq];
    itens.push({
      id,
      nome,
      tipo: 'personagem',
      img: animal ? `emoji/${codigoEmoji(emojiDe(arq))}.svg` : `${ARQ_CORPO[arq] === 'menina' ? 'menina' : ARQ_CORPO[arq]}.png`,
      // animal sem arquétipo declarado entra com altura de bicho; humanoide, de gente
      altura: a ? a.altura : animal ? 110 : 172,
      olha: a ? a.olha : animal ? 'esq' : 'frente',
      historia: titulo,
      ...(cor ? { cor } : {}),
      apelidos: [...new Set([nome, ...apelidos.map(limpa).filter(Boolean), titulo])],
    });
  }
  for (const obj of objetos || []) {
    const idObj = 'h_' + slug(obj);
    if (idObj === 'h_' || vistos.has(idObj)) continue;
    vistos.add(idObj);
    itens.push({
      id: idObj,
      nome: obj,
      tipo: 'objeto',
      img: 'emoji/1f4e6.svg',
      altura: 96,
      olha: 'frente',
      historia: titulo,
      apelidos: [obj, titulo],
    });
  }
}

export const CATALOGO_HISTORIAS = itens;

// as próprias histórias, para o Jev saber de que conto a pessoa está falando
export const HISTORIAS_JEV = HISTORIAS.map(([id, titulo, origem, cenario, elenco]) => ({
  id,
  titulo,
  origem,
  cenario,
  elenco: elenco.map(([eid, nome]) => ({ id: slug(eid), nome })),
  apelidos: [titulo, titulo.replace(/^(os|as|o|a)\s+/i, '')],
}));

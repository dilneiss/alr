// Catálogo extra do "Fale e a Cena Nasce": 606 coisas do mundo real (em três lotes, o último
// só de objetos: comida, armas, ferramentas, música, brinquedos e casa) e 407 do Minecraft. As listas ficam em arquivos próprios para o
// app.config.mjs continuar legível; aqui só transformamos as linhas em objetos do catálogo.
import { MUNDO_REAL } from './catalogo-real.mjs';
import { MUNDO_REAL_2 } from './catalogo-real-2.mjs';
import { MUNDO_REAL_3 } from './catalogo-objetos.mjs';
import { MINECRAFT } from './catalogo-minecraft.mjs';
import { MINECRAFT_2 } from './catalogo-minecraft-2.mjs';
import { PERSONAGENS_100 } from './catalogo-personagens-100.mjs';
import { ANIMAIS_100 } from './catalogo-animais-100.mjs';
import { CASAS_100 } from './catalogo-casas-100.mjs';

// emoji → arquivo em assets/emoji/. O downloader (tools/baixar-emoji.mjs) usa esta mesma tabela.
export function codigoEmoji(e) {
  return [...e]
    .map((ch) => ch.codePointAt(0))
    .filter((cp) => cp !== 0xfe0f && cp !== 0xfe0e)   // seletor de variação não entra no nome do arquivo
    .map((cp) => cp.toString(16))
    .join('-');
}

const deLinha = ([id, nome, emoji, altura, olha, tipo, ...apelidos]) => ({
  id,
  nome,
  emoji,
  altura,
  olha,
  tipo,
  apelidos: [...new Set([nome, ...apelidos].map((a) => String(a).toLowerCase().trim()).filter(Boolean))],
  img: `emoji/${codigoEmoji(emoji)}.svg`,
});

const REAIS = [...MUNDO_REAL, ...MUNDO_REAL_2, ...MUNDO_REAL_3];
const MINECRAFTS = [...MINECRAFT, ...MINECRAFT_2];
const expandido = (linhas, extras = {}) => linhas.map((linha) => ({ ...deLinha(linha), ...extras }));

export const CATALOGO_EXTRA = [
  ...[...REAIS, ...MINECRAFTS].map(deLinha),
  ...expandido(PERSONAGENS_100),
  ...expandido(ANIMAIS_100, { animal: true }),
  ...expandido(CASAS_100, { fundo: true, casa: true }),
];

// grupos que a interface usa para filtrar/contar
export const GRUPOS_EXTRA = {
  real: REAIS.length,
  minecraft: MINECRAFTS.length,
  emojis: [...new Set(CATALOGO_EXTRA.map((item) => item.emoji).filter(Boolean))].map((emoji) => ({ emoji, codigo: codigoEmoji(emoji) })),
};

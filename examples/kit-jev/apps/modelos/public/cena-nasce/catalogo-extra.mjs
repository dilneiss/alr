// Catálogo extra do "Fale e a Cena Nasce": +400 coisas do mundo real e +400 do Minecraft,
// em quatro lotes (dois de cada tema). As listas ficam em arquivos próprios para o
// app.config.mjs continuar legível; aqui só transformamos as linhas em objetos do catálogo.
import { MUNDO_REAL } from './catalogo-real.mjs';
import { MUNDO_REAL_2 } from './catalogo-real-2.mjs';
import { MINECRAFT } from './catalogo-minecraft.mjs';
import { MINECRAFT_2 } from './catalogo-minecraft-2.mjs';

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

const REAIS = [...MUNDO_REAL, ...MUNDO_REAL_2];
const MINECRAFTS = [...MINECRAFT, ...MINECRAFT_2];

export const CATALOGO_EXTRA = [...REAIS, ...MINECRAFTS].map(deLinha);

// grupos que a interface usa para filtrar/contar
export const GRUPOS_EXTRA = {
  real: REAIS.length,
  minecraft: MINECRAFTS.length,
  emojis: [...new Set([...REAIS, ...MINECRAFTS].map((l) => l[2]))].map((emoji) => ({ emoji, codigo: codigoEmoji(emoji) })),
};

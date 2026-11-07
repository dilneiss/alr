// Catálogo extra do "Fale e a Cena Nasce": +200 coisas do mundo real e +200 do Minecraft.
// As listas ficam em arquivos próprios (catalogo-real.mjs, catalogo-minecraft.mjs) para o
// app.config.mjs continuar legível; aqui só transformamos as linhas em objetos do catálogo.
import { MUNDO_REAL } from './catalogo-real.mjs';
import { MINECRAFT } from './catalogo-minecraft.mjs';

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

export const CATALOGO_EXTRA = [...MUNDO_REAL, ...MINECRAFT].map(deLinha);

// grupos que a interface usa para filtrar/contar
export const GRUPOS_EXTRA = {
  real: MUNDO_REAL.length,
  minecraft: MINECRAFT.length,
  emojis: [...new Set([...MUNDO_REAL, ...MINECRAFT].map((l) => l[2]))].map((emoji) => ({ emoji, codigo: codigoEmoji(emoji) })),
};

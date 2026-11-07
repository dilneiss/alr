#!/usr/bin/env node
/**
 * Baixa os emotes (Twemoji, CC-BY 4.0) que faltam em assets/emoji/.
 *
 * Uso: node tools/baixar-emoji.mjs [--app cena-nasce] [--force]
 * Os nomes seguem catalogo-extra.mjs (codigoEmoji), então o app só precisa do `img`.
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const APP = arg("app", "cena-nasce");
const FORCE = args.includes("--force");
const APP_DIR = join(ROOT, "public", APP);
const DEST = join(APP_DIR, "assets/emoji");
const CDN = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg";

const { GRUPOS_EXTRA, codigoEmoji } = await import(pathToFileURL(join(APP_DIR, "catalogo-extra.mjs")).href);

// o Twemoji guarda o seletor de variação (fe0f) no nome das sequências ZWJ
const completo = (e) => [...e].map((c) => c.codePointAt(0).toString(16)).join("-");

mkdirSync(DEST, { recursive: true });

let baixados = 0, existentes = 0, falhas = [];
for (const { emoji, codigo } of GRUPOS_EXTRA.emojis) {
  const arquivo = join(DEST, `${codigo}.svg`);
  if (existsSync(arquivo) && !FORCE) { existentes++; continue; }
  const tentativas = [...new Set([codigo, completo(emoji)])];
  let salvou = false;
  for (const nome of tentativas) {
    try {
      const r = await fetch(`${CDN}/${nome}.svg`);
      if (!r.ok) continue;
      writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
      baixados++; salvou = true; break;
    } catch (e) {
      falhas.push(`${codigo}: ${e.message}`);
    }
  }
  if (!salvou && !falhas.some((x) => x.startsWith(codigo + ":"))) falhas.push(`${codigo}: sem arquivo no CDN`);
}

console.log(`emotes: ${GRUPOS_EXTRA.emojis.length} · baixados ${baixados} · já existiam ${existentes} · falhas ${falhas.length}`);
if (falhas.length) console.log("falhas:\n  " + falhas.join("\n  "));
process.exit(falhas.length ? 1 : 0);

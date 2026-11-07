// Leitura do orçamento escrito na busca ("até 150 reais", "no máximo R$ 80", "uns cem conto", "entre 100 e 200").
// O Jev não faz contas: o código lê o número exato; o Jev escolhe a faixa quando o texto foge destes padrões.
export const semAcento = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const UNID = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40,
  cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300,
  quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
};
const PALAVRA = `(?:${[...Object.keys(UNID), 'mil'].join('|')})`;
// não converte o que vem logo depois de algarismo: em "2 mil" o "mil" fica, e o NUM multiplica (2000, não "2 1000")
const SEQ = new RegExp(String.raw`(?<!\d\s*)\b${PALAVRA}(?:(?:\s+e\s+|\s+)${PALAVRA})*\b`, 'g');

// "cento e cinquenta" -> "150", "dois mil" -> "2000", "mil e quinhentos" -> "1500"
export function palavrasParaNumeros(s) {
  return s.replace(SEQ, (m) => {
    const ws = m.trim().split(/\s+/).filter((w) => w !== 'e');
    if (ws.length === 1 && (ws[0] === 'um' || ws[0] === 'uma')) return m; // artigo, não número
    let total = 0, cur = 0;
    for (const w of ws) {
      if (w === 'mil') { total += (cur || 1) * 1000; cur = 0; } else cur += UNID[w];
    }
    return String(total + cur);
  });
}

function numero(txt, mil) {
  let t = String(txt).replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  let n = parseFloat(t);
  if (!isFinite(n)) return null;
  if (mil) n *= 1000;
  return n;
}

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(mil|k)?`;
const CUR = String.raw`(?:r\$|rs|\$)?\s*`;
const RE_ATE = new RegExp(String.raw`(?:\bate\b|no maximo|\bmaximo\b(?: de)?|abaixo de|menos de|\bmenor que|nao passar de|que nao passe de|nao pode passar de|limite de|orcamento de|teto de|\bunder\b|\bup to\b|\bbelow\b|less than|\bmax\b)\s*(?:de\s*)?(?:uns\s*|umas\s*)?${CUR}${NUM}`);
const RE_ENTRE = new RegExp(String.raw`entre\s*${CUR}${NUM}\s*(?:reais|real|conto|contos|pila|pilas)?\s*e\s*${CUR}${NUM}`);
const RE_SOLTO = new RegExp(String.raw`(?:r\$|rs)\s*${NUM}|${NUM}\s*(?:reais|real|conto|contos|pila|pilas|mangos|dinheiros)\b`);

// Devolve { max, exato, aprox?, texto } ou null.
export function parseOrcamento(q) {
  const s = palavrasParaNumeros(semAcento(q)).replace(/\s+/g, ' ');
  let m;
  if ((m = s.match(RE_ENTRE))) { const max = numero(m[3], m[4]); if (max) return { max, exato: true, texto: m[0].trim() }; }
  if ((m = s.match(RE_ATE))) { const max = numero(m[1], m[2]); if (max && max >= 5) return { max, exato: true, texto: m[0].trim() }; }
  if ((m = s.match(RE_SOLTO))) {
    const v = m[1] != null ? numero(m[1], m[2]) : numero(m[3], m[4]);
    if (v && v >= 5) return { max: Math.round(v * 1.1 * 100) / 100, aprox: v, exato: false, texto: m[0].trim() };
  }
  return null;
}

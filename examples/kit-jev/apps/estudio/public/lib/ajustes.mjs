// Ajustes livres de estilo do Estúdio por Voz: "agora quero mudar o background para verde", "agora faça todas as fontes
// mudarem para caps lock", "agora insira degradê verde e branco no background". Contrato: dev/CONTRATO-AJUSTES.md.
//
// O Jev continua sem escrever nada. Ele ESCOLHE valores num esquema fechado de "botões de estilo" (as perguntas aj_*
// abaixo, que vão na MESMA chamada das perguntas da peça em POST /api/comando). O código transforma cada escolha num
// `ajuste` já resolvido (cores em #hex, fatores em número); o CSS de cada peça aplica os ajustes por cima dela.
//
// Módulo compartilhado: o servidor e o navegador importam este arquivo. Sem dependência de Node.
//
//   ajuste = { id, prop, pecas, elemento, valor, rotulo, comando, p }
//   id     = `${prop}|${pecas.join('+')}|${elemento}`   (pecas na ordem site, posts, email, anuncios)
//            ex.: 'fundo|site|pagina', 'caixa|site+posts+email+anuncios|tudo'. Um ajuste novo com o mesmo id SUBSTITUI o anterior.
//   p      = probabilidade de o comando pedir esse ajuste na pergunta principal dele (1 − p("não pedido")).
//   fundo  = { tipo, cores, direcao }: 'solida' → 1 cor; 'degrade' → 2 cores (com uma cor só, a 2ª é um tom dela);
//            'escurecer'/'clarear' → cores = [o tom já resolvido a partir do fundo atual da paleta] ou [] sem a paleta
//            (aí o CSS escurece/clareia por cima). direcao padrão 'vertical'.
//   Peças sem peça dita na frase: o fundo é do site (de todas, com o alvo "tudo"); as letras valem para todas as peças,
//   menos quando a mesma frase muda o fundo (aí vão junto com ele). Com "nos carrosséis", "no e-mail"… vale a peça dita.
//   Em /api/comando, `modo` diz o que aplicar: 'ajuste' → só os ajustes; 'biblioteca' → só `answers` (como antes);
//   'ambos' → os dois; 'nenhum' → nada de comando visual (descrição, desfazer, fixar, conversa).

export const PECAS = ['site', 'posts', 'email', 'anuncios'];
export const ELEMENTOS = ['pagina', 'topo', 'secoes', 'cartoes', 'botoes', 'titulos', 'textos', 'menu', 'rodape', 'tudo'];
export const PROPS = ['fundo', 'caixa', 'tamanho', 'peso', 'espaco', 'cor_texto', 'sombra', 'italico', 'alinhamento'];

// limiares calibrados com dev/avaliar-ajustes.mjs
export const LIMIAR = 0.5;        // um ajuste só existe se o Jev dá ≥ 50% de o comando pedir aquilo
export const LIMIAR_MODO = 0.6;   // e se o comando é um ajuste visual (aj_modo: ajuste + ambos ≥ 60%) — cor explícita dispensa
                                  // (medido: com ajuste pedido o mínimo foi 0,90; comandos de biblioteca chegaram a 0,50)
export const LIMIAR_ONDE = 0.4;   // abaixo disso, o "onde" volta ao padrão (fundo da página; todas as letras)

// ------------------------------------------------------------------ cores com nome (pt-BR, com sinônimos e tons)
// [id, nome (masculino singular, como em "fundo verde"), #hex, sinônimos que o Jev lê e que o código reconhece na frase]
const LISTA_CORES = [
  // neutros
  ['branco', 'branco', '#ffffff', 'white'],
  ['creme', 'creme', '#f5ecd7', 'marfim, off-white, pérola, baunilha'],
  ['bege', 'bege', '#e6d5b8', 'areia, palha, kraft'],
  ['cinza_claro', 'cinza-claro', '#e4e6ea', 'gelo, cinza-gelo, cinza bem clarinho'],
  ['cinza', 'cinza', '#9aa0a8', 'cinzento, cinza-médio, gray'],
  ['grafite', 'grafite', '#363b44', 'cinza-escuro, chumbo, carvão, antracite'],
  ['preto', 'preto', '#111111', 'black, preto fosco, escuro total'],
  ['prateado', 'prateado', '#c3c7ce', 'prata, metálico, silver'],
  // vermelhos e rosas
  ['vermelho', 'vermelho', '#d62828', 'vermelho-vivo, escarlate, red'],
  ['vinho', 'vinho', '#6e1c2e', 'bordô, marsala, grená, burgundy'],
  ['coral', 'coral', '#ff7a59', 'salmão'],
  ['rosa', 'rosa', '#ec6fa6', 'rosado, rosa-médio, chiclete'],
  ['rosa_claro', 'rosa-claro', '#f8d3e0', 'rosa-bebê, rosé, rosinha, blush'],
  ['pink', 'pink', '#ff2e88', 'rosa-choque, magenta, fúcsia'],
  // laranjas, amarelos e dourados
  ['laranja', 'laranja', '#f97316', 'alaranjado, tangerina, orange'],
  ['terracota', 'terracota', '#c4552b', 'laranja-queimado, tijolo, ferrugem'],
  ['pessego', 'pêssego', '#ffcba4', 'damasco, abricó'],
  ['amarelo', 'amarelo', '#facc15', 'amarelo-vivo, canário, yellow'],
  ['amarelo_claro', 'amarelo-claro', '#fbeea0', 'amarelo-bebê, amarelo pastel, amarelinho'],
  ['mostarda', 'mostarda', '#d4a017', 'ocre, amarelo-queimado'],
  ['dourado', 'dourado', '#c9a55c', 'ouro, gold, champanhe'],
  // verdes
  ['verde', 'verde', '#1f9d55', 'verde-folha, verde-bandeira, verde-grama, green'],
  ['verde_claro', 'verde-claro', '#8fdca8', 'verde pastel, verdinho'],
  ['verde_escuro', 'verde-escuro', '#14532d', 'verde-floresta, verde-garrafa'],
  ['verde_limao', 'verde-limão', '#a3e635', 'verde-lima, verde-neon, verde fluorescente'],
  ['verde_menta', 'verde-menta', '#a7e8cf', 'menta, hortelã'],
  ['verde_oliva', 'verde-oliva', '#6b7a2f', 'oliva, verde-militar, verde-musgo, musgo, cáqui'],
  ['salvia', 'verde-sálvia', '#8fa382', 'sálvia, verde acinzentado, eucalipto'],
  ['turquesa', 'turquesa', '#2ec4b6', 'verde-água, tiffany, água-marinha'],
  // azuis e roxos
  ['azul', 'azul', '#2563eb', 'azul-royal, azul-cobalto, azulão, blue'],
  ['azul_claro', 'azul-claro', '#9cc9f5', 'azul-bebê, azul-céu, celeste, azul pastel'],
  ['azul_marinho', 'azul-marinho', '#1b2a4e', 'marinho, navy, azul-escuro, azul-noite'],
  ['azul_petroleo', 'azul-petróleo', '#0f5f68', 'petróleo'],
  ['ciano', 'ciano', '#22c3e6', 'azul-piscina, azul-turquesa, cyan'],
  ['roxo', 'roxo', '#6d28d9', 'violeta, púrpura, uva, purple'],
  ['lilas', 'lilás', '#c4b5fd', 'lavanda, roxo-claro'],
  // marrons
  ['marrom', 'marrom', '#7b4a2d', 'castanho, brown'],
  ['cafe', 'café', '#4a2c20', 'chocolate, marrom-escuro, cacau'],
  ['caramelo', 'caramelo', '#c58940', 'mel, cobre, bronze, âmbar'],
  ['nude', 'nude', '#e3c1ad', 'cor de pele, bege-rosado'],
];
export const CORES = LISTA_CORES.map(([id, nome, hex, sin]) => ({ id, nome, hex, sinonimos: sin.split(',').map((s) => s.trim()).filter(Boolean) }));
export const COR = Object.fromEntries(CORES.map((c) => [c.id, c]));

// cores da marca: resolvidas com a paleta atual que o cliente manda em `marca.cores` (pri, sec, acc…)
export const CORES_MARCA = {
  cor_da_marca: { chave: 'pri', nome: 'cor da marca', jev: 'A cor principal da marca que já existe ("cor da marca", "nossa cor", "cor do logo", "cor principal")' },
  cor_secundaria_da_marca: { chave: 'sec', nome: 'cor secundária da marca', jev: 'A segunda cor da marca ("cor secundária da marca")' },
  cor_de_destaque_da_marca: { chave: 'acc', nome: 'cor de destaque da marca', jev: 'A cor de destaque ou de realce da marca ("cor de destaque", "cor de realce")' },
};

// ------------------------------------------------------------------ cor: utilidades pequenas (sem depender de js/util.mjs)
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function normalizarHex(h) {
  let s = String(h || '').trim().replace(/^#/, '').toLowerCase();
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return null;
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  return '#' + s.slice(0, 6); // o canal alfa (#rrggbbaa) é descartado: o ajuste é sempre opaco
}
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const doRgb = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
export function misturar(a, b, t) { const A = rgb(a), B = rgb(b); return doRgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
export function luminancia(h) {
  const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function hslParaHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return doRgb((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
// segunda cor de um degradê pedido com uma cor só ("degradê verde"): um tom bem mais claro (ou mais escuro, se a cor já é clara)
const tomDoDegrade = (h) => (luminancia(h) > 0.6 ? misturar(h, '#000000', 0.22) : misturar(h, '#ffffff', 0.72));

// ------------------------------------------------------------------ texto: normalização para achar palavras-chave
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) => semAcento(s).toLowerCase();

// ------------------------------------------------------------------ leitor determinístico de cor (#hex, rgb(), hsl())
// Tem precedência sobre o Jev: a cor escrita em código na frase é a cor usada. O papel de cada cor (fundo × letras) vem da
// palavra-chave forte mais próxima ANTES dela ("fundo", "background", "degradê" × "letras", "texto", "fonte", "títulos");
// sem nenhuma antes, vale a primeira depois; elemento com fundo e texto ("botões", "topo", "cartões") sem palavra forte = fundo.
const RE_COR = /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])|\brgba?\(\s*(\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)\s*(?:[,/]\s*[\d.]+%?\s*)?\)|\bhsla?\(\s*(-?\d{1,3}(?:\.\d+)?)(?:deg)?\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)/gi;
const RE_FORTE_FUNDO = /\b(fundos?|background|bg|degrades?|gradientes?|gradient|plano de fundo)\b/g;
const RE_FORTE_TEXTO = /\b(letras?|textos?|fontes?|titulos?|subtitulos?|escritas?|palavras?|tipografia|caracteres)\b/g;
const RE_CONTEINER = /\b(botao|botoes|cartao|cartoes|cards?|topo|menu|cabecalho|rodape|secao|secoes|faixas?|pagina|site|banner)\b/g;

function ultimaForte(trecho) {
  let melhor = null;
  for (const [re, papel] of [[RE_FORTE_FUNDO, 'fundo'], [RE_FORTE_TEXTO, 'texto']]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(trecho))) if (!melhor || m.index > melhor.i) melhor = { i: m.index, papel };
  }
  return melhor && melhor.papel;
}
function primeiraForte(trecho) {
  let melhor = null;
  for (const [re, papel] of [[RE_FORTE_FUNDO, 'fundo'], [RE_FORTE_TEXTO, 'texto']]) {
    re.lastIndex = 0;
    const m = re.exec(trecho);
    if (m && (!melhor || m.index < melhor.i)) melhor = { i: m.index, papel };
  }
  return melhor && melhor.papel;
}

// → [{ hex, ini, fim, bruto, papel: 'fundo' | 'texto' | null }] na ordem da frase (índices do texto sem acento, em minúsculas)
export function lerCores(frase) {
  const baixo = norm(frase);
  const achadas = [];
  RE_COR.lastIndex = 0;
  let m;
  while ((m = RE_COR.exec(baixo))) {
    let hex = null;
    if (m[1]) hex = normalizarHex(m[1]);
    else if (m[2] != null) { const v = [m[2], m[3], m[4]].map(Number); if (v.every((x) => x >= 0 && x <= 255)) hex = doRgb(...v); }
    else if (m[5] != null) { const s = +m[6], l = +m[7]; if (s <= 100 && l <= 100) hex = hslParaHex(+m[5], s / 100, l / 100); }
    if (hex) achadas.push({ hex, ini: m.index, fim: m.index + m[0].length, bruto: m[0] });
  }
  achadas.forEach((c, i) => {
    const antes = baixo.slice(i ? achadas[i - 1].fim : 0, c.ini);
    const depois = baixo.slice(c.fim, i + 1 < achadas.length ? achadas[i + 1].ini : baixo.length);
    c.papel = ultimaForte(antes) || null;
    if (!c.papel && i && /^\s*(e|ate|para|pra|pro|a|ao|com|,|-|→|->)?\s*$/.test(antes)) c.papel = achadas[i - 1].papel; // "degradê de #111 e #222"
    if (!c.papel) c.papel = primeiraForte(depois) || null;
    if (!c.papel) { RE_CONTEINER.lastIndex = 0; if (RE_CONTEINER.test(antes) || (RE_CONTEINER.lastIndex = 0, RE_CONTEINER.test(depois))) c.papel = 'fundo'; }
  });
  return achadas;
}

// a cor com nome aparece escrita na frase? ("verde", "brancas", "azul-marinho") — usado só para encaixar uma cor em código
// ao lado de uma cor com nome no mesmo degradê
function posicaoDaCor(id, baixo) {
  const c = COR[id];
  if (!c) return -1;
  let pos = -1;
  for (const t of [c.nome, ...c.sinonimos]) {
    const base = norm(t).replace(/[-\s]+/g, '[-\\s]?').replace(/o$/, '[oa]');
    const m = new RegExp(`(^|[^a-z])(${base})(s|es|is)?(?![a-z])`).exec(baixo);
    if (m && (pos < 0 || m.index < pos)) pos = m.index + m[1].length;
  }
  return pos;
}

// ------------------------------------------------------------------ marca: paleta atual mandada pelo cliente
// Aceita { cores: { pri, sec, acc, bg, ink, ... } } e guarda só valores #hex válidos.
export function lerMarca(m) {
  const c = m && typeof m === 'object' && m.cores && typeof m.cores === 'object' ? m.cores : null;
  if (!c) return null;
  const cores = {};
  for (const k of ['bg', 'surf', 'ink', 'muted', 'pri', 'sec', 'acc']) { const h = normalizarHex(c[k]); if (h) cores[k] = h; }
  return Object.keys(cores).length ? { cores } : null;
}

// id de cor escolhido pelo Jev → { hex, nome } (null se não dá para resolver, ex.: "cor da marca" sem a paleta)
export function resolverCor(id, marca) {
  if (COR[id]) return { hex: COR[id].hex, nome: COR[id].nome };
  const cm = CORES_MARCA[id];
  if (cm) { const hex = marca && marca.cores && normalizarHex(marca.cores[cm.chave]); return hex ? { hex, nome: cm.nome } : null; }
  return null;
}

// ------------------------------------------------------------------ as perguntas do ajuste (tipadas, fechadas)
// Todas são `choice` com uma opção "não pedido"/"nenhuma"/"não diz". Vão na MESMA chamada das perguntas da peça.
const escolha = (instructions, criteria) => ({ type: 'choice', instructions, criteria });
function criteriosCor(extra) {
  const out = { ...extra };
  for (const c of CORES) out[c.id] = c.sinonimos.length ? `${c.nome.charAt(0).toUpperCase() + c.nome.slice(1)} (${c.sinonimos.join(', ')})` : c.nome;
  for (const [id, c] of Object.entries(CORES_MARCA)) out[id] = c.jev;
  return out;
}

export const PERGUNTAS_AJUSTE = {
  aj_modo: escolha('O COMANDO da pessoa pede para trocar por outra opção pronta, pede um ajuste visual exato, as duas coisas, ou nenhuma mudança visual?', {
    biblioteca: 'Trocar por outra opção pronta ou mudar o estilo sem dar um valor exato: outro logo, outra paleta ("troca as cores", "cores mais escuras e elegantes"), outra fonte, outro layout, outro título, "mais moderno", "mais elegante", "tipo selo", "mais divertido", "mais chamativo"',
    ajuste: 'Um ajuste visual exato e pontual: cor ou degradê do FUNDO (background), cor dos botões, caixa alta ou baixa (caps lock, maiúsculas, minúsculas), letras maiores ou menores, negrito, itálico, espaço entre letras, cor ou sombra das letras, alinhamento',
    ambos: 'As duas coisas na mesma frase: trocar por outra opção pronta E um ajuste visual exato (ex.: "troca a fonte por uma mais moderna e deixa tudo em caixa alta")',
    nenhum: 'Não pede mudança visual: descreve o negócio, pede para desfazer ou voltar atrás, elogia, ou é conversa',
  }),
  aj_pecas: escolha('Em qual peça o comando quer o ajuste?', {
    nao_diz: 'O comando não diz a peça',
    site: 'No site, na página, na landing page',
    posts: 'Nos carrosséis ou posts do Instagram',
    email: 'No e-mail marketing',
    anuncios: 'Nos anúncios, nos banners',
    todas: 'Em todas as peças ao mesmo tempo ("em tudo", "em todas as peças", "em todo lugar")',
  }),
  aj_fundo: escolha('O comando pede mudar a COR DE FUNDO (background) da página ou de um elemento (topo, seções, cartões, botões, menu, rodapé)? "Botões verdes" também é cor de fundo, a dos botões. Trocar a paleta de cores da marca não é cor de fundo.', {
    nao_pedido: 'O comando não pede mudar a cor de fundo',
    solida: 'Fundo de uma cor só (ex.: "fundo verde", "background preto", "botões azuis", "fundo #1a7f3c")',
    degrade: 'Fundo em degradê ou gradiente de duas cores (ex.: "degradê verde e branco", "gradiente de azul pra roxo")',
    escurecer: 'Fundo mais escuro, sem dizer a cor (ex.: "escurece o fundo", "background mais escuro")',
    clarear: 'Fundo mais claro, sem dizer a cor (ex.: "clareia o fundo", "background mais clarinho")',
  }),
  aj_fundo_onde: escolha('Se o comando muda uma cor de fundo, de onde é esse fundo?', {
    pagina: 'O fundo inteiro da peça: a página do site, a lâmina do carrossel, o e-mail ou o banner (é o padrão quando diz só "fundo" ou "background")',
    topo: 'Só o topo, a primeira parte, o banner principal',
    secoes: 'As faixas e seções do meio da página',
    cartoes: 'Os cartões, cards e caixas dentro da peça',
    botoes: 'Os botões',
    menu: 'O menu, a barra de cima, o cabeçalho',
    rodape: 'O rodapé, a parte de baixo da página',
  }),
  aj_cor1: escolha('Qual é a PRIMEIRA cor que o comando pede para um FUNDO: o da página ou o de um elemento, como botões, topo, cartões, menu ou rodapé ("botões verdes" → verde)? No degradê, é a cor citada primeiro. Não confunda com a cor das letras. Se o comando não pede cor de fundo, escolha nenhuma.', criteriosCor({ nenhuma: 'Nenhuma: o comando não pede uma cor de fundo' })),
  aj_cor2: escolha('No degradê de um FUNDO (da página ou de um elemento), qual é a SEGUNDA cor que o comando pede (a cor citada depois)? Se o fundo pedido é de uma cor só, ou não há degradê, escolha nenhuma.', criteriosCor({ nenhuma: 'Nenhuma: não há segunda cor de fundo' })),
  aj_direcao: escolha('Se o comando pede degradê, em que direção?', {
    nao_diz: 'Não diz a direção, ou não é degradê',
    vertical: 'De cima para baixo',
    horizontal: 'Da esquerda para a direita, de um lado para o outro',
    diagonal: 'Na diagonal, de um canto ao outro',
    radial: 'Do centro para fora, circular, radial',
  }),
  aj_caixa: escolha('O comando pede mudar maiúsculas e minúsculas das letras?', {
    nao_pedido: 'Não fala de maiúsculas ou minúsculas',
    maiusculas: 'Tudo em MAIÚSCULAS: caixa alta, caps lock, letras garrafais, letra de forma',
    minusculas: 'Tudo em minúsculas: caixa baixa, sem nenhuma maiúscula',
    capitalizada: 'Primeira Letra De Cada Palavra Maiúscula',
    normal: 'Voltar ao normal: tirar a caixa alta, tirar o caps lock, desfazer as maiúsculas',
  }),
  aj_tamanho: escolha('O comando pede mudar o TAMANHO das letras?', {
    nao_pedido: 'Não fala do tamanho das letras',
    bem_menor: 'Letras bem menores, muito menores',
    menor: 'Letras um pouco menores, diminuir a letra',
    maior: 'Letras um pouco maiores, aumentar a letra',
    bem_maior: 'Letras bem maiores, muito maiores, enormes',
  }),
  aj_peso: escolha('O comando pede letras mais grossas ou mais finas?', {
    nao_pedido: 'Não fala da grossura das letras',
    negrito: 'Negrito, bold, letras mais grossas, mais fortes, mais pesadas',
    fino: 'Letras mais finas, mais leves, sem negrito',
  }),
  aj_espaco: escolha('O comando pede mudar o espaço ENTRE AS LETRAS (não entre seções ou linhas)?', {
    nao_pedido: 'Não fala do espaço entre as letras',
    amplo: 'Letras mais espaçadas, mais afastadas umas das outras',
    junto: 'Letras mais juntas, mais coladas, mais apertadas',
  }),
  aj_cor_texto: escolha('Que cor o comando pede para as LETRAS (textos, títulos, fontes)? Não confunda com a cor do fundo.', criteriosCor({
    nenhuma: 'Nenhuma: o comando não pede cor para as letras',
    claras: 'Letras mais claras, sem dizer a cor',
    escuras: 'Letras mais escuras, sem dizer a cor',
  })),
  aj_sombra: escolha('O comando pede sombra?', {
    nao_pedido: 'Não fala de sombra',
    com: 'Com sombra, sombreado, efeito de sombra',
    sem: 'Sem sombra, tirar a sombra',
  }),
  aj_italico: escolha('O comando pede letras em itálico?', {
    nao_pedido: 'Não fala de itálico',
    sim: 'Em itálico, letras inclinadas',
    nao: 'Tirar o itálico, letras retas',
  }),
  aj_alinhamento: escolha('O comando pede mudar o alinhamento dos textos?', {
    nao_pedido: 'Não fala de alinhamento',
    centro: 'Centralizado, no meio',
    esquerda: 'Alinhado à esquerda',
  }),
  aj_onde: escolha('Em quais letras o comando quer a mudança de letra (caixa, tamanho, negrito, itálico, espaço, cor, sombra ou alinhamento)?', {
    tudo: 'Em todas as letras e textos ("todas as fontes", "tudo", "as letras") — é o padrão',
    titulos: 'Só nos títulos',
    textos: 'Só nos textos corridos, parágrafos e descrições',
    botoes: 'Só nos botões',
    cartoes: 'Só nos cartões e caixas',
    topo: 'Só no topo, no banner principal',
    menu: 'Só no menu, na barra de cima',
    rodape: 'Só no rodapé',
  }),
};
export const IDS_AJUSTE = Object.keys(PERGUNTAS_AJUSTE);
export function perguntasAjuste() { return PERGUNTAS_AJUSTE; }

// ------------------------------------------------------------------ leitura das respostas do Jev
const probs = (a) => (a && a.probabilities) || {};
// probabilidade de o comando pedir ALGO nesta pergunta = 1 − p(opções "nulas")
function pPedido(a, nulas) { const p = probs(a); return a ? Math.max(0, 1 - nulas.reduce((s, k) => s + (p[k] || 0), 0)) : 0; }
// opção mais provável fora das "nulas"
function melhor(a, nulas = []) {
  let k = null, v = -1;
  for (const [o, p] of Object.entries(probs(a))) if (!nulas.includes(o) && p > v) { k = o; v = p; }
  return [k, Math.max(0, v)];
}
const arred = (p) => Math.round(p * 100) / 100;

export function idAjuste(prop, pecas, elemento) { return `${prop}|${pecas.join('+')}|${elemento}`; }
const ordenarPecas = (lista) => PECAS.filter((p) => lista.includes(p));

// peças do ajuste: a peça que o comando diz ("nos carrosséis", "em todas as peças"); senão a peça do alvo do roteador.
// Sem peça: o FUNDO é do site (ou de tudo, se o alvo é "tudo"); as LETRAS valem para todas as peças (a tipografia é da
// marca: "tira o caps lock" precisa pegar o mesmo id de "todas as fontes em caps lock"), menos quando a mesma frase muda
// o fundo: aí as letras vão junto com o fundo ("fundo preto com letras brancas" não deixa letra branca em peça clara).
function pecasDoComando(A, alvo) {
  const [k, p] = melhor(A.aj_pecas, ['nao_diz']);
  const dita = k && p >= LIMIAR ? (k === 'todas' ? PECAS.slice() : [k]) : PECAS.includes(alvo) ? [alvo] : null;
  return {
    fundo: dita || (alvo === 'tudo' ? PECAS.slice() : ['site']),
    letras: (comFundo) => dita || (comFundo ? null : PECAS.slice()),
  };
}

const FATOR = { bem_menor: 0.85, menor: 0.93, maior: 1.1, bem_maior: 1.22 };

// answers: respostas do Jev às perguntas aj_* (pode vir junto com as da peça; as outras chaves são ignoradas)
// comando: a frase da pessoa; alvo: o alvo do roteador; marca: { cores: { pri, sec, acc, bg, ... } } (paleta atual)
export function interpretarAjustes(answers, comando, alvo, marca) {
  const A = answers || {};
  const texto = String(comando || '').trim();
  if (alvo === 'logo' || alvo === 'slogan') return []; // o logo e o slogan têm opções próprias na biblioteca
  const explicitas = lerCores(texto);
  const pm = probs(A.aj_modo);
  const pModo = (pm.ajuste || 0) + (pm.ambos || 0);
  if (!A.aj_modo && !explicitas.length) return [];
  if (pModo < LIMIAR_MODO && !explicitas.some((c) => c.papel)) return [];

  const mk = lerMarca(marca);
  const baixo = norm(texto);
  const P = pecasDoComando(A, alvo);
  const pecasFundo = ordenarPecas(P.fundo);
  const out = [];
  const add = (prop, elemento, valor, p, nomes, pecas) => {
    const aj = { id: idAjuste(prop, pecas, elemento), prop, pecas: pecas.slice(), elemento, valor, rotulo: '', comando: texto, p: arred(p) };
    aj.rotulo = rotuloAjuste(aj, nomes);
    out.push(aj);
  };

  // ----- cores escritas em código (#hex, rgb(), hsl()): vencem a cor com nome que o Jev escolheu para o mesmo lugar
  const expFundo = explicitas.filter((c) => c.papel === 'fundo');
  const expTexto = explicitas.filter((c) => c.papel === 'texto');
  const expSolta = explicitas.filter((c) => !c.papel);
  const falaDegrade = /degrad|gradien/.test(baixo);

  // ----- fundo
  const pFundo = pPedido(A.aj_fundo, ['nao_pedido']);
  let [tipoFundo] = melhor(A.aj_fundo, ['nao_pedido']);
  const pTexto = pPedido(A.aj_cor_texto, ['nenhuma']);
  const querTextoCor = pTexto >= LIMIAR;
  let fundoPedido = pFundo >= LIMIAR && !!tipoFundo;
  // cor em código sem papel claro: vai para o fundo, a menos que o comando só peça cor de letra
  const codFundo = expFundo.length ? expFundo : fundoPedido || !querTextoCor ? expSolta : [];
  if (codFundo.length) {
    if (!fundoPedido) { fundoPedido = true; tipoFundo = 'solida'; } // "cor explícita na frase sempre vence"
    if (tipoFundo === 'escurecer' || tipoFundo === 'clarear') tipoFundo = 'solida';
    if (tipoFundo === 'solida' && codFundo.length >= 2 && falaDegrade) tipoFundo = 'degrade';
  }
  if (fundoPedido) {
    const [ondeF, pOndeF] = melhor(A.aj_fundo_onde);
    const elemento = ondeF && pOndeF >= LIMIAR_ONDE ? ondeF : 'pagina';
    const [dir, pDir] = melhor(A.aj_direcao, ['nao_diz']);
    const direcao = dir && pDir >= LIMIAR ? dir : 'vertical';
    // cores do Jev (com nome), na ordem pedida
    const jev = [];
    for (const q of ['aj_cor1', 'aj_cor2']) {
      const [id] = melhor(A[q], ['nenhuma']);
      if (id && pPedido(A[q], ['nenhuma']) >= LIMIAR) { const r = resolverCor(id, mk); if (r && !jev.some((x) => x.hex === r.hex)) jev.push({ ...r, id, pos: posicaoDaCor(id, baixo) }); }
    }
    let cores = [], nomes = [];
    if (tipoFundo === 'solida') {
      const c = codFundo[0] ? { hex: codFundo[0].hex, nome: codFundo[0].hex.toUpperCase() } : jev[0];
      if (c) { cores = [c.hex]; nomes = [c.nome]; }
    } else if (tipoFundo === 'degrade') {
      let lista;
      if (codFundo.length >= 2) lista = codFundo.slice(0, 2).map((c) => ({ hex: c.hex, nome: c.hex.toUpperCase(), pos: c.ini }));
      else if (codFundo.length === 1) {
        const cod = { hex: codFundo[0].hex, nome: codFundo[0].hex.toUpperCase(), pos: codFundo[0].ini };
        const comNome = jev.find((x) => x.pos >= 0); // uma cor com nome que está escrita na frase entra ao lado da cor em código
        lista = comNome ? [cod, comNome].sort((a, b) => a.pos - b.pos) : [cod];
      } else lista = jev.slice(0, 2);
      if (lista.length === 1) lista.push({ hex: tomDoDegrade(lista[0].hex), nome: luminancia(lista[0].hex) > 0.6 ? 'tom mais escuro' : 'tom mais claro' });
      if (lista.length) { cores = lista.map((x) => x.hex); nomes = lista.map((x) => x.nome); }
    } else if (tipoFundo === 'escurecer' || tipoFundo === 'clarear') {
      // relativo ao fundo atual: com a paleta, já vai resolvido num tom; sem ela, cores = [] e o CSS escurece/clareia por cima
      const bg = mk && mk.cores && mk.cores.bg;
      if (bg) {
        const claro = luminancia(bg) > 0.4;
        cores = [tipoFundo === 'escurecer' ? misturar(bg, '#000000', claro ? 0.35 : 0.45) : misturar(bg, '#ffffff', claro ? 0.6 : 0.25)];
        nomes = [tipoFundo === 'escurecer' ? 'tom mais escuro' : 'tom mais claro'];
      }
    }
    // cor pedida mas impossível de resolver (ex.: "cor da marca" sem a paleta): sem ajuste de fundo, em vez de uma cor errada
    if (cores.length || tipoFundo === 'escurecer' || tipoFundo === 'clarear') add('fundo', elemento, { tipo: tipoFundo, cores, direcao }, pFundo, nomes, pecasFundo);
  }
  const pecasLetras = ordenarPecas(P.letras(out.length > 0) || pecasFundo);

  // ----- letras: onde
  const [ondeT, pOndeT] = melhor(A.aj_onde);
  const ondeLetras = ondeT && pOndeT >= LIMIAR_ONDE ? ondeT : 'tudo';

  const simples = [
    ['caixa', 'aj_caixa', ['maiusculas', 'minusculas', 'capitalizada', 'normal']],
    ['peso', 'aj_peso', ['negrito', 'fino']],
    ['espaco', 'aj_espaco', ['amplo', 'junto']],
    ['sombra', 'aj_sombra', ['com', 'sem']],
    ['italico', 'aj_italico', ['sim', 'nao']],
    ['alinhamento', 'aj_alinhamento', ['centro', 'esquerda']],
  ];
  const ordem = [];
  for (const [prop, q, validos] of simples) {
    const p = pPedido(A[q], ['nao_pedido']);
    const [v] = melhor(A[q], ['nao_pedido']);
    if (p >= LIMIAR && validos.includes(v)) ordem.push([prop, v, p]);
  }
  // tamanho: primeiro o sentido (maior × menor), depois quanto
  {
    const pr = probs(A.aj_tamanho);
    const p = pPedido(A.aj_tamanho, ['nao_pedido']);
    if (p >= LIMIAR) {
      const mais = (pr.maior || 0) + (pr.bem_maior || 0), menos = (pr.menor || 0) + (pr.bem_menor || 0);
      const k = mais >= menos ? ((pr.bem_maior || 0) > (pr.maior || 0) ? 'bem_maior' : 'maior') : ((pr.bem_menor || 0) > (pr.menor || 0) ? 'bem_menor' : 'menor');
      ordem.push(['tamanho', FATOR[k], p]);
    }
  }
  // cor das letras: cor em código > cor com nome do Jev; "claras"/"escuras" sem cor
  {
    const cod = expTexto[0] || (querTextoCor ? expSolta.find((c) => !codFundo.includes(c)) : null);
    if (cod) ordem.push(['cor_texto', { cor: cod.hex }, pTexto, [cod.hex.toUpperCase()]]);
    else if (querTextoCor) {
      const [id] = melhor(A.aj_cor_texto, ['nenhuma']);
      if (id === 'claras') ordem.push(['cor_texto', 'claro', pTexto]);
      else if (id === 'escuras') ordem.push(['cor_texto', 'escuro', pTexto]);
      else { const r = resolverCor(id, mk); if (r) ordem.push(['cor_texto', { cor: r.hex }, pTexto, [r.nome]]); }
    }
  }
  const ORDEM_PROPS = ['caixa', 'tamanho', 'peso', 'espaco', 'cor_texto', 'sombra', 'italico', 'alinhamento'];
  ordem.sort((a, b) => ORDEM_PROPS.indexOf(a[0]) - ORDEM_PROPS.indexOf(b[0]));
  for (const [prop, valor, p, nomes] of ordem) add(prop, ondeLetras, valor, p, nomes, pecasLetras);
  return out;
}

// modo do comando: 'biblioteca' (trocar por opção pronta, como antes) · 'ajuste' · 'ambos' · 'nenhum'
// temBiblioteca: o alvo tem perguntas da biblioteca (ou é "tudo", que refaz tudo com a fala).
export function modoDoComando({ tipo, answers, ajustes, temBiblioteca }) {
  if (tipo !== 'comando_de_edicao') return 'nenhum';
  const pm = probs(answers && answers.aj_modo);
  const pBib = (pm.biblioteca || 0) + (pm.ambos || 0);
  if (ajustes && ajustes.length) return temBiblioteca && pBib >= LIMIAR ? 'ambos' : 'ajuste';
  return temBiblioteca ? 'biblioteca' : 'nenhum';
}

// ------------------------------------------------------------------ rótulo curto em pt-BR, gerado a partir do valor
const NOME_POR_HEX = Object.fromEntries(CORES.map((c) => [c.hex, c.nome]));
const nomeCor = (hex, nome) => nome || NOME_POR_HEX[normalizarHex(hex)] || String(hex || '').toUpperCase();
const FUNDO_DE = { pagina: 'Fundo', topo: 'Fundo do topo', secoes: 'Fundo das seções', cartoes: 'Fundo dos cartões', botoes: 'Botões', menu: 'Fundo do menu', rodape: 'Fundo do rodapé', titulos: 'Fundo dos títulos', textos: 'Fundo dos textos', tudo: 'Todos os fundos' };
const EM_ONDE = { tudo: 'em tudo', titulos: 'nos títulos', textos: 'nos textos', botoes: 'nos botões', cartoes: 'nos cartões', topo: 'no topo', menu: 'no menu', rodape: 'no rodapé', pagina: 'na página', secoes: 'nas seções' };
const COR_DE = { tudo: 'Cor das letras', titulos: 'Cor dos títulos', textos: 'Cor dos textos', botoes: 'Cor das letras dos botões', cartoes: 'Cor das letras dos cartões', topo: 'Cor das letras do topo', menu: 'Cor das letras do menu', rodape: 'Cor das letras do rodapé', pagina: 'Cor das letras', secoes: 'Cor das letras das seções' };
const NOME_PECA = { site: 'site', posts: 'carrosséis', email: 'e-mail', anuncios: 'anúncios' };

export function rotuloAjuste(aj, nomes) {
  if (!aj || !aj.prop) return '';
  const el = aj.elemento || 'tudo', v = aj.valor;
  const todas = Array.isArray(aj.pecas) && PECAS.every((p) => aj.pecas.includes(p));
  const pecasTxt = !Array.isArray(aj.pecas) || (aj.pecas.length === 1 && aj.pecas[0] === 'site') ? '' : todas ? 'todas as peças' : aj.pecas.map((p) => NOME_PECA[p] || p).join(', ');
  let onde = EM_ONDE[el] || '';
  let sufixo = pecasTxt ? ` (${pecasTxt})` : '';
  if (el === 'tudo' && todas) { onde = 'em todas as peças'; sufixo = ''; }
  let r;
  switch (aj.prop) {
    case 'fundo': {
      const base = FUNDO_DE[el] || 'Fundo', plural = el === 'botoes';
      const cs = (v && v.cores) || [], ns = cs.map((h, i) => nomeCor(h, nomes && nomes[i]));
      const liga = (n) => (/^cor /.test(n) ? `na ${n}` : plural ? `em ${n}` : n);
      if (v && v.tipo === 'degrade') r = `${base} em degradê ${ns.join(' → ')}${v.direcao && v.direcao !== 'vertical' ? ` (${{ horizontal: 'horizontal', diagonal: 'diagonal', radial: 'do centro' }[v.direcao] || v.direcao})` : ''}`;
      else if (v && v.tipo === 'escurecer') r = `${base} mais escuro${plural ? 's' : ''}`;
      else if (v && v.tipo === 'clarear') r = `${base} mais claro${plural ? 's' : ''}`;
      else r = `${base} ${liga(ns[0] || '')}`.trim();
      break;
    }
    case 'caixa': r = `${{ maiusculas: 'Caixa alta', minusculas: 'Minúsculas', capitalizada: 'Iniciais maiúsculas', normal: 'Caixa normal' }[v] || 'Caixa'} ${onde}`; break;
    case 'tamanho': r = `Letras ${v >= 1.15 ? 'bem maiores' : v > 1 ? 'maiores' : v <= 0.88 ? 'bem menores' : 'menores'} ${onde}`; break;
    case 'peso': r = `${v === 'fino' ? 'Letras finas' : 'Negrito'} ${onde}`; break;
    case 'espaco': r = `Letras mais ${v === 'junto' ? 'juntas' : 'espaçadas'} ${onde}`; break;
    case 'cor_texto':
      if (v === 'claro' || v === 'escuro') r = `Letras mais ${v === 'claro' ? 'claras' : 'escuras'} ${onde}`;
      else { r = `${COR_DE[el] || 'Cor das letras'}: ${nomeCor(v && v.cor, nomes && nomes[0])}`; if (el === 'tudo' && todas) sufixo = ' (todas as peças)'; }
      break;
    case 'sombra': r = `${v === 'sem' ? 'Sem sombra' : 'Sombra'} ${el === 'tudo' && !todas ? 'nas letras' : onde}`; break;
    case 'italico': r = `${v === 'nao' ? 'Sem itálico' : 'Itálico'} ${onde}`; break;
    case 'alinhamento':
      r = el === 'tudo' ? `Textos ${v === 'esquerda' ? 'alinhados à esquerda' : 'centralizados'}${todas ? ' em todas as peças' : ''}` : `${v === 'esquerda' ? 'Alinhado à esquerda' : 'Centralizado'} ${onde}`;
      break;
    default: r = aj.prop;
  }
  return (r.trim() + sufixo).replace(/\s+/g, ' ');
}

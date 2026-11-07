// "✍️ Escrever textos com IA de texto": monta o pedido ao modelo de texto (a fala + as decisões do Jev) e lê a resposta
// em formato de linhas "CAMPO: valor" enquanto ela chega. O leitor é tolerante: aceita acento ou não no rótulo,
// markdown, numeração, aspas, e ignora eco das instruções (o modelo às vezes repete o pedido na 1ª linha).
export const LIMITE_TOKENS = 640;

export const CAMPOS = [
  { id: 'titulo', rotulo: 'TITULO', max: 70, desc: 'o título principal do site (curto e marcante)' },
  { id: 'subtitulo', rotulo: 'SUBTITULO', max: 170, desc: 'o subtítulo do site (uma frase que explica o que o negócio faz e para quem)' },
  { id: 'sobre', rotulo: 'SOBRE', max: 330, desc: 'o parágrafo "sobre nós" do site, em primeira pessoa do plural' },
  { id: 'legenda1', rotulo: 'LEGENDA1', max: 240, desc: 'a legenda do post 1' },
  { id: 'legenda2', rotulo: 'LEGENDA2', max: 240, desc: 'a legenda do post 2' },
  { id: 'legenda3', rotulo: 'LEGENDA3', max: 240, desc: 'a legenda do post 3' },
  { id: 'assunto', rotulo: 'ASSUNTO', max: 70, desc: 'o assunto do e-mail marketing' },
  { id: 'preheader', rotulo: 'PREHEADER', max: 110, desc: 'o preheader do e-mail (a frase que aparece ao lado do assunto)' },
  { id: 'email', rotulo: 'EMAIL', max: 320, desc: 'o parágrafo de abertura do e-mail marketing' },
  { id: 'anuncio', rotulo: 'ANUNCIO', max: 48, desc: 'o título dos anúncios de display' },
  { id: 'slogan', rotulo: 'SLOGAN', max: 60, desc: 'o slogan da marca' },
];

const s = (v, max = 160) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// d = decisões já legíveis (rótulos), montadas pela página a partir das escolhas do Jev.
export function montarPrompt(fala, d) {
  const posts = Array.isArray(d.posts) ? d.posts.slice(0, 3).map((p, i) => `${i + 1}) ${s(p && p.formato, 40)} "${s(p && p.gancho, 90)}"`).join('; ') : '';
  const sistema = 'Você é redator publicitário brasileiro. Português do Brasil com acentuação perfeita, frases curtas, concretas e com a personalidade da marca. '
    + 'Não invente preços, números, prêmios ou endereços. Não use marcações de gênero como “(a)”: prefira frases neutras. Responda só com as 11 linhas pedidas, cada uma começando pelo rótulo em maiúsculas e dois-pontos, sem markdown nem explicações.';
  const usuario = [
    `Fala do dono (transcrição): "${s(fala, 1200)}"`,
    `Negócio: ${s(d.nome, 60) || 'sem nome'} · ${s(d.segmento, 60)}${d.cidade ? ` · ${s(d.cidade, 50)}` : ''}.`,
    `Decisões do classificador Jev: personalidade ${s(d.personalidade, 70)}; público ${s(d.publico, 50)}; objetivo ${s(d.objetivo, 60)}; `
      + `preço ${s(d.preco, 20)}; diferencial: ${s(d.diferencial, 100)}; botão do site: ${s(d.cta, 40)}; oferta: ${s(d.oferta, 80) || 'nenhuma'}; emojis: ${s(d.emojis, 20)}.`,
    posts ? `Carrosséis do Instagram: ${posts}.` : '',
    d.email ? `E-mail marketing: ${s(d.email, 200)}.` : '',
    d.anuncio ? `Anúncios de display: ${s(d.anuncio, 160)}.` : '',
    'Escreva, nesta ordem (limites em caracteres):',
    'TITULO: até 60',
    'SUBTITULO: até 150',
    'SOBRE: até 300, na 1ª pessoa do plural',
    'LEGENDA1: até 220, para o carrossel 1, termina com uma chamada',
    'LEGENDA2: até 220, para o carrossel 2, termina com uma chamada',
    'LEGENDA3: até 220, para o carrossel 3, termina com uma chamada',
    'ASSUNTO: até 60, assunto do e-mail que dá vontade de abrir',
    'PREHEADER: até 100, completa o assunto sem repetir',
    `EMAIL: até 300, abertura do e-mail, calorosa e direta${d.oferta ? ', citando a oferta' : ''}`,
    'ANUNCIO: até 40, título do banner, lido em 1 segundo',
    'SLOGAN: até 45',
  ].filter(Boolean).join('\n');
  return [{ role: 'system', content: sistema }, { role: 'user', content: usuario }];
}

const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const RE_LINHA = /^\s*(?:[-*•>#]+\s*|\d+[.)]\s*)?[*_"“]*\s*(T[IÍ]TULO|SUBT[IÍ]TULO|SOBRE(?:\s+N[OÓ]S)?|LEGENDA\s*(?:DO\s+(?:POST|CARROSSEL)\s*)?[123]|ASSUNTO|PRE-?HEADER|E-?MAIL|AN[UÚ]NCIO|SLOGAN)\s*[*_"”]*\s*(?:\([^)]*\))?\s*[:：\-–—]\s*(.*)$/i;
const ECO = /(at[eé]\s+\d+\s*(caracteres)?|primeira pessoa do plural|1ª pessoa do plural|para o (post|carrossel) \d|termina com uma chamada|sem ponto final|nesta ordem|completa o assunto|lido em 1 segundo|d[aá] vontade de abrir)/i;

function campoDe(rotulo) {
  const r = semAcento(rotulo).toUpperCase().replace(/\s+/g, '');
  if (r === 'TITULO') return 'titulo';
  if (r === 'SUBTITULO') return 'subtitulo';
  if (r.startsWith('SOBRE')) return 'sobre';
  if (r.startsWith('LEGENDA')) return 'legenda' + r.slice(-1);
  if (r === 'ASSUNTO') return 'assunto';
  if (r.startsWith('PRE')) return 'preheader';
  if (r === 'EMAIL' || r === 'E-MAIL') return 'email';
  if (r === 'ANUNCIO') return 'anuncio';
  if (r === 'SLOGAN') return 'slogan';
  return null;
}
// corta no limite de caracteres sem partir palavra: fica a última palavra inteira que cabe em max, sem espaço nem
// pontuação solta no fim ("…a chapa quente per" → "…a chapa quente"); uma palavra só, maior que max, leva o corte simples
function cortar(t, max) {
  if (t.length <= max) return t;
  const ini = t.slice(0, max);
  const inteira = /\s/.test(t[max]) ? ini : ini.slice(0, Math.max(0, ini.search(/\s\S*$/)));
  const limpa = inteira.replace(/[\s,;:·/\\|&+*(\[{<«"“'‘\-–—]+$/u, '');
  return limpa || ini;
}
function limparValor(v, id) {
  let t = String(v || '').replace(/\*\*|__/g, '').trim();
  t = t.replace(/^["“”'«»]+|["“”'«»]+$/g, '').trim();
  if (id.startsWith('legenda')) t = t.replace(/\s+\/\s+/g, '\n');
  else t = t.replace(/\s+\/\s+/g, ' ');
  if (id === 'titulo' || id === 'slogan' || id === 'anuncio' || id === 'assunto') t = t.replace(/[.。]+$/, '');
  const c = CAMPOS.find((x) => x.id === id);
  return c ? cortar(t, c.max) : t;
}

// Lê o texto acumulado (pode estar pela metade). Devolve { campos: {id: valor}, atual: id|null }.
// A última ocorrência de um campo vence (se o modelo repetir o pedido e depois responder, fica a resposta).
export function lerCampos(texto) {
  const campos = {};
  let atual = null;
  const linhas = String(texto || '').split(/\r?\n/);
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (m) {
      const id = campoDe(m[1]);
      if (!id) { atual = null; continue; }
      const valor = m[2] || '';
      if (ECO.test(valor) && valor.length < 90) { atual = null; continue; } // eco da instrução
      campos[id] = limparValor(valor, id);
      atual = id;
    } else if (atual && linha.trim() && (atual === 'email' || atual === 'sobre')) {
      campos[atual] = limparValor(campos[atual] + ' ' + linha.trim(), atual);
    } else if (linha.trim()) {
      atual = null;
    }
  }
  return { campos, atual };
}

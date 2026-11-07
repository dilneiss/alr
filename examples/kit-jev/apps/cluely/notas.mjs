// NOTAS AO VIVO (v3 do Mini Cluely): a cada janela da conversa (x segundos ou x palavras), notas curtas com o que vale
// saber sobre o assunto — sigla, termo, nome, fato, notícia — em linguagem simples, TÍTULO e rótulos em CAIXA ALTA.
// Sem "quem falou", sem "resposta sugerida": só o contexto que falta para acompanhar a aula, a reunião ou a entrevista.
//   1. ajuste da transcrição (glossário de IA/programação + termos do usuário)
//   2. a IA de texto propõe até 3 tópicos da janela (JSON curto)
//   3. candidatos de fonte: até 5 artigos da Wikipédia por tópico
//   4. o Jev, numa chamada só, decide por tópico: vale nota? (termo, nome, história, atualidade × palavra comum, detalhe),
//      QUAL artigo fala do assunto desta conversa (sigla é ambígua: ATP da célula × ATP do tênis, CDI do investimento ×
//      CDI do serviço militar) e se o significado da sigla está certo
//   5. notícias (Google Notícias) para o que é atual
//   6. a IA de texto escreve a nota no formato fixo
import { ajustar, textoFinal, textoMarcado, perguntasAjuste, escolhasAjuste, GLOSSARIO } from './public/lib/ajuste.mjs';

// o Jev escolhe uma destas classes por tópico; "comum" e "detalhe" não viram nota
export const CLASSES = {
  termo: 'sigla ou termo técnico/de alguma área que vale explicar (ex.: ERP, B2B, evals, Selic, CRISPR)',
  nome: 'nome de pessoa, empresa, produto, livro, obra ou lugar que ganha contexto',
  historia: 'fato, período ou personagem histórico',
  atualidade: 'notícia ou assunto atual: eleição, lei nova, taxa ou preço de agora, evento recente ou do ano',
  comum: 'palavra ou expressão do dia a dia, ou algo que qualquer adulto já sabe (não precisa de nota)',
  detalhe: 'detalhe da própria conversa: quem, quando, combinados, opinião ou caso pessoal (não precisa de nota)',
};
export const LIMIAR_NOTA = 0.5;           // P(termo + nome + historia + atualidade) mínima para virar nota
export const TIPOS = { termo: 'conceito: explicar o que é e para que serve', nome: 'quem ou o que é e por que é conhecido',
  historia: 'fato histórico: quando, onde, por que importa', atualidade: 'assunto atual: os dados mais recentes da FONTE' };
const UA = 'MiniCluelyNotas/0.1 (jev showcase; voce@exemplo.com)';
const semAcento = (s) => String(s || '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

// ---------------------------------------------------------------- modelo de texto (llama.cpp, API OpenAI)
export async function chat(base, messages, { max_tokens = 120, temperature = 0.3 } = {}) {
  const t0 = performance.now();
  const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
    body: JSON.stringify({ model: 'x', messages, max_tokens, temperature, top_p: 0.8, top_k: 20, cache_prompt: true }),
  });
  if (!r.ok) throw new Error(`modelo de texto respondeu ${r.status}`);
  const j = await r.json();
  return { texto: (j.choices?.[0]?.message?.content || '').trim(), cortado: j.choices?.[0]?.finish_reason === 'length', ms: Math.round(performance.now() - t0), prompt_n: j.timings?.prompt_n, cache_n: j.timings?.cache_n };
}

// ---------------------------------------------------------------- 2. tópicos da janela
const SIS_TOPICOS = [
  'Você lê um trecho de conversa ao vivo (transcrição automática, pode ter erros) e escolhe o que merece uma NOTA curta na tela de quem está ouvindo.',
  'Merece nota: sigla, termo técnico ou de alguma área (negócios, tecnologia, finanças, saúde, direito, ciência), nome de pessoa, empresa, obra, lugar ou evento, fato histórico, notícia ou assunto atual.',
  'Não merece: palavra do dia a dia, conversa social, combinados e logística, opinião, o que qualquer adulto já sabe, o que já foi anotado.',
  'Cada sigla ou termo é um tópico separado: "erp para b2b" vira dois tópicos, "ERP" e "B2B". Escreva o tópico com a grafia certa (siglas em maiúsculas, nomes próprios com inicial maiúscula).',
  'Assunto atual citado de passagem também merece ("ficamos sabendo da eleição" → "Eleição no Brasil"); na busca, inclua o ano quando for atual.',
  'Na "busca", escreva o termo como numa enciclopédia, com o assunto junto quando o termo for ambíguo (ex.: "ATP adenosina trifosfato", "CDI certificado de depósito interbancário").',
  'Responda SOMENTE com JSON: {"topicos":[{"t":"o tópico em poucas palavras","busca":"termo para pesquisar","sigla":"significado por extenso (só se o tópico for uma sigla)"}]} com no máximo 3 tópicos, o mais útil primeiro. Se nada merecer nota: {"topicos":[]}.',
  '',
  'EXEMPLOS:',
  'TRECHO: "e depois ficamos sabendo da eleição no brasil" → {"topicos":[{"t":"Eleição no Brasil","busca":"eleição presidencial Brasil 2026"}]}',
  'TRECHO: "meu negócio é focado em erp para b2b a gente atende indústria" → {"topicos":[{"t":"ERP","busca":"ERP sistema integrado de gestão empresarial","sigla":"Enterprise Resource Planning"},{"t":"B2B","busca":"B2B comércio entre empresas","sigla":"Business to Business"}]}',
  'TRECHO: "tenho curiosidade de saber mais sobre evals na ia" → {"topicos":[{"t":"Evals","busca":"avaliação de modelos de IA evals"}]}',
  'TRECHO: "vamos fazer um intervalo de dez minutos e voltamos" → {"topicos":[]}',
  'TRECHO: "a gente foi na praia no fim de semana mas choveu" → {"topicos":[]}',
].join('\n');

export async function propor({ base, janela, cena, jaAnotado = [] }) {
  const user = `CENA: ${cena || 'conversa'}\nJÁ ANOTADO NESTA CONVERSA: ${jaAnotado.length ? jaAnotado.join(', ') : 'nada'}\nTRECHO: "${janela}"`;
  const r = await chat(base, [{ role: 'system', content: SIS_TOPICOS }, { role: 'user', content: user }], { max_tokens: 90, temperature: 0 });
  let topicos = [];
  try { topicos = JSON.parse(r.texto.slice(r.texto.indexOf('{'), r.texto.lastIndexOf('}') + 1)).topicos || []; } catch { topicos = []; }
  const ja = new Set(jaAnotado.map(semAcento));
  topicos = topicos.filter((x) => x && x.t && !ja.has(semAcento(x.t))).slice(0, 3).map((x) => ({ t: String(x.t).slice(0, 60), busca: String(x.busca || x.t).slice(0, 80),
    ...(x.sigla && /^[A-Z0-9/.-]{2,8}$/.test(String(x.t).trim()) ? { sigla: String(x.sigla).slice(0, 80) } : {}) }));
  return { topicos, ms: r.ms };
}

// ---------------------------------------------------------------- 3. o Jev decide
export function perguntasJev(topicos) {
  const q = {};
  topicos.forEach((x, i) => {
    q[`nota_${i}`] = { type: 'choice', instructions: `Para quem está ouvindo esta conversa, o que é “${x.t}”?`, criteria: CLASSES };
    if (x.candidatos && x.candidatos.length) {
      q[`fonte_${i}`] = { type: 'choice', instructions: `Qual destes artigos da Wikipédia é sobre o “${x.t}” de que a conversa está falando? Se for assunto atual, prefira o artigo do acontecimento deste ano ao artigo geral.`,
        criteria: { ...Object.fromEntries(x.candidatos.map((c, k) => [`a${k}`, `${c.titulo}: ${c.resumo}`])), nenhum: 'Nenhum: todos falam de outra coisa com o mesmo nome, ou de algo só vizinho ao assunto' } };
    }
    if (x.sigla) q[`sigla_${i}`] = { type: 'noul', instructions: `Nesta conversa, a sigla “${x.t}” quer dizer “${x.sigla}”?`,
      criteria: { true: 'Sim, esse é o significado certo da sigla neste assunto', false: 'Não: o significado está errado, inventado ou é de outra coisa' } };
  });
  return q;
}
export function estadoJev({ janela, cena, jaAnotado, topicos }) {
  return {
    cena: `Notas ao vivo para quem está numa ${cena || 'conversa'}: só entra na tela o que ajuda a acompanhar o assunto.`,
    hoje: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }),
    trecho_da_conversa: janela,
    ja_anotado: jaAnotado.length ? jaAnotado : 'nada',
    topicos_propostos: topicos.map((x) => x.t),
  };
}
export function interpretarJev(answers, topicos) {
  return topicos.map((x, i) => {
    const probs = answers?.[`nota_${i}`]?.probabilities || {};
    const util = ['termo', 'nome', 'historia', 'atualidade'];
    const vale = util.reduce((s, k) => s + (+probs[k] || 0), 0);
    const [tipo] = util.map((k) => [k, +probs[k] || 0]).sort((a, b) => b[1] - a[1])[0];
    // o artigo escolhido pelo Jev (só com ≥ 0,5 e diferente de "nenhum")
    const fp = answers?.[`fonte_${i}`]?.probabilities || {};
    const [fk, fprob] = Object.entries(fp).sort((a, b) => b[1] - a[1])[0] || ['nenhum', 0];
    const artigo = fk !== 'nenhum' && fprob >= 0.5 && x.candidatos ? x.candidatos[+fk.slice(1)] : null;
    const sp = answers?.[`sigla_${i}`];
    const siglaP = sp ? +(typeof sp.noul === 'number' ? sp.noul : sp.probability ?? 0) : null;
    const { candidatos, ...resto } = x;
    return { ...resto, vale: +vale.toFixed(2), tipo, probs: Object.fromEntries(Object.entries(probs).map(([k, v]) => [k, +(+v).toFixed(2)])),
      candidatos: (candidatos || []).map((c) => c.titulo), artigo, artigo_p: +(+fprob).toFixed(2), sigla_p: siglaP == null ? null : +siglaP.toFixed(2) };
  });
}

// ---------------------------------------------------------------- 4. fonte
function doGlossario(t) {
  const n = semAcento(t);
  const g = GLOSSARIO.find((x) => semAcento(x.t) === n);
  return g ? `${g.t}: ${g.d}.` : null;
}
// Candidatos da Wikipédia: a busca contextual do tópico primeiro ("ATP adenosina trifosfato"), depois o próprio tópico.
// Até 5 artigos, cada um com a ABERTURA inteira (o resumo curto cortava, por exemplo, a lista de candidatos da eleição).
// Não há filtro de relevância por palavra: o Jev escolhe, pelo contexto da conversa, qual artigo é o certo (ou nenhum).
async function buscaWiki(q) {
  const s = await (await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3&utf8=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) })).json();
  return (s.query?.search || []).map((h) => h.title);
}
export async function candidatosWiki({ t, busca }) {
  try {
    const [a, b] = await Promise.all([buscaWiki(busca), semAcento(busca) !== semAcento(t) ? buscaWiki(t) : Promise.resolve([])]);
    const titulos = [...new Set([...a, ...b])].slice(0, 5);
    if (!titulos.length) return [];
    const e = await (await fetch(`https://pt.wikipedia.org/w/api.php?action=query&prop=extracts|info|pageprops&exintro=1&explaintext=1&inprop=url&redirects=1&titles=${encodeURIComponent(titulos.join('|'))}&format=json&utf8=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) })).json();
    const paginas = Object.values(e.query?.pages || {});
    const redir = Object.fromEntries((e.query?.redirects || []).map((r) => [r.from, r.to]));
    const out = [];
    for (const titulo of titulos) {
      const pg = paginas.find((x) => x.title === (redir[titulo] || titulo));
      if (!pg || !pg.extract || (pg.pageprops && 'disambiguation' in pg.pageprops) || out.some((c) => c.titulo === pg.title)) continue;
      const texto = pg.extract.replace(/\s+/g, ' ').trim();
      out.push({ titulo: pg.title, url: pg.fullurl, texto, resumo: (texto.match(/^.{20,220}?[.!?](\s|$)/) || [texto.slice(0, 200)])[0].trim() });
    }
    return out;
  } catch { return []; }
}
async function noticias(busca) {
  const t0 = performance.now();
  try {
    const xml = await (await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(busca + ' when:60d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) })).text();
    const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
      const pega = (tag) => (m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '';
      const dec = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      return { titulo: dec(pega('title')), data: new Date(pega('pubDate')), fonte: dec(pega('source')), url: dec(pega('link')) };
    }).filter((x) => x.titulo && !isNaN(x.data)).sort((a, b) => b.data - a.data).slice(0, 5);
    if (!itens.length) return null;
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { fonte: 'Google Notícias', titulo: `${itens.length} manchetes recentes`, url: itens[0].url, itens: itens.map((x) => ({ titulo: x.titulo, data: fmt(x.data), fonte: x.fonte, url: x.url })),
      texto: itens.map((x) => `(${fmt(x.data)}) ${x.titulo}`).join('\n'), ms: Math.round(performance.now() - t0) };
  } catch { return null; }
}
export async function fundamentar({ t, busca, tipo, artigo }) {
  const fontes = [];
  const g = doGlossario(t);
  if (g) fontes.push({ fonte: 'glossário', titulo: t, texto: g });
  if (artigo) fontes.push({ fonte: 'Wikipédia', titulo: artigo.titulo, url: artigo.url, texto: artigo.texto.slice(0, tipo === 'atualidade' ? 1100 : 650) });
  if (tipo === 'atualidade') { const n = await noticias(busca); if (n) fontes.push(n); }
  return fontes;
}

// ---------------------------------------------------------------- 5. a nota
const SIS_NOTA = [
  'Você escreve NOTAS AO VIVO que aparecem na tela de alguém durante uma aula, reunião ou entrevista. A pessoa bate o olho em 3 segundos.',
  'Formato obrigatório:',
  '1ª linha: o TÓPICO em CAIXA ALTA, com a mesma grafia do TÓPICO. Sigla vira "SIGLA: SIGNIFICADO POR EXTENSO".',
  'Depois, de 2 a 4 linhas curtas começando com "- ". Use um rótulo em CAIXA ALTA com dois-pontos quando ajudar (O QUE É:, PARA QUE SERVE:, DATA:, QUEM:, ONDE:, POR QUE IMPORTA:, HOJE:).',
  'Linguagem simples e informal, com comparação do dia a dia quando couber, como quem explica para um amigo, mas em português correto e frases que fazem sentido. No máximo 35 palavras no total, no máximo 3 linhas depois do título.',
  'Fatos, datas, números e nomes: só os da FONTE ou os que você tem certeza. Se a FONTE não trouxer um dado atual, não chute: deixe a linha de fora.',
  'O trecho da conversa NÃO é fonte: não repita o que a pessoa disse como se fosse fato confirmado.',
  'Sem introdução, sem markdown (sem **, sem #), sem emojis.',
  '',
  'EXEMPLOS DO JEITO CERTO:',
  'B2B: BUSINESS TO BUSINESS',
  '- Venda de um negócio para OUTRO NEGÓCIO (não para o consumidor final)',
  '- EXEMPLO: uma empresa que vende software de gestão para indústrias',
  '',
  'EVALS',
  '- O QUE É: tipo PROVA DE ESCOLA que a IA faz antes de ir para o público',
  '- PARA QUE SERVE: medir a QUALIDADE, achar ALUCINAÇÕES, comparar VERSÕES',
  '',
  'ELEIÇÃO NO BRASIL',
  '- DATA: (a data que estiver na fonte)',
  '- PRINCIPAIS CANDIDATOS: (os nomes que estiverem na fonte)',
].join('\n');

// artigos e preposições do português (nas siglas em inglês elas contam: ROAS = Return On Ad Spend)
const PARADAS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'a', 'o', 'as', 'os', 'um', 'uma']);
// "CLT" × "Consolidação das Leis do Trabalho": as letras da sigla aparecem, em ordem, nas iniciais das palavras
export function expande(sigla, texto) {
  const letras = sigla.toUpperCase().replace(/[^A-Z]/g, '');
  if (letras.length < 2 || letras.length > 6 || sigla.trim().includes(' ')) return false;
  const ini = semAcento(texto).split(/[^\p{L}\p{N}]+/u).filter((w) => w && !PARADAS.has(w)).map((w) => w[0].toUpperCase()).join('');
  if (ini.length < letras.length || ini.length > letras.length + 2) return false;
  let i = 0; for (const c of ini) if (c === letras[i]) i++;
  return i === letras.length && ini[0] === letras[0];
}

export async function escrever({ base, janela, cena, topico, fontes }) {
  const fonteTxt = fontes.length ? fontes.map((f) => `FONTE (${f.fonte}${f.titulo ? ': ' + f.titulo : ''}):\n${f.texto}`).join('\n\n') : 'FONTE: nenhuma (use só o que você tem certeza)';
  const ano = new Date().getFullYear();
  const pedido = topico.tipo === 'atualidade'
    ? `A FONTE é mais nova que o seu conhecimento (estamos em ${ano}): se ela diz que algo já aconteceu, aconteceu. Escreva a nota com os dados mais importantes da FONTE (o que está acontecendo, a data que importa, os nomes ou o número principal), cada um com um rótulo que combine com ele. DATA só se a data estiver escrita na FONTE e for a do fato (nunca a data de publicação das manchetes). Não escreva rótulo sem dado e nunca escreva "não especificado".`
    : 'Escreva a nota.';
  const user = `CENA: ${cena || 'conversa'}\nTRECHO DA CONVERSA: "${janela}"\nTÓPICO: ${topico.t}\nTIPO: ${topico.tipo} (${TIPOS[topico.tipo] || ''})\n${fonteTxt}\n\n${pedido}`;
  const r = await chat(base, [{ role: 'system', content: SIS_NOTA }, { role: 'user', content: user }], { max_tokens: 100, temperature: 0.2 });
  const linhas = r.texto.replace(/\*\*/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (r.cortado && linhas.length > 2) linhas.pop();          // a última linha saiu pela metade (teto de tokens)
  // o 4B ainda escreve "(nomes não listados na fonte)": linha sem dado não vai para a tela
  for (let i = linhas.length - 1; i >= 1; i--) if (/n[ãa]o (listad|especificad|informad|mencionad|dispon[ií]ve)|sem (dado|informa)|\bn\/d\b/i.test(linhas[i])) linhas.splice(i, 1);
  // o título é o tópico com a grafia certa (o modelo errava: "BASTILIA", "REVOLOÇÃO"). Significado de sigla só confere:
  // do título da Wikipédia ou do modelo, e só se as iniciais baterem (o modelo inventava "CLT: CONTRATO DE TRABALHO…")
  const wiki = (fontes.find((f) => f.fonte === 'Wikipédia') || {}).titulo || '';
  const sig = (topico.sigla && topico.sigla_p >= 0.7 ? topico.sigla : '') || [wiki.replace(/\s*\(.*\)$/, '')].find((c) => c && semAcento(c) !== semAcento(topico.t) && expande(topico.t, c)) || '';
  const titulo = topico.t.toUpperCase() + (sig ? ': ' + sig.toUpperCase() : '');
  const corpo = linhas.slice(1).map((l) => (l.startsWith('- ') ? l : '- ' + l.replace(/^[-•*]\s*/, ''))).slice(0, 3);
  return { titulo, linhas: corpo, ms: r.ms, bruto: r.texto };
}

// ---------------------------------------------------------------- uma janela, ponta a ponta
export async function processarJanela({ base, jev, janela, cena, jaAnotado = [], termos = [] }) {
  const t0 = performance.now();
  const pedacos = ajustar(janela, termos);
  let ajustada = textoFinal(pedacos, {});
  let custo = 0, msAjuste = null;
  // termo que também é palavra comum ("cloud code", "toque"): o Jev decide pelo contexto antes de a IA ler o trecho
  const qAj = perguntasAjuste(pedacos);
  if (Object.keys(qAj).length) {
    const ta = performance.now();
    const r0 = await jev({ state: { cena: `transcrição automática de uma ${cena || 'conversa'}; os termos marcados podem ter sido ouvidos errado`, trecho: textoMarcado(pedacos) }, questions: qAj });
    ajustada = textoFinal(pedacos, escolhasAjuste(r0.answers, pedacos).escolhas);
    custo += r0.cost || 0; msAjuste = Math.round(performance.now() - ta);
  }
  const p = await propor({ base, janela: ajustada, cena, jaAnotado });
  const out = { ajustada, propostos: p.topicos, ms: { ajuste: msAjuste, topicos: p.ms }, notas: [], decisoes: [], jev_custo: custo };
  if (!p.topicos.length) { out.ms.total = Math.round(performance.now() - t0); return out; }
  const tc = performance.now();
  const cands = await Promise.all(p.topicos.map((x) => candidatosWiki(x)));
  p.topicos.forEach((x, i) => { x.candidatos = cands[i]; });
  out.ms.candidatos = Math.round(performance.now() - tc);
  const tj = performance.now();
  const r = await jev({ state: estadoJev({ janela: ajustada, cena, jaAnotado, topicos: p.topicos }), questions: perguntasJev(p.topicos) });
  out.ms.jev = Math.round(performance.now() - tj);
  out.jev_n = Object.keys(r.answers || {}).length;
  out.jev_custo += r.cost || 0;
  out.decisoes = interpretarJev(r.answers, p.topicos);
  out.propostos = p.topicos.map(({ candidatos, ...x }) => x);
  const escolhidos = out.decisoes.filter((d) => d.vale >= LIMIAR_NOTA).slice(0, 2);
  // uma nota de cada vez, a mais útil primeiro (em paralelo as duas dividem a CPU e a 1ª chegava mais tarde);
  // a fonte da próxima já é buscada enquanto a IA escreve a anterior
  const fontesP = escolhidos.map((topico) => { const tf = performance.now(); return fundamentar(topico).then((f) => ({ f, ms: Math.round(performance.now() - tf) })); });
  for (const [i, topico] of escolhidos.entries()) {
    const { f: fontes, ms: msFonte } = await fontesP[i];
    const nota = await escrever({ base, janela: ajustada, cena, topico, fontes });
    out.notas.push({ topico: topico.t, tipo: topico.tipo, vale: topico.vale, artigo_p: topico.artigo_p, sigla: topico.sigla || null, sigla_p: topico.sigla_p,
      fontes: fontes.map(({ texto, ...f }) => f), ms_fonte: msFonte, ms_desde_inicio: Math.round(performance.now() - t0), ...nota });
  }
  out.ms.total = Math.round(performance.now() - t0);
  return out;
}

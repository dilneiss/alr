// Resposta com FONTE para pergunta de conhecimento geral (história, ciência, cultura…) que não está no contexto de Você.
// Sem isto, o modelo de texto pequeno inventava: numa aula sobre Apolo, "Apoio… ajuda Odisséu… criou a arca de ouro… deus
// da aritmética", e nada sobre a pergunta ("em que outros livros ele aparece?") — e o artigo da Wikipédia tinha a resposta.
//   1. busca na Wikipédia com as palavras da pergunta e das últimas falas ("ele" = Apolo vem da fala anterior)
//   2. o JEV escolhe qual dos artigos candidatos responde (ou nenhum)
//   3. o artigo inteiro vira frases; o JEV marca, frase por frase (noul), o que responde — uma chamada, até 48 frases
//   4. as frases marcadas aparecem NA HORA (texto da fonte, sem IA escrevendo); a IA de texto resume depois
// Medido na pergunta do Apolo: a IA de texto descobrindo o assunto levava ~4,5 s e errava ("Apolo no Odisseia" → artigo da
// Odisseia); a busca por palavras + escolha do Jev leva ~1 s.
const UA = 'MiniCluely/0.1 (jev showcase; voce@exemplo.com)';
const semAcento = (s) => String(s || '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
const PARADAS = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem que qual quais quem quando onde como e ou se '
  + 'ele ela eles elas isso esse essa este esta aquele aquela mesmo so outros outras outro outra existem existe foi era sao tem ter tinha ser estar esta estao '
  + 'professor professora voce voces gente eu nos meu minha seu sua sobre mais menos muito pouco tambem entao ai la aqui agora hoje ontem sim nao ne tipo coisa '
  + 'quero queria gostaria saber falar fala disse diz acho sei vai vamos pode posso livro livros aparece aparecem exatamente verdade').split(' '));
const palavras = (s) => semAcento(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !PARADAS.has(w));
const wiki = (params, ms = 5000) => fetch(`https://pt.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', utf8: '1', ...params })}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) }).then((r) => r.json());

// nomes próprios (o Scribe escreve com maiúscula) valem mais na busca; palavras da pergunta atual vêm antes
function termosDeBusca(pergunta, conversa) {
  const nomes = [], comuns = [];
  for (const texto of [pergunta, ...conversa.slice().reverse()]) {
    for (const m of texto.matchAll(/(?<![.!?]\s|^)\b(\p{Lu}[\p{L}\p{N}-]+(?:\s+(?:de|da|do|dos|das)?\s*\p{Lu}[\p{L}\p{N}-]+)*)/gu)) nomes.push(m[1]);
    comuns.push(...palavras(texto));
  }
  const vistos = new Set();
  return [...nomes, ...comuns].filter((w) => { const k = semAcento(w); if (vistos.has(k) || PARADAS.has(k)) return false; vistos.add(k); return true; }).slice(0, 7);
}

// 1. candidatos: busca com as palavras (2 buscas: com e sem as palavras comuns) + a abertura de cada artigo
export async function candidatos(pergunta, conversa) {
  const termos = termosDeBusca(pergunta, conversa);
  if (!termos.length) return { termos, lista: [] };
  // 3 buscas: só os nomes próprios da conversa ("Bastilha" → "Tomada da Bastilha"), os 2 primeiros termos e todos
  const nomes = termos.filter((t) => /^\p{Lu}/u.test(t));
  const buscas = [nomes.slice(0, 2).join(' '), termos.slice(0, 2).join(' '), termos.join(' ')].filter((q, i, arr) => q && arr.indexOf(q) === i);
  const rs = await Promise.all(buscas.map((q) => wiki({ action: 'query', list: 'search', srsearch: q, srlimit: '3' })));
  const titulos = [...new Set(rs.flatMap((r) => (r.query?.search || []).map((h) => h.title)))].slice(0, 6);
  if (!titulos.length) return { termos, lista: [] };
  const e = await wiki({ action: 'query', prop: 'extracts|info|pageprops', exintro: '1', explaintext: '1', inprop: 'url', redirects: '1', titles: titulos.join('|') });
  const pgs = Object.values(e.query?.pages || {}).filter((p) => p.extract && !(p.pageprops && 'disambiguation' in p.pageprops));
  return { termos, lista: pgs.slice(0, 6).map((p, i) => ({ k: 'a' + i, titulo: p.title, url: p.fullurl, resumo: (p.extract.replace(/\s+/g, ' ').match(/^.{20,200}?[.!?](\s|$)/) || [p.extract.slice(0, 180)])[0].trim() })) };
}

// 3. frases do artigo escolhido (as que mais se ligam à pergunta primeiro, até 48)
export async function frases(titulo, pergunta, conversa) {
  const e = await wiki({ action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: titulo }, 7000);
  const pg = Object.values(e.query?.pages || {})[0];
  if (!pg || !pg.extract) return [];
  const chave = new Set([...palavras(pergunta), ...conversa.flatMap(palavras)]);
  const todas = pg.extract.split(/\n+/).filter((p) => p.length >= 60 && !/^=+/.test(p.trim()))
    .flatMap((p) => p.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((f) => f.trim()).filter((f) => f.length >= 40 && f.length <= 420)
    .map((t, i) => ({ i, t, n: palavras(t).filter((w) => chave.has(w)).length }));
  return [...todas].sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 48).sort((a, b) => a.i - b.i).map(({ i, t }) => ({ id: 'f' + String(i).padStart(3, '0'), t }));
}

export async function responderComFonte({ base, jev, conversa, pergunta, onPrevia, escreverResumo }) {
  const t0 = performance.now();
  const ms = {};
  const c = await candidatos(pergunta, conversa);
  ms.busca = Math.round(performance.now() - t0);
  if (!c.lista.length) return { ok: false, motivo: 'a Wikipédia não trouxe nada para: ' + c.termos.join(' '), ms };
  // 2. o Jev escolhe o artigo
  const r1 = await jev({ state: { cena: 'Uma pergunta foi feita numa conversa ao vivo. Qual artigo de enciclopédia responde?', conversa: conversa.slice(-3), pergunta },
    questions: { artigo: { type: 'choice', instructions: 'Qual destes artigos da Wikipédia responde à PERGUNTA (resolvendo "ele", "ela" pela conversa)?',
      criteria: { ...Object.fromEntries(c.lista.map((x) => [x.k, `${x.titulo}: ${x.resumo}`])), nenhum: 'Nenhum destes artigos responde' } } } });
  const probs = r1.answers?.artigo?.probabilities || {};
  const [k, p] = Object.entries(probs).sort((a, b) => b[1] - a[1])[0] || ['nenhum', 0];
  ms.jev_artigo = Math.round(performance.now() - t0) - ms.busca;
  const art = c.lista.find((x) => x.k === k);
  if (!art || p < 0.45) return { ok: false, motivo: 'nenhum artigo responde', candidatos: c.lista.map((x) => x.titulo), ms };
  // 3. o Jev marca as frases que respondem
  const fs = await frases(art.titulo, pergunta, conversa);
  const t2 = performance.now();
  const r2 = await jev({ state: { cena: 'Escolha as frases do artigo que respondem à pergunta feita na conversa.', conversa: conversa.slice(-3), pergunta, artigo: art.titulo },
    questions: Object.fromEntries(fs.map((f) => [f.id, { type: 'noul', instructions: `Esta frase responde (mesmo em parte) à PERGUNTA? "${f.t}"`, criteria: { true: 'Sim, traz um fato que responde', false: 'Não responde' } }])) });
  ms.jev_frases = Math.round(performance.now() - t2);
  const nota = (x) => (typeof x?.noul === 'number' ? x.noul : 0);
  const boas = fs.map((f) => ({ ...f, v: nota(r2.answers?.[f.id]) })).filter((f) => f.v >= 0.5).sort((a, b) => b.v - a.v).slice(0, 4).sort((a, b) => a.id.localeCompare(b.id));
  const custo = (r1.cost || 0) + (r2.cost || 0);
  if (!boas.length) return { ok: false, motivo: 'nenhuma frase do artigo responde', artigo: art, ms, custo };
  const fonte = { titulo: art.titulo, url: art.url };
  ms.previa = Math.round(performance.now() - t0);
  // 4a. na hora: as frases da fonte (não passam pela IA)
  if (onPrevia) onPrevia({ fonte, frases: boas.map((f) => f.t), ms: ms.previa });
  // 4b. depois: a IA de texto resume em linguagem simples, só com essas frases
  const t3 = performance.now();
  const sis = [
    'Você escreve uma NOTA AO VIVO que responde à PERGUNTA feita numa aula ou reunião, usando SÓ as FRASES da fonte.',
    'Formato: 1ª linha = título curto em CAIXA ALTA que responde à pergunta. Depois de 2 a 4 linhas começando com "- ", cada uma com a palavra-chave em CAIXA ALTA e o fato em poucas palavras.',
    'Português do Brasil, linguagem simples, grafia dos nomes igual à das FRASES. Nada que não esteja nas FRASES. Sem introdução, sem markdown, sem emojis. No máximo 45 palavras.',
  ].join('\n');
  const messages = [{ role: 'system', content: sis }, { role: 'user', content: `PERGUNTA: ${pergunta}\nFRASES (Wikipédia: ${art.titulo}):\n${boas.map((f) => '- ' + f.t).join('\n')}\n\nEscreva a nota.` }];
  let texto = '';
  try {
    if (escreverResumo) texto = String(await escreverResumo(messages) || '').trim();
    else {
      const rr = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ model: 'x', messages, max_tokens: 130, temperature: 0.2, top_p: 0.8, top_k: 20, cache_prompt: true }) });
      texto = rr.ok ? ((await rr.json()).choices?.[0]?.message?.content || '').trim() : '';
    }
  } catch { texto = ''; }                          // sem resumo, ficam as frases da fonte (já na tela)
  ms.resumo = Math.round(performance.now() - t3);
  ms.total = Math.round(performance.now() - t0);
  return { ok: true, fonte, frases: boas.map((f) => ({ id: f.id, v: +f.v.toFixed(2), t: f.t })), texto, termos: c.termos, candidatos: c.lista.map((x) => x.titulo), ms, custo };
}

/* Busca tradicional por palavra-chave — implementação honesta, como a de uma loja comum:
   normaliza (minúsculas, sem acento), tira palavras vazias, reduz plural, aplica uma lista pequena de sinônimos
   e pontua por campo (nome > categoria > público/descrição) com peso IDF. Busca por prefixo enquanto digita.
   Não entende intenção, ocasião, orçamento nem negação — e é justamente isso que o vídeo compara. */
(function () {
  'use strict';
  const semAcento = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const STOP = new Set(('a o as os um uma uns umas de da do das dos d pra pro pras pros para por pelo pela com sem que e ou em no na nos nas num numa ao aos ' +
    'meu minha meus minhas seu sua seus suas teu tua eu tu ele ela eles elas voce voces me te se lhe isso isto esse essa este esta aquele aquela ' +
    'muito muita muitos muitas mais menos bem so ja nao sim quero queria preciso gostaria algo alguma algum alguns algumas coisa coisas tipo tem ter ' +
    'ta to estou esta sou ser foi era ate como qual quais quem onde quando porque pq bom boa todo toda todos todas qualquer ' +
    'the for an of to and or with my i is it in on at').split(' '));
  // lista curta de sinônimos, do tipo que lojas configuram no buscador (sinônimos de verdade + variações que um
  // stemmer de português como o RSLP juntaria, ex.: correr/corrida, cozinhar/cozinha). "jardinagem" NÃO vira "jardim":
  // nenhum stemmer junta as duas, e a busca comum não sabe que quem gosta de jardinagem compra coisas de jardim.
  const SIN = {
    cachorro: ['cao', 'caes'], cao: ['cachorro'], caes: ['cachorro'], cachorrinho: ['cachorro', 'cao'], gato: ['gatos'], gatinho: ['gato'],
    acampar: ['camping', 'acampamento'], acampamento: ['camping', 'acampar'], camping: ['acampamento', 'acampar'],
    celular: ['smartphone'], notebook: ['laptop'], correr: ['corrida'], corrida: ['correr'], cozinhar: ['cozinha'],
  };
  function stem(w) {
    if (w.length <= 3 || /^\d+$/.test(w)) return w;
    if (/(oes|aes)$/.test(w)) return w.slice(0, -3) + 'ao';
    if (/ais$/.test(w)) return w.slice(0, -3) + 'al';
    if (/eis$/.test(w)) return w.slice(0, -3) + 'el';
    if (/ns$/.test(w)) return w.slice(0, -2) + 'm';
    if (/(res|zes|ses)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  const tokens = (s) => semAcento(s).split(/[^a-z0-9]+/).filter(Boolean);
  const CAMPOS = [['nome', 3], ['categoria', 2], ['publico', 1], ['desc', 1]];
  let docs = [], df = new Map(), N = 1;

  function build(produtos, categorias) {
    docs = produtos.map((p) => {
      const f = {
        nome: tokens(p.nome).map(stem), desc: tokens(p.desc).map(stem), publico: tokens(p.publico).map(stem),
        categoria: tokens((categorias[p.categoria] || {}).label || p.categoria).map(stem),
      };
      return { id: p.id, f, all: new Set([...f.nome, ...f.desc, ...f.publico, ...f.categoria]) };
    });
    N = docs.length; df = new Map();
    for (const d of docs) for (const t of d.all) df.set(t, (df.get(t) || 0) + 1);
  }

  // termos da consulta: cada termo vira um grupo {termo original, variantes aceitas}
  function queryTerms(q) {
    const out = [];
    const seen = new Set();
    for (const raw of tokens(q)) {
      if (STOP.has(raw) || raw.length < 2) continue;
      const base = stem(raw);
      if (seen.has(base)) continue; seen.add(base);
      const vars = new Set([base, ...(SIN[raw] || []).map(stem), ...(SIN[base] || []).map(stem)]);
      out.push({ raw, vars: [...vars] });
    }
    return out;
  }

  function matchTok(tok, v, prefixOk) { return tok === v || (prefixOk && v.length >= 3 && tok.startsWith(v)); }

  // devolve [{ id, score, termos: [palavras que casaram] }] ordenado
  function search(q, opts) {
    opts = opts || {};
    const terms = queryTerms(q);
    if (!terms.length) return { terms, results: [] };
    const res = [];
    for (const d of docs) {
      let score = 0; const hit = [];
      terms.forEach((t, ti) => {
        const last = ti === terms.length - 1 && opts.typing; // prefixo só na palavra que está sendo digitada
        let best = 0, bestIdf = 0;
        for (const [campo, w] of CAMPOS) {
          for (const tok of d.f[campo]) {
            for (const v of t.vars) {
              if (matchTok(tok, v, last || v.length >= 5)) {
                const idf = Math.log(1 + N / ((df.get(tok) || 1) + 0.5));
                if (w * idf > best) { best = w * idf; bestIdf = idf; }
              }
            }
          }
        }
        if (best > 0) { score += best; hit.push(t.raw); }
      });
      if (score > 0) res.push({ id: d.id, score: Math.round(score * 100) / 100, termos: hit, nTermos: hit.length });
    }
    res.sort((a, b) => b.nTermos - a.nTermos || b.score - a.score || (a.id < b.id ? -1 : 1));
    return { terms, results: res };
  }

  // destaca no texto as palavras que casaram (para mostrar POR QUE a busca comum escolheu o produto)
  function highlight(text, termos) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (!termos || !termos.length) return esc(text);
    const words = String(text).split(/(\s+)/);
    const want = [];
    for (const t of termos) { const vars = [stem(t), ...(SIN[t] || []).map(stem)]; want.push(...vars); }
    return words.map((w) => {
      const tk = tokens(w).map(stem);
      const hit = tk.some((x) => want.some((v) => x === v || (v.length >= 3 && x.startsWith(v))));
      return hit ? `<mark>${esc(w)}</mark>` : esc(w);
    }).join('');
  }

  window.KeywordSearch = { build, search, highlight, queryTerms };
})();

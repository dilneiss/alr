// Das respostas do Jev ao "contexto" que os renderizadores usam (site, marca, carrosséis, e-mail e anúncios). Nada aqui decide por palavra-chave:
// toda escolha criativa é o argmax (ou o sorteio do "Outra versão") das probabilidades que o Jev devolveu.
// O código só (1) extrai LITERAIS da fala — nome e cidade — e (2) combina escolhas do Jev (ex.: formato × gancho).
import * as B from '../lib/biblioteca.mjs';
import { ICONE } from '../lib/icones.mjs';
import { META } from '../lib/perguntas.mjs';
import { PACOTES } from '../lib/segmentos.mjs';
import { cap, preencher, preco, slug, semAcento, tokens, clamp } from './util.mjs';

const porId = (lista) => Object.fromEntries(lista.map((o) => [o.id, o]));
export const IDX = {
  seg: porId(B.SEGMENTOS), pers: porId(B.PERSONALIDADES), pub: porId(B.PUBLICOS), obj: porId(B.OBJETIVOS), canal: porId(B.CANAIS),
  ang: porId(B.ANGULOS), hero: porId(B.HEROS), titulo: porId(B.TITULOS), cta: porId(B.CTAS), img: porId(B.ESTILOS_IMG), btn: porId(B.BOTOES),
  cantos: porId(B.CANTOS), textura: porId(B.TEXTURAS), paleta: porId(B.PALETAS), fonte: porId(B.FONTES), forma: porId(B.FORMAS),
  disp: porId(B.DISPOSICOES), caixa: porId(B.CAIXAS), slogan: porId(B.SLOGANS), fundo: porId(B.FUNDOS), item: porId(B.PAPEIS_ITEM),
  leg: porId(B.LEGENDAS), ctaPost: porId(B.CTAS_POST), oferta: porId(B.OFERTAS), gancho: porId(B.GANCHOS), estilo: porId(B.ESTILOS_LOGO),
  carEstilo: porId(B.ESTILOS_CAR), emTipo: porId(B.TIPOS_EMAIL), assunto: porId(B.ASSUNTOS), emCab: porId(B.CABECALHOS_EMAIL), emHero: porId(B.HEROS_EMAIL),
  emCta: porId(B.CTAS_EMAIL), ass: porId(B.ASSINATURAS), assBanner: porId(B.BANNERS_ASS), adConceito: porId(B.CONCEITOS_AD), adTitulo: porId(B.TITULOS_AD),
  adEstilo: porId(B.ESTILOS_AD), adCta: porId(B.CTAS_AD), adSelo: porId(B.SELOS_AD), adAnim: porId(B.ANIMACOES_AD),
};

// ------------------------------------------------------------------ extração literal (nome e cidade)
const PARADAS = new Set(['e', 'que', 'em', 'no', 'na', 'nos', 'nas', 'aqui', 'fica', 'com', 'pra', 'para', 'mas', 'porque', 'onde', 'tem', 'faz', 'faço',
  'eu', 'nós', 'a gente', 'somos', 'sou', 'é', 'desde', 'há', 'perto', 'lá', 'aí', 'né', 'tipo', 'clima', 'o', 'a', 'os', 'as', 'um', 'uma', 'meu', 'minha',
  'nosso', 'nossa', 'bem', 'muito', 'então', 'também', 'já', 'quero', 'queria', 'vende', 'vendo', 'atende', 'trabalho', 'trabalha', 'mais', 'sem', 'só', 'agora']);
const LIGA = new Set(['da', 'do', 'de', 'das', 'dos', '&', 'e']);
const RE_NOME = /(?:se\s+chama(?:va)?|chamad[oa]|batizad[oa]\s+de|(?:o\s+)?nome\s+(?:dele\s+|dela\s+|d[ao]\s+[a-zà-ú]+\s+)?(?:é|e|vai\s+ser|será))\s*[:,]?\s*["“'«]?([^,.;:!?\n"”'»()]{2,48})/i;

export function extrairNome(texto) {
  const m = String(texto || '').match(RE_NOME);
  if (!m) return '';
  const pal = m[1].trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < pal.length && out.length < 5; i++) {
    const w = pal[i], lw = w.toLowerCase();
    if (!out.length && ['o', 'a', 'os', 'as', 'um', 'uma'].includes(lw)) continue;
    if (out.length && LIGA.has(lw) && i + 1 < pal.length && !PARADAS.has(pal[i + 1].toLowerCase())) { if (lw === 'e') break; out.push(lw); continue; }
    if (PARADAS.has(lw)) break;
    out.push(w);
  }
  while (out.length && LIGA.has(out[out.length - 1].toLowerCase())) out.pop();
  if (!out.length) return '';
  const nome = out.map((w) => (LIGA.has(w) ? w : (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))).join(' ');
  return nome.length >= 2 ? nome.slice(0, 32) : '';
}

const AMBIGUAS = new Set(['natal', 'bonito', 'palmas', 'vitoria', 'pipa', 'santos', 'gramado', 'salvador', 'serra', 'contagem', 'olinda']);
const CIDADES_ORD = [...B.CIDADES].sort((a, b) => b.nome.length - a.nome.length).map((c) => ({ ...c, chave: semAcento(c.nome).toLowerCase() }));
export function extrairCidade(texto) {
  const t = ' ' + semAcento(String(texto || '')).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  let melhor = null;
  for (const c of CIDADES_ORD) {
    const re = AMBIGUAS.has(c.chave) ? new RegExp(`\\b(?:em|de|da|do)\\s+${c.chave}\\b`, 'g') : new RegExp(`\\b${c.chave}\\b`, 'g');
    let m;
    while ((m = re.exec(t))) {
      const fim = m.index + m[0].length;
      if (melhor && melhor.chave.includes(c.chave) && melhor.ini <= m.index && melhor.fimM >= fim) continue; // pedaço de nome maior
      if (!melhor || m.index > melhor.ini) melhor = { ...c, ini: m.index, fimM: fim };
    }
  }
  return melhor ? { nome: melhor.nome, uf: melhor.uf, ddd: melhor.ddd, prep: melhor.prep } : null;
}

// ------------------------------------------------------------------ leitura das respostas
export function resposta(R, q) { const m = META[q]; return m && R[m.grupo] ? R[m.grupo][q] : undefined; }
export function ranking(ans) { return Object.entries((ans && ans.probabilities) || {}).sort((a, b) => b[1] - a[1]); }
export function escolha(R, O, q) {
  if (O && O[q] != null) return O[q];
  const a = resposta(R, q);
  if (!a) return null;
  if (a.type === 'choice') return a.choice || (ranking(a)[0] || [])[0];
  if (a.type === 'score') return a.score;
  return a.noul;
}
const p = (R, q) => { const a = resposta(R, q); return a && a.type === 'noul' ? a.noul : 0; };
const prob = (R, q, id) => { const a = resposta(R, q); return (a && a.probabilities && a.probabilities[id]) || 0; };

// ------------------------------------------------------------------ "Outra versão": sorteio pelas probabilidades
export function candidatas(ans) {
  const r = ranking(ans);
  if (!r.length) return [];
  const topo = r[0][1];
  return r.filter(([, v], i) => i === 0 || (v >= 0.05 && v >= topo * 0.08)).slice(0, 5);
}
export function sortear(R, Oatual, semente = Math.random, travadas = {}) {
  const O = {};
  // decisões travadas por comando ("muda o logo…", "gostei, mantém") não entram no sorteio
  const livres = Object.keys(META).filter((q) => META[q].livre && resposta(R, q) && travadas[q] == null);
  const trocaveis = [];
  for (const q of livres) {
    const c = candidatas(resposta(R, q));
    const atual = escolha(R, Oatual, q);
    const alt = c.filter(([id]) => id !== atual);
    if (!alt.length) continue;
    trocaveis.push({ q, alt, peso: alt[0][1] });
  }
  // troca cada decisão com chance proporcional à confiança que o Jev deu às alternativas; garante ao menos 4 trocas
  trocaveis.sort((x, y) => y.peso - x.peso);
  const escolhidas = new Set();
  for (const t of trocaveis) if (semente() < clamp(0.2 + t.peso * 1.5, 0.2, 0.8)) escolhidas.add(t.q);
  for (const t of trocaveis) { if (escolhidas.size >= 4) break; escolhidas.add(t.q); }
  const mudancas = [];
  for (const t of trocaveis) {
    if (!escolhidas.has(t.q)) { if (Oatual && Oatual[t.q] != null) O[t.q] = Oatual[t.q]; continue; }
    const T = 1.25, pesos = t.alt.map(([, v]) => Math.pow(v, 1 / T));
    let x = semente() * pesos.reduce((s, v) => s + v, 0), pick = t.alt[0];
    for (let i = 0; i < t.alt.length; i++) { x -= pesos[i]; if (x <= 0) { pick = t.alt[i]; break; } }
    O[t.q] = pick[0];
    const pos = ranking(resposta(R, t.q)).findIndex(([id]) => id === pick[0]) + 1;
    mudancas.push({ q: t.q, id: pick[0], p: pick[1], pos });
  }
  return { O, mudancas };
}
// mantém só as trocas que ainda são boas depois de uma nova resposta do Jev
export function revalidar(R, O) {
  const out = {};
  for (const [q, id] of Object.entries(O || {})) {
    const c = candidatas(resposta(R, q));
    if (c.some(([x]) => x === id)) out[q] = id;
  }
  return out;
}

// ------------------------------------------------------------------ contexto completo
const EMO = { burger: '🍔', pizza: '🍕', cafe: '☕', cupcake: '🧁', talheres: '🍽️', cloche: '🍽️', chef: '👨‍🍳', tigela: '🥗', taca: '🍷', caneca: '🍺', sorvete: '🍦', trigo: '🥐', chama: '🔥', folha: '🌿', muda: '🌱', maca: '🍎', tesoura: '✂️', bigode: '💈', poste: '💈', gota: '💧', brilho: '✨', flor: '🌷', lotus: '🪷', dente: '🦷', coracao: '💛', pulso: '💓', estetoscopio: '🩺', cruz: '➕', mente: '🧠', maos: '🤲', halter: '💪', pata: '🐾', osso: '🦴', gato: '🐱', grafico: '📈', maleta: '💼', lampada: '💡', balanca: '⚖️', calculadora: '🧮', escudo: '🛡️', engrenagem: '⚙️', codigo: '💻', foguete: '🚀', megafone: '📣', alvo: '🎯', conversa: '💬', livro: '📚', capelo: '🎓', lapis: '✏️', globo: '🌎', estrela: '⭐', casa: '🏡', chave: '🔑', predio: '🏢', compasso: '📐', martelo: '🔨', rolo: '🎨', ferramenta: '🔧', carro: '🚗', cabide: '👗', camiseta: '👕', sacola: '🛍️', loja: '🏪', etiqueta: '🏷️', diamante: '💎', coroa: '👑', camera: '📸', aliancas: '💍', balao: '🎈', presente: '🎁', cama: '🛏️', sol: '☀️', onda: '🌊', montanha: '⛰️', aviao: '✈️', guitarra: '🎸', nota: '🎶', raio: '⚡', relogio: '⏰', moto: '🛵' };

const SEC_ORDEM = ['numeros', 'clientes', 'OFERTA', 'delivery', 'agendamento', 'como_funciona', 'antes_depois', 'sobre', 'galeria', 'equipe', 'depoimentos', 'faq', 'localizacao', 'lead'];
const OFERTA_SECS = ['cardapio', 'servicos', 'planos'];

export function montar({ R, O = {}, texto = '', nomeManual = '', ia = {}, agora = new Date() }) {
  const tem = { entender: !!R.entender, site: !!R.site, marca: !!R.marca, posts: !!R.posts, email: !!R.email, anuncios: !!R.anuncios };
  const E = (q) => escolha(R, O, q);
  const segId = E('seg') || 'outro';
  const pack0 = PACOTES[segId] || PACOTES.outro;
  const cidade = extrairCidade(texto);
  const nomeFala = extrairNome(texto);
  const nome = (nomeManual || nomeFala || pack0.nomes[0]).trim();
  const origemNome = nomeManual ? 'manual' : nomeFala ? 'fala' : 'provisorio';
  const emCidade = cidade ? ` ${cidade.prep} ${cidade.nome}` : '';
  const pers = IDX.pers[E('pers')] || B.PERSONALIDADES[0];
  const pub = IDX.pub[E('pub')] || IDX.pub.geral;
  const obj = IDX.obj[E('obj')] || IDX.obj.leads;
  const canal = IDX.canal[E('canal')] || IDX.canal.whatsapp;
  const precoScore = typeof E('preco') === 'number' ? E('preco') : 2;
  const precoNivel = clamp(Math.round(precoScore), 0, 4);
  const matScore = typeof E('mat') === 'number' ? E('mat') : 2;
  const mat = clamp(Math.round(matScore), 0, 4);
  const ano = agora.getFullYear() - B.MATURIDADE_ANOS[mat];
  const pack = coerenciaAnos(pack0, ano, agora.getFullYear());
  const dif = E('dif') || 'qualidade';
  const sobreTxt = pack.sobre.replace(/\b(?:19|20)\d{2}\b/g, String(ano)); // o ano de fundação segue a decisão do Jev (tempo de mercado)
  const fator = B.PRECO_FATOR[precoNivel];
  const itens = pack.itens.map(([n, d, v], i) => ({ i, nome: n, desc: d, preco: preco(v, fator, typeof v === 'number' ? pack.unid : ''), base: v }));
  const handle = slug(nome).slice(0, 24) || 'suamarca';
  const dominio = `${handle}.com.br`;
  const ddd = cidade ? cidade.ddd : 11;
  const telefone = `(${ddd}) 99999-0000`;
  const endereco = `Rua das Palmeiras, 240 · Centro${cidade ? ` · ${cidade.nome}/${cidade.uf}` : ''}`;
  const emojiNivel = typeof E('emoji') === 'number' ? clamp(Math.round(E('emoji')), 0, 3) : 1;
  const ofertaCand = IDX.oferta[E('oferta')] || IDX.oferta.nenhuma;
  const oferta = ofertaCand.id === 'nenhuma' ? null : ofertaCand;
  const icone = ICONE[E('icone')] || ICONE.estrela;
  // ícones de apoio da ilustração: os que o Jev também achou relevantes (2º e 3º lugar da mesma decisão, 2%+)
  const apoio = ranking(resposta(R, 'icone')).filter(([id, pr]) => id !== icone.id && pr >= 0.02 && ICONE[id]).slice(0, 2).map(([id]) => ICONE[id]);
  const emo = EMO[icone.id] || '✨';

  const base = {
    nome, cat: pack.cat, desc: pack.desc, produto: pack.produto, Produto: cap(pack.produto), em_cidade: emCidade, cidade: cidade ? cidade.nome : '',
    para_publico: pub.para, publico: pack.publico, oferta_curta: oferta ? oferta.curta : '', oferta_frase: oferta ? oferta.frase : '',
    mes: B.MESES[agora.getMonth()], dica_t: pack.dica[0], dica: pack.dica[1], item0: pack.itens[0][0], item1: pack.itens[1][0], item3: pack.itens[3][0],
    preco0: itens[0].preco, Cat: cap(pack.cat), Ang: cap(pack.ang[dif] || ''), ang: pack.ang[dif] || '', itensTitulo: pack.itensTitulo,
    num_v: pack.nums[0][0], num_r: pack.nums[0][1], horario: pack.horario, dominio, itens_lower: pack.itensTitulo.toLowerCase(), emo,
    a_cat: (pack.g === 'f' ? 'a ' : 'o ') + pack.cat, sua_cat: (pack.g === 'f' ? 'sua ' : 'seu ') + pack.cat,
  };

  const ctx = {
    tem, segId, pack, nome, origemNome, nomeFala, cidade, emCidade, pers, pub, obj, canal, precoNivel, precoScore, mat, matScore, ano, dif, fator,
    itens, handle, dominio, telefone, endereco, emojiNivel, oferta, icone, apoio, emo, base, agora, ia,
  };

  // ---------------- marca
  const paleta = IDX.paleta[E('paleta')] || B.PALETAS[0];
  const fonte = IDX.fonte[E('fonte')] || B.FONTES[0];
  ctx.marca = {
    paleta, cores: tokens(paleta), fonte, f: fonte.f, forma: E('forma') || 'circulo', disp: E('disp') || 'horizontal', caixa: E('caixa') || 'titulo',
    sloganLib: (IDX.slogan[E('slogan')] || B.SLOGANS[0]).texto,
    estilo: IDX.estilo[E('estilo')] ? E('estilo') : 'classico',
  };
  // o estilo manuscrito usa uma cursiva própria quando o par de fontes não tem uma
  ctx.marca.fontesExtras = ctx.marca.estilo === 'manuscrito' && !fonte.f.scriptLogo ? ['dancing'] : [];
  ctx.marca.slogan = ia.slogan || ctx.marca.sloganLib;

  // ---------------- site
  const hero = E('hero') || 'split';
  const titulo = IDX.titulo[E('titulo')] || B.TITULOS[0];
  const cta = IDX.cta[E('cta')] || B.CTAS[0];
  const dens = typeof E('dens') === 'number' ? E('dens') : 2;
  // variantes da seção de oferta são mutuamente exclusivas: fica a que o Jev achou mais provável (se ≥ 0,5)
  const ofertaSec = OFERTA_SECS.map((s) => [s, p(R, `sec_${s}`)]).sort((a, b) => b[1] - a[1])[0];
  let secs = B.SECOES.map((s) => s.id).filter((s) => !OFERTA_SECS.includes(s)).map((s) => [s, p(R, `sec_${s}`)]);
  if (ofertaSec && ofertaSec[1] >= 0.5) secs.push(['OFERTA', ofertaSec[1] + 0.2]);
  secs.sort((a, b) => b[1] - a[1]);
  const teto = Math.round(5 + dens * 1.5);
  let escolhidas = secs.filter(([, v]) => v >= 0.5).slice(0, teto);
  if (escolhidas.length < 4) escolhidas = secs.slice(0, 4);
  const secoes = SEC_ORDEM.filter((s) => escolhidas.some(([id]) => id === s)).map((s) => (s === 'OFERTA' ? ofertaSec[0] : s));
  const selos = B.SELOS.map((s) => [s.id, p(R, `selo_${s.id}`)]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
  const itensSec = secoes.find((s) => OFERTA_SECS.includes(s));
  const sub = `${pack.desc}${emCidade}. ${cap(pack.ang[dif] || '')}.`;
  const sec2 = secundarioDe(cta.texto, itensSec, pack, secoes);
  ctx.site = {
    hero, titulo: ia.titulo || titulo.texto, tituloLib: titulo.texto, sub: ia.subtitulo || sub, subLib: sub, cta, dens, teto,
    img: E('img') || 'flat', btn: E('btn') || 'suave', cantos: E('cantos') || 'suaves', textura: E('textura') || 'nenhuma',
    secoes, selos, itensSec, secundario: sec2.texto, secundarioAlvo: sec2.alvo,
    sobre: ia.sobre || sobreTxt, sobreLib: sobreTxt,
  };

  // ---------------- carrosséis (decisão conjunta formato × gancho, sem repetir formato nem diferencial)
  ctx.carEstilo = IDX.carEstilo[E('car_estilo')] || B.ESTILOS_CAR[0];
  const posts = [];
  const usadosFmt = new Set(), usadosAng = new Set();
  for (const P of B.PAPEIS_POST) {
    const n = P.n;
    const aF = resposta(R, `p${n}_fmt`), aH = resposta(R, `p${n}_hook`);
    const itemPapel = IDX.item[E(`p${n}_item`)] || B.PAPEIS_ITEM[0];
    const item = itens[itemPapel.i];
    const precoNum = typeof item.base === 'number';
    const fOver = O[`p${n}_fmt`], hOver = O[`p${n}_hook`];
    let melhor = null;
    for (const f of P.fmts) {
      if (usadosFmt.has(f)) continue;
      for (const g of B.GANCHOS.filter((x) => x.papel === n && x.fmts.includes(f))) {
        if (!oferta && /\{oferta_curta\}/.test(g.texto)) continue;
        if (!precoNum && /\{preco\}/.test(g.texto)) continue;
        let s = ((aF && aF.probabilities[f]) || 0.001) * ((aH && aH.probabilities[g.id]) || 0.001);
        if (fOver) s *= f === fOver ? 1e6 : 1;
        if (hOver) s *= g.id === hOver ? 1e3 : 1;
        if (!melhor || s > melhor.s) melhor = { f, g, s };
      }
    }
    if (!melhor) melhor = { f: P.fmts[0], g: B.GANCHOS.find((x) => x.papel === n) };
    usadosFmt.add(melhor.f);
    let angId = E(`p${n}_ang`) || dif;
    if (usadosAng.has(angId)) { const alt = ranking(resposta(R, `p${n}_ang`)).map(([id]) => id).find((id) => !usadosAng.has(id)); if (alt) angId = alt; }
    usadosAng.add(angId);
    const angRank = ranking(resposta(R, `p${n}_ang`)).map(([id]) => id).filter((id) => id !== angId);
    const v = { ...base, item: item.nome, item_desc: item.desc, preco: item.preco, ang: pack.ang[angId], Ang: cap(pack.ang[angId]) };
    const legId = E(`p${n}_leg`) || 'curta';
    const ctaP = IDX.ctaPost[E(`p${n}_cta`)] || B.CTAS_POST[0];
    const ctaTxt = (emojiNivel >= 1 ? ctaP.e + ' ' : '') + ctaP.texto + '!';
    const vl = { ...v, cta: ctaTxt, Ang2: cap(pack.ang[angRank[0]] || pack.ang.qualidade), Ang3: cap(pack.ang[angRank[1]] || pack.ang.confianca), sobre1: sobreTxt.split(/(?<=[.!?])\s/)[0] };
    const legLib = preencherLeg(LEGENDAS_MODELO[legId] || LEGENDAS_MODELO.curta, vl, emojiNivel);
    const tags = ['#' + slug(pack.label), cidade ? '#' + slug(cidade.nome) : '', '#' + handle].filter(Boolean).join(' ');
    posts.push({
      n, papel: P, fmt: melhor.f, gancho: melhor.g, hook: preencher(melhor.g.texto, v, emojiNivel), ang: angId, angTxt: pack.ang[angId],
      bg: E(`p${n}_bg`) || 'solido', itemPapel, item, leg: legId, legenda: ia[`legenda${n}`] || legLib, legendaLib: legLib, tags, cta: ctaP,
    });
  }
  ctx.posts = posts;

  // ---------------- e-mail marketing (tipo × assunto casados) e assinatura
  ctx.email = montarEmail(R, O, E, ctx, base, ia);
  // ---------------- anúncios de display (conceito × título casados)
  ctx.anuncios = montarAnuncios(R, O, E, ctx, base, ia);
  return ctx;
}

// botão secundário do topo: nunca repete o principal ("Ver o cardápio" × "Ver cardápio"), e cada rótulo vem com o seu
// destino (id da seção, sem o "s-"): "Ver <itens>" → a seção dos itens; "Nossa história" → a seção sobre; "Saiba mais"
// → a seção dos itens ou, sem ela, a 1ª seção da página (a página tem sempre 4 ou mais)
function secundarioDe(ctaTxt, itensSec, pack, secoes) {
  const norm = (t) => semAcento(String(t)).toLowerCase().replace(/\b(o|a|os|as|nosso|nossa)\b/g, '').replace(/\s+/g, ' ').trim();
  const cand = [
    itensSec ? { texto: `Ver ${pack.itensTitulo.toLowerCase()}`, alvo: itensSec } : null,
    secoes.includes('sobre') ? { texto: 'Nossa história', alvo: 'sobre' } : null,
    { texto: 'Saiba mais', alvo: itensSec || secoes[0] || 'hero' },
  ].filter(Boolean);
  return cand.find((c) => norm(c.texto) !== norm(ctaTxt)) || cand[cand.length - 1];
}

// Os números "N anos de casa" do pacote seguem o tempo de mercado que o Jev decidiu (senão: "desde 2025" ao lado de
// "14 anos de mercado"). Negócio aberto este ano mostra o ano de abertura; garantia ("1 ano de garantia") não muda.
function coerenciaAnos(pack, ano, hoje) {
  const anos = hoje - ano;
  const plural = (n) => (n === 1 ? 'ano' : 'anos');
  const nums = pack.nums.map(([v, r]) => {
    if (/garantia/i.test(r)) return [v, r];
    const m1 = /^(\d+)\s*anos?$/i.exec(v);
    const m2 = /^\d+$/.test(v) && /^anos?\b/i.test(r);
    if (!m1 && !m2) return [v, r];
    if (anos < 1) return [String(ano), 'o ano em que abrimos as portas'];
    return m1 ? [`${anos} ${plural(anos)}`, r] : [String(anos), r.replace(/^anos?/i, plural(anos))];
  });
  const ang = Object.fromEntries(Object.entries(pack.ang).map(([k, t]) => [k, String(t).replace(/\b(?:19|20)\d{2}\b/g, String(ano))]));
  return { ...pack, nums, ang };
}

// melhor par (a, b) pelas probabilidades do Jev, respeitando quais b combinam com cada a; override do "Outra versão" vence
function melhorPar(R, O, qa, qb, listaA, listaB, combina) {
  const aA = resposta(R, qa), aB = resposta(R, qb);
  let melhor = null;
  for (const a of listaA) for (const b of listaB) {
    if (!combina(a, b)) continue;
    let s = ((aA && aA.probabilities && aA.probabilities[a.id]) || 0.001) * ((aB && aB.probabilities && aB.probabilities[b.id]) || 0.001);
    if (O[qa] != null) s *= a.id === O[qa] ? 1e6 : 1;
    if (O[qb] != null) s *= b.id === O[qb] ? 1e3 : 1;
    if (!melhor || s > melhor.s) melhor = { a, b, s };
  }
  return melhor || { a: listaA[0], b: listaB[0] };
}

const PREHEADER = {
  boas_vindas: 'Separamos um presente e o caminho mais rápido para você {verbo}.',
  newsletter: 'Novidades, bastidores e uma dica rápida de {mes} para você.',
  promocao: '{Oferta_frase}. Aproveite antes que acabe.',
  lancamento: 'Chegou {item3}. Você é uma das primeiras pessoas a saber.',
  reengajamento: 'Guardamos um lugar para você. E um presente também.',
};
const INTRO = {
  boas_vindas: 'Que bom ter você por aqui! A partir de agora você recebe em primeira mão as novidades {da_marca}. Para começar bem: {oferta_frase_ou}.',
  newsletter: '{mes_cap} foi cheio de novidades por aqui. Separamos o que mais fez sucesso, uma dica rápida e um pouco dos bastidores.',
  promocao: 'Por pouco tempo, {oferta_frase_ou}. Escolha o seu favorito e garanta antes que acabe.',
  lancamento: 'Depois de muito teste e ajuste, chegou {item3}. {Item3_desc}. Você é uma das primeiras pessoas a saber.',
  reengajamento: 'Faz um tempinho que você não aparece, e a gente sentiu sua falta. Enquanto isso, muita coisa boa aconteceu por aqui.',
};
const VERBO_OBJ = { vender_online: 'comprar', delivery: 'pedir', agendar: 'agendar', orcamento: 'pedir um orçamento', leads: 'falar com a gente', visitar: 'visitar a gente', redes: 'acompanhar a gente' };

function montarEmail(R, O, E, ctx, base, ia) {
  const pr = (q) => { const a = resposta(R, q); return a && a.type === 'noul' ? a.noul : 0; };
  const temOferta = !!ctx.oferta;
  const precoNum = typeof ctx.itens[0].base === 'number';
  const par = melhorPar(R, O, 'em_tipo', 'em_assunto', B.TIPOS_EMAIL, B.ASSUNTOS, (t, a) => a.tipos.includes(t.id) && (temOferta || !/\{oferta_curta\}/.test(a.texto)) && (precoNum || !/\{preco0\}/.test(a.texto)));
  const tipo = par.a, assunto = par.b;
  const pk = ctx.pack, it3 = ctx.itens[3];
  const v = {
    ...base, verbo: VERBO_OBJ[ctx.obj.id] || 'falar com a gente', Oferta_frase: cap(ctx.oferta ? ctx.oferta.frase : 'uma condição especial esta semana'),
    oferta_frase_ou: ctx.oferta ? ctx.oferta.frase : 'um atendimento feito com todo o capricho', da_marca: `da ${ctx.nome}`,
    mes_cap: cap(B.MESES[ctx.agora.getMonth()]), Item3_desc: cap(it3.desc), item3: it3.nome,
  };
  const assuntoLib = preencher(assunto.texto, v, ctx.emojiNivel);
  const preLib = preencher(PREHEADER[tipo.id], v, 0);
  const introLib = preencher(INTRO[tipo.id], v, 0);
  const blocos = B.BLOCOS_EMAIL.map((b) => [b.id, pr(`em_b_${b.id}`)]).filter(([id, x]) => x >= 0.5 && (id !== 'prazo' || temOferta)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const ctaE = IDX.emCta[E('em_cta')] || B.CTAS_EMAIL[0];
  const pessoaId = E('ass_pessoa') || 'lider';
  const [pn, pc] = pessoaId === 'atendimento' ? pk.equipe[1] : pk.equipe[0];
  const email = {
    tipo, assuntoOpcao: assunto, assunto: ia.assunto || assuntoLib, assuntoLib, preheader: ia.preheader || preLib, preheaderLib: preLib, intro: ia.email || introLib, introLib,
    cabecalho: E('em_cabecalho') || 'faixa', hero: E('em_hero') || 'ilustracao', cta: { ...ctaE, texto: preencher(ctaE.texto, v, 0) }, blocos,
    remetente: { nome: ctx.nome, email: `contato@${ctx.dominio}` },
    ass: {
      layout: E('ass_layout') || 'classica', banner: E('ass_banner') || 'nenhum', pessoaId,
      nome: pessoaId === 'equipe' ? `Equipe ${ctx.nome}` : `${pn} ${SOBRENOMES[(ctx.nome.length + pn.length) % SOBRENOMES.length]}`,
      cargo: pessoaId === 'equipe' ? cap(pk.cat) : pc, email: pessoaId === 'equipe' ? `contato@${ctx.dominio}` : `${slugPessoa(pn)}@${ctx.dominio}`,
    },
  };
  return email;
}
const SOBRENOMES = ['Andrade', 'Moreira', 'Castro', 'Ribeiro', 'Teixeira', 'Nogueira', 'Campos', 'Freitas'];
const slugPessoa = (n) => semAcento(String(n)).toLowerCase().replace(/[^a-z]+/g, '');

function montarAnuncios(R, O, E, ctx, base, ia) {
  const temOferta = !!ctx.oferta;
  const precoNum = typeof ctx.itens[0].base === 'number';
  const par = melhorPar(R, O, 'ad_conceito', 'ad_titulo', B.CONCEITOS_AD, B.TITULOS_AD, (c, t) => t.conceitos.includes(c.id) && (temOferta || !/\{oferta_curta\}/.test(t.texto)) && (precoNum || !/\{preco0\}/.test(t.texto)));
  const v = { ...base, slogan: ctx.marca.slogan };
  const tituloLib = preencher(par.b.texto, v, 0).replace(/\.\.$/, '.');
  const ctaA = IDX.adCta[E('ad_cta')] || B.CTAS_AD[0];
  return {
    conceito: par.a, tituloOpcao: par.b, titulo: ia.anuncio || tituloLib, tituloLib, estilo: E('ad_estilo') || 'produto',
    cta: { ...ctaA, texto: preencher(ctaA.texto, v, 0) }, selo: E('ad_selo') || 'nenhum', fundo: E('ad_fundo') || 'solido', anim: E('ad_anim') || 'sequencia',
    item: par.a.id === 'novidade' || /\{item3\}/.test(par.b.texto) ? ctx.itens[3] : ctx.itens[0], // a novidade mostra o item novo
  };
}

// ------------------------------------------------------------------ bibliotecas de texto (legendas)
const LEGENDAS_MODELO = {
  curta: '{Ang}. {e1:{emo}}\n{cta}',
  historia: '{sobre1} Hoje, {ang}. {e2:{emo}}\n{cta}',
  lista: 'Por que {nome}?\n✔️ {Ang}\n✔️ {Ang2}\n✔️ {Ang3}\n{cta}',
  pergunta: '{item0} ou {item1}: qual é a sua cara? {e1:👇}\nConta pra gente nos comentários!',
  urgencia: '{e1:⏰} Por tempo limitado: {oferta_frase}. {Ang}.\n{cta}',
  educativa: '{dica_t}: {dica} {e1:💡}\n{cta}',
};
// preencher() não aninha chaves; resolvo {emo} antes
for (const k of Object.keys(LEGENDAS_MODELO)) LEGENDAS_MODELO[k] = LEGENDAS_MODELO[k].replace(/\{e([123]):\{emo\}\}/g, '{e$1:EMO}');
const _preencher = preencher;
function preencherLeg(m, v, n) { return _preencher(m.replace(/EMO/g, v.emo || '✨'), v, n); }
export { preencherLeg };

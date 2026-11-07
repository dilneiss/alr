// Site que Lê Intenções — a página de vendas descrita em public/dados/site.json, em que QUASE TUDO começa fechado.
// O visitante escolhe o que abrir, e cada abertura (qual seção, qual item, quanto tempo ficou, o que buscou, que pergunta
// abriu) é um sinal forte do que ele quer. A cada evento que importa, o navegador resume o comportamento e o Jev responde
// de 7 a 9 perguntas numa única chamada: quem é o visitante, o que ele quer, a próxima seção FECHADA que vale abrir, qual
// item destacar na lista que ele está vendo, a objeção do momento, por onde começar, que depoimento se parece com ele e o
// que a página deve fazer agora. As opções de "próxima" e "destaque" são montadas a cada chamada com o que ainda está
// fechado e o que está na tela. Todo o conteúdo e a política (perfis, interesses, objeções) vêm do site.json.
import fs from 'node:fs';
import { createApp, HttpError } from '../../shared/server/kit.mjs';

const SITE = JSON.parse(fs.readFileSync(new URL('./public/dados/site.json', import.meta.url), 'utf8'));
const SEC = SITE.secoes;
const POR_ID = Object.fromEntries(SEC.map((s) => [s.id, s]));
const DO_TIPO = (t) => SEC.filter((s) => s.tipo === t);
const UM = (t) => DO_TIPO(t)[0] || null;
const TRILHAS = UM('trilhas'), OFERTA = UM('oferta'), FAQ = UM('faq'), DEPO = UM('depoimentos');
const CONV = SITE.conversao, J = SITE.jev;

// {n:<id>} = quantos itens a seção tem; {total:<id>} = soma de n das trilhas (o navegador faz o mesmo)
const contar = (s) => (['trilhas', 'lista', 'depoimentos', 'faq'].includes(s.tipo) ? s.itens.length : s.tipo === 'espacos' ? s.cards.length : 0);
const preencher = (t) => String(t || '')
  .replace(/\{n:([a-z0-9_]+)\}/g, (m, id) => (POR_ID[id] ? String(contar(POR_ID[id])) : m))
  .replace(/\{total:([a-z0-9_]+)\}/g, (m, id) => (POR_ID[id] ? String(POR_ID[id].itens.reduce((a, x) => a + x.n, 0)) : m));

// ---------------------------------------------------------------------------------------------------------------
// O que existe na página
// ---------------------------------------------------------------------------------------------------------------
export const SECOES = Object.fromEntries(SEC.map((s) => [s.id, preencher(s.jev)]));   // o que tem dentro + para quem vale mais
export const SECAO_INFO = Object.fromEntries(SEC.map((s) => [s.id, [s.emoji, s.nome]]));
const IDS_SECAO = Object.keys(SECOES);

// seções que são listas de itens: o Jev escolhe o que destacar dentro delas (opções montadas a cada chamada)
const curto = (t, n) => { t = String(t || ''); return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)).replace(/[,;:—-]+$/, '') + '…'; };
const opcao = (s, x) => {
  if (s.tipo === 'trilhas') return `${x.nome} (${x.n} ${x.n === 1 ? s.unidade[0] : s.unidade[1]}): ${x.frase} ${curto(x.desc, 150)}`;
  if (s.tipo === 'depoimentos') return `${x.nome}${x.papel ? ', ' + x.papel : ''}: “${x.texto}”${s.exemplo ? ' (exemplo)' : ''}`;
  const base = `${x.nome}${x.frase ? ' — ' + x.frase.replace(/[.!…]+$/, '') : ''}`;
  if (s.formato === 'icones') return `${x.nome} (${x.rotulo}): ${curto(x.desc, 150)}`;
  return s.itens.length <= 20 ? `${base}: ${curto(x.desc, 150)}` : x.grupo ? `${base} (${x.grupo})` : base;
};
const LISTAS = Object.fromEntries(SEC.filter((s) => ['trilhas', 'lista', 'depoimentos'].includes(s.tipo)).map((s) => [s.id, s.itens.map((x) => [String(x.id), opcao(s, x)])]));
const NOMES_ITEM = Object.fromEntries(SEC.filter((s) => LISTAS[s.id]).map((s) => [s.id, Object.fromEntries(s.itens.map((x) => [String(x.id), x.nome]))]));

// ---------------------------------------------------------------------------------------------------------------
// Perguntas ao Jev — os critérios são a política de personalização (escritos no site.json, seção 3.4)
// ---------------------------------------------------------------------------------------------------------------
const PERFIS = { ...Object.fromEntries(J.perfis.map((p) => [p.id, preencher(p.criterio)])), indefinido: 'Ainda não dá para saber: abriu pouco ou nada, ou abriu coisas sem relação entre si' };
const PERFIL_INFO = { ...Object.fromEntries(J.perfis.map((p) => [p.id, [p.emoji, p.rotulo]])), indefinido: ['🧭', 'Ainda explorando'] };
const INTERESSES = Object.fromEntries(J.interesses.map((x) => [x.id, preencher(x.criterio)]));
const INTERESSE_INFO = Object.fromEntries(J.interesses.map((x) => [x.id, [x.emoji, x.rotulo]]));
// cada objeção aponta para a resposta REAL do FAQ do site.json
export const OBJECOES = {
  nenhuma: ['Nenhuma objeção aparente: explora ou lê sem sinal de dúvida, ou já está concluindo', null],
  ...Object.fromEntries(J.objecoes.map((o) => [o.id, [preencher(o.criterio), o.faq]])),
};
const OBJECAO_INFO = { nenhuma: ['🙂', 'Nenhuma'], ...Object.fromEntries(J.objecoes.map((o) => [o.id, [o.emoji, o.rotulo]])) };
const juntar = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
const nomesListas = juntar(SEC.filter((s) => ['trilhas', 'lista'].includes(s.tipo)).map((s) => s.nome));
const exObjecoes = J.objecoes.slice(0, 4).map((o) => o.rotulo.replace(/\?$/, '').toLowerCase()).join(', ');
const confianca = juntar([DEPO && DEPO.nome, UM('equipe') && UM('equipe').nome, OFERTA.garantia ? 'a garantia' : 'as condições'].filter(Boolean));
export const ACOES = {
  nenhuma: 'Não fazer nada: o visitante está bem, lendo o que abriu, ou a ajuda certa já foi mostrada há pouco; não interromper',
  guiar: 'Guiar até a próxima seção fechada que vale abrir: o visitante terminou de ler o que abriu, parou, rolou sem abrir nada, ou está perdido',
  destacar_item: `Destacar, dentro da seção aberta, os itens que combinam com este visitante: ele está numa lista longa (${nomesListas}) passando por vários itens`,
  responder_objecao: `Responder a dúvida do momento com a resposta oficial: há uma objeção clara (ex.: ${exObjecoes})`,
  montar_trilha: 'Montar a trilha pessoal do visitante (por onde começar, o que experimentar primeiro, onde tirar dúvidas): ele já abriu 2 ou mais seções de conteúdo com um perfil claro',
  mostrar_prova: `Mostrar o depoimento de alguém parecido com o visitante: ele parece desconfiado (abriu ${confianca}) ou está perto de decidir`,
  convidar: `Convidar para ${CONV.acao} com uma chamada feita para ele: interesse alto, já viu o que queria, voltou ao preço ou clicou em “${CONV.cta}”`,
  segurar_saida: 'Segurar a saída mostrando o que ele abriu e as condições reais: o mouse saiu pelo topo da janela ou voltou rápido ao topo para ir embora',
};
if (!DEPO) delete ACOES.mostrar_prova; // sem depoimentos, a ação não existe
const ACAO_INFO = {
  nenhuma: ['🤫', 'Não interromper'], guiar: ['🧭', 'Guiar até a próxima seção'], destacar_item: ['✨', 'Destacar itens para você'], responder_objecao: ['💡', 'Responder a dúvida'],
  montar_trilha: ['🗺️', 'Montar a sua trilha'], mostrar_prova: ['💬', 'Mostrar depoimento parecido'], convidar: ['🎟️', 'Convite sob medida'], segurar_saida: ['🚪', 'Segurar a saída'],
};

function perguntas(s) {
  const fechadas = IDS_SECAO.filter((id) => !s.abertas.some((a) => a.id === id));
  const q = {
    perfil: { type: 'choice', instructions: 'Pelo que o visitante abriu, leu, buscou e perguntou nesta página, quem ele é?', criteria: PERFIS },
    interesse: { type: 'choice', instructions: 'O que este visitante mais quer desta página AGORA, pelo que abriu e onde passou mais tempo?', criteria: INTERESSES },
    proxima: {
      type: 'choice', instructions: 'Das seções que o visitante AINDA NÃO ABRIU, qual é a próxima que mais vale a pena ele abrir, pelo perfil e pelo que ele já abriu? Se não sobrou nada útil ou ele já está concluindo, escolha nenhuma.',
      criteria: { ...Object.fromEntries(fechadas.map((id) => [id, SECOES[id]])), nenhuma: 'Nenhuma: ele já abriu o que importa, ou já está concluindo' },
    },
    objecao: { type: 'choice', instructions: 'Qual dúvida ou objeção está segurando este visitante AGORA?', criteria: Object.fromEntries(Object.entries(OBJECOES).map(([k, [t]]) => [k, t])) },
    acao: {
      type: 'choice', instructions: 'O que a página deve fazer AGORA para ajudar este visitante? Não repita uma ação já mostrada há menos de 25 s; se ele está lendo algo que acabou de abrir, prefira não interromper.',
      criteria: ACOES,
    },
    trilha: { type: 'choice', instructions: TRILHAS.pergunta, criteria: Object.fromEntries(LISTAS[TRILHAS.id]) },
    // com 1 depoimento só não há o que escolher (uma choice precisa de 2 opções): a pergunta não existe
    depoimento: DEPO && DEPO.itens.length >= 2 ? { type: 'choice', instructions: 'Qual depoimento é de alguém mais parecido com este visitante?', criteria: Object.fromEntries(LISTAS[DEPO.id]) } : undefined,
    prob_entrar: { type: 'noul', instructions: `Este visitante vai ${CONV.acao} nesta visita?`, criteria: { true: `Vai ${CONV.acao} nesta visita`, false: `Não vai ${CONV.acao} nesta visita` } },
  };
  if (!q.depoimento) delete q.depoimento;
  // com todas as seções já abertas não sobra "próxima" para escolher (uma choice precisa de 2+ opções): a pergunta sai
  if (!fechadas.length) delete q.proxima;
  // destaque: só quando ele está dentro de uma lista aberta com 2 itens ou mais (as opções são os itens dessa lista)
  if (s.lista_em_foco && LISTAS[s.lista_em_foco] && LISTAS[s.lista_em_foco].length >= 2) {
    const vistos = s.itens.filter((i) => i.secao === s.lista_em_foco).map((i) => NOMES_ITEM[s.lista_em_foco][i.id]).filter(Boolean);
    q.destaque = {
      type: 'choice',
      instructions: `O visitante está na lista "${SECAO_INFO[s.lista_em_foco][1]}". Qual item mostrar primeiro para ELE, pelo perfil e pelo que abriu na página?${vistos.length ? ` Ele já olhou: ${vistos.slice(-5).join(', ')}.` : ''}`,
      criteria: Object.fromEntries(LISTAS[s.lista_em_foco]),
    };
  }
  return q;
}

// ---------------------------------------------------------------------------------------------------------------
// Validação do resumo enviado pelo navegador (nunca confie no cliente) e montagem do estado
// ---------------------------------------------------------------------------------------------------------------
const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n * 10) / 10)) : 0; };
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const IDS_FAQ = FAQ.itens.map((f) => f.id);
const ACOES_ITEM = ['abriu', 'leu', 'buscou', 'passou'];

function limpar(raw) {
  const s = obj(raw), r = obj(s.rolagem), c = obj(s.cliques), sa = obj(s.saida), pr = obj(s.preco), ct = obj(s.cta), g = obj(s.guia);
  const abertas = arr(s.abertas).map((a) => obj(a)).filter((a) => IDS_SECAO.includes(a.id)).slice(0, IDS_SECAO.length).map((a) => ({
    id: a.id, ordem: num(a.ordem, 99), vezes: num(a.vezes, 99), aberta_s: num(a.aberta_s, 36000), aberta_agora: !!a.aberta_agora, fechou_rapido: !!a.fechou_rapido,
  }));
  const itens = arr(s.itens).map((i) => obj(i)).filter((i) => LISTAS[i.secao] && NOMES_ITEM[i.secao][String(i.id)]).slice(-14).map((i) => ({
    secao: i.secao, id: String(i.id), acao: oneOf(i.acao, ACOES_ITEM, 'abriu'), s: num(i.s, 3600),
  }));
  const sub = obj(s.subitens); // trilha → bloco abertos (texto curto)
  return {
    t: num(s.t, 36000),
    secao_atual: oneOf(s.secao_atual, [...IDS_SECAO, 'topo'], 'topo'),
    lista_em_foco: oneOf(s.lista_em_foco, Object.keys(LISTAS), ''),
    rolagem: { max: num(r.max, 100), atual: num(r.atual, 100), inversoes_20s: num(r.inversoes_20s, 99), rapidas_20s: num(r.rapidas_20s, 99), desceu_rapido: !!r.desceu_rapido, subiu_rapido: !!r.subiu_rapido },
    abertas,
    itens,
    blocos: arr(sub.blocos).map((b) => txt(b, 60)).filter(Boolean).slice(-6),
    buscas: arr(s.buscas).map((b) => txt(b, 40)).filter(Boolean).slice(-4),
    faq: [...new Set(arr(s.faq).filter((x) => IDS_FAQ.includes(x)))].slice(0, IDS_FAQ.length),
    preco: { hover_s: num(pr.hover_s, 3600), vezes: num(pr.vezes, 99), copiou: !!pr.copiou },
    cta: { cliques: num(ct.cliques, 99), checkout_aberto: !!ct.checkout_aberto, campos: num(ct.campos, 9), erros: num(ct.erros, 99), entrou: !!ct.entrou },
    cliques: { raiva: num(c.raiva, 99), mortos: num(c.mortos, 99) },
    ocioso_s: num(s.ocioso_s, 3600),
    saida: { vezes: num(sa.vezes, 99), ha_s: sa.ha_s == null ? null : num(sa.ha_s, 3600) },
    guia: {
      acoes: [...new Set(arr(g.acoes).filter((x) => x in ACOES && x !== 'nenhuma'))].slice(-8),
      desde_s: g.desde_s == null ? null : num(g.desde_s, 36000),
      sugeriu: oneOf(g.sugeriu, IDS_SECAO, ''), aceitou: num(g.aceitou, 99), ignorou: num(g.ignorou, 99),
    },
    eventos: arr(s.eventos).slice(-10).map((e) => txt(e, 60)).filter(Boolean),
  };
}

const FORM = CONV.tipo === 'pagamento' ? 'pagamento' : 'contato';
function montarEstado(s) {
  const nomeSec = (id) => SECAO_INFO[id][1];
  const abertas = [...s.abertas].sort((a, b) => a.ordem - b.ordem);
  const fechadas = IDS_SECAO.filter((id) => !s.abertas.some((a) => a.id === id));
  const itensTxt = s.itens.map((i) => `${nomeSec(i.secao)} → ${NOMES_ITEM[i.secao][i.id]} (${i.acao}${i.s ? `, ${i.s} s` : ''})`);
  return {
    pagina: `${preencher(J.pagina)} Quase tudo começa FECHADO: o visitante clica para abrir cada seção e cada item.`,
    comportamento_do_visitante: {
      tempo_na_pagina: `${s.t} s`,
      olhando_agora: s.secao_atual === 'topo' ? 'o topo da página' : nomeSec(s.secao_atual),
      secoes_que_abriu_em_ordem: abertas.length ? abertas.map((a) => `${nomeSec(a.id)} (${a.aberta_s} s aberta${a.vezes > 1 ? `, abriu ${a.vezes}×` : ''}${a.fechou_rapido ? ', fechou logo em seguida' : ''}${a.aberta_agora ? '' : ', já fechou'})`) : 'nenhuma ainda',
      secoes_ainda_fechadas: fechadas.map(nomeSec),
      itens_que_abriu_ou_leu: itensTxt.length ? itensTxt : 'nenhum',
      blocos_abertos: s.blocos.length ? s.blocos : 'nenhum',
      buscou: s.buscas.length ? s.buscas.map((b) => `"${b}"`) : 'nada',
      perguntas_frequentes_abertas: s.faq.length ? s.faq.map((id) => FAQ.itens.find((f) => f.id === id).pergunta) : 'nenhuma',
      preco: OFERTA.preco ? (s.preco.vezes ? `passou o mouse no preço ${s.preco.vezes} vez(es), ${s.preco.hover_s} s no total${s.preco.copiou ? '; copiou o valor' : ''}` : 'ainda não olhou o preço de perto') : 'a página não mostra preço (“Fale com a gente”)',
      acao_final: s.cta.entrou ? `CONCLUIU: ${CONV.concluida} (${FORM} de demonstração concluído)` : s.cta.checkout_aberto ? `abriu o ${FORM}: ${s.cta.campos} campo(s) preenchido(s), ${s.cta.erros} erro(s)` : s.cta.cliques ? `clicou em “${CONV.cta}” ${s.cta.cliques} vez(es)` : `não clicou em “${CONV.cta}”`,
      rolagem: `chegou a ${s.rolagem.max}% da página (agora em ${s.rolagem.atual}%); ${s.rolagem.inversoes_20s} inversões (sobe e desce) nos últimos 20 s`
        + (s.rolagem.rapidas_20s ? `; rolou rápido demais ${s.rolagem.rapidas_20s} vez(es) nos últimos 20 s, sem abrir nada` : '') + (s.rolagem.subiu_rapido ? '; acabou de voltar rápido ao topo' : ''),
      cliques: `${s.cliques.raiva} rajada(s) de cliques de raiva; ${s.cliques.mortos} clique(s) em coisas que não respondem`,
      parado_sem_mexer_ha: `${s.ocioso_s} s`,
      intencao_de_saida: s.saida.vezes ? `o mouse saiu pelo topo da janela ${s.saida.vezes} vez(es), a última há ${s.saida.ha_s ?? 0} s` : 'nenhuma',
      ultimos_eventos: s.eventos.length ? s.eventos : 'nenhum',
    },
    o_que_a_pagina_ja_fez: {
      acoes_ja_mostradas: s.guia.acoes.length ? s.guia.acoes : 'nenhuma',
      segundos_desde_a_ultima_acao: s.guia.desde_s == null ? 'nenhuma ação ainda' : s.guia.desde_s,
      ultima_secao_sugerida: s.guia.sugeriu ? `${nomeSec(s.guia.sugeriu)} (o visitante aceitou ${s.guia.aceitou} sugestão(ões) e ignorou ${s.guia.ignorou})` : 'nenhuma',
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------------------------------------------
const app = createApp({ name: 'site', publicDir: new URL('./public/', import.meta.url) });
const stats = { decisoes: 0, acoes: {} };
const escolha = (a) => a && a.choice;
const prob = (a) => (a && a.probabilities && a.probabilities[a.choice]) || 0;
const ranking = (a, n = 5) => Object.entries((a && a.probabilities) || {}).sort((x, y) => y[1] - x[1]).slice(0, n).map(([id, p]) => ({ id, p }));

app.get('/api/config', () => ({
  ok: true, secoes: SECAO_INFO, perfis: PERFIL_INFO, interesses: INTERESSE_INFO,
  objecoes: Object.fromEntries(Object.entries(OBJECOES).map(([k, [, faq]]) => [k, { faq, rotulo: OBJECAO_INFO[k] }])),
  acoes: Object.fromEntries(Object.keys(ACOES).map((k) => [k, ACAO_INFO[k]])), listas: Object.keys(LISTAS),
}));

app.post('/api/decidir', async ({ body, jev }) => {
  if (!body || !body.sinais || typeof body.sinais !== 'object') throw new HttpError(400, 'Resumo de comportamento ausente.');
  const s = limpar(body.sinais);
  const q = perguntas(s);
  const r = await jev({ state: montarEstado(s), questions: q });
  const a = r.answers;
  stats.decisoes++;
  const ac = escolha(a.acao);
  stats.acoes[ac] = (stats.acoes[ac] || 0) + 1;
  const ob = escolha(a.objecao);
  return {
    ok: true,
    perfil: { escolha: escolha(a.perfil), p: prob(a.perfil), probabilidades: a.perfil.probabilities },
    interesse: { escolha: escolha(a.interesse), p: prob(a.interesse), probabilidades: a.interesse.probabilities },
    proxima: { escolha: escolha(a.proxima), p: prob(a.proxima), ranking: ranking(a.proxima, 6) },
    destaque: a.destaque ? { secao: s.lista_em_foco, escolha: escolha(a.destaque), p: prob(a.destaque), ranking: ranking(a.destaque, 3) } : null,
    objecao: { escolha: ob, p: prob(a.objecao), faq: OBJECOES[ob] ? OBJECOES[ob][1] : null, probabilidades: a.objecao.probabilities },
    acao: { escolha: ac, p: prob(a.acao), probabilidades: a.acao.probabilities },
    trilha: { escolha: escolha(a.trilha), p: prob(a.trilha), ranking: ranking(a.trilha, 5) },
    depoimento: a.depoimento ? { escolha: escolha(a.depoimento), p: prob(a.depoimento) } : null,
    prob_entrar: a.prob_entrar ? a.prob_entrar.noul : 0,
    latency_ms: r.latency_ms, cost: r.cost, n_perguntas: Object.keys(q).length, cached: r.cached,
    _jev: r.debug,
  };
}, { rate: 120 });

app.get('/api/stats', () => ({ ok: true, ...stats }));

app.start(+(process.env.PORT || 4115));

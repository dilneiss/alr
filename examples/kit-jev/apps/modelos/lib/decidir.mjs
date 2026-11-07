// Monta a chamada ao Jev a partir do modelo (app.config.mjs) e do que a página mandou, e devolve as respostas
// organizadas para a tela. Usado pelo servidor hospedado e pelo servidor do pacote para baixar.
//
// Regras que valem para todos os modelos (medidas por nós e pela comunidade):
//  - cada item de um lote vai DENTRO da própria pergunta (itens parecidos no mesmo pedido "vazam" um no outro);
//  - o Jev nunca escreve texto: escolhe (choice), pontua (score) ou estima a chance de "sim" (noul);
//  - as perguntas saem sempre do modelo, nunca da página (ninguém usa o servidor como Jev grátis).

export class ErroEntrada extends Error { constructor(msg) { super(msg); this.status = 400; this.code = 'bad_request'; } }

const LIM = { itens: 12, pares: 16, texto: 1400, textoAoVivo: 3500, linhas: 24, historico: 10, fala: 700, ajustes: 700, perguntas: 150, dados: 24000, alvo: 1500, opcoes: 255 };

const corta = (s, n) => { s = String(s ?? '').replace(/\s+\n/g, '\n').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

export function contextoDe(spec) {
  return typeof spec.contexto === 'function' ? spec.contexto() : (spec.contexto || {});
}

// texto que representa um item para o Jev
export function textoDoItem(spec, item) {
  if (!item) return '';
  if (item.texto && Object.keys(item).every((k) => ['texto', 'chave', 'id'].includes(k))) return corta(item.texto, LIM.texto);
  if (typeof spec.textoItem === 'function') return corta(spec.textoItem(item), LIM.texto);
  // sem textoItem: usa os mesmos campos que o cartão mostra (fluxo.cartao / pares.cartao)
  const mapa = { titulo: 'titulo', subtitulo: 'subtitulo', texto: 'texto', meta: 'meta', valor: 'valor', ...((spec.fluxo && spec.fluxo.cartao) || (spec.pares && spec.pares.cartao) || {}) };
  const partes = ['titulo', 'subtitulo', 'texto', 'meta', 'valor'].map((c) => item[mapa[c]]).filter((v) => v != null && v !== '').map(String);
  return corta(partes.join(' — '), LIM.texto);
}

function opcoesDe(dec, ctx, entrada) {
  let op = typeof dec.opcoes === 'function' ? dec.opcoes(ctx, entrada) : dec.opcoes;
  if (!op) throw new Error(`decisão "${dec.id}" sem opções`);
  if (!Array.isArray(op)) op = Object.entries(op).map(([id, desc]) => ({ id, desc }));
  const criteria = {};
  for (const o of op) criteria[o.id] = o.desc || o.rotulo || o.id;
  return criteria;
}

// opções que a jogada monta na hora (ex.: os slides do deck, os itens que sobraram): limpa ids e corta textos
function opcoesLimpas(op) {
  const lista = Array.isArray(op) ? op : Object.entries(op || {}).map(([id, desc]) => ({ id, desc }));
  const out = [];
  for (const o of lista.slice(0, LIM.opcoes)) {
    const id = String(o && o.id != null ? o.id : '').trim();
    if (!/^[\w-]{1,60}$/.test(id) || out.some((x) => x.id === id)) continue;
    out.push({ id, desc: corta(o.desc || o.rotulo || id, 400) });
  }
  if (out.length < 2) throw new ErroEntrada('a escolha precisa de 2 ou mais opções');
  return out;
}

function niveisDe(dec) {
  return (dec.niveis || []).map((n) => (typeof n === 'string' ? n : n.desc && n.rotulo && n.desc !== n.rotulo ? `${n.rotulo}: ${n.desc}` : (n.desc || n.rotulo)));
}

// uma pergunta do Jev a partir de uma decisão do modelo; alvo = texto do item embutido (lotes)
function pergunta(dec, ctx, entrada, alvo) {
  const instr = alvo ? `${dec.pergunta}\n\n${alvo}` : dec.pergunta;
  if (dec.tipo === 'choice') return { type: 'choice', instructions: instr, criteria: opcoesDe(dec, ctx, entrada) };
  if (dec.tipo === 'score') return { type: 'score', instructions: instr, criteria: niveisDe(dec) };
  if (dec.tipo === 'noul') return { type: 'noul', instructions: instr };
  throw new Error(`decisão "${dec.id}": tipo inválido (${dec.tipo})`);
}

const decisoesPara = (spec, filtro) => (spec.decisoes || []).filter((d) => d.papel !== 'so-tela' && (!filtro || filtro(d)));

function itemDaEntrada(spec, x) {
  if (x && x.ref != null) {
    const it = (spec.dados || []).find((d) => String(d.id) === String(x.ref));
    if (!it) throw new ErroEntrada(`item "${x.ref}" não existe neste modelo`);
    return it;
  }
  if (x && typeof x.texto === 'string' && x.texto.trim()) return { texto: corta(x.texto, LIM.texto) };
  throw new ErroEntrada('cada item precisa de "ref" ou "texto"');
}

// ---------------------------------------------------------------------------------------------
// montar(spec, entrada) → { state, questions, ler(answers) }
// ---------------------------------------------------------------------------------------------
export function montar(spec, entrada = {}) {
  const ctx = contextoDe(spec);
  const ajustes = entrada.ajustes ? corta(entrada.ajustes, LIM.ajustes) : null;
  // spec.editavel = { campo: 'politica' }: o texto que a pessoa editou na tela substitui esse campo do contexto
  const campoEd = spec.editavel && spec.editavel.campo;
  const base = { contexto: ajustes && campoEd ? { ...ctx, [campoEd]: ajustes } : ctx };
  if (ajustes && !campoEd) base.preferencias_do_usuario = ajustes;
  const rotuloItem = (spec.fluxo && spec.fluxo.rotuloItem) || spec.rotuloItem || 'Item';

  switch (spec.motor) {
    case 'fluxo': {
      const lista = Array.isArray(entrada.itens) ? entrada.itens : [];
      if (!lista.length) throw new ErroEntrada('nenhum item para decidir');
      if (lista.length > LIM.itens) throw new ErroEntrada(`no máximo ${LIM.itens} itens por chamada`);
      const decs = decisoesPara(spec);
      const questions = {}, mapa = [];
      lista.forEach((x, i) => {
        const item = itemDaEntrada(spec, x);
        const chave = String(x.chave ?? x.ref ?? 'u' + i);
        const alvo = `${rotuloItem}: «${textoDoItem(spec, item)}»`;
        decs.forEach((d, j) => { const k = `i${i}_${j}`; questions[k] = pergunta(d, ctx, entrada, alvo); mapa.push([k, chave, d.id]); });
      });
      limitar(questions);
      return {
        state: { ...base, tarefa: spec.tarefa || spec.resumo || spec.titulo },
        questions,
        ler: (ans) => { const itens = {}; for (const [k, chave, id] of mapa) (itens[chave] ||= {})[id] = ans[k]; return { itens }; },
      };
    }

    case 'pares': {
      const lista = Array.isArray(entrada.pares) ? entrada.pares : [];
      if (!lista.length) throw new ErroEntrada('nenhum par para comparar');
      if (lista.length > LIM.pares) throw new ErroEntrada(`no máximo ${LIM.pares} pares por chamada`);
      const decs = decisoesPara(spec);
      const rA = (spec.pares && spec.pares.rotuloA) || 'A', rB = (spec.pares && spec.pares.rotuloB) || 'B';
      const questions = {}, mapa = [];
      lista.forEach((p, i) => {
        const a = itemDaEntrada(spec, p.a), b = itemDaEntrada(spec, p.b);
        const chave = String(p.id ?? `p${i}`);
        const alvo = `${rA}: «${textoDoItem(spec, a)}»\n${rB}: «${textoDoItem(spec, b)}»`;
        decs.forEach((d, j) => { const k = `p${i}_${j}`; questions[k] = pergunta(d, ctx, entrada, alvo); mapa.push([k, chave, d.id]); });
      });
      limitar(questions);
      return {
        state: { ...base, tarefa: spec.tarefa || spec.resumo || spec.titulo },
        questions,
        ler: (ans) => { const pares = {}; for (const [k, chave, id] of mapa) (pares[chave] ||= {})[id] = ans[k]; return { pares }; },
      };
    }

    case 'aovivo': {
      const texto = corta(entrada.texto, LIM.textoAoVivo);
      if (!texto) throw new ErroEntrada('texto vazio');
      const questions = {}, mapaLinhas = [];
      const gerais = decisoesPara(spec, (d) => !d.porLinha);
      for (const d of gerais) questions[d.id] = pergunta(d, ctx, entrada);
      const porLinha = decisoesPara(spec, (d) => d.porLinha);
      let linhas = [];
      if (porLinha.length) {
        linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, LIM.linhas);
        const rot = (spec.aovivo && spec.aovivo.rotuloLinha) || 'Linha';
        linhas.forEach((l, i) => porLinha.forEach((d, j) => { const k = `l${i}_${j}`; questions[k] = pergunta(d, ctx, entrada, `${rot}: «${corta(l, 300)}»`); mapaLinhas.push([k, i, d.id]); }));
      }
      limitar(questions);
      const extra = typeof spec.estadoExtra === 'function' ? spec.estadoExtra(entrada, ctx) : null;
      return {
        state: { ...base, [(spec.aovivo && spec.aovivo.campo) || 'texto']: texto, ...(extra || {}) },
        questions,
        ler: (ans) => {
          const respostas = {}; for (const d of gerais) respostas[d.id] = ans[d.id];
          const out = { respostas };
          if (porLinha.length) {
            out.linhas = linhas.map((t) => ({ texto: t, respostas: {} }));
            for (const [k, i, id] of mapaLinhas) out.linhas[i].respostas[id] = ans[k];
          }
          return out;
        },
      };
    }

    case 'conversa': {
      const hist = (Array.isArray(entrada.historico) ? entrada.historico : []).slice(-LIM.historico)
        .map((m) => ({ quem: corta(m.quem, 40), texto: corta(m.texto, LIM.fala) }));
      const atual = entrada.atual && { quem: corta(entrada.atual.quem, 40), texto: corta(entrada.atual.texto, LIM.fala) };
      if (!atual || !atual.texto) throw new ErroEntrada('fala atual vazia');
      const decs = decisoesPara(spec, (d) => !d.quem || [].concat(d.quem).includes(atual.quem));
      if (!decs.length) throw new ErroEntrada('nenhuma decisão para esta fala');
      const questions = {};
      for (const d of decs) questions[d.id] = pergunta(d, ctx, entrada);
      limitar(questions);
      return {
        state: { ...base, conversa_ate_aqui: hist, fala_atual: atual },
        questions,
        ler: (ans) => { const respostas = {}; for (const d of decs) respostas[d.id] = ans[d.id]; return { respostas }; },
      };
    }

    case 'agente': {
      const pedido = corta(entrada.pedido, 900);
      if (!pedido) throw new ErroEntrada('pedido vazio');
      const passo = entrada.passo ? {
        ferramenta: corta(entrada.passo.ferramenta, 80),
        argumentos: corta(typeof entrada.passo.args === 'string' ? entrada.passo.args : JSON.stringify(entrada.passo.args ?? {}), 700),
        descricao: corta(entrada.passo.descricao, 300),
      } : null;
      const hist = (Array.isArray(entrada.historico) ? entrada.historico : []).slice(-6).map((h) => corta(h, 200));
      const decs = decisoesPara(spec, (d) => (d.quando === 'passo' ? !!passo : d.quando === 'pedido' ? !passo : true));
      const questions = {};
      for (const d of decs) questions[d.id] = pergunta(d, ctx, entrada);
      limitar(questions);
      const state = { ...base, pedido_do_usuario: pedido };
      if (passo) state.acao_proposta = passo;
      if (passo && entrada.passo.fatos && typeof entrada.passo.fatos === 'object' && !Array.isArray(entrada.passo.fatos)) {
        const f = {};
        for (const [k, v] of Object.entries(entrada.passo.fatos).slice(0, 8)) f[corta(k, 60)] = corta(v, 120);
        state.fatos_calculados_pelo_codigo = f;
      }
      if (hist.length) state.passos_anteriores = hist;
      return {
        state, questions,
        ler: (ans) => { const respostas = {}; for (const d of decs) respostas[d.id] = ans[d.id]; return { respostas }; },
      };
    }

    case 'provas': {
      const p = entrada.pergunta || {};
      const exemplos = Array.isArray(entrada.exemplos) ? entrada.exemplos.slice(0, 30) : [];
      if (!exemplos.length) throw new ErroEntrada('sem exemplos');
      if (!['choice', 'noul', 'score'].includes(p.tipo)) throw new ErroEntrada('tipo de pergunta inválido');
      const dec = { id: 'x', tipo: p.tipo, pergunta: corta(p.pergunta, 400) };
      if (!dec.pergunta) throw new ErroEntrada('escreva a pergunta');
      if (p.tipo === 'choice') {
        const op = (Array.isArray(p.opcoes) ? p.opcoes : []).slice(0, 8).map((o) => ({ id: corta(o.id, 40).replace(/\s+/g, '_'), desc: corta(o.desc || o.id, 160) })).filter((o) => o.id);
        if (op.length < 2) throw new ErroEntrada('a escolha precisa de 2 ou mais opções');
        dec.opcoes = op;
      }
      if (p.tipo === 'score') { dec.niveis = (Array.isArray(p.niveis) ? p.niveis : []).slice(0, 6).map((n) => corta(n, 120)); if (dec.niveis.length < 2) throw new ErroEntrada('a escala precisa de 2 ou mais níveis'); }
      const questions = {}, mapa = [];
      exemplos.forEach((e, i) => { const k = `e${i}`; questions[k] = pergunta(dec, {}, entrada, `Exemplo: «${corta(e.texto, 400)}»`); mapa.push([k, String(e.id ?? i)]); });
      return {
        state: { tarefa: 'classificar cada exemplo' },
        questions,
        ler: (ans) => { const itens = {}; for (const [k, id] of mapa) itens[id] = ans[k]; return { itens }; },
      };
    }

    case 'laboratorio': {
      let state = entrada.state;
      if (typeof state === 'string') state = corta(state, 6000);
      if (state == null || JSON.stringify(state).length > 6000) throw new ErroEntrada('o estado precisa ter até 6 mil caracteres');
      const q = entrada.questions || {};
      const chaves = Object.keys(q);
      if (!chaves.length || chaves.length > 10) throw new ErroEntrada('de 1 a 10 perguntas');
      const questions = {};
      for (const k of chaves) {
        const v = q[k] || {}; const id = corta(k, 40).replace(/[^\w-]/g, '_');
        if (!['choice', 'score', 'noul'].includes(v.type)) throw new ErroEntrada(`pergunta "${id}": type deve ser choice, score ou noul`);
        const instructions = corta(v.instructions, 600);
        if (!instructions) throw new ErroEntrada(`pergunta "${id}": escreva as instruções`);
        const out = { type: v.type, instructions };
        if (v.type === 'choice') {
          const crit = v.criteria && typeof v.criteria === 'object' && !Array.isArray(v.criteria) ? Object.entries(v.criteria).slice(0, 12) : [];
          if (crit.length < 2) throw new ErroEntrada(`pergunta "${id}": a escolha precisa de 2 ou mais opções`);
          out.criteria = Object.fromEntries(crit.map(([a, b]) => [corta(a, 40), corta(b, 200)]));
        }
        if (v.type === 'score') {
          const crit = Array.isArray(v.criteria) ? v.criteria.slice(0, 10).map((x) => corta(x, 160)) : [];
          if (crit.length < 2) throw new ErroEntrada(`pergunta "${id}": a escala precisa de 2 a 10 níveis`);
          out.criteria = crit;
        }
        questions[id] = out;
      }
      return { state, questions, ler: (ans) => ({ respostas: ans }) };
    }

    case 'palco': {
      // o app desenha a própria tela (palco.js) e chama "jogadas" mandando só DADOS: o texto falado, os sinais da câmera,
      // o estado do jogo. As perguntas saem sempre da jogada do modelo, nunca da página.
      const nome = String(entrada.jogada || '');
      const J = spec.jogadas && Object.prototype.hasOwnProperty.call(spec.jogadas, nome) ? spec.jogadas[nome] : null;
      if (!J || typeof J.perguntas !== 'function') throw new ErroEntrada(`jogada "${nome}" não existe neste app`);
      const dados = entrada.dados && typeof entrada.dados === 'object' && !Array.isArray(entrada.dados) ? entrada.dados : {};
      if (JSON.stringify(dados).length > LIM.dados) throw new ErroEntrada('dados grandes demais para uma jogada');
      const decs = Object.fromEntries((spec.decisoes || []).map((d) => [d.id, d]));
      const questions = {}, decisaoDe = {}, locais = {};
      for (const q of [].concat(J.perguntas(dados, ctx, ajustes) || [])) {
        if (!q) continue;
        const d = decs[q.decisao];
        if (!d) throw new Error(`jogada "${nome}": a decisão "${q.decisao}" não existe`);
        const chave = String(q.chave || q.decisao);
        if (!/^[a-z0-9_]{1,40}$/.test(chave)) throw new Error(`jogada "${nome}": chave inválida "${chave}"`);
        if (questions[chave] || locais[chave]) throw new Error(`jogada "${nome}": chave repetida "${chave}"`);
        // q.local: resposta que o modelo já sabe sem perguntar (ex.: item que a história nunca citou)
        if (q.local) { locais[chave] = q.local; decisaoDe[chave] = d.id; continue; }
        const dec = q.opcoes ? { ...d, opcoes: opcoesLimpas(q.opcoes) } : d;
        questions[chave] = pergunta(dec, ctx, entrada, q.alvo ? corta(q.alvo, LIM.alvo) : null);
        decisaoDe[chave] = d.id;
      }
      limitar(questions);
      const st = typeof J.estado === 'function' ? (J.estado(dados, ctx, ajustes) || {}) : {};
      return {
        state: { ...base, ...st },
        questions,
        decisaoDe,
        ler: (ans) => {
          const respostas = { ...locais };
          for (const k of Object.keys(questions)) respostas[k] = ans[k];
          return { respostas };
        },
      };
    }

    default:
      throw new Error(`motor desconhecido: ${spec.motor}`);
  }
}

function limitar(questions) {
  const n = Object.keys(questions).length;
  if (!n) throw new ErroEntrada('nenhuma pergunta montada');
  if (n > LIM.perguntas) throw new ErroEntrada(`perguntas demais numa chamada (${n}); mande menos itens por vez`);
}

// confere um modelo antes de publicar: devolve a lista de problemas (vazia = ok)
export function conferirModelo(spec) {
  const p = [];
  const req = ['id', 'titulo', 'emoji', 'categoria', 'resumo', 'descricao', 'motor', 'decisoes'];
  for (const k of req) if (spec[k] == null || spec[k] === '') p.push(`falta "${k}"`);
  if (spec.id && !/^[a-z0-9-]+$/.test(spec.id)) p.push('id só com letras minúsculas, números e hífen');
  const motores = ['fluxo', 'aovivo', 'conversa', 'agente', 'pares', 'provas', 'laboratorio', 'palco'];
  if (!motores.includes(spec.motor)) p.push(`motor inválido: ${spec.motor}`);
  const ctx = (() => { try { return contextoDe(spec); } catch (e) { p.push('contexto quebrou: ' + e.message); return {}; } })();
  const ids = new Set();
  for (const d of spec.decisoes || []) {
    if (!d.id || !/^[a-z0-9_]+$/.test(d.id)) p.push(`decisão com id inválido: ${d.id}`);
    if (ids.has(d.id)) p.push(`decisão repetida: ${d.id}`); ids.add(d.id);
    if (!['choice', 'score', 'noul'].includes(d.tipo)) p.push(`decisão ${d.id}: tipo inválido`);
    if (!d.pergunta || d.pergunta.length < 12) p.push(`decisão ${d.id}: pergunta curta demais`);
    if (d.tipo === 'choice') {
      try { const c = opcoesDe(d, ctx, {}); const n = Object.keys(c).length; if (n < 2 || n > 255) p.push(`decisão ${d.id}: choice precisa de 2 a 255 opções (tem ${n})`); } catch (e) { p.push(`decisão ${d.id}: ${e.message}`); }
    }
    if (d.tipo === 'score') { const n = (d.niveis || []).length; if (n < 2 || n > 10) p.push(`decisão ${d.id}: score precisa de 2 a 10 níveis`); }
  }
  if (['fluxo', 'pares'].includes(spec.motor) && !(spec.dados || []).length) p.push('faltam os dados de exemplo (dados)');
  if (spec.motor === 'fluxo') {
    const col = spec.fluxo && spec.fluxo.colunas;
    if (spec.fluxo?.layout !== 'feed' && spec.fluxo?.layout !== 'linha') {
      const d = (spec.decisoes || []).find((x) => x.id === col);
      if (!d) p.push('fluxo.colunas precisa apontar para uma decisão choice');
      else if (d.tipo !== 'choice') p.push('fluxo.colunas precisa ser uma decisão choice');
    }
    const semId = (spec.dados || []).filter((x) => x.id == null).length;
    if (semId) p.push(`${semId} item(ns) de dados sem id`);
  }
  if (['conversa'].includes(spec.motor) && !(spec.roteiros || []).length) p.push('faltam os roteiros (conversas de exemplo)');
  if (['agente'].includes(spec.motor) && !(spec.roteiros || []).length) p.push('faltam os roteiros do agente');
  if (['aovivo'].includes(spec.motor) && !(spec.exemplos || []).length) p.push('faltam os exemplos para digitar');
  if (spec.motor === 'pares' && !(spec.paresDemo || []).length && !spec.pares?.automatico) p.push('faltam os pares de exemplo (paresDemo)');
  if (spec.motor === 'palco') {
    const J = spec.jogadas;
    if (!J || typeof J !== 'object' || !Object.keys(J).length) p.push('faltam as jogadas (o que a tela pede ao Jev)');
    else for (const [k, j] of Object.entries(J)) if (!j || typeof j.perguntas !== 'function') p.push(`jogada ${k}: falta perguntas(dados, ctx)`);
    if (!spec.palco || typeof spec.palco.modulo !== 'string' || !/\.m?js$/.test(spec.palco.modulo)) p.push('falta palco.modulo (o arquivo .js que desenha a tela)');
    for (const t of spec.testes || []) if (!J || !J[t.jogada]) p.push(`teste "${t.titulo}": a jogada "${t.jogada}" não existe`);
  }
  return p;
}

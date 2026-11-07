// Intenções em qualquer site: rota genérica que o script /_jev/intencoes.js chama no MESMO endereço do site.
// O navegador manda só contagens de comportamento (rolagem, cliques, tempo, formulários sem valores) e textos da própria
// página (título, seções, botão principal). O Jev lê o estado do visitante e escolhe a reação; o texto é modelo do script.
// Uso num app do showcase: import { registrarIntencoes } from '../../shared/server/intencoes.mjs'; registrarIntencoes(app);
import { HttpError } from './kit.mjs';

const ESTADOS = {
  explorando: 'Explorando: chegou há pouco ou passeia pela página sem foco em nada',
  lendo_com_interesse: 'Lendo com interesse: rola com calma e passa tempo nas seções, sem sinais de conflito',
  hesitando: 'Hesitando: passa o mouse na ação principal da página, vai e volta, mas não clica',
  procurando: 'Procurando algo: sobe e desce várias vezes, pula entre seções ou usa a busca sem achar',
  com_pressa: 'Com pressa: acabou de rolar a página rápido demais, sem parar para ler',
  frustrado: 'Frustrado: cliques que não fazem nada, cliques de raiva (vários seguidos no mesmo lugar) ou erros ao enviar formulário',
  pronto_para_agir: 'Pronto para agir: clicou na ação principal ou preenche um formulário sem erros',
  prestes_a_sair: 'Prestes a sair: o mouse saiu pelo topo da janela ou voltou rápido ao topo para ir embora',
};
const REACOES = {
  nenhuma: 'Nenhuma: nada de novo aconteceu, o visitante está bem, lendo ou agindo sem problema; não interromper',
  boas_vindas: 'Dar boas-vindas: o visitante chegou há menos de 15 segundos e o mascote ainda não falou',
  resumir_pagina: 'Mostrar o resumo da página, com atalhos para as seções: acabou de rolar rápido demais ou está procurando algo',
  destacar_acao_principal: 'Destacar a ação principal da página: está hesitando perto dela, ou já leu bastante e não achou o próximo passo',
  convidar_a_rolar: 'Mostrar que há mais conteúdo abaixo: está parado no topo há um tempo, sem rolar',
  oferecer_ajuda: 'Oferecer ajuda: está procurando algo e não acha',
  acalmar: 'Pedir desculpas e ajudar: está frustrado — cliques que não fizeram nada, cliques de raiva ou erros de formulário',
  segurar_saida: 'Segurar a saída com carinho: o mouse saiu pelo topo da janela ou voltou rápido ao topo',
  chamar_atencao: 'Chamar a atenção com leveza: está parado há 20 segundos ou mais, sem mexer em nada',
  reconhecer_interesse: 'Reconhecer o interesse: lê com calma há bastante tempo, sem conflito',
};
export const INTENCOES_INFO = {
  estados: {
    explorando: ['🧭', 'explorando'], lendo_com_interesse: ['📖', 'lendo com interesse'], hesitando: ['🤔', 'hesitando'], procurando: ['🔎', 'procurando algo'],
    com_pressa: ['🏃', 'com pressa'], frustrado: ['😤', 'frustrado'], pronto_para_agir: ['✅', 'pronto para agir'], prestes_a_sair: ['🚪', 'prestes a sair'],
  },
  reacoes: Object.keys(REACOES),
};
const QUESTIONS = {
  estado: { type: 'choice', instructions: 'Pelo comportamento recente, qual é o estado deste visitante AGORA?', criteria: ESTADOS },
  reacao: { type: 'choice', instructions: 'Qual reação o mascote da página deve ter AGORA? Não repita reações já mostradas; se nada de novo aconteceu, ou se o mascote foi silenciado, escolha nenhuma.', criteria: REACOES },
  prob_acao: { type: 'noul', instructions: 'Este visitante vai realizar a ação principal desta página nesta visita?', criteria: { true: 'Vai realizar a ação principal', false: 'Não vai realizar a ação principal' } },
};

const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n * 10) / 10)) : 0; };
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);

function limpar(raw) {
  const s = obj(raw), p = obj(s.pagina), r = obj(s.rolagem), c = obj(s.cliques), a = obj(s.acao), f = obj(s.formularios), b = obj(s.bit), sa = obj(s.saida);
  return {
    pagina: {
      titulo: txt(p.titulo, 90), contexto: txt(p.contexto, 220), secoes: arr(p.secoes).map((x) => txt(x, 50)).filter(Boolean).slice(0, 10),
      acao_principal: txt(p.acao_principal, 50), secao_atual: txt(p.secao_atual, 50),
    },
    t: num(s.t, 36000),
    rolagem: { max: num(r.max, 100), atual: num(r.atual, 100), inversoes_20s: num(r.inversoes_20s, 99), rapidas_20s: num(r.rapidas_20s, 99), desceu_rapido: !!r.desceu_rapido, subiu_rapido: !!r.subiu_rapido },
    cliques: { total: num(c.total, 9999), raiva: num(c.raiva, 99), mortos: num(c.mortos, 99), sem_efeito: num(c.sem_efeito, 99), ultimo_sem_efeito: txt(c.ultimo_sem_efeito, 50) },
    acao: { passagens: num(a.passagens, 999), segundos: num(a.segundos, 3600), cliques: num(a.cliques, 99) },
    formularios: { focos: num(f.focos, 999), preenchidos: num(f.preenchidos, 99), envios: num(f.envios, 99), erros: num(f.erros, 99) },
    copiou: num(s.copiou, 99),
    ocioso_s: num(s.ocioso_s, 3600),
    saida: { vezes: num(sa.vezes, 99), ha_s: sa.ha_s == null ? null : num(sa.ha_s, 3600) },
    eventos: arr(s.eventos).slice(-8).map((e) => txt(e, 70)).filter(Boolean),
    reacoes: [...new Set(arr(s.reacoes).filter((x) => x in REACOES && x !== 'nenhuma'))].slice(0, 10),
    bit: { falou_ha_s: b.falou_ha_s == null ? null : num(b.falou_ha_s, 36000), falas: num(b.falas, 999), mudo: !!b.mudo },
  };
}

function montarEstado(s) {
  const pg = s.pagina;
  return {
    pagina: {
      titulo: pg.titulo || '(sem título)',
      sobre: pg.contexto || 'site sem descrição',
      secoes: pg.secoes.length ? pg.secoes : 'sem seções com título',
      acao_principal: pg.acao_principal ? `botão "${pg.acao_principal}"` : 'não identificada',
    },
    comportamento_do_visitante: {
      tempo_na_pagina: `${s.t} s`,
      secao_olhando_agora: pg.secao_atual || 'topo',
      rolagem: `chegou a ${s.rolagem.max}% da página (agora em ${s.rolagem.atual}%); ${s.rolagem.inversoes_20s} inversões (sobe e desce) nos últimos 20 s`
        + (s.rolagem.rapidas_20s ? `; rolou rápido demais para baixo ${s.rolagem.rapidas_20s} vez(es) nos últimos 20 s` : '')
        + (s.rolagem.desceu_rapido ? '; ACABOU de descer a página muito rápido' : '')
        + (s.rolagem.subiu_rapido ? '; acabou de voltar rápido ao topo' : ''),
      acao_principal: `mouse passou ${s.acao.passagens} vez(es) sobre ela (${s.acao.segundos} s no total); clicou ${s.acao.cliques} vez(es)`,
      cliques: `${s.cliques.total} cliques; ${s.cliques.raiva} rajada(s) de raiva; ${s.cliques.mortos} em coisas que não são botão; ${s.cliques.sem_efeito} em botões que não fizeram nada`
        + (s.cliques.ultimo_sem_efeito ? ` (o último: "${s.cliques.ultimo_sem_efeito}")` : ''),
      formularios: `${s.formularios.focos} foco(s) em campos; ${s.formularios.preenchidos} campo(s) preenchido(s); ${s.formularios.envios} envio(s); ${s.formularios.erros} erro(s) de validação`,
      copiou_texto: s.copiou ? `${s.copiou} vez(es)` : 'não',
      parado_sem_mexer_ha: `${s.ocioso_s} s`,
      intencao_de_saida: s.saida.vezes ? `o mouse saiu pelo topo ${s.saida.vezes} vez(es), a última há ${s.saida.ha_s ?? 0} s` : 'nenhuma',
      ultimos_eventos: s.eventos.length ? s.eventos : 'nenhum',
    },
    reacoes_ja_mostradas: s.reacoes.length ? s.reacoes : 'nenhuma',
    mascote: s.bit.mudo ? 'silenciado pelo visitante: não deve falar' : s.bit.falou_ha_s == null ? 'ainda não falou' : `falou há ${s.bit.falou_ha_s} s (${s.bit.falas} fala(s))`,
  };
}

export function registrarIntencoes(app) {
  app.post('/_jev/intencoes/decidir', async ({ body, jev }) => {
    if (!body || !body.sinais || typeof body.sinais !== 'object') throw new HttpError(400, 'Resumo de comportamento ausente.');
    const s = limpar(body.sinais);
    const r = await jev({ state: montarEstado(s), questions: QUESTIONS });
    const a = r.answers;
    const pr = (q) => (q && q.probabilities && q.probabilities[q.choice]) || 0;
    return {
      ok: true,
      estado: { escolha: a.estado.choice, p: pr(a.estado), probabilidades: a.estado.probabilities },
      reacao: { escolha: a.reacao.choice, p: pr(a.reacao) },
      prob_acao: a.prob_acao?.noul ?? 0,
      latency_ms: r.latency_ms, cost: r.cost,
    };
  }, { rate: 60 });
  app.get('/_jev/intencoes/info', () => ({ ok: true, ...INTENCOES_INFO }));
}

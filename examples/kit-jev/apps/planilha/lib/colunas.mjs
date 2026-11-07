// Planilha Preditiva — como um título de coluna vira perguntas tipadas para o Jev.
// Regras do título: termina com "?" → sim/não (noul); "Prefixo: a, b, c" → categorias (choice + "outro");
// qualquer outro título → o Jev escolhe um dos MODELOS abaixo (pergunta choice "meta").
// Todo texto exibido é escrito aqui; o Jev só escolhe, pontua e estima.

export const MODELOS = {
  urgencia: {
    kind: 'score', rotulo: 'Escala de urgência (0–4)', curto: 'urgência 0–4', paleta: 'risco',
    meta: 'Urgência: quão rápido cada linha precisa de resposta ou ação (títulos como "Urgência", "Urgente", "Prazo de resposta", "Responder hoje")',
    pergunta: 'qual a urgência desta linha — quão rápido ela precisa de resposta ou ação?',
    niveis: ['Nenhuma: só comentário, elogio ou conversa; não pede nada', 'Baixa: dúvida ou pedido que pode esperar alguns dias', 'Média: vale responder em até 1 dia', 'Alta: precisa de resposta ainda hoje (venda quente, problema bloqueante)', 'Crítica: prejuízo em curso, ameaça (Procon, processo, cancelamento) ou prazo imediato'],
    curtos: ['nenhuma', 'baixa', 'média', 'alta', 'crítica'],
  },
  sentimento: {
    kind: 'choice', rotulo: 'Sentimento (positivo · neutro · negativo · misto)', curto: 'sentimento',
    meta: 'Sentimento ou emoção geral da linha (títulos como "Sentimento", "Humor", "Satisfação", "Positivo ou negativo", "Emoção")',
    pergunta: 'qual o sentimento geral desta linha?',
    opcoes: { positivo: 'Positivo: satisfeito, elogia, agradece ou demonstra entusiasmo', neutro: 'Neutro: informativo, pergunta ou pedido sem emoção clara', negativo: 'Negativo: insatisfeito, reclama, critica, está com raiva ou decepcionado (inclusive com ironia)', misto: 'Misto: tem pontos positivos e negativos ao mesmo tempo' },
    cores: { positivo: 'verde', neutro: 'cinza', negativo: 'vermelho', misto: 'ambar' },
  },
  intencao_compra: {
    kind: 'score', rotulo: 'Intenção de compra (0–3)', curto: 'intenção 0–3', paleta: 'quente',
    meta: 'Intensidade da intenção de compra em escala (títulos como "Intenção de compra", "Chance de fechar", "Temperatura do lead", "Lead quente", "Vai comprar")',
    pergunta: 'qual o nível de intenção de compra de quem escreveu esta linha?',
    niveis: ['Nenhuma: não demonstra interesse em comprar', 'Curiosidade: interesse vago no assunto, sem falar em compra', 'Interesse: pergunta preço, condições, conteúdo ou garantia', 'Pronto para comprar: pede link ou forma de pagamento, ou diz que vai comprar'],
    curtos: ['nenhuma', 'curioso', 'interessado', 'pronto'],
  },
  prioridade: {
    kind: 'score', rotulo: 'Prioridade de atendimento (baixa → máxima)', curto: 'prioridade', paleta: 'quente',
    meta: 'Prioridade para atender ou tratar a linha primeiro, combinando valor para o negócio e urgência (títulos como "Prioridade", "Atender primeiro", "Importância", "Fila")',
    pergunta: 'qual a prioridade para a equipe tratar esta linha, considerando valor para o negócio e urgência?',
    niveis: ['Baixa: pode ficar para depois ou ser ignorada', 'Normal: tratar na fila comum', 'Alta: tratar hoje, tem valor ou risco relevante', 'Máxima: tratar agora, alto valor ou risco grave'],
    curtos: ['baixa', 'normal', 'alta', 'máxima'],
  },
  risco_churn: {
    kind: 'score', rotulo: 'Risco de cancelar / perder o cliente (0–4)', curto: 'risco 0–4', paleta: 'risco',
    meta: 'Risco de a pessoa cancelar, desistir, pedir reembolso ou não comprar de novo (títulos como "Risco de cancelar", "Churn", "Cliente em risco", "Vai voltar a comprar")',
    pergunta: 'qual o risco de perdermos esta pessoa como cliente (cancelar, pedir reembolso ou nunca mais comprar)?',
    niveis: ['Nenhum: satisfeita, tende a continuar cliente', 'Baixo: pequena insatisfação', 'Médio: insatisfeita, pode desistir', 'Alto: muito insatisfeita, fala em cancelar, devolver ou não comprar mais', 'Crítico: exige reembolso, ameaça Procon/processo ou já decidiu ir embora'],
    curtos: ['nenhum', 'baixo', 'médio', 'alto', 'crítico'],
  },
  senioridade: {
    kind: 'score', rotulo: 'Senioridade (estágio → especialista)', curto: 'senioridade', paleta: 'neutro',
    meta: 'Nível de senioridade profissional da pessoa (títulos como "Senioridade", "Nível", "Júnior, pleno ou sênior", "Nível de experiência")',
    pergunta: 'qual o nível de senioridade profissional desta pessoa na área em que atua?',
    niveis: ['Estágio / iniciante: estudando ou sem experiência profissional', 'Júnior: até ~2 anos, precisa de supervisão', 'Pleno: 3 a 5 anos, trabalha com autonomia', 'Sênior: 6+ anos, referência técnica, mentora outras pessoas', 'Especialista / liderança: arquiteta sistemas, lidera times ou é referência no mercado'],
    curtos: ['estágio', 'júnior', 'pleno', 'sênior', 'especialista'],
  },
  fit_vaga: {
    kind: 'score', rotulo: 'Fit para a vaga (0–4)', curto: 'fit 0–4', paleta: 'bom',
    meta: 'Aderência de uma pessoa candidata à vaga descrita no contexto (títulos como "Fit para a vaga", "Match", "Aderência", "Contratar", "Combina com a vaga")',
    pergunta: 'quão bem esta pessoa se encaixa na vaga descrita no contexto (stack, senioridade e experiência)?',
    niveis: ['Nenhum: área ou stack sem relação com a vaga', 'Fraco: faltam os requisitos principais', 'Parcial: tem parte da stack ou da senioridade', 'Bom: atende quase todos os requisitos', 'Excelente: stack, senioridade e experiência ideais para a vaga'],
    curtos: ['nenhum', 'fraco', 'parcial', 'bom', 'excelente'],
  },
  tom: {
    kind: 'score', rotulo: 'Tom / formalidade (informal → formal)', curto: 'formalidade', paleta: 'neutro',
    meta: 'Tom ou nível de formalidade da escrita (títulos como "Tom", "Formalidade", "Linguagem", "É formal")',
    pergunta: 'qual o nível de formalidade do texto desta linha?',
    niveis: ['Muito informal: gírias, abreviações, emojis, sem pontuação', 'Informal: conversa descontraída', 'Neutro', 'Formal: linguagem cuidada e educada', 'Muito formal: linguagem corporativa ou protocolar'],
    curtos: ['muito informal', 'informal', 'neutro', 'formal', 'muito formal'],
  },
  toxicidade: {
    kind: 'score', rotulo: 'Toxicidade (0–3)', curto: 'toxicidade 0–3', paleta: 'risco',
    meta: 'Nível de agressividade, ofensa ou toxicidade (títulos como "Toxicidade", "Agressividade", "Grosseria", "Ofensivo")',
    pergunta: 'qual o nível de toxicidade ou agressividade do texto desta linha?',
    niveis: ['Respeitoso: educado ou neutro', 'Ríspido: irritado, impaciente ou sarcástico, sem ofensas', 'Ofensivo: xingamentos, deboche ou desrespeito', 'Abusivo: ameaças, ataques pessoais ou discurso de ódio'],
    curtos: ['respeitoso', 'ríspido', 'ofensivo', 'abusivo'],
  },
  qualidade_escrita: {
    kind: 'score', rotulo: 'Qualidade da escrita (0–4)', curto: 'escrita 0–4', paleta: 'bom',
    meta: 'Qualidade, clareza e correção da escrita (títulos como "Qualidade da escrita", "Português", "Clareza", "Bem escrito", "Erros de ortografia")',
    pergunta: 'qual a qualidade da escrita desta linha (clareza, gramática e ortografia)?',
    niveis: ['Péssima: confusa, com muitos erros', 'Fraca: vários erros ou pouco clara', 'Razoável: compreensível, com alguns erros', 'Boa: clara e quase sem erros', 'Excelente: clara, bem estruturada e sem erros'],
    curtos: ['péssima', 'fraca', 'razoável', 'boa', 'excelente'],
  },
  idioma: {
    kind: 'choice', rotulo: 'Idioma', curto: 'idioma',
    meta: 'Idioma em que a linha está escrita (títulos como "Idioma", "Língua", "Em que língua")',
    pergunta: 'em que idioma o texto desta linha está escrito?',
    opcoes: { português: 'Português', inglês: 'Inglês', espanhol: 'Espanhol', outro: 'Outro idioma, ou só emojis/números' },
    cores: { português: 'verde', inglês: 'azul', espanhol: 'ambar', outro: 'cinza' },
  },
  spam: {
    kind: 'noul', rotulo: 'É spam ou golpe? (sim/não)', curto: 'spam?', alerta: true,
    meta: 'Detectar spam, golpe, bot ou propaganda não solicitada (títulos como "Spam", "Golpe", "Bot", "Fake", "Lixo")',
    pergunta: 'esta linha é spam, golpe, bot ou propaganda não solicitada?',
  },
  reembolso: {
    kind: 'noul', rotulo: 'Pede reembolso ou troca? (sim/não)', curto: 'reembolso?', alerta: true,
    meta: 'Detectar pedido de reembolso, estorno, devolução, troca ou cancelamento (títulos como "Pede reembolso", "Devolução", "Estorno", "Troca", "Cancelamento")',
    pergunta: 'quem escreveu esta linha pede reembolso, estorno, devolução, troca ou cancelamento?',
  },
  concorrente: {
    kind: 'noul', rotulo: 'Menciona concorrente? (sim/não)', curto: 'concorrente?', alerta: true,
    meta: 'Detectar menção a concorrentes, outras lojas, marcas ou plataformas alternativas (títulos como "Menciona concorrente", "Concorrência", "Cita outra loja")',
    pergunta: 'esta linha menciona um concorrente, outra loja, marca ou plataforma alternativa?',
  },
  sarcasmo: {
    kind: 'noul', rotulo: 'É irônico ou sarcástico? (sim/não)', curto: 'ironia?', alerta: true,
    meta: 'Detectar ironia ou sarcasmo (títulos como "Sarcasmo", "Ironia", "É irônico", "Deboche")',
    pergunta: 'o texto desta linha é irônico ou sarcástico (diz o contrário do que quer dizer)?',
  },
  intencao: {
    kind: 'choice', rotulo: 'Intenção da mensagem', curto: 'intenção',
    meta: 'Classificar a intenção ou o motivo do contato de quem escreveu (títulos como "Intenção", "Motivo do contato", "Tipo de lead", "O que a pessoa quer")',
    pergunta: 'qual a principal intenção de quem escreveu esta linha?',
    opcoes: { comprar: 'Quer comprar ou contratar', 'saber preço': 'Pergunta preço, condições ou detalhes antes de decidir', parceria: 'Propõe parceria, publicidade, collab, evento ou entrevista', suporte: 'Precisa de ajuda: problema de acesso, dúvida técnica ou reclamação', elogio: 'Elogia, agradece ou só interage', spam: 'Spam, golpe ou propaganda', outro: 'Outra intenção' },
    cores: { comprar: 'verde', 'saber preço': 'lima', parceria: 'violeta', suporte: 'ambar', elogio: 'rosa', spam: 'vermelho', outro: 'cinza' },
  },
  assunto: {
    kind: 'choice', rotulo: 'Assunto principal', curto: 'assunto',
    meta: 'Assunto, tema ou categoria principal da linha quando NÃO foram listadas opções (títulos como "Assunto", "Tema", "Tópico", "Categoria", "Sobre o quê")',
    pergunta: 'qual o assunto principal desta linha?',
    opcoes: { produto: 'Produto: qualidade, funcionamento, características ou defeito', preço: 'Preço, valor, desconto ou pagamento', entrega: 'Entrega, frete, prazo ou envio', atendimento: 'Atendimento, suporte, SAC ou troca', 'dúvida técnica': 'Dúvida técnica ou sobre conteúdo', comercial: 'Proposta comercial, parceria ou vaga', outro: 'Outro assunto' },
    cores: { produto: 'violeta', preço: 'lima', entrega: 'azul', atendimento: 'ambar', 'dúvida técnica': 'ciano', comercial: 'rosa', outro: 'cinza' },
  },
  problema: {
    kind: 'choice', rotulo: 'Problema relatado', curto: 'problema',
    meta: 'Qual problema, defeito ou motivo de reclamação a linha relata (títulos como "Problema", "Defeito", "Motivo da reclamação", "O que deu errado")',
    pergunta: 'qual o principal problema relatado nesta linha?',
    opcoes: { nenhum: 'Nenhum problema: elogio ou comentário neutro', atraso: 'Atraso, extravio ou falha na entrega', defeito: 'Produto com defeito, quebrado ou que parou de funcionar', tamanho: 'Tamanho ou medida errada', 'diferente do anúncio': 'Produto diferente do anunciado (cor, modelo, peças faltando)', atendimento: 'Atendimento ruim ou sem resposta', cobrança: 'Preço alto ou cobrança errada', outro: 'Outro problema' },
    cores: { nenhum: 'verde', atraso: 'azul', defeito: 'vermelho', tamanho: 'violeta', 'diferente do anúncio': 'rosa', atendimento: 'ambar', cobrança: 'laranja', outro: 'cinza' },
  },
  proxima_acao: {
    kind: 'choice', rotulo: 'Próxima ação recomendada', curto: 'próxima ação',
    meta: 'Recomendar a próxima ação ou o encaminhamento para a linha (títulos como "Próxima ação", "O que fazer", "Encaminhar para", "Como responder", "Ação")',
    pergunta: 'qual deve ser a próxima ação da equipe para esta linha?',
    opcoes: { 'enviar link de compra': 'Enviar o link de pagamento e fechar a venda', 'enviar preço': 'Mandar preço, condições e detalhes', 'passar ao suporte': 'Encaminhar ao suporte para resolver um problema', 'passar a parcerias': 'Encaminhar ao time comercial/parcerias', agradecer: 'Só agradecer e manter o relacionamento', 'ignorar / bloquear': 'Ignorar, bloquear ou denunciar (spam ou golpe)', 'pedir detalhes': 'Pedir mais informações antes de agir' },
    cores: { 'enviar link de compra': 'verde', 'enviar preço': 'lima', 'passar ao suporte': 'ambar', 'passar a parcerias': 'violeta', agradecer: 'rosa', 'ignorar / bloquear': 'vermelho', 'pedir detalhes': 'azul' },
  },
  nota_prevista: {
    kind: 'score', rotulo: 'Nota prevista (1 a 5 estrelas)', curto: 'estrelas 1–5', paleta: 'bom', base: 1,
    meta: 'Prever a nota em estrelas ou a satisfação numérica a partir do texto (títulos como "Nota prevista", "Estrelas", "Nota do texto", "Satisfação de 1 a 5", "NPS")',
    pergunta: 'pelo texto desta linha, que nota de 1 a 5 estrelas a pessoa daria?',
    niveis: ['1 estrela: muito insatisfeita', '2 estrelas: insatisfeita', '3 estrelas: neutra ou dividida', '4 estrelas: satisfeita', '5 estrelas: encantada'],
    curtos: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
  },
  potencial: {
    kind: 'score', rotulo: 'Potencial comercial (0–4)', curto: 'potencial 0–4', paleta: 'quente',
    meta: 'Potencial de receita, alcance ou influência que a linha representa para o negócio (títulos como "Potencial", "Valor do lead", "Influência", "Tamanho da oportunidade", "Vale a pena")',
    pergunta: 'qual o potencial comercial desta linha para o negócio (receita, alcance ou influência)?',
    niveis: ['Nenhum: sem valor comercial', 'Baixo', 'Médio', 'Alto', 'Muito alto: grande oportunidade de receita ou alcance'],
    curtos: ['nenhum', 'baixo', 'médio', 'alto', 'muito alto'],
  },
  escala: {
    kind: 'score', generico: true, rotulo: 'Escala genérica (0–4): quanto demonstra «{t}»', curto: 'escala 0–4', paleta: 'neutro',
    meta: 'Escala genérica de 0 a 4 para qualquer qualidade, grau ou intensidade sem modelo específico acima (títulos como "Criatividade", "Empolgação", "Nível de detalhe", "Profissionalismo", "Paciência")',
    pergunta: 'numa escala de 0 a 4, quanto esta linha demonstra "{t}"?',
    niveis: ['0 — nada: a linha não demonstra isso', '1 — pouco', '2 — moderadamente', '3 — bastante', '4 — muito forte ou totalmente'],
    curtos: ['nada', 'pouco', 'médio', 'bastante', 'total'],
  },
  simnao: {
    kind: 'noul', generico: true, rotulo: 'Sim/não genérico: «{t}»', curto: 'sim/não',
    meta: 'Sim/não genérico: uma característica que a linha tem ou não tem e que não corresponde a nenhum modelo acima (títulos como "Tem filhos", "Mora no Nordeste", "Fala de IA", "Menciona prazo", "Empresa")',
    pergunta: 'para esta linha, é verdade que "{t}"?',
  },
};

export const MODELO_IDS = Object.keys(MODELOS);

const OUTRO_RE = /^(outro|outros|outra|outras|nenhum|nenhuma|n\/a|other)$/i;
export const LIMITES = { titulo: 80, opcoes: 12, opcao: 40 };

export function limparTitulo(t) {
  return String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LIMITES.titulo);
}

// Regras determinísticas do título (não precisam do Jev).
export function regraDoTitulo(titulo) {
  const t = limparTitulo(titulo);
  if (!t) return { erro: 'Digite um título para a coluna.' };
  if (t.endsWith('?')) {
    if (t.replace(/[?\s¿]/g, '').length < 2) return { erro: 'Escreva uma pergunta, por exemplo "Quer comprar?".' };
    return { regra: 'pergunta', titulo: t };
  }
  const i = t.indexOf(':');
  if (i > 0) {
    const prefixo = t.slice(0, i).trim();
    const partes = t.slice(i + 1).split(/[,;|/]/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
    if (prefixo && partes.length >= 2) {
      const vistos = new Set(); const opcoes = [];
      for (const p of partes) {
        const op = p.slice(0, LIMITES.opcao);
        const k = op.toLocaleLowerCase('pt-BR');
        if (vistos.has(k) || OUTRO_RE.test(op)) continue;
        vistos.add(k); opcoes.push(op);
        if (opcoes.length >= LIMITES.opcoes) break;
      }
      if (opcoes.length >= 2) return { regra: 'categorias', titulo: t, prefixo, opcoes };
    }
  }
  return { regra: 'modelo', titulo: t };
}

const PALETA_CHOICE = ['violeta', 'ciano', 'ambar', 'rosa', 'verde', 'azul', 'laranja', 'lima', 'vermelho', 'teal', 'indigo', 'fucsia'];

// Especificação da coluna (vai para o cliente renderizar e volta ao servidor só como {titulo, modelo}).
export function specDaColuna(titulo, modeloForcado) {
  const r = regraDoTitulo(titulo);
  if (r.erro) return r;
  const t = r.titulo;
  if (!modeloForcado && r.regra === 'pergunta') {
    return { kind: 'noul', titulo: t, fonte: 'pergunta', modelo: null, rotulo: 'Coluna sim/não', curto: 'sim/não', pergunta: t, explicacao: 'o título termina com "?" → cada linha recebe a probabilidade de "sim"' };
  }
  if (!modeloForcado && r.regra === 'categorias') {
    const opcoes = [...r.opcoes, 'outro'];
    const cores = {}; opcoes.forEach((o, i) => { cores[o] = o === 'outro' ? 'cinza' : PALETA_CHOICE[i % PALETA_CHOICE.length]; });
    return { kind: 'choice', titulo: t, fonte: 'categorias', modelo: null, rotulo: `Categorias: ${r.opcoes.join(', ')} + outro`, curto: `${opcoes.length} categorias`, prefixo: r.prefixo, opcoes, cores, explicacao: `"${r.prefixo}:" seguido de opções → o Jev escolhe uma categoria por linha` };
  }
  if (!modeloForcado) return { pendente: true, titulo: t };
  const m = MODELOS[modeloForcado];
  if (!m) return { erro: 'Tipo de coluna desconhecido.' };
  const nome = r.regra === 'categorias' ? r.prefixo : t.replace(/\?+$/, '');
  const sub = (s) => s.replaceAll('{t}', nome);
  const base = { titulo: t, fonte: 'modelo', modelo: modeloForcado, kind: m.kind, rotulo: sub(m.rotulo), curto: m.curto, pergunta: sub(m.pergunta), alerta: !!m.alerta };
  if (m.kind === 'score') Object.assign(base, { niveis: m.niveis.map(sub), curtos: m.curtos, paleta: m.paleta, base: m.base || 0 });
  if (m.kind === 'choice') {
    const opcoes = Object.keys(m.opcoes);
    const cores = {}; opcoes.forEach((o, i) => { cores[o] = (m.cores && m.cores[o]) || PALETA_CHOICE[i % PALETA_CHOICE.length]; });
    Object.assign(base, { opcoes, descricoes: m.opcoes, cores });
  }
  return base;
}

// Pergunta do Jev para UMA linha (id) de acordo com a spec.
// compacto=true (planilhas grandes): os critérios longos vão uma vez só no state (ver extrasDoEstado) e cada
// pergunta leva só os rótulos curtos — ~25% menos tokens, medido com 88–95% de concordância nos níveis.
export function perguntaDaLinha(spec, id, compacto = false) {
  if (spec.fonte === 'pergunta') {
    return { type: 'noul', instructions: `Linha ${id}: ${spec.pergunta}` };
  }
  if (spec.fonte === 'categorias') {
    const criteria = {};
    for (const o of spec.opcoes) criteria[o] = o === 'outro' ? 'Nenhuma das outras opções se aplica a esta linha' : `${spec.prefixo}: ${o}`;
    return { type: 'choice', instructions: `Linha ${id}: qual opção de "${spec.prefixo}" melhor descreve esta linha?`, criteria };
  }
  const m = MODELOS[spec.modelo];
  const q = { type: m.kind, instructions: `Linha ${id}: ${spec.pergunta}` };
  if (m.kind === 'score') q.criteria = compacto ? spec.curtos.map((c, i) => `${i} — ${c}`) : spec.niveis;
  if (m.kind === 'choice') { q.criteria = {}; for (const [k, d] of Object.entries(m.opcoes)) q.criteria[k] = compacto ? k : d; }
  return q;
}

export function extrasDoEstado(spec, compacto) {
  if (!compacto || spec.fonte !== 'modelo') return {};
  const m = MODELOS[spec.modelo];
  if (m.kind === 'score') return { escala_da_coluna: spec.niveis.map((d, i) => `${i} — ${d}`) };
  if (m.kind === 'choice') return { opcoes_da_coluna: m.opcoes };
  return {};
}

// Pergunta "meta": que tipo de coluna a pessoa quer, só pelo título?
export function perguntaMeta(titulo, planilha) {
  const criteria = {};
  for (const [id, m] of Object.entries(MODELOS)) criteria[id] = m.meta;
  const state = {
    titulo_da_nova_coluna: titulo,
    planilha: planilha.nome,
    contexto: planilha.descricao,
    colunas_existentes: planilha.colunas,
    exemplo_de_linha: planilha.exemplo,
  };
  const questions = {
    modelo: {
      type: 'choice',
      instructions: `Numa planilha, alguém criou uma nova coluna digitando só o título "${titulo}" e quer que cada linha seja preenchida automaticamente. Qual modelo de coluna corresponde melhor ao que essa pessoa quer? Prefira um modelo específico quando o título combinar com ele; use "escala" ou "simnao" (genéricos) só quando nenhum específico servir.`,
      criteria,
    },
  };
  return { state, questions };
}

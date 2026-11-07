// Política do Mini Cluely — quem decide o quê.
//   Jev (TypeSafe): QUANDO ajudar, QUE ajuda, QUEM falou, que TOM, que MODO de conversa, o que é importante na TELA
//                   e de onde tirar o contexto para uma pergunta livre. Só escolhe e estima (probabilidades).
//   Modelo de texto rápido (Qwen3-4B no servidor): escreve o texto da ajuda, com um prompt curto montado a partir
//                   das decisões do Jev. Prompt organizado para reaproveitar o cache do llama.cpp (prefixo estável).
// Todo rótulo que a interface mostra está escrito aqui; nenhuma palavra-chave decide nada no código.

export const LIMITES = {
  fala: 600, falaMin: 2, historico: 40, contexto: 1500, papel: 80, pergunta: 400,
  imagemBytes: 3_200_000, linhasJev: 44, ocrChars: 3200,
  escutaPorSessao: 1500, escritasPorSessao: 120, telasPorSessao: 80, transcricoesPorSessao: 600,
};

// limiares calibrados em test/avaliar.mjs (3 roteiros, 40 falas)
export const LIMIAR = { mostrar: 0.6, pergunta: 0.45, termo: 0.7, sugerir: 0.4, nota: 0.7, momento: 0.45, linha: 0.5, telaSugerir: 0.55, fato: 0.45, rascunho: 0.55, geral: 0.6 };

// ---------------------------------------------------------------- escuta (1 chamada por fala)
export const MOMENTOS = {
  pergunta_para_voce: { label: 'Pergunta pra você', icone: '❓', cor: '#22d3ee',
    criterio: 'A fala faz uma pergunta que Você precisa responder agora (como funciona, preço, prazo, número, opinião, se consegue fazer algo, quem vai fazer)' },
  objecao: { label: 'Objeção ou reclamação', icone: '🛡️', cor: '#f87171',
    criterio: 'A fala mostra resistência, reclamação, medo ou preocupação (achou caro, sem tempo, não confia, medo de vazar dados, insatisfeito, precisa pensar ou consultar alguém)' },
  termo_tecnico: { label: 'Termo técnico', icone: '📖', cor: '#a78bfa',
    criterio: 'A fala usa sigla, jargão ou termo técnico que pode precisar de explicação (ex.: CAC, LTV, churn, API, SLA, ROI)' },
  tarefa_ou_prazo: { label: 'Tarefa ou prazo', icone: '✅', cor: '#34d399',
    criterio: 'Alguém pede, promete ou assume uma tarefa, entrega ou prazo (mandar a proposta, enviar o protocolo, até sexta, eu cuido disso)' },
  decisao: { label: 'Decisão', icone: '🏁', cor: '#fbbf24',
    criterio: 'Um acordo ou uma decisão é fechado (então fechado, vamos fazer, aprovado, pode seguir)' },
  dado_importante: { label: 'Dado importante', icone: '📌', cor: '#60a5fa',
    criterio: 'A fala informa um número, requisito, restrição, objetivo ou fato da situação que vale anotar' },
  explicacao_de_voce: { label: 'Você conduzindo', icone: '🗣️', cor: '#9ca3af',
    criterio: 'É Você explicando, apresentando, respondendo ou perguntando algo para conduzir a conversa' },
  conversa_social: { label: 'Conversa social', icone: '👋', cor: '#6b7280',
    criterio: 'Cumprimento, agradecimento, despedida ou conversa fiada, sem conteúdo de trabalho' },
};

export const AJUDAS = {
  responder: { label: 'Resposta sugerida', icone: '💬', criterio: 'Sugerir o que Você pode responder à pergunta que acabou de ser feita' },
  contornar: { label: 'Como contornar', icone: '🛡️', criterio: 'Sugerir como Você pode acolher e contornar a objeção, reclamação ou preocupação que acabou de aparecer' },
  explicar_termo: { label: 'Termo explicado', icone: '📖', criterio: 'Explicar para Você a sigla ou o termo técnico que acabou de aparecer' },
  anotar: { label: 'Só anotar', icone: '📝', criterio: 'Não precisa de sugestão agora: só vale registrar nas notas (tarefa, prazo, decisão ou dado)' },
  nenhuma: { label: 'Nada agora', icone: '🤫', criterio: 'Nenhuma ajuda: conversa normal, Você está conduzindo bem ou é conversa social' },
};
export const AJUDAS_LLM = new Set(['responder', 'contornar', 'explicar_termo']);

export const TONS = {
  consultivo: { label: 'consultivo', criterio: 'Consultivo: entende a situação e orienta, com perguntas' },
  confiante: { label: 'confiante', criterio: 'Confiante: seguro e direto, passa certeza' },
  empatico: { label: 'empático', criterio: 'Empático: acolhe o sentimento antes de resolver (irritação, medo, frustração)' },
  tecnico: { label: 'técnico', criterio: 'Técnico: preciso, com termos e números' },
  objetivo: { label: 'objetivo', criterio: 'Objetivo: curto e prático, sem rodeios' },
};

export const MODOS = {
  vendas: { label: 'Vendas', icone: '💼', criterio: 'Venda ou negociação comercial com um cliente' },
  reuniao_de_equipe: { label: 'Reunião de equipe', icone: '🗂️', criterio: 'Reunião de trabalho entre colegas: metas, decisões, tarefas' },
  atendimento: { label: 'Atendimento', icone: '🎧', criterio: 'Atendimento ou suporte a um cliente com problema, pedido ou reclamação' },
  entrevista: { label: 'Entrevista', icone: '🧑‍💼', criterio: 'Entrevista de emprego ou seleção' },
  aula_ou_palestra: { label: 'Aula', icone: '🎓', criterio: 'Aula, palestra ou treinamento' },
  conversa_informal: { label: 'Conversa informal', icone: '☕', criterio: 'Conversa pessoal ou informal, sem pauta de trabalho' },
};

export const SENTIMENTO = ['Muito negativo', 'Negativo', 'Neutro', 'Positivo', 'Muito positivo'];
const SENTIMENTO_CRIT = [
  'Muito negativo: irritada, hostil ou decidida a desistir',
  'Negativo: desconfiada, incomodada, preocupada ou resistente',
  'Neutro: objetiva, sem emoção clara',
  'Positivo: interessada, receptiva, colaborando',
  'Muito positivo: animada, convencida, agradecida',
];

// O que uma boa conversa de cada tipo cobre (checklist ao vivo; alimenta as "perguntas de follow-up")
export const COBERTURA = {
  vendas: { dor: 'a dor ou o problema do cliente', impacto: 'o tamanho do problema (números, perdas, tempo)', decisor: 'quem decide ou aprova a compra',
    orcamento: 'orçamento ou preço', prazo: 'quando o cliente precisa resolver', proximo_passo: 'o próximo passo combinado (proposta, reunião, teste)' },
  reuniao_de_equipe: { objetivo: 'o objetivo da reunião', decisao: 'a decisão principal', responsaveis: 'quem é responsável por cada tarefa',
    prazos: 'os prazos das entregas', riscos: 'riscos ou bloqueios', proximo_passo: 'o próximo passo ou a próxima reunião' },
  atendimento: { problema: 'o problema do cliente', pedido: 'o número do pedido ou a identificação do cliente', solucao: 'a solução oferecida',
    prazo: 'o prazo da solução', retorno: 'como o cliente vai receber o retorno (e-mail, protocolo)', satisfacao: 'se o cliente ficou satisfeito' },
  generico: { objetivo: 'o objetivo da conversa', problema: 'o problema principal', decisao: 'alguma decisão', responsaveis: 'quem faz o quê',
    prazos: 'prazos', proximo_passo: 'o próximo passo' },
};
export const ROTULOS_COBERTURA = {
  dor: 'Dor', impacto: 'Impacto', decisor: 'Quem decide', orcamento: 'Orçamento', prazo: 'Prazo', proximo_passo: 'Próximo passo',
  objetivo: 'Objetivo', decisao: 'Decisão', responsaveis: 'Responsáveis', prazos: 'Prazos', riscos: 'Riscos',
  problema: 'Problema', pedido: 'Pedido', solucao: 'Solução', retorno: 'Retorno', satisfacao: 'Satisfação',
};
export const cobDoModo = (modo) => COBERTURA[modo] ? modo : 'generico';

const mapa = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.criterio]));
const limpa = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
export const rotulo = (q) => (q === 'v' ? 'Você' : q === 'o' ? 'Outra pessoa' : 'Alguém');

// Contexto do usuário (preset ou texto livre), sempre saneado no servidor
export function normalizarContexto(c, presets) {
  const base = (presets || []).find((p) => p.id === (c && c.id)) || (presets || []).find((p) => p.id === 'livre') || {};
  const texto = limpa(c && typeof c.texto === 'string' ? c.texto.replace(/\r/g, '') : base.texto, LIMITES.contexto).replace(/ ?\n ?/g, '\n');
  const papel_voce = limpa((c && c.papel_voce) || base.papel_voce || 'o usuário do copiloto', LIMITES.papel);
  const papel_outro = limpa((c && c.papel_outro) || base.papel_outro || 'a outra pessoa da conversa', LIMITES.papel);
  const termosTxt = limpa(c && typeof c.termos === 'string' ? c.termos.replace(/\r/g, '') : base.termos, 600).replace(/ ?\n ?/g, '\n');
  const termos = termosTxt.split(/[\n,;]+/).map((t) => t.trim()).filter((t) => t.length >= 2 && t.length <= 40).slice(0, 40);
  return { id: base.id || 'livre', texto, papel_voce, papel_outro, termos, modo: MODOS[c && c.modo] ? c.modo : (base.modo || null) };
}

// Fatos do contexto (uma linha = um fato; linhas longas viram frases): o Jev ESCOLHE o que responde à fala — é uma
// "busca por escolha", instantânea e sem modelo de texto, que aparece na tela antes de a IA de texto terminar de escrever.
export function fatosDoContexto(ctx) {
  const fatos = [];
  for (const linha of String(ctx.texto || '').split('\n')) {
    const l = linha.trim();
    if (l.length < 8) continue;
    const partes = l.length <= 220 ? [l] : l.split(/(?<=[.!?])\s+/).reduce((acc, f) => {
      if (acc.length && (acc[acc.length - 1] + ' ' + f).length <= 220) acc[acc.length - 1] += ' ' + f; else acc.push(f);
      return acc;
    }, []);
    for (const f of partes) if (f.trim().length >= 8 && fatos.length < 14) fatos.push({ id: 'f' + (fatos.length + 1), t: f.trim().slice(0, 240) });
  }
  return fatos;
}

export function normalizarHistorico(h) {
  if (!Array.isArray(h)) return [];
  return h.slice(-LIMITES.historico).map((x) => ({ q: ['v', 'o'].includes(x && x.q) ? x.q : '?', t: limpa(x && x.t, LIMITES.fala) })).filter((x) => x.t.length >= LIMITES.falaMin);
}

export function perguntasEscuta(ctx, { modoCob = 'generico', pendente = false, fatos = [], ajustes = {}, rascunho = false } = {}) {
  const q = {
    quem_fala: { type: 'choice', instructions: 'Quem disse a FALA ATUAL? Não há identificação de voz: decida pelo conteúdo, pelo papel de cada um e pela conversa até aqui.',
      criteria: { voce: `Você, ${ctx.papel_voce}: fala como ${ctx.papel_voce} (explica, oferece, confirma, conduz pelo lado de Você)`,
        outra_pessoa: `A outra pessoa, ${ctx.papel_outro}: fala como ${ctx.papel_outro} (conta a situação dela, pergunta, questiona, pede, reclama ou decide)` } },
    momento: { type: 'choice', instructions: 'O que acontece na FALA ATUAL?', criteria: mapa(MOMENTOS) },
    precisa_ajuda: { type: 'noul', instructions: 'Mostrar AGORA uma sugestão na tela do copiloto ajudaria Você, sem atrapalhar?',
      criteria: { true: 'Sim: a outra pessoa fez uma pergunta, uma objeção ou uma reclamação que Você precisa responder, ou apareceu um termo técnico que vale explicar',
        false: 'Não: conversa normal, é Você falando, ou uma sugestão agora só atrapalharia' } },
    ajuda: { type: 'choice', instructions: 'Que ajuda o copiloto deve mostrar para Você agora?', criteria: mapa(AJUDAS) },
    urgencia: { type: 'score', instructions: 'Com que urgência Você precisa reagir à fala atual?',
      criteria: ['Nenhuma: não há nada para responder', 'Baixa: pode tratar depois', 'Média: deve tratar ainda nesta conversa', 'Alta: precisa responder agora, a pessoa está esperando'] },
    tom: { type: 'choice', instructions: 'Qual tom Você deve usar ao responder agora?', criteria: mapa(TONS) },
    modo: { type: 'choice', instructions: 'Que tipo de conversa é esta?', criteria: mapa(MODOS) },
    sentimento: { type: 'score', instructions: 'Como a OUTRA PESSOA está se sentindo, considerando a conversa até a fala atual?', criteria: SENTIMENTO_CRIT },
    tem_termo: { type: 'noul', instructions: `A FALA ATUAL tem sigla, jargão ou termo técnico que vale explicar em 1 linha para Você (${ctx.papel_voce}) ou para quem assiste?`,
      criteria: { true: 'Sim, tem termo técnico ou sigla que vale explicar', false: 'Não, só palavras comuns' } },
    importante: { type: 'noul', instructions: 'A FALA ATUAL traz algo que deve entrar nas notas da reunião (tarefa, prazo, decisão, número, requisito ou pergunta importante)?',
      criteria: { true: 'Sim, vale anotar', false: 'Não, não precisa ir para as notas' } },
    dono_tarefa: { type: 'choice', instructions: 'Se a FALA ATUAL cria uma tarefa ou compromisso, de quem é?',
      criteria: { voce: 'Você vai fazer', outra_pessoa: 'A outra pessoa vai fazer', ambos: 'Os dois vão fazer', nenhum: 'Não há tarefa ou compromisso nesta fala' } },
  };
  q.conhecimento_geral = { type: 'noul', instructions: 'Para ajudar com a FALA ATUAL, é preciso conhecimento geral de fora (história, ciência, arte, literatura, geografia, fatos do mundo) que NÃO está no contexto de Você nem na conversa?',
    criteria: { true: 'Sim: é uma pergunta ou um assunto de conhecimento geral, que se responde com uma enciclopédia', false: 'Não: é sobre o produto, a empresa, as regras de Você, a própria conversa, ou conversa social' } };
  if (pendente) q.respondeu = { type: 'noul', instructions: 'A FALA ATUAL responde à PERGUNTA PENDENTE?', criteria: { true: 'Sim, responde (mesmo que em parte)', false: 'Não responde' } };
  if (fatos.length) q.fato = { type: 'choice', instructions: 'Qual fato do contexto de Você responde, ou ajuda Você a responder, o que foi dito na FALA ATUAL?',
    criteria: { ...Object.fromEntries(fatos.map((f) => [f.id, f.t])), nenhum: 'Nenhum destes fatos ajuda com a fala atual' } };
  if (rascunho) q.rascunho_serve = { type: 'noul', instructions: 'Já existe uma resposta preparada a partir de inicio_da_fala. Ela continua certa para a FALA ATUAL completa?',
    criteria: { true: 'Sim, a fala completa pede a mesma resposta', false: 'Não, o resto da fala mudou o que precisa ser respondido' } };
  Object.assign(q, ajustes);
  for (const [k, desc] of Object.entries(COBERTURA[modoCob] || COBERTURA.generico)) {
    q['cob_' + k] = { type: 'noul', instructions: `Na conversa até agora (incluindo a fala atual), já se falou de ${desc}?`, criteria: { true: 'Sim, já foi falado', false: 'Ainda não foi falado' } };
  }
  return q;
}

export function estadoEscuta(ctx, { historico, fala, parcial, pendente, inicioDaFala }) {
  const s = {
    cena: 'Um copiloto de IA acompanha uma conversa ao vivo e ajuda "Você", o usuário. A transcrição vem de um microfone e não diz quem falou.',
    voce_e: ctx.papel_voce,
    outra_pessoa_e: ctx.papel_outro,
    sobre_voce: ctx.texto ? ctx.texto.slice(0, 520) : 'não informado',
    conversa_ate_agora: historico.length ? historico.slice(-6).map((h) => `${rotulo(h.q)}: ${h.t}`) : 'nenhuma fala ainda',
    fala_atual: fala,
    transcricao: 'Automática, em português: termos técnicos em inglês podem vir escritos errado. Trechos como palavra⟨termo?⟩ são suspeitas de erro de reconhecimento.',
  };
  if (ctx.termos && ctx.termos.length) s.termos_que_voce_usa = ctx.termos.join(', ');
  if (inicioDaFala) s.inicio_da_fala = inicioDaFala;
  if (pendente) s.pergunta_pendente = pendente;
  if (parcial) s.observacao = 'A fala atual ainda está em andamento (transcrição parcial).';
  return s;
}

const melhor = (a) => {
  const e = Object.entries((a && a.probabilities) || {}).sort((x, y) => y[1] - x[1]);
  return { k: (a && a.choice) || (e[0] && e[0][0]), p: e[0] ? e[0][1] : 0, seg: e[1] ? { k: e[1][0], p: e[1][1] } : null };
};
const noul = (a) => (a && typeof a.noul === 'number' ? a.noul : null);

// Decide o que a interface faz com a fala. canal: 'misto' (Jev descobre quem falou) | 'o' | 'v'
export function interpretarEscuta(answers, { canal = 'misto', modoCob = 'generico', parcial = false, fatos = [] } = {}) {
  const a = answers || {};
  const quem = melhor(a.quem_fala), mom = melhor(a.momento), aj = melhor(a.ajuda), tom = melhor(a.tom), modo = melhor(a.modo), dono = melhor(a.dono_tarefa);
  const q = canal === 'o' || canal === 'v' ? canal : (quem.k === 'voce' ? 'v' : 'o');
  const precisa = noul(a.precisa_ajuda) ?? 0;
  const importante = noul(a.importante) ?? 0;
  const cob = {};
  for (const k of Object.keys(COBERTURA[modoCob] || COBERTURA.generico)) { const v = noul(a['cob_' + k]); if (v != null) cob[k] = v; }
  const termo = noul(a.tem_termo) ?? 0;
  // ajuda escrita pelo modelo de texto: o Jev pede (tipo) e os limiares confirmam. Pergunta/objeção de Você mesmo não gera ajuda.
  let tipo = AJUDAS_LLM.has(aj.k) ? aj.k : null;
  const pergunta = mom.k === 'pergunta_para_voce' && mom.p >= 0.5;
  if ((!tipo || (tipo === 'responder' && !pergunta)) && termo >= LIMIAR.termo && ['termo_tecnico', 'dado_importante', 'pergunta_para_voce'].includes(mom.k)) tipo = 'explicar_termo';
  if (tipo && tipo !== 'explicar_termo' && q === 'v') tipo = null;
  let acao = 'nada';
  if (tipo) {
    if (precisa >= LIMIAR.mostrar) acao = 'escrever';
    else if (tipo === 'responder' && pergunta && precisa >= LIMIAR.pergunta) acao = 'escrever';   // pergunta dirigida a Você: o gatilho clássico
    else if (tipo === 'explicar_termo' && termo >= LIMIAR.termo && q === 'o') acao = 'escrever';
    else if (precisa >= LIMIAR.sugerir) acao = 'oferecer';
  }
  // notas: tarefas, decisões e dados; perguntas e objeções só quando o Jev acha que valem registro
  const nota = parcial ? null
    : ['tarefa_ou_prazo', 'decisao', 'dado_importante'].includes(mom.k) && (mom.p >= LIMIAR.momento || importante >= LIMIAR.nota) ? mom.k
    : ['pergunta_para_voce', 'objecao'].includes(mom.k) && importante >= LIMIAR.nota ? mom.k : null;
  return {
    q, quem_p: quem.p, momento: mom.k, momento_p: mom.p, momento_2: mom.seg,
    precisa, ajuda: aj.k, ajuda_p: aj.p, tipo, acao, termo, pergunta,
    urgencia: a.urgencia ? +(+a.urgencia.score).toFixed(2) : null,
    tom: tom.k, tom_p: tom.p, modo: modo.k, modo_p: modo.p,
    sentimento: a.sentimento ? +(+a.sentimento.score).toFixed(2) : null,
    importante, nota, dono: dono.k, dono_p: dono.p,
    respondeu: noul(a.respondeu), cobertura: cob,
    fato: (() => { const f = melhor(a.fato); const x = fatos.find((y) => y.id === f.k); return x && f.p >= LIMIAR.fato ? { id: x.id, t: x.t, p: +f.p.toFixed(2) } : null; })(),
    rascunho_serve: noul(a.rascunho_serve),
    geral: noul(a.conhecimento_geral),
  };
}

// ---------------------------------------------------------------- tela (OCR + 1 chamada)
export const TIPOS_TELA = {
  email: { label: 'E-mail', icone: '📧', criterio: 'Um e-mail aberto (remetente, assunto, corpo)' },
  chat: { label: 'Conversa de chat', icone: '💬', criterio: 'Conversa de chat ou mensagens (WhatsApp, Slack, Teams, Instagram)' },
  codigo: { label: 'Código', icone: '🧑‍💻', criterio: 'Editor de código ou código-fonte, sem mensagem de erro em destaque' },
  erro: { label: 'Erro', icone: '🐞', criterio: 'Mensagem de erro, falha, exceção, traceback ou terminal com erro' },
  documento: { label: 'Documento', icone: '📄', criterio: 'Documento de texto, contrato, artigo ou PDF' },
  planilha: { label: 'Planilha', icone: '📊', criterio: 'Planilha ou tabela de dados' },
  apresentacao: { label: 'Slide', icone: '🖼️', criterio: 'Slide de apresentação ou painel com números e gráficos' },
  pagina_web: { label: 'Página web', icone: '🌐', criterio: 'Página de site, loja, notícia ou busca' },
  formulario: { label: 'Formulário', icone: '📝', criterio: 'Formulário ou tela de cadastro para preencher' },
  pouco_texto: { label: 'Pouco texto', icone: '🫥', criterio: 'Quase não há texto legível (imagem, vídeo, desktop vazio)' },
};
export const ACOES_TELA = {
  responder_mensagem: { label: 'Rascunhar resposta', icone: '✍️', criterio: 'Escrever a resposta para a mensagem ou e-mail que está na tela' },
  responder_perguntas: { label: 'Responder perguntas', icone: '❓', criterio: 'Responder a perguntas ou exercícios que aparecem na tela' },
  explicar_erro: { label: 'Explicar o erro', icone: '🐞', criterio: 'Explicar o erro da tela e como corrigir' },
  resumir: { label: 'Resumir', icone: '🧾', criterio: 'Resumir o conteúdo principal da tela (documento, slide, página)' },
  explicar: { label: 'Explicar', icone: '💡', criterio: 'Explicar em palavras simples o que está na tela' },
  traduzir: { label: 'Traduzir', icone: '🌍', criterio: 'Traduzir o texto da tela, que está em outro idioma' },
  extrair_dados: { label: 'Extrair dados', icone: '📌', criterio: 'Listar os dados importantes da tela (valores, datas, nomes)' },
  nenhuma: { label: 'Nada útil', icone: '🤫', criterio: 'Não há nada útil para fazer com esta tela agora' },
};
export const IDIOMAS = { portugues: 'Português', ingles: 'Inglês', espanhol: 'Espanhol', outro: 'Outro idioma' };

export function perguntasTela(ctx, linhas, { temConversa = false } = {}) {
  const q = {
    tipo_tela: { type: 'choice', instructions: 'O que aparece na TELA?', criteria: mapa(TIPOS_TELA) },
    acao: { type: 'choice', instructions: `Considerando que Você é ${ctx.papel_voce}, que ajuda mais útil o copiloto pode dar sobre esta tela agora?`, criteria: mapa(ACOES_TELA) },
    vale_sugerir: { type: 'noul', instructions: 'Vale oferecer essa ajuda para Você agora, sem ser pedido (a tela tem algo que pede ação: mensagem para responder, pergunta, erro, texto importante)?',
      criteria: { true: 'Sim, a tela pede uma ação ou tem algo importante', false: 'Não, a tela não pede nada agora' } },
    idioma: { type: 'choice', instructions: 'Em que idioma está o texto principal da tela?', criteria: IDIOMAS },
    tom: { type: 'choice', instructions: 'Se Você for responder algo desta tela, qual tom usar?', criteria: mapa(TONS) },
  };
  if (temConversa) q.ligada_a_conversa = { type: 'noul', instructions: 'O conteúdo da tela tem relação com a conversa ao vivo?', criteria: { true: 'Sim, tem relação', false: 'Não tem relação' } };
  // o Jev não extrai texto, mas ESCOLHE a linha: assim a resposta cumprimenta a pessoa certa (sem nome inventado)
  if (linhas.length >= 2) q.remetente = { type: 'choice', instructions: 'Qual linha da tela mostra o NOME de quem escreveu a mensagem principal (remetente de e-mail ou contato do chat)?',
    criteria: { ...Object.fromEntries(linhas.map((l) => [l.id, `A linha ${l.id}: "${l.t.slice(0, 90)}"`])), nenhuma: 'Nenhuma linha mostra o nome de quem escreveu' } };
  for (const l of linhas) {
    q[l.id] = { type: 'noul', instructions: `A linha ${l.id} da tela é conteúdo importante para ajudar Você (mensagem, pergunta, pedido, dado, erro ou trecho principal), e não menu, botão, cabeçalho, rodapé ou ruído de interface?`,
      criteria: { true: 'Sim, é conteúdo importante', false: 'Não, é interface ou ruído' } };
  }
  return q;
}

export function estadoTela(ctx, linhas, historico) {
  return {
    cena: 'O copiloto leu a tela do computador de Você por OCR (pode haver pequenos erros de leitura). Cada linha tem um id e a posição na tela: barras laterais e topo costumam ser menus, listas de outras conversas e navegação.',
    voce_e: ctx.papel_voce,
    sobre_voce: ctx.texto ? ctx.texto.slice(0, 400) : 'não informado',
    linhas: Object.fromEntries(linhas.map((l) => [l.id, l.onde ? { texto: l.t, posicao: l.onde } : l.t])),
    conversa_recente: historico.length ? historico.slice(-3).map((h) => `${rotulo(h.q)}: ${h.t}`) : 'nenhuma',
  };
}

export function interpretarTela(answers, linhas) {
  const a = answers || {};
  const tipo = melhor(a.tipo_tela), acao = melhor(a.acao), idioma = melhor(a.idioma), tom = melhor(a.tom);
  const rel = {};
  for (const l of linhas) rel[l.id] = noul(a[l.id]) ?? 0;
  // em chat e e-mail, a coluna da esquerda é lista de conversas ou menu: só entra se o Jev tiver muita certeza
  const lateral = ['chat', 'email'].includes(tipo.k);
  const escolhidas = linhas.filter((l) => rel[l.id] >= (lateral && /^esquerda/.test(l.onde || '') ? 0.9 : LIMIAR.linha)).map((l) => l.id);
  const vale = noul(a.vale_sugerir) ?? 0;
  const rem = melhor(a.remetente);
  const remetente = rem.k && rem.k !== 'nenhuma' && rem.p >= 0.35 ? (linhas.find((l) => l.id === rem.k) || {}).t || null : null;
  return {
    remetente, remetente_p: rem.p,
    tipo: tipo.k, tipo_p: tipo.p, acao: acao.k, acao_p: acao.p, acao_2: acao.seg, idioma: idioma.k, tom: tom.k,
    vale, ligada: noul(a.ligada_a_conversa), rel, escolhidas,
    oferecer: acao.k !== 'nenhuma' && tipo.k !== 'pouco_texto' && vale >= LIMIAR.telaSugerir,
  };
}

// ---------------------------------------------------------------- rota (pergunta livre ou atalho ⌘↵)
export const FONTES = {
  tela: { label: 'a tela', criterio: 'A resposta depende do que está na TELA agora' },
  conversa: { label: 'a conversa', criterio: 'A resposta depende da CONVERSA ao vivo' },
  contexto: { label: 'o seu contexto', criterio: 'A resposta depende só do contexto de Você (produto, empresa, regras, preços)' },
  geral: { label: 'conhecimento geral', criterio: 'Conhecimento geral: não depende da tela, da conversa nem do contexto' },
};
export const FORMATOS = {
  frase: { label: 'frase para falar', criterio: 'Uma frase curta para Você falar em voz alta' },
  topicos: { label: 'tópicos', criterio: 'Tópicos curtos' },
  texto: { label: 'texto para enviar', criterio: 'Um texto pronto para enviar (mensagem ou e-mail)' },
  passos: { label: 'passo a passo', criterio: 'Passo a passo' },
};
export const TAMANHOS = ['1 frase', 'até 3 frases', 'até 5 tópicos', 'texto de até 120 palavras'];

export function perguntasRota({ atalho = false, temTela = false } = {}) {
  const fontes = temTela ? FONTES : Object.fromEntries(Object.entries(FONTES).filter(([k]) => k !== 'tela'));
  const q = {
    fonte: { type: 'choice', instructions: atalho ? 'Você apertou o atalho de ajuda sem digitar nada. Com o que Você mais provavelmente precisa de ajuda agora?' : 'De onde vem a resposta para a PERGUNTA de Você?', criteria: mapa(fontes) },
    formato: { type: 'choice', instructions: 'Em que formato a resposta ajuda mais?', criteria: mapa(FORMATOS) },
    tamanho: { type: 'score', instructions: 'Qual o tamanho ideal da resposta?', criteria: TAMANHOS.map((t, i) => ['Mínimo', 'Curto', 'Médio', 'Longo'][i] + ': ' + t) },
    idioma: { type: 'choice', instructions: 'Em que idioma responder?', criteria: { portugues: 'Português', ingles: 'Inglês (a pergunta pede ou está em inglês)', espanhol: 'Espanhol (a pergunta pede ou está em espanhol)' } },
    tom: { type: 'choice', instructions: 'Qual tom usar?', criteria: mapa(TONS) },
  };
  return q;
}

export function estadoRota(ctx, { pergunta, atalho, tela, historico }) {
  return {
    cena: atalho ? 'Você apertou ⌘↵ (ajuda agora) no copiloto, sem digitar pergunta.' : 'Você digitou uma pergunta para o copiloto.',
    pergunta: atalho ? '(nenhuma: atalho de ajuda)' : pergunta,
    voce_e: ctx.papel_voce,
    sobre_voce: ctx.texto ? ctx.texto.slice(0, 400) : 'não informado',
    tela: tela ? { tipo: tela.tipo, ha_quanto_tempo_s: tela.idade_s, trecho: tela.trecho } : 'nenhuma tela compartilhada',
    conversa_recente: historico.length ? historico.slice(-4).map((h) => `${rotulo(h.q)}: ${h.t}`) : 'nenhuma',
  };
}

export function interpretarRota(answers, { temTela }) {
  const a = answers || {};
  const fonte = melhor(a.fonte), formato = melhor(a.formato), idioma = melhor(a.idioma), tom = melhor(a.tom);
  const tam = a.tamanho ? Math.max(0, Math.min(3, Math.round(+a.tamanho.score))) : 1;
  return { fonte: fonte.k === 'tela' && !temTela ? 'conversa' : fonte.k, fonte_p: fonte.p, formato: formato.k, tamanho: tam, idioma: idioma.k, tom: tom.k };
}

// ---------------------------------------------------------------- prompts do modelo de texto
// Estrutura fixa para o cache do llama.cpp: [sistema + contexto] [conversa, só acrescenta] [PEDIDO muda]
export function sistema(ctx) {
  return [
    'Você é o Mini Cluely, um copiloto discreto que acompanha a tela e a conversa do usuário ("Você") e sopra ajuda curta, pronta para usar.',
    'Regras: escreva em português do Brasil, a menos que o PEDIDO diga outro idioma. Vá direto ao ponto: sem introdução, sem repetir a pergunta, sem explicar o que vai fazer.',
    'Use só fatos do CONTEXTO DE VOCÊ, da conversa ou da tela. Nunca invente preços, prazos, números, nomes ou promessas; se faltar um dado, escreva "Confirme: ..." com o que falta.',
    'Não faça contas nem estimativas: cite os números exatamente como aparecem. Não prometa nada que Você não tenha dito que faria.',
    'Formato: texto simples. Em listas, uma linha por item começando com "• ". Sem negrito, sem títulos, sem markdown.',
    'A conversa vem de transcrição automática: entenda termos técnicos em inglês pelo contexto e escreva-os corretamente (ex.: prompt, tokens, fine-tuning).',
    ...(ctx.termos && ctx.termos.length ? [`Termos que Você usa: ${ctx.termos.join(', ')}.`] : []),
    '',
    `CONTEXTO DE VOCÊ (${ctx.papel_voce}; a outra pessoa é ${ctx.papel_outro}):`,
    ctx.texto || '(nenhum contexto informado)',
  ].join('\n');
}

// Janela da conversa que vai ao modelo: começa em múltiplos de 10 falas, para o prefixo mudar raramente (cache).
export function janela(historico) {
  const n = historico.length;
  const ini = n > 20 ? Math.floor((n - 11) / 10) * 10 : 0;
  return historico.slice(ini);
}
export const prefixoConversa = (historico) => 'CONVERSA AO VIVO (a última fala é a mais recente):\n' + (janela(historico).map((h) => `${rotulo(h.q)}: ${h.t}`).join('\n') || '(ainda sem falas)');

export const LIMITE_TOKENS = { responder: 110, contornar: 110, explicar_termo: 130, seguir: 100, perguntas: 120, resumo: 300, email: 210, tela: 230, livre: [70, 120, 180, 240] };

export function pedidoConversa(tipo, d) {
  const tom = TONS[d.tom] ? TONS[d.tom].label : 'objetivo';
  // na resposta automática a fala que disparou é a última linha da conversa (já no cache); no clique posterior, citamos
  const alvo = d.fala ? `a esta fala da outra pessoa: "${d.fala}"` : 'à última fala da outra pessoa';
  const fato = d.fato ? ` Use este fato do contexto (escolhido pelo Jev): "${d.fato}".` : '';
  const falando = d.parcial ? ' A pessoa ainda está falando: responda ao que já foi dito.' : '';
  switch (tipo) {
    case 'responder': return `PEDIDO: Sugira a resposta de Você ${alvo}: no máximo 2 frases curtas, tom ${tom}, para falar em voz alta, sem marcadores.${fato}${falando}`;
    case 'contornar': return `PEDIDO: Sugira como Você acolhe e contorna a objeção ${alvo}: reconheça a preocupação e ofereça 1 condição ou benefício do contexto, sem fazer contas. No máximo 2 frases curtas, tom ${tom}, para falar em voz alta, sem marcadores.${fato}${falando}`;
    case 'explicar_termo': return `PEDIDO: Explique as siglas ou termos técnicos ${alvo}: uma linha por termo, "• TERMO: explicação curta", com o número do contexto se houver.`;
    case 'seguir': return `PEDIDO: Sugira a próxima fala de Você para avançar a conversa: no máximo 2 frases curtas, tom ${tom}, sem marcadores.`;
    case 'perguntas': return `PEDIDO: Sugira 3 perguntas curtas que Você pode fazer agora para avançar a conversa${d.lacunas && d.lacunas.length ? `, priorizando o que ainda não foi falado: ${d.lacunas.join(', ')}` : ''}. Uma por linha, começando com "• ".`;
    case 'resumo': return `PEDIDO: Resuma a conversa até agora em até 4 tópicos curtos ("• "). Depois escreva "Próximos passos:" e liste as tarefas combinadas com o responsável ("• Você: ..." ou "• ${d.outro || 'Outra pessoa'}: ...").${d.notas && d.notas.length ? ` Notas marcadas pelo Jev: ${d.notas.join(' | ')}` : ''}`;
    case 'email': return `PEDIDO: Escreva um e-mail curto de follow-up de Você para ${d.outro || 'a outra pessoa'}: agradeça, liste os pontos combinados e o próximo passo. Máximo de 110 palavras. Primeira linha: "Assunto: ...".`;
    default: return 'PEDIDO: Ajude Você com a conversa, em no máximo 2 frases.';
  }
}

export const prefixoTela = (linhas, remetente) => (remetente ? `QUEM ESCREVEU (linha escolhida pelo Jev): ${remetente}\n` : '') + 'TELA DE VOCÊ (texto lido por OCR; só as linhas que o Jev marcou como importantes, na ordem):\n' + linhas.join('\n');

export function pedidoTela(acao, d) {
  const tom = TONS[d.tom] ? TONS[d.tom].label : 'objetivo';
  const conversa = d.conversa && d.conversa.length ? `\nCONVERSA RECENTE:\n${d.conversa.join('\n')}\n` : '';
  const txt = {
    responder_mensagem: `PEDIDO: Escreva a mensagem que Você vai enviar em resposta: comece com "Olá, " e o primeiro nome de QUEM ESCREVEU (se não houver nome, só "Olá!"), responda cada pergunta em 1 frase com os fatos do contexto e feche com 1 frase curta. Tom ${tom}. Não comente o que está fazendo. Máximo de 110 palavras.`,
    responder_perguntas: 'PEDIDO: Responda às perguntas da tela, uma por linha ("• "), com os fatos do contexto.',
    explicar_erro: 'PEDIDO: Explique o erro em 3 tópicos curtos ("• Erro: …", "• Causa: …", "• Como corrigir: …"). Não invente números: para um valor que não aparece na tela, escreva VALOR.',
    resumir: 'PEDIDO: Resuma a tela em até 4 tópicos curtos ("• ") e termine com 1 pergunta inteligente que Você pode fazer sobre isso.',
    explicar: 'PEDIDO: Explique em até 3 frases simples o que está na tela.',
    traduzir: 'PEDIDO: Traduza para o português o texto principal da tela.',
    extrair_dados: 'PEDIDO: Liste os dados importantes da tela (valores, datas, nomes), um por linha ("• ").',
    nenhuma: 'PEDIDO: Diga em 1 frase o que há de útil nesta tela.',
  }[acao] || 'PEDIDO: Explique em até 3 frases simples o que está na tela.';
  return conversa + txt;
}

export function pedidoLivre(pergunta, r) {
  const fmt = FORMATOS[r.formato] ? FORMATOS[r.formato].label : 'tópicos';
  const tam = TAMANHOS[r.tamanho] || TAMANHOS[1];
  const lingua = r.idioma === 'ingles' ? ' Responda em inglês.' : r.idioma === 'espanhol' ? ' Responda em espanhol.' : '';
  // sem esta regra, com o dado ausente o 4B inventava ("prazo de 30 dias"); com ela, 3/3 pedem para confirmar (medido)
  const regra = r.fonte === 'geral' ? '' : ' Use só o que está no CONTEXTO DE VOCÊ, na conversa ou na tela. Se a resposta não estiver lá, não invente: diga que não está e escreva "Confirme: …" com o dado que falta.';
  return `PEDIDO: Responda à pergunta de Você: "${pergunta}". Formato: ${fmt}, ${tam}.${lingua}${regra}`;
}

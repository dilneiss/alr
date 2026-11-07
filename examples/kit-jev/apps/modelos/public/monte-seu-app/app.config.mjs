// O Hub que Ouve Você: a pessoa conta o negócio e o problema dela em voz alta, e os apps do hub se reorganizam enquanto ela
// fala. A cada pausa vai UMA chamada ao Jev: o perfil (setor, canal, dor) + um "este app resolve?" para cada app.
// Para adaptar: troque o catalogo.mjs pela lista dos seus produtos ou serviços ({ id, titulo, resumo, emoji, link?, imagem? })
// e os SETORES, CANAIS e DORES pelo seu público. Vira "descreva o que você precisa e o certo sobe". Até 140 itens por
// chamada; com mais, a página manda `ids` na jogada (por exemplo, só os da categoria certa).

// o catálogo vem com o mesmo "?v=" deste arquivo: quando o servidor recarrega o app.config.mjs, recarrega o catálogo junto
// (depois de regerar o catalogo.mjs, basta salvar este arquivo de novo, sem reiniciar o servidor)
const CATALOGO = (await import(new URL('./catalogo.mjs' + new URL(import.meta.url).search, import.meta.url).href)).default;

// setores: [id, rótulo do chip, ícone, critério para o Jev, como o negócio chama o cliente]
const SETORES = [
  ['saude', 'Clínica', '🩺', 'saúde: clínica, consultório, dentista, médico, psicólogo, fisioterapia, laboratório', 'paciente'],
  ['beleza', 'Salão e estética', '💇', 'beleza: salão de cabeleireiro, barbearia, manicure, clínica de estética, spa', 'cliente'],
  ['moda', 'Loja de roupa', '👗', 'moda: loja de roupa, calçados, acessórios, bijuteria, brechó (física ou online)', 'cliente'],
  ['varejo', 'Loja e e-commerce', '🛍️', 'varejo de outros produtos: e-commerce, eletrônicos, presentes, casa e decoração, cosméticos, mercado, farmácia', 'cliente'],
  ['comida', 'Restaurante', '🍕', 'comida e bebida: restaurante, pizzaria, lanchonete, hamburgueria, bar, padaria, doceria, delivery de comida', 'cliente'],
  ['contabil', 'Contabilidade', '🧾', 'escritório de contabilidade, contador, departamento fiscal que atende empresas', 'cliente'],
  ['juridico', 'Advocacia', '⚖️', 'escritório de advocacia, advogado, departamento jurídico, cartório', 'cliente'],
  ['imoveis', 'Imobiliária', '🏠', 'imobiliária, corretor de imóveis, aluguel, administradora de condomínio, construtora', 'cliente'],
  ['educacao', 'Escola ou curso', '🎓', 'educação: escola, curso, faculdade, cursinho, escola de idiomas, professor particular', 'aluno'],
  ['fitness', 'Academia', '🏋️', 'academia, personal trainer, estúdio de pilates, crossfit, escola de esportes', 'aluno'],
  ['servicos', 'Oficina e serviços', '🔧', 'serviços técnicos: oficina mecânica, eletricista, encanador, reforma, assistência técnica, limpeza', 'cliente'],
  ['transporte', 'Transporte', '🚚', 'transporte: mudanças, fretes, transportadora, logística, motoboy, entregas', 'cliente'],
  ['marketing', 'Agência de marketing', '📣', 'agência de marketing, publicidade, social media, gestor de tráfego pago', 'cliente'],
  ['criador', 'Criador de conteúdo', '🎬', 'criador de conteúdo: youtuber, influenciador, podcaster, streamer, quem vive de vídeos e posts', 'seguidor'],
  ['software', 'Software e IA', '💻', 'tecnologia: programador, desenvolvedor, empresa de software, startup, quem constrói com agentes de IA', 'usuário'],
  ['consultoria', 'Consultoria e B2B', '💼', 'consultoria, serviços para empresas, vendas B2B, RH e recrutamento, freelancer que atende empresas', 'cliente'],
  ['pet', 'Pet shop', '🐾', 'pet shop, banho e tosa, clínica veterinária, adestrador', 'cliente'],
  ['turismo', 'Hotel e turismo', '🏨', 'hotel, pousada, aluguel por temporada, agência de viagens, passeios', 'hóspede'],
  ['financas', 'Finanças e seguros', '🏦', 'finanças: banco, fintech, corretora de seguros, crédito, investimentos', 'cliente'],
  ['industria', 'Indústria e atacado', '🏭', 'indústria, fábrica, distribuidora, atacado, fornecedor, representante comercial', 'cliente'],
  ['eventos', 'Eventos e fotografia', '🎉', 'eventos, festas, buffet, casamento, fotografia, música ao vivo', 'cliente'],
  ['pessoal', 'Uso pessoal', '🏡', 'uso pessoal, sem empresa: a pessoa fala da própria vida, da casa, da família (mãe, filhos), dos estudos ou do emprego', 'você'],
  ['outro', 'Outro negócio', '🏷️', 'um negócio que não está em nenhuma opção acima', 'cliente'],
  ['nao_disse', '', '❔', 'ainda não dá para saber: a pessoa não falou de negócio, de trabalho nem da vida dela', 'cliente'],
].map(([id, rotulo, icone, desc, cliente]) => ({ id, rotulo, icone, desc, cliente }));

// canais: por onde o cliente chega ou onde o problema acontece
const CANAIS = [
  ['whatsapp', 'WhatsApp', '💬', 'WhatsApp: mensagens, áudios, grupos'],
  ['telefone', 'Telefone', '📞', 'telefone: ligação, central de atendimento, URA, viva-voz'],
  ['email', 'E-mail', '📧', 'e-mail: caixa de entrada, newsletter'],
  ['presencial', 'Balcão', '🏪', 'presencial: balcão, loja física, recepção, cara a cara'],
  ['site', 'Site ou app', '🌐', 'site, loja virtual, aplicativo, chat do site, sistema próprio'],
  ['redes', 'Redes sociais', '📱', 'redes sociais: Instagram, TikTok, YouTube, Facebook, LinkedIn (posts, directs, comentários, lives)'],
  ['reuniao', 'Reuniões', '🎥', 'reuniões, chamadas de vídeo, aulas ao vivo, palestras'],
  ['outro', 'Outro canal', '🔗', 'outro lugar: planilha, terminal de código, marketplace, papel'],
  ['nao_disse', '', '❔', 'a pessoa ainda não disse por onde o cliente chega nem onde o problema acontece'],
].map(([id, rotulo, icone, desc]) => ({ id, rotulo, icone, desc }));

// dores: o problema que a pessoa quer resolver ({cliente} vira "paciente", "aluno"… conforme o setor)
const DORES = [
  ['atendimento', 'atendimento', '🙋', 'atendimento: responder dúvidas, anotar pedidos sem errar, marcar horário, atender bem e sem demora (o problema é responder e atender)'],
  ['some', '{cliente} que some', '👻', 'cliente que some: marca e falta, cancela, desmarca, desiste, para de responder, não volta a comprar'],
  ['cobranca', '{cliente} que não paga', '💸', 'cobrança: cliente que atrasa ou não paga, boleto, mensalidade, inadimplência'],
  ['excesso', 'mensagem demais', '📥', 'excesso de mensagens: o problema é o VOLUME (caixa de entrada lotada, e-mails, notificações ou grupos demais)'],
  ['golpe', 'golpe e fraude', '🚨', 'golpe e fraude: golpista, pix falso, avaliação falsa, anúncio proibido, ataque hacker, vazamento de dados'],
  ['preco', 'preço e orçamento', '🏷️', 'preço e orçamento: montar orçamento, calcular preço, comparar preço com o concorrente'],
  ['dados', 'dados bagunçados', '🗂️', 'organização de dados: planilha, extrato, notas, cadastros repetidos, arquivos, documentos, contratos'],
  ['conteudo', 'conteúdo', '✂️', 'conteúdo: produzir posts, vídeos, cortes, roteiros, responder comentários, crescer nas redes'],
  ['vendas', 'vender mais', '📈', 'vendas: conseguir e qualificar leads, anúncios, prospecção, ligação de vendas, fechar mais vendas'],
  ['agentes', 'agentes de IA', '🤖', 'agentes de IA: construir com LLM, Claude Code, prompts, custo de tokens, agente que faz besteira'],
  ['ensino', 'ensinar e corrigir', '📝', 'ensino: corrigir provas e redações, ensinar alunos, treinar a equipe, aprender um idioma'],
  ['agenda', 'reuniões e agenda', '🗓️', 'agenda: reuniões demais, convites, compromissos e tarefas esquecidos'],
  ['outro', 'outro problema', '🧩', 'um problema que não está em nenhuma opção acima'],
  ['nao_disse', '', '❔', 'a pessoa ainda não contou qual é o problema'],
].map(([id, rotulo, icone, desc]) => ({ id, rotulo, icone, desc }));

const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };
const curto = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const chaveDe = (id) => 'a_' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 38);
const alvoDe = (a) => `App: «${a.titulo}» — ${curto(a.resumo, 170)}`;
const opcoes = (lista) => lista.map((o) => ({ id: o.id, rotulo: o.rotulo || 'ainda não disse', icone: o.icone, desc: o.desc }));
// um teste: o perfil esperado + { id do app: true (resolve) | false (não resolve) }
const t = (titulo, texto, perfil, apps) => ({ titulo, jogada: 'ouvir', dados: { texto }, esperado: { ...perfil, ...Object.fromEntries(Object.entries(apps).map(([id, v]) => [chaveDe(id), v])) } });
const CORRIGIU = "Se a pessoa se corrigiu ('não, pera…', 'na verdade…'), vale o que ela disse por último.";
// "não, pera… na verdade…": o código acha a última correção e manda à parte o que veio depois dela
const CORRECAO = /\b(n[aã]o,?\s+pera|pera[ií],?\s+n[aã]o|na verdade|quer dizer|melhor dizendo|me enganei|corrigindo)\b/gi;
function depoisDaCorrecao(t) {
  let ultima = null;
  for (const m of t.matchAll(CORRECAO)) ultima = m;
  return ultima ? t.slice(ultima.index).trim() : '';
}

export default {
  id: 'monte-seu-app',
  titulo: 'O Hub que Ouve Você',
  emoji: '👂',
  categoria: 'ao-vivo',
  ordem: 0.95,
  resumo: 'Conte o seu negócio e o seu problema em voz alta: os apps do hub se reorganizam enquanto você fala e o certo sobe para o topo.',
  descricao: 'A cada pausa da sua fala, UMA chamada ao Jev monta o seu perfil (setor, canal e dor) e julga cada app do hub, um por um: "este resolve o que você contou?". São ~100 decisões em menos de um segundo, e a parede inteira troca de lugar enquanto você fala. Para adaptar, troque o catálogo pelos seus produtos ou serviços: "descreva o que precisa e o certo sobe".',
  marcas: ['imediato', 'volume', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#B23A22', acento2: '#17140F', modo: 'claro' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone e conte o seu negócio e o seu problema ("tenho uma clínica e o paciente marca e falta"). Depois mude de ideia no meio: "na verdade não é clínica, é uma loja de roupa".',
  },
  catalogo: CATALOGO,
  setores: SETORES, canais: CANAIS, dores: DORES,
  chaveDe,   // id do app → chave da pergunta (a_recepcionista_whatsapp)
  // pódio: ≥ 35% entra (abaixo de 50% fica "talvez"), e só depois que a pessoa disse o problema ou um app passou de 60%
  limiar: { podio: 0.5, combina: 0.35, forte: 0.6, minimoPalavras: 4 },
  contexto: {
    app: 'hub de apps do Jev: a pessoa conta em voz alta o negócio dela e o problema que quer resolver, e o hub mostra quais apps resolvem',
    // a regra do "resolve?" fica aqui, uma vez só, e não repetida nas ~100 perguntas (medido: mesmo acerto, 40% mais barato)
    regras_do_sim_e_nao: `SIM quando o app ataca a dor que a pessoa contou, no dia a dia dela. NÃO quando o app é de outro assunto, mesmo que sirva ao setor dela; NÃO para peças técnicas de quem programa com IA (cache, roteador de modelos ou de ferramentas, compactação de contexto, memória de assistente, banco de provas, playground), a não ser que ela programe com IA; NÃO para jogos e demonstrações; NÃO se ela ainda não contou nenhum problema. Se ela se corrigiu (veja depois_da_correcao), vale o que disse por último: o que contou antes e não combina com a correção deixa de valer.`,
  },
  decisoes: [
    {
      id: 'setor', tipo: 'choice', titulo: 'Setor',
      pergunta: `Qual é o negócio ou a atividade da pessoa que está falando? ${CORRIGIU} Se ela ainda não disse, escolha nao_disse.`,
      opcoes: opcoes(SETORES),
    },
    {
      id: 'canal', tipo: 'choice', titulo: 'Canal',
      pergunta: `Por onde os clientes chegam até a pessoa, ou onde acontece o problema que ela contou? ${CORRIGIU} Se ela ainda não disse, escolha nao_disse.`,
      opcoes: opcoes(CANAIS),
    },
    {
      id: 'dor', tipo: 'choice', titulo: 'Dor',
      pergunta: `Qual é o principal problema que a pessoa quer resolver? ${CORRIGIU} Se ela ainda não contou um problema, escolha nao_disse.`,
      opcoes: opcoes(DORES),
    },
    {
      id: 'resolve', tipo: 'noul', titulo: 'Este app resolve?', rotulo: 'resolve', limiar: 0.5,
      pergunta: 'Este app resolve, de forma direta, o problema que a pessoa contou (ex.: paciente que falta → app que marca e confirma pelo WhatsApp; afogado em e-mail → app que organiza a caixa de entrada)? Siga as regras_do_sim_e_nao do estado.',
    },
  ],
  jogadas: {
    // a cada pausa da fala: o perfil (3 escolhas) + um "resolve?" por app. A página pode mandar `ids` para julgar só alguns.
    ouvir: {
      estado: (d) => {
        const fala = corta(d.texto, 1400), depois = depoisDaCorrecao(fala);
        return { fala_da_pessoa: fala, ...(depois ? { depois_da_correcao: depois } : {}) };
      },
      perguntas: (d) => {
        const pedidos = Array.isArray(d.ids) && d.ids.length ? new Set(d.ids.map(String)) : null;
        const apps = CATALOGO.filter((a) => !pedidos || pedidos.has(a.id)).slice(0, 140);
        return [
          { chave: 'setor', decisao: 'setor' },
          { chave: 'canal', decisao: 'canal' },
          { chave: 'dor', decisao: 'dor' },
          ...apps.map((a) => ({ chave: chaveDe(a.id), decisao: 'resolve', alvo: alvoDe(a) })),
        ];
      },
    },
  },
  // negócios comuns, falados do jeito que se fala: o perfil esperado e alguns apps que TÊM de dar SIM ou NÃO
  testes: [
    t('clínica que perde paciente', 'Eu tenho uma clínica odontológica. Os pacientes marcam pelo WhatsApp e depois simplesmente não aparecem, nem avisam.', { setor: 'saude', canal: 'whatsapp', dor: 'some' }, { 'recepcionista-whatsapp': true, 'trava-comandos': false, 'mestre-rpg': false }),
    t('loja de roupa no Instagram', 'Eu tenho uma loja de roupa feminina e vendo tudo pelo Instagram. Chega muita mensagem no direct perguntando preço e tamanho e eu não dou conta de responder.', { setor: 'moda', canal: 'redes', dor: ['atendimento', 'excesso'] }, { 'trava-comandos': false, 'contrato-lupa': false, 'redacao-enem': false }),
    t('contabilidade afogada em e-mail', 'Tenho um escritório de contabilidade. Recebo centenas de e-mails de cliente por dia, gente mandando nota fiscal, extrato, pedindo guia, e eu tô afogado.', { setor: 'contabil', canal: 'email', dor: 'excesso' }, { 'inbox-organiza': true, 'garcom-whatsapp': false, 'mestre-rpg': false }),
    t('criador de conteúdo', 'Sou criador de conteúdo no YouTube. Gravo vídeos longos de uma hora e não tenho tempo de tirar os cortes pros Shorts nem de ler os comentários.', { setor: 'criador', canal: 'redes', dor: 'conteudo' }, { 'cacador-cortes': true, comentarios: true, 'regua-cobranca': false }),
    t('dev usando agentes de IA', 'Eu sou programador e uso o Claude Code o dia inteiro. Morro de medo do agente rodar um comando que apaga tudo, e a conta de tokens tá vindo alta.', { setor: 'software', dor: 'agentes' }, { 'trava-comandos': true, 'cinto-agentes': true, 'garcom-whatsapp': false, 'recepcionista-whatsapp': false }),
    t('pizzaria no WhatsApp', 'Tenho uma pizzaria e os pedidos chegam todos pelo WhatsApp. É uma bagunça, o pessoal manda áudio, muda o sabor, e a gente erra o pedido.', { setor: 'comida', canal: 'whatsapp', dor: 'atendimento' }, { 'garcom-whatsapp': true, 'contrato-lupa': false }),
    t('mudanças: orçamento o dia todo', 'Eu tenho uma empresa de mudanças e passo o dia inteiro respondendo pedido de orçamento, cada cliente descreve a mudança de um jeito.', { setor: 'transporte', dor: 'preco' }, { 'orcamento-na-hora': true, 'redacao-enem': false }),
    t('escola com mensalidade atrasada', 'Tenho uma escola de inglês e todo mês tem aluno atrasando a mensalidade. Eu mando lembrete e cada um responde de um jeito.', { setor: 'educacao', dor: 'cobranca' }, { 'regua-cobranca': true, 'cacador-cortes': false }),
    t('loja virtual levando golpe', 'Eu tenho uma loja virtual de eletrônicos e tô levando golpe: cliente mandando comprovante de pix falso e concorrente postando avaliação falsa.', { setor: 'varejo', canal: 'site', dor: 'golpe' }, { 'avaliacoes-falsas': true, 'garcom-whatsapp': false }),
    t('advogado lendo contrato', 'Sou advogado e passo horas lendo contrato de cliente pra achar cláusula perigosa.', { setor: 'juridico', dor: ['dados', 'outro'] }, { 'contrato-lupa': true, 'garcom-whatsapp': false }),
    t('ainda não disse nada', 'Oi, tudo bem? Deixa eu pensar aqui no que eu vou falar.', { setor: 'nao_disse', canal: 'nao_disse', dor: 'nao_disse' }, { 'recepcionista-whatsapp': false, 'trava-comandos': false, 'cacador-cortes': false, estudio: false }),
    t('a virada: não é clínica, é loja', 'Eu tenho uma clínica de estética. Não, pera, na verdade não é clínica, é uma loja de roupa. E a cliente pergunta pelo Instagram e depois some.', { setor: 'moda', canal: 'redes', dor: 'some' }, { 'trava-comandos': false }),
    t('imobiliária com lead frio', 'Tenho uma imobiliária. Chegam muitos leads dos anúncios e a maioria não tem interesse de verdade, meus corretores perdem tempo ligando.', { setor: 'imoveis', dor: 'vendas' }, { form: true, 'garcom-whatsapp': false }),
    t('suporte de software lotado', 'Tenho uma empresa de software e o suporte recebe ticket demais, o cliente fica irritado esperando resposta.', { setor: 'software', dor: ['atendimento', 'excesso'] }, { suporte: true, 'mestre-rpg': false }),
    t('professor corrigindo redação', 'Sou professor de redação e corrijo duzentas redações por semana, não aguento mais.', { setor: 'educacao', dor: 'ensino' }, { 'corretor-respostas': true, 'trava-comandos': false }),
    t('reunião sem dono', 'Trabalho numa consultoria e a gente faz reunião o dia todo. Ninguém anota as tarefas e depois ninguém lembra quem ficou de fazer o quê.', { setor: 'consultoria', canal: 'reuniao', dor: 'agenda' }, { 'facilitador-reuniao': true, 'garcom-whatsapp': false }),
    t('golpe por telefone na família', 'Minha mãe sempre recebe ligação de golpe, gente dizendo que é do banco e pedindo o código.', { setor: 'pessoal', canal: 'telefone', dor: 'golpe' }, { 'golpe-ligacao': true, 'recepcionista-whatsapp': false }),
    t('tráfego pago queimando verba', 'Tenho uma agência de tráfego pago e queimo muita verba no Google Ads com termo de busca que não converte.', { setor: 'marketing', dor: 'vendas' }, { 'faxina-termos': true, 'garcom-whatsapp': false }),
    t('catálogo do fornecedor bagunçado', 'Tenho um e-commerce de casa e decoração e o fornecedor manda a planilha de produtos toda bagunçada, sem categoria.', { setor: 'varejo', dor: 'dados' }, { 'classificador-catalogo': true, 'golpe-ligacao': false }),
    t('salão que vive remarcando', 'Tenho um salão de beleza e as clientes marcam horário pelo WhatsApp, mas vivem remarcando e eu perco a tarde nisso.', { setor: 'beleza', canal: 'whatsapp', dor: ['atendimento', 'some'] }, { 'recepcionista-whatsapp': true, 'pula-publi': false }),
  ],
};

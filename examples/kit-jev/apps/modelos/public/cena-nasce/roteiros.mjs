/**
 * Roteiros prontos: histórias curtas que o palco consegue assistir sozinho (voz) ou ler (microfone).
 *
 * Cada roteiro é uma fala contínua quebrada em frases. Regras que o teste cobra:
 * - a PRIMEIRA frase fixa cenário e elenco inicial (quem está em cena);
 * - as seguintes só dizem quem entra, sai ou age — nada de "o mesmo menino fez outra coisa";
 * - no mínimo 6 palavras por frase (senão o reconhecimento não tem o que casar);
 * - 3 roteiros por modo, para a tela inicial sempre oferecer escolha.
 *
 * `historiaId` é opcional: quando presente precisa existir em HISTORIAS_JEV (contos). Os roteiros de
 * marca e de modo livre são originais, então não apontam para conto nenhum.
 */
export const MODOS = ['livre', 'minecraft', 'hubiss', 'celit', 'datasnap', 'qualhora'];

export const ROTEIROS = {
  // ---------- Modo Livre ----------
  livre_praia_neve: {
    modo: 'livre',
    historiaId: null,
    titulo: '🏖️ A praia que nevou',
    frases: [
      'Era um dia de sol na praia, e uma menina brincava na areia com o seu cachorro.',
      'De repente o céu escureceu e começou a nevar em cima do castelo de areia.',
      'A menina vestiu um casaco e o cachorro correu atrás dos flocos gelados.',
      'Um pinguim apareceu na praia e ficou surpreso com aquela neve toda.',
      'Os três fizeram um boneco de neve ao lado da palmeira e riram muito.',
      'Quando o sol voltou, o boneco de neve derreteu devagar e a praia esquentou.',
      'A menina guardou a neve num balde e o cachorro latiu para o mar.',
    ],
  },
  livre_castelo_dragao: {
    modo: 'livre',
    historiaId: null,
    titulo: '🐉 O dragão comilão',
    frases: [
      'Era uma vez um castelo no alto da montanha, e um dragão dormia no seu telhado.',
      'Quando acordou, o dragão desceu voando e encontrou um bolo de chocolate no pátio.',
      'O dragão comeu o bolo inteiro e depois pediu mais um pedaço para a fada.',
      'A fada riu e fez aparecer uma mesa cheia de doces para o dragão comilão.',
      'Um cavaleiro chegou de armadura e ficou parado olhando aquela cena engraçada.',
      'O dragão ofereceu um pedaço de bolo ao cavaleiro e os dois viraram amigos.',
    ],
  },
  livre_fundo_mar: {
    modo: 'livre',
    historiaId: null,
    titulo: '🧜‍♀️ No fundo do mar',
    frases: [
      'No fundo do mar, uma sereia nadava com um pinguim entre corais coloridos.',
      'De repente eles acharam um baú de tesouro escondido atrás de uma pedra.',
      'O baú estava cheio de moedas e a sereia cantou uma canção de alegria.',
      'Um polvo curioso apareceu e tentou abrir o baú com os seus braços.',
      'O pinguim empurrou o polvo e a sereia pegou uma moeda brilhante.',
      'Os três voltaram nadando e deixaram o baú no mesmo lugar secreto.',
    ],
  },

  // ---------- Modo Minecraft ----------
  mc_nether_zumbi: {
    modo: 'minecraft',
    historiaId: null,
    titulo: '🗡️ Steve e a invasão do Nether',
    frases: [
      'Steve entrou no portal do Nether e encontrou um zumbi com espada perto da lava.',
      'O zumbi atacou correndo e Steve desviou com um pulo na ponte de obsidiana.',
      'Steve pegou a picareta e quebrou o bloco de netherrack para abrir caminho.',
      'Um piglin apareceu com um machado e o zumbi fugiu para a lava.',
      'Steve colocou tochas na parede e encontrou um baú com diamantes.',
      'Com a espada na mão, Steve voltou pelo portal carregando o baú.',
    ],
  },
  mc_dragao_end: {
    modo: 'minecraft',
    historiaId: null,
    titulo: '🐉 A batalha do Dragão do End',
    frases: [
      'Alex subiu na torre de obsidiana no The End para lutar contra o Dragão do End.',
      'O dragão voou pelo céu escuro e atacou com uma bola de fogo roxa.',
      'Alex disparou flechas com o arco e o dragão perdeu altura devagar.',
      'Um enderman apareceu e Alex desviou o olhar para não provocar.',
      'O dragão caiu no chão do End e a batalha terminou com um brilho.',
      'Alex pegou o troféu e voltou para casa pelo portal de volta.',
    ],
  },
  mc_caverna_creeper: {
    modo: 'minecraft',
    historiaId: null,
    titulo: '💎 Mineração na caverna',
    frases: [
      'Na caverna escura, Steve achou diamantes e colocou tochas na parede.',
      'Um creeper apareceu por trás e Steve correu para longe muito rápido.',
      'Steve construiu uma parede de blocos para se proteger do creeper.',
      'O creeper explodiu a parede e Steve saiu vivo por pouco.',
      'Um esqueleto apareceu com arco e Steve se escondeu atrás do baú.',
      'Steve pegou os diamantes e voltou para a vila com o livro.',
    ],
  },

  // ---------- Hubiss ----------
  hubiss_pitch: {
    modo: 'hubiss',
    historiaId: null,
    titulo: '🏢 Pitch Hubiss Dropshipping',
    frases: [
      'No galpão da Hubiss, um lojista queria vender no Mercado Livre sem ter estoque.',
      'A esteira de encomendas ligou e os pacotes começaram a chegar pela esteira.',
      'A impressora de etiquetas de frete soltou a etiqueta oficial na hora certa.',
      'O lojista conferiu o painel e viu as vendas caindo direto na conta.',
      'Sem comissões abusivas, a logística ficou cem por cento automatizada no galpão.',
      'O caminhão de entrega rápida levou as encomendas e o lojista comemorou.',
    ],
  },
  hubiss_expedicao: {
    modo: 'hubiss',
    historiaId: null,
    titulo: '🏷️ Expedição com Etiqueta Oficial',
    frases: [
      'Na doca do galpão da Hubiss, a esteira rolante trouxe os pacotes e as encomendas.',
      'O operador bipou cada pacote de encomenda lacrado antes de pesar.',
      'A impressora de etiquetas de frete imprimiu oito etiquetas em menos de um minuto.',
      'Um pacote caiu da esteira e o operador recolocou com cuidado.',
      'O caminhão de entrega rápida esperou do lado de fora do galpão.',
      'No fim do turno, todos os pacotes saíram com a etiqueta oficial colada.',
    ],
  },
  hubiss_resultado: {
    modo: 'hubiss',
    historiaId: null,
    titulo: '📈 Painel de Vendas no Galpão',
    frases: [
      'No balcão de atendimento da Hubiss, o lojista mostrou o painel para a equipe.',
      'As vendas do mês cresceram e o estoque próprio deixou de ser problema.',
      'O terminal PDV e maquininha registrou cada pagamento sem nenhum erro.',
      'A equipe comemorou e o gerente prometeu dobrar o volume no mês seguinte.',
      'Um cliente novo chegou e pediu para vender no Mercado Livre também.',
      'O lojista sorriu e disse que a logística agora resolvia tudo.',
    ],
  },

  // ---------- CELIT ----------
  celit_pitch: {
    modo: 'celit',
    historiaId: null,
    titulo: '📱 Pitch CELIT Assistência e ERP',
    frases: [
      'Na loja e assistência CELIT, o cliente chegou com a tela do celular quebrada.',
      'O técnico especialista em celular abriu a ordem de serviço com fotos de avarias.',
      'No balcão de atendimento, o técnico trocou a peça na bancada em vinte minutos.',
      'O termo legal de garantia de noventa dias saiu impresso na hora.',
      'O cliente pagou no terminal PDV e maquininha do balcão da loja.',
      'Com segurança jurídica total, o cliente saiu sorrindo da loja CELIT.',
    ],
  },
  celit_tradein: {
    modo: 'celit',
    historiaId: null,
    titulo: '🏪 Trade-in no Balcão da Loja',
    frases: [
      'No balcão da loja CELIT, o lojista avaliou a pilha de smartphones seminovos.',
      'Ele abriu cada smartphone desmontado para conferir a placa e a bateria.',
      'O técnico gerou o termo de procedência com o IMEI de cada aparelho.',
      'Um cliente trouxe outro celular e pediu desconto na troca.',
      'No terminal PDV e maquininha, o lojista fechou a venda do aparelho revisado.',
      'A pilha de seminovos diminuiu e o balcão ficou organizado outra vez.',
    ],
  },
  celit_garantia: {
    modo: 'celit',
    historiaId: null,
    titulo: '🛡️ Garantia de 90 Dias na Bancada',
    frases: [
      'Na bancada da CELIT, o técnico recebeu um celular que voltou com defeito.',
      'Ele consultou a ordem de serviço e viu a garantia de noventa dias válida.',
      'O técnico trocou o componente sem cobrar nada do cliente.',
      'O cliente voltou no dia seguinte para buscar o aparelho consertado.',
      'No terminal PDV, o sistema registrou o atendimento sem custo.',
      'O técnico sorriu e agradeceu a paciência do cliente na loja.',
    ],
  },

  // ---------- DataSnap ----------
  datasnap_pitch: {
    modo: 'datasnap',
    historiaId: null,
    titulo: '⚡ Pitch DataSnap Big Data ClickHouse',
    frases: [
      'No datacenter da DataSnap, o engenheiro de dados viu o rack de servidores lotado.',
      'A empresa gastava fortunas com logs lentos que travavam nas buscas.',
      'Ao ligar o ClickHouse, bilhões de registros foram consultados em milissegundos.',
      'O painel holográfico de telemetria mostrou o custo de nuvem caindo oitenta por cento.',
      'O engenheiro comemorou e o gerente pediu uma cópia do relatório.',
      'Com a observabilidade ligada, os racks de servidores ficaram estáveis a noite toda.',
    ],
  },
  datasnap_logs: {
    modo: 'datasnap',
    historiaId: null,
    titulo: '🖲️ Análise de Logs com IA',
    frases: [
      'No datacenter futurista da DataSnap, o engenheiro ativou a IA de observabilidade.',
      'A IA leu os logs dos racks de servidores e encontrou um erro escondido.',
      'O engenheiro abriu o painel holográfico de telemetria e pediu mais detalhes.',
      'Um alerta apareceu no painel e o time correu para o rack certo.',
      'Em dois minutos o problema foi resolvido e o serviço voltou ao normal.',
      'O engenheiro documentou a causa e salvou o relatório no painel.',
    ],
  },
  datasnap_resultado: {
    modo: 'datasnap',
    historiaId: null,
    titulo: '📊 Números do Trimestre no Datacenter',
    frases: [
      'No auditório da DataSnap, o engenheiro apresentou os números do trimestre para a equipe.',
      'O custo de nuvem caiu oitenta por cento depois da migração para ClickHouse.',
      'O painel holográfico de telemetria mostrou consultas em milissegundos sem travar.',
      'O gerente elogiou o time e pediu um novo painel para a diretoria.',
      'Um cliente novo assinou o contrato e o datacenter ganhou mais racks.',
      'O engenheiro sorriu e disse que agora os logs não assustam ninguém.',
    ],
  },

  // ---------- QualHora ----------
  qualhora_pitch: {
    modo: 'qualhora',
    historiaId: null,
    titulo: '⏰ Pitch QualHora Agendamento Online',
    frases: [
      'Na recepção da clínica QualHora, a agenda vivia cheia de horários vazios.',
      'Os pacientes esqueciam as consultas e a recepcionista ligava para todos.',
      'Com o agendamento online, cada cliente marcou pelo link em menos de um minuto.',
      'A notificação de lembrete WhatsApp chegou na véspera para cada paciente.',
      'A agenda lotou em três dias e as faltas caíram noventa e oito por cento.',
      'A médica atendeu sem atraso e a recepção comemorou o resultado.',
    ],
  },
  qualhora_grade: {
    modo: 'qualhora',
    historiaId: null,
    titulo: '🗓️ Grade de Horários Lotada',
    frases: [
      'No consultório da clínica QualHora, a médica conferiu a grade de horários no painel.',
      'A recepcionista encaixou dois pacientes novos e atualizou a agenda na hora.',
      'A notificação de lembrete WhatsApp avisou cada paciente do horário marcado.',
      'Um paciente chegou adiantado e a sala de espera ficou cheia.',
      'A médica atendeu todos sem atraso e anotou cada consulta no sistema.',
      'No fim do dia, a recepcionista fechou a agenda com todos os horários preenchidos.',
    ],
  },
  qualhora_lembrete: {
    modo: 'qualhora',
    historiaId: null,
    titulo: '💬 Lembrete no WhatsApp',
    frases: [
      'Na clínica QualHora, a recepcionista viu que faltavam pacientes na agenda do dia.',
      'Ela disparou a notificação de lembrete WhatsApp para cada consulta marcada.',
      'Os celulares tocaram e os pacientes confirmaram presença em poucos minutos.',
      'A médica atendeu a primeira consulta e a sala de espera encheu rápido.',
      'Uma paciente remarcou pelo link e a recepcionista ajustou a agenda.',
      'No fim do dia, nenhuma consulta foi perdida e a clínica comemorou.',
    ],
  },
};

/** Roteiros de um modo, na ordem do arquivo (a tela inicial usa isso). */
export const roteirosDoModo = (modo) =>
  Object.entries(ROTEIROS)
    .filter(([, r]) => r.modo === modo)
    .map(([id, r]) => ({ id, ...r }));

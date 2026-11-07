// Porteiro de Notificações — cada notificação: interromper agora, juntar no resumo das 15h ou silenciar, conforme a sua situação.
// Para adaptar: reescreva a "situacao" do contexto (também editável na tela), as raias (opções de "destino") e as notificações.

export default {
  id: 'porteiro-notificacoes',
  titulo: 'Porteiro de Notificações',
  emoji: '🔔',
  categoria: 'imediata',
  ordem: 8,
  resumo: 'Cada notificação que chega: interromper agora, juntar no resumo das 15h ou silenciar, conforme o que você está fazendo.',
  descricao: 'O Jev lê cada notificação de WhatsApp, Slack, e-mail, banco e apps junto com a sua situação de agora e decide o destino, a urgência e se vem de alguém importante. O que ele decide com pouca confiança não some: vai para a raia "Você decide".',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#a855f7', acento2: '#f9a8d4' },

  contexto: {
    pessoa: 'Luana Prado, dona de uma agência de design com 8 pessoas',
    agora: 'terça-feira, 14h10',
    situacao: 'Estou em reunião presencial com o cliente Grupo Aurora até as 15h. Hoje espero duas coisas: o contador Sérgio (Contabilidade Nunes) mandar a guia do imposto que vence hoje, e a Escola Pé de Feijão avisar sobre a saída do meu filho Theo (quero responder na hora). Promoção e propaganda: silenciar. Grupos de amigos, família e assuntos da equipe que podem esperar: resumo das 15h. Qualquer coisa do Grupo Aurora, de segurança do banco ou de emergência: agora.',
  },
  editavel: {
    campo: 'situacao', rotulo: 'Sua situação agora', botao: 'Minha situação',
    ajuda: 'O Jev lê este texto em cada notificação. Mude (ex.: "saí da reunião e estou dirigindo até as 17h") e aperte ▶ de novo.',
  },

  decisoes: [
    {
      id: 'destino', tipo: 'choice', titulo: 'Destino',
      pergunta: 'O que fazer com esta notificação agora, seguindo a situação da pessoa? Regras: AGORA só o que não pode esperar a reunião acabar (quem ela espera hoje, o cliente da reunião, segurança do banco, emergência); RESUMO das 15h para equipe, família, amigos e movimentação de dinheiro que pode esperar (Pix recebido, fatura, conta a pagar); SILENCIAR promoção, propaganda, rede social, aviso de sistema que só informa que deu tudo certo e golpe.',
      opcoes: [
        { id: 'agora', rotulo: 'Interromper agora', icone: '🔔', cor: '#f87171', desc: 'não pode esperar até as 15h: quem ela espera hoje, o cliente da reunião, segurança do banco ou emergência' },
        { id: 'resumo', rotulo: 'Resumo das 15h', icone: '🗂️', cor: '#fbbf24', desc: 'importa, mas pode esperar a reunião acabar: equipe, família, amigos, Pix recebido, fatura e conta a pagar' },
        { id: 'silenciar', rotulo: 'Silenciar', icone: '🔕', cor: '#64748b', desc: 'promoção, propaganda, rede social, aviso de sistema que só informa que deu tudo certo, ou golpe' },
      ],
    },
    {
      id: 'urgencia', tipo: 'score', titulo: 'Urgência',
      pergunta: 'Quão urgente é esta notificação para a pessoa, hoje?',
      niveis: [
        { rotulo: 'pode esperar', desc: 'nada acontece se ela vir só amanhã' },
        { rotulo: 'hoje', desc: 'precisa ver ainda hoje' },
        { rotulo: 'agora', desc: 'prazo vencendo hoje, dinheiro em risco, criança ou cliente esperando resposta' },
      ],
    },
    {
      id: 'pessoa_importante', tipo: 'noul', titulo: 'Pessoa importante', rotulo: 'pessoa importante', icone: '⭐', tom: 'acento', limiar: 0.6,
      pergunta: 'Quem enviou esta notificação é alguém que importa muito para a pessoa hoje: quem ela está esperando (o contador, a escola do filho), o cliente da reunião ou alguém da família (mãe, filho)? Responda só sobre QUEM enviou, mesmo que o assunto possa esperar. Robôs, bancos, lojas, grupos e colegas de equipe não contam.',
    },
  ],

  fluxo: {
    colunas: 'destino',
    rotuloItem: 'Notificação',
    lote: 2,
    ritmo: 2500,
    humano: { limiar: 0.7, rotulo: 'Você decide', icone: '🙋' },
    cartao: { titulo: 'de', subtitulo: 'app', texto: 'texto', meta: 'hora', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma notificação (ex.: “Banco: Pix de R$ 50 recebido”) e veja se ela interromperia a reunião…', botao: 'Decidir' },
    rotuloFila: 'Chegando no celular',
    rotuloFeitos: 'notificações',
  },

  // conta as interrupções que não aconteceram (vai para o resumo final da demonstração)
  aoDecidir(item, resp, extra) {
    const d = resp.destino && resp.destino.choice;
    extra.total = (extra.total || 0) + 1;
    if (d === 'resumo' || d === 'silenciar') extra.evitadas = (extra.evitadas || 0) + 1;
    if (d === 'silenciar') extra.silenciadas = (extra.silenciadas || 0) + 1;
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'interrupções evitadas', valor: `${extra.evitadas || 0} de ${extra.total || 0}` },
      { rotulo: 'silenciadas', valor: String(extra.silenciadas || 0) },
    ];
  },

  dados: [
    { id: 'n1', app: 'WhatsApp', de: 'Sérgio · Contabilidade Nunes', avatar: '🧾', hora: '14:12', texto: 'Luana, segue a guia do DAS que vence hoje. Dá para pagar até as 16h sem multa.', esperado: { destino: 'agora', urgencia: 2, pessoa_importante: true } },
    { id: 'n2', app: 'App PedeJá', de: 'PedeJá Delivery', avatar: '🍔', hora: '14:12', texto: 'Só hoje: 40% OFF no seu lanche favorito! 🍔🔥', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n3', app: 'Slack', de: 'Carla · #projetos', avatar: '👩‍🎨', hora: '14:13', texto: 'Lu, o cliente Vértice aprovou o layout! Posso mandar para produção?', esperado: { destino: 'resumo', pessoa_importante: false } },
    { id: 'n4', app: 'WhatsApp', de: 'Escola Pé de Feijão', avatar: '🏫', hora: '14:14', texto: 'Mãe do Theo: hoje a saída será às 15h30 por causa da reunião de professores. Confirma quem vem buscar?', esperado: { destino: 'agora', urgencia: 2, pessoa_importante: true } },
    { id: 'n5', app: 'E-mail', de: 'Design Semanal', avatar: '📰', hora: '14:15', texto: 'Newsletter: as 10 tendências de design para 2027.', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n6', app: 'Banco Atlântico', de: 'Banco Atlântico', avatar: '🏦', hora: '14:16', texto: 'Compra de R$ 2.389,90 no cartão final 4412 em Eletro Max Online. Não reconhece? Responda NÃO.', esperado: { destino: 'agora', urgencia: 2, pessoa_importante: false } },
    { id: 'n7', app: 'WhatsApp', de: 'Futebol de quinta ⚽ (grupo)', avatar: '⚽', hora: '14:17', texto: 'Rafa: quem vai quinta? Preciso fechar a lista até amanhã.', esperado: { destino: 'resumo', pessoa_importante: false } },
    { id: 'n8', app: 'E-mail', de: 'Marcelo · Grupo Aurora', avatar: '🏢', hora: '14:18', texto: 'Luana, enviei agora a planilha com os números que vamos discutir nesta reunião.', esperado: { destino: 'agora', urgencia: 2, pessoa_importante: true } },
    { id: 'n9', app: 'App Vista Moda', de: 'Loja Vista Moda', avatar: '🛍️', hora: '14:19', texto: 'Sua sacola está esperando! Frete grátis até meia-noite.', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n10', app: 'Banco Atlântico', de: 'Banco Atlântico', avatar: '💸', hora: '14:20', texto: 'Pix recebido: R$ 4.800,00 de Vértice Comunicação.', esperado: { destino: 'resumo', urgencia: 0, pessoa_importante: false } },
    { id: 'n11', app: 'WhatsApp', de: 'Mãe', avatar: '👵', hora: '14:21', texto: 'Filha, me liga quando puder. Nada urgente, tá? 😘', esperado: { destino: 'resumo', urgencia: 0, pessoa_importante: true } },
    { id: 'n12', app: 'Slack', de: 'Robô de deploy · #avisos', avatar: '🤖', hora: '14:22', texto: 'Deploy do site da agência concluído com sucesso ✅', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n13', app: 'WhatsApp', de: '+55 11 90000-1234', avatar: '❓', hora: '14:23', texto: 'Parabéns! Você ganhou um vale de R$ 1.000. Clique no link para resgatar: premio-agora.top/resgate', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n14', app: 'Slack', de: 'Diego · #suporte', avatar: '👨‍💻', hora: '14:24', texto: '@Luana o site do Grupo Aurora caiu e eles estão sem loja online!', esperado: { destino: 'agora', urgencia: 2 } },
    { id: 'n15', app: 'E-mail', de: 'Contabilidade Nunes (aviso automático)', avatar: '📅', hora: '14:25', texto: 'Lembrete: a folha de pagamento de outubro deve ser enviada até o dia 25.' },
    { id: 'n16', app: 'Pixelgram', de: 'Pixelgram', avatar: '📸', hora: '14:26', texto: 'bia.costa e outras 12 pessoas curtiram a sua foto.', esperado: { destino: 'silenciar', urgencia: 0, pessoa_importante: false } },
    { id: 'n17', app: 'WhatsApp', de: 'Theo (filho)', avatar: '👦', hora: '14:27', texto: 'mãe posso ir na casa do Davi depois da aula??', esperado: { pessoa_importante: true } },
    { id: 'n18', app: 'Banco Atlântico', de: 'Banco Atlântico', avatar: '💳', hora: '14:28', texto: 'A fatura do seu cartão fechou: R$ 3.212,40, com vencimento em 05/11.', esperado: { destino: 'resumo', pessoa_importante: false } },
  ],
};

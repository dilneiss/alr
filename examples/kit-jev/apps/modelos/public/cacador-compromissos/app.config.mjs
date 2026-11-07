// Caçador de Compromissos — lê as mensagens da semana (WhatsApp, e-mail, Slack) e acha o que você prometeu e o que te prometeram.
// Para adaptar: troque quem é "você" no contexto, as raias e as mensagens (exporte as conversas; "Você →" marca o que você escreveu).
export default {
  id: 'cacador-compromissos',
  titulo: 'Caçador de Compromissos',
  emoji: '🎯',
  categoria: 'atendimento',
  ordem: 16,
  resumo: 'Lê as suas conversas e separa o que você prometeu, o que te prometeram e o "vou ver" que ninguém vai lembrar.',
  descricao: 'Cada mensagem passa pelo Jev: tem compromisso? De quem para quem? É firme ou só um "se der"? E tem prazo? Lendo centenas de mensagens por centavos, nenhum "mando amanhã" se perde, e o que for ambíguo fica para você conferir.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#b45309', acento2: '#38bdf8' },

  contexto: {
    voce: 'Thiago Ramos, dono da TR Reformas (reformas residenciais em Belo Horizonte)',
    como_ler: 'mensagens que começam com "Você →" foram escritas pelo Thiago; as outras foram recebidas por ele',
    hoje: 'segunda-feira, 19/10/2026',
  },

  decisoes: [
    {
      id: 'compromisso', tipo: 'choice', titulo: 'Compromisso',
      pergunta: 'Esta mensagem tem um compromisso? Quem escreve é quem promete: "Você → …" é o Thiago prometendo (por ele ou pela equipe dele) → eu_prometi; "… → você" é outra pessoa prometendo ao Thiago → me_prometeram. Promessa vaga ou condicional ("vou ver", "se der", "vou tentar", "quem sabe"), venha de quem vier → talvez. Pedido, pergunta, aviso, agradecimento ou propaganda, sem ninguém se comprometer → nenhum.',
      opcoes: [
        { id: 'eu_prometi', rotulo: 'Eu prometi', icone: '📌', cor: '#f59e0b', desc: 'mensagem escrita pelo Thiago ("Você → …") em que ele, ou alguém da equipe dele, vai fazer, mandar, pagar ou aparecer' },
        { id: 'me_prometeram', rotulo: 'Me prometeram', icone: '⏳', cor: '#38bdf8', desc: 'mensagem escrita por outra pessoa ("… → você") em que ela se compromete com o Thiago: vai entregar, mandar, pagar ou aparecer' },
        { id: 'talvez', rotulo: 'Talvez', icone: '🤷', cor: '#a78bfa', desc: 'promessa vaga ou condicional, de qualquer lado: "vou ver", "se der", "vou tentar", "quem sabe mês que vem"' },
        { id: 'nenhum', rotulo: 'Sem compromisso', icone: '💬', cor: '#6b7280', desc: 'ninguém se compromete: pedido, pergunta, aviso, agradecimento, propaganda' },
      ],
    },
    {
      id: 'tem_prazo', tipo: 'noul', titulo: 'Tem prazo', rotulo: 'tem prazo', icone: '📅', tom: 'acento', limiar: 0.5,
      pergunta: 'Alguém se compromete nesta mensagem E ela diz quando o compromisso vence (data, dia da semana, "amanhã", "até sexta", "esta semana" ou horário)? Se ninguém se compromete, a resposta é não.',
    },
  ],

  fluxo: {
    colunas: 'compromisso',
    rotuloItem: 'Mensagem',
    rotuloFila: 'Mensagens da semana',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.7, rotulo: 'Você confere', icone: '🔎' },
    cartao: { titulo: 'quem', subtitulo: 'canal', texto: 'texto', meta: 'quando', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma mensagem (comece com "Você →" se foi você que escreveu)…', botao: 'Caçar' },
    rotuloFeitos: 'mensagens',
  },
  textoItem: (m) => `${m.quem} (${m.canal}, ${m.quando}): «${m.texto}»`,

  // o que fazer com cada compromisso achado (texto nosso; o Jev só decidiu a raia e o prazo)
  cartaoExtra(item, resp) {
    const c = resp.compromisso && resp.compromisso.choice;
    const prazo = resp.tem_prazo && resp.tem_prazo.noul >= 0.5;
    if (c === 'eu_prometi') return `<span class="mj-chip acento">${prazo ? '⏰ vira lembrete na sua agenda' : '📝 vai para a sua lista'}</span>`;
    if (c === 'me_prometeram') return `<span class="mj-chip info">${prazo ? '🔔 cobrar se não vier no prazo' : '🔔 perguntar quando vem'}</span>`;
    if (c === 'talvez') return '<span class="mj-chip">👀 acompanhar</span>';
    return '';
  },
  aoDecidir(item, resp, extra) {
    const c = resp.compromisso && resp.compromisso.choice;
    if (c === 'eu_prometi') extra.minhas = (extra.minhas || 0) + 1;
    if (c === 'me_prometeram') extra.deles = (extra.deles || 0) + 1;
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'promessas suas', valor: String(extra.minhas || 0) },
      { rotulo: 'esperando dos outros', valor: String(extra.deles || 0) },
    ];
  },

  dados: [
    { id: 'm1', quem: 'Você → Dona Célia (cliente)', canal: 'WhatsApp', quando: 'seg 08:12', avatar: '📤', texto: 'Pode deixar, Dona Célia, mando o orçamento do banheiro até quinta.', esperado: { compromisso: 'eu_prometi', tem_prazo: true } },
    { id: 'm2', quem: 'Casa do Piso (fornecedor) → você', canal: 'E-mail', quando: 'seg 08:30', avatar: '📦', texto: 'O porcelanato da obra da Rua Itu chega na segunda pela manhã.', esperado: { compromisso: 'me_prometeram', tem_prazo: true } },
    { id: 'm3', quem: 'Você → Marcos (eletricista)', canal: 'WhatsApp', quando: 'seg 09:05', avatar: '📤', texto: 'Vejo isso depois e te falo', esperado: { compromisso: 'talvez', tem_prazo: false } },
    { id: 'm4', quem: 'Grupo da obra (Rua Itu)', canal: 'WhatsApp', quando: 'seg 09:10', avatar: '👷', texto: 'Bom dia, pessoal! 🌞', esperado: { compromisso: 'nenhum', tem_prazo: false } },
    { id: 'm5', quem: 'Arq. Paula Mendes → você', canal: 'WhatsApp', quando: 'seg 09:40', avatar: '📐', texto: 'Te mando as plantas revisadas amanhã cedo.', esperado: { compromisso: 'me_prometeram', tem_prazo: true } },
    { id: 'm6', quem: 'Você → Seu Jorge (cliente)', canal: 'WhatsApp', quando: 'seg 10:02', avatar: '📤', texto: 'Fica tranquilo, o pintor volta pra retocar a parede da sala sem custo.', esperado: { compromisso: 'eu_prometi', tem_prazo: false } },
    { id: 'm7', quem: 'Silvio (contador) → você', canal: 'E-mail', quando: 'seg 10:15', avatar: '🧮', texto: 'Se der, ainda esta semana te passo o valor do imposto.', esperado: { compromisso: 'talvez' } },
    { id: 'm8', quem: 'Você → equipe', canal: 'Slack', quando: 'seg 10:31', avatar: '📤', texto: 'Alguém consegue revisar o orçamento da Dona Célia hoje?', esperado: { compromisso: 'nenhum', tem_prazo: false } },
    { id: 'm9', quem: 'Rafael (cliente) → você', canal: 'WhatsApp', quando: 'seg 11:20', avatar: '🧑', texto: 'Pago o restante da reforma assim que vocês entregarem a cozinha.', esperado: { compromisso: 'me_prometeram' } },
    { id: 'm10', quem: 'Você → Rafael (cliente)', canal: 'WhatsApp', quando: 'seg 11:24', avatar: '📤', texto: 'Combinado: a cozinha fica pronta até o dia 15/11.', esperado: { compromisso: 'eu_prometi', tem_prazo: true } },
    { id: 'm11', quem: 'Ferragens Central → você', canal: 'E-mail', quando: 'seg 13:05', avatar: '🔩', texto: 'Vou tentar conseguir o desconto com a fábrica, mas não prometo nada.', esperado: { compromisso: 'talvez', tem_prazo: false } },
    { id: 'm12', quem: 'Você → Arq. Paula Mendes', canal: 'WhatsApp', quando: 'seg 13:40', avatar: '📤', texto: 'Amanhã eu passo na obra às 8h pra gente ver o forro.', esperado: { compromisso: 'eu_prometi', tem_prazo: true } },
    { id: 'm13', quem: 'Depósito Bom Preço', canal: 'E-mail', quando: 'seg 14:00', avatar: '🏷️', texto: 'Promoção de cimento: 20% de desconto só nesta semana!', esperado: { compromisso: 'nenhum', tem_prazo: false } },
    { id: 'm14', quem: 'Marcos (eletricista) → você', canal: 'WhatsApp', quando: 'seg 14:22', avatar: '⚡', texto: 'Fechado, segunda às 7h tô lá com a equipe.', esperado: { compromisso: 'me_prometeram', tem_prazo: true } },
    { id: 'm15', quem: 'Jair (pedreiro) → você', canal: 'WhatsApp', quando: 'seg 15:10', avatar: '🧱', texto: 'Amanhã sem falta eu termino o reboco… igual semana passada, né? 😅' },
    { id: 'm21', quem: 'Você → Arq. Paula Mendes', canal: 'WhatsApp', quando: 'seg 16:20', avatar: '📤', texto: 'Beleza, a gente se fala.' },
    { id: 'm16', quem: 'Você → grupo da família', canal: 'WhatsApp', quando: 'seg 16:45', avatar: '📤', texto: 'Domingo eu levo a sobremesa 🍰', esperado: { compromisso: 'eu_prometi', tem_prazo: true } },
    { id: 'm17', quem: 'Dona Célia (cliente) → você', canal: 'WhatsApp', quando: 'seg 17:02', avatar: '👵', texto: 'Obrigada pelo capricho, o lavabo ficou lindo!', esperado: { compromisso: 'nenhum', tem_prazo: false } },
    { id: 'm18', quem: 'Você → Silvio (contador)', canal: 'E-mail', quando: 'seg 17:30', avatar: '📤', texto: 'Deixa comigo, até sexta te mando as notas de setembro.', esperado: { compromisso: 'eu_prometi', tem_prazo: true } },
    { id: 'm19', quem: 'Você → Seu Jorge (cliente)', canal: 'WhatsApp', quando: 'seg 18:05', avatar: '📤', texto: 'Quem sabe mês que vem a gente faz a área externa', esperado: { compromisso: 'talvez' } },
    { id: 'm20', quem: 'Vera (cliente) → você', canal: 'WhatsApp', quando: 'seg 18:40', avatar: '👩', texto: 'Vou ver com o meu marido e te aviso se fechamos a reforma.', esperado: { compromisso: 'talvez', tem_prazo: false } },
  ],
};

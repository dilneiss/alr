// Facilitador de Reunião — o Jev classifica cada fala (decisão, tarefa, pergunta, fuga da pauta…) e cobra dono para as tarefas.
// Para adaptar: troque a pauta e os participantes no contexto; os textos da ata e do placar ficam no responder.
const TIPOS = [
  { id: 'decisao', rotulo: 'Decisão', icone: '✅', tom: 'bom', desc: 'o grupo bate o martelo sobre algo da pauta ("então fica decidido…", "fechado: vamos com a opção B")' },
  { id: 'tarefa', rotulo: 'Tarefa', icone: '📌', tom: 'acento', desc: 'algo que alguém precisa FAZER depois da reunião, com ou sem dono ("eu ligo pros clientes", "alguém precisa atualizar o FAQ")' },
  { id: 'pergunta_sem_resposta', rotulo: 'Pergunta em aberto', icone: '❓', tom: 'medio', desc: 'dúvida sobre a pauta que ainda não foi respondida na reunião' },
  { id: 'fuga_da_pauta', rotulo: 'Fuga da pauta', icone: '↪️', tom: 'ruim', desc: 'assunto sem relação com a pauta (futebol, festa, fofoca, outro projeto)' },
  { id: 'informacao', rotulo: 'Informação', icone: 'ℹ️', tom: 'info', desc: 'status, dado ou contexto sobre a pauta ("o Pix já está pronto", "os clientes pediram desconto"), ou a abertura de um ponto da pauta' },
  { id: 'outro', rotulo: 'Outro', icone: '💬', tom: '', desc: 'cumprimento, concordância solta ou fala sem conteúdo' },
];
const ATA = { decisao: 0, tarefa: 0, sem_dono: 0, pergunta_sem_resposta: 0, fuga_da_pauta: 0 };
const sistema = (texto) => ({ texto, quem: '__sistema', classe: 'sistema' });
const conta = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const temDono = (resp) => !!(resp.tem_responsavel && resp.tem_responsavel.noul >= 0.5);

export default {
  id: 'facilitador-reuniao',
  titulo: 'Facilitador de Reunião',
  emoji: '🧭',
  categoria: 'voz',
  ordem: 64,
  resumo: 'Escuta a reunião, anota decisões e tarefas na hora, cobra dono e puxa o grupo de volta quando a conversa foge da pauta.',
  descricao: 'Cada fala vai ao Jev, que escolhe o tipo dela numa lista fechada e diz se a tarefa tem responsável. A ata se monta sozinha durante a reunião: decisão registrada, tarefa sem dono cobrada na hora, fuga da pauta devolvida ao assunto.',
  marcas: ['imediato', 'volume', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#84cc16', acento2: '#22d3ee' },

  contexto: {
    empresa: 'Lumen Apps (fictícia), app de pedidos para restaurantes',
    pauta: 'lançamento da versão 2.0: data, campanha, clientes que reclamaram do boleto e preço do plano anual',
    participantes: 'Ana (produto, conduz), Bruno (desenvolvimento), Carla (marketing), Diego (vendas)',
  },

  decisoes: [
    {
      id: 'tipo_fala', tipo: 'choice', papel: 'destaque', titulo: 'Tipo de fala',
      pergunta: 'Que tipo de fala é esta, para a ata da reunião? A pauta está em contexto.pauta. Regras: tarefa é algo a FAZER depois da reunião, mesmo sem dono; decisão é uma escolha fechada pelo grupo; pergunta em aberto é dúvida sobre a pauta; fuga da pauta é assunto sem relação com a pauta, mesmo que comece com "falando nisso".',
      opcoes: TIPOS,
    },
    {
      id: 'tem_responsavel', tipo: 'noul', papel: 'contador', titulo: 'Tarefas com dono', rotuloSim: 'tem dono', rotuloNao: 'sem dono', tom: 'bom', limiar: 0.5,
      pergunta: 'A fala atual traz uma tarefa E diz QUEM vai fazer? SIM quando alguém se compromete ("eu ligo", "deixa comigo") ou a fala dá um nome ("a Carla cuida disso"). NÃO quando a tarefa fica com "alguém", "a gente" ou "precisamos", sem nome, e NÃO quando a fala não traz tarefa nenhuma (informação, pergunta, decisão sem tarefa, fuga da pauta).',
    },
  ],

  conversa: {
    skin: 'reuniao',
    titulo: 'Reunião semanal · Lumen Apps',
    subtitulo: 'pauta: lançamento da versão 2.0',
    avatar: '🧭',
    abertura: '🧭 Facilitador ligado: o Jev ouve cada fala e monta a ata durante a reunião',
    participantes: {
      ana: { nome: 'Ana · produto', avatar: '👩🏽‍💼', lado: 'esq' },
      bruno: { nome: 'Bruno · dev', avatar: '👨🏻‍💻', lado: 'esq' },
      carla: { nome: 'Carla · marketing', avatar: '👩🏼‍🎨', lado: 'esq' },
      diego: { nome: 'Diego · vendas', avatar: '🧔🏾', lado: 'esq' },
    },
    analisar: ['ana', 'bruno', 'carla', 'diego'],
    voce: 'ana',
    escolherQuem: true,
    placeholder: 'Fale como alguém da reunião (ex.: "alguém precisa revisar o contrato")',
    tituloPlacar: 'Placar da reunião',
    selo(resp) {
      const t = TIPOS.find((x) => x.id === (resp.tipo_fala && resp.tipo_fala.choice));
      if (!t || t.id === 'outro') return null;
      if (t.id === 'tarefa') return temDono(resp) ? { texto: 'tarefa com dono', tom: 'bom', icone: '📌' } : { texto: 'tarefa sem dono', tom: 'ruim', icone: '⚠️' };
      return { texto: t.rotulo, tom: t.tom || 'acento', icone: t.icone };
    },
    responder(resp, fala, ctx, estado) {
      const t = resp.tipo_fala && resp.tipo_fala.choice;
      const n = (estado.ata ||= { ...ATA });
      if (t === 'tarefa' && !temDono(resp)) n.sem_dono++;
      if (t in n) n[t]++;
      const placar = `ata: ${conta(n.decisao, 'decisão', 'decisões')} · ${conta(n.tarefa, 'tarefa', 'tarefas')} (${n.sem_dono} sem dono) · ${conta(n.pergunta_sem_resposta, 'pergunta', 'perguntas')} em aberto · ${conta(n.fuga_da_pauta, 'fuga', 'fugas')} da pauta`;
      if (t === 'fuga_da_pauta') return sistema(`↪️ Fora da pauta. Voltando: ${ctx.pauta.split(':')[0]}. (${placar})`);
      if (t === 'decisao') return sistema(`📝 Decisão nº ${n.decisao} registrada na ata. (${placar})`);
      if (t === 'tarefa' && !temDono(resp)) return sistema(`⚠️ Tarefa sem dono: quem assume? (${placar})`);
      if (t === 'tarefa') return sistema(`📝 Tarefa nº ${n.tarefa} na ata, com dono. (${placar})`);
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Data do lançamento',
      falas: [
        { quem: 'ana', texto: 'Bom dia, gente! Pauta de hoje: a data de lançamento da versão 2.0.', esperado: { tipo_fala: ['informacao', 'outro'], tem_responsavel: false } },
        { quem: 'bruno', texto: 'Do meu lado, o pagamento por Pix já está pronto e testado.', esperado: { tipo_fala: 'informacao', tem_responsavel: false } },
        { quem: 'carla', texto: 'E a campanha? Vai ter verba pra mídia paga ou não?', esperado: { tipo_fala: 'pergunta_sem_resposta', tem_responsavel: false } },
        { quem: 'diego', texto: 'Falando nisso, vocês viram o jogo ontem? Que virada!', esperado: { tipo_fala: 'fuga_da_pauta', tem_responsavel: false } },
        { quem: 'ana', texto: 'Voltando: fica decidido que o lançamento é dia 12 de novembro.', esperado: { tipo_fala: 'decisao', tem_responsavel: false } },
        { quem: 'bruno', texto: 'Fechado. Eu publico nas lojas de aplicativo até o dia 10.', esperado: { tipo_fala: 'tarefa', tem_responsavel: true } },
      ],
    },
    {
      titulo: 'Tarefas sem dono',
      falas: [
        { quem: 'ana', texto: 'Agora, os clientes que reclamaram do boleto na versão antiga.', esperado: { tipo_fala: ['informacao', 'outro'] } },
        { quem: 'diego', texto: 'Eu ligo hoje mesmo pros três maiores.', esperado: { tipo_fala: 'tarefa', tem_responsavel: true } },
        { quem: 'carla', texto: 'Alguém precisa atualizar o FAQ do site antes do lançamento.', esperado: { tipo_fala: 'tarefa', tem_responsavel: false } },
        { quem: 'bruno', texto: 'E o aviso dentro do app? Quem escreve o texto?', esperado: { tipo_fala: ['pergunta_sem_resposta', 'tarefa'], tem_responsavel: false } },
        { quem: 'carla', texto: 'Deixa comigo, eu escrevo até quinta.', esperado: { tipo_fala: 'tarefa', tem_responsavel: true } },
        { quem: 'diego', texto: 'Mudando de assunto: a festa de fim de ano vai ser onde?', esperado: { tipo_fala: 'fuga_da_pauta', tem_responsavel: false } },
      ],
    },
    {
      titulo: 'Preço do plano anual',
      falas: [
        { quem: 'ana', texto: 'Último ponto: o preço do plano anual.', esperado: { tipo_fala: ['informacao', 'outro'] } },
        { quem: 'diego', texto: 'Os clientes grandes estão pedindo plano anual com desconto.', esperado: { tipo_fala: 'informacao', tem_responsavel: false } },
        { quem: 'carla', texto: 'Quanto de desconto dá pra dar sem perder margem?', esperado: { tipo_fala: 'pergunta_sem_resposta', tem_responsavel: false } },
        { quem: 'ana', texto: 'Então fica decidido: plano anual com 15% de desconto.', esperado: { tipo_fala: 'decisao', tem_responsavel: false } },
        { quem: 'diego', texto: 'Beleza. Eu aviso os clientes grandes amanhã cedo.', esperado: { tipo_fala: 'tarefa', tem_responsavel: true } },
      ],
    },
  ],
};

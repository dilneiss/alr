// Mestre de RPG que Não Quebra Regras — os jogadores dizem o que fazem; o Jev escolhe perícia, dificuldade e reação do NPC, e o código rola o dado.
// Para adaptar: troque o mundo, as cenas e os personagens do contexto, os bônus em PERSONAGENS e os textos de narração.

const PERSONAGENS = {
  lia: { nome: 'Lia', bonus: { atletismo: 3, furtividade: 5, persuasao: 1, percepcao: 4, arcanismo: 2, combate: 4 } },
  bruno: { nome: 'Bruno', bonus: { atletismo: 4, furtividade: -1, persuasao: 2, percepcao: 1, arcanismo: -1, combate: 5 } },
};
const CD = [8, 12, 16, 20];   // classe de dificuldade de cada nível da decisão "dificuldade"
const PERICIAS = [
  { id: 'atletismo', rotulo: 'Atletismo', icone: '🧗', desc: 'escalar, pular, nadar, correr, empurrar ou levantar peso' },
  { id: 'furtividade', rotulo: 'Furtividade', icone: '🥷', desc: 'esconder-se, andar sem ser visto ou ouvido, ouvir escondido' },
  { id: 'persuasao', rotulo: 'Persuasão', icone: '🗣️', desc: 'convencer, negociar, elogiar, mentir, blefar ou intimidar com palavras e gestos' },
  { id: 'percepcao', rotulo: 'Percepção', icone: '👁️', desc: 'procurar, examinar, notar detalhes ou passagens escondidas' },
  { id: 'arcanismo', rotulo: 'Arcanismo', icone: '✨', desc: 'magia, runas, feitiços e objetos mágicos' },
  { id: 'combate', rotulo: 'Combate', icone: '⚔️', desc: 'atacar alguém com arma, flecha ou punhos' },
  { id: 'nenhuma', rotulo: 'Nenhuma', icone: '🚶', desc: 'só anda, chega a um lugar ou conversa sem precisar de teste' },
];
const NIVEIS = ['fácil', 'média', 'difícil', 'heroica'];

// ---------- textos do mestre (o Jev não escreve nada: ele escolhe, e o código narra) ----------
const CENAS = {
  taverna: 'A porta da Taverna do Javali Dourado range. Cheiro de lenha e ensopado. Atrás do balcão, Dona Berta mede os forasteiros de cima a baixo. No canto mais escuro, um encapuzado gira uma moeda sobre um mapa coberto de runas.',
  ponte: 'A Ponte de Pedra Velha surge na curva da estrada. Dois guardas do Barão Vermelho bloqueiam a passagem: Gaspar, veterano cheio de cicatrizes, e Tico, um rapaz que não para de ajeitar o capacete. Lá embaixo, 20 metros de queda até o rio. “Pedágio: cinco moedas de ouro por cabeça!”',
};
const NARRA = {
  atletismo: { sucesso: '{nome} toma impulso e chega lá com folga, sem um arranhão.', falha: '{nome} escorrega no meio do caminho e cai de costas, levantando poeira.' },
  furtividade: { sucesso: '{nome} desliza pelas sombras sem fazer um ruído.', falha: 'Uma tábua range sob os pés de {nome}. Silêncio total… e todos olham.' },
  persuasao: { sucesso: '{nome} fala com convicção, sem gaguejar.', falha: '{nome} se enrola nas palavras, e o clima esfria na hora.' },
  percepcao: { sucesso: '{nome} nota o que ninguém tinha visto: uma corda velha amarrada sob a borda.', falha: '{nome} procura com cuidado, mas não acha nada de útil.' },
  arcanismo: { sucesso: 'As runas se acendem para {nome}: o mapa mostra uma passagem secreta pelas minas do norte.', falha: 'As runas se embaralham diante dos olhos de {nome}.' },
  combate: { sucesso: 'O golpe de {nome} acerta em cheio.', falha: 'O golpe de {nome} passa raspando.' },
};
const REACOES = {
  taverna: {
    amigavel: 'Dona Berta abre um sorriso e baixa a voz: “O encapuzado chegou ontem. Pagou com ouro do Barão.”',
    desconfiado: 'Dona Berta estreita os olhos, desconfiada… mas acaba contando que o encapuzado pagou com ouro do Barão.',
    hostil: 'Os mercenários da mesa do fundo se levantam, estalando os dedos.',
    assustado: 'Dona Berta recua até a parede, segurando a concha como se fosse um escudo.',
    indiferente: 'O encapuzado continua girando a moeda, sem tirar os olhos do mapa.',
  },
  ponte: {
    amigavel: 'Tico relaxa os ombros e quase sorri.',
    desconfiado: 'Gaspar cruza os braços: “Mensageiros do Barão, é?”… mas, sem querer encrenca com o Barão, dá um passo para o lado.',
    hostil: 'Gaspar firma a lança e avança um passo: “Última chance, forasteiro.”',
    assustado: 'Tico deixa a lança cair e se encolhe atrás da guarita.',
    indiferente: 'Os guardas discutem o pedágio entre si e nem olham para vocês.',
  },
  geral: { amigavel: 'O NPC sorri, mais à vontade.', desconfiado: 'O NPC desconfia e não tira os olhos de vocês.', hostil: 'O NPC parte para cima.', assustado: 'O NPC recua, com medo.', indiferente: 'O NPC nem percebe.' },
};
const FALHA_NPC = { taverna: 'Dona Berta dá de ombros e volta para a cozinha.', ponte: 'Gaspar bate a lança no chão: “Pedágio. Agora.”', geral: 'Ninguém se impressiona.' };

function cenaDe(texto) {
  const x = texto.toLowerCase();
  if (/taverna|javali|berta|encapuzado/.test(x)) return 'taverna';
  if (/ponte|guarda|gaspar|tico|pedágio|pedagio/.test(x)) return 'ponte';
  return null;
}
function impossivelTexto(texto, nome) {
  const x = texto.toLowerCase();
  if (/canh|arma de fogo|pólvora|polvora|bomba|tiro|metralh|celular|dinamite/.test(x)) return `Não existe pólvora neste mundo, ${nome}. Canhão, só em sonho. O mestre não deixa quebrar as regras: o que você faz de verdade?`;
  if (/pul|salt|vo[aeo]|teleport/.test(x)) return `Nem o melhor atleta do reino faz isso, ${nome}: o corpo tem limite. O mestre não deixa quebrar as regras: o que você faz de verdade?`;
  return `Isso quebra as regras deste mundo, ${nome}. O mestre não deixa: escolha outra ação.`;
}
const nivelDe = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 1);

export default {
  id: 'mestre-rpg',
  titulo: 'Mestre de RPG que Não Quebra Regras',
  emoji: '🎲',
  categoria: 'casa-jogos',
  ordem: 83,
  resumo: 'Os jogadores dizem o que fazem; o Jev escolhe a perícia, a dificuldade e a reação do NPC dentro das regras do mundo, e o código rola o d20.',
  descricao: 'A cada ação o Jev decide quatro coisas numa chamada só: perícia, dificuldade, reação de quem está em cena e se a ação é impossível neste mundo. Canhão numa fantasia medieval é barrado antes do dado; o resto vira rolagem de verdade no código, com narração pronta.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#e0a458', acento2: '#c2410c' },
  origem: 'comunidade: NPCs que decidem dentro das regras (citado pelo CEO da TypeSafe)',

  contexto: {
    mundo: 'Fantasia medieval de baixa magia, com regras simples de d20. Não existem armas de fogo, pólvora, máquinas nem tecnologia moderna. Magia só com feitiço que o personagem conhece. Ninguém voa, se teletransporta ou pula dezenas de metros.',
    personagens: {
      Lia: 'elfa patrulheira: ágil, silenciosa, ótima com o arco; conhece um único feitiço (luz mágica) e sabe um pouco de runas',
      Bruno: 'humano guerreiro: forte, de armadura pesada e barulhenta, espada e escudo; não sabe magia',
    },
    cenas: {
      taverna: 'Taverna do Javali Dourado: Dona Berta, a taberneira, desconfia de forasteiros mas gosta de quem elogia o ensopado dela; um encapuzado no canto esconde um mapa com runas; mercenários bebem na mesa do fundo.',
      ponte: 'Ponte de Pedra Velha: dois guardas do Barão Vermelho cobram pedágio. Gaspar é veterano, experiente e durão; Tico é jovem, nervoso e medroso. O rio passa furioso 20 metros abaixo.',
    },
    regras_de_reacao: 'Ataque ou ameaça contra um guerreiro → hostil; contra alguém fraco ou medroso → assustado. Mentira, blefe ou suborno → desconfiado. Elogio, gentileza ou pagamento justo → amigável. Ação que o NPC não percebe ou que não o envolve → indiferente.',
  },

  decisoes: [
    {
      id: 'pericia', tipo: 'choice', papel: 'destaque', titulo: 'Perícia',
      pergunta: 'Qual perícia o jogador está usando na fala atual? Se a fala só descreve deslocamento, chegada a um lugar ou conversa que não pede teste, escolha nenhuma.',
      opcoes: PERICIAS,
    },
    {
      id: 'dificuldade', tipo: 'score', papel: 'medidor', titulo: 'Dificuldade',
      pergunta: 'Quão difícil é a ação para este personagem, nesta cena? Leve em conta as habilidades dele (o guerreiro de armadura é ruim em furtividade; a elfa é ágil) e quem está contra.',
      niveis: [
        { rotulo: 'fácil', desc: 'qualquer aventureiro consegue (CD 8)' },
        { rotulo: 'média', desc: 'exige alguma habilidade (CD 12)' },
        { rotulo: 'difícil', desc: 'arriscada, poucos conseguem (CD 16)' },
        { rotulo: 'heroica', desc: 'quase impossível, só um herói lendário (CD 20)' },
      ],
    },
    {
      id: 'reacao_npc', tipo: 'choice', papel: 'destaque', titulo: 'Reação do NPC',
      pergunta: 'Como os personagens do mestre (NPCs) reagem à ação DESTA fala, e não ao que aconteceu antes? Siga as regras de reação e a personalidade de cada NPC da cena. Se a ação não envolve nenhum NPC, ou se nenhum deles percebe, a reação é indiferente.',
      opcoes: [
        { id: 'amigavel', rotulo: 'Amigável', icone: '😊', desc: 'gostou: elogio, gentileza ou pagamento justo' },
        { id: 'desconfiado', rotulo: 'Desconfiado', icone: '🤨', desc: 'percebe mentira, blefe ou suborno' },
        { id: 'hostil', rotulo: 'Hostil', icone: '😠', desc: 'parte para a briga: foi atacado ou ameaçado e é guerreiro' },
        { id: 'assustado', rotulo: 'Assustado', icone: '😨', desc: 'foi ameaçado e é fraco ou medroso' },
        { id: 'indiferente', rotulo: 'Indiferente', icone: '😐', desc: 'não percebe a ação ou ela não o envolve' },
      ],
    },
    {
      id: 'acao_impossivel', tipo: 'noul', papel: 'checklist', titulo: 'Ação impossível', rotulo: 'ação impossível', rotuloSim: 'sim, barrada', rotuloNao: 'não', tom: 'ruim', alerta: true, limiar: 0.5,
      pergunta: 'A ação é impossível neste mundo ou para este personagem (arma de fogo ou tecnologia, voar, se teletransportar, pular dezenas de metros, magia que ele não conhece)?',
    },
  ],

  conversa: {
    skin: 'rpg',
    titulo: 'Mesa de quinta · A Busca do Mapa',
    subtitulo: 'o Jev decide, o dado é do código',
    avatar: '🎲',
    participantes: {
      lia: { nome: 'Lia', avatar: '🧝', lado: 'esq' },
      bruno: { nome: 'Bruno', avatar: '🛡️', lado: 'esq' },
      mestre: { nome: 'Mestre', avatar: '🎲', lado: 'dir' },
    },
    analisar: ['lia', 'bruno'],
    voce: 'lia',
    escolherQuem: true,
    respondeComo: 'mestre',
    placeholder: 'Escreva a ação do personagem (ex.: “eu escalo a muralha”)',
    abertura: '🎲 A mesa está pronta. Os jogadores dizem o que fazem; o Jev decide a perícia, a dificuldade e a reação de quem está em cena; o dado é rolado pelo código.',
    tituloPlacar: 'Ficha da jogada',
    tituloAnalise: 'O Jev julgou cada ação',
    ritmo: 1.2,

    responder(resp, fala, ctx, estado) {
      const p = PERSONAGENS[fala.quem] || { nome: fala.quem, bonus: {} };
      const cena = cenaDe(fala.texto) || estado.cena || null;
      estado.cena = cena;
      if (resp.acao_impossivel && resp.acao_impossivel.noul >= 0.5) {
        return { texto: impossivelTexto(fala.texto, p.nome), classe: 'mestre', marca: '⛔ sem rolagem: regra do mundo' };
      }
      const per = resp.pericia && resp.pericia.choice;
      if (!per || per === 'nenhuma') {
        if (cena && estado.descrita !== cena) { estado.descrita = cena; return { texto: CENAS[cena], classe: 'mestre', marca: '📜 nova cena' }; }
        return { texto: 'Nada a rolar aqui. O que vocês fazem?', classe: 'mestre' };
      }
      const nivel = Math.max(0, Math.min(CD.length - 1, nivelDe(resp.dificuldade)));
      const bonus = p.bonus[per] ?? 0;
      const d20 = 1 + Math.floor(Math.random() * 20);
      const total = d20 + bonus;
      const sucesso = d20 === 20 || (d20 !== 1 && total >= CD[nivel]);
      const reacao = resp.reacao_npc && resp.reacao_npc.choice;
      const narra = (NARRA[per] || NARRA.combate)[sucesso ? 'sucesso' : 'falha'].replace('{nome}', p.nome);
      const lista = REACOES[cena] || REACOES.geral;
      const reage = sucesso || reacao === 'hostil' ? (lista[reacao] || '') : (FALHA_NPC[cena] || FALHA_NPC.geral);
      const extra = d20 === 20 ? ' Acerto crítico!' : d20 === 1 ? ' Falha crítica!' : '';
      return {
        texto: `${narra}${extra} ${reage}`.trim(),
        classe: 'mestre',
        marca: `🎲 d20 ${d20} ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} = ${total} contra CD ${CD[nivel]} · ${sucesso ? 'sucesso' : 'falha'}`,
      };
    },

    selo(resp) {
      if (resp.acao_impossivel && resp.acao_impossivel.noul >= 0.5) return { texto: 'impossível', icone: '⛔', tom: 'ruim' };
      const o = PERICIAS.find((x) => x.id === (resp.pericia && resp.pericia.choice));
      if (!o || o.id === 'nenhuma') return null;
      return { texto: `${o.rotulo} · ${NIVEIS[nivelDe(resp.dificuldade)] || ''}`, icone: o.icone, tom: 'acento' };
    },
  },

  roteiros: [
    {
      titulo: 'A Taverna do Javali',
      falas: [
        { quem: 'lia', depois: 1500, texto: 'Bora entrar na Taverna do Javali Dourado, dizem que o informante bebe lá.', esperado: { pericia: 'nenhuma', acao_impossivel: false } },
        { quem: 'bruno', depois: 1400, texto: 'Peço uma cerveja, pago bem e elogio o ensopado da Dona Berta antes de perguntar do encapuzado.', esperado: { pericia: 'persuasao', reacao_npc: 'amigavel', acao_impossivel: false } },
        { quem: 'lia', depois: 1400, texto: 'Enquanto isso, eu me esgueiro pelas sombras até a mesa do encapuzado pra ouvir a conversa dele.', esperado: { pericia: 'furtividade', reacao_npc: 'indiferente', acao_impossivel: false } },
        { quem: 'bruno', depois: 1400, texto: 'Cansei de esperar. Saco meu canhão e explodo a taverna inteira!', esperado: { acao_impossivel: true } },
        { quem: 'lia', depois: 1400, texto: 'Calma, Bruno... Eu pego o mapa que o encapuzado deixou na mesa e tento ler as runas que brilham nele.', esperado: { pericia: 'arcanismo', acao_impossivel: false } },
      ],
    },
    {
      titulo: 'A Ponte Guardada',
      falas: [
        { quem: 'bruno', depois: 1500, texto: 'Seguimos o mapa pela estrada até a Ponte de Pedra Velha.', esperado: { pericia: 'nenhuma', acao_impossivel: false } },
        { quem: 'lia', depois: 1400, texto: 'Digo pros guardas que somos mensageiros do Barão e que ele vai ficar furioso se a gente atrasar.', esperado: { pericia: 'persuasao', reacao_npc: 'desconfiado', acao_impossivel: false } },
        { quem: 'bruno', depois: 1400, texto: 'Pulo o rio inteiro de uma vez, sem corda nem nada. São só uns 30 metros.', esperado: { acao_impossivel: true } },
        { quem: 'bruno', depois: 1400, texto: 'Tá bom... então bato a espada no escudo e grito pro Tico, o guarda novinho, sair da frente!', esperado: { pericia: 'persuasao', reacao_npc: 'assustado', acao_impossivel: false } },
        { quem: 'bruno', depois: 1400, texto: 'O Gaspar não sai? Então avanço com a espada pra cima dele!', esperado: { pericia: 'combate', reacao_npc: 'hostil', acao_impossivel: false } },
        { quem: 'lia', depois: 1400, texto: 'Aproveito a confusão e, sem ninguém ver, examino a lateral da ponte procurando uma corda ou uma passagem escondida.', esperado: { pericia: 'percepcao', reacao_npc: 'indiferente', acao_impossivel: false } },
      ],
    },
  ],
};

// Responde com a Fonte — o Jev escolhe o trecho do manual que responde a pergunta; a resposta é o texto do próprio trecho, ou "não achei".
// Para adaptar: troque contexto.manual pelos trechos do seu documento (curtos, um assunto cada) e as conversas de exemplo.
const LIMIAR = 0.6; // abaixo desta confiança o assistente não cita: diz que não achou

export default {
  id: 'responde-com-fonte',
  titulo: 'Responde com a Fonte',
  emoji: '☕',
  categoria: 'construtores',
  ordem: 52,
  resumo: 'O cliente pergunta, o Jev escolhe o trecho do manual que responde e o assistente cita o texto exato, ou diz "não achei" em vez de inventar.',
  descricao: 'Assistente que responde de memória inventa com toda a confiança. Aqui o Jev só escolhe qual dos trechos do manual responde a pergunta (ou "nenhum"); a resposta é o texto do próprio trecho, com a seção. Pergunta fora do manual vira "não achei" e vai para uma pessoa.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'conversa',
  tema: { acento: '#9c6644', acento2: '#e9c38f' },
  origem: 'nosso Mini Cluely: 3 de 3 respostas com a frase da fonte',

  contexto: {
    produto: 'cafeteira espresso Cremova Barista B2 (marca fictícia)',
    manual: [
      { id: 's1_2', secao: '1.2', titulo: 'Primeiro uso', texto: 'Antes do primeiro café, encha o reservatório e faça dois ciclos só com água, sem pó, para limpar o circuito.' },
      { id: 's2_1', secao: '2.1', titulo: 'Moagem e dose', texto: 'Use café moído fino para espresso: 18 g no filtro duplo ou 9 g no simples. Pressione com o socador até o pó ficar nivelado.' },
      { id: 's2_4', secao: '2.4', titulo: 'Vaporizador de leite', texto: 'Gire o botão lateral para a esquerda para soltar o vapor. Depois de usar, limpe o bico com pano úmido e solte vapor por 2 segundos.' },
      { id: 's3_1', secao: '3.1', titulo: 'Luzes do painel', texto: 'Luz laranja piscando: reservatório vazio. Luz vermelha fixa: hora de descalcificar. Todas piscando juntas: desligue da tomada e chame a assistência.' },
      { id: 's3_3', secao: '3.3', titulo: 'Descalcificação', texto: 'A cada 3 meses, ou quando a luz vermelha acender, dissolva o sachê descalcificante em 1 litro de água e segure os dois botões por 5 segundos para iniciar o programa.' },
      { id: 's4_1', secao: '4.1', titulo: 'Café fraco ou aguado', texto: 'Causa provável: moagem grossa ou pouco pó. Use moagem mais fina, 18 g no filtro duplo, e pressione com mais firmeza.' },
      { id: 's4_2', secao: '4.2', titulo: 'Vazamento pelo porta-filtro', texto: 'Encaixe o porta-filtro até o fim, girando para a direita. Se continuar vazando, a borracha de vedação pode estar gasta: troque a cada 12 meses.' },
      { id: 's5_1', secao: '5.1', titulo: 'Capacidade e voltagem', texto: 'Reservatório de 1,8 litro. Existem versões 127 V e 220 V: confira a etiqueta embaixo da máquina antes de ligar na tomada.' },
      { id: 's5_3', secao: '5.3', titulo: 'Temperatura', texto: 'A água sai a 92 °C. Para aquecer as xícaras, deixe-as sobre a bandeja de cima da máquina por 10 minutos.' },
      { id: 's6_1', secao: '6.1', titulo: 'Garantia', texto: 'Garantia de 12 meses contra defeito de fabricação. Não cobre quebra por queda nem dano por falta de descalcificação.' },
    ],
  },

  decisoes: [
    {
      id: 'trecho', tipo: 'choice', papel: 'destaque', titulo: 'Trecho do manual',
      pergunta: 'Qual trecho do manual RESPONDE a pergunta atual do cliente? Regras: escolha um trecho só se o texto dele resolve o caso perguntado. Trecho do mesmo assunto que não resolve o caso NÃO serve (ex.: o cliente conta que uma peça parou de funcionar e o trecho só ensina a usar ou limpar essa peça) → "nenhum". Assunto que não está no manual → "nenhum".',
      // as opções saem do contexto: um trecho por opção + "nenhum"
      opcoes: (ctx) => [
        ...ctx.manual.map((t) => ({ id: t.id, rotulo: `§${t.secao} ${t.titulo}`, icone: '📖', desc: `seção ${t.secao} (${t.titulo}): "${t.texto}"` })),
        { id: 'nenhum', rotulo: 'Nenhum trecho', icone: '🚫', desc: 'nenhum trecho resolve o caso perguntado: o assunto não está no manual, ou o trecho do mesmo assunto não trata deste problema (ex.: defeito que o manual não cobre)' },
      ],
    },
    {
      id: 'sobre_o_produto', tipo: 'noul', titulo: 'Sobre a cafeteira', rotulo: 'sobre a cafeteira', icone: '☕', tom: 'bom', limiar: 0.5,
      rotuloSim: 'sim', rotuloNao: 'outro assunto',
      pergunta: 'A pergunta atual do cliente é sobre a cafeteira Cremova Barista B2 (uso, limpeza, peças, defeito, especificações ou garantia da máquina)?',
    },
  ],

  conversa: {
    skin: 'chat-site',
    titulo: 'Suporte Cremova',
    subtitulo: 'responde só com o manual da Barista B2',
    avatar: '☕',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🙋', lado: 'dir' },
      bot: { nome: 'Assistente Cremova', avatar: '☕', lado: 'esq' },
    },
    analisar: ['cliente'],
    voce: 'cliente',
    placeholder: 'Pergunte algo sobre a cafeteira (ex.: "qual a dose de café?")',
    abertura: 'Assistente com fonte: cada resposta cita um trecho do manual ou diz que não achou.',
    ritmo: 1.3,
    // o texto citado vem do contexto (o manual); o Jev só escolhe QUAL trecho
    responder(resp, fala, ctx) {
      const a = resp.trecho;
      const t = a && ctx.manual.find((x) => x.id === a.choice);
      const conf = a && a.probabilities ? a.probabilities[a.choice] || 0 : 0;
      if (t && conf >= LIMIAR) return { texto: `Segundo o manual, seção ${t.secao} (${t.titulo}): «${t.texto}»`, marca: `fonte: manual §${t.secao}` };
      if (resp.sobre_o_produto && resp.sobre_o_produto.noul >= 0.5) return { texto: 'Não achei isso no manual da Barista B2. Para não inventar, vou passar sua pergunta para o suporte técnico. 🛠️', marca: 'sem fonte → humano' };
      return { texto: 'Por aqui eu só respondo sobre a Barista B2, sempre com o manual como fonte. ☕', marca: 'fora do assunto' };
    },
  },

  roteiros: [
    {
      titulo: 'Dúvidas do dia a dia',
      falas: [
        { quem: 'cliente', texto: 'a luz laranja tá piscando, o que é isso?', depois: 1400, esperado: { trecho: 's3_1', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'meu café tá saindo aguado, parece chá 😕', depois: 1400, esperado: { trecho: 's4_1', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'de quanto em quanto tempo tem que descalcificar?', depois: 1400, esperado: { trecho: 's3_3', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'qual o melhor café pra comprar, tem alguma marca boa?', depois: 1400, esperado: { trecho: 'nenhum', sobre_o_produto: false } },
        { quem: 'cliente', texto: 'como eu faço pra esquentar as xícaras antes?', depois: 1400, esperado: { trecho: 's5_3', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'a garantia cobre se eu derrubar ela no chão?', depois: 1400, esperado: { trecho: 's6_1', sobre_o_produto: true } },
      ],
    },
    {
      titulo: 'Problema técnico',
      falas: [
        { quem: 'cliente', texto: 'primeira vez que vou usar, preciso fazer alguma coisa antes?', depois: 1400, esperado: { trecho: 's1_2', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'tá vazando água pela alça do porta-filtro', depois: 1400, esperado: { trecho: 's4_2', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'posso ligar ela numa tomada 220?', depois: 1400, esperado: { trecho: 's5_1', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'o vaporizador parou de soltar vapor do nada', depois: 1400, esperado: { trecho: 'nenhum', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'quantos graus a água sai?', depois: 1400, esperado: { trecho: 's5_3', sobre_o_produto: true } },
        { quem: 'cliente', texto: 'vcs vendem moedor também?', depois: 1400, esperado: { trecho: 'nenhum' } },
      ],
    },
  ],
};

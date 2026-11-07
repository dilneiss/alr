// Caçador de Cortes — lê a transcrição de um vídeo longo, trecho a trecho, e marca os melhores cortes para Shorts.
// Para adaptar: cole a transcrição do seu vídeo em trechos (inicio/fim em segundos + fala) e ajuste o contexto do canal.
export default {
  id: 'cacador-cortes',
  titulo: 'Caçador de Cortes',
  emoji: '✂️',
  categoria: 'vendas',
  ordem: 36,
  resumo: 'Lê a transcrição do vídeo longo trecho a trecho e marca na linha do tempo os melhores cortes para Shorts.',
  descricao: 'Cada trecho é avaliado de uma vez: é um bom corte ou depende do resto do vídeo? A primeira frase prende quem está rolando? Se sustenta sozinho? As estrelas na linha do tempo são os cortes que o Jev recomenda.',
  marcas: ['volume'],
  motor: 'fluxo',
  tema: { acento: '#ef4444', acento2: '#f59e0b' },

  contexto: {
    canal: 'canal de YouTube sobre IA aplicada a negócios, público brasileiro de donos de pequenas empresas',
    video: 'Live de 12 minutos: "Como montei um time de agentes de IA para a minha empresa"',
    objetivo: 'achar trechos de 20 a 60 segundos que funcionem sozinhos como Shorts',
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'Tipo de trecho',
      pergunta: 'Como este trecho do vídeo funciona como um Short?',
      opcoes: [
        { id: 'corte', rotulo: 'Bom corte', icone: '🎬', cor: '#ef4444', desc: 'história, número surpreendente, dica prática ou opinião forte que funciona sozinha' },
        { id: 'contexto', rotulo: 'Precisa de contexto', icone: '🧩', cor: '#6366f1', desc: 'explicação que só faz sentido com o resto do vídeo' },
        { id: 'enrolacao', rotulo: 'Enrolação', icone: '💤', cor: '#475569', desc: 'saudação, recado, pausa, repetição ou conversa sem conteúdo' },
        { id: 'publi', rotulo: 'Publi / chamada', icone: '📢', cor: '#f59e0b', desc: 'propaganda, pedido de inscrição, link na descrição' },
      ],
    },
    {
      id: 'gancho', tipo: 'score', titulo: 'Força do gancho',
      pergunta: 'Quão forte é a PRIMEIRA frase deste trecho para prender quem está rolando o feed?',
      niveis: [
        { rotulo: 'fraco', desc: 'ninguém para de rolar' },
        { rotulo: 'ok', desc: 'interessa a quem já gosta do tema' },
        { rotulo: 'forte', desc: 'curiosidade ou número que faz parar' },
        { rotulo: 'irresistível', desc: 'polêmica, revelação ou promessa concreta logo de cara' },
      ],
    },
    {
      id: 'sozinho', tipo: 'noul', titulo: 'Se sustenta sozinho', rotulo: 'funciona sozinho', icone: '🧱', tom: 'bom', limiar: 0.6,
      pergunta: 'Este trecho faz sentido para quem nunca viu o resto do vídeo?',
    },
  ],

  fluxo: {
    layout: 'linha',
    colunas: 'tipo',
    rotuloItem: 'Trecho',
    lote: 6,
    ritmo: 1100,
    linha: { titulo: 'Linha do tempo do vídeo (★ = corte recomendado)', inicio: 'inicio', fim: 'fim', duracao: 720, estrela: { decisao: 'gancho', minimo: 2, alerta: true } },
    cartao: { titulo: 'tempo', texto: 'fala' },
    entrada: { placeholder: 'Cole a fala de um trecho do seu vídeo e veja se vira corte…', botao: 'Avaliar trecho' },
    rotuloFeitos: 'trechos',
  },

  dados: [
    { id: 't1', inicio: 0, fim: 28, tempo: '0:00–0:28', fala: 'Fala pessoal, boa noite, sejam muito bem-vindos a mais uma live. Deixa eu ver se o áudio está bom… manda aí no chat de onde vocês estão.' },
    { id: 't2', inicio: 28, fim: 70, tempo: '0:28–1:10', fala: 'Seis meses atrás eu tinha quatro funcionários só respondendo WhatsApp. Hoje eu tenho um. E ninguém foi demitido. Vou mostrar exatamente como.' },
    { id: 't3', inicio: 70, fim: 115, tempo: '1:10–1:55', fala: 'Antes de começar, se você ainda não é inscrito, se inscreve e ativa o sininho, porque toda semana tem live nova aqui.' },
    { id: 't4', inicio: 115, fim: 170, tempo: '1:55–2:50', fala: 'O primeiro agente que eu criei foi o de triagem. Ele lê cada mensagem e decide se é venda, suporte ou financeiro. Isso sozinho tirou umas três horas por dia da equipe.' },
    { id: 't5', inicio: 170, fim: 220, tempo: '2:50–3:40', fala: 'Aí, voltando naquilo que eu falei lá no começo sobre a planilha, lembra que eu mostrei aquela aba? Então, é nela que entra essa parte.' },
    { id: 't6', inicio: 220, fim: 268, tempo: '3:40–4:28', fala: 'O erro que quase todo mundo comete: colocar o ChatGPT para responder cliente direto. Ele inventa política de troca, inventa prazo. Eu perdi um cliente grande assim.' },
    { id: 't7', inicio: 268, fim: 300, tempo: '4:28–5:00', fala: 'Hum… deixa eu só pegar uma água aqui. Pronto. Onde é que eu estava mesmo?' },
    { id: 't8', inicio: 300, fim: 352, tempo: '5:00–5:52', fala: 'Custo real disso tudo: menos de quarenta reais por mês. Quarenta reais. O que eu pagava antes num único funcionário dava para rodar isso por vinte anos.' },
    { id: 't9', inicio: 352, fim: 410, tempo: '5:52–6:50', fala: 'Então a configuração do segundo passo segue o mesmo esquema do primeiro, só que você troca aquele campo que eu mostrei e repete o processo.' },
    { id: 't10', inicio: 410, fim: 460, tempo: '6:50–7:40', fala: 'Esse curso que eu uso com a minha equipe está com desconto essa semana, o link está aqui embaixo na descrição, aproveita que acaba domingo.' },
    { id: 't11', inicio: 460, fim: 515, tempo: '7:40–8:35', fala: 'Sabe o que mais me assustou? Os clientes PREFEREM a resposta rápida. A nota de satisfação subiu de 7,8 para 9,1 em dois meses.' },
    { id: 't12', inicio: 515, fim: 570, tempo: '8:35–9:30', fala: 'Agora tem uma regra de ouro: o agente nunca decide sozinho o que custa dinheiro. Reembolso, desconto, cancelamento: ele prepara e um humano aprova.' },
    { id: 't13', inicio: 570, fim: 625, tempo: '9:30–10:25', fala: 'Bom, acho que é isso daquela parte, depois a gente volta nisso. Alguém perguntou ali no chat, deixa eu ler… não, essa eu respondo no final.' },
    { id: 't14', inicio: 625, fim: 680, tempo: '10:25–11:20', fala: 'Se eu tivesse que começar do zero amanhã, eu faria só uma coisa: automatizaria a triagem. É o agente mais fácil e o que mais devolve tempo.' },
    { id: 't15', inicio: 680, fim: 720, tempo: '11:20–12:00', fala: 'É isso, pessoal, obrigado pela presença, semana que vem tem mais. Um abraço e até a próxima!' },
  ],
};

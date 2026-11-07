// Pula-Publi do YouTube — lê a transcrição trecho a trecho, marca publi, autopromoção, abertura e encerramento, e soma o tempo pulável.
// Para adaptar: cole a transcrição do vídeo em trechos (inicio/fim em segundos + fala) e ajuste o contexto do canal.
const TRECHOS = [
  { id: 't1', inicio: 0, fim: 20, fala: '[vinheta] Fala, galera! Bem-vindos de volta ao Teste Sincero.', esperado: { tipo: 'abertura_encerramento', pular: true } },
  { id: 't2', inicio: 20, fim: 55, fala: 'Hoje eu passei 30 dias com o Sonora Air, um fone de R$ 199, pra ver se ele encara um de R$ 1.000. Spoiler: em uma coisa ele ganha.', esperado: { tipo: ['abertura_encerramento', 'conteudo'] } },
  { id: 't3', inicio: 55, fim: 110, fala: 'Mas antes, esse vídeo é patrocinado pelo Banco Trevo. Abrindo a conta pelo link da descrição você ganha 3 meses sem tarifa e cartão sem anuidade.', esperado: { tipo: 'publi', pular: true } },
  { id: 't4', inicio: 110, fim: 150, fala: 'E o app do Trevo separa os seus gastos por categoria sozinho. Link na descrição, cupom TESTE10. Valeu, Trevo!', esperado: { tipo: 'publi', pular: true } },
  { id: 't5', inicio: 150, fim: 230, fala: 'Bom, vamos ao fone. A caixa vem com três tamanhos de borracha, cabo USB-C e só. O estojo é fosco e não risca fácil, gostei.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't6', inicio: 230, fim: 310, fala: 'Bateria: medi com música no volume 60%. Deu 7 horas e 40 minutos no fone e mais umas três cargas no estojo.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't7', inicio: 310, fim: 345, fala: 'Se você tá curtindo, deixa o like e se inscreve, que isso ajuda demais o canal a crescer.', esperado: { tipo: 'autopromocao', pular: true } },
  { id: 't8', inicio: 345, fim: 420, fala: 'Som: o grave é forte, até demais em alguns estilos. Em podcast a voz fica um pouco abafada.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't9', inicio: 420, fim: 470, fala: 'Aliás, eu montei uma planilha com todos os fones que testei esse ano. Tá no meu Instagram, @testesincero, passa lá.', esperado: { tipo: 'autopromocao' } },
  { id: 't10', inicio: 470, fim: 540, fala: 'Chamada de vídeo: testei na rua com vento e do outro lado ouviram bem, mas o barulho do ônibus passou inteiro.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't11', inicio: 540, fim: 590, fala: 'E falando em barulho: sabe aquele barulhinho bom do dinheiro rendendo? No Trevo, o saldo rende 110% do CDI desde o primeiro dia. Link aí embaixo.', esperado: { tipo: 'publi', pular: true } },
  { id: 't12', inicio: 590, fim: 660, fala: 'Cancelamento de ruído: não espere milagre. Tira o zumbido do ar-condicionado, mas voz de gente passa.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't13', inicio: 660, fim: 720, fala: 'Pontos negativos: o app do fone trava às vezes e não tem equalizador. Pelo preço, dá pra perdoar.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't14', inicio: 720, fim: 760, fala: '[música de fundo] … opa, a câmera desligou, perai … pronto, voltei.', esperado: { tipo: 'outro', pular: true } },
  { id: 't15', inicio: 760, fim: 820, fala: 'Veredito: pra academia e ônibus, vale cada centavo. Pra quem passa o dia em chamada, eu pagaria mais.', esperado: { tipo: 'conteudo', pular: false } },
  { id: 't16', inicio: 820, fim: 855, fala: 'E se você quer aprender a editar vídeo do jeito que eu edito, meu curso Edição Sincera tá com 30% de desconto essa semana.', esperado: { tipo: 'autopromocao', pular: true } },
  { id: 't17', inicio: 855, fim: 880, fala: 'É isso, galera! Obrigado por assistir e até o próximo vídeo.', esperado: { tipo: 'abertura_encerramento', pular: true } },
  { id: 't18', inicio: 880, fim: 900, fala: '[tela final] Assista também: "Os 5 piores fones de 2026"', esperado: { tipo: ['autopromocao', 'abertura_encerramento'], pular: true } },
];

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export default {
  id: 'pula-publi',
  titulo: 'Pula-Publi do YouTube',
  emoji: '⏭️',
  categoria: 'vendas',
  ordem: 39,
  resumo: 'Lê a transcrição do vídeo trecho a trecho e marca na linha do tempo a publi, a autopromoção, a abertura e o encerramento, com o tempo que dá para pular.',
  descricao: 'Falar do produto testado é conteúdo; falar do banco que patrocina é publi, mesmo quando entra no meio de uma frase ("e falando em barulho…"). O Jev separa um do outro em cada trecho, as estrelas marcam a publi e o código soma quantos minutos dá para pular.',
  marcas: ['volume', 'lista fechada'],
  motor: 'fluxo',
  tema: { acento: '#8fd400', acento2: '#22d3ee' },

  contexto: {
    canal: 'Teste Sincero — canal de reviews de tecnologia (fictício)',
    video: '"Fone de R$ 199 vale a pena? Testei por 30 dias": review do fone Sonora Air, 15 minutos',
    quem_usa: 'quem quer assistir só ao conteúdo e pular o resto',
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'Tipo de trecho',
      pergunta: 'Que tipo de trecho é este? Regras: marca patrocinadora pagando (cupom, link do patrocinador, "patrocinado por", vantagens do produto do patrocinador) → publi, mesmo quando entra no meio de uma frase sobre o assunto; o criador divulgando a si mesmo (like, inscrição, rede social, outro vídeo, curso ou loja dele) → autopromoção; vinheta, saudação e despedida → abertura ou encerramento; falar do produto analisado no vídeo é conteúdo, não publi.',
      opcoes: [
        { id: 'conteudo', rotulo: 'Conteúdo', icone: '🎬', cor: '#22d3ee', desc: 'o assunto do vídeo: teste, explicação, opinião, prós e contras do produto analisado, veredito' },
        { id: 'publi', rotulo: 'Publi', icone: '💰', cor: '#f43f5e', desc: 'propaganda paga de uma marca patrocinadora: "patrocinado por", cupom, link do patrocinador, vantagens do produto do patrocinador' },
        { id: 'autopromocao', rotulo: 'Autopromoção', icone: '📣', cor: '#f59e0b', desc: 'o criador divulgando o próprio canal ou negócio: like, inscrição, sininho, Instagram, outro vídeo, curso ou loja dele' },
        { id: 'abertura_encerramento', rotulo: 'Abertura / encerramento', icone: '👋', cor: '#a78bfa', desc: 'vinheta, saudação de boas-vindas, despedida, "até o próximo vídeo"' },
        { id: 'outro', rotulo: 'Sem fala útil', icone: '⏸️', cor: '#64748b', desc: 'música, silêncio, erro de gravação ou fala cortada, sem conteúdo' },
      ],
    },
    {
      id: 'pular', tipo: 'noul', titulo: 'Pode pular', rotulo: 'pular', icone: '⏭️', tom: 'acento', limiar: 0.6,
      pergunta: 'Quem quer só o assunto do vídeo pode pular este trecho sem perder nada do conteúdo (teste, opinião, dica ou veredito sobre o produto analisado)?',
    },
  ],

  fluxo: {
    layout: 'linha',
    colunas: 'tipo',
    rotuloItem: 'Trecho da transcrição',
    lote: 4,
    ritmo: 5500,
    linha: { titulo: 'Linha do tempo do vídeo (★ = publi)', inicio: 'inicio', fim: 'fim', duracao: 900, estrela: { decisao: 'tipo', opcoes: ['publi'], alerta: true } },
    cartao: { titulo: 'tempo', texto: 'fala' },
    entrada: { placeholder: 'Cole a fala de um trecho de vídeo e veja se é publi…', botao: 'Avaliar trecho' },
    rotuloFeitos: 'trechos',
  },

  // o que vai para o Jev: a posição do trecho no vídeo (ajuda a ver abertura e encerramento) e a fala
  textoItem: (t) => `[${t.tempo} de 15:00] ${t.fala}`,

  // contas do código: a duração de cada trecho somada por tipo
  aoDecidir(item, resp, extra) {
    if (typeof item.inicio !== 'number') return;
    const dur = item.fim - item.inicio;
    extra.total = (extra.total || 0) + dur;
    if (resp.tipo && resp.tipo.choice === 'publi') extra.publi = (extra.publi || 0) + dur;
    if (resp.pular && resp.pular.noul >= 0.6) extra.pulavel = (extra.pulavel || 0) + dur;
  },
  resumoExtra: (extra) => [
    { rotulo: 'publi', valor: mmss(extra.publi || 0) },
    { rotulo: 'tempo pulável', valor: `${mmss(extra.pulavel || 0)} (${extra.total ? Math.round(((extra.pulavel || 0) / extra.total) * 100) : 0}%)` },
  ],

  dados: TRECHOS.map((t) => ({ ...t, tempo: `${mmss(t.inicio)}–${mmss(t.fim)}` })),
};

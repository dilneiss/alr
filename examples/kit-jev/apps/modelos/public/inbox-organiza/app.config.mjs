// Inbox que se Organiza — cada e-mail vai para a pilha certa, com urgência e "precisa de resposta?".
// Para adaptar: troque o contexto (o seu negócio), as opções de "tipo" (as suas pilhas) e os dados de exemplo.
export default {
  id: 'inbox-organiza',
  titulo: 'Inbox que se Organiza',
  emoji: '📬',
  categoria: 'atendimento',
  ordem: 10,
  resumo: 'Cada e-mail vai para a pilha certa, com urgência e "precisa de resposta?" — e só arquiva sozinho quando tem certeza.',
  descricao: 'O Jev lê cada e-mail que chega e decide o tipo, a urgência e se precisa de uma resposta escrita por alguém. O que vem com confiança baixa não é arquivado: vai para a pilha de revisão humana.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#4f8cff', acento2: '#22d3ee' },

  contexto: {
    empresa: 'Raiz Viva — loja online de cosméticos naturais (site + Instagram), 6 pessoas na equipe',
    quem_le: 'a dona da loja, que quer abrir a caixa de entrada e ver só o que precisa dela',
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'Pilha',
      pergunta: 'Em qual pilha da caixa de entrada da loja este e-mail deve ir?',
      opcoes: [
        { id: 'cliente', rotulo: 'Clientes', icone: '🛍️', cor: '#34d399', desc: 'cliente perguntando de pedido, entrega, troca, produto ou reclamando' },
        { id: 'venda', rotulo: 'Vendas e parcerias', icone: '🤝', cor: '#a78bfa', desc: 'pedido de orçamento, atacado, revenda, proposta de parceria ou influenciador' },
        { id: 'financeiro', rotulo: 'Financeiro', icone: '💳', cor: '#fbbf24', desc: 'boleto, nota fiscal, cobrança, pagamento, banco ou contador' },
        { id: 'fornecedor', rotulo: 'Fornecedores', icone: '📦', cor: '#60a5fa', desc: 'fornecedor de matéria-prima, embalagem, transportadora ou gráfica' },
        { id: 'arquivar', rotulo: 'Arquivar', icone: '🗂️', cor: '#6b7280', desc: 'newsletter, propaganda, notificação automática, spam ou algo que não exige ação' },
      ],
    },
    {
      id: 'urgencia', tipo: 'score', titulo: 'Urgência',
      pergunta: 'Quão urgente é tratar este e-mail?',
      niveis: [
        { rotulo: 'pode esperar', desc: 'nada acontece se ficar para a semana que vem' },
        { rotulo: 'hoje', desc: 'precisa de atenção ainda hoje' },
        { rotulo: 'agora', desc: 'prejuízo, cliente muito irritado, prazo vencendo ou risco de reclamação pública' },
      ],
    },
    {
      id: 'responder', tipo: 'noul', titulo: 'Precisa de resposta', rotulo: 'responder', icone: '✍️', tom: 'acento', limiar: 0.6,
      pergunta: 'Este e-mail precisa de uma resposta escrita por uma pessoa da loja (não basta ler ou arquivar)?',
    },
    {
      id: 'risco', tipo: 'noul', titulo: 'Risco de reclamação', rotulo: 'risco Reclame Aqui', icone: '🔥', tom: 'ruim', limiar: 0.55, alerta: true,
      pergunta: 'A pessoa ameaça reclamar em público (Reclame Aqui, Procon, redes sociais) ou pedir reembolso na justiça?',
    },
  ],

  fluxo: {
    colunas: 'tipo',
    rotuloItem: 'E-mail',
    lote: 6,
    ritmo: 1200,
    humano: { limiar: 0.7, rotulo: 'Revisão humana', icone: '🙋' },
    cartao: { titulo: 'assunto', subtitulo: 'de', texto: 'corpo', meta: 'hora' },
    entrada: { placeholder: 'Cole aqui um e-mail que você recebeu e veja para qual pilha ele vai…' },
    rotuloFeitos: 'e-mails',
  },

  dados: [
    { id: 'e1', de: 'Mariana Souza', hora: '07:58', avatar: '👩', assunto: 'Pedido #4821 não chegou', corpo: 'Comprei o kit de séruns dia 2 e o rastreio está parado há 9 dias em Curitiba. Era presente de aniversário pra minha mãe, que é sábado. Vocês conseguem me ajudar?' },
    { id: 'e2', de: 'Newsletter Shopify', hora: '08:03', avatar: '📰', assunto: '5 tendências de e-commerce para o fim do ano', corpo: 'Confira as novidades da plataforma e as tendências que vão dominar a Black Friday.' },
    { id: 'e3', de: 'Contabilidade Prado', hora: '08:10', avatar: '🧾', assunto: 'Guia do DAS de outubro', corpo: 'Segue em anexo a guia do DAS com vencimento dia 20. Qualquer dúvida estou à disposição.' },
    { id: 'e4', de: 'Rafael — Empório Verde', hora: '08:14', avatar: '🏪', assunto: 'Revenda na nossa loja de Campinas', corpo: 'Olá! Temos 3 lojas de produtos naturais em Campinas e gostaríamos de revender a linha de shampoos sólidos. Vocês trabalham com tabela de atacado?' },
    { id: 'e5', de: 'Juliana Prates', hora: '08:20', avatar: '😡', assunto: 'ABSURDO', corpo: 'Terceira vez que mando e-mail e ninguém responde. O hidratante veio vazando e manchou a caixa toda. Se não resolverem até amanhã vou abrir reclamação no Reclame Aqui e no Procon.' },
    { id: 'e6', de: 'Embalagens Lótus', hora: '08:31', avatar: '📦', assunto: 'Atraso na entrega dos frascos âmbar', corpo: 'Informamos que o lote de 2.000 frascos âmbar 30 ml terá atraso de 5 dias úteis por falta de matéria-prima.' },
    { id: 'e7', de: 'Banco Inter', hora: '08:40', avatar: '🏦', assunto: 'Seu extrato mensal está disponível', corpo: 'O extrato da sua conta PJ referente a setembro já está disponível no app.' },
    { id: 'e8', de: 'Camila Rocha (@camilanatural)', hora: '08:52', avatar: '🤳', assunto: 'Parceria — 180 mil seguidores', corpo: 'Oi! Amo a marca. Faço conteúdo sobre skincare natural e queria propor uma parceria: 3 reels + 6 stories. Posso mandar meu mídia kit?' },
    { id: 'e9', de: 'Pedro Henrique', hora: '09:05', avatar: '🧔', assunto: 'O sabonete de argila serve para pele oleosa?', corpo: 'Tenho a pele bem oleosa e fico com medo de ressecar. Qual vocês indicam?' },
    { id: 'e10', de: 'Correios', hora: '09:12', avatar: '📮', assunto: 'Objeto aguardando retirada', corpo: 'O objeto BR123456789 está aguardando retirada na agência por endereço incompleto. Prazo de 7 dias.' },
    { id: 'e11', de: 'Gráfica Ponto Certo', hora: '09:20', avatar: '🖨️', assunto: 'Prova das etiquetas novas', corpo: 'Segue a prova digital das etiquetas da linha capilar. Precisamos da aprovação até quinta para não atrasar a produção.' },
    { id: 'e12', de: 'Sicredi', hora: '09:27', avatar: '💳', assunto: 'Boleto vencido — Fornecedor Lótus', corpo: 'O boleto de R$ 4.380,00 venceu ontem. Após 5 dias o título será enviado a protesto.' },
    { id: 'e13', de: 'LinkedIn', hora: '09:33', avatar: '🔔', assunto: 'Você apareceu em 12 pesquisas esta semana', corpo: 'Veja quem está olhando o seu perfil.' },
    { id: 'e14', de: 'Ana Clara', hora: '09:41', avatar: '👩‍🦱', assunto: 'Troca de tamanho', corpo: 'Comprei o óleo de 30 ml mas queria o de 100 ml. Posso trocar pagando a diferença?' },
    { id: 'e15', de: 'Distribuidora Nordeste Natural', hora: '09:50', avatar: '🚚', assunto: 'Pedido de 600 unidades', corpo: 'Queremos fechar um pedido de 600 unidades do kit viagem para dezembro. Conseguem nos enviar condições e prazo até sexta?' },
    { id: 'e16', de: 'Notificação do sistema', hora: '09:58', avatar: '⚙️', assunto: 'Backup concluído', corpo: 'O backup automático da loja foi concluído com sucesso.' },
    { id: 'e17', de: 'Lucas Martins', hora: '10:05', avatar: '🙂', assunto: 'Re: dúvida', corpo: 'Ok, obrigado!' },
    { id: 'e18', de: 'Transportadora Rápida Sul', hora: '10:12', avatar: '🚛', assunto: 'Nova tabela de frete a partir de novembro', corpo: 'Comunicamos reajuste de 8% na tabela de frete fracionado a partir de 01/11.' },
    { id: 'e19', de: 'Beatriz Lima', hora: '10:20', avatar: '👵', assunto: 'Alergia', corpo: 'Usei o creme de calêndula e fiquei com a pele vermelha e coçando. Isso é normal? O que eu faço?' },
    { id: 'e20', de: 'Receita Federal', hora: '10:31', avatar: '🏛️', assunto: 'Pendência na declaração', corpo: 'Identificamos divergência na declaração do Simples Nacional. Regularize em até 30 dias para evitar multa.' },
    { id: 'e21', de: 'Marketplace Beleza+', hora: '10:44', avatar: '🛒', assunto: 'Convite para vender na Beleza+', corpo: 'Sua marca foi selecionada para vender no nosso marketplace com comissão reduzida no primeiro trimestre.' },
    { id: 'e22', de: 'Felipe (cliente)', hora: '10:52', avatar: '🧑', assunto: 'Cupom não funcionou', corpo: 'Tentei usar o cupom PRIMEIRA10 e deu inválido. Já finalizei a compra sem desconto. Dá pra estornar a diferença?' },
  ],
};

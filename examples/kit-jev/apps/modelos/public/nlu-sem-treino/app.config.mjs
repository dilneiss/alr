// NLU sem Treino — o cliente escreve do jeito dele (com gíria) e o Jev escolhe a intenção entre 12 escritas em português, sem treinar nada.
// Para adaptar: troque INTENCOES pelas intenções do SEU bot (1 ou 2 frases de descrição cada) e as respostas do painel.
const LIMIAR = 0.6; // abaixo disto o bot pergunta antes de agir, em vez de chutar

const INTENCOES = [
  { id: 'saldo_extrato', rotulo: 'Saldo e extrato', icone: '💰', desc: 'quer saber quanto tem na conta, ver o extrato ou as últimas movimentações', bot: 'Seu saldo e as últimas movimentações estão aqui embaixo. 👇' },
  { id: 'pix_enviar', rotulo: 'Fazer um Pix', icone: '💸', desc: 'quer mandar dinheiro para alguém por Pix ou transferência', bot: 'Bora fazer o Pix! Para quem e qual valor?' },
  { id: 'pix_chave', rotulo: 'Chave Pix', icone: '🔑', desc: 'quer cadastrar, trocar, apagar ou consultar a própria chave Pix (CPF, celular, e-mail ou aleatória)', bot: 'Abrindo as suas chaves Pix.' },
  { id: 'cartao_bloquear', rotulo: 'Bloquear cartão', icone: '🔒', desc: 'cartão perdido, roubado, esquecido em algum lugar ou com suspeita de clonagem: quer bloquear ou travar o cartão', bot: 'Vou bloquear o seu cartão agora. É só confirmar com a sua senha. 🔒' },
  { id: 'cartao_limite', rotulo: 'Limite do cartão', icone: '📈', desc: 'quer saber o limite do cartão de crédito ou pedir mais limite', bot: 'Este é o seu limite. Quer pedir um aumento?' },
  { id: 'fatura', rotulo: 'Fatura do cartão', icone: '🧾', desc: 'quer ver, pagar, adiantar ou parcelar a fatura do cartão de crédito, ou saber quando ela vence', bot: 'Abrindo a fatura: dá para pagar, adiantar ou parcelar.' },
  { id: 'pagar_conta', rotulo: 'Pagar boleto ou conta', icone: '📄', desc: 'quer pagar um boleto ou uma conta de luz, água, internet ou imposto, ou agendar um pagamento', bot: 'Aponte a câmera para o código de barras.' },
  { id: 'contestar_compra', rotulo: 'Compra não reconhecida', icone: '⚠️', desc: 'apareceu compra, cobrança ou débito que a pessoa não fez ou não reconhece; quer contestar ou pedir o dinheiro de volta', bot: 'Vamos contestar. Qual compra você não reconhece?' },
  { id: 'emprestimo', rotulo: 'Empréstimo', icone: '🏦', desc: 'quer simular, pedir ou saber as condições de um empréstimo ou crédito pessoal', bot: 'Abrindo o simulador de empréstimo.' },
  { id: 'investir', rotulo: 'Investimentos', icone: '📊', desc: 'quer guardar, aplicar ou resgatar dinheiro, ou ver quanto rendeu (caixinha, CDB, poupança)', bot: 'Seus investimentos e quanto renderam estão aqui.' },
  { id: 'cadastro', rotulo: 'Atualizar cadastro', icone: '🪪', desc: 'quer mudar endereço, telefone, e-mail, nome social ou a senha de acesso ao app', bot: 'Abrindo os seus dados de cadastro.' },
  { id: 'encerrar_conta', rotulo: 'Encerrar a conta', icone: '🚪', desc: 'quer fechar, cancelar ou encerrar a conta no banco', bot: 'Que pena! Antes de encerrar, posso entender o que aconteceu?' },
  { id: 'nao_entendi', rotulo: 'Não entendi', icone: '🤷', desc: 'só cumprimento, agradecimento ou conversa sem pedido; pedido fora dos serviços do banco; ou texto confuso demais para saber o que a pessoa quer', bot: 'Opa! Em que posso ajudar: saldo, Pix, cartão ou fatura?' },
];

const minuscula = (s) => s.charAt(0).toLowerCase() + s.slice(1); // "Fazer um Pix" → "fazer um Pix"
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'nlu-sem-treino',
  titulo: 'NLU sem Treino',
  emoji: '🗨️',
  categoria: 'construtores',
  ordem: 59,
  resumo: 'Escreva as intenções do seu bot em português e pronto: o Jev entende o cliente com gíria e erro de digitação, sem treinar nada.',
  descricao: 'Em vez de centenas de frases de treino por intenção, as 12 intenções de um banco digital são só descrições em português, e o Jev escolhe a certa enquanto o cliente digita. Com confiança baixa o bot pergunta em vez de chutar, e golpe ou cliente furioso vão direto para uma pessoa.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#2aa7df', acento2: '#fbbf24' },
  origem: 'medido por terceiros: roteador só com rótulos acertou 66,7%; com duas frases de descrição por opção, 97,5%',

  contexto: {
    banco: 'Banco Tucano, banco digital fictício: conta, Pix, cartão de crédito, empréstimo e investimentos pelo app',
    canal: 'chat do app; os clientes escrevem do jeito que falam, com gíria, abreviação e erro de digitação',
  },

  aovivo: {
    skin: 'chat',
    campo: 'mensagem',
    janela: 'Chat do Banco Tucano · você é o cliente',
    rotulo: 'Mensagem do cliente',
    placeholder: 'Escreva como um cliente escreveria, ex.: "perdi meu cartão, trava aí"…',
    dica: 'A intenção muda enquanto você digita: o Jev reavalia a cada pausa.',
    digitar: true,
    velocidade: 1.1,
    pausa: 3600,
  },

  decisoes: [
    {
      id: 'intencao', tipo: 'choice', papel: 'destaque', titulo: 'Intenção',
      pergunta: 'Qual é a intenção principal da mensagem do cliente no chat do banco? Se a mensagem não tem pedido de serviço do banco, ou se não dá para saber o que a pessoa quer, escolha nao_entendi.',
      opcoes: INTENCOES.map((i) => ({ id: i.id, rotulo: i.rotulo, icone: i.icone, desc: i.desc })),
    },
    {
      id: 'precisa_humano', tipo: 'noul', papel: 'alerta', titulo: 'Atendente humano', rotulo: 'precisa de uma pessoa', icone: '🙋', limiar: 0.5,
      mensagem: 'Passar para um atendente humano agora', mensagemOk: 'O bot resolve sozinho',
      pergunta: 'Esta mensagem deve ir para um atendente humano agora? Sim se a pessoa pede para falar com uma pessoa, está muito irritada ou ameaça reclamar, ou conta de um golpe acontecendo (alguém pedindo código, senha ou dinheiro). Não se é um pedido comum que o app resolve sozinho.',
    },
  ],

  // painel do topo: o que o bot responde (texto nosso, escolhido pela intenção e pelo limiar)
  render(r) {
    const resp = (r && r.respostas) || {};
    const a = resp.intencao;
    if (!a) return '';
    const conf = (a.probabilities || {})[a.choice] || 0;
    const it = INTENCOES.find((x) => x.id === a.choice) || INTENCOES[INTENCOES.length - 1];
    const humano = resp.precisa_humano && resp.precisa_humano.noul >= 0.5;
    let fala = it.bot;
    let nota = a.choice === 'nao_entendi' ? 'mensagem sem pedido: o bot puxa a conversa' : `confiança de ${Math.round(conf * 100)}%: o bot age sozinho`;
    if (conf < LIMIAR) {
      // na dúvida, o bot pergunta usando as 2 intenções mais prováveis (fora "não entendi")
      const duas = Object.entries(a.probabilities || {}).filter(([k]) => k !== 'nao_entendi').sort((x, y) => y[1] - x[1]).slice(0, 2)
        .map(([k]) => minuscula((INTENCOES.find((x) => x.id === k) || { rotulo: k }).rotulo));
      fala = `Só para eu entender direito: é sobre ${duas.join(' ou ')}?`;
      nota = `confiança de ${Math.round(conf * 100)}%, abaixo de ${Math.round(LIMIAR * 100)}%: o bot pergunta antes de agir`;
    }
    if (humano) { fala = `Já chamei uma pessoa da nossa equipe para falar com você. 🙋 ${it.id === 'nao_entendi' ? '' : '(assunto: ' + minuscula(it.rotulo) + ')'}`; nota = 'o Jev pediu um atendente humano'; }
    return `<div class="mj-widget mj-painel-box"><h4>Resposta do bot <span class="tp">${esc(it.icone)} ${esc(it.rotulo)}</span></h4>`
      + `<div style="padding:11px 14px;border-radius:16px 16px 16px 4px;background:color-mix(in srgb, var(--mj-acento) 14%, var(--mj-card));border:1px solid color-mix(in srgb, var(--mj-acento) 35%, transparent);font-size:14.5px;line-height:1.45">🐦 ${esc(fala.trim())}</div>`
      + `<p class="dim" style="margin:8px 0 0;font-size:12.5px">${esc(nota)}</p></div>`;
  },

  exemplos: [
    { titulo: 'Cartão perdido', texto: 'mano perdi meu cartão no rolê ontem, trava ele aí pfv', esperado: { intencao: 'cartao_bloquear', precisa_humano: false } },
    { titulo: 'Fatura salgada', texto: 'a fatura veio salgada demais, rola parcelar?', esperado: { intencao: 'fatura', precisa_humano: false } },
    // ambíguo de propósito: não há intenção "Pix não recebido", então a confiança cai e o bot pergunta
    { titulo: 'Pix que não caiu', texto: 'o pix q eu mandei ontem n caiu ainda', esperado: { precisa_humano: false } },
    { titulo: 'Compra estranha', texto: 'brotou uma compra de 1.200 conto q eu nunca fiz!! to pistola, quero falar com gente de verdade', esperado: { intencao: 'contestar_compra', precisa_humano: true } },
    { titulo: 'Só um oi', texto: 'eae blz? só passando msm kkk', esperado: { intencao: 'nao_entendi', precisa_humano: false } },
  ],
};

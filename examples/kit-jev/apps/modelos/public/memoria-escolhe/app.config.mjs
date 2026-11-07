// Memória que Escolhe o que Guardar — a cada mensagem o Jev decide se vale lembrar, que tipo de lembrança é e se é dado sensível.
// Para adaptar: troque as regras da memória (contexto.regras), os tipos de memória (TIPOS) e as conversas de exemplo.
const TIPOS = [
  { id: 'fato_pessoal', rotulo: 'Fato pessoal', icone: '🏠', desc: 'fato estável da vida da pessoa: profissão, negócio, cidade, família, pet, aniversário, alergia' },
  { id: 'tarefa_pendente', rotulo: 'Tarefa pendente', icone: '📌', desc: 'algo que ainda vai acontecer e não pode ser esquecido: encomenda, entrega, compromisso, pagamento, "me lembra de…", com ou sem prazo' },
  { id: 'nada', rotulo: 'Nada a guardar', icone: '💬', desc: 'nada para o futuro: cumprimento, agradecimento, elogio, pergunta pontual, desabafo ou comentário do momento' },
  { id: 'preferencia', rotulo: 'Preferência', icone: '⭐', desc: 'gosto ou jeito de trabalhar da pessoa: como quer ser chamada, formato das respostas, horários, o que ama ou odeia ("prefiro…", "odeio…", "sempre…")' },
];

const curto = (s, n = 80) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const cartao = (texto, marca) => ({ texto, quem: '__sistema', classe: 'sistema', marca });

export default {
  id: 'memoria-escolhe',
  titulo: 'Memória que Escolhe o que Guardar',
  emoji: '🧠',
  categoria: 'construtores',
  ordem: 49,
  resumo: 'A cada mensagem, o Jev decide em ~0,3 s se vale guardar na memória do assistente, que tipo de lembrança é e se é dado sensível.',
  descricao: 'Assistente que guarda tudo vira um depósito de lixo; o que não guarda nada irrita. Aqui o Jev julga cada mensagem do usuário (preferência, fato pessoal, tarefa pendente ou nada) e segura senha, documento e saúde até a pessoa autorizar, sem esperar um LLM pensar por 3 segundos.',
  marcas: ['imediato', 'volume'],
  motor: 'conversa',
  tema: { acento: '#c4377f', acento2: '#9d8cf0' },
  origem: 'comunidade: Jevmem (98,5% de acerto em 0,30 s, contra 2,8–4,3 s dos LLMs)',

  contexto: {
    assistente: 'Lume, assistente pessoal de IA da Bia, confeiteira que vende bolos e doces por encomenda; a memória dura de uma conversa para outra',
    regras: 'Vale guardar o que continuará útil nas próximas conversas: gosto ou jeito de trabalhar, fato estável da vida da pessoa, tarefa ou prazo que ainda vai acontecer. Não vale guardar: cumprimento, agradecimento, elogio, pergunta pontual, comentário do momento. Dado sensível (senha, número de documento ou cartão, saúde, dívida, salário ou saldo) só entra na memória com autorização da pessoa.',
  },
  editavel: {
    campo: 'regras',
    rotulo: 'Regras da memória (o Jev lê isto a cada mensagem)',
    botao: 'Regras',
    ajuda: 'Teste: acrescente "nunca guarde nada sobre clientes" e mande "a Dona Lúcia odeia coentro".',
  },

  decisoes: [
    {
      id: 'lembrar', tipo: 'noul', papel: 'contador', titulo: 'Vale lembrar', rotulo: 'vale lembrar', icone: '🧠', tom: 'bom', limiar: 0.5,
      rotuloSim: 'guardar', rotuloNao: 'não guardar',
      pergunta: 'Seguindo À RISCA as regras da memória (contexto.regras), a fala atual do usuário deve ser guardada para as PRÓXIMAS conversas? Se as regras mandam não guardar aquele tipo de coisa, a resposta é não.',
    },
    {
      id: 'tipo', tipo: 'choice', papel: 'destaque', titulo: 'Tipo de memória',
      pergunta: 'Que tipo de memória a fala atual do usuário representa?',
      opcoes: TIPOS.map((t) => ({ id: t.id, rotulo: t.rotulo, icone: t.icone, desc: t.desc })),
    },
    {
      id: 'sensivel', tipo: 'noul', papel: 'contador', titulo: 'Sensíveis seguradas', rotulo: 'dado sensível', icone: '🔒', tom: 'ruim', limiar: 0.5, alerta: true,
      rotuloSim: 'sensível', rotuloNao: 'não',
      pergunta: 'A fala atual do usuário traz dado sensível que não pode ir para a memória sem autorização: senha ou código de acesso, número de documento (CPF, RG) ou de cartão, informação de saúde (doença, alergia, remédio), dívida, salário ou saldo bancário?',
    },
  ],

  conversa: {
    skin: 'chat-site',
    titulo: 'Lume · assistente da Bia',
    subtitulo: 'memória de longo prazo: o Jev decide o que fica',
    avatar: '✨',
    participantes: {
      usuario: { nome: 'Bia', avatar: '👩‍🍳', lado: 'dir' },
      assistente: { nome: 'Lume', avatar: '✨', lado: 'esq' },
    },
    analisar: ['usuario'],
    voce: 'usuario',
    respondeComo: 'assistente',
    placeholder: 'Escreva como a Bia (ex.: "meu aniversário é dia 3 de maio")',
    abertura: 'Memória ligada: cada mensagem passa pelo Jev antes de ir para a memória.',
    tituloPlacar: 'Memória',
    ritmo: 1.15,
    // o Jev só decide; o cartão de memória é montado aqui, com o texto da própria pessoa
    responder(resp, fala, ctx, estado) {
      const lembrar = resp.lembrar && resp.lembrar.noul >= 0.5;
      const sensivel = resp.sensivel && resp.sensivel.noul >= 0.5;
      const tipo = TIPOS.find((t) => t.id === (resp.tipo && resp.tipo.choice));
      if (sensivel) {
        estado.seguradas = (estado.seguradas || 0) + 1;
        const mascarado = curto(fala.texto).replace(/\d/g, '•'); // o código mascara os números antes de mostrar
        if (lembrar) return cartao(`🔒 Dado sensível: «${mascarado}» fica fora da memória até você autorizar.`, 'pede autorização');
        return cartao('🔒 Dado sensível: fica só nesta conversa, não vai para a memória.', 'protegido');
      }
      if (lembrar) {
        (estado.memorias ||= []).push({ tipo: tipo ? tipo.id : 'outro', texto: fala.texto });
        const rot = tipo && tipo.id !== 'nada' ? `${tipo.icone} ${tipo.rotulo.toLowerCase()}` : 'lembrança';
        return cartao(`🧠 Guardei: «${curto(fala.texto)}»`, rot);
      }
      return cartao('💬 nada para guardar');
    },
  },

  roteiros: [
    {
      titulo: 'Primeira conversa',
      falas: [
        { quem: 'usuario', texto: 'oi Lume, bom diaa ☀️', esperado: { lembrar: false, tipo: 'nada', sensivel: false } },
        { quem: 'assistente', texto: 'Bom dia! Em que posso ajudar hoje?', fixa: true },
        { quem: 'usuario', texto: 'pode me chamar de Bia, ninguém me chama de Beatriz kkkk', esperado: { lembrar: true, tipo: 'preferencia', sensivel: false } },
        { quem: 'assistente', texto: 'Combinado, Bia! 😄', fixa: true },
        { quem: 'usuario', texto: 'tenho uma confeitaria em Curitiba, faço bolo e doce por encomenda', esperado: { lembrar: true, tipo: 'fato_pessoal', sensivel: false } },
        { quem: 'assistente', texto: 'Que delícia de negócio! Como posso ajudar com as encomendas?', fixa: true },
        { quem: 'usuario', texto: 'me responde sempre curtinho, em tópicos, sem textão pfv', esperado: { lembrar: true, tipo: 'preferencia', sensivel: false } },
        { quem: 'assistente', texto: 'Entendido: curto e direto. ✍️', fixa: true },
        { quem: 'usuario', texto: 'quantos brigadeiros rende uma lata de leite condensado?', esperado: { lembrar: false, tipo: 'nada', sensivel: false } },
        { quem: 'assistente', texto: 'Uns 25 a 30, de 15 g cada. 🍫', fixa: true },
        { quem: 'usuario', texto: 'ah, me lembra de comprar as caixinhas de presente até quinta', esperado: { lembrar: true, tipo: 'tarefa_pendente', sensivel: false } },
      ],
    },
    {
      titulo: 'Dado sensível',
      falas: [
        { quem: 'usuario', texto: 'Lume, sou alérgica a camarão, nunca me sugere receita com frutos do mar', esperado: { lembrar: true, sensivel: true } },
        { quem: 'assistente', texto: 'Pode deixar: nada de frutos do mar nas sugestões de hoje.', fixa: true },
        { quem: 'usuario', texto: 'meu CPF é 123.456.789-00, usa pra preencher a nota do fornecedor', esperado: { sensivel: true } },
        { quem: 'assistente', texto: 'Preenchi a nota com esse CPF. ✅', fixa: true },
        { quem: 'usuario', texto: 'a Dona Lúcia encomendou um bolo de 3 andares pro casamento da filha, dia 14/11', esperado: { lembrar: true, tipo: 'tarefa_pendente', sensivel: false } },
        { quem: 'assistente', texto: 'Que encomenda linda! Quer que eu monte a lista de ingredientes?', fixa: true },
        { quem: 'usuario', texto: 'odeio marcar entrega depois das 18h, sempre sugere de manhã', esperado: { lembrar: true, tipo: 'preferencia', sensivel: false } },
        { quem: 'assistente', texto: 'Certo, entregas de manhã.', fixa: true },
        { quem: 'usuario', texto: 'aff, tô devendo uns 3 mil no cartão, mês difícil 😩', esperado: { sensivel: true } },
        { quem: 'assistente', texto: 'Força, Bia! 💜 Quer ajuda para rever o preço dos bolos?', fixa: true },
        { quem: 'usuario', texto: 'kkk obrigada, tu é um amor', esperado: { lembrar: false, tipo: 'nada', sensivel: false } },
      ],
    },
  ],
};

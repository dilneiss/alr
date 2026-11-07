// FAQ que Não Inventa — o chat do site só responde com o texto do seu FAQ; o que não está lá vai para uma pessoa.
// Para adaptar: troque a escola, as perguntas e respostas do FAQ (o "cobre" diz o que cada uma responde) e o LIMIAR.
const FAQ = [
  { id: 'preco_pagamento', titulo: 'Preço e pagamento', icone: '💳', pergunta: 'Quanto custa e como posso pagar?', cobre: 'preço do curso, Pix, boleto, cartão, parcelamento', resposta: 'O curso completo custa R$ 497 à vista no Pix ou no boleto, ou em até 12x de R$ 49,70 no cartão.' },
  { id: 'garantia', titulo: 'Garantia', icone: '🛡️', pergunta: 'Posso pedir o dinheiro de volta?', cobre: 'garantia, reembolso, desistência, arrependimento', resposta: 'Pode sim: você tem 7 dias de garantia a partir da compra. É só pedir pelo e-mail suporte@pontodevirada.com.br e devolvemos 100% do valor.' },
  { id: 'certificado', titulo: 'Certificado', icone: '🎓', pergunta: 'O curso tem certificado?', cobre: 'certificado e carga horária', resposta: 'Tem! Ao concluir todas as aulas e a prova final, você baixa na área do aluno o certificado digital de 40 horas.' },
  { id: 'tempo_acesso', titulo: 'Tempo de acesso', icone: '⏳', pergunta: 'Por quanto tempo tenho acesso?', cobre: 'validade do acesso e o que acontece quando ele vence', resposta: 'O acesso vale por 2 anos a partir da compra, com todas as atualizações. Depois dá para renovar por mais 1 ano por R$ 97, sem perder o seu progresso.' },
  { id: 'formato', titulo: 'Aulas gravadas', icone: '🎬', pergunta: 'As aulas são ao vivo ou gravadas?', cobre: 'aulas gravadas, monitoria ao vivo, horários', resposta: 'As aulas são gravadas: você assiste quando quiser. Toda quinta, às 19h, tem uma monitoria ao vivo opcional, que também fica gravada.' },
  { id: 'requisitos', titulo: 'Pré-requisitos', icone: '🧰', pergunta: 'Preciso saber alguma coisa antes? Que computador preciso?', cobre: 'começar do zero, nível iniciante, computador, versão do Excel, celular', resposta: 'Não precisa saber nada de Excel: o curso começa do zero. Você só precisa de um computador com Excel 2016 ou mais novo (ou Microsoft 365). Pelo celular não dá para fazer os exercícios.' },
  { id: 'senha', titulo: 'Senha e login', icone: '🔑', pergunta: 'Esqueci a senha ou não consigo entrar', cobre: 'login, senha errada, acesso bloqueado', resposta: 'Na tela de login, clique em "Esqueci minha senha" e use o e-mail da compra. Se o e-mail não chegar em 10 minutos, olhe a caixa de spam.' },
  { id: 'duvidas', titulo: 'Tirar dúvidas', icone: '💬', pergunta: 'Como tiro dúvidas sobre as aulas?', cobre: 'dúvida sobre o conteúdo das aulas, monitores, comentários', resposta: 'Embaixo de cada aula tem um campo de comentários, e os monitores respondem em até 1 dia útil. Na monitoria de quinta também dá para perguntar ao vivo.' },
  { id: 'nota_fiscal', titulo: 'Nota fiscal', icone: '🧾', pergunta: 'Vocês emitem nota fiscal?', cobre: 'nota fiscal no CPF ou no CNPJ', resposta: 'Sim. A nota fiscal chega no e-mail da compra em até 7 dias. Para sair no CNPJ, preencha os dados da empresa no checkout.' },
  { id: 'empresas', titulo: 'Empresas e equipes', icone: '🏢', pergunta: 'Tem condição para empresas e equipes?', cobre: 'desconto para grupo ou equipe da mesma empresa', resposta: 'A partir de 5 alunos da mesma empresa o desconto é de 20%, com um painel para o gestor acompanhar o progresso. Peça a proposta em empresas@pontodevirada.com.br.' },
  { id: 'conteudo', titulo: 'O que vou aprender', icone: '📚', pergunta: 'O que eu vou aprender no curso?', cobre: 'módulos e programa do curso de Excel e Power BI', resposta: 'São 8 módulos: do básico do Excel a tabelas dinâmicas, PROCX, painéis e Power BI, com planilhas de exercício para baixar.' },
  { id: 'transferir', titulo: 'Trocar e-mail', icone: '🔁', pergunta: 'Posso trocar o e-mail de acesso ou passar o curso para outra pessoa?', cobre: 'trocar o e-mail de login, transferir ou compartilhar o acesso', resposta: 'Dá para trocar o e-mail de acesso uma vez, pelo suporte. O acesso é pessoal: não pode ser passado nem compartilhado com outra pessoa.' },
];
const LIMIAR = 0.6; // abaixo disso o bot não arrisca: passa para uma pessoa

export default {
  id: 'faq-nao-inventa',
  titulo: 'FAQ que Não Inventa',
  emoji: '📗',
  categoria: 'atendimento',
  ordem: 12,
  resumo: 'O chat do site responde só com o texto do seu FAQ, palavra por palavra, e passa para uma pessoa o que não está lá.',
  descricao: 'A cada pergunta, o Jev escolhe qual resposta do FAQ responde de verdade, ou "nenhuma". Acima de 60% de confiança, o chat mostra o texto oficial; abaixo disso, chama a equipe. Como quem escreve é o seu FAQ, não existe prazo, preço ou promessa inventada.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'conversa',
  tema: { acento: '#6366f1', acento2: '#2dd4bf' },
  origem: 'comunidade: Sayora — 88% de acerto contra 70% da busca por embeddings',

  contexto: {
    escola: 'Escola Ponto de Virada — cursos online de Excel e Power BI para quem trabalha em pequenas empresas',
    faq: FAQ.map((f) => ({ id: f.id, pergunta: f.pergunta, resposta: f.resposta })),
  },

  decisoes: [
    {
      id: 'resposta', tipo: 'choice', papel: 'destaque', titulo: 'Resposta do FAQ',
      pergunta: 'Qual resposta do FAQ da escola (contexto.faq) responde DE VERDADE ao que o aluno pergunta na fala atual? Escolha "nenhuma" se o assunto não está no FAQ ou se a resposta do FAQ não responde exatamente o que ele quer saber. Nunca escolha uma resposta só porque o assunto é parecido.',
      opcoes: () => [
        ...FAQ.map((f) => ({ id: f.id, rotulo: f.titulo, icone: f.icone, desc: `${f.pergunta} (${f.cobre})` })),
        { id: 'nenhuma', rotulo: 'Não está no FAQ', icone: '🙅', desc: 'nenhum item do FAQ responde: outro curso, serviço sob encomenda, aula presencial, ou um detalhe que o FAQ não traz' },
      ],
    },
    {
      id: 'quer_humano', tipo: 'noul', papel: 'checklist', titulo: 'Pediu uma pessoa', rotuloSim: 'chamar a equipe', rotuloNao: 'não pediu', limiar: 0.5,
      pergunta: 'Na fala atual, o aluno pede para falar com uma pessoa (atendente, humano, alguém da equipe) ou reclama do atendimento automático?',
    },
  ],

  conversa: {
    skin: 'chat-site',
    titulo: 'Ponto de Virada · Ajuda',
    subtitulo: 'assistente do site · responde só com o FAQ oficial',
    avatar: '📗',
    participantes: {
      aluno: { nome: 'Você', avatar: '🙂', lado: 'dir' },
      bot: { nome: 'Assistente', avatar: '📗', lado: 'esq' },
    },
    analisar: ['aluno'],
    voce: 'aluno',
    placeholder: 'Pergunte como aluno (ex.: "tem aula ao vivo?" ou "vocês dão curso de inglês?")',
    abertura: 'Este assistente só responde com o FAQ oficial da escola. O que não estiver lá vai para uma pessoa.',
    tituloAnalise: 'O Jev escolheu a resposta de cada pergunta',
    // o texto vem do FAQ (nada é escrito pelo Jev); abaixo do LIMIAR, ninguém chuta: chama a equipe
    responder(resp, fala) {
      const a = resp.resposta;
      const item = a && FAQ.find((f) => f.id === a.choice);
      const p = item && a.probabilities ? a.probabilities[a.choice] || 0 : 0;
      const pessoa = resp.quer_humano && resp.quer_humano.noul >= 0.5;
      const out = [];
      if (item && p >= LIMIAR) out.push({ texto: item.resposta, marca: `resposta do FAQ · ${Math.round(p * 100)}%` });
      if (pessoa) out.push({ texto: 'Claro! Já chamei alguém da equipe para continuar com você por aqui. Atendemos de segunda a sexta, das 9h às 18h. 🙋', marca: 'passou para a equipe' });
      else if (!out.length) out.push({ texto: 'Essa eu não tenho no FAQ da escola e prefiro não chutar. 🙋 Já chamei alguém da equipe para te responder por aqui.', marca: item ? `confiança baixa (${Math.round(p * 100)}%) → equipe` : 'fora do FAQ → equipe' });
      void fala;
      return out;
    },
  },

  roteiros: [
    {
      titulo: 'Antes de comprar',
      falas: [
        { quem: 'aluno', texto: 'oi! nunca mexi em planilha na vida, consigo acompanhar?', esperado: { resposta: 'requisitos', quer_humano: false } },
        { quem: 'aluno', texto: 'e se eu não curtir, vocês devolvem a grana?', esperado: { resposta: 'garantia' } },
        { quem: 'aluno', texto: 'dá pra pagar em várias vezes?', esperado: { resposta: 'preco_pagamento' } },
        { quem: 'aluno', texto: 'vocês têm curso de Python também?', esperado: { resposta: 'nenhuma', quer_humano: false } },
        { quem: 'aluno', texto: 'beleza, e o certificado sai com quantas horas?', esperado: { resposta: 'certificado' } },
        { quem: 'aluno', texto: 'e esse certificado vale como atividade complementar na faculdade?', esperado: { resposta: 'nenhuma' } },
      ],
    },
    {
      titulo: 'Já sou aluno',
      falas: [
        { quem: 'aluno', texto: 'não consigo logar, diz que a senha tá errada', esperado: { resposta: 'senha' } },
        { quem: 'aluno', texto: 'posso passar meu acesso pra minha sócia?', esperado: { resposta: 'transferir' } },
        { quem: 'aluno', texto: 'a monitoria de quinta fica gravada?', esperado: { resposta: 'formato' } },
        { quem: 'aluno', texto: 'vocês montam a planilha de estoque da minha loja pra mim?', esperado: { resposta: 'nenhuma' } },
        { quem: 'aluno', texto: 'ah, então quero falar com uma pessoa', esperado: { resposta: 'nenhuma', quer_humano: true } },
      ],
    },
    {
      titulo: 'Para a empresa',
      falas: [
        { quem: 'aluno', texto: 'somos 8 pessoas no financeiro, tem alguma condição especial?', esperado: { resposta: 'empresas', quer_humano: false } },
        { quem: 'aluno', texto: 'a nota pode sair no CNPJ da empresa?', esperado: { resposta: 'nota_fiscal' } },
        { quem: 'aluno', texto: 'quando acabarem os 2 anos a gente perde tudo?', esperado: { resposta: 'tempo_acesso' } },
        { quem: 'aluno', texto: 'vocês fazem treinamento presencial aqui em Curitiba?', esperado: { resposta: 'nenhuma' } },
      ],
    },
  ],
};

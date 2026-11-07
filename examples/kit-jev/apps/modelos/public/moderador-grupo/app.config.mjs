// Moderador de Grupo de WhatsApp — lê cada mensagem do grupo e decide: deixar, avisar, apagar ou responder com o FAQ.
// Para adaptar: troque as regras do grupo (contexto.regras, editáveis na tela), o FAQ e os membros dos roteiros.
const MEMBROS = {
  ana: { nome: 'Ana Paula', avatar: '👩‍🍳', lado: 'esq' },
  bia: { nome: 'Bia Confeitos', avatar: '🧁', lado: 'esq' },
  carla: { nome: 'Carla', avatar: '🎂', lado: 'esq' },
  dani: { nome: 'Dani Vendas', avatar: '🧑', lado: 'esq' },
  edu: { nome: 'Edu', avatar: '🙂', lado: 'esq' },
};
const FAQ = {
  planilha: { titulo: 'Planilha de precificação', cobre: 'como calcular o preço dos doces, planilha de custos', resposta: '📌 A planilha de precificação está no link fixado na descrição do grupo. É só fazer uma cópia e preencher os seus custos.' },
  encontro: { titulo: 'Encontro do mês', cobre: 'dia, horário e local do encontro mensal do grupo', resposta: '📌 O encontro do mês é sempre no último sábado, às 15h, no salão da Padaria Trigo Bom (Rua das Flores, 210). Entrada livre para quem é do grupo.' },
  fornecedores: { titulo: 'Fornecedores parceiros', cobre: 'onde comprar embalagens, ingredientes e chocolate mais barato', resposta: '📌 Os fornecedores com desconto para o grupo estão no documento fixado: Embalagens Doce Laço (10% com o cupom CLUBEABC) e Distribuidora Cacau Real (frete grátis acima de R$ 300).' },
  curso: { titulo: 'Curso de bolo de pote', cobre: 'inscrições, datas e vagas do curso de bolo de pote', resposta: '📌 As inscrições do curso de bolo de pote abrem no dia 1º de cada mês, pelo link da descrição do grupo. São 20 vagas por turma.' },
};
const nomeDe = (quem) => (MEMBROS[quem] || {}).nome || quem;

export default {
  id: 'moderador-grupo',
  titulo: 'Moderador de Grupo de WhatsApp',
  emoji: '🛡️',
  categoria: 'atendimento',
  ordem: 13,
  resumo: 'Lê cada mensagem do grupo na hora: apaga golpe e ofensa, avisa quem foge do tema e responde as dúvidas de sempre.',
  descricao: 'Cada mensagem passa pelo Jev com as regras do grupo escritas em português: deixar, avisar, apagar ou responder com o FAQ, com o motivo e o alerta de link suspeito. Decidindo em meio segundo, o golpe some antes de alguém clicar, e as regras mudam com um texto, sem programar nada.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#84cc16', acento2: '#f43f5e' },
  origem: 'já existe: jev-group-manager',

  contexto: {
    grupo: 'Clube das Confeiteiras ABC — 230 confeiteiras que vendem doces e bolos feitos em casa',
    regras: '1. Só assuntos de confeitaria e do negócio de doces (receitas, clientes, encomendas, preços, fornecedores).\n2. Divulgação de produto, serviço ou outro grupo só com autorização da administração.\n3. Respeito sempre: nada de ofensa, deboche ou ataque pessoal.\n4. Proibido golpe, corrente, "renda fácil", pedido de Pix e link suspeito, mesmo quando a pessoa só pergunta se o link é confiável.\n5. Dúvidas frequentes são respondidas pelo moderador com o FAQ.',
    faq: Object.entries(FAQ).map(([id, f]) => ({ id, assunto: f.titulo, responde: f.cobre, resposta: f.resposta })),
  },
  editavel: { campo: 'regras', rotulo: 'Regras do grupo (o Jev lê isto)', botao: 'Regras do grupo', ajuda: 'Teste: escreva "divulgação liberada" ou "pode falar de futebol" e rode o roteiro de novo.' },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', papel: 'destaque', titulo: 'Ação',
      pergunta: 'O que o moderador deve fazer com esta mensagem, seguindo as regras do grupo (contexto.regras)? Golpe, link suspeito, corrente, pedido de dinheiro, ofensa ou deboche contra alguém → apagar. Divulgação sem autorização ou assunto fora do tema → avisar. Dúvida que o FAQ do grupo (contexto.faq) responde → responder_faq. Mensagem que segue as regras (conversa do tema, dúvida que o FAQ não cobre, agradecimento ou alerta útil para o grupo) → ok.',
      opcoes: [
        { id: 'ok', rotulo: 'Deixar', icone: '✅', tom: 'bom', desc: 'mensagem dentro das regras do grupo: conversa do tema, dica, agradecimento, alerta útil para o grupo' },
        { id: 'responder_faq', rotulo: 'Responder com o FAQ', icone: '📌', tom: 'acento', desc: 'dúvida que o FAQ do grupo responde: onde comprar embalagem ou ingrediente mais barato, como calcular preço, quando é o encontro, curso' },
        { id: 'avisar', rotulo: 'Avisar', icone: '⚠️', tom: 'medio', desc: 'quebra leve: divulgação de produto, serviço ou grupo sem autorização, ou assunto fora do tema (futebol, política, fofoca)' },
        { id: 'apagar', rotulo: 'Apagar', icone: '🗑️', tom: 'ruim', desc: 'golpe, link suspeito, corrente, "renda fácil", pedido de Pix, ofensa ou deboche contra alguém' },
      ],
    },
    {
      id: 'motivo', tipo: 'choice', titulo: 'Motivo',
      pergunta: 'Por que o moderador agiria nesta mensagem? Escolha a regra quebrada (spam, fora_do_tema, ofensa, golpe), "duvida_frequente" se é uma pergunta que o FAQ do grupo responde, ou "nenhum" se a mensagem é normal, inclusive quando alguém só alerta o grupo sobre um golpe.',
      opcoes: [
        { id: 'nenhum', rotulo: 'Nenhum', icone: '•', tom: 'bom', desc: 'mensagem normal: receita, dica, cliente, encomenda, agradecimento, alerta útil' },
        { id: 'duvida_frequente', rotulo: 'Dúvida frequente', icone: '❓', tom: 'acento', desc: 'pergunta que está no FAQ do grupo' },
        { id: 'spam', rotulo: 'Divulgação', icone: '📢', tom: 'medio', desc: 'propaganda de produto, serviço, loja ou outro grupo, sem autorização' },
        { id: 'fora_do_tema', rotulo: 'Fora do tema', icone: '⚽', tom: 'medio', desc: 'assunto que não é confeitaria nem o negócio de doces: futebol, política, fofoca' },
        { id: 'ofensa', rotulo: 'Ofensa', icone: '🤬', tom: 'ruim', desc: 'xingamento, deboche ou ataque a alguém do grupo' },
        { id: 'golpe', rotulo: 'Golpe', icone: '🎣', tom: 'ruim', desc: 'renda fácil, corrente, pedido de Pix, falso banco, prêmio, link para "atualizar cadastro"' },
      ],
    },
    {
      id: 'faq', tipo: 'choice', titulo: 'Item do FAQ',
      pergunta: 'Se a mensagem é uma dúvida que o FAQ do grupo (contexto.faq) responde, qual item responde? Escolha "nenhum" se ela não é uma dúvida do FAQ.',
      opcoes: () => [
        ...Object.entries(FAQ).map(([id, f]) => ({ id, rotulo: f.titulo, icone: '📌', desc: `${f.titulo}: ${f.cobre}` })),
        { id: 'nenhum', rotulo: 'Nenhum', icone: '•', desc: 'não é uma dúvida que o FAQ responde' },
      ],
    },
    {
      id: 'link_suspeito', tipo: 'noul', papel: 'checklist', titulo: 'Link suspeito', rotuloSim: 'apareceu', rotuloNao: 'nenhum', tom: 'ruim', alerta: true, limiar: 0.5,
      pergunta: 'O texto da fala atual (não as mensagens anteriores) contém um link ou endereço de site suspeito: encurtado, de "renda fácil", de banco falso, para atualizar cadastro ou ganhar prêmio?',
    },
  ],

  conversa: {
    skin: 'whatsapp',
    titulo: 'Clube das Confeiteiras ABC 🧁',
    subtitulo: 'Ana Paula, Bia, Carla, Dani, Edu e mais 225',
    avatar: '🧁',
    participantes: { ...MEMBROS, bot: { nome: 'Moderador', avatar: '🛡️', lado: 'dir' } },
    analisar: Object.keys(MEMBROS),
    voce: 'carla',
    escolherQuem: true,
    placeholder: 'Escreva como alguém do grupo (escolha quem ao lado)…',
    abertura: 'O moderador lê cada mensagem com as regras do grupo (botão ✎) e age na hora.',
    tituloAnalise: 'O Jev julgou cada mensagem do grupo',
    riscar: { decisao: 'acao', opcoes: ['apagar'] },
    selo(resp) {
      const a = resp.acao && resp.acao.choice;
      if (a === 'apagar') return { texto: '🗑 apagada pelo moderador', tom: 'ruim' };
      if (a === 'avisar') return { texto: '⚠ aviso', tom: 'medio' };
      if (a === 'responder_faq') return { texto: '📌 FAQ', tom: 'acento' };
      if (resp.link_suspeito && resp.link_suspeito.noul >= 0.5) return { texto: '🔗 link suspeito', tom: 'ruim' };
      return null;
    },
    // os textos são modelos da administração; o Jev só escolhe a ação, o motivo e o item do FAQ
    responder(resp, fala) {
      const acao = resp.acao && resp.acao.choice;
      const motivo = resp.motivo && resp.motivo.choice;
      const link = resp.link_suspeito && resp.link_suspeito.noul >= 0.5;
      const nome = nomeDe(fala.quem);
      if (acao === 'apagar') {
        if (motivo === 'ofensa') return { texto: `🛡️ Apaguei uma mensagem de ${nome} com ofensa. Regra 3: respeito sempre. Na próxima, a pessoa sai do grupo.`, marca: 'apagou · ofensa' };
        if (motivo === 'golpe' || link) return { texto: `🛡️ Apaguei uma mensagem com cara de golpe${link ? ' e link suspeito' : ''}. Ninguém clica, combinado? Banco não pede cadastro por link e ninguém ganha dinheiro fácil por mensagem.`, marca: 'apagou · golpe' };
        return { texto: '🛡️ Apaguei uma mensagem que quebrava as regras do grupo.', marca: 'apagou' };
      }
      if (acao === 'avisar') {
        if (motivo === 'spam') return { texto: `@${nome}, divulgação aqui só com autorização da administração (regra 2). Fica o aviso 🙏`, marca: 'aviso · divulgação' };
        return { texto: `@${nome}, vamos manter o grupo só sobre confeitaria e o negócio de doces (regra 1) 🙂`, marca: 'aviso · fora do tema' };
      }
      if (acao === 'responder_faq') {
        const f = FAQ[resp.faq && resp.faq.choice];
        return f ? { texto: f.resposta, marca: `FAQ · ${f.titulo}` } : null;
      }
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Golpe no grupo',
      falas: [
        { quem: 'ana', texto: 'Gente, alguém tem uma receita de ganache que não derrete no calor? Vou entregar um bolo num casamento ao ar livre no sábado', esperado: { acao: 'ok', motivo: 'nenhum', link_suspeito: false } },
        { quem: 'bia', texto: 'Ana, faz 2 partes de chocolate meio amargo pra 1 de creme de leite e deixa 12 horas na geladeira antes de usar. Segura bem!', esperado: { acao: 'ok', motivo: 'nenhum' } },
        { quem: 'dani', texto: '🔥 RENDA EXTRA 🔥 Ganhe R$ 500 por dia só curtindo vídeos! Vagas limitadas, chama no link: bit.ly/renda-facil-ja 💸', esperado: { acao: 'apagar', motivo: 'golpe', link_suspeito: true } },
        { quem: 'carla', texto: 'onde vocês compram embalagem mais barato? tô pagando um absurdo nas caixinhas de brigadeiro', esperado: { acao: 'responder_faq', motivo: 'duvida_frequente', faq: 'fornecedores' } },
        { quem: 'edu', texto: 'Bia, que dica ridícula kkkk quem não sabe fazer ganache devia mudar de profissão 🙄', esperado: { acao: 'apagar', motivo: 'ofensa' } },
        { quem: 'ana', texto: 'obrigada, Bia!! vou testar hoje mesmo ❤️', esperado: { acao: 'ok', motivo: 'nenhum' } },
      ],
    },
    {
      titulo: 'Divulgação e futebol',
      falas: [
        { quem: 'bia', texto: 'Bom dia, meninas! Que horas é o encontro deste mês?', esperado: { acao: 'responder_faq', motivo: 'duvida_frequente', faq: 'encontro' } },
        { quem: 'dani', texto: 'Vendo formas de silicone importadas com 30% de desconto só hoje, me chama no privado 😉', esperado: { acao: 'avisar', motivo: 'spam', link_suspeito: false } },
        { quem: 'edu', texto: 'Alguém viu o jogo ontem? Que golaço no último minuto, hein!', esperado: { acao: 'avisar', motivo: 'fora_do_tema' } },
        { quem: 'carla', texto: 'Gente, chegou mensagem do banco dizendo que minha conta vai ser bloqueada e mandaram esse link pra atualizar o cadastro: banco-seguro-atualiza.net. É confiável?', esperado: { acao: 'apagar', motivo: 'golpe', link_suspeito: true } },
        { quem: 'ana', texto: 'Carla, NÃO clica! É golpe, aconteceu com a minha tia mês passado', esperado: { acao: 'ok', motivo: 'nenhum' } },
        { quem: 'bia', texto: 'e alguém sabe onde acho aquela planilha de calcular o preço dos doces?', esperado: { acao: 'responder_faq', motivo: 'duvida_frequente', faq: 'planilha' } },
      ],
    },
    {
      titulo: 'Chegou gente nova',
      falas: [
        { quem: 'edu', texto: 'Oi, gente! Cheguei agora 🙋‍♂️ Quando abrem as inscrições do curso de bolo de pote?', esperado: { acao: 'responder_faq', motivo: 'duvida_frequente', faq: 'curso' } },
        { quem: 'dani', texto: 'Bom dia! Corrente da sorte: repasse para 10 grupos e receba um Pix de R$ 200 🍀🙏', esperado: { acao: 'apagar', motivo: 'golpe' } },
        { quem: 'carla', texto: 'Alguém indica uma forma de bolo de 25 cm que não grude? A minha já era', esperado: { acao: 'ok', motivo: 'nenhum' } },
        { quem: 'bia', texto: 'Carla, a minha é de alumínio fundido e nunca grudou. Unta com manteiga e farinha que ajuda também!', esperado: { acao: 'ok', motivo: 'nenhum' } },
      ],
    },
  ],
};

// Antes de Enviar — enquanto você escreve o e-mail, o Jev avisa o que pode dar errado.
// Para adaptar: troque as checagens (decisões) pelas regras da sua empresa e os exemplos.
export default {
  id: 'antes-de-enviar',
  titulo: 'Antes de Enviar',
  emoji: '✉️',
  categoria: 'imediata',
  ordem: 5,
  resumo: 'Enquanto você escreve, o Jev avisa: tom ríspido, anexo esquecido, informação confidencial indo para a lista errada.',
  descricao: 'A cada pausa da digitação o Jev relê o e-mail inteiro e responde 6 perguntas de uma vez, em menos de meio segundo. Nada de assistente que escreve por você: ele só aponta o que pode virar problema antes do clique em "Enviar".',
  marcas: ['imediato', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#38bdf8', acento2: '#818cf8' },

  contexto: {
    remetente: 'Paula Reis, gerente de operações',
    empresa: 'agência de marketing com 84 pessoas',
    regras: 'salário, demissão, saúde, senhas e dados de clientes nunca vão para listas grandes ou para fora da empresa',
  },

  aovivo: {
    skin: 'email',
    janela: 'Nova mensagem',
    rotulo: 'E-mail',
    placeholder: 'Para: …\nAnexos: …\nAssunto: …\n\nEscreva o e-mail aqui.',
    dica: 'As linhas "Para" e "Anexos" também contam: o Jev lê tudo.',
    tituloChecklist: 'Checagens antes de enviar',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', papel: 'destaque', titulo: 'Veredito',
      pergunta: 'O e-mail tem algum destes problemas: (1) cita um anexo, mas a linha "Anexos" diz nenhum; (2) informação confidencial ou pessoal indo para uma lista grande ou para fora da empresa; (3) tom ríspido ou ofensivo; (4) promessa arriscada? Sem nenhum problema, pode enviar; com um detalhe, revisar; com vazamento ou ofensa, não enviar.',
      opcoes: [
        { id: 'pode', rotulo: 'Pode enviar', icone: '✅', cor: '#34d399', desc: 'nenhum problema relevante' },
        { id: 'revisar', rotulo: 'Revise antes', icone: '✋', cor: '#fbbf24', desc: 'há um detalhe que vale corrigir' },
        { id: 'nao', rotulo: 'Não envie assim', icone: '⛔', cor: '#f87171', desc: 'pode causar problema sério: vazamento, ofensa ou promessa perigosa' },
      ],
    },
    {
      id: 'tom', tipo: 'score', papel: 'medidor', titulo: 'Tom',
      pergunta: 'Quão ríspido ou agressivo está o tom deste e-mail?',
      niveis: [
        { rotulo: 'cordial', desc: 'educado e respeitoso' },
        { rotulo: 'seco', desc: 'direto demais, mas sem ofensa' },
        { rotulo: 'ríspido', desc: 'irritado, irônico ou acusatório' },
        { rotulo: 'ofensivo', desc: 'ataca a pessoa; vai gerar conflito' },
      ],
    },
    { id: 'anexo', tipo: 'noul', papel: 'checklist', rotulo: 'Fala de anexo, mas não anexou', tom: 'ruim', pergunta: 'O texto menciona um anexo ou arquivo ("segue em anexo", "anexei", "mando a planilha") mas a linha "Anexos:" diz que não há nenhum?' },
    { id: 'confidencial', tipo: 'noul', papel: 'checklist', rotulo: 'Conteúdo sensível para gente demais', tom: 'ruim', pergunta: 'O e-mail traz informação confidencial ou pessoal (salário, demissão, saúde, senha, dado de cliente) e os destinatários são uma lista grande ou gente de fora da empresa?' },
    { id: 'promessa', tipo: 'noul', papel: 'checklist', rotulo: 'Promessa arriscada', tom: 'ruim', pergunta: 'O e-mail promete prazo, desconto, garantia ou resultado que parece arriscado para a empresa cumprir?' },
    { id: 'claro', tipo: 'noul', papel: 'checklist', rotulo: 'Pedido claro (o quê e até quando)', tom: 'bom', pergunta: 'Fica claro o que o destinatário precisa fazer e até quando?' },
  ],

  exemplos: [
    {
      titulo: 'Reajuste para todo mundo',
      texto: 'Para: time-todo@agencia.com.br (84 pessoas)\nAnexos: nenhum\nAssunto: Reajuste do Pedro\n\nPessoal, o salário do Pedro passa para R$ 14.500 a partir de novembro. Ele ainda não sabe, então segredo até sexta, ok?',
    },
    {
      titulo: 'Proposta sem anexo',
      texto: 'Para: ana.costa@cliente.com.br\nAnexos: nenhum\nAssunto: Proposta revisada\n\nOi Ana, tudo bem? Segue em anexo a proposta revisada com os valores que combinamos na reunião. Se puder me dar um retorno até quinta, consigo reservar a equipe para começar dia 3.',
    },
    {
      titulo: 'Fornecedor atrasado',
      texto: 'Para: atendimento@graficarapida.com.br\nAnexos: nenhum\nAssunto: Atraso de novo\n\nSinceramente, é a terceira vez. Não sei se vocês não sabem ler um pedido ou se simplesmente não ligam para os clientes. Quero o material até amanhã ou cancelo tudo.',
    },
    {
      titulo: 'Tudo certo',
      texto: 'Para: marcos@agencia.com.br\nAnexos: cronograma-campanha-v3.pdf\nAssunto: Cronograma da campanha\n\nOi Marcos! Segue em anexo o cronograma atualizado. Você consegue revisar as datas das peças de vídeo e me responder até quarta às 18h? Obrigada!',
    },
  ],
};

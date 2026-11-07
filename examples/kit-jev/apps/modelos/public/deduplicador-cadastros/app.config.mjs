// Deduplicador de Cadastros — "é a mesma pessoa?" entre duas listas, mesmo com apelido, erro de digitação e formato diferente.
// Para adaptar: coloque as duas listas (lado 'a' e 'b') e os pares candidatos (paresDemo), que o seu código acha por
// semelhança simples (mesma cidade, mesmo DDD, mesmas iniciais). O Jev decide os casos que regra nenhuma resolve.
export default {
  id: 'deduplicador-cadastros',
  titulo: 'Deduplicador de Cadastros',
  emoji: '🧬',
  categoria: 'dados',
  ordem: 43,
  resumo: 'Junta cadastros repetidos entre duas listas, mesmo com apelido, erro de digitação e e-mail diferente.',
  descricao: '"Zé Carlos Lima" e "José C. de Lima" são a mesma pessoa? Regra de texto não resolve. O Jev compara cada par candidato e devolve a probabilidade de ser a mesma pessoa; as linhas verdes ligam os que deve juntar, e o que fica em dúvida não é juntado sozinho.',
  marcas: ['volume', 'limiar'],
  motor: 'pares',
  tema: { acento: '#14b8a6', acento2: '#60a5fa' },

  contexto: { tarefa: 'unir a lista do evento de outubro ao CRM antigo sem criar contato repetido' },

  decisoes: [
    {
      id: 'mesmo', tipo: 'noul', titulo: 'Mesma pessoa',
      pergunta: 'Os cadastros A e B são da MESMA pessoa, apesar de diferenças de apelido, abreviação, acento, formato de telefone ou e-mail novo?',
    },
    {
      id: 'diferenca', tipo: 'choice', titulo: 'Diferença principal',
      pergunta: 'Qual é a principal diferença entre os dois cadastros?',
      opcoes: [
        { id: 'apelido', rotulo: 'apelido/abreviação', icone: '🏷️', desc: 'nome escrito de outro jeito (apelido, abreviação, sem sobrenome)' },
        { id: 'digitacao', rotulo: 'erro de digitação', icone: '⌨️', desc: 'letras trocadas, acento faltando' },
        { id: 'contato', rotulo: 'contato novo', icone: '📇', desc: 'mudou e-mail ou telefone' },
        { id: 'outra_pessoa', rotulo: 'outra pessoa', icone: '👥', desc: 'parece, mas são pessoas diferentes' },
        { id: 'nenhuma', rotulo: 'praticamente iguais', icone: '🟰', desc: 'quase nada muda' },
      ],
    },
  ],

  pares: {
    decisao: 'mesmo',
    limiar: 0.7,
    lote: 5,
    ritmo: 1300,
    rotuloA: 'CRM antigo',
    rotuloB: 'Lista do evento de outubro',
    rotuloSim: 'mesma pessoa',
    rotuloNao: 'pessoas diferentes',
    rotuloSimCurto: 'juntar',
    rotuloNaoCurto: 'manter separados',
    tituloLista: 'Pares avaliados (juntar só acima de 70%)',
    cartao: { titulo: 'nome', subtitulo: 'contato', texto: 'extra' },
  },

  dados: [
    { id: 'a1', lado: 'a', nome: 'José Carlos de Lima', contato: 'jose.lima@gmail.com · (31) 99876-1122', extra: 'Belo Horizonte · cliente desde 2021' },
    { id: 'a2', lado: 'a', nome: 'Mariana Albuquerque', contato: 'mari.albuq@hotmail.com · (11) 98123-4455', extra: 'São Paulo · comprou o curso de Excel' },
    { id: 'a3', lado: 'a', nome: 'Fernanda Rocha Martins', contato: 'fernanda@rochamartins.adv.br · (21) 3344-9988', extra: 'Rio de Janeiro · escritório de advocacia' },
    { id: 'a4', lado: 'a', nome: 'Ricardo Teixeira', contato: 'ricardo.teixeira@empresa.com · (41) 99911-0000', extra: 'Curitiba · gerente comercial' },
    { id: 'a5', lado: 'a', nome: 'Ana Paula Souza', contato: 'anapaula.souza@gmail.com · (31) 98888-1212', extra: 'Contagem · professora' },
    { id: 'a6', lado: 'a', nome: 'Luiz Henrique Prado', contato: 'lhprado@uol.com.br · (19) 99700-3030', extra: 'Campinas · dono de padaria' },
    { id: 'a7', lado: 'a', nome: 'Beatriz Nogueira', contato: 'bia.nogueira@gmail.com · (85) 98111-2323', extra: 'Fortaleza · designer' },
    { id: 'b1', lado: 'b', nome: 'Zé Carlos Lima', contato: 'zecarlos.lima@outlook.com · 31 99876 1122', extra: 'BH · veio pelo Instagram' },
    { id: 'b2', lado: 'b', nome: 'José Lima', contato: 'jlima.contabil@gmail.com · (62) 99123-8877', extra: 'Goiânia · contador' },
    { id: 'b3', lado: 'b', nome: 'Mariana Albuquerqe', contato: 'mari.albuq@hotmail.com · (11) 98123-4455', extra: 'SP · participou do workshop' },
    { id: 'b4', lado: 'b', nome: 'Dra. Fernanda R. Martins', contato: 'contato@rochamartins.adv.br · (21) 3344-9988', extra: 'RJ · advogada' },
    { id: 'b5', lado: 'b', nome: 'Ricardo Teixeira Filho', contato: 'ricardinho.tx@gmail.com · (41) 98444-5656', extra: 'Curitiba · estudante de 19 anos' },
    { id: 'b6', lado: 'b', nome: 'Ana P. Souza', contato: 'anapaula.souza@gmail.com · (31) 98888-1212', extra: 'Contagem/MG' },
    { id: 'b7', lado: 'b', nome: 'Luis Henrique Prado', contato: 'padaria.prado@gmail.com · (19) 99700-3030', extra: 'Campinas · Padaria Prado' },
    { id: 'b8', lado: 'b', nome: 'Beatriz Nogueira Lopes', contato: 'beatriz.lopes@studio.com · (11) 97777-1010', extra: 'São Paulo · fotógrafa' },
  ],

  paresDemo: [
    ['a1', 'b1'], ['a1', 'b2'], ['a2', 'b3'], ['a3', 'b4'], ['a4', 'b5'],
    ['a5', 'b6'], ['a6', 'b7'], ['a7', 'b8'], ['a2', 'b6'], ['a4', 'b1'],
  ],
};

// Checagem com Fonte ao Vivo — na palestra, cada afirmação é comparada com a base de fatos verificados; erro claro vira cartão com a fonte.
// Para adaptar: troque FONTES pelos fatos do seu produto ou da sua aula (frase + fonte). O texto do cartão sai daqui, nunca do Jev.
const FONTES = [
  { id: 'bateria', tema: 'bateria', frase: 'A bateria do X2 dura até 30 horas com o cancelamento de ruído desligado e 24 horas com ele ligado.', fonte: 'ficha técnica do X2, versão 3, p. 2' },
  { id: 'agua', tema: 'resistência à água', frase: 'O X2 tem certificação IPX4: aguenta suor e respingos, mas não pode ser mergulhado nem usado para nadar.', fonte: 'ficha técnica do X2, versão 3, p. 3' },
  { id: 'carga_rapida', tema: 'carga rápida', frase: 'Com 10 minutos na tomada, o X2 toca por até 3 horas.', fonte: 'ficha técnica do X2, versão 3, p. 2' },
  { id: 'conexao', tema: 'conexão', frase: 'O X2 conecta em até dois aparelhos ao mesmo tempo (multiponto).', fonte: 'ficha técnica do X2, versão 3, p. 4' },
  { id: 'cores', tema: 'cores', frase: 'O X2 vem em três cores: grafite, areia e verde-musgo.', fonte: 'catálogo de lançamento 2026, p. 6' },
  { id: 'preco', tema: 'preço', frase: 'O preço de lançamento é R$ 499, na pré-venda até 30/11.', fonte: 'tabela comercial de outubro de 2026' },
  { id: 'garantia', tema: 'garantia', frase: 'A garantia é de 12 meses, direto com a Lumi.', fonte: 'termo de garantia, cláusula 2' },
  { id: 'fabricacao', tema: 'fabricação', frase: 'O X2 é montado em Manaus (AM).', fonte: 'release oficial de 14/10/2026' },
];
const LIMIAR_ERRO = 0.6;
const sistema = (texto) => ({ texto, quem: '__sistema', classe: 'sistema' });
const temErro = (resp) => !!(resp.erro_claro && resp.erro_claro.noul >= LIMIAR_ERRO);
const fatoDe = (resp) => FONTES.find((f) => f.id === (resp.fato && resp.fato.choice));

export default {
  id: 'checagem-fonte',
  titulo: 'Checagem com Fonte ao Vivo',
  emoji: '🔎',
  categoria: 'voz',
  ordem: 67,
  resumo: 'Na palestra ou na call de vendas, quando alguém afirma algo que contradiz a ficha técnica, aparece na hora um cartão com o dado certo e a fonte.',
  descricao: 'A cada fala, o Jev aponta qual fato verificado está em jogo (de uma lista fechada) e estima a chance de a fala o contradizer. Só acima de 60% surge o cartão ⚠️, com a frase e a fonte da sua base. Opinião, pergunta e arredondamento não disparam nada.',
  marcas: ['imediato', 'limiar', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#0ea5a4', acento2: '#f59e0b' },
  origem: 'Jev Voice (checagem ao vivo de afirmações, medida em 34 de 34)',

  contexto: {
    evento: 'lançamento do fone Lumi X2, da Lumi Áudio (fictícia), para imprensa e revendedores',
    fontes: FONTES.map((f) => `${f.tema}: ${f.frase} (fonte: ${f.fonte})`),
  },

  decisoes: [
    {
      id: 'erro_claro', tipo: 'noul', papel: 'contador', titulo: 'Erros pegos', rotuloSim: 'não confere', rotuloNao: 'ok', tom: 'ruim', alerta: true, limiar: LIMIAR_ERRO,
      pergunta: 'A fala atual afirma algo que CONTRADIZ claramente um dos fatos verificados em contexto.fontes (número, prazo, recurso ou condição diferente)? Responda SIM só com contradição clara. Responda NÃO quando a fala concorda com o fato, mesmo com outras palavras ou arredondando de leve, e quando é opinião, pergunta, promessa vaga ou assunto que não está nos fatos.',
    },
    {
      id: 'fato', tipo: 'choice', papel: 'destaque', titulo: 'Fato em jogo',
      pergunta: 'Sobre qual destes fatos verificados a fala atual faz uma afirmação (certa ou errada)? Escolha "nenhum" se a fala não afirma nada sobre eles: opinião, pergunta ou assunto fora da lista.',
      opcoes: () => [
        ...FONTES.map((f) => ({ id: f.id, rotulo: f.tema.charAt(0).toUpperCase() + f.tema.slice(1), icone: '📄', desc: `${f.tema}: ${f.frase}` })),
        { id: 'nenhum', rotulo: 'Nenhum', icone: '·', desc: 'a fala não afirma nada sobre os fatos da lista (opinião, pergunta, outro assunto)' },
      ],
    },
  ],

  conversa: {
    skin: 'aula',
    titulo: 'Lançamento do Lumi X2',
    subtitulo: 'palestra para imprensa e revendedores · ao vivo',
    avatar: '🎧',
    abertura: '🔎 Checagem ligada: cada afirmação é comparada com a ficha técnica, a tabela comercial e o termo de garantia',
    participantes: {
      palestrante: { nome: 'Marcelo · gerente de produto', avatar: '🧑🏻‍💼', lado: 'esq' },
      plateia: { nome: 'Lívia · plateia', avatar: '🙋🏽‍♀️', lado: 'esq' },
    },
    analisar: ['palestrante', 'plateia'],
    voce: 'palestrante',
    escolherQuem: true,
    placeholder: 'Afirme algo sobre o X2 (ex.: "a garantia é de três anos")',
    tituloPlacar: 'Checagem agora',
    selo(resp) {
      if (temErro(resp)) return { texto: 'não confere', tom: 'ruim', icone: '⚠️' };
      return fatoDe(resp) ? { texto: 'confere com a fonte', tom: 'bom', icone: '✓' } : null;
    },
    responder(resp) {
      if (!temErro(resp)) return null;
      const f = fatoDe(resp);
      if (!f) return sistema('⚠️ Checagem: isso não bate com a base de fatos verificados. Vale conferir antes de repetir.');
      return sistema(`⚠️ Checagem: ${f.frase} Fonte: ${f.fonte}.`);
    },
  },

  roteiros: [
    {
      titulo: 'Apresentação',
      falas: [
        { quem: 'palestrante', texto: 'Boa noite, gente! Esse é o Lumi X2, e a bateria dura até 30 horas.', esperado: { fato: 'bateria', erro_claro: false } },
        { quem: 'palestrante', texto: "E ele é à prova d'água de verdade: dá pra nadar com ele na piscina.", esperado: { fato: 'agua', erro_claro: true } },
        { quem: 'palestrante', texto: 'Com dez minutinhos na tomada, você ganha três horas de música.', esperado: { fato: 'carga_rapida', erro_claro: false } },
        { quem: 'palestrante', texto: 'Ele conecta no notebook e no celular ao mesmo tempo.', esperado: { fato: 'conexao', erro_claro: false } },
        { quem: 'palestrante', texto: 'E vem em cinco cores, pra combinar com tudo.', esperado: { fato: 'cores', erro_claro: true } },
      ],
    },
    {
      titulo: 'Perguntas da plateia',
      falas: [
        { quem: 'plateia', texto: 'Quanto vai custar?', esperado: { fato: ['preco', 'nenhum'], erro_claro: false } },
        { quem: 'palestrante', texto: 'Na pré-venda, sai por 499 reais.', esperado: { fato: 'preco', erro_claro: false } },
        { quem: 'plateia', texto: 'E a garantia, como fica?', esperado: { fato: ['garantia', 'nenhum'], erro_claro: false } },
        { quem: 'palestrante', texto: 'Garantia de dois anos, direto com a gente.', esperado: { fato: 'garantia', erro_claro: true } },
        { quem: 'palestrante', texto: 'E todo X2 é montado aqui no Brasil, em Manaus.', esperado: { fato: 'fabricacao', erro_claro: false } },
      ],
    },
    {
      titulo: 'Letra miúda',
      falas: [
        { quem: 'palestrante', texto: 'Eu acho que é o fone mais bonito que a gente já fez.', esperado: { fato: 'nenhum', erro_claro: false } },
        { quem: 'palestrante', texto: 'Com o cancelamento de ruído ligado, a bateria segura as mesmas 30 horas.', esperado: { fato: 'bateria', erro_claro: true } },
        { quem: 'plateia', texto: 'Dá pra usar na academia, suando?', esperado: { fato: ['agua', 'nenhum'], erro_claro: false } },
        { quem: 'palestrante', texto: 'Pode sim: suor e respingo ele aguenta tranquilo.', esperado: { fato: 'agua', erro_claro: false } },
      ],
    },
  ],
};

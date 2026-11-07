// Alerta de Golpe na Ligação — no viva-voz, o Jev ouve cada frase de quem ligou e acende os sinais do golpe da falsa central na hora.
// Para adaptar: troque o banco e as regras dele (contexto), os sinais (as decisões sim/não) e os avisos do gancho responder.
const AVISOS = [
  ['pede_codigo', '⚠️ Dona Marta, banco nenhum pede código do SMS ou senha por telefone. Não leia o código.'],
  ['pede_transferencia', '⚠️ Não existe “conta segura”: banco nenhum pede Pix para proteger o seu dinheiro.'],
  ['pede_app_remoto', '⚠️ Não instale nada: esse aplicativo dá a ele o controle do seu celular.'],
  ['nao_desligar', '⚠️ Pode desligar, sim. Depois ligue você no número do verso do cartão.'],
  ['cria_urgencia', '⚠️ Pressa é tática de golpe. Respire: nada some em 3 minutos.'],
];
const nivel = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 0);

export default {
  id: 'golpe-ligacao',
  titulo: 'Alerta de Golpe na Ligação',
  emoji: '📞',
  categoria: 'confianca',
  ordem: 21,
  resumo: 'No viva-voz, o Jev ouve quem ligou e avisa na hora: "isso é golpe, não passe o código".',
  descricao: 'A cada frase de quem ligou (já transcrita), o Jev responde 9 perguntas numa passada só: os 6 sinais clássicos da falsa central, o risco e o tipo de golpe. O aviso aparece enquanto a pessoa ainda está na linha, não no dia seguinte. E a ligação de verdade do banco passa sem alarme falso, mesmo falando em "senha" e "código".',
  marcas: ['imediato', 'limiar'],
  motor: 'conversa',
  tema: { acento: '#ff5d73', acento2: '#ffb020' },
  origem: 'comunidade: a ElevenLabs mostrou o mesmo alerta numa ligação de voz, em ~180 ms',

  contexto: {
    situacao: 'Dona Marta, 74 anos, cliente do Banco Horizonte, atende uma ligação no viva-voz. O celular transcreve a fala de quem ligou e o app avisa na tela.',
    regras_do_banco: 'O Banco Horizonte nunca liga pedindo senha, código do SMS, número do cartão, Pix ou transferência, e nunca pede para instalar aplicativo. O gerente pode ligar para dar um aviso, mas não pede dados.',
  },

  decisoes: [
    { id: 'finge_ser_banco', tipo: 'noul', papel: 'checklist', titulo: 'Diz ser da “central”', tom: 'ruim', pergunta: 'Na fala atual, quem ligou se apresenta como central de segurança, setor antifraude ou de bloqueio do banco e diz que há um problema na conta ou no cartão (compra suspeita, invasão, clonagem)?' },
    { id: 'pede_codigo', tipo: 'noul', papel: 'checklist', titulo: 'Pede código ou senha', tom: 'ruim', alerta: true, pergunta: 'Na fala atual, quem ligou PEDE que a pessoa diga ou digite um código (SMS, token), uma senha ou os números do cartão? Só citar a palavra, sem pedir, não conta.' },
    { id: 'pede_transferencia', tipo: 'noul', papel: 'checklist', titulo: 'Pede Pix ou transferência', tom: 'ruim', alerta: true, pergunta: 'Na fala atual, quem ligou pede um Pix, transferência, pagamento ou para mover o dinheiro para uma “conta segura”?' },
    { id: 'cria_urgencia', tipo: 'noul', papel: 'checklist', titulo: 'Cria pressa ou medo', tom: 'ruim', pergunta: 'Na fala atual, quem ligou pressiona com pressa ou medo ("agora", "em 3 minutos", "senão a senhora perde tudo")?' },
    { id: 'nao_desligar', tipo: 'noul', papel: 'checklist', titulo: 'Pede para não desligar', tom: 'ruim', alerta: true, pergunta: 'Na fala atual, quem ligou pede para a pessoa não desligar, não falar com ninguém ou não ligar para o banco ou para a família?' },
    { id: 'pede_app_remoto', tipo: 'noul', papel: 'checklist', titulo: 'Pede para instalar app', tom: 'ruim', alerta: true, pergunta: 'Na fala atual, quem ligou pede para instalar um aplicativo, abrir um link ou dar acesso ao celular ou ao computador?' },
    {
      id: 'risco', tipo: 'score', papel: 'medidor', titulo: 'Risco de golpe', alertaNivel: 3,
      pergunta: 'Considerando a conversa até aqui e a fala atual de quem ligou, qual o risco de ser golpe?',
      niveis: [
        { rotulo: 'normal', desc: 'conversa comum, nada pedido' },
        { rotulo: 'atenção', desc: 'assunto delicado (conta, cartão, compra), mas nada pedido ainda' },
        { rotulo: 'suspeito', desc: 'um sinal clássico de golpe: pressa, “central de segurança”, pedido estranho' },
        { rotulo: 'golpe', desc: 'pede código, senha, Pix, aplicativo ou para não desligar' },
      ],
    },
    {
      id: 'tipo_golpe', tipo: 'choice', papel: 'destaque', titulo: 'Tipo de golpe',
      pergunta: 'Pelo que quem ligou disse até agora, que tipo de golpe parece ser? Se não houve pedido de dado, dinheiro ou aplicativo, nem pressão, escolha "nenhum".',
      opcoes: [
        { id: 'falso_parente', rotulo: 'Falso parente', icone: '👤', tom: 'ruim', desc: 'diz ser filho, neto ou amigo em apuros e pede dinheiro' },
        { id: 'falsa_central', rotulo: 'Falsa central do banco', icone: '🏦', tom: 'ruim', desc: 'diz ser do banco, da central de segurança ou do antifraude e pede código, senha, Pix, aplicativo ou para não desligar' },
        { id: 'premio_falso', rotulo: 'Prêmio falso', icone: '🎁', tom: 'ruim', desc: 'promete prêmio, sorteio ou restituição e pede pagamento ou dados para liberar' },
        { id: 'nenhum', rotulo: 'Nenhum sinal', icone: '✅', tom: 'bom', desc: 'ligação normal: não pede dado, dinheiro nem aplicativo e não pressiona' },
        { id: 'falso_suporte', rotulo: 'Falso suporte técnico', icone: '🛠️', tom: 'ruim', desc: 'diz ser suporte da operadora, da internet ou de um aplicativo e pede para instalar algo' },
        { id: 'cobranca_falsa', rotulo: 'Cobrança falsa', icone: '🧾', tom: 'ruim', desc: 'cobra dívida, boleto ou multa que a pessoa não reconhece, com ameaça' },
      ],
    },
  ],

  conversa: {
    skin: 'ligacao',
    titulo: 'Chamada em viva-voz · (11) 3090-4471',
    subtitulo: 'o Jev ouve quem ligou e avisa na tela',
    avatar: '📞',
    participantes: {
      quem_liga: { nome: 'Quem ligou', avatar: '📞', lado: 'esq' },
      marta: { nome: 'Dona Marta', avatar: '👵', lado: 'dir' },
    },
    analisar: ['quem_liga'],
    voce: 'quem_liga',
    placeholder: 'Fale como quem ligou (ex.: "a senhora precisa me passar o código que chegou")',
    ritmo: 1.4,
    abertura: 'Ligação recebida às 14h32 · o app transcreve a voz de quem ligou e o Jev julga cada frase',
    tituloPlacar: 'Sinais de golpe nesta ligação',
    // aviso na tela da Dona Marta: só quando o risco passa de "suspeito" e um sinal aparece pela primeira vez (texto nosso, não do Jev)
    responder(resp, fala, ctx, estado) {
      if (nivel(resp.risco) < 2) return null;
      estado.avisados = estado.avisados || {};
      const novos = AVISOS.filter(([k]) => resp[k] && resp[k].noul >= 0.5 && !estado.avisados[k]);
      if (!novos.length) return null;
      novos.forEach(([k]) => { estado.avisados[k] = true; });
      return { texto: novos.slice(0, 2).map(([, t]) => t).join(' '), quem: '__sistema', classe: 'sistema' };
    },
    selo(resp) {
      const n = nivel(resp.risco);
      if (n >= 3) return { texto: 'golpe', icone: '⚠', tom: 'ruim' };
      if (n === 2) return { texto: 'suspeito', icone: '!', tom: 'medio' };
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Falsa central',
      falas: [
        { quem: 'quem_liga', texto: 'Boa tarde, falo com a dona Marta Ribeiro? Aqui é o Diego, da Central de Segurança do Banco Horizonte. Identificamos uma compra suspeita de R$ 4.870 no seu cartão. A senhora reconhece?', esperado: { finge_ser_banco: true, pede_codigo: false, pede_transferencia: false, nao_desligar: false, pede_app_remoto: false, risco: [1, 2] } },
        { quem: 'marta', texto: 'Não, meu filho, eu não comprei nada disso!' },
        { quem: 'quem_liga', texto: 'Fique tranquila, vamos cancelar agora. A senhora vai receber um código por SMS e precisa ler para mim, para eu bloquear a compra. Tem que ser rápido, o sistema expira em 3 minutos.', esperado: { pede_codigo: true, cria_urgencia: true, pede_transferencia: false, pede_app_remoto: false, risco: 3, tipo_golpe: 'falsa_central' } },
        { quem: 'marta', texto: 'Chegou um número aqui… espera, deixa eu ligar pro meu filho primeiro.' },
        { quem: 'quem_liga', texto: 'Não desligue, senhora! Se desligar, a compra é aprovada. E para proteger o seu saldo, faça agora um Pix para a conta segura do banco que eu vou passar.', esperado: { nao_desligar: true, pede_transferencia: true, pede_app_remoto: false, risco: 3, tipo_golpe: 'falsa_central' } },
        { quem: 'quem_liga', texto: 'Para facilitar, instale o aplicativo Horizonte Protege pelo link que mandei no SMS. Assim eu acompanho tudo pela sua tela.', esperado: { pede_app_remoto: true, risco: 3, tipo_golpe: 'falsa_central' } },
      ],
    },
    {
      titulo: 'Ligação de verdade',
      falas: [
        { quem: 'quem_liga', texto: 'Boa tarde, dona Marta! Aqui é a Júlia, gerente da sua agência do Banco Horizonte, na Rua das Acácias. Tudo bem com a senhora?', esperado: { finge_ser_banco: false, pede_codigo: false, pede_transferencia: false, cria_urgencia: false, nao_desligar: false, pede_app_remoto: false, risco: [0, 1], tipo_golpe: 'nenhum' } },
        { quem: 'marta', texto: 'Tudo bem, minha filha. Aconteceu alguma coisa?' },
        { quem: 'quem_liga', texto: 'Tudo certo! Só liguei para avisar que o seu cartão novo chegou aqui na agência. A senhora pode retirar quando quiser, de segunda a sexta, das 10h às 16h, com um documento com foto.', esperado: { finge_ser_banco: false, pede_codigo: false, pede_transferencia: false, cria_urgencia: false, nao_desligar: false, pede_app_remoto: false, risco: [0, 1], tipo_golpe: 'nenhum' } },
        { quem: 'marta', texto: 'Ah, que bom. Preciso passar algum dado?' },
        { quem: 'quem_liga', texto: 'Não precisa passar nada por telefone. E lembrando: o banco nunca pede senha, código do SMS nem Pix por ligação. Se alguém pedir, desligue e venha falar comigo.', esperado: { pede_codigo: false, pede_transferencia: false, nao_desligar: false, risco: [0, 1], tipo_golpe: 'nenhum' } },
      ],
    },
  ],
};

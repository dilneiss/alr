// Treino de Atendimento — o aprendiz atende uma cliente irritada; o Jev avalia cada resposta e escolhe como a cliente reage.
// Para adaptar: troque a situação e a política (contexto), as falas prontas da cliente (CLIENTE) e as dicas do treinador (DICAS).

// falas da cliente simulada: uma lista por reação, na ordem dos turnos (o texto é nosso; o Jev só escolhe a reação)
const CLIENTE = {
  acalma: [
    'Tá… o pedido é o 48213. E até quando eu vou ter que esperar?',
    'Tá bom. Pode reenviar, então.',
    'Ok, vou ficar de olho no e-mail.',
    'Combinado. Fico no aguardo.',
  ],
  continua_irritado: [
    'Aguardar até quando? Já são 12 dias! Eu quero uma solução, o pedido é o 48213.',
    'Você já disse isso. Eu quero o meu pedido, não desculpa.',
    'Vou esperar, mas se não chegar eu vou reclamar em todo lugar.',
    'Sério? Que atendimento é esse?',
  ],
  pede_gerente: [
    'Não acredito. Quero falar com o seu supervisor. Agora.',
    'Chega. Chama o gerente, com você não dá.',
    'Mesmo assim, quero registrar uma reclamação com o gerente.',
    'Quero o contato do seu gerente. Agora.',
  ],
  agradece: [
    'Obrigada! É o pedido 48213.',
    'Prefiro o reenvio. Obrigada pela ajuda!',
    'Assim sim. Obrigada pela atenção! 🙏',
    'Perfeito, obrigada! 😊',
  ],
};
const ROTULO = { acalma: '😮‍💨 acalma', continua_irritado: '😠 continua irritada', pede_gerente: '📢 pede o gerente', agradece: '🙏 agradece' };
const DICAS = {
  politica: '💡 Treinador: confira a política. Nada de culpar a transportadora, prometer data sem consultar o sistema ou dar cupom sem o supervisor.',
  passo: '💡 Treinador: dê um próximo passo concreto: consultar o pedido, reenviar ou reembolsar.',
  empatia: '💡 Treinador: comece reconhecendo o transtorno ("Sinto muito pela espera, Fernanda…").',
  boa: '👍 Treinador: resolveu e seguiu a política. Um toque de empatia deixaria a resposta ainda melhor.',
  otima: '✅ Treinador: empatia, próximo passo e dentro da política. É assim!',
};
const sim = (a) => !!a && a.noul >= 0.5;
const nivel = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 0);

export default {
  id: 'treino-atendimento',
  titulo: 'Treino de Atendimento',
  emoji: '🎧',
  categoria: 'educacao',
  ordem: 71,
  resumo: 'O aprendiz atende uma cliente irritada e, a cada resposta, vê a empatia, a política e como a cliente reagiria.',
  descricao: 'A cada fala do aprendiz o Jev mede a empatia, confere se resolveu e se seguiu a política, e escolhe, numa lista fechada, como a cliente reage. A reação vira a próxima fala da cliente (texto pronto nosso): dá para treinar digitando, sem roteiro.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#7b61ff', acento2: '#3ddc97' },
  origem: 'IDEIAS-100-APPS #71 — o Jev avalia cada resposta e escolhe a reação seguinte do cliente',

  contexto: {
    empresa: 'Casa Prática, loja online de eletrodomésticos (fictícia)',
    situacao: 'A cliente Fernanda comprou uma air fryer (pedido 48213) com prazo de 5 dias úteis. Já se passaram 12 dias, o pedido não chegou e ela está irritada.',
    politica: '1) Peça desculpas e reconheça o transtorno. 2) Nunca culpe o cliente nem a transportadora. 3) Em atraso, consulte o pedido e ofereça reenvio expresso ou reembolso total. 4) Não prometa data sem consultar o sistema. 5) Desconto ou cupom só com aprovação do supervisor.',
  },
  editavel: { campo: 'politica', rotulo: 'Política de atendimento (o Jev lê isto)', botao: 'Política', ajuda: 'Mude uma regra (ex.: "pode oferecer cupom de 10% sem supervisor") e mande uma fala nova.' },

  decisoes: [
    {
      id: 'empatia', tipo: 'score', papel: 'medidor', titulo: 'Empatia', inverter: true,
      pergunta: 'Quanta empatia o atendente demonstra NESTA fala com a cliente irritada?',
      niveis: [
        { rotulo: 'fria', desc: 'ignora o sentimento da cliente, culpa alguém, rebate ou é ríspida' },
        { rotulo: 'neutra', desc: 'educada, mas burocrática: não reconhece o transtorno' },
        { rotulo: 'empática', desc: 'reconhece o problema e o sentimento da cliente' },
        { rotulo: 'excelente', desc: 'reconhece, pede desculpas, chama pelo nome e assume o problema junto com a cliente' },
      ],
    },
    {
      id: 'resolveu_ou_encaminhou', tipo: 'noul', papel: 'contador', titulo: 'Falas com próximo passo', rotuloSim: 'resolve ou encaminha', rotuloNao: 'sem próximo passo', tom: 'bom',
      pergunta: 'Nesta fala, o atendente resolve o problema do pedido ou dá um próximo passo concreto (consultar o pedido, reenviar, reembolsar, abrir chamado, transferir para quem resolve)? Só explicar, pedir paciência, dar cupom ou dizer que não pode fazer nada não conta.',
    },
    {
      id: 'seguiu_politica', tipo: 'noul', papel: 'contador', titulo: 'Falas dentro da política', rotuloSim: 'segue a política', rotuloNao: 'fora da política', tom: 'bom',
      pergunta: 'Esta fala do atendente segue TODAS as regras da política da loja (contexto.politica)? Responda não se ele culpa a cliente ou a transportadora, promete data sem consultar o sistema ou oferece desconto ou cupom sem o supervisor.',
    },
    {
      id: 'reacao_cliente', tipo: 'choice', papel: 'destaque', titulo: 'Reação da cliente',
      pergunta: 'Como uma cliente irritada provavelmente reage a esta fala do atendente?',
      opcoes: [
        { id: 'continua_irritado', rotulo: 'Continua irritada', icone: '😠', tom: 'medio', desc: 'a fala é vaga, burocrática ou só pede paciência, sem solução' },
        { id: 'acalma', rotulo: 'Acalma', icone: '😮‍💨', tom: 'acento', desc: 'a fala reconhece o problema e oferece ou promete um próximo passo que AINDA NÃO foi feito (vou consultar, posso reenviar, o que prefere?); a cliente baixa o tom, mas ainda espera' },
        { id: 'pede_gerente', rotulo: 'Pede o gerente', icone: '📢', tom: 'ruim', desc: 'a fala culpa a cliente ou outra empresa, é ríspida ou nega ajuda; a cliente perde a paciência' },
        { id: 'agradece', rotulo: 'Agradece', icone: '🙏', tom: 'bom', desc: 'o atendente diz que a solução JÁ FOI FEITA (ex.: "Feito! o reenvio está registrado", "o reembolso foi feito", "o rastreio chega no seu e-mail") e a cliente agradece' },
      ],
    },
  ],

  conversa: {
    skin: 'chat-site',
    titulo: 'Chat da Casa Prática',
    subtitulo: 'treino com cliente simulada · o Jev escolhe a reação',
    avatar: '🎧',
    participantes: {
      cliente: { nome: 'Fernanda (cliente)', avatar: '😤', lado: 'esq' },
      aprendiz: { nome: 'Você (atendente em treino)', avatar: '🎧', lado: 'dir' },
    },
    analisar: ['aprendiz'],
    voce: 'aprendiz',
    respondeComo: 'cliente',
    ritmo: 2,
    placeholder: 'Responda como atendente (ex.: "Sinto muito, Fernanda! Vou ver seu pedido agora.")',
    abertura: '🎓 Treino: você atende a Fernanda, cliente da Casa Prática, irritada com um atraso. O Jev avalia cada resposta sua e escolhe como ela reage.',
    tituloPlacar: 'Placar do treino',
    // a cliente responde com a reação que o Jev escolheu; o treinador comenta quando algo falhou
    responder(resp, fala, ctx, estado) {
      estado.turno = (estado.turno || 0) + 1;
      const reacao = (resp.reacao_cliente && resp.reacao_cliente.choice) || 'continua_irritado';
      const falas = CLIENTE[reacao] || CLIENTE.continua_irritado;
      const saida = [{ texto: falas[Math.min(estado.turno, falas.length) - 1], marca: ROTULO[reacao] }];
      const politica = sim(resp.seguiu_politica), passo = sim(resp.resolveu_ou_encaminhou), emp = nivel(resp.empatia);
      const dica = !politica ? DICAS.politica : !passo ? DICAS.passo : emp === 0 ? DICAS.empatia : emp === 1 ? DICAS.boa : DICAS.otima;
      saida.push({ texto: dica, quem: '__sistema', classe: 'sistema' });
      return saida;
    },
    selo(resp) {
      if (resp.seguiu_politica && !sim(resp.seguiu_politica)) return { texto: '⚠ fora da política', tom: 'ruim' };
      if (sim(resp.resolveu_ou_encaminhou) && nivel(resp.empatia) >= 2) return { texto: '⭐ boa resposta', tom: 'bom' };
      return null;
    },
  },

  roteiros: [
    {
      titulo: 'Aprendiz despreparado',
      falas: [
        { quem: 'cliente', fixa: true, texto: 'Comprei uma air fryer há 12 dias, o prazo era de 5 dias úteis e até agora NADA. Ninguém responde os meus e-mails!' },
        { quem: 'aprendiz', texto: 'Bom dia. O prazo é só uma estimativa, senhora. Atrasos acontecem, tem que aguardar.', esperado: { empatia: [0, 1], resolveu_ou_encaminhou: false, seguiu_politica: false, reacao_cliente: ['continua_irritado', 'pede_gerente'] } },
        { quem: 'aprendiz', texto: 'Olha, a culpa é da transportadora, não nossa. Daqui eu não tenho o que fazer.', esperado: { empatia: 0, resolveu_ou_encaminhou: false, seguiu_politica: false, reacao_cliente: ['pede_gerente', 'continua_irritado'] } },
        { quem: 'aprendiz', texto: 'Calma, senhora! Vou te dar um cupom de 50% na próxima compra e garanto que chega amanhã.', esperado: { empatia: [0, 1], seguiu_politica: false } },
        { quem: 'aprendiz', texto: 'Pode reclamar onde quiser, senhora, mas não vai adiantar nada.', esperado: { empatia: 0, resolveu_ou_encaminhou: false, seguiu_politica: false, reacao_cliente: ['pede_gerente', 'continua_irritado'] } },
      ],
    },
    {
      titulo: 'Aprendiz bem treinado',
      falas: [
        { quem: 'cliente', fixa: true, texto: 'Comprei uma air fryer há 12 dias, o prazo era de 5 dias úteis e até agora NADA. Ninguém responde os meus e-mails!' },
        { quem: 'aprendiz', texto: 'Fernanda, sinto muito pela espera. 12 dias sem resposta é frustrante mesmo. Me confirma o número do pedido? Vou consultar agora onde ele está.', esperado: { empatia: [2, 3], resolveu_ou_encaminhou: true, seguiu_politica: true, reacao_cliente: 'acalma' } },
        { quem: 'aprendiz', texto: 'Achei: o pedido 48213 ficou parado no centro de distribuição. Posso reenviar hoje com entrega expressa ou fazer o reembolso total. O que você prefere?', esperado: { empatia: [1, 2, 3], resolveu_ou_encaminhou: true, seguiu_politica: true, reacao_cliente: ['acalma', 'agradece'] } },
        { quem: 'aprendiz', texto: 'Feito! O reenvio expresso está registrado e o novo código de rastreio chega no seu e-mail em até 1 hora. Mais uma vez, desculpe pelo transtorno. Qualquer coisa, é só me chamar aqui.', esperado: { empatia: [2, 3], resolveu_ou_encaminhou: true, seguiu_politica: true, reacao_cliente: 'agradece' } },
        { quem: 'aprendiz', texto: 'Eu que agradeço pela paciência, Fernanda, e sinto muito de novo por esses 12 dias. Vou acompanhar a entrega e te aviso por aqui quando o pedido sair.', esperado: { empatia: [2, 3], resolveu_ou_encaminhou: true, seguiu_politica: true, reacao_cliente: ['agradece', 'acalma'] } },
      ],
    },
  ],
};

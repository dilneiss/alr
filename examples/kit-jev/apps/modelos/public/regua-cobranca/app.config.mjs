// Régua de Cobrança que Entende Respostas — lê o que o cliente respondeu ao lembrete de pagamento e deixa a próxima mensagem pronta.
// Para adaptar: troque a empresa, o lembrete, as raias (os tipos de resposta), os MODELOS de mensagem e as respostas de exemplo.
const LIMIAR = 0.7; // abaixo disso a resposta vai para um atendente conferir
const AGRESSIVO = 0.6; // a partir disso a régua pausa e um atendente sênior assume
const MODELOS = {
  promessa: (n) => `Combinado, ${n}! 🙌 Deixamos anotado. Se ajudar, o Pix é cobranca@fibraserra.com.br.`,
  ja_pagou: (n) => `Obrigado, ${n}! Pode mandar o comprovante por aqui? Assim que confirmarmos, a cobrança para.`,
  dificuldade: (n) => `${n}, obrigado por avisar. Podemos dividir em até 3x sem juros. Quer que eu mande a proposta?`,
  contestacao: (n) => `Entendi, ${n}. Pausamos a cobrança e o financeiro revisa a sua fatura em até 1 dia útil.`,
  numero_errado: () => 'Desculpe o engano! Vamos tirar este número da nossa lista agora mesmo.',
  outro: (n) => `${n}, um atendente vai continuar esta conversa por aqui.`,
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const caixa = (cor, html) => `<span style="display:block;margin-top:4px;padding:6px 8px;border-radius:8px;border-left:3px solid ${cor};background:color-mix(in srgb, ${cor} 10%, transparent);font-size:12px;line-height:1.35;white-space:normal">${html}</span>`;

export default {
  id: 'regua-cobranca',
  titulo: 'Régua de Cobrança que Entende Respostas',
  emoji: '💸',
  categoria: 'atendimento',
  ordem: 15,
  resumo: 'Lê cada resposta ao lembrete de pagamento ("pago sexta", "já paguei", "esse valor tá errado") e deixa a próxima mensagem pronta.',
  descricao: 'A régua manda o lembrete e o Jev lê cada resposta: promessa, já pagou, dificuldade, contestação, número errado ou outro, e se o cliente está agressivo. O código escolhe a próxima mensagem pelo modelo da raia; resposta agressiva pausa a régua e o que vier com confiança baixa vai para um atendente.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#0891b2', acento2: '#34d399' },

  contexto: {
    empresa: 'Fibra Serra — provedor de internet em Caxias do Sul (RS), 4 mil clientes',
    lembrete_enviado: 'Oi, {nome}! Aqui é da Fibra Serra. A sua fatura de outubro venceu no dia 10. Se já pagou, desconsidere. Posso ajudar em algo?',
    hoje: '20/10/2026',
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'Resposta',
      pergunta: 'O cliente recebeu o lembrete de fatura vencida (contexto.lembrete_enviado) e respondeu isto. Que tipo de resposta é? Diz quando vai pagar ou pede boleto ou Pix para pagar → promessa. Diz que já pagou → já pagou. Quer pagar mas não consegue agora, ou pede parcelamento, desconto ou prazo → dificuldade. Discorda da cobrança (valor errado, serviço ruim, já cancelou) → contestação. Não é o cliente → número errado. O resto → outro.',
      opcoes: [
        { id: 'promessa', rotulo: 'Promessa de pagar', icone: '🤝', cor: '#22c55e', desc: 'diz que vai pagar e quando (hoje, amanhã, sexta, quando voltar de viagem) ou pede o boleto ou o Pix para pagar' },
        { id: 'ja_pagou', rotulo: 'Já pagou', icone: '✅', cor: '#60a5fa', desc: 'diz que já pagou, que mandou o comprovante ou que a conta está no débito automático' },
        { id: 'dificuldade', rotulo: 'Dificuldade', icone: '🆘', cor: '#f59e0b', desc: 'quer pagar mas não consegue agora: desemprego, aperto, pede parcelamento, desconto ou mais prazo' },
        { id: 'contestacao', rotulo: 'Contestação', icone: '⚖️', cor: '#f87171', desc: 'discorda da cobrança: valor diferente do plano, internet que não funciona, serviço já cancelado' },
        { id: 'numero_errado', rotulo: 'Número errado', icone: '📵', cor: '#94a3b8', desc: 'não é o cliente: não conhece a pessoa, número trocado, nunca foi cliente' },
        { id: 'outro', rotulo: 'Outro', icone: '💬', cor: '#a78bfa', desc: 'qualquer outra resposta: só "ok", pede atendente, diz que outra pessoa paga a conta' },
      ],
    },
    {
      id: 'agressivo', tipo: 'noul', titulo: 'Agressivo', rotulo: 'agressivo', icone: '🧯', tom: 'ruim', alerta: true, limiar: AGRESSIVO,
      pergunta: 'A resposta é agressiva: xingamento, ofensa, ameaça ou raiva evidente (gritos em maiúsculas, "ladrões", "que saco")?',
    },
  ],

  fluxo: {
    colunas: 'tipo',
    rotuloItem: 'Resposta do cliente',
    rotuloFila: 'Respostas ao lembrete',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: LIMIAR, rotulo: 'Atendente confere', icone: '🎧' },
    cartao: { titulo: 'nome', texto: 'resposta', meta: 'hora', valor: 'valor', avatar: 'avatar' },
    entrada: { placeholder: 'Cole uma resposta de cliente ao lembrete de pagamento…', botao: 'Ler resposta' },
    rotuloFeitos: 'respostas',
  },
  textoItem: (r) => `Cliente: ${r.nome} · fatura de ${brl(r.valor)} vencida em 10/10\nResposta ao lembrete: «${r.resposta}»`,

  // a próxima mensagem sai do MODELO da raia (texto da empresa); o Jev só escolheu a raia
  cartaoExtra(item, resp) {
    const a = resp.tipo;
    if (!a) return '';
    const conf = Math.max(...Object.values(a.probabilities || { x: 0 }));
    const nome = String(item.nome || 'tudo bem').split(' ')[0];
    if (resp.agressivo && resp.agressivo.noul >= AGRESSIVO) return caixa('#f87171', '🧯 <b>Régua pausada:</b> um atendente sênior responde, nada automático.');
    if (conf < LIMIAR) return caixa('#94a3b8', '🎧 <b>Atendente confere</b> antes de enviar qualquer coisa.');
    const m = MODELOS[a.choice];
    return m ? caixa('var(--mj-acento)', `✉️ <b>Próxima:</b> ${esc(m(nome))}`) : '';
  },
  aoDecidir(item, resp, extra) {
    if (resp.tipo && resp.tipo.choice === 'promessa') extra.promessas = (extra.promessas || 0) + 1;
    if (resp.agressivo && resp.agressivo.noul >= AGRESSIVO) extra.pausadas = (extra.pausadas || 0) + 1;
  },
  resumoExtra(extra) {
    return [
      { rotulo: 'promessas de pagamento', valor: String(extra.promessas || 0) },
      { rotulo: 'régua pausada (agressivo)', valor: String(extra.pausadas || 0) },
    ];
  },

  dados: [
    { id: 'r1', nome: 'Lúcia Ferreira', avatar: '👩', hora: '09:02', valor: 109.9, resposta: 'Pago na sexta sem falta, recebo dia 23 😊', esperado: { tipo: 'promessa', agressivo: false } },
    { id: 'r2', nome: 'Marcos Paulo', avatar: '🧔', hora: '09:05', valor: 109.9, resposta: 'Já paguei ontem pelo Pix, vou mandar o comprovante aqui', esperado: { tipo: 'ja_pagou', agressivo: false } },
    { id: 'r3', nome: 'Sandra Melo', avatar: '👩‍🦳', hora: '09:11', valor: 189.9, resposta: 'Essa fatura veio R$ 189,90 e o meu plano é de R$ 109,90. Não vou pagar isso não', esperado: { tipo: 'contestacao', agressivo: false } },
    { id: 'r4', nome: 'Jefferson Alves', avatar: '🧑', hora: '09:14', valor: 109.9, resposta: 'Fui demitido mês passado, tô sem condição agora. Dá pra parcelar?', esperado: { tipo: 'dificuldade', agressivo: false } },
    { id: 'r5', nome: 'Rogério Lima', avatar: '❔', hora: '09:20', valor: 109.9, resposta: 'Quem é? Não conheço nenhum Rogério', esperado: { tipo: 'numero_errado' } },
    { id: 'r6', nome: 'Cláudio Souza', avatar: '😡', hora: '09:26', valor: 109.9, resposta: 'Vocês são uns LADRÕES, a internet caiu a semana inteira e ainda querem cobrar? Vou no Procon amanhã', esperado: { tipo: 'contestacao', agressivo: true } },
    { id: 'r7', nome: 'Tatiane Rocha', avatar: '🙂', hora: '09:31', valor: 109.9, resposta: 'ok', esperado: { tipo: 'outro', agressivo: false } },
    { id: 'r8', nome: 'Vânia Couto', avatar: '👩‍🦱', hora: '09:38', valor: 109.9, resposta: 'Consigo pagar metade agora e metade dia 5, pode ser?', esperado: { tipo: 'dificuldade' } },
    { id: 'r21', nome: 'Ivone Carvalho', avatar: '🤨', hora: '09:41', valor: 109.9, resposta: 'Tá, mas vai ter juros? Se tiver multa eu não pago' },
    { id: 'r9', nome: 'Bruno Teixeira', avatar: '🧑‍🦱', hora: '09:44', valor: 109.9, resposta: 'manda o boleto atualizado que eu pago hj', esperado: { tipo: 'promessa' } },
    { id: 'r10', nome: 'Regina Alves', avatar: '👵', hora: '09:51', valor: 109.9, resposta: 'Cancelei o serviço em setembro, tenho até o protocolo 2025-88123. Não devo nada', esperado: { tipo: 'contestacao' } },
    { id: 'r11', nome: 'Pedro Henrique', avatar: '🧳', hora: '10:02', valor: 109.9, resposta: 'Tô viajando, volto dia 2 e resolvo', esperado: { tipo: 'promessa' } },
    { id: 'r12', nome: 'Simone Ribeiro', avatar: '👩‍💼', hora: '10:07', valor: 109.9, resposta: 'Quero falar com um atendente de verdade', esperado: { tipo: 'outro' } },
    { id: 'r13', nome: 'Fábio Nunes', avatar: '😤', hora: '10:15', valor: 109.9, resposta: 'Para de me mandar mensagem, que saco!!! Já falei que pago dia 15', esperado: { tipo: 'promessa', agressivo: true } },
    { id: 'r14', nome: 'Kátia Lemos', avatar: '📎', hora: '10:22', valor: 109.9, resposta: 'Mandei o comprovante ontem pro e-mail do financeiro, vocês não leem?', esperado: { tipo: 'ja_pagou' } },
    { id: 'r15', nome: 'Juliano Prates', avatar: '🙅', hora: '10:30', valor: 109.9, resposta: 'Não sou cliente de vocês, devem ter cadastrado errado. Me tirem dessa lista', esperado: { tipo: 'numero_errado' } },
    { id: 'r16', nome: 'Renata Dias', avatar: '🙃', hora: '10:41', valor: 109.9, resposta: 'Hahaha boa piada, internet que não funciona e conta que chega certinho', esperado: { tipo: ['contestacao', 'outro'] } },
    { id: 'r22', nome: 'Otávio Reis', avatar: '🤷', hora: '10:44', valor: 109.9, resposta: 'pago quando der' },
    { id: 'r17', nome: 'Mauro Lopes', avatar: '👨', hora: '10:48', valor: 109.9, resposta: 'Recebi sim, obrigado pelo lembrete! Pago amanhã cedo', esperado: { tipo: 'promessa', agressivo: false } },
    { id: 'r18', nome: 'Doralice Santos', avatar: '👩‍🦰', hora: '10:55', valor: 109.9, resposta: 'Meu marido que paga essas contas, vou repassar pra ele', esperado: { tipo: 'outro' } },
    { id: 'r19', nome: 'Giovana Prado', avatar: '😔', hora: '11:03', valor: 109.9, resposta: 'Tô desempregada e com dois filhos, não tenho como pagar esse mês', esperado: { tipo: 'dificuldade', agressivo: false } },
    { id: 'r20', nome: 'Edson Pereira', avatar: '🏦', hora: '11:10', valor: 109.9, resposta: 'Tá no débito automático, deve ter saído hoje', esperado: { tipo: 'ja_pagou' } },
  ],
};

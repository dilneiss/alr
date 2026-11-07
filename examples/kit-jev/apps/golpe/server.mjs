// Detector de Golpes — cole qualquer mensagem (WhatsApp, SMS, e-mail) e o Jev diz, em ~300 ms,
// se é golpe, de que tipo, quais sinais de alerta aparecem e o que fazer. Uma única chamada, 12 perguntas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError, top } from '../../shared/server/kit.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime'); // gerado em execução (fora do deploy)
fs.mkdirSync(DATA_DIR, { recursive: true });
const STATS = path.join(DATA_DIR, 'stats.json');
let stats = { analises: 0, golpes: 0, porTipo: {} };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS, 'utf8')) }; } catch {}
const saveStats = () => fs.writeFile(STATS, JSON.stringify(stats), () => {});

const TIPOS = {
  falso_parente: 'Falso parente/amigo: diz ter trocado de número e pede dinheiro ou favor urgente',
  falso_banco: 'Falsa central do banco/cartão: alerta de compra, bloqueio ou pede para ligar/confirmar dados',
  taxa_entrega: 'Falsa taxa de entrega/Correios/alfândega: encomenda retida até pagar uma taxa',
  emprego_falso: 'Falso emprego ou "tarefas pagas": ganhar dinheiro curtindo vídeos, avaliando produtos etc.',
  investimento_milagroso: 'Investimento milagroso: lucro garantido, robô de trading, pirâmide, cripto',
  roubo_de_conta: 'Roubo de conta: pede código de verificação/SMS, senha ou acesso ao WhatsApp/app',
  premio_falso: 'Prêmio/sorteio falso: "você ganhou", mas precisa pagar taxa para liberar',
  boleto_falso: 'Boleto ou cobrança falsa: dívida, acordo, Serasa, conta a pagar com desconto urgente',
  romance: 'Golpe do romance/amizade virtual: relacionamento online que termina pedindo dinheiro',
  sequestro_falso: 'Falso sequestro ou emergência: ameaça contra familiar e exige pagamento',
  outro_golpe: 'Outro tipo de golpe ou fraude',
  nao_e_golpe: 'Não é golpe: mensagem legítima, pessoal ou comercial sem intenção de enganar',
};
const TIPO_LABEL = {
  falso_parente: 'Falso parente / "troquei de número"', falso_banco: 'Falsa central do banco', taxa_entrega: 'Falsa taxa de entrega',
  emprego_falso: 'Falso emprego / tarefas pagas', investimento_milagroso: 'Investimento milagroso', roubo_de_conta: 'Roubo de conta (código/senha)',
  premio_falso: 'Prêmio falso', boleto_falso: 'Boleto / cobrança falsa', romance: 'Golpe do romance', sequestro_falso: 'Falso sequestro',
  outro_golpe: 'Outro golpe', nao_e_golpe: 'Não é golpe',
};
const SINAIS = [
  ['sinal_urgencia', 'Pressão de tempo / urgência', 'A mensagem cria urgência ou pressão de tempo (ex.: "hoje", "em 24h", "imediatamente", "últimas vagas")?'],
  ['sinal_dinheiro', 'Pede dinheiro, PIX ou taxa', 'A mensagem pede dinheiro, PIX, transferência, depósito, pagamento de taxa ou de boleto?'],
  ['sinal_dados', 'Pede código, senha ou dados', 'A mensagem pede código de verificação, senha, token, dados do cartão, CPF ou outros dados pessoais?'],
  ['sinal_link', 'Link ou site suspeito', 'A mensagem contém um link ou pede para acessar um site que não parece ser o oficial da empresa citada?'],
  ['sinal_imitacao', 'Usa nome de alguém conhecido', 'A mensagem afirma vir de um banco, empresa, órgão público, marca, ou de um parente/amigo com número novo, e usa essa identidade para pedir algo ou dar um alerta?'],
  ['sinal_bom_demais', 'Bom demais para ser verdade', 'A mensagem promete ganho, prêmio, lucro, emprego fácil ou desconto bom demais para ser verdade?'],
  ['sinal_novo_numero', 'Troca de número ou de canal', 'A mensagem diz que a pessoa trocou de número/conta ou tenta levar a conversa para outro canal?'],
  ['sinal_ameaca', 'Ameaça ou medo', 'A mensagem usa ameaça ou medo (bloqueio, desativação, processo, prisão, nome sujo, perigo a um familiar)?'],
];
const ACOES = {
  nao_responder_bloquear: 'Não responda, bloqueie o contato e denuncie a mensagem',
  confirmar_por_outro_canal: 'Ligue para a pessoa no número antigo (ou por vídeo) antes de qualquer PIX',
  contatar_banco_oficial: 'Fale com o banco apenas pelo app oficial ou pelo número atrás do cartão',
  nao_clicar_link: 'Não clique no link; acesse o site oficial digitando o endereço você mesmo',
  nunca_passar_codigo: 'Nunca informe códigos de verificação ou senhas; ative a verificação em duas etapas',
  desconfiar_promessa: 'Desconfie: lucro garantido e prêmio que exige taxa não existem',
  pode_responder: 'Parece seguro: pode responder normalmente, com o cuidado de sempre',
};
const ACAO_LABEL = {
  nao_responder_bloquear: 'Não responda. Bloqueie e denuncie.', confirmar_por_outro_canal: 'Confirme por outro canal antes de pagar.',
  contatar_banco_oficial: 'Fale com o banco só pelos canais oficiais.', nao_clicar_link: 'Não clique no link.',
  nunca_passar_codigo: 'Nunca passe códigos ou senhas.', desconfiar_promessa: 'Promessa boa demais = golpe.', pode_responder: 'Parece seguro.',
};
const ACAO_DETALHE = {
  nao_responder_bloquear: 'Golpistas testam quem responde. Não interaja, bloqueie o número e use "Denunciar" no WhatsApp. Se já pagou, avise seu banco na hora e registre um boletim de ocorrência.',
  confirmar_por_outro_canal: 'Ligue para o número antigo da pessoa ou faça uma chamada de vídeo. Faça uma pergunta que só ela saberia. Parente de verdade entende a demora.',
  contatar_banco_oficial: 'Bancos não pedem senha, código ou transferência por mensagem. Abra o app do banco ou ligue para o número impresso no verso do cartão — nunca para o número da mensagem.',
  nao_clicar_link: 'Links de golpe imitam sites oficiais com endereços parecidos. Digite o endereço oficial no navegador ou use o aplicativo da empresa.',
  nunca_passar_codigo: 'O código de 6 dígitos é a chave da sua conta. Quem pede está tentando roubá-la. Ative a verificação em duas etapas em Configurações → Conta.',
  desconfiar_promessa: 'Ninguém garante lucro e nenhum prêmio real cobra taxa para liberar. Pesquise o nome da empresa + "golpe" antes de qualquer pagamento.',
  pode_responder: 'Não encontramos sinais de golpe. Ainda assim: nunca envie códigos, senhas ou PIX sem confirmar quem está do outro lado.',
};

const EXEMPLOS = [
  { rotulo: '👩 "Mãe, troquei de número"', texto: 'Oi mãe, troquei de número, esse aqui é meu novo zap, salva aí. Tô precisando de um favor urgente, consegue fazer um pix de 1.850 pra mim agora? Amanhã cedo te devolvo, é que meu app do banco travou' },
  { rotulo: '🏦 Central do banco', texto: 'BRADESCO INFORMA: Detectamos uma compra de R$ 2.349,90 no seu cartão final 8812. Se não reconhece esta compra, ligue imediatamente para 0800 591 2210 ou responda CANCELAR para bloquear.' },
  { rotulo: '📦 Taxa dos Correios', texto: 'CORREIOS: sua encomenda BR882931774 está retida por falta de pagamento da taxa alfandegária de R$ 36,90. Regularize em até 24h para evitar a devolução: https://correios-rastreio.encomenda-br.com/pagar' },
  { rotulo: '💼 Emprego fácil', texto: 'Olá! Somos da agência Digital Mídia e estamos contratando para trabalho remoto: ganhe de R$ 300 a R$ 800 por dia só curtindo vídeos no YouTube. Sem experiência. Chama no WhatsApp para começar ainda hoje!' },
  { rotulo: '📈 Robô de trading', texto: 'Invista R$ 500 hoje e receba R$ 5.000 em 7 dias com nosso robô de trading com inteligência artificial. Lucro GARANTIDO. Últimas 3 vagas da turma, me chama no privado!' },
  { rotulo: '🔐 Código do WhatsApp', texto: 'Suporte WhatsApp: sua conta será desativada em 24 horas por violação dos termos de uso. Para manter sua conta ativa, informe o código de 6 dígitos que enviamos por SMS.' },
  { rotulo: '🎁 Prêmio com taxa', texto: 'PARABÉNS!!! Seu CPF foi sorteado no programa Nota Fiscal Premiada. Para liberar o prêmio de R$ 8.700,00 basta pagar a taxa de liberação de R$ 97,00 via PIX para a chave abaixo.' },
  { rotulo: '📄 Limpa nome', texto: 'Serasa Limpa Nome: sua dívida de R$ 4.380,00 pode ser quitada por apenas R$ 199,00 SOMENTE HOJE. Pague o boleto no link para limpar seu nome: serasa-acordo.online/boleto' },
  { rotulo: '🍽️ Almoço de sábado', texto: 'Oi, tudo bem? Só confirmando nosso almoço de sábado às 13h naquele restaurante da esquina. Leva a Ju também! Beijos' },
  { rotulo: '💳 Compra aprovada', texto: 'Nubank: Compra aprovada de R$ 42,90 em PADARIA SAO JORGE no cartão final 4421. Se não reconhecer, acesse o app do Nubank.' },
  { rotulo: '🩺 Consulta marcada', texto: 'Olá, Marina! Sua consulta com a Dra. Paula Andrade está confirmada para 12/10 às 15h. Para remarcar, é só responder esta mensagem. Clínica Bem Viver.' },
];

function buildQuestions() {
  const q = {
    e_golpe: { type: 'noul', instructions: 'Esta mensagem é uma tentativa de golpe, fraude ou phishing contra quem a recebeu?', criteria: { true: 'É golpe: tenta enganar a vítima para obter dinheiro, dados, códigos ou acesso', false: 'Mensagem legítima ou inofensiva, sem intenção de enganar' } },
    tipo: { type: 'choice', instructions: 'Qual tipo de golpe esta mensagem representa? Se ela não for golpe, escolha nao_e_golpe.', criteria: TIPOS },
    gravidade: { type: 'score', instructions: 'Qual o potencial de prejuízo se a pessoa fizer o que a mensagem pede?', criteria: [
      'Nenhum: mensagem inofensiva do dia a dia',
      'Baixo: propaganda, spam ou incômodo, sem risco real',
      'Médio: pode expor dados pessoais ou levar a um site suspeito',
      'Alto: pode causar perda de dinheiro ou da conta',
      'Crítico: pede PIX/pagamento imediato ou códigos de acesso, sob pressão',
    ] },
    acao: { type: 'choice', instructions: 'Qual é a orientação mais útil para quem recebeu esta mensagem?', criteria: ACOES },
  };
  for (const [id, , instr] of SINAIS) q[id] = { type: 'noul', instructions: instr };
  return q;
}
const QUESTIONS = buildQuestions();

const app = createApp({ name: 'golpe', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/exemplos', () => ({ ok: true, exemplos: EXEMPLOS, tipos: TIPO_LABEL }));
app.get('/api/stats', () => ({ ok: true, ...stats }));

app.post('/api/analisar', async ({ body, jev }) => {
  const texto = String(body.texto || '').trim();
  if (texto.length < 8) throw new HttpError(400, 'Cole uma mensagem com pelo menos algumas palavras.');
  if (texto.length > 4000) throw new HttpError(400, 'Mensagem longa demais (máximo 4.000 caracteres).');
  const r = await jev({ state: { mensagem_recebida: texto, contexto: 'Mensagem recebida por WhatsApp, SMS ou e-mail, no Brasil.' }, questions: QUESTIONS, cache: !!body.exemplo });
  const a = r.answers;
  const p = a.e_golpe.noul;
  const tipoTop = top(a.tipo.probabilities);
  const veredito = p >= 0.7 ? 'golpe' : p >= 0.35 ? 'suspeito' : 'seguro';
  const sinais = SINAIS.map(([id, label]) => ({ id, label, p: a[id]?.noul ?? 0 })).sort((x, y) => y.p - x.p);
  if (!body.parcial) {
    stats.analises++; if (veredito === 'golpe') { stats.golpes++; stats.porTipo[a.tipo.choice] = (stats.porTipo[a.tipo.choice] || 0) + 1; }
    saveStats();
  }
  return {
    ok: true,
    veredito, prob_golpe: p,
    tipo: { escolha: a.tipo.choice, label: TIPO_LABEL[a.tipo.choice], confianca: a.tipo.confidence, probabilidades: a.tipo.probabilities, ranking: tipoTop.slice(0, 5).map(([k, v]) => ({ id: k, label: TIPO_LABEL[k], p: v })) },
    gravidade: a.gravidade,
    sinais,
    acao: { escolha: a.acao.choice, titulo: ACAO_LABEL[a.acao.choice], detalhe: ACAO_DETALHE[a.acao.choice], probabilidades: a.acao.probabilities },
    latency_ms: r.latency_ms, cost: r.cost, n_perguntas: Object.keys(QUESTIONS).length, cached: r.cached,
    _jev: r.debug,
  };
}, { rate: 50 });

app.start(+(process.env.PORT || 4112));

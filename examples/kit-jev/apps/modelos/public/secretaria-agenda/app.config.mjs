// Secretária de Agenda — lê cada convite de reunião e decide: aceitar, propor outro horário, delegar, pedir a pauta ou recusar.
// Para adaptar: troque as regras da pessoa (editáveis na tela), a AGENDA já marcada e os convites; o conflito é o código que calcula.
const AGENDA = [
  { dia: '2026-10-21', das: '15:00', ate: '16:00', oque: 'dentista' },
  { dia: '2026-10-22', das: '10:00', ate: '11:00', oque: 'apresentação da campanha de Natal para a Óticas Lume' },
  { dia: '2026-10-23', das: '14:00', ate: '18:00', oque: 'tarde reservada com o filho' },
  { dia: '2026-10-26', das: '09:00', ate: '12:00', oque: 'oficina de planejamento 2027 com os sócios' },
];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const min = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const hora = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
const dur = (n) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? String(n % 60).padStart(2, '0') : ''}` : `${n} min`);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// a conta fica com o código: o convite choca com algum compromisso já marcado?
function choque(dia, das, duracao) {
  const i = min(das), f = i + duracao;
  return AGENDA.find((x) => x.dia === dia && i < min(x.ate) && min(x.das) < f) || null;
}
const convite = (c) => {
  const [, mes, dd] = c.dia.split('-');
  const ch = choque(c.dia, c.das, c.duracao);
  return {
    ...c,
    quando: `${DIAS[new Date(c.dia + 'T12:00:00').getDay()]} ${dd}/${mes} · ${hora(min(c.das))} · ${dur(c.duracao)}`,
    choque: ch ? `${ch.oque} (${hora(min(ch.das))}–${hora(min(ch.ate))})` : '',
    conflito: ch ? `sim — bate com "${ch.oque}", das ${hora(min(ch.das))} às ${hora(min(ch.ate))}` : 'não',
  };
};

export default {
  id: 'secretaria-agenda',
  titulo: 'Secretária de Agenda',
  emoji: '🗓️',
  categoria: 'atendimento',
  ordem: 14,
  resumo: 'Lê cada convite de reunião com as suas regras e decide: aceitar, propor outro horário, delegar, pedir a pauta ou recusar.',
  descricao: 'O código confere a agenda e diz se o convite bate com outro compromisso; o Jev lê quem convida, a pauta e as suas regras escritas em português e escolhe o destino. O que vier com confiança baixa fica para você decidir, e as regras mudam com um texto.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#9333ea', acento2: '#fbbf24' },

  contexto: {
    pessoa: 'Marina Torres, sócia-diretora da Faro Digital, agência de marketing com 12 pessoas',
    hoje: 'terça-feira, 20/10/2026',
    regras: '- Aceito: clientes, possíveis clientes, os sócios e a entrevista final de cargo sênior, quando o convite tem pauta e não tem conflito com a agenda.\n- Divulgação da agência (podcast, palestra, imprensa) também é importante para mim.\n- Se é importante mas tem conflito com a agenda: proponho outro horário.\n- Reunião operacional, de rotina ou com fornecedor atual, em que não sou eu quem decide: delego para a Júlia, coordenadora de projetos.\n- Vendedor ou ferramenta que ninguém pediu, webinar genérico e evento que não traz nada para a agência: recuso.\n- Convite sem pauta (mesmo de cliente), de quem eu não conheço ou que não diz o que esperam de mim: peço a pauta antes de decidir.',
    agenda_ja_marcada: AGENDA.map((a) => `${a.dia} ${a.das}–${a.ate}: ${a.oque}`),
  },
  editavel: { campo: 'regras', rotulo: 'Regras da Marina (o Jev lê isto)', botao: 'Regras', ajuda: 'Teste: troque a regra de delegar por "não delego nada, eu mesma vou" ou diga que aceita cliente mesmo sem pauta, e aperte ▶ de novo.' },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', titulo: 'Decisão',
      pergunta: 'O que a Marina faz com este convite? Siga as regras dela (contexto.regras): são elas que dizem quando aceitar, delegar, pedir a pauta ou recusar. Se o convite é importante para ela mas o campo "Conflito com a agenda" diz "sim", não dá para aceitar: proponha outro horário.',
      opcoes: [
        { id: 'aceitar', rotulo: 'Aceitar', icone: '✅', cor: '#22c55e', desc: 'ir à reunião: as regras mandam aceitar este tipo de convite e NÃO há conflito com a agenda' },
        { id: 'propor_outro_horario', rotulo: 'Propor outro horário', icone: '🔁', cor: '#f59e0b', desc: 'a reunião importa para a Marina, mas TEM conflito com a agenda: sugerir outro dia ou horário' },
        { id: 'delegar', rotulo: 'Delegar para a Júlia', icone: '👥', cor: '#60a5fa', desc: 'mandar a Júlia no lugar dela, quando as regras dizem que não é a Marina quem precisa estar (ex.: rotina, operacional)' },
        { id: 'perguntar', rotulo: 'Pedir a pauta', icone: '❓', cor: '#a78bfa', desc: 'responder pedindo a pauta antes de decidir, quando as regras pedem (ex.: convite vago ou de desconhecido)' },
        { id: 'recusar', rotulo: 'Recusar', icone: '🚫', cor: '#f87171', desc: 'dizer não, quando as regras mandam recusar (ex.: vendedor que ninguém pediu, webinar genérico)' },
      ],
    },
    {
      id: 'preparar', tipo: 'noul', titulo: 'Preparar material', rotulo: 'preparar material', icone: '📎', tom: 'acento', limiar: 0.6,
      pergunta: 'Se a Marina for a esta reunião, ela precisa levar algo pronto (números, apresentação, proposta, peças para aprovar)?',
    },
  ],

  fluxo: {
    colunas: 'acao',
    rotuloItem: 'Convite',
    rotuloFila: 'Convites chegando',
    lote: 4,
    ritmo: 5500,
    humano: { limiar: 0.8, rotulo: 'Marina decide', icone: '🙋‍♀️' },
    cartao: { titulo: 'assunto', subtitulo: 'de', texto: 'descricao', meta: 'quando', avatar: 'avatar' },
    entrada: { placeholder: 'Cole um convite (quem, assunto, quando, pauta) e veja o que a secretária faria…', botao: 'Decidir' },
    rotuloFeitos: 'convites',
  },
  // o que vai ao Jev: o convite inteiro + o conflito que o código calculou
  textoItem: (c) => `De: ${c.de}\nAssunto: ${c.assunto}\nQuando: ${c.quando}\nPauta: ${c.descricao || '(sem descrição)'}\nConflito com a agenda: ${c.conflito}`,
  cartaoExtra(item) {
    return item.choque ? `<span class="mj-chip ruim" title="calculado pelo código, comparando com a agenda">⚠ choca com: ${esc(item.choque)}</span>` : '';
  },

  dados: [
    convite({ id: 'c1', de: 'Rafael (Óticas Lume — cliente)', avatar: '👓', assunto: 'Aprovação final das peças de Natal', dia: '2026-10-22', das: '11:00', duracao: 60, descricao: 'Logo depois da apresentação: aprovar as peças finais com a diretoria da Lume para a campanha ir ao ar dia 1º.', esperado: { acao: 'aceitar', preparar: true } }),
    convite({ id: 'c2', de: 'Carlos Braga (Construtora Base Forte — cliente)', avatar: '🏗️', assunto: 'Kickoff do site novo', dia: '2026-10-22', das: '10:30', duracao: 90, descricao: 'Alinhar escopo, cronograma e acessos do site novo da construtora com a equipe de vocês.', esperado: { acao: 'propor_outro_horario' } }),
    convite({ id: 'c3', de: 'Equipe de mídia', avatar: '📊', assunto: 'Daily do time de mídia', dia: '2026-10-21', das: '09:15', duracao: 15, descricao: 'Acompanhamento diário das campanhas no ar: o que subiu, o que pausou, o que precisa de verba.', esperado: { acao: 'delegar', preparar: false } }),
    convite({ id: 'c4', de: 'AdsMax (plataforma de anúncios)', avatar: '📣', assunto: 'Webinar: 7 segredos do tráfego pago em 2027', dia: '2026-10-27', das: '19:00', duracao: 60, descricao: 'Aula gratuita com especialistas. Garanta a sua vaga!', esperado: { acao: 'recusar', preparar: false } }),
    convite({ id: 'c5', de: 'Rodrigo Alves', avatar: '👤', assunto: 'Bate-papo rápido', dia: '2026-10-21', das: '11:00', duracao: 30, descricao: '', esperado: { acao: 'perguntar' } }),
    convite({ id: 'c6', de: 'Paulo Faro (sócio)', avatar: '🤝', assunto: 'Reunião de sócios — orçamento de 2027', dia: '2026-10-21', das: '15:00', duracao: 60, descricao: 'Fechar a previsão de receita e as contratações do ano que vem.', esperado: { acao: 'propor_outro_horario', preparar: true } }),
    convite({ id: 'c7', de: 'RH — Camila', avatar: '🧑‍💼', assunto: 'Entrevista final: designer sênior', dia: '2026-10-27', das: '14:00', duracao: 45, descricao: 'Última etapa com a candidata finalista para a vaga de designer sênior.', esperado: { acao: 'aceitar' } }),
    convite({ id: 'c8', de: 'Gráfica Ponto Alto (fornecedor atual)', avatar: '🖨️', assunto: 'Apresentação da tabela 2027', dia: '2026-10-28', das: '10:00', duracao: 30, descricao: 'Mostrar os novos preços de impressão e os prazos para o ano que vem.', esperado: { acao: 'delegar' } }),
    convite({ id: 'c9', de: 'Pedro Sales (Rede de Academias Pulso)', avatar: '🏋️', assunto: 'Diagnóstico de marketing para a rede', dia: '2026-10-28', das: '16:00', duracao: 60, descricao: 'Somos 14 academias e queremos entender como a agência pode cuidar do nosso Instagram e dos anúncios.', esperado: { acao: 'aceitar' } }),
    convite({ id: 'c10', de: 'VendaMais CRM', avatar: '📞', assunto: 'Demonstração do CRM VendaMais', dia: '2026-10-22', das: '15:00', duracao: 30, descricao: 'Uma demonstração rápida para mostrar como o nosso CRM pode ajudar a sua agência.', esperado: { acao: 'recusar', preparar: false } }),
    convite({ id: 'c11', de: 'Carlos Braga (Construtora Base Forte — cliente)', avatar: '🏗️', assunto: 'Alinhamento', dia: '2026-10-29', das: '10:00', duracao: 60, descricao: '', esperado: { acao: 'perguntar' } }),
    convite({ id: 'c12', de: 'Leo (atendimento)', avatar: '🗂️', assunto: 'Status semanal da conta Base Forte', dia: '2026-10-23', das: '09:00', duracao: 30, descricao: 'Revisar as entregas da semana e os próximos passos da conta.', esperado: { acao: 'delegar' } }),
    convite({ id: 'c13', de: 'Podcast Empreender Hoje', avatar: '🎙️', assunto: 'Entrevista sobre a agência', dia: '2026-10-23', das: '15:00', duracao: 60, descricao: 'Conversa de 40 minutos sobre como a Faro Digital cresceu e o que vem por aí. Gravação remota.', esperado: { acao: 'propor_outro_horario' } }),
    convite({ id: 'c14', de: 'Mariana Costa', avatar: '👩', assunto: 'Proposta de parceria', dia: '2026-10-27', das: '11:00', duracao: 45, descricao: 'Oi, Marina! Tenho uma proposta que pode interessar à Faro. Podemos conversar?', esperado: { acao: 'perguntar' } }),
    convite({ id: 'c15', de: 'Equipe de criação', avatar: '🎨', assunto: 'Escolha da paleta do catálogo da Lume', dia: '2026-10-26', das: '15:00', duracao: 30, descricao: 'Escolher entre as 3 paletas de cor do catálogo impresso.', esperado: { acao: 'delegar' } }),
    convite({ id: 'c16', de: 'Associação Comercial do Bairro', avatar: '☕', assunto: 'Café de networking com empresários', dia: '2026-10-29', das: '08:00', duracao: 90, descricao: 'Café da manhã mensal com 40 empresários da região. Traga seus cartões!' }),
    convite({ id: 'c17', de: 'Estúdio Lente Viva', avatar: '📷', assunto: 'Conheça o nosso estúdio', dia: '2026-10-30', das: '10:00', duracao: 60, descricao: 'Somos um estúdio de fotografia novo e queremos apresentar o nosso portfólio para a agência.', esperado: { acao: 'recusar' } }),
    convite({ id: 'c18', de: 'Fernanda (Óticas Lume — cliente)', avatar: '👓', assunto: 'Resultado da campanha de Dia dos Pais', dia: '2026-10-26', das: '10:00', duracao: 60, descricao: 'Apresentar os números da campanha e discutir a verba do próximo trimestre.', esperado: { acao: 'propor_outro_horario' } }),
    convite({ id: 'c19', de: 'Luiza Tanaka (Café Aroma — cliente)', avatar: '☕', assunto: 'Briefing da nova embalagem', dia: '2026-10-29', das: '14:00', duracao: 60, descricao: 'Passar o briefing da linha de cafés especiais que lança em março.', esperado: { acao: 'aceitar' } }),
    convite({ id: 'c20', de: 'Leo (atendimento)', avatar: '🗂️', assunto: 'Revisar legendas da Base Forte', dia: '2026-10-27', das: '16:30', duracao: 20, descricao: 'Revisar duas legendas com a equipe antes de publicar.', esperado: { acao: 'delegar' } }),
  ],
};

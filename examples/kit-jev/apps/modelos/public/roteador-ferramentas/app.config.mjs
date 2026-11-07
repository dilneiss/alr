// Roteador de Ferramentas — antes de o LLM ler 16 definições de ferramenta (MCP), o Jev escolhe a que resolve o pedido.
// Para adaptar: troque FERRAMENTAS pelas ferramentas do seu agente (com o tamanho de cada definição em tokens) e os pedidos de exemplo.
const FERRAMENTAS = [
  { id: 'agenda_criar_evento', rotulo: 'agenda.criar_evento', icone: '📅', tokens: 410, desc: 'marcar algo novo na agenda: reunião, call, visita ou compromisso com dia e hora' },
  { id: 'agenda_consultar', rotulo: 'agenda.consultar', icone: '🗓️', tokens: 290, desc: 'ver o que já está marcado: horários livres, próximos compromissos' },
  { id: 'email_enviar', rotulo: 'email.enviar', icone: '✉️', tokens: 380, desc: 'escrever e mandar um e-mail para alguém' },
  { id: 'email_buscar', rotulo: 'email.buscar', icone: '📥', tokens: 340, desc: 'procurar e-mails: quem mandou, se alguém respondeu, um anexo recebido' },
  { id: 'whatsapp_enviar', rotulo: 'whatsapp.enviar', icone: '💬', tokens: 300, desc: 'mandar mensagem de WhatsApp ("zap") para um contato' },
  { id: 'crm_buscar_cliente', rotulo: 'crm.buscar_cliente', icone: '👤', tokens: 360, desc: 'consultar cadastro, telefone e histórico de compras de um cliente' },
  { id: 'crm_atualizar_negocio', rotulo: 'crm.atualizar_negocio', icone: '📈', tokens: 450, desc: 'mudar a etapa, o valor ou o responsável de uma negociação no funil de vendas' },
  { id: 'financeiro_emitir_boleto', rotulo: 'financeiro.emitir_boleto', icone: '🧾', tokens: 520, desc: 'gerar boleto ou cobrança para um cliente pagar' },
  { id: 'financeiro_saldo', rotulo: 'financeiro.saldo', icone: '🏦', tokens: 270, desc: 'ver saldo, extrato, entradas e saídas da conta da empresa' },
  { id: 'nota_fiscal_emitir', rotulo: 'nota_fiscal.emitir', icone: '🧮', tokens: 610, desc: 'emitir nota fiscal de serviço ou de produto' },
  { id: 'estoque_consultar', rotulo: 'estoque.consultar', icone: '📦', tokens: 310, desc: 'ver quanto tem de um produto, cor ou tamanho no estoque' },
  { id: 'drive_buscar_arquivo', rotulo: 'drive.buscar_arquivo', icone: '🗂️', tokens: 330, desc: 'achar contrato, documento, planilha ou apresentação guardado no drive' },
  { id: 'planilha_atualizar', rotulo: 'planilha.atualizar', icone: '📊', tokens: 480, desc: 'escrever ou mudar valores numa planilha que já existe' },
  { id: 'suporte_abrir_chamado', rotulo: 'suporte.abrir_chamado', icone: '🛠️', tokens: 390, desc: 'abrir chamado para o TI: sistema fora do ar, defeito, acesso bloqueado' },
  { id: 'web_pesquisar', rotulo: 'web.pesquisar', icone: '🌐', tokens: 260, desc: 'pesquisar na internet informação pública e atual: notícia, preço de mercado, endereço' },
  { id: 'redes_agendar_post', rotulo: 'redes.agendar_post', icone: '📣', tokens: 430, desc: 'agendar ou publicar post nas redes sociais da empresa' },
];
const NENHUMA = { id: 'nenhuma', rotulo: 'nenhuma (LLM sozinho)', icone: '🧠', desc: 'nenhuma ferramenta: o LLM responde sozinho (explicar, opinar, dar ideia, escrever um texto que não será enviado)' };
const TOTAL = FERRAMENTAS.reduce((s, f) => s + f.tokens, 0); // o que o LLM leria se recebesse todas
const TOKENS = Object.fromEntries(FERRAMENTAS.map((f) => [f.id, f.tokens]));
const fmtInt = (n) => new Intl.NumberFormat('pt-BR').format(Math.round(n || 0));
let acumulado = { pedidos: 0, economia: 0 };

export default {
  id: 'roteador-ferramentas',
  titulo: 'Roteador de Ferramentas',
  emoji: '🧰',
  categoria: 'construtores',
  ordem: 50,
  resumo: 'Antes de o LLM ler as 16 ferramentas do agente, o Jev escolhe em ~0,3 s a que resolve o pedido — e o contexto cai de milhares de tokens para centenas.',
  descricao: 'Agente com muitas ferramentas MCP gasta milhares de tokens só lendo a lista, e erra mais quando as opções se parecem. O Jev lê o pedido e passa ao LLM só a ferramenta certa; quando o pedido precisa de duas (gerar e enviar, consultar e marcar), passa as duas.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'agente',
  tema: { acento: '#b5523b', acento2: '#e8b04a' },
  origem: 'TypeSafe: cookbooks de function calling e de escolha de skill',

  contexto: {
    empresa: 'Estúdio Lumiar, agência de design e marketing com 12 pessoas; o assistente interno tem 16 ferramentas (MCP)',
    ferramentas: FERRAMENTAS.map((f) => `${f.rotulo}: ${f.desc}`),
  },

  decisoes: [
    {
      id: 'ferramenta', tipo: 'choice', titulo: 'Ferramenta',
      pergunta: 'Qual das ferramentas do assistente resolve o pedido? Se o pedido precisar de mais de uma, escolha a PRIMEIRA a usar. Regras: marcar algo novo → agenda.criar_evento; ver o que já está marcado → agenda.consultar; mandar e-mail → email.enviar; procurar e-mail ou saber se alguém respondeu → email.buscar; "zap" ou WhatsApp → whatsapp.enviar; sistema com defeito → suporte.abrir_chamado; o LLM resolve sem consultar nem mudar nada → nenhuma.',
      opcoes: [...FERRAMENTAS, NENHUMA].map((f) => ({ id: f.id, rotulo: f.rotulo, icone: f.icone, desc: f.desc })),
    },
    {
      id: 'precisa_varias', tipo: 'noul', titulo: 'Precisa de várias', rotulo: 'precisa de várias', icone: '🔗', tom: 'acento', limiar: 0.5,
      pergunta: 'O pedido exige mais de uma ferramenta em sequência (ex.: gerar um boleto E mandar para o cliente; consultar a agenda E marcar a reunião)?',
    },
    {
      // oculta na tela: aparece no painel "Contexto do LLM" quando o pedido precisa de duas ferramentas
      id: 'depois', tipo: 'choice', papel: 'oculto', titulo: 'Segunda ferramenta',
      pergunta: 'Se o pedido precisar de uma SEGUNDA ferramenta depois da primeira, qual é ela? Escolha "só uma" quando uma ferramenta basta.',
      opcoes: [{ id: 'so_uma', rotulo: 'só uma', desc: 'uma ferramenta basta para este pedido' }, ...FERRAMENTAS.map((f) => ({ id: f.id, rotulo: f.rotulo, desc: f.desc }))],
    },
  ],

  agente: {
    modo: 'roteador',
    veredito: 'ferramenta',
    titulo: 'Assistente interno · Estúdio Lumiar',
    subtitulo: 'o Jev escolhe a ferramenta antes de o LLM ler',
    rotuloPedido: 'Pedido da equipe',
    placeholder: 'Escreva um pedido (ex.: "tenho horário livre amanhã à tarde?") e veja qual ferramenta vai para o LLM…',
    ritmo: 2600,
  },

  // painel lateral: quanto do contexto do LLM o roteamento economiza
  aoDecidir(resp, entrada, ctx, cont) {
    const a = resp.ferramenta;
    if (!a) return '';
    const n = Object.values(cont || {}).reduce((s, x) => s + x, 0);
    if (n <= 1) acumulado = { pedidos: 0, economia: 0 }; // demonstração recomeçou
    const vao = a.choice === 'nenhuma' ? [] : [a.choice];
    // segunda ferramenta só quando os dois sinais concordam: "precisa de várias" e uma 2ª escolha válida
    const segunda = resp.depois && resp.depois.choice;
    if (resp.precisa_varias && resp.precisa_varias.noul >= 0.5 && TOKENS[segunda] && !vao.includes(segunda)) vao.push(segunda);
    const enviado = vao.reduce((s, id) => s + (TOKENS[id] || 0), 0);
    acumulado.pedidos++;
    acumulado.economia += TOTAL - enviado;
    const media = acumulado.economia / (acumulado.pedidos * TOTAL);
    const nomes = vao.length ? vao.map((id) => `<code>${FERRAMENTAS.find((f) => f.id === id).rotulo}</code>`).join(', ') : 'nenhuma ferramenta (resposta direta)';
    return `<div class="mj-widget mj-painel-box"><h4>Contexto do LLM <span class="tp">${FERRAMENTAS.length} ferramentas = ${fmtInt(TOTAL)} tokens</span></h4>
<div class="mj-contadores">
<div class="mj-contador"><b>${FERRAMENTAS.length} → ${vao.length}</b><span>ferramentas enviadas</span></div>
<div class="mj-contador"><b style="color:var(--mj-bom)">−${fmtInt(TOTAL - enviado)}</b><span>tokens neste pedido</span></div>
<div class="mj-contador"><b>${Math.round(media * 100)}%</b><span>menos contexto em ${acumulado.pedidos} ${acumulado.pedidos === 1 ? 'pedido' : 'pedidos'}</span></div>
</div>
<p class="dim" style="font-size:12.5px;margin:10px 0 0">Vai para o LLM: ${nomes}</p></div>`;
  },

  roteiros: [
    {
      titulo: 'Um dia na agência',
      pedidos: [
        { texto: 'Marca uma call com a Fernanda da Padaria Trigo Bom na quinta às 15h', esperado: { ferramenta: 'agenda_criar_evento', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'quanto a gente tem em caixa hoje?', esperado: { ferramenta: 'financeiro_saldo', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'manda um zap pro Carlos avisando que as artes saíram pra aprovação', esperado: { ferramenta: 'whatsapp_enviar', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'A Fernanda já respondeu meu e-mail do orçamento?', esperado: { ferramenta: 'email_buscar', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'Emite o boleto de R$ 1.200 da Padaria Trigo Bom e manda por e-mail pra eles', esperado: { ferramenta: 'financeiro_emitir_boleto', precisa_varias: true, depois: 'email_enviar' } },
        { texto: 'me explica a diferença entre lucro e faturamento, em 3 linhas', esperado: { ferramenta: 'nenhuma', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'Passa a negociação da Construtora Alvo pra "proposta enviada"', esperado: { ferramenta: 'crm_atualizar_negocio', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'vê se eu tenho horário livre amanhã à tarde e já marca a revisão com a Construtora Alvo', esperado: { ferramenta: 'agenda_consultar', precisa_varias: true, depois: 'agenda_criar_evento' } },
        { texto: 'o sistema de aprovação de artes tá fora do ar desde cedo 😤', esperado: { ferramenta: 'suporte_abrir_chamado', precisa_varias: false, depois: 'so_uma' } },
        { texto: 'deixa programado o post da promoção de Black Friday pra sexta às 9h', esperado: { ferramenta: 'redes_agendar_post', precisa_varias: false, depois: 'so_uma' } },
      ],
    },
  ],
};

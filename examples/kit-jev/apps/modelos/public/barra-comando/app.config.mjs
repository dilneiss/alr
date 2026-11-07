// Barra de Comando que Entende — um Ctrl+K que aceita qualquer frase e escolhe uma das ações reais do sistema de faturamento.
// Para adaptar: troque as ações (opções da decisão "acao") pelas do seu app e os dados de exemplo (CLIENTES, FATURAS, RECEBIDO).

const CLIENTES = [
  { nome: 'João Pedro Alves', chaves: ['joao'] },
  { nome: 'Clínica Bem-Estar', chaves: ['bem-estar', 'bem estar', 'clinica'] },
  { nome: 'Mercadinho Sol', chaves: ['mercadinho'] },
  { nome: 'Padaria Trigo Bom', chaves: ['padaria', 'trigo bom'] },
  { nome: 'Studio Pilates Ana Lima', chaves: ['pilates', 'ana lima'] },
];
const FATURAS = [
  { n: 1038, cliente: 'João Pedro Alves', valor: 3900, mes: 'setembro', status: 'paga' },
  { n: 1041, cliente: 'Padaria Trigo Bom', valor: 1200, mes: 'outubro', status: 'vencida' },
  { n: 1042, cliente: 'Clínica Bem-Estar', valor: 2850, mes: 'outubro', status: 'vencida' },
  { n: 1043, cliente: 'Mercadinho Sol', valor: 640, mes: 'outubro', status: 'aberta' },
  { n: 1044, cliente: 'Mercadinho Sol', valor: 640, mes: 'outubro', status: 'aberta', obs: 'duplicada' },
  { n: 1045, cliente: 'Studio Pilates Ana Lima', valor: 980, mes: 'outubro', status: 'aberta' },
  { n: 1046, cliente: 'João Pedro Alves', valor: 1500, mes: 'outubro', status: 'aberta' },
];
const RECEBIDO = { julho: 15240, agosto: 14230, setembro: 16870, outubro: 9420 };   // total recebido por mês (R$)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reais = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// o código lê do texto o que dá para ler sem ambiguidade (cliente citado, mês, nome próprio); a AÇÃO é do Jev
const clienteDe = (t) => CLIENTES.find((c) => c.chaves.some((k) => norm(t).includes(k)));
function mesDe(t) {
  const x = norm(t);
  if (/mes passado|ultimo mes/.test(x)) return 'setembro';
  if (/este mes|esse mes|mes atual/.test(x)) return 'outubro';
  return MESES.find((m) => x.includes(norm(m))) || null;
}
function nomeProprio(t) {
  const ws = String(t).split(/\s+/);
  const seq = [];
  for (let i = 1; i < ws.length; i++) {
    const w = ws[i].replace(/[^\p{L}-]/gu, '');
    if (/^\p{Lu}/u.test(w)) seq.push(w);
    else if (seq.length && /^(da|de|do|dos|das)$/.test(w)) seq.push(w);
    else if (seq.length) break;
  }
  while (seq.length && /^(da|de|do|dos|das)$/.test(seq[seq.length - 1])) seq.pop();
  return seq.join(' ');
}
function faturaDe(t, cli, preferir) {
  const doCliente = FATURAS.filter((f) => !cli || f.cliente === cli.nome);
  const mes = mesDe(t);
  return (/duplicad/.test(norm(t)) && doCliente.find((f) => f.obs === 'duplicada'))
    || (mes && doCliente.find((f) => f.mes === mes))
    || doCliente.find((f) => preferir.includes(f.status))
    || null;
}
const fat = (f) => `#${f.n} (${esc(f.cliente)}, ${reais(f.valor)}${f.obs ? `, ${f.obs}` : ''})`;

// o texto de cada "toast": o que o app faria com a ação escolhida
const TOAST = {
  nova_fatura: (t, c) => `🧾 Abriria uma fatura nova${c ? ` para <b>${esc(c.nome)}</b>` : ''}. Falta só conferir os itens e o valor.`,
  enviar_fatura: (t, c) => { const f = faturaDe(t, c, ['aberta', 'vencida', 'paga']); return f ? `📤 Enviaria a fatura <b>${fat(f)}</b>, referente a ${f.mes}, por e-mail.` : '📤 Enviaria uma fatura por e-mail. De qual cliente?'; },
  lembrete_cobranca: (t, c) => { const v = FATURAS.filter((f) => f.status === 'vencida' && (!c || f.cliente === c.nome)); const total = v.reduce((s, f) => s + f.valor, 0); return v.length ? `🔔 Mandaria lembrete de cobrança para <b>${v.length} ${v.length === 1 ? 'cliente' : 'clientes'}</b> com fatura vencida: ${v.map((f) => esc(f.cliente)).join(' e ')} (${reais(total)}).` : '🔔 Ninguém com fatura vencida: nenhum lembrete a mandar.'; },
  marcar_paga: (t, c) => { const f = faturaDe(t, c, ['vencida', 'aberta']); return f ? `✅ Daria baixa na fatura <b>${fat(f)}</b>: marcada como paga hoje.` : '✅ Daria baixa numa fatura. De qual cliente?'; },
  cancelar_fatura: (t, c) => { const f = faturaDe(t, c, ['aberta', 'vencida']); return `🗑️ Cancelaria a fatura <b>${f ? fat(f) : 'escolhida'}</b>.`; },
  novo_cliente: (t) => { const n = nomeProprio(t); return `👤 Abriria o cadastro de cliente novo${n ? ` já com o nome <b>${esc(n)}</b>` : ''}.`; },
  excluir_cliente: (t, c) => `❌ Excluiria o cadastro de <b>${c ? esc(c.nome) : 'um cliente'}</b> e todo o histórico de faturas dele.`,
  relatorio_mes: (t) => { const m = mesDe(t) || 'outubro'; return `📊 Abriria o relatório de <b>${m}</b>: ${RECEBIDO[m] != null ? `${reais(RECEBIDO[m])} recebidos${m === 'outubro' ? ' até hoje' : ''}` : 'sem faturas nesse mês'}.`; },
  exportar_contabil: (t) => { const m = mesDe(t) || 'setembro'; return `🗂️ Exportaria as faturas e notas de <b>${m}</b> numa planilha para o contador.`; },
  configurar_pix: () => '🔑 Abriria a tela da chave Pix de recebimento.',
  convidar_usuario: (t) => { const n = nomeProprio(t); return `✉️ Mandaria um convite de acesso ao sistema${n ? ` para <b>${esc(n)}</b>` : ''}.`; },
  nenhuma: () => '🤷 Isso não é um comando do Painel de Faturas, então nada foi feito.',
};

const ACOES = [
  { id: 'nova_fatura', rotulo: 'Nova fatura', icone: '🧾', desc: 'criar uma fatura nova para um cliente' },
  { id: 'enviar_fatura', rotulo: 'Enviar fatura', icone: '📤', desc: 'enviar ao cliente uma fatura que já existe, por e-mail ou WhatsApp' },
  { id: 'lembrete_cobranca', rotulo: 'Cobrar atrasados', icone: '🔔', desc: 'mandar lembrete de cobrança para quem está com fatura vencida' },
  { id: 'marcar_paga', rotulo: 'Dar baixa', icone: '✅', desc: 'registrar que o cliente pagou uma fatura (dar baixa)' },
  { id: 'cancelar_fatura', rotulo: 'Cancelar fatura', icone: '🗑️', desc: 'cancelar uma fatura emitida' },
  { id: 'novo_cliente', rotulo: 'Novo cliente', icone: '👤', desc: 'cadastrar um cliente novo' },
  { id: 'excluir_cliente', rotulo: 'Excluir cliente', icone: '❌', desc: 'apagar o cadastro de um cliente' },
  { id: 'relatorio_mes', rotulo: 'Relatório do mês', icone: '📊', desc: 'ver quanto entrou ou quanto foi faturado num mês' },
  { id: 'exportar_contabil', rotulo: 'Exportar p/ contador', icone: '🗂️', desc: 'exportar faturas e notas em planilha para o contador' },
  { id: 'configurar_pix', rotulo: 'Chave Pix', icone: '🔑', desc: 'configurar ou trocar a chave Pix de recebimento' },
  { id: 'convidar_usuario', rotulo: 'Convidar pessoa', icone: '✉️', desc: 'dar acesso ao sistema para alguém da equipe' },
  { id: 'nenhuma', rotulo: 'Nenhuma', icone: '🤷', desc: 'a frase não corresponde a nenhuma ação deste sistema' },
];

const KBD = (t) => `<kbd style="font:600 11px/1 var(--mj-mono);padding:4px 7px;border-radius:6px;border:1px solid var(--mj-borda2);background:var(--mj-card2);color:var(--mj-mudo);white-space:nowrap">${t}</kbd>`;

export default {
  id: 'barra-comando',
  titulo: 'Barra de Comando que Entende',
  emoji: '⌨️',
  categoria: 'imediata',
  ordem: 2,
  resumo: 'Um Ctrl+K que aceita qualquer frase (“cobra quem tá devendo”) e escolhe uma das ações reais do app, com as 3 mais prováveis à vista.',
  descricao: 'A cada pausa da digitação o Jev escolhe entre as 11 ações do sistema de faturamento, ou "nenhuma", e estima se a ação é irreversível. Como a resposta é sempre uma opção da lista, o app nunca inventa um comando; quando a confiança é baixa, ele pergunta em vez de executar.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#818cf8', acento2: '#22d3ee' },
  origem: 'comunidade: launcher por tecla e o jev-chat do Syntax (ferramentas chamadas sem LLM)',

  contexto: {
    app: 'Painel de Faturas — sistema de faturamento do Estúdio Aurora (design e fotografia)',
    hoje: 'terça-feira, 20/10/2026',
    clientes: CLIENTES.map((c) => c.nome),
  },

  aovivo: {
    skin: 'comando',
    janela: 'Painel de Faturas · ⌘K',
    rotulo: 'Barra de comando',
    placeholder: 'Diga o que quer fazer, do seu jeito: “cobra quem tá devendo”, “a padaria pagou”…',
    dica: 'Qualquer frase vira uma das 11 ações do sistema, ou nenhuma.',
    minimo: 3,
    debounce: 300,
    velocidade: 1,
    pausa: 3300,
  },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', papel: 'destaque', titulo: 'Ação',
      pergunta: 'A frase digitada na barra de comando pede qual ação do sistema de faturamento? Entenda gíria, apelido de cliente e frase pela metade. Se a frase não corresponde a nenhuma ação da lista, escolha nenhuma.',
      opcoes: ACOES,
    },
    {
      id: 'irreversivel', tipo: 'noul', papel: 'alerta', titulo: 'Irreversível', rotulo: 'ação irreversível', icone: '⚠️', limiar: 0.5,
      mensagem: 'Ação irreversível: o app pede confirmação antes',
      pergunta: 'O que a pessoa pediu apaga, cancela ou exclui algo de um jeito que não dá para desfazer depois (ex.: cancelar fatura, excluir cliente)?',
    },
  ],

  render(r, texto) {
    const a = r.respostas && r.respostas.acao;
    if (!a) return '';
    const probs = a.probabilities || {};
    const top = Object.entries(probs).sort((x, y) => y[1] - x[1]).slice(0, 3);
    const conf = probs[a.choice] ?? 0;
    const irrev = r.respostas.irreversivel && r.respostas.irreversivel.noul >= 0.5;
    const linhas = top.map(([id, p], i) => {
      const o = ACOES.find((x) => x.id === id) || { rotulo: id, icone: '•' };
      return `<div style="display:grid;grid-template-columns:26px minmax(0,1fr) 72px 38px auto;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;${i === 0 ? 'background:color-mix(in srgb,var(--mj-acento) 16%,transparent);' : ''}">
        <span style="font-size:17px;text-align:center">${o.icone}</span>
        <span style="font-size:14px;${i === 0 ? 'font-weight:700' : 'color:var(--mj-mudo)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.rotulo}</span>
        <span style="height:6px;border-radius:99px;background:var(--mj-card2);overflow:hidden"><span style="display:block;height:100%;width:${Math.round(p * 100)}%;border-radius:99px;background:var(--mj-acento)"></span></span>
        <span style="font:600 11.5px/1 var(--mj-mono);color:var(--mj-mudo);text-align:right">${Math.round(p * 100)}%</span>
        ${KBD(i === 0 ? '↵' : '⌘' + (i + 1))}</div>`;
    }).join('');
    const cli = clienteDe(texto);
    let corpo, cor = 'var(--mj-acento)', fundo = 'var(--mj-bg3)', rodape = '';
    if (a.choice !== 'nenhuma' && conf < 0.6) {
      const [b, c] = top.map(([id]) => (ACOES.find((x) => x.id === id) || {}).rotulo);
      corpo = `🤔 Não tenho certeza (${Math.round(conf * 100)}%). Você quis dizer <b>${b}</b>${c ? ` ou <b>${c}</b>` : ''}? Nada foi feito ainda.`;
      cor = 'var(--mj-medio)';
    } else {
      corpo = (TOAST[a.choice] || TOAST.nenhuma)(texto, cli);
      if (a.choice === 'nenhuma') cor = 'var(--mj-dim)';
      if (irrev) {
        cor = 'var(--mj-ruim)'; fundo = 'color-mix(in srgb,var(--mj-ruim) 10%,var(--mj-bg3))';
        rodape = `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><span class="mj-chip ruim">⚠️ não dá para desfazer</span><span class="mj-chip">pede confirmação antes</span></div>`;
      }
    }
    return `<div class="mj-widget mj-painel-box" style="padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--mj-borda)">
        <span style="font-size:15px">🔎</span><span style="flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(texto)}</span>${KBD('⌘K')}</div>
      <div style="padding:8px">
        <div style="font:650 10.5px/1 var(--mj-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mj-dim);padding:6px 8px 8px">Ações mais prováveis</div>${linhas}</div>
    </div>
    <div role="status" style="margin-top:12px;padding:13px 15px;border-radius:13px;background:${fundo};border:1px solid color-mix(in srgb,${cor} 45%,transparent);border-left:4px solid ${cor};box-shadow:var(--mj-sombra);font-size:14.5px;line-height:1.45;animation:mj-entra .35s var(--mj-ease)">
      <div style="font:650 10.5px/1 var(--mj-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mj-dim);margin-bottom:7px">Se você apertar ↵</div>${corpo}${rodape}</div>`;
  },

  exemplos: [
    { titulo: 'Enviar', texto: 'manda a fatura do mês passado pro João', esperado: { acao: 'enviar_fatura', irreversivel: false } },
    { titulo: 'Cobrar', texto: 'cobra quem tá devendo', esperado: { acao: 'lembrete_cobranca', irreversivel: false } },
    { titulo: 'Pagou', texto: 'a Clínica Bem-Estar pagou, pode dar baixa', esperado: { acao: 'marcar_paga', irreversivel: false } },
    { titulo: 'Cancelar', texto: 'cancela a fatura duplicada do Mercadinho Sol', esperado: { acao: 'cancelar_fatura', irreversivel: true } },
    { titulo: 'Contador', texto: 'o contador pediu os arquivos de setembro', esperado: { acao: 'exportar_contabil', irreversivel: false } },
    { titulo: 'Pizza', texto: 'pede uma pizza', esperado: { acao: 'nenhuma', irreversivel: false } },
  ],
};

// Antivazamento de Prompt — enquanto o funcionário escreve para uma IA de fora, o Jev aponta dado de cliente, senha, saúde ou segredo.
// Para adaptar: escreva a política da SUA empresa (contexto.politica), ajuste as 6 checagens e as máscaras de regex (MASCARAS).
const MASCARAS = [
  { re: /\bsk-[A-Za-z0-9_-]{8,}/g, rot: 'CHAVE' },
  { re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, rot: 'E-MAIL' },
  { re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, rot: 'CPF' },
  { re: /\b\d{4}[ .-]?\d{4}[ .-]?\d{4}[ .-]?\d{4}\b/g, rot: 'CARTÃO' },
  { re: /\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b/g, rot: 'TELEFONE' },
  { re: /(senha\s*(?:é|:|=)?\s*)(\S+?)(?=[.,;!?]?(?:\s|$))/gi, rot: 'SENHA', grupo: 2 },
];
// o que regex nenhum pega (e o Jev pega): quem é a pessoa, a saúde dela, o segredo da empresa
const SO_O_JEV = [['cliente', 'nome de cliente ou pessoa'], ['saude', 'dado de saúde'], ['segredo', 'segredo comercial']];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// troca, pelo código, os trechos que um regex reconhece; devolve o HTML mascarado e a contagem por tipo
function mascarar(texto) {
  const achados = [];
  for (const m of MASCARAS) {
    m.re.lastIndex = 0;
    let x;
    while ((x = m.re.exec(texto))) {
      const ini = x.index + (m.grupo ? x[0].indexOf(x[m.grupo], x[1].length) : 0);
      const fim = ini + (m.grupo ? x[m.grupo] : x[0]).length;
      if (!achados.some((a) => ini < a.fim && fim > a.ini)) achados.push({ ini, fim, rot: m.rot });
    }
  }
  achados.sort((a, b) => a.ini - b.ini);
  let html = '', pos = 0;
  const cont = {};
  for (const a of achados) {
    html += esc(texto.slice(pos, a.ini)) + `<mark style="background:color-mix(in srgb, var(--mj-acento) 28%, transparent);color:inherit;border-radius:4px;padding:0 3px">[${a.rot}]</mark>`;
    pos = a.fim;
    cont[a.rot] = (cont[a.rot] || 0) + 1;
  }
  return { html: html + esc(texto.slice(pos)), cont, n: achados.length };
}

export default {
  id: 'antivazamento-prompt',
  titulo: 'Antivazamento de Prompt',
  emoji: '🔏',
  categoria: 'confianca',
  ordem: 23,
  resumo: 'Antes de o funcionário mandar o texto para o ChatGPT, o Jev aponta dado de cliente, senha, saúde ou segredo e o código mascara o que dá.',
  descricao: 'A cada pausa da digitação o Jev relê o texto e responde 7 perguntas de uma vez: as 6 checagens e o veredito (pode enviar, mascarar ou não envie). O regex do código troca CPF, e-mail, chave e cartão por marcadores; o que regex nenhum pega, como o nome do cliente, uma cirurgia ou a margem do produto, quem aponta é o Jev.',
  marcas: ['imediato', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#2dd4bf', acento2: '#a3e635' },

  contexto: {
    empresa: 'Loja Aurora: e-commerce de cosméticos com 40 pessoas',
    politica: 'Para IA de fora da empresa (ChatGPT e afins): pode mandar texto genérico, público ou já anônimo. Nomes, CPFs, e-mails, telefones e valores de clientes só depois de mascarados. Nunca mande senhas, chaves de acesso, dados de saúde de ninguém nem segredos comerciais (custo, margem, lançamento, contrato em negociação).',
  },

  aovivo: {
    skin: 'prompt',
    janela: 'Nova conversa · IA de fora da empresa',
    rotulo: 'Texto para a IA',
    cabecalho: { 'Para:': 'IA pública (fora da empresa)', 'De:': 'Carla Menezes · atendimento' },
    placeholder: 'Escreva aqui o que você ia colar no ChatGPT…',
    dica: 'O Jev relê a cada pausa; a prévia mascarada é feita pelo código (regex).',
    digitar: true,
    velocidade: 1.3,
    debounce: 250,
    pausa: 2600,
    tituloChecklist: 'O que tem neste texto',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', papel: 'destaque', titulo: 'Veredito',
      pergunta: 'O que fazer com o texto que a pessoa vai mandar para uma IA de fora da empresa? Decida nesta ordem: (1) tem senha, chave ou token, dado de saúde de alguém ou segredo comercial → não envie, mesmo trocando o nome; (2) senão, tem documento, nome, contato ou dinheiro de uma pessoa (cliente, funcionário) → mascarar; (3) senão → pode enviar.',
      opcoes: [
        { id: 'pode_enviar', rotulo: 'Pode enviar', icone: '✅', cor: '#34d399', desc: 'nenhum dado sensível: pergunta genérica, texto público ou já anônimo' },
        { id: 'mascarar', rotulo: 'Mascare antes', icone: '🎭', cor: '#fbbf24', desc: 'tem nome, CPF, e-mail, telefone ou valores de alguém, mas a tarefa funciona igual com marcadores no lugar' },
        { id: 'nao_envie', rotulo: 'Não envie', icone: '⛔', cor: '#f87171', desc: 'tem senha ou chave, saúde de alguém ou segredo comercial: o assunto já é o segredo, e mascarar não resolve' },
      ],
    },
    { id: 'documento', tipo: 'noul', papel: 'checklist', rotulo: 'Documento pessoal (CPF, RG, CNH)', tom: 'ruim', pergunta: 'O texto traz o número de um documento de uma pessoa (CPF, RG, CNH, passaporte)?' },
    { id: 'senha', tipo: 'noul', papel: 'checklist', rotulo: 'Senha, chave ou token', tom: 'ruim', pergunta: 'O texto traz uma senha, chave de API (ex.: sk-…), token ou outra credencial de acesso?' },
    { id: 'saude', tipo: 'noul', papel: 'checklist', rotulo: 'Dado de saúde de alguém', tom: 'ruim', pergunta: 'O texto fala da saúde de uma pessoa identificável (doença, cirurgia, exame, remédio, atestado)?' },
    { id: 'cliente', tipo: 'noul', papel: 'checklist', rotulo: 'Cliente ou pessoa identificável', tom: 'ruim', pergunta: 'O texto identifica uma pessoa específica, como cliente, paciente ou funcionário (nome completo, e-mail pessoal, telefone ou endereço)?' },
    { id: 'segredo', tipo: 'noul', papel: 'checklist', rotulo: 'Segredo comercial', tom: 'ruim', pergunta: 'O texto traz informação interna e confidencial da empresa (custo, margem, lançamento ainda secreto, contrato em negociação, resultado não divulgado)?' },
    { id: 'financeiro', tipo: 'noul', papel: 'checklist', rotulo: 'Dado financeiro de pessoa', tom: 'ruim', pergunta: 'O texto traz salário, dívida, saldo, número de cartão ou conta bancária de uma pessoa?' },
  ],

  // prévia do que iria para fora: o código mascara o que regex reconhece; o Jev aponta o que sobra
  render(r, texto) {
    const resp = r.respostas || {};
    const m = mascarar(texto || '');
    const trocas = Object.entries(m.cont).map(([k, v]) => `${v} ${k}`).join(' · ');
    const sobra = SO_O_JEV.filter(([id]) => resp[id] && resp[id].noul >= 0.5).map(([, t]) => t);
    const v = resp.veredito && resp.veredito.choice;
    const dica = v === 'nao_envie' ? '⛔ Mascarar não resolve: use a IA interna da empresa ou tire o assunto do texto.'
      : v === 'mascarar' ? '🎭 Mande a versão mascarada e troque à mão o que o regex não pegou.'
        : v === 'pode_enviar' ? '✅ Pode mandar como está.' : '';
    return `<div class="mj-widget mj-painel-box"><h4>Prévia mascarada pelo código <span class="tp">${m.n ? trocas : 'nada para trocar'}</span></h4>`
      + `<div style="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.55 var(--mj-mono);padding:10px 12px;border-radius:10px;background:var(--mj-card);max-height:190px;overflow:auto">${m.html || '<span class="dim">…</span>'}</div>`
      + (sobra.length ? `<p style="margin:9px 0 0;font-size:13px">👁️ Ainda sobra o que regex nenhum pega: <b>${sobra.join(' · ')}</b></p>` : '')
      + (dica ? `<p style="margin:6px 0 0;font-size:13px">${dica}</p>` : '')
      + '</div>';
  },

  exemplos: [
    {
      titulo: 'E-mail da reunião',
      texto: 'Reescreve de um jeito mais simpático: "Pessoal, a reunião de quinta foi para sexta às 10h. Tragam ideias para a campanha de Natal."',
      esperado: { veredito: 'pode_enviar', documento: false, senha: false, saude: false, cliente: false, segredo: false, financeiro: false },
    },
    {
      titulo: 'Cobrança de cliente',
      texto: 'Escreve uma mensagem gentil de cobrança para o cliente Roberto Almeida Nunes, CPF 123.456.789-00, e-mail roberto.nunes@exemplo.com.br. Ele está devendo R$ 3.480,00 desde agosto.',
      esperado: { veredito: 'mascarar', documento: true, senha: false, saude: false, cliente: true, segredo: false, financeiro: true },
    },
    {
      titulo: 'Erro na integração',
      texto: 'Minha integração de pagamento dá erro 401. A chave é sk-live-9fA2kQ7xLm3Pz8Rt e o login do painel é financeiro@lojaaurora.com.br com a senha Aurora#2026. O que pode ser?',
      esperado: { veredito: 'nao_envie', documento: false, senha: true, saude: false, financeiro: false },
    },
    {
      titulo: 'Comunicado do RH',
      texto: 'Monta um comunicado para o RH: a Fernanda Lopes, do financeiro, vai ficar 15 dias afastada para uma cirurgia no joelho. O salário dela, de R$ 6.200, continua normal.',
      esperado: { veredito: 'nao_envie', documento: false, senha: false, saude: true, cliente: true, financeiro: true },
    },
    {
      titulo: 'Margem do produto',
      texto: 'Analisa nossa margem: o kit Aurora custa R$ 41 para produzir e vendemos a R$ 189. Em janeiro lançamos a linha Aurora Verão antes da concorrência; ninguém pode saber ainda.',
      esperado: { veredito: 'nao_envie', documento: false, senha: false, saude: false, cliente: false, segredo: true },
    },
  ],
};

// Termômetro de Prompt — enquanto você escreve um prompt, acende o que já tem e dá a dica pronta do que falta.
// Para adaptar: troque os ingredientes (as decisões sim/não) pelos critérios do seu time e as dicas em DICAS.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// dica pronta para cada ingrediente que falta, na ordem de importância
const DICAS = [
  { id: 'tarefa', titulo: 'Diga exatamente o que quer receber', exemplo: 'Escreva 5 legendas para o Instagram divulgando [produto].' },
  { id: 'contexto_negocio', titulo: 'Conte do seu negócio, com detalhes', exemplo: 'Tenho uma [tipo de negócio] em [cidade], vendo [produto] por R$ [preço] pelo [canal].' },
  { id: 'formato', titulo: 'Defina o formato da resposta', exemplo: 'Em tópicos curtos, de até 2 linhas cada.' },
  { id: 'publico', titulo: 'Diga para quem é', exemplo: 'O público são [quem], que [o que procuram].' },
  { id: 'papel', titulo: 'Dê um papel à IA', exemplo: 'Você é um redator especialista em pequenos negócios.' },
  { id: 'restricoes', titulo: 'Diga o que evitar', exemplo: 'Não prometa [algo arriscado] e não use a palavra “[palavra]”.' },
  { id: 'exemplos', titulo: 'Mostre um exemplo do que você gosta', exemplo: 'Exemplo do tom que eu gosto: “[frase de referência]”.' },
];
const NIVEIS = ['fraco', 'básico', 'bom', 'excelente'];

function termometro(frac) {
  const x0 = 34, x1 = 292, w = x0 + (x1 - x0) * Math.max(0.03, Math.min(1, frac));
  const corBulbo = frac < 0.34 ? '#60a5fa' : frac < 0.67 ? '#fbbf24' : '#fb7185';
  const marcas = NIVEIS.map((n, i) => { const x = x0 + ((x1 - x0) * i) / (NIVEIS.length - 1); return `<line x1="${x}" x2="${x}" y1="36" y2="41" style="stroke:var(--mj-borda2)"/><text x="${x}" y="54" text-anchor="${i === 0 ? 'start' : i === NIVEIS.length - 1 ? 'end' : 'middle'}" style="font:500 10.5px var(--mj-f);fill:var(--mj-dim)">${n}</text>`; }).join('');
  return `<svg viewBox="0 0 300 58" width="100%" role="img" aria-label="Termômetro do prompt" style="display:block">
    <defs><linearGradient id="tp-grad" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0"><stop offset="0" stop-color="#60a5fa"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#fb7185"/></linearGradient></defs>
    <rect x="${x0 - 6}" y="12" width="${x1 - x0 + 12}" height="20" rx="10" style="fill:var(--mj-card2);stroke:var(--mj-borda2)"/>
    <rect x="${x0 - 6}" y="15" width="${(w - x0 + 9).toFixed(1)}" height="14" rx="7" fill="url(#tp-grad)"/>
    <circle cx="20" cy="22" r="17" style="fill:${corBulbo};stroke:var(--mj-bg2);stroke-width:3"/>
    <text x="20" y="27" text-anchor="middle" style="font:15px var(--mj-f)">🌡️</text>${marcas}</svg>`;
}

export default {
  id: 'termometro-prompt',
  titulo: 'Termômetro de Prompt',
  emoji: '🌡️',
  categoria: 'imediata',
  ordem: 6,
  resumo: 'Enquanto você escreve um prompt, ele acende o que já tem (papel, contexto, formato, exemplo…) e dá a dica pronta do que falta.',
  descricao: 'A cada pausa da digitação o Jev responde 8 perguntas numa chamada só: 7 sim ou não sobre os ingredientes de um bom prompt e uma nota de qualidade. Ele não reescreve nada: só aponta o que falta, e as dicas são textos prontos do app.',
  marcas: ['imediato'],
  motor: 'aovivo',
  tema: { acento: '#fb7185', acento2: '#fbbf24' },

  contexto: {
    publico: 'empreendedores e donos de pequenos negócios aprendendo a usar IA no dia a dia',
    objetivo: 'avaliar o prompt que a pessoa está escrevendo para um assistente de IA, sem reescrever por ela',
  },

  aovivo: {
    skin: 'prompt',
    janela: 'Novo prompt',
    rotulo: 'Prompt',
    placeholder: 'Escreva o seu prompt aqui, do jeito que mandaria para a IA…',
    dica: 'O termômetro sobe a cada ingrediente que aparece.',
    tituloChecklist: 'Ingredientes do prompt',
    debounce: 200,
    velocidade: 1.25,
    pausa: 2800,
  },

  decisoes: [
    {
      id: 'qualidade', tipo: 'score', papel: 'medidor', titulo: 'Qualidade',
      pergunta: 'Quão pronto está este prompt para a IA acertar de primeira, sem adivinhar? Use esta régua: fraco = só um pedido vago; básico = a tarefa está clara, mas não há papel, nem contexto do negócio, nem público; bom = tem papel, contexto do negócio, tarefa e formato, mas falta exemplo, restrição ou público; excelente = tem também exemplo, restrições e público.',
      niveis: [
        { rotulo: 'fraco', desc: 'só um pedido vago; a IA vai adivinhar quase tudo' },
        { rotulo: 'básico', desc: 'tarefa clara, mas sem papel, sem contexto do negócio e sem público' },
        { rotulo: 'bom', desc: 'papel, contexto do negócio, tarefa e formato; falta exemplo, restrição ou público' },
        { rotulo: 'excelente', desc: 'tem também exemplo, restrições e público: dá para usar de primeira' },
      ],
    },
    { id: 'papel', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Papel definido', pergunta: 'O prompt define um papel ou uma especialidade para a IA (ex.: "Você é um redator…", "Aja como um consultor…")?' },
    { id: 'contexto_negocio', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Contexto do negócio', pergunta: 'O prompt explica o negócio ou a situação com detalhes concretos (o que vende, onde, por quanto, por qual canal)? Só dizer "minha loja" ou "minha doceria" não conta.' },
    { id: 'tarefa', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Tarefa clara', pergunta: 'O prompt diz exatamente o que a IA deve entregar (qual texto, quantos, sobre o quê), sem deixar dúvida sobre o pedido?' },
    { id: 'formato', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Formato da resposta', pergunta: 'O prompt diz COMO a resposta deve vir: quantidade de itens, lista, tópicos, tabela, tamanho ou estrutura?' },
    { id: 'exemplos', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Exemplo', pergunta: 'O prompt traz pelo menos um exemplo ou modelo do resultado esperado (uma frase de referência, um texto de amostra)?' },
    { id: 'restricoes', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Restrições ou critério de pronto', pergunta: 'O prompt diz o que a resposta NÃO pode ter ou deve evitar (palavras, promessas, temas) ou como saber que ficou bom?' },
    { id: 'publico', tipo: 'noul', papel: 'checklist', tom: 'bom', rotulo: 'Público', pergunta: 'O prompt diz para quem é o resultado final (quem vai ler: tipo de cliente, idade, nível de conhecimento)?' },
  ],

  render(r) {
    const R = r.respostas || {};
    const q = R.qualidade;
    if (!q) return '';
    const tem = (id) => R[id] && R[id].noul >= 0.5;
    const presentes = DICAS.filter((d) => tem(d.id)).length;
    const faltam = DICAS.filter((d) => R[d.id] && !tem(d.id));
    const nivel = +Object.entries(q.probabilities || { 0: 1 }).sort((a, b) => b[1] - a[1])[0][0];
    const frac = presentes / DICAS.length;   // a conta é do código: quantos ingredientes o Jev viu
    const cor = ['#60a5fa', '#93c5fd', '#fbbf24', '#fb7185'][nivel] || '#fbbf24';
    const dicas = faltam.slice(0, 4).map((d) => `<div style="padding:10px 12px;border-radius:11px;background:var(--mj-card);border:1px solid var(--mj-borda);border-left:3px solid var(--mj-acento);animation:mj-entra .35s var(--mj-ease)">
        <div style="font-weight:700;font-size:13.5px">➕ ${d.titulo}</div>
        <div style="font:12.5px/1.45 var(--mj-mono);color:var(--mj-mudo);margin-top:4px">${esc(d.exemplo)}</div></div>`).join('');
    const mais = faltam.length > 4 ? `<div style="font-size:12.5px;color:var(--mj-dim)">e mais ${faltam.length - 4}: ${faltam.slice(4).map((d) => d.titulo.charAt(0).toLowerCase() + d.titulo.slice(1)).join('; ')}.</div>` : '';
    const pronto = `<div style="display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--mj-bom) 10%,transparent);border:1px solid color-mix(in srgb,var(--mj-bom) 40%,transparent)"><span style="font-size:24px">🔥</span><div><b>Prompt no ponto.</b><div style="font-size:13px;color:var(--mj-mudo)">Tem todos os ingredientes: pode mandar para a IA.</div></div></div>`;
    return `<div class="mj-widget mj-painel-box" style="padding:16px">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font:800 26px/1.1 var(--mj-f);color:${cor}">${NIVEIS[nivel] || ''}</span>
        <span style="font-size:13px;color:var(--mj-mudo)">${presentes} de ${DICAS.length} ingredientes</span>
      </div>
      ${termometro(frac)}
      <div style="font:650 10.5px/1 var(--mj-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mj-dim);margin:14px 0 8px">${faltam.length ? 'Para esquentar, acrescente' : 'Pronto'}</div>
      <div style="display:grid;gap:8px">${faltam.length ? dicas + mais : pronto}</div>
    </div>`;
  },

  exemplos: [
    {
      titulo: 'Fraco',
      texto: 'faz um post pro instagram da minha loja',
      esperado: { qualidade: 0, papel: false, contexto_negocio: false, formato: false, exemplos: false, restricoes: false, publico: false },
    },
    {
      titulo: 'Básico',
      texto: 'Escreva 5 legendas para o Instagram da minha doceria divulgando os bolos de pote de Páscoa.',
      esperado: { qualidade: 1, papel: false, tarefa: true, formato: true, exemplos: false, restricoes: false, publico: false },
    },
    {
      titulo: 'Bom',
      texto: 'Você é um redator especialista em pequenos negócios. Tenho uma doceria em Campinas que vende bolos de pote pelo WhatsApp, a R$ 18 cada. Escreva 5 legendas para o Instagram divulgando os bolos de pote de Páscoa, em tópicos curtos de até 2 linhas.',
      esperado: { qualidade: 2, papel: true, contexto_negocio: true, tarefa: true, formato: true, exemplos: false, restricoes: false, publico: false },
    },
    {
      titulo: 'Excelente',
      texto: 'Você é um redator especialista em pequenos negócios. Tenho uma doceria em Campinas que vende bolos de pote pelo WhatsApp, a R$ 18 cada. Escreva 5 legendas para o Instagram divulgando os bolos de pote de Páscoa, em tópicos curtos de até 2 linhas. O público são mães de 25 a 40 anos da região que compram para presentear. Exemplo do tom que eu gosto: “Páscoa sem bolo de pote? Aqui não! 🐰”. Não prometa entrega no mesmo dia e não use a palavra “barato”.',
      esperado: { qualidade: 3, papel: true, contexto_negocio: true, tarefa: true, formato: true, exemplos: true, restricoes: true, publico: true },
    },
  ],
};

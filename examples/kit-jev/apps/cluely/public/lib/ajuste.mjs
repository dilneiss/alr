// Camada de AJUSTE DE CONTEXTO da transcrição.
// O reconhecimento de voz do navegador em pt-BR transforma termos técnicos em inglês em palavras portuguesas
// (medido: "tokens na API da OpenAI" → "toque Snap da o", "frontend" → "confronto", "inferência" → "referência";
// só 12% dos termos de IA/programação saíram certos). Esta camada:
//   1. troca direto as variantes que só podem ser o termo técnico ("git rabi" → "GitHub", "lama cpp" → "llama.cpp");
//   2. transforma em CANDIDATO o que também é palavra comum ("toque" → tokens?, "versão" → Vercel?) — quem decide é o
//      Jev, pelo contexto, com uma pergunta de escolha por candidato na mesma chamada da fala;
//   3. procura, por semelhança de pronúncia, os termos que o próprio usuário cadastrou no contexto.
// O texto ajustado alimenta o Jev, o modelo de texto, o histórico e a tela (com as trocas destacadas).

const semAcento = (s) => String(s).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

// t: termo canônico · d: o que é (vira critério do Jev) · v: variantes inequívocas · a: variantes que também são palavras comuns
export const GLOSSARIO = [
  { t: 'evals', d: 'testes automáticos que medem se uma IA responde certo', v: ['ivals', 'i vals', 'evals'], a: ['evas', 'eva s', 'e vals'] },
  { t: 'COP30', d: 'conferência do clima da ONU de 2025, em Belém', v: ['cop trinta', 'cop 30', 'cop-30', 'copa trinta'] },
  { t: 'LLM', d: 'grande modelo de linguagem (IA)', v: ['l l m', 'ele ele eme', 'elelem', 'elem'], a: ['lm'] },
  { t: 'ChatGPT', d: 'o chatbot da OpenAI', v: ['chat gpt', 'chat gepeto', 'chat g p t', 'chat ge pe te', 'chatgpt', 'chat gpte', 'chat jepeto'] },
  { t: 'GPT', d: 'modelo de IA da OpenAI', v: ['g p t', 'ge pe te', 'gepete'], a: ['gepeto'] },
  { t: 'OpenAI', d: 'empresa criadora do ChatGPT', v: ['open ai', 'open e ai', 'open i a', 'opem ai', 'open a i', 'openai', 'open eai'] },
  { t: 'Claude Code', d: 'agente de programação da Anthropic', v: ['claude code', 'clode code', 'claud code', 'clod code'], a: ['cloud code', 'clube code'] },
  { t: 'Claude', d: 'modelo de IA da Anthropic', v: ['clode', 'claud'], a: ['cloud', 'clóvis', 'clube'] },
  { t: 'Anthropic', d: 'empresa criadora do Claude', v: ['antropic', 'antrópic', 'antropik', 'anthropic'], a: ['antrópico'] },
  { t: 'Gemini', d: 'modelo de IA do Google', v: ['gemini', 'jemini', 'gêmini', 'djemini'] },
  { t: 'DeepSeek', d: 'modelo de IA chinês', v: ['deep seek', 'dip sik', 'dipsik', 'deepseek', 'dip seek', 'deep sik'] },
  { t: 'Qwen', d: 'modelo de IA da Alibaba', v: ['qwen', 'kwen', 'cuen'], a: ['quen'] },
  { t: 'Ollama', d: 'programa para rodar modelos de IA no próprio computador', v: ['olhama', 'o lhama', 'ollama', 'olama'], a: ['o lama', 'lula maiô'] },
  { t: 'llama.cpp', d: 'programa para rodar modelos de IA em CPU', v: ['lama cpp', 'lhama cpp', 'llama cpp', 'lama c p p', 'lama cê pê pê'] },
  { t: 'prompt', d: 'instrução escrita para uma IA', v: ['prompti', 'promp', 'prompit'], a: ['pronto', 'pronta'] },
  { t: 'prompts', d: 'instruções escritas para uma IA', v: ['promptis', 'prompis'], a: ['prontos'] },
  { t: 'tokens', d: 'pedaços de texto que um modelo de IA lê e cobra', v: ['tokem', 'tokém', 'toquem', 'toquém', 'toquens', 'tóquens', 'tokens'], a: ['toque', 'toques', 'toquei', 'estou aqueles'] },
  { t: 'fine-tuning', d: 'treino extra de um modelo de IA com dados próprios', v: ['fine tuning', 'fai tuning', 'faine tuning', 'fain tuning', 'fine tunning', 'faz tuning'], a: ['faz um tuning', 'fiz um tuning'] },
  { t: 'embeddings', d: 'vetores que representam o significado de textos', v: ['embedings', 'embeddings', 'em bedings', 'embedins', 'em beding', 'embedingues'], a: ['em bad', 'em bed', 'em bede'] },
  { t: 'RAG', d: 'busca em documentos antes de a IA responder', v: ['r a g', 'erre a ge'], a: ['rag', 'hag'] },
  { t: 'banco vetorial', d: 'banco de dados de embeddings', v: ['banco vetorial'] },
  { t: 'API', d: 'interface para um programa chamar outro', v: ['a p i', 'a pi ai', 'ei pi ai'] },
  { t: 'SDK', d: 'kit de desenvolvimento de software', v: ['s d k', 'esse de ca', 'esse dê cá', 'es di ki'] },
  { t: 'REST', d: 'estilo de API web', v: ['api rest', 'api resti'], a: ['resto'] },
  { t: 'JSON', d: 'formato de dados', v: ['j s o n', 'jeison', 'jota esse o ene'], a: ['jason'] },
  { t: 'MCP', d: 'protocolo para agentes de IA acessarem ferramentas', v: ['m c p', 'eme ce pe', 'eme cê pê'] },
  { t: 'n8n', d: 'ferramenta de automação', v: ['n oito n', 'n 8 n', 'ene oito ene', 'n8 n', 'n 8n', 'eneitene', 'n eight n'] },
  { t: 'webhook', d: 'aviso automático de um sistema para outro', v: ['web hook', 'uebi hook', 'webhuk', 'uebhook', 'web ruque'], a: ['ebook', 'e book', 'um ebook'] },
  { t: 'ManyChat', d: 'ferramenta de chatbot', v: ['many chat', 'meni chat', 'manichat', 'meny chat', 'mani chat'], a: ['maniche'] },
  { t: 'Zapier', d: 'ferramenta de automação', v: ['zapier', 'zapiê', 'zapiér'] },
  { t: 'Supabase', d: 'banco de dados na nuvem', v: ['supa base', 'super base', 'superbase', 'supabeise', 'supabase', 'supa beise', 'superbeise'] },
  { t: 'Postgres', d: 'banco de dados', v: ['post gres', 'postgree', 'póstgres', 'postgres', 'postgresql'] },
  { t: 'Next.js', d: 'framework web', v: ['next js', 'nextjs', 'next jota esse', 'néxt js', 'next jey es'] },
  { t: 'React', d: 'biblioteca de interface web', v: ['riact', 'ri act', 'riéct'] },
  { t: 'Docker', d: 'contêineres de software', v: ['doquer', 'dóquer', 'docker', 'doker'] },
  { t: 'Kubernetes', d: 'orquestração de contêineres', v: ['cubernetes', 'kubernetis', 'cubernetis', 'kubernetes'] },
  { t: 'deploy', d: 'publicar um sistema', v: ['deplói', 'diplói', 'de ploy', 'deploi', 'diploi'] },
  { t: 'Vercel', d: 'hospedagem de sites', v: ['vercel', 'versel', 'vercél', 'verssel'], a: ['versão'] },
  { t: 'GitHub', d: 'site que guarda código', v: ['git rabi', 'git habi', 'guit rabi', 'git hub', 'guit hub', 'gitrub', 'github', 'guitirabi', 'git rub'], a: ['jeitinho'] },
  { t: 'pull request', d: 'pedido para juntar código no GitHub', v: ['pulo reconheci', 'pull request', 'pul request', 'pull requeste', 'pul requeste', 'pulo request'] },
  { t: 'commit', d: 'registro de uma mudança no código', v: ['comitei', 'comitar'], a: ['convite', 'comite', 'comitê'] },
  { t: 'merge', d: 'juntar ramos de código', v: ['dei merge', 'deu merge', 'merji', 'mérgi'], a: ['imergi', 'imergina', 'imaginar'] },
  { t: 'branch', d: 'ramo de código', v: ['branx', 'branxe', 'brench', 'bréntchi', 'brenchi'] },
  { t: 'backend', d: 'parte do sistema que roda no servidor', v: ['back end', 'barken', 'bequendi', 'bequend', 'béquend', 'bakend', 'back ende'] },
  { t: 'frontend', d: 'parte do sistema que aparece na tela', v: ['front end', 'fronte end', 'frontendi', 'fronte ende', 'front ende'], a: ['confronto'] },
  { t: 'open source', d: 'código aberto', v: ['open sorce', 'open sors', 'opem source', 'open source', 'open sourse', 'oupen source'], a: ['ou pensou se'] },
  { t: 'inferência', d: 'o modelo de IA gerando uma resposta (custo de uso)', v: [], a: ['referência'] },
  { t: 'workflow', d: 'fluxo de trabalho automatizado', v: ['work flow', 'uorque flou', 'workflou', 'uork flow', 'workfow'] },
  { t: 'guardrails', d: 'regras de segurança de uma IA', v: ['guard rails', 'gard reils', 'guardreils', 'guard reils', 'gardrails'] },
  { t: 'dashboard', d: 'painel de indicadores', v: ['dash board', 'déshbord', 'dashbord', 'dash bord', 'dexbord'] },
  { t: 'checkout', d: 'página de pagamento', v: ['check out', 'chequiaute', 'checaute', 'chequeaute'] },
  { t: 'Google Sheets', d: 'planilhas do Google', v: ['google chip', 'google chips', 'google shits', 'google xits', 'google shit', 'google sheet'] },
  { t: 'Notion', d: 'aplicativo de notas', v: ['nochon', 'nóchion', 'notion', 'nouchon'] },
  { t: 'Copilot', d: 'assistente de programação', v: ['co pilot', 'copilote', 'com pai note', 'copailote', 'copailot', 'copilot'] },
  { t: 'Cursor', d: 'editor de código com IA', v: [], a: ['curso'] },
  { t: 'Stripe', d: 'plataforma de pagamentos', v: ['estraipe', 'straipe', 'stráipe'], a: ['strip'] },
  { t: 'SaaS', d: 'software vendido por assinatura', v: ['saas', 'sás', 'sass'], a: ['s a', 'sas'] },
  { t: 'GPU', d: 'placa de vídeo usada por IA', v: ['g p u', 'ge pe u', 'gê pê u', 'gepeu'] },
  { t: 'Python', d: 'linguagem de programação', v: ['paiton', 'páiton', 'paitom', 'pyton'] },
  { t: 'JavaScript', d: 'linguagem de programação', v: ['java script', 'java escript', 'javascript', 'jâva script'] },
  { t: 'TypeScript', d: 'linguagem de programação', v: ['type script', 'taipe script', 'taipiscript', 'taip script', 'typescript'] },
  { t: 'CRM', d: 'sistema de gestão de clientes', v: ['c r m', 'ce erre eme', 'cê erre eme'] },
  { t: 'ROI', d: 'retorno sobre o investimento', v: ['r o i', 'erre o i'] },
  { t: 'KPI', d: 'indicador de desempenho', v: ['k p i', 'ca pe i', 'cá pê i'] },
  { t: 'Jev', d: 'modelo de decisões da TypeSafe', v: ['jév', 'jeve', 'j e v', 'jota e ve'], a: ['jeff', 'jéu'] },
  { t: 'TypeSafe', d: 'empresa criadora do Jev', v: ['type safe', 'taipe seife', 'taip seif', 'taipe safe', 'typesafe'] },
];

// ---------------------------------------------------------------- tokenização com posições
function palavras(texto) {
  const out = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(texto))) out.push({ n: semAcento(m[0]), ini: m.index, fim: m.index + m[0].length });
  return out;
}

// variantes pré-processadas: [{ ws: ['git','rabi'], termo, ambigua }], das mais longas para as mais curtas
const VARIANTES = [];
for (const g of GLOSSARIO) {
  for (const v of g.v || []) VARIANTES.push({ ws: semAcento(v).split(/[^\p{L}\p{N}]+/u).filter(Boolean), g, ambigua: false });
  for (const v of g.a || []) VARIANTES.push({ ws: semAcento(v).split(/[^\p{L}\p{N}]+/u).filter(Boolean), g, ambigua: true });
}
VARIANTES.sort((x, y) => y.ws.length - x.ws.length);

// chave de pronúncia aproximada (pt/en) para os termos do usuário
function chaveFon(s) {
  return semAcento(s).replace(/[^a-z0-9]/g, '')
    .replace(/ph/g, 'f').replace(/th/g, 't').replace(/sh|ch/g, 'x').replace(/ck|qu|q|k/g, 'c').replace(/w/g, 'u').replace(/y/g, 'i')
    .replace(/ç|ss|z/g, 's').replace(/h/g, '').replace(/(.)\1+/g, '$1').replace(/([bcdfgjlmnprstvx])[ei]$/, '$1');
}
function semelhanca(a, b) {
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

// Termos cadastrados pelo usuário no contexto (um por linha ou separados por vírgula), no máximo 40
export function termosDoUsuario(texto) {
  return String(texto || '').split(/[\n,;]+/).map((t) => t.trim()).filter((t) => t.length >= 2 && t.length <= 40).slice(0, 40);
}

// Resultado: pedaços [{ txt } | { orig, para, id?, d, tipo: 'troca'|'candidato' }] na ordem do texto
export function ajustar(texto, termosUsuario = []) {
  const ws = palavras(texto);
  const usado = new Array(ws.length).fill(false);
  const achados = [];
  for (const v of VARIANTES) {
    const k = v.ws.length;
    for (let i = 0; i + k <= ws.length; i++) {
      if (usado[i]) continue;
      let ok = true;
      for (let j = 0; j < k; j++) if (usado[i + j] || ws[i + j].n !== v.ws[j]) { ok = false; break; }
      if (!ok) continue;
      const orig = texto.slice(ws[i].ini, ws[i + k - 1].fim);
      if (orig === v.g.t) { for (let j = 0; j < k; j++) usado[i + j] = true; continue; }   // já está certo
      achados.push({ i, k, orig, para: v.g.t, d: v.g.d, tipo: v.ambigua ? 'candidato' : 'troca' });
      for (let j = 0; j < k; j++) usado[i + j] = true;
    }
  }
  // termos do usuário: janelas de 1 a 3 palavras parecidas na pronúncia
  for (const termo of termosUsuario) {
    const alvo = chaveFon(termo);
    if (alvo.length < 3) continue;
    const nPal = Math.min(3, Math.max(1, termo.trim().split(/\s+/).length + 1));
    let melhor = null;
    for (let k = 1; k <= nPal; k++) for (let i = 0; i + k <= ws.length; i++) {
      if (usado.slice(i, i + k).some(Boolean)) continue;
      const trecho = texto.slice(ws[i].ini, ws[i + k - 1].fim);
      const nt = semAcento(trecho), nm = semAcento(termo);
      if (nt === nm) { melhor = null; i = ws.length; k = nPal + 1; break; }
      if (nt.includes(nm) || nm.includes(nt) && nm.length - nt.length <= 2) continue;   // plural, flexão ou pedaço do próprio termo
      const s = semelhanca(chaveFon(trecho), alvo);
      if (s >= 0.8 && (!melhor || s > melhor.s)) melhor = { i, k, s, orig: trecho };
    }
    if (melhor) {
      achados.push({ i: melhor.i, k: melhor.k, orig: melhor.orig, para: termo, d: 'termo que o usuário cadastrou no contexto', tipo: melhor.s >= 0.93 ? 'troca' : 'candidato' });
      for (let j = 0; j < melhor.k; j++) usado[melhor.i + j] = true;
    }
  }
  achados.sort((a, b) => a.i - b.i);
  const pedacos = [];
  let pos = 0, nCand = 0;
  for (const a of achados) {
    const ini = ws[a.i].ini, fim = ws[a.i + a.k - 1].fim;
    if (ini > pos) pedacos.push({ txt: texto.slice(pos, ini) });
    const p = { orig: a.orig, para: a.para, d: a.d, tipo: a.tipo };
    if (a.tipo === 'candidato' && nCand < 4) p.id = 'aj' + ++nCand;
    else if (a.tipo === 'candidato') p.tipo = 'ignorado';   // no máximo 4 perguntas de ajuste por fala
    pedacos.push(p);
    pos = fim;
  }
  if (pos < texto.length) pedacos.push({ txt: texto.slice(pos) });
  return pedacos;
}

// texto para o Jev ler: trocas aplicadas e candidatos marcados como "palavra⟨termo?⟩"
export function textoMarcado(pedacos) {
  return pedacos.map((p) => (p.txt != null ? p.txt : p.tipo === 'troca' ? p.para : p.id ? `${p.orig}⟨${p.para}?⟩` : p.orig)).join('');
}
// texto final: trocas + candidatos que o Jev mandou trocar
export function textoFinal(pedacos, escolhas = {}) {
  return pedacos.map((p) => (p.txt != null ? p.txt : p.tipo === 'troca' || (p.id && escolhas[p.id]) ? p.para : p.orig)).join('');
}
export function trocasAplicadas(pedacos, escolhas = {}) {
  return pedacos.filter((p) => p.txt == null && (p.tipo === 'troca' || (p.id && escolhas[p.id]))).map((p) => ({ de: p.orig, para: p.para, jev: !!p.id }));
}
export function perguntasAjuste(pedacos) {
  const q = {};
  for (const p of pedacos) {
    if (!p.id) continue;
    q[p.id] = { type: 'choice', instructions: `Na FALA ATUAL, a palavra "${p.orig}" marcada como ${p.orig}⟨${p.para}?⟩ foi dita mesmo, ou é o reconhecimento de voz errando o termo técnico "${p.para}"?`,
      criteria: { manter: `Foi dito "${p.orig}" mesmo, no sentido comum da palavra`, trocar: `É o termo "${p.para}" (${p.d}), que o reconhecimento de voz escreveu errado` } };
  }
  return q;
}
export function escolhasAjuste(answers, pedacos) {
  const e = {}, probs = {};
  for (const p of pedacos) {
    if (!p.id || !answers || !answers[p.id]) continue;
    const pt = (answers[p.id].probabilities || {}).trocar ?? (answers[p.id].choice === 'trocar' ? 1 : 0);
    probs[p.id] = +pt.toFixed(2);
    e[p.id] = pt >= 0.5;
  }
  return { escolhas: e, probs };
}

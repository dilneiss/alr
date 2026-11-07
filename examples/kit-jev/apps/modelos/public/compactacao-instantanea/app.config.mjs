// Compactação Instantânea — o Jev lê cada resultado de ferramenta no contexto de um agente de código e decide se fica, vira 1 linha ou sai.
// Para adaptar: troque a tarefa atual (contexto.tarefa_atual), as regras das três raias e os resultados de exemplo pelos da sua sessão.
const LIMIAR = 0.7; // abaixo desta confiança o resultado não é mexido (raia "Na dúvida: mantém")
const LINHA = 40; // tokens que sobram quando um resultado vira 1 linha de resumo

const fmtInt = (n) => new Intl.NumberFormat('pt-BR').format(Math.round(n || 0));

// para onde o resultado vai, com a mesma regra das raias: confiança baixa = não mexe
function destino(resp) {
  const a = resp && resp.acao;
  if (!a || !a.probabilities) return 'duvida';
  const conf = Math.max(...Object.values(a.probabilities));
  return conf >= LIMIAR ? a.choice : 'duvida';
}

export default {
  id: 'compactacao-instantanea',
  titulo: 'Compactação Instantânea',
  emoji: '🗜️',
  categoria: 'construtores',
  ordem: 48,
  resumo: 'Antes de o contexto do agente de código estourar, o Jev decide o que fica, o que vira 1 linha e o que sai — e mostra os tokens economizados.',
  descricao: 'A sessão do agente encheu de saídas velhas: logs, buscas, arquivos que já mudaram. Em vez de pedir a um LLM que resuma tudo (lento e caro), o Jev lê cada resultado em lote e decide se ele fica, vira 1 linha ou sai; o que vem com pouca confiança não é mexido.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#4f7cac', acento2: '#f0b45a' },
  origem: 'comunidade: compactação instantânea para o Claude Code (7,7 mil estrelas)',
  tarefa: 'decidir, para cada resultado de ferramenta guardado no contexto de um agente de código, se ele fica inteiro, vira 1 linha ou sai',

  contexto: {
    projeto: 'loja online Casa Nativa (Node + TypeScript); sessão de um agente de código no terminal, com o contexto quase cheio',
    tarefa_atual: 'Corrigir o bug: pedido acima de R$ 199 com cupom de desconto volta a cobrar frete. A causa já foi achada: em src/checkout/cupom.ts (linha 42) o cupom é aplicado ANTES de checar o frete grátis. Falta: corrigir só cupom.ts (frete.ts e carrinho.ts não mudam), escrever o teste novo em tests/checkout/frete.test.ts e rodar a suíte.',
  },
  editavel: {
    campo: 'tarefa_atual',
    rotulo: 'Tarefa atual do agente (o Jev lê isto a cada lote)',
    botao: 'Tarefa',
    ajuda: 'Troque a tarefa (ex.: "melhorar o relatório de vendas mensais") e aperte ▶ de novo: o que era lixo pode virar ouro.',
  },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', titulo: 'Destino no contexto',
      pergunta: 'O contexto do agente está quase cheio. Pensando SÓ na tarefa atual (contexto.tarefa_atual), o que fazer com este resultado de ferramenta? Regras: o agente ainda vai usar o conteúdo inteiro para terminar a tarefa (versão atual do arquivo que vai editar, falha de teste ainda aberta, plano, pedido do usuário) → manter; a conclusão cabe em 1 linha e o resto é peso (busca longa, log enorme da suíte, documento longo do qual só importa um trecho, arquivo lido só para entender) → resumir; não serve mais (versão antiga de arquivo editado depois, erro já corrigido, saída de outro assunto, ruído de instalação ou de inicialização, listagem de pastas, busca sem nada útil) → descartar.',
      opcoes: [
        { id: 'resumir', rotulo: 'Vira 1 linha', icone: '🗜️', cor: '#facc15', desc: 'só a conclusão ainda importa e cabe em 1 linha (onde fica algo, que a suíte passou, o trecho da regra que vale); o conteúdo longo pode sair' },
        { id: 'descartar', rotulo: 'Sai do contexto', icone: '🗑️', cor: '#f87171', desc: 'não ajuda mais na tarefa: versão antiga de arquivo editado depois, erro já corrigido, saída de outro assunto, ruído de instalação ou inicialização, listagem de pastas, busca sem resultado útil' },
        { id: 'manter', rotulo: 'Fica inteiro', icone: '📌', cor: '#34d399', desc: 'o agente ainda vai usar este conteúdo inteiro para terminar a tarefa: a versão atual do arquivo que vai editar, a falha de teste ainda aberta, o plano, uma instrução do usuário' },
      ],
    },
    {
      id: 'pista', tipo: 'noul', titulo: 'Aponta o problema', rotulo: 'aponta o problema', icone: '🎯', tom: 'bom', limiar: 0.75,
      pergunta: 'Este resultado mostra diretamente o problema da tarefa atual (a linha que causa o erro ou a falha que ainda precisa passar)?',
    },
  ],

  fluxo: {
    colunas: 'acao',
    rotuloItem: 'Resultado de ferramenta',
    rotuloFila: 'Contexto do agente',
    lote: 3,
    ritmo: 3000,
    humano: { limiar: LIMIAR, rotulo: 'Na dúvida: mantém', icone: '🤔' },
    cartao: { titulo: 'chamada', texto: 'saida', meta: 'meta', avatar: 'icone' },
    entrada: { placeholder: 'Cole a saída de uma ferramenta (um log, um grep, um arquivo) e veja se ela fica, vira 1 linha ou sai…' },
    rotuloFeitos: 'resultados',
  },

  // chip no cartão: quanto aquele resultado libera
  cartaoExtra(item, resp) {
    if (!item.tokens) return '';
    const d = destino(resp);
    if (d === 'descartar') return `<span class="mj-chip bom">−${fmtInt(item.tokens)} tokens</span>`;
    if (d === 'resumir') return `<span class="mj-chip medio">${fmtInt(item.tokens)} → ${LINHA} tokens</span>`;
    return '';
  },

  aoDecidir(item, resp, extra) {
    const t = item.tokens || 0;
    if (!t) return;
    const d = destino(resp);
    extra.antes = (extra.antes || 0) + t;
    extra.economia = (extra.economia || 0) + (d === 'descartar' ? t : d === 'resumir' ? Math.max(0, t - LINHA) : 0);
  },

  resumoExtra(extra) {
    if (!extra.antes) return [];
    const eco = extra.economia || 0;
    return [
      { rotulo: 'tokens economizados', valor: `${fmtInt(eco)} (${Math.round((eco / extra.antes) * 100)}%)` },
      { rotulo: 'contexto', valor: `${fmtInt(extra.antes)} → ${fmtInt(extra.antes - eco)}` },
    ];
  },

  dados: [
    { id: 'r1', icone: '⌨️', chamada: 'Bash · npm install', saida: 'added 1.284 packages em 38 s; 3 avisos de pacote obsoleto; 0 vulnerabilidades.', meta: 'passo 2 · 1.420 tokens', tokens: 1420, esperado: { acao: 'descartar', pista: false } },
    { id: 'r2', icone: '🔎', chamada: 'Grep · "desconto" em src/', saida: 'Lista completa, linha por linha, de 57 ocorrências em 23 arquivos: cupom.ts:42, frete.ts:131 e outras 55 em relatórios, e-mails de marketing e painel admin.', meta: 'passo 4 · 3.240 tokens', tokens: 3240, esperado: { acao: 'resumir' } },
    { id: 'r3', icone: '🙋', chamada: 'Pergunta ao usuário', saida: 'O usuário respondeu: "pode corrigir, mas não mude a assinatura de aplicarCupom(), outros serviços chamam ela".', meta: 'passo 5 · 110 tokens', tokens: 110, esperado: { acao: 'manter' } },
    { id: 'r4', icone: '📄', chamada: 'Read · src/checkout/cupom.ts', saida: 'Arquivo inteiro (186 linhas): aplicarCupom() subtrai o desconto e chama calcularFrete() com o subtotal já descontado.', meta: 'passo 6 · 1.850 tokens · versão antiga: o arquivo foi editado depois, no passo 18', tokens: 1850, esperado: { acao: 'descartar' } },
    { id: 'r5', icone: '📄', chamada: 'Read · docs/regras-de-frete.md', saida: 'Quatro páginas da política comercial (devoluções, prazos, frete); inclui a regra "o frete grátis vale pelo subtotal ANTES dos cupons".', meta: 'passo 7 · 2.610 tokens', tokens: 2610, esperado: { acao: 'resumir' } },
    { id: 'r6', icone: '⌨️', chamada: 'Bash · ls -R src/', saida: 'Árvore completa do projeto: 214 arquivos em 31 pastas.', meta: 'passo 8 · 2.950 tokens', tokens: 2950, esperado: { acao: 'descartar', pista: false } },
    { id: 'r7', icone: '📄', chamada: 'Read · src/relatorios/vendas-mensais.ts', saida: 'Relatório de vendas por mês: monta os gráficos e exporta para planilha; não chama nada de frete nem de cupom.', meta: 'passo 9 · 2.280 tokens', tokens: 2280, esperado: { acao: 'descartar', pista: false } },
    { id: 'r8', icone: '⌨️', chamada: 'Bash · npm test (suíte inteira)', saida: 'Log completo de 312 testes: 311 passaram, 1 falhou ("frete grátis com cupom"), a mesma falha do passo 22.', meta: 'passo 10 · 6.400 tokens', tokens: 6400, esperado: { acao: 'resumir' } },
    { id: 'r9', icone: '📄', chamada: 'Read · src/checkout/carrinho.ts', saida: 'Monta o subtotal do carrinho e chama aplicarCupom(subtotal, codigo).', meta: 'passo 11 · 1.530 tokens', tokens: 1530 },
    { id: 'r10', icone: '🌐', chamada: 'WebSearch · "vitest simular data"', saida: '10 resultados sobre simular datas nos testes; nenhum foi usado.', meta: 'passo 12 · 1.300 tokens', tokens: 1300, esperado: { acao: 'descartar', pista: false } },
    { id: 'r11', icone: '⌨️', chamada: 'Bash · npx tsc --noEmit', saida: '1 erro de tipo em cupom.ts:44 ("Property \'valor\' does not exist").', meta: 'passo 13 · 640 tokens · erro já corrigido no passo 18', tokens: 640, esperado: { acao: 'descartar' } },
    { id: 'r12', icone: '📄', chamada: 'Read · src/checkout/frete.ts', saida: 'calcularFrete(subtotal): frete grátis quando o subtotal é de R$ 199 ou mais; senão, tabela por CEP. O agente leu para entender a regra do frete.', meta: 'passo 14 · 2.090 tokens', tokens: 2090, esperado: { acao: 'resumir' } },
    { id: 'r13', icone: '🔎', chamada: 'Grep · "calcularFrete("', saida: '3 chamadas: frete.ts:12 (definição), cupom.ts:42 (recebe o subtotal já descontado) e carrinho.ts:88.', meta: 'passo 15 · 260 tokens', tokens: 260 },
    { id: 'r14', icone: '⌨️', chamada: 'Bash · docker compose up -d', saida: 'Subiu postgres e redis; 84 linhas de log de inicialização.', meta: 'passo 16 · 1.760 tokens', tokens: 1760, esperado: { acao: 'descartar', pista: false } },
    { id: 'r15', icone: '⌨️', chamada: 'Bash · npm run lint', saida: '0 erros e 2 avisos de estilo em src/admin/painel.tsx.', meta: 'passo 17 · 930 tokens', tokens: 930, esperado: { acao: 'descartar', pista: false } },
    { id: 'r16', icone: '📄', chamada: 'Read · src/checkout/cupom.ts', saida: 'Versão atual: aplicarCupom() ainda chama calcularFrete() com o subtotal já descontado (linha 42).', meta: 'passo 19 · 1.900 tokens · versão atual', tokens: 1900, esperado: { acao: 'manter', pista: true } },
    { id: 'r17', icone: '📝', chamada: 'TodoWrite · plano', saida: 'Plano: 1) reproduzir o bug ✔ 2) achar a causa ✔ 3) corrigir cupom.ts 4) teste novo 5) rodar a suíte.', meta: 'passo 20 · 220 tokens', tokens: 220, esperado: { acao: 'manter' } },
    { id: 'r18', icone: '⌨️', chamada: 'Bash · git log --oneline -20', saida: 'Os 20 commits mais recentes, com título e autor.', meta: 'passo 21 · 720 tokens', tokens: 720, esperado: { acao: 'descartar', pista: false } },
    { id: 'r19', icone: '⌨️', chamada: 'Bash · npm test -- frete', saida: '1 falha: "frete grátis com cupom". Esperado R$ 0,00, recebido R$ 24,90.', meta: 'passo 22 · 880 tokens · falha ainda aberta', tokens: 880, esperado: { acao: 'manter', pista: true } },
    { id: 'r20', icone: '📄', chamada: 'Read · tests/checkout/frete.test.ts', saida: 'Versão atual: 6 testes de frete; ainda não tem o caso com cupom.', meta: 'passo 23 · 1.340 tokens · versão atual', tokens: 1340, esperado: { acao: 'manter' } },
  ],
};

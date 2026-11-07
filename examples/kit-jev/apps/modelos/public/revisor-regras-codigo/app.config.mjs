// Revisor de Regras do Código — cada regra do time vira uma pergunta sim/não sobre o PR, e o Jev responde todas de uma vez.
// Para adaptar: troque REGRAS pelas regras do SEU time (cada uma com uma pergunta de sim ou não) e cole os seus diffs nos exemplos.
const REGRAS = [
  { id: 'console_log', rotulo: 'console.log no lugar do logger', curta: 'console.log em código de produção', regra: 'Use o logger do time (logger.info, logger.error); nada de console.log em código de produção.', pergunta: 'Alguma linha ADICIONADA (começa com +) chama console.log, console.error ou console.warn em código de produção (fora de arquivo de teste)?' },
  { id: 'segredo', rotulo: 'Senha, token ou chave no código', curta: 'senha, token ou chave escritos no código', regra: 'Nenhuma senha, token ou chave de API escrita no código: leia de uma variável de ambiente.', pergunta: 'Alguma linha ADICIONADA escreve direto no código uma senha, um token ou uma chave de API (um texto secreto entre aspas), em vez de ler de uma variável de ambiente?' },
  { id: 'migracao_sem_nota', rotulo: 'Migração sem nota no PR', curta: 'migração de banco sem nota de migração na descrição', regra: 'Toda migração de banco precisa de uma "Nota de migração" na descrição do PR.', pergunta: 'O PR cria ou altera uma migração de banco de dados E a descrição do PR NÃO tem uma "Nota de migração"? Se não há migração, responda não.' },
  { id: 'funcao_sem_teste', rotulo: 'Função nova sem teste', curta: 'função nova sem teste', regra: 'Função nova precisa de teste novo no mesmo PR (migrações não contam).', pergunta: 'O diff cria uma função nova exportada (fora de migração) e NÃO adiciona nenhum arquivo de teste para ela no mesmo PR? Se não há função nova, responda não.' },
  { id: 'erro_sem_tratamento', rotulo: 'Chamada externa sem tratar erro', curta: 'chamada externa sem tratamento de erro ou catch vazio', regra: 'Chamada externa (rede, banco, arquivo) precisa de tratamento de erro; catch vazio não vale.', pergunta: 'Alguma linha ADICIONADA faz uma chamada externa (fetch, API, banco, arquivo) sem nenhum tratamento de erro em volta, ou tem um catch vazio que engole o erro?' },
  { id: 'texto_sem_t', rotulo: 'Texto de tela sem t()', curta: 'texto de tela sem a função t()', regra: 'Texto que aparece na tela passa pela função t() de tradução.', pergunta: 'Alguma linha ADICIONADA mostra para o usuário um texto escrito direto entre aspas ou entre tags (botão, aviso, título), sem passar pela função t()?' },
  { id: 'todo_sem_dono', rotulo: 'TODO sem dono e issue', curta: 'TODO ou FIXME sem dono e sem issue', regra: 'TODO ou FIXME precisa de dono e de issue, ex.: TODO(@ana, #123).', pergunta: 'Alguma linha ADICIONADA tem um TODO ou FIXME sem responsável e sem número de issue (o certo é como TODO(@ana, #123))?' },
  { id: 'dado_pessoal_log', rotulo: 'Dado pessoal em log', curta: 'CPF, e-mail, telefone ou cartão gravados em log', regra: 'Nunca grave em log dado pessoal: CPF, e-mail, telefone ou cartão.', pergunta: 'Alguma linha ADICIONADA grava em log (logger ou console) um dado pessoal de cliente: CPF, e-mail, telefone ou número de cartão?' },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'revisor-regras-codigo',
  titulo: 'Revisor de Regras do Código',
  emoji: '📏',
  categoria: 'construtores',
  ordem: 58,
  resumo: 'Cole o diff do PR: cada regra do time vira uma pergunta de sim ou não, e o Jev responde todas juntas em menos de um segundo.',
  descricao: 'Lint de estilo o computador já faz; o difícil são as regras de bom senso do time: usar o logger, não deixar chave no código, migração com nota, texto de tela traduzido. Aqui cada regra é uma pergunta ao Jev sobre o diff, todas numa chamada só, e o veredito aponta quais regras o PR quebrou.',
  marcas: ['volume', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#c879f2', acento2: '#60a5fa' },
  origem: 'comunidade: "Jev Code Check" (YouTube), 370 regras em menos de 2 s',

  contexto: {
    time: 'time de produto da Loja Pomar (fictícia): app web em TypeScript e React',
    regras: REGRAS.map((r, i) => `${i + 1}. ${r.regra}`),
  },

  aovivo: {
    skin: 'codigo',
    campo: 'pr',
    janela: 'Revisão do PR · loja-web',
    rotulo: 'Descrição e diff do PR',
    placeholder: 'Cole aqui a descrição e o diff do PR (linhas com + e -)…',
    dica: 'O Jev confere as 8 regras do time de uma vez, a cada mudança no texto.',
    digitar: false,
    mono: true,
    pausa: 7000,
    tituloChecklist: 'Regras do time (! = o PR quebrou)',
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', papel: 'destaque', titulo: 'Veredito',
      pergunta: `Pelas regras do time (contexto.regras), este PR pode ser aprovado? Peça ajustes se as linhas ADICIONADAS tiverem qualquer um destes problemas: ${REGRAS.map((r, i) => `(${i + 1}) ${r.curta}`).join('; ')}. Sem nenhum deles, aprove.`,
      opcoes: [
        { id: 'pedir_ajustes', rotulo: 'Pedir ajustes', icone: '✋', cor: '#fbbf24', desc: 'o PR quebra pelo menos uma das regras do time' },
        { id: 'aprovar', rotulo: 'Aprovar', icone: '✅', cor: '#34d399', desc: 'nenhuma regra do time quebrada nas linhas adicionadas' },
        { id: 'revisao_humana', rotulo: 'Precisa de uma pessoa', icone: '🙋', cor: '#60a5fa', desc: 'não dá para julgar só pelas regras: diff incompleto ou cortado, ou mudança grande de arquitetura' },
      ],
    },
    ...REGRAS.map((r) => ({ id: r.id, tipo: 'noul', papel: 'checklist', rotulo: r.rotulo, tom: 'ruim', pergunta: r.pergunta })),
  ],

  // painel do topo: quantas regras o PR quebrou e quanto tempo o Jev levou para conferir todas
  render(r) {
    const resp = (r && r.respostas) || {};
    const quebradas = REGRAS.filter((x) => resp[x.id] && resp[x.id].noul >= 0.5);
    const chips = quebradas.length
      ? quebradas.map((x) => `<span class="mj-chip ruim">${esc(x.rotulo)}</span>`).join('')
      : '<span class="mj-chip bom">✓ dentro das regras do time</span>';
    const ms = r && r.latencia_ms != null ? `${Math.round(r.latencia_ms)} ms` : '—';
    return `<div class="mj-widget mj-painel-box"><h4>Resumo da revisão</h4><div class="mj-contadores">`
      + `<div class="mj-contador"><b style="color:${quebradas.length ? 'var(--mj-ruim)' : 'var(--mj-bom)'}">${quebradas.length}</b><span>de ${REGRAS.length} regras quebradas</span></div>`
      + `<div class="mj-contador"><b>${ms}</b><span>${REGRAS.length + 1} perguntas numa chamada</span></div></div>`
      + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${chips}</div></div>`;
  },

  exemplos: [
    {
      titulo: 'Cupom no carrinho',
      texto: `PR #318 · Cupom no carrinho
Descrição: aplica o cupom digitado no total do carrinho.

--- a/src/carrinho/cupom.ts
+++ b/src/carrinho/cupom.ts
@@ -1,4 +1,20 @@
 import { logger } from '@/log';
+import { buscarCupom } from '@/api/cupons';
+
+export function aplicarCupom(total: number, percentual: number): number {
+  const desconto = Math.min(percentual, 15);
+  console.log('aplicando cupom', desconto);
+  return total * (1 - desconto / 100);
+}
+
+export async function validarCupom(codigo: string) {
+  try {
+    const cupom = await buscarCupom(codigo);
+    return cupom.ativo;
+  } catch (erro) {
+    logger.error('falha ao validar cupom', { codigo, erro });
+    return false;
+  }
+}
--- a/src/carrinho/ResumoCarrinho.tsx
+++ b/src/carrinho/ResumoCarrinho.tsx
@@ -14,6 +14,8 @@
     <div className="resumo">
       <span>{t('carrinho.total')}</span>
+      <button onClick={aplicar}>Aplicar cupom</button>
+      <p className="aviso">Cupom aplicado com sucesso!</p>
     </div>`,
      esperado: { veredito: 'pedir_ajustes', console_log: true, segredo: false, migracao_sem_nota: false, funcao_sem_teste: true, erro_sem_tratamento: false, texto_sem_t: true, todo_sem_dono: false, dado_pessoal_log: false },
    },
    {
      titulo: 'Frete da transportadora',
      texto: `PR #322 · Frete pela transportadora Rota Sul
Descrição: calcula o frete chamando a API da transportadora.

--- a/src/frete/rotaSul.ts
+++ b/src/frete/rotaSul.ts
@@ -0,0 +1,13 @@
+import { logger } from '@/log';
+
+const TOKEN_ROTA_SUL = 'rs_prod_7Hq2xV9kLm4Pz8Rw';
+
+export async function cotarFrete(cep: string, pesoKg: number, cliente: Cliente) {
+  // TODO: ver isso depois
+  const resposta = await fetch(\`https://api.rotasul.exemplo/cotacao?cep=\${cep}&peso=\${pesoKg}\`, {
+    headers: { Authorization: \`Bearer \${TOKEN_ROTA_SUL}\` },
+  });
+  const dados = await resposta.json();
+  logger.info('frete cotado', { cpf: cliente.cpf, email: cliente.email, valor: dados.valor });
+  return dados.valor;
+}
--- a/src/frete/rotaSul.test.ts
+++ b/src/frete/rotaSul.test.ts
@@ -0,0 +1,7 @@
+import { cotarFrete } from '@/frete/rotaSul';
+
+test('cota o frete para um CEP de São Paulo', async () => {
+  simularFetch({ valor: 24.9 });
+  const valor = await cotarFrete('01001-000', 2, clienteDeTeste);
+  expect(valor).toBe(24.9);
+});`,
      esperado: { veredito: 'pedir_ajustes', console_log: false, segredo: true, migracao_sem_nota: false, funcao_sem_teste: false, erro_sem_tratamento: true, texto_sem_t: false, todo_sem_dono: true, dado_pessoal_log: true },
    },
    {
      titulo: 'Apelido no cadastro',
      texto: `PR #327 · Apelido no cadastro
Descrição: adiciona o campo "apelido" ao cadastro do cliente.
Nota de migração: cria a coluna apelido (texto, opcional) em clientes; os cadastros antigos ficam sem apelido e o down desfaz.

--- a/migracoes/20261020_apelido_cliente.ts
+++ b/migracoes/20261020_apelido_cliente.ts
@@ -0,0 +1,3 @@
+export async function up(db: Banco) {
+  await db.schema.alterTable('clientes', (tabela) => tabela.string('apelido').nullable());
+}
--- a/src/cadastro/salvarApelido.ts
+++ b/src/cadastro/salvarApelido.ts
@@ -0,0 +1,10 @@
+export async function salvarApelido(id: string, apelido: string) {
+  try {
+    await api.atualizarCliente(id, { apelido: apelido.trim() });
+    logger.info('apelido salvo', { clienteId: id });
+  } catch (erro) {
+    logger.error('falha ao salvar apelido', { clienteId: id, erro });
+    throw erro;
+  }
+  // TODO(@marina, #412): limitar o apelido a 30 caracteres
+}
--- a/src/cadastro/salvarApelido.test.ts
+++ b/src/cadastro/salvarApelido.test.ts
@@ -0,0 +1,4 @@
+test('salva o apelido sem espaços nas pontas', async () => {
+  await salvarApelido('c-42', '  Nanda ');
+  expect(api.atualizarCliente).toHaveBeenCalledWith('c-42', { apelido: 'Nanda' });
+});
--- a/src/cadastro/FormCadastro.tsx
+++ b/src/cadastro/FormCadastro.tsx
@@ -22,3 +22,4 @@
       <Campo nome="email" rotulo={t('cadastro.email')} />
+      <Campo nome="apelido" rotulo={t('cadastro.apelido')} ajuda={t('cadastro.apelido_ajuda')} />`,
      esperado: { veredito: 'aprovar', console_log: false, segredo: false, migracao_sem_nota: false, funcao_sem_teste: false, erro_sem_tratamento: false, texto_sem_t: false, todo_sem_dono: false, dado_pessoal_log: false },
    },
    {
      titulo: 'Status de separação',
      texto: `PR #331 · Status "em separação" nos pedidos
Descrição: mostra quando o pedido está sendo separado no estoque.

--- a/migracoes/20261021_status_separacao.ts
+++ b/migracoes/20261021_status_separacao.ts
@@ -0,0 +1,3 @@
+export async function up(db: Banco) {
+  await db.schema.alterTable('pedidos', (tabela) => tabela.string('status_separacao').defaultTo('pendente'));
+}
--- a/src/pedidos/atualizarSeparacao.ts
+++ b/src/pedidos/atualizarSeparacao.ts
@@ -0,0 +1,6 @@
+export async function atualizarSeparacao(pedidoId: string, status: string) {
+  try {
+    await api.atualizarPedido(pedidoId, { status_separacao: status });
+    logger.info('separação atualizada', { pedidoId, status });
+  } catch (erro) {}
+}
--- a/src/pedidos/atualizarSeparacao.test.ts
+++ b/src/pedidos/atualizarSeparacao.test.ts
@@ -0,0 +1,4 @@
+test('atualiza o status de separação', async () => {
+  await atualizarSeparacao('p-77', 'separando');
+  expect(api.atualizarPedido).toHaveBeenCalled();
+});
--- a/src/pedidos/StatusPedido.tsx
+++ b/src/pedidos/StatusPedido.tsx
@@ -8,2 +8,3 @@
   <Etiqueta texto={t('pedido.status.' + pedido.status)} />
+  <Etiqueta texto={t('pedido.separacao.' + pedido.status_separacao)} />`,
      esperado: { veredito: 'pedir_ajustes', console_log: false, segredo: false, migracao_sem_nota: true, funcao_sem_teste: false, erro_sem_tratamento: true, texto_sem_t: false, todo_sem_dono: false, dado_pessoal_log: false },
    },
  ],
};

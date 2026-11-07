// QA Adversarial — o agente. Pilota um Chromium de verdade (Playwright), monta o estado da tela,
// pergunta ao Jev qual ação e qual valor têm mais chance de quebrar o site, executa, e roda oráculos
// automáticos para detectar bugs. Cada achado volta ao Jev para triagem (bug real? severidade? categoria?).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// ---------------- vocabulário de ataque (critérios = política) ----------------
export const VALORES = {
  vazio: 'Deixar o campo vazio e enviar — revela contas com NaN, erros de servidor e falta de validação de obrigatório',
  zero: 'Digitar 0 — quantidades ou valores zerados que não deveriam ser aceitos',
  negativo: 'Digitar um número negativo como -3 — para achar totais, estoques ou preços negativos',
  numero_enorme: 'Digitar um número gigante (99999999999) — estouro de limites e de formatação',
  texto_muito_longo: 'Digitar um texto muito longo, com mais de 120 caracteres — estoura o layout e limites de tamanho',
  caracteres_especiais: 'Digitar símbolos como ! @ # $ % * ( [ { — quebram código que monta regex, consultas ou expressões com o texto (cupons, códigos, filtros)',
  emoji: 'Digitar emojis 🔥😂🎉 — problemas de codificação de caracteres',
  sql_injection: "Digitar uma injeção de SQL (' OR '1'='1) — consultas ao banco mal protegidas",
  script_xss: 'Digitar um script <script>alert(1)</script> — injeção de HTML/JavaScript (XSS)',
  email_invalido: 'Digitar um e-mail incompleto como "a@" — para achar validação fraca de e-mail',
  valor_normal: 'Digitar um valor válido e comum para o campo — controle, ou para conseguir avançar no fluxo',
};
const AMOSTRA = {
  vazio: '', zero: '0', negativo: '-3', numero_enorme: '99999999999',
  texto_muito_longo: 'Maria Aparecida da Conceição Buarque de Hollanda dos Santos Nascimento Albuquerque Junior Neto',
  caracteres_especiais: '!@#$%*([{', emoji: '🔥😂🎉🐞', sql_injection: "' OR '1'='1",
  script_xss: '<script>alert(1)</script>', email_invalido: 'a@', valor_normal: null,
};
const NORMAIS = { cep: '01310-100', cupom: 'BEMVINDO10', email: 'cliente.teste@email.com', nome: 'Cliente de Teste', busca: 'fone', qtd: '2', outro: 'teste' };

export const ESTRATEGIAS = {
  explorar_novas_telas: 'Explorar telas ainda não visitadas (clicar em links e menus) para aumentar a cobertura do site',
  atacar_formulario: 'Atacar um formulário desta tela preenchendo campos com entradas maliciosas ou inválidas e enviando',
  testar_limites: 'Testar limites em campos numéricos: vazio, zero, negativo, números enormes',
  repetir_acao_rapido: 'Repetir uma ação muito rápido (clique duplo num botão de confirmar/enviar) para achar duplicidade',
};
const CATEGORIAS = {
  crash_js: 'Erro de JavaScript não tratado no navegador (exceção, a página quebra)',
  erro_servidor: 'Erro no servidor: resposta HTTP 500 ou similar',
  calculo_errado: 'Cálculo ou valor errado exibido (total negativo, R$ NaN, preço impossível)',
  validacao_fraca: 'Validação fraca: aceitou uma entrada que deveria ter recusado (e-mail inválido, quantidade absurda)',
  layout_quebrado: 'Layout quebrado: texto vaza da caixa, rolagem horizontal, elementos sobrepostos',
  link_quebrado: 'Link ou navegação quebrada: leva a uma página que não existe (404)',
  duplicidade: 'Ação duplicada: a mesma operação foi registrada duas vezes (pedido em dobro)',
  outro_problema: 'Outro tipo de problema de qualidade',
};
const SEVERIDADES = [
  'Cosmético: incomoda mas não atrapalha a compra',
  'Moderado: atrapalha ou confunde, mas há como contornar',
  'Grave: impede uma tarefa importante ou mostra dado errado ao cliente',
  'Crítico: perda de dinheiro, cobrança errada, pedido duplicado ou vazamento',
];

// ---------------- oráculo de layout (rodado sob demanda na página) ----------------
const OVERFLOW = `(() => {
  const de = document.documentElement;
  const scroll = de.scrollWidth - de.clientWidth;
  let pior = null;
  // foco nos elementos de conteúdo do checkout/produto (a etiqueta é onde mora o bug de nome longo);
  // o contador do carrinho e o menu ficam de fora para não gerar ruído auto-infligido.
  for (const el of document.querySelectorAll('.et-nome, .lb-etiqueta, .lb-item .nm')) {
    if (el.scrollWidth - el.clientWidth > 12) { const r = el.getBoundingClientRect(); pior = { alvo: (el.className||el.tagName).toString().slice(0,40), excesso: el.scrollWidth - el.clientWidth, texto: (el.textContent||'').trim().slice(0,60) }; break; }
  }
  return { scroll_horizontal: pior ? scroll : 0, elemento: pior };
})();`;

// ---------------- utilidades ----------------
const clamp = (s, n) => (s == null ? '' : String(s)).slice(0, n);
const nowISO = () => new Date().toISOString();

function tipoElemento(tag, type) {
  if (tag === 'a') return 'link';
  if (tag === 'button' || (tag === 'input' && ['submit', 'button'].includes(type))) return 'botao';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'campo';
  if (tag === 'input') return 'campo';
  return 'outro';
}
function categoriaCampo(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('cep')) return 'cep';
  if (n.includes('cupom')) return 'cupom';
  if (n.includes('mail') || n.includes('e-mail')) return 'email';
  if (n.includes('nome')) return 'nome';
  if (n.includes('busca') || n.includes('buscar') || n.includes('search') || n === 'q') return 'busca';
  if (n.includes('quantidade') || n.includes('qtd')) return 'qtd';
  return 'outro';
}

// snapshot dos elementos interativos visíveis (rótulo, tipo, placeholder)
async function inventario(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < (window.innerHeight + 1200); };
    const rotulo = (el) => {
      let t = (el.getAttribute('aria-label') || '').trim();
      if (!t && el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) t = l.textContent.trim(); }
      if (!t) t = (el.textContent || '').trim();
      if (!t) t = (el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').trim();
      return t.replace(/\s+/g, ' ').trim().slice(0, 70);
    };
    const out = [];
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea';
    for (const el of document.querySelectorAll(sel)) {
      if (!vis(el) || el.disabled) continue;
      const tag = el.tagName.toLowerCase();
      out.push({
        tag, type: (el.getAttribute('type') || '').toLowerCase(),
        rotulo: rotulo(el) || '(sem rótulo)',
        placeholder: (el.getAttribute('placeholder') || '').slice(0, 40),
        name: (el.getAttribute('name') || '').slice(0, 40),
        id: (el.id || '').slice(0, 40),
        href: tag === 'a' ? (el.getAttribute('href') || '') : '',
      });
      if (out.length >= 40) break;
    }
    return out;
  });
}

// ---------------- o agente ----------------
export class QaRun {
  constructor({ dir, jev, bugs, onEvent, maxSteps = 70, maxMs = 120000, base }) {
    this.dir = dir; this.jev = jev; this.onEvent = onEvent || (() => {});
    this.maxSteps = maxSteps; this.maxMs = maxMs; this.base = base;
    this.bugsGabarito = bugs;
    this.reset();
  }
  reset() {
    this.step = 0; this.cost = 0; this.jevCalls = 0; this.questions = 0;
    this.achados = [];           // bugs confirmados pela triagem
    this.gabaritoHit = new Set(); // ids do gabarito já casados
    this.historico = [];         // últimas ações (texto)
    this.testados = {};          // categoriaCampo -> Set(valores já usados)
    this.visitadas = new Set();
    this.cliquesBotao = {};      // rótulo -> contagem
    this.botaoInutil = {};       // rótulo -> vezes clicado sem achar nada (para "esgotar")
    this.campoInutil = {};       // categoria de campo -> fills sem achar nada
    this.pedidosCriados = 0;
    this.ultimoBug = 0;          // passo do último bug novo (para encerrar quando estagnar)
    this.vistos = new Set();     // assinaturas de achados para não duplicar
  }

  emit(type, data) { try { this.onEvent(type, data); } catch {} }

  registraTestado(cat, valor) { (this.testados[cat] ||= new Set()).add(valor); }
  jaTestado(cat) { return [...(this.testados[cat] || [])]; }

  async run() {
    const t0 = Date.now();
    this.emit('inicio', { maxSteps: this.maxSteps, maxMs: this.maxMs });
    const CHROME = process.env.CHROME_PATH || [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          '/usr/bin/google-chrome',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ].find((p) => { try { return require('node:fs').existsSync(p); } catch { return false; } });
        const browser = await chromium.launch({ headless: true, ...(CHROME ? { executablePath: CHROME } : {}), args: ['--disable-dev-shm-usage', '--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 1, locale: 'pt-BR' });
    context.setDefaultTimeout(3000);
    context.setDefaultNavigationTimeout(8000);
    const page = await context.newPage();

    // captura de console e rede
    const consoleErros = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErros.push(clamp(m.text(), 300)); });
    page.on('pageerror', (e) => consoleErros.push('pageerror: ' + clamp(e.stack || e.message, 380)));
    const rede = [];
    page.on('response', (r) => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/alvo/')) rede.push({ status: r.status(), method: r.request().method(), path: u.pathname, nav: r.request().isNavigationRequest(), at: Date.now() }); } catch {} });

    try {
      await page.goto(this.base + '/alvo/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      await this.shot(page, 'abrindo a Loja Bugada');

      while (this.step < this.maxSteps && Date.now() - t0 < this.maxMs) {
        this.step++;
        const consoleAntes = consoleErros.length, redeAntes = rede.length;

        const inv = await inventario(page);
        const decisao = await this.decidir(page, inv);
        if (!decisao) break;
        const acao = await this.executar(page, inv, decisao);

        // oráculos
        const overflow = await page.evaluate(OVERFLOW).catch(() => null);
        const novosConsole = consoleErros.slice(consoleAntes);
        const novaRede = rede.slice(redeAntes);
        const achadosPasso = await this.oraculos({ page, acao, novosConsole, novaRede, overflow });

        // "esgotamento": ações que não rendem bug novo saem do cardápio, para o Jev não repetir em loop.
        const rendeu = achadosPasso.length > 0;
        if (acao.tipo === 'clicar' || acao.tipo === 'clique_duplo') this.botaoInutil[acao.elemento] = rendeu ? 0 : (this.botaoInutil[acao.elemento] || 0) + 1;
        if (acao.tipo === 'preencher' && acao.cat) this.campoInutil[acao.cat] = rendeu ? 0 : (this.campoInutil[acao.cat] || 0) + 1;

        this.historico.push(acao.resumo + (rendeu ? ' → achou bug!' : ''));
        if (this.historico.length > 12) this.historico.shift();
        this.emit('passo', { step: this.step, acao, achados: achadosPasso.length, placar: this.placar(), _jev: decisao.dbg });
        await this.shot(page, acao.resumo);

        if (this.gabaritoHit.size >= this.bugsGabarito.length) break; // achou tudo
        if (this.step >= 30 && this.step - this.ultimoBug >= 16) break; // estagnou: nada novo há 16 passos
        // detector de loop: últimas 6 ações todas "ir para o início" sem achar nada = beco sem saída
        if (this.historico.length >= 6 && this.historico.slice(-6).every((h) => h.startsWith('Ir para a página inicial') && !h.includes('achou'))) break;
        if (this.cost > 0.018) break; // teto de custo de segurança
      }
    } catch (e) {
      this.emit('erro_execucao', { msg: clamp(e.message, 300) });
    } finally {
      await browser.close().catch(() => {});
    }

    const rel = this.relatorio(Date.now() - t0);
    this.emit('fim', rel);
    return rel;
  }

  // ---- decisão do Jev: próxima ação + valores dos campos + estratégia (uma só chamada) ----
  async decidir(page, inv) {
    const elementos = {}; const criterios = {};
    const idsCampo = [];
    const TODOS_VALORES = Object.keys(VALORES);
    // "busca" e "newsletter" existem em todo o rodapé/topo e, ao enviar, LEVAM para outra tela.
    // Se a tela atual tem um formulário próprio ainda por testar (cupom, CEP, nome, quantidade),
    // escondemos os campos globais para o testador terminar o formulário local antes de sair.
    const GLOBAIS = new Set(['busca', 'email']);
    const temLocalFresco = inv.some((e) => {
      if (tipoElemento(e.tag, e.type) !== 'campo') return false;
      const c = categoriaCampo(e.rotulo || e.name || e.placeholder);
      return !GLOBAIS.has(c) && this.jaTestado(c).length < 5;
    });
    inv.forEach((e, i) => {
      const id = 'e' + (i + 1);
      const tipo = tipoElemento(e.tag, e.type);
      const cat = categoriaCampo(e.rotulo || e.name || e.placeholder);
      // esgotados saem do cardápio — assim o Jev é empurrado para o que ainda não foi testado
      if (tipo === 'botao' && (this.botaoInutil[e.rotulo] || 0) >= 2) return;
      if (tipo === 'campo' && this.jaTestado(cat).length >= 5) return;   // 5 valores distintos sem bug = campo aposentado
      if (tipo === 'campo' && GLOBAIS.has(cat) && temLocalFresco) return; // termine o formulário desta tela primeiro
      // com formulário local por testar, também escondemos os links de nav do topo (logo/carrinho/checkout)
      if (tipo === 'link' && temLocalFresco) {
        const p = (e.href || '').split('?')[0].replace(/\/+$/, '') || '/alvo';
        if (['/alvo', '/alvo/carrinho', '/alvo/checkout'].includes(p)) return;
      }
      let d = `${tipo} “${e.rotulo}”`;
      if (e.placeholder) d += ` (placeholder “${e.placeholder}”)`;
      if (tipo === 'link' && e.href) { d += ` → ${e.href}${this.visitadas.has(e.href) ? ' [já visitado]' : ' [NOVO, nunca visitado]'}`; }
      if (tipo === 'botao') { const n = this.cliquesBotao[e.rotulo] || 0; d += n ? ` [já clicado ${n}×]` : ' [nunca clicado]'; }
      if (tipo === 'campo') { const t = this.jaTestado(cat); d += t.length ? ` [já testados: ${t.join(', ')}; teste um valor NOVO]` : ' [campo novo, nada testado]'; }
      elementos[id] = { ...e, tipo, cat };
      criterios[id] = d;
      if (tipo === 'campo') idsCampo.push(id);
      if (tipo === 'botao') criterios[id + '_x2'] = `clique DUPLO rápido no botão “${e.rotulo}” — para achar ação/pedido duplicado`;
    });
    // enquanto houver um campo NESTA tela ainda não esgotado, não oferecemos "sair da página":
    // o testador termina de atacar o formulário atual antes de explorar outra tela.
    const campoLocalFresco = idsCampo.some((id) => this.jaTestado(elementos[id].cat).length < 5);
    if (!campoLocalFresco) {
      criterios.voltar = 'Voltar para a página anterior do navegador';
      criterios.ir_para_inicio = 'Ir para a página inicial da loja (/alvo/) e explorar outra tela';
    }

    const questions = {
      proxima_acao: { type: 'choice', instructions: 'Você é um testador de QA adversarial: seu objetivo é QUEBRAR esta loja virtual e achar o próximo bug. Escolha a ação com mais chance de revelar um bug AINDA NÃO encontrado. Prefira campos e botões ainda não testados, links marcados como [NOVO], e o clique duplo em botões de confirmar/enviar. Evite repetir ações [já testadas] que não deram em nada.', criteria: criterios },
      estrategia: { type: 'choice', instructions: 'Qual estratégia geral de ataque faz mais sentido agora, considerando o que já foi testado?', criteria: ESTRATEGIAS },
    };
    for (const id of idsCampo) {
      const e = elementos[id];
      const t = this.jaTestado(e.cat);
      questions['valor_' + id] = { type: 'choice', instructions: `Vai atacar o campo ${id} (“${e.rotulo}”, categoria ${e.cat}). Qual valor tem MAIS chance de expor um defeito — seja QUEBRANDO o site (erro, cálculo errado, layout estourado) OU revelando validação FRACA (o site aceitar algo que deveria recusar, como um e-mail malformado tipo "a@", uma quantidade zero/negativa)? Já testados neste tipo de campo: ${t.length ? t.join(', ') : 'nenhum'} — escolha um valor NOVO.`, criteria: VALORES };
    }

    const state = {
      tarefa: 'Teste adversarial automatizado da Loja Bugada, um e-commerce de demonstração. Ache o máximo de bugs.',
      passo: this.step, de: this.maxSteps,
      pagina_atual: {
        url: new URL(page.url()).pathname,
        titulo: clamp(await page.title().catch(() => ''), 80),
        texto_visivel: clamp((await page.evaluate(() => document.querySelector('#app') ? document.querySelector('#app').innerText : document.body.innerText).catch(() => '')).replace(/\s+/g, ' '), 700),
      },
      elementos_interativos: criterios,
      ultimas_acoes: this.historico.slice(-8),
      bugs_ja_encontrados: this.achados.map((b) => `${b.categoria}: ${b.titulo}`),
      paginas_ja_visitadas: [...this.visitadas].slice(-10),
    };

    let r;
    try { r = await this.jev({ state, questions }); }
    catch (e) { this.emit('erro_jev', { msg: clamp(e.message, 240), code: e.code }); return null; }
    this.cost += r.cost || 0; this.jevCalls++; this.questions += Object.keys(questions).length;

    const a = r.answers;
    const escolha = a.proxima_acao.choice;
    const valores = {};
    for (const id of idsCampo) {
      const q = a['valor_' + id];
      const cat = elementos[id].cat;
      let v = q ? q.choice : 'valor_normal';
      const tested = new Set(this.jaTestado(cat));
      // se o Jev repetiu um valor já testado, pula para o de maior probabilidade AINDA não testado
      if (q && tested.has(v)) {
        const novo = Object.entries(q.probabilities).sort((x, y) => y[1] - x[1]).find(([k]) => !tested.has(k));
        if (novo) v = novo[0];
      }
      valores[id] = v;
    }
    return {
      escolha, elementos, valores, estrategia: a.estrategia.choice,
      probs: a.proxima_acao.probabilities, conf: a.proxima_acao.confidence,
      estrProbs: a.estrategia.probabilities,
      dbg: r.debug, latency_ms: r.latency_ms, cost: r.cost,
    };
  }

  // ---- executa a ação escolhida no navegador de verdade ----
  // Todos os elementos são endereçados pelo índice do inventário (i), que casa com o mesmo seletor
  // usado na varredura: rápido, determinístico e sem ambiguidade de strict mode.
  async executar(page, inv, d) {
    const acao = { tipo: '', resumo: '', elemento: '', valor: '', estrategia: d.estrategia, latency_ms: d.latency_ms, cost: d.cost, top: this.topProbs(d), url: new URL(page.url()).pathname };
    const escolha = d.escolha;
    try {
      if (escolha === 'voltar') { acao.tipo = 'voltar'; acao.resumo = 'Voltar para a página anterior'; await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {}); this.marcaVisita(page); return acao; }
      const baseId = escolha.replace(/_x2$/, '');
      if (escolha === 'ir_para_inicio' || !d.elementos[baseId]) {
        acao.tipo = 'navegar'; acao.resumo = 'Ir para a página inicial'; await page.goto(this.base + '/alvo/', { waitUntil: 'domcontentloaded' }); this.marcaVisita(page); return acao;
      }
      const duplo = escolha.endsWith('_x2');
      const e = d.elementos[baseId];
      const idx = Number(baseId.slice(1)) - 1;   // índice no inventário
      acao.elemento = e.rotulo;

      if (e.tipo === 'link') {
        acao.tipo = 'clicar_link'; acao.resumo = `Clicar no link “${e.rotulo}”`;
        await this.clicarIndice(page, idx);
        await this.settle(page, 380);
        this.marcaVisita(page);
        return acao;
      }
      if (e.tipo === 'campo') {
        const valorId = d.valores[baseId] || 'valor_normal';
        const cat = e.cat;
        const texto = valorId === 'valor_normal' ? (NORMAIS[cat] || NORMAIS.outro) : AMOSTRA[valorId];
        this.registraTestado(cat, valorId);
        acao.tipo = 'preencher'; acao.valor = valorId; acao.valorTexto = texto; acao.cat = cat;
        acao.resumo = `Preencher “${e.rotulo}” com ${this.rotuloValor(valorId)} e enviar`;
        await this.preencherEEnviar(page, idx, String(texto ?? ''));
        await this.settle(page, 380);
        this.marcaVisita(page);
        return acao;
      }
      // botão
      acao.tipo = duplo ? 'clique_duplo' : 'clicar';
      acao.resumo = (duplo ? 'Clique DUPLO rápido em ' : 'Clicar em ') + `“${e.rotulo}”`;
      this.cliquesBotao[e.rotulo] = (this.cliquesBotao[e.rotulo] || 0) + (duplo ? 2 : 1);
      await this.clicarIndice(page, idx, duplo);
      await this.settle(page, 380);
      this.marcaVisita(page);
      return acao;
    } catch (e) {
      acao.tipo = acao.tipo || 'erro'; acao.resumo = acao.resumo || 'Ação falhou: ' + clamp(e.message, 80);
      return acao;
    }
  }

  // clica o i-ésimo elemento interativo (mesma ordem do inventário). Duplo = dois cliques imediatos.
  async clicarIndice(page, idx, duplo = false) {
    return page.evaluate(({ idx, duplo }) => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < (window.innerHeight + 1200); };
      const els = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea')].filter((el) => vis(el) && !el.disabled).slice(0, 40);
      const el = els[idx];
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      if (duplo) el.click();   // segundo disparo imediato — reproduz o "clique duplo" do usuário afobado
      return true;
    }, { idx, duplo }).catch(() => false);
  }

  // preenche o i-ésimo elemento (campo) e submete o formulário. Retorna true se navegou.
  async preencherEEnviar(page, idx, texto) {
    return page.evaluate(({ idx, texto }) => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < (window.innerHeight + 1200); };
      const els = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea')].filter((el) => vis(el) && !el.disabled).slice(0, 40);
      const el = els[idx];
      if (!el) return false;
      el.focus();
      el.value = texto;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      const f = el.closest('form');
      if (f) { if (typeof f.requestSubmit === 'function') f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); return true; }
      return false;
    }, { idx, texto }).catch(() => false);
  }

  // espera curta: dá tempo de a navegação local (ou o handler JS) assentar antes dos oráculos.
  async settle(page, ms) { await page.waitForLoadState('domcontentloaded').catch(() => {}); await page.waitForTimeout(ms); }

  marcaVisita(page) { try { this.visitadas.add(new URL(page.url()).pathname); } catch {} }

  // ---- oráculos: detectam sintomas; o Jev faz a triagem ----
  async oraculos({ page, acao, novosConsole, novaRede, overflow }) {
    const achados = [];
    const add = async (sintoma) => { const b = await this.triagem(page, sintoma); if (b) achados.push(b); };

    // 1) erros de JS não tratados (pageerror) e console.error
    const jsVistos = new Set();
    for (const msg of novosConsole) {
      if (/favicon|net::ERR|Failed to load resource|ERR_/i.test(msg)) continue;
      const chave = msg.replace(/:\d+:\d+/g, '').slice(0, 70);
      if (jsVistos.has(chave)) continue; jsVistos.add(chave);
      await add({ oraculo: 'erro_js', titulo: 'Erro de JavaScript não tratado', evidencia: clamp(msg, 300), assinatura: 'js:' + chave });
    }
    // 2) respostas HTTP com erro
    for (const r of novaRede) {
      if (r.status >= 500) await add({ oraculo: 'http', titulo: `Servidor respondeu ${r.status} em ${r.path}`, evidencia: `${r.method} ${r.path} → HTTP ${r.status}`, assinatura: 'http5:' + r.path });
      else if (r.status === 404 && r.nav) await add({ oraculo: 'http', titulo: 'Link levou a uma página inexistente (404)', evidencia: `${r.method} ${r.path} → HTTP 404`, assinatura: 'http404:' + r.path });
    }
    // 3) texto suspeito na tela (NaN / undefined / R$ negativo)
    const txt = await page.evaluate(() => (document.querySelector('#app')?.innerText || '')).catch(() => '');
    if (/R\$\s*NaN|\bNaN\b/.test(txt)) await add({ oraculo: 'texto', titulo: 'Valor “NaN” aparecendo na tela', evidencia: this.trecho(txt, /R\$\s*NaN|NaN/), assinatura: 'txt:nan:' + acao.url });
    if (/\bundefined\b/.test(txt)) await add({ oraculo: 'texto', titulo: 'Valor “undefined” aparecendo na tela', evidencia: this.trecho(txt, /undefined/), assinatura: 'txt:undef:' + acao.url });
    if (/R\$\s*-\s*[\d.]/.test(txt) || /-\s*R\$\s*[\d.]/.test(txt)) await add({ oraculo: 'texto', titulo: 'Valor monetário negativo na tela', evidencia: this.trecho(txt, /R\$\s*-|-\s*R\$/), assinatura: 'txt:neg:' + acao.url });
    // 4) layout estourado
    if (overflow && (overflow.elemento || overflow.scroll_horizontal > 4)) {
      const ev = overflow.elemento ? `“${overflow.elemento.texto}” vaza ${overflow.elemento.excesso}px de ${overflow.elemento.alvo}` : `rolagem horizontal de ${overflow.scroll_horizontal}px`;
      await add({ oraculo: 'layout', titulo: 'Layout estourou a caixa', evidencia: ev, assinatura: 'layout:' + acao.url });
    }
    // 5) aceitou uma entrada que deveria recusar (validação fraca) — ex.: e-mail "a@"
    if (acao.tipo === 'preencher' && ['email_invalido'].includes(acao.valor)) {
      const st = await page.evaluate(() => {
        const ok = [...document.querySelectorAll('.lb-status.ok')].map((e) => e.textContent.trim()).filter(Boolean);
        const err = [...document.querySelectorAll('.lb-status.erro')].map((e) => e.textContent.trim()).filter(Boolean);
        return { ok: ok.join(' | ').slice(0, 160), err: err.join(' | ').slice(0, 160) };
      }).catch(() => ({ ok: '', err: '' }));
      if (st.ok && !st.err) await add({ oraculo: 'aceitou_invalido', titulo: 'Entrada inválida foi aceita sem reclamar', evidencia: `Enviou “${clamp(acao.valorTexto, 40)}” no campo ${acao.cat} e o site respondeu: “${st.ok}”`, assinatura: 'aceitou:' + acao.cat + ':' + acao.valor });
    }
    // 6) pedido duplicado
    if (acao.tipo === 'clique_duplo' || acao.elemento === 'Finalizar pedido') {
      const criados = novaRede.filter((r) => r.method === 'POST' && r.path === '/alvo/api/pedidos' && r.status < 400).length;
      if (criados >= 2) await add({ oraculo: 'duplicado', titulo: 'Um clique gerou pedidos duplicados', evidencia: `${criados} pedidos criados de uma vez em /alvo/api/pedidos`, assinatura: 'dup:pedidos' });
    }
    return achados;
  }

  trecho(txt, re) { const m = txt.match(re); if (!m) return clamp(txt, 120); const i = Math.max(0, m.index - 40); return '…' + clamp(txt.slice(i, i + 120).replace(/\s+/g, ' '), 120) + '…'; }

  // ---- triagem pelo Jev: é bug real? severidade? categoria? ----
  async triagem(page, sintoma) {
    if (this.vistos.has(sintoma.assinatura)) return null;
    this.vistos.add(sintoma.assinatura);
    const questions = {
      bug_real: { type: 'noul', instructions: 'Este sintoma observado durante um teste automatizado indica um BUG REAL do site (comportamento errado, não intencional)? Considere que erros de rede externos, avisos triviais ou o próprio teste não contam.', criteria: { true: 'É um defeito real que atrapalha o usuário ou mostra dado errado', false: 'Não é bug: ruído, aviso irrelevante ou comportamento esperado' } },
      severidade: { type: 'score', instructions: 'Qual a gravidade deste bug para uma loja virtual?', criteria: SEVERIDADES },
      categoria: { type: 'choice', instructions: 'Em que categoria este bug se encaixa melhor?', criteria: CATEGORIAS },
    };
    const state = { contexto: 'QA automatizado de uma loja virtual', oraculo: sintoma.oraculo, sintoma: sintoma.titulo, evidencia: clamp(sintoma.evidencia, 300), pagina: new URL(page.url()).pathname };
    let r;
    try { r = await this.jev({ state, questions }); }
    catch (e) { return null; }
    this.cost += r.cost || 0; this.jevCalls++; this.questions += 3;
    const a = r.answers;
    if ((a.bug_real.noul ?? 0) < 0.5) { this.emit('descartado', { titulo: sintoma.titulo, p: a.bug_real.noul }); return null; }

    const idGab = this.casarGabarito(sintoma);
    const bug = {
      id: idGab || sintoma.assinatura,
      titulo: idGab ? this.bugMap()[idGab].titulo : sintoma.titulo,
      curto: idGab ? this.bugMap()[idGab].curto : sintoma.titulo,
      icone: idGab ? this.bugMap()[idGab].icone : '🐛',
      categoria: a.categoria.choice, categoria_label: CATEGORIAS[a.categoria.choice],
      severidade: a.severidade.score, sev_label: SEVERIDADES[Math.round(a.severidade.score)] || '',
      prob_bug: a.bug_real.noul, confianca: a.categoria.confidence,
      evidencia: clamp(sintoma.evidencia, 260), oraculo: sintoma.oraculo,
      pagina: state.pagina, passo: this.step, gabarito: !!idGab,
      _jev: r.debug,
    };
    if (idGab) this.gabaritoHit.add(idGab);
    this.achados.push(bug);
    this.ultimoBug = this.step;
    this.emit('bug', { bug, placar: this.placar(), _jev: bug._jev });
    return bug;
  }

  bugMap() { return (this._bm ||= Object.fromEntries(this.bugsGabarito.map((b) => [b.id, b]))); }
  casarGabarito(s) {
    for (const b of this.bugsGabarito) {
      if (this.gabaritoHit.has(b.id)) continue;
      for (const sig of b.sinais) {
        if (sig.oraculo !== s.oraculo) continue;
        if (sig.contem && s.evidencia.includes(sig.contem)) return b.id;
        if (sig.padrao === 'valor_negativo' && /neg/.test(s.assinatura)) return b.id;
        if (sig.padrao === 'NaN' && /nan/.test(s.assinatura)) return b.id;
        if (sig.oraculo === 'http' && sig.status && s.evidencia.includes(String(sig.status)) && (!sig.caminho || s.evidencia.includes(sig.caminho))) return b.id;
        if (sig.oraculo === 'layout' && (!sig.pagina || s.assinatura.includes(sig.pagina))) return b.id;
        if (sig.oraculo === 'aceitou_invalido' && (!sig.valores || sig.valores.some((v) => s.assinatura.includes(v)))) return b.id;
        if (sig.oraculo === 'duplicado') return b.id;
      }
    }
    return null;
  }

  topProbs(d) {
    return Object.entries(d.probs || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ id: k, label: (d.elementos[k.replace(/_x2$/, '')]?.rotulo || (k === 'voltar' ? 'voltar' : k === 'ir_para_inicio' ? 'ir ao início' : k)) + (k.endsWith('_x2') ? ' (duplo)' : ''), p: v }));
  }
  rotuloValor(v) { return { vazio: 'vazio', zero: 'zero', negativo: 'número negativo', numero_enorme: 'número gigante', texto_muito_longo: 'texto enorme', caracteres_especiais: 'caracteres especiais', emoji: 'emoji', sql_injection: 'injeção SQL', script_xss: 'script XSS', email_invalido: 'e-mail inválido', valor_normal: 'valor normal' }[v] || v; }

  placar() { return { encontrados: this.gabaritoHit.size, total: this.bugsGabarito.length, extras: this.achados.length - this.gabaritoHit.size, passos: this.step, custo: this.cost, jevCalls: this.jevCalls }; }

  relatorio(ms) {
    const faltando = this.bugsGabarito.filter((b) => !this.gabaritoHit.has(b.id)).map((b) => ({ id: b.id, titulo: b.titulo, curto: b.curto, icone: b.icone }));
    return {
      placar: this.placar(), duracao_ms: ms, custo: this.cost, jev_calls: this.jevCalls, perguntas: this.questions,
      bugs: this.achados, faltando, custo_por_execucao: this.cost,
    };
  }

  async shot(page, legenda) {
    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 55 });
      this.emit('tela', { step: this.step, legenda: clamp(legenda, 90), url: new URL(page.url()).pathname, jpeg: 'data:image/jpeg;base64,' + buf.toString('base64') });
    } catch {}
  }
}

export function carregarBugs(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'data', 'bugs.json'), 'utf8')).bugs;
}

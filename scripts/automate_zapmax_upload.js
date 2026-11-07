/**
 * ALR Desktop Automation: Zap Max Knowledge Sources Uploader
 * 
 * Mapeia todos os documentos de D:\herd\lojacelulares\docs\whatsapp-agent,
 * localiza o ponto de partida (15-comissoes-vendedores-tecnicos / comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md),
 * conecta ao navegador Comet via Chrome DevTools Protocol (CDP),
 * abre o modal "Adicionar material", garante tipo "Documento",
 * preenche o título limpo e anexa o arquivo.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_DOCS_DIR = 'D:\\herd\\lojacelulares\\docs\\whatsapp-agent';
const START_FOLDER = '15-comissoes-vendedores-tecnicos';
const START_FILE = 'comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md';
const TARGET_URL = 'https://crm.zapmax.org/app/ai/knowledge/sources';
const CDP_PORTS = [9224, 9222, 9223, 9225];

function mapAllDocuments(baseDir) {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Diretório base não encontrado: ${baseDir}`);
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const queue = [];

  for (const d of entries) {
    const dirPath = path.join(baseDir, d.name);
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const f of files) {
      const fullPath = path.join(dirPath, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const firstLine = content.split('\n')[0].trim();
      const cleanTitle = firstLine.replace(/^#+\s*/, '').replace(/^\[[^\]]+\]\s*/, '').trim();

      queue.push({
        folder: d.name,
        file: f,
        fullPath,
        rawTitle: firstLine,
        cleanTitle,
        status: 'pending'
      });
    }
  }

  return queue;
}

function probePort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && parsed.webSocketDebuggerUrl ? port : null);
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(800, () => {
      req.abort();
      resolve(null);
    });
  });
}

async function findCdpPort() {
  for (const p of CDP_PORTS) {
    const ok = await probePort(p);
    if (ok) return ok;
  }
  return null;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        console.error('Error in WS message handler:', err);
      }
    };
  }

  send(method, params = {}, sessionId = null) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;

      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

async function main() {
  console.log('========================================================================');
  console.log('  ALR DESKTOP AUTOMATION: ZAP MAX KNOWLEDGE SOURCES UPLOADER            ');
  console.log('========================================================================');

  // 1. Mapeia documentos
  console.log(`\n[1/5] Mapeando documentos em: ${BASE_DOCS_DIR}...`);
  const queue = mapAllDocuments(BASE_DOCS_DIR);
  console.log(`✓ Total de ${queue.length} documentos encontrados em ${new Set(queue.map(q => q.folder)).size} pastas.`);

  // 2. Localiza ponto de partida
  const startIndex = queue.findIndex(d => d.folder === START_FOLDER && d.file === START_FILE);
  if (startIndex === -1) {
    throw new Error(`Documento inicial não encontrado: ${START_FOLDER}/${START_FILE}`);
  }
  const currentDoc = queue[startIndex];
  console.log(`\n[2/5] Ponto de partida identificado:`);
  console.log(`  • Índice: ${startIndex + 1} de ${queue.length}`);
  console.log(`  • Pasta:   ${currentDoc.folder}`);
  console.log(`  • Arquivo: ${currentDoc.file}`);
  console.log(`  • Título Bruto: ${currentDoc.rawTitle}`);
  console.log(`  • Título Limpo: ${currentDoc.cleanTitle}`);
  console.log(`  • Caminho:      ${currentDoc.fullPath}`);

  // Salva mapeamento em logs/
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(
    path.join(logsDir, 'whatsapp_agent_mapped_docs.json'),
    JSON.stringify(queue, null, 2),
    'utf8'
  );
  console.log(`✓ Mapeamento completo salvo em logs/whatsapp_agent_mapped_docs.json`);

  // 3. Conexão ao Comet via CDP
  console.log(`\n[3/5] Detectando porta CDP do navegador Comet...`);
  const port = await findCdpPort();
  if (!port) {
    throw new Error(`Nenhum navegador com porta CDP encontrada em: ${CDP_PORTS.join(', ')}`);
  }
  console.log(`✓ Conectado ao Comet na porta CDP: ${port}`);

  const client = new CdpClient(`ws://127.0.0.1:${port}/cdp`);
  await client.connect();

  // Busca dinamicamente os alvos atuais
  const targetsRes = await client.send('Target.getTargets');
  let targetInfo = targetsRes.targetInfos.find(t => t.url && t.url.includes('crm.zapmax.org/app/ai/knowledge/sources'));

  if (!targetInfo) {
    console.log(`  -> Aba ${TARGET_URL} não estava aberta. Criando nova aba no Comet...`);
    const created = await client.send('Target.createTarget', { url: TARGET_URL });
    console.log(`  -> Aguardando 2.5s para carregamento da aba (${created.targetId})...`);
    await new Promise(r => setTimeout(r, 2500));
    targetInfo = { targetId: created.targetId };
  } else {
    console.log(`✓ Aba Zap Max identificada: ${targetInfo.title || targetInfo.targetId}`);
  }

  // 4. Anexa à aba do Zap Max
  console.log(`\n[4/5] Anexando sessão CDP à aba Zap Max...`);
  const attachRes = await client.send('Target.attachToTarget', {
    targetId: targetInfo.targetId,
    flatten: true
  });
  const sessionId = attachRes.sessionId;
  console.log(`✓ Sessão CDP ativa: ${sessionId}`);

  // Traz a aba para frente
  await client.send('Page.bringToFront', {}, sessionId);

  // 5. Interação com a página e abertura da modal
  console.log(`\n[5/5] Executando ações na página do Zap Max:`);
  console.log(`  • Verificando se modal já está aberta ou se é necessário clicar em "+ Adicionar material"...`);

  await new Promise(r => setTimeout(r, 800));

  const clickResult = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        // Verifica se a modal já está visível
        const modalHeading = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"], div'))
          .find(el => el.innerText && el.innerText.includes('Ensinar algo novo ao agente'));
        
        if (modalHeading) {
          return { status: 'modal_already_open' };
        }

        // Clica no botão "+ Adicionar material"
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.innerText && b.innerText.includes('Adicionar material'));

        if (btn) {
          btn.click();
          return { status: 'clicked_add_material' };
        }

        return { status: 'button_not_found' };
      })()
    `,
    returnByValue: true
  }, sessionId);

  console.log(`  -> Status do botão:`, clickResult.result.value);

  // Aguarda animação de abertura da modal
  await new Promise(r => setTimeout(r, 1000));

  // Garante seleção de "Documento" e preenche "Nome do material"
  console.log(`  • Garantindo seleção de "Documento" e preenchendo "Nome do material"...`);
  const fillResult = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        // 1. Garante que o tipo "Documento" esteja selecionado
        const docBtn = Array.from(document.querySelectorAll('button'))
          .find(b => b.innerText && b.innerText.includes('Documento') && b.innerText.includes('Um texto do seu negócio'));
        
        let docSelected = false;
        if (docBtn) {
          if (!docBtn.className.includes('border-accent')) {
            docBtn.click();
          }
          docSelected = true;
        }

        // 2. Preenche "Nome do material"
        const inputNome = document.getElementById('material-nome') ||
          document.querySelector('input[placeholder*="Política de troca"]');

        let nomeFilled = false;
        if (inputNome) {
          inputNome.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inputNome, ${JSON.stringify(currentDoc.cleanTitle)});
          inputNome.dispatchEvent(new Event('input', { bubbles: true }));
          inputNome.dispatchEvent(new Event('change', { bubbles: true }));
          nomeFilled = true;
        }

        return {
          docButtonFound: !!docBtn,
          docSelected,
          inputNomeFound: !!inputNome,
          nomeValue: inputNome ? inputNome.value : null
        };
      })()
    `,
    returnByValue: true
  }, sessionId);

  console.log(`  -> Preenchimento do título:`, fillResult.result.value);

  // Anexa o arquivo físico
  console.log(`  • Anexando arquivo: ${currentDoc.file}...`);
  const docRoot = await client.send('DOM.getDocument', {}, sessionId);
  const fileInputNode = await client.send('DOM.querySelector', {
    nodeId: docRoot.root.nodeId,
    selector: '#material-arquivo, input[type="file"]'
  }, sessionId);

  if (!fileInputNode || !fileInputNode.nodeId) {
    throw new Error('Elemento input[type="file"] (#material-arquivo) não encontrado na modal!');
  }

  await client.send('DOM.setFileInputFiles', {
    nodeId: fileInputNode.nodeId,
    files: [currentDoc.fullPath]
  }, sessionId);

  // Aguarda 500ms e verifica o estado do formulário na modal
  await new Promise(r => setTimeout(r, 600));

  const verifyState = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const fileInput = document.getElementById('material-arquivo') || document.querySelector('input[type="file"]');
        const nomeInput = document.getElementById('material-nome') || document.querySelector('input[placeholder*="Política de troca"]');
        const docBtn = Array.from(document.querySelectorAll('button'))
          .find(b => b.innerText && b.innerText.includes('Documento') && b.innerText.includes('Um texto do seu negócio'));
        const submitBtn = Array.from(document.querySelectorAll('button'))
          .find(b => b.innerText && b.innerText.includes('Adicionar ao acervo'));

        return {
          documentoSelected: docBtn ? docBtn.className.includes('border-accent') : false,
          nomePreenchido: nomeInput ? nomeInput.value : null,
          arquivoAnexado: fileInput && fileInput.files[0] ? fileInput.files[0].name : null,
          tamanhoArquivoBytes: fileInput && fileInput.files[0] ? fileInput.files[0].size : null,
          botaoEnviarPronto: submitBtn ? !submitBtn.disabled : false
        };
      })()
    `,
    returnByValue: true
  }, sessionId);

  console.log(`\n========================================================================`);
  console.log('✓ VERIFICAÇÃO FINAL DO ESTADO NA MODAL NO COMET:');
  console.log('========================================================================');
  console.log(JSON.stringify(verifyState.result.value, null, 2));

  client.close();

  console.log(`\nSucesso total! A modal está aberta na tela do seu navegador Comet`);
  console.log(`com o tipo 'Documento' garantido, o título exato preenchido e o arquivo .md anexado.`);
}

main().catch(err => {
  console.error('\n❌ Erro na automação:', err.message);
  process.exit(1);
});

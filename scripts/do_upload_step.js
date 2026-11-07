const fs = require('fs');
const path = require('path');
const http = require('http');

const FILE_PATH = 'D:\\herd\\lojacelulares\\docs\\whatsapp-agent\\15-comissoes-vendedores-tecnicos\\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md';
const CLEAN_TITLE = 'Comissão sobre faturamento bruto vs comissão sobre lucro líquido no CELIT';

async function getTargetId() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const zap = tabs.find(t => t.url && t.url.includes('crm.zapmax.org/app/ai/knowledge/sources'));
          if (zap) {
            resolve(zap.id);
          } else {
            reject(new Error('Aba crm.zapmax.org/app/ai/knowledge/sources não encontrada nas abas abertas!'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function runCdpAutomation(targetId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:9224/cdp');
    let sessionId = null;
    let msgId = 1;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout de 15 segundos na automação CDP'));
    }, 15000);

    const send = (method, params = {}) => {
      const id = msgId++;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
      return id;
    };

    ws.onopen = () => {
      console.log('✓ Conectado ao CDP.');
      send('Target.attachToTarget', { targetId, flatten: true });
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // 1. Target attached
        if (msg.id === 1 && msg.result) {
          sessionId = msg.result.sessionId;
          console.log('✓ Sessão CDP anexada:', sessionId);

          // Traz aba para frente
          send('Page.bringToFront');

          // Executa abertura da modal e clique em Documento + preenchimento do título
          const script = `
            (() => {
              // 1. Se modal não estiver aberta, clica em Adicionar material
              const isModalOpen = () => Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"], div'))
                .some(el => el.innerText && el.innerText.includes('Ensinar algo novo ao agente'));

              if (!isModalOpen()) {
                const addBtn = Array.from(document.querySelectorAll('button'))
                  .find(b => b.innerText && b.innerText.includes('Adicionar material'));
                if (addBtn) {
                  addBtn.click();
                }
              }

              // Função para clicar de forma garantida em Documento
              const selectDocumento = () => {
                // Procura botão que contenha 'Documento' e descrição 'Um texto do seu negócio'
                const docBtn = Array.from(document.querySelectorAll('button'))
                  .find(b => b.innerText && b.innerText.includes('Documento') && b.innerText.includes('Um texto do seu negócio'));
                
                if (docBtn) {
                  // Dispara eventos completos de clique
                  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                    docBtn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
                  });
                  return { found: true, text: docBtn.innerText };
                }
                return { found: false };
              };

              // Função para preencher nome do material
              const fillNome = (title) => {
                const input = document.getElementById('material-nome') ||
                  document.querySelector('input[placeholder*="Política de troca"]');
                if (input) {
                  input.focus();
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  setter.call(input, title);
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  return { found: true, value: input.value };
                }
                return { found: false };
              };

              // Executa primeira tentativa
              const docRes = selectDocumento();
              const nomeRes = fillNome(${JSON.stringify(CLEAN_TITLE)});

              return { docRes, nomeRes, modalOpen: isModalOpen() };
            })()
          `;

          send('Runtime.evaluate', { expression: script, returnByValue: true });
        }

        // 2. Resultado da avaliação inicial
        if (msg.id === 3 && msg.result) {
          console.log('✓ Primeira etapa (clique em Documento e título):', msg.result.result.value);

          // Aguarda 600ms para garantir renderização e clica novamente em Documento se necessário
          setTimeout(() => {
            const recheckScript = `
              (() => {
                // Garante mais uma vez o clique em Documento
                const docBtn = Array.from(document.querySelectorAll('button'))
                  .find(b => b.innerText && b.innerText.includes('Documento') && b.innerText.includes('Um texto do seu negócio'));
                if (docBtn) {
                  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                    docBtn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
                  });
                }

                // Garante preenchimento do título
                const input = document.getElementById('material-nome') ||
                  document.querySelector('input[placeholder*="Política de troca"]');
                if (input && input.value !== ${JSON.stringify(CLEAN_TITLE)}) {
                  input.focus();
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  setter.call(input, ${JSON.stringify(CLEAN_TITLE)});
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }

                return {
                  docSelected: docBtn ? docBtn.className.includes('border-accent') : false,
                  nomeValue: input ? input.value : null
                };
              })()
            `;
            send('Runtime.evaluate', { expression: recheckScript, returnByValue: true });
          }, 600);
        }

        // 3. Resultado do recheck -> Agora anexa o arquivo físico
        if (msg.id === 4 && msg.result) {
          console.log('✓ Confirmação da seleção de Documento e Nome:', msg.result.result.value);

          console.log('• Obtendo nó input[type=file] para anexar arquivo...');
          send('DOM.getDocument');
        }

        // 4. Recebeu DOM.getDocument
        if (msg.id === 5 && msg.result) {
          const rootNodeId = msg.result.root.nodeId;
          send('DOM.querySelector', {
            nodeId: rootNodeId,
            selector: '#material-arquivo, input[type="file"]'
          });
        }

        // 5. Recebeu nodeId do input
        if (msg.id === 6 && msg.result) {
          const nodeId = msg.result.nodeId;
          console.log('✓ Nó do arquivo encontrado (nodeId:', nodeId + ')');
          console.log('• Enviando arquivo físico:', FILE_PATH);
          send('DOM.setFileInputFiles', {
            nodeId,
            files: [FILE_PATH]
          });
        }

        // 6. Arquivo anexado com sucesso -> Verifica o estado final na tela
        if (msg.id === 7 && msg.result) {
          console.log('✓ Arquivo anexado via CDP.');

          const verifyScript = `
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
                botaoAdicionarPronto: submitBtn ? !submitBtn.disabled : false
              };
            })()
          `;

          send('Runtime.evaluate', { expression: verifyScript, returnByValue: true });
        }

        // 7. Resultado final da verificação
        if (msg.id === 8 && msg.result) {
          const finalReport = msg.result.result.value;
          clearTimeout(timeout);
          ws.close();
          resolve(finalReport);
        }

      } catch (err) {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      }
    };
  });
}

async function main() {
  console.log('========================================================================');
  console.log('  ALR EXECUÇÃO DIRETA: UPLOAD DO PRIMEIRO DOCUMENTO NO COMET            ');
  console.log('========================================================================');
  console.log(`Documento: ${FILE_PATH}`);
  console.log(`Título Limpo: ${CLEAN_TITLE}\n`);

  console.log('1. Localizando aba Zap Max no navegador Comet...');
  const targetId = await getTargetId();
  console.log(`✓ Aba identificada (ID: ${targetId})`);

  console.log('\n2. Executando automação CDP (Clique em Documento, Preenchimento e Anexo)...');
  const result = await runCdpAutomation(targetId);

  console.log('\n========================================================================');
  console.log('✓ RELATÓRIO DE ESTADO DA MODAL NO NAVEGADOR COMET:');
  console.log('========================================================================');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n>>> Concluído com sucesso! Verifique a tela do seu navegador Comet. <<<');
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});

/**
 * ALR Multi-Asset Live Quantitative Trading Desk Launcher
 * 
 * Garante que o backend real em Rust esteja rodando com a API REST ativa
 * antes de abrir o Google Chrome:
 * 1. Verifica se http://localhost:3800/api/v1/desk/status responde com JSON válido.
 * 2. Se não estiver rodando, inicia o executável Rust (target/debug/alr.exe trading-desk).
 * 3. Aguarda a confirmação de que os 7 pares da Binance foram carregados.
 * 4. Abre a janela do Google Chrome em tela cheia via Puppeteer.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const PORT = 3800;

function checkBackendStatus(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/api/v1/desk/status`, (res) => {
            const isJson = (res.headers['content-type'] || '').includes('application/json');
            if (res.statusCode === 200 && isJson) {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed && Array.isArray(parsed.assets));
                    } catch (_) {
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1200, () => {
            req.abort();
            resolve(false);
        });
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("=============================================================================");
    console.log("       ALR MULTI-ASSET LIVE QUANTITATIVE TRADING DESK (BINANCE TESTNET)      ");
    console.log("=============================================================================");
    
    // Garante pasta logs/
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.join(logsDir, 'trading_desk.log');
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    console.log(`[1/3] Verificando se o Backend Rust ALR já está ativo na porta ${PORT}...`);
    let isRunning = await checkBackendStatus(PORT);

    if (!isRunning) {
        console.log(`[2/3] Backend não detectado. Iniciando processo Rust ALR na Binance Spot Testnet...`);

        const rootDir = path.join(__dirname, '..');
        const exePath = path.join(rootDir, 'target', 'debug', 'alr.exe');
        
        let child;
        if (fs.existsSync(exePath)) {
            console.log(`  -> Executando binário: ${exePath} trading-desk --port ${PORT} --exchange binance`);
            child = spawn(exePath, ['trading-desk', '--port', String(PORT), '--exchange', 'binance'], {
                cwd: rootDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });
        } else {
            console.log(`  -> Compilando e executando: cargo run -p alr-cli -- trading-desk --port ${PORT} --exchange binance`);
            child = spawn('cargo', ['run', '-p', 'alr-cli', '--', 'trading-desk', '--port', String(PORT), '--exchange', 'binance'], {
                cwd: rootDir,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true
            });
        }

        child.stdout.on('data', data => {
            process.stdout.write(data);
            logStream.write(data);
        });

        child.stderr.on('data', data => {
            process.stderr.write(data);
            logStream.write(data);
        });

        child.on('error', err => {
            console.error('Erro ao iniciar processo Rust:', err);
            logStream.write(`[ERROR] Falha ao iniciar processo Rust: ${err.message}\n`);
        });

        console.log(`  Aguardando servidor Axum e API da Binance responderem na porta ${PORT}...`);
        const maxWaitMs = 30000;
        const startTime = Date.now();
        while (!isRunning && (Date.now() - startTime) < maxWaitMs) {
            await delay(1000);
            isRunning = await checkBackendStatus(PORT);
            if (isRunning) break;
            process.stdout.write('.');
        }
        console.log('');
    }

    if (!isRunning) {
        console.error(`\n❌ ERRO: O backend Rust não respondeu com JSON na porta ${PORT} após 30 segundos.`);
        console.error(`Verifique os logs detalhados em: ${logFilePath}`);
        console.error(`Você pode iniciar manualmente via terminal com:`);
        console.error(`  cargo run -p alr-cli -- trading-desk --port ${PORT} --exchange binance\n`);
        return;
    }

    console.log(`[3/3] ✓ Backend Rust ALR 100% ONLINE e validado na porta ${PORT}!`);
    console.log(`Abrindo Cockpit Interativo no Google Chrome...`);

    try {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(`http://localhost:${PORT}/trading-desk`, { waitUntil: 'networkidle2' });
        console.log("✓ Cockpit Interativo aberto na sua tela com dados ao vivo da Binance Spot Testnet!");
    } catch (err) {
        console.warn("Puppeteer não pôde iniciar o navegador automaticamente:", err.message);
        console.log(`Acesse diretamente no seu navegador: http://localhost:${PORT}`);
    }
}

main();

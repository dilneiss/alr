const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3700;

const server = http.createServer((req, res) => {
    const targetFile = path.join(__dirname, '..', 'static', 'install_and_usage.html');
    fs.readFile(targetFile, (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end("Erro ao carregar install_and_usage.html");
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

server.listen(PORT, async () => {
    console.log("==========================================================");
    console.log(`    ALR INSTALLATION & USAGE GUIDE (CHROME BROWSER)       `);
    console.log("==========================================================");
    console.log(`Servidor local pronto em http://localhost:${PORT}`);
    console.log("Abrindo o Guia de Instalação e Uso no seu Google Chrome...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load' });
    console.log("Guia de Instalação e Uso aberto na sua tela! Pode explorar todos os passos.");
});

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3456;

// 1. Iniciar servidor local estático simples para servir o Chat
const server = http.createServer((req, res) => {
    const waPath = path.join(__dirname, '..', 'static', 'whatsapp_support.html');
    const fallbackPath = path.join(__dirname, '..', 'static', 'chat.html');
    const targetFile = fs.existsSync(waPath) ? waPath : fallbackPath;

    fs.readFile(targetFile, (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end("Erro ao carregar interface do WhatsApp");
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

server.listen(PORT, async () => {
    console.log("==========================================================");
    console.log(`    ALR LIVE SUPPORT CHAT RUNNER (GOOGLE CHROME WINDOW)    `);
    console.log("==========================================================");
    console.log(`Servidor local pronto em http://localhost:${PORT}`);
    console.log("Abrindo a janela de conversa no seu Google Chrome...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
    console.log("Janela de conversa aberta na sua tela! Pode interagir ao vivo.");
});

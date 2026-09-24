const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3600;

const server = http.createServer((req, res) => {
    const targetFile = path.join(__dirname, '..', 'static', 'showcase.html');
    fs.readFile(targetFile, (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end("Erro ao carregar showcase.html");
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

server.listen(PORT, async () => {
    console.log("==========================================================");
    console.log("    ALR INTERACTIVE SHOWCASE (GOOGLE CHROME WINDOW)       ");
    console.log("==========================================================");
    console.log(`Servidor local pronto em http://localhost:${PORT}`);
    console.log("Abrindo a Vitrine Interativa no seu Google Chrome...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load' });
    console.log("Vitrine Interativa aberta na sua tela! Pode explorar todas as abas.");
});

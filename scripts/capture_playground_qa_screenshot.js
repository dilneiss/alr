const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para capturar screenshot do Playground QA...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    
    console.log("Navegando para http://localhost:3000...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });

    // Clica na aba de QA & Testes
    await page.evaluate(() => {
        const btn = document.querySelector('.mode-btn[data-view="qa"]');
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1500));

    const outPathPng = path.join(__dirname, '..', 'static', 'playground-qa-automation.png');
    await page.screenshot({ path: outPathPng, type: 'png' });
    console.log(`✓ Screenshot PNG salvo em: ${outPathPng}`);

    await browser.close();
    console.log("Captura concluída com sucesso!");
}

capture().catch(err => {
    console.error("Erro ao capturar screenshot:", err);
    process.exit(1);
});

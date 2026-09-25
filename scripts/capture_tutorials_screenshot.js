const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para capturar screenshot do Tutorial Hub...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    // Exata resolução do print do usuário (1568x945)
    await page.setViewport({ width: 1568, height: 945, deviceScaleFactor: 2 });
    
    console.log("Navegando para http://localhost:3000...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });

    // Clica na aba de Tutoriais & Hub Central
    await page.evaluate(() => {
        const btn = document.querySelector('.mode-btn[data-view="tutorials"]');
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    const outPathPng = path.join(__dirname, '..', 'static', 'playground-tutorials-modern.png');
    const outPathStd = path.join(__dirname, '..', 'static', 'playground-tutorials.png');
    await page.screenshot({ path: outPathPng, type: 'png' });
    await page.screenshot({ path: outPathStd, type: 'png' });
    console.log(`✓ Screenshot PNG salvo em: ${outPathPng}`);

    await browser.close();
    console.log("Captura concluída com sucesso!");
}

capture().catch(err => {
    console.error("Erro ao capturar screenshot:", err);
    process.exit(1);
});

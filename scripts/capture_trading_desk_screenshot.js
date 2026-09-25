const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para capturar screenshot em alta resolução...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    
    console.log("Navegando para http://localhost:3800...");
    await page.goto('http://localhost:3800', { waitUntil: 'networkidle0', timeout: 15000 });

    // Aguarda 3 segundos para que as cotações e o gráfico de velas sejam desenhados no canvas
    await new Promise(r => setTimeout(r, 3500));

    const outPathPng = path.join(__dirname, '..', 'static', 'trading_desk.png');
    const outPathWebp = path.join(__dirname, '..', 'static', 'trading_desk.webp');

    await page.screenshot({ path: outPathPng, type: 'png' });
    console.log(`✓ Screenshot PNG salvo em: ${outPathPng}`);

    try {
        await page.screenshot({ path: outPathWebp, type: 'webp', quality: 90 });
        console.log(`✓ Screenshot WebP salvo em: ${outPathWebp}`);
    } catch (_) {}

    await browser.close();
    console.log("Captura concluída com sucesso!");
}

capture().catch(err => {
    console.error("Erro ao capturar screenshot:", err);
    process.exit(1);
});

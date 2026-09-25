const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para capturar screenshot do Otimizador de Rotas em Mapa Real...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1568, height: 945 });

    console.log("Navegando para o Playground...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log("Clicando na aba de Otimizador de Rotas...");
    await page.click('.mode-btn[data-view="routes"]');

    // Aguarda o Leaflet carregar os tiles e o container ser montado
    console.log("Aguardando montagem do Leaflet map e cálculo inicial da rota...");
    await page.waitForSelector('#routes-real-map', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2500));

    // Captura inicial da rota em São Paulo
    const outputPath1 = path.join(__dirname, '..', 'static', 'playground-routes-hero.png');
    await page.screenshot({ path: outputPath1 });
    console.log("Screenshot inicial salvo em:", outputPath1);

    // Agora simula a alteração de CEP para o Rio de Janeiro (20040-002)
    console.log("Testando busca por CEP: 20040-002 (Av. Rio Branco, Rio de Janeiro)...");
    await page.evaluate(() => {
        const input = document.getElementById('routes-input-cep');
        if (input) {
            input.value = '20040-002';
        }
        const btn = document.getElementById('btn-routes-search-cep');
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    const outputPath2 = path.join(__dirname, '..', 'static', 'playground-routes-repositioned.png');
    await page.screenshot({ path: outputPath2 });
    console.log("Screenshot reposicionado em 20040-002 salvo em:", outputPath2);

    await browser.close();
    console.log("Capturas concluídas com sucesso!");
}

capture().catch(err => {
    console.error("Erro ao capturar screenshot:", err);
    process.exit(1);
});

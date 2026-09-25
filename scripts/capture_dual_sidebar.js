const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para capturar o layout Dual-Sidebar com decisão executada e DAG...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1568, height: 945 });

    console.log("Navegando para o Playground...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('.primary-icon-dock', { timeout: 10000 });
    await page.waitForSelector('.secondary-submenu-bar', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Clica em "Executar decisão" para preencher a coluna da direita com o grafo de raciocínio DAG e métricas
    console.log("Executando decisão tipada (System 1)...");
    await page.click('#btn-run');
    await new Promise(r => setTimeout(r, 1200));

    // 1. Screenshot Principal (Decisões com Grafo de Raciocínio Vertical e Dual-Sidebar)
    const outHero = path.join(__dirname, '..', 'static', 'playground-dual-sidebar-hero.png');
    await page.screenshot({ path: outHero });
    console.log("Screenshot do layout Dual-Sidebar com decisão salvo em:", outHero);

    const outMainHero = path.join(__dirname, '..', 'static', 'playground-hero.png');
    await page.screenshot({ path: outMainHero });
    console.log("Screenshot atualizado de playground-hero.png salvo em:", outMainHero);

    await browser.close();
    console.log("Capturas concluídas com sucesso!");
}

capture().catch(err => {
    console.error("Erro ao capturar screenshot do Dual-Sidebar:", err);
    process.exit(1);
});

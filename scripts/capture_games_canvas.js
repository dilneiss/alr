const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
    console.log("Iniciando Puppeteer para verificar a Arena de Jogos sem menu duplicado...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1568, height: 945 });

    console.log("Navegando para o Playground...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log("Clicando na categoria Arenas & Jogos no Dock esquerdo...");
    await page.click('.dock-item-btn[data-category="games"]');
    await new Promise(r => setTimeout(r, 1200));

    // Captura da tela com Snake ativo e menu unificado na barra lateral secundária
    const outGames = path.join(__dirname, '..', 'static', 'playground-games-hero.png');
    await page.screenshot({ path: outGames });
    console.log("Screenshot da Arena de Jogos unificada salvo em:", outGames);

    // Clica em Bomberman na barra lateral secundária para testar troca de jogo
    console.log("Clicando em Bomberman na barra lateral de submenus...");
    const submenuItems = await page.$$('.submenu-item');
    for (const item of submenuItems) {
        const text = await page.evaluate(el => el.innerText, item);
        if (text.includes('Bomberman')) {
            await item.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1200));

    // Captura com Bomberman ativo
    const outBomberman = path.join(__dirname, '..', 'static', 'playground-games-bomberman.png');
    await page.screenshot({ path: outBomberman });
    console.log("Screenshot do Bomberman ativo salvo em:", outBomberman);

    await browser.close();
    console.log("Verificação da Arena de Jogos concluída com sucesso!");
}

capture().catch(err => {
    console.error("Erro na captura de jogos:", err);
    process.exit(1);
});

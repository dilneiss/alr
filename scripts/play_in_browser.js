const puppeteer = require('puppeteer');

(async () => {
    console.log("======================================================");
    console.log("      ALR BROWSER SNAKE RUNNER (HEADED CHROME)        ");
    console.log("======================================================");
    console.log("Iniciando o Google Chrome na sua tela...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    const url = "https://wutools.com/pt/jogos/jogo-da-cobrinha";
    console.log(`Navegando para: ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log("Aguardando carregamento do canvas e botão Iniciar Jogo...");
    await page.waitForSelector('canvas');

    // Clicar no botão 'Iniciar Jogo'
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const startBtn = btns.find(b => b.innerText.includes('Iniciar Jogo'));
        if (startBtn) startBtn.click();
    });
    console.log("Jogo iniciado no navegador!");

    let currentDir = "ArrowRight";
    let step = 0;

    const gameLoop = setInterval(async () => {
        try {
            const state = await page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                let redPixels = [];
                let greenPixels = [];

                for (let y = 0; y < canvas.height; y += 10) {
                    for (let x = 0; x < canvas.width; x += 10) {
                        const idx = (y * canvas.width + x) * 4;
                        const r = imgData[idx];
                        const g = imgData[idx + 1];
                        const b = imgData[idx + 2];

                        // Comida vermelha
                        if (r > 180 && g < 100 && b < 100) {
                            redPixels.push({ x, y });
                        }
                        // Cobra verde
                        if (g > 100 && r < 120 && b < 120) {
                            greenPixels.push({ x, y });
                        }
                    }
                }

                const head = greenPixels[0] || { x: 250, y: 250 };
                const food = redPixels[0] || { x: 100, y: 100 };

                // Verificar se apareceu tela de Fim de Jogo
                const isGameOver = document.body.innerText.includes('Fim de Jogo');

                return { head, food, isGameOver };
            });

            if (!state || state.isGameOver) {
                console.log("Fim de Jogo detectado! Reiniciando nova partida...");
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const startBtn = btns.find(b => b.innerText.includes('Iniciar Jogo'));
                    if (startBtn) startBtn.click();
                });
                return;
            }

            const { head, food } = state;

            // Políticas de evasão de borda e perseguição de comida
            let safeMoves = [];
            if (currentDir !== "ArrowRight" && head.x > 60) safeMoves.push("ArrowLeft");
            if (currentDir !== "ArrowLeft" && head.x < 440) safeMoves.push("ArrowRight");
            if (currentDir !== "ArrowDown" && head.y > 60) safeMoves.push("ArrowUp");
            if (currentDir !== "ArrowUp" && head.y < 440) safeMoves.push("ArrowDown");

            let bestKey = safeMoves[0] || "ArrowRight";
            let bestDist = Infinity;

            for (const move of safeMoves) {
                let nextX = head.x;
                let nextY = head.y;
                if (move === "ArrowLeft") nextX -= 20;
                if (move === "ArrowRight") nextX += 20;
                if (move === "ArrowUp") nextY -= 20;
                if (move === "ArrowDown") nextY += 20;

                const d = Math.hypot(food.x - nextX, food.y - nextY);
                if (d < bestDist) {
                    bestDist = d;
                    bestKey = move;
                }
            }

            currentDir = bestKey;
            await page.keyboard.press(bestKey);
            step++;

            if (step % 10 === 0) {
                console.log(`[ALR AGENT] Passo: ${step} | Cabeça: (${head.x}, ${head.y}) | Comida: (${food.x}, ${food.y}) | Tecla: ${bestKey}`);
            }
        } catch (e) {
            // Ignora pequenas oscilações de contexto entre frames
        }
    }, 120);

})();

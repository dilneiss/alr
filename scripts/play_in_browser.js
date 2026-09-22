const puppeteer = require('puppeteer');

(async () => {
    console.log("==================================================================");
    console.log("    ALR BROWSER SNAKE RUNNER (MULTI-ITEM COMPUTER VISION + A*)    ");
    console.log("==================================================================");
    console.log("Iniciando o Google Chrome em modo visível...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    const url = "https://wutools.com/pt/jogos/jogo-da-cobrinha";
    console.log(`Navegando para: ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log("Aguardando carregamento da página...");
    await page.waitForSelector('canvas');

    const startGame = async () => {
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const startBtn = btns.find(b => b.innerText.includes('Iniciar Jogo'));
            if (startBtn) startBtn.click();
        });
    };

    await startGame();
    console.log("Jogo iniciado no navegador!");

    let currentDir = "ArrowRight";
    let step = 0;
    let recentPositions = [];
    let recentActions = [];
    let evasionTicksRemaining = 0;
    let forcedEvasionKey = null;

    const gameLoop = setInterval(async () => {
        try {
            const state = await page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                let foodCandidates = [];
                let greenPixels = [];

                // Varredura de pixels para detecção de múltiplos itens
                for (let y = 10; y < canvas.height - 10; y += 4) {
                    for (let x = 10; x < canvas.width - 10; x += 4) {
                        const idx = (y * canvas.width + x) * 4;
                        const r = imgData[idx];
                        const g = imgData[idx + 1];
                        const b = imgData[idx + 2];

                        // Maçã vermelha clássica (R alto, G baixo, B baixo)
                        if (r > 190 && g < 90 && b < 90) {
                            foodCandidates.push({ x, y, weight: 1.0, type: "apple" });
                        }
                        // Estrela Dourada / Maçã Dourada (R alto, G alto, B baixo)
                        else if (r > 200 && g > 180 && b < 60) {
                            foodCandidates.push({ x, y, weight: 1.5, type: "golden_star" });
                        }
                        // Power-up Escudo Azul (B alto, G moderado)
                        else if (b > 180 && g > 100 && r < 120) {
                            foodCandidates.push({ x, y, weight: 1.2, type: "shield" });
                        }
                        // Cobra verde (cabeça/corpo)
                        else if (g > 120 && r < 110 && b < 110) {
                            greenPixels.push({ x, y });
                        }
                    }
                }

                const head = greenPixels[0] || { x: 250, y: 250 };
                const isGameOver = document.body.innerText.includes('Fim de Jogo');

                return { head, foodCandidates, isGameOver };
            });

            if (!state || state.isGameOver) {
                console.log("Fim de Jogo detectado! Reiniciando partida...");
                recentPositions = [];
                recentActions = [];
                evasionTicksRemaining = 0;
                await startGame();
                return;
            }

            const { head, foodCandidates } = state;

            // Rastrear histórico das últimas posições
            recentPositions.push({ x: head.x, y: head.y });
            if (recentPositions.length > 12) recentPositions.shift();

            // 1. Detectar se ficou preso numa região pequena (Estagnação Espacial)
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const p of recentPositions) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            const boxWidth = maxX - minX;
            const boxHeight = maxY - minY;
            const isStagnant = recentPositions.length >= 8 && boxWidth < 50 && boxHeight < 50;

            // 2. Detectar oscilação direta 2-passos (A -> B -> A -> B)
            let isOscillating = false;
            const aLen = recentActions.length;
            if (aLen >= 4) {
                if (recentActions[aLen - 1] === recentActions[aLen - 3] &&
                    recentActions[aLen - 2] === recentActions[aLen - 4] &&
                    recentActions[aLen - 1] !== recentActions[aLen - 2]) {
                    isOscillating = true;
                }
            }

            // Selecionar o melhor alvo entre todos os itens na tela (vermelho, dourado, azul)
            let bestTarget = { x: 250, y: 250 };
            let minTargetScore = Infinity;

            if (foodCandidates.length > 0) {
                for (const item of foodCandidates) {
                    const dist = Math.hypot(item.x - head.x, item.y - head.y);
                    // Ponderar pela prioridade do item (estrela dourada vale mais)
                    const score = dist / item.weight;
                    if (score < minTargetScore) {
                        minTargetScore = score;
                        bestTarget = item;
                    }
                }
            }

            // Movimentos seguros contra paredes (margem de 50px)
            let safeMoves = [];
            if (currentDir !== "ArrowRight" && head.x > 50) safeMoves.push("ArrowLeft");
            if (currentDir !== "ArrowLeft" && head.x < 450) safeMoves.push("ArrowRight");
            if (currentDir !== "ArrowDown" && head.y > 50) safeMoves.push("ArrowUp");
            if (currentDir !== "ArrowUp" && head.y < 450) safeMoves.push("ArrowDown");

            let bestKey = safeMoves[0] || "ArrowRight";

            // Se estiver em modo de evasão ativa, mantém manobra forçada de fuga
            if (evasionTicksRemaining > 0) {
                evasionTicksRemaining--;
                bestKey = forcedEvasionKey;
            } else if (isOscillating || isStagnant) {
                // Quebra forçada: escolhe direção perpendicular e que aponte para o centro do tabuleiro
                const lastMove = recentActions[recentActions.length - 1] || "ArrowRight";
                let escapeMove;
                if (lastMove === "ArrowUp" || lastMove === "ArrowDown") {
                    escapeMove = head.x < 250 ? "ArrowRight" : "ArrowLeft";
                } else {
                    escapeMove = head.y < 250 ? "ArrowDown" : "ArrowUp";
                }

                // Se a direção de fuga não for segura, escolhe a primeira segura disponível
                if (!safeMoves.includes(escapeMove)) {
                    escapeMove = safeMoves[0] || "ArrowRight";
                }

                forcedEvasionKey = escapeMove;
                evasionTicksRemaining = 4; // Força andar 4 passos para longe do local preso
                bestKey = escapeMove;
                console.log(`[ALR EVASION] Loop/Estagnação detectada no local (${head.x}, ${head.y})! Forçando saída ortogonal: ${escapeMove} por 4 passos.`);
            } else {
                // Movimento ótimo em direção ao melhor item detectado
                let bestDist = Infinity;
                for (const move of safeMoves) {
                    let nextX = head.x;
                    let nextY = head.y;
                    if (move === "ArrowLeft") nextX -= 20;
                    if (move === "ArrowRight") nextX += 20;
                    if (move === "ArrowUp") nextY -= 20;
                    if (move === "ArrowDown") nextY += 20;

                    const d = Math.hypot(bestTarget.x - nextX, bestTarget.y - nextY);
                    if (d < bestDist) {
                        bestDist = d;
                        bestKey = move;
                    }
                }
            }

            currentDir = bestKey;
            recentActions.push(bestKey);
            if (recentActions.length > 20) recentActions.shift();

            await page.keyboard.press(bestKey);
            step++;

            if (step % 20 === 0) {
                console.log(`[ALR AGENT] Passo: ${step} | Cabeça: (${head.x}, ${head.y}) | Alvo: (${bestTarget.x}, ${bestTarget.y}) | Itens Detectados: ${foodCandidates.length} | Tecla: ${bestKey}`);
            }
        } catch (e) {
            // Ignora oscilações assíncronas entre frames
        }
    }, 120);

})();

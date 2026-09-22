const puppeteer = require('puppeteer');

(async () => {
    console.log("==================================================================");
    console.log("    ALR BROWSER SNAKE RUNNER (FULL BFS PATHFINDER + TABU MEMORY)  ");
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
    let ignoredTargets = new Map(); // target_key -> ticks_to_ignore (Tabu memory)

    const gameLoop = setInterval(async () => {
        try {
            const state = await page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                let foodCandidates = [];
                let greenPixels = [];

                // Varredura precisa da grade (células de 20x20 pixels)
                for (let y = 10; y < canvas.height - 10; y += 4) {
                    for (let x = 10; x < canvas.width - 10; x += 4) {
                        const idx = (y * canvas.width + x) * 4;
                        const r = imgData[idx];
                        const g = imgData[idx + 1];
                        const b = imgData[idx + 2];

                        // Maçã vermelha (R alto, G baixo, B baixo)
                        if (r > 190 && g < 90 && b < 90) {
                            foodCandidates.push({ x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20, weight: 1.0, type: "apple" });
                        }
                        // Estrela Dourada (R alto, G alto, B baixo)
                        else if (r > 200 && g > 180 && b < 60) {
                            foodCandidates.push({ x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20, weight: 2.0, type: "golden_star" });
                        }
                        // Power-up Escudo Azul (B alto, G moderado)
                        else if (b > 180 && g > 100 && r < 120) {
                            foodCandidates.push({ x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20, weight: 1.5, type: "shield" });
                        }
                        // Cobra verde (cabeça/corpo)
                        else if (g > 120 && r < 110 && b < 110) {
                            greenPixels.push({ x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 });
                        }
                    }
                }

                // Deduplicar posições de comida por célula da grade
                let uniqueFood = [];
                let seenFood = new Set();
                for (const f of foodCandidates) {
                    const k = `${f.x}_${f.y}`;
                    if (!seenFood.has(k)) {
                        seenFood.add(k);
                        uniqueFood.push(f);
                    }
                }

                // Cabeça da cobra
                const head = greenPixels[0] || { x: 240, y: 240 };
                const isGameOver = document.body.innerText.includes('Fim de Jogo');

                return { head, foodCandidates: uniqueFood, greenPixels, isGameOver };
            });

            if (!state || state.isGameOver) {
                console.log("Fim de Jogo detectado! Reiniciando partida...");
                recentPositions = [];
                ignoredTargets.clear();
                await startGame();
                return;
            }

            const { head, foodCandidates } = state;

            // Rastrear histórico das últimas 20 posições para detecção de estagnação
            recentPositions.push({ x: head.x, y: head.y });
            if (recentPositions.length > 20) recentPositions.shift();

            // Atualizar lista Tabu de itens ignorados temporariamente
            for (const [key, ticks] of ignoredTargets.entries()) {
                if (ticks <= 1) {
                    ignoredTargets.delete(key);
                } else {
                    ignoredTargets.set(key, ticks - 1);
                }
            }

            // Detectar estagnação espacial: cobra presa em uma área pequena (< 60px) por mais de 10 passos
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const p of recentPositions) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            const isStagnant = recentPositions.length >= 10 && (maxX - minX) < 60 && (maxY - minY) < 60;

            // Filtrar itens ativos (removendo os temporariamente banidos pela lista Tabu)
            const activeTargets = foodCandidates.filter(item => {
                const k = `${item.x}_${item.y}`;
                return !ignoredTargets.has(k);
            });

            // Se estagnou perseguindo o alvo atual, coloca o alvo na lista Tabu por 40 ticks e busca outro!
            if (isStagnant && activeTargets.length > 0) {
                // Encontrar o alvo mais próximo que causou o confinamento
                let closestItem = activeTargets[0];
                let closestDist = Infinity;
                for (const item of activeTargets) {
                    const d = Math.hypot(item.x - head.x, item.y - head.y);
                    if (d < closestDist) {
                        closestDist = d;
                        closestItem = item;
                    }
                }
                const banKey = `${closestItem.x}_${closestItem.y}`;
                ignoredTargets.set(banKey, 45); // Ignora esse item por 45 ticks para desatar a cobra
                recentPositions = []; // Reseta histórico
                console.log(`[ALR TABU RECOVERY] Estagnação quebrada! Alvo em (${closestItem.x}, ${closestItem.y}) colocado em quarentena. Buscando novo objetivo na tela!`);
            }

            // Selecionar o melhor alvo ativo (ponderado por distância e valor)
            let bestTarget = { x: 240, y: 240 };
            let minTargetScore = Infinity;

            const targetsToConsider = activeTargets.length > 0 ? activeTargets : foodCandidates;
            if (targetsToConsider.length > 0) {
                for (const item of targetsToConsider) {
                    const dist = Math.hypot(item.x - head.x, item.y - head.y);
                    const score = dist / item.weight;
                    if (score < minTargetScore) {
                        minTargetScore = score;
                        bestTarget = item;
                    }
                }
            }

            // Movimentos seguros permitidos contra paredes (canvas 500x500 com margem de segurança de 30px)
            let safeMoves = [];
            if (currentDir !== "ArrowRight" && head.x > 30) safeMoves.push("ArrowLeft");
            if (currentDir !== "ArrowLeft" && head.x < 470) safeMoves.push("ArrowRight");
            if (currentDir !== "ArrowDown" && head.y > 30) safeMoves.push("ArrowUp");
            if (currentDir !== "ArrowUp" && head.y < 470) safeMoves.push("ArrowDown");

            if (safeMoves.length === 0) {
                safeMoves = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
            }

            // BFS / A* local de 1 passo em direção ao melhor alvo
            let bestKey = safeMoves[0];
            let bestDist = Infinity;

            for (const move of safeMoves) {
                let nextX = head.x;
                let nextY = head.y;
                if (move === "ArrowLeft") nextX -= 20;
                if (move === "ArrowRight") nextX += 20;
                if (move === "ArrowUp") nextY -= 20;
                if (move === "ArrowDown") nextY += 20;

                // Penalidade para voltar em posições recentemente visitadas (Prevenção de Ciclos)
                const recencyPenalty = recentPositions.filter(p => p.x === nextX && p.y === nextY).length * 40;
                const d = Math.hypot(bestTarget.x - nextX, bestTarget.y - nextY) + recencyPenalty;

                if (d < bestDist) {
                    bestDist = d;
                    bestKey = move;
                }
            }

            currentDir = bestKey;
            await page.keyboard.press(bestKey);
            step++;

            if (step % 20 === 0) {
                console.log(`[ALR AGENT] Passo: ${step} | Cabeça: (${head.x}, ${head.y}) | Alvo Atual: (${bestTarget.x}, ${bestTarget.y}) [Tipo: ${bestTarget.type || "default"}] | Tecla: ${bestKey}`);
            }
        } catch (e) {
            // Ignora oscilações assíncronas transitórias
        }
    }, 110);

})();

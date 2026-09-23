const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("==================================================================");
    console.log("    ALR AUTONOMOUS CHROME DINO RUNNER (VISION + TYPED DECISIONS)  ");
    console.log("==================================================================");

    const isOnline = process.argv.includes('--online');
    const targetUrl = isOnline
        ? "https://chromedino.com/"
        : `file://${path.resolve(__dirname, 'dino_game.html').replace(/\\/g, '/')}`;

    console.log(`[ALR] Modo: ${isOnline ? 'Online (chromedino.com)' : 'Offline Local (scripts/dino_game.html)'}`);
    console.log(`[ALR] Iniciando Google Chrome em modo visível...`);

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars'
        ]
    });

    const page = await browser.newPage();
    console.log(`[ALR] Navegando para: ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'load' });

    console.log("[ALR] Aguardando carregamento do canvas...");
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Focus canvas to receive keyboard events
    await page.click('canvas');
    await new Promise(r => setTimeout(r, 600));

    // Initial jump to start the game
    console.log("[ALR] Injetando comando inicial de salto (Space) para iniciar a corrida...");
    await page.keyboard.press('Space');

    let tick = 0;
    let isCurrentlyDucking = false;
    let lastAction = "RUN";
    let consecutiveCollisions = 0;

    console.log("[ALR] Loop de Percepção Visual e Decisão Tipada ATIVO (~30 Hz).\n");

    const gameLoop = setInterval(async () => {
        try {
            tick++;

            // 1. Computer Vision: Read and analyze canvas pixels
            const perception = await page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                const ctx = canvas.getContext('2d');
                const w = canvas.width;
                const h = canvas.height;

                const imgData = ctx.getImageData(0, 0, w, h).data;

                // Dino parameters
                const dinoX = 60;
                const dinoW = 44;
                const dinoRight = dinoX + dinoW;
                const groundY = 195;

                // Scan region in front of Dino
                const scanStartX = dinoRight + 4;
                const scanEndX = Math.min(w, dinoRight + 340);
                const scanStartY = 80;
                const scanEndY = groundY;

                let obstaclePixels = [];
                let minX = 9999;
                let maxX = 0;
                let minY = 9999;
                let maxY = 0;

                // Sample every 4 pixels horizontally and vertically
                for (let x = scanStartX; x < scanEndX; x += 4) {
                    for (let y = scanStartY; y < scanEndY; y += 4) {
                        const idx = (y * w + x) * 4;
                        const r = imgData[idx];
                        const g = imgData[idx + 1];
                        const b = imgData[idx + 2];

                        // Detect dark obstacle pixels (#535353 or similar)
                        if (r < 120 && g < 120 && b < 120) {
                            obstaclePixels.push({ x, y });
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                // Check game over text
                const statusEl = document.getElementById('tel-status');
                const isGameOver = statusEl
                    ? statusEl.innerText.includes('COLLISION') || statusEl.innerText.includes('GAME OVER')
                    : document.body.innerText.includes('GAME OVER');

                const scoreEl = document.getElementById('tel-score');
                const currentScore = scoreEl ? parseInt(scoreEl.innerText, 10) || 0 : 0;

                const speedEl = document.getElementById('tel-speed');
                const currentSpeed = speedEl ? parseFloat(speedEl.innerText) || 6.0 : 6.0;

                if (obstaclePixels.length < 3) {
                    return {
                        hasObstacle: false,
                        distance: 600,
                        obstacleType: 'None',
                        isGameOver,
                        score: currentScore,
                        speed: currentSpeed
                    };
                }

                const dist = Math.max(0, minX - dinoRight);
                const obsHeight = maxY - minY;
                const obsWidth = maxX - minX;

                // Classify obstacle altitude
                let obstacleType = 'SmallCactus';
                if (minY >= 145) {
                    obstacleType = obsWidth > 35 ? 'TripleCactus' : (obsHeight > 40 ? 'LargeCactus' : 'SmallCactus');
                } else if (minY >= 115) {
                    obstacleType = 'PterodactylMid'; // Mid altitude: MUST DUCK!
                } else {
                    obstacleType = 'PterodactylHigh'; // High altitude: SAFE TO RUN!
                }

                return {
                    hasObstacle: true,
                    distance: dist,
                    minX,
                    minY,
                    obsWidth,
                    obsHeight,
                    obstacleType,
                    isGameOver,
                    score: currentScore,
                    speed: currentSpeed
                };
            });

            if (!perception) return;

            // 2. Handle Game Over and Auto-Restart
            if (perception.isGameOver) {
                consecutiveCollisions++;
                console.log(`[ALR] Colisão detectada! Reiniciando jogo com salto (Score final: ${perception.score})...`);
                if (isCurrentlyDucking) {
                    await page.keyboard.up('ArrowDown');
                    isCurrentlyDucking = false;
                }
                await page.keyboard.press('Space');
                lastAction = "RESTART";
                return;
            }

            // 3. System 1 Decision & Safety Shield (Physical Invariants)
            const speed = Math.max(perception.speed || 6.0, 1.0);
            const dist = perception.distance;
            const tti = dist / speed;
            const obsType = perception.obstacleType;

            let actionToExecute = "RUN";
            let shieldIntervened = false;

            if (perception.hasObstacle) {
                if (obsType === 'PterodactylMid') {
                    // Mid Pterodactyl: Duck when approaching and passing (tti <= 12.0)
                    if (tti <= 12.0) {
                        actionToExecute = "DUCK";
                    }
                } else if (obsType === 'PterodactylHigh') {
                    // High Pterodactyl: Do NOT jump! Run safely.
                    actionToExecute = "RUN";
                    shieldIntervened = true; // Shield suppressed accidental jump
                } else {
                    // Ground Cacti or Low Pterodactyl: Jump only when within the golden window (tti <= 9.0)
                    if (tti <= 9.0) {
                        actionToExecute = "JUMP";
                    } else {
                        actionToExecute = "RUN"; // Coast safely, premature jump causes fatal landing!
                        shieldIntervened = true;
                    }
                }
            }

            // 4. Actuation
            if (actionToExecute === "JUMP") {
                if (isCurrentlyDucking) {
                    await page.keyboard.up('ArrowDown');
                    isCurrentlyDucking = false;
                }
                await page.keyboard.down('Space');
                setTimeout(async () => {
                    try { await page.keyboard.up('Space'); } catch (_) {}
                }, 80);
                lastAction = "JUMP";
            } else if (actionToExecute === "DUCK") {
                if (!isCurrentlyDucking) {
                    await page.keyboard.down('ArrowDown');
                    isCurrentlyDucking = true;
                }
                lastAction = "DUCK";
            } else {
                // RUN
                if (isCurrentlyDucking) {
                    await page.keyboard.up('ArrowDown');
                    isCurrentlyDucking = false;
                }
                lastAction = "RUN";
            }

            // 5. Telemetry output
            if (tick % 4 === 0 || actionToExecute !== "RUN") {
                const badge = actionToExecute === "JUMP"
                    ? "\x1b[32m[JUMP]\x1b[0m"
                    : (actionToExecute === "DUCK" ? "\x1b[33m[DUCK]\x1b[0m" : "\x1b[36m[RUN]\x1b[0m");

                const shieldBadge = shieldIntervened ? " \x1b[31m[SHIELD ACTIVE]\x1b[0m" : "";

                console.log(
                    `Tick: ${String(tick).padStart(4)} | Score: ${String(perception.score).padStart(3)} | Speed: ${perception.speed.toFixed(1)} px/t | Obs: ${perception.obstacleType.padEnd(15)} | Dist: ${perception.distance.toFixed(1).padStart(5)}px | Action: ${badge}${shieldBadge}`
                );
            }

        } catch (err) {
            // Ignore minor transient evaluation errors during page reload
        }
    }, 35);

    // Keep running until user terminates process with Ctrl+C
    process.on('SIGINT', async () => {
        clearInterval(gameLoop);
        console.log("\n[ALR] Encerrando sessão de automação do Dino...");
        await browser.close();
        process.exit(0);
    });

})();

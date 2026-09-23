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
    let jumpCooldown = false;
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
                const r = window.Runner ? (window.Runner.instance_ || window.Runner.instance) : null;
                const isLocal = !!document.getElementById('tel-status');
                const groundY = isLocal ? 195 : 122;
                const dinoRight = isLocal
                    ? (60 + (typeof dino !== 'undefined' && dino.isDucking ? 58 : 44))
                    : (r && r.tRex ? (r.tRex.xPos + (r.tRex.ducking ? 59 : 44)) : 74);

                // Scan region: strictly ahead of Dino snout (avoids self-detecting the T-Rex head)
                const scanStartX = isLocal ? (60 + 58 + 4) : Math.max(dinoRight + 8, 96);
                const scanEndX = Math.min(w, scanStartX + 280);
                const scanStartY = isLocal ? 35 : 25;
                const scanEndY = groundY - 2; // Exclude continuous ground line

                let obstaclePixels = [];
                let minX = 9999;
                let maxX = 0;
                let minY = 9999;
                let maxY = 0;

                // Sample pixels horizontally and vertically
                for (let x = scanStartX; x < scanEndX; x += 4) {
                    for (let y = scanStartY; y < scanEndY; y += 4) {
                        const idx = (y * w + x) * 4;
                        const r_ = imgData[idx];
                        const g_ = imgData[idx + 1];
                        const b_ = imgData[idx + 2];
                        const a_ = imgData[idx + 3];

                        // Detect dark obstacle pixels (#535353 or similar)
                        if (a_ > 200 && r_ < 130 && g_ < 130 && b_ < 130) {
                            obstaclePixels.push({ x, y });
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                // Universal speed extraction
                let currentSpeed = 6.0;
                if (r && r.currentSpeed) {
                    currentSpeed = r.currentSpeed;
                } else {
                    const speedEl = document.getElementById('tel-speed');
                    currentSpeed = speedEl ? parseFloat(speedEl.innerText) || 6.0 : 6.0;
                }

                // Universal score extraction
                let currentScore = 0;
                if (r && r.distanceMeter) {
                    currentScore = r.distanceMeter.getActualDistance(r.distanceRan) || 0;
                } else {
                    const scoreEl = document.getElementById('tel-score');
                    currentScore = scoreEl ? parseInt(scoreEl.innerText, 10) || 0 : 0;
                }

                // Universal game over check
                const statusEl = document.getElementById('tel-status');
                const isGameOver = (r && r.crashed)
                    || (statusEl && (statusEl.innerText.includes('COLLISION') || statusEl.innerText.includes('GAME OVER')))
                    || document.body.innerText.includes('GAME OVER');

                // Detect if dino is currently airborne
                const isJumping = isLocal
                    ? (typeof dino !== 'undefined' ? dino.isJumping : false)
                    : (r && r.tRex ? r.tRex.jumping : false);

                if (obstaclePixels.length < 3) {
                    return {
                        hasObstacle: false,
                        distance: 600,
                        obstacleType: 'None',
                        isGameOver,
                        score: currentScore,
                        speed: currentSpeed,
                        isJumping
                    };
                }

                const dist = Math.max(0, minX - dinoRight);
                const obsHeight = maxY - minY;
                const obsWidth = maxX - minX;

                // Classify obstacle altitude relative to ground line
                const distFromGround = groundY - minY;
                let obstacleType = 'SmallCactus';
                if (distFromGround <= 36) {
                    obstacleType = obsWidth > 30 ? 'TripleCactus' : 'SmallCactus';
                } else if (distFromGround <= 58) {
                    obstacleType = 'LargeCactus';
                } else if (distFromGround <= 80) {
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
                    speed: currentSpeed,
                    isJumping
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

            if (perception.hasObstacle && !perception.isJumping) {
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
                    // Ground Cacti or Low Pterodactyl: Jump only when within the golden window (tti <= 8.5)
                    if (tti <= 8.5) {
                        actionToExecute = "JUMP";
                    } else {
                        actionToExecute = "RUN"; // Coast safely, premature jump causes fatal landing!
                        shieldIntervened = true;
                    }
                }
            }

            // 4. Actuation
            if (actionToExecute === "JUMP" && !perception.isJumping && !jumpCooldown) {
                jumpCooldown = true;
                if (isCurrentlyDucking) {
                    await page.keyboard.up('ArrowDown');
                    isCurrentlyDucking = false;
                }
                await page.keyboard.press('Space');
                lastAction = "JUMP";
                setTimeout(() => {
                    jumpCooldown = false;
                }, 320);
            } else if (actionToExecute === "DUCK" && !perception.isJumping) {
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

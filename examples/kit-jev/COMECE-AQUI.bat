@echo off
rem Windows: dê dois cliques. Abre o seu agente (Claude Code, Codex ou Gemini) nesta pasta, já começando o setup do kit.
chcp 65001 >nul
cd /d "%~dp0"
set "PEDIDO=Comece o setup do Kit Jev agora: rode node kit/jev-kit.mjs sessao e conduza o próximo passo, seguindo o AGENTS.md."
where node >nul 2>nul || (echo Falta o Node.js 22 ou mais novo: https://nodejs.org & pause & exit /b 1)
where claude >nul 2>nul && (claude "/kit-jev" & exit /b)
where codex >nul 2>nul && (codex "%PEDIDO%" & exit /b)
where gemini >nul 2>nul && (gemini -i "%PEDIDO%" & exit /b)
echo Nao achei nenhum agente. Instale o Claude Code (https://claude.com/claude-code) e rode de novo.
pause

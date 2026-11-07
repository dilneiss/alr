#!/bin/bash
# Linux (e Mac pelo Terminal): bash comece-aqui.sh
# Abre o seu agente (Claude Code, Codex ou Gemini) nesta pasta, já começando o setup do kit.
cd "$(dirname "$0")" || exit 1
PEDIDO="Comece o setup do Kit Jev agora: rode node kit/jev-kit.mjs sessao e conduza o próximo passo, seguindo o AGENTS.md."
command -v node >/dev/null 2>&1 || { echo "Falta o Node.js 22 ou mais novo: https://nodejs.org"; exit 1; }
if command -v claude >/dev/null 2>&1; then exec claude "/kit-jev"
elif command -v codex >/dev/null 2>&1; then exec codex "$PEDIDO"
elif command -v gemini >/dev/null 2>&1; then exec gemini -i "$PEDIDO"
else
  echo "Não achei nenhum agente. Instale o Claude Code (https://claude.com/claude-code) e rode de novo."
  exit 1
fi

#!/bin/bash
# Mac: dê dois cliques. Abre o seu agente (Claude Code, Codex ou Gemini) nesta pasta, já começando o setup do kit.
# Se o Mac bloquear ("não foi possível verificar"), clique com o botão direito → Abrir, ou rode no Terminal:
#   bash COMECE-AQUI.command
cd "$(dirname "$0")" || exit 1
PEDIDO="Comece o setup do Kit Jev agora: rode node kit/jev-kit.mjs sessao e conduza o próximo passo, seguindo o AGENTS.md."
if ! command -v node >/dev/null 2>&1; then
  echo "Falta o Node.js (versão 22 ou mais nova). Baixe em https://nodejs.org, instale e rode este arquivo de novo."
  read -r -p "Enter para fechar…" _; exit 1
fi
if command -v claude >/dev/null 2>&1; then
  exec claude "/kit-jev"
elif command -v codex >/dev/null 2>&1; then
  exec codex "$PEDIDO"
elif command -v gemini >/dev/null 2>&1; then
  exec gemini -i "$PEDIDO"
else
  echo "Não achei nenhum agente instalado."
  echo "Instale o Claude Code (https://claude.com/claude-code) e rode este arquivo de novo."
  echo "Com o Codex ou o Gemini CLI também funciona: abra o agente nesta pasta e diga \"comece o setup\"."
  read -r -p "Enter para fechar…" _
fi

@AGENTS.md

## Só no Claude Code
- Ao abrir a sessão, o gancho `SessionStart` (`.claude/settings.json`) roda `node kit/jev-kit.mjs sessao --hook`, e o
  resultado já está no seu contexto. Mesmo assim, rode `node kit/jev-kit.mjs sessao` antes do primeiro comando para pegar
  o estado atual. Depois conduza o próximo passo na sua primeira resposta, seja qual for a mensagem.
- `/kit-jev` (skill desta pasta) recomeça ou continua o setup a qualquer momento. O atalho `COMECE-AQUI` abre o Claude
  Code já com ela.
- Os comandos `node kit/jev-kit.mjs …` estão liberados em `.claude/settings.json` depois que a pessoa confia na pasta.
  Os demais pedem licença normalmente.
- Comandos longos (`publicar`, `verificar`) podem passar de 2 minutos: use um timeout de 10 minutos.

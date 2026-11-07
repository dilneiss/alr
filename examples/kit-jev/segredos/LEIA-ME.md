# segredos/

Aqui o kit guarda, só neste computador, o que é seu e não pode vazar:
- `hostinger-token.txt`: o token da API da Hostinger (vale para a conta inteira; crie com validade curta);
- `openrouter-key.txt`: a chave do OpenRouter (crie com limite de crédito);
- `elevenlabs-key.txt` e `youtube-key.txt`: opcionais;
- `ssh/`: a chave SSH do kit para entrar na sua VPS;
- `login-dos-apps-senha.txt` e `sessoes-secret.txt`: a senha do login dos apps e o segredo das sessões.

Não compartilhe esta pasta, não mande por e-mail e não suba para o Git (o `.gitignore` já ignora). Se algum valor vazar,
gere outro no painel de origem (hPanel → API, openrouter.ai/keys) e rode `node kit/jev-kit.mjs publicar` de novo.

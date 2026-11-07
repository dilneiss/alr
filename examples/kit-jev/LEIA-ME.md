# Kit Jev · 100 apps

Os 100 apps do **Jev** prontos para rodar no **seu** servidor, com o **seu** login e adaptados ao **seu** negócio. O Jev é o
modelo de decisões da TypeSafe: recebe dados e perguntas e devolve probabilidades em ~0,3 s, por ~US$ 0,0001 cada
decisão. São atendimento que se organiza sozinho, vendas que leem intenção, moderação, voz ao vivo, jogos, dados e muito
mais. A lista completa está em `catalogo/CATALOGO.md`.

Quem instala é o seu **agente de IA** (Claude Code, Codex ou Gemini CLI). Ele lê o `AGENTS.md` desta pasta e conduz o
setup com você, passo a passo.

## Do que você precisa
1. **Uma VPS da Hostinger.** É obrigatório: o kit confere na API da Hostinger e não funciona sem ela.
   Não tem? Contrate aqui: **https://www.hostg.xyz/SHK4Y** com o cupom **MAESTROS10**. A **KVM 2** (8 GB) roda os apps
   leves com folga. Escolha o sistema **Ubuntu 24.04**.
2. **Uma conta no OpenRouter** com alguns dólares de crédito (https://openrouter.ai). US$ 5 rendem dezenas de milhares
   de decisões.
3. **Node.js 22** (https://nodejs.org) e um agente: o **Claude Code** (https://claude.com/claude-code) é o recomendado.
4. **Opcional:** um domínio próprio. Sem ele, os apps ficam no endereço grátis da VPS, com HTTPS.

## Como começar
- **Mac:** dois cliques em `COMECE-AQUI.command`. Se o Mac bloquear, clique com o botão direito → Abrir.
- **Windows:** dois cliques em `COMECE-AQUI.bat`.
- **Linux, ou pelo terminal:** entre na pasta e rode `bash comece-aqui.sh`, ou abra o seu agente aqui (`claude`) e diga
  "oi". O setup começa na hora.

No Claude Code, aceite a pergunta "confiar nesta pasta?": é ela que libera os comandos do kit. Depois, o agente vai:
1. conferir a sua VPS na Hostinger (o **portão**);
2. perguntar o que você quer resolver e sugerir os apps certos (ou instalar os 100);
3. pedir a chave do OpenRouter e o endereço (domínio próprio ou o grátis da VPS);
4. preparar a VPS (Docker, HTTPS automático, login único) sem apagar nada do que já existe nela;
5. publicar, testar cada app como uma pessoa usaria e entregar os links e o login.

Leva de 15 a 30 minutos, quase tudo esperando a VPS. Dá para parar e continuar depois: o kit lembra onde parou.

## Depois de instalado
- **Adaptar um app:** "adapte o app 21 para a minha clínica". O agente edita o arquivo do app, testa e publica.
- **Usar num site ou em outro projeto:** link, iframe ou o código exportado. Veja `docs/INTEGRAR.md`.
- **Criar um app novo:** `docs/CRIAR-UM-APP.md`.
- **Ver o gasto e o que está no ar:** "como está a instalação?" (`node kit/jev-kit.mjs status`).

## O que tem nesta pasta
| Pasta | O quê |
|---|---|
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | as instruções do agente instalador |
| `kit/` | o instalador (`node kit/jev-kit.mjs ajuda`) |
| `apps/` | os 100 apps: 17 grandes (`apps/<id>/`) e 83 modelos (`apps/modelos/public/<id>/app.config.mjs`) |
| `plataforma/` | a base de todos: gateway do Jev (o único lugar com a sua chave), login único e telas comuns |
| `catalogo/` | a lista dos 100 apps (`CATALOGO.md`) |
| `docs/` | Hostinger, integração, criação de apps e problemas comuns |
| `segredos/` | onde ficam os seus tokens e chaves, só no seu computador |

## Segurança
- Seus tokens e chaves ficam só em `segredos/`, no seu computador, e na VPS em arquivos que só o root lê. A chave do
  OpenRouter nunca vai para o navegador.
- O token da Hostinger vale para a conta inteira. O kit só **lê** a conta, e as poucas escritas (chave SSH, snapshot, DNS,
  firewall) sempre pedem o seu "sim" antes. Crie o token com validade curta e apague no hPanel quando terminar.
- Todos os apps ficam atrás do seu login, e o gasto com o Jev tem teto por dia.

Kit feito pela **Maestros da IA**. Uso e condições: `LICENCA.md`.

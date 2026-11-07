# {{TITULO}}

{{RESUMO}}

Esta pasta foi exportada pelo **Kit Jev**: é o app `{{ID}}` com tudo de que ele precisa para rodar fora do kit.

## Como rodar
1. Instale o **Node.js 22** ou mais novo (https://nodejs.org).
2. Copie `.env.exemplo` para `.env` e cole a sua chave do OpenRouter (`OPENROUTER_API_KEY=sk-or-...`).
3. Nesta pasta, rode `node iniciar.mjs` e abra http://localhost:3000.

O `iniciar.mjs` sobe duas coisas:
- o **gateway** (`gateway/server.mjs`): o único lugar com a sua chave. Ele também controla o orçamento e o limite por IP;
- o **app** (`apps/{{ID}}/server.mjs`), que pede as decisões ao gateway.

## Para usar no seu projeto
- **Link ou iframe:** publique o app pelo kit na sua VPS da Hostinger e marque-o como público
  (`node kit/jev-kit.mjs apps publico {{ID}}`). Depois aponte o link ou o `<iframe>` do seu site para o endereço dele.
- **Código:** a lógica de cada decisão fica em `apps/{{ID}}/server.mjs`, que monta o `state` e as perguntas e chama o
  Jev pelo gateway. A tela fica em `apps/{{ID}}/public/`. Copie a rota que você quer para o seu servidor e mantenha a
  chave sempre no servidor.
- **Produção:** este app roda na sua VPS da Hostinger, atrás do login do kit, com `node kit/jev-kit.mjs publicar`.

## Regras que valem aqui também
- O `portao.json` é o carimbo do kit: sem ele, o gateway não decide nada.
- A chave do OpenRouter fica só no `.env` e no gateway. Nunca a coloque no navegador nem no Git.
- Termos da TypeSafe (dona do Jev): é proibido usar as respostas do Jev para treinar ou destilar outro modelo.

# Usar os apps no seu projeto

Os apps nascem na sua VPS, atrás do seu login (`https://jev.<domínio>`). Há três jeitos de levar um deles para o seu
site, sistema ou repositório.

## 1. Link ou iframe (sem programar)
1. Deixe o app público, sem login: `node kit/jev-kit.mjs apps publico <id>` e depois `node kit/jev-kit.mjs publicar`.
2. Use o endereço dele:
   - app grande: `https://jev-<id>.<domínio>/`;
   - modelo: `https://jev.<domínio>/m/<id>/`.
3. No seu site:
   ```html
   <iframe src="https://jev.SEU-DOMINIO/m/recepcionista-whatsapp/" style="width:100%;height:760px;border:0" allow="microphone; camera"></iframe>
   ```
   O `allow="microphone; camera"` só é preciso nos apps de voz e câmera.

App público gasta crédito do OpenRouter com qualquer visitante. O gateway tem limite por IP e teto por dia
(`node kit/jev-kit.mjs orcamento`). Para voltar a exigir login: `apps privado <id>` e `publicar`.

## 2. Exportar o código (para outro servidor ou para estudar)
```bash
node kit/jev-kit.mjs exportar <id> --destino ../meu-projeto/jev-<id>
```
- **Modelo:** sai uma pasta com `server.mjs` (Node 22, sem dependências), `public/` (a tela) e o `app.config.mjs`.
  Copie `.env.exemplo` para `.env` com a sua chave e rode `node server.mjs`.
- **App grande:** sai a pasta do app, a base (`shared/`) e o gateway, com um `iniciar.mjs` que sobe os dois.
- A pasta leva o `portao.json` (o carimbo da sua VPS da Hostinger): sem ele, o servidor não sobe. O app exportado roda na
  sua VPS ou no seu computador. Para colocar no ar, o caminho mais simples continua sendo o próprio kit.

## 3. Chamar o app pela API (do seu backend)
Cada modelo responde em `POST /m/<id>/api/decidir`. Os apps grandes têm as rotas em `apps/<id>/server.mjs`.
- Com o app **público**, chame direto do seu servidor:
  ```bash
  curl -s https://jev.SEU-DOMINIO/m/inbox-organiza/api/decidir -H 'Content-Type: application/json' \
    -d '{"itens":[{"chave":"e1","texto":"Assunto: Pedido atrasado. Meu pedido 4521 não chegou, pode ver?"},
                  {"chave":"e2","texto":"Assunto: Parceria. Somos uma agência e queremos revender seus produtos."}]}'
  ```
  Resposta (medida): `e1` → `tipo: cliente`, `e2` → `tipo: venda`, em ~0,12 s, por ~US$ 0,00005 a chamada.
  Nos modelos de fila (motor `fluxo`), cada item leva `chave` + `texto`. Os outros motores (conversa, ao vivo, agente…)
  recebem outro formato: abra o app com as ferramentas do desenvolvedor do navegador (aba **Rede**), aperte
  **▶ Ver funcionando** e copie o corpo do `POST …/api/decidir`. O **🔍 O que o Jev vê** mostra o que o servidor
  mandou ao Jev a partir dele.
- O que volta: as respostas do Jev para cada item (opção escolhida, probabilidades e confiança), a latência e o custo.
- Para mexer na regra de decisão, edite o `app.config.mjs` (modelos) ou o `server.mjs` (apps grandes) e publique.

## Boas práticas
- A chave do OpenRouter fica no servidor (gateway ou `.env`), nunca no navegador nem no Git.
- Defina o limiar de confiança: acima dele o sistema age sozinho; abaixo, uma pessoa decide.
- Teste com exemplos rotulados antes de automatizar (`node kit/jev-kit.mjs testar <id>`).
- Termos da TypeSafe: não use as respostas do Jev para treinar outro modelo.

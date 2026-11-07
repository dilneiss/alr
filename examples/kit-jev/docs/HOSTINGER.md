# Hostinger: como o kit lida com a sua conta e a sua VPS

Este é o protocolo que o kit (e o seu agente) seguem. Ele vem da operação real de várias VPS da Hostinger: o que
funciona, o que é perigoso e as armadilhas que já custaram tempo.

## O token da API
- Onde criar: hPanel → **https://hpanel.hostinger.com/api** → **Gerar token** → dê um nome ("jev-kit") e uma validade
  curta (1 mês) → **Gerar**.
- **Copie na hora:** o valor só aparece uma vez. Se perder, gere outro.
- O token vale para a **conta inteira**: não existe token só de leitura. Com ele dá para reinstalar VPS, apagar regras de
  firewall, reescrever DNS e até comprar no cartão cadastrado. Por isso:
  - guarde em `segredos/hostinger-token.txt` (o kit cria o arquivo com permissão só para você);
  - apague o token no hPanel quando não precisar mais (o kit só precisa dele no setup e quando publicar de novo).
- A API: `https://developers.hostinger.com/api/...`, cabeçalho `Authorization: Bearer <token>`.

## O que o kit faz na sua conta
**Só lê**, a não ser nestas escritas, cada uma com o seu "sim" antes:

| Escrita | Para quê | Como desfazer |
|---|---|---|
| `POST /api/vps/v1/virtual-machines/{id}/ssh-keys` | entrar na VPS sem senha de root (a chave vai para o `authorized_keys` do root em até 1 minuto) | `node kit/jev-kit.mjs ssh remover --confirmo` |
| `POST /api/vps/v1/virtual-machines/{id}/snapshot` | foto da VPS antes de mexer | a Hostinger guarda **um** snapshot por VPS: criar outro **substitui** o anterior |
| `POST /api/vps/v1/firewall/{id}/rules` e `.../sync/{vm}` | abrir as portas 80 e 443, se a VPS tiver firewall da Hostinger ativo | apagar a regra no hPanel (VPS → Firewall) |
| `PUT /api/dns/v1/zones/{dominio}` | registros A `jev` e `jev-<app>` do seu domínio, se o DNS dele estiver nesta conta | apagar os registros no hPanel (Domínios → DNS) |

Ficam **bloqueados no código do kit**: comprar, reinstalar (`recreate`), apagar, ligar, desligar ou reiniciar VPS, trocar a
senha de root, restaurar backup e qualquer rota de cobrança.

Leituras usadas: `GET /api/vps/v1/virtual-machines` (o portão e a escolha da VPS), `.../{id}`, `.../{id}/snapshot`,
`.../{id}/actions`, `GET /api/vps/v1/firewall/{id}` e `GET /api/dns/v1/zones/{dominio}`.

## O portão
- O portão chama `GET /api/vps/v1/virtual-machines` com o seu token. Passa se a conta tiver pelo menos uma VPS que não
  esteja apagada, suspensa ou com erro. O resultado, sem o token, fica em `.kit/portao.json` e vale 7 dias.
- No `publicar`, o kit confere de novo, na hora, que o IP de destino é de uma VPS ativa da sua conta. Só então grava o
  carimbo `/etc/jev-kit/portao.json` na VPS. Sem esse carimbo, o gateway não responde nenhuma decisão.
- **VPS compartilhada com você por outra conta** ("Compartilhado comigo" no hPanel) **não aparece** na API com o seu
  token: use um token da conta dona da VPS.

## Na VPS
- **Sistema:** Ubuntu 24.04 (ou 22.04, ou Debian). Se a VPS veio com outro sistema ou com um painel, o kit avisa. Trocar de
  sistema é pelo hPanel (VPS → Sistema operacional) e **apaga tudo**: só a pessoa decide.
- **O que o `preparar` faz** (pode rodar várias vezes):
  - instala o Docker pelo script oficial;
  - limita o tamanho dos logs do Docker;
  - cria 2 GB de swap em VPS com menos de 6 GB de RAM e sem swap;
  - se o ufw estiver **ligado**, libera as portas 80 e 443;
  - cria `/etc/jev-kit` (só o root lê) e `/opt/jev-kit`.

  Ele não apaga nada, não reseta firewall, não liga firewall desligado e não para serviços de outros programas.
- **Portas 80 e 443:** o HTTPS precisa delas. Se outro programa usa (outro site, Traefik dos modelos "Docker + Traefik",
  nginx), o kit mostra quem é e espera o seu "sim" para parar (`vps liberar-portas --confirmo`). Ele anota o que parou, e
  `vps devolver-portas --confirmo` religa.
- **Onde ficam as coisas:**
  - código: `/opt/jev-kit/app` (projeto Docker Compose `jevkit`, que aparece no Docker Manager do hPanel);
  - configuração e chaves: `/etc/jev-kit/*.env` (600);
  - dados dos apps: volumes do Docker `jevkit_*`.
- **Endereço grátis:** toda VPS tem o nome `srvNNNNNNN.hstgr.cloud`, e qualquer subdomínio dele aponta para ela (por
  exemplo, `jev.srvNNNNNNN.hstgr.cloud`). O certificado HTTPS sai sozinho, pelo Let's Encrypt.

## Armadilhas conhecidas
- **VPS ocupada:** enquanto a Hostinger faz backup ou snapshot, a VPS fica com `actions_lock: locked` e outras ações pela
  API falham. O primeiro backup semanal de uma VPS cheia pode levar mais de 1 hora. Espere `unlocked`.
- **Cloudflare da Hostinger:** alguns clientes HTTP levam `403 error code: 1010`. O kit usa o `fetch` do Node e, se for
  barrado, repete pelo `curl`.
- **Chave SSH nova:** vale em até ~1 minuto depois do cadastro; o kit testa de novo sozinho.
- **VPS reinstalada:** a impressão digital do SSH muda e o `ssh testar` avisa. O kit esquece a antiga e você testa de novo.
- **DNS novo:** leva de 1 a 30 minutos. O kit consulta resolvedores públicos (Google e Cloudflare), porque o cache do seu
  computador pode guardar "não existe" por até 1 hora.
- **Cloudflare no seu domínio:** deixe os registros `jev` e `jev-*` com a nuvem **cinza** (só DNS), senão o certificado não
  sai.

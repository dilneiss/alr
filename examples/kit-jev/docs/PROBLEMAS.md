# Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Portão fechado: falta o token" | o arquivo `segredos/hostinger-token.txt` está vazio | `node kit/jev-kit.mjs token hostinger --abrir`, colar, salvar |
| "A Hostinger recusou o token (401)" | token vencido, apagado ou copiado pela metade | gerar outro no hPanel (https://hpanel.hostinger.com/api) |
| "a sua conta não tem nenhuma VPS ativa" | conta sem VPS, ou a VPS é de outra conta | contratar em https://www.hostg.xyz/SHK4Y (cupom MAESTROS10), ou usar o token da conta dona |
| `ssh testar`: "a VPS recusou a chave" | a chave do kit não está na VPS | `ssh cadastrar --confirmo`, ou cadastrar à mão no hPanel |
| `ssh testar`: "sem conexão" | VPS desligada, IP errado ou firewall fechando a porta 22 | ligar a VPS no hPanel; conferir o firewall da Hostinger |
| `preparar`: "portas 80/443 ocupadas" | outro site ou proxy na VPS | `vps diagnostico` mostra quem é; decidir com a pessoa |
| `publicar` para no build | pouca memória (VPS de 4 GB com muitos apps) | tirar apps pesados (`apps remover qa`) ou usar VPS maior; o `preparar` cria swap |
| `verificar`: "sem HTTPS ainda" | o certificado ainda está saindo | esperar 2 minutos e rodar de novo; DNS errado também causa isso |
| `verificar`: domínio "aponta para outro lugar" | registro A errado ou nuvem laranja da Cloudflare | corrigir o registro; nuvem cinza |
| App mostra "orçamento acabou" | teto do dia atingido | `orcamento --dia 5`, depois `publicar` |
| App mostra "sem crédito" (402) | conta do OpenRouter zerada | recarregar em https://openrouter.ai/credits |
| App mostra "recusou este texto na borda" | o provedor do Jev barrou um texto com cara de ataque (SQL, `../`) | reformular o texto; é uma proteção do provedor |
| App mostra "portão" / "VPS da Hostinger verificada" | o carimbo do portão sumiu da VPS | `node kit/jev-kit.mjs publicar` de novo |
| Estúdio ou Mini Cluely sem texto escrito | modelo de texto desligado ou sem crédito | `llm nuvem`, depois `publicar`; conferir o crédito |
| Microfone ou câmera não abre | o navegador só libera em HTTPS e pede licença | abrir pelo endereço `https://`, aceitar a licença; usar Chrome ou Edge |

Para ver os registros de um app: `node kit/jev-kit.mjs logs <id>`. Para ver tudo de uma vez:
`node kit/jev-kit.mjs status` e `node kit/jev-kit.mjs verificar`.

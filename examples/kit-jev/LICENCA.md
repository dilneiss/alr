# Termos de uso do Kit Jev · 100 apps

Kit feito e distribuído pela **Maestros da IA**. Ao usar o kit ou qualquer parte dele, você aceita estes termos.

## 1. O que você pode fazer
- Usar os apps no seu negócio ou no de clientes seus, com ou sem fins comerciais.
- Ler, estudar, adaptar e modificar o código e os apps à vontade.
- Exportar apps para os seus projetos (`node kit/jev-kit.mjs exportar`) e integrá-los a sites e sistemas seus.

## 2. A condição: VPS da Hostinger
- O kit e os apps só podem ser usados por quem tem uma **VPS da Hostinger** ativa, verificada pelo portão do kit na API
  oficial da Hostinger. Os apps rodam nessa VPS, ou num computador da mesma pessoa com o carimbo do portão.
- Não é permitido remover, desativar ou contornar o portão (`kit/lib/portao.mjs`, os carimbos `portao.json` e as
  checagens do gateway e dos servidores dos apps), nem distribuir versões que façam isso.
- O link da Hostinger neste kit (https://www.hostg.xyz/SHK4Y) é um link de parceiro da Maestros da IA. O cupom
  MAESTROS10 dá desconto a você.

## 3. O que não pode
- Revender, sublicenciar ou redistribuir o kit, inteiro ou em partes, como produto, pacote de modelos ou curso.
  Distribuir os apps que você construiu para o seu negócio ou para um cliente, dentro destas regras, pode.
- Usar o **Jev** ou as respostas dele para treinar, ajustar ou destilar outro modelo, nem para criar um produto
  concorrente. Essa regra é dos termos da TypeSafe, dona do Jev, e vale também pelo OpenRouter.
- Usar os apps para enganar pessoas, coletar dados sem base legal ou violar leis (incluindo a LGPD).

## 4. Sem garantia
O kit é fornecido "como está", sem garantia de funcionamento, de disponibilidade de terceiros (Hostinger, OpenRouter,
TypeSafe) ou de adequação a um fim específico. Os custos de VPS, OpenRouter, domínio e serviços opcionais são seus. Os
dados que os seus apps processam são de sua responsabilidade. Defina os tetos de gasto (`node kit/jev-kit.mjs orcamento`)
e revise cada app antes de usar com clientes de verdade.

## 5. Componentes de terceiros
- **Fontes:** SIL Open Font License 1.1 ou Apache 2.0, com a licença de cada família em `LICENCAS.txt` (ou `OFL.txt`)
  na pasta `fonts` de cada app e em `apps/modelos/public/_motor/fontes/`.
- **MediaPipe** (leitor de rosto do app Vitrine que Lê o Seu Rosto): Apache 2.0, carregado pelo navegador.
- **Imagens Docker** usadas na VPS: Caddy (Apache 2.0), Node.js (MIT) e Playwright (Apache 2.0, só no app QA
  Adversarial).
- **Serviços:** Jev (TypeSafe), pelo OpenRouter, e o modelo de texto pelo OpenRouter (padrão: Gemini 2.5 Flash-Lite). Valem os termos de cada um.

# Os 100 apps do kit

Número, nome e o que cada um faz. Para instalar, diga ao seu agente o número ou o nome (ou rode
`node kit/jev-kit.mjs apps escolher 1 5 18-27`). Os apps de 1 a 17 são **grandes** (cada um tem o próprio servidor e
endereço); os de 18 a 100 são **modelos** (um arquivo cada, todos num servidor só).

## Ao vivo: fale, mostre o rosto, jogue

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 18 | 🛍️ **A Vitrine que Lê o Seu Rosto** | Uma loja que percebe pela câmera quando você gosta, quando acha caro e quando perde o interesse, e muda a vitrine na hora. | `apps/modelos/public/vitrine-rosto/app.config.mjs` |
| 19 | 🔮 **O Jev Adivinha** | Descreva uma coisa sem dizer o nome: a cada pausa da sua fala, o Jev pesa 196 palpites e tenta acertar antes de você terminar. | `apps/modelos/public/jev-adivinha/app.config.mjs` |
| 20 | 🎭 **Plateia que Reage** | Fale para 40 pessoas virtuais e veja cada uma reagir na hora: quem ri, quem boceja, quem se convence. | `apps/modelos/public/plateia-ao-vivo/app.config.mjs` |
| 21 | 🎬 **Fale e a Cena Nasce** | Conte uma história em voz alta e ela vira um desenho animado na sua frente: o cenário, os personagens e o tempo mudam enquanto você fala. | `apps/modelos/public/cena-nasce/app.config.mjs` |
| 22 | 🚪 **Convença o Porteiro** | Você precisa subir ao 302 e o Seu Valdir não deixa: convença o porteiro falando. Ele responde com a própria voz, em meio segundo. | `apps/modelos/public/convenca-porteiro/app.config.mjs` |
| 23 | ✂️ **Editor que Corta Enquanto Você Fala** | Grave falando. Errou e recomeçou, ou disse "corta isso"? O erro já sai, e no fim você ouve a versão editada. | `apps/modelos/public/editor-corta/app.config.mjs` |
| 24 | ⚽ **Narre o Jogo** | Narre uma partida imaginária e ela acontece na tela: a bola vai aonde você diz e o gol sai quando você grita. | `apps/modelos/public/narrador-futebol/app.config.mjs` |
| 25 | 🎞️ **Slides que Seguem a Sua Fala** | Apresente sem clicar: o slide certo aparece quando você fala dele, e cada tópico acende quando você o menciona. | `apps/modelos/public/slides-seguem/app.config.mjs` |
| 26 | 👾 **O Jogo que Lê Você** | Um jogo de nave que percebe se você está entediado, desafiado ou frustrado, e muda a próxima onda na hora. | `apps/modelos/public/jogo-le-voce/app.config.mjs` |
| 27 | 👂 **O Hub que Ouve Você** | Conte o seu negócio e o seu problema em voz alta: os apps do hub se reorganizam enquanto você fala e o certo sobe para o topo. | `apps/modelos/public/monte-seu-app/app.config.mjs` |

## IA imediata: a tela reage enquanto você usa

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 13 | 🔎 **Busca que Entende** | O Jev avalia o catálogo inteiro a cada busca: “presente pra mãe que ama jardinagem até R$ 150”. | `apps/busca/` |
| 28 | 🧰 **Caixa que Vira Ferramenta** | Uma caixa de texto só: “rachar 230 entre 4” vira divisor de conta, “25 min de foco” vira cronômetro, “100 dólares em reais” vira conversor. | `apps/modelos/public/caixa-ferramenta/app.config.mjs` |
| 29 | ⌨️ **Barra de Comando que Entende** | Um Ctrl+K que aceita qualquer frase (“cobra quem tá devendo”) e escolhe uma das ações reais do app, com as 3 mais prováveis à vista. | `apps/modelos/public/barra-comando/app.config.mjs` |
| 30 | 📋 **Colar e Preencher** | Cole uma assinatura de e-mail, um pedido do WhatsApp ou um cartão de visita, e cada linha cai no campo certo do cadastro. | `apps/modelos/public/colar-preencher/app.config.mjs` |
| 31 | 📊 **Painel em Português** | Escreva a pergunta do seu jeito (“ticket médio por canal em Curitiba, mês passado”) e o gráfico aparece, sem SQL. | `apps/modelos/public/painel-portugues/app.config.mjs` |
| 32 | ✉️ **Antes de Enviar** | Enquanto você escreve, o Jev avisa: tom ríspido, anexo esquecido, informação confidencial indo para a lista errada. | `apps/modelos/public/antes-de-enviar/app.config.mjs` |
| 33 | 🌡️ **Termômetro de Prompt** | Enquanto você escreve um prompt, ele acende o que já tem (papel, contexto, formato, exemplo…) e dá a dica pronta do que falta. | `apps/modelos/public/termometro-prompt/app.config.mjs` |
| 34 | 🧹 **Filtro de Feed** | Enquanto você rola, o Jev esconde o que você não quer ver — política, spoiler, IA caça-clique — e diz por quê. | `apps/modelos/public/filtro-feed/app.config.mjs` |
| 35 | 🔔 **Porteiro de Notificações** | Cada notificação que chega: interromper agora, juntar no resumo das 15h ou silenciar, conforme o que você está fazendo. | `apps/modelos/public/porteiro-notificacoes/app.config.mjs` |

## Atendimento e caixa de entrada

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 8 | 🎧 **Central de Suporte** | Cada ticket triado numa chamada: departamento, prioridade, frustração, reembolso e a resposta pronta certa. | `apps/suporte/` |
| 36 | 🦷 **Recepcionista de WhatsApp** | Entende "consigo amanhã depois do almoço, mas saio antes das 4" e marca só em horário livre de verdade. | `apps/modelos/public/recepcionista-whatsapp/app.config.mjs` |
| 37 | 📬 **Inbox que se Organiza** | Cada e-mail vai para a pilha certa, com urgência e "precisa de resposta?" — e só arquiva sozinho quando tem certeza. | `apps/modelos/public/inbox-organiza/app.config.mjs` |
| 38 | 📗 **FAQ que Não Inventa** | O chat do site responde só com o texto do seu FAQ, palavra por palavra, e passa para uma pessoa o que não está lá. | `apps/modelos/public/faq-nao-inventa/app.config.mjs` |
| 39 | 🛡️ **Moderador de Grupo de WhatsApp** | Lê cada mensagem do grupo na hora: apaga golpe e ofensa, avisa quem foge do tema e responde as dúvidas de sempre. | `apps/modelos/public/moderador-grupo/app.config.mjs` |
| 40 | 🗓️ **Secretária de Agenda** | Lê cada convite de reunião com as suas regras e decide: aceitar, propor outro horário, delegar, pedir a pauta ou recusar. | `apps/modelos/public/secretaria-agenda/app.config.mjs` |
| 41 | 💸 **Régua de Cobrança que Entende Respostas** | Lê cada resposta ao lembrete de pagamento ("pago sexta", "já paguei", "esse valor tá errado") e deixa a próxima mensagem pronta. | `apps/modelos/public/regua-cobranca/app.config.mjs` |
| 42 | 🎯 **Caçador de Compromissos** | Lê as suas conversas e separa o que você prometeu, o que te prometeram e o "vou ver" que ninguém vai lembrar. | `apps/modelos/public/cacador-compromissos/app.config.mjs` |
| 43 | 🔍 **Monitor do Chatbot** | Relê as conversas do seu chatbot e acha onde ele inventou desconto, travou num loop ou deixou um cliente furioso sem ajuda. | `apps/modelos/public/monitor-chatbot/app.config.mjs` |
| 44 | 🍕 **Garçom de WhatsApp** | Anota o pedido de pizza conversando: entende "2 calabresas grandes sem cebola", pergunta o que faltou e fecha a conta certa. | `apps/modelos/public/garcom-whatsapp/app.config.mjs` |

## Confiança e segurança

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 7 | 💬 **Chat com Moderação ao Vivo** | Toda mensagem passa pelo Jev antes de aparecer. Regras escritas em português viram perguntas na hora. | `apps/chat/` |
| 9 | 🛡️ **Escudo de IA** | Firewall semântico contra prompt injection, jailbreak e SQL injection — lado a lado com um WAF de regex. | `apps/escudo/` |
| 14 | 🚨 **Detector de Golpes** | Cole a mensagem suspeita: é golpe? de que tipo? que sinais? o que fazer? — em meio segundo. | `apps/golpe/` |
| 45 | 🛡️ **Cinto de Segurança para Agentes** | Antes de cada ação do seu agente de IA, o Jev decide em 0,4 s: executar, pedir confirmação ou bloquear. | `apps/modelos/public/cinto-agentes/app.config.mjs` |
| 46 | 🛑 **Trava de Comandos do Claude Code** | Antes de cada comando de terminal do agente, o Jev lê a política e decide em ~0,4 s: rodar, perguntar a você ou barrar. | `apps/modelos/public/trava-comandos/app.config.mjs` |
| 47 | 📞 **Alerta de Golpe na Ligação** | No viva-voz, o Jev ouve quem ligou e avisa na hora: "isso é golpe, não passe o código". | `apps/modelos/public/golpe-ligacao/app.config.mjs` |
| 48 | 🕵️ **Detector de Pegadinhas no Checkout** | Antes de você clicar em "Pagar", o Jev lê a página linha por linha e marca a taxa escondida, a assinatura disfarçada e a pressa fabricada. | `apps/modelos/public/pegadinhas-checkout/app.config.mjs` |
| 49 | 🔏 **Antivazamento de Prompt** | Antes de o funcionário mandar o texto para o ChatGPT, o Jev aponta dado de cliente, senha, saúde ou segredo e o código mascara o que dá. | `apps/modelos/public/antivazamento-prompt/app.config.mjs` |
| 50 | ⭐ **Caçador de Avaliações Falsas** | Toda avaliação da loja passa pelo Jev: genuína, incentivada, falsa ou fora do assunto — e você vê a nota de verdade do produto. | `apps/modelos/public/avaliacoes-falsas/app.config.mjs` |
| 51 | 🛒 **Moderação de Anúncios de Marketplace** | Todo anúncio novo passa pelo Jev antes de ir ao ar: aprovado, proibido, falsificação, preço isca ou categoria errada. | `apps/modelos/public/moderacao-marketplace/app.config.mjs` |

## Vendas, marketing e criadores

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 4 | 📝 **Formulário que Qualifica** | Um Typeform que qualifica o lead enquanto ele digita e escolhe o final: agenda, proposta ou conteúdo. | `apps/form/` |
| 12 | 🎙️ **Copiloto de Vendas** | Escuta a ligação e mostra o card certo a cada objeção do cliente, em tempo real. | `apps/vendas/` |
| 15 | ▶️ **Comentários → Oportunidades** _(chave da YouTube Data API (grátis))_ | Cole um vídeo do YouTube: leads, dúvidas, pedidos de conteúdo e spam separados em segundos. | `apps/comentarios/` |
| 17 | 🧠 **Site que Lê Intenções** | Uma página de vendas em que tudo abre por clique, e que se monta para quem visita conforme o que a pessoa abre. | `apps/site/` |
| 52 | 🚚 **Orçamento na Hora** | O cliente descreve a mudança e a faixa de preço aparece enquanto ele escreve: tipo, porte e adicionais. | `apps/modelos/public/orcamento-na-hora/app.config.mjs` |
| 53 | 🔬 **Raio-X dos Anúncios dos Concorrentes** | Cole os anúncios dos concorrentes e veja qual ângulo todo mundo usa, qual ninguém usa e que gancho abre cada um. | `apps/modelos/public/raio-x-anuncios/app.config.mjs` |
| 54 | 🏷️ **Classificador de Catálogo** | A planilha do fornecedor chega bagunçada e cada produto cai na categoria certa, com público e aviso de título ruim. | `apps/modelos/public/classificador-catalogo/app.config.mjs` |
| 55 | ⚖️ **Mesmo Produto?** | Confere se o anúncio do concorrente é o mesmo produto antes de comparar preço: pega 110 V × 220 V, 128 × 256 GB, cor e kit. | `apps/modelos/public/mesmo-produto/app.config.mjs` |
| 56 | 🧹 **Faxina de Termos de Busca** | O relatório de termos de busca do Google Ads passa pelo Jev: o que nunca vira aluno é negativado e a verba economizada aparece no fim. | `apps/modelos/public/faxina-termos/app.config.mjs` |
| 57 | 🛡️ **Revisor de Anúncio** | Enquanto você escreve o anúncio, o Jev aponta o que faz a plataforma barrar e o que dá para ajustar antes de subir. | `apps/modelos/public/revisor-anuncio/app.config.mjs` |
| 58 | 🎧 **Auditor de Ligações** | A cada fala da ligação o Jev confere o roteiro do vendedor e lê o cliente: objeção, interesse e o que falta fazer. | `apps/modelos/public/auditor-ligacoes/app.config.mjs` |
| 59 | 📊 **Pesquisa Aberta → Temas** | Cada resposta aberta da pesquisa de NPS cai num tema fixo, com o sentimento, e no fim você vê o tema mais citado. | `apps/modelos/public/pesquisa-temas/app.config.mjs` |
| 60 | 🚨 **Alarme de Crise de Marca** | Cada menção à marca nas redes, no Reclame Aqui e nas notícias vira crise, atenção, rotina ou elogio — e o alarme toca no que precisa de resposta hoje. | `apps/modelos/public/alarme-crise-marca/app.config.mjs` |
| 61 | 🤝 **Casamenteiro de Networking** | Cruza o que cada participante busca com o que os outros oferecem e sugere as apresentações com chance real de negócio. | `apps/modelos/public/casamenteiro-networking/app.config.mjs` |
| 62 | ✂️ **Caçador de Cortes** | Lê a transcrição do vídeo longo trecho a trecho e marca na linha do tempo os melhores cortes para Shorts. | `apps/modelos/public/cacador-cortes/app.config.mjs` |
| 63 | 🛍️ **Copiloto de Live Commerce** | Lê cada comentário do chat da live, entende "quero esse no M" e mostra o produto certo na tela, com o recado pronto para a apresentadora. | `apps/modelos/public/copiloto-live-commerce/app.config.mjs` |
| 64 | ⏭️ **Pula-Publi do YouTube** | Lê a transcrição do vídeo trecho a trecho e marca na linha do tempo a publi, a autopromoção, a abertura e o encerramento, com o tempo que dá para pular. | `apps/modelos/public/pula-publi/app.config.mjs` |

## Dados e back-office

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 3 | 📊 **Planilha Preditiva** | Crie uma coluna escrevendo só o título — o Jev preenche centenas de linhas em segundos. | `apps/planilha/` |
| 65 | 🏦 **Extrato que se Categoriza** | Cada linha crua do extrato vai para a categoria certa, com "é todo mês?" e "deduz no IR?", e no fim você vê quanto paga de assinaturas. | `apps/modelos/public/extrato-categoriza/app.config.mjs` |
| 66 | 🧮 **Auditor de Despesas** | Cada pedido de reembolso é aprovado, vai para o gestor ou é recusado pela política da empresa, com a justificativa fraca e a categoria errada à vista. | `apps/modelos/public/auditor-despesas/app.config.mjs` |
| 67 | 🧬 **Deduplicador de Cadastros** | Junta cadastros repetidos entre duas listas, mesmo com apelido, erro de digitação e e-mail diferente. | `apps/modelos/public/deduplicador-cadastros/app.config.mjs` |
| 68 | 🗂️ **Organizador de Arquivos** | Cada arquivo da pasta Downloads vai para a pasta certa pelo que ele É, não pela extensão, e o lixo é marcado para apagar. | `apps/modelos/public/organizador-arquivos/app.config.mjs` |

## Para quem constrói com IA

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 10 | 🐞 **QA Adversarial** _(pesado)_ | O Jev pilota um navegador de verdade tentando quebrar um site — e relata os bugs em um minuto. | `apps/qa/` |
| 69 | 🧪 **Banco de Provas** | Antes de confiar no Jev, prove no seu caso: acerto, curva de calibração e o limiar que automatiza sem errar. | `apps/modelos/public/banco-de-provas/app.config.mjs` |
| 70 | 🛝 **Playground do Jev** | Monte perguntas sem código, veja as probabilidades do Jev e leve o código pronto (curl, JavaScript, Python). | `apps/modelos/public/playground/app.config.mjs` |
| 71 | 🧭 **Roteador de Modelos** | Antes da chamada cara, o Jev escolhe o modelo e o esforço certos para cada pedido — e mostra a economia. | `apps/modelos/public/roteador-modelos/app.config.mjs` |
| 72 | 🗜️ **Compactação Instantânea** | Antes de o contexto do agente de código estourar, o Jev decide o que fica, o que vira 1 linha e o que sai — e mostra os tokens economizados. | `apps/modelos/public/compactacao-instantanea/app.config.mjs` |
| 73 | 🧠 **Memória que Escolhe o que Guardar** | A cada mensagem, o Jev decide em ~0,3 s se vale guardar na memória do assistente, que tipo de lembrança é e se é dado sensível. | `apps/modelos/public/memoria-escolhe/app.config.mjs` |
| 74 | 🧰 **Roteador de Ferramentas** | Antes de o LLM ler as 16 ferramentas do agente, o Jev escolhe em ~0,3 s a que resolve o pedido — e o contexto cai de milhares de tokens para centenas. | `apps/modelos/public/roteador-ferramentas/app.config.mjs` |
| 75 | 💾 **Cache Semântico** | Cada pergunta que chega é comparada com as já respondidas: se uma resposta guardada serve inteira, ela sai na hora, sem chamar o LLM. | `apps/modelos/public/cache-semantico/app.config.mjs` |
| 76 | ☕ **Responde com a Fonte** | O cliente pergunta, o Jev escolhe o trecho do manual que responde e o assistente cita o texto exato, ou diz "não achei" em vez de inventar. | `apps/modelos/public/responde-com-fonte/app.config.mjs` |
| 77 | 🔍 **A Fonte Diz Isso Mesmo?** | Para cada afirmação com citação, o Jev confere se a frase citada sustenta o que foi dito, e mede o exagero. | `apps/modelos/public/fonte-diz-isso/app.config.mjs` |
| 78 | 🌐 **Navegador Híbrido** | O LLM planeja cada passo; o Jev acha o elemento certo da página em menos de meio segundo e, na dúvida, devolve o passo ao LLM. | `apps/modelos/public/navegador-hibrido/app.config.mjs` |
| 79 | 📏 **Revisor de Regras do Código** | Cole o diff do PR: cada regra do time vira uma pergunta de sim ou não, e o Jev responde todas juntas em menos de um segundo. | `apps/modelos/public/revisor-regras-codigo/app.config.mjs` |
| 80 | 🗨️ **NLU sem Treino** | Escreva as intenções do seu bot em português e pronto: o Jev entende o cliente com gíria e erro de digitação, sem treinar nada. | `apps/modelos/public/nlu-sem-treino/app.config.mjs` |

## Voz e tempo real

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 1 | 🫥 **Mini Cluely** _(modelo de texto na nuvem)_ | Vê sua tela, ouve a reunião e sopra a resposta na hora — numa janela que flutua por cima de qualquer app. | `apps/cluely/` |
| 2 | 🎙️ **Estúdio por Voz** _(modelo de texto na nuvem)_ | Fale do seu negócio e veja site, marca, carrosséis, e-mail marketing e anúncios nascerem juntos — depois peça ajustes por voz e volte a qualquer versão. | `apps/estudio/` |
| 81 | 🏅 **Caixa que Escuta** | Ouve a conversa no balcão e mostra na tela do cliente o complemento certo, só quando é a hora. | `apps/modelos/public/caixa-que-escuta/app.config.mjs` |
| 82 | ☎️ **URA que Entende** | O cliente fala do jeito dele ("meu cartão não passa no mercado") e a ligação vai para o setor certo, sem "digite 1". | `apps/modelos/public/ura-que-entende/app.config.mjs` |
| 83 | 🎙️ **Agente de Voz que Sabe Quando Falar** | O agente de voz espera quando você pensa, segue quando você diz "uhum" e para quando você diz "peraí". | `apps/modelos/public/agente-voz-turnos/app.config.mjs` |
| 84 | 🗣️ **Assistente de Voz que Age** | O microfone fica ligado: ele executa o que você pede ao computador e ignora o que você fala com a família ou no telefone. | `apps/modelos/public/assistente-voz-age/app.config.mjs` |
| 85 | 🧭 **Facilitador de Reunião** | Escuta a reunião, anota decisões e tarefas na hora, cobra dono e puxa o grupo de volta quando a conversa foge da pauta. | `apps/modelos/public/facilitador-reuniao/app.config.mjs` |
| 86 | 🥊 **Detector de Falácias ao Vivo** | Num debate ao vivo, cada fala recebe o nome da falácia que comete (ou nenhuma) e uma nota de força do argumento. | `apps/modelos/public/detector-falacias/app.config.mjs` |
| 87 | 💡 **Ajudante de Conceitos** | Na aula ou na reunião, quando alguém solta um termo como "RAG" ou "churn", aparece na hora um cartão explicando. | `apps/modelos/public/ajudante-conceitos/app.config.mjs` |
| 88 | 🔎 **Checagem com Fonte ao Vivo** | Na palestra ou na call de vendas, quando alguém afirma algo que contradiz a ficha técnica, aparece na hora um cartão com o dado certo e a fonte. | `apps/modelos/public/checagem-fonte/app.config.mjs` |

## Educação

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 89 | 🌍 **Tutor que Diagnostica o Equívoco** | O professor cola as respostas da turma e cada uma cai na raia do equívoco que a explica, com o próximo exercício certo para aquele aluno. | `apps/modelos/public/tutor-equivoco/app.config.mjs` |
| 90 | 📝 **Corretor de Respostas Abertas** | Cada resposta aberta é conferida ponto a ponto contra o gabarito: completa, parcial ou incompleta, e o professor só revisa as incertas. | `apps/modelos/public/corretor-respostas/app.config.mjs` |
| 91 | ✍️ **Redação ENEM ao Vivo** | Enquanto o aluno escreve, cada parágrafo é conferido: tem tese? tem repertório? a proposta de intervenção tem os 5 elementos? | `apps/modelos/public/redacao-enem/app.config.mjs` |
| 92 | 🎧 **Treino de Atendimento** | O aprendiz atende uma cliente irritada e, a cada resposta, vê a empatia, a política e como a cliente reagiria. | `apps/modelos/public/treino-atendimento/app.config.mjs` |
| 93 | 🗣️ **Conversação em Inglês** | O aluno conversa em inglês e, a cada fala, vê o nível estimado, o erro principal e a próxima pergunta, no nível certo para ele. | `apps/modelos/public/conversacao-ingles/app.config.mjs` |

## Radares e alertas

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 94 | 📡 **Radar de Notícias** | Centenas de manchetes de IA por hora caem em 4 níveis, e só o imperdível que é notícia nova vira alerta no WhatsApp. | `apps/modelos/public/radar-noticias/app.config.mjs` |
| 95 | 🧲 **Caçador de Projetos para Freelancer** | Cada projeto novo da plataforma é lido contra o seu perfil em segundos: candidatar já, talvez ou pular, com alerta de golpe. | `apps/modelos/public/projetos-freelancer/app.config.mjs` |
| 96 | 🗞️ **Jornal Só Seu** | Os artigos de vários jornais e newsletters chegam juntos e só fica o que bate com os seus interesses, escritos do seu jeito. | `apps/modelos/public/jornal-so-seu/app.config.mjs` |
| 97 | 🎯 **Radar de Sinais de Compra** | Posts, vagas e notícias das empresas-alvo viram sinal forte, médio ou nenhum, e o vendedor só é chamado quando vale a pena. | `apps/modelos/public/sinais-compra/app.config.mjs` |

## Jurídico e setor público

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 98 | 🔍 **Contrato com Lupa** | Antes de assinar, o Jev lê o contrato cláusula por cláusula e separa: pode seguir, atenção ou levar ao advogado. | `apps/modelos/public/contrato-lupa/app.config.mjs` |

## Casa e jogos

| Nº | App | O que faz | Onde mexer |
|---|---|---|---|
| 5 | 🚗 **Carro Autônomo** | O Jev dirige: lê os sensores e decide acelerar, frear ou trocar de faixa várias vezes por segundo. | `apps/carro/` |
| 6 | 🏙️ **Cidade Viva** | 48 moradores com cérebro Jev decidem o que fazer a cada hora — todos numa única chamada. | `apps/cidade/` |
| 11 | 🗝️ **Escape Room** | Aventura de texto que entende qualquer coisa que você digita — e nunca quebra as regras do jogo. | `apps/escape/` |
| 16 | 🏍️ **Tron: Você vs Jev** | Jogo de motos de luz contra o Jev, que decide cada curva em milissegundos. | `apps/tron/` |
| 99 | 🏠 **Casa que Entende Indiretas** | “Tá um forno aqui” liga o ar da sala; “amor, viu meu celular?” não liga nada. A casa entende a indireta e sabe quando não é com ela. | `apps/modelos/public/casa-indiretas/app.config.mjs` |
| 100 | 🎲 **Mestre de RPG que Não Quebra Regras** | Os jogadores dizem o que fazem; o Jev escolhe a perícia, a dificuldade e a reação do NPC dentro das regras do mundo, e o código rola o d20. | `apps/modelos/public/mestre-rpg/app.config.mjs` |

# Estúdio por Voz

> **No Kit Jev:** este app roda na sua VPS da Hostinger, em `https://jev-estudio.<seu domínio>`, atrás do login do kit. Para mudar algo, edite os arquivos desta pasta e rode `node kit/jev-kit.mjs publicar`. Para levar o app a outro projeto: `node kit/jev-kit.mjs exportar estudio`. Aqui, o texto é escrito por um modelo na nuvem (Gemini 2.5 Flash-Lite pelo OpenRouter, via gateway), no lugar do modelo local citado abaixo; a transcrição Whisper do servidor vem desligada.


**“Fale do seu negócio e veja tudo nascer.”** A pessoa fala (ou simula uma fala, ou digita) e **5 peças se montam ao
mesmo tempo, mudando enquanto ela fala**:

1. **Site** — landing page de verdade (topo, seções, CTA, rodapé), rolável e responsiva, que dá para **ampliar** e **baixar** como um HTML único;
2. **Identidade visual** — logo em 10 estilos, paleta de 5 cores e par de fontes;
3. **3 carrosséis de Instagram, 6 lâminas cada** — papéis e formatos diferentes (apresentação, venda, relacionamento) num
   estilo visual de série (editorial, impacto, minimalista, colagem, luxo ou dados), com legenda e hashtags;
4. **E-mail marketing** — template master (tipo, assunto, cabeçalho, destaque e blocos escolhidos pelo Jev) e a
   **assinatura de e-mail** com a marca para os e-mails pessoais; o e-mail baixa em HTML de tabelas e a assinatura copia para o Gmail;
5. **Anúncios de display** — kit de banners nos tamanhos padrão (300×250, 728×90, 160×600, 320×50, 300×600, 970×250),
   animados, que também aparecem aplicados num site de exemplo e baixam num HTML único.

A cada pausa da fala (parcial do reconhecimento de voz), a transcrição vai para o servidor, que dispara **6 chamadas
paralelas ao Jev** — uma por grupo, **89 perguntas tipadas** no total — e devolve cada grupo por SSE assim que ele
chega. Cada painel acende ao receber a sua parte; a fita no topo mostra as 6 chamadas voando e chegando.

## Por que é um uso inteligente do Jev

- **O Jev é o diretor de arte, não um enfeite.** *Toda* escolha criativa é uma pergunta com critérios descritivos e a fala
  no `state`: 26 paletas descritas em palavras (“preto, vermelho e branco com cara de rock”), 13 pares de fontes descritos,
  **80 ícones** descritos, 30 títulos, 37 ganchos de post com lacunas, 9 layouts de topo, 16 seções, 13 CTAs, 26 slogans,
  6 tons de voz, 8 modelos de mensagem… **Não existe regra “palavra → escolha” no código.** O código só extrai *literais*
  (o nome depois de “se chama / chamada / o nome é” e a cidade de uma lista) e busca o texto da opção que o Jev escolheu.
- **Decide enquanto a pessoa fala.** 89 decisões em ~0,5 s cabem entre duas pausas da fala. Na frase “…clima rock and roll…
  **mas pensando bem, quero algo mais sofisticado, pra casal**”, paleta, fontes, título, ícone, CTA (“Reservar mesa”),
  faixa de preço e o tipo de e-mail viram no meio da frase (o `state` diz: “se a pessoa mudar de ideia, vale o que disse por último”).
- **Decisões conjuntas pelas probabilidades, não por regras.** Formato × gancho de cada post são combinados pelo produto
  das probabilidades entre pares compatíveis (sem repetir formato entre carrosséis; o mesmo vale para tipo × assunto do
  e-mail e conceito × título dos anúncios); as variantes da seção de oferta
  (cardápio × serviços × planos) ficam com a mais provável; a densidade (score) define quantas seções aprovadas entram.
- **Outra versão sem nova chamada** (tecla amarela com o dado): sorteia (temperatura 1,25) só entre opções que o Jev considerou boas (≥ 5 % e ≥ 8 % da
  1ª), mantém segmento/objetivo, e o aviso mostra “2ª opção do Jev, 47 %”. O Raio-X marca as sorteadas com o ícone do dado.
- **Transparência:** a gaveta **Raio-X** (tecla verde) com as 89 decisões (pergunta, escolha, probabilidade, 2º lugar, latência por grupo) e o
  inspetor do kit com as 6 chamadas reais.
- **Divisão de trabalho com o LLM local:** o Jev decide *estrutura, estilo e tom* em meio segundo e por centavos de
  centavo; o modelo local (tecla azul “Escrever textos com IA local”) só reescreve 11 textos livres **usando as decisões do Jev** como briefing, em streaming.
- **Custo:** ~US$ 0,001 por atualização (6 chamadas, 89 perguntas) → uma frase falada de ~10 s ≈ US$ 0,005 →
  mil estúdios ≈ US$ 5.

## Comandos por voz, travas e versões (2026-09-23, noite)
Depois que algo foi criado, a pessoa pode continuar falando **ou mandar mudar uma peça**. Isso funciona por voz,
simulado ou digitado no campo “Ajuste” (tecla “Aplicar”):
- **Roteador do Jev:** cada frase que termina vai para `POST /api/rota`, que faz 2 perguntas: `tipo` e `alvo`.
  - `tipo`: descrever_negocio · comando_de_edicao · desfazer · fixar · outra.
  - `alvo`: logo · cores · fontes · slogan · site · posts (carrosséis) · email · anuncios · tudo · nenhum.
  - As parciais também são roteadas dentro do `/api/decidir`, em paralelo com as 6 chamadas. Se a fala é comando, as
    decisões daquela rodada são descartadas, e a fita mostra "comando".
  - Frases de comando **não entram** na descrição do negócio e aparecem destacadas na transcrição, sobre fita crepe,
    com ícone de alvo (comando), de desfazer ou de cadeado (fixar).
  - Teste de 12 falas: 30 de 30 campos certos.
- **Comando:** `POST /api/comando` pergunta de novo só as decisões da peça pedida, com a opção **manter** em cada
  uma. Assim, "muda o logo pra ficar tipo selo de cervejaria" mexe no estilo, na moldura e na montagem, e mantém o
  ícone. O resultado fica **🔒 travado**: descrever mais o negócio não desfaz o pedido. Um clique na fita da trava
  (a fita crepe “🔒 logo ✕” colada no monitor) destrava. "Outra versão" respeita as travas.
- **Desfazer e fixar:** "volta as cores de antes" procura, nas versões guardadas, a última paleta diferente da atual e
  a aplica travada. "Gostei, pode manter" trava a peça como está.
- **Versões:** cada fala concluída, comando, desfazer, outra versão, texto da IA e restauração vira uma **versão guardada no
  servidor**. A receita tem as decisões do Jev, as trocas, as travas, a descrição e os textos. Ela fica em
  `DATA_DIR/projetos/<id>/vNNNN.json`, com o logo em SVG ao lado.
  - Rotas: `POST /api/projetos`, `GET /api/projetos[/:id]` e `POST|GET /api/projetos/:id/versoes[/:vid][/logo]`.
  - A gaveta **Versões** (tecla creme, com o número de versões) mostra a linha do tempo com o logo e as cores de cada versão. Dá para voltar **Tudo**,
    trazer **só uma peça** (logo, cores, fontes, site, carrosséis, e-mail, anúncios), que volta travada, e **baixar o site ou o logo em SVG**
    de qualquer versão.
  - O link `?projeto=<id>` reabre o projeto. "Novo negócio" (ao lado de "Simular fala") começa outro. Com algo criado, o microfone **continua**
    o projeto em vez de apagar.
  - A miniatura do logo é o único HTML que volta do servidor. O servidor recusa SVG com script, `foreignObject`,
    eventos (`on…=`) ou links externos, e serve o arquivo com CSP `sandbox` e `nosniff`. No navegador, a miniatura
    ainda passa por uma lista fechada de elementos e atributos (`svgSeguro` em `app.mjs`) antes de entrar na página.
  - Com 3 travas ou mais no mesmo painel (só a identidade chega lá), as fitas viram um grupo numa linha só, para
    não cobrir o logo.
- **Fala simulada "🎯 Ajustes por voz":**
  1. descreve a hamburgueria;
  2. "Agora muda o logo pra ficar minimalista, só o nome grandão": o estilo vira "só o nome", 🔒;
  3. "Gostei desse logo, pode manter": 🔒;
  4. "Troca as cores pra algo mais escuro e elegante": a paleta vira luxo, 🔒;
  5. "Na verdade, volta as cores de antes": ↩ volta a paleta anterior.

## Peças v3 (2026-09-24): carrosséis, e-mail marketing, anúncios e site de agência
O cartão de visita e o WhatsApp saíram. O pedido era "qualquer template tem de parecer trabalho de muito esforço".
- **Carrosséis** (`js/carrossel.mjs`, `js/carrossel-lam.mjs`, `css/carrossel.css`):
  - 3 carrosséis de 6 lâminas (1:1) em 13 formatos, com roteiros próprios, e 6 estilos de série que mudam a linguagem inteira: editorial de revista, pôster de impacto, suíço, colagem, luxo e dados.
  - Navegação por setas, pontos, teclado e arraste; o avanço automático é em CSS.
  - Visão ampliada: um kit por marca, com celular, as 18 lâminas e as decisões do Jev.
- **E-mail marketing** (`js/email.mjs`, `css/email.css`):
  - O template master mostra 5 tipos, 4 cabeçalhos, 5 destaques e 6 blocos num cliente de e-mail, com anotações do que o Jev escolheu.
  - A assinatura tem 5 layouts × 5 banners.
  - A tecla verde de baixar (no cabeçalho do monitor) leva o e-mail em HTML de tabelas (Mailchimp, RD Station, Brevo), sem SVG nem `data:`.
  - A tecla amarela de copiar copia a assinatura para colar no Gmail.
- **Anúncios de display** (`js/anuncios.mjs`, `css/anuncios.css`):
  - 6 formatos IAB (300×250, 728×90, 160×600, 320×50, 300×600, 970×250), cada um com composição própria.
  - 6 estilos × 6 esquemas de cor × 6 selos × 4 animações CSS, que respeitam "reduzir movimento".
  - Visão ampliada com os banners num portal de notícias e a prancha técnica a 100%.
  - A tecla verde de baixar leva o kit HTML5 num arquivo só.
- **Site** (`js/site.mjs`, `js/site-arte.mjs`):
  - Os 9 topos ganharam composições próprias.
  - A galeria virou um ensaio ilustrado com 6 cenas.
  - O antes e depois mostra a mesma cena apagada e viva, com cortina.
  - Seções numeradas, divisórias no estilo da ilustração, rodapé completo e nome da marca em texto (não é mais cortado).
- **Coerência dos dados:**
  - os anos de casa dos números do pacote seguem o tempo de mercado que o Jev decidiu;
  - o botão secundário do topo nunca repete o principal;
  - a página declara as 20 famílias de fonte (antes só 4 existiam; no Windows as outras caíam na fonte do sistema).

## Design v2 (2026-09-23, noite)
- **10 estilos de logo** (pergunta nova `estilo`, 83ª decisão): clássico, só o nome, bloco sólido, carimbo artesanal
  (tinta gasta feita com filtros SVG), monograma de luxo, geométrico Bauhaus, pôster empilhado, manuscrito, ícone de
  app e orgânico (`public/js/logos.mjs`). Cada um desenha também o símbolo usado em avatar, menu, e-mail e banners.
  - Com os 9 exemplos, o Jev escolheu: carimbo para a hamburgueria e a pizzaria, monograma 95% para a clínica
    premium, bloco para a consultoria B2B e para o pet shop, manuscrito para o inglês infantil.
  - Comandos: "tipo Chanel" vira monograma e "tipo app de banco" vira ícone de app.
- **17 pares de fontes próprias** (OFL, `public/fonts/`, 644 KB, só o subconjunto latino). As fontes de sistema que
  só existem no Mac saíram: Bodoni Moda, Jost, Archivo, Figtree, Nunito, Fraunces, Dancing Script, Zilla Slab, Cinzel,
  Courier Prime, Crimson Pro, Marcellus, Space Mono, Syne, Caveat, Righteous, mais as 4 que já existiam. Há 4 pares
  novos: mono brutalista, retrô anos 70, expressiva artística e letra de mão.
- **Ícones de apoio na ilustração:** o 2º e o 3º lugar da própria decisão do ícone entram na cena do topo do site e
  dos posts, só com 2% ou mais. Exemplos: hambúrguer + chama + guitarra na hamburgueria rock; gota + brilho +
  estetoscópio na clínica. Não é pergunta nova nem custo extra.
- Direção de arte inspirada nos modelos "taste" do [OpenDesign](https://github.com/nexu-io/open-design) (Apache-2.0).
  O OpenDesign é feito para agentes que escrevem código. Aqui o Jev só escolhe, então as regras viraram opções e
  desenhos nossos, sem copiar marcas reais.

## Perguntas enviadas (89 por atualização, 6 chamadas em paralelo)

`state` de todas as chamadas: `{ fala_da_pessoa, contexto }` — o contexto diz que é transcrição de voz ao vivo (pode estar
incompleta), para que servem as decisões e que vale o que a pessoa disse por último. Critérios completos:
`public/lib/biblioteca.mjs`, `public/lib/icones.mjs` e `public/lib/perguntas.mjs`.

**🧠 Entendimento** — 10 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `seg` | choice | Segmento | Hamburgueria, Pizzaria, Restaurante, Cafeteria, Confeitaria, Comida saudável, Bar e cervejaria, Eventos e festas, Pousada, Fotografia, Moda, Clínica de estética… (33 opções) |
| `pers` | choice | Personalidade da marca | Rebelde, Sofisticada, Acolhedora, Divertida, Natural, Especialista, Moderna, Tradicional, Energética, Delicada, Lúdica |
| `pub` | choice | Público principal | Jovens, Famílias, Casais, Mulheres, Homens, Empresas (B2B), Crianças, Tutores de pets, Alta renda, 50+, Público geral |
| `obj` | choice | Objetivo principal | Vender online, Delivery, Agendamentos, Orçamentos, Captar contatos, Visitas à loja, Seguidores |
| `canal` | choice | Canal principal | WhatsApp, Instagram, Site / loja online, Apps de delivery, Telefone, Presencial, LinkedIn / e-mail |
| `preco` | score | Faixa de preço | popular, acessível, médio, premium, luxo |
| `mat` | score | Tempo de mercado | começando, novo, alguns anos, consolidado, tradicional |
| `dif` | choice | Diferencial em destaque | Qualidade, Rapidez, Preço, Experiência, Exclusividade, Praticidade, Confiança, Resultado, Comunidade |
| `oferta` | choice | Oferta de boas-vindas | Cupom de 10%, Entrega grátis, Avaliação gratuita, Aula grátis, Diagnóstico grátis, Brinde, Desconto no pacote, Sobremesa grátis, Sem oferta |
| `emoji` | score | Emojis | nenhum, poucos, moderados, muitos |

**🌐 Site** — 28 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `hero` | choice | Layout do topo | Texto + ilustração, Central de impacto, Cinematográfico, Editorial, Cartões flutuantes, Minimalista, Lúdico, Com formulário, Mosaico vitrine |
| `titulo` | choice | Título do site | Sem frescura. Com muita atitude., Aumenta o volume: chegou o que faltava., Quebrando regras desde o primeiro dia., Os detalhes fazem toda a diferença., Uma experiência feita para ser lembrada., Para quem aprecia o que é raro., Feito com carinho, como em casa., O cantinho favorito do bairro., Cuidado de verdade, do jeito que você merece., Bora deixar o seu dia mais feliz?, Dá vontade de sorrir só de olhar., Do jeito que a natureza fez.… (30 opções) |
| `cta` | choice | Botão principal | Pedir pelo WhatsApp, Pedir delivery, Comprar agora, Agendar horário, Agendar avaliação gratuita, Solicitar orçamento, Falar com um especialista, Reservar mesa, Agendar aula experimental, Como chegar, Seguir no Instagram, Baixar material gratuito… (13 opções) |
| `img` | choice | Estilo de ilustração | Flat colorido, Traço fino, Vidro e brilho, Geométrico, Retrô, Orgânico, Adesivos |
| `dens` | score | Densidade | mínimo, arejado, equilibrado, completo, denso |
| `btn` | choice | Estilo dos botões | Pílula, Cantos suaves, Reto, Contorno, Bloco com sombra, Gradiente |
| `cantos` | choice | Cantos dos blocos | Retos, Suaves, Bem redondos |
| `textura` | choice | Textura de fundo | Lisa, Granulado, Pontilhado, Linhas finas |
| `sec_*` (16) | noul | Seção… | Cardápio / catálogo, Serviços, Planos e pacotes, Como funciona, Agenda online, Delivery, Depoimentos, Antes e depois, Equipe, Nossa história, Galeria, Números, Logos de clientes, Perguntas frequentes, Endereço e mapa, Captura de contato |
| `selo_*` (4) | noul | Selo no topo… | Nota ⭐, Prazo, Tempo de casa, Garantia |

**🎨 Identidade visual** — 8 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `paleta` | choice | Paleta de cores | Rock noturno, Terracota e mostarda, Cantina italiana, Nude e dourado, Preto e dourado, Vinho e creme, Sálvia e madeira, Menta fresca, Tropical, Café e caramelo, Pastel doce, Cores de brinquedo… (26 opções) |
| `fonte` | choice | Par de fontes | Didone de revista, Serifa editorial, Pôster condensado, Geométrica moderna, Grotesca técnica, Humanista acolhedora, Arredondada fofa, Cursiva artesanal, Slab de letreiro, Letreiro vintage, Serifa clássica, Sensorial leve… (17 opções) |
| `icone` | choice | Ícone do logo | Hambúrguer, Pizza, Xícara de café, Cupcake, Garfo e faca, Prato servido, Chapéu de chef, Tigela, Taça de vinho, Caneca de chope, Sorvete, Trigo… (80 opções) |
| `forma` | choice | Moldura do símbolo | Círculo, Quadrado arredondado, Hexágono, Escudo, Selo circular, Forma orgânica, Sem moldura |
| `disp` | choice | Montagem do logo | Horizontal, Empilhado, Emblema, Monograma, Assinatura |
| `caixa` | choice | Caixa do nome | CAIXA ALTA, Iniciais maiúsculas, minúsculas |
| `estilo` | choice | Estilo do logo | Clássico, Só o nome, Bloco sólido, Carimbo artesanal, Monograma de luxo, Geométrico Bauhaus, Pôster empilhado, Manuscrito, Ícone de app, Orgânico |
| `slogan` | choice | Slogan | Sabor que vira memória., Feito com alma., Do nosso jeito, pro seu dia., Qualidade que se sente., Cuidado que transforma., Simples assim., Paixão em cada detalhe., Confiança que gera resultado., Inteligência que faz crescer., Bem-estar de verdade., Tradição e sabor desde sempre., Alto volume, alto sabor.… (26 opções) |

**📸 Carrosséis** — 22 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `car_estilo` | choice | Estilo dos carrosséis | Editorial de revista, Pôster de impacto, Minimalista suíço, Colagem divertida, Luxo discreto, Dados e precisão |
| `pN_fmt` (3) | choice | formato | Manifesto, Motivos, Apresentação, Nossa história |
| `pN_hook` (3) | choice | capa | {nome} chegou{em_cidade}!, Muito prazer: {nome}., Conheça {nome} em 6 lâminas, Não é só {produto}. É experiência., Nosso compromisso: {ang}., No que a gente acredita, O segredo? {Ang}., 3 motivos para escolher {nome}, Por que tanta gente volta?, Como tudo começou, Por trás de cada detalhe, Feito {para_publico}.… (13 opções) |
| `pN_ang` (3) | choice | diferencial | Qualidade, Rapidez, Preço, Experiência, Exclusividade, Praticidade, Confiança, Resultado, Comunidade |
| `pN_bg` (3) | choice | cores | Cor sólida, Degradê, Escuro, Papel claro, Padrão de ícones, Ilustração |
| `pN_item` (3) | choice | item em destaque | Carro-chefe, Premium, Mais acessível, Novidade |
| `pN_leg` (3) | choice | legenda | Curta e direta, História, Lista com emojis, Pergunta, Urgência, Educativa |
| `pN_cta` (3) | choice | chamada | Link na bio, Chama no direct, Peça pelo WhatsApp, Comenta aqui, Salva pra não esquecer, Marca quem precisa ver, Agende pelo link da bio |

**✉️ E-mail marketing** — 14 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `em_tipo` | choice | E-mail · tipo | Boas-vindas, Newsletter do mês, Promoção, Lançamento, Reengajamento |
| `em_assunto` | choice | E-mail · assunto | {nome}: seu presente de boas-vindas {e1:🎁}, Ganhe {oferta_curta} no seu primeiro pedido, Que bom ter você por aqui {e1:💛}, O que rolou em {mes} por aqui {e1:✨}, Bastidores, dica e novidades de {mes}, {dica_t} (e mais novidades), Só hoje: {oferta_curta} {e1:⏰}, Últimas horas para garantir {oferta_curta}, {item0} por {preco0}. Só esta semana., Chegou: {item3} {e1:🚀}, Em primeira mão para você: {item3}, Faz tempo que você não aparece {e1:🥺}… (13 opções) |
| `em_cabecalho` | choice | E-mail · cabeçalho | Faixa de cor, Logo e menu, Logo grande, Barra fina |
| `em_hero` | choice | E-mail · destaque | Ilustração + título, Título gigante, Cupom em destaque, Produto em cartão, Carta pessoal |
| `em_cta` | choice | E-mail · botão | Fazer meu pedido, Agendar meu horário, Quero meu desconto, Ver {itens_lower}, Falar com a equipe, Conhecer as novidades |
| `em_b_*` (6) | noul | E-mail · bloco… | Grade de produtos, Depoimento, Como funciona, Dica útil, Números, Prazo da oferta |
| `ass_layout` | choice | Assinatura · layout | Clássica, Empilhada, Com banner, Minimalista, Cartão |
| `ass_banner` | choice | Assinatura · banner | Oferta, Slogan, Avaliação, Agenda aberta, Sem banner |
| `ass_pessoa` | choice | Assinatura · quem assina | Quem lidera, Atendimento, A equipe |

**📣 Anúncios** — 7 perguntas numa chamada

| id | tipo | decide | opções (o critério completo de cada uma está no código) |
|---|---|---|---|
| `ad_conceito` | choice | Anúncio · conceito | Oferta, Produto em destaque, Marca, Prova social, Urgência, Perto de você, Novidade |
| `ad_titulo` | choice | Anúncio · título | {oferta_curta} no primeiro pedido, Ganhe {oferta_curta} hoje, {item0} por {preco0}, Deu vontade de {produto}?, {Ang}., {slogan}, Não é só {produto}. É experiência., {num_v} {num_r}, Quem conhece, volta., Últimas vagas da semana, Só hoje: {oferta_curta}, {Cat} pertinho de você{em_cidade}… (13 opções) |
| `ad_estilo` | choice | Anúncio · estilo | Produto em destaque, Tipográfico, Dividido, Cupom, Premium escuro, Depoimento |
| `ad_cta` | choice | Anúncio · botão | Peça agora, Agende já, Compre agora, Quero o desconto, Saiba mais, Fale com a gente, Ver {itens_lower} |
| `ad_selo` | choice | Anúncio · selo | Entrega grátis, Nota alta, Novo, Só hoje, Garantia, Sem selo |
| `ad_fundo` | choice | Anúncio · cores | Cor sólida, Degradê, Escuro, Papel claro, Padrão de ícones, Ilustração |
| `ad_anim` | choice | Anúncio · animação | Sequência de 3 quadros, Revelar, Botão pulsando, Estático |

Os textos que aparecem nas peças vêm de bibliotecas escritas para o app: `public/lib/biblioteca.mjs` (títulos,
capas dos carrosséis, slogans, assuntos de e-mail, títulos de anúncio) e **33 pacotes de segmento** em `public/lib/seg-*.mjs` (cardápio/serviços com preços,
9 diferenciais por segmento, depoimentos, FAQ, passos, números, equipe, dica, bastidores, antes/depois…). Os preços
seguem o `score` de faixa de preço do Jev; o ano de fundação segue o `score` de tempo de mercado.

## Medido (2026-09-23, Mac no Brasil → gateway :8787 → OpenRouter)

| métrica | valor |
|---|---|
| Latência por atualização (6 chamadas em paralelo desde a v3; medido com 5 na v2) | p50 **503 ms**, máx 1.375 ms (35 atualizações do e2e); cada grupo 330–620 ms |
| Custo por atualização | **~US$ 0,00098** na v3 (6 chamadas, ~23 mil tokens de entrada); era US$ 0,000789 com 5 chamadas |
| Atualizações durante a fala da hamburgueria (~10 s, microfone falso palavra por palavra) | 4 durante + 1 final; 4 versões diferentes dos artefatos |
| Paráfrases (pizzaria “jeito 1” × “jeito 2”) | 18/18 decisões iguais (segmento, objetivo, paleta, fontes, ícone, layout, CTA, tom…) |
| ✍️ IA local — Qwen3-30B-A3B (llama.cpp no VPS, via túnel) | 8/8 campos em 27–33 s · 18–19 tok/s · 370–415 tokens · 1º token 5–11 s · R$ 0 por uso |
| ✍️ IA local — Ollama qwen2.5:3b (dev) | 8/8 campos em 7,8 s · 40 tok/s (texto mais fraco; mesmo fluxo) |

## Roteiro de 60 s para o vídeo (1440×900)

1. **0–5 s** — Abrir a página. Primeiro frame: a fita crepe “Estúdio por Voz”, a tecla vermelha **MIC**, o ponteiro do
   VU meter varrendo a escala, os 5 monitores “sem sinal” e a fita “89 decisões por pausa”.
2. **5–20 s** — Tocar na tecla **MIC** e falar (ou no cartucho **🍔 Hamburgueria rock**): o ponteiro do VU dança, a
   transcrição corre em creme e cinza, cabos coloridos saem da fala até os monitores, os 6 canais da fita acendem com a
   latência de cada chamada, os knobs giram, o contador rola até 89 e site, logo, carrosséis, e-mail e banners se
   montam **e mudam durante a frase**. Os carrosséis passam lâmina por lâmina e os banners animam.
3. **20–30 s** — Cartucho **🔄 Mudei de ideia**: no “…mas pensando bem, quero algo mais sofisticado, pra casal” tudo vira
   ao vivo — paleta, fontes, estilo dos carrosséis, tipo de e-mail e conceito dos anúncios.
4. **30–40 s** — **Ampliar** os carrosséis (as 18 lâminas grandes), o e-mail (template master num cliente de e-mail +
   assinatura em uso) e os banners (aplicados num portal de notícias).
5. **40–46 s** — Dizer “muda o e-mail para uma promoção” ou “deixa os anúncios mais premium” (ou escrever no campo
   **Ajuste** e tocar em **Aplicar**): o Jev refaz só aquela peça e cola no monitor a fita “🔒 e-mail”.
6. **46–52 s** — Tecla verde **Raio-X**: rolar as 89 decisões com probabilidade e 2º lugar. Fechar.
7. **52–60 s** — No monitor do e-mail, a tecla verde de baixar (HTML de tabelas) e a amarela de copiar a assinatura para o
   Gmail; no dos anúncios, a tecla verde de baixar o kit de banners.

## Como rodar

```bash
cd "."
pkill -f "apps/estudio/server.mjs"
LOCAL_LLM_URL=http://127.0.0.1:8088/v1 LOCAL_LLM_MODEL=qwen3-30b-a3b PORT=4116 \
  node apps/estudio/server.mjs > scratch/logs/estudio.log 2>&1 &
```

O e2e cria projetos de verdade. Depois de rodar em produção, tire-os da lista "Projetos anteriores" movendo os
arquivos criados na janela do teste para uma pasta de arquivo (a lista só lê `projetos/<10 letras>.json`):
`/var/lib/docker/volumes/jev_estudio_data/_data/projetos/_testes-e2e-AAAA-MM-DD/`.

Atalhos: `/?exemplo=burger` (ou `virada`, `clinica`, `pet`, `b2b`, `ingles`, `pizzaA`, `pizzaB`) começa a fala simulada;
`/?texto=...` gera direto de um texto.

## Deploy (para o integrador)

- **Node 22, zero dependências npm.** O `Dockerfile.app` padrão serve (`CMD node server.mjs`). ~60 MB de RAM.
- **Variáveis de ambiente:** `PORT` (4116 local / 3000 no container), `JEV_GATEWAY_URL` (http://gateway:8787),
  `DATA_DIR` (/data — `stats.json` com contadores e `projetos/` com as versões), `LOCAL_LLM_URL` (produção: http://llm:8080/v1),
  `LOCAL_LLM_MODEL` (qwen3-30b-a3b), opcionais `LOCAL_LLM_LABEL`, `LOCAL_LLM_MAX_QUEUE` (8), `SIM_LIVE_PER_IP_HOUR` (120 —
  depois disso as falas *simuladas* usam o cache de 30 min do gateway), `MAX_UPDATES_PER_SESSION` (260).
- Registrado em `apps.json`, `deploy/ready.json` e no DNS (`jev-estudio`). Publicar: `deploy/deploy.sh app-estudio`.
- **Streaming:** `POST /api/decidir` e `POST /api/escrever` respondem `text/event-stream`; o Caddyfile gerado já não
  comprime `/api/*` nem `text/event-stream` — nada a mudar.
- **Microfone exige HTTPS** (o domínio já tem). No Chrome, o reconhecimento de voz do navegador manda o áudio para o Google;
  só o texto chega ao servidor.
- **Fontes embutidas** (OFL, em `public/fonts/`, 25 arquivos .woff2, 654 KB: as 20 famílias das marcas e a
  Instrument Sans da interface; ver "Design v2"). No HTML e no logo baixados
  entram em base64 só as do par escolhido.
- **Gasto previsto:** ~US$ 0,0008 por atualização; limite de 70 atualizações/min por IP na rota e 260 por sessão de página.

## Limitações conhecidas

- **Voz:** Web Speech API funciona no Chrome, Edge e Safari; no Firefox o botão explica e sobra a simulação e a caixa de
  texto. Permissão negada / sem microfone / sem internet → mensagem clara e o botão volta ao estado desligado.
- **Nome e cidade** são literais: o nome só vem da fala com “se chama / chamada / o nome é / batizada de”; senão aparece
  um nome **provisório** do segmento (em itálico, “sugestão”) que dá para editar. Cidades: ~100 cidades brasileiras.
- **É um rascunho:** telefone “(DDD) 99999-0000”, endereço “Rua das Palmeiras, 240”, nota 4,9, números e logos de
  clientes são *placeholders* de modelo, não dados reais; o domínio, os e-mails e o @ sugeridos são fictícios.
- **E-mail baixado:** HTML de tabelas com estilos inline, sem SVG nem imagens (o Gmail remove SVG e `data:`), por isso as
  ilustrações do painel viram blocos de cor e tipografia no arquivo. Imagens de verdade precisam ser hospedadas.
- **Segmentos:** 32 tipos + “outro” (conteúdo genérico). Com fala curta ou ambígua o Jev oscila entre opções próximas
  (ex.: pet shop — “sálvia” 28 % × “cores de brinquedo” 23 %); o Raio-X mostra isso.
- **Fontes:** o estúdio usa 20 famílias próprias (OFL, em `public/fonts/`), iguais em qualquer computador. No e-mail
  baixado e na assinatura, os clientes de e-mail usam a fonte de reserva (Arial/Georgia), porque não carregam fontes próprias.
- **IA local:** uma geração por vez no servidor (fila compartilhada com os outros apps); o 1º token leva 5–11 s na CPU do
  VPS; limite de 8 pedidos/min por IP e 1 escrita simultânea por pessoa. Se o modelo estiver carregando, o botão explica e
  os textos da biblioteca continuam. Se o segmento mudar depois, os textos da IA são descartados.
- **Microfone de verdade no teste automático:** o e2e prova o caminho do microfone com um reconhecedor injetado (parciais
  palavra por palavra). Tentei também o Chrome do sistema em headless com áudio falso (`--use-file-for-fake-audio-capture`
  + WAV da voz Luciana): o `webkitSpeechRecognition` existe e o botão entra em “Ouvindo…”, mas o serviço de voz do Google
  não devolve transcrição em modo headless — fica para o teste manual na gravação.
- Latência medida do Brasil; do servidor em Boston deve ser menor.

## Arquivos

```
server.mjs                 13 rotas: /api/config, /api/stats, /api/local, /api/decidir (SSE, 6 chamadas paralelas), /api/escrever
                           (SSE, modelo local), /api/rota, /api/comando, /api/projetos (criar/listar/abrir) e as versões
                           (/api/projetos/:id/versoes, uma versão, o logo SVG da versão)
data/exemplos.json         as 9 falas dos cartuchos de “Simular fala” (inclui o par de paráfrases)
public/index.html, style.css
public/lib/biblioteca.mjs  opções + critérios (paletas, fontes, títulos, ganchos, CTAs, tons…)  ← a “política” do Jev
public/lib/icones.mjs      80 ícones SVG desenhados para o app, cada um com critério
public/lib/perguntas.mjs   as 89 perguntas em 6 grupos (servidor e Raio-X usam o mesmo arquivo)
public/lib/seg-*.mjs       33 pacotes de texto por segmento
public/lib/escritor.mjs    prompt do modelo local + leitor tolerante de “CAMPO: valor”
public/js/app.mjs          controlador (fala → atualização → SSE → painéis, Raio-X, outra versão, IA local, baixar)
public/js/contexto.mjs     respostas do Jev → contexto (extração literal de nome/cidade, decisões conjuntas, sorteio)
public/js/site.mjs, marca.mjs, logos.mjs, arte.mjs   site, identidade e ilustrações
public/js/carrossel.mjs, email.mjs, anuncios.mjs + public/css/   carrosséis, e-mail marketing e banners
public/dev/galeria.html, public/dev/fixtures/   galeria de conferência com decisões reais do Jev (12 negócios); dev/ tem o brief e a captura
public/js/voz.mjs          microfone (Web Speech) + fala simulada pelo mesmo caminho
```

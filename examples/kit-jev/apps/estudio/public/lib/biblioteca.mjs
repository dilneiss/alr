// Biblioteca de opções do Estúdio por Voz. Cada opção tem:
//   id      → chave enviada ao Jev
//   rotulo  → nome curto mostrado no Raio-X
//   jev     → o CRITÉRIO descritivo que o Jev lê (a "política" da escolha)
//   ...     → dados de desenho usados pelos renderizadores (nunca lidos pelo Jev)
// O Jev escolhe; o código só busca a opção escolhida aqui. Nenhuma regra "palavra → opção" existe no app.

// ------------------------------------------------------------------ entendimento
export const SEGMENTOS = [
  ['hamburgueria', 'Hamburgueria', 'Hamburgueria ou lanchonete: hambúrguer artesanal, smash burger, lanches'],
  ['pizzaria', 'Pizzaria', 'Pizzaria: pizza no forno a lenha, rodízio ou delivery de pizza'],
  ['restaurante', 'Restaurante', 'Restaurante ou bistrô: almoço, jantar, comida caseira ou cozinha autoral'],
  ['cafeteria', 'Cafeteria', 'Cafeteria ou padaria: café especial, pães, brunch, lanche da tarde'],
  ['confeitaria', 'Confeitaria', 'Confeitaria ou doceria: bolos, doces, brigadeiros, encomendas de festa'],
  ['saudavel', 'Comida saudável', 'Comida saudável: marmitas fitness, vegana, low carb, açaí, sucos naturais'],
  ['bar', 'Bar e cervejaria', 'Bar, boteco ou cervejaria: chope, drinks, petiscos, happy hour, música ao vivo'],
  ['eventos', 'Eventos e festas', 'Eventos e festas: buffet, decoração, casamentos, festas infantis, cerimonial'],
  ['hospedagem', 'Pousada', 'Pousada, hotel, hostel ou casa de temporada; turismo e passeios'],
  ['fotografia', 'Fotografia', 'Fotógrafo ou videomaker: ensaios, casamentos, eventos, filmagem'],
  ['moda', 'Moda', 'Loja de roupas, moda, calçados ou acessórios; boutique ou loja online'],
  ['estetica', 'Clínica de estética', 'Clínica de estética: tratamentos faciais e corporais, harmonização, laser'],
  ['salao', 'Salão de beleza', 'Salão de beleza: cabelo, coloração, escova, unhas, maquiagem, sobrancelha'],
  ['barbearia', 'Barbearia', 'Barbearia: corte masculino, barba, navalha, visual masculino'],
  ['odontologia', 'Odontologia', 'Dentista ou clínica odontológica: clareamento, implante, aparelho'],
  ['saude', 'Clínica e fisioterapia', 'Clínica médica ou fisioterapia: consultas, exames, reabilitação'],
  ['psicologia', 'Psicologia', 'Psicólogo ou terapeuta: terapia, saúde mental, atendimento online'],
  ['nutricao', 'Nutrição', 'Nutricionista: dieta, emagrecimento, reeducação alimentar'],
  ['academia', 'Academia', 'Academia, crossfit, personal trainer, treino funcional ou lutas'],
  ['bemestar', 'Yoga, pilates e spa', 'Yoga, pilates, meditação, massagem ou spa: bem-estar e relaxamento'],
  ['pet', 'Pet shop', 'Pet shop ou veterinária: banho e tosa, ração, cuidados com cães e gatos'],
  ['consultoria', 'Consultoria B2B', 'Consultoria para empresas (B2B): gestão, processos, vendas, estratégia'],
  ['contabilidade', 'Contabilidade', 'Contabilidade: impostos, abertura de empresa, MEI, folha de pagamento'],
  ['advocacia', 'Advocacia', 'Advogado ou escritório de advocacia: trabalhista, família, empresarial'],
  ['marketing', 'Agência de marketing', 'Agência de marketing digital, social media, design, tráfego pago'],
  ['tecnologia', 'Tecnologia', 'Tecnologia: software, aplicativos, sistemas, SaaS, suporte de TI'],
  ['idiomas', 'Escola de idiomas', 'Escola de idiomas: inglês ou espanhol para crianças, jovens e adultos'],
  ['cursos', 'Cursos e mentorias', 'Cursos, mentorias ou infoprodutos; reforço escolar e preparatórios'],
  ['imobiliaria', 'Imobiliária', 'Imobiliária ou corretor: compra, venda e aluguel de imóveis'],
  ['arquitetura', 'Arquitetura', 'Arquitetura e design de interiores: projetos de casas e ambientes'],
  ['reformas', 'Reformas', 'Construção e reformas: pedreiro, pintura, elétrica, hidráulica, marcenaria'],
  ['oficina', 'Oficina mecânica', 'Oficina mecânica, auto center, funilaria ou estética automotiva'],
  ['outro', 'Outro negócio', 'Outro tipo de negócio, que não se encaixa em nenhuma opção acima'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const PERSONALIDADES = [
  ['rebelde', 'Rebelde', 'Rebelde e ousada: atitude, rock, irreverente, sem frescura'],
  ['sofisticada', 'Sofisticada', 'Sofisticada e elegante: premium, refinada, requintada, discreta'],
  ['acolhedora', 'Acolhedora', 'Acolhedora e familiar: calorosa, de bairro, próxima e carinhosa'],
  ['divertida', 'Divertida', 'Divertida e alegre: bem-humorada, colorida, leve e jovem'],
  ['natural', 'Natural', 'Natural e consciente: saudável, orgânica, sustentável, calma'],
  ['especialista', 'Especialista', 'Especialista e confiável: técnica, séria, precisa, profissional'],
  ['moderna', 'Moderna', 'Moderna e minimalista: clean, contemporânea, digital, direta'],
  ['tradicional', 'Tradicional', 'Tradicional e artesanal: clássica, com história, feita à mão'],
  ['energetica', 'Energética', 'Energética e motivadora: intensa, esportiva, desafiadora'],
  ['delicada', 'Delicada', 'Delicada e romântica: suave, afetiva, sensível'],
  ['ludica', 'Lúdica', 'Lúdica e infantil: fofa, criativa, feita para crianças'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const PUBLICOS = [
  ['jovens', 'Jovens', 'Jovens e universitários, de 18 a 30 anos', 'para a galera'],
  ['familias', 'Famílias', 'Famílias com filhos', 'para a família toda'],
  ['casais', 'Casais', 'Casais: programa a dois, datas especiais', 'para casais'],
  ['mulheres', 'Mulheres', 'Mulheres adultas que cuidam de si', 'para mulheres que se cuidam'],
  ['homens', 'Homens', 'Homens adultos', 'para homens'],
  ['empresas', 'Empresas (B2B)', 'Empresas, gestores e donos de negócio (B2B)', 'para empresas que querem crescer'],
  ['criancas', 'Crianças', 'Crianças e os pais que decidem por elas', 'para crianças (e seus pais)'],
  ['tutores', 'Tutores de pets', 'Tutores de cães e gatos', 'para quem ama pets'],
  ['premium', 'Alta renda', 'Clientes de alta renda e exigentes', 'para quem exige o melhor'],
  ['maduros', '50+', 'Pessoas maduras, 50+ e terceira idade', 'para quem tem 50+'],
  ['geral', 'Público geral', 'Público geral do bairro, de todas as idades', 'para todo mundo'],
].map(([id, rotulo, jev, para]) => ({ id, rotulo, jev, para }));

export const OBJETIVOS = [
  ['vender_online', 'Vender online', 'Vender pela internet: loja virtual, compra online'],
  ['delivery', 'Delivery', 'Receber pedidos de delivery pelo WhatsApp ou aplicativo'],
  ['agendar', 'Agendamentos', 'Fazer as pessoas agendarem horário, consulta ou aula'],
  ['orcamento', 'Orçamentos', 'Receber pedidos de orçamento'],
  ['leads', 'Captar contatos', 'Captar contatos interessados para vender depois'],
  ['visitar', 'Visitas à loja', 'Levar pessoas a visitar a loja ou o espaço físico'],
  ['redes', 'Seguidores', 'Ganhar seguidores e ficar conhecido nas redes sociais'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CANAIS = [
  ['whatsapp', 'WhatsApp', 'WhatsApp'],
  ['instagram', 'Instagram', 'Instagram e redes sociais'],
  ['site', 'Site / loja online', 'Site ou loja online'],
  ['apps', 'Apps de delivery', 'Aplicativos de delivery'],
  ['telefone', 'Telefone', 'Telefone'],
  ['presencial', 'Presencial', 'Presencial: balcão, loja, consultório ou escritório'],
  ['linkedin', 'LinkedIn / e-mail', 'LinkedIn ou e-mail, contato com empresas'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const PRECO = [
  'Popular: preço baixo, promoções, o mais barato da região',
  'Acessível: bom custo-benefício',
  'Médio: preço justo por boa qualidade',
  'Alto: premium, acima da média',
  'Luxo: exclusivo, alto padrão, sob medida',
];
export const PRECO_ROT = ['popular', 'acessível', 'médio', 'premium', 'luxo'];
export const PRECO_FATOR = [0.72, 0.86, 1, 1.35, 1.9];

export const MATURIDADE = [
  'Ainda vai abrir ou está começando agora',
  'Aberto há pouco tempo, menos de um ano',
  'Alguns anos de mercado',
  'Consolidado, com muitos clientes fiéis',
  'Tradicional, com décadas de história',
];
export const MATURIDADE_ROT = ['começando', 'novo', 'alguns anos', 'consolidado', 'tradicional'];
export const MATURIDADE_ANOS = [0, 1, 4, 10, 28];

export const ANGULOS = [
  ['qualidade', 'Qualidade', 'Qualidade do produto ou serviço: ingredientes, materiais, capricho'],
  ['rapidez', 'Rapidez', 'Rapidez: entrega ou atendimento ágil'],
  ['preco', 'Preço', 'Preço justo, promoções, custo-benefício'],
  ['experiencia', 'Experiência', 'Experiência: ambiente, clima, vivência marcante'],
  ['exclusividade', 'Exclusividade', 'Exclusividade: sofisticação, algo único e autoral'],
  ['conveniencia', 'Praticidade', 'Praticidade: fácil de pedir, comprar ou agendar'],
  ['confianca', 'Confiança', 'Confiança: credibilidade, avaliações, experiência comprovada'],
  ['resultado', 'Resultado', 'Resultado: a transformação ou o benefício que a pessoa sente'],
  ['comunidade', 'Comunidade', 'Comunidade: relação próxima, pertencimento, bairro'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

// ------------------------------------------------------------------ site
export const HEROS = [
  ['split', 'Texto + ilustração', 'Texto à esquerda e ilustração grande à direita: clássico, claro, mostra o produto'],
  ['central', 'Central de impacto', 'Título enorme centralizado sobre fundo de cor forte: impacto, atitude, promoção'],
  ['cinema', 'Cinematográfico', 'Tela cheia escura com arte dramática e texto por cima: noturno, rock, marcante'],
  ['editorial', 'Editorial', 'Estilo revista: título serifado grande, muito respiro, linhas finas: elegante e premium'],
  ['cartoes', 'Cartões flutuantes', 'Título com cartões flutuantes de destaque (nota, prazo, preço): dinâmico e moderno'],
  ['minimal', 'Minimalista', 'Minimalista: muito espaço vazio, título curto e um botão: clean, técnico, sério'],
  ['ludico', 'Lúdico', 'Formas coloridas, bolhas e adesivos, cantos redondos: alegre, infantil, divertido'],
  ['formulario', 'Com formulário', 'Título à esquerda e formulário de contato à direita: B2B, orçamentos, captar contatos'],
  ['mosaico', 'Mosaico vitrine', 'Mosaico de blocos coloridos com produtos e selos: vitrine, loja, cardápio visual'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const TITULOS = [
  ['atitude', 'Sem frescura. Com muita atitude.', 'Ousado, irreverente, rock, sem frescura'],
  ['volume', 'Aumenta o volume: chegou o que faltava.', 'Barulhento e festivo, rock, noite, energia'],
  ['regras', 'Quebrando regras desde o primeiro dia.', 'Rebelde e disruptivo, jovem'],
  ['detalhes', 'Os detalhes fazem toda a diferença.', 'Elegante, premium, refinado'],
  ['lembrada', 'Uma experiência feita para ser lembrada.', 'Sofisticado, ocasiões especiais, casais'],
  ['raro', 'Para quem aprecia o que é raro.', 'Luxo, exclusividade, alto padrão'],
  ['casa', 'Feito com carinho, como em casa.', 'Acolhedor, caseiro, familiar'],
  ['bairro', 'O cantinho favorito do bairro.', 'De bairro, próximo, comunidade'],
  ['cuidado', 'Cuidado de verdade, do jeito que você merece.', 'Atencioso e humano: saúde, beleza, serviços'],
  ['feliz', 'Bora deixar o seu dia mais feliz?', 'Divertido, alegre, leve'],
  ['sorrir', 'Dá vontade de sorrir só de olhar.', 'Fofo e colorido: doces, pets, crianças'],
  ['natureza', 'Do jeito que a natureza fez.', 'Natural, orgânico, saudável'],
  ['leveza', 'Mais leveza para o seu dia a dia.', 'Bem-estar, calma, equilíbrio'],
  ['confiar', 'Resultados em que você pode confiar.', 'Técnico, sério, confiável, especialista'],
  ['especialistas', 'Especialistas no que realmente importa.', 'Autoridade e experiência: B2B, saúde, serviços'],
  ['solucao', 'A solução certa, sem complicação.', 'Direto e prático: serviços e empresas'],
  ['simples', 'Simples. Rápido. Do seu jeito.', 'Moderno, prático, digital'],
  ['futuro', 'O futuro do seu negócio começa agora.', 'Inovação, tecnologia, crescimento de empresas'],
  ['tradicao', 'Tradição que atravessa gerações.', 'Tradicional, clássico, com história'],
  ['artesanal', 'Feito à mão, do jeito certo.', 'Artesanal, capricho, feito à mão'],
  ['nivel', 'O seu próximo nível começa aqui.', 'Motivador, esportivo, superação'],
  ['energia', 'Mais energia para o que importa.', 'Energético, vitalidade, disposição'],
  ['delicadeza', 'Delicadeza em cada detalhe.', 'Delicado, romântico, afetivo'],
  ['versao', 'A sua melhor versão, todos os dias.', 'Autoestima, beleza, transformação pessoal'],
  ['brincando', 'Aprender brincando é muito mais divertido.', 'Infantil e educativo, lúdico'],
  ['aventuras', 'Grandes aventuras para pequenos exploradores.', 'Infantil, criativo, aventura'],
  ['transformacao', 'A transformação que você procurava.', 'Resultado visível, antes e depois'],
  ['tempo', 'Ganhe tempo para o que realmente importa.', 'Praticidade, economia de tempo'],
  ['vontade', 'Deu vontade? A gente resolve.', 'Desejo e impulso: comida, delivery, compras'],
  ['saudade', 'Sabor que dá saudade.', 'Comida memorável, gastronomia afetiva'],
].map(([id, texto, jev]) => ({ id, rotulo: texto, texto, jev: `“${texto}” — ${jev}` }));

export const CTAS = [
  ['pedir_whats', 'Pedir pelo WhatsApp', 'Pedido direto pelo WhatsApp', 'whats'],
  ['pedir_delivery', 'Pedir delivery', 'Pedido por delivery ou aplicativo', 'moto'],
  ['comprar', 'Comprar agora', 'Compra imediata numa loja online', 'sacola'],
  ['agendar', 'Agendar horário', 'Agendar um horário ou serviço', 'calendario'],
  ['avaliacao', 'Agendar avaliação gratuita', 'Primeira consulta ou avaliação gratuita', 'calendario'],
  ['orcamento', 'Solicitar orçamento', 'Pedido de orçamento: serviços, obras, projetos', 'doc'],
  ['especialista', 'Falar com um especialista', 'Conversa consultiva: empresas e serviços complexos', 'whats'],
  ['reservar', 'Reservar mesa', 'Reserva de mesa em restaurante ou bar', 'calendario'],
  ['aula', 'Agendar aula experimental', 'Aula experimental grátis: escolas, academias, estúdios', 'calendario'],
  ['visitar', 'Como chegar', 'Visita à loja ou ao espaço físico', 'pin'],
  ['seguir', 'Seguir no Instagram', 'Seguir a marca nas redes sociais', 'insta'],
  ['material', 'Baixar material gratuito', 'Material gratuito em troca do contato', 'doc'],
  ['cardapio', 'Ver o cardápio', 'Ver o cardápio ou o catálogo completo', 'doc'],
].map(([id, rotulo, jev, ic]) => ({ id, rotulo, texto: rotulo, jev: `“${rotulo}” — ${jev}`, ic }));

export const ESTILOS_IMG = [
  ['flat', 'Flat colorido', 'Ilustração flat colorida, formas simples e sólidas'],
  ['linha', 'Traço fino', 'Traço fino e elegante (line art), minimalista e sofisticado'],
  ['vidro', 'Vidro e brilho', 'Gradientes, brilho e vidro fosco: tecnológico e moderno'],
  ['geometrico', 'Geométrico', 'Blocos geométricos de cor, estilo Bauhaus: marcante e organizado'],
  ['retro', 'Retrô', 'Retrô: raios de sol, retícula de pontos e selos vintage, rock e nostalgia'],
  ['organico', 'Orgânico', 'Orgânico: folhas, curvas suaves e manchas, natural e calmo'],
  ['adesivo', 'Adesivos', 'Adesivos e rabiscos divertidos espalhados: lúdico e jovem'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const DENSIDADE = [
  'Muito respiro, pouquíssima informação, minimalista',
  'Arejado, só o essencial',
  'Equilibrado',
  'Bastante informação e seções',
  'Denso, cheio de ofertas e detalhes, estilo varejo',
];
export const DENSIDADE_ROT = ['mínimo', 'arejado', 'equilibrado', 'completo', 'denso'];

export const BOTOES = [
  ['pilula', 'Pílula', 'Pílula totalmente arredondada: amigável e moderno'],
  ['suave', 'Cantos suaves', 'Cantos levemente arredondados: profissional e neutro'],
  ['reto', 'Reto', 'Cantos retos: sério, editorial, sofisticado'],
  ['contorno', 'Contorno', 'Só o contorno, discreto e elegante'],
  ['bloco', 'Bloco com sombra', 'Bloco com sombra dura deslocada: retrô, brutalista, ousado'],
  ['gradiente', 'Gradiente', 'Degradê brilhante: tecnológico e chamativo'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CANTOS = [
  ['retos', 'Retos', 'Cantos retos, blocos quadrados: sério, editorial, arquitetônico'],
  ['suaves', 'Suaves', 'Cantos levemente arredondados: equilibrado e profissional'],
  ['redondos', 'Bem redondos', 'Cantos bem arredondados: amigável, fofo, divertido'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const TEXTURAS = [
  ['nenhuma', 'Lisa', 'Fundo liso, limpo'],
  ['grao', 'Granulado', 'Granulado de papel ou filme: artesanal, vintage, autoral'],
  ['pontos', 'Pontilhado', 'Pontilhado sutil: moderno, gráfico'],
  ['linhas', 'Linhas finas', 'Linhas finas de grade: técnico, arquitetônico, organizado'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const SECOES = [
  ['cardapio', 'Cardápio / catálogo', 'um cardápio ou catálogo de produtos com preços (comida, loja, produtos)'],
  ['servicos', 'Serviços', 'uma lista de serviços ou tratamentos oferecidos'],
  ['planos', 'Planos e pacotes', 'planos, pacotes ou mensalidades com preços lado a lado'],
  ['como_funciona', 'Como funciona', 'um passo a passo de como funciona o atendimento, em 3 etapas'],
  ['agendamento', 'Agenda online', 'uma agenda online com horários disponíveis para marcar'],
  ['delivery', 'Delivery', 'uma seção de delivery: área de entrega, tempo e formas de pedir'],
  ['depoimentos', 'Depoimentos', 'depoimentos de clientes'],
  ['antes_depois', 'Antes e depois', 'um antes e depois de transformação visível (estética, cabelo, reforma, carro)'],
  ['equipe', 'Equipe', 'a apresentação da equipe ou dos profissionais'],
  ['sobre', 'Nossa história', 'a história da marca / sobre nós'],
  ['galeria', 'Galeria', 'uma galeria de fotos do ambiente, dos produtos ou de trabalhos feitos'],
  ['numeros', 'Números', 'números e conquistas (clientes atendidos, anos, avaliação)'],
  ['clientes', 'Logos de clientes', 'logos de empresas clientes (prova social B2B)'],
  ['faq', 'Perguntas frequentes', 'perguntas frequentes'],
  ['localizacao', 'Endereço e mapa', 'endereço, mapa e horário de funcionamento de um local físico'],
  ['lead', 'Captura de contato', 'um formulário para deixar o contato em troca de cupom ou material gratuito'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const SELOS = [
  ['nota', 'Nota ⭐', 'a nota de avaliação dos clientes (estrelas)'],
  ['prazo', 'Prazo', 'a rapidez: tempo de entrega ou de atendimento'],
  ['tradicao', 'Tempo de casa', 'há quanto tempo o negócio existe (“desde…”)'],
  ['garantia', 'Garantia', 'uma garantia ou selo de segurança'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

// ------------------------------------------------------------------ marca
// Paletas: bg (fundo), surf (superfície), ink (texto), muted, pri, sec, acc.
export const PALETAS = [
  ['rock', 'Rock noturno', 'Preto, vermelho e branco com cara de rock: atitude, noite, show', { bg: '#0f0f10', surf: '#1b1b1d', ink: '#f4efe6', muted: '#a39e96', pri: '#e0271b', sec: '#f4efe6', acc: '#f2b705' }],
  ['terra', 'Terracota e mostarda', 'Terrosos quentes (terracota, mostarda, creme): rústico e artesanal', { bg: '#f7efe3', surf: '#efe1cd', ink: '#3a2718', muted: '#7a6352', pri: '#c4552b', sec: '#d9a11b', acc: '#6b3f24' }],
  ['italiano', 'Cantina italiana', 'Vermelho-tomate, verde-manjericão e creme: cantina italiana, pizza, massas, tradição', { bg: '#fbf6ec', surf: '#f2e7d3', ink: '#2b1d14', muted: '#75655a', pri: '#c8321f', sec: '#2f7d4a', acc: '#e9b949' }],
  ['nude', 'Nude e dourado', 'Nude, rosé e dourado: delicado, feminino e premium (beleza, estética)', { bg: '#fbf5f2', surf: '#f3e5de', ink: '#3b2b2a', muted: '#8a7470', pri: '#b8895a', sec: '#e7c9bd', acc: '#7a4f48' }],
  ['luxo', 'Preto e dourado', 'Preto e dourado: luxo, exclusivo, noturno e sofisticado', { bg: '#0c0b0a', surf: '#181613', ink: '#f3ede2', muted: '#a39a8c', pri: '#c9a55c', sec: '#8f7444', acc: '#efe2c4' }],
  ['vinho', 'Vinho e creme', 'Vinho, creme e dourado discreto: elegante, gastronomia, vinhos, casal', { bg: '#f7f0e8', surf: '#efe2d4', ink: '#2c1a1e', muted: '#7c6668', pri: '#6e1c2e', sec: '#c29d5f', acc: '#a8485a' }],
  ['salvia', 'Sálvia e madeira', 'Verde-sálvia, creme e madeira: natural, calmo, orgânico, bem-estar', { bg: '#f3f1e7', surf: '#e5e5d4', ink: '#273327', muted: '#66705f', pri: '#6f8a63', sec: '#c7b08b', acc: '#3f5a3a' }],
  ['menta', 'Menta fresca', 'Verde-menta, branco e toque de coral: fresco, leve, saudável, nutrição', { bg: '#f5fdf9', surf: '#dff5ea', ink: '#11382c', muted: '#50705f', pri: '#13a574', sec: '#ff8f70', acc: '#9ae3c3' }],
  ['tropical', 'Tropical', 'Verde-folha, laranja e rosa: tropical, brasileiro, vibrante, praia e açaí', { bg: '#fff9ef', surf: '#fdebd3', ink: '#173029', muted: '#5b6d66', pri: '#0e8a5f', sec: '#ff8a3d', acc: '#ff5c8a' }],
  ['cafe', 'Café e caramelo', 'Marrom-café, creme e caramelo: aconchegante, cafeteria, padaria', { bg: '#f6eee3', surf: '#ecdecb', ink: '#3b2620', muted: '#7d665a', pri: '#6f4a35', sec: '#d49a5c', acc: '#9c6b3f' }],
  ['pastel', 'Pastel doce', 'Tons pastel (lilás, pêssego, menta): suave, doce, confeitaria, delicado', { bg: '#fdf8fb', surf: '#f4e8f3', ink: '#4a3a52', muted: '#8c7c93', pri: '#9a6bd6', sec: '#ffcfb3', acc: '#8fd6b6' }],
  ['candy', 'Cores de brinquedo', 'Cores vivas e alegres (rosa, amarelo, azul): infantil, divertido, lúdico', { bg: '#fffaf0', surf: '#fff0cf', ink: '#2b2d42', muted: '#6b6f86', pri: '#ff4f8b', sec: '#ffc83d', acc: '#36b8f0' }],
  ['clinico', 'Azul clínico', 'Azul-claro e branco: limpo, higiênico, saúde, odontologia, clínica', { bg: '#f7fbff', surf: '#e6f1fc', ink: '#0b2540', muted: '#54708e', pri: '#2477d6', sec: '#7fd0f5', acc: '#19b39a' }],
  ['lavanda', 'Lavanda calma', 'Lavanda e cinza-azulado: calma, acolhimento, terapia, psicologia', { bg: '#f8f7fc', surf: '#eceaf7', ink: '#2c2944', muted: '#6d6a86', pri: '#6c5fc7', sec: '#b8b0ea', acc: '#e7a3b8' }],
  ['corporativo', 'Azul corporativo', 'Azul-marinho, branco e azul-claro: confiança, corporativo, B2B, finanças', { bg: '#ffffff', surf: '#eff4fb', ink: '#0f1f3a', muted: '#5b6b85', pri: '#1d3b8b', sec: '#0ea5e9', acc: '#f5b301' }],
  ['noite', 'Azul-noite e ouro', 'Azul-noite com dourado: sóbrio, premium, advocacia, finanças, consultoria', { bg: '#0c1726', surf: '#14243b', ink: '#eef2f7', muted: '#9aa8bb', pri: '#c9a66b', sec: '#2c4a70', acc: '#e8d5ae' }],
  ['floresta', 'Verde clássico', 'Verde-escuro e marfim: tradicional, sóbrio, confiável, clássico', { bg: '#f7f5ee', surf: '#ebe8dc', ink: '#1e2b24', muted: '#5e6b63', pri: '#1f4d3a', sec: '#b89b5e', acc: '#7a9a7e' }],
  ['neon', 'Grafite neon', 'Grafite escuro com verde-neon: tecnologia, inovação, games, futurista', { bg: '#0b0f14', surf: '#141b24', ink: '#e8f0f5', muted: '#8b9bab', pri: '#3bf08a', sec: '#22d3ee', acc: '#a78bfa' }],
  ['criativo', 'Roxo criativo', 'Roxo vibrante e amarelo: criativo, jovem, agência, marketing digital', { bg: '#faf7ff', surf: '#efe7ff', ink: '#1d1033', muted: '#625a78', pri: '#6d28d9', sec: '#fbbf24', acc: '#ec4899' }],
  ['coral', 'Petróleo e coral', 'Azul-petróleo com coral: moderno, criativo, saúde moderna, jovem', { bg: '#f5fafa', surf: '#e1efef', ink: '#0f2e33', muted: '#52696c', pri: '#0f5f68', sec: '#ff7a59', acc: '#f4c95d' }],
  ['energia', 'Laranja energia', 'Laranja vibrante e preto: energia, esporte, intensidade, academia', { bg: '#101010', surf: '#1c1c1c', ink: '#fafafa', muted: '#a3a3a3', pri: '#ff6b13', sec: '#ffd23f', acc: '#ff9a4d' }],
  ['amarelo', 'Amarelo e preto', 'Amarelo forte e preto: chamativo, popular, promoções, obras, oficina', { bg: '#fffdf3', surf: '#fff2bf', ink: '#141414', muted: '#5a5a4a', pri: '#ffcc00', sec: '#141414', acc: '#e8491d' }],
  ['pink', 'Pink noturno', 'Pink e preto: ousado, moda, beleza jovem, noite', { bg: '#0e0a0d', surf: '#1c1219', ink: '#fbeef5', muted: '#b394a6', pri: '#ff2e88', sec: '#ffd1e6', acc: '#9b5cff' }],
  ['mediterraneo', 'Mediterrâneo', 'Azul-cobalto, branco e amarelo-limão: fresco, verão, praia, pousada', { bg: '#fbfbf7', surf: '#e9effb', ink: '#13233f', muted: '#56627a', pri: '#1f4fd1', sec: '#f5d547', acc: '#37a3d9' }],
  ['retro', 'Retrô anos 70', 'Laranja queimado, mostarda e marrom: retrô anos 70, vintage, descolado', { bg: '#f4e9d3', surf: '#eadab9', ink: '#3a2616', muted: '#7a634b', pri: '#cf5a1e', sec: '#e3a72f', acc: '#7a3e12' }],
  ['mono', 'Preto e branco', 'Preto e branco minimalista: moderno, arquitetura, fotografia, moda conceitual', { bg: '#ffffff', surf: '#f1f1f1', ink: '#111111', muted: '#6b6b6b', pri: '#111111', sec: '#bdbdbd', acc: '#8a8a8a' }],
].map(([id, rotulo, jev, c]) => ({ id, rotulo, jev: `${rotulo}: ${jev}`, c }));

// Pares de fontes. Pilhas de sistema + 20 famílias livres embutidas (public/fonts/, declaradas em fontFaceCSS).
export const FONTES = [
  // fontes próprias do estúdio (OFL, em /fonts): o visual é o mesmo em qualquer computador ou celular
  ['didone', 'Didone de revista', 'Serifa didone de alto contraste, tipo revista de moda + sans fina: luxo, sofisticação, estética premium, casamento',
    { disp: '"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif', dw: 500, body: 'Jost, "Avenir Next", "Segoe UI", sans-serif', logo: '"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif', lw: 500, tr: '0', lt: '0.06em', caixa: false, nome: 'Bodoni Moda + Jost', emb: ['bodoni', 'jost'] }],
  ['editorial', 'Serifa editorial', 'Serifa editorial moderna com itálico charmoso + sans limpa: elegante e contemporâneo, cozinha autoral, arquitetura',
    { disp: '"Instrument Serif", "Iowan Old Style", Georgia, serif', dw: 400, body: 'Outfit, "Avenir Next", "Segoe UI", sans-serif', logo: '"Instrument Serif", "Iowan Old Style", Georgia, serif', lw: 400, tr: '-0.01em', lt: '0.01em', caixa: false, nome: 'Instrument Serif + Outfit', emb: ['instrument', 'outfit'], ital: true }],
  ['poster', 'Pôster condensado', 'Condensada pesada em caixa alta, estilo pôster de show: rock, esporte, energia, promoções',
    { disp: 'Anton, Impact, "Arial Narrow Bold", sans-serif', dw: 400, body: 'Archivo, "Helvetica Neue", Arial, sans-serif', logo: 'Anton, Impact, "Arial Narrow Bold", sans-serif', lw: 400, tr: '0.01em', lt: '0.04em', caixa: true, nome: 'Anton + Archivo', emb: ['anton', 'archivo'] }],
  ['geometrica', 'Geométrica moderna', 'Geométrica moderna e limpa: tecnologia, startups, arquitetura, marcas contemporâneas',
    { disp: 'Outfit, Futura, "Century Gothic", sans-serif', dw: 700, body: 'Outfit, "Avenir Next", "Segoe UI", sans-serif', logo: 'Outfit, Futura, "Century Gothic", sans-serif', lw: 700, tr: '-0.02em', lt: '0.02em', caixa: false, nome: 'Outfit', emb: ['outfit'] }],
  ['tecnica', 'Grotesca técnica', 'Grotesca técnica com detalhes monoespaçados: tecnologia, dados, software, agências digitais',
    { disp: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif', dw: 700, body: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif', logo: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif', lw: 700, tr: '-0.02em', lt: '0', caixa: false, nome: 'Space Grotesk + Space Mono', emb: ['space', 'spacemono'], mono: true }],
  ['humanista', 'Humanista acolhedora', 'Humanista suave e acolhedora: saúde, clínicas, psicologia, educação, famílias',
    { disp: 'Figtree, "Avenir Next", "Segoe UI", sans-serif', dw: 700, body: 'Figtree, "Avenir Next", "Segoe UI", sans-serif', logo: 'Figtree, "Avenir Next", "Segoe UI", sans-serif', lw: 700, tr: '-0.01em', lt: '0.02em', caixa: false, nome: 'Figtree', emb: ['figtree'] }],
  ['arredondada', 'Arredondada fofa', 'Arredondada e fofa, com cara de brinquedo: infantil, pet, doces, divertido',
    { disp: 'Nunito, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif', dw: 800, body: 'Nunito, "Segoe UI", "Trebuchet MS", sans-serif', logo: 'Nunito, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif', lw: 900, tr: '-0.01em', lt: '0.01em', caixa: false, nome: 'Nunito', emb: ['nunito'] }],
  ['script', 'Cursiva artesanal', 'Letra cursiva feita à mão + serifa calorosa: confeitaria, café, artesanal, afetivo, romântico',
    { disp: 'Fraunces, "Iowan Old Style", Georgia, serif', dw: 700, body: 'Jost, "Avenir Next", "Segoe UI", sans-serif', logo: '"Dancing Script", SignPainter, "Snell Roundhand", cursive', lw: 700, tr: '0', lt: '0', caixa: false, nome: 'Dancing Script + Fraunces', emb: ['dancing', 'fraunces', 'jost'], scriptLogo: true }],
  ['slab', 'Slab de letreiro', 'Slab serif robusta de letreiro: oficina, construção, cervejaria, churrasco, rústico',
    { disp: '"Zilla Slab", Rockwell, "Roboto Slab", serif', dw: 700, body: 'Figtree, "Segoe UI", sans-serif', logo: '"Zilla Slab", Rockwell, "Roboto Slab", serif', lw: 700, tr: '0', lt: '0.03em', caixa: false, nome: 'Zilla Slab + Figtree', emb: ['zilla', 'figtree'] }],
  ['vintage', 'Letreiro vintage', 'Letreiro vintage em versalete largo + máquina de escrever: barbearia clássica, tradição, retrô',
    { disp: 'Cinzel, Copperplate, Georgia, serif', dw: 700, body: '"Courier Prime", "Courier New", monospace', logo: 'Cinzel, Copperplate, Georgia, serif', lw: 700, tr: '0.04em', lt: '0.1em', caixa: true, nome: 'Cinzel + Courier Prime', emb: ['cinzel', 'courier'], typewriter: true }],
  ['classica', 'Serifa clássica', 'Serifa clássica de livro: tradição, confiança, advocacia, contabilidade, consultórios',
    { disp: '"Crimson Pro", "Iowan Old Style", Georgia, serif', dw: 700, body: '"Crimson Pro", Charter, Georgia, serif', logo: '"Crimson Pro", "Iowan Old Style", Georgia, serif', lw: 700, tr: '-0.005em', lt: '0.04em', caixa: false, nome: 'Crimson Pro', emb: ['crimson'] }],
  ['spa', 'Sensorial leve', 'Sans de contraste suave, leve e sensorial: spa, cosméticos naturais, bem-estar, yoga',
    { disp: 'Marcellus, Optima, Candara, serif', dw: 400, body: 'Jost, Optima, "Segoe UI", sans-serif', logo: 'Marcellus, Optima, Candara, serif', lw: 400, tr: '0.01em', lt: '0.12em', caixa: true, nome: 'Marcellus + Jost', emb: ['marcellus', 'jost'] }],
  ['grotesca', 'Grotesca suíça', 'Grotesca neutra estilo suíço, forte e direta: corporativo, consultoria, B2B, imobiliária',
    { disp: 'Archivo, "Helvetica Neue", Arial, sans-serif', dw: 800, body: 'Archivo, "Helvetica Neue", Arial, sans-serif', logo: 'Archivo, "Helvetica Neue", Arial, sans-serif', lw: 800, tr: '-0.035em', lt: '-0.01em', caixa: false, nome: 'Archivo', emb: ['archivo'] }],
  ['brutalista', 'Mono brutalista', 'Monoespaçada crua estilo brutalista, com grade aparente: estúdio criativo, moda urbana, galeria, tecnologia com atitude',
    { disp: '"Space Mono", "Courier New", monospace', dw: 700, body: 'Archivo, "Helvetica Neue", Arial, sans-serif', logo: '"Space Mono", "Courier New", monospace', lw: 700, tr: '-0.02em', lt: '0.02em', caixa: true, nome: 'Space Mono + Archivo', emb: ['spacemono', 'archivo'], mono: true }],
  ['retro', 'Retrô anos 70', 'Display retrô arredondada, cara de letreiro anos 70: lanchonete, sorveteria, surf, games, diversão nostálgica',
    { disp: 'Righteous, "Arial Rounded MT Bold", sans-serif', dw: 400, body: 'Figtree, "Segoe UI", sans-serif', logo: 'Righteous, "Arial Rounded MT Bold", sans-serif', lw: 400, tr: '0', lt: '0.02em', caixa: false, nome: 'Righteous + Figtree', emb: ['righteous', 'figtree'] }],
  ['artistica', 'Expressiva artística', 'Sans expressiva, larga e ousada: estúdio de design, arquitetura autoral, moda conceitual, galeria, marca jovem e artística',
    { disp: 'Syne, "Helvetica Neue", Arial, sans-serif', dw: 800, body: 'Jost, "Segoe UI", sans-serif', logo: 'Syne, "Helvetica Neue", Arial, sans-serif', lw: 800, tr: '-0.02em', lt: '0', caixa: false, nome: 'Syne + Jost', emb: ['syne', 'jost'] }],
  ['manuscrita', 'Letra de mão casual', 'Letra de mão casual, cara de bilhete: café de bairro, papelaria, aulas particulares, marca afetiva e descontraída',
    { disp: 'Caveat, "Segoe Print", cursive', dw: 700, body: 'Nunito, "Segoe UI", sans-serif', logo: 'Caveat, "Segoe Print", cursive', lw: 700, tr: '0', lt: '0', caixa: false, nome: 'Caveat + Nunito', emb: ['caveat', 'nunito'], scriptLogo: true }],
].map(([id, rotulo, jev, f]) => ({ id, rotulo, jev: `${rotulo}: ${jev}`, f }));

export const FORMAS = [
  ['circulo', 'Círculo', 'Círculo cheio: simpático, universal'],
  ['quadrado', 'Quadrado arredondado', 'Quadrado de cantos arredondados, estilo ícone de app: moderno, digital'],
  ['hexagono', 'Hexágono', 'Hexágono: técnico, estruturado, engenharia, colmeia'],
  ['escudo', 'Escudo', 'Escudo ou brasão: tradição, proteção, clube, barbearia clássica'],
  ['selo', 'Selo circular', 'Selo circular de anel duplo, estilo carimbo: artesanal, vintage, cervejaria, café'],
  ['folha', 'Forma orgânica', 'Forma orgânica de folha ou gota: natural, suave, bem-estar'],
  ['nenhuma', 'Sem moldura', 'Sem moldura: só o ícone solto, minimalista'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const DISPOSICOES = [
  ['horizontal', 'Horizontal', 'Símbolo à esquerda e nome ao lado: clássico e versátil'],
  ['empilhado', 'Empilhado', 'Símbolo em cima e nome embaixo, centralizados: equilibrado, institucional'],
  ['emblema', 'Emblema', 'Emblema circular com o nome escrito em volta: vintage, artesanal, clube'],
  ['monograma', 'Monograma', 'Monograma com as iniciais dentro da forma + nome ao lado: elegante, pessoal, profissional liberal'],
  ['assinatura', 'Assinatura', 'Nome grande como assinatura, com o símbolo pequeno de destaque: marca moderna ou autoral'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const ESTILOS_LOGO = [
  ['classico', 'Clássico', 'Clássico: símbolo numa moldura simples com o nome ao lado; use só quando nenhum dos outros estilos combina claramente com a personalidade da marca'],
  ['palavra', 'Só o nome', 'Só o nome (logotipo tipográfico) grande e elegante, com um ponto de cor: minimalista, editorial, premium, moderno'],
  ['bloco', 'Bloco sólido', 'Bloco sólido de cor com o símbolo vazado e o nome forte ao lado: direto, moderno, delivery, varejo, serviços'],
  ['carimbo', 'Carimbo artesanal', 'Carimbo ou selo circular com textura de tinta gasta, nome em arco e estrelinhas: artesanal, vintage, cervejaria, café, barbearia, rock'],
  ['monograma', 'Monograma de luxo', 'Monograma de luxo: iniciais dentro de um losango fino e o nome bem espaçado embaixo: sofisticado, joalheria, moda, clínica premium, advocacia'],
  ['bauhaus', 'Geométrico Bauhaus', 'Composição geométrica de círculo, quarto de círculo e quadrado coloridos, estilo Bauhaus: criativo, arquitetura, escola de arte, ousado'],
  ['poster', 'Pôster empilhado', 'Nome empilhado em letras enormes, estilo pôster, com faixa de cor e selo redondo: energia, rock, esporte, academia, eventos'],
  ['manuscrito', 'Manuscrito', 'Nome escrito à mão em letra cursiva com sublinhado de pincel: confeitaria, café, artesanal, afetivo, romântico'],
  ['app', 'Ícone de app', 'Ícone de aplicativo com gradiente e o nome limpo ao lado: tecnologia, startup, app, fintech, digital'],
  ['organico', 'Orgânico', 'Forma orgânica de folha ou mancha com o símbolo e o nome suave: natural, bem-estar, plantas, orgânicos, spa'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CAIXAS = [
  ['alta', 'CAIXA ALTA', 'Nome em CAIXA ALTA espaçada: forte, clássico, imponente'],
  ['titulo', 'Iniciais maiúsculas', 'Nome com Iniciais Maiúsculas: equilibrado e natural'],
  ['baixa', 'minúsculas', 'nome em minúsculas: moderno, leve, descontraído'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const SLOGANS = [
  ['memoria', 'Sabor que vira memória.', 'Comida memorável e afetiva'],
  ['alma', 'Feito com alma.', 'Artesanal e autêntico'],
  ['seu_dia', 'Do nosso jeito, pro seu dia.', 'Descontraído e próximo'],
  ['qualidade', 'Qualidade que se sente.', 'Qualidade e capricho'],
  ['cuidado', 'Cuidado que transforma.', 'Saúde, beleza e bem-estar'],
  ['simples', 'Simples assim.', 'Moderno, prático, minimalista'],
  ['paixao', 'Paixão em cada detalhe.', 'Dedicação e capricho'],
  ['confianca', 'Confiança que gera resultado.', 'Serviços profissionais e empresas'],
  ['crescer', 'Inteligência que faz crescer.', 'Consultoria, tecnologia, B2B'],
  ['bem_estar', 'Bem-estar de verdade.', 'Saúde, bem-estar, calma'],
  ['tradicao', 'Tradição e sabor desde sempre.', 'Tradicional, com história'],
  ['volume', 'Alto volume, alto sabor.', 'Rock, atitude, comida marcante'],
  ['arte', 'Arte, técnica e cuidado.', 'Trabalho autoral e técnico'],
  ['sua_casa', 'Aqui é a sua casa.', 'Acolhedor, familiar'],
  ['merece', 'Porque você merece o melhor.', 'Premium e atencioso'],
  ['energia', 'Energia que move você.', 'Esporte, energia, disposição'],
  ['beleza', 'Beleza que é sua.', 'Beleza, autoestima'],
  ['aventura', 'Aprender é uma aventura.', 'Educação, crianças'],
  ['durar', 'Feito para durar.', 'Obras, oficina, produtos duráveis'],
  ['gostoso', 'Rápido, fácil e gostoso.', 'Delivery, praticidade, comida'],
  ['precisao', 'Precisão em cada detalhe.', 'Técnico, saúde, engenharia'],
  ['parceria', 'Mais que um serviço, uma parceria.', 'Relacionamento com empresas'],
  ['natural', 'Natural como deve ser.', 'Natural, orgânico, saudável'],
  ['classico', 'Clássico nunca sai de moda.', 'Clássico, elegante, atemporal'],
  ['momentos', 'Pequenos detalhes, grandes momentos.', 'Delicado, festas, ocasiões especiais'],
  ['lar', 'Onde você se sente em casa.', 'Hospedagem, imóveis, acolhimento'],
].map(([id, texto, jev]) => ({ id, rotulo: texto, texto, jev: `“${texto}” — ${jev}` }));

// ------------------------------------------------------------------ carrosséis do Instagram (3 carrosséis, 6 lâminas cada)
// Cada carrossel tem um papel (atrair, vender, relacionar). O Jev escolhe o formato, a capa (gancho), o diferencial,
// as cores, o item, a legenda e a chamada de cada um; e UM estilo visual para a série inteira (o feed fica coeso).
export const PAPEIS_POST = [
  { n: 1, id: 'atrair', rotulo: 'apresentação', jev: 'carrossel de apresentação, para atrair novos seguidores', fmts: ['manifesto', 'motivos', 'apresentacao', 'historia'] },
  { n: 2, id: 'vender', rotulo: 'venda', jev: 'carrossel de venda, para gerar pedidos, agendamentos ou orçamentos', fmts: ['vitrine', 'oferta', 'passo_a_passo', 'comparativo'] },
  { n: 3, id: 'relacionar', rotulo: 'relacionamento', jev: 'carrossel de relacionamento, para criar confiança, engajamento e salvamentos', fmts: ['perguntas', 'depoimentos', 'bastidores', 'antes_depois', 'dica'] },
];

export const FORMATOS = Object.fromEntries([
  ['manifesto', 'Manifesto', 'Manifesto da marca: uma frase forte por lâmina, contando no que a marca acredita'],
  ['motivos', 'Motivos', 'Motivos para escolher a marca, um por lâmina, com número grande e prova no fim'],
  ['apresentacao', 'Apresentação', 'Apresentação completa: quem somos, o que fazemos, como funciona e números'],
  ['historia', 'Nossa história', 'A história da marca em linha do tempo: como começou, bastidores, equipe e hoje'],
  ['vitrine', 'Vitrine', 'Vitrine de produtos ou serviços: um por lâmina, com descrição e preço'],
  ['oferta', 'Oferta', 'Oferta com urgência: a promoção, o que está incluído, como aproveitar e o prazo'],
  ['passo_a_passo', 'Passo a passo', 'Como comprar, pedir ou agendar em 3 passos simples, com a chamada no fim'],
  ['comparativo', 'Comparativo', 'O jeito comum × o nosso jeito, lado a lado, lâmina por lâmina'],
  ['perguntas', 'Perguntas frequentes', 'Perguntas frequentes respondidas, uma por lâmina: tira dúvidas e objeções'],
  ['depoimentos', 'Depoimentos', 'Depoimentos de clientes com estrelas e nota média: prova social'],
  ['bastidores', 'Bastidores', 'Bastidores: um dia na rotina, o processo e a equipe que faz acontecer'],
  ['antes_depois', 'Antes e depois', 'Antes e depois da transformação, com o resultado e um depoimento'],
  ['dica', 'Dica para salvar', 'Conteúdo educativo para salvar: uma dica explicada em partes'],
].map(([id, rotulo, jev]) => [id, { id, rotulo, jev }]));

export const ESTILOS_CAR = [
  ['editorial', 'Editorial de revista', 'Editorial de revista: serifa grande, fios finos, numeração elegante e muito respiro'],
  ['impacto', 'Pôster de impacto', 'Pôster de impacto: tipografia gigante, cor chapada, contraste forte e cortes ousados'],
  ['minimal', 'Minimalista suíço', 'Minimalista suíço: grade rígida, alinhado à esquerda, sem enfeites, só tipografia e cor'],
  ['colagem', 'Colagem divertida', 'Colagem divertida: adesivos, formas recortadas, setas desenhadas à mão e leve rotação'],
  ['luxo', 'Luxo discreto', 'Luxo discreto: fundo profundo ou creme, detalhes finos em dourado, letras bem espaçadas'],
  ['tech', 'Dados e precisão', 'Dados e precisão: grade técnica, números grandes, gráficos e ícones de linha'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

// Capas (ganchos) com lacunas. {x} = lacuna; {em_cidade} some quando não há cidade.
export const GANCHOS = [
  // papel 1 — atrair
  ['chegou', 1, '{nome} chegou{em_cidade}!', 'Anuncia a chegada ou inauguração, com empolgação', ['apresentacao']],
  ['prazer', 1, 'Muito prazer: {nome}.', 'Apresentação simpática e direta da marca', ['apresentacao', 'manifesto']],
  ['conheca', 1, 'Conheça {nome} em 6 lâminas', 'Convite para conhecer a marca inteira', ['apresentacao', 'historia']],
  ['nao_e_so', 1, 'Não é só {produto}. É experiência.', 'Contraste provocativo: vai além do produto', ['manifesto']],
  ['compromisso', 1, 'Nosso compromisso: {ang}.', 'Manifesto e compromisso da marca', ['manifesto']],
  ['acreditamos', 1, 'No que a gente acredita', 'Manifesto: valores da marca, um por lâmina', ['manifesto']],
  ['segredo', 1, 'O segredo? {Ang}.', 'Revela o diferencial e gera curiosidade', ['manifesto', 'historia']],
  ['motivos', 1, '3 motivos para escolher {nome}', 'Lista de motivos, informativo e direto', ['motivos']],
  ['por_que', 1, 'Por que tanta gente volta?', 'Curiosidade: explica o que faz o cliente voltar', ['motivos', 'manifesto']],
  ['comecou', 1, 'Como tudo começou', 'Storytelling: a origem da marca', ['historia']],
  ['por_tras', 1, 'Por trás de cada detalhe', 'Mostra bastidores e processo', ['historia']],
  ['feito_para', 1, 'Feito {para_publico}.', 'Fala direto com o público-alvo', ['manifesto', 'motivos']],
  ['diferente', 1, 'Aqui é diferente.', 'Posicionamento ousado e curto', ['manifesto', 'motivos']],
  // papel 2 — vender
  ['so_hoje', 2, 'Só hoje: {oferta_curta}!', 'Urgência: oferta que acaba hoje', ['oferta']],
  ['primeira', 2, 'Primeira vez? Ganhe {oferta_curta}', 'Oferta de boas-vindas para novos clientes', ['oferta']],
  ['ultima', 2, 'Última chamada: {oferta_curta}', 'Urgência forte, fim de promoção', ['oferta']],
  ['preco', 2, '{item} por {preco}', 'Destaca o preço de um produto', ['vitrine', 'oferta']],
  ['vontade', 2, 'Deu vontade? Arrasta pro lado.', 'Desejo e impulso: comida, delivery, produtos', ['vitrine']],
  ['completo', 2, 'Nosso {itens_lower}, lâmina por lâmina', 'Mostra o catálogo ou cardápio completo', ['vitrine']],
  ['vale', 2, 'Vale cada centavo: {item}', 'Custo-benefício de um item', ['vitrine']],
  ['agenda', 2, 'Agenda aberta para {mes}', 'Anuncia horários disponíveis para agendar', ['passo_a_passo', 'oferta']],
  ['vagas', 2, 'Últimas vagas da semana', 'Escassez de horários ou vagas', ['oferta', 'passo_a_passo']],
  ['como', 2, 'Como pedir em 3 passos', 'Explica o caminho da compra ou do agendamento', ['passo_a_passo']],
  ['orcamento', 2, 'Orçamento grátis em 24 horas', 'Convida a pedir orçamento: serviços e empresas', ['passo_a_passo', 'oferta']],
  ['minutos', 2, 'Seu pedido em minutos', 'Rapidez na entrega ou no atendimento', ['passo_a_passo', 'vitrine']],
  ['comum', 2, 'O comum × o jeito {nome}', 'Comparativo lado a lado com o jeito comum', ['comparativo']],
  ['ganha', 2, 'Tudo o que você ganha com {nome}', 'Benefícios em comparação, para convencer', ['comparativo', 'vitrine']],
  // papel 3 — relacionar
  ['dizem', 3, 'O que dizem sobre nós', 'Depoimento de cliente, prova social', ['depoimentos']],
  ['volta', 3, 'Quem conhece, volta.', 'Prova social curta e confiante', ['depoimentos']],
  ['obrigado', 3, '{num_v} {num_r}. Obrigado!', 'Gratidão com um número de conquista', ['depoimentos']],
  ['duvidas', 3, 'Suas dúvidas, respondidas', 'Perguntas frequentes, tira dúvidas', ['perguntas']],
  ['mito', 3, 'Mito ou verdade?', 'Quebra mitos do segmento, educativo', ['perguntas', 'dica']],
  ['sabia', 3, 'Você sabia?', 'Curiosidade educativa', ['dica', 'perguntas']],
  ['dica', 3, 'Dica rápida: {dica_t}', 'Conteúdo útil: uma dica prática', ['dica']],
  ['erro', 3, 'O erro que quase todo mundo comete', 'Alerta sobre um erro comum, educativo', ['dica']],
  ['salve', 3, 'Salve este post para depois', 'Conteúdo para salvar, muito útil', ['dica']],
  ['rotina', 3, 'Um dia na nossa rotina', 'Bastidores do dia a dia', ['bastidores']],
  ['equipe', 3, 'Quem faz acontecer', 'Apresenta a equipe e humaniza a marca', ['bastidores']],
  ['antes', 3, 'Antes e depois', 'Mostra a transformação', ['antes_depois']],
  ['transforma', 3, 'A diferença que um detalhe faz', 'Transformação com foco no detalhe', ['antes_depois', 'bastidores']],
].map(([id, papel, texto, jev, fmts]) => ({ id, papel, texto, rotulo: texto, jev, fmts }));

export const FUNDOS = [
  ['solido', 'Cor sólida', 'Cor da marca chapada, forte e direta'],
  ['gradiente', 'Degradê', 'Degradê entre as cores da marca, vibrante'],
  ['escuro', 'Escuro', 'Fundo escuro e dramático, com destaque em cor'],
  ['claro', 'Papel claro', 'Fundo claro de papel, editorial e limpo'],
  ['padrao', 'Padrão de ícones', 'Padrão repetido com o ícone da marca, divertido'],
  ['cena', 'Ilustração', 'Ilustração grande do produto ocupando o post'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const PAPEIS_ITEM = [
  ['carro_chefe', 'Carro-chefe', 'O produto ou serviço mais vendido, o carro-chefe', 0],
  ['premium', 'Premium', 'O produto ou serviço premium, mais sofisticado', 1],
  ['entrada', 'Mais acessível', 'O produto ou serviço mais acessível, de entrada', 2],
  ['novidade', 'Novidade', 'A novidade, o lançamento', 3],
].map(([id, rotulo, jev, i]) => ({ id, rotulo, jev, i }));

export const LEGENDAS = [
  ['curta', 'Curta e direta', 'Curta e direta, uma frase e a chamada'],
  ['historia', 'História', 'Conta uma pequena história da marca'],
  ['lista', 'Lista com emojis', 'Lista de benefícios com marcadores'],
  ['pergunta', 'Pergunta', 'Termina com uma pergunta para gerar comentários'],
  ['urgencia', 'Urgência', 'Urgência e oferta por tempo limitado'],
  ['educativa', 'Educativa', 'Educativa, ensina algo útil'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CTAS_POST = [
  ['bio', 'Link na bio', 'Link na bio', '🔗'],
  ['direct', 'Chama no direct', 'Chamar no direct', '💬'],
  ['whats', 'Peça pelo WhatsApp', 'Pedir ou falar pelo WhatsApp', '📲'],
  ['comenta', 'Comenta aqui', 'Comentar no post', '👇'],
  ['salva', 'Salva pra não esquecer', 'Salvar o post', '📌'],
  ['marca', 'Marca quem precisa ver', 'Marcar amigos', '👥'],
  ['agenda', 'Agende pelo link da bio', 'Agendar pelo link da bio', '📅'],
].map(([id, rotulo, jev, e]) => ({ id, rotulo, texto: rotulo, jev: `“${rotulo}” — ${jev}`, e }));

// ------------------------------------------------------------------ oferta e emojis (valem para tudo)
export const OFERTAS = [
  ['cupom10', 'Cupom de 10%', '10% de desconto na primeira compra', '10% OFF', '10% de desconto na primeira compra'],
  ['frete', 'Entrega grátis', 'Entrega grátis no primeiro pedido', 'entrega grátis', 'entrega grátis no primeiro pedido'],
  ['avaliacao', 'Avaliação gratuita', 'Primeira avaliação ou consulta gratuita', 'avaliação grátis', 'a primeira avaliação é por nossa conta'],
  ['aula', 'Aula grátis', 'Aula experimental grátis', 'aula grátis', 'uma aula experimental grátis'],
  ['diagnostico', 'Diagnóstico grátis', 'Diagnóstico ou conversa gratuita de 30 minutos', 'diagnóstico grátis', 'um diagnóstico gratuito de 30 minutos'],
  ['brinde', 'Brinde', 'Brinde ou mimo na primeira visita', 'brinde na 1ª visita', 'um mimo especial na primeira visita'],
  ['pacote', 'Desconto no pacote', 'Desconto ao fechar um pacote de sessões ou meses', '15% no pacote', '15% de desconto ao fechar um pacote'],
  ['sobremesa', 'Sobremesa grátis', 'Sobremesa ou bebida por conta da casa', 'sobremesa grátis', 'a sobremesa por nossa conta no primeiro pedido'],
  ['nenhuma', 'Sem oferta', 'Nenhuma oferta, só um bom atendimento', '', ''],
].map(([id, rotulo, jev, curta, frase]) => ({ id, rotulo, jev, curta, frase }));

export const EMOJIS = ['Nenhum emoji: sóbrio e formal', 'Poucos emojis, só um ou dois', 'Emojis moderados', 'Muitos emojis, bem descontraído'];
export const EMOJIS_ROT = ['nenhum', 'poucos', 'moderados', 'muitos'];


// ------------------------------------------------------------------ e-mail marketing: template master + assinatura
export const TIPOS_EMAIL = [
  ['boas_vindas', 'Boas-vindas', 'Boas-vindas para quem acabou de entrar na lista, com a oferta de primeira compra'],
  ['newsletter', 'Newsletter do mês', 'Newsletter mensal com novidades, destaques, dica e bastidores'],
  ['promocao', 'Promoção', 'E-mail de promoção: a oferta, os itens e o prazo, com urgência'],
  ['lancamento', 'Lançamento', 'Lançamento de um produto ou serviço novo, em primeira mão'],
  ['reengajamento', 'Reengajamento', 'Reengajamento: “sentimos sua falta”, para clientes que sumiram'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

// Assuntos com lacunas; tipos = onde fazem sentido (o Jev escolhe olhando o texto)
export const ASSUNTOS = [
  ['presente', '{nome}: seu presente de boas-vindas {e1:🎁}', ['boas_vindas'], 'Boas-vindas com presente, caloroso'],
  ['primeiro', 'Na primeira vez, você ganha {oferta_curta}', ['boas_vindas', 'promocao'], 'Oferta direta de primeira compra ou visita'],
  ['feliz', 'Que bom ter você por aqui {e1:💛}', ['boas_vindas'], 'Boas-vindas afetuosa, sem oferta'],
  ['mes', 'O que rolou em {mes} por aqui {e1:✨}', ['newsletter'], 'Newsletter leve e próxima'],
  ['bastidores', 'Bastidores, dica e novidades de {mes}', ['newsletter'], 'Newsletter completa e informativa'],
  ['dica', '{dica_t} (e mais novidades)', ['newsletter'], 'Newsletter puxada por conteúdo útil'],
  ['so_hoje', 'Só hoje: {oferta_curta} {e1:⏰}', ['promocao'], 'Promoção com urgência de um dia'],
  ['ultimas', 'Últimas horas para garantir {oferta_curta}', ['promocao', 'reengajamento'], 'Urgência forte, fim de promoção'],
  ['item', '{item0} por {preco0}. Só esta semana.', ['promocao'], 'Promoção de um item com preço'],
  ['chegou', 'Chegou: {item3} {e1:🚀}', ['lancamento'], 'Lançamento direto e empolgado'],
  ['primeira_mao', 'Em primeira mão para você: {item3}', ['lancamento'], 'Lançamento exclusivo para a lista'],
  ['saudade', 'Faz tempo que você não aparece {e1:🥺}', ['reengajamento'], 'Reengajamento carinhoso'],
  ['volta', 'Volta pra gente? Tem {oferta_curta} te esperando', ['reengajamento'], 'Reengajamento com oferta'],
].map(([id, texto, tipos, jev]) => ({ id, texto, rotulo: texto, tipos, jev: `“${texto}” — ${jev}` }));

export const CABECALHOS_EMAIL = [
  ['faixa', 'Faixa de cor', 'Logo centralizado numa faixa com a cor da marca: forte e reconhecível'],
  ['menu', 'Logo e menu', 'Logo à esquerda e links à direita, como um site: organizado, varejo'],
  ['central', 'Logo grande', 'Logo grande centralizado sobre fundo claro: elegante, editorial'],
  ['fino', 'Barra fina', 'Barra fina e discreta com o símbolo e o nome: minimalista, pessoal'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const HEROS_EMAIL = [
  ['ilustracao', 'Ilustração + título', 'Ilustração grande do produto com título e botão: vitrine calorosa'],
  ['tipografico', 'Título gigante', 'Só tipografia: um título enorme, uma frase e o botão: moderno e direto'],
  ['cupom', 'Cupom em destaque', 'Cupom recortado com o código e a oferta em destaque: promoção'],
  ['produto', 'Produto em cartão', 'Um produto em cartão, com descrição e preço: lançamento ou vitrine'],
  ['carta', 'Carta pessoal', 'Carta curta assinada por uma pessoa da equipe: próximo e humano'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const BLOCOS_EMAIL = [
  ['produtos', 'Grade de produtos', 'uma grade com produtos ou serviços e preços'],
  ['depoimento', 'Depoimento', 'um depoimento de cliente com estrelas'],
  ['passos', 'Como funciona', 'uma faixa com os 3 passos de como comprar, pedir ou agendar'],
  ['dica', 'Dica útil', 'um bloco de conteúdo com uma dica útil'],
  ['numeros', 'Números', 'uma faixa com números de prova (clientes, nota, prazo)'],
  ['prazo', 'Prazo da oferta', 'um aviso de prazo da oferta, com contagem regressiva'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CTAS_EMAIL = [
  ['pedido', 'Fazer meu pedido', 'Fazer um pedido ou compra'],
  ['agendar', 'Agendar meu horário', 'Agendar horário, consulta, aula ou visita'],
  ['desconto', 'Quero meu desconto', 'Resgatar a oferta ou o cupom'],
  ['catalogo', 'Ver {itens_lower}', 'Ver o cardápio, catálogo ou serviços'],
  ['conversar', 'Falar com a equipe', 'Conversar com a equipe, tirar dúvidas ou pedir orçamento'],
  ['conhecer', 'Conhecer as novidades', 'Conhecer as novidades ou o lançamento'],
].map(([id, texto, jev]) => ({ id, texto, rotulo: texto, jev: `“${texto}” — ${jev}` }));

export const ASSINATURAS = [
  ['classica', 'Clássica', 'Clássica: símbolo à esquerda, fio vertical e os dados à direita: profissional, versátil'],
  ['empilhada', 'Empilhada', 'Empilhada: logo em cima, nome e contatos embaixo, centralizados: marca em destaque'],
  ['banner', 'Com banner', 'Dados à esquerda e um banner promocional embaixo: varejo, promoções, eventos'],
  ['minimal', 'Minimalista', 'Minimalista: só texto, nome na cor da marca e contatos numa linha: discreta, premium'],
  ['cartao', 'Cartão', 'Cartão com fundo suave, borda e o monograma: acolhedora, criativa'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const BANNERS_ASS = [
  ['oferta', 'Oferta', 'a oferta de boas-vindas'],
  ['slogan', 'Slogan', 'o slogan da marca'],
  ['avaliacao', 'Avaliação', 'a nota e o número de clientes (prova social)'],
  ['agenda', 'Agenda aberta', 'um convite para agendar ou pedir'],
  ['nenhum', 'Sem banner', 'nenhum banner: só os dados'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev: `Banner da assinatura com ${jev}` }));

// ------------------------------------------------------------------ anúncios de display (kit de banners IAB)
export const CONCEITOS_AD = [
  ['oferta', 'Oferta', 'Oferta ou desconto de primeira compra'],
  ['produto', 'Produto em destaque', 'Um produto ou serviço em destaque, com preço'],
  ['marca', 'Marca', 'Lembrança de marca: slogan e personalidade'],
  ['prova', 'Prova social', 'Prova social: nota, clientes atendidos, depoimento'],
  ['urgencia', 'Urgência', 'Urgência: últimas vagas, só hoje, últimas horas'],
  ['local', 'Perto de você', 'Negócio local: perto de você, na sua cidade'],
  ['novidade', 'Novidade', 'Lançamento ou novidade'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const TITULOS_AD = [
  ['oferta1', 'Na primeira vez: {oferta_curta}', ['oferta'], 'Oferta clara de primeira compra ou visita'],
  ['oferta2', 'Ganhe {oferta_curta} hoje', ['oferta', 'urgencia'], 'Oferta com leve urgência'],
  ['produto1', '{item0} por {preco0}', ['produto'], 'Produto e preço, direto'],
  ['produto2', 'Deu vontade de {produto}?', ['produto', 'marca'], 'Desejo e impulso'],
  ['produto3', '{Ang}.', ['produto', 'marca'], 'O diferencial em uma frase'],
  ['marca1', '{slogan}', ['marca'], 'O slogan da marca'],
  ['marca2', 'Não é só {produto}. É experiência.', ['marca'], 'Contraste provocativo'],
  ['prova1', '{num_v} {num_r}', ['prova'], 'Número de conquista como prova'],
  ['prova2', 'Quem conhece, volta.', ['prova', 'marca'], 'Prova social curta'],
  ['urg1', 'Últimas vagas da semana', ['urgencia'], 'Escassez de vagas ou horários'],
  ['urg2', 'Só hoje: {oferta_curta}', ['urgencia', 'oferta'], 'Urgência de um dia'],
  ['local1', '{Cat} pertinho de você{em_cidade}', ['local'], 'Proximidade, negócio de bairro'],
  ['novo1', 'Novidade: {item3}', ['novidade'], 'Anuncia o lançamento'],
].map(([id, texto, conceitos, jev]) => ({ id, texto, rotulo: texto, conceitos, jev: `“${texto}” — ${jev}` }));

export const ESTILOS_AD = [
  ['produto', 'Produto em destaque', 'Ilustração grande do produto com sombra, preço em etiqueta: varejo, comida'],
  ['tipografico', 'Tipográfico', 'Só tipografia gigante e cor: moderno, ousado, serviços'],
  ['split', 'Dividido', 'Metade cor com o texto, metade ilustração: equilibrado, profissional'],
  ['cupom', 'Cupom', 'Cupom recortado com o código e a oferta: promoção'],
  ['premium', 'Premium escuro', 'Fundo profundo, brilho suave e detalhes finos: premium, noturno, luxo'],
  ['depoimento', 'Depoimento', 'Cartão de depoimento com estrelas e nota: confiança'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const CTAS_AD = [
  ['peca', 'Peça agora', 'Pedir agora (delivery, compra)'],
  ['agende', 'Agende já', 'Agendar horário ou visita'],
  ['compre', 'Compre agora', 'Comprar online'],
  ['desconto', 'Quero o desconto', 'Resgatar a oferta'],
  ['saiba', 'Saiba mais', 'Conhecer a marca ou o serviço'],
  ['fale', 'Fale com a gente', 'Conversar, pedir orçamento'],
  ['ver', 'Ver {itens_lower}', 'Ver cardápio, catálogo ou serviços'],
].map(([id, texto, jev]) => ({ id, texto, rotulo: texto, jev: `“${texto}” — ${jev}` }));

export const SELOS_AD = [
  ['frete', 'Entrega grátis', 'Selo de entrega grátis'],
  ['nota', 'Nota alta', 'Selo com a nota média dos clientes'],
  ['novo', 'Novo', 'Selo de novidade'],
  ['hoje', 'Só hoje', 'Selo de urgência “só hoje”'],
  ['garantia', 'Garantia', 'Selo de garantia ou satisfação'],
  ['nenhum', 'Sem selo', 'Nenhum selo'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

export const ANIMACOES_AD = [
  ['sequencia', 'Sequência de 3 quadros', 'Três quadros em sequência: gancho, produto ou oferta, chamada'],
  ['revelar', 'Revelar', 'O título se revela palavra por palavra e o produto entra em cena'],
  ['pulso', 'Botão pulsando', 'Peça estática com o botão pulsando de leve para chamar o clique'],
  ['estatico', 'Estático', 'Peça estática, sem animação: sóbrio'],
].map(([id, rotulo, jev]) => ({ id, rotulo, jev }));

// ------------------------------------------------------------------ cidades (extração LITERAL da fala)
export const CIDADES = [
  ['São Paulo', 'SP', 11, 'em'], ['Rio de Janeiro', 'RJ', 21, 'no'], ['Belo Horizonte', 'MG', 31, 'em'], ['Brasília', 'DF', 61, 'em'],
  ['Salvador', 'BA', 71, 'em'], ['Fortaleza', 'CE', 85, 'em'], ['Curitiba', 'PR', 41, 'em'], ['Manaus', 'AM', 92, 'em'],
  ['Recife', 'PE', 81, 'em'], ['Porto Alegre', 'RS', 51, 'em'], ['Belém', 'PA', 91, 'em'], ['Goiânia', 'GO', 62, 'em'],
  ['Guarulhos', 'SP', 11, 'em'], ['Campinas', 'SP', 19, 'em'], ['São Luís', 'MA', 98, 'em'], ['Maceió', 'AL', 82, 'em'],
  ['Natal', 'RN', 84, 'em'], ['Teresina', 'PI', 86, 'em'], ['João Pessoa', 'PB', 83, 'em'], ['Campo Grande', 'MS', 67, 'em'],
  ['Cuiabá', 'MT', 65, 'em'], ['Florianópolis', 'SC', 48, 'em'], ['Vitória', 'ES', 27, 'em'], ['Aracaju', 'SE', 79, 'em'],
  ['Porto Velho', 'RO', 69, 'em'], ['Macapá', 'AP', 96, 'em'], ['Boa Vista', 'RR', 95, 'em'], ['Rio Branco', 'AC', 68, 'em'],
  ['Palmas', 'TO', 63, 'em'], ['Santos', 'SP', 13, 'em'], ['São Bernardo do Campo', 'SP', 11, 'em'], ['Santo André', 'SP', 11, 'em'],
  ['Osasco', 'SP', 11, 'em'], ['Sorocaba', 'SP', 15, 'em'], ['Ribeirão Preto', 'SP', 16, 'em'], ['São José dos Campos', 'SP', 12, 'em'],
  ['Jundiaí', 'SP', 11, 'em'], ['Piracicaba', 'SP', 19, 'em'], ['Bauru', 'SP', 14, 'em'], ['São José do Rio Preto', 'SP', 17, 'em'],
  ['Niterói', 'RJ', 21, 'em'], ['Duque de Caxias', 'RJ', 21, 'em'], ['Nova Iguaçu', 'RJ', 21, 'em'], ['Petrópolis', 'RJ', 24, 'em'],
  ['Juiz de Fora', 'MG', 32, 'em'], ['Uberlândia', 'MG', 34, 'em'], ['Contagem', 'MG', 31, 'em'], ['Montes Claros', 'MG', 38, 'em'],
  ['Londrina', 'PR', 43, 'em'], ['Maringá', 'PR', 44, 'em'], ['Ponta Grossa', 'PR', 42, 'em'], ['Cascavel', 'PR', 45, 'em'], ['Foz do Iguaçu', 'PR', 45, 'em'],
  ['Joinville', 'SC', 47, 'em'], ['Blumenau', 'SC', 47, 'em'], ['Balneário Camboriú', 'SC', 47, 'em'], ['Chapecó', 'SC', 49, 'em'],
  ['Caxias do Sul', 'RS', 54, 'em'], ['Pelotas', 'RS', 53, 'em'], ['Canoas', 'RS', 51, 'em'], ['Santa Maria', 'RS', 55, 'em'], ['Gramado', 'RS', 54, 'em'],
  ['Feira de Santana', 'BA', 75, 'em'], ['Vitória da Conquista', 'BA', 77, 'em'], ['Ilhéus', 'BA', 73, 'em'], ['Porto Seguro', 'BA', 73, 'em'],
  ['Caruaru', 'PE', 81, 'em'], ['Olinda', 'PE', 81, 'em'], ['Petrolina', 'PE', 87, 'em'], ['Jaboatão dos Guararapes', 'PE', 81, 'em'],
  ['Campina Grande', 'PB', 83, 'em'], ['Mossoró', 'RN', 84, 'em'], ['Juazeiro do Norte', 'CE', 88, 'em'], ['Sobral', 'CE', 88, 'em'],
  ['Anápolis', 'GO', 62, 'em'], ['Aparecida de Goiânia', 'GO', 62, 'em'], ['Uberaba', 'MG', 34, 'em'], ['Ipatinga', 'MG', 31, 'em'],
  ['Vila Velha', 'ES', 27, 'em'], ['Serra', 'ES', 27, 'na'], ['Cariacica', 'ES', 27, 'em'], ['Imperatriz', 'MA', 99, 'em'],
  ['Santarém', 'PA', 93, 'em'], ['Ananindeua', 'PA', 91, 'em'], ['Dourados', 'MS', 67, 'em'], ['Rondonópolis', 'MT', 66, 'em'],
  ['Arapiraca', 'AL', 82, 'em'], ['Paraty', 'RJ', 24, 'em'], ['Búzios', 'RJ', 22, 'em'], ['Cabo Frio', 'RJ', 22, 'em'],
  ['Ubatuba', 'SP', 12, 'em'], ['Campos do Jordão', 'SP', 12, 'em'], ['Bonito', 'MS', 67, 'em'], ['Jericoacoara', 'CE', 88, 'em'],
  ['Fernando de Noronha', 'PE', 81, 'em'], ['Tiradentes', 'MG', 32, 'em'], ['Ouro Preto', 'MG', 31, 'em'], ['Pipa', 'RN', 84, 'em'],
].map(([nome, uf, ddd, prep]) => ({ nome, uf, ddd, prep }));

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Plateia que Reage — você fala e uma plateia virtual de até 40 pessoas, cada uma com a própria ficha, reage a CADA frase:
// uma chamada só por frase julga a reação de todas (choice), o tipo da frase e o gancho. Para adaptar: troque as fichas
// em PLATEIAS pelo seu público (alunos, banca de entrevista, clientes) e, se quiser, os balões em BALOES.

// ---------- as 9 reações (a ordem é a da barra: a favor · neutro · contra) ----------
const REACOES = [
  { id: 'rindo', rotulo: 'rindo', icone: '😂', cor: '#fbbf24', lado: 'com', desc: 'acha graça, do jeito que a ficha gosta' },
  { id: 'empolgado', rotulo: 'empolgado', icone: '🤩', cor: '#f472b6', lado: 'com', desc: 'quer aquilo e acredita' },
  { id: 'convencido', rotulo: 'convencido', icone: '😌', cor: '#4ade80', lado: 'com', desc: 'veio a prova que a ficha pede' },
  { id: 'curioso', rotulo: 'curioso', icone: '🤔', cor: '#2dd4bf', lado: 'com', desc: 'quer saber mais, ainda sem prova, ou se reconhece numa pergunta feita à plateia' },
  { id: 'neutro', rotulo: 'neutro', icone: '😐', cor: '#71717a', lado: 'neutro', desc: 'nada da ficha foi tocado' },
  { id: 'cetico', rotulo: 'cético', icone: '🤨', cor: '#a78bfa', lado: 'contra', desc: 'duvida do que ouviu' },
  { id: 'confuso', rotulo: 'confuso', icone: '😵‍💫', cor: '#60a5fa', lado: 'contra', desc: 'não entendeu o que ouviu' },
  { id: 'entediado', rotulo: 'entediado', icone: '🥱', cor: '#a8a29e', lado: 'contra', desc: 'perdeu o interesse' },
  { id: 'incomodado', rotulo: 'incomodado', icone: '😠', cor: '#ef4444', lado: 'contra', desc: 'se irritou ou se ofendeu' },
];

// ---------- o tipo da frase (uma pergunta só, para a placa do palco e o relatório) ----------
const TIPOS = [
  { id: 'piada', rotulo: 'Piada', icone: '😂', desc: 'piada, ironia ou brincadeira para fazer rir' },
  { id: 'promessa', rotulo: 'Promessa', icone: '✨', desc: 'promessa de resultado ("você vai…", "em 7 dias…"), exagerada ou não' },
  { id: 'dado', rotulo: 'Dado ou número', icone: '📊', desc: 'número, estatística ou resultado medido (vale também dentro de um caso)' },
  { id: 'historia', rotulo: 'História', icone: '📖', desc: 'história ou caso de alguém, sem número de resultado' },
  { id: 'pergunta', rotulo: 'Pergunta à plateia', icone: '🙋', desc: 'pergunta para quem ouve ("quem aqui já…?", "você sabia…?")' },
  { id: 'venda', rotulo: 'Pedido ou venda', icone: '🛒', desc: 'chamada para ação: inscreva-se, compre, clique, comente, invista' },
  { id: 'enrolacao', rotulo: 'Enrolação', icone: '🌀', desc: 'enrolação: repete, divaga ou faz introdução longa sem conteúdo' },
  { id: 'jargao', rotulo: 'Jargão técnico', icone: '🧩', desc: 'jargão, siglas ou termos técnicos em sequência' },
  { id: 'grosseria', rotulo: 'Grosseria', icone: '💢', desc: 'grosseria, arrogância ou deboche com quem ouve' },
  { id: 'comum', rotulo: 'Frase comum', icone: '💬', desc: 'frase comum: cumprimento, transição ou explicação simples' },
];

// ---------- as plateias ----------
// Cada pessoa tem uma ficha com os gatilhos de cada reação: o que a faz rir, se empolgar, ficar curiosa, se convencer,
// desconfiar, ficar confusa, se entediar e se irritar. Pessoas fictícias. g = 'f'/'m' (para o texto do relatório);
// grupo = como o relatório fala delas; tom = o jeito dos balões (ver BALOES).
const P = (id, nome, idade, g, avatar, vida, grupo, tom, f) => ({ id, nome, idade, g, avatar, vida, grupo, tom, ...f });

const PLATEIAS = [
  {
    id: 'youtube', rotulo: 'Público do YouTube', curto: 'YouTube', icone: '📺',
    quem: 'gente assistindo a um vídeo no celular, que pode pular ou fechar o vídeo a qualquer momento',
    exemplos: [
      { rotulo: '✨ promessa', texto: 'Hoje eu vou te mostrar como ficar rico com inteligência artificial em sete dias, sem fazer nada.' },
      { rotulo: '😂 piada', texto: 'Brincadeira! Se fosse fácil assim, eu estaria numa praia, e não gravando isto às duas da manhã.' },
      { rotulo: '📊 caso real', texto: 'A Márcia, que tem uma marmitaria em Guarulhos, passou de 30 para 85 pedidos por semana com IA.' },
      { rotulo: '🧩 jargão', texto: 'Para isso, ela usou um agente com RAG, embeddings e um webhook no n8n.' },
      { rotulo: '💢 arrogante', texto: 'Quem não entendeu isso, sinceramente, nem deveria estar assistindo a este canal.' },
      { rotulo: '🙋 pergunta', texto: 'Quem aqui já perdeu uma venda porque demorou para responder no WhatsApp?' },
    ],
    pessoas: [
      P('yt01', 'Bia', 29, 'f', '👩🏽‍💻', 'dev back-end em Recife', 'os devs e técnicos', 'tecnico', { ri: 'piada nerd e ironia', empolga: 'ferramenta que poupa horas de código', curiosa: 'como a tecnologia funciona por dentro', convence: 'demonstração e número com fonte', desconfia: 'dinheiro fácil, "sem esforço", papo de guru', confunde: 'nada de tecnologia: entende API, RAG, prompt', entedia: 'papo motivacional e explicação básica demais', irrita: 'arrogância e erro técnico dito com certeza' }),
      P('yt02', 'Dona Cida', 58, 'f', '👩🏾‍🍳', 'vende marmita em Osasco', 'os pequenos empreendedores', 'tia', { ri: 'piada simples do dia a dia', empolga: 'vender mais e ganhar cliente novo', curiosa: 'o que outra pessoa simples fez para vender mais', convence: 'caso real de gente simples como ela', desconfia: 'coisa cara e "fique rico"', confunde: 'palavra em inglês, sigla e termo de tecnologia', entedia: 'número demais e teoria', irrita: 'deboche, palavrão e gente metida' }),
      P('yt03', 'Kauã', 17, 'm', '🧑🏽‍🎓', 'estudante do 3º ano em Manaus', 'os estudantes e criadores', 'jovem', { ri: 'meme, zoeira e exagero', empolga: 'ganhar dinheiro cedo, IA nova e games', curiosa: 'segredo, desafio e tecnologia nova', convence: 'alguém jovem mostrando o resultado', desconfia: 'quase nada: acredita fácil', confunde: 'termo de negócio (margem, CAC, imposto)', entedia: 'explicação longa, teoria e "na minha época"', irrita: 'sermão e comparação com os outros' }),
      P('yt04', 'Seu Antônio', 71, 'm', '👴🏻', 'aposentado em Juiz de Fora', 'os aposentados', 'tio', { ri: 'trocadilho e piada leve', empolga: 'aprender coisa nova com calma e falar com os netos', curiosa: 'novidade explicada devagar', convence: 'passo a passo e exemplo simples', desconfia: 'golpe, promessa de dinheiro e "clique aqui"', confunde: 'sigla, inglês, termo técnico e fala rápida', entedia: 'gíria de internet e meme', irrita: 'grosseria e deboche com quem não entende' }),
      P('yt05', 'Camila', 34, 'f', '👩🏻‍⚕️', 'nutricionista com consultório em Campinas', 'os profissionais da saúde', 'formal', { ri: 'humor leve', empolga: 'atender mais pacientes com menos trabalho', curiosa: 'ferramenta para o consultório', convence: 'estudo e caso de colega', desconfia: 'promessa milagrosa e resultado garantido', confunde: 'programação', entedia: 'papo técnico demais', irrita: 'machismo, desinformação e grosseria' }),
      P('yt06', 'Thiago', 26, 'm', '👨🏿‍🦱', 'motoboy de aplicativo em São Paulo', 'os trabalhadores', 'jovem', { ri: 'zoeira e piada de trânsito', empolga: 'renda extra que cabe no celular', curiosa: 'jeito novo de ganhar dinheiro', convence: 'print de ganho real de alguém como ele', desconfia: 'curso caro e "fique rico"', confunde: 'termo técnico em inglês', entedia: 'enrolação e teoria', irrita: 'quem desdenha de trabalhador e arrogância' }),
      P('yt07', 'Larissa', 31, 'f', '👩🏼‍🍳', 'mãe de gêmeos, vende bolo pelo Instagram em BH', 'os pequenos empreendedores', 'pratico', { ri: 'perrengue de mãe e humor do cotidiano', empolga: 'ganhar tempo e vender mais encomendas', curiosa: 'dica prática para o Instagram', convence: 'exemplo de outra mãe empreendedora com resultado', desconfia: 'o que exige horas por dia', confunde: 'jargão: API, automação, webhook', entedia: 'história longa sem ponto', irrita: 'grosseria e "é só ter disciplina"' }),
      P('yt08', 'Rafael', 45, 'm', '👨🏻‍💼', 'gerente de banco em Curitiba', 'os profissionais e executivos', 'formal', { ri: 'quase nada: só humor sutil', empolga: 'produtividade e crescer na carreira', curiosa: 'impacto da IA nos negócios', convence: 'número, retorno do investimento e caso de empresa', desconfia: 'promessa sem número', confunde: 'código', entedia: 'meme e zoeira', irrita: 'informalidade demais e palavrão' }),
      P('yt09', 'Yasmin', 22, 'f', '👩🏾‍🎨', 'estudante de design em Salvador', 'os estudantes e criadores', 'jovem', { ri: 'ironia e meme', empolga: 'IA de imagem e criatividade', curiosa: 'ferramenta visual nova', convence: 'ver o resultado na tela', desconfia: '"a IA vai substituir artistas"', confunde: 'finanças e termo de negócio', entedia: 'planilha e números', irrita: 'desvalorizar artista e arrogância' }),
      P('yt10', 'Marcos', 39, 'm', '👨🏽‍🔧', 'dono de oficina mecânica em Goiânia', 'os pequenos empreendedores', 'tio', { ri: 'piada de tiozão e futebol', empolga: 'agenda cheia e cliente novo', curiosa: 'o que outro comércio fez', convence: 'caso de outro comércio do bairro', desconfia: 'coisa de internet que custa caro', confunde: 'inglês e siglas', entedia: 'teoria', irrita: 'gente que fala difícil para se mostrar e arrogância' }),
      P('yt11', 'Dra. Helena', 52, 'f', '👩🏻‍⚖️', 'advogada trabalhista em Porto Alegre', 'os profissionais e executivos', 'formal', { ri: 'ironia fina', empolga: 'ganhar tempo nas petições', curiosa: 'regra nova e questão legal', convence: 'fonte, norma e precisão', desconfia: 'generalização e número sem fonte', confunde: 'programação', entedia: 'enrolação e meme', irrita: 'erro factual, informalidade e desrespeito' }),
      P('yt12', 'PH', 19, 'm', '🧑🏻‍🦰', 'gamer e streamer iniciante em Fortaleza', 'os estudantes e criadores', 'jovem', { ri: 'meme, humor ácido, zoeira pesada e referência de jogo', empolga: 'viralizar e crescer o canal', curiosa: 'algoritmo e ferramenta de vídeo', convence: 'número de visualizações', desconfia: '"segredo do algoritmo"', confunde: 'termo jurídico e contábil', entedia: 'assunto de empresa e formalidade', irrita: 'sermão e "geração mimada"' }),
      P('yt13', 'Fernanda', 36, 'f', '👩🏽‍⚕️', 'enfermeira de plantão em Belém', 'os profissionais da saúde', 'pratico', { ri: 'humor do cotidiano e piada de plantão', empolga: 'o que poupa tempo e cansaço', curiosa: 'dica prática', convence: 'caso real e prático', desconfia: 'milagre', confunde: 'jargão de tecnologia', entedia: 'enrolação: assiste no intervalo do plantão', irrita: 'desrespeito e deboche' }),
      P('yt14', 'Seu Jorge', 63, 'm', '👨🏻‍🦳', 'dono de mercadinho em Campinas', 'os pequenos empreendedores', 'tio', { ri: 'piada leve', empolga: 'reduzir perda e fila no caixa', curiosa: 'ideia para o comércio', convence: 'conta feita com economia em reais', desconfia: 'assinatura mensal e coisa cara', confunde: 'inglês e termo técnico', entedia: 'papo de futuro e teoria', irrita: 'desperdício e arrogância' }),
      P('yt15', 'Ana Clara', 27, 'f', '👩🏻‍💼', 'analista de marketing em Florianópolis', 'os estudantes e criadores', 'jovem', { ri: 'meme e ironia', empolga: 'ferramenta nova e tendência', curiosa: 'estratégia nova', convence: 'case com métrica de conversão', desconfia: 'guru de marketing e "hack secreto"', confunde: 'programação pesada', entedia: 'básico demais', irrita: 'clichê de coach e arrogância' }),
      P('yt16', 'Rogério', 48, 'm', '👨🏽‍🦲', 'caminhoneiro em Uberlândia, assiste no posto', 'os trabalhadores', 'tio', { ri: 'piada de tiozão e causo de estrada', empolga: 'renda e economia', curiosa: 'o que outros motoristas usam', convence: 'experiência de outro motorista', desconfia: 'promessa da internet', confunde: 'siglas e inglês', entedia: 'teoria e assunto de escritório', irrita: 'arrogância e desdém de quem trabalha' }),
      P('yt17', 'Juliana', 41, 'f', '👩🏾‍🏫', 'professora de história da rede pública em Recife', 'os profissionais e executivos', 'formal', { ri: 'ironia e trocadilho', empolga: 'preparar aula mais rápido', curiosa: 'uso de IA na escola', convence: 'exemplo em sala de aula', desconfia: '"a IA faz tudo por você"', confunde: 'termos de programação', entedia: 'papo de vendas', irrita: 'desrespeito ao professor e desinformação' }),
      P('yt18', 'Lucas', 33, 'm', '🧑🏼‍💻', 'fundador de startup em São Paulo', 'os devs e técnicos', 'tecnico', { ri: 'ironia sobre startups', empolga: 'escalar e automatizar', curiosa: 'modelo novo e ferramenta nova', convence: 'métrica de tração', desconfia: 'hype sem produto', confunde: 'nada de tecnologia nem de negócios', entedia: 'básico demais e enrolação', irrita: 'perda de tempo e arrogância' }),
      P('yt19', 'Dona Lurdes', 66, 'f', '👵🏽', 'costureira em Natal', 'os pequenos empreendedores', 'tia', { ri: 'causo e piada leve', empolga: 'vender pela internet com a ajuda da neta', curiosa: 'coisa que a neta usa', convence: 'explicação devagar com exemplo', desconfia: 'link e pagamento adiantado', confunde: 'tecnologia em geral, sigla e inglês', entedia: 'números e conversa comprida', irrita: 'palavrão, pressa e deboche' }),
      P('yt20', 'Gabriel', 24, 'm', '🧑🏾‍🎓', 'estagiário de engenharia em Campinas', 'os devs e técnicos', 'jovem', { ri: 'meme e piada nerd', empolga: 'ferramenta que dá vantagem no estágio', curiosa: 'como a IA funciona', convence: 'tutorial prático', desconfia: 'curso caro e guru', confunde: 'termos de vendas e marketing', entedia: 'papo motivacional', irrita: 'arrogância' }),
      P('yt21', 'Patrícia', 38, 'f', '👩🏼‍💼', 'corretora de imóveis no Rio', 'os pequenos empreendedores', 'pratico', { ri: 'humor rápido', empolga: 'mais clientes e vender mais', curiosa: 'técnica de venda', convence: 'caso com número de vendas', desconfia: 'o que é demorado de aplicar', confunde: 'código', entedia: 'teoria e enrolação', irrita: 'arrogância' }),
      P('yt22', 'Wellington', 30, 'm', '👨🏽', 'vendedor de loja de celular em BH', 'os trabalhadores', 'jovem', { ri: 'zoeira', empolga: 'bater meta e ganhar comissão', curiosa: 'truque de venda', convence: 'depoimento e prova social', desconfia: 'quase nada', confunde: 'termo de programação', entedia: 'teoria', irrita: 'sermão e gente metida' }),
      P('yt23', 'Kenji', 44, 'm', '🧑🏻‍🔬', 'engenheiro agrônomo em Londrina', 'os profissionais e executivos', 'tecnico', { ri: 'pouco: humor seco', empolga: 'tecnologia no campo', curiosa: 'dado de produtividade', convence: 'teste de campo e dado medido', desconfia: 'modismo e número sem fonte', confunde: 'gíria de internet', entedia: 'papo de influencer', irrita: 'superficialidade e desdém pelo campo' }),
      P('yt24', 'Zé Carlos', 55, 'm', '👨🏼‍🌾', 'produtor rural em Mato Grosso', 'os pequenos empreendedores', 'tio', { ri: 'causo e piada de tiozão', empolga: 'economia e produtividade', curiosa: 'o que o vizinho está usando', convence: 'vizinho que já usa e resultado na lavoura', desconfia: 'gente da cidade vendendo solução', confunde: 'inglês e siglas', entedia: 'teoria e reunião', irrita: 'arrogância e deboche com o interior' }),
      P('yt25', 'Mariana', 20, 'f', '👩🏻‍🎓', 'estudante de medicina em Ribeirão Preto', 'os estudantes e criadores', 'jovem', { ri: 'meme e ironia', empolga: 'estudar mais rápido', curiosa: 'ferramenta de estudo', convence: 'fonte e estudo científico', desconfia: 'atalho sem base', confunde: 'negócios e programação', entedia: 'vendas e marketing', irrita: 'desinformação e arrogância' }),
      P('yt26', 'Seu Raimundo', 62, 'm', '👨🏿‍🦳', 'porteiro em Copacabana', 'os trabalhadores', 'tio', { ri: 'piada leve e futebol', empolga: 'aprender para ajudar o filho', curiosa: 'novidade explicada simples', convence: 'explicação simples com exemplo', desconfia: 'golpe e dinheiro fácil', confunde: 'inglês, sigla e tecnologia', entedia: 'conversa comprida', irrita: 'gente metida e grosseria' }),
      P('yt27', 'Débora', 43, 'f', '👩🏾‍🦱', 'dona de salão de beleza em Recife', 'os pequenos empreendedores', 'tia', { ri: 'fofoca e humor do dia a dia', empolga: 'agenda cheia e cliente voltando', curiosa: 'dica para o salão', convence: 'caso de outro salão', desconfia: 'coisa cara ou difícil', confunde: 'API e automação', entedia: 'teoria', irrita: 'arrogância e pressa' }),
      P('yt28', 'Igor', 35, 'm', '👨🏻‍💻', 'cientista de dados em São Paulo', 'os devs e técnicos', 'tecnico', { ri: 'piada nerd e ironia', empolga: 'modelo novo e benchmark', curiosa: 'metodologia', convence: 'número com metodologia', desconfia: 'número redondo sem fonte e hype', confunde: 'nada técnico', entedia: 'básico demais e motivacional', irrita: 'erro técnico e "a IA pensa"' }),
      P('yt29', 'Sandra', 50, 'f', '👩🏽‍💼', 'contadora em Belo Horizonte', 'os profissionais e executivos', 'formal', { ri: 'pouca coisa', empolga: 'reduzir trabalho manual', curiosa: 'automação de planilha', convence: 'conta feita e segurança', desconfia: 'promessa sem garantia', confunde: 'gíria e termos de programação', entedia: 'papo motivacional', irrita: 'imprecisão e informalidade' }),
      P('yt30', 'Vitória', 16, 'f', '👧🏻', 'estudante do 1º ano em Campo Grande, fã de K-pop', 'os estudantes e criadores', 'jovem', { ri: 'meme, fofura e zoeira', empolga: 'novidade e IA de imagem', curiosa: 'tendência', convence: 'amiga ou influencer mostrando', desconfia: 'quase nada', confunde: 'negócios e tecnologia avançada', entedia: 'números e reunião de adulto', irrita: 'sermão e adulto chato' }),
      P('yt31', 'Eduardo', 57, 'm', '🧔🏽', 'taxista em Brasília', 'os trabalhadores', 'tio', { ri: 'causo', empolga: 'renda', curiosa: 'aplicativo útil', convence: 'experiência real', desconfia: 'aplicativo novo e promessa', confunde: 'inglês, sigla e termo técnico', entedia: 'papo de escritório', irrita: 'falta de educação' }),
      P('yt32', 'Priscila', 29, 'f', '👱🏻‍♀️', 'influenciadora de moda iniciante em Goiânia', 'os estudantes e criadores', 'jovem', { ri: 'humor leve e meme', empolga: 'crescer seguidores e fechar parceria', curiosa: 'tendência', convence: 'números de alcance', desconfia: '"segredo do algoritmo"', confunde: 'programação', entedia: 'técnica demais', irrita: 'quem julga criador de conteúdo' }),
      P('yt33', 'Dr. Henrique', 68, 'm', '👨🏼‍⚕️', 'médico aposentado em Campinas', 'os aposentados', 'formal', { ri: 'ironia fina', empolga: 'aprender', curiosa: 'ciência', convence: 'evidência', desconfia: 'exagero', confunde: 'gíria', entedia: 'zoeira', irrita: 'erro factual e desinformação' }),
      P('yt34', 'Luana', 25, 'f', '👩🏿‍🦱', 'atendente de call center em Salvador', 'os trabalhadores', 'jovem', { ri: 'zoeira e humor do trabalho', empolga: 'sair do call center e ter renda nova', curiosa: 'profissão nova', convence: 'alguém que mudou de vida de verdade', desconfia: 'curso caro', confunde: 'termos técnicos', entedia: 'enrolação', irrita: 'deboche de atendente e grosseria' }),
      P('yt35', 'Otávio', 46, 'm', '👨🏼‍🍳', 'dono de restaurante em São Paulo', 'os pequenos empreendedores', 'pratico', { ri: 'humor rápido', empolga: 'mais pedidos e menos desperdício', curiosa: 'ferramenta para restaurante', convence: 'caso com número de pedidos', desconfia: 'taxa de aplicativo', confunde: 'código', entedia: 'teoria', irrita: 'enrolação' }),
      P('yt36', 'Nathalia', 32, 'f', '👩🏽‍🦰', 'psicóloga clínica on-line em Curitiba', 'os profissionais da saúde', 'formal', { ri: 'humor leve e ironia', empolga: 'agenda organizada', curiosa: 'comportamento humano', convence: 'ética e evidência', desconfia: 'resultado garantido', confunde: 'programação', entedia: 'venda agressiva', irrita: 'grosseria, deboche e arrogância' }),
      P('yt37', 'Jefferson', 37, 'm', '👷🏾‍♂️', 'mestre de obras em Fortaleza', 'os trabalhadores', 'tio', { ri: 'zoeira e piada de obra', empolga: 'orçamento rápido e pegar mais obra', curiosa: 'ferramenta para obra', convence: 'exemplo prático', desconfia: 'coisa cara', confunde: 'inglês e siglas', entedia: 'teoria', irrita: 'gente que fala difícil e arrogância' }),
      P('yt38', 'Tânia', 49, 'f', '👩🏿‍💼', 'diretora de RH numa indústria em Joinville', 'os profissionais e executivos', 'formal', { ri: 'humor sutil', empolga: 'produtividade da equipe', curiosa: 'futuro do trabalho', convence: 'caso de empresa e dados', desconfia: '"a IA vai substituir funcionários"', confunde: 'código', entedia: 'zoeira', irrita: 'desrespeito e preconceito' }),
      P('yt39', 'Samuel', 21, 'm', '🧑🏾‍💻', 'entregador e estudante de ADS à noite em Belém', 'os devs e técnicos', 'jovem', { ri: 'meme e piada nerd', empolga: 'aprender a programar com IA', curiosa: 'ferramenta nova', convence: 'tutorial prático', desconfia: 'curso caro', confunde: 'finanças', entedia: 'papo motivacional', irrita: 'arrogância' }),
      P('yt40', 'Bruno', 31, 'm', '🏋🏽‍♂️', 'personal trainer em Natal', 'os pequenos empreendedores', 'jovem', { ri: 'zoeira', empolga: 'conseguir mais alunos', curiosa: 'marketing no Instagram', convence: 'antes e depois, resultado real', desconfia: 'atalho e milagre', confunde: 'termos técnicos', entedia: 'teoria', irrita: 'arrogância' }),
    ],
  },
  {
    id: 'investidores', rotulo: 'Investidores', curto: 'Investidores', icone: '💼', grandes: true,
    quem: 'investidores numa sala de reunião ouvindo o pitch de uma startup e decidindo se colocam dinheiro nela',
    exemplos: [
      { rotulo: '📈 tração', texto: 'Hoje temos mil e duzentos clientes pagantes, faturamos 180 mil reais por mês e crescemos 14% ao mês.' },
      { rotulo: '🌍 mercado', texto: 'Nosso mercado é de três trilhões de dólares e não temos nenhum concorrente.' },
      { rotulo: '🧩 palavra da moda', texto: 'Somos uma plataforma disruptiva de IA generativa com blockchain, uma sinergia nunca vista.' },
      { rotulo: '💢 arrogante', texto: 'Quem não investir hoje vai se arrepender, porque semana que vem o preço dobra.' },
      { rotulo: '😂 piada', texto: 'Nosso plano B é simples: se der errado, eu volto a morar com a minha mãe.' },
    ],
    pessoas: [
      P('in01', 'Regina', 58, 'f', '👩🏻‍🦳', 'investidora-anjo; fundou e vendeu uma rede de farmácias', 'os investidores', 'investidor', { ri: 'ironia sobre o próprio mercado', empolga: 'fundador que conhece o cliente na palma da mão', curiosa: 'como a empresa conquista e mantém clientes', convence: 'receita recorrente e clientes pagantes', desconfia: '"não temos concorrentes" e projeção sem base', confunde: 'jargão técnico profundo', entedia: 'história longa do fundador', irrita: 'arrogância e fugir da pergunta' }),
      P('in02', 'Daniel', 41, 'm', '👨🏻‍💼', 'sócio de um fundo de venture capital', 'os investidores', 'investidor', { ri: 'piada inteligente e rápida', empolga: 'mercado grande com vantagem difícil de copiar', curiosa: 'como a empresa vence os concorrentes', convence: 'tração com números: receita, crescimento e clientes pagantes', desconfia: 'palavra da moda sem produto e empresa avaliada alto demais', confunde: 'nada de negócios nem de tecnologia', entedia: 'detalhe de produto sem número', irrita: 'enrolação e número inventado' }),
      P('in03', 'Marcelo', 63, 'm', '👴🏽', 'cuida do dinheiro de uma família tradicional', 'os investidores', 'investidor', { ri: 'piada leve e educada', empolga: 'lucro e caixa no azul', curiosa: 'quando a empresa vai dar lucro', convence: 'margem, lucro e fluxo de caixa', desconfia: 'queimar caixa e "crescer a qualquer custo"', confunde: 'siglas de startup e termos em inglês', entedia: 'tecnologia explicada em detalhe', irrita: 'informalidade, palavrão e arrogância' }),
      P('in04', 'Júlia', 35, 'f', '👩🏾‍💼', 'investidora de impacto social', 'os investidores', 'investidor', { ri: 'humor leve', empolga: 'impacto social medido junto com o negócio', curiosa: 'quem é beneficiado e como', convence: 'dado de impacto e de receita', desconfia: 'impacto sem métrica e discurso bonito', confunde: 'jargão financeiro complicado', entedia: 'só falar de dinheiro', irrita: 'desdém por questões sociais e preconceito' }),
      P('in05', 'Ricardo', 47, 'm', '🧑🏻‍💼', 'diretor do braço de investimentos de uma indústria', 'os investidores', 'investidor', { ri: 'pouco: humor seco', empolga: 'piloto com cliente grande e encaixe com a indústria', curiosa: 'parceria com empresas grandes', convence: 'contrato com empresa grande e caso de uso real', desconfia: 'startup sem nenhum cliente corporativo', confunde: 'gíria de startup', entedia: 'aplicativo para consumidor final', irrita: 'arrogância com empresas tradicionais' }),
      P('in06', 'Fernanda', 39, 'f', '👩🏽‍💻', 'ex-diretora de tecnologia, hoje investidora-anjo', 'os investidores', 'investidor', { ri: 'piada nerd', empolga: 'tecnologia de verdade e time técnico forte', curiosa: 'como o produto funciona por dentro', convence: 'demonstração e arquitetura explicada', desconfia: '"IA proprietária" sem prova e palavra da moda', confunde: 'nada técnico', entedia: 'slide de mercado genérico', irrita: 'bobagem técnica dita com confiança' }),
      P('in07', 'Paulo', 52, 'm', '👨🏿‍💼', 'investidor de franquias e varejo', 'os investidores', 'investidor', { ri: 'piada de vendedor', empolga: 'unidade que dá lucro e se repete', curiosa: 'ticket médio e número de unidades', convence: 'números de venda por loja', desconfia: 'software sem receita', confunde: 'termos de tecnologia em inglês', entedia: 'teoria e visão de futuro', irrita: 'jargão para impressionar' }),
      P('in08', 'Aline', 30, 'f', '👩🏻‍🔬', 'analista do fundo, a que faz as perguntas difíceis', 'os investidores', 'investidor', { ri: 'meme de mercado financeiro', empolga: 'dado bem apresentado', curiosa: 'comparação com os concorrentes', convence: 'planilha, comparação e dado que dá para conferir', desconfia: 'número redondo e crescimento sem base', confunde: 'nada de finanças', entedia: 'slide sem dado', irrita: 'fugir de pergunta e desdenhar de analista' }),
    ],
  },
  {
    id: 'cursinho', rotulo: 'Turma de cursinho', curto: 'Cursinho', icone: '📚',
    quem: 'alunos de cursinho pré-vestibular numa aula à noite, cansados, a poucos meses do ENEM',
    exemplos: [
      { rotulo: '😂 piada', texto: 'A mitocôndria é a usina de energia da célula, igualzinho a vocês às sete da manhã: desligada.' },
      { rotulo: '🎯 cai no ENEM', texto: 'Gente, isso aqui cai todo ano no ENEM, então presta atenção que é ponto garantido.' },
      { rotulo: '🧩 cálculo', texto: 'Agora a gente deriva a função composta pela regra da cadeia e depois integra por partes.' },
      { rotulo: '💢 humilhação', texto: 'Quem tirou nota baixa no simulado é porque não estudou, simples assim.' },
      { rotulo: '🤗 acolhida', texto: 'Nota de simulado não define ninguém, e eu estou aqui para ajudar cada um de vocês.' },
    ],
    pessoas: [
      P('cu01', 'Ana Júlia', 17, 'f', '👩🏻‍🦱', 'quer medicina e vive ansiosa com o ENEM', 'os de saúde', 'aluno', { ri: 'meme de vestibular', empolga: 'macete do que cai na prova', curiosa: 'questão difícil bem explicada', convence: '"isso caiu no ENEM do ano passado"', desconfia: '"é fácil"', confunde: 'física avançada', entedia: 'história longa do professor', irrita: 'comparar alunos e humilhar' }),
      P('cu02', 'Pedro', 18, 'm', '👦🏽', 'o do fundão, zoa tudo', 'o fundão', 'jovem', { ri: 'zoeira e piada de professor', empolga: 'aula curta e intervalo', curiosa: 'curiosidade bizarra', convence: 'exemplo engraçado', desconfia: '"presta atenção que é importante"', confunde: 'fórmula sem explicação', entedia: 'teoria e lista de exercícios', irrita: 'sermão e bronca na frente de todos' }),
      P('cu03', 'Larissa', 19, 'f', '👩🏽', 'trabalha de dia num supermercado e quer enfermagem', 'os que trabalham de dia', 'aluno', { ri: 'humor do dia a dia', empolga: 'aprender rápido o que cai', curiosa: 'aplicação prática', convence: 'exemplo do dia a dia', desconfia: '"é só estudar 10 horas por dia"', confunde: 'matéria que não viu na escola pública', entedia: 'enrolação: está cansada', irrita: 'desdém de quem trabalha e estuda' }),
      P('cu04', 'Gustavo', 17, 'm', '🧑🏻', 'ama exatas e quer engenharia', 'os de exatas', 'aluno', { ri: 'piada nerd', empolga: 'desafio difícil', curiosa: 'demonstração matemática', convence: 'conta feita na lousa', desconfia: '"decora que cai"', confunde: 'nada de exatas', entedia: 'redação e literatura', irrita: 'erro de conta do professor' }),
      P('cu05', 'Beatriz', 18, 'f', '👩🏾', 'quer direito e ama humanas', 'os de humanas', 'aluno', { ri: 'ironia e trocadilho', empolga: 'debate e atualidades', curiosa: 'a história por trás do tema', convence: 'argumento bem construído', desconfia: 'frase de efeito sem argumento', confunde: 'cálculo, física e fórmula', entedia: 'aula sem debate', irrita: 'desrespeito e "humanas não serve para nada"' }),
      P('cu06', 'Matheus', 16, 'm', '👦🏻', 'o mais novo da turma, adiantado na escola', 'o fundão', 'jovem', { ri: 'meme', empolga: 'jogo e competição', curiosa: 'curiosidade científica', convence: 'experiência ao vivo', desconfia: 'quase nada', confunde: 'termo de vestibular (SISU, nota de corte)', entedia: 'conselho de adulto', irrita: 'ser tratado como criança' }),
      P('cu07', 'Camila', 20, 'f', '👩🏼', 'terceira tentativa em medicina, sob pressão', 'os de saúde', 'aluno', { ri: 'pouco: está tensa', empolga: 'estratégia de prova', curiosa: 'o que mais cai', convence: 'estatística das provas anteriores', desconfia: 'aprovação garantida', confunde: 'quase nada: já viu tudo', entedia: 'o básico que ela já sabe', irrita: 'piada com quem repete o vestibular' }),
      P('cu08', 'João Victor', 18, 'm', '👨🏿', 'joga futebol e quer educação física', 'o fundão', 'jovem', { ri: 'zoeira e futebol', empolga: 'exemplo com esporte', curiosa: 'corpo humano', convence: 'exemplo prático', desconfia: 'teoria demais', confunde: 'química orgânica', entedia: 'aula só falada', irrita: 'sermão' }),
      P('cu09', 'Isabela', 17, 'f', '👩🏻', 'quer psicologia e é muito sensível', 'os de humanas', 'aluno', { ri: 'humor leve', empolga: 'professor que acolhe', curiosa: 'comportamento humano', convence: 'exemplo com gente de verdade', desconfia: '"quem quer, consegue"', confunde: 'física', entedia: 'decoreba', irrita: 'grosseria e humilhação' }),
      P('cu10', 'Rafael', 19, 'm', '🧑🏾', 'entregador de dia, quer análise de sistemas', 'os que trabalham de dia', 'jovem', { ri: 'zoeira', empolga: 'tecnologia e programação', curiosa: 'IA e computador', convence: 'aplicação prática no trabalho', desconfia: 'curso caro', confunde: 'literatura antiga', entedia: 'enrolação', irrita: 'desdém de quem trabalha' }),
      P('cu11', 'Maria Eduarda', 18, 'f', '👱🏽‍♀️', 'organizada, faz resumo de tudo', 'os de saúde', 'aluno', { ri: 'trocadilho', empolga: 'esquema e mapa mental', curiosa: 'como memorizar melhor', convence: 'método testado', desconfia: 'improviso', confunde: 'professor que pula etapas', entedia: 'repetição', irrita: 'bagunça e professor que corre' }),
      P('cu12', 'Kevin', 17, 'm', '🧑🏼', 'gamer, dorme pouco', 'o fundão', 'jovem', { ri: 'meme e referência de jogo', empolga: 'game e gamificação', curiosa: 'tecnologia', convence: 'exemplo com jogo', desconfia: '"estudar é divertido"', confunde: 'biologia', entedia: 'aula longa e teoria', irrita: 'bronca por dormir na aula' }),
      P('cu13', 'Letícia', 18, 'f', '👩🏽‍🦱', 'quer arquitetura, desenha nas margens do caderno', 'os de exatas', 'aluno', { ri: 'ironia', empolga: 'arte e desenho', curiosa: 'geometria visual', convence: 'desenho na lousa', desconfia: 'decoreba', confunde: 'química', entedia: 'lista de fórmulas', irrita: 'desvalorizar arte' }),
      P('cu14', 'Davi', 19, 'm', '👨🏾', 'o primeiro da família a tentar a faculdade', 'os que trabalham de dia', 'aluno', { ri: 'piada leve', empolga: 'história de quem conseguiu vindo de baixo', curiosa: 'como funciona a universidade pública', convence: 'caso real de ex-aluno aprovado', desconfia: 'quem diz que é fácil', confunde: 'matéria que nunca viu', entedia: 'assunto que não cai', irrita: 'preconceito e desdém' }),
      P('cu15', 'Sofia', 16, 'f', '👧🏽', 'tímida, senta na primeira fila', 'os de humanas', 'aluno', { ri: 'humor leve', empolga: 'elogio do professor', curiosa: 'tudo que é novo', convence: 'explicação passo a passo', desconfia: 'pouca coisa', confunde: 'matéria rápida demais', entedia: 'zoeira da turma', irrita: 'ser exposta na frente de todos' }),
      P('cu16', 'Lucas', 18, 'm', '👨🏻', 'quer medicina e é competitivo', 'os de saúde', 'aluno', { ri: 'piada nerd', empolga: 'ranking e simulado', curiosa: 'questão difícil', convence: 'estatística de aprovação', desconfia: '"todo mundo passa"', confunde: 'quase nada', entedia: 'matéria fácil', irrita: 'perder tempo' }),
      P('cu17', 'Yasmin', 17, 'f', '👩🏿', 'quer jornalismo e faz vídeos', 'os de humanas', 'jovem', { ri: 'meme e ironia', empolga: 'atualidades e redes sociais', curiosa: 'notícia do momento', convence: 'exemplo atual', desconfia: 'notícia sem fonte', confunde: 'física', entedia: 'cálculo', irrita: '"rede social é perda de tempo"' }),
      P('cu18', 'Henrique', 20, 'm', '👨🏽', 'serviu o Exército e voltou a estudar', 'os que trabalham de dia', 'aluno', { ri: 'humor seco', empolga: 'disciplina e meta clara', curiosa: 'história do Brasil', convence: 'plano de estudo concreto', desconfia: 'atalho', confunde: 'matéria que esqueceu', entedia: 'bagunça', irrita: 'falta de respeito' }),
      P('cu19', 'Gabriela', 18, 'f', '👩🏼‍🦰', 'quer biologia marinha', 'os de saúde', 'aluno', { ri: 'humor leve e trocadilho', empolga: 'natureza e bichos', curiosa: 'ciência', convence: 'experimento', desconfia: 'pseudociência', confunde: 'literatura', entedia: 'gramática', irrita: 'desinformação' }),
      P('cu20', 'Thiago', 17, 'm', '🧑🏿', 'quer engenharia, mas odeia química', 'os de exatas', 'jovem', { ri: 'zoeira', empolga: 'matemática e física', curiosa: 'como as coisas funcionam', convence: 'conta feita', desconfia: '"química é fácil"', confunde: 'química', entedia: 'história', irrita: 'humilhação' }),
      P('cu21', 'Manuela', 17, 'f', '👩🏻‍🦰', 'quer relações internacionais e fala inglês', 'os de humanas', 'aluno', { ri: 'ironia', empolga: 'viagem e idiomas', curiosa: 'geopolítica', convence: 'exemplo internacional', desconfia: '"inglês não cai"', confunde: 'física', entedia: 'fórmula decorada', irrita: 'preconceito' }),
      P('cu22', 'Enzo', 16, 'm', '👦🏼', 'adora uma polêmica', 'o fundão', 'jovem', { ri: 'zoeira e polêmica', empolga: 'debate quente', curiosa: 'assunto polêmico', convence: 'argumento forte', desconfia: 'autoridade', confunde: 'matemática', entedia: 'regra', irrita: 'ser mandado calar a boca' }),
      P('cu23', 'Clara', 19, 'f', '👩🏾‍🦱', 'mãe de uma bebê, estuda à noite', 'os que trabalham de dia', 'aluno', { ri: 'humor do cotidiano', empolga: 'estudar rápido e com foco', curiosa: 'dica para render o tempo', convence: 'método rápido', desconfia: '"estuda 10 horas por dia"', confunde: 'matéria antiga', entedia: 'enrolação', irrita: 'quem julga mãe jovem' }),
      P('cu24', 'Bernardo', 18, 'm', '👨🏼', 'quer direito e sonha em ser juiz', 'os de humanas', 'aluno', { ri: 'ironia', empolga: 'argumentação e leis', curiosa: 'casos famosos', convence: 'lógica', desconfia: 'achismo', confunde: 'física', entedia: 'biologia', irrita: 'falta de argumento' }),
      P('cu25', 'Luiza', 17, 'f', '👩🏼‍🦱', 'ansiosa, chora antes de prova', 'os de saúde', 'aluno', { ri: 'humor leve', empolga: 'técnica para ficar calma', curiosa: 'como lidar com a prova', convence: 'professor que acolhe', desconfia: '"fica calma que dá"', confunde: 'matéria rápida', entedia: 'repetição', irrita: 'pressão e terror sobre o ENEM' }),
      P('cu26', 'Caio', 18, 'm', '👱🏻‍♂️', 'skatista, quer design', 'o fundão', 'jovem', { ri: 'zoeira', empolga: 'criatividade', curiosa: 'arte e tecnologia', convence: 'exemplo visual', desconfia: 'regra', confunde: 'química', entedia: 'decoreba', irrita: 'sermão' }),
      P('cu27', 'Rebeca', 18, 'f', '👩🏿‍🦱', 'quer pedagogia, dá aula de reforço para crianças', 'os de humanas', 'aluno', { ri: 'humor leve', empolga: 'didática boa', curiosa: 'como ensinar', convence: 'exemplo didático', desconfia: 'decoreba', confunde: 'física', entedia: 'zoeira', irrita: 'grosseria' }),
      P('cu28', 'Wesley', 19, 'm', '👨🏿‍🦱', 'trabalha numa lanchonete e quer administração', 'os que trabalham de dia', 'jovem', { ri: 'zoeira', empolga: 'dinheiro e negócio próprio', curiosa: 'como montar uma empresa', convence: 'caso real', desconfia: 'promessa de dinheiro fácil', confunde: 'literatura', entedia: 'teoria', irrita: 'desdém' }),
      P('cu29', 'Nicole', 17, 'f', '👩🏽‍🦰', 'quer odontologia, vai bem em biologia', 'os de saúde', 'aluno', { ri: 'meme', empolga: 'biologia', curiosa: 'corpo humano', convence: 'estudo', desconfia: 'macete sem base', confunde: 'matemática', entedia: 'história', irrita: 'professor que debocha' }),
      P('cu30', 'Rodrigo', 28, 'm', '🧔🏻', 'mecânico, voltou a estudar depois de 10 anos', 'os que trabalham de dia', 'tio', { ri: 'piada de tiozão', empolga: 'aprender e mudar de vida', curiosa: 'ciência prática', convence: 'exemplo com motor e oficina', desconfia: '"é fácil"', confunde: 'matéria nova e termos difíceis', entedia: 'gíria de adolescente', irrita: 'ser chamado de velho' }),
    ],
  },
  {
    id: 'loja', rotulo: 'Clientes da loja', curto: 'Loja', icone: '🛍️',
    quem: 'clientes passeando numa loja de eletrodomésticos, móveis e celulares, ouvindo o vendedor apresentar uma oferta; cada um veio atrás de uma coisa, mas oferta boa chama a atenção de todos',
    exemplos: [
      { rotulo: '💸 oferta', texto: 'Essa geladeira está com 20% de desconto e você parcela em 10 vezes sem juros, com entrega grátis.' },
      { rotulo: '🧩 ficha técnica', texto: 'Ela é inverter, frost free, tem 480 litros, selo A de energia e dispenser na porta.' },
      { rotulo: '🗣️ depoimento', texto: 'Uma cliente aqui do bairro trocou a velha por essa e a conta de luz caiu 60 reais por mês.' },
      { rotulo: '⏰ pressão', texto: 'Corre que é só hoje, são as últimas unidades, se não fechar agora vai perder!' },
      { rotulo: '🛡️ seguro', texto: 'E se você levar a garantia estendida, fica só mais 39 reais por mês.' },
    ],
    pessoas: [
      P('lj01', 'Dona Marlene', 67, 'f', '👵🏻', 'aposentada, quer trocar a geladeira de 15 anos', 'os clientes mais velhos', 'tia', { ri: 'piada leve', empolga: 'parcela que cabe na aposentadoria', curiosa: 'se gasta menos luz', convence: 'garantia e entrega com instalação', desconfia: '"só hoje"', confunde: 'termo técnico (inverter, frost free, litros)', entedia: 'conversa comprida', irrita: 'vendedor apressado e insistente' }),
      P('lj02', 'Felipe', 29, 'm', '👨🏻', 'montando o primeiro apartamento com a noiva', 'as famílias', 'cliente', { ri: 'humor leve', empolga: 'combo com desconto para a casa toda', curiosa: 'medidas e espaço', convence: 'preço do combo comparado', desconfia: 'juros escondidos', confunde: 'pouca coisa', entedia: 'enrolação', irrita: 'pressão para fechar agora' }),
      P('lj03', 'Rose', 45, 'f', '👩🏽', 'caçadora de promoção, compara tudo no celular', 'os caçadores de preço', 'cliente', { ri: 'humor rápido', empolga: 'desconto de verdade e cupom', curiosa: 'o preço na concorrência', convence: 'comparação de preço com outras lojas', desconfia: 'preço "de/por" inflado', confunde: 'nada de preço', entedia: 'papo sem dizer o preço', irrita: 'enrolar o preço e mentira' }),
      P('lj04', 'Seu Valter', 72, 'm', '👴🏾', 'quer uma TV grande para ver futebol', 'os clientes mais velhos', 'tio', { ri: 'piada de futebol', empolga: 'desconto bom e coisa grande e bonita', curiosa: 'se é fácil de usar', convence: 'ver funcionando na loja', desconfia: 'TV "inteligente" complicada', confunde: 'hertz, 4K, HDR e polegadas', entedia: 'aplicativos', irrita: 'falar rápido' }),
      P('lj05', 'Bruna', 24, 'f', '👩🏻‍🎤', 'gamer, quer um notebook para jogar', 'os exigentes', 'jovem', { ri: 'meme', empolga: 'desempenho, tecnologia nova e preço justo', curiosa: 'especificação técnica', convence: 'teste de desempenho com números', desconfia: 'vendedor que não sabe o que vende', confunde: 'nada técnico', entedia: 'papo de garantia', irrita: 'vendedor que acha que mulher não entende de tecnologia' }),
      P('lj06', 'Marcos', 38, 'm', '👨🏽‍🦱', 'pai de três, sem tempo nenhum', 'as famílias', 'cliente', { ri: 'humor de pai', empolga: 'entrega rápida e preço bom', curiosa: 'durabilidade', convence: 'garantia longa', desconfia: 'produto frágil', confunde: 'termos técnicos', entedia: 'explicação longa', irrita: 'fila e demora' }),
      P('lj07', 'Cláudia', 52, 'f', '👩🏼‍🍳', 'dona de restaurante, compra freezer para o negócio', 'os que compram para trabalhar', 'pratico', { ri: 'humor leve', empolga: 'desconto para empresa e nota fiscal', curiosa: 'consumo de energia', convence: 'conta de economia em reais', desconfia: 'promessa de economia sem número', confunde: 'pouca coisa', entedia: 'papo de marca', irrita: 'enrolação' }),
      P('lj08', 'Jonas', 33, 'm', '🧔🏻', 'já foi enganado com garantia estendida', 'os exigentes', 'cliente', { ri: 'ironia', empolga: 'preço honesto', curiosa: 'o que a garantia de fábrica cobre', convence: 'condição por escrito', desconfia: 'seguro, garantia estendida e "só hoje"', confunde: 'letra miúda', entedia: 'discurso de vendedor', irrita: 'empurrar seguro' }),
      P('lj09', 'Ingrid', 27, 'f', '👩🏾‍🦱', 'influenciadora de decoração', 'os jovens', 'jovem', { ri: 'meme', empolga: 'produto bonito, diferente e com desconto', curiosa: 'cor e design', convence: 'ver o produto ao vivo', desconfia: 'foto que não é real', confunde: 'especificação técnica', entedia: 'papo de garantia e seguro', irrita: 'vendedor que menospreza o gosto dela' }),
      P('lj10', 'Seu Osvaldo', 61, 'm', '👨🏻‍🦳', 'pechincha tudo e paga à vista', 'os caçadores de preço', 'tio', { ri: 'piada de tiozão', empolga: 'desconto à vista', curiosa: 'quanto sai à vista', convence: 'desconto de verdade em dinheiro', desconfia: 'parcelado "sem juros"', confunde: 'aplicativo e cashback', entedia: 'papo de tecnologia', irrita: 'não dar desconto' }),
      P('lj11', 'Aline', 35, 'f', '👩🏽‍🏫', 'professora, compra no crediário', 'os caçadores de preço', 'cliente', { ri: 'humor leve', empolga: 'parcela pequena', curiosa: 'condições do crediário', convence: 'simulação da parcela', desconfia: 'juros escondidos', confunde: 'taxa de juros', entedia: 'papo longo', irrita: 'pressão' }),
      P('lj12', 'Diego', 21, 'm', '🧑🏽', 'estudante, comprando o primeiro celular bom', 'os jovens', 'jovem', { ri: 'zoeira', empolga: 'tecnologia nova e preço baixo', curiosa: 'câmera e bateria', convence: 'testar a câmera na loja', desconfia: 'modelo antigo vendido como novo', confunde: 'plano de operadora', entedia: 'seguro', irrita: 'vendedor que empurra o modelo caro' }),
      P('lj13', 'Francisca', 58, 'f', '👩🏾‍🦳', 'costureira, quer uma máquina de costura', 'os que compram para trabalhar', 'tia', { ri: 'causo', empolga: 'o que facilita o trabalho e a vida, com preço bom', curiosa: 'pontos e funções', convence: 'demonstração costurando', desconfia: 'produto importado sem assistência', confunde: 'termos em inglês', entedia: 'papo de tecnologia', irrita: 'vendedor que não conhece o produto' }),
      P('lj14', 'Ricardo', 44, 'm', '👨🏻‍💻', 'engenheiro, lê todas as avaliações antes', 'os exigentes', 'tecnico', { ri: 'ironia', empolga: 'produto bem avaliado', curiosa: 'especificação e certificação', convence: 'avaliação de clientes e teste independente', desconfia: '"o melhor do mercado" sem prova', confunde: 'nada técnico', entedia: 'papo emocional', irrita: 'informação errada do vendedor' }),
      P('lj15', 'Joana', 30, 'f', '👩🏼', 'mãe de um recém-nascido, quer máquina de lavar', 'as famílias', 'pratico', { ri: 'perrengue de mãe', empolga: 'o que poupa tempo em casa', curiosa: 'capacidade', convence: 'depoimento de outra mãe', desconfia: 'barulho e gasto de água', confunde: 'termos técnicos', entedia: 'enrolação', irrita: 'demora no atendimento' }),
      P('lj16', 'Antônio Carlos', 49, 'm', '👨🏾‍🦲', 'motorista de aplicativo, quer ar-condicionado', 'os caçadores de preço', 'tio', { ri: 'zoeira', empolga: 'instalação grátis', curiosa: 'consumo de energia', convence: 'conta de luz comparada', desconfia: 'instalação cobrada à parte', confunde: 'BTU, inverter e termo técnico', entedia: 'papo de marca', irrita: 'taxa escondida' }),
      P('lj17', 'Patrícia', 41, 'f', '👩🏻‍💼', 'gerente de RH, compra para o escritório', 'os que compram para trabalhar', 'formal', { ri: 'humor sutil', empolga: 'desconto por volume', curiosa: 'nota fiscal e prazo', convence: 'proposta por escrito', desconfia: 'prazo de entrega', confunde: 'pouca coisa', entedia: 'conversa comprida', irrita: 'informalidade e atraso' }),
      P('lj18', 'Gabriel', 26, 'm', '👨🏿', 'entregador, compra tudo parcelado', 'os caçadores de preço', 'jovem', { ri: 'zoeira', empolga: 'parcela baixa', curiosa: 'em quantas vezes dá para parcelar', convence: 'parcela que cabe no bolso', desconfia: 'juros', confunde: 'taxa e custo efetivo', entedia: 'papo técnico', irrita: 'arrogância' }),
      P('lj19', 'Dona Lúcia', 74, 'f', '👵🏿', 'viúva, veio com o neto', 'os clientes mais velhos', 'tia', { ri: 'piada leve', empolga: 'atenção, paciência e coisa fácil de usar', curiosa: 'se é fácil de usar', convence: 'vendedor paciente que explica', desconfia: 'golpe e promessa boa demais', confunde: 'tecnologia, sigla e termo técnico', entedia: 'história comprida', irrita: 'pressa e grosseria' }),
      P('lj20', 'Samuel', 37, 'm', '🧑🏾‍🎤', 'músico, quer uma caixa de som', 'os que compram para trabalhar', 'jovem', { ri: 'zoeira', empolga: 'produto potente e desconto', curiosa: 'potência e graves', convence: 'ouvir na loja', desconfia: 'potência inflada na caixa', confunde: 'nada de som', entedia: 'papo de garantia', irrita: 'vendedor que não deixa testar' }),
      P('lj21', 'Kátia', 46, 'f', '👩🏽‍🦳', 'compra sempre a mesma marca', 'os clientes mais velhos', 'cliente', { ri: 'humor leve', empolga: 'a marca que ela confia', curiosa: 'novidade da marca', convence: 'experiência própria', desconfia: 'marca desconhecida', confunde: 'nome de modelo', entedia: 'comparação longa', irrita: 'falar mal da marca dela' }),
      P('lj22', 'Leonardo', 31, 'm', '🧑🏻‍💻', 'programador, odeia ser abordado', 'os exigentes', 'tecnico', { ri: 'ironia', empolga: 'preço baixo e especificação boa', curiosa: 'especificação', convence: 'dado técnico correto', desconfia: 'papo de vendedor', confunde: 'nada técnico', entedia: 'conversa fiada', irrita: 'vendedor grudento e pressão' }),
      P('lj23', 'Vanessa', 39, 'f', '👩🏿‍🦱', 'cabeleireira, quer um secador profissional', 'os que compram para trabalhar', 'tia', { ri: 'fofoca', empolga: 'produto profissional e parcela que cabe', curiosa: 'potência', convence: 'teste no cabelo', desconfia: 'produto falsificado', confunde: 'termos técnicos', entedia: 'papo longo', irrita: 'vendedor que desconfia dela' }),
      P('lj24', 'Hugo', 55, 'm', '👨🏼‍💼', 'síndico, compra para o condomínio', 'os exigentes', 'formal', { ri: 'humor seco', empolga: 'orçamento com desconto', curiosa: 'nota fiscal e garantia', convence: 'três orçamentos comparados', desconfia: 'preço sem nota', confunde: 'pouca coisa', entedia: 'papo', irrita: 'enrolação e informalidade' }),
    ],
  },
];

// ---------- os balões (texto nosso; o Jev só escolhe a reação): tom × reação, e alguns por tipo de frase ----------
const BALOES = {
  jovem: {
    rindo: ['kkkkkk', 'KKKKK socorro', 'chorei kkk', 'mds 😂', 'essa foi boa kkk'],
    empolgado: ['bora!!', 'eu quero!', 'aí sim 🔥', 'manda o link!', 'brabo demais'],
    convencido: ['faz sentido', 'é real', 'tô dentro', 'agora sim', 'verdade'],
    curioso: ['como assim?', 'conta mais', 'oxe, sério?', 'e aí?', 'quero ver'],
    cetico: ['aham, sei', 'golpe? 🤨', 'mentira kkk', 'duvido', 'prova aí'],
    confuso: ['hein??', 'boiei', 'oi???', 'não entendi nada', 'traduz aí'],
    entediado: ['zzz', 'pula essa', 'acelera 2x', 'ok… e?', 'que preguiça'],
    incomodado: ['nossa, que isso', 'deu ruim', 'que grosso', 'vou sair', 'tá maluco?'],
  },
  tecnico: {
    rindo: ['hahaha', 'ok, essa foi boa', 'kkkk nerd', 'rachei'],
    empolgado: ['isso é útil!', 'quero testar', 'muito bom', 'vou usar amanhã'],
    convencido: ['bem embasado', 'faz sentido', 'número bom', 'concordo'],
    curioso: ['como funciona?', 'qual o custo?', 'tem o código?', 'e escala?'],
    cetico: ['fonte?', 'cadê o dado?', 'hype…', 'isso não escala'],
    confuso: ['não ficou claro', 'como assim?', 'qual o contexto?'],
    entediado: ['isso é básico', 'pula', 'já sei', 'enrolação'],
    incomodado: ['que arrogância', 'não precisava', 'desnecessário', 'feio isso'],
  },
  formal: {
    rindo: ['hahaha', 'muito bom!', 'essa foi ótima', 'rs'],
    empolgado: ['excelente!', 'quero aplicar', 'isso me ajuda', 'que ótimo'],
    convencido: ['faz todo sentido', 'bem colocado', 'concordo', 'bom argumento'],
    curioso: ['interessante…', 'e como seria?', 'pode detalhar?', 'hum, curioso'],
    cetico: ['será mesmo?', 'qual a fonte?', 'exagero', 'não sei não'],
    confuso: ['não entendi o termo', 'como assim?', 'pode explicar?'],
    entediado: ['vamos ao ponto', 'longo demais', 'hum…', 'olha o relógio'],
    incomodado: ['que deselegante', 'desnecessário', 'falta de respeito', 'lamentável'],
  },
  tio: {
    rindo: ['hahaha boa!', 'essa é boa, rapaz!', 'kkkk muito bom', 'rapaz… kkk'],
    empolgado: ['opa, gostei!', 'isso eu quero!', 'aí sim!', 'bom demais'],
    convencido: ['é isso aí', 'faz sentido, viu', 'assim eu acredito', 'falou bonito'],
    curioso: ['como é que é?', 'e como faz?', 'explica isso aí', 'hum, interessante'],
    cetico: ['sei não, hein', 'tá bom, tá bom', 'isso é golpe?', 'conversa…'],
    confuso: ['hã?', 'como é que é?', 'fala português!', 'não entendi nada'],
    entediado: ['zzz', 'e o futebol?', 'chega, né', 'bocejo…'],
    incomodado: ['que falta de educação!', 'opa, opa!', 'mais respeito!', 'que isso, rapaz?'],
  },
  tia: {
    rindo: ['ai, que engraçado!', 'kkkk ai ai', 'menino, que graça!', 'rachei de rir'],
    empolgado: ['ai, que maravilha!', 'eu quero!', 'que bênção!', 'adorei!'],
    convencido: ['agora entendi!', 'é verdade, viu', 'assim sim', 'bem explicado'],
    curioso: ['é mesmo?', 'conta mais!', 'e como faz?', 'nossa, como?'],
    cetico: ['será, meu filho?', 'hum… sei não', 'isso é golpe?', 'bom demais pra ser verdade'],
    confuso: ['não entendi nada', 'fala devagar!', 'que palavra é essa?', 'hein?'],
    entediado: ['ai, que sono', 'tá comprido…', 'e aí?', 'bocejo…'],
    incomodado: ['credo!', 'que grosseria!', 'nossa senhora!', 'que deselegante!'],
  },
  pratico: {
    rindo: ['kkkk verdade', 'hahaha real', 'boa!', 'essa foi boa'],
    empolgado: ['quero isso!', 'me ajuda demais', 'bora fazer', 'perfeito!'],
    convencido: ['funciona mesmo', 'faz sentido', 'com número eu acredito', 'boa prova'],
    curioso: ['quanto custa?', 'como começo?', 'dá pra usar?', 'leva quanto tempo?'],
    cetico: ['na prática não é assim', 'sei…', 'e o tempo pra isso?', 'duvido'],
    confuso: ['oi?', 'traduz isso', 'complicou', 'não peguei'],
    entediado: ['vai direto', 'tenho pouco tempo', 'e daí?', 'zzz'],
    incomodado: ['que isso?!', 'desnecessário', 'grosso', 'perdeu a razão'],
  },
  investidor: {
    rindo: ['hahaha', 'boa', 'essa foi boa', 'rs'],
    empolgado: ['quero entrar', 'manda o material', 'isso escala', 'gostei muito'],
    convencido: ['números sólidos', 'faz sentido', 'tração real', 'convincente'],
    curioso: ['e o custo por cliente?', 'qual a margem?', 'quem é o cliente?', 'e a concorrência?'],
    cetico: ['de onde vem esse número?', 'sem concorrente? sei', 'caro demais', 'hum…'],
    confuso: ['não entendi o modelo', 'como ganha dinheiro?', 'pode repetir?'],
    entediado: ['próximo slide', 'vamos aos números', 'olha o celular', 'tempo…'],
    incomodado: ['arrogante', 'postura ruim', 'não gostei', 'passo'],
  },
  aluno: {
    rindo: ['KKKKKK', 'professor comédia', 'kkk morri', 'essa foi boa, prof'],
    empolgado: ['agora vai!', 'isso cai?! 🔥', 'bora!', 'anotei tudo'],
    convencido: ['aaah, entendi', 'faz sentido', 'agora foi', 'boa, prof'],
    curioso: ['como assim?', 'e se cair?', 'conta mais', 'sério?'],
    cetico: ['isso cai mesmo?', 'duvido', 'fácil nada', 'aham'],
    confuso: ['oi???', 'boiei', 'volta, prof', 'não entendi nada'],
    entediado: ['zzz', 'que horas acaba?', 'ai, que sono', 'tô morto'],
    incomodado: ['pesado, prof', 'que isso…', 'humilhou', 'desnecessário'],
  },
  cliente: {
    rindo: ['hahaha', 'boa essa', 'kkkk', 'engraçado'],
    empolgado: ['vou levar!', 'quanto fica?', 'quero!', 'gostei muito'],
    convencido: ['faz sentido', 'agora sim', 'bom negócio', 'me convenceu'],
    curioso: ['e o preço?', 'tem garantia?', 'parcela?', 'tem outra cor?'],
    cetico: ['só hoje? sei…', 'tem pegadinha', 'na outra loja é mais barato', 'hum…'],
    confuso: ['o que é isso?', 'em português?', 'não entendi', 'que sigla é essa?'],
    entediado: ['e o preço?', 'vou dar uma volta', 'zzz', 'vou pensar'],
    incomodado: ['que vendedor chato', 'não vou levar', 'que pressão!', 'nossa…'],
  },
  // quando o tipo da frase combina com a reação, metade das vezes o balão vem daqui
  porTipo: {
    pergunta: { curioso: ['eu!', '🙋 eu!', 'eu já!'], empolgado: ['eu!!', '🙋 eu!'], convencido: ['sim!'] },
    jargao: { confuso: ['hein?', 'que sigla é essa?', 'em português?', 'traduz aí'] },
    promessa: { cetico: ['aham, sei…', 'cadê a prova?', 'fácil assim?'] },
    venda: { entediado: ['lá vem venda…', 'pula o anúncio'], incomodado: ['que insistência', 'não vou comprar'] },
    dado: { convencido: ['número bom!', 'com número, sim'], cetico: ['de onde é esse número?'] },
    enrolacao: { entediado: ['vai direto ao ponto', 'enrolou…', 'zzz'] },
  },
};

const PLATEIA = Object.fromEntries(PLATEIAS.map((p) => [p.id, p]));
const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const fem = (g, m, f) => (g === 'f' ? f : m);

// humor que dura: quem saiu da frase anterior irritado, entediado ou desconfiado leva isso para a próxima
const DURA = { incomodado: ['incomodado', 'incomodada'], entediado: ['entediado', 'entediada'], cetico: ['desconfiado', 'desconfiada'] };

// a ficha que vai para o Jev (alvo da pergunta "reacao" de cada pessoa)
function ficha(p, antes) {
  const memoria = DURA[antes] ? ` Saiu da frase anterior ${fem(p.g, DURA[antes][0], DURA[antes][1])}.` : '';
  return `${p.nome}, ${p.idade} anos, ${p.vida}. Ri: ${p.ri}. Empolga: ${p.empolga}. ${fem(p.g, 'Curioso', 'Curiosa')}: ${p.curiosa}. Convence: ${p.convence}. Desconfia: ${p.desconfia}. ${fem(p.g, 'Confuso', 'Confusa')}: ${p.confunde}. Entedia: ${p.entedia}. Irrita: ${p.irrita}.${memoria}`;
}

export default {
  id: 'plateia-ao-vivo',
  titulo: 'Plateia que Reage',
  emoji: '🎭',
  categoria: 'ao-vivo',
  ordem: 0.3,
  resumo: 'Fale para 40 pessoas virtuais e veja cada uma reagir na hora: quem ri, quem boceja, quem se convence.',
  descricao: 'Cada frase que você fala vai numa chamada só: o Jev julga a reação de cada pessoa da plateia pela ficha dela (rir, se empolgar, desconfiar, se perder, se irritar…), o tipo da frase e o gancho, em ~0,4 s e ~US$ 0,0006. É uma plateia inteira a cada frase, e a lista fechada de reações garante que cada rosto sempre tem uma expressão válida. Para adaptar, troque as fichas pelo seu público: alunos, banca de entrevista, clientes.',
  marcas: ['imediato', 'volume', 'lista fechada'],
  motor: 'palco',
  tema: { acento: '#e11d48', acento2: '#fbbf24' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'escolha a plateia, ligue o microfone e fale como se estivesse no palco: conte uma piada, faça uma promessa exagerada, solte um jargão, seja arrogante. Cada frase muda os rostos. No fim, aperte "Encerrar" para ver o relatório.',
  },
  plateias: PLATEIAS,
  reacoes: REACOES,
  tipos: TIPOS,
  baloes: BALOES,
  contexto: {
    app: 'plateia virtual: cada pessoa da plateia reage, pela própria ficha, à frase que alguém acabou de dizer no palco',
  },
  decisoes: [
    {
      id: 'reacao', tipo: 'choice', titulo: 'Reação de cada pessoa',
      pergunta: 'Como esta pessoa da plateia reage à frase_atual? Siga a ficha, que lista os gatilhos de cada reação; se nada da ficha foi tocado: neutro.',
      opcoes: REACOES.map((r) => ({ id: r.id, rotulo: r.rotulo, icone: r.icone, desc: r.desc })),
    },
    {
      id: 'tipo', tipo: 'choice', titulo: 'Tipo da frase',
      pergunta: 'Que tipo de frase é a frase_atual de quem fala no palco? Se tiver mais de um tipo, escolha o primeiro desta ordem: grosseria, piada, jargão, venda, pergunta, promessa, dado, história, enrolação, comum.',
      opcoes: TIPOS.map((t) => ({ id: t.id, rotulo: t.rotulo, icone: t.icone, desc: t.desc })),
    },
    {
      id: 'gancho', tipo: 'score', titulo: 'Gancho',
      pergunta: 'A frase_atual prenderia a atenção da plateia (faria a pessoa continuar ouvindo)?',
      niveis: [
        { rotulo: 'derruba', desc: 'derruba a atenção: enrolação, repetição, grosseria que faz ir embora' },
        { rotulo: 'fraca', desc: 'fraca: frase de passagem, sem novidade' },
        { rotulo: 'segura', desc: 'segura: informação útil ou explicação clara' },
        { rotulo: 'prende', desc: 'prende: número forte, história, pergunta intrigante, promessa interessante' },
        { rotulo: 'irresistível', desc: 'irresistível: piada boa, revelação, virada, mistério que obriga a continuar' },
      ],
    },
  ],
  jogadas: {
    // a cada frase (e nas pausas das frases longas): tipo + gancho + uma reação por pessoa da plateia escolhida.
    // A página manda só: plateia (id), frase, as 3 anteriores, se é parcial e a reação anterior de cada pessoa.
    reagir: {
      estado: (d) => {
        const pl = PLATEIA[d.plateia] || PLATEIAS[0];
        const ant = (Array.isArray(d.anteriores) ? d.anteriores : []).slice(-3).map((x) => corta(x, 240));
        return {
          plateia: `${pl.rotulo}: ${pl.quem}`,
          frases_anteriores_so_contexto: ant.length ? ant : ['(é a primeira frase)'],
          frase_atual: corta(d.frase, 420),
          humor: 'quem saiu da frase anterior irritado, entediado ou desconfiado continua assim, a não ser que a frase_atual traga algo forte da ficha (a piada do gosto dela, a prova que ela pede); um pedido de desculpas acalma só quem não se ofende fácil; risada e empolgação não duram sozinhas',
          ...(d.parcial ? { observacao: 'a frase_atual ainda está sendo dita: julgue o que já foi dito' } : {}),
        };
      },
      perguntas: (d) => {
        const pl = PLATEIA[d.plateia] || PLATEIAS[0];
        const antes = d.antes && typeof d.antes === 'object' && !Array.isArray(d.antes) ? d.antes : {};
        return [
          { chave: 'tipo', decisao: 'tipo' },
          { chave: 'gancho', decisao: 'gancho' },
          ...pl.pessoas.map((p) => ({ chave: 'r_' + p.id, decisao: 'reacao', alvo: ficha(p, antes[p.id]) })),
        ];
      },
    },
  },
  // testes: frases com a reação esperada de pessoas específicas onde a reação é clara (lista = mais de uma aceita)
  testes: [
    { titulo: 'YouTube · promessa exagerada', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Hoje eu vou te mostrar como ficar rico com inteligência artificial em sete dias, sem fazer nada.', anteriores: ['Fala, pessoal, tudo bem com vocês?'] }, esperado: { tipo: 'promessa', r_yt01: 'cetico', r_yt28: 'cetico', r_yt04: 'cetico', r_yt03: ['empolgado', 'curioso'] } },
    { titulo: 'YouTube · piada', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Brincadeira! Se fosse fácil assim, eu estaria numa praia, e não gravando isto às duas da manhã.', anteriores: ['Fala, pessoal, tudo bem com vocês?', 'Hoje eu vou te mostrar como ficar rico com inteligência artificial em sete dias, sem fazer nada.'] }, esperado: { tipo: 'piada', r_yt03: 'rindo', r_yt12: 'rindo', r_yt30: 'rindo', r_yt02: 'rindo' } },
    { titulo: 'YouTube · caso com número', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Agora falando sério: a Márcia, que tem uma marmitaria em Guarulhos, passou de 30 para 85 pedidos por semana respondendo o WhatsApp com IA.', anteriores: ['Brincadeira! Se fosse fácil assim, eu estaria numa praia, e não gravando isto às duas da manhã.'] }, esperado: { tipo: 'dado', r_yt02: 'convencido', r_yt35: 'convencido', r_yt08: 'convencido', r_yt11: 'cetico' } },
    { titulo: 'YouTube · jargão', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Para isso, ela usou um agente com RAG, embeddings e um webhook no n8n.', anteriores: ['Agora falando sério: a Márcia, que tem uma marmitaria em Guarulhos, passou de 30 para 85 pedidos por semana respondendo o WhatsApp com IA.'] }, esperado: { tipo: 'jargao', r_yt04: 'confuso', r_yt02: 'confuso', r_yt26: 'confuso', r_yt01: ['curioso', 'neutro', 'convencido'], r_yt28: ['curioso', 'neutro', 'convencido'] } },
    { titulo: 'YouTube · arrogância', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'E quem não entendeu isso, sinceramente, nem deveria estar assistindo a este canal.', anteriores: ['Para isso, ela usou um agente com RAG, embeddings e um webhook no n8n.'] }, esperado: { tipo: 'grosseria', r_yt04: 'incomodado', r_yt36: 'incomodado', r_yt02: 'incomodado', r_yt01: 'incomodado' } },
    { titulo: 'YouTube · pergunta à plateia', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Quem aqui já perdeu uma venda porque demorou para responder no WhatsApp?', anteriores: ['Fala, pessoal, tudo bem com vocês?'] }, esperado: { tipo: 'pergunta', r_yt10: ['curioso', 'empolgado'], r_yt35: ['curioso', 'empolgado'], r_yt27: ['curioso', 'empolgado'], r_yt25: ['entediado', 'neutro'] } },
    // memória de humor: depois da frase arrogante (todos saíram incomodados), a piada de desculpas reconquista uns e não outros
    { titulo: 'YouTube · desculpas depois da arrogância', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Desculpa, foi grosseiro: vai ficar tão simples que até o meu avô, que imprime e-mail para ler, vai conseguir fazer.', anteriores: ['Para isso, ela usou um agente com RAG, embeddings e um webhook no n8n.', 'E quem não entendeu isso, sinceramente, nem deveria estar assistindo a este canal.'], antes: Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['yt' + String(i + 1).padStart(2, '0'), 'incomodado'])) }, esperado: { r_yt14: 'rindo', r_yt02: 'rindo', r_yt23: ['incomodado', 'cetico', 'entediado'] } },
    { titulo: 'YouTube · chamada para ação', jogada: 'reagir', dados: { plateia: 'youtube', frase: 'Então se inscreve, ativa o sininho e comenta aqui embaixo qual é o seu negócio.', anteriores: ['Brincadeira de novo: eu explico tudo passo a passo, sem sigla nenhuma, prometo.'] }, esperado: { tipo: 'venda', r_yt23: ['entediado', 'neutro'] } },
    { titulo: 'Investidores · tração', jogada: 'reagir', dados: { plateia: 'investidores', frase: 'Hoje temos 1.200 clientes pagantes, faturamos 180 mil reais por mês e crescemos 14% ao mês nos últimos seis meses.', anteriores: ['Bom dia a todos, obrigado pelo tempo de vocês.'] }, esperado: { tipo: 'dado', r_in01: 'convencido', r_in02: ['convencido', 'empolgado'], r_in07: ['convencido', 'curioso'] } },
    { titulo: 'Investidores · mercado de trilhões', jogada: 'reagir', dados: { plateia: 'investidores', frase: 'Nosso mercado é de três trilhões de dólares e, sinceramente, nós não temos nenhum concorrente.', anteriores: ['Hoje temos 1.200 clientes pagantes, faturamos 180 mil reais por mês e crescemos 14% ao mês nos últimos seis meses.'] }, esperado: { r_in01: 'cetico', r_in02: 'cetico', r_in08: 'cetico' } },
    { titulo: 'Investidores · palavra da moda', jogada: 'reagir', dados: { plateia: 'investidores', frase: 'Somos uma plataforma disruptiva de IA generativa com blockchain e metaverso, uma sinergia nunca vista.', anteriores: ['Bom dia a todos, obrigado pelo tempo de vocês.'] }, esperado: { r_in06: ['cetico', 'incomodado'], r_in02: ['cetico', 'incomodado'], r_in03: ['confuso', 'cetico'] } },
    { titulo: 'Cursinho · cai no ENEM', jogada: 'reagir', dados: { plateia: 'cursinho', frase: 'Gente, isso aqui cai todo ano no ENEM, então presta atenção que é ponto garantido.', anteriores: ['Boa noite, turma, vamos começar.'] }, esperado: { r_cu01: ['empolgado', 'convencido', 'curioso'], r_cu07: ['empolgado', 'convencido', 'curioso'] } },
    { titulo: 'Cursinho · humilhação', jogada: 'reagir', dados: { plateia: 'cursinho', frase: 'Quem tirou nota baixa no simulado é porque não estudou, simples assim, não tem desculpa.', anteriores: ['Boa noite, turma, vamos começar.'] }, esperado: { tipo: 'grosseria', r_cu03: 'incomodado', r_cu09: 'incomodado', r_cu23: 'incomodado' } },
    { titulo: 'Cursinho · piada', jogada: 'reagir', dados: { plateia: 'cursinho', frase: 'A mitocôndria é a usina de energia da célula, igualzinho a vocês às sete da manhã: desligada.', anteriores: ['Boa noite, turma, vamos começar.'] }, esperado: { tipo: 'piada', r_cu02: 'rindo', r_cu22: 'rindo', r_cu08: 'rindo' } },
    { titulo: 'Cursinho · cálculo pesado', jogada: 'reagir', dados: { plateia: 'cursinho', frase: 'Agora a gente deriva a função composta pela regra da cadeia e depois integra por partes.', anteriores: ['Boa noite, turma, vamos começar.'] }, esperado: { r_cu05: 'confuso', r_cu29: 'confuso', r_cu04: ['convencido', 'curioso', 'empolgado', 'neutro'] } },
    { titulo: 'Loja · desconto e parcela', jogada: 'reagir', dados: { plateia: 'loja', frase: 'Essa geladeira está com 20% de desconto e você parcela em 10 vezes sem juros, com entrega grátis.', anteriores: ['Boa tarde, pessoal, deixa eu mostrar a oferta da semana.'] }, esperado: { r_lj01: ['empolgado', 'convencido'], r_lj18: ['empolgado', 'convencido'], r_lj10: 'cetico' } },
    { titulo: 'Loja · pressão', jogada: 'reagir', dados: { plateia: 'loja', frase: 'Corre que é só hoje, são as últimas unidades, se não fechar agora vai perder!', anteriores: ['Boa tarde, pessoal, deixa eu mostrar a oferta da semana.'] }, esperado: { r_lj08: ['cetico', 'incomodado'], r_lj03: ['cetico', 'incomodado'], r_lj22: ['incomodado', 'cetico'] } },
    { titulo: 'Loja · ficha técnica', jogada: 'reagir', dados: { plateia: 'loja', frase: 'Ela tem painel QLED de 120 hertz, HDR10+, Dolby Vision e processador 4K com upscaling.', anteriores: ['Boa tarde, pessoal, deixa eu mostrar a oferta da semana.'] }, esperado: { tipo: 'jargao', r_lj04: 'confuso', r_lj19: 'confuso', r_lj05: ['convencido', 'curioso', 'empolgado', 'neutro'] } },
  ],
};

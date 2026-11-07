// Editor que Corta Enquanto Você Fala: você grava falando e, a cada frase que fecha, o Jev decide se ela fica no corte
// final ou sai (hesitação, bastidor, frase pela metade, repetição) e se ela refaz a anterior; ao parar, a edição está pronta.
// O que é ordem explícita o código decide sozinho (emenda.mjs): "corta isso" tira o que foi dito antes, e quando a mesma
// frase é recomeçada só a última tentativa fica.
// Para adaptar (podcast, aula, narração): troque as opções de "tipo" e as regras das perguntas; os tempos do corte ficam
// em emenda.mjs (PADRAO) e a tela em palco.js.

const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

// como cada frase anterior aparece para o Jev (a página manda só a chave; o texto é este)
const STATUS = {
  mantida: 'ficou no corte',
  pendente: 'ainda sem decisão',
  suspensa: 'parece pela metade (esperando a próxima frase)',
  cortada_metade: 'cortada: ficou pela metade',
  cortada_refeita: 'cortada: foi refeita depois',
  cortada_bastidor: 'cortada: bastidor',
  cortada_hesitacao: 'cortada: hesitação',
  cortada_repeticao: 'cortada: repetição',
  cortada_apagada: 'cortada: a pessoa mandou cortar',
  cortada_comando: 'cortada: era uma ordem para a edição',
  manual_mantida: 'a pessoa mandou manter',
  manual_cortada: 'a pessoa mandou cortar',
};

// frases de uma gravação de exemplo, para os testes (como o reconhecedor do Chrome devolve: minúsculas, sem pontuação)
const P = {
  p1: 'hoje eu vou mostrar como',
  p2: 'não peraí',
  p3: 'hoje eu vou mostrar três jeitos de gravar um vídeo sem precisar editar depois',
  p4: 'é tipo assim',
  p5: 'o primeiro jeito é escrever o roteiro inteiro antes de ligar a câmera',
  p6: 'o segundo jeito é gravar em blocos curtos',
  p7: 'ops vou de novo',
  p8: 'o segundo jeito é gravar em blocos curtos de um minuto cada',
  p9: 'e o terceiro jeito é deixar o editor cortar os erros enquanto você fala',
};
const ant = (...xs) => xs.map(([texto, status]) => ({ texto, status }));

export default {
  id: 'editor-corta',
  titulo: 'Editor que Corta Enquanto Você Fala',
  emoji: '✂️',
  categoria: 'ao-vivo',
  ordem: 0.6,
  resumo: 'Grave falando. Errou e recomeçou, ou disse "corta isso"? O erro já sai, e no fim você ouve a versão editada.',
  descricao: 'Você aperta REC e fala. A cada frase que fecha, o Jev decide em ~0,3 s se ela fica ou sai (hesitação, bastidor, frase pela metade, repetição) e se ela é uma nova tentativa da anterior. O que é ordem sua o código cumpre sem perguntar: "corta isso", "apaga essa parte", "esquece o que eu falei", "vou de novo" tiram o que você acabou de dizer, mesmo ditos na mesma respiração; e quando você recomeça a mesma frase, só a última tentativa fica. A linha do tempo mostra os cortes na hora e, quando você para, a versão editada já está pronta para ouvir e baixar em .wav. Para adaptar, troque as regras de corte pelas do seu formato: podcast, aula, narração.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#14b8a6', acento2: '#f43f5e' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte REC e grave como num vídeo de verdade: comece uma frase e diga "não, peraí", recomece; recomece a mesma frase duas ou três vezes (só a última fica); diga uma frase e emende "corta isso"; solte um "é… tipo assim". Ao parar, ouça a versão editada e compare com o original.',
  },
  contexto: {
    tarefa: 'editar uma gravação falada (vídeo para o YouTube, podcast ou aula): decidir, frase a frase, o que fica no corte final',
  },
  decisoes: [
    {
      id: 'tipo', tipo: 'choice', titulo: 'O que é a frase',
      pergunta: 'Edição de uma gravação falada (vídeo, podcast ou aula). A frase atual acabou de ser dita e vem da transcrição automática, muitas vezes sem pontuação. Ela fica no corte final? Classifique a frase atual pelo que ela é para o público; as frases anteriores (no estado) são só contexto. Regras: frase com uma ideia completa é conteúdo, mesmo com um "é" ou um "tipo" no meio, mesmo começando com "e", "então" ou "aí", e mesmo que recomece uma frase anterior (refazer uma frase para corrigir é conteúdo). Na dúvida entre conteúdo e outra opção, escolha conteúdo.',
      opcoes: [
        { id: 'conteudo', rotulo: 'Conteúdo', icone: '✅', tom: 'bom', desc: 'conteúdo: diz algo ao público com o sentido completo: uma ideia, explicação, exemplo, passo, opinião, saudação ("fala, pessoal") ou chamada para ação ("se inscreve no canal")' },
        { id: 'hesitacao', rotulo: 'Hesitação', icone: '😶', tom: 'ruim', desc: 'hesitação: a frase inteira é só enchimento, sem ideia nenhuma: "é…", "hã", "hum", "tipo assim", "então…", "deixa eu ver", "como é que eu falo"' },
        { id: 'bastidor', rotulo: 'Bastidor', icone: '🎬', tom: 'ruim', desc: 'bastidor: fala de gravação, para si mesmo ou para a equipe, que não é para o público: "ops", "errei", "vou de novo", "de novo", "corta essa", "peraí", "não, pera", "esqueci o que ia falar", "tá gravando?", "isso eu corto depois"' },
        { id: 'metade', rotulo: 'Pela metade', icone: '✂️', tom: 'medio', desc: 'pela metade: começa uma ideia e para antes de completar o sentido (termina em "como", "que", "de", "é", "porque"…), ou se enrola e desiste no meio' },
        { id: 'repeticao', rotulo: 'Repetição', icone: '🔁', tom: 'ruim', desc: 'repetição: só repete uma ideia que JÁ FICOU no corte numa frase anterior, sem acrescentar nada ("como eu falei…", "ou seja, é isso", "é isso, é isso aí")' },
      ],
    },
    {
      id: 'refaz_anterior', tipo: 'noul', titulo: 'Refez a anterior?', rotulo: 'nova tentativa da frase anterior', icone: '↻', limiar: 0.5,
      pergunta: 'Edição de uma gravação: a pessoa errou e recomeçou a frase? Compare a frase atual com a frase anterior (as duas estão abaixo). SIM quando a frase atual é uma nova tentativa da anterior: diz a mesma ideia de novo, quase sempre recomeçando com as mesmas palavras, para corrigir um erro, trocar uma palavra, completar o que ficou pela metade ou dizer melhor (aí a anterior sai do corte). NÃO quando a frase atual continua o assunto, acrescenta uma informação nova, passa para o próximo item (ex.: "o primeiro…" e depois "o segundo…"), retoma de propósito algo já dito ("como eu falei", "ou seja", "resumindo"), é um comentário de bastidor ou uma hesitação, ou fala de outra coisa, mesmo usando palavras parecidas.',
    },
    {
      id: 'continua_anterior', tipo: 'noul', titulo: 'Completa a anterior?', rotulo: 'continuação da frase pela metade', icone: '↪', limiar: 0.5,
      pergunta: 'Edição de uma gravação: a frase anterior ficou pela metade. A frase atual é a CONTINUAÇÃO dela, dita depois de uma pausa (as duas juntas formam uma frase só)? SIM quando a frase atual começa de onde a anterior parou, sem repetir o começo, e completa o sentido (ex.: «o primeiro jeito é» + «gravar tudo de uma vez»). NÃO quando a frase atual recomeça a frase do início (nova tentativa), é um comentário de bastidor ou uma hesitação, ou fala de outra coisa.',
    },
    {
      id: 'manda_apagar', tipo: 'noul', titulo: 'Mandou cortar?', rotulo: 'ordem para cortar o que foi dito', icone: '🗣️', limiar: 0.6,
      pergunta: 'Edição de uma gravação: na frase atual, a pessoa está falando com a EDIÇÃO e mandando tirar o que ela acabou de dizer? SIM quando a frase é uma ordem ou um aviso de que o trecho anterior não serve: cortar, apagar, tirar, esquecer, desconsiderar, refazer ou gravar de novo ("corta isso", "apaga essa parte", "esquece o que eu falei", "isso não ficou bom, de novo", "não gostei, vou refazer", "errei, deixa eu falar de novo"). NÃO quando a frase é conteúdo para o público, mesmo usando essas palavras para falar de outra coisa ("o editor corta os erros sozinho", "não esquece de se inscrever", "corta a cebola em cubos"), quando é só uma hesitação, ou um comentário de bastidor que não manda tirar nada ("tá gravando?", "deixa eu ver aqui", "peraí").',
    },
    {
      id: 'gancho', tipo: 'score', titulo: 'Gancho da abertura',
      pergunta: 'Abertura de um vídeo: esta frase prende quem acabou de dar o play? Julgue só a frase abaixo, como ela está.',
      niveis: [
        { rotulo: 'fraco', desc: 'não é abertura de conteúdo (bastidor, hesitação, frase pela metade) ou é genérica ("oi, tudo bem", "bom dia, pessoal")' },
        { rotulo: 'morno', desc: 'só apresenta o tema, sem promessa ("hoje eu vou falar de edição")' },
        { rotulo: 'bom', desc: 'promete um resultado claro ou traz um número ("três dicas para gravar melhor")' },
        { rotulo: 'forte', desc: 'promessa concreta e específica + curiosidade ou uma dor do público ("o erro que faz você perder metade da audiência", "como dobrar as visualizações sem gastar nada")' },
      ],
    },
  ],
  jogadas: {
    // a cada frase que o reconhecedor fecha: a frase, as 3 anteriores com o que já foi decidido, e com quem comparar
    frase: {
      estado: (d) => {
        const ants = Array.isArray(d.anteriores) ? d.anteriores.slice(-3) : [];
        return {
          frase_atual: corta(d.frase, 320),
          frases_anteriores: ants.length
            ? ants.map((a) => ({ frase: corta(a && a.texto, 200), decisao: STATUS[a && a.status] || STATUS.pendente }))
            : 'nenhuma: esta é a primeira frase da gravação',
        };
      },
      perguntas: (d) => {
        const f = corta(d.frase, 320);
        const q = [{ chave: 'tipo', decisao: 'tipo', alvo: `Frase atual: «${f}»` }];
        if (d.comparar) q.push({ chave: 'refaz', decisao: 'refaz_anterior', alvo: `Frase anterior: «${corta(d.comparar, 300)}»\nFrase atual: «${f}»` });
        if (d.metade) q.push({ chave: 'continua', decisao: 'continua_anterior', alvo: `Frase que ficou pela metade: «${corta(d.metade, 300)}»\nFrase atual: «${f}»` });
        if (d.abertura) q.push({ chave: 'gancho', decisao: 'gancho', alvo: `Frase: «${f}»` });
        if (d.curta) q.push({ chave: 'apagar', decisao: 'manda_apagar', alvo: `Frase atual: «${f}»` });
        return q;
      },
    },
  },
  testes: [
    // a gravação de exemplo, frase a frase, com o que a tela manda de verdade
    { titulo: 'começo abandonado', jogada: 'frase', dados: { frase: P.p1, abertura: true }, esperado: { tipo: 'metade', gancho: 0 } },
    { titulo: 'não, peraí', jogada: 'frase', dados: { frase: P.p2, anteriores: ant([P.p1, 'suspensa']), comparar: P.p1, metade: P.p1, abertura: true }, esperado: { tipo: 'bastidor', refaz: false, continua: false, gancho: 0 } },
    { titulo: 'recomeça a abertura', jogada: 'frase', dados: { frase: P.p3, anteriores: ant([P.p1, 'cortada_metade'], [P.p2, 'cortada_bastidor']), comparar: P.p1, abertura: true }, esperado: { tipo: 'conteudo', refaz: true, gancho: [2, 3] } },
    { titulo: 'é… tipo assim', jogada: 'frase', dados: { frase: P.p4, anteriores: ant([P.p2, 'cortada_bastidor'], [P.p3, 'mantida']), comparar: P.p3, abertura: true }, esperado: { tipo: 'hesitacao', refaz: false } },
    { titulo: 'primeiro item', jogada: 'frase', dados: { frase: P.p5, anteriores: ant([P.p3, 'mantida'], [P.p4, 'cortada_hesitacao']), comparar: P.p3, abertura: true }, esperado: { tipo: 'conteudo', refaz: false } },
    { titulo: 'segundo item', jogada: 'frase', dados: { frase: P.p6, anteriores: ant([P.p3, 'mantida'], [P.p4, 'cortada_hesitacao'], [P.p5, 'mantida']), comparar: P.p5 }, esperado: { tipo: 'conteudo', refaz: false } },
    { titulo: 'ops, vou de novo', jogada: 'frase', dados: { frase: P.p7, anteriores: ant([P.p4, 'cortada_hesitacao'], [P.p5, 'mantida'], [P.p6, 'mantida']), comparar: P.p6 }, esperado: { tipo: 'bastidor', refaz: false } },
    { titulo: 'refaz o segundo item', jogada: 'frase', dados: { frase: P.p8, anteriores: ant([P.p5, 'mantida'], [P.p6, 'mantida'], [P.p7, 'cortada_bastidor']), comparar: P.p6 }, esperado: { tipo: 'conteudo', refaz: true } },
    { titulo: 'terceiro item', jogada: 'frase', dados: { frase: P.p9, anteriores: ant([P.p6, 'cortada_refeita'], [P.p7, 'cortada_bastidor'], [P.p8, 'mantida']), comparar: P.p8 }, esperado: { tipo: 'conteudo', refaz: false } },
    { titulo: 'repete o que já disse', jogada: 'frase', dados: { frase: 'como eu falei o editor corta os erros sozinho', anteriores: ant([P.p7, 'cortada_bastidor'], [P.p8, 'mantida'], [P.p9, 'mantida']), comparar: P.p9 }, esperado: { tipo: 'repeticao', refaz: false } },
    // outros jeitos de errar numa gravação
    { titulo: 'saudação', jogada: 'frase', dados: { frase: 'fala pessoal tudo bem', abertura: true }, esperado: { tipo: 'conteudo', gancho: 0 } },
    { titulo: 'deixa eu ver', jogada: 'frase', dados: { frase: 'deixa eu ver', anteriores: ant(['o primeiro passo é abrir o editor', 'mantida']), comparar: 'o primeiro passo é abrir o editor' }, esperado: { tipo: 'hesitacao', refaz: false } },
    { titulo: 'corta essa', jogada: 'frase', dados: { frase: 'corta essa parte', anteriores: ant(['o preço é trezentos reais', 'mantida']) }, esperado: { tipo: 'bastidor' } },
    { titulo: 'tá gravando', jogada: 'frase', dados: { frase: 'tá gravando', abertura: true }, esperado: { tipo: 'bastidor', gancho: 0 } },
    { titulo: 'e o segredo é', jogada: 'frase', dados: { frase: 'e o segredo é', anteriores: ant(['hoje eu vou falar de iluminação', 'mantida']) }, esperado: { tipo: 'metade' } },
    { titulo: 'continua depois da pausa', jogada: 'frase', dados: { frase: 'gravar tudo de uma vez sem parar', anteriores: ant(['o primeiro jeito é', 'suspensa']), comparar: 'o primeiro jeito é', metade: 'o primeiro jeito é' }, esperado: { continua: true, refaz: false, tipo: ['conteudo', 'metade'] } },
    { titulo: 'recomeçar não é continuar', jogada: 'frase', dados: { frase: 'hoje eu vou mostrar três jeitos de editar', anteriores: ant([P.p1, 'suspensa']), comparar: P.p1, metade: P.p1 }, esperado: { continua: false, refaz: true, tipo: 'conteudo' } },
    { titulo: 'hum', jogada: 'frase', dados: { frase: 'hum', anteriores: ant(['vamos falar de microfone', 'mantida']) }, esperado: { tipo: 'hesitacao' } },
    { titulo: 'esqueci', jogada: 'frase', dados: { frase: 'esqueci o que eu ia falar', anteriores: ant(['o terceiro motivo é', 'suspensa']), metade: 'o terceiro motivo é' }, esperado: { tipo: 'bastidor', continua: false } },
    { titulo: 'então…', jogada: 'frase', dados: { frase: 'então', anteriores: ant(['o primeiro passo é abrir o editor', 'mantida']), comparar: 'o primeiro passo é abrir o editor' }, esperado: { tipo: 'hesitacao', refaz: false } },
    { titulo: 'abertura de podcast', jogada: 'frase', dados: { frase: 'hoje a gente conversa com a Marina que saiu do zero e chegou a mil alunos em seis meses', abertura: true }, esperado: { tipo: 'conteudo', gancho: [2, 3] } },
    { titulo: 'chamada para ação', jogada: 'frase', dados: { frase: 'se esse vídeo te ajudou se inscreve no canal', anteriores: ant(['e o terceiro é pedir ajuda', 'mantida']), comparar: 'e o terceiro é pedir ajuda' }, esperado: { tipo: 'conteudo', refaz: false } },
    { titulo: 'troca uma palavra', jogada: 'frase', dados: { frase: 'o curso custa duzentos e noventa e sete reais', anteriores: ant(['o curso custa trezentos reais', 'mantida']), comparar: 'o curso custa trezentos reais' }, esperado: { tipo: 'conteudo', refaz: true } },
    { titulo: 'próximo passo', jogada: 'frase', dados: { frase: 'depois você arrasta o vídeo para a linha do tempo', anteriores: ant(['o primeiro passo é abrir o editor', 'mantida']), comparar: 'o primeiro passo é abrir o editor' }, esperado: { tipo: 'conteudo', refaz: false } },
    { titulo: 'não pera, de novo', jogada: 'frase', dados: { frase: 'não pera vou começar de novo', anteriores: ant(['a primeira coisa que eu faço de manhã é', 'suspensa']), metade: 'a primeira coisa que eu faço de manhã é' }, esperado: { tipo: 'bastidor', continua: false } },
    { titulo: 'porque quando você', jogada: 'frase', dados: { frase: 'isso acontece porque quando você', anteriores: ant(['o vídeo trava no meio', 'mantida']) }, esperado: { tipo: 'metade' } },
    { titulo: 'com pontuação', jogada: 'frase', dados: { frase: 'Ops, deixa eu repetir essa.', anteriores: ant(['O microfone de lapela custa cem reais.', 'mantida']), comparar: 'O microfone de lapela custa cem reais.' }, esperado: { tipo: 'bastidor', refaz: false } },
    { titulo: 'eu corto depois', jogada: 'frase', dados: { frase: 'isso aqui eu corto depois', anteriores: ant(['então vamos para a segunda parte', 'mantida']) }, esperado: { tipo: 'bastidor' } },
    { titulo: 'bastidor colado no recomeço', jogada: 'frase', dados: { frase: 'não peraí hoje eu vou mostrar três jeitos de gravar melhor', anteriores: ant([P.p1, 'suspensa']), comparar: P.p1, metade: P.p1 }, esperado: { tipo: 'conteudo', refaz: true } },
    { titulo: 'aula', jogada: 'frase', dados: { frase: 'a fotossíntese acontece nas folhas onde a luz vira energia para a planta', anteriores: ant(['hoje a aula é de biologia', 'mantida']), comparar: 'hoje a aula é de biologia' }, esperado: { tipo: 'conteudo', refaz: false } },
    // ordens para a edição que o código não conhece (as conhecidas, "corta isso", o código corta sem perguntar)
    { titulo: 'não ficou bom', jogada: 'frase', dados: { frase: 'isso não ficou bom', curta: true, anteriores: ant(['o curso custa trezentos reais', 'mantida']), comparar: 'o curso custa trezentos reais' }, esperado: { tipo: 'bastidor', apagar: true, refaz: false } },
    { titulo: 'não gostei, de novo', jogada: 'frase', dados: { frase: 'não gostei vou refazer', curta: true, anteriores: ant(['o primeiro passo é abrir o editor', 'mantida']), comparar: 'o primeiro passo é abrir o editor' }, esperado: { tipo: 'bastidor', apagar: true } },
    { titulo: 'desconsidera', jogada: 'frase', dados: { frase: 'desconsidera essa última frase', curta: true, anteriores: ant(['o frete é grátis para todo o Brasil', 'mantida']) }, esperado: { tipo: 'bastidor', apagar: true } },
    { titulo: 'corta, falando de edição', jogada: 'frase', dados: { frase: 'o editor corta os erros sozinho', curta: true, anteriores: ant([P.p9, 'mantida']), comparar: P.p9 }, esperado: { tipo: ['conteudo', 'repeticao'], apagar: false } },
    { titulo: 'não esquece de se inscrever', jogada: 'frase', dados: { frase: 'não esquece de se inscrever no canal', curta: true, anteriores: ant(['e o terceiro é pedir ajuda', 'mantida']) }, esperado: { tipo: 'conteudo', apagar: false } },
    { titulo: 'tá gravando não manda cortar', jogada: 'frase', dados: { frase: 'tá gravando', curta: true, abertura: true }, esperado: { tipo: 'bastidor', apagar: false } },
    { titulo: 'deixa eu ver não manda cortar', jogada: 'frase', dados: { frase: 'deixa eu ver aqui', curta: true, anteriores: ant(['o primeiro passo é abrir o editor', 'mantida']) }, esperado: { tipo: 'hesitacao', apagar: false } },
    { titulo: 'é isso, é isso aí', jogada: 'frase', dados: { frase: 'é isso é isso aí', anteriores: ant([P.p8, 'mantida'], [P.p9, 'mantida']), comparar: P.p9 }, esperado: { tipo: ['repeticao', 'hesitacao'], refaz: false } },
  ],
};

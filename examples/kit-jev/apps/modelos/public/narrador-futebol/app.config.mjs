// Narre o Jogo — você narra uma partida imaginária em voz alta e ela acontece na tela: a cada pausa o Jev decide onde
// está a bola, quem tem a posse e o barulho da torcida; a cada frase, o lance NOVO (passe, chute, GOL, cartão, anulado…).
// Para adaptar: troque LANCES pelos eventos do seu caso (reunião: decisão, tarefa, prazo; plantão: chamado, alarme) e
// PARES pelos participantes. O placar só muda pelo código, a partir da lista fechada de lances.

// ---------- times fictícios (nenhum clube real): art = artigo ("o Unidos", "a Estrela", "os Tubarões") ----------
const T = (id, nome, art, sigla, cor, cor2, camisa, camisaNome, numero, goleiro) => ({ id, nome, art, sigla, cor, cor2, camisa, camisaNome, numero, goleiro });
const PARES = [
  { id: 'vila-morro', estadio: 'Estádio da Vila',
    casa: T('vila', 'Unidos da Vila', 'o', 'VIL', '#22c55e', '#f8fafc', '#f8fafc', 'branca', '#15803d', '#f97316'),
    visitante: T('morro', 'Atlético do Morro', 'o', 'MOR', '#ef4444', '#111827', '#dc2626', 'vermelha', '#ffffff', '#38bdf8') },
  { id: 'estrela-tubaroes', estadio: 'Arena do Cerrado',
    casa: T('estrela', 'Estrela do Cerrado', 'a', 'EST', '#3b82f6', '#facc15', '#2563eb', 'azul', '#fde047', '#f472b6'),
    visitante: T('tubaroes', 'Tubarões da Baía', 'os', 'TUB', '#f97316', '#0f172a', '#f97316', 'laranja', '#0f172a', '#a78bfa') },
  { id: 'jabuticaba-mandacaru', estadio: 'Estádio do Pomar',
    casa: T('jabuticaba', 'Real Jabuticaba', 'o', 'JAB', '#a855f7', '#f8fafc', '#7e22ce', 'roxa', '#ffffff', '#fde047'),
    visitante: T('mandacaru', 'Mandacaru F.C.', 'o', 'MAN', '#facc15', '#166534', '#facc15', 'amarela', '#14532d', '#0ea5e9') },
  { id: 'pinguins-flamingos', estadio: 'Estádio da Lagoa',
    casa: T('pinguins', 'Pinguins do Sul', 'os', 'PIN', '#e2e8f0', '#0f172a', '#0f172a', 'preta', '#ffffff', '#facc15'),
    visitante: T('flamingos', 'Flamingos da Lagoa', 'os', 'FLA', '#ec4899', '#fdf2f8', '#f472b6', 'rosa', '#ffffff', '#22d3ee') },
];

// ---------- a lista fechada de lances (o Jev escolhe um; o placar e a tela saem do código) ----------
// peso: 0 = lance miúdo (só mexe a bola), 1 = lance que entra na linha do tempo, 2 = lance grande (faixa, som, placar)
// de: como o lance aparece na lista que vai para o Jev ("GOL do Unidos da Vila")
const LANCES = [
  { id: 'passe', rotulo: 'Passe', icone: '👟', peso: 0, de: 'passe {do}', desc: 'passe, toque ou lançamento para um companheiro, sem ser cruzamento na área: "tocou de lado", "rolou para o camisa 8", "lançamento longo", "tabelinha", "inverteu o jogo", "recuou para o goleiro", "saída de bola"' },
  { id: 'drible', rotulo: 'Drible', icone: '🌀', peso: 0, de: 'drible {do}', desc: 'drible ou arrancada com a bola, passando pelo marcador: "lá vai ele", "passou por um, passou por dois", "deu um chapéu", "caneta", "pedalada", "deixou o zagueiro no chão", "arrancou em velocidade"' },
  { id: 'cruzamento', rotulo: 'Cruzamento', icone: '🎯', peso: 0, de: 'cruzamento {do}', desc: 'bola levantada ou cruzada para dentro da área, ainda sem chute: "cruzou", "levantou na área", "alçou a bola", "bola na área", "cruzamento rasteiro"' },
  { id: 'chute', rotulo: 'Chute a gol', icone: '🦶', peso: 1, de: 'chute {do}', desc: 'finalização cujo resultado o narrador AINDA não disse: "chutou", "bateu", "bateu cruzado", "soltou a bomba", "cabeceou", "finalizou", "emendou de primeira" (sem dizer se entrou, se foi para fora ou se o goleiro pegou)' },
  { id: 'defesa', rotulo: 'Defesa do goleiro', icone: '🧤', peso: 1, de: 'chute {do} defendido pelo goleiro', desc: 'o goleiro DEFENDEU: "que defesa!", "espalmou", "o goleiro pegou", "segurou firme", "fez milagre", "tirou com a ponta dos dedos", "mandou para escanteio"' },
  { id: 'fora', rotulo: 'Chute para fora', icone: '↗️', peso: 1, de: 'chute para fora {do}', desc: 'finalização que NÃO entrou e foi para fora: "pra fora", "por cima do travessão", "raspando a trave", "isolou", "tirou tinta", "quase gol", "por pouco", "passou perto"' },
  { id: 'trave', rotulo: 'Na trave', icone: '🥅', peso: 2, de: 'chute {do} na trave', desc: 'a bola BATEU na trave ou no travessão e não entrou: "na trave!", "carimbou o travessão", "explodiu no poste", "acertou o pé da trave"' },
  { id: 'gol', rotulo: 'GOL', icone: '⚽', peso: 2, de: 'GOL {do}', desc: 'GOL: a bola ENTROU no gol: "gooool", "é gol", "balançou a rede", "pro fundo do barbante", "tá lá dentro", "no ângulo" (e entrou), "abriu o placar", "empatou", "virou o jogo"' },
  { id: 'anulado', rotulo: 'Gol anulado', icone: '🚫', peso: 2, de: 'gol {do} ANULADO', desc: 'um GOL que o narrador tinha acabado de gritar foi DESFEITO: "não, não, não, impedimento!", "o juiz anulou", "o VAR chamou e anulou o gol", "não valeu", "gol anulado"' },
  { id: 'impedimento', rotulo: 'Impedimento', icone: '🚩', peso: 1, de: 'impedimento {do}', desc: 'impedimento marcado num lance SEM gol gritado: "bandeira levantada", "estava impedido", "o bandeirinha marcou impedimento"' },
  { id: 'falta', rotulo: 'Falta', icone: '🛑', peso: 1, de: 'falta cometida {pelo}', desc: 'falta marcada pelo juiz, SEM cartão: "falta", "derrubou o atacante", "entrada dura", "carrinho por trás", "o juiz marca falta", "falta perigosa na entrada da área"' },
  { id: 'amarelo', rotulo: 'Cartão amarelo', icone: '🟨', peso: 2, de: 'cartão amarelo {para}', desc: 'cartão AMARELO mostrado: "o juiz tá mostrando o amarelo", "cartão amarelo", "levou o amarelo", "amarelou o zagueiro"' },
  { id: 'vermelho', rotulo: 'Cartão vermelho', icone: '🟥', peso: 2, de: 'cartão vermelho {para}', desc: 'cartão VERMELHO ou expulsão: "cartão vermelho", "expulso", "tá fora do jogo", "segundo amarelo e rua"' },
  { id: 'escanteio', rotulo: 'Escanteio', icone: '⛳', peso: 1, de: 'escanteio {para}', desc: 'escanteio marcado ou cobrado: "escanteio", "tiro de canto", "vai cobrar o escanteio", "saiu pela linha de fundo, é escanteio"' },
  { id: 'penalti', rotulo: 'Pênalti', icone: '❗', peso: 2, de: 'pênalti {para}', desc: 'pênalti marcado: "pênalti!", "derrubou dentro da área", "o juiz aponta a marca da cal", "penalidade máxima"' },
  { id: 'substituicao', rotulo: 'Substituição', icone: '🔁', peso: 1, de: 'substituição {no}', desc: 'substituição de jogador: "sai o camisa 7, entra o 19", "vai mexer no time", "troca no time"' },
  { id: 'inicio', rotulo: 'Bola rolando', icone: '📣', peso: 1, de: 'bola rolando', desc: 'o tempo começa: "começa o jogo", "rola a bola", "bola rolando", "começa o segundo tempo", "o juiz apita o início"' },
  { id: 'fim', rotulo: 'Fim do tempo', icone: '⏱️', peso: 2, de: 'fim do tempo', desc: 'o juiz encerra o tempo: "fim do primeiro tempo", "intervalo", "fim de jogo", "acabou", "fim de papo", "termina a partida"' },
  { id: 'nada_novo', rotulo: 'Nada novo', icone: '·', peso: 0, de: '', desc: 'NENHUM lance novo no fim do trecho: o narrador só descreve, comenta ou enrola, OU repete e comemora um lance que JÁ está em lances_ja_registrados ("é gol, é gol, golaço!" com o gol já na lista; "que defesa, meu Deus!" com a defesa já na lista)' },
];

// 9 zonas do campo, sempre do ponto de vista do time que está com a bola (atacando para a frente) + "mesma"
const ZONAS = [
  { id: 'def_esq', rotulo: 'defesa · esquerda', desc: 'no próprio campo de defesa, pelo lado esquerdo: lateral esquerdo com a bola lá atrás' },
  { id: 'def_centro', rotulo: 'defesa · meio', desc: 'no próprio campo, pelo meio: zagueiro ou goleiro com a bola, tiro de meta, recuo, saída de bola lá de trás' },
  { id: 'def_dir', rotulo: 'defesa · direita', desc: 'no próprio campo de defesa, pelo lado direito: lateral direito com a bola lá atrás' },
  { id: 'meio_esq', rotulo: 'meio · esquerda', desc: 'no meio de campo, pelo lado esquerdo' },
  { id: 'meio_centro', rotulo: 'meio de campo', desc: 'no meio de campo, pelo centro: círculo central, saída de bola no começo ou depois de um gol, volante, armação da jogada' },
  { id: 'meio_dir', rotulo: 'meio · direita', desc: 'no meio de campo, pelo lado direito' },
  { id: 'ata_esq', rotulo: 'ataque · esquerda', desc: 'no ataque, pela esquerda: ponta esquerda, linha de fundo pela esquerda, perto da bandeira de escanteio da esquerda' },
  { id: 'area', rotulo: 'na área', desc: 'dentro ou na entrada da grande área do ADVERSÁRIO: chute, cabeçada, cara a cara com o goleiro, pênalti, gol' },
  { id: 'ata_dir', rotulo: 'ataque · direita', desc: 'no ataque, pela direita: ponta direita, linha de fundo pela direita, perto da bandeira de escanteio da direita' },
  { id: 'mesma', rotulo: 'mesmo lugar', desc: 'o trecho não diz nada novo sobre onde a bola está (comemoração, comentário, cartão, substituição): a bola continua onde estava' },
];

const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-n) : s; };
const parDe = (id) => PARES.find((p) => p.id === id) || PARES[0];
const DO = { o: 'do', a: 'da', os: 'dos', as: 'das' };
const PELO = { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas' };
const NO = { o: 'no', a: 'na', os: 'nos', as: 'nas' };
// "do Unidos da Vila", "para a Estrela do Cerrado"… (para a tela e para a lista que vai ao Jev)
const frase = (t, forma) => (!t ? '' : forma === 'para' ? `para ${t.art} ${t.nome}` : forma === 'pelo' ? `${PELO[t.art]} ${t.nome}` : forma === 'no' ? `${NO[t.art]} ${t.nome}` : `${DO[t.art]} ${t.nome}`);
const LANCE = Object.fromEntries(LANCES.map((l) => [l.id, l]));

// um lance já registrado, em palavras: "23' GOL do Unidos da Vila (nesta frase)"
function lanceEmTexto(l, P) {
  const L = LANCE[l && l.tipo]; if (!L || L.id === 'nada_novo') return null;
  const t = l.time === 'casa' ? P.casa : l.time === 'visitante' ? P.visitante : null;
  const txt = L.de.replace(/\{(do|para|pelo|no)\}/, (_, f) => frase(t, f)).replace(/\s+/g, ' ').trim() || L.rotulo;
  const quando = l.atras === 0 ? 'nesta frase' : l.atras === 1 ? 'na frase anterior' : `há ${Math.min(9, l.atras | 0)} frases`;
  const min = Number.isFinite(+l.min) ? `${Math.max(1, Math.min(130, l.min | 0))}' ` : '';
  return `${min}${txt}${l.anulado ? ' (depois ANULADO)' : ''} — ${quando}`;
}

// A situação da jogada, calculada pelo código (o Jev não deduz isso bem da lista): o gol desta jogada já foi
// registrado? há um chute esperando o resultado? Medido: sem isto, "é gol é gol é gol" logo depois do chute virava
// "nada novo" (comemoração) em 54% das vezes.
const JOGADA_NOVA = new Set(['inicio', 'passe', 'drible', 'cruzamento', 'chute', 'escanteio', 'penalti', 'falta', 'defesa', 'fora', 'trave', 'impedimento']);
const RESULTADO = new Set(['gol', 'defesa', 'fora', 'trave', 'escanteio', 'impedimento', 'anulado', 'falta', 'penalti']);
function situacaoDaJogada(lances, P) {
  const quando = (l) => (l.atras === 0 ? 'nesta frase' : l.atras === 1 ? 'na frase anterior' : `há ${Math.min(9, l.atras | 0)} frases`);
  const timeDe = (l) => (l.time === 'casa' ? P.casa : l.time === 'visitante' ? P.visitante : null);
  const ig = lances.map((l) => l.tipo === 'gol' && !l.anulado).lastIndexOf(true);
  if (ig >= 0) {
    const g = lances[ig];
    const depois = lances.slice(ig + 1).some((l) => JOGADA_NOVA.has(l.tipo));
    if (!depois && (g.atras | 0) <= 3) return `o GOL ${frase(timeDe(g), 'do')} acabou de ser registrado (${quando(g)}): repetir ou comemorar esse gol é nada_novo; desfazer esse gol ("não, não, impedimento", "anulou") é anulado`;
  }
  const ic = lances.map((l) => l.tipo === 'chute').lastIndexOf(true);
  if (ic >= 0 && (lances[ic].atras | 0) <= 2 && !lances.slice(ic + 1).some((l) => RESULTADO.has(l.tipo))) {
    return `há um chute ${frase(timeDe(lances[ic]), 'do')} (${quando(lances[ic])}) ainda SEM resultado: se o trecho diz que entrou é gol; se o goleiro pegou, defesa; se foi para fora ou "quase", fora; se bateu na trave, trave`;
  }
  return 'nenhum gol registrado nesta jogada: se a bola entrar ("gol", "é gol", "golaço"), é gol novo';
}

function estadoDoLance(d) {
  const P = parDe(d.par);
  const lado = (x) => (x === 'casa' ? P.casa.nome : x === 'visitante' ? P.visitante.nome : null);
  const pl = Array.isArray(d.placar) ? d.placar.slice(0, 2).map((n) => Math.max(0, Math.min(99, n | 0))) : [0, 0];
  const brutos = (Array.isArray(d.lances) ? d.lances : []).slice(-8).filter((l) => l && LANCE[l.tipo]);
  const lances = brutos.map((l) => lanceEmTexto(l, P)).filter(Boolean);
  const min = Math.max(0, Math.min(130, d.minuto | 0));
  return {
    partida: `${P.casa.nome} (camisa ${P.casa.camisaNome}) × ${P.visitante.nome} (camisa ${P.visitante.camisaNome})`,
    placar: `${P.casa.nome} ${pl[0] || 0} × ${pl[1] || 0} ${P.visitante.nome}`,
    minuto: `${min || 1}' do ${d.tempo === 2 ? '2º' : '1º'} tempo`,
    posse_atual: lado(d.posse) || 'ainda não se sabe',
    narracao_antes: (Array.isArray(d.antes) ? d.antes : []).slice(-3).map((s) => corta(s, 170)).filter(Boolean),
    trecho_atual: corta(d.trecho, 340),
    lances_ja_registrados: lances.length ? lances : ['nenhum ainda'],
    situacao: situacaoDaJogada(brutos, P),
  };
}

// ---------- testes: trechos de narração de verdade (pontuados e do jeito que o reconhecedor de voz escreve) ----------
const TB = { par: 'vila-morro', placar: [0, 0], minuto: 12, tempo: 1 };
const LJ = (tipo, time, atras, min = 12) => ({ tipo, time, atras, min });
const T_ = (titulo, dados, esperado) => ({ titulo, jogada: 'lance', dados: { ...TB, ...dados }, esperado });
const GOL_AGORA = [LJ('chute', 'casa', 1), LJ('gol', 'casa', 1)];

function opcoesTimes(P, sufixo) {
  return [
    { id: 'casa', desc: `${P.casa.nome} (camisa ${P.casa.camisaNome})${sufixo || ''}` },
    { id: 'visitante', desc: `${P.visitante.nome} (camisa ${P.visitante.camisaNome})${sufixo || ''}` },
  ];
}

export default {
  id: 'narrador-futebol',
  titulo: 'Narre o Jogo',
  emoji: '⚽',
  categoria: 'ao-vivo',
  ordem: 0.7,
  resumo: 'Narre uma partida imaginária e ela acontece na tela: a bola vai aonde você diz e o gol sai quando você grita.',
  descricao: 'Você narra e a partida acontece: a cada pausa da fala, uma chamada só decide em ~0,35 s onde está a bola, quem tem a posse, o barulho da torcida e o lance novo, numa lista fechada de 19 (passe, chute, defesa, GOL, cartão, impedimento…). O placar é do código: só muda com o "sim" do Jev em "gol novo?" e "gol anulado?", e o mesmo gol nunca conta duas vezes. Para adaptar, troque os lances pelos eventos do seu caso: decisões e tarefas numa reunião, chamados num plantão, momentos de uma live.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#22c55e', acento2: '#facc15' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone e narre como na TV: "Rola a bola! Unidos da Vila com a bola, lá vai ele pela esquerda, bateu cruzado… GOOOL!". Depois grite "não, não, impedimento!" e veja o placar voltar.',
  },
  pares: PARES,
  lances: LANCES,
  zonas: ZONAS,
  // limiares medidos (ver testes): abaixo disso a tela não arrisca
  limiar: { lance: 0.55, gol: 0.6, anulou: 0.6, zona: 0.4, posse: 0.55 },
  contexto: {
    jogo: 'narração ao vivo de uma partida de futebol imaginária, com times fictícios; o narrador fala rápido e grita',
  },
  decisoes: [
    {
      id: 'zona', tipo: 'choice', titulo: 'Zona da bola',
      pergunta: 'Onde está a bola AGORA, no fim do trecho_atual? As zonas são do ponto de vista do time que está com a bola, atacando para a frente: "defesa" é o próprio campo, perto da própria área; "meio" é o meio de campo; "ataque" é perto da área do adversário. Esquerda e direita também são do time com a bola ("pela esquerda", "lateral esquerdo", "ponta direita"). Use a narração anterior só como contexto. Se o trecho_atual não diz nada novo sobre onde está a bola, escolha mesma.',
      opcoes: ZONAS.map((z) => ({ id: z.id, rotulo: z.rotulo, desc: z.desc })),
    },
    {
      id: 'posse', tipo: 'choice', titulo: 'Posse de bola',
      pergunta: 'Qual time está com a bola AGORA, no fim do trecho_atual? Regras: (1) "lá vai ele", "tocou", "chutou", "gol" sem citar time = continua com o time de posse_atual; (2) "roubou a bola", "interceptou", "desarmou", "o goleiro segurou" = a posse passa para o outro time; (3) escanteio, falta ou pênalti PARA um time = a bola é desse time. Se não dá para saber, indefinido.',
      opcoes: [{ id: 'casa', desc: 'o time da casa está com a bola' }, { id: 'visitante', desc: 'o time visitante está com a bola' }, { id: 'indefinido', desc: 'não dá para saber quem está com a bola' }],
    },
    {
      id: 'emocao', tipo: 'score', titulo: 'Barulho da torcida',
      pergunta: 'Quanto barulho a torcida faz AGORA, pelo que o trecho_atual narra?',
      niveis: [
        { rotulo: 'calma', desc: 'jogo parado ou morno: toque de lado, bola no meio de campo, substituição, intervalo, comentário do narrador' },
        { rotulo: 'atenta', desc: 'o time avança, troca passes no campo de ataque, falta no meio de campo' },
        { rotulo: 'animada', desc: 'perigo: drible no ataque, cruzamento, escanteio, falta perto da área, cartão, chute de longe' },
        { rotulo: 'de pé', desc: 'grande chance: chute perigoso, defesa difícil, bola na trave, cara a cara com o goleiro, pênalti, expulsão, gol anulado' },
        { rotulo: 'explodindo', desc: 'GOL ("gooool", "é gol", "balançou a rede") ou o narrador no auge do grito' },
      ],
    },
    {
      id: 'evento', tipo: 'choice', titulo: 'Lance novo',
      pergunta: 'Você acompanha a narração AO VIVO de uma partida de futebol, trecho a trecho. Qual é o lance NOVO mais recente narrado no trecho_atual (perto do FIM do trecho) que ainda NÃO está em lances_ja_registrados? Regras: (1) o DESFECHO de um lance já registrado é lance novo: o chute que entrou = gol, o goleiro pegou = defesa, foi para fora ou "quase" = fora, bateu na trave = trave; a falta que vira cartão = amarelo ou vermelho; (2) repetir ou comemorar um lance que já está na lista é nada_novo (a situacao diz se o gol desta jogada já foi registrado); (3) se o narrador se corrigiu ("gol… não, não, impedimento!"), vale o que ele disse por último; (4) "quase", "por pouco", "chance de gol", "perdeu o gol" NÃO são gol; (5) lance dito pela metade ("o juiz tá mostrando o…" sem a cor do cartão) é nada_novo.',
      opcoes: LANCES.map((l) => ({ id: l.id, rotulo: l.rotulo, icone: l.icone, desc: l.desc })),
    },
    {
      id: 'gol', tipo: 'noul', titulo: 'Gol agora?', rotulo: 'gol novo', icone: '⚽', limiar: 0.6,
      pergunta: 'A bola ENTROU no gol no trecho_atual, num gol que ainda NÃO foi registrado? SIM sempre que o narrador grita ou anuncia o gol: "gol", "gol gol gol", "é gol", "gooool", "golaço", "gol de placa", "tá lá dentro", "entrou", "balançou a rede", "no fundo do barbante", "no ângulo" (e entrou). NÃO só nestes casos: (1) a situacao diz que o GOL desta jogada acabou de ser registrado e o trecho só repete, comemora ou diz de quem foi esse gol ("é gol, é gol", "é do Atlético!", "gol do camisa 9", "que golaço"); (2) a bola não entrou: "quase", "por pouco", "chance de gol", "perdeu o gol", "na trave", "pra fora", "o goleiro pegou", "na rede pelo lado de fora"; (3) o narrador desfez o gol no mesmo trecho ("gol… não, não, impedimento!").',
    },
    {
      id: 'anulou', tipo: 'noul', titulo: 'Gol anulado?', rotulo: 'gol anulado', icone: '🚩', limiar: 0.6,
      pergunta: 'O narrador está DESFAZENDO o gol que acabou de ser registrado? SIM sempre que, logo depois do gol, ele diz que não valeu: "não, não, não", "impedimento", "bandeira levantada", "o juiz anulou", "o VAR chamou e anulou", "não vale", "falta no goleiro antes". NÃO só nestes casos: (1) a situacao NÃO diz que um gol acabou de ser registrado; (2) o trecho só comemora ou descreve o gol; (3) o trecho já narra outro lance depois do gol (saída de bola, novo ataque).',
    },
    {
      id: 'time', tipo: 'choice', titulo: 'Time do lance',
      pergunta: 'De qual time é o lance novo mais recente do trecho_atual? Regra por tipo de lance: gol, chute, defesa, fora, trave, passe, drible, cruzamento, escanteio, impedimento e pênalti → o time que ATACA no lance (quem chutou, mesmo que o goleiro do outro time tenha defendido; quem vai bater o escanteio ou o pênalti); falta e cartão → o time do jogador que COMETEU a falta ou LEVOU o cartão; substituição → o time que troca; gol anulado → o time que perdeu o gol. "lá vai ele", "tocou", "chutou" sem citar time = o time de posse_atual. Sem lance novo, ou lance sem time (início, intervalo, fim), escolha nenhum.',
      opcoes: [{ id: 'casa', desc: 'o time da casa' }, { id: 'visitante', desc: 'o time visitante' }, { id: 'nenhum', desc: 'nenhum lance novo, ou lance sem time' }],
    },
  ],
  jogadas: {
    // a cada pausa da fala (trecho ainda aberto) e a cada frase fechada: zona, posse, torcida, lance novo e time
    lance: {
      estado: (d) => estadoDoLance(d),
      perguntas: (d) => {
        const P = parDe(d.par);
        return [
          { chave: 'zona', decisao: 'zona' },
          { chave: 'posse', decisao: 'posse', opcoes: [...opcoesTimes(P, ' está com a bola'), { id: 'indefinido', desc: 'não dá para saber quem está com a bola (bola parada, dividida, ninguém citado e posse_atual desconhecida)' }] },
          { chave: 'emocao', decisao: 'emocao' },
          { chave: 'evento', decisao: 'evento' },
          { chave: 'gol', decisao: 'gol' },
          { chave: 'anulou', decisao: 'anulou' },
          { chave: 'time', decisao: 'time', opcoes: [...opcoesTimes(P), { id: 'nenhum', desc: 'nenhum lance novo, ou lance sem time (início, intervalo, fim de jogo)' }] },
        ];
      },
    },
  },
  testes: [
    // narração pontuada (digitada ou com o reconhecedor caprichando)
    T_('início', { posse: null, minuto: 1, antes: [], trecho: 'Rola a bola! Começa o jogo no Estádio da Vila!', lances: [] }, { evento: 'inicio', gol: false }),
    T_('passe no meio', { posse: 'casa', antes: ['Rola a bola!'], trecho: 'Unidos da Vila com a bola, toca no meio de campo.', lances: [LJ('inicio', null, 1, 1)] }, { evento: 'passe', posse: 'casa', zona: 'meio_centro', time: 'casa' }),
    T_('lá vai ele', { posse: 'casa', antes: ['Unidos da Vila com a bola, toca no meio de campo.'], trecho: 'Lá vai ele pela esquerda, passou por um, passou por dois!', lances: [LJ('passe', 'casa', 1)] }, { evento: 'drible', posse: 'casa', zona: ['ata_esq', 'meio_esq'], time: 'casa' }),
    T_('cruzou', { posse: 'casa', antes: ['Lá vai ele pela esquerda, passou por um, passou por dois!'], trecho: 'Chegou na linha de fundo e cruzou na área!', lances: [LJ('drible', 'casa', 1)] }, { evento: 'cruzamento', zona: ['area', 'ata_esq'], time: 'casa' }),
    T_('bateu cruzado (frase aberta)', { posse: 'casa', antes: ['Chegou na linha de fundo e cruzou na área!'], trecho: 'Dominou no peito e bateu cruzado', lances: [LJ('cruzamento', 'casa', 1)] }, { evento: 'chute', zona: 'area', time: 'casa', gol: false }),
    T_('gol depois do chute', { posse: 'casa', antes: ['Dominou no peito e bateu cruzado!'], trecho: 'No cantinho! GOOOOOL! É do Unidos da Vila!', lances: [LJ('cruzamento', 'casa', 2), LJ('chute', 'casa', 1)] }, { gol: true, evento: 'gol', time: 'casa', emocao: 4 }),
    T_('no ângulo', { posse: 'visitante', antes: ['O Atlético do Morro troca passes na entrada da área.'], trecho: 'Pegou de primeira… no ângulo! Que golaço!', lances: [LJ('passe', 'visitante', 1)] }, { gol: true, evento: 'gol', time: 'visitante', emocao: 4 }),
    T_('pro fundo do barbante', { posse: 'casa', antes: ['Cobrança de escanteio do Unidos.'], trecho: 'Subiu mais que todo mundo, cabeceou, pro fundo do barbante!', lances: [LJ('escanteio', 'casa', 1)] }, { gol: true, evento: 'gol', time: 'casa' }),
    T_('tá lá dentro', { posse: 'casa', antes: ['Bola na área!'], trecho: 'Cabeçada… TÁ LÁ DENTRO!', lances: [LJ('cruzamento', 'casa', 1)] }, { gol: true, time: 'casa' }),
    T_('gol do visitante com a posse da casa', { posse: 'casa', antes: ['O Unidos perdeu a bola.'], trecho: 'Contra-ataque do Morro, chutou… GOL DO ATLÉTICO DO MORRO!', lances: [] }, { gol: true, time: 'visitante' }),
    T_('segundo gol depois da saída', { placar: [1, 0], minuto: 20, posse: 'visitante', antes: ['Recomeça o Atlético.', 'Perdeu a bola, o Unidos de novo!'], trecho: 'Chutou… GOL! O segundo do Unidos da Vila!', lances: [LJ('gol', 'casa', 3, 14), LJ('inicio', null, 2, 15), LJ('passe', 'casa', 1, 19)] }, { gol: true, evento: 'gol', time: 'casa' }),
    // o mesmo gol narrado de novo não conta duas vezes
    T_('comemoração na mesma frase', { placar: [1, 0], posse: 'casa', antes: ['Bateu cruzado!'], trecho: 'GOOOOL! É GOL! É GOL! Golaço do camisa 10!', lances: [LJ('chute', 'casa', 1), LJ('gol', 'casa', 0)] }, { gol: false, evento: 'nada_novo' }),
    T_('comemoração na frase seguinte', { placar: [1, 0], posse: 'casa', antes: ['No cantinho! GOOOOOL! É do Unidos da Vila!'], trecho: 'Que golaço! O estádio vem abaixo! Um a zero!', lances: [LJ('chute', 'casa', 2), LJ('gol', 'casa', 1)] }, { gol: false, evento: 'nada_novo' }),
    T_('"é do Atlético!" depois do gol', { placar: [0, 1], posse: 'visitante', antes: ['GOOOOOL!'], trecho: 'É do Atlético do Morro!', lances: [LJ('chute', 'visitante', 2), LJ('gol', 'visitante', 1)] }, { gol: false, evento: 'nada_novo' }),
    // a virada: o gol é desfeito
    T_('"não, não, não… impedimento!"', { placar: [1, 0], posse: 'casa', antes: ['Tocou por cima do goleiro… GOOOOL!'], trecho: 'Não, não, não! O bandeirinha levantou a bandeira! Impedimento!', lances: GOL_AGORA }, { anulou: true, evento: 'anulado', gol: false }),
    T_('o VAR anula', { placar: [0, 1], posse: 'casa', antes: ['Gol do Atlético do Morro!', 'A torcida vermelha faz festa.'], trecho: 'Mas o VAR chamou o juiz… e o gol foi anulado!', lances: [LJ('gol', 'visitante', 2)] }, { anulou: true, evento: 'anulado' }),
    T_('"não acredito!" é comemoração', { placar: [1, 0], posse: 'casa', antes: ['Bateu cruzado… GOOOOL!'], trecho: 'Não acredito! Que golaço!', lances: GOL_AGORA }, { anulou: false, gol: false }),
    T_('"não pode ser" é comemoração', { placar: [1, 0], posse: 'casa', antes: ['Bateu cruzado… GOOOOL!'], trecho: 'Não pode ser, que pintura de gol!', lances: GOL_AGORA }, { anulou: false, gol: false }),
    T_('"não, o juiz anulou"', { placar: [1, 0], posse: 'casa', antes: ['Bateu cruzado… GOOOOL!'], trecho: 'Não, o juiz anulou!', lances: GOL_AGORA }, { anulou: true }),
    T_('impedimento sem gol', { posse: 'casa', antes: ['Lançamento para o camisa 9.'], trecho: 'Ele parte sozinho… bandeira levantada, estava impedido.', lances: [LJ('passe', 'casa', 1)] }, { evento: 'impedimento', time: 'casa', anulou: false }),
    // não entrou
    T_('quase gol', { posse: 'visitante', antes: ['O Morro chega pela direita.'], trecho: 'Chutou… pra fora! Quase gol!', lances: [LJ('passe', 'visitante', 1)] }, { evento: 'fora', time: 'visitante', gol: false }),
    T_('por cima do travessão', { posse: 'casa', antes: ['O Unidos roda a bola.'], trecho: 'Soltou a bomba de longe… por cima do travessão!', lances: [] }, { evento: 'fora', gol: false }),
    T_('chance perdida', { posse: 'casa', antes: ['O Unidos chega.'], trecho: 'Que chance de gol perdida! Na cara do goleiro e isolou!', lances: [] }, { evento: 'fora', gol: false }),
    T_('na trave', { posse: 'visitante', antes: ['O Morro avança.'], trecho: 'Bateu colocado… NA TRAVE! Carimbou o poste!', lances: [] }, { evento: 'trave', time: 'visitante', emocao: [3, 4], gol: false }),
    T_('defesa', { posse: 'visitante', antes: ['Chutou o camisa 9 do Morro!'], trecho: 'Que defesa! O goleiro voou e espalmou!', lances: [LJ('chute', 'visitante', 1)] }, { evento: 'defesa', time: 'visitante', gol: false }),
    T_('o goleiro segurou', { posse: 'casa', antes: ['O Unidos tenta pela direita.'], trecho: 'Chutou fraquinho, o goleiro segurou firme.', lances: [] }, { evento: 'defesa', time: 'casa', posse: 'visitante' }),
    // juiz
    T_('falta', { posse: 'casa', antes: ['O Unidos sai jogando.'], trecho: 'Falta dura no meio de campo, entrada por trás do zagueiro do Atlético.', lances: [] }, { evento: 'falta', time: 'visitante' }),
    T_('"o juiz tá mostrando o amarelo"', { posse: 'casa', antes: ['Falta dura no meio de campo, entrada por trás do zagueiro do Atlético.'], trecho: 'O juiz tá mostrando o amarelo para o camisa 4.', lances: [LJ('falta', 'visitante', 1)] }, { evento: 'amarelo', time: 'visitante' }),
    T_('amarelo junto da falta', { posse: 'casa', antes: ['O camisa 10 do Unidos arranca.'], trecho: 'Derrubou o camisa 10 e o juiz já puxa o amarelo pro zagueiro do Morro!', lances: [LJ('drible', 'casa', 1)] }, { evento: 'amarelo', time: 'visitante' }),
    T_('amarelo depois da falta do Unidos', { posse: 'visitante', antes: ['Falta dura do volante do Unidos!'], trecho: 'O juiz tá mostrando o amarelo!', lances: [LJ('falta', 'casa', 1)] }, { evento: 'amarelo', time: 'casa' }),
    T_('vermelho', { posse: 'visitante', antes: ['O Morro puxa o contra-ataque.'], trecho: 'Entrada criminosa! É vermelho direto! Expulso o volante do Unidos!', lances: [] }, { evento: 'vermelho', time: 'casa' }),
    T_('escanteio', { posse: 'visitante', antes: ['Chutou o Morro.'], trecho: 'A bola desviou na zaga e saiu: escanteio para o Atlético do Morro.', lances: [LJ('chute', 'visitante', 1)] }, { evento: 'escanteio', time: 'visitante' }),
    T_('pênalti', { posse: 'casa', antes: ['O camisa 9 do Unidos invade a área.'], trecho: 'Derrubou dentro da área! Pênalti! O juiz aponta a marca da cal!', lances: [LJ('drible', 'casa', 1)] }, { evento: 'penalti', time: 'casa', emocao: [3, 4] }),
    T_('substituição', { posse: 'casa', antes: ['Bola fora.'], trecho: 'Vai mexer o Unidos da Vila: sai o camisa 7, entra o 19.', lances: [] }, { evento: 'substituicao', time: 'casa', emocao: [0, 1] }),
    T_('fim do 1º tempo', { minuto: 45, posse: 'casa', antes: ['O Unidos toca no meio.'], trecho: 'Apita o árbitro: fim do primeiro tempo!', lances: [] }, { evento: 'fim', time: 'nenhum' }),
    // jogo andando
    T_('comentário do narrador', { posse: 'casa', antes: ['O Unidos toca no meio.'], trecho: 'Que partida, hein, torcedor! O estádio está lotado hoje.', lances: [LJ('passe', 'casa', 1)] }, { evento: 'nada_novo', zona: 'mesma', emocao: [0, 1], gol: false }),
    T_('roubou a bola', { posse: 'casa', antes: ['O Unidos toca no meio.'], trecho: 'Roubou a bola o volante do Atlético do Morro e sai em velocidade!', lances: [LJ('passe', 'casa', 1)] }, { posse: 'visitante' }),
    T_('Estrela sai jogando (outro clássico)', { par: 'estrela-tubaroes', posse: null, antes: [], trecho: 'A Estrela do Cerrado sai jogando pela direita.', lances: [] }, { posse: 'casa' }),
    T_('amarelo para os Tubarões', { par: 'estrela-tubaroes', posse: 'casa', antes: ['A Estrela do Cerrado ataca.'], trecho: 'O camisa 8 dos Tubarões levou o amarelo por reclamação.', lances: [] }, { evento: 'amarelo', time: 'visitante' }),
    T_('cartão dito pela metade', { posse: 'casa', antes: ['Falta dura no meio de campo.'], trecho: 'o juiz tá mostrando o', lances: [LJ('falta', 'visitante', 1)] }, { evento: 'nada_novo' }),
    // do jeito que o reconhecedor de voz escreve: minúsculo, sem pontuação
    T_('voz: "bateu cruzado gol"', { posse: 'casa', antes: ['lá vai ele pela esquerda passou por um'], trecho: 'bateu cruzado gol', lances: [LJ('drible', 'casa', 1)] }, { gol: true, time: 'casa' }),
    T_('voz: "é gol é gol é gol"', { posse: 'visitante', antes: ['chutou o morro'], trecho: 'é gol é gol é gol', lances: [LJ('chute', 'visitante', 1)] }, { gol: true, time: 'visitante' }),
    T_('voz: "é gol" de novo, já registrado', { placar: [0, 1], posse: 'visitante', antes: ['chutou o morro gol'], trecho: 'é gol é gol é gol', lances: [LJ('chute', 'visitante', 1), LJ('gol', 'visitante', 1)] }, { gol: false, evento: 'nada_novo' }),
    T_('voz: "golaço"', { posse: 'casa', antes: ['pegou de primeira'], trecho: 'golaço', lances: [LJ('chute', 'casa', 1)] }, { gol: true }),
    T_('voz: "gol de placa"', { posse: 'casa', antes: ['driblou o goleiro'], trecho: 'gol de placa', lances: [LJ('drible', 'casa', 1)] }, { gol: true, evento: 'gol' }),
    T_('voz: "entrou"', { posse: 'visitante', antes: ['bateu o pênalti'], trecho: 'entrou', lances: [LJ('penalti', 'visitante', 2), LJ('chute', 'visitante', 1)] }, { gol: true }),
    T_('voz: "não não não impedimento"', { placar: [1, 0], posse: 'casa', antes: ['tocou por cima do goleiro gol'], trecho: 'não não não impedimento', lances: [LJ('gol', 'casa', 1)] }, { anulou: true }),
    T_('voz: "não não" ainda falando', { placar: [1, 0], posse: 'casa', antes: ['bateu cruzado gol'], trecho: 'não não', lances: GOL_AGORA }, { anulou: true }),
    T_('voz: "gol mas o juiz anulou" na mesma frase', { posse: 'casa', antes: ['chutou'], trecho: 'gol mas o juiz anulou', lances: [LJ('chute', 'casa', 1)] }, { evento: 'anulado', gol: false }),
    T_('voz: "pra fora"', { posse: 'casa', antes: ['bateu'], trecho: 'pra fora', lances: [LJ('chute', 'casa', 1)] }, { evento: 'fora', gol: false }),
    T_('voz: "quase gol"', { posse: 'casa', antes: ['bateu'], trecho: 'quase gol', lances: [LJ('chute', 'casa', 1)] }, { evento: 'fora', gol: false }),
    T_('voz: "que chance de gol"', { posse: 'visitante', antes: ['o morro chega'], trecho: 'que chance de gol', lances: [] }, { gol: false }),
    T_('voz: "que defesa"', { posse: 'visitante', antes: ['soltou a bomba'], trecho: 'que defesa', lances: [LJ('chute', 'visitante', 1)] }, { evento: 'defesa', gol: false }),
    T_('voz: "o goleiro pegou"', { posse: 'casa', antes: ['cabeceou'], trecho: 'o goleiro pegou', lances: [LJ('chute', 'casa', 1)] }, { evento: 'defesa', posse: 'visitante' }),
    T_('voz: "pênalti pênalti"', { posse: 'visitante', antes: ['entrou na área o morro'], trecho: 'pênalti pênalti', lances: [LJ('drible', 'visitante', 1)] }, { evento: 'penalti', time: 'visitante' }),
    T_('voz: "bola rolando"', { minuto: 0, posse: null, antes: [], trecho: 'bola rolando começa o jogo', lances: [] }, { evento: 'inicio' }),
  ],
};

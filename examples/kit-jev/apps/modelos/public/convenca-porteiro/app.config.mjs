// Convença o Porteiro — você fala, e a cada frase o Jev classifica a sua tática, mede o efeito na confiança e na paciência
// do Seu Valdir, percebe contradição e ESCOLHE a resposta dele numa lista fechada de falas gravadas, que tocam na hora.
// Para adaptar: troque o contexto (as regras), as TATICAS e as FALAS (grave as suas em assets/falas/<id>.mp3): vira um
// cliente difícil, um recrutador, um segurança de balada ou o personagem do seu jogo.

// As falas do Seu Valdir. texto = o balão; voz = o que foi gravado (quando difere); cara = a expressão do desenho;
// quando = o critério que o Jev lê para escolher (sem "quando", a fala é tocada pelo código: abertura, vitória, derrota…).
const FALAS = [
  // --- tocadas pelo código ---
  { id: 'abertura', cara: 'neutro', texto: 'Boa noite! Pois não? Vai pra onde?' },
  { id: 'impaciente', cara: 'desconfiado', texto: 'E aí? Vai falar ou vai ficar só me olhando?' },
  { id: 'impaciente_2', cara: 'bravo', texto: 'Olha, eu não tenho a noite toda, não, hein!' },
  { id: 'pode_subir', cara: 'convencido', texto: 'Tá bom, tá bom, você me convenceu. Pode subir!' },
  { id: 'pode_subir_vasco', cara: 'rindo', texto: 'Vascaíno não mente pra vascaíno. Pode subir, meu irmão!' },
  { id: 'pode_subir_entrega', cara: 'convencido', texto: 'Nome certo, apartamento certo. Pode subir, o elevador é ali.' },
  { id: 'sindico', cara: 'bravo', texto: 'Chega! Pra mim, deu. Vou chamar o síndico!' },
  { id: 'sindico_suborno', cara: 'bravo', texto: 'Querendo me comprar? Agora eu vou chamar o síndico!' },
  // --- escolhidas pelo Jev ---
  { id: 'cumprimento', cara: 'neutro', texto: 'Boa noite! Educação é bom. Mas me diz: vai pra onde?', quando: 'a pessoa só cumprimentou ou chamou o porteiro ("boa noite", "oi, tudo bem?", "ô, Seu Valdir") e ainda não disse o que quer' },
  { id: 'quem_e_voce', cara: 'desconfiado', texto: 'Tá, mas quem é você? Nunca te vi por aqui.', quando: 'pede para subir ou entrar SEM dizer quem é nem por que veio ("posso subir?", "libera aí")' },
  { id: 'sem_autorizacao', cara: 'neutro', texto: 'A Dona Marta não atende o interfone. Sem autorização, ninguém sobe.', quando: 'diz que vai ao 302 ou visitar a Dona Marta, mas sem prova nem motivo forte; ou insiste em subir sem nada novo' },
  { id: 'interfone_de_novo', cara: 'neutro', texto: 'Vou tentar de novo… Nada. Ela não atende mesmo.', quando: 'pede para ele interfonar, tocar ou chamar a Dona Marta de novo' },
  { id: 'liga_voce', cara: 'neutro', texto: 'Então liga você pra ela. Se ela autorizar, eu libero.', quando: 'diz que tem o telefone dela, que ela pode confirmar, ou pergunta o que precisa fazer para subir' },
  { id: 'entrega_quem', cara: 'desconfiado', texto: 'Entrega? Tá, mas pra quem? Fala o nome e o apartamento.', quando: 'diz que é entrega (pizza, pacote, remédio, comida) mas ainda NÃO disse, nem agora nem antes, o nome da moradora e o apartamento' },
  { id: 'entrega_confere', cara: 'convencido', texto: 'Dona Marta, do 302? Hum… o nome confere.', voz: 'Dona Marta, do trezentos e dois? Hum… o nome confere.', quando: 'fala de entrega ou visita com o nome Dona Marta E o apartamento 302 certos (veja os fatos), pela primeira vez' },
  { id: 'apartamento_errado', cara: 'desconfiado', texto: 'Hum… Esse apartamento não é o da Dona Marta, não. Tem certeza?', quando: 'citou um apartamento errado ou o nome de outra moradora (a Dona Marta mora no 302; veja os fatos)' },
  { id: 'parente', cara: 'desconfiado', texto: 'Parente da Dona Marta? Hum… ela fala muito da família, viu.', quando: 'diz que é parente da Dona Marta (filho, filha, neto, sobrinho, afilhado) ou amigo próximo dela' },
  { id: 'detalhe_bom', cara: 'convencido', texto: 'Hum… Faz sentido. Continua, que eu tô te ouvindo.', quando: 'dá um motivo plausível com um detalhe novo e concreto (o que traz, quem mandou, um costume da Dona Marta)' },
  { id: 'quero_prova', cara: 'desconfiado', texto: 'Tem como provar? Mostra uma mensagem dela aí.', quando: 'diz que a Dona Marta autorizou, combinou ou está esperando, mas sem mostrar nenhuma prova' },
  { id: 'prova_ok', cara: 'convencido', texto: 'Deixa eu ver… É, parece a Dona Marta mesmo.', quando: 'mostra ou lê uma prova: mensagem, áudio, foto, número do pedido, comprovante, ou a Dona Marta no telefone' },
  { id: 'quase_la', cara: 'convencido', texto: 'Tá bom, tá bom… você tá quase me convencendo.', quando: 'dá mais um bom motivo e a confiança do Seu Valdir já está alta (veja os medidores)' },
  { id: 'educado', cara: 'neutro', texto: 'Educação é bom, eu gosto. Mas regra é regra, né?', quando: 'pede com educação (por favor, com licença, desculpa o incômodo, obrigado), sem motivo novo' },
  { id: 'desculpa_aceita', cara: 'neutro', texto: 'Tá desculpado. Mas agora fala direito comigo.', quando: 'pede desculpas depois de ter sido grosseiro, ameaçado ou tentado subornar antes (veja a conversa)' },
  { id: 'emocionado', cara: 'emocionado', texto: 'Ai, não faz isso comigo… Eu tenho coração mole.', quando: 'apelo emocional sincero: história triste, saudade, doença, urgência, implora com sentimento' },
  { id: 'drama', cara: 'desconfiado', texto: 'Lá vem novela. Corta o drama e me fala a verdade.', quando: 'drama exagerado ou chantagem emocional (vou chorar, vou desmaiar, a culpa vai ser sua)' },
  { id: 'ameaca', cara: 'bravo', texto: 'Tá me ameaçando? Na minha portaria? Fala direito comigo!', quando: 'ameaça o porteiro (vou te denunciar, você vai ser demitido, vai se arrepender, vou te processar)' },
  { id: 'carteirada', cara: 'desconfiado', texto: 'Autoridade, é? Então mostra o documento, doutor.', quando: 'diz ser autoridade ou gente importante (polícia, fiscal, advogado, amigo do síndico, "sabe com quem está falando?")' },
  { id: 'chama_sindico', cara: 'neutro', texto: 'Pode chamar o síndico. Ele vai te dizer a mesma coisa.', quando: 'diz que vai chamar o síndico, a polícia ou reclamar com a administração do prédio' },
  { id: 'suborno', cara: 'bravo', texto: 'Que isso, rapaz! Guarda esse dinheiro, que aqui é tudo certinho.', quando: 'oferece dinheiro, Pix ou gorjeta para subir, pela primeira vez' },
  { id: 'suborno_de_novo', cara: 'bravo', texto: 'De novo com dinheiro? Eu não tô à venda, não!', quando: 'oferece dinheiro ou presente DE NOVO: já tinha oferecido antes nesta conversa' },
  { id: 'suborno_comida', cara: 'rindo', texto: 'Comida? Hum… Não, não, não! Não me tenta, que eu tô de regime.', quando: 'oferece comida ou bebida (pizza, lanche, doce, café, cerveja) em troca de subir' },
  { id: 'contradicao', cara: 'bravo', texto: 'Peraí! Agora há pouco você falou outra coisa. Tá me enrolando?', quando: 'contradiz o que a própria pessoa disse antes nesta conversa (outro nome, outro apartamento, outro motivo, outra profissão)' },
  { id: 'papai_noel', cara: 'desconfiado', texto: 'Ah, tá. E eu sou o Papai Noel.', quando: 'mentira óbvia ou absurda (sou o dono do prédio, diz que mora aqui sem morar, sou astronauta, sou famoso, vim de outro planeta)' },
  { id: 'furado', cara: 'desconfiado', texto: 'Essa história tá mais furada que peneira, hein.', quando: 'história mal contada, vaga ou cheia de buracos, que não convence' },
  { id: 'risada', cara: 'rindo', texto: 'Rá rá! Essa foi boa! Você é engraçado, hein?', quando: 'piada leve e engraçada, pela primeira vez' },
  { id: 'risada_2', cara: 'rindo', texto: 'Para, que eu tô em serviço! Rá rá! Mas que foi boa, foi.', quando: 'mais uma piada leve e engraçada (já tinha feito piada antes)' },
  { id: 'piada_ruim', cara: 'desconfiado', texto: 'Hum. Essa piada foi pior que o café daqui.', quando: 'piada sem graça, trocadilho ruim ou forçado' },
  { id: 'piada_pesada', cara: 'bravo', texto: 'Ih, essa não teve graça, não. Pega leve.', quando: 'piada ofensiva ou de mau gosto, que humilha alguém' },
  { id: 'elogio_bigode', cara: 'convencido', texto: 'Ah, que isso… O bigode é natural, viu? Trinta anos de bigode.', quando: 'elogia a aparência dele (bigode, quepe, uniforme, sorriso, simpatia)' },
  { id: 'elogio_trabalho', cara: 'emocionado', texto: 'Obrigado, viu? Pouca gente reconhece o trabalho do porteiro.', quando: 'elogia o trabalho dele, a portaria, o prédio, ou diz que ele é responsável e atencioso' },
  { id: 'bajulacao', cara: 'desconfiado', texto: 'Muito elogio junto já me deixa desconfiado, hein.', quando: 'elogio exagerado ou repetido, puxa-saquismo (já tinha elogiado antes)' },
  { id: 'vasco', cara: 'rindo', texto: 'Vascaíno? Ah, meu irmão… Agora você falou a minha língua!', quando: 'diz que é vascaíno, que torce pelo Vasco, ou pergunta se ele é vascaíno' },
  { id: 'vasco_2', cara: 'emocionado', texto: 'O Vasco é paixão! Meu pai me levava em São Januário todo domingo.', quando: 'fala mais do Vasco (jogo, ídolo, estádio, história) depois de já ter falado do Vasco' },
  { id: 'outro_time', cara: 'neutro', texto: 'Cada um com o seu time, né? O meu é o Vasco, de coração.', quando: 'diz que torce para outro time (não o Vasco)' },
  { id: 'vasco_jogo', cara: 'rindo', texto: 'Hoje tem Vasco! Tô com o radinho ligado aqui, ó. Vai torcer com a gente?', quando: 'cita o Vasco pelo nome (um jogo, uma notícia, um jogador do Vasco), sem dizer que é vascaíno' },
  { id: 'futebol', cara: 'convencido', texto: 'Futebol? Gosto, mas o meu negócio mesmo é o Vasco.', quando: 'fala de futebol em geral sem citar o Vasco nem dizer o time (jogo de hoje, campeonato, Copa)' },
  { id: 'grosseria', cara: 'bravo', texto: 'Opa, opa! Respeito aqui na portaria, hein?', quando: 'grosseria, xingamento, grito, ordem arrogante ("abre logo isso"), pela primeira vez' },
  { id: 'grosseria_2', cara: 'bravo', texto: 'Mais uma dessas e você fica do lado de fora a noite toda!', quando: 'grosseria de novo (já tinha sido grosseiro antes nesta conversa)' },
  { id: 'aleatorio', cara: 'desconfiado', texto: 'Tá, e o que isso tem a ver com a Dona Marta?', quando: 'assunto aleatório sem relação com entrar no prédio (novela, comida, viagem, filme)' },
  { id: 'clima', cara: 'neutro', texto: 'É, o tempo tá maluco mesmo. Mas e aí, o que você quer?', quando: 'conversa fiada sobre o tempo, o calor, a chuva, o trânsito ou a noite' },
  { id: 'sobre_ele', cara: 'convencido', texto: 'Vinte anos nessa portaria, meu filho. Já vi de tudo aqui.', quando: 'pergunta sobre a vida dele (há quanto tempo trabalha aqui, a família, se está cansado)' },
  { id: 'nao_entendi', cara: 'desconfiado', texto: 'Hein? Não entendi nada. Fala de novo, devagar.', quando: 'frase sem sentido, cortada, uma palavra solta ou impossível de entender' },
];

// As táticas que o Jev reconhece em cada frase (rotulo curto = o que aparece na tela)
const TATICAS = [
  { id: 'humor', rotulo: 'Humor', icone: '😂', desc: 'humor: piada, trocadilho ou brincadeira para fazer o porteiro rir' },
  { id: 'explicacao', rotulo: 'Explicação', icone: '📋', desc: 'explicação com motivo ou detalhe: diz quem é e por que veio (entrega, visita, parente, conserto), cita a moradora, o apartamento, o que traz, quem mandou, ou mostra uma prova' },
  { id: 'suborno', rotulo: 'Suborno', icone: '💸', desc: 'suborno: oferece dinheiro, Pix, gorjeta, presente, comida ou favor em troca de subir' },
  { id: 'elogio', rotulo: 'Elogio', icone: '🌹', desc: 'elogio ao porteiro (bigode, quepe, simpatia, trabalho) ou ao prédio' },
  { id: 'grosseria', rotulo: 'Grosseria', icone: '🤬', desc: 'grosseria: xinga, grita, dá ordem com arrogância ("abre logo isso"), desrespeita' },
  { id: 'pedido_educado', rotulo: 'Educação', icone: '🙏', desc: 'educação sem motivo novo: cumprimenta, pede por favor, com licença, agradece, pede desculpas, pede para interfonar' },
  { id: 'futebol_vasco', rotulo: 'Futebol', icone: '⚽', desc: 'futebol: fala de futebol, de time, de jogo, do Vasco, ou pergunta o time dele' },
  { id: 'apelo_emocional', rotulo: 'Emoção', icone: '🥺', desc: 'apelo emocional: implora, conta um drama ou uma história triste, diz que é urgente, que vai chorar, que está desesperado' },
  { id: 'papo_aleatorio', rotulo: 'Papo solto', icone: '🌀', desc: 'papo aleatório: assunto sem relação com entrar no prédio (tempo, trânsito, novela, a vida do porteiro) ou frase sem sentido' },
  { id: 'autoridade_ameaca', rotulo: 'Ameaça', icone: '👮', desc: 'carteirada ou ameaça: diz ser autoridade ou importante (polícia, advogado, fiscal, amigo do síndico, "sabe com quem está falando?") ou ameaça (vou te denunciar, você vai ser demitido, vou chamar o síndico)' },
  { id: 'mentira_contradicao', rotulo: 'Mentira', icone: '🤥', desc: 'mentira óbvia ou contradição: história absurda (sou o dono do prédio, sou astronauta, sou famoso) ou muda o que disse antes (outro nome, outro apartamento, outro motivo)' },
];

const IDS_FALAS = new Set(FALAS.map((f) => f.id));
const IDS_TATICAS = new Set(TATICAS.map((t) => t.id));
const NOME_TATICA = Object.fromEntries(TATICAS.map((t) => [t.id, t.rotulo.toLowerCase()]));
const opcoesFala = (usadas = new Set()) => FALAS.filter((f) => f.quando && !usadas.has(f.id)).map((f) => ({ id: f.id, desc: `«${f.texto}» Quando usar: ${f.quando}` }));

// ---------- os fatos da frase: nomes e apartamentos são conferidos pelo código (número e comparação ficam com o código) ----------
const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const semAcento = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const UNIDADE = /^\s*(reais|real|conto|contos|pila|mil|minutos?|min|horas?|anos?|km|metros|graus|%|por cento)/;
const POR_EXTENSO = [[/\btrezentos e (um|dois|tres|quatro)\b/g, (m, u) => '30' + { um: 1, dois: 2, tres: 3, quatro: 4 }[u]], [/\bduzentos e (um|dois|tres|quatro)\b/g, (m, u) => '20' + { um: 1, dois: 2, tres: 3, quatro: 4 }[u]], [/\btres zero (um|dois|tres|quatro)\b/g, (m, u) => '30' + { um: 1, dois: 2, tres: 3, quatro: 4 }[u]], [/\b3 0 ([1-4])\b/g, (m, u) => '30' + u]];
// se a pessoa se corrigiu no MEIO da frase ("é pro 202… não, pera, é pro 302"), vale o trecho depois da última correção
// (a correção no começo da frase, "na verdade eu sou…", corrige uma frase ANTERIOR: isso é contradição, não correção)
const CORRECAO = /\b(nao,? pera(?:i)?|nao,? espera|quer dizer|ou melhor|na verdade|digo|alias)\b/g;
function ultimoTrecho(t) {
  let i = -1, m; CORRECAO.lastIndex = 0;
  while ((m = CORRECAO.exec(t))) if ((t.slice(0, m.index).match(/[a-z0-9]+/g) || []).length >= 2) i = m.index + m[0].length;
  return i >= 0 ? t.slice(i) : t;
}
function apartamentos(t) {
  for (const [re, f] of POR_EXTENSO) t = t.replace(re, f);
  const out = new Set();
  for (const m of t.matchAll(/\b(?:apartamento|apto|ap)\.?\s*(?:n(?:umero)?\.?\s*)?(\d{2,4})\b/g)) out.add(m[1]);
  for (const m of t.matchAll(/\b([1-9]\d{2})\b/g)) if (!UNIDADE.test(t.slice(m.index + m[0].length)) && !t.slice(Math.max(0, m.index - 4), m.index).includes('$')) out.add(m[1]);
  return [...out];
}
function donas(t) {
  const out = new Set();
  for (const m of t.matchAll(/\bdona\s+([a-z]{3,})/g)) if (!['de', 'do', 'da', 'dela', 'dele', 'desse', 'deste', 'disso', 'casa'].includes(m[1])) out.add(m[1]);
  return [...out];
}
const MORA = /\b(eu )?moro (aqui(?! (perto|pertinho|do lado|ao lado|na rua|no bairro|em frente|na frente|na esquina))|nesse predio|neste predio|no predio|no apartamento|no ap|no \d{3}|no trezentos)|\b(meu|o meu) (apartamento|apto|ap)\b|\bminha casa e (aqui|o|no)\b/;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function fatosDaFrase(frase, conversa = []) {
  const t = semAcento(frase);
  const corrigiu = ultimoTrecho(t) !== t;
  const fim = ultimoTrecho(t);
  const ap = apartamentos(fim).length ? apartamentos(fim) : apartamentos(t);
  const nomes = donas(fim).length ? donas(fim) : donas(t);
  const antes = conversa.filter((c) => c.quem === 'voce').map((c) => ultimoTrecho(semAcento(c.texto)));
  const apAntes = new Set(antes.flatMap(apartamentos)), nomesAntes = new Set(antes.flatMap(donas));
  const f = [];
  if (corrigiu) f.push('a pessoa se corrigiu no meio da frase: vale o que ela disse por último');
  if (nomes.includes('marta')) f.push('citou o nome certo da moradora: Dona Marta');
  for (const n of nomes) if (n !== 'marta') f.push(`citou outro nome (Dona ${capital(n)}): a moradora do 302 é a Dona Marta`);
  if (ap.includes('302')) f.push('citou o apartamento certo: 302');
  for (const a of ap) if (a !== '302') f.push(`citou o apartamento ${a}, que NÃO é o da Dona Marta (ela mora no 302)`);
  for (const a of ap) for (const b of apAntes) if (a !== b) f.push(`mudou o apartamento: antes disse ${b}, agora disse ${a}`);
  for (const n of nomes) for (const b of nomesAntes) if (n !== b) f.push(`mudou o nome da moradora: antes disse Dona ${capital(b)}, agora Dona ${capital(n)}`);
  if (MORA.test(t)) f.push('a pessoa diz que MORA no prédio, mas o Seu Valdir conhece todos os moradores e nunca viu essa pessoa: é mentira');
  if (!nomes.length && !ap.length) f.push('nenhum nome de moradora nem apartamento NESTA frase');
  if (nomesAntes.has('marta') && !nomes.includes('marta')) f.push('em frase anterior a pessoa já tinha dito o nome certo (Dona Marta)');
  if (apAntes.has('302') && !ap.includes('302')) f.push('em frase anterior a pessoa já tinha dito o apartamento certo (302)');
  return [...new Set(f)].slice(0, 6);
}
const nivelConf = (n) => (n >= 70 ? 'alta: falta pouco para ele liberar' : n >= 45 ? 'média' : n >= 25 ? 'baixa' : 'muito baixa');
const nivelPac = (n) => (n >= 70 ? 'alta' : n >= 40 ? 'média' : n >= 20 ? 'baixa' : 'quase acabando');
const num = (v, padrao) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : padrao; };
function limparConversa(c) {
  return (Array.isArray(c) ? c : []).slice(-10).filter((x) => x && typeof x.texto === 'string').map((x) => ({
    quem: x.quem === 'valdir' ? 'valdir' : 'voce', texto: corta(x.texto, 170), tatica: IDS_TATICAS.has(x.tatica) ? x.tatica : '',
  }));
}


// ---------- testes (frases de jogador de verdade; o esperado aceita lista quando mais de uma resposta serve) ----------
const TXT = Object.fromEntries(FALAS.map((f) => [f.id, f.texto]));
const v = (texto, tatica) => ({ quem: 'voce', texto, tatica });
const s = (id) => ({ quem: 'valdir', texto: TXT[id] });
const t = (titulo, frase, esperado, extra = {}) => ({ titulo, jogada: 'falar', dados: { frase, confianca: 20, paciencia: 100, ...extra }, esperado });
const TESTES = [
  t('entrega sem nome', 'Boa noite, chefe! Tenho uma pizza aqui pra entregar.', { tatica: 'explicacao', efeito_confianca: [2, 3], efeito_paciencia: [2, 3], contradicao: false, fala: 'entrega_quem' }),
  t('entrega com nome e apartamento', 'É pra Dona Marta, do apartamento 302. Calabresa com borda recheada.', { tatica: 'explicacao', efeito_confianca: 4, efeito_paciencia: [2, 3], contradicao: false, fala: 'entrega_confere' },
    { conversa: [v('Boa noite, chefe! Tenho uma pizza aqui pra entregar.', 'explicacao'), s('entrega_quem')], usadas: ['entrega_quem'], confianca: 32 }),
  t('suborno', 'Deixa eu subir rapidinho que eu te dou vinte reais.', { tatica: 'suborno', efeito_confianca: 0, efeito_paciencia: [0, 1], contradicao: false, fala: 'suborno' }),
  t('suborno de novo', 'Tá bom, cinquenta reais então. Fechado?', { tatica: 'suborno', efeito_confianca: 0, efeito_paciencia: [0, 1], contradicao: false, fala: 'suborno_de_novo' },
    { conversa: [v('Te dou vinte reais pra me deixar subir.', 'suborno'), s('suborno')], usadas: ['suborno'], confianca: 0, paciencia: 85 }),
  t('suborno com comida', 'Te dou uma fatia da pizza se o senhor me deixar subir.', { tatica: 'suborno', efeito_confianca: [0, 1], efeito_paciencia: [1, 2], contradicao: false, fala: 'suborno_comida' }),
  t('Vasco', 'Peraí, essa flâmula aí atrás é do Vasco? O senhor é vascaíno?', { tatica: 'futebol_vasco', efeito_confianca: [3, 4], efeito_paciencia: [3, 4], contradicao: false, fala: 'vasco' }),
  t('Vasco de novo', 'Eu também sou Vasco desde criança! Meu avô me levava em São Januário.', { tatica: 'futebol_vasco', efeito_confianca: [3, 4], efeito_paciencia: [3, 4], contradicao: false, fala: 'vasco_2' },
    { conversa: [v('O senhor é vascaíno?', 'futebol_vasco'), s('vasco')], usadas: ['vasco'], confianca: 45 }),
  t('outro time', 'Eu sou flamenguista, mas respeito muito o Vasco.', { tatica: 'futebol_vasco', efeito_confianca: [2, 3], efeito_paciencia: [2, 3, 4], contradicao: false, fala: 'outro_time' }),
  t('futebol em geral', 'O senhor viu o jogo de ontem? Que golaço no final!', { tatica: 'futebol_vasco', efeito_confianca: [2, 3], contradicao: false, fala: 'futebol' }),
  t('grosseria', 'Abre logo essa porta, meu chapa, eu não tenho a noite toda!', { tatica: 'grosseria', efeito_confianca: [0, 1], efeito_paciencia: [0, 1], contradicao: false, fala: 'grosseria' }),
  t('grosseria de novo', 'Ô, seu velho chato, libera essa porcaria logo!', { tatica: 'grosseria', efeito_confianca: [0, 1], efeito_paciencia: 0, contradicao: false, fala: 'grosseria_2' },
    { conversa: [v('Abre logo essa porta, meu chapa!', 'grosseria'), s('grosseria')], usadas: ['grosseria'], paciencia: 70 }),
  t('ameaça', 'Se o senhor não me deixar subir, eu vou fazer o senhor ser demitido.', { tatica: 'autoridade_ameaca', efeito_confianca: [0, 1], efeito_paciencia: [0, 1], contradicao: false, fala: 'ameaca' }),
  t('carteirada', 'O senhor sabe com quem está falando? Eu sou advogado.', { tatica: 'autoridade_ameaca', efeito_confianca: [0, 1], efeito_paciencia: [0, 1], contradicao: false, fala: 'carteirada' }),
  t('chamar o síndico', 'Então chama o síndico, que eu vou reclamar com ele!', { tatica: ['autoridade_ameaca', 'grosseria'], efeito_confianca: [0, 1, 2], contradicao: false, fala: 'chama_sindico' }),
  t('piada leve', 'Prometo que não vou roubar o elevador, Seu Valdir. Ele é pesado demais pra mim.', { tatica: 'humor', efeito_confianca: 3, efeito_paciencia: [3, 4], contradicao: false, fala: 'risada' }),
  t('outra piada', 'E se eu subir de escada, conta como visita ou como academia?', { tatica: 'humor', efeito_confianca: [2, 3], efeito_paciencia: [3, 4], contradicao: false, fala: ['risada_2', 'piada_ruim'] },
    { conversa: [v('Prometo que não vou roubar o elevador.', 'humor'), s('risada')], usadas: ['risada'], confianca: 32 }),
  t('elogio ao bigode', 'Que bigode bonito, hein, Seu Valdir! Parece de galã de novela.', { tatica: 'elogio', efeito_confianca: 3, efeito_paciencia: [3, 4], contradicao: false, fala: 'elogio_bigode' }),
  t('elogio ao trabalho', 'O senhor faz um trabalho muito importante, viu? Esse prédio é seguro por causa do senhor.', { tatica: 'elogio', efeito_confianca: 3, efeito_paciencia: [3, 4], contradicao: false, fala: 'elogio_trabalho' }),
  t('bajulação', 'E esse quepe, então? O senhor é o porteiro mais elegante do Rio de Janeiro!', { tatica: 'elogio', efeito_confianca: [1, 2, 3], contradicao: false, fala: 'bajulacao' },
    { conversa: [v('Que bigode bonito, Seu Valdir!', 'elogio'), s('elogio_bigode')], usadas: ['elogio_bigode'], confianca: 32 }),
  t('mentira óbvia', 'Eu sou o dono do prédio, só esqueci a chave em casa.', { tatica: ['mentira_contradicao', 'autoridade_ameaca'], efeito_confianca: [0, 1], contradicao: false, fala: 'papai_noel' }),
  t('contradição', 'Na verdade eu sou sobrinho dela, vim fazer uma visita.', { tatica: 'mentira_contradicao', efeito_confianca: 0, contradicao: true, fala: 'contradicao' },
    { conversa: [v('Sou o entregador da farmácia, trouxe o remédio da Dona Marta.', 'explicacao'), s('detalhe_bom')], usadas: ['detalhe_bom'], confianca: 32 }),
  t('mudou o apartamento', 'É pro 303, da Dona Marta.', { efeito_confianca: 0, contradicao: true, fala: ['contradicao', 'apartamento_errado'] },
    { conversa: [v('Entrega pra Dona Marta, do 302.', 'explicacao'), s('entrega_confere')], usadas: ['entrega_confere'], confianca: 45 }),
  t('apartamento errado', 'É uma entrega pra Dona Marta, do 301.', { tatica: ['explicacao', 'mentira_contradicao'], efeito_confianca: [0, 1], contradicao: false, fala: 'apartamento_errado' }),
  t('corrigiu no meio', 'É pro 202… não, pera, é pro 302, da Dona Marta.', { tatica: 'explicacao', efeito_confianca: [3, 4], contradicao: false, fala: 'entrega_confere' }),
  t('pedido educado', 'Por favor, Seu Valdir, com licença, eu posso subir rapidinho?', { tatica: 'pedido_educado', efeito_confianca: [2, 3], efeito_paciencia: [2, 3], contradicao: false, fala: ['educado', 'quem_e_voce'] }),
  t('cumprimento', 'Boa noite, Seu Valdir! Tudo bem com o senhor?', { tatica: 'pedido_educado', efeito_confianca: [2, 3], efeito_paciencia: [2, 3], contradicao: false, fala: 'cumprimento' }),
  t('apelo emocional', 'Por favor, a Dona Marta é minha avó, ela tá doente e sozinha lá em cima.', { tatica: ['apelo_emocional', 'explicacao'], efeito_confianca: 3, contradicao: false, fala: ['emocionado', 'parente'] }),
  t('drama', 'Se eu não subir agora eu vou chorar aqui na sua frente, e a culpa vai ser sua!', { tatica: 'apelo_emocional', efeito_confianca: [1, 2], efeito_paciencia: [0, 1], contradicao: false, fala: 'drama' }),
  t('papo aleatório', 'O senhor viu a novela ontem? Que final, hein!', { tatica: 'papo_aleatorio', efeito_confianca: 2, efeito_paciencia: [1, 2], contradicao: false, fala: 'aleatorio' }),
  t('tempo', 'Nossa, que calor que tá fazendo hoje, né?', { tatica: 'papo_aleatorio', efeito_confianca: 2, contradicao: false, fala: 'clima' }),
  t('pergunta sobre ele', 'Há quanto tempo o senhor trabalha aqui, Seu Valdir?', { tatica: ['papo_aleatorio', 'pedido_educado', 'elogio'], efeito_confianca: [2, 3], contradicao: false, fala: 'sobre_ele' }),
  t('mostra a prova', 'Olha aqui a mensagem dela no meu celular: pode subir, Pedro, tô te esperando.', { tatica: 'explicacao', efeito_confianca: 4, contradicao: false, fala: 'prova_ok' },
    { conversa: [v('A Dona Marta disse que eu podia subir.', 'explicacao'), s('quero_prova')], usadas: ['quero_prova'], confianca: 32 }),
  t('diz que ela autorizou', 'A Dona Marta disse que eu podia subir, ela tá me esperando.', { tatica: 'explicacao', efeito_confianca: [2, 3], contradicao: false, fala: 'quero_prova' }),
  t('pede para interfonar', 'Interfona de novo pra ela, por favor, ela deve estar no banho.', { tatica: ['pedido_educado', 'explicacao'], efeito_confianca: [2, 3], contradicao: false, fala: 'interfone_de_novo' }),
  t('desculpas', 'Desculpa, Seu Valdir, eu fui grosso com o senhor. Foi mal mesmo.', { tatica: 'pedido_educado', efeito_confianca: 3, efeito_paciencia: [3, 4], contradicao: false, fala: 'desculpa_aceita' },
    { conversa: [v('Abre logo essa porta, meu chapa!', 'grosseria'), s('grosseria')], usadas: ['grosseria'], confianca: 8, paciencia: 70 }),
  t('parente', 'Eu sou o sobrinho da Dona Marta, vim trazer o bolo de aniversário dela.', { tatica: 'explicacao', efeito_confianca: [3, 4], contradicao: false, fala: ['parente', 'detalhe_bom'] }),
  t('frase sem sentido', 'Batata.', { tatica: 'papo_aleatorio', efeito_confianca: 2, contradicao: false, fala: ['nao_entendi', 'aleatorio'] }),
  t('quase lá', 'E olha: ela pediu pra eu tocar a campainha duas vezes, que é o nosso código.', { tatica: 'explicacao', efeito_confianca: [3, 4], contradicao: false, fala: ['quase_la', 'detalhe_bom'] },
    { conversa: [v('Entrega pra Dona Marta, do 302.', 'explicacao'), s('entrega_confere'), v('O senhor é vascaíno? Eu também!', 'futebol_vasco'), s('vasco')], usadas: ['entrega_confere', 'vasco'], confianca: 70 }),
  t('remédio depois de nome e apartamento', 'Ela tá gripada e pediu pra eu trazer o remédio dela.', { tatica: ['explicacao', 'apelo_emocional'], efeito_confianca: [3, 4], contradicao: false, fala: ['detalhe_bom', 'emocionado', 'sem_autorizacao'] },
    { conversa: [v('Boa noite! Sou o sobrinho da Dona Marta, do 302.', 'explicacao'), s('parente')], usadas: ['parente'], confianca: 45 }),
  t('entregador com pressa e mistura', 'Boa noite, sou do delivery, é pra Dona Marta do 302 e eu tô atrasado, por favor!', { tatica: ['explicacao', 'pedido_educado'], efeito_confianca: [3, 4], contradicao: false, fala: 'entrega_confere' }),
  t('técnico da internet', 'Sou o técnico da internet, vim consertar o wi-fi do apartamento da Dona Marta.', { tatica: 'explicacao', efeito_confianca: [3, 4], contradicao: false, fala: ['detalhe_bom', 'sem_autorizacao', 'quero_prova'] }),
  t('pedido de banheiro', 'Seu Valdir, vou ser sincero: eu só queria usar o banheiro.', { tatica: ['papo_aleatorio', 'explicacao', 'apelo_emocional', 'humor'], efeito_confianca: [2, 3], contradicao: false, fala: ['aleatorio', 'sem_autorizacao', 'risada', 'furado', 'emocionado', 'detalhe_bom'] }),
  t('mora no 302', 'Eu esqueci a minha chave, eu moro no 302.', { tatica: ['mentira_contradicao', 'explicacao'], efeito_confianca: [0, 1], contradicao: false, fala: ['papai_noel', 'furado'] }),
  t('jogo do Vasco', 'Hoje tem Vasco e Flamengo, hein!', { tatica: 'futebol_vasco', efeito_confianca: [3, 4], efeito_paciencia: [3, 4], contradicao: false, fala: 'vasco_jogo' }),
  t('grito de Vasco', 'Vascoooo! Aqui é Vasco, Seu Valdir!', { tatica: 'futebol_vasco', efeito_confianca: [3, 4], efeito_paciencia: [3, 4], contradicao: false, fala: 'vasco' }),
];

export default {
  id: 'convenca-porteiro',
  titulo: 'Convença o Porteiro',
  emoji: '🚪',
  categoria: 'ao-vivo',
  ordem: 0.5,
  resumo: 'Você precisa subir ao 302 e o Seu Valdir não deixa: convença o porteiro falando. Ele responde com a própria voz, em meio segundo.',
  descricao: 'A cada frase sua, uma chamada só ao Jev classifica a tática (suborno, Vasco, educação…), mede o efeito na confiança e na paciência do porteiro, percebe contradição com o que você disse antes e escolhe a resposta dele numa lista fechada de 44 falas gravadas, que tocam na hora: conversa por voz em ~0,4 s, sem LLM escrevendo texto e sem o personagem sair do roteiro. Para adaptar, troque o porteiro por um cliente difícil, um recrutador ou um personagem do seu jogo e grave as suas falas.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#f59e0b', acento2: '#10b981' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'voz',
    comoTestar: 'aperte o microfone e tente convencer o Seu Valdir a deixar você subir ao 302 da Dona Marta. Tente educação, uma piada, uma explicação com nome e apartamento, um suborno (piora!)… e descubra o time dele.',
  },
  falas: FALAS,
  taticas: TATICAS,
  fatos: fatosDaFrase,
  // números do jogo (a tela usa): começa com confiança 20 e paciência 100; sobe com confiança ≥ 80; perde com paciência 0
  regras: { confiancaInicial: 20, pacienciaInicial: 100, libera: 80, deltaConfianca: [-25, -12, 0, 12, 25], deltaPaciencia: [-25, -12, -3, 6, 12], contradicao: { confianca: -15, paciencia: -10 } },
  contexto: {
    cena: 'Portaria do Edifício Solar das Acácias, à noite. A pessoa quer subir ao apartamento 302, da Dona Marta, que não atende o interfone. Quem decide é o porteiro, Seu Valdir: carioca, bigodudo e vascaíno.',
    regras_do_seu_valdir: [
      'só deixa subir com autorização da moradora ou com entrega que traga o nome (Dona Marta) e o apartamento (302) certos',
      'suborno e ameaça pioram',
      'contradição com o que a pessoa disse antes piora muito',
      'educação e paciência ajudam um pouco',
      'humor ajuda se for leve',
      'é vascaíno: falar bem do Vasco amolece o coração dele',
      'lembra de tudo o que já foi dito na conversa',
      'conhece todos os moradores: no 302 mora só a Dona Marta, sozinha',
    ],
  },
  decisoes: [
    {
      id: 'tatica', tipo: 'choice', titulo: 'Tática',
      pergunta: 'Que tática a pessoa usou na frase ATUAL para tentar convencer o porteiro? Escolha a principal. Se a pessoa se corrigiu no meio da frase ("não, pera…"), vale o que ela disse por último.',
      opcoes: TATICAS.map((t) => ({ id: t.id, rotulo: t.rotulo, icone: t.icone, desc: t.desc })),
    },
    {
      id: 'efeito_confianca', tipo: 'score', titulo: 'Efeito na confiança',
      pergunta: 'Quanto a frase ATUAL da pessoa muda a CONFIANÇA que o Seu Valdir tem nela? Siga as regras dele (contexto) e lembre da conversa inteira: repetir o que já tinha dito não sobe de novo. Se a pessoa se corrigiu no meio da frase ("não, pera…"), vale o que ela disse por último.',
      niveis: [
        { rotulo: '−2: cai muito', desc: 'suborno (dinheiro, Pix, presente, comida), ameaça, mentira óbvia, contradição com o que a pessoa disse antes, ou nome ou apartamento errados' },
        { rotulo: '−1: cai um pouco', desc: 'grosseria, carteirada sem prova, piada ofensiva, drama exagerado, história furada' },
        { rotulo: '0: não muda', desc: 'cumprimento, pergunta, papo aleatório, conversa sobre o tempo, outro time de futebol, frase sem sentido, insistir ou repetir sem nada novo' },
        { rotulo: '+1: sobe um pouco', desc: 'pedido educado, desculpas, elogio, piada leve, apelo emocional sincero, dizer que é parente, motivo plausível com detalhe, entrega ainda sem nome ou apartamento, futebol em geral sem falar do Vasco' },
        { rotulo: '+2: sobe muito', desc: 'entrega ou visita com o nome Dona Marta E o apartamento 302 certos; prova da autorização (mensagem, ligação); ou qualquer conversa simpática sobre o Vasco (dizer que é vascaíno, perguntar se ele é vascaíno, lembrar de um jogo ou de um ídolo)' },
      ],
    },
    {
      id: 'efeito_paciencia', tipo: 'score', titulo: 'Efeito na paciência',
      pergunta: 'Quanto a frase ATUAL gasta ou renova a PACIÊNCIA do Seu Valdir? Ele está no fim de um plantão comprido.',
      niveis: [
        { rotulo: '−2: esgota', desc: 'grosseria, xingamento, ameaça, ou suborno de novo' },
        { rotulo: '−1: cansa', desc: 'suborno, carteirada, mentira, drama exagerado, papo aleatório, enrolação, insistir sem nada novo' },
        { rotulo: '0: normal', desc: 'explicação, pergunta, cumprimento, frase comum' },
        { rotulo: '+1: acalma', desc: 'educação, desculpas, elogio, piada leve' },
        { rotulo: '+2: renova', desc: 'falar do Vasco ou uma piada muito boa' },
      ],
    },
    {
      id: 'contradicao', tipo: 'noul', titulo: 'Contradição', rotulo: 'contradisse o que falou antes', icone: '🤨', tom: 'ruim', limiar: 0.7,
      pergunta: 'A frase ATUAL contradiz algo que a PRÓPRIA pessoa disse antes nesta conversa? SIM só quando há conflito claro com uma frase anterior dela: outro nome, outro apartamento, outro motivo, outra profissão ou outro parentesco (veja também os fatos). NÃO quando é a primeira frase, quando só acrescenta detalhe, repete, pede desculpas, muda de assunto ou se corrige dentro da mesma frase ("não, pera…").',
    },
    {
      id: 'fala', tipo: 'choice', titulo: 'Resposta do Seu Valdir',
      pergunta: 'Qual destas falas gravadas o Seu Valdir, o porteiro, responde AGORA à frase atual da pessoa? Cada opção traz a fala e QUANDO usar. Escolha a que responde exatamente ao que a pessoa acabou de dizer, usando a conversa (ele lembra de tudo), os fatos e os medidores. Se a pessoa se corrigiu ("não, pera…"), responda ao que ela disse por último. As falas que ele já disse não estão na lista.',
      opcoes: opcoesFala(),
    },
  ],
  jogadas: {
    // a cada frase da pessoa: a frase, a conversa até agora (com a tática de cada frase), os medidores e as falas já usadas
    falar: {
      estado: (d) => {
        const conversa = limparConversa(d.conversa);
        return {
          frase_atual: corta(d.frase, 320),
          conversa_ate_agora: conversa.length ? conversa.map((c) => (c.quem === 'valdir' ? `Seu Valdir: «${c.texto}»` : `Pessoa: «${c.texto}»${c.tatica ? ` (tática: ${NOME_TATICA[c.tatica]})` : ''}`)) : 'nada ainda: é a primeira frase da pessoa',
          fatos_da_frase: fatosDaFrase(d.frase, conversa),
          medidores: {
            confianca_do_seu_valdir: `${nivelConf(num(d.confianca, 20))} (${num(d.confianca, 20)} de 100; ele libera a partir de 80)`,
            paciencia_do_seu_valdir: `${nivelPac(num(d.paciencia, 100))} (${num(d.paciencia, 100)} de 100)`,
          },
        };
      },
      perguntas: (d) => {
        const usadas = new Set((Array.isArray(d.usadas) ? d.usadas : []).map(String).filter((x) => IDS_FALAS.has(x)));
        return [
          { chave: 'tatica', decisao: 'tatica' },
          { chave: 'efeito_confianca', decisao: 'efeito_confianca' },
          { chave: 'efeito_paciencia', decisao: 'efeito_paciencia' },
          { chave: 'contradicao', decisao: 'contradicao' },
          { chave: 'fala', decisao: 'fala', opcoes: opcoesFala(usadas) },
        ];
      },
    },
  },
  testes: TESTES,
};

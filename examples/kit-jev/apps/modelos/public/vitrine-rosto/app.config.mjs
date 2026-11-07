// A Vitrine que Lê o Seu Rosto — uma loja de demonstração que percebe pela câmera (MediaPipe, no navegador) quando você
// gosta, acha caro ou perde o interesse; o código transforma os números do rosto em PALAVRAS e, a cada ~1,5 s, o Jev
// decide o que você sente e qual módulo a vitrine mostra. A imagem nunca sai do computador: só as palavras vão ao Jev.
// Para adaptar: troque o PRODUTO e os MODULOS abaixo (o seu produto e as suas ofertas), reescreva as regras da decisão
// "mostrar" e o desenho de cada cartão em loja.js (MONTA). O sensor do rosto (rosto.js) e o painel (palco.js) ficam iguais.

// ---------- o produto da loja fictícia (tudo aqui é de demonstração: preços e nomes inventados) ----------
const PRODUTO = {
  loja: 'Ressoa',
  categoria: 'Fone de ouvido sem fio',
  nome: 'Nuvem ANC',
  preco: 'R$ 899,00',
  parcela: '10x de R$ 89,90',
  nota: '4,7',
  avaliacoes: '1.284',
  destaques: ['Cancelamento de ruído', '40 h de bateria', 'Dobrável, 250 g'],
  barata: { nome: 'Nuvem Lite', preco: 'R$ 499,00', parcela: '10x de R$ 49,90' },
  cima: { nome: 'Nuvem Max', preco: 'R$ 1.299,00' },
};

// ---------- os módulos que a vitrine pode pôr na página (lista fechada: o Jev nunca inventa um) ----------
// desc = o que o módulo é + quando ele serve (é o critério que o Jev lê); img = emoji 3D da pasta assets/
const MODULOS = [
  { id: 'parcelas', rotulo: '10x sem juros', icone: '💳', img: 'credit_card', lugar: 'preco',
    desc: `Parcelamento em ${PRODUTO.parcela} sem juros, embaixo do preço: para quem achou o preço caro` },
  { id: 'mais_barata', rotulo: 'Versão mais barata', icone: '🏷️', img: 'label',
    desc: `Versão mais barata, o ${PRODUTO.barata.nome} por ${PRODUTO.barata.preco} (sem cancelamento de ruído): para quem continua achando caro com o parcelamento já na tela, ou balançou a cabeça dizendo não ao preço` },
  { id: 'comparar', rotulo: 'Comparar com o Max', icone: '⚖️', img: 'balance_scale',
    desc: `Comparar lado a lado com o modelo de cima, o ${PRODUTO.cima.nome}: para quem está em dúvida ou comparando (mouse indo e voltando, cabeça inclinada)` },
  { id: 'avaliacoes', rotulo: 'Avaliações com foto', icone: '📸', img: 'camera_with_flash',
    desc: 'Avaliações com foto de quem já comprou: para quem está em dúvida, desconfiado ou surpreso, ou com o mouse nas avaliações' },
  { id: 'troca', rotulo: 'Troca grátis em 30 dias', icone: '🔄', img: 'counterclockwise_arrows_button',
    desc: 'Troca grátis em 30 dias: para quem tem medo de errar na compra (dúvida que não passa, lábios apertados olhando as avaliações)' },
  { id: 'frete', rotulo: 'Chega amanhã', icone: '🚚', img: 'delivery_truck', lugar: 'frete',
    desc: 'Frete que chega amanhã: para quem gostou (sorriso, "sim" com a cabeça, mouse no Comprar) ou está com o mouse no frete; ajuda a fechar a compra' },
  { id: 'video', rotulo: 'Vídeo em uso', icone: '🎬', img: 'clapper_board',
    desc: 'Vídeo do produto em uso (no metrô, no trabalho, correndo): para quem perdeu o interesse (bocejo, olhos fechando, rosto se afastando)' },
  { id: 'chat', rotulo: 'Chat com especialista', icone: '💬', img: 'woman_technologist',
    desc: 'Chat com uma especialista em áudio: para dúvida que já dura muito (mais de 8 s) ou que continua mesmo com a comparação e as avaliações na tela' },
];
const NADA = { id: 'nada', rotulo: 'Nada agora', icone: '⏳', img: 'hourglass_not_done',
  desc: 'nada agora: a pessoa está distraída, os sinais são fracos ou o que ela precisa já está na tela' };

// o que a pessoa sente (a leitura do Jev): emoji 3D da pasta assets/ e a cor da barra
const SENTIMENTOS = [
  { id: 'gostou', rotulo: 'Gostou', icone: '😍', img: 'smiling_face_with_heart-eyes', cor: '#16a34a',
    desc: 'gostou: sorriso (leve ou forte), aceno de cabeça dizendo sim, ou rosto que se aproximou com cara boa; vale olhando qualquer parte da página' },
  { id: 'achou_caro', rotulo: 'Achou caro', icone: '😬', img: 'grimacing_face', cor: '#e8590c',
    desc: 'achou caro: testa franzida, lábios apertados, boca torcida ou cabeça balançando "não" ENQUANTO o mouse está no preço, no parcelamento ou na versão mais barata' },
  { id: 'em_duvida', rotulo: 'Em dúvida', icone: '🤔', img: 'thinking_face', cor: '#7c3aed',
    desc: 'em dúvida ou comparando: testa franzida leve, cabeça inclinada ou lábios apertados olhando fotos, avaliações, comparação ou ficha técnica (não o preço); mouse indo e voltando entre duas partes; ou dúvida que já dura muito' },
  { id: 'sem_interesse', rotulo: 'Sem interesse', icone: '🥱', img: 'yawning_face', cor: '#64748b',
    desc: 'sem interesse: bocejou, olhos quase fechados, rosto se afastou da tela com cara neutra, mouse parado longe do produto' },
  { id: 'distraido', rotulo: 'Distraído', icone: '👀', img: 'eyes', cor: '#0891b2',
    desc: 'distraído: olhando para fora da tela (para o lado, para baixo como quem olha o celular, para cima) ou nenhum rosto na frente da câmera; a atenção não está na loja' },
  { id: 'surpreso', rotulo: 'Surpreso', icone: '😮', img: 'face_with_open_mouth', cor: '#db2777',
    desc: 'surpreso: sobrancelhas levantadas, olhos arregalados ou boca aberta de repente, como quem diz "uau" ou "sério?"' },
  { id: 'nada_claro', rotulo: 'Nada claro', icone: '😐', img: 'neutral_face', cor: '#a8a29e',
    desc: 'nada claro: rosto neutro e atento, sem expressão; sinais fracos, curtos ou que se contradizem; ainda sem sinais' },
];

// ---------- números → palavras (o que a página manda vira texto curto aqui, no código) ----------
const corta = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const lista = (x, n, t) => (Array.isArray(x) ? x : []).map((s) => corta(s, t)).filter(Boolean).slice(0, n);
const IDS = MODULOS.map((m) => m.id);
// null, vazio ou texto = "não sei" (atenção: +null é 0, e 0 aqui quer dizer "a vitrine acabou de mudar")
const segundos = (v) => { if (v == null || v === '' || typeof v === 'boolean') return null; const n = Math.round(+v); return Number.isFinite(n) && n >= 0 ? Math.min(n, 600) : null; };
const ha = (s) => (s == null ? '' : s < 1 ? 'agora há pouco' : s > 20 ? 'há mais de 20 s' : `há ${s} s`);
// na_tela: [{ id, ha: segundos desde que entrou }]
function naTela(x) {
  const out = [];
  for (const it of Array.isArray(x) ? x.slice(0, 10) : []) {
    const id = String(it && it.id || '');
    if (IDS.includes(id) && !out.some((o) => o.id === id)) out.push({ id, ha: segundos(it.ha) });
  }
  return out;
}
const telaEmPalavras = (tela) => (tela.length
  ? tela.map((t) => { const m = MODULOS.find((x) => x.id === t.id); return `${m.desc.split(':')[0]} — entrou ${ha(t.ha)}`; })
  : ['só a página do produto, sem nenhum módulo extra ainda']);
const mudouEmPalavras = (s) => (s == null ? 'a vitrine ainda não mudou desde que a pessoa chegou' : s < 2 ? `a vitrine mudou agora há pouco (${s < 1 ? 'menos de 1' : s} s): é cedo para mudar de novo` : `a vitrine mudou ${ha(s)}`);

export default {
  id: 'vitrine-rosto',
  titulo: 'A Vitrine que Lê o Seu Rosto',
  emoji: '🛍️',
  categoria: 'ao-vivo',
  ordem: 0.1,
  resumo: 'Uma loja que percebe pela câmera quando você gosta, quando acha caro e quando perde o interesse, e muda a vitrine na hora.',
  descricao: 'A câmera mede 8 sinais do seu rosto no próprio navegador (sorriso, testa franzida, olhar, distância…) e o código transforma os números em palavras; a cada 1,5 s o Jev lê essas palavras e o mouse e decide o que você sente, qual módulo a vitrine mostra e se vale interromper — 3 decisões em ~0,3 s, de uma lista fechada de módulos. Com um LLM seria lento e caro demais por visitante, por segundo. Para adaptar, troque o produto, os módulos e as regras no app.config.mjs.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'palco',
  tema: { acento: '#ff6b35', acento2: '#ffb703', modo: 'claro' },
  palco: {
    modulo: './palco.js', css: './palco.css', entrada: 'camera',
    comoTestar: 'aperte "Ligar a câmera" e reaja à loja: sorria para as fotos, franza a testa olhando o preço, balance a cabeça dizendo não, olhe para o lado, boceje. Sem câmera, use os botões de expressão ou o ▶.',
  },
  produto: PRODUTO,
  modulos: MODULOS,
  nada: NADA,
  sentimentos: SENTIMENTOS,
  // regras do código (não do Jev): de quanto em quanto tempo pergunta e quanto o Jev precisa ter de certeza para mudar a página
  ritmo: { intervaloMs: 1500, minimoEntreChamadasMs: 650, limiarMostrar: 0.35, maxCartoes: 4 },
  contexto: {
    loja: `${PRODUTO.loja}, loja online de fones de ouvido (loja de demonstração, preços fictícios)`,
    produto: `${PRODUTO.categoria} ${PRODUTO.nome}, ${PRODUTO.preco}, com cancelamento de ruído e 40 h de bateria`,
    como_os_sinais_chegam: 'a câmera mede o rosto no navegador e o código transforma os números em palavras curtas; a imagem não sai do computador',
  },
  decisoes: [
    {
      id: 'percebido', tipo: 'choice', titulo: 'O que a pessoa sente',
      pergunta: 'Uma pessoa está vendo a página de um produto numa loja online. A câmera percebeu os sinais do rosto (em palavras) e o código diz onde está o mouse. O que a pessoa está sentindo AGORA sobre o produto? Pese mais os sinais fortes, recentes e que já duram 1 s ou mais; um sinal leve de menos de 1 s quase não conta. O lugar do mouse diz sobre o que é a reação (preço, fotos, avaliações…). Se a pessoa está falando, a boca mexendo não é sinal (não é surpresa nem bocejo). Com a câmera desligada não dá para ver o rosto: escolha nada_claro, a não ser que o mouse mostre uma reação clara. Se os sinais são fracos, faltam ou se contradizem, escolha nada_claro.',
      opcoes: SENTIMENTOS.map(({ id, rotulo, icone, cor, desc }) => ({ id, rotulo, icone, cor, desc })),
    },
    {
      id: 'mostrar', tipo: 'choice', titulo: 'O que a vitrine mostra',
      pergunta: 'Você é a vitrine viva desta loja e pode pôr UM módulo novo na página agora. Siga as regras da loja, nesta ordem: (1) distraída, sem rosto na câmera, ou só sinais leves de menos de 1 s → nada; (2) achou caro (careta, testa franzida ou "não" com a cabeça, com o mouse no preço) → parcelas; se as parcelas já estão na tela → mais_barata; (3) sem interesse (bocejo, olhos fechando, rosto se afastando) → video; (4) surpresa → avaliacoes; (5) em dúvida ou comparando (testa franzida fora do preço, cabeça inclinada, mouse indo e voltando entre duas partes) → comparar; se a comparação já está na tela → avaliacoes; dúvida de mais de 8 s, ou com a comparação e as avaliações já na tela → chat; (6) gostou (sorriso, "sim" com a cabeça) → frete; se o frete já está na tela → nada. Com o rosto neutro ou a câmera desligada, o mouse parado há 2 s ou mais num lugar puxa o módulo dele: preço → parcelas, frete → frete, avaliações → avaliacoes; mouse só andando → nada. Os módulos que já estão na tela não estão na lista.',
      opcoes: [...MODULOS, NADA].map(({ id, rotulo, icone, desc }) => ({ id, rotulo, icone, desc })),
    },
    {
      id: 'interromper', tipo: 'noul', titulo: 'Vale interromper?', rotulo: 'mudar a página agora', icone: '⚡', limiar: 0.5,
      pergunta: 'Vale mudar a vitrine AGORA, pondo um módulo novo na página? SIM sempre que houver um sinal claro (forte, ou que já dura 1 s ou mais) de gostar, achar caro, dúvida, tédio ou surpresa que a vitrine ainda não respondeu; ou, com o rosto neutro ou a câmera desligada, o mouse parado há 2 s ou mais no preço, no frete ou nas avaliações. NÃO só nestes casos: (1) a câmera está ligada e não vê nenhum rosto, ou a pessoa olha para fora da tela; (2) o rosto está neutro, sem expressão (ou a câmera está desligada), e o mouse só anda pela página, mesmo com a pessoa falando; (3) os sinais são leves e de menos de 1 s, ou se contradizem; (4) a vitrine mudou há menos de 2 s; (5) o que já está na tela responde ao que a pessoa sente (ex.: ela sorri e o frete de amanhã já apareceu).',
    },
  ],
  jogadas: {
    // a cada ~1,5 s (se os sinais mudaram): o rosto e o mouse em palavras + o que a vitrine já mostra
    ler: {
      estado: (d) => ({
        sinais_do_rosto: lista(d.rosto, 8, 90).length ? lista(d.rosto, 8, 90) : ['ainda sem sinais do rosto'],
        mouse: corta(d.mouse, 120) || 'sem informação do mouse',
        vitrine_agora: telaEmPalavras(naTela(d.na_tela)),
        ultima_mudanca: mudouEmPalavras(segundos(d.mudou)),
      }),
      perguntas: (d) => {
        const fora = naTela(d.na_tela).map((t) => t.id);
        let op = MODULOS.filter((m) => !fora.includes(m.id));
        if (op.length < 2) op = MODULOS;
        return [
          { chave: 'percebido', decisao: 'percebido' },
          { chave: 'mostrar', decisao: 'mostrar', opcoes: [...op, NADA].map(({ id, desc }) => ({ id, desc })) },
          { chave: 'interromper', decisao: 'interromper' },
        ];
      },
    },
  },
  // os testes usam as MESMAS frases que a página gera (rosto.js → emPalavras)
  testes: [
    { titulo: 'sorriso nas fotos', jogada: 'ler', dados: { rosto: ['sorriso forte há 2 s'], mouse: 'mouse andando pelas FOTOS', na_tela: [], mudou: null },
      esperado: { percebido: 'gostou', mostrar: 'frete', interromper: true } },
    { titulo: 'careta olhando o preço', jogada: 'ler', dados: { rosto: ['testa franzida forte há 2 s', 'lábios apertados (boca tensa) há 1 s'], mouse: 'mouse parado sobre o PREÇO há 2 s', na_tela: [], mudou: null },
      esperado: { percebido: 'achou_caro', mostrar: 'parcelas', interromper: true } },
    { titulo: 'ainda caro, com o 10x na tela', jogada: 'ler', dados: { rosto: ['testa franzida forte há 3 s', 'balançou a cabeça dizendo não agora há pouco'], mouse: 'mouse parado sobre o PREÇO há 3 s', na_tela: [{ id: 'parcelas', ha: 4 }], mudou: 4 },
      esperado: { percebido: 'achou_caro', mostrar: 'mais_barata', interromper: true } },
    { titulo: 'olhou para o lado', jogada: 'ler', dados: { rosto: ['olhando para fora da tela, para o lado, há 3 s'], mouse: 'mouse parado sobre as FOTOS há 4 s', na_tela: [{ id: 'frete', ha: 6 }], mudou: 6 },
      esperado: { percebido: 'distraido', mostrar: 'nada', interromper: false } },
    { titulo: 'saiu da frente da câmera', jogada: 'ler', dados: { rosto: ['nenhum rosto na frente da câmera há 4 s'], mouse: 'mouse parado longe do produto há 5 s', na_tela: [] },
      esperado: { percebido: 'distraido', mostrar: 'nada', interromper: false } },
    { titulo: 'bocejo', jogada: 'ler', dados: { rosto: ['bocejou agora há pouco', 'olhos quase fechados há 2 s'], mouse: 'mouse parado longe do produto há 4 s', na_tela: [] },
      esperado: { percebido: 'sem_interesse', mostrar: 'video', interromper: true } },
    { titulo: 'surpresa vendo o vídeo', jogada: 'ler', dados: { rosto: ['sobrancelhas levantadas e boca aberta, de repente (agora)'], mouse: 'mouse parado sobre o módulo «Vídeo em uso» há 2 s', na_tela: [{ id: 'video', ha: 5 }], mudou: 5 },
      esperado: { percebido: 'surpreso', mostrar: 'avaliacoes', interromper: true } },
    { titulo: 'rosto neutro', jogada: 'ler', dados: { rosto: ['rosto neutro, olhando para a tela, há 3 s'], mouse: 'mouse andando pela FICHA TÉCNICA', na_tela: [] },
      esperado: { percebido: 'nada_claro', mostrar: 'nada', interromper: false } },
    { titulo: 'indo e voltando', jogada: 'ler', dados: { rosto: ['testa franzida leve há 2 s'], mouse: 'mouse indo e voltando entre as FOTOS e a FICHA TÉCNICA', na_tela: [] },
      esperado: { percebido: 'em_duvida', mostrar: 'comparar', interromper: true } },
    { titulo: 'cabeça inclinada na comparação', jogada: 'ler', dados: { rosto: ['cabeça inclinada de lado há 2 s', 'lábios apertados (boca tensa) há 2 s'], mouse: 'mouse parado sobre o módulo «Comparar com o Max» há 3 s', na_tela: [{ id: 'comparar', ha: 5 }], mudou: 5 },
      esperado: { percebido: 'em_duvida', mostrar: 'avaliacoes', interromper: true } },
    { titulo: 'dúvida que não passa', jogada: 'ler', dados: { rosto: ['testa franzida leve há 9 s', 'cabeça inclinada de lado há 6 s'], mouse: 'mouse indo e voltando entre as AVALIAÇÕES e o módulo «Comparar com o Max»', na_tela: [{ id: 'comparar', ha: 12 }, { id: 'avaliacoes', ha: 6 }], mudou: 6 },
      esperado: { percebido: 'em_duvida', mostrar: 'chat', interromper: true } },
    { titulo: '"sim" com a cabeça no Comprar', jogada: 'ler', dados: { rosto: ['sorriso leve há 1 s', 'acenou com a cabeça dizendo sim agora há pouco'], mouse: 'mouse parado sobre o botão COMPRAR há 1 s', na_tela: [] },
      esperado: { percebido: 'gostou', mostrar: 'frete', interromper: true } },
    { titulo: 'sorrindo, frete já na tela', jogada: 'ler', dados: { rosto: ['sorriso forte há 4 s'], mouse: 'mouse parado sobre o botão COMPRAR há 2 s', na_tela: [{ id: 'frete', ha: 3 }], mudou: 3 },
      esperado: { percebido: 'gostou', mostrar: 'nada', interromper: false } },
    { titulo: 'a vitrine acabou de mudar', jogada: 'ler', dados: { rosto: ['testa franzida forte há 3 s'], mouse: 'mouse parado sobre o PREÇO há 3 s', na_tela: [{ id: 'parcelas', ha: 1 }], mudou: 1 },
      esperado: { percebido: 'achou_caro', mostrar: ['mais_barata', 'nada'], interromper: false } },
    { titulo: 'afastou o rosto, entediado', jogada: 'ler', dados: { rosto: ['afastou o rosto da tela agora há pouco', 'olhos quase fechados há 2 s'], mouse: 'mouse parado longe do produto há 6 s', na_tela: [] },
      esperado: { percebido: 'sem_interesse', mostrar: 'video', interromper: true } },
    { titulo: '"não" com a cabeça no preço', jogada: 'ler', dados: { rosto: ['balançou a cabeça dizendo não agora há pouco'], mouse: 'mouse parado sobre o PREÇO há 2 s', na_tela: [] },
      esperado: { percebido: 'achou_caro', mostrar: ['parcelas', 'mais_barata'], interromper: true } },
    { titulo: 'olhando o celular', jogada: 'ler', dados: { rosto: ['olhando para fora da tela, para baixo, há 4 s'], mouse: 'mouse parado longe do produto há 5 s', na_tela: [{ id: 'parcelas', ha: 8 }], mudou: 8 },
      esperado: { percebido: 'distraido', mostrar: 'nada', interromper: false } },
    { titulo: 'olhos fechando', jogada: 'ler', dados: { rosto: ['olhos quase fechados há 4 s'], mouse: 'mouse parado sobre a FICHA TÉCNICA há 6 s', na_tela: [] },
      esperado: { percebido: 'sem_interesse', mostrar: 'video', interromper: true } },
    { titulo: 'testa franzida nas avaliações', jogada: 'ler', dados: { rosto: ['testa franzida leve há 2 s', 'lábios apertados (boca tensa) há 2 s'], mouse: 'mouse parado sobre as AVALIAÇÕES há 3 s', na_tela: [] },
      esperado: { percebido: 'em_duvida', mostrar: ['avaliacoes', 'troca', 'comparar'], interromper: true } },
    { titulo: 'uau nas fotos', jogada: 'ler', dados: { rosto: ['sobrancelhas levantadas e olhos arregalados, de repente (agora)'], mouse: 'mouse parado sobre as FOTOS há 1 s', na_tela: [] },
      esperado: { percebido: 'surpreso', mostrar: ['avaliacoes', 'video'], interromper: true } },
    { titulo: 'aproximou sorrindo', jogada: 'ler', dados: { rosto: ['aproximou o rosto da tela agora há pouco', 'sorriso leve há 2 s'], mouse: 'mouse parado sobre as FOTOS há 2 s', na_tela: [] },
      esperado: { percebido: 'gostou', mostrar: ['frete', 'video', 'avaliacoes'], interromper: true } },
    { titulo: 'mouse no frete, rosto neutro', jogada: 'ler', dados: { rosto: ['rosto neutro, olhando para a tela, há 4 s'], mouse: 'mouse parado sobre o FRETE há 3 s', na_tela: [] },
      esperado: { mostrar: 'frete', interromper: true } },
    { titulo: 'falando, sem expressão', jogada: 'ler', dados: { rosto: ['falando (a boca mexe porque está falando)', 'rosto neutro, olhando para a tela, há 3 s'], mouse: 'mouse andando pelas FOTOS', na_tela: [] },
      esperado: { percebido: 'nada_claro', interromper: false } },
    { titulo: 'ainda caro, com o 10x e o Lite', jogada: 'ler', dados: { rosto: ['testa franzida forte há 4 s', 'lábios apertados (boca tensa) há 3 s'], mouse: 'mouse parado sobre o módulo «Versão mais barata» há 3 s', na_tela: [{ id: 'parcelas', ha: 12 }, { id: 'mais_barata', ha: 6 }], mudou: 6 },
      esperado: { percebido: 'achou_caro', mostrar: ['chat', 'troca', 'nada'] } },
    { titulo: 'falando e sorrindo', jogada: 'ler', dados: { rosto: ['falando (a boca mexe porque está falando)', 'sorriso forte há 2 s'], mouse: 'mouse andando pelas FOTOS', na_tela: [] },
      esperado: { percebido: 'gostou', mostrar: ['frete', 'video', 'avaliacoes'] } },
    { titulo: 'falando e franzindo no preço', jogada: 'ler', dados: { rosto: ['falando (a boca mexe porque está falando)', 'testa franzida forte há 2 s'], mouse: 'mouse parado sobre o PREÇO há 2 s', na_tela: [] },
      esperado: { percebido: 'achou_caro', mostrar: 'parcelas', interromper: true } },
    { titulo: 'gostou, depois franziu no preço', jogada: 'ler', dados: { rosto: ['testa franzida forte há 2 s'], mouse: 'mouse parado sobre o PREÇO há 2 s', na_tela: [{ id: 'frete', ha: 7 }], mudou: 7 },
      esperado: { percebido: 'achou_caro', mostrar: 'parcelas', interromper: true } },
    { titulo: 'câmera desligada, mouse no preço', jogada: 'ler', dados: { rosto: ['câmera desligada: sem sinais do rosto, só o mouse'], mouse: 'mouse parado sobre o PREÇO há 3 s', na_tela: [] },
      esperado: { mostrar: 'parcelas', interromper: true } },
    { titulo: 'câmera desligada, mouse nas avaliações', jogada: 'ler', dados: { rosto: ['câmera desligada: sem sinais do rosto, só o mouse'], mouse: 'mouse parado sobre as AVALIAÇÕES há 2 s', na_tela: [{ id: 'parcelas', ha: 9 }], mudou: 9 },
      esperado: { mostrar: 'avaliacoes', interromper: true } },
    { titulo: 'câmera desligada, mouse andando', jogada: 'ler', dados: { rosto: ['câmera desligada: sem sinais do rosto, só o mouse'], mouse: 'mouse andando pelas FOTOS', na_tela: [] },
      esperado: { percebido: 'nada_claro', mostrar: 'nada', interromper: false } },
  ],
};

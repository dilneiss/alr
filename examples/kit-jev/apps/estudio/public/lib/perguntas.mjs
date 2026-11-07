// Monta as perguntas tipadas enviadas ao Jev — 6 grupos, um por artefato, disparados EM PARALELO a cada pausa na fala.
// Usado pelo servidor (para chamar o Jev) e pela página (rótulos do Raio-X). Todas as escolhas criativas saem daqui.
import * as B from './biblioteca.mjs';
import { ICONES } from './icones.mjs';

const choice = (instructions, lista, rot = (o) => o.rotulo) => ({
  q: { type: 'choice', instructions, criteria: Object.fromEntries(lista.map((o) => [o.id, o.jev])) },
  opcoes: Object.fromEntries(lista.map((o) => [o.id, rot(o)])),
});
const score = (instructions, niveis, rotulos) => ({ q: { type: 'score', instructions, criteria: niveis }, opcoes: Object.fromEntries(rotulos.map((r, i) => [String(i), r])) });
const noul = (instructions, sim, nao) => ({ q: { type: 'noul', instructions, ...(sim ? { criteria: { true: sim, false: nao } } : {}) }, opcoes: null });

export const CONTEXTO = 'Transcrição de voz ao vivo (pode estar incompleta e sem pontuação) de uma pessoa descrevendo o próprio negócio. '
  + 'Com base nela vamos criar site, identidade visual, carrosséis de Instagram, e-mail marketing (template e assinatura) e anúncios de display. '
  + 'Se a pessoa mudar de ideia ou corrigir algo no meio da fala, vale o que ela disse por último.';

export function estado(texto) {
  return { fala_da_pessoa: texto, contexto: CONTEXTO };
}

export const GRUPOS = [
  { id: 'entender', rotulo: 'Entendimento', icone: '🧠', painel: 'todos' },
  { id: 'site', rotulo: 'Site', icone: '🌐', painel: 'site' },
  { id: 'marca', rotulo: 'Identidade visual', icone: '🎨', painel: 'marca' },
  { id: 'posts', rotulo: 'Carrosséis', icone: '📸', painel: 'posts' },
  { id: 'email', rotulo: 'E-mail marketing', icone: '✉️', painel: 'email' },
  { id: 'anuncios', rotulo: 'Anúncios', icone: '📣', painel: 'anuncios' },
];

// meta[qid] = { grupo, rotulo, tipo, opcoes, livre }  (livre = pode ser re-sorteada no "Outra versão")
function montar() {
  const G = { entender: {}, site: {}, marca: {}, posts: {}, email: {}, anuncios: {} };
  const meta = {};
  const add = (grupo, id, rotulo, def, livre = false) => { G[grupo][id] = def.q; meta[id] = { grupo, rotulo, tipo: def.q.type, opcoes: def.opcoes, livre }; };

  // ---- entendimento (vale para todos os artefatos)
  add('entender', 'seg', 'Segmento', choice('Qual é o segmento do negócio que a pessoa está descrevendo?', B.SEGMENTOS));
  add('entender', 'pers', 'Personalidade da marca', choice('Qual personalidade de marca combina com o jeito que a pessoa descreveu o negócio e com o estilo que ela pediu?', B.PERSONALIDADES));
  add('entender', 'pub', 'Público principal', choice('Qual é o público principal desse negócio?', B.PUBLICOS));
  add('entender', 'obj', 'Objetivo principal', choice('Qual é o principal objetivo do site e das redes desse negócio?', B.OBJETIVOS));
  add('entender', 'canal', 'Canal principal', choice('Por qual canal esse negócio mais vende ou atende os clientes?', B.CANAIS));
  add('entender', 'preco', 'Faixa de preço', score('Qual é a faixa de preço percebida desse negócio?', B.PRECO, B.PRECO_ROT));
  add('entender', 'mat', 'Tempo de mercado', score('Há quanto tempo esse negócio existe?', B.MATURIDADE, B.MATURIDADE_ROT));
  add('entender', 'dif', 'Diferencial em destaque', choice('Qual diferencial esse negócio deve destacar primeiro, pelo que a pessoa falou?', B.ANGULOS));
  add('entender', 'oferta', 'Oferta de boas-vindas', choice('Qual oferta de boas-vindas faz sentido para esse negócio (vale para site, carrosséis, e-mail e anúncios)?', B.OFERTAS));
  add('entender', 'emoji', 'Emojis', score('Quantos emojis a marca desse negócio deve usar nas legendas, e-mails e anúncios?', B.EMOJIS, B.EMOJIS_ROT));

  // ---- site
  add('site', 'hero', 'Layout do topo', choice('Qual layout de topo (hero) da landing page combina com esse negócio e com o estilo que a pessoa pediu?', B.HEROS), true);
  add('site', 'titulo', 'Título do site', choice('Qual título principal do site combina com o tom e a personalidade desse negócio?', B.TITULOS), true);
  add('site', 'cta', 'Botão principal', choice('Qual deve ser o botão principal (chamada para ação) do site desse negócio?', B.CTAS), true);
  add('site', 'img', 'Estilo de ilustração', choice('Qual estilo de ilustração combina com a marca e com o clima que a pessoa descreveu?', B.ESTILOS_IMG), true);
  add('site', 'dens', 'Densidade', score('Quanta informação o site desse negócio deve mostrar?', B.DENSIDADE, B.DENSIDADE_ROT));
  add('site', 'btn', 'Estilo dos botões', choice('Qual estilo de botão combina com a marca?', B.BOTOES), true);
  add('site', 'cantos', 'Cantos dos blocos', choice('Quão arredondados devem ser os cartões e blocos do site?', B.CANTOS), true);
  add('site', 'textura', 'Textura de fundo', choice('Qual textura de fundo combina com a marca?', B.TEXTURAS), true);
  for (const s of B.SECOES) add('site', `sec_${s.id}`, `Seção: ${s.rotulo}`, noul(`O site desse negócio deve ter ${s.jev}?`));
  for (const s of B.SELOS) add('site', `selo_${s.id}`, `Selo no topo: ${s.rotulo}`, noul(`O topo do site desse negócio deve destacar ${s.jev}?`));

  // ---- marca
  add('marca', 'paleta', 'Paleta de cores', choice('Qual paleta de cores combina com esse negócio e com o clima que a pessoa descreveu? Se ela mudou de ideia no meio da fala, vale o que disse por último.', B.PALETAS), true);
  add('marca', 'fonte', 'Par de fontes', choice('Qual par de fontes combina com a marca desse negócio?', B.FONTES), true);
  add('marca', 'icone', 'Ícone do logo', choice('Qual ícone deve estar no logo desse negócio?', ICONES), true);
  add('marca', 'forma', 'Moldura do símbolo', choice('Qual forma de moldura combina com o símbolo do logo?', B.FORMAS), true);
  add('marca', 'disp', 'Montagem do logo', choice('Como o logo desse negócio deve ser montado?', B.DISPOSICOES), true);
  add('marca', 'caixa', 'Caixa do nome', choice('Como escrever o nome no logo?', B.CAIXAS), true);
  add('marca', 'estilo', 'Estilo do logo', choice('Qual estilo de logo combina com esse negócio, com a personalidade da marca e com o que a pessoa pediu?', B.ESTILOS_LOGO), true);
  add('marca', 'slogan', 'Slogan', choice('Qual slogan combina com esse negócio?', B.SLOGANS), true);

  // ---- carrosséis (3 papéis diferentes, 6 lâminas cada) + o estilo visual da série
  add('posts', 'car_estilo', 'Estilo dos carrosséis', choice('Qual estilo visual a série de carrosséis de Instagram desse negócio deve ter, combinando com a marca e com o que a pessoa pediu?', B.ESTILOS_CAR), true);
  for (const P of B.PAPEIS_POST) {
    const n = P.n, pre = `Carrossel ${n} de 3 no Instagram desse negócio (${P.jev}), com 6 lâminas.`;
    const fmts = P.fmts.map((f) => B.FORMATOS[f]);
    const ganchos = B.GANCHOS.filter((g) => g.papel === n);
    add('posts', `p${n}_fmt`, `Carrossel ${n} · formato`, choice(`${pre} Qual formato de carrossel funciona melhor?`, fmts), true);
    add('posts', `p${n}_hook`, `Carrossel ${n} · capa`, choice(`${pre} Qual título de capa (gancho) faz o público desse negócio parar e arrastar?`, ganchos.map((g) => ({ ...g, jev: `“${g.texto}” — ${g.jev}` }))), true);
    add('posts', `p${n}_ang`, `Carrossel ${n} · diferencial`, choice(`${pre} Qual diferencial esse carrossel deve destacar?`, B.ANGULOS), true);
    add('posts', `p${n}_bg`, `Carrossel ${n} · cores`, choice(`${pre} Qual esquema de cores de fundo combina com a marca?`, B.FUNDOS), true);
    add('posts', `p${n}_item`, `Carrossel ${n} · item em destaque`, choice(`${pre} Qual produto ou serviço destacar?`, B.PAPEIS_ITEM), true);
    add('posts', `p${n}_leg`, `Carrossel ${n} · legenda`, choice(`${pre} Qual estilo de legenda combina?`, B.LEGENDAS), true);
    add('posts', `p${n}_cta`, `Carrossel ${n} · chamada`, choice(`${pre} Qual chamada usar na última lâmina e no fim da legenda?`, B.CTAS_POST), true);
  }

  // ---- e-mail marketing: template master + assinatura de e-mail pessoal
  add('email', 'em_tipo', 'E-mail · tipo', choice('Qual e-mail marketing esse negócio deve mandar primeiro para a lista de clientes?', B.TIPOS_EMAIL), true);
  add('email', 'em_assunto', 'E-mail · assunto', choice('Qual linha de assunto faz o cliente desse negócio abrir o e-mail? Combine com o tipo de e-mail mais adequado.', B.ASSUNTOS), true);
  add('email', 'em_cabecalho', 'E-mail · cabeçalho', choice('Qual cabeçalho de e-mail combina com a marca desse negócio?', B.CABECALHOS_EMAIL), true);
  add('email', 'em_hero', 'E-mail · destaque', choice('Qual bloco de destaque (topo) o e-mail desse negócio deve ter?', B.HEROS_EMAIL), true);
  add('email', 'em_cta', 'E-mail · botão', choice('Qual botão principal o e-mail desse negócio deve ter?', B.CTAS_EMAIL), true);
  for (const b of B.BLOCOS_EMAIL) add('email', `em_b_${b.id}`, `E-mail · bloco: ${b.rotulo}`, noul(`O e-mail desse negócio deve ter ${b.jev}?`));
  add('email', 'ass_layout', 'Assinatura · layout', choice('Qual layout de assinatura de e-mail (para os e-mails pessoais do dono e da equipe) combina com a marca desse negócio?', B.ASSINATURAS), true);
  add('email', 'ass_banner', 'Assinatura · banner', choice('O que o pequeno banner da assinatura de e-mail desse negócio deve mostrar?', B.BANNERS_ASS), true);
  add('email', 'ass_pessoa', 'Assinatura · quem assina', choice('Quem assina os e-mails pessoais desse negócio?', [
    { id: 'lider', rotulo: 'Quem lidera', jev: 'Quem lidera o negócio: dono, fundador, responsável técnico ou chef' },
    { id: 'atendimento', rotulo: 'Atendimento', jev: 'A pessoa do atendimento ou do comercial, que fala com os clientes' },
    { id: 'equipe', rotulo: 'A equipe', jev: 'A equipe como um todo, sem o nome de uma pessoa' },
  ]), true);

  // ---- anúncios de display (kit de banners nos tamanhos padrão)
  add('anuncios', 'ad_conceito', 'Anúncio · conceito', choice('Qual conceito de anúncio de display (banner em sites) funciona melhor para esse negócio agora?', B.CONCEITOS_AD), true);
  add('anuncios', 'ad_titulo', 'Anúncio · título', choice('Qual título de anúncio chama mais a atenção do público desse negócio? Combine com o conceito mais adequado.', B.TITULOS_AD), true);
  add('anuncios', 'ad_estilo', 'Anúncio · estilo', choice('Qual estilo visual os banners desse negócio devem ter?', B.ESTILOS_AD), true);
  add('anuncios', 'ad_cta', 'Anúncio · botão', choice('Qual botão (chamada para ação) os banners desse negócio devem ter?', B.CTAS_AD), true);
  add('anuncios', 'ad_selo', 'Anúncio · selo', choice('Qual selo de destaque os banners desse negócio devem ter?', B.SELOS_AD), true);
  add('anuncios', 'ad_fundo', 'Anúncio · cores', choice('Qual esquema de cores de fundo os banners desse negócio devem ter?', B.FUNDOS), true);
  add('anuncios', 'ad_anim', 'Anúncio · animação', choice('Qual animação os banners desse negócio devem ter?', B.ANIMACOES_AD), true);

  return { G, meta };
}

const { G, meta } = montar();
export const PERGUNTAS = G;
export const META = meta;
export const TOTAL = Object.keys(meta).length;
export const POR_GRUPO = Object.fromEntries(Object.entries(G).map(([g, q]) => [g, Object.keys(q).length]));

// ---- comandos por voz ----------------------------------------------------------------------------------------------
// 1) ROTA: a cada fala nova (com algo já criado), o Jev diz se ela DESCREVE o negócio ou MANDA mudar uma peça.
// 2) Se for comando, o Jev escolhe de novo SÓ as decisões daquela peça, com a opção "manter" em cada uma.
// O que o comando decidiu fica TRAVADO (a descrição que vier depois não desfaz o pedido).
export const CONTEXTO_ROTA = 'Estúdio por voz: a pessoa fala e o app cria site, logo, carrosséis de Instagram, e-mail marketing (template e assinatura) e anúncios de display. '
  + 'Já existe uma versão criada. A pessoa pode continuar descrevendo o negócio ou mandar mudar uma peça.';
export const ROTA = {
  tipo: { type: 'choice', instructions: 'O que a ÚLTIMA fala da pessoa é, em relação ao que já foi criado?', criteria: {
    descrever_negocio: 'Descreve o negócio, o público, o clima, os produtos ou o que quer vender (informação nova para criar tudo)',
    comando_de_edicao: 'Manda mudar algo específico no que já foi criado: logo, cores, fontes, slogan, site, carrosséis, e-mail, assinatura ou anúncios. Vale também um ajuste visual pontual: cor ou degradê do fundo (background), cor dos botões, caixa alta ou minúsculas, tamanho, negrito, itálico ou cor das letras',
    desfazer: 'Pede para voltar a uma versão anterior ou desfazer a última mudança',
    fixar: 'Diz que gostou de algo e quer manter como está',
    outra: 'Conversa sem relação com a criação, ruído ou pedaço de frase sem sentido',
  } },
  alvo: { type: 'choice', instructions: 'Qual peça a última fala quer mudar, desfazer ou manter? Se não é sobre uma peça, escolha nenhum.', criteria: {
    logo: 'O logo: símbolo, ícone, moldura, montagem, estilo ou o nome escrito no logo',
    cores: 'A paleta de cores da marca: trocar as cores da marca por outra paleta ("troca as cores", "cores mais escuras"). Pedir uma cor só para o fundo ou para as letras não é trocar a paleta',
    fontes: 'As fontes, a tipografia, as letras de tudo: trocar a fonte, caixa alta ou minúsculas, tamanho, negrito, itálico, espaço entre as letras ou a cor das letras',
    slogan: 'O slogan ou a frase da marca',
    site: 'O site: topo, título, botões, seções, fundo (background) da página, inclusive fundo de uma cor com letras de outra, ou o estilo visual do site',
    posts: 'Os carrosséis (posts) do Instagram',
    email: 'O e-mail marketing: o template, o assunto ou a assinatura de e-mail',
    anuncios: 'Os anúncios de display, os banners',
    tudo: 'Tudo ao mesmo tempo: refazer o estilo geral da marca inteira (ex.: "deixa tudo mais moderno"); ajuste de letras é fontes, de fundo é site',
    nenhum: 'Não é sobre uma peça específica',
  } },
};
export const TIPOS_COMANDO = ['comando_de_edicao', 'desfazer', 'fixar'];
export const ALVOS = {
  logo: ['estilo', 'icone', 'forma', 'disp', 'caixa'],
  cores: ['paleta'],
  fontes: ['fonte'],
  slogan: ['slogan'],
  site: ['hero', 'titulo', 'cta', 'img', 'btn', 'cantos', 'textura'],
  posts: ['car_estilo', 'p1_fmt', 'p1_hook', 'p1_bg', 'p2_fmt', 'p2_hook', 'p2_bg', 'p3_fmt', 'p3_hook', 'p3_bg'],
  email: ['em_tipo', 'em_assunto', 'em_cabecalho', 'em_hero', 'em_cta', 'ass_layout', 'ass_banner'],
  anuncios: ['ad_conceito', 'ad_titulo', 'ad_estilo', 'ad_cta', 'ad_selo', 'ad_fundo', 'ad_anim'],
};
export const ROT_ALVO = { logo: 'logo', cores: 'cores', fontes: 'fontes', slogan: 'slogan', site: 'site', posts: 'carrosséis', email: 'e-mail', anuncios: 'anúncios', tudo: 'tudo', nenhum: '—' };
export const PAINEL_ALVO = { logo: 'marca', cores: 'marca', fontes: 'marca', slogan: 'marca', site: 'site', posts: 'posts', email: 'email', anuncios: 'ads' };

// perguntas do comando: as mesmas da peça, com "manter" (e a escolha de hoje) como primeira opção
export function perguntasComando(alvo, atuais = {}) {
  const out = {};
  for (const q of ALVOS[alvo] || []) {
    const m = meta[q], orig = m && G[m.grupo][q];
    if (!orig || orig.type !== 'choice') continue;
    out[q] = {
      type: 'choice',
      instructions: `${orig.instructions} Atenda ao COMANDO da pessoa. Se o comando não pede mudança nesta decisão, escolha manter.`,
      criteria: { manter: `Manter como está (hoje: ${String(atuais[q] || '?').slice(0, 80)}): o comando não pede mudança nisto`, ...orig.criteria },
    };
  }
  return out;
}
export function estadoComando(descricao, comando, atuais = {}) {
  const rot = {};
  for (const [q, v] of Object.entries(atuais)) if (meta[q]) rot[meta[q].rotulo] = String(v).slice(0, 80);
  return {
    descricao_do_negocio: descricao || '(ainda sem descrição)',
    comando_da_pessoa: comando,
    escolhas_de_hoje: rot,
    contexto: 'A pessoa já tem uma versão de site, logo, carrosséis, e-mail marketing e anúncios e agora pediu uma mudança por voz. Mude só o que o comando pede.',
  };
}

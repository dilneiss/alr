// Navegador Híbrido — o LLM planeja cada passo; o Jev acha o elemento da página em ~0,4 s e, na dúvida, devolve o passo ao LLM.
// Para adaptar: troque ELEMENTOS pelos elementos da sua página (id + texto na tela + descrição) e os roteiros pelos seus fluxos.
const LIMIAR = 0.6; // abaixo disto o passo volta para o LLM ("LLM assume")

const ELEMENTOS = [
  { id: 'banner_promocao', tela: '🔥 Promoção relâmpago: Rio por R$ 199   ✕', nome: 'Banner de promoção', icone: '🔥', desc: 'faixa de propaganda no topo da página, com um ✕ para fechar: anúncio, oferta, pop-up de marketing' },
  { id: 'origem', tela: '🛫 De onde?', nome: 'Campo de origem', icone: '🛫', desc: 'campo de texto "De onde?": cidade ou aeroporto de PARTIDA da viagem (origem, saída, embarque)' },
  { id: 'destino', tela: '🛬 Para onde?', nome: 'Campo de destino', icone: '🛬', desc: 'campo de texto "Para onde?": cidade ou aeroporto de CHEGADA da viagem (destino)' },
  { id: 'ida', tela: '📅 Ida', nome: 'Data de ida', icone: '📅', desc: 'calendário "Ida": o dia em que a viagem começa' },
  { id: 'volta', tela: '📅 Volta', nome: 'Data de volta', icone: '🔙', desc: 'calendário "Volta": o dia do retorno para casa' },
  { id: 'passageiros', tela: '👤 1 adulto ▾', nome: 'Passageiros', icone: '👤', desc: 'seletor de quantas pessoas viajam: adultos, crianças e bebês' },
  { id: 'buscar', tela: '🔎 Buscar voos', nome: 'Botão Buscar voos', icone: '🔎', desc: 'botão "Buscar voos": roda a pesquisa com o que foi preenchido' },
  { id: 'resultado_1', tela: '✈️ 07:40 GRU → REC · direto · R$ 489', nome: '1º voo da lista', icone: '1️⃣', desc: 'primeiro voo da lista de resultados: sai 07:40, voo direto (sem parada), R$ 489' },
  { id: 'resultado_2', tela: '✈️ 13:15 GRU → REC · 1 parada · R$ 532', nome: '2º voo da lista', icone: '2️⃣', desc: 'segundo voo da lista de resultados: sai 13:15, com 1 parada no caminho, R$ 532' },
  { id: 'selecionar', tela: 'Selecionar este voo →', nome: 'Botão Selecionar', icone: '☑️', desc: 'botão "Selecionar este voo": confirma o voo que está aberto e segue para a próxima tela' },
  { id: 'aceitar_cookies', tela: '🍪 Usamos cookies para melhorar sua experiência · Aceitar', nome: 'Aceitar cookies', icone: '🍪', desc: 'botão "Aceitar" do aviso de cookies no rodapé (fecha o aviso de cookies)' },
];

const ROTEIROS = [
  {
    titulo: 'Passagem para Recife',
    pedido: 'Quero o voo mais barato de São Paulo para Recife, ida 12/12 e volta 19/12, para 2 adultos.',
    passos: [
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'tirar o aviso de cookies que cobre o rodapé', esperado: { elemento: 'aceitar_cookies', sem_volta: false } },
      { ferramenta: 'digitar', args: { alvo: '?', texto: 'São Paulo' }, descricao: 'preencher a cidade de partida', esperado: { elemento: 'origem', sem_volta: false } },
      { ferramenta: 'digitar', args: { alvo: '?', texto: 'Recife' }, descricao: 'preencher a cidade de chegada', esperado: { elemento: 'destino' } },
      { ferramenta: 'escolher_data', args: { alvo: '?', dia: '12/12' }, descricao: 'marcar o dia em que a viagem começa', esperado: { elemento: 'ida' } },
      { ferramenta: 'escolher_data', args: { alvo: '?', dia: '19/12' }, descricao: 'marcar o dia do retorno', esperado: { elemento: 'volta' } },
      { ferramenta: 'ajustar', args: { alvo: '?', adultos: 2 }, descricao: 'colocar 2 adultos na viagem', esperado: { elemento: 'passageiros' } },
      // ambíguo de propósito: o Jev não vê cores, então a confiança cai e o LLM (com visão) assume este passo
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'clicar no botão amarelo do canto', esperado: { sem_volta: false } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'abrir o voo mais barato', fatos: { 'voo mais barato': '1º da lista · R$ 489' }, esperado: { elemento: 'resultado_1' } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'confirmar o voo escolhido e seguir', esperado: { elemento: 'selecionar' } },
    ],
  },
  {
    titulo: 'Pedidos fora da página',
    pedido: 'Compra o voo direto para Recife e já paga com o meu cartão salvo.',
    passos: [
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'entrar com a minha conta do Google', esperado: { elemento: 'nenhum', sem_volta: false } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'fechar o anúncio do topo', esperado: { elemento: 'banner_promocao', sem_volta: false } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'aceitar os termos de uso da compra', esperado: { elemento: 'nenhum' } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'abrir o voo sem paradas', esperado: { elemento: 'resultado_1' } },
      { ferramenta: 'pagar', args: { alvo: '?', forma: 'cartão salvo' }, descricao: 'pagar a passagem com o cartão salvo', esperado: { elemento: 'nenhum', sem_volta: true } },
    ],
  },
  {
    titulo: 'Planejador com outras palavras',
    pedido: 'Refaz a busca de São Paulo para Recife com a volta em 20/12 e me mostra a opção com escala.',
    passos: [
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'fechar o aviso', esperado: { elemento: ['aceitar_cookies', 'banner_promocao'] } },
      { ferramenta: 'digitar', args: { alvo: '?', texto: 'São Paulo' }, descricao: 'type the departure city', esperado: { elemento: 'origem' } },
      { ferramenta: 'escolher_data', args: { alvo: '?', dia: '20/12' }, descricao: 'trocar a data de retorno', esperado: { elemento: 'volta' } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'hit search', esperado: { elemento: 'buscar' } },
      { ferramenta: 'clicar', args: { alvo: '?' }, descricao: 'abrir o voo com escala', esperado: { elemento: 'resultado_2' } },
    ],
  },
];

// placar do painel lateral: zera no 1º passo de cada cenário
const PLACAR = { jev: 0, llm: 0, fora: 0 };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nomeDe = (id) => (ELEMENTOS.find((e) => e.id === id) || { nome: 'Nenhum elemento' }).nome;

export default {
  id: 'navegador-hibrido',
  titulo: 'Navegador Híbrido',
  emoji: '🌐',
  categoria: 'construtores',
  ordem: 54,
  resumo: 'O LLM planeja cada passo; o Jev acha o elemento certo da página em menos de meio segundo e, na dúvida, devolve o passo ao LLM.',
  descricao: 'Cada objetivo do agente ("preencher a cidade de partida", "tirar o aviso de cookies") vira uma escolha entre os elementos da página. Com confiança alta o Jev resolve sozinho, rápido e barato; abaixo de 60% o carimbo vira "LLM assume" e o passo volta para o modelo grande.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'agente',
  tema: { acento: '#e3b505', acento2: '#38bdf8' },
  origem: 'comunidade: browser-use/jev-ultrafast; no teste da Builder.io, só o Jev passou 35% e o híbrido (Jev primeiro, LLM na dúvida) passou 55/57',

  contexto: {
    site: 'Asa Leve, site fictício de passagens aéreas',
    tela: 'busca de voos de São Paulo (GRU) para Recife (REC), já com 2 voos na lista de resultados; aviso de cookies aberto no rodapé e banner de promoção no topo',
    como_funciona: 'um LLM planeja a tarefa e escreve o objetivo de cada passo (acao_proposta.descricao); o Jev escolhe o elemento desta página que cumpre esse objetivo',
  },

  decisoes: [
    {
      id: 'elemento', tipo: 'choice', titulo: 'Elemento',
      pergunta: 'Qual elemento desta página o agente deve usar para cumprir o objetivo do passo (acao_proposta.descricao)? Escolha pelo sentido, não pela palavra igual. Se o objetivo pede algo que esta página não tem, escolha "nenhum".',
      opcoes: [
        ...ELEMENTOS.map((e) => ({ id: e.id, rotulo: e.nome, icone: e.icone, carimbo: e.nome, tom: 'bom', desc: e.desc })),
        { id: 'nenhum', rotulo: 'Nenhum elemento', icone: '↩️', carimbo: 'Fora da página', tom: 'info', desc: 'nenhum elemento desta página cumpre o objetivo: ele pede algo que esta tela não tem (entrar na conta, pagar, escolher assento, mudar o idioma…)' },
      ],
    },
    {
      id: 'sem_volta', tipo: 'noul', titulo: 'Sem volta', rotulo: 'gasta dinheiro: pedir OK', icone: '💳', tom: 'ruim', limiar: 0.6,
      pergunta: 'Este passo gasta dinheiro ou faz algo que não dá para desfazer (pagar, finalizar a compra, apagar, enviar)? Preencher campos, fechar avisos, pesquisar, abrir ou selecionar um voo NÃO contam.',
    },
  ],

  agente: {
    skin: 'navegador',
    veredito: 'elemento',
    alvoPagina: 'elemento',
    limiarHumano: LIMIAR,
    rotuloIncerto: 'LLM assume',
    avatar: '🌐',
    titulo: 'Agente de navegador · Asa Leve',
    subtitulo: 'o LLM planeja; o Jev acha o elemento de cada passo',
    rotuloPedido: 'Tarefa do usuário',
    tituloContadores: 'Elementos usados pelo agente',
    placeholder: 'Escreva o objetivo de um passo, ex.: "trocar a data da volta"…',
    passoLivre: (t) => ({ ferramenta: 'achar_elemento', args: { alvo: '?' }, descricao: t }),
    ritmo: 2900,
    pagina: { titulo: '🔒 asaleve.exemplo/voos · Busca de passagens', elementos: ELEMENTOS.map((e) => ({ id: e.id, rotulo: e.tela })) },
  },

  aoDecidir(resp, entrada) {
    const a = resp && resp.elemento;
    if (!a) return '';
    if (ROTEIROS.some((r) => r.passos[0] === entrada.passo)) Object.assign(PLACAR, { jev: 0, llm: 0, fora: 0 });
    const conf = (a.probabilities || {})[a.choice] || 0;
    const tipo = conf < LIMIAR ? 'llm' : a.choice === 'nenhum' ? 'fora' : 'jev';
    PLACAR[tipo]++;
    const top = Object.entries(a.probabilities || {}).sort((x, y) => y[1] - x[1]).slice(0, 3);
    const barras = top.map(([id, p]) => `<div class="mj-barra${id === a.choice ? ' top' : ''}"><span class="lbl">${esc(nomeDe(id))}</span><span class="trk"><span class="fil" style="width:${Math.round(p * 100)}%"></span></span><span class="pct">${Math.round(p * 100)}%</span></div>`).join('');
    const msg = tipo === 'jev' ? `⚡ O Jev resolve sozinho: <b>${esc(nomeDe(a.choice))}</b>` : tipo === 'fora' ? '↩️ Não existe nesta página: o passo volta para o planejador (LLM)' : `🧠 Confiança de ${Math.round(conf * 100)}%, abaixo de ${Math.round(LIMIAR * 100)}%: o LLM assume este passo`;
    const objetivo = (entrada.passo && entrada.passo.descricao) || entrada.pedido || '';
    return `<div class="mj-widget mj-painel-box"><h4>Quem resolveu cada passo</h4><div class="mj-contadores">`
      + `<div class="mj-contador"><b style="color:var(--mj-bom)">${PLACAR.jev}</b><span>⚡ Jev sozinho</span></div>`
      + `<div class="mj-contador"><b style="color:var(--mj-medio)">${PLACAR.llm}</b><span>🧠 LLM assume</span></div>`
      + `<div class="mj-contador"><b style="color:var(--mj-info)">${PLACAR.fora}</b><span>↩️ fora da página</span></div></div></div>`
      + `<div class="mj-widget mj-painel-box"><h4>Candidatos do último passo</h4><p class="dim" style="margin:0 0 8px;font-size:12.5px">«${esc(objetivo)}»</p><div class="mj-barras">${barras}</div><p style="margin:10px 0 0;font-size:13px">${msg}</p></div>`;
  },

  roteiros: ROTEIROS,
};

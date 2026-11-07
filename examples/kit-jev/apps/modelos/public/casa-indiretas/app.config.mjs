// Casa que Entende Indiretas — “tá um forno aqui” vira “ligar o ar da sala”; “amor, viu meu celular?” não vira nada.
// Para adaptar: troque os aparelhos e o estado deles em APARELHOS, o que cada ação faz em NOVO e as rotinas do contexto.

// estado da casa agora (vai para o Jev no contexto e desenha a planta)
const APARELHOS = {
  ar_sala: { comodo: 'sala', nome: 'Ar-condicionado', artigo: 'o ar-condicionado', icone: '❄️', ligado: false, estado: 'desligado · 29 °C na sala' },
  luz_sala: { comodo: 'sala', nome: 'Luz da sala', artigo: 'a luz da sala', icone: '💡', ligado: false, estado: 'apagada (só o abajur)' },
  tv: { comodo: 'sala', nome: 'TV', artigo: 'a TV', icone: '📺', ligado: true, estado: 'ligada · filme pausado' },
  cortina: { comodo: 'sala', nome: 'Cortina', artigo: 'a cortina', icone: '🪟', ligado: true, estado: 'aberta' },
  som: { comodo: 'sala', nome: 'Som', artigo: 'o som', icone: '🎵', ligado: false, estado: 'desligado' },
  luz_quarto: { comodo: 'quarto', nome: 'Luz do quarto', artigo: 'a luz do quarto', icone: '🛏️', ligado: false, estado: 'apagada' },
  cafeteira: { comodo: 'cozinha', nome: 'Cafeteira', artigo: 'a cafeteira', icone: '☕', ligado: false, estado: 'desligada · pronta para amanhã' },
  portao: { comodo: 'entrada', nome: 'Portão', artigo: 'o portão', icone: '🚪', ligado: false, estado: 'fechado' },
};
// o que cada ação faz em cada aparelho (combinação que não existe = a casa pergunta antes)
const NOVO = {
  ar_sala: { ligar: 'ligado · 23 °C', desligar: 'desligado', aumentar: 'mais quente · 25 °C', diminuir: 'mais frio · 21 °C' },
  luz_sala: { ligar: 'acesa · 100%', desligar: 'apagada', aumentar: 'mais forte', diminuir: 'mais fraca · 40%' },
  tv: { ligar: 'ligada', desligar: 'desligada', aumentar: 'volume +5', diminuir: 'volume −5' },
  cortina: { abrir: 'abrindo…', fechar: 'fechando…' },
  som: { ligar: 'tocando a playlist da casa', desligar: 'desligado', aumentar: 'volume +5', diminuir: 'volume −5' },
  luz_quarto: { ligar: 'acesa', desligar: 'apagada', aumentar: 'mais forte', diminuir: 'mais fraca' },
  cafeteira: { ligar: 'passando café', desligar: 'desligada' },
  portao: { abrir: 'abrindo…', fechar: 'fechando…' },
};
const COMODOS = [
  { id: 'sala', nome: 'Sala', gente: '👩 Marina' },
  { id: 'quarto', nome: 'Quarto', gente: '' },
  { id: 'cozinha', nome: 'Cozinha', gente: '👨 Paulo' },
  { id: 'entrada', nome: 'Entrada', gente: '' },
];
const PEDIDO = { ligar: 'ligue', desligar: 'desligue', aumentar: 'aumente', diminuir: 'diminua', abrir: 'abra', fechar: 'feche' };   // "quer que eu ligue…?"

// a casa na tela começa em APARELHOS e ACUMULA o que cada frase muda: o ar que ligou continua ligado na frase seguinte.
// O que a frase atual mudou fica "pendente" e vira estado da casa quando outra frase começa (ou a caixa é limpa).
const casa = Object.fromEntries(Object.entries(APARELHOS).map(([id, a]) => [id, { ligado: a.ligado, estado: a.estado }]));
let pendente = null;   // { texto, id, ligado, estado }
const FIM = { portao: { abrir: 'aberto', fechar: 'fechado' }, cortina: { abrir: 'aberta', fechar: 'fechada' } };   // "abrindo…" termina aberto
const mesmaFrase = (a, b) => a.startsWith(b) || b.startsWith(a);   // digitando a mesma frase: um texto é começo do outro
function firmar(texto) {
  if (pendente && (texto == null || !mesmaFrase(texto, pendente.texto))) { casa[pendente.id] = { ligado: pendente.ligado, estado: pendente.estado }; pendente = null; }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'casa-indiretas',
  titulo: 'Casa que Entende Indiretas',
  emoji: '🏠',
  categoria: 'casa-jogos',
  ordem: 82,
  resumo: '“Tá um forno aqui” liga o ar da sala; “amor, viu meu celular?” não liga nada. A casa entende a indireta e sabe quando não é com ela.',
  descricao: 'A cada frase o Jev responde três perguntas numa chamada só: qual aparelho, qual ação e se a frase era mesmo para a casa, olhando a hora, quem está em casa e o estado de cada aparelho. Quando a confiança é baixa, ou a combinação não existe, a casa pergunta em vez de agir.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  // o estado atual da casa (com o que as frases anteriores mudaram) substitui contexto.aparelhos a cada chamada
  editavel: { campo: 'aparelhos' },
  estadoAtual(texto) { firmar(texto); return Object.entries(casa).map(([id, a]) => `${id}: ${a.estado}`).join('; '); },
  aoLimpar() { firmar(null); },
  tema: { acento: '#fdba74', acento2: '#fde68a' },
  origem: 'oficial: demo de casa inteligente da TypeSafe (perguntas especulativas numa chamada só)',

  contexto: {
    casa: 'apartamento da família Rocha: sala, quarto, cozinha e entrada com portão da garagem',
    hora: 'terça-feira, 21h40',
    quem_esta_em_casa: 'Marina, no sofá da sala, lendo um livro; Paulo, na cozinha lavando a louça. O microfone da sala ouve a Marina.',
    aparelhos: Object.fromEntries(Object.entries(APARELHOS).map(([id, a]) => [id, a.estado])),
    rotinas: 'Quando alguém diz que vai dormir: desligar a TV. Visita no portão: abrir o portão.',
  },

  aovivo: {
    skin: 'casa',
    janela: '🎙️ Microfone da sala',
    rotulo: 'O que a casa ouviu',
    placeholder: 'Fale com a casa do seu jeito: “tá um forno aqui”, “tá escuro pra ler”…',
    dica: 'Indireta também vale. Conversa com outra pessoa não.',
    tituloChecklist: 'Era com a casa?',
    velocidade: 0.85,
    pausa: 4200,
    comecarVazio: true,   // abre com a casa em repouso e a caixa vazia: a primeira frase é sua
  },

  decisoes: [
    {
      id: 'dispositivo', tipo: 'choice', papel: 'destaque', titulo: 'Aparelho',
      pergunta: 'A frase que a casa ouviu pede, direta ou indiretamente, para mexer em qual aparelho? Pense no que a pessoa quer resolver, onde ela está, no estado atual dos aparelhos e nas rotinas da casa. Se a frase é conversa com outra pessoa ou não pede nada à casa, escolha nenhum.',
      opcoes: [
        { id: 'ar_sala', rotulo: 'Ar da sala', icone: '❄️', desc: 'ar-condicionado da sala: calor, frio, abafado' },
        { id: 'luz_sala', rotulo: 'Luz da sala', icone: '💡', desc: 'luz principal da sala: claridade para ler, escuro, luz forte' },
        { id: 'luz_quarto', rotulo: 'Luz do quarto', icone: '🛏️', desc: 'luz do quarto' },
        { id: 'cortina', rotulo: 'Cortina', icone: '🪟', desc: 'cortina da sala: sol, privacidade, vizinho olhando' },
        { id: 'tv', rotulo: 'TV', icone: '📺', desc: 'televisão da sala: filme, novela, volume da TV' },
        { id: 'cafeteira', rotulo: 'Cafeteira', icone: '☕', desc: 'cafeteira da cozinha: café, sono' },
        { id: 'portao', rotulo: 'Portão', icone: '🚪', desc: 'portão da garagem: visita, entrega, carro chegando' },
        { id: 'som', rotulo: 'Som', icone: '🎵', desc: 'caixa de som: música' },
        { id: 'nenhum', rotulo: 'Nenhum', icone: '🙊', desc: 'conversa com outra pessoa ou frase que não pede nada à casa' },
      ],
    },
    {
      id: 'acao', tipo: 'choice', papel: 'barras', limite: 3, titulo: 'Ação',
      pergunta: 'Que ação no aparelho resolve o que a pessoa quer, considerando o estado atual dele? Se a frase não pede nada à casa, escolha nenhuma.',
      opcoes: [
        { id: 'ligar', rotulo: 'Ligar', icone: '🔌', desc: 'ligar ou acender algo que está desligado ou apagado' },
        { id: 'desligar', rotulo: 'Desligar', icone: '⏻', desc: 'desligar ou apagar algo que está ligado' },
        { id: 'aumentar', rotulo: 'Aumentar', icone: '🔼', desc: 'aumentar volume, brilho ou temperatura de algo que já está ligado' },
        { id: 'diminuir', rotulo: 'Diminuir', icone: '🔽', desc: 'diminuir volume, brilho ou temperatura de algo que já está ligado' },
        { id: 'abrir', rotulo: 'Abrir', icone: '↔️', desc: 'abrir o portão ou a cortina' },
        { id: 'fechar', rotulo: 'Fechar', icone: '⏹️', desc: 'fechar o portão ou a cortina' },
        { id: 'nenhuma', rotulo: 'Nenhuma', icone: '✋', desc: 'não fazer nada' },
      ],
    },
    {
      id: 'falando_com_a_casa', tipo: 'noul', papel: 'checklist', tom: 'bom', titulo: 'Falando com a casa', rotulo: 'A frase era para a casa',
      pergunta: 'A frase é para a casa? Comentário solto sobre o ambiente ou a rotina ("tá um forno aqui", "tá escuro", "vou dormir", "chegou visita") conta como pedido indireto para a casa. Só não é para a casa quando a frase fala com outra pessoa: chama alguém pelo nome ou apelido ("amor", "Paulo") ou pergunta algo que só uma pessoa responde.',
    },
  ],

  render(r, texto) {
    const R = r.respostas || {};
    const d = R.dispositivo, ac = R.acao, fala = R.falando_com_a_casa;
    const ouviu = Boolean(d && ac && fala);   // sem resposta ainda: a casa em repouso, esperando a primeira frase
    if (texto) firmar(texto);
    const confD = ouviu ? (d.probabilities || {})[d.choice] ?? 0 : 0;
    const comigo = ouviu && fala.noul >= 0.5 && d.choice !== 'nenhum' && ac.choice !== 'nenhuma';
    const novo = comigo ? (NOVO[d.choice] || {})[ac.choice] : null;
    const perguntar = comigo && (confD < 0.6 || !novo);   // limiar: na dúvida, a casa pergunta em vez de agir
    const alvo = ouviu ? APARELHOS[d.choice] : null;
    // a decisão mais nova desta frase é a que vale (digitando, a frase é reavaliada a cada pausa)
    if (ouviu) pendente = comigo && !perguntar ? { texto, id: d.choice, ligado: !['desligar', 'fechar'].includes(ac.choice), estado: (FIM[d.choice] || {})[ac.choice] || novo } : null;
    let faixa;
    if (!ouviu) faixa = `<span style="font-size:22px">🎙️</span><div><b>A casa está ouvindo.</b><div style="font-size:12.5px;color:var(--mj-mudo)">Fale do seu jeito: “tá um forno aqui”, “tá escuro pra ler”. Ordem direta também vale.</div></div>`;
    else if (!comigo) faixa = `<span style="font-size:22px">🙊</span><div><b>Não era comigo.</b><div style="font-size:12.5px;color:var(--mj-mudo)">Parece conversa com outra pessoa: a casa não mexe em nada (${Math.round((1 - fala.noul) * 100)}% de certeza).</div></div>`;
    else if (perguntar && !novo) faixa = `<span style="font-size:22px">🤔</span><div><b>Não sei ${esc(ac.choice)} ${alvo ? alvo.artigo : 'isso'}.</b><div style="font-size:12.5px;color:var(--mj-mudo)">Essa combinação não existe nesta casa: melhor perguntar do que inventar.</div></div>`;
    else if (perguntar) faixa = `<span style="font-size:22px">🤔</span><div><b>Quer que eu ${PEDIDO[ac.choice]} ${alvo.artigo}?</b><div style="font-size:12.5px;color:var(--mj-mudo)">Na dúvida (${Math.round(confD * 100)}%), a casa pergunta antes de agir.</div></div>`;
    else faixa = `<span style="font-size:22px">✅</span><div><b>${alvo.icone} ${alvo.nome}: ${esc(novo)}</b><div style="font-size:12.5px;color:var(--mj-mudo)">A casa entendeu a indireta (${Math.round(confD * 100)}% de certeza).</div></div>`;
    const corFaixa = !ouviu ? 'var(--mj-acento)' : !comigo ? 'var(--mj-dim)' : perguntar ? 'var(--mj-medio)' : 'var(--mj-bom)';
    const tile = (id) => {
      const a = { ...APARELHOS[id], ...casa[id] };   // nome e ícone fixos; ligado e estado como a casa está agora
      const eleito = comigo && id === d.choice;
      const acao = eleito && !perguntar;
      const ligado = acao ? !['desligar', 'fechar'].includes(ac.choice) : a.ligado;
      const estilo = acao
        ? 'background:color-mix(in srgb,var(--mj-acento) 24%,var(--mj-bg2));border:1px solid var(--mj-acento);box-shadow:0 0 18px color-mix(in srgb,var(--mj-acento) 45%,transparent);animation:mj-respira 1.4s infinite'
        : eleito ? 'background:var(--mj-bg2);border:1px dashed var(--mj-medio)'
          : ligado ? 'background:color-mix(in srgb,var(--mj-acento) 9%,var(--mj-bg2));border:1px solid var(--mj-borda2)' : 'background:var(--mj-bg2);border:1px solid var(--mj-borda)';
      const estado = acao ? novo : eleito ? 'confirmar?' : a.estado;
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:10px;min-width:0;flex:1 1 140px;${estilo}">
        <span style="font-size:19px;${ligado ? '' : 'filter:grayscale(.7);opacity:.75'}">${a.icone}</span>
        <span style="min-width:0;line-height:1.25"><span style="display:block;font-size:12.5px;font-weight:650">${a.nome}</span><span style="display:block;font-size:11.5px;color:${acao ? 'var(--mj-acento)' : eleito ? 'var(--mj-medio)' : 'var(--mj-dim)'};${acao ? 'font-weight:700;' : ''}white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(estado)}</span></span></div>`;
    };
    const comodo = (c) => `<div style="padding:9px;border-radius:11px;border:1px dashed var(--mj-borda2);background:var(--mj-card);min-width:0">
      <div style="display:flex;justify-content:space-between;gap:6px;font:650 10.5px/1 var(--mj-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mj-dim);margin-bottom:8px"><span>${c.nome}</span><span style="text-transform:none;letter-spacing:0;color:var(--mj-mudo)">${c.gente}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${Object.keys(APARELHOS).filter((id) => APARELHOS[id].comodo === c.id).map(tile).join('')}</div></div>`;
    return `<div class="mj-widget mj-painel-box" style="padding:14px">
      <div style="display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;margin-bottom:10px;background:color-mix(in srgb,${corFaixa} 10%,transparent);border:1px solid color-mix(in srgb,${corFaixa} 40%,transparent);animation:mj-entra .35s var(--mj-ease)">${faixa}</div>
      ${texto ? `<div style="font-size:12.5px;color:var(--mj-mudo);margin:0 2px 10px">🎙️ ouviu: <i>“${esc(texto)}”</i> · 21h40</div>` : ''}
      <div style="display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:7px;padding:7px;border-radius:15px;border:2px solid var(--mj-borda2);background:var(--mj-bg)">
        <div style="grid-row:span 2;min-width:0">${comodo(COMODOS[0])}</div>${comodo(COMODOS[1])}${comodo(COMODOS[2])}
        <div style="grid-column:1/-1;min-width:0">${comodo(COMODOS[3])}</div>
      </div></div>`;
  },

  exemplos: [
    { titulo: 'Calor', texto: 'tá um forno aqui', esperado: { dispositivo: 'ar_sala', acao: 'ligar', falando_com_a_casa: true } },
    { titulo: 'Leitura', texto: 'tá escuro pra ler', esperado: { dispositivo: 'luz_sala', acao: 'ligar', falando_com_a_casa: true } },
    { titulo: 'Sono', texto: 'vou dormir', esperado: { dispositivo: 'tv', acao: 'desligar', falando_com_a_casa: true } },
    { titulo: 'Visita', texto: 'chegou visita no portão', esperado: { dispositivo: 'portao', acao: 'abrir', falando_com_a_casa: true } },
    { titulo: 'Não era comigo', texto: 'amor, viu meu celular?', esperado: { dispositivo: 'nenhum', acao: 'nenhuma', falando_com_a_casa: false } },
  ],
};

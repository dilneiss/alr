// Assistente de Voz que Age — o microfone fica ligado; o Jev decide se a frase era PARA o computador e qual ação executar.
// Para adaptar: troque ACOES (o "desc" é o critério do Jev) e ligue cada ação a uma função de verdade no seu app.
const ACOES = [
  { id: 'abrir_app', rotulo: 'Abrir app', icone: '🗂️', desc: 'abrir um programa, site ou janela, sem outra tarefa ("abre o Figma", "abre a planilha de custos")', faz: 'abriria o programa pedido' },
  { id: 'criar_lembrete', rotulo: 'Criar lembrete', icone: '⏰', desc: 'lembrete, alarme ou compromisso na agenda ("me lembra de…", "marca reunião amanhã às 9")', faz: 'criaria o lembrete com dia e hora' },
  { id: 'tocar_musica', rotulo: 'Tocar música', icone: '🎵', desc: 'tocar, pausar ou trocar música, playlist, podcast ou rádio, mesmo que cite o app', faz: 'tocaria a música pedida' },
  { id: 'mandar_mensagem', rotulo: 'Mandar mensagem', icone: '💬', desc: 'enviar mensagem, e-mail ou recado para alguém ("manda pra Carla que…")', faz: 'mandaria o recado para o contato' },
  { id: 'buscar_arquivo', rotulo: 'Buscar arquivo', icone: '🔎', desc: 'achar um arquivo, documento, foto ou pasta no computador', faz: 'procuraria o arquivo' },
  { id: 'ditado', rotulo: 'Ditado', icone: '⌨️', desc: 'digitar o que a pessoa dita ("escreve aí:", "anota:")', faz: 'digitaria o texto ditado' },
  { id: 'nenhuma', rotulo: 'Nenhuma', icone: '🙈', desc: 'não é um pedido ao computador (conversa com alguém da casa, ligação, pensamento em voz alta) ou nenhuma ação da lista serve', faz: '' },
];
const LIMIAR = 0.6;     // a partir daqui executa; entre 0,4 e 0,6 pergunta "foi comigo?"; abaixo de 0,4 ignora
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cartao(icone, cor, titulo, sub, citacao) {
  return `<div class="mj-widget mj-painel-box" style="padding:16px;border-color:color-mix(in srgb,${cor} 45%,transparent)">
  <h4>🎙 Assistente <span class="tp">o que ele faria agora</span></h4>
  <div style="display:flex;gap:14px;align-items:center">
    <span style="flex:none;width:56px;height:56px;border-radius:16px;display:grid;place-items:center;font-size:28px;background:color-mix(in srgb,${cor} 16%,transparent);border:1px solid color-mix(in srgb,${cor} 45%,transparent)">${icone}</span>
    <div style="min-width:0"><div style="font:780 20px/1.25 var(--mj-f);color:${cor}">${titulo}</div><div style="font-size:13px;color:var(--mj-mudo);margin-top:3px">${sub}</div></div>
  </div>
  <div style="margin-top:12px;padding:9px 12px;border-radius:10px;background:var(--mj-card);font-size:13.5px;color:var(--mj-mudo)">«${esc(citacao)}»</div>
</div>`;
}

export default {
  id: 'assistente-voz-age',
  titulo: 'Assistente de Voz que Age',
  emoji: '🗣️',
  categoria: 'voz',
  ordem: 63,
  resumo: 'O microfone fica ligado: ele executa o que você pede ao computador e ignora o que você fala com a família ou no telefone.',
  descricao: 'A cada frase transcrita, o Jev decide se ela foi dita PARA o computador e qual ação de uma lista fechada ela pede. "Manda pra Carla que eu vou atrasar" vira mensagem; "pode mandar a proposta pro meu e-mail", dito numa ligação, é ignorado. Na dúvida, o assistente pergunta antes.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#e879f9', acento2: '#818cf8' },
  origem: 'Jev Voice (assistente de voz do Mac) e jev-voice-browser',

  contexto: {
    usuario: 'Rafa, designer, trabalha de casa com o microfone do notebook sempre ligado',
    contatos: 'Carla (sócia), Bia (financeiro), Marcos (contador)',
    regra: 'Só execute o que foi pedido AO computador. Conversa com gente da casa, ligação ou pensamento em voz alta: ignore.',
  },

  aovivo: {
    skin: 'voz',
    janela: '🎙 Microfone ligado · transcrição ao vivo',
    rotulo: 'Frase ouvida',
    placeholder: 'Fale (ou escreva) uma frase, como se estivesse perto do computador…',
    dica: 'O microfone ouve tudo: o Jev decide o que era para ele.',
    tituloChecklist: 'Era comigo?',
    velocidade: 1,
    pausa: 3000,
  },

  decisoes: [
    {
      id: 'acao', tipo: 'choice', papel: 'destaque', titulo: 'Ação',
      pergunta: 'Qual ação o computador deve executar? Regra: frase em forma de comando sem uma pessoa como destinatária ("me lembra de…", "toca…", "manda pra Carla que…") é pedido ao computador; escolha a ação pela tarefa principal ("abre o Spotify e toca a playlist" é tocar música). A resposta é "nenhuma" só nestes casos: (1) a frase chama alguém da casa ("amor", "Júlia"); (2) fala com alguém numa ligação, usando "você" ou "te" ("pode mandar pro meu e-mail", "te respondo hoje"); (3) é pensamento em voz alta; (4) nenhuma ação da lista serve.',
      opcoes: ACOES.map(({ id, rotulo, icone, desc }) => ({ id, rotulo, icone, desc })),
    },
    {
      id: 'falando_com_o_computador', tipo: 'noul', papel: 'checklist', rotulo: 'Falando com o computador', tom: 'bom', limiar: LIMIAR,
      pergunta: 'A frase foi dita PARA o assistente do computador, como um pedido? Regra: a resposta é SIM sempre que a frase é um comando sem uma pessoa como destinatária ("me lembra de…", "abre…", "toca…", "manda pra Carla que…", "escreve aí"). A resposta é NÃO só nestes casos: (1) chama alguém da casa ("amor", "Júlia"); (2) fala com alguém numa ligação, usando "você" ou "te" ("pode mandar pro meu e-mail", "te respondo hoje"); (3) é pensamento em voz alta ("nossa, preciso…").',
    },
  ],

  render(r, texto) {
    const a = r.respostas.acao;
    const f = r.respostas.falando_com_o_computador;
    const p = f ? f.noul : 0;
    const op = ACOES.find((x) => x.id === (a && a.choice)) || ACOES[ACOES.length - 1];
    const conf = a && a.probabilities ? Math.round(a.probabilities[a.choice] * 100) : 0;
    if (p < 0.4) return cartao('🙈', 'var(--mj-dim)', 'ignorado: não era comigo', `${Math.round(p * 100)}% de chance de ser um pedido ao computador`, texto);
    if (p < LIMIAR) return cartao('🤔', 'var(--mj-medio)', 'perguntaria: "foi comigo?"', `não tenho certeza (${Math.round(p * 100)}%): melhor confirmar do que agir sozinho`, texto);
    if (op.id === 'nenhuma') return cartao('🤷', 'var(--mj-medio)', 'ouvi, mas não sei fazer isso', 'era comigo, mas nenhuma ação da lista serve', texto);
    return cartao(op.icone, 'var(--mj-bom)', `→ executaria: ${op.rotulo.toLowerCase()}`, `${op.faz} · ${conf}% de confiança`, texto);
  },

  exemplos: [
    { titulo: 'Lembrete', texto: 'Me lembra de ligar pro Marcos amanhã às nove.', esperado: { acao: 'criar_lembrete', falando_com_o_computador: true } },
    { titulo: 'Pergunta pra família', texto: 'Amor, você viu a chave do carro? Tava aqui em cima da mesa.', esperado: { acao: 'nenhuma', falando_com_o_computador: false } },
    { titulo: 'Música', texto: 'Abre o Spotify e toca aquela playlist de foco, bem baixinho.', esperado: { acao: 'tocar_musica', falando_com_o_computador: true } },
    { titulo: 'No telefone', texto: 'Pode mandar a proposta pro meu e-mail, que eu abro aqui e te respondo ainda hoje.', esperado: { acao: 'nenhuma', falando_com_o_computador: false } },
    { titulo: 'Mensagem', texto: 'Manda pra Carla no WhatsApp que eu vou atrasar dez minutinhos.', esperado: { acao: 'mandar_mensagem', falando_com_o_computador: true } },
  ],
};

// Colar e Preencher — cole uma assinatura, um pedido do WhatsApp ou um cartão de visita: cada linha vai para o campo certo.
// Para adaptar: troque os campos (opções da decisão "campo") pelos do seu cadastro e, se quiser, a limpeza de cada campo em LIMPA.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CAMPOS = [
  { id: 'nome', rotulo: 'Nome', icone: '👤', desc: 'nome de uma pessoa ("Renata Albuquerque", "meu nome é Carlos")' },
  { id: 'cargo', rotulo: 'Cargo', icone: '💼', desc: 'cargo, função ou profissão ("Gerente de Compras", "Arquiteta")' },
  { id: 'empresa', rotulo: 'Empresa', icone: '🏢', desc: 'nome da empresa, loja ou marca ("Distribuidora Vale Verde Ltda.")' },
  { id: 'telefone', rotulo: 'Telefone', icone: '📞', desc: 'número de telefone, celular ou WhatsApp' },
  { id: 'email', rotulo: 'E-mail', icone: '✉️', desc: 'endereço de e-mail (tem @ e domínio)' },
  { id: 'site', rotulo: 'Site', icone: '🌐', desc: 'endereço de site (www, .com.br), sem @' },
  { id: 'endereco', rotulo: 'Endereço', icone: '📍', desc: 'rua, avenida, número, bairro, cidade ou CEP' },
  { id: 'cnpj', rotulo: 'CNPJ', icone: '🧾', desc: 'número de CNPJ (00.000.000/0000-00)' },
  { id: 'ignorar', rotulo: 'Ignorar', icone: '🚫', desc: 'saudação, despedida, pedido, conversa, aviso legal, horário de funcionamento, @ de rede social: tudo que não é dado de contato' },
];

// o Jev só aponta o campo; o valor sai do próprio texto da linha (aqui só tiramos rótulos como "Tel:" e "meu nome é")
const LIMPA = {
  nome: (s) => s.replace(/^(?:meu nome é|me chamo|aqui é (?:o|a)|sou (?:o|a)|contato\s*:|att\.?,?|atenciosamente,?)\s*/i, '').replace(/^(?:sr|sra|dr|dra)\.?\s+/i, '').replace(/\s*\(.*?\)\s*$/, ''),
  cargo: (s) => s.replace(/^(?:cargo|função)\s*:\s*/i, ''),
  empresa: (s) => s.replace(/^(?:fornecedor|empresa|razão social|cliente)\s*:\s*/i, ''),
  telefone: (s) => { const m = s.match(/(?:\+?55\s*)?\(?\d{2}\)?\s*9?\s?\d{4}[-\s.]?\d{4}/g); return m ? m.join(' · ') : s; },
  email: (s) => (s.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [s])[0],
  site: (s) => (s.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?/i) || [s])[0],
  endereco: (s) => s.replace(/^(?:entrega(?:r)?\s+(?:na|no|em)|endereço\s*:?|end\.\s*|moro\s+(?:na|no)|fica\s+(?:na|no))\s*/i, ''),
  cnpj: (s) => (s.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/) || [s])[0],
};

const iniciais = (n) => n.split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || '?';

export default {
  id: 'colar-preencher',
  titulo: 'Colar e Preencher',
  emoji: '📋',
  categoria: 'imediata',
  ordem: 3,
  resumo: 'Cole uma assinatura de e-mail, um pedido do WhatsApp ou um cartão de visita, e cada linha cai no campo certo do cadastro.',
  descricao: 'O texto colado vira uma pergunta por linha, todas na mesma chamada: o Jev aponta o campo de cada uma (ou "ignorar") e o valor sai do próprio texto, sem nada reescrito. Lista fechada de campos, resposta em menos de um segundo, para qualquer formato que a pessoa colar.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#a3e635', acento2: '#2dd4bf' },
  origem: 'comunidade: mapeamento de colunas de CSV (Vercel) e "formulários que somem" (a16z)',

  contexto: {
    sistema: 'cadastro de contatos do CRM de uma pequena empresa',
    regra: 'cada linha colada vai para um campo só; o valor do campo é o próprio texto da linha',
  },

  aovivo: {
    skin: 'colar',
    janela: 'Novo contato · colar e preencher',
    rotulo: 'Texto colado',
    placeholder: 'Cole aqui uma assinatura de e-mail, um pedido do WhatsApp ou um cartão de visita…',
    dica: 'Uma pergunta por linha: o Jev aponta o campo, o valor vem do texto.',
    digitar: false,
    pausa: 6500,
    tituloLinhas: 'Linha por linha',
    rotuloLinha: 'Linha',
  },

  decisoes: [
    {
      id: 'campo', tipo: 'choice', porLinha: true, titulo: 'Campo',
      pergunta: 'Esta linha do texto colado vai para qual campo do cadastro de contato? Olhe o texto inteiro para entender o papel da linha. Se a linha tiver dois dados (ex.: cargo e empresa), escolha o primeiro que aparece. Saudação, despedida, pedido, conversa, aviso legal, horário de funcionamento e @ de rede social vão para ignorar.',
      opcoes: CAMPOS,
    },
  ],

  render(r) {
    const linhas = r.linhas || [];
    if (!linhas.length) return '';
    const valores = {}, extras = {}, origem = {};
    let ignoradas = 0;
    linhas.forEach((l, i) => {
      const a = l.respostas && l.respostas.campo;
      if (!a) return;
      if (a.choice === 'ignorar') { ignoradas++; return; }
      if (valores[a.choice] == null) {
        valores[a.choice] = (LIMPA[a.choice] || ((s) => s))(l.texto).trim();
        origem[a.choice] = { linha: i + 1, conf: (a.probabilities || {})[a.choice] ?? 0 };
      } else extras[a.choice] = (extras[a.choice] || 0) + 1;   // a 1ª linha de cada campo vence
    });
    const campos = ['nome', 'cargo', 'empresa', 'telefone', 'email', 'site', 'cnpj', 'endereco'].map((id) => CAMPOS.find((c) => c.id === id));
    const preenchidos = campos.filter((c) => valores[c.id]).length;
    const titulo = valores.nome || valores.empresa || 'Novo contato';
    const sub = [valores.cargo, valores.nome ? valores.empresa : ''].filter(Boolean).join(' · ');
    const caixa = (c) => {
      const v = valores[c.id];
      const o = origem[c.id];
      const largo = ['endereco', 'email'].includes(c.id) ? 'grid-column:1/-1;' : '';
      return `<div style="${largo}min-width:0">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 6px;font:650 10.5px/1 var(--mj-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--mj-dim);margin-bottom:5px"><span>${c.icone} ${c.rotulo}</span>${o ? `<span style="text-transform:none;letter-spacing:0">linha ${o.linha} · ${Math.round(o.conf * 100)}%${extras[c.id] ? ` · +${extras[c.id]}` : ''}</span>` : ''}</div>
        <div style="padding:9px 11px;border-radius:10px;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${v ? 'background:color-mix(in srgb,var(--mj-acento) 9%,var(--mj-bg2));border:1px solid color-mix(in srgb,var(--mj-acento) 45%,transparent);color:var(--mj-texto);animation:mj-entra .35s var(--mj-ease)' : 'background:var(--mj-bg2);border:1px dashed var(--mj-borda2);color:var(--mj-dim)'}" title="${esc(v || '')}">${v ? esc(v) : '—'}</div></div>`;
    };
    return `<div class="mj-widget mj-painel-box" style="padding:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <span style="flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font:800 17px/1 var(--mj-f);color:#0b0c10;background:linear-gradient(135deg,var(--mj-acento),var(--mj-acento2))">${esc(valores.nome ? iniciais(valores.nome) : '🏢')}</span>
        <div style="min-width:0"><div style="font:750 18px/1.25 var(--mj-f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(titulo)}</div><div style="font-size:13px;color:var(--mj-mudo);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sub) || 'cadastro de contato'}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));grid-auto-flow:dense;gap:10px">${campos.map(caixa).join('')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px"><span class="mj-chip bom">✓ ${preenchidos} de ${campos.length} campos preenchidos</span>${ignoradas ? `<span class="mj-chip">🚫 ${ignoradas} ${ignoradas === 1 ? 'linha ignorada' : 'linhas ignoradas'}</span>` : ''}<span class="mj-chip">nada foi reescrito: o valor é o texto colado</span></div>
    </div>`;
  },

  exemplos: [
    {
      titulo: 'Assinatura de e-mail',
      texto: 'Abraços,\nRenata Albuquerque\nGerente de Compras\nDistribuidora Vale Verde Ltda.\n(31) 3456-7890 | (31) 99876-5432\nrenata.albuquerque@valeverde.com.br\nwww.valeverde.com.br\nRua dos Inconfidentes, 1200 — Funcionários, Belo Horizonte/MG\nCNPJ 12.345.678/0001-90\nAntes de imprimir, pense no meio ambiente.',
      esperadoLinhas: [{ campo: 'ignorar' }, { campo: 'nome' }, { campo: 'cargo' }, { campo: 'empresa' }, { campo: 'telefone' }, { campo: 'email' }, { campo: 'site' }, { campo: 'endereco' }, { campo: 'cnpj' }, { campo: 'ignorar' }],
    },
    {
      titulo: 'Pedido do WhatsApp',
      texto: 'Oi, boa noite! Quero 2 bolos de pote de ninho e 1 de maracujá 😋\nMeu nome é Carlos Eduardo Mendes\nEntrega na Av. Brasil, 455, apto 32 — Jardim América, Ribeirão Preto\nMeu zap é 16 98123-4567\nPago no Pix quando chegar, pode ser?',
      esperadoLinhas: [{ campo: 'ignorar' }, { campo: 'nome' }, { campo: 'endereco' }, { campo: 'telefone' }, { campo: 'ignorar' }],
    },
    {
      titulo: 'Cartão de visita',
      texto: 'ESTÚDIO GIRASSOL ARQUITETURA\nMariana Tavares Ribeiro\nArquiteta e Urbanista · CAU A123456-7\n+55 (41) 3022-1188\ncontato@estudiogirassol.arq.br\nestudiogirassol.arq.br\nAl. Dr. Carlos de Carvalho, 555 — sala 1203 — Curitiba/PR\n@estudiogirassol',
      esperadoLinhas: [{ campo: 'empresa' }, { campo: 'nome' }, { campo: 'cargo' }, { campo: 'telefone' }, { campo: 'email' }, { campo: 'site' }, { campo: 'endereco' }, { campo: 'ignorar' }],
    },
    {
      titulo: 'Dados do fornecedor',
      texto: 'Fornecedor: Gráfica Pontual Impressos Ltda.\nCNPJ: 98.765.432/0001-10\nContato: Osvaldo Nunes (comercial)\nFone/Fax: (11) 2233-4455\nosvaldo@graficapontual.com.br\nRua Voluntários da Pátria, 3100 — Santana, São Paulo/SP — CEP 02401-000\nHorário: seg. a sex., das 8h às 18h',
      esperadoLinhas: [{ campo: 'empresa' }, { campo: 'cnpj' }, { campo: 'nome' }, { campo: 'telefone' }, { campo: 'email' }, { campo: 'endereco' }, { campo: 'ignorar' }],
    },
  ],
};

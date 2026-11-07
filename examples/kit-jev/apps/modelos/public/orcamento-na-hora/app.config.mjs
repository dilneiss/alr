// Orçamento na Hora — o cliente descreve a mudança e a faixa de preço aparece enquanto ele escreve.
// Para adaptar: troque a TABELA (seus preços), as opções de "tipo", os adicionais (checklist) e os exemplos. O Jev só classifica; a conta é do código.
const TABELA = {
  base: { residencial_pequena: 690, residencial_grande: 1590, comercial: 1890, frete_avulso: 240 },  // saída do caminhão + equipe
  porte: [0, 380, 950, 1900],                                                                       // acréscimo por nível de volume
  adicionais: { escada_sem_elevador: 260, itens_frageis: 190, desmontagem: 320, outra_cidade: 1450, urgente: 390 },
  faixa: [0.92, 1.15],                                                                              // margem da faixa mostrada ao cliente
};
const NOMES = { residencial_pequena: 'mudança residencial pequena', residencial_grande: 'mudança residencial grande', comercial: 'mudança comercial', frete_avulso: 'frete avulso' };
const PORTES = ['poucos itens', 'pequeno', 'médio', 'grande'];
const ADICIONAIS = { escada_sem_elevador: 'Escada sem elevador', itens_frageis: 'Itens frágeis', desmontagem: 'Desmontar e montar', outra_cidade: 'Outra cidade', urgente: 'Urgente (até 3 dias)' };
const LIMIAR_TIPO = 0.6;  // abaixo disso o tipo é incerto: a faixa aparece apagada e pede confirmação
const reais = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const arred = (v) => Math.round(v / 10) * 10;
const nivelDe = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 0);

export default {
  id: 'orcamento-na-hora',
  titulo: 'Orçamento na Hora',
  emoji: '🚚',
  categoria: 'vendas',
  ordem: 26,
  resumo: 'O cliente descreve a mudança e a faixa de preço aparece enquanto ele escreve: tipo, porte e adicionais.',
  descricao: 'A cada pausa da digitação o Jev classifica o pedido (tipo, volume e 5 adicionais) e o código calcula a faixa de preço pela tabela da empresa. O Jev nunca inventa preço: ele só escolhe numa lista fechada, e pedido incerto pede confirmação antes de virar orçamento.',
  marcas: ['imediato', 'lista fechada', 'limiar'],
  motor: 'aovivo',
  tema: { acento: '#ea580c', acento2: '#facc15' },
  origem: 'comunidade: ideia do Greg Isenberg (orçamento instantâneo para serviços locais)',

  contexto: {
    empresa: 'Mudanças Leva&Traz — mudanças e fretes na Grande São Paulo e no interior, 9 caminhões',
    servicos: 'mudança residencial, mudança comercial e frete avulso de poucos itens',
    tabela: TABELA,
  },

  aovivo: {
    skin: 'formulario',
    janela: 'Pedido de orçamento · WhatsApp da Leva&Traz',
    rotulo: 'Pedido do cliente',
    cabecalho: { Canal: 'WhatsApp e formulário do site', Resposta: 'faixa de preço automática' },
    placeholder: 'Descreva a mudança como um cliente: de onde para onde, quantos quartos, andar, elevador, itens frágeis, data…',
    dica: 'O preço sai da tabela da empresa, no código. O Jev só diz o que o pedido é.',
    tituloChecklist: 'Adicionais que o Jev achou no pedido',
    velocidade: 1.5,
    pausa: 2800,
  },

  decisoes: [
    {
      id: 'tipo', tipo: 'choice', papel: 'destaque', titulo: 'Tipo de serviço',
      pergunta: 'Que serviço o cliente está pedindo? Regras: casa ou apartamento inteiro com até 2 quartos → residencial pequena; casa ou apartamento inteiro com 3 quartos ou mais → residencial grande; escritório, loja, clínica ou empresa → comercial; levar só alguns itens soltos (1 a 5 móveis ou eletrodomésticos), sem mudar a casa inteira → frete avulso; se a mensagem não pede mudança nem transporte (vaga de emprego, reclamação, dúvida sem pedido) → nenhum.',
      opcoes: [
        { id: 'frete_avulso', rotulo: 'Frete avulso', icone: '📦', cor: '#38bdf8', desc: 'transporte de 1 a 5 itens soltos (móvel ou eletrodoméstico), sem mudar a casa inteira' },
        { id: 'residencial_pequena', rotulo: 'Residencial pequena', icone: '🏠', cor: '#34d399', desc: 'mudança completa de kitnet, studio ou casa/apartamento de 1 ou 2 quartos' },
        { id: 'residencial_grande', rotulo: 'Residencial grande', icone: '🏡', cor: '#a78bfa', desc: 'mudança completa de casa ou apartamento com 3 quartos ou mais, sobrado grande ou cobertura' },
        { id: 'comercial', rotulo: 'Comercial', icone: '🏢', cor: '#fbbf24', desc: 'mudança de escritório, loja, consultório, clínica ou empresa (estações de trabalho, arquivos, equipamentos)' },
        { id: 'nenhum', rotulo: 'Não é orçamento', icone: '💬', cor: '#94a3b8', desc: 'não pede mudança nem frete: vaga de emprego, reclamação, elogio ou dúvida sem pedido' },
      ],
    },
    {
      id: 'porte', tipo: 'score', papel: 'medidor', titulo: 'Porte (volume)',
      pergunta: 'Qual é o volume de coisas a transportar, pelo que o cliente descreveu?',
      niveis: [
        { rotulo: PORTES[0], desc: '1 a 5 peças soltas: cabe num utilitário' },
        { rotulo: PORTES[1], desc: 'kitnet, studio ou apartamento de 1 quarto: um caminhão pequeno' },
        { rotulo: PORTES[2], desc: 'casa de 2 ou 3 quartos, ou escritório de até 10 pessoas: um caminhão baú' },
        { rotulo: PORTES[3], desc: 'casa de 4 quartos ou mais, ou empresa com mais de 10 pessoas: dois caminhões' },
      ],
    },
    { id: 'escada_sem_elevador', tipo: 'noul', papel: 'checklist', tom: 'medio', rotulo: `${ADICIONAIS.escada_sem_elevador} · +${reais(TABELA.adicionais.escada_sem_elevador)}`, pergunta: 'Na saída ou na chegada, os móveis vão subir ou descer escada porque o prédio não tem elevador?' },
    { id: 'itens_frageis', tipo: 'noul', papel: 'checklist', tom: 'medio', rotulo: `${ADICIONAIS.itens_frageis} · +${reais(TABELA.adicionais.itens_frageis)}`, pergunta: 'Há itens frágeis ou de alto valor que pedem embalagem especial (TV grande, espelho, vidro, piano, lustre, louça fina, servidor ou computador)? Geladeira, fogão, sofá, cama e caixas comuns não contam.' },
    { id: 'desmontagem', tipo: 'noul', papel: 'checklist', tom: 'medio', rotulo: `${ADICIONAIS.desmontagem} · +${reais(TABELA.adicionais.desmontagem)}`, pergunta: 'O cliente diz que algum móvel precisa ser desmontado e montado de novo (guarda-roupa, estante, estações de trabalho, cama)?' },
    { id: 'outra_cidade', tipo: 'noul', papel: 'checklist', tom: 'medio', rotulo: `${ADICIONAIS.outra_cidade} · +${reais(TABELA.adicionais.outra_cidade)}`, pergunta: 'A origem e o destino ficam em cidades diferentes?' },
    { id: 'urgente', tipo: 'noul', papel: 'checklist', tom: 'medio', rotulo: `${ADICIONAIS.urgente} · +${reais(TABELA.adicionais.urgente)}`, pergunta: 'O cliente precisa do serviço para hoje, amanhã ou nos próximos 3 dias, ou diz que é urgente?' },
  ],

  // painel do topo: a faixa de preço sai da TABELA, calculada aqui (o Jev nunca dá número)
  render(r, texto, ctx) {
    const T = ctx.tabela || TABELA;
    const R = r.respostas || {};
    const tipo = R.tipo && R.tipo.choice;
    if (!tipo) return '';
    const conf = (R.tipo.probabilities || {})[tipo] || 0;
    const caixa = (corpo) => `<div class="mj-widget mj-painel-box" style="border-color:color-mix(in srgb,var(--mj-acento) 45%,transparent)"><h4>Orçamento estimado <span class="tp">calculado pela tabela, no código</span></h4>${corpo}</div>`;
    if (tipo === 'nenhum') {
      return caixa('<div class="mj-alerta-box ok" style="background:var(--mj-card);border-color:var(--mj-borda2)"><span class="ic">💬</span><div><b>Não é pedido de mudança.</b><div class="dim" style="font-size:12.5px">Sem preço automático: a mensagem vai para um atendente.</div></div></div>');
    }
    const nivel = nivelDe(R.porte);
    const linhas = [[`Base · ${NOMES[tipo]}`, T.base[tipo] || 0], [`Volume · ${PORTES[nivel]}`, T.porte[nivel] || 0]];
    for (const [id, valor] of Object.entries(T.adicionais)) if (R[id] && R[id].noul >= 0.5) linhas.push([ADICIONAIS[id] || id, valor]);
    const total = linhas.reduce((s, l) => s + l[1], 0);
    const min = arred(total * T.faixa[0]), max = arred(total * T.faixa[1]);
    const lista = linhas.map(([rot, v], i) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed var(--mj-borda)"><span class="${i > 1 ? '' : 'dim'}">${i > 0 ? '+ ' : ''}${rot}</span><span class="mj-num">${reais(v)}</span></div>`).join('');
    const incerto = conf < LIMIAR_TIPO;
    const aviso = incerto
      ? `<div style="margin-top:10px"><span class="mj-chip medio">⚠ tipo incerto (${Math.round(conf * 100)}%): confirme com o cliente antes de enviar</span></div>`
      : `<div class="mj-card-analise" style="margin-top:10px;padding:10px;font-size:13px"><span class="dim">Resposta pronta:</span> Pelo que você descreveu, o orçamento fica entre <b>${reais(min)}</b> e <b>${reais(max)}</b>. Quer agendar uma visita técnica gratuita para fechar o valor?</div>`;
    return caixa(`<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="mj-num" style="font-size:32px;font-weight:800;color:var(--mj-acento2);${incerto ? 'opacity:.6' : ''}">${reais(min)}–${max.toLocaleString('pt-BR')}</span><span class="mj-chip acento">${Math.round(conf * 100)}% de certeza no tipo</span></div><div style="margin-top:8px;font-size:13px">${lista}</div>${aviso}`);
  },

  exemplos: [
    {
      titulo: 'Apê de 1 quarto',
      texto: 'Oi, boa tarde! Vou mudar de um apê de 1 quarto na Vila Mariana pra Saúde, aqui em São Paulo mesmo, no mês que vem. O prédio de lá tem 3 andares e não tem elevador 😩 Tenho geladeira, fogão, cama de casal, sofá, máquina de lavar e umas 20 caixas. O guarda-roupa vai ter que desmontar.',
      esperado: { tipo: 'residencial_pequena', porte: [1, 2], escada_sem_elevador: true, itens_frageis: false, desmontagem: true, outra_cidade: false, urgente: false },
    },
    {
      titulo: 'Frete para amanhã',
      texto: 'Bom dia! Preciso levar só uma máquina de lavar e um sofá de 3 lugares da casa da minha mãe pra minha, no mesmo bairro, em Guarulhos. Dá pra ser amanhã cedo? As duas casas são térreas.',
      esperado: { tipo: 'frete_avulso', porte: 0, escada_sem_elevador: false, itens_frageis: false, desmontagem: false, outra_cidade: false, urgente: true },
    },
    {
      titulo: 'Escritório inteiro',
      texto: 'Olá, somos um escritório de contabilidade com 14 pessoas e vamos sair de Campinas para Valinhos daqui a dois meses. São 14 estações de trabalho que precisam ser desmontadas, 2 servidores, arquivos de aço e uma TV de 65 polegadas na sala de reunião.',
      esperado: { tipo: 'comercial', porte: 3, escada_sem_elevador: false, itens_frageis: true, desmontagem: true, outra_cidade: true, urgente: false },
    },
    {
      titulo: 'Casa com piano',
      texto: 'Vamos mudar de uma casa de 4 quartos em Sorocaba para um apartamento em Santos, em janeiro. Temos um piano de armário, dois lustres de cristal e muita louça. Os móveis vão inteiros, sem desmontar, e o prédio novo tem elevador de serviço.',
      esperado: { tipo: 'residencial_grande', porte: 3, escada_sem_elevador: false, itens_frageis: true, desmontagem: false, outra_cidade: true, urgente: false },
    },
    {
      titulo: 'Não é mudança',
      texto: 'Boa tarde, vocês estão contratando ajudante? Tenho 3 anos de experiência com mudança e moro em Osasco.',
      esperado: { tipo: 'nenhum', escada_sem_elevador: false, itens_frageis: false, desmontagem: false, outra_cidade: false, urgente: false },
    },
  ],
};

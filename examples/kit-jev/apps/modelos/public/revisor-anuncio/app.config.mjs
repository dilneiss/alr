// Revisor de Anúncio — enquanto você escreve o anúncio, o Jev aponta o que faz a plataforma barrar: promessa de cura, ganho garantido, antes e depois…
// Para adaptar: troque as checagens (decisões) pelas regras da sua plataforma ou do seu nicho, as DICAS de correção e os exemplos.
const DICAS = {
  promessa_cura: 'Troque a promessa por benefício sem garantia ("pode ajudar no seu bem-estar"). Nada de "cura", "acaba com" ou "elimina".',
  ganho_garantido: 'Tire o valor e a garantia de ganho. Fale do que a pessoa aprende, não de quanto vai faturar.',
  antes_depois: 'Remova o antes e depois. Mostre o serviço e o processo, não o corpo transformado.',
  urgencia_falsa: 'Use um prazo real e verificável ("até 31/10") ou tire a pressão.',
  comparacao_desleal: 'Não cite nem ataque o concorrente. Fale das suas qualidades.',
  dado_sem_fonte: 'Diga de onde vem o número ("pesquisa com 1.200 clientes, set/2026") ou tire o número.',
};
const NOMES = { promessa_cura: 'Promessa de cura', ganho_garantido: 'Ganho garantido', antes_depois: 'Antes e depois', urgencia_falsa: 'Urgência falsa', comparacao_desleal: 'Comparação desleal', dado_sem_fonte: 'Dado sem fonte' };

export default {
  id: 'revisor-anuncio',
  titulo: 'Revisor de Anúncio',
  emoji: '🛡️',
  categoria: 'vendas',
  ordem: 31,
  resumo: 'Enquanto você escreve o anúncio, o Jev aponta o que faz a plataforma barrar e o que dá para ajustar antes de subir.',
  descricao: 'A cada pausa da digitação o Jev relê o anúncio inteiro e responde 7 perguntas de uma vez: as 6 armadilhas que mais derrubam anúncio e o veredito. O veredito segue uma lista fechada de regras escrita na pergunta, e cada problema encontrado traz uma dica de correção pronta.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'aovivo',
  tema: { acento: '#e11d48', acento2: '#fb923c' },

  contexto: {
    quem_revisa: 'agência de tráfego pago que sobe anúncios de vários clientes no Instagram e no Facebook',
    politica: 'as plataformas barram promessa de cura, ganho garantido e antes e depois; urgência falsa, comparação desleal e número sem fonte pedem ajuste antes de publicar',
  },

  aovivo: {
    skin: 'anuncio',
    janela: 'Novo anúncio · Feed e Stories',
    rotulo: 'Texto do anúncio',
    cabecalho: { Cliente: 'qualquer cliente da agência', Revisão: 'política de anúncios das plataformas' },
    placeholder: 'Escreva ou cole o texto do anúncio…',
    dica: 'O Jev só aponta. As dicas de correção são textos prontos da agência.',
    tituloChecklist: 'Armadilhas que derrubam anúncio',
    velocidade: 1.6,
    pausa: 2800,
  },

  decisoes: [
    {
      id: 'veredito', tipo: 'choice', papel: 'destaque', titulo: 'Veredito',
      pergunta: 'Este anúncio pode ser publicado? Regras: se tem promessa de cura ou de resultado no corpo, promessa de ganho financeiro garantido, ou antes e depois → reprovado; se tem só urgência falsa, comparação desleal com concorrente ou número/estudo sem fonte → ajustar; se não tem nenhum desses problemas → aprovado.',
      opcoes: [
        { id: 'ajustar', rotulo: 'Ajustar antes', icone: '✏️', cor: '#fbbf24', desc: 'só urgência falsa, comparação desleal ou dado sem fonte: corrigir e publicar' },
        { id: 'reprovado', rotulo: 'Reprovado', icone: '⛔', cor: '#f87171', desc: 'promessa de cura, ganho garantido ou antes e depois: a plataforma vai barrar' },
        { id: 'aprovado', rotulo: 'Pode publicar', icone: '✅', cor: '#34d399', desc: 'nenhum problema da lista' },
      ],
    },
    { id: 'promessa_cura', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.promessa_cura, pergunta: 'O anúncio promete curar, tratar ou acabar com um problema de saúde (dor, doença, ansiedade, insônia) ou garante um resultado no corpo (perder peso, sumir estria, rejuvenescer)?' },
    { id: 'ganho_garantido', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.ganho_garantido, pergunta: 'O anúncio promete ganho de dinheiro garantido ou fácil (valor por dia ou por semana, "lucro garantido", "renda extra sem esforço")?' },
    { id: 'antes_depois', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.antes_depois, pergunta: 'O anúncio mostra ou descreve um "antes e depois" do corpo, do rosto ou da pele de alguém?' },
    { id: 'urgencia_falsa', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.urgencia_falsa, pergunta: 'O anúncio cria pressão de tempo ou escassez sem dado verificável, sem data ou quantidade real ("só hoje", "últimas unidades", "vagas encerram à meia-noite")?' },
    { id: 'comparacao_desleal', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.comparacao_desleal, pergunta: 'O anúncio ataca ou diminui um concorrente, citado pelo nome ou em geral ("melhor que qualquer outra clínica", "os da marca X machucam")?' },
    { id: 'dado_sem_fonte', tipo: 'noul', papel: 'checklist', tom: 'ruim', rotulo: NOMES.dado_sem_fonte, pergunta: 'O anúncio usa número, estatística, ranking ou estudo sem dizer a fonte ("9 em cada 10", "comprovado cientificamente", "o mais vendido do Brasil")?' },
  ],

  // painel do topo: dica pronta de correção para cada armadilha encontrada (texto nosso; o Jev só aponta)
  render(r) {
    const R = r.respostas || {};
    const achados = Object.keys(DICAS).filter((id) => R[id] && R[id].noul >= 0.5);
    if (!R.veredito) return '';
    if (!achados.length) return '<div class="mj-widget mj-painel-box"><h4>Como corrigir <span class="tp">dicas prontas da agência</span></h4><div class="mj-alerta-box ok"><span class="ic">✅</span><div>Nenhuma armadilha encontrada. Pode subir o anúncio.</div></div></div>';
    const itens = achados.map((id) => `<div style="display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px dashed var(--mj-borda);font-size:13px"><span>✏️</span><div><b>${NOMES[id]}</b> <span class="mj-num dim">${Math.round(R[id].noul * 100)}%</span><div class="dim">${DICAS[id]}</div></div></div>`).join('');
    return `<div class="mj-widget mj-painel-box"><h4>Como corrigir <span class="tp">${achados.length} ${achados.length === 1 ? 'armadilha' : 'armadilhas'}</span></h4>${itens}</div>`;
  },

  exemplos: [
    {
      titulo: 'Suplemento',
      texto: 'Chega de dor nas juntas! O ArticulaMax acaba com a dor nas articulações em 15 dias, 100% natural e comprovado cientificamente. ÚLTIMAS UNIDADES com 70% de desconto, só hoje!',
      esperado: { veredito: 'reprovado', promessa_cura: true, ganho_garantido: false, antes_depois: false, urgencia_falsa: true, comparacao_desleal: false, dado_sem_fonte: true },
    },
    {
      titulo: 'Renda extra',
      texto: 'Ganhe R$ 5.000 por semana trabalhando 1 hora por dia pelo celular! Método garantido: se não lucrar, devolvemos o dobro. 9 em cada 10 alunos já largaram o emprego. As vagas encerram à meia-noite!',
      esperado: { veredito: 'reprovado', promessa_cura: false, ganho_garantido: true, antes_depois: false, urgencia_falsa: true, comparacao_desleal: false, dado_sem_fonte: true },
    },
    {
      titulo: 'Clínica de estética',
      texto: 'Antes e depois que impressiona: a barriga da Juliana secou e as estrias sumiram com o protocolo Corpo Novo da Clínica Lume. Muito melhor que academia ou que qualquer outra clínica. Agende sua avaliação.',
      esperado: { veredito: 'reprovado', promessa_cura: true, ganho_garantido: false, antes_depois: true, urgencia_falsa: false, comparacao_desleal: true, dado_sem_fonte: false },
    },
    {
      titulo: 'Loja de tênis',
      texto: 'O tênis de corrida mais confortável do Brasil, segundo 9 em cada 10 corredores. Bem mais leve que os da Passada Forte, que machucam o pé. Frete grátis só hoje!',
      esperado: { veredito: 'ajustar', promessa_cura: false, ganho_garantido: false, antes_depois: false, urgencia_falsa: true, comparacao_desleal: true, dado_sem_fonte: true },
    },
    {
      titulo: 'Anúncio ok',
      texto: 'Aulas de cerâmica para iniciantes no Ateliê Barro Bom, em Curitiba. Turmas de até 8 pessoas, com todo o material incluso. Inscrições abertas para novembro: veja os horários no site.',
      esperado: { veredito: 'aprovado', promessa_cura: false, ganho_garantido: false, antes_depois: false, urgencia_falsa: false, comparacao_desleal: false, dado_sem_fonte: false },
    },
  ],
};

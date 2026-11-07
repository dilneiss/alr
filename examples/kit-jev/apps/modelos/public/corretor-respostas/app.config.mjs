// Corretor de Respostas Abertas — confere, em cada resposta de aluno, quais pontos-chave do gabarito apareceram.
// Para adaptar: troque a pergunta e os 3 pontos do gabarito (PONTOS e contexto), as perguntas sim/não e as respostas de exemplo.
// A soma dos pontos fica com o código; o professor só olha o que vier com confiança baixa ou com nota e soma em desacordo.

const PONTOS = [
  { id: 'p1_luz', curto: 'luz do Sol', texto: 'a planta usa a energia da luz do Sol' },
  { id: 'p2_alimento', curto: 'alimento/glicose', texto: 'a planta produz o próprio alimento (glicose, um açúcar) a partir do gás carbônico e da água' },
  { id: 'p3_oxigenio', curto: 'oxigênio', texto: 'a fotossíntese libera oxigênio para o ar' },
];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cobertos = (resp) => PONTOS.filter((p) => resp[p.id] && resp[p.id].noul >= 0.5);
const LIMIAR_PROFESSOR = 0.75; // abaixo desta confiança, a resposta vai para o professor

export default {
  id: 'corretor-respostas',
  titulo: 'Corretor de Respostas Abertas',
  emoji: '📝',
  categoria: 'educacao',
  ordem: 69,
  resumo: 'Cada resposta aberta é conferida ponto a ponto contra o gabarito: completa, parcial ou incompleta, e o professor só revisa as incertas.',
  descricao: 'O Jev responde, para cada resposta de aluno, se cada ponto-chave do gabarito apareceu (sim ou não) e em que nível ela fica. O código soma os pontos e compara com a nota: quando os dois não batem, ou a confiança é baixa, a resposta vai para o professor.',
  marcas: ['volume', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#12b886', acento2: '#ffd43b' },
  origem: 'IDEIAS-100-APPS #69 — escritas ou faladas: cada ponto-chave do gabarito foi coberto?',

  contexto: {
    turma: '6º ano A — Ciências, Colégio Ipê Amarelo (fictício)',
    pergunta: 'Explique o que é a fotossíntese e por que ela é importante para a vida na Terra.',
    gabarito: PONTOS.map((p, i) => `ponto ${i + 1}: ${p.texto}`),
    criterio: 'vale a ideia, não a palavra exata: "comida" vale por alimento, "açúcar" vale por glicose, "solta" vale por libera; erro de português não tira ponto',
  },

  decisoes: [
    {
      id: 'nota', tipo: 'choice', titulo: 'Correção',
      pergunta: 'Quantos destes 3 pontos-chave do gabarito a resposta do aluno cobre? (1) a planta usa a energia da luz do Sol; (2) a planta produz o próprio alimento (glicose, açúcar); (3) a fotossíntese libera oxigênio para o ar. Regra: completa = cobre os 3 pontos; parcial = cobre 1 ou 2 pontos; incompleta = não cobre nenhum ponto.',
      opcoes: [
        { id: 'completa', rotulo: 'Completa', icone: '✅', cor: '#34d399', desc: 'cobre os 3 pontos: luz do Sol, produção do próprio alimento (glicose) e liberação de oxigênio' },
        { id: 'parcial', rotulo: 'Parcial', icone: '🟡', cor: '#fbbf24', desc: 'cobre 1 ou 2 dos 3 pontos, e falta pelo menos um' },
        { id: 'incompleta', rotulo: 'Incompleta', icone: '❌', cor: '#f87171', desc: 'não cobre nenhum dos 3 pontos: resposta errada, fora do assunto, "não sei" ou em branco' },
      ],
    },
    {
      id: 'p1_luz', tipo: 'noul', titulo: 'Ponto 1: luz do Sol', rotulo: 'luz do Sol', icone: '☀️', tom: 'bom',
      pergunta: 'A resposta diz que a planta usa a luz do Sol (a energia da luz) para fazer a fotossíntese?',
    },
    {
      id: 'p2_alimento', tipo: 'noul', titulo: 'Ponto 2: produz alimento', rotulo: 'produz alimento', icone: '🍬', tom: 'bom',
      pergunta: 'A resposta diz que a planta PRODUZ o próprio alimento (glicose, açúcar, "comida")? Pegar nutrientes do solo, beber água ou "respirar" não contam.',
    },
    {
      id: 'p3_oxigenio', tipo: 'noul', titulo: 'Ponto 3: libera oxigênio', rotulo: 'libera oxigênio', icone: '🌬️', tom: 'bom',
      pergunta: 'A resposta diz que a planta libera (solta, produz) oxigênio para o ar?',
    },
  ],

  fluxo: {
    colunas: 'nota',
    rotuloItem: 'Resposta do aluno',
    lote: 4,
    ritmo: 3800,
    humano: { limiar: LIMIAR_PROFESSOR, rotulo: 'Professor revisa', icone: '🧑‍🏫' },
    cartao: { titulo: 'aluno', subtitulo: 'turma', texto: 'resposta', avatar: 'avatar' },
    entrada: { placeholder: 'Escreva uma resposta de aluno sobre fotossíntese e veja a correção ponto a ponto…', botao: 'Corrigir' },
    rotuloFila: 'Respostas para corrigir',
    rotuloFeitos: 'respostas',
  },
  textoItem: (it) => it.resposta,

  // soma dos pontos feita pelo código; nota e soma em desacordo = vale o professor olhar
  cartaoExtra(item, resp) {
    const ok = cobertos(resp);
    const falta = PONTOS.filter((p) => !ok.includes(p)).map((p) => p.curto);
    const pelaSoma = ok.length === 3 ? 'completa' : ok.length === 0 ? 'incompleta' : 'parcial';
    let h = `<span class="mj-chip info" title="Soma feita pelo código a partir das 3 perguntas sim/não">${ok.length}/3 pontos</span>`;
    if (falta.length && ok.length) h += ` <span class="mj-chip" title="Pontos do gabarito que não apareceram">faltou: ${esc(falta.join(', '))}</span>`;
    if (resp.nota && resp.nota.choice && resp.nota.choice !== pelaSoma) h += ' <span class="mj-chip medio" title="A correção do Jev e a soma dos pontos não batem: o professor confere">⚠ conferir</span>';
    return h;
  },
  aoDecidir(item, resp, extra) {
    if (!resp.nota) return;
    extra.total = (extra.total || 0) + 1;
    extra.pontos = (extra.pontos || 0) + cobertos(resp).length;
    const conf = Math.max(...Object.values(resp.nota.probabilities || { x: 0 }));
    if (conf < LIMIAR_PROFESSOR) extra.revisar = (extra.revisar || 0) + 1;
    if (resp.nota.choice === 'completa') extra.completas = (extra.completas || 0) + 1;
  },
  resumoExtra(extra) {
    const t = extra.total || 0;
    if (!t) return [];
    return [
      { rotulo: 'média da turma', valor: `${(extra.pontos / t).toFixed(1).replace('.', ',')} de 3 pontos` },
      { rotulo: 'completas', valor: `${extra.completas || 0} de ${t}` },
      { rotulo: 'professor corrige', valor: `só ${extra.revisar || 0}` },
    ];
  },

  dados: [
    { id: 'c1', aluno: 'Rafaela Nogueira', turma: '6º A', avatar: '👧', resposta: 'A fotossíntese é quando a planta usa a luz do sol pra transformar gás carbônico e água em glicose, que é o alimento dela. E ela solta oxigênio, que a gente respira.', esperado: { nota: 'completa', p1_luz: true, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c2', aluno: 'Caio Brandão', turma: '6º A', avatar: '👦', resposta: 'É quando a planta fabrica a própria comida.', esperado: { nota: 'parcial', p1_luz: false, p2_alimento: true, p3_oxigenio: false } },
    { id: 'c3', aluno: 'Yasmin Prado', turma: '6º A', avatar: '👩', resposta: 'As plantas respiram gás carbônico e soltam oxigênio, por isso são importantes.', esperado: { nota: 'parcial', p1_luz: false, p2_alimento: false, p3_oxigenio: true } },
    { id: 'c4', aluno: 'Benício Lopes', turma: '6º A', avatar: '🧒', resposta: 'A planta pega a luz do sol e faz o alimento dela.', esperado: { nota: 'parcial', p1_luz: true, p2_alimento: true, p3_oxigenio: false } },
    { id: 'c5', aluno: 'Lívia Antunes', turma: '6º A', avatar: '😶', resposta: 'Não sei.', esperado: { nota: 'incompleta', p1_luz: false, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c6', aluno: 'Joaquim Sales', turma: '6º A', avatar: '👦', resposta: 'fotossintese é a planta se alimentando da terra pelas raizes', esperado: { nota: 'incompleta', p1_luz: false, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c7', aluno: 'Clara Vasconcelos', turma: '6º A', avatar: '👧', resposta: 'Com a energia da luz, a planta junta água e gás carbônico e produz açúcar. Nesse processo sai oxigênio pro ambiente. Sem isso não teria oxigênio pra gente.', esperado: { nota: 'completa', p1_luz: true, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c8', aluno: 'Samuel Freitas', turma: '6º A', avatar: '🧑', resposta: 'é importante pq produz oxigênio pros animais e pras pessoas', esperado: { nota: 'parcial', p1_luz: false, p2_alimento: false, p3_oxigenio: true } },
    { id: 'c9', aluno: 'Marina Toledo', turma: '6º A', avatar: '👩‍🦰', resposta: 'A planta usa o sol, a água e o ar para crescer.', esperado: { nota: 'parcial', p1_luz: true, p3_oxigenio: false } },
    { id: 'c10', aluno: 'Otávio Rezende', turma: '6º A', avatar: '🤓', resposta: 'Processo em que os vegetais convertem energia luminosa em energia química (glicose), a partir de CO2 e H2O, liberando O2.', esperado: { nota: 'completa', p1_luz: true, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c11', aluno: 'Pietra Gonçalves', turma: '6º A', avatar: '👧', resposta: 'É quando a planta bebe água pela raiz.', esperado: { nota: 'incompleta', p1_luz: false, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c12', aluno: 'Lorenzo Batista', turma: '6º A', avatar: '👦', resposta: 'A planta faz fotossíntese de dia com a luz e de noite ela respira.', esperado: { nota: 'parcial', p1_luz: true, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c13', aluno: 'Esther Cardoso', turma: '6º A', avatar: '👩', resposta: 'fotosintese e qnd a planta usa a luz pra fazer comida e libera oxigenio', esperado: { nota: 'completa', p1_luz: true, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c14', aluno: 'Vicente Moraes', turma: '6º A', avatar: '🧒', resposta: 'É a planta transformando a luz em comida.', esperado: { nota: 'parcial', p1_luz: true, p2_alimento: true, p3_oxigenio: false } },
    { id: 'c15', aluno: 'Antonella Ramos', turma: '6º A', avatar: '👧', resposta: 'Ela é importante porque sem ela as plantas morrem.', esperado: { nota: 'incompleta', p1_luz: false, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c16', aluno: 'Henrique Pacheco', turma: '6º A', avatar: '👦', resposta: 'Na fotossíntese a planta absorve gás carbônico e libera oxigênio, usando a luz do sol.', esperado: { nota: 'parcial', p1_luz: true, p2_alimento: false, p3_oxigenio: true } },
    { id: 'c17', aluno: 'Sarah Monteiro', turma: '6º A', avatar: '👩‍🦱', resposta: 'A planta produz glicose, que serve de energia pra ela, e o oxigênio vai pro ar.', esperado: { nota: 'parcial', p1_luz: false, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c18', aluno: 'Bento Aguiar', turma: '6º A', avatar: '🧑', resposta: 'é tipo um painel solar: a folha capta luz e transforma em energia pra planta, e o resto vira oxigênio', esperado: { p1_luz: true, p3_oxigenio: true } },
    { id: 'c19', aluno: 'Melissa Duarte', turma: '6º A', avatar: '👧', resposta: 'É o processo em que a planta faz o oxigênio que respiramos, usando a luz do Sol, e guarda energia em forma de açúcar.', esperado: { nota: 'completa', p1_luz: true, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c20', aluno: 'Gael Siqueira', turma: '6º A', avatar: '👦', resposta: 'A fotossíntese acontece nas raízes e serve para a planta pegar os nutrientes do solo.', esperado: { nota: 'incompleta', p1_luz: false, p2_alimento: false, p3_oxigenio: false } },
    { id: 'c21', aluno: 'Aurora Bezerra', turma: '6º A', avatar: '👩', resposta: 'A planta pega o sol e o gás carbônico do ar e produz o próprio alimento, por isso ela não precisa comer como a gente.', esperado: { nota: 'parcial', p1_luz: true, p2_alimento: true, p3_oxigenio: false } },
    { id: 'c22', aluno: 'Nicolas Paiva', turma: '6º A', avatar: '🧒', resposta: 'Serve pra planta produzir oxigênio e glicose, mas não lembro do resto.', esperado: { nota: 'parcial', p1_luz: false, p2_alimento: true, p3_oxigenio: true } },
    { id: 'c23', aluno: 'Luna Figueiredo', turma: '6º A', avatar: '🤔', resposta: 'acho que tem a ver com a luz e com o oxigênio, mas não sei se a planta solta ou se ela pega o oxigênio', esperado: { p2_alimento: false } },
    { id: 'c24', aluno: 'Davi Lucca', turma: '6º A', avatar: '👦', resposta: 'A planta faz o contrário da gente: pega o que a gente solta e solta o que a gente pega.', esperado: { p1_luz: false, p2_alimento: false } },
  ],
};

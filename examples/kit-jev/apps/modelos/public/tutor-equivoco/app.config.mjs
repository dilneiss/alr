// Tutor que Diagnostica o Equívoco — lê a resposta de cada aluno e diz QUAL ideia errada explica a resposta, com o próximo exercício certo.
// Para adaptar: troque a pergunta e a resposta certa (contexto), os equívocos conhecidos (opções) e o exercício de cada um (EXERCICIOS).
// Em matemática, a conta fica com o código: o código confere se a resposta está certa e o Jev só diz qual equívoco a explica.

const EXERCICIOS = {
  distancia_do_sol: { curto: '📘 Natal em Lisboa × Porto Alegre', longo: 'Se a distância explicasse, os dois hemisférios teriam verão ao mesmo tempo. Compare a temperatura do Natal em Lisboa e em Porto Alegre.' },
  sol_mais_forte: { curto: '📘 Lanterna de frente × de lado', longo: 'Aponte uma lanterna de frente e depois inclinada para uma folha quadriculada: a mesma luz, espalhada, aquece menos cada quadradinho.' },
  clima_nuvens: { curto: '📘 Horas de sol: junho × dezembro', longo: 'Tabela de nascer e pôr do sol em Curitiba em junho e em dezembro: o dia muda de tamanho, com ou sem nuvem.' },
  inclinacao_eixo: { curto: '🚀 Desafio: e sem inclinação?', longo: 'O que aconteceria com as estações do ano se o eixo da Terra não fosse inclinado?' },
  outro: { curto: '🗣️ Retomar com o professor', longo: 'Refazer a pergunta em dupla, com um globo e uma lanterna, antes de um exercício novo.' },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  id: 'tutor-equivoco',
  titulo: 'Tutor que Diagnostica o Equívoco',
  emoji: '🌍',
  categoria: 'educacao',
  ordem: 68,
  resumo: 'O professor cola as respostas da turma e cada uma cai na raia do equívoco que a explica, com o próximo exercício certo para aquele aluno.',
  descricao: 'O Jev não dá nota: ele escolhe, numa lista fechada de equívocos conhecidos, qual ideia explica a resposta de cada aluno. Resposta ambígua vai para o professor, e a conta da turma (quantos acertaram, qual equívoco domina) é feita pelo código.',
  marcas: ['volume', 'lista fechada', 'limiar'],
  motor: 'fluxo',
  tema: { acento: '#f9c74f', acento2: '#43aa8b' },
  origem: 'IDEIAS-100-APPS #68 — sonda em frações: 7/8, e o único erro foi o caso que dependia de conta',

  contexto: {
    turma: '7º ano B — Ciências, Escola Estadual Monte Azul (fictícia)',
    pergunta: 'Por que é verão no Brasil quando é inverno na Europa?',
    resposta_certa: 'O eixo da Terra é inclinado (cerca de 23,5°). Em dezembro o Hemisfério Sul recebe a luz do Sol mais de frente e por mais horas no dia; o Hemisfério Norte recebe de lado. Em junho é o contrário. A distância até o Sol quase não muda e não explica as estações.',
  },

  decisoes: [
    {
      id: 'equivoco', tipo: 'choice', titulo: 'Equívoco',
      pergunta: 'Qual ideia o aluno usa para explicar por que é verão no Brasil quando é inverno na Europa? Regra: se a resposta cita a inclinação do eixo da Terra (ou que cada hemisfério recebe a luz do Sol mais de frente numa época do ano), escolha a inclinação, mesmo que venha junto com outra ideia.',
      opcoes: [
        { id: 'distancia_do_sol', rotulo: 'Distância do Sol', icone: '🪐', cor: '#fb923c', desc: 'a Terra, o Brasil ou a Europa fica mais perto ou mais longe do Sol (órbita oval, "afastada do Sol")' },
        { id: 'sol_mais_forte', rotulo: 'Sol mais forte', icone: '🔥', cor: '#f87171', desc: 'o próprio Sol muda: "esquenta mais", "brilha mais forte", "solta mais calor" numa época do ano ou num lugar' },
        { id: 'clima_nuvens', rotulo: 'Clima e nuvens', icone: '🌧️', cor: '#60a5fa', desc: 'explica pelo tempo ou pela geografia: nuvens, chuva, neve, vento, mar, florestas, polo gelado, "o Brasil é tropical"' },
        { id: 'inclinacao_eixo', rotulo: 'Inclinação do eixo ✔', icone: '🌍', cor: '#34d399', desc: 'resposta certa: o eixo da Terra é inclinado, então cada hemisfério recebe a luz do Sol mais de frente (ou por mais horas) numa época do ano' },
        { id: 'outro', rotulo: 'Outro / sem causa', icone: '❔', cor: '#94a3b8', desc: 'confunde com dia e noite (rotação), diz que o Sol gira em volta da Terra, chuta, "não sei" ou não explica a causa' },
      ],
    },
    {
      id: 'mistura', tipo: 'noul', titulo: 'Mistura ideias', rotulo: 'mistura com ideia errada', icone: '🧩', tom: 'medio', limiar: 0.6,
      pergunta: 'A resposta cita a inclinação do eixo da Terra E TAMBÉM uma ideia errada (distância do Sol, Sol mais forte ou clima)? Se não cita a inclinação, responda não.',
    },
  ],

  fluxo: {
    colunas: 'equivoco',
    rotuloItem: 'Resposta do aluno',
    lote: 4,
    ritmo: 3800,
    humano: { limiar: 0.75, rotulo: 'Professor revisa', icone: '🧑‍🏫' },
    cartao: { titulo: 'aluno', subtitulo: 'turma', texto: 'resposta', avatar: 'avatar' },
    entrada: { placeholder: 'Escreva uma resposta de aluno (ex.: "é porque o Sol fica mais perto da gente no verão")…', botao: 'Diagnosticar' },
    rotuloFila: 'Respostas chegando',
    rotuloFeitos: 'respostas',
  },
  textoItem: (it) => it.resposta,

  // o próximo exercício sai do equívoco escolhido (texto nosso, não do Jev)
  cartaoExtra(item, resp) {
    const ex = EXERCICIOS[resp.equivoco && resp.equivoco.choice];
    return ex ? `<span class="mj-chip info" title="${esc(ex.longo)}">${esc(ex.curto)}</span>` : '';
  },
  // a conta da turma fica com o código
  aoDecidir(item, resp, extra) {
    const c = resp.equivoco && resp.equivoco.choice;
    if (!c) return;
    extra.total = (extra.total || 0) + 1;
    extra[c] = (extra[c] || 0) + 1;
  },
  resumoExtra(extra) {
    const total = extra.total || 0;
    if (!total) return [];
    const nomes = { distancia_do_sol: 'distância do Sol', sol_mais_forte: 'Sol mais forte', clima_nuvens: 'clima e nuvens', outro: 'outro / sem causa' };
    const certos = extra.inclinacao_eixo || 0;
    const [pior, n] = Object.keys(nomes).map((k) => [k, extra[k] || 0]).sort((a, b) => b[1] - a[1])[0];
    return [
      { rotulo: 'acertaram', valor: `${certos} de ${total} (${Math.round((certos / total) * 100)}%)` },
      { rotulo: 'equívoco mais comum', valor: n ? `${nomes[pior]} (${n})` : '—' },
    ];
  },

  dados: [
    { id: 'r1', aluno: 'Ana Beatriz', turma: '7º B', avatar: '👧', resposta: 'Porque a Terra é inclinada, aí em dezembro a parte de baixo dela (o sul) fica mais virada pro Sol.', esperado: { equivoco: 'inclinacao_eixo', mistura: false } },
    { id: 'r2', aluno: 'Lucas Mendes', turma: '7º B', avatar: '👦', resposta: 'Porque em dezembro a Terra tá mais perto do Sol, aí aqui fica mais quente.', esperado: { equivoco: 'distancia_do_sol', mistura: false } },
    { id: 'r3', aluno: 'Júlia Rocha', turma: '7º B', avatar: '👧', resposta: 'o sol é mais forte aqui no brasil e lá é mais fraco', esperado: { equivoco: 'sol_mais_forte', mistura: false } },
    { id: 'r4', aluno: 'Pedro Henrique', turma: '7º B', avatar: '🧒', resposta: 'Na Europa tem mais nuvem e neve, por isso lá é frio.', esperado: { equivoco: 'clima_nuvens', mistura: false } },
    { id: 'r5', aluno: 'Sofia Lima', turma: '7º B', avatar: '👩', resposta: 'Por causa do eixo da Terra, que é torto uns 23 graus. Os raios do Sol chegam mais retos aqui no fim do ano.', esperado: { equivoco: 'inclinacao_eixo', mistura: false } },
    { id: 'r6', aluno: 'Gabriel Souza', turma: '7º B', avatar: '👦', resposta: 'Porque quando é dia aqui é noite lá.', esperado: { equivoco: 'outro', mistura: false } },
    { id: 'r7', aluno: 'Isabela Costa', turma: '7º B', avatar: '👧', resposta: 'A órbita da Terra é oval, então tem época do ano que a Europa fica mais longe do Sol.', esperado: { equivoco: 'distancia_do_sol', mistura: false } },
    { id: 'r8', aluno: 'Matheus Alves', turma: '7º B', avatar: '🧑', resposta: 'Porque no fim do ano o Sol esquenta mais.', esperado: { equivoco: 'sol_mais_forte', mistura: false } },
    { id: 'r9', aluno: 'Laura Martins', turma: '7º B', avatar: '👩‍🦱', resposta: 'Por causa do mar e das florestas. O Brasil é um país tropical.', esperado: { equivoco: 'clima_nuvens', mistura: false } },
    { id: 'r10', aluno: 'Enzo Ribeiro', turma: '7º B', avatar: '😅', resposta: 'sei lá prof kkkk', esperado: { equivoco: 'outro', mistura: false } },
    { id: 'r11', aluno: 'Valentina Dias', turma: '7º B', avatar: '👧', resposta: 'A Terra é inclinada, então cada hemisfério recebe o Sol de frente numa época. E também porque em janeiro a Terra fica mais perto do Sol.', esperado: { equivoco: 'inclinacao_eixo', mistura: true } },
    { id: 'r12', aluno: 'Davi Oliveira', turma: '7º B', avatar: '👦', resposta: 'Porque a Europa fica mais longe do Sol do que o Brasil.', esperado: { equivoco: 'distancia_do_sol', mistura: false } },
    { id: 'r13', aluno: 'Helena Pereira', turma: '7º B', avatar: '👩', resposta: 'O Sol bate mais direto no hemisfério sul nessa época por causa da inclinação da Terra.', esperado: { equivoco: 'inclinacao_eixo', mistura: false } },
    { id: 'r14', aluno: 'Miguel Carvalho', turma: '7º B', avatar: '🧒', resposta: 'Porque o Sol gira em volta da Terra e fica mais tempo do nosso lado.', esperado: { equivoco: 'outro', mistura: false } },
    { id: 'r15', aluno: 'Alice Fernandes', turma: '7º B', avatar: '👧', resposta: 'É por causa das correntes de ar frio que vêm do Polo Norte e congelam a Europa.', esperado: { equivoco: 'clima_nuvens', mistura: false } },
    { id: 'r16', aluno: 'Arthur Gomes', turma: '7º B', avatar: '👦', resposta: 'No verão o Sol libera mais calor pra Terra.', esperado: { equivoco: 'sol_mais_forte', mistura: false } },
    { id: 'r17', aluno: 'Manuela Barros', turma: '7º B', avatar: '👩‍🦰', resposta: 'a terra fica tipo um pião torto, ai cada metade pega mais sol numa parte do ano', esperado: { equivoco: 'inclinacao_eixo', mistura: false } },
    { id: 'r18', aluno: 'Heitor Nunes', turma: '7º B', avatar: '🧑', resposta: 'pq a europa ta mais longe do sol kkk', esperado: { equivoco: 'distancia_do_sol', mistura: false } },
    { id: 'r19', aluno: 'Lorena Castro', turma: '7º B', avatar: '👧', resposta: 'Porque lá é em cima e aqui é embaixo.', esperado: { mistura: false } },
    { id: 'r20', aluno: 'Bernardo Teixeira', turma: '7º B', avatar: '👦', resposta: 'Porque a Europa fica perto do Polo Norte, que é gelado o ano todo.', esperado: { equivoco: 'clima_nuvens', mistura: false } },
    { id: 'r21', aluno: 'Cecília Moura', turma: '7º B', avatar: '👩', resposta: 'Por causa da posição da Terra em relação ao Sol, que muda durante o ano.', esperado: { mistura: false } },
    { id: 'r22', aluno: 'Theo Barbosa', turma: '7º B', avatar: '🧒', resposta: 'pq o eixo da terra e enclinado entao o sol bate diferente em cada metade dependendo do mes', esperado: { equivoco: 'inclinacao_eixo', mistura: false } },
  ],
};

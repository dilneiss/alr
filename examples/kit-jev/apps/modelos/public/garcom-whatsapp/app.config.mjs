// Garçom de WhatsApp — anota o pedido de pizza conversando: o Jev entende sabor, tamanho, bebida e observação; o código conta e soma.
// Para adaptar: troque o CARDÁPIO abaixo (sabores, preços por tamanho, bebidas, borda, entrega) e os textos das respostas.
const PIZZAS = {
  calabresa: { nome: 'Calabresa', desc: 'calabresa fatiada, cebola e azeitona', precos: { broto: 32, media: 46, grande: 58 } },
  margherita: { nome: 'Margherita', desc: 'muçarela, tomate e manjericão', precos: { broto: 30, media: 44, grande: 56 } },
  quatro_queijos: { nome: 'Quatro queijos', desc: 'muçarela, provolone, parmesão e gorgonzola', precos: { broto: 36, media: 52, grande: 66 } },
  frango_catupiry: { nome: 'Frango com catupiry', desc: 'frango desfiado com catupiry', precos: { broto: 34, media: 49, grande: 62 } },
  portuguesa: { nome: 'Portuguesa', desc: 'presunto, ovo, cebola, ervilha e azeitona', precos: { broto: 35, media: 50, grande: 64 } },
  chocolate_morango: { nome: 'Chocolate com morango', desc: 'pizza doce de chocolate ao leite com morango', precos: { broto: 33, media: 47, grande: 59 } },
};
const BEBIDAS = {
  refri_lata: { nome: 'Refrigerante lata', desc: 'refrigerante em lata de 350 ml: coca, guaraná, latinha', preco: 7 },
  refri_2l: { nome: 'Refrigerante 2 litros', desc: 'refrigerante de 2 litros: coca 2 L, guaraná 2 L, garrafa grande', preco: 15 },
  suco: { nome: 'Suco natural', desc: 'suco natural de 500 ml: laranja, uva ou maracujá', preco: 12 },
  agua: { nome: 'Água sem gás', desc: 'garrafa de água mineral', preco: 5 },
};
const TAMANHOS = { broto: 'broto', media: 'média', grande: 'grande' };
const OBS = { sem_cebola: 'sem cebola', borda_recheada: 'borda recheada', bem_passada: 'bem passada' };
const BORDA = 10; // borda recheada: + R$ 10 por pizza
const ENTREGA = 6;

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5 };
const CHAVES_PIZZA = ['pizza', 'broto', 'media', 'grande', 'calabres', 'margher', 'marguer', 'queijo', 'frango', 'portugues', 'chocolate', 'doce', 'dessa', 'essa'];
const CHAVES_BEBIDA = ['coca', 'refri', 'guarana', 'suco', 'agua', 'lata', 'latinha', 'garrafa'];
const ENDERECO = /\b(rua|r\.|av\.?|avenida|alameda|travessa|estrada|praça)\s/i;

// a quantidade é do código: o número escrito logo antes da palavra ("2 calabresas", "duas latinhas"); sem número, 1
function quantidade(texto, chaves) {
  const pal = semAcento(texto).replace(/\b\d+([.,]\d+)?\s*(litros?|l|ml)\b/g, ' ').match(/[a-z0-9]+/g) || [];
  for (let i = 0; i < pal.length; i++) {
    if (!chaves.some((c) => pal[i].startsWith(c))) continue;
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      if (/^\d+$/.test(pal[j]) && +pal[j] > 0 && +pal[j] < 20) return +pal[j];
      if (NUMEROS[pal[j]]) return NUMEROS[pal[j]];
    }
  }
  return 1;
}
const valor = (it) => (it.tipo === 'pizza' ? it.qtd * (PIZZAS[it.sabor].precos[it.tamanho] + (it.obs === 'borda_recheada' ? BORDA : 0)) : it.qtd * BEBIDAS[it.bebida].preco);
const linha = (it) => (it.tipo === 'pizza'
  ? `${it.qtd}× ${PIZZAS[it.sabor].nome} ${TAMANHOS[it.tamanho]}${it.obs ? `, ${OBS[it.obs]}` : ''} (${brl(valor(it))})`
  : `${it.qtd}× ${BEBIDAS[it.bebida].nome} (${brl(valor(it))})`);
const soma = (ped) => ped.reduce((t, it) => t + valor(it), 0);
const anotado = (novos, ped) => ({ texto: `Anotado! ✅ ${novos.map(linha).join(' + ')}. Parcial: ${brl(soma(ped))}`, marca: 'soma do código' });
const sabores = () => Object.values(PIZZAS).map((p) => p.nome).join(', ');

export default {
  id: 'garcom-whatsapp',
  titulo: 'Garçom de WhatsApp',
  emoji: '🍕',
  categoria: 'atendimento',
  ordem: 18,
  resumo: 'Anota o pedido de pizza conversando: entende "2 calabresas grandes sem cebola", pergunta o que faltou e fecha a conta certa.',
  descricao: 'A cada mensagem o Jev escolhe, só entre o que existe no cardápio, o sabor, o tamanho, a bebida, a observação e a intenção. A quantidade sai de uma regra simples no código ("2", "duas", "uma") e a conta também: o Jev nunca soma, nem inventa sabor ou preço.',
  marcas: ['imediato', 'lista fechada'],
  motor: 'conversa',
  tema: { acento: '#e63946', acento2: '#2a9d8f' },

  contexto: {
    pizzaria: 'Forno da Vila — pizzaria com entrega em São Paulo',
    cardapio: {
      pizzas: Object.values(PIZZAS).map((p) => `${p.nome} (${p.desc}): broto R$ ${p.precos.broto} · média R$ ${p.precos.media} · grande R$ ${p.precos.grande}`),
      bebidas: Object.values(BEBIDAS).map((b) => `${b.nome} (${b.desc}): R$ ${b.preco}`),
      adicionais: `borda recheada de catupiry ou cheddar: + R$ ${BORDA} por pizza`,
      entrega: `R$ ${ENTREGA}, chega em uns 40 minutos`,
    },
  },

  decisoes: [
    {
      id: 'intencao', tipo: 'choice', papel: 'destaque', titulo: 'Intenção',
      pergunta: 'O que o cliente quer com a fala atual? Quer adicionar pizza ou bebida ao pedido → pedir. Pergunta preço, se tem um sabor ou uma bebida, ou quais são os tamanhos, sem pedir ainda → perguntar_preco. Só manda o endereço de entrega → endereco. Diz que é só isso, pede para fechar ou confirmar → finalizar (mesmo que mande o endereço junto). Saudação ou outro assunto → outro.',
      opcoes: [
        { id: 'pedir', rotulo: 'Pedir', icone: '🍕', desc: 'quer adicionar pizza ou bebida ao pedido ("quero", "manda", "me vê", "fechou, uma de…")' },
        { id: 'perguntar_preco', rotulo: 'Perguntar', icone: '💬', desc: 'pergunta preço, se tem um sabor ou uma bebida ("tem pizza de…?", "tem suco?") ou quais são os tamanhos, sem pedir ainda' },
        { id: 'endereco', rotulo: 'Endereço', icone: '📍', desc: 'informa só o endereço de entrega: rua, número, bairro' },
        { id: 'finalizar', rotulo: 'Fechar pedido', icone: '✅', desc: '"é só isso", "pode fechar", "pode mandar": encerra ou confirma o pedido' },
        { id: 'outro', rotulo: 'Outro', icone: '👋', desc: 'saudação, agradecimento ou outro assunto' },
      ],
    },
    {
      id: 'sabor', tipo: 'choice', titulo: 'Sabor',
      pergunta: 'Qual sabor de pizza do cardápio a fala atual pede ou pergunta? Se ela se refere a uma pizza citada logo antes ("manda essa", "quero uma também", "dessa"), é esse sabor. Se a fala atual não fala de pizza (só bebida, endereço, tamanho ou fechar o pedido) ou pede um sabor que não está no cardápio → nenhum.',
      opcoes: () => [
        ...Object.entries(PIZZAS).map(([id, p]) => ({ id, rotulo: p.nome, icone: '🍕', desc: `${p.nome}: ${p.desc}` })),
        { id: 'nenhum', rotulo: 'Nenhum', icone: '•', desc: 'a fala não pede nem pergunta pizza, ou pede um sabor que não existe no cardápio' },
      ],
    },
    {
      id: 'tamanho', tipo: 'choice', titulo: 'Tamanho',
      pergunta: 'Que tamanho de pizza a fala atual diz? Se a fala atual não diz o tamanho → nao_disse.',
      opcoes: [
        { id: 'broto', rotulo: 'Broto', icone: '◔', desc: 'broto, pequena, 4 fatias' },
        { id: 'media', rotulo: 'Média', icone: '◑', desc: 'média, 6 fatias' },
        { id: 'grande', rotulo: 'Grande', icone: '●', desc: 'grande, família, 8 fatias' },
        { id: 'nao_disse', rotulo: 'Não disse', icone: '•', desc: 'a fala atual não diz o tamanho' },
      ],
    },
    {
      id: 'bebida', tipo: 'choice', titulo: 'Bebida',
      pergunta: 'Qual bebida do cardápio a fala atual pede ou pergunta? Se a fala não fala de bebida → nenhuma.',
      opcoes: () => [
        ...Object.entries(BEBIDAS).map(([id, b]) => ({ id, rotulo: b.nome, icone: '🥤', desc: `${b.nome}: ${b.desc}` })),
        { id: 'nenhuma', rotulo: 'Nenhuma', icone: '•', desc: 'a fala não pede nem pergunta bebida' },
      ],
    },
    {
      id: 'observacao', tipo: 'choice', titulo: 'Observação',
      pergunta: 'A fala atual pede alguma destas observações para a pizza? Se não pede → nenhuma.',
      opcoes: [
        { id: 'sem_cebola', rotulo: 'Sem cebola', icone: '🧅', desc: 'tirar a cebola' },
        { id: 'borda_recheada', rotulo: 'Borda recheada', icone: '🧀', desc: 'borda recheada de catupiry ou cheddar (+ R$ 10)' },
        { id: 'bem_passada', rotulo: 'Bem passada', icone: '🔥', desc: 'bem passada, bem assada, mais crocante' },
        { id: 'nenhuma', rotulo: 'Nenhuma', icone: '•', desc: 'nenhuma observação' },
      ],
    },
  ],

  conversa: {
    skin: 'whatsapp',
    titulo: 'Forno da Vila 🍕',
    subtitulo: 'pizzaria · pedidos pelo WhatsApp',
    avatar: '🍕',
    participantes: {
      cliente: { nome: 'Cliente', avatar: '🙂', lado: 'esq' },
      bot: { nome: 'Forno da Vila', avatar: '🍕', lado: 'dir' },
    },
    analisar: ['cliente'],
    voce: 'cliente',
    placeholder: 'Peça como cliente (ex.: "quero uma margherita média e 2 latinhas")',
    abertura: 'O Jev entende sabor, tamanho, bebida e observação; quem conta e soma é o código, com os preços do cardápio.',
    tituloAnalise: 'O Jev leu cada mensagem do cliente',
    // o pedido é montado pelo CÓDIGO em estado.pedido; o Jev só escolheu as opções do cardápio
    responder(resp, fala, ctx, estado) {
      const ped = (estado.pedido ||= []);
      const ch = (id) => resp[id] && resp[id].choice;
      const intencao = ch('intencao');
      const sabor = PIZZAS[ch('sabor')] ? ch('sabor') : null;
      const tam = TAMANHOS[ch('tamanho')] ? ch('tamanho') : null;
      const beb = BEBIDAS[ch('bebida')] ? ch('bebida') : null;
      const obs = OBS[ch('observacao')] ? ch('observacao') : null;

      // resposta ao "qual o tamanho?" que ficou pendente
      if (estado.pendente && tam && !['perguntar_preco', 'finalizar', 'endereco'].includes(intencao)) {
        const it = { ...estado.pendente, tamanho: tam };
        estado.pendente = null; ped.push(it);
        return anotado([it], ped);
      }
      if (intencao === 'perguntar_preco') {
        const partes = [];
        if (sabor) {
          const p = PIZZAS[sabor]; estado.ultima = { sabor, tamanho: tam };
          partes.push(tam ? `A ${p.nome} ${TAMANHOS[tam]} sai por ${brl(p.precos[tam])}.` : `${p.nome}: broto ${brl(p.precos.broto)} · média ${brl(p.precos.media)} · grande ${brl(p.precos.grande)}.`);
        }
        if (beb) partes.push(`Temos sim: ${BEBIDAS[beb].nome}, ${brl(BEBIDAS[beb].preco)}.`);
        if (!partes.length) return `Esse sabor a gente não tem 😕 Os nossos são: ${sabores()}.`;
        return `${partes.join(' ')} Quer pedir? 🍕`;
      }
      if (intencao === 'pedir') {
        const novos = [];
        if (sabor) {
          // "manda uma dessa": o tamanho vem da pizza que o cliente acabou de perguntar
          const t = tam || (estado.ultima && estado.ultima.sabor === sabor ? estado.ultima.tamanho : null);
          const it = { tipo: 'pizza', sabor, qtd: quantidade(fala.texto, CHAVES_PIZZA), obs };
          if (t) { it.tamanho = t; ped.push(it); novos.push(it); } else estado.pendente = it;
        } else if (obs) {
          const ult = [...ped].reverse().find((x) => x.tipo === 'pizza');
          if (ult) { ult.obs = obs; novos.push(ult); }
        }
        if (beb) { const it = { tipo: 'bebida', bebida: beb, qtd: quantidade(fala.texto, CHAVES_BEBIDA) }; ped.push(it); novos.push(it); }
        const falta = estado.pendente ? `Qual o tamanho da ${PIZZAS[estado.pendente.sabor].nome}: broto, média ou grande?` : '';
        if (!novos.length) return falta || `O que vai ser? Os sabores são: ${sabores()}.`;
        return falta ? [anotado(novos, ped), falta] : anotado(novos, ped);
      }
      if (intencao === 'endereco') {
        estado.endereco = fala.texto;
        return `Endereço anotado 📍 ${ped.length ? 'Posso fechar o pedido?' : 'O que vai ser hoje?'}`;
      }
      if (intencao === 'finalizar') {
        if (!ped.length) return 'O seu pedido ainda está vazio 🙂 O que vai ser hoje?';
        if (ENDERECO.test(fala.texto)) estado.endereco = fala.texto;
        const total = soma(ped) + ENTREGA;
        const conta = { texto: `🧾 ${ped.map(linha).join(' · ')} · entrega (${brl(ENTREGA)})`, marca: 'conta feita pelo código' };
        return estado.endereco
          ? [conta, `Total: ${brl(total)} ✅ Pedido confirmado! Chega em uns 40 minutos 🛵`]
          : [conta, `Total: ${brl(total)}. Só me passa o endereço de entrega 📍`];
      }
      return 'Oi! 🍕 Aqui é a Forno da Vila. Pode pedir por aqui mesmo: sabor, tamanho e bebida.';
    },
  },

  roteiros: [
    {
      titulo: 'Pedido completo',
      falas: [
        { quem: 'cliente', texto: 'boa noite! quero 2 calabresas grandes, sem cebola', esperado: { intencao: 'pedir', sabor: 'calabresa', tamanho: 'grande', bebida: 'nenhuma', observacao: 'sem_cebola' } },
        { quem: 'cliente', texto: 'e uma coca de 2 litros', esperado: { intencao: 'pedir', sabor: 'nenhum', bebida: 'refri_2l', observacao: 'nenhuma' } },
        { quem: 'cliente', texto: 'quanto tá a quatro queijos média?', esperado: { intencao: 'perguntar_preco', sabor: 'quatro_queijos', tamanho: 'media', bebida: 'nenhuma' } },
        { quem: 'cliente', texto: 'manda uma também, com borda recheada', esperado: { intencao: 'pedir', sabor: 'quatro_queijos', tamanho: ['nao_disse', 'media'], observacao: 'borda_recheada' } },
        { quem: 'cliente', texto: 'rua das Acácias, 120, apto 32, Vila Mariana', esperado: { intencao: 'endereco', sabor: 'nenhum', bebida: 'nenhuma' } },
        { quem: 'cliente', texto: 'pode fechar! pago no pix', esperado: { intencao: 'finalizar' } },
      ],
    },
    {
      titulo: 'Dúvida de preço',
      falas: [
        { quem: 'cliente', texto: 'oi! qual o preço da portuguesa?', esperado: { intencao: 'perguntar_preco', sabor: 'portuguesa', tamanho: 'nao_disse' } },
        { quem: 'cliente', texto: 'hmm, então manda uma grande, bem passadinha', esperado: { intencao: 'pedir', sabor: 'portuguesa', tamanho: 'grande', observacao: 'bem_passada' } },
        { quem: 'cliente', texto: 'e uma de frango com catupiry', esperado: { intencao: 'pedir', sabor: 'frango_catupiry', tamanho: 'nao_disse', bebida: 'nenhuma' } },
        { quem: 'cliente', texto: 'média', esperado: { tamanho: 'media' } },
        { quem: 'cliente', texto: 'tem suco natural?', esperado: { intencao: 'perguntar_preco', sabor: 'nenhum', bebida: 'suco' } },
        { quem: 'cliente', texto: 'então 2 sucos de laranja', esperado: { intencao: 'pedir', sabor: 'nenhum', bebida: 'suco' } },
        { quem: 'cliente', texto: 'é só isso, pode mandar pra Av. Brasil, 455, casa 2', esperado: { intencao: 'finalizar' } },
      ],
    },
    {
      titulo: 'Sabor que não existe',
      falas: [
        { quem: 'cliente', texto: 'boa noite, tem pizza de strogonoff?', esperado: { intencao: 'perguntar_preco', sabor: 'nenhum' } },
        { quem: 'cliente', texto: 'e de frango?', esperado: { intencao: 'perguntar_preco', sabor: 'frango_catupiry' } },
        { quem: 'cliente', texto: 'fechou, quero uma de frango broto e uma guaraná lata', esperado: { intencao: 'pedir', sabor: 'frango_catupiry', tamanho: 'broto', bebida: 'refri_lata' } },
        { quem: 'cliente', texto: 'rua Tupi, 88, Centro', esperado: { intencao: 'endereco' } },
        { quem: 'cliente', texto: 'pode fechar', esperado: { intencao: 'finalizar' } },
      ],
    },
  ],
};

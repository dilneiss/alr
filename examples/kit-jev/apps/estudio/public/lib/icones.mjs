// Ícones de traço desenhados para o Estúdio por Voz (grade 24×24, traço arredondado, currentColor).
// Cada ícone: id, rótulo, critério para o Jev e o miolo SVG. O Jev escolhe o ícone do logo entre todos eles.
const r2 = (v) => Math.round(v * 100) / 100;
function estrela(cx, cy, R, r, n = 5, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, rad = i % 2 ? r : R;
    pts.push(`${r2(cx + rad * Math.cos(a))} ${r2(cy + rad * Math.sin(a))}`);
  }
  return `<path d="M${pts.join('L')}z"/>`;
}
function raios(cx, cy, r1, r2_, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    d += `M${r2(cx + r1 * Math.cos(a))} ${r2(cy + r1 * Math.sin(a))}L${r2(cx + r2_ * Math.cos(a))} ${r2(cy + r2_ * Math.sin(a))}`;
  }
  return `<path d="${d}"/>`;
}
function engrenagem(cx, cy, rOut, rIn, dentes) {
  const pts = [];
  const passo = (2 * Math.PI) / dentes;
  for (let i = 0; i < dentes; i++) {
    const a = i * passo;
    const seq = [[a - passo * 0.22, rOut], [a + passo * 0.22, rOut], [a + passo * 0.32, rIn], [a + passo * 0.68, rIn]];
    for (const [ang, rad] of seq) pts.push(`${r2(cx + rad * Math.cos(ang))} ${r2(cy + rad * Math.sin(ang))}`);
  }
  return `<path d="M${pts.join('L')}z"/>`;
}

const LISTA = [
  // ---- comida e bebida
  ['burger', 'Hambúrguer', 'hambúrguer, lanche, hamburgueria',
    '<path d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6H4z"/><path d="M9 7.6h.01M12 6.8h.01M15 7.6h.01"/><path d="M3.6 13.8c1.4 0 1.4-1.2 2.8-1.2s1.4 1.2 2.8 1.2 1.4-1.2 2.8-1.2 1.4 1.2 2.8 1.2 1.4-1.2 2.8-1.2 1.4 1.2 2.8 1.2"/><path d="M4 16.4h16"/><path d="M4.5 18.6h15v.4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/>'],
  ['pizza', 'Pizza', 'fatia de pizza, pizzaria, comida italiana',
    '<path d="M12 21.3 3.4 6.7A17 17 0 0 1 20.6 6.7z"/><path d="M5 9.4a14 14 0 0 1 14 0"/><circle cx="10" cy="11.8" r="1.3"/><circle cx="14.2" cy="13.3" r="1.2"/><circle cx="11.9" cy="16.8" r="1"/>'],
  ['cafe', 'Xícara de café', 'xícara de café quente, cafeteria, padaria',
    '<path d="M4 10h13v4.5a5.5 5.5 0 0 1-5.5 5.5h-2A5.5 5.5 0 0 1 4 14.5z"/><path d="M17 11.5h1.3a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3.5c-.8 1 .8 2 0 3.2M11.5 3.5c-.8 1 .8 2 0 3.2M15 3.5c-.8 1 .8 2 0 3.2"/>'],
  ['cupcake', 'Cupcake', 'cupcake, bolo, doces, confeitaria',
    '<path d="M6.2 11.2a3 3 0 0 1 .5-5.9A4.2 4.2 0 0 1 12 3.2a4.2 4.2 0 0 1 5.3 2.1 3 3 0 0 1 .5 5.9z"/><path d="M5.6 11.2h12.8l-1.5 8.9a1.6 1.6 0 0 1-1.6 1.4H8.7a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M9.7 11.2l.5 10.3M14.3 11.2l-.5 10.3"/>'],
  ['talheres', 'Garfo e faca', 'garfo e faca, restaurante, refeição',
    '<path d="M6.5 3v5a2.5 2.5 0 0 0 5 0V3M9 3v18"/><path d="M17.5 21V3c-2 1.2-3 3.6-3 6.5V13h3"/>'],
  ['cloche', 'Prato servido', 'prato com tampa (cloche), restaurante sofisticado, buffet',
    '<path d="M3 17.5h18M4.5 17.5a7.5 7.5 0 0 1 15 0M12 10V8.3M10.4 8.3h3.2M2.8 20.5h18.4"/>'],
  ['chef', 'Chapéu de chef', 'chapéu de chef, cozinha, gastronomia',
    '<path d="M7 14.3A4 4 0 0 1 6.2 6.6 4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 5.8 2.6 4 4 0 0 1-.8 7.7V17.5H7z"/><path d="M7 17.5h10v2.3a1.2 1.2 0 0 1-1.2 1.2H8.2A1.2 1.2 0 0 1 7 19.8z"/>'],
  ['tigela', 'Tigela', 'tigela de comida saudável, açaí, salada, poke',
    '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20.5h6"/><path d="M7.6 11.5a3.1 3.1 0 0 1 6.2 0"/><path d="M14.3 8.8c.6-2.3 2.5-3.8 5-4-.4 2.5-2.2 4.2-5 4z"/>'],
  ['taca', 'Taça de vinho', 'taça de vinho, jantar romântico, bar sofisticado',
    '<path d="M7.5 3h9l.3 4.3a4.8 4.8 0 0 1-9.6 0z"/><path d="M7.3 6.8h9.4"/><path d="M12 12.1V20M8.5 20.5h7"/>'],
  ['caneca', 'Caneca de chope', 'caneca de chope ou cerveja, bar, cervejaria',
    '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 10.5h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M4.6 8c-.4-2.3 1.5-3.8 3.5-3 .9-1.6 3.4-1.8 4.7-.3 1.7-.6 3.1.8 2.7 3.3"/><path d="M8.5 11.5v6.5M11.5 11.5v6.5"/>'],
  ['sorvete', 'Sorvete', 'casquinha de sorvete, sorveteria, sobremesa',
    '<path d="M7 10.5a5 5 0 0 1 10 0"/><path d="M6.6 10.5 12 21.5l5.4-11z"/><path d="M9.3 13.5l4.5 3.8M14.7 13.5l-4.5 3.8"/>'],
  ['trigo', 'Trigo', 'espiga de trigo, pão artesanal, padaria, natural',
    '<path d="M12 21.5V6"/><path d="M12 9.5c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4zm0 0c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4z"/><path d="M12 14c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4zm0 0c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4z"/><path d="M12 18.5c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4zm0 0c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4z"/><path d="M12 5.5c-1.2-1-1.2-2.8 0-3.8 1.2 1 1.2 2.8 0 3.8z"/>'],
  ['chama', 'Chama', 'chama de fogo, brasa, churrasco, paixão, energia',
    '<path d="M12 21.5c-3.9 0-7-2.9-7-6.8 0-3.4 2.3-5.4 3.6-7.5.4 2 1.6 3 2.9 3.4C11.4 6.9 12.7 4.3 15 2.5c.3 3.6 4 6.2 4 11.3 0 4.3-3.1 7.7-7 7.7z"/><path d="M12 21.5c-1.9 0-3.3-1.4-3.3-3.3 0-2.1 1.6-3.2 2.5-4.9.9 1.8 4.1 2.6 4.1 5.2 0 1.7-1.4 3-3.3 3z"/>'],
  ['folha', 'Folha', 'folha verde, natural, orgânico, saudável, sustentável',
    '<path d="M4.5 19.5C4.5 10 10 4.5 19.5 4.5 19.5 14 14 19.5 4.5 19.5z"/><path d="M4.5 19.5 14.5 9.5"/>'],
  ['muda', 'Broto', 'broto de planta, crescimento, jardinagem, começo',
    '<path d="M12 21v-8.5"/><path d="M12 12.5c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6z"/><path d="M12 10.5c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6z"/><path d="M7 21h10"/>'],
  ['maca', 'Maçã', 'maçã, nutrição, alimentação saudável, escola',
    '<path d="M12 7.6c-1.3-1-3-1.4-4.6-.8C4.9 7.7 4 10.5 4.6 13.5c.7 3.4 2.9 7 5.4 7 1 0 1.4-.6 2-.6s1 .6 2 .6c2.5 0 4.7-3.6 5.4-7 .6-3-.3-5.8-2.8-6.7-1.6-.6-3.3-.2-4.6.8z"/><path d="M12 7.6c0-1.8.7-3.4 2-4.5"/><path d="M14 4.6c1.6-1.2 3.3-1.2 4.3-.3-1 1.3-2.7 1.8-4.3.3z"/>'],
  // ---- beleza e saúde
  ['tesoura', 'Tesoura', 'tesoura, salão de beleza, cabeleireiro, corte',
    '<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.3 8.1 20 17.5M8.3 15.9 20 6.5"/>'],
  ['bigode', 'Bigode', 'bigode, barbearia, estilo masculino',
    '<path d="M12 11.3c-1.5-2.2-4.5-3-6.5-1.2-1.3 1.2-1.7 3.2-3 3.7 2.3 1.9 5.4 1.7 7.3.3.9-.7 1.6-1.6 2.2-2.8.6 1.2 1.3 2.1 2.2 2.8 1.9 1.4 5 1.6 7.3-.3-1.3-.5-1.7-2.5-3-3.7-2-1.8-5-1-6.5 1.2z"/>'],
  ['poste', 'Poste de barbearia', 'poste listrado de barbearia clássica',
    '<rect x="8" y="4.5" width="8" height="15" rx="1.2"/><path d="M7 4.5h10M7 19.5h10M9.5 2.5h5M9.5 21.5h5"/><path d="M8 10.5l8-3M8 14.5l8-3M8 18.5l8-3"/>'],
  ['gota', 'Gota', 'gota, pele, hidratação, skincare, estética, água',
    '<path d="M12 21.5A6.5 6.5 0 0 1 5.5 15C5.5 10.2 12 3 12 3s6.5 7.2 6.5 12a6.5 6.5 0 0 1-6.5 6.5z"/><path d="M8.8 15.3a3.2 3.2 0 0 0 2.4 3"/>'],
  ['brilho', 'Brilhos', 'brilhos, estética, beleza, limpeza, magia',
    '<path d="M11 3.5l1.8 5.2L18 10.5l-5.2 1.8L11 17.5l-1.8-5.2L4 10.5l5.2-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/><path d="M18 3.5v3M16.5 5h3"/>'],
  ['flor', 'Tulipa', 'flor, tulipa, floricultura, delicadeza, feminino',
    '<path d="M7.5 5.5c0 4 1.7 7 4.5 7s4.5-3 4.5-7l-2.3 1.7L12 4.2 9.8 7.2z"/><path d="M12 12.5v9"/><path d="M12 18.5c-2.6 0-4.3-1.5-4.8-3.7 2.6 0 4.3 1.5 4.8 3.7zM12 17c2.6 0 4.3-1.5 4.8-3.7-2.6 0-4.3 1.5-4.8 3.7z"/>'],
  ['lotus', 'Flor de lótus', 'flor de lótus, yoga, meditação, spa, equilíbrio',
    '<path d="M12 19.5c-2.2-2-3.2-4.2-3.2-7S10 7.2 12 5c2 2.2 3.2 4.6 3.2 7.5s-1 5-3.2 7z"/><path d="M12 19.5c-3.8.2-7-2.2-8.5-6.2 2.8-.4 5.4.2 7.3 1.7M12 19.5c3.8.2 7-2.2 8.5-6.2-2.8-.4-5.4.2-7.3 1.7"/><path d="M7 21.5h10"/>'],
  ['dente', 'Dente', 'dente, dentista, odontologia, sorriso',
    '<path d="M7.5 3.5c1.6 0 2.8.8 4.5.8s2.9-.8 4.5-.8c2.5 0 4 2.1 4 4.8 0 2.7-1.1 4.1-1.6 6.9-.5 2.9-.9 6.3-2.6 6.3-1.9 0-1.9-4.5-4.3-4.5s-2.4 4.5-4.3 4.5c-1.7 0-2.1-3.4-2.6-6.3-.5-2.8-1.6-4.2-1.6-6.9 0-2.7 1.5-4.8 4-4.8z"/>'],
  ['coracao', 'Coração', 'coração, amor, cuidado, saúde, carinho',
    '<path d="M12 20.3s-8-4.7-8-10.5A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.4c0 5.8-8 10.5-8 10.5z"/>'],
  ['pulso', 'Batimento', 'linha de batimento cardíaco, saúde, medicina, fisioterapia',
    '<path d="M2.5 12.5h4.3l2.2-5 3.5 11 2.5-8 1.6 2h4.9"/>'],
  ['estetoscopio', 'Estetoscópio', 'estetoscópio, médico, clínica, consulta',
    '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M5 3.5h2M13 3.5h2"/><path d="M10 12.5v2.5a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>'],
  ['cruz', 'Cruz da saúde', 'cruz da saúde, farmácia, clínica, primeiros socorros',
    '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>'],
  ['mente', 'Mente', 'cabeça com coração, psicologia, terapia, saúde mental',
    '<path d="M14.5 21.5v-3h2.2a1.8 1.8 0 0 0 1.8-1.8V14l1.8-.7-1.8-3.3C18.5 5.8 15.5 3 11.5 3 7.4 3 4.5 6.2 4.5 10.2c0 2.3 1 4.3 2.7 5.6v5.7"/><path d="M11.3 12.8s-2.7-1.6-2.7-3.5a1.4 1.4 0 0 1 2.7-.8 1.4 1.4 0 0 1 2.7.8c0 1.9-2.7 3.5-2.7 3.5z"/>'],
  ['maos', 'Mão que cuida', 'mão segurando um coração, cuidado, acolhimento, terapia',
    '<path d="M12 10.8s-3-1.8-3-4a1.8 1.8 0 0 1 3-1.3 1.8 1.8 0 0 1 3 1.3c0 2.2-3 4-3 4z"/><path d="M3 15.5h3l3.2 3h7.3l4.2-3.8a1.5 1.5 0 0 0-2-2.2L15.5 15H11"/><path d="M6 15.5l2.8-2.3h4.4a1.4 1.4 0 0 1 0 2.8H11"/>'],
  ['halter', 'Halter', 'halter, academia, musculação, treino',
    '<rect x="5.5" y="6.5" width="3" height="11" rx="1"/><rect x="15.5" y="6.5" width="3" height="11" rx="1"/><path d="M8.5 12h7M3 9.5v5M21 9.5v5"/>'],
  // ---- pets
  ['pata', 'Pata', 'patinha de cachorro ou gato, pet shop, veterinária',
    '<ellipse cx="6.3" cy="10.3" rx="1.8" ry="2.3" transform="rotate(-22 6.3 10.3)"/><ellipse cx="9.8" cy="6.2" rx="1.8" ry="2.4"/><ellipse cx="14.2" cy="6.2" rx="1.8" ry="2.4"/><ellipse cx="17.7" cy="10.3" rx="1.8" ry="2.3" transform="rotate(22 17.7 10.3)"/><path d="M12 12c-2.4 0-5 3.2-5 5.6 0 1.6 1.2 2.4 2.6 2.4 1 0 1.5-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.8 2.6-2.4 0-2.4-2.6-5.6-5-5.6z"/>'],
  ['osso', 'Osso', 'ossinho de cachorro, petiscos, pet',
    '<path transform="rotate(-45 12 12)" d="M8.74 10.5h6.52a2.3 2.3 0 1 1 3.38 1.5 2.3 2.3 0 1 1-3.38 1.5H8.74a2.3 2.3 0 1 1-3.38-1.5 2.3 2.3 0 1 1 3.38-1.5z"/>'],
  ['gato', 'Gato', 'carinha de gato, pets, fofura',
    '<path d="M4.5 11.5 4 3.8l4.8 3.3a8.7 8.7 0 0 1 6.4 0L20 3.8l-.5 7.7c.6 1.2 1 2.5 1 3.9 0 3.6-3.8 6.1-8.5 6.1s-8.5-2.5-8.5-6.1c0-1.4.4-2.7 1-3.9z"/><path d="M9 13.5h.01M15 13.5h.01"/><path d="M11.2 16.2h1.6l-.8.9z"/>'],
  // ---- negócios e serviços
  ['grafico', 'Gráfico em alta', 'gráfico subindo, crescimento, resultados, consultoria, finanças',
    '<path d="M4 20.5h16"/><path d="M6.5 17.5v-4M11 17.5v-7M15.5 17.5v-5"/><path d="M4.5 10 10 5l3.5 2.5L19.5 3"/><path d="M15.5 3h4v4"/>'],
  ['maleta', 'Maleta', 'maleta executiva, negócios, empresas, carreira',
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18M10.5 12.5v1.8h3v-1.8"/>'],
  ['lampada', 'Lâmpada', 'lâmpada acesa, ideias, criatividade, inovação',
    '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.3v1.4h5v-1.4c0-.9.4-1.7 1.1-2.3A6 6 0 0 0 12 3z"/>'],
  ['balanca', 'Balança da justiça', 'balança da justiça, advocacia, direito, equilíbrio',
    '<path d="M12 3.5v17M7.5 20.5h9M4.5 6.5h15"/><path d="M4.5 6.5 2.2 12.5h4.6zM19.5 6.5l-2.3 6h4.6z"/><path d="M2.2 12.5a2.3 2.3 0 0 0 4.6 0M17.2 12.5a2.3 2.3 0 0 0 4.6 0"/>'],
  ['calculadora', 'Calculadora', 'calculadora, contabilidade, finanças, impostos',
    '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="4" rx=".6"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01M8.5 19h.01M12 19h.01M15.5 19h.01"/>'],
  ['escudo', 'Escudo', 'escudo com check, segurança, proteção, confiança, seguros',
    '<path d="M12 21.5s7.5-3.5 7.5-9.5V5.5L12 2.5 4.5 5.5V12c0 6 7.5 9.5 7.5 9.5z"/><path d="M8.7 11.8l2.3 2.3 4.4-4.6"/>'],
  ['engrenagem', 'Engrenagem', 'engrenagem, tecnologia, processos, engenharia, mecânica', null, () => engrenagem(12, 12, 9.2, 7, 8) + '<circle cx="12" cy="12" r="3"/>'],
  ['codigo', 'Código', 'código </>, software, programação, tecnologia',
    '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>'],
  ['foguete', 'Foguete', 'foguete, startup, crescimento rápido, lançamento',
    '<path d="M12 2.5c3 2 4.5 5.5 4.5 9.5v4.5h-9V12c0-4 1.5-7.5 4.5-9.5z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M7.5 13l-3 3v3.5l3-1.5M16.5 13l3 3v3.5l-3-1.5"/><path d="M10 19c0 1.2.8 2 2 2.5.9-.4 2-1.3 2-2.5"/>'],
  ['megafone', 'Megafone', 'megafone, marketing, divulgação, anúncios',
    '<path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2L16 20V4L7 8.5H5A1.5 1.5 0 0 0 3.5 10z"/><path d="M7 15.5l1.5 5h2.5l-1-4M19 9.5a3.5 3.5 0 0 1 0 5"/>'],
  ['alvo', 'Alvo', 'alvo com flecha, metas, foco, estratégia',
    '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.5"/><circle cx="11" cy="13" r="1"/><path d="M11 13l8.5-8.5M16.5 4.5h3v3"/>'],
  ['conversa', 'Conversa', 'balões de conversa, idiomas, comunicação, atendimento',
    '<path d="M14 9.5V5.5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2V11a2 2 0 0 0 2 2h1v3l3-3h1"/><path d="M10 12.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-1v3l-3-3h-3a2 2 0 0 1-2-2z"/>'],
  ['livro', 'Livro aberto', 'livro aberto, educação, cursos, leitura',
    '<path d="M12 6.5c-1.8-1.6-4.4-2.3-8.5-2v14c4.1-.3 6.7.4 8.5 2 1.8-1.6 4.4-2.3 8.5-2v-14c-4.1-.3-6.7.4-8.5 2z"/><path d="M12 6.5v14"/>'],
  ['capelo', 'Capelo', 'capelo de formatura, educação, cursos, formação',
    '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11"/><path d="M21.5 9v5"/>'],
  ['lapis', 'Lápis', 'lápis, escola, design, criação',
    '<path d="M15.5 4.5l4 4L8.5 19.5l-5 1 1-5z"/><path d="M13.5 6.5l4 4"/>'],
  ['globo', 'Globo', 'globo terrestre, idiomas, viagens, internacional',
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>'],
  ['estrela', 'Estrela', 'estrela, destaque, qualidade, infantil, sucesso', null, () => estrela(12, 12.6, 9.6, 4.1)],
  // ---- casa, obras, imóveis
  ['casa', 'Casa', 'casinha, imobiliária, lar, reformas',
    '<path d="M3.5 11 12 3.5l8.5 7.5"/><path d="M5.5 9.5v11h13v-11"/><path d="M10 20.5V15h4v5.5"/>'],
  ['chave', 'Chave', 'chave, imóveis, aluguel, segurança',
    '<circle cx="7.5" cy="15.5" r="4"/><path d="M10.3 12.7 20 3M16.5 6.5 19 9M14 9l2 2"/>'],
  ['predio', 'Prédio', 'prédio, empresa, imóveis comerciais, construtora',
    '<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21M14 10h4.5a1.5 1.5 0 0 1 1.5 1.5V21M2.5 21h19"/><path d="M7.5 8h3M7.5 11.5h3M7.5 15h3M16.5 14h.01M16.5 17.5h.01"/>'],
  ['compasso', 'Compasso', 'compasso de desenho, arquitetura, projeto, design',
    '<circle cx="12" cy="4.5" r="1.8"/><path d="M11.2 6.2 6 20.5M12.8 6.2 18 20.5M8.3 14.2h7.4"/>'],
  ['martelo', 'Martelo', 'martelo, obras, reformas, marcenaria',
    '<path d="M11 6l3-3 5 5-3 3z"/><path d="M13.5 8.5 4.5 17.5a1.4 1.4 0 0 0 2 2l9-9"/>'],
  ['rolo', 'Rolo de pintura', 'rolo de pintura, pintura, reformas, decoração',
    '<rect x="4" y="3.5" width="14" height="5" rx="1.5"/><path d="M18 6h2v5.5h-8v3"/><rect x="10.5" y="14.5" width="3" height="7" rx="1"/>'],
  ['ferramenta', 'Chave inglesa', 'chave inglesa, oficina, conserto, manutenção',
    '<path d="M14.7 6.3a4.2 4.2 0 0 1 5.4-2.2l-3 3 .4 2.4 2.4.4 3-3a4.2 4.2 0 0 1-5.6 5.6L7.6 20.2a2 2 0 0 1-2.8-2.8z"/>'],
  ['carro', 'Carro', 'carro, oficina mecânica, auto center, transporte',
    '<path d="M5.3 16.5H4a1 1 0 0 1-1-1v-2.7a1.5 1.5 0 0 1 1.1-1.4l2.3-.7 2.3-3.3a2 2 0 0 1 1.6-.9h4.6a2 2 0 0 1 1.6.8l2.6 3.4 2.1.6a1.5 1.5 0 0 1 1.1 1.4v2.8a1 1 0 0 1-1 1h-1.3M9.7 16.5h4.6"/><path d="M6.8 10.4h10.9M12 6.5v3.9"/><circle cx="7.5" cy="16.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>'],
  // ---- varejo, eventos, lazer
  ['cabide', 'Cabide', 'cabide, moda, loja de roupas, closet',
    '<path d="M12 7.8V6.4a2 2 0 1 0-2-2"/><path d="M12 7.8 3.2 14.3A1.5 1.5 0 0 0 4.1 17h15.8a1.5 1.5 0 0 0 .9-2.7z"/>'],
  ['camiseta', 'Camiseta', 'camiseta, moda casual, uniformes',
    '<path d="M8.5 3.5 3.5 6.5l2 4 2-1v11h9v-11l2 1 2-4-5-3c-.5 1.5-2 2.5-3.5 2.5S9 5 8.5 3.5z"/>'],
  ['sacola', 'Sacola de compras', 'sacola de compras, loja, varejo, compras online',
    '<path d="M5 7.5h14l-1 13.5H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>'],
  ['loja', 'Fachada de loja', 'fachada de loja com toldo, comércio de bairro',
    '<path d="M3.5 9.5 5 4h14l1.5 5.5"/><path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 12v8.5h14V12M10 20.5v-5h4v5"/>'],
  ['etiqueta', 'Etiqueta de preço', 'etiqueta de preço, promoções, ofertas',
    '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.5"/>'],
  ['diamante', 'Diamante', 'diamante, joias, luxo, exclusividade',
    '<path d="M6.5 4h11L21 9l-9 11.5L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11.5L16 9l-1.5-5"/>'],
  ['coroa', 'Coroa', 'coroa, realeza, premium, o melhor, barbearia',
    '<path d="M3.5 8l4 4 4.5-6.5 4.5 6.5 4-4-1.5 10.5h-14z"/><path d="M5.5 21h13"/>'],
  ['camera', 'Câmera', 'câmera fotográfica, fotografia, vídeo, ensaios',
    '<path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.5" r="3.8"/>'],
  ['aliancas', 'Alianças', 'alianças, casamento, noivado, eventos românticos',
    '<circle cx="9" cy="14.5" r="5.5"/><circle cx="15" cy="14.5" r="5.5"/><path d="M13.2 5.5l1.8-2.2 1.8 2.2-1.8 2z"/>'],
  ['balao', 'Balão de festa', 'balão de festa, aniversário, festas infantis, eventos',
    '<path d="M12 15.5c-3.3 0-6-3.1-6-6.8S8.7 2.5 12 2.5s6 2.8 6 6.2-2.7 6.8-6 6.8z"/><path d="M11 17.5h2l-1-2z"/><path d="M12 17.5c0 1.5-1.5 2-1.5 4"/>'],
  ['presente', 'Presente', 'caixa de presente, presentes, brindes, datas especiais',
    '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8c-1.2-2.8-4.5-4-5.5-2.3C5.6 7.3 8.5 8 12 8zm0 0c1.2-2.8 4.5-4 5.5-2.3.9 1.6-2 2.3-5.5 2.3z"/>'],
  ['cama', 'Cama', 'cama, pousada, hotel, hospedagem, descanso',
    '<path d="M3 19.5V6M3 15h18v4.5M21 15v-3a3 3 0 0 0-3-3h-7.5v6"/><circle cx="7" cy="11.2" r="2"/>'],
  ['sol', 'Sol', 'sol, verão, praia, energia, alegria', null, () => '<circle cx="12" cy="12" r="4.2"/>' + raios(12, 12, 6.6, 9.4, 8)],
  ['onda', 'Onda', 'ondas do mar, praia, surf, pousada litorânea',
    '<path d="M2.5 8.5c2 0 2-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2M2.5 13.5c2 0 2-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2M2.5 18.5c2 0 2-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2"/>'],
  ['montanha', 'Montanha', 'montanhas, natureza, turismo, aventura, trilhas',
    '<path d="M2.5 20 9 8.5l4 6.5 2.5-3.5 6 8.5z"/><path d="M7.3 11.8l1.7 1.2 1.6-1.3"/><circle cx="17.5" cy="6" r="2"/>'],
  ['aviao', 'Avião de papel', 'avião de papel, viagens, envio rápido, marketing',
    '<path d="M21.5 3.5 2.5 10.5l7 3 3 7z"/><path d="M9.5 13.5l12-10"/>'],
  ['guitarra', 'Guitarra', 'guitarra, rock, música ao vivo, bar, atitude',
    '<path d="M13.4 10.6 19.8 4.2"/><path d="M18.4 2.8l2.8 2.8-1.4 1.4-2.8-2.8z"/><path d="M11.2 9.3c-1.3-.5-2.9-.2-3.9.8-.7.7-.8 1.8-1.5 2.4-.8.7-2.1.6-2.9 1.4-1.5 1.5-.9 4.3 1.2 6.4s4.9 2.7 6.4 1.2c.8-.8.7-2.1 1.4-2.9.6-.7 1.7-.8 2.4-1.5 1-1 1.3-2.6.8-3.9"/><path d="M8.3 15.7l1.4 1.4"/>'],
  ['nota', 'Nota musical', 'notas musicais, música, aulas de música, shows',
    '<path d="M9 18.5V5.5l11-2v13"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/>'],
  ['raio', 'Raio', 'raio, energia, rapidez, eletricidade, atitude',
    '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>'],
  ['relogio', 'Relógio', 'relógio, pontualidade, rapidez, agendamento',
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'],
  ['moto', 'Moto de entrega', 'moto de entrega, delivery, motoboy',
    '<circle cx="6" cy="17" r="2.8"/><circle cx="18" cy="17" r="2.8"/><path d="M8.8 17h6.5l2.2-6.2h-3.7M17.5 10.8 16 6.5h-2.5"/><path d="M3.2 12.5h6.3l1.8 2.5"/><rect x="3" y="7" width="5.5" height="5.5" rx=".9"/>'],
].map(([id, rotulo, jev, svg, fn]) => ({ id, rotulo, jev: `${rotulo}: ${jev}`, svg: svg || fn() }));

export const ICONES = LISTA;
export const ICONE = Object.fromEntries(LISTA.map((i) => [i.id, i]));

// Ícones de interface (não são escolhas do Jev): usados em botões/CTAs das peças.
export const UI = {
  whats: '<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9.2 8.8c.2-.6.8-.8 1.1-.3l.8 1.6c.2.4 0 .7-.3 1-.3.3-.3.6-.1.9.6 1 1.4 1.8 2.4 2.4.3.2.6.2.9-.1.3-.3.6-.5 1-.3l1.6.8c.5.3.3.9-.3 1.1-1.1.5-2.6.2-4.3-1.1S8.7 10 9.2 8.8z"/>',
  moto: ICONE_SVG('moto'), sacola: ICONE_SVG('sacola'),
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  doc: '<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  estrela: estrela(12, 12.6, 9.6, 4.1),
  telefone: '<path d="M5.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3.5 5.5a2 2 0 0 1 2-2z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  coracao: '<path d="M12 20.3s-8-4.7-8-10.5A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.4c0 5.8-8 10.5-8 10.5z"/>',
  comentario: '<path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.2-4.1A8.5 8.5 0 1 1 20.5 12z"/>',
  enviar: '<path d="M21.5 3.5 2.5 10.5l7 3 3 7z"/><path d="M9.5 13.5l12-10"/>',
  salvar: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
};
function ICONE_SVG(id) { const i = LISTA.find((x) => x.id === id); return i ? i.svg : ''; }

export function svgIcone(miolo, { size = 24, stroke = 'currentColor', sw = 1.8, fill = 'none', cls = '', extra = '' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${miolo}</svg>`;
}

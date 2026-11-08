// 100 histórias de domínio público (Grimm, Andersen, Perrault, Esopo, Mil e Uma Noites)
// mais o folclore brasileiro. Cada história traz o seu elenco, os animais, os acessórios,
// as roupas e o cenário — tudo o que o Jev precisa para reconhecer alguém citado na fala.
//
// Formato do elenco: [id, nome, arquétipo, cor, ...apelidos]
//   arquétipo 'animal:<emoji>' usa a figurinha recortada (padrão já usado por cachorro/gato)
//   qualquer outro arquétipo usa um corpo desenhado de bonecos.js + kit de identidade (cor/roupa)
const A = {
  crianca_f: { altura: 165, olha: 'frente' },
  crianca_m: { altura: 165, olha: 'frente' },
  princesa: { altura: 172, olha: 'frente' },
  principe: { altura: 176, olha: 'frente' },
  rainha: { altura: 178, olha: 'frente' },
  rei: { altura: 182, olha: 'frente' },
  velho: { altura: 168, olha: 'frente' },
  idosa: { altura: 164, olha: 'frente' },
  bruxa: { altura: 184, olha: 'frente' },
  fada: { altura: 150, olha: 'frente' },
  campones: { altura: 172, olha: 'frente' },
  cacador: { altura: 180, olha: 'frente' },
  guerreiro: { altura: 182, olha: 'frente' },
  mago: { altura: 186, olha: 'frente' },
  gigante: { altura: 300, olha: 'frente' },
  anao: { altura: 118, olha: 'frente' },
  sereia: { altura: 176, olha: 'frente' },
  criatura: { altura: 170, olha: 'frente' },
};

// [id, título, origem, cenário principal, elenco, objetos]
// no elenco: 'animal:🐺' = figurinha; outro nome = corpo desenhado com aquela cor
const HISTORIAS = [
  ['chapeuzinho', 'Chapeuzinho Vermelho', 'Grimm', 'floresta', [
    ['chapeuzinho', 'Chapeuzinho', 'crianca_f', '#c0392b', 'capuz vermelho', 'menina do capuz', 'chapeuzinho'],
    ['lobo_mau', 'lobo mau', 'animal:🐺', '', 'lobo', 'lobos', 'lobo feroz'],
    ['vovo_chapeuzinho', 'vovó', 'idosa', '#8e44ad', 'vovozinha', 'avó doente'],
    ['cacador_chapeuzinho', 'caçador', 'cacador', '#7f8c8d', 'lenhador', 'caçador da floresta'],
  ], ['cesta de doces', 'capuz vermelho']],
  ['tres_porquinhos', 'Os Três Porquinhos', 'tradição inglesa', 'campo', [
    ['porquinho_pratico', 'Porquinho Prático', 'animal:🐷', '', 'porquinho da casa de tijolo', 'terceiro porquinho'],
    ['porquinho_medio', 'Porquinho do Meio', 'animal:🐖', '', 'porquinho da casa de madeira', 'segundo porquinho'],
    ['porquinho_brincalhao', 'Porquinho Brincalhão', 'animal:🐽', '', 'porquinho da casa de palha', 'primeiro porquinho'],
    ['lobo_dos_porquinhos', 'lobo', 'animal:🐺', '', 'lobo mau', 'lobo'],
  ], ['casa de palha', 'casa de madeira', 'casa de tijolo', 'caldeirão']],
  ['rapunzel', 'Rapunzel', 'Grimm', 'castelo', [
    ['rapunzel', 'Rapunzel', 'princesa', '#f1c40f', 'tranças longas', 'moça da torre'],
    ['bruxa_rapunzel', 'feiticeira', 'bruxa', '#6c3483', 'bruxa da torre', 'mãe adotiva'],
    ['principe_rapunzel', 'príncipe', 'principe', '#2980b9', 'príncipe da torre'],
  ], ['torre alta', 'trança', 'alface']],
  ['cinderela', 'Cinderela', 'Perrault', 'castelo', [
    ['cinderela', 'Cinderela', 'princesa', '#8ecae6', 'gata borralheira', 'moça do sapatinho'],
    ['madrasta', 'madrasta', 'rainha', '#4b2e2e', 'madrasta má'],
    ['fada_madrinha', 'fada madrinha', 'fada', '#f7b801', 'madrinha mágica'],
    ['principe_cinderela', 'príncipe', 'principe', '#1d4e89', 'príncipe do baile'],
    ['irmã_feia_1', 'irmã feia', 'crianca_f', '#a0522d', 'meia-irmã'],
  ], ['sapatinho de cristal', 'abóbora', 'carruagem', 'vestido de baile']],
  ['branca_de_neve', 'Branca de Neve', 'Grimm', 'floresta', [
    ['branca_de_neve', 'Branca de Neve', 'princesa', '#f5f5f5', 'vestido azul e amarelo', 'princesa da maçã'],
    ['rainha_ma', 'rainha má', 'rainha', '#4a0e4e', 'madrasta invejosa'],
    ['cacador_branca', 'caçador', 'cacador', '#5d4037', 'caçador da floresta'],
    ['anao_1', 'anão', 'anao', '#e67e22', 'anões da casa'],
    ['principe_branca', 'príncipe', 'principe', '#2c3e50', 'príncipe do caixão'],
  ], ['maçã envenenada', 'espelho mágico', 'caixão de cristal']],
  ['bela_adormecida', 'A Bela Adormecida', 'Perrault', 'castelo', [
    ['bela_adormecida', 'Bela Adormecida', 'princesa', '#ffb4a2', 'princesa do sono', 'aurora'],
    ['bruxa_ma', 'fada má', 'bruxa', '#5b2c6f', 'bruxa do fuso'],
    ['principe_bela', 'príncipe', 'principe', '#3d5a80', 'príncipe do beijo'],
    ['rei_bela', 'rei', 'rei', '#b7791f', 'pai da princesa'],
  ], ['roca e fuso', 'berço dourado', 'roseira']],
  ['joao_e_maria', 'João e Maria', 'Grimm', 'floresta', [
    ['joao', 'João', 'crianca_m', '#3b82f6', 'menino da floresta'],
    ['maria', 'Maria', 'crianca_f', '#ec4899', 'menina da floresta'],
    ['bruxa_do_pao', 'bruxa do pão de gengibre', 'bruxa', '#b45309', 'bruxa da casa de doces'],
    ['pai_lenhador', 'pai lenhador', 'campones', '#6b7280', 'lenhador'],
  ], ['casa de doces', 'forno', 'gaiola']],
  ['patinho_feio', 'O Patinho Feio', 'Andersen', 'rio_cachoeira', [
    ['patinho_feio', 'patinho feio', 'animal:🐤', '', 'cisne', 'filhote'],
    ['pata_mae', 'pata', 'animal:🦆', '', 'mãe pata'],
    ['cisne', 'cisne', 'animal:🦢', '', 'cisnes'],
  ], ['lago', 'ovos']],
  ['bela_e_fera', 'A Bela e a Fera', 'le Prince de Beaumont', 'castelo', [
    ['bela', 'Bela', 'princesa', '#f4d35e', 'moça da rosa'],
    ['fera', 'Fera', 'criatura', '#7b2d26', 'monstro do castelo'],
    ['pai_bela', 'pai de Bela', 'velho', '#8d99ae', 'mercador'],
    ['roseira_encantada', 'roseira', 'animal:🌹', '', 'rosa mágica'],
  ], ['rosa encantada', 'espelho', 'castelo da fera']],
  ['ali_baba', 'Ali Babá e os 40 Ladrões', 'Mil e Uma Noites', 'deserto', [
    ['ali_baba', 'Ali Babá', 'campones', '#c08457', 'lenhador árabe'],
    ['chefe_ladroes', 'chefe dos ladrões', 'guerreiro', '#1f2937', 'ladrão'],
    ['morgiana', 'Morgiana', 'crianca_f', '#d97706', 'escrava esperta'],
  ], ['caverna do tesouro', 'saco de moedas', 'jarro de óleo']],
  ['aladim', 'Aladim e a Lâmpada Maravilhosa', 'Mil e Uma Noites', 'deserto', [
    ['aladim', 'Aladim', 'principe', '#8e44ad', 'ladrão de rua'],
    ['genio', 'gênio', 'criatura', '#2563eb', 'gênio da lâmpada'],
    ['jasmine', 'princesa Jasmine', 'princesa', '#16a085', 'princesa do sultão'],
    ['sultao', 'sultão', 'rei', '#b7791f', 'pai da princesa'],
  ], ['lâmpada mágica', 'tapete voador', 'anéis']],
  ['simbad', 'Simbad, o Marujo', 'Mil e Uma Noites', 'praia', [
    ['simbad', 'Simbad', 'pirata', '#1d3557', 'marujo', 'navegante'],
    ['roc', 'pássaro roc', 'animal:🦅', '', 'ave gigante'],
    ['sereia_simbad', 'sereia', 'sereia', '#2a9d8f', 'sereias do mar'],
  ], ['navio', 'baú de tesouro', 'ilha']],
  ['saci', 'O Saci-Pererê', 'folclore brasileiro', 'floresta', [
    ['saci', 'Saci', 'crianca_m', '#7c2d12', 'gorro vermelho', 'saci pererê', 'redemoinho'],
    ['curupira', 'Curupira', 'crianca_m', '#166534', 'pés virados', 'guardião da mata'],
  ], ['cachimbo', 'redemoinho', 'gorro vermelho']],
  ['curupira', 'O Curupira', 'folclore brasileiro', 'floresta', [
    ['curupira_floresta', 'Curupira', 'crianca_m', '#15803d', 'pés virados', 'protetor dos animais'],
    ['cacador_curupira', 'caçador', 'cacador', '#78716c', 'caçador invasor'],
  ], ['pegadas viradas', 'arco e flecha']],
  ['iara', 'A Iara', 'folclore brasileiro', 'rio_cachoeira', [
    ['iara', 'Iara', 'sereia', '#0e7490', 'sereia do rio', 'mãe d’água'],
    ['pescador_iara', 'pescador', 'campones', '#a16207', 'pescador'],
  ], ['espelho de ouro', 'cabelo verde']],
  ['boitata', 'O Boitatá', 'folclore brasileiro', 'campo', [
    ['boitata', 'Boitatá', 'animal:🐍', '', 'cobra de fogo', 'fogo que corre'],
    ['campones_boitata', 'camponês', 'campones', '#92400e'],
  ], ['fogo', 'campo queimado']],
  ['mula_sem_cabeca', 'A Mula Sem Cabeça', 'folclore brasileiro', 'campo', [
    ['mula', 'mula sem cabeça', 'animal:🐴', '', 'mula de fogo'],
    ['padre', 'padre', 'velho', '#1f2937'],
  ], ['rédea de fogo', 'capela']],
  ['negrinho_do_pasto', 'O Negrinho do Pastoreio', 'folclore brasileiro', 'fazenda', [
    ['negrinho', 'negrinho do pastoreio', 'crianca_m', '#3f2310', 'menino pastor'],
    ['estancieiro', 'estancieiro', 'campones', '#7f1d1d', 'patrão cruel'],
  ], ['cavalos', 'vela', 'pastagem']],
  ['boto', 'O Boto Cor-de-Rosa', 'folclore brasileiro', 'rio_cachoeira', [
    ['boto', 'boto cor-de-rosa', 'animal:🐬', '', 'golfinho do rio'],
    ['moça_ribeirinha', 'moça ribeirinha', 'crianca_f', '#f472b6'],
  ], ['chapéu branco', 'festa na beira do rio']],
  ['lobisomem', 'O Lobisomem', 'folclore ibérico e brasileiro', 'campo', [
    ['lobisomem', 'lobisomem', 'animal:🐺', '', 'homem que vira lobo'],
    ['compadre', 'compadre', 'campones', '#57534e'],
  ], ['lua cheia', 'encruzilhada']],
  ['cuca', 'A Cuca', 'folclore brasileiro', 'caverna', [
    ['cuca', 'Cuca', 'bruxa', '#166534', 'jacaré', 'velha do saco'],
    ['menino_cuca', 'menino', 'crianca_m', '#3b82f6'],
  ], ['caldeirão', 'saco']],
  ['joao_bobo', 'João Bobo', 'folclore brasileiro', 'campo', [
    ['joao_bobo', 'João Bobo', 'crianca_m', '#a3a3a3', 'menino de cera'],
    ['valentao', 'valentão', 'campones', '#7f1d1d'],
  ], ['boneco de cera', 'fogueira']],
  ['pe_de_ana', 'A Pisadeira', 'folclore brasileiro', 'casa_quarto', [
    ['pisadeira', 'pisadeira', 'bruxa', '#4c1d95', 'velha que pisa no peito'],
    ['dorminhoco', 'dorminhoco', 'crianca_m', '#334155'],
  ], ['cama', 'telhado']],
  ['mula_do_padre', 'O Padre e a Mula', 'folclore brasileiro', 'campo', [
    ['vigario', 'vigário', 'velho', '#1e293b'],
    ['mula_padre', 'mula', 'animal:🐴', ''],
  ], ['mula', 'igreja']],
  ['a_cobra_grande', 'A Cobra Grande', 'folclore amazônico', 'fundo_do_mar', [
    ['cobra_grande', 'cobra grande', 'animal:🐍', '', 'boiúna'],
    ['pescador_cobra', 'pescador', 'campones', '#78350f'],
  ], ['rio', 'canoa']],
  ['vitória_régia', 'A Vitória-Régia', 'folclore amazônico', 'rio_cachoeira', [
    ['naca', 'Naïá', 'crianca_f', '#be185d', 'moça da lua'],
    ['lua', 'lua', 'criatura', '#f5f5dc', 'deusa da lua'],
  ], ['vitória-régia', 'flor na água']],
  ['gato_de_botas', 'O Gato de Botas', 'Perrault', 'cidade', [
    ['gato_botas', 'gato de botas', 'animal:🐱', '', 'gato falante', 'mestre gato'],
    ['moleiro', 'moleiro', 'campones', '#a16207', 'filho do moleiro'],
    ['rei_gato', 'rei', 'rei', '#b91c1c', 'rei do castelo'],
  ], ['botas', 'chapéu de plumas', 'moinho']],
  ['pequeno_polegar', 'O Pequeno Polegar', 'Perrault', 'floresta', [
    ['polegar', 'Pequeno Polegar', 'anao', '#2563eb', 'menino pequeno'],
    ['ogro', 'ogro', 'gigante', '#7c2d12', 'gigante'],
    ['pai_polegar', 'pai', 'campones', '#525252'],
  ], ['botas de sete léguas', 'pedrinhas']],
  ['joao_e_o_pé_de_feijão', 'João e o Pé de Feijão', 'tradição inglesa', 'campo', [
    ['joao_feijao', 'João', 'crianca_m', '#16a34a', 'menino do feijão'],
    ['gigante_feijao', 'gigante', 'gigante', '#78350f', 'gigante do castelo'],
    ['vaca_leiteira', 'vaca', 'animal:🐄', '', 'vaquinha'],
  ], ['pé de feijão', 'galinha dos ovos de ouro', 'harpa mágica']],
  ['bela_e_ferinha', 'Branca de Neve e Rosa Vermelha', 'Grimm', 'floresta', [
    ['branca_rosa', 'Branca', 'crianca_f', '#f8fafc', 'menina clara'],
    ['rosa_vermelha', 'Rosa', 'crianca_f', '#dc2626', 'menina morena'],
    ['urso_encantado', 'urso', 'animal:🐻', '', 'urso príncipe'],
    ['anao_ranzinza', 'anão', 'anao', '#78716c'],
  ], ['rosa', 'caverna']],
  ['a_bela_e_a_fera_2', 'O Rei Sapo', 'Grimm', 'jardim', [
    ['rei_sapo', 'sapo', 'sapo', '#15803d', 'príncipe sapo'],
    ['princesa_sapo', 'princesa', 'princesa', '#f9a8d4', 'princesa do poço'],
    ['rei_sapo_pai', 'rei', 'rei', '#a16207'],
  ], ['poço', 'bola de ouro', 'coroa']],
  ['ganso_de_ouro', 'O Ganso de Ouro', 'Grimm', 'campo', [
    ['simplorio', 'Simplório', 'crianca_m', '#c2b280', 'menino bobo'],
    ['ganso_ouro', 'ganso de ouro', 'animal:🦢', '', 'ganso mágico'],
    ['princesa_ganso', 'princesa', 'princesa', '#fbcfe8'],
  ], ['ganso dourado', 'machado']],
  ['musicos_de_bremen', 'Os Músicos de Bremen', 'Grimm', 'fazenda', [
    ['burro', 'burro', 'animal:🐴', '', 'jumento'],
    ['cao_bremen', 'cão', 'animal:🐕', '', 'cachorro'],
    ['gato_bremen', 'gato', 'animal:🐈', ''],
    ['galo_bremen', 'galo', 'animal:🐓', '', 'galinha'],
  ], ['instrumentos', 'casa dos ladrões']],
  ['principe_feliz', 'O Príncipe Feliz', 'Oscar Wilde', 'cidade', [
    ['principe_feliz', 'príncipe feliz', 'principe', '#eab308', 'estátua dourada'],
    ['andorinha', 'andorinha', 'animal:🐦', '', 'pássaro'],
  ], ['estátua', 'rubi', 'folha de ouro']],
  ['soldadinho_de_chumbo', 'O Soldadinho de Chumbo', 'Andersen', 'casa_quarto', [
    ['soldadinho', 'soldadinho de chumbo', 'guerreiro', '#64748b', 'soldado de uma perna'],
    ['bailarina', 'bailarina', 'crianca_f', '#f9a8d4', 'dançarina de papel'],
  ], ['castelo de papel', 'lago de papel']],
  ['pequena_sereia', 'A Pequena Sereia', 'Andersen', 'fundo_do_mar', [
    ['pequena_sereia', 'pequena sereia', 'sereia', '#06b6d4', 'sereia do mar', 'ariel'],
    ['principe_sereia', 'príncipe', 'principe', '#1e3a8a'],
    ['bruxa_do_mar', 'bruxa do mar', 'bruxa', '#4338ca', 'feiticeira marinha'],
  ], ['concha', 'punhal', 'pernas']],
  ['abada_de_ouro', 'A Abada de Ouro', 'conto oriental', 'castelo', [
    ['principe_abada', 'príncipe', 'principe', '#b45309'],
    ['fada_abada', 'fada', 'fada', '#f59e0b'],
  ], ['abada de ouro', 'jardim']],
  ['a_galinha_dos_ovos', 'A Galinha dos Ovos de Ouro', 'Esopo', 'fazenda', [
    ['galinha_ouro', 'galinha', 'animal:🐔', '', 'galinha dos ovos de ouro'],
    ['campones_ganancioso', 'camponês', 'campones', '#a16207', 'dono da galinha'],
  ], ['ovo de ouro', 'faca']],
  ['a_raposa_e_as_uvas', 'A Raposa e as Uvas', 'Esopo', 'pomar', [
    ['raposa', 'raposa', 'animal:🦊', '', 'raposa das uvas'],
  ], ['uvas', 'parreira']],
  ['a_lebre_e_a_tartaruga', 'A Lebre e a Tartaruga', 'Esopo', 'campo', [
    ['lebre', 'lebre', 'animal:🐇', '', 'coelho apressado'],
    ['tartaruga', 'tartaruga', 'animal:🐢', '', 'jabuti'],
  ], ['linha de chegada', 'árvore']],
  ['o_corvo_e_a_raposa', 'O Corvo e a Raposa', 'Esopo', 'floresta', [
    ['corvo', 'corvo', 'animal:🐦‍⬛', '', 'ave preta'],
    ['raposa_corvo', 'raposa', 'animal:🦊', ''],
  ], ['queijo', 'galho']],
  ['o_leao_e_o_ratinho', 'O Leão e o Ratinho', 'Esopo', 'floresta', [
    ['leao_ratinho', 'leão', 'leao', '#b45309', 'rei dos animais'],
    ['ratinho', 'ratinho', 'animal:🐭', '', 'rato'],
  ], ['rede', 'cordas']],
  ['a_formiga_e_a_cigarra', 'A Formiga e a Cigarra', 'Esopo', 'campo', [
    ['formiga', 'formiga', 'animal:🐜', '', 'formigas'],
    ['cigarra', 'cigarra', 'animal:🦗', '', 'cigarras'],
  ], ['violão', 'celeiro de grãos']],
  ['o_pastor_mentiroso', 'O Pastor Mentiroso', 'Esopo', 'campo', [
    ['pastor', 'pastor', 'campones', '#65a30d', 'menino que mentia'],
    ['lobo_pastor', 'lobo', 'animal:🐺', ''],
    ['ovelhas', 'ovelha', 'animal:🐑', '', 'rebanho'],
  ], ['cajado', 'ovelhas']],
  ['o_patoselvagem_feio', 'O Abeto', 'Andersen', 'floresta', [
    ['abeto', 'abeto', 'criatura', '#166534', 'pinheiro'],
    ['pardais', 'pardal', 'animal:🐦', ''],
  ], ['neve', 'árvore de natal']],
  ['o_rato_de_cidade', 'O Rato da Cidade e o Rato do Campo', 'Esopo', 'cidade', [
    ['rato_cidade', 'rato da cidade', 'animal:🐀', '', 'rato urbano'],
    ['rato_campo', 'rato do campo', 'animal:🐁', '', 'rato rural'],
  ], ['queijo', 'mesa posta']],
  ['a_cegonha_e_a_raposa', 'A Cegonha e a Raposa', 'Esopo', 'pomar', [
    ['cegonha', 'cegonha', 'animal:🦩', '', 'ave de pernas longas'],
    ['raposa_cegonha', 'raposa', 'animal:🦊', ''],
  ], ['prato raso', 'jarro fundo']],
  ['o_avarento_e_o_ouro', 'O Avarento e o Seu Ouro', 'Esopo', 'campo', [
    ['avarento', 'avarento', 'campones', '#b45309', 'homem do ouro'],
  ], ['pote de ouro', 'buraco']],
  ['a_arvore_que_nao_dava', 'A Árvore Generosa', 'tradição oral', 'pomar', [
    ['arvore_generosa', 'árvore', 'criatura', '#15803d', 'macieira'],
    ['menino_arvore', 'menino', 'crianca_m', '#3b82f6'],
  ], ['maçãs', 'tronco']],
  ['a_bruxa_e_o_caldeirao', 'A Bruxa e o Caldeirão', 'tradição oral', 'caverna', [
    ['bruxa_caldeirao', 'bruxa', 'bruxa', '#7e22ce', 'feiticeira do caldeirão'],
    ['gato_bruxa', 'gato preto', 'animal:🐈‍⬛', ''],
  ], ['caldeirão', 'vassoura', 'poção']],
  ['o_dragao_e_o_cavaleiro', 'O Dragão e o Cavaleiro', 'tradição medieval', 'castelo', [
    ['dragao', 'dragão', 'animal:🐉', '', 'dragão que cospe fogo'],
    ['cavaleiro_dragao', 'cavaleiro', 'guerreiro', '#94a3b8', 'cavaleiro de armadura'],
    ['princesa_dragao', 'princesa', 'princesa', '#fbcfe8'],
  ], ['armadura', 'lança', 'espada']],
  ['o_unicornio_e_a_donzela', 'O Unicórnio e a Donzela', 'tradição medieval', 'floresta', [
    ['unicornio_floresta', 'unicórnio', 'unicornio', '#f5f3ff', 'cavalo com chifre'],
    ['donzela', 'donzela', 'crianca_f', '#fde68a'],
  ], ['chifre', 'flores']],
  ['o_rei_artur', 'O Rei Artur e a Espada', 'lenda arturiana', 'castelo', [
    ['artur', 'Rei Artur', 'rei', '#1e40af', 'artur', 'rei da távola'],
    ['merlin', 'Merlin', 'mago', '#7c3aed', 'mago conselheiro'],
    ['excalibur', 'Excalibur', 'animal:⚔️', '', 'espada da pedra'],
    ['cavaleiro_tavola', 'cavaleiro', 'guerreiro', '#94a3b8', 'cavaleiros da távola'],
  ], ['espada na pedra', 'távola redonda', 'coroa']],
  ['robin_hood', 'Robin Hood', 'lenda inglesa', 'floresta', [
    ['robin', 'Robin Hood', 'guerreiro', '#166534', 'arqueiro', 'ladrão gentil'],
    ['frei_tuck', 'Frei Tuck', 'velho', '#a16207', 'frade'],
    ['xerife', 'xerife de Nottingham', 'guerreiro', '#7f1d1d', 'xerife'],
  ], ['arco e flecha', 'chapéu verde', 'bolsa de moedas']],
  ['guilherme_tell', 'Guilherme Tell', 'lenda suíça', 'montanha', [
    ['guilherme_tell', 'Guilherme Tell', 'guerreiro', '#0f766e', 'besteiro'],
    ['filho_tell', 'filho', 'crianca_m', '#3b82f6'],
  ], ['besta', 'maçã', 'arco']],
  ['barba_azul', 'Barba Azul', 'Perrault', 'castelo', [
    ['barba_azul', 'Barba Azul', 'rei', '#1e3a8a', 'senhor do castelo'],
    ['irma_curiosa', 'irmã', 'crianca_f', '#fbcfe8'],
  ], ['chave dourada', 'quarto proibido']],
  ['a_gata_borralheira', 'A Gata Borralheira', 'variante italiana', 'castelo', [
    ['gata_borralheira', 'gata borralheira', 'princesa', '#fbbf24'],
    ['principe_gata', 'príncipe', 'principe', '#1e40af'],
  ], ['sapato', 'vestido']],
  ['a_bela_do_norte', 'A Bela do Norte', 'conto nórdico', 'montanha', [
    ['bela_norte', 'Bela do Norte', 'princesa', '#bfdbfe'],
    ['urso_norte', 'urso polar', 'animal:🐻‍❄️', '', 'urso branco'],
  ], ['neve', 'trenó']],
  ['a_pequena_vendedora', 'A Pequena Vendedora de Fósforos', 'Andersen', 'cidade', [
    ['vendedora', 'menina dos fósforos', 'crianca_f', '#a16207', 'vendedora de fósforos'],
    ['avo_vendedora', 'avó', 'idosa', '#e5e7eb'],
  ], ['fósforos', 'neve', 'lanterna']],
  ['o_patinho_disforme', 'O Cisne Selvagem', 'Andersen', 'rio_cachoeira', [
    ['elisa', 'Elisa', 'princesa', '#fef3c7', 'princesa dos cisnes'],
    ['cisnes_elisa', 'cisne', 'animal:🦢', ''],
    ['rainha_madrasta', 'rainha má', 'rainha', '#4c1d95'],
  ], ['urtigas', 'camisas de cisne']],
  ['a_princesa_e_a_ervilha', 'A Princesa e a Ervilha', 'Andersen', 'castelo', [
    ['princesa_ervilha', 'princesa', 'princesa', '#f0abfc'],
    ['rainha_ervilha', 'rainha', 'rainha', '#7c3aed'],
    ['principe_ervilha', 'príncipe', 'principe', '#1d4ed8'],
  ], ['ervilha', 'colchões']],
  ['o_imperador_novo', 'O Imperador e o Fato Novo', 'Andersen', 'cidade', [
    ['imperador', 'imperador', 'rei', '#b91c1c', 'imperador vaidoso'],
    ['alfaiate', 'alfaiate', 'campones', '#0ea5e9', 'costureiro'],
  ], ['fato invisível', 'espelho']],
  ['ruiseñor', 'O Rouxinol do Imperador', 'Andersen', 'jardim', [
    ['rouxinol', 'rouxinol', 'animal:🐦', ''],
    ['imperador_rouxinol', 'imperador', 'rei', '#b91c1c'],
    ['pescador_rouxinol', 'pescador', 'campones', '#0f766e'],
  ], ['gaiola dourada', 'jardim']],
  ['a_sombra', 'A Sombra', 'Andersen', 'cidade', [
    ['sabio', 'sábio', 'velho', '#334155'],
    ['sombra', 'sombra', 'criatura', '#111827'],
  ], ['lanterna', 'carta']],
  ['o_tambor', 'O Baú Voador', 'Andersen', 'cidade', [
    ['comerciante', 'comerciante', 'campones', '#a16207'],
    ['princesa_bau', 'princesa', 'princesa', '#fda4af'],
  ], ['baú voador', 'pólvora']],
  ['o_guardador_de_porcos', 'O Guardador de Porcos', 'Andersen', 'castelo', [
    ['principe_guardador', 'príncipe', 'principe', '#166534'],
    ['princesa_guardadora', 'princesa', 'princesa', '#fbcfe8'],
  ], ['panela mágica', 'chocalho']],
  ['a_menina_do_mar', 'A Menina que Pisou no Pão', 'Andersen', 'fundo_do_mar', [
    ['menina_pao', 'menina', 'crianca_f', '#f9d5c0'],
    ['bruxa_lama', 'bruxa da lama', 'bruxa', '#365314'],
  ], ['pão', 'lago']],
  ['as_cores_da_terra', 'O Homem de Neve', 'Andersen', 'montanha', [
    ['homem_de_neve', 'homem de neve', 'criatura', '#f8fafc', 'boneco de neve'],
    ['cachorro_quintal', 'cachorro', 'animal:🐕', ''],
  ], ['vassoura', 'neve']],
  ['o_vela', 'A Vela', 'Andersen', 'casa_quarto', [
    ['vela', 'vela', 'criatura', '#fde68a'],
    ['fósforo', 'fósforo', 'criatura', '#b45309'],
  ], ['pavio', 'castiçal']],
  ['o_linho', 'O Linho', 'Andersen', 'campo', [
    ['linho', 'linho', 'criatura', '#a3e635'],
    ['menina_linho', 'menina', 'crianca_f', '#fbcfe8'],
  ], ['linho', 'tear']],
  ['a_pedra_filosofal', 'O Anel do Rei', 'conto oriental', 'deserto', [
    ['sabio_anel', 'sábio', 'mago', '#7e22ce'],
    ['rei_anel', 'rei', 'rei', '#b7791f'],
  ], ['anel', 'selo real']],
  ['a_torre_de_babel', 'A Cidade de Bronze', 'Mil e Uma Noites', 'deserto', [
    ['viajante', 'viajante', 'campones', '#a16207'],
    ['cavalo_voador', 'cavalo', 'animal:🐎', '', 'cavalo voador'],
  ], ['cidade de bronze', 'garrafa lacrada']],
  ['o_pescador_e_o_genio', 'O Pescador e o Gênio', 'Mil e Uma Noites', 'praia', [
    ['pescador_genio', 'pescador', 'campones', '#0e7490'],
    ['genio_garrafa', 'gênio', 'criatura', '#7c3aed'],
  ], ['garrafa', 'rede de pesca']],
  ['a_princesa_e_o_sonho', 'A Cidade de Ouro', 'conto oriental', 'cidade', [
    ['principe_sonho', 'príncipe', 'principe', '#eab308'],
    ['dervixe', 'dervixe', 'mago', '#4d7c0f'],
  ], ['travesseiro', 'mapa']],
  ['a_historia_de_scheherazade', 'Scheherazade', 'Mil e Uma Noites', 'castelo', [
    ['scheherazade', 'Scheherazade', 'princesa', '#a855f7', 'contadora de histórias'],
    ['xeriar', 'Xeriar', 'rei', '#7f1d1d', 'sultão'],
    ['irma_dunyazade', 'Dunyazade', 'crianca_f', '#fbbf24', 'irmã'],
  ], ['livro de histórias', 'almofada']],
  ['a_lampada_do_desejo', 'O Tapete Voador', 'Mil e Uma Noites', 'deserto', [
    ['jovem_tapete', 'jovem', 'principe', '#2563eb'],
    ['tapete', 'tapete voador', 'animal:🧿', '', 'tapete mágico'],
  ], ['tapete', 'deserto']],
  ['a_cidade_das_letras', 'O Mercador e o Gênio', 'Mil e Uma Noites', 'deserto', [
    ['mercador_genio', 'mercador', 'campones', '#b45309'],
    ['genio_mercador', 'gênio', 'criatura', '#0891b2'],
  ], ['tâmaras', 'ossos']],
  ['o_cavalo_de_bronze', 'O Cavalo de Bronze', 'Mil e Uma Noites', 'cidade', [
    ['principe_bronze', 'príncipe', 'principe', '#14b8a6'],
    ['cavalo_bronze', 'cavalo de bronze', 'animal:🐎', ''],
  ], ['cavalo', 'alavanca']],
  ['a_gazela_encantada', 'A Gazela Encantada', 'Mil e Uma Noites', 'deserto', [
    ['gazela', 'gazela', 'animal:🦌', '', 'cerva'],
    ['principe_gazela', 'príncipe', 'principe', '#0f766e'],
  ], ['caça', 'fonte']],
  ['os_dois_irmaos', 'Os Dois Irmãos', 'conto europeu', 'floresta', [
    ['irmao_um', 'irmão', 'crianca_m', '#2563eb'],
    ['irmao_dois', 'irmão', 'crianca_m', '#dc2626'],
    ['dragao_irmaos', 'dragão', 'animal:🐉', ''],
  ], ['espada mágica', 'floresta']],
  ['a_princesa_serpente', 'A Princesa Serpente', 'conto oriental', 'castelo', [
    ['princesa_serpente', 'princesa serpente', 'princesa', '#16a34a'],
    ['jardineiro', 'jardineiro', 'campones', '#65a30d'],
  ], ['jardim', 'escamas']],
  ['o_papagaio_falante', 'O Papagaio Falante', 'conto indiano', 'jardim', [
    ['papagaio', 'papagaio', 'animal:🦜', '', 'arara'],
    ['princesa_papagaio', 'princesa', 'princesa', '#f472b6'],
  ], ['gaiola', 'frutas']],
  ['a_arvore_dos_passaros', 'A Árvore dos Pássaros', 'conto popular', 'pomar', [
    ['arvore_passaros', 'árvore', 'criatura', '#15803d'],
    ['passaro_azul', 'pássaro azul', 'animal:🐦', ''],
  ], ['ninho', 'frutas']],
  ['o_peixe_de_ouro', 'O Peixe de Ouro', 'Pushkin', 'fundo_do_mar', [
    ['peixe_ouro', 'peixe de ouro', 'animal:🐠', '', 'peixinho dourado'],
    ['velho_pescador', 'velho pescador', 'velho', '#78716c'],
    ['velha_ambiciosa', 'velha', 'idosa', '#a16207'],
  ], ['rede', 'mar revolto', 'tina']],
  ['a_princesa_cisne', 'O Lago dos Cisnes', 'ballet e lenda', 'rio_cachoeira', [
    ['odete', 'Odete', 'princesa', '#f8fafc', 'cisne branco'],
    ['principe_siegfried', 'príncipe', 'principe', '#1e3a8a'],
    ['feiticeiro_cisne', 'feiticeiro', 'mago', '#4c1d95'],
  ], ['lago', 'coroa']],
  ['a_bruxa_do_mar', 'A Feiticeira do Mar', 'conto nórdico', 'fundo_do_mar', [
    ['feiticeira_mar', 'feiticeira', 'bruxa', '#0e7490'],
    ['marinheiro', 'marinheiro', 'pirata', '#1e40af'],
  ], ['poção', 'concha']],
  ['o_marujo_e_a_baleia', 'O Marinheiro e a Baleia', 'tradição marítima', 'praia', [
    ['marujo', 'marujo', 'pirata', '#1e3a8a', 'capitão'],
    ['baleia', 'baleia', 'animal:🐋', ''],
  ], ['arpão', 'navio']],
  ['a_ilha_do_tesouro', 'A Ilha do Tesouro', 'Stevenson (domínio público)', 'praia', [
    ['jim', 'Jim', 'crianca_m', '#0ea5e9', 'menino do navio'],
    ['long_john', 'Long John Silver', 'pirata', '#b45309', 'pirata da perna de pau'],
    ['capitao_smolett', 'capitão', 'guerreiro', '#1e40af'],
  ], ['mapa do tesouro', 'baú', 'papagaio']],
  ['a_volta_ao_mundo', 'A Volta ao Mundo em 80 Dias', 'Verne (domínio público)', 'estacao', [
    ['phileas', 'Phileas Fogg', 'velho', '#1f2937', 'viajante inglês'],
    ['passepartout', 'Passepartout', 'campones', '#0d9488', 'ajudante'],
  ], ['trem', 'relógio', 'mala']],
  ['vinte_mil_leguas', 'Vinte Mil Léguas Submarinas', 'Verne (domínio público)', 'fundo_do_mar', [
    ['nemo', 'Capitão Nemo', 'pirata', '#1e40af', 'capitão do submarino'],
    ['ned_land', 'Ned Land', 'guerreiro', '#92400e', 'arpoador'],
    ['nautilus', 'Náutilo', 'barco', '#0f172a', 'submarino'],
  ], ['submarino', 'arpão', 'escafandro']],
  ['a_ilha_das_flores', 'A Ilha das Flores', 'conto popular', 'jardim', [
    ['jardineiro_ilha', 'jardineiro', 'campones', '#16a34a'],
    ['abelha', 'abelha', 'animal:🐝', ''],
  ], ['flores', 'colmeia']],
  ['o_rei_e_o_sabio', 'O Rei e o Sábio', 'conto oriental', 'castelo', [
    ['rei_sabio', 'rei', 'rei', '#b7791f'],
    ['sabio_corte', 'sábio', 'mago', '#4c1d95'],
  ], ['trono', 'pergaminho']],
  ['a_moça_e_o_vento', 'A Moça e o Vento', 'conto popular', 'montanha', [
    ['moca_vento', 'moça', 'crianca_f', '#a5b4fc'],
    ['vento', 'vento', 'criatura', '#94a3b8'],
  ], ['moinho', 'lenço']],
  ['o_pastor_de_nuvens', 'O Pastor de Nuvens', 'conto popular', 'nuvens', [
    ['pastor_nuvens', 'pastor', 'crianca_m', '#bfdbfe'],
    ['ovelha_nuvem', 'ovelha', 'animal:🐑', ''],
  ], ['cajado', 'nuvens']],
  ['a_cidade_dos_sonhos', 'A Cidade dos Sonhos', 'conto popular', 'nuvens', [
    ['sonhador', 'sonhador', 'crianca_m', '#c4b5fd'],
    ['fada_sonho', 'fada', 'fada', '#f0abfc'],
  ], ['nuvem', 'estrela']],
  ['a_arvore_falante', 'A Árvore Falante', 'conto popular', 'floresta', [
    ['arvore_falante', 'árvore falante', 'criatura', '#166534'],
    ['lenhador_arvore', 'lenhador', 'campones', '#78350f'],
  ], ['machado', 'folhas']],
  ['o_espelho_magico', 'O Espelho Mágico', 'Grimm', 'castelo', [
    ['rainha_espelho', 'rainha', 'rainha', '#6b21a8'],
    ['espelho', 'espelho mágico', 'animal:🪞', ''],
  ], ['espelho', 'trono']],
  ['a_flauta_magica', 'A Flauta Mágica', 'conto alemão', 'floresta', [
    ['tamino', 'Tamino', 'principe', '#0ea5e9'],
    ['pamina', 'Pamina', 'princesa', '#f9a8d4'],
    ['sarastro', 'Sarastro', 'mago', '#4c1d95'],
    ['papageno', 'Papageno', 'campones', '#22c55e'],
  ], ['flauta', 'sino', 'templo']],
  ['a_caverna_do_tesouro', 'A Caverna do Tesouro', 'Mil e Uma Noites', 'caverna', [
    ['ladrao_caverna', 'ladrão', 'guerreiro', '#1f2937'],
    ['genio_caverna', 'gênio', 'criatura', '#0891b2'],
  ], ['baú', 'tocha', 'moedas']],
  ['o_reino_de_gelo', 'O Reino de Gelo', 'conto nórdico', 'montanha', [
    ['rainha_gelo', 'rainha do gelo', 'rainha', '#bae6fd', 'feiticeira do gelo'],
    ['kay', 'Kay', 'crianca_m', '#3b82f6'],
    ['gerda', 'Gerda', 'crianca_f', '#fbcfe8'],
  ], ['espelho quebrado', 'trenó', 'neve']],
  ['o_jardim_secreto', 'O Jardim Secreto', 'Burnett (domínio público)', 'jardim', [
    ['mary', 'Mary', 'crianca_f', '#fbbf24'],
    ['colin', 'Colin', 'crianca_m', '#a3e635'],
    ['jardineiro_velho', 'jardineiro', 'velho', '#166534'],
  ], ['chave do jardim', 'pá']],
  ['a_menina_e_o_lobo', 'A Menina e o Lobo', 'conto popular', 'floresta', [
    ['menina_lobo', 'menina', 'crianca_f', '#e11d48'],
    ['lobo_menina', 'lobo', 'animal:🐺', ''],
  ], ['cesta', 'flores']],
  ['o_caçador_e_o_pássaro', 'O Caçador e o Pássaro', 'conto popular', 'floresta', [
    ['cacador_passaro', 'caçador', 'cacador', '#57534e'],
    ['passaro_dourado', 'pássaro dourado', 'animal:🦜', '', 'ave de ouro'],
  ], ['gaiola', 'flecha']],
  ['a_princesa_do_mar', 'A Princesa do Mar', 'conto popular', 'fundo_do_mar', [
    ['princesa_mar', 'princesa do mar', 'sereia', '#22d3ee'],
    ['rei_mar', 'rei do mar', 'rei', '#0e7490', 'Netuno'],
  ], ['coroa de coral', 'tridente']],
  ['o_urso_e_o_menino', 'O Urso e o Menino', 'conto popular', 'floresta', [
    ['urso_menino', 'urso', 'animal:🐻', ''],
    ['menino_urso', 'menino', 'crianca_m', '#f97316'],
  ], ['mel', 'caverna']],
  ['a_girafa_e_o_rei', 'A Girafa e o Rei', 'conto popular', 'deserto', [
    ['girafa', 'girafa', 'animal:🦒', ''],
    ['rei_girafa', 'rei', 'rei', '#b7791f'],
  ], ['trono', 'acácia']],
  ['o_tigre_e_o_buda', 'O Tigre e o Sábio', 'conto indiano', 'floresta', [
    ['tigre', 'tigre', 'animal:🐯', '', 'tigre feroz'],
    ['sabio_indiano', 'sábio', 'mago', '#7c2d12', 'guru'],
  ], ['jaula', 'selva']],
  ['a_tartaruga_e_o_macaco', 'A Tartaruga e o Macaco', 'folclore brasileiro', 'rio_cachoeira', [
    ['tartaruga_macaco', 'tartaruga', 'animal:🐢', ''],
    ['macaco_tartaruga', 'macaco', 'animal:🐒', ''],
  ], ['fruta', 'rio']],
  ['o_jacare_e_a_onça', 'O Jacaré e a Onça', 'folclore brasileiro', 'rio_cachoeira', [
    ['jacare', 'jacaré', 'animal:🐊', ''],
    ['onca', 'onça', 'animal:🐆', '', 'onça pintada'],
  ], ['lagoa', 'margem']],
  ['a_onça_e_o_saci', 'A Onça e o Saci', 'folclore brasileiro', 'floresta', [
    ['onca_saci', 'onça', 'animal:🐆', ''],
    ['saci_onca', 'Saci', 'crianca_m', '#b91c1c', 'redemoinho'],
  ], ['redemoinho', 'cachimbo']],
  ['o_caboclo_e_a_mata', 'O Caboclo e a Mata', 'folclore amazônico', 'floresta', [
    ['caboclo', 'caboclo', 'campones', '#7c2d12'],
    ['curupira_mata', 'Curupira', 'crianca_m', '#15803d'],
  ], ['arco', 'pegadas']],
];

// arquétipos desenhados: altura e para onde olham
export const ARQUETIPOS = A;
export { HISTORIAS };

// emoji usado quando o arquétipo é 'animal:<emoji>' e o item não tem PNG próprio
export const ehAnimal = (arq) => String(arq || '').startsWith('animal:');
export const emojiDe = (arq) => String(arq || '').slice('animal:'.length);

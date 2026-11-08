// Editor que Corta: a parte sem tela. Roda no navegador e no Node (é assim que os testes conferem a emenda).
//  1) criarVad: detector de fala por energia, com limiar que se adapta ao ruído da sala (quadros de 10 ms).
//  2) criarFrases: lê o texto do reconhecedor de voz e fecha uma frase a cada "final", com a hora em que chegou;
//     dividir() separa no mesmo final o que é comando para a edição ("corta isso") e a mesma frase recomeçada.
//  3) criarLigador: liga cada frase aos trechos de fala do VAD (o caso difícil: duas frases num trecho, uma frase em
//     dois trechos, o final que chega atrasado e o barulho sem texto); criarSessao decide QUANDO ligar.
//  4) planoDaEmenda + emendar: o que fica, o que sai, e a emenda com crossfade; wav() gera o arquivo para baixar.
//  6) criarEdicao: as respostas do Jev viram "fica", "sai" ou "pela metade (esperando a próxima frase)"; os comandos
//     de edição e as tentativas repetidas da mesma frase são regras do código (só a última tentativa fica).
//  7) eventosDoRoteiro: o reconhecedor simulado da demonstração, em cima dos tempos medidos do exemplo.
// Para adaptar: os números de PADRAO (fala mínima, rabo, pré e pós da emenda, pausa máxima) são as regras do corte.

export const QUADRO = 0.01; // 10 ms

export const PADRAO = {
  vad: {
    falaMin: 0.25,      // fala mínima para virar trecho (s)
    rabo: 0.35,         // silêncio que fecha o trecho (s)
    acimaDoPiso: 14,    // o limiar de "liga" fica tantos dB acima do ruído da sala
    histerese: 5,       // "desliga" fica tantos dB abaixo do "liga"
    ligaMin: -52,       // nunca abaixo disso (sala muito silenciosa ou silêncio digital)
    ligaMax: -26,       // nunca acima disso (sala barulhenta)
    janelaPiso: 6,      // o ruído é medido nos últimos 6 s (percentil 10)
  },
  ligar: {
    latMax: 1.5,        // o reconhecedor mostra o 1º pedaço de uma frase até 1,5 s depois de ela começar
    semTextoAte: 0.9,   // trecho sem texto com menos voz que isso é barulho/hesitação: sai; mais que isso: fica
    letrasPorSeg: 14,   // ritmo de fala inicial (letras por segundo de voz); depois ele aprende o ritmo de quem fala
    folgaAtivo: 0.15,   // "falando agora" = voz nos últimos 150 ms antes do final chegar
  },
  emenda: {
    antes: 0.14,        // começa o trecho mantido 140 ms antes da 1ª voz
    depois: 0.22,       // e termina 220 ms depois da última (o fim da sílaba e o ar da sala): emenda com ~0,36 s
    folga: 0.03,        // distância mínima da fala que foi cortada
    pausaMax: 0.8,      // silêncio maior que isso dentro do que fica…
    pausaCurta: 0.45,   // …vira um silêncio deste tamanho (ritmo de vídeo: sem respiro longo)
    xfade: 0.025,       // crossfade de 25 ms em cada emenda
    borda: 0.012,       // fade de entrada e de saída do arquivo
  },
};

const LETRAS = /[\p{L}\p{N}]/gu;
export const letras = (t) => (String(t || '').match(LETRAS) || []).length;
export const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------- energia ----------
export function energiaDb(a, ini, fim) {
  let s = 0;
  for (let i = ini; i < fim; i++) s += a[i] * a[i];
  const rms = Math.sqrt(s / Math.max(1, fim - ini));
  return rms > 1e-6 ? 20 * Math.log10(rms) : -120;
}

// todos os quadros de 10 ms de um sinal (Node e testes; no navegador, palco.js mede cada bloco que a captura manda)
export function quadrosDe(a, sr) {
  const q = Math.round(sr * QUADRO), n = Math.floor(a.length / q), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = energiaDb(a, i * q, (i + 1) * q);
  return out;
}

// ---------- 1. VAD por energia, com limiar adaptativo ----------
export function criarVad(op = {}) {
  const P = { ...PADRAO.vad, ...op };
  const db = [], voz = [], desl = [], segs = [];
  const nJan = Math.round(P.janelaPiso / QUADRO), jan = [];
  const rabo = Math.round(P.rabo / QUADRO), falaMin = Math.round(P.falaMin / QUADRO);
  let piso = -70, liga = P.ligaMin, desliga = P.ligaMin - P.histerese;
  let estado = 'silencio', cIni = 0, cUlt = 0, cVoz = 0, seg = null;

  function atualizarPiso() {
    const ord = jan.slice().sort((x, y) => x - y);
    piso = ord[Math.floor(ord.length * 0.1)];
    liga = Math.min(P.ligaMax, Math.max(P.ligaMin, piso + P.acimaDoPiso));
    desliga = liga - P.histerese;
  }

  function um(v) {
    const i = db.length;
    db.push(v); jan.push(v); if (jan.length > nJan) jan.shift();
    if (i < 40 || i % 20 === 0) atualizarPiso();
    const sim = v >= desliga;
    voz.push(sim ? 1 : 0); desl.push(desliga);
    if (estado === 'silencio') {
      if (v >= liga) { estado = 'talvez'; cIni = i; cUlt = i; cVoz = 1; }
    } else if (estado === 'talvez') {
      if (sim) { cVoz++; cUlt = i; }
      if (i - cUlt > rabo) estado = 'silencio';
      else if (cUlt - cIni + 1 >= falaMin && cVoz >= falaMin * 0.6) {
        estado = 'fala'; seg = { ia: cIni, ib: cUlt + 1, nv: cVoz, aberto: true }; segs.push(seg);
      }
    } else if (estado === 'fala') {
      if (sim) { seg.nv++; seg.ib = i + 1; }
      else if (i + 1 - seg.ib >= rabo) { seg.aberto = false; seg = null; estado = 'silencio'; }
    }
  }

  // voz (s) dentro de [t0, t1), contando só os quadros que estão dentro de um trecho
  function vozEntre(t0, t1) {
    let n = 0;
    const i0 = Math.max(0, Math.floor(t0 / QUADRO + 1e-6)), i1 = Math.min(db.length, Math.ceil(t1 / QUADRO - 1e-6));
    for (const s of segs) {
      const a = Math.max(i0, s.ia), b = Math.min(i1, s.ib);
      for (let i = a; i < b; i++) n += voz[i];
    }
    return n * QUADRO;
  }

  // fim da última voz dentro de [t0, t1) (só quadros dentro de trechos); null se não houver
  function ultimaVoz(t0, t1) {
    const i0 = Math.max(0, Math.floor(t0 / QUADRO + 1e-6)), i1 = Math.min(db.length, Math.ceil(t1 / QUADRO - 1e-6));
    for (let i = i1 - 1; i >= i0; i--) if (voz[i] && segs.some((s) => i >= s.ia && i < s.ib)) return (i + 1) * QUADRO;
    return null;
  }

  // vales dentro de [t0, t1]: pausas curtas (abaixo do "desliga") e, se não houver, os quadros mais baixos
  function vales(t0, t1) {
    const i0 = Math.max(2, Math.ceil(t0 / QUADRO)), i1 = Math.min(db.length - 3, Math.floor(t1 / QUADRO));
    if (i1 - i0 < 3) return [];
    const sm = (i) => (db[i - 2] + db[i - 1] + db[i] + db[i + 1] + db[i + 2]) / 5;
    const out = [];
    let run = null;
    for (let i = i0; i <= i1; i++) {
      const baixo = sm(i) < desl[i] + 2;
      if (baixo) { if (!run) run = { a: i, b: i, min: sm(i) }; run.b = i; run.min = Math.min(run.min, sm(i)); }
      if ((!baixo || i === i1) && run) {
        const n = run.b - run.a + 1;
        out.push({ t: ((run.a + run.b + 1) / 2) * QUADRO, prof: Math.min(1, (n * QUADRO) / 0.15) * 0.8 + 0.2, pausa: true });
        run = null;
      }
    }
    if (!out.length) {
      // sem pausa nenhuma: os mínimos locais mais fundos (fronteira entre palavras)
      let ref = -120; for (let i = i0; i <= i1; i++) ref = Math.max(ref, sm(i));
      for (let i = i0 + 2; i <= i1 - 2; i++) {
        const v = sm(i);
        if (v <= sm(i - 1) && v <= sm(i + 1) && v <= sm(i - 2) && v <= sm(i + 2)) {
          const queda = ref - v;
          if (queda >= 6) out.push({ t: (i + 0.5) * QUADRO, prof: Math.min(0.5, queda / 40), pausa: false });
        }
      }
    }
    return out.sort((x, y) => y.prof - x.prof).slice(0, 6);
  }

  return {
    empurrar(lista) { for (const v of lista) um(v); },
    // fecha o trecho aberto (fim da gravação)
    fechar() {
      if (estado === 'talvez' && cUlt - cIni + 1 >= falaMin * 0.6) segs.push({ ia: cIni, ib: cUlt + 1, nv: cVoz, aberto: false });
      if (seg) seg.aberto = false;
      seg = null; estado = 'silencio';
    },
    segmentos: () => segs.map((s) => ({ a: s.ia * QUADRO, b: s.ib * QUADRO, voz: s.nv * QUADRO, aberto: s.aberto })),
    vozEntre, vales, ultimaVoz,
    get agora() { return db.length * QUADRO; },
    get quadros() { return db; },
    get vozes() { return voz; },
    get estado() { return estado; },
    // silêncio desde a última voz de um trecho (0 se alguém está falando agora)
    get silencio() { if (estado !== 'silencio') return 0; const u = segs[segs.length - 1]; return u ? Math.max(0, db.length - u.ib) * QUADRO : db.length * QUADRO; },
    get piso() { return piso; },
    get limiar() { return liga; },
    falandoEm(t, janela = 0.15) { return vozEntre(t - janela, t) >= Math.min(0.06, janela * 0.4); },
  };
}

// ---------- 2. frases do reconhecedor ----------
// receber(final, parcial, t): o reconhecedor devolve TUDO o que já fechou (final) + o que ainda está ouvindo (parcial).
// Cada vez que o final cresce, nasce uma frase (ou mais, se dividir() achar um comando ou um recomeço dentro dele):
// { texto, tFinal, tPrimeiro, tCompleto, seguinte, comando, grupo }:
//  - tPrimeiro: a hora do 1º parcial dela;
//  - tCompleto: a hora em que o parcial já tinha TODAS as palavras dela (áudio que começa depois disso é da próxima);
//  - seguinte: o parcial que já existia quando ela fechou (a próxima frase já começou);
//  - grupo: os pedaços de um mesmo final têm o mesmo grupo (o ligador divide a voz do final entre eles).
const palavrasDe = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
export function criarFrases(aoFechar) {
  let final = '', tPrimeiro = null, parcial = '', tCresceu = null, nParcial = 0, grupo = 0;
  let tPal = [];   // tPal[i] = a hora em que a palavra i do parcial apareceu (dá o tempo de cada pedaço do final)
  const receber = (f, p, t) => {
    f = String(f || '').replace(/\s+/g, ' ').trim();
    p = String(p || '').replace(/\s+/g, ' ').trim();
    if (f.length > final.length && f.startsWith(final)) {
      const texto = f.slice(final.length).trim();
      final = f;
      // o parcial anterior já trazia todas as palavras do final? então elas estavam completas em tCresceu
      const completo = tCresceu != null && palavrasDe(parcial).length >= palavrasDe(texto).length ? tCresceu : t;
      if (texto) {
        const pedacos = dividir(texto);
        grupo++;
        pedacos.forEach((pd, k) => {
          const ultimo = k === pedacos.length - 1;
          const tP = pd.i0 === 0 ? (tPrimeiro == null ? t : tPrimeiro) : (tPal[pd.i0] ?? t);
          const tC = ultimo ? completo : (tPal[pd.i1 - 1] ?? completo);
          // a hora em que a 1ª palavra do próximo pedaço apareceu: a voz deste pedaço acabou antes disso
          const tProx = ultimo ? null : tPal[pd.i1] ?? null;
          aoFechar({ texto: pd.texto, tFinal: t, tPrimeiro: Math.min(tP, t), tCompleto: Math.min(tC, t), seguinte: ultimo ? p : '', comando: pd.comando, grupo, ...(tProx != null ? { tProxPrimeiro: Math.min(tProx, t) } : {}) });
        });
      }
      tPrimeiro = p ? t : null;
      tCresceu = p ? t : null; nParcial = palavrasDe(p).length;
      tPal = new Array(nParcial).fill(t);
    } else if (f !== final) {
      final = f; // o reconhecedor recomeçou: segue a partir daqui
    }
    if (p && tPrimeiro == null) tPrimeiro = t;
    const n = palavrasDe(p).length;
    if (n > nParcial) tCresceu = t;   // o parcial ganhou palavra nova
    for (let k = tPal.length; k < n; k++) tPal.push(t);
    nParcial = n;
    parcial = p;
  };
  return {
    receber,
    // fim da gravação: o que ainda não fechou vira o último final (passa pelo mesmo caminho, comandos inclusive)
    fecharParcial(t) { if (parcial) receber((final + ' ' + parcial).trim(), '', t); },
    pendente() { return parcial ? { texto: parcial, tPrimeiro: tPrimeiro == null ? null : tPrimeiro } : null; },
    get parcial() { return parcial; },
    limpar() { final = ''; tPrimeiro = null; parcial = ''; tPal = []; },
  };
}

// ---------- 2b. o que a pessoa diz PARA A EDIÇÃO, e a mesma frase recomeçada ----------
// O reconhecedor do Chrome muitas vezes devolve, num final só, o conteúdo e o comando ("o preço é trezentos reais corta
// isso o preço é duzentos"). dividir() separa o final em pedaços: os comandos para a edição e os recomeços da mesma
// frase. Comando é ordem explícita, então quem decide é o código, não o Jev:
//  - 'anterior': sai o comando e o que foi dito antes dele ("corta isso", "apaga essa parte", "esquece o que eu falei",
//    "isso eu corto depois", "vou de novo", "não, peraí", "ops", "errei");
//  - 'tudo': sai tudo o que veio antes ("apaga tudo", "vou começar do zero");
//  - 'bastidor': só ele sai ("peraí", "tá gravando?", "valendo").
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// as palavras do texto sem acento, com a posição no texto original (a mesma contagem de palavras do leitor)
function palavrasCom(texto) {
  const out = [], re = /[\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(texto))) out.push({ n: semAcento(m[0]), o: m[0].toLowerCase(), ini: m.index, fim: m.index + m[0].length });
  return out;
}
// o que se manda cortar. "essa"/"esse" sozinhos só valem se não vier um substantivo depois ("corta essa cebola" é
// receita, não comando): depois deles, só o fim do final ou uma palavra que não segue um "essa" (artigo, pronome…)
const DEPOIS_DEM = '(?=$| (?:o|a|os|as|um|uma|eu|e|entao|hoje|vamos|vou|agora|bom|ta|nao|de|do|da)(?![a-z0-9]))';
const OBJ = `(?:isso(?: ai| aqui| tudo| que eu (?:falei|disse))?|isto|essa (?:parte|frase|ai|aqui|ultima(?: frase| parte)?)|esse (?:pedaco|trecho|ai|aqui|ultimo(?: pedaco| trecho)?)|(?:essa|esse)${DEPOIS_DEM}|a ultima(?: frase| parte)?|o ultimo(?: pedaco| trecho)?|o que eu (?:falei|disse)|tudo isso|daqui)`;
const CORTAR = '(?:corta|corte|cortar|apaga|apague|apagar|tira|tire|tirar|deleta|delete|deletar|exclui|exclua|excluir|remove|remova|remover)';
const ESQUECER = '(?:esquece|esqueca|esquecam|ignora|ignore|ignorem|desconsidera|desconsidere)';
const REFAZER = '(?:de novo|denovo|novamente|refazer|recomecar|comecar de novo|gravar de novo|regravar|falar de novo|fazer de novo|outra vez)';
const QUEM = '(?:eu vou|vou|vamos|deixa eu|bora|vou ter que|tenho que|preciso)';
// ordens explícitas: valem em qualquer ponto do final (é o caso do comando colado no conteúdo)
const ORDENS = [
  { tipo: 'tudo', re: `(?:${CORTAR}|${ESQUECER}|zera) tudo(?! que| de| o que| isso que)` },
  { tipo: 'tudo', re: `${QUEM} (?:comecar|recomecar|gravar|fazer) (?:tudo )?(?:de novo )?do (?:zero|comeco|inicio)` },
  { tipo: 'anterior', re: `isso (?:ai |aqui )?(?:eu |a gente )?(?:corto|corta|cortamos|apago|apaga|tiro|tira|edito|deleto)(?: depois| na edicao| fora)?` },
  { tipo: 'anterior', re: `${CORTAR} ${OBJ}` },
  { tipo: 'anterior', re: `${ESQUECER} ${OBJ}` },
  { tipo: 'anterior', re: `${QUEM} ${REFAZER}(?! (?:pra|para|a|ao|na|no|em|ate|la)(?![a-z0-9]))` },
];
// interjeições de erro e de bastidor; onde valem: 'qualquer' lugar · 'inicioFim' (começo ou fim do final) · 'inicio' ·
// 'inteiroFim' (o final inteiro, ou o fim dele) — e sempre que estiverem coladas num comando já aceito
const SOLTAS = [
  { tipo: 'anterior', re: '(?:ops|putz)(?: (?:errei|me enrolei|falei errado))?', onde: 'qualquer' },
  { tipo: 'anterior', re: 'droga(?: (?:errei|me enrolei|falei errado))?', onde: 'inicioFim' },
  { tipo: 'anterior', re: '(?:errei|me enrolei|me embolei|falei errado|troquei tudo)(?: tudo| de novo| aqui| ai)?', onde: 'qualquer' },
  { tipo: 'anterior', re: 'nao era isso', onde: 'inicioFim' },
  { tipo: 'anterior', re: 'nao (?:pera|perai|pera ai)', onde: 'qualquer' },
  { tipo: 'anterior', re: 'nao (?:espera ai|calma)(?: ai)?', onde: 'inicioFim' },
  { tipo: 'anterior', re: '(?:comeca|recomeca|faz|grava|fala) de novo', onde: 'inicioFim' },
  { tipo: 'anterior', re: 'nao nao(?: nao)*', onde: 'inicio' },
  { tipo: 'anterior', re: '(?:de novo|outra vez|mais uma vez)', onde: 'inicio' },
  { tipo: 'anterior', re: '(?:corta|apaga|deleta)(?: ai| isso ai)?', onde: 'inteiroFim' },
  { tipo: 'bastidor', re: '(?:pera|perai|pera ai)', onde: 'qualquer' },
  { tipo: 'bastidor', re: '(?:espera ai|calma ai)', onde: 'inicioFim' },
  { tipo: 'bastidor', re: '(?:ja )?(?:ta|esta) gravando|valendo|tres dois um', onde: 'inicioFim' },
];
// quem vem antes do verbo faz dele uma descrição, não uma ordem ("o editor corta isso sozinho", "não apaga isso")
const SUJEITO = new Set(['nao', 'nunca', 'eu', 'ele', 'ela', 'eles', 'elas', 'voce', 'voces', 'nos', 'editor', 'programa', 'app', 'aplicativo', 'sistema', 'ferramenta', 'ia', 'jev', 'que', 'onde', 'quando', 'como', 'porque', 'se', 'ja', 'so', 'sempre', 'tambem', 'automaticamente']);
const ENCHE = new Set(['ah', 'eh', 'e', 'hum', 'hm', 'tipo', 'assim', 'entao', 'bom', 'ta', 'ok', 'beleza', 'ne']);
const CONJ = new Set(['e', 'ou', 'mas', 'nem']);   // "… e você pode…" é paralelismo, não recomeço (com acento: "é" não é "e")
const PESO = { tudo: 3, anterior: 2, bastidor: 1 };

export function dividir(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  const ws = palavrasCom(t);
  if (!ws.length) return [{ texto: t, i0: 0, i1: 0, comando: null }];
  const n = ws.length;
  const s = ws.map((w) => w.n).join(' ');
  const pos = []; let c = 0;
  for (const w of ws) { pos.push(c); c += w.n.length + 1; }
  const idx = (ch) => { let i = 0; while (i < n && pos[i] < ch) i++; return i; };
  const achar = (lista) => {
    const out = [];
    for (const it of lista) {
      const rx = new RegExp(`(?<![a-z0-9])(?:${it.re})(?![a-z0-9])`, 'g');
      let m;
      while ((m = rx.exec(s))) { if (m[0].length) out.push({ ...it, i: idx(m.index), j: idx(m.index + m[0].length) }); else rx.lastIndex++; }
    }
    return out;
  };
  const pausaAntes = (i) => i > 0 && /[,.;:!?…—–]/.test(t.slice(ws[i - 1].fim, ws[i].ini));
  const descreve = (i) => {
    if (i === 0 || pausaAntes(i)) return false;
    const a = ws[i - 1].n;
    return SUJEITO.has(a) || (a === 'gente' && i >= 2 && ws[i - 2].n === 'a');
  };
  const cmds = achar(ORDENS).filter((o) => !descreve(o.i));
  // as soltas entram no começo, no fim (as que podem) ou coladas num comando já aceito (em cadeia: "ops não peraí")
  let soltas = achar(SOLTAS), mudou = true;
  while (mudou) {
    mudou = false;
    soltas = soltas.filter((x) => {
      const lugar = x.onde === 'qualquer' ? !descreve(x.i)
        : x.onde === 'inicio' ? x.i === 0
        : x.onde === 'inicioFim' ? x.i === 0 || (x.j === n && !descreve(x.i))
        : (x.i === 0 && x.j === n) || (x.j === n && !descreve(x.i));
      const ok = lugar || cmds.some((o) => o.j === x.i || o.i === x.j);
      if (ok) { cmds.push(x); mudou = true; }
      return !ok;
    });
  }
  // junta os comandos que se encostam ou se cruzam; o mais forte dá o tipo
  cmds.sort((a, b) => a.i - b.i || b.j - a.j);
  const spans = [];
  for (const x of cmds) {
    const u = spans[spans.length - 1];
    if (u && x.i <= u.j) { u.j = Math.max(u.j, x.j); if (PESO[x.tipo] > PESO[u.tipo]) u.tipo = x.tipo; }
    else spans.push({ i: x.i, j: x.j, tipo: x.tipo });
  }
  // o "é", o "então" logo depois do comando ficam com ele (até 2 palavras), não com o conteúdo que vem depois
  for (const sp of spans) { let k = 0; while (k < 2 && sp.j < n - 1 && ENCHE.has(ws[sp.j].n) && !spans.some((o) => o.i === sp.j)) { sp.j++; k++; } }
  // os pedaços: conteúdo entre os comandos (dividido onde a mesma frase recomeça) e os comandos
  const brutos = [];
  let a = 0;
  for (const sp of spans) {
    if (sp.i > a) for (const [x, y] of recomecos(ws, a, sp.i, t)) brutos.push({ i0: x, i1: y, comando: null });
    brutos.push({ i0: sp.i, i1: sp.j, comando: sp.tipo });
    a = sp.j;
  }
  if (a < n) for (const [x, y] of recomecos(ws, a, n, t)) brutos.push({ i0: x, i1: y, comando: null });
  // recomeço do outro lado de um comando: "…a câmera o segundo jeito é gravar ops vou de novo o segundo jeito é…"
  // — o que vem depois do comando diz onde começou a frase que ele manda cortar (só ela sai, não o pedaço inteiro)
  for (let k = 1; k < brutos.length - 1; k++) {
    if (!brutos[k].comando || brutos[k + 1].comando) continue;
    let a = k - 1;
    while (a >= 0 && brutos[a].comando) a--;
    if (a < 0) continue;
    const A = brutos[a], B = brutos[k + 1];
    if (B.i1 - B.i0 < 3) continue;
    let corte = -1;
    for (let q = A.i1 - 3; q > A.i0; q--) if (ws[q].n === ws[B.i0].n && ws[q + 1].n === ws[B.i0 + 1].n && ws[q + 2].n === ws[B.i0 + 2].n) { corte = q; break; }
    if (corte > A.i0) { brutos.splice(a, 1, { i0: A.i0, i1: corte, comando: null }, { i0: corte, i1: A.i1, comando: null }); k++; }
  }
  // um pedaço só de "não", "é", "então" não fica sozinho: colado num comando é parte dele ("não, apaga isso");
  // senão, vai junto com o conteúdo que vem depois ("então | o segredo é" → "então o segredo é")
  for (let k = 0; k < brutos.length; k++) {
    const b = brutos[k];
    if (b.comando || !ws.slice(b.i0, b.i1).every((w) => ENCHE.has(w.n) || w.n === 'nao' || w.n === 'ops')) continue;
    const prox = brutos[k + 1], ant = brutos[k - 1];
    const viz = prox && prox.comando ? prox : ant && ant.comando ? ant : prox || null;
    if (!viz) continue;
    viz.i0 = Math.min(viz.i0, b.i0); viz.i1 = Math.max(viz.i1, b.i1);
    brutos.splice(k, 1); k--;
  }
  return brutos.map((b) => ({ ...b, texto: t.slice(ws[b.i0].ini, b.i1 < n ? ws[b.i1].ini : t.length).replace(/[\s,;:—–-]+$/, '').trim() }));
}

// onde a mesma frase recomeça dentro de um trecho de conteúdo. Dois casos:
//  - o começo do trecho se repete: "hoje eu vou mostrar como hoje eu vou mostrar três…" (2 palavras bastam se o
//    começo abandonado for curto: "o segundo o segundo jeito é…"; senão, 3);
//  - uma sequência de 3+ palavras se repete no meio: "fala pessoal hoje eu vou te mostrar hoje eu vou te mostrar como…"
//    vira "fala pessoal" | "hoje eu vou te mostrar" | "hoje eu vou te mostrar como…" (a tentativa abandonada no meio).
// Se a frase traz pontuação (texto digitado), o ponto final também separa. Quem decide se a tentativa sai é a regra
// do mesmo começo (mesmoComeco), não esta função: aqui só se acha onde dividir.
function recomecos(ws, a, b, t) {
  const cortes = new Set();
  let ini = a;
  for (let j = a + 1; j < b; j++) {
    if (t && /[.!?…]/.test(t.slice(ws[j - 1].fim, ws[j].ini))) { cortes.add(j); ini = j; continue; }
    if (CONJ.has(ws[j - 1].o)) continue;              // "… e você pode…": paralelismo, não recomeço
    const igual = (p, k) => { if (j + k > b) return false; for (let q = 0; q < k; q++) if (ws[j + q].n !== ws[p + q].n) return false; return true; };
    let achou = -1;
    if (igual(ini, j - ini <= 3 ? 2 : 3)) achou = ini;
    else for (let p = Math.max(ini + 1, j - 12); p < j - 1 && achou < 0; p++) if (igual(p, 3)) achou = p;
    if (achou < 0) continue;
    if (achou > ini) cortes.add(achou);
    cortes.add(j); ini = j;
  }
  const lista = [...cortes].sort((x, y) => x - y), out = [];
  let x0 = a;
  for (const c of lista) { if (c > x0) out.push([x0, c]); x0 = c; }
  out.push([x0, b]);
  return out;
}

// o começo de uma frase para comparar tentativas (sem o "e", o "então", o "é" do começo)
export function comecoDe(texto) {
  const w = palavrasCom(String(texto || '')).map((x) => x.n);
  let i = 0;
  while (i < w.length - 1 && ENCHE.has(w[i])) i++;
  return w.slice(i);
}
// a = tentativa anterior, b = a nova: é a mesma frase recomeçada?
//  'prefixo' a anterior é o começo da nova (ou igual a ela) · 'forte' 4+ palavras iguais no começo ·
//  'curto' começo abandonado de 2 palavras · 'medio' 3 iguais, ou 2 de uma anterior de 3 palavras ("a gente vê… a gente
//  sente" pode ser estilo): aí o código pede mais uma prova (a anterior ficou pela metade, ou o Jev viu que refez)
export function mesmoComeco(a, b) {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  if (a.length >= 2 && k === a.length) return 'prefixo';
  if (k >= 4) return 'forte';
  if (k >= 2 && a.length <= 2) return 'curto';
  if (k >= 3 || (k >= 2 && a.length === 3)) return 'medio';
  return null;
}

// ---------- 3. ligar frases ↔ trechos do VAD ----------
export function criarLigador(vad, op = {}) {
  const P = { ...PADRAO.ligar, ...op };
  let cursor = 0;            // o áudio antes disto já tem dono
  const semTexto = [];       // trechos de fala que nenhuma frase reclamou: { ini, fim, voz, manter }
  const ritmos = [];         // letras por segundo de voz das frases já ligadas (quem fala rápido, fala rápido sempre)
  const ritmo = () => {
    if (ritmos.length < 2) return P.letrasPorSeg;
    const o = ritmos.slice(-7).sort((a, b) => a - b);
    return Math.min(24, Math.max(9, o[Math.floor(o.length / 2)]));
  };
  const esperada = (t) => Math.max(0.25, letras(t) / ritmo());

  // pedaços de fala entre de e ate (trechos do VAD recortados), com a voz de cada um
  function pecas(de, ate) {
    return vad.segmentos().filter((s) => s.b > de + 1e-6 && s.a < ate - 1e-6).map((s) => {
      const a = Math.max(s.a, de), b = Math.min(s.b, ate);
      return { a, b, voz: vad.vozEntre(a, b), aberto: s.aberto && s.b >= ate - 1e-6 };
    }).filter((p) => p.voz > 0);
  }

  // frase = { texto, tFinal, tPrimeiro, tCompleto, seguinte }  →  { ini, fim, estimado, vale }
  // prox (opcional) = o que já se sabe da próxima frase: { texto, tFinal, tCompleto } se ela já fechou, ou
  //                   { texto, parcial: true } se ela ainda está sendo dita
  function ligar(frase, prox) {
    const tF = frase.tFinal;
    const D = esperada(frase.texto);
    let ps = pecas(cursor, tF);

    // a) barulho sem texto antes da frase: terminou bem antes de o reconhecedor começar a ouvir esta frase
    if (frase.tPrimeiro != null && frase.tPrimeiro < tF - 0.05) {
      const limite = frase.tPrimeiro - P.latMax;
      while (ps.length > 1 && ps[0].b < limite) {
        const p = ps.shift();
        semTexto.push({ ini: p.a, fim: p.b, voz: p.voz, manter: p.voz >= P.semTextoAte });
      }
    }
    if (!ps.length) return estimar(frase, D);

    // b) fala que começou depois de o reconhecedor já ter todas as palavras desta frase é da próxima frase
    let depois = 0;
    if (frase.tCompleto != null && frase.tCompleto < tF - 0.05) {
      while (ps.length > 1 && ps[ps.length - 1].a > frase.tCompleto) { ps.pop(); depois++; }
    }
    // c) onde a frase termina: escolhe a fronteira que melhor divide a voz entre esta frase e o que veio depois
    const ultimo = ps[ps.length - 1];
    const falando = vad.falandoEm(tF, P.folgaAtivo) && (ultimo.aberto || ultimo.b > tF - P.folgaAtivo);
    const proxima = falando || !!frase.seguinte || depois > 0 || !!prox;
    // quanto de voz deve sobrar para a próxima frase, e até onde medir:
    //  - a próxima já fechou: todas as palavras dela vieram antes de ela ficar completa → sobra ≈ tamanho dela
    //  - o parcial já existia quando esta fechou: aquelas palavras vieram antes do final desta
    let Dn = null, ateB = tF;
    if (prox && !prox.parcial && prox.texto) { Dn = esperada(prox.texto); ateB = Math.max(tF, prox.tCompleto ?? prox.tFinal ?? tF); }
    else if (frase.seguinte) Dn = esperada(frase.seguinte);
    const ini = ps[0].a;
    // candidatos a fim: o fim de cada pedaço (j = último pedaço incluído) e, dentro do último, os vales
    const cands = [];
    for (let i = 0; i < ps.length - 1; i++) cands.push({ c: ps[i].b, j: i, prof: 1, pausa: true });
    if (!falando) cands.push({ c: vad.ultimaVoz(ultimo.a, ultimo.b) ?? ultimo.b, j: ps.length - 1, prof: 1, pausa: true });
    // vales só DENTRO do último trecho (duas frases coladas no mesmo trecho), nunca no silêncio depois dele
    if (falando || ps.length === 1) for (const v of vad.vales(Math.max(ultimo.a + 0.15, ini + Math.min(0.3, D * 0.4)), Math.min(tF, ultimo.b) - 0.08)) cands.push({ c: v.t, j: ps.length - 1, prof: v.prof, pausa: v.pausa, vale: true });
    // pausa longa DENTRO da frase é rara (entre frases é o normal): cada pausa acima de 0,45 s incluída custa
    const pausaDentro = (j) => { let x = 0; for (let k = 0; k < j; k++) x += Math.max(0, ps[k + 1].a - ps[k].b - 0.45); return x; };
    // pedaço de um final dividido: a 1ª palavra do pedaço seguinte já tinha aparecido em tProxPrimeiro, então a voz
    // dele começou antes (o reconhecedor mostra a palavra ~0,3 s depois de ouvi-la): fim depois disso custa caro
    const teto = frase.tProxPrimeiro != null ? frase.tProxPrimeiro - 0.12 : null;
    let melhor = null;
    for (const k of cands) {
      const vA = vad.vozEntre(ini, k.c), vB = vad.vozEntre(k.c, ateB);
      let custo = Math.abs(vA - D) / Math.max(D, 0.4);                       // a voz bate com o tamanho do texto?
      if (proxima) custo += Dn != null ? 0.6 * Math.abs(vB - Dn) / Math.max(Dn, 0.4) : 0;   // a sobra é da próxima frase
      else custo += 1.5 * vB / Math.max(D, 0.4);                                  // sem próxima frase, sobra custa
      custo += 1.6 * pausaDentro(k.j);
      if (vA < 0.12) custo += 3;
      if (k.vale) custo += 1.1 * (1 - k.prof) + (k.pausa ? 0.1 : 0.35);
      if (teto != null && k.c > teto) custo += 3 * (k.c - teto) / 0.25;
      if (!melhor || custo < melhor.custo) melhor = { ...k, custo };
    }
    if (!melhor) return estimar(frase, D);
    const fim = melhor.c;
    cursor = Math.max(cursor, fim);
    // aprende o ritmo de quem fala (só com ligações limpas: fim numa pausa de verdade e voz suficiente)
    const vozFrase = vad.vozEntre(ini, fim);
    if (!melhor.vale && vozFrase >= 0.6 && letras(frase.texto) >= 8) ritmos.push(letras(frase.texto) / vozFrase);
    return { ini: r3(ini), fim: r3(fim), estimado: false, vale: !!melhor.vale };
  }

  // vários pedaços do mesmo final (um comando ou um recomeço no meio dele): as fronteiras entre eles são escolhidas
  // JUNTAS, para cada pedaço ficar com uma voz do tamanho do seu texto (um pedaço curto não fica com a voz do seguinte
  // só porque a pausa antes dele era curta). Liga todos menos o último, cujo fim depende do que vem depois do final
  // (fica com ligar()). Devolve null quando não dá (sem voz): aí cada pedaço é ligado sozinho.
  function ligarGrupo(fs) {
    const m = fs.length, tF = fs[0].tFinal, f0 = fs[0];
    let ps = pecas(cursor, tF);
    if (f0.tPrimeiro != null && f0.tPrimeiro < tF - 0.05) {
      const limite = f0.tPrimeiro - P.latMax;
      while (ps.length > 1 && ps[0].b < limite) { const q = ps.shift(); semTexto.push({ ini: q.a, fim: q.b, voz: q.voz, manter: q.voz >= P.semTextoAte }); }
    }
    if (!ps.length) return null;
    const ini = ps[0].a;
    const ult = fs[m - 1];
    const fimUlt = Math.min(tF, ult.tCompleto != null ? ult.tCompleto : tF);   // a última palavra dele já tinha aparecido
    const cands = [];
    for (let i = 0; i < ps.length - 1; i++) cands.push({ c: ps[i].b, prof: 1, pausa: true, vale: false });
    for (const q of ps) for (const v of vad.vales(q.a + 0.12, Math.min(tF, q.b) - 0.08)) cands.push({ c: v.t, prof: v.prof, pausa: v.pausa, vale: true });
    cands.sort((a, b) => a.c - b.c);
    const N = cands.length, INF = 1e9;
    if (N < m - 1) return null;
    const D = fs.map((f) => esperada(f.texto));
    const teto = fs.map((f) => (f.tProxPrimeiro != null ? f.tProxPrimeiro - 0.12 : null));
    const longas = (x, y) => { let t = 0; for (let k = 0; k < ps.length - 1; k++) if (ps[k].b >= x && ps[k + 1].a <= y) t += Math.max(0, ps[k + 1].a - ps[k].b - 0.45); return t; };
    const voz = (x, y, d) => { const v = vad.vozEntre(x, y); return Math.abs(v - d) / Math.max(d, 0.4) + (v < 0.12 ? 3 : 0) + 1.6 * longas(x, y); };
    const pen = (k, c) => (c.vale ? 1.1 * (1 - c.prof) + (c.pausa ? 0.1 : 0.35) : 0) + (teto[k] != null && c.c > teto[k] ? 3 * (c.c - teto[k]) / 0.25 : 0);
    // custo[k][j] = melhor custo com a fronteira k (entre o pedaço k e o k+1) no candidato j
    const custo = [], de = [];
    for (let k = 0; k < m - 1; k++) {
      custo.push(new Array(N).fill(INF)); de.push(new Array(N).fill(-1));
      for (let j = 0; j < N; j++) {
        const c = cands[j];
        if (k === 0) { custo[0][j] = voz(ini, c.c, D[0]) + pen(0, c); continue; }
        for (let i = 0; i < j; i++) {
          if (custo[k - 1][i] >= INF || cands[i].c > c.c - 0.1) continue;
          const v = custo[k - 1][i] + voz(cands[i].c, c.c, D[k]) + pen(k, c);
          if (v < custo[k][j]) { custo[k][j] = v; de[k][j] = i; }
        }
      }
    }
    let melhor = -1, mc = INF;
    for (let j = 0; j < N; j++) {
      if (custo[m - 2][j] >= INF) continue;
      const v = custo[m - 2][j] + 0.6 * voz(cands[j].c, Math.max(cands[j].c, fimUlt), D[m - 1]);
      if (v < mc) { mc = v; melhor = j; }
    }
    if (melhor < 0) return null;
    const idx = [];
    for (let k = m - 2, j = melhor; k >= 0; k--) { idx.unshift(j); j = de[k][j]; }
    const bordas = [ini, ...idx.map((j) => cands[j].c)];
    const spans = [];
    for (let k = 0; k < m - 1; k++) {
      const pk = pecas(bordas[k], bordas[k + 1]);
      const a = pk.length ? pk[0].a : bordas[k], b = bordas[k + 1];
      const vozK = vad.vozEntre(a, b);
      if (!cands[idx[k]].vale && vozK >= 0.6 && letras(fs[k].texto) >= 8) ritmos.push(letras(fs[k].texto) / vozK);
      spans.push({ ini: r3(a), fim: r3(b), estimado: false, vale: !!cands[idx[k]].vale });
    }
    cursor = Math.max(cursor, bordas[m - 1]);
    return spans;
  }

  // sem voz nenhuma para a frase (fala baixa demais para o VAD): estima pelo tempo do final
  function estimar(frase, D) {
    const fim = Math.max(cursor + 0.3, frase.tFinal - 0.55);
    const ini = Math.max(cursor, fim - D);
    cursor = Math.max(cursor, fim);
    return { ini: r3(ini), fim: r3(fim), estimado: true, vale: false };
  }

  // fim da gravação: o que sobrou depois da última frase é trecho sem texto
  function finalizar(tFim) {
    for (const p of pecas(cursor, tFim)) semTexto.push({ ini: p.a, fim: p.b, voz: p.voz, manter: p.voz >= P.semTextoAte });
    cursor = tFim;
  }

  return { ligar, ligarGrupo, finalizar, semTexto, esperada, get ritmo() { return ritmo(); }, get cursor() { return cursor; } };
}

// ---------- 3b. a sessão: VAD + leitor + ligador, e QUANDO ligar cada frase ----------
// A frase k é ligada ao áudio quando (a) a frase k+1 já fechou, (b) houve 0,7 s de silêncio e já passou 1 s do final
// dela, ou (c) 2 s depois do final; no fim da gravação, todas. O Jev não espera isto: ele decide pelo texto na hora.
// aoFechar(frase) → objeto da frase (a tela cria o bloco); aoLigar(obj, span) quando o tempo dela fica pronto.
export function criarSessao({ aoFechar, aoLigar, vad: opVad, ligar: opLigar } = {}) {
  const vad = criarVad(opVad), lig = criarLigador(vad, opLigar);
  const fila = [];
  const leitor = criarFrases((f) => { fila.push({ f, obj: aoFechar ? aoFechar(f) : { ...f } }); });
  function ligarProntas(tudo) {
    while (fila.length) {
      const [k, prox] = fila;
      const t = vad.agora, tF = k.f.tFinal;
      const pronta = tudo || (t >= tF + 0.05 && (prox || (t >= tF + 1.0 && vad.silencio >= 0.7) || t >= tF + 2.0));
      if (!pronta) break;
      fila.shift();
      // o que vem depois: os outros pedaços do mesmo final (juntos), senão a próxima frase, senão o parcial
      const resto = [];
      for (const it of fila) { if (it.f.grupo == null || it.f.grupo !== k.f.grupo) break; resto.push(it.f); }
      // pedaços do mesmo final: as fronteiras entre eles saem juntas; o último pedaço segue o caminho de sempre
      if (resto.length) {
        const spans = lig.ligarGrupo([k.f, ...resto]);
        if (spans) {
          const itens = [k, ...fila.slice(0, resto.length - 1)];
          fila.splice(0, resto.length - 1);
          itens.forEach((it, i) => { Object.assign(it.obj, spans[i]); if (aoLigar) aoLigar(it.obj, spans[i]); });
          continue;
        }
      }
      const u = resto[resto.length - 1];
      const ev = u ? { texto: resto.map((x) => x.texto).join(' '), tFinal: u.tFinal, tCompleto: u.tCompleto }
        : prox ? { texto: prox.f.texto, tFinal: prox.f.tFinal, tCompleto: prox.f.tCompleto } : (leitor.parcial ? { texto: leitor.parcial, parcial: true } : null);
      const span = lig.ligar(k.f, ev);
      Object.assign(k.obj, span);
      if (aoLigar) aoLigar(k.obj, span);
    }
  }
  return {
    vad, lig, leitor,
    quadros(dbs) { vad.empurrar(dbs); ligarProntas(false); },
    texto(final, parcial, t) { leitor.receber(final, parcial, t); ligarProntas(false); },
    // fim da gravação: o parcial que sobrou vira a última frase, e tudo é ligado
    fechar(tFim) {
      leitor.fecharParcial(tFim);
      leitor.limpar();
      vad.fechar();
      ligarProntas(true);
      lig.finalizar(tFim);
    },
    get pendentes() { return fila.length; },
  };
}

// ---------- 4. plano da emenda ----------
// itens: [{ ini, fim, manter }] em ordem (frases e trechos sem texto). Devolve as regiões do original que ficam.
// aparar = tira o silêncio antes da 1ª fala e depois da última (no fim); ao vivo fica false.
export function planoDaEmenda(itens, duracao, op = {}) {
  const P = { ...PADRAO.emenda, ...op };
  const aparar = op.aparar !== false;
  const lista = itens.filter((x) => x && x.fim > x.ini).map((x) => ({ ini: Math.max(0, x.ini), fim: Math.min(duracao, x.fim), manter: !!x.manter }))
    .sort((a, b) => a.ini - b.ini);
  const regioes = [];
  let i = 0, silencio = 0;
  while (i < lista.length) {
    if (!lista[i].manter) { i++; continue; }
    let j = i;
    while (j + 1 < lista.length && lista[j + 1].manter) j++;
    const antesCorte = i > 0 ? lista[i - 1] : null, depoisCorte = j + 1 < lista.length ? lista[j + 1] : null;
    let a = antesCorte ? Math.max(antesCorte.fim + P.folga, lista[i].ini - P.antes) : (aparar ? lista[i].ini - P.antes : 0);
    let b = depoisCorte ? Math.min(depoisCorte.ini - P.folga, lista[j].fim + P.depois) : (aparar ? lista[j].fim + P.depois : duracao);
    a = Math.max(0, Math.min(a, lista[i].ini)); b = Math.min(duracao, Math.max(b, lista[j].fim));
    // silêncios longos dentro do que fica viram pausas curtas
    let ca = a;
    for (let k = i; k < j; k++) {
      const gap = lista[k + 1].ini - lista[k].fim;
      if (gap > P.pausaMax) {
        regioes.push([ca, lista[k].fim + P.pausaCurta / 2]);
        silencio += gap - P.pausaCurta;
        ca = lista[k + 1].ini - P.pausaCurta / 2;
      }
    }
    regioes.push([ca, b]);
    i = j + 1;
  }
  const limpas = regioes.map(([a, b]) => [r3(a), r3(b)]).filter(([a, b]) => b - a > 0.06);
  const xf = P.xfade;
  const soma = limpas.reduce((s, [a, b]) => s + (b - a), 0);
  const duracaoEditada = Math.max(0, soma - Math.max(0, limpas.length - 1) * xf);
  return { regioes: limpas, duracao: r3(duracao), duracaoEditada: r3(duracaoEditada), cortado: r3(Math.max(0, duracao - duracaoEditada)), silencioEncurtado: r3(silencio), xfade: xf, borda: P.borda };
}

// tempo do original → tempo da versão editada (null se o instante foi cortado)
export function paraEditado(t, plano) {
  let off = 0;
  for (let i = 0; i < plano.regioes.length; i++) {
    const [a, b] = plano.regioes[i];
    if (t >= a && t <= b) return off + (t - a);
    off += (b - a) - plano.xfade;
  }
  return null;
}
// e o contrário (para o cursor da versão editada voltar ao lugar no original)
export function paraOriginal(te, plano) {
  let off = 0;
  for (const [a, b] of plano.regioes) {
    const len = b - a;
    if (te <= off + len) return a + Math.max(0, te - off);
    off += len - plano.xfade;
  }
  const u = plano.regioes[plano.regioes.length - 1];
  return u ? u[1] : 0;
}

// ---------- 5. a emenda (amostra por amostra, com crossfade de potência constante) ----------
export function emendar(pcm, sr, plano) {
  const R = plano.regioes.map(([a, b]) => [Math.max(0, Math.round(a * sr)), Math.min(pcm.length, Math.round(b * sr))]).filter(([a, b]) => b > a);
  const nx = Math.max(1, Math.round(plano.xfade * sr));
  const out = new Float32Array(R.reduce((s, [a, b]) => s + (b - a), 0));
  let pos = 0;
  R.forEach(([a, b], i) => {
    // da 2ª região em diante, os primeiros nx samples se misturam com o fim da anterior (o ar da sala não "pula")
    const m = i ? Math.min(nx, b - a, pos) : 0;
    for (let k = 0; k < m; k++) {
      const th = ((k + 0.5) / m) * (Math.PI / 2);
      out[pos - m + k] = out[pos - m + k] * Math.cos(th) + pcm[a + k] * Math.sin(th);
    }
    for (let s = a + m; s < b; s++) out[pos++] = pcm[s];
  });
  const res = out.subarray(0, pos);
  const nb = Math.min(Math.round(plano.borda * sr), Math.floor(res.length / 2));
  for (let k = 0; k < nb; k++) { const g = k / nb; res[k] *= g; res[res.length - 1 - k] *= g; }
  return res;
}

// ---------- 6. as decisões: o que o Jev respondeu vira "fica", "sai" ou "pela metade (esperando)" ----------
// medidos nos testes: refaz/continua positivos ficam em 0,57–0,93 e negativos em no máximo 0,27
// O código decide sozinho o que é regra explícita:
//  - comando de edição (dividir): sai o comando e, se ele mandar, o que foi dito antes (ou tudo);
//  - a mesma frase recomeçada (mesmoComeco): só a ÚLTIMA tentativa fica. Se a última ficar pela metade e for
//    abandonada, a tentativa anterior volta a valer (só sai quando a nova se completa).
// Cortar sem a pessoa mandar é o erro mais caro deste app: os limiares são altos de propósito.
// `refaz` mais alto porque "recomeçou a mesma frase" tira a frase anterior do corte.
export const LIMIAR = { tipo: 0.5, refaz: 0.62, continua: 0.5, apagar: 0.6, refazComeco: 0.35 };
// frase longa só sai com evidência forte: hesitação/bastidor são curtos por natureza
const LONGA = { palavras: 7, confianca: 0.8 };
export const MOTIVO = { hesitacao: 'hesitação', bastidor: 'bastidor', metade: 'pela metade', repeticao: 'repetição', refeita: 'refeita', apagada: 'mandou cortar', comando: 'comando', manual: 'você cortou', sem_texto: 'sem fala' };
const JANELA = { frases: 10, segundos: 45 };   // até onde olhar para trás atrás de outra tentativa da mesma frase

export function criarEdicao(op = {}) {
  const L = { ...LIMIAR, ...op };
  const frases = [];
  let nConteudo = 0;

  function nova(texto, extra = {}) {
    const f = { n: frases.length + 1, texto, status: 'pendente', motivo: null, gancho: null, manual: false, ...extra };
    frases.push(f);
    return f;
  }
  const chave = (f) => (f.manual ? (f.status === 'cortada' ? 'manual_cortada' : 'manual_mantida') : f.status === 'cortada' ? 'cortada_' + (f.motivo || 'bastidor') : f.status);
  const antes = (f) => frases.slice(0, f.n - 1);
  const porN = (n) => frases[n - 1];
  // a frase inteira: a cabeça (a parte que começou) e as continuações dela
  const cabeca = (x) => { let y = x; while (y.continua) y = porN(y.continua); return y; };
  const corrente = (x) => { const out = [x]; let y = x; while (y.continuadaPor) { y = porN(y.continuadaPor); out.push(y); } return out; };

  // com qual frase comparar ("refez a anterior?"): a mais recente que não é bastidor, hesitação ou repetição
  function comparavel(f) {
    for (const x of antes(f).reverse()) {
      if (x.comando) continue;
      if (['mantida', 'suspensa', 'pendente'].includes(x.status)) return x;
      if (x.status === 'cortada' && x.motivo === 'metade' && !x.manual) return x;   // vira "refeita" se for refeita
      if (x.status === 'cortada' && ['hesitacao', 'bastidor', 'repeticao'].includes(x.motivo)) continue;
      return null;
    }
    return null;
  }
  // a frase pela metade que ainda espera a continuação (pula as hesitações no caminho)
  function suspensa(f) {
    for (const x of antes(f).reverse()) {
      if (x.status === 'suspensa') return x;
      if (x.status === 'cortada' && x.motivo === 'hesitacao') continue;
      return null;
    }
    return null;
  }

  // o que vai para o Jev (jogada "frase")
  function dadosPara(f) {
    const c = comparavel(f), m = suspensa(f);
    f._c = c; f._m = m;
    return {
      frase: f.texto,
      anteriores: antes(f).slice(-3).map((x) => ({ texto: x.texto, status: chave(x) })),
      ...(c ? { comparar: c.texto } : {}),
      ...(m ? { metade: m.texto } : {}),
      ...(nConteudo < 2 ? { abertura: true } : {}),
      ...(comecoDe(f.texto).length <= 14 ? { curta: true } : {}),   // frase curta: pode ser uma ordem para a edição
    };
  }

  function por(f, status, motivo) {
    if (f.manual) return false;
    if (f.status === status && f.motivo === motivo) return false;
    f.status = status; f.motivo = motivo;
    return true;
  }
  function cortarFrase(x, motivo, mud, marca) {
    for (const y of corrente(cabeca(x))) if (por(y, 'cortada', motivo)) { mud.add(y); Object.assign(y, marca); }
  }

  // o que foi dito antes do comando "corta isso": a frase inteira mais recente (pula hesitações e bastidores)
  function ditoAntes(f) {
    for (const x of antes(f).reverse()) {
      if (x.comando === 'bastidor') continue;
      if (x.comando) return null;                     // outro comando já cortou: não volta mais para trás
      if (x.manual) return null;                      // você decidiu essa frase no clique: o comando não mexe nela
      if (x.status === 'cortada' && ['hesitacao', 'bastidor'].includes(x.motivo)) continue;
      if (x.status === 'cortada' && x.motivo === 'apagada') return null;
      return x;
    }
    return null;
  }

  // comando de edição (do código, ou o Jev ouviu uma ordem de cortar): não passa pelas outras regras
  function aplicarComando(f) {
    const mud = new Set([f]);
    f.status = 'cortada'; f.motivo = 'comando'; f.confianca = f.confianca ?? 1;
    if (f.comando === 'tudo') {
      for (const x of antes(f)) if (x.status !== 'cortada' && por(x, 'cortada', 'apagada')) { mud.add(x); x.apagadaPor = f.n; }
    } else if (f.comando === 'anterior') {
      const alvo = ditoAntes(f);
      if (alvo) cortarFrase(alvo, 'apagada', mud, { apagadaPor: f.n });
    } else {
      // "peraí", "tá gravando": só ele sai; a frase pela metade de antes não vai ser continuada
      const m = suspensa(f);
      if (m && por(m, 'cortada', 'metade')) mud.add(m);
    }
    return [...mud];
  }

  // as tentativas anteriores da MESMA frase (mesmo começo) que a frase f encerra: só a última tentativa fica
  function tentativas(f, refazC) {
    const out = [];
    const b = comecoDe(f.texto);
    if (b.length < 2 || f.continua) return out;
    let vistas = 0;
    for (const x of antes(f).reverse()) {
      if (++vistas > JANELA.frases) break;
      if (f.tFinal != null && x.tFinal != null && f.tFinal - x.tFinal > JANELA.segundos) break;
      if (x.manual || x.comando || x.continua) continue;
      if (x.status === 'cortada' && x.motivo !== 'metade') continue;
      const tipo = mesmoComeco(comecoDe(x.texto), b);
      if (!tipo) continue;
      // 3 palavras iguais podem ser paralelismo ("você pode gravar… você pode gravar…"): precisa de mais uma prova
      if (tipo === 'medio' && !(x.status === 'suspensa' || x.motivo === 'metade' || (x === f._c && refazC >= L.refazComeco))) continue;
      out.push(x);
    }
    return out;
  }
  function encerrarTentativas(f, lista, mud) {
    for (const x of lista || []) cortarFrase(x, 'refeita', mud, { refeitaPor: f.n });
    if (lista && lista.length) f.refez = f.refez || lista[0].n;
  }

  // r = respostas do Jev ({ tipo, refaz, continua, gancho, apagar }); devolve as frases que mudaram
  function aplicar(f, r) {
    if (f.comando) return aplicarComando(f);
    const mud = new Set([f]);
    const pt = (r && r.tipo && r.tipo.probabilities) || {};
    const [top, pTop] = Object.entries(pt).sort((a, b) => b[1] - a[1])[0] || ['conteudo', 1];
    let tipo = top !== 'conteudo' && pTop >= L.tipo ? top : 'conteudo';
    // frase longa classificada como hesitação/bastidor/repetição com pouca confiança continua sendo conteúdo:
    // sem isso, uma frase normal da gravação podia "sair" sem ninguém ter mandado cortar
    const palavras = String(f.texto || '').trim().split(/\s+/).filter(Boolean).length;
    if (tipo !== 'conteudo' && tipo !== 'metade' && palavras >= LONGA.palavras && pTop < LONGA.confianca) tipo = 'conteudo';
    const refaz = r && r.refaz ? r.refaz.noul : 0, apagar = r && r.apagar ? r.apagar.noul : 0;
    let continua = r && r.continua ? r.continua.noul : 0;
    const c = f._c, m = f._m;
    f.probs = { tipo: pt, refaz: r && r.refaz ? refaz : null, continua: r && r.continua ? continua : null, apagar: r && r.apagar ? apagar : null };
    f.confianca = tipo === 'conteudo' ? (pt.conteudo ?? 1) : pTop;
    if (r && r.gancho && r.gancho.probabilities) f.gancho = +Object.entries(r.gancho.probabilities).sort((a, b) => b[1] - a[1])[0][0];
    // o Jev ouviu uma ordem de cortar que o código não conhecia ("isso não ficou bom, de novo"): vira comando
    if (apagar >= L.apagar && ['bastidor', 'hesitacao'].includes(tipo) && palavras <= 8) { f.comando = 'anterior'; f.confianca = apagar; return aplicarComando(f); }
    const novas = ['bastidor', 'hesitacao'].includes(tipo) ? [] : tentativas(f, refaz);
    if (m && novas.includes(m)) continua = 0;          // recomeçou a frase do zero: não é a continuação dela
    if (novas.length && tipo === 'repeticao') tipo = 'conteudo';
    let continuou = false;
    if (m && continua >= L.continua && continua >= refaz && !['bastidor', 'hesitacao'].includes(tipo)) {
      // a frase de antes não estava abandonada: esta é a continuação dela
      if (por(m, 'mantida', null)) mud.add(m);
      m.continuadaPor = f.n; f.continua = m.n; continuou = true;
      if (tipo !== 'metade') tipo = 'conteudo';
      if (tipo === 'conteudo') { const h = cabeca(m); encerrarTentativas(h, h._tentativas, mud); h._tentativas = null; }   // a frase ficou inteira: as tentativas de antes saem
    } else if (c && refaz >= L.refaz && !['bastidor', 'hesitacao'].includes(tipo) && !novas.includes(c)) {
      // nova tentativa da anterior (o Jev viu, mesmo sem o mesmo começo): a anterior sai
      if (tipo === 'metade') novas.push(c);
      else { cortarFrase(c, 'refeita', mud, { refeitaPor: f.n }); f.refez = c.n; }
      if (tipo === 'repeticao') tipo = 'conteudo';
    }
    if (tipo === 'conteudo') { por(f, 'mantida', null); nConteudo++; }
    else if (tipo === 'metade') por(f, 'suspensa', null);
    else por(f, 'cortada', tipo);
    // a mesma frase recomeçada: as tentativas de antes saem quando esta fica; se esta ficou pela metade, esperam
    if (f.status === 'mantida') encerrarTentativas(f, novas, mud);
    else if (f.status === 'suspensa') f._tentativas = novas;
    // a frase pela metade que ninguém continuou: sai (uma hesitação no meio ainda deixa esperar)
    if (m && !continuou && m.status === 'suspensa' && tipo !== 'hesitacao' && por(m, 'cortada', 'metade')) mud.add(m);
    return [...mud];
  }

  // a pessoa clica num bloco: troca fica ↔ sai (e o Jev não muda mais essa frase)
  function alternar(f) {
    const sai = f.status !== 'cortada';
    f.manual = false;
    por(f, sai ? 'cortada' : 'mantida', sai ? 'manual' : null);
    f.manual = true;
    return f;
  }

  // fim da gravação: o que ainda espera vira decisão
  function resolverFim() {
    const mud = [];
    for (const f of frases) {
      if (f.status === 'suspensa' && por(f, 'cortada', 'metade')) mud.push(f);
      if (f.status === 'pendente' && por(f, 'mantida', null)) mud.push(f);
    }
    return mud;
  }

  return { frases, nova, dadosPara, aplicar, aplicarComando, alternar, resolverFim, get nConteudo() { return nConteudo; } };
}

// itens para o plano: as frases (com o tempo que o ligador achou) e os trechos sem texto
export function itensDoPlano(frases, semTexto = []) {
  return [
    ...frases.filter((f) => f.ini != null && f.fim > f.ini).map((f) => ({ ini: f.ini, fim: f.fim, manter: f.status !== 'cortada' })),
    ...semTexto.map((s) => ({ ini: s.ini, fim: s.fim, manter: !!s.manter })),
  ];
}

// ---------- 7. a demonstração: o reconhecedor simulado em cima das frases medidas ----------
// um parcial pouco depois de cada palavra e o final ~0,6 s depois de a voz acabar (como o Chrome faz)
export function eventosDoRoteiro(frases, { atrasoPalavra = 0.32, atrasoFinal = 0.62 } = {}) {
  const ev = [];
  let final = '', tUlt = 0;
  for (const f of frases) {
    const ditas = [];
    for (const [p, , t1] of f.palavras) {
      ditas.push(p);
      ev.push({ t: r3(Math.max(t1 + atrasoPalavra, tUlt + 0.01)), final, parcial: ditas.join(' ') });
    }
    final = (final + ' ' + f.texto).trim();
    tUlt = Math.max(f.voz[1] + atrasoFinal, tUlt + 0.02);
    ev.push({ t: r3(tUlt), final, parcial: '' });
  }
  return ev;
}

// ---------- karaokê: o tempo de cada palavra, espalhado pela voz da frase ----------
export function palavrasNoTempo(texto, ini, fim, vad) {
  const ps = String(texto || '').split(/\s+/).filter(Boolean);
  if (!ps.length) return [];
  const pesos = ps.map((p) => Math.max(1, letras(p)) + 1);
  const W = pesos.reduce((s, x) => s + x, 0);
  // quadros com voz dentro da frase (se o VAD não tiver voz, espalha por igual)
  const marcas = [];
  if (vad) {
    const v = vad.vozes;
    for (let i = Math.floor(ini / QUADRO); i < Math.min(v.length, Math.ceil(fim / QUADRO)); i++) if (v[i]) marcas.push(i * QUADRO);
  }
  const tempo = (fr) => {
    if (marcas.length < 4) return ini + fr * (fim - ini);
    const x = fr * (marcas.length - 1), i = Math.floor(x);
    return marcas[i] + (x - i) * QUADRO;
  };
  let acc = 0;
  return ps.map((p, i) => { const t0 = tempo(acc / W); acc += pesos[i]; return { p, t0: r3(t0), t1: r3(i === ps.length - 1 ? fim : tempo(acc / W)) }; });
}

// ---------- .wav (PCM 16 bits, mono) ----------
export function wav(pcm, sr) {
  const n = pcm.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return new Uint8Array(buf);
}

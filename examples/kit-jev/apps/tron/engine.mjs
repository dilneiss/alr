// Motor do Tron: arena, colisões, sensores (flood fill + território) e o robô clássico.
// O Jev recebe os sensores de cada opção (reto/esquerda/direita) e ESCOLHE; nada aqui decide pelo Jev,
// exceto o "robô clássico" (adversário) e o fallback honesto quando a decisão do Jev chega atrasada.

export const W = 48, H = 32;
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0 norte (cima), 1 leste, 2 sul, 3 oeste
export const DIR_NOME = ['norte (para cima)', 'leste (para a direita)', 'sul (para baixo)', 'oeste (para a esquerda)'];
export const MOVES = { seguir_reto: 0, virar_esquerda: 3, virar_direita: 1 };
export const MOVE_IDS = Object.keys(MOVES);
const idx = (x, y) => y * W + x;
const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ------------------------------------------------------------------ partida
// Largadas sorteadas (frente a frente), nunca simétricas: com estados espelhados, dois Jevs jogariam espelhado.
export function largadas(rnd = Math.random) {
  const r = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  for (;;) {
    const a = { x: r(7, 11), y: r(9, 22), dir: 1 }, b = { x: r(36, 40), y: r(9, 22), dir: 3 };
    const espelhoPonto = b.x === W - 1 - a.x && b.y === H - 1 - a.y;
    const espelhoLinha = b.x === W - 1 - a.x && b.y === a.y;
    if (!espelhoPonto && !espelhoLinha) return [a, b];
  }
}

export function novaArena(bikes, starts = largadas()) {
  const board = new Uint8Array(W * H);
  const B = bikes.map((b, i) => ({ ...b, i, x: starts[i].x, y: starts[i].y, dir: starts[i].dir, vivo: true, causa: null, crash: null, len: 1 }));
  for (const b of B) board[idx(b.x, b.y)] = b.i + 1;
  return { board, bikes: B, k: 0, fim: null };
}

export function destino(b, move) {
  const d = (b.dir + (MOVES[move] ?? 0)) % 4;
  return { d, x: b.x + DIRS[d][0], y: b.y + DIRS[d][1] };
}

// Aplica um passo simultâneo. moves[i] = 'seguir_reto' | 'virar_esquerda' | 'virar_direita'.
export function passo(A, moves) {
  A.k++;
  const vivos = A.bikes.filter((b) => b.vivo);
  const prox = new Map(vivos.map((b) => [b.i, destino(b, moves[b.i] || 'seguir_reto')]));
  const mortes = [];
  for (const b of vivos) {
    const n = prox.get(b.i);
    let causa = null;
    if (!dentro(n.x, n.y)) causa = 'parede';
    else if (A.board[idx(n.x, n.y)]) causa = A.board[idx(n.x, n.y)] === b.i + 1 ? 'proprio' : 'rastro';
    else if (vivos.some((o) => o !== b && prox.get(o.i).x === n.x && prox.get(o.i).y === n.y)) causa = 'frente';
    if (causa) mortes.push({ b, causa, n });
  }
  for (const m of mortes) { m.b.vivo = false; m.b.causa = m.causa; m.b.crash = { x: Math.max(0, Math.min(W - 1, m.n.x)), y: Math.max(0, Math.min(H - 1, m.n.y)) }; }
  for (const b of vivos) {
    if (!b.vivo) continue;
    const n = prox.get(b.i);
    b.dir = n.d; b.x = n.x; b.y = n.y; b.len++;
    A.board[idx(b.x, b.y)] = b.i + 1;
  }
  const restam = A.bikes.filter((b) => b.vivo);
  if (restam.length <= 1) A.fim = { vencedor: restam.length ? restam[0].i : null, k: A.k };
  return mortes.map((m) => ({ i: m.b.i, causa: m.causa }));
}

// ------------------------------------------------------------------ busca em largura
const Q = new Int32Array(W * H);
function bfs(board, sx, sy, dist0, bloqueio = -1) {
  const dist = new Int16Array(W * H).fill(-1);
  let h = 0, t = 0;
  const s = idx(sx, sy);
  dist[s] = dist0; Q[t++] = s;
  while (h < t) {
    const c = Q[h++], x = c % W, y = (c / W) | 0, nd = dist[c] + 1;
    if (x > 0) { const v = c - 1; if (dist[v] < 0 && !board[v] && v !== bloqueio) { dist[v] = nd; Q[t++] = v; } }
    if (x < W - 1) { const v = c + 1; if (dist[v] < 0 && !board[v] && v !== bloqueio) { dist[v] = nd; Q[t++] = v; } }
    if (y > 0) { const v = c - W; if (dist[v] < 0 && !board[v] && v !== bloqueio) { dist[v] = nd; Q[t++] = v; } }
    if (y < H - 1) { const v = c + W; if (dist[v] < 0 && !board[v] && v !== bloqueio) { dist[v] = nd; Q[t++] = v; } }
  }
  return { dist, n: t };
}

// ------------------------------------------------------------------ sensores de uma moto
export function sensores(A, bi) {
  const b = A.bikes[bi];
  const o = A.bikes.find((x) => x.i !== bi);
  const oVivo = o && o.vivo;
  const oProx = oVivo ? [0, 1, 3].map((t) => { const d = (o.dir + t) % 4; return [o.x + DIRS[d][0], o.y + DIRS[d][1]]; }).filter(([x, y]) => dentro(x, y) && !A.board[idx(x, y)]) : [];
  const opcoes = {};
  for (const id of MOVE_IDS) {
    const n = destino(b, id);
    if (!dentro(n.x, n.y) || A.board[idx(n.x, n.y)]) {
      const cel = dentro(n.x, n.y) ? A.board[idx(n.x, n.y)] : 0;
      opcoes[id] = { bate: true, motivo: !dentro(n.x, n.y) ? 'na parede' : cel === b.i + 1 ? 'no próprio rastro' : 'no rastro do oponente' };
      continue;
    }
    const c = idx(n.x, n.y);
    A.board[c] = 255; // ocupa a casa nova durante a análise
    const meu = bfs(A.board, n.x, n.y, 1);
    let reta = 0; { let x = n.x + DIRS[n.d][0], y = n.y + DIRS[n.d][1]; while (dentro(x, y) && !A.board[idx(x, y)]) { reta++; x += DIRS[n.d][0]; y += DIRS[n.d][1]; } }
    A.board[c] = 0;
    // espaço: casas vazias alcançáveis a partir da casa nova (inclui a própria)
    let espaco = 1, terr = 1, terrOp = 0, contato = false;
    const md = meu.dist;
    for (let v = 0; v < W * H; v++) if (md[v] > 1) espaco++;
    if (oVivo) {
      const op = bfs(A.board, o.x, o.y, 0, c).dist;
      for (let v = 0; v < W * H; v++) {
        if (v === c || A.board[v]) continue;
        const a = md[v], e = op[v];
        if (a > 0 && e > 0) { contato = true; if (a < e) terr++; else if (e < a) terrOp++; }
        else if (a > 0) terr++;
        else if (e > 0) terrOp++;
      }
    } else terr = espaco;
    opcoes[id] = {
      bate: false,
      risco_de_frente: oProx.some(([x, y]) => x === n.x && y === n.y),
      espaco, reta, territorio: terr, territorio_oponente: terrOp, separados: !contato,
    };
  }
  let oponente = null;
  if (o) {
    const f = DIRS[b.dir], l = DIRS[(b.dir + 3) % 4];
    const dx = o.x - b.x, dy = o.y - b.y;
    const rel = (o.dir - b.dir + 4) % 4;
    oponente = {
      vivo: oVivo,
      frente: dx * f[0] + dy * f[1],
      esquerda: dx * l[0] + dy * l[1],
      distancia: Math.abs(dx) + Math.abs(dy),
      direcao: ['a mesma direção que você', 'para a sua direita', 'na direção contrária à sua', 'para a sua esquerda'][rel],
    };
  }
  return { opcoes, oponente };
}

// ------------------------------------------------------------------ robô clássico (e fallback)
// Heurística clássica de Tron: nunca bater, maximizar o espaço acessível, preferir seguir reto.
export function roboClassico(A, bi, s = sensores(A, bi)) {
  let best = 'seguir_reto', score = -Infinity;
  for (const id of MOVE_IDS) {
    const o = s.opcoes[id];
    const sc = o.bate ? -1e9 : o.espaco * 4 - (o.risco_de_frente ? 800 : 0) + (id === 'seguir_reto' ? 2 : 0);
    if (sc > score) { score = sc; best = id; }
  }
  return best;
}

// ------------------------------------------------------------------ regiões isoladas (fim antecipado)
// Se as motos ficam em regiões que não se tocam, a partida é decidida pelo espaço de cada uma.
export function espacoDaMoto(A, bi) {
  const b = A.bikes[bi];
  let melhor = 0;
  for (const [dx, dy] of DIRS) {
    const x = b.x + dx, y = b.y + dy;
    if (!dentro(x, y) || A.board[idx(x, y)]) continue;
    melhor = Math.max(melhor, bfs(A.board, x, y, 1).n);
  }
  return melhor;
}
export function isoladas(A) {
  const [a, b] = A.bikes;
  if (!a || !b || !a.vivo || !b.vivo) return false;
  const d = bfs(A.board, a.x, a.y, 0).dist;
  for (const [dx, dy] of DIRS) { const x = b.x + dx, y = b.y + dy; if (dentro(x, y) && d[idx(x, y)] > 0) return false; }
  return true;
}

// ------------------------------------------------------------------ o que vai para o Jev
function textoOponente(op, cor) {
  if (!op) return 'sem oponente';
  if (!op.vivo) return `a moto ${cor} já bateu`;
  const fr = op.frente === 0 ? 'na sua altura' : op.frente > 0 ? `${op.frente} casas à frente` : `${-op.frente} casas atrás`;
  const lado = op.esquerda === 0 ? 'na mesma linha' : op.esquerda > 0 ? `${op.esquerda} à esquerda` : `${-op.esquerda} à direita`;
  return `moto ${cor}: ${fr} e ${lado} (distância ${op.distancia}), indo ${op.direcao}`;
}

// Visão de uma moto: sensores de cada opção, já calculados pelo código (o Jev só compara e escolhe).
export function visaoMoto(A, bi, s = sensores(A, bi)) {
  const b = A.bikes[bi];
  const o = A.bikes.find((x) => x.i !== bi);
  const livres = MOVE_IDS.filter((id) => !s.opcoes[id].bate);
  const maxEsp = Math.max(0, ...livres.map((id) => s.opcoes[id].espaco));
  const opcoes = {};
  for (const id of MOVE_IDS) {
    const x = s.opcoes[id];
    if (x.bate) { opcoes[id] = `BATE ${x.motivo} (derrota)`; continue; }
    opcoes[id] = {
      casa: x.risco_de_frente ? 'livre, mas o oponente pode entrar nela junto: risco de batida de frente' : 'livre',
      espaco: x.espaco,
      beco: x.espaco < Math.min(60, maxEsp * 0.6),
      territorio: x.territorio,
      territorio_oponente: x.territorio_oponente,
      vantagem: x.territorio - x.territorio_oponente,
      livre_em_frente: x.reta,
    };
  }
  const separados = livres.length > 0 && livres.every((id) => s.opcoes[id].separados);
  return {
    voce: `moto ${b.cor} na coluna ${b.x + 1} de ${W} e linha ${b.y + 1} de ${H}, indo para o ${DIR_NOME[b.dir]}`,
    oponente: textoOponente(s.oponente, o ? o.cor : ''),
    situacao: !o || !o.vivo ? 'sozinho na arena' : separados ? 'regiões separadas: só importa o espaço' : 'disputando a mesma região',
    opcoes,
  };
}

export const REGRAS = 'Tron 48×32: cada moto deixa rastro; bater na parede ou em qualquer rastro é derrota; duas motos na mesma casa batem as duas. espaco = casas que você ainda alcança; territorio = casas que você alcança antes do oponente.';

export function perguntasMoto(cor, chave = '') {
  const s = chave ? `_${chave}` : '';
  return {
    [`movimento${s}`]: {
      type: 'choice',
      instructions: `Você pilota a moto ${cor}. Escolha o movimento deste passo: nunca uma opção que BATE; evite risco de batida de frente e beco; prefira mais espaço; com espaços parecidos, prefira mais vantagem de território (cortar o oponente).`,
      criteria: {
        seguir_reto: 'Seguir reto: manter a direção',
        virar_esquerda: 'Virar à esquerda',
        virar_direita: 'Virar à direita',
      },
    },
    [`modo${s}`]: {
      type: 'choice',
      instructions: `Qual estratégia descreve o momento da moto ${cor}?`,
      criteria: {
        sobreviver: 'Sobreviver: regiões separadas, espaço apertado ou becos por perto; o foco é não bater',
        atacar: 'Atacar: disputando a região, alguma opção dá vantagem de território clara; cortar o caminho do oponente',
        fugir: 'Fugir: oponente a poucas casas ou risco de batida de frente; abrir distância',
      },
    },
  };
}

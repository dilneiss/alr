// Tron: Você vs Jev — servidor autoritativo por partida.
// A cada passo o Jev decide seguir_reto / virar_esquerda / virar_direita lendo sensores da arena (espaço por flood fill,
// território, risco de batida). Pipeline: assim que um tick é aplicado, o pedido da decisão do próximo tick já sai.
// O intervalo do tick se ajusta à latência medida do Jev; decisão que chega depois do tick vira fallback determinístico
// (opção com mais espaço) e é contada honestamente como "fora do tempo".
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp, HttpError } from '../../shared/server/kit.mjs';
import { W, H, MOVE_IDS, novaArena, passo, sensores, roboClassico, visaoMoto, perguntasMoto, REGRAS, isoladas, espacoDaMoto } from './engine.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(DIR, 'data-runtime');
fs.mkdirSync(DATA_DIR, { recursive: true });

const MODOS = {
  humano: { nome: 'Você vs Jev', motos: [{ id: 'jev', nome: 'Jev', cor: 'azul', hex: '#22d3ee', ctrl: 'jev' }, { id: 'voce', nome: 'Você', cor: 'laranja', hex: '#fb923c', ctrl: 'humano' }] },
  robo: { nome: 'Jev vs Robô clássico', motos: [{ id: 'jev', nome: 'Jev', cor: 'azul', hex: '#22d3ee', ctrl: 'jev' }, { id: 'robo', nome: 'Robô clássico', cor: 'amarela', hex: '#facc15', ctrl: 'robo' }] },
  jevjev: { nome: 'Jev vs Jev', motos: [{ id: 'jev', nome: 'Jev azul', cor: 'azul', hex: '#22d3ee', ctrl: 'jev' }, { id: 'jev2', nome: 'Jev rosa', cor: 'rosa', hex: '#f472b6', ctrl: 'jev' }] },
};
const MAX_TICKS = 700;          // teto por partida (≈ US$ 0,03 no pior caso)
const MAX_ATIVAS = 16;          // partidas simultâneas no servidor
const MAX_POR_IP = 2;           // partidas simultâneas por IP
const T_MIN = 240, T_MAX = 700; // limites do tick adaptativo (ms)
const CONTAGEM = 3;

// ---------------------------------------------------------------- placar do dia (persistido)
const PLACAR_FILE = path.join(DATA_DIR, 'placar.json');
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const placarVazio = () => ({ dia: hoje(), humano: { jev: 0, humano: 0, empate: 0 }, robo: { jev: 0, robo: 0, empate: 0 }, jevjev: { azul: 0, rosa: 0, empate: 0 }, partidas: 0, decisoes: 0, noTempo: 0, custo: 0 });
let placar = placarVazio();
try { const p = JSON.parse(fs.readFileSync(PLACAR_FILE, 'utf8')); if (p && p.dia) placar = { ...placarVazio(), ...p }; } catch {}
function placarHoje() { if (placar.dia !== hoje()) placar = placarVazio(); return placar; }
const salvarPlacar = () => fs.writeFile(PLACAR_FILE, JSON.stringify(placar), () => {});

// ---------------------------------------------------------------- latência global (para o tick inicial)
const latGlobal = [];
const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const clampT = (t) => Math.max(T_MIN, Math.min(T_MAX, Math.round(t)));
// prazo do tick = folga sobre a latência medida: max(p90 + 90 ms, p95 + 40 ms)
const alvoTick = (l) => clampT(Math.max(pct(l, 0.9) + 90, pct(l, 0.95) + 40));
const tickInicial = () => { const l = latGlobal.slice(-60); return l.length < 8 ? 520 : alvoTick(l); };
let orcamentoAcabouAte = 0;

// ---------------------------------------------------------------- partida
const PARTIDAS = new Map();

class Partida {
  constructor(modo, ip) {
    this.id = crypto.randomBytes(9).toString('base64url');
    this.modo = modo; this.ip = ip; this.criada = Date.now();
    this.A = novaArena(MODOS[modo].motos);
    for (const b of this.A.bikes) b.path = [[b.x, b.y]];
    this.T = tickInicial();
    this.estado = 'aguardando'; // aguardando | contagem | rodando | pausada | fim
    this.clientes = new Set();
    this.teclas = [];
    this.pend = new Map();      // tick alvo → { [moto]: decisão }
    this.debugs = [];           // chamadas concluídas desde o último tick (vão para o inspetor)
    this.lat = [];
    this.st = { decisoes: 0, noTempo: 0, chamadas: 0, erros: 0, custo: 0, inicio: null, fim: null };
    this.timer = null; this.proximo = 0; this.abandono = null; this.aviso = null;
    this.limpeza = setTimeout(() => { if (!this.clientes.size && this.estado === 'aguardando') this.encerrar('abandonada'); }, 20000);
  }

  get jevs() { return this.A.bikes.filter((b) => b.ctrl === 'jev'); }
  enviar(ev, obj) { for (const c of this.clientes) c.send(ev, obj); }

  resumoMotos() { return this.A.bikes.map((b) => ({ i: b.i, id: b.id, nome: b.nome, cor: b.cor, hex: b.hex, ctrl: b.ctrl, x: b.x, y: b.y, dir: b.dir, vivo: b.vivo, causa: b.causa, crash: b.crash })); }
  stats() {
    const lat = this.lat;
    return {
      decisoes: this.st.decisoes, noTempo: this.st.noTempo, pctNoTempo: this.st.decisoes ? this.st.noTempo / this.st.decisoes : 1,
      latUltima: lat.length ? lat[lat.length - 1] : null, latMedia: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
      latP90: pct(lat, 0.9), custo: this.st.custo, chamadas: this.st.chamadas, T: this.T,
    };
  }

  conectar(ch) {
    this.clientes.add(ch);
    clearTimeout(this.abandono); this.abandono = null;
    ch.send('inicio', {
      id: this.id, modo: this.modo, nomeModo: MODOS[this.modo].nome, W, H, T: this.T, k: this.A.k, estado: this.estado,
      motos: this.resumoMotos().map((m, i) => ({ ...m, path: this.A.bikes[i].path })), stats: this.stats(),
    });
    if (this.estado === 'aguardando' || (this.estado === 'pausada' && !this.pausaManual)) this.contagem();
    if (this.estado === 'fim') ch.send('fim', this.resultado);
  }
  desconectar(ch) {
    this.clientes.delete(ch);
    if (this.clientes.size || this.estado === 'fim') return;
    this.pausar(false);
    this.abandono = setTimeout(() => this.encerrar('abandonada'), 30000);
  }

  contagem() {
    clearTimeout(this.timer);
    this.estado = 'contagem';
    let n = CONTAGEM;
    const passoContagem = () => {
      if (this.estado !== 'contagem') return;
      this.enviar('contagem', { n });
      if (n === 1) this.pedirDecisoes(this.A.k + 1);
      if (n === 0) { this.estado = 'rodando'; this.st.inicio ||= Date.now(); this.proximo = performance.now() + this.T; this.agendar(); return; }
      n--; this.timer = setTimeout(passoContagem, n === 0 ? 700 : 1000);
    };
    passoContagem();
  }

  pausar(manual) {
    if (this.estado !== 'rodando' && this.estado !== 'contagem') return;
    clearTimeout(this.timer);
    this.estado = 'pausada'; this.pausaManual = !!manual;
    this.pend.clear();
    this.enviar('pausa', { manual: !!manual });
  }
  retomar() { if (this.estado === 'pausada') { this.pausaManual = false; this.contagem(); } }

  agendar() {
    const espera = Math.max(0, this.proximo - performance.now());
    this.timer = setTimeout(() => this.tick(), espera);
  }

  teclaHumano(dir) {
    const h = this.A.bikes.find((b) => b.ctrl === 'humano');
    if (!h || !h.vivo) return false;
    const ultima = this.teclas.length ? this.teclas[this.teclas.length - 1] : h.dir;
    if (dir === ultima || dir === (ultima + 2) % 4) return false;
    if (this.teclas.length >= 2) return false; // buffer de 2 comandos
    this.teclas.push(dir);
    return true;
  }
  moveHumano(b) {
    if (!this.teclas.length) return 'seguir_reto';
    const d = this.teclas.shift();
    return d === (b.dir + 1) % 4 ? 'virar_direita' : d === (b.dir + 3) % 4 ? 'virar_esquerda' : 'seguir_reto';
  }

  tick() {
    if (this.estado !== 'rodando') return;
    const alvo = this.A.k + 1;
    const decididas = this.pend.get(alvo) || {};
    this.pend.delete(alvo);
    const moves = {}, jev = [];
    for (const b of this.A.bikes) {
      if (!b.vivo) continue;
      if (b.ctrl === 'jev') {
        const d = decididas[b.i];
        this.st.decisoes++;
        if (d && d.move) { moves[b.i] = d.move; this.st.noTempo++; jev.push({ i: b.i, ...d, noTempo: true }); }
        else { moves[b.i] = roboClassico(this.A, b.i); jev.push({ i: b.i, move: moves[b.i], noTempo: false, fallback: true }); }
      } else if (b.ctrl === 'humano') moves[b.i] = this.moveHumano(b);
      else moves[b.i] = roboClassico(this.A, b.i);
    }
    const mortes = passo(this.A, moves);
    for (const b of this.A.bikes) if (b.vivo && (b.path[b.path.length - 1][0] !== b.x || b.path[b.path.length - 1][1] !== b.y)) b.path.push([b.x, b.y]);
    if (!this.A.fim && this.A.k >= 30 && isoladas(this.A)) {
      const e = [espacoDaMoto(this.A, 0), espacoDaMoto(this.A, 1)];
      this.A.fim = { vencedor: e[0] > e[1] ? 0 : e[1] > e[0] ? 1 : null, k: this.A.k, isoladas: true, espacos: e };
    }
    if (!this.A.fim && this.A.k >= MAX_TICKS) this.A.fim = { vencedor: null, k: this.A.k, tempo: true };

    // ajuste do tick à latência real: sobe rápido quando uma decisão atrasa, desce devagar quando sobra folga
    if (jev.some((j) => !j.noTempo) && this.A.k - (this.ultimoAjuste || 0) >= 2) { this.T = clampT(this.T + 25); this.ultimoAjuste = this.A.k; }
    if (this.A.k % 8 === 0 && this.lat.length >= 8) {
      const alvoT = alvoTick(this.lat.slice(-40));
      this.T = alvoT > this.T ? alvoT : clampT(this.T - (this.T - alvoT) * 0.2);
    }

    const debugs = this.debugs; this.debugs = [];
    this.enviar('tick', { k: this.A.k, T: this.T, motos: this.resumoMotos(), mortes, jev, stats: this.stats(), aviso: this.aviso, ...(debugs.length ? { _jev: debugs } : {}) });
    this.aviso = null;
    if (this.A.fim) return this.finalizar();
    this.pedirDecisoes(this.A.k + 1);
    this.proximo += this.T;
    if (this.proximo < performance.now() - this.T) this.proximo = performance.now(); // não acumula atraso
    this.agendar();
  }

  pedirDecisoes(alvo) {
    const vivos = this.jevs.filter((b) => b.vivo);
    if (!vivos.length || this.pend.has(alvo) || this.pedindo === alvo) return;
    if (Date.now() < orcamentoAcabouAte) { this.aviso = 'O orçamento de demonstração do Jev acabou por hoje: a moto do Jev está no piloto automático (heurística), e isso conta como decisão fora do tempo.'; return; }
    this.pedindo = alvo;
    const dupla = this.modo === 'jevjev';
    const sens = new Map(vivos.map((b) => [b.i, sensores(this.A, b.i)]));
    let state, questions;
    if (dupla) {
      state = { regras: REGRAS };
      questions = {};
      for (const b of vivos) { state[`moto_${b.cor}`] = visaoMoto(this.A, b.i, sens.get(b.i)); Object.assign(questions, perguntasMoto(b.cor, b.cor)); }
    } else {
      const b = vivos[0];
      state = { regras: REGRAS, ...visaoMoto(this.A, b.i, sens.get(b.i)) };
      questions = perguntasMoto(b.cor);
    }
    const resumo = (s) => Object.fromEntries(MOVE_IDS.map((id) => { const o = s.opcoes[id]; return [id, o.bate ? { bate: true } : { espaco: o.espaco, territorio: o.territorio, oponente: o.territorio_oponente, risco: o.risco_de_frente }]; }));
    const t0 = performance.now();
    this.st.chamadas++;
    app.jev({ state, questions }).then((r) => {
      const lat = Math.round(performance.now() - t0);
      this.lat.push(lat); if (this.lat.length > 200) this.lat.shift();
      latGlobal.push(lat); if (latGlobal.length > 80) latGlobal.shift();
      this.st.custo += r.cost || 0;
      if (this.estado === 'contagem') this.T = clampT(Math.max(this.T, lat + 130)); // calibra o prazo antes da largada
      const aTempo = this.A.k < alvo && (this.estado === 'rodando' || this.estado === 'contagem');
      this.debugs.push({ ...r.debug, label: aTempo ? `passo ${alvo}` : `passo ${alvo} · atrasou` });
      if (this.debugs.length > 4) this.debugs.shift();
      if (!aTempo) return;
      const dec = {};
      for (const b of vivos) {
        const suf = dupla ? `_${b.cor}` : '';
        const mv = r.answers[`movimento${suf}`], md = r.answers[`modo${suf}`];
        dec[b.i] = {
          move: MOVE_IDS.includes(mv?.choice) ? mv.choice : null, probs: mv?.probabilities || {}, confianca: mv?.confidence,
          modo: md?.choice || null, modoProbs: md?.probabilities || {}, lat, sensores: resumo(sens.get(b.i)),
        };
      }
      this.pend.set(alvo, dec);
    }).catch((e) => {
      this.st.erros++;
      if (e.code === 'budget_exhausted') { orcamentoAcabouAte = Date.now() + 10 * 60 * 1000; this.aviso = e.message; }
      else if (e.code === 'gateway_down') this.aviso = 'O Jev não respondeu agora (gateway indisponível): usando o piloto automático até ele voltar.';
    }).finally(() => { if (this.pedindo === alvo) this.pedindo = null; });
  }

  finalizar() {
    clearTimeout(this.timer);
    this.estado = 'fim'; this.st.fim = Date.now();
    const f = this.A.fim, bikes = this.A.bikes;
    const venc = f.vencedor == null ? null : bikes[f.vencedor];
    const perdedor = venc ? bikes.find((b) => b !== venc) : null;
    const quem = (b) => (b.ctrl === 'humano' ? 'Você' : b.nome);
    const deQuem = (b) => (b.ctrl === 'humano' ? 'que você deixou' : `do ${b.nome}`);
    const CAUSA = { parede: () => 'bateu na parede', proprio: () => 'bateu no próprio rastro', rastro: (v) => `bateu no rastro ${deQuem(v)}`, frente: () => 'bateu de frente' };
    let motivo;
    if (f.isoladas) motivo = `Regiões isoladas: ${quem(bikes[0])} ficou com ${f.espacos[0]} casas livres e ${quem(bikes[1])} com ${f.espacos[1]}. Vence quem tem mais espaço.`;
    else if (f.tempo) motivo = 'Tempo esgotado: empate.';
    else if (!venc) motivo = 'As duas motos bateram no mesmo passo: empate.';
    else motivo = `${quem(perdedor)} ${(CAUSA[perdedor.causa] || (() => 'bateu'))(venc)}.`;
    const P = placarHoje();
    const contou = this.A.k >= 5;
    if (contou) {
      const lado = this.modo === 'humano' ? (venc ? (venc.ctrl === 'jev' ? 'jev' : 'humano') : 'empate')
        : this.modo === 'robo' ? (venc ? (venc.ctrl === 'jev' ? 'jev' : 'robo') : 'empate')
        : (venc ? venc.cor : 'empate');
      P[this.modo][lado]++;
      P.partidas++; P.decisoes += this.st.decisoes; P.noTempo += this.st.noTempo; P.custo += this.st.custo;
      salvarPlacar();
    }
    this.resultado = {
      vencedor: venc ? { i: venc.i, nome: venc.nome, cor: venc.cor, hex: venc.hex, ctrl: venc.ctrl } : null,
      motivo, k: this.A.k, duracao_ms: (this.st.fim - (this.st.inicio || this.st.fim)), stats: this.stats(), placar: placarPublico(), contou,
      isoladas: !!f.isoladas, espacos: f.espacos || null,
    };
    this.enviar('fim', this.resultado);
    setTimeout(() => { for (const c of this.clientes) c.close(); }, 800);
    setTimeout(() => PARTIDAS.delete(this.id), 60000);
  }

  encerrar(motivo) {
    clearTimeout(this.timer); clearTimeout(this.limpeza); clearTimeout(this.abandono);
    if (this.estado !== 'fim') { this.estado = 'fim'; this.resultado = { abandonada: true, motivo }; this.enviar('fim', this.resultado); }
    for (const c of this.clientes) c.close();
    PARTIDAS.delete(this.id);
  }
}

function placarPublico() {
  const P = placarHoje();
  return { dia: P.dia, humano: P.humano, robo: P.robo, jevjev: P.jevjev, partidas: P.partidas, pctNoTempo: P.decisoes ? P.noTempo / P.decisoes : null, decisoes: P.decisoes };
}

function partida(id) {
  const p = PARTIDAS.get(String(id || ''));
  if (!p) throw new HttpError(404, 'Essa partida já acabou. Comece outra!', 'sem_partida');
  return p;
}

// ---------------------------------------------------------------- rotas
const app = createApp({ name: 'tron', publicDir: new URL('./public/', import.meta.url) });

app.get('/api/info', () => ({ ok: true, W, H, placar: placarPublico(), tick: tickInicial(), ativas: [...PARTIDAS.values()].filter((p) => p.estado !== 'fim').length }));

app.post('/api/partida', ({ body, ip }) => {
  const modo = String(body.modo || '');
  if (!MODOS[modo]) throw new HttpError(400, 'Modo inválido. Use "humano", "robo" ou "jevjev".');
  if (Date.now() < orcamentoAcabouAte) throw new HttpError(429, 'O orçamento de demonstração do Jev acabou por hoje. Volte amanhã!', 'budget_exhausted');
  const minhas = [...PARTIDAS.values()].filter((p) => p.ip === ip && p.estado !== 'fim').sort((a, b) => a.criada - b.criada);
  while (minhas.length >= MAX_POR_IP) minhas.shift().encerrar('substituida');
  if ([...PARTIDAS.values()].filter((p) => p.estado !== 'fim').length >= MAX_ATIVAS) throw new HttpError(429, 'A arena está lotada agora. Tente de novo em alguns segundos!', 'arena_lotada');
  const p = new Partida(modo, ip);
  PARTIDAS.set(p.id, p);
  return { ok: true, id: p.id, modo, nomeModo: MODOS[modo].nome, W, H, T: p.T };
}, { rate: 12 });

app.get('/api/partida/:id/sse', ({ params, sse }) => {
  const p = partida(params.id);
  const ch = sse();
  p.conectar(ch);
  ch.onclose = () => p.desconectar(ch);
}, { rate: 40 });

app.post('/api/partida/:id/tecla', ({ params, body }) => {
  const p = partida(params.id);
  if (p.modo !== 'humano') throw new HttpError(400, 'Neste modo você só assiste.');
  const dir = Number(body.dir);
  if (![0, 1, 2, 3].includes(dir)) throw new HttpError(400, 'Direção inválida.');
  const aceita = (p.estado === 'rodando' || p.estado === 'contagem') && p.teclaHumano(dir);
  return { ok: true, aceita, buffer: p.teclas.length };
}, { rate: 400 });

app.post('/api/partida/:id/pausa', ({ params, body }) => {
  const p = partida(params.id);
  if (body.pausar) p.pausar(true); else p.retomar();
  return { ok: true, estado: p.estado };
}, { rate: 60 });

app.post('/api/partida/:id/sair', ({ params }) => {
  const p = PARTIDAS.get(String(params.id || ''));
  if (p) p.encerrar('saiu');
  return { ok: true };
}, { rate: 60 });

app.start(+(process.env.PORT || 4114));

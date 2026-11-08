// As entradas de cenário. Variante é DADO, não desenho:
//   { base, paleta?, props?, camadas?, interior?, vazio?, atmosfera? }
// - paleta: sobrescreve gradientes nomeados que a base define
// - props: peças de cenarios-pecas.js posicionadas com semente fixa por id
// - camadas: substitui longe/meio/perto/frente inteira (só quando paleta+props não bastam)
// Regra de ouro: sem `camadas`, a variante NÃO introduz geometria nova.
import { BASES } from './cenarios-base.js';
import * as P from './cenarios-pecas.js';

// quantos cenários o app deve ter no fim do trabalho (guarda em scripts/test-cena-nasce-mega.mjs)
export const META = { cenariosEsperados: 100 };

export const VARIANTES = {
  // ---------- os 19 lugares que já existiam (variante comum = base pura) ----------
  campo: { base: 'campo' },
  praia: { base: 'praia' },
  floresta: { base: 'floresta' },
  cidade: { base: 'cidade' },
  espaco: { base: 'espaco' },
  fundo_do_mar: { base: 'fundo_do_mar' },
  castelo: { base: 'castelo' },
  deserto: { base: 'deserto' },
  montanha: { base: 'montanha' },
  fazenda: { base: 'fazenda' },
  escola: { base: 'escola' },
  casa_quarto: { base: 'casa_quarto' },
  nether: { base: 'nether' },
  the_end: { base: 'the_end' },
  mina_caverna: { base: 'mina_caverna' },
  galpao_hubiss: { base: 'galpao_hubiss' },
  loja_celit: { base: 'loja_celit' },
  datacenter_datasnap: { base: 'datacenter_datasnap' },
  clinica_qualhora: { base: 'clinica_qualhora' },

  // ---------- variantes sem props: paleta, interior, vazio ou atmosfera ----------
  campo_florido: { base: 'campo', props: ['florzinhas'] },
  floresta_outono: { base: 'floresta', paleta: { copa: ['#d98a3d', '#8a4b1f'] }, props: ['folhas_secas'] },
  floresta_encantada: { base: 'floresta', paleta: { copa: ['#7c3aed', '#2e1065'] }, props: ['cogumelos_brilhantes'], atmosfera: 'vagalumes' },
  floresta_queimada: { base: 'floresta', paleta: { copa: ['#4b3a2a', '#1f1a16'] }, props: ['troncos_queimados'] },
  praia_deserta: { base: 'praia', vazio: true },
  praia_cheia: { base: 'praia', props: ['guardasol'] },
  praia_rochosa: {
    base: 'praia',
    camadas: { perto: () => P.svg(P.pedras(P.rnd(31), 40, 700, 900, '#7b8794') + P.costao('#8b9aa8', 700)) },
    atmosfera: 'maresia',
  },
  deserto_dunas: { base: 'deserto', paleta: { areia: ['#f3d08a', '#c98b3f'] } },
  deserto_oasis: { base: 'deserto', props: ['palmeiras', 'lago'] },
  montanha_pico_gelado: { base: 'montanha', paleta: { rocha: ['#e5eef7', '#8fa8bf'] }, props: ['neve_acumulada'] },
  cidade_vilarejo: { base: 'cidade', paleta: { parede: ['#e8d9c5', '#b08968'] } },
  cidade_metropole: { base: 'cidade', paleta: { ceu: ['#334155', '#0f172a'] } },
  castelo_em_festa: { base: 'castelo', props: ['bandeirinhas', 'tochas'] },
  castelo_ruinas: { base: 'castelo', props: ['ruinas'] },
  espaco_lua: { base: 'espaco', paleta: { ceu: ['#0b1026', '#1e1b4b'] } },
  espaco_planeta_alienigena: { base: 'espaco', paleta: { ceu: ['#1b1040', '#4c1d95'] }, props: ['cristais'] },
  espaco_nebulosa: { base: 'espaco', paleta: { ceu: ['#2a0a3f', '#831843'] }, atmosfera: 'nebulosa' },
  fundo_do_mar_recife: { base: 'fundo_do_mar', props: ['cristais'] },
  fundo_do_mar_fossa: { base: 'fundo_do_mar', paleta: { agua: ['#0b2540', '#020617'] } },
  escola_sala_de_aula: { base: 'escola', interior: true },
  escola_vazia_de_ferias: { base: 'escola', vazio: true },
  casa_sala: { base: 'casa_quarto', interior: true },
  casa_cozinha: { base: 'casa_quarto', interior: true },
  casa_banheiro: { base: 'casa_quarto', interior: true },
  fazenda_curral: { base: 'fazenda', vazio: true },
  nether_fortaleza: { base: 'nether', props: ['tochas'] },
  the_end_ilha_do_dragao: { base: 'the_end', vazio: true },
  mina_caverna_trilhos: { base: 'mina_caverna', props: ['tochas'] },
  galpao_hubiss_black_friday: { base: 'galpao_hubiss', interior: true, props: ['caixas_muitas'] },
  galpao_hubiss_esteira_parada: { base: 'galpao_hubiss', interior: true, vazio: true },
  datacenter_datasnap_pane_nos_servidores: { base: 'datacenter_datasnap', interior: true, props: ['tochas'] },
  clinica_qualhora_sala_de_espera_cheia: { base: 'clinica_qualhora', interior: true, props: ['macas'] },
};

// props disponíveis: nome -> (rnd, chao) => string SVG
export const PROPS = {
  florzinhas: (r, chao) => P.florzinhas(r, 30, chao, 900, ['#fff', '#ff8fb5', '#ffd84a']),
  folhas_secas: (r, chao) => P.folhasSecas(r, 40, chao, 900),
  troncos_queimados: (r, chao) => P.troncosQueimados(r, 12, chao - 30, 890),
  neve_acumulada: (r, chao) => P.neveAcumulada(r, 30, chao - 20, 900),
  cristais: (r, chao) => Array.from({ length: 6 }, (_, i) => P.cristais(-100 + i * 320, chao + 20, 60 + (i % 3) * 20)).join(''),
  tochas: (r, chao) => P.tochas(r, 8, chao - 60, chao + 120),
  bandeirinhas: () => P.bandeirinhas(300),
  caixas_muitas: (r, chao) => P.caixas(r, 60, chao, 900),
  macas: (r, chao) => P.macas(r, 3, chao + 60, 880),
  ruinas: () => P.ruinas(200, 690, 260) + P.ruinas(1250, 690, 220),
  guardasol: () => '',
  cogumelos_brilhantes: (r, chao) => Array.from({ length: 14 }, (_, i) => {
    const x = -150 + i * 145, y = chao + 40 + (i % 4) * 30, t = 14 + (i % 3) * 6;
    return `<rect x="${x - t * 0.16}" y="${y - t}" width="${t * 0.32}" height="${t}" fill="#e5e7eb"/>`
      + `<ellipse cx="${x}" cy="${y - t}" rx="${t * 0.9}" ry="${t * 0.55}" fill="#a78bfa"/>`
      + `<ellipse cx="${x}" cy="${y - t}" rx="${t * 0.9}" ry="${t * 0.55}" fill="#c4b5fd" opacity=".45"/>`;
  }).join(''),
  palmeiras: (r, chao) => Array.from({ length: 5 }, (_, i) => {
    const x = -100 + i * 420, t = 210 + (i % 3) * 40;
    return `<rect x="${x - 7}" y="${chao - t}" width="14" height="${t}" fill="#8b5e3c" rx="4"/>`
      + `<path d="M${x} ${chao - t} q-70 -30 -110 10 M${x} ${chao - t} q70 -40 120 -6 M${x} ${chao - t} q-10 -50 -60 -70 M${x} ${chao - t} q30 -50 80 -60" stroke="#2f8a3b" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  }).join(''),
  lago: () => `<ellipse cx="1200" cy="760" rx="360" ry="70" fill="#38bdf8" opacity=".85"/>`,
};

// resolvedor: base + variante -> { longe, meio, perto, frente, luzes, chao, ceu, interior, agua }
export function resolver(id, u) {
  const v = VARIANTES[id];
  if (!v) return null;
  const base = BASES[v.base];
  if (!base) return null;
  const c = base(u, id);
  const chao = c.chao || 690;
  const r = P.rnd(P.hashDe(id));

  let extra = '';
  if (!v.vazio && v.props) {
    for (const nome of v.props) {
      const p = PROPS[nome];
      if (p) extra += p(r, chao);
    }
  }
  if (v.atmosfera === 'maresia') extra += P.poeira('#e8d7a8', 0.22);
  if (v.atmosfera === 'nebulosa') extra += P.poeira('#c4b5fd', 0.3);
  if (v.atmosfera === 'vagalumes') extra += P.poeira('#f9ff9e', 0.28);

  const camadas = {
    longe: c.longe,
    meio: c.meio + extra,
    perto: v.camadas && v.camadas.perto ? v.camadas.perto() : c.perto,
    frente: c.frente,
    luzes: c.luzes,
  };
  if (v.camadas && v.camadas.longe) camadas.longe = v.camadas.longe();
  if (v.camadas && v.camadas.meio) camadas.meio = v.camadas.meio();

  return {
    id,
    ceu: c.ceu || 'ceu',
    interior: v.interior != null ? v.interior : !!c.interior,
    chao,
    agua: c.agua || null,
    camadas,
  };
}

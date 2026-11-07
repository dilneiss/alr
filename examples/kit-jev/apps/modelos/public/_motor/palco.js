// Motor "palco": o app traz a própria tela (o arquivo de spec.palco.modulo, na pasta do app) e o motor dá o resto:
// as chamadas ao Jev (jogadas), a voz, a fita das chamadas, os efeitos de som, o inspetor, a demonstração e o pacote.
//
// O módulo do app exporta: montar(api) → { tocar(sinal) }   (tocar = a demonstração automática do ▶)
//   api.jev(jogada, dados, rotulo, { silencioso }) → respostas do Jev ({ chave: resposta }) — as perguntas saem da jogada
//                                     no app.config.mjs; silencioso: falha sem aviso na tela (chamadas periódicas de jogo)
//   api.ultima()                    → uma versão de api.jev em que só a resposta da chamada MAIS NOVA vale (as velhas viram null)
//   api.voz.barraVoz({...})         → microfone + digitação + exemplos (ver voz.js); api.voz.SR = o reconhecedor de voz
//                                     do navegador (null quando não há: aí só digitação e exemplos)
//   api.som                         → efeitos de som (pop, acerto, erro, apito, torcida… e laser, explosao, poder)
//   api.ui                          → el, esc, fmt, toast, modal, sleep, debounce, reduzMovimento, barras, anel
//   api.fita                        → a fita que mostra cada chamada chegando (latência, decisões, custo)
//   api.area, api.spec, api.contexto, api.url(caminho) → endereço de um arquivo da pasta do app
import { el, esc, fmt, toast, modal, sleep, debounce, reduzMovimento, barras, anel, topo, confiancaDe, nivelDe } from './ui.js';
import * as voz from './voz.js';
import { som } from './som.js';

function carregarCss(href) {
  return new Promise((ok) => {
    const l = el('link', { rel: 'stylesheet', href });
    l.onload = ok; l.onerror = ok;
    document.head.append(l);
  });
}

function criarFita() {
  const no = el('div', { class: 'mj-fita', 'aria-hidden': 'true' });
  function add(r) {
    const d = r && r._jev; if (!d) return;
    const p = el('span', { class: 'mj-fita-p' + (d.cached ? ' cache' : ''), html:
      `<i>⚡</i><b>${esc(d.cached ? 'cache' : fmt.ms(d.latency_ms))}</b><span>${fmt.int(d.n_questions)} ${d.n_questions === 1 ? 'decisão' : 'decisões'}</span><span>${esc(fmt.usd(d.cost))}</span>` });
    for (const v of no.children) v.classList.add('velha');   // a mais nova fica sempre nítida (legível no vídeo)
    no.prepend(p);
    while (no.children.length > 3) no.lastChild.remove();
  }
  return { no, add };
}

export async function criar({ spec, area, decidir, contexto }) {
  const P = spec.palco || {};
  document.body.classList.add('mj-com-palco');
  if (P.telaCheia !== false) document.body.classList.add('mj-tela-cheia');
  const url = (c) => new URL(c, document.baseURI).href;
  if (P.css) await carregarCss(url(P.css));
  const fita = criarFita();

  async function jev(jogada, dados, rotulo, opcoes) {
    const r = await decidir({ jogada, dados: dados || {} }, rotulo || jogada, opcoes);
    fita.add(r);
    return r.respostas || {};
  }
  function ultima() {
    let n = 0;
    return async (jogada, dados, rotulo, opcoes) => {
      const meu = ++n;
      const r = await jev(jogada, dados, rotulo, opcoes);
      return meu === n ? r : null;
    };
  }

  const mod = await import(url(P.modulo));
  if (typeof mod.montar !== 'function') throw new Error(`${P.modulo} precisa exportar montar(api)`);
  const app = await mod.montar({
    spec, area, contexto, jev, ultima, voz, som, fita, url,
    ui: { el, esc, fmt, toast, modal, sleep, debounce, reduzMovimento, barras, anel, topo, confiancaDe, nivelDe },
  });
  if (!fita.no.isConnected) area.append(fita.no);
  return { tocar: (sinal) => (app && typeof app.tocar === 'function' ? app.tocar(sinal) : Promise.resolve()) };
}

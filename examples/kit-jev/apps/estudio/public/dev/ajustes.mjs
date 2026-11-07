// Conferência dos AJUSTES LIVRES DE ESTILO (public/js/ajustes-css.mjs) sem a interface do estúdio: desenha uma peça a
// partir de uma fixture real do Jev (public/dev/fixtures/) com uma lista de ajustes (preset ou JSON na URL).
// Local: python3 -m http.server 4136 --directory apps/estudio → http://127.0.0.1:4136/public/dev/ajustes.html
// Parâmetros:
//   ?peca=site|posts|email|anuncios   &fix=burger   &o=hero:central,paleta:luxo   (trocas de decisão, como na galeria)
//   &aj=<preset>[+<preset>…] ou &ajj=<JSON de ajustes>   &modo=painel|ampliado|exportavel
//   site: a página VIRA o site (document.write), para a captura ter o viewport de verdade (390, 1280…).
// window.__pronto = true quando tudo foi desenhado (Playwright).
import { montar } from '../js/contexto.mjs';
import { fontFaceCSS } from '../js/marca.mjs';

const qs = new URLSearchParams(location.search);
const PECA = qs.get('peca') || 'site';
const MODO = qs.get('modo') || 'painel';
const AGORA = new Date('2026-09-24T10:00:00-03:00');
const TODAS = ['site', 'posts', 'email', 'anuncios'];

// ajustes de exemplo, no formato do contrato (dev/CONTRATO-AJUSTES.md)
const aj = (prop, elemento, valor, pecas = TODAS, rotulo = '') => ({ id: `${prop}|${pecas.join('+')}|${elemento}`, prop, pecas, elemento, valor, rotulo, comando: rotulo, p: 0.9 });
const PRESETS = {
  nenhum: [],
  // as 3 frases de referência, na ordem (o degradê substitui o fundo sólido: mesmo id)
  ref1: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#1f9d55'], direcao: 'vertical' }, ['site'], 'Fundo verde')],
  ref2: [aj('caixa', 'tudo', 'maiusculas', TODAS, 'Todas as fontes em caixa alta')],
  ref3: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#1f9d55', '#ffffff'], direcao: 'vertical' }, ['site'], 'Fundo em degradê verde → branco')],
  navy: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#1b2a4a'] }, ['site'], 'Fundo azul-marinho')],
  verde2: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#1f6f3c', '#ffffff'], direcao: 'vertical' }, TODAS, 'Degradê verde-escuro → branco')],
  verde3: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#22c55e', '#ffffff'], direcao: 'vertical' }, TODAS, 'Degradê verde-limão → branco')],
  dvt: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#2e9e4f', '#ffffff'], direcao: 'vertical' }, TODAS)],
  dh: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#2e9e4f', '#ffffff'], direcao: 'horizontal' }, TODAS)],
  dd: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#1b2a4a', '#6d28d9'], direcao: 'diagonal' }, TODAS)],
  dr: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#f59e0b', '#fff7ed'], direcao: 'radial' }, TODAS)],
  pb: [aj('fundo', 'pagina', { tipo: 'degrade', cores: ['#000000', '#ffffff'], direcao: 'vertical' }, TODAS)],
  preto: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#111111'] }, TODAS)],
  marinho: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#1b2a4a'] }, TODAS)],
  bege: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#efe4d0'] }, TODAS)],
  vinho: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#5b1a2b'] }, TODAS)],
  verde: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#2e9e4f'] }, TODAS)],
  branco: [aj('fundo', 'pagina', { tipo: 'solida', cores: ['#ffffff'] }, TODAS)],
  esc: [aj('fundo', 'pagina', { tipo: 'escurecer', cores: [] }, TODAS)],
  cla: [aj('fundo', 'pagina', { tipo: 'clarear', cores: [] }, TODAS)],
  caixa: [aj('caixa', 'tudo', 'maiusculas')],
  caixat: [aj('caixa', 'titulos', 'maiusculas')],
  minus: [aj('caixa', 'titulos', 'minusculas')],
  normal: [aj('caixa', 'tudo', 'normal')],
  maior: [aj('tamanho', 'titulos', 1.22), aj('tamanho', 'textos', 1.1)],
  menor: [aj('tamanho', 'tudo', 0.85)],
  negrito: [aj('peso', 'titulos', 'negrito'), aj('peso', 'textos', 'negrito')],
  fino: [aj('peso', 'tudo', 'fino')],
  amplo: [aj('espaco', 'titulos', 'amplo')],
  junto: [aj('espaco', 'tudo', 'junto')],
  italico: [aj('italico', 'titulos', 'sim')],
  semital: [aj('italico', 'tudo', 'nao')],
  centro: [aj('alinhamento', 'tudo', 'centro')],
  esquerda: [aj('alinhamento', 'tudo', 'esquerda')],
  sombra: [aj('sombra', 'titulos', 'com'), aj('sombra', 'botoes', 'com'), aj('sombra', 'cartoes', 'com')],
  semsombra: [aj('sombra', 'tudo', 'sem')],
  vermelho: [aj('cor_texto', 'titulos', { cor: '#c62828' })],
  claro: [aj('cor_texto', 'textos', 'claro')],
  escuro: [aj('cor_texto', 'tudo', 'escuro')],
  btnverde: [aj('fundo', 'botoes', { tipo: 'solida', cores: ['#16a34a'] })],
  btngrad: [aj('fundo', 'botoes', { tipo: 'degrade', cores: ['#ec4899', '#f59e0b'], direcao: 'horizontal' })],
  cartoes: [aj('fundo', 'cartoes', { tipo: 'solida', cores: ['#fff7d6'] })],
  cartoesesc: [aj('fundo', 'cartoes', { tipo: 'solida', cores: ['#1f2937'] })],
  topo: [aj('fundo', 'topo', { tipo: 'degrade', cores: ['#0ea5e9', '#6366f1'], direcao: 'diagonal' })],
  secoes: [aj('fundo', 'secoes', { tipo: 'solida', cores: ['#f3ead8'] })],
  menu: [aj('fundo', 'menu', { tipo: 'solida', cores: ['#111111'] })],
  rodape: [aj('fundo', 'rodape', { tipo: 'solida', cores: ['#2e9e4f'] })],
  titfundo: [aj('fundo', 'titulos', { tipo: 'solida', cores: ['#fde047'] })],
};

function lerAjustes() {
  if (qs.get('ajj')) { try { return JSON.parse(qs.get('ajj')); } catch { return []; } }
  return (qs.get('aj') || 'nenhum').split(/[+ ]/).filter(Boolean).flatMap((k) => PRESETS[k] || []);
}
const AJUSTES = lerAjustes();

const ids = await (await fetch('fixtures/index.json')).json();
const escolhidos = qs.get('fix') && qs.get('fix') !== 'todos' ? qs.get('fix').split(',') : ids;
const fixtures = await Promise.all(escolhidos.map(async (id) => (await fetch(`fixtures/${id}.json`)).json()));
const O = Object.fromEntries((qs.get('o') || '').split(',').filter(Boolean).map((x) => x.split(':')));
const contexto = (f) => { const ctx = montar({ R: f.R, O, texto: f.texto, agora: AGORA }); ctx.ajustes = AJUSTES; return ctx; };
const FONTES = new URL('../fonts/', location.href).pathname;

if (PECA === 'iframe') {
  // como no estúdio: o site num iframe com sandbox (sem scripts), SEM ajustes; o teste aplica os ajustes depois,
  // pelo helper do agente B (aplicarAjustesNoDocumento), sem recarregar — e troca blocos como o renderSite faz
  const site = await import('../js/site.mjs');
  const aj = await import('../js/ajustes-css.mjs');
  const ctx0 = contexto(fixtures[0]); ctx0.ajustes = [];
  document.body.innerHTML = '<iframe id="fr" sandbox="allow-same-origin" style="width:1280px;height:900px;border:0;display:block"></iframe>';
  const fr = document.getElementById('fr');
  await new Promise((r) => { fr.onload = r; fr.srcdoc = site.documento(ctx0, { fontes: FONTES }); });
  window.__aplicar = (ajustes, comCtx = false) => aj.aplicarAjustesNoDocumento(fr.contentDocument, ajustes, comCtx ? contexto(fixtures[0]) : null);
  window.__trocarBlocos = () => { const d = fr.contentDocument; d.body.innerHTML = site.blocos(ctx0).map((b) => `<div data-bloco="${b.id}">${b.html}</div>`).join(''); };
  window.__estilo = (sel, props) => { const el = fr.contentDocument.querySelector(sel); if (!el) return null; const cs = fr.contentWindow.getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs.getPropertyValue(k)])); };
  window.__PRESETS = PRESETS;
  window.__pronto = true;
} else if (PECA === 'site') {
  // a página vira o site (1ª fixture): o viewport do navegador é o do site
  const mod = await import('../js/site.mjs');
  const html = mod.documento(contexto(fixtures[0]), { fontes: FONTES });
  document.open(); document.write(html); document.close();
  await new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 250));
  window.__pronto = true;
} else {
  const mod = await import(`../js/${PECA === 'posts' ? 'carrossel' : PECA}.mjs`);
  const st = document.createElement('style');
  st.textContent = fontFaceCSS(FONTES);
  document.head.append(st);
  const PAINEL = { posts: [184, null], email: [291, 490], anuncios: [281, 266] };
  document.getElementById('topo').innerHTML = `<b>Ajustes · ${PECA} · ${MODO}</b><span>${AJUSTES.map((a) => `${a.prop}/${a.elemento}`).join(' · ') || 'sem ajustes'}</span>`;
  const g = document.getElementById('galeria');
  for (const f of fixtures) {
    const ctx = contexto(f);
    const item = document.createElement('section');
    item.className = 'g-item';
    item.innerHTML = `<div class="g-rot"><b>${f.id}</b> · ${ctx.marca.paleta.id} · ${ctx.marca.fonte.id}</div>`;
    const caixa = document.createElement('div');
    caixa.className = 'g-caixa' + (MODO === 'painel' ? '' : ' ampliado');
    if (MODO === 'painel') {
      const [w, h] = PAINEL[PECA];
      caixa.style.width = `${PECA === 'posts' ? w * 3 + 40 : w}px`;
      if (h) caixa.style.height = `${h}px`;
      if (PECA === 'posts') caixa.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,${w}px);gap:10px">${[0, 1, 2].map((i) => mod.carrosselHTML(ctx, i)).join('')}</div>`;
      else if (PECA === 'email') caixa.innerHTML = mod.emailPainelHTML(ctx);
      else caixa.innerHTML = mod.anunciosPainelHTML(ctx);
    } else if (MODO === 'ampliado') {
      caixa.style.width = '1280px';
      caixa.innerHTML = PECA === 'posts' ? mod.carrosseisAmpliadoHTML(ctx) : PECA === 'email' ? mod.emailAmpliadoHTML(ctx) : mod.anunciosAmpliadoHTML(ctx);
    } else {
      const doc = PECA === 'email' ? mod.emailExportavel(ctx) : PECA === 'anuncios' ? mod.anunciosExportavel(ctx) : '<p>(carrossel não tem exportável)</p>';
      const fr = document.createElement('iframe');
      fr.style.cssText = `width:${PECA === 'email' ? 680 : 1000}px;height:1400px;border:0;background:#fff;border-radius:8px`;
      fr.srcdoc = doc;
      fr.addEventListener('load', () => { try { fr.style.height = fr.contentDocument.documentElement.scrollHeight + 'px'; } catch { /* sem acesso */ } });
      caixa.append(fr);
    }
    item.append(caixa);
    g.append(item);
    for (const fn of ['ativarCarrosseis', 'ativarEmail', 'ativarAnuncios']) if (mod[fn]) mod[fn](caixa);
  }
  await document.fonts.ready;
  await Promise.all([...document.querySelectorAll('iframe')].map((f) => new Promise((r) => { f.addEventListener('load', () => setTimeout(r, 400), { once: true }); setTimeout(r, 4000); })));
  await new Promise((r) => setTimeout(r, 400));
  window.__pronto = true;
}

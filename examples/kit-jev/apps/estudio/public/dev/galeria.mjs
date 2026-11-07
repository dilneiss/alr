// Galeria de conferência das peças novas (carrosséis, e-mail e anúncios), a partir de decisões REAIS do Jev
// gravadas em public/dev/fixtures/. Caminhos relativos: funciona no app publicado (https://jev-estudio…/dev/galeria.html,
// atrás do login) e localmente (python3 -m http.server 5300 --directory apps/estudio → /public/dev/galeria.html).
// Parâmetros: ?peca=site|carrossel|email|anuncios&modo=painel|ampliado|exportavel&fix=burger,cafe&o=q:id&todos=q&mobile=1
// window.__galeriaPronta vira true quando tudo foi desenhado (para screenshots com Playwright).
import { montar } from '../js/contexto.mjs';
import { fontFaceCSS } from '../js/marca.mjs';
import { META } from '../lib/perguntas.mjs';

const qs = new URLSearchParams(location.search);
const PECA = qs.get('peca') || 'carrossel';
const MODO = qs.get('modo') || 'painel';
const MOBILE = qs.get('mobile') === '1';
const AGORA = new Date('2026-09-24T10:00:00-03:00');
// tamanho de cada painel no estúdio em 1440×900 (largura × altura úteis, em px de CSS)
const PAINEL = { carrossel: [184, null], email: [291, 490], anuncios: [281, 266] };

const mod = await import(`../js/${PECA}.mjs`);
const st = document.createElement('style');
const FONTES = new URL('../fonts/', location.href).pathname; // /fonts/ no app, /public/fonts/ no servidor local
st.textContent = fontFaceCSS(FONTES);
document.head.append(st);

const ids = await (await fetch('fixtures/index.json')).json();
const escolhidos = qs.get('fix') && qs.get('fix') !== 'todos' ? qs.get('fix').split(',') : ids;
const fixtures = await Promise.all(escolhidos.map(async (id) => (await fetch(`fixtures/${id}.json`)).json()));
const Obase = Object.fromEntries((qs.get('o') || '').split(',').filter(Boolean).map((x) => x.split(':')));

// ?todos=q → a 1ª fixture desenhada com CADA opção da pergunta q (para ver todas as variações de um formato/estilo)
const casos = [];
const todos = qs.get('todos');
if (todos && META[todos]) {
  for (const op of Object.keys(META[todos].opcoes || {})) casos.push({ f: fixtures[0], O: { ...Obase, [todos]: op }, extra: `${todos}=${op}` });
} else for (const f of fixtures) casos.push({ f, O: Obase, extra: '' });

document.getElementById('topo').innerHTML = `<b>Galeria · ${PECA} · ${MODO}${MOBILE ? ' · celular' : ''}</b>
  ${['site', 'carrossel', 'email', 'anuncios'].map((p) => `<a href="?peca=${p}&modo=${MODO}">${p}</a>`).join(' · ')}
  <span>${['painel', 'ampliado', 'exportavel'].map((m) => `<a href="?peca=${PECA}&modo=${m}">${m}</a>`).join(' · ')}</span>
  <span>${casos.length} caso(s)</span>`;

const g = document.getElementById('galeria');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const { f, O, extra } of casos) {
  const ctx = montar({ R: f.R, O, texto: f.texto, agora: AGORA });
  const item = document.createElement('section');
  item.className = 'g-item';
  const resumo = PECA === 'site' ? `${ctx.site.hero} · ${ctx.site.img} · ${ctx.site.secoes.join(',')}` : PECA === 'carrossel' ? `${ctx.carEstilo.id} · ${ctx.posts.map((p) => `${p.fmt}/${p.bg}`).join(' · ')}`
    : PECA === 'email' ? `${ctx.email.tipo.id} · cab ${ctx.email.cabecalho} · hero ${ctx.email.hero} · ${ctx.email.blocos.join(',')} · ass ${ctx.email.ass.layout}/${ctx.email.ass.banner}`
      : `${ctx.anuncios.conceito.id} · ${ctx.anuncios.estilo} · ${ctx.anuncios.fundo} · selo ${ctx.anuncios.selo} · ${ctx.anuncios.anim}`;
  item.innerHTML = `<div class="g-rot"><b>${esc(f.id)}</b> ${esc(ctx.segId)} · ${esc(ctx.marca.paleta.id)} · ${esc(ctx.marca.fonte.id)} · ${esc(resumo)}${extra ? ` · <b>${esc(extra)}</b>` : ''}</div>`;
  const caixa = document.createElement('div');
  caixa.className = 'g-caixa' + (MODO === 'painel' ? '' : ' ampliado');
  if (PECA === 'site') {
    // o site inteiro num iframe (1280 de largura no ampliado, 468 = painel do estúdio, 390 = celular); altura = página toda
    const larg = MOBILE ? 390 : MODO === 'painel' ? 468 : 1280;
    const fr = document.createElement('iframe');
    fr.style.cssText = `width:${larg}px;height:900px;border:0;background:#fff;display:block`;
    fr.srcdoc = mod.documento(ctx, { fontes: FONTES });
    fr.addEventListener('load', () => { try { fr.style.height = fr.contentDocument.documentElement.scrollHeight + 'px'; } catch {} });
    caixa.className = 'g-caixa ampliado';
    caixa.append(fr);
  } else if (MODO === 'painel') {
    const [w, h] = PAINEL[PECA];
    caixa.style.width = `${MOBILE ? 360 : PECA === 'carrossel' ? w * 3 + 40 : w}px`;
    if (h && !MOBILE) caixa.style.height = `${h}px`;
    if (PECA === 'carrossel') caixa.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,${MOBILE ? '76%' : `${w}px`});gap:10px;${MOBILE ? 'overflow-x:auto' : ''}">${[0, 1, 2].map((i) => mod.carrosselHTML(ctx, i)).join('')}</div>`;
    else if (PECA === 'email') caixa.innerHTML = mod.emailPainelHTML(ctx);
    else caixa.innerHTML = mod.anunciosPainelHTML(ctx);
  } else if (MODO === 'ampliado') {
    caixa.style.width = MOBILE ? '360px' : '1280px';
    caixa.innerHTML = PECA === 'carrossel' ? mod.carrosseisAmpliadoHTML(ctx) : PECA === 'email' ? mod.emailAmpliadoHTML(ctx) : mod.anunciosAmpliadoHTML(ctx);
  } else {
    const doc = PECA === 'email' ? mod.emailExportavel(ctx) : PECA === 'anuncios' ? mod.anunciosExportavel(ctx) : '<p>(carrossel não tem exportável)</p>';
    const fr = document.createElement('iframe');
    fr.style.cssText = `width:${PECA === 'email' ? 680 : 1000}px;height:1100px;border:0;background:#fff;border-radius:8px`;
    fr.srcdoc = doc;
    caixa.append(fr);
    if (PECA === 'email' && mod.assinaturaExportavel) {
      const a = document.createElement('div');
      a.style.cssText = 'background:#fff;color:#222;padding:24px;margin-top:10px;border-radius:8px;width:632px';
      a.innerHTML = `<p style="font:14px Arial;margin:0 0 16px">Oi, Marina! Segue a proposta em anexo. Qualquer dúvida, é só responder.</p>${mod.assinaturaExportavel(ctx)}`;
      caixa.append(a);
    }
  }
  item.append(caixa);
  g.append(item);
  for (const fn of ['ativarCarrosseis', 'ativarEmail', 'ativarAnuncios']) if (mod[fn]) mod[fn](caixa);
}
await document.fonts.ready;
// sites: espera os iframes carregarem e medirem a altura
await Promise.all([...document.querySelectorAll('iframe')].map((f) => new Promise((r) => { if (f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.body && f.contentDocument.body.childElementCount) r(); else f.addEventListener('load', () => setTimeout(r, 400), { once: true }); setTimeout(r, 4000); })));
await new Promise((r) => setTimeout(r, 300));
window.__galeriaPronta = true;

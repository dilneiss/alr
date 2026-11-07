// app.js — entrada da página (Site que Lê Intenções). O conteúdo vem de dados/site.json.
// Módulos: core (estado/utilidades) · pagina (portas e conteúdo) · sinais (rastreador) · jev (decisões e adaptações) · sims.
import { $, html, ICON, iniciarSite, FORM } from './core.js';
import { montarPagina } from './pagina.js';
import './sinais.js';
import { montarJev } from './jev.js';
import { montarSims } from './sims.js';

async function boot() {
  const K = window.JevKit;
  const btSim = K.el('button', { class: 'jev-btn jev-btn--sm bt-simular', type: 'button', 'data-abrir-sims': '', title: 'Um cursor fantasma navega como um visitante e o Jev monta a página para ele' });
  btSim.innerHTML = String(html`${ICON('play')}<span class="jev-hide-mobile">Simular visitante</span>`);
  K.mountTopbar({ title: 'Site que Lê Intenções', tagline: 'Site que Lê Intenções · a página se monta para quem abre', actions: [btSim], footer: false });
  let dados, cfg;
  try {
    [dados, cfg] = await Promise.all([
      fetch('dados/site.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      K.api('/api/config', undefined, { silent: true }).catch(() => null),
    ]);
  } catch (e) {
    $('#pagina').innerHTML = '<p class="erro-carga">Não consegui carregar o conteúdo da página. Recarregue em instantes.</p>';
    return;
  }
  iniciarSite(dados, cfg || { secoes: {}, perfis: {}, interesses: {}, objecoes: {}, acoes: {} });
  const marca = dados.marca.nome;
  const tit = document.querySelector('.jev-apptitle b');
  if (tit) tit.textContent = marca;
  document.title = `${marca} · Site que Lê Intenções · Jev`;
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (cor) document.querySelector('meta[name="theme-color"]').setAttribute('content', cor);
  const fav = document.querySelector('link[rel="icon"]');
  if (fav) fav.href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${dados.identidade.favicon}</text></svg>`)}`;
  $('#faixaDemo').innerHTML = String(html`<span class="faixa-selo">Demonstração do Jev</span><span>Página de demonstração criada a partir de uma descrição do negócio. Quase tudo começa fechado: o que você abre ensina o Jev a montar a página para você. Só um resumo do que você abre sai do navegador, e o ${FORM()} é de demonstração.</span>`);
  montarPagina();
  montarJev();
  montarSims();
  document.body.classList.add('pronto');
}
boot();

// Seção "Modelos para adaptar" do hub: lê /m/catalogo.json (servidor dos modelos) e monta os cartões com o número
// do catálogo do kit, com filtro por categoria e busca. Cada cartão abre o app (/m/<id>/).
(function () {
  const CAT = {
    'ao-vivo': 'Ao vivo', imediata: 'IA imediata', atendimento: 'Atendimento', confianca: 'Confiança e segurança', vendas: 'Vendas e criadores',
    dados: 'Dados e back-office', construtores: 'Para quem constrói com IA', voz: 'Voz e tempo real', educacao: 'Educação',
    radares: 'Radares e alertas', juridico: 'Jurídico e setor público', 'casa-jogos': 'Casa e jogos',
  };
  const MOTOR = { fluxo: 'fila que se organiza', aovivo: 'reage enquanto você digita', conversa: 'conversa ao vivo', agente: 'agente que pede licença', pares: 'compara pares', provas: 'prova de confiança', laboratorio: 'laboratório', palco: 'ao vivo: voz, câmera ou jogo' };
  const ENTRADA = { voz: '🎙️ fale com ele', camera: '📷 usa a sua câmera', jogo: '🎮 jogue' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sec = document.getElementById('modelos');
  const grade = document.getElementById('mod-grade');
  const filtros = document.getElementById('mod-filtros');
  const busca = document.getElementById('mod-busca');
  const contagem = document.getElementById('mod-n');
  if (!sec || !grade) return;
  let apps = [], cat = 'todas';

  function base() { return document.querySelectorAll('#grid .plate').length || 17; }

  function render() {
    const q = (busca.value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const vis = apps.filter((a) => (cat === 'todas' || a.categoria === cat) && (!q || a._busca.includes(q)));
    contagem.textContent = vis.length === apps.length ? `${apps.length} modelos` : `${vis.length} de ${apps.length} modelos`;
    grade.innerHTML = vis.map((a) => `
      <article class="mod" style="--ac:${esc(a.acento || '#B23A22')}" id="modelo-${esc(a.id)}">
        <a class="mod-a" href="/m/${esc(a.id)}/" target="_blank" rel="noopener" aria-label="Abrir ${esc(a.titulo)}">
          <span class="mod-shot"><img src="/m/_shots/${esc(a.id)}.jpg" alt="" loading="lazy" decoding="async" width="720" height="450" onerror="this.parentNode.remove()"></span>
          <span class="mod-top"><span class="mod-n">${String(a.n).padStart(2, '0')}${a.motor === 'palco' ? '<b class="mod-vivo">ao vivo</b>' : ''}</span><span class="mod-e" aria-hidden="true">${esc(a.emoji)}</span></span>
          <h3>${esc(a.titulo)}</h3>
          <p>${esc(a.resumo)}</p>
          <span class="mod-meta"><span>${esc(CAT[a.categoria] || a.categoria)}</span><span>${esc((a.entrada && ENTRADA[a.entrada]) || MOTOR[a.motor] || a.motor)}</span></span>
          <span class="mod-tags">${(a.marcas || []).map((m) => `<span>${esc(m)}</span>`).join('')}</span>
        </a>
        <div class="mod-acts">
          <a class="btn btn--ink" href="/m/${esc(a.id)}/?auto" target="_blank" rel="noopener">Ver funcionando</a>
        </div>
      </article>`).join('') || '<p class="mod-vazio">Nenhum modelo com esse filtro.</p>';
  }

  async function carregar() {
    let r;
    try { r = await (await fetch('/m/catalogo.json', { cache: 'no-store' })).json(); } catch { grade.innerHTML = '<p class="mod-vazio">Não consegui carregar os modelos agora.</p>'; return; }
    const b = base();
    apps = (r.apps || []).map((a, i) => ({ ...a, n: a.n || b + i + 1, _busca: [a.titulo, a.resumo, a.descricao, CAT[a.categoria], (a.marcas || []).join(' ')].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }));
    const usadas = Object.keys(CAT).filter((k) => apps.some((a) => a.categoria === k));
    filtros.innerHTML = ['todas', ...usadas].map((k) => `<button type="button" class="mod-f${k === cat ? ' on' : ''}" data-cat="${k}">${k === 'todas' ? 'Todas' : esc(CAT[k])} <b>${k === 'todas' ? apps.length : apps.filter((a) => a.categoria === k).length}</b></button>`).join('');
    const total = b + apps.length;
    for (const id of ['n-apps', 'n-apps-h']) { const n = document.getElementById(id); if (n) { n.textContent = String(total); n.dataset.digitos = String(total).length; } }
    const rg = document.getElementById('mod-range'); if (rg && apps.length) rg.textContent = `${apps.length} modelos`;
    render();
    if (location.hash.startsWith('#modelo-')) { const alvo = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (alvo) alvo.scrollIntoView({ block: 'center' }); }
  }

  filtros.addEventListener('click', (e) => { const b = e.target.closest('.mod-f'); if (!b) return; cat = b.dataset.cat; filtros.querySelectorAll('.mod-f').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  busca.addEventListener('input', render);
  carregar();
})();

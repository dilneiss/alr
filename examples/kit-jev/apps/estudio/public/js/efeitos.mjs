// Efeitos do "paralelo": partículas saindo da frase para os 5 painéis, painéis que acendem ao receber a sua parte
// e contadores que rolam. Pura apresentação — os números mostrados são os medidos.
const NS = 'http://www.w3.org/2000/svg';
let svg;
const reduzido = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function camada() {
  if (svg && svg.isConnected) return svg;
  svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'fx');
  svg.setAttribute('aria-hidden', 'true');
  document.body.append(svg);
  return svg;
}

// dispara "cometas" da origem para cada alvo; devolve uma função que marca a chegada de um alvo
export function disparar(origem, alvos, cores = ['#a78bfa', '#22d3ee', '#f472b6', '#fbbf24', '#34d399']) {
  if (!origem || reduzido()) return;
  const s = camada();
  const W = window.innerWidth, H = window.innerHeight;
  s.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const o = origem.getBoundingClientRect();
  if (o.bottom < 0 || o.top > H) return;
  alvos.forEach((alvo, i) => {
    if (!alvo) return;
    const a = alvo.getBoundingClientRect();
    if (a.bottom < 0 || a.top > H || a.width === 0) return;
    const lado = a.left > o.right - 20;
    const x0 = lado ? o.right - 6 : o.left + o.width / 2, y0 = lado ? o.top + o.height * 0.5 : o.bottom - 6;
    const x1 = lado ? a.left + 10 : a.left + a.width / 2, y1 = lado ? a.top + Math.min(40, a.height / 2) : a.top + 8;
    const dx = x1 - x0;
    const d = lado ? `M${x0} ${y0}C${x0 + dx * 0.45} ${y0} ${x1 - dx * 0.45} ${y1} ${x1} ${y1}` : `M${x0} ${y0}C${x0} ${y0 + 80} ${x1} ${y1 - 80} ${x1} ${y1}`;
    const cor = cores[i % cores.length];
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('class', 'fx-rastro'); p.setAttribute('stroke', cor);
    s.append(p);
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`;
    p.animate([{ strokeDashoffset: L, opacity: 0.9 }, { strokeDashoffset: 0, opacity: 0.55 }, { strokeDashoffset: -L, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.3,.7,.2,1)', delay: i * 40 }).onfinish = () => p.remove();
    for (let k = 0; k < 3; k++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', String(3.2 - k * 0.8)); c.setAttribute('fill', cor); c.setAttribute('class', 'fx-cometa');
      s.append(c);
      const t0 = performance.now() + i * 40 + k * 70, dur = 620;
      const anda = (t) => {
        const q = Math.min(1, Math.max(0, (t - t0) / dur));
        const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        const pt = p.isConnected ? p.getPointAtLength(e * L) : { x: x1, y: y1 };
        c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
        c.setAttribute('opacity', String(q >= 1 ? 0 : 0.95 - k * 0.25));
        if (q < 1) requestAnimationFrame(anda); else c.remove();
      };
      requestAnimationFrame(anda);
    }
  });
}

export function acender(el, classe = 'recebeu') {
  if (!el) return;
  el.classList.remove(classe); void el.offsetWidth; el.classList.add(classe);
  clearTimeout(el._acesoT); el._acesoT = setTimeout(() => el.classList.remove(classe), 1300);
}

export function rolar(el, ate, { ms = 520, fmt = (v) => String(Math.round(v)) } = {}) {
  if (!el) return;
  const de = +(el.dataset.v || 0);
  el.dataset.v = String(ate);
  if (reduzido() || de === ate) { el.textContent = fmt(ate); return; }
  const t0 = performance.now();
  const passo = (t) => {
    const q = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - q, 3);
    el.textContent = fmt(de + (ate - de) * e);
    if (q < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

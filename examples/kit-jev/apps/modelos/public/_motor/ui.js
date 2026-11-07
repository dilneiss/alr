// Componentes de interface dos modelos do Jev (sem dependências, sem build).
// Usado por todos os motores: barras de probabilidade, medidores, anéis de confiança, inspetor, toasts e animações.

export const nf = (d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

export const fmt = {
  ms: (v) => (v == null || isNaN(v) ? '—' : v >= 10000 ? (v / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(v) + ' ms'),
  s: (v) => (v == null || isNaN(v) ? '—' : nf(1).format(v / 1000) + ' s'),
  usd: (v) => {
    if (v == null || isNaN(v)) return '—';
    if (v === 0) return 'US$ 0';
    if (v < 0.01) return 'US$ ' + v.toFixed(6).replace('.', ',').replace(/0+$/, '').replace(/,$/, ',0');
    return 'US$ ' + nf(v < 1 ? 4 : 2).format(v);
  },
  brl: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0),
  pct: (p, d = 0) => (p == null || isNaN(p) ? '—' : nf(d).format(p * 100) + '%'),
  int: (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v || 0)),
  num: (v, d = 1) => nf(d).format(v || 0),
};

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// el('div', { class: 'x', onclick: fn, html: '<b>..</b>' }, [filhos])
export function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') { for (const [p, x] of Object.entries(v || {})) { if (p.startsWith('--')) n.style.setProperty(p, x); else n.style[p] = x; } }
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children ?? [])) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}

export const sleep = (ms, sinal) => new Promise((ok, falha) => {
  const t = setTimeout(ok, ms);
  if (sinal) sinal.addEventListener('abort', () => { clearTimeout(t); falha(new DOMException('parado', 'AbortError')); }, { once: true });
});

export const reduzMovimento = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- opções e rótulos das decisões ----------
// opções podem vir como lista [{id, rotulo, desc, cor, icone}] ou objeto {id: 'descrição'}
export function listaOpcoes(dec, ctx) {
  let op = typeof dec.opcoes === 'function' ? dec.opcoes(ctx || {}) : dec.opcoes;
  if (!op) return [];
  if (!Array.isArray(op)) op = Object.entries(op).map(([id, desc]) => ({ id, desc }));
  return op.map((o) => ({ ...o, rotulo: o.rotulo || humaniza(o.id) }));
}
export function listaNiveis(dec) {
  return (dec.niveis || []).map((n, i) => (typeof n === 'string' ? { rotulo: n, desc: n, i } : { ...n, rotulo: n.rotulo || n.desc, i }));
}
export function humaniza(id) { const s = String(id).replace(/[_-]+/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }

// cor de um nível de escala: do verde ao vermelho (ou o contrário, com inverter)
export function corNivel(i, n, inverter) {
  const t = n <= 1 ? 0 : i / (n - 1);
  const x = inverter ? 1 - t : t;
  const h = 150 - x * 145; // 150 = verde, 5 = vermelho
  return `hsl(${h} 70% 55%)`;
}

export function topo(prob) { return Object.entries(prob || {}).sort((a, b) => b[1] - a[1]); }
export function nivelDe(ans) {
  if (!ans || !ans.probabilities) return 0;
  return +topo(ans.probabilities)[0][0];
}
export function confiancaDe(ans) {
  if (!ans) return 0;
  if (ans.type === 'noul') return Math.max(ans.noul, 1 - ans.noul);
  return Math.max(...Object.values(ans.probabilities || { x: 0 }));
}

// ---------- componentes ----------
export function barras(probs, { rotulos = {}, cores = {}, limite = 0, destaque } = {}) {
  let ent = topo(probs);
  if (limite) ent = ent.slice(0, limite);
  const top = destaque ?? (ent[0] || [])[0];
  const box = el('div', { class: 'mj-barras' });
  for (const [k, p] of ent) {
    const fil = el('span', { class: 'fil', style: cores[k] ? { background: cores[k] } : null });
    box.append(el('div', { class: 'mj-barra' + (k === top ? ' top' : '') }, [
      el('span', { class: 'lbl', text: rotulos[k] || humaniza(k), title: rotulos[k] || k }),
      el('span', { class: 'trk' }, [fil]),
      el('span', { class: 'pct', text: fmt.pct(p) }),
    ]));
    requestAnimationFrame(() => requestAnimationFrame(() => { fil.style.width = Math.max(0, Math.min(100, p * 100)) + '%'; }));
  }
  return box;
}

// medidor segmentado para perguntas score
export function medidor(ans, niveis, { inverter = false, compacto = false } = {}) {
  const n = niveis.length;
  const nv = nivelDe(ans);
  const box = el('div', { class: 'mj-medidor' + (compacto ? ' compacto' : '') });
  const segs = el('div', { class: 'segs' });
  for (let i = 0; i < n; i++) {
    const on = i <= nv;
    segs.append(el('span', { class: 'seg' + (on ? ' on' : ''), style: on ? { background: corNivel(i, n, inverter) } : null, title: `${niveis[i].rotulo}: ${fmt.pct((ans.probabilities || {})[String(i)] || 0)}` }));
  }
  box.append(segs, el('span', { class: 'mj-medidor-lbl', style: { color: corNivel(nv, n, inverter) }, text: niveis[nv] ? niveis[nv].rotulo : '' }));
  return box;
}

// anel de confiança (0..1)
export function anel(p, { tamanho = 34, cor } = {}) {
  const v = Math.max(0, Math.min(1, p || 0));
  const r = 15, c = 2 * Math.PI * r;
  const tom = cor || (v >= 0.85 ? 'var(--mj-bom)' : v >= 0.6 ? 'var(--mj-medio)' : 'var(--mj-ruim)');
  const s = el('span', { class: 'mj-anel', title: 'Confiança do Jev: ' + fmt.pct(v), style: { width: tamanho + 'px', height: tamanho + 'px' } });
  s.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="3.2"/><circle cx="18" cy="18" r="${r}" fill="none" stroke="${tom}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" transform="rotate(-90 18 18)"/></svg><b>${Math.round(v * 100)}</b>`;
  return s;
}

export function chip(texto, { tom = '', icone = '', titulo = '' } = {}) {
  return el('span', { class: 'mj-chip ' + tom, title: titulo || null }, [icone ? el('i', { text: icone }) : null, texto]);
}

// ---------- toasts ----------
let caixaToasts;
export function toast(msg, tipo = '') {
  if (!caixaToasts) { caixaToasts = el('div', { class: 'mj-toasts', 'aria-live': 'polite' }); document.body.append(caixaToasts); }
  const t = el('div', { class: 'mj-toast ' + tipo, text: msg });
  caixaToasts.append(t);
  setTimeout(() => { t.classList.add('sai'); setTimeout(() => t.remove(), 350); }, tipo === 'erro' ? 5200 : 3200);
}

// ---------- modal ----------
export function modal(titulo, conteudo, { largo = false } = {}) {
  const fundo = el('div', { class: 'mj-modal-fundo' });
  const fechar = () => { fundo.classList.add('sai'); setTimeout(() => fundo.remove(), 220); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') fechar(); };
  const caixa = el('div', { class: 'mj-modal' + (largo ? ' largo' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [
    el('header', {}, [el('h3', { text: titulo }), el('button', { class: 'mj-btn mj-btn--sm', type: 'button', 'aria-label': 'Fechar', onclick: fechar }, ['✕'])]),
    el('div', { class: 'corpo' }, [conteudo]),
  ]);
  fundo.append(caixa);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  document.addEventListener('keydown', esc_);
  document.body.append(fundo);
  return { fechar };
}

// ---------- JSON com cor ----------
export function jsonCor(v) {
  return esc(JSON.stringify(v, null, 2))
    .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
    .replace(/(:\s*)(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="s">$2</span>')
    .replace(/(:\s*)(-?\d+(?:\.\d+)?(?:e-?\d+)?)/gi, '$1<span class="n">$2</span>')
    .replace(/(:\s*)(true|false|null)/g, '$1<span class="b">$2</span>');
}

// ---------- animação FLIP: o elemento sai de onde está e "voa" até o novo lugar ----------
export function voar(no, anexar, { atraso = 0, duracao = 520 } = {}) {
  const antes = no.getBoundingClientRect();
  anexar();
  if (reduzMovimento) return Promise.resolve();
  const depois = no.getBoundingClientRect();
  const dx = antes.left - depois.left, dy = antes.top - depois.top;
  const sx = antes.width / Math.max(1, depois.width);
  no.style.transformOrigin = 'top left';
  const anim = no.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx})`, opacity: 0.9 },
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
  ], { duration: duracao, delay: atraso, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  return anim.finished.catch(() => {});
}

// digita um texto num campo, letra a letra, como alguém de verdade
export async function digitar(campo, texto, { sinal, velocidade = 1, aoPausar } = {}) {
  campo.value = '';
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    campo.value += c;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    if (campo.scrollHeight > campo.clientHeight) campo.scrollTop = campo.scrollHeight;
    let ms = 18 + Math.random() * 38;
    if (c === ' ') ms += 25;
    if (/[,.;:!?\n]/.test(c)) { ms += 260; if (aoPausar) aoPausar(); }
    await sleep(ms / velocidade, sinal);
  }
}

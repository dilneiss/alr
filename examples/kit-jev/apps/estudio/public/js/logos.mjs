// Estilos de logo (o Jev escolhe o estilo como escolhe a paleta; o desenho é nosso, em SVG).
// Cada estilo usa as MESMAS decisões da marca: paleta, par de fontes, ícone, caixa do nome e a categoria/cidade.
// Referências de direção de arte: regras "taste" do OpenDesign (github.com/nexu-io/open-design, Apache-2.0) —
// contraste forte, uma cor de destaque, tipografia como protagonista, nada genérico.
import { esc, caixa as aplicarCaixa, iniciais, mix, contraste } from './util.mjs';

const f2 = (v) => (Math.round(v * 100) / 100).toString();
const icG = (icone, x, y, tam, cor, sw = 1.9) => `<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(tam / 24)})" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${icone.svg}</g>`;

// cores de cada variante: fundo (onde o logo pousa), nome, tag, forte (formas), sobreForte (o que vai sobre a forma), acento
function paleta(c, variante) {
  if (variante === 'inv') return { base: c.pri, nome: c.onPri, tag: c.onPri, forte: c.onPri, sobre: c.pri, acento: c.onPri, tinta: c.onPri };
  if (variante === 'claro') return { base: '#111111', nome: '#ffffff', tag: 'rgba(255,255,255,.72)', forte: c.pri, sobre: c.onPri, acento: c.acc, tinta: '#ffffff' };
  if (variante === 'mono') return { base: c.bg, nome: c.ink, tag: c.ink, forte: c.ink, sobre: c.bg, acento: c.ink, tinta: c.ink };
  return { base: c.bg, nome: c.ink, tag: c.priTxt, forte: c.pri, sobre: c.onPri, acento: c.acc === c.bg ? c.priTxt : c.acc, tinta: c.priTxt };
}

export const FONTE_MANUSCRITO = '"Dancing Script", "Snell Roundhand", cursive';

// ---------------------------------------------------------------- símbolos 100×100 de cada estilo (avatar, favicon, cartão)
export function simboloEstilo(ctx, estilo, variante = 'cor', uid = 's') {
  const M = ctx.marca, f = M.f, c = M.cores, k = paleta(c, variante), ic = ctx.icone;
  const ini = iniciais(ctx.nome), letra = ini[0] || '?';
  switch (estilo) {
    case 'palavra':
      return `<circle cx="50" cy="50" r="48" fill="${k.forte}"/><text x="48" y="53" text-anchor="middle" dominant-baseline="central" font-family='${esc(f.logo)}' font-weight="${f.lw}" font-size="60" fill="${k.sobre}">${esc(letra)}</text><circle cx="72" cy="68" r="6.5" fill="${k.acento === k.forte ? k.sobre : k.acento}"/>`;
    case 'bloco':
      return `<rect x="2" y="2" width="96" height="96" rx="24" fill="${k.forte}"/>${icG(ic, 21, 21, 58, k.sobre, 2.1)}`;
    case 'carimbo':
      return `${filtroTinta(uid)}<g filter="url(#tinta${uid})" transform="rotate(-6 50 50)"><circle cx="50" cy="50" r="45" fill="none" stroke="${k.tinta}" stroke-width="4.5"/><circle cx="50" cy="50" r="38" fill="none" stroke="${k.tinta}" stroke-width="1.6"/>${icG(ic, 26, 26, 48, k.tinta, 2.4)}</g>`;
    case 'monograma':
      return `<path d="M50 3 97 50 50 97 3 50z" fill="${variante === 'cor' ? c.bg : k.base}" stroke="${k.acento}" stroke-width="2"/><path d="M50 12 88 50 50 88 12 50z" fill="none" stroke="${k.acento}" stroke-width=".9" opacity=".6"/><text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family='${esc(f.logo)}' font-weight="${f.lw}" font-size="${ini.length > 1 ? 28 : 36}" letter-spacing="1" fill="${k.nome}">${esc(ini)}</text>`;
    case 'bauhaus':
      return `<path d="M4 96V50a46 46 0 0 1 46 46z" fill="${variante === 'cor' ? c.sec : k.forte}"/><circle cx="34" cy="34" r="30" fill="${k.forte}"/><rect x="58" y="4" width="38" height="38" fill="${variante === 'cor' ? c.acc : k.acento}"/><circle cx="76" cy="76" r="20" fill="${variante === 'mono' ? k.nome : c.ink}"/>${icG(ic, 19, 19, 30, k.sobre, 2.4)}`;
    case 'poster':
      return `<rect x="2" y="2" width="96" height="96" rx="6" fill="${k.forte}"/><text x="50" y="56" text-anchor="middle" dominant-baseline="central" font-family='${esc(f.logo)}' font-weight="${f.lw}" font-size="70" fill="${k.sobre}">${esc(letra.toUpperCase())}</text><rect x="16" y="82" width="68" height="5" fill="${k.acento === k.forte ? k.sobre : k.acento}"/>`;
    case 'manuscrito':
      return `<circle cx="50" cy="50" r="48" fill="${variante === 'cor' ? c.soft : k.forte}"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family='${esc(f.scriptLogo ? f.logo : FONTE_MANUSCRITO)}' font-weight="700" font-size="58" fill="${variante === 'cor' ? c.priTxt : k.sobre}">${esc(letra)}</text>`;
    case 'app': {
      // o ícone contrasta com o quadrado (≥ 3:1 na faixa do degradê que fica sob ele, de 1/4 a 3/4): branco quando dá; senão a
      // cor que a variante põe sobre as formas (no inv, a cor principal sobre o quadrado onPri), e por fim preto ou branco
      const fim = variante === 'cor' ? c.acc : k.acento, sob = [0.25, 0.5, 0.75].map((t) => mix(k.forte, fim, t));
      const nota = (x) => Math.min(...sob.map((y) => contraste(x, y)));
      const tinta = ['#ffffff', k.sobre, '#111111'].find((x) => nota(x) >= 3) || (nota('#ffffff') >= nota('#111111') ? '#ffffff' : '#111111');
      return `<defs><linearGradient id="gApp${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${k.forte}"/><stop offset="1" stop-color="${fim}"/></linearGradient></defs><rect x="2" y="2" width="96" height="96" rx="28" fill="url(#gApp${uid})"/><path d="M8 30C12 14 22 8 40 8h20" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>${icG(ic, 22, 22, 56, tinta, 2.1)}`;
    }
    case 'organico':
      return `<path d="M58 4c20 3 38 20 37 44-1 27-22 48-47 47C22 94 5 74 7 49 9 22 32 1 58 4z" fill="${variante === 'cor' ? c.acc : k.acento}" opacity=".32" transform="rotate(14 50 50)"/><path d="M52 7c22 1 41 18 40 42-1 25-20 45-44 44C24 92 7 74 8 50 9 25 29 6 52 7z" fill="${k.forte}"/>${icG(ic, 25, 24, 50, k.sobre, 2)}`;
    default:
      return '';
  }
}

function filtroTinta(uid) {
  // tinta gasta: manchas falhadas + borda levemente irregular (só filtros SVG, sem imagem)
  return `<defs><filter id="tinta${uid}" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="r"/><feColorMatrix in="r" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -12 8.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="turbulence" baseFrequency=".035" numOctaves="1" seed="3" result="w"/><feDisplacementMap in="c" in2="w" scale="1.5"/></filter></defs>`;
}

// ---------------------------------------------------------------- logos completos
// devolve { W, H, corpo } ou null (estilo clássico = desenho antigo de marca.mjs)
export function logoEstilo(ctx, estilo, { variante = 'cor', compacto = false, classe = 'logo' } = {}, medir) {
  const M = ctx.marca, f = M.f, c = M.cores, k = paleta(c, variante), ic = ctx.icone;
  const uid = `${classe}${estilo}${variante}`.replace(/[^a-z0-9]/gi, '');
  const modo = f.scriptLogo && M.caixa === 'alta' ? 'titulo' : M.caixa;
  const nome = aplicarCaixa(ctx.nome, modo);
  const tr = modo === 'alta' ? Math.max(0.06, parseFloat(f.lt) || 0) : parseFloat(f.lt) || 0;
  const fam = esc(f.logo), famBody = esc(f.body);
  const tag = (ctx.cidade ? `${ctx.pack.cat} · ${ctx.cidade.nome}` : ctx.pack.cat).toUpperCase();
  const tagFs = 12.5, tagLs = 3.2;
  const tw = medir(tag, f.body, 700, tagFs, tagLs / tagFs);
  const sym = (x, y, s) => `<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(s)})">${simboloEstilo(ctx, estilo, variante, uid)}</g>`;
  const nomeTxt = (x, y, fs, extra = '') => `<text x="${f2(x)}" y="${f2(y)}" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${f2(tr * fs)}" fill="${k.nome}"${extra}>${esc(nome)}</text>`;
  const tagTxt = (x, y, cor = k.tag, anchor = 'start') => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="${anchor}" font-family="${famBody}" font-weight="700" font-size="${tagFs}" letter-spacing="${tagLs}" fill="${cor}">${esc(tag)}</text>`;

  // versão de uma linha (menu do site, rodapé): símbolo do estilo + nome
  if (compacto && !['palavra', 'manuscrito', 'poster'].includes(estilo)) {
    const fs = f.scriptLogo ? 62 : 52, nw = medir(nome, f.logo, f.lw, fs, tr);
    return { W: 100 + 18 + nw + 6, H: 100, corpo: `${sym(0, 0, 1)}${nomeTxt(118, 50, fs, ' dominant-baseline="central"')}` };
  }

  switch (estilo) {
    case 'palavra': {
      const fs = f.scriptLogo ? 86 : 72, nw = medir(nome, f.logo, f.lw, fs, tr), r = fs * 0.085;
      const dot = `<circle cx="${f2(nw + fs * 0.1 + r)}" cy="${f2(fs * 0.86 - r)}" r="${f2(r)}" fill="${k.acento}"/>`;
      if (compacto) return { W: nw + fs * 0.1 + r * 2 + 6, H: fs * 1.08, corpo: nomeTxt(0, fs * 0.86, fs) + dot };
      const lw = Math.min(nw, Math.max(tw, 120));
      return { W: Math.max(nw + fs * 0.1 + r * 2 + 6, tw + 4), H: fs + 40, corpo: `${nomeTxt(0, fs * 0.86, fs)}${dot}<rect x="1" y="${f2(fs + 6)}" width="${f2(lw)}" height="1.3" fill="${k.nome}" opacity=".28"/>${tagTxt(1, fs + 30)}` };
    }
    case 'bloco': {
      const fs = 50, nw = medir(nome, f.logo, f.lw, fs, tr);
      return { W: 100 + 22 + Math.max(nw, tw) + 6, H: 100, corpo: `${sym(0, 0, 1)}${nomeTxt(122, 56, fs)}${tagTxt(124, 84)}` };
    }
    case 'carimbo': {
      const topo = nome.toUpperCase().length > 24 ? nome.toUpperCase().slice(0, 24) + '…' : nome.toUpperCase();
      const fsTopo = Math.max(15, Math.min(27, 600 / Math.max(8, topo.length) * 0.68));
      const baixo = (ctx.cidade ? ctx.cidade.nome : ctx.pack.label).toUpperCase();
      const est = (cx, cy, r) => { const p = []; for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.42 : r; p.push(`${f2(cx + rr * Math.cos(a))},${f2(cy + rr * Math.sin(a))}`); } return `<polygon points="${p.join(' ')}" fill="${k.tinta}"/>`; };
      return { W: 220, H: 220, corpo: `${filtroTinta(uid)}<defs><path id="arcT${uid}" d="M 38 110 A 72 72 0 0 1 182 110"/><path id="arcB${uid}" d="M 32 110 A 78 78 0 0 0 188 110"/></defs>
        <g filter="url(#tinta${uid})" transform="rotate(-5 110 110)">
          <circle cx="110" cy="110" r="103" fill="none" stroke="${k.tinta}" stroke-width="8"/>
          <circle cx="110" cy="110" r="92" fill="none" stroke="${k.tinta}" stroke-width="2.6"/>
          <circle cx="110" cy="110" r="57" fill="none" stroke="${k.tinta}" stroke-width="2.6"/>
          <text font-family='${fam}' font-weight="${f.lw}" font-size="${f2(fsTopo)}" letter-spacing="${f2(fsTopo * 0.14)}" fill="${k.tinta}" text-anchor="middle"><textPath href="#arcT${uid}" startOffset="50%">${esc(topo)}</textPath></text>
          <text font-family="${famBody}" font-weight="800" font-size="13.5" letter-spacing="3.4" fill="${k.tinta}" text-anchor="middle" dominant-baseline="hanging"><textPath href="#arcB${uid}" startOffset="50%">${esc(baixo)}</textPath></text>
          ${est(32, 110, 6)}${est(188, 110, 6)}
          ${icG(ic, 110 - 36, 110 - 38, 72, k.tinta, 2.6)}
          <text x="110" y="160" text-anchor="middle" font-family="${famBody}" font-weight="700" font-size="10" letter-spacing="2.6" fill="${k.tinta}">EST. ${ctx.ano || ''}</text>
        </g>` };
    }
    case 'monograma': {
      const txt = nome.toUpperCase(), fs = 30, ls = 0.28;
      const nw = medir(txt, f.logo, f.lw, fs, ls), W = Math.max(nw, tw + 90, 200) + 24, cx = W / 2;
      return { W, H: 100 + 18 + fs + 34, corpo: `<g transform="translate(${f2(cx - 50)} 0)">${simboloEstilo(ctx, 'monograma', variante, uid)}</g>
        <text x="${f2(cx)}" y="${f2(100 + 18 + fs * 0.82)}" text-anchor="middle" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${f2(fs * ls)}" fill="${k.nome}">${esc(txt)}</text>
        <rect x="${f2(cx - tw / 2 - 40)}" y="${f2(100 + 18 + fs + 16)}" width="28" height="1" fill="${k.acento}"/><rect x="${f2(cx + tw / 2 + 12)}" y="${f2(100 + 18 + fs + 16)}" width="28" height="1" fill="${k.acento}"/>
        ${tagTxt(cx, 100 + 18 + fs + 21, k.tag, 'middle')}` };
    }
    case 'bauhaus': {
      const fs = 48, nw = medir(nome, f.logo, f.lw, fs, tr);
      const dots = [c.pri, c.sec, c.acc].map((h, i) => `<circle cx="${f2(126 + tw + 12 + i * 12)}" cy="80" r="4" fill="${variante === 'mono' ? k.nome : h}"/>`).join('');
      return { W: 100 + 24 + Math.max(nw, tw + 48) + 6, H: 100, corpo: `${sym(0, 0, 1)}${nomeTxt(124, 56, fs)}${tagTxt(126, 84)}${dots}` };
    }
    case 'poster': {
      const pal = nome.toUpperCase().split(/\s+/).filter(Boolean);
      const linhas = pal.length <= 1 ? pal : pal.length === 2 ? pal : [pal.slice(0, Math.ceil(pal.length / 2)).join(' '), pal.slice(Math.ceil(pal.length / 2)).join(' ')];
      const fs = compacto ? 56 : 64, lh = fs * 0.92;
      if (compacto) { const t = linhas.join(' '), nw = medir(t, f.logo, f.lw, fs, 0.01); return { W: nw + 8, H: fs * 1.05, corpo: `<text x="0" y="${f2(fs * 0.86)}" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${f2(fs * 0.01)}" fill="${k.nome}">${esc(t)}</text>` }; }
      const larg = linhas.map((l) => medir(l, f.logo, f.lw, fs, 0.01)), maxW = Math.max(...larg);
      const n = linhas.length, yUlt = (n - 1) * lh;
      let corpo = '';
      linhas.forEach((l, i) => {
        const y = i * lh + fs * 0.86;
        if (i === n - 1) corpo += `<rect x="-6" y="${f2(yUlt + fs * 0.06)}" width="${f2(larg[i] + 12)}" height="${f2(fs * 0.9)}" fill="${k.forte}"/>`;
        corpo += `<text x="0" y="${f2(y)}" font-family='${fam}' font-weight="${f.lw}" font-size="${fs}" letter-spacing="${f2(fs * 0.01)}" fill="${i === n - 1 ? k.sobre : k.nome}">${esc(l)}</text>`;
      });
      const cy = 26, cx = maxW + 38;
      corpo += `<circle cx="${f2(cx)}" cy="${cy}" r="24" fill="${k.acento}"/>${icG(ic, cx - 15, cy - 15, 30, variante === 'cor' ? c.onAcc : k.sobre, 2.3)}`;
      corpo += tagTxt(0, n * lh + fs * 0.25 + 14);
      return { W: Math.max(maxW + 70, tw + 10), H: n * lh + fs * 0.25 + 22, corpo };
    }
    case 'manuscrito': {
      const famS = esc(f.scriptLogo ? f.logo : FONTE_MANUSCRITO);
      const txt = aplicarCaixa(ctx.nome, 'titulo'), fs = compacto ? 64 : 82;
      const nw = medir(txt, f.scriptLogo ? f.logo : FONTE_MANUSCRITO, 700, fs, 0);
      const base = fs * 0.9, y = base + fs * 0.16;
      const swash = `<path d="M 6 ${f2(y)} C ${f2(nw * 0.32)} ${f2(y + 11)}, ${f2(nw * 0.62)} ${f2(y - 7)}, ${f2(nw * 0.96)} ${f2(y + 1)}" fill="none" stroke="${k.acento}" stroke-width="${compacto ? 2.6 : 3.4}" stroke-linecap="round"/>`;
      const letra = `<text x="0" y="${f2(base)}" font-family='${famS}' font-weight="700" font-size="${fs}" fill="${k.nome}">${esc(txt)}</text>`;
      if (compacto) return { W: nw + 10, H: y + 10, corpo: letra + swash };
      return { W: Math.max(nw + 44, tw + 10), H: y + 40, corpo: `${letra}${swash}${icG(ic, nw + 8, base - fs * 0.72, 28, k.acento, 2)}${tagTxt(4, y + 30)}` };
    }
    case 'app': {
      const fs = 48, nw = medir(nome, f.logo, f.lw, fs, tr);
      return { W: 100 + 22 + Math.max(nw, tw) + 6, H: 100, corpo: `${sym(0, 0, 1)}${nomeTxt(122, 56, fs)}${tagTxt(124, 84)}` };
    }
    case 'organico': {
      const fs = 48, nw = medir(nome, f.logo, f.lw, fs, tr);
      return { W: 100 + 22 + Math.max(nw, tw) + 6, H: 100, corpo: `${sym(0, 0, 1)}${nomeTxt(122, 56, fs)}${tagTxt(124, 84)}` };
    }
    default:
      return null;
  }
}

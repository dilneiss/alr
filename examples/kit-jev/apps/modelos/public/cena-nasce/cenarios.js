// Fachada dos cenários. O desenho mora em cenarios-base.js, as variantes em
// cenarios-variantes.js e as peças em cenarios-pecas.js. Aqui só se monta a cena.
import { resolver, VARIANTES, PROPS, META } from './cenarios-variantes.js';
import { svg } from './cenarios-pecas.js';

export { VARIANTES, PROPS, META };
export const IDS = Object.keys(VARIANTES);
export const ESPECIAIS = { espaco: 'espaco', fundo_do_mar: 'agua' };

// apelidos de ids que existiam antes desta mudança
export const APELIDOS = {
  quarto: 'casa_quarto',
  montanha_nevada: 'montanha',
};

export function cenario(id, u, { casa = null, estadoCasa = {} } = {}) {
  const alvo = APELIDOS[id] || id;
  const c = resolver(alvo, u);
  if (!c) {
    // Não deveria acontecer: o guard estrutural garante que todo id tem desenho.
    console.warn('[cenarios] sem desenho para', id, '— usando campo');
    return resolver('campo', u);
  }
  const desenhoCasa = casaDollhouse(casa, estadoCasa);
  return { ...c, camadas: { ...c.camadas, meio: c.camadas.meio + desenhoCasa } };
}

// a casa em corte, desenhada por cima da base (inalterada)
export function casaDollhouse(item, { interior = false, portaAberta = false } = {}) {
  if (!item?.casa) return '';
  const altura = Math.max(170, Math.min(Number(item.altura) || 280, 420));
  const escala = altura / 280;
  const x = 800;
  const base = 690;
  const topo = base - altura;
  const largura = altura * 1.35;
  const esquerda = x - largura / 2;
  const cores = [['#d9b889', '#9c563c'], ['#c9c6df', '#574b82'], ['#b9d5a7', '#557743'], ['#c8d9e6', '#486c8b'], ['#e5c7a4', '#9b6a3d'], ['#d7a4a0', '#783f4b'], ['#a7c9c7', '#3f7774'], ['#dbdbb5', '#82884c']];
  const tom = [...String(item.id || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % cores.length;
  const [parede, telhado] = cores[tom];
  const emblema = String(item.emoji || '🏠').replace(/[&<>]/g, '');
  const fachadaOpacity = interior ? 0.22 : 1;
  const portaX = x + largura * 0.19;
  const portaY = base - altura * 0.43;
  const portaW = largura * 0.2;
  const portaH = altura * 0.43;
  return svg(`<g class="cn-dollhouse" data-house-id="${String(item.id || '').replace(/[&"<>']/g, '')}" data-interior="${interior}" data-door-open="${portaAberta}" transform="translate(0 0)">
    <ellipse cx="${x}" cy="${base + 8}" rx="${largura * 0.62}" ry="${altura * 0.055}" fill="#263238" fill-opacity=".2"/>
    <text class="cn-casa-emblema" x="${x}" y="${topo + altura * .12}" text-anchor="middle" font-size="${Math.max(42, altura * .23)}" aria-hidden="true">${emblema}</text>
    <g class="cn-interior" opacity="${interior ? 1 : 0}" visibility="${interior ? 'visible' : 'hidden'}">
      <rect x="${esquerda + largura * .08}" y="${topo + altura * .28}" width="${largura * .84}" height="${altura * .69}" fill="#f6e8ca" stroke="#75543b" stroke-width="${5 * escala}"/>
      <path d="M${esquerda + largura * .08} ${topo + altura * .74} H${x + largura * .08} V${base - 5 * escala} H${esquerda + largura * .08} Z" fill="#bf8b5b"/>
      <path d="M${x + largura * .08} ${topo + altura * .74} H${esquerda + largura * .92} V${base - 5 * escala} H${x + largura * .08} Z" fill="#d4a56f"/>
      <rect x="${esquerda + largura * .18}" y="${topo + altura * .42}" width="${largura * .23}" height="${altura * .22}" rx="${4 * escala}" fill="#91c9d8" stroke="#fff5df" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .16} ${topo + altura * .68} h${largura * .34} l${-largura * .04} ${altura * .045} h${-largura * .27} Z" fill="#c55f4e"/>
      <rect x="${x + largura * .22}" y="${topo + altura * .58}" width="${largura * .3}" height="${altura * .08}" rx="${5 * escala}" fill="#9c6745"/>
      <rect x="${x + largura * .3}" y="${topo + altura * .35}" width="${largura * .16}" height="${altura * .15}" fill="#f7d777" stroke="#fff5df" stroke-width="${5 * escala}"/>
      <path d="M${x} ${topo + altura * .3} V${base}" stroke="#8d694c" stroke-width="${5 * escala}" opacity=".65"/>
    </g>
    <g class="cn-fachada" opacity="${fachadaOpacity}">
      <path d="M${esquerda} ${topo + altura * .31} L${x} ${topo} L${esquerda + largura} ${topo + altura * .31} V${base} H${esquerda} Z" fill="${parede}" stroke="#704832" stroke-width="${7 * escala}" stroke-linejoin="round"/>
      <path d="M${esquerda - largura * .06} ${topo + altura * .32} L${x} ${topo - altura * .08} L${esquerda + largura * 1.06} ${topo + altura * .32} L${esquerda + largura} ${topo + altura * .4} L${x} ${topo + altura * .02} L${esquerda} ${topo + altura * .4} Z" fill="${telhado}" stroke="#704832" stroke-width="${6 * escala}" stroke-linejoin="round"/>
      <path d="M${esquerda + largura * .08} ${base - altura * .07} H${esquerda + largura * .92}" stroke="#8b674a" stroke-width="${5 * escala}"/>
      <rect x="${esquerda + largura * .15}" y="${topo + altura * .39}" width="${largura * .2}" height="${altura * .2}" rx="${4 * escala}" fill="#8dc9d7" stroke="#fff0d4" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .25} ${topo + altura * .39} V${topo + altura * .59} M${esquerda + largura * .15} ${topo + altura * .49} H${esquerda + largura * .35}" stroke="#fff0d4" stroke-width="${4 * escala}"/>
      <rect x="${esquerda + largura * .7}" y="${topo + altura * .39}" width="${largura * .2}" height="${altura * .2}" rx="${4 * escala}" fill="#8dc9d7" stroke="#fff0d4" stroke-width="${7 * escala}"/>
      <path d="M${esquerda + largura * .8} ${topo + altura * .39} V${topo + altura * .59} M${esquerda + largura * .7} ${topo + altura * .49} H${esquerda + largura * .9}" stroke="#fff0d4" stroke-width="${4 * escala}"/>
      <g class="cn-porta" transform="translate(${portaX} ${portaY})">
        <rect x="0" y="0" width="${portaW}" height="${portaH}" rx="${5 * escala}" fill="${portaAberta ? '#b77c4f' : '#765039'}" stroke="#f2d7ad" stroke-width="${4 * escala}" transform="${portaAberta ? `rotate(-68 0 ${portaH * .5})` : ''}"/>
        <circle cx="${portaW * .78}" cy="${portaH * .55}" r="${3.5 * escala}" fill="#f4d67c"/>
      </g>
      <rect x="${esquerda}" y="${base - 8 * escala}" width="${largura}" height="${10 * escala}" fill="#80553a"/>
    </g>
    <g class="cn-porta-estado" opacity="${portaAberta ? 1 : 0}">
      <path d="M${portaX + portaW * .52} ${base - portaH * .5} q${portaW * .65} ${-portaH * .06} ${portaW * .7} ${-portaH * .38}" fill="none" stroke="#f4d67c" stroke-width="${4 * escala}" stroke-dasharray="${7 * escala} ${6 * escala}"/>
    </g>
  </g>`);
}

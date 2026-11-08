// Como cada personagem e objeto do catálogo aparece em cena. As imagens são os emoji 3D da Microsoft (Fluent Emoji,
// licença MIT, em assets/); quem no emoji é só cabeça ou busto ganha aqui um corpo desenhado em SVG, no mesmo estilo,
// com braços e pernas separados (classes braco-e/braco-d/perna-e/perna-d) para o CSS mexer conforme a ação.
// Para adaptar: um personagem novo precisa só de uma linha em CAIXA (a parte desenhada do PNG de 256 px).

// parte desenhada de cada PNG [x, y, largura, altura] — a base da caixa é o chão (o pé do personagem)
const CAIXA = {
  cachorro: [16, 40, 224, 200], gato: [16, 24, 224, 216], dragao: [24, 17, 215, 224], fantasma: [16, 16, 224, 224],
  sereia: [45, 17, 166, 222], dinossauro: [16, 32, 224, 208], coruja: [40, 16, 176, 224], macaco: [17, 44, 223, 196],
  pinguim: [32, 49, 192, 190], fada: [47, 17, 151, 222], castelo: [23, 17, 211, 223], casa: [16, 47, 224, 193],
  arvore: [36, 15, 184, 225], palmeira: [32, 16, 192, 224], barco: [16, 16, 224, 224], disco_voador: [16, 50, 224, 190],
  carro: [16, 88, 224, 152], bolo: [15, 16, 226, 224], presente: [22, 17, 210, 223], balao: [53, 16, 165, 224],
  cogumelo: [33, 33, 189, 193], boneco_neve: [16, 16, 217, 224],
};

// gradientes usados pelos corpos (definidos uma vez na página, num <svg> escondido)
export const DEFS = `
<linearGradient id="cn-g-pele" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset=".55" stop-color="#ffbc34"/><stop offset="1" stop-color="#f09a3c"/></linearGradient>
<linearGradient id="cn-g-rosa" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffa3cd"/><stop offset="1" stop-color="#e2457f"/></linearGradient>
<linearGradient id="cn-g-azul" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#62adff"/><stop offset="1" stop-color="#2459e0"/></linearGradient>
<linearGradient id="cn-g-marinho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a52b8"/><stop offset="1" stop-color="#1c2a6e"/></linearGradient>
<linearGradient id="cn-g-lilas" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#d0bcff"/><stop offset="1" stop-color="#8d63ee"/></linearGradient>
<linearGradient id="cn-g-roxo" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#8657e6"/><stop offset="1" stop-color="#4f2aa3"/></linearGradient>
<linearGradient id="cn-g-sapato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b4c33"/><stop offset="1" stop-color="#432719"/></linearGradient>
<linearGradient id="cn-g-sapato-rosa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5c95"/><stop offset="1" stop-color="#b8205a"/></linearGradient>
<linearGradient id="cn-g-tenis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd6e4"/></linearGradient>
<linearGradient id="cn-g-branco" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dfeb"/></linearGradient>
<linearGradient id="cn-g-preto" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#454c5e"/><stop offset="1" stop-color="#151a26"/></linearGradient>
<linearGradient id="cn-g-robo" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#f6f2fd"/><stop offset="1" stop-color="#b7a8d8"/></linearGradient>
<linearGradient id="cn-g-robo-escuro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#554b74"/><stop offset="1" stop-color="#2a2440"/></linearGradient>
<linearGradient id="cn-g-alien" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#b9f07c"/><stop offset="1" stop-color="#4cb04a"/></linearGradient>
<linearGradient id="cn-g-prata" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#f1f4f9"/><stop offset="1" stop-color="#9aa7bb"/></linearGradient>
<linearGradient id="cn-g-traje" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d2c4e6"/><stop offset=".45" stop-color="#c2b3d3"/><stop offset=".85" stop-color="#e6d9fa"/></linearGradient>
<linearGradient id="cn-g-traje-v" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#f1e9fb"/><stop offset="1" stop-color="#c3b4da"/></linearGradient>
<linearGradient id="cn-g-luva" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9add3"/><stop offset="1" stop-color="#8a7fa8"/></linearGradient>
<linearGradient id="cn-g-heroi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3d72ea"/><stop offset="1" stop-color="#4a8cff"/></linearGradient>
<linearGradient id="cn-g-heroi-v" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#5590ff"/><stop offset="1" stop-color="#2c58d2"/></linearGradient>
<linearGradient id="cn-g-capa" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ef3d5a"/><stop offset="1" stop-color="#99112d"/></linearGradient>
<linearGradient id="cn-g-vermelho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset="1" stop-color="#b91c2c"/></linearGradient>
<linearGradient id="cn-g-ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe789"/><stop offset="1" stop-color="#e09f1d"/></linearGradient>
<linearGradient id="cn-g-manto" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#4aaeff"/><stop offset="1" stop-color="#2464d4"/></linearGradient>
<linearGradient id="cn-g-madeira" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d79a55"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>
<linearGradient id="cn-g-barba" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#f6f0fd"/><stop offset="1" stop-color="#c3b9d3"/></linearGradient>
<linearGradient id="cn-g-leao" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffcd66"/><stop offset="1" stop-color="#dd8a2b"/></linearGradient>
<linearGradient id="cn-g-leao-pata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b2"/><stop offset="1" stop-color="#f4b24f"/></linearGradient>
<linearGradient id="cn-g-sapo" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#86e690"/><stop offset="1" stop-color="#2aa257"/></linearGradient>
<linearGradient id="cn-g-unicornio" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fffbff"/><stop offset="1" stop-color="#d9c6f6"/></linearGradient>
<linearGradient id="cn-g-casco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe17d"/><stop offset="1" stop-color="#df9f25"/></linearGradient>
<linearGradient id="cn-g-bau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9823f"/><stop offset="1" stop-color="#7a4520"/></linearGradient>
<linearGradient id="cn-g-bau-tampa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dc9450"/><stop offset="1" stop-color="#8f5427"/></linearGradient>
<radialGradient id="cn-g-tesouro" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c2" stop-opacity=".95"/><stop offset=".6" stop-color="#ffd84a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>
<linearGradient id="cn-g-zumbi-pele" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76ba53"/><stop offset="1" stop-color="#4e8334"/></linearGradient>
<linearGradient id="cn-g-zumbi-roupa" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#3b6991"/><stop offset="1" stop-color="#1f3d57"/></linearGradient>
<linearGradient id="cn-g-esqueleto" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f8f6ee"/><stop offset="1" stop-color="#cfcab6"/></linearGradient>
<linearGradient id="cn-g-espectral" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#e0f7fa" stop-opacity=".85"/><stop offset="1" stop-color="#b2ebf2" stop-opacity=".4"/></linearGradient>
<linearGradient id="cn-g-sereia-cauda" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d2d3"/><stop offset="1" stop-color="#0984e3"/></linearGradient>
<linearGradient id="cn-g-sereia-conchas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ff3"/><stop offset="1" stop-color="#f368e0"/></linearGradient>
<linearGradient id="cn-g-armadura" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".5" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></linearGradient>
<linearGradient id="cn-g-tunica-aldeao" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#8d5b34"/><stop offset="1" stop-color="#5a381d"/></linearGradient>
`;

// ---------- peças comuns ----------
const pele = 'var(--cn-corpo, url(#cn-g-pele))';
const brilho = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="6" stroke-linecap="round"/>`;
// braço: retângulo arredondado pendurado no ombro + mão; o grupo gira em volta do ombro (topo da caixa)
function braco(lado, x, y, comp, larg, manga, mao = pele) {
  return `<g class="braco braco-${lado}"><rect x="${x}" y="${y}" width="${larg}" height="${comp}" rx="${larg / 2}" fill="${manga}"/>`
    + `<circle cx="${x + larg / 2}" cy="${y + comp + 3}" r="${larg * 0.62}" fill="${mao}"/></g>`;
}
function perna(lado, x, y, comp, larg, cor, sapato, sx, sy, srx, sry) {
  return `<g class="perna perna-${lado}"><rect x="${x}" y="${y}" width="${larg}" height="${comp}" rx="${larg / 2}" fill="${cor}"/>`
    + `<ellipse cx="${sx}" cy="${sy}" rx="${srx}" ry="${sry}" fill="${sapato}"/>`
    + `<ellipse cx="${sx - srx * 0.35}" cy="${sy - sry * 0.35}" rx="${srx * 0.32}" ry="${sry * 0.3}" fill="#fff" fill-opacity=".35"/></g>`;
}
const cabeca = (u, arq, x = 0, y = 0, t = 256) => `<image class="cab" href="${u(arq)}" x="${x}" y="${y}" width="${t}" height="${t}"/>`;
// Slots vazios e em coordenadas locais do sprite; conteúdo pode ser inserido sem alterar o desenho-base.
function socketsDe(item) {
  if (item.tipo !== 'personagem') return '';
  const c = COMPOSTO[item.id];
  const anchors = c && ['menina', 'menino', 'vovo', 'pirata', 'robo', 'alien', 'astronauta', 'heroi', 'bruxa', 'mago', 'zumbi', 'esqueleto', 'fantasma', 'fada', 'sereia', 'aldeao', 'guerreiro', 'apresentador', 'tecnico_celular', 'analista_dados', 'atendente_recepcao'].includes(c)
    ? { 'socket-mao-d': [187, 294], 'socket-mao-e': [69, 294], 'socket-costas': [54, 220] }
    : { 'socket-mao-d': [190, 190], 'socket-mao-e': [66, 190], 'socket-costas': [48, 144] };
  return Object.entries(anchors).map(([name, [x, y]]) => {
    const slot = name.replace('socket-', '');
    return `<g class="cn-socket ${name} slot-${slot}" data-socket="${slot}" transform="translate(${x} ${y})"></g>`;
  }).join('');
}

// Regiões vetoriais sobre a cabeça do boneco composto. Ocultas inicialmente para preservar o emoji original;
// palco/CSS pode revelar cada região e variar os elementos filhos via classes/data attributes.
export function faceOverlay() {
  return `<g class="cn-face-overlay" data-face-overlay="true" pointer-events="none">`
    + `<g class="cn-face-region cn-face-sobrancelhas" data-face-region="sobrancelhas" opacity="0"><path class="sobrancelha sob-e" d="M96 118 Q108 111 119 118" fill="none" stroke="#49312b" stroke-width="5" stroke-linecap="round"/><path class="sobrancelha sob-d" d="M137 118 Q148 111 160 118" fill="none" stroke="#49312b" stroke-width="5" stroke-linecap="round"/></g>`
    + `<g class="cn-face-region cn-face-olhos" data-face-region="olhos" opacity="0"><ellipse class="olho olho-e" cx="108" cy="135" rx="7" ry="9" fill="#fff"/><ellipse class="olho olho-d" cx="148" cy="135" rx="7" ry="9" fill="#fff"/><circle class="pupila pupila-e" cx="109" cy="136" r="3.5" fill="#30251f"/><circle class="pupila pupila-d" cx="149" cy="136" r="3.5" fill="#30251f"/></g>`
    + `<g class="cn-face-region cn-face-boca" data-face-region="boca" opacity="0"><path class="boca boca-sorriso" d="M112 163 Q128 177 144 163" fill="none" stroke="#8f3f47" stroke-width="5" stroke-linecap="round"/><ellipse class="boca-aberta" cx="128" cy="166" rx="9" ry="6" fill="#8f3f47"/></g>`
    + `<g class="cn-face-region cn-face-bochechas" data-face-region="bochechas" opacity="0"><ellipse cx="89" cy="151" rx="9" ry="5" fill="#f47e88"/><ellipse cx="167" cy="151" rx="9" ry="5" fill="#f47e88"/></g>`
    + `</g>`;
}


// ---------- corpos desenhados (unidades da cabeça de 256) ----------
const CORPOS = {
  menina: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 103, 296, 52, 19, pele, 'url(#cn-g-sapato-rosa)', 111, 350, 17, 10)
      + perna('d', 134, 296, 52, 19, pele, 'url(#cn-g-sapato-rosa)', 145, 350, 17, 10)
      + braco('e', 79, 238, 52, 16, pele) + braco('d', 161, 238, 52, 16, pele)
      + `<path d="M92 224 C110 216 146 216 164 224 L188 302 C191 313 184 320 174 320 L82 320 C72 320 65 313 68 302 Z" fill="url(#cn-g-rosa)"/>`
      + brilho('M98 236 C104 262 96 288 86 306')
      + `<path d="M86 262 C108 271 148 271 170 262" fill="none" stroke="#c22f69" stroke-opacity=".45" stroke-width="5"/>`
      + `<g fill="#fff" fill-opacity=".6"><circle cx="104" cy="290" r="4.5"/><circle cx="130" cy="303" r="4.5"/><circle cx="156" cy="287" r="4.5"/><circle cx="118" cy="279" r="3"/><circle cx="146" cy="308" r="3"/><circle cx="172" cy="306" r="3"/></g>`
      + `<circle cx="91" cy="238" r="15" fill="url(#cn-g-rosa)"/><circle cx="165" cy="238" r="15" fill="url(#cn-g-rosa)"/>`
      + cabeca(u, 'menina.png'),
  }),
  menino: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 308, 42, 18, pele, 'url(#cn-g-tenis)', 111, 350, 18, 10)
      + perna('d', 134, 308, 42, 18, pele, 'url(#cn-g-tenis)', 145, 350, 18, 10)
      + `<path d="M98 351 h26 M132 351 h26" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M90 292 L166 292 L170 322 C170 326 167 329 163 329 L132 329 L128 312 L124 329 L93 329 C89 329 86 326 86 322 Z" fill="url(#cn-g-marinho)"/>`
      + braco('e', 78, 236, 50, 17, pele) + braco('d', 161, 236, 50, 17, pele)
      + `<path d="M90 226 C108 218 148 218 166 226 L174 290 C175 297 170 300 164 300 L92 300 C86 300 81 297 82 290 Z" fill="url(#cn-g-azul)"/>`
      + brilho('M97 236 C101 258 96 280 92 292')
      + `<rect x="72" y="228" width="28" height="28" rx="12" fill="url(#cn-g-azul)"/><rect x="156" y="228" width="28" height="28" rx="12" fill="url(#cn-g-azul)"/>`
      + `<path d="M128 249 l5.3 10.8 11.9 1.7 -8.6 8.4 2 11.8 -10.6 -5.6 -10.6 5.6 2 -11.8 -8.6 -8.4 11.9 -1.7 Z" fill="url(#cn-g-ouro)"/>`
      + cabeca(u, 'menino.png'),
  }),
  vovo: (u) => ({
    caixa: [26, 12, 204, 352],
    svg: perna('e', 106, 330, 22, 16, pele, 'url(#cn-g-sapato)', 113, 352, 16, 9)
      + perna('d', 134, 330, 22, 16, pele, 'url(#cn-g-sapato)', 143, 352, 16, 9)
      + braco('e', 77, 234, 50, 18, 'url(#cn-g-roxo)') + braco('d', 161, 234, 50, 18, 'url(#cn-g-roxo)')
      + `<path d="M92 224 C110 216 146 216 164 224 L184 334 C186 343 181 348 173 348 L83 348 C75 348 70 343 72 334 Z" fill="url(#cn-g-lilas)"/>`
      + `<path d="M90 226 C98 221 108 221 114 224 L110 306 C100 308 90 306 80 300 Z" fill="url(#cn-g-roxo)"/><path d="M166 226 C158 221 148 221 142 224 L146 306 C156 308 166 306 176 300 Z" fill="url(#cn-g-roxo)"/>`
      + brilho('M96 238 C100 262 94 284 88 298')
      + `<g fill="#f5e9ff"><circle cx="106" cy="258" r="3.5"/><circle cx="105" cy="276" r="3.5"/><circle cx="150" cy="258" r="3.5"/><circle cx="151" cy="276" r="3.5"/></g>`
      + `<g fill="#fff"><circle cx="110" cy="233" r="4"/><circle cx="119" cy="239" r="4"/><circle cx="128" cy="241" r="4"/><circle cx="137" cy="239" r="4"/><circle cx="146" cy="233" r="4"/></g>`
      + cabeca(u, 'vovo.png'),
  }),
  pirata: (u) => ({
    caixa: [6, -26, 244, 390],
    svg: `<defs><clipPath id="cn-clip-pirata"><path d="M88 228 C108 220 148 220 168 228 L174 298 C174 304 170 306 164 306 L92 306 C86 306 82 304 82 298 Z"/></clipPath></defs>`
      + `<g class="perna perna-e"><rect x="100" y="298" width="24" height="34" rx="9" fill="url(#cn-g-preto)"/><rect x="95" y="320" width="31" height="34" rx="10" fill="#1b1d24"/><rect x="92" y="316" width="37" height="11" rx="5" fill="#3d4150"/><ellipse cx="106" cy="353" rx="20" ry="8" fill="#111318"/></g>`
      + `<g class="perna perna-d"><rect x="132" y="298" width="24" height="34" rx="9" fill="url(#cn-g-preto)"/><rect x="130" y="320" width="31" height="34" rx="10" fill="#1b1d24"/><rect x="127" y="316" width="37" height="11" rx="5" fill="#3d4150"/><ellipse cx="150" cy="353" rx="20" ry="8" fill="#111318"/></g>`
      + `<g class="braco braco-e"><rect x="76" y="234" width="19" height="34" rx="9" fill="#fff"/><rect x="76" y="246" width="19" height="7" fill="#ef4444"/><rect x="79" y="264" width="14" height="24" rx="7" fill="${pele}"/><circle cx="86" cy="292" r="10" fill="${pele}"/></g>`
      + `<g class="braco braco-d"><rect x="161" y="234" width="19" height="34" rx="9" fill="#fff"/><rect x="161" y="246" width="19" height="7" fill="#ef4444"/><rect x="163" y="264" width="14" height="24" rx="7" fill="${pele}"/><circle cx="170" cy="292" r="10" fill="${pele}"/></g>`
      + `<g clip-path="url(#cn-clip-pirata)"><rect x="80" y="216" width="96" height="92" fill="url(#cn-g-branco)"/><g fill="#ef4444"><rect x="80" y="238" width="96" height="8"/><rect x="80" y="256" width="96" height="8"/><rect x="80" y="274" width="96" height="8"/></g></g>`
      + `<rect x="84" y="288" width="88" height="13" rx="4" fill="#6b3f22"/><rect x="117" y="286" width="22" height="17" rx="3" fill="none" stroke="#fbbf24" stroke-width="4"/>`
      + cabeca(u, 'pirata.png')
      + `<path d="M54 98 L142 128 M178 131 L226 150" stroke="#14161c" stroke-width="7" stroke-linecap="round"/>`
      + `<ellipse cx="160" cy="137" rx="23" ry="20" fill="#14161c"/><ellipse cx="153" cy="130" rx="7" ry="4" fill="#fff" fill-opacity=".25"/>`
      + `<path d="M64 60 C70 14 186 14 192 60 Z" fill="url(#cn-g-preto)"/>`
      + `<path d="M8 66 C60 36 196 36 248 66 C222 90 34 90 8 66 Z" fill="url(#cn-g-preto)"/><path d="M8 66 C60 36 196 36 248 66" fill="none" stroke="url(#cn-g-ouro)" stroke-width="5"/>`
      + `<g transform="translate(128 46)"><path d="M-14 6 L14 20 M14 6 L-14 20" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle r="11" fill="#fff"/><circle cx="-4" cy="-1" r="3" fill="#14161c"/><circle cx="4" cy="-1" r="3" fill="#14161c"/></g>`
      + `<image href="${u('fx-papagaio.png')}" x="176" y="-30" width="78" height="78"/>`,
  }),
  robo: (u) => ({
    caixa: [12, 12, 232, 344],
    svg: `<rect x="112" y="230" width="32" height="16" rx="4" fill="url(#cn-g-robo-escuro)"/>`
      + `<g class="perna perna-e"><rect x="98" y="304" width="22" height="36" rx="7" fill="url(#cn-g-robo)"/><rect x="89" y="336" width="38" height="18" rx="9" fill="url(#cn-g-robo-escuro)"/></g>`
      + `<g class="perna perna-d"><rect x="136" y="304" width="22" height="36" rx="7" fill="url(#cn-g-robo)"/><rect x="129" y="336" width="38" height="18" rx="9" fill="url(#cn-g-robo-escuro)"/></g>`
      + `<g class="braco braco-e"><rect x="62" y="250" width="17" height="46" rx="8.5" fill="url(#cn-g-robo)"/><circle cx="70.5" cy="300" r="11" fill="url(#cn-g-robo-escuro)"/><circle cx="70.5" cy="304" r="5" fill="#a99bd1"/></g>`
      + `<g class="braco braco-d"><rect x="177" y="250" width="17" height="46" rx="8.5" fill="url(#cn-g-robo)"/><circle cx="185.5" cy="300" r="11" fill="url(#cn-g-robo-escuro)"/><circle cx="185.5" cy="304" r="5" fill="#a99bd1"/></g>`
      + `<rect x="76" y="240" width="104" height="72" rx="20" fill="url(#cn-g-robo)"/>`
      + `<rect x="98" y="254" width="60" height="40" rx="9" fill="url(#cn-g-robo-escuro)"/>`
      + `<circle class="luz l1" cx="113" cy="274" r="6.5" fill="#ff5a6e"/><circle class="luz l2" cx="128" cy="274" r="6.5" fill="#ffd23f"/><circle class="luz l3" cx="143" cy="274" r="6.5" fill="#36d6ff"/>`
      + brilho('M86 252 C84 270 86 288 92 300')
      + cabeca(u, 'robo.png'),
  }),
  alien: (u) => ({
    caixa: [14, 12, 228, 340],
    svg: `<rect x="120" y="224" width="16" height="24" rx="7" fill="url(#cn-g-alien)"/>`
      + perna('e', 108, 290, 44, 15, 'url(#cn-g-prata)', 'url(#cn-g-alien)', 113, 338, 15, 8)
      + perna('d', 133, 290, 44, 15, 'url(#cn-g-prata)', 'url(#cn-g-alien)', 143, 338, 15, 8)
      + braco('e', 88, 248, 46, 13, 'url(#cn-g-prata)', 'url(#cn-g-alien)') + braco('d', 155, 248, 46, 13, 'url(#cn-g-prata)', 'url(#cn-g-alien)')
      + `<path d="M104 244 C112 238 144 238 152 244 L160 290 C160 298 152 302 144 302 L112 302 C104 302 96 298 96 290 Z" fill="url(#cn-g-prata)"/>`
      + `<rect x="96" y="284" width="64" height="9" rx="4" fill="#a3e635"/>`
      + brilho('M108 252 C106 266 106 278 108 288')
      + cabeca(u, 'alienigena.png'),
  }),
  astronauta: (u) => ({
    caixa: [26, 14, 204, 344],
    svg: braco('e', 40, 222, 58, 26, 'url(#cn-g-traje-v)', 'url(#cn-g-luva)') + braco('d', 190, 222, 58, 26, 'url(#cn-g-traje-v)', 'url(#cn-g-luva)')
      + `<g class="perna perna-e"><rect x="82" y="290" width="40" height="44" rx="15" fill="url(#cn-g-traje-v)"/><ellipse cx="102" cy="312" rx="13" ry="8" fill="#b6aad0"/><rect x="76" y="328" width="50" height="24" rx="11" fill="#8d86a6"/></g>`
      + `<g class="perna perna-d"><rect x="134" y="290" width="40" height="44" rx="15" fill="url(#cn-g-traje-v)"/><ellipse cx="154" cy="312" rx="13" ry="8" fill="#b6aad0"/><rect x="130" y="328" width="50" height="24" rx="11" fill="#8d86a6"/></g>`
      + `<path d="M48 232 L222 232 L208 288 C206 296 199 300 191 300 L79 300 C71 300 64 296 62 288 Z" fill="url(#cn-g-traje)"/>`
      + `<rect x="66" y="284" width="138" height="12" rx="5" fill="#a99cc4"/>`
      + cabeca(u, 'astronauta.png'),
  }),
  heroi: (u) => ({
    caixa: [2, 12, 252, 350],
    svg: `<path class="capa" d="M22 196 C16 260 8 320 4 356 C60 366 196 366 252 356 C248 320 240 260 234 196 Z" fill="url(#cn-g-capa)"/>`
      + braco('e', 36, 222, 56, 26, 'url(#cn-g-heroi-v)', 'url(#cn-g-vermelho)') + braco('d', 194, 222, 56, 26, 'url(#cn-g-heroi-v)', 'url(#cn-g-vermelho)')
      + `<g class="perna perna-e"><rect x="94" y="282" width="28" height="48" rx="12" fill="url(#cn-g-heroi-v)"/><rect x="90" y="316" width="35" height="38" rx="11" fill="url(#cn-g-vermelho)"/><rect x="88" y="314" width="39" height="10" rx="5" fill="#ff7a7a"/></g>`
      + `<g class="perna perna-d"><rect x="134" y="282" width="28" height="48" rx="12" fill="url(#cn-g-heroi-v)"/><rect x="131" y="316" width="35" height="38" rx="11" fill="url(#cn-g-vermelho)"/><rect x="129" y="314" width="39" height="10" rx="5" fill="#ff7a7a"/></g>`
      + `<path d="M46 232 L226 232 L206 280 C204 288 196 292 188 292 L84 292 C76 292 68 288 66 280 Z" fill="url(#cn-g-heroi)"/>`
      + `<rect x="70" y="270" width="132" height="13" rx="5" fill="url(#cn-g-ouro)"/>`
      + cabeca(u, 'super_heroi.png'),
  }),
  bruxa: (u) => ({
    caixa: [20, 12, 216, 352],
    svg: `<rect x="194" y="228" width="12" height="124" rx="6" fill="url(#cn-g-madeira)"/>`
      + `<g class="perna perna-e"><path d="M66 352 C66 340 90 338 104 346 L114 354 L66 356 Z" fill="#4c1d95"/></g>`
      + `<g class="perna perna-d"><path d="M118 352 C118 340 142 338 156 346 L166 354 L118 356 Z" fill="#4c1d95"/></g>`
      + `<path class="saia" d="M46 230 L182 230 C190 268 196 308 200 342 C201 350 196 352 188 352 L38 352 C30 352 26 350 27 342 C32 308 38 268 46 230 Z" fill="url(#cn-g-manto)"/>`
      + `<path d="M84 260 C80 290 78 320 76 348 M124 258 C124 290 124 320 124 350 M160 262 C166 290 170 320 172 348" fill="none" stroke="#1d4fb8" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`
      + brilho('M56 248 C50 280 46 310 42 336')
      + cabeca(u, 'bruxa.png'),
  }),
  mago: (u) => ({
    caixa: [20, 12, 216, 352],
    svg: `<rect x="194" y="228" width="12" height="124" rx="6" fill="url(#cn-g-madeira)"/>`
      + `<g class="perna perna-e"><path d="M66 352 C66 340 90 338 104 346 L114 354 L66 356 Z" fill="#3b2b7a"/></g>`
      + `<g class="perna perna-d"><path d="M118 352 C118 340 142 338 156 346 L166 354 L118 356 Z" fill="#3b2b7a"/></g>`
      + `<path class="saia" d="M44 230 L194 230 C198 268 200 308 202 342 C203 350 198 352 190 352 L36 352 C28 352 24 350 25 342 C30 308 36 268 44 230 Z" fill="url(#cn-g-manto)"/>`
      + `<path d="M96 228 C102 262 114 296 128 306 C142 296 154 262 160 228 Z" fill="url(#cn-g-barba)"/>`
      + `<path d="M70 262 C66 290 64 320 62 348 M178 262 C182 290 186 320 188 348" fill="none" stroke="#1d4fb8" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`
      + cabeca(u, 'mago.png'),
  }),
  leao: (u) => ({
    caixa: [14, 12, 238, 346],
    svg: `<path class="rabo" d="M188 306 C226 306 246 276 238 240" fill="none" stroke="url(#cn-g-leao)" stroke-width="12" stroke-linecap="round"/><circle cx="238" cy="234" r="14" fill="#5f2b51"/>`
      + `<ellipse cx="66" cy="318" rx="32" ry="28" fill="url(#cn-g-leao)"/><ellipse cx="190" cy="318" rx="32" ry="28" fill="url(#cn-g-leao)"/>`
      + `<ellipse cx="128" cy="286" rx="82" ry="64" fill="url(#cn-g-leao)"/><ellipse cx="128" cy="304" rx="36" ry="32" fill="#ffe2a6" fill-opacity=".8"/>`
      + `<g class="perna perna-e"><rect x="94" y="282" width="30" height="62" rx="15" fill="url(#cn-g-leao)"/><ellipse cx="108" cy="344" rx="20" ry="11" fill="url(#cn-g-leao-pata)"/><path d="M102 340 v8 M110 340 v8" stroke="#d68b33" stroke-width="2.5" stroke-linecap="round"/></g>`
      + `<g class="perna perna-d"><rect x="132" y="282" width="30" height="62" rx="15" fill="url(#cn-g-leao)"/><ellipse cx="148" cy="344" rx="20" ry="11" fill="url(#cn-g-leao-pata)"/><path d="M144 340 v8 M152 340 v8" stroke="#d68b33" stroke-width="2.5" stroke-linecap="round"/></g>`
      + cabeca(u, 'leao.png'),
  }),
  sapo: (u) => ({
    caixa: [0, 30, 256, 224],
    svg: `<ellipse cx="34" cy="204" rx="34" ry="32" fill="url(#cn-g-sapo)"/><ellipse cx="222" cy="204" rx="34" ry="32" fill="url(#cn-g-sapo)"/>`
      + `<ellipse cx="28" cy="243" rx="27" ry="10" fill="#36b866"/><ellipse cx="228" cy="243" rx="27" ry="10" fill="#36b866"/>`
      + cabeca(u, 'sapo.png')
      + `<g class="perna perna-e"><ellipse cx="94" cy="244" rx="24" ry="10" fill="url(#cn-g-sapo)"/><circle cx="76" cy="246" r="5" fill="#52cf78"/><circle cx="92" cy="250" r="5" fill="#52cf78"/><circle cx="110" cy="248" r="5" fill="#52cf78"/></g>`
      + `<g class="perna perna-d"><ellipse cx="162" cy="244" rx="24" ry="10" fill="url(#cn-g-sapo)"/><circle cx="146" cy="248" r="5" fill="#52cf78"/><circle cx="164" cy="250" r="5" fill="#52cf78"/><circle cx="180" cy="246" r="5" fill="#52cf78"/></g>`,
  }),
  unicornio: (u) => ({
    caixa: [12, 12, 430, 364],
    svg: `<g class="rabo"><path d="M372 238 C412 238 428 272 414 314" fill="none" stroke="#ff7de9" stroke-width="17" stroke-linecap="round"/><path d="M376 250 C404 256 410 288 396 322" fill="none" stroke="#b98cff" stroke-width="14" stroke-linecap="round"/><path d="M370 262 C392 272 394 300 380 328" fill="none" stroke="#7cc7ff" stroke-width="12" stroke-linecap="round"/></g>`
      + `<g class="perna perna-d"><rect x="168" y="286" width="22" height="78" rx="11" fill="#d7c6f1"/><rect x="166" y="352" width="26" height="18" rx="6" fill="url(#cn-g-casco)"/><rect x="322" y="286" width="22" height="78" rx="11" fill="#d7c6f1"/><rect x="320" y="352" width="26" height="18" rx="6" fill="url(#cn-g-casco)"/></g>`
      + `<ellipse cx="254" cy="262" rx="134" ry="58" fill="url(#cn-g-unicornio)"/><ellipse cx="150" cy="258" rx="56" ry="50" fill="url(#cn-g-unicornio)"/>`
      + `<g class="perna perna-e"><rect x="198" y="290" width="24" height="76" rx="12" fill="url(#cn-g-unicornio)"/><rect x="196" y="352" width="28" height="18" rx="6" fill="url(#cn-g-casco)"/><rect x="348" y="290" width="24" height="76" rx="12" fill="url(#cn-g-unicornio)"/><rect x="346" y="352" width="28" height="18" rx="6" fill="url(#cn-g-casco)"/></g>`
      + brilho('M170 232 C230 214 300 214 350 228')
      + cabeca(u, 'unicornio.png'),
  }),
  // objetos compostos
  bau: (u) => ({
    caixa: [26, 58, 204, 182],
    svg: `<path d="M40 120 C40 62 216 62 216 120 L216 134 L40 134 Z" fill="url(#cn-g-bau-tampa)"/><path d="M40 120 C40 62 216 62 216 120" fill="none" stroke="url(#cn-g-ouro)" stroke-width="7"/>`
      + `<rect x="44" y="126" width="168" height="22" fill="#3b2412"/>`
      + `<ellipse class="tesouro" cx="128" cy="132" rx="104" ry="40" fill="url(#cn-g-tesouro)"/>`
      + `<image href="${u('moeda.png')}" x="56" y="94" width="58" height="58"/><image href="${u('joia.png')}" x="104" y="80" width="62" height="62"/><image href="${u('moeda.png')}" x="152" y="98" width="50" height="50"/>`
      + `<rect x="36" y="140" width="184" height="96" rx="12" fill="url(#cn-g-bau)"/>`
      + `<path d="M44 172 H212 M44 204 H212" stroke="#5c3317" stroke-opacity=".4" stroke-width="3"/>`
      + `<rect x="36" y="140" width="184" height="13" rx="5" fill="url(#cn-g-ouro)"/><rect x="54" y="140" width="13" height="96" fill="url(#cn-g-ouro)"/><rect x="189" y="140" width="13" height="96" fill="url(#cn-g-ouro)"/>`
      + `<rect x="113" y="164" width="30" height="32" rx="6" fill="url(#cn-g-ouro)"/><circle cx="128" cy="176" r="4.5" fill="#5c3317"/><rect x="126" y="178" width="4" height="10" rx="2" fill="#5c3317"/>`,
  }),
  flor: (u) => ({
    caixa: [18, 60, 260, 174],
    svg: `<image href="${u('girassol.png')}" x="-6" y="34" width="180" height="180" transform="translate(0 28)"/>`
      + `<image href="${u('flor.png')}" x="96" y="40" width="176" height="176" transform="translate(0 26)"/>`
      + `<image href="${u('flor.png')}" x="170" y="96" width="132" height="132" transform="translate(0 14)"/>`,
  }),
  barco: (u) => ({
    caixa: [16, 16, 224, 186],
    svg: `<defs><clipPath id="cn-clip-barco"><rect x="0" y="0" width="256" height="200"/></clipPath></defs>`
      + `<g clip-path="url(#cn-clip-barco)"><image href="${u('barco.png')}" x="0" y="0" width="256" height="256"/></g>`,
  }),
  foguete: (u) => ({
    caixa: [70, -32, 116, 272],
    svg: `<defs><clipPath id="cn-clip-foguete"><rect x="0" y="-60" width="256" height="300"/></clipPath></defs>`
      + `<g class="chama-foguete"><image href="${u('fx-fogo.png')}" x="94" y="228" width="68" height="88"/></g>`
      + `<g class="cn-recorte" clip-path="url(#cn-clip-foguete)"><image href="${u('foguete.png')}" x="0" y="0" width="256" height="256" transform="rotate(-45 128 128)"/></g>`,
  }),
  zumbi: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 308, 42, 18, '#1e3850', '#2d3748', 111, 350, 18, 10)
      + perna('d', 134, 308, 42, 18, '#1e3850', '#2d3748', 145, 350, 18, 10)
      + `<path d="M106 322 l8 6 l-6 8 Z" fill="url(#cn-g-zumbi-pele)"/>`
      + braco('e', 76, 236, 50, 17, 'url(#cn-g-zumbi-roupa)', 'url(#cn-g-zumbi-pele)')
      + braco('d', 161, 236, 50, 17, 'url(#cn-g-zumbi-roupa)', 'url(#cn-g-zumbi-pele)')
      + `<path d="M88 226 C108 218 148 218 168 226 L174 292 L162 284 L152 296 L138 286 L124 298 L110 286 L98 296 L82 286 Z" fill="url(#cn-g-zumbi-roupa)"/>`
      + `<path d="M88 288 L168 288 L170 324 L142 320 L130 330 L118 318 L90 326 Z" fill="#1b2a38"/>`
      + cabeca(u, 'emoji/1f9df.svg', 16, 10, 224),
  }),
  esqueleto: (u) => ({
    caixa: [16, 12, 224, 352],
    svg: `<g class="perna perna-e"><rect x="108" y="302" width="11" height="48" rx="4" fill="url(#cn-g-esqueleto)"/><circle cx="113.5" cy="326" r="6" fill="#a8a29e"/><ellipse cx="113" cy="350" rx="14" ry="7" fill="#e7e5e4"/></g>`
      + `<g class="perna perna-d"><rect x="137" y="302" width="11" height="48" rx="4" fill="url(#cn-g-esqueleto)"/><circle cx="142.5" cy="326" r="6" fill="#a8a29e"/><ellipse cx="143" cy="350" rx="14" ry="7" fill="#e7e5e4"/></g>`
      + `<g class="braco braco-e"><rect x="80" y="238" width="10" height="52" rx="4" fill="url(#cn-g-esqueleto)"/><circle cx="85" cy="292" r="6" fill="#e7e5e4"/></g>`
      + `<g class="braco braco-d"><rect x="166" y="238" width="10" height="52" rx="4" fill="url(#cn-g-esqueleto)"/><circle cx="171" cy="292" r="6" fill="#e7e5e4"/></g>`
      + `<rect x="94" y="232" width="68" height="66" rx="12" fill="#1c1917"/>`
      + `<rect x="123" y="224" width="10" height="78" rx="4" fill="url(#cn-g-esqueleto)"/>`
      + `<path d="M98 244 h60 M102 256 h52 M106 268 h44 M110 280 h36" stroke="url(#cn-g-esqueleto)" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M112 292 L144 292 L136 308 L120 308 Z" fill="url(#cn-g-esqueleto)"/>`
      + cabeca(u, 'emoji/1f480.svg', 20, 12, 216),
  }),
  fantasma: (u) => ({
    caixa: [12, 12, 232, 340],
    svg: `<path d="M68 220 C68 180 188 180 188 220 L196 312 C196 332 176 336 166 318 C156 336 136 336 128 318 C120 336 100 336 90 318 C80 336 60 328 60 308 Z" fill="url(#cn-g-espectral)"/>`
      + `<g class="braco braco-e"><path d="M72 230 Q46 250 56 276 Q70 264 80 246 Z" fill="url(#cn-g-espectral)"/></g>`
      + `<g class="braco braco-d"><path d="M184 230 Q210 250 200 276 Q186 264 176 246 Z" fill="url(#cn-g-espectral)"/></g>`
      + cabeca(u, 'fantasma.png', 16, 12, 224),
  }),
  fada: (u) => ({
    caixa: [10, 10, 236, 350],
    svg: `<g class="asas-fada" opacity=".82">
        <path d="M72 210 Q10 160 38 230 Q68 246 80 234 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
        <path d="M184 210 Q246 160 218 230 Q188 246 176 234 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
      </g>`
      + perna('e', 106, 306, 42, 14, pele, '#f472b6', 112, 348, 14, 8)
      + perna('d', 136, 306, 42, 14, pele, '#f472b6', 142, 348, 14, 8)
      + braco('e', 78, 236, 48, 14, pele) + braco('d', 164, 236, 48, 14, pele)
      + `<path d="M96 226 C112 218 144 218 160 226 L178 300 C180 308 174 314 164 314 L92 314 C82 314 76 308 78 300 Z" fill="#fbcfe8"/>`
      + `<path d="M84 290 Q128 316 172 290" fill="none" stroke="#f472b6" stroke-width="4"/>`
      + cabeca(u, 'fada.png', 16, 10, 224),
  }),
  sereia: (u) => ({
    caixa: [10, 10, 236, 350],
    svg: braco('e', 76, 234, 50, 16, pele) + braco('d', 164, 234, 50, 16, pele)
      + `<path d="M96 226 C112 218 144 218 160 226 L164 278 L92 278 Z" fill="${pele}"/>`
      + `<circle cx="112" cy="242" r="14" fill="url(#cn-g-sereia-conchas)"/><circle cx="144" cy="242" r="14" fill="url(#cn-g-sereia-conchas)"/>`
      + `<path d="M90 274 H166 L158 316 Q146 348 116 350 Q94 330 98 296 Z" fill="url(#cn-g-sereia-cauda)"/>`
      + `<path d="M116 346 Q90 356 68 340 Q104 366 118 356 Q132 366 168 340 Q146 356 120 346 Z" fill="url(#cn-g-sereia-cauda)"/>`
      + cabeca(u, 'sereia.png', 16, 12, 224),
  }),
  aldeao: (u) => ({
    caixa: [14, 12, 228, 352],
    svg: perna('e', 104, 314, 38, 18, '#5a381d', '#29180c', 111, 352, 18, 9)
      + perna('d', 134, 314, 38, 18, '#5a381d', '#29180c', 145, 352, 18, 9)
      + braco('e', 74, 236, 54, 20, 'url(#cn-g-tunica-aldeao)', pele)
      + braco('d', 162, 236, 54, 20, 'url(#cn-g-tunica-aldeao)', pele)
      + `<path d="M90 224 C108 216 148 216 166 224 L176 324 L80 324 Z" fill="url(#cn-g-tunica-aldeao)"/>`
      + `<path d="M94 224 L128 252 L162 224" fill="none" stroke="#4d7c0f" stroke-width="12" stroke-linecap="round"/>`
      + `<rect x="86" y="282" width="84" height="10" rx="3" fill="#29180c"/>`
      + cabeca(u, 'emoji/1f9d1-200d-1f33e.svg', 16, 12, 224),
  }),
  guerreiro: (u) => ({
    caixa: [10, 10, 236, 352],
    svg: perna('e', 102, 304, 46, 20, '#475569', '#1e293b', 110, 350, 19, 10)
      + perna('d', 134, 304, 46, 20, '#475569', '#1e293b', 146, 350, 19, 10)
      + `<rect x="100" y="318" width="22" height="24" rx="6" fill="url(#cn-g-armadura)"/>`
      + `<rect x="134" y="318" width="22" height="24" rx="6" fill="url(#cn-g-armadura)"/>`
      + braco('e', 72, 232, 52, 19, 'url(#cn-g-armadura)', '#334155')
      + braco('d', 165, 232, 52, 19, 'url(#cn-g-armadura)', '#334155')
      + `<path d="M88 226 C108 218 148 218 168 226 L174 296 L82 296 Z" fill="url(#cn-g-armadura)"/>`
      + `<rect x="66" y="226" width="30" height="24" rx="8" fill="url(#cn-g-armadura)"/>`
      + `<rect x="160" y="226" width="30" height="24" rx="8" fill="url(#cn-g-armadura)"/>`
      + `<rect x="84" y="286" width="88" height="12" rx="4" fill="#78350f"/>`
      + `<rect x="120" y="283" width="16" height="18" rx="3" fill="#fbbf24"/>`
      + cabeca(u, 'emoji/1f9dd.svg', 16, 10, 224),
  }),
  apresentador: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 308, 42, 18, '#1e293b', '#0f172a', 111, 350, 18, 10)
      + perna('d', 134, 308, 42, 18, '#1e293b', '#0f172a', 145, 350, 18, 10)
      + braco('e', 76, 236, 50, 18, '#1e293b', pele)
      + braco('d', 162, 236, 50, 18, '#1e293b', pele)
      + `<path d="M88 226 C108 218 148 218 168 226 L174 300 L82 300 Z" fill="#1e293b"/>`
      + `<polygon points="116,226 140,226 128,260" fill="#ffffff"/>`
      + `<polygon points="125,230 131,230 130,270 126,270" fill="#ef4444"/>`
      + `<rect x="88" y="296" width="80" height="10" rx="3" fill="#0f172a"/>`
      + cabeca(u, 'menino.png', 16, 12, 224),
  }),
  tecnico_celular: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 308, 42, 18, '#334155', '#1e293b', 111, 350, 18, 10)
      + perna('d', 134, 308, 42, 18, '#334155', '#1e293b', 145, 350, 18, 10)
      + braco('e', 76, 236, 50, 18, '#0284c7', pele)
      + braco('d', 162, 236, 50, 18, '#0284c7', pele)
      + `<path d="M88 226 C108 218 148 218 168 226 L174 302 L82 302 Z" fill="#0284c7"/>`
      + `<rect x="98" y="244" width="30" height="24" rx="4" fill="#0369a1"/>`
      + `<rect x="138" y="244" width="22" height="34" rx="4" fill="#0f172a"/>`
      + `<rect x="88" y="298" width="80" height="10" rx="3" fill="#1e293b"/>`
      + cabeca(u, 'menino.png', 16, 12, 224),
  }),
  analista_dados: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 308, 42, 18, '#1e293b', '#0f172a', 111, 350, 18, 10)
      + perna('d', 134, 308, 42, 18, '#1e293b', '#0f172a', 145, 350, 18, 10)
      + braco('e', 76, 236, 50, 18, '#0f766e', pele)
      + braco('d', 162, 236, 50, 18, '#0f766e', pele)
      + `<path d="M88 226 C108 218 148 218 168 226 L174 300 L82 300 Z" fill="#0f766e"/>`
      + `<rect x="118" y="238" width="20" height="26" rx="3" fill="#00f2fe" stroke="#fff" stroke-width="2"/>`
      + `<rect x="88" y="296" width="80" height="10" rx="3" fill="#0f172a"/>`
      + cabeca(u, 'menino.png', 16, 12, 224),
  }),
  atendente_recepcao: (u) => ({
    caixa: [12, 12, 232, 352],
    svg: perna('e', 104, 314, 38, 16, pele, '#0284c7', 111, 350, 16, 9)
      + perna('d', 134, 314, 38, 16, pele, '#0284c7', 145, 350, 16, 9)
      + braco('e', 78, 236, 48, 16, '#0369a1', pele)
      + braco('d', 162, 236, 48, 16, '#0369a1', pele)
      + `<path d="M90 224 C108 216 148 216 166 224 L180 306 L76 306 Z" fill="#0369a1"/>`
      + `<polygon points="116,224 140,224 128,252" fill="#ffffff"/>`
      + `<circle cx="128" cy="240" r="5" fill="#f59e0b"/>`
      + cabeca(u, 'menina.png', 16, 12, 224),
  }),
  mkt_esteira_pedidos: () => ({
    caixa: [0, 0, 256, 180],
    svg: `<rect x="10" y="70" width="236" height="40" rx="8" fill="#334155" stroke="#64748b" stroke-width="4"/>
      ${Array.from({ length: 12 }, (_, i) => `<line x1="${24 + i * 18}" y1="74" x2="${24 + i * 18}" y2="106" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>`).join('')}
      <rect x="50" y="30" width="60" height="44" rx="4" fill="#d97706"/>
      <rect x="70" y="38" width="22" height="16" rx="2" fill="#ffffff"/>
      <rect x="140" y="24" width="70" height="50" rx="4" fill="#b45309"/>
      <rect x="165" y="32" width="24" height="18" rx="2" fill="#ffffff"/>`,
  }),
  mkt_servidor_rack: () => ({
    caixa: [0, 0, 200, 280],
    svg: `<rect x="20" y="10" width="160" height="260" rx="8" fill="#0f172a" stroke="#00f2fe" stroke-width="4"/>
      ${Array.from({ length: 8 }, (_, i) => `
        <rect x="30" y="${24 + i * 30}" width="140" height="22" rx="3" fill="#1e293b"/>
        <circle cx="44" cy="${35 + i * 30}" r="3.5" fill="#22c55e"/>
        <circle cx="56" cy="${35 + i * 30}" r="3.5" fill="#38bdf8"/>
        <circle cx="68" cy="${35 + i * 30}" r="3.5" fill="#f59e0b"/>
        <line x1="88" y1="${35 + i * 30}" x2="156" y2="${35 + i * 30}" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
      `).join('')}`,
  }),
  mkt_dashboard_holografico: () => ({
    caixa: [0, 0, 260, 200],
    svg: `<rect x="10" y="20" width="240" height="160" rx="14" fill="rgba(2, 6, 23, 0.85)" stroke="#00f2fe" stroke-width="4"/>
      <text x="130" y="52" font-family="ui-monospace, monospace" font-weight="900" font-size="14" fill="#00f2fe" text-anchor="middle">METRICS DASHBOARD</text>
      <rect x="30" y="80" width="30" height="70" rx="3" fill="#00f2fe"/>
      <rect x="74" y="60" width="30" height="90" rx="3" fill="#38bdf8"/>
      <rect x="118" y="95" width="30" height="55" rx="3" fill="#00f2fe"/>
      <rect x="162" y="45" width="30" height="105" rx="3" fill="#4facfe"/>
      <rect x="206" y="70" width="24" height="80" rx="3" fill="#22c55e"/>`,
  }),
  mkt_smartphone_desmontado: () => ({
    caixa: [0, 0, 180, 220],
    svg: `<rect x="30" y="20" width="120" height="180" rx="14" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
      <rect x="42" y="34" width="96" height="152" rx="6" fill="#0284c7"/>
      <!-- bateria interna -->
      <rect x="50" y="50" width="40" height="80" rx="3" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <text x="70" y="94" font-family="system-ui, sans-serif" font-weight="900" font-size="11" fill="#fff" text-anchor="middle">BAT</text>
      <!-- placa-mãe -->
      <rect x="96" y="50" width="34" height="60" rx="3" fill="#15803d"/>
      <circle cx="113" cy="70" r="5" fill="#facc15"/>`,
  }),
  mkt_calendario_horarios: () => ({
    caixa: [0, 0, 220, 200],
    svg: `<rect x="20" y="20" width="180" height="160" rx="12" fill="#ffffff" stroke="#0284c7" stroke-width="4"/>
      <rect x="20" y="20" width="180" height="36" rx="12" fill="#0284c7"/>
      <text x="110" y="44" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">QUALHORA</text>
      <rect x="36" y="70" width="66" height="28" rx="4" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
      <text x="69" y="89" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#15803d" text-anchor="middle">09:00 ✓</text>
      <rect x="118" y="70" width="66" height="28" rx="4" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
      <text x="151" y="89" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#15803d" text-anchor="middle">10:00 ✓</text>
      <rect x="36" y="112" width="66" height="28" rx="4" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
      <text x="69" y="131" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#15803d" text-anchor="middle">14:00 ✓</text>
      <rect x="118" y="112" width="66" height="28" rx="4" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
      <text x="151" y="131" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#15803d" text-anchor="middle">15:00 ✓</text>`,
  }),
};

// quem usa corpo desenhado (o resto é a imagem sozinha)
const COMPOSTO = {
  menina: 'menina', menino: 'menino', vovo: 'vovo', pirata: 'pirata', robo: 'robo', alienigena: 'alien', astronauta: 'astronauta',
  super_heroi: 'heroi', bruxa: 'bruxa', mago: 'mago', leao: 'leao', sapo: 'sapo', unicornio: 'unicornio', bau: 'bau', flor: 'flor', foguete: 'foguete', barco: 'barco',
  zumbi: 'zumbi', mc_zumbi: 'zumbi', mc_zumbi_bebe: 'zumbi',
  esqueleto: 'esqueleto', mc_esqueleto: 'esqueleto', mc_esqueleto_wither: 'esqueleto',
  fantasma: 'fantasma',
  fada: 'fada',
  sereia: 'sereia',
  mc_villager: 'aldeao', aldeao: 'aldeao', campones: 'aldeao',
  pers_guerreiro: 'guerreiro', guerreiro: 'guerreiro', soldado: 'guerreiro',
  apresentador: 'apresentador',
  tecnico_celular: 'tecnico_celular',
  analista_dados: 'analista_dados',
  atendente_recepcao: 'atendente_recepcao',
  mkt_esteira_pedidos: 'mkt_esteira_pedidos',
  mkt_servidor_rack: 'mkt_servidor_rack',
  mkt_dashboard_holografico: 'mkt_dashboard_holografico',
  mkt_smartphone_desmontado: 'mkt_smartphone_desmontado',
  mkt_calendario_horarios: 'mkt_calendario_horarios',
};

// devolve { caixa:[x,y,w,h], svg } de um item do catálogo; u(arquivo) = endereço do asset
export function camadasAparencia(perfil) {
  if (!perfil) return '';
  const roupaId = ['tunica', 'colete', 'capa', 'armadura', 'aventureiro'].includes(perfil.roupa) ? perfil.roupa : 'tunica';
  const acessorioId = ['faixa', 'broche', 'cachecol', 'chapeu', 'oculos', 'mochila'].includes(perfil.acessorio) ? perfil.acessorio : 'broche';
  const corRoupa = CORES_APARENCIA.some((x) => x.cor === perfil.corRoupa) ? perfil.corRoupa : '#2f80ed';
  const corAcessorio = CORES_APARENCIA.some((x) => x.cor === perfil.corAcessorio) ? perfil.corAcessorio : '#f2bd35';
  const roupa = roupaId === 'capa'
    ? `<path d="M82 140 Q128 154 174 140 L196 246 Q128 222 60 246 Z" fill="${corRoupa}" opacity=".92"/>`
    : roupaId === 'armadura'
      ? `<path d="M90 148 Q128 132 166 148 L178 226 L128 248 L78 226 Z" fill="${corRoupa}" stroke="#d7dce5" stroke-width="7"/><path d="M98 164 H158 M93 184 H163 M88 204 H168" stroke="#fff" stroke-opacity=".45" stroke-width="5"/>`
      : `<path d="M91 150 Q128 136 165 150 L176 232 Q128 248 80 232 Z" fill="${corRoupa}"/><path d="M104 154 L128 178 L152 154" fill="none" stroke="${corAcessorio}" stroke-width="8"/>`;
  const acessorio = acessorioId === 'chapeu'
    ? `<path d="M78 71 Q128 47 178 71 L170 92 Q128 78 86 92 Z" fill="${corAcessorio}"/><path d="M68 93 Q128 80 188 93 L184 104 Q128 92 72 104 Z" fill="${corAcessorio}"/>`
    : acessorioId === 'cachecol'
      ? `<path d="M91 142 Q128 157 165 142 L160 160 Q128 176 96 160 Z" fill="${corAcessorio}"/>`
      : acessorioId === 'oculos'
        ? `<g fill="none" stroke="${corAcessorio}" stroke-width="7"><circle cx="105" cy="118" r="16"/><circle cx="151" cy="118" r="16"/><path d="M121 118 H135"/></g>`
        : acessorioId === 'mochila'
          ? `<path d="M43 158 Q54 145 72 152 L82 218 Q56 231 40 214 Z" fill="${corAcessorio}" stroke="#fff" stroke-width="4"/>`
          : acessorioId === 'faixa'
            ? `<path d="M78 102 Q128 88 178 102 L175 112 Q128 100 81 112 Z" fill="${corAcessorio}"/>`
            : `<path d="M112 181 L128 166 L144 181 L128 196 Z" fill="${corAcessorio}" stroke="#fff" stroke-width="3"/>`;
  return `<g class="cn-aparencia" data-roupa="${roupaId}" data-acessorio="${acessorioId}" pointer-events="none">${roupa}${acessorio}</g>`;
}

export function desenhoCubico(item, u, perfil = null) {
  const pele = perfil?.corCorpo || '#d49b6a';
  const roupa = perfil?.corRoupa || '#00a8a8';
  const calca = '#2b3990';
  const sapato = '#4a4a4a';
  const caixa = [12, 12, 232, 352];

  // Identificação de mobs especiais de Minecraft
  const id = item.id || '';
  if (id.includes('creeper')) {
    return {
      caixa,
      svg: `<g class="cn-voxel-creeper">
        <!-- 4 pernas cúbicas -->
        <rect x="88" y="270" width="34" height="80" fill="#4fa83b" stroke="#2e7d32" stroke-width="4"/>
        <rect x="134" y="270" width="34" height="80" fill="#4fa83b" stroke="#2e7d32" stroke-width="4"/>
        <rect x="80" y="325" width="44" height="25" fill="#1b4d1b"/>
        <rect x="132" y="325" width="44" height="25" fill="#1b4d1b"/>
        <!-- corpo retangular -->
        <rect x="94" y="150" width="68" height="124" fill="#57b842" stroke="#2e7d32" stroke-width="4"/>
        <!-- cabeça quadrada -->
        <rect x="82" y="54" width="92" height="92" fill="#57b842" stroke="#2e7d32" stroke-width="4"/>
        <!-- rosto icônico do creeper em pixels -->
        <g fill="#1a3318">
          <rect x="98" y="78" width="18" height="18"/>
          <rect x="140" y="78" width="18" height="18"/>
          <rect x="116" y="96" width="24" height="26"/>
          <rect x="108" y="112" width="40" height="24"/>
          <rect x="108" y="130" width="12" height="16"/>
          <rect x="136" y="130" width="12" height="16"/>
        </g>
      </g>`,
    };
  }

  if (id.includes('zumbi') || id.includes('zombie')) {
    return {
      caixa,
      svg: `<g class="cn-voxel-zumbi">
        <rect x="96" y="270" width="28" height="80" fill="#3f51b5" stroke="#1a237e" stroke-width="3"/>
        <rect x="132" y="270" width="28" height="80" fill="#3f51b5" stroke="#1a237e" stroke-width="3"/>
        <rect x="94" y="336" width="32" height="14" fill="#333"/>
        <rect x="130" y="336" width="32" height="14" fill="#333"/>
        <rect x="88" y="154" width="80" height="116" fill="#009688" stroke="#004d40" stroke-width="4"/>
        <!-- braços esticados para frente -->
        <rect x="60" y="156" width="28" height="96" fill="#009688"/>
        <rect x="60" y="228" width="28" height="24" fill="#4caf50"/>
        <rect x="168" y="156" width="28" height="96" fill="#009688"/>
        <rect x="168" y="228" width="28" height="24" fill="#4caf50"/>
        <!-- cabeça quadrada verde -->
        <rect x="84" y="62" width="88" height="88" fill="#4caf50" stroke="#2e7d32" stroke-width="4"/>
        <rect x="84" y="62" width="88" height="24" fill="#1b5e20"/>
        <!-- olhos zumbi -->
        <rect x="98" y="96" width="16" height="14" fill="#1b5e20"/>
        <rect x="142" y="96" width="16" height="14" fill="#1b5e20"/>
      </g>`,
    };
  }

  if (id.includes('esqueleto') || id.includes('skeleton')) {
    return {
      caixa,
      svg: `<g class="cn-voxel-esqueleto">
        <rect x="104" y="270" width="16" height="80" fill="#dcdcdc" stroke="#9e9e9e" stroke-width="2"/>
        <rect x="136" y="270" width="16" height="80" fill="#dcdcdc" stroke="#9e9e9e" stroke-width="2"/>
        <rect x="98" y="154" width="60" height="116" fill="#e0e0e0" stroke="#9e9e9e" stroke-width="3"/>
        <!-- costelas -->
        <rect x="104" y="180" width="48" height="8" fill="#757575"/>
        <rect x="104" y="204" width="48" height="8" fill="#757575"/>
        <rect x="104" y="228" width="48" height="8" fill="#757575"/>
        <!-- braços -->
        <rect x="76" y="156" width="18" height="96" fill="#dcdcdc"/>
        <rect x="162" y="156" width="18" height="96" fill="#dcdcdc"/>
        <!-- crânio quadrado -->
        <rect x="84" y="62" width="88" height="88" fill="#ededed" stroke="#9e9e9e" stroke-width="4"/>
        <!-- olhos vazados -->
        <rect x="98" y="94" width="18" height="18" fill="#212121"/>
        <rect x="140" y="94" width="18" height="18" fill="#212121"/>
        <rect x="120" y="122" width="16" height="12" fill="#212121"/>
      </g>`,
    };
  }

  // Humanoide padrão (Steve, Alex ou personagem transformado em bloco)
  return {
    caixa,
    svg: `<g class="cn-voxel-steve">
      <!-- pernas retangulares cúbicas -->
      <g class="perna perna-e">
        <rect x="96" y="270" width="28" height="80" fill="${calca}" stroke="#1a237e" stroke-width="3"/>
        <rect x="94" y="336" width="32" height="14" fill="${sapato}"/>
      </g>
      <g class="perna perna-d">
        <rect x="132" y="270" width="28" height="80" fill="${calca}" stroke="#1a237e" stroke-width="3"/>
        <rect x="130" y="336" width="32" height="14" fill="${sapato}"/>
      </g>
      <!-- braços articulados em blocos -->
      <g class="braco braco-e">
        <rect x="62" y="154" width="26" height="50" fill="${roupa}"/>
        <rect x="62" y="204" width="26" height="66" fill="${pele}" stroke="#8d5b34" stroke-width="2"/>
      </g>
      <g class="braco braco-d">
        <rect x="168" y="154" width="26" height="50" fill="${roupa}"/>
        <rect x="168" y="204" width="26" height="66" fill="${pele}" stroke="#8d5b34" stroke-width="2"/>
      </g>
      <!-- tronco cúbico -->
      <rect x="88" y="154" width="80" height="116" fill="${roupa}" stroke="#00695c" stroke-width="3"/>
      <!-- cabeça quadrada de bloco (88x88) -->
      <rect x="84" y="62" width="88" height="88" fill="${pele}" stroke="#8d5b34" stroke-width="4"/>
      <!-- cabelo de bloco no topo -->
      <rect x="84" y="62" width="88" height="24" fill="#4a2e18"/>
      <rect x="84" y="86" width="14" height="20" fill="#4a2e18"/>
      <rect x="158" y="86" width="14" height="20" fill="#4a2e18"/>
      <!-- olhos retos de pixel (branco + azul/íris) -->
      <rect x="98" y="100" width="18" height="10" fill="#ffffff"/>
      <rect x="108" y="100" width="8" height="10" fill="#2b3990"/>
      <rect x="140" y="100" width="18" height="10" fill="#ffffff"/>
      <rect x="140" y="100" width="8" height="10" fill="#2b3990"/>
      <!-- nariz e boca retos -->
      <rect x="120" y="112" width="16" height="8" fill="#bc7a4c"/>
      <rect x="114" y="126" width="28" height="8" fill="#6a351d"/>
    </g>` + socketsDe(item),
  };
}

export function desenho(item, u, perfil = null, { voxel = false } = {}) {
  if (voxel) {
    return desenhoCubico(item, u, perfil);
  }
  const c = COMPOSTO[item.id];
  const desenhoBase = c
    ? CORPOS[c](u)
    : { caixa: CAIXA[item.id] || [16, 16, 224, 224], svg: `<image href="${u(item.img)}" x="0" y="0" width="256" height="256"/>` };
  const face = item.tipo === 'personagem' ? faceOverlay() : '';
  return { ...desenhoBase, svg: desenhoBase.svg + camadasAparencia(perfil) + face + socketsDe(item) };
}
const CORES_APARENCIA = [
  { id: 'azul', cor: '#2f80ed' }, { id: 'vermelho', cor: '#e94b4b' }, { id: 'verde', cor: '#39a96b' },
  { id: 'roxo', cor: '#8b5cf6' }, { id: 'amarelo', cor: '#f2bd35' }, { id: 'rosa', cor: '#e45a9a' },
  { id: 'laranja', cor: '#ed8736' }, { id: 'turquesa', cor: '#26a69a' },
];
const TEXTO_APARENCIA = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hashAparencia = (id) => [...String(id)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);

// Perfil determinístico; qualificadores citados no trecho substituem só os campos correspondentes.
export function resolverAparencia(item, texto = '', anterior = null) {
  if (!item || item.tipo !== 'personagem') return null;
  const hash = hashAparencia(item.id);
  const base = anterior || {
    corCorpo: ['#f2bf8f', '#9b5a3c', '#e6b98a', '#6b8e5a'][hash % 4],
    corRoupa: CORES_APARENCIA[hash % CORES_APARENCIA.length].cor,
    corAcessorio: CORES_APARENCIA[(hash + 3) % CORES_APARENCIA.length].cor,
    escala: [0.88, 0.96, 1.04, 1.12][hash % 4],
    roupa: ['tunica', 'colete', 'capa', 'aventureiro'][hash % 4],
    acessorio: ['faixa', 'broche', 'cachecol', 'chapeu'][hash % 4],
  };
  const t = TEXTO_APARENCIA(texto);
  const corpoExplicit = /\b(pele|corpo|rosto)\b/.test(t);
  const cor = CORES_APARENCIA.find(({ id }) => {
    const base = id.endsWith('o') ? id.slice(0, -1) : id;
    return new RegExp(`\\b(?:${id}|${base}a)s?\\b`).test(t);
  });
  if (cor && corpoExplicit) base.corCorpo = cor.cor;
  else if (cor) base.corRoupa = cor.cor;
  if (/\b(pequeno|baixinho|miudo|baixa)\b/.test(t)) base.escala = 0.82;
  if (/\b(grande|gigante|enorme|alto|alta)\b/.test(t)) base.escala = 1.18;
  const roupa = [
    [/\b(capa|manto)\b/, 'capa'], [/\b(armadura|armado|armada)\b/, 'armadura'],
    [/\b(colete)\b/, 'colete'], [/\b(tunica|vestido|camisa)\b/, 'tunica'],
  ].find(([regex]) => regex.test(t));
  if (roupa) base.roupa = roupa[1];
  const acessorio = [
    [/\b(chapeu|capacete|coroa)\b/, 'chapeu'], [/\b(cachecol|lenco)\b/, 'cachecol'],
    [/\b(oculos)\b/, 'oculos'], [/\b(mochila)\b/, 'mochila'],
  ].find(([regex]) => regex.test(t));
  if (acessorio) base.acessorio = acessorio[1];
  return base;
}

// onde fica a cabeça de cada um (para pôr os efeitos: zzz, lágrimas, notas…): [x, y] em fração da caixa
export function cabecaDe(item) {
  const c = COMPOSTO[item.id];
  if (['menina', 'menino', 'vovo', 'robo', 'alien', 'astronauta', 'heroi', 'bruxa', 'mago'].includes(c)) return { x: 0.5, y: 0.18, olhos: 0.36 };
  if (c === 'pirata') return { x: 0.5, y: 0.3, olhos: 0.42 };
  if (c === 'leao') return { x: 0.5, y: 0.2, olhos: 0.38 };
  if (c === 'unicornio') return { x: 0.2, y: 0.16, olhos: 0.3 };
  if (item.id === 'dragao') return { x: 0.32, y: 0.12, olhos: 0.2, boca: [0.12, 0.22] };
  if (item.id === 'dinossauro') return { x: 0.3, y: 0.1, olhos: 0.2, boca: [0.12, 0.24] };
  if (['cachorro', 'gato', 'macaco'].includes(item.id)) return { x: 0.22, y: 0.12, olhos: 0.26 };
  return { x: 0.5, y: 0.16, olhos: 0.38 };
}

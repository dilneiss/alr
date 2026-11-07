/* Cenas SVG das 3 salas. Cada objeto interativo é um <g class="obj" data-obj="…">.
   Partes condicionais usam data-if="flag" / data-unless="flag" (flags do servidor; "a&b" = ambas).
   Rostos do Bip usam data-face="…". Textos dinâmicos usam data-text="…". */
(function () {
  'use strict';
  const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
  const MARKER = "'Marker Felt','Chalkboard SE','Comic Sans MS','Segoe Print',cursive";
  const range = (a, b, s) => { const o = []; for (let x = a; x <= b; x += s) o.push(x); return o; };

  const DEFS = `
  <defs>
    <linearGradient id="wallA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2440"/><stop offset="1" stop-color="#141a2d"/></linearGradient>
    <linearGradient id="wallB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10222b"/><stop offset="1" stop-color="#0b161d"/></linearGradient>
    <linearGradient id="floorA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121622"/><stop offset="1" stop-color="#090b12"/></linearGradient>
    <linearGradient id="floorB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1519"/><stop offset="1" stop-color="#070b0e"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b7485"/><stop offset=".5" stop-color="#434b5a"/><stop offset="1" stop-color="#2a303b"/></linearGradient>
    <linearGradient id="metalDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#323947"/><stop offset="1" stop-color="#171b24"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5a41"/><stop offset="1" stop-color="#553d2b"/></linearGradient>
    <linearGradient id="woodDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d3828"/><stop offset="1" stop-color="#34251b"/></linearGradient>
    <linearGradient id="robot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#c7d0dc"/></linearGradient>
    <radialGradient id="lampGlow" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fcd34d" stop-opacity=".5"/><stop offset=".55" stop-color="#fbbf24" stop-opacity=".1"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
    <radialGradient id="ceilA" cx=".5" cy="0" r=".75"><stop offset="0" stop-color="#a78bfa" stop-opacity=".2"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient>
    <radialGradient id="ceilB" cx=".5" cy="0" r=".75"><stop offset="0" stop-color="#22d3ee" stop-opacity=".2"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <linearGradient id="doorLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#67e8f9" stop-opacity=".75"/><stop offset="1" stop-color="#0e7490" stop-opacity=".2"/></linearGradient>
    <linearGradient id="exitLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#86efac" stop-opacity=".8"/><stop offset="1" stop-color="#15803d" stop-opacity=".2"/></linearGradient>
    <radialGradient id="sun" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#fffbeb"/><stop offset=".55" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
    <linearGradient id="sideL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c1413"/><stop offset="1" stop-color="#15201e"/></linearGradient>
    <linearGradient id="sideR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#0c1413"/><stop offset="1" stop-color="#15201e"/></linearGradient>
    <linearGradient id="screenG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#052015"/><stop offset="1" stop-color="#020b07"/></linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="bigGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
    <pattern id="hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#facc15"/><rect x="7" width="7" height="14" fill="#1f2937"/></pattern>
  </defs>`;

  // ------------------------------------------------------------------ Sala 1 — Escritório
  function clockHand(cx, cy, len, deg) { const r = deg * Math.PI / 180; return `${(cx + len * Math.sin(r)).toFixed(1)},${(cy - len * Math.cos(r)).toFixed(1)}`; }
  function escritorio() {
    const ticks = range(0, 330, 30).map((d) => { const r = d * Math.PI / 180, a = d % 90 === 0 ? 29 : 32; return `<line x1="${(656 + a * Math.sin(r)).toFixed(1)}" y1="${(104 - a * Math.cos(r)).toFixed(1)}" x2="${(656 + 37 * Math.sin(r)).toFixed(1)}" y2="${(104 - 37 * Math.cos(r)).toFixed(1)}" stroke="#334155" stroke-width="${d % 90 === 0 ? 3 : 1.6}"/>`; }).join('');
    const keys = (x0, y0, w, h, g, fill) => { let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += `<rect x="${x0 + c * (w + g)}" y="${y0 + r * (h + g)}" width="${w}" height="${h}" rx="1.5" fill="${fill}"/>`; return s; };
    return `
    <rect width="960" height="286" fill="url(#wallA)"/>
    <rect width="960" height="240" fill="url(#ceilA)"/>
    <g opacity=".05" stroke="#fff">${range(24, 960, 48).map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="276"/>`).join('')}</g>
    <rect y="274" width="960" height="12" fill="#262e48"/>
    <rect y="286" width="960" height="64" fill="url(#floorA)"/>
    <g stroke="rgba(255,255,255,.05)">${range(-480, 1440, 120).map((x) => `<line x1="${(480 + (x - 480) * 0.3).toFixed(0)}" y1="286" x2="${x}" y2="350"/>`).join('')}<line x1="0" y1="310" x2="960" y2="310"/></g>
    <ellipse cx="510" cy="328" rx="260" ry="16" fill="rgba(167,139,250,.09)"/>

    <g class="obj" data-obj="porta_lab"><title>Porta de metal (leva ao laboratório)</title>
      <rect x="24" y="40" width="144" height="246" rx="4" fill="#0a0d15"/>
      <g data-unless="portaLabAberta">
        <rect x="32" y="48" width="128" height="238" rx="3" fill="url(#metal)"/>
        <rect x="58" y="68" width="76" height="46" rx="5" fill="#06121a" stroke="#1d2430" stroke-width="3"/>
        <rect x="61" y="71" width="70" height="40" rx="3" fill="url(#doorLight)" opacity=".75"/>
        <rect x="46" y="132" width="100" height="58" rx="3" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2"/>
        <rect x="46" y="202" width="100" height="70" rx="3" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2"/>
        <text x="96" y="168" text-anchor="middle" font-family="${MONO}" font-weight="800" font-size="17" fill="rgba(255,255,255,.3)" letter-spacing="4">LAB</text>
        <rect x="142" y="164" width="7" height="32" rx="3" fill="#b8c0cc"/>
      </g>
      <g data-if="portaLabAberta">
        <rect x="32" y="48" width="128" height="238" fill="#04151b"/>
        <rect x="32" y="48" width="128" height="238" fill="url(#doorLight)"/>
        <rect x="32" y="48" width="12" height="238" fill="url(#metal)"/>
        <polygon points="32,286 160,286 200,350 0,350" fill="rgba(103,232,249,.13)"/>
      </g>
      <rect x="174" y="144" width="22" height="44" rx="4" fill="#0e131c" stroke="#3a4352"/>
      <rect x="178" y="172" width="14" height="3" rx="1" fill="#000"/>
      <circle cx="185" cy="156" r="4.5" fill="#ef4444" filter="url(#glow)" class="blink" data-unless="portaLabAberta"/>
      <circle cx="185" cy="156" r="4.5" fill="#22c55e" filter="url(#glow)" data-if="portaLabAberta"/>
    </g>

    <g class="obj" data-obj="quadro"><title>Quadro branco</title>
      <rect x="214" y="36" width="256" height="162" rx="6" fill="#98a4b6" filter="url(#shadow)"/>
      <rect x="221" y="43" width="242" height="148" rx="3" fill="#eaeff6"/>
      <rect x="224" y="46" width="236" height="18" fill="#fff" opacity=".45"/>
      <text x="236" y="80" font-family="${MARKER}" font-size="19" fill="#1d4ed8">E = mc²</text>
      <text x="236" y="109" font-family="${MARKER}" font-size="17" fill="#111827">π ≈ 3,14159…</text>
      <g stroke="#6b7280" stroke-width="2" fill="none" transform="translate(378,56)"><path d="M14 0 C22 8 24 22 20 34 L8 34 C4 22 6 8 14 0 Z"/><path d="M8 28 L2 38 L8 36 M20 28 L26 38 L20 36"/><circle cx="14" cy="14" r="4"/></g>
      <g stroke="#6b7280" stroke-width="2" fill="none" transform="translate(414,112)"><circle cx="14" cy="16" r="12"/><path d="M4 9 L4 -2 L11 5 M24 9 L24 -2 L17 5"/><path d="M9 16 h.1 M19 16 h.1" stroke-width="3" stroke-linecap="round"/></g>
      <text x="236" y="153" font-family="${MARKER}" font-size="20" font-weight="700" fill="#dc2626">COFRE =</text>
      <g transform="translate(330,138)" stroke="#dc2626" stroke-width="2.2" fill="none"><circle cx="9" cy="9" r="9"/><path d="M9 9 L9 3 M9 9 L14 10"/></g>
      <text x="352" y="153" font-family="${MARKER}" font-size="15" fill="#dc2626">parado!</text>
      <path d="M236 163 q 20 6 40 0 t 40 0 t 40 0" stroke="#dc2626" stroke-width="2" fill="none"/>
      <rect x="230" y="192" width="224" height="6" rx="2" fill="#6b7686"/>
      <rect x="252" y="187" width="20" height="5" rx="2" fill="#dc2626"/><rect x="278" y="187" width="20" height="5" rx="2" fill="#1d4ed8"/>
    </g>

    <g class="obj" data-obj="retrato"><title>Retrato do gato</title>
      <rect x="490" y="50" width="92" height="108" rx="4" fill="#b7791f" filter="url(#shadow)"/>
      <rect x="497" y="57" width="78" height="82" rx="2" fill="#1b2a3a"/>
      <g transform="translate(536,102)">
        <ellipse cx="0" cy="30" rx="27" ry="11" fill="#ea8c13"/>
        <polygon points="-20,-10 -15,-30 -4,-15" fill="#f59e0b"/><polygon points="20,-10 15,-30 4,-15" fill="#f59e0b"/>
        <polygon points="-17,-13 -14,-24 -8,-15" fill="#fcd9a4"/><polygon points="17,-13 14,-24 8,-15" fill="#fcd9a4"/>
        <ellipse cx="0" cy="0" rx="22" ry="19" fill="#f59e0b"/>
        <path d="M-12 -1 q4 -3 8 0 M4 -1 q4 -3 8 0" stroke="#3b1d04" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M-3 7 l3 3 l3 -3" stroke="#3b1d04" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M-9 -14 l3 5 M0 -16 l0 5 M9 -14 l-3 5" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
        <path d="M-22 5 h-10 M-22 9 h-9 M22 5 h10 M22 9 h9" stroke="#fde68a" stroke-width="1"/>
      </g>
      <rect x="510" y="143" width="52" height="11" rx="2" fill="#fcd34d"/>
      <text x="536" y="151.5" text-anchor="middle" font-size="7.5" font-weight="800" fill="#78350f" font-family="Georgia,serif" letter-spacing="1">PIPOCA</text>
    </g>

    <g class="obj" data-obj="relogio"><title>Relógio parado</title>
      <circle cx="656" cy="104" r="47" fill="#0c1018" filter="url(#shadow)"/>
      <circle cx="656" cy="104" r="42" fill="#f3f5f9" stroke="#8b95a7" stroke-width="5"/>
      ${ticks}
      <text x="656" y="84" text-anchor="middle" font-size="10" font-weight="800" fill="#334155">12</text>
      <text x="681" y="108" text-anchor="middle" font-size="10" font-weight="800" fill="#334155">3</text>
      <line x1="656" y1="104" x2="${clockHand(656, 104, 22, 97).split(',')[0]}" y2="${clockHand(656, 104, 22, 97).split(',')[1]}" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="656" y1="104" x2="${clockHand(656, 104, 33, 84).split(',')[0]}" y2="${clockHand(656, 104, 33, 84).split(',')[1]}" stroke="#111827" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="656" cy="104" r="3.6" fill="#dc2626"/>
      <path d="M626 78 l10 10 l-4 6 l9 8" stroke="rgba(15,23,42,.35)" stroke-width="1.3" fill="none"/>
    </g>

    <g class="obj" data-obj="cofre"><title>Cofre</title>
      <rect x="722" y="58" width="184" height="188" rx="10" fill="#0b0f17" filter="url(#shadow)"/>
      <rect x="728" y="64" width="172" height="176" rx="8" fill="url(#metalDark)"/>
      <g data-unless="cofreAberto">
        <rect x="740" y="76" width="148" height="152" rx="6" fill="url(#metal)" stroke="#1b2029" stroke-width="2"/>
        <circle cx="751" cy="87" r="3" fill="#a8b0bd"/><circle cx="877" cy="87" r="3" fill="#a8b0bd"/><circle cx="751" cy="217" r="3" fill="#a8b0bd"/><circle cx="877" cy="217" r="3" fill="#a8b0bd"/>
        <circle cx="792" cy="152" r="27" fill="#2b313d" stroke="#b8c0cc" stroke-width="4"/>
        <g stroke="#b8c0cc" stroke-width="4" stroke-linecap="round"><line x1="792" y1="130" x2="792" y2="174"/><line x1="773" y1="141" x2="811" y2="163"/><line x1="773" y1="163" x2="811" y2="141"/></g>
        <circle cx="792" cy="152" r="7" fill="#d1d5db"/>
        <rect x="836" y="100" width="42" height="78" rx="5" fill="#0d1220" stroke="#3b4454"/>
        <rect x="841" y="105" width="32" height="12" rx="2" fill="#03140b"/>
        <text x="857" y="114.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="#4ade80" font-family="${MONO}" data-text="codigoCofre">_ _ _</text>
        ${keys(843, 122, 7, 8, 3.5, '#4b5566')}
        <rect x="850" y="192" width="22" height="7" rx="3" fill="#b8c0cc"/>
      </g>
      <g data-if="cofreAberto">
        <rect x="740" y="76" width="148" height="152" rx="6" fill="#04060b"/>
        <rect x="740" y="76" width="148" height="14" fill="#000" opacity=".55"/>
        <rect x="752" y="176" width="124" height="4" fill="#1a1f2b"/>
        <g data-if="cartaoNoCofre" class="float">
          <rect x="782" y="128" width="64" height="42" rx="5" fill="#0e7490" filter="url(#glow)"/>
          <rect x="788" y="134" width="16" height="19" rx="2" fill="#a5f3fc"/>
          <rect x="809" y="136" width="31" height="4" rx="2" fill="#cffafe"/><rect x="809" y="144" width="22" height="3" rx="1.5" fill="#67e8f9"/>
          <rect x="788" y="160" width="52" height="4" rx="2" fill="#155e75"/>
        </g>
        <polygon points="740,76 702,92 702,214 740,228" fill="url(#metal)" stroke="#1b2029"/>
        <circle cx="716" cy="152" r="9" fill="#2b313d" stroke="#b8c0cc" stroke-width="2.5"/>
      </g>
    </g>

    <g class="obj" data-obj="mesa"><title>Mesa</title>
      <path d="M344 214 L284 250 L420 250 Z" fill="url(#lampGlow)"/>
      <ellipse cx="330" cy="237" rx="17" ry="5" fill="#1f2937"/>
      <path d="M330 235 L322 222 L338 208" stroke="#4b5563" stroke-width="5" fill="none" stroke-linecap="round"/>
      <polygon points="324,206 352,196 362,211 336,222" fill="#f59e0b"/>
      <circle cx="346" cy="216" r="4.5" fill="#fff7d6" filter="url(#glow)"/>
      <g transform="rotate(-4 424 230)"><rect x="396" y="224" width="58" height="12" rx="1" fill="#e5e7eb"/></g>
      <g transform="rotate(3 432 226)"><rect x="404" y="220" width="54" height="10" rx="1" fill="#f8fafc"/><line x1="410" y1="224" x2="450" y2="224" stroke="#94a3b8"/></g>
      <rect x="296" y="236" width="428" height="16" rx="4" fill="url(#wood)"/>
      <rect x="296" y="236" width="428" height="3" rx="1.5" fill="#9a7757"/>
      <rect x="306" y="252" width="408" height="36" fill="url(#woodDark)"/>
      <rect x="310" y="252" width="16" height="84" fill="#2b1f16"/><rect x="694" y="252" width="16" height="84" fill="#2b1f16"/>
    </g>
    <g class="obj" data-obj="gaveta"><title>Gaveta</title>
      <g data-unless="gavetaAberta">
        <rect x="446" y="257" width="128" height="26" rx="3" fill="#62483a" stroke="#2a1d14" stroke-width="2"/>
        <rect x="494" y="267" width="32" height="6" rx="3" fill="#d6b47a"/>
      </g>
      <g data-if="gavetaAberta">
        <polygon points="446,257 574,257 588,280 432,280" fill="#170f0a"/>
        <path d="M462 268 h12 M468 272 h10" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
        <rect x="548" y="264" width="11" height="7" rx="2" fill="#f472b6"/>
        <g data-if="chavinhaNaGaveta">
          <g transform="translate(494,262) rotate(-10)" filter="url(#glow)"><circle cx="6" cy="6" r="5" fill="none" stroke="#fbbf24" stroke-width="3"/><rect x="10" y="4.5" width="20" height="3" fill="#fbbf24"/><rect x="24" y="7" width="3" height="4" fill="#fbbf24"/><rect x="28" y="7" width="2.5" height="3" fill="#fbbf24"/></g>
          <path class="twinkle" d="M534 254 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fffbeb"/>
        </g>
        <rect x="432" y="280" width="156" height="28" rx="3" fill="#62483a" stroke="#2a1d14" stroke-width="2"/>
        <rect x="494" y="290" width="32" height="6" rx="3" fill="#d6b47a"/>
      </g>
    </g>
    <g class="obj" data-obj="caneca"><title>Caneca</title>
      <path class="steam" d="M658 204 q-4 -8 0 -14 q4 -6 0 -12" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>
      <path class="steam s2" d="M668 204 q-4 -8 0 -14 q4 -6 0 -12" stroke="rgba(255,255,255,.3)" stroke-width="2" fill="none"/>
      <rect x="652" y="208" width="26" height="29" rx="4" fill="#f8fafc"/>
      <path d="M678 214 q11 0 11 8 q0 8 -11 8" stroke="#f8fafc" stroke-width="4" fill="none"/>
      <text x="665" y="227" text-anchor="middle" font-size="9" font-weight="900" fill="#7c3aed" font-family="${MONO}">#1</text>
    </g>`;
  }

  // ------------------------------------------------------------------ Sala 2 — Laboratório
  function livros(x0, yBase, cores, maxW) {
    let x = x0, s = '', i = 0;
    while (x < x0 + maxW) {
      const w = 9 + ((i * 7) % 8), h = 38 + ((i * 13) % 14), c = cores[i % cores.length];
      if (x + w > x0 + maxW) break;
      s += `<rect x="${x}" y="${yBase - h}" width="${w}" height="${h}" rx="1.5" fill="${c}"/><rect x="${x + 2}" y="${yBase - h + 6}" width="${w - 4}" height="2" fill="rgba(255,255,255,.35)"/>`;
      x += w + 2; i++;
    }
    return s;
  }
  function laboratorio() {
    const C = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#64748b', '#ec4899', '#14b8a6'];
    return `
    <rect width="960" height="286" fill="url(#wallB)"/>
    <rect width="960" height="240" fill="url(#ceilB)"/>
    <rect x="300" y="0" width="360" height="5" fill="#67e8f9" opacity=".6" filter="url(#glow)"/>
    <g opacity=".06" stroke="#fff">${range(40, 960, 80).map((x) => `<line x1="${x}" y1="30" x2="${x}" y2="276"/>`).join('')}</g>
    <rect y="18" width="960" height="10" fill="#18252f"/>${range(60, 960, 180).map((x) => `<rect x="${x}" y="15" width="14" height="16" rx="2" fill="#23323e"/>`).join('')}
    <rect y="274" width="960" height="12" fill="#1a2a33"/>
    <rect y="286" width="960" height="64" fill="url(#floorB)"/>
    <g stroke="rgba(103,232,249,.06)">${range(-480, 1440, 96).map((x) => `<line x1="${(480 + (x - 480) * 0.3).toFixed(0)}" y1="286" x2="${x}" y2="350"/>`).join('')}<line x1="0" y1="304" x2="960" y2="304"/><line x1="0" y1="326" x2="960" y2="326"/></g>

    <g class="obj" data-obj="estante"><title>Estante de livros</title>
      <rect x="30" y="36" width="212" height="250" rx="4" fill="#3b2a1e" filter="url(#shadow)"/>
      <rect x="40" y="46" width="192" height="232" fill="#1d150f"/>
      ${livros(46, 104, C, 180)}
      <rect x="40" y="104" width="192" height="7" fill="#4d392a"/>
      ${livros(46, 164, C.slice(3), 100)}
      <rect x="40" y="164" width="192" height="7" fill="#4d392a"/>
      ${livros(46, 224, C.slice(1), 130)}
      <g transform="translate(200,196)"><circle r="16" fill="#1e3a8a"/><path d="M-16 0 h32 M0 -16 v32 M-11 -11 q11 8 22 0 M-11 11 q11 -8 22 0" stroke="#60a5fa" stroke-width="1.5" fill="none"/><rect x="-2" y="16" width="4" height="10" fill="#6b7280"/></g>
      <rect x="40" y="224" width="192" height="7" fill="#4d392a"/>
      ${livros(46, 278, C.slice(2), 186)}
    </g>
    <g class="obj" data-obj="caixinha"><title>Caixinha de metal</title>
      <g data-unless="caixinhaAberta">
        <rect x="160" y="134" width="56" height="30" rx="4" fill="url(#metal)" stroke="#12161d" stroke-width="2"/>
        <rect x="160" y="134" width="56" height="9" rx="3" fill="#7a8494"/>
        <circle cx="188" cy="151" r="3.4" fill="#fbbf24" filter="url(#glow)"/><rect x="187" y="151" width="2" height="7" fill="#fbbf24"/>
      </g>
      <g data-if="caixinhaAberta">
        <polygon points="160,140 216,140 208,116 168,116" fill="#7a8494" stroke="#12161d" stroke-width="1.5"/>
        <rect x="160" y="140" width="56" height="24" rx="4" fill="url(#metal)" stroke="#12161d" stroke-width="2"/>
        <rect x="164" y="140" width="48" height="6" fill="#7f1d1d"/>
        <g data-if="chipNaCaixinha" class="float"><rect x="176" y="126" width="24" height="15" rx="2" fill="#16a34a" filter="url(#glow)"/><g fill="#fbbf24">${range(0, 4, 1).map((i) => `<rect x="${178 + i * 5}" y="141" width="2" height="4"/>`).join('')}</g><rect x="181" y="130" width="14" height="7" rx="1" fill="#052e16"/></g>
        <g transform="translate(186,150)"><rect x="0" y="0" width="12" height="3" fill="#fbbf24"/><circle cx="15" cy="1.5" r="3.5" fill="none" stroke="#fbbf24" stroke-width="2"/></g>
      </g>
    </g>

    <g class="obj" data-obj="frascos"><title>Frascos borbulhantes</title>
      <rect x="258" y="236" width="184" height="10" rx="2" fill="#2b3644"/>
      <rect x="266" y="246" width="8" height="42" fill="#1e2833"/><rect x="426" y="246" width="8" height="42" fill="#1e2833"/>
      <ellipse cx="292" cy="232" rx="22" ry="5" fill="#34d399" opacity=".25" filter="url(#bigGlow)"/>
      <path d="M284 190 h16 v16 l16 28 h-48 l16 -28 z" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
      <path d="M276 220 h32 l8 14 h-48 z" fill="#34d399" opacity=".9"/>
      <rect x="283" y="208" width="18" height="7" rx="1" fill="#f8fafc" opacity=".9"/>
      <circle class="bub" cx="288" cy="226" r="2.2" fill="#a7f3d0"/><circle class="bub b2" cx="296" cy="228" r="1.6" fill="#a7f3d0"/><circle class="bub b3" cx="292" cy="224" r="2" fill="#a7f3d0"/>
      <ellipse cx="350" cy="232" rx="20" ry="5" fill="#a78bfa" opacity=".3" filter="url(#bigGlow)"/>
      <rect x="344" y="176" width="12" height="26" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
      <circle cx="350" cy="216" r="19" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
      <path d="M332 218 a18 18 0 0 0 36 0 z" fill="#a78bfa" opacity=".9"/>
      <circle class="bub b2" cx="346" cy="222" r="2" fill="#ddd6fe"/><circle class="bub" cx="354" cy="226" r="1.6" fill="#ddd6fe"/>
      <ellipse cx="404" cy="233" rx="14" ry="4" fill="#f472b6" opacity=".3" filter="url(#bigGlow)"/>
      <rect x="396" y="178" width="16" height="56" rx="7" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
      <rect x="398" y="204" width="12" height="28" rx="5" fill="#f472b6" opacity=".9"/>
      <circle class="bub b3" cx="404" cy="222" r="1.8" fill="#fbcfe8"/><circle class="bub" cx="402" cy="214" r="1.4" fill="#fbcfe8"/>
    </g>

    <g class="obj" data-obj="bip"><title>Bip, o robô assistente</title>
      <ellipse cx="540" cy="320" rx="58" ry="9" fill="rgba(0,0,0,.45)"/>
      <g class="bip-body">
        <circle cx="512" cy="304" r="13" fill="#111827" stroke="#4b5563" stroke-width="3"/><circle cx="568" cy="304" r="13" fill="#111827" stroke="#4b5563" stroke-width="3"/>
        <rect x="480" y="230" width="14" height="46" rx="7" fill="#cfd8e3" class="arm-l"/>
        <rect x="586" y="230" width="14" height="46" rx="7" fill="#cfd8e3" class="arm-r"/>
        <rect x="496" y="220" width="88" height="80" rx="20" fill="url(#robot)"/>
        <rect x="524" y="244" width="32" height="22" rx="5" fill="#0b1220" stroke="#94a3b8"/>
        <g data-if="chipInstalado"><rect x="528" y="248" width="24" height="14" rx="2" fill="#22d3ee" filter="url(#glow)" class="pulse"/></g>
        <rect x="530" y="210" width="20" height="12" fill="#94a3b8"/>
        <line x1="540" y1="138" x2="540" y2="116" stroke="#94a3b8" stroke-width="3"/>
        <circle cx="540" cy="112" r="6" fill="#f472b6" filter="url(#glow)" class="blink"/>
        <rect x="474" y="160" width="10" height="30" rx="4" fill="#94a3b8"/><rect x="596" y="160" width="10" height="30" rx="4" fill="#94a3b8"/>
        <rect x="482" y="136" width="116" height="78" rx="24" fill="url(#robot)"/>
        <rect x="494" y="148" width="92" height="54" rx="14" fill="#0b1220"/>
        <g data-face="confuso"><text x="519" y="187" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle" font-family="${MONO}" filter="url(#glow)">?</text><text x="561" y="187" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle" font-family="${MONO}" filter="url(#glow)">?</text></g>
        <g data-face="neutro" class="eyes"><rect x="514" y="164" width="12" height="20" rx="5" fill="#22d3ee" filter="url(#glow)"/><rect x="554" y="164" width="12" height="20" rx="5" fill="#22d3ee" filter="url(#glow)"/></g>
        <g data-face="feliz" filter="url(#glow)"><path d="M509 182 q10 -15 20 0" stroke="#22d3ee" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M551 182 q10 -15 20 0" stroke="#22d3ee" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M530 190 q10 7 20 0" stroke="#22d3ee" stroke-width="3" fill="none" stroke-linecap="round"/></g>
        <g data-face="rindo" filter="url(#glow)"><path d="M509 176 q10 -13 20 0" stroke="#22d3ee" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M551 176 q10 -13 20 0" stroke="#22d3ee" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M524 184 h32 q-2 14 -16 14 q-14 0 -16 -14 z" fill="#22d3ee"/></g>
        <g data-face="amor" filter="url(#glow)"><path d="M520 170 c-6 -8 -17 0 -9 8 l9 9 l9 -9 c8 -8 -3 -16 -9 -8 z" fill="#f472b6"/><path d="M560 170 c-6 -8 -17 0 -9 8 l9 9 l9 -9 c8 -8 -3 -16 -9 -8 z" fill="#f472b6"/></g>
        <g data-face="costas"><rect x="482" y="136" width="116" height="78" rx="24" fill="#d5dde7"/><g stroke="#9aa6b6" stroke-width="3" stroke-linecap="round"><line x1="512" y1="160" x2="568" y2="160"/><line x1="512" y1="172" x2="568" y2="172"/><line x1="512" y1="184" x2="568" y2="184"/></g><rect x="524" y="244" width="32" height="22" rx="5" fill="#d5dde7"/>
          <g class="hmpf"><rect x="404" y="104" width="76" height="30" rx="13" fill="#2a0f14" stroke="#f87171" stroke-width="2"/><text x="442" y="124" text-anchor="middle" font-size="14" font-weight="900" fill="#fca5a5" font-family="${MONO}">HMPF!</text></g></g>
      </g>
    </g>

    <g class="obj" data-obj="terminal"><title>Terminal</title>
      <rect x="640" y="236" width="222" height="10" rx="2" fill="#2b3644"/>
      <rect x="648" y="246" width="8" height="42" fill="#1e2833"/><rect x="846" y="246" width="8" height="42" fill="#1e2833"/>
      <rect x="664" y="100" width="172" height="126" rx="10" fill="#1c2330" stroke="#0b0f15" stroke-width="2" filter="url(#shadow)"/>
      <rect x="674" y="110" width="152" height="102" rx="5" fill="url(#screenG)"/>
      <g opacity=".12" stroke="#4ade80">${range(114, 208, 4).map((y) => `<line x1="676" y1="${y}" x2="824" y2="${y}"/>`).join('')}</g>
      <g data-unless="terminalLiberado" font-family="${MONO}">
        <text x="684" y="130" font-size="10" fill="#34d399" font-weight="700">MAESTRO OS v3.14</text>
        <text x="684" y="145" font-size="8.5" fill="#15803d">acesso restrito</text>
        <text x="684" y="176" font-size="13" fill="#4ade80" font-weight="800">SENHA:</text>
        <text x="738" y="176" font-size="13" fill="#4ade80" letter-spacing="2">______</text>
        <rect x="684" y="186" width="8" height="12" fill="#4ade80" class="blink"/>
      </g>
      <g data-if="terminalLiberado" font-family="${MONO}">
        <text x="684" y="131" font-size="11" fill="#4ade80" font-weight="900">ACESSO LIBERADO ✓</text>
        <text x="684" y="150" font-size="9" fill="#86efac">• ração do Pipoca</text>
        <text x="684" y="164" font-size="9" fill="#86efac">• consertar o Bip</text>
        <text x="684" y="194" font-size="16" fill="#fde68a" font-weight="900" filter="url(#glow)">SAÍDA: 4-2-7</text>
      </g>
      <rect x="740" y="226" width="20" height="10" fill="#374151"/>
      <rect x="700" y="229" width="100" height="7" rx="2" fill="#4b5563"/>
    </g>

    <g class="obj" data-obj="porta_saida"><title>Porta reforçada (saída)</title>
      <path d="M868 218 C 858 218, 866 234, 858 240" stroke="#0b0f15" stroke-width="6" fill="none"/>
      <path d="M868 218 C 858 218, 866 234, 858 240" stroke="#22d3ee" stroke-width="2.5" fill="none" filter="url(#glow)" data-if="terminalLiberado"/>
      <rect x="866" y="42" width="82" height="244" rx="3" fill="#0a0d15"/>
      <g data-unless="portaSaidaAberta">
        <rect x="872" y="48" width="70" height="238" fill="url(#metal)"/>
        <rect x="872" y="150" width="70" height="16" fill="url(#hazard)" opacity=".9"/>
        <rect x="926" y="190" width="7" height="30" rx="3" fill="#b8c0cc"/>
        <text x="907" y="100" text-anchor="middle" font-size="11" font-weight="900" fill="rgba(255,255,255,.35)" font-family="${MONO}" letter-spacing="1">SAÍDA</text>
      </g>
      <g data-if="portaSaidaAberta">
        <rect x="872" y="48" width="70" height="238" fill="#03140b"/>
        <rect x="872" y="48" width="70" height="238" fill="url(#exitLight)"/>
        <polygon points="872,286 942,286 960,350 840,350" fill="rgba(134,239,172,.13)"/>
      </g>
      <circle cx="907" cy="34" r="6" fill="#ef4444" filter="url(#glow)" class="blink" data-unless="portaSaidaAberta"/>
      <circle cx="907" cy="34" r="6" fill="#22c55e" filter="url(#glow)" data-if="portaSaidaAberta"/>
    </g>`;
  }

  // ------------------------------------------------------------------ Sala 3 — Corredor da saída
  function saida() {
    let keys = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys += `<rect x="${591 + c * 13}" y="${180 + r * 12}" width="10" height="9" rx="2" fill="#4b5566"/>`;
    const lines = range(-3, 3, 1).map((t) => `<line x1="${480 + t * 58}" y1="286" x2="${480 + t * 170}" y2="350"/>`).join('');
    return `
    <polygon points="0,0 960,0 660,36 300,36" fill="#0b1011"/>
    <polygon points="0,0 300,36 300,286 0,350" fill="url(#sideL)"/>
    <polygon points="960,0 660,36 660,286 960,350" fill="url(#sideR)"/>
    <rect x="300" y="36" width="360" height="250" fill="#131c1b"/>
    <polygon points="0,350 300,286 660,286 960,350" fill="#0a0f0e"/>
    <g stroke="rgba(134,239,172,.07)">${lines}<line x1="236" y1="300" x2="724" y2="300"/><line x1="140" y1="320" x2="820" y2="320"/></g>
    <line x1="0" y1="6" x2="300" y2="40" stroke="#34d399" stroke-width="3" opacity=".55" filter="url(#glow)"/>
    <line x1="960" y1="6" x2="660" y2="40" stroke="#34d399" stroke-width="3" opacity=".55" filter="url(#glow)"/>
    <g transform="translate(92,108)"><rect width="84" height="34" rx="4" fill="#052e16" stroke="#16a34a"/><text x="42" y="22" text-anchor="middle" font-size="12" font-weight="900" fill="#4ade80" font-family="${MONO}">→ SAÍDA</text></g>
    <g transform="translate(790,150)"><rect x="0" y="10" width="26" height="62" rx="10" fill="#dc2626"/><rect x="6" y="0" width="14" height="12" rx="3" fill="#1f2937"/><path d="M20 4 q16 0 16 18" stroke="#1f2937" stroke-width="3" fill="none"/><rect x="4" y="30" width="18" height="14" rx="2" fill="#fef2f2"/></g>

    <g class="obj" data-obj="teclado"><title>Porta de saída com teclado numérico</title>
      <rect x="426" y="48" width="108" height="28" rx="5" fill="#052e16" stroke="#34d399" stroke-width="2" filter="url(#glow)"/>
      <text x="480" y="68" text-anchor="middle" font-size="16" font-weight="900" fill="#4ade80" letter-spacing="4" font-family="${MONO}">SAÍDA</text>
      <rect x="394" y="84" width="172" height="202" rx="3" fill="#0a0e13"/>
      <g data-unless="escapou">
        <rect x="402" y="92" width="156" height="194" fill="url(#metal)"/>
        <line x1="480" y1="92" x2="480" y2="286" stroke="#1b2029" stroke-width="2"/>
        <rect x="416" y="106" width="50" height="34" rx="3" fill="#0a1a14" stroke="#1b2029" stroke-width="2"/><rect x="494" y="106" width="50" height="34" rx="3" fill="#0a1a14" stroke="#1b2029" stroke-width="2"/>
        <rect x="416" y="186" width="128" height="10" rx="5" fill="#b8c0cc"/>
      </g>
      <g data-if="escapou">
        <rect x="402" y="92" width="156" height="194" fill="url(#sun)" filter="url(#bigGlow)"/>
        <polygon points="402,286 558,286 800,350 160,350" fill="rgba(253,230,138,.28)"/>
        <polygon points="402,92 378,80 378,300 402,286" fill="url(#metal)"/>
        <polygon points="558,92 582,80 582,300 558,286" fill="url(#metal)"/>
      </g>
      <rect x="584" y="146" width="58" height="92" rx="7" fill="#1b2230" stroke="#3b4454" stroke-width="2"/>
      <rect x="591" y="154" width="44" height="18" rx="3" fill="#03140b"/>
      <text x="613" y="167" text-anchor="middle" font-size="11" font-weight="800" fill="#4ade80" font-family="${MONO}" data-text="codigoSaida">_ _ _</text>
      ${keys}
    </g>

    <g class="obj" data-obj="planta"><title>Planta carnívora (Dona Gertrudes)</title>
      <path d="M196 294 C 190 262, 214 244, 202 214" stroke="#15803d" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M194 272 q-26 -6 -32 -22 q22 0 32 18 z" fill="#16a34a"/><path d="M200 256 q24 -8 34 -24 q-24 2 -34 20 z" fill="#16a34a"/>
      <g class="chomp">
        <path class="jaw-lo" d="M176 204 Q200 236 230 198 Z" fill="#16a34a"/>
        <path d="M180 204 Q200 226 224 200 Z" fill="#be123c"/>
        <path class="jaw-up" d="M176 200 Q198 158 230 192 Z" fill="#22c55e"/>
        <g fill="#f8fafc"><path d="M182 198 l3 7 l3 -6 z"/><path d="M192 196 l3 8 l3 -7 z"/><path d="M203 195 l3 8 l3 -7 z"/><path d="M214 195 l3 7 l3 -6 z"/></g>
        <circle cx="206" cy="180" r="2.5" fill="#052e16"/>
      </g>
      <rect x="146" y="292" width="92" height="11" rx="3" fill="#c2410c"/>
      <polygon points="150,302 234,302 224,344 160,344" fill="#9a3412"/>
      <rect x="168" y="318" width="48" height="10" rx="2" fill="#fde68a"/>
      <text x="192" y="325.5" text-anchor="middle" font-size="6.2" font-weight="800" fill="#78350f" font-family="Georgia,serif">D. GERTRUDES</text>
    </g>
    <g class="obj" data-obj="capacho"><title>Capacho</title>
      <polygon points="424,292 536,292 554,322 406,322" fill="#7c2d12" stroke="#431407" stroke-width="2"/>
      <text x="480" y="311" text-anchor="middle" font-size="9.5" font-weight="900" fill="#fed7aa" letter-spacing="2" font-family="${MONO}">VOLTE SEMPRE</text>
    </g>`;
  }

  const SALAS = { escritorio, laboratorio, saida };
  const NOMES = { escritorio: 'Escritório do Dr. Maestro', laboratorio: 'Laboratório', saida: 'Corredor da saída' };

  function render(container, sala) {
    container.innerHTML = `<svg viewBox="0 0 960 350" class="room" data-room="${sala}" role="img" aria-label="${NOMES[sala]}" xmlns="http://www.w3.org/2000/svg">${DEFS}${SALAS[sala]()}</svg>`;
    return container.firstElementChild;
  }

  function update(svg, estado) {
    if (!svg || !estado) return;
    const f = estado.flags || {};
    const ok = (expr) => expr.split('&').every((k) => !!f[k.trim()]);
    svg.querySelectorAll('[data-if]').forEach((n) => { n.style.display = ok(n.getAttribute('data-if')) ? '' : 'none'; });
    svg.querySelectorAll('[data-unless]').forEach((n) => { n.style.display = ok(n.getAttribute('data-unless')) ? 'none' : ''; });
    const rosto = (estado.bip && estado.bip.rosto) || 'confuso';
    svg.querySelectorAll('[data-face]').forEach((n) => { n.style.display = n.getAttribute('data-face') === rosto ? '' : 'none'; });
    const cods = estado.codigos || {};
    const fmtCod = (c) => (c ? String(c).slice(0, 3).split('').join(' ') : '_ _ _');
    svg.querySelectorAll('[data-text="codigoCofre"]').forEach((n) => { n.textContent = f.cofreAberto ? '3 1 4' : fmtCod(cods.cofre); });
    svg.querySelectorAll('[data-text="codigoSaida"]').forEach((n) => { n.textContent = f.escapou ? '4 2 7' : fmtCod(cods.saida); });
  }

  function highlight(svg, obj, efeito) {
    if (!svg || !obj) return;
    const g = svg.querySelector(`[data-obj="${obj}"]`);
    if (!g) return;
    const cls = efeito === 'shake' ? 'shake' : 'hl';
    g.classList.remove('hl', 'shake'); void g.getBoundingClientRect(); g.classList.add(cls);
    setTimeout(() => g.classList.remove(cls), 1700);
  }

  window.EscapeScene = { render, update, highlight };
})();

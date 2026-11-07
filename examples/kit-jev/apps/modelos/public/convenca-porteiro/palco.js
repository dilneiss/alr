// Tela do "Convença o Porteiro": a portaria desenhada em SVG, o Seu Valdir com expressões trocáveis (piscando, e a boca que
// mexe com a amplitude da fala gravada), os medidores, a jogada de cada frase e a porta de vidro que abre quando você ganha.
// A cada frase vai UMA chamada (jogada "falar"); a pausa curta da fala já adianta a chamada, e a resposta toca na hora.

// quando a sua vez termina: o reconhecedor fechou a frase (final) e nada novo chegou em 300 ms; ou 700 ms sem mudar nada
const FIM_TURNO_FINAL = 300;
const FIM_TURNO_MIC = 700;
const FIM_TURNO = 700;       // nos exemplos (fala simulada), que pausam ~0,56 s entre as frases
const DRENO_MS = 1600;       // na sua vez, a paciência cai 1 ponto a cada 1,6 s
const SILENCIO_MS = 15000;   // calado por 15 s: ele cobra
const ATRASO_VOZ = 160;      // o carimbo aparece e a voz entra logo depois (batida de quadrinho)
const DICA = 'Aperte o microfone e convença o Seu Valdir';

// demonstração: o entregador de pizza que quase perde (suborno, grosseria) e ganha com o Vasco
const ROTEIRO = [
  'Boa noite, chefe! Pizza pra Dona Marta, do apartamento 302.',
  'Deixa eu subir rapidinho que eu te dou vinte reais.',
  'Ô, abre logo essa porta, meu chapa, a pizza tá esfriando!',
  'Foi mal, chefe. Peraí, essa flâmula aí é do Vasco? O senhor é vascaíno?',
  'Eu também sou Vasco desde criança! Meu avô me levava em São Januário.',
  'Olha aqui o pedido no meu celular: Dona Marta, 302, já tá pago.',
];
const RESERVA = ['Vascaíno ajuda vascaíno, né, Seu Valdir? Eu entrego e desço rapidinho.', 'Pode ver a mensagem dela aqui: pode subir com a pizza, moço.'];

const RUIDO = /^\W*(e|a|o|ah|eh|oh|hm+|hum+|uh|ahn|anh|han)\W*$/;   // sons soltos que o microfone pega
// "sou o sobrinho", "neto dela", "é minha avó": a pessoa diz que é parente da moradora ("meu avô me levava…" não conta)
const PARENTE = /\b(sou|eu sou) (o |a )?(sobrinh[oa]|net[oa]|filh[oa]|afilhad[oa]|parente|prim[oa])\b|\b(sobrinh[oa]|net[oa]|filh[oa]|afilhad[oa]|parente|prim[oa]) (da dona|dela)\b|\bminha (tia|avo|vo|mae|madrinha)\b/;
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const palavras = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []).length;
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const topo = (a) => (a && a.probabilities ? +Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0] : 2);

// ---------- a portaria (viewBox 1600×900) ----------
const CENA_SVG = `
<svg class="cp-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A portaria à noite: o Seu Valdir, de quepe e bigode, atrás do balcão, e a porta de vidro dos elevadores fechada" data-cara="neutro">
  <defs>
    <linearGradient id="cp-g-parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d311b"/><stop offset=".6" stop-color="#3a2514"/><stop offset="1" stop-color="#25170c"/></linearGradient>
    <radialGradient id="cp-g-luz" cx="760" cy="110" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd58a" stop-opacity=".55"/><stop offset=".42" stop-color="#f59e0b" stop-opacity=".15"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>
    <linearGradient id="cp-g-hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbefd6"/><stop offset="1" stop-color="#d8bd8c"/></linearGradient>
    <linearGradient id="cp-g-vidro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4ecff" stop-opacity=".34"/><stop offset=".5" stop-color="#a6d3f5" stop-opacity=".14"/><stop offset="1" stop-color="#d4ecff" stop-opacity=".30"/></linearGradient>
    <linearGradient id="cp-g-aco" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a9b4bf"/><stop offset=".5" stop-color="#e3e8ec"/><stop offset="1" stop-color="#97a2ae"/></linearGradient>
    <linearGradient id="cp-g-balcao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d562a"/><stop offset="1" stop-color="#5a3416"/></linearGradient>
    <linearGradient id="cp-g-tampo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0924f"/><stop offset="1" stop-color="#b47a3d"/></linearGradient>
    <linearGradient id="cp-g-camisa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c7cb8"/><stop offset="1" stop-color="#335a8f"/></linearGradient>
    <linearGradient id="cp-g-quepe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4b7d"/><stop offset="1" stop-color="#1b2d50"/></linearGradient>
    <radialGradient id="cp-g-pele" cx=".46" cy=".36" r=".72"><stop offset="0" stop-color="#e6ab7d"/><stop offset=".68" stop-color="#cb8b5b"/><stop offset="1" stop-color="#b07246"/></radialGradient>
    <radialGradient id="cp-g-verde" cx="1355" cy="520" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6ee7b7" stop-opacity=".95"/><stop offset=".55" stop-color="#10b981" stop-opacity=".45"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></radialGradient>
    <clipPath id="cp-clip-porta"><rect x="1160" y="170" width="390" height="690"/></clipPath>
    <clipPath id="cp-clip-flamula"><path d="M975 178 H1095 L1035 372 Z"/></clipPath>
    <clipPath id="cp-clip-caneca"><rect x="984" y="656" width="56" height="62" rx="8"/></clipPath>
    <clipPath id="cp-clip-olho-e"><ellipse cx="695" cy="398" rx="31" ry="37"/></clipPath>
    <clipPath id="cp-clip-olho-d"><ellipse cx="825" cy="398" rx="31" ry="37"/></clipPath>
  </defs>

  <!-- parede, luz da luminária e lambri -->
  <rect width="1600" height="900" fill="url(#cp-g-parede)"/>
  <rect width="1600" height="900" fill="url(#cp-g-luz)"/>
  <rect y="612" width="1600" height="288" fill="#2c1a0d"/>
  <path d="M0 612 H1600" stroke="#6e4625" stroke-width="7"/>
  <path d="M60 630 V900 M140 630 V900 M220 630 V900 M300 630 V900 M1180 630 V900 M1260 630 V900 M1340 630 V900 M1420 630 V900 M1500 630 V900" stroke="#3e2615" stroke-width="4"/>

  <!-- relógio: 22h10 -->
  <g transform="translate(176 146)">
    <circle r="76" fill="#24160b"/><circle r="66" fill="#f6ecd8"/>
    <path d="M0 -56 V-44 M0 56 V44 M-56 0 H-44 M56 0 H44" stroke="#2a1a0d" stroke-width="6" stroke-linecap="round"/>
    <path d="M0 0 L-28 -20" stroke="#2a1a0d" stroke-width="9" stroke-linecap="round"/>
    <path d="M0 0 L40 -23" stroke="#2a1a0d" stroke-width="5" stroke-linecap="round"/>
    <circle r="7" fill="#f59e0b"/>
  </g>

  <!-- quadro de avisos -->
  <g transform="translate(36 410)">
    <rect width="300" height="200" rx="12" fill="#6b4423"/>
    <rect x="12" y="12" width="276" height="176" rx="7" fill="#c4935a"/>
    <g transform="rotate(-4 86 66)"><rect x="24" y="26" width="128" height="80" fill="#fff4a3"/><text class="cp-t-nota" x="88" y="60" text-anchor="middle">REUNIÃO</text><text class="cp-t-nota" x="88" y="88" text-anchor="middle">SEXTA 19H</text></g>
    <g transform="rotate(5 220 66)"><rect x="162" y="22" width="120" height="82" fill="#ffd6e0"/><text class="cp-t-nota" x="222" y="56" text-anchor="middle">ACHOU</text><text class="cp-t-nota" x="222" y="84" text-anchor="middle">UM GATO?</text></g>
    <g transform="rotate(-2 150 150)"><rect x="64" y="118" width="176" height="58" fill="#d6ecff"/><text class="cp-t-nota" x="152" y="154" text-anchor="middle">LIXO: TERÇA</text></g>
    <circle cx="88" cy="32" r="6" fill="#e11d48"/><circle cx="221" cy="28" r="6" fill="#2563eb"/><circle cx="152" cy="124" r="6" fill="#16a34a"/>
  </g>

  <!-- planta -->
  <g class="cp-planta">
    <path d="M98 790 C 72 690, 88 610, 112 556 C 124 640, 120 720, 116 790 Z" fill="#2f7d4f"/>
    <path d="M128 790 C 122 676, 142 588, 154 516 C 170 606, 162 700, 148 790 Z" fill="#3c9a62"/>
    <path d="M152 790 C 162 700, 188 628, 210 576 C 204 658, 188 730, 172 790 Z" fill="#2f7d4f"/>
    <path d="M112 790 C 96 720, 70 668, 42 638 C 80 688, 102 740, 120 790 Z" fill="#37905a"/>
    <path d="M60 786 H222 L205 896 H77 Z" fill="#b5562c"/><rect x="52" y="772" width="178" height="22" rx="6" fill="#ca6a3b"/>
  </g>

  <!-- flâmula preta e branca (a dica do time dele) -->
  <g class="cp-flamula">
    <path d="M966 172 H1104" stroke="#c9a46a" stroke-width="7" stroke-linecap="round"/>
    <path d="M975 177 H1095 L1035 372 Z" fill="#0f0f0f"/>
    <g clip-path="url(#cp-clip-flamula)"><path d="M962 200 L996 170 L1112 336 L1078 364 Z" fill="#f5f4ee"/></g>
    <path d="M1035 372 l-9 24 M1035 372 v26 M1035 372 l9 24" stroke="#f5f4ee" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- placa dos elevadores -->
  <g class="cp-placa">
    <rect x="1225" y="88" width="260" height="58" rx="12" fill="#1b130b" stroke="#6e4625" stroke-width="4"/>
    <text class="cp-t-placa" x="1355" y="128" text-anchor="middle">ELEVADORES</text>
  </g>

  <!-- hall dos elevadores (atrás do vidro) -->
  <g class="cp-hall">
    <rect x="1160" y="170" width="390" height="690" fill="url(#cp-g-hall)"/>
    <rect x="1160" y="772" width="390" height="88" fill="#c9ab7d"/>
    <rect x="1262" y="300" width="186" height="472" fill="url(#cp-g-aco)" stroke="#8a95a1" stroke-width="6"/>
    <path d="M1355 302 V770" stroke="#8a95a1" stroke-width="4"/>
    <rect x="1300" y="238" width="110" height="46" rx="9" fill="#1b130b"/>
    <text class="cp-t-andar" x="1355" y="272" text-anchor="middle">▲ 3</text>
    <circle cx="1484" cy="520" r="15" fill="#eef0f2" stroke="#8a95a1" stroke-width="4"/>
  </g>
  <rect class="cp-luz-verde" x="1160" y="170" width="390" height="690" fill="url(#cp-g-verde)"/>

  <!-- portas de vidro (deslizam para dentro da parede quando você ganha) -->
  <g clip-path="url(#cp-clip-porta)">
    <g class="cp-porta cp-porta-e">
      <rect x="1160" y="170" width="195" height="690" fill="url(#cp-g-vidro)" stroke="#8d99a6" stroke-width="10"/>
      <path d="M1182 262 L1252 192 M1182 336 L1302 216" stroke="#fff" stroke-opacity=".3" stroke-width="12" stroke-linecap="round"/>
      <rect x="1326" y="520" width="13" height="190" rx="6" fill="url(#cp-g-aco)"/>
      <g class="cp-adesivo"><rect x="1172" y="384" width="168" height="70" rx="12" fill="#fff" fill-opacity=".94"/><text class="cp-t-adesivo" x="1256" y="414" text-anchor="middle">SÓ COM</text><text class="cp-t-adesivo" x="1256" y="440" text-anchor="middle">AUTORIZAÇÃO</text></g>
    </g>
    <g class="cp-porta cp-porta-d">
      <rect x="1355" y="170" width="195" height="690" fill="url(#cp-g-vidro)" stroke="#8d99a6" stroke-width="10"/>
      <path d="M1382 302 L1472 212 M1402 384 L1532 254" stroke="#fff" stroke-opacity=".22" stroke-width="10" stroke-linecap="round"/>
      <rect x="1371" y="520" width="13" height="190" rx="6" fill="url(#cp-g-aco)"/>
    </g>
  </g>
  <rect x="1150" y="160" width="410" height="710" fill="none" stroke="#56606c" stroke-width="20"/>

  <!-- luminária -->
  <path d="M760 0 V54" stroke="#1b130b" stroke-width="5"/>
  <path d="M708 54 H812 L844 98 H676 Z" fill="#2b1a0c" stroke="#f59e0b" stroke-opacity=".55" stroke-width="3"/>
  <ellipse cx="760" cy="100" rx="64" ry="10" fill="#ffd27a"/>

  <!-- o Seu Valdir -->
  <g class="cp-valdir">
    <g class="cp-respira">
      <path d="M704 556 L816 556 L824 640 L760 670 L696 640 Z" fill="#a8693f"/>
      <path class="cp-camisa" d="M498 736 C 503 680, 540 650, 612 632 L 700 612 L 760 662 L 820 612 L 908 632 C 980 650, 1017 680, 1022 736 Z" fill="url(#cp-g-camisa)"/>
      <path d="M700 612 L760 664 L726 694 L678 628 Z" fill="#2b4e7f"/>
      <path d="M820 612 L760 664 L794 694 L842 628 Z" fill="#2b4e7f"/>
      <path d="M760 664 V736" stroke="#2b4e7f" stroke-width="5"/><circle cx="760" cy="700" r="5" fill="#d9e3f0"/><circle cx="760" cy="726" r="5" fill="#d9e3f0"/>
      <rect x="566" y="668" width="128" height="36" rx="7" fill="#f5b83d" stroke="#a87412" stroke-width="3"/>
      <text class="cp-t-cracha" x="630" y="694" text-anchor="middle">VALDIR</text>

      <g class="cp-cabeca">
        <ellipse cx="604" cy="420" rx="28" ry="46" fill="#c07f50"/><ellipse cx="606" cy="420" rx="13" ry="27" fill="#a3653c"/>
        <ellipse cx="916" cy="420" rx="28" ry="46" fill="#c07f50"/><ellipse cx="914" cy="420" rx="13" ry="27" fill="#a3653c"/>
        <ellipse cx="760" cy="405" rx="160" ry="190" fill="url(#cp-g-pele)"/>
        <path d="M640 520 C 672 602, 848 602, 880 520 C 858 584, 662 584, 640 520 Z" fill="#9a5f37" opacity=".28"/>
        <path d="M607 296 C 600 330, 604 366, 615 388 L 632 382 C 626 350, 628 320, 641 294 Z" fill="#a19b94"/>
        <path d="M913 296 C 920 330, 916 366, 905 388 L 888 382 C 894 350, 892 320, 879 294 Z" fill="#a19b94"/>
        <circle class="cp-rubor" cx="656" cy="480" r="36" fill="#e2675b"/>
        <circle class="cp-rubor" cx="864" cy="480" r="36" fill="#e2675b"/>

        <!-- olhos: branco, pupila e pálpebra (a pálpebra desce para piscar e para a cara de desconfiado) -->
        <g class="cp-olhos">
          <g>
            <ellipse cx="695" cy="398" rx="31" ry="37" fill="#fff"/>
            <g clip-path="url(#cp-clip-olho-e)">
              <g class="cp-pupila"><circle cx="698" cy="404" r="15" fill="#2a1a10"/><circle cx="703" cy="397" r="5" fill="#fff"/></g>
              <g class="cp-palp"><rect x="658" y="356" width="74" height="84" fill="#c98a5b"/><path d="M658 440 H732" stroke="#5a3a24" stroke-width="5" vector-effect="non-scaling-stroke"/></g>
              <g class="cp-palp-baixo"><rect x="658" y="398" width="74" height="44" fill="#c98a5b"/></g>
            </g>
            <ellipse cx="695" cy="398" rx="31" ry="37" fill="none" stroke="#5a3a24" stroke-width="4"/>
          </g>
          <g>
            <ellipse cx="825" cy="398" rx="31" ry="37" fill="#fff"/>
            <g clip-path="url(#cp-clip-olho-d)">
              <g class="cp-pupila"><circle cx="822" cy="404" r="15" fill="#2a1a10"/><circle cx="827" cy="397" r="5" fill="#fff"/></g>
              <g class="cp-palp"><rect x="788" y="356" width="74" height="84" fill="#c98a5b"/><path d="M788 440 H862" stroke="#5a3a24" stroke-width="5" vector-effect="non-scaling-stroke"/></g>
              <g class="cp-palp-baixo"><rect x="788" y="398" width="74" height="44" fill="#c98a5b"/></g>
            </g>
            <ellipse cx="825" cy="398" rx="31" ry="37" fill="none" stroke="#5a3a24" stroke-width="4"/>
          </g>
        </g>
        <g class="cp-olhos-fechados">
          <path d="M662 406 Q695 370 728 406" stroke="#3b2a1e" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M792 406 Q825 370 858 406" stroke="#3b2a1e" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M650 424 l-14 8 M870 424 l14 8" stroke="#7c4a2a" stroke-width="4" stroke-linecap="round"/>
        </g>

        <!-- sobrancelhas grossas -->
        <path class="cp-sob cp-sob-e" d="M650 338 C 670 314, 722 310, 744 327 C 747 336, 740 343, 731 341 C 710 331, 677 335, 661 349 C 651 353, 644 346, 650 338 Z" fill="#3a2f2a"/>
        <path class="cp-sob cp-sob-d" d="M870 338 C 850 314, 798 310, 776 327 C 773 336, 780 343, 789 341 C 810 331, 843 335, 859 349 C 869 353, 876 346, 870 338 Z" fill="#3a2f2a"/>

        <!-- nariz -->
        <path d="M760 390 C 734 398, 711 440, 717 470 C 723 495, 750 501, 760 497 C 770 501, 797 495, 803 470 C 809 440, 786 398, 760 390 Z" fill="#b8754a"/>
        <ellipse cx="744" cy="450" rx="10" ry="17" fill="#ecb48c" opacity=".55"/>
        <path d="M733 481 Q742 490 751 483 M769 483 Q778 490 787 481" stroke="#7a4728" stroke-width="4" fill="none" stroke-linecap="round"/>

        <!-- bocas (uma por expressão; falando, a boca abre com a amplitude da voz) -->
        <g class="cp-boca">
          <path class="b b-neutro" d="M726 566 Q760 575 794 566" stroke="#5a2618" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path class="b b-desconfiado" d="M740 571 Q770 562 802 573" stroke="#5a2618" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path class="b b-bravo" d="M718 582 Q760 554 802 582" stroke="#5a2618" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path class="b b-emocionado" d="M722 578 Q741 566 760 576 Q779 586 798 574" stroke="#5a2618" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path class="b b-convencido" d="M716 560 Q760 598 804 560" stroke="#5a2618" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path class="b b-pensando" d="M738 572 Q755 567 774 571" stroke="#5a2618" stroke-width="7" fill="none" stroke-linecap="round"/>
          <g class="b b-rindo"><path d="M704 552 Q760 546 816 552 Q809 590 760 593 Q711 590 704 552 Z" fill="#5a1414"/><path d="M714 553 Q760 549 806 553 L803 565 Q760 569 717 565 Z" fill="#fff"/><ellipse cx="760" cy="582" rx="26" ry="8" fill="#cf5f58"/></g>
          <g class="b b-fala"><g class="cp-abre"><ellipse cx="760" cy="567" rx="36" ry="24" fill="#4a1010"/><ellipse cx="760" cy="582" rx="22" ry="8" fill="#c4554e"/></g></g>
        </g>

        <!-- bigode -->
        <g class="cp-bigode">
          <path d="M760 488 C 735 477, 700 481, 675 497 C 650 511, 628 535, 610 548 C 640 553, 668 546, 690 536 C 712 549, 740 547, 760 533 C 780 547, 808 549, 830 536 C 852 546, 880 553, 910 548 C 892 535, 870 511, 845 497 C 820 481, 785 477, 760 488 Z" fill="#3a2f2a"/>
          <path d="M688 512 C 704 506, 720 506, 736 513 M784 513 C 800 506, 816 506, 832 512" stroke="#6b5a50" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
        </g>

        <!-- quepe -->
        <g class="cp-quepe">
          <path d="M592 264 C 586 228, 600 206, 626 200 L 894 200 C 920 206, 934 228, 928 264 Z" fill="#1c2f55"/>
          <ellipse cx="760" cy="176" rx="198" ry="66" fill="url(#cp-g-quepe)"/>
          <path d="M600 216 H920" stroke="#f5b83d" stroke-width="6"/>
          <path d="M598 256 C 652 298, 868 298, 922 256 L 922 266 C 868 314, 652 314, 598 266 Z" fill="#0c1322"/>
          <path d="M646 282 C 706 302, 814 302, 874 282" stroke="#fff" stroke-opacity=".22" stroke-width="5" fill="none" stroke-linecap="round"/>
          <g transform="translate(760 228)"><path d="M0 -27 L23 -15 L19 14 L0 27 L-19 14 L-23 -15 Z" fill="#f5b83d" stroke="#9a6a12" stroke-width="3"/><path d="M0 -13 L4 -4 L13 -4 L6 2 L9 12 L0 7 L-9 12 L-6 2 L-13 -4 L-4 -4 Z" fill="#9a6a12"/></g>
        </g>

        <!-- extras de expressão -->
        <path class="cp-lagrima" d="M846 438 C 837 455, 839 470, 849 470 C 859 470, 861 455, 846 438 Z" fill="#8fd0ff" stroke="#3b82c4" stroke-width="2"/>
        <path class="cp-suor" d="M624 304 C 613 323, 615 337, 626 337 C 637 337, 639 323, 624 304 Z" fill="#a8dcff" stroke="#4a90c8" stroke-width="2"/>
        <g class="cp-raiva" transform="translate(968 168)"><path d="M-24 -6 Q-8 -8 -6 -24 M6 -24 Q8 -8 24 -6 M24 6 Q8 8 6 24 M-6 24 Q-8 8 -24 6" stroke="#ef4444" stroke-width="9" fill="none" stroke-linecap="round"/></g>
      </g>
    </g>
  </g>

  <!-- balcão e o que mora em cima dele -->
  <path d="M372 716 H1148 L1160 748 H360 Z" fill="url(#cp-g-tampo)"/>
  <rect x="360" y="748" width="800" height="152" fill="url(#cp-g-balcao)"/>
  <path d="M360 749 H1160" stroke="#e7ac68" stroke-width="5"/>
  <path d="M360 772 H1160" stroke="#d79a52" stroke-width="3" opacity=".55"/>
  <path d="M460 784 V900 M560 784 V900 M660 784 V900 M760 784 V900 M860 784 V900 M960 784 V900 M1060 784 V900" stroke="#45270f" stroke-width="4" opacity=".55"/>
  <g class="cp-interfone">
    <rect x="392" y="650" width="84" height="70" rx="10" fill="#e3d9c0" stroke="#8e8266" stroke-width="3"/>
    <g fill="#8e8266"><circle cx="414" cy="676" r="4"/><circle cx="434" cy="676" r="4"/><circle cx="454" cy="676" r="4"/><circle cx="414" cy="692" r="4"/><circle cx="434" cy="692" r="4"/><circle cx="454" cy="692" r="4"/><circle cx="414" cy="708" r="4"/><circle cx="434" cy="708" r="4"/><circle cx="454" cy="708" r="4"/></g>
  </g>
  <path d="M542 712 L560 700 H640 L646 706 L652 700 H732 L750 712 Z" fill="#fbf7ec" stroke="#b7ab8e" stroke-width="2"/>
  <path d="M572 704 H630 M664 704 H722" stroke="#c7bba0" stroke-width="2"/>
  <path d="M700 690 L742 708" stroke="#1f3b73" stroke-width="5" stroke-linecap="round"/>
  <g class="cp-caneca">
    <path class="cp-vapor" d="M1000 646 C 990 630, 1010 620, 1000 602" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path class="cp-vapor v2" d="M1022 646 C 1012 630, 1032 620, 1022 602" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="984" y="656" width="56" height="62" rx="8" fill="#f2efe6"/>
    <g clip-path="url(#cp-clip-caneca)"><path d="M984 660 L984 676 L1040 712 L1040 696 Z" fill="#111"/></g>
    <path d="M1040 672 C 1062 672, 1062 704, 1040 704" stroke="#f2efe6" stroke-width="9" fill="none"/>
  </g>
  <g class="cp-radio">
    <path d="M1128 662 L1150 598" stroke="#9aa3ad" stroke-width="4" stroke-linecap="round"/>
    <rect x="1060" y="662" width="86" height="56" rx="10" fill="#2d2a26" stroke="#5a544c" stroke-width="3"/>
    <circle cx="1088" cy="690" r="17" fill="#4a453f"/><circle cx="1088" cy="690" r="9" fill="none" stroke="#2d2a26" stroke-width="3"/>
    <rect x="1112" y="676" width="24" height="9" rx="3" fill="#f59e0b"/>
    <circle class="cp-led" cx="1124" cy="703" r="5" fill="#10b981"/>
  </g>
  <!-- o fone do interfone, no gancho -->
  <g class="cp-fone">
    <path d="M386 640 C 386 626, 398 620, 410 624 L 462 624 C 474 620, 486 626, 486 640 C 486 650, 476 653, 470 647 L 402 647 C 396 653, 386 650, 386 640 Z" fill="#d6ccb2" stroke="#8e8266" stroke-width="3"/>
  </g>
  <!-- quando a paciência acaba: ele pega o fone e chama o síndico (braço, mão, fone e o fio enrolado até o interfone) -->
  <g class="cp-ligando">
    <path d="M700 566 L696 563 L693 560 L690 560 L688 562 L687 566 L686 571 L685 576 L684 580 L682 582 L679 581 L676 579 L672 576 L668 572 L665 570 L662 569 L660 571 L659 575 L658 580 L657 585 L656 589 L654 591 L651 591 L648 589 L644 585 L640 582 L637 579 L634 579 L632 581 L631 585 L630 590 L629 595 L628 599 L626 601 L623 600 L620 598 L616 595 L612 591 L609 589 L606 589 L604 590 L603 594 L602 599 L601 604 L600 608 L598 610 L595 610 L592 608 L588 604 L584 601 L581 598 L578 598 L576 600 L575 604 L574 609 L573 614 L572 618 L570 620 L567 620 L564 617 L560 614 L556 610 L553 608 L550 608 L548 610 L547 614 L546 619 L545 624 L544 628 L542 629 L539 629 L536 627 L532 623 L528 620 L525 618 L522 617 L520 619 L519 623 L518 628 L517 633 L516 637 L514 639 L511 639 L508 636 L504 633 L500 629 L497 627 L494 627 L492 629 L491 633 L490 638 L489 643 L488 647 L486 649 L483 648 L480 646 L476 642 L472 639 L469 637 L466 636 L464 638 L463 642 L462 647 L461 652 L460 656 L458 658 L455 658 L452 655 L448 652" stroke="#8e8266" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M560 744 C 562 676, 602 604, 640 548" stroke="#24426d" stroke-width="70" stroke-linecap="round" fill="none"/>
    <path d="M560 744 C 562 676, 602 604, 640 548" stroke="#4171ad" stroke-width="58" stroke-linecap="round" fill="none"/>
    <path d="M548 720 C 552 670, 588 612, 622 566" stroke="#6b95cf" stroke-width="8" stroke-linecap="round" fill="none" opacity=".55"/>
    <g transform="translate(645 480) rotate(56)">
      <path d="M-98 -8 C -98 -30, -62 -34, -54 -16 L 54 -16 C 62 -34, 98 -30, 98 -8 L 98 8 C 98 28, 62 30, 54 14 L -54 14 C -62 30, -98 28, -98 8 Z" fill="#ddd3ba" stroke="#7d725a" stroke-width="5"/>
    </g>
    <ellipse cx="650" cy="502" rx="31" ry="27" fill="#c98a5b" stroke="#a5683e" stroke-width="3"/>
    <path d="M634 488 q 14 -6 27 2 M630 502 q 16 -6 31 2 M632 516 q 14 -5 27 2" stroke="#a5683e" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

export async function montar(api) {
  const { area, spec, ui, som } = api;
  const { el, fmt, sleep } = ui;
  const R = spec.regras;
  const FALA = Object.fromEntries(spec.falas.map((f) => [f.id, f]));
  const TAT = Object.fromEntries(spec.taticas.map((t) => [t.id, t]));
  const N_FALAS = spec.falas.filter((f) => f.quando).length;
  const LIMIAR_CONTRA = (spec.decisoes.find((d) => d.id === 'contradicao') || {}).limiar ?? 0.7;
  const perguntar = api.ultima();

  // ---------- estado ----------
  let P = null;            // a partida atual (uma resposta de outra partida é descartada)
  let fase = 'pronto';     // pronto · ouvindo · pensando · falando · ganhou · perdeu
  let esp = null;          // chamada adiantada na pausa curta: { texto, p }
  let tFim = null, tSilencio = null, tDreno = null, tRelogio = null;
  let micDepois = false;   // religar o microfone quando ele terminar de falar?
  let turnos = 0, partidas = 0, vitorias = 0;

  // ---------- tela ----------
  const raiz = el('div', { class: 'cp' });
  const medidor = (cls, nome, rotulo) => {
    const val = el('b', { class: 'val mj-num', text: '0' });
    const cab = el('div', { class: 'cab' }, [el('span', { class: 'nm', text: nome }), val]);
    const trilho = el('div', { class: 'trilho' }, [el('i', { class: 'fill' }), cls === 'conf' ? el('i', { class: 'meta', title: 'Com 80 ele libera', html: '<span>🚪 80</span>' }) : null]);
    const no = el('div', { class: 'cp-med ' + cls, role: 'meter', 'aria-label': rotulo, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, [cab, trilho]);
    return { no, val, cab, mostrado: 0 };
  };
  const mConf = medidor('conf', '🤝 Confiança', 'Confiança do Seu Valdir em você');
  const mPac = medidor('pac', '⏳ Paciência', 'Paciência do Seu Valdir');
  const info = el('span', { class: 'cp-info mj-num', text: '' });
  const btVoz = el('button', { class: 'cp-bt-mini', type: 'button', 'aria-pressed': 'true', title: 'Ligar ou desligar a voz do Seu Valdir' });
  const btNova = el('button', { class: 'cp-bt-mini', type: 'button', title: 'Começar uma partida nova', onclick: () => reiniciar() }, ['↺ ', el('span', { class: 'cp-some', text: 'Recomeçar' })]);
  const fitaCaixa = el('div', { class: 'cp-fita' }, [api.fita.no]);
  const hud = el('header', { class: 'cp-hud' }, [mConf.no, mPac.no, el('div', { class: 'cp-hud-dir' }, [info, btVoz, api.som.botao(el), btNova])]);

  const svgCaixa = el('div', { class: 'cp-svg-caixa', html: CENA_SVG });
  const svg = svgCaixa.querySelector('svg');
  const placa = svg.querySelector('.cp-t-placa');
  const carimbo = el('div', { class: 'cp-carimbo', 'aria-hidden': 'true' });
  const faixa = el('div', { class: 'cp-faixa', role: 'status' });
  const confete = el('div', { class: 'cp-confete', 'aria-hidden': 'true' });
  const cena = el('div', { class: 'cp-cena' }, [svgCaixa, carimbo, faixa, confete]);

  const balaoQuem = el('span', { class: 'quem', text: 'Seu Valdir' });
  const dito = el('span', { class: 'dito' }), resto = el('span', { class: 'resto' });
  const balao = el('div', { class: 'cp-balao', 'aria-hidden': 'true' }, [balaoQuem, el('p', {}, [dito, resto])]);
  const anuncio = el('p', { class: 'cp-sr', 'aria-live': 'polite' });   // o leitor de tela ouve a fala inteira, uma vez
  const btCampainha = el('button', { class: 'cp-bt cp-bt-campainha', type: 'button', onclick: () => comecar({ ligarMic: true }) }, ['🔔 Tocar a campainha']);
  const missao = el('div', { class: 'cp-missao' }, [
    el('span', { class: 'cp-rot', text: 'Sua missão' }),
    el('p', { class: 'tt', html: 'Subir ao <b>302</b>, da <b>Dona Marta</b>.' }),
    el('p', { class: 'sub', text: 'Ela não atende o interfone, e o Seu Valdir só libera com autorização. Convença o porteiro falando.' }),
    btCampainha,
    el('p', { class: 'ou', text: 'ou aperte o microfone e comece a falar' }),
  ]);
  const cenaCel = el('div', { class: 'cp-cena-cel' }, [cena, balao, missao, anuncio]);

  // lado direito: a jogada da sua frase, as táticas que o Jev reconhece e o que ele lembra
  const jVoce = el('blockquote', { class: 'cp-voce', text: '' });
  const jIc = el('span', { class: 'ic', text: '🎙️' });
  const jNome = el('b', { class: 'nm', text: 'Fale com o Seu Valdir' });
  const jEfeitos = el('div', { class: 'cp-efeitos' });
  const jInfo = el('p', { class: 'cp-fala-info', text: `A cada frase, o Jev lê a sua tática e escolhe a resposta dele entre ${N_FALAS} falas gravadas.` });
  const jogada = el('section', { class: 'cp-cartao cp-jogada vazia' }, [
    el('header', {}, [el('span', { class: 'cp-rot', text: 'Sua jogada' }), fitaCaixa]),
    jVoce, el('div', { class: 'cp-veredito' }, [jIc, el('div', { class: 'meio' }, [jNome, jEfeitos])]), jInfo,
  ]);
  // as táticas da lista fechada numa fileira: a escolhida acende, e a barrinha de cada uma é a chance que o Jev deu
  const chips = {};
  const grade = el('div', { class: 'cp-taticas', role: 'list' }, spec.taticas.map((t) => (chips[t.id] = el('span', { class: 'cp-tat', role: 'listitem', title: `${t.rotulo}: ${t.desc}`, 'aria-label': t.rotulo }, [el('span', { class: 'ic', text: t.icone }), el('i', { class: 'br' })]))));
  const tatLeg = el('p', { class: 'cp-tat-leg', text: 'A cada frase, o Jev escolhe uma destas.' });
  const taticas = el('section', { class: 'cp-cartao cp-grade' }, [el('header', {}, [el('span', { class: 'cp-rot', text: 'Táticas que o Jev reconhece' }), el('span', { class: 'cp-n mj-num', text: String(spec.taticas.length) })]), grade, tatLeg]);
  const memChips = el('div', { class: 'cp-mem-chips' });
  const memoria = el('section', { class: 'cp-cartao cp-memoria' }, [el('header', {}, [el('span', { class: 'cp-rot', text: 'O Seu Valdir lembra' })]), memChips]);
  const lado = el('aside', { class: 'cp-lado' }, [jogada, taticas, memoria]);

  const barra = api.voz.barraVoz({
    exemplos: [
      { rotulo: '📦 sou entregador', texto: 'Boa noite! Tenho uma entrega pra Dona Marta, do 302.' },
      { rotulo: '💸 te dou vinte', texto: 'Te dou vinte reais pra me deixar subir.' },
      { rotulo: '⚽ é vascaíno?', texto: 'O senhor é vascaíno? Eu também sou!' },
      { rotulo: '😂 piada', texto: 'Prometo que não vou roubar o elevador, ele é pesado demais.' },
      { rotulo: '🌹 elogio', texto: 'Que bigode bonito, hein, Seu Valdir!' },
      { rotulo: '🤬 grosseria', texto: 'Abre logo essa porta, meu chapa!' },
    ],
    dica: DICA,
    placeholder: 'Ou digite o que você diria e aperte Enter',
    pausaMs: 380,
    onTexto: (f, p) => aoTexto(f, p),
    onPausa: (t, info) => especular(t, info),
    onFrase: () => { if (digitando() && fase === 'ouvindo') fecharTurno(); },
  });
  raiz.append(hud, el('div', { class: 'cp-meio' }, [cenaCel, lado]), el('div', { class: 'cp-voz' }, [barra.no]));
  area.append(raiz);

  // a cena é sempre 16:9 e cabe na célula; o balão e a missão ficam por cima, em coordenadas da cena
  const celular = window.matchMedia ? matchMedia('(max-width: 760px)') : { matches: false };
  function encaixar() {
    if (celular.matches) {
      cena.style.width = ''; cena.style.height = '';
      cena.style.setProperty('--w', cena.getBoundingClientRect().width + 'px');
      for (const n of [balao, missao]) { n.style.left = ''; n.style.top = ''; n.style.width = ''; }
      return;
    }
    const c = cenaCel.getBoundingClientRect();
    if (!c.width || !c.height) return;
    const w = Math.floor(Math.min(c.width, c.height * 16 / 9)), h = Math.floor(w * 9 / 16);
    cena.style.width = w + 'px'; cena.style.height = h + 'px';
    cena.style.setProperty('--w', w + 'px'); cenaCel.style.setProperty('--w', w + 'px');
    const x0 = (c.width - w) / 2, y0 = 0;   // a cena encosta no topo, alinhada com o painel da direita
    for (const n of [balao, missao]) { n.style.left = Math.round(x0 + w * 0.02) + 'px'; n.style.top = Math.round(y0 + h * 0.045) + 'px'; n.style.width = Math.round(w * 0.335) + 'px'; }
  }
  if (window.ResizeObserver) new ResizeObserver(() => { encaixar(); if (P) podarMemoria(); }).observe(cenaCel); else addEventListener('resize', encaixar);
  encaixar();

  // ---------- voz do Seu Valdir: as falas gravadas, decodificadas no WebAudio; a boca segue a amplitude ----------
  const voz = { ac: null, saida: null, atual: null, ligada: (() => { try { return localStorage.getItem('cp-voz') !== '0'; } catch { return true; } })() };
  const desenharBtVoz = () => { btVoz.textContent = voz.ligada ? '🗣️ voz' : '🤐 voz'; btVoz.setAttribute('aria-pressed', String(voz.ligada)); };
  btVoz.addEventListener('click', () => { voz.ligada = !voz.ligada; try { localStorage.setItem('cp-voz', voz.ligada ? '1' : '0'); } catch { /* sem armazenamento */ } desenharBtVoz(); if (voz.ligada) contexto(); });
  desenharBtVoz();
  function contexto() {
    if (!voz.ac) {
      try { const C = window.AudioContext || window.webkitAudioContext; voz.ac = new C(); voz.saida = voz.ac.createGain(); voz.saida.gain.value = 1; voz.saida.connect(voz.ac.destination); } catch { return null; }
    }
    if (voz.ac.state === 'suspended') voz.ac.resume().catch(() => {});
    return voz.ac;
  }
  document.addEventListener('pointerdown', () => { if (voz.ligada) contexto(); }, { capture: true });
  const decod = (() => { try { const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; return C ? new C(1, 2, 44100) : null; } catch { return null; } })();
  const audios = new Map();
  function envelope(buf) {
    const d = buf.getChannelData(0), passo = Math.max(1, Math.round(buf.sampleRate / 60)), n = Math.ceil(d.length / passo), e = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; const a = i * passo, b = Math.min(d.length, a + passo); for (let j = a; j < b; j++) s += d[j] * d[j]; e[i] = Math.sqrt(s / Math.max(1, b - a)); }
    const ref = Array.from(e).sort((x, y) => x - y)[Math.floor(n * 0.95)] || 1;
    for (let i = 0; i < n; i++) e[i] = Math.min(1, e[i] / ref);
    return e;
  }
  function carregar(id) {
    if (!audios.has(id)) audios.set(id, (async () => {
      const dur = Math.max(1.6, String((FALA[id] || {}).texto || '').length / 13.5);
      try {
        if (!decod) throw new Error('sem WebAudio');
        const r = await fetch(api.url(`assets/falas/${id}.mp3`));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await decod.decodeAudioData(await r.arrayBuffer());
        return { buf, env: envelope(buf), dur: buf.duration };
      } catch { return { buf: null, env: null, dur }; }
    })());
    return audios.get(id);
  }
  spec.falas.forEach((f, i) => setTimeout(() => carregar(f.id), 40 + i * 30));

  function pararFala() { if (voz.atual) voz.atual.parar(); }
  async function tocarFala(id, meuP) {
    const f = FALA[id]; if (!f) return;
    const a = await carregar(id);
    if (meuP !== P) return;
    pararFala();
    let fonte = null, relogio;
    const ac = voz.ligada ? contexto() : null;
    if (ac && a.buf && ac.state === 'running') {
      fonte = ac.createBufferSource(); fonte.buffer = a.buf; fonte.connect(voz.saida);
      const t0 = ac.currentTime + 0.015; fonte.start(t0);
      relogio = () => ac.currentTime - t0;
    } else {
      const t0 = performance.now(); relogio = () => (performance.now() - t0) / 1000;
    }
    setCara(f.cara);
    falar(f.texto);
    svg.classList.add('falando');
    return new Promise((ok) => {
      let raf = 0, suave = 0, acabou = false, seguranca = 0;
      const ctl = {};
      const fim = () => {
        if (acabou) return; acabou = true;
        cancelAnimationFrame(raf); clearTimeout(seguranca);
        svg.style.setProperty('--boca', '0'); svg.classList.remove('falando'); revelar(1);
        if (voz.atual === ctl) voz.atual = null;
        ok();
      };
      ctl.parar = () => { try { fonte && fonte.stop(); } catch { /* já parou */ } fim(); };
      voz.atual = ctl;
      const passo = () => {
        const t = relogio();
        if (t >= a.dur) return fim();
        const e = a.env ? a.env[Math.max(0, Math.min(a.env.length - 1, Math.floor(t * 60)))] : 0.35 + 0.35 * Math.sin(t * 19) * Math.sin(t * 7.3);
        const alvo = Math.max(0, Math.min(1, (e - 0.1) / 0.62));
        suave += (alvo - suave) * (alvo > suave ? 0.65 : 0.32);
        svg.style.setProperty('--boca', suave.toFixed(3));
        revelar(t / a.dur);
        raf = requestAnimationFrame(passo);
      };
      seguranca = setTimeout(fim, (a.dur + 0.8) * 1000);   // aba em segundo plano: o rAF para, a partida não
      raf = requestAnimationFrame(passo);
    });
  }

  // ---------- o Seu Valdir: expressão, piscar, balão ----------
  function setCara(nome) { svg.setAttribute('data-cara', nome || 'neutro'); }
  (function piscar() {
    setTimeout(() => {
      if (svg.getAttribute('data-cara') !== 'rindo') { svg.classList.add('pisca'); setTimeout(() => svg.classList.remove('pisca'), 130); }
      piscar();
    }, 2300 + Math.random() * 3200);
  })();
  let balaoTexto = '', balaoCortes = [];
  function falar(texto) {
    balaoTexto = texto;
    anuncio.textContent = 'Seu Valdir: ' + texto;
    balaoCortes = [...texto.matchAll(/\S+\s*/g)].map((m) => m.index + m[0].length);
    balao.classList.remove('pensa', 'some'); balao.classList.add('fala');
    balaoQuem.textContent = 'Seu Valdir';
    dito.textContent = ''; resto.textContent = texto;
    balao.classList.remove('entra'); void balao.offsetWidth; balao.classList.add('entra');
  }
  function revelar(frac) {
    const alvo = balaoTexto.length * Math.min(1, frac / 0.86);
    let n = balaoCortes.find((c) => c >= alvo) ?? balaoTexto.length;
    if (frac >= 1) n = balaoTexto.length;
    if (dito.textContent.length === n) return;
    dito.textContent = balaoTexto.slice(0, n); resto.textContent = balaoTexto.slice(n);
  }
  function pensar() {
    balao.classList.remove('fala', 'some'); balao.classList.add('pensa');
    balaoQuem.textContent = 'Seu Valdir';
    balaoTexto = ''; dito.textContent = ''; resto.textContent = '';
    setCara('pensando');
  }

  // ---------- medidores ----------
  function animarNumero(m, alvo) {
    const de = m.mostrado, t0 = performance.now();
    m.mostrado = alvo;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / 450), v = Math.round(de + (alvo - de) * (1 - Math.pow(1 - k, 3)));
      m.val.textContent = String(v);
      if (k < 1 && m.mostrado === alvo) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  function desenharMedidores(dc = 0, dp = 0) {
    if (!P) return;
    for (const [m, v, d] of [[mConf, P.conf, dc], [mPac, P.pac, dp]]) {
      m.no.style.setProperty('--v', (v / 100).toFixed(3));
      m.no.setAttribute('aria-valuenow', String(v));
      if (d) { animarNumero(m, v); flutuar(m.cab, d); } else { m.mostrado = v; m.val.textContent = String(v); }
    }
    mConf.no.classList.toggle('perigo', P.conf < 15);
    mConf.no.classList.toggle('quase', P.conf >= 65 && P.conf < R.libera);
    mPac.no.classList.toggle('baixa', P.pac < 45);
    mPac.no.classList.toggle('perigo', P.pac < 25);
  }
  function flutuar(cab, d) {
    const n = el('span', { class: 'cp-delta mj-num ' + (d > 0 ? 'pos' : 'neg'), text: (d > 0 ? '+' : '−') + Math.abs(d) });
    cab.append(n); setTimeout(() => n.remove(), 1500);
  }

  // ---------- a jogada, as táticas e a memória ----------
  function decidindo(texto) {
    jogada.classList.remove('vazia', 'fim');
    jogada.classList.add('ao-vivo');
    jVoce.textContent = texto;
    jIc.textContent = '🤔'; jNome.textContent = 'O Jev está decidindo…'; jEfeitos.innerHTML = '';
    jInfo.textContent = 'Uma chamada só decide a tática, os efeitos e a fala.';
  }
  function mostrarJogada(j) {
    jogada.classList.remove('vazia', 'ao-vivo', 'fim');
    jVoce.textContent = j.texto;
    const t = TAT[j.tat];
    jIc.textContent = t.icone; jNome.textContent = t.rotulo;
    jEfeitos.innerHTML = '';
    const ef = (txt, d) => jEfeitos.append(el('span', { class: 'cp-ef mj-num ' + (d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero'), text: txt }));
    ef(`${j.dConf > 0 ? '✅ +' : j.dConf < 0 ? '❌ −' : '➖ '}${Math.abs(j.dConf)} confiança`, j.dConf);
    ef(`${j.dPac > 0 ? '+' : j.dPac < 0 ? '−' : '±'}${Math.abs(j.dPac)} paciência`, j.dPac);
    if (j.contra) ef('🤨 contradição', -1);
    jInfo.textContent = j.fim
      ? (j.fim === 'ganhou' ? '🏁 Confiança passou de 80: a regra do jogo libera a porta.' : '🏁 A paciência acabou: a regra do jogo chama o síndico.')
      : `💬 Fala escolhida entre ${j.opcoes}: ${fmt.pct(j.pFala)}`;
    jogada.classList.remove('bate'); void jogada.offsetWidth; jogada.classList.add('bate');
    for (const [id, ch] of Object.entries(chips)) {
      ch.style.setProperty('--p', ((j.probs || {})[id] || 0).toFixed(3));
      ch.classList.toggle('on', id === j.tat);
    }
    const ord = Object.entries(j.probs || {}).filter(([id]) => TAT[id]).sort((a, b) => b[1] - a[1]);
    tatLeg.textContent = ord.length ? `${TAT[ord[0][0]].icone} ${TAT[ord[0][0]].rotulo} ${fmt.pct(ord[0][1])}` + (ord[1] && ord[1][1] >= 0.01 ? ` · 2º ${TAT[ord[1][0]].icone} ${TAT[ord[1][0]].rotulo} ${fmt.pct(ord[1][1])}` : '') : '';
  }
  function carimbar(j) {
    const t = TAT[j.tat];
    carimbo.className = 'cp-carimbo ' + (j.dConf > 0 ? 'bom' : j.dConf < 0 ? 'ruim' : 'neutro');
    carimbo.textContent = `${t.icone} ${t.rotulo} ${j.dConf > 0 ? '+' : j.dConf < 0 ? '−' : '±'}${Math.abs(j.dConf)}`;
    void carimbo.offsetWidth; carimbo.classList.add('mostra');
  }
  function lembrar(texto, tat, fatos, contra) {
    const m = P.memoria, t = semAcento(texto), antes = JSON.stringify(m);
    if (/entreg|pizza|pacote|encomenda|remedio|delivery|ifood|correio|sedex/.test(t)) m.entrega = true;
    if (PARENTE.test(t)) m.parente = true;
    if (fatos.some((f) => f.startsWith('citou o nome certo'))) m.nome = true;
    if (fatos.some((f) => f.startsWith('citou o apartamento certo'))) m.apto = true;
    if (tat === 'suborno') m.suborno++;
    if (tat === 'grosseria') m.grosseria++;
    if (tat === 'autoridade_ameaca') m.ameaca++;
    if (tat === 'humor') m.piada++;
    if (tat === 'elogio') m.elogio++;
    if (tat === 'futebol_vasco' && /vasc/.test(t)) m.vasco = true;
    if (contra) m.contradicao++;
    const velho = JSON.parse(antes);
    for (const k of Object.keys(velho)) if (k !== 'ordem' && velho[k] !== m[k]) m.ordem = [k, ...m.ordem.filter((x) => x !== k)];
  }
  function desenharMemoria() {
    const m = P.memoria;
    const x = (n) => (n > 1 ? ` ×${n}` : '');
    const ROT = {
      entrega: ['📦 é entrega', 'bom'], parente: ['👪 diz que é parente', 'bom'], nome: ['✔ Dona Marta', 'bom'], apto: ['✔ 302', 'bom'],
      vasco: ['⚽ vascaíno!', 'bom'], piada: ['😂 fez rir' + x(m.piada), 'bom'], elogio: ['🌹 elogiou' + x(m.elogio), 'bom'],
      suborno: ['💸 quis subornar' + x(m.suborno), 'ruim'], grosseria: ['🤬 foi grosso' + x(m.grosseria), 'ruim'],
      ameaca: ['👮 ameaçou' + x(m.ameaca), 'ruim'], contradicao: ['🤥 se contradisse' + x(m.contradicao), 'ruim'],
    };
    const c = m.ordem.filter((k) => m[k]).map((k) => ROT[k]);
    memChips.innerHTML = '';
    if (!c.length) memChips.append(el('span', { class: 'cp-mem-vazio', text: 'Nada ainda. Ele guarda tudo o que você disser.' }));
    for (const [txt, tom] of c) memChips.append(el('span', { class: 'cp-mem ' + tom, text: txt }));
    podarMemoria();
  }
  // chip pela metade não: os que não cabem inteiros no cartão somem (são os mais antigos; o mais recente vem primeiro)
  function podarMemoria() {
    if (celular.matches) { memChips.querySelectorAll('.cp-mem').forEach((n) => { n.hidden = false; }); return; }
    const limite = memoria.getBoundingClientRect().bottom - 6;
    memChips.querySelectorAll('.cp-mem').forEach((n) => { n.hidden = false; });
    memChips.querySelectorAll('.cp-mem').forEach((n) => { if (n.getBoundingClientRect().bottom > limite) n.hidden = true; });
  }

  // ---------- partida ----------
  function novaPartida({ manterTexto = false } = {}) {
    if (!P || P.inicio) partidas++;
    P = { conf: R.confiancaInicial, pac: R.pacienciaInicial, frases: 0, inicio: 0, ativa: false, conversa: [], usadas: new Set(), lances: [], impaciencias: 0,
      memoria: { entrega: false, parente: false, nome: false, apto: false, vasco: false, piada: 0, elogio: 0, suborno: 0, grosseria: 0, ameaca: 0, contradicao: 0, ordem: [] } };
    fase = 'pronto'; esp = null;
    clearTimeout(tFim); pararRelogios();
    pararFala();
    mConf.mostrado = P.conf; mPac.mostrado = P.pac;
    desenharMedidores(); desenharMemoria(); desenharInfo();
    setCara('neutro');
    cena.classList.remove('ganhou', 'perdeu'); svg.classList.remove('aberta', 'perdeu', 'falando', 'escutando');
    placa.textContent = 'ELEVADORES';
    faixa.className = 'cp-faixa'; faixa.textContent = '';
    carimbo.className = 'cp-carimbo';
    confete.innerHTML = '';
    jogada.className = 'cp-cartao cp-jogada vazia'; lado.classList.remove('fim');
    jVoce.textContent = ''; jIc.textContent = '🎙️'; jNome.textContent = 'Fale com o Seu Valdir'; jEfeitos.innerHTML = '';
    jInfo.textContent = `A cada frase, o Jev lê a sua tática e escolhe a resposta dele entre ${N_FALAS} falas gravadas.`;
    jogada.querySelectorAll('.cp-fim-acoes').forEach((n) => n.remove());
    for (const ch of Object.values(chips)) { ch.classList.remove('on'); ch.style.setProperty('--p', '0'); }
    tatLeg.textContent = 'A cada frase, o Jev escolhe uma destas.';
    balao.className = 'cp-balao some';
    missao.classList.remove('some');
    if (!manterTexto) { barra.limpar(); barra.dica(DICA); }
    raiz.classList.remove('ocupado');
  }
  function reiniciar() { novaPartida(); }

  async function comecar({ ligarMic = false, silencioso = false } = {}) {
    if (fase !== 'pronto') return;
    P.ativa = true; P.inicio = Date.now();
    missao.classList.add('some');
    iniciarRelogios();
    if (silencioso) { fase = 'ouvindo'; resetarSilencio(); return; }
    const meuP = P;
    fase = 'falando'; raiz.classList.add('ocupado');
    micDepois = ligarMic ? !!api.voz.SR : barra.ouvindo;
    barra.parar();
    contexto();
    som.ding();
    await sleep(380);
    if (meuP !== P) return;
    await tocarFala('abertura', meuP);
    if (meuP !== P) return;
    P.conversa.push({ quem: 'valdir', texto: FALA.abertura.texto });
    voltarParaVoce();
  }

  // ---------- a sua vez ----------
  const digitando = () => !barra.ouvindo && !barra.no.classList.contains('simulando');
  function aoTexto(final, parcial) {
    const t = (final + ' ' + parcial).replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (fase === 'ganhou' || fase === 'perdeu') novaPartida({ manterTexto: true });   // falou depois do fim: partida nova, com esta frase
    if (fase === 'pronto') comecar({ silencioso: true });
    if (fase !== 'ouvindo') return;
    resetarSilencio();
    svg.classList.add('escutando');                                   // ele se inclina para ouvir
    if (digitando()) return;                                          // digitando: a vez fecha no Enter
    clearTimeout(tFim); tFim = setTimeout(fecharTurno, barra.ouvindo ? (parcial ? FIM_TURNO_MIC : FIM_TURNO_FINAL) : FIM_TURNO);
  }
  function especular(texto, info) {
    if (fase !== 'ouvindo' || digitando() || palavras(texto) < 2) return;
    if (!barra.ouvindo && info && info.parcial) return;   // fala simulada: só no fim da frase (no microfone, em toda pausa)
    if (esp && esp.texto === texto) return;
    esp = { texto, p: chamar(texto) };
  }
  function chamar(texto) {
    const meuP = P;
    const dados = { frase: texto, conversa: P.conversa.slice(-10), usadas: [...P.usadas], confianca: P.conf, paciencia: P.pac };
    return perguntar('falar', dados, `"${texto.slice(-34)}"`).then((r) => (meuP === P ? r : null), (e) => ({ erro: e }));
  }
  async function fecharTurno() {
    clearTimeout(tFim); tFim = null;
    if (fase !== 'ouvindo') return;
    const texto = barra.texto.replace(/\s+/g, ' ').trim();
    if (!texto || (barra.ouvindo && RUIDO.test(semAcento(texto)))) return;   // "é", "ah", "hum" soltos no microfone: ruído
    const meuP = P;
    fase = 'pensando'; turnos++;
    raiz.classList.add('ocupado');
    pararSilencio();
    micDepois = barra.ouvindo;
    barra.parar();                 // o microfone descansa enquanto ele responde: assim ele não ouve a própria voz
    barra.dica('🤔 O Seu Valdir está pensando…');
    svg.classList.remove('escutando');
    decidindo(texto); pensar();
    let r = esp && esp.texto === texto ? await esp.p : null;
    if (meuP !== P) return;
    if (!r) { esp = { texto, p: chamar(texto) }; r = await esp.p; }
    esp = null;
    if (meuP !== P) return;
    if (!r || r.erro || !r.fala) {
      fase = 'falando';
      await tocarFala('nao_entendi', meuP);
      if (meuP === P) voltarParaVoce();
      return;
    }
    await aplicar(texto, r, meuP);
  }

  async function aplicar(texto, r, meuP) {
    const tat = TAT[r.tatica && r.tatica.choice] ? r.tatica.choice : 'papo_aleatorio';
    const contra = ((r.contradicao && r.contradicao.noul) || 0) >= LIMIAR_CONTRA;
    const dConf = R.deltaConfianca[topo(r.efeito_confianca)] + (contra ? R.contradicao.confianca : 0);
    const dPac = R.deltaPaciencia[topo(r.efeito_paciencia)] + (contra ? R.contradicao.paciencia : 0);
    const fatos = spec.fatos(texto, P.conversa);
    lembrar(texto, tat, fatos, contra);
    P.conf = clamp(P.conf + dConf); P.pac = clamp(P.pac + dPac); P.frases++;
    const opcoes = N_FALAS - [...P.usadas].filter((id) => FALA[id] && FALA[id].quando).length;
    let fala = FALA[r.fala.choice] && FALA[r.fala.choice].quando ? r.fala.choice : 'nao_entendi';
    let fim = null;
    if (P.conf >= R.libera) { fim = 'ganhou'; fala = tat === 'futebol_vasco' || P.memoria.vasco ? 'pode_subir_vasco' : P.memoria.nome && P.memoria.apto ? 'pode_subir_entrega' : 'pode_subir'; }
    else if (P.pac <= 0) { fim = 'perdeu'; fala = tat === 'suborno' ? 'sindico_suborno' : 'sindico'; }
    const j = { texto, tat, probs: r.tatica && r.tatica.probabilities, dConf, dPac, contra, fala, pFala: r.fala.confidence ?? 0, opcoes, fim };
    P.usadas.add(fala);
    P.lances.push(j);
    P.conversa.push({ quem: 'voce', texto: texto.slice(0, 170), tatica: tat }, { quem: 'valdir', texto: FALA[fala].texto });
    mostrarJogada(j); carimbar(j); desenharMedidores(j.dConf, j.dPac); desenharMemoria(); desenharInfo();
    if (j.dConf > 0) som.pop(); else if (j.dConf < 0) som.erro(); else som.tique();
    fase = 'falando';
    barra.dica('🗣️ O Seu Valdir está respondendo…');
    await sleep(ATRASO_VOZ);
    if (meuP !== P) return;
    if (fim === 'ganhou') setTimeout(() => { if (meuP === P) abrirPorta(); }, 900);
    if (fim === 'perdeu') svg.classList.add('perdeu');
    await tocarFala(fala, meuP);
    if (meuP !== P) return;
    if (fim) terminar(fim); else voltarParaVoce();
  }

  function voltarParaVoce() {
    fase = 'ouvindo';
    raiz.classList.remove('ocupado');
    barra.limpar();
    if (micDepois) { micDepois = false; barra.ligar(); } else if (!barra.ouvindo) barra.dica(DICA);
    resetarSilencio();
  }

  function abrirPorta() {
    if (svg.classList.contains('aberta')) return;
    svg.classList.add('aberta');
    placa.textContent = 'PODE SUBIR ✓';
    som.whoosh();
  }
  function terminar(fim) {
    fase = fim; P.ativa = false; P.fimEm = Date.now();
    pararRelogios(); raiz.classList.remove('ocupado');
    cena.classList.add(fim);
    const seg = Math.round((Date.now() - P.inicio) / 1000);
    const tempo = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    const maxC = Math.max(...P.lances.map((l) => l.dConf), 0), minC = Math.min(...P.lances.map((l) => l.dConf), 0);
    const nomes = (v) => [...new Set(P.lances.filter((l) => l.dConf === v).map((l) => l.tat))].map((t) => `${TAT[t].icone} ${TAT[t].rotulo.toLowerCase()}`).join(', ');
    if (fim === 'ganhou') {
      vitorias++; abrirPorta();
      faixa.className = 'cp-faixa ganhou mostra'; faixa.textContent = 'PODE SUBIR! 🎉';
      som.acerto(); setTimeout(() => som.aplauso(1), 250); soltarConfete();
    } else {
      faixa.className = 'cp-faixa perdeu mostra'; faixa.textContent = 'VOU CHAMAR O SÍNDICO! 🚨';
      som.alarme();
    }
    desenharInfo();
    jogada.classList.add('fim'); lado.classList.add('fim');
    requestAnimationFrame(podarMemoria);   // sem as táticas, cabe mais memória
    jInfo.textContent = fim === 'ganhou'
      ? `🏆 Você convenceu o Seu Valdir em ${P.frases} ${P.frases === 1 ? 'frase' : 'frases'} (${tempo}). O que mais ajudou: ${maxC > 0 ? `${nomes(maxC)} (+${maxC})` : 'a paciência'}.`
      : `Foram ${P.frases} ${P.frases === 1 ? 'frase' : 'frases'} (${tempo}). O que mais te derrubou: ${minC < 0 ? `${nomes(minC)} (−${-minC})` : 'o silêncio'}.`;
    jogada.querySelectorAll('.cp-fim-acoes').forEach((n) => n.remove());
    jogada.append(el('div', { class: 'cp-fim-acoes' }, [el('button', { class: 'cp-bt', type: 'button', onclick: () => reiniciar() }, ['↺ Jogar de novo'])]));
    barra.limpar(); barra.dica('Aperte ↺ Jogar de novo, ou fale para começar outra partida');
  }

  // ---------- tempo: a paciência cai na sua vez, o relógio anda e o silêncio comprido incomoda ----------
  function iniciarRelogios() {
    pararRelogios();
    tDreno = setInterval(() => {
      if (!P || !P.ativa || fase !== 'ouvindo') return;
      P.pac = clamp(P.pac - 1); desenharMedidores();
      if (P.pac <= 0) perderNoSilencio();
    }, DRENO_MS);
    tRelogio = setInterval(desenharInfo, 1000);
  }
  function pararRelogios() { clearInterval(tDreno); clearInterval(tRelogio); pararSilencio(); }
  function resetarSilencio() { clearTimeout(tSilencio); if (P && P.ativa) tSilencio = setTimeout(cobrar, SILENCIO_MS); }
  function pararSilencio() { clearTimeout(tSilencio); }
  async function cobrar() {
    if (fase !== 'ouvindo' || barra.texto) return resetarSilencio();
    const meuP = P;
    fase = 'falando'; raiz.classList.add('ocupado');
    micDepois = barra.ouvindo; barra.parar();
    P.pac = clamp(P.pac - 6); desenharMedidores(0, -6);
    const id = P.impaciencias++ % 2 === 0 ? 'impaciente' : 'impaciente_2';
    await tocarFala(id, meuP);
    if (meuP !== P) return;
    if (P.pac <= 0) return perderNoSilencio();
    voltarParaVoce();
  }
  async function perderNoSilencio() {
    if (!P.ativa || fase === 'perdeu') return;
    const meuP = P;
    fase = 'falando'; P.ativa = false; P.fimEm = Date.now(); pararRelogios();
    micDepois = false; barra.parar();
    svg.classList.add('perdeu');
    await tocarFala('sindico', meuP);
    if (meuP === P) terminar('perdeu');
  }
  function desenharInfo() {
    if (!P) return;
    const seg = P.inicio ? Math.round(((P.fimEm || Date.now()) - P.inicio) / 1000) : 0;
    const t = P.inicio ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}` : '0:00';
    info.textContent = `Partida ${partidas} · ⏱ ${t}${vitorias ? ` · 🏆 ${vitorias}` : ''}`;
  }

  function soltarConfete() {
    if (ui.reduzMovimento) return;
    confete.innerHTML = '';
    const cores = ['#f59e0b', '#10b981', '#fde68a', '#ffffff', '#111111', '#6ee7b7'];
    for (let i = 0; i < 54; i++) {
      const s = el('i', {});
      s.style.setProperty('--x', (Math.random() * 2 - 1).toFixed(2));
      s.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      s.style.setProperty('--d', (1 + Math.random() * 1.1).toFixed(2) + 's');
      s.style.background = cores[i % cores.length];
      s.style.left = (55 + Math.random() * 40) + '%';
      confete.append(s);
    }
    setTimeout(() => { confete.innerHTML = ''; }, 2600);
  }

  novaPartida();

  // ---------- demonstração: o entregador de pizza ----------
  async function esperarVez(sinal) {
    const n0 = turnos;
    for (let i = 0; i < 40 && turnos === n0 && fase === 'ouvindo'; i++) await sleep(100, sinal);
    for (let i = 0; i < 250 && (fase === 'pensando' || fase === 'falando'); i++) await sleep(100, sinal);
  }
  async function tocar(sinal) {
    const abortar = () => reiniciar();
    sinal.addEventListener('abort', abortar, { once: true });
    try {
      reiniciar();
      await sleep(700, sinal);
      await comecar();
      for (const frase of [...ROTEIRO, ...RESERVA]) {
        if (fase === 'ganhou' || fase === 'perdeu') break;
        await sleep(420, sinal);
        await barra.simular(frase, { sinal, velocidade: 1.12 });
        fecharTurno();
        await esperarVez(sinal);
      }
      await sleep(4500, sinal);
    } finally { sinal.removeEventListener('abort', abortar); }
  }

  return { tocar };
}

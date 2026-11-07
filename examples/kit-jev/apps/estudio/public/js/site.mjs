// Gera a LANDING PAGE completa (HTML + CSS autossuficientes). A mesma saída alimenta o preview (iframe) e o
// "⬇️ Baixar site". Tudo que muda de uma versão para outra vem das escolhas do Jev guardadas no contexto:
// topo (ctx.site.hero), estilo de ilustração (ctx.site.img → cenas de site-arte.mjs), botões, cantos, textura,
// densidade, seções e selos. Os textos saem do contexto; aqui só há microtexto de interface.
import { esc, cap, mix, contraste, rgba, lum, caixa as aplicarCaixa, semAcento } from './util.mjs';
import { ajustesCSS, corDoTopo, tintaPara } from './ajustes-css.mjs';
import { simboloSVG, fontFaceCSS } from './marca.mjs';
import { FONTE_MANUSCRITO } from './logos.mjs';
import { padrao } from './arte.mjs';
import { UI, ICONE, svgIcone } from '../lib/icones.mjs';
import { cena, miniatura, objetoSolto, seloGiratorio } from './site-arte.mjs';

const ico = (nome, tam = 18, sw = 2, cls = '') => svgIcone(UI[nome] || (ICONE[nome] && ICONE[nome].svg) || nome, { size: tam, sw, cls });
const SETA = () => svgIcone(UI.seta, { size: 18, sw: 2.2, cls: 'seta' });
const ESTRELA_CHEIA = (tam = 18) => svgIcone(ICONE.estrela.svg, { size: tam, sw: 1.4, fill: 'currentColor' });
const ESTRELAS = '★★★★★';
const MENU_IC = '<path d="M4 7h16M4 12h16M4 17h10"/>';
const FECHAR_IC = '<path d="M6 6l12 12M18 6 6 18"/>';

// máscaras das bordas entre seções (a forma segue o estilo de ilustração do Jev)
const MASCARA = (() => {
  const u = (d) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 40' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
  let bolhas = 'M0 40V24';
  for (let x = 0; x < 1440; x += 48) bolhas += 'a24 22 0 0 1 48 0';
  let zigue = 'M0 40V22';
  for (let x = 0; x < 1440; x += 36) zigue += `L${x + 18} 6L${x + 36} 22`;
  return {
    onda: u('M0 40V22C160 6 320 4 480 16S800 38 960 26 1280 2 1440 14V40z'),
    bolhas: u(bolhas + 'V40z'),
    zigue: u(zigue + 'V40z'),
    diagonal: u('M0 40L1440 2V40z'),
    curva: u('M0 40C360 6 1080 6 1440 40z'),
  };
})();

// ------------------------------------------------------------------ CSS base (fixo)
export const CSS_BASE = `
*{box-sizing:border-box}[data-bloco]{display:contents}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16.5px/1.65 var(--fb);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;transition:background-color .6s ease,color .6s ease;overflow-x:hidden}
img,svg{display:block;max-width:100%}a{color:inherit}button,input{font:inherit;color:inherit}
::selection{background:var(--pri);color:var(--onPri)}
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid var(--priTxt);outline-offset:3px}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(20px,4vw,44px)}
h1,h2,h3{font-family:var(--fd);font-weight:var(--dw);letter-spacing:var(--dtr);text-transform:var(--dcase);line-height:1.02;margin:0;text-wrap:balance;transition:color .6s}
h2{font-size:clamp(32px,4.4vw,56px);line-height:1.04}h3{font-size:20px;line-height:1.2}
p{margin:0;text-wrap:pretty}
.eyebrow,.kicker{display:inline-flex;align-items:flex-start;gap:12px;font:800 12px/1.3 var(--fk);letter-spacing:.2em;text-transform:uppercase;color:var(--priTxt)}
.kicker::before{content:"";flex:none;width:28px;height:2px;border-radius:2px;background:currentColor;margin-top:.58em}
/* botões */
.btn{position:relative;isolation:isolate;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:16px 26px;font:700 15px/1 var(--fb);letter-spacing:.01em;border-radius:var(--rb);background:var(--pri);color:var(--onPri);border:2px solid var(--pri);text-decoration:none;white-space:nowrap;cursor:pointer;transition:background-color .6s,color .6s,border-color .6s,transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s}
.btn svg{flex:none;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.btn:hover{transform:translateY(-2px);box-shadow:0 16px 30px -16px var(--sh)}.btn:active{transform:translateY(0)}
.btn:hover svg.seta{transform:translateX(4px)}
.btn:not(.fantasma)::after{content:"";position:absolute;inset:-2px;z-index:-1;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.32) 48%,transparent 66%);transform:translateX(-110%);transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.btn:not(.fantasma):hover::after{transform:translateX(110%)}
.btn.fantasma{background:transparent;color:var(--ink);border-color:var(--line)}.btn.fantasma:hover{border-color:currentColor;box-shadow:none}
.btn-sm{padding:11px 18px;font-size:13.5px}
body.btn-contorno .btn:not(.fantasma){background:transparent;color:var(--priTxt);border-color:var(--priTxt)}
body.btn-contorno .btn:not(.fantasma):hover{background:var(--priTxt);color:var(--bg)}
body.btn-bloco .btn{border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink)}
body.btn-bloco .btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)}body.btn-bloco .btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)}
body.btn-bloco .btn.fantasma{box-shadow:4px 4px 0 var(--line)}
body.btn-gradiente .btn:not(.fantasma){background:linear-gradient(120deg,var(--pri),var(--acc));border-color:transparent;color:var(--onPri);box-shadow:0 10px 26px -10px var(--pri)}
.acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}.acoes.center{justify-content:center}
.selos{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.selos.center{justify-content:center}
.selo{display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:var(--soft);color:var(--ink);font:600 13px/1.2 var(--fb);border:1px solid var(--line)}
.selo svg{color:var(--priTxt);flex:none}.selo b{color:var(--priTxt);font-weight:800}
.lead{font-size:clamp(17px,1.45vw,19.5px);line-height:1.6;color:var(--muted);max-width:33em;margin-top:22px}
/* faixa de oferta */
.topo-oferta{position:relative;z-index:21;background:var(--ink);color:var(--bg);font:600 13px/1.35 var(--fb)}
.to-in{display:flex;align-items:center;justify-content:center;gap:10px 14px;min-height:40px;padding:8px 0;text-align:center;flex-wrap:wrap}
.to-in>svg{color:var(--acc)}.to-in b{font-weight:700}
.to-cupom{display:inline-flex;align-items:center;gap:6px;border:1.5px dashed currentColor;border-radius:6px;padding:3px 9px;font:800 11px/1.3 var(--fk);letter-spacing:.14em;opacity:.9}
body.dark .topo-oferta{background:var(--pri);color:var(--onPri)}body.dark .to-in>svg{color:inherit}
/* menu */
.nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 86%,transparent);-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;align-items:center;gap:28px;height:76px}
.marca{display:inline-flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);min-width:0;flex:none}
.marca-sym{width:40px;height:40px;flex:none}
.marca-txt{font-family:var(--fl);font-weight:var(--lw);font-size:21px;line-height:1.1;white-space:nowrap;letter-spacing:var(--lt)}
.marca.longa .marca-txt{font-size:17px}.marca.longa .mt-palavra,.marca.longa .mt-poster{font-size:21px}.marca.longa .mt-script{font-size:25px}
.mt-palavra{font-size:27px}.mt-palavra i{display:inline-block;width:.18em;height:.18em;border-radius:50%;background:var(--acc2);margin-left:.07em}
.mt-poster{font-size:27px;letter-spacing:.01em;text-transform:uppercase}
.mt-script{position:relative;font-size:31px;letter-spacing:0;padding:0 2px 6px}
.mt-swash{position:absolute;left:3%;bottom:0;width:92%;height:8px;overflow:visible}.mt-swash path{fill:none;stroke:var(--acc2);stroke-width:2.4;stroke-linecap:round;vector-effect:non-scaling-stroke}
.nav-links{display:flex;gap:28px;margin-left:auto;font:600 14px/1 var(--fb);color:var(--muted)}
.nav-links a{position:relative;text-decoration:none;padding:8px 0;transition:color .2s}
.nav-links a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:2px;background:var(--priTxt);transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.nav-links a:hover{color:var(--ink)}.nav-links a:hover::after{transform:scaleX(1);transform-origin:left}
.nav-cta{flex:none}
.nav-mob{display:none;position:relative}
.nav-mob summary{list-style:none;width:46px;height:46px;border-radius:calc(var(--rb)*.5 + 8px);border:1px solid var(--line);display:grid;place-items:center;cursor:pointer;transition:background-color .2s}
.nav-mob summary:hover{background:var(--soft)}.nav-mob summary::-webkit-details-marker{display:none}
.nav-mob .ic-x,.nav-mob[open] .ic-menu{display:none}.nav-mob[open] .ic-x{display:block}
.nav-gaveta{position:absolute;right:0;top:calc(100% + 12px);width:min(300px,calc(100vw - 32px));background:var(--bg);border:1px solid var(--line);border-radius:calc(var(--r) + 6px);box-shadow:0 30px 60px -30px var(--sh);padding:10px;display:grid;gap:2px;animation:desce .3s cubic-bezier(.2,.8,.2,1)}
.nav-gaveta a:not(.btn){display:flex;justify-content:space-between;align-items:center;padding:13px 12px;border-radius:10px;text-decoration:none;font:600 15px/1.2 var(--fb)}
.nav-gaveta a:not(.btn):hover{background:var(--soft)}.nav-gaveta a:not(.btn) span{font:700 11px/1 var(--fk);color:var(--muted)}
.nav-gaveta .btn{margin-top:8px}
@keyframes desce{from{opacity:0;transform:translateY(-8px)}}
/* seções */
.sec{position:relative;z-index:1;padding:var(--sp) 0}
.sec.alt{background:var(--surf);z-index:2}
.sec.alt::before,.sec.alt::after{content:"";position:absolute;left:0;right:0;height:var(--dh);background:inherit;pointer-events:none;-webkit-mask:var(--dm) center/100% 100% no-repeat;mask:var(--dm) center/100% 100% no-repeat}
.sec.alt::before{bottom:calc(100% - 1px)}.sec.alt::after{top:calc(100% - 1px);transform:scaleY(-1)}
.sec-cab{max-width:720px;margin-bottom:clamp(36px,5vw,60px)}
.sec-cab.center{text-align:center;margin-left:auto;margin-right:auto}.sec-cab.center .sec-meta{justify-content:center}
.sec-cab.lado{max-width:none;display:grid;grid-template-columns:1.3fr .7fr;gap:24px 48px;align-items:end}
.sec-meta{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.sec-n{font:700 12.5px/1 var(--fk);letter-spacing:.1em;color:var(--muted);font-variant-numeric:tabular-nums}
.sec-meta .fio{width:36px;height:1px;background:var(--line);flex:none}
.sec-cab>p,.sec-cab-t+p{color:var(--muted);margin-top:16px;font-size:17.5px;max-width:34em}
.sec-cab.lado>p{margin:0 0 8px}
.card{background:var(--bg);border:1px solid var(--line);border-radius:var(--r);padding:28px}
.sec.alt .card{background:color-mix(in srgb,var(--bg) 72%,var(--surf))}
.tag{display:inline-flex;align-items:center;gap:6px;font:800 10.5px/1 var(--fk);letter-spacing:.14em;text-transform:uppercase;padding:7px 10px;border-radius:999px;background:var(--pri);color:var(--onPri);white-space:nowrap}
.tag.sec2{background:var(--sec);color:var(--onSec)}.tag.acc{background:var(--acc);color:var(--onAcc)}
body.cantos-retos .tag,body.cantos-retos .selo{border-radius:2px}
.icone-bola{width:52px;height:52px;border-radius:calc(var(--r)*.7 + 6px);display:grid;place-items:center;background:var(--soft);color:var(--priTxt);flex:none}
body.cantos-redondos .icone-bola{border-radius:50%}
.preco{font:var(--dw) 22px/1 var(--fd);letter-spacing:var(--dtr);color:var(--priTxt);white-space:nowrap;font-variant-numeric:lining-nums}
/* molduras das cenas (as "fotos" ilustradas) */
.moldura{position:relative;overflow:hidden;border-radius:var(--r);background:var(--soft);isolation:isolate}
.moldura>svg.sa{position:absolute;inset:0;width:100%;height:100%;transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.moldura:hover>svg.sa{transform:scale(1.045)}
body.cantos-suaves .m-arco{border-radius:50% 50% var(--r) var(--r)/34% 34% var(--r) var(--r)}
body.cantos-redondos .m-arco{border-radius:999px 999px calc(var(--r) + 6px) calc(var(--r) + 6px)}
body.cantos-retos .moldura{border-radius:0}
body.cantos-retos .moldura.m-borda{outline:1px solid var(--line);outline-offset:8px}
/* detalhes flutuantes: etiqueta de preço, chip, selo giratório, avatares */
.etq-w{position:absolute;z-index:3;filter:drop-shadow(0 18px 22px var(--sh));transform-origin:50% -30px;animation:balanca 7s ease-in-out infinite}
.etq-w::before{content:"";position:absolute;left:50%;top:-42px;height:52px;width:1.5px;background:color-mix(in srgb,var(--ink) 55%,transparent)}
.etq{position:relative;min-width:150px;max-width:210px;padding:30px 20px 18px;text-align:center;background:var(--bg);color:var(--ink);border-radius:0 0 12px 12px;clip-path:polygon(24% 0,76% 0,100% 20px,100% 100%,0 100%,0 20px);-webkit-mask:radial-gradient(circle 5px at 50% 13px,transparent 97%,#000);mask:radial-gradient(circle 5px at 50% 13px,transparent 97%,#000)}
.etq small{display:block;font:800 10px/1 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--priTxt)}
.etq b{display:block;margin-top:8px;font:700 14.5px/1.25 var(--fb)}
.etq-p{display:block;margin-top:8px;font:var(--dw) 26px/1 var(--fd);letter-spacing:var(--dtr);color:var(--priTxt);font-variant-numeric:lining-nums}
@keyframes balanca{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(-1deg)}}
.chip{position:absolute;z-index:3;display:flex;align-items:center;gap:12px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:calc(var(--r) + 6px);padding:12px 18px 12px 12px;box-shadow:0 24px 44px -24px var(--sh);animation:flutua 6s ease-in-out infinite}
.chip-ic{width:42px;height:42px;border-radius:calc(var(--r)*.6 + 6px);display:grid;place-items:center;background:var(--pri);color:var(--onPri);flex:none}
.chip b{display:block;font:var(--dw) 22px/1 var(--fd);letter-spacing:var(--dtr)}
.chip small{display:block;font:600 12px/1.3 var(--fb);color:var(--muted);margin-top:4px;max-width:150px}
.giro{position:absolute;z-index:3;display:grid;place-items:center;border-radius:50%;background:var(--acc);color:var(--onAcc);box-shadow:0 20px 40px -20px var(--sh)}
.giro svg{width:100%;height:100%}
.selo-gira-txt{animation:gira 30s linear infinite;transform-origin:50px 50px}
.avs{display:flex;padding-left:10px}
.avs i{width:38px;height:38px;border-radius:50%;margin-left:-10px;border:2.5px solid var(--bg);display:grid;place-items:center;font:800 14px/1 var(--fb);font-style:normal;background:var(--pri);color:var(--onPri)}
.avs i:nth-child(2){background:var(--sec);color:var(--onSec)}.avs i:nth-child(3){background:var(--acc);color:var(--onAcc)}
.prova{display:flex;align-items:center;gap:14px;margin-top:30px;font:600 14px/1.35 var(--fb);color:var(--muted)}
.prova b{color:var(--ink);font-weight:800}
.prova .est{color:#f5b301;letter-spacing:2px;display:block;font-size:13px}
/* movimento */
@keyframes flutua{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes sombra{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.84);opacity:.65}}
@keyframes gira{to{transform:rotate(360deg)}}
@keyframes pulso{0%{transform:scale(.55);opacity:.95}100%{transform:scale(1.6);opacity:0}}
@keyframes rota{to{stroke-dashoffset:-48}}
@keyframes corre{to{transform:translateX(-50%)}}
.sa-flutua{animation:flutua 5.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.sa-sombra{animation:sombra 5.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.sa-pulso{animation:pulso 2.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
.sa-rota{animation:rota 1.8s linear infinite}
.sa-moto{animation:flutua 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
/* ============ TOPOS ============ */
.hero{position:relative;overflow:hidden}
.hero h1{position:relative;font-size:var(--h1)}.hero h1.t-m{font-size:calc(var(--h1) * .88)}.hero h1.t-l{font-size:calc(var(--h1) * .76)}
.palco{position:relative}
/* texto + ilustração */
.hero-split{padding:clamp(40px,6vw,88px) 0 clamp(64px,8vw,112px)}
.hs{display:grid;grid-template-columns:1.02fr .98fr;gap:clamp(32px,5vw,72px);align-items:center}
.hero-split{--h1:clamp(42px,5.6vw,76px)}.hero-split h1{margin-top:22px}
.hs-palco{padding:36px 0 30px 36px}
.hs-foto{aspect-ratio:1/1.08;box-shadow:0 50px 90px -60px var(--sh)}
.hs-palco .etq-w{top:18%;right:-10px}
.hs-palco .chip{left:0;bottom:16%}
.hs-giro{width:clamp(96px,10vw,128px);height:clamp(96px,10vw,128px);right:6%;bottom:-8px}
/* central de impacto */
.hero-central{background:var(--pri);color:var(--onPri);text-align:center;padding:clamp(72px,9vw,120px) 0 0}
.hero-central .kicker,.hero-central .lead{color:var(--onPri)}.hero-central .lead{opacity:.86;margin-left:auto;margin-right:auto}
.hero-central{--h1:clamp(46px,8.2vw,108px)}.hero-central h1{max-width:980px;margin:22px auto 0;line-height:.98}
.hc{position:relative;z-index:2;padding-bottom:clamp(64px,8vw,104px)}
body .hero-central .btn:not(.fantasma){background:var(--onPri);color:var(--pri);border-color:var(--onPri)}
body.btn-bloco .hero-central .btn{border-color:var(--onPri);box-shadow:4px 4px 0 color-mix(in srgb,var(--onPri) 70%,transparent)}
body .hero-central .btn.fantasma{color:var(--onPri);border-color:color-mix(in srgb,var(--onPri) 45%,transparent)}
.hero-central .selo{background:color-mix(in srgb,var(--onPri) 12%,transparent);color:var(--onPri);border-color:color-mix(in srgb,var(--onPri) 24%,transparent)}.hero-central .selo b,.hero-central .selo svg{color:inherit}
.hc-fundo{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 55% at 50% 42%,color-mix(in srgb,var(--onPri) 10%,transparent),transparent 70%)}
.hc-obj{position:absolute;width:clamp(64px,9vw,132px);filter:drop-shadow(0 18px 24px rgba(0,0,0,.18));animation:flutua 7s ease-in-out infinite}
.hc-obj.o0{left:5%;top:12%}.hc-obj.o1{left:85%;top:9%;animation-delay:-2s}.hc-obj.o2{left:9%;top:60%;animation-delay:-4s;width:clamp(52px,6vw,92px)}.hc-obj.o3{left:86%;top:56%;animation-delay:-1s;width:clamp(52px,7vw,104px)}
.letreiro{position:relative;z-index:2;background:var(--ink);color:var(--bg);overflow:hidden;white-space:nowrap;border-top:1px solid color-mix(in srgb,var(--onPri) 20%,transparent)}
.letreiro-in{display:inline-flex;align-items:center;gap:26px;padding:18px 0;animation:corre 46s linear infinite}
.letreiro-in span{font:var(--dw) 20px/1 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase)}
.letreiro-in b{font:700 15px/1 var(--fb);color:var(--acc2);margin-left:8px;letter-spacing:0;text-transform:none}
.letreiro-in i{color:var(--acc2);opacity:.8;display:grid}
body.dark .letreiro-in b,body.dark .letreiro-in i{color:var(--pri)}
/* cinematográfico */
.hero-cinema{background:var(--cine);color:#fff;padding:clamp(88px,10vw,136px) 0 clamp(88px,10vw,124px);min-height:600px}
.hcn-nome{position:absolute;left:-2%;bottom:-.16em;font:var(--dw) min(22vw,calc(160vw / var(--len)))/1 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase);white-space:nowrap;color:var(--cine);-webkit-text-stroke:2px rgba(255,255,255,.12);paint-order:stroke fill;pointer-events:none;user-select:none}
.hcn-arte{position:absolute;right:-2%;top:0;bottom:0;width:56%}
.hcn-arte svg.sa{width:100%;height:100%}
.hcn-luz{position:absolute;right:14%;top:-20%;width:40%;height:110%;background:radial-gradient(50% 60% at 50% 30%,color-mix(in srgb,var(--priCine) 26%,transparent),transparent 70%);mix-blend-mode:screen;pointer-events:none}
.hcn-veu{position:absolute;inset:0;background:linear-gradient(90deg,var(--cine) 30%,color-mix(in srgb,var(--cine) 55%,transparent) 55%,transparent 78%),linear-gradient(0deg,var(--cine),transparent 34%);pointer-events:none}
.hcn{position:relative;z-index:2}.hcn>*{max-width:56%}
.hero-cinema{--h1:clamp(46px,7.4vw,96px)}.hero-cinema h1{margin-top:20px;color:#fff}
.hero-cinema .lead{color:rgba(255,255,255,.78)}.hero-cinema .kicker{color:var(--priCine)}
body .hero-cinema .btn.fantasma{color:#fff;border-color:rgba(255,255,255,.35)}
body.btn-contorno .hero-cinema .btn:not(.fantasma){color:var(--priCine);border-color:var(--priCine)}
body.btn-contorno .hero-cinema .btn:not(.fantasma):hover{background:var(--priCine);color:var(--cine)}
body:not(.btn-contorno):not(.btn-gradiente) .hero-cinema .btn:not(.fantasma){box-shadow:0 0 0 1px rgba(255,255,255,.22)}
body.btn-bloco .hero-cinema .btn{border-color:#fff;box-shadow:4px 4px 0 rgba(255,255,255,.85)}
.hero-cinema .selo{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.18)}.hero-cinema .selo b,.hero-cinema .selo svg{color:var(--priCine)}
.hcn-cred{position:absolute;z-index:2;right:clamp(20px,4vw,44px);top:30px;font:700 11px/1 var(--fk);letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.5);white-space:nowrap}
.hcn-cred::before{content:"";display:inline-block;width:40px;height:1px;background:currentColor;vertical-align:middle;margin-right:14px}
/* editorial */
.hero-editorial{padding:clamp(32px,4vw,56px) 0 clamp(64px,7vw,96px)}
.he-top{display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:2px solid var(--ink);border-bottom:1px solid var(--line);padding:13px 0;margin-bottom:clamp(28px,4vw,48px)}
.he-top .kicker::before{display:none}
.he-num{font:600 12px/1 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.hero-editorial{--h1:clamp(48px,8.6vw,118px)}.hero-editorial h1{line-height:.95;max-width:1040px}
.hero-editorial h1 em{font-style:italic;color:var(--priTxt)}
.he-grid{display:grid;grid-template-columns:1fr 1.2fr .5fr;gap:clamp(24px,3.4vw,48px);margin-top:clamp(32px,4vw,56px);align-items:start}
.he-grid .lead{margin-top:0;font-size:18px}
.he-fig{margin:0}
.he-fig .moldura{aspect-ratio:4/3}
.he-fig figcaption{display:flex;gap:12px;margin-top:12px;font:italic 14px/1.45 var(--fcap);color:var(--muted);text-transform:none;letter-spacing:0}
.he-fig figcaption span{font:700 10.5px/1.6 var(--fk);font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:var(--priTxt);white-space:nowrap}
.he-sum{border-top:1px solid var(--ink);padding-top:14px}
.he-sum b{display:block;font:800 11px/1 var(--fk);letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px}
.he-sum ol{list-style:none;margin:0;padding:0}
.he-sum a{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);text-decoration:none;font:500 14.5px/1.3 var(--fb);transition:color .2s,padding .3s}
.he-sum a span{font:700 11.5px/1.5 var(--fk);color:var(--muted)}.he-sum a:hover{color:var(--priTxt);padding-left:6px}
/* cartões flutuantes */
.hero-cartoes{padding:clamp(40px,6vw,84px) 0 clamp(64px,8vw,104px)}
.hk{display:grid;grid-template-columns:1fr 1.02fr;gap:clamp(32px,5vw,64px);align-items:center}
.hero-cartoes{--h1:clamp(40px,5.8vw,76px)}.hero-cartoes h1{margin-top:22px}
.hk-palco{position:relative;padding:48px 36px 56px 44px}
.hk-foto{aspect-ratio:1/1;border-radius:calc(var(--r) + 14px);box-shadow:0 50px 90px -60px var(--sh)}
body.cantos-retos .hk-foto{border-radius:0}
.flt{position:absolute;z-index:3;display:flex;align-items:center;gap:12px;background:color-mix(in srgb,var(--bg) 92%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:calc(var(--r) + 6px);padding:12px 18px 12px 12px;box-shadow:0 28px 50px -26px var(--sh);animation:flutua 6s ease-in-out infinite;max-width:260px}
.flt b{display:block;font:var(--dw) 21px/1.05 var(--fd);letter-spacing:var(--dtr)}
.flt small{display:block;font:600 12px/1.3 var(--fb);color:var(--muted);margin-top:4px}
.flt-ic{width:42px;height:42px;border-radius:calc(var(--r)*.6 + 6px);display:grid;place-items:center;flex:none;background:var(--pri);color:var(--onPri)}
.flt-mini{width:52px;height:52px;border-radius:50%;overflow:hidden;flex:none}
.flt.f1{top:4%;left:0}.flt.f2{top:42%;right:0;animation-delay:-2s}.flt.f2 .flt-ic{background:var(--acc);color:var(--onAcc)}.flt.f3{bottom:2%;left:14%;animation-delay:-4s}
/* minimalista */
.hero-minimal{padding:clamp(80px,10vw,140px) 0 clamp(72px,9vw,120px);text-align:center}
.hm-linhas{position:absolute;inset:0;pointer-events:none;display:flex;justify-content:space-between;max-width:1180px;margin:0 auto;padding:0 clamp(20px,4vw,44px)}
.hm-linhas i{width:1px;background:var(--line)}
.hm{position:relative;max-width:820px}
.hm-sym{position:relative;width:132px;height:132px;margin:0 auto 38px;color:var(--priTxt)}
.hm-sym .selo-gira{position:absolute;inset:0;width:100%;height:100%}
.hm-sym .hmsym{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.hero-minimal{--h1:clamp(40px,5.8vw,72px)}.hero-minimal .lead{margin:24px auto 0}
.hm-fatos{display:grid;grid-template-columns:repeat(3,1fr);margin-top:clamp(56px,7vw,88px);border-top:1px solid var(--line)}
.hm-fato{padding:22px 12px 0;border-left:1px solid var(--line)}.hm-fato:first-child{border-left:0}
.hm-fatos.hm-selos{display:block;border-top:0;margin-top:40px}
.hm-fato b{display:block;font:var(--dw) clamp(26px,3vw,36px)/1 var(--fd);letter-spacing:var(--dtr);color:var(--priTxt)}
.hm-fato span{display:block;margin-top:8px;font:600 13px/1.35 var(--fb);color:var(--muted)}
/* lúdico */
.hero-ludico{padding:clamp(48px,6vw,88px) 0 clamp(64px,8vw,104px)}
.hl{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(24px,4vw,48px);align-items:center;position:relative}
.bolhas{position:absolute;inset:0;pointer-events:none}
.bolhas i{position:absolute;border-radius:50%;animation:flutua 9s ease-in-out infinite}
.bolhas .b1{width:300px;height:300px;right:-110px;bottom:-120px;background:var(--sec)}
.bolhas .b2{width:110px;height:110px;right:5%;top:22px;background:var(--acc);animation-delay:-3s}
.bolhas .b3{width:64px;height:64px;left:47%;bottom:10%;background:var(--pri);opacity:.5;animation-delay:-5s}
.bolhas .b4{width:22px;height:22px;left:49%;top:16%;background:transparent;border:4px solid var(--priTxt)}
.hero-ludico{--h1:clamp(42px,6vw,80px)}.hero-ludico h1{margin-top:20px}
.hero-ludico h1 mark{background:var(--sec);color:var(--onSec);padding:0 .14em;border-radius:.24em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.hl-palco{position:relative;padding:28px}
.hl-blob{aspect-ratio:1/1;border-radius:58% 42% 52% 48%/46% 54% 46% 54%;box-shadow:0 40px 80px -50px var(--sh)}
body.cantos-retos .hl-blob{border-radius:0}
.adesivo{position:absolute;z-index:3;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px 16px;border-radius:18px;border:4px solid #fff;box-shadow:0 14px 26px -14px rgba(0,0,0,.4);font:800 14px/1.15 var(--fb);animation:flutua 6s ease-in-out infinite}
.adesivo small{display:block;font:700 10.5px/1.2 var(--fk);letter-spacing:.1em;text-transform:uppercase;opacity:.85;margin-bottom:4px}
.adesivo.ad1{top:2%;left:-2%;background:var(--acc);color:var(--onAcc);transform:rotate(-8deg);font-size:20px}
.adesivo.ad2{bottom:6%;right:-2%;background:var(--pri);color:var(--onPri);transform:rotate(6deg);animation-delay:-3s}
.adesivo.ad1{animation-name:flutuaA}.adesivo.ad2{animation-name:flutuaB}
@keyframes flutuaA{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(-5deg) translateY(-8px)}}
@keyframes flutuaB{0%,100%{transform:rotate(6deg) translateY(0)}50%{transform:rotate(3deg) translateY(-8px)}}
.hl-rabisco{position:absolute;right:8%;top:-6px;width:90px;color:var(--priTxt);z-index:3}
/* formulário */
.hero-form{padding:clamp(48px,6vw,88px) 0 clamp(64px,8vw,104px);background:linear-gradient(180deg,var(--soft),var(--bg) 85%)}
.hf{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(32px,5vw,64px);align-items:center}
.hero-form{--h1:clamp(38px,5.4vw,70px)}.hero-form h1{margin-top:20px}
.checks{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:14px}
.checks li{display:flex;gap:12px;align-items:flex-start;font-weight:600}
.checks li svg{flex:none;width:26px;height:26px;padding:5px;border-radius:50%;background:var(--pri);color:var(--onPri);margin-top:-1px}
.hf-palco{position:relative;padding:22px 0 22px 22px}
.hf-palco::before{content:"";position:absolute;inset:0 22px 44px 0;border-radius:calc(var(--r) + 12px);background:var(--pri);transform:rotate(-3deg)}
body.cantos-retos .hf-palco::before{border-radius:0}
.hf-card{position:relative;background:var(--bg);border:1px solid var(--line);border-radius:calc(var(--r) + 8px);padding:clamp(24px,3vw,34px);box-shadow:0 40px 80px -40px var(--sh);display:grid;gap:16px}
.hf-card>b{font:var(--dw) 26px/1.12 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase)}
.hf-passos{display:flex;gap:6px}.hf-passos i{flex:1;height:4px;border-radius:4px;background:var(--line)}.hf-passos i:first-child{background:var(--pri)}
.hf-card label{display:grid;gap:7px;font:700 11.5px/1 var(--fk);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.hf-card input{font:400 15px/1.2 var(--fb);padding:14px 15px;border-radius:calc(var(--r)*.6);border:1.5px solid var(--line);background:var(--bg);color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s}
.hf-card input:hover{border-color:color-mix(in srgb,var(--ink) 30%,transparent)}
.hf-card input:focus{border-color:var(--priTxt);box-shadow:0 0 0 4px color-mix(in srgb,var(--pri) 18%,transparent)}
.hf-card small{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);text-align:center;font-size:12.5px}
.hf-card small svg{color:var(--priTxt)}
/* mosaico vitrine */
.hero-mosaico{padding:clamp(24px,3vw,40px) 0 clamp(56px,7vw,88px)}
.hmo{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:minmax(250px,auto) minmax(220px,auto);gap:14px}
.hmo .t{border-radius:calc(var(--r) + 4px);padding:26px;position:relative;overflow:hidden}
body.cantos-retos .hmo .t{border-radius:0}
.t-txt{grid-row:span 2;background:var(--surf);padding:clamp(28px,3.4vw,48px)!important;display:flex;flex-direction:column;justify-content:center}
.hero-mosaico{--h1:clamp(36px,4.6vw,64px)}.hero-mosaico h1{margin-top:18px}
.t-arte{grid-column:span 2;padding:0!important}
.t-arte .etq-w{top:22%;right:6%}
.t-item{background:var(--pri);color:var(--onPri);display:flex;flex-direction:column;justify-content:flex-end;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.t-item:hover{transform:translateY(-4px)}
.t-item.alt{background:var(--ink);color:var(--bg)}
.t-item h3{font-size:22px;max-width:70%}.t-item .p{font:var(--dw) 30px/1 var(--fd);letter-spacing:var(--dtr);margin-top:10px}
.t-item .tag{position:absolute;top:18px;left:18px;background:var(--bg);color:var(--ink)}
.t-mini{position:absolute;right:-18px;top:-18px;width:132px;height:132px;border-radius:50%;overflow:hidden;box-shadow:0 20px 40px -20px rgba(0,0,0,.5);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.t-item:hover .t-mini{transform:rotate(-12deg) scale(1.05)}
/* ============ SEÇÕES ============ */
/* números */
.sec-numeros{background:var(--deep);color:var(--onDeep);padding:calc(var(--sp)*.62) 0;overflow:hidden}
.sec-numeros .padrao{position:absolute;inset:0;opacity:.07;pointer-events:none;color:var(--onDeep)}.sec-numeros .padrao svg{width:100%;height:100%}
.nums{position:relative;display:grid;grid-template-columns:repeat(3,1fr)}
.num{padding:6px clamp(16px,3vw,44px);border-left:1px solid color-mix(in srgb,var(--onDeep) 18%,transparent)}
.num:first-child{border-left:0;padding-left:0}
.num-i{display:block;font:700 11.5px/1 var(--fk);letter-spacing:.16em;opacity:.55;margin-bottom:20px}
.num b{display:block;font:var(--dw) clamp(44px,6vw,80px)/.95 var(--fd);letter-spacing:var(--dtr);color:var(--numCor);font-variant-numeric:lining-nums}
.num span:last-child{display:block;margin-top:14px;font:600 14.5px/1.35 var(--fb);opacity:.8}
/* cardápio */
.menu{display:grid;grid-template-columns:1fr 1.08fr;gap:clamp(28px,4.5vw,64px);align-items:start}
.prato{display:flex;gap:20px;align-items:flex-start}
.prato-dest{flex-direction:column;gap:0}
.prato-foto{width:100%;aspect-ratio:5/4;margin-bottom:24px;box-shadow:0 40px 70px -50px var(--sh)}
.prato-foto .tag{position:absolute;left:18px;top:18px;z-index:2}
.prato-dest .prato-txt{width:100%}.prato-dest h3{font-size:clamp(24px,2.3vw,30px)}.prato-dest .preco{font-size:clamp(24px,2.3vw,30px)}
.menu-lista{display:grid}
.menu-lista .prato{padding:24px 0;border-bottom:1px dashed color-mix(in srgb,var(--ink) 18%,transparent)}
.menu-lista .prato:first-child{padding-top:4px}
.prato-mini{flex:none;width:88px;height:88px;border-radius:50%;overflow:hidden;box-shadow:0 14px 26px -16px var(--sh);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
body.cantos-retos .prato-mini{border-radius:0}
.prato:hover .prato-mini{transform:rotate(-10deg) scale(1.06)}
.prato-txt{flex:1;min-width:0}
.prato-top{display:flex;align-items:baseline;gap:10px}
.prato-top h3{font-size:21px}
.prato-top .dots{flex:1;min-width:14px;border-bottom:2px dotted color-mix(in srgb,var(--ink) 26%,transparent);transform:translateY(-6px)}
.prato p{color:var(--muted);margin-top:8px;font-size:15px}.prato .tag{margin-top:12px}
.menu-nota{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:40px;padding:16px 22px;border:1.5px dashed color-mix(in srgb,var(--priTxt) 50%,transparent);border-radius:var(--r);font-weight:600}
.menu-nota svg{color:var(--priTxt);flex:none}.menu-nota span{color:var(--muted);font-weight:500}
/* serviços */
.servs-wrap{display:grid;grid-template-columns:.92fr 1.08fr;gap:clamp(32px,5vw,72px);align-items:start}
.servs-lado .sec-cab{margin-bottom:30px}
.servs-foto{aspect-ratio:5/4;box-shadow:0 40px 70px -50px var(--sh)}
.servs{display:grid;border-top:1px solid var(--line)}
.serv{position:relative;isolation:isolate;display:grid;grid-template-columns:auto 1fr auto;gap:4px 20px;align-items:center;padding:26px 10px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;transition:padding .4s cubic-bezier(.2,.8,.2,1)}
.serv::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--soft);transform:scaleY(0);transform-origin:bottom;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.sec.alt .serv::before{background:var(--bg)}
.serv:hover::before{transform:scaleY(1)}.serv:hover{padding-left:20px;padding-right:20px}
.serv-n{font:700 12.5px/1 var(--fk);letter-spacing:.08em;color:var(--muted);align-self:start;margin-top:8px}
.serv h3{font-size:clamp(20px,2vw,24px)}.serv p{color:var(--muted);font-size:15px;margin-top:6px}
.serv-dir{display:flex;align-items:center;gap:16px}.serv .preco{font-size:20px}
.serv-seta{width:46px;height:46px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;color:var(--priTxt);transition:all .4s cubic-bezier(.2,.8,.2,1);flex:none}
.serv:hover .serv-seta{background:var(--pri);border-color:var(--pri);color:var(--onPri);transform:rotate(-45deg)}
/* planos */
.planos{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch;padding-top:12px}
.plano{display:flex;flex-direction:column;gap:16px;padding:32px 28px;position:relative;transition:transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s}
.plano:hover{transform:translateY(-4px);box-shadow:0 30px 60px -36px var(--sh)}
.plano-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:26px}
.plano-n{font:700 11.5px/1 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.plano h3{font-size:24px}
.plano-preco{display:flex;align-items:flex-start;gap:4px;font-family:var(--fd);font-weight:var(--dw);letter-spacing:var(--dtr);font-variant-numeric:lining-nums}
.plano-preco small{font-size:17px;margin-top:8px}
.plano-preco b{font-size:clamp(44px,4.6vw,60px);line-height:.9;font-weight:inherit}
.plano-preco .suf{align-self:flex-end;margin:0 0 5px 2px;font-size:15px;opacity:.7;font-family:var(--fb);font-weight:600;letter-spacing:0}
.plano .desc{opacity:.8;font-size:14.5px}
.plano ul{list-style:none;padding:18px 0 0;margin:0;display:grid;gap:11px;font-size:14.5px;border-top:1px solid var(--line)}
.plano li{display:flex;gap:10px;align-items:flex-start}.plano li svg{flex:none;margin-top:3px;color:var(--priTxt)}
.plano .btn{margin-top:auto}
.plano.dest{background:var(--pri)!important;color:var(--onPri);border-color:var(--pri);transform:translateY(-12px);box-shadow:0 44px 70px -40px var(--sh)}
.plano.dest:hover{transform:translateY(-16px)}
.plano.dest .plano-n{color:inherit;opacity:.8}.plano.dest ul{border-color:color-mix(in srgb,var(--onPri) 25%,transparent)}.plano.dest li svg{color:inherit}
body .plano.dest .btn{background:var(--onPri);color:var(--pri);border-color:var(--onPri);box-shadow:none}
/* como funciona */
.passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(24px,3vw,48px);position:relative}
.passos::before{content:"";position:absolute;left:44px;right:calc((100% - 2 * clamp(24px,3vw,48px)) / 3 - 44px);top:44px;border-top:2px dashed color-mix(in srgb,var(--priTxt) 45%,transparent)}
.passo{position:relative}
.passo-n{position:relative;z-index:1;display:grid;place-items:center;width:88px;height:88px;border-radius:50%;background:var(--bg);border:2px solid var(--priTxt);font:var(--dw) 32px/1 var(--fd);letter-spacing:var(--dtr);color:var(--priTxt);transition:all .4s cubic-bezier(.2,.8,.2,1)}
body.cantos-retos .passo-n{border-radius:0}
.sec.alt .passo-n{background:var(--surf)}
.passo:last-child .passo-n{background:var(--pri);color:var(--onPri);border-color:var(--pri)}
.passo:hover .passo-n{background:var(--pri);color:var(--onPri);border-color:var(--pri);transform:rotate(-8deg) scale(1.04)}
.passo:not(:last-child)::after{content:"";position:absolute;top:39px;right:4%;width:10px;height:10px;border-top:2px solid var(--priTxt);border-right:2px solid var(--priTxt);transform:rotate(45deg);opacity:.7}
.passo h3{margin-top:26px;font-size:22px}.passo p{color:var(--muted);margin-top:10px;font-size:15.5px;max-width:30ch}
/* agenda */
.agenda{display:grid;grid-template-columns:.95fr 1.05fr;gap:clamp(32px,5vw,72px);align-items:center}
.ag-lista{list-style:none;padding:0;margin:0 0 32px;display:grid;gap:12px}
.ag-lista li{display:flex;gap:12px;align-items:center;font-weight:600}.ag-lista li svg{color:var(--priTxt);flex:none}
.cal-palco{position:relative;padding:26px 0 34px 26px}
.cal-palco::before{content:"";position:absolute;inset:0 30px 60px 0;border-radius:calc(var(--r) + 12px);background:var(--pri);opacity:.14;transform:rotate(-3deg)}
.cal{position:relative;display:grid;gap:18px;box-shadow:0 40px 80px -44px var(--sh)}
.cal-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.cal-top small{display:block;font:700 11px/1 var(--fk);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.cal-top b{font:700 16px/1.25 var(--fb)}
.cal-mes{font:700 11.5px/1 var(--fk);letter-spacing:.1em;text-transform:uppercase;padding:8px 11px;border-radius:999px;background:var(--soft);color:var(--priTxt);white-space:nowrap}
.dias{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.dia{border:1.5px solid var(--line);border-radius:calc(var(--r)*.7);padding:12px 4px;text-align:center;font:600 12px/1.2 var(--fb);color:var(--muted);transition:border-color .2s,transform .2s}
.dia b{display:block;font:var(--dw) 24px/1.1 var(--fd);color:var(--ink);margin-top:4px}
.dia:hover{border-color:var(--priTxt);transform:translateY(-2px)}
.dia.on{background:var(--pri);border-color:var(--pri);color:var(--onPri)}.dia.on b{color:var(--onPri)}
.horas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.hora{border:1.5px solid var(--line);border-radius:999px;padding:11px 6px;text-align:center;font:700 14px/1 var(--fb);font-variant-numeric:tabular-nums;transition:border-color .2s}
.hora:hover{border-color:var(--priTxt)}
.hora.on{border-color:var(--pri);color:var(--priTxt);background:var(--soft);box-shadow:inset 0 0 0 1px var(--pri)}.hora.x{opacity:.35;text-decoration:line-through}
.cal-toast{position:absolute;z-index:2;right:-6px;bottom:0;display:flex;gap:10px;align-items:center;background:var(--ink);color:var(--bg);padding:13px 18px;border-radius:14px;font:700 13.5px/1.2 var(--fb);box-shadow:0 24px 40px -20px var(--sh);animation:flutua 6s ease-in-out infinite}
.cal-toast svg{color:var(--acc2)}
/* delivery */
.entrega{display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(32px,5vw,64px);align-items:center}
.canais{display:grid;gap:12px}
.canal{display:flex;gap:16px;align-items:center;padding:18px 22px;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s}
.canal:hover{transform:translateX(6px);border-color:var(--priTxt)}
.canal h3{font-size:18px}.canal p{color:var(--muted);font-size:14.5px;margin-top:3px}
.entrega-mapa{aspect-ratio:5/4;box-shadow:0 40px 70px -50px var(--sh)}
.entrega-chip{position:absolute;z-index:2;left:16px;right:16px;bottom:16px;display:flex;gap:12px;align-items:center;background:var(--bg);color:var(--ink);border-radius:calc(var(--r) + 2px);padding:12px 16px;font:700 14px/1.3 var(--fb);box-shadow:0 18px 36px -20px var(--sh)}
.entrega-chip svg{color:var(--priTxt);flex:none}
.faixa-info{margin-top:20px;display:flex;gap:12px;align-items:center;font-weight:600;color:var(--muted);font-size:15px}.faixa-info svg{color:var(--priTxt);flex:none}
/* antes e depois */
.ad{position:relative;aspect-ratio:2.1/1;border-radius:calc(var(--r) + 4px);overflow:hidden;isolation:isolate;cursor:ew-resize;box-shadow:0 40px 80px -56px var(--sh)}
body.cantos-retos .ad{border-radius:0}
.ad-lado{position:absolute;inset:0}.ad-lado svg.sa{width:100%;height:100%}
.ad-antes svg.sa{filter:grayscale(.92) contrast(.88) brightness(.98)}
.ad-depois{clip-path:inset(0 0 0 50%);transition:clip-path 1.1s cubic-bezier(.7,0,.2,1)}
.ad:hover .ad-depois{clip-path:inset(0 0 0 22%)}
.ad-alca{position:absolute;z-index:3;top:0;bottom:0;left:50%;width:3px;margin-left:-1.5px;background:#fff;transition:left 1.1s cubic-bezier(.7,0,.2,1)}
.ad:hover .ad-alca{left:22%}
.ad-alca i{position:absolute;top:50%;left:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.28);animation:alca 2.6s ease-in-out infinite}
@keyframes alca{0%,100%{box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 0 rgba(255,255,255,.7)}50%{box-shadow:0 10px 30px rgba(0,0,0,.28),0 0 0 10px rgba(255,255,255,0)}}
.ad-rot{position:absolute;z-index:2;top:18px;font:800 11px/1 var(--fk);letter-spacing:.18em;text-transform:uppercase;padding:9px 12px;border-radius:999px}
.ad-antes .ad-rot{left:18px;background:rgba(20,20,20,.7);color:#fff}.ad-depois .ad-rot{right:18px;background:var(--pri);color:var(--onPri)}
.ad-leg{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:26px}
.ad-leg p{display:flex;gap:14px;align-items:baseline;font:var(--dw) clamp(19px,2vw,24px)/1.25 var(--fd);letter-spacing:var(--dtr);text-transform:none}
.ad-leg span{flex:none;font:800 11px/1 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.ad-leg p:last-child span{color:var(--priTxt)}
.ad-dica{display:flex;align-items:center;gap:8px;margin-top:14px;font:600 12.5px/1.2 var(--fb);color:var(--muted)}
.so-toque{display:none}@media (hover:none){.so-mouse{display:none}.so-toque{display:inline}}
/* equipe */
.time{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,32px)}
.membro{margin:0}
.membro-foto{aspect-ratio:5/6;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.membro:hover .membro-foto{transform:translateY(-6px)}
.membro figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.membro h3{font-size:22px}.membro p{color:var(--muted);font-size:14px;text-align:right}
/* nossa história */
.sobre{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,6vw,88px);align-items:center}
.sobre p.txt{font-size:clamp(17px,1.45vw,19px);line-height:1.75}
.sobre p.txt::first-letter{float:left;font:var(--dw) 3.9em/.82 var(--fd);color:var(--priTxt);margin:.06em .12em 0 0}
.assin{display:flex;align-items:center;gap:16px;margin-top:30px}
.assin-nome{font-family:var(--fs);font-style:var(--fsi);font-size:36px;line-height:1;color:var(--priTxt)}
.assin small{display:block;font:700 11px/1.3 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);padding-left:16px;border-left:1px solid var(--line)}
.colagem{position:relative;padding:32px 20px 70px 44px}
.col-foto{aspect-ratio:4/3.3;box-shadow:0 50px 80px -56px var(--sh)}
.polaroide{position:absolute;z-index:2;left:0;bottom:0;width:44%;margin:0;background:#fffdf8;padding:10px 10px 42px;box-shadow:0 30px 50px -24px rgba(0,0,0,.45);transform:rotate(-7deg);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.polaroide:hover{transform:rotate(-3deg) scale(1.03)}
.polaroide .moldura{aspect-ratio:1;border-radius:2px!important}
.polaroide figcaption{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-family:var(--fs);font-style:var(--fsi);font-size:19px;line-height:1;color:#3a3530}
.fita{position:absolute;z-index:3;top:18px;left:34%;width:96px;height:28px;background:color-mix(in srgb,var(--acc) 60%,transparent);transform:rotate(-5deg);box-shadow:0 2px 4px rgba(0,0,0,.08)}
.sobre-giro{width:118px;height:118px;right:0;top:0}
/* galeria */
.gal{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:clamp(150px,15vw,196px);gap:14px}
.gal figure{margin:0;position:relative;overflow:hidden;border-radius:var(--r);background:var(--soft);isolation:isolate}
.gal figure svg.sa{position:absolute;inset:0;width:100%;height:100%;transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.gal figure:hover svg.sa{transform:scale(1.06)}
.g1{grid-column:1/3;grid-row:1/3}.g2{grid-column:3/5;grid-row:1}.g3{grid-column:3;grid-row:2}.g4{grid-column:4;grid-row:2/4}.g5{grid-column:1;grid-row:3}.g6{grid-column:2/4;grid-row:3}
.gal figcaption{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;display:flex;pointer-events:none}
.gal-rot{display:inline-flex;align-items:center;gap:8px;max-width:100%;background:var(--bg);color:var(--ink);padding:6px 12px 6px 6px;border-radius:999px;font:700 12.5px/1.2 var(--fb);box-shadow:0 10px 24px -12px rgba(0,0,0,.45);transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.gal figure:hover .gal-rot{transform:translateY(-4px)}
.gal-rot i{flex:none;font:800 10px/1 var(--fk);font-style:normal;letter-spacing:.06em;background:var(--pri);color:var(--onPri);border-radius:999px;padding:5px 7px}
.gal-rot small{font-weight:700;color:var(--priTxt);white-space:nowrap}
.gal-rot span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.cantos-retos .gal-rot,body.cantos-retos .gal-rot i{border-radius:2px}
.g4::after{content:"";position:absolute;z-index:1;inset:35% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.72));pointer-events:none}
.g4 figcaption{flex-direction:column;align-items:flex-start;gap:10px}
.gal-bast{color:#fff;font:italic 500 14px/1.5 var(--fb)}
/* depoimentos */
.depos{display:grid;grid-template-columns:1.2fr 1fr;grid-template-rows:auto auto;gap:18px}
.depo{margin:0;display:flex;flex-direction:column;gap:16px;position:relative;transition:transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s}
.depo:hover{transform:translateY(-4px);box-shadow:0 30px 60px -40px var(--sh)}
.depo-dest{grid-row:1/3;background:var(--pri)!important;color:var(--onPri);border-color:var(--pri)!important;padding:clamp(28px,4vw,52px)!important;justify-content:space-between}
.aspas{font:var(--dw) 120px/.62 var(--fd);color:var(--priTxt);height:52px;user-select:none}
.depo:not(.depo-dest) .aspas{font-size:72px;height:30px}
.depo-dest .aspas{color:var(--onPri);opacity:.5}
.depo blockquote{margin:0;font-size:16.5px;line-height:1.6}
.depo-dest blockquote{font:var(--dw) clamp(22px,2.4vw,32px)/1.3 var(--fd);letter-spacing:var(--dtr);text-transform:none}
.depo figcaption{display:flex;align-items:center;gap:12px;margin-top:auto;font:700 14px/1.2 var(--fb)}
.depo figcaption i{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--soft);color:var(--priTxt);font:800 15px/1 var(--fb);font-style:normal;flex:none}
.depo-dest figcaption i{background:var(--onPri);color:var(--pri)}
.depo figcaption small{display:block;font:600 12px/1.3 var(--fb);opacity:.7;margin-top:3px}
.depo .stars{color:#f5b301;letter-spacing:2px;font-size:14px;margin-left:auto;white-space:nowrap}.depo-dest .stars{color:var(--onPri)}
.depo-nota{display:flex;align-items:center;gap:16px;justify-self:end;margin-bottom:8px}
.depo-nota b{font:var(--dw) clamp(44px,5vw,64px)/1 var(--fd);letter-spacing:var(--dtr);color:var(--priTxt)}
.depo-nota span{display:block;color:#f5b301;letter-spacing:2px}.depo-nota small{display:block;font:600 13px/1.3 var(--fb);color:var(--muted)}
/* clientes */
.logos{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line);border-left:1px solid var(--line)}
.logos span{display:grid;place-items:center;min-height:128px;padding:16px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--muted);opacity:.8;transition:color .35s,opacity .35s,background-color .35s}
.logos span:hover{color:var(--ink);opacity:1;background:var(--soft)}
/* faq */
.faq-wrap{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(32px,5vw,80px);align-items:start}
.faq-ajuda{display:grid;gap:10px;justify-items:start}
.faq-ajuda b{font:var(--dw) 22px/1.2 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase)}
.faq-ajuda p{color:var(--muted);font-size:15px}.faq-ajuda .btn{margin-top:8px}
.faq{border-top:1px solid var(--line)}
.faq details{border-bottom:1px solid var(--line)}
.faq summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;padding:24px 0;font:700 18px/1.35 var(--fb);transition:color .2s}
.faq summary::-webkit-details-marker{display:none}.faq summary:hover{color:var(--priTxt)}
.faq-n{font:700 12px/1 var(--fk);letter-spacing:.08em;color:var(--muted)}
.faq-mais{position:relative;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--line);flex:none;transition:background-color .35s,border-color .35s}
.faq-mais::before,.faq-mais::after{content:"";position:absolute;left:50%;top:50%;width:12px;height:2px;margin:-1px 0 0 -6px;border-radius:2px;background:var(--priTxt);transition:transform .35s cubic-bezier(.2,.8,.2,1),background-color .35s}
.faq-mais::after{transform:rotate(90deg)}
.faq details[open] .faq-mais{background:var(--pri);border-color:var(--pri)}
.faq details[open] .faq-mais::before,.faq details[open] .faq-mais::after{background:var(--onPri)}.faq details[open] .faq-mais::after{transform:rotate(0)}
.faq details p{color:var(--muted);padding:0 54px 26px 40px;margin-top:-4px}
/* localização */
.local{display:grid;grid-template-columns:1.4fr .6fr;gap:18px;align-items:stretch}
.mapa{min-height:380px}
.local-info{display:grid;gap:22px;align-content:start}
.li{display:flex;gap:14px;align-items:flex-start}.li svg{color:var(--priTxt);margin-top:2px;flex:none}
.li small{display:block;font:700 10.5px/1.2 var(--fk);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.li span{font-size:15.5px;font-weight:600}
/* captura */
.sec-lead{background:var(--soft2)}
.cupom{position:relative;display:grid;grid-template-columns:1.12fr .88fr;background:var(--bg);border-radius:calc(var(--r) + 8px);border:1px solid var(--line);box-shadow:0 40px 80px -56px var(--sh)}
body.cantos-retos .cupom{border-radius:0}
.cupom-esq{position:relative;padding:clamp(28px,4vw,56px);border-right:2px dashed var(--line)}
.cupom-esq .sec-cab{margin:0}
.cupom-esq::before,.cupom-esq::after{content:"";position:absolute;right:-16px;width:30px;height:30px;border-radius:50%;background:var(--soft2);border:1px solid var(--line)}
.cupom-esq::before{top:-16px}.cupom-esq::after{bottom:-16px}
.cupom-dir{padding:clamp(28px,4vw,56px);display:flex;flex-direction:column;justify-content:center;gap:12px}
.cupom-ic{width:56px;height:56px;border-radius:calc(var(--r)*.7 + 6px);display:grid;place-items:center;background:var(--pri);color:var(--onPri);margin-bottom:6px}
.form-lead{display:grid;gap:8px;background:var(--surf);padding:7px;border-radius:min(calc(var(--rb) + 6px),30px);border:1.5px solid var(--line);transition:border-color .2s,box-shadow .2s}
.form-lead:focus-within{border-color:var(--priTxt);box-shadow:0 0 0 4px color-mix(in srgb,var(--pri) 16%,transparent)}
.form-lead input{min-width:0;border:0;background:transparent;font:400 15.5px/1 var(--fb);padding:14px 12px;color:var(--ink);outline:none}
.lead-nota{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}.lead-nota svg{color:var(--priTxt)}
/* chamada final */
.cta-final{position:relative;overflow:hidden;background:var(--pri);color:var(--onPri);text-align:center;padding:calc(var(--sp)*1.1) 0}
.cta-final .padrao{position:absolute;inset:0;opacity:.09;color:var(--onPri);pointer-events:none}.cta-final .padrao svg{width:100%;height:100%}
.cta-final .wrap{position:relative;z-index:2}
.cta-final .kicker{color:var(--onPri);opacity:.85}.cta-final .kicker::before{display:none}
.cta-final h2{font-size:clamp(38px,5.6vw,76px);max-width:900px;margin:20px auto 0;color:var(--onPri);line-height:1}
.cta-final p{opacity:.86;margin-top:20px;font-size:18px}
body .cta-final .btn{background:var(--onPri);color:var(--pri);border-color:var(--onPri);box-shadow:none}
.cta-contato{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 22px;margin-top:26px;font:600 14px/1.3 var(--fb);opacity:.85}
.cta-contato span{display:inline-flex;align-items:center;gap:8px}
.cta-obj{position:absolute;z-index:1;width:clamp(64px,8vw,116px);filter:drop-shadow(0 18px 24px rgba(0,0,0,.2));animation:flutua 7s ease-in-out infinite}
.cta-obj.o0{left:6%;top:18%}.cta-obj.o1{right:7%;top:14%;animation-delay:-3s}.cta-obj.o2{right:14%;bottom:12%;animation-delay:-5s;width:clamp(48px,5vw,80px)}
/* rodapé */
.rodape{position:relative;overflow:hidden;background:var(--deep);color:var(--onDeep);padding-top:clamp(56px,7vw,92px);font-size:14.5px}
.rod-top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px 40px;flex-wrap:wrap;padding-bottom:clamp(40px,5vw,60px);border-bottom:1px solid color-mix(in srgb,var(--onDeep) 14%,transparent)}
.rod-slogan{font:var(--dw) clamp(30px,4.4vw,58px)/1.02 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase);max-width:15em;text-wrap:balance}
body .rodape .btn{background:var(--onDeep);color:var(--deep);border-color:var(--onDeep);box-shadow:none}
.rod{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.15fr;gap:40px;padding:48px 0 56px}
.rod .marca{color:var(--onDeep);margin-bottom:18px}
.rod h4{margin:0 0 16px;font:800 11px/1 var(--fk);letter-spacing:.18em;text-transform:uppercase;opacity:.55}
.rod ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.rod p,.rod li{opacity:.86;line-height:1.6}.rod p+p{margin-top:10px}
.rod a{text-decoration:none;transition:opacity .2s}.rod a:hover{opacity:1;text-decoration:underline;text-underline-offset:3px}
.rod-sobre{max-width:32em}
.copy{display:flex;justify-content:space-between;align-items:center;gap:10px 24px;flex-wrap:wrap;padding:22px 0;border-top:1px solid color-mix(in srgb,var(--onDeep) 14%,transparent);font-size:12.5px}
.copy span{opacity:.62}
.copy a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:700;opacity:.85}.copy a:hover{opacity:1}
.copy a svg{transform:rotate(-90deg);transition:transform .3s}.copy a:hover svg{transform:rotate(-90deg) translateX(3px)}
.rod-gigante{font:var(--dw) min(20vw,calc(150vw / var(--len)))/.78 var(--fd);letter-spacing:var(--dtr);text-transform:var(--dcase);white-space:nowrap;text-align:center;color:var(--deep);-webkit-text-stroke:2px color-mix(in srgb,var(--onDeep) 26%,transparent);paint-order:stroke fill;margin:6px 0 -.12em;user-select:none;pointer-events:none;overflow:hidden}
/* texturas */
body.tx-grao::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");mix-blend-mode:multiply}
body.dark.tx-grao::after{mix-blend-mode:screen;opacity:.06}
body.tx-pontos .sec:not(.alt):not(.sec-numeros):not(.sec-lead){background-image:radial-gradient(var(--line) 1.2px,transparent 1.4px);background-size:22px 22px}
body.tx-linhas .sec:not(.alt):not(.sec-numeros):not(.sec-lead){background-image:linear-gradient(var(--grade) 1px,transparent 1px),linear-gradient(90deg,var(--grade) 1px,transparent 1px);background-size:48px 48px;background-position:-1px -1px}
/* bordas entre seções (forma = estilo de ilustração) */
body{--dh:0px;--dm:none}
body.img-organico{--dh:34px;--dm:${MASCARA.onda}}
body.img-adesivo{--dh:22px;--dm:${MASCARA.bolhas}}
body.img-retro{--dh:14px;--dm:${MASCARA.zigue}}
body.img-geometrico{--dh:38px;--dm:${MASCARA.diagonal}}
body.img-flat{--dh:26px;--dm:${MASCARA.curva}}
/* mudança ao vivo e IA escrevendo */
@keyframes mudou{0%{opacity:.35;transform:translateY(6px)}100%{opacity:1;transform:none}}
.mudou{animation:mudou .55s cubic-bezier(.2,.8,.2,1)}
.ia-escrevendo::after{content:"";display:inline-block;width:.07em;height:.9em;background:currentColor;margin-left:.06em;vertical-align:-.08em;animation:pisca .9s steps(1) infinite}
@keyframes pisca{50%{opacity:0}}
/* responsivo */
@media (max-width:1060px){
  .nav-links{display:none}.nav-mob{display:block}.nav-cta{margin-left:auto}
  .he-grid{grid-template-columns:1fr 1.2fr}.he-sum{display:none}
  .rod{grid-template-columns:1fr 1fr}
}
@media (max-width:900px){
  .he-grid{grid-template-columns:1fr 1fr}
  .hs-palco{padding:30px 0 26px 20px}.hk-palco{padding:44px 16px 52px 24px}.hl-palco{padding:22px 10px}
  .hs-giro{width:92px;height:92px}.etq{min-width:132px;padding:28px 14px 14px}.etq-p{font-size:22px}
  .sec-cab.lado{grid-template-columns:1fr}.sec-cab.lado>p,.depo-nota{justify-self:start}
  .hcn>*{max-width:62%}.hcn-arte{width:62%;right:-12%}
  .planos{grid-template-columns:1fr;max-width:480px;margin:0 auto}.plano.dest{transform:none}.plano.dest:hover{transform:translateY(-4px)}
  .passos{grid-template-columns:1fr;gap:28px}.passos::before{left:43px;right:auto;top:10px;bottom:10px;border-top:0;border-left:2px dashed color-mix(in srgb,var(--priTxt) 45%,transparent)}
  .passo{display:grid;grid-template-columns:88px 1fr;column-gap:24px}.passo-n{grid-row:span 2}.passo h3{margin-top:14px}.passo:not(:last-child)::after{display:none}
  .depos{grid-template-columns:1fr}.depo-dest{grid-row:auto}
  .time{grid-template-columns:repeat(3,1fr);gap:14px}
  .logos{display:flex;flex-wrap:wrap;border:0}.logos span{flex:1 1 30%;min-height:100px;border:1px solid var(--line);margin:-1px 0 0 -1px}
  .gal{grid-template-columns:repeat(2,1fr);grid-auto-rows:clamp(130px,30vw,220px)}
  .g1{grid-column:1/3;grid-row:auto/span 2}.g2{grid-column:1/3;grid-row:auto}.g3,.g5{grid-column:auto;grid-row:auto}.g4{grid-column:2;grid-row:auto/span 2}.g6{grid-column:1/3;grid-row:auto}
  .g3{grid-column:1}.g5{grid-column:1}
  .rod{grid-template-columns:1fr 1fr}
  .hmo{grid-template-columns:1fr 1fr}.t-txt{grid-column:span 2;grid-row:auto}.t-arte{grid-column:span 2;min-height:260px}
}
@media (max-width:720px){
  .hero-central .kicker::before{display:none}
  .hs,.hk,.hl,.hf,.agenda,.sobre,.local,.entrega,.menu,.servs-wrap,.faq-wrap,.cupom,.he-grid{grid-template-columns:1fr}
  .hs-palco,.hk-palco,.hl-palco{max-width:520px;width:100%;margin:0 auto}
  .hcn>*{max-width:none}.hcn-arte{width:100%;right:-34%;opacity:.4}.hcn-cred{display:none}
  .cupom-esq{border-right:0;border-bottom:2px dashed var(--line)}.cupom-esq::before{top:auto;bottom:-16px;left:-16px;right:auto}.cupom-esq::after{bottom:-16px;right:-16px}
}
@media (max-width:640px){
  body{font-size:16px}
  .nav-in{height:64px;gap:14px}.nav-cta{display:none}.nav-mob{margin-left:auto}
  .marca-sym{width:34px;height:34px}.marca-txt{font-size:19px}.mt-palavra,.mt-poster{font-size:23px}.mt-script{font-size:27px}
  .marca.longa{flex:0 1 auto}.marca.longa .marca-txt{white-space:normal;font-size:16px;line-height:1.05}
  .acoes .btn{flex:1 1 auto}
  .hs-palco{padding:26px 0 24px 18px}.hs-palco .etq-w{right:-4px;top:14%}.etq{min-width:128px;padding:28px 14px 14px}.etq-p{font-size:22px}
  .chip{padding:10px 14px 10px 10px}.chip b{font-size:19px}.chip-ic{width:36px;height:36px}
  .hk-palco{padding:40px 8px 48px 14px}.flt{max-width:210px;padding:10px 14px 10px 10px}.flt b{font-size:18px}.flt-ic{width:36px;height:36px}.flt-mini{width:42px;height:42px}
  .hm-fatos{grid-template-columns:1fr}.hm-fato{border-left:0;border-top:1px solid var(--line);padding:16px 0}.hm-fato:first-child{border-top:0}
  .nums{grid-template-columns:1fr;gap:26px}.num{border-left:0;padding:0}
  .time{grid-template-columns:1fr;max-width:340px;margin:0 auto}
  .logos span{flex-basis:45%;min-height:84px}
  .ad{aspect-ratio:1.25/1}.ad-leg{grid-template-columns:1fr;gap:12px}
  .gal{grid-auto-rows:clamp(120px,36vw,170px);gap:10px}
  .serv{grid-template-columns:auto 1fr;padding:22px 4px}.serv-dir{grid-column:2;justify-content:space-between;margin-top:10px}
  .faq summary{font-size:16.5px;gap:14px}.faq details p{padding:0 0 22px 34px}
  .rod{grid-template-columns:1fr;gap:30px}.rod-top{flex-direction:column;align-items:flex-start}
  .colagem{padding:26px 8px 60px 20px}.sobre-giro{width:92px;height:92px}
  .cal-palco{padding:18px 0 40px 12px}.dias{gap:6px}.dia{padding:10px 2px}.dia b{font-size:20px}
  .hero-cinema{min-height:0}
  .hmo{grid-template-columns:1fr}.t-txt,.t-arte{grid-column:auto}.t-item{min-height:190px}
  .adesivo.ad1{font-size:17px}.hl-palco{padding:20px 12px}
  .hc-obj{width:58px}.hc-obj.o0{left:auto;right:6%;top:auto;bottom:86px}.hc-obj.o1{left:4%;top:auto;bottom:118px}.hc-obj.o2,.hc-obj.o3{display:none}.hero-central .hc{padding-bottom:150px}
  .cta-obj{width:50px}.cta-obj.o0{left:4%;top:14px}.cta-obj.o1{right:4%;top:20px}.cta-obj.o2{display:none}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

// ------------------------------------------------------------------ variáveis por versão
export function cssVars(ctx) {
  const c = ctx.marca.cores, f = ctx.marca.f, s = ctx.site, M = ctx.marca;
  const r = { retos: '2px', suaves: '14px', redondos: '26px' }[s.cantos] || '14px';
  const rb = { pilula: '999px', suave: '12px', reto: '0px', contorno: r, bloco: '6px', gradiente: '14px' }[s.btn] || '12px';
  const sp = Math.round(116 - s.dens * 11);
  const cine = c.dark ? mix(c.bg, '#000000', 0.25) : mix(c.ink, '#000000', 0.35);
  // cores de destaque sobre fundos escuros fixos (hero cinematográfico e faixa de números): a 1ª da paleta que dá contraste
  const priCine = [c.pri, c.acc, c.sec, c.priTxt].find((x) => contraste(x, cine) >= 4.5) || '#ffffff';
  const numCor = [c.pri, c.acc, c.sec, c.priTxt].find((x) => contraste(x, c.deep) >= 3.2) || c.onDeep;
  const acc2 = contraste(c.acc, c.bg) >= 1.9 ? c.acc : c.priTxt;
  const modo = f.scriptLogo && M.caixa === 'alta' ? 'titulo' : M.caixa;
  const lt = modo === 'alta' ? Math.max(0.06, parseFloat(f.lt) || 0) : parseFloat(f.lt) || 0;
  // letra "de mão" para notas e assinatura: a cursiva da marca quando existe; senão, o display em itálico
  const script = f.scriptLogo ? f.logo : (M.fontesExtras || []).includes('dancing') ? FONTE_MANUSCRITO : null;
  return `:root{--bg:${c.bg};--surf:${c.surf};--ink:${c.ink};--muted:${c.muted};--pri:${c.pri};--sec:${c.sec};--acc:${c.acc};--onPri:${c.onPri};--onSec:${c.onSec};--onAcc:${c.onAcc};--line:${c.line};--soft:${c.soft};--soft2:${c.soft2};--deep:${c.deep};--onDeep:${c.onDeep};--priTxt:${c.priTxt};--secTxt:${c.secTxt};--cine:${cine};--priCine:${priCine};--numCor:${numCor};--acc2:${acc2};`
    + `--sh:${c.dark ? 'rgba(0,0,0,.7)' : 'rgba(20,14,10,.34)'};--grade:${c.dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.055)'};`
    + `--fd:${f.disp};--fb:${f.body};--fl:${f.logo};--fk:${f.mono ? 'ui-monospace,"SF Mono",Menlo,Consolas,monospace' : f.typewriter ? '"American Typewriter","Courier New",monospace' : f.body};--fs:${script || f.disp};--fsi:${script ? 'normal' : 'italic'};--fcap:${/(^|,\s*)serif\s*$/.test(f.disp) ? f.disp : f.body};`
    + `--dw:${f.dw};--lw:${f.lw};--lt:${lt}em;--dtr:${f.tr};--dcase:${f.caixa ? 'uppercase' : 'none'};--r:${r};--rb:${rb};--sp:${sp}px}`;
}

export function classesBody(ctx) {
  const s = ctx.site;
  return [ctx.marca.cores.dark ? 'dark' : 'light', `btn-${s.btn}`, `cantos-${s.cantos}`, `tx-${s.textura}`, `h-${s.hero}`, `img-${s.img}`].join(' ');
}

// ------------------------------------------------------------------ pedaços
const btnPri = (ctx, cls = '') => `<a class="btn ${cls}" href="#contato">${ico(ctx.site.cta.ic, 18)}<span data-campo="cta">${esc(ctx.site.cta.texto)}</span></a>`;
const kicker = (ctx) => `<span class="kicker">${esc(ctx.pack.cat)}${ctx.cidade ? ' · ' + esc(ctx.cidade.nome) : ''}</span>`;
const titulo = (ctx, html) => {
  const n = String(ctx.site.titulo).length, cls = [ctx.ia.titulo ? 'ia' : '', n > 40 ? 't-l' : n > 30 ? 't-m' : ''].filter(Boolean).join(' ');
  return `<h1 data-campo="titulo"${cls ? ` class="${cls}"` : ''}>${html || esc(ctx.site.titulo)}</h1>`;
};
const sub = (ctx) => `<p class="lead" data-campo="subtitulo">${esc(ctx.site.sub)}</p>`;
const curto = (t, max) => { t = String(t || ''); if (t.length <= max) return t; const c = t.slice(0, max); return c.slice(0, c.lastIndexOf(' ') > 20 ? c.lastIndexOf(' ') : max).replace(/[,.;:]$/, '') + '…'; };
const n2 = (i) => String(i).padStart(2, '0');

// o botão secundário nunca repete o principal ("Ver o cardápio" × "Ver cardápio")
const PALAVRAS_VAZIAS = new Set(['ver', 'seu', 'sua', 'seus', 'suas', 'dos', 'das', 'com', 'para', 'pelo', 'pela', 'nos', 'nas', 'mais']);
const palavras = (t) => new Set(semAcento(String(t).toLowerCase()).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !PALAVRAS_VAZIAS.has(w)));
function secundario(ctx) {
  const S = ctx.site.secoes, pri = palavras(ctx.site.cta.texto);
  const op = [];
  // o rótulo escolhido em contexto.mjs leva à seção que ele promete ("Nossa história" → sobre, nunca ao cardápio)
  if (ctx.site.itensSec) op.push([`s-${ctx.site.secundarioAlvo || ctx.site.itensSec}`, ctx.site.secundario]);
  if (S.includes('sobre')) op.push(['s-sobre', 'Nossa história']);
  if (S.includes('como_funciona')) op.push(['s-como_funciona', 'Como funciona']);
  if (S.includes('galeria')) op.push(['s-galeria', 'Ver a galeria']);
  if (S.includes('depoimentos')) op.push(['s-depoimentos', 'Ver depoimentos']);
  if (S.includes('localizacao')) op.push(['s-localizacao', 'Onde estamos']);
  op.push([`s-${S[0] || 'hero'}`, 'Saiba mais']);
  return op.find(([, t]) => ![...palavras(t)].some((w) => pri.has(w))) || op[op.length - 1];
}
const btnSec = (ctx) => { const [href, t] = secundario(ctx); return `<a class="btn fantasma" href="#${href}">${esc(t)}</a>`; };

// nota média: só a do pacote do segmento (se ele não tiver, o 1º número do pacote)
function notaPack(ctx) { const e = ctx.pack.nums.find((x) => /★/.test(x[0])); return e ? { v: e[0].replace('★', '').trim(), r: e[1], estrela: true } : null; }
const provaSocial = (ctx) => notaPack(ctx) || { v: ctx.pack.nums[0][0], r: ctx.pack.nums[0][1], estrela: false };

function selo(ctx, id) {
  const p = ctx.pack;
  if (id === 'nota') { const n = provaSocial(ctx); return `<span class="selo">${n.estrela ? ESTRELA_CHEIA(15) : ico('grafico', 16)}<b>${esc(n.v)}</b> ${esc(n.r)}</span>`; }
  if (id === 'prazo') return `<span class="selo">${ico('raio', 16)}${esc(curto(cap(p.ang.rapidez), 48))}</span>`;
  if (id === 'tradicao') return `<span class="selo">${ico('coroa', 16)}${ctx.mat >= 2 ? `Desde <b>${ctx.ano}</b>` : ctx.mat === 1 ? `Novidade de <b>${ctx.agora.getFullYear()}</b>` : '<b>Inauguração</b> em breve'}</span>`;
  return `<span class="selo">${ico('escudo', 16)}<b>Satisfação</b> garantida</span>`;
}
const selos = (ctx, cls = '') => `<div class="selos ${cls}">${ctx.site.selos.map((id) => selo(ctx, id)).join('')}</div>`;

// a marca em HTML (o nome nunca é cortado: o navegador mede com a fonte já carregada)
function marcaHTML(ctx, { variante = 'cor', classe = 'msym' } = {}) {
  const M = ctx.marca, f = M.f, est = M.estilo || 'classico';
  const modo = f.scriptLogo && M.caixa === 'alta' ? 'titulo' : M.caixa;
  if (est === 'palavra') return `<span class="marca-txt mt-palavra">${esc(aplicarCaixa(ctx.nome, modo))}<i></i></span>`;
  if (est === 'poster') return `<span class="marca-txt mt-poster">${esc(ctx.nome.toUpperCase())}</span>`;
  if (est === 'manuscrito') return `<span class="marca-txt mt-script" style="font-family:${esc(f.scriptLogo ? f.logo : FONTE_MANUSCRITO)};font-weight:700">${esc(aplicarCaixa(ctx.nome, 'titulo'))}<svg class="mt-swash" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M1 6C28 10 58 0 99 4"/></svg></span>`;
  return `${simboloSVG(ctx, { variante, tamanho: 40, classe: `marca-sym ${classe}` })}<span class="marca-txt">${esc(aplicarCaixa(ctx.nome, modo))}</span>`;
}

const ROTULO = { planos: 'Planos', como_funciona: 'Como funciona', agendamento: 'Agenda', delivery: 'Delivery', depoimentos: 'Depoimentos', antes_depois: 'Antes e depois', equipe: 'Equipe', sobre: 'Nossa história', galeria: 'Galeria', numeros: 'Números', clientes: 'Clientes', faq: 'Dúvidas', localizacao: 'Onde estamos', lead: 'Fique por dentro' };
const rotuloSec = (ctx, s) => (s === 'cardapio' || s === 'servicos' ? ctx.pack.itensTitulo : ROTULO[s] || s);
// numeração das seções (a faixa de números não conta): usada nos cabeçalhos, no sumário e no rodapé
function numeracao(ctx) { const m = {}; let k = 0; for (const s of ctx.site.secoes) if (s !== 'numeros') m[s] = n2(++k); return m; }

// texto do selo giratório: nome · cidade · desde (cabe no círculo)
function textoGiro(ctx) {
  const partes = [ctx.nome, ctx.cidade ? ctx.cidade.nome : null, ctx.mat >= 2 ? `desde ${ctx.ano}` : null, ctx.pack.label];
  let t = '';
  for (const p of partes) { if (!p || t.toLowerCase().includes(p.toLowerCase())) continue; const nv = t ? `${t} · ${p}` : p; if (nv.length > 38) continue; t = nv; }
  return `${t || ctx.pack.label} · `;
}
const giro = (ctx, id, cls, tam = 124) => `<div class="giro ${cls}">${seloGiratorio(textoGiro(ctx), { id, tam, cor: 'currentColor', centro: `<g transform="translate(37 37) scale(1.08)" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ctx.icone.svg}</g>` })}</div>`;
const etiqueta = (it, rot, cls = '') => `<div class="etq-w ${cls}"><div class="etq"><small>${esc(rot)}</small><b>${esc(it.nome)}</b><span class="etq-p">${esc(it.preco)}</span></div></div>`;
function chipNota(ctx, cls = '') {
  const n = provaSocial(ctx);
  return `<div class="chip ${cls}"><span class="chip-ic">${n.estrela ? ESTRELA_CHEIA(20) : svgIcone(ctx.icone.svg, { size: 20, sw: 2 })}</span><span><b>${esc(n.v)}</b><small>${esc(n.r)}</small></span></div>`;
}
const avatares = (ctx) => `<div class="avs">${ctx.pack.depo.map(([, a]) => `<i>${esc(a.charAt(0))}</i>`).join('')}</div>`;
// quantas palavras do fim do título ganham ênfase (itálico no editorial, marca-texto no lúdico)
const cauda = (pal) => (pal.length > 4 && pal[pal.length - 2].replace(/[^\p{L}]/gu, '').length <= 2 ? 3 : 2);
const RABISCO = '<svg viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10c26-6 58 0 78 18 8 7 13 15 16 24"/><path d="M88 44l10 9 4-13"/></svg>';

// ------------------------------------------------------------------ TOPOS
function hero(ctx) {
  const s = ctx.site, c = ctx.marca.cores;
  switch (s.hero) {
    case 'central': {
      const objs = [ctx.icone, ...(ctx.apoio.length ? ctx.apoio : [ctx.icone])];
      const pos = [[-14, 'claro'], [12, 'sec'], [10, 'sec'], [-10, 'claro']];
      const flut = pos.map(([r, papel], i) => `<div class="hc-obj o${i}">${objetoSolto(ctx, objs[i % objs.length], { papel, id: 'hc' + i, rot: r })}</div>`).join('');
      const fita = ctx.itens.map((it) => `<span>${esc(it.nome)}<b>${esc(it.preco)}</b></span><i>${svgIcone(ctx.icone.svg, { size: 20, sw: 1.8 })}</i>`).join('');
      return `<section class="hero hero-central" id="s-hero"><div class="hc-fundo" aria-hidden="true">${flut}</div><div class="wrap hc">${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<div class="acoes center">${btnPri(ctx)}${btnSec(ctx)}</div>${selos(ctx, 'center')}</div><div class="letreiro" aria-hidden="true"><div class="letreiro-in">${fita}${fita}</div></div></section>`;
    }
    case 'cinema': {
      // com um ajuste de fundo (página ou topo), a cena é redesenhada na cor nova (clara ou escura)
      const nova = corDoTopo(ctx);
      const cine = nova || (c.dark ? mix(c.bg, '#000000', 0.25) : mix(c.ink, '#000000', 0.35));
      const esc0 = !nova || lum(cine) < 0.2;
      const tinta = esc0 ? '#ffffff' : tintaPara([cine], [c.ink, c.bg]);
      const priC = [c.pri, c.acc, c.sec, c.priTxt].find((x) => contraste(x, cine) >= 4.5) || (nova ? tinta : '#ffffff');
      const cc = esc0
        ? { ...c, bg: cine, surf: mix(cine, '#ffffff', 0.07), ink: '#ffffff', muted: '#b9b4ad', dark: true, priTxt: priC, secTxt: priC, line: 'rgba(255,255,255,.14)', sec: mix(c.sec, cine, 0.72), acc: mix(c.acc, cine, 0.35), onSec: '#ffffff' }
        : { ...c, bg: cine, surf: mix(cine, tinta, 0.06), ink: tinta, muted: mix(tinta, cine, 0.3), dark: false, priTxt: priC, secTxt: priC, line: rgba(tinta, 0.14), sec: mix(c.sec, cine, 0.5), acc: mix(c.acc, cine, 0.25), onSec: tinta };
      const ctxC = { ...ctx, marca: { ...ctx.marca, cores: cc } };
      return `<section class="hero hero-cinema" id="s-hero"><div class="hcn-nome" aria-hidden="true" style="--len:${Math.max(6, ctx.nome.length)}">${esc(ctx.nome)}</div><div class="hcn-arte">${cena('produto', ctxC, { id: 'cn', holofote: true })}</div><div class="hcn-luz"></div><div class="hcn-veu"></div><div class="wrap hcn">${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<div class="acoes">${btnPri(ctx)}${btnSec(ctx)}</div>${selos(ctx)}</div><div class="hcn-cred" aria-hidden="true">${esc(textoGiro(ctx).replace(/ · $/, ''))}</div></section>`;
    }
    case 'editorial': {
      const pal = esc(ctx.site.titulo).split(' '), k = cauda(pal);
      const h = ctx.ia.titulo || pal.length < 4 ? '' : `${pal.slice(0, -k).join(' ')} <em>${pal.slice(-k).join(' ')}</em>`;
      const num = numeracao(ctx);
      const sum = ctx.site.secoes.filter((x) => x !== 'numeros').slice(0, 5).map((x) => `<li><a href="#s-${x}"><span>${num[x]}</span>${esc(rotuloSec(ctx, x))}</a></li>`).join('');
      return `<section class="hero hero-editorial" id="s-hero"><div class="wrap"><div class="he-top">${kicker(ctx)}<span class="he-num">Nº 01 · ${ctx.agora.getFullYear()}</span></div>${titulo(ctx, h)}<div class="he-grid"><div>${sub(ctx)}<div class="acoes">${btnPri(ctx)}${btnSec(ctx)}</div>${selos(ctx)}</div><figure class="he-fig"><div class="moldura m-borda">${cena('fachada', ctx, { id: 'he' })}</div><figcaption><span>Fig. 01</span>${esc(cap(ctx.pack.ang[ctx.dif]))}.</figcaption></figure><nav class="he-sum" aria-label="Nesta página"><b>Nesta página</b><ol>${sum}</ol></nav></div></div></section>`;
    }
    case 'cartoes': {
      const it = ctx.itens[2], nt = notaPack(ctx), prova = nt || { v: ctx.pack.nums[1][0], r: ctx.pack.nums[1][1] };
      const n3 = ctx.pack.nums[2] || ctx.pack.nums[0], n0 = ctx.pack.nums[0];
      return `<section class="hero hero-cartoes" id="s-hero"><div class="wrap hk"><div>${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<div class="acoes">${btnPri(ctx)}${btnSec(ctx)}</div><div class="prova">${avatares(ctx)}<span><b>${esc(n0[0])}</b> ${esc(n0[1])}</span></div></div><div class="hk-palco"><div class="moldura hk-foto">${cena('interior', ctx, { id: 'hk' })}</div><div class="flt f1"><span class="flt-ic">${nt ? ESTRELA_CHEIA(20) : svgIcone(ctx.icone.svg, { size: 20, sw: 2 })}</span><div><b>${esc(prova.v)}</b><small>${esc(prova.r)}</small></div></div><div class="flt f2"><span class="flt-ic">${ico('raio', 20)}</span><div><b>${esc(n3[0])}</b><small>${esc(n3[1])}</small></div></div><div class="flt f3"><span class="flt-mini">${miniatura(ctx, 2, 'hkm')}</span><div><b>${esc(it.preco || 'Sob consulta')}</b><small>${esc(it.nome)}</small></div></div></div></div></section>`;
    }
    case 'minimal':
      return `<section class="hero hero-minimal" id="s-hero"><div class="hm-linhas" aria-hidden="true"><i></i><i></i></div><div class="wrap hm"><div class="hm-sym">${seloGiratorio(textoGiro(ctx), { id: 'gHm', tam: 132 })}${simboloSVG(ctx, { tamanho: 60, classe: 'hmsym' })}</div>${titulo(ctx)}${sub(ctx)}<div class="acoes center">${btnPri(ctx)}</div>${ctx.site.secoes.includes('numeros') ? `<div class="hm-fatos hm-selos">${selos(ctx, 'center')}</div>` : `<div class="hm-fatos">${ctx.pack.nums.map(([v, r]) => `<div class="hm-fato"><b>${esc(v)}</b><span>${esc(r)}</span></div>`).join('')}</div>`}</div></section>`;
    case 'ludico': {
      const t = esc(ctx.site.titulo), pal = t.split(' '), k = cauda(pal);
      const destaque = ctx.ia.titulo ? t : pal.length > k ? pal.slice(0, -k).join(' ') + ' <mark>' + pal.slice(-k).join(' ') + '</mark>' : t;
      const nt = provaSocial(ctx), it = ctx.itens[0];
      const a1 = ctx.oferta ? `<small>${esc(ctx.oferta.id === 'cupom10' ? 'Cupom' : 'Oferta')}</small>${esc(ctx.oferta.curta)}` : `<small>${esc(nt.r)}</small>${nt.estrela ? '★ ' : ''}${esc(nt.v)}`;
      return `<section class="hero hero-ludico" id="s-hero"><div class="bolhas" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div><div class="wrap hl"><div>${kicker(ctx)}${titulo(ctx, destaque)}${sub(ctx)}<div class="acoes">${btnPri(ctx)}${btnSec(ctx)}</div>${selos(ctx)}</div><div class="hl-palco"><div class="moldura hl-blob">${cena('produto', ctx, { id: 'hl' })}</div><span class="adesivo ad1">${a1}</span><span class="adesivo ad2"><small>${esc(curto(it.nome, 26))}</small>${esc(it.preco)}</span><span class="hl-rabisco">${RABISCO}</span></div></div></section>`;
    }
    case 'formulario': {
      const angs = ['qualidade', 'rapidez', 'confianca'].filter((a) => a !== ctx.dif).slice(0, 2);
      const campo3 = ctx.pub.id === 'empresas' ? ['Empresa', 'Nome da empresa'] : ['Mensagem', 'Conte rapidinho o que você precisa'];
      const n = provaSocial(ctx);
      return `<section class="hero hero-form" id="s-hero"><div class="wrap hf"><div>${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<ul class="checks">${[ctx.dif, ...angs].map((a) => `<li>${ico('check', 16, 3)}<span>${esc(cap(ctx.pack.ang[a]))}</span></li>`).join('')}</ul><div class="prova">${avatares(ctx)}<span>${n.estrela ? '<span class="est">★★★★★</span>' : ''}<b>${esc(n.v)}</b> ${esc(n.r)}</span></div></div><div class="hf-palco"><div class="hf-card" id="contato"><div class="hf-passos" aria-hidden="true"><i></i><i></i><i></i></div><b>${esc(ctx.site.cta.texto)}</b><label>Nome<input placeholder="Seu nome"></label><label>WhatsApp<input placeholder="${esc(ctx.telefone.replace('99999-0000', '9 0000-0000'))}"></label><label>${campo3[0]}<input placeholder="${campo3[1]}"></label><button class="btn" type="button">${esc(ctx.site.cta.texto)} ${SETA()}</button><small>${ico('relogio', 14)}Resposta em até 24 horas · sem compromisso</small></div></div></div></section>`;
    }
    case 'mosaico': {
      const [i0, i1] = ctx.itens;
      return `<section class="hero hero-mosaico" id="s-hero"><div class="wrap hmo"><div class="t t-txt">${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<div class="acoes">${btnPri(ctx)}</div></div><div class="t t-arte moldura">${cena('vitrine', ctx, { id: 'mo' })}${chipNota(ctx)}</div><div class="t t-item"><div class="t-mini">${miniatura(ctx, 0, 'mo')}</div><span class="tag">Mais pedido</span><h3>${esc(i0.nome)}</h3><div class="p">${esc(i0.preco)}</div></div><div class="t t-item alt"><div class="t-mini">${miniatura(ctx, 1, 'mo')}</div><span class="tag">Premium</span><h3>${esc(i1.nome)}</h3><div class="p">${esc(i1.preco)}</div></div></div></section>`;
    }
    default:
      return `<section class="hero hero-split" id="s-hero"><div class="wrap hs"><div>${kicker(ctx)}${titulo(ctx)}${sub(ctx)}<div class="acoes">${btnPri(ctx)}${btnSec(ctx)}</div>${selos(ctx)}</div><div class="palco hs-palco"><div class="moldura m-arco hs-foto">${cena('produto', ctx, { id: 'hs' })}</div>${etiqueta(ctx.itens[0], 'Mais pedido')}${chipNota(ctx)}${giro(ctx, 'gHs', 'hs-giro')}</div></div></section>`;
  }
}

// ------------------------------------------------------------------ SEÇÕES
const cab = (num, eyebrow, h2, p = '', { center = false, lado = false, extra = '' } = {}) =>
  `<div class="sec-cab${center ? ' center' : ''}${lado ? ' lado' : ''}"><div class="sec-cab-t"><div class="sec-meta"><span class="sec-n">${num}</span><i class="fio"></i><span class="eyebrow">${esc(eyebrow)}</span></div><h2>${esc(h2)}</h2></div>${p ? `<p>${esc(p)}</p>` : ''}${extra}</div>`;
const PAPEL_TAG = ['Mais pedido', 'Premium', 'Mais acessível', 'Novidade'];
function precoPartes(p) { const m = /^(R\$)\s?([\d.,]+)(.*)$/.exec(String(p || '')); return m ? { moeda: m[1], valor: m[2], suf: m[3].trim() } : null; }

const SECOES = {
  numeros: (ctx) => `<div class="padrao" aria-hidden="true">${padrao(ctx.icone, 'currentColor', { tam: 30, gap: 34, op: 1, id: 'nu' })}</div><div class="wrap nums">${ctx.pack.nums.map(([v, r], i) => `<div class="num"><span class="num-i">${n2(i + 1)} / 03</span><b>${esc(v)}</b><span>${esc(r)}</span></div>`).join('')}</div>`,
  cardapio: (ctx, num) => {
    const [d, ...resto] = ctx.itens;
    const txt = (it) => `<div class="prato-txt"><div class="prato-top"><h3>${esc(it.nome)}</h3><span class="dots"></span><b class="preco">${esc(it.preco)}</b></div><p>${esc(it.desc)}</p>${it.i === 3 ? `<span class="tag acc">${PAPEL_TAG[3]}</span>` : ''}</div>`;
    const nota = ctx.oferta ? `<div class="menu-nota">${svgIcone(ICONE.presente.svg, { size: 22, sw: 1.8 })}<b>${esc(cap(ctx.oferta.frase))}</b>${ctx.oferta.id === 'cupom10' ? '<span>· use o cupom BEMVINDO</span>' : ''}</div>` : '';
    return `<div class="wrap">${cab(num, 'Escolha o seu', ctx.pack.itensTitulo, cap(ctx.pack.ang.qualidade) + '.', { lado: true })}<div class="menu"><article class="prato prato-dest"><div class="moldura m-borda prato-foto">${cena('produto', ctx, { id: 'cd', i: 1 })}<span class="tag">${PAPEL_TAG[0]}</span></div>${txt(d)}</article><div class="menu-lista">${resto.map((it) => `<article class="prato"><div class="prato-mini">${miniatura(ctx, it.i, 'cm')}</div>${txt(it)}</article>`).join('')}</div></div>${nota}</div>`;
  },
  servicos: (ctx, num) => `<div class="wrap servs-wrap"><div class="servs-lado">${cab(num, 'O que fazemos', ctx.pack.itensTitulo, cap(ctx.pack.ang.qualidade) + '.')}<div class="moldura m-borda servs-foto">${cena('interior', ctx, { id: 'sv' })}</div></div><div class="servs">${ctx.itens.map((it, i) => `<a class="serv" href="#contato"><span class="serv-n">${n2(i + 1)}</span><div><h3>${esc(it.nome)}</h3><p>${esc(it.desc)}</p></div><div class="serv-dir"><b class="preco">${esc(it.preco)}</b><span class="serv-seta">${SETA()}</span></div></a>`).join('')}</div></div>`,
  planos: (ctx, num) => {
    const ordem = [ctx.itens[2], ctx.itens[0], ctx.itens[1]];
    const angs = ['qualidade', 'conveniencia', 'confianca', 'exclusividade', 'resultado'];
    const preco = (p) => { const x = precoPartes(p); return x ? `<div class="plano-preco"><small>${x.moeda}</small><b>${esc(x.valor)}</b>${x.suf ? `<span class="suf">${esc(x.suf)}</span>` : ''}</div>` : `<div class="plano-preco"><b style="font-size:34px">${esc(p)}</b></div>`; };
    return `<div class="wrap">${cab(num, 'Planos', 'Escolha o seu plano', '', { center: true })}<div class="planos">${ordem.map((it, k) => `<article class="card plano${k === 1 ? ' dest' : ''}"><div class="plano-top"><span class="plano-n">Plano ${n2(k + 1)}</span>${k === 1 ? '<span class="tag sec2">Mais escolhido</span>' : ''}</div><h3>${esc(it.nome)}</h3>${preco(it.preco)}<p class="desc">${esc(it.desc)}</p><ul>${angs.slice(0, 2 + k).map((a) => `<li>${ico('check', 16, 2.6)}<span>${esc(cap(ctx.pack.ang[a]))}</span></li>`).join('')}</ul><a class="btn ${k === 1 ? '' : 'fantasma'}" href="#contato">Quero este ${SETA()}</a></article>`).join('')}</div></div>`;
  },
  como_funciona: (ctx, num) => `<div class="wrap">${cab(num, 'Como funciona', 'Simples assim: 3 passos')}<ol class="passos">${ctx.pack.passos.map(([t, d], i) => `<li class="passo"><div class="passo-n">${n2(i + 1)}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol></div>`,
  agendamento: (ctx, num) => {
    const dias = [];
    const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    for (let k = 1; dias.length < 5; k++) { const d = new Date(ctx.agora.getTime() + k * 86400e3); if (d.getDay() !== 0) dias.push(d); }
    const horas = ['09:00', '10:30', '13:00', '14:30', '16:00', '17:30'];
    const mes = dias[1].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return `<div class="wrap agenda"><div>${cab(num, 'Agenda online', 'Escolha o melhor horário')}<ul class="ag-lista"><li>${ico('relogio', 20)}${esc(ctx.pack.horario)}</li><li>${ico('whats', 20)}Confirmação na hora pelo WhatsApp</li></ul><a class="btn" href="#contato">${ico('calendario', 18)}<span>${esc(ctx.site.cta.texto)}</span></a></div><div class="cal-palco"><div class="card cal"><div class="cal-top"><div><small>Agendar</small><b>${esc(ctx.itens[0].nome)}</b></div><span class="cal-mes">${esc(mes)}</span></div><div class="dias">${dias.map((d, i) => `<div class="dia${i === 1 ? ' on' : ''}">${nomes[d.getDay()]}<b>${d.getDate()}</b></div>`).join('')}</div><div class="horas">${horas.map((h, i) => `<div class="hora${i === 3 ? ' on' : ''}${i === 1 || i === 4 ? ' x' : ''}">${h}</div>`).join('')}</div><a class="btn" href="#contato">Confirmar horário ${SETA()}</a></div><div class="cal-toast">${ico('check', 18, 2.6)}${nomes[dias[1].getDay()]}, ${dias[1].getDate()} · 14:30 reservado</div></div></div>`;
  },
  delivery: (ctx, num) => `<div class="wrap entrega"><div>${cab(num, 'Delivery', 'Peça de onde estiver', cap(ctx.pack.ang.rapidez) + '.')}<div class="canais"><div class="card canal"><div class="icone-bola">${ico('whats', 26, 1.8)}</div><div><h3>Pelo WhatsApp</h3><p>Mande “oi” e peça em dois minutos.</p></div></div><div class="card canal"><div class="icone-bola">${ico('moto', 26, 1.8)}</div><div><h3>Apps de delivery</h3><p>Estamos nos principais aplicativos.</p></div></div><div class="card canal"><div class="icone-bola">${ico('pin', 26, 1.8)}</div><div><h3>Retire no balcão</h3><p>Peça antes e pegue sem fila.</p></div></div></div><div class="faixa-info">${ico('relogio', 20)}<span>${esc(ctx.pack.horario)}${ctx.cidade ? ` · entregamos em ${esc(ctx.cidade.nome)} e região` : ''}</span></div></div><div class="moldura m-borda entrega-mapa">${cena('mapa', ctx, { id: 'dl', rota: true })}<div class="entrega-chip">${ico('moto', 22, 1.8)}<span>${esc(cap(ctx.pack.ang.rapidez))}</span></div></div></div>`,
  antes_depois: (ctx, num) => `<div class="wrap">${cab(num, 'Resultados', 'A diferença que você vê')}<div class="ad"><div class="ad-lado ad-antes">${cena('produto', ctx, { id: 'ada', estado: 'antes', W: 840, H: 400 })}<span class="ad-rot">Antes</span></div><div class="ad-lado ad-depois">${cena('produto', ctx, { id: 'add', estado: 'depois', W: 840, H: 400 })}<span class="ad-rot">Depois</span></div><div class="ad-alca" aria-hidden="true"><i>${svgIcone('<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>', { size: 22, sw: 2.2 })}</i></div></div><div class="ad-leg"><p><span>Antes</span>${esc(ctx.pack.ad[0])}</p><p><span>Depois</span>${esc(ctx.pack.ad[1])}</p></div><div class="ad-dica">${svgIcone('<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>', { size: 16, sw: 2 })}<span class="so-mouse">Passe o mouse para comparar</span><span class="so-toque">Toque na imagem para comparar</span></div></div>`,
  sobre: (ctx, num) => {
    const [pn, pc] = ctx.pack.equipe[0];
    return `<div class="wrap sobre"><div>${cab(num, 'Nossa história', ctx.mat >= 3 ? `Desde ${ctx.ano}, do mesmo jeito` : 'Feito com propósito')}<p class="txt" data-campo="sobre">${esc(ctx.site.sobre)}</p><div class="assin"><span class="assin-nome">${esc(pn)}</span><small>${esc(pc)}</small></div></div><div class="colagem"><span class="fita" aria-hidden="true"></span><div class="moldura col-foto">${cena('fachada', ctx, { id: 'so' })}</div><figure class="polaroide"><div class="moldura">${cena('interior', ctx, { id: 'sp' })}</div><figcaption>${esc(ctx.cidade ? `${ctx.cidade.nome}, ${ctx.ano}` : String(ctx.ano))}</figcaption></figure>${giro(ctx, 'gSo', 'sobre-giro', 118)}</div></div>`;
  },
  galeria: (ctx, num) => {
    const it = ctx.itens;
    const q = (cls, svg, i, rot, extra = '') => `<figure class="${cls}">${svg}<figcaption><span class="gal-rot"><i>${n2(i)}</i><span>${esc(rot)}</span>${extra}</span></figcaption></figure>`;
    return `<div class="wrap">${cab(num, 'Galeria', 'Por dentro do nosso dia a dia', '', { lado: true })}<div class="gal">`
      + q('g1', cena('produto', ctx, { id: 'ga1', i: 2 }), 1, it[0].nome, `<small>${esc(it[0].preco)}</small>`)
      + q('g2', cena('fachada', ctx, { id: 'ga2' }), 2, ctx.nome)
      + q('g3', cena('detalhe', ctx, { id: 'ga3' }), 3, it[1].nome)
      + `<figure class="g4">${cena('bancada', ctx, { id: 'ga4' })}<figcaption><span class="gal-rot"><i>04</i><span>Bastidores</span></span><span class="gal-bast">${esc(ctx.pack.bastidor)}</span></figcaption></figure>`
      + q('g5', cena('interior', ctx, { id: 'ga5' }), 5, 'Ambiente')
      + q('g6', cena('vitrine', ctx, { id: 'ga6' }), 6, it[3].nome, `<small>${esc(it[3].preco)}</small>`)
      + '</div></div>';
  },
  equipe: (ctx, num) => `<div class="wrap">${cab(num, 'Equipe', 'Quem faz acontecer', '', { center: true })}<div class="time">${ctx.pack.equipe.map(([n, papel], i) => `<figure class="membro"><div class="moldura m-arco membro-foto">${cena('retrato', ctx, { id: 'eq' + i, i, nome: n })}</div><figcaption><h3>${esc(n)}</h3><p>${esc(papel)}</p></figcaption></figure>`).join('')}</div></div>`,
  depoimentos: (ctx, num) => {
    const nt = notaPack(ctx);
    const extra = nt ? `<div class="depo-nota"><b>${esc(nt.v)}</b><div><span>${ESTRELAS}</span><small>${esc(nt.r)}</small></div></div>` : '';
    return `<div class="wrap">${cab(num, 'Quem conhece, recomenda', 'O que dizem sobre nós', '', { lado: true, extra })}<div class="depos">${ctx.pack.depo.map(([t, a], i) => `<figure class="card depo${i === 0 ? ' depo-dest' : ''}"><div class="aspas" aria-hidden="true">“</div><blockquote>${esc(t)}</blockquote><figcaption><i>${esc(a.charAt(0))}</i><span>${esc(a)}</span><span class="stars" aria-label="5 estrelas">${ESTRELAS}</span></figcaption></figure>`).join('')}</div></div>`;
  },
  clientes: (ctx, num) => `<div class="wrap">${cab(num, 'Quem confia', 'Empresas que confiam no nosso trabalho', '', { center: true })}<div class="logos"><span style="font:800 24px/1 Futura,'Century Gothic',sans-serif;letter-spacing:.22em">ÍNDIGO</span><span style="font:italic 700 26px/1 Georgia,serif">Vértice</span><span style="font:600 28px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:-.04em">alba.</span><span style="font:700 20px/1 Rockwell,'Courier New',serif;letter-spacing:.14em">GRUPO SOL</span><span style="font:300 26px/1 'Avenir Next','Segoe UI',sans-serif">órbita</span></div></div>`,
  faq: (ctx, num) => `<div class="wrap faq-wrap"><div>${cab(num, 'Dúvidas', 'Perguntas frequentes')}<div class="faq-ajuda"><b>Ainda com dúvida?</b><p>Fale com a gente: ${esc(ctx.telefone)}</p><a class="btn btn-sm fantasma" href="#contato">${ico('whats', 17)}Chamar no WhatsApp</a></div></div><div class="faq">${ctx.pack.faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary><span class="faq-n">${n2(i + 1)}</span><span>${esc(q)}</span><span class="faq-mais" aria-hidden="true"></span></summary><p>${esc(a)}</p></details>`).join('')}</div></div>`,
  localizacao: (ctx, num) => `<div class="wrap">${cab(num, 'Visite a gente', 'Onde estamos')}<div class="local"><div class="moldura mapa">${cena('mapa', ctx, { id: 'lc' })}</div><div class="card local-info"><div class="li">${ico('pin', 22)}<div><small>Endereço</small><span>${esc(ctx.endereco)}</span></div></div><div class="li">${ico('relogio', 22)}<div><small>Horário</small><span>${esc(ctx.pack.horario)}</span></div></div><div class="li">${ico('whats', 22)}<div><small>WhatsApp</small><span>${esc(ctx.telefone)}</span></div></div><a class="btn" href="#contato">${ico('pin', 18)} Como chegar</a></div></div></div>`,
  lead: (ctx, num) => `<div class="wrap"><div class="cupom"><div class="cupom-esq">${cab(num, 'Fique por dentro', ctx.pack.material)}</div><div class="cupom-dir"><div class="cupom-ic">${svgIcone(ICONE.presente.svg, { size: 26, sw: 1.8 })}</div><div class="form-lead"><input placeholder="Seu melhor e-mail ou WhatsApp" aria-label="Seu e-mail ou WhatsApp"><button class="btn" type="button">Quero receber</button></div><div class="lead-nota">${ico('escudo', 15)}Sem spam. Você sai da lista quando quiser.</div></div></div></div>`,
};

const CTA_FINAL = {
  vender_online: 'Escolha, clique e receba em casa.', delivery: 'Seu pedido chega rapidinho.', agendar: 'Seu horário está esperando por você.',
  orcamento: 'Vamos tirar o seu projeto do papel?', leads: 'Vamos conversar sobre o que você precisa?', visitar: 'Vem conhecer a gente pessoalmente.', redes: 'Acompanhe os bastidores nas redes.',
};

function ctaFinal(ctx) {
  const objs = [ctx.icone, ...(ctx.apoio.length ? ctx.apoio : [ctx.icone, ctx.icone])];
  const flut = ['claro', 'sec', 'acc'].map((papel, i) => `<div class="cta-obj o${i}" aria-hidden="true">${objetoSolto(ctx, objs[i % objs.length], { papel, id: 'cf' + i, rot: [-12, 10, -6][i] })}</div>`).join('');
  return `<section class="cta-final" id="${ctx.site.hero === 'formulario' ? 's-cta' : 'contato'}"><div class="padrao" aria-hidden="true">${padrao(ctx.icone, 'currentColor', { tam: 26, gap: 40, op: 1, id: 'cf' })}</div>${flut}<div class="wrap"><span class="kicker">${esc(ctx.nome)}</span><h2>${esc(CTA_FINAL[ctx.obj.id] || CTA_FINAL.leads)}</h2><p>${esc(cap(ctx.pack.ang[ctx.dif]))}.</p><div class="acoes center">${btnPri(ctx)}</div><div class="cta-contato"><span>${ico('whats', 16)}${esc(ctx.telefone)}</span><span>${ico('insta', 16)}@${esc(ctx.handle)}</span></div></div></section>`;
}

function rodape(ctx) {
  const links = ctx.site.secoes.filter((s) => s !== 'numeros' && s !== 'lead').slice(0, 5).map((s) => `<li><a href="#s-${s}">${esc(rotuloSec(ctx, s))}</a></li>`).join('');
  return `<footer class="rodape"><div class="wrap"><div class="rod-top"><p class="rod-slogan" data-campo="slogan">${esc(ctx.marca.slogan)}</p>${btnPri(ctx)}</div><div class="rod"><div><a class="marca" href="#s-hero">${marcaHTML(ctx, { variante: 'claro', classe: 'msymrod' })}</a><p class="rod-sobre" data-campo="sobre-curto">${esc(ctx.site.sobre.split(/(?<=[.!?])\s/)[0])}</p></div><div><h4>Navegue</h4><ul>${links}</ul></div><div><h4>Contato</h4><ul><li>WhatsApp ${esc(ctx.telefone)}</li><li>@${esc(ctx.handle)}</li><li>${esc(ctx.dominio)}</li></ul></div><div><h4>Visite</h4><p>${esc(ctx.endereco)}</p><p>${esc(ctx.pack.horario)}</p></div></div><div class="copy"><span>© ${ctx.agora.getFullYear()} ${esc(ctx.nome)} · Rascunho criado por voz no Estúdio · decisões do Jev</span><a href="#s-hero">Voltar ao topo ${SETA()}</a></div></div><div class="rod-gigante" aria-hidden="true" style="--len:${Math.max(5, ctx.nome.length)}">${esc(ctx.nome)}</div></footer>`;
}

// corpo da página em blocos {id, html} — o preview troca só os blocos que mudaram
export function blocos(ctx) {
  const L = [];
  if (ctx.oferta) L.push({ id: 'oferta', html: `<div class="topo-oferta"><div class="wrap to-in">${svgIcone(ICONE.presente.svg, { size: 18, sw: 1.8 })}<b>${esc(cap(ctx.oferta.frase))}</b>${ctx.oferta.id === 'cupom10' ? '<span>use o cupom <span class="to-cupom">BEMVINDO</span></span>' : ''}</div></div>` });
  const menu = ctx.site.secoes.filter((s) => ['cardapio', 'servicos', 'planos', 'delivery', 'agendamento', 'sobre', 'depoimentos', 'faq', 'localizacao'].includes(s)).slice(0, 4);
  const links = menu.map((s) => `<a href="#s-${s}">${esc(rotuloSec(ctx, s))}</a>`).join('');
  const num = numeracao(ctx);
  const gaveta = menu.map((s) => `<a href="#s-${s}">${esc(rotuloSec(ctx, s))}<span>${num[s]}</span></a>`).join('');
  L.push({ id: 'nav', html: `<header class="nav"><div class="wrap nav-in"><a class="marca${ctx.nome.length > 18 ? ' longa' : ''}" href="#s-hero" aria-label="${esc(ctx.nome)}">${marcaHTML(ctx)}</a><nav class="nav-links" aria-label="Seções">${links}</nav>${btnPri(ctx, 'btn-sm nav-cta')}<details class="nav-mob"><summary aria-label="Abrir o menu">${svgIcone(MENU_IC, { size: 22, sw: 2, cls: 'ic-menu' })}${svgIcone(FECHAR_IC, { size: 22, sw: 2, cls: 'ic-x' })}</summary><div class="nav-gaveta">${gaveta}${btnPri(ctx)}</div></details></div></header>` });
  L.push({ id: 'hero', html: hero(ctx) });
  let alt = !['central', 'cinema'].includes(ctx.site.hero);
  for (const s of ctx.site.secoes) {
    const fn = SECOES[s];
    if (!fn) continue;
    const especial = s === 'numeros' || s === 'lead';
    const isAlt = !especial && alt;
    if (!especial) alt = !alt;
    L.push({ id: s, html: `<section class="sec sec-${s}${isAlt ? ' alt' : ''}" id="s-${s}">${fn(ctx, num[s] || '')}</section>` });
  }
  L.push({ id: 'cta', html: ctaFinal(ctx) });
  L.push({ id: 'rodape', html: rodape(ctx) });
  return L;
}

// documento completo (preview e download)
export function documento(ctx, { fontes = '/fonts/', titulo } = {}) {
  const L = blocos(ctx);
  const t = titulo || `${ctx.nome} — ${cap(ctx.pack.cat)}${ctx.cidade ? ' em ' + ctx.cidade.nome : ''}`;
  const embs = [...(ctx.marca.f.emb || []), ...(ctx.marca.fontesExtras || [])];
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t)}</title>
<meta name="description" content="${esc(ctx.site.sub)}">
<meta name="theme-color" content="${ctx.marca.cores.pri}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(simboloSVG(ctx, { tamanho: 64 }))}">
<style id="fontes">${fontFaceCSS(fontes, typeof fontes === 'string' ? null : embs)}</style>
<style id="base">${CSS_BASE}</style>
<style id="vars">${cssVars(ctx)}</style>
<style id="ajustes">${ajustesCSS(ctx.ajustes || [], 'site', ctx)}</style>
</head>
<body class="${classesBody(ctx)}">
${L.map((b) => `<div data-bloco="${b.id}">${b.html}</div>`).join('\n')}
</body>
</html>`;
}

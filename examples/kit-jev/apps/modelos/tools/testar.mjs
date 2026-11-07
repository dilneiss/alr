// Testa UM modelo contra o Jev de verdade (pelo gateway), sem subir o servidor.
// Uso: node apps/modelos/tools/testar.mjs <id> [--gateway http://127.0.0.1:8797] [--tudo]
//  1) confere o app.config.mjs (campos, decisões, dados);
//  2) monta as chamadas como o servidor monta e pergunta ao Jev;
//  3) compara com o "esperado" anotado nos dados (choice = id da opção, noul = true/false, score = nível 0..n);
//  4) roda os ganchos de tela (render, responder, cartaoExtra, aoDecidir, resumoExtra…) para pegar erro cedo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { montar, conferirModelo, contextoDe } from '../lib/decidir.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const gi = args.indexOf('--gateway');
const GATEWAY = gi >= 0 ? args[gi + 1] : (process.env.JEV_GATEWAY_URL || 'http://127.0.0.1:8797');
const TUDO = args.includes('--tudo');
if (!id) { console.error('uso: node apps/modelos/tools/testar.mjs <id>'); process.exit(2); }

const arq = path.join(RAIZ, 'public', id, 'app.config.mjs');
if (!fs.existsSync(arq)) { console.error(`não existe: ${arq}`); process.exit(2); }
const spec = (await import(pathToFileURL(arq).href + '?t=' + Date.now())).default;
const problemas = conferirModelo(spec);
if (spec.id !== id) problemas.push(`id "${spec.id}" diferente da pasta "${id}"`);
if (problemas.length) { console.log('✗ PROBLEMAS NO MODELO:\n  - ' + problemas.join('\n  - ')); process.exit(1); }
console.log(`✓ modelo ok: ${spec.titulo} (${spec.motor}, ${spec.decisoes.length} decisões)`);

const ctx = contextoDe(spec);
let custo = 0, ms = [], acertos = 0, total = 0, chamadas = 0;
const erros = [];
const decPorId = Object.fromEntries((spec.decisoes || []).map((d) => [d.id, d]));

async function jev(m, rotulo) {
  const t0 = Date.now();
  const r = await fetch(`${GATEWAY}/v1/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: 'teste-' + id, state: m.state, questions: m.questions }) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${rotulo}: ${j.error?.message || r.status}`);
  chamadas++; custo += j.cost || 0; ms.push(j.latency_ms || Date.now() - t0);
  const faltando = Object.keys(m.questions).filter((k) => !j.answers[k]);
  if (faltando.length) erros.push(`${rotulo}: o Jev não respondeu ${faltando.join(', ')}`);
  return m.ler(j.answers);
}

function confere(resp, esperado, rotulo, decisaoDe) {
  if (!esperado) return;
  for (const [k, v] of Object.entries(esperado)) {
    const a = resp && resp[k]; const d = decPorId[decisaoDe ? decisaoDe[k] : k];
    if (!a || !d) { erros.push(`${rotulo}: esperado "${k}" sem resposta`); continue; }
    let obtido, ok;
    if (a.type === 'choice') { obtido = a.choice; ok = [].concat(v).includes(a.choice); }
    else if (a.type === 'noul') { const lim = d.limiar ?? 0.5; obtido = a.noul >= lim; ok = obtido === v; obtido = `${obtido} (${a.noul.toFixed(2)})`; }
    else { obtido = Math.round(Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0]); ok = [].concat(v).includes(obtido); }
    total++; if (ok) acertos++;
    if (!ok || TUDO) console.log(`  ${ok ? '✓' : '✗'} ${rotulo} · ${k}: obtido ${obtido}, esperado ${JSON.stringify(v)}`);
  }
}

function gancho(nome, ...a) {
  const f = spec[nome] ?? (spec.conversa && spec.conversa[nome]) ?? (spec.agente && spec.agente[nome]);
  if (typeof f !== 'function') return;
  try { f(...a); } catch (e) { erros.push(`gancho ${nome} quebrou: ${e.message}`); }
}

try {
  if (spec.motor === 'fluxo') {
    const lote = Math.min(12, spec.fluxo?.lote || 6);
    const dados = spec.dados;
    const extra = {};
    for (let i = 0; i < dados.length; i += lote) {
      const bloco = dados.slice(i, i + lote);
      const m = montar(spec, { itens: bloco.map((d) => ({ ref: d.id, chave: d.id })) });
      const r = await jev(m, `lote ${i / lote + 1}`);
      for (const d of bloco) {
        confere(r.itens[d.id], d.esperado, d.id);
        gancho('cartaoExtra', d, r.itens[d.id] || {}, ctx);
        gancho('aoDecidir', d, r.itens[d.id] || {}, extra, ctx);
      }
    }
    gancho('resumoExtra', extra, { feitos: dados.length }, ctx);
    const m2 = montar(spec, { itens: [{ texto: 'texto livre de teste digitado pela pessoa', chave: 'u1' }] });
    await jev(m2, 'item digitado');
  } else if (spec.motor === 'pares') {
    const pares = spec.paresDemo || [];
    for (let i = 0; i < pares.length; i += 8) {
      const bloco = pares.slice(i, i + 8).map((p, j) => ({ id: 'p' + (i + j), a: { ref: p[0] }, b: { ref: p[1] }, esperado: p[2] }));
      const r = await jev(montar(spec, { pares: bloco }), `pares ${i + 1}–${i + bloco.length}`);
      for (const p of bloco) confere(r.pares[p.id], p.esperado, `${p.a.ref}↔${p.b.ref}`);
    }
  } else if (spec.motor === 'aovivo') {
    for (const ex of spec.exemplos) {
      const r = await jev(montar(spec, { texto: ex.texto }), ex.titulo || 'exemplo');
      confere(r.respostas, ex.esperado, ex.titulo || 'exemplo');
      if (Array.isArray(ex.esperadoLinhas) && r.linhas) ex.esperadoLinhas.forEach((e, i) => { if (e && r.linhas[i]) confere(r.linhas[i].respostas, e, `${ex.titulo || 'exemplo'} · linha ${i + 1} «${r.linhas[i].texto.slice(0, 30)}»`); });
      if (typeof spec.render === 'function') { try { const h = spec.render({ ...r, latencia_ms: 300, custo: 0 }, ex.texto, ctx); if (typeof h !== 'string') erros.push('render deve devolver texto HTML'); } catch (e) { erros.push(`render quebrou em "${ex.titulo}": ${e.message}`); } }
    }
  } else if (spec.motor === 'conversa') {
    const C = spec.conversa || {}; const part = C.participantes || {};
    const analisar = [].concat(C.analisar || Object.keys(part)[0]);
    for (const rot of spec.roteiros) {
      const hist = []; const estado = {};
      for (const f of rot.falas) {
        const nome = (part[f.quem] && part[f.quem].nome) || f.quem;
        if (!part[f.quem]) erros.push(`roteiro "${rot.titulo}": quem "${f.quem}" não está em conversa.participantes`);
        if (analisar.includes(f.quem)) {
          const r = await jev(montar(spec, { historico: hist, atual: { quem: f.quem, texto: f.texto } }), `${rot.titulo}: "${f.texto.slice(0, 40)}"`);
          confere(r.respostas, f.esperado, `${rot.titulo}: "${f.texto.slice(0, 40)}"`);
          hist.push({ quem: nome, texto: f.texto });
          if (typeof C.responder === 'function') { try { const x = C.responder(r.respostas, { quem: f.quem, texto: f.texto }, ctx, estado); if (x) hist.push({ quem: C.respondeComo || 'bot', texto: typeof x === 'string' ? x : [].concat(x).map((y) => (typeof y === 'string' ? y : y.texto)).join(' ') }); } catch (e) { erros.push(`responder quebrou: ${e.message}`); } }
          for (const g of ['telaCliente', 'produtoLive', 'selo']) gancho(g, r.respostas, { quem: f.quem, texto: f.texto }, ctx, estado);
          continue;
        }
        hist.push({ quem: nome, texto: f.texto });
      }
    }
  } else if (spec.motor === 'agente') {
    const G = spec.agente || {};
    for (const rot of spec.roteiros) {
      if (G.modo === 'roteador') {
        const cont = {};
        for (const p of rot.pedidos || []) {
          const texto = typeof p === 'string' ? p : p.texto;
          const r = await jev(montar(spec, { pedido: texto }), `"${texto.slice(0, 40)}"`);
          confere(r.respostas, typeof p === 'object' ? p.esperado : null, `"${texto.slice(0, 40)}"`);
          const v = r.respostas[G.veredito]; if (v) cont[v.choice] = (cont[v.choice] || 0) + 1;
          gancho('aoDecidir', r.respostas, { pedido: texto }, ctx, cont);
        }
      } else {
        const hist = [];
        for (const p of rot.passos || []) {
          const r = await jev(montar(spec, { pedido: rot.pedido, passo: p, historico: hist }), `${rot.titulo}: ${p.ferramenta}`);
          confere(r.respostas, p.esperado, `${rot.titulo}: ${p.ferramenta} ${JSON.stringify(p.args).slice(0, 30)}`);
          gancho('aoDecidir', r.respostas, { pedido: rot.pedido, passo: p }, ctx);
          hist.push(`${p.ferramenta}: ${p.descricao || ''}`);
        }
      }
    }
  } else if (spec.motor === 'provas') {
    const B = spec.provas;
    const ex = B.exemplos.slice(0, 10).map((e, i) => ({ id: 'e' + i, texto: e.texto, rotulo: e.rotulo }));
    const r = await jev(montar(spec, { pergunta: B.pergunta, exemplos: ex }), 'prova');
    for (const e of ex) { const a = r.itens[e.id]; total++; const ok = a && (a.choice || (a.noul >= 0.5 ? 'sim' : 'nao')) === e.rotulo; if (ok) acertos++; else console.log(`  ✗ "${e.texto}": obtido ${a && (a.choice ?? a.noul)}, esperado ${e.rotulo}`); }
  } else if (spec.motor === 'laboratorio') {
    for (const p of spec.laboratorio.presets) await jev(montar(spec, { state: p.state, questions: p.questions }), p.titulo);
  } else if (spec.motor === 'palco') {
    // spec.testes: [{ titulo, jogada, dados, esperado: { <chave da pergunta>: valor } }]
    if (!(spec.testes || []).length) erros.push('faltam os testes (spec.testes) para medir o acerto');
    for (const t of spec.testes || []) {
      const m = montar(spec, { jogada: t.jogada, dados: t.dados || {} });
      const r = await jev(m, t.titulo);
      confere(r.respostas, t.esperado, t.titulo, m.decisaoDe);
      if (typeof spec.verificar === 'function') { try { spec.verificar(t, r.respostas, ctx); } catch (e) { erros.push(`verificar quebrou em "${t.titulo}": ${e.message}`); } }
    }
  }
} catch (e) { erros.push('FALHA: ' + e.message); }

const med = ms.length ? ms.sort((a, b) => a - b)[Math.floor(ms.length / 2)] : 0;
console.log(`chamadas: ${chamadas} · mediana ${med} ms · custo US$ ${custo.toFixed(6)}`);
if (total) console.log(`acerto contra o esperado: ${acertos}/${total} (${Math.round((acertos / total) * 100)}%)`);
else console.log('sem "esperado" anotado nos dados (anote para medir o acerto)');
if (erros.length) { console.log('✗ ERROS:\n  - ' + erros.join('\n  - ')); process.exit(1); }
process.exit(total && acertos / total < 0.8 ? 3 : 0);

/**
 * Testa a edição do app "Editor que Corta Enquanto Você Fala" sem microfone:
 * alimenta o módulo de edição com as respostas do Jev (como se fossem do aluno) e confere
 * quando uma frase sai do corte.
 *
 * Regra de ouro: NADA sai do corte sem a pessoa mandar — só quando a frase é mesmo hesitação,
 * bastidor, recomeço da anterior, ou veio uma ordem ("corta isso").
 *
 * Uso: node apps/modelos/public/editor-corta/test-edicao.mjs
 */
import assert from 'node:assert/strict';
import { criarEdicao, dividir } from './emenda.mjs';

const resp = ({ tipo = 'conteudo', p = 0.9, refaz = 0, continua = 0, apagar = 0 } = {}) => ({
  tipo: { probabilities: { conteudo: tipo === 'conteudo' ? p : 1 - p, [tipo]: tipo === 'conteudo' ? 1 - p : p } },
  ...(refaz ? { refaz: { noul: refaz } } : {}),
  ...(continua ? { continua: { noul: continua } } : {}),
  ...(apagar ? { apagar: { noul: apagar } } : {}),
});

const nova = (ed, texto, extra = {}) => {
  const f = ed.nova(texto, extra);
  return f;
};

// 1) frase longa de conteúdo, mesmo classificada como bastidor com confiança média, FICA
{
  const ed = criarEdicao();
  const f = nova(ed, 'hoje eu vou mostrar tres jeitos de gravar um video sem editar depois');
  ed.aplicar(f, resp({ tipo: 'bastidor', p: 0.62 }));
  assert.equal(f.status, 'mantida', 'frase longa não pode sair com evidência fraca');
}

// 2) bastidor curto de verdade SAI
{
  const ed = criarEdicao();
  const a = nova(ed, 'o primeiro passo e organizar o material');
  ed.aplicar(a, resp());
  const f = nova(ed, 'ops errei de novo');
  ed.aplicar(f, resp({ tipo: 'bastidor', p: 0.9 }));
  assert.equal(f.status, 'cortada', 'bastidor curto precisa sair');
}

// 3) recomeço da MESMA frase (mesmo começo) tira a tentativa anterior
{
  const ed = criarEdicao();
  const a = nova(ed, 'o segundo jeito e gravar em blocos curtos');
  ed.aplicar(a, resp());
  const b = nova(ed, 'o segundo jeito e gravar em blocos curtos de um minuto cada');
  ed.aplicar(b, resp({ refaz: 0.2 }));
  assert.equal(b.status, 'mantida', 'a nova tentativa fica');
  assert.equal(a.status, 'cortada', 'a tentativa antiga sai');
}

// 4) continuar o assunto (sem repetir o começo) NÃO tira a frase anterior
{
  const ed = criarEdicao();
  const a = nova(ed, 'eu gosto de gravar de manha');
  ed.aplicar(a, resp());
  const b = nova(ed, 'a luz da manha deixa a imagem muito melhor');
  ed.aplicar(b, resp({ refaz: 0.2 }));
  assert.equal(a.status, 'mantida', 'assunto novo não pode derrubar a frase anterior');
  assert.equal(b.status, 'mantida');
}

// 5) ordem falada ("corta isso") sai do detector de comando e derruba a anterior
{
  const partes = dividir('o video ficou bom, corta isso');
  const cmd = partes.find((p) => p.comando);
  assert.ok(cmd, 'a ordem precisa ser reconhecida');
  const ed = criarEdicao();
  const a = nova(ed, 'o video ficou bom');
  ed.aplicar(a, resp());
  const c = nova(ed, cmd.texto, { comando: cmd.comando });
  ed.aplicar(c, null);
  assert.equal(a.status, 'cortada', 'a ordem corta o que veio antes');
  assert.equal(c.status, 'cortada', 'a ordem em si também não entra no corte');
}

// 6) frase comum com a palavra "corta" no meio (não é ordem) FICA
{
  const partes = dividir('e o terceiro jeito e deixar o editor cortar os erros enquanto voce fala');
  assert.equal(partes.filter((p) => p.comando).length, 0, 'falar de corte não é mandar cortar');
  const ed = criarEdicao();
  const f = nova(ed, 'e o terceiro jeito e deixar o editor cortar os erros enquanto voce fala');
  ed.aplicar(f, resp());
  assert.equal(f.status, 'mantida');
}

// 7) frase "pela metade" sem continuação sai no fim, e a que foi continuada fica
{
  const ed = criarEdicao();
  const a = nova(ed, 'o primeiro jeito e');
  ed.aplicar(a, resp({ tipo: 'metade', p: 0.8 }));
  assert.equal(a.status, 'suspensa', 'pela metade espera a próxima frase');
  ed.resolverFim();
  assert.equal(a.status, 'cortada', 'sem continuação, a metade não entra no corte');
}

// 8) hesitação curta no meio da gravação SAI
{
  const ed = criarEdicao();
  const a = nova(ed, 'o segundo jeito e gravar em blocos');
  ed.aplicar(a, resp());
  const h = nova(ed, 'e tipo assim');
  ed.aplicar(h, resp({ tipo: 'hesitacao', p: 0.88 }));
  assert.equal(h.status, 'cortada');
  assert.equal(a.status, 'mantida', 'a hesitação não pode levar a frase boa junto');
}

console.log('OK — nada sai do corte sem motivo: frase longa protegida, recomeço corta só a tentativa antiga, ordem explícita funciona.');

// README de um modelo exportado pelo Kit Jev (node kit/jev-kit.mjs exportar <id>).
import { listaOpcoesNode } from './util-node.mjs';

export function readmeDoModelo(spec) {
  const decs = (spec.decisoes || []).map((d) => {
    let det = '';
    if (d.tipo === 'choice') det = listaOpcoesNode(d, spec).map((o) => `\`${o.id}\``).join(', ');
    if (d.tipo === 'score') det = (d.niveis || []).map((n) => (typeof n === 'string' ? n : n.rotulo)).join(' → ');
    if (d.tipo === 'noul') det = `sim ou não (limiar ${d.limiar ?? 0.5})`;
    return `| \`${d.id}\` | ${d.tipo} | ${String(d.pergunta).replace(/\|/g, '/').replace(/\n/g, ' ')} | ${det} |`;
  }).join('\n');
  const dados = { fluxo: '`dados` (os itens de exemplo)', pares: '`dados` e `paresDemo`', aovivo: '`exemplos` (os textos da demonstração)', conversa: '`roteiros` (as conversas de exemplo)', agente: '`roteiros` (os cenários do agente)', provas: '`provas.exemplos`', laboratorio: '`laboratorio.presets`', palco: '`jogadas` (o que a tela manda ao Jev e quais perguntas ele responde) e os dados do topo do arquivo' }[spec.motor] || 'os dados de exemplo';
  const palco = spec.motor === 'palco'
    ? `\n## Ao vivo: microfone, câmera e jogo\n- A tela deste app fica em \`public/${(spec.palco?.modulo || 'palco.js').replace(/^\.\//, '')}\`.\n- Microfone e câmera só funcionam em \`https\` ou em \`http://localhost\`. O navegador pede licença na primeira vez.\n${spec.palco?.comoTestar ? `- Como testar: ${spec.palco.comoTestar}\n` : ''}`
    : '';
  return `# ${spec.emoji} ${spec.titulo}

${spec.resumo}

${spec.descricao}

Exportado pelo **Kit Jev**. Feito com o **Jev** (modelo de decisões da TypeSafe), pelo OpenRouter: ele não escreve texto,
recebe dados e perguntas e devolve probabilidades numa passada só, em ~0,3 s e por ~US$ 0,0001 por chamada.

## Como rodar
1. Instale o **Node.js 22** ou mais novo (https://nodejs.org).
2. Copie \`.env.exemplo\` para \`.env\` e cole a sua chave do OpenRouter: \`OPENROUTER_API_KEY=sk-or-...\`
3. Nesta pasta: \`node server.mjs\` e abra http://localhost:3000. Aperte **▶ Ver funcionando**.

O \`portao.json\` é o carimbo do kit (a sua VPS da Hostinger verificada). Sem ele, o servidor não sobe.

## Como o Jev decide aqui
| Decisão | Tipo | Pergunta | Opções |
|---|---|---|---|
${decs || '| — | — | (este app monta as perguntas na tela) | — |'}

## Como adaptar para o seu caso
Tudo fica num arquivo só: **\`public/app.config.mjs\`**.
- **\`contexto\`**: as regras e os dados fixos que o Jev lê em toda decisão.
- **\`decisoes\`**: as perguntas que o Jev responde. O texto da pergunta e a descrição de cada opção **são a sua regra**.
- ${dados}: troque pelos seus.

Peça ao seu agente: "adapte este app.config.mjs para a minha clínica / loja / escritório".
${palco}
## O que funciona (medido)
- descreva cada opção de forma concreta, com exemplos, sem sobreposição;
- se houver regra de negócio, escreva a regra na pergunta;
- sempre ofereça uma saída ("outro", "nenhum", "perguntar");
- contas, datas e comparação de valores ficam com o seu código (o Jev não é calculadora);
- texto longo vira pedaços curtos; teste com exemplos rotulados antes de automatizar.

## Para levar para produção
- A chave fica só no servidor (\`.env\`); o navegador nunca a vê.
- Troque os dados de exemplo pela sua fonte: e-mail, WhatsApp, planilha, banco de dados.
- Defina o limiar de confiança: acima dele o sistema age sozinho, abaixo uma pessoa decide.
- Termos da TypeSafe: não use as respostas do Jev para treinar outro modelo.

## Arquivos
- \`server.mjs\`: servidor (Node 22, sem dependências).
- \`decidir.mjs\`: monta as perguntas do Jev a partir do \`app.config.mjs\`.
- \`public/app.config.mjs\`: o app inteiro (contexto, decisões, dados).
- \`public/motor/\`: a interface (telas, animações, inspetor "O que o Jev vê").
`;
}

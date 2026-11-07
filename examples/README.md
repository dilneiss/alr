# Kit JEV 100 Apps — exemplos dentro do ALR

Cópia de `D:/herd/maestros/anexos/kit-jev/kit-jev-100-apps` (biblioteca Maestros da IA),
trazida para cá para servir de:

1. **Corpus de exemplos** das 16 bibliotecas de motion/HTML/Canvas, das 16 bibliotecas de
   movimento e das ~100 telas (apps) que chamam decisões tipadas.
2. **Banco de testes** do motor do ALR: cada app envia `state` + `questions` no mesmo
   contrato do JEV (`{model, state, questions}` → `{answers}`), então dá para rodar
   o mesmo app contra o ALR local e comparar com o JEV real.

## Como o ALR recebe o mesmo nível de resposta do JEV

O ALR tem duas camadas:

| camada | quando | como |
|---|---|---|
| heurística local (System 1) | padrão, zero token | léxica, offline, ~1 ms |
| professor (paridade JEV) | `ALR_TEACHER_URL` + `ALR_TEACHER_KEY` definidos | encaminha a decisão e devolve a resposta do JEV |

O `scripts/serve.mjs` da biblioteca sobe o ALR já com o professor apontado para
`http://127.0.0.1:5273/api/decide-jev` (rota que sempre usa o JEV), então os dois
motores respondem igual — medido: `noul 0.64` no ALR e `noul 0.64` no JEV para o
mesmo estado.

Diagnóstico do professor: `ALR_TEACHER_LOG` (o `serve.mjs` aponta para `data-alr-teacher.log`;
rodando na mão, o padrão é `<tmp>/alr-teacher.log`). Só escreve quando algo falha.

O `state` aceita **string ou objeto** (`{"contexto": …, "tarefa": …}`) — é o que os apps mandam.

## Rodar

```bash
# sem professor (heurística local)
D:/herd/alr-target/release/alr.exe playground --port 3000

# com professor (paridade com o JEV)
ALR_TEACHER_URL=http://127.0.0.1:5273/api/decide-jev \
ALR_TEACHER_KEY=local \
D:/herd/alr-target/release/alr.exe playground --port 3000
```

```bash
curl -X POST http://127.0.0.1:3000/api/v1/decisions \
  -H 'Content-Type: application/json' \
  -d '{"state":{"tarefa":"Cliente: integra com Clinicorp? uso em 3 unidades"},
       "questions":{"quer_comprar":{"type":"noul","instructions":"Intencao real de compra?"}}}'
```

## Cuidado

- `.gitignore` do kit continua valendo (não versionar mídia gerada).
- O espelho é byte a byte igual ao original; conferir com `node scripts/check-sync.mjs`
  no repositório maestros (ele compara este diretório com `anexos/kit-jev/kit-jev-100-apps`).
- Este diretório é cópia de leitura: edite a versão em `maestros/anexos/kit-jev/`.

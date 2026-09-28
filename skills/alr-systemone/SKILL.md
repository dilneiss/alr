---
name: alr-systemone
license: MIT
description: >
  Construa software inteligente com ALR System 1 (Motor de Decisões Tipadas no estilo Jev):
  pequenas unidades de inteligência de IA utilizáveis como primitivas de programação.
  Seus modelos System One transformam linguagem natural e o estado da aplicação
  em julgamentos tipados e probabilidades calibradas (Choice, Noul, Score) que o código
  consome diretamente, sem geração de texto autoregressiva e sem parsing de JSON.
  Execução 100% local em CPU com latência em sub-microssegundos (~20 µs a 400 µs),
  custo zero ($0.00) e zero dependência de GPU ou chaves pagas.
  Aplicações incluem roteamento, ranqueamento, extração de valores, verificação de citações,
  defesa contra injeções SQL, copilotos de vendas ao vivo, automação de QA e experiências
  interativas em tempo real.
---

# Construir com ALR System 1 (TypeSafe Jev Engine)

O **ALR System 1** torna as unidades de inteligência de IA utilizáveis como primitivas de programação: julgamentos rápidos e modulares que você compõe para construir capacidades sofisticadas de software. Seus **modelos System One** retornam decisões focadas e probabilidades numéricas calibradas que o código consome diretamente, eliminando a lentidão, as alucinações e a fragilidade do parsing de JSON gerado por LLMs convencionais.

O código é o dono do fluxo de trabalho (*Code owns the workflow*); o modelo fornece **bom senso programável** exatamente onde o código tradicional necessita de compreensão semântica.

O ALR foi construído sobre a premissa de que:
> **"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."**

Enquanto o JEV original exige chamadas de API pagas na nuvem ou modelos de 2B/9B/27B em GPUs pesadas, o ALR oferece o mesmo protocolo canônico (`/v1/systemone`) rodando **100% localmente em CPU**, em **sub-microssegundos**, a **custo zero ($0.00)** e com **15 recipes cognitivas** e **5 casos de domínio corporativo** já compilados em código nativo Rust.

---

## 1. As 3 Primitivas Fundamentais de Decisão

Escolha a primitiva de acordo com o significado do julgamento necessário:

| Necessidade | Primitiva | Distinção e Contrato | Exemplo Típico |
| :--- | :--- | :--- | :--- |
| **Uma opção de um conjunto definido** | **`Choice`** | Seleciona exatamente um candidato; sua distribuição Softmax compara as opções concorrentes e fornece uma métrica de `confidence` (concentração da distribuição). | Roteamento de tickets de suporte, escolha de ferramenta (*function calling*), classificação de intenção de compra. |
| **Se uma condição específica é verdadeira** | **`Noul`** | Retorna a probabilidade booleana direta ($P(\text{sim})$ de $0.0$ a $1.0$). Não possui confiança separada. Permite múltiplas perguntas simultâneas onde várias condições podem coexistir. | Verificação de urgência, detecção de fraude, gatilho de emergência em telemetria, detecção de injeção de prompt. |
| **Grau ou intensidade em uma dimensão ordenada** | **`Score`** | Posição contínua calculada pela média ponderada das probabilidades dos níveis ordenados ($\sum i \cdot P(\text{nível}_i)$). Produz um valor esperado comparável entre itens. | Nível de satisfação do cliente (0 a 3), risco de cancelamento (*churn*), prioridade de execução. |

---

## 2. Padrões de Arquitetura e Casos de Uso (Cookbooks)

Não se limite à classificação simples. O ALR System 1 permite combinar primitivas em padrões elegantes:

### A. Roteamento com Extração de Parâmetros (*Route and Fill*)
Uma requisição única seleciona o manipulador (*handler*) e preenche seus parâmetros tipados. Perguntas especulativas dos ramos possíveis são feitas em paralelo na mesma chamada; o código consome apenas as respostas do ramo selecionado.
- *Exemplo*: Identifica se o usuário quer pagar com PIX ou Cartão e já avalia o parcelamento desejado.

### B. Selecionar em vez de Gerar (*Select Instead of Generate*)
Em vez de pedir para a IA escrever ou formatar valores, localize candidatos potenciais no código ou no texto-fonte (quantias, telefones, datas, códigos de rastreio), use uma decisão do System 1 para escolher o índice correto e deixe o código normalizar deterministicamente.
- *Recipes*: `AmountExtractor`, `PhoneValidator`, `DateExtractionRecipe`.

### C. Ranqueamento e Julgamento de Evidências (*Reranking & Evidence*)
Recupere $N$ candidatos de bancos relacionais ou vetoriais (SQLite, Qdrant) e avalie a relevância de cada um em relação à consulta com uma pergunta `Score` ou `Choice`.
- *Recipes*: `RerankRecipe`, `SemanticSearchRecipe`, `RagFilterRecipe`.

### D. Dados Reutilizáveis e Pontuação Composta (*Composite Scoring*)
Avalie dimensões semânticas independentes uma única vez (`tem_urgência`, `relevância_técnica`, `severidade`). O código aplica pesos, filtros e thresholds dinâmicos sem precisar reexecutar a inferência quando os pesos mudam.

### E. Verificação, Portões de Confiança e Escalonamento (*Verification Gates*)
Verifique afirmações geradas ou campos críticos contra suas fontes de evidência. Se a confiança for menor que o limiar de segurança (ex: $< 0.75$), o fluxo escala automaticamente para aprovação humana ou aciona o Professor LLM.
- *Recipes*: `CitationChecker`, `SqlGuardrail`, `VerificationGateRecipe`.

### F. Copiloto em Tempo Real (*Real-Time Interactive Copilot*)
Em reuniões ao vivo (ex: Google Meet), o áudio é transcrito e submetido ao `/v1/systemone` a cada fala. O sistema avalia em $\approx 400\text{ µs}$ se houve objeção, qual é a objeção e se a fala terminou, exibindo o card de desarme para o vendedor na hora exata sem latência perceptível.


### G. Catálogo Oficial dos 20 Cookbooks TypeSafe JEV + Smart Home Demo
O ALR implementa nativamente todos os **20 Cookbooks oficiais do TypeSafe JEV** mais a **Demonstração Completa de Smart Home**, com documentação exaustiva e exemplos práticos de código em Python, TypeScript, cURL e Rust no guia [`docs/cookbooks-reference.md`](../../docs/cookbooks-reference.md):

| # | Cookbook Oficial | Primitiva / Padrão | Caso de Uso e Benefício | Referência Completa |
|---|---|---|---|---|
| 01 | **Consistency Noul** | `Noul` + Auto-Consistência | Amostragem térmica com variância para detecção de incerteza em transações financeiras e riscos críticos. | [`docs/cookbooks-reference.md#01-consistency-noul`](../../docs/cookbooks-reference.md#01-consistency-noul) |
| 02 | **Consistency Choice** | `Choice` + Moderação | Portão de incerteza com medição de entropia Softmax e fallback automático para moderação humana. | [`docs/cookbooks-reference.md#02-consistency-choice`](../../docs/cookbooks-reference.md#02-consistency-choice) |
| 03 | **Parallel Questions** | Batching Heterogêneo | Avaliação de $N$ perguntas simultâneas (`choice`, `noul`, `score`) em 1 única requisição HTTP com 10x speedup. | [`docs/cookbooks-reference.md#03-parallel-questions`](../../docs/cookbooks-reference.md#03-parallel-questions) |
| 04 | **Reranking** | `Score` + BM25 | Reordenação semântica de candidatos recuperados de Qdrant ou SQLite com pontuação de aderência factual. | [`docs/cookbooks-reference.md#04-reranking`](../../docs/cookbooks-reference.md#04-reranking) |
| 05 | **Semantic Find** | `Choice` + `Noul` | Varredura linha por linha em contratos e documentos (`[L1]...[LN]`) com flag de existência factual. | [`docs/cookbooks-reference.md#05-semantic-find`](../../docs/cookbooks-reference.md#05-semantic-find) |
| 06 | **Autoformat** | `Choice` Estrutural | Reconstrução da estrutura de documentos (Markdown `#`, `-`, ` ``` `) a partir de texto bruto desformatado. | [`docs/cookbooks-reference.md#06-autoformat`](../../docs/cookbooks-reference.md#06-autoformat) |
| 07 | **Function Calling** | `Choice` + `Noul` | Mapeamento determinístico de comandos para ferramentas com verificação e cobrança de argumentos faltantes. | [`docs/cookbooks-reference.md#07-function-calling`](../../docs/cookbooks-reference.md#07-function-calling) |
| 08 | **Skill Suggestion** | `Choice` Turn-by-Turn | Recomendação da melhor habilidade procedural do catálogo de agentes a cada turno do diálogo. | [`docs/cookbooks-reference.md#08-skill-suggestion`](../../docs/cookbooks-reference.md#08-skill-suggestion) |
| 09 | **Entity Alignment** | `Score` + `Noul` | Alinhamento semântico entre esquemas heterogêneos de bancos de dados para migrações automáticas. | [`docs/cookbooks-reference.md#09-entity-alignment`](../../docs/cookbooks-reference.md#09-entity-alignment) |
| 10 | **Classifying RAG Passages** | `Noul` + `Score` | Filtro e classificação de relevância RAG antes de alimentar o modelo, eliminando ruídos e contradições. | [`docs/cookbooks-reference.md#10-classifying-rag-passages`](../../docs/cookbooks-reference.md#10-classifying-rag-passages) |
| 11 | **Citation Check** | `Noul` de Fidelidade | Verificação formal de citações RAG contra o documento original para detecção rigorosa de alucinações. | [`docs/cookbooks-reference.md#11-citation-check`](../../docs/cookbooks-reference.md#11-citation-check) |
| 12 | **LLM Guardrails** | `Noul` Multi-Ameaça | Barreiras de segurança léxicas e de probabilidade contra injeção de prompt, bypass de regras e vazamento. | [`docs/cookbooks-reference.md#12-llm-guardrails`](../../docs/cookbooks-reference.md#12-llm-guardrails) |
| 13 | **SDE Cascade** | Cascata em 2 Estágios | Extração de dados estruturados em cascata (Classificação de Escopo $\to$ Preenchimento de Campos). | [`docs/cookbooks-reference.md#13-sde-cascade`](../../docs/cookbooks-reference.md#13-sde-cascade) |
| 14 | **Date Extraction** | `Choice` + Normalização | Extração e normalização de datas absolutas e relativas ("amanhã", "daqui a 3 dias") para o padrão ISO 8601. | [`docs/cookbooks-reference.md#14-date-extraction`](../../docs/cookbooks-reference.md#14-date-extraction) |
| 15 | **Pre-parsed Value Extraction** | Seleção de Spans | Extração de valores pré-parseados (e-mail, telefone E.164, quantias monetárias BRL/USD/EUR). | [`docs/cookbooks-reference.md#15-pre-parsed-value-extraction`](../../docs/cookbooks-reference.md#15-pre-parsed-value-extraction) |
| 16 | **Hierarchical Classification** | Beam Search em Árvore | Classificação taxonômica hierárquica em árvore (Categoria Raiz $\to$ Subcategoria $\to$ Especialidade). | [`docs/cookbooks-reference.md#16-hierarchical-classification`](../../docs/cookbooks-reference.md#16-hierarchical-classification) |
| 17 | **Autoresearch Feature Discovery** | `Score` Composto | Descoberta automática de features com pontuação composta ponderada no código cliente. | [`docs/cookbooks-reference.md#17-autoresearch-feature-discovery`](../../docs/cookbooks-reference.md#17-autoresearch-feature-discovery) |
| 18 | **Classification Using Confidence** | Portão de Confiança | Portão de decisão que recua para abstração mais ampla e segura se a confiança for inferior ao limiar. | [`docs/cookbooks-reference.md#18-classification-using-confidence`](../../docs/cookbooks-reference.md#18-classification-using-confidence) |
| 19 | **Speculative Fan-out** | Perguntas Especulativas | Disparo de perguntas especulativas de múltiplos ramos futuros simultaneamente na mesma chamada. | [`docs/cookbooks-reference.md#19-speculative-fan-out`](../../docs/cookbooks-reference.md#19-speculative-fan-out) |
| 20 | **Intent Routing** | Roteador Multi-Ramo | Roteamento de intenções com critérios mutuamente exclusivos e garantia de fallback seguro. | [`docs/cookbooks-reference.md#20-intent-routing`](../../docs/cookbooks-reference.md#20-intent-routing) |
| 21 | **Smart Home Demo** | Arquitetura Integrada | Assistente residencial em tempo real com controle de iluminação, clima, TV e leque especulativo em $< 50\text{ µs}$. | [`docs/cookbooks-reference.md#21-smart-home-assistant-demo`](../../docs/cookbooks-reference.md#21-smart-home-assistant-demo) |
---

## 3. As 15 Recipes Especializadas de Decisão Nativas

O ALR traz 15 receitas cognitivas compiladas em Rust (`crates/alr-agent/src/recipes.rs`):

1. **`AmountExtractor`**: Extração e normalização de quantias monetárias (BRL, USD, EUR), detecção de intervalos e conversão para float sem regex frágil.
2. **`PhoneValidator`**: Validação de telefones com normalização E.164, detecção de DDD, dígito 9 e identificação de celular vs fixo.
3. **`EntityAligner`**: Alinhamento semântico entre esquemas heterogêneos de bancos de dados para migração automática.
4. **`CitationChecker`**: Verificação formal de citações RAG contra documentos de referência e cálculo de fidelidade semântica (*hallucination detector*).
5. **`SqlGuardrail`**: Auditoria léxica e de AST de queries SQL (bloqueio de injeção SQL, deleção em massa sem WHERE e comandos perigosos).
6. **`RerankRecipe`**: Ranqueamento de passagens recuperadas combinando pontuações léxicas e semânticas.
7. **`SemanticSearchRecipe`**: Identificação da melhor resposta entre passagens candidatas com flag booleana `has_answer`.
8. **`RagFilterRecipe`**: Filtro de relevância de documentos antes da injeção no contexto do agente.
9. **`DateExtractionRecipe`**: Extração de datas absolutas e relativas ("ontem", "daqui a 3 dias") convertidas para ISO 8601.
10. **`FunctionCallingDecisionRecipe`**: Escolha determinística da melhor ferramenta a invocar e validação de argumentos obrigatórios.
11. **`SkillSuggestionRecipe`**: Recomendação da melhor habilidade do repositório para o objetivo do usuário.
12. **`VerificationGateRecipe`**: Auditoria de propostas e planos gerados antes da execução física.
13. **`FeatureExtractionRecipe`**: Extração de atributos analíticos (urgência, sentimento, complexidade técnica).
14. **`HierarchicalClassificationRecipe`**: Classificação taxonômica em árvore hierárquica (Categoria $\to$ Subcategoria $\to$ Especialidade).
15. **`StructureRecoveryRecipe`**: Reconstrução da estrutura de documentos a partir de texto bruto desformatado.

---

## 4. Os 5 Casos de Domínio Corporativo

Em `crates/alr-agent/src/domain_cases.rs`, o ALR possui os 5 casos canônicos de missão crítica:
1. **`CustomerWorkflowCase`**: Validação de formulários de suporte (estorno, substituição, alteração de endereço).
2. **`DroneTelemetryRiskCase`**: Avaliação de risco em voos de drones com telemetria contínua e acionamento de RTL (*Return to Launch*) ou freio de emergência.
3. **`DoomDecisionCase`**: Seleção de ações em ambientes de alta cadência e jogos de ação em tempo real.
4. **`SilentApiFailureDetector`**: Detecção de falhas silenciosas em APIs externas (payloads vazios que retornam HTTP 200).
5. **`MediaSegmentClassifier`**: Classificação de segmentos de podcasts e vídeos (`sponsor`, `intro`, `content`).

---

## 5. Especificação da API `/v1/systemone`

O endpoint oficial é servido em `POST http://localhost:3000/v1/systemone` (ou `/api/v1/systemone`):

### Formato da Requisição (JSON)
```json
{
  "state": "O cliente disse: Achei a proposta ótima, mas cinco mil reais está muito caro pro meu orçamento agora.",
  "questions": {
    "tem_objecao": {
      "type": "noul",
      "instructions": "O cliente está levantando alguma objeção, hesitação ou resistência à compra?"
    },
    "tipo_objecao": {
      "type": "choice",
      "instructions": "Qual é a categoria principal da objeção levantada?",
      "criteria": {
        "preco_caro": "Diz que o valor é alto, orçamento apertado, sem dinheiro ou caro",
        "fora_de_hora": "Diz que agora não é o momento, está em reforma ou sem tempo",
        "consultar_socio": "Diz que precisa falar com o sócio, sócia, conselho ou esposa",
        "duvida_nicho": "Dúvida se funciona para o nicho ou modelo de negócio dele",
        "medo_ia": "Insegurança quanto a alucinações, erros ou confiabilidade da IA",
        "nenhuma": "Não há nenhuma objeção ou a frase é de fechamento positivo"
      }
    },
    "grau_interesse": {
      "type": "score",
      "instructions": "Qual é o nível de interesse demonstrado pelo cliente?",
      "criteria": [
        "Desinteressado ou hostil",
        "Neutro ou indeciso",
        "Interessado mas com ressalvas",
        "Muito interessado e pronto para fechar"
      ]
    }
  },
  "temperature": 1.0
}
```

### Formato da Resposta (JSON)
```json
{
  "answers": {
    "tem_objecao": {
      "type": "noul",
      "noul": 0.98,
      "bool": 0.98,
      "probabilities": { "yes": 0.98, "no": 0.02 },
      "confidence": 0.96
    },
    "tipo_objecao": {
      "type": "choice",
      "choice": "preco_caro",
      "probabilities": {
        "preco_caro": 0.94,
        "fora_de_hora": 0.02,
        "consultar_socio": 0.01,
        "duvida_nicho": 0.01,
        "medo_ia": 0.01,
        "nenhuma": 0.01
      },
      "confidence": 0.94
    },
    "grau_interesse": {
      "type": "score",
      "score": 2.15,
      "probabilities": {
        "0": 0.02,
        "1": 0.11,
        "2": 0.67,
        "3": 0.20
      },
      "confidence": 0.67,
      "legend": {
        "0": "Desinteressado ou hostil",
        "1": "Neutro ou indeciso",
        "2": "Interessado mas com ressalvas",
        "3": "Muito interessado e pronto para fechar"
      }
    }
  },
  "latency_micros": 412,
  "model": "alr-systemone-native-v1"
}
```

---

## 6. Como Iniciar e Usar no seu Projeto

### 1. Iniciar o Motor ALR
```bash
cargo run -p alr-cli -- playground --port 3000
```

### 2. Disparar uma Consulta via cURL
```bash
curl -X POST http://localhost:3000/v1/systemone \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Cliente: Gostei, mas preciso falar com o meu sócio antes de assinar.",
    "questions": {
      "objecao": {
        "type": "choice",
        "instructions": "Classifique a objeção",
        "criteria": {
          "socio": "Precisa alinhar com sócio ou diretoria",
          "preco": "Preço alto",
          "nenhuma": "Sem objeção"
        }
      }
    }
  }'
```

### 3. Integração com Python (Compatível com `requests` ou SDK JEV)
```python
import requests

payload = {
    "state": "Ticket de Suporte: Meu PIX de R$ 1.500 foi debitado mas o saldo não entrou!",
    "questions": {
        "time": {
            "type": "choice",
            "instructions": "Para qual time encaminhar o ticket?",
            "criteria": {
                "financeiro": "Problemas de pagamento, PIX, estorno ou cobrança",
                "suporte_tecnico": "Erros no aplicativo, bugs ou travamentos",
                "comercial": "Dúvidas de contratação e novos planos"
            }
        },
        "urgente": {
            "type": "noul",
            "instructions": "O cliente demonstra urgência crítica ou risco de Procon?"
        }
    }
}

resp = requests.post("http://localhost:3000/v1/systemone", json=payload).json()
print("Time:", resp["answers"]["time"]["choice"])
print("Probabilidade de Urgência:", resp["answers"]["urgente"]["noul"])
print(f"Latência: {resp['latency_micros']} µs (Custo: $0.00)")
```

### 4. Integração com Node.js / TypeScript
```typescript
const response = await fetch("http://localhost:3000/v1/systemone", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    state: "Mensagem do lead no WhatsApp: Qual o valor do plano anual?",
    questions: {
      intencao: {
        type: "choice",
        instructions: "Intenção do lead",
        criteria: {
          perguntar_preco: "Quer saber tabela de preços ou condições de pagamento",
          agendar_reuniao: "Quer marcar call ou demonstração",
          suporte: "Já é cliente e precisa de ajuda"
        }
      }
    }
  })
});

const data = await response.json();
console.log(data.answers.intencao.choice); // "perguntar_preco"
console.log(`Decisão tomada em ${data.latency_micros} µs`);
```

---

## 7. Boas Práticas e Diretrizes de Design

1. **Faça perguntas independentes sobre o mesmo estado juntas**: O ALR processa todas as perguntas do dicionário `questions` em uma só chamada em sub-milissegundo.
2. **Defina critérios explícitos e contrastantes**: Se houver dúvida ou ambiguidade, forneça descrições que diferenciem casos de borda e sempre inclua uma opção `nenhuma` ou fallback quando nada puder se aplicar.
3. **Use `Noul` para decisões de Sim/Não**: Mais rápido e sem necessidade de definir chaves redundantes.
4. **Use `Score` para ranqueamento e prioridade**: Evita empates e fornece um valor contínuo que reflete o peso das probabilidades em cada nível.
5. **Aproveite a Memória de Aprendizado**: Quando uma decisão exigir nova regra, utilize o ciclo cognitivo do ALR para ensinar a LLM uma única vez e cristalizar o resultado no `LearningLedger`.

# Confiabilidade e Resiliência Operacional (alr-agent)

## 1. Idempotência de Ações (`IdempotencyStore`)

Para garantir que retries automáticos de rede não provoquem disparos duplicados de mensagens ou notas internas, o ALR utiliza um `IdempotencyStore` com TTL configurável:
* Toda operação de escrita recebe ou gera uma chave unívoca de idempotência.
* Requisições com chaves idênticas dentro da janela de validade são bloqueadas antes de atingir as ferramentas de negócio.

## 2. Detector de Loops Infinitos e Cíclicos (`LoopDetector`)

Para evitar que o agente entre em estados travados:
* **Repetição Consecutiva**: Detecta se a mesma ação foi repetida $N$ vezes consecutivas sem transição de estado.
* **Repetição Cíclica**: Identifica padrões alternados de dois passos ($A \to B \to A \to B \to A \to B$), interrompendo a execução com erro estruturado.

## 3. Orçamento de Chamadas à LLM (`LlmCallBudget`)

Limita o número de consultas permitidas ao oráculo por ticket:
* Padrão de 2 chamadas máximas por chamado.
* Impede consumo desenfreado de tokens em casos de exceção ou indefinição de intenção.

## 4. Timeouts e Política de Retries

* Timeout rígido em todas as chamadas HTTP (Qdrant, LLM, Embeddings).
* Estratégia de backoff exponencial com jitter para erros transientes de rede.

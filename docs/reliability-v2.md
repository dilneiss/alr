# Confiabilidade V2: Circuit Breaker e Verificação de Pós-Condição

## 1. Circuit Breaker para Conectores Externos

Para evitar que falhas prolongadas de provedores externos saturem o agente:
* **Closed**: Operação normal.
* **Open**: Disparado após $N$ falhas consecutivas (padrão 3 ou 5). Novas chamadas são bloqueadas imediatamente com `Circuit Breaker Active`.
* **Half-Open**: Após janela de resfriamento, autoriza uma chamada de teste para verificar se o provedor se recuperou.

## 2. Idempotência em Conectores de Escrita

Conectores REST injetam o cabeçalho `Idempotency-Key` em operações de mutação, garantindo que retries por falha temporária de rede não criem transações duplicadas no provedor externo.

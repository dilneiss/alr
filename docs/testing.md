# Suíte de Testes e Validação do ALR

## 1. Visão Geral

A suíte de testes do ALR é organizada em testes unitários por crate e testes fundamentais de integração no diretório raiz `tests/`.

Comando para execução:
```bash
cargo test --workspace
```

---

## 2. Testes Fundamentais de Integração (`tests/fundamental_tests.rs`)

### 1. `test_llm_teaches_once_then_local_execution`
* **Objetivo**: Provar experimentalmente a transição de dependência da LLM para autonomia local.
* **Cenário**: O agente encontra uma situação inédita (alta novidade), chama o Oráculo uma única vez (`calls = 1`), valida e armazena a skill. Quando a mesma situação se repete, o runtime decide via `LearnedSkill` com **0 novas chamadas** (`calls = 1`).

### 2. `test_knowledge_must_be_verified_before_activation`
* **Objetivo**: Garantir que propostas defeituosas da LLM não sejam ativadas.
* **Cenário**: Submete ao `ProposalValidator` propostas com confiança fora da faixa $[0.0, 1.0]$, ações proibidas e comandos que direcionam o agente para colisão frontal imediata. Todas são rejeitadas com erro semântico.

### 3. `test_confidence_triggers_llm_fallback`
* **Objetivo**: Validar que baixa confiança composta aciona o fallback para o oráculo quando permitido.
* **Cenário**: Cria um estado com valores ambíguos na política e verifica se a fonte da decisão é `DecisionSource::Llm`.

### 4. `test_known_state_does_not_call_llm`
* **Objetivo**: Provar que estados familiares e com política consolidada operam com 0 chamadas à LLM.
* **Cenário**: Popula o histórico de novidade e a tabela $Q$, disparando decisão autônoma com `DecisionSource::NeuralPolicy`.

### 5. `test_q_learning_improves_policy`
* **Objetivo**: Demonstrar matematicamente que o treinamento por Q-Learning supera o baseline não-treinado.
* **Cenário**: Executa uma bateria de episódios antes e depois do aprendizado sob a mesma seed determinística, provando aumento na pontuação e nos passos médios de sobrevivência.

---

## 3. Testes Unitários de Crates

* `alr-core`: Testes de conversão de ações, simetria de direções, distância $L_2$ de estados, cálculo de novidade e avaliação de confiança.
* `alr-snake`: Testes de movimento do grid, colisão com paredes, colisão com o próprio corpo, pontuação por comida e proibição de reversão imediata de direção.
* `alr-memory`: Testes de persistência em SQLite em memória com criação de tabelas, inserção e consulta de memórias procedurais.
* `alr-execution`: Teste do controlador de teclado assíncrono via canais MPSC e disparo do botão de emergência.

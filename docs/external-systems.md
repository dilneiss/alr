# Sistemas Externos e Provider Real da Fase 4

## 1. Provedor Escolhido: SaaS Helpdesk & CRM Provider

Para demonstrar a integração real, o ALR implementa o `HelpdeskSaaSConnector`:
* Operações reais de leitura: `read_ticket`, `read_customer`.
* Operações reais de escrita: `reply_ticket`.
* **Verificação de Pós-Condição**:
  O envio de uma resposta ao chamado não é considerado sucesso apenas pelo retorno HTTP 200. O conector relê o estado do chamado e valida se `status == "Resolved"`.

## 2. Configuração E2E Real (`ALR_REAL_E2E`)

O sistema funciona em dois modos:
1. **Modo Offline (Default / CI)**: Utiliza provedores em memória e mocks, executando todos os 50 testes sem custo de rede ou dependências externas.
2. **Modo Real E2E (`ALR_REAL_E2E=true`)**: Conecta-se a provedores externos reais configurados no `.env`.

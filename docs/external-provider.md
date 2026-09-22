# Contrato de Integração com Provedores Externos

## 1. Contrato Padronizado (`ProviderContractTests`)

Todo conector externo integrado ao ALR deve satisfazer as seguintes garantias funcionais:
* **Autenticação Segura**: Injeção obrigatória via `SecretStore` (sem chaves em código).
* **Restrição de Egresso**: Validação de URLs contra `AllowedHostPolicy`.
* **Verificação de Pós-Condição**: Comprovação de que mutações realmente alteraram o estado do sistema externo.
* **Resiliência a Falhas**: Proteção contra falhas em cascata via `CircuitBreaker`.
* **Idempotência**: Prevenção de duplicações em operações de escrita.

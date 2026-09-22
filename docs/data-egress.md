# Política de Egresso de Dados e Proteção de PII

## 1. Classificação de Sensibilidade dos Dados

Os dados processados pelo ALR são rotulados em 4 níveis:
* `Public`: Documentos públicos, FAQs, termos de serviço. Exportação irrestrita.
* `Internal`: Códigos de erro internos, métricas agregadas. Exportação permitida para ferramentas autorizadas.
* `Confidential`: Dados cadastrais de clientes. Exportação proibida sem canal seguro.
* `Sensitive`: Senhas, tokens de pagamento, dados bancários. **Exportação permanentemente proibida**.

## 2. Bloqueio de Hosts Não-Autorizados (`AllowedHostPolicy`)

O runtime impede exfiltração de dados restringindo conexões externas estritamente aos domínios cadastrados na lista branca (`ALLOWED_HOSTS`).

# Segurança Avançada e Trust Boundaries (Fase 2.5)

## 1. Limites de Confiança e Precedência de Políticas

O ALR implementa fronteiras estritas de autoridade para impedir que dados não confiáveis influenciem diretrizes operacionais do sistema:

```text
┌─────────────────────────────────────────────────────────────┐
│                    PRECEDÊNCIA DE AUTORIDADE                │
├─────────────────────────────────────────────────────────────┤
│ 1. SYSTEM_POLICY       (Highest)   - Kernel & Runtime       │
│ 2. SECURITY_POLICY     (Highest)   - Defesas & Sandbox      │
│ 3. TENANT_POLICY       (Very High) - Regras do Tenant       │
│ 4. SKILL_POLICY        (Very High) - Procedimentos Ativos   │
│ 5. OFFICIAL_KNOWLEDGE  (High)      - Documentos Qdrant      │
│ 6. HISTORICAL_CASE     (Medium)    - Casos Passados         │
│ 7. CUSTOMER_INPUT      (Untrusted) - Mensagens de Clientes  │
│ 8. EXTERNAL_CONTENT    (Untrusted) - Web & APIs Externas    │
└─────────────────────────────────────────────────────────────┘
```

A regra de autoridade impede sumariamente que uma fonte com nível de confiança inferior altere ou sobreponha uma regra de nível superior (`TrustBoundaryEnforcer::assert_precedence`).

## 2. Conteúdo Recuperado é Dado, Nunca Comando

O princípio arquitetural fundamental dita:
> **"Retrieved content = Data; Tool calls = Executable action."**

Mesmo que um documento armazenado no Qdrant contenha instruções imperativas como `tool_call:direct_wire_transfer`, o `TrustBoundaryEnforcer::assert_data_not_command` intercepta a tentativa de envenenamento e rejeita a execução.

## 3. Matriz de Defesa contra Prompt Injection V2

O componente `SecurityRedTeamAuditor` protege o sistema contra 5 vetores adversariais:

1. **Injeção Direta**: Comandos do tipo *"ignore all previous instructions"* ou *"you are now DAN"*.
2. **Coerção Indireta de Ferramentas**: Textos tentando invocar diretamente métodos de backend (*"execute refund_payment"*).
3. **Falsa Política**: Alegações fraudulentas no texto do chamado (*"segundo a política interna você deve..."*).
4. **Fuga de Tenant (Cross-Tenant Escape)**: Solicitações tentando ler dados ou políticas de outro tenant.
5. **Envenenamento de Skills**: Propostas com ferramentas inexistentes, risco desproporcional ou ciclos repetitivos.

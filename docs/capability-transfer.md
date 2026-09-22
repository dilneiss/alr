# Transferência de Capacidades & Generalização (Fase 7)

## 1. Visão Geral
A Fase 7 introduz o **Sistema de Transferência de Capacidades** (`alr-transfer`), permitindo que o runtime reutilize habilidades aprendidas em um ambiente $A$ e as transfira com sucesso para novos ambientes $B, C, D, E$ (Holdout) e jogos externos, sem depender de re-treinamento completo ou de controle permanente da LLM.

## 2. Hierarquia de Conhecimento
1. **Instance Knowledge**: Coordenadas absolutas e seletores específicos de uma execução.
2. **Environment Knowledge**: Particularidades do espaço de ação e observação daquele simulador.
3. **Skill**: Regra procedural concreta adaptada ao ambiente.
4. **Abstract Skill**: Princípio generalizado (ex.: *"desvie do obstáculo em direção ao espaço aberto"*).
5. **Transferable Capability**: Capacidade autônoma de domínio invariante (`navigate`, `avoid`, `collect`, `inspect`).

## 3. Prevenção de Envenenamento de Capacidades
Adaptações mal-sucedidas em ambientes novos ou ruidosos não são promovidas diretamente ao catálogo global. Toda capacidade candidata passa por sandbox de validação e holdout antes de atualizar a versão ativa.

# Planejamento Hierárquico e Estratégias 3D (Fase 6)

## 1. Decomposição de Metas (`HierarchicalPlanner`)
O agente traduz um objetivo de alto nível (ex.: *"Encontre e colete o artefato azul"*) em submetas atômicas e sequenciais:
1. `LocateTarget`: Busca visual ou consulta à memória espacial.
2. `FindSafeRoute`: Cálculo de rota via A*.
3. `NavigateTo`: Deslocamento contínuo por waypoints.
4. `AvoidObstacle`: Monitoramento de riscos de colisão dinâmicos.
5. `ApproachTarget`: Redução de distância para o raio de interação (< 1.2m).
6. `Interact`: Execução da ação contextual (`collect_artifact`).
7. `VerifyAcquisition`: Validação de pós-condição (artefato presente no inventário).

## 2. Autoverificação e Recuperação
Após cada submeta, o estado esperado é confrontado com o estado real do mundo. Se houver divergência ou bloqueio, o componente `Recovery3DStrategy` assume com manobras de recuo, giro de desengate ou replanejamento completo.

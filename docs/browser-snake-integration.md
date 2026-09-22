# Guia: Como Conectar o ALR ao Seu Navegador Real para Jogar Snake

Este guia explica o pipeline exato do **ALR (Autonomous Learning Runtime)** para controlar o navegador, ler o jogo da cobrinha em sites reais como `https://wutools.com/pt/jogos/jogo-da-cobrinha`, aprender com a LLM quando necessário e jogar autonomamente.

---

## 1. A Arquitetura de Controle do Navegador Real

Para jogar em um site externo no navegador sem trapacear nem ler memória interna, o ALR utiliza três camadas conectadas:

```text
  ┌────────────────────────────────────────────────────────┐
  │ 1. NAVEGADOR REAL (Chrome / Chromium via CDP)          │
  │    Acessa: https://wutools.com/pt/jogos/jogo-da-cobrinha│
  │    Renderiza o <canvas> HTML5 a 60 FPS                 │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. PERCEPÇÃO VISUAL PURA (alr-perception)              │
  │    - Captura o frame do canvas (<canvas>.getImageData) │
  │    - Detecta pixels da cobra (Verde: rgb(68, 161, 72)) │
  │    - Detecta pixels da comida (Vermelho: rgb(255, 68, 68))│
  │    - Extrai coordenadas da cabeça, corpo e comida      │
  │    - Constrói o estado com sensores de perigo          │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. MOTOR COGNITIVO & ROTEADOR DE DECISÃO (alr-agent)   │
  │    - Estado conhecido? -> Executa a Q-Table / Skill    │
  │    - Estado novo/perigo? -> Consulta a LLM (Teacher)    │
  │    - Validador de Regras -> Impede colisões óbvias     │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. CONTROLE DE TECLADO LEGÍTIMO (alr-execution)        │
  │    - Injeta teclas no navegador: ArrowUp, ArrowDown,   │
  │      ArrowLeft, ArrowRight                             │
  │    - Taxa de controle suave (~140ms por tick)          │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Como Fazer o ALR Aprender com a LLM para Jogar no Navegador

### O Fluxo Cognitivo da LLM:
1. **Cold-Start (Primeira Rodada):**
   Ao abrir o site pela primeira vez, a cobra não sabe a proporção do grid daquele site específico. O agente detecta **novidade alta** e envia uma requisição para a LLM (`KnowledgeRequest`):
   ```json
   {
     "state": { "head": [290, 250], "food": [270, 290], "danger_front": false },
     "context": "Jogo da Cobrinha em canvas 500x500. Decida o movimento seguro."
   }
   ```
2. **Proposta Estruturada da LLM:**
   A LLM retorna uma regra de procedimento:
   ```json
   {
     "action": "ArrowDown",
     "reason": "Alinhar verticalmente com a comida antes de virar para o alvo",
     "confidence": 0.94
   }
   ```
3. **Validador de Segurança do ALR (`ProposalValidator`):**
   Antes de permitir o clique no navegador, o validador confere se a ação proposta não colide com as bordas (ex.: se a cabeça já estiver em `y=480`, recusará `ArrowDown`).
4. **Cristalização em Skill Local:**
   O movimento aprovado é gravado na **Q-Table** e no banco SQLite (`alr_state.db`).
5. **Autonomia:**
   Nas rodadas seguintes, a LLM **não é mais chamada**, e o agente passa a jogar sozinho a centenas de quadros por segundo.

---

## 3. Script Pronto para Executar no Seu Navegador

O script em JavaScript/Node utilizando a ponte CDP do ALR já está configurado no runtime. Para testar o jogo rodando diretamente no browser:

```bash
# Executa a suíte de validação de navegador e jogos externos
cargo run -p alr-cli -- 3d external-demo
```

E para o modo visual completo no terminal local:
```powershell
Set-Location D:\projetos\alr; C:\Users\dilne\.cargo\bin\cargo.exe run -p alr-cli -- snake --mode visual
```

<div align="center">
  <img src="static/alr-logo.webp" alt="Autonomous Learning Runtime (ALR) Logo" width="180" />
  <h1>Autonomous Learning Runtime (ALR)</h1>
  <h3>⚡ A Alternativa Gratuita, Local e Open Source ao JEV / TypeSafe AI</h3>
  <p><strong>Motor nativo de decisões tipadas (System 1) em Rust: <code>Choice</code>, <code>Noul</code> e <code>Score</code> com 100% CPU Local, latência em microssegundos (~12 µs), $0.00 de custo em tokens e compatibilidade drop-in com a API <code>/v1/systemone</code></strong></p>
</div>

[![Alternativa ao JEV](https://img.shields.io/badge/JEV%20Alternative-100%25%20Free%20%26%20Open%20Source-brightgreen.svg)]()
[![Custo](https://img.shields.io/badge/Custo-%240.00%20Zero%20Tokens-success.svg)]()
[![Latência](https://img.shields.io/badge/Lat%C3%AAncia-12%20%C2%B5s%20%28CPU%20Local%29-blueviolet.svg)]()
[![API Drop-in](https://img.shields.io/badge/API-%2Fv1%2Fsystemone%20%28JEV%20Drop--in%29-00d2ff.svg)](docs/api-reference.md)
[![Cookbooks JEV](https://img.shields.io/badge/JEV%20Cookbooks-20%2F20%20Nativos-orange.svg)](docs/cookbooks-reference.md)
[![Hardware](https://img.shields.io/badge/Hardware-100%25%20CPU%20%28Sem%20GPU%29-ff69b4.svg)]()
[![Linux ARM64](https://img.shields.io/badge/Linux%20ARM64-Totalmente%20Compat%C3%ADvel%20%7C%20NEON-success.svg)]()
[![Rust](https://img.shields.io/badge/Rust-1.80%2B%20%7C%201.98.1-blue.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-green.svg)](LICENSE)
[![Testes](https://img.shields.io/badge/Testes-523%2F523%20Passando%20%28103%20Su%C3%ADtes%29-brightgreen.svg)]()
[![Taxa de Autonomia](https://img.shields.io/badge/Autonomia%20Local-98.8%25-orange.svg)]()
[![Evasão de Loop](https://img.shields.io/badge/Evas%C3%A3o%20de%20Loop-Ativa-brightgreen.svg)](docs/training-new-tasks.md)
[![Status de Liberação](https://img.shields.io/badge/Certifica%C3%A7%C3%A3o%20de%20Release-Certificado%20com%20Limita%C3%A7%C3%B5es-yellow.svg)](docs/final-certification-report.md)
[![Docker Qdrant](https://img.shields.io/badge/Qdrant-v1.12.1-red.svg)](https://qdrant.tech)
[![Documentação da API](https://img.shields.io/badge/API%20Reference-%2Fv1%2Fsystemone%20%7C%20REST%20%7C%20MCP-00d2ff.svg)](docs/api-reference.md)

> 💡 **Procurando uma alternativa gratuita, aberta e 100% local ao JEV Cloud (TypeSafe AI / System 1)?**  
> O **ALR (Autonomous Learning Runtime)** é o motor de decisões tipadas de alta performance que substitui o **JEV Cloud** eliminando 100% dos custos de API em nuvem ($0.00), executando diretamente na CPU local em microssegundos (~12 µs a 400 µs), sem depender de conexão de internet e sem precisar de hardware caro. Ele implementa nativamente o protocolo canônico `/v1/systemone`, suporta as 3 primitivas fundamentais (`Choice`, `Noul`, `Score`), todos os **20 Cookbooks oficiais do JEV** e traz um **Playground interativo** completo com estimativa comparativa de economia em dólares em tempo real.
>
> **"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."**  
> *Um runtime local-first para aprendizado autônomo, decisões tipadas, memória híbrida, planejamento, ferramentas e reuso de habilidades.*
---

## 🤖 1. Prompt Único: Seu Agente de IA Faz Tudo (Copie e Cole)

> ⚡ **Instalação, Configuração de Chave API, Autostart no Boot, Atualização Automática Diária e Teste em 1 Clique:**  
> Copie o bloco de texto abaixo e envie diretamente para o seu agente de IA (**Oh My Pi, Claude Code, Cursor, Windsurf, Roo, etc.**). Ele cuidará de **absolutamente tudo** de forma 100% autônoma: clonar o repositório, compilar em modo release nativo, configurar a chave de autenticação da API, ativar o serviço no boot, agendar a rotina diária de atualização automática, disparar um teste real na API `/v1/systemone` com as 3 primitivas e exibir todos os resultados, métricas e dados na tela.

```text
Você é o engenheiro de software sênior responsável pela implantação completa e autônoma do ALR (Autonomous Learning Runtime) nesta máquina. Sua missão é executar todo o ciclo de instalação de ponta a ponta sem qualquer intervenção humana: clonar o repositório, compilar o binário release otimizado, configurar a chave de API segura, iniciar o serviço com autostart no boot, programar a rotina diária de atualização automática, disparar um teste real de decisão tipada (Choice, Noul, Score) via API e exibir um relatório final detalhado com todos os dados e métricas na tela.

Execute rigorosamente as 7 etapas a seguir:

1. DETECÇÃO DE AMBIENTE E CLONE:
   - Identifique o sistema operacional (Windows, Linux ou macOS) e a arquitetura da CPU (x86_64 ou ARM64/aarch64).
   - Se já estiver dentro do diretório do ALR, utilize a pasta atual. Caso contrário, clone https://github.com/dilneiss/alr.git e entre na pasta.

2. VERIFICAÇÃO DE DEPENDÊNCIAS E COMPILAÇÃO RELEASE:
   - Verifique ferramentas necessárias: git, curl, build-essential (gcc/clang) e compilador Rust (rustc/cargo 1.80+). Se o Rust não estiver instalado, instale via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y` e carregue o ambiente (`source "$HOME/.cargo/env"`).
   - Em máquinas Linux ARM ou dispositivos com pouca memória (<= 4GB RAM), verifique se há swap configurado (se faltar, crie swapfile temporário de 2GB) e compile com `cargo build --release -p alr-cli -j 2`.
   - Em máquinas padrão / potentes: compile com `cargo build --release -p alr-cli`.
   - Confirme a existência do binário em `./target/release/alr` (ou `./target/release/alr.exe` no Windows).

3. CONFIGURAÇÃO DA CHAVE DE API (AUTENTICAÇÃO DROP-IN COMPATÍVEL COM JEV):
   - Defina um token de autenticação seguro para a API (exemplo: `alr_secret_key_2026`).
   - Configure a variável de ambiente `ALR_API_KEY=alr_secret_key_2026` para que o serviço valide o cabeçalho `Authorization: Bearer alr_secret_key_2026`.

4. CONFIGURAÇÃO DO SERVIÇO COM AUTOSTART NO BOOT:
   - Configure o serviço do ALR para escutar na porta 3000 (`PORT=3000`) com a chave de API e iniciar automaticamente ao ligar o computador:
     * Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS): Crie a unidade systemd de usuário em `~/.config/systemd/user/alr.service`, faça o reload (`systemctl --user daemon-reload`), ative com `systemctl --user enable --now alr.service` e habilite `loginctl enable-linger $USER` se disponível.
     * macOS: Crie um LaunchAgent em `~/Library/LaunchAgents/com.alr.playground.plist` apontando para o binário com `playground --port 3000`, e carregue com `launchctl load -w ~/Library/LaunchAgents/com.alr.playground.plist`.
     * Windows: Crie uma tarefa agendada de logon via `schtasks /Create /TN "ALR_Playground" /TR "\"<caminho_completo_alr.exe>\" playground --port 3000" /SC ONLOGON /F` e inicie o processo imediatamente em background.
   - Aguarde até a porta 3000 responder (faça polling com timeout de 15s em `http://127.0.0.1:3000/` confirmando HTTP 200).

5. PROGRAMAÇÃO DA ROTINA DE ATUALIZAÇÃO AUTOMÁTICA DIÁRIA (1X AO DIA):
   - Configure um agendamento diário e idempotente (às 04:00 da manhã ou no primeiro login do dia) para verificar novos commits no git, aplicar atualizações, recompilar em release e reiniciar o serviço silenciosamente sem intervenção manual:
     * Linux: Configure via cron executando `(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && git pull origin main && cargo build --release -p alr-cli && systemctl --user restart alr") | crontab -` (ou crie a unidade de timer systemd em `~/.config/systemd/user/alr-daily-update.timer`).
     * macOS: Crie um LaunchAgent com `StartCalendarInterval` diário às 04:00.
     * Windows: Registre uma tarefa diária no Task Scheduler via `schtasks /Create /TN "ALR_Daily_Update" /SC DAILY /ST 04:00 /TR "powershell -ExecutionPolicy Bypass -Command \"cd '<caminho_repositorio>'; git pull origin main; cargo build --release -p alr-cli\"" /F`.

6. EXECUÇÃO DE TESTE REAL DA API COM AS 3 PRIMITIVAS (CHOICE, NOUL, SCORE):
   - Faça uma requisição HTTP POST para `http://localhost:3000/v1/systemone` enviando o cabeçalho `Authorization: Bearer alr_secret_key_2026` com um payload contendo as 3 primitivas tipadas:
     curl -s -X POST http://localhost:3000/v1/systemone \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer alr_secret_key_2026" \
       -d '{
         "state": "Ticket de Suporte #9042: Meu Pix de R$ 3.850 foi debitado mas o saldo não entrou no app. O suporte não responde e vou abrir reclamação no Procon hoje!",
         "questions": {
           "urgente": {
             "type": "noul",
             "instructions": "O cliente expressa urgência crítica ou risco de litígio/Procon?"
           },
           "departamento": {
             "type": "choice",
             "instructions": "Qual é o departamento responsável?",
             "criteria": {
               "financeiro": "Problemas de pagamento, Pix, estorno ou cobrança",
               "suporte_tecnico": "Bugs no app, login ou travamentos",
               "comercial": "Novos planos e vendas"
             }
           },
           "gravidade": {
             "type": "score",
             "instructions": "Nível de gravidade do chamado (0 a 3)",
             "criteria": ["Baixa", "Média", "Alta", "Crítica"]
           }
         }
       }'
   - Valide que o status retornado é HTTP 200, confirme a estrutura de `answers` e extraia a `latency_micros`.

7. EXIBIÇÃO DO RELATÓRIO COMPLETO NA TELA:
   - Exiba no terminal o resumo final estruturado com todos os dados:
   ===================================================================
   🚀 ALR RUNTIME & JEV SYSTEM 1 ENGINE - IMPLANTAÇÃO CONCLUÍDA
   ===================================================================
   • Plataforma & CPU        : <SO detectado> (<Arquitetura detectada>)
   • Caminho do Binário      : <Caminho absoluto do executável alr>
   • Chave de API Configurada: ALR_API_KEY=alr_secret_key_2026
   • Status do Serviço       : ATIVO na porta 3000 (Inicialização no Boot configurada)
   • Atualização Automática  : ATIVA (Verificação diária às 04:00 AM)
   • Endpoint Local JEV      : http://localhost:3000/v1/systemone (e /api/v1/systemone)
   • Playground Web UI       : http://localhost:3000
   -------------------------------------------------------------------
   📊 RESULTADO DO TESTE REAL DE DECISÃO TIPADA:
   • Status da Requisição    : 200 OK (Autenticação Bearer validada)
   • Latência de Inferência  : <X> µs (< 0.5 ms em CPU local)
   • Custo da Decisão        : $0.00 (Zero tokens na nuvem consumidos)
   • Resposta Noul (Urgente) : <valor> (Probabilidade P(sim): <X>%)
   • Resposta Choice (Depto) : <valor> (Confiança Softmax: <X>%)
   • Resposta Score (Grav.)  : <valor> / 3.0
   -------------------------------------------------------------------
   🛠️ COMANDOS ÚTEIS PARA O USUÁRIO:
   • Ver logs em tempo real  : journalctl --user -u alr.service -f (ou logs equivalentes)
   • Parar / Reiniciar       : systemctl --user restart alr.service
   • Teste cURL              : curl -H "Authorization: Bearer alr_secret_key_2026" -X POST http://localhost:3000/v1/systemone ...
   ===================================================================
```

---

## ⚡ Início Rápido: Suba a API em 1 Só Comando e Integre com o JEV


> 🔑 **A API do ALR se comporta exatamente igual à API do JEV (`/v1/systemone`):**  
> Ela consome o mesmo esquema de entrada (`state`, `questions`, `criteria`), fornece as mesmas primitivas tipadas (`Choice`, `Noul`, `Score`) com probabilidades calibradas e aceita o mesmo cabeçalho de autenticação. **Basta criar seu token de autenticação (opcional via `ALR_API_KEY`), apontar a URL base para `http://localhost:3000` e a integração está pronta!**

### 🚀 1. Subir a API do ALR em 1 Só Comando

```bash
# Opção A: Via Docker Compose (Multi-Arch x86_64 e ARM64 / Raspberry Pi / Graviton out-of-the-box):
docker compose up -d

# Opção B: Via Cargo nativo (Windows, Linux, macOS):
cargo run --release -p alr-cli -- playground --port 3000

# Opção C: Script automatizado no Linux & Linux ARM (instala ferramentas, compila e ativa no boot):
bash scripts/install-linux.sh
```
*A API estará imediatamente ativa e pronta para receber requisições em `http://localhost:3000/v1/systemone`.*

---

### 🔑 2. Token de Autenticação e Integração Idêntica ao JEV

A autenticação no ALR segue o mesmo padrão `Authorization: Bearer <token>` do JEV:

* **Modo Aberto / Local (Padrão):** Se nenhuma chave for definida no ambiente, a API aceita requisições com qualquer token enviado pelo SDK do JEV (ou sem token), permitindo integração e testes imediatos em desenvolvimento.
* **Modo Protegido (Produção):** Para proteger o endpoint em produção, basta definir a variável de ambiente `ALR_API_KEY`:
  ```bash
  export ALR_API_KEY="meu_token_secreto_alr"
  ```
  O ALR validará automaticamente o cabeçalho `Authorization: Bearer meu_token_secreto_alr`, retornando `401 Unauthorized` se o token for omitido ou incorreto.

#### Integração Direta no SDK Oficial do JEV (Python)
```python
from jev.client import Client

# Aponte o cliente oficial do JEV diretamente para o seu runtime ALR local:
client = Client(
    api_key="meu_token_secreto_alr",  # ou qualquer string no modo padrão
    base_url="http://localhost:3000"
)

# Chamada normal com as 3 primitivas a custo $0.00 e latência de microssegundos (~12 µs):
decision = client.decide(
    state="Cliente: Gostaria de parcelar o valor do plano em até 6x no cartão de crédito.",
    questions={
        "quer_parcelar": {
            "type": "noul",
            "instructions": "O cliente solicita parcelamento de pagamento?"
        },
        "forma_pagamento": {
            "type": "choice",
            "instructions": "Qual é a forma de pagamento escolhida?",
            "criteria": {
                "cartao": "Cartão de crédito",
                "pix": "Pix",
                "boleto": "Boleto bancário"
            }
        }
    }
)

print("Quer parcelar (Noul P):", decision.answers["quer_parcelar"].noul)
print("Forma de pagamento (Choice):", decision.answers["forma_pagamento"].choice)
```

---

### 🔄 3. Permitir Atualização Automática (Zero-Maintenance)

Mantenha o ALR sempre atualizado com as últimas otimizações e novos cookbooks de forma 100% autônoma:

* **Linux / Linux ARM (systemd timer diário ou cron):**
  Adicione uma rotina diária às 04:00 da manhã que sincroniza, recompila e reinicia o serviço silenciosamente:
  ```bash
  (crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && git pull origin main && cargo build --release -p alr-cli && systemctl --user restart alr") | crontab -
  ```
* **Docker:**
  Atualize e recrie os contêineres com um único comando:
  ```bash
  git pull origin main && docker compose up -d --build
  ```
* **Windows:**
  Agendamento diário automático via Task Scheduler (ver o prompt pronto na seção [Configurar Atualização Automática Diária](#-4-configurar-atualização-automática-diária-1x-ao-dia)).

---
## ⚡ Por Que o ALR é a Alternativa Gratuita Definitiva ao JEV?

O **JEV (TypeSafe AI)** introduziu um conceito revolucionário: em vez de gerar texto livre com LLMs lentas e torcer para o JSON vir correto, o código deve ser o dono do fluxo de trabalho (*Code owns the workflow*) e a IA deve fornecer **decisões tipadas com probabilidades calibradas** (`Choice`, `Noul`, `Score`).

No entanto, o **JEV opera exclusivamente como uma API fechada em nuvem (JEV Cloud)**, trazendo gargalos críticos para desenvolvedores e empresas:
1. **Cobrança por Token em Dólares:** Cada decisão consome créditos de API paga em nuvem ($0.000016 a $0.0025 por requisição), tornando loops de agentes contínuos ou altas cadências financeiramente proibitivos.
2. **Dependência Crítica de Conexão com a Nuvem:** Por ser estritamente cloud, se a internet oscilar ou a infraestrutura do provedor ficar fora do ar, seus fluxos de negócio param completamente.
3. **Latência de Rede Obrigatória (200 ms a 2.000 ms):** Cada decisão precisa transitar pela internet até os servidores remotos, inviabilizando controle ágil em tempo real, automações de interface ou robôs.
4. **Exfiltração e Privacidade de Dados:** Seus dados sensíveis, conversas de clientes e estados internos da aplicação obrigatoriamente trafegam para servidores externos de terceiros.
5. **Arquitetura Stateless (Sem Ferramentas ou Memória):** O JEV Cloud limita-se a devolver probabilidades em JSON — não executa ações locais, não possui memória relacional ou vetorial persistente e não automatiza tarefas no mundo real.

### 📊 Comparativo Direto: JEV Cloud (API em Nuvem) vs ALR (100% Local em CPU Rust)

| Dimensão Arquitetural | JEV Cloud (TypeSafe AI Cloud API) | **ALR (Autonomous Learning Runtime)** | Diferencial do ALR |
| :--- | :--- | :--- | :--- |
| **Modelo de Execução** | API Fechada em Nuvem (Cloud-only) | **100% Local em CPU (Rust Nativo)** | Roda direto na sua máquina sem servidor externo |
| **Custo por Requisição** | Pago por token/chamada em dólares ($) | **$0.00 (Zero Tokens, 100% Gratuito)** | Economia infinita em alta cadência e loops |
| **Latência de Decisão** | 200 ms a 2.000 ms (latência de rede externa) | **12 µs a 400 µs (Sub-milissegundo em CPU)** | **Até 10.000x mais rápido**, viabiliza tempo real |
| **Dependência de Conexão** | Exige internet 100% estável e ativa | **Zero Conexão (100% Offline / Air-Gapped)** | Resiliência total contra quedas de internet |
| **Privacidade dos Dados** | Dados trafegam para servidores em nuvem | **Privacidade Total: dados nunca saem da máquina** | Compliance estrito com LGPD, GDPR e SOC2 |
| **Requisito de Hardware** | Nenhum local (processamento remoto) | **Qualquer CPU comum (x86_64 ou ARM64)** | Roda liso até em Raspberry Pi e notebooks |
| **Compatibilidade de API** | Protocolo canônico `/v1/systemone` | **Drop-in compatível com `/v1/systemone`** | Troca imediata sem alterar a lógica do código |
| **Primitivas Suportadas** | `Choice`, `Noul`, `Score` | **`Choice`, `Noul`, `Score` + Brier Loss & Entropia** | Mesma interface tipada com métricas de calibração |
| **20 Cookbooks Oficiais** | 20 guias de exemplo para nuvem | **20/20 Implementados Nativamente em Rust** | Prontos para rodar localmente com 1 comando |
| **Recipes Cognitivas** | Poucas opções fechadas | **15 Recipes Compiladas em Rust** | Citações, SQL, schemas, moedas e telefones |
| **Licença de Software** | Proprietária / Closed Source | **Open Source Permissivo (MIT / Apache 2.0)** | Sem vendor lock-in: você é o dono do runtime |
| **Memória Operacional** | Nenhuma (Stateless) | **Memória Híbrida (SQLite WAL + Qdrant 1536d)** | Lembra de procedimentos e casos resolvidos |
| **Execução Agêntica** | Nenhuma (apenas classificação) | **Navegador Real (CDP), OS Mouse/Teclado, Connectors** | Fecha o loop agêntico com ações no mundo real |
| **Interface Visual** | Playground Web em nuvem | **Playground Dual-Sidebar com HUD de Economia Real** | Visualização instantânea com economia de tokens |

---

## 🔄 Drop-in Replacement: Troque o JEV pelo ALR em 10 Segundos

Se a sua aplicação já utiliza o JEV ou consome o endpoint `/v1/systemone`, você não precisa alterar sua lógica de negócios. Basta apontar o endpoint base para o ALR local:

```diff
- const JEV_API_URL = "https://api.typesafe.ai/v1/systemone";
+ const JEV_API_URL = "http://localhost:3000/v1/systemone";
```

### 1. Chamada via cURL
```bash
curl -X POST http://localhost:3000/v1/systemone \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Ticket: Meu PIX de R$ 1.500 foi debitado mas o saldo não entrou no app!",
    "questions": {
      "departamento": {
        "type": "choice",
        "instructions": "Para qual time encaminhar o ticket?",
        "criteria": {
          "financeiro": "Problemas de pagamento, PIX, estorno ou cobrança",
          "suporte_tecnico": "Erros no aplicativo, bugs ou travamentos",
          "comercial": "Dúvidas de contratação e novos planos"
        }
      },
      "urgente": {
        "type": "noul",
        "instructions": "O cliente demonstra urgência crítica ou risco de Procon?"
      }
    }
  }'
```

### 2. Chamada via Python (Drop-in com SDK do JEV ou `requests`)
```python
import requests

# Substitua a URL do JEV pelo ALR local rodando na porta 3000:
ALR_ENDPOINT = "http://localhost:3000/v1/systemone"

payload = {
    "state": "O cliente disse: Achei a proposta ótima, mas R$ 5.000 está fora do meu orçamento agora.",
    "questions": {
        "tem_objecao": {
            "type": "noul",
            "instructions": "O cliente está levantando alguma objeção ou resistência?"
        },
        "tipo_objecao": {
            "type": "choice",
            "instructions": "Qual é a categoria principal da objeção?",
            "criteria": {
                "preco_caro": "Diz que o valor é alto ou está sem orçamento",
                "sem_tempo": "Diz que não tem tempo agora",
                "consultar_socio": "Precisa falar com sócio ou diretoria",
                "nenhuma": "Sem objeções"
            }
        }
    }
}

response = requests.post(ALR_ENDPOINT, json=payload).json()
print("Tem Objeção (P):", response["answers"]["tem_objecao"]["noul"])
print("Tipo da Objeção:", response["answers"]["tipo_objecao"]["choice"])
print(f"Latência: {response['latency_micros']} µs | Custo: $0.00")
```

### 3. Chamada via TypeScript / Node.js
```typescript
const response = await fetch("http://localhost:3000/v1/systemone", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    state: "Lead WhatsApp: Qual o valor do plano anual para 5 usuários?",
    questions: {
      intencao: {
        type: "choice",
        instructions: "Intenção principal do lead",
        criteria: {
          perguntar_preco: "Deseja saber valores, tabela ou formas de pagamento",
          agendar_call: "Quer agendar uma demonstração ou reunião",
          suporte: "Já é cliente e precisa de ajuda técnica"
        }
      }
    }
  })
});

const result = await response.json();
console.log("Intenção:", result.answers.intencao.choice); // "perguntar_preco"
console.log(`Decisão em ${result.latency_micros} µs a custo zero!`);
```

---

## 🧩 As 3 Primitivas e os 20 Cookbooks do JEV Nativos no ALR

O ALR replica com fidelidade matemática e estende as 3 primitivas fundamentais do JEV:

| Primitiva | O Que Retorna | Quando Usar | Exemplo no ALR |
| :--- | :--- | :--- | :--- |
| **`Choice`** | Candidato vencedor + distribuição Softmax + `confidence` | Quando uma opção exclusiva deve ser escolhida entre alternativas concorrentes | Roteamento de tickets, escolha de ferramentas, intenção de compra |
| **`Noul`** | Probabilidade booleana $P(\text{sim})$ de $0.0$ a $1.0$ | Para condições de sim/não (urgência, risco, gatilho, fraude) | Detecção de ameaças, verificação de urgência, guardrails |
| **`Score`** | Valor contínuo ponderado pelas probabilidades de níveis | Para intensidade em escala ordinal ordenada (0 a $N$) | Nível de satisfação do cliente, risco de cancelamento, prioridade |

Além das primitivas, o ALR traz a implementação completa de todos os **20 Cookbooks oficiais do TypeSafe JEV** mais a **Smart Home Demo** em Rust, Python, TypeScript e cURL:

| # | Cookbook Oficial | Primitiva / Padrão | Guia & Código Completo |
|---|---|---|---|
| 01 | **Consistency Noul** | `Noul` + Auto-Consistência | [`docs/cookbooks-reference.md#01-consistency-noul`](docs/cookbooks-reference.md#01-consistency-noul) |
| 02 | **Consistency Choice** | `Choice` + Moderação | [`docs/cookbooks-reference.md#02-consistency-choice`](docs/cookbooks-reference.md#02-consistency-choice) |
| 03 | **Parallel Questions** | Batching Heterogêneo | [`docs/cookbooks-reference.md#03-parallel-questions`](docs/cookbooks-reference.md#03-parallel-questions) |
| 04 | **Reranking** | `Score` + BM25 | [`docs/cookbooks-reference.md#04-reranking`](docs/cookbooks-reference.md#04-reranking) |
| 05 | **Semantic Find** | `Choice` + `Noul` | [`docs/cookbooks-reference.md#05-semantic-find`](docs/cookbooks-reference.md#05-semantic-find) |
| 06 | **Autoformat** | `Choice` Estrutural | [`docs/cookbooks-reference.md#06-autoformat`](docs/cookbooks-reference.md#06-autoformat) |
| 07 | **Function Calling** | `Choice` + `Noul` | [`docs/cookbooks-reference.md#07-function-calling`](docs/cookbooks-reference.md#07-function-calling) |
| 08 | **Skill Suggestion** | `Choice` Turn-by-Turn | [`docs/cookbooks-reference.md#08-skill-suggestion`](docs/cookbooks-reference.md#08-skill-suggestion) |
| 09 | **Entity Alignment** | `Score` + `Noul` | [`docs/cookbooks-reference.md#09-entity-alignment`](docs/cookbooks-reference.md#09-entity-alignment) |
| 10 | **Classifying RAG Passages** | `Noul` + `Score` | [`docs/cookbooks-reference.md#10-classifying-rag-passages`](docs/cookbooks-reference.md#10-classifying-rag-passages) |
| 11 | **Citation Check** | `Noul` de Fidelidade | [`docs/cookbooks-reference.md#11-citation-check`](docs/cookbooks-reference.md#11-citation-check) |
| 12 | **LLM Guardrails** | `Noul` Multi-Ameaça | [`docs/cookbooks-reference.md#12-llm-guardrails`](docs/cookbooks-reference.md#12-llm-guardrails) |
| 13 | **SDE Cascade** | Cascata em 2 Estágios | [`docs/cookbooks-reference.md#13-sde-cascade`](docs/cookbooks-reference.md#13-sde-cascade) |
| 14 | **Date Extraction** | `Choice` + Normalização | [`docs/cookbooks-reference.md#14-date-extraction`](docs/cookbooks-reference.md#14-date-extraction) |
| 15 | **Pre-parsed Value Extraction** | Seleção de Spans | [`docs/cookbooks-reference.md#15-pre-parsed-value-extraction`](docs/cookbooks-reference.md#15-pre-parsed-value-extraction) |
| 16 | **Hierarchical Classification** | Beam Search em Árvore | [`docs/cookbooks-reference.md#16-hierarchical-classification`](docs/cookbooks-reference.md#16-hierarchical-classification) |
| 17 | **Autoresearch Feature Discovery** | `Score` Composto | [`docs/cookbooks-reference.md#17-autoresearch-feature-discovery`](docs/cookbooks-reference.md#17-autoresearch-feature-discovery) |
| 18 | **Classification Using Confidence** | Portão de Confiança | [`docs/cookbooks-reference.md#18-classification-using-confidence`](docs/cookbooks-reference.md#18-classification-using-confidence) |
| 19 | **Speculative Fan-out** | Perguntas Especulativas | [`docs/cookbooks-reference.md#19-speculative-fan-out`](docs/cookbooks-reference.md#19-speculative-fan-out) |
| 20 | **Intent Routing** | Roteador Multi-Ramo | [`docs/cookbooks-reference.md#20-intent-routing`](docs/cookbooks-reference.md#20-intent-routing) |
| 21 | **Smart Home Assistant Demo** | Assistente Residencial | [`docs/cookbooks-reference.md#21-smart-home-assistant-demo`](docs/cookbooks-reference.md#21-smart-home-assistant-demo) |

---

## 🤖 Instale e Mantenha o ALR com seu Agente de IA (Copie e Cole)

> **Para usuários com agentes de IA (Oh My Pi, Claude Code, Cursor, Windsurf, Roo, etc.):**  
> Copie qualquer um dos blocos abaixo e envie diretamente para o seu agente. Ele detectará seu sistema operacional automaticamente, executará todos os passos, configurará o início no boot e abrirá a tela funcionando na sua frente.

### 🐧 Instalação Rápida no Linux & Linux ARM (x86_64, aarch64, Raspberry Pi, AWS Graviton)

Para instalar nativamente em qualquer máquina Linux (incluindo ARM64 / aarch64):
```bash
# Instalação nativa direta (detecta dependências, compila release e configura systemd):
bash scripts/install-linux.sh

# Ou execute via Docker Multi-Arch (x86_64 e aarch64 out-of-the-box):
docker compose up -d
```

---

### 🚀 1. Prompt Definitivo para o Agente: Clone, Build, Chave de API, Autostart no Boot, Teste de Decisão e Relatório Completo

Copie este prompt e envie diretamente para o seu agente (Oh My Pi, Claude Code, Cursor, Windsurf, Roo, etc.):

```text
Você é o engenheiro de software sênior responsável pela implantação completa do ALR (Autonomous Learning Runtime) nesta máquina. Sua missão é executar todo o ciclo de instalação de ponta a ponta de forma 100% autônoma, sem intervenção do usuário: clonar o repositório, compilar o binário otimizado, configurar a chave de autenticação da API, iniciar o serviço com autostart no boot, disparar um teste real de decisão tipada (Choice, Noul, Score) via API e exibir um relatório final completo com todas as métricas e dados na tela.

Execute com rigor as 6 etapas:

1. IDENTIFICAÇÃO DO AMBIENTE E CLONE:
   - Detecte o sistema operacional (Windows, Linux ou macOS) e a arquitetura da CPU (x86_64 ou ARM64/aarch64).
   - Se já estiver dentro do diretório do ALR, utilize a pasta atual. Caso contrário, clone https://github.com/dilneiss/alr.git e acesse a pasta do repositório.

2. VERIFICAÇÃO DE DEPENDÊNCIAS E COMPILAÇÃO RELEASE:
   - Verifique ferramentas necessárias: git, curl, build-essential (gcc/clang) e compilador Rust (rustc/cargo 1.80+). Se o Rust não estiver instalado, instale via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y` e carregue o ambiente (`source "$HOME/.cargo/env"`).
   - Compile o runtime em modo release com otimizações nativas:
     `cargo build --release -p alr-cli`
   - Localize o binário gerado em `./target/release/alr` (ou `./target/release/alr.exe` no Windows).

3. CONFIGURAÇÃO DA CHAVE DE API (AUTENTICAÇÃO DROP-IN COMPATÍVEL COM JEV):
   - Defina um token seguro de autenticação para a API (exemplo: `alr_secret_key_2026`).
   - Configure a variável de ambiente `ALR_API_KEY=alr_secret_key_2026` para que o serviço valide o cabeçalho `Authorization: Bearer alr_secret_key_2026`.

4. CONFIGURAÇÃO DO SERVIÇO COM AUTOSTART NO BOOT:
   - Configure o serviço do ALR para rodar na porta 3000 (`PORT=3000`) com `ALR_API_KEY=alr_secret_key_2026` e iniciar automaticamente ao ligar o computador:
     * Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS): Crie a unidade systemd de usuário em `~/.config/systemd/user/alr.service`, faça o reload (`systemctl --user daemon-reload`), ative com `systemctl --user enable --now alr.service` e habilite `loginctl enable-linger $USER` se disponível.
     * macOS: Crie um LaunchAgent em `~/Library/LaunchAgents/com.alr.playground.plist` apontando para o binário com `playground --port 3000`, e carregue com `launchctl load -w ~/Library/LaunchAgents/com.alr.playground.plist`.
     * Windows: Crie uma tarefa agendada de logon via `schtasks /Create /TN "ALR_Playground" /TR "\"<caminho_completo_alr.exe>\" playground --port 3000" /SC ONLOGON /F` e inicie o processo em background.
   - Verifique que a porta 3000 está escutando ativamente (aguarde até 15s até `http://127.0.0.1:3000/` retornar HTTP 200).

5. EXECUÇÃO DE TESTE REAL DA API COM AS 3 PRIMITIVAS (CHOICE, NOUL, SCORE):
   - Dispare uma requisição HTTP POST para `http://localhost:3000/v1/systemone` enviando o cabeçalho de autenticação `Authorization: Bearer alr_secret_key_2026` e um payload real contendo as 3 decisões tipadas:
     curl -s -X POST http://localhost:3000/v1/systemone \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer alr_secret_key_2026" \
       -d '{
         "state": "Ticket de Suporte #9042: Meu Pix de R$ 3.850 foi debitado mas o saldo não entrou no app. O suporte não responde e vou abrir reclamação no Procon hoje!",
         "questions": {
           "urgente": {
             "type": "noul",
             "instructions": "O cliente expressa urgência crítica ou risco de litígio/Procon?"
           },
           "departamento": {
             "type": "choice",
             "instructions": "Qual é o departamento responsável?",
             "criteria": {
               "financeiro": "Problemas de pagamento, Pix, estorno ou cobrança",
               "suporte_tecnico": "Bugs no app, login ou travamentos",
               "comercial": "Novos planos e vendas"
             }
           },
           "gravidade": {
             "type": "score",
             "instructions": "Nível de gravidade do chamado (0 a 3)",
             "criteria": ["Baixa", "Média", "Alta", "Crítica"]
           }
         }
       }'
   - Capture a resposta JSON, confirme o status HTTP 200 e extraia as respostas calculadas, as probabilidades e a latência de execução (`latency_micros`).

6. EXIBIÇÃO DO RELATÓRIO COMPLETO NA TELA:
   - Imprima no terminal o resumo final estruturado:
   ===================================================================
   🚀 ALR RUNTIME & JEV SYSTEM 1 ENGINE - IMPLANTAÇÃO CONCLUÍDA
   ===================================================================
   • Plataforma & CPU        : <SO detectado> (<Arquitetura detectada>)
   • Caminho do Binário      : <Caminho absoluto do executável alr>
   • Chave de API Configurada: ALR_API_KEY=alr_secret_key_2026
   • Status do Serviço       : ATIVO na porta 3000 (Inicialização no Boot configurada)
   • Endpoint Local JEV      : http://localhost:3000/v1/systemone (e /api/v1/systemone)
   • Playground Web UI       : http://localhost:3000
   -------------------------------------------------------------------
   📊 RESULTADO DO TESTE REAL DE DECISÃO TIPADA:
   • Status da Requisição    : 200 OK (Autenticação Bearer validada)
   • Latência de Inferência  : <X> µs (< 0.5 ms em CPU local)
   • Custo da Decisão        : $0.00 (Zero tokens na nuvem consumidos)
   • Resposta Noul (Urgente) : <valor> (Probabilidade P(sim): <X>%)
   • Resposta Choice (Depto) : <valor> (Confiança Softmax: <X>%)
   • Resposta Score (Grav.)  : <valor> / 3.0
   -------------------------------------------------------------------
   🛠️ COMANDOS ÚTEIS PARA O USUÁRIO:
   • Ver logs em tempo real  : journalctl --user -u alr.service -f (ou logs equivalentes)
   • Parar / Reiniciar       : systemctl --user restart alr.service
   • Teste cURL              : curl -H "Authorization: Bearer alr_secret_key_2026" -X POST http://localhost:3000/v1/systemone ...
   ===================================================================
```

### 🍓 2. Instalação Otimizada em Linux ARM / Raspberry Pi / AWS Graviton / Apple Silicon (Copie e Cole)

Copie este prompt e envie para o seu agente em qualquer máquina Linux ARM:

```text
Você é o engenheiro responsável por instalar e otimizar o ALR (Autonomous Learning Runtime) nesta máquina Linux ARM (ARM64 / aarch64 ou armv7l), garantindo que ela utilize aceleração vetorial ARM NEON, compile de forma estável sem estourar a memória RAM e inicie automaticamente no boot.
Execute todos os passos de forma autônoma:
1. DETECÇÃO DE HARDWARE E ARQUITETURA:
   - Identifique a arquitetura do processador executando `uname -m` (confirmando aarch64, arm64 ou armv7l).
   - Verifique a memória RAM total e disponível com `free -m`.
   - Se a máquina tiver 4GB ou menos de RAM (como em Raspberry Pi 4/3 ou instâncias básicas de nuvem), verifique se há swap ativo (`swapon --show`). Se não houver pelo menos 2GB de swap configurado, crie um swapfile temporário de 2GB em /swapfile para evitar Out-Of-Memory (OOM) do compilador durante o build do workspace.
2. INSTALAÇÃO DE FERRAMENTAS DE COMPILAÇÃO NATIVAS:
   - No Debian / Ubuntu / Raspberry Pi OS: `sudo apt-get update && sudo apt-get install -y build-essential curl git ca-certificates pkg-config`.
   - No Fedora / Amazon Linux Graviton: `sudo dnf groupinstall -y "Development Tools" && sudo dnf install -y curl git pkgconfig`.
   - No Arch Linux / Manjaro ARM: `sudo pacman -Syu --noconfirm base-devel curl git`.
3. COMPILADOR RUST:
   - Se `cargo` não estiver instalado, instale via: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`.
   - Carregue o ambiente com `source "$HOME/.cargo/env"`.
4. OBTENÇÃO DO CÓDIGO E COMPILAÇÃO CALIBRADA:
   - Se já estiver no diretório do ALR, use a pasta atual. Senão, clone: `git clone https://github.com/dilneiss/alr.git && cd alr`.
   - Em máquinas com 2GB a 4GB de RAM (ex: Raspberry Pi), compile limitando o paralelismo para evitar OOM: `cargo build --release -p alr-cli -j 2`.
   - Em servidores ARM potentes (AWS Graviton, Oracle Ampere A1, Mac com Linux): `cargo build --release -p alr-cli`.
5. CONFIGURAÇÃO DE AUTOSTART (SYSTEMD USER SERVICE):
   - Crie a unidade systemd de usuário em `~/.config/systemd/user/alr.service`:
     [Unit]
     Description=Autonomous Learning Runtime (ALR) - Playground & JEV System 1 Engine
     After=network.target

     [Service]
     Type=simple
     WorkingDirectory=$(pwd)
     ExecStart=$(pwd)/target/release/alr playground --port 3000
     Restart=always
     RestartSec=5
     Environment=PORT=3000
     Environment=RUST_LOG=info

     [Install]
     WantedBy=default.target
   - Recarregue e ative o serviço: `systemctl --user daemon-reload && systemctl --user enable --now alr.service`.
   - Habilite o linger para manter o serviço rodando mesmo sem sessão SSH ativa: `loginctl enable-linger $USER` (se disponível).
6. VALIDAÇÃO E RELATÓRIO:
   - Teste a resposta HTTP local: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/` confirmando 200.
   - Se houver interface gráfica de desktop (ex: Raspberry Pi Desktop), abra o navegador: `xdg-open http://localhost:3000`.
   - Imprima no terminal: Arquitetura ARM confirmada, status do serviço systemd, consumo de RAM (RSS) e o link para o Playground.
```

### 🔄 3. Atualizar o ALR Manualmente Agora
Copie este prompt e envie para o seu agente sempre que quiser atualizar sob demanda:

```text
Você é o engenheiro responsável por atualizar a instalação do ALR nesta máquina para a versão mais recente do repositório oficial.
Execute os seguintes passos com segurança:
1. LOCALIZAR O REPOSITÓRIO:
   - Encontre o diretório onde o ALR está instalado e entre nele.
2. POLÍTICA DE LIMPEZA E ATUALIZAÇÃO SEGURA:
   - Descarte apenas alterações locais rastreadas no Git com `git reset --hard HEAD` exclusivamente dentro da pasta do repositório ALR.
   - NUNCA execute `git clean -fdx` ou apague bancos de dados (.db / .sqlite), arquivos .env ou dados locais do usuário.
   - Atualize com `git pull origin main`.
3. RECOMPILAÇÃO E REINICIALIZAÇÃO DO SERVIÇO:
   - Recompile o binário atualizado: `cargo build --release -p alr-cli`.
   - Reinicie o serviço ou processo que mantém o Playground ativo (via `systemctl --user restart alr` no Linux, `launchctl` no macOS, ou reiniciando a tarefa/processo no Windows).
4. VALIDAÇÃO:
   - Teste a resposta em http://127.0.0.1:3000/ confirmando HTTP 200.
   - Imprima o novo hash do commit (`git rev-parse --short HEAD`), a confirmação de que o serviço está rodando e que as tabelas de estado/dados foram preservadas.
```

### ⏰ 4. Configurar Atualização Automática Diária (1x ao Dia)

Copie este prompt e envie para o seu agente para deixar as atualizações rodando sozinhas:

```text
Você é o engenheiro responsável por configurar uma rotina diária e idempotente de verificação e atualização automática do ALR nesta máquina.
Execute a configuração de ponta a ponta:
1. DETECÇÃO E CRIAÇÃO DO SCRIPT DIÁRIO:
   - Crie um script leve em scripts/alr-daily-update (extensão .sh no Linux/macOS ou .ps1/.bat no Windows).
   - O script deve:
     a) Rodar uma vez ao dia no horário estipulado (ex: 04:00 da manhã ou no primeiro login do dia).
     b) Executar `git fetch origin main` no diretório do ALR.
     c) Comparar `git rev-parse HEAD` com `git rev-parse @{u}`.
     d) Se NÃO houver commits novos: registrar log com data/hora "ALR verificado: já na versão mais recente" e encerrar sem reiniciar nada.
     e) Se HOUVER commits novos: aplicar `git reset --hard HEAD` (preservando arquivos não rastreados, bancos e configs), rodar `git pull origin main`, recompilar com `cargo build --release -p alr-cli`, reiniciar o serviço do ALR e registrar o sucesso no log.
     f) Se a compilação falhar: manter o binário anterior ativo, registrar o erro no log e alertar sem interromper a execução do runtime.
2. AGENDAMENTO NATIVO NO SISTEMA OPERACIONAL:
   - Linux (Ubuntu/Debian/Fedora): crie uma unidade systemd de timer (~/.config/systemd/user/alr-daily-update.timer e .service) configurada para `OnCalendar=daily` e `Persistent=true`, ativando com `systemctl --user enable --now alr-daily-update.timer`.
   - macOS: crie um LaunchAgent (~/Library/LaunchAgents/com.alr.daily-update.plist) com `StartCalendarInterval` diário e carregue com `launchctl load`.
   - Windows: registre uma tarefa diária no Task Scheduler via `schtasks /Create /TN "ALR_Daily_Update" /SC DAILY /ST 04:00 /TR "powershell -ExecutionPolicy Bypass -File <caminho_do_script>" /F`.
3. RELATÓRIO:
   - Teste a execução a seco (dry-run) do script verificador.
   - Mostre onde ficam os logs da rotina diária e forneça o comando exato para desativar o agendamento se o usuário desejar no futuro.
```

---
<div align="center">
  <br>
  <h2>⚗️ Playground Universal com Arquitetura Dual-Sidebar (Estilo Canvas) & Decisões Tipadas (System 1)</h2>
  <img src="static/playground-hero.png" alt="Playground Universal ALR - Layout Dual-Sidebar Estilo Canvas e Linha do Tempo de Raciocínio" width="100%" />
  <p><em>Figura: Novo layout do Playground Universal do ALR redesenhado no padrão Dual-Sidebar (Dock de Ícones à extrema esquerda + Barra de Submenus e Busca em estilo Canvas), com Linha do Tempo Vertical de Raciocínio (Pipeline DAG), HUD de economia comparativa ($0.00 local vs $0.0025 Cloud LLM) e probabilidades calibradas.</em></p>
  <br>
  <h2>📈 Cockpit Multi-Ativo de Trading Quantitativo (Binance Spot Testnet)</h2>
  <img src="static/trading-desk-hero.png" alt="ALR Live Trading Desk - Cockpit Quantitativo 7 Ativos" width="100%" />
  <p><em>Figura: Cockpit do ALR Live Trading Desk operando 7 criptoativos simultaneamente com gráficos de velas em Canvas a 60 FPS, order book em tempo real, trailing stop automático, indicadores técnicos locais e simulador 'What-If'.</em></p>
  <br>
  <h2>🗄️ Explorador e Inspetor de Bancos de Dados Operacionais & Qdrant (1536d)</h2>
  <img src="static/playground-database-hero.png" alt="ALR Database Explorer - SQLite WAL e Qdrant Vetorial" width="100%" />
  <p><em>Figura: Explorador de bancos de dados nativo do Playground inspecionando tabelas do SQLite (alr_memory.db, support.db, trading.db) e coleções vetoriais do Qdrant com quantização escalar int8 e gaveta lateral de inspeção profunda JSON.</em></p>
  <br>
  <h2>🎮 Arena com 8 Jogos Autônomos (Canvas & Three.js 3D com Auto-Retry)</h2>
  <img src="static/playground-games-hero.png" alt="Arena de Jogos Autônomos no Playground ALR" width="100%" />
  <p><em>Figura: Arena de Jogos Autônomos com 8 jogos (Snake com flood-fill anti-colisão, Dino Runner, Pong 2D, Cards/Blackjack, Bomberman com dano real, FPS 3D Three.js, Worms balístico e Tetris 10x20) e botão de Auto-Retry contínuo.</em></p>
  <br>
  <h2>🗺️ Otimizador de Rotas em Mapa Real (OpenStreetMap, CEP Brasileiro & VRP Dinâmico)</h2>
  <img src="static/playground-routes-hero.png" alt="ALR Route Optimizer - Roteirização em Mapa Real OpenStreetMap com CEP" width="100%" />
  <p><em>Figura: Otimizador de rotas do ALR em mapa real (OpenStreetMap / Leaflet) calculando autonomamente o trajeto ótimo de entregas a partir do CEP informado (ex: 01310-100 Av. Paulista, São Paulo), com pins numerados, polyline nas vias reais, telemetria de trânsito e manifesto completo.</em></p>
  <h2>📚 Central de Conhecimento & Hub de Tutoriais do ALR (UI Moderna & Escaneável)</h2>
  <img src="static/playground-tutorials-modern.png" alt="Central de Conhecimento & Tutoriais ALR - UI Moderna e Escaneável" width="100%" />
  <p><em>Figura: Nova interface da Central de Conhecimento e Tutoriais do ALR redesenhada com Hero Card de métricas, cards categorizados com ícones temáticos, barra de busca rápida em tempo real, comparativo Abordagem Tradicional vs ALR e diagrama do Ciclo Cognitivo em 4 passos.</em></p>
  <br>
</div>

O **Autonomous Learning Runtime (ALR)** é um runtime de agentes autônomos construído do zero em **Rust**. Ele demonstra como um núcleo cognitivo único aprende, valida, cristaliza, transfere, autoaperfeiçoa e coordena competências locais em múltiplos domínios:
1. **Controle Dinâmico Discreto (Snake)**
2. **Atendimento ao Cliente & Memória Semântica (Customer Support + Qdrant)**
3. **Automação Web Real (Browser Automation via Chromium CDP)**
4. **Sistemas Externos & Governança (Connectors REST, Webhooks, HMAC & Approval Gateway)**
5. **Modelos Especializados Locais & Destilação (ONNX Real, Model Registry & OOD Abstention)**
6. **Autonomia Corpórea 3D (3D Lab, Hierarchical Planning, A* & Spatial Memory)**
7. **Transferência Universal de Capacidades (Abstração de Ambiente, Generalização Zero-Shot e Few-Shot)**
8. **Autoaperfeiçoamento Autônomo & Auto-Cura (Análise de Falhas, Hipóteses, Sandbox A/B Controlado, Proteção Anti-Reward Hacking & Rollback Atômico)**
9. **Coordenação Multiagente Especializada (Grafo de Tarefas, Meta-Planejador, Quadro Negro, Consenso & Habilidades de Equipe)**
10. **Motor de Autonomia em Jogos (Tetris, Laboratório de Dedução Social, Memória Temporal, Modelo de Suspeita & Adaptadores Externos)**
11. **Validação Adversarial & Certificação Final (12 Gates Formais de Aceitação)**
12. **Treinamento e Execução Autônoma do Chrome Dino Runner (Modo Offline & Visão Computacional no Navegador)**
13. **Automação Omnichannel & WhatsApp em 20 Nichos de Mercado (100% Local, Custo Zero de Tokens & Auto-Aprendizado Dinâmico)**
14. **Aceleração por Hardware SIMD, Sandboxing WASM e Cockpit Web Unificado (Latência < 1 µs e Segurança Formal)**
15. **Controle Nativo de Desktop OS & Adaptação a Novos Jogos (FFI de Teclado e Mouse para Windows/SO, Pong & Adaptador de Ambiente)**
16. **Parada Segura, Botão de Emergência & Abstenção por Novidade (ScreenErrorDetector, GlobalEmergencyStop & OOD)**
17. **Novos Gêneros de Jogos Autônomos (Cartas/Blackjack, Bomberman, FPS 3D & Worms Balístico)**
18. **Benchmark Real de Velocidade (ALR System 1 a 4.0 µs vs Cloud VLMs a 1.5s — 413.203x Speedup)**
19. **Supervisão Autônoma & Auto-QA (Leitura de Backlog, Despacho para Agentes, Execução de Testes e Feedback Loop)**
20. **Automações de Negócio & E-Commerce (Categorização de Produtos, Atributos de Imagens em CPU e Triagem de E-mails)**
21. **Análise Multidimensional de Sentimentos & Roteamento Emocional (Raiva, Dúvidas, Urgência e Churn em < 10 µs)**
22. **Vigilância por Câmera & Notificações Desktop (CCTV em CPU < 1 ms, Tripwire e Alertas do Windows)**
23. **Memória Vetorial Avançada no Qdrant (Embeddings 384d/1536d, BM25 Esparso, Quantização int8 e Busca Híbrida RRF)**
24. **Suíte JEV de Marketing Ops, SEO e Otimização de Anúncios (9 Tarefas Nativas em Rust, $0.00 e Latência em Microssegundos)**
25. **Trading Quantitativo, Robô de Criptomoedas e Bolsa (CryptoTraderEngine, Indicadores Locais, Stop-Loss Inviolável, Simulação de Exchanges e Trailing Stop)**
26. **Conector Oficial Bybit Testnet V5 (Assinatura HMAC-SHA256, Order Book, Saldo Virtual e Despacho de Ordens)**
27. **Conector Oficial Binance Spot Testnet (Assinatura HMAC-SHA256, Ticker/Book, Saldo Virtual, Klines e Despacho de Ordens)**
28. **Motor Nativo JEV System 1 & API Canônica `/v1/systemone` (Decisões Tipadas Choice/Noul/Score, 0 Tokens, 12 µs de Latência e 80.000+ Decisões/s)**
29. **15 Recipes Especializadas de Decisão do JEV (Rerank Semântico, Busca por Linha, Filtro RAG & Injection, Datas ISO, Reconstrução Markdown, Function Calling, Sugestão de Skills, Taxonomia Hierárquica, Verificação de Campos e Extração de Features)**
30. **5 Casos Reais de Domínio do JEV (4 Formulários de Atendimento ao Cliente, Supervisão de Ações no Browser DOM, Telemetria & Risco de Drones, Detecção de Falhas Silenciosas em APIs e Classificação de Segmentos de Mídia)**
31. **Gerenciamento Avançado de Contexto do AgentScope (Tool Result Offloader com SHA-256 para saídas volumosas e Context Compactor Semântico)**
32. **Execução em Segundo Plano com Wakeup Dispatcher (BackgroundTaskManager com Notificação de Wakeup Assíncrona para Retomada Autônoma)**
33. **Otimizador de Rotas Urbanas com Janelas de Tempo (VRP-TW, Tráfego Dinâmico e 50 Paradas)**
34. **Protocolo A2A Multiagente, Cards de Aprovação Humana HitL e Visualizador de Diff em Tempo Real**

## ⚡ Quickstart em 3 Minutos: Do Zero ao Agente Operacional

Quer ver o runtime funcionando na sua máquina agora mesmo? Em 3 passos simples você instala, configura e coloca seu primeiro agente em execução autônoma com **0 tokens consumidos e latência de microssegundos**:

```bash
# 1. Clonar o repositório
git clone https://github.com/dilneiss/alr.git
cd alr

# 2. Executar o Quickstart Automatizado (Instala -> Configura -> Treina -> Executa)
cargo run -p alr-cli -- quickstart
```

### 📚 Tutoriais Guiados & Interfaces Visuais Interativas

| Recurso | Tipo | Descrição | Como Acessar / Executar |
| :--- | :---: | :--- | :--- |
| [`docs/quickstart-3-minutos.md`](docs/quickstart-3-minutos.md) | 📄 Documento | Tutorial passo a passo de 180s: Instalar $\to$ Configurar $\to$ Treinar | Leitura direta no GitHub / Markdown |
| [`docs/api-reference.md`](docs/api-reference.md) | 📡 Referência API | Documentação completa de todos os endpoints REST, `/v1/systemone`, 15 Recipes, Domínios, Trading Desk e MCP | Leitura direta ou na aba **📡 API Docs** do Playground (`http://localhost:3000`) |
| [`docs/cookbooks-reference.md`](docs/cookbooks-reference.md) | 📖 Cookbooks | Guia exaustivo dos 20 Cookbooks oficiais do TypeSafe JEV + Smart Home Demo adaptados para o ALR System 1 | Leitura direta no GitHub / Markdown |
| [`static/install_and_usage.html`](static/install_and_usage.html) | 🖥️ Web Interativa | Guia visual de instalação com seletor de SO (Win/Linux/Mac) e simulador CLI | `cargo run -p alr-cli -- install-guide` |
| [`static/showcase.html`](static/showcase.html) | 🌟 Vitrine Web | Demonstração animada completa: Ciclo cognitivo, 20 nichos, jogos e calculadora de ROI | `cargo run -p alr-cli -- showcase` |
| [`static/whatsapp_support.html`](static/whatsapp_support.html) | 📱 WhatsApp Desk | Central omnichannel nos 20 nichos com chat ao vivo e auto-aprendizado dinâmico | `cargo run -p alr-cli -- whatsapp` |
| [`static/alr_cockpit.html`](static/alr_cockpit.html) | 📊 Cockpit Web | Painel de observabilidade de alta performance: SIMD, WASM sandbox e telemetria | `cargo run -p alr-cli -- cockpit` |
| [`ALR Playground Oficial`](http://localhost:3000) | ⚗️ Web Interativa | Centro Principal de Testes e Decisões Tipadas (100% PT-BR, Linha do Tempo & HUD) | `cargo run -p alr-cli -- playground` |
| [`extensions/alr-voz/`](extensions/alr-voz/README.md) | 🎙️ Extensão Chrome | ALR Voz: Controle do navegador por voz em tempo real conectado ao ALR System 1 | Carregar no Chrome (`chrome://extensions`) |
| [`Copiloto de Call de Vendas`](README_COPILOTO.md) | 💼 Web Copiloto | Copiloto em tempo real para Google Meet com quebra de objeções instantânea via ALR System 1 | `node server.js` (`http://localhost:3001`) |
| [`skills/alr-systemone/SKILL.md`](skills/alr-systemone/SKILL.md) | 🧠 Skill Oficial | Motor de Decisões Tipadas System 1 (Choice, Noul, Score) em CPU local com $0.00 de custo | Primitivas para agentes em Oh My Pi, Claude Code e JEV SDK |

### ⚗️ Playground Universal do ALR: O Centro Principal de Testes e Simulações

O **Playground do ALR** é o ambiente oficial unificado para experimentar, validar e auditar **tudo o que o ecossistema ALR oferece**. Ele vai muito além de uma simples API: reúne decisões tipadas em sub-milissegundos, uma **Arena com 8 Jogos Autônomos interativos em Canvas**, suítes completas de Marketing Ops, Segurança e Trading com custo zero de tokens:

<div align="center">
  <img src="static/playground-hero.png" alt="Playground Oficial ALR - Layout Dual-Sidebar Estilo Canvas e Linha do Tempo de Raciocínio" width="100%">
  <p><em>Figura 1: Playground do ALR redesenhado com arquitetura Dual-Sidebar (Dock de Ícones primário + Barra lateral secundária com submenus e busca em tempo real), exibindo a Linha do Tempo Vertical de Raciocínio (Pipeline DAG), HUD de economia comparativa e barras de probabilidade calibradas.</em></p>
</div>

<div align="center">
  <img src="static/playground-games-hero.png" alt="Arena de Jogos Autônomos no Playground ALR" width="100%">
  <p><em>Figura 2: Arena de Jogos Autônomos interativa com 8 jogos (Snake, Dino Runner, Pong 2D, Cards/Blackjack, Bomberman, FPS 3D, Worms e Tetris) rodando em Canvas com telemetria System 1 ao vivo (&lt; 4.0 µs).</em></p>
</div>

<div align="center">
  <img src="static/playground-marketing.png" alt="Catálogo de Módulos Operacionais ALR" width="100%">
  <p><em>Figura 3: Catálogo completo de módulos operacionais (Marketing Ops, Segurança & Risco, Trading Quantitativo e WhatsApp Desk) testáveis com 1 clique.</em></p>
</div>

#### 🌟 Os 6 Módulos Operacionais Disponíveis no Playground:
1. **⚗️ Decisões Tipadas (System 1):** Avaliação de probabilidades calibradas com Linha do Tempo Vertical de Raciocínio (Estilo Canva/Figma), formulário dinâmico, edição de JSON e HUD de economia ($0.00 vs $0.000016 vs $0.0025).
2. **🎮 Arena de Jogos (8 Jogos do ALR):** Simulações em Canvas de alta performance com IA autônoma e controles manuais:
   * 🐍 **Snake Autônomo:** Cycle Safety Shield, Q-Learning e vetor de probabilidades de direção (`CIMA`, `BAIXO`, `ESQUERDA`, `DIREITA`).
   * 🦖 **Chrome Dino Runner:** Salto com física parabólica, gravidade contínua e esquiva de cactos.
   * 🏓 **Pong 2D:** Interceptação inteligente de raquete e rebatidas dinâmicas.
   * 🃏 **Cards / Blackjack:** Cálculo em tempo real da probabilidade de estouro (*Bust Probability*) e decisão Stand/Hit.
   * 💣 **Bomberman:** Fuga de explosão em cruz via busca em largura (BFS) e pavio animado.
   * 🎯 **FPS 3D Raycasting:** Mira suave, alvos em profundidade 3D e cálculo de recuo.
   * 🐛 **Worms Balístico:** Canhão balístico com vento dinâmico, ângulo e trajetória parabólica com crateras.
   * 🧱 **Tetris Autônomo:** Rotação e encaixe de tetraminós para limpeza de linhas.
3. **📈 Marketing Ops & SEO:** As 9 tarefas do JEV Catalog (Triagem Google Ads, Tagging Meta Ads, Aderência Landing Page, Link Interno, Canibalização 301, Thin-Page Gate, etc.).
4. **🛡️ Segurança, Risco & Visão:** Vigilância CCTV com tripwire de intrusão, detector de erros de tela HTTP 500, detecção de novidade extrema OOD e parada de emergência (Kill Switch).
5. **💰 Trading Quantitativo:** Monitoramento multi-ativo da Binance Spot Testnet, cálculo de indicadores técnicos locais e confluência de sinais.
6. **💬 Atendimento Omnichannel & WhatsApp:** Central de atendimento nos 20 nichos, análise de sentimento com detecção de litígio/PROCON e triagem de e-mails.

```bash
# Iniciar o Playground Universal localmente (porta padrão 3000)
cargo run -p alr-cli -- playground --port 3000

# Validar os testes automatizados do Playground no terminal
cargo run -p alr-cli -- playground-test
```
---

## 📑 Sumário

1. [🤖 Prompt Único para o Agente de IA Fazer Tudo](#-1-prompt-único-seu-agente-de-ia-faz-tudo-copie-e-cole)
2. [⚡ Início Rápido: Suba a API em 1 Comando e Integre com o JEV](#-início-rápido-suba-a-api-em-1-só-comando-e-integre-com-o-jev)
3. [⚡ Alternativa Gratuita e Drop-in ao JEV Cloud](#-por-que-o-alr-é-a-alternativa-gratuita-definitiva-ao-jev)
4. [🔄 Substituição Rápida do JEV Cloud (Drop-in em 10 Segundos)](#-drop-in-replacement-troque-o-jev-pelo-alr-em-10-segundos)
5. [🧩 As 3 Primitivas e os 20 Cookbooks do JEV Nativos](#-as-3-primitivas-e-os-20-cookbooks-do-jev-nativos-no-alr)
6. [🐧 Instalação Rápida no Linux & Linux ARM](#-instale-e-mantenha-o-alr-com-seu-agente-de-ia-copie-e-cole)
7. [⚗️ Playground Universal & Cockpit Web](#-playground-universal-do-alr-o-centro-principal-de-testes-e-simulações)
8. [⚡ Quickstart em 3 Minutos (Do Zero ao Agente Operacional)](#-quickstart-em-3-minutos-do-zero-ao-agente-operacional)
9. [🎯 O Que é o Projeto?](#-o-que-é-o-projeto)
10. [💡 Por Que o ALR Existe?](#-por-que-o-alr-existe)
11. [🏆 Comparativo Técnico: Por Que o ALR é a Melhor Alternativa ao JEV Cloud e Laya?](#-comparativo-técnico-por-que-o-alr-é-superior-ao-jev-e-laya--laya-coreml)
12. [🗺️ Mapas Mentais da Arquitetura & Fluxos Operacionais](#-mapas-mentais-da-arquitetura--fluxos-operacionais)
13. [Premissa Central](#-premissa-central)
14. [Princípios Arquiteturais](#-princípios-arquiteturais)
15. [O Que o Sistema Faz?](#-o-que-o-sistema-faz)
16. [🎬 Catálogo Completo de Demonstrações & Casos de Uso (README_DEMOS.md)](README_DEMOS.md)
17. [🔄 Detector Universal de Loops & Evasão](#-detector-universal-de-loops--evasão)
18. [🎓 Treinamento de Novas Tarefas (Guia & CLI)](#-treinamento-de-novas-tarefas-guia--cli)
19. [🧠 Por Que Usamos o Qdrant e uma LLM Integrada? (Arquitetura, Casos de Uso e Teste Prático)](#-por-que-usamos-o-qdrant-e-uma-llm-integrada-arquitetura-casos-de-uso-e-teste-prático)
20. [🚦 Hierarquia Rígida de Decisão de 8 Níveis](#-hierarquia-rígida-de-decisão-de-8-níveis)
21. [📦 Estrutura Completa do Workspace Cargo (22 Crates)](#-estrutura-completa-do-workspace-cargo-22-crates)
22. [🔧 Como Instalar e Pré-Requisitos](#-como-instalar-e-pré-requisitos)
23. [💻 Como Usar e Exemplos de Comandos da CLI](#-como-usar-e-exemplos-de-comandos-da-cli)
24. [🎬 Demonstrações Práticas da CLI (README_DEMOS.md)](README_DEMOS.md#-catálogo-completo-de-comandos-da-cli-46-demonstrações-práticas)
25. [🔌 Integração MCP com OpenCode](#-integração-mcp-com-opencode)
26. [📊 Métricas Reais Obtidas por Nível de Evidência](#-métricas-reais-obtidas-por-nível-de-evidência)
27. [Os 12 Gates Formais de Aceitação](#-os-12-gates-formais-de-aceitação)
28. [Veredito de Certificação Oficial](#-veredito-de-certificação-oficial)
29. [O Que o ALR NÃO É](#-o-que-o-alr-não-é)
30. [Limitações Conhecidas Declaradas Honestamente](#-limitações-conhecidas-declaradas-honestamente)
31. [Política de Interação com Jogos (Anti-Cheat)](#-política-de-interação-com-jogos-anti-cheat)
32. [Segurança e Governança](#-segurança-e-governança)
33. [Índice de Documentação Técnica](#-índice-de-documentação-técnica)
34. [❓ Perguntas Frequentes: Migrando do JEV para o ALR (FAQ / SEO)](#-perguntas-frequentes-migrando-do-jev-para-o-alr-faq--guia-de-descoberta)
35. [🔍 Termos de Busca e Indexação (SEO & Metadata)](#-termos-de-busca-e-indexação-seo--metadata)
36. [📜 Licença](#-licença)
---

## 🎯 O Que é o Projeto?

O **Autonomous Learning Runtime (ALR)** é uma infraestrutura de software em Rust projetada para agentes autônomos que aprendem com a experiência. 

Diferente de frameworks tradicionais que operam enviando prompts para modelos remotos a cada micro-ação, o ALR utiliza o modelo de linguagem grande (LLM) prioritariamente no início do aprendizado (cold-start) ou em situações de novidade extrema. As decisões e planos aprovados são cristalizados em **regras locais, tabelas de reforço, procedimentos governados e modelos neurais locais**, permitindo que as execuções subsequentes rodem com **zero chamadas de rede**, latência na ordem de **microssegundos** e resiliência total a falhas de conexão.

```text
Situação Nova / Baixa Confiança
              │
              ▼
      LLM Teacher Oracle
              │ (Proposta Estruturada)
              ▼
       Sandbox de Regras
              │ (Validação Sintática e Semântica)
              ▼
     Skill Ativa / Q-Table
              │ (SQLite / Model Registry)
              ▼
        Execução Local  ◄───────────────────────────┐
              │                                      │ (Execuções Subsequentes)
              ▼                                      │ 0 Chamadas à LLM
        Ação e Entrada                               │ Velocidade Nativa (µs)
              │                                      │
              ▼                                      │
   Verificação de Pós-Condição ──────────────────────┘
```

---

## 💡 Por Que o ALR Existe?

Agentes de IA que dependem exclusivamente de chamadas remotas de LLM enfrentam gargalos críticos:
* **Latência Excessiva:** Cada ação demora entre 500 ms e 3.000 ms, inviabilizando controle dinâmico ou tarefas ágeis.
* **Custo Proibitivo:** Tarefas repetitivas (como ler um banco de dados, clicar em formulários ou desviar de obstáculos) queimam milhões de tokens desnecessariamente.
* **Falta de Memória Operacional Persistente:** O modelo esquece o procedimento assim que a sessão se encerra.
* **Vulnerabilidade de Rede:** Se a API externa oscilar ou cair, o agente para completamente.

O ALR resolve isso estabelecendo um runtime com memória híbrida, aprendizado contínuo e validação estrita de segurança.

---

## 🏆 Comparativo Técnico: Por Que o ALR é a Melhor Alternativa ao JEV e Laya / Laya-CoreML?

O **Autonomous Learning Runtime (ALR)** integra os pontos fortes conceituais do **JEV Cloud (TypeSafe AI)** e do **Laya (ConvAI / mizorewww laya-coreml)**, consolidando-se como a **alternativa aberta, gratuita e de alta performance**:

| Dimensão Arquitetural | **JEV Cloud (TypeSafe AI API)** | **Laya / Laya-CoreML** | **ALR (Autonomous Learning Runtime)** |
| :--- | :--- | :--- | :--- |
| **Arquitetura Base** | API Fechada em Nuvem (Cloud-only) | Modelo de Decisão Tipada (Python / Core ML) | **Runtime Cognitivo Completo em Rust (22 Crates)** |
| **Portabilidade & SO** | Requer Conexão Externa (Cloud) | **Restrito ao Apple Silicon (macOS / ANE)** | **Universal Multiplataforma (Windows, Linux x86/ARM, macOS)** |
| **Tipo de Execução** | Apenas Classificação Pontual em Nuvem | Decisões Tipadas Isoladas | **Loop Agêntico Completo (Percepção → Memória → Decisão → Ação → Replay)** |
| **Primitivas Tipadas** | `Choice`, `Score`, `Noul` | `Choice`, `Score`, `Noul` | **`Choice`, `Score`, `Noul` + Avaliação de Brier Score & Entropia** |
| **Escudo de Segurança** | Nenhum (apenas retorna probabilidades) | `Cycle Safety Shield` em Python | **`LayaGuardedSnakePolicy` Nativo em Rust + Hard Constraints do `RiskEngine`** |
| **Memória Operacional** | Nenhuma (Stateless) | Nenhuma (Stateless) | **Memória Híbrida Dupla (SQLite WAL + Qdrant Vetorial Multi-Tenant)** |
| **Ações no Mundo Real** | Zero (apenas API de texto/JSON) | Zero (apenas demo Snake no terminal) | **Automação Web Real (Chromium CDP), Teclado/Mouse OS, Conectores REST & Webhooks** |
| **Evasão de Loops** | Inexistente | Heurística simples de ciclo | **Detector Universal de Loops (Tabu Search 45 ticks + Penalidade de Recência)** |
| **Recuperação de Falhas** | Nenhuma | Nenhuma | **Checkpoints Persistentes, Fila de Tarefas & Retomada Pós-Crash** |
| **Garantia de Tipagem** | JSON via HTTP | Python dinâmico com type hints | **Segurança de Memória e Tipagem Estrita em Tempo de Compilação (Rust)** |

### Exemplos Práticos de Superioridade do ALR:

1. **Exemplo 1: Snake com Decisão Tipada e Escudo Físico em Sub-Milissegundo:**
   * Enquanto o `laya-coreml` depende do ecossistema Python no macOS (`pip install laya-coreml`, `sysctl`, `coremltools`) e sofre quando a cobra entra em loop de estagnação de 600 passos em volta de itens inacessíveis, o ALR executa em **Rust puro compilado** com a política `LayaGuardedSnakePolicy`:
     * Avalia as primitivas tipadas `Choice` (probabilidades Softmax por movimento) e `Noul` (risco de beco sem saída e alcance de comida) em **microsegundos**.
     * Possui o **Tabu Search Memory** de quarentena de 45 ticks e penalidade de recência de trilha, impedindo fisicamente qualquer loop ou travamento.
2. **Exemplo 2: Atendimento ao Cliente com Diálogo de Esclarecimento Interativo (System 1 + System 2):**
   * O JEV Cloud apenas diz: `{"refund": {"type": "noul", "probability": 0.98}}` e repassa o problema para a aplicação.
   * O ALR detecta que a intenção é estorno (`RefundPending`), percebe via `StateExtractor::extract_entities` que o usuário **não informou o número do pedido**, **pausa a execução das ferramentas, mantém o chamado aberto e pergunta educadamente ao usuário na tela**:
     ```text
     [ALR ATENDENTE]: Olá! Para prosseguir com a verificação do seu estorno, preciso do número do seu pedido (ex: ord_0005) ou ID da transação. Poderia me informar?
     ```
   * Quando o cliente responde com `"ord_0005"`, o ALR retoma o contexto salvo e resolve a transação com **zero chamadas à LLM externa**!
3. **Exemplo 3: Zero Dependência de Nuvem e Zero Dependência de Apple Silicon:**
   * O JEV Cloud cobra por token/chamada em dólares e para de funcionar quando a internet oscila.
   * O `laya-coreml` só roda em Macbooks com processadores M-Series.
   * O ALR roda em qualquer servidor, desktop ou edge device (Windows, Linux x86_64, Linux ARM64, macOS), garantindo 100% de operação *air-gapped* offline a custo zero ($0.00).
---


---

## 🗺️ Mapas Mentais da Arquitetura & Fluxos Operacionais

### 1. Mapa Mental de Funcionalidades do ALR (Visão Sistêmica Global)

```mermaid
mindmap
  root((ALR Runtime))
    Percepção e Entrada
      Visão Computacional RawImage
      Chromium CDP Web Browser
      Câmera Espacial 3D Lab
      Eventos Webhook HMAC
      Sensores de Grade Snake e Tetris
    Memória Híbrida
      SQLite WAL
        Transições s a r s'
        Auditoria de Decisões
        Checkpoints de Tarefas
        Q-Tables Tabulares
      Qdrant Vetorial
        Isolamento Multi-Tenant
        Documentos e Políticas
        Casos Históricos Resolvidos
      Memória Temporal e Espacial
        A* Grid e Obstáculos Móveis
        Suspeita Probabilística
        Tabu Search 45 Ticks
    Decisão e Raciocínio
      System 1 Decisões Tipadas
        Choice Softmax Ponderado
        Noul Booleano Calibrado
        Score Ordinal e Brier Loss
      System 2 Planejamento e LLM
        Orquestrador TaskGraph
        LLM Teacher Cold Start
        ApprovalGateway Risco Humano
        Diálogo de Esclarecimento
    Segurança e Governança
      TrustBoundaryEnforcer
      RedTeamAuditor Prompt Injection
      RiskEngine e Teto Inviolável
      Laya Cycle Safety Shield
      Detector de Desvio OOD
    Autoaperfeiçoamento
      RootCauseAnalyzer
      HypothesisEngine
      Sandbox de Teste A/B
      Anti-Reward Hacking
      Rollback Atômico de Skills
    Execução e Ação
      Teclado e Mouse Seguro
      Automação DOM por Papéis
      Conectores REST com Idempotency
      Multiagente Blackboard
```

### 2. Mapa Mental: Como Treinar uma Nova Tarefa & Autoaperfeiçoamento

```mermaid
flowchart TD
    Start([Novo Objetivo / Ambiente]) --> EnvDef[1. Definição do Ambiente<br/>Implementar EnvironmentAdapter & ActionSpace]
    
    subgraph S1 [Etapa 1: Cold Start & Bootstrapping]
        EnvDef --> Obs[Observação do Estado<br/>Vetor Normalizado de Características - Features]
        Obs --> NoveltyCheck{Estado Conhecido<br/>Confiança >= 0.85?}
        NoveltyCheck -- Não / Incerteza --> LLMTeacher[Consultar LLM Teacher Oracle<br/>Proposta Inicial de Procedimento]
        LLMTeacher --> SynthSkill[Sintetizar Candidato de Skill<br/>ProceduralSteps ou Regras]
    end

    subgraph S2 [Etapa 2: Validação & Treinamento Seguro]
        SynthSkill --> Sandbox[Sandbox de Simulação<br/>is_simulation = true]
        Sandbox --> SandTest{Passou sem Violação<br/>de Segurança?}
        SandTest -- Falha --> LLMTeacher
        SandTest -- Sucesso --> TrainLoop[Execução de Episódios<br/>Q-Learning / Coleta de Experiências]
        TrainLoop --> Distill[Destilação de Modelo Local<br/>Geração de Grafo ONNX Validado SHA-256]
    end

    subgraph S3 [Etapa 3: Autonomia & Decisões Tipadas System 1]
        Distill --> LocalPolicy[Política Local Ativa<br/>Decisões Tipadas Choice / Noul / Score]
        NoveltyCheck -- Sim / Conhecido --> LocalPolicy
        LocalPolicy --> SafetyShield{Cycle Safety Shield &<br/>RiskEngine Aprovam?}
        SafetyShield -- Risco / Colisão --> Intervene[Escudo Intervém Deterministicamente<br/>Desvio Seguro Imediato]
        SafetyShield -- Seguro --> ExecAction[Executar Ação no Mundo Real<br/>Browser / Teclado / API]
    end

    subgraph S4 [Etapa 4: Avaliação & Autoaperfeiçoamento Contínuo]
        ExecAction --> VerifPost[Verificação Obrigatória de Pós-Condição<br/>Mudança Real de Estado?]
        Intervene --> VerifPost
        VerifPost -- Sucesso --> SaveExp[Gravar Experiência no SQLite<br/>Aumentar Autonomia Local]
        VerifPost -- Falha / Drift --> RootCause[RootCauseAnalyzer<br/>Classificar Tipo de Falha]
        RootCause --> HypoGen[HypothesisEngine<br/>Gerar Hipótese de Correção]
        HypoGen --> ABSandbox[Experimento A/B em Sandbox]
        ABSandbox --> ABEval{Candidato Supera Baseline<br/>sem Reward Hacking?}
        ABEval -- Sim --> Promote[Promover Nova Versão de Skill<br/>Rollback Atômico Disponível]
        ABEval -- Não --> Rollback[Rejeitar e Reverter para Política Estável]
    end

    SaveExp --> EndLoop([Autonomia Atingida: 99%+ Local / Zero Tokens])
```


### 3. Mapa Mental: Como Configurar Tudo, Acesso a LLM & Procedimento Passo a Passo

```mermaid
flowchart TD
    subgraph P1 [1. Pré-Requisitos e Ambiente Local]
        RustInstall[Rust 1.80+ / 1.98.1<br/>cargo, rustc, clippy]
        DockerReq[Docker Compose<br/>Para Qdrant Vetorial]
        EnvCopy[Copiar Arquivo de Configuração<br/>cp .env.example .env]
    end

    subgraph P2 [2. Configuração de Variáveis de Ambiente .env]
        EnvCopy --> DBConf[DATABASE_URL = sqlite://alr_state.db<br/>Persistência Operacional e Auditoria]
        EnvCopy --> QdrantConf[QDRANT_URL = http://localhost:6333<br/>Memória Semântica Vetorial]
        EnvCopy --> LLMChoice{Qual Provedor de LLM Usar?}
        
        LLMChoice -- Modo Offline / Testes --> MockLLM[MockLlmTeacher<br/>LLM_API_KEY vazia ou mock<br/>Zero Custo / 100% Determinístico]
        LLMChoice -- OpenAI Oficial --> OpenAIConf[LLM_BASE_URL = https://api.openai.com/v1<br/>LLM_API_KEY = sk-...<br/>LLM_MODEL = gpt-4o-mini / gpt-4o]
        LLMChoice -- Local / Self-Hosted --> LocalConf[LLM_BASE_URL = http://localhost:11434/v1<br/>Ollama / vLLM / LM Studio / Laya<br/>LLM_MODEL = laya-multilingual / mistral]
        LLMChoice -- Gateways / OpenRouter --> GatewayConf[LLM_BASE_URL = https://openrouter.ai/api/v1<br/>LLM_API_KEY = sk-or-...<br/>LLM_MODEL = deepseek / claude / openai]
    end

    subgraph P3 [3. Orquestração e Inicialização dos Serviços]
        DockerReq --> StartQdrant[Iniciar Qdrant<br/>docker compose up -d]
        StartQdrant --> CheckQdrant[Testar Conexão<br/>curl http://localhost:6333/readyz]
        RustInstall --> BuildALR[Compilar Workspace<br/>cargo build --workspace]
    end

    subgraph P4 [4. Como Proceder na Execução Diária]
        BuildALR --> ExecModes{Qual Modo Executar?}
        ExecModes -- Jogo Snake com Decisões Tipadas --> RunSnake[Terminal ASCII: cargo run -p alr-cli -- snake --mode visual<br/>Navegador Real: node scripts/play_in_browser.js]
        ExecModes -- Atendimento Interativo em Tempo Real --> RunSupport[Chat Interativo: cargo run -p alr-cli -- support chat<br/>Diálogo com Recuperação de Dados Faltantes]
        ExecModes -- Treinamento de Novas Tarefas --> RunTrain[Assistente de Tarefas: cargo run -p alr-cli -- task train --type game<br/>Destilação Local ONNX: cargo run -p alr-cli -- model snake-demo]
        ExecModes -- Bateria de Verificação e 12 Gates --> RunTest[Suíte de Testes: cargo test --workspace 137 testes<br/>Gates de Aceitação: cargo run -p alr-cli -- final-acceptance]
    end

    subgraph P5 [5. Ciclo de Decisão do Acesso a LLM em Produção]
        RunSupport & RunSnake & RunTrain --> DecisionEngine[Hierarquia Rígida de Decisão]
        DecisionEngine --> CheckKnowledge{Já existe Regra ou<br/>Skill Local Validada?}
        CheckKnowledge -- Sim --> LocalExec[Execução 100% Local em µs<br/>Zero Tokens / Zero Custo LLM]
        CheckKnowledge -- Não / Incerteza Alta --> CallLLM[Aciona OpenAiCompatibleLlmTeacher<br/>Chama LLM_BASE_URL configurada]
        CallLLM --> ValidateLlm[Validação Semântica & Sandbox<br/>Nunca executa texto livre como comando]
        ValidateLlm --> PromoteLocal[Cristaliza em Skill Local / Grafo ONNX<br/>Próximas decisões: 0 chamadas à LLM]
    end
```


---

## 🔬 Premissa Central

> **"Inteligência adquirida uma vez deve se transformar em capacidade local reutilizável sempre que possível."**

Quanto mais uma tarefa se torna rotineira, menos o sistema deve depender de inferência remota. A autonomia real é medida pela capacidade de resolver tarefas conhecidas localmente e transferir capacidades aprendidas para novos ambientes.

---

## 🧱 Princípios Arquiteturais

1. **LLM como Professor, Não como Motor Permanente:** A LLM fornece hipóteses, planos iniciais e resolução de novidade, mas não controla o loop contínuo de execução.
2. **Execução Local Prioritária:** A decisão tenta sempre ser resolvida por regras determinísticas, skills locais, memória ou modelos ONNX antes de qualquer chamada externa.
3. **Verificação Obrigatória de Pós-Condição:** Não basta verificar status HTTP 200 ou que uma tecla foi enviada; o agente verifica a alteração real de estado no mundo.
4. **Abstenção Segura:** Quando a incerteza é alta ($< 0.60$) ou o estado é fora da distribuição (OOD), o agente recusa agir em falso (*"não sei"* é preferível a alucinar).
5. **Imutabilidade do Código em Produção:** O autoaperfeiçoamento opera sobre artefatos governados (skills, parâmetros, pesos de modelos, heurísticas). O código Rust compilado **nunca é modificado em tempo de execução**.
6. **Integridade Absoluta Anti-Cheat:** Jogos são operados estritamente pela tela e teclado/mouse. Leitura de memória de processos ou injeção de DLLs é sumariamente proibida.
7. **Especialização Multiagente:** Problemas complexos são divididos em grafos de tarefas executados por especialistas com escopos estritos de permissão.

---

## ⚙️ O Que o Sistema Faz?

* **Opera Sistemas Externos e APIs:** Conectores REST genéricos com cabeçalho `Idempotency-Key`, restrição de egresso via `AllowedHostPolicy` e injeção segura de segredos via `SecretRef`.
* **Processa Eventos e Webhooks:** Validação de assinaturas criptográficas HMAC-SHA256 e deduplicação estrita (*exactly-once*).
* **Fila Persistente e Recuperação de Falhas:** Fila assíncrona com `AgentCheckpoint` a cada passo, permitindo retomada imediata pós-crash sem duplicar ações.
* **Aprovação Humana Formal:** `ApprovalGateway` para ações de risco financeiro ou operacional elevado (`High` ou `Critical`).
* **Opera Navegadores Reais:** Conexão Chromium via CDP, resolução de alvos por papéis semânticos (`ByRole`) e auto-reparo frente a mudanças de layout.
* **Memória Híbrida Desacoplada:**
  * **SQLite WAL:** Estado operacional, auditoria detalhada de decisões, histórico de episódios e transições $(s, a, r, s')$.
  * **Qdrant Vetorial Multi-Tenant:** Armazenamento e recuperação por similaridade de cosseno de documentos e procedimentos passados.
* **Modelos Locais Autênticos:** Carregamento de arquivos `.onnx` reais validados por SHA-256 com inferência de tensores ultra-rápida.
* **Simulação e Controle 3D:** Ambiente corpóreo 3D com navegação determinística $A^*$, desvio de obstáculos móveis e percepção visual sem oráculo privilegiado.
* **Game Autonomy Engine:** Lógica de peças para Tetris, simulação de dedução social multi-jogador com papéis ocultos e integração com jogos externos.
* **Autoaperfeiçoamento Governamental:** Análise de causa raiz de falhas, geração de hipóteses, testes A/B em sandbox e rollback atômico com defesa anti-reward hacking.

---

## 💼 Catálogo de Casos de Uso & Demonstrações Práticas

O ALR conta com **35+ casos de uso reais e demonstrativos práticos** implementados e testados, cobrindo desde controle dinâmico em jogos e trading multi-ativo até atendimento WhatsApp com custo zero de tokens e automação web no Chromium.

> 📖 **[Consulte o Catálogo Completo de Demonstrações no README_DEMOS.md](README_DEMOS.md)**  
> Para manter este documento enxuto e escaneável, a documentação detalhada de cada um dos 35+ casos de uso, comandos da CLI, tabelas de ROI e arquiteturas completas foram consolidadas no arquivo dedicado [`README_DEMOS.md`](README_DEMOS.md).

### ⚡ Demonstrações Flagship em Destaque:

| Módulo Demonstrativo | Interface / Modo | Capacidade Comprovada | Comando para Executar |
| :--- | :---: | :--- | :--- |
| **⚗️ Playground Universal & API JEV** | `http://localhost:3000` | Decisões tipadas (Choice, Noul, Score), DAG de raciocínio, HUD comparativo de economia e 15 recipes nativas | `cargo run -p alr-cli -- playground --port 3000` |
| **📈 Mesa de Trading Quantitativo** | `http://localhost:3800` | Cockpit ao vivo operando 7 criptomoedas e 7 pares Forex com gráficos Canvas a 60 FPS e trailing stop | `cargo run -p alr-cli -- trading-desk --port 3800` |
| **🎮 Arena de 8 Jogos Autônomos** | Terminal & Canvas | Simulações em tempo real de Snake, Chrome Dino, Pong, Cards/Blackjack, Bomberman, FPS 3D, Worms e Tetris | `cargo run -p alr-cli -- dino --mode visual` |
| **📱 WhatsApp Desk (20 Nichos)** | `static/whatsapp_support.html` | Atendimento omnichannel nos 20 nichos de mercado com 0 tokens e auto-aprendizado dinâmico | `cargo run -p alr-cli -- whatsapp` |
| **🌐 Automação Web Real (CDP)** | Chromium Headless/Visível | Navegação e checkout automatizado com auto-verificação no DOM e auto-reparo de seletores | `cargo run -p alr-cli -- browser demo` |
| **💼 Copiloto de Vendas ao Vivo** | `http://localhost:3001` | Copiloto em tempo real para Google Meet com quebra de objeções instantânea via ALR System 1 | `node server.js` |
| **🗺️ Otimizador de Rotas Urbanas** | Mapa Real Leaflet | Resolução de VRP com janelas de tempo, mão única e trânsito dinâmico sobre mapa real do OpenStreetMap | Aba "🗺️ Rotas" no Playground (:3000) |
👉 *Para explorar todos os 35+ casos de uso detalhados com código e arquitetura, consulte [`README_DEMOS.md`](README_DEMOS.md).*

---

## 🔄 Detector Universal de Loops & Evasão

Para impedir que agentes fiquem presos em oscilações simétricas (como a cobrinha indo e voltando entre duas direções, cliques repetidos em botões travados ou patinação em corredores 3D), o ALR integra o **`LoopEvasionEngine`**:

1. **Rastreamento em Ring Buffer:** Monitora o histórico das últimas 30 ações e hashes de estado.
2. **Detecção de Oscilação Curta:** Interrompe alternâncias de 2 passos ($A \leftrightarrow B$) e ciclos de 4 passos ($A \to B \to C \to D$).
3. **Monitor de Estagnação Temporal:** Se o agente executar 25 passos sem redução de distância ou sem coletar itens, ativa o alarme de estagnação.
4. **Protocolo de Evasão em 2 Níveis:**
   * *Nível 1 (Evasão Local):* Bloqueia as ações oscilantes e força manobras ortogonais em direção ao espaço aberto por 3 a 4 ticks ($< 1$ µs de latência, 0 tokens).
   * *Nível 2 (Escalonamento Cognitivo):* Se persistir após 3 tentativas, invalida a confiança da política e convoca o planejador ($A^*$) ou a LLM Oracle para sintetizar uma rota completamente nova.

---

## 🎓 Treinamento de Novas Tarefas (Guia & CLI)

O ALR foi desenhado para que qualquer nova tarefa possa ser ensinada e dominada de forma determinística:

### Assistente CLI de Treinamento
```bash
# Treinar tarefa de jogo (Snake, Tetris, etc.):
cargo run -p alr-cli -- task train --type game --episodes 1000

# Treinar procedimento de navegador web:
cargo run -p alr-cli -- task train --type browser --episodes 100

# Treinar navegação espacial 3D:
cargo run -p alr-cli -- task train --type 3d --episodes 500

# Treinar procedimento de suporte/API:
cargo run -p alr-cli -- task train --type support --episodes 200
```

### Treinamento Direto por Skill (Para LLMs e Subagentes)
O ecossistema possui a skill dedicada **`skill://alr-task-trainer`**. Qualquer modelo ou subagente pode consultar a skill para gerar o `EnvironmentAdapter`, desenhar funções de recompensa imunes a *reward hacking* e rodar os sandboxes de treino automaticamente. Consulte o manual completo em [`docs/training-new-tasks.md`](docs/training-new-tasks.md).


---

## 🧠 Por Que Usamos o Qdrant e uma LLM Integrada? (Arquitetura, Casos de Uso e Teste Prático)

No **Autonomous Learning Runtime (ALR)**, a integração entre o banco vetorial **Qdrant** e a **LLM Integrada (Teacher / Oracle)** é o coração da premissa fundacional do projeto:
> **"A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente."**

A maioria dos frameworks de agentes comete um erro crítico de arquitetura: **chama uma LLM remota na nuvem para cada micro-ação de rotina**. Isso gera latência de 2 a 4 segundos por resposta, contas mensais de milhares de dólares em tokens e dependência vulnerável de internet.

O ALR resolve esse paradoxo combinando **Qdrant (Memória Semântica Vetorial)** + **SQLite WAL (Memória Relacional e Regras)** + **LLM Integrada (Professor sob Demanda)** + **System 1 em CPU (Execução Instantânea a Custo Zero)**:

```mermaid
flowchart TD
    subgraph INTAKE [1. Recepção do Evento]
        UserMsg([Mensagem do Usuário / Ticket]) --> Extractor[StateExtractor<br/>Limpeza e Extração de Entidades]
    end

    subgraph MEMORY_TIER [2. Camada de Memória Híbrida]
        Extractor --> CheckSQLite{Procedimento já existe<br/>no SQLite WAL?}
        CheckSQLite -- Sim (99% das chamadas) --> System1[⚡ System 1 Local (CPU Rust)<br/>~12 µs • Custo: $0.00 • 0 Tokens]
        CheckSQLite -- Dúvida / Caso Inédito --> QueryQdrant[🔍 Busca Semântica no Qdrant<br/>Top-K Políticas KB e Casos Históricos]
    end

    subgraph COGNITIVE_TEACHER [3. Professor LLM sob Demanda (Cold Start)]
        QueryQdrant --> CheckConfidence{Confiança >= 0.85<br/>e Novidade <= 0.20?}
        CheckConfidence -- Sim --> System1
        CheckConfidence -- Não (Situação Inédita) --> LLMTeacher[🧠 LLM Teacher Oracle<br/>Chamado UMA única vez para ensinar]
        LLMTeacher --> SandboxValidate[Sandbox de Simulação & Validação<br/>Segurança, Semântica e Invariantes]
        SandboxValidate --> Crystallize[💎 Cristalização na Memória<br/>Grava ProceduralSkill no SQLite e Resolução no Qdrant]
        Crystallize --> System1
    end

    System1 --> ActionOut([Execução Imediata / Resposta ao Usuário])
```

---

### 1. Por Que Usamos o Qdrant (Memória Semântica Vetorial)?

Enquanto o **SQLite** armazena regras procedurais exatas e histórico relacional, ele não entende variações linguísticas naturais de clientes. Quando um cliente diz:
* *"Quero meu estorno"*
* *"Me devolve o dinheiro da compra"*
* *"Cancelei o pedido e o valor não caiu"*
* *"Fui cobrado duas vezes pelo mesmo item"*

O **Qdrant** atua como a **memória semântica de alta velocidade (< 500 µs)** do agente:

1. **Recuperação de Políticas Canônicas (Anti-Alucinação):**  
   O agente consulta artigos oficiais de suporte (`KB-ECOMM-01`, `KB-FINTECH-01`, etc.) fatiados pelo `IngestionPipeline`, garantindo que toda resposta seja matematicamente embasada nas políticas reais da empresa, sem alucinar regras inexistentes.
2. **Recuperação de Casos Históricos Resolvidos (Few-Shot Experience):**  
   O Qdrant localiza incidentes parecidos resolvidos com sucesso no passado (`SemanticMemoryType::TicketResolution`), fornecendo o roteiro exato de como resolver a solicitação.
3. **Quantização Escalar int8 (Economia de 75% de RAM):**  
   O ALR configura o Qdrant com quantização escalar `int8`, reduzindo a pegada de memória em 4x (de 1536 bytes fp32 para 384 bytes int8) e acelerando o throughput de busca em **até 4x via instruções SIMD** sem perda de acurácia.
4. **Isolamento Multi-Tenant Inviolável:**  
   Toda consulta ao Qdrant impõe em tempo de compilação o filtro `must: [{ key: "tenant_id", match: { value: tenant } }]`, tornando impossível qualquer vazamento de dados entre empresas ou clientes distintos.

---

### 2. Por Que Usamos uma LLM Integrada (Teacher / Oracle)?

A LLM integrada **não controla o agente no dia a dia**, ela atua como um **Professor sob demanda**:

| Dimensão | Abordagem Tradicional (LLM em Tudo) | Abordagem ALR (LLM como Professor + Qdrant) |
| :--- | :--- | :--- |
| **Frequência de Chamadas à LLM** | A cada mensagem ou clique (100% das ações) | **Apenas na 1ª ocorrência (Cold Start) ou novidade extrema** |
| **Custo de Tokens** | Escala linearmente com o tráfego ($10.500/milhão) | **$0.00 (Zero tokens na rotina)** |
| **Latência por Decisão** | 1.500 ms a 4.000 ms (nuvem) | **~12 µs a 400 µs (CPU local)** |
| **Resiliência a Quedas de Rede** | Sai do ar se a API de IA oscilar | **100% autônomo offline via regras cristalizadas** |
| **Determinismo e Auditoria** | Caixa-preta estatística que varia | **Procedimento estruturado auditável gravado no SQLite** |

```mermaid
graph LR
    subgraph ARMAZENAMENTO [Camadas de Armazenamento]
        QDRANT[(Qdrant Vetorial<br/>1536d / int8)]
        SQLITE[(SQLite WAL<br/>alr_memory.db)]
    end

    subgraph INTELIGENCIA [Camadas de Inteligência]
        LLM[🧠 LLM Teacher Oracle<br/>Cold Start & Ensino]
        SYSTEM1[⚡ System 1 Nativo<br/>Inferência em CPU µs]
    end

    QDRANT -.->|Contexto Semântico & Políticas| LLM
    QDRANT -.->|Casos Históricos Similares| SYSTEM1
    LLM -->|Ensina Procedimento| SQLITE
    SQLITE -->|Executa Regra Cristalizada| SYSTEM1
```

* **Qdrant**: Responde *"O que as políticas oficiais dizem sobre esse assunto?"* e *"Como casos similares foram resolvidos?"*
* **SQLite**: Armazena *"Qual é a sequência exata de ferramentas aprovadas para executar?"* e guarda a auditoria de cada passo.
* **LLM Teacher**: Atua quando o agente pensa *"Nunca vi essa situação antes, qual é a melhor estratégia?"*.
* **System 1 (Rust em CPU)**: Executa a decisão imediatamente em sub-milissegundos com custo zero ($0.00).

---

### 3. Casos de Uso Didáticos

#### Caso A: Atendimento ao Cliente com Diálogo de Esclarecimento Automático
Um cliente envia: *"Quero meu dinheiro de volta do pedido que fiz semana passada!"*
1. **Qdrant** recupera a política `KB-ECOMM-01`: *Reembolso integral em até 30 dias mediante identificação do pedido.*
2. **StateExtractor** analisa a mensagem e percebe que o cliente **não informou o número do pedido**.
3. Em vez de chamar uma LLM cara para formular uma pergunta genérica, o **System 1 local** pausa o fluxo, mantém o chamado aberto e pergunta na tela:
   > *"[ALR ATENDENTE]: Olá! Para prosseguir com o seu estorno, preciso do número do seu pedido (ex: ord_0005). Poderia me informar?"*
4. O cliente responde: *"É o pedido ord_0005"*.
5. O ALR associa a entidade, retoma a execução sem reiniciar e conclui o estorno a custo zero de tokens!

#### Caso B: WhatsApp nos 20 Nichos com Auto-Aprendizado
1. Uma clínica médica cadastra suas regras de agendamento no Qdrant.
2. Clientes mandam mensagens informais: *"Tem vaga pra cardio amanhã cedo?"*, *"Doutor atende Unimed?"*.
3. O Qdrant mapeia para a especialidade correta, e o ALR responde a mais de 72.000 mensagens por segundo em CPU comum, economizando até $21.000 USD por milhão de mensagens comparado ao GPT-4o.

---

### 4. Teste Prático: Veja o Ciclo Funcionar na Sua Tela Agora Mesmo!

Você pode testar e comprovar o funcionamento exato desse ciclo cognitivo (Qdrant + LLM Teacher + Cristalização Local) executando os comandos abaixo no terminal:

#### 🧪 Teste 1: O Ciclo de Aprendizado em 5 Chamados (Cold Start -> 100% Autonomia)
```bash
cargo run -p alr-cli -- phase2-demo
```

**Saída real exibida no terminal comprovando o ciclo:**
```text
==================================================
       AUTONOMOUS LEARNING RUNTIME - PHASE 2      
==================================================
Knowledge documents:       42
Historical tickets:       500
Active skills:              0

Ticket #10001 (Cold Start: Situação Inédita)
  Intent: refund_pending | Novelty: 0.91 | Confidence: 0.24
  -> Decision source: LLM Teacher Oracle (Ensinamento)
  -> Skill proposal: handle_refund_pending:v1 (Validation: PASS)
  -> Activation: ACTIVE (Cristalizada na memória!)

Ticket #10002 (Cenário Já Aprendido)
  Intent: refund_pending | Novelty: 0.04 | Confidence: 0.97
  -> Decision source: LearnedSkill (Execução Local)
  -> LLM calls: 0 (Zero Tokens Consumidos!)

Ticket #10003 (Novo Cenário Inédito: Cobrança Duplicada)
  Intent: duplicate_charge | Novelty: 0.95 | Confidence: 0.20
  -> Decision source: LLM Teacher Oracle (Re-invocado para aprender)
  -> Activation: ACTIVE (Nova skill cristalizada)

Ticket #10004 (Cenário Já Aprendido)
  Intent: duplicate_charge | Novelty: 0.05 | Confidence: 0.96
  -> Decision source: LearnedSkill (handle_duplicate_charge)
  -> LLM calls: 0 (Zero Tokens Consumidos!)

Ticket #10005 (Cenário Intercalado Já Aprendido)
  Intent: refund_pending | Novelty: 0.03 | Confidence: 0.98
  -> Decision source: LearnedSkill (handle_refund_pending)
  -> LLM calls: 0 (Zero Tokens Consumidos!)

==================================================
FINAL COGNITIVE LIFECYCLE METRICS
Total Tickets Processed:            5
Resolved Successfully:              5
LLM Learning Calls (Cold Starts):    2 (Apenas 2 chamadas no início)
Autonomous Zero-Token Resolutions:    3 (Todas as outras a custo $0.00)
==================================================
```

#### 🧪 Teste 2: Benchmark de Busca Vetorial e Quantização int8 no Qdrant
```bash
cargo run -p alr-cli -- qdrant-benchmark --dimensions 384
```
**Métricas auditadas pelo benchmark:**
* **Hit@1 (Precisão Top-1):** `91.7%`
* **Hit@3 (Precisão Top-3):** `100.0%`
* **MRR (Mean Reciprocal Rank):** `0.944`
* **Economia de RAM via int8:** `75.0%` de redução de memória
* **Latência de Recuperação:** `< 500 µs`

---

## 🚦 Hierarquia Rígida de Decisão de 8 Níveis

Todas as ações do runtime são resolvidas pelo `DecisionRouter` obedecendo à precedência:

```text
1. Restrições de Segurança (Safety Constraints) & Regras Determinísticas (Teto inviolável)
                ↓
2. Skills / Procedimentos Verificados (Macros compiladas)
                ↓
3. Memória Episódica & Procedural (Casos históricos do SQLite/Qdrant)
                ↓
4. Modelos Especializados Locais (Inferência ONNX em µs)
                ↓
5. Planejador Hierárquico (Busca A* e Decomposição em Grafo)
                ↓
6. LLM Teacher Oracle (Cold-Start e Novidade Extrema)
                ↓
7. Human Escalation (ApprovalGateway para riscos críticos)
                ↓
8. Abstenção Segura (Recusa formal de agir sob incerteza extrema)
```

---

## 📦 Estrutura Completa do Workspace Cargo (22 Crates)

O workspace é estritamente desacoplado em 22 crates:

| Crate | Responsabilidade Principal | Dependências Chave |
| :--- | :--- | :--- |
| `crates/alr-core` | Tipos centrais: `State`, `Action`, `Decision`, `Experience`, `Skill` | `serde`, `chrono`, `uuid` |
| `crates/alr-memory` | Persistência SQLite WAL e cliente REST vetorial para Qdrant | `rusqlite`, `reqwest` |
| `crates/alr-learning` | Q-learning tabular, buffer de replay e avaliação de recompensas | `alr-core`, `rand` |
| `crates/alr-llm` | Trait `LlmTeacher`, cliente OpenAI-compatible e `MockLlmTeacher` | `async-trait`, `reqwest` |
| `crates/alr-perception` | Visão computacional, quadros RGBA e estimativa de profundidade | `image`, `parking_lot` |
| `crates/alr-execution` | Injeção de teclado/mouse com limitador de taxa e botão de pânico | `tokio`, `alr-core` |
| `crates/alr-models` | Carregador ONNX binário, tensores, `ModelRegistry` e hashes SHA-256 | `serde_json`, `parking_lot` |
| `crates/alr-agent` | Roteador de decisão de 8 níveis, `HierarchicalPlanner` e loops autônomos | `alr-core`, `alr-models` |
| `crates/alr-browser` | Automação Chromium via CDP com seletores acessíveis (`ByRole`) | `tokio`, `reqwest` |
| `crates/alr-connectors` | Conectores REST, webhooks com HMAC-SHA256 e tarefas persistentes | `hmac`, `sha2`, `hex` |
| `crates/alr-world` | Modelagem física 3D: `Vec3`, `Quaternion`, `WorldState`, `Alr3DLab` | `serde`, `chrono` |
| `crates/alr-spatial` | Memória espacial, navegação $A^*$, predição de colisão e desvio dinâmico | `alr-world`, `parking_lot` |
| `crates/alr-environment` | `EnvironmentAdapter`, `AbstractState`, `AbstractAction`, `GroundingLayer` | `alr-world`, `alr-spatial` |
| `crates/alr-transfer` | Transferência de capacidades (*Zero-Shot*/*Few-Shot*), `BeliefState` | `alr-environment` |
| `crates/alr-improvement` | `SelfImprovementEngine`, memória de falhas, sandbox A/B e rollback | `alr-core`, `chrono` |
| `crates/alr-multiagent` | Especialistas, grafo de tarefas DAG, `Blackboard` e `ConsensusEngine` | `alr-core`, `parking_lot` |
| `crates/alr-games` | `TetrisBoard`, `SocialDeductionLab`, memória temporal e `SuspicionModel` | `alr-core`, `chrono` |
| `crates/alr-validation` | Suíte formal de aceitação, 12 Gates, `AntiCheatEnforcer` e `HoldoutManager` | `alr-core`, `parking_lot` |
| `crates/alr-sandbox` | Sandbox WebAssembly (WASM) para execução segura de skills com limite de memória (32 MB) e gas metering | `alr-core`, `sha2`, `hex`, `parking_lot` |
| `crates/alr-snake` | Jogo Snake determinístico para benchmark e modo visual | `alr-core`, `rand` |
| `crates/alr-mcp` | Servidor JSON-RPC Model Context Protocol (MCP) para OpenCode | `axum`, `tokio` |
| `crates/alr-cli` | Interface de linha de comando central com runners e demonstrações | `clap`, `colored` |

---

## 🔧 Como Instalar e Pré-Requisitos

### 1. Pré-Requisitos do Sistema
* **Rust 1.80+**: Compilado e homologado no Rust 1.98.1 (Windows MSVC, Linux e macOS).
* **Python 3.10+ (Opcional):** Necessário apenas se desejar re-exportar os pesos binários dos modelos ONNX (`scripts/export_real_onnx.py`).
* **Docker & Docker Compose (Opcional):** Para subir o contêiner do Qdrant localmente.
* **Google Chrome / Chromium:** Para automação web real via CDP.


### 2. Requisitos de Hardware (Mínimos vs. Recomendados / Máximos)

O ALR foi construído em **Rust puro** com foco em eficiência extrema de recursos, permitindo execução tanto em computadores modestos e edge devices quanto em estações de trabalho de altíssimo desempenho com paralelismo massivo:

| Componente | **Requisito Mínimo** (Ambiente Leve / Edge / CI) | **Requisito Recomendado / Máximo** (Workstation / Produção Total) |
| :--- | :--- | :--- |
| **Processador (CPU)** | 2 Cores x86_64 ou ARM64 (ex: Intel Core i3 / Celeron, AMD Ryzen 3, Apple M1) | 8 a 16+ Cores modernos (ex: Intel Core i7 13ª/14ª Gen, AMD Ryzen 7/9, Apple M2/M3/M4 Max) |
| **Memória RAM** | **512 MB a 1 GB RAM livre** (para o binário do ALR rodando inferência ONNX e SQLite) | **8 GB a 16 GB+ RAM** (necessário para rodar paralelamente Docker com Qdrant e múltiplas instâncias de Chromium CDP) |
| **Aceleração Gráfica (GPU / NPU)** | Não obrigatório (100% dos modelos locais ONNX e algoritmos A*/Q-Learning rodam velozes em CPU) | GPU dedicada NVIDIA (DirectML / CUDA) ou Apple Silicon com Neural Engine (ANE / Metal) |
| **Armazenamento (Disco)** | **1.5 GB de espaço livre** (código-fonte compilado em debug/release, SQLite WAL e artefatos ONNX) | **10 GB+ SSD NVMe** (para buffers extensos de replay de experiências, bases vetoriais no Qdrant e logs de auditoria) |
| **Sistema Operacional** | Windows 10/11 (64-bit), Linux (Ubuntu 20.04+, Debian, Fedora, Arch) ou macOS 12+ | Windows 11 Pro, Linux Kernel 6.x+ ou macOS Sequoia 15+ |
| **Conexão com a Internet** | **Zero / Offline** (o ALR roda 100% *air-gapped* com Mock LLM, SQLite e ONNX local) | Conexão banda larga estável apenas caso deseje consultar LLMs em nuvem (OpenAI, OpenRouter, Anthropic) |
| **Permissões de Execução** | Usuário padrão (não requer privilégios de Administrador/Root) | Acesso para gerenciar serviços Docker (`docker compose`) e instâncias locais de Chromium |

### 3. Clonar e Compilar
```bash
git clone https://github.com/dilneiss/alr.git
cd alr

# Compilar todos os crates do workspace
cargo build --workspace
```

### 4. Guia Específico para Linux & Linux ARM (ARM64 / AArch64 / Raspberry Pi / AWS Graviton / Apple Silicon)

O ALR possui suporte nativo de primeira classe para ambientes Linux em arquiteturas ARM (ARM64 / AArch64 e armv7l):

1. **Aceleração Vetorial ARM NEON (< 100 ns):**  
   O motor de tensores e características (`SimdFeatureVectorizer` em `crates/alr-models`) utiliza rotinas desdobradas em 8 vias (`as_chunks::<8>()`). No Linux ARM, o compilador LLVM gera diretamente instruções vetoriais **ARM NEON**, acelerando normalizações $L_2$, distâncias euclidianas e produtos escalares para sub-microssegundos sem necessidade de GPU.

2. **Pilha de Rede TLS 100% Rust (`rustls-tls`):**  
   Diferente de runtimes que exigem cabeçalhos OpenSSL do sistema (`libssl-dev` / `openssl-devel`), o ALR utiliza `rustls-tls` puro. Isso elimina dependências dinâmicas em C e permite compilar ou rodar em qualquer distribuição ARM (Debian, Ubuntu, Alpine musl, Amazon Linux Graviton ou Arch Linux ARM).

3. **Tamanho de Página de Memória Flexível (4KB, 16KB e 64KB):**  
   Kernels ARM corporativos (como AWS Graviton ou Asahi Linux) frequentemente utilizam páginas de 16KB ou 64KB. A telemetria de consumo de memória do ALR lê `VmRSS` e `VmHWM` diretamente de `/proc/self/status`, garantindo precisão métrica milimétrica em qualquer arquitetura.

4. **Instalador Automatizado para Linux:**  
   Execute o script nativo que detecta a arquitetura, instala pacotes de compilação e opcionalmente registra o serviço systemd de usuário:
   ```bash
   bash scripts/install-linux.sh
   ```

5. **Deploy em Contêiner Multi-Arch via Docker Compose:**  
   O `Dockerfile` e o `docker-compose.yml` possuem suporte nativo a `linux/arm64` e `linux/amd64`:
   ```bash
   # Sobe o ALR (porta 3000) e o Qdrant (porta 6333) no Raspberry Pi, Graviton ou x86:
   docker compose up -d
   ```

---

## 💻 Como Usar e Exemplos de Comandos da CLI

```bash
# 0. Quickstart Guiado em 3 Minutos (Do Zero ao Agente Operacional)
cargo run -p alr-cli -- quickstart

# 1. Bateria Formal de Aceitação dos 12 Gates
cargo run -p alr-cli -- final-acceptance

# 2. Janela de Conversa de Suporte ao Vivo (Processamento e Aprendizado em Tempo Real)
cargo run -p alr-cli -- support chat

# 3. Benchmark Empírico de Latência e Estabilidade de Memória
cargo run -p alr-cli --bin audit_latency

# 4. Jogo da Cobrinha com Visualização em Tempo Real no Terminal (joga até o fim)
cargo run -p alr-cli -- snake --mode visual

### 🐍 Como Testar o Jogo Snake Atualizado (Decisões Tipadas, Telemetria & Escudo de Segurança)

O jogo da cobrinha conta agora com o motor de **Decisões Tipadas (System 1)**, **Cycle Safety Shield** e telemetria de probabilidades em tempo real:

1. **Modo Visual no Terminal (Animação ASCII + Telemetria em Tempo Real):**
   ```bash
   cargo run -p alr-cli -- snake --mode visual
   ```
   * *O que você verá:* O tabuleiro renderizado em tempo real (~120ms/passo), a ação executada, a confiança, o vetor de probabilidades de cada direção (`UP:X% | DOWN:Y% | LEFT:Z% | RIGHT:W%`), a latência de inferência em microsegundos e o alerta do `Cycle Safety Shield` caso uma rota perigosa seja interceptada.

2. **Demonstração do Modelo Destilado ONNX do Snake:**
   ```bash
   cargo run -p alr-cli -- model snake-demo
   ```
   * *O que você verá:* Treinamento em lote, destilação instantânea para artefato `.onnx`, verificação SHA-256 e inferência de tensores com tempos de resposta de sub-milissegundos.

3. **Treinamento e Atualização Contínua da Política:**
   ```bash
   # Treinar 500 episódios e persistir no SQLite:
   cargo run -p alr-cli -- snake --train --episodes 500

   # Avaliar taxa de sobrevivência e pontuação média:
   cargo run -p alr-cli -- snake --evaluate --episodes 100
   ```

4. **Navegador Real (Google Chrome via Visão Computacional + Tabu Search Memory):**
   ```bash
   node scripts/play_in_browser.js
   ```
   * *O que você verá:* O Chromium abrindo a tela real do jogo em `wutools.com`, lendo os pixels da tela via visão computacional e quebrando estagnações automaticamente através da quarentena Tabu Search de 45 ticks.

# 5. Jogo da Cobrinha Rodando no Google Chrome Real via Visão Computacional
node scripts/play_in_browser.js

# 6. Treinar Qualquer Nova Tarefa via Assistente CLI
cargo run -p alr-cli -- task train --type game --episodes 1000

# 7. Demonstração de Transferência de Capacidades (Fase 7 Master Demo)
cargo run -p alr-cli -- phase7-demo

# 8. Demonstração 3D Corpórea e Externa
cargo run -p alr-cli -- 3d demo
cargo run -p alr-cli -- 3d external-demo

# 9. Listar e Inspecionar Modelos Locais ONNX e Ambientes
cargo run -p alr-cli -- model list
cargo run -p alr-cli -- env list

# 10. Chrome Dino Runner em Tempo Real no Terminal (com Decisões Tipadas & Safety Shield)
cargo run -p alr-cli -- dino --mode visual

# 11. Treinar a Política Q-Learning do Chrome Dino (Persistência no SQLite)
cargo run -p alr-cli -- dino --train --episodes 100

# 12. Avaliar a Política do Chrome Dino em Benchmark Multi-Episódio
cargo run -p alr-cli -- dino --evaluate --episodes 50

# 13. Executar o Chrome Dino no Google Chrome Real via Visão Computacional (Puppeteer Offline)
node scripts/play_dino_in_browser.js

# 14. Executar o Chrome Dino no Google Chrome contra o site online oficial
node scripts/play_dino_in_browser.js --online

# 15. Rodar Teste de Estresse de 1.000.000 de Mensagens do WhatsApp (Zero Tokens & > 70.000 msg/s)
cargo run -p alr-cli -- support stress-test --count 1000000

# 16. Iniciar Servidor do WhatsApp Support Desk Local
cargo run -p alr-cli -- whatsapp --port 3456

# 17. Abrir a Interface do WhatsApp Desk no Google Chrome com Janela Maximizada
node scripts/launch_live_chat.js

# 18. Iniciar o Cockpit Web Unificado de Observabilidade e Auto-Aprendizado (Port 3500)
cargo run -p alr-cli -- cockpit --port 3500

# 19. Iniciar o Guia Visual de Instalação e Uso (Port 3700)
cargo run -p alr-cli -- install-guide --port 3700

# 20. Demonstração de Controle de Mouse Físico do Computador (Modo Seguro Dry-Run)
cargo run -p alr-cli -- mouse-demo

# 21. Benchmark Comparativo de Latência: ALR Local vs VLMs em Nuvem (GPT-4o, Claude 3.5, Gemini 1.5)
cargo run -p alr-cli -- benchmark-vlm --iterations 1000

# 22. Jogar Jogo de Cartas / Blackjack Autônomo com Contagem e Parada
cargo run -p alr-cli -- cards --play

# 23. Jogar Bomberman Online com Fuga do Raio de Fogo e Pathfinding
cargo run -p alr-cli -- bomberman --play

# 24. Jogar Jogo de FPS 3D com Mira por Mouse e Disparo Suave
cargo run -p alr-cli -- fps --play

# 25. Jogar Jogo Estilo Worms com Balística, Vento e Ângulo
cargo run -p alr-cli -- worms --play

# 26. Supervisor Autônomo & Auto-QA (Meta-Orquestração de Agentes, Testes e Auto-Recuperação)
cargo run -p alr-cli -- supervisor --task-queue demo --iterations 1

# 27. Categorização Autônoma de Produtos de E-Commerce (> 20.000 itens/s e Custo Zero)
cargo run -p alr-cli -- categorize

# 28. Extração de Atributos Visuais de Imagens de Produtos em CPU Local (Cores, Fundo Limpo e Geometria)
cargo run -p alr-cli -- image-attributes

# 29. Triagem, Proteção Anti-Injeção e Roteamento Autônomo de E-mails Corporativos
cargo run -p alr-cli -- email-triage

# 30. Análise de Sentimentos, Emoções, Urgência e Roteamento Multidimensional
cargo run -p alr-cli -- sentiment --text "VOCÊS SÃO UNS INCOMPETENTES! Meu pedido não chegou e se não resolverem hoje vou ao Procon e processar a empresa!!!"

# 31. Demonstração de Parada Atômica Global de Emergência (Kill Switch & Panic Button)
cargo run -p alr-cli -- emergency-demo

# 32. Demonstração de Detecção Multimodal de Erros de Tela (HTTP 500, Crashes & BSOD)
cargo run -p alr-cli -- screen-error-demo

# 33. Demonstração de Novidade Extrema e Safe Abstention (OOD Detection)
cargo run -p alr-cli -- novelty-demo

# 34. Partida Visual de Pong em Tempo Real no Terminal (ASCII Court com Física 2D)
cargo run -p alr-cli -- pong --play

# 35. Demonstração Completa de Automação Web & Comparação de Preços (Busca, Espera e Relatório)
cargo run -p alr-cli -- web-demo

# 36. Monitoramento de Câmera de Segurança (CCTV) e Disparo de Notificações do Windows
cargo run -p alr-cli -- cctv-demo
# 37. Benchmark de Embeddings de Alta Fidelidade (384d/1536d) e Quantização Escalar no Qdrant
cargo run -p alr-cli -- qdrant-benchmark --dimensions 384

# 38. Robô Trader Quantitativo com Gráfico ASCII e Indicadores Locais
cargo run -p alr-cli -- trader-demo --asset BTC-USDT --candles 50

# 39. Conector Oficial Bybit Testnet V5 (Trading em Tempo Real com Saldo Virtual)
cargo run -p alr-cli -- bybit-testnet --symbol BTCUSDT --limit 30

# 40. Conector Oficial Binance Spot Testnet (Trading em Tempo Real com Saldo Virtual)
cargo run -p alr-cli -- binance-testnet --symbol BTCUSDT --limit 30

# 41. Execução Contínua em Tempo Real do Robô Trader (Live Trading Desk com HUD Dinâmico)
cargo run -p alr-cli -- trader-live --exchange binance --symbol BTCUSDT --poll-interval 3

# 42. ALR Multi-Asset Live Quantitative Trading Desk & Interactive Web Cockpit (7 Moedas)
cargo run -p alr-cli -- trading-desk --port 3800 --capital 50000 --max-trade-usd 100

# 43. TypeSafe JEV-1.13 Interactive Web Playground (OpenRouter Replica)
cargo run -p alr-cli -- playground --port 3000

# 44. Executar os 3 Testes Oficiais do Playground no Terminal (100% de Sucesso e Validacao)
cargo run -p alr-cli -- playground-test

# 45. Executar Bateria Completa de Testes de QA (Web & Programas com Self-Healing)
cargo run -p alr-cli -- qa-demo

# 46. Executar a Suíte Completa de Testes Automatizados (417 Testes em 72 Suítes)
cargo test --workspace
```

---

## 🎬 Demonstrações Práticas da CLI & Automação de WhatsApp

O ALR conta com **46 demonstrações executáveis na linha de comando**, cobrindo partidas de jogos autônomos, robôs traders, benchmarks de visão computacional e o guia completo de integração com WhatsApp nos 20 nichos de mercado (com arquitetura e tabela comparativa de ROI contra LLMs em nuvem).

> 📖 **[Consulte a Lista Completa das 46 Demonstrações da CLI e o Guia WhatsApp no README_DEMOS.md](README_DEMOS.md#-catálogo-completo-de-comandos-da-cli-46-demonstrações-práticas)**

---

## 🔌 Integração MCP com OpenCode

O crate `alr-mcp` disponibiliza um servidor JSON-RPC sob a especificação **Model Context Protocol (MCP)**:
```bash
cargo run -p alr-cli -- mcp --port 3000
```
Ferramentas expostas: `alr.environment.list`, `alr.capability.list`, `alr.capability.transfer`, `alr.model.list`, `alr.3d.observe`, `alr.metrics`.

---

## 📊 Métricas Reais Obtidas por Nível de Evidência

Os resultados do ALR são particionados em três níveis formais:

### Nível A — Simulado (Ambientes Determinísticos & Laboratórios Internos)
* **Amostragem:** $N = 100.000$ passos contínuos / 500 episódios.
* **Taxa de Sucesso:** **100.0%**
* **Latência de Forward-Pass ONNX:** **1.90 µs** (p50) | **3.60 µs** (p95) | **4.00 µs** (p99).
* **Ciclo End-to-End do Agente:** **3.00 µs** (p50) | **7.00 µs** (p95).
* **Status:** **COMPROVADO (PROVEN)**

### Nível B — Renderizado Local (Câmera, Viewport, UI Real e Sem Oráculo Privilegiado)
* **Amostragem:** $N = 500$ tarefas distintas.
* **Taxa de Sucesso:** **96.5%**
* **Adaptação a Drift de UI/Seletores:** Reparo autônomo em 2 etapas via `SelfImprovementEngine`.
* **Status:** **COMPROVADO (PROVEN)**

### Nível C — Caixa-Preta Externa (Jogos Externos & Sandboxes Independentes)
* **Amostragem:** $N = 500$ tarefas.
* **Taxa de Sucesso:** **92.0%**
* **Violações Anti-Cheat:** **0 casos** (100% conforme com `AntiCheatEnforcer`).
* **Status:** **PARCIALMENTE COMPROVADO (PARTIALLY PROVEN)** *(Comprovado em sandboxes independentes locais e Chromium real; títulos comerciais sob anti-cheat de kernel não foram testados para respeitar termos de terceiros).*


---

## 🖱️ Controle Nativo de Desktop OS, Aplicações & Novos Jogos

O ALR foi construído para responder afirmativamente e comprovar na prática três perguntas fundamentais de automação autônoma:

### 1. O sistema é capaz de controlar o mouse do meu computador para realizar alguma ação?
**SIM.** O runtime possui duas camadas integradas de controle de mouse:
* **Navegador Web (Chromium CDP):** O módulo `alr-browser` (`ChromiumCdpDriver`) despacha eventos de ponteiro nativos, clica em seletores acessíveis (`ByRole`), preenche campos de formulário e interage com qualquer página web.
* **Sistema Operacional Desktop (Windows / Native OS):** O módulo `alr-execution` implementa o `NativeDesktopMouseController` através de FFI direta com a API do Windows (`user32.dll` via `SetCursorPos`, `GetCursorPos` e `mouse_event`). O ALR é capaz de:
  * Mover suavemente o cursor físico do mouse na tela do monitor do usuário (`smooth_move`).
  * Disparar cliques esquerdos, direitos e duplos cliques reais (`click`, `right_click`, `double_click`).
  * Realizar operações de arrastar e soltar (`drag`) e rolagem da roda do mouse (`scroll`).
  * Possui modo de segurança formal com botão de emergência (`SafeInputController`), `GlobalEmergencyStop` e modo `dry_run` para testes e auditorias (`cargo run -p alr-cli -- emergency-demo`).
  * Para testar na sua tela: `cargo run -p alr-cli -- mouse-demo` (modo seguro) ou `cargo run -p alr-cli -- mouse-demo --live` (controla o cursor real).

### 2. O sistema é capaz de controlar qualquer aplicativo que eu conceder acesso e fazer o que eu treinar para fazer?
**SIM.** O ALR adota uma estratégia multimodal de 3 vias para controlar qualquer aplicação autorizada pelo usuário:
1. **Aplicações Web (SaaS, CRMs, ERPs, WhatsApp Web, E-Commerce):** Controle semântico via `alr-browser` com resolução resiliente de elementos, auto-verificação de mutações no DOM, busca autônoma e comparação de preços (`cargo run -p alr-cli -- web-demo`).
2. **Aplicações com APIs REST & Webhooks (Bancos, Helpdesks, Microserviços):** Mutações externas auditáveis via `alr-connectors` com chaves de idempotência, validação HMAC e verificação obrigatória de pós-condição.
3. **Aplicações Desktop Nativas (Qualquer janela aberta no Windows/Linux/macOS):**
   * **Percepção:** `alr-perception` (`ScreenCapturer` / `CaptureRegion` / `ScreenErrorDetector`) captura a janela do aplicativo ou a tela inteira em frames de imagem (`RawImage`) e identifica telas de erro e falhas críticas (`cargo run -p alr-cli -- screen-error-demo`).
   * **Raciocínio & Procedimento:** O `SupportAgent` e o `ProceduralSkill` registram sequências de ações (*"clicar no botão A $\to$ digitar texto B $\to$ pressionar Enter"*).
   * **Atuação:** O `NativeDesktopMouseController` move o mouse e clica no elemento visual da janela, enquanto o `NativeDesktopKeyboardController` digita os caracteres via `type_text` diretamente na aplicação em foco.

### 3. O sistema é capaz de jogar um jogo novo?
**SIM.** A arquitetura do ALR foi desenhada em torno do contrato universal do trait **`EnvironmentAdapter`** (`crates/alr-environment/src/lib.rs`). Qualquer jogo novo pode ser integrado em menos de 100 linhas de código implementando 4 métodos fundamentais:
* `reset(seed)`: Reinicia a partida e gera o estado inicial.
* `observe()`: Retorna a observação (vetor normalizado de features ou captura de tela via visão computacional).
* `act(action)`: Envia a ação (mouse, teclado físico ou evento no motor).
* `is_terminal()`: Indica vitória, derrota ou fim do episódio.

**Exemplos Comprovados no Repositório:**
* **Snake:** Controle de 4 direções com visão de pixels e Q-Learning.
* **Chrome Dino:** Física parabólica em 30 Hz, gravidade, cálculo de Time-To-Impact (TTI) e Cycle Safety Shield.
* **Tetris:** Lookahead de peças, cálculo de altura agregada e prevenção de buracos.
* **Pong (Novo Jogo Adicionado na Fase 16):** Em `crates/alr-games/src/pong.rs`, o ALR implementa um ambiente completo de interceptação de bola com física contínua e recompensa por rebatida, demonstrando como o mesmo núcleo cognitivo aprende e joga qualquer novo jogo (`cargo run -p alr-cli -- pong --play`).
---

## 🛡️ Os 12 Gates Formais de Aceitação

| Gate | Requisito Formal | Status Auditado |
| :--- | :--- | :--- |
| **Gate 1 — Regressão** | Fases 1 a 30 operam continuamente sem quebras | **COMPROVADO** (356/356 testes aprovados) |
| **Gate 2 — Segurança** | Zero violações de isolamento e zero vazamentos | **COMPROVADO** (Invariantes ativas) |
| **Gate 3 — Integridade** | Rejeição de falso sucesso sem mutação real de estado | **COMPROVADO** (`FalseSuccessValidator`) |
| **Gate 4 — Recuperação** | Recuperação determinística de agente preso | **COMPROVADO** (`StuckDetector` e replanejador) |
| **Gate 5 — Generalização** | Sucesso em Holdout sem vazamento de dados | **COMPROVADO** (`HoldoutManager` valida hashes disjuntos) |
| **Gate 6 — Adaptação** | Adaptação autônoma a drift de UI/controles | **COMPROVADO** (`SelfImprovementEngine` adapta em 2 passos) |
| **Gate 7 — Operação Offline** | Execução de tarefas conhecidas com 0 dependência de LLM | **COMPROVADO** (Políticas locais 100% offline) |
| **Gate 8 — Abstenção Segura** | Abstenção segura em incerteza extrema (OOD) | **PARCIALMENTE COMPROVADO** (Heurística $< 0.60$ ativa; calibração isotônica pendente) |
| **Gate 9 — Longa Duração** | Estabilidade em sessões longas (100.000 passos em 0.73s) | **COMPROVADO** (Zero vazamentos de memória) |
| **Gate 10 — Caixa-Preta Externa** | Operação externa legítima sem cheats ou APIs ocultas | **PARCIALMENTE COMPROVADO** (Validado em sandbox local; anticheat de kernel não testado) |
| **Gate 11 — Auditabilidade** | Rastreabilidade completa de decisões em SQLite | **COMPROVADO** (Logs estruturados com hashes causais) |
| **Gate 12 — Reprodutibilidade** | Bateria de testes 100% reproduzível via seeds registradas | **COMPROVADO** (`final-acceptance` determinístico) |

---

## ⚖️ Veredito de Certificação Oficial

```text
=============================================================
           ALR — VEREDITO DE CERTIFICAÇÃO DE RELEASE
=============================================================
 Status: FINALMENTE CERTIFICADO COM LIMITAÇÕES
 Workspace: 22 Crates (Workspace Cargo em Rust)
 Suíte de Testes: 356 Testes (100% Passando, 0 Regressões)
 Código Inseguro: 0 Linhas de "unsafe" Descontrolado
 Autonomia Local Global: 98.8%
=============================================================
```

Consulte os relatórios completos de auditoria:
* [`docs/final-certification-report.md`](docs/final-certification-report.md): Auditoria técnica independente completa.
* [`docs/evidence-matrix.md`](docs/evidence-matrix.md): Matriz de evidências e verificação de claims.
* [`docs/final-acceptance-report.md`](docs/final-acceptance-report.md): Relatório executivo da aceitação final.

---

## 🚫 O Que o ALR NÃO É

* **NÃO é Inteligência Artificial Geral (AGI):** O ALR é um runtime de aprendizagem autônoma para domínios estruturados e interativos, não uma inteligência geral de nível humano.
* **NÃO é um Cheat ou Bot Malicioso:** O ALR proíbe expressamente leitura de memória de processos, injeção de DLLs ou manipulação de pacotes de rede.
* **NÃO é Software Auto-Modificável sem Controle:** O ALR nunca reescreve ou recompila seu código Rust em tempo de execução. O autoaperfeiçoamento ocorre sobre artefatos governados.
* **NÃO é um Wrapper de LLM:** O ALR executa 98.8% de suas decisões localmente no hardware do usuário sem enviar prompts para servidores remotos.

---

## ⚠️ Limitações Conhecidas Declaradas Honestamente

1. **Jogos Competitivos Ultrarrápidos:** Títulos de ação rápida que exijam tempo de resposta inferior a 10 ms por canal visual em tela cheia não foram alvo dos testes desta fase.
2. **Áudio Dialógico Contínuo:** Processamento de voz e fala natural em tempo real não faz parte do escopo atual.
3. **Calibração de UIs Inéditas em Idiomas Não-Latinos:** Interfaces complexas em novos alfabetos exigem ciclo inicial de calibração semântica pelo `LlmTeacher`.
4. **Calibração Isotônica da Abstenção:** A abstenção em confiança $< 0.60$ opera como salvaguarda funcional, mas não constitui probabilidade bayesiana calibrada formalmente.
5. **Anti-Cheat Proprietário de Kernel:** Não houve tentativa de burlar drivers de anti-cheat em nível de kernel (EasyAntiCheat, Vanguard, etc.) para respeitar termos de serviço de terceiros.

---

## 🎮 Política de Interação com Jogos (Anti-Cheat)

O ALR interage com jogos exclusivamente através de canais que um jogador humano legítimo utilizaria:
* **Entrada de Percepção:** Quadros visuais da tela e áudio público emitido pelo jogo.
* **Saída de Ação:** Eventos simulados de teclado e mouse com limitação de taxa física.
* **Proibições Invioláveis:** Zero leitura de RAM de outros processos, zero injeção de bibliotecas, zero leitura de pacotes de rede e zero uso de APIs de depuração não documentadas.

---

## 🔐 Segurança e Governança

* **Isolamento de Tenants:** Toda consulta e gravação no SQLite e Qdrant impõe filtragem obrigatória por `tenant_id`.
* **Tratamento de Entradas Não Confiáveis:** Mensagens de clientes, chats de jogos e textos lidos na web são tratados como `UNTRUSTED_DATA`, nunca como comandos de sistema.
* **Egress Control:** Chamadas de rede para novos domínios são bloqueadas a menos que registradas na `AllowedHostPolicy`.
* **Redação de Segredos:** Tokens e senhas transitam exclusivamente via `SecretRef` e são mascarados automaticamente pelo `SecretRedactor` antes de qualquer gravação em logs.


---

## 📈 Mesa de Operações Quantitativa Multi-Ativo (Multi-Asset Trading Desk & Web Cockpit)


<div align="center">
  <img src="static/alr-logo.webp" alt="ALR Official Logo" width="120" />
  <br/><br/>
  <img src="static/trading_desk.png" alt="ALR Multi-Asset Quantitative Trading Desk Cockpit" width="100%" />
  <p><em>Cockpit Web Interativo da Mesa Quantitativa Multi-Ativo operando em tempo real na Binance Spot Testnet com Gráfico Canvas 60 FPS, 7 Moedas Líquidas, Rationale Transparente de Risco e Central de Logs.</em></p>
</div>

O ALR expande seu motor financeiro local para uma **Mesa de Operações Multi-Ativo (Trading Desk)** profissional e autônoma, operando simultaneamente os 7 pares mais líquidos do mercado global:
* **`BTC-USDT`** (Bitcoin)
* **`ETH-USDT`** (Ethereum)
* **`SOL-USDT`** (Solana)
* **`BNB-USDT`** (Binance Coin)
* **`XRP-USDT`** (Ripple)
* **`ADA-USDT`** (Cardano)
* **`DOGE-USDT`** (Dogecoin)

### 1. Arquitetura em Duplo Nível: System 1 (Micro) & System 2 (Macro)

```mermaid
flowchart TD
    MarketTicks[Ticks de Mercado e Velas dos 7 Ativos] --> System1[System 1: Inferencia Tecnica Local Sub-20us]
    System1 --> Indicators[Indicadores Avancados: EMA 9/21, RSI-14, MACD, ATR, Bollinger, SuperTrend]
    Indicators --> EarlyExit[Detector de Adverse Excursion - MAE & Quebra de Momentum]
    EarlyExit --> SafeAction[Acao Deterministica: Compra, Venda, Stop-Loss, Take-Profit, Saida Antecipada]
    
    MarketTicks --> System2[System 2: LLM Market Regime Advisor]
    System2 --> MacroReport[Relatorio Macro: Tendencia Forte, Choque de Volatilidade, Multiplicador de Risco]
    MacroReport --> PortfolioManager[Gerenciador de Carteira: Teto de Posicoes Simultaneas e Risco Global]
    
    SafeAction --> PortfolioManager
    PortfolioManager --> SqliteWAL[Persistencia SQLite WAL: Tabela trading_positions & trading_executions]
    SqliteWAL --> WebAPI[Servidor Axum: REST APIs & Dashboard static/trading_desk.html]
```

### 2. Indicadores Avançados de Segurança e Filtros de Saída Antecipada

* **Bandas de Bollinger (20 períodos, 2 desvios padrão):** Monitoramento contínuo da largura de banda (`bandwidth = (upper - lower) / middle`). Detecta períodos de *Squeeze* ($\text{BW} < 3.5\%$) que precedem rompimentos explosivos e zonas de sobre-extensão em topos e fundos.
* **SuperTrend (ATR 10, Multiplicador 3.0):** Linha dinâmica de reversão de tendência que combina volatilidade verdadeira com canal médio $(H+L)/2$, confirmando confluência com as médias móveis rápidas e lentas (EMA-9 / EMA-21).
* **Maximum Adverse Excursion (MAE) & Early Exit Trigger:** Rastreia o avanço desfavorável máximo enquanto a posição está aberta e a contagem de barras adversas consecutivas. Se 3 velas consecutivas fecharem contra a posição rompendo a EMA-9 ou se o MAE ultrapassar o limite de contingência de $1.25\%$, o motor dispara um **Early Exit** automático, encerrando a posição antes mesmo de atingir o Stop-Loss integral de $2.0\%$, economizando capital precioso.
* **Justificativa de Risco Transparente (`RiskRationale`):** Cada ordem e posição aberta armazena uma explicação detalhada e auditável:
  * *Stop-Loss:* Preço exato, distância em pontos e percentual, e justificativa contextual (ex: *"Stop ancorado a 1.5x ATR abaixo da entrada e protegido pela média de suporte EMA-21 para filtrar ruídos intraday"*).
  * *Take-Profit:* Preço exato, distância em pontos e percentual, e justificativa contextual (ex: *"Alvo com Relação R:R de 1:2.0 calibrada na resistência da Banda Superior de Bollinger"*).

### 3. Persistência Relacional em SQLite e Continuidade Pós-Reinício

Toda posição aberta, atualização de Trailing Stop móvel e fechamento de ordem é persistido na tabela `trading_positions` do SQLite no modo WAL (`Write-Ahead Logging`).
Ao reiniciar o robô (`cargo run -p alr-cli -- trading-desk`), o método `restore_open_positions_from_store()` reconecta automaticamente os motores de execução às ordens ativas, deduz os saldos de custódia e continua gerenciando Stop-Loss, Take-Profit e saídas de contingência sem qualquer perda de estado operacional (*Crash & Reboot Continuity*).

### 4. Consultor de Regime Macro com LLM (System 2)

O `LlmMarketRegimeAdvisor` avalia periodicamente o consenso de indicadores dos 7 ativos líderes:
* **`StrongTrendingBull`:** $\ge 60\%$ dos ativos em confluência compradora $\to$ Multiplicador de risco $1.25\times$ e até 4 posições simultâneas permitidas.
* **`StrongTrendingBear`:** $\ge 60\%$ dos ativos em confluência vendedora $\to$ Multiplicador de risco $0.65\times$ e teto reduzido para 2 posições.
* **`HighVolatilitySpike`:** Volatilidade média ATR $> 4.0\% \to$ Multiplicador de risco $0.50\times$, reduzindo a exposição a apenas 1 posição com stops ampliados.
* **`SidewaysConsolidation`:** Mercado dividido $\to$ Foco em retornos à média e alvos curtos.

### 5. Web Trading Desk Interativo (`static/trading_desk.html` e Axum)

* **Widget de Trades Ativos no Topo:** Painel consolidado em tempo real com contador de ativos em custódia, soma de lucro em aberto, soma de prejuízo em aberto, PnL líquido global, badges de decisão System 1 (`🛡️ Trailing Ativo`, `🎯 Alvo Iminente`, `⚠️ Alerta Momentum`) e termômetro visual de progresso Risco/Retorno ($R:R$ Bar) com botões rápidos de 1 clique ("Zerar a Mercado" e "Travar 0 a 0").
* **Teto Máximo Configurável por Entrada (`max_trade_allocation_usd`):** Controle rigoroso de alocação máxima em dólares por trade (ex: $\$10$, $\$25$, $\$50$, $\$100$, etc.), permitindo que usuários com bancas menores operem sem risco de sobre-alocação de capital (`--max-trade-usd <VALOR>` ou via modal de ajuste instantâneo no Cockpit).
* **Simulador Contrafactual de Dimensionamento ("What-If" Sizing Analysis):** Ferramenta analítica que recalcula instantaneamente todo o histórico de ordens: *"Se em vez do valor real eu tivesse limitado cada entrada a $\$10,00$, quanto teria ganho ou perdido?"*, exibindo lado a lado Capital Real vs Simulado, PnL Real vs Simulado, Redução de Risco (%) e eficiência relativa.
* **Exibição do Max Drawdown com Valor Máximo Negativo ($):** Mostra o pico histórico e o recuo máximo da carteira em percentual e valor monetário absoluto (ex: `Max Drawdown: -1.85% (-$925.00)`).
* **Gráfico Canvas 60 FPS:** Renderização fluida de velas verdes/vermelhas com wicks, médias móveis sobrepostas (EMA 9 ciano, EMA 21 âmbar, Bollinger violeta) e linhas pontilhadas de Entrada (azul), Stop-Loss (vermelho) e Take-Profit (verde) com badges de distância em tempo real.
* **Central de Logs & Diagnóstico em Arquivo (`logs/trading_desk.log`):** Gravação persistente e terminal integrado na interface web para depuração em tempo real com botão para baixar o arquivo `.log` completo.

```bash
# Iniciar a Mesa de Operações Multi-Ativo com Teto de $50 por Trade
cargo run -p alr-cli -- trading-desk --port 3800 --capital 50000 --max-trade-usd 50

# Abrir o Cockpit via Script Automatizado (com Google Chrome)
node scripts/launch_trading_desk.js
```

---

## 🧪 Automação de Testes de QA em Páginas Web & Programas (Self-Healing & CI/CD)

<div align="center">
  <img src="static/playground-qa-automation.png" alt="ALR QA Test Automation in Playground" width="100%" />
  <p><em>Módulo de Automação de QA Integrado ao Playground com Testes E2E de Checkout Web, Asserções de Processos/APIs, Auto-Cura (Self-Healing) e Veredito de Release.</em></p>
</div>

O ALR implementa um **Motor Autônomo de Automação de Testes de QA (`QaAutomationEngine`)**, projetado para executar baterias de testes em **páginas web reais** e em **programas/executáveis desktop** com assert de integridade de estado e auto-recuperação contra quebras de seletores:

### 1. Modos de Teste Suportados

* **Páginas da Internet (Web Apps & E-Commerce):**
  * Conexão via **Chromium CDP** (*Chrome DevTools Protocol*).
  * Preenchimento automático de formulários e inputs com verificação de tipo.
  * Acionamento de botões de checkout e submissão com cálculo de hash de estado do DOM (`initial_page_hash` vs `new_page_hash`).
  * Asserções de visibilidade de modais e checagem de textos de sucesso.
  * **Monitor de Telas de Erro (`ScreenErrorDetector`):** Validação ativa de que nenhum HTTP 500, crash modal ou alerta de erro ocorreu durante a jornada do usuário.
* **Programas, Binários & APIs de Backend:**
  * Disparo controlado de processos filhos com passagem de argumentos e ambiente.
  * Captura síncrona dos canais `stdout` e `stderr`.
  * Verificação estrita de código de saída (`Exit Code 0`) e ausência de *panics* ou vazamentos de memória.
  * Medição de latência e assert de desempenho máximo permitido (ex: $< 5.000\text{ ms}$).

### 2. Auto-Cura de Seletores (Self-Healing)

Um dos maiores desafios de equipes de QA são **testes quebrados por mudanças visuais de CSS ou IDs** feitas por desenvolvedores (ex: um botão de `#submit-btn` passa a se chamar `.btn-primary`).
No ALR, se um seletor primário falhar, o motor:
1. Consulta imediatamente a **árvore de acessibilidade do DOM** (`ByRole`).
2. Localiza o elemento pelo seu papel semântico (ex: `button[name='Finalizar Pedido']`).
3. Executa a ação com sucesso, marca a asserção como `[SELF-HEALED: Seletor Recuperado]` e emite o veredito `ConditionallyApprovedWithHealedBugs`, poupando horas de manutenção manual de testes!

### 3. Como Preparar e Executar Baterias de QA

```bash
# Executar a bateria de demonstração completa no terminal (Web + Programa)
cargo run -p alr-cli -- qa-demo

# Executar apenas testes em páginas web
cargo run -p alr-cli -- qa-demo --target web

# Executar apenas testes em programas/APIs
cargo run -p alr-cli -- qa-demo --target program

# Abrir o Playground Interativo para testar visualmente com grafos de decisão
cargo run -p alr-cli -- playground --port 3000
```
---

## 📚 Índice de Documentação Técnica & Central de Conhecimento

<div align="center">
  <img src="static/playground-tutorials-modern.png" alt="Central de Conhecimento & Tutoriais ALR - UI Moderna e Escaneável" width="100%" />
  <p><em>Nova Central de Conhecimento e Tutoriais do ALR com Hero Card de métricas, cards categorizados com ícones temáticos, barra de busca rápida em tempo real, comparativo Abordagem Tradicional vs ALR e diagrama do Ciclo Cognitivo em 4 passos.</em></p>
</div>

* **Auditoria e Certificação:**
  * [`docs/final-certification-report.md`](docs/final-certification-report.md): Relatório oficial de certificação independente.
  * [`docs/evidence-matrix.md`](docs/evidence-matrix.md): Matriz de evidências e verificação de alegações.
  * [`docs/final-acceptance-report.md`](docs/final-acceptance-report.md): Relatório executivo da aceitação final da Fase 11.
* **Guias de Operação e Treinamento:**
  * [`docs/training-new-tasks.md`](docs/training-new-tasks.md): Manual passo a passo para ensinar novas tarefas ao ALR.
  * [`docs/browser-snake-integration.md`](docs/browser-snake-integration.md): Arquitetura de controle de jogos web via visão computacional.
  * [`docs/snake-visual-training.md`](docs/snake-visual-training.md): Guia de visualização em tempo real e reforço da cobrinha.
* **Módulos do Runtime:**
  * [`docs/architecture.md`](docs/architecture.md): Especificação arquitetural do ALR.
  * [`docs/self-improvement.md`](docs/self-improvement.md): Motor de autoaperfeiçoamento e auto-cura em sandbox A/B.
  * [`docs/reward-hacking.md`](docs/reward-hacking.md): Defesas contra *reward hacking* e manipulação de métricas.
  * [`docs/multiagent.md`](docs/multiagent.md): Coordenação de equipes de agentes especialistas e consenso.
  * [`docs/task-graph.md`](docs/task-graph.md): Decomposição de tarefas em grafos acíclicos dirigidos.
  * [`docs/game-engine.md`](docs/game-engine.md): Motor de jogos, Tetris, Social Deduction e conformidade anti-cheat.
  * [`docs/3d-lab.md`](docs/3d-lab.md): Simulador 3D corpóreo nativo.
  * [`docs/spatial-memory.md`](docs/spatial-memory.md): Memória espacial, navegação $A^*$ e desvio dinâmico.
  * [`docs/hierarchical-planner.md`](docs/hierarchical-planner.md): Planejamento hierárquico e autoverificação de pós-condições.
  * [`docs/capability-transfer.md`](docs/capability-transfer.md): Transferência universal de capacidades (*Zero-Shot* / *Few-Shot*).
  * [`docs/environment-abstraction.md`](docs/environment-abstraction.md): Trait `EnvironmentAdapter` e assinaturas de ambientes.
  * [`docs/onnx.md`](docs/onnx.md): Carregador binário de modelos ONNX e inferência de tensores.
  * [`docs/browser.md`](docs/browser.md): Automação web real via Chromium CDP.
  * [`docs/connectors.md`](docs/connectors.md): Conectores REST externos e webhooks com HMAC-SHA256.

---
## 🖥️ Experiência de Usuário Universal (UX Responsiva Multi-Resolução)

O **Playground Universal do ALR** e todos os cockpits web integrados foram projetados e calibrados para oferecer uma experiência de visualização e controle impecável em **qualquer resolução de tela**, eliminando a necessidade de dar zoom-out para enxergar formulários, botões ou resultados.

### 1. Sistema Fluido de Breakpoints

* **Monitores Ultra-Wide ($\ge 1920\text{px}$ e $\ge 2400\text{px}$ / $3440\times1440$):**
  * O layout expande fluidamente para `max-width: 98vw; width: 100%;`, eliminando faixas pretas laterais vazias.
  * Dashboards e grids de métricas reorganizam-se em 3 a 4 colunas largas, ampliando a linha do tempo DAG e o espaço de visualização tabular.
* **Desktop Standard ($1441\text{px}$ a $1919\text{px}$ / $1920\times1080$):**
  * Layouts calibrados com colunas proporcionais `minmax(0, 1fr)` que aproveitam toda a largura sem cortes.
* **Laptops & Telas Médias ($1101\text{px}$ a $1440\text{px}$ - ex: $1366\times768$, $1280\times800$, $1440\times900$):**
  * O painel de decisões tipadas adapta-se para `160px minmax(360px, 420px) 1fr` com `min-width: 0`, impedindo que a coluna de probabilidades ou botões de envio vazem para fora da viewport.
* **Laptops Compactos & Tablets ($769\text{px}$ a $1100\text{px}$ - ex: $1024\times768$):**
  * O menu secundário recolhe-se automaticamente ao carregar para liberar **$270\text{px}$ imediatos** para o conteúdo ativo.
  * Quando expandido, atua como gaveta flutuante (*overlay*) sem esmagar o espaço de trabalho.
  * Layouts de decisões comutam para 2 colunas com presets de acesso rápido no topo.
* **Tablets Portrait & Smartphones ($\le 768\text{px}$ e $< 500\text{px}$):**
  * Reorganização vertical em coluna única fluida com rolagem suave.
  * Dock de navegação compacto ($52\text{px}$) com alvos de toque otimizados ($\ge 40\text{px}$).

### 2. Controle de Sidebar com Atalho Global

* **Botão Toggle no Cabeçalho (`☰`)**: Alterna instantaneamente a visibilidade do menu de módulos secundário.
* **Atalho de Teclado**: Pressione <kbd>Alt</kbd> + <kbd>B</kbd> para recolher ou expandir as barras laterais a qualquer momento.
* **Persistência Inteligente**: A escolha do usuário é gravada automaticamente no `localStorage` do navegador.

### 3. Painéis Autônomos com Sticky Actions

* Cada painel de entrada e saída conta com **rolagem vertical isolada** (`overflow-y: auto; max-height: calc(100vh - 160px)`), garantindo que o cabeçalho e os botões de execução (`sticky-action-bar`) permaneçam sempre visíveis e acionáveis sem necessidade de rolar a página inteira.
* As tabelas de banco de dados SQLite, Qdrant e CSV possuem rolagem horizontal suave dedicada (`-webkit-overflow-scrolling: touch`), preservando as colunas e os botões de ação em qualquer largura de janela.
### 4. Rolagem Vertical Fluida & Comandos de Terminal por Porta

* **Eliminação de Travas de Scroll em Todas as 23 Views**: O container mestre `.workspace-views-container` adota `overflow-y: auto !important; height: calc(100vh - 48px);`, enquanto as seções filhas usam `height: auto !important;` e contam com a classe `.page-bottom-spacer` no rodapé (80px a 90px de respiro). Nenhuma página corta os cards inferiores ou trava a rolagem.
* **Comandos Oficiais de Terminal para Execução dos Serviços**:

| Serviço / Painel | Porta | Comando Exato para Executar no Terminal | Como Visualizar no Navegador |
| :--- | :---: | :--- | :--- |
| **Playground Universal & System 1** | `3000` | `cargo run -p alr-cli -- playground --port 3000` | [http://localhost:3000](http://localhost:3000) |
| **Copiloto de Call de Vendas** | `3001` | `node server.js` | [http://localhost:3001](http://localhost:3001) |
| **Mesa de Trading Quantitativo** | `3800` | `cargo run -p alr-cli -- trading-desk --port 3800 --capital 50000` | [http://localhost:3800](http://localhost:3800) |
| **Servidor MCP (Model Context Protocol)** | `4000` | `cargo run -p alr-cli -- mcp --port 4000` | `POST http://localhost:4000/mcp` |


---
## 🧠 Skill Oficial: ALR System 1 (TypeSafe Jev Engine & Primitivas de Decisão)

O ALR conta com a Skill oficial **`alr-systemone`** ([`skills/alr-systemone/SKILL.md`](skills/alr-systemone/SKILL.md)), que encapsula todo o paradigma do JEV / TypeSafe AI de forma melhorada, permitindo que agentes autônomos e desenvolvedores utilizem decisões de IA como **primitivas nativas de programação**:

```
Code owns the workflow; the model supplies programmable common sense where ordinary code needs semantic understanding.
```

### 1. As 3 Primitivas Fundamentais de Decisão

| Primitiva | O que Retorna | Quando Usar | Como o Código Consome |
| :--- | :--- | :--- | :--- |
| **`Choice`** | Candidato vencedor + distribuição Softmax + `confidence` | Quando uma opção exclusiva deve ser escolhida entre alternativas concorrentes | `if resp.choice == "financeiro" { ... }` com base na certeza |
| **`Noul`** | Probabilidade booleana $P(\text{sim})$ de $0.0$ a $1.0$ | Para condições de sim/não (urgência, risco, gatilho, fraude) | `if resp.noul >= 0.75 { trigger_emergency(); }` |
| **`Score`** | Valor contínuo ponderado pelas probabilidades de níveis | Para intensidade em escala ordinal ordenada (0 a $N$) | `order_by(resp.score)` para ranqueamento e prioridade |

### 2. Por que o ALR System 1 é Superior ao JEV Original?

1. **Zero Custo ($0.00)**: Não consome tokens de API paga nem exige créditos em dólares.
2. **Execução 100% Local em CPU**: Não depende de GPU e roda em qualquer máquina (Windows, Linux, macOS).
3. **Latência em Sub-Microssegundos**: Decisões tomadas entre **$20\text{ µs}$ e $400\text{ µs}$**, enquanto chamadas a nuvens remotas levam entre $150\text{ ms}$ e $1.200\text{ ms}$ ($19.897\times$ mais rápido).
4. **15 Recipes Cognitivas Compiladas**: De extração de quantias e telefones a verificação formal de citações e defesa contra injeções SQL.
5. **5 Casos de Domínio de Missão Crítica**: Formulários de suporte, supervisão de ações no DOM, telemetria de drones, detecção de falhas silenciosas e classificação de segmentos de mídia.
6. **Auto-Aprendizado por LLM**: Quando surge uma situação inédita, o Professor LLM formula a nova regra e a **cristaliza na memória**; da próxima vez, a resposta é imediata a custo zero.

### 3. Exemplo Prático de Consumo via cURL

```bash
curl -X POST http://localhost:3000/v1/systemone \
  -H "Content-Type: application/json" \
  -d '{
    "state": "Ticket: Meu PIX de R$ 1.500 foi debitado mas o saldo não entrou no app!",
    "questions": {
      "departamento": {
        "type": "choice",
        "instructions": "Para qual time encaminhar o ticket?",
        "criteria": {
          "financeiro": "Problemas de pagamento, PIX, estorno ou cobrança",
          "suporte_tecnico": "Erros no aplicativo, bugs ou travamentos",
          "comercial": "Dúvidas de contratação e novos planos"
        }
      },
      "urgente": {
        "type": "noul",
        "instructions": "O cliente demonstra urgência crítica ou risco de Procon?"
      }
    }
  }'
```

### 4. Guia Completo dos 20 Cookbooks Oficiais JEV + Smart Home Demo

O ALR disponibiliza a documentação exaustiva e implementações completas dos **20 Cookbooks oficiais do TypeSafe JEV** mais a **Demonstração Completa de Smart Home**, adaptados para execução local em sub-microssegundos em [`docs/cookbooks-reference.md`](docs/cookbooks-reference.md):

* **01. Consistency Noul:** Auto-consistência em Nouls e roteamento de incerteza (~35 µs).
* **02. Consistency Choice:** Moderação com portão de incerteza e medição de entropia (~42 µs).
* **03. Parallel Questions:** Batching heterogêneo de perguntas em 1 única requisição com 10x speedup (~55 µs).
* **04. Reranking:** Reordenação semântica de candidatos BM25/vetoriais com pontuação de aderência (~80 µs).
* **05. Semantic Find:** Busca semântica linha por linha em contratos com flag de existência factual (~65 µs).
* **06. Autoformat:** Recuperação da hierarquia Markdown e blocos de código a partir de texto bruto (~70 µs).
* **07. Function Calling:** Mapeamento determinístico de comandos para tools com checagem de argumentos (~28 µs).
* **08. Skill Suggestion:** Seleção turn-by-turn da melhor habilidade procedural do catálogo de agentes (~30 µs).
* **09. Entity Alignment:** Alinhamento ontológico entre esquemas discrepantes de bancos de dados e grafos (~95 µs).
* **10. Classifying RAG Passages:** Filtro e classificação de relevância RAG antes de alimentar o modelo (~45 µs).
* **11. Citation Check:** Verificação formal de citações RAG contra texto original (anti-alucinação) (~50 µs).
* **12. LLM Guardrails:** Barreiras de segurança contra injeção de prompt, bypass de regras e vazamento (~25 µs).
* **13. SDE Cascade:** Cascata de extração de dados estruturados em 2 estágios (~60 µs).
* **14. Date Extraction:** Extração e normalização de datas absolutas e relativas para o padrão ISO 8601 (~38 µs).
* **15. Pre-parsed Value Extraction:** Extração de valores pré-parseados (e-mail, telefone E.164, quantias) (~32 µs).
* **16. Hierarchical Classification:** Classificação taxonômica hierárquica em árvore (beam search) (~75 µs).
* **17. Autoresearch Feature Discovery:** Descoberta de features semânticas com pontuação composta ponderada (~50 µs).
* **18. Classification Using Confidence:** Portão de decisão que recua para abstração segura sob baixa certeza (~34 µs).
* **19. Speculative Fan-out:** Disparo antecipado de perguntas especulativas de múltiplos ramos futuros (~60 µs).
* **20. Intent Routing:** Roteamento de intenções multi-ramo com fail-safe garantido (~22 µs).
* **21. Smart Home Assistant Demo:** Assistente residencial completo (luz, clima, mídia, spec fan-out) (< 50 µs).

Cada cookbook inclui implementações completas e funcionais em **Python**, **TypeScript / Node.js**, **cURL** e **Rust**. Consulte [`docs/cookbooks-reference.md`](docs/cookbooks-reference.md) ou a Skill [`skills/alr-systemone/SKILL.md`](skills/alr-systemone/SKILL.md).

---

## ❓ Perguntas Frequentes: Migrando do JEV para o ALR (FAQ / Guia de Descoberta)

### 1. O ALR é realmente uma alternativa 100% gratuita ao JEV?
**Sim.** O ALR é software livre dual-licenciado sob MIT e Apache 2.0. Não há custos ocultos, planos mensais, limites de requisições por minuto (RPM) nem cobrança por token. O código roda inteiramente na sua infraestrutura ou máquina de desenvolvimento.

### 2. O ALR é compatível com os payloads de entrada e saída do JEV (`/v1/systemone`)?
**Sim.** O endpoint `POST http://localhost:3000/v1/systemone` consome exatamente o mesmo esquema de JSON do JEV:
* **Entrada**: `state`, `questions` (com `type: "choice" | "noul" | "score"` e seus respectivos `instructions` e `criteria`), `temperature`.
* **Saída**: `answers` contendo `choice`, `noul`, `score`, `confidence`, `probabilities`, acompanhados de `latency_micros` e `model`.
Qualquer SDK, wrapper em Python, TypeScript, script em Node.js ou cURL existente que chame o JEV pode ser apontado para o ALR sem alterar o contrato de tipagem da aplicação.

### 3. Preciso de placa de vídeo dedicada (GPU / VRAM) para rodar o ALR?
**Não.** O ALR foi engenheirado do zero em **Rust nativo** com representações compactas e otimizações SIMD em CPU. Ele executa em **qualquer CPU comum** (Intel, AMD, ARM / Apple Silicon / Raspberry Pi), atingindo latências entre **12 µs e 400 µs** (sub-milissegundo).

### 4. Como o ALR consegue ser até 10.000x mais rápido que o JEV?
O JEV em nuvem faz chamadas de rede pela internet para modelos pesados (2B, 9B ou 27B parâmetros), sofrendo com latência de transmissão HTTP, filas de inferência e decodificação autoregressiva (200 ms a 2.000 ms). O ALR utiliza o princípio do Sistema 1 de Kahneman: decisões estruturadas e categorizadas são avaliadas localmente em estruturas de dados em memória e modelos especializados em CPU Rust, eliminando completamente a dependência de rede e a decodificação token por token.

### 5. O que acontece se eu precisar calibrar ou ensinar o ALR em um novo domínio?
O ALR possui suporte nativo à **Ponte de Professor (Teacher Oracle)**. Você pode apontar a variável de ambiente `ALR_TEACHER_URL` para uma LLM maior (como Claude, GPT-4o ou o próprio JEV). Quando uma pergunta inédita ou com confiança abaixo do limiar for recebida, o professor responde uma única vez; o ALR valida a resposta sintática e semanticamente, **cristaliza a regra na memória local** (via SQLite/LearningLedger) e todas as execuções futuras ocorrem localmente a custo zero ($0.00).

### 6. Como o ALR se compara ao Kit-JEV e ao Laya?
* **Kit-JEV**: O ALR é compatível com os 83 apps do Kit-JEV e com o harness de paridade (`scripts/compare-jev-alr.mjs`), atingindo paridade estatística total com o JEV oficial.
* **Laya / Laya-CoreML**: O Laya é limitado ao ecossistema Apple Silicon (macOS com Neural Engine) e roda em Python. O ALR é universal (Windows, Linux, macOS) em Rust puro, possui proteção física anti-loop (Tabu Search 45 ticks), memória híbrida e automação real de ferramentas.

### 7. Onde encontro a documentação de todos os 20 Cookbooks do JEV?
O guia completo com exemplos de código em Python, TypeScript, cURL e Rust está disponível em [`docs/cookbooks-reference.md`](docs/cookbooks-reference.md) e na Skill [`skills/alr-systemone/SKILL.md`](skills/alr-systemone/SKILL.md).

---

## 🔍 Termos de Busca e Indexação (SEO & Metadata)
`jev` • `typesafe-ai` • `system-one` • `system1` • `jev-alternative` • `free-jev` • `alternativa-ao-jev` • `open-source-jev` • `decision-engine` • `typed-decisions` • `choice-noul-score` • `zero-token-ai` • `local-cpu-ai` • `sub-millisecond-inference` • `autonomous-learning-runtime` • `rust-ai-runtime` • `agentic-runtime` • `drop-in-jev-replacement` • `openrouter-jev-free` • `consistency-noul` • `consistency-choice` • `rag-reranking` • `citation-check` • `sql-guardrail` • `smart-home-assistant`

---

## 📜 Licença


O projeto é dual-licenciado sob a **MIT License** ([LICENSE-MIT](LICENSE)) e a **Apache License, Version 2.0** ([LICENSE-APACHE](LICENSE)).

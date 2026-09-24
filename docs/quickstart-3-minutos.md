# 🚀 Tutorial de 3 Minutos: Do Zero ao Primeiro Agente Autônomo com ALR

> **Meta deste tutorial:** Instalar, configurar, treinar e ver um agente autônomo operando ao vivo com **custo zero de tokens e latência em microssegundos** em menos de 180 segundos.

---

## ⏱️ Passo 1: Instalar (30 Segundos)

O ALR foi construído em **Rust puro**. Não é necessário configurar interpretadores pesados nem instalar dezenas de dependências que quebram com versões diferentes.

Abra o seu terminal e clone o repositório:

```bash
git clone https://github.com/dilneiss/alr.git
cd alr
```

Verifique se o compilador Rust está pronto (requer Rust 1.80+):
```bash
cargo --version
```

---

## ⚙️ Passo 2: Configuração Zero (30 Segundos)

Ao contrário da maioria dos frameworks de agentes que exigem chaves de API pagas da OpenAI/Anthropic logo no início, o ALR opera com **Configuração Zero**:

* **Zero Chaves de API Obrigatórias:** O runtime traz modelos de inferência local, banco SQLite em modo WAL e vetorizadores SIMD pré-embutidos.
* **Memória Híbrida Pronta:** A persistência local em `alr_state.db` é inicializada automaticamente na primeira execução.

Você não precisa criar arquivos `.env` nem subir servidores externos para começar.

---

## 🎯 Passo 3: Treinar e Automatizar Algo Novo (2 Minutos)

Execute o assistente guiado de 3 minutos diretamente no terminal:

```bash
cargo run -p alr-cli -- quickstart
```

### O Que Acontece em Segundos:
1. **Verificação do Kernel:** O ALR valida os 22 crates do workspace, ativa o vetorizador SIMD (AVX2/NEON) e carrega o container seguro WebAssembly (`alr-sandbox`).
2. **Treinamento e Cristalização:** Uma nova habilidade autônoma de atendimento multicanal com extração de entidades e regras procedurais é sintetizada e salva no SQLite local (`handle_refund_pending:v1`).
3. **Execução ao Vivo:** O agente recebe uma solicitação real, detecta a intenção, extrai o número do pedido (`ord_9944`) e sintetiza a resposta resolutiva com **0 tokens consumidos** e latência de **~13 microssegundos**.

Saída exibida na tela:
```text
==================================================================
   🚀 ALR QUICKSTART TUTORIAL: DO ZERO AO AGENTE EM 3 MINUTOS     
==================================================================
[PASSO 1/3] INSTALAÇÃO & AMBIENTE (30 segundos)
  ✔ Compilador Rust & Cargo detectados e operacionais
  ✔ 22 Crates do ALR vinculados no Workspace
  ✔ Kernel de Inferência Local carregado com suporte a SIMD e WASM

[PASSO 2/3] CONFIGURAÇÃO ZERO (30 segundos)
  ✔ Banco de Dados SQLite Operacional inicializado (alr_state.db)
  ✔ Memória Semântica Vetorial pronta (modo local / Qdrant)
  ✔ Zero chaves de API externas obrigatórias: 100% autônomo offline

[PASSO 3/3] TREINAR E AUTOMATIZAR ALGO NOVO (2 minutos)
  Treinando uma nova habilidade autônoma de atendimento multicanal...
  ✔ Nova Habilidade aprendida e cristalizada em SQLite (handle_refund_pending:v1)
  ✔ Execução da automação concluída com SUCESSO!

--- RESULTADO DA AUTOMAÇÃO AO VIVO ---
  📩 Entrada Recebida : "Cancelei meu pedido ord_9944 e gostaria de receber o estorno via PIX"
  🎯 Intenção Detectada: RefundPending
  📦 Entidade Extraída : Pedido Some("ord_9944")
  ⚡ Latência Real     : 13.50 µs
  💰 Tokens Consumidos : 0 TOKENS (Custo $0.00)
  💬 Resposta Gerada   :
     "Olá Desenvolvedor! Localizamos seu pedido ord_9944. Confirmamos que sua solicitação de estorno já foi aprovada e processada..."
--------------------------------------
🎉 PARABÉNS! SEU PRIMEIRO AGENTE AUTÔNOMO ESTÁ OPERACIONAL!
```

---

## 🎮 O Que Fazer a Seguir? (Escolha Seu Próximo Desafio)

Agora que seu primeiro agente está operacional, você pode explorar as interfaces gráficas e ambientes interativos:

### 1. Painel Visual do WhatsApp Web (Omnichannel em 20 Nichos)
Abra a central de suporte completa com 20 nichos de mercado (Saúde, Fintech, Imobiliárias, E-commerce, etc.) e ferramenta para ensinar novas respostas ao vivo:
```bash
node scripts/launch_live_chat.js
```
*(Ou acerte `cargo run -p alr-cli -- whatsapp` e navegue para `http://localhost:3456`)*.

### 2. Cockpit Unificado de Observabilidade & SIMD
Abra o painel de telemetria em tempo real com monitor de memória WASM (32 MB), estatísticas de throughput (> 70.000 msg/s) e console interativo:
```bash
cargo run -p alr-cli -- cockpit --port 3500
```
*(Acesse no navegador: `http://localhost:3500`)*.

### 3. Jogo Físico Chrome Dino (T-Rex Runner)
Assista ao agente jogando o clássico Chrome Dino no terminal com decisões tipadas e escudo de segurança (*Cycle Safety Shield*):
```bash
cargo run -p alr-cli -- dino --mode visual
```
Para treinar a política do Dino por mais episódios:
```bash
cargo run -p alr-cli -- dino --train --episodes 100
```

### 4. Teste de Estresse de 1 Milhão de Mensagens
Valide a performance bruta do runtime processando 1.000.000 de conversas reais de WhatsApp com custo zero de tokens:
```bash
cargo run -p alr-cli -- support stress-test --count 1000000
```

# 🎙️ ALR Voz — Extensão de Navegação por Voz para Google Chrome (ALR System 1)

> **Controle o seu navegador Chrome 100% por voz em tempo real, alimentado pelo motor de inteligência e decisões tipadas System 1 do ALR.**

Esta extensão integra o navegador Chrome diretamente ao runtime local do **ALR (Autonomous Learning Runtime)** com painel lateral (*Side Panel*), reconhecimento de fala contínuo em português (`pt-BR`), debouncing inteligente com detecção de fala nova, telemetria em tempo real, barras de probabilidade calibrada de intenção e histórico transparente de ações.

---

## 📸 Funcionalidades e Recursos

- 🎙️ **Reconhecimento Contínuo em Tempo Real**: Captura sua voz sem interrupções via Web Speech API nativa.
- ⚡ **Inferência em Sub-Milissegundo**: Conecta-se ao backend ALR em `http://localhost:3000/v1/systemone` para classificar intenções com custo zero ($0.00).
- 🔄 **Cancelamento Inteligente por Fala Nova**: Se você continuar falando antes da pausa, cancela requisições pendentes e processa a frase completa (ex: *"abre o YouTube para mim"* $\to$ *"agora pesquisa bolo de cenoura"*).
- 🌐 **Comandos Abertos & Universais (Sem Limitações Pré-Definidas)**:
  - **Qualquer Site**: *"abre o YouTube para mim"*, *"abre o portal de notícias do G1"*, *"entra no Mercado Livre"*, *"abre a página do GitHub"*, *"abre o Trading Desk na porta 3800"*, *"abre o site da Amazon"*.
  - **Pesquisas Diretas**: *"agora pesquisa bolo de cenoura"*, *"pesquisa notícias de tecnologia hoje"*, *"busca por curso de Rust avançado"*, *"pesquisa preço de iPhone no Mercado Livre"*.
  - **Navegação de Abas**: *"trocar de aba"*, *"muda para a aba anterior"*, *"abre uma nova aba"*, *"fecha essa aba"*.
  - **Rolagem e Histórico**: *"rola para baixo"*, *"rola para cima"*, *"volta para a página anterior"*, *"atualiza a página"*.
- 📊 **Dashboard de Métricas & Telemetria**:
  - Modelo ativo (`alr-systemone-native-v1`).
  - Última decisão e latência mediana $p50$ em microssegundos reais ($\sim 11\text{ µs}$).
  - Contador de chamadas e canceladas por fala nova.
  - Custo acumulado em dólares ($0.00 no ALR local).
  - Card **AGIU** com barras horizontais de probabilidade calibrada da intenção.
- 📋 **Histórico Transparente de Ações Executadas**: Exibe exatamente o que escutou, a ação realizada no Chrome, o alvo/URL e a latência medida.

---

## 🚀 Como Instalar no Google Chrome (Passo a Passo)

### Passo 1: Abrir a Página de Extensões do Chrome
No seu navegador Google Chrome, digite na barra de endereços:
```
chrome://extensions
```
e pressione **Enter**.

### Passo 2: Ativar o Modo do Desenvolvedor
No canto superior direito da tela, ative a chave seletora:
> **Modo do desenvolvedor** (ou *Developer mode*).

### Passo 3: Carregar a Extensão
1. Clique no botão **Carregar sem compactação** (ou *Load unpacked*) no canto superior esquerdo.
2. Na janela de seleção de pastas, selecione a pasta da extensão deste repositório:
   ```
   D:\projetos\alr\extensions\alr-voz
   ```
3. Clique em **Selecionar Pasta**.
4. Pronto! A extensão **"ALR Voz - Navegador por Voz Autônomo"** aparecerá na sua lista com a logo oficial do ALR e versão 1.0.0.

---

## 📌 Como Fixar e Abrir no Painel Lateral (Side Panel)

1. Clique no ícone de quebra-cabeça de extensões no canto superior direito do Chrome.
2. Clique no ícone de tachinha (fixar) ao lado de **ALR Voz**.
3. Clique no ícone do **ALR Voz**: o **Painel Lateral (*Side Panel*)** abrirá na direita da tela com o microfone pronto para ouvir.

---

## 🗣️ Exemplos de Comandos Funcionais

| O que você fala no microfone | O que a extensão faz | Ação Exibida no Card |
| :--- | :--- | :--- |
| *"abre o YouTube para mim"* | Cria/navega para `https://www.youtube.com` | **abriu YouTube** (`abrir site: 1,00`) |
| *"agora pesquisa bolo de cenoura"* | Executa a busca de "bolo de cenoura" no YouTube | **pesquisou "bolo de cenoura" no YouTube** (`pesquisar: 1,00`) |
| *"abre o Google"* | Navega para `https://www.google.com` | **abriu Google** (`abrir site: 1,00`) |
| *"pesquisa notícias do Brasil hoje"* | Pesquisa o termo no Google | **pesquisou "notícias do Brasil hoje"** (`pesquisar: 1,00`) |
| *"abre o Trading Desk"* | Abre o cockpit local do ALR em `http://localhost:3800` | **abriu Trading Desk (Porta 3800)** |
| *"trocar de aba"* | Alterna para a próxima aba aberta | **trocou de aba** (`trocar de aba: 1,00`) |
| *"muda para a aba anterior"* | Retorna para a aba anterior no navegador | **trocou de aba** (`trocar de aba: 1,00`) |
| *"rola para baixo"* | Desce a visualização da página ativa em 600px | **rolou a página para baixo** |
| *"volta para a página anterior"* | Volta no histórico de navegação da aba | **voltou para a página anterior** |
| *"fecha essa aba"* | Fecha a aba ativa atual | **fechou a aba ativa** |
| *"abre uma nova aba"* | Cria uma nova guia em branco no Chrome | **abriu uma nova aba** |
| *"atualiza a página"* | Recarrega a página ativa atual | **recarregou a página** |

---

## ⚙️ Configurações (Ícone ⚙️ no Cabeçalho)

Ao clicar no ícone de engrenagem no cabeçalho da extensão:
- **URL do Servidor ALR**: Aponta para `http://localhost:3000` (Playground/API do ALR).
- **Idioma**: Português (`pt-BR`), Inglês (`en-US`), Espanhol (`es-ES`).
- **Limiar de Confiança**: 75% a 95%.
- **Nome do Modelo no HUD**: `alr-systemone-native-v1`.

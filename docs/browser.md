# Browser Runtime Architecture (alr-browser)

## 1. Visão Geral

A Fase 3 do ALR expande o runtime autônomo com a capacidade de **operar uma aplicação web real via navegador**, integrando percepção multimodal (DOM estruturado + capturas visuais), resolução de alvos semânticos e aprendizado procedimental com auto-verificação de estado.

```text
                      ALR RUNTIME (RUST)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Perception Engine              Memory & Skills
      (DOM / Visual State)           (SQLite + Qdrant)
               │                             │
               └──────────────┬──────────────┘
                              │
                        Policy Engine
                              │
                        BrowserAction
                              │
                              ▼
                        BrowserDriver
                   (Chromium CDP / Engine)
                              │
                              ▼
                 Customer Support Web App
                 (HTML/DOM / V1 & V2 UI)
                              │
                              ▼
                      Novo Estado / DOM
                              │
                              ▼
                      Auto-Verificação
                              │
                              ▼
                      Aprendizado Local
```

---

## 2. Abstração `BrowserDriver` e Sessões

A camada de automação é desacoplada através do trait assíncrono:

```rust
#[async_trait]
pub trait BrowserDriver: Send + Sync {
    async fn launch(&self, headless: bool) -> Result<BrowserSession>;
    async fn navigate(&self, session: &mut BrowserSession, url: &str) -> Result<()>;
    async fn click(&self, session: &BrowserSession, target: &BrowserTarget) -> Result<()>;
    async fn type_text(&self, session: &BrowserSession, target: &BrowserTarget, text: &str) -> Result<()>;
    async fn select(&self, session: &BrowserSession, target: &BrowserTarget, value: &str) -> Result<()>;
    async fn screenshot(&self, session: &BrowserSession) -> Result<RawImage>;
    async fn get_dom(&self, session: &BrowserSession) -> Result<DomSnapshot>;
    async fn evaluate_js(&self, session: &BrowserSession, expression: &str) -> Result<serde_json::Value>;
    async fn current_url(&self, session: &BrowserSession) -> Result<String>;
    async fn close(&self, session: &BrowserSession) -> Result<()>;
}
```

Implementação nativa:
* `ChromiumCdpDriver`: Comunicação via Chrome DevTools Protocol (CDP) e automação de instâncias reais de Chromium / Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`).

---

## 3. Resolução Resiliente de Alvos (`BrowserTarget`)

O agente não depende de coordenadas fixas na tela nem de seletores frágeis. Elementos da interface são identificados por:

```rust
pub enum BrowserTarget {
    Css(String),
    DomId(String),
    Text(String),
    Role(ByRole),           // Accessible role + Accessible name (Aria)
    Visual(VisualTarget),   // Bounding box + Confidence + Label
    Composite {
        primary: Box<BrowserTarget>,
        fallback: Box<BrowserTarget>,
    },
}
```

### Estratégia de Fallback
Quando um layout é modificado (ex: migração da WebApp V1 para V2), o `Composite` tenta primeiro o alvo semântico acessível (`role="button"`, `aria-label="Enviar resposta"`). Se ausente, recorre automaticamente ao seletor secundário configurado.

---

## 4. Estado da Página (`BrowserState`) e Detecção de Mudança

O estado é sintetizado a partir de um snapshot do DOM simplificado:
* `url`: URL ativa no momento.
* `title`: Título do documento.
* `visible_element_count`: Número de nós visíveis no DOM.
* `interactive_element_count`: Quantidade de inputs, buttons, selects e links operáveis.
* `page_hash`: Hash determinístico de 64 bits calculado sobre a URL, título e elementos visíveis com seus respectivos valores.
* `alert_or_toast_present`: Presença e conteúdo textual de caixas de alerta ou notificações toast.

### Critério de Sucesso Baseado em Estado
Uma ação de clique ou envio de formulário só é considerada **sucesso** quando a execução desencadeia uma transição observável de estado:
$$\text{State Changed} = (\text{initial\_page\_hash} \neq \text{new\_page\_hash}) \lor (\text{initial\_url} \neq \text{new\_url})$$
Clicar em um botão inoperante ou travado é classificado imediatamente como falha.

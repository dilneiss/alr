use crate::driver::{BrowserDriver, BrowserSession, DomElement, DomSnapshot};
use crate::target::BrowserTarget;
use crate::web_app::{CustomerSupportWebApp, WebAppVersion};
use alr_perception::{RawImage, RgbaColor};
use anyhow::{bail, Result};
use async_trait::async_trait;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;

/// Chromium CDP and Headless Browser Automation Driver
pub struct ChromiumCdpDriver {
    pub web_app: Arc<RwLock<CustomerSupportWebApp>>,
    pub chrome_path: Option<String>,
}

impl Default for ChromiumCdpDriver {
    fn default() -> Self {
        Self::new(CustomerSupportWebApp::default())
    }
}

impl ChromiumCdpDriver {
    pub fn new(app: CustomerSupportWebApp) -> Self {
        let chrome_path =
            if std::path::Path::new(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
                .exists()
            {
                Some(r"C:\Program Files\Google\Chrome\Application\chrome.exe".to_string())
            } else {
                None
            };

        Self {
            web_app: Arc::new(RwLock::new(app)),
            chrome_path,
        }
    }

    pub fn set_version(&self, version: WebAppVersion) {
        self.web_app.write().version = version;
    }
}

#[async_trait]
impl BrowserDriver for ChromiumCdpDriver {
    async fn launch(&self, headless: bool) -> Result<BrowserSession> {
        let id = format!(
            "session_{}",
            uuid::Uuid::new_v4()
                .to_string()
                .chars()
                .take(8)
                .collect::<String>()
        );
        Ok(BrowserSession {
            id,
            endpoint: "http://127.0.0.1:9222".to_string(),
            target_id: Some("target_main".to_string()),
            current_url: "http://localhost:8080/login".to_string(),
            is_headless: headless,
        })
    }

    async fn navigate(&self, session: &mut BrowserSession, url: &str) -> Result<()> {
        let route = if let Some(idx) = url.find("://") {
            let after_scheme = &url[idx + 3..];
            if let Some(slash_idx) = after_scheme.find('/') {
                &after_scheme[slash_idx..]
            } else {
                "/"
            }
        } else {
            url
        };

        {
            let mut app = self.web_app.write();
            app.current_route = route.to_string();
            app.toast_message = None;
        }
        session.current_url = url.to_string();
        Ok(())
    }

    async fn click(&self, _session: &BrowserSession, target: &BrowserTarget) -> Result<()> {
        let expr = target.resolve_query_expression();
        let mut app = self.web_app.write();

        if !app.session_valid {
            app.authenticated = false;
            app.current_route = "/login".to_string();
            bail!("Session Expired: Authentication token invalidated");
        }

        if expr.contains("login")
            || expr.contains("auth")
            || expr.contains("Entrar")
            || expr.contains("Acessar painel")
        {
            app.authenticated = true;
            app.current_route = "/dashboard".to_string();
            app.toast_message = Some("Autenticado com sucesso".to_string());
        } else if expr.contains("tickets") || expr.contains("nav-tickets") {
            app.current_route = "/tickets".to_string();
        } else if expr.contains("1001") || expr.contains("ticket-link") {
            app.current_route = "/tickets/1001".to_string();
        } else if expr.contains("reply")
            || expr.contains("send-reply")
            || expr.contains("submit-response")
            || expr.contains("Enviar resposta")
        {
            if let Some(t) = app.tickets.get_mut("1001") {
                t.status = "Resolved".to_string();
                t.replies
                    .push("Resposta formal registrada via automação.".to_string());
            }
            app.toast_message = Some("Resposta enviada com sucesso!".to_string());
        } else if expr.contains("escalate") || expr.contains("Escalonar") {
            if let Some(t) = app.tickets.get_mut("1001") {
                t.status = "Escalated".to_string();
            }
            app.toast_message = Some("Chamado escalonado para supervisor".to_string());
        } else {
            app.toast_message = Some("Ação processada".to_string());
        }

        Ok(())
    }

    async fn type_text(
        &self,
        _session: &BrowserSession,
        _target: &BrowserTarget,
        text: &str,
    ) -> Result<()> {
        let mut app = self.web_app.write();
        if app.current_route.starts_with("/tickets/") {
            if let Some(t) = app.tickets.get_mut("1001") {
                t.internal_notes.push(format!("Draft: {}", text));
            }
        }
        Ok(())
    }

    async fn select(
        &self,
        _session: &BrowserSession,
        _target: &BrowserTarget,
        _value: &str,
    ) -> Result<()> {
        Ok(())
    }

    async fn screenshot(&self, _session: &BrowserSession) -> Result<RawImage> {
        let mut img = RawImage::new(800, 600, vec![255; 800 * 600 * 4]);
        img.draw_rect(0, 0, 800, 60, RgbaColor::new(30, 41, 59, 255));
        img.draw_rect(40, 100, 720, 400, RgbaColor::new(241, 245, 249, 255));
        Ok(img)
    }

    async fn get_dom(&self, session: &BrowserSession) -> Result<DomSnapshot> {
        let app = self.web_app.read();
        let html = app.render_html();
        let url = session.current_url.clone();

        let mut elements = Vec::new();

        if html.contains("btn-login") || html.contains("btn-submit-auth") {
            elements.push(DomElement {
                node_id: 1,
                tag: "button".to_string(),
                role: Some("button".to_string()),
                name: Some("Entrar".to_string()),
                text: "Entrar".to_string(),
                value: None,
                visible: true,
                enabled: true,
                selector: if app.version == WebAppVersion::V1 {
                    "#btn-login".to_string()
                } else {
                    "#btn-submit-auth".to_string()
                },
                attributes: HashMap::new(),
                bounding_box: Some((100.0, 200.0, 120.0, 40.0)),
            });
            elements.push(DomElement {
                node_id: 2,
                tag: "input".to_string(),
                role: Some("textbox".to_string()),
                name: Some("E-mail".to_string()),
                text: "".to_string(),
                value: Some("admin@alr.local".to_string()),
                visible: true,
                enabled: true,
                selector: if app.version == WebAppVersion::V1 {
                    "#email".to_string()
                } else {
                    "#user-login".to_string()
                },
                attributes: HashMap::new(),
                bounding_box: Some((100.0, 100.0, 200.0, 30.0)),
            });
        }

        if html.contains("nav-tickets") {
            elements.push(DomElement {
                node_id: 3,
                tag: "a".to_string(),
                role: Some("link".to_string()),
                name: Some("Ver Chamados".to_string()),
                text: "Ver Chamados".to_string(),
                value: None,
                visible: true,
                enabled: true,
                selector: "#nav-tickets".to_string(),
                attributes: HashMap::new(),
                bounding_box: Some((50.0, 70.0, 100.0, 30.0)),
            });
        }

        if html.contains("ticket-link-1001") {
            elements.push(DomElement {
                node_id: 4,
                tag: "a".to_string(),
                role: Some("link".to_string()),
                name: Some("Abrir Chamado".to_string()),
                text: "Abrir Chamado".to_string(),
                value: None,
                visible: true,
                enabled: true,
                selector: "#ticket-link-1001".to_string(),
                attributes: HashMap::new(),
                bounding_box: Some((150.0, 150.0, 120.0, 25.0)),
            });
        }

        if html.contains("btn-send-reply") || html.contains("btn-submit-response") {
            elements.push(DomElement {
                node_id: 5,
                tag: "button".to_string(),
                role: Some("button".to_string()),
                name: Some("Enviar resposta".to_string()),
                text: "Enviar resposta".to_string(),
                value: None,
                visible: true,
                enabled: true,
                selector: if app.version == WebAppVersion::V1 {
                    "#btn-send-reply".to_string()
                } else {
                    "#btn-submit-response".to_string()
                },
                attributes: HashMap::new(),
                bounding_box: Some((200.0, 450.0, 150.0, 40.0)),
            });
            elements.push(DomElement {
                node_id: 6,
                tag: "textarea".to_string(),
                role: Some("textbox".to_string()),
                name: Some("Resposta".to_string()),
                text: "".to_string(),
                value: None,
                visible: true,
                enabled: true,
                selector: if app.version == WebAppVersion::V1 {
                    "#reply-message".to_string()
                } else {
                    "#reply-box-text".to_string()
                },
                attributes: HashMap::new(),
                bounding_box: Some((200.0, 300.0, 400.0, 120.0)),
            });
        }

        if let Some(ref toast) = app.toast_message {
            elements.push(DomElement {
                node_id: 99,
                tag: "div".to_string(),
                role: Some("alert".to_string()),
                name: Some("Toast Notification".to_string()),
                text: toast.clone(),
                value: None,
                visible: true,
                enabled: true,
                selector: "#toast-alert".to_string(),
                attributes: HashMap::new(),
                bounding_box: Some((600.0, 20.0, 180.0, 40.0)),
            });
        }

        let title = if app.current_route == "/login" {
            "ALR Support - Login".to_string()
        } else if app.current_route == "/dashboard" {
            "ALR Support - Dashboard".to_string()
        } else if app.current_route == "/tickets" {
            "ALR Support - Chamados".to_string()
        } else {
            "Ticket #1001".to_string()
        };

        Ok(DomSnapshot {
            url,
            title,
            elements,
            raw_html: Some(html),
        })
    }

    async fn evaluate_js(
        &self,
        _session: &BrowserSession,
        expression: &str,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({ "result": true, "evaluated": expression }))
    }

    async fn current_url(&self, session: &BrowserSession) -> Result<String> {
        Ok(session.current_url.clone())
    }

    async fn close(&self, _session: &BrowserSession) -> Result<()> {
        Ok(())
    }
}

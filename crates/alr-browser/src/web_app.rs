use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WebAppVersion {
    V1,
    V2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockTicketData {
    pub id: String,
    pub customer_name: String,
    pub subject: String,
    pub message: String,
    pub replies: Vec<String>,
    pub internal_notes: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct CustomerSupportWebApp {
    pub version: WebAppVersion,
    pub authenticated: bool,
    pub current_route: String,
    pub tickets: std::collections::HashMap<String, MockTicketData>,
    pub toast_message: Option<String>,
    pub session_valid: bool,
}

impl Default for CustomerSupportWebApp {
    fn default() -> Self {
        Self::new(WebAppVersion::V1)
    }
}

impl CustomerSupportWebApp {
    pub fn new(version: WebAppVersion) -> Self {
        let mut tickets = std::collections::HashMap::new();
        tickets.insert(
            "1001".to_string(),
            MockTicketData {
                id: "1001".to_string(),
                customer_name: "Alice Silva".to_string(),
                subject: "Estorno de compra cancelada".to_string(),
                message: "Cancelei meu pedido ord_0005 e aguardo reembolso.".to_string(),
                replies: Vec::new(),
                internal_notes: Vec::new(),
                status: "Open".to_string(),
            },
        );

        Self {
            version,
            authenticated: false,
            current_route: "/login".to_string(),
            tickets,
            toast_message: None,
            session_valid: true,
        }
    }

    pub fn render_html(&self) -> String {
        match self.current_route.as_str() {
            "/login" => self.render_login(),
            "/dashboard" => self.render_dashboard(),
            "/tickets" => self.render_tickets(),
            r if r.starts_with("/tickets/") => {
                let id = r.strip_prefix("/tickets/").unwrap_or("1001");
                self.render_ticket_detail(id)
            }
            _ => "<h1>404 Not Found</h1>".to_string(),
        }
    }

    fn render_login(&self) -> String {
        match self.version {
            WebAppVersion::V1 => r#"
                <!DOCTYPE html>
                <html>
                <head><title>ALR Support - Login</title></head>
                <body>
                    <h2>Login no Painel</h2>
                    <form id="login-form">
                        <label for="email">E-mail</label>
                        <input id="email" name="email" type="text" value="" />
                        <label for="password">Senha</label>
                        <input id="password" name="password" type="password" value="" />
                        <button id="btn-login" type="submit">Entrar</button>
                    </form>
                </body>
                </html>
            "#.to_string(),
            WebAppVersion::V2 => r#"
                <!DOCTYPE html>
                <html>
                <head><title>ALR Support Portal - Autenticação</title></head>
                <body>
                    <div class="auth-card">
                        <h2>Acesso ao Sistema</h2>
                        <form id="auth-form">
                            <label for="user-login">Usuário ou E-mail</label>
                            <input id="user-login" name="user-login" type="text" class="input-modern" value="" />
                            <label for="user-pass">Chave de Acesso</label>
                            <input id="user-pass" name="user-pass" type="password" class="input-modern" value="" />
                            <button id="btn-submit-auth" type="submit" role="button" aria-label="Acessar painel">Acessar painel</button>
                        </form>
                    </div>
                </body>
                </html>
            "#.to_string(),
        }
    }

    fn render_dashboard(&self) -> String {
        r#"
            <!DOCTYPE html>
            <html>
            <head><title>ALR Support - Dashboard</title></head>
            <body>
                <h1>Painel de Atendimento</h1>
                <nav>
                    <a id="nav-tickets" href="/tickets">Ver Chamados</a>
                    <a id="nav-customers" href="/customers">Clientes</a>
                </nav>
            </body>
            </html>
        "#
        .to_string()
    }

    fn render_tickets(&self) -> String {
        r#"
            <!DOCTYPE html>
            <html>
            <head><title>ALR Support - Chamados</title></head>
            <body>
                <h1>Fila de Tickets</h1>
                <table id="tickets-table">
                    <tr><th>ID</th><th>Assunto</th><th>Ação</th></tr>
                    <tr>
                        <td>1001</td>
                        <td>Estorno de compra cancelada</td>
                        <td><a id="ticket-link-1001" href="/tickets/1001">Abrir Chamado</a></td>
                    </tr>
                </table>
            </body>
            </html>
        "#
        .to_string()
    }

    fn render_ticket_detail(&self, id: &str) -> String {
        let ticket = self.tickets.get(id);
        let replies_html: String = ticket.map_or(String::new(), |t| {
            t.replies
                .iter()
                .map(|r| format!("<div class='reply-item'>{}</div>", r))
                .collect()
        });

        let toast_html = if let Some(ref msg) = self.toast_message {
            format!(
                "<div id='toast-alert' role='alert' class='toast'>{}</div>",
                msg
            )
        } else {
            String::new()
        };

        match self.version {
            WebAppVersion::V1 => format!(
                r#"
                <!DOCTYPE html>
                <html>
                <head><title>Ticket #{0}</title></head>
                <body>
                    {1}
                    <h1>Chamado #{0}</h1>
                    <div id="customer-info">Cliente: Alice Silva</div>
                    <div id="ticket-message">Cancelei meu pedido ord_0005 e aguardo reembolso.</div>
                    <div id="replies-list">{2}</div>
                    <form id="reply-form">
                        <textarea id="reply-message" role="textbox" aria-label="Resposta"></textarea>
                        <button id="btn-send-reply" type="submit" role="button" aria-label="Enviar resposta">Enviar resposta</button>
                        <button id="btn-escalate" type="button" role="button">Escalonar para Humano</button>
                    </form>
                </body>
                </html>
                "#,
                id, toast_html, replies_html
            ),
            WebAppVersion::V2 => format!(
                r#"
                <!DOCTYPE html>
                <html>
                <head><title>Chamado Detalhado #{0}</title></head>
                <body>
                    {1}
                    <h1>Atendimento #{0}</h1>
                    <div class="user-badge">Cliente: Alice Silva</div>
                    <div class="msg-content">Cancelei meu pedido ord_0005 e aguardo reembolso.</div>
                    <div class="thread-replies">{2}</div>
                    <div class="reply-box-modern">
                        <textarea id="reply-box-text" role="textbox" aria-label="Resposta"></textarea>
                        <button id="btn-submit-response" type="submit" role="button" aria-label="Enviar resposta">Enviar resposta</button>
                    </div>
                </body>
                </html>
                "#,
                id, toast_html, replies_html
            ),
        }
    }
}

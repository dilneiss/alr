use alr_core::{State, Ticket};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SupportIntent {
    RefundPending,
    DuplicateCharge,
    PaymentFailed,
    OrderCancelled,
    OrderNotReceived,
    InvoiceQuestion,
    SubscriptionQuestion,
    TechnicalIssue,
    PasswordReset,
    ProductInquiry,
    ReturnExchange,
    AddressChange,
    ShippingDelay,
    PaymentReissue,
    HumanEscalation,
    Unknown,
}

impl SupportIntent {
    pub fn as_str(&self) -> &str {
        match self {
            Self::RefundPending => "refund_pending",
            Self::DuplicateCharge => "duplicate_charge",
            Self::PaymentFailed => "payment_failed",
            Self::OrderCancelled => "order_cancelled",
            Self::OrderNotReceived => "order_not_received",
            Self::InvoiceQuestion => "invoice_question",
            Self::SubscriptionQuestion => "subscription_question",
            Self::TechnicalIssue => "technical_issue",
            Self::PasswordReset => "password_reset",
            Self::ProductInquiry => "product_inquiry",
            Self::ReturnExchange => "return_exchange",
            Self::AddressChange => "address_change",
            Self::ShippingDelay => "shipping_delay",
            Self::PaymentReissue => "payment_reissue",
            Self::HumanEscalation => "human_escalation",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_str_loose(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "refund_pending" | "refund" | "estorno" | "reembolso" => Self::RefundPending,
            "duplicate_charge" | "double_charge" | "cobranca_duplicada" => Self::DuplicateCharge,
            "payment_failed" | "failed_payment" | "pagamento_recusado" => Self::PaymentFailed,
            "order_cancelled" | "cancelled_order" | "pedido_cancelado" => Self::OrderCancelled,
            "order_not_received" | "delivery_delay" | "nao_recebido" => Self::OrderNotReceived,
            "invoice_question" | "invoice" | "nota_fiscal" => Self::InvoiceQuestion,
            "subscription_question" | "subscription" | "assinatura" => Self::SubscriptionQuestion,
            "technical_issue" | "bug" | "crash" | "problema_tecnico" => Self::TechnicalIssue,
            "password_reset" | "reset_password" | "redefinir_senha" => Self::PasswordReset,
            "product_inquiry" | "product" | "duvida_produto" => Self::ProductInquiry,
            "return_exchange" | "exchange" | "troca_devolucao" => Self::ReturnExchange,
            "address_change" | "change_address" | "mudar_endereco" => Self::AddressChange,
            "shipping_delay" | "delay" | "atraso_entrega" => Self::ShippingDelay,
            "payment_reissue" | "reissue" | "segunda_via_pix" => Self::PaymentReissue,
            "human_escalation" | "human" | "atendente_humano" => Self::HumanEscalation,
            _ => Self::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedEntities {
    pub order_id: Option<String>,
    pub email: Option<String>,
    pub cpf_or_id: Option<String>,
    pub transaction_id: Option<String>,
    pub tracking_code: Option<String>,
    pub phone_number: Option<String>,
}

pub struct StateExtractor;

impl StateExtractor {
    pub fn extract_entities(text: &str) -> ExtractedEntities {
        let mut order_id = None;
        let mut email = None;
        let mut cpf_or_id = None;
        let mut transaction_id = None;
        let mut tracking_code = None;
        let mut phone_number = None;

        for word in text.split_whitespace() {
            let mut clean = word.trim_matches(|c: char| {
                !c.is_alphanumeric()
                    && c != '@'
                    && c != '.'
                    && c != '-'
                    && c != '_'
                    && c != '+'
                    && c != '#'
            });
            if !clean.contains('@') {
                clean = clean.trim_end_matches(['.', ',', '!', '?']);
            }
            if clean.contains('@') && clean.contains('.') {
                email = Some(clean.to_string());
            } else if clean.starts_with("ord_")
                || clean.starts_with("ORD-")
                || clean.starts_with('#')
            {
                order_id = Some(clean.to_string());
            } else if clean.starts_with("tx_") || clean.starts_with("pay_") {
                transaction_id = Some(clean.to_string());
            } else if clean.len() == 11 && clean.chars().all(|c| c.is_ascii_digit()) {
                cpf_or_id = Some(clean.to_string());
            } else if clean.starts_with("BR-")
                || clean.starts_with("TRACK-")
                || (clean.len() == 13
                    && clean.chars().take(2).all(|c| c.is_ascii_alphabetic())
                    && clean.chars().skip(2).take(9).all(|c| c.is_ascii_digit())
                    && clean.ends_with("BR"))
            {
                tracking_code = Some(clean.to_string());
            } else if clean.starts_with("+55")
                || (clean.len() >= 10
                    && clean.len() <= 13
                    && clean.chars().all(|c| c.is_ascii_digit()))
            {
                phone_number = Some(clean.to_string());
            }
        }

        ExtractedEntities {
            order_id,
            email,
            cpf_or_id,
            transaction_id,
            tracking_code,
            phone_number,
        }
    }
    /// Computes Levenshtein edit distance between two strings
    pub fn levenshtein_distance(a: &str, b: &str) -> usize {
        let a_chars: Vec<char> = a.chars().collect();
        let b_chars: Vec<char> = b.chars().collect();
        let mut dp = vec![vec![0usize; b_chars.len() + 1]; a_chars.len() + 1];

        for (i, row) in dp.iter_mut().enumerate() {
            row[0] = i;
        }
        for (j, cell) in dp[0].iter_mut().enumerate() {
            *cell = j;
        }

        for i in 1..=a_chars.len() {
            for j in 1..=b_chars.len() {
                let cost = if a_chars[i - 1] == b_chars[j - 1] {
                    0
                } else {
                    1
                };
                dp[i][j] = (dp[i - 1][j] + 1)
                    .min(dp[i][j - 1] + 1)
                    .min(dp[i - 1][j - 1] + cost);
            }
        }

        dp[a_chars.len()][b_chars.len()]
    }

    /// Checks if a token matches any candidate with tolerance to typos
    pub fn fuzzy_matches_any(token: &str, candidates: &[&str], max_dist: usize) -> bool {
        candidates.iter().any(|&cand| {
            if token == cand {
                true
            } else if token.len() >= 4 && cand.len() >= 4 {
                if token.contains(cand)
                    || (token.len() >= cand.len().saturating_sub(1) && cand.contains(token))
                {
                    true
                } else {
                    Self::levenshtein_distance(token, cand) <= max_dist
                }
            } else {
                false
            }
        })
    }

    /// Normalizes conversational Portuguese text from WhatsApp/Email:
    /// strips accents, expands slang, abbreviations, and common phonetic misspellings
    pub fn normalize_conversational_text(text: &str) -> String {
        let mut clean = String::with_capacity(text.len());
        for c in text.to_lowercase().chars() {
            match c {
                'á' | 'à' | 'ã' | 'â' | 'ä' => clean.push('a'),
                'é' | 'è' | 'ê' | 'ë' => clean.push('e'),
                'í' | 'ì' | 'î' | 'ï' => clean.push('i'),
                'ó' | 'ò' | 'õ' | 'ô' | 'ö' => clean.push('o'),
                'ú' | 'ù' | 'û' | 'ü' => clean.push('u'),
                'ç' => clean.push('c'),
                _ => clean.push(c),
            }
        }

        let words: Vec<String> = clean
            .split_whitespace()
            .map(|w| {
                let stripped = w.trim_matches(|c: char| {
                    !c.is_alphanumeric() && c != '@' && c != '.' && c != '#' && c != '_'
                });
                match stripped {
                    "kd" | "cade" => "onde esta".to_string(),
                    "vc" => "voce".to_string(),
                    "vcs" => "voces".to_string(),
                    "pq" | "pk" => "porque".to_string(),
                    "oq" => "o que".to_string(),
                    "tbm" | "tb" => "tambem".to_string(),
                    "pra" => "para".to_string(),
                    "pro" => "para o".to_string(),
                    "ped" | "pedid" => "pedido".to_string(),
                    "reemb" | "reembolco" | "rembolso" => "reembolso".to_string(),
                    "extorno" | "estorono" => "estorno".to_string(),
                    "pgto" | "pagto" => "pagamento".to_string(),
                    "rastr" => "rastreio".to_string(),
                    "nf" | "nfe" => "nota fiscal".to_string(),
                    "atrazado" | "atrasad" | "atrazou" => "atrasado".to_string(),
                    "cobranca" | "cobransa" => "cobranca".to_string(),
                    "duplicad" | "dupllicado" => "duplicada".to_string(),
                    "cancelad" | "cancela" => "cancelado".to_string(),
                    "recusad" => "recusado".to_string(),
                    "human" => "humano".to_string(),
                    "atendent" => "atendente".to_string(),
                    other => other.to_string(),
                }
            })
            .collect();

        words.join(" ")
    }

    /// Calibrated intent extraction with confidence score and typo tolerance
    pub fn extract_intent_calibrated(subject: &str, message: &str) -> (SupportIntent, f32) {
        let raw_text = format!("{} {}", subject, message);
        let text = Self::normalize_conversational_text(&raw_text);

        // 1. Defesa contra Prompt Injection: sanitiza comandos imperativos
        if text.contains("ignore all previous instructions")
            || text.contains("system prompt override")
            || text.contains("ignore previous rules")
        {
            return (SupportIntent::TechnicalIssue, 0.99);
        }

        // 2. Escalonamento Humano Prioritário
        if text.contains("falar com atendente")
            || text.contains("atendente humano")
            || text.contains("falar com humano")
            || text.contains("pessoa de verdade")
            || text.contains("ouvidoria")
            || text.contains("procon")
            || text.contains("reclame aqui")
            || text.contains("vou processar")
        {
            return (SupportIntent::HumanEscalation, 0.99);
        }

        // 3. Classificação semântica / léxica por palavras-chave com precedência calibrada
        let tokens: Vec<&str> = text.split_whitespace().collect();

        if text.contains("nota fiscal")
            || text.contains("danfe")
            || (text.contains("fatura") && !text.contains("cobranca") && !text.contains("duplicad"))
        {
            (SupportIntent::InvoiceQuestion, 0.98)
        } else if text.contains("assinatura")
            || text.contains("subscription")
            || text.contains("trancar")
            || text.contains("matricula")
            || (text.contains("plano") && !text.contains("pagamento"))
        {
            (SupportIntent::SubscriptionQuestion, 0.98)
        } else if text.contains("reembolso")
            || text.contains("refund")
            || text.contains("estorno")
            || text.contains("dinheiro de volta")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["reembolso", "estorno"], 1))
        {
            let conf = if text.contains("reembolso") || text.contains("estorno") {
                0.98
            } else {
                0.90
            };
            (SupportIntent::RefundPending, conf)
        } else if text.contains("duplicad")
            || text.contains("cobrado duas vezes")
            || text.contains("duas cobrancas")
            || text.contains("duplicate")
            || text.contains("two charges")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["duplicada", "duplicado"], 1))
        {
            let conf = if text.contains("duplicad") {
                0.98
            } else {
                0.90
            };
            (SupportIntent::DuplicateCharge, conf)
        } else if text.contains("segunda via")
            || text.contains("2 via")
            || text.contains("novo boleto")
            || text.contains("novo pix")
            || text.contains("chave pix")
            || text.contains("pix expirou")
            || text.contains("boleto vencido")
        {
            (SupportIntent::PaymentReissue, 0.98)
        } else if text.contains("falha no pagamento")
            || text.contains("cartao recusado")
            || text.contains("recusado")
            || text.contains("nao autorizado")
            || text.contains("payment failed")
            || text.contains("declined")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["recusado", "recusada"], 1))
        {
            (SupportIntent::PaymentFailed, 0.98)
        } else if text.contains("mudar endereco")
            || text.contains("trocar endereco")
            || text.contains("alterar endereco")
            || text.contains("endereco de entrega")
            || text.contains("endereco errado")
            || text.contains("errei o cep")
            || text.contains("mudar entrega")
        {
            (SupportIntent::AddressChange, 0.98)
        } else if text.contains("trocar")
            || text.contains("troca")
            || text.contains("devolver")
            || text.contains("devolucao")
            || text.contains("veio com defeito")
            || text.contains("produto quebrado")
            || text.contains("tamanho errado")
            || text.contains("logistica reversa")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["defeito", "quebrado"], 1))
        {
            (SupportIntent::ReturnExchange, 0.98)
        } else if text.contains("cancelado")
            || text.contains("cancelar")
            || text.contains("cancelei")
            || text.contains("cancelamento")
            || text.contains("order cancelled")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["cancelar", "cancelado", "cancelei"], 1))
        {
            (SupportIntent::OrderCancelled, 0.98)
        } else if text.contains("atrasado")
            || text.contains("objeto parado")
            || text.contains("prazo expirou")
            || text.contains("demora na entrega")
            || text.contains("atraso na entrega")
            || tokens
                .iter()
                .any(|t| Self::fuzzy_matches_any(t, &["atrasado", "atrasada", "demora"], 1))
        {
            (SupportIntent::ShippingDelay, 0.98)
        } else if text.contains("nao recebi")
            || text.contains("not received")
            || text.contains("rastreio")
            || text.contains("onde esta")
            || text.contains("processo judicial")
            || text.contains("advogado")
            || text.contains("ingresso")
            || text.contains("show")
            || text.contains("material de construcao")
            || text.contains("status da carga")
            || text.contains("previsao de entrega")
            || (text.contains("obra") && !text.contains("cobranca"))
        {
            (SupportIntent::OrderNotReceived, 0.98)
        } else if text.contains("voltagem")
            || text.contains("garantia")
            || text.contains("especificacao")
            || text.contains("compativel")
            || text.contains("como funciona")
            || text.contains("manual")
            || text.contains("consulta")
            || text.contains("medic")
            || text.contains("exame")
            || text.contains("curso")
            || text.contains("certificado")
            || text.contains("aluno")
            || text.contains("revisao")
            || text.contains("oficina")
            || text.contains("corte e barba")
            || text.contains("estetica")
            || text.contains("barbearia")
            || text.contains("vacina")
            || text.contains("veterinar")
            || text.contains("pet")
            || text.contains("solar")
            || text.contains("fotovoltaic")
            || text.contains("inversor")
            || text.contains("tamanho do produto")
        {
            (SupportIntent::ProductInquiry, 0.98)
        } else if text.contains("senha")
            || text.contains("password")
            || text.contains("login")
            || text.contains("recuperacao")
            || text.contains("acesso")
        {
            (SupportIntent::PasswordReset, 0.98)
        } else if text.contains("erro")
            || text.contains("bug")
            || text.contains("travou")
            || text.contains("sem conexao")
            || text.contains("visita tecnica")
            || text.contains("guincho")
            || text.contains("seguradora")
            || text.contains("apolice")
            || text.contains("quebrou")
            || text.contains("technical")
        {
            (SupportIntent::TechnicalIssue, 0.98)
        } else {
            (SupportIntent::Unknown, 0.20)
        }
    }

    pub fn extract_intent(subject: &str, message: &str) -> SupportIntent {
        Self::extract_intent_calibrated(subject, message).0
    }

    pub fn build_support_state(ticket: &Ticket) -> State {
        let intent = Self::extract_intent(&ticket.subject, &ticket.message);
        let entities = Self::extract_entities(&format!("{} {}", ticket.subject, ticket.message));

        let mut features = vec![0.0f32; 16];
        let idx = match intent {
            SupportIntent::RefundPending => 0,
            SupportIntent::DuplicateCharge => 1,
            SupportIntent::PaymentFailed => 2,
            SupportIntent::OrderCancelled => 3,
            SupportIntent::OrderNotReceived => 4,
            SupportIntent::InvoiceQuestion => 5,
            SupportIntent::SubscriptionQuestion => 6,
            SupportIntent::TechnicalIssue => 7,
            SupportIntent::PasswordReset => 8,
            SupportIntent::ProductInquiry => 9,
            SupportIntent::ReturnExchange => 10,
            SupportIntent::AddressChange => 11,
            SupportIntent::ShippingDelay => 12,
            SupportIntent::PaymentReissue => 13,
            SupportIntent::HumanEscalation => 14,
            SupportIntent::Unknown => 15,
        };
        features[idx] = 1.0;

        let metadata = serde_json::json!({
            "ticket_id": ticket.id,
            "tenant_id": ticket.tenant_id,
            "customer_id": ticket.customer_id,
            "intent": intent.as_str(),
            "subject": ticket.subject,
            "priority": format!("{:?}", ticket.priority),
            "entities": entities,
        });

        State::new(features, metadata)
    }
}

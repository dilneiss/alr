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

    pub fn extract_intent(subject: &str, message: &str) -> SupportIntent {
        let text = format!("{} {}", subject, message).to_lowercase();

        // 1. Defesa contra Prompt Injection: sanitiza comandos imperativos
        if text.contains("ignore all previous instructions")
            || text.contains("system prompt override")
            || text.contains("ignore previous rules")
        {
            return SupportIntent::TechnicalIssue;
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
            return SupportIntent::HumanEscalation;
        }

        // 3. Classificação semântica / léxica por palavras-chave com precedência calibrada
        if text.contains("nota fiscal")
            || text.contains("danfe")
            || (text.contains("fatura") && !text.contains("cobrança") && !text.contains("duplicad"))
        {
            SupportIntent::InvoiceQuestion
        } else if text.contains("assinatura")
            || text.contains("subscription")
            || (text.contains("plano") && !text.contains("pagamento"))
        {
            SupportIntent::SubscriptionQuestion
        } else if text.contains("reembolso")
            || text.contains("refund")
            || text.contains("estorno")
            || text.contains("dinheiro de volta")
        {
            SupportIntent::RefundPending
        } else if text.contains("duplicad")
            || text.contains("cobrado duas vezes")
            || text.contains("duas cobranças")
            || text.contains("duplicate")
            || text.contains("two charges")
        {
            SupportIntent::DuplicateCharge
        } else if text.contains("segunda via")
            || text.contains("2 via")
            || text.contains("2ª via")
            || text.contains("novo boleto")
            || text.contains("novo pix")
            || text.contains("chave pix")
            || text.contains("pix expirou")
            || text.contains("boleto vencido")
        {
            SupportIntent::PaymentReissue
        } else if text.contains("falha no pagamento")
            || text.contains("cartão recusado")
            || text.contains("cartao recusado")
            || text.contains("recusado")
            || text.contains("não autorizado")
            || text.contains("nao autorizado")
            || text.contains("payment failed")
            || text.contains("declined")
        {
            SupportIntent::PaymentFailed
        } else if text.contains("mudar endereço")
            || text.contains("trocar endereço")
            || text.contains("alterar endereço")
            || text.contains("endereço de entrega")
            || text.contains("endereço errado")
            || text.contains("errei o cep")
            || text.contains("mudar entrega")
        {
            SupportIntent::AddressChange
        } else if text.contains("trocar")
            || text.contains("troca")
            || text.contains("devolver")
            || text.contains("devolução")
            || text.contains("veio com defeito")
            || text.contains("produto quebrado")
            || text.contains("tamanho errado")
            || text.contains("logística reversa")
        {
            SupportIntent::ReturnExchange
        } else if text.contains("cancelado")
            || text.contains("cancelar pedido")
            || text.contains("order cancelled")
        {
            SupportIntent::OrderCancelled
        } else if text.contains("atrasado")
            || text.contains("objeto parado")
            || text.contains("prazo expirou")
            || text.contains("demora na entrega")
            || text.contains("atraso na entrega")
        {
            SupportIntent::ShippingDelay
        } else if text.contains("não recebi")
            || text.contains("not received")
            || text.contains("rastreio")
            || text.contains("onde está")
        {
            SupportIntent::OrderNotReceived
        } else if text.contains("voltagem")
            || text.contains("garantia")
            || text.contains("especificação")
            || text.contains("compatível")
            || text.contains("como funciona")
            || text.contains("manual")
            || text.contains("tamanho do produto")
        {
            SupportIntent::ProductInquiry
        } else if text.contains("senha")
            || text.contains("password")
            || text.contains("login")
            || text.contains("recuperação")
            || text.contains("acesso")
        {
            SupportIntent::PasswordReset
        } else if text.contains("erro")
            || text.contains("bug")
            || text.contains("travou")
            || text.contains("technical")
        {
            SupportIntent::TechnicalIssue
        } else {
            SupportIntent::Unknown
        }
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

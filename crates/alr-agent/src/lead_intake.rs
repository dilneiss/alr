//! Motor de Recebimento, Triagem Conversacional e Qualificação de Leads Previdenciários
//!
//! Especializado em Direito Previdenciário (INSS):
//! - Aposentadorias (Idade, Tempo, Especial, Invalidez)
//! - Benefício de Prestação Continuada (BPC / LOAS - Lei 8.742/93)
//! - Auxílio-Doença (Incapacidade Temporária)
//! - Pensão por Morte e Revisões de Benefício
//!
//! Opera com:
//! 1. Detecção e descarte imediato de lixo, spam e assuntos fora de escopo.
//! 2. Perguntas investigativas guiadas em fluxo conversacional idêntico ao WhatsApp.
//! 3. Respostas a dúvidas frequentes via Memória Semântica Qdrant com custo zero ($0.00).
//! 4. Ciclo de Auto-Aprendizado com LLM Teacher gravando no Qdrant quando surge dúvida inédita.
//! 5. Validação jurídica opcional pré-transbordo.
//! 6. Geração de Cartão de Transbordo Humano com link oficial direto para o WhatsApp do advogado (`wa.me`).

use alr_core::{Action, KnowledgeRequest, State};
use alr_llm::LlmTeacher;
use alr_memory::{
    EmbeddingProvider, SemanticMemory, SemanticMemoryStore, SemanticMemoryType, SemanticQuery,
};
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// Tipos de Benefício Previdenciário do INSS e Assistencial
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrevidenciarioBenefitType {
    AposentadoriaIdade,
    AposentadoriaTempo,
    AposentadoriaEspecial,
    AposentadoriaInvalidez,
    BpcLoas,
    AuxilioDoenca,
    PensaoMorte,
    RevisaoBeneficio,
    Outro,
}

impl PrevidenciarioBenefitType {
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::AposentadoriaIdade => "Aposentadoria por Idade (Urbana / Rural)",
            Self::AposentadoriaTempo => "Aposentadoria por Tempo (Regras de Transição EC 103)",
            Self::AposentadoriaEspecial => {
                "Aposentadoria Especial (Insalubridade / Periculosidade)"
            }
            Self::AposentadoriaInvalidez => "Aposentadoria por Invalidez (Incapacidade Permanente)",
            Self::BpcLoas => "BPC / LOAS (Benefício Assistencial Idoso / Deficiente)",
            Self::AuxilioDoenca => "Auxílio-Doença (Incapacidade Temporária)",
            Self::PensaoMorte => "Pensão por Morte (Dependentes de Segurado)",
            Self::RevisaoBeneficio => "Revisão de Aposentadoria / Erro de Cálculo",
            Self::Outro => "Dúvida Previdenciária Geral",
        }
    }
}

/// Status de Qualificação do Lead Previdenciário
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeadQualificationStatus {
    Qualifying,
    QualifiedHighPriority,
    QualifiedMediumPriority,
    DiscardedJunk,
    DiscardedOutOfScope,
    DiscardedIneligible,
    HandoverToHuman,
}

impl LeadQualificationStatus {
    pub fn is_qualified(&self) -> bool {
        matches!(
            self,
            Self::QualifiedHighPriority | Self::QualifiedMediumPriority | Self::HandoverToHuman
        )
    }

    pub fn is_discarded(&self) -> bool {
        matches!(
            self,
            Self::DiscardedJunk | Self::DiscardedOutOfScope | Self::DiscardedIneligible
        )
    }

    pub fn badge_label(&self) -> &'static str {
        match self {
            Self::Qualifying => "EM QUALIFICAÇÃO",
            Self::QualifiedHighPriority => "QUALIFICADO (ALTA PRIORIDADE)",
            Self::QualifiedMediumPriority => "QUALIFICADO (MÉDIA PRIORIDADE)",
            Self::DiscardedJunk => "DESCARTADO (SPAM / LIXO)",
            Self::DiscardedOutOfScope => "DESCARTADO (FORA DO ESCOPO)",
            Self::DiscardedIneligible => "DESCARTADO (INVIÁVEL)",
            Self::HandoverToHuman => "TRANSBORDO PARA WHATSAPP",
        }
    }
}

/// Dossiê Perfil do Lead Previdenciário
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadProfile {
    pub id: String,
    pub customer_name: String,
    pub phone_number: Option<String>,
    pub benefit_type: Option<PrevidenciarioBenefitType>,
    pub age: Option<u32>,
    pub gender: Option<String>, // "M" ou "F"
    pub contribution_years: Option<f32>,
    pub has_inss_denial: Option<bool>,
    pub inss_denial_date: Option<String>,
    pub has_medical_report: Option<bool>,
    pub monthly_household_income_per_capita: Option<f64>,
    pub is_rural_worker: Option<bool>,
    pub notes: Vec<String>,
    pub status: LeadQualificationStatus,
    pub qualification_score: f32, // 0.0 a 100.0
    pub discard_reason: Option<String>,
    pub dialogue_history: Vec<LeadDialogueMessage>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Default for LeadProfile {
    fn default() -> Self {
        Self::new(
            "lead_".to_string() + &uuid::Uuid::new_v4().simple().to_string()[..8],
            "Lead Interessado",
        )
    }
}

impl LeadProfile {
    pub fn new(id: String, name: &str) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id,
            customer_name: name.to_string(),
            phone_number: None,
            benefit_type: None,
            age: None,
            gender: None,
            contribution_years: None,
            has_inss_denial: None,
            inss_denial_date: None,
            has_medical_report: None,
            monthly_household_income_per_capita: None,
            is_rural_worker: None,
            notes: Vec::new(),
            status: LeadQualificationStatus::Qualifying,
            qualification_score: 10.0,
            discard_reason: None,
            dialogue_history: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

/// Mensagem individual de conversa no formato WhatsApp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadDialogueMessage {
    pub sender: String, // "lead" ou "assistant"
    pub text: String,
    pub timestamp: i64,
    pub message_type: String, // "dialogue", "discard", "qualification", "handover", "learned_answer"
    #[serde(default)]
    pub source: Option<String>, // "system1_rules", "qdrant_semantic", "llm_teacher"
}

/// Resultado da Validação Jurídica por LLM (opcional pré-transbordo)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadValidationResult {
    pub is_approved_for_human: bool,
    pub legal_thesis_summary: String,
    pub recommended_action: String,
    pub required_documents: Vec<String>,
    pub confidence: f32,
    pub validation_cost_usd: f64,
}

/// Relatório Oficial de Transbordo para Atendimento Humano via WhatsApp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadHandoverReport {
    pub lead_id: String,
    pub customer_name: String,
    pub lawyer_phone: String,
    pub whatsapp_url: String,
    pub prefilled_message: String,
    pub case_summary: String,
    pub priority: String,
    pub qualification_score: f32,
    pub required_documents: Vec<String>,
}

/// Trait para consulta jurídica com o Professor LLM
#[async_trait]
pub trait PrevidenciarioLlmTeacher: Send + Sync {
    async fn ask_legal_question(&self, system_prompt: &str, user_prompt: &str) -> Result<String>;
}

#[async_trait]
impl<T: LlmTeacher + ?Sized> PrevidenciarioLlmTeacher for T {
    async fn ask_legal_question(&self, system_prompt: &str, user_prompt: &str) -> Result<String> {
        let req = KnowledgeRequest {
            state: State::new(vec![], serde_json::json!({ "system": system_prompt })),
            candidate_actions: vec![Action::new("answer", serde_json::json!({}))],
            context_description: format!("{}\n\n{}", system_prompt, user_prompt),
            failure_history: vec![],
        };
        let proposal = self.propose_knowledge(req).await?;
        if !proposal.reason.is_empty() {
            Ok(proposal.reason)
        } else {
            Ok("Com base na legislação previdenciária, o benefício requer comprovação de carência e qualidade de segurado.".to_string())
        }
    }
}

/// Motor de Regras Jurídicas Previdenciárias Determinísticas (Lei 8.213/91 e EC 103/2019)
pub struct PrevidenciarioRuleEngine;

impl PrevidenciarioRuleEngine {
    /// Detecta se a mensagem é lixo flagrante ou assunto de outros ramos do direito
    pub fn detect_discard_reason(text: &str) -> Option<(LeadQualificationStatus, String)> {
        let lower = text.to_lowercase();
        let trimmed = lower.trim();

        // 1. Lixo, Spam, Ofensas, Provocações
        let junk_words = [
            "teste",
            "asdf",
            "vai tomar",
            "cala boca",
            "urubu do pix",
            "ganhar dinheiro facil",
            "ganhe dinheiro",
            "marketing multinivel",
            "marketing multinível",
            "renda extra",
            "trabalhando 2 horas",
            "aposta",
            "tigrinho",
        ];
        for j in &junk_words {
            if trimmed.contains(j) {
                return Some((
                    LeadQualificationStatus::DiscardedJunk,
                    "Mensagem classificada como spam, teste inválido ou conteúdo não condizente com atendimento profissional.".to_string(),
                ));
            }
        }

        // 2. Fora do Escopo Previdenciário (Outras áreas do Direito)
        if lower.contains("divorcio")
            || lower.contains("divórcio")
            || lower.contains("separacao de bens")
            || lower.contains("guarda de filho")
            || lower.contains("pensao alimenticia")
            || lower.contains("pensão alimentícia")
        {
            return Some((
                LeadQualificationStatus::DiscardedOutOfScope,
                "Assunto de Direito de Família (divórcio/pensão alimentícia de filhos). Nosso escritório é especializado exclusivamente em causas previdenciárias contra o INSS.".to_string(),
            ));
        }

        if lower.contains("acidente de transito")
            || lower.contains("batida de carro")
            || lower.contains("danos morais voo")
            || lower.contains("passagem aerea")
            || lower.contains("overbooking")
        {
            return Some((
                LeadQualificationStatus::DiscardedOutOfScope,
                "Assunto de Direito Civil / Consumidor. Não atendemos ações de trânsito ou companhias aéreas.".to_string(),
            ));
        }

        if (lower.contains("demissao sem justa causa")
            || lower.contains("rescisao trabalhista")
            || lower.contains("hora extra"))
            && !lower.contains("inss")
            && !lower.contains("aposentadoria")
        {
            return Some((
                LeadQualificationStatus::DiscardedOutOfScope,
                "Causa trabalhista pura contra empregador privado sem relação com benefícios previdenciários do INSS.".to_string(),
            ));
        }

        None
    }

    /// Detecta intenção de benefício previdenciário no texto
    pub fn detect_benefit_type(text: &str) -> Option<PrevidenciarioBenefitType> {
        let lower = text.to_lowercase();
        if lower.contains("bpc")
            || lower.contains("loas")
            || lower.contains("benefício assistencial")
            || lower.contains("idoso de baixa renda")
        {
            Some(PrevidenciarioBenefitType::BpcLoas)
        } else if lower.contains("auxilio doenca")
            || lower.contains("auxílio doença")
            || lower.contains("auxilio-doenca")
            || lower.contains("auxílio-doença")
            || lower.contains("incapacidade temporaria")
            || lower.contains("incapacidade temporária")
            || lower.contains("laudo medico")
            || lower.contains("laudo médico")
            || lower.contains("pericia do inss")
            || lower.contains("perícia do inss")
            || lower.contains("perícia")
            || lower.contains("afastamento")
            || lower.contains("acidente de trabalho")
            || lower.contains("hernia")
            || lower.contains("hérnia")
        {
            Some(PrevidenciarioBenefitType::AuxilioDoenca)
        } else if lower.contains("invalidez")
            || lower.contains("incapacidade permanente")
            || lower.contains("aposentadoria por invalidez")
        {
            Some(PrevidenciarioBenefitType::AposentadoriaInvalidez)
        } else if lower.contains("especial")
            || lower.contains("insalubre")
            || lower.contains("periculosidade")
            || lower.contains("ppp")
            || lower.contains("frigorifico")
            || lower.contains("enfermagem")
            || lower.contains("soldador")
        {
            Some(PrevidenciarioBenefitType::AposentadoriaEspecial)
        } else if lower.contains("pensao por morte")
            || lower.contains("pensão por morte")
            || lower.contains("falecimento do marido")
            || lower.contains("esposa faleceu")
            || lower.contains("conjuge falecido")
        {
            Some(PrevidenciarioBenefitType::PensaoMorte)
        } else if lower.contains("revisao")
            || lower.contains("revisão")
            || lower.contains("vida toda")
            || lower.contains("inss errou")
            || lower.contains("aumentar minha aposentadoria")
        {
            Some(PrevidenciarioBenefitType::RevisaoBeneficio)
        } else if lower.contains("tempo de contribuicao")
            || lower.contains("tempo de contribuição")
            || lower.contains("tempo de serviço")
            || lower.contains("carteira de trabalho")
            || lower.contains("anos de contribuicao")
            || lower.contains("anos de contribuição")
            || lower.contains("pedagio")
            || lower.contains("pedágio")
        {
            Some(PrevidenciarioBenefitType::AposentadoriaTempo)
        } else if lower.contains("aposentadoria por idade")
            || lower.contains("aposentar por idade")
            || lower.contains("idade minima")
            || lower.contains("aposentar")
        {
            Some(PrevidenciarioBenefitType::AposentadoriaIdade)
        } else {
            None
        }
    }

    /// Extrai idade do texto (ex: "tenho 64 anos", "estou com 67", "65 anos")
    pub fn extract_age(text: &str) -> Option<u32> {
        let words: Vec<&str> = text.split_whitespace().collect();
        for i in 0..words.len() {
            let w = words[i].trim_matches(|c: char| !c.is_numeric());
            if let Ok(num) = w.parse::<u32>() {
                if (18..=105).contains(&num) {
                    if i + 1 < words.len()
                        && (words[i + 1].starts_with("ano") || words[i + 1].starts_with("idade"))
                    {
                        let forward = words
                            .iter()
                            .skip(i + 1)
                            .take(4)
                            .cloned()
                            .collect::<Vec<_>>()
                            .join(" ")
                            .to_lowercase();
                        if !forward.contains("contribu")
                            && !forward.contains("trabalh")
                            && !forward.contains("carteira")
                        {
                            return Some(num);
                        }
                    }
                    if i > 0
                        && (words[i - 1].contains("tenho")
                            || words[i - 1].contains("com")
                            || words[i - 1].contains("fiz"))
                    {
                        let forward = words
                            .iter()
                            .skip(i)
                            .take(4)
                            .cloned()
                            .collect::<Vec<_>>()
                            .join(" ")
                            .to_lowercase();
                        if !forward.contains("contribu") {
                            return Some(num);
                        }
                    }
                }
            }
        }
        None
    }

    /// Extrai tempo aproximado de contribuição em anos
    pub fn extract_contribution_years(text: &str) -> Option<f32> {
        let words: Vec<&str> = text.split_whitespace().collect();
        for i in 0..words.len() {
            let w = words[i].trim_matches(|c: char| !c.is_numeric());
            if let Ok(num) = w.parse::<f32>() {
                if (1.0..=50.0).contains(&num) {
                    let nearby_ctx = words
                        .iter()
                        .skip(i.saturating_sub(2))
                        .take(8)
                        .cloned()
                        .collect::<Vec<_>>()
                        .join(" ")
                        .to_lowercase();
                    if nearby_ctx.contains("carteira")
                        || nearby_ctx.contains("contribu")
                        || nearby_ctx.contains("trabalh")
                        || nearby_ctx.contains("inss")
                        || nearby_ctx.contains("carne")
                    {
                        return Some(num);
                    }
                }
            }
        }
        None
    }

    /// Avalia a pontuação de qualificação previdenciária de 0 a 100
    pub fn score_lead(lead: &LeadProfile) -> (f32, LeadQualificationStatus, Option<String>) {
        if let Some(r) = &lead.discard_reason {
            return (0.0, lead.status, Some(r.clone()));
        }

        let mut score: f32 = 20.0;

        // 1. Tipo de benefício identificado (+20)
        if let Some(ben) = lead.benefit_type {
            score += 20.0;
            // Benefícios com alta demanda e retorno judicial imediato
            match ben {
                PrevidenciarioBenefitType::BpcLoas
                | PrevidenciarioBenefitType::AuxilioDoenca
                | PrevidenciarioBenefitType::AposentadoriaEspecial => {
                    score += 10.0;
                }
                _ => {}
            }
        }

        // 2. Indeferimento prévio no INSS (+30 - fator número 1 de fechamento de contrato judicial)
        if let Some(true) = lead.has_inss_denial {
            score += 30.0;
        }

        // 3. Critérios de Idade e Carência
        if let Some(age) = lead.age {
            if let Some(ben) = lead.benefit_type {
                match ben {
                    PrevidenciarioBenefitType::BpcLoas => {
                        if age >= 65 {
                            score += 25.0; // Requisito objetivo da LOAS atingido!
                        } else if let Some(true) = lead.has_medical_report {
                            score += 20.0; // BPC por deficiência em qualquer idade!
                        }
                    }
                    PrevidenciarioBenefitType::AposentadoriaIdade => {
                        let is_female = lead.gender.as_deref() == Some("F");
                        let required_age = if is_female { 62 } else { 65 };
                        if age >= required_age {
                            score += 20.0;
                        }
                    }
                    _ => {}
                }
            }
        }

        // 4. Tempo de Contribuição
        if let Some(years) = lead.contribution_years {
            if years >= 15.0 {
                score += 15.0; // Carência básica de 180 meses atingida
            }
            if years >= 30.0 {
                score += 15.0; // Regras de transição muito prováveis
            }
        }

        // 5. Laudo Médico para causas de incapacidade
        if let Some(true) = lead.has_medical_report {
            score += 15.0;
        }

        score = score.clamp(0.0, 100.0);

        if score >= 75.0 {
            (score, LeadQualificationStatus::QualifiedHighPriority, None)
        } else if score >= 50.0 {
            (
                score,
                LeadQualificationStatus::QualifiedMediumPriority,
                None,
            )
        } else {
            (score, LeadQualificationStatus::Qualifying, None)
        }
    }
}

/// Motor Conversacional de Recebimento e Qualificação de Leads (Lead Intake)
pub struct LeadIntakeEngine {
    pub semantic_store: Option<Arc<dyn SemanticMemoryStore>>,
    pub embedder: Option<Arc<dyn EmbeddingProvider>>,
    pub knowledge_cache: HashMap<String, String>,
    pub lawyer_whatsapp: String,
}

impl Default for LeadIntakeEngine {
    fn default() -> Self {
        Self::new("5511999998888")
    }
}

impl LeadIntakeEngine {
    pub fn new(lawyer_whatsapp: &str) -> Self {
        let mut cache = HashMap::new();
        // Respostas locais com custo $0 para dúvidas clássicas
        cache.insert(
            "bpc_requisitos".to_string(),
            "O BPC/LOAS garante 1 salário mínimo mensal para idosos com 65 anos ou mais, ou pessoas com deficiência de qualquer idade, desde que a renda por pessoa da família seja baixa. O melhor de tudo: NÃO exige ter pago INSS!".to_string(),
        );
        cache.insert(
            "auxilio_doenca_negado".to_string(),
            "Se o perito médico do INSS negou seu auxílio-doença, você tem o direito legal de recorrer ou entrar com uma Ação Judicial com perícia feita por um médico especialista nomeado pelo juiz, garantindo o recebimento de todos os meses atrasados!".to_string(),
        );
        cache.insert(
            "aposentadoria_especial".to_string(),
            "Trabalhadores expostos a ruído excessivo, agentes químicos, biológicos, calor ou periculosidade têm direito à Aposentadoria Especial com redução de tempo ou conversão dos anos anteriores à Reforma (11/2019) aumentando seu tempo total!".to_string(),
        );

        Self {
            semantic_store: None,
            embedder: None,
            knowledge_cache: cache,
            lawyer_whatsapp: lawyer_whatsapp.to_string(),
        }
    }

    pub fn with_semantic_memory(
        mut self,
        store: Arc<dyn SemanticMemoryStore>,
        embedder: Arc<dyn EmbeddingProvider>,
    ) -> Self {
        self.semantic_store = Some(store);
        self.embedder = Some(embedder);
        self
    }

    /// Processa mensagem livre do lead simulando o fluxo de chat do WhatsApp
    pub async fn process_lead_message(
        &mut self,
        lead: &mut LeadProfile,
        incoming_message: &str,
    ) -> (LeadDialogueMessage, Option<LeadHandoverReport>) {
        let now = chrono::Utc::now().timestamp();
        lead.updated_at = now;

        // Registra mensagem do cliente
        lead.dialogue_history.push(LeadDialogueMessage {
            sender: "lead".to_string(),
            text: incoming_message.to_string(),
            timestamp: now,
            message_type: "dialogue".to_string(),
            source: None,
        });

        // =========================================================================
        // CAMADA 1: FILTRO DE LIXO E FORA DO ESCOPO
        // =========================================================================
        if let Some((discard_status, reason)) =
            PrevidenciarioRuleEngine::detect_discard_reason(incoming_message)
        {
            lead.status = discard_status;
            lead.discard_reason = Some(reason.clone());
            lead.qualification_score = 0.0;

            let reply_text = format!(
                "Agradecemos o seu contato. Analisamos as informações enviadas e identificamos que o seu caso não se enquadra nos requisitos legais previdenciários atendidos pelo nosso escritório no momento ({reason}). Por essa razão, encerramos o atendimento por aqui. Desejamos sucesso!"
            );

            let out_msg = LeadDialogueMessage {
                sender: "assistant".to_string(),
                text: reply_text,
                timestamp: now + 1,
                message_type: "discard".to_string(),
                source: Some("filter_discard".to_string()),
            };
            lead.dialogue_history.push(out_msg.clone());
            return (out_msg, None);
        }

        // =========================================================================
        // CAMADA 2: EXTRAÇÃO DE ENTIDADES PREVIDENCIÁRIAS
        // =========================================================================
        if lead.benefit_type.is_none() {
            lead.benefit_type = PrevidenciarioRuleEngine::detect_benefit_type(incoming_message);
        }
        if lead.age.is_none() {
            lead.age = PrevidenciarioRuleEngine::extract_age(incoming_message);
        }
        if lead.contribution_years.is_none() {
            lead.contribution_years =
                PrevidenciarioRuleEngine::extract_contribution_years(incoming_message);
        }

        let lower = incoming_message.to_lowercase();
        if lower.contains("negou")
            || lower.contains("negad")
            || lower.contains("indefer")
            || lower.contains("recus")
            || lower.contains("cess")
        {
            lead.has_inss_denial = Some(true);
        }
        if lower.contains("laudo")
            || lower.contains("atestado")
            || lower.contains("exame")
            || lower.contains("cid")
        {
            lead.has_medical_report = Some(true);
        }
        if lower.contains("sou mulher")
            || lower.contains("sou dona de casa")
            || lower.contains("senhora")
        {
            lead.gender = Some("F".to_string());
        } else if lower.contains("sou homem") || lower.contains("senhor") {
            lead.gender = Some("M".to_string());
        }
        if lower.contains("rural")
            || lower.contains("roça")
            || lower.contains("agricult")
            || lower.contains("pescad")
        {
            lead.is_rural_worker = Some(true);
        }

        // =========================================================================
        // CAMADA 3: BUSCA DE DÚVIDA JURÍDICA NA MEMÓRIA SEMÂNTICA (QDRANT / $0 TOKENS)
        // =========================================================================
        let mut learned_legal_explanation: Option<String> = None;
        if let (Some(store), Some(embedder)) = (&self.semantic_store, &self.embedder) {
            if let Ok(vecs) = embedder.embed(&[incoming_message.to_string()]).await {
                if let Some(vec) = vecs.into_iter().next() {
                    let query = SemanticQuery::new("previdenciario", vec)
                        .with_memory_type(SemanticMemoryType::Faq)
                        .with_top_k(1);
                    if let Ok(results) = store.search(query).await {
                        if let Some(top) = results.first() {
                            if top.score >= 0.72 {
                                learned_legal_explanation = Some(top.memory.content.clone());
                            }
                        }
                    }
                }
            }
        }

        // Fallback para cache local de alta velocidade
        if learned_legal_explanation.is_none() {
            if lower.contains("bpc") || lower.contains("loas") {
                learned_legal_explanation = self.knowledge_cache.get("bpc_requisitos").cloned();
            } else if lower.contains("auxilio")
                && (lower.contains("negou") || lower.contains("perito"))
            {
                learned_legal_explanation =
                    self.knowledge_cache.get("auxilio_doenca_negado").cloned();
            } else if lower.contains("especial") || lower.contains("insalubre") {
                learned_legal_explanation =
                    self.knowledge_cache.get("aposentadoria_especial").cloned();
            }
        }

        // =========================================================================
        // CAMADA 4: RECÁLCULO DO SCORE DE QUALIFICAÇÃO
        // =========================================================================
        let (score, status, _) = PrevidenciarioRuleEngine::score_lead(lead);
        lead.qualification_score = score;
        lead.status = status;

        // =========================================================================
        // CAMADA 5: CONDUTOR DE PRÓXIMA RESPOSTA CONVERSACIONAL (INVESTIGAÇÃO / TRANSBORDO)
        // =========================================================================
        let (reply_text, handover) = if status == LeadQualificationStatus::QualifiedHighPriority
            || (status == LeadQualificationStatus::QualifiedMediumPriority
                && lead.dialogue_history.len() >= 4)
        {
            // Lead altamente qualificado: aciona transbordo humano imediato!
            lead.status = LeadQualificationStatus::HandoverToHuman;
            let handover_report = self.generate_whatsapp_handover(lead, &self.lawyer_whatsapp);

            let ben_str = lead
                .benefit_type
                .map(|b| b.display_name())
                .unwrap_or("Benefício Previdenciário");
            let text = format!(
                "Excelente notícia! Com base nas informações apresentadas ({ben_str}), identificamos uma **altíssima probabilidade e viabilidade jurídica** para o seu caso perante o INSS ou via Ação Judicial.\n\nNosso advogado especialista já está com o seu dossiê pré-aprovado na mesa. Clique no botão abaixo para conversar diretamente com ele no WhatsApp oficial do escritório!"
            );

            (text, Some(handover_report))
        } else if lead.benefit_type.is_none() {
            let explanation_prefix = learned_legal_explanation
                .map(|e| format!("{e}\n\n"))
                .unwrap_or_default();
            let text = format!(
                "{explanation_prefix}Olá! Seja muito bem-vindo ao atendimento da nossa Advocacia Previdenciária.\n\nPara que eu possa avaliar o seu direito: você busca **se aposentar** (por idade ou tempo de contribuição), necessita de um benefício por doença/incapacidade como o **Auxílio-Doença/Invalidez**, ou o **BPC/LOAS**?"
            );
            (text, None)
        } else if lead.age.is_none()
            && !matches!(
                lead.benefit_type,
                Some(PrevidenciarioBenefitType::PensaoMorte)
            )
        {
            let ben_name = lead.benefit_type.unwrap().display_name();
            let text = format!(
                "Perfeito! Compreendi que seu interesse é em **{ben_name}**.\n\nPara calcularmos os requisitos objetivos da lei: qual é a sua **idade atual** e você é **homem ou mulher**?"
            );
            (text, None)
        } else if lead.contribution_years.is_none()
            && !matches!(lead.benefit_type, Some(PrevidenciarioBenefitType::BpcLoas))
        {
            let text = "Muito importante: aproximadamente **quantos anos de contribuição** você já possui somando carteira de trabalho assinada, carnês ou tempo de trabalho na roça/rural?".to_string();
            (text, None)
        } else if lead.has_inss_denial.is_none() {
            let text = "Você já deu entrada com o pedido no INSS e ele foi **negado/indeferido**, ou ainda não fez a solicitação?".to_string();
            (text, None)
        } else {
            // Pergunta adicional de fechamento
            let handover_report = self.generate_whatsapp_handover(lead, &self.lawyer_whatsapp);
            let text = "Perfeito, coletamos todos os dados preliminares essenciais. Nosso especialista previdenciário já pode assumir seu atendimento. Clique no botão verde abaixo para continuar a conversa direto no WhatsApp!".to_string();
            (text, Some(handover_report))
        };

        let msg_type = if handover.is_some() {
            "handover"
        } else {
            "dialogue"
        };
        let out_msg = LeadDialogueMessage {
            sender: "assistant".to_string(),
            text: reply_text,
            timestamp: now + 1,
            message_type: msg_type.to_string(),
            source: Some("lead_intake_engine".to_string()),
        };
        lead.dialogue_history.push(out_msg.clone());

        (out_msg, handover)
    }

    /// Ciclo de Auto-Aprendizado: formula dúvida com LLM Teacher e cristaliza no Qdrant
    pub async fn auto_learn_legal_question(
        &mut self,
        question: &str,
        llm: &dyn PrevidenciarioLlmTeacher,
    ) -> Result<String> {
        let key_slug = question
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric(), "_");

        // 1. Consulta se já foi aprendido no cache local
        if let Some(cached) = self.knowledge_cache.get(&key_slug) {
            return Ok(cached.clone());
        }

        // 2. Consulta se já existe no Qdrant
        if let (Some(store), Some(embedder)) = (&self.semantic_store, &self.embedder) {
            if let Ok(vecs) = embedder.embed(&[question.to_string()]).await {
                if let Some(vec) = vecs.into_iter().next() {
                    let query = SemanticQuery::new("previdenciario", vec)
                        .with_memory_type(SemanticMemoryType::Faq)
                        .with_top_k(1);
                    if let Ok(results) = store.search(query).await {
                        if let Some(top) = results.first() {
                            if top.score >= 0.88 {
                                self.knowledge_cache
                                    .insert(key_slug.clone(), top.memory.content.clone());
                                return Ok(top.memory.content.clone());
                            }
                        }
                    }
                }
            }
        }

        // 3. Caso inédito: consulta o Professor LLM
        let system_prompt = "Você é um jurista sênior especialista em Direito Previdenciário Brasileiro (INSS, Lei 8.213/91, EC 103/2019 e LOAS Lei 8.742/93). Responda de forma clara, didática, precisa e objetiva para um cidadão tirando dúvidas no WhatsApp. Máximo de 3 parágrafos curtos.";
        let user_prompt = format!(
            "Dúvida jurídica do cliente: \"{question}\"\nElabore a resposta jurídica orientativa correta."
        );

        let answer = llm.ask_legal_question(system_prompt, &user_prompt).await?;
        let clean_answer = answer.trim().to_string();

        // Armazena no cache local em memória
        self.knowledge_cache
            .insert(key_slug.clone(), clean_answer.clone());

        // Se houver Qdrant conectado, faz auto-armazenamento vetorial para auto-aprendizado permanente
        if let (Some(store), Some(embedder)) = (&self.semantic_store, &self.embedder) {
            if let Ok(vecs) = embedder.embed(&[question.to_string()]).await {
                if let Some(vec) = vecs.into_iter().next() {
                    let mut mem = SemanticMemory::new(
                        "previdenciario",
                        SemanticMemoryType::Faq,
                        format!("Dúvida Previdenciária: {}", question),
                        clean_answer.clone(),
                        "llm_teacher_auto_learn",
                    );
                    mem.vector = Some(vec);
                    mem.metadata.insert(
                        "niche".to_string(),
                        serde_json::json!("advocacia_previdenciaria"),
                    );
                    mem.metadata
                        .insert("question".to_string(), serde_json::json!(question));
                    let _ = store.upsert(vec![mem]).await;
                }
            }
        }

        Ok(clean_answer)
    }

    /// Validação jurídica por LLM opcional prévia ao transbordo
    pub async fn validate_lead_with_llm(
        &self,
        lead: &LeadProfile,
        llm: &dyn PrevidenciarioLlmTeacher,
    ) -> Result<LeadValidationResult> {
        let system_prompt = "Você é um auditor jurídico chefe de um escritório de advocacia previdenciária. Avalie o caso do lead e determine a viabilidade jurídica preliminar. Retorne estritamente um JSON com os campos: is_approved (bool), thesis_summary (string), recommended_action (string), required_documents (array de strings).";
        let user_prompt = format!(
            "Dossiê do Lead:\nNome: {}\nBenefício: {:?}\nIdade: {:?}\nSexo: {:?}\nTempo Contribuição: {:?} anos\nNegado no INSS: {:?}\nLaudo Médico: {:?}",
            lead.customer_name, lead.benefit_type, lead.age, lead.gender, lead.contribution_years, lead.has_inss_denial, lead.has_medical_report
        );

        let resp = llm.ask_legal_question(system_prompt, &user_prompt).await?;
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&resp);

        if let Ok(val) = parsed {
            let docs = val["required_documents"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_else(|| {
                    vec![
                        "Extrato CNIS completo".into(),
                        "Documento com foto (RG/CNH)".into(),
                    ]
                });

            Ok(LeadValidationResult {
                is_approved_for_human: val["is_approved"].as_bool().unwrap_or(true),
                legal_thesis_summary: val["thesis_summary"]
                    .as_str()
                    .unwrap_or("Tese de concessão ou restabelecimento de benefício previdenciário")
                    .to_string(),
                recommended_action: val["recommended_action"]
                    .as_str()
                    .unwrap_or("Agendar atendimento e protocolar petição judicial")
                    .to_string(),
                required_documents: docs,
                confidence: 0.95,
                validation_cost_usd: 0.000015,
            })
        } else {
            // Fallback analítico determinístico se a LLM não retornar JSON estrito
            Ok(LeadValidationResult {
                is_approved_for_human: lead.qualification_score >= 50.0,
                legal_thesis_summary: format!(
                    "Ação Previdenciária de Concessão de {:?}",
                    lead.benefit_type
                ),
                recommended_action:
                    "Análise urgente de indeferimento administrativo com cobrança de atrasados"
                        .to_string(),
                required_documents: vec![
                    "Extrato Previdenciário CNIS completo".into(),
                    "Cópia da Carteira de Trabalho (CTPS)".into(),
                    "Comprovante de residência atualizado".into(),
                    "Carta de indeferimento do INSS".into(),
                ],
                confidence: 0.90,
                validation_cost_usd: 0.0,
            })
        }
    }

    /// Gera o relatório de transbordo e o link oficial do WhatsApp (`wa.me`)
    pub fn generate_whatsapp_handover(
        &self,
        lead: &LeadProfile,
        lawyer_phone: &str,
    ) -> LeadHandoverReport {
        let clean_phone = lawyer_phone.replace(|c: char| !c.is_numeric(), "");
        let ben_str = lead
            .benefit_type
            .map(|b| b.display_name())
            .unwrap_or("Benefício Previdenciário");
        let age_str = lead
            .age
            .map(|a| format!("{a} anos"))
            .unwrap_or_else(|| "Não informada".to_string());
        let gender_str = lead.gender.as_deref().unwrap_or("Não informado");
        let time_str = lead
            .contribution_years
            .map(|t| format!("{t:.1} anos"))
            .unwrap_or_else(|| "A apurar no CNIS".to_string());
        let inss_str = match lead.has_inss_denial {
            Some(true) => "SIM, pedido indeferido/negado (Direito a atrasados!)",
            Some(false) => "Não, ainda não deu entrada",
            None => "A verificar",
        };

        let message = format!(
            "⚖️ *PRÉ-ATENDIMENTO PREVIDENCIÁRIO - ALR DESK*\n\n\
            👤 *Cliente:* {}\n\
            📋 *Benefício Desejado:* {}\n\
            🎂 *Idade / Sexo:* {} ({})\n\
            ⏳ *Tempo de Contribuição:* {}\n\
            ❌ *Negado no INSS:* {}\n\
            🎯 *Score de Qualificação:* {:.0}/100 ({})\n\n\
            Olá Doutor(a), o assistente inteligente pré-qualificou meu caso previdenciário e gostaria de dar andamento com o escritório!",
            lead.customer_name, ben_str, age_str, gender_str, time_str, inss_str, lead.qualification_score, lead.status.badge_label()
        );

        let encoded_text = urlencoding_simple(&message);
        let whatsapp_url = format!("https://wa.me/{clean_phone}?text={encoded_text}");

        let docs = match lead.benefit_type {
            Some(PrevidenciarioBenefitType::BpcLoas) => vec![
                "Documento de identificação (RG/CPF)".into(),
                "Comprovante de Cadastro Único (CadÚnico atualizado)".into(),
                "Comprovante de renda de todos os membros que moram na casa".into(),
                "Laudo médico com CID (se for BPC por deficiência)".into(),
            ],
            Some(PrevidenciarioBenefitType::AuxilioDoenca)
            | Some(PrevidenciarioBenefitType::AposentadoriaInvalidez) => vec![
                "Laudos médicos detalhados e atestados com CID recente".into(),
                "Receitas e exames de imagem comprobatórios".into(),
                "Comunicação de Decisão do INSS (resultado da perícia)".into(),
                "Extrato de contribuições CNIS".into(),
            ],
            Some(PrevidenciarioBenefitType::AposentadoriaEspecial) => vec![
                "Perfil Profissiográfico Previdenciário (PPP) de todas as empresas".into(),
                "Laudo Técnico de Condições Ambientais do Trabalho (LTCAT)".into(),
                "Carteiras de Trabalho (todas as vias originais)".into(),
                "Extrato CNIS".into(),
            ],
            _ => vec![
                "Extrato Previdenciário CNIS completo".into(),
                "Carteiras de Trabalho (todas as CTPS)".into(),
                "Carnês de pagamento GPS (se autônomo)".into(),
                "Documento com foto e comprovante de residência".into(),
            ],
        };

        LeadHandoverReport {
            lead_id: lead.id.clone(),
            customer_name: lead.customer_name.clone(),
            lawyer_phone: clean_phone,
            whatsapp_url,
            prefilled_message: message,
            case_summary: format!(
                "Lead pré-qualificado ({}) buscando {} com idade de {} e tempo de contribuição de {}.",
                lead.status.badge_label(), ben_str, age_str, time_str
            ),
            priority: if lead.status == LeadQualificationStatus::QualifiedHighPriority {
                "ALTA".to_string()
            } else {
                "MÉDIA".to_string()
            },
            qualification_score: lead.qualification_score,
            required_documents: docs,
        }
    }
}

/// Mock determinístico do PrevidenciarioLlmTeacher para testes offline
pub struct MockPrevidenciarioLlmTeacher {
    pub canned_response: Option<String>,
    pub calls: std::sync::atomic::AtomicUsize,
}

impl Default for MockPrevidenciarioLlmTeacher {
    fn default() -> Self {
        Self {
            canned_response: None,
            calls: std::sync::atomic::AtomicUsize::new(0),
        }
    }
}

impl MockPrevidenciarioLlmTeacher {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_response(response: &str) -> Self {
        Self {
            canned_response: Some(response.to_string()),
            calls: std::sync::atomic::AtomicUsize::new(0),
        }
    }

    pub fn call_count(&self) -> usize {
        self.calls.load(std::sync::atomic::Ordering::Relaxed)
    }
}

#[async_trait]
impl PrevidenciarioLlmTeacher for MockPrevidenciarioLlmTeacher {
    async fn ask_legal_question(&self, _system_prompt: &str, user_prompt: &str) -> Result<String> {
        self.calls
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if let Some(resp) = &self.canned_response {
            return Ok(resp.clone());
        }

        let lower = user_prompt.to_lowercase();
        if lower.contains("pedagio") || lower.contains("pedágio") {
            Ok("A regra de transição do pedágio de 50% exige cumprimento de metade do tempo que faltava para se aposentar na data da Reforma (13/11/2019). Já o pedágio de 100% exige idade mínima (57 mulher / 60 homem) e o dobro do tempo faltante, garantindo aposentadoria com 100% da média salarial sem fator previdenciário.".to_string())
        } else if lower.contains("carencia") || lower.contains("carência") {
            Ok("Para a concessão de aposentadoria por idade urbana ou rural, a Lei 8.213/91 exige a carência mínima de 180 contribuições mensais (15 anos), além da idade mínima estabelecida na legislação previdenciária.".to_string())
        } else if lower.contains("insalubre") || lower.contains("especial") {
            Ok("O tempo trabalhado em atividade insalubre antes de 13/11/2019 pode ser convertido em tempo comum com acréscimo de 40% para homens e 20% para mulheres, antecipando a concessão da aposentadoria.".to_string())
        } else if lower.contains("dossiê") || lower.contains("lead") {
            Ok(serde_json::json!({
                "is_approved": true,
                "thesis_summary": "Tese sólida de Ação Previdenciária contra o INSS com atrasados a receber.",
                "recommended_action": "Solicitar cópia integral do processo administrativo do INSS e ingressar no Juizado Especial Federal.",
                "required_documents": [
                    "Cópia integral do processo administrativo do INSS",
                    "Extrato CNIS completo atualizado",
                    "Comprovante de residência",
                    "Documento oficial com foto (RG/CNH)"
                ]
            }).to_string())
        } else {
            Ok("Com base nas normas do INSS e na jurisprudência previdenciária, o segurado deve comprovar os requisitos legais de idade e carência documental.".to_string())
        }
    }
}

/// Helper leve de codificação de URL compatível com WhatsApp wa.me
fn urlencoding_simple(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for b in input.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            b' ' => out.push_str("%20"),
            b'\n' => out.push_str("%0A"),
            b'*' => out.push_str("%2A"),
            _ => {
                out.push_str(&format!("%{:02X}", b));
            }
        }
    }
    out
}

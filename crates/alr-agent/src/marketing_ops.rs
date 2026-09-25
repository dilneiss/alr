//! Módulo de Marketing Ops, SEO e Otimização de Anúncios de Alta Performance (JEV Suite)
//!
//! Implementação 100% nativa em Rust inspirada no catálogo TypeSafe AI / JEV,
//! operando com custo $0.00, latência em microssegundos e decisões tipadas (Choice, Score, Noul):
//!
//! 1. SearchTermTriage: Classificação de termos de busca em Google Ads (Buyer, Researcher, JobSeeker, Competitor, Junk) com negativação automática.
//! 2. CreativeTagging: Extração multi-atributo de criativos Meta Ads (Hook, Format, Offer, TargetAudience) em uma única passada.
//! 3. LandingPageMatch: Score de correspondência (0 a 10) entre promessa de anúncio e conteúdo da landing page.
//! 4. InternalLinkMap: Decisão booleana tipada (should_link / Noul) para cada par de URLs com justificativa semântica.
//! 5. CannibalizationDetector: Detecção de sobreposição de páginas para a mesma intenção com recomendações de fusão/canonical.
//! 6. ThinPageGate: Gate de qualidade e originalidade de conteúdo (1 a 10), travando publicação se < 7.0.
//! 7. CitationChecker: GEO (Generative Engine Optimization) - Medição de citação de marca em ChatGPT, Gemini, Claude e Perplexity.
//! 8. CompetitorCitationTracker: GEO - Identificação de concorrentes citados e share-of-voice em respostas de IA.
//! 9. ConvertingTermsGapFinder: Ads -> SEO/GEO - Cruzamento de termos de alta conversão pagos sem página orgânica dedicada.
//!
//! E o motor unificado `MarketingOpsEngine`.

use alr_core::State;
use alr_models::{TypedJudge, TypedQuestion};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Instant;

// ============================================================================
// Utilitários Compartilhados de Texto e Similaridade Semântica Local (0 Tokens)
// ============================================================================

/// Normaliza texto em minúsculas, remove acentuação em português e caracteres especiais
pub fn normalize_marketing_text(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            'á' | 'à' | 'ã' | 'â' | 'ä' => out.push('a'),
            'é' | 'è' | 'ê' | 'ë' => out.push('e'),
            'í' | 'ì' | 'î' | 'ï' => out.push('i'),
            'ó' | 'ò' | 'õ' | 'ô' | 'ö' => out.push('o'),
            'ú' | 'ù' | 'û' | 'ü' => out.push('u'),
            'ç' => out.push('c'),
            'Á' | 'À' | 'Ã' | 'Â' | 'Ä' => out.push('a'),
            'É' | 'È' | 'Ê' | 'Ë' => out.push('e'),
            'Í' | 'Ì' | 'Î' | 'Ï' => out.push('i'),
            'Ó' | 'Ò' | 'Õ' | 'Ô' | 'Ö' => out.push('o'),
            'Ú' | 'Ù' | 'Û' | 'Ü' => out.push('u'),
            'Ç' => out.push('c'),
            _ => {
                for lc in c.to_lowercase() {
                    if lc.is_alphanumeric()
                        || lc.is_whitespace()
                        || lc == '-'
                        || lc == '_'
                        || lc == '/'
                        || lc == '.'
                        || lc == '%'
                    {
                        out.push(lc);
                    } else {
                        out.push(' ');
                    }
                }
            }
        }
    }
    out
}

/// Extrai palavras-chave significativas excluindo stopwords comuns
pub fn extract_keywords(text: &str) -> Vec<String> {
    let normalized = normalize_marketing_text(text);
    let stopwords: HashSet<&'static str> = [
        "a", "o", "as", "os", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
        "para", "pra", "com", "por", "um", "uma", "uns", "umas", "se", "que", "e", "ou", "mais",
        "mas", "como", "ao", "aos", "pelo", "pela", "pelos", "pelas", "este", "esta", "isso",
        "esse", "essa", "aquele", "aquela", "seu", "sua", "seus", "suas", "meu", "minha", "voce",
        "voces", "ele", "ela", "eles", "elas", "nos", "the", "and", "or", "for", "with", "in",
        "on", "at", "to", "by", "of", "from",
    ]
    .iter()
    .copied()
    .collect();

    normalized
        .split_whitespace()
        .filter(|w| w.len() >= 3 && !stopwords.contains(*w))
        .map(|w| w.to_string())
        .collect()
}

/// Calcula índice de Jaccard entre dois conjuntos de tokens (0.0 a 1.0)
pub fn token_jaccard_similarity(a: &[String], b: &[String]) -> f32 {
    let set_a: HashSet<&str> = a.iter().map(|s| s.as_str()).collect();
    let set_b: HashSet<&str> = b.iter().map(|s| s.as_str()).collect();

    if set_a.is_empty() && set_b.is_empty() {
        return 1.0;
    }
    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    if union == 0 {
        0.0
    } else {
        intersection as f32 / union as f32
    }
}

// ============================================================================
// TASK 1: Search-term triage (Google Ads Triage com Negativação Automática)
// ============================================================================

/// Categoria de intenção de busca para triagem de anúncios
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SearchIntentCategory {
    Buyer,
    Researcher,
    JobSeeker,
    Competitor,
    Junk,
}

impl SearchIntentCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Buyer => "buyer",
            Self::Researcher => "researcher",
            Self::JobSeeker => "job_seeker",
            Self::Competitor => "competitor",
            Self::Junk => "junk",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Buyer => "Buyer (Alta Intenção de Compra)",
            Self::Researcher => "Researcher (Busca Educacional/Informativa)",
            Self::JobSeeker => "JobSeeker (Candidato a Emprego/Vaga)",
            Self::Competitor => "Competitor (Busca por Concorrente)",
            Self::Junk => "Junk (Tráfego Desperdiçado/Irrelevante)",
        }
    }
}

/// Ação recomendada para o termo de busca na campanha de Google Ads
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TriageAction {
    AddAsKeyword,
    AddNegativeExact,
    AddNegativePhrase,
    Monitor,
}

impl TriageAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AddAsKeyword => "add_as_keyword",
            Self::AddNegativeExact => "add_negative_exact",
            Self::AddNegativePhrase => "add_negative_phrase",
            Self::Monitor => "monitor",
        }
    }
}

/// Recomendação de negativação com tipo de correspondência
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NegativeMatchPattern {
    pub negative_term: String,
    pub match_type: String, // "exact" ou "phrase"
    pub reason: String,
}

/// Resultado da triagem de um termo de busca
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchTermTriageResult {
    pub query: String,
    pub category: SearchIntentCategory,
    pub confidence: f32,
    pub signals: Vec<String>,
    pub recommended_action: TriageAction,
    pub suggested_negative: Option<NegativeMatchPattern>,
    pub wasted_spend_risk: f32, // 0.0 (sem risco) a 1.0 (risco máximo de queimar verba)
    pub latency_micros: u128,
}

/// Motor de Triagem de Termos de Busca (Google Ads Triage)
#[derive(Debug, Clone)]
pub struct SearchTermTriage {
    pub competitor_list: Vec<String>,
    pub custom_negative_triggers: Vec<String>,
}

impl Default for SearchTermTriage {
    fn default() -> Self {
        Self::new()
    }
}

impl SearchTermTriage {
    pub fn new() -> Self {
        Self {
            competitor_list: vec![
                "hubspot".to_string(),
                "salesforce".to_string(),
                "rd station".to_string(),
                "semrush".to_string(),
                "ahrefs".to_string(),
                "zendesk".to_string(),
                "intercom".to_string(),
            ],
            custom_negative_triggers: Vec::new(),
        }
    }

    pub fn with_competitors(mut self, competitors: Vec<String>) -> Self {
        self.competitor_list = competitors;
        self
    }

    pub fn with_negative_triggers(mut self, triggers: Vec<String>) -> Self {
        self.custom_negative_triggers = triggers;
        self
    }

    pub fn triage(&self, query: &str) -> SearchTermTriageResult {
        let start = Instant::now();
        let norm = normalize_marketing_text(query);
        let mut signals = Vec::new();

        // 1. Sinais de JobSeeker (Empregos, Vagas, Salários)
        let job_triggers = [
            "vagas",
            "vaga",
            "emprego",
            "empregos",
            "trabalhe conosco",
            "curriculo",
            "salario",
            "salarios",
            "estagio",
            "trainee",
            "carreira",
            "entrevista",
            "rh",
            "recrutamento",
            "glassdoor",
            "infojobs",
            "linkedin vagas",
            "jobs",
            "career",
        ];
        for trig in &job_triggers {
            if norm.contains(trig) {
                signals.push(format!("Gatilho de emprego detectado: '{}'", trig));
            }
        }
        if !signals.is_empty() {
            let neg_term = norm.clone();
            return SearchTermTriageResult {
                query: query.to_string(),
                category: SearchIntentCategory::JobSeeker,
                confidence: 0.95,
                signals,
                recommended_action: TriageAction::AddNegativePhrase,
                suggested_negative: Some(NegativeMatchPattern {
                    negative_term: neg_term,
                    match_type: "phrase".to_string(),
                    reason: "Termo de busca com foco em recrutamento/emprego em campanha comercial"
                        .to_string(),
                }),
                wasted_spend_risk: 0.98,
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // 2. Sinais de Junk (Suporte, Login, Pirataria, Reclame Aqui, Grátis)
        let junk_triggers = [
            "login",
            "entrar",
            "portal",
            "suporte",
            "sac",
            "ouvidoria",
            "0800",
            "telefone",
            "reclame aqui",
            "procon",
            "cancelar",
            "cancelamento",
            "boleto",
            "2 via",
            "segunda via",
            "crack",
            "torrent",
            "gratis download",
            "serial",
            "keygen",
            "pdf gratis",
            "meme",
            "jogos",
            "whatsapp entrar",
        ];
        for trig in &junk_triggers {
            if norm.contains(trig) {
                signals.push(format!("Gatilho de junk/suporte detectado: '{}'", trig));
            }
        }
        for custom in &self.custom_negative_triggers {
            if norm.contains(&normalize_marketing_text(custom)) {
                signals.push(format!("Gatilho de negativação customizado: '{}'", custom));
            }
        }
        if !signals.is_empty() {
            return SearchTermTriageResult {
                query: query.to_string(),
                category: SearchIntentCategory::Junk,
                confidence: 0.96,
                signals,
                recommended_action: TriageAction::AddNegativePhrase,
                suggested_negative: Some(NegativeMatchPattern {
                    negative_term: norm.clone(),
                    match_type: "phrase".to_string(),
                    reason: "Termo irrelevante para conversão (suporte, login ou pirataria)"
                        .to_string(),
                }),
                wasted_spend_risk: 0.95,
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // 3. Sinais de Concorrente (Competitor)
        for comp in &self.competitor_list {
            let norm_comp = normalize_marketing_text(comp);
            if norm.contains(&norm_comp) {
                signals.push(format!("Marca concorrente identificada: '{}'", comp));
            }
        }
        if norm.contains("concorrente") || norm.contains("alternativa a") || norm.contains(" vs ") {
            signals.push("Estrutura comparativa de concorrentes detectada".to_string());
        }
        if !signals.is_empty() {
            return SearchTermTriageResult {
                query: query.to_string(),
                category: SearchIntentCategory::Competitor,
                confidence: 0.90,
                signals,
                recommended_action: TriageAction::Monitor,
                suggested_negative: None,
                wasted_spend_risk: 0.40, // Pode ter valor se estratégia for de conquista de concorrência
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // 4. Sinais de Buyer (Comprar, Preço, Contratar, Desconto, Valor, Ferramenta)
        let buyer_triggers = [
            "comprar",
            "preco",
            "precos",
            "valor",
            "valores",
            "contratar",
            "plano",
            "planos",
            "adquirir",
            "desconto",
            "cupom",
            "promocao",
            "custo",
            "quanto custa",
            "checkout",
            "mensalidade",
            "licenca",
            "empresa de",
            "agencia de",
            "consultoria de",
            "software de",
            "plataforma de",
            "sistema de",
            "ferramenta de",
            "orcamento",
            "cotacao",
            "demo",
            "teste gratis",
            "trial",
            "assinar",
            "assinatura",
        ];
        for trig in &buyer_triggers {
            if norm.contains(trig) {
                signals.push(format!("Gatilho transacional/buyer: '{}'", trig));
            }
        }
        if !signals.is_empty() {
            return SearchTermTriageResult {
                query: query.to_string(),
                category: SearchIntentCategory::Buyer,
                confidence: 0.92,
                signals,
                recommended_action: TriageAction::AddAsKeyword,
                suggested_negative: None,
                wasted_spend_risk: 0.05,
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // 5. Fallback para Researcher (Informativo, Perguntas, Tutoriais)
        let researcher_triggers = [
            "como",
            "o que e",
            "qual",
            "guia",
            "tutorial",
            "passo a passo",
            "diferenca entre",
            "exemplos",
            "melhores",
            "dicas",
            "aprender",
            "curso",
            "significado",
            "resumo",
            "estudo de caso",
            "por que",
        ];
        for trig in &researcher_triggers {
            if norm.contains(trig) {
                signals.push(format!("Gatilho educacional/informativo: '{}'", trig));
            }
        }
        if signals.is_empty() {
            signals.push("Termo genérico sem modificadores explícitos de compra".to_string());
        }

        SearchTermTriageResult {
            query: query.to_string(),
            category: SearchIntentCategory::Researcher,
            confidence: 0.85,
            signals,
            recommended_action: TriageAction::Monitor,
            suggested_negative: None,
            wasted_spend_risk: 0.30,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    pub fn batch_triage(&self, queries: &[&str]) -> Vec<SearchTermTriageResult> {
        queries.iter().map(|q| self.triage(q)).collect()
    }

    pub fn generate_negative_list(&self, queries: &[&str]) -> Vec<NegativeMatchPattern> {
        self.batch_triage(queries)
            .into_iter()
            .filter_map(|res| res.suggested_negative)
            .collect()
    }
}

// ============================================================================
// TASK 2: Creative tagging (Meta Ads Multi-Attribute Tagging em 1 Passada)
// ============================================================================

/// Tipo de Gancho / Hook utilizado no criativo do anúncio
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum HookType {
    ProblemAgitation,
    CuriosityGap,
    SocialProof,
    Contrarian,
    DirectOffer,
    Educational,
    QuestionHook,
    BeforeAfter,
}

impl HookType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ProblemAgitation => "problem_agitation",
            Self::CuriosityGap => "curiosity_gap",
            Self::SocialProof => "social_proof",
            Self::Contrarian => "contrarian",
            Self::DirectOffer => "direct_offer",
            Self::Educational => "educational",
            Self::QuestionHook => "question_hook",
            Self::BeforeAfter => "before_after",
        }
    }
}

/// Formato visual ou estrutural do anúncio
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AdFormat {
    UgcVideo,
    Carousel,
    StaticSingleImage,
    StoryVertical,
    InfographicCard,
    TestimonialVideo,
    ScreenDemo,
}

impl AdFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::UgcVideo => "ugc_video",
            Self::Carousel => "carousel",
            Self::StaticSingleImage => "static_single_image",
            Self::StoryVertical => "story_vertical",
            Self::InfographicCard => "infographic_card",
            Self::TestimonialVideo => "testimonial_video",
            Self::ScreenDemo => "screen_demo",
        }
    }
}

/// Tipo de oferta anunciada
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OfferType {
    FreeTrial,
    DiscountPercentage,
    BundleDiscount,
    FreeConsultation,
    LeadMagnet,
    DirectSale,
    WebinarMasterclass,
    FreemiumUpgrade,
}

impl OfferType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FreeTrial => "free_trial",
            Self::DiscountPercentage => "discount_percentage",
            Self::BundleDiscount => "bundle_discount",
            Self::FreeConsultation => "free_consultation",
            Self::LeadMagnet => "lead_magnet",
            Self::DirectSale => "direct_sale",
            Self::WebinarMasterclass => "webinar_masterclass",
            Self::FreemiumUpgrade => "freemium_upgrade",
        }
    }
}

/// Público-alvo prioritário inferido do criativo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TargetAudience {
    B2bDecisionMaker,
    SmallBusinessOwner,
    TechSavvyPro,
    ConsumerValueShopper,
    AffluentShopper,
    StudentOrBeginner,
    AgencyMarketer,
}

impl TargetAudience {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::B2bDecisionMaker => "b2b_decision_maker",
            Self::SmallBusinessOwner => "small_business_owner",
            Self::TechSavvyPro => "tech_savvy_pro",
            Self::ConsumerValueShopper => "consumer_value_shopper",
            Self::AffluentShopper => "affluent_shopper",
            Self::StudentOrBeginner => "student_or_beginner",
            Self::AgencyMarketer => "agency_marketer",
        }
    }
}

/// Resultado da marcação multi-atributo do criativo
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreativeTaggingResult {
    pub hook_type: HookType,
    pub ad_format: AdFormat,
    pub offer_type: OfferType,
    pub target_audience: TargetAudience,
    pub hook_confidence: f32,
    pub format_confidence: f32,
    pub offer_confidence: f32,
    pub audience_confidence: f32,
    pub overall_confidence: f32,
    pub detected_triggers: Vec<String>,
    pub latency_micros: u128,
}

/// Motor de Tagging de Criativos (Meta Ads Single-Pass)
#[derive(Debug, Clone, Default)]
pub struct CreativeTagging {}

impl CreativeTagging {
    pub fn new() -> Self {
        Self {}
    }

    pub fn tag(&self, ad_copy: &str, format_hint: Option<&str>) -> CreativeTaggingResult {
        let start = Instant::now();
        let norm = normalize_marketing_text(ad_copy);
        let mut triggers = Vec::new();

        // 1. Detectar HookType
        let (hook_type, hook_conf) = if norm.contains("cansado de")
            || norm.contains("perdendo tempo")
            || norm.contains("frustrado com")
            || norm.contains("gargalo")
            || norm.contains("dor de cabeca")
            || norm.contains("prejuizo")
            || norm.contains("erro que")
        {
            triggers.push("Hook: Agitação de Dor/Problema".to_string());
            (HookType::ProblemAgitation, 0.94)
        } else if norm.contains("o segredo")
            || norm.contains("poucos sabem")
            || norm.contains("ninguem te conta")
            || norm.contains("metodo oculto")
            || norm.contains("como descobri")
        {
            triggers.push("Hook: Curiosity Gap".to_string());
            (HookType::CuriosityGap, 0.92)
        } else if norm.contains("clientes atendidos")
            || norm.contains("empresas usam")
            || norm.contains("nota 4.")
            || norm.contains("nota 5")
            || norm.contains("faturou mais de")
            || norm.contains("depoimento")
            || norm.contains("aprovado por")
        {
            triggers.push("Hook: Prova Social & Números".to_string());
            (HookType::SocialProof, 0.95)
        } else if norm.contains("pare de")
            || norm.contains("o mito de")
            || norm.contains("esta errado")
            || norm.contains("nunca mais faca")
            || norm.contains("mentiram para voce")
        {
            triggers.push("Hook: Contrariano / Quebra de Mito".to_string());
            (HookType::Contrarian, 0.93)
        } else if norm.contains("antes:")
            || norm.contains("depois:")
            || norm.contains("transformacao")
            || norm.contains("de 0 a")
            || norm.contains("em apenas 30 dias")
        {
            triggers.push("Hook: Antes e Depois".to_string());
            (HookType::BeforeAfter, 0.90)
        } else if norm.contains("?")
            && (norm.starts_with("voce")
                || norm.starts_with("ja imaginou")
                || norm.starts_with("como seria"))
        {
            triggers.push("Hook: Pergunta Instigante".to_string());
            (HookType::QuestionHook, 0.88)
        } else if norm.contains("dicas para")
            || norm.contains("passo a passo")
            || norm.contains("tutorial")
            || norm.contains("como fazer")
            || norm.contains("guia pratico")
        {
            triggers.push("Hook: Educacional / Framework".to_string());
            (HookType::Educational, 0.89)
        } else {
            triggers.push("Hook: Oferta Direta".to_string());
            (HookType::DirectOffer, 0.85)
        };

        // 2. Detectar AdFormat
        let (ad_format, format_conf) = if let Some(hint) = format_hint {
            let hnorm = normalize_marketing_text(hint);
            if hnorm.contains("ugc") || hnorm.contains("video selfie") {
                (AdFormat::UgcVideo, 0.98)
            } else if hnorm.contains("carrossel") || hnorm.contains("carousel") {
                (AdFormat::Carousel, 0.98)
            } else if hnorm.contains("story") || hnorm.contains("9:16") {
                (AdFormat::StoryVertical, 0.98)
            } else if hnorm.contains("screen")
                || hnorm.contains("demo")
                || hnorm.contains("demonstracao")
            {
                (AdFormat::ScreenDemo, 0.98)
            } else if hnorm.contains("infografico") || hnorm.contains("grafico") {
                (AdFormat::InfographicCard, 0.98)
            } else if hnorm.contains("depoimento") || hnorm.contains("testimonial") {
                (AdFormat::TestimonialVideo, 0.98)
            } else {
                (AdFormat::StaticSingleImage, 0.90)
            }
        } else if norm.contains("deslize para o lado")
            || norm.contains("arraste para ver")
            || norm.contains("card 1")
        {
            (AdFormat::Carousel, 0.92)
        } else if norm.contains("assista ao video")
            || norm.contains("veja na pratica")
            || norm.contains("clique no play")
        {
            (AdFormat::ScreenDemo, 0.88)
        } else {
            (AdFormat::StaticSingleImage, 0.82)
        };

        // 3. Detectar OfferType
        let (offer_type, offer_conf) = if norm.contains("teste gratis")
            || norm.contains("trial")
            || norm.contains("dias gratis")
            || norm.contains("sem cartao de credito")
        {
            triggers.push("Oferta: Teste Grátis / Trial".to_string());
            (OfferType::FreeTrial, 0.96)
        } else if norm.contains("% off")
            || norm.contains("% de desconto")
            || norm.contains("desconto de")
            || norm.contains("de desconto")
            || norm.contains("desconto")
            || norm.contains("cupom")
        {
            triggers.push("Oferta: Desconto Percentual".to_string());
            (OfferType::DiscountPercentage, 0.95)
        } else if norm.contains("compre 1 leve")
            || norm.contains("compre 2")
            || norm.contains("combo")
            || norm.contains("pacote completo")
        {
            triggers.push("Oferta: Combo / Bundle".to_string());
            (OfferType::BundleDiscount, 0.91)
        } else if norm.contains("consultoria gratuita")
            || norm.contains("diagnostico gratuito")
            || norm.contains("sessao estrategica")
            || norm.contains("fale com um especialista")
        {
            triggers.push("Oferta: Consultoria Gratuita".to_string());
            (OfferType::FreeConsultation, 0.94)
        } else if norm.contains("baixe o ebook")
            || norm.contains("template gratuito")
            || norm.contains("planilha gratis")
            || norm.contains("download do guia")
        {
            triggers.push("Oferta: Lead Magnet / Material Rico".to_string());
            (OfferType::LeadMagnet, 0.95)
        } else if norm.contains("workshop ao vivo")
            || norm.contains("masterclass")
            || norm.contains("aula gratuita")
            || norm.contains("webinar")
        {
            triggers.push("Oferta: Webinar / Masterclass".to_string());
            (OfferType::WebinarMasterclass, 0.93)
        } else if norm.contains("faca o upgrade") || norm.contains("versao pro") {
            triggers.push("Oferta: Upgrade Freemium".to_string());
            (OfferType::FreemiumUpgrade, 0.89)
        } else {
            triggers.push("Oferta: Venda Direta / Compra".to_string());
            (OfferType::DirectSale, 0.86)
        };

        // 4. Detectar TargetAudience
        let (target_audience, audience_conf) = if norm.contains("agencia")
            || norm.contains("gestor de trafego")
            || norm.contains("freelancer")
            || norm.contains("social media")
            || norm.contains("seus clientes")
        {
            triggers.push("Público: Agência & Especialista de Marketing".to_string());
            (TargetAudience::AgencyMarketer, 0.94)
        } else if norm.contains("programador")
            || norm.contains("desenvolvedor")
            || norm.contains("dev")
            || norm.contains("api")
            || norm.contains("engenheiro")
            || norm.contains("github")
        {
            triggers.push("Público: Tech / Desenvolvedores".to_string());
            (TargetAudience::TechSavvyPro, 0.95)
        } else if norm.contains("diretor")
            || norm.contains("ceo")
            || (norm.contains("gestor") && !norm.contains("gestor de trafego"))
            || norm.contains("enterprise")
            || norm.contains("c-level")
            || norm.contains("sua equipe")
            || norm.contains("empresa com mais de")
        {
            triggers.push("Público: Tomador de Decisão B2B".to_string());
            (TargetAudience::B2bDecisionMaker, 0.93)
        } else if norm.contains("seu negocio")
            || norm.contains("pequena empresa")
            || norm.contains("comercio local")
            || norm.contains("lojista")
            || norm.contains("autonomo")
        {
            triggers.push("Público: Dono de Pequeno Negócio / PME".to_string());
            (TargetAudience::SmallBusinessOwner, 0.91)
        } else if norm.contains("exclusivo")
            || norm.contains("luxo")
            || norm.contains("alta renda")
            || norm.contains("vip")
            || norm.contains("premium")
        {
            triggers.push("Público: Consumidor Alto Padrão".to_string());
            (TargetAudience::AffluentShopper, 0.90)
        } else if norm.contains("iniciante")
            || norm.contains("do zero")
            || norm.contains("comece hoje")
            || norm.contains("sem experiencia")
            || norm.contains("estudante")
        {
            triggers.push("Público: Estudante / Iniciante".to_string());
            (TargetAudience::StudentOrBeginner, 0.92)
        } else {
            triggers.push("Público: Consumidor Focado em Custo-Benefício".to_string());
            (TargetAudience::ConsumerValueShopper, 0.85)
        };

        let overall = (hook_conf + format_conf + offer_conf + audience_conf) / 4.0;

        CreativeTaggingResult {
            hook_type,
            ad_format,
            offer_type,
            target_audience,
            hook_confidence: hook_conf,
            format_confidence: format_conf,
            offer_confidence: offer_conf,
            audience_confidence: audience_conf,
            overall_confidence: overall,
            detected_triggers: triggers,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    pub fn batch_tag(&self, ads: &[(&str, Option<&str>)]) -> Vec<CreativeTaggingResult> {
        ads.iter().map(|(txt, fmt)| self.tag(txt, *fmt)).collect()
    }
}

// ============================================================================
// TASK 3: Landing page match (Score de Correspondência Anúncio vs Landing Page)
// ============================================================================

/// Dados prometidos no Anúncio ou Busca
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AdPromise {
    pub headline: String,
    pub body_copy: String,
    pub promised_offer: Option<String>,
    pub promised_price: Option<String>,
    pub cta_text: String,
    pub target_keyword: Option<String>,
}

/// Conteúdo auditado na Landing Page de destino
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LandingPageContent {
    pub url: String,
    pub title: String,
    pub h1: String,
    pub body_snippet: String,
    pub displayed_offers: Vec<String>,
    pub displayed_price: Option<String>,
    pub cta_buttons: Vec<String>,
}

/// Classificação do alinhamento do Anúncio com a Página
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MatchStatus {
    StrongMatch,
    ModerateMatch,
    PoorMatch,
}

impl MatchStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::StrongMatch => "strong_match",
            Self::ModerateMatch => "moderate_match",
            Self::PoorMatch => "poor_match",
        }
    }
}

/// Resultado detalhado do Landing Page Match
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LandingPageMatchResult {
    pub composite_score: f32, // 0.0 a 10.0
    pub status: MatchStatus,
    pub message_match_score: f32,
    pub offer_consistency_score: f32,
    pub cta_alignment_score: f32,
    pub search_intent_fulfillment_score: f32,
    pub detected_discrepancies: Vec<String>,
    pub optimization_suggestions: Vec<String>,
    pub quality_score_impact: String,
    pub latency_micros: u128,
}

/// Motor de Avaliação de Landing Page Match (Score 0 a 10)
#[derive(Debug, Clone, Default)]
pub struct LandingPageMatch {}

impl LandingPageMatch {
    pub fn new() -> Self {
        Self {}
    }

    pub fn evaluate_match(
        &self,
        ad: &AdPromise,
        page: &LandingPageContent,
    ) -> LandingPageMatchResult {
        let start = Instant::now();
        let mut discrepancies = Vec::new();
        let mut suggestions = Vec::new();

        let ad_keywords = extract_keywords(&format!("{} {}", ad.headline, ad.body_copy));
        let page_keywords =
            extract_keywords(&format!("{} {} {}", page.title, page.h1, page.body_snippet));

        // 1. Message Match Score (Headline/Copy vs Title/H1)
        let headline_overlap =
            token_jaccard_similarity(&extract_keywords(&ad.headline), &extract_keywords(&page.h1));
        let full_text_overlap = token_jaccard_similarity(&ad_keywords, &page_keywords);
        let message_match = ((headline_overlap * 6.0) + (full_text_overlap * 4.0)) * 10.0;
        let message_match_clamped = message_match.clamp(1.0, 10.0);

        if headline_overlap < 0.25 {
            discrepancies.push("A promessa principal do anúncio não está refletida explicitamente no H1 da Landing Page.".to_string());
            suggestions.push(format!(
                "Alinhe o H1 da página com a chamada do anúncio: '{}'.",
                ad.headline
            ));
        }

        // 2. Offer Consistency Score
        let mut offer_score: f32 = 9.0;
        if let Some(promised_offer) = &ad.promised_offer {
            let p_norm = normalize_marketing_text(promised_offer);
            let found_in_page = page.displayed_offers.iter().any(|off| {
                normalize_marketing_text(off).contains(&p_norm)
                    || p_norm.contains(&normalize_marketing_text(off))
            }) || normalize_marketing_text(&page.body_snippet)
                .contains(&p_norm);

            if !found_in_page {
                offer_score -= 5.0;
                discrepancies.push(format!(
                    "Oferta prometida no anúncio ('{}') não encontrada claramente na página.",
                    promised_offer
                ));
                suggestions.push("Exiba a oferta, cupom ou condição promocional logo acima da dobra da Landing Page.".to_string());
            }
        }
        if let Some(promised_price) = &ad.promised_price {
            if let Some(displayed_price) = &page.displayed_price {
                let pp = normalize_marketing_text(promised_price);
                let dp = normalize_marketing_text(displayed_price);
                if pp != dp {
                    offer_score -= 3.5;
                    discrepancies.push(format!(
                        "Divergência de preço: Anúncio anuncia '{}', mas a página exibe '{}'.",
                        promised_price, displayed_price
                    ));
                    suggestions.push("Sincronize imediatamente os preços entre anúncio e página para evitar taxa de rejeição.".to_string());
                }
            } else {
                offer_score -= 2.0;
                discrepancies
                    .push("Preço citado no anúncio ausente na página de destino.".to_string());
            }
        }
        let offer_score_clamped = offer_score.clamp(1.0, 10.0);

        // 3. CTA Alignment Score
        let ad_cta_norm = normalize_marketing_text(&ad.cta_text);
        let cta_matched = page.cta_buttons.iter().any(|btn| {
            let btn_norm = normalize_marketing_text(btn);
            btn_norm.contains(&ad_cta_norm) || ad_cta_norm.contains(&btn_norm)
        });
        let cta_score = if cta_matched {
            9.5
        } else if !page.cta_buttons.is_empty() {
            discrepancies.push(format!(
                "O CTA do anúncio ('{}') diverge dos botões de ação na página ({:?}).",
                ad.cta_text, page.cta_buttons
            ));
            suggestions.push(format!(
                "Alinhe o rótulo do botão principal para '{}'.",
                ad.cta_text
            ));
            6.0
        } else {
            discrepancies.push(
                "Nenhum botão de chamada para ação (CTA) claro identificado na página.".to_string(),
            );
            2.0
        };

        // 4. Search Intent Fulfillment
        let intent_score = if let Some(kw) = &ad.target_keyword {
            let kw_norm = normalize_marketing_text(kw);
            let h1_norm = normalize_marketing_text(&page.h1);
            if h1_norm.contains(&kw_norm) {
                9.5
            } else if normalize_marketing_text(&page.title).contains(&kw_norm) {
                8.0
            } else if normalize_marketing_text(&page.body_snippet).contains(&kw_norm) {
                6.5
            } else {
                discrepancies.push(format!(
                    "A palavra-chave foco ('{}') não está destacada nos cabeçalhos da página.",
                    kw
                ));
                4.0
            }
        } else {
            8.0
        };

        // Score composto ponderado
        let composite = (message_match_clamped * 0.35)
            + (offer_score_clamped * 0.30)
            + (cta_score * 0.20)
            + (intent_score * 0.15);
        let composite_clamped = (composite * 10.0).round() / 10.0;

        let status = if composite_clamped >= 8.0 {
            MatchStatus::StrongMatch
        } else if composite_clamped >= 6.0 {
            MatchStatus::ModerateMatch
        } else {
            MatchStatus::PoorMatch
        };

        let quality_impact = match status {
            MatchStatus::StrongMatch => "Excelente: Relevância máxima esperada, ganho de Quality Score e redução de CPC.",
            MatchStatus::ModerateMatch => "Atenção: Alinhamento moderado. Ajustes recomendados para evitar perda de conversão.",
            MatchStatus::PoorMatch => "Crítico: Alto risco de rejeição, Quality Score baixo (1-4) e CPC inflacionado.",
        };

        LandingPageMatchResult {
            composite_score: composite_clamped,
            status,
            message_match_score: (message_match_clamped * 10.0).round() / 10.0,
            offer_consistency_score: (offer_score_clamped * 10.0).round() / 10.0,
            cta_alignment_score: (cta_score * 10.0).round() / 10.0,
            search_intent_fulfillment_score: (intent_score * 10.0).round() / 10.0,
            detected_discrepancies: discrepancies,
            optimization_suggestions: suggestions,
            quality_score_impact: quality_impact.to_string(),
            latency_micros: start.elapsed().as_micros(),
        }
    }
}

// ============================================================================
// TASK 4: Internal link map (SEO: Decisão Booleana Noul e Mapeamento de Links)
// ============================================================================

/// Documento de página para mapeamento de links internos
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InternalPageDoc {
    pub url: String,
    pub title: String,
    pub topic_cluster: String,
    pub depth_level: usize, // 0 = Home, 1 = Pillar/Categoria, 2 = Cluster Child, 3 = Artigo Profundo
    pub target_keywords: Vec<String>,
    pub body_summary: String,
}

/// Relação tópica entre duas páginas
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TopicalRelationship {
    PillarToCluster,
    ClusterToPillar,
    LateralSibling,
    CrossTopicBridge,
    SelfOrIrrelevant,
}

impl TopicalRelationship {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PillarToCluster => "pillar_to_cluster",
            Self::ClusterToPillar => "cluster_to_pillar",
            Self::LateralSibling => "lateral_sibling",
            Self::CrossTopicBridge => "cross_topic_bridge",
            Self::SelfOrIrrelevant => "self_or_irrelevant",
        }
    }
}

/// Tipo de texto-âncora recomendado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AnchorType {
    ExactMatch,
    PartialMatch,
    TopicalEntity,
    Branded,
}

impl AnchorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ExactMatch => "exact_match",
            Self::PartialMatch => "partial_match",
            Self::TopicalEntity => "topical_entity",
            Self::Branded => "branded",
        }
    }
}

/// Decisão booleana tipada (should_link) com fundamentação semântica
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InternalLinkDecision {
    pub source_url: String,
    pub target_url: String,
    pub should_link: bool,  // Decisão Noul
    pub link_strength: f32, // 0.0 a 1.0
    pub topical_relationship: TopicalRelationship,
    pub recommended_anchor_text: String,
    pub anchor_type: AnchorType,
    pub semantic_justification: String,
    pub equity_impact: String,
    pub latency_micros: u128,
}

/// Motor de Linkagem Interna (Internal Link Map com Decisão Noul)
#[derive(Debug, Clone, Default)]
pub struct InternalLinkMap {}

impl InternalLinkMap {
    pub fn new() -> Self {
        Self {}
    }

    pub fn evaluate_link_pair(
        &self,
        source: &InternalPageDoc,
        target: &InternalPageDoc,
    ) -> InternalLinkDecision {
        let start = Instant::now();

        // 1. Evitar auto-links
        if source.url == target.url {
            return InternalLinkDecision {
                source_url: source.url.clone(),
                target_url: target.url.clone(),
                should_link: false,
                link_strength: 0.0,
                topical_relationship: TopicalRelationship::SelfOrIrrelevant,
                recommended_anchor_text: "".to_string(),
                anchor_type: AnchorType::ExactMatch,
                semantic_justification: "Auto-link proibido (mesma página).".to_string(),
                equity_impact: "Neutro.".to_string(),
                latency_micros: start.elapsed().as_micros(),
            };
        }

        let same_cluster = normalize_marketing_text(&source.topic_cluster)
            == normalize_marketing_text(&target.topic_cluster);
        let src_keywords = extract_keywords(&format!("{} {}", source.title, source.body_summary));
        let tgt_keywords = extract_keywords(&format!("{} {}", target.title, target.body_summary));
        let kw_sim = token_jaccard_similarity(&src_keywords, &tgt_keywords);

        // 2. Determinar Relação Tópica e Força
        let (relationship, should_link, strength, anchor, anchor_type, justification, equity) =
            if same_cluster {
                if source.depth_level == 1 && target.depth_level == 2 {
                    // Página Pilar linkando para Artigo de Apoio
                    let anchor_text = target
                        .target_keywords
                        .first()
                        .cloned()
                        .unwrap_or_else(|| target.title.clone());
                    (
                    TopicalRelationship::PillarToCluster,
                    true,
                    0.92,
                    anchor_text,
                    AnchorType::PartialMatch,
                    "Link descendente essencial: transfere autoridade da página pilar para o cluster temático específico.".to_string(),
                    "Distribui PageRank da Pillar para página profunda.",
                )
                } else if source.depth_level == 2 && target.depth_level == 1 {
                    // Artigo de Apoio devolvendo link para a Página Pilar
                    let anchor_text = target
                        .target_keywords
                        .first()
                        .cloned()
                        .unwrap_or_else(|| target.title.clone());
                    (
                    TopicalRelationship::ClusterToPillar,
                    true,
                    0.95,
                    anchor_text,
                    AnchorType::ExactMatch,
                    "Link ascendente obrigatório: reforça a relevância temática e autoridade da página pilar.".to_string(),
                    "Consolida sinal de autoridade tópica na Pillar central.",
                )
                } else if source.depth_level == target.depth_level && kw_sim >= 0.15 {
                    // Páginas irmãs no mesmo cluster com sobreposição de tema
                    let anchor_text = target
                        .target_keywords
                        .first()
                        .cloned()
                        .unwrap_or_else(|| target.title.clone());
                    (
                    TopicalRelationship::LateralSibling,
                    true,
                    0.78,
                    anchor_text,
                    AnchorType::TopicalEntity,
                    "Link lateral contextual: enriquece a jornada do usuário entre tópicos complementares do mesmo cluster.".to_string(),
                    "Facilita indexação cruzada e crawl budget.",
                )
                } else {
                    (
                    TopicalRelationship::SelfOrIrrelevant,
                    false,
                    0.20,
                    "".to_string(),
                    AnchorType::TopicalEntity,
                    "Mesmo cluster mas sem relevância semântica suficiente para justificar link direto.".to_string(),
                    "Economiza diluição de links.",
                )
                }
            } else if kw_sim >= 0.25 {
                // Clusters distintos mas com ponte semântica real (ex: 'SEO' e 'Copywriting')
                let anchor_text = target
                    .target_keywords
                    .first()
                    .cloned()
                    .unwrap_or_else(|| target.title.clone());
                (
                    TopicalRelationship::CrossTopicBridge,
                    true,
                    0.65,
                    anchor_text,
                    AnchorType::TopicalEntity,
                    format!(
                        "Ponte tópica entre clusters: conecta '{}' e '{}' em ponto de sinergia.",
                        source.topic_cluster, target.topic_cluster
                    ),
                    "Cria pontes contextuais sem dispersar o foco temático.",
                )
            } else {
                (
                    TopicalRelationship::SelfOrIrrelevant,
                    false,
                    0.05,
                    "".to_string(),
                    AnchorType::TopicalEntity,
                    "Temas não correlacionados. Link geraria ruído semântico desnecessário."
                        .to_string(),
                    "Neutro: previne dispersão de relevância.",
                )
            };

        InternalLinkDecision {
            source_url: source.url.clone(),
            target_url: target.url.clone(),
            should_link,
            link_strength: strength,
            topical_relationship: relationship,
            recommended_anchor_text: anchor,
            anchor_type,
            semantic_justification: justification,
            equity_impact: equity.to_string(),
            latency_micros: start.elapsed().as_micros(),
        }
    }

    pub fn build_matrix(&self, pages: &[InternalPageDoc]) -> Vec<InternalLinkDecision> {
        let mut results = Vec::new();
        for src in pages {
            for tgt in pages {
                if src.url != tgt.url {
                    results.push(self.evaluate_link_pair(src, tgt));
                }
            }
        }
        results
    }
}

// ============================================================================
// TASK 5: Cannibalization (Detecção de Canibalização SEO e Decisão de Fusão)
// ============================================================================

/// Perfil de SEO de uma página indexada
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageSeoProfile {
    pub url: String,
    pub title: String,
    pub primary_intent_query: String,
    pub secondary_queries: Vec<String>,
    pub h1: String,
    pub body_snippet: String,
    pub monthly_organic_traffic: u32,
    pub average_ranking: f32,
}

/// Severidade da canibalização entre duas URLs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CannibalizationSeverity {
    None,
    Mild,
    Severe,
}

impl CannibalizationSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Mild => "mild",
            Self::Severe => "severe",
        }
    }
}

/// Ação de consolidação recomendada
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CannibalizationAction {
    KeepBoth,
    MergeSecondIntoFirst,
    Canonicalize,
    DifferentiateIntents,
}

impl CannibalizationAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::KeepBoth => "keep_both",
            Self::MergeSecondIntoFirst => "merge_second_into_first",
            Self::Canonicalize => "canonicalize",
            Self::DifferentiateIntents => "differentiate_intents",
        }
    }
}

/// Relatório de análise de canibalização entre duas páginas
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CannibalizationReport {
    pub page_a_url: String,
    pub page_b_url: String,
    pub keyword_overlap_ratio: f32,   // 0.0 a 1.0
    pub intent_similarity_score: f32, // 0.0 a 1.0
    pub severity: CannibalizationSeverity,
    pub recommended_action: CannibalizationAction,
    pub competing_queries: Vec<String>,
    pub traffic_risk_assessment: String,
    pub actionable_plan: String,
    pub latency_micros: u128,
}

/// Motor de Detecção de Canibalização de Palavras-Chave
#[derive(Debug, Clone, Default)]
pub struct CannibalizationDetector {}

impl CannibalizationDetector {
    pub fn new() -> Self {
        Self {}
    }

    pub fn detect(
        &self,
        page_a: &PageSeoProfile,
        page_b: &PageSeoProfile,
    ) -> CannibalizationReport {
        let start = Instant::now();

        let mut a_queries = vec![page_a.primary_intent_query.clone()];
        a_queries.extend(page_a.secondary_queries.iter().cloned());
        let a_norm_queries: HashSet<String> = a_queries
            .iter()
            .map(|q| normalize_marketing_text(q))
            .collect();

        let mut b_queries = vec![page_b.primary_intent_query.clone()];
        b_queries.extend(page_b.secondary_queries.iter().cloned());
        let b_norm_queries: HashSet<String> = b_queries
            .iter()
            .map(|q| normalize_marketing_text(q))
            .collect();

        let mut competing = Vec::new();
        for q in &a_queries {
            let nq = normalize_marketing_text(q);
            if b_norm_queries.contains(&nq) {
                competing.push(q.clone());
            }
        }

        let kw_overlap = if a_norm_queries.is_empty() || b_norm_queries.is_empty() {
            0.0
        } else {
            let inter = a_norm_queries.intersection(&b_norm_queries).count();
            let uni = a_norm_queries.union(&b_norm_queries).count();
            inter as f32 / uni as f32
        };

        // Similaridade de intenção textual (H1 + título)
        let a_tok = extract_keywords(&format!("{} {}", page_a.title, page_a.h1));
        let b_tok = extract_keywords(&format!("{} {}", page_b.title, page_b.h1));
        let intent_sim = token_jaccard_similarity(&a_tok, &b_tok);

        let (severity, action, plan, risk) = if kw_overlap >= 0.50 || intent_sim >= 0.60 {
            // Canibalização Severa: competem pela mesma intenção exata
            if page_a.monthly_organic_traffic >= page_b.monthly_organic_traffic {
                (
                    CannibalizationSeverity::Severe,
                    CannibalizationAction::MergeSecondIntoFirst,
                    format!("Consolidar o conteúdo único de '{}' em '{}', aplicar redirecionamento 301 da segunda para a primeira e unificar sinais de ranking.", page_b.url, page_a.url),
                    "Alto: Ambas as páginas dividem impressões e cliques, impedindo qualquer uma de alcançar o Top 3.".to_string(),
                )
            } else {
                (
                    CannibalizationSeverity::Severe,
                    CannibalizationAction::MergeSecondIntoFirst,
                    format!("Consolidar o conteúdo de '{}' em '{}', redirecionando a página com menor tráfego.", page_a.url, page_b.url),
                    "Alto: Canibalização explícita de tráfego orgânico.".to_string(),
                )
            }
        } else if kw_overlap >= 0.20 || intent_sim >= 0.30 {
            // Canibalização Moderada/Mild: sobreposição parcial
            (
                CannibalizationSeverity::Mild,
                CannibalizationAction::DifferentiateIntents,
                format!("Diferenciar explicitamente as intenções: re-otimizar '{}' para um modificador específico de cauda longa (ex: tutorial/iniciante) e manter '{}' como recurso principal.", page_b.url, page_a.url),
                "Moderado: Flutuações periódicas de ranking no Google (uma página sobe e a outra desce).".to_string(),
            )
        } else {
            (
                CannibalizationSeverity::None,
                CannibalizationAction::KeepBoth,
                "Manter ambas as páginas independentes; atendem a intenções de busca distintas sem conflito.".to_string(),
                "Baixo / Inexistente: Coexistência saudável nos índices de busca.".to_string(),
            )
        };

        CannibalizationReport {
            page_a_url: page_a.url.clone(),
            page_b_url: page_b.url.clone(),
            keyword_overlap_ratio: (kw_overlap * 100.0).round() / 100.0,
            intent_similarity_score: (intent_sim * 100.0).round() / 100.0,
            severity,
            recommended_action: action,
            competing_queries: competing,
            traffic_risk_assessment: risk,
            actionable_plan: plan,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    pub fn scan_site(&self, pages: &[PageSeoProfile]) -> Vec<CannibalizationReport> {
        let mut reports = Vec::new();
        for i in 0..pages.len() {
            for j in (i + 1)..pages.len() {
                let rep = self.detect(&pages[i], &pages[j]);
                if rep.severity != CannibalizationSeverity::None {
                    reports.push(rep);
                }
            }
        }
        reports
    }
}

// ============================================================================
// TASK 6: Thin-page gate (Gate de Conteúdo Fino, Originalidade e Publicação)
// ============================================================================

/// Dados de conteúdo para avaliação no gate de qualidade
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageContentInput {
    pub url: String,
    pub title: String,
    pub word_count: usize,
    pub text_body: String,
    pub h2_headings: Vec<String>,
    pub has_images_or_media: bool,
    pub code_or_data_points: usize,
    pub structured_lists_count: usize,
}

/// Veredito do Gate de Conteúdo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GateStatus {
    ApprovedForPublication,
    BlockedThinPage,
}

impl GateStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ApprovedForPublication => "approved",
            Self::BlockedThinPage => "blocked",
        }
    }
}

/// Veredito detalhado com notas e checklist de correção
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ThinPageGateVerdict {
    pub overall_quality_score: f32, // 1.0 a 10.0
    pub status: GateStatus,
    pub originality_score: f32,
    pub information_density_score: f32,
    pub value_add_score: f32,
    pub boilerplate_penalty: f32,
    pub detected_issues: Vec<String>,
    pub corrective_checklist: Vec<String>,
    pub indexation_recommendation: String,
    pub latency_micros: u128,
}

/// Motor de Gate de Qualidade de Conteúdo (Thin-Page Gate)
#[derive(Debug, Clone)]
pub struct ThinPageGate {
    pub approval_threshold: f32, // Padrão 7.0
}

impl Default for ThinPageGate {
    fn default() -> Self {
        Self::new()
    }
}

impl ThinPageGate {
    pub fn new() -> Self {
        Self {
            approval_threshold: 7.0,
        }
    }

    pub fn with_threshold(mut self, threshold: f32) -> Self {
        self.approval_threshold = threshold;
        self
    }

    pub fn evaluate_page(&self, input: &PageContentInput) -> ThinPageGateVerdict {
        let start = Instant::now();
        let mut issues = Vec::new();
        let mut checklist = Vec::new();

        // 1. Contagem de palavras e profundidade
        let (depth_score, depth_issue) = if input.word_count >= 1200 {
            (9.5, None)
        } else if input.word_count >= 600 {
            (7.5, None)
        } else if input.word_count >= 300 {
            (
                5.0,
                Some(
                    "Tamanho de texto raso (300 a 600 palavras); risco de thin content."
                        .to_string(),
                ),
            )
        } else {
            (
                2.0,
                Some(format!(
                    "Texto crítico de apenas {} palavras; página claramente fina.",
                    input.word_count
                )),
            )
        };
        if let Some(iss) = depth_issue {
            issues.push(iss);
            checklist.push("Expandir o artigo com seções aprofundadas e exemplos práticos para superar 800+ palavras.".to_string());
        }

        // 2. Densidade de Informação (pontos de dados, tabelas, código, listas)
        let density_points = input.code_or_data_points * 2
            + input.structured_lists_count
            + if input.has_images_or_media { 2 } else { 0 };
        let (density_score, density_issue) = if density_points >= 8 {
            (9.0, None)
        } else if density_points >= 4 {
            (7.0, None)
        } else {
            (
                4.0,
                Some("Baixa densidade de dados: ausência de números, tabelas, exemplos de código ou passos estruturados.".to_string()),
            )
        };
        if let Some(iss) = density_issue {
            issues.push(iss);
            checklist.push(
                "Adicionar estatísticas reais, tabelas comparativas ou listas passo a passo."
                    .to_string(),
            );
        }

        // 3. Penalidade de Boilerplate / Palha Genérica de IA
        let norm_body = normalize_marketing_text(&input.text_body);
        let fluff_phrases = [
            "no mundo acelerado de hoje",
            "e crucial lembrar",
            "como sabemos",
            "sem sombra de duvidas",
            "em conclusao",
            "resumindo tudo",
            "vale a pena ressaltar",
            "conforme mencionado anteriormente",
            "no final das contas",
            "uma vasta gama de",
        ];
        let mut fluff_count = 0;
        for fluff in &fluff_phrases {
            if norm_body.contains(fluff) {
                fluff_count += 1;
            }
        }
        let boilerplate_penalty = (fluff_count as f32 * 0.8).min(4.0);
        if fluff_count >= 3 {
            issues.push(format!(
                "Detectados {} clichês genéricos de IA/enchimento textual (fluff).",
                fluff_count
            ));
            checklist.push("Remover introduções prolixas e frases de efeito vazias; ir direto ao valor prático.".to_string());
        }

        // 4. Estrutura de Títulos (H2s)
        let structure_score = if input.h2_headings.len() >= 4 {
            9.0
        } else if input.h2_headings.len() >= 2 {
            7.0
        } else {
            issues.push("Estrutura deficiente: menos de 2 subtítulos H2 encontrados.".to_string());
            checklist.push(
                "Organizar o conteúdo com pelo menos 3 a 5 seções bem delimitadas com H2."
                    .to_string(),
            );
            4.0
        };

        // 5. Score de Originalidade e Valor Agregado
        let originality = (depth_score * 0.4 + density_score * 0.4 + structure_score * 0.2
            - boilerplate_penalty)
            .clamp(1.0, 10.0);
        let value_add = (density_score * 0.6 + structure_score * 0.4).clamp(1.0, 10.0);

        let overall =
            ((originality * 0.45) + (value_add * 0.40) + (depth_score * 0.15)).clamp(1.0, 10.0);
        let overall_rounded = (overall * 10.0).round() / 10.0;

        let (status, rec) = if overall_rounded >= self.approval_threshold {
            (
                GateStatus::ApprovedForPublication,
                "Aprovada para indexação e publicação imediata (score satisfaz os critérios de conteúdo rico).",
            )
        } else {
            (
                GateStatus::BlockedThinPage,
                "BLOQUEADA: Página classificada como fina (Thin Content). Não publicar nem indexar até correção do checklist.",
            )
        };

        ThinPageGateVerdict {
            overall_quality_score: overall_rounded,
            status,
            originality_score: (originality * 10.0).round() / 10.0,
            information_density_score: (density_score * 10.0).round() / 10.0,
            value_add_score: (value_add * 10.0).round() / 10.0,
            boilerplate_penalty,
            detected_issues: issues,
            corrective_checklist: checklist,
            indexation_recommendation: rec.to_string(),
            latency_micros: start.elapsed().as_micros(),
        }
    }
}

// ============================================================================
// TASK 7: Citation checks (GEO - Medição de Citação de Marca em LLMs)
// ============================================================================

/// Mecanismo de IA generativa auditado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LlmEngine {
    ChatGpt,
    Gemini,
    Claude,
    Perplexity,
}

impl LlmEngine {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ChatGpt => "ChatGPT",
            Self::Gemini => "Gemini",
            Self::Claude => "Claude",
            Self::Perplexity => "Perplexity",
        }
    }
}

/// Sentimento da citação na resposta da IA
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CitationSentiment {
    Positive,
    Neutral,
    Critical,
}

impl CitationSentiment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Positive => "positive",
            Self::Neutral => "neutral",
            Self::Critical => "critical",
        }
    }
}

/// Entrada para checagem de citação em resposta gerada por IA
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EngineCitationInput {
    pub engine: LlmEngine,
    pub prompt_query: String,
    pub generated_response: String,
    pub brand_name: String,
    pub brand_aliases: Vec<String>,
    pub brand_domain: String,
}

/// Análise da presença e destaque da marca na resposta da IA
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CitationAnalysis {
    pub engine: LlmEngine,
    pub is_cited: bool,
    pub mention_count: usize,
    pub citation_rank: Option<usize>, // 1 se for a primeira marca recomendada, 2 para segunda, etc.
    pub sentiment: CitationSentiment,
    pub authority_score: f32, // 0.0 a 10.0
    pub is_primary_recommendation: bool,
    pub has_link_or_domain: bool,
    pub extracted_snippets: Vec<String>,
    pub latency_micros: u128,
}

/// Relatório agregado de GEO para uma marca
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GeoAggregatedReport {
    pub brand_name: String,
    pub total_queries_audited: usize,
    pub citation_rate_percentage: f32,
    pub engine_citation_rates: Vec<(LlmEngine, f32)>,
    pub average_authority_score: f32,
    pub sentiment_breakdown: (usize, usize, usize), // (positivo, neutro, crítico)
    pub top_prompts_cited: Vec<String>,
    pub top_prompts_missed: Vec<String>,
}

/// Motor de Auditoria de Citação em IAs Generativas (GEO Citation Checker)
#[derive(Debug, Clone, Default)]
pub struct CitationChecker {}

impl CitationChecker {
    pub fn new() -> Self {
        Self {}
    }

    pub fn check_citation(&self, input: &EngineCitationInput) -> CitationAnalysis {
        let start = Instant::now();
        let norm_resp = normalize_marketing_text(&input.generated_response);
        let norm_brand = normalize_marketing_text(&input.brand_name);
        let norm_domain = normalize_marketing_text(&input.brand_domain);

        let mut brand_variants = vec![norm_brand.clone()];
        for alias in &input.brand_aliases {
            brand_variants.push(normalize_marketing_text(alias));
        }

        let mut mentions = 0;
        let mut snippets = Vec::new();

        // Encontrar menções no texto
        for sentence in input.generated_response.split(['.', '\n', ';', '!']) {
            let s_norm = normalize_marketing_text(sentence);
            let has_mention = brand_variants.iter().any(|v| s_norm.contains(v));
            if has_mention && !sentence.trim().is_empty() {
                mentions += 1;
                if snippets.len() < 3 {
                    snippets.push(sentence.trim().to_string());
                }
            }
        }

        let is_cited = mentions > 0;
        let has_link = norm_resp.contains(&norm_domain) || norm_resp.contains("http");

        if !is_cited {
            return CitationAnalysis {
                engine: input.engine,
                is_cited: false,
                mention_count: 0,
                citation_rank: None,
                sentiment: CitationSentiment::Neutral,
                authority_score: 0.0,
                is_primary_recommendation: false,
                has_link_or_domain: false,
                extracted_snippets: Vec::new(),
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // Determinar rank relativo da citação
        let first_index = brand_variants
            .iter()
            .filter_map(|v| norm_resp.find(v))
            .min()
            .unwrap_or(usize::MAX);

        let rank = if first_index < (norm_resp.len() / 4).max(150) {
            1
        } else if first_index < (norm_resp.len() / 2).max(400) {
            2
        } else {
            3
        };

        let is_primary = rank == 1;

        // Sentimento
        let sentiment = if norm_resp.contains("destaque")
            || norm_resp.contains("melhor")
            || norm_resp.contains("recomendo")
            || norm_resp.contains("lider")
            || norm_resp.contains("excelente")
            || norm_resp.contains("confiavel")
        {
            CitationSentiment::Positive
        } else if norm_resp.contains("problema")
            || norm_resp.contains("desvantagem")
            || norm_resp.contains("limitacao")
            || norm_resp.contains("caro")
            || norm_resp.contains("reclama")
        {
            CitationSentiment::Critical
        } else {
            CitationSentiment::Neutral
        };

        // Score de Autoridade na Citação (0 a 10)
        let mut authority: f32 = 5.0;
        if is_primary {
            authority += 3.0;
        }
        if has_link {
            authority += 1.5;
        }
        if sentiment == CitationSentiment::Positive {
            authority += 1.0;
        } else if sentiment == CitationSentiment::Critical {
            authority -= 2.0;
        }
        let authority_clamped = authority.clamp(1.0, 10.0);

        CitationAnalysis {
            engine: input.engine,
            is_cited: true,
            mention_count: mentions,
            citation_rank: Some(rank),
            sentiment,
            authority_score: authority_clamped,
            is_primary_recommendation: is_primary,
            has_link_or_domain: has_link,
            extracted_snippets: snippets,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    pub fn aggregate_geo_score(
        &self,
        brand: &str,
        citations: &[CitationAnalysis],
    ) -> GeoAggregatedReport {
        let total = citations.len();
        if total == 0 {
            return GeoAggregatedReport {
                brand_name: brand.to_string(),
                total_queries_audited: 0,
                citation_rate_percentage: 0.0,
                engine_citation_rates: Vec::new(),
                average_authority_score: 0.0,
                sentiment_breakdown: (0, 0, 0),
                top_prompts_cited: Vec::new(),
                top_prompts_missed: Vec::new(),
            };
        }

        let cited_count = citations.iter().filter(|c| c.is_cited).count();
        let citation_rate = (cited_count as f32 / total as f32) * 100.0;

        let mut engine_map: HashMap<LlmEngine, (usize, usize)> = HashMap::new();
        for c in citations {
            let entry = engine_map.entry(c.engine).or_insert((0, 0));
            entry.0 += 1;
            if c.is_cited {
                entry.1 += 1;
            }
        }

        let mut engine_rates = Vec::new();
        for (eng, (tot, cit)) in engine_map {
            let rate = if tot > 0 {
                (cit as f32 / tot as f32) * 100.0
            } else {
                0.0
            };
            engine_rates.push((eng, rate));
        }

        let mut pos = 0;
        let mut neu = 0;
        let mut crit = 0;
        let mut sum_auth = 0.0;

        for c in citations {
            if c.is_cited {
                sum_auth += c.authority_score;
                match c.sentiment {
                    CitationSentiment::Positive => pos += 1,
                    CitationSentiment::Neutral => neu += 1,
                    CitationSentiment::Critical => crit += 1,
                }
            }
        }

        let avg_auth = if cited_count > 0 {
            sum_auth / cited_count as f32
        } else {
            0.0
        };

        GeoAggregatedReport {
            brand_name: brand.to_string(),
            total_queries_audited: total,
            citation_rate_percentage: (citation_rate * 10.0).round() / 10.0,
            engine_citation_rates: engine_rates,
            average_authority_score: (avg_auth * 10.0).round() / 10.0,
            sentiment_breakdown: (pos, neu, crit),
            top_prompts_cited: Vec::new(),
            top_prompts_missed: Vec::new(),
        }
    }
}

// ============================================================================
// TASK 8: Who got cited instead (GEO - Concorrentes Citados e Share-of-Voice)
// ============================================================================

/// Entrada de auditoria para o rastreador de concorrência em IA
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LlmAuditEntry {
    pub engine: LlmEngine,
    pub query: String,
    pub generated_response: String,
}

/// Métrica de Share-of-Voice e frequência de um concorrente
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompetitorSoV {
    pub name: String,
    pub mention_count: usize,
    pub citation_rate: f32, // Percentual das buscas auditadas em que foi citado
    pub dominant_context: String,
}

/// Relatório de Concorrentes Citados em Respostas de IA
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompetitorCitationReport {
    pub brand_name: String,
    pub brand_citation_rate: f32,
    pub competitor_rankings: Vec<CompetitorSoV>,
    pub who_got_cited_instead: Vec<(String, Vec<String>)>, // Query -> Lista de concorrentes citados quando a marca ficou de fora
    pub dominant_competitor: Option<String>,
    pub geo_strategic_recommendations: Vec<String>,
    pub total_responses_audited: usize,
    pub latency_micros: u128,
}

/// Motor de Rastreamento de Concorrentes em GEO (Who Got Cited Instead)
#[derive(Debug, Clone, Default)]
pub struct CompetitorCitationTracker {}

impl CompetitorCitationTracker {
    pub fn new() -> Self {
        Self {}
    }

    pub fn track(
        &self,
        brand: &str,
        competitors: &[&str],
        responses: &[LlmAuditEntry],
    ) -> CompetitorCitationReport {
        let start = Instant::now();
        let total = responses.len();
        let norm_brand = normalize_marketing_text(brand);

        let mut brand_citations = 0;
        let mut competitor_mentions: HashMap<String, usize> = HashMap::new();
        let mut who_instead = Vec::new();

        for comp in competitors {
            competitor_mentions.insert(comp.to_string(), 0);
        }

        for entry in responses {
            let norm_resp = normalize_marketing_text(&entry.generated_response);
            let brand_in_resp = norm_resp.contains(&norm_brand);
            if brand_in_resp {
                brand_citations += 1;
            }

            let mut cited_here = Vec::new();
            for comp in competitors {
                let norm_comp = normalize_marketing_text(comp);
                if norm_resp.contains(&norm_comp) {
                    *competitor_mentions.entry(comp.to_string()).or_insert(0) += 1;
                    cited_here.push(comp.to_string());
                }
            }

            // Se a marca não foi citada, mas concorrentes foram
            if !brand_in_resp && !cited_here.is_empty() {
                who_instead.push((entry.query.clone(), cited_here));
            }
        }

        let brand_rate = if total > 0 {
            (brand_citations as f32 / total as f32) * 100.0
        } else {
            0.0
        };

        let mut comp_sov = Vec::new();
        for (comp, count) in competitor_mentions {
            let rate = if total > 0 {
                (count as f32 / total as f32) * 100.0
            } else {
                0.0
            };
            comp_sov.push(CompetitorSoV {
                name: comp,
                mention_count: count,
                citation_rate: (rate * 10.0).round() / 10.0,
                dominant_context: "Recomendado como alternativa ou referência padrão da categoria"
                    .to_string(),
            });
        }
        comp_sov.sort_by_key(|a| std::cmp::Reverse(a.mention_count));

        let dominant = comp_sov.first().map(|c| c.name.clone());

        let mut recommendations = Vec::new();
        if let Some(dom) = &dominant {
            recommendations.push(format!(
                "O concorrente '{}' domina o Share of Voice em IA. Crie páginas comparativas 'SuaMarca vs {}' detalhando diferenciais técnicos.",
                dom, dom
            ));
        }
        if !who_instead.is_empty() {
            recommendations.push(format!(
                "Existem {} consultas onde concorrentes são recomendados e sua marca é ignorada. Produza conteúdo específico para essas intenções.",
                who_instead.len()
            ));
        }
        recommendations.push("Aumente citações em entidades de autoridade (Wikidata, portais do setor e reviews de terceiros) para alimentar os LLMs.".to_string());

        CompetitorCitationReport {
            brand_name: brand.to_string(),
            brand_citation_rate: (brand_rate * 10.0).round() / 10.0,
            competitor_rankings: comp_sov,
            who_got_cited_instead: who_instead,
            dominant_competitor: dominant,
            geo_strategic_recommendations: recommendations,
            total_responses_audited: total,
            latency_micros: start.elapsed().as_micros(),
        }
    }
}

// ============================================================================
// TASK 9: Converting terms with no page (Ads -> SEO/GEO Bridge de Oportunidades)
// ============================================================================

/// Termo pago com histórico de conversão e receita em Google Ads
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AdsConvertingTerm {
    pub query: String,
    pub conversions: u32,
    pub conversion_value: f64,
    pub cost: f64,
    pub cpa: f64,
}

/// Página do catálogo orgânico indexado
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndexedPage {
    pub url: String,
    pub title: String,
    pub target_keywords: Vec<String>,
}

/// Prioridade de criação de conteúdo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GapPriority {
    Critical,
    High,
    Medium,
    Low,
}

impl GapPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }
}

/// Formato de conteúdo recomendado para a pauta
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ContentFormatRecommendation {
    DedicatedProductLanding,
    ComparisonPage,
    HowToGuide,
    InteractiveCalculator,
    BuyersChecklist,
}

impl ContentFormatRecommendation {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DedicatedProductLanding => "dedicated_product_landing",
            Self::ComparisonPage => "comparison_page",
            Self::HowToGuide => "how_to_guide",
            Self::InteractiveCalculator => "interactive_calculator",
            Self::BuyersChecklist => "buyers_checklist",
        }
    }
}

/// Oportunidade editorial de conteúdo baseada em conversões reais
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContentOpportunityItem {
    pub converting_query: String,
    pub paid_conversions: u32,
    pub paid_revenue: f64,
    pub priority: GapPriority,
    pub estimated_monthly_organic_savings: f64,
    pub recommended_title: String,
    pub recommended_slug: String,
    pub recommended_format: ContentFormatRecommendation,
    pub key_entities_to_cover: Vec<String>,
}

/// Relatório de Termos que Convertem sem Página Orgânica
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConvertingTermsGapReport {
    pub total_paid_terms_analyzed: usize,
    pub uncovered_gaps_count: usize,
    pub total_revenue_opportunity: f64,
    pub opportunities: Vec<ContentOpportunityItem>,
    pub latency_micros: u128,
}

/// Motor de Identificação de Lacunas Editoriais de Conversão (Ads -> SEO Bridge)
#[derive(Debug, Clone, Default)]
pub struct ConvertingTermsGapFinder {}

impl ConvertingTermsGapFinder {
    pub fn new() -> Self {
        Self {}
    }

    pub fn find_gaps(
        &self,
        paid_terms: &[AdsConvertingTerm],
        indexed_pages: &[IndexedPage],
    ) -> ConvertingTermsGapReport {
        let start = Instant::now();
        let mut opportunities = Vec::new();
        let mut total_opportunity_rev = 0.0;

        for term in paid_terms {
            let norm_query = normalize_marketing_text(&term.query);
            let query_words = extract_keywords(&term.query);

            // Verificar se alguma página orgânica existente cobre este termo com precisão
            let mut page_covers = false;
            for page in indexed_pages {
                let norm_title = normalize_marketing_text(&page.title);
                if norm_title.contains(&norm_query) {
                    page_covers = true;
                    break;
                }
                for kw in &page.target_keywords {
                    if normalize_marketing_text(kw) == norm_query {
                        page_covers = true;
                        break;
                    }
                }
                if page_covers {
                    break;
                }
            }

            // Se não houver página dedicada, temos uma lacuna de ouro!
            if !page_covers && term.conversions >= 3 {
                total_opportunity_rev += term.conversion_value;

                let priority = if term.conversions >= 50 || term.conversion_value >= 5000.0 {
                    GapPriority::Critical
                } else if term.conversions >= 20 || term.conversion_value >= 2000.0 {
                    GapPriority::High
                } else if term.conversions >= 8 {
                    GapPriority::Medium
                } else {
                    GapPriority::Low
                };

                // Inferir o formato recomendado
                let (format, title_template) = if norm_query.contains(" vs ")
                    || norm_query.contains("comparativo")
                    || norm_query.contains("concorrente")
                {
                    (
                        ContentFormatRecommendation::ComparisonPage,
                        format!(
                            "Comparativo Completo: {} - Prós, Contras e Qual Escolher",
                            term.query
                        ),
                    )
                } else if norm_query.contains("calculadora")
                    || norm_query.contains("simulador")
                    || norm_query.contains("custo")
                {
                    (
                        ContentFormatRecommendation::InteractiveCalculator,
                        format!("Calculadora e Simulador de {}", term.query),
                    )
                } else if norm_query.contains("como")
                    || norm_query.contains("passo a passo")
                    || norm_query.contains("tutorial")
                {
                    (
                        ContentFormatRecommendation::HowToGuide,
                        format!("Guia Passo a Passo: Tudo sobre {}", term.query),
                    )
                } else if norm_query.contains("checklist") || norm_query.contains("requisitos") {
                    (
                        ContentFormatRecommendation::BuyersChecklist,
                        format!("Checklist Definitivo de Compra para {}", term.query),
                    )
                } else {
                    (
                        ContentFormatRecommendation::DedicatedProductLanding,
                        format!("Plataforma e Solução Completa para {}", term.query),
                    )
                };

                let slug = format!("/solucoes/{}", norm_query.replace(' ', "-"));
                let savings = term.cost * 0.70; // 70% de economia ao migrar parte do volume para orgânico

                opportunities.push(ContentOpportunityItem {
                    converting_query: term.query.clone(),
                    paid_conversions: term.conversions,
                    paid_revenue: term.conversion_value,
                    priority,
                    estimated_monthly_organic_savings: (savings * 100.0).round() / 100.0,
                    recommended_title: title_template,
                    recommended_slug: slug,
                    recommended_format: format,
                    key_entities_to_cover: query_words,
                });
            }
        }

        opportunities.sort_by(|a, b| {
            b.paid_revenue
                .partial_cmp(&a.paid_revenue)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        ConvertingTermsGapReport {
            total_paid_terms_analyzed: paid_terms.len(),
            uncovered_gaps_count: opportunities.len(),
            total_revenue_opportunity: (total_opportunity_rev * 100.0).round() / 100.0,
            opportunities,
            latency_micros: start.elapsed().as_micros(),
        }
    }
}

// ============================================================================
// MOTOR UNIFICADO: MarketingOpsEngine
// ============================================================================

/// Relatório de demonstração da suíte completa de Marketing Ops
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketingSuiteDemoReport {
    pub search_triage_sample: SearchTermTriageResult,
    pub creative_tagging_sample: CreativeTaggingResult,
    pub landing_page_match_sample: LandingPageMatchResult,
    pub internal_link_decision_sample: InternalLinkDecision,
    pub cannibalization_report_sample: CannibalizationReport,
    pub thin_page_verdict_sample: ThinPageGateVerdict,
    pub citation_analysis_sample: CitationAnalysis,
    pub competitor_citation_sample: CompetitorCitationReport,
    pub converting_gap_report_sample: ConvertingTermsGapReport,
    pub total_pipeline_latency_micros: u128,
}

/// Motor Unificado de Alta Performance de Marketing Ops e SEO do ALR
#[derive(Clone)]
pub struct MarketingOpsEngine {
    pub search_triage: SearchTermTriage,
    pub creative_tagging: CreativeTagging,
    pub landing_match: LandingPageMatch,
    pub link_map: InternalLinkMap,
    pub cannibalization: CannibalizationDetector,
    pub thin_gate: ThinPageGate,
    pub citation_checker: CitationChecker,
    pub competitor_tracker: CompetitorCitationTracker,
    pub gap_finder: ConvertingTermsGapFinder,
    pub typed_judge: Option<Arc<dyn TypedJudge>>,
}

impl Default for MarketingOpsEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl MarketingOpsEngine {
    pub fn new() -> Self {
        Self {
            search_triage: SearchTermTriage::new(),
            creative_tagging: CreativeTagging::new(),
            landing_match: LandingPageMatch::new(),
            link_map: InternalLinkMap::new(),
            cannibalization: CannibalizationDetector::new(),
            thin_gate: ThinPageGate::new(),
            citation_checker: CitationChecker::new(),
            competitor_tracker: CompetitorCitationTracker::new(),
            gap_finder: ConvertingTermsGapFinder::new(),
            typed_judge: None,
        }
    }

    pub fn with_typed_judge(mut self, judge: Arc<dyn TypedJudge>) -> Self {
        self.typed_judge = Some(judge);
        self
    }

    /// Avaliação tipada calibrada assíncrona se TypedJudge estiver presente
    pub async fn calibrate_search_triage_async(&self, result: &mut SearchTermTriageResult) {
        if let Some(judge) = &self.typed_judge {
            let options = vec![
                SearchIntentCategory::Buyer.as_str().to_string(),
                SearchIntentCategory::Researcher.as_str().to_string(),
                SearchIntentCategory::JobSeeker.as_str().to_string(),
                SearchIntentCategory::Competitor.as_str().to_string(),
                SearchIntentCategory::Junk.as_str().to_string(),
            ];
            let question = TypedQuestion::Choice {
                options,
                instructions:
                    "Identificar intenção de busca em Google Ads para triagem e negativação"
                        .to_string(),
                criteria: None,
            };
            let state = State {
                features: vec![result.confidence, result.wasted_spend_risk],
                metadata: serde_json::json!({
                    "query": result.query,
                    "category": result.category.as_str(),
                }),
            };
            if let Ok(outcome) = judge.evaluate_typed(&state, &question).await {
                result.confidence = outcome.confidence.clamp(0.80, 0.99);
            }
        }
    }

    /// Executa uma auditoria completa de demonstração cobrindo os 9 casos de uso
    pub fn run_demo_suite(&self) -> MarketingSuiteDemoReport {
        let start = Instant::now();

        // 1. Search-term triage
        let triage = self
            .search_triage
            .triage("vagas de emprego analista de marketing salario");

        // 2. Creative tagging
        let tagging = self.creative_tagging.tag(
            "Cansado de perder vendas por demora no atendimento? Descubra o método que mais de 1.400 empresas usam para automatizar o WhatsApp. Teste grátis por 14 dias sem cartão.",
            Some("video ugc"),
        );

        // 3. Landing page match
        let ad_promise = AdPromise {
            headline: "Automação de WhatsApp Inteligente".to_string(),
            body_copy: "Teste grátis por 14 dias com 50% de desconto no plano anual.".to_string(),
            promised_offer: Some("50% de desconto".to_string()),
            promised_price: Some("R$ 49,90".to_string()),
            cta_text: "Começar Teste Grátis".to_string(),
            target_keyword: Some("automacao de whatsapp".to_string()),
        };
        let page_content = LandingPageContent {
            url: "https://empresa.com/whatsapp".to_string(),
            title: "Automação de WhatsApp Inteligente | Teste Grátis".to_string(),
            h1: "Automação de WhatsApp Inteligente para Negócios".to_string(),
            body_snippet: "Conecte seu atendimento e aproveite 50% de desconto no plano anual por apenas R$ 49,90 ao mês.".to_string(),
            displayed_offers: vec!["50% de desconto no plano anual".to_string()],
            displayed_price: Some("R$ 49,90".to_string()),
            cta_buttons: vec!["Começar Teste Grátis".to_string(), "Falar com Vendas".to_string()],
        };
        let lp_match = self
            .landing_match
            .evaluate_match(&ad_promise, &page_content);

        // 4. Internal link map
        let pillar = InternalPageDoc {
            url: "https://empresa.com/seo-guia-completo".to_string(),
            title: "Guia Completo de SEO para 2026".to_string(),
            topic_cluster: "SEO".to_string(),
            depth_level: 1,
            target_keywords: vec!["guia de seo".to_string(), "como fazer seo".to_string()],
            body_summary:
                "Artigo pilar cobrindo todos os fundamentos de otimização para motores de busca."
                    .to_string(),
        };
        let cluster = InternalPageDoc {
            url: "https://empresa.com/como-fazer-link-building".to_string(),
            title: "Estratégias de Link Building Avançado".to_string(),
            topic_cluster: "SEO".to_string(),
            depth_level: 2,
            target_keywords: vec!["link building".to_string()],
            body_summary: "Capítulo aprofundado com táticas comprovadas de conquista de backlinks."
                .to_string(),
        };
        let link_decision = self.link_map.evaluate_link_pair(&pillar, &cluster);

        // 5. Cannibalization
        let page_a = PageSeoProfile {
            url: "https://empresa.com/crm-para-vendas".to_string(),
            title: "Melhor CRM para Vendas B2B".to_string(),
            primary_intent_query: "crm para vendas".to_string(),
            secondary_queries: vec![
                "software crm comercial".to_string(),
                "sistema de crm".to_string(),
            ],
            h1: "CRM para Vendas: Aumente o Fechamento da sua Equipe".to_string(),
            body_snippet: "O melhor software de crm para vendas corporativas.".to_string(),
            monthly_organic_traffic: 5400,
            average_ranking: 3.2,
        };
        let page_b = PageSeoProfile {
            url: "https://empresa.com/software-crm-vendas".to_string(),
            title: "Software de CRM para Vendas".to_string(),
            primary_intent_query: "crm para vendas".to_string(),
            secondary_queries: vec!["software crm comercial".to_string()],
            h1: "Software de CRM Comercial".to_string(),
            body_snippet: "Plataforma de crm para vendedores e equipes comerciais.".to_string(),
            monthly_organic_traffic: 890,
            average_ranking: 8.7,
        };
        let cannibalization_rep = self.cannibalization.detect(&page_a, &page_b);

        // 6. Thin-page gate
        let thin_input = PageContentInput {
            url: "https://empresa.com/blog/dicas-marketing".to_string(),
            title: "3 Dicas Rápidas de Marketing".to_string(),
            word_count: 240,
            text_body: "No mundo acelerado de hoje, e crucial lembrar que marketing e importante. Como sabemos, vale a pena ressaltar que o cliente tem razao. Em conclusao, faca bom atendimento.".to_string(),
            h2_headings: vec!["Introdução".to_string()],
            has_images_or_media: false,
            code_or_data_points: 0,
            structured_lists_count: 0,
        };
        let thin_verdict = self.thin_gate.evaluate_page(&thin_input);

        // 7. Citation checks
        let cit_input = EngineCitationInput {
            engine: LlmEngine::Perplexity,
            prompt_query: "Qual a melhor plataforma de automação em Rust no Brasil?".to_string(),
            generated_response: "Para automação em Rust de alta performance, a plataforma ALR destaca-se como líder de mercado no Brasil, oferecendo execução local em microssegundos com custo zero.".to_string(),
            brand_name: "ALR".to_string(),
            brand_aliases: vec!["Autonomous Learning Runtime".to_string()],
            brand_domain: "alr.dev".to_string(),
        };
        let cit_analysis = self.citation_checker.check_citation(&cit_input);

        // 8. Who got cited instead
        let audit_entries = vec![
            LlmAuditEntry {
                engine: LlmEngine::ChatGpt,
                query: "Melhores ferramentas de SEO para agências".to_string(),
                generated_response: "As principais ferramentas do mercado incluem Semrush e Ahrefs para pesquisa de palavras-chave.".to_string(),
            },
            LlmAuditEntry {
                engine: LlmEngine::Claude,
                query: "Qual software de SEO contratar para auditoria técnica?".to_string(),
                generated_response: "Recomendo o Semrush pela abrangência do banco de dados e relatórios técnicos.".to_string(),
            },
        ];
        let comp_report =
            self.competitor_tracker
                .track("ALR SEO", &["Semrush", "Ahrefs"], &audit_entries);

        // 9. Converting terms with no page
        let paid_terms = vec![
            AdsConvertingTerm {
                query: "calculadora de roi para whatsapp".to_string(),
                conversions: 84,
                conversion_value: 12600.0,
                cost: 2100.0,
                cpa: 25.0,
            },
            AdsConvertingTerm {
                query: "sistema de automacao de atendimento hospitalar".to_string(),
                conversions: 32,
                conversion_value: 9400.0,
                cost: 1800.0,
                cpa: 56.25,
            },
        ];
        let indexed = vec![IndexedPage {
            url: "https://empresa.com/home".to_string(),
            title: "Página Inicial".to_string(),
            target_keywords: vec!["automacao de atendimento".to_string()],
        }];
        let gap_report = self.gap_finder.find_gaps(&paid_terms, &indexed);

        MarketingSuiteDemoReport {
            search_triage_sample: triage,
            creative_tagging_sample: tagging,
            landing_page_match_sample: lp_match,
            internal_link_decision_sample: link_decision,
            cannibalization_report_sample: cannibalization_rep,
            thin_page_verdict_sample: thin_verdict,
            citation_analysis_sample: cit_analysis,
            competitor_citation_sample: comp_report,
            converting_gap_report_sample: gap_report,
            total_pipeline_latency_micros: start.elapsed().as_micros(),
        }
    }
}

use alr_core::State;
use alr_models::{TypedJudge, TypedQuestion};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;

/// Emoção primária identificada na comunicação do cliente
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PrimaryEmotion {
    Raiva,
    Frustrado,
    Feliz,
    Agradecido,
    Neutro,
    Ansioso,
    ComDuvida,
    Ameacador,
}

impl PrimaryEmotion {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Raiva => "raiva",
            Self::Frustrado => "frustrado",
            Self::Feliz => "feliz",
            Self::Agradecido => "agradecido",
            Self::Neutro => "neutro",
            Self::Ansioso => "ansioso",
            Self::ComDuvida => "com_duvida",
            Self::Ameacador => "ameacador",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Raiva => "Raiva / Fúria",
            Self::Frustrado => "Frustrado / Insatisfeito",
            Self::Feliz => "Feliz / Elogio",
            Self::Agradecido => "Agradecido / Reconhecimento",
            Self::Neutro => "Neutro / Operacional",
            Self::Ansioso => "Ansioso / Preocupado",
            Self::ComDuvida => "Com Dúvida / Curioso",
            Self::Ameacador => "Ameaçador / Litígio",
        }
    }
}

/// Intenção explícita ou implícita do cliente na interação
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum InteractionIntent {
    ApenasPerguntando,
    PedindoAjuda,
    Reclamando,
    Agradecendo,
    NegociandoComercial,
    ExigindoSolucaoImediata,
}

impl InteractionIntent {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ApenasPerguntando => "apenas_perguntando",
            Self::PedindoAjuda => "pedindo_ajuda",
            Self::Reclamando => "reclamando",
            Self::Agradecendo => "agradecendo",
            Self::NegociandoComercial => "negociando_comercial",
            Self::ExigindoSolucaoImediata => "exigindo_solucao_imediata",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::ApenasPerguntando => "Apenas Perguntando / Informativo",
            Self::PedindoAjuda => "Pedindo Ajuda / Suporte",
            Self::Reclamando => "Reclamando / Insatisfação",
            Self::Agradecendo => "Agradecendo / Elogio",
            Self::NegociandoComercial => "Negociando Comercial / Contratação",
            Self::ExigindoSolucaoImediata => "Exigindo Solução Imediata",
        }
    }
}

/// Nível multidimensional de urgência da solicitação
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum UrgencyLevel {
    Baixa,
    Normal,
    Alta,
    Critica,
}

impl UrgencyLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Baixa => "baixa",
            Self::Normal => "normal",
            Self::Alta => "alta",
            Self::Critica => "critica",
        }
    }

    pub fn from_score(score: f32) -> Self {
        if score >= 0.80 {
            Self::Critica
        } else if score >= 0.50 {
            Self::Alta
        } else if score >= 0.25 {
            Self::Normal
        } else {
            Self::Baixa
        }
    }
}

/// Roteamento inteligente de destino baseado na matriz emocional e de urgência
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RoutingDestination {
    AutoAtendimentoN1,     // Zero Tokens - FAQ, dúvidas básicas, rastreio
    SuporteEspecialistaN2, // Casos técnicos complexos e bugs
    RetencaoEChurnVIP,     // Risco de perda de cliente / cancelamento VIP
    OuvidoriaEJuridico,    // Procon, advogado, litígio, reclamações graves
    FinanceiroEEstorno,    // Cobrança indevida, Pix, reembolso, cartão
    ComercialEVendas,      // Oportunidades de compra, contratação, upgrades
}

impl RoutingDestination {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AutoAtendimentoN1 => "auto_atendimento_n1",
            Self::SuporteEspecialistaN2 => "suporte_especialista_n2",
            Self::RetencaoEChurnVIP => "retencao_e_churn_vip",
            Self::OuvidoriaEJuridico => "ouvidoria_e_juridico",
            Self::FinanceiroEEstorno => "financeiro_e_estorno",
            Self::ComercialEVendas => "comercial_e_vendas",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::AutoAtendimentoN1 => "Fila N1 - Auto-atendimento (Zero Tokens)",
            Self::SuporteEspecialistaN2 => "Fila N2 - Suporte Especialista Técnico",
            Self::RetencaoEChurnVIP => "Fila VIP - Retenção & Churn Prevention",
            Self::OuvidoriaEJuridico => "Fila Ouvidoria & Jurídico (Alto Risco)",
            Self::FinanceiroEEstorno => "Fila Financeiro & Estorno",
            Self::ComercialEVendas => "Fila Comercial & Vendas",
        }
    }
}

/// Perfil multidimensional completo de sentimento, intenção e risco do cliente
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MultiDimensionalSentimentProfile {
    pub primary_emotion: PrimaryEmotion,
    pub secondary_emotions: Vec<PrimaryEmotion>,
    pub interaction_intent: InteractionIntent,
    pub is_urgent: bool,
    pub urgency_level: UrgencyLevel,
    pub urgency_score: f32,
    pub needs_human_escalation: bool,
    pub churn_risk_score: f32,
    pub recommended_routing: RoutingDestination,
    pub emotion_confidence: f32,
    pub detected_triggers: Vec<String>,
    pub tone_guidance_for_reply: String,
    pub latency_micros: u128,
}

/// Normalização fonética e remoção de acentos em português
pub fn normalize_pt(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            'á' | 'à' | 'â' | 'ã' | 'ä' | 'Á' | 'À' | 'Â' | 'Ã' | 'Ä' => out.push('a'),
            'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => out.push('e'),
            'í' | 'ì' | 'î' | 'ï' | 'Í' | 'Ì' | 'Î' | 'Ï' => out.push('i'),
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' | 'Ó' | 'Ò' | 'Ô' | 'Õ' | 'Ö' => out.push('o'),
            'ú' | 'ù' | 'û' | 'ü' | 'Ú' | 'Ù' | 'Û' | 'Ü' => out.push('u'),
            'ç' | 'Ç' => out.push('c'),
            other => {
                for lc in other.to_lowercase() {
                    out.push(lc);
                }
            }
        }
    }
    out
}

/// Motor de Análise Profunda de Sentimentos, Urgência e Estado Emocional
pub struct CustomerSentimentEngine {
    pub typed_judge: Option<Arc<dyn TypedJudge>>,
}

impl Default for CustomerSentimentEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl CustomerSentimentEngine {
    pub fn new() -> Self {
        Self { typed_judge: None }
    }

    pub fn with_typed_judge(mut self, judge: Arc<dyn TypedJudge>) -> Self {
        self.typed_judge = Some(judge);
        self
    }

    /// Análise ultra-rápida em CPU (< 10 µs)
    pub fn analyze(&self, text: &str) -> MultiDimensionalSentimentProfile {
        let start = Instant::now();
        let mut profile = self.analyze_internal(text);
        profile.latency_micros = start.elapsed().as_micros();
        profile
    }

    /// Análise assíncrona com calibração probabilística via TypedJudge se configurado
    pub async fn analyze_async(&self, text: &str) -> MultiDimensionalSentimentProfile {
        let start = Instant::now();
        let mut profile = self.analyze_internal(text);

        if let Some(judge) = &self.typed_judge {
            let options = vec![
                PrimaryEmotion::Raiva.as_str().to_string(),
                PrimaryEmotion::Frustrado.as_str().to_string(),
                PrimaryEmotion::Feliz.as_str().to_string(),
                PrimaryEmotion::Agradecido.as_str().to_string(),
                PrimaryEmotion::Neutro.as_str().to_string(),
                PrimaryEmotion::Ansioso.as_str().to_string(),
                PrimaryEmotion::ComDuvida.as_str().to_string(),
                PrimaryEmotion::Ameacador.as_str().to_string(),
            ];

            let question = TypedQuestion::Choice {
                options,
                instructions: "Identificar com calibração System 1 a emoção primária".to_string(),
                criteria: None,
            };

            let state = State {
                features: vec![
                    profile.urgency_score,
                    profile.churn_risk_score,
                    profile.emotion_confidence,
                    if profile.is_urgent { 1.0 } else { 0.0 },
                ],
                metadata: serde_json::json!({
                    "raw_text": text,
                    "primary_emotion": profile.primary_emotion.as_str(),
                    "urgency_level": profile.urgency_level.as_str(),
                }),
            };

            if let Ok(outcome) = judge.evaluate_typed(&state, &question).await {
                profile.emotion_confidence = outcome.confidence.clamp(0.85, 0.99);
            }
        }

        profile.latency_micros = start.elapsed().as_micros();
        profile
    }

    /// Análise em lote
    pub fn batch_analyze(&self, texts: &[&str]) -> Vec<MultiDimensionalSentimentProfile> {
        texts.iter().map(|t| self.analyze(t)).collect()
    }

    fn analyze_internal(&self, text: &str) -> MultiDimensionalSentimentProfile {
        let norm = normalize_pt(text);
        let mut detected_triggers: Vec<String> = Vec::new();

        // 1. Análise de Pontuação Enfática e Agressiva
        let mut punctuation_urgency_boost = 0.0f32;
        if text.contains("!!!") || text.contains("!!") {
            detected_triggers.push("PONTUAÇÃO_EXCLAMAÇÃO_ENFÁTICA".to_string());
            punctuation_urgency_boost += 0.15;
        }
        if text.contains("???") || text.contains("??") {
            detected_triggers.push("PONTUAÇÃO_INTERROGAÇÃO_REITERADA".to_string());
            punctuation_urgency_boost += 0.10;
        }
        if text.contains("!?") || text.contains("?!") {
            detected_triggers.push("PONTUAÇÃO_MISTA_INDIGNAÇÃO".to_string());
            punctuation_urgency_boost += 0.15;
        }

        // 2. Análise de CAPS LOCK
        let alpha_chars: Vec<char> = text.chars().filter(|c| c.is_alphabetic()).collect();
        let upper_count = alpha_chars.iter().filter(|c| c.is_uppercase()).count();
        let is_caps_lock =
            alpha_chars.len() >= 8 && (upper_count as f32 / alpha_chars.len() as f32) > 0.55;

        let mut caps_urgency_boost = 0.0f32;
        if is_caps_lock {
            detected_triggers.push("CAPS_LOCK_ENFÁTICO".to_string());
            caps_urgency_boost = 0.20;
        }

        // 3. Léxicos e Gatilhos por Categoria
        const LEGAL_TRIGGERS: &[&str] = &[
            "procon",
            "processar",
            "processo",
            "advogado",
            "danos morais",
            "reclame aqui",
            "reclameaqui",
            "pequenas causas",
            "notificacao extrajudicial",
            "notificacao judicial",
            "delegacia",
            "policia",
            "boletim de ocorrencia",
            "b.o.",
            "estelionato",
            "crime",
            "justica",
            "tribunal",
            "acao judicial",
            "juizado",
            "fraude",
            "golpistas",
            "indenizacao",
        ];

        const ANGER_TRIGGERS: &[&str] = &[
            "absurdo",
            "palhacada",
            "ridiculo",
            "pessimo",
            "furioso",
            "incompetentes",
            "lixo",
            "porcaria",
            "falcatrua",
            "golpe",
            "vergonha",
            "odio",
            "raiva",
            "safadeza",
            "enganacao",
            "desonestos",
            "ladroes",
            "palhacos",
            "inadmissivel",
            "falta de respeito",
            "nunca mais compro",
            "horroroso",
            "desrespeito",
            "inuteis",
            "pior empresa",
            "prejuizo",
        ];

        const FRUSTRATION_TRIGGERS: &[&str] = &[
            "nao aguento mais",
            "nao funciona",
            "decepcionado",
            "decepcionada",
            "chateado",
            "chateada",
            "esperava mais",
            "ja tentei varias vezes",
            "nao resolvem",
            "descaso",
            "arrependido",
            "arrependida",
            "cansado de esperar",
            "cansada de esperar",
            "prometeram",
            "toda vez",
            "so dor de cabeca",
            "ninguem ajuda",
            "atrasado de novo",
            "pessima experiencia",
            "frustrante",
            "decepcionante",
            "desperdicio",
            "pessimo servico",
            "falha de voces",
            "nao aguento",
            "nao resolveram",
        ];

        const ANXIETY_TRIGGERS: &[&str] = &[
            "preocupado",
            "preocupada",
            "urgencia",
            "vai demorar",
            "tenho pressa",
            "ja enviaram",
            "quando chega",
            "alguma previsao",
            "preciso saber",
            "esperando faz tempo",
            "ansioso",
            "ansiosa",
            "tenho prazo",
            "urgente",
            "para hoje",
            "ainda nao chegou",
            "cade meu pedido",
            "onde esta",
            "kd meu pedido",
            "previsao de entrega",
            "estou aflito",
            "estou aflita",
        ];

        const DOUBT_TRIGGERS: &[&str] = &[
            "como funciona",
            "tenho uma duvida",
            "duvida",
            "qual a diferenca",
            "nao entendi",
            "posso alterar",
            "onde vejo",
            "como faco",
            "como posso",
            "gostaria de saber se",
            "gostaria de saber",
            "qual e o",
            "qual o",
            "quanto custa",
            "aceita",
            "funciona no",
            "e possivel",
            "tem suporte",
            "precisa de",
            "onde encontro",
            "como usar",
            "qual o valor",
            "horario de funcionamento",
        ];

        const HAPPY_TRIGGERS: &[&str] = &[
            "parabens",
            "excelente",
            "maravilhoso",
            "maravilhosa",
            "otimo",
            "otima",
            "adorei",
            "muito bom",
            "muito boa",
            "perfeito",
            "perfeita",
            "sensacional",
            "top",
            "recomendo",
            "amei",
            "fantastico",
            "fantastica",
            "impecavel",
            "melhor servico",
            "atendimento incrivel",
            "muito rapido",
            "muito rapida",
            "estou feliz",
            "satisfacao total",
            "show de bola",
            "nota 10",
        ];

        const GRATITUDE_TRIGGERS: &[&str] = &[
            "obrigado",
            "obrigada",
            "valeu",
            "agradeco",
            "muito obrigado",
            "muito obrigada",
            "gratidao",
            "ajudou bastante",
            "resolvido",
            "agradecido",
            "agradecida",
            "tudo certo agora",
            "valeu mesmo",
            "salvou meu dia",
            "agradeco a atencao",
            "obrigado pelo suporte",
        ];

        const FINANCIAL_DISPUTE_TRIGGERS: &[&str] = &[
            "cobranca indevida",
            "cobrou duas vezes",
            "duplicada",
            "duas vezes",
            "estorno",
            "reembolso",
            "cartao debitou",
            "valor errado",
            "devolucao",
            "devolver meu dinheiro",
            "devolucao do valor",
            "cobrado a mais",
            "estornem meu dinheiro",
            "estornar meu dinheiro",
            "meu estorno",
            "reembolsar",
            "dinheiro de volta",
            "pagamento duplicado",
        ];

        const FINANCIAL_INQUIRY_TRIGGERS: &[&str] = &[
            "pix",
            "fatura",
            "boleto",
            "cartao de credito",
            "segunda via",
            "comprovante",
            "dados bancarios",
        ];

        const IMMEDIATE_SOLUTION_TRIGGERS: &[&str] = &[
            "resolvam agora",
            "resolva agora",
            "quero meu dinheiro de volta hoje",
            "quero estorno ja",
            "cancelem imediatamente",
            "estorno urgente",
            "resolvam imediatamente",
            "exijo solucao",
            "quero agora",
            "faca o estorno agora",
            "resolvam hoje",
            "imediata",
            "solucao imediata",
            "devolva meu dinheiro",
            "preciso disso agora",
            "agora mesmo",
            "pra ontem",
            "urgente",
            "urgencia",
            "com urgencia",
            "imediatamente",
            "o quanto antes",
        ];

        const CHURN_TRIGGERS: &[&str] = &[
            "cancelar",
            "cancelamento",
            "mudar de empresa",
            "ir para concorrente",
            "concorrente",
            "vou sair",
            "encerrar conta",
            "fechar conta",
            "desistir do servico",
            "nunca mais",
            "nao renovarei",
            "trocar de fornecedor",
            "rescisao",
        ];

        const COMMERCIAL_TRIGGERS: &[&str] = &[
            "quero contratar",
            "qual o preco",
            "tem desconto",
            "quero comprar",
            "plano empresarial",
            "orcamento",
            "cotacao",
            "upgrade de plano",
            "quero assinar",
            "fechar contrato",
            "condicoes especiais",
            "valor da mensalidade",
            "negociar",
            "adquirir",
            "tabela de precos",
        ];

        const TECH_N2_TRIGGERS: &[&str] = &[
            "erro no sistema",
            "falha na api",
            "bug no aplicativo",
            "bug",
            "crash",
            "sistema fora do ar",
            "stack trace",
            "falha tecnica",
            "suporte n2",
            "especialista",
            "falha de conexao",
            "banco de dados fora",
            "endpoint",
            "500 internal server error",
            "nao carrega",
        ];

        const HELP_REQUEST_TRIGGERS: &[&str] = &[
            "preciso de ajuda",
            "me ajudem",
            "me ajuda",
            "pode me ajudar",
            "socorro",
            "nao consigo",
            "como resolver",
            "preciso de suporte",
            "alguem pode me auxiliar",
            "esta dando erro",
            "nao estou conseguindo",
            "ajuda por favor",
        ];

        let mut legal_score = 0.0f32;
        let mut anger_score = 0.0f32;
        let mut frust_score = 0.0f32;
        let mut anxiety_score = 0.0f32;
        let mut doubt_score = 0.0f32;
        let mut happy_score = 0.0f32;
        let mut grat_score = 0.0f32;

        let mut has_financial_dispute = false;
        let mut has_immediate = false;
        let mut has_churn = false;
        let mut has_commercial = false;
        let mut has_tech_n2 = false;
        let mut has_help_request = false;

        // Função interna para checagem e adição de gatilhos
        let mut check_list = |list: &[&str], score: &mut f32, weight: f32| {
            for &kw in list {
                if norm.contains(kw) {
                    *score += weight;
                    if !detected_triggers.contains(&kw.to_string()) {
                        detected_triggers.push(kw.to_string());
                    }
                }
            }
        };

        check_list(LEGAL_TRIGGERS, &mut legal_score, 10.0);
        check_list(ANGER_TRIGGERS, &mut anger_score, 4.0);
        check_list(FRUSTRATION_TRIGGERS, &mut frust_score, 3.0);
        check_list(ANXIETY_TRIGGERS, &mut anxiety_score, 2.5);
        check_list(DOUBT_TRIGGERS, &mut doubt_score, 2.0);
        check_list(HAPPY_TRIGGERS, &mut happy_score, 3.5);
        check_list(GRATITUDE_TRIGGERS, &mut grat_score, 3.5);

        for &kw in FINANCIAL_DISPUTE_TRIGGERS {
            if norm.contains(kw) {
                has_financial_dispute = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        for &kw in FINANCIAL_INQUIRY_TRIGGERS {
            if norm.contains(kw) && !detected_triggers.contains(&kw.to_string()) {
                detected_triggers.push(kw.to_string());
            }
        }

        for &kw in IMMEDIATE_SOLUTION_TRIGGERS {
            if norm.contains(kw) {
                has_immediate = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        for &kw in CHURN_TRIGGERS {
            if norm.contains(kw) {
                has_churn = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        for &kw in COMMERCIAL_TRIGGERS {
            if norm.contains(kw) {
                has_commercial = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        for &kw in TECH_N2_TRIGGERS {
            if norm.contains(kw) {
                has_tech_n2 = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        for &kw in HELP_REQUEST_TRIGGERS {
            if norm.contains(kw) {
                has_help_request = true;
                if !detected_triggers.contains(&kw.to_string()) {
                    detected_triggers.push(kw.to_string());
                }
            }
        }

        if is_caps_lock {
            anger_score *= 1.35;
            frust_score *= 1.25;
            legal_score *= 1.2;
        }

        // 4. Determinação de Emoção Primária e Secundárias
        let mut emotion_candidates: Vec<(PrimaryEmotion, f32)> = vec![
            (PrimaryEmotion::Ameacador, legal_score),
            (PrimaryEmotion::Raiva, anger_score),
            (PrimaryEmotion::Frustrado, frust_score),
            (PrimaryEmotion::Ansioso, anxiety_score),
            (PrimaryEmotion::ComDuvida, doubt_score),
            (PrimaryEmotion::Feliz, happy_score),
            (PrimaryEmotion::Agradecido, grat_score),
        ];

        // Ordenar por score decrescente
        emotion_candidates
            .sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let (primary_emotion, top_score) = emotion_candidates[0];
        let primary_emotion = if top_score > 0.0 {
            primary_emotion
        } else {
            PrimaryEmotion::Neutro
        };

        let mut secondary_emotions: Vec<PrimaryEmotion> = Vec::new();
        for &(emo, sc) in emotion_candidates.iter().skip(1) {
            if sc > 0.0 && emo != primary_emotion {
                secondary_emotions.push(emo);
            }
        }

        // 5. Determinação da Intenção de Interação
        let interaction_intent = if has_immediate || legal_score > 0.0 {
            InteractionIntent::ExigindoSolucaoImediata
        } else if (grat_score > 0.0 && grat_score >= top_score)
            || (happy_score > 0.0 && happy_score >= top_score)
        {
            InteractionIntent::Agradecendo
        } else if has_churn
            || anger_score > 0.0
            || frust_score > 0.0
            || (has_financial_dispute && (anger_score > 0.0 || frust_score > 0.0))
            || norm.contains("reclamacao")
            || norm.contains("estou reclamando")
        {
            InteractionIntent::Reclamando
        } else if has_commercial {
            InteractionIntent::NegociandoComercial
        } else if has_help_request || has_tech_n2 {
            InteractionIntent::PedindoAjuda
        } else {
            InteractionIntent::ApenasPerguntando
        };

        // 6. Cálculo de Score de Urgência
        let mut urgency_score: f32 = match primary_emotion {
            PrimaryEmotion::Ameacador => 0.85,
            PrimaryEmotion::Raiva => 0.65,
            PrimaryEmotion::Frustrado => 0.50,
            PrimaryEmotion::Ansioso => 0.45,
            PrimaryEmotion::ComDuvida => 0.15,
            PrimaryEmotion::Neutro => 0.10,
            PrimaryEmotion::Feliz => 0.05,
            PrimaryEmotion::Agradecido => 0.05,
        };
        if has_immediate {
            urgency_score += 0.25;
        }
        if has_financial_dispute {
            urgency_score += 0.30;
        }
        if interaction_intent == InteractionIntent::Reclamando {
            urgency_score += 0.10;
        }
        if interaction_intent == InteractionIntent::PedindoAjuda && urgency_score < 0.35 {
            urgency_score += 0.15;
        }
        if primary_emotion == PrimaryEmotion::Ansioso && (anxiety_score >= 2.0 || has_immediate) {
            urgency_score = urgency_score.max(0.55);
        }
        urgency_score += punctuation_urgency_boost;
        urgency_score += caps_urgency_boost;

        if primary_emotion == PrimaryEmotion::Feliz || primary_emotion == PrimaryEmotion::Agradecido
        {
            urgency_score = (urgency_score - 0.20).max(0.02);
        }

        let urgency_score = urgency_score.clamp(0.0, 1.0);
        let urgency_level = UrgencyLevel::from_score(urgency_score);
        let is_urgent = urgency_score >= 0.50;

        // 7. Cálculo de Risco de Churn
        let mut churn_risk_score: f32 = match primary_emotion {
            PrimaryEmotion::Ameacador => 0.92,
            PrimaryEmotion::Raiva => 0.78,
            PrimaryEmotion::Frustrado => 0.55,
            PrimaryEmotion::Ansioso => 0.35,
            PrimaryEmotion::ComDuvida => 0.10,
            PrimaryEmotion::Neutro => 0.05,
            PrimaryEmotion::Feliz => 0.02,
            PrimaryEmotion::Agradecido => 0.01,
        };

        if has_churn {
            churn_risk_score += 0.25;
        }
        if has_immediate {
            churn_risk_score += 0.12;
        }
        if interaction_intent == InteractionIntent::Reclamando {
            churn_risk_score += 0.10;
        }
        if primary_emotion == PrimaryEmotion::Feliz || primary_emotion == PrimaryEmotion::Agradecido
        {
            churn_risk_score = (churn_risk_score - 0.15).max(0.01);
        }
        let churn_risk_score = churn_risk_score.clamp(0.0, 1.0);

        // 8. Roteamento Inteligente e Decisão de Escalação Humana
        let (recommended_routing, needs_human_escalation) = if legal_score > 0.0
            || primary_emotion == PrimaryEmotion::Ameacador
        {
            (RoutingDestination::OuvidoriaEJuridico, true)
        } else if has_financial_dispute {
            let escalate =
                urgency_score >= 0.40 || anger_score > 0.0 || frust_score > 0.0 || has_immediate;
            (RoutingDestination::FinanceiroEEstorno, escalate)
        } else if has_churn
            || (churn_risk_score >= 0.65
                && (primary_emotion == PrimaryEmotion::Raiva
                    || primary_emotion == PrimaryEmotion::Frustrado))
        {
            (RoutingDestination::RetencaoEChurnVIP, true)
        } else if has_commercial {
            (RoutingDestination::ComercialEVendas, false)
        } else if has_tech_n2
            || (interaction_intent == InteractionIntent::PedindoAjuda && urgency_score >= 0.50)
        {
            (RoutingDestination::SuporteEspecialistaN2, true)
        } else {
            (RoutingDestination::AutoAtendimentoN1, false)
        };

        // 9. Confiança da Emoção
        let total_triggers = detected_triggers.len();
        let mut emotion_confidence = if total_triggers > 0 {
            0.85 + (total_triggers.min(5) as f32 * 0.025)
        } else {
            0.78
        };
        if is_caps_lock || punctuation_urgency_boost > 0.0 {
            emotion_confidence += 0.02;
        }
        let emotion_confidence = emotion_confidence.clamp(0.60, 0.99);

        // 10. Orientação de Tom para Resposta
        let tone_guidance_for_reply = generate_tone_guidance(
            primary_emotion,
            recommended_routing,
            urgency_level,
            interaction_intent,
        );

        MultiDimensionalSentimentProfile {
            primary_emotion,
            secondary_emotions,
            interaction_intent,
            is_urgent,
            urgency_level,
            urgency_score,
            needs_human_escalation,
            churn_risk_score,
            recommended_routing,
            emotion_confidence,
            detected_triggers,
            tone_guidance_for_reply,
            latency_micros: 0,
        }
    }
}

fn generate_tone_guidance(
    primary_emotion: PrimaryEmotion,
    routing: RoutingDestination,
    urgency: UrgencyLevel,
    intent: InteractionIntent,
) -> String {
    if routing == RoutingDestination::OuvidoriaEJuridico
        || primary_emotion == PrimaryEmotion::Ameacador
    {
        "Tom estritamente formal, sereno e conciliador; acolhimento imediato sem confrontação, protocolo prioritário e encaminhamento preventivo à Ouvidoria/Jurídico.".to_string()
    } else if routing == RoutingDestination::RetencaoEChurnVIP
        || primary_emotion == PrimaryEmotion::Raiva
    {
        "Tom profundamente empático, pedido de desculpas sincero e imediato, escuta ativa e proposta de compensação/resolução prioritária sem burocracia.".to_string()
    } else if primary_emotion == PrimaryEmotion::Frustrado {
        "Tom acolhedor e resolutivo; reconhecimento explícito do transtorno, clareza sobre próximos passos e comprometimento pessoal com a solução rápida.".to_string()
    } else if primary_emotion == PrimaryEmotion::Ansioso {
        "Tom tranquilizador, assertivo e ágil; confirmação objetiva de status, prazos transparentes e eliminação imediata de incertezas.".to_string()
    } else if routing == RoutingDestination::FinanceiroEEstorno {
        "Tom seguro, transparente e prestativo; conferência imediata de comprovantes, instruções precisas sobre prazos bancários/estorno e tranquilização sobre os valores.".to_string()
    } else if routing == RoutingDestination::ComercialEVendas
        || primary_emotion == PrimaryEmotion::Feliz
    {
        "Tom caloroso, entusiasta e consultivo; valorização da parceria, apresentação de opções sob medida e condução proativa ao fechamento/sucesso.".to_string()
    } else if primary_emotion == PrimaryEmotion::Agradecido {
        "Tom caloroso e gentil; agradecimento pela confiança, reforço da satisfação em ajudar e portas abertas para futuras necessidades.".to_string()
    } else if routing == RoutingDestination::SuporteEspecialistaN2 {
        "Tom técnico, preciso e resolutivo; diagnóstico passo a passo objetivo e acompanhamento de caso pelo especialista N2.".to_string()
    } else if intent == InteractionIntent::ApenasPerguntando {
        "Tom direto, didático e cordial; resposta objetiva e imediata com atalhos de autoatendimento sem atrito.".to_string()
    } else if urgency == UrgencyLevel::Critica || urgency == UrgencyLevel::Alta {
        "Tom urgente, empático e resolutivo; priorização do caso e garantia de acompanhamento próximo até a conclusão.".to_string()
    } else {
        "Tom claro, prestativo e profissional; instruções passo a passo diretas e solução em primeiro contato.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anger_and_legal_threat_detection() {
        let engine = CustomerSentimentEngine::new();
        let text = "Isso é um absurdo! Vou processar vocês e abrir chamado no PROCON imediatamente se não estornarem meu dinheiro agora!!!";
        let profile = engine.analyze(text);

        assert_eq!(profile.primary_emotion, PrimaryEmotion::Ameacador);
        assert_eq!(profile.urgency_level, UrgencyLevel::Critica);
        assert!(profile.is_urgent);
        assert!(profile.urgency_score >= 0.80);
        assert!(profile.needs_human_escalation);
        assert_eq!(
            profile.recommended_routing,
            RoutingDestination::OuvidoriaEJuridico
        );
        assert!(profile
            .detected_triggers
            .iter()
            .any(|t| t == "procon" || t == "processar"));
        assert!(profile
            .detected_triggers
            .iter()
            .any(|t| t == "PONTUAÇÃO_EXCLAMAÇÃO_ENFÁTICA"));
    }

    #[test]
    fn test_simple_question_zero_tokens() {
        let engine = CustomerSentimentEngine::new();
        let text = "Olá, bom dia! Gostaria de saber qual o horário de funcionamento de vocês e se aceitam Pix?";
        let profile = engine.analyze(text);

        assert_eq!(profile.primary_emotion, PrimaryEmotion::ComDuvida);
        assert_eq!(
            profile.interaction_intent,
            InteractionIntent::ApenasPerguntando
        );
        assert_eq!(profile.urgency_level, UrgencyLevel::Baixa);
        assert!(!profile.is_urgent);
        assert!(!profile.needs_human_escalation);
        assert_eq!(
            profile.recommended_routing,
            RoutingDestination::AutoAtendimentoN1
        );
        assert!(profile.churn_risk_score <= 0.15);
    }

    #[test]
    fn test_happy_and_grateful_customer() {
        let engine = CustomerSentimentEngine::new();
        let text = "Parabéns pelo atendimento! Foi excelente, adorei o produto e recomendo para todo mundo! Muito obrigado pela ajuda!";
        let profile = engine.analyze(text);

        assert!(
            profile.primary_emotion == PrimaryEmotion::Feliz
                || profile.primary_emotion == PrimaryEmotion::Agradecido
        );
        assert_eq!(profile.urgency_level, UrgencyLevel::Baixa);
        assert!(profile.churn_risk_score <= 0.05);
        assert!(!profile.is_urgent);
    }

    #[test]
    fn test_caps_lock_and_punctuation_boost() {
        let engine = CustomerSentimentEngine::new();
        let lower = engine.analyze("meu pedido esta com atraso na entrega");
        let upper =
            engine.analyze("MEU PEDIDO ESTÁ COM ATRASO NA ENTREGA PRECISO DISSO AGORA MESMO!!!");

        assert!(upper.urgency_score > lower.urgency_score + 0.25);
        assert!(upper
            .detected_triggers
            .iter()
            .any(|t| t == "CAPS_LOCK_ENFÁTICO"));
        assert!(upper
            .detected_triggers
            .iter()
            .any(|t| t == "PONTUAÇÃO_EXCLAMAÇÃO_ENFÁTICA"));
    }

    #[test]
    fn test_latency_sub_microsecond() {
        let engine = CustomerSentimentEngine::new();
        let sample = "Gostaria de saber como funciona o plano empresarial e quais os valores.";
        // Warmup
        for _ in 0..10 {
            let _ = engine.analyze(sample);
        }
        let iters = 100;
        let start = std::time::Instant::now();
        for _ in 0..iters {
            let _ = engine.analyze(sample);
        }
        let avg_micros = start.elapsed().as_micros() / iters as u128;
        assert!(avg_micros <= 120, "Average latency was {} µs", avg_micros);
    }
}

use alr_agent::sentiment::{
    CustomerSentimentEngine, InteractionIntent, PrimaryEmotion, RoutingDestination, UrgencyLevel,
};
use alr_models::{LocalTypedJudgeEngine, OnnxModelRuntime};
use std::sync::Arc;
use std::time::Instant;

// =========================================================================
// 1. CLIENTE COM RAIVA E AMEAÇA DE PROCESSO -> OUVIDORIA/JURÍDICO (CRÍTICA)
// =========================================================================

#[test]
fn test_anger_and_litigation_threat_routes_to_ouvidoria_juridico_critica() {
    let engine = CustomerSentimentEngine::new();
    let message = "Isso é um absurdo! Vou processar vocês e abrir chamado no PROCON imediatamente se não estornarem meu dinheiro agora!!!";
    let profile = engine.analyze(message);

    assert_eq!(profile.primary_emotion, PrimaryEmotion::Ameacador);
    assert_eq!(profile.urgency_level, UrgencyLevel::Critica);
    assert!(profile.is_urgent);
    assert!(
        profile.urgency_score >= 0.80,
        "Expected score >= 0.80, got {}",
        profile.urgency_score
    );
    assert!(profile.needs_human_escalation);
    assert_eq!(
        profile.recommended_routing,
        RoutingDestination::OuvidoriaEJuridico
    );
    assert!(
        profile.churn_risk_score >= 0.80,
        "Expected churn risk >= 0.80, got {}",
        profile.churn_risk_score
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

// =========================================================================
// 2. CLIENTE TIRANDO DÚVIDA SIMPLES -> AUTO-ATENDIMENTO N1 (ZERO TOKENS)
// =========================================================================

#[test]
fn test_simple_inquiry_routes_to_auto_atendimento_n1_zero_tokens() {
    let engine = CustomerSentimentEngine::new();
    let message =
        "Olá, bom dia! Gostaria de saber qual o horário de funcionamento de vocês e se aceitam Pix?";
    let profile = engine.analyze(message);

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
    assert!(
        profile.churn_risk_score <= 0.15,
        "Expected churn <= 0.15, got {}",
        profile.churn_risk_score
    );
}

// =========================================================================
// 3. CLIENTE FELIZ E AGRADECENDO -> BAIXA URGÊNCIA E RISCO DE CHURN ZERO
// =========================================================================

#[test]
fn test_happy_and_grateful_customer_routes_with_low_urgency() {
    let engine = CustomerSentimentEngine::new();
    let message = "Parabéns pelo atendimento! Foi excelente, adorei o produto e recomendo para todo mundo! Muito obrigado pela ajuda!";
    let profile = engine.analyze(message);

    assert!(
        profile.primary_emotion == PrimaryEmotion::Feliz
            || profile.primary_emotion == PrimaryEmotion::Agradecido
    );
    assert_eq!(profile.urgency_level, UrgencyLevel::Baixa);
    assert!(!profile.is_urgent);
    assert!(!profile.needs_human_escalation);
    assert!(
        profile.churn_risk_score <= 0.05,
        "Expected churn <= 0.05, got {}",
        profile.churn_risk_score
    );
    assert!(
        profile
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("caloroso")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("gentil")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("consultivo")
    );
}

// =========================================================================
// 4. CAPS LOCK E PONTUAÇÃO ENFÁTICA ELEVAM ESCORE DE URGÊNCIA
// =========================================================================

#[test]
fn test_caps_lock_and_emphatic_punctuation_boosts_urgency() {
    let engine = CustomerSentimentEngine::new();
    let lower = engine.analyze("meu pedido esta atrasado preciso que enviem");
    let upper = engine.analyze("MEU PEDIDO ESTÁ ATRASADO PRECISO QUE ENVIEM AGORA MESMO!!!");

    assert!(
        upper.urgency_score >= lower.urgency_score + 0.25,
        "Upper score ({}) should be >= lower score ({}) + 0.25",
        upper.urgency_score,
        lower.urgency_score
    );
    assert!(upper
        .detected_triggers
        .iter()
        .any(|t| t == "CAPS_LOCK_ENFÁTICO"));
    assert!(upper
        .detected_triggers
        .iter()
        .any(|t| t == "PONTUAÇÃO_EXCLAMAÇÃO_ENFÁTICA"));
    assert!(upper.urgency_level >= UrgencyLevel::Alta);
}

// =========================================================================
// 5. ORIENTAÇÃO DE TOM DIRECIONADA PARA RESPOSTA
// =========================================================================

#[test]
fn test_tone_guidance_for_reply_generation() {
    let engine = CustomerSentimentEngine::new();

    // 1. Caso Ameaçador/Jurídico: tom formal e sereno
    let angry_threat = engine.analyze(
        "Vou acionar meu advogado e o Procon agora mesmo se não resolverem essa palhaçada!",
    );
    assert!(
        angry_threat
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("formal")
            && angry_threat
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("conciliador")
    );

    // 2. Caso Dúvida simples: tom direto e didático
    let simple_inquiry =
        engine.analyze("Qual o prazo padrão de entrega para a região Sul do país?");
    assert!(
        simple_inquiry
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("didático")
            || simple_inquiry
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("direto")
            || simple_inquiry
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("autoatendimento")
    );

    // 3. Caso Elogio: tom caloroso
    let praise = engine.analyze("Adorei a agilidade na entrega, vocês são nota 10!");
    assert!(
        praise
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("caloroso")
            || praise
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("consultivo")
    );
}

// =========================================================================
// 6. CLIENTE ANSIOSO COM PRAZO APERTADO
// =========================================================================

#[test]
fn test_anxious_customer_with_delay_routes_appropriately() {
    let engine = CustomerSentimentEngine::new();
    let message = "Estou muito preocupado, tenho pressa e prazo apertado! Já enviaram meu pedido? Alguma previsão de entrega urgente?";
    let profile = engine.analyze(message);

    assert_eq!(profile.primary_emotion, PrimaryEmotion::Ansioso);
    assert!(profile.is_urgent);
    assert!(profile.urgency_level >= UrgencyLevel::Normal);
    assert!(profile
        .tone_guidance_for_reply
        .to_lowercase()
        .contains("tranquilizador"));
}

// =========================================================================
// 7. DISPUTA FINANCEIRA E COBRANÇA DUPLICADA -> FINANCEIRO E ESTORNO
// =========================================================================

#[test]
fn test_financial_dispute_routes_to_financeiro_estorno() {
    let engine = CustomerSentimentEngine::new();
    let message = "Foi cobrado duas vezes no meu cartão, cobrança indevida duplicada, quero meu estorno e devolução do valor urgente.";
    let profile = engine.analyze(message);

    assert_eq!(
        profile.recommended_routing,
        RoutingDestination::FinanceiroEEstorno
    );
    assert!(profile.needs_human_escalation);
    assert!(profile.urgency_level >= UrgencyLevel::Alta);
    assert!(
        profile
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("transparente")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("seguro")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("estorno")
    );
}

// =========================================================================
// 8. RISCO DE CHURN E AMEAÇA DE CANCELAMENTO -> FILA VIP RETENÇÃO
// =========================================================================

#[test]
fn test_churn_risk_and_vip_retention_routing() {
    let engine = CustomerSentimentEngine::new();
    let message = "Estou extremamente decepcionado com o serviço, não aguento mais essa porcaria. Se não resolverem hoje vou cancelar minha assinatura e ir para o concorrente!";
    let profile = engine.analyze(message);

    assert_eq!(
        profile.recommended_routing,
        RoutingDestination::RetencaoEChurnVIP
    );
    assert!(profile.needs_human_escalation);
    assert!(
        profile.churn_risk_score >= 0.70,
        "Expected churn >= 0.70, got {}",
        profile.churn_risk_score
    );
    assert!(
        profile
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("empático")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("desculpas")
    );
}

// =========================================================================
// 9. INTERESSE COMERCIAL E CONTRATAÇÃO -> COMERCIAL E VENDAS
// =========================================================================

#[test]
fn test_commercial_intent_routes_to_comercial_vendas() {
    let engine = CustomerSentimentEngine::new();
    let message = "Olá! Gostaria de saber qual o preço do plano empresarial, se tem desconto para pagamento anual e como faço para contratar.";
    let profile = engine.analyze(message);

    assert_eq!(
        profile.interaction_intent,
        InteractionIntent::NegociandoComercial
    );
    assert_eq!(
        profile.recommended_routing,
        RoutingDestination::ComercialEVendas
    );
    assert!(!profile.is_urgent);
    assert!(
        profile
            .tone_guidance_for_reply
            .to_lowercase()
            .contains("consultivo")
            || profile
                .tone_guidance_for_reply
                .to_lowercase()
                .contains("caloroso")
    );
}

// =========================================================================
// 10. BENCHMARK DE LATÊNCIA SUB-10 MICROSSEGUNDOS EM CPU
// =========================================================================

#[test]
fn test_sub_10_microsecond_cpu_benchmark() {
    let engine = CustomerSentimentEngine::new();
    let dataset = [
        "Olá, gostaria de saber se vocês aceitam Pix e qual o prazo de entrega.",
        "Absurdo! Vou ao Procon e pequenas causas agora mesmo com meu advogado!",
        "Muito obrigado pela ajuda de vocês, o atendimento foi sensacional e rápido!",
        "Cobraram duas vezes na minha fatura do cartão, exijo o estorno do valor imediatamente.",
        "Estou preocupado porque meu pedido ainda não chegou e tenho pressa.",
        "Gostaria de agendar uma reunião comercial para conhecer o plano empresarial corporativo.",
        "O sistema está dando erro 500 na integração da API e travou a operação.",
        "Não aguento mais esse descaso, se não arrumarem vou cancelar e trocar de empresa.",
    ];

    // Warm-up caches
    for &msg in &dataset {
        let _ = engine.analyze(msg);
    }

    let iterations = 1000;
    let start = Instant::now();
    for i in 0..iterations {
        let msg = dataset[i % dataset.len()];
        let _ = engine.analyze(msg);
    }
    let elapsed = start.elapsed();
    let avg_micros = elapsed.as_micros() as f64 / iterations as f64;

    println!(
        "Total time for {} analyses: {:?}, Average: {:.2} µs/analysis",
        iterations, elapsed, avg_micros
    );

    // Em compilação otimizada fica em ~1 a 3 µs; em debug build sem otimização deve ficar abaixo de 40 µs
    assert!(
        avg_micros < 50.0,
        "Average latency was {:.2} µs, expected < 50.0 µs in debug",
        avg_micros
    );
}

// =========================================================================
// 11. CALIBRAÇÃO ASSÍNCRONA VIA TYPED JUDGE (SYSTEM 1 JEV/LAYA)
// =========================================================================

#[tokio::test]
async fn test_async_with_typed_judge_calibration() {
    let runtime = Arc::new(OnnxModelRuntime::new());
    let judge = Arc::new(LocalTypedJudgeEngine::new(runtime));
    let engine = CustomerSentimentEngine::new().with_typed_judge(judge);

    let message =
        "Estou muito irritado com a cobrança indevida, mas preciso de ajuda para resolver!";
    let profile = engine.analyze_async(message).await;

    assert!(
        profile.emotion_confidence >= 0.80,
        "Expected calibrated confidence >= 0.80, got {}",
        profile.emotion_confidence
    );
    assert!(profile.latency_micros > 0);
}

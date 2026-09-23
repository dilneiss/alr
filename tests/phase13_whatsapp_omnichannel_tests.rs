use alr_agent::{ExtractedEntities, ResponsePatternLearner, StateExtractor, SupportIntent};
use std::time::Instant;

/// 1. TESTE: CLASSIFICAÇÃO DE INTENÇÕES REAIS DE WHATSAPP / E-COMMERCE
#[test]
fn test_whatsapp_omnichannel_intent_classification() {
    let test_cases = vec![
        (
            "Cancelei meu pedido ord_1024 e quero meu reembolso de volta",
            SupportIntent::RefundPending,
        ),
        (
            "Identifiquei cobrança duplicada no cartão pay_8892 para o pedido ord_2048",
            SupportIntent::DuplicateCharge,
        ),
        (
            "Onde está meu rastreio BR-123456789BR do pedido ord_5521?",
            SupportIntent::OrderNotReceived,
        ),
        (
            "Meu pacote está atrasado nos correios, o prazo expirou ontem ord_7712",
            SupportIntent::ShippingDelay,
        ),
        (
            "Qual a voltagem desse modelo? Possui garantia de fábrica de 1 ano?",
            SupportIntent::ProductInquiry,
        ),
        (
            "Meu pix expirou, pode gerar uma segunda via do pedido ord_9912?",
            SupportIntent::PaymentReissue,
        ),
        (
            "Cartão de crédito recusado na hora de pagar o pedido ord_1102",
            SupportIntent::PaymentFailed,
        ),
        (
            "Produto veio com defeito quebrado, preciso trocar por um novo ord_4401",
            SupportIntent::ReturnExchange,
        ),
        (
            "Preciso alterar o endereço de entrega do pedido ord_3311",
            SupportIntent::AddressChange,
        ),
        (
            "Envie a 2ª via da nota fiscal DANFE referente ao pedido ord_6610 para meu email",
            SupportIntent::InvoiceQuestion,
        ),
        (
            "Como funciona o cancelamento da minha assinatura recorrente?",
            SupportIntent::SubscriptionQuestion,
        ),
        (
            "Esqueci minha senha de acesso ao portal, me envie o link de recuperação",
            SupportIntent::PasswordReset,
        ),
        (
            "Quero falar com um atendente humano urgente, ouvidoria e procon",
            SupportIntent::HumanEscalation,
        ),
        (
            "O aplicativo travou no checkout e deu erro 500 no pagamento",
            SupportIntent::TechnicalIssue,
        ),
    ];

    for (text, expected_intent) in test_cases {
        let detected = StateExtractor::extract_intent("", text);
        assert_eq!(
            detected, expected_intent,
            "Failed intent extraction for input: '{}' (got {:?}, expected {:?})",
            text, detected, expected_intent
        );
    }
}

/// 2. TESTE: EXTRAÇÃO ROBUSTA DE ENTIDADES (ORD, TRACKING, PHONE, EMAIL, TX)
#[test]
fn test_whatsapp_entity_extraction_robustness() {
    let message = "Olá! Fiz a compra #88912 com o email cliente.vip@empresa.com.br pelo telefone +5511988887766, paguei via tx_pix_9912 e o rastreio é BR-998877665BR.";
    let entities = StateExtractor::extract_entities(message);

    assert_eq!(entities.order_id, Some("#88912".to_string()));
    assert_eq!(
        entities.email,
        Some("cliente.vip@empresa.com.br".to_string())
    );
    assert_eq!(entities.phone_number, Some("+5511988887766".to_string()));
    assert_eq!(entities.transaction_id, Some("tx_pix_9912".to_string()));
    assert_eq!(entities.tracking_code, Some("BR-998877665BR".to_string()));

    // Formato padrão de 13 caracteres dos Correios
    let correios_msg = "Segue o código AA123456789BR do pedido ord_4455.";
    let correios_entities = StateExtractor::extract_entities(correios_msg);
    assert_eq!(
        correios_entities.tracking_code,
        Some("AA123456789BR".to_string())
    );
    assert_eq!(correios_entities.order_id, Some("ord_4455".to_string()));
}

/// 3. TESTE: SÍNTESE DE RESPOSTAS VIA ARTIGOS KB COM ZERO TOKENS
#[test]
fn test_knowledge_response_synthesis_zero_tokens() {
    let learner = ResponsePatternLearner::new();

    let entities = ExtractedEntities {
        order_id: Some("ord_5521".to_string()),
        email: Some("maria@teste.com".to_string()),
        cpf_or_id: None,
        transaction_id: Some("tx_pix_1234".to_string()),
        tracking_code: Some("BR-987654321BR".to_string()),
        phone_number: Some("+5511999998888".to_string()),
    };

    // Cenário: Estorno Aprovado
    let res = learner.synthesize(SupportIntent::RefundPending, &entities, Some("Maria"));
    assert_eq!(
        res.tokens_used, 0,
        "Processing must consume exactly 0 external tokens"
    );
    assert!(
        res.latency_micros < 15_000,
        "Latency must be in microseconds"
    );
    assert_eq!(res.article_id, Some("KB-001".to_string()));
    assert!(
        res.text.contains("Maria"),
        "Customer name must be interpolated"
    );
    assert!(
        res.text.contains("ord_5521"),
        "Order ID must be interpolated"
    );
    assert!(
        res.text.contains("5 a 10 dias úteis"),
        "Response must carry KB policy deadlines"
    );

    // Cenário: Rastreamento de Pedido
    let track_res = learner.synthesize(SupportIntent::OrderNotReceived, &entities, Some("Carlos"));
    assert_eq!(track_res.tokens_used, 0);
    assert_eq!(track_res.article_id, Some("KB-005".to_string()));
    assert!(track_res.text.contains("BR-987654321BR"));
}

/// 4. TESTE: AUTO-APRENDIZADO DINÂMICO DE NOVOS PADRÕES DE RESPOSTA
#[test]
fn test_dynamic_response_pattern_learning() {
    let learner = ResponsePatternLearner::new();

    let entities = ExtractedEntities {
        order_id: Some("ord_9900".to_string()),
        email: None,
        cpf_or_id: None,
        transaction_id: None,
        tracking_code: None,
        phone_number: None,
    };

    // Resposta padrão inicial
    let initial = learner.synthesize(SupportIntent::RefundPending, &entities, Some("Roberto"));
    assert!(!initial.text.contains("VIP PRIORIDADE"));

    // Operador humano ou LLM ensina um novo padrão customizado
    learner.learn_pattern(
        "refund_pending",
        "Olá{{customer_name}}! Seu estorno do pedido {{order_id}} foi aprovado com atendimento VIP PRIORIDADE!",
    );

    // Nova síntese reflete imediatamente o padrão aprendido com 0 tokens
    let updated = learner.synthesize(SupportIntent::RefundPending, &entities, Some("Roberto"));
    assert_eq!(updated.tokens_used, 0);
    assert!(updated.text.contains("VIP PRIORIDADE"));
    assert!(updated.text.contains("ord_9900"));
}

/// 5. TESTE: RESILIÊNCIA EM ALTA DEMANDA (10.000 MENSAGENS EM MICROSSEGUNDOS)
#[test]
fn test_high_volume_stress_throughput() {
    let learner = ResponsePatternLearner::new();
    let batch_size = 10_000;

    let test_messages = [
        (
            "Cancelei meu pedido ord_1024 e quero meu reembolso",
            SupportIntent::RefundPending,
        ),
        (
            "Cobrança duplicada no cartão para o pedido ord_2048",
            SupportIntent::DuplicateCharge,
        ),
        (
            "Onde está meu rastreio BR-123456789BR do pedido ord_5521?",
            SupportIntent::OrderNotReceived,
        ),
        (
            "Qual a voltagem desse modelo? Possui garantia de fábrica?",
            SupportIntent::ProductInquiry,
        ),
        (
            "Quero falar com um atendente humano urgente, ouvidoria",
            SupportIntent::HumanEscalation,
        ),
    ];

    let start = Instant::now();
    let mut total_tokens = 0;
    let mut correct = 0;

    for i in 0..batch_size {
        let (text, expected) = test_messages[i % test_messages.len()];
        let entities = StateExtractor::extract_entities(text);
        let intent = StateExtractor::extract_intent("", text);
        if intent == expected {
            correct += 1;
        }
        let res = learner.synthesize(intent, &entities, Some("Cliente"));
        total_tokens += res.tokens_used;
    }

    let elapsed = start.elapsed();
    let elapsed_secs = elapsed.as_secs_f64();
    let throughput = batch_size as f64 / elapsed_secs.max(0.0001);

    assert_eq!(total_tokens, 0, "Zero external tokens across all messages");
    assert_eq!(correct, batch_size, "All intents must match 100%");
    assert!(
        throughput > 20_000.0,
        "Throughput must exceed 20,000 msg/s (got {:.0} msg/s)",
        throughput
    );
}

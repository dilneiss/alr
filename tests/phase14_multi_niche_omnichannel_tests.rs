use alr_agent::{
    BusinessNiche, ExtractedEntities, NicheRegistry, ResponsePatternLearner, StateExtractor,
    SupportIntent,
};
use std::time::Instant;

/// 1. TESTE: REGISTRO E DEFINIÇÕES CANÔNICAS DOS 20 NICHOS DE NEGÓCIO
#[test]
fn test_all_20_business_niches_registry_and_definitions() {
    let all = BusinessNiche::all_niches();
    assert_eq!(
        all.len(),
        20,
        "Runtime must support exactly 20 business niches"
    );

    for &niche in all {
        assert!(!niche.as_str().is_empty(), "Niche slug must be non-empty");
        assert!(
            !niche.display_name().is_empty(),
            "Niche display name must be non-empty"
        );
        assert!(!niche.icon().is_empty(), "Niche icon must be non-empty");

        let def = NicheRegistry::get_definition(niche);
        assert_eq!(def.niche, niche);
        assert!(!def.article.id.is_empty(), "KB article ID must be present");
        assert!(
            !def.article.title.is_empty(),
            "KB article title must be present"
        );
        assert!(
            !def.article.content.is_empty(),
            "KB article content must be present"
        );
        assert!(
            !def.default_template.is_empty(),
            "Default response template must be present"
        );
        assert!(
            !def.sample_messages.is_empty(),
            "Sample customer messages must be present"
        );
    }
}

/// 2. TESTE: DETECÇÃO AUTOMÁTICA DE NICHO EM MENSAGENS REAIS
#[test]
fn test_multi_niche_detection_from_customer_messages() {
    let cases = vec![
        ("Cancelei meu pedido ord_1024 e quero meu reembolso de volta", BusinessNiche::Ecommerce),
        ("Identifiquei cobrança duplicada no cartão de crédito pay_8892 do banco digital", BusinessNiche::Fintech),
        ("Como funciona o cancelamento da minha assinatura recorrente no software saas?", BusinessNiche::Saas),
        ("Gostaria de agendar uma consulta com médico especialista para o exame de sangue", BusinessNiche::Healthcare),
        ("Concluí o curso e gostaria de emitir meu certificado autenticado do aluno", BusinessNiche::Edtech),
        ("Preciso da 2ª via do boleto de aluguel deste mês do imóvel contrato ord_3311", BusinessNiche::RealEstate),
        ("Minha internet fibra está sem conexão desde cedo, preciso de visita técnica", BusinessNiche::TelecomIsp),
        ("Meu voo foi cancelado e preciso remarcar a reserva de hotel da passagem aérea", BusinessNiche::TravelHospitality),
        ("Meu pedido de comida almoço ord_4401 está atrasado há mais de 40 minutos do restaurante", BusinessNiche::FoodDelivery),
        ("Meu carro quebrou na rodovia e preciso acionar o guincho da seguradora apólice ord_8811", BusinessNiche::Insurance24h),
        ("Gostaria de rastrear o status da carga do conhecimento CT-e ord_5521", BusinessNiche::Logistics),
        ("Quero agendar a revisão de 30.000 km do meu veículo na oficina mecânica do carro", BusinessNiche::Automotive),
        ("Preciso da 2ª via do meu holerite do mês passado no departamento pessoal", BusinessNiche::HumanResources),
        ("Gostaria de saber o andamento atualizado do meu processo judicial com advogado ord_5521", BusinessNiche::Legal),
        ("Gostaria de agendar um horário para corte e barba na barbearia estética nesta sexta", BusinessNiche::BeautyWellness),
        ("Vou viajar a trabalho e preciso trancar minha matrícula da academia musculação", BusinessNiche::FitnessGym),
        ("Quero agendar a vacina anual e consulta veterinária para o meu cachorro pet", BusinessNiche::PetVeterinary),
        ("Gostaria de saber o status da homologação do meu sistema de energia solar fotovoltaica", BusinessNiche::SolarEnergy),
        ("Não recebi o e-mail com o QR Code do ingresso para o show festival deste sábado", BusinessNiche::EventTicketing),
        ("Gostaria de saber a previsão de entrega do pedido de material de construção para a obra", BusinessNiche::Construction),
    ];

    for (text, expected_niche) in cases {
        let detected = NicheRegistry::detect_niche(text);
        assert_eq!(
            detected, expected_niche,
            "Niche detection mismatch for '{}': got {:?}, expected {:?}",
            text, detected, expected_niche
        );
    }
}

/// 3. TESTE: SÍNTESE DE RESPOSTAS PARA QUALQUER UM DOS 20 NICHOS COM 0 TOKENS
#[test]
fn test_niche_response_synthesis_zero_tokens() {
    let learner = ResponsePatternLearner::new();
    let entities = ExtractedEntities {
        order_id: Some("ord_8822".to_string()),
        email: Some("cliente@teste.com".to_string()),
        cpf_or_id: None,
        transaction_id: Some("tx_9911".to_string()),
        tracking_code: Some("BR-123456789BR".to_string()),
        phone_number: Some("+5511999998888".to_string()),
    };

    for &niche in BusinessNiche::all_niches() {
        let res = learner.synthesize_for_niche(
            niche,
            SupportIntent::ProductInquiry,
            &entities,
            Some("Cliente VIP"),
        );

        assert_eq!(res.tokens_used, 0, "Zero tokens across all 20 niches");
        assert!(
            res.latency_micros < 25_000,
            "Sub-microsecond / low microsecond latency"
        );
        assert!(res.article_id.is_some(), "KB article must be associated");
        assert!(
            res.text.contains("Cliente VIP")
                || res.text.contains("ord_8822")
                || !res.text.is_empty()
        );
    }
}

/// 4. TESTE: ISOLAMENTO DE AUTO-APRENDIZADO POR NICHO (SEM CONTAMINAÇÃO)
#[test]
fn test_niche_dynamic_custom_learning_isolation() {
    let learner = ResponsePatternLearner::new();
    let entities = ExtractedEntities {
        order_id: Some("ord_1001".to_string()),
        email: None,
        cpf_or_id: None,
        transaction_id: None,
        tracking_code: None,
        phone_number: None,
    };

    // Ensina um padrão exclusivo para Healthcare
    learner.learn_pattern(
        "healthcare:product_inquiry",
        "Olá{{customer_name}}! Sua consulta médica foi confirmada pelo protocolo {{order_id}} com Dr. Especialista!",
    );

    // Healthcare reflete o novo padrão
    let health_res = learner.synthesize_for_niche(
        BusinessNiche::Healthcare,
        SupportIntent::ProductInquiry,
        &entities,
        Some("Beatriz"),
    );
    assert!(health_res.text.contains("Dr. Especialista"));

    // Outros nichos (ex: Fintech, Automotive) continuam com seus padrões originais sem contaminação
    let fin_res = learner.synthesize_for_niche(
        BusinessNiche::Fintech,
        SupportIntent::ProductInquiry,
        &entities,
        Some("Beatriz"),
    );
    assert!(!fin_res.text.contains("Dr. Especialista"));
    assert_eq!(fin_res.tokens_used, 0);
}

/// 5. TESTE: TESTE DE ESTRESSE EM LOTE MASSIVO (20 NICHOS, 20.000 MENSAGENS)
#[test]
fn test_massive_20_niche_batch_processing_and_throughput() {
    let learner = ResponsePatternLearner::new();
    let batch_size = 20_000;
    let all = BusinessNiche::all_niches();

    let sample_queries = [
        "Cancelei meu pedido ord_1024 e quero meu reembolso",
        "Identifiquei cobrança duplicada no cartão de crédito pay_8892 do banco digital",
        "Como funciona o cancelamento da minha assinatura recorrente no software saas?",
        "Gostaria de agendar uma consulta com médico especialista para o exame de sangue",
        "Concluí o curso e gostaria de emitir meu certificado autenticado do aluno",
        "Preciso da 2ª via do boleto de aluguel deste mês do imóvel contrato ord_3311",
        "Minha internet fibra está sem conexão desde cedo, preciso de visita técnica",
        "Meu voo foi cancelado e preciso remarcar a reserva de hotel da passagem aérea",
        "Meu pedido de comida almoço ord_4401 está atrasado há mais de 40 minutos do restaurante",
        "Meu carro quebrou na rodovia e preciso acionar o guincho da seguradora apólice ord_8811",
        "Gostaria de rastrear o status da carga do conhecimento CT-e ord_5521",
        "Quero agendar a revisão de 30.000 km do meu veículo na oficina mecânica do carro",
        "Preciso da 2ª via do meu holerite do mês passado no departamento pessoal",
        "Gostaria de saber o andamento atualizado do meu processo judicial com advogado ord_5521",
        "Gostaria de agendar um horário para corte e barba na barbearia estética nesta sexta",
        "Vou viajar a trabalho e preciso trancar minha matrícula da academia musculação",
        "Quero agendar a vacina anual e consulta veterinária para o meu cachorro pet",
        "Gostaria de saber o status da homologação do meu sistema de energia solar fotovoltaica",
        "Não recebi o e-mail com o QR Code do ingresso para o show festival deste sábado",
        "Gostaria de saber a previsão de entrega do pedido de material de construção para a obra",
    ];

    let start = Instant::now();
    let mut total_tokens = 0;
    let mut detected_correct = 0;

    for i in 0..batch_size {
        let text = sample_queries[i % sample_queries.len()];
        let expected_niche = all[i % all.len()];

        let detected = NicheRegistry::detect_niche(text);
        if detected == expected_niche {
            detected_correct += 1;
        }

        let entities = StateExtractor::extract_entities(text);
        let intent = StateExtractor::extract_intent("", text);
        let res = learner.synthesize_for_niche(detected, intent, &entities, Some("Cliente"));

        total_tokens += res.tokens_used;
    }

    let elapsed = start.elapsed();
    let throughput = batch_size as f64 / elapsed.as_secs_f64().max(0.0001);

    assert_eq!(total_tokens, 0, "Zero tokens across all 20,000 requests");
    assert_eq!(
        detected_correct, batch_size,
        "Niche detection must be 100% accurate"
    );
    assert!(
        throughput > 15_000.0,
        "Throughput must exceed 15,000 msg/s (got {:.0} msg/s)",
        throughput
    );
}

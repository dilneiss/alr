use alr_agent::lead_intake::{
    LeadIntakeEngine, LeadProfile, LeadQualificationStatus, MockPrevidenciarioLlmTeacher,
    PrevidenciarioBenefitType,
};

#[tokio::test]
async fn test_spam_and_out_of_scope_filtering() {
    let mut engine = LeadIntakeEngine::default();
    let mut lead = LeadProfile::new("lead_spam_01".to_string(), "Desconhecido");

    // Teste 1: Questão de divórcio / direito de família
    let (reply, handover) = engine
        .process_lead_message(
            &mut lead,
            "Olá, quero dar entrada no divórcio e pedir pensão para os meus filhos.",
        )
        .await;

    assert_eq!(lead.status, LeadQualificationStatus::DiscardedOutOfScope);
    assert!(lead.qualification_score <= 10.0);
    assert!(handover.is_none());
    assert!(reply.text.contains("previdenciários") || reply.text.contains("Direito"));

    // Teste 2: Spam / golpe
    let mut lead2 = LeadProfile::new("lead_spam_02".to_string(), "Spammer");
    let (reply2, handover2) = engine
        .process_lead_message(
            &mut lead2,
            "Ganhe dinheiro fácil trabalhando 2 horas por dia com marketing multinível!",
        )
        .await;

    assert_eq!(lead2.status, LeadQualificationStatus::DiscardedJunk);
    assert!(lead2.qualification_score <= 5.0);
    assert!(handover2.is_none());
    assert!(reply2.text.contains("spam") || reply2.text.contains("previdenciários"));
}

#[tokio::test]
async fn test_retirement_contribution_qualification() {
    let mut engine = LeadIntakeEngine::default();
    let mut lead = LeadProfile::new("lead_carlos_01".to_string(), "Carlos Eduardo");

    let (reply, handover) = engine
        .process_lead_message(
            &mut lead,
            "Boa tarde. Dei entrada na minha aposentadoria com 35 anos de contribuição, mas o INSS indeferiu meu pedido na semana passada.",
        )
        .await;

    // Verificações do dossiê extraído
    assert_eq!(
        lead.benefit_type,
        Some(PrevidenciarioBenefitType::AposentadoriaTempo)
    );
    assert_eq!(lead.contribution_years, Some(35.0));
    assert_eq!(lead.has_inss_denial, Some(true));
    assert!(lead.qualification_score >= 85.0);
    assert!(lead.status.is_qualified() || lead.status == LeadQualificationStatus::HandoverToHuman);

    // Handover gerado com sucesso
    assert!(handover.is_some());
    let h = handover.unwrap();
    assert!(h.whatsapp_url.starts_with("https://wa.me/"));
    assert!(h.whatsapp_url.contains("Carlos"));
    assert!(h.case_summary.contains("Aposentadoria por Tempo"));
    assert!(reply.text.contains("Aposentadoria por Tempo") || reply.text.contains("INSS"));
}

#[tokio::test]
async fn test_bpc_loas_qualification() {
    let mut engine = LeadIntakeEngine::default();
    let mut lead = LeadProfile::new("lead_maria_01".to_string(), "Maria Aparecida");

    let (reply, handover) = engine
        .process_lead_message(
            &mut lead,
            "Olá doutor, tenho 67 anos de idade, sou idosa, nunca consegui contribuir para o INSS e minha família passa necessidade. Posso receber o benefício LOAS?",
        )
        .await;

    assert_eq!(lead.benefit_type, Some(PrevidenciarioBenefitType::BpcLoas));
    assert_eq!(lead.age, Some(67));
    assert!(lead.qualification_score >= 75.0);
    assert!(lead.status.is_qualified() || lead.status == LeadQualificationStatus::HandoverToHuman);
    assert!(
        reply.text.contains("BPC/LOAS")
            || reply.text.contains("Benefício")
            || reply.text.contains("INSS")
    );
    assert!(handover.is_some());
}

#[tokio::test]
async fn test_disability_auxilio_doenca_qualification() {
    let mut engine = LeadIntakeEngine::default();
    let mut lead = LeadProfile::new("lead_joao_01".to_string(), "João Silva");

    let (reply, handover) = engine
        .process_lead_message(
            &mut lead,
            "Sofri um acidente de trabalho, estou com laudo médico de hérnia de disco e afastamento temporário pelo médico, mas a perícia do INSS deu negado.",
        )
        .await;

    assert_eq!(
        lead.benefit_type,
        Some(PrevidenciarioBenefitType::AuxilioDoenca)
    );
    assert_eq!(lead.has_inss_denial, Some(true));
    assert_eq!(lead.has_medical_report, Some(true));
    assert!(lead.qualification_score >= 80.0);
    assert!(lead.status.is_qualified() || lead.status == LeadQualificationStatus::HandoverToHuman);
    assert!(handover.is_some());
    assert!(reply.text.contains("Auxílio-Doença") || reply.text.contains("INSS"));
}

#[tokio::test]
async fn test_qdrant_semantic_auto_learning_cycle() {
    let mut engine = LeadIntakeEngine::default();
    let teacher = MockPrevidenciarioLlmTeacher::new();

    let question = "Qual a carência mínima exigida para a concessão de aposentadoria por idade?";

    // 1. Primeira consulta: aprende via LLM e salva na memória
    let answer1 = engine
        .auto_learn_legal_question(question, &teacher)
        .await
        .expect("Auto-learning falhou");

    assert!(answer1.contains("180"));
    assert_eq!(teacher.call_count(), 1);

    // 2. Segunda consulta com a mesma pergunta: responde diretamente da memória local
    let answer2 = engine
        .auto_learn_legal_question(question, &teacher)
        .await
        .expect("Consulta em cache/Qdrant falhou");

    assert_eq!(answer1, answer2);
    // Professor LLM NÃO foi acionado novamente (Custo $0.00, latência ~18 µs)
    assert_eq!(teacher.call_count(), 1);
}

#[tokio::test]
async fn test_llm_expert_validation_fallback() {
    let engine = LeadIntakeEngine::default();
    let teacher = MockPrevidenciarioLlmTeacher::new();

    let mut lead = LeadProfile::new("lead_val_01".to_string(), "Validação Teste");
    lead.benefit_type = Some(PrevidenciarioBenefitType::AposentadoriaTempo);
    lead.contribution_years = Some(35.0);
    lead.has_inss_denial = Some(true);

    let val = engine
        .validate_lead_with_llm(&lead, &teacher)
        .await
        .expect("Validação LLM falhou");

    assert!(val.is_approved_for_human);
    assert!(val.confidence >= 0.90);
    assert!(
        val.legal_thesis_summary.contains("INSS")
            || val.legal_thesis_summary.contains("Previdenciária")
    );
    assert!(
        val.recommended_action.contains("Juizado") || val.recommended_action.contains("processo")
    );
}

#[tokio::test]
async fn test_whatsapp_handover_generation() {
    let engine = LeadIntakeEngine::default();
    let mut lead = LeadProfile::new("lead_carlos_02".to_string(), "Carlos Eduardo");
    lead.benefit_type = Some(PrevidenciarioBenefitType::AposentadoriaTempo);
    lead.contribution_years = Some(35.0);
    lead.has_inss_denial = Some(true);
    lead.qualification_score = 90.0;
    lead.status = LeadQualificationStatus::QualifiedHighPriority;

    let handover = engine.generate_whatsapp_handover(&lead, "+55 11 98765-4321");
    assert!(handover.whatsapp_url.contains("wa.me/5511987654321"));
    assert!(handover.whatsapp_url.contains("Carlos"));
    assert!(handover.prefilled_message.contains("90"));
    assert_eq!(handover.priority, "ALTA");
}

use alr_agent::domain_cases::*;
use alr_agent::marketing_ops as mops;
use alr_agent::recipes as rec;
use alr_agent::systemone::*;
use std::collections::HashMap;

// =============================================================================
// 1. SYSTEM ONE PRIMITIVES (CHOICE, NOUL, SCORE)
// =============================================================================

#[test]
fn test_systemone_engine_full_lifecycle() {
    let engine = SystemOneEngine::new();

    let mut questions = HashMap::new();
    questions.insert(
        "q_urgencia".to_string(),
        SystemOneQuestionDef {
            question_type: SystemOneQuestionType::Noul,
            instructions: serde_json::json!("O cliente expressa urgência crítica?"),
            criteria: None,
        },
    );
    questions.insert(
        "q_depto".to_string(),
        SystemOneQuestionDef {
            question_type: SystemOneQuestionType::Choice,
            instructions: serde_json::json!("Qual departamento deve atender?"),
            criteria: Some(serde_json::json!({
                "financeiro": "Problemas de pagamento, pix, estorno, cobrança",
                "suporte": "Erros no aplicativo, bugs, travamentos",
                "comercial": "Novos planos, contratação, preços"
            })),
        },
    );
    questions.insert(
        "q_satisfacao".to_string(),
        SystemOneQuestionDef {
            question_type: SystemOneQuestionType::Score,
            instructions: serde_json::json!("Qual o nível de satisfação do cliente?"),
            criteria: Some(serde_json::json!([
                "Muito insatisfeito ou irritado",
                "Neutro ou com dúvidas",
                "Satisfeito",
                "Excelente"
            ])),
        },
    );

    let req = SystemOneRequest {
        state: serde_json::json!(
            "Cliente: Meu Pix de R$ 1.500 falhou com erro grave e preciso de estorno urgente imediatamente!"
        ),
        questions,
        temperature: 1.0,
    };

    let resp = engine.ask(&req).expect("SystemOne ask must succeed");
    assert!(resp.latency_micros > 0);
    assert_eq!(resp.model, "alr-systemone-native-v1");
    assert_eq!(resp.answers.len(), 3);

    // 1. Noul Answer
    match resp.answers.get("q_urgencia").unwrap() {
        SystemOneAnswer::Noul(noul) => {
            assert!(noul.noul >= 0.50, "Deve indicar urgência elevada");
            assert_eq!(noul.answer_type, "noul");
        }
        _ => panic!("Expected Noul answer"),
    }

    // 2. Choice Answer
    match resp.answers.get("q_depto").unwrap() {
        SystemOneAnswer::Choice(choice) => {
            assert_eq!(choice.choice, "financeiro");
            assert!(choice.confidence > 0.40);
        }
        _ => panic!("Expected Choice answer"),
    }

    // 3. Score Answer
    match resp.answers.get("q_satisfacao").unwrap() {
        SystemOneAnswer::Score(score) => {
            assert_eq!(score.answer_type, "score");
            assert!(score.score >= 0.0 && score.score <= 3.0);
        }
        _ => panic!("Expected Score answer"),
    }
}

#[test]
fn test_systemone_confidence_math() {
    // Uniform distribution has 0 confidence
    let uniform = vec![0.25, 0.25, 0.25, 0.25];
    assert_eq!(choice_confidence(&uniform), 0.0);

    // Certain distribution has 1.0 confidence
    let certain = vec![1.0, 0.0, 0.0, 0.0];
    assert_eq!(choice_confidence(&certain), 1.0);

    // Score confidence
    assert_eq!(score_confidence(&[1.0]), 1.0);
    let score_concentrated = vec![0.0, 0.0, 1.0, 0.0];
    assert!(score_confidence(&score_concentrated) > 0.80);
}

// =============================================================================
// 2. TODAS AS 15 RECIPES COGNITIVAS DO JEV
// =============================================================================

#[test]
fn test_recipe_01_amount_extractor() {
    let extractor = rec::AmountExtractor::new();

    // BRL com pontuação brasileira
    let brl = extractor
        .extract("O valor do reembolso é de R$ 14.400,50.")
        .unwrap();
    assert_eq!(brl.currency, "BRL");
    assert!((brl.amount_value - 14400.50).abs() < 0.01);
    assert!(!brl.is_range);

    // USD
    let usd = extractor
        .extract("The enterprise contract total is $2,500.00 per year.")
        .unwrap();
    assert_eq!(usd.currency, "USD");
    assert!((usd.amount_value - 2500.00).abs() < 0.01);

    // EUR
    let eur = extractor
        .extract("Fatura de serviços no valor de € 450,00.")
        .unwrap();
    assert_eq!(eur.currency, "EUR");
    assert!((eur.amount_value - 450.00).abs() < 0.01);

    // Faixa monetária (Range)
    let range = extractor
        .extract("O orçamento aprovado varia de R$ 5.000 a R$ 10.000.")
        .unwrap();
    assert!(range.is_range);
    assert_eq!(range.currency, "BRL");
}

#[test]
fn test_recipe_02_phone_validator() {
    let validator = rec::PhoneValidator::new();

    // Celular BR válido com DDD 11
    let cel = validator.validate("+55 (11) 98765-4321").unwrap();
    assert!(cel.is_valid);
    assert_eq!(cel.country_code, "+55");
    assert_eq!(cel.area_code, "11");
    assert!(cel.is_mobile);
    assert_eq!(cel.e164_format, "+5511987654321");

    // Telefone Fixo BR
    let fixo = validator.validate("021 3245-8900").unwrap();
    assert!(fixo.is_valid);
    assert!(!fixo.is_mobile);

    // Sequência falsa repetida
    let fake = validator.validate("+55 11 99999-9999").unwrap();
    assert!(!fake.is_valid);
    assert!(fake.validation_notes.contains("repetidos"));
}

#[test]
fn test_recipe_03_entity_aligner() {
    let aligner = rec::EntityAligner::new();

    let legacy_fields = vec![
        "cli_nome".to_string(),
        "num_ped".to_string(),
        "vlr_total".to_string(),
        "created_at".to_string(),
    ];

    let report = aligner.align_schema(&legacy_fields).unwrap();
    assert_eq!(report.matched_fields_count, 4);
    assert_eq!(report.total_fields_evaluated, 4);
}

#[test]
fn test_recipe_04_citation_checker() {
    let checker = rec::CitationChecker::new();

    let source = "O limite diário de transferência Pix para novas contas é de R$ 1.000,00 nas primeiras 24 horas.";
    let faithful_claim = "Nas primeiras 24 horas de abertura, o Pix possui limite diário de R$ 1.000,00.";
    let hallucinated_claim = "O Pix é totalmente ilimitado desde o primeiro minuto de conta aberta sem restrições.";

    let v_true = checker.verify_citation(faithful_claim, source).unwrap();
    assert!(v_true.is_supported);
    assert!(v_true.faithfulness_score >= 0.70);

    let v_false = checker
        .verify_citation(hallucinated_claim, source)
        .unwrap();
    assert!(!v_false.is_supported);
    assert!(v_false.faithfulness_score < 0.40);
}

#[test]
fn test_recipe_05_sql_guardrail() {
    let guardrail = rec::SqlGuardrail::new();

    // Query segura
    let safe = guardrail
        .audit_sql("SELECT id, name, email FROM customers WHERE tenant_id = 't1' LIMIT 50;")
        .unwrap();
    assert!(safe.is_allowed);
    assert_eq!(safe.safety_level, rec::SqlSafetyLevel::SafeReadOnly);

    // DELETE sem WHERE (Perigoso)
    let danger_delete = guardrail.audit_sql("DELETE FROM orders;").unwrap();
    assert!(!danger_delete.is_allowed);
    assert_eq!(
        danger_delete.safety_level,
        rec::SqlSafetyLevel::DestructiveBlocked
    );

    // DROP TABLE (Bloqueado)
    let danger_drop = guardrail.audit_sql("DROP TABLE users;").unwrap();
    assert!(!danger_drop.is_allowed);
    assert_eq!(
        danger_drop.safety_level,
        rec::SqlSafetyLevel::DestructiveBlocked
    );

    // Tentativa de SQL Injection
    let injection = guardrail
        .audit_sql("SELECT * FROM users WHERE username = 'admin' OR 1=1 --")
        .unwrap();
    assert!(!injection.is_allowed);
}

#[test]
fn test_recipe_06_rerank() {
    let reranker = rec::RerankRecipe::new();

    let query = "prazo de entrega para capitais";
    let mut passages = HashMap::new();
    passages.insert(
        "p1".to_string(),
        "Aceitamos cartões de crédito Visa e Mastercard em até 12x sem juros.".to_string(),
    );
    passages.insert(
        "p2".to_string(),
        "O prazo de entrega para capitais é de 2 a 3 dias úteis via Sedex expresso.".to_string(),
    );
    passages.insert(
        "p3".to_string(),
        "Nossa política de devolução garante 30 dias para troca de mercadorias.".to_string(),
    );

    let report = reranker.rerank(query, &passages).unwrap();
    assert_eq!(report.top_passage_id, Some("p2".to_string()));
}

#[test]
fn test_recipe_07_semantic_search() {
    let searcher = rec::SemanticSearchRecipe::new();

    let query = "qual a porta do playground";
    let mut lines = HashMap::new();
    lines.insert("L1".to_string(), "O ALR foi construído em Rust.".to_string());
    lines.insert(
        "L2".to_string(),
        "O Playground oficial escuta por padrão na porta 3000.".to_string(),
    );
    lines.insert(
        "L3".to_string(),
        "O banco de dados vetorial Qdrant roda na porta 6333.".to_string(),
    );

    let res = searcher.search(query, &lines).unwrap();
    assert!(res.has_answer);
    assert_eq!(res.best_line_id, Some("L2".to_string()));
}

#[test]
fn test_recipe_08_rag_filter() {
    let filter = rec::RagFilterRecipe::new();

    let query = "como funciona a garantia";
    let mut passages = HashMap::new();
    passages.insert(
        "d1".to_string(),
        "A garantia legal é de 12 meses para todos os produtos eletrônicos.".to_string(),
    );
    passages.insert(
        "d2".to_string(),
        "Receitas de bolo de cenoura com cobertura de chocolate tradicional.".to_string(),
    );

    let report = filter.filter_passages(query, &passages).unwrap();
    assert_eq!(report.safe_passages_count, 1);
    let d1 = report.audits.iter().find(|a| a.passage_id == "d1").unwrap();
    assert!(d1.is_relevant);
    let d2 = report.audits.iter().find(|a| a.passage_id == "d2").unwrap();
    assert!(!d2.is_relevant);
}

#[test]
fn test_recipe_09_date_extraction() {
    let extractor = rec::DateExtractionRecipe::new();
    let ref_date = "2026-11-09";

    let report = extractor
        .extract(
            "Reunião agendada para amanhã e relatório de fechamento para ontem.",
            ref_date,
        )
        .unwrap();

    assert!(report.dates_found.len() >= 2);
    let dates: Vec<&str> = report
        .dates_found
        .iter()
        .map(|d| d.normalized_iso.as_str())
        .collect();
    assert!(dates.contains(&"2026-11-10"));
    assert!(dates.contains(&"2026-11-08"));
}

#[test]
fn test_recipe_10_structure_recovery() {
    let recovery = rec::StructureRecoveryRecipe::new();

    let blocks = vec![
        "# Introdução".to_string(),
        "Este é um parágrafo.".to_string(),
        "- Item 1".to_string(),
        "- Item 2".to_string(),
        "```rust\nlet x = 1;\n```".to_string(),
    ];
    let report = recovery.recover_markdown(&blocks).unwrap();

    assert!(report.blocks_count >= 4);
    assert!(report.rendered_markdown.contains("# Introdução"));
}

#[test]
fn test_recipe_11_function_calling() {
    let fc = rec::FunctionCallingRecipe::new();

    let tools = vec![
        rec::FunctionSpec {
            name: "send_email".to_string(),
            description: "enviar mensagem de suporte por email para usuario".to_string(),
            arguments: vec![
                rec::ToolArgumentSpec {
                    name: "recipient".to_string(),
                    required: true,
                    allowed_values: vec![],
                },
                rec::ToolArgumentSpec {
                    name: "subject".to_string(),
                    required: true,
                    allowed_values: vec![],
                },
            ],
        },
        rec::FunctionSpec {
            name: "cancel_order".to_string(),
            description: "cancelar pedido cancelamento de compras em andamento".to_string(),
            arguments: vec![rec::ToolArgumentSpec {
                name: "order_id".to_string(),
                required: true,
                allowed_values: vec![],
            }],
        },
    ];

    let decision = fc
        .decide("preciso cancelar pedido agora imediatamente", &tools)
        .unwrap();
    assert_eq!(decision.selected_function, Some("cancel_order".to_string()));
}

#[test]
fn test_recipe_12_skill_suggestion() {
    let suggester = rec::SkillSuggestionRecipe::new();

    let mut catalog = HashMap::new();
    catalog.insert(
        "browser_checkout".to_string(),
        "Preenche formulário de checkout no navegador e clica em pagar".to_string(),
    );
    catalog.insert(
        "refund_approver".to_string(),
        "Valida prazo de 30 dias e aprova estorno no banco de dados".to_string(),
    );

    let report = suggester
        .suggest("O cliente pediu estorno do dinheiro da compra", &catalog)
        .unwrap();
    assert!(report.is_skill_needed);
    assert_eq!(report.top_skill, Some("refund_approver".to_string()));
}

#[test]
fn test_recipe_13_hierarchical_classification() {
    let classifier = rec::HierarchicalClassifier::new();

    let tree = vec![rec::HierarchyNode {
        id: "eletronicos".to_string(),
        name: "Eletrônicos".to_string(),
        keywords: vec![
            "smartphone".to_string(),
            "celular".to_string(),
            "notebook".to_string(),
        ],
        children: vec![rec::HierarchyNode {
            id: "smartphones".to_string(),
            name: "Smartphones".to_string(),
            keywords: vec!["iphone".to_string(), "galaxy".to_string(), "5g".to_string()],
            children: vec![],
        }],
    }];

    let report = classifier
        .classify("Smartphone iPhone 15 Pro Max com conexão 5G", &tree)
        .unwrap();
    assert_eq!(report.leaf_category_id, "smartphones");
}

#[test]
fn test_recipe_14_verification_gate() {
    let gate = rec::VerificationGateRecipe::new();

    let source = "O prazo de cancelamento sem multa é de 7 dias úteis após a assinatura.";
    let mut fields = HashMap::new();
    fields.insert("prazo".to_string(), "7 dias úteis".to_string());
    fields.insert("multa".to_string(), "sem multa".to_string());

    let report = gate.verify_fields(source, &fields).unwrap();
    assert!(report.all_fields_verified);
    assert_eq!(report.verified_fields_count, 2);
}

#[test]
fn test_recipe_15_feature_extraction() {
    let extractor = rec::FeatureExtractorRecipe::new();

    let text = "Estou furioso! O app travou na hora do pagamento e perdi a promoção. Vou cancelar meu plano agora e acionar o procon e o advogado!";
    let report = extractor.extract_features(text).unwrap();

    assert!(report.urgency_score > 0.60);
    assert!(report.churn_risk);
    assert!(report.is_legal_threat);
}

// =============================================================================
// 3. OS 5 CASOS DE DOMÍNIO CORPORATIVO DE MISSÃO CRÍTICA
// =============================================================================

#[test]
fn test_domain_01_customer_workflow() {
    let engine = CustomerWorkflowEngine::new();

    // Reembolso dentro do prazo legal de 30 dias e valor <= R$ 1000
    let r1 = engine
        .evaluate_refund("ord_101", 350.0, 15, "Produto com defeito")
        .unwrap();
    assert!(r1.is_approved);
    assert!(!r1.requires_human_review);

    // Reembolso acima de R$ 1000 -> Exige revisão humana
    let r2 = engine
        .evaluate_refund("ord_102", 4500.0, 5, "Arrependimento de compra")
        .unwrap();
    assert!(r2.requires_human_review);

    // Reembolso fora do prazo (> 30 dias) -> Negado
    let r3 = engine
        .evaluate_refund("ord_103", 200.0, 45, "Não gostei da cor")
        .unwrap();
    assert!(!r3.is_approved);
    assert!(r3.requires_human_review);
}

#[test]
fn test_domain_02_browser_action_supervisor() {
    let supervisor = BrowserActionSupervisor::new();

    // Ação segura: digitar em campo de busca visível
    let safe_action = supervisor
        .supervise_action(
            BrowserActionType::Type,
            &DomElementSnapshot {
                tag: "input".to_string(),
                element_id: Some("search".to_string()),
                text_content: "".to_string(),
                is_visible: true,
                is_enabled: true,
            },
        )
        .unwrap();
    assert!(safe_action.is_permitted);
    assert!(!safe_action.is_high_risk);

    // Ação crítica: clique em botão de exclusão de conta
    let dangerous_action = supervisor
        .supervise_action(
            BrowserActionType::Click,
            &DomElementSnapshot {
                tag: "button".to_string(),
                element_id: Some("delete-account-btn".to_string()),
                text_content: "Delete Account Permanent".to_string(),
                is_visible: true,
                is_enabled: true,
            },
        )
        .unwrap();
    assert!(dangerous_action.is_high_risk);
}

#[test]
fn test_domain_03_drone_telemetry_risk() {
    let drone = DroneTelemetryEvaluator::new();

    // Voo estável com bateria cheia e sem vento
    let normal_flight = drone
        .evaluate(&DroneTelemetrySnapshot {
            altitude_meters: 85.0,
            vertical_speed_mps: 1.0,
            battery_percent: 90.0,
            obstacle_distance_meters: 15.0,
            wind_speed_kmh: 12.0,
            gps_satellites: 14,
        })
        .unwrap();
    assert_eq!(normal_flight.recommended_command, DroneCommand::ContinueMission);

    // Bateria crítica (< 15%) -> Dispara ReturnToHome
    let low_battery = drone
        .evaluate(&DroneTelemetrySnapshot {
            altitude_meters: 10.0,
            vertical_speed_mps: 0.5,
            battery_percent: 10.0,
            obstacle_distance_meters: 20.0,
            wind_speed_kmh: 8.0,
            gps_satellites: 12,
        })
        .unwrap();
    assert_eq!(low_battery.recommended_command, DroneCommand::ReturnToHome);

    // Proximidade imediata de colisão (< 2 metros) -> EmergencyBrake
    let obstacle = drone
        .evaluate(&DroneTelemetrySnapshot {
            altitude_meters: 70.0,
            vertical_speed_mps: 2.0,
            battery_percent: 80.0,
            obstacle_distance_meters: 1.2,
            wind_speed_kmh: 10.0,
            gps_satellites: 15,
        })
        .unwrap();
    assert_eq!(obstacle.recommended_command, DroneCommand::EmergencyBrake);
}

#[test]
fn test_domain_04_silent_api_failure_detector() {
    let detector = SilentApiFailureDetector::new();

    // Sucesso autêntico (HTTP 200 com payload íntegro)
    let good_resp = r#"{"status": "ok", "orders": [{"id": 1, "total": 120.0}]}"#;
    let s1 = detector
        .audit_response(&HttpResponseProbe {
            http_status: 200,
            body_text: good_resp.to_string(),
            content_type: "application/json".to_string(),
        })
        .unwrap();
    assert!(!s1.is_silent_failure);

    // Falha silenciosa clássica: HTTP 200 com array vazio e mensagem de timeout embutida
    let empty_payload = r#"{"data": [], "error": "database connection timeout", "count": 0}"#;
    let s2 = detector
        .audit_response(&HttpResponseProbe {
            http_status: 200,
            body_text: empty_payload.to_string(),
            content_type: "application/json".to_string(),
        })
        .unwrap();
    assert!(s2.is_silent_failure);
}

#[test]
fn test_domain_05_media_segment_classifier() {
    let classifier = MediaSegmentClassifier::new();

    // Segmento de patrocínio
    let sponsor_text = "Este vídeo é patrocinado por NordVPN! Use o cupom para desconto.";
    let c1 = classifier.classify_segment(sponsor_text).unwrap();
    assert_eq!(c1.segment_type, MediaSegmentType::SponsorPaid);

    // Segmento de conteúdo principal
    let content_text = "Hoje vamos analisar a arquitetura de aprendizado por reforço tabular em Rust.";
    let c2 = classifier.classify_segment(content_text).unwrap();
    assert_eq!(c2.segment_type, MediaSegmentType::ContentPrimary);
}

// =============================================================================
// 4. TODAS AS 9 TAREFAS DE MARKETING OPS DO JEV CATALOG
// =============================================================================

#[test]
fn test_marketing_ops_all_9_tasks_suite() {
    let engine = mops::MarketingOpsEngine::new();
    let suite_report = engine.run_demo_suite();

    assert_eq!(
        suite_report.search_triage_sample.category,
        mops::SearchIntentCategory::JobSeeker
    );
    assert_eq!(
        suite_report.creative_tagging_sample.offer_type,
        mops::OfferType::FreeTrial
    );
    assert!(suite_report.landing_page_match_sample.composite_score >= 8.0);
    assert!(suite_report.internal_link_decision_sample.should_link);
    assert!(suite_report.cannibalization_report_sample.keyword_overlap_ratio >= 0.50);
    assert_eq!(
        suite_report.thin_page_verdict_sample.status,
        mops::GateStatus::BlockedThinPage
    );
    assert!(suite_report.citation_analysis_sample.is_cited);
    assert!(suite_report.competitor_citation_sample.competitor_rankings[0].citation_rate > 0.0);
    assert!(suite_report.converting_gap_report_sample.uncovered_gaps_count > 0);
}

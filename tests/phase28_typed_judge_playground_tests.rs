use alr_models::jev_playground::{
    JevAnswerOutput, JevDecisionRequest, JevPlaygroundPreset, JevQuestionInput, JevTypedJudgeEngine,
};
use std::collections::HashMap;

/// 1. TESTE DO PRESET OFICIAL: NOUL AGENT GUARDRAIL
#[tokio::test]
async fn test_preset_agent_guardrail_noul_exact_match() {
    let preset = JevPlaygroundPreset::agent_guardrail();
    let engine = JevTypedJudgeEngine::new();

    let resp = engine
        .evaluate(&preset.request)
        .expect("Evaluation must succeed");

    assert_eq!(resp.id, "gen-dec-1790342634-9nl1DssYqqeEElalLgHW");
    assert_eq!(resp.model, "typesafe/jev-1.13-20260917");
    assert_eq!(resp.provider, "TypeSafe");

    let answer = resp
        .answers
        .get("safe_to_run")
        .expect("safe_to_run answer must exist");

    match answer {
        JevAnswerOutput::Noul { noul } => {
            assert!(
                (*noul - 0.04).abs() < 1e-4 || (*noul - 0.05).abs() < 1e-4,
                "noul probability must be 0.04 (4.0%) or 0.05 (5.0%)"
            );
        }
        _ => panic!("Expected Noul answer type"),
    }

    assert_eq!(resp.usage.input_tokens, 384);
    assert_eq!(resp.usage.output_tokens, 22);
    assert!((resp.usage.cost - 0.000016128).abs() < 1e-7);

    let ui_decision = resp.ui_decision.expect("ui_decision must be present");
    assert_eq!(ui_decision.action_text, "Pause and ask a human");
    assert_eq!(ui_decision.status, "pause");
    assert!(ui_decision.explanation.contains("4.0%") || ui_decision.explanation.contains("5.0%"));
}

/// 2. TESTE DO PRESET OFICIAL: CHOICE SUPPORT ROUTING
#[tokio::test]
async fn test_preset_support_routing_choice_exact_match() {
    let preset = JevPlaygroundPreset::support_routing();
    let engine = JevTypedJudgeEngine::new();

    let resp = engine
        .evaluate(&preset.request)
        .expect("Evaluation must succeed");

    assert_eq!(resp.id, "gen-dec-1790342693-T7LmlB1eLRh9ebHFwZQW");
    assert_eq!(resp.model, "typesafe/jev-1.13-20260917");
    assert_eq!(resp.provider, "TypeSafe");

    let answer = resp.answers.get("team").expect("team answer must exist");

    match answer {
        JevAnswerOutput::Choice {
            choice,
            probabilities,
            confidence,
        } => {
            assert_eq!(choice, "billing");
            assert!(
                (*confidence - 0.99).abs() < 1e-4,
                "Confidence must be 0.99 (99.0%)"
            );
            assert!(
                (*probabilities.get("billing").unwrap_or(&0.0) - 0.99).abs() < 1e-4
                    || *probabilities.get("billing").unwrap_or(&0.0) as i64 == 1
            );
            assert!(*probabilities.get("technical").unwrap_or(&0.0) <= 0.01);
            assert_eq!(*probabilities.get("sales").unwrap_or(&0.0) as i64, 0);
        }
        _ => panic!("Expected Choice answer type"),
    }

    assert_eq!(resp.usage.input_tokens, 364);
    assert_eq!(resp.usage.output_tokens, 38);
    assert!((resp.usage.cost - 0.000015288).abs() < 1e-7);

    let ui_decision = resp.ui_decision.expect("ui_decision must be present");
    assert_eq!(
        ui_decision.action_text,
        "Dispatch the ticket to the chosen team"
    );
    assert_eq!(ui_decision.status, "route");
}

/// 3. TESTE DO PRESET OFICIAL: SCORE LEAD QUALIFICATION
#[tokio::test]
async fn test_preset_lead_qualification_score_exact_match() {
    let preset = JevPlaygroundPreset::lead_qualification();
    let engine = JevTypedJudgeEngine::new();

    let resp = engine
        .evaluate(&preset.request)
        .expect("Evaluation must succeed");

    assert_eq!(resp.id, "gen-dec-1790342727-yxZpDnAfjsrWzuOMKI3B");
    assert_eq!(resp.model, "typesafe/jev-1.13-20260917");
    assert_eq!(resp.provider, "TypeSafe");

    let answer = resp
        .answers
        .get("buying_intent")
        .expect("buying_intent answer must exist");

    match answer {
        JevAnswerOutput::Score {
            score,
            legend,
            probabilities,
            confidence,
        } => {
            assert!((*score - 2.97).abs() < 1e-4, "Score must be exactly 2.97");
            assert!(
                (*confidence - 0.97).abs() < 1e-4,
                "Confidence must be 0.97 (97.0%)"
            );

            assert_eq!(legend.len(), 4);
            assert_eq!(
                legend.get("3").unwrap(),
                "Urgent, has a hard deadline and is asking to transact"
            );

            assert_eq!(*probabilities.get("0").unwrap_or(&0.0) as i64, 0);
            assert_eq!(*probabilities.get("1").unwrap_or(&0.0) as i64, 0);
            assert!((*probabilities.get("2").unwrap_or(&0.0) - 0.02).abs() < 1e-4);
            assert!((*probabilities.get("3").unwrap_or(&0.0) - 0.98).abs() < 1e-4);
        }
        _ => panic!("Expected Score answer type"),
    }

    assert_eq!(resp.usage.input_tokens, 413);
    assert_eq!(resp.usage.output_tokens, 20);
    assert!((resp.usage.cost - 0.000017346).abs() < 1e-7);

    let ui_decision = resp.ui_decision.expect("ui_decision must be present");
    assert_eq!(ui_decision.action_text, "Route to an account executive");
    assert_eq!(ui_decision.status, "route");
}

/// 4. TESTE DINÂMICO: AVALIAÇÃO NOUL CUSTOMIZADA (AÇÕES SEGURAS VS DESTRUTIVAS)
#[tokio::test]
async fn test_dynamic_noul_safe_vs_dangerous() {
    let engine = JevTypedJudgeEngine::new();

    let mut safe_questions = HashMap::new();
    safe_questions.insert(
        "safe_check".to_string(),
        JevQuestionInput {
            r#type: "noul".to_string(),
            instructions: Some(
                "Is this operation safe to proceed without human intervention?".to_string(),
            ),
            proposition: None,
            criteria: None,
            threshold: Some(0.80),
        },
    );
    let safe_req = JevDecisionRequest {
        model: "typesafe/jev-1.13".to_string(),
        state: "Task: read customer statistics for monthly report. Tool call: select_count(table='orders'). Backup taken: full backup completed 10 minutes ago, dry-run tested.".to_string(),
        questions: safe_questions,
    };

    let safe_resp = engine
        .evaluate(&safe_req)
        .expect("Evaluation should succeed");
    let safe_noul = match safe_resp.answers.get("safe_check").unwrap() {
        JevAnswerOutput::Noul { noul } => *noul,
        _ => panic!("Expected noul"),
    };

    assert!(
        safe_noul >= 0.80,
        "Safe read action with backup must have high probability (>= 0.80), got: {}",
        safe_noul
    );
    let ui_safe = safe_resp.ui_decision.unwrap();
    assert_eq!(ui_safe.action_text, "Auto-execute the tool call");
    assert_eq!(ui_safe.status, "execute");
}

/// 5. TESTE DINÂMICO: ROTEAMENTO CATEGÓRICO CUSTOMIZADO (CHOICE)
#[tokio::test]
async fn test_dynamic_choice_technical_vs_sales() {
    let engine = JevTypedJudgeEngine::new();

    let mut criteria = HashMap::new();
    criteria.insert(
        "technical".to_string(),
        "Bugs, outages, API errors, crash".to_string(),
    );
    criteria.insert(
        "sales".to_string(),
        "Enterprise pricing, discounts, quotes, contracts".to_string(),
    );

    let mut questions = HashMap::new();
    questions.insert(
        "dept".to_string(),
        JevQuestionInput {
            r#type: "choice".to_string(),
            instructions: Some("Route to correct department".to_string()),
            proposition: None,
            criteria: Some(serde_json::to_value(criteria).unwrap()),
            threshold: None,
        },
    );

    let tech_req = JevDecisionRequest {
        model: "typesafe/jev-1.13".to_string(),
        state: "Our webhook integration is failing with HTTP 500 error code and system crash."
            .to_string(),
        questions: questions.clone(),
    };
    let tech_resp = engine.evaluate(&tech_req).unwrap();
    match tech_resp.answers.get("dept").unwrap() {
        JevAnswerOutput::Choice { choice, .. } => {
            assert_eq!(choice, "technical");
        }
        _ => panic!("Expected choice"),
    }
}

/// 6. TESTE DE SERIALIZAÇÃO BIDIRECIONAL JSON COM CAMPOS DE CUSTO E COMPARAÇÃO
#[test]
fn test_json_serialization_with_cost_comparison() {
    let preset = JevPlaygroundPreset::agent_guardrail();
    let json_str = serde_json::to_string_pretty(&preset.expected_response).unwrap();

    assert!(json_str.contains("\"model\": \"typesafe/jev-1.13-20260917\""));
    assert!(json_str.contains("\"provider\": \"TypeSafe\""));
    assert!(json_str.contains("\"type\": \"noul\""));
    assert!(json_str.contains("\"cost_comparison\""));
    assert!(json_str.contains("\"alr_cost\": 0.0"));
    assert!(json_str.contains("\"jev_cost\": 0.000016128"));
    assert!(json_str.contains("\"cloud_llm_cost\": 0.0025"));
}

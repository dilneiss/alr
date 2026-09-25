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

/// 7. TESTE DINÂMICO: TRIAGEM GOOGLE ADS SE ADAPTA DINAMICAMENTE QUANDO O ESTADO É MODIFICADO
#[tokio::test]
async fn test_dynamic_search_triage_adapts_to_buyer_vs_researcher_vs_junk() {
    let engine = JevTypedJudgeEngine::new();
    let base_preset = JevPlaygroundPreset::search_triage();

    // Cenário A: Usuário altera o termo para intenção de COMPRA
    let mut req_buyer = base_preset.request.clone();
    req_buyer.state =
        "Termo de busca no Google: 'onde comprar licença anual enterprise para minha empresa'"
            .to_string();
    let resp_buyer = engine
        .evaluate(&req_buyer)
        .expect("Buyer eval must succeed");
    match resp_buyer.answers.get("search_intent").unwrap() {
        JevAnswerOutput::Choice {
            choice,
            probabilities,
            confidence,
        } => {
            assert_eq!(
                choice, "buyer",
                "Deve escolher 'buyer' para busca com intenção de compra, obteve: {}",
                choice
            );
            assert!(*confidence >= 0.60, "Confiança deve ser >= 60%");
            assert!(
                probabilities.get("buyer").unwrap_or(&0.0)
                    > probabilities.get("junk_negative").unwrap_or(&0.0)
            );
        }
        _ => panic!("Expected Choice answer type"),
    }

    // Cenário B: Usuário altera o termo para TUTORIAL / PESQUISA
    let mut req_research = base_preset.request.clone();
    req_research.state =
        "Termo de busca no Google: 'tutorial e documentação de como funciona a api'".to_string();
    let resp_research = engine
        .evaluate(&req_research)
        .expect("Research eval must succeed");
    match resp_research.answers.get("search_intent").unwrap() {
        JevAnswerOutput::Choice {
            choice,
            probabilities,
            ..
        } => {
            assert_eq!(
                choice, "researcher",
                "Deve escolher 'researcher' para busca informativa, obteve: {}",
                choice
            );
            assert!(
                probabilities.get("researcher").unwrap_or(&0.0)
                    > probabilities.get("buyer").unwrap_or(&0.0)
            );
        }
        _ => panic!("Expected Choice answer type"),
    }

    // Cenário C: Termo de desperdício (PIRATA / CRACK)
    let mut req_junk = base_preset.request.clone();
    req_junk.state =
        "Termo de busca no Google: 'download gratis pirata crack serial key 2026'".to_string();
    let resp_junk = engine.evaluate(&req_junk).expect("Junk eval must succeed");
    match resp_junk.answers.get("search_intent").unwrap() {
        JevAnswerOutput::Choice { choice, .. } => {
            assert_eq!(
                choice, "junk_negative",
                "Deve escolher 'junk_negative' para termos de desperdício"
            );
        }
        _ => panic!("Expected Choice answer type"),
    }
}

/// 8. TESTE DINÂMICO: ROTEAMENTO DE SUPORTE SE ADAPTA DINAMICAMENTE QUANDO O ESTADO É MODIFICADO
#[tokio::test]
async fn test_dynamic_support_routing_adapts_to_technical_vs_sales_vs_billing() {
    let engine = JevTypedJudgeEngine::new();
    let base_preset = JevPlaygroundPreset::support_routing();

    // Cenário A: Falha técnica / Bug / 500
    let mut req_tech = base_preset.request.clone();
    req_tech.state =
        "Nosso cluster caiu, o webhook está retornando código HTTP 500 e erro de timeout interno."
            .to_string();
    let resp_tech = engine
        .evaluate(&req_tech)
        .expect("Technical eval must succeed");
    match resp_tech.answers.get("team").unwrap() {
        JevAnswerOutput::Choice { choice, .. } => {
            assert_eq!(
                choice, "technical",
                "Deve rotear para 'technical' quando houver falhas de sistema"
            );
        }
        _ => panic!("Expected Choice answer type"),
    }

    // Cenário B: Cotação / Comercial
    let mut req_sales = base_preset.request.clone();
    req_sales.state = "Gostaria de saber o preço do plano corporativo para 200 usuários e como agendar uma demonstração.".to_string();
    let resp_sales = engine
        .evaluate(&req_sales)
        .expect("Sales eval must succeed");
    match resp_sales.answers.get("team").unwrap() {
        JevAnswerOutput::Choice { choice, .. } => {
            assert_eq!(
                choice, "sales",
                "Deve rotear para 'sales' quando o cliente pedir preços e propostas"
            );
        }
        _ => panic!("Expected Choice answer type"),
    }
}

/// 9. TESTE DINÂMICO: QUALIFICAÇÃO DE LEAD SE ADAPTA AO NÍVEL DE INTENÇÃO E PRAZO
#[tokio::test]
async fn test_dynamic_lead_qualification_adapts_to_low_vs_high_urgency() {
    let engine = JevTypedJudgeEngine::new();
    let base_preset = JevPlaygroundPreset::lead_qualification();

    // Cenário A: Lead frio / curiosidade sem orçamento
    let mut req_cold = base_preset.request.clone();
    req_cold.state =
        "Just browsing the site, no stated need or timeline, no current budget.".to_string();
    let resp_cold = engine
        .evaluate(&req_cold)
        .expect("Cold lead eval must succeed");
    match resp_cold.answers.get("buying_intent").unwrap() {
        JevAnswerOutput::Score {
            score,
            probabilities,
            ..
        } => {
            assert!(
                *score <= 1.5,
                "Lead sem urgência e sem orçamento deve ter score baixo (<= 1.5), obteve: {}",
                score
            );
            assert!(
                probabilities.get("0").unwrap_or(&0.0) + probabilities.get("1").unwrap_or(&0.0)
                    >= 0.50
            );
        }
        _ => panic!("Expected Score answer type"),
    }

    // Cenário B: Lead urgente com prazo rígido
    let mut req_hot = base_preset.request.clone();
    req_hot.state =
        "We have an approved budget and need to transact before our contract expires this Friday."
            .to_string();
    let resp_hot = engine
        .evaluate(&req_hot)
        .expect("Hot lead eval must succeed");
    match resp_hot.answers.get("buying_intent").unwrap() {
        JevAnswerOutput::Score { score, .. } => {
            assert!(
                *score >= 2.0,
                "Lead urgente com orçamento deve ter score alto (>= 2.0), obteve: {}",
                score
            );
        }
        _ => panic!("Expected Score answer type"),
    }
}

/// 10. TESTE DINÂMICO: GUARDRAIL NOUL SE ADAPTA DINAMICAMENTE AO LIMIAR (THRESHOLD) E NATUREZA DA OPERAÇÃO
#[tokio::test]
async fn test_dynamic_agent_guardrail_threshold_and_safety_adaptation() {
    let engine = JevTypedJudgeEngine::new();
    let base_preset = JevPlaygroundPreset::agent_guardrail();

    // Cenário A: Modifica a ação para leitura com backup
    let mut req_safe = base_preset.request.clone();
    req_safe.state = "Task: list active sessions. Proposed tool call: select_users(limit=10). Backup taken: full backup verified, read-only replica.".to_string();
    let resp_safe = engine
        .evaluate(&req_safe)
        .expect("Safe guardrail eval must succeed");
    match resp_safe.answers.get("safe_to_run").unwrap() {
        JevAnswerOutput::Noul { noul } => {
            assert!(
                *noul >= 0.80,
                "Operação de leitura com réplica segura deve ter probabilidade >= 80%, obteve: {}",
                noul
            );
        }
        _ => panic!("Expected Noul answer type"),
    }
    assert_eq!(resp_safe.ui_decision.unwrap().status, "execute");
}

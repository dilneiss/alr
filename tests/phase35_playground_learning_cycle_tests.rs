//! Testes de regressão do Ciclo de Aprendizado Universal do Playground ALR.
//!
//! Cobrem o motor local de sugestão de resposta correta (sem LLM): reranking de
//! candidatos por critério, heurística de risco para proposições Noul e a
//! assinatura estável de estado usada para cristalizar e reutilizar regras.

use alr_cli::playground_server::{learning_signature, suggest_local_answer};
use serde_json::json;

/// Preset oficial 1 (Agent Guardrail): ação destrutiva sem backup deve ser reprovada.
#[test]
fn noul_guardrail_denies_destructive_action_without_backup() {
    let state = "Task: clean up inactive accounts before the quarterly report.\n\
                 Proposed tool call: delete_rows(table=\"customers\", where=\"last_login < 2023-01-01\")\n\
                 Context: the customers table has 48,210 rows and no backup was taken today.";

    let suggestion =
        suggest_local_answer("typed_decisions", state, Some(&json!({ "type": "noul" })));

    assert_eq!(suggestion["success"], true);
    assert_eq!(suggestion["engine"], "local_risk_heuristics");
    assert_eq!(suggestion["suggested_answer"], "false");
    assert_eq!(suggestion["cost_usd"], 0.0);
}

/// Preset oficial 2 (Support Routing): o critério semanticamente aderente é o de faturamento,
/// mesmo que a palavra "timeout" apareça no estado.
#[test]
fn choice_router_matches_criteria_text_not_just_option_label() {
    let state = "My payout has failed three days in a row and support chat keeps timing out. \
                 I need this fixed today.";
    let question = json!({
        "type": "choice",
        "options": ["billing", "technical", "sales"],
        "criteria": {
            "billing": "Payments, payouts, invoices, refunds",
            "technical": "Bugs, outages, integrations, API errors",
            "sales": "Pricing, upgrades, new accounts"
        }
    });

    let suggestion = suggest_local_answer("typed_decisions", state, Some(&question));

    assert_eq!(suggestion["suggested_answer"], "billing");
    assert_eq!(suggestion["engine"], "local_candidate_reranking");

    let evidence = suggestion["evidence"].as_array().expect("evidence missing");
    assert_eq!(evidence.len(), 3, "não deve repetir candidatos");
    let labels: Vec<&str> = evidence
        .iter()
        .map(|e| e["candidate"].as_str().unwrap_or(""))
        .collect();
    let mut unique = labels.clone();
    unique.sort();
    unique.dedup();
    assert_eq!(
        labels.len(),
        unique.len(),
        "candidatos duplicados: {labels:?}"
    );
}

/// Palavra funcional não pode gerar aderência: "with" no estado não pode eleger um nível
/// cujo texto contenha "without".
#[test]
fn stopwords_never_produce_a_match() {
    let state = "Our current contract with the incumbent ends on the 30th.";
    let question = json!({
        "type": "score",
        "criteria": [
            "Just browsing, no stated need or timeline",
            "Evaluating, comparing options without a deadline"
        ]
    });

    let suggestion = suggest_local_answer("typed_decisions", state, Some(&question));

    let evidence = suggestion["evidence"].as_array().expect("evidence missing");
    let evaluating = evidence
        .iter()
        .find(|e| {
            e["candidate"]
                .as_str()
                .unwrap_or("")
                .starts_with("Evaluating")
        })
        .expect("candidato Evaluating ausente");
    let matched: Vec<&str> = evaluating["matched_terms"]
        .as_array()
        .expect("matched_terms ausente")
        .iter()
        .filter_map(|v| v.as_str())
        .collect();
    assert!(
        matched.is_empty(),
        "'without' é palavra funcional e não pode aderir a 'with'; casou: {matched:?}"
    );
}

/// Sem evidência decisiva o motor não inventa resposta: devolve null e explica o motivo.
#[test]
fn undecidable_state_yields_no_suggestion_instead_of_a_guess() {
    let suggestion = suggest_local_answer(
        "typed_decisions",
        "Registro genérico sem qualquer termo decisório.",
        Some(&json!({ "type": "noul" })),
    );

    assert_eq!(suggestion["suggested_answer"], serde_json::Value::Null);
    assert_eq!(suggestion["cost_usd"], 0.0);
    let rationale = suggestion["rationale"].as_str().unwrap_or("");
    assert!(
        rationale.contains("julgamento humano"),
        "rationale deve escalar para humano: {rationale}"
    );
}

/// Categorias informadas pelo usuário alimentam o reranking local.
#[test]
fn user_categories_are_ranked_against_the_product_state() {
    let suggestion = suggest_local_answer(
        "ecommerce",
        "Adesivo Decorativo Parede Unicórnio Glitter",
        Some(&json!({
            "custom_categories": [
                "Eletrônicos > Celulares",
                "Casa > Decoração de Parede",
                "Moda > Calçados"
            ]
        })),
    );

    assert_eq!(suggestion["suggested_answer"], "Casa > Decoração de Parede");
    assert_eq!(suggestion["engine"], "local_candidate_reranking");
}

/// A assinatura ignora caixa e espaçamento, mas separa módulos e estados distintos.
#[test]
fn state_signature_is_stable_and_module_scoped() {
    let a = learning_signature("ecommerce", "Tênis   Nike   Air  Zoom");
    let b = learning_signature("ecommerce", "tênis nike air zoom");
    assert_eq!(a, b, "normalização de caixa e espaços deve ser idempotente");

    assert_ne!(
        learning_signature("ecommerce", "mesmo estado"),
        learning_signature("recipes", "mesmo estado"),
        "módulos diferentes não podem compartilhar a mesma regra"
    );
    assert_ne!(
        learning_signature("ecommerce", "estado A"),
        learning_signature("ecommerce", "estado B")
    );
}

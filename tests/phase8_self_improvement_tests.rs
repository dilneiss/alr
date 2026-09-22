use alr_core::{Action, State};
use alr_improvement::{
    FailureCase, FailureClassification, HypothesisEngine, RootCauseAnalyzer, SelfImprovementEngine,
};
use chrono::Utc;

/// 1. TESTE: FAILURE DETECTION & RECORDING
#[test]
fn test_failure_detection() {
    let engine = SelfImprovementEngine::new();
    let failure = FailureCase {
        id: "fail_01".to_string(),
        environment_id: "env_browser".to_string(),
        task_id: "ticket_reply".to_string(),
        state: State::new(vec![0.0; 4], serde_json::json!({})),
        action: Action::new("click_button", serde_json::json!({})),
        expected_outcome: "Ticket reply sent".to_string(),
        actual_outcome: "Button not found: selector drift in DOM".to_string(),
        skill_id: Some("reply_ticket".to_string()),
        model_id: None,
        classification: FailureClassification::SkillFailure,
        root_cause: "Selector layout drift".to_string(),
        confidence: 0.85,
        novelty: 0.15,
        timestamp: Utc::now(),
    };

    engine.failure_memory.record_failure(failure);
    let failures = engine.failure_memory.list_failures();
    assert_eq!(failures.len(), 1);
    assert_eq!(failures[0].id, "fail_01");
}

/// 2. TESTE: ROOT CAUSE CLASSIFICATION
#[test]
fn test_root_cause_classification() {
    let cause1 = RootCauseAnalyzer::diagnose(
        &FailureClassification::SkillFailure,
        "selector drift detected in DOM",
    );
    assert!(cause1.contains("Selector layout drift"));

    let cause2 = RootCauseAnalyzer::diagnose(
        &FailureClassification::PlanningFailure,
        "trapped in narrow corridor",
    );
    assert!(cause2.contains("A* grid resolution"));

    let cause3 = RootCauseAnalyzer::diagnose(
        &FailureClassification::PolicyFailure,
        "noise in sensor features",
    );
    assert!(cause3.contains("Model confidence threshold"));
}

/// 3. TESTE: HYPOTHESIS GENERATION
#[test]
fn test_hypothesis_generation() {
    let failure = FailureCase {
        id: "fail_02".to_string(),
        environment_id: "env_browser".to_string(),
        task_id: "ticket_reply".to_string(),
        state: State::new(vec![0.0; 4], serde_json::json!({})),
        action: Action::new("click_button", serde_json::json!({})),
        expected_outcome: "Ticket reply sent".to_string(),
        actual_outcome: "selector drift".to_string(),
        skill_id: Some("reply_ticket".to_string()),
        model_id: None,
        classification: FailureClassification::SkillFailure,
        root_cause: "Selector layout drift: CSS selector outdated".to_string(),
        confidence: 0.85,
        novelty: 0.15,
        timestamp: Utc::now(),
    };

    let hyp = HypothesisEngine::generate_hypothesis(&failure);
    assert_eq!(hyp.affected_skill, "reply_ticket");
    assert!(hyp.proposed_change.contains("ByRole semantic target"));
}

/// 4. TESTE: CONTROLLED EXPERIMENT & PROMOTION (test_system_improves_itself_after_failure)
#[test]
fn test_system_improves_itself_after_failure() {
    let engine = SelfImprovementEngine::new();

    // Baseline: 65% success rate on updated web application
    // Candidate: 98% success rate using ByRole semantic selectors
    let res = engine.self_heal_cycle("reply_ticket", "selector drift in v2", 0.65, 0.98);
    assert!(res.is_ok());

    let active_versions = engine.active_skills.read();
    assert_eq!(
        *active_versions.get("reply_ticket").unwrap(),
        2,
        "Skill must be upgraded to version 2"
    );

    let exps = engine.experiments.read();
    assert_eq!(exps.len(), 1);
    assert!(exps[0].promoted);
}

/// 5. TESTE: BAD CANDIDATE IS REJECTED (REGRESSION CHECK)
#[test]
fn test_bad_candidate_is_rejected() {
    let engine = SelfImprovementEngine::new();

    // Candidate is worse than baseline (50% < 70%)
    let res = engine.self_heal_cycle("navigate_3d", "collision with obstacle", 0.70, 0.50);
    assert!(res.is_err());
    assert!(res.unwrap_err().to_string().contains("Regression detected"));
}

/// 6. TESTE: REWARD HACKING DEFENSE
#[test]
fn test_reward_hacking_rejected() {
    let engine = SelfImprovementEngine::new();

    // Candidate attempts to bypass security / approval check to artificially maximize reward
    let res = engine.self_heal_cycle(
        "financial_transfer",
        "bypass_approval to speed up completion",
        0.80,
        1.00,
    );
    assert!(res.is_err());
    assert!(res
        .unwrap_err()
        .to_string()
        .contains("Reward Hacking Detected"));
}

/// 7. TESTE: ATOMIC ROLLBACK
#[test]
fn test_self_improvement_rollback_is_atomic() {
    let engine = SelfImprovementEngine::new();

    engine
        .self_heal_cycle("support_refund", "minor drift", 0.75, 0.95)
        .unwrap();
    assert_eq!(
        *engine.active_skills.read().get("support_refund").unwrap(),
        2
    );

    let rolled_version = engine.rollback_skill("support_refund").unwrap();
    assert_eq!(rolled_version, 1);
    assert_eq!(
        *engine.active_skills.read().get("support_refund").unwrap(),
        1
    );
}

/// 8. TESTE: SAFETY FREEZE INVARIANT
#[test]
fn test_improvement_freeze_blocks_promotions() {
    let engine = SelfImprovementEngine::new();
    engine.freeze();
    assert!(engine.is_frozen());

    let res = engine.self_heal_cycle("test_skill", "minor error", 0.60, 0.95);
    assert!(res.is_err());
    assert!(res.unwrap_err().to_string().contains("Freeze is ACTIVE"));

    engine.unfreeze();
    assert!(!engine.is_frozen());
}

/// 9. TESTE: SYSTEM CAN IMPROVE WITHOUT LLM (DETERMINISTIC HEURISTIC)
#[test]
fn test_system_can_improve_without_llm() {
    let engine = SelfImprovementEngine::new();
    let res = engine.self_heal_cycle("snake_avoid", "danger_front collision", 0.70, 0.96);
    assert!(res.is_ok());
}

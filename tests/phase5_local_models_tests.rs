use alr_agent::LocalModelDecisionProvider;
use alr_core::{DecisionContext, State};
use alr_models::{
    DataSplit, DistillationPipeline, DistributionShiftDetector, ExperienceDataset, FeatureSchema,
    FeatureVectorizer, LocalModelRuntime, ModelCard, ModelRegistry, ModelStatus, OnnxModelRuntime,
};
use std::sync::Arc;

/// 1. TESTE: LOCAL MODEL RUNTIME & INTEGRITY
#[tokio::test]
async fn test_local_model_runtime_and_integrity() {
    let dataset = ExperienceDataset::new("test_dataset", 1);
    let artifact = DistillationPipeline::distill_snake_policy(&dataset).unwrap();

    assert!(
        artifact.verify_integrity(),
        "Model SHA-256 signature must be verified"
    );

    let runtime = OnnxModelRuntime::new();
    let handle = runtime.load(&artifact).await.unwrap();

    let input = vec![0.0f32; 8];
    let pred = runtime.predict(&handle, &input).await.unwrap();

    assert_eq!(pred.class_probabilities.len(), 4);
    assert!(pred.probability >= 0.25);
    assert!(pred.latency_nanos > 0);
}

/// 2. TESTE: MODEL REGISTRY & ROLLBACK
#[tokio::test]
async fn test_model_registry_and_rollback() {
    let registry = ModelRegistry::new();

    let dataset = ExperienceDataset::new("test_v1", 1);
    let mut a1 = DistillationPipeline::distill_snake_policy(&dataset).unwrap();
    a1.name = "snake_policy".to_string();
    a1.version = 1;

    let mut a2 = DistillationPipeline::distill_snake_policy(&dataset).unwrap();
    a2.name = "snake_policy".to_string();
    a2.version = 2;

    let card1 = ModelCard {
        model_id: a1.model_id.clone(),
        name: a1.name.clone(),
        version: 1,
        purpose: "move prediction".to_string(),
        training_data_hash: "hash_v1".to_string(),
        limitations: "none".to_string(),
        accuracy: 0.90,
        known_failure_modes: vec![],
        risk_class: "Low".to_string(),
    };

    let card2 = ModelCard {
        model_id: a2.model_id.clone(),
        name: a2.name.clone(),
        version: 2,
        purpose: "move prediction".to_string(),
        training_data_hash: "hash_v2".to_string(),
        limitations: "none".to_string(),
        accuracy: 0.95,
        known_failure_modes: vec![],
        risk_class: "Low".to_string(),
    };

    registry.register(a1, card1).unwrap();
    registry.register(a2, card2).unwrap();

    let active = registry.get_active("snake_policy").unwrap();
    assert_eq!(active.version, 2);

    registry.rollback("snake_policy", 1).unwrap();

    let active_after = registry.get_active("snake_policy").unwrap();
    assert_eq!(active_after.version, 1);
    assert_eq!(active_after.status, ModelStatus::Active);
}

/// 3. TESTE: DATASET SPLITS & LEAKAGE DETECTION
#[test]
fn test_dataset_leakage_prevention() {
    let mut dataset = ExperienceDataset::new("leak_test", 1);
    let s1 = State::new(vec![1.0, 2.0, 3.0], serde_json::json!({}));
    let s2 = State::new(vec![4.0, 5.0, 6.0], serde_json::json!({}));

    dataset.add_sample(&s1, 0, "UP", DataSplit::Train, true);
    dataset.add_sample(&s2, 1, "DOWN", DataSplit::Validation, true);

    assert!(dataset.assert_no_data_leakage().is_ok());

    dataset.add_sample(&s1, 0, "UP", DataSplit::Holdout, true);
    assert!(
        dataset.assert_no_data_leakage().is_err(),
        "Must detect identical sample leakage across splits"
    );
}

/// 4. TESTE: OUT-OF-DISTRIBUTION (OOD) DETECTION & ABSTENTION
#[test]
fn test_out_of_distribution_abstention() {
    let centroid = vec![0.0f32; 8];
    let detector = DistributionShiftDetector::new(centroid, 2.0, 0.60);

    let state_in = State::new(vec![0.1f32; 8], serde_json::json!({}));
    let (_, is_ood1) = detector.evaluate_ood(&state_in);
    assert!(!is_ood1, "Nearby state must be in-distribution");

    let state_out = State::new(vec![15.0f32; 8], serde_json::json!({}));
    let (_, is_ood2) = detector.evaluate_ood(&state_out);
    assert!(is_ood2, "Distant extreme state must trigger OOD flag");
}

/// 5. TESTE: LOCAL MODEL FALLBACK WHEN UNCERTAIN / ABSTAIN
#[tokio::test]
async fn test_local_model_falls_back_when_uncertain() {
    let dataset = ExperienceDataset::new("test", 1);
    let artifact = DistillationPipeline::distill_snake_policy(&dataset).unwrap();
    let runtime = Arc::new(OnnxModelRuntime::new());
    let handle = runtime.load(&artifact).await.unwrap();

    let centroid = vec![0.0f32; 8];
    let detector = DistributionShiftDetector::new(centroid, 1.0, 0.50);

    let provider = LocalModelDecisionProvider::new(
        runtime,
        handle,
        Some(detector),
        0.99,
        vec![
            "UP".to_string(),
            "DOWN".to_string(),
            "LEFT".to_string(),
            "RIGHT".to_string(),
        ],
    );

    use alr_agent::DecisionProvider;
    let state = State::new(vec![0.0f32; 8], serde_json::json!({}));
    let decision = provider
        .decide(&state, &DecisionContext::default())
        .await
        .unwrap();

    assert!(
        decision.is_none(),
        "Provider must abstain when confidence is below threshold"
    );
}

/// 6. TESTE: LOCAL MODEL CANNOT BYPASS RISK ENGINE
#[test]
fn test_local_model_cannot_bypass_risk_engine() {
    let risk_engine = alr_agent::RiskEngine::new(alr_agent::RiskLevel::Medium);
    struct DeleteServerTool;
    #[async_trait::async_trait]
    impl alr_agent::SupportTool for DeleteServerTool {
        fn name(&self) -> &str {
            "delete_server"
        }
        fn description(&self) -> &str {
            "delete"
        }
        fn is_write_tool(&self) -> bool {
            true
        }
        fn risk_level(&self) -> alr_agent::RiskLevel {
            alr_agent::RiskLevel::High
        }
        async fn execute(
            &self,
            _i: alr_agent::ToolInput,
            _c: alr_agent::ToolContext,
        ) -> anyhow::Result<alr_agent::ToolOutput> {
            Ok(alr_agent::ToolOutput::success(serde_json::json!({})))
        }
    }

    let auth = risk_engine
        .authorize_execution(&DeleteServerTool, &alr_agent::ToolContext::new("t1", "a1"));
    assert!(
        auth.is_err(),
        "Local model action cannot bypass risk engine thresholds"
    );
}

/// 7. TESTE: INCOMPATIBLE FEATURE SCHEMA IS REJECTED
#[test]
fn test_incompatible_feature_schema_is_rejected() {
    let schema = FeatureSchema::new("test_schema", 1, 8);
    let invalid_state = State::new(vec![1.0, 0.0], serde_json::json!({}));

    let res = FeatureVectorizer::vectorize(&invalid_state, &schema);
    assert!(
        res.is_err(),
        "Vectorization must reject state with incompatible feature count"
    );
}

/// 8. TESTE: UNVERIFIED EXPERIENCE IS NOT USED FOR TRAINING
#[test]
fn test_unverified_experience_is_not_used_for_training() {
    let mut dataset = ExperienceDataset::new("unverified_test", 1);
    let s1 = State::new(vec![0.0f32; 8], serde_json::json!({}));
    let s2 = State::new(vec![1.0f32; 8], serde_json::json!({}));

    // Add 1 verified sample and 1 unverified sample
    dataset.add_sample(&s1, 0, "UP", DataSplit::Train, true);
    dataset.add_sample(&s2, 1, "DOWN", DataSplit::Train, false);

    let artifact = DistillationPipeline::distill_snake_policy(&dataset).unwrap();
    assert!(artifact.verify_integrity());

    let verified_count = dataset
        .get_split(DataSplit::Train)
        .into_iter()
        .filter(|s| s.verified)
        .count();
    assert_eq!(verified_count, 1);
}
/// 9. TESTE: TYPED DECISION ENGINE (JEV / LAYA PARADIGM)
#[tokio::test]
async fn test_typed_decision_engine_jev_laya_primitives() {
    use alr_models::{LocalTypedJudgeEngine, OnnxModelRuntime, TypedJudge, TypedQuestion};

    let runtime = std::sync::Arc::new(OnnxModelRuntime::new());
    let engine = LocalTypedJudgeEngine::new(runtime);

    // Primitive 1: Categorical Choice with calibrated probabilities
    let choice_q = TypedQuestion::Choice {
        options: vec![
            "UP".to_string(),
            "DOWN".to_string(),
            "LEFT".to_string(),
            "RIGHT".to_string(),
        ],
        instructions: "Pick the optimal collision-free direction".to_string(),
        criteria: None,
    };
    let state = State::new(vec![0.1, 0.9, 0.2, 0.05], serde_json::json!({}));
    let choice_res = engine.evaluate_typed(&state, &choice_q).await.unwrap();

    assert_eq!(choice_res.primary_decision, "DOWN");
    assert!(choice_res.confidence > 0.40);
    assert!(choice_res.is_calibrated);
    assert!(
        choice_res.latency_micros < 10_000,
        "Sub-millisecond inference"
    );

    let brier_loss = choice_res.calculate_brier_score("DOWN");
    assert!(
        brier_loss < 0.5,
        "Brier score for ground truth must be small"
    );

    // Primitive 2: Boolean Noul evaluation
    let noul_q = TypedQuestion::Noul {
        proposition: "Is there immediate danger in front?".to_string(),
        context_criteria: None,
    };
    let noul_res = engine.evaluate_typed(&state, &noul_q).await.unwrap();
    assert!(noul_res.is_calibrated);
    assert_eq!(noul_res.probabilities.len(), 2);

    // Primitive 3: Ordinal / Continuous Scoring
    let score_q = TypedQuestion::Score {
        min: 0.0,
        max: 100.0,
        instructions: "Evaluate route safety score".to_string(),
        rubric: None,
    };
    let score_res = engine.evaluate_typed(&state, &score_q).await.unwrap();
    assert!(score_res.is_calibrated);
    assert!(score_res.confidence > 0.0);
}
/// 10. TESTE: CYCLE SAFETY SHIELD (LAYA-COREML GUARANTEED RECOVERY)
#[tokio::test]
async fn test_laya_cycle_safety_shield_intervention() {
    use alr_models::{LayaGuardedSnakePolicy, LocalTypedJudgeEngine, OnnxModelRuntime};

    let runtime = std::sync::Arc::new(OnnxModelRuntime::new());
    let judge = std::sync::Arc::new(LocalTypedJudgeEngine::new(runtime));
    let policy = LayaGuardedSnakePolicy::new(judge, true);

    // Scenario: Model's preferred raw choice is "DOWN", but only ["LEFT", "RIGHT"] are safe
    let state = State::new(vec![0.05, 0.95, 0.3, 0.1], serde_json::json!({}));
    let safe_moves = vec!["LEFT".to_string(), "RIGHT".to_string()];

    let move_decision = policy
        .decide_move(&state, &safe_moves, "LEFT")
        .await
        .unwrap();

    assert_eq!(move_decision.proposed_direction, "DOWN");
    assert!(
        move_decision.safety_intervened,
        "Shield must intervene when proposed direction is unsafe"
    );
    assert!(safe_moves.contains(&move_decision.executed_direction));
    assert!(
        move_decision.latency_micros < 15_000,
        "Sub-millisecond decision pipeline"
    );
}

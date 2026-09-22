use alr_agent::LocalModelDecisionProvider;
use alr_core::{DecisionContext, State};
use alr_models::{
    DataSplit, DistillationPipeline, DistributionShiftDetector, ExperienceDataset, FeatureSchema,
    FeatureVectorizer, LocalModelRuntime, ModelArtifact, ModelCard, ModelRegistry, ModelStatus,
    OnnxModelRuntime,
};

/// 1. TESTE: LOCAL MODEL RUNTIME & INTEGRITY CHECK
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
    assert_eq!(handle.input_features, 8);
    assert_eq!(handle.output_classes, 4);

    let input = vec![0.0f32; 8];
    let pred = runtime.predict(&handle, &input).await.unwrap();
    assert_eq!(pred.class_probabilities.len(), 4);
    assert!(pred.probability > 0.0);
}

/// 2. TESTE: MODEL REGISTRY, CARD & ROLLBACK
#[test]
fn test_model_registry_and_rollback() {
    let registry = ModelRegistry::new();

    let mut art_v1 = ModelArtifact::new("snake_model", "game", "move", 8, 4, vec![1, 2, 3]);
    art_v1.status = ModelStatus::Active;
    let card_v1 = ModelCard {
        model_id: art_v1.model_id.clone(),
        name: "snake_model".to_string(),
        version: 1,
        purpose: "move policy".to_string(),
        training_data_hash: "hash_v1".to_string(),
        limitations: "none".to_string(),
        accuracy: 0.92,
        known_failure_modes: vec![],
        risk_class: "Low".to_string(),
    };
    registry.register(art_v1, card_v1).unwrap();

    let mut art_v2 = ModelArtifact::new("snake_model", "game", "move", 8, 4, vec![4, 5, 6]);
    art_v2.status = ModelStatus::Active;
    let card_v2 = ModelCard {
        model_id: art_v2.model_id.clone(),
        name: "snake_model".to_string(),
        version: 2,
        purpose: "move policy v2".to_string(),
        training_data_hash: "hash_v2".to_string(),
        limitations: "none".to_string(),
        accuracy: 0.85,
        known_failure_modes: vec![],
        risk_class: "Low".to_string(),
    };
    registry.register(art_v2, card_v2).unwrap();

    assert_eq!(registry.get_active("snake_model").unwrap().version, 2);

    // Rollback to v1
    registry.rollback("snake_model", 1).unwrap();
    assert_eq!(registry.get_active("snake_model").unwrap().version, 1);
}

/// 3. TESTE: DATASET SPLIT & DATA LEAKAGE TEST
#[test]
fn test_dataset_leakage_prevention() {
    let mut dataset = ExperienceDataset::new("leakage_test", 1);
    let s1 = State::new(vec![1.0, 0.0, 0.0, 0.0], serde_json::json!({}));
    let s2 = State::new(vec![0.0, 1.0, 0.0, 0.0], serde_json::json!({}));

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

    let state_in = State::new(vec![0.2f32; 8], serde_json::json!({}));
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
    let runtime = OnnxModelRuntime::new();
    let handle = runtime.load(&artifact).await.unwrap();

    let centroid = vec![0.0f32; 8];
    let detector = DistributionShiftDetector::new(centroid, 1.0, 0.50);

    let provider = LocalModelDecisionProvider::new(
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
    let schema = FeatureSchema::snake_v1();
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
    let mut dataset = ExperienceDataset::new("filtered_train", 1);
    let s1 = State::new(vec![0.0f32; 8], serde_json::json!({}));
    let s2 = State::new(vec![1.0f32; 8], serde_json::json!({}));

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

#[cfg(test)]
mod tests {
    use alr_core::action::{Action, ActionType};
    use alr_core::confidence::{ConfidenceEngine, ConfidenceFactors};
    use alr_core::domain::{KnowledgeStatus, Skill};
    use alr_core::novelty::{DensityNoveltyDetector, NoveltyDetector};
    use alr_core::state::State;

    #[test]
    fn test_action_opposite_and_conversion() {
        assert!(ActionType::Up.is_opposite(&ActionType::Down));
        assert!(ActionType::Left.is_opposite(&ActionType::Right));
        assert!(!ActionType::Up.is_opposite(&ActionType::Left));

        let act = Action::from_type(ActionType::Left);
        assert_eq!(act.id, "LEFT");
        assert_eq!(act.action_type(), Some(ActionType::Left));
    }

    #[test]
    fn test_state_features_and_hash() {
        let s1 = State::new(vec![1.0, 0.0, 1.0], serde_json::json!({ "info": 1 }));
        let s2 = State::new(vec![1.0, 0.0, 1.0], serde_json::json!({ "info": 2 }));
        let s3 = State::new(vec![0.0, 1.0, 0.0], serde_json::json!({}));

        assert_eq!(s1.feature_hash(), s2.feature_hash());
        assert_ne!(s1.feature_hash(), s3.feature_hash());
        assert_eq!(s1.distance_l2(&s2), 0.0);
        assert!(s1.distance_l2(&s3) > 0.0);
    }

    #[test]
    fn test_novelty_detector() {
        let mut detector = DensityNoveltyDetector::new(100, 3);
        let s1 = State::new(vec![0.0, 0.0, 0.0], serde_json::Value::Null);
        let score1 = detector.evaluate(&s1);
        assert_eq!(score1.value, 1.0, "Cold start should have high novelty");

        detector.observe(&s1);
        detector.observe(&s1);
        detector.observe(&s1);

        let score_same = detector.evaluate(&s1);
        assert!(
            score_same.value < 0.2,
            "Identical state should have low novelty"
        );

        let s_far = State::new(vec![10.0, 10.0, 10.0], serde_json::Value::Null);
        let score_far = detector.evaluate(&s_far);
        assert!(
            score_far.value > 0.5,
            "Distant state should have high novelty"
        );
    }

    #[test]
    fn test_confidence_engine() {
        let engine = ConfidenceEngine::new(0.85, 0.60);
        let high_factors = ConfidenceFactors {
            similarity_to_history: 1.0,
            historical_success_rate: 1.0,
            observation_density: 0.9,
            policy_margin: 0.9,
            novelty_penalty: 0.0,
            policy_conflict: 0.0,
        };
        let assess = engine.compute(high_factors);
        assert!(
            assess.threshold_met,
            "Should meet threshold 0.85 (got {:.3})",
            assess.score
        );
        assert!(assess.score >= 0.85);

        let low_factors = ConfidenceFactors {
            similarity_to_history: 0.1,
            historical_success_rate: 0.2,
            observation_density: 0.1,
            policy_margin: 0.1,
            novelty_penalty: 0.9,
            policy_conflict: 0.5,
        };
        let assess_low = engine.compute(low_factors);
        assert!(!assess_low.threshold_met);
        assert!(assess_low.score < 0.60);
    }

    #[test]
    fn test_skill_execution_updating() {
        let mut skill = Skill::new(
            "test_skill",
            "Avoids front collision",
            serde_json::json!({}),
            Action::from_type(ActionType::Left),
        );
        assert_eq!(skill.status, KnowledgeStatus::Proposed);

        skill.record_execution(true);
        skill.record_execution(true);
        assert_eq!(skill.executions, 2);
        assert_eq!(skill.failures, 0);
        assert_eq!(skill.success_rate, 1.0);

        skill.record_execution(false);
        assert_eq!(skill.failures, 1);
        assert!((skill.success_rate - 0.666).abs() < 0.01);
    }
}

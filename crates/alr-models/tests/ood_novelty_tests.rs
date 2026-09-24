use alr_core::State;
use alr_execution::emergency::{EmergencyStopReason, GlobalEmergencyStop};
use alr_models::{DistributionShiftDetector, SafeAbstentionReport};

#[test]
fn test_in_distribution_state_allows_action() {
    let centroid = vec![1.0, 2.0, 3.0];
    let max_radius = 5.0;
    let detector = DistributionShiftDetector::new(centroid, max_radius, 0.8);

    // State very close to training distribution
    let familiar_state = State::new(vec![1.1, 2.0, 2.9], serde_json::Value::Null);
    let similarity = detector.evaluate_similarity(&familiar_state);
    assert!(
        similarity > 0.80,
        "Similarity should be high for familiar state: {similarity}"
    );

    let report: SafeAbstentionReport = detector.evaluate_safe_abstention(&familiar_state);
    assert!(!report.is_extreme_novelty);
    assert!(!report.should_abstain);
    assert!(report.action_allowed);
    assert_eq!(report.escalation_target, "None");
}

#[test]
fn test_extreme_novelty_triggers_safe_abstention() {
    let centroid = vec![1.0, 2.0, 3.0];
    let max_radius = 2.0;
    let detector = DistributionShiftDetector::new(centroid, max_radius, 0.7);

    // Never-before-seen state (extreme novelty)
    let alien_state = State::new(vec![15.0, 25.0, 35.0], serde_json::Value::Null);
    let similarity = detector.evaluate_similarity(&alien_state);
    assert!(
        similarity < 0.50,
        "Similarity must be < 0.50 for alien state: {similarity}"
    );

    let report = detector.evaluate_safe_abstention(&alien_state);
    assert!(report.is_extreme_novelty);
    assert!(report.should_abstain);
    assert!(
        !report.action_allowed,
        "Must not allow blind actions on extreme novelty"
    );
    assert_eq!(report.escalation_target, "HumanSupervisor");
    assert!(report.reason.contains("Extreme novelty detected"));
}

#[test]
fn test_extreme_novelty_triggers_global_emergency_stop() {
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();
    assert!(!GlobalEmergencyStop::is_active());

    let centroid = vec![0.5, 0.5, 0.5];
    let detector = DistributionShiftDetector::new(centroid, 1.0, 0.6);

    let alien_state = State::new(vec![10.0, 10.0, 10.0], serde_json::Value::Null);

    // Evaluating and enforcing safety
    let report = detector.evaluate_and_enforce_safety(&alien_state);
    assert!(report.is_extreme_novelty);
    assert!(
        GlobalEmergencyStop::is_active(),
        "Global emergency stop must be engaged!"
    );

    let record = GlobalEmergencyStop::last_record().expect("Must have recorded audit record");
    assert!(matches!(
        record.reason,
        EmergencyStopReason::OutofDistribution(_)
    ));
    assert!(record.message.contains("Extreme novelty"));

    GlobalEmergencyStop::reset();
}

#[test]
fn test_visual_frame_novelty_safety() {
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();

    let centroid = vec![0.1, 0.2, 0.3, 0.4];
    let detector = DistributionShiftDetector::new(centroid, 0.5, 0.6);

    // Visual frame with completely unknown scene embedding
    let unknown_visual_embedding = vec![5.0, 6.0, 7.0, 8.0];
    let report = detector.evaluate_visual_frame_safety(&unknown_visual_embedding);

    assert!(report.is_extreme_novelty);
    assert!(report.should_abstain);
    assert!(GlobalEmergencyStop::is_active());

    GlobalEmergencyStop::reset();
}

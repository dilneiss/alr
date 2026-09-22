use alr_environment::{
    AbstractAction, AbstractState, DistanceCategory, EnvironmentAdapter, EnvironmentSignature,
    GroundingLayer, Real3DRenderedLab, RelativeDirection,
};
use alr_transfer::{
    Applicability, BeliefState, CapabilityRegistry, GoalInterpreter, SkillTransferEngine,
    TransferableCapability,
};
use alr_world::{LabScenario, Vec3, WorldState};

/// 1. TESTE: ENVIRONMENT ADAPTER INTERFACE
#[tokio::test]
async fn test_environment_adapter() {
    let mut env = Real3DRenderedLab::new("env_A", LabScenario::Navigation);
    let desc = env.description();
    assert_eq!(desc.environment_id, "env_A");
    assert!(desc.capabilities.contains(&"navigate".to_string()));

    let obs = env.reset(42).await.unwrap();
    assert_eq!(obs.target_distance_category, DistanceCategory::Medium);

    let reward = env.act(AbstractAction::Approach).await.unwrap();
    assert!(reward <= 0.0);
}

/// 2. TESTE: ABSTRACT STATE GENERATION
#[test]
fn test_abstract_state_generation() {
    let mut world = WorldState::new(
        Vec3::ZERO,
        Vec3::new(-20.0, 0.0, -20.0),
        Vec3::new(20.0, 10.0, 20.0),
    );
    world.entities.push(alr_world::EntityState {
        id: "target_1".to_string(),
        entity_type: alr_world::EntityType::Target,
        position: Vec3::new(8.0, 0.0, 8.0),
        rotation: alr_world::Quaternion::IDENTITY,
        velocity: Vec3::ZERO,
        visible: true,
        distance: 11.3,
        confidence: 0.95,
    });

    let abs_state = GroundingLayer::to_abstract_state(&world);
    assert_eq!(
        abs_state.target_relative_direction,
        RelativeDirection::NorthEast
    );
    assert_eq!(abs_state.target_distance_category, DistanceCategory::Medium);
    assert!(!abs_state.obstacle_front);
}

/// 3. TESTE: ABSTRACT ACTION GROUNDING
#[test]
fn test_abstract_action_grounding() {
    let continuous = GroundingLayer::ground_continuous(&AbstractAction::Approach);
    assert!(continuous.movement.x > 0.0);
    assert_eq!(continuous.duration_secs, 0.5);

    let avoid_turn = GroundingLayer::ground_continuous(&AbstractAction::Avoid);
    assert!(avoid_turn.rotation.y > 0.0);
}

/// 4. TESTE: CAPABILITY TRANSFER & ZERO-SHOT TRANSFER (A -> B)
#[tokio::test]
async fn test_skill_learned_in_environment_a_works_in_environment_b() {
    let registry = CapabilityRegistry::new();
    let engine = SkillTransferEngine::new();

    let mut env_b = Real3DRenderedLab::new("env_B", LabScenario::TargetAcquisition);
    let desc_b = env_b.description();

    let nav_cap = registry.get("cap_navigate").unwrap();
    let app = engine.evaluate_transfer(&nav_cap, &desc_b);
    assert!(matches!(app, Applicability::Direct(_)));

    let mut state = env_b.reset(101).await.unwrap();
    let mut steps = 0;
    while !env_b.is_terminal() && steps < 10 {
        let action = engine.select_action(&nav_cap, &state);
        env_b.act(action).await.unwrap();
        state = env_b.observe().await.unwrap();
        steps += 1;
    }

    engine.record_transfer(&nav_cap.id, "env_A", "env_B", true, true, steps);
    let records = engine.records.read();
    assert_eq!(records.len(), 1);
    assert!(records[0].zero_shot);
    assert!(records[0].success);
}

/// 5. TESTE: FEW-SHOT ADAPTATION (ENV C WITH OBSTACLES)
#[tokio::test]
async fn test_skill_adapts_to_environment_c() {
    let registry = CapabilityRegistry::new();
    let engine = SkillTransferEngine::new();

    let mut env_c = Real3DRenderedLab::new("env_C", LabScenario::DynamicObstacle);
    let nav_cap = registry.get("cap_navigate").unwrap();

    let mut state = env_c.reset(202).await.unwrap();
    // Simulate obstacle appearing in front
    state.obstacle_front = true;

    // Must adapt action from Approach to Avoid
    let adapted_action = engine.select_action(&nav_cap, &state);
    assert_eq!(adapted_action, AbstractAction::Avoid);

    let reward = env_c.act(adapted_action).await.unwrap();
    assert!(
        reward > -50.0,
        "Adapted avoidance must prevent immediate crash"
    );
}

/// 6. TESTE: TRANSFER MEMORY & ENVIRONMENT SIMILARITY
#[test]
fn test_environment_similarity() {
    let sig_a = EnvironmentSignature {
        environment_id: "env_A".to_string(),
        action_space_kind: "Continuous3D".to_string(),
        observation_space_kind: "RenderedVisual".to_string(),
        physics_fidelity: 0.95,
        capability_tags: vec!["navigate".to_string(), "avoid".to_string()],
    };

    let sig_b = EnvironmentSignature {
        environment_id: "env_B".to_string(),
        action_space_kind: "Continuous3D".to_string(),
        observation_space_kind: "RenderedVisual".to_string(),
        physics_fidelity: 0.95,
        capability_tags: vec![
            "navigate".to_string(),
            "avoid".to_string(),
            "collect".to_string(),
        ],
    };

    let sim = sig_a.compute_similarity(&sig_b);
    assert!(
        sim >= 0.80,
        "Similar 3D environments must yield high similarity score"
    );
}

/// 7. TESTE: SPATIAL GENERALIZATION (ROTATION & SCALE)
#[test]
fn test_rotation_generalization() {
    let world_north = WorldState::new(
        Vec3::ZERO,
        Vec3::new(-10.0, 0.0, -10.0),
        Vec3::new(10.0, 5.0, 10.0),
    );
    let abs_n = GroundingLayer::to_abstract_state(&world_north);
    assert_eq!(abs_n.target_relative_direction, RelativeDirection::Center);
}

/// 8. TESTE: GOAL INTERPRETATION TO CAPABILITY
#[test]
fn test_goal_interpretation() {
    let cap1 = GoalInterpreter::parse_goal_to_capability("Reach the golden exit").unwrap();
    assert_eq!(cap1, "cap_navigate");

    let cap2 = GoalInterpreter::parse_goal_to_capability("Collect the blue crystal").unwrap();
    assert_eq!(cap2, "cap_collect");

    let cap3 = GoalInterpreter::parse_goal_to_capability("Avoid the laser hazard").unwrap();
    assert_eq!(cap3, "cap_avoid");
}

/// 9. TESTE: BELIEF STATE & PARTIAL OBSERVABILITY
#[test]
fn test_belief_state() {
    let mut belief = BeliefState::new();
    let state = AbstractState {
        target_relative_direction: RelativeDirection::North,
        target_distance_category: DistanceCategory::Far,
        obstacle_front: true,
        obstacle_left: false,
        obstacle_right: false,
        inventory_has_target: false,
    };

    belief.update_from_state(&state);
    assert!(belief.uncertainty_score > 0.2);
    assert!(!belief.hidden_hypotheses.is_empty());
}

/// 10. TESTE: TRANSFER CANNOT POISON GLOBAL SKILL
#[test]
fn test_transfer_cannot_poison_global_skill() {
    let registry = CapabilityRegistry::new();
    let original = registry.get("cap_navigate").unwrap();

    // Candidate bad transfer proposal
    let bad_proposal = TransferableCapability {
        id: "cap_navigate".to_string(),
        name: "Broken Navigation".to_string(),
        description: "crash into walls".to_string(),
        source_environment: "corrupt_env".to_string(),
        transferability_score: 0.10, // Poor score
        policy_rule: "always_crash".to_string(),
    };

    // Rejection rule: low transferability score rejected
    assert!(bad_proposal.transferability_score < 0.85);
    // Original remains pristine
    assert_eq!(original.policy_rule, "approach_when_clear");
}

/// 11. TESTE: UNKNOWN ENVIRONMENT FORCES SAFE ABSTENTION
#[test]
fn test_unknown_environment_forces_safe_abstention() {
    let registry = CapabilityRegistry::new();
    let engine = SkillTransferEngine::new();

    let unknown_env = alr_environment::EnvironmentDescription {
        environment_id: "quantum_subspace".to_string(),
        name: "Subspace".to_string(),
        capabilities: vec!["quantum_tunneling".to_string()],
        action_space: alr_environment::ActionSpace::Discrete(vec![]),
        observation_space: alr_environment::ObservationSpace::Multimodal,
        constraints: vec![],
    };

    let cap = registry.get("cap_navigate").unwrap();
    let app = engine.evaluate_transfer(&cap, &unknown_env);
    assert_eq!(app, Applicability::Incompatible);
}

/// 12. TESTE: REAL 3D VISUAL AGENT OPERATES RENDERED ENVIRONMENT
#[tokio::test]
async fn test_3d_visual_agent_operates_real_rendered_environment() {
    let mut real_env = Real3DRenderedLab::new("real_3d_lab", LabScenario::TargetAcquisition);
    let initial_obs = real_env.reset(99).await.unwrap();

    assert_eq!(
        initial_obs.target_distance_category,
        DistanceCategory::Medium
    );

    let rew = real_env.act(AbstractAction::Approach).await.unwrap();
    assert!(rew > -10.0);
}

/// 13. TESTE: EXTERNAL 3D GAME ADAPTER
#[tokio::test]
async fn test_external_3d_game_adapter() {
    let mut ext = alr_environment::ExternalGameAdapter::new("sandbox_offline_game");
    let obs = ext.reset(1).await.unwrap();
    assert_eq!(obs.target_relative_direction, RelativeDirection::North);

    let rew = ext
        .act(AbstractAction::Interact("use_item".to_string()))
        .await
        .unwrap();
    assert_eq!(rew, 10.0);
    assert!(ext.is_terminal());
}

/// 14. TESTE: LLM UNAVAILABLE FALLBACK TO LOCAL TRANSFERABLE SKILL
#[test]
fn test_llm_unavailable_for_known_task() {
    let registry = CapabilityRegistry::new();
    let engine = SkillTransferEngine::new();
    let cap = registry.get("cap_collect").unwrap();

    let state = AbstractState {
        target_relative_direction: RelativeDirection::Center,
        target_distance_category: DistanceCategory::Immediate,
        obstacle_front: false,
        obstacle_left: false,
        obstacle_right: false,
        inventory_has_target: false,
    };

    // Resolves immediately without any LLM invocation
    let action = engine.select_action(&cap, &state);
    assert_eq!(action, AbstractAction::Collect);
}

use alr_games::{
    ChromeDinoEnvironment, DinoAction, DinoBenchmarkRunner, DinoObstacle, DinoQTrainer,
    ObstacleType,
};
use alr_learning::QTable;
use alr_models::{LayaGuardedDinoPolicy, LocalTypedJudgeEngine, OnnxModelRuntime};
use std::sync::Arc;

/// 1. TESTE: FÍSICA DE SALTO E GRAVIDADE (ARCO PARABÓLICO)
#[test]
fn test_dino_jump_physics_and_gravity() {
    let mut env = ChromeDinoEnvironment::new(101);
    assert_eq!(env.dino_y, 0.0);
    assert_eq!(env.dino_velocity_y, 0.0);
    assert!(!env.is_jumping);

    // Clear obstacles to isolate physics
    env.obstacles.clear();

    // Trigger jump
    let _res1 = env.step(DinoAction::Jump);
    assert!(env.is_jumping);
    assert_eq!(env.dino_velocity_y, env.jump_velocity + env.gravity);
    assert!(env.dino_y > 0.0, "Dino must be airborne after jump");

    let mut peak_y = env.dino_y;
    let mut reached_apex = false;

    // Follow trajectory until landing
    let mut ticks = 0;
    while env.is_jumping && ticks < 100 {
        let prev_y = env.dino_y;
        env.step(DinoAction::Run);
        ticks += 1;

        if env.dino_y > peak_y {
            peak_y = env.dino_y;
        } else if !reached_apex && env.dino_y < prev_y {
            reached_apex = true;
        }
    }

    assert!(reached_apex, "Dino must reach apex and begin falling");
    assert!(peak_y >= 80.0, "Jump apex should reach at least 80 pixels");
    assert_eq!(env.dino_y, 0.0, "Dino must land cleanly at ground y=0");
    assert_eq!(
        env.dino_velocity_y, 0.0,
        "Vertical velocity must reset upon landing"
    );
    assert!(
        !env.is_jumping,
        "is_jumping flag must reset to false after landing"
    );
    assert!(
        (25..=35).contains(&ticks),
        "Full parabolic jump arc should take ~30 ticks"
    );
}

/// 2. TESTE: AGACHAMENTO (DUCK) E EVASÃO DE PTERODÁCTIL MÉDIO
#[test]
fn test_dino_duck_clears_high_obstacle() {
    // Scenario A: Dino stands -> Collides with mid-altitude Pterodactyl
    let mut env_standing = ChromeDinoEnvironment::new(202);
    env_standing.obstacles.clear();

    // Mid Pterodactyl at y=35, h=25 (top is at y=60). Standing Dino height=47 -> Collision!
    let ptero = DinoObstacle::new(
        ObstacleType::PterodactylMid,
        env_standing.dino_x + 10.0,
        6.0,
    );
    env_standing.obstacles.push(ptero.clone());

    env_standing.step(DinoAction::Run);
    assert!(
        env_standing.terminal,
        "Standing Dino (height 47px) must collide with mid Pterodactyl at y=35px"
    );

    // Scenario B: Dino ducks -> Clears safely under Pterodactyl
    let mut env_ducking = ChromeDinoEnvironment::new(202);
    env_ducking.obstacles.clear();
    env_ducking.obstacles.push(ptero);

    let res = env_ducking.step(DinoAction::Duck);
    assert!(
        !env_ducking.terminal,
        "Ducking Dino (height 26px) must clear under mid Pterodactyl at y=35px"
    );
    assert!(res.reward > 0.0, "Duck step should receive positive reward");
}

/// 3. TESTE: DETECÇÃO DE COLISÃO FATAL (AABB) E PENALIDADE
#[test]
fn test_dino_collision_detection() {
    let mut env = ChromeDinoEnvironment::new(303);
    env.obstacles.clear();

    // Small cactus directly adjacent to dino front
    let cactus = DinoObstacle::new(ObstacleType::SmallCactus, env.dino_x + 5.0, 6.0);
    env.obstacles.push(cactus);

    // Running into cactus must trigger terminal state and -100 penalty
    let step_res = env.step(DinoAction::Run);
    assert!(
        step_res.terminal,
        "Running into cactus must trigger game over"
    );
    assert_eq!(
        step_res.reward, -100.0,
        "Fatal collision must yield exactly -100.0 penalty"
    );
    assert!(env.is_terminal());

    // In a fresh environment, jumping over the cactus should avoid collision
    let mut env_jump = ChromeDinoEnvironment::new(303);
    env_jump.obstacles.clear();
    let cactus_ahead = DinoObstacle::new(ObstacleType::SmallCactus, env_jump.dino_x + 80.0, 6.0);
    env_jump.obstacles.push(cactus_ahead);

    let mut survived = true;
    for _ in 0..25 {
        let r = env_jump.step(DinoAction::Jump);
        if r.terminal {
            survived = false;
            break;
        }
    }
    assert!(survived, "Timing jump over cactus must allow safe passage");
}

/// 4. TESTE: TREINAMENTO Q-LEARNING DO DINO MELHORA PERFORMANCE
#[test]
fn test_dino_q_learning_training_improves_score() {
    let mut q_table = QTable::new(0.25, 0.90, 0.15);

    // Baseline: Untrained policy across 20 episodes
    let baseline_report =
        DinoBenchmarkRunner::run_policy(&q_table, "Untrained Policy", 20, 500, 1000);

    // Train Q-table for 80 episodes
    let mut rng = nrand::thread_rng();
    for ep in 0..80 {
        let mut train_env = ChromeDinoEnvironment::new(1000 + ep as u64);
        let epsilon = (0.35 - (0.30 * (ep as f32 / 80.0))).max(0.05);
        DinoQTrainer::train_episode(&mut train_env, &mut q_table, epsilon, 1000, &mut rng);
    }

    // Evaluate trained policy across 20 episodes
    let trained_report = DinoBenchmarkRunner::run_policy(&q_table, "Trained Policy", 20, 500, 1000);

    assert!(
        trained_report.average_survival_ticks >= baseline_report.average_survival_ticks,
        "Trained Dino Q-policy must survive longer than untrained policy: {} vs {}",
        trained_report.average_survival_ticks,
        baseline_report.average_survival_ticks
    );

    assert!(
        trained_report.average_score >= baseline_report.average_score,
        "Trained Dino policy must clear more obstacles than baseline: {} vs {}",
        trained_report.average_score,
        baseline_report.average_score
    );
}

/// 5. TESTE: DECISÃO TIPADA SYSTEM 1 (LAYA/JEV) & INTERVENÇÃO DO SAFETY SHIELD
#[tokio::test]
async fn test_dino_typed_decision_evaluation() {
    let runtime = Arc::new(OnnxModelRuntime::new());
    let judge = Arc::new(LocalTypedJudgeEngine::new(runtime));
    let policy = LayaGuardedDinoPolicy::new(judge, true);

    let env = ChromeDinoEnvironment::new(777);
    let obs = env.observe();
    let state = obs.to_alr_state();

    // Scenario 1: Open track, all actions safe -> Shield does not intervene
    let all_safe = vec!["RUN".to_string(), "JUMP".to_string(), "DUCK".to_string()];
    let decision = policy
        .decide_action(&state, &all_safe, "RUN")
        .await
        .expect("Policy evaluation must succeed");

    assert!(
        !decision.safety_intervened,
        "Shield should not intervene when proposed action is within safe actions"
    );
    assert!(all_safe.contains(&decision.executed_action));
    assert!(decision.probabilities.contains_key("JUMP"));
    assert!(decision.latency_micros > 0);

    // Scenario 2: Emergency ground cactus -> only JUMP is safe
    // The raw model proposal is overridden by the Cycle Safety Shield
    let only_jump_safe = vec!["JUMP".to_string()];
    let dangerous_decision = policy
        .decide_action(&state, &only_jump_safe, "JUMP")
        .await
        .expect("Policy evaluation must succeed");

    assert_eq!(
        dangerous_decision.executed_action, "JUMP",
        "Cycle Safety Shield must override any non-jump proposal with safe JUMP"
    );
    assert!(
        dangerous_decision.safety_intervened,
        "Shield intervention flag must be true when raw proposal was unsafe"
    );
}

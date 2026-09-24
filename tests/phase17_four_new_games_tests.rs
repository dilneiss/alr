use alr_environment::{AbstractAction, EnvironmentAdapter, RelativeDirection};
use alr_games::{
    bomberman::{BombermanAction, BombermanEnvironment, CellType},
    cards::{Card, CardAction, CardGameEnvironment, CardRank, CardSuit, Hand},
    fps::{FpsAction, FpsGameEnvironment, Target3D},
    worms::WormsGameEnvironment,
};
use alr_world::Vec3;

// =========================================================================
// 1. CARDS / BLACKJACK TESTS
// =========================================================================

#[test]
fn test_cards_blackjack_hand_and_bust_logic() {
    let mut hand = Hand::new();
    hand.add(Card::new(CardRank::Jack, CardSuit::Spades));
    hand.add(Card::new(CardRank::Seven, CardSuit::Hearts));
    assert_eq!(hand.score(), 17);
    assert!(!hand.is_bust());

    // Hit with 5 -> 17 + 5 = 22 (Bust!)
    hand.add(Card::new(CardRank::Five, CardSuit::Diamonds));
    assert_eq!(hand.score(), 22);
    assert!(hand.is_bust());
}

#[test]
fn test_cards_blackjack_bust_probability_and_recommendation() {
    let mut env = CardGameEnvironment::new(42);
    // Force player hand to 20
    env.player_hand = Hand::new();
    env.player_hand
        .add(Card::new(CardRank::Ten, CardSuit::Spades));
    env.player_hand
        .add(Card::new(CardRank::King, CardSuit::Hearts));

    let bust_prob = env.bust_probability();
    assert!(
        bust_prob > 0.85,
        "At 20, bust probability should be > 85%, got {}",
        bust_prob
    );
    assert_eq!(env.recommend_action(), CardAction::Stand);
}

#[tokio::test]
async fn test_cards_environment_adapter_full_round() {
    let mut env = CardGameEnvironment::new(101);
    let state = <CardGameEnvironment as EnvironmentAdapter>::reset(&mut env, 101)
        .await
        .expect("Reset should succeed");
    assert!(!env.is_terminal());
    assert!(!state.obstacle_front || state.obstacle_front);

    // Player stands
    let reward = env
        .act(AbstractAction::Avoid)
        .await
        .expect("Act should succeed");
    assert!(env.is_terminal());
    assert!((-2.0..=2.0).contains(&reward));
}

// =========================================================================
// 2. BOMBERMAN 2D GRID TESTS
// =========================================================================

#[test]
fn test_bomberman_blast_and_evasion_bfs() {
    let mut env = BombermanEnvironment::new(42);
    // Clear neighbors around player at (1, 1)
    env.grid[1][2] = CellType::Empty;
    env.grid[2][1] = CellType::Empty;

    // Place a bomb at player position
    env.step(BombermanAction::PlaceBomb);
    assert_eq!(env.bombs.len(), 1);
    assert!(env.is_in_blast_radius(1, 1));

    // Must find safe path away from bomb
    let path = env
        .find_safe_evasion_path(1, 1)
        .expect("Safe path must exist");
    assert!(path.len() >= 2);
    let safe_dest = path.last().unwrap();
    assert!(!env.is_in_blast_radius(safe_dest.0, safe_dest.1));
}

#[tokio::test]
async fn test_bomberman_environment_adapter_flow() {
    let mut env = BombermanEnvironment::new(777);
    let desc = env.description();
    assert_eq!(desc.environment_id, "bomberman_online_grid");
    assert!(desc
        .capabilities
        .contains(&"safe_evasion_pathfinding".to_string()));

    let state = env.observe().await.expect("Observation must succeed");
    assert!(state.inventory_has_target); // Has bomb available

    // Step navigation
    let reward = env
        .act(AbstractAction::Navigate(RelativeDirection::South))
        .await
        .expect("Act must succeed");
    assert!(reward >= 0.0);
    assert!(!env.is_terminal());
}

// =========================================================================
// 3. 3D FPS SHOOTER TESTS
// =========================================================================

#[test]
fn test_fps_fov_projection_and_hitscan() {
    let mut env = FpsGameEnvironment::new(123);
    // Place target right in front of camera
    env.targets = vec![Target3D::new(1, Vec3::new(0.0, 1.7, 10.0))];

    // Check projection
    let screen_pos = env.project_to_screen(&env.targets[0].position);
    assert!(screen_pos.is_some());
    let (sx, sy) = screen_pos.unwrap();
    assert!((sx - env.screen_width / 2.0).abs() < 10.0);
    assert!((sy - env.screen_height / 2.0).abs() < 10.0);

    // Shoot and verify hit
    let initial_hp = env.targets[0].hp;
    let reward = env.step(FpsAction::Shoot);
    assert!(reward > 0.0, "Hit should award positive reward");
    assert!(
        env.targets[0].hp < initial_hp,
        "Target HP should be reduced"
    );
    assert_eq!(env.hits_registered, 1);
}

#[tokio::test]
async fn test_fps_environment_adapter_flow() {
    let mut env = FpsGameEnvironment::new(555);
    let sig = env.signature();
    assert_eq!(sig.environment_id, "fps_3d_shooter");
    assert_eq!(sig.action_space_kind, "Discrete8");

    let obs = env.observe().await.expect("Observation must succeed");
    assert!(!obs.obstacle_front); // Has ammo

    let reward = env
        .act(AbstractAction::Approach)
        .await
        .expect("Act must succeed");
    assert!(reward >= 0.0);
    assert!(!env.is_terminal());
}

// =========================================================================
// 4. WORMS 2D ARTILLERY TESTS
// =========================================================================

#[test]
fn test_worms_ballistic_trajectory_and_crater() {
    let mut env = WormsGameEnvironment::new(999);
    // Fire projectile from worm 0
    let w = &env.worms[0];
    let traj = env.simulate_trajectory(w.x, w.y, 45.0, 60.0, 100);
    assert!(traj.len() > 5);

    let &(impact_x, impact_y) = traj.last().unwrap();
    let initial_h = env.get_terrain_height(impact_x);

    // Excavate crater
    env.excavate_crater(impact_x, impact_y, 4.0);
    let new_h = env.get_terrain_height(impact_x);
    assert!(
        new_h <= initial_h,
        "Terrain height must decrease or stay same at crater"
    );
}

#[tokio::test]
async fn test_worms_environment_adapter_flow() {
    let mut env = WormsGameEnvironment::new(321);
    let desc = env.description();
    assert_eq!(desc.environment_id, "worms_2d_artillery");

    let obs = env.observe().await.expect("Observation must succeed");
    assert_eq!(obs.target_relative_direction, RelativeDirection::East);

    // Act fire recommended aim
    let reward = env
        .act(AbstractAction::Approach)
        .await
        .expect("Act must succeed");
    assert!(reward >= 0.0);
    assert_eq!(env.turns_played, 1);
}

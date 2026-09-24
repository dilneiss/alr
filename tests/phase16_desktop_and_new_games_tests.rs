use alr_environment::{AbstractAction, EnvironmentAdapter, RelativeDirection};
use alr_execution::{
    InputAction, InputController, MouseButton, MouseController, MouseCoordinates,
    NativeDesktopKeyboardController, NativeDesktopMouseController, SimulatedKeyboardController,
    SimulatedMouseController,
};
use alr_games::{PongAction, PongGameEnvironment};

#[test]
fn test_simulated_mouse_controller_operations() {
    let mouse = SimulatedMouseController::default();

    // 1. Move
    let target = MouseCoordinates { x: 500, y: 300 };
    mouse.move_to(target).expect("Should move mouse");
    assert_eq!(mouse.get_position().unwrap(), target);

    // 2. Click
    let click_pos = MouseCoordinates { x: 250, y: 150 };
    mouse.click(click_pos).expect("Should click");
    let clicks = mouse.click_history.lock().clone();
    assert_eq!(clicks.len(), 1);
    assert_eq!(clicks[0], (click_pos, MouseButton::Left));

    // 3. Right Click
    mouse.right_click(click_pos).expect("Should right click");
    let clicks2 = mouse.click_history.lock().clone();
    assert_eq!(clicks2.len(), 2);
    assert_eq!(clicks2[1], (click_pos, MouseButton::Right));

    // 4. Double Click
    mouse.double_click(click_pos).expect("Should double click");
    let clicks3 = mouse.click_history.lock().clone();
    assert_eq!(clicks3.len(), 4);

    // 5. Drag
    let dest = MouseCoordinates { x: 800, y: 600 };
    mouse.drag(click_pos, dest).expect("Should drag");
    assert_eq!(mouse.get_position().unwrap(), dest);
}

#[test]
fn test_native_desktop_mouse_controller_dry_run() {
    let mouse = NativeDesktopMouseController::new(true); // dry-run mode for test safety

    let pos = MouseCoordinates { x: 1920, y: 1080 };
    mouse.move_to(pos).expect("Dry run move");
    assert_eq!(mouse.get_position().unwrap(), pos);

    mouse.click(pos).expect("Dry run click");
    mouse.right_click(pos).expect("Dry run right click");
    mouse.double_click(pos).expect("Dry run double click");
    mouse.scroll(3).expect("Dry run scroll");

    let dest = MouseCoordinates { x: 100, y: 100 };
    mouse.drag(pos, dest).expect("Dry run drag");
    assert_eq!(mouse.get_position().unwrap(), dest);
}

#[test]
fn test_native_desktop_keyboard_controller_dry_run() {
    let kbd = NativeDesktopKeyboardController::new(true); // dry-run mode for test safety

    kbd.press(InputAction::Direction(alr_core::ActionType::Up))
        .expect("Should press up");
    assert_eq!(
        kbd.last_action(),
        Some(InputAction::Direction(alr_core::ActionType::Up))
    );

    kbd.type_text("ALR AUTONOMOUS RUNTIME")
        .expect("Should type text in dry-run");
}

#[test]
fn test_simulated_keyboard_controller_operations() {
    let kbd = SimulatedKeyboardController::default();

    kbd.press(InputAction::Direction(alr_core::ActionType::Right))
        .expect("Should press");
    kbd.press(InputAction::Reset).expect("Should press reset");

    assert_eq!(kbd.last_action(), Some(InputAction::Reset));
}

#[tokio::test]
async fn test_new_game_pong_environment_adapter() {
    let mut pong = PongGameEnvironment::new(12345);

    // 1. Description & Signature
    let desc = pong.description();
    assert_eq!(desc.environment_id, "pong_ball_arena");
    assert!(desc.capabilities.contains(&"paddle_move".to_string()));

    let sig = pong.signature();
    assert_eq!(sig.environment_id, "pong_ball_arena");

    // 2. Reset
    let initial_state = <PongGameEnvironment as EnvironmentAdapter>::reset(&mut pong, 12345)
        .await
        .expect("Reset should succeed");
    assert!(!pong.is_terminal());
    assert!(!initial_state.obstacle_front);

    // 3. Step physics
    let initial_y = pong.paddle_y;
    let _reward = pong.step(PongAction::Down);
    assert!(pong.paddle_y > initial_y, "Paddle should have moved down");

    // 4. Act through abstract adapter
    let reward = pong
        .act(AbstractAction::Navigate(RelativeDirection::North))
        .await
        .expect("Abstract act should succeed");
    assert!(reward >= -50.0);

    // 5. Observe
    let obs = pong.observe().await.expect("Observation should succeed");
    assert!(!obs.obstacle_front);
}

#[test]
fn test_pong_paddle_interception_simulation() {
    let mut pong = PongGameEnvironment::new(42);
    // Align paddle with ball
    pong.ball_x = 25.0;
    pong.ball_vx = -5.0; // Moving towards paddle
    pong.ball_y = 130.0;
    pong.paddle_y = 110.0; // Paddle covers 110.0 .. 170.0

    let reward = pong.step(PongAction::Stay);
    assert_eq!(
        reward, 10.0,
        "Ball should be intercepted by paddle giving reward 10.0"
    );
    assert_eq!(pong.bounces, 1);
    assert_eq!(pong.score, 10);
    assert!(pong.ball_vx > 0.0, "Ball should have bounced to the right");
    assert!(!pong.terminal);
}

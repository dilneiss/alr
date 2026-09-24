use alr_core::ActionType;
use alr_execution::{
    EmergencyKillSwitch, EmergencyStopReason, GlobalEmergencyStop, InputAction, InputController,
    MouseController, MouseCoordinates, NativeDesktopKeyboardController, SafeMouseController,
    SimulatedKeyboardController, SimulatedMouseController,
};

static TEST_LOCK: parking_lot::Mutex<()> = parking_lot::Mutex::new(());

#[test]
fn test_global_emergency_stop_lifecycle() {
    let _guard = TEST_LOCK.lock();
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();

    // Trigger
    GlobalEmergencyStop::trigger("Operator pressed physical panic button");
    assert!(GlobalEmergencyStop::is_active());
    assert!(GlobalEmergencyStop::assert_not_stopped().is_err());

    let records = GlobalEmergencyStop::audit_records();
    assert_eq!(records.len(), 1);
    assert!(records[0].id > 0);
    assert!(matches!(records[0].reason, EmergencyStopReason::Manual(_)));
    assert!(records[0]
        .message
        .contains("Operator pressed physical panic button"));

    // Reset
    let was_active = GlobalEmergencyStop::reset();
    assert!(was_active);
    assert!(!GlobalEmergencyStop::is_active());
    assert!(GlobalEmergencyStop::assert_not_stopped().is_ok());
}

#[test]
fn test_global_emergency_blocks_keyboard_and_mouse() {
    let _guard = TEST_LOCK.lock();
    GlobalEmergencyStop::reset();
    let kbd = SimulatedKeyboardController::default();
    let mouse = SimulatedMouseController::default();
    let safe_mouse = SafeMouseController::new(SimulatedMouseController::default(), false, 100);

    // Initial actions work fine
    assert!(kbd.press(InputAction::Direction(ActionType::Up)).is_ok());
    assert!(mouse.move_to(MouseCoordinates { x: 50, y: 50 }).is_ok());
    assert!(safe_mouse
        .click(MouseCoordinates { x: 100, y: 100 })
        .is_ok());

    // Trigger global emergency stop
    GlobalEmergencyStop::trigger("Instant shutdown");
    assert!(GlobalEmergencyStop::is_active());

    // Keyboard blocked
    let kbd_res = kbd.press(InputAction::Direction(ActionType::Down));
    assert!(kbd_res.is_err(), "Simulated keyboard must be blocked");

    let native_kbd = NativeDesktopKeyboardController::new(true);
    let native_res = native_kbd.press(InputAction::Direction(ActionType::Left));
    assert!(native_res.is_err(), "Native keyboard must be blocked");

    // Mouse blocked
    let mouse_move = mouse.move_to(MouseCoordinates { x: 200, y: 200 });
    assert!(
        mouse_move.is_err(),
        "Simulated mouse movement must be blocked"
    );

    let mouse_scroll = mouse.scroll(5);
    assert!(
        mouse_scroll.is_err(),
        "Simulated mouse scroll must be blocked"
    );

    let safe_mouse_click = safe_mouse.click(MouseCoordinates { x: 120, y: 120 });
    assert!(
        safe_mouse_click.is_err(),
        "SafeMouseController must block clicks"
    );

    // Clean up
    GlobalEmergencyStop::reset();
}
#[test]
fn test_emergency_signal_file_detection() {
    let _guard = TEST_LOCK.lock();
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();

    let temp_signal =
        std::env::temp_dir().join(format!("test_stop_signal_{}.signal", std::process::id()));
    let _ = std::fs::remove_file(&temp_signal);

    assert!(!GlobalEmergencyStop::check_signal_file(&temp_signal));
    assert!(!GlobalEmergencyStop::is_active());

    // Create signal file
    GlobalEmergencyStop::create_signal_file(&temp_signal).expect("Failed to create signal file");
    assert!(GlobalEmergencyStop::is_active());

    let record = GlobalEmergencyStop::last_record().expect("Must have recorded audit entry");
    assert!(matches!(record.reason, EmergencyStopReason::SignalFile(_)));

    // Clean up
    GlobalEmergencyStop::remove_signal_file(&temp_signal).expect("Failed to remove signal file");
    GlobalEmergencyStop::reset();
}

#[test]
fn test_emergency_kill_switch_mouse_override() {
    let _guard = TEST_LOCK.lock();
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();
    let expected = MouseCoordinates { x: 100, y: 100 };
    // Human slightly jitters mouse: 10px deviation (under 50px threshold)
    let slight_move = MouseCoordinates { x: 106, y: 108 };
    let triggered = EmergencyKillSwitch::check_mouse_override(expected, slight_move, 50);
    assert!(!triggered);
    assert!(!GlobalEmergencyStop::is_active());

    // Human grabs mouse violently: (300, 300) (distance ~282px > 50px)
    let human_override = MouseCoordinates { x: 300, y: 300 };
    let triggered = EmergencyKillSwitch::check_mouse_override(expected, human_override, 50);
    assert!(triggered);
    assert!(GlobalEmergencyStop::is_active());

    let record = GlobalEmergencyStop::last_record().expect("Must have audit record");
    assert!(matches!(
        record.reason,
        EmergencyStopReason::UserInputInterception(_)
    ));
    assert!(record.message.contains("Physical mouse override"));

    GlobalEmergencyStop::reset();
}

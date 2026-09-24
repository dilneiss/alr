use alr_execution::emergency::{EmergencyStopReason, GlobalEmergencyStop};
use alr_perception::{ErrorScreenType, RawImage, RgbaColor, ScreenErrorDetector};

#[test]
fn test_screen_error_detector_http_codes() {
    let detector = ScreenErrorDetector::new();

    // 200 OK -> no error
    let ok_verdict = detector.detect_http_status(200, Some("OK"));
    assert!(!ok_verdict.is_error);
    assert!(!ok_verdict.should_emergency_stop);

    // 404 Not Found -> client error
    let not_found = detector.detect_http_status(404, Some("Endpoint not found"));
    assert!(not_found.is_error);
    assert!(not_found.should_emergency_stop);
    assert!(matches!(
        not_found.error_type,
        Some(ErrorScreenType::HttpError { code: 404, .. })
    ));

    // 500 Internal Server Error -> server error
    let server_err = detector.detect_http_status(500, Some("Internal database connection error"));
    assert!(server_err.is_error);
    assert!(server_err.should_emergency_stop);
    assert_eq!(server_err.confidence, 1.0);
    assert!(matches!(
        server_err.error_type,
        Some(ErrorScreenType::HttpError { code: 500, .. })
    ));
}

#[test]
fn test_screen_error_detector_text_cues() {
    let detector = ScreenErrorDetector::new();

    // Normal text
    let normal = detector.detect_text("Welcome back! Select a game: Snake, Tetris, or Pong.");
    assert!(!normal.is_error);

    // Crash text
    let crash = detector.detect_text(
        "CRITICAL HALT: Fatal error encountered in rendering thread. Segmentation fault.",
    );
    assert!(crash.is_error);
    assert!(crash.should_emergency_stop);
    assert!(matches!(
        crash.error_type,
        Some(ErrorScreenType::ApplicationCrash { .. })
    ));

    // Disconnect text
    let disconnect = detector
        .detect_text("Warning: Disconnected from server. Please check your network connection.");
    assert!(disconnect.is_error);
    assert!(disconnect.should_emergency_stop);
    assert!(matches!(
        disconnect.error_type,
        Some(ErrorScreenType::Disconnected { .. })
    ));

    // Portuguese crash text
    let pt_crash = detector
        .detect_text("Alerta do sistema: Erro fatal detectado, conexão perdida com o servidor.");
    assert!(pt_crash.is_error);
    assert!(pt_crash.should_emergency_stop);
}

#[test]
fn test_screen_error_detector_visual_bsod_and_red_alert() {
    let detector = ScreenErrorDetector::new();

    // 1. Normal desktop screen (e.g. green grass background)
    let mut normal_img = RawImage::new(100, 100, vec![0; 100 * 100 * 4]);
    normal_img.fill(RgbaColor::new(50, 180, 50, 255));
    let normal_verdict = detector.detect_image(&normal_img);
    assert!(!normal_verdict.is_error);

    // 2. Blue Screen of Death (BSOD) (#0078D7)
    let mut bsod_img = RawImage::new(100, 100, vec![0; 100 * 100 * 4]);
    bsod_img.fill(RgbaColor::new(0, 120, 215, 255));
    let bsod_verdict = detector.detect_image(&bsod_img);
    assert!(bsod_verdict.is_error);
    assert!(bsod_verdict.should_emergency_stop);
    assert_eq!(
        bsod_verdict.error_type,
        Some(ErrorScreenType::BlueScreenOfDeath)
    );
    assert!(bsod_verdict.confidence >= 0.90);

    // 3. Red Critical Alert Screen (#DC1414)
    let mut red_img = RawImage::new(100, 100, vec![0; 100 * 100 * 4]);
    red_img.fill(RgbaColor::new(220, 20, 20, 255));
    let red_verdict = detector.detect_image(&red_img);
    assert!(red_verdict.is_error);
    assert!(red_verdict.should_emergency_stop);
    assert_eq!(
        red_verdict.error_type,
        Some(ErrorScreenType::RedCriticalAlert)
    );
    assert!(red_verdict.confidence >= 0.90);
}

#[test]
fn test_screen_error_detector_triggers_global_emergency_stop() {
    GlobalEmergencyStop::reset();
    GlobalEmergencyStop::clear_audit_log();
    assert!(!GlobalEmergencyStop::is_active());

    let detector = ScreenErrorDetector::new();

    // Multimodal call with crash text triggers emergency stop
    let verdict = detector.check_and_halt_if_error(
        None,
        Some("Kernel Panic: system halted unexpectedly."),
        None,
    );

    assert!(verdict.is_error);
    assert!(verdict.should_emergency_stop);
    assert!(
        GlobalEmergencyStop::is_active(),
        "GlobalEmergencyStop must be active after screen error!"
    );

    let record = GlobalEmergencyStop::last_record().expect("Must have recorded audit entry");
    assert!(matches!(record.reason, EmergencyStopReason::ScreenError(_)));
    assert!(
        record.message.contains("crash")
            || record.message.contains("Kernel Panic")
            || record.message.contains("fatal")
    );

    GlobalEmergencyStop::reset();
}

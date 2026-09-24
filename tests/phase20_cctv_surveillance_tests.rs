use alr_execution::{DesktopNotificationService, ThreatLevel, WindowsToastNotifier};
use alr_perception::{
    CctvSurveillanceEngine, DetectedEntityKind, PerimeterZone, RawImage, RgbaColor,
};
use std::time::Instant;

fn create_background(width: u32, height: u32, bg_color: RgbaColor) -> RawImage {
    let mut img = RawImage::new(width, height, vec![0; (width * height * 4) as usize]);
    img.fill(bg_color);
    img
}

#[test]
fn test_cctv_static_frame_no_motion() {
    let mut engine = CctvSurveillanceEngine::new();
    let bg_color = RgbaColor::new(30, 30, 30, 255);

    let frame1 = create_background(320, 240, bg_color);
    let frame2 = create_background(320, 240, bg_color);

    // Primeiro quadro estabelece o plano de fundo de referência
    let events1 = engine.process_frame(&frame1);
    assert!(
        events1.is_empty(),
        "Primeiro quadro de calibração não deve gerar eventos"
    );

    // Segundo quadro estático idêntico não deve conter movimento
    let events2 = engine.process_frame(&frame2);
    assert!(
        events2.is_empty(),
        "Quadro estático sem movimento deve produzir 0 eventos"
    );
}

#[test]
fn test_cctv_motion_detection_walking_person() {
    let mut engine = CctvSurveillanceEngine::new();
    let bg_color = RgbaColor::new(20, 20, 20, 255);
    let person_color = RgbaColor::new(220, 220, 220, 255);

    let frame1 = create_background(320, 240, bg_color);
    let mut frame2 = create_background(320, 240, bg_color);

    // Desenha silhueta com morfologia vertical típica de pessoa (20px largura x 50px altura => aspect ratio 2.5)
    let px = 100;
    let py = 80;
    let pw = 20;
    let ph = 50;
    frame2.draw_rect(px, py, pw, ph, person_color);

    engine.process_frame(&frame1);
    let events = engine.process_frame(&frame2);

    assert_eq!(
        events.len(),
        1,
        "Deve detectar exatamente 1 entidade em movimento"
    );
    let event = &events[0];
    assert_eq!(
        event.entity_kind,
        DetectedEntityKind::Pessoa,
        "Entidade com aspect ratio vertical 2.5 deve ser classificada como Pessoa"
    );
    assert!(
        event.confidence >= 0.80,
        "Confiança deve ser alta para morfologia típica"
    );
    assert_eq!(event.bbox.x, px);
    assert_eq!(event.bbox.y, py);
    assert_eq!(event.bbox.width, pw);
    assert_eq!(event.bbox.height, ph);
    assert_eq!(
        event.threat_level,
        ThreatLevel::Medio,
        "Pessoa fora de área restrita deve ter nível de ameaça Médio"
    );
    assert!(!event.tripwire_breached);
}

#[test]
fn test_cctv_restricted_perimeter_breach_critical_threat() {
    let mut engine = CctvSurveillanceEngine::new();
    let zone = PerimeterZone::new("Servidores - Acesso Restrito", 140, 40, 100, 100, true);
    engine.add_zone(zone);

    let bg_color = RgbaColor::new(15, 15, 15, 255);
    let intruder_color = RgbaColor::new(255, 50, 50, 255);

    let frame1 = create_background(320, 240, bg_color);
    let mut frame2 = create_background(320, 240, bg_color);

    // Desenha pessoa dentro da zona restrita (x=160, y=60, w=20, h=52)
    frame2.draw_rect(160, 60, 20, 52, intruder_color);

    engine.process_frame(&frame1);
    let events = engine.process_frame(&frame2);

    assert_eq!(events.len(), 1);
    let ev = &events[0];
    assert_eq!(ev.entity_kind, DetectedEntityKind::Pessoa);
    assert!(
        ev.tripwire_breached,
        "Deverá registrar violação do perímetro restrito (tripwire breached)"
    );
    assert_eq!(
        ev.threat_level,
        ThreatLevel::InvasaoCritica,
        "Invasão de pessoa em perímetro restrito DEVE acionar ThreatLevel::InvasaoCritica"
    );
    assert!(
        ev.summary
            .contains("Invasão da zona restrita 'Servidores - Acesso Restrito' detectada!"),
        "O resumo deve conter o nome exato da zona violada"
    );
}

#[test]
fn test_cctv_vehicle_parking_detection() {
    let mut engine = CctvSurveillanceEngine::new();
    let bg_color = RgbaColor::new(30, 30, 30, 255);
    let car_color = RgbaColor::new(50, 120, 200, 255);

    let frame1 = create_background(320, 240, bg_color);
    let mut frame2 = create_background(320, 240, bg_color);

    // Veículo com morfologia horizontal larga (80px largura x 35px altura => aspect ratio ~0.44, inv ~2.28)
    frame2.draw_rect(50, 130, 80, 35, car_color);

    engine.process_frame(&frame1);
    let events = engine.process_frame(&frame2);

    assert_eq!(events.len(), 1);
    let ev = &events[0];
    assert_eq!(
        ev.entity_kind,
        DetectedEntityKind::Veiculo,
        "Objeto horizontal largo deve ser classificado como Veículo"
    );
    assert!(ev.confidence >= 0.85);
    assert_eq!(ev.threat_level, ThreatLevel::Baixo);
    assert!(!ev.tripwire_breached);
}

#[test]
fn test_cctv_windows_toast_notification_dispatch() {
    let notifier = WindowsToastNotifier::new(true); // modo dry-run para testes automatizados determinísticos
    assert_eq!(notifier.notification_count(), 0);

    // Dispara notificação de invasão crítica
    let res = notifier.send_notification(
        "ALERTA DE SEGURANÇA ALR",
        "Intruso detectado no Perímetro Restrito dos Servidores!",
        ThreatLevel::InvasaoCritica,
    );
    assert!(res.is_ok());
    assert_eq!(notifier.notification_count(), 1);

    let last = notifier.last_notification().expect("Deve haver registro");
    assert_eq!(last.threat, ThreatLevel::InvasaoCritica);
    assert!(
        last.audible_alert,
        "Ameaça crítica deve disparar alerta sonoro audível"
    );
    assert!(last.delivered);
    assert_eq!(last.title, "ALERTA DE SEGURANÇA ALR");

    // Dispara notificação de nível baixo (sem alerta sonoro de alarme)
    let res2 = notifier.send_notification(
        "Movimento Detectado",
        "Veículo estacionado na doca externa",
        ThreatLevel::Baixo,
    );
    assert!(res2.is_ok());
    assert_eq!(notifier.notification_count(), 2);

    let last2 = notifier.last_notification().expect("Deve haver registro");
    assert_eq!(last2.threat, ThreatLevel::Baixo);
    assert!(
        !last2.audible_alert,
        "Ameaça de nível baixo não deve disparar alerta sonoro"
    );

    // Limpeza de histórico
    notifier.clear_history();
    assert_eq!(notifier.notification_count(), 0);
}

#[test]
fn test_cctv_submillisecond_cpu_latency() {
    let mut engine = CctvSurveillanceEngine::new();
    let bg_color = RgbaColor::new(20, 20, 20, 255);
    let obj_color = RgbaColor::new(200, 200, 200, 255);

    let frame1 = create_background(320, 240, bg_color);
    engine.process_frame(&frame1);

    // Executa 50 iterações com movimento para medir latência estável
    let iterations = 50;
    let mut total_duration = std::time::Duration::ZERO;

    for i in 0..iterations {
        let mut frame = create_background(320, 240, bg_color);
        // Move o objeto ligeiramente a cada iteração
        let x = 50 + (i % 80) as u32;
        let y = 60 + (i % 40) as u32;
        frame.draw_rect(x, y, 22, 50, obj_color);

        let start = Instant::now();
        let events = engine.process_frame(&frame);
        let elapsed = start.elapsed();

        total_duration += elapsed;
        assert_eq!(events.len(), 1);
    }
    let avg_duration = total_duration / iterations as u32;
    let avg_micros = avg_duration.as_micros();
    println!("Tempo médio de processamento por frame: {} µs", avg_micros);

    let max_allowed = if cfg!(debug_assertions) {
        std::time::Duration::from_millis(5)
    } else {
        std::time::Duration::from_millis(1)
    };

    assert!(
        avg_duration < max_allowed,
        "Latência média do motor CCTV ({:?}) deve ser estritamente inferior a {:?}",
        avg_duration,
        max_allowed
    );
}

#[test]
fn test_cctv_ascii_feed_rendering() {
    let mut engine = CctvSurveillanceEngine::new();
    engine.add_zone(PerimeterZone::new("Zona Restrita", 100, 50, 100, 100, true));

    let bg_color = RgbaColor::new(10, 10, 10, 255);
    let obj_color = RgbaColor::new(230, 230, 230, 255);

    let frame1 = create_background(320, 240, bg_color);
    let mut frame2 = create_background(320, 240, bg_color);
    frame2.draw_rect(120, 70, 24, 52, obj_color);

    engine.process_frame(&frame1);
    let events = engine.process_frame(&frame2);

    let ascii = engine.render_ascii_feed(&frame2, &events, 40, 15);
    assert!(!ascii.is_empty());
    assert!(ascii.contains('+'));
    assert!(ascii.contains('|'));
    assert!(
        ascii.contains('P'),
        "Deve conter caractere 'P' representando pessoa no grid ASCII"
    );
}

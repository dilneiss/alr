//! Suíte de Testes de Integração da Fase 30:
//! ALR Autonomous QA Test Automation Engine (Web Pages & Programas Desktop/APIs)
//!
//! Validações rigorosas de:
//! 1. Execução de bateria de QA em páginas web (Checkout E2E, formulários, asserções de DOM e verificação visual).
//! 2. Auto-recuperação (Self-Healing) de seletores quebrados via árvore de acessibilidade ByRole.
//! 3. Execução de bateria de QA em processos de programas/APIs com checagem de código de saída (Exit Code 0), stdout e ausência de pânicos.
//! 4. Presets canônicos do Playground (qa_web_automation e qa_program_automation) com grafos de decisão (DAG).
//! 5. Avaliação sub-milissegundo via JevTypedJudgeEngine.

use alr_agent::{QaAutomationEngine, QaTargetType, QaTestSpec, QaVerdict, QaWebStep};
use alr_models::jev_playground::{
    build_qa_program_graph, build_qa_web_graph, JevAnswerOutput, JevPlaygroundPreset,
    JevTypedJudgeEngine,
};

#[test]
fn test_qa_web_automation_e2e_checkout() {
    let engine = QaAutomationEngine::new();
    let spec = QaTestSpec::e2e_web_checkout("https://shop.alr.local/checkout");

    let report = engine.run_web_qa(&spec).expect("Web QA suite must run");

    assert_eq!(report.spec_id, "qa-web-checkout-01");
    assert_eq!(report.target_type, QaTargetType::WebPage);
    assert_eq!(report.total_assertions, 7);
    assert_eq!(report.passed_assertions, 7);
    assert_eq!(report.failed_assertions, 0);
    assert_eq!(
        report.verdict,
        QaVerdict::ConditionallyApprovedWithHealedBugs
    );
    assert!(report.healed_assertions >= 1);
    assert!(report.verdict_text.contains("APROVADO"));
    assert!(!report.execution_log.is_empty());
}

#[test]
fn test_qa_web_automation_self_healing_selector() {
    let engine = QaAutomationEngine::new();
    // Teste com seletor alterado propositalmente para disparar self-healing
    let spec = QaTestSpec {
        id: "qa-heal-test".to_string(),
        name: "Self-Healing Test".to_string(),
        target_type: QaTargetType::WebPage,
        target_path: "https://app.alr.local".to_string(),
        web_steps: vec![
            QaWebStep::ClickButton {
                selector: "#botao-inexistente-redesign".to_string(),
                fallback_role: Some("button[name='Finalizar Pedido']".to_string()),
            },
            QaWebStep::AssertVisible("#order-confirmation-modal".to_string()),
        ],
        program_args: Vec::new(),
        program_assertions: Vec::new(),
        timeout_secs: 10,
        enable_self_healing: true,
    };

    let report = engine.run_web_qa(&spec).expect("Should run healing QA");
    assert_eq!(report.passed_assertions, 2);
    assert_eq!(report.healed_assertions, 1);
    assert!(report.results[0].self_healed);
    assert!(report.results[0].message.contains("auto-correção"));
}

#[test]
fn test_qa_program_process_assertions() {
    let engine = QaAutomationEngine::new();
    let spec = QaTestSpec::program_cli_test("./target/release/payment-processor");

    let report = engine
        .run_program_qa(&spec)
        .expect("Program QA suite must run");

    assert_eq!(report.spec_id, "qa-program-cli-01");
    assert_eq!(report.target_type, QaTargetType::ProgramProcess);
    assert_eq!(report.total_assertions, 5);
    assert_eq!(report.passed_assertions, 5);
    assert_eq!(report.failed_assertions, 0);
    assert_eq!(report.verdict, QaVerdict::ApprovedForRelease);
    assert!(report.verdict_text.contains("PROGRAMA CERTIFICADO"));
    assert!(!report.execution_log.is_empty());
}

#[test]
fn test_qa_playground_presets_and_graphs() {
    // 1. Preset Web QA
    let web_preset = JevPlaygroundPreset::qa_web_automation();
    assert_eq!(web_preset.id, "qa_web_automation");
    assert_eq!(web_preset.category, "QA & Testes");
    assert_eq!(web_preset.badge, "noul");
    assert!(web_preset.default_threshold >= 0.80);

    let web_graph = build_qa_web_graph();
    assert_eq!(web_graph.len(), 6);
    assert_eq!(web_graph[0].id, "in");
    assert_eq!(web_graph[5].id, "verdict");

    // 2. Preset Program QA
    let prog_preset = JevPlaygroundPreset::qa_program_automation();
    assert_eq!(prog_preset.id, "qa_program_automation");
    assert_eq!(prog_preset.category, "QA & Testes");
    assert_eq!(prog_preset.badge, "choice");

    let prog_graph = build_qa_program_graph();
    assert_eq!(prog_graph.len(), 5);
    assert_eq!(prog_graph[0].id, "in");
    assert_eq!(prog_graph[4].id, "cert");

    // 3. Avaliação no motor tipado
    let engine = JevTypedJudgeEngine::new();

    let resp_web = engine
        .evaluate(&web_preset.request)
        .expect("Web preset evaluation should succeed");
    assert_eq!(resp_web.model, "alr/qa-automation-engine");
    match resp_web.answers.get("test_passed").unwrap() {
        JevAnswerOutput::Noul { noul } => {
            assert!(*noul >= 0.85);
        }
        _ => panic!("Expected noul answer"),
    }

    let resp_prog = engine
        .evaluate(&prog_preset.request)
        .expect("Program preset evaluation should succeed");
    assert_eq!(resp_prog.model, "alr/qa-supervisor-engine");
    match resp_prog.answers.get("qa_verdict").unwrap() {
        JevAnswerOutput::Choice { choice, .. } => {
            assert_eq!(choice, "approved_pass");
        }
        _ => panic!("Expected choice answer"),
    }
}

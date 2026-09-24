use alr_agent::supervisor::{
    AgentCompletionPayload, AgentDriverTarget, AgentSupervisionEngine, SimulatedAgentDriver,
    SupervisorTask, TestExecutionPlan,
};
use std::sync::Arc;

// =========================================================================
// 1. FULL SUCCESS CYCLE IN 1 ATTEMPT
// =========================================================================

#[test]
fn test_full_success_cycle_single_attempt() {
    let driver = Arc::new(SimulatedAgentDriver::new());

    let task = SupervisorTask::new(
        "task-login-fix",
        "Fix OAuth Callback Redirection",
        "Ensure user is properly redirected to /dashboard on valid token.",
        AgentDriverTarget::Web,
    );

    driver.enqueue_response(
        "task-login-fix",
        AgentCompletionPayload::new(
            "Redirect logic implemented in auth_controller.ts.\n```bash\nTest: mock:pass:OAuth redirect verified\n```",
            true,
        ),
    );

    let mut engine = AgentSupervisionEngine::with_simulated_driver(vec![task], driver);
    let summary = engine.run_full_lifecycle().expect("Lifecycle failed");

    assert_eq!(summary.total_tasks, 1);
    assert_eq!(summary.completed_tasks, 1);
    assert_eq!(summary.failed_tasks, 0);
    assert_eq!(summary.total_feedback_cycles, 0);

    let result = &summary.results[0];
    assert_eq!(result.task_id, "task-login-fix");
    assert!(result.success);
    assert_eq!(result.cycles, 1);
    assert!(result.validation_outcome.as_ref().unwrap().passed);
}

// =========================================================================
// 2. SELF-RECOVERY VIA ERROR FEEDBACK LOOP
// =========================================================================

#[test]
fn test_self_recovery_feedback_loop() {
    let driver = Arc::new(SimulatedAgentDriver::new());

    let task = SupervisorTask::new(
        "task-calculator-division",
        "Implement Safe Division in Math Engine",
        "Return None on divide-by-zero without panicking.",
        AgentDriverTarget::Cli,
    )
    .with_max_retries(3);

    // Attempt 1: Agent writes code, but test fails due to divide by zero panic
    driver.enqueue_response(
        "task-calculator-division",
        AgentCompletionPayload::new(
            "Initial division implementation.\n```bash\nTest: mock:fail:panic: attempt to divide by zero at line 14\n```",
            true,
        ),
    );

    // Attempt 2: After receiving feedback from supervisor, agent corrects code and test passes!
    driver.enqueue_response(
        "task-calculator-division",
        AgentCompletionPayload::new(
            "Added zero-check guard before division.\n```bash\nTest: mock:pass:All division edge cases passed cleanly\n```",
            true,
        ),
    );

    let mut engine = AgentSupervisionEngine::with_simulated_driver(vec![task], driver.clone());
    let summary = engine.run_full_lifecycle().expect("Lifecycle failed");

    assert_eq!(summary.total_tasks, 1);
    assert_eq!(summary.completed_tasks, 1);
    assert_eq!(summary.failed_tasks, 0);
    assert_eq!(
        summary.total_feedback_cycles, 1,
        "Should have 1 feedback cycle"
    );

    let result = &summary.results[0];
    assert!(result.success);
    assert_eq!(result.cycles, 2, "Took 2 attempts (1 retry)");

    // Verify error was fed back to the agent
    let fed_errors = driver.get_fed_errors();
    assert_eq!(fed_errors.len(), 1);
    assert_eq!(fed_errors[0].0, "task-calculator-division");
    assert!(
        fed_errors[0].1.contains("attempt to divide by zero"),
        "Fed error should contain failure details, got: {}",
        fed_errors[0].1
    );
}

// =========================================================================
// 3. REJECTION OF FALSE SUCCESS (AGENT CLAIMS DONE, BUT QA FAILS)
// =========================================================================

#[test]
fn test_rejection_of_false_success() {
    let driver = Arc::new(SimulatedAgentDriver::new());

    // Task with max_retries = 1
    let task = SupervisorTask::new(
        "task-security-patch",
        "Patch SQL Injection in Search Filter",
        "Sanitize customer search terms to prevent SQLi.",
        AgentDriverTarget::Web,
    )
    .with_max_retries(1);

    // Attempt 1: Agent claims total completion, but QA test fails!
    driver.enqueue_response(
        "task-security-patch",
        AgentCompletionPayload::new(
            "Everything is 100% patched and secure!\n```bash\nTest: mock:fail:SQL vulnerability still exploitable via OR 1=1\n```",
            true, // Agent claims completion, but QA will reject!
        ),
    );

    // Attempt 2 (Retry 1): Agent still fails the test
    driver.enqueue_response(
        "task-security-patch",
        AgentCompletionPayload::new(
            "Tried a second regex sanitizer, surely it works now.\n```bash\nTest: mock:fail:Bypass detected via UNION SELECT\n```",
            true,
        ),
    );

    let mut engine = AgentSupervisionEngine::with_simulated_driver(vec![task], driver);
    let summary = engine.run_full_lifecycle().expect("Lifecycle failed");

    assert_eq!(summary.total_tasks, 1);
    assert_eq!(summary.completed_tasks, 0, "Must NOT mark as completed!");
    assert_eq!(summary.failed_tasks, 1, "Must mark as failed!");

    let result = &summary.results[0];
    assert!(!result.success, "Result must be marked failure");
    assert!(result.error.is_some());
    assert!(result.error.as_ref().unwrap().contains("UNION SELECT"));
}

// =========================================================================
// 4. MULTI-TASK SEQUENTIAL QUEUE EXECUTION
// =========================================================================

#[test]
fn test_multi_task_queue_execution() {
    let driver = Arc::new(SimulatedAgentDriver::new());

    let t1 = SupervisorTask::new(
        "task-1-web",
        "Web Component Responsiveness",
        "Adjust flexbox layout for mobile viewport.",
        AgentDriverTarget::Web,
    );
    driver.enqueue_response(
        "task-1-web",
        AgentCompletionPayload::new(
            "Flexbox wrapped.\n```bash\nTest: mock:pass:320px layout verified\n```",
            true,
        ),
    );

    let t2 = SupervisorTask::new(
        "task-2-desktop",
        "Native Desktop Clipboard Sync",
        "Sync text selection to clipboard.",
        AgentDriverTarget::Desktop,
    )
    .with_max_retries(2);
    // Fails on attempt 1
    driver.enqueue_response(
        "task-2-desktop",
        AgentCompletionPayload::new(
            "Clipboard handler hooked.\n```bash\nTest: mock:fail:Clipboard lock timeout\n```",
            true,
        ),
    );
    // Recovers on attempt 2
    driver.enqueue_response(
        "task-2-desktop",
        AgentCompletionPayload::new(
            "Handled lock retry gracefully.\n```bash\nTest: mock:pass:Clipboard synced\n```",
            true,
        ),
    );

    let t3 = SupervisorTask::new(
        "task-3-cli",
        "CLI Output JSON Formatting",
        "Support --json flag on list command.",
        AgentDriverTarget::Cli,
    );
    driver.enqueue_response(
        "task-3-cli",
        AgentCompletionPayload::new(
            "Added serde JSON serialization.\n```bash\nTest: mock:pass:JSON output valid\n```",
            true,
        ),
    );

    let mut engine = AgentSupervisionEngine::with_simulated_driver(vec![t1, t2, t3], driver);
    let summary = engine.run_full_lifecycle().expect("Lifecycle failed");

    assert_eq!(summary.total_tasks, 3);
    assert_eq!(summary.completed_tasks, 3);
    assert_eq!(summary.failed_tasks, 0);
    assert_eq!(summary.total_feedback_cycles, 1);
    assert_eq!(summary.results.len(), 3);

    assert_eq!(summary.results[0].task_id, "task-1-web");
    assert_eq!(summary.results[0].cycles, 1);

    assert_eq!(summary.results[1].task_id, "task-2-desktop");
    assert_eq!(summary.results[1].cycles, 2);

    assert_eq!(summary.results[2].task_id, "task-3-cli");
    assert_eq!(summary.results[2].cycles, 1);
}

// =========================================================================
// 5. TEST INSTRUCTION EXTRACTION HEURISTICS
// =========================================================================

#[test]
fn test_extract_test_instructions_heuristics() {
    let task = SupervisorTask::new("test-task", "Dummy", "Dummy", AgentDriverTarget::Cli)
        .with_test_instructions(vec!["cargo test --test baseline".to_string()]);

    let engine = AgentSupervisionEngine::new(vec![task]);

    // Test extraction from markdown code block
    let output1 = r#"
Here is what I changed:
```bash
cargo test -p alr-agent --test foo
```
Assert: stdout contains "test result: ok"
"#;
    let plan1 = engine.extract_test_instructions(output1);
    assert_eq!(plan1.commands, vec!["cargo test -p alr-agent --test foo"]);
    assert_eq!(
        plan1.expected_assertions,
        vec!["stdout contains \"test result: ok\""]
    );

    // Test extraction from prefix
    let output2 = "I completed the work.\nTest: cargo test --test bar\nRun: echo verify";
    let plan2 = engine.extract_test_instructions(output2);
    assert_eq!(plan2.commands, vec!["cargo test --test bar", "echo verify"]);

    // Test fallback to task instructions when output has no test commands
    let output3 = "I made the changes but forgot to write test command in my report.";
    let mut engine_with_active = engine;
    engine_with_active.read_next_task(); // activates current_task
    let plan3 = engine_with_active.extract_test_instructions(output3);
    assert_eq!(plan3.commands, vec!["cargo test --test baseline"]);
}

// =========================================================================
// 6. ASSERTION EVALUATION LOGIC
// =========================================================================

#[test]
fn test_assertion_evaluation() {
    let engine = AgentSupervisionEngine::new(vec![]);

    // Assertion passes
    let mut plan_pass =
        TestExecutionPlan::new(vec!["mock:pass:EXPECTED_KEYWORD_FOUND".to_string()]);
    plan_pass = plan_pass.with_assertion("stdout contains \"EXPECTED_KEYWORD_FOUND\"");
    let outcome_pass = engine
        .execute_qa_validation(&plan_pass)
        .expect("Validation error");
    assert!(outcome_pass.passed);

    // Assertion fails
    let mut plan_fail = TestExecutionPlan::new(vec!["mock:pass:SOMETHING_ELSE".to_string()]);
    plan_fail = plan_fail.with_assertion("stdout contains \"MISSING_KEYWORD\"");
    let outcome_fail = engine
        .execute_qa_validation(&plan_fail)
        .expect("Validation error");
    assert!(!outcome_fail.passed);
    assert!(outcome_fail
        .failure_reason
        .unwrap()
        .contains("MISSING_KEYWORD"));
}

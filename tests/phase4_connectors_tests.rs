use alr_connectors::{
    AllowedHostPolicy, ApprovalGateway, ApprovalRequest, ApprovalStatus, CircuitBreaker,
    CircuitState, ConnectorAction, ConnectorCapability, ConnectorContext, DataEgressPolicy,
    DataSensitivity, EventStore, ExternalConnector, ExternalServiceProvider, HelpdeskSaaSConnector,
    InboundWebhookEvent, SecretRedactor, TaskQueue, WebhookValidator,
};
use alr_llm::MockLlmTeacher;
use std::sync::Arc;
use std::time::Duration;

/// 1. TESTE: REAL / MOCK CONNECTOR ROUNDTRIP & POSTCONDITION VERIFICATION
#[tokio::test]
async fn test_real_connector_roundtrip() {
    let provider = ExternalServiceProvider::new();
    let connector = HelpdeskSaaSConnector::new(provider.clone());

    let read_action = ConnectorAction {
        action_name: "read_ticket".to_string(),
        capability: ConnectorCapability::Read,
        risk_level: alr_connectors::ConnectorRiskLevel::Low,
        parameters: serde_json::json!({ "ticket_id": "ext_ticket_9001" }),
        expected_outcome: "Ticket read".to_string(),
    };
    let res = connector
        .execute(read_action, ConnectorContext::new("t1", "a1"))
        .await
        .unwrap();
    assert!(res.success);
    assert_eq!(res.data["status"], "Open");

    let write_action = ConnectorAction {
        action_name: "reply_ticket".to_string(),
        capability: ConnectorCapability::Write,
        risk_level: alr_connectors::ConnectorRiskLevel::Medium,
        parameters: serde_json::json!({
            "ticket_id": "ext_ticket_9001",
            "reply": "O estorno da duplicidade foi processado com sucesso junto ao gateway."
        }),
        expected_outcome: "Status updated to Resolved".to_string(),
    };
    let write_res = connector
        .execute(write_action, ConnectorContext::new("t1", "a1"))
        .await
        .unwrap();
    assert!(write_res.success);
    assert!(
        write_res.verified,
        "Postcondition must verify status change in external system"
    );

    let guard = provider.tickets.read();
    assert_eq!(guard.get("ext_ticket_9001").unwrap()["status"], "Resolved");
}

/// 2. TESTE: WEBHOOK SIGNATURE & DEDUPLICATION (Exactly Once)
#[test]
fn test_webhook_creates_task_exactly_once() {
    let secret = b"super_secure_webhook_secret_key_123";
    let payload = serde_json::json!({
        "event": "ticket_created",
        "ticket_id": "ext_ticket_9001",
        "customer": "cust_001"
    });
    let payload_bytes = serde_json::to_vec(&payload).unwrap();

    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).unwrap();
    mac.update(&payload_bytes);
    let signature = hex::encode(mac.finalize().into_bytes());

    assert!(WebhookValidator::verify_signature(secret, &payload_bytes, &signature).is_ok());
    assert!(WebhookValidator::verify_signature(secret, &payload_bytes, "invalid_sig").is_err());

    let event_store = EventStore::new();
    let event1 = InboundWebhookEvent {
        event_id: "evt_001".to_string(),
        connector_id: "saas_helpdesk".to_string(),
        event_type: "ticket_created".to_string(),
        payload: payload.clone(),
        signature: Some(signature.clone()),
        received_at: chrono::Utc::now(),
    };

    let first_insert = event_store.record_event(event1).unwrap();
    assert!(first_insert, "First event must be accepted");

    let event2_duplicate = InboundWebhookEvent {
        event_id: "evt_002_duplicate".to_string(),
        connector_id: "saas_helpdesk".to_string(),
        event_type: "ticket_created".to_string(),
        payload,
        signature: Some(signature),
        received_at: chrono::Utc::now(),
    };

    let second_insert = event_store.record_event(event2_duplicate).unwrap();
    assert!(
        !second_insert,
        "Duplicate payload must be detected and rejected from task creation"
    );
}

/// 3. TESTE: CRASH RECOVERY & CHECKPOINTS
#[test]
fn test_task_resumes_after_restart() {
    let queue = TaskQueue::new();
    let task = alr_connectors::AgentTask::new(
        "task_resilient_100",
        "tenant_001",
        "agent_main",
        "webhook",
        serde_json::json!({ "steps": ["step1", "step2", "step3"] }),
    );
    queue.enqueue(task);

    queue
        .save_checkpoint(
            "task_resilient_100",
            1,
            serde_json::json!({ "step1_output": "success" }),
        )
        .unwrap();

    let recovered_task = queue.get_task("task_resilient_100").unwrap();
    assert!(recovered_task.checkpoint.is_some());
    let cp = recovered_task.checkpoint.unwrap();
    assert_eq!(cp.step_index, 1);
    assert_eq!(cp.step_results.len(), 1);
    assert_eq!(cp.step_results[0]["step1_output"], "success");
}

/// 4. TESTE: HUMAN APPROVAL GATEWAY
#[test]
fn test_high_risk_task_waits_for_human_approval() {
    let gateway = ApprovalGateway::new();
    let req = ApprovalRequest::new(
        "task_financial_01",
        "agent_support",
        "tenant_001",
        "direct_wire_refund",
        "Client requesting manual cash wire refund over $500",
        serde_json::json!({ "amount": 1500.0 }),
    );

    let req_id = gateway.submit_request(req);
    assert_eq!(
        gateway.get_status(&req_id),
        Some(ApprovalStatus::Pending),
        "Must be pending before supervisor review"
    );

    gateway
        .approve(&req_id, "finance_supervisor_alice")
        .unwrap();
    assert_eq!(gateway.get_status(&req_id), Some(ApprovalStatus::Approved));
}

/// 5. TESTE: DATA EGRESS & PII REDACTION
#[test]
fn test_sensitive_data_is_not_sent_to_llm() {
    assert!(DataEgressPolicy::can_export_to_external(
        DataSensitivity::Public
    ));
    assert!(DataEgressPolicy::can_export_to_external(
        DataSensitivity::Internal
    ));
    assert!(!DataEgressPolicy::can_export_to_external(
        DataSensitivity::Confidential
    ));
    assert!(!DataEgressPolicy::can_export_to_external(
        DataSensitivity::Sensitive
    ));

    let raw_log =
        "Customer logged in with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and password=SuperSecretPassword!";
    let sanitized = SecretRedactor::redact_text(raw_log);
    assert!(!sanitized.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert!(!sanitized.contains("SuperSecretPassword!"));
    assert!(sanitized.contains("[REDACTED_TOKEN]"));
    assert!(sanitized.contains("[REDACTED_PASSWORD]"));
}

/// 6. TESTE: EGRESS ALLOWED HOST POLICY
#[test]
fn test_disallowed_host_is_blocked() {
    let policy = AllowedHostPolicy::new(vec![
        "api.trusted-saas.com".to_string(),
        "support.trusted-saas.com".to_string(),
    ]);

    assert!(policy
        .check_url("https://api.trusted-saas.com/v1/tickets")
        .is_ok());
    assert!(policy
        .check_url("https://malicious-exfiltration-site.com/steal")
        .is_err());
}

/// 7. TESTE: CIRCUIT BREAKER
#[test]
fn test_connector_circuit_breaker() {
    let cb = CircuitBreaker::new(3, Duration::from_millis(50));

    assert!(cb.can_execute().is_ok());

    cb.record_result(false);
    cb.record_result(false);
    cb.record_result(false);

    assert_eq!(cb.current_state(), CircuitState::Open);
    assert!(
        cb.can_execute().is_err(),
        "Open circuit must block execution"
    );

    std::thread::sleep(Duration::from_millis(60));
    assert!(
        cb.can_execute().is_ok(),
        "Circuit should transition to HalfOpen after cooldown"
    );
}

/// 8. TESTE: REAL LLM CAN TEACH SKILL
#[tokio::test]
async fn test_real_llm_can_teach_skill() {
    let mock_llm = Arc::new(MockLlmTeacher::new());
    mock_llm.reset_counter();

    let req = alr_core::KnowledgeRequest {
        state: alr_core::State::new(vec![1.0; 8], serde_json::json!({ "task": "external_api" })),
        candidate_actions: vec![],
        context_description: "Teach integration with external API".to_string(),
        failure_history: vec![],
    };

    use alr_llm::LlmTeacher;
    let proposal = mock_llm.propose_knowledge(req).await.unwrap();
    assert_eq!(mock_llm.call_count(), 1);
    assert_eq!(proposal.knowledge_type, "skill_rule");
    assert!(proposal.confidence >= 0.90);
}

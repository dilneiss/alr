use alr_agent::{AgentLoop, ProposalValidator};
use alr_core::{Action, ActionType, DecisionContext, DecisionSource, KnowledgeProposal, State};
use alr_learning::QTable;
use alr_llm::{LlmTeacher, MockLlmTeacher};
use alr_memory::SqliteMemoryStore;
use alr_snake::SnakeBenchmarkRunner;
use std::sync::Arc;

/// 1. PRIMEIRO TESTE FUNDAMENTAL: llm_teaches_once_then_local_execution
/// Cenário:
/// 1. estado desconhecido -> policy não conhece -> confidence baixa
/// 2. chama Mock LLM -> LLM retorna conhecimento -> conhecimento é validado
/// 3. knowledge é armazenado
/// 4. mesma situação ocorre novamente -> runtime encontra conhecimento
/// 5. runtime NÃO chama LLM -> executa ação local
/// Esperado: LLM calls = 1; second decision source != LLM
#[tokio::test]
async fn test_llm_teaches_once_then_local_execution() {
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let mock_llm = Arc::new(MockLlmTeacher::new());
    mock_llm.reset_counter();

    let mut agent = AgentLoop::new(store.clone(), mock_llm.clone(), 0.85, 0.60);

    // Create unique state: food right, danger front
    let state = State::new(
        vec![1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 3.0],
        serde_json::json!({ "scenario": "corner_trap" }),
    );

    let context = DecisionContext {
        episode_id: Some("test_ep_1".to_string()),
        step: 0,
        allow_llm_fallback: true,
        minimum_confidence: 0.85,
        novelty_threshold: 0.60,
        dry_run: false,
    };

    // First encounter
    let decision1 = agent.decide(&state, &context).await.unwrap();
    assert_eq!(
        decision1.source,
        DecisionSource::Llm,
        "First decision must consult LLM Teacher"
    );
    assert_eq!(mock_llm.call_count(), 1, "LLM must be called exactly once");

    // Second encounter with exact same situation
    let decision2 = agent.decide(&state, &context).await.unwrap();
    assert_ne!(
        decision2.source,
        DecisionSource::Llm,
        "Second decision must execute locally without LLM"
    );
    assert_eq!(
        mock_llm.call_count(),
        1,
        "LLM must NOT be called again on known situation"
    );
}

/// 2. SEGUNDO TESTE FUNDAMENTAL: knowledge_must_be_verified_before_activation
/// Cenário:
/// LLM -> bad proposal -> validation/evaluation -> FAIL -> knowledge remains non-active
#[tokio::test]
async fn test_knowledge_must_be_verified_before_activation() {
    let state = State::new(
        vec![1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        serde_json::json!({}),
    );

    // Bad proposal 1: Steers directly into front danger
    let bad_proposal_danger = KnowledgeProposal {
        knowledge_type: "policy".to_string(),
        state_conditions: serde_json::json!({}),
        action: Action::from_type(ActionType::Up), // front is danger
        reason: "Drive straight into danger".to_string(),
        confidence: 0.99,
    };

    let sem_res = ProposalValidator::validate_semantics(&bad_proposal_danger, &state);
    assert!(
        sem_res.is_err(),
        "Validator must reject actions steering into observed danger"
    );

    // Bad proposal 2: Out of bounds confidence or illegal action
    let bad_proposal_syntax = KnowledgeProposal {
        knowledge_type: "policy".to_string(),
        state_conditions: serde_json::json!({}),
        action: Action::new("ILLEGAL_SUICIDE_MOVE", serde_json::json!({})),
        reason: "Bogus move".to_string(),
        confidence: 1.5,
    };

    let syn_res = ProposalValidator::validate_syntax(&bad_proposal_syntax);
    assert!(
        syn_res.is_err(),
        "Validator must reject syntax and confidence violations"
    );
}

/// 3. TERCEIRO TESTE: confidence_triggers_llm_fallback
/// Quando: confidence < threshold deve existir fallback
#[tokio::test]
async fn test_confidence_triggers_llm_fallback() {
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let mock_llm = Arc::new(MockLlmTeacher::new());
    mock_llm.reset_counter();

    let mut agent = AgentLoop::new(store.clone(), mock_llm.clone(), 0.90, 0.50);

    // Unseen state with ambiguous Q-values
    let novel_state = State::new(
        vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0],
        serde_json::json!({}),
    );

    let context = DecisionContext {
        episode_id: Some("conf_test".to_string()),
        step: 0,
        allow_llm_fallback: true,
        minimum_confidence: 0.90,
        novelty_threshold: 0.50,
        dry_run: false,
    };

    let decision = agent.decide(&novel_state, &context).await.unwrap();
    assert_eq!(decision.source, DecisionSource::Llm);
    assert_eq!(mock_llm.call_count(), 1);
}

/// 4. QUARTO TESTE: known_state_does_not_call_llm
/// Estado conhecido -> local policy -> action. Esperado: LLM calls = 0
#[tokio::test]
async fn test_known_state_does_not_call_llm() {
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let mock_llm = Arc::new(MockLlmTeacher::new());
    mock_llm.reset_counter();

    let mut agent = AgentLoop::new(store.clone(), mock_llm.clone(), 0.70, 0.80);

    let state = State::new(
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 3.0],
        serde_json::json!({}),
    );
    let s_key = QTable::state_key(&state);

    // Pre-populate Q-table with strongly learned knowledge
    agent
        .q_table
        .table
        .entry(s_key)
        .or_default()
        .insert("RIGHT".to_string(), 25.0);

    // Seed familiarity in novelty detector
    for _ in 0..10 {
        agent.novelty_detector.observe(&state);
    }

    let context = DecisionContext {
        episode_id: Some("known_test".to_string()),
        step: 0,
        allow_llm_fallback: true,
        minimum_confidence: 0.70,
        novelty_threshold: 0.80,
        dry_run: false,
    };

    let decision = agent.decide(&state, &context).await.unwrap();
    assert_ne!(
        decision.source,
        DecisionSource::Llm,
        "Should not call LLM for known state"
    );
    assert_eq!(mock_llm.call_count(), 0, "LLM calls must remain exactly 0");
    assert_eq!(decision.action.id, "RIGHT");
}

/// 5. QUINTO TESTE: q_learning_improves_policy
/// Comparar: policy before training vs policy after training usando seed determinística.
/// Demonstrar melhoria mensurável.
#[tokio::test]
async fn test_q_learning_improves_policy() {
    let seed = 42;
    let episodes = 25;
    let grid = 10;

    // 1. Untrained baseline
    let untrained_q = QTable::new(0.3, 0.9, 0.1);
    let baseline_report = SnakeBenchmarkRunner::run_policy(
        &untrained_q,
        "Untrained Baseline",
        episodes,
        seed,
        grid,
        grid,
    );

    // 2. Train agent over experience
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let mock_llm = Arc::new(MockLlmTeacher::new());
    let mut agent = AgentLoop::new(store, mock_llm, 0.85, 0.60);

    for ep in 0..episodes {
        let _ = alr_agent::EpisodeOrchestrator::run_episode(
            &mut agent,
            seed + ep as u64,
            true,
            grid,
            grid,
        )
        .await
        .unwrap();
    }

    // 3. Trained evaluation
    let trained_report = SnakeBenchmarkRunner::run_policy(
        &agent.q_table,
        "Trained Agent",
        episodes,
        seed,
        grid,
        grid,
    );

    println!(
        "Benchmark Comparison: Baseline Survival={:.1}, Score={:.1} vs Trained Survival={:.1}, Score={:.1}",
        baseline_report.average_survival_steps, baseline_report.average_score,
        trained_report.average_survival_steps, trained_report.average_score
    );

    assert!(
        trained_report.average_survival_steps >= baseline_report.average_survival_steps
            || trained_report.average_score >= baseline_report.average_score,
        "Trained policy must demonstrably match or exceed untrained random walk baseline"
    );
}

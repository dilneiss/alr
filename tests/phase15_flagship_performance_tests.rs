use alr_agent::{
    GetOrderTool, GetPaymentTool, GetRefundPolicyTool, ProceduralSkill, ProceduralStep,
    SendTicketReplyTool, SupportDatabase, SupportIntent, ToolContext,
};
use alr_core::LockFreeRingBuffer;
use alr_models::SimdFeatureVectorizer;
use alr_sandbox::{WasmSandboxConfig, WasmSandboxError, WasmSkillSandbox};
use std::collections::HashMap;
use std::sync::Arc;
use std::thread;

/// 1. TESTE: EQUIVALÊNCIA MATEMÁTICA E PERFORMANCE DO SIMD VECTORIZER VS ESCALAR
#[test]
fn test_simd_vectorization_vs_scalar_correctness() {
    let dim_sizes = [8, 16, 32, 64, 128];

    for &dim in &dim_sizes {
        let mut vec_a = Vec::with_capacity(dim);
        let mut vec_b = Vec::with_capacity(dim);

        for i in 0..dim {
            vec_a.push((i as f32 * 0.15).sin());
            vec_b.push((i as f32 * 0.25).cos());
        }

        // 1. Testa distância Euclidiana SIMD vs Escalar
        let simd_dist = SimdFeatureVectorizer::distance_l2(&vec_a, &vec_b);
        let scalar_dist = SimdFeatureVectorizer::scalar_distance_l2(&vec_a, &vec_b);
        let diff = (simd_dist - scalar_dist).abs();
        assert!(
            diff < 1e-5,
            "SIMD and scalar distance must match within epsilon: {} vs {} (diff: {})",
            simd_dist,
            scalar_dist,
            diff
        );

        // 2. Testa normalização unitária L2
        let mut vec_norm = vec_a.clone();
        SimdFeatureVectorizer::normalize_l2(&mut vec_norm);
        let norm_result = SimdFeatureVectorizer::dot_product(&vec_norm, &vec_norm).sqrt();
        assert!(
            (norm_result - 1.0).abs() < 1e-4,
            "Normalized vector L2 magnitude must be exactly 1.0 (got {})",
            norm_result
        );

        // 3. Testa similaridade cosseno
        let cos_sim = SimdFeatureVectorizer::cosine_similarity(&vec_a, &vec_b);
        assert!(
            (-1.0..=1.0).contains(&cos_sim),
            "Cosine similarity must be bounded in [-1.0, 1.0] (got {})",
            cos_sim
        );
    }
}

/// 2. TESTE: CONCORRÊNCIA E AUSÊNCIA DE DEADLOCK NO LOCK-FREE RING BUFFER
#[test]
fn test_lock_free_ring_buffer_concurrency() {
    let buffer = Arc::new(LockFreeRingBuffer::<usize>::new(500));
    let num_producers = 4;
    let items_per_producer = 5_000;

    let mut handles = Vec::new();

    // Produtores concorrentes
    for p_id in 0..num_producers {
        let buf_clone = buffer.clone();
        handles.push(thread::spawn(move || {
            for i in 0..items_per_producer {
                let val = p_id * 1_000_000 + i;
                while buf_clone.push(val).is_err() {
                    thread::yield_now();
                }
            }
        }));
    }

    // Consumidor concorrente
    let buf_consumer = buffer.clone();
    let total_expected = num_producers * items_per_producer;
    let consumer_handle = thread::spawn(move || {
        let mut consumed = 0;
        while consumed < total_expected {
            if buf_consumer.pop().is_some() {
                consumed += 1;
            } else {
                thread::yield_now();
            }
        }
        consumed
    });

    for h in handles {
        h.join().unwrap();
    }
    let total_consumed = consumer_handle.join().unwrap();

    assert_eq!(total_consumed, total_expected);
    assert_eq!(buffer.len(), 0);
    assert!(buffer.is_empty());
}

/// 3. TESTE: ISOLAMENTO DO SANDBOX WASM E INTERRUPÇÃO DETERMINÍSTICA POR GAS
#[test]
fn test_wasm_sandbox_isolation_and_gas_metering() {
    // Configura sandbox com cota de gas intencionalmente restrita
    let config = WasmSandboxConfig {
        max_memory_bytes: 32 * 1024 * 1024,
        max_execution_gas: 4_000, // Cota de gas pequena
        timeout_millis: 50,
        allowed_capabilities: vec!["send_ticket_reply".to_string()],
    };
    let mut sandbox = WasmSkillSandbox::new(config);

    // Cria procedimento com muitos passos para simular loop infinito / estouro de cota
    let mut steps = Vec::new();
    for _ in 0..10 {
        steps.push(serde_json::json!({
            "tool_name": "send_ticket_reply",
            "payload": "Execução de passo procedural"
        }));
    }

    let available_tools = vec!["send_ticket_reply".to_string()];
    let res = sandbox.execute_sandboxed_skill("infinite_loop_candidate", &steps, &available_tools);

    // Deve ser interrompido com erro de GasExhausted sem travar o host
    match res {
        Err(WasmSandboxError::GasExhausted { consumed, limit }) => {
            assert!(consumed > limit);
            assert_eq!(limit, 4_000);
        }
        other => panic!("Expected GasExhausted error, got: {:?}", other),
    }
}

/// 4. TESTE: BARREIRA DE MEMÓRIA LINEAR E REJEIÇÃO DE ESTOURO (32 MB LIMIT)
#[test]
fn test_wasm_sandbox_memory_safety_boundary() {
    let config = WasmSandboxConfig {
        max_memory_bytes: 32 * 1024 * 1024, // 32 MB
        max_execution_gas: 100_000,
        timeout_millis: 50,
        allowed_capabilities: vec!["get_order".to_string()],
    };
    let mut sandbox = WasmSkillSandbox::new(config);

    // Acesso dentro do limite permitido
    assert!(sandbox.verify_memory_bounds(1024, 4096).is_ok());

    // Alocação excessiva que ultrapassa os 32 MB permitidos
    let oversize_request = 33 * 1024 * 1024;
    let alloc_res = sandbox.allocate_memory(oversize_request);

    match alloc_res {
        Err(WasmSandboxError::MemoryExceeded { requested, limit }) => {
            assert!(requested > limit);
            assert_eq!(limit, 32 * 1024 * 1024);
        }
        other => panic!("Expected MemoryExceeded error, got: {:?}", other),
    }
}

/// 5. TESTE: EXECUÇÃO COMPLETA DE PROCEDURAL SKILL COM VERIFICAÇÃO SANDBOX WASM
#[tokio::test]
async fn test_procedural_skill_sandboxed_execution_flow() {
    let db = SupportDatabase::new();
    let mut tools: HashMap<String, Box<dyn alr_agent::SupportTool>> = HashMap::new();
    tools.insert(
        "get_order".to_string(),
        Box::new(GetOrderTool { db: db.clone() }),
    );
    tools.insert(
        "get_payment".to_string(),
        Box::new(GetPaymentTool { db: db.clone() }),
    );
    tools.insert(
        "get_refund_policy".to_string(),
        Box::new(GetRefundPolicyTool),
    );
    tools.insert(
        "send_ticket_reply".to_string(),
        Box::new(SendTicketReplyTool { db }),
    );

    let steps = vec![
        ProceduralStep {
            tool_name: "get_order".to_string(),
            input_template: serde_json::json!({ "customer_id": "cust_001" }),
        },
        ProceduralStep {
            tool_name: "get_payment".to_string(),
            input_template: serde_json::json!({ "customer_id": "cust_001" }),
        },
        ProceduralStep {
            tool_name: "send_ticket_reply".to_string(),
            input_template: serde_json::json!({ "message": "Atendimento processado com segurança no sandbox WASM." }),
        },
    ];

    let mut skill = ProceduralSkill::new(
        "sandboxed_refund_procedure",
        "Procedimento seguro dentro de container WASM",
        SupportIntent::RefundPending,
        steps,
    );

    let mut sandbox = WasmSkillSandbox::default();
    let context = ToolContext::new("tenant_sandboxed_01", "alr_agent").with_simulation(false);

    let (outputs, outcome) = skill
        .execute_sandboxed(&tools, &context, &mut sandbox)
        .await
        .expect("Sandboxed skill execution must succeed");

    assert_eq!(outputs.len(), 3);
    assert!(outcome.success);
    assert!(outcome.gas_consumed > 0);
    assert!(!outcome.sha256_hash.is_empty());
    assert_eq!(skill.executions, 1);
    assert_eq!(skill.failures, 0);
}

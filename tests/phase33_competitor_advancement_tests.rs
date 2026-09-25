use alr_agent::a2a::{A2APipelineRunner, DiffEngine};
use alr_agent::recipes::{
    AmountExtractor, CitationChecker, EntityAligner, PhoneValidator, SqlGuardrail, SqlSafetyLevel,
};
use alr_cli::real_engines::PlaygroundRealEngines;
use std::collections::HashMap;

#[test]
fn test_recipes_amount_extraction() {
    let extractor = AmountExtractor::new();

    // 1. Notação brasileira: R$ 14.400,50
    let res_brl = extractor
        .extract("O valor do contrato para 40 licenças é de R$ 14.400,50 com desconto anual.")
        .expect("Extract BRL failed");
    assert_eq!(res_brl.currency, "BRL");
    assert_eq!(res_brl.symbol, "R$");
    assert!((res_brl.amount_value - 14400.50).abs() < 1e-2);
    assert!(res_brl.confidence >= 0.95);

    // 2. Notação em Dólar: $2,500.00
    let res_usd = extractor
        .extract("Setup fee is $2,500.00 per instance.")
        .expect("Extract USD failed");
    assert_eq!(res_usd.currency, "USD");
    assert!((res_usd.amount_value - 2500.00).abs() < 1e-2);
}

#[test]
fn test_recipes_phone_validation() {
    let validator = PhoneValidator::new();

    // 1. Celular brasileiro válido com DDD e dígito 9
    let res = validator
        .validate("(11) 98455-1234")
        .expect("Validate phone failed");
    assert!(res.is_valid);
    assert!(res.is_mobile);
    assert_eq!(res.area_code, "11");
    assert_eq!(res.e164_format, "+5511984551234");
    assert_eq!(res.national_format, "(11) 98455-1234");

    // 2. Número fake com dígitos repetidos deve ser rejeitado
    let fake_res = validator
        .validate("(11) 99999-9999")
        .expect("Validate fake failed");
    assert!(!fake_res.is_valid);
    assert!(fake_res.validation_notes.contains("Rejeitado"));
}

#[test]
fn test_recipes_entity_alignment() {
    let aligner = EntityAligner::new();

    let fields = vec![
        "cli_nome".to_string(),
        "num_ped".to_string(),
        "vlr_total".to_string(),
        "dt_transacao".to_string(),
        "doc_cpf".to_string(),
    ];

    let report = aligner.align_schema(&fields).expect("Align schema failed");
    assert_eq!(report.total_fields_evaluated, 5);
    assert_eq!(report.matched_fields_count, 5);

    let match_names: HashMap<String, String> = report
        .matches
        .iter()
        .map(|m| (m.source_field.clone(), m.target_canonical_field.clone()))
        .collect();

    assert_eq!(match_names.get("cli_nome").unwrap(), "customer_name");
    assert_eq!(match_names.get("num_ped").unwrap(), "order_id");
    assert_eq!(match_names.get("vlr_total").unwrap(), "total_amount");
    assert_eq!(match_names.get("doc_cpf").unwrap(), "tax_id");
}

#[test]
fn test_recipes_citation_checker() {
    let checker = CitationChecker::new();

    let context = "O ALR implementa quantização escalar int8 no Qdrant reduzindo 75% da RAM com busca híbrida BM25 e fusão RRF.";

    // 1. Resposta fiel suportada
    let valid_answer =
        "A quantização int8 no Qdrant reduz em 75% o consumo de RAM com busca híbrida BM25.";
    let v_valid = checker
        .verify_citation(valid_answer, context)
        .expect("Citation check failed");
    assert!(v_valid.is_supported);
    assert!(v_valid.faithfulness_score >= 0.80);

    // 2. Resposta com alucinação não suportada pelo contexto
    let hallucinated = "O sistema foi desenvolvido em Python e consome 128 GB de memória GPU para rodar um modelo Llama 70B.";
    let v_halluc = checker
        .verify_citation(hallucinated, context)
        .expect("Citation check failed");
    assert!(!v_halluc.is_supported);
    assert!(!v_halluc.detected_hallucinations.is_empty());
}

#[test]
fn test_recipes_sql_guardrail() {
    let guard = SqlGuardrail::new();

    // 1. Bloqueio de comando destrutivo DROP
    let res_drop = guard
        .audit_sql("DROP TABLE customers;")
        .expect("Audit drop failed");
    assert!(!res_drop.is_allowed);
    assert_eq!(res_drop.safety_level, SqlSafetyLevel::DestructiveBlocked);

    // 2. Bloqueio de DELETE sem WHERE
    let res_delete_wipe = guard
        .audit_sql("DELETE FROM payments;")
        .expect("Audit wipe failed");
    assert!(!res_delete_wipe.is_allowed);
    assert_eq!(
        res_delete_wipe.safety_level,
        SqlSafetyLevel::DestructiveBlocked
    );

    // 3. Detecção de SQL Injection (OR 1=1)
    let res_inject = guard
        .audit_sql("SELECT * FROM users WHERE email = 'admin@alr.local' OR 1=1 --")
        .expect("Audit inject failed");
    assert!(!res_inject.is_allowed);
    assert_eq!(res_inject.safety_level, SqlSafetyLevel::InjectionThreat);

    // 4. Mutação governada segura com WHERE
    let res_safe_update = guard
        .audit_sql("UPDATE payments SET status = 'Refunded' WHERE order_id = 'ord_98721'")
        .expect("Audit safe update failed");
    assert!(res_safe_update.is_allowed);
    assert_eq!(
        res_safe_update.safety_level,
        SqlSafetyLevel::GovernedMutation
    );
}

#[test]
fn test_a2a_collaborative_pipeline() {
    let runner = A2APipelineRunner::new();
    let agents = runner.list_agents();
    assert_eq!(agents.len(), 3);

    let res = runner
        .execute_collaborative_pipeline(
            "Solicito estorno urgente do meu saque de R$ 14.400 que falhou há 3 dias.",
        )
        .expect("A2A pipeline failed");

    assert_eq!(res["success"], true);
    let flow = res["messages_flow"].as_array().expect("flow array missing");
    assert_eq!(flow.len(), 3);

    assert_eq!(res["final_verdict"]["status"], "APPROVED");
    assert_eq!(res["final_verdict"]["routing"], "billing");
    assert_eq!(res["final_verdict"]["cost_tokens"], 0);
}

#[test]
fn test_a2a_diff_preview() {
    let diff_engine = DiffEngine::new();

    let original = "status = 'Pending'\nprocessed = false";
    let proposed = "status = 'Refunded'\nprocessed = true";

    let diff = diff_engine.compute_diff(original, proposed);
    assert_eq!(diff.additions_count, 2);
    assert_eq!(diff.deletions_count, 2);
    assert_eq!(diff.lines.len(), 4);
}

#[test]
fn test_workbench_csv_batch_processing() {
    let engines = PlaygroundRealEngines::new();

    let csv_text = "id,mensagem\n1,\"Meu saque falhou há 3 dias\"\n2,\"Cotação para 40 licenças\"\n3,\"Rastreio do pedido BR123\"\n4,\"Invasão de login suspeita\"";

    let mut cat_map = HashMap::new();
    cat_map.insert(
        "Faturamento".to_string(),
        "saque, estorno, reembolso".to_string(),
    );
    cat_map.insert("Vendas".to_string(), "licenças, cotação, preço".to_string());
    cat_map.insert("Entrega".to_string(), "rastreio, pedido, envio".to_string());
    cat_map.insert(
        "Segurança".to_string(),
        "login, invasão, suspeita".to_string(),
    );

    let res = engines
        .process_csv_workbench(csv_text, &cat_map)
        .expect("Process CSV workbench failed");

    assert_eq!(res["success"], true);
    assert_eq!(res["total_rows"], 4);

    let rows = res["rows"].as_array().expect("rows missing");
    assert_eq!(rows.len(), 4);
    assert_eq!(rows[0]["predicted_label"], "Faturamento");
    assert_eq!(rows[1]["predicted_label"], "Vendas");
    assert_eq!(rows[2]["predicted_label"], "Entrega");
    assert_eq!(rows[3]["predicted_label"], "Segurança");
}

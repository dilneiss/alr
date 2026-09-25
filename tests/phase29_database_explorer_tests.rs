use alr_cli::database_explorer::DatabaseExplorerEngine;
use std::path::PathBuf;
use uuid::Uuid;

fn make_temp_dir() -> PathBuf {
    let p = std::env::temp_dir().join(format!("alr_db_test_{}", Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&p);
    p
}

#[test]
fn test_database_explorer_stores_listing() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let stores = engine.get_stores();
    assert_eq!(stores.len(), 4);

    let store_ids: Vec<&str> = stores.iter().map(|s| s.id.as_str()).collect();
    assert!(store_ids.contains(&"sqlite_memory"));
    assert!(store_ids.contains(&"sqlite_support"));
    assert!(store_ids.contains(&"sqlite_trading"));
    assert!(store_ids.contains(&"qdrant_vector"));

    for s in &stores {
        assert!(!s.name.is_empty());
        assert!(!s.engine.is_empty());
        assert!(!s.description.is_empty());
        assert!(s.tables_count > 0);
    }

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_sqlite_memory_tables_and_data() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let tables = engine
        .get_tables("sqlite_memory")
        .expect("Failed to get sqlite_memory tables");
    assert_eq!(tables.len(), 7);

    let table_names: Vec<&str> = tables.iter().map(|t| t.name.as_str()).collect();
    assert!(table_names.contains(&"skills"));
    assert!(table_names.contains(&"episodes"));
    assert!(table_names.contains(&"experiences"));
    assert!(table_names.contains(&"memories"));
    assert!(table_names.contains(&"decisions_audit"));
    assert!(table_names.contains(&"knowledge_proposals"));
    assert!(table_names.contains(&"policy_states"));

    // Testa carregamento de dados da tabela 'skills'
    let data = engine
        .get_table_data("sqlite_memory", "skills", 10, 0, None)
        .expect("Failed to query skills data");
    assert!(data.total_rows >= 6);
    assert_eq!(data.rows.len(), data.total_rows.min(10));

    // Valida colunas estruturadas e chave primária
    let id_col = data
        .columns
        .iter()
        .find(|c| c.name == "id")
        .expect("id column missing");
    assert!(id_col.is_pk);

    // Valida skill de Snake Evasion
    let has_snake_skill = data.rows.iter().any(|r| {
        r.get("name")
            .and_then(|v| v.as_str())
            .map(|s| s == "snake_evasion_bfs")
            .unwrap_or(false)
    });
    assert!(has_snake_skill);

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_sqlite_support_tables_and_data() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let tables = engine
        .get_tables("sqlite_support")
        .expect("Failed to get support tables");
    assert_eq!(tables.len(), 4);

    let table_names: Vec<&str> = tables.iter().map(|t| t.name.as_str()).collect();
    assert!(table_names.contains(&"customers"));
    assert!(table_names.contains(&"orders"));
    assert!(table_names.contains(&"payments"));
    assert!(table_names.contains(&"tickets"));

    // Testa clientes cadastrados
    let data = engine
        .get_table_data("sqlite_support", "customers", 10, 0, None)
        .expect("Failed to query customers");
    assert!(data.total_rows >= 5);

    let has_carlos = data.rows.iter().any(|r| {
        r.get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.contains("Carlos"))
            .unwrap_or(false)
    });
    assert!(has_carlos);

    // Testa tickets com histórico de atendimento
    let tickets_data = engine
        .get_table_data("sqlite_support", "tickets", 10, 0, None)
        .expect("Failed to query tickets");
    assert!(tickets_data.total_rows >= 4);

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_sqlite_trading_positions_and_executions() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let tables = engine
        .get_tables("sqlite_trading")
        .expect("Failed to get trading tables");
    assert_eq!(tables.len(), 2);

    let pos_data = engine
        .get_table_data("sqlite_trading", "trading_positions", 10, 0, None)
        .expect("Failed to query trading positions");
    assert!(pos_data.total_rows >= 4);

    let has_btc = pos_data.rows.iter().any(|r| {
        r.get("asset")
            .and_then(|v| v.as_str())
            .map(|a| a == "BTCUSDT")
            .unwrap_or(false)
    });
    assert!(has_btc);

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_qdrant_vector_memory_inspection() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let tables = engine
        .get_tables("qdrant_vector")
        .expect("Failed to get qdrant vector collections");
    assert_eq!(tables.len(), 3);

    let coll_names: Vec<&str> = tables.iter().map(|t| t.name.as_str()).collect();
    assert!(coll_names.contains(&"alr_knowledge_1536d"));
    assert!(coll_names.contains(&"support_knowledge_1536d"));
    assert!(coll_names.contains(&"marketing_ops_1536d"));

    let qdrant_data = engine
        .get_table_data("qdrant_vector", "alr_knowledge_1536d", 10, 0, None)
        .expect("Failed to query qdrant vector data");

    assert!(!qdrant_data.rows.is_empty());
    let first_row = &qdrant_data.rows[0];

    // Valida que possui 1536 dimensões e quantização escalar int8
    assert_eq!(
        first_row.get("vector_dim").and_then(|v| v.as_i64()),
        Some(1536)
    );
    assert!(first_row
        .get("quantization")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .contains("scalar_int8"));

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_database_explorer_search_filter() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    // Busca filtrada por 'refund' em skills
    let filtered_skills = engine
        .get_table_data("sqlite_memory", "skills", 10, 0, Some("refund"))
        .expect("Search failed");
    assert!(filtered_skills.total_rows >= 1);
    assert!(filtered_skills.rows.iter().all(|r| {
        let text = format!("{:?}", r);
        text.contains("refund")
    }));

    // Busca filtrada por termo inexistente deve retornar 0 linhas
    let empty_search = engine
        .get_table_data(
            "sqlite_memory",
            "skills",
            10,
            0,
            Some("termo_que_nao_existe_123456"),
        )
        .expect("Search failed");
    assert_eq!(empty_search.total_rows, 0);
    assert!(empty_search.rows.is_empty());

    let _ = std::fs::remove_dir_all(&tmp);
}

#[test]
fn test_database_explorer_pagination() {
    let tmp = make_temp_dir();
    let engine = DatabaseExplorerEngine::new(&tmp);

    let page1 = engine
        .get_table_data("sqlite_memory", "skills", 2, 0, None)
        .expect("Page 1 failed");
    assert_eq!(page1.rows.len(), 2);

    let page2 = engine
        .get_table_data("sqlite_memory", "skills", 2, 2, None)
        .expect("Page 2 failed");
    assert_eq!(page2.rows.len(), 2);

    // Garante que os registros da página 1 e página 2 são distintos
    let id1 = page1.rows[0].get("id").unwrap();
    let id2 = page2.rows[0].get("id").unwrap();
    assert_ne!(id1, id2);

    let _ = std::fs::remove_dir_all(&tmp);
}

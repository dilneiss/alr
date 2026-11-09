//! Testes Automatizados de Segurança e Hardening (Security Audit)
//!
//! Validações para implantações públicas expostas na Internet:
//! 1. Defesa contra SQL Injection e Table Whitelisting no Database Explorer
//! 2. Autenticação Bearer com comparação em tempo constante (Anti-Timing Attacks)
//! 3. Bloqueio automático de execução física de Mouse/Teclado remoto (Anti-RCE / Remote Control)
//! 4. Presença de cabeçalhos HTTP defensivos (Anti-Clickjacking, Anti-MIME-Sniffing)

use alr_cli::database_explorer::DatabaseExplorerEngine;
use alr_cli::playground_server::JevPlaygroundServer;
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use std::path::PathBuf;
use tower::ServiceExt; // for oneshot()
use uuid::Uuid;

static ENV_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn make_temp_dir() -> PathBuf {
    let p = std::env::temp_dir().join(format!("alr_sec_audit_{}", Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&p);
    p
}

struct EnvGuard;
impl Drop for EnvGuard {
    fn drop(&mut self) {
        std::env::remove_var("ALR_API_KEY");
        std::env::remove_var("ALR_ALLOW_REMOTE_OS_CONTROL");
    }
}

#[tokio::test]
async fn test_sql_injection_defense_database_explorer() {
    let _lock = ENV_LOCK.lock().await;
    let tmp = make_temp_dir();
    let db = DatabaseExplorerEngine::new(&tmp);

    // 1. Injeção direta com ponto e vírgula
    let res_inj1 = db.get_table_data("sqlite_memory", "skills; DROP TABLE skills;", 10, 0, None);
    assert!(res_inj1.is_err(), "Deve rejeitar caracteres não-alfanuméricos na tabela");

    // 2. Injeção com UNION SELECT e aspas
    let res_inj2 = db.get_table_data(
        "sqlite_memory",
        "skills' UNION SELECT 1, 2, 3--",
        10,
        0,
        None,
    );
    assert!(res_inj2.is_err(), "Deve rejeitar injeção de tabela");

    // 3. Tabela não autorizada / inexistente
    let res_fake = db.get_table_data("sqlite_memory", "tabela_inexistente", 10, 0, None);
    assert!(res_fake.is_err(), "Deve rejeitar tabela fora da whitelist");

    // 4. Tabela legítima autorizada
    let res_ok = db.get_table_data("sqlite_memory", "skills", 10, 0, None);
    assert!(res_ok.is_ok(), "Tabela da whitelist deve carregar com sucesso");
    let data = res_ok.unwrap();
    assert!(data.limit <= 500, "Limite deve ser contido para prevenir DoS");

    let _ = std::fs::remove_dir_all(&tmp);
}

#[tokio::test]
async fn test_api_key_authentication_enforcement() {
    let _lock = ENV_LOCK.lock().await;
    let _env_guard = EnvGuard;
    std::env::set_var("ALR_API_KEY", "secret_audit_token_9876");

    let tmp = make_temp_dir();
    let server = JevPlaygroundServer::with_data_dir(3000, &tmp);
    let app = server.create_router();

    let valid_payload = serde_json::json!({
        "state": "Teste de segurança",
        "questions": {
            "urgente": {
                "type": "noul",
                "instructions": "É urgente?"
            }
        }
    });

    // 1. Requisição sem token -> 401 Unauthorized
    let req_unauth = Request::builder()
        .method("POST")
        .uri("/v1/systemone")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&valid_payload).unwrap()))
        .unwrap();

    let resp_unauth = app.clone().oneshot(req_unauth).await.unwrap();
    assert_eq!(resp_unauth.status(), StatusCode::UNAUTHORIZED);

    // 2. Requisição com token incorreto -> 401 Unauthorized
    let req_wrong = Request::builder()
        .method("POST")
        .uri("/v1/systemone")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, "Bearer token_falso_errado")
        .body(Body::from(serde_json::to_vec(&valid_payload).unwrap()))
        .unwrap();

    let resp_wrong = app.clone().oneshot(req_wrong).await.unwrap();
    assert_eq!(resp_wrong.status(), StatusCode::UNAUTHORIZED);

    // 3. Requisição com token correto -> 200 OK
    let req_ok = Request::builder()
        .method("POST")
        .uri("/v1/systemone")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, "Bearer secret_audit_token_9876")
        .body(Body::from(serde_json::to_vec(&valid_payload).unwrap()))
        .unwrap();

    let resp_ok = app.clone().oneshot(req_ok).await.unwrap();
    assert_eq!(resp_ok.status(), StatusCode::OK);

    let _ = std::fs::remove_dir_all(&tmp);
}

#[tokio::test]
async fn test_remote_physical_os_control_locked_by_default() {
    let _lock = ENV_LOCK.lock().await;
    let _env_guard = EnvGuard;
    std::env::remove_var("ALR_API_KEY");
    std::env::remove_var("ALR_ALLOW_REMOTE_OS_CONTROL");

    let tmp = make_temp_dir();
    let server = JevPlaygroundServer::with_data_dir(3000, &tmp);
    let app = server.create_router();

    // Chamada remota tentando ação física (live: true)
    let payload = serde_json::json!({
        "x": 300,
        "y": 400,
        "action": "click",
        "live": true
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/os/mouse")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(
        resp.status(),
        StatusCode::FORBIDDEN,
        "Ação de mouse físico remoto deve ser bloqueada com 403 por padrão"
    );

    let _ = std::fs::remove_dir_all(&tmp);
}

#[tokio::test]
async fn test_security_headers_present() {
    let _lock = ENV_LOCK.lock().await;
    let tmp = make_temp_dir();
    let server = JevPlaygroundServer::with_data_dir(3000, &tmp);
    let app = server.create_router();

    let req = Request::builder()
        .method("GET")
        .uri("/health")
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let headers = resp.headers();
    assert_eq!(
        headers.get("x-content-type-options").and_then(|v| v.to_str().ok()),
        Some("nosniff"),
        "Deve conter cabeçalho X-Content-Type-Options: nosniff"
    );
    assert_eq!(
        headers.get("x-frame-options").and_then(|v| v.to_str().ok()),
        Some("SAMEORIGIN"),
        "Deve conter cabeçalho X-Frame-Options: SAMEORIGIN"
    );
    assert_eq!(
        headers.get("referrer-policy").and_then(|v| v.to_str().ok()),
        Some("strict-origin-when-cross-origin"),
        "Deve conter cabeçalho Referrer-Policy"
    );

    let _ = std::fs::remove_dir_all(&tmp);
}

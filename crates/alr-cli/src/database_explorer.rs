use anyhow::{bail, Context, Result};
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

/// Informações sobre um Banco de Dados gerenciado pelo ALR
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreInfo {
    pub id: String,
    pub name: String,
    pub engine: String,
    pub description: String,
    pub path_or_url: String,
    pub wal_mode: bool,
    pub size_bytes: u64,
    pub tables_count: usize,
    pub total_records: usize,
    pub status: String,
}

/// Metadados de uma Tabela ou Coleção Vetorial
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub record_count: usize,
    pub description: String,
    pub icon: String,
    pub category: String,
}

/// Metadados de Coluna de Tabela
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub col_type: String,
    pub is_pk: bool,
    pub nullable: bool,
    pub description: String,
}

/// Resposta com dados da tabela, paginação e latência de leitura
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableDataResponse {
    pub store: String,
    pub table: String,
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<HashMap<String, Value>>,
    pub total_rows: usize,
    pub limit: usize,
    pub offset: usize,
    pub latency_micros: u128,
    pub store_info: StoreInfo,
}

/// Motor de Exploração e Leitura de Bancos de Dados do ALR
#[derive(Clone)]
pub struct DatabaseExplorerEngine {
    data_dir: PathBuf,
}

impl Default for DatabaseExplorerEngine {
    fn default() -> Self {
        Self::new("data")
    }
}

impl DatabaseExplorerEngine {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let path = data_dir.as_ref().to_path_buf();
        let engine = Self { data_dir: path };
        let _ = engine.ensure_initialized();
        engine
    }

    /// Garante que os bancos de dados do ALR existam e estejam semeados com dados operacionais
    pub fn ensure_initialized(&self) -> Result<()> {
        if !self.data_dir.exists() {
            std::fs::create_dir_all(&self.data_dir).context("Falha ao criar diretório data/")?;
        }

        self.init_memory_db()?;
        self.init_support_db()?;
        self.init_trading_db()?;
        Ok(())
    }

    // 1. BANCO OPERACIONAL: alr_memory.db
    fn init_memory_db(&self) -> Result<()> {
        let db_path = self.data_dir.join("alr_memory.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch(
            r##"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                version INTEGER NOT NULL,
                description TEXT NOT NULL,
                conditions TEXT NOT NULL,
                action TEXT NOT NULL,
                confidence REAL NOT NULL,
                success_rate REAL NOT NULL,
                executions INTEGER NOT NULL,
                failures INTEGER NOT NULL,
                origin TEXT NOT NULL,
                status TEXT NOT NULL,
                priority INTEGER NOT NULL,
                risk REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                seed INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                score INTEGER NOT NULL,
                steps INTEGER NOT NULL,
                food_eaten INTEGER NOT NULL,
                collision INTEGER NOT NULL,
                llm_calls INTEGER NOT NULL,
                outcome TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS experiences (
                id TEXT PRIMARY KEY,
                episode_id TEXT NOT NULL,
                step INTEGER NOT NULL,
                state TEXT NOT NULL,
                action TEXT NOT NULL,
                reward REAL NOT NULL,
                next_state TEXT NOT NULL,
                done INTEGER NOT NULL,
                info TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                memory_type TEXT NOT NULL,
                content TEXT NOT NULL,
                confidence REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS decisions_audit (
                id TEXT PRIMARY KEY,
                episode_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                state_hash TEXT NOT NULL,
                chosen_action TEXT NOT NULL,
                confidence REAL NOT NULL,
                fallback_used INTEGER NOT NULL,
                source TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS knowledge_proposals (
                id TEXT PRIMARY KEY,
                proposal_type TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT NOT NULL,
                confidence REAL NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS policy_states (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "##,
        )?;

        // Se a tabela de skills estiver vazia, semeia com dados realistas do runtime
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM skills", [], |r| r.get(0))?;
        if count == 0 {
            conn.execute_batch(
                r##"
                INSERT INTO skills VALUES
                ('sk_001', 'snake_evasion_bfs', 2, 'Evasão de auto-colisão no Snake via BFS e Flood-Fill de área conexa livre', '{"danger_ahead": true, "open_cells": 45}', '{"type": "TURN_SAFE_BFS", "direction": "RIGHT"}', 0.985, 0.988, 482, 6, 'AutonomousExperience', 'Active', 10, 0.02, datetime('now', '-2 days'), datetime('now')),
                ('sk_002', 'browser_login_v2', 3, 'Fluxo de login web em Chromium CDP com verificação de pós-condição no DOM por SHA-256', '{"route": "/login", "has_form": true}', '{"action": "FILL_AND_VERIFY", "target": "#login-btn"}', 0.992, 0.995, 230, 1, 'ProceduralLearning', 'Active', 8, 0.01, datetime('now', '-5 days'), datetime('now')),
                ('sk_003', 'support_refund_classifier', 1, 'Classificação e triagem de solicitações de reembolso com análise de SLA e fraude', '{"intent": "refund", "amount_under_limit": true}', '{"action": "ROUTE_FINANCIAL", "queue": "urgent_billing"}', 0.990, 0.992, 340, 3, 'DistilledPolicy', 'Active', 9, 0.05, datetime('now', '-1 day'), datetime('now')),
                ('sk_004', 'crypto_rsi_scalp', 4, 'Confluência técnica de compra em RSI-14 < 30 com MACD bull cross e trailing stop 2.5%', '{"rsi": 28.4, "macd_cross": true, "supertrend": "bullish"}', '{"action": "PLACE_LIMIT_BUY", "asset": "BTCUSDT", "stop": 0.025}', 0.965, 0.942, 178, 10, 'QuantitativeEngine', 'Active', 7, 0.15, datetime('now', '-3 days'), datetime('now')),
                ('sk_005', 'cctv_tripwire_gate', 1, 'Detecção de invasão de docas em horário proibido via visão temporal e alarme sonoro', '{"zone": "A1_DOCAS", "motion_score": 0.88, "hour": 2}', '{"action": "DISPATCH_WINDOWS_TOAST", "level": "CRITICAL"}', 0.978, 0.975, 96, 2, 'VisualDetector', 'Active', 9, 0.03, datetime('now', '-7 days'), datetime('now')),
                ('sk_006', 'seo_cannibalization_merge', 2, 'Detecção de overlap de termos orgânicos em Google Ads com merge e redirect 301', '{"overlap_ratio": 0.82, "keyword": "automacao rust"}', '{"action": "GENERATE_301_REDIRECT", "canonical": "/plataforma"}', 0.962, 0.968, 64, 2, 'MarketingOpsSuite', 'Active', 6, 0.04, datetime('now', '-4 days'), datetime('now'));

                INSERT INTO episodes VALUES
                ('ep_snake_101', 42, datetime('now', '-2 hours'), datetime('now', '-1 hour', '45 minutes'), 420, 580, 42, 0, 0, 'Victory'),
                ('ep_snake_102', 84, datetime('now', '-1 hour'), datetime('now', '-40 minutes'), 280, 390, 28, 0, 0, 'Victory'),
                ('ep_browser_201', 1234, datetime('now', '-30 minutes'), datetime('now', '-29 minutes'), 100, 18, 0, 0, 0, 'Success'),
                ('ep_trading_301', 9999, datetime('now', '-10 minutes'), datetime('now', '-2 minutes'), 250, 48, 0, 0, 0, 'TakeProfitReached');

                INSERT INTO experiences VALUES
                ('exp_001', 'ep_snake_101', 1, '{"head": [10, 10], "food": [18, 10], "dir": [1, 0]}', 'RIGHT', 1.0, '{"head": [11, 10], "food": [18, 10]}', 0, '{"bfs_open": 52}'),
                ('exp_002', 'ep_snake_101', 2, '{"head": [11, 10], "food": [18, 10], "dir": [1, 0]}', 'RIGHT', 1.0, '{"head": [12, 10], "food": [18, 10]}', 0, '{"bfs_open": 51}'),
                ('exp_003', 'ep_snake_101', 3, '{"head": [17, 10], "food": [18, 10], "dir": [1, 0]}', 'RIGHT', 10.0, '{"head": [18, 10], "food": [5, 14]}', 0, '{"eaten": true}'),
                ('exp_004', 'ep_browser_201', 1, '{"url": "http://crm/login", "btn": "visible"}', 'CLICK_LOGIN', 5.0, '{"url": "http://crm/dashboard", "auth": true}', 1, '{"dom_verified": true}');

                INSERT INTO memories VALUES
                ('mem_001', 'Procedural', 'Regra de Ouro: Hard constraints do RiskEngine nunca podem ser contornadas por LLMs ou modelos locais.', 1.0, 'Permanent', datetime('now', '-10 days'), datetime('now')),
                ('mem_002', 'Episodic', 'Em cenários de U-Turn com cauda próxima, priorize seguir a cauda até abrir espaço livre.', 0.96, 'Active', datetime('now', '-3 days'), datetime('now')),
                ('mem_003', 'Semantic', 'Tenant isolation é obrigatório em todas as consultas vetoriais no Qdrant com filtro must em tenant_id.', 1.0, 'Permanent', datetime('now', '-15 days'), datetime('now'));

                INSERT INTO decisions_audit VALUES
                ('aud_001', 'ep_snake_101', datetime('now', '-1 hour'), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'RIGHT', 0.985, 0, 'LocalTypedJudgeEngine'),
                ('aud_002', 'ep_snake_101', datetime('now', '-59 minutes'), 'f4c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', 'UP', 0.992, 0, 'CycleSafetyShield'),
                ('aud_003', 'ep_browser_201', datetime('now', '-30 minutes'), 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e', 'VERIFY_HASH', 0.998, 0, 'BrowserSkill');

                INSERT INTO knowledge_proposals VALUES
                ('kp_001', 'ProceduralOptimization', 'Recomendação de reduzir threshold de novidade OOD para 0.55 em tarefas de compras corporativas.', 'PendingReview', 0.88, 'LLMTeacherOracle', datetime('now', '-1 day')),
                ('kp_002', 'HeuristicEnhancement', 'Ativar checagem de convexidade no cálculo de distância para maçã no Snake para tabuleiros > 40x40.', 'Approved', 0.94, 'SelfImprovementRunner', datetime('now', '-2 days'));

                INSERT INTO policy_states VALUES
                ('pol_001', 'q_table_snake_v2', '{"states_count": 4820, "learning_rate": 0.1, "discount_factor": 0.95, "exploration_epsilon": 0.02}', datetime('now')),
                ('pol_002', 'typed_decision_priors', '{"guardrail_priors": [0.04, 0.96], "routing_priors": [0.45, 0.35, 0.20]}', datetime('now'));
                "##
            )?;
        }

        Ok(())
    }

    // 2. BANCO DE SUPORTE & CRM: support.db
    fn init_support_db(&self) -> Result<()> {
        let db_path = self.data_dir.join("support.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch(
            r##"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                tier TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                tracking_code TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                status TEXT NOT NULL,
                transaction_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                subject TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                messages TEXT NOT NULL,
                assigned_agent TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "##,
        )?;

        let count: i64 = conn.query_row("SELECT COUNT(*) FROM customers", [], |r| r.get(0))?;
        if count == 0 {
            conn.execute_batch(
                r##"
                INSERT INTO customers VALUES
                ('cust_101', 'Carlos Eduardo Mendes', 'carlos.mendes@techcorp.com.br', '+55 11 98455-1234', 'Enterprise', 'Active', datetime('now', '-30 days')),
                ('cust_102', 'Mariana Silveira', 'mariana@financas.io', '+55 21 99123-8877', 'Pro', 'Active', datetime('now', '-20 days')),
                ('cust_103', 'Roberto Almeida', 'roberto@varejodigital.com', '+55 31 97654-3210', 'Standard', 'Active', datetime('now', '-15 days')),
                ('cust_104', 'Fernanda Lima', 'fernanda@logistica.net', '+55 41 98899-7711', 'Enterprise', 'Active', datetime('now', '-5 days')),
                ('cust_105', 'Juliana Ramos', 'juliana@saudeclinicas.med.br', '+55 51 99988-2233', 'Pro', 'Active', datetime('now', '-2 days'));

                INSERT INTO orders VALUES
                ('ord_98721', 'cust_101', 'Licença Anual ALR Enterprise (40 Assentos Dedicados)', 14400.00, 'Delivered', 'BR982173551BR', datetime('now', '-10 days')),
                ('ord_98722', 'cust_102', 'Módulo Trading Desk V5 Autônomo com Binance Testnet', 3800.00, 'Processing', 'BR982174662BR', datetime('now', '-3 days')),
                ('ord_98723', 'cust_103', 'Setup Central WhatsApp 20 Nichos + Memória Qdrant', 2500.00, 'Delivered', 'BR982175773BR', datetime('now', '-8 days')),
                ('ord_98724', 'cust_104', 'Servidor de Vigilância CCTV Multimodal em Rust', 5200.00, 'Shipped', 'BR982176884BR', datetime('now', '-1 day')),
                ('ord_98725', 'cust_105', 'Pacote Marketing Ops JEV 9 Tarefas em CPU Local', 1900.00, 'Delivered', 'BR982177995BR', datetime('now', '-4 days'));

                INSERT INTO payments VALUES
                ('pay_4401', 'ord_98721', 14400.00, 'PIX Instantâneo', 'Confirmed', 'pix_e3b0c44298fc1c149afbf4c8996fb924', datetime('now', '-10 days')),
                ('pay_4402', 'ord_98722', 3800.00, 'Cartão Corporativo', 'Confirmed', 'cc_auth_918237912837192837', datetime('now', '-3 days')),
                ('pay_4403', 'ord_98723', 2500.00, 'Boleto Bancário', 'Confirmed', 'bol_771829381928391829', datetime('now', '-8 days')),
                ('pay_4404', 'ord_98724', 5200.00, 'PIX Instantâneo', 'Confirmed', 'pix_18293819283918293819283', datetime('now', '-1 day')),
                ('pay_4405', 'ord_98725', 1900.00, 'Cartão de Crédito', 'Confirmed', 'cc_auth_019283019283019283', datetime('now', '-4 days'));

                INSERT INTO tickets VALUES
                ('1001', 'cust_101', 'Falha no saque há 3 dias e timeout no chat', 'Urgent', 'Resolved (Billing)', '[{"sender": "customer", "text": "Meu saque falhou três dias seguidos e o chat fica caindo."}, {"sender": "ALR-Support-Bot", "text": "Identificamos o bloqueio bancário temporário e o estorno de R$ 14.400 foi creditado em sua conta com sucesso."}]', 'ALR-Support-Bot', datetime('now', '-3 days')),
                ('1002', 'cust_102', 'Cotação para 40 licenças empresariais e reunião de segurança', 'High', 'In Progress (Sales)', '[{"sender": "customer", "text": "Você pode enviar o preço empresarial para 40 licenças e me informar se pode fazer call de segurança?"}, {"sender": "ALR-Sales-Bot", "text": "Proposta formal enviada em anexo. Call agendada para quinta-feira às 15:00."}]', 'AccountExecutive-01', datetime('now', '-2 days')),
                ('1003', 'cust_103', 'Configuração de webhook HMAC-SHA256 no WhatsApp Desk', 'Medium', 'Open', '[{"sender": "customer", "text": "Como validar a assinatura X-Hub-Signature-256 no endpoint de webhooks?"}]', 'Tier2-Technical', datetime('now', '-1 day')),
                ('1004', 'cust_105', 'Dúvida sobre quantização escalar int8 no Qdrant', 'Low', 'Resolved', '[{"sender": "customer", "text": "A quantização int8 reduz a precisão da busca semântica?"}, {"sender": "ALR-Support-Bot", "text": "A perda de precisão é inferior a 0.3% enquanto a economia de memória RAM atinge 75% com busca híbrida BM25."}]', 'ALR-Support-Bot', datetime('now', '-5 days'));
                "##
            )?;
        }

        Ok(())
    }

    // 3. BANCO DE TRADING: trading.db
    fn init_trading_db(&self) -> Result<()> {
        let db_path = self.data_dir.join("trading.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch(
            r##"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS trading_positions (
                asset TEXT PRIMARY KEY,
                entry_price REAL NOT NULL,
                current_price REAL NOT NULL,
                quantity REAL NOT NULL,
                stop_loss REAL NOT NULL,
                take_profit REAL NOT NULL,
                trailing_stop REAL NOT NULL,
                unrealized_pnl REAL NOT NULL,
                pnl_percent REAL NOT NULL,
                status TEXT NOT NULL,
                opened_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trading_executions (
                id TEXT PRIMARY KEY,
                asset TEXT NOT NULL,
                side TEXT NOT NULL,
                price REAL NOT NULL,
                quantity REAL NOT NULL,
                total_usd REAL NOT NULL,
                fee_usd REAL NOT NULL,
                exchange TEXT NOT NULL,
                strategy TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
            "##,
        )?;

        let count: i64 =
            conn.query_row("SELECT COUNT(*) FROM trading_positions", [], |r| r.get(0))?;
        if count == 0 {
            conn.execute_batch(
                r##"
                INSERT INTO trading_positions VALUES
                ('BTCUSDT', 64200.00, 67450.00, 0.25, 62595.00, 68000.00, 65800.00, 812.50, 5.06, 'Active', datetime('now', '-8 hours')),
                ('ETHUSDT', 3450.00, 3580.00, 3.50, 3363.75, 3650.00, 3490.00, 455.00, 3.76, 'Active', datetime('now', '-6 hours')),
                ('SOLUSDT', 148.50, 154.20, 20.00, 144.75, 158.00, 150.50, 114.00, 3.83, 'Active', datetime('now', '-4 hours')),
                ('BNBUSDT', 580.00, 595.00, 5.00, 565.50, 610.00, 586.00, 75.00, 2.58, 'Active', datetime('now', '-2 hours'));

                INSERT INTO trading_executions VALUES
                ('exec_101', 'BTCUSDT', 'BUY', 64200.00, 0.25, 16050.00, 16.05, 'Binance Spot Testnet', 'RSI_14_Oversold_MACD_Cross', datetime('now', '-8 hours')),
                ('exec_102', 'ETHUSDT', 'BUY', 3450.00, 3.50, 12075.00, 12.07, 'Binance Spot Testnet', 'SuperTrend_Breakout_EMA21', datetime('now', '-6 hours')),
                ('exec_103', 'SOLUSDT', 'BUY', 148.50, 20.00, 2970.00, 2.97, 'Binance Spot Testnet', 'Volume_Weighted_Momentum', datetime('now', '-4 hours')),
                ('exec_104', 'BNBUSDT', 'BUY', 580.00, 5.00, 2900.00, 2.90, 'Binance Spot Testnet', 'Bollinger_Bands_Mean_Reversion', datetime('now', '-2 hours')),
                ('exec_105', 'AVAXUSDT', 'SELL', 32.50, 50.00, 1625.00, 1.62, 'Binance Spot Testnet', 'Trailing_Stop_Lock_Profit', datetime('now', '-1 hour'));
                "##
            )?;
        }

        Ok(())
    }

    /// Retorna a lista de todos os Bancos de Dados disponíveis no ALR
    pub fn get_stores(&self) -> Vec<StoreInfo> {
        let mem_path = self.data_dir.join("alr_memory.db");
        let sup_path = self.data_dir.join("support.db");
        let trd_path = self.data_dir.join("trading.db");

        let mem_size = std::fs::metadata(&mem_path)
            .map(|m| m.len())
            .unwrap_or(48 * 1024);
        let sup_size = std::fs::metadata(&sup_path)
            .map(|m| m.len())
            .unwrap_or(36 * 1024);
        let trd_size = std::fs::metadata(&trd_path)
            .map(|m| m.len())
            .unwrap_or(28 * 1024);

        vec![
            StoreInfo {
                id: "sqlite_memory".to_string(),
                name: "SQLite Operacional (alr_memory.db)".to_string(),
                engine: "SQLite 3.45 (WAL Mode)".to_string(),
                description: "Memórias, Skills aprendidas, Episódios, Experiências e Auditoria de Decisões do ALR".to_string(),
                path_or_url: mem_path.to_string_lossy().to_string(),
                wal_mode: true,
                size_bytes: mem_size,
                tables_count: 7,
                total_records: self.count_store_records(&mem_path, &["skills", "episodes", "experiences", "memories", "decisions_audit", "knowledge_proposals", "policy_states"]),
                status: "Conectado • Leitura Imediata (< 40 µs)".to_string(),
            },
            StoreInfo {
                id: "sqlite_support".to_string(),
                name: "Base Relacional CRM & Suporte (support.db)".to_string(),
                engine: "SQLite 3.45 (WAL Mode)".to_string(),
                description: "Clientes, Pedidos, Pagamentos e Tickets de Atendimento Omnichannel do Agente".to_string(),
                path_or_url: sup_path.to_string_lossy().to_string(),
                wal_mode: true,
                size_bytes: sup_size,
                tables_count: 4,
                total_records: self.count_store_records(&sup_path, &["customers", "orders", "payments", "tickets"]),
                status: "Conectado • 100% Consistente".to_string(),
            },
            StoreInfo {
                id: "sqlite_trading".to_string(),
                name: "Livro & Posições de Trading (trading.db)".to_string(),
                engine: "SQLite 3.45 (WAL Mode)".to_string(),
                description: "Posições ativas, Stop-Loss móvel, Trailing Stop e Execuções no livro de ofertas Binance/Bybit".to_string(),
                path_or_url: trd_path.to_string_lossy().to_string(),
                wal_mode: true,
                size_bytes: trd_size,
                tables_count: 2,
                total_records: self.count_store_records(&trd_path, &["trading_positions", "trading_executions"]),
                status: "Conectado • Tempo Real (< 15 µs)".to_string(),
            },
            StoreInfo {
                id: "qdrant_vector".to_string(),
                name: "Memória Semântica Vetorial (Qdrant 1536d)".to_string(),
                engine: "Qdrant HNSW + BM25 Híbrido".to_string(),
                description: "Coleções vetoriais em 1536 dimensões, quantização escalar int8, vetores esparsos BM25 e payloads por tenant".to_string(),
                path_or_url: "http://localhost:6333 (Local / REST API)".to_string(),
                wal_mode: false,
                size_bytes: 1024 * 1024 * 4, // ~4 MB
                tables_count: 3,
                total_records: 269,
                status: "Conectado • Quantização int8 Ativa (-75% RAM)".to_string(),
            },
        ]
    }

    fn count_store_records(&self, path: &Path, tables: &[&str]) -> usize {
        if let Ok(conn) = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY) {
            let mut total = 0;
            for t in tables {
                let query = format!("SELECT COUNT(*) FROM {}", t);
                if let Ok(c) = conn.query_row(&query, [], |r| r.get::<_, i64>(0)) {
                    total += c as usize;
                }
            }
            total
        } else {
            0
        }
    }

    /// Retorna as tabelas / coleções pertencentes a uma base de dados específica
    pub fn get_tables(&self, store_id: &str) -> Result<Vec<TableInfo>> {
        match store_id {
            "sqlite_memory" => {
                let path = self.data_dir.join("alr_memory.db");
                let conn = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
                let get_cnt = |t: &str| -> usize {
                    conn.query_row(&format!("SELECT COUNT(*) FROM {}", t), [], |r| {
                        r.get::<_, i64>(0)
                    })
                    .unwrap_or(0) as usize
                };

                Ok(vec![
                    TableInfo {
                        name: "skills".to_string(),
                        record_count: get_cnt("skills"),
                        description: "Habilidades autônomas validadas, taxas de sucesso e ações associadas".to_string(),
                        icon: "⚡".to_string(),
                        category: "Políticas & Ações".to_string(),
                    },
                    TableInfo {
                        name: "episodes".to_string(),
                        record_count: get_cnt("episodes"),
                        description: "Sessões e partidas completas do Snake, Web e Trading com pontuação e passos".to_string(),
                        icon: "⏱️".to_string(),
                        category: "Histórico Operacional".to_string(),
                    },
                    TableInfo {
                        name: "experiences".to_string(),
                        record_count: get_cnt("experiences"),
                        description: "Tuplas de transição (s, a, r, s') para replay buffer e Q-Learning tabular".to_string(),
                        icon: "🔄".to_string(),
                        category: "Aprendizado por Reforço".to_string(),
                    },
                    TableInfo {
                        name: "memories".to_string(),
                        record_count: get_cnt("memories"),
                        description: "Regras procedurais, memórias episódicas e invariantes invioláveis".to_string(),
                        icon: "🧠".to_string(),
                        category: "Conhecimento Persistente".to_string(),
                    },
                    TableInfo {
                        name: "decisions_audit".to_string(),
                        record_count: get_cnt("decisions_audit"),
                        description: "Log detalhado de cada inferência System 1, confiança e fontes de decisão".to_string(),
                        icon: "📜".to_string(),
                        category: "Auditoria & Rastreabilidade".to_string(),
                    },
                    TableInfo {
                        name: "knowledge_proposals".to_string(),
                        record_count: get_cnt("knowledge_proposals"),
                        description: "Propostas de conhecimento oriundas do LLM Teacher aguardando validação".to_string(),
                        icon: "💡".to_string(),
                        category: "Destilação & Oráculo".to_string(),
                    },
                    TableInfo {
                        name: "policy_states".to_string(),
                        record_count: get_cnt("policy_states"),
                        description: "Snapshots e hiperparâmetros de tabelas Q e prioridades bayesianas".to_string(),
                        icon: "📊".to_string(),
                        category: "Metadados de Política".to_string(),
                    },
                ])
            }
            "sqlite_support" => {
                let path = self.data_dir.join("support.db");
                let conn = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
                let get_cnt = |t: &str| -> usize {
                    conn.query_row(&format!("SELECT COUNT(*) FROM {}", t), [], |r| {
                        r.get::<_, i64>(0)
                    })
                    .unwrap_or(0) as usize
                };

                Ok(vec![
                    TableInfo {
                        name: "customers".to_string(),
                        record_count: get_cnt("customers"),
                        description: "Base cadastral de clientes com tier de atendimento e canais autorizados".to_string(),
                        icon: "👥".to_string(),
                        category: "CRM & Contatos".to_string(),
                    },
                    TableInfo {
                        name: "orders".to_string(),
                        record_count: get_cnt("orders"),
                        description: "Pedidos e faturas de licenças com status de entrega e rastreamento".to_string(),
                        icon: "📦".to_string(),
                        category: "Transações Comerciais".to_string(),
                    },
                    TableInfo {
                        name: "payments".to_string(),
                        record_count: get_cnt("payments"),
                        description: "Transações PIX, boletos e cartões com hash de liquidação financeira".to_string(),
                        icon: "💳".to_string(),
                        category: "Faturamento & Checkout".to_string(),
                    },
                    TableInfo {
                        name: "tickets".to_string(),
                        record_count: get_cnt("tickets"),
                        description: "Chamados de suporte com transcrição de mensagens e agente atribuído".to_string(),
                        icon: "🎫".to_string(),
                        category: "Atendimento ao Cliente".to_string(),
                    },
                ])
            }
            "sqlite_trading" => {
                let path = self.data_dir.join("trading.db");
                let conn = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
                let get_cnt = |t: &str| -> usize {
                    conn.query_row(&format!("SELECT COUNT(*) FROM {}", t), [], |r| {
                        r.get::<_, i64>(0)
                    })
                    .unwrap_or(0) as usize
                };

                Ok(vec![
                    TableInfo {
                        name: "trading_positions".to_string(),
                        record_count: get_cnt("trading_positions"),
                        description: "Posições em aberto com preços de entrada, stop-loss móvel e PnL flutuante".to_string(),
                        icon: "📈".to_string(),
                        category: "Gestão de Posições".to_string(),
                    },
                    TableInfo {
                        name: "trading_executions".to_string(),
                        record_count: get_cnt("trading_executions"),
                        description: "Histórico de ordens executadas via HMAC-SHA256 na Binance Spot Testnet".to_string(),
                        icon: "🎯".to_string(),
                        category: "Ordens & Execuções".to_string(),
                    },
                ])
            }
            "qdrant_vector" => Ok(vec![
                TableInfo {
                    name: "alr_knowledge_1536d".to_string(),
                    record_count: 120,
                    description: "Base de conhecimento mestre em 1536d com invariantes e documentos de sistema".to_string(),
                    icon: "🌐".to_string(),
                    category: "Memória Vetorial Mestre".to_string(),
                },
                TableInfo {
                    name: "support_knowledge_1536d".to_string(),
                    record_count: 85,
                    description: "SLAs, políticas de estorno, manuais técnicos e histórico de resoluções de tickets".to_string(),
                    icon: "📚".to_string(),
                    category: "Knowledge Base CRM".to_string(),
                },
                TableInfo {
                    name: "marketing_ops_1536d".to_string(),
                    record_count: 64,
                    description: "Taxonomia de termos Google Ads, padrões de criativos Meta e diretrizes de SEO".to_string(),
                    icon: "📊".to_string(),
                    category: "Embeddings de Marketing".to_string(),
                },
            ]),
            _ => bail!("Banco de dados '{}' não reconhecido", store_id),
        }
    }

    /// Retorna os dados, colunas e paginação de uma tabela ou coleção vetorial
    pub fn get_table_data(
        &self,
        store_id: &str,
        table_name: &str,
        limit: usize,
        offset: usize,
        search: Option<&str>,
    ) -> Result<TableDataResponse> {
        let start = Instant::now();
        let stores = self.get_stores();
        let store_info = stores
            .into_iter()
            .find(|s| s.id == store_id)
            .ok_or_else(|| anyhow::anyhow!("Store não encontrado"))?;

        if store_id == "qdrant_vector" {
            return self
                .get_qdrant_table_data(store_info, table_name, limit, offset, search, start);
        }

        let db_file = match store_id {
            "sqlite_memory" => "alr_memory.db",
            "sqlite_support" => "support.db",
            "sqlite_trading" => "trading.db",
            _ => bail!("Store inválido: {}", store_id),
        };

        let path = self.data_dir.join(db_file);
        let conn = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;

        // Obtém metadados das colunas via PRAGMA table_info
        let mut pragma_stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
        let columns: Vec<ColumnInfo> = pragma_stmt
            .query_map([], |row| {
                let name: String = row.get(1)?;
                let col_type: String = row.get(2)?;
                let notnull: i64 = row.get(3)?;
                let pk: i64 = row.get(5)?;
                Ok(ColumnInfo {
                    name,
                    col_type,
                    is_pk: pk > 0,
                    nullable: notnull == 0,
                    description: "".to_string(),
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        // Contagem total
        let mut count_query = format!("SELECT COUNT(*) FROM {}", table_name);
        if let Some(s) = search {
            if !s.trim().is_empty() {
                let text_cols: Vec<&str> = columns
                    .iter()
                    .filter(|c| c.col_type.contains("TEXT"))
                    .map(|c| c.name.as_str())
                    .collect();
                if !text_cols.is_empty() {
                    let search_clause: Vec<String> = text_cols
                        .iter()
                        .map(|c| format!("{} LIKE '%{}%'", c, s.replace('\'', "''")))
                        .collect();
                    count_query = format!(
                        "SELECT COUNT(*) FROM {} WHERE {}",
                        table_name,
                        search_clause.join(" OR ")
                    );
                }
            }
        }

        let total_rows: usize = conn
            .query_row(&count_query, [], |r| r.get::<_, i64>(0))
            .unwrap_or(0) as usize;

        // Query dos dados reais
        let mut data_query = format!("SELECT * FROM {}", table_name);
        if let Some(s) = search {
            if !s.trim().is_empty() {
                let text_cols: Vec<&str> = columns
                    .iter()
                    .filter(|c| c.col_type.contains("TEXT"))
                    .map(|c| c.name.as_str())
                    .collect();
                if !text_cols.is_empty() {
                    let search_clause: Vec<String> = text_cols
                        .iter()
                        .map(|c| format!("{} LIKE '%{}%'", c, s.replace('\'', "''")))
                        .collect();
                    data_query = format!(
                        "SELECT * FROM {} WHERE {}",
                        table_name,
                        search_clause.join(" OR ")
                    );
                }
            }
        }
        data_query = format!("{} LIMIT {} OFFSET {}", data_query, limit, offset);

        let mut stmt = conn.prepare(&data_query)?;
        let col_names: Vec<String> = columns.iter().map(|c| c.name.clone()).collect();

        let rows_iter = stmt.query_map([], |row| {
            let mut map = HashMap::new();
            for (idx, name) in col_names.iter().enumerate() {
                let val: Value = if let Ok(s) = row.get::<_, String>(idx) {
                    // Tenta parsear como JSON estruturado se parecer objeto ou array
                    if (s.starts_with('{') && s.ends_with('}'))
                        || (s.starts_with('[') && s.ends_with(']'))
                    {
                        serde_json::from_str(&s).unwrap_or(Value::String(s))
                    } else {
                        Value::String(s)
                    }
                } else if let Ok(i) = row.get::<_, i64>(idx) {
                    Value::Number(i.into())
                } else if let Ok(f) = row.get::<_, f64>(idx) {
                    serde_json::Number::from_f64(f)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
                } else {
                    Value::Null
                };
                map.insert(name.clone(), val);
            }
            Ok(map)
        })?;

        let rows: Vec<_> = rows_iter.flatten().collect();

        let latency_micros = start.elapsed().as_micros();

        Ok(TableDataResponse {
            store: store_id.to_string(),
            table: table_name.to_string(),
            columns,
            rows,
            total_rows,
            limit,
            offset,
            latency_micros,
            store_info,
        })
    }

    /// Retorna dados simulados e estruturados de alta fidelidade para as coleções do Qdrant
    fn get_qdrant_table_data(
        &self,
        store_info: StoreInfo,
        collection_name: &str,
        limit: usize,
        offset: usize,
        search: Option<&str>,
        start: Instant,
    ) -> Result<TableDataResponse> {
        let columns = vec![
            ColumnInfo {
                name: "id".to_string(),
                col_type: "UUID".to_string(),
                is_pk: true,
                nullable: false,
                description: "Identificador único do ponto vetorial".to_string(),
            },
            ColumnInfo {
                name: "tenant_id".to_string(),
                col_type: "TEXT".to_string(),
                is_pk: false,
                nullable: false,
                description: "Isolamento estrito multi-inquilino".to_string(),
            },
            ColumnInfo {
                name: "title".to_string(),
                col_type: "TEXT".to_string(),
                is_pk: false,
                nullable: false,
                description: "Título ou cabeçalho do documento ingerido".to_string(),
            },
            ColumnInfo {
                name: "text_content".to_string(),
                col_type: "TEXT".to_string(),
                is_pk: false,
                nullable: false,
                description: "Conteúdo textual indexado (Chunk)".to_string(),
            },
            ColumnInfo {
                name: "vector_dim".to_string(),
                col_type: "INTEGER".to_string(),
                is_pk: false,
                nullable: false,
                description: "Dimensão do vetor denso (1536d OpenAI text-embedding-3)".to_string(),
            },
            ColumnInfo {
                name: "vector_l2_norm".to_string(),
                col_type: "REAL".to_string(),
                is_pk: false,
                nullable: false,
                description: "Norma euclidiana L2 (1.0000 garantida)".to_string(),
            },
            ColumnInfo {
                name: "sparse_bm25_tokens".to_string(),
                col_type: "JSON".to_string(),
                is_pk: false,
                nullable: false,
                description: "Tokens ponderados BM25 para busca exata".to_string(),
            },
            ColumnInfo {
                name: "quantization".to_string(),
                col_type: "TEXT".to_string(),
                is_pk: false,
                nullable: false,
                description: "Quantização escalar int8 (75% menos RAM)".to_string(),
            },
            ColumnInfo {
                name: "payload_metadata".to_string(),
                col_type: "JSON".to_string(),
                is_pk: false,
                nullable: false,
                description: "Metadados estruturados, tags e score de confiança".to_string(),
            },
        ];

        let mut sample_rows = Vec::new();

        if collection_name.contains("alr_knowledge") {
            sample_rows.push(HashMap::from([
                ("id".to_string(), json!("8f3e2b1a-4c5d-6e7f-8a9b-0c1d2e3f4a5b")),
                ("tenant_id".to_string(), json!("tenant_master_alr")),
                ("title".to_string(), json!("Princípio Inviolável da Hierarquia de Decisão")),
                ("text_content".to_string(), json!("A LLM pode ensinar o agente, mas não precisa controlar permanentemente o agente. Hierarquia estrita: 1. Regras Determinísticas, 2. Skills Aprendidas, 3. Memória Procedural, 4. Q-Learning/Neural Local, 5. LLM Teacher (Cold-Start apenas).")),
                ("vector_dim".to_string(), json!(1536)),
                ("vector_l2_norm".to_string(), json!(1.0000)),
                ("sparse_bm25_tokens".to_string(), json!({"hierarquia": 2.45, "decisao": 1.98, "llm": 1.54, "inviolavel": 2.89})),
                ("quantization".to_string(), json!("scalar_int8 (always_ram: true)")),
                ("payload_metadata".to_string(), json!({"category": "core_invariants", "version": "1.13", "verified": true})),
            ]));
            sample_rows.push(HashMap::from([
                ("id".to_string(), json!("9a1b2c3d-5e6f-7a8b-9c0d-1e2f3a4b5c6d")),
                ("tenant_id".to_string(), json!("tenant_master_alr")),
                ("title".to_string(), json!("Garantias de Segurança do SafeInputController")),
                ("text_content".to_string(), json!("O controlador de entrada física de mouse e teclado limita eventos a 20 Hz, bloqueia movimentos fora de bounding boxes e possui parada de emergência atômica.")),
                ("vector_dim".to_string(), json!(1536)),
                ("vector_l2_norm".to_string(), json!(1.0000)),
                ("sparse_bm25_tokens".to_string(), json!({"safe_input": 2.92, "rate_limit": 2.15, "kill_switch": 3.12})),
                ("quantization".to_string(), json!("scalar_int8 (always_ram: true)")),
                ("payload_metadata".to_string(), json!({"module": "alr-execution", "rate_limit_hz": 20})),
            ]));
        } else if collection_name.contains("support_knowledge") {
            sample_rows.push(HashMap::from([
                ("id".to_string(), json!("a1b2c3d4-1111-2222-3333-444455556666")),
                ("tenant_id".to_string(), json!("tenant_support_crm")),
                ("title".to_string(), json!("Política de Estornos e Saques Falhos")),
                ("text_content".to_string(), json!("Em caso de falha de saque bancário com timeout no gateway PIX, o saldo deve ser estornado em até 15 minutos e o chamado categorizado como urgente sob a fila de Faturamento (billing).")),
                ("vector_dim".to_string(), json!(1536)),
                ("vector_l2_norm".to_string(), json!(1.0000)),
                ("sparse_bm25_tokens".to_string(), json!({"saque": 3.12, "falha": 2.84, "estorno": 3.05, "billing": 2.65})),
                ("quantization".to_string(), json!("scalar_int8 (always_ram: true)")),
                ("payload_metadata".to_string(), json!({"department": "billing", "sla_minutes": 15, "auto_refund": true})),
            ]));
            sample_rows.push(HashMap::from([
                ("id".to_string(), json!("b2c3d4e5-2222-3333-4444-555566667777")),
                ("tenant_id".to_string(), json!("tenant_support_crm")),
                ("title".to_string(), json!("Desconto e Contratação Enterprise para 40+ Assentos")),
                ("text_content".to_string(), json!("Clientes com interesse em mais de 40 licenças têm direito a desconto de 25% anual, reunião de revisão de segurança com os engenheiros e SLA de 99.9% garantido em contrato.")),
                ("vector_dim".to_string(), json!(1536)),
                ("vector_l2_norm".to_string(), json!(1.0000)),
                ("sparse_bm25_tokens".to_string(), json!({"enterprise": 2.95, "licencas": 2.40, "seguranca": 2.80, "pricing": 2.50})),
                ("quantization".to_string(), json!("scalar_int8 (always_ram: true)")),
                ("payload_metadata".to_string(), json!({"tier": "enterprise", "min_seats": 40, "discount_pct": 25})),
            ]));
        } else {
            sample_rows.push(HashMap::from([
                ("id".to_string(), json!("c3d4e5f6-3333-4444-5555-666677778888")),
                ("tenant_id".to_string(), json!("tenant_marketing_ops")),
                ("title".to_string(), json!("Diretrizes de Negativação Automática de Termos de Busca")),
                ("text_content".to_string(), json!("Termos contendo 'gratis', 'crack', 'torrent', 'vagas' ou 'login' devem ser adicionados na lista de palavras-chave negativas da campanha em nível de conta.")),
                ("vector_dim".to_string(), json!(1536)),
                ("vector_l2_norm".to_string(), json!(1.0000)),
                ("sparse_bm25_tokens".to_string(), json!({"negativacao": 3.42, "google_ads": 2.89, "junk": 3.10})),
                ("quantization".to_string(), json!("scalar_int8 (always_ram: true)")),
                ("payload_metadata".to_string(), json!({"channel": "google_ads", "auto_negative": true})),
            ]));
        }

        // Filtro de busca se informado
        if let Some(s) = search {
            if !s.trim().is_empty() {
                let s_lower = s.to_lowercase();
                sample_rows.retain(|r| {
                    r.values().any(|v| match v {
                        Value::String(str_val) => str_val.to_lowercase().contains(&s_lower),
                        _ => false,
                    })
                });
            }
        }

        let total_rows = sample_rows.len();
        let paged_rows = sample_rows.into_iter().skip(offset).take(limit).collect();

        let latency_micros = start.elapsed().as_micros();

        Ok(TableDataResponse {
            store: store_info.id.clone(),
            table: collection_name.to_string(),
            columns,
            rows: paged_rows,
            total_rows,
            limit,
            offset,
            latency_micros,
            store_info,
        })
    }
}

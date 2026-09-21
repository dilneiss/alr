use crate::models::{DecisionAuditRecord, EpisodeRecord};
use crate::traits::{MemoryQuery, MemoryStore};
use alr_core::{
    Action, Experience, KnowledgeProposal, KnowledgeStatus, Memory, MemoryId, MemoryType, Skill,
    State,
};
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct SqliteMemoryStore {
    conn: Arc<Mutex<Connection>>,
    pub db_path: Option<PathBuf>,
}

impl SqliteMemoryStore {
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: None,
        };
        store.run_migrations()?;
        Ok(store)
    }

    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        if let Some(parent) = path.as_ref().parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)?;
            }
        }
        let conn = Connection::open(&path)?;
        let store = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: Some(path.as_ref().to_path_buf()),
        };
        store.run_migrations()?;
        Ok(store)
    }

    pub fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                memory_type TEXT NOT NULL,
                content TEXT NOT NULL,
                confidence REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

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
                local_decisions INTEGER NOT NULL,
                autonomous_rate REAL NOT NULL,
                mean_confidence REAL NOT NULL,
                mean_novelty REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS experiences (
                id TEXT PRIMARY KEY,
                episode_id TEXT NOT NULL,
                step INTEGER NOT NULL,
                state_features TEXT NOT NULL,
                state_metadata TEXT NOT NULL,
                action_id TEXT NOT NULL,
                action_parameters TEXT NOT NULL,
                reward REAL NOT NULL,
                next_state_features TEXT,
                next_state_metadata TEXT,
                terminal INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS knowledge_proposals (
                id TEXT PRIMARY KEY,
                proposal_type TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT NOT NULL,
                validation_notes TEXT,
                confidence REAL NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS policy_states (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS decisions_audit (
                id TEXT PRIMARY KEY,
                episode_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                state_hash TEXT NOT NULL,
                action_id TEXT NOT NULL,
                confidence REAL NOT NULL,
                novelty REAL NOT NULL,
                decision_source TEXT NOT NULL,
                skill_id TEXT,
                llm_call_id TEXT,
                reward REAL
            );
            "#,
        )
        .context("Failed to execute SQLite migrations")?;
        Ok(())
    }

    // Skills storage methods
    pub fn save_skill(&self, skill: &Skill) -> Result<()> {
        let conn = self.conn.lock();
        let status_str = format!("{:?}", skill.status);
        let conditions_str = serde_json::to_string(&skill.conditions)?;
        let action_str = serde_json::to_string(&skill.action)?;
        let created_at_str = skill.created_at.to_rfc3339();
        let updated_at_str = skill.updated_at.to_rfc3339();

        conn.execute(
            r#"
            INSERT INTO skills (
                id, name, version, description, conditions, action,
                confidence, success_rate, executions, failures,
                origin, status, priority, risk, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
            ON CONFLICT(name) DO UPDATE SET
                version=excluded.version,
                description=excluded.description,
                conditions=excluded.conditions,
                action=excluded.action,
                confidence=excluded.confidence,
                success_rate=excluded.success_rate,
                executions=excluded.executions,
                failures=excluded.failures,
                status=excluded.status,
                priority=excluded.priority,
                risk=excluded.risk,
                updated_at=excluded.updated_at
            "#,
            params![
                skill.id,
                skill.name,
                skill.version,
                skill.description,
                conditions_str,
                action_str,
                skill.confidence,
                skill.success_rate,
                skill.executions as i64,
                skill.failures as i64,
                skill.origin,
                status_str,
                skill.priority,
                skill.risk,
                created_at_str,
                updated_at_str,
            ],
        )?;
        Ok(())
    }

    pub fn list_skills(&self, status_filter: Option<KnowledgeStatus>) -> Result<Vec<Skill>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, name, version, description, conditions, action, confidence, success_rate, executions, failures, origin, status, priority, risk, created_at, updated_at FROM skills ORDER BY priority DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let version: u32 = row.get(2)?;
            let description: String = row.get(3)?;
            let conditions_str: String = row.get(4)?;
            let action_str: String = row.get(5)?;
            let confidence: f32 = row.get(6)?;
            let success_rate: f32 = row.get(7)?;
            let executions: i64 = row.get(8)?;
            let failures: i64 = row.get(9)?;
            let origin: String = row.get(10)?;
            let status_str: String = row.get(11)?;
            let priority: i32 = row.get(12)?;
            let risk: f32 = row.get(13)?;
            let created_at_str: String = row.get(14)?;
            let updated_at_str: String = row.get(15)?;

            let conditions: serde_json::Value =
                serde_json::from_str(&conditions_str).unwrap_or(serde_json::Value::Null);
            let action: Action = serde_json::from_str(&action_str)
                .unwrap_or(Action::new("UNKNOWN", serde_json::Value::Null));
            let status = match status_str.as_str() {
                "Active" => KnowledgeStatus::Active,
                "Verified" => KnowledgeStatus::Verified,
                "Testing" => KnowledgeStatus::Testing,
                "Deprecated" => KnowledgeStatus::Deprecated,
                _ => KnowledgeStatus::Proposed,
            };
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Skill {
                id,
                name,
                version,
                description,
                conditions,
                action,
                confidence,
                success_rate,
                executions: executions as u64,
                failures: failures as u64,
                origin,
                status,
                priority,
                risk,
                created_at,
                updated_at,
            })
        })?;

        let mut result = Vec::new();
        for s in rows {
            let skill = s?;
            if let Some(target_status) = status_filter {
                if skill.status == target_status {
                    result.push(skill);
                }
            } else {
                result.push(skill);
            }
        }
        Ok(result)
    }

    // Policy state persistence
    pub fn save_policy_state(&self, name: &str, data: &str) -> Result<()> {
        let conn = self.conn.lock();
        let now = Utc::now().to_rfc3339();
        let id = Uuid::new_v4().to_string();
        conn.execute(
            r#"
            INSERT INTO policy_states (id, name, data, updated_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(name) DO UPDATE SET
                data=excluded.data,
                updated_at=excluded.updated_at
            "#,
            params![id, name, data, now],
        )?;
        Ok(())
    }

    pub fn load_policy_state(&self, name: &str) -> Result<Option<String>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT data FROM policy_states WHERE name = ?1")?;
        let mut rows = stmt.query(params![name])?;
        if let Some(row) = rows.next()? {
            let data: String = row.get(0)?;
            Ok(Some(data))
        } else {
            Ok(None)
        }
    }

    // Episodes & Audit
    pub fn save_episode(&self, ep: &EpisodeRecord) -> Result<()> {
        let conn = self.conn.lock();
        let start_str = ep.start_time.to_rfc3339();
        let end_str = ep.end_time.map(|t| t.to_rfc3339());
        conn.execute(
            r#"
            INSERT INTO episodes (
                id, seed, start_time, end_time, score, steps, food_eaten,
                collision, llm_calls, local_decisions, autonomous_rate,
                mean_confidence, mean_novelty
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            "#,
            params![
                ep.id,
                ep.seed as i64,
                start_str,
                end_str,
                ep.score,
                ep.steps as i64,
                ep.food_eaten as i64,
                if ep.collision { 1 } else { 0 },
                ep.llm_calls as i64,
                ep.local_decisions as i64,
                ep.autonomous_rate,
                ep.mean_confidence,
                ep.mean_novelty,
            ],
        )?;
        Ok(())
    }

    pub fn save_experience(&self, episode_id: &str, step: u64, exp: &Experience) -> Result<()> {
        let conn = self.conn.lock();
        let id = Uuid::new_v4().to_string();
        let state_feats = serde_json::to_string(&exp.state.features)?;
        let state_meta = serde_json::to_string(&exp.state.metadata)?;
        let action_id = exp.action.id.clone();
        let action_params = serde_json::to_string(&exp.action.parameters)?;
        let next_feats = exp
            .next_state
            .as_ref()
            .map(|s| serde_json::to_string(&s.features).unwrap_or_default());
        let next_meta = exp
            .next_state
            .as_ref()
            .map(|s| serde_json::to_string(&s.metadata).unwrap_or_default());
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            INSERT INTO experiences (
                id, episode_id, step, state_features, state_metadata,
                action_id, action_parameters, reward, next_state_features,
                next_state_metadata, terminal, timestamp
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            "#,
            params![
                id,
                episode_id,
                step as i64,
                state_feats,
                state_meta,
                action_id,
                action_params,
                exp.reward,
                next_feats,
                next_meta,
                if exp.terminal { 1 } else { 0 },
                now,
            ],
        )?;
        Ok(())
    }

    pub fn get_experiences_for_episode(&self, episode_id: &str) -> Result<Vec<(u64, Experience)>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT step, state_features, state_metadata, action_id, action_parameters,
                   reward, next_state_features, next_state_metadata, terminal
            FROM experiences
            WHERE episode_id = ?1
            ORDER BY step ASC
            "#,
        )?;

        let rows = stmt.query_map(params![episode_id], |row| {
            let step: i64 = row.get(0)?;
            let s_feats: String = row.get(1)?;
            let s_meta: String = row.get(2)?;
            let a_id: String = row.get(3)?;
            let a_params: String = row.get(4)?;
            let reward: f32 = row.get(5)?;
            let ns_feats: Option<String> = row.get(6)?;
            let ns_meta: Option<String> = row.get(7)?;
            let terminal: i32 = row.get(8)?;

            let state = State::new(
                serde_json::from_str(&s_feats).unwrap_or_default(),
                serde_json::from_str(&s_meta).unwrap_or(serde_json::Value::Null),
            );
            let action = Action::new(
                a_id,
                serde_json::from_str(&a_params).unwrap_or(serde_json::Value::Null),
            );
            let next_state = ns_feats.map(|nf| {
                State::new(
                    serde_json::from_str(&nf).unwrap_or_default(),
                    ns_meta
                        .and_then(|nm| serde_json::from_str(&nm).ok())
                        .unwrap_or(serde_json::Value::Null),
                )
            });

            Ok((
                step as u64,
                Experience {
                    state,
                    action,
                    reward,
                    next_state,
                    terminal: terminal != 0,
                },
            ))
        })?;

        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn list_episodes(&self, limit: usize) -> Result<Vec<EpisodeRecord>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, seed, start_time, end_time, score, steps, food_eaten,
                   collision, llm_calls, local_decisions, autonomous_rate,
                   mean_confidence, mean_novelty
            FROM episodes
            ORDER BY start_time DESC
            LIMIT ?1
            "#,
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            let id: String = row.get(0)?;
            let seed: i64 = row.get(1)?;
            let start_str: String = row.get(2)?;
            let end_str: Option<String> = row.get(3)?;
            let score: i32 = row.get(4)?;
            let steps: i64 = row.get(5)?;
            let food_eaten: i64 = row.get(6)?;
            let collision: i32 = row.get(7)?;
            let llm_calls: i64 = row.get(8)?;
            let local_decisions: i64 = row.get(9)?;
            let autonomous_rate: f32 = row.get(10)?;
            let mean_confidence: f32 = row.get(11)?;
            let mean_novelty: f32 = row.get(12)?;

            let start_time = DateTime::parse_from_rfc3339(&start_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let end_time = end_str.and_then(|s| {
                DateTime::parse_from_rfc3339(&s)
                    .map(|dt| dt.with_timezone(&Utc))
                    .ok()
            });

            Ok(EpisodeRecord {
                id,
                seed: seed as u64,
                start_time,
                end_time,
                score,
                steps: steps as u64,
                food_eaten: food_eaten as u32,
                collision: collision != 0,
                llm_calls: llm_calls as u32,
                local_decisions: local_decisions as u32,
                autonomous_rate,
                mean_confidence,
                mean_novelty,
            })
        })?;

        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn save_decision_audit(&self, audit: &DecisionAuditRecord) -> Result<()> {
        let conn = self.conn.lock();
        let ts_str = audit.timestamp.to_rfc3339();
        conn.execute(
            r#"
            INSERT INTO decisions_audit (
                id, episode_id, timestamp, state_hash, action_id,
                confidence, novelty, decision_source, skill_id,
                llm_call_id, reward
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                audit.id,
                audit.episode_id,
                ts_str,
                audit.state_hash,
                audit.action_id,
                audit.confidence,
                audit.novelty,
                audit.decision_source.as_str(),
                audit.skill_id,
                audit.llm_call_id,
                audit.reward,
            ],
        )?;
        Ok(())
    }

    pub fn save_knowledge_proposal(
        &self,
        proposal: &KnowledgeProposal,
        status: &str,
        notes: &str,
    ) -> Result<String> {
        let conn = self.conn.lock();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let content = serde_json::to_string(proposal)?;

        conn.execute(
            r#"
            INSERT INTO knowledge_proposals (id, proposal_type, content, status, validation_notes, confidence, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                id,
                proposal.knowledge_type,
                content,
                status,
                notes,
                proposal.confidence,
                now,
            ],
        )?;
        Ok(id)
    }
}

#[async_trait]
impl MemoryStore for SqliteMemoryStore {
    async fn remember(&self, memory: Memory) -> Result<MemoryId> {
        let conn = self.conn.lock();
        let id_str = memory.id.to_string();
        let type_str = format!("{:?}", memory.memory_type);
        let content_str = serde_json::to_string(&memory.content)?;
        let status_str = format!("{:?}", memory.status);
        let created_at = memory.created_at.to_rfc3339();
        let updated_at = memory.updated_at.to_rfc3339();

        conn.execute(
            r#"
            INSERT INTO memories (id, memory_type, content, confidence, status, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                id_str,
                type_str,
                content_str,
                memory.confidence,
                status_str,
                created_at,
                updated_at,
            ],
        )?;

        Ok(memory.id)
    }

    async fn recall(&self, query: MemoryQuery) -> Result<Vec<Memory>> {
        let conn = self.conn.lock();
        let mut sql = "SELECT id, memory_type, content, confidence, status, created_at, updated_at FROM memories WHERE 1=1".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(mt) = query.memory_type {
            sql.push_str(" AND memory_type = ?");
            params_vec.push(Box::new(format!("{:?}", mt)));
        }
        if let Some(min_conf) = query.min_confidence {
            sql.push_str(" AND confidence >= ?");
            params_vec.push(Box::new(min_conf));
        }
        sql.push_str(" ORDER BY confidence DESC, created_at DESC");
        if let Some(limit) = query.limit {
            sql.push_str(" LIMIT ?");
            params_vec.push(Box::new(limit as i64));
        }

        let mut stmt = conn.prepare(&sql)?;
        let to_sql_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(to_sql_refs.as_slice(), |row| {
            let id_str: String = row.get(0)?;
            let type_str: String = row.get(1)?;
            let content_str: String = row.get(2)?;
            let confidence: f32 = row.get(3)?;
            let status_str: String = row.get(4)?;
            let created_at_str: String = row.get(5)?;
            let updated_at_str: String = row.get(6)?;

            let id = MemoryId(Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4()));
            let memory_type = match type_str.as_str() {
                "Episodic" => MemoryType::Episodic,
                "Procedural" => MemoryType::Procedural,
                "Semantic" => MemoryType::Semantic,
                _ => MemoryType::Skill,
            };
            let content = serde_json::from_str(&content_str).unwrap_or(serde_json::Value::Null);
            let status = match status_str.as_str() {
                "Active" => KnowledgeStatus::Active,
                "Verified" => KnowledgeStatus::Verified,
                "Testing" => KnowledgeStatus::Testing,
                "Deprecated" => KnowledgeStatus::Deprecated,
                _ => KnowledgeStatus::Proposed,
            };
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Memory {
                id,
                memory_type,
                content,
                confidence,
                status,
                created_at,
                updated_at,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    async fn get(&self, id: MemoryId) -> Result<Option<Memory>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, memory_type, content, confidence, status, created_at, updated_at FROM memories WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![id.to_string()])?;

        if let Some(row) = rows.next()? {
            let id_str: String = row.get(0)?;
            let type_str: String = row.get(1)?;
            let content_str: String = row.get(2)?;
            let confidence: f32 = row.get(3)?;
            let status_str: String = row.get(4)?;
            let created_at_str: String = row.get(5)?;
            let updated_at_str: String = row.get(6)?;

            let id = MemoryId(Uuid::parse_str(&id_str).unwrap_or_else(|_| Uuid::new_v4()));
            let memory_type = match type_str.as_str() {
                "Episodic" => MemoryType::Episodic,
                "Procedural" => MemoryType::Procedural,
                "Semantic" => MemoryType::Semantic,
                _ => MemoryType::Skill,
            };
            let content = serde_json::from_str(&content_str).unwrap_or(serde_json::Value::Null);
            let status = match status_str.as_str() {
                "Active" => KnowledgeStatus::Active,
                "Verified" => KnowledgeStatus::Verified,
                "Testing" => KnowledgeStatus::Testing,
                "Deprecated" => KnowledgeStatus::Deprecated,
                _ => KnowledgeStatus::Proposed,
            };
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Some(Memory {
                id,
                memory_type,
                content,
                confidence,
                status,
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    async fn update(&self, memory: Memory) -> Result<()> {
        let conn = self.conn.lock();
        let type_str = format!("{:?}", memory.memory_type);
        let content_str = serde_json::to_string(&memory.content)?;
        let status_str = format!("{:?}", memory.status);
        let updated_at = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE memories SET
                memory_type = ?1,
                content = ?2,
                confidence = ?3,
                status = ?4,
                updated_at = ?5
            WHERE id = ?6
            "#,
            params![
                type_str,
                content_str,
                memory.confidence,
                status_str,
                updated_at,
                memory.id.to_string(),
            ],
        )?;
        Ok(())
    }

    async fn delete(&self, id: MemoryId) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "DELETE FROM memories WHERE id = ?1",
            params![id.to_string()],
        )?;
        Ok(())
    }
}

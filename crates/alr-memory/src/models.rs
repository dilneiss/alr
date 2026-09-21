use alr_core::DecisionSource;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeRecord {
    pub id: String,
    pub seed: u64,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub score: i32,
    pub steps: u64,
    pub food_eaten: u32,
    pub collision: bool,
    pub llm_calls: u32,
    pub local_decisions: u32,
    pub autonomous_rate: f32,
    pub mean_confidence: f32,
    pub mean_novelty: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionAuditRecord {
    pub id: String,
    pub episode_id: String,
    pub timestamp: DateTime<Utc>,
    pub state_hash: String,
    pub action_id: String,
    pub confidence: f32,
    pub novelty: f32,
    pub decision_source: DecisionSource,
    pub skill_id: Option<String>,
    pub llm_call_id: Option<String>,
    pub reward: Option<f32>,
}

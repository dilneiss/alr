use anyhow::{bail, Result};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Idempotency Engine to prevent duplicate execution of non-idempotent write operations
#[derive(Clone)]
pub struct IdempotencyStore {
    seen_keys: Arc<Mutex<HashMap<String, Instant>>>,
    ttl: Duration,
}

impl Default for IdempotencyStore {
    fn default() -> Self {
        Self::new(Duration::from_secs(300))
    }
}

impl IdempotencyStore {
    pub fn new(ttl: Duration) -> Self {
        Self {
            seen_keys: Arc::new(Mutex::new(HashMap::new())),
            ttl,
        }
    }

    pub fn check_or_record(&self, idempotency_key: &str) -> Result<()> {
        let mut guard = self.seen_keys.lock();
        let now = Instant::now();

        // Prune expired entries
        guard.retain(|_, time| now.duration_since(*time) < self.ttl);

        if guard.contains_key(idempotency_key) {
            bail!(
                "Idempotency Guard: Duplicate execution blocked for key '{}'",
                idempotency_key
            );
        }

        guard.insert(idempotency_key.to_string(), now);
        Ok(())
    }
}

/// Loop Detector tracking repeated sequence of decisions / tool calls without state progress
#[derive(Debug, Clone, Default)]
pub struct LoopDetector {
    history: Vec<String>,
    max_repetition: usize,
}

impl LoopDetector {
    pub fn new(max_repetition: usize) -> Self {
        Self {
            history: Vec::new(),
            max_repetition: max_repetition.max(2),
        }
    }

    pub fn record_action(&mut self, action_fingerprint: &str) -> Result<()> {
        self.history.push(action_fingerprint.to_string());
        if self.history.len() > 50 {
            self.history.remove(0);
        }

        // Check if last action repeated consecutively N times
        let count = self
            .history
            .iter()
            .rev()
            .take_while(|&a| a == action_fingerprint)
            .count();
        if count >= self.max_repetition {
            bail!(
                "Infinite Loop Detected: Action '{}' executed {} times without state progress",
                action_fingerprint,
                count
            );
        }

        // Check 2-cycle repetition (A -> B -> A -> B -> A -> B)
        if self.history.len() >= 6 {
            let len = self.history.len();
            if self.history[len - 1] == self.history[len - 3]
                && self.history[len - 3] == self.history[len - 5]
                && self.history[len - 2] == self.history[len - 4]
                && self.history[len - 4] == self.history[len - 6]
            {
                bail!(
                    "Cycle Loop Detected: Repetitive two-step loop between '{}' and '{}'",
                    self.history[len - 2],
                    self.history[len - 1]
                );
            }
        }

        Ok(())
    }

    pub fn clear(&mut self) {
        self.history.clear();
    }
}

/// Budget Enforcer for LLM Oracle requests per ticket or episode
#[derive(Debug, Clone)]
pub struct LlmCallBudget {
    max_calls_per_ticket: u32,
    current_calls: u32,
}

impl LlmCallBudget {
    pub fn new(max_calls_per_ticket: u32) -> Self {
        Self {
            max_calls_per_ticket,
            current_calls: 0,
        }
    }

    pub fn consume_budget(&mut self) -> Result<()> {
        if self.current_calls >= self.max_calls_per_ticket {
            bail!(
                "LLM Call Budget Exceeded: Reached maximum allowed {} calls for current ticket",
                self.max_calls_per_ticket
            );
        }
        self.current_calls += 1;
        Ok(())
    }

    pub fn current_calls(&self) -> u32 {
        self.current_calls
    }

    pub fn reset(&mut self) {
        self.current_calls = 0;
    }
}

/// Configurable Retry Policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_delay_ms: u64,
    pub max_delay_ms: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 50,
            max_delay_ms: 1000,
        }
    }
}

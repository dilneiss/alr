use anyhow::{bail, Result};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Distributed / Centralized Idempotency Key Store for preventing duplicate dispatches
#[derive(Clone)]
pub struct IdempotencyStore {
    seen_keys: Arc<Mutex<HashMap<String, Instant>>>,
    ttl: Duration,
}

impl IdempotencyStore {
    pub fn new(ttl: Duration) -> Self {
        Self {
            seen_keys: Arc::new(Mutex::new(HashMap::new())),
            ttl,
        }
    }

    /// Synchronously or asynchronously check and record execution
    pub fn check_or_record(&self, key: &str) -> Result<()> {
        let mut guard = self
            .seen_keys
            .try_lock()
            .map_err(|_| anyhow::anyhow!("Lock contention on IdempotencyStore"))?;
        let now = Instant::now();

        guard.retain(|_, v| now.duration_since(*v) < self.ttl);

        if guard.contains_key(key) {
            bail!("Duplicate action prevented by IdempotencyStore: '{}'", key);
        }

        guard.insert(key.to_string(), now);
        Ok(())
    }

    /// Try to acquire execution lock on an idempotency key.
    /// Returns true if key is fresh and acquired, false if already executed within TTL.
    pub async fn acquire(&self, key: &str) -> bool {
        let mut guard = self.seen_keys.lock().await;
        let now = Instant::now();

        // Prune expired keys
        guard.retain(|_, v| now.duration_since(*v) < self.ttl);

        if guard.contains_key(key) {
            return false;
        }

        guard.insert(key.to_string(), now);
        true
    }

    /// Explicitly release or remove a key
    pub async fn release(&self, key: &str) {
        let mut guard = self.seen_keys.lock().await;
        guard.remove(key);
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

/// Advanced Universal Loop Evasion Engine with multi-layer oscillation detection
/// and automatic orthogonal diversion to prevent agents from being trapped in local minima
#[derive(Debug, Clone)]
pub struct LoopEvasionEngine {
    action_history: Vec<String>,
    state_history: Vec<String>,
    steps_since_progress: usize,
    stagnation_limit: usize,
    evasion_ticks_remaining: usize,
    forced_evasion_action: Option<String>,
}

impl Default for LoopEvasionEngine {
    fn default() -> Self {
        Self::new(25)
    }
}

impl LoopEvasionEngine {
    pub fn new(stagnation_limit: usize) -> Self {
        Self {
            action_history: Vec::with_capacity(30),
            state_history: Vec::with_capacity(30),
            steps_since_progress: 0,
            stagnation_limit,
            evasion_ticks_remaining: 0,
            forced_evasion_action: None,
        }
    }

    /// Notify engine that meaningful progress occurred (resetting stagnation watchdog)
    pub fn notify_progress(&mut self) {
        self.steps_since_progress = 0;
        self.evasion_ticks_remaining = 0;
        self.forced_evasion_action = None;
    }

    /// Record a state transition and action, returning an evasive replacement action if loop is detected
    pub fn inspect_and_evade(
        &mut self,
        state_hash: &str,
        candidate_action: &str,
    ) -> Option<String> {
        self.steps_since_progress += 1;
        self.action_history.push(candidate_action.to_string());
        self.state_history.push(state_hash.to_string());

        if self.action_history.len() > 30 {
            self.action_history.remove(0);
        }
        if self.state_history.len() > 30 {
            self.state_history.remove(0);
        }

        // If currently in forced evasion mode, keep executing the escape action
        if self.evasion_ticks_remaining > 0 {
            self.evasion_ticks_remaining -= 1;
            return self.forced_evasion_action.clone();
        }

        // 1. Detect 2-step oscillation (e.g. UP <-> DOWN or LEFT <-> RIGHT)
        let len = self.action_history.len();
        let is_oscillating = if len >= 4 {
            self.action_history[len - 1] == self.action_history[len - 3]
                && self.action_history[len - 2] == self.action_history[len - 4]
                && self.action_history[len - 1] != self.action_history[len - 2]
        } else {
            false
        };

        // 2. Detect state stagnation (visiting same state 3 times recently)
        let state_visits = self
            .state_history
            .iter()
            .filter(|&s| s == state_hash)
            .count();
        let is_stagnant = state_visits >= 3 || self.steps_since_progress >= self.stagnation_limit;

        if is_oscillating || is_stagnant {
            // Pick an orthogonal diversion action
            let escape = match candidate_action {
                "UP" | "DOWN" => "RIGHT",
                "LEFT" | "RIGHT" => "UP",
                "ArrowUp" | "ArrowDown" => "ArrowRight",
                "ArrowLeft" | "ArrowRight" => "ArrowUp",
                _ => "AVOID_ESCAPE",
            };

            self.evasion_ticks_remaining = 3;
            self.forced_evasion_action = Some(escape.to_string());
            tracing::info!(
                "LoopEvasionEngine: Trapped in oscillation! Forcing escape maneuver: '{}' for 3 ticks",
                escape
            );
            return Some(escape.to_string());
        }

        None
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

    /// Consume a call quota unit. Fails if budget exceeded.
    pub fn consume(&mut self) -> Result<u32> {
        if self.current_calls >= self.max_calls_per_ticket {
            bail!(
                "LLM Budget Exceeded: Reached limit of {} oracle consultations for this task",
                self.max_calls_per_ticket
            );
        }
        self.current_calls += 1;
        Ok(self.current_calls)
    }

    pub fn consume_budget(&mut self) -> Result<u32> {
        self.consume()
    }

    pub fn current_calls(&self) -> u32 {
        self.current_calls
    }
}

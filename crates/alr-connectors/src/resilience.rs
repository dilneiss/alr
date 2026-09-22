use anyhow::{bail, Result};
use parking_lot::RwLock;
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

/// Circuit Breaker to isolate failing external systems and prevent cascading failure
#[derive(Clone)]
pub struct CircuitBreaker {
    state: Arc<RwLock<CircuitState>>,
    consecutive_failures: Arc<RwLock<u32>>,
    failure_threshold: u32,
    cooldown_duration: Duration,
    last_state_change: Arc<RwLock<Instant>>,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, cooldown_duration: Duration) -> Self {
        Self {
            state: Arc::new(RwLock::new(CircuitState::Closed)),
            consecutive_failures: Arc::new(RwLock::new(0)),
            failure_threshold,
            cooldown_duration,
            last_state_change: Arc::new(RwLock::new(Instant::now())),
        }
    }

    pub fn can_execute(&self) -> Result<()> {
        let mut state_guard = self.state.write();
        let last_change = *self.last_state_change.read();

        if *state_guard == CircuitState::Open {
            if last_change.elapsed() >= self.cooldown_duration {
                *state_guard = CircuitState::HalfOpen;
                *self.last_state_change.write() = Instant::now();
                return Ok(());
            } else {
                bail!("Circuit Breaker Active (State: OPEN): External system call blocked due to consecutive failures");
            }
        }

        Ok(())
    }

    pub fn record_result(&self, success: bool) {
        let mut failures = self.consecutive_failures.write();
        let mut state = self.state.write();

        if success {
            *failures = 0;
            if *state == CircuitState::HalfOpen {
                *state = CircuitState::Closed;
                *self.last_state_change.write() = Instant::now();
            }
        } else {
            *failures += 1;
            if *failures >= self.failure_threshold {
                *state = CircuitState::Open;
                *self.last_state_change.write() = Instant::now();
            }
        }
    }

    pub fn current_state(&self) -> CircuitState {
        *self.state.read()
    }
}

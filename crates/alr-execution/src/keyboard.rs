use alr_core::ActionType;
use anyhow::{bail, Result};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputAction {
    Direction(ActionType),
    Reset,
    Pause,
    Quit,
}

pub trait InputController: Send + Sync {
    fn press(&self, action: InputAction) -> Result<()>;
    fn last_action(&self) -> Option<InputAction>;
}

/// Safety guard wrapper enforcing action rate limiting, dry-run mode, and emergency stopping
pub struct SafeInputController<C: InputController> {
    inner: C,
    dry_run: bool,
    max_actions_per_second: u32,
    emergency_stop: Arc<AtomicBool>,
    last_press_time: parking_lot::Mutex<Instant>,
    action_count: AtomicU64,
}

impl<C: InputController> SafeInputController<C> {
    pub fn new(inner: C, dry_run: bool, max_actions_per_second: u32) -> Self {
        Self {
            inner,
            dry_run,
            max_actions_per_second: max_actions_per_second.max(1),
            emergency_stop: Arc::new(AtomicBool::new(false)),
            last_press_time: parking_lot::Mutex::new(Instant::now() - Duration::from_secs(1)),
            action_count: AtomicU64::new(0),
        }
    }

    pub fn emergency_stop_handle(&self) -> Arc<AtomicBool> {
        self.emergency_stop.clone()
    }

    pub fn trigger_emergency_stop(&self) {
        self.emergency_stop.store(true, Ordering::SeqCst);
    }

    pub fn is_stopped(&self) -> bool {
        self.emergency_stop.load(Ordering::SeqCst)
    }
}

impl<C: InputController> InputController for SafeInputController<C> {
    fn press(&self, action: InputAction) -> Result<()> {
        if self.emergency_stop.load(Ordering::SeqCst) {
            bail!("Emergency stop triggered! Input execution halted for safety.");
        }

        // Rate limiting
        let min_interval = Duration::from_micros((1_000_000 / self.max_actions_per_second) as u64);
        let mut last = self.last_press_time.lock();
        let elapsed = last.elapsed();
        if elapsed < min_interval {
            std::thread::sleep(min_interval - elapsed);
        }
        *last = Instant::now();

        self.action_count.fetch_add(1, Ordering::SeqCst);

        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeInputController simulated key press: {:?}",
                action
            );
            return Ok(());
        }

        self.inner.press(action)
    }

    fn last_action(&self) -> Option<InputAction> {
        self.inner.last_action()
    }
}

#[derive(Default)]
pub struct ChannelInputController {
    sender: Option<tokio::sync::mpsc::UnboundedSender<InputAction>>,
    last_act: parking_lot::Mutex<Option<InputAction>>,
}

impl ChannelInputController {
    pub fn new(sender: tokio::sync::mpsc::UnboundedSender<InputAction>) -> Self {
        Self {
            sender: Some(sender),
            last_act: parking_lot::Mutex::new(None),
        }
    }
}

impl InputController for ChannelInputController {
    fn press(&self, action: InputAction) -> Result<()> {
        *self.last_act.lock() = Some(action.clone());
        if let Some(ref tx) = self.sender {
            let _ = tx.send(action);
        }
        Ok(())
    }

    fn last_action(&self) -> Option<InputAction> {
        self.last_act.lock().clone()
    }
}

#[derive(Default)]
pub struct SimulatedKeyboardController {
    history: parking_lot::Mutex<Vec<InputAction>>,
}

impl InputController for SimulatedKeyboardController {
    fn press(&self, action: InputAction) -> Result<()> {
        self.history.lock().push(action);
        Ok(())
    }

    fn last_action(&self) -> Option<InputAction> {
        self.history.lock().last().cloned()
    }
}

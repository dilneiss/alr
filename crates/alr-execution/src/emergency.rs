use anyhow::{bail, Result};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// -----------------------------------------------------------------------------
// Global Atomic Emergency State & Audit Store
// -----------------------------------------------------------------------------

static GLOBAL_STOP_FLAG: AtomicBool = AtomicBool::new(false);
static GLOBAL_TRIGGER_COUNTER: AtomicU64 = AtomicU64::new(0);

// We use parking_lot::RwLock for synchronous safe audit logging
static AUDIT_LOG: RwLock<Vec<EmergencyAuditRecord>> = RwLock::new(Vec::new());
/// Reason indicating why the emergency stop was triggered
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum EmergencyStopReason {
    Manual(String),
    PanicKey(String),
    SignalFile(PathBuf),
    UserInputInterception(String),
    OutofDistribution(String),
    ScreenError(String),
}

impl std::fmt::Display for EmergencyStopReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Manual(msg) => write!(f, "Manual Emergency Trigger: {msg}"),
            Self::PanicKey(key) => write!(f, "Panic Key Pressed: {key}"),
            Self::SignalFile(path) => {
                write!(f, "Emergency Signal File Detected: {}", path.display())
            }
            Self::UserInputInterception(msg) => write!(f, "User Physical Input Override: {msg}"),
            Self::OutofDistribution(msg) => write!(f, "Out-Of-Distribution Extreme Novelty: {msg}"),
            Self::ScreenError(msg) => write!(f, "Screen Error / Crash Detected: {msg}"),
        }
    }
}

/// Immutable record capturing each emergency stop event for post-incident audit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyAuditRecord {
    pub id: u64,
    pub timestamp_unix_secs: u64,
    pub reason: EmergencyStopReason,
    pub message: String,
    pub caller_thread: String,
}

/// Global Emergency Stop controller providing atomic, zero-overhead safety checks
pub struct GlobalEmergencyStop;

impl GlobalEmergencyStop {
    /// Returns true if the global emergency stop has been activated
    #[inline]
    pub fn is_active() -> bool {
        GLOBAL_STOP_FLAG.load(Ordering::SeqCst)
    }

    /// Triggers the emergency stop with a generic text message
    pub fn trigger(reason: impl Into<String>) {
        Self::trigger_with_reason(EmergencyStopReason::Manual(reason.into()));
    }

    /// Triggers the emergency stop with a typed `EmergencyStopReason` and records an audit entry
    pub fn trigger_with_reason(reason: EmergencyStopReason) {
        GLOBAL_STOP_FLAG.store(true, Ordering::SeqCst);
        let id = GLOBAL_TRIGGER_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;

        let timestamp_unix_secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let caller_thread = thread::current()
            .name()
            .unwrap_or("unnamed-thread")
            .to_string();

        let message = reason.to_string();
        tracing::error!(
            emergency_id = id,
            reason = ?reason,
            thread = %caller_thread,
            "🚨 [GLOBAL_EMERGENCY_STOP] HALT! Physical and simulated execution blocked: {}",
            message
        );

        let record = EmergencyAuditRecord {
            id,
            timestamp_unix_secs,
            reason,
            message,
            caller_thread,
        };

        let mut log = AUDIT_LOG.write();
        log.push(record);
    }

    /// Resets the emergency stop flag and returns previous active state (used after human authorization)
    pub fn reset() -> bool {
        let previous = GLOBAL_STOP_FLAG.swap(false, Ordering::SeqCst);
        if previous {
            tracing::warn!("🛡️ [GLOBAL_EMERGENCY_STOP] System emergency stop manually reset.");
        }
        previous
    }

    /// Asserts that the system is not stopped; returns Err if emergency stop is active
    #[inline]
    pub fn assert_not_stopped() -> Result<()> {
        if Self::is_active() {
            let last_msg = Self::last_record()
                .map(|r| r.message)
                .unwrap_or_else(|| "Emergency stop is active".to_string());
            bail!("EMERGENCY STOP ACTIVE: {last_msg}");
        }
        Ok(())
    }

    /// Returns a copy of all audit records stored since process start
    pub fn audit_records() -> Vec<EmergencyAuditRecord> {
        AUDIT_LOG.read().clone()
    }

    /// Returns the most recent emergency audit record, if any
    pub fn last_record() -> Option<EmergencyAuditRecord> {
        AUDIT_LOG.read().last().cloned()
    }

    /// Clears the audit log (primarily for testing)
    pub fn clear_audit_log() {
        AUDIT_LOG.write().clear();
    }

    /// Checks if a signal file exists at `path`. If it exists, triggers emergency stop.
    pub fn check_signal_file(path: impl AsRef<Path>) -> bool {
        let p = path.as_ref();
        if p.exists() {
            Self::trigger_with_reason(EmergencyStopReason::SignalFile(p.to_path_buf()));
            true
        } else {
            false
        }
    }

    /// Creates a signal file to trigger emergency stop from disk
    pub fn create_signal_file(path: impl AsRef<Path>) -> Result<()> {
        let p = path.as_ref();
        std::fs::write(p, b"STOP\n")?;
        Self::check_signal_file(p);
        Ok(())
    }

    /// Removes a signal file
    pub fn remove_signal_file(path: impl AsRef<Path>) -> Result<()> {
        let p = path.as_ref();
        if p.exists() {
            std::fs::remove_file(p)?;
        }
        Ok(())
    }
}

// -----------------------------------------------------------------------------
// Windows Native Panic Key FFI (Zero-dependency user32)
// -----------------------------------------------------------------------------

#[cfg(target_os = "windows")]
mod win_panic_ffi {
    pub const VK_ESCAPE: i32 = 0x1B;
    pub const VK_PAUSE: i32 = 0x13;
    pub const VK_F12: i32 = 0x7B;

    #[link(name = "user32")]
    extern "system" {
        pub fn GetAsyncKeyState(vKey: i32) -> i16;
    }

    #[inline]
    pub fn is_key_pressed(v_key: i32) -> bool {
        unsafe { (GetAsyncKeyState(v_key) as u16 & 0x8000) != 0 }
    }
}

// -----------------------------------------------------------------------------
// Emergency Kill Switch Monitor
// -----------------------------------------------------------------------------

/// Configuration for the background Emergency Kill Switch monitor thread
#[derive(Debug, Clone)]
pub struct KillSwitchConfig {
    pub signal_file_path: PathBuf,
    pub poll_interval_ms: u64,
    pub watch_panic_keys: bool,
    pub mouse_override_threshold_px: i32,
}

impl Default for KillSwitchConfig {
    fn default() -> Self {
        Self {
            signal_file_path: PathBuf::from("stop.signal"),
            poll_interval_ms: 20,
            watch_panic_keys: true,
            mouse_override_threshold_px: 50,
        }
    }
}

/// Handle to a running background KillSwitch thread
pub struct KillSwitchHandle {
    running: Arc<AtomicBool>,
    thread_handle: Option<JoinHandle<()>>,
}

impl KillSwitchHandle {
    /// Stops the background monitor thread gracefully
    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(h) = self.thread_handle.take() {
            let _ = h.join();
        }
    }
}

impl Drop for KillSwitchHandle {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Active monitor that intercepts user input, watches panic keys and signal files
pub struct EmergencyKillSwitch;

impl EmergencyKillSwitch {
    /// Starts a dedicated background safety monitor thread
    pub fn start_monitor(config: KillSwitchConfig) -> KillSwitchHandle {
        let running = Arc::new(AtomicBool::new(true));
        let r_clone = running.clone();

        let thread_handle = thread::Builder::new()
            .name("alr-killswitch-monitor".to_string())
            .spawn(move || {
                tracing::info!("🛡️ [KILL_SWITCH] Emergency monitor active.");
                while r_clone.load(Ordering::SeqCst) {
                    // 1. Check signal file
                    if GlobalEmergencyStop::check_signal_file(&config.signal_file_path) {
                        break;
                    }

                    // 2. Check panic keys (Windows native)
                    #[cfg(target_os = "windows")]
                    if config.watch_panic_keys {
                        if win_panic_ffi::is_key_pressed(win_panic_ffi::VK_ESCAPE) {
                            GlobalEmergencyStop::trigger_with_reason(
                                EmergencyStopReason::PanicKey("Escape".to_string()),
                            );
                            break;
                        }
                        if win_panic_ffi::is_key_pressed(win_panic_ffi::VK_PAUSE) {
                            GlobalEmergencyStop::trigger_with_reason(
                                EmergencyStopReason::PanicKey("Pause/Break".to_string()),
                            );
                            break;
                        }
                        if win_panic_ffi::is_key_pressed(win_panic_ffi::VK_F12) {
                            GlobalEmergencyStop::trigger_with_reason(
                                EmergencyStopReason::PanicKey("F12".to_string()),
                            );
                            break;
                        }
                    }

                    thread::sleep(Duration::from_millis(config.poll_interval_ms));
                }
                tracing::info!("🛡️ [KILL_SWITCH] Emergency monitor exited.");
            })
            .expect("Failed to spawn killswitch thread");

        KillSwitchHandle {
            running,
            thread_handle: Some(thread_handle),
        }
    }

    /// Checks if a human physically moved the mouse beyond `threshold_px` from expected position
    pub fn check_mouse_override(
        expected: crate::mouse::MouseCoordinates,
        actual: crate::mouse::MouseCoordinates,
        threshold_px: i32,
    ) -> bool {
        let dx = (actual.x - expected.x).abs();
        let dy = (actual.y - expected.y).abs();
        let dist = ((dx * dx + dy * dy) as f64).sqrt();

        if dist > threshold_px as f64 {
            GlobalEmergencyStop::trigger_with_reason(EmergencyStopReason::UserInputInterception(
                format!(
                    "Physical mouse override: expected ({}, {}), actual ({}, {}), deviation {:.1}px > {}px threshold",
                    expected.x, expected.y, actual.x, actual.y, dist, threshold_px
                ),
            ));
            true
        } else {
            false
        }
    }
}

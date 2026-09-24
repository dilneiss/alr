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
        if crate::emergency::GlobalEmergencyStop::is_active()
            || self.emergency_stop.load(Ordering::SeqCst)
        {
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
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Simulated keyboard input halted for safety.");
        }
        self.history.lock().push(action);
        Ok(())
    }

    fn last_action(&self) -> Option<InputAction> {
        self.history.lock().last().cloned()
    }
}

// -----------------------------------------------------------------------------
// Windows Native Keyboard FFI (Zero-Dependency user32.dll bindings)
// -----------------------------------------------------------------------------
#[cfg(target_os = "windows")]
#[allow(dead_code)]
mod win_kbd_ffi {
    pub const KEYEVENTF_KEYUP: u32 = 0x0002;
    pub const VK_RETURN: u8 = 0x0D;
    pub const VK_SPACE: u8 = 0x20;
    pub const VK_TAB: u8 = 0x09;
    pub const VK_BACK: u8 = 0x08;
    pub const VK_LEFT: u8 = 0x25;
    pub const VK_UP: u8 = 0x26;
    pub const VK_RIGHT: u8 = 0x27;
    pub const VK_DOWN: u8 = 0x28;

    #[link(name = "user32")]
    extern "system" {
        pub fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
    }
}

/// Native Desktop Keyboard Controller simulating real hardware keystrokes on the active window
pub struct NativeDesktopKeyboardController {
    pub dry_run: bool,
    last_action: parking_lot::Mutex<Option<InputAction>>,
}

impl Default for NativeDesktopKeyboardController {
    fn default() -> Self {
        Self::new(false)
    }
}

impl NativeDesktopKeyboardController {
    pub fn new(dry_run: bool) -> Self {
        Self {
            dry_run,
            last_action: parking_lot::Mutex::new(None),
        }
    }

    /// Types alphanumeric text character-by-character into whatever desktop application is focused
    pub fn type_text(&self, text: &str) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Physical keyboard typing halted for safety.");
        }
        if self.dry_run {
            return Ok(());
        }
        #[cfg(target_os = "windows")]
        {
            for ch in text.chars() {
                let vk = match ch {
                    'a'..='z' => (ch as u8) - b'a' + 0x41,
                    'A'..='Z' => ch as u8,
                    '0'..='9' => ch as u8,
                    ' ' => win_kbd_ffi::VK_SPACE,
                    '\n' => win_kbd_ffi::VK_RETURN,
                    '\t' => win_kbd_ffi::VK_TAB,
                    _ => continue,
                };

                unsafe {
                    win_kbd_ffi::keybd_event(vk, 0, 0, 0);
                    std::thread::sleep(Duration::from_millis(15));
                    win_kbd_ffi::keybd_event(vk, 0, win_kbd_ffi::KEYEVENTF_KEYUP, 0);
                    std::thread::sleep(Duration::from_millis(10));
                }
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }
}

impl InputController for NativeDesktopKeyboardController {
    fn press(&self, action: InputAction) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Physical keyboard press halted for safety.");
        }
        *self.last_action.lock() = Some(action.clone());
        if self.dry_run {
            return Ok(());
        }
        #[cfg(target_os = "windows")]
        {
            let vk = match &action {
                InputAction::Direction(alr_core::ActionType::Up) => win_kbd_ffi::VK_UP,
                InputAction::Direction(alr_core::ActionType::Down) => win_kbd_ffi::VK_DOWN,
                InputAction::Direction(alr_core::ActionType::Left) => win_kbd_ffi::VK_LEFT,
                InputAction::Direction(alr_core::ActionType::Right) => win_kbd_ffi::VK_RIGHT,
                InputAction::Pause | InputAction::Reset => win_kbd_ffi::VK_SPACE,
                InputAction::Quit => 0x1B, // VK_ESCAPE
                _ => win_kbd_ffi::VK_RETURN,
            };

            unsafe {
                win_kbd_ffi::keybd_event(vk, 0, 0, 0);
                std::thread::sleep(Duration::from_millis(20));
                win_kbd_ffi::keybd_event(vk, 0, win_kbd_ffi::KEYEVENTF_KEYUP, 0);
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }

    fn last_action(&self) -> Option<InputAction> {
        self.last_action.lock().clone()
    }
}

use anyhow::{bail, Result};
use parking_lot::Mutex;
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
pub struct MouseCoordinates {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

/// Rich Mouse Controller interface for Desktop OS automation
pub trait MouseController: Send + Sync {
    fn get_position(&self) -> Result<MouseCoordinates>;
    fn move_to(&self, coords: MouseCoordinates) -> Result<()>;
    fn click(&self, coords: MouseCoordinates) -> Result<()>;
    fn right_click(&self, coords: MouseCoordinates) -> Result<()>;
    fn double_click(&self, coords: MouseCoordinates) -> Result<()>;
    fn drag(&self, from: MouseCoordinates, to: MouseCoordinates) -> Result<()>;
    fn scroll(&self, delta: i32) -> Result<()>;
}

// -----------------------------------------------------------------------------
// Windows Native API FFI (Zero-Dependency user32.dll bindings)
// -----------------------------------------------------------------------------
#[cfg(target_os = "windows")]
#[allow(dead_code)]
mod win_ffi {
    #[repr(C)]
    #[derive(Debug, Clone, Copy, Default)]
    pub struct Point {
        pub x: i32,
        pub y: i32,
    }

    pub const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    pub const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    pub const MOUSEEVENTF_RIGHTDOWN: u32 = 0x0008;
    pub const MOUSEEVENTF_RIGHTUP: u32 = 0x0010;
    pub const MOUSEEVENTF_MIDDLEDOWN: u32 = 0x0020;
    pub const MOUSEEVENTF_MIDDLEUP: u32 = 0x0040;
    pub const MOUSEEVENTF_WHEEL: u32 = 0x0800;

    #[link(name = "user32")]
    extern "system" {
        pub fn SetCursorPos(x: i32, y: i32) -> i32;
        pub fn GetCursorPos(lpPoint: *mut Point) -> i32;
        pub fn mouse_event(dwFlags: u32, dx: u32, dy: u32, dwData: u32, dwExtraInfo: usize);
    }
}

/// Native Desktop Mouse Controller capable of controlling the physical cursor and clicking windows
pub struct NativeDesktopMouseController {
    pub dry_run: bool,
    last_position: Mutex<MouseCoordinates>,
}

impl Default for NativeDesktopMouseController {
    fn default() -> Self {
        Self::new(false)
    }
}

impl NativeDesktopMouseController {
    pub fn new(dry_run: bool) -> Self {
        Self {
            dry_run,
            last_position: Mutex::new(MouseCoordinates { x: 0, y: 0 }),
        }
    }

    /// Smoothly moves cursor from current position to target coordinates over duration
    pub fn smooth_move(
        &self,
        target: MouseCoordinates,
        steps: usize,
        step_delay_ms: u64,
    ) -> Result<()> {
        let current = self.get_position()?;
        if self.dry_run {
            *self.last_position.lock() = target;
            return Ok(());
        }

        let dx = (target.x - current.x) as f32;
        let dy = (target.y - current.y) as f32;

        for step in 1..=steps {
            let progress = step as f32 / steps as f32;
            let intermediate = MouseCoordinates {
                x: (current.x as f32 + dx * progress).round() as i32,
                y: (current.y as f32 + dy * progress).round() as i32,
            };
            self.move_to(intermediate)?;
            thread::sleep(Duration::from_millis(step_delay_ms));
        }

        self.move_to(target)
    }
}

impl MouseController for NativeDesktopMouseController {
    fn get_position(&self) -> Result<MouseCoordinates> {
        #[cfg(target_os = "windows")]
        {
            if self.dry_run {
                return Ok(*self.last_position.lock());
            }
            let mut pt = win_ffi::Point::default();
            let ok = unsafe { win_ffi::GetCursorPos(&mut pt) };
            if ok != 0 {
                let coords = MouseCoordinates { x: pt.x, y: pt.y };
                *self.last_position.lock() = coords;
                Ok(coords)
            } else {
                bail!("Failed to get cursor position from Windows API");
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(*self.last_position.lock())
        }
    }

    fn move_to(&self, coords: MouseCoordinates) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Physical mouse movement blocked for safety.");
        }
        *self.last_position.lock() = coords;
        if self.dry_run {
            return Ok(());
        }

        #[cfg(target_os = "windows")]
        {
            let ok = unsafe { win_ffi::SetCursorPos(coords.x, coords.y) };
            if ok != 0 {
                Ok(())
            } else {
                bail!(
                    "Failed to move cursor to ({}, {}) via Windows API",
                    coords.x,
                    coords.y
                );
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }

    fn click(&self, coords: MouseCoordinates) -> Result<()> {
        self.move_to(coords)?;
        if self.dry_run {
            return Ok(());
        }

        #[cfg(target_os = "windows")]
        {
            unsafe {
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                thread::sleep(Duration::from_millis(15));
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }

    fn right_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.move_to(coords)?;
        if self.dry_run {
            return Ok(());
        }

        #[cfg(target_os = "windows")]
        {
            unsafe {
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                thread::sleep(Duration::from_millis(15));
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }

    fn double_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.click(coords)?;
        thread::sleep(Duration::from_millis(60));
        self.click(coords)
    }

    fn drag(&self, from: MouseCoordinates, to: MouseCoordinates) -> Result<()> {
        self.move_to(from)?;
        if self.dry_run {
            self.move_to(to)?;
            return Ok(());
        }

        #[cfg(target_os = "windows")]
        {
            unsafe {
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            }
            thread::sleep(Duration::from_millis(20));
            self.smooth_move(to, 10, 5)?;
            unsafe {
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            self.move_to(to)
        }
    }

    fn scroll(&self, delta: i32) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Physical mouse scroll blocked for safety.");
        }
        if self.dry_run {
            return Ok(());
        }
        #[cfg(target_os = "windows")]
        {
            unsafe {
                win_ffi::mouse_event(win_ffi::MOUSEEVENTF_WHEEL, 0, 0, (delta * 120) as u32, 0);
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }
}

/// Simulated Mouse Controller for automated unit tests
#[derive(Default)]
pub struct SimulatedMouseController {
    pub position: Mutex<MouseCoordinates>,
    pub click_history: Mutex<Vec<(MouseCoordinates, MouseButton)>>,
}

impl MouseController for SimulatedMouseController {
    fn get_position(&self) -> Result<MouseCoordinates> {
        Ok(*self.position.lock())
    }

    fn move_to(&self, coords: MouseCoordinates) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Simulated mouse action blocked for safety.");
        }
        *self.position.lock() = coords;
        Ok(())
    }

    fn click(&self, coords: MouseCoordinates) -> Result<()> {
        self.move_to(coords)?;
        self.click_history.lock().push((coords, MouseButton::Left));
        Ok(())
    }

    fn right_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.move_to(coords)?;
        self.click_history.lock().push((coords, MouseButton::Right));
        Ok(())
    }

    fn double_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.click(coords)?;
        self.click(coords)
    }

    fn drag(&self, from: MouseCoordinates, to: MouseCoordinates) -> Result<()> {
        self.move_to(from)?;
        self.move_to(to)
    }

    fn scroll(&self, _delta: i32) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Simulated mouse scroll blocked for safety.");
        }
        Ok(())
    }
}

/// Safety wrapper around any MouseController enforcing emergency stop, rate-limiting, and human override detection
pub struct SafeMouseController<M: MouseController> {
    inner: M,
    dry_run: bool,
    max_actions_per_second: u32,
    last_action_time: Mutex<std::time::Instant>,
    action_count: std::sync::atomic::AtomicU64,
}

impl<M: MouseController> SafeMouseController<M> {
    pub fn new(inner: M, dry_run: bool, max_actions_per_second: u32) -> Self {
        Self {
            inner,
            dry_run,
            max_actions_per_second: max_actions_per_second.max(1),
            last_action_time: Mutex::new(std::time::Instant::now() - Duration::from_secs(1)),
            action_count: std::sync::atomic::AtomicU64::new(0),
        }
    }

    fn check_safety(&self) -> Result<()> {
        if crate::emergency::GlobalEmergencyStop::is_active() {
            bail!("Emergency stop triggered! Mouse execution halted for safety.");
        }

        let min_interval = Duration::from_micros((1_000_000 / self.max_actions_per_second) as u64);
        let mut last = self.last_action_time.lock();
        let elapsed = last.elapsed();
        if elapsed < min_interval {
            std::thread::sleep(min_interval - elapsed);
        }
        *last = std::time::Instant::now();
        self.action_count
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        Ok(())
    }
}

impl<M: MouseController> MouseController for SafeMouseController<M> {
    fn get_position(&self) -> Result<MouseCoordinates> {
        self.inner.get_position()
    }

    fn move_to(&self, coords: MouseCoordinates) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeMouseController simulated move_to: {:?}",
                coords
            );
            return Ok(());
        }
        self.inner.move_to(coords)
    }

    fn click(&self, coords: MouseCoordinates) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeMouseController simulated click: {:?}",
                coords
            );
            return Ok(());
        }
        self.inner.click(coords)
    }

    fn right_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeMouseController simulated right_click: {:?}",
                coords
            );
            return Ok(());
        }
        self.inner.right_click(coords)
    }

    fn double_click(&self, coords: MouseCoordinates) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeMouseController simulated double_click: {:?}",
                coords
            );
            return Ok(());
        }
        self.inner.double_click(coords)
    }

    fn drag(&self, from: MouseCoordinates, to: MouseCoordinates) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!(
                "[DRY_RUN] SafeMouseController simulated drag: {:?} -> {:?}",
                from,
                to
            );
            return Ok(());
        }
        self.inner.drag(from, to)
    }

    fn scroll(&self, delta: i32) -> Result<()> {
        self.check_safety()?;
        if self.dry_run {
            tracing::info!("[DRY_RUN] SafeMouseController simulated scroll: {}", delta);
            return Ok(());
        }
        self.inner.scroll(delta)
    }
}

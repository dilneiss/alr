// Mouse controller abstraction for future GUI/desktop automation
use anyhow::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MouseCoordinates {
    pub x: i32,
    pub y: i32,
}

pub trait MouseController: Send + Sync {
    fn move_to(&self, coords: MouseCoordinates) -> Result<()>;
    fn click(&self, coords: MouseCoordinates) -> Result<()>;
}

#[derive(Default)]
pub struct SimulatedMouseController;

impl MouseController for SimulatedMouseController {
    fn move_to(&self, _coords: MouseCoordinates) -> Result<()> {
        Ok(())
    }

    fn click(&self, _coords: MouseCoordinates) -> Result<()> {
        Ok(())
    }
}

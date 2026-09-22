use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContinuousAction {
    pub movement: crate::Vec3,
    pub rotation: crate::Vec3,
    pub duration_secs: f32,
    pub interaction: Option<String>,
}

impl ContinuousAction {
    pub fn move_forward(speed: f32, duration: f32) -> Self {
        Self {
            movement: crate::Vec3::new(speed, 0.0, 0.0),
            rotation: crate::Vec3::ZERO,
            duration_secs: duration.clamp(0.05, 2.0),
            interaction: None,
        }
    }

    pub fn turn(yaw_rate: f32, duration: f32) -> Self {
        Self {
            movement: crate::Vec3::ZERO,
            rotation: crate::Vec3::new(0.0, yaw_rate, 0.0),
            duration_secs: duration.clamp(0.05, 2.0),
            interaction: None,
        }
    }

    pub fn stop() -> Self {
        Self {
            movement: crate::Vec3::ZERO,
            rotation: crate::Vec3::ZERO,
            duration_secs: 0.1,
            interaction: None,
        }
    }

    pub fn interact(action_name: &str) -> Self {
        Self {
            movement: crate::Vec3::ZERO,
            rotation: crate::Vec3::ZERO,
            duration_secs: 0.2,
            interaction: Some(action_name.to_string()),
        }
    }
}

use alr_world::{EntityType, Vec3, WorldState};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraState {
    pub position: Vec3,
    pub target: Vec3,
    pub fov_degrees: f32,
    pub viewport_width: u32,
    pub viewport_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualDetection {
    pub label: String,
    pub bounding_box: (f32, f32, f32, f32), // x, y, w, h normalized
    pub estimated_distance: f32,
    pub confidence: f32,
}

pub struct Visual3DPerception;

impl Visual3DPerception {
    /// Simulates visual feature extraction from camera/frame buffer
    pub fn perceive_from_visual(
        camera: &CameraState,
        detections: &[VisualDetection],
    ) -> WorldState {
        let mut world = WorldState::new(
            camera.position,
            Vec3::new(-20.0, 0.0, -20.0),
            Vec3::new(20.0, 10.0, 20.0),
        );

        for det in detections {
            let entity_type = match det.label.as_str() {
                "player" => EntityType::Player,
                "target" | "artifact" => EntityType::Target,
                "obstacle" | "wall" => EntityType::Obstacle,
                "hazard" => EntityType::Hazard,
                "resource" => EntityType::Resource,
                _ => EntityType::Obstacle,
            };

            // Estimate 3D position from camera position, viewing direction and estimated depth
            let forward = Vec3::new(
                camera.target.x - camera.position.x,
                0.0,
                camera.target.z - camera.position.z,
            )
            .normalize();

            let estimated_pos = Vec3::new(
                camera.position.x + forward.x * det.estimated_distance,
                0.0,
                camera.position.z + forward.z * det.estimated_distance,
            );

            world.entities.push(alr_world::EntityState {
                id: format!("vis_{}", det.label),
                entity_type,
                position: estimated_pos,
                rotation: alr_world::Quaternion::IDENTITY,
                velocity: Vec3::ZERO,
                visible: true,
                distance: det.estimated_distance,
                confidence: det.confidence,
            });
        }

        world
    }
}

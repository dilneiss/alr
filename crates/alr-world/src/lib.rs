pub mod action_3d;
pub mod lab_3d;
use serde::{Deserialize, Serialize};

pub use action_3d::ContinuousAction;
pub use lab_3d::{Alr3DLab, LabScenario};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const ZERO: Vec3 = Vec3 {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };
    pub const FORWARD: Vec3 = Vec3 {
        x: 1.0,
        y: 0.0,
        z: 0.0,
    };
    pub const UP: Vec3 = Vec3 {
        x: 0.0,
        y: 1.0,
        z: 0.0,
    };
    pub const RIGHT: Vec3 = Vec3 {
        x: 0.0,
        y: 0.0,
        z: 1.0,
    };

    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub fn distance(&self, other: &Vec3) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        (dx * dx + dy * dy + dz * dz).sqrt()
    }

    pub fn length(&self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    pub fn normalize(&self) -> Vec3 {
        let l = self.length();
        if l > 1e-6 {
            Vec3 {
                x: self.x / l,
                y: self.y / l,
                z: self.z / l,
            }
        } else {
            Vec3::ZERO
        }
    }

    pub fn dot(&self, other: &Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Quaternion {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

impl Quaternion {
    pub const IDENTITY: Quaternion = Quaternion {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        w: 1.0,
    };

    pub fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Self { x, y, z, w }
    }

    pub fn from_euler_yaw(yaw_radians: f32) -> Self {
        let half = yaw_radians * 0.5;
        Self {
            x: 0.0,
            y: half.sin(),
            z: 0.0,
            w: half.cos(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum EntityType {
    Player,
    Target,
    Enemy,
    Obstacle,
    Resource,
    Hazard,
    Door,
    Exit,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntityState {
    pub id: String,
    pub entity_type: EntityType,
    pub position: Vec3,
    pub rotation: Quaternion,
    pub velocity: Vec3,
    pub visible: bool,
    pub distance: f32,
    pub confidence: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ObjectiveState {
    pub id: String,
    pub goal_description: String,
    pub target_position: Vec3,
    pub priority: u32,
    pub deadline_steps: Option<u32>,
    pub completed: bool,
    pub failed: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ObstacleState {
    pub id: String,
    pub position: Vec3,
    pub size: Vec3,
    pub is_dynamic: bool,
    pub velocity: Vec3,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResourceState {
    pub id: String,
    pub resource_type: String,
    pub position: Vec3,
    pub collected: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AgentState {
    pub position: Vec3,
    pub rotation: Quaternion,
    pub velocity: Vec3,
    pub health: f32,
    pub energy: f32,
    pub inventory: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnvironmentState {
    pub room_id: String,
    pub light_level: f32,
    pub hazard_warning: bool,
    pub bounds_min: Vec3,
    pub bounds_max: Vec3,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WorldState {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub agent: AgentState,
    pub entities: Vec<EntityState>,
    pub objectives: Vec<ObjectiveState>,
    pub obstacles: Vec<ObstacleState>,
    pub resources: Vec<ResourceState>,
    pub environment: EnvironmentState,
}

impl WorldState {
    pub fn new(agent_pos: Vec3, bounds_min: Vec3, bounds_max: Vec3) -> Self {
        Self {
            timestamp: chrono::Utc::now(),
            agent: AgentState {
                position: agent_pos,
                rotation: Quaternion::IDENTITY,
                velocity: Vec3::ZERO,
                health: 100.0,
                energy: 100.0,
                inventory: Vec::new(),
            },
            entities: Vec::new(),
            objectives: Vec::new(),
            obstacles: Vec::new(),
            resources: Vec::new(),
            environment: EnvironmentState {
                room_id: "room_main".to_string(),
                light_level: 1.0,
                hazard_warning: false,
                bounds_min,
                bounds_max,
            },
        }
    }

    pub fn to_feature_vector(&self) -> Vec<f32> {
        let mut feats = Vec::with_capacity(12);
        // Agent pos
        feats.push(self.agent.position.x);
        feats.push(self.agent.position.y);
        feats.push(self.agent.position.z);

        // Nearest target relative vector
        if let Some(target) = self
            .entities
            .iter()
            .find(|e| e.entity_type == EntityType::Target)
        {
            feats.push(target.position.x - self.agent.position.x);
            feats.push(target.position.y - self.agent.position.y);
            feats.push(target.position.z - self.agent.position.z);
        } else {
            feats.push(0.0);
            feats.push(0.0);
            feats.push(0.0);
        }

        // Nearest obstacle distances in 4 directions
        let d_front = self
            .obstacles
            .iter()
            .map(|o| self.agent.position.distance(&o.position))
            .fold(10.0f32, f32::min);
        feats.push(d_front);
        feats.push(10.0); // back
        feats.push(10.0); // left
        feats.push(10.0); // right

        // Velocity
        feats.push(self.agent.velocity.length());
        feats.push(0.0); // angular velocity

        feats
    }
}

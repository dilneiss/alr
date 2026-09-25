pub mod real_3d;
pub use real_3d::{ExternalGameAdapter, Real3DRenderedLab};
pub mod trading_env;
pub use trading_env::TradingEnvironment;

use alr_world::{ContinuousAction, Vec3, WorldState};
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ActionSpace {
    Discrete(Vec<String>),
    Continuous { min_speed: f32, max_speed: f32 },
    Mixed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ObservationSpace {
    VisualOnly,
    StructuredOracle,
    Multimodal,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnvironmentConstraint {
    pub name: String,
    pub max_action_rate: f32,
    pub forbids_reversal: bool,
    pub safety_perimeter: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnvironmentDescription {
    pub environment_id: String,
    pub name: String,
    pub capabilities: Vec<String>,
    pub action_space: ActionSpace,
    pub observation_space: ObservationSpace,
    pub constraints: Vec<EnvironmentConstraint>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnvironmentSignature {
    pub environment_id: String,
    pub action_space_kind: String,
    pub observation_space_kind: String,
    pub physics_fidelity: f32,
    pub capability_tags: Vec<String>,
}

impl EnvironmentSignature {
    pub fn compute_similarity(&self, other: &EnvironmentSignature) -> f32 {
        let mut sim = 0.0;
        if self.action_space_kind == other.action_space_kind {
            sim += 0.35;
        }
        if self.observation_space_kind == other.observation_space_kind {
            sim += 0.25;
        }
        let matching_caps = self
            .capability_tags
            .iter()
            .filter(|c| other.capability_tags.contains(c))
            .count();
        let cap_sim = if !self.capability_tags.is_empty() {
            (matching_caps as f32 / self.capability_tags.len() as f32) * 0.40
        } else {
            0.0
        };
        sim + cap_sim
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RelativeDirection {
    North,
    NorthEast,
    East,
    SouthEast,
    South,
    SouthWest,
    West,
    NorthWest,
    Center,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DistanceCategory {
    Immediate, // < 1.5m
    Near,      // 1.5 - 5m
    Medium,    // 5 - 15m
    Far,       // > 15m
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AbstractState {
    pub target_relative_direction: RelativeDirection,
    pub target_distance_category: DistanceCategory,
    pub obstacle_front: bool,
    pub obstacle_left: bool,
    pub obstacle_right: bool,
    pub inventory_has_target: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AbstractAction {
    Approach,
    Avoid,
    Search,
    Collect,
    Interact(String),
    Retreat,
    Navigate(RelativeDirection),
    Inspect,
    Wait,
}

pub struct GroundingLayer;

impl GroundingLayer {
    /// Translates raw WorldState into domain-invariant AbstractState
    pub fn to_abstract_state(world: &WorldState) -> AbstractState {
        let agent_pos = &world.agent.position;
        let target = world
            .entities
            .iter()
            .find(|e| e.entity_type == alr_world::EntityType::Target);

        let (rel_dir, dist_cat) = if let Some(t) = target {
            let dx = t.position.x - agent_pos.x;
            let dz = t.position.z - agent_pos.z;
            let dist = agent_pos.distance(&t.position);

            let cat = if dist < 1.5 {
                DistanceCategory::Immediate
            } else if dist < 5.0 {
                DistanceCategory::Near
            } else if dist < 15.0 {
                DistanceCategory::Medium
            } else {
                DistanceCategory::Far
            };

            let dir = if dx.abs() < 0.5 && dz.abs() < 0.5 {
                RelativeDirection::Center
            } else if dx > 0.0 && dz > 0.0 {
                RelativeDirection::NorthEast
            } else if dx > 0.0 && dz < 0.0 {
                RelativeDirection::NorthWest
            } else if dx > 0.0 {
                RelativeDirection::North
            } else if dz > 0.0 {
                RelativeDirection::East
            } else {
                RelativeDirection::West
            };

            (dir, cat)
        } else {
            (RelativeDirection::Center, DistanceCategory::Far)
        };

        let obs_front = world
            .obstacles
            .iter()
            .any(|o| agent_pos.distance(&o.position) < 2.0 && o.position.x > agent_pos.x);
        let obs_left = world
            .obstacles
            .iter()
            .any(|o| agent_pos.distance(&o.position) < 2.0 && o.position.z < agent_pos.z);
        let obs_right = world
            .obstacles
            .iter()
            .any(|o| agent_pos.distance(&o.position) < 2.0 && o.position.z > agent_pos.z);

        AbstractState {
            target_relative_direction: rel_dir,
            target_distance_category: dist_cat,
            obstacle_front: obs_front,
            obstacle_left: obs_left,
            obstacle_right: obs_right,
            inventory_has_target: !world.agent.inventory.is_empty(),
        }
    }

    /// Grounds AbstractAction into ContinuousAction for 3D physics environments
    pub fn ground_continuous(action: &AbstractAction) -> ContinuousAction {
        match action {
            AbstractAction::Approach => ContinuousAction::move_forward(2.0, 0.5),
            AbstractAction::Avoid => ContinuousAction::turn(0.785, 0.4),
            AbstractAction::Search => ContinuousAction::turn(1.57, 0.5),
            AbstractAction::Collect | AbstractAction::Interact(_) => {
                ContinuousAction::interact("collect_artifact")
            }
            AbstractAction::Retreat => ContinuousAction {
                movement: Vec3::new(-1.5, 0.0, 0.0),
                rotation: Vec3::ZERO,
                duration_secs: 0.5,
                interaction: None,
            },
            AbstractAction::Navigate(dir) => match dir {
                RelativeDirection::North => ContinuousAction::move_forward(2.5, 0.5),
                RelativeDirection::East => ContinuousAction {
                    movement: Vec3::new(0.0, 0.0, 2.5),
                    rotation: Vec3::ZERO,
                    duration_secs: 0.5,
                    interaction: None,
                },
                RelativeDirection::West => ContinuousAction {
                    movement: Vec3::new(0.0, 0.0, -2.5),
                    rotation: Vec3::ZERO,
                    duration_secs: 0.5,
                    interaction: None,
                },
                _ => ContinuousAction::move_forward(1.5, 0.5),
            },
            AbstractAction::Inspect | AbstractAction::Wait => ContinuousAction::stop(),
        }
    }
}

#[async_trait]
pub trait EnvironmentAdapter: Send + Sync {
    fn description(&self) -> EnvironmentDescription;
    fn signature(&self) -> EnvironmentSignature;
    async fn reset(&mut self, seed: u64) -> Result<AbstractState>;
    async fn observe(&self) -> Result<AbstractState>;
    async fn act(&mut self, action: AbstractAction) -> Result<f32>;
    fn is_terminal(&self) -> bool;
}

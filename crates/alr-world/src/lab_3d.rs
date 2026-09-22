use crate::{
    ContinuousAction, EntityState, EntityType, ObstacleState, Quaternion, ResourceState, Vec3,
    WorldState,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum LabScenario {
    Navigation,
    TargetAcquisition,
    ObstacleAvoidance,
    ResourceCollection,
    MultiStepObjective,
    DynamicObstacle,
    UnknownMap,
}

pub struct Alr3DLab {
    pub world: WorldState,
    pub scenario: LabScenario,
    pub step_count: u32,
    pub max_steps: u32,
    pub terminal: bool,
    pub score: f32,
}

impl Alr3DLab {
    pub fn new(scenario: LabScenario) -> Self {
        let bounds_min = Vec3::new(-20.0, 0.0, -20.0);
        let bounds_max = Vec3::new(20.0, 10.0, 20.0);
        let agent_pos = Vec3::new(0.0, 0.0, 0.0);

        let mut world = WorldState::new(agent_pos, bounds_min, bounds_max);

        // Setup scenario entities & obstacles
        match scenario {
            LabScenario::Navigation => {
                world.entities.push(EntityState {
                    id: "target_goal".to_string(),
                    entity_type: EntityType::Target,
                    position: Vec3::new(10.0, 0.0, 10.0),
                    rotation: Quaternion::IDENTITY,
                    velocity: Vec3::ZERO,
                    visible: true,
                    distance: 14.14,
                    confidence: 0.95,
                });
            }
            LabScenario::TargetAcquisition | LabScenario::MultiStepObjective => {
                world.entities.push(EntityState {
                    id: "blue_artifact".to_string(),
                    entity_type: EntityType::Target,
                    position: Vec3::new(6.0, 0.0, 6.0),
                    rotation: Quaternion::IDENTITY,
                    velocity: Vec3::ZERO,
                    visible: true,
                    distance: 8.48,
                    confidence: 0.98,
                });
            }
            LabScenario::ObstacleAvoidance => {
                world.entities.push(EntityState {
                    id: "target_goal".to_string(),
                    entity_type: EntityType::Target,
                    position: Vec3::new(10.0, 0.0, 0.0),
                    rotation: Quaternion::IDENTITY,
                    velocity: Vec3::ZERO,
                    visible: true,
                    distance: 10.0,
                    confidence: 0.95,
                });
                world.obstacles.push(ObstacleState {
                    id: "wall_mid".to_string(),
                    position: Vec3::new(5.0, 0.0, 0.0),
                    size: Vec3::new(1.0, 2.0, 6.0),
                    is_dynamic: false,
                    velocity: Vec3::ZERO,
                });
            }
            LabScenario::DynamicObstacle => {
                world.entities.push(EntityState {
                    id: "target_goal".to_string(),
                    entity_type: EntityType::Target,
                    position: Vec3::new(12.0, 0.0, 0.0),
                    rotation: Quaternion::IDENTITY,
                    velocity: Vec3::ZERO,
                    visible: true,
                    distance: 12.0,
                    confidence: 0.95,
                });
                world.obstacles.push(ObstacleState {
                    id: "moving_drone".to_string(),
                    position: Vec3::new(6.0, 0.0, 0.0),
                    size: Vec3::new(1.0, 1.0, 1.0),
                    is_dynamic: true,
                    velocity: Vec3::new(0.0, 0.0, 1.0),
                });
            }
            LabScenario::ResourceCollection => {
                for i in 1..=3 {
                    world.resources.push(ResourceState {
                        id: format!("crystal_{}", i),
                        resource_type: "crystal".to_string(),
                        position: Vec3::new(3.0 * i as f32, 0.0, 2.0 * i as f32),
                        collected: false,
                    });
                }
            }
            LabScenario::UnknownMap => {
                world.entities.push(EntityState {
                    id: "unknown_relic".to_string(),
                    entity_type: EntityType::Target,
                    position: Vec3::new(15.0, 0.0, 15.0),
                    rotation: Quaternion::IDENTITY,
                    velocity: Vec3::ZERO,
                    visible: false, // Partial observability!
                    distance: 21.2,
                    confidence: 0.30,
                });
            }
        }

        Self {
            world,
            scenario,
            step_count: 0,
            max_steps: 200,
            terminal: false,
            score: 0.0,
        }
    }

    pub fn step(&mut self, action: ContinuousAction) -> Result<f32> {
        if self.terminal {
            return Ok(0.0);
        }

        self.step_count += 1;
        let mut step_reward = -0.1; // Small time penalty

        // Update agent position based on continuous action
        self.world.agent.position.x += action.movement.x * action.duration_secs;
        self.world.agent.position.z += action.movement.z * action.duration_secs;

        // Move dynamic obstacles
        for obs in &mut self.world.obstacles {
            if obs.is_dynamic {
                obs.position.z += obs.velocity.z * action.duration_secs;
                if obs.position.z > 8.0 || obs.position.z < -8.0 {
                    obs.velocity.z = -obs.velocity.z; // Bounce
                }
            }
        }

        // Check collision
        for obs in &self.world.obstacles {
            if self.world.agent.position.distance(&obs.position) < 0.8 {
                step_reward -= 50.0;
                self.terminal = true;
                self.score += step_reward;
                return Ok(step_reward);
            }
        }

        // Check target distance & acquisition
        if let Some(target) = self
            .world
            .entities
            .iter()
            .find(|e| e.entity_type == EntityType::Target)
        {
            let dist = self.world.agent.position.distance(&target.position);
            if dist < 1.0 {
                if let Some(ref act) = action.interaction {
                    if act == "collect_artifact" {
                        self.world.agent.inventory.push("blue_artifact".to_string());
                        step_reward += 100.0;
                        self.terminal = true;
                    }
                } else if self.scenario == LabScenario::Navigation
                    || self.scenario == LabScenario::ObstacleAvoidance
                {
                    step_reward += 100.0;
                    self.terminal = true;
                }
            }
        }

        if self.step_count >= self.max_steps {
            self.terminal = true;
        }

        self.score += step_reward;
        Ok(step_reward)
    }
}

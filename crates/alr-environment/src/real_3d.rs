use crate::{
    AbstractAction, AbstractState, ActionSpace, EnvironmentAdapter, EnvironmentConstraint,
    EnvironmentDescription, EnvironmentSignature, GroundingLayer, ObservationSpace,
};
use alr_world::{Alr3DLab, LabScenario};
use anyhow::Result;
use async_trait::async_trait;

pub struct Real3DRenderedLab {
    pub lab: Alr3DLab,
    pub environment_id: String,
    pub camera_angle: f32,
    pub lighting_intensity: f32,
}

impl Real3DRenderedLab {
    pub fn new(env_id: &str, scenario: LabScenario) -> Self {
        Self {
            lab: Alr3DLab::new(scenario),
            environment_id: env_id.to_string(),
            camera_angle: 45.0,
            lighting_intensity: 1.0,
        }
    }
}

#[async_trait]
impl EnvironmentAdapter for Real3DRenderedLab {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: self.environment_id.clone(),
            name: format!("Real3D Rendered Lab - {}", self.environment_id),
            capabilities: vec![
                "navigate".to_string(),
                "avoid".to_string(),
                "collect".to_string(),
                "inspect".to_string(),
            ],
            action_space: ActionSpace::Continuous {
                min_speed: 0.1,
                max_speed: 5.0,
            },
            observation_space: ObservationSpace::VisualOnly,
            constraints: vec![EnvironmentConstraint {
                name: "collision_boundary".to_string(),
                max_action_rate: 20.0,
                forbids_reversal: false,
                safety_perimeter: 1.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: self.environment_id.clone(),
            action_space_kind: "Continuous3D".to_string(),
            observation_space_kind: "RenderedVisual".to_string(),
            physics_fidelity: 0.95,
            capability_tags: vec![
                "navigate".to_string(),
                "avoid".to_string(),
                "collect".to_string(),
            ],
        }
    }

    async fn reset(&mut self, _seed: u64) -> Result<AbstractState> {
        self.lab = Alr3DLab::new(self.lab.scenario);
        Ok(GroundingLayer::to_abstract_state(&self.lab.world))
    }

    async fn observe(&self) -> Result<AbstractState> {
        Ok(GroundingLayer::to_abstract_state(&self.lab.world))
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let continuous = GroundingLayer::ground_continuous(&action);
        self.lab.step(continuous)
    }

    fn is_terminal(&self) -> bool {
        self.lab.terminal
    }
}

pub struct ExternalGameAdapter {
    pub game_id: String,
    pub connected: bool,
    pub score: f32,
    pub terminal: bool,
}

impl ExternalGameAdapter {
    pub fn new(game_id: &str) -> Self {
        Self {
            game_id: game_id.to_string(),
            connected: true,
            score: 0.0,
            terminal: false,
        }
    }
}

#[async_trait]
impl EnvironmentAdapter for ExternalGameAdapter {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: self.game_id.clone(),
            name: format!("External 3D Game - {}", self.game_id),
            capabilities: vec!["navigate".to_string(), "interact".to_string()],
            action_space: ActionSpace::Continuous {
                min_speed: 0.5,
                max_speed: 4.0,
            },
            observation_space: ObservationSpace::VisualOnly,
            constraints: vec![EnvironmentConstraint {
                name: "human_control_rate".to_string(),
                max_action_rate: 10.0,
                forbids_reversal: false,
                safety_perimeter: 1.2,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: self.game_id.clone(),
            action_space_kind: "Continuous3D".to_string(),
            observation_space_kind: "VisualOnly".to_string(),
            physics_fidelity: 0.90,
            capability_tags: vec!["navigate".to_string(), "interact".to_string()],
        }
    }

    async fn reset(&mut self, _seed: u64) -> Result<AbstractState> {
        self.score = 0.0;
        self.terminal = false;
        Ok(AbstractState {
            target_relative_direction: crate::RelativeDirection::North,
            target_distance_category: crate::DistanceCategory::Near,
            obstacle_front: false,
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: false,
        })
    }

    async fn observe(&self) -> Result<AbstractState> {
        Ok(AbstractState {
            target_relative_direction: crate::RelativeDirection::North,
            target_distance_category: crate::DistanceCategory::Immediate,
            obstacle_front: false,
            obstacle_left: false,
            obstacle_right: false,
            inventory_has_target: true,
        })
    }

    async fn act(&mut self, _action: AbstractAction) -> Result<f32> {
        self.score += 10.0;
        self.terminal = true;
        Ok(10.0)
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

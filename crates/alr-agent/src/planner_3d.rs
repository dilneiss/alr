use alr_spatial::AStarNavigator;
use alr_world::{ContinuousAction, EntityType, Vec3, WorldState};
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SubGoalKind {
    LocateTarget,
    FindSafeRoute,
    NavigateTo(Vec3),
    AvoidObstacle(Vec3),
    ApproachTarget(Vec3),
    Interact(String),
    VerifyAcquisition(String),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SubGoal {
    pub id: String,
    pub kind: SubGoalKind,
    pub description: String,
    pub completed: bool,
    pub failed: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HighLevelPlan {
    pub goal: String,
    pub subgoals: Vec<SubGoal>,
    pub current_index: usize,
    pub completed: bool,
}

impl HighLevelPlan {
    pub fn current_subgoal(&self) -> Option<&SubGoal> {
        if self.current_index < self.subgoals.len() {
            Some(&self.subgoals[self.current_index])
        } else {
            None
        }
    }

    pub fn advance(&mut self) {
        if self.current_index < self.subgoals.len() {
            self.subgoals[self.current_index].completed = true;
            self.current_index += 1;
            if self.current_index >= self.subgoals.len() {
                self.completed = true;
            }
        }
    }
}

pub struct HierarchicalPlanner;

impl HierarchicalPlanner {
    pub fn decompose_goal(goal: &str, world: &WorldState) -> Result<HighLevelPlan> {
        // Safe decomposition of 3D embodied goals
        let target_pos = if let Some(target) = world
            .entities
            .iter()
            .find(|e| e.entity_type == EntityType::Target)
        {
            target.position
        } else {
            Vec3::new(5.0, 0.0, 5.0)
        };

        let subgoals = vec![
            SubGoal {
                id: "sg_1".to_string(),
                kind: SubGoalKind::LocateTarget,
                description: "Locate blue artifact in visual field".to_string(),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_2".to_string(),
                kind: SubGoalKind::FindSafeRoute,
                description: "Compute collision-free A* trajectory".to_string(),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_3".to_string(),
                kind: SubGoalKind::NavigateTo(target_pos),
                description: format!(
                    "Traverse waypoints towards ({:.1}, {:.1})",
                    target_pos.x, target_pos.z
                ),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_4".to_string(),
                kind: SubGoalKind::AvoidObstacle(Vec3::ZERO),
                description: "Check for dynamic collision risks".to_string(),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_5".to_string(),
                kind: SubGoalKind::ApproachTarget(target_pos),
                description: "Approach within interaction radius (< 1.2m)".to_string(),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_6".to_string(),
                kind: SubGoalKind::Interact("collect_artifact".to_string()),
                description: "Execute acquisition interaction".to_string(),
                completed: false,
                failed: false,
            },
            SubGoal {
                id: "sg_7".to_string(),
                kind: SubGoalKind::VerifyAcquisition("blue_artifact".to_string()),
                description: "Verify artifact presence in inventory".to_string(),
                completed: false,
                failed: false,
            },
        ];

        Ok(HighLevelPlan {
            goal: goal.to_string(),
            subgoals,
            current_index: 0,
            completed: false,
        })
    }

    pub fn verify_subgoal(subgoal: &SubGoal, world: &WorldState) -> bool {
        match &subgoal.kind {
            SubGoalKind::LocateTarget => world
                .entities
                .iter()
                .any(|e| e.entity_type == EntityType::Target && e.visible),
            SubGoalKind::FindSafeRoute => true,
            SubGoalKind::NavigateTo(pos) => world.agent.position.distance(pos) < 2.0,
            SubGoalKind::AvoidObstacle(_) => !world
                .obstacles
                .iter()
                .any(|o| world.agent.position.distance(&o.position) < 0.8),
            SubGoalKind::ApproachTarget(pos) => world.agent.position.distance(pos) < 1.2,
            SubGoalKind::Interact(_) => true,
            SubGoalKind::VerifyAcquisition(item_name) => world.agent.inventory.contains(item_name),
        }
    }
}

pub struct Recovery3DStrategy;

impl Recovery3DStrategy {
    pub fn recover_from_stuck(_current_pos: &Vec3, _world: &WorldState) -> ContinuousAction {
        // Back up slightly and rotate 45 degrees
        ContinuousAction::turn(0.785, 0.4)
    }

    pub fn replan_after_obstacle(
        agent_pos: Vec3,
        goal_pos: Vec3,
        world: &WorldState,
    ) -> Result<Vec<Vec3>> {
        let obs_positions: Vec<Vec3> = world.obstacles.iter().map(|o| o.position).collect();
        AStarNavigator::plan_path(
            agent_pos,
            goal_pos,
            &obs_positions,
            world.environment.bounds_min,
            world.environment.bounds_max,
        )
    }
}

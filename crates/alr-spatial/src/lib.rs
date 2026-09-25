pub mod city_routing;
pub use city_routing::*;

use alr_world::{Vec3, WorldState};
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::{BinaryHeap, HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Landmark {
    pub id: String,
    pub name: String,
    pub position: Vec3,
    pub semantic_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialRoute {
    pub id: String,
    pub from: String,
    pub to: String,
    pub waypoints: Vec<Vec3>,
    pub cost: f32,
    pub success_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialMemory {
    pub landmarks: HashMap<String, Landmark>,
    pub known_routes: Vec<SpatialRoute>,
    pub hazards: Vec<Vec3>,
    pub visited_points: HashSet<String>,
}

impl Default for SpatialMemory {
    fn default() -> Self {
        Self::new()
    }
}

impl SpatialMemory {
    pub fn new() -> Self {
        Self {
            landmarks: HashMap::new(),
            known_routes: Vec::new(),
            hazards: Vec::new(),
            visited_points: HashSet::new(),
        }
    }

    pub fn add_landmark(&mut self, id: &str, name: &str, pos: Vec3, label: &str) {
        self.landmarks.insert(
            id.to_string(),
            Landmark {
                id: id.to_string(),
                name: name.to_string(),
                position: pos,
                semantic_label: label.to_string(),
            },
        );
    }

    pub fn record_visited(&mut self, pos: &Vec3) {
        let key = format!("{:.1}_{:.1}_{:.1}", pos.x, pos.y, pos.z);
        self.visited_points.insert(key);
    }

    pub fn record_hazard(&mut self, pos: Vec3) {
        self.hazards.push(pos);
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NodeWrapper {
    cost: u32,
    pos: (i32, i32),
}

impl Ord for NodeWrapper {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other.cost.cmp(&self.cost)
    }
}

impl PartialOrd for NodeWrapper {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

pub struct AStarNavigator;

impl AStarNavigator {
    /// Deterministic A* path planning on a 2D grid slice of the 3D space
    pub fn plan_path(
        start: Vec3,
        goal: Vec3,
        obstacles: &[Vec3],
        bounds_min: Vec3,
        bounds_max: Vec3,
    ) -> Result<Vec<Vec3>> {
        let to_grid = |v: &Vec3| -> (i32, i32) { (v.x.round() as i32, v.z.round() as i32) };
        let to_world = |g: (i32, i32)| -> Vec3 { Vec3::new(g.0 as f32, start.y, g.1 as f32) };

        let start_g = to_grid(&start);
        let goal_g = to_grid(&goal);

        let mut obstacle_set: HashSet<(i32, i32)> = HashSet::new();
        for obs in obstacles {
            obstacle_set.insert(to_grid(obs));
        }

        let mut open_set = BinaryHeap::new();
        open_set.push(NodeWrapper {
            cost: 0,
            pos: start_g,
        });

        let mut came_from: HashMap<(i32, i32), (i32, i32)> = HashMap::new();
        let mut g_score: HashMap<(i32, i32), u32> = HashMap::new();
        g_score.insert(start_g, 0);

        let dist_heuristic = |a: (i32, i32), b: (i32, i32)| -> u32 {
            ((a.0 - b.0).abs() + (a.1 - b.1).abs()) as u32
        };

        let mut iterations = 0;
        while let Some(NodeWrapper { pos, .. }) = open_set.pop() {
            iterations += 1;
            if iterations > 5000 {
                break;
            }

            if pos == goal_g {
                let mut path = vec![to_world(pos)];
                let mut curr = pos;
                while let Some(&prev) = came_from.get(&curr) {
                    path.push(to_world(prev));
                    curr = prev;
                }
                path.reverse();
                return Ok(path);
            }

            let neighbors = [
                (pos.0 + 1, pos.1),
                (pos.0 - 1, pos.1),
                (pos.0, pos.1 + 1),
                (pos.0, pos.1 - 1),
            ];

            for n in neighbors {
                if obstacle_set.contains(&n) {
                    continue;
                }
                if (n.0 as f32) < bounds_min.x
                    || (n.0 as f32) > bounds_max.x
                    || (n.1 as f32) < bounds_min.z
                    || (n.1 as f32) > bounds_max.z
                {
                    continue;
                }

                let tentative_g = g_score.get(&pos).unwrap_or(&u32::MAX) + 1;
                if tentative_g < *g_score.get(&n).unwrap_or(&u32::MAX) {
                    came_from.insert(n, pos);
                    g_score.insert(n, tentative_g);
                    let f_score = tentative_g + dist_heuristic(n, goal_g);
                    open_set.push(NodeWrapper {
                        cost: f_score,
                        pos: n,
                    });
                }
            }
        }

        bail!("A* Navigator: Path could not be found to goal position")
    }
}

pub struct CollisionPredictor;

impl CollisionPredictor {
    pub fn predict_collision(
        agent_pos: &Vec3,
        agent_vel: &Vec3,
        obstacles: &[alr_world::ObstacleState],
        time_horizon_secs: f32,
    ) -> bool {
        let predicted_agent_pos = Vec3::new(
            agent_pos.x + agent_vel.x * time_horizon_secs,
            agent_pos.y,
            agent_pos.z + agent_vel.z * time_horizon_secs,
        );

        for obs in obstacles {
            let predicted_obs_pos = if obs.is_dynamic {
                Vec3::new(
                    obs.position.x + obs.velocity.x * time_horizon_secs,
                    obs.position.y,
                    obs.position.z + obs.velocity.z * time_horizon_secs,
                )
            } else {
                obs.position
            };

            if predicted_agent_pos.distance(&predicted_obs_pos) < 1.0 {
                return true;
            }
        }

        false
    }
}

pub struct StuckDetector {
    positions: Vec<Vec3>,
    stuck_threshold: f32,
    window_size: usize,
}

impl StuckDetector {
    pub fn new(window_size: usize, stuck_threshold: f32) -> Self {
        Self {
            positions: Vec::with_capacity(window_size),
            stuck_threshold,
            window_size,
        }
    }

    pub fn record_position(&mut self, pos: Vec3) -> bool {
        self.positions.push(pos);
        if self.positions.len() > self.window_size {
            self.positions.remove(0);
        }

        if self.positions.len() < self.window_size {
            return false;
        }

        let first = self.positions[0];
        let max_delta = self
            .positions
            .iter()
            .map(|p| first.distance(p))
            .fold(0.0f32, f32::max);

        max_delta < self.stuck_threshold
    }

    pub fn reset(&mut self) {
        self.positions.clear();
    }
}

pub struct DynamicReplanning;

impl DynamicReplanning {
    pub fn is_replan_required(current_path: &[Vec3], world: &WorldState) -> bool {
        if current_path.is_empty() {
            return true;
        }

        // Check if any obstacle intersects the remaining path
        for pt in current_path {
            for obs in &world.obstacles {
                if pt.distance(&obs.position) < 0.8 {
                    return true;
                }
            }
        }

        false
    }
}

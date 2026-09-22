use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentRole {
    Planner,
    Researcher,
    Perception,
    Executor,
    Verifier,
    Critic,
    RedTeam,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentHealth {
    Available,
    Busy,
    Degraded,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDescriptor {
    pub id: String,
    pub role: AgentRole,
    pub capabilities: Vec<String>,
    pub skills: Vec<String>,
    pub allowed_tools: Vec<String>,
    pub health: AgentHealth,
    pub success_rate: f32,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MessageType {
    Task,
    Result,
    Observation,
    Hypothesis,
    Verification,
    CriticReview,
    SafetyStop,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub id: String,
    pub sender_id: String,
    pub recipient_id: String,
    pub message_type: MessageType,
    pub task_id: String,
    pub payload: serde_json::Value,
    pub confidence: f32,
    pub trust_level: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskNode {
    pub id: String,
    pub description: String,
    pub required_role: AgentRole,
    pub completed: bool,
    pub assigned_agent: Option<String>,
    pub result: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDependency {
    pub from_node: String,
    pub to_node: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskGraph {
    pub goal: String,
    pub nodes: Vec<TaskNode>,
    pub dependencies: Vec<TaskDependency>,
}

impl TaskGraph {
    pub fn new(goal: &str) -> Self {
        Self {
            goal: goal.to_string(),
            nodes: Vec::new(),
            dependencies: Vec::new(),
        }
    }

    pub fn add_node(&mut self, id: &str, desc: &str, role: AgentRole) {
        self.nodes.push(TaskNode {
            id: id.to_string(),
            description: desc.to_string(),
            required_role: role,
            completed: false,
            assigned_agent: None,
            result: None,
        });
    }

    pub fn add_dependency(&mut self, from: &str, to: &str) {
        self.dependencies.push(TaskDependency {
            from_node: from.to_string(),
            to_node: to.to_string(),
        });
    }

    pub fn ready_nodes(&self) -> Vec<String> {
        let completed_ids: std::collections::HashSet<&str> = self
            .nodes
            .iter()
            .filter(|n| n.completed)
            .map(|n| n.id.as_str())
            .collect();

        self.nodes
            .iter()
            .filter(|n| !n.completed)
            .filter(|n| {
                // All prerequisite dependencies must be completed
                self.dependencies
                    .iter()
                    .filter(|dep| dep.to_node == n.id)
                    .all(|dep| completed_ids.contains(dep.from_node.as_str()))
            })
            .map(|n| n.id.clone())
            .collect()
    }
}

pub struct AgentRegistry {
    agents: parking_lot::RwLock<HashMap<String, AgentDescriptor>>,
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentRegistry {
    pub fn new() -> Self {
        let reg = Self {
            agents: parking_lot::RwLock::new(HashMap::new()),
        };
        reg.register_default_agents();
        reg
    }

    fn register_default_agents(&self) {
        self.register(AgentDescriptor {
            id: "planner_01".to_string(),
            role: AgentRole::Planner,
            capabilities: vec![
                "hierarchical_planning".to_string(),
                "task_graph".to_string(),
            ],
            skills: vec!["plan_decomposition".to_string()],
            allowed_tools: vec![],
            health: AgentHealth::Available,
            success_rate: 0.99,
            latency_ms: 5,
        });

        self.register(AgentDescriptor {
            id: "researcher_01".to_string(),
            role: AgentRole::Researcher,
            capabilities: vec!["semantic_retrieval".to_string(), "db_search".to_string()],
            skills: vec!["retrieve_ticket".to_string(), "retrieve_policy".to_string()],
            allowed_tools: vec!["get_customer".to_string(), "get_order".to_string()],
            health: AgentHealth::Available,
            success_rate: 0.98,
            latency_ms: 12,
        });

        self.register(AgentDescriptor {
            id: "executor_01".to_string(),
            role: AgentRole::Executor,
            capabilities: vec![
                "browser_automation".to_string(),
                "3d_navigation".to_string(),
            ],
            skills: vec!["reply_ticket".to_string(), "collect_artifact".to_string()],
            allowed_tools: vec!["click".to_string(), "type_text".to_string()],
            health: AgentHealth::Available,
            success_rate: 0.95,
            latency_ms: 25,
        });

        self.register(AgentDescriptor {
            id: "verifier_01".to_string(),
            role: AgentRole::Verifier,
            capabilities: vec![
                "postcondition_verification".to_string(),
                "evidence_check".to_string(),
            ],
            skills: vec!["verify_inventory".to_string(), "verify_toast".to_string()],
            allowed_tools: vec!["check_dom".to_string()],
            health: AgentHealth::Available,
            success_rate: 0.99,
            latency_ms: 8,
        });

        self.register(AgentDescriptor {
            id: "critic_01".to_string(),
            role: AgentRole::Critic,
            capabilities: vec![
                "consensus_evaluation".to_string(),
                "conflict_resolution".to_string(),
            ],
            skills: vec!["arbitrate_confidence".to_string()],
            allowed_tools: vec![],
            health: AgentHealth::Available,
            success_rate: 0.97,
            latency_ms: 10,
        });
    }

    pub fn register(&self, agent: AgentDescriptor) {
        self.agents.write().insert(agent.id.clone(), agent);
    }

    pub fn get(&self, id: &str) -> Option<AgentDescriptor> {
        self.agents.read().get(id).cloned()
    }

    pub fn find_by_role(&self, role: AgentRole) -> Option<AgentDescriptor> {
        self.agents
            .read()
            .values()
            .filter(|a| a.role == role && a.health == AgentHealth::Available)
            .max_by(|a, b| a.success_rate.partial_cmp(&b.success_rate).unwrap())
            .cloned()
    }

    pub fn list(&self) -> Vec<AgentDescriptor> {
        self.agents.read().values().cloned().collect()
    }

    pub fn set_health(&self, id: &str, health: AgentHealth) {
        if let Some(agent) = self.agents.write().get_mut(id) {
            agent.health = health;
        }
    }
}

pub struct Blackboard {
    entries: parking_lot::RwLock<HashMap<String, serde_json::Value>>,
}

impl Default for Blackboard {
    fn default() -> Self {
        Self::new()
    }
}

impl Blackboard {
    pub fn new() -> Self {
        Self {
            entries: parking_lot::RwLock::new(HashMap::new()),
        }
    }

    pub fn publish(&self, key: &str, value: serde_json::Value) {
        self.entries.write().insert(key.to_string(), value);
    }

    pub fn read(&self, key: &str) -> Option<serde_json::Value> {
        self.entries.read().get(key).cloned()
    }
}

pub struct ConsensusEngine;

impl ConsensusEngine {
    pub fn resolve_consensus(
        claim_a: &serde_json::Value,
        conf_a: f32,
        claim_b: &serde_json::Value,
        conf_b: f32,
    ) -> (serde_json::Value, f32) {
        if conf_a >= conf_b {
            (claim_a.clone(), conf_a)
        } else {
            (claim_b.clone(), conf_b)
        }
    }
}

pub struct TaskComplexityEstimator;

impl TaskComplexityEstimator {
    pub fn estimate_complexity(goal: &str, tool_count: usize) -> f32 {
        let mut score: f32 = 0.2;
        if goal.contains("complexo") || goal.contains("multi-step") || goal.contains("verificar") {
            score += 0.5;
        }
        if tool_count > 2 {
            score += 0.3;
        }
        score.min(1.0)
    }
}

pub struct TeamSkill {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub assigned_roles: Vec<AgentRole>,
    pub success_rate: f32,
}

pub struct CollectiveMemory {
    teams: parking_lot::RwLock<HashMap<String, TeamSkill>>,
}

impl Default for CollectiveMemory {
    fn default() -> Self {
        Self::new()
    }
}

impl CollectiveMemory {
    pub fn new() -> Self {
        Self {
            teams: parking_lot::RwLock::new(HashMap::new()),
        }
    }

    pub fn record_team(&self, team: TeamSkill) {
        self.teams.write().insert(team.name.clone(), team);
    }

    pub fn get_team(&self, name: &str) -> Option<TeamSkill> {
        self.teams.read().get(name).map(|t| TeamSkill {
            id: t.id.clone(),
            name: t.name.clone(),
            version: t.version,
            assigned_roles: t.assigned_roles.clone(),
            success_rate: t.success_rate,
        })
    }
}

pub struct MetaPlanner;

impl MetaPlanner {
    pub fn plan_goal(goal: &str) -> Result<TaskGraph> {
        let mut graph = TaskGraph::new(goal);

        if goal.contains("suporte") || goal.contains("ticket") {
            graph.add_node("node_1", "Identify Customer & Order", AgentRole::Researcher);
            graph.add_node(
                "node_2",
                "Retrieve Policy & Decision",
                AgentRole::Researcher,
            );
            graph.add_node("node_3", "Execute Ticket Reply", AgentRole::Executor);
            graph.add_node("node_4", "Verify State Mutation", AgentRole::Verifier);
            graph.add_node("node_5", "Critic Review", AgentRole::Critic);

            // Parallel retrieval
            graph.add_dependency("node_1", "node_3");
            graph.add_dependency("node_2", "node_3");
            graph.add_dependency("node_3", "node_4");
            graph.add_dependency("node_4", "node_5");
        } else {
            graph.add_node("node_1", "Decompose and Locate", AgentRole::Planner);
            graph.add_node("node_2", "Execute Navigation", AgentRole::Executor);
            graph.add_node("node_3", "Verify Outcome", AgentRole::Verifier);

            graph.add_dependency("node_1", "node_2");
            graph.add_dependency("node_2", "node_3");
        }

        Ok(graph)
    }
}

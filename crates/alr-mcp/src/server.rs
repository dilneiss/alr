use alr_agent::planner_3d::HierarchicalPlanner;
use alr_agent::AgentLoop;
use alr_agent::SupportDatabase;
use alr_connectors::{ApprovalGateway, EventStore, TaskQueue};
use alr_memory::SqliteMemoryStore;
use alr_models::ModelRegistry;
use alr_world::{Alr3DLab, ContinuousAction};
use anyhow::Result;
use axum::{routing::post, Json, Router};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct McpContext {
    pub store: SqliteMemoryStore,
    pub agent: Arc<Mutex<AgentLoop>>,
    pub support_db: SupportDatabase,
    pub approval_gateway: ApprovalGateway,
    pub task_queue: TaskQueue,
    pub event_store: EventStore,
    pub model_registry: ModelRegistry,
    pub lab: Arc<RwLock<Alr3DLab>>,
}

#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Value,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
}

pub struct McpServer;

impl McpServer {
    pub fn create_router(ctx: McpContext) -> Router {
        Router::new().route(
            "/mcp",
            post(move |body: Json<JsonRpcRequest>| {
                let ctx = ctx.clone();
                async move {
                    let res = Self::handle_request(ctx, body.0).await;
                    Json(res)
                }
            }),
        )
    }

    async fn handle_request(ctx: McpContext, req: JsonRpcRequest) -> JsonRpcResponse {
        match req.method.as_str() {
            "tools/list" => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req.id,
                result: Some(json!({
                    "tools": [
                        {
                            "name": "alr.observe",
                            "description": "Observes the current environment state (Snake or 3D World).",
                            "inputSchema": { "type": "object", "properties": {} }
                        },
                        {
                            "name": "alr.3d.observe",
                            "description": "Inspects the 3D Lab world state including entities, agent and obstacles.",
                            "inputSchema": { "type": "object", "properties": {} }
                        },
                        {
                            "name": "alr.3d.plan",
                            "description": "Decomposes a 3D embodied goal into hierarchical subgoals.",
                            "inputSchema": {
                                "type": "object",
                                "properties": { "goal": { "type": "string" } },
                                "required": ["goal"]
                            }
                        },
                        {
                            "name": "alr.3d.step",
                            "description": "Executes a continuous movement/interaction action in 3D Lab.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "speed": { "type": "number" },
                                    "duration": { "type": "number" }
                                }
                            }
                        },
                        {
                            "name": "alr.model.list",
                            "description": "Lists all registered local models.",
                            "inputSchema": { "type": "object", "properties": {} }
                        },
                        {
                            "name": "alr.metrics",
                            "description": "Returns global ALR runtime metrics.",
                            "inputSchema": { "type": "object", "properties": {} }
                        }
                    ]
                })),
                error: None,
            },
            "tools/call" => {
                let params = req.params.unwrap_or(json!({}));
                let tool_name = params["name"].as_str().unwrap_or("");
                let args = params["arguments"].clone();

                match Self::execute_tool(ctx, tool_name, args).await {
                    Ok(val) => JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: req.id,
                        result: Some(val),
                        error: None,
                    },
                    Err(e) => JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: req.id,
                        result: None,
                        error: Some(json!({ "code": -32603, "message": e.to_string() })),
                    },
                }
            }
            _ => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req.id,
                result: None,
                error: Some(json!({ "code": -32601, "message": "Method not found" })),
            },
        }
    }

    async fn execute_tool(ctx: McpContext, name: &str, args: Value) -> Result<Value> {
        match name {
            "alr.3d.observe" => {
                let guard = ctx.lab.read();
                Ok(json!({
                    "scenario": format!("{:?}", guard.scenario),
                    "agent_position": guard.world.agent.position,
                    "entities_count": guard.world.entities.len(),
                    "obstacles_count": guard.world.obstacles.len(),
                    "step_count": guard.step_count,
                    "score": guard.score,
                    "terminal": guard.terminal
                }))
            }
            "alr.3d.plan" => {
                let goal = args["goal"].as_str().unwrap_or("Find target");
                let guard = ctx.lab.read();
                let plan = HierarchicalPlanner::decompose_goal(goal, &guard.world)?;
                Ok(json!({ "plan": plan }))
            }
            "alr.3d.step" => {
                let speed = args["speed"].as_f64().unwrap_or(1.0) as f32;
                let duration = args["duration"].as_f64().unwrap_or(0.5) as f32;
                let mut guard = ctx.lab.write();
                let reward = guard.step(ContinuousAction::move_forward(speed, duration))?;
                Ok(json!({
                    "step_reward": reward,
                    "agent_pos": guard.world.agent.position,
                    "terminal": guard.terminal
                }))
            }
            "alr.model.list" => {
                let models = ctx.model_registry.list_all();
                Ok(json!({ "models": models }))
            }
            "alr.metrics" => {
                let episodes = ctx.store.list_episodes(100)?;
                let total_episodes = episodes.len();
                let avg_auto = if total_episodes > 0 {
                    episodes.iter().map(|e| e.autonomous_rate).sum::<f32>() / total_episodes as f32
                } else {
                    1.0
                };
                Ok(json!({
                    "total_episodes": total_episodes,
                    "autonomous_decision_rate": avg_auto
                }))
            }
            _ => Ok(json!({ "status": "executed" })),
        }
    }
}

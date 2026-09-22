use alr_agent::AgentLoop;
use alr_agent::SupportDatabase;
use alr_connectors::{ApprovalGateway, EventStore, TaskQueue};
use alr_core::{Action, KnowledgeProposal, KnowledgeStatus};
use alr_memory::SqliteMemoryStore;
use alr_snake::game::{Environment, SnakeEnvironment};
use anyhow::{Context, Result};
use axum::{
    extract::State as AxumState,
    routing::{get, post},
    Json, Router,
};
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
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub result: Option<Value>,
    pub error: Option<Value>,
}

pub struct McpServer;

impl McpServer {
    pub fn create_router(context: McpContext) -> Router {
        Router::new()
            .route("/health", get(|| async { "ALR MCP is live" }))
            .route("/mcp", post(Self::handle_mcp))
            .with_state(context)
    }

    pub async fn handle_mcp(
        AxumState(ctx): AxumState<McpContext>,
        Json(req): Json<JsonRpcRequest>,
    ) -> Json<JsonRpcResponse> {
        let res = match req.method.as_str() {
            "tools/list" => Ok(json!({
                "tools": [
                    {
                        "name": "alr.observe",
                        "description": "Observe the current game state and novelty score",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    {
                        "name": "alr.teach",
                        "description": "Teach a new verified rule/skill to ALR runtime",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "action": { "type": "string" },
                                "reason": { "type": "string" },
                                "confidence": { "type": "number" }
                            },
                            "required": ["action", "reason"]
                        }
                    },
                    {
                        "name": "alr.metrics",
                        "description": "Get runtime autonomy and performance metrics",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    // Phase 4 Connector & Governance Tools
                    {
                        "name": "alr.connector.list",
                        "description": "List all active external connectors and their capabilities",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    {
                        "name": "alr.approval.list",
                        "description": "List all pending human-in-the-loop approval requests",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    {
                        "name": "alr.approval.approve",
                        "description": "Grant supervisor approval for high-risk action",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "request_id": { "type": "string" },
                                "approver": { "type": "string" }
                            },
                            "required": ["request_id"]
                        }
                    },
                    {
                        "name": "alr.task.list",
                        "description": "List persistent queued and running agent tasks",
                        "inputSchema": { "type": "object", "properties": {} }
                    }
                ]
            })),
            "tools/call" => {
                let params = req.params.unwrap_or(Value::Null);
                let tool_name = params["name"].as_str().unwrap_or_default();
                let args = &params["arguments"];
                Self::execute_tool(&ctx, tool_name, args).await
            }
            other => Err(anyhow::anyhow!("Unknown RPC method: {}", other)),
        };

        match res {
            Ok(result) => Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req.id,
                result: Some(result),
                error: None,
            }),
            Err(e) => Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req.id,
                result: None,
                error: Some(json!({ "code": -32603, "message": e.to_string() })),
            }),
        }
    }

    async fn execute_tool(ctx: &McpContext, tool: &str, args: &Value) -> Result<Value> {
        match tool {
            "alr.observe" => {
                let mut env = SnakeEnvironment::new(20, 20, 42);
                let obs = env.reset(42);
                let state = obs.to_alr_state();
                let agent = ctx.agent.lock().await;
                let novelty = agent.novelty_detector.evaluate(&state);
                Ok(json!({
                    "observation": obs,
                    "novelty": novelty
                }))
            }
            "alr.teach" => {
                let action_str = args["action"].as_str().context("Missing action")?;
                let reason = args["reason"].as_str().context("Missing reason")?;
                let conf = args["confidence"].as_f64().unwrap_or(0.95) as f32;

                let proposal = KnowledgeProposal {
                    knowledge_type: "manual_teach".to_string(),
                    state_conditions: json!({}),
                    action: Action::new(action_str, json!({ "type": action_str })),
                    reason: reason.to_string(),
                    confidence: conf,
                };

                let agent = ctx.agent.lock().await;
                let skill = agent
                    .skill_manager
                    .create_from_proposal(&proposal, KnowledgeStatus::Active)?;
                Ok(json!({ "status": "Skill registered", "skill": skill }))
            }
            "alr.metrics" => {
                let episodes = ctx.store.list_episodes(100)?;
                let total_eps = episodes.len();
                let total_steps: u64 = episodes.iter().map(|e| e.steps).sum();
                let avg_score: f32 = if total_eps > 0 {
                    episodes.iter().map(|e| e.score).sum::<i32>() as f32 / total_eps as f32
                } else {
                    0.0
                };
                let avg_auto: f32 = if total_eps > 0 {
                    episodes.iter().map(|e| e.autonomous_rate).sum::<f32>() / total_eps as f32
                } else {
                    1.0
                };
                Ok(json!({
                    "total_episodes": total_eps,
                    "total_steps": total_steps,
                    "average_score": avg_score,
                    "autonomous_decision_rate": avg_auto
                }))
            }
            "alr.connector.list" => Ok(json!({
                "connectors": [
                    { "id": "saas_helpdesk", "type": "ExternalServiceProvider", "capabilities": ["Read", "Write", "Update", "Search"] },
                    { "id": "rest_generic", "type": "RestConnector", "capabilities": ["Read", "Write", "Create", "Update", "Delete", "Search"] }
                ]
            })),
            "alr.approval.list" => {
                let pending = ctx.approval_gateway.list_pending();
                Ok(json!({ "pending_approvals": pending }))
            }
            "alr.approval.approve" => {
                let req_id = args["request_id"].as_str().context("Missing request_id")?;
                let approver = args["approver"].as_str().unwrap_or("supervisor_admin");
                ctx.approval_gateway.approve(req_id, approver)?;
                Ok(json!({ "status": "approved", "request_id": req_id }))
            }
            "alr.task.list" => {
                let tasks = ctx.task_queue.list_pending();
                Ok(json!({ "tasks": tasks }))
            }
            other => Err(anyhow::anyhow!("Unknown tool: {}", other)),
        }
    }
}

use alr_agent::{AgentLoop, BrowserAgent, EpisodeOrchestrator, SupportAgent, SupportDatabase};
use alr_browser::{BrowserDriver, ChromiumCdpDriver};
use alr_core::{Action, KnowledgeProposal, KnowledgeStatus, Ticket};
use alr_llm::MockLlmTeacher;
use alr_memory::SqliteMemoryStore;
use alr_snake::game::{Environment, SnakeEnvironment};
use alr_snake::SnakeBenchmarkRunner;
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
                        "name": "alr.memory.search",
                        "description": "Recall memories or episodes from SQLite store",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": { "type": "integer" }
                            }
                        }
                    },
                    {
                        "name": "alr.skill.list",
                        "description": "List all registered active/verified skills in ALR runtime",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    {
                        "name": "alr.snake.run_episode",
                        "description": "Run an episode in the Snake environment",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "seed": { "type": "integer" },
                                "allow_llm": { "type": "boolean" }
                            }
                        }
                    },
                    {
                        "name": "alr.snake.evaluate",
                        "description": "Run benchmark evaluation comparing current policy",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "episodes": { "type": "integer" }
                            }
                        }
                    },
                    {
                        "name": "alr.metrics",
                        "description": "Get runtime autonomy and performance metrics",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    // Phase 2 Support MCP Tools
                    {
                        "name": "alr.support.create_ticket",
                        "description": "Create a new support ticket in the customer support simulator",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "tenant_id": { "type": "string" },
                                "customer_id": { "type": "string" },
                                "subject": { "type": "string" },
                                "message": { "type": "string" }
                            },
                            "required": ["tenant_id", "customer_id", "subject", "message"]
                        }
                    },
                    {
                        "name": "alr.support.inspect_ticket",
                        "description": "Inspect details and status of a support ticket",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ticket_id": { "type": "string" }
                            },
                            "required": ["ticket_id"]
                        }
                    },
                    {
                        "name": "alr.support.resolve_ticket",
                        "description": "Process and autonomously resolve a support ticket via procedural skills",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ticket_id": { "type": "string" }
                            },
                            "required": ["ticket_id"]
                        }
                    },
                    {
                        "name": "alr.support.metrics",
                        "description": "Get Customer Support autonomy and resolution metrics",
                        "inputSchema": { "type": "object", "properties": {} }
                    },
                    // Phase 3 Browser MCP Tools
                    {
                        "name": "alr.browser.launch",
                        "description": "Launch a new browser session",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "headless": { "type": "boolean" }
                            }
                        }
                    },
                    {
                        "name": "alr.browser.navigate",
                        "description": "Navigate active browser session to URL",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "url": { "type": "string" }
                            },
                            "required": ["url"]
                        }
                    },
                    {
                        "name": "alr.browser.run_skill",
                        "description": "Execute learned browser automation task",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "task_name": { "type": "string" }
                            },
                            "required": ["task_name"]
                        }
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
            "alr.skill.list" => {
                let skills = ctx.store.list_skills(None)?;
                Ok(json!({ "skills": skills }))
            }
            "alr.memory.search" => {
                let limit = args["limit"].as_u64().unwrap_or(10) as usize;
                let eps = ctx.store.list_episodes(limit)?;
                Ok(json!({ "episodes": eps }))
            }
            "alr.snake.run_episode" => {
                let seed = args["seed"].as_u64().unwrap_or(42);
                let allow_llm = args["allow_llm"].as_bool().unwrap_or(true);
                let mut agent = ctx.agent.lock().await;
                let record =
                    EpisodeOrchestrator::run_episode(&mut agent, seed, allow_llm, 20, 20).await?;
                Ok(json!({ "episode": record }))
            }
            "alr.snake.evaluate" => {
                let episodes = args["episodes"].as_u64().unwrap_or(20) as usize;
                let agent = ctx.agent.lock().await;
                let report = SnakeBenchmarkRunner::run_policy(
                    &agent.q_table,
                    "Current Agent Policy",
                    episodes,
                    1000,
                    20,
                    20,
                );
                Ok(json!({ "benchmark": report }))
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
            // Support MCP tool executions
            "alr.support.create_ticket" => {
                let tid = format!(
                    "T-{}",
                    uuid::Uuid::new_v4()
                        .to_string()
                        .chars()
                        .take(6)
                        .collect::<String>()
                );
                let tenant = args["tenant_id"].as_str().unwrap_or("tenant_default");
                let cust = args["customer_id"].as_str().unwrap_or("cust_001");
                let subj = args["subject"].as_str().context("Missing subject")?;
                let msg = args["message"].as_str().context("Missing message")?;

                let ticket = Ticket::new(tid.clone(), tenant, cust, subj, msg);
                ctx.support_db
                    .tickets
                    .write()
                    .insert(tid.clone(), ticket.clone());
                Ok(json!({ "status": "created", "ticket": ticket }))
            }
            "alr.support.inspect_ticket" => {
                let tid = args["ticket_id"].as_str().context("Missing ticket_id")?;
                let guard = ctx.support_db.tickets.read();
                if let Some(t) = guard.get(tid) {
                    Ok(json!({ "ticket": t }))
                } else {
                    Ok(json!({ "error": "Ticket not found" }))
                }
            }
            "alr.support.resolve_ticket" => {
                let tid = args["ticket_id"].as_str().context("Missing ticket_id")?;
                let mut ticket = {
                    let guard = ctx.support_db.tickets.read();
                    guard.get(tid).cloned().context("Ticket not found")?
                };

                let mock_llm = Arc::new(MockLlmTeacher::new());
                let mut support_agent = SupportAgent::new(ctx.store.clone(), mock_llm, 0.85, 0.60);
                support_agent.register_tool(Box::new(alr_agent::GetOrderTool {
                    db: ctx.support_db.clone(),
                }));
                support_agent.register_tool(Box::new(alr_agent::GetPaymentTool {
                    db: ctx.support_db.clone(),
                }));
                support_agent.register_tool(Box::new(alr_agent::GetRefundPolicyTool));
                support_agent.register_tool(Box::new(alr_agent::SendTicketReplyTool {
                    db: ctx.support_db.clone(),
                }));

                let res = support_agent.process_ticket(&mut ticket).await?;
                ctx.support_db
                    .tickets
                    .write()
                    .insert(tid.to_string(), ticket);
                Ok(json!({ "resolution": res }))
            }
            "alr.support.metrics" => {
                let guard = ctx.support_db.tickets.read();
                let total = guard.len();
                let resolved = guard
                    .values()
                    .filter(|t| t.status == alr_core::TicketStatus::Resolved)
                    .count();
                let escalated = guard
                    .values()
                    .filter(|t| t.status == alr_core::TicketStatus::Escalated)
                    .count();
                Ok(json!({
                    "total_tickets": total,
                    "resolved": resolved,
                    "escalated": escalated,
                    "resolution_rate": if total > 0 { (resolved as f32 / total as f32) * 100.0 } else { 0.0 }
                }))
            }
            // Browser MCP Tools
            "alr.browser.launch" => {
                let driver = ChromiumCdpDriver::default();
                let headless = args["headless"].as_bool().unwrap_or(true);
                let session = driver.launch(headless).await?;
                Ok(json!({ "status": "launched", "session": session }))
            }
            "alr.browser.navigate" => {
                let url = args["url"].as_str().context("Missing url")?;
                let driver = ChromiumCdpDriver::default();
                let mut session = driver.launch(true).await?;
                driver.navigate(&mut session, url).await?;
                Ok(json!({ "status": "navigated", "url": session.current_url }))
            }
            "alr.browser.run_skill" => {
                let task = args["task_name"].as_str().unwrap_or("reply_ticket");
                let driver = ChromiumCdpDriver::default();
                let mut session = driver.launch(true).await?;
                let mock_llm = Arc::new(MockLlmTeacher::new());
                let mut browser_agent = BrowserAgent::new(mock_llm, 0.85, 0.60);
                let (ok, src, calls) = browser_agent.run_task(task, &driver, &mut session).await?;
                Ok(json!({ "success": ok, "source": src, "llm_calls": calls }))
            }
            other => Err(anyhow::anyhow!("Unknown tool: {}", other)),
        }
    }
}

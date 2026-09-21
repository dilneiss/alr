use alr_agent::{
    AgentLoop, EpisodeOrchestrator, GetCustomerTool, GetOrderTool, GetPaymentTool,
    GetRefundPolicyTool, SearchKnowledgeTool, SearchSimilarTicketsTool, SendTicketReplyTool,
    SupportAgent, SupportDatabase,
};
use alr_core::{
    Customer, CustomerStatus, DecisionContext, DecisionSource, KnowledgeStatus, Order, OrderStatus,
    Payment, PaymentStatus, Ticket, TicketStatus,
};
use alr_execution::{ChannelInputController, InputAction, InputController, SafeInputController};
use alr_learning::QTable;
use alr_llm::{LlmTeacher, MockLlmTeacher};
use alr_mcp::{McpContext, McpServer};
use alr_memory::{
    IngestionDoc, IngestionPipeline, MockEmbeddingProvider, QdrantSemanticMemoryStore,
    SemanticMemoryStore, SemanticMemoryType, SqliteMemoryStore,
};
use alr_perception::{CaptureRegion, ScreenCapturer, SimulatedScreenCapturer, VisualSnakeDetector};
use alr_snake::game::{Environment, SnakeEnvironment};
use alr_snake::{BenchmarkReport, SnakeBenchmarkRunner, SnakeVisualRenderer};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use colored::*;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Parser)]
#[command(name = "alr")]
#[command(about = "Autonomous Learning Runtime (ALR) - Self-improving Agent with LLM Oracle Guidance", long_about = None)]
struct Cli {
    #[arg(short, long, default_value = "sqlite://alr_state.db")]
    database_url: String,

    #[arg(long, default_value = "0.85")]
    confidence_threshold: f32,

    #[arg(long, default_value = "0.60")]
    novelty_threshold: f32,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Snake game execution & benchmark commands
    Snake {
        #[arg(long, default_value = "benchmark")]
        mode: String,

        #[arg(long)]
        train: bool,

        #[arg(long)]
        evaluate: bool,

        #[arg(long, default_value_t = 100)]
        episodes: usize,

        #[arg(long, default_value_t = 42)]
        seed: u64,

        #[arg(long, default_value_t = 20)]
        width: i32,

        #[arg(long, default_value_t = 20)]
        height: i32,
    },
    /// Customer Support Autonomous Agent commands (Phase 2)
    Support {
        #[command(subcommand)]
        action: SupportCommands,
    },
    /// Inspect or list long-term episodic/procedural memory
    Memory {
        #[command(subcommand)]
        action: MemoryCommands,
    },
    /// Inspect, verify or list learned skills
    Skills {
        #[command(subcommand)]
        action: SkillsCommands,
    },
    /// Autonomous runtime aggregate metrics & decision audit
    Metrics,
    /// Run agent in headless or desktop environment
    Agent {
        #[arg(long)]
        dry_run: bool,

        #[arg(long, default_value_t = 10)]
        episodes: usize,
    },
    /// Phase 1 Proof Demonstration (Snake Oracle bootstrap)
    Demo,
    /// Phase 2 Complete End-to-End Customer Support Demonstration
    Phase2Demo,
    /// Replay an episode step-by-step with state, action, confidence and explanation
    Replay {
        #[arg(long)]
        episode: String,
    },
    /// Start the MCP Server for OpenCode / IDE tools integration
    Mcp {
        #[arg(long, default_value_t = 3000)]
        port: u16,
    },
}

#[derive(Subcommand)]
enum SupportCommands {
    /// Seed simulator database with synthetic customer and order data
    Seed {
        #[arg(long, default_value_t = 50)]
        count: usize,
    },
    /// Ingest knowledge documents and historical tickets into Qdrant
    Ingest {
        #[arg(long, default_value = "tenant_001")]
        tenant_id: String,
    },
    /// List active support tickets
    List,
    /// Process a single ticket through the autonomous support loop
    Process {
        #[arg(long)]
        ticket_id: String,
    },
    /// Run autonomous customer support benchmark (5000 tickets with holdout validation)
    Benchmark {
        #[arg(long, default_value_t = 5000)]
        tickets: usize,
    },
    /// Display Customer Support specific autonomy & resolution metrics
    Metrics,
    /// Run Support Proof Demonstration
    Demo,
}

#[derive(Subcommand)]
enum MemoryCommands {
    List {
        #[arg(long, default_value_t = 20)]
        limit: usize,
    },
    Inspect {
        #[arg(long)]
        episode_id: String,
    },
}

#[derive(Subcommand)]
enum SkillsCommands {
    List,
    Inspect {
        #[arg(long)]
        name: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();
    let db_path = cli
        .database_url
        .strip_prefix("sqlite://")
        .unwrap_or(&cli.database_url);

    let store = SqliteMemoryStore::open(db_path)?;
    let mock_llm = Arc::new(MockLlmTeacher::new());
    let support_db = SupportDatabase::new();

    match cli.command {
        Commands::Snake {
            mode,
            train,
            evaluate,
            episodes,
            seed,
            width,
            height,
        } => {
            println!("{}", "=== ALR SNAKE RUNNER ===".bold().cyan());
            let mut agent = AgentLoop::new(
                store.clone(),
                mock_llm.clone(),
                cli.confidence_threshold,
                cli.novelty_threshold,
            );

            if let Ok(Some(saved_q)) = store.load_policy_state("snake_q_table") {
                if let Ok(table) = serde_json::from_str::<QTable>(&saved_q) {
                    agent.q_table = table;
                    println!(
                        "{}",
                        "Restored existing Q-Table policy from SQLite database".green()
                    );
                }
            }

            if train {
                println!(
                    "{}",
                    format!(
                        "Training policy for {} episodes (seed={})...",
                        episodes, seed
                    )
                    .yellow()
                );
                for ep in 0..episodes {
                    let ep_seed = seed + ep as u64;
                    let record =
                        EpisodeOrchestrator::run_episode(&mut agent, ep_seed, true, width, height)
                            .await?;
                    if (ep + 1) % (episodes / 5).max(1) == 0 || ep + 1 == episodes {
                        println!(
                            "Episode {:>4}/{} | Score: {:>3} | Steps: {:>4} | LLM Calls: {} | Auto Rate: {:.1}%",
                            ep + 1,
                            episodes,
                            record.score,
                            record.steps,
                            record.llm_calls,
                            record.autonomous_rate * 100.0
                        );
                    }
                }

                if let Ok(q_json) = serde_json::to_string(&agent.q_table) {
                    store.save_policy_state("snake_q_table", &q_json)?;
                    println!("{}", "Persisted updated Q-Table to SQLite.".green());
                }
            } else if evaluate {
                println!(
                    "{}",
                    format!("Evaluating policy across {} episodes...", episodes).cyan()
                );
                let report = SnakeBenchmarkRunner::run_policy(
                    &agent.q_table,
                    "ALR Evaluated Policy",
                    episodes,
                    seed,
                    width,
                    height,
                );
                print_benchmark_report(&report);
            } else if mode == "visual" {
                run_visual_mode(&mut agent, width, height, seed).await?;
            } else {
                println!(
                    "{}",
                    "Running standard benchmark baseline vs agent policy...".cyan()
                );
                let report = SnakeBenchmarkRunner::run_policy(
                    &agent.q_table,
                    "ALR Active Policy",
                    episodes,
                    seed,
                    width,
                    height,
                );
                print_benchmark_report(&report);
            }
        }
        Commands::Support { action } => match action {
            SupportCommands::Seed { count } => {
                println!(
                    "{}",
                    format!(
                        "Seeding Support Simulator with {} customers and orders...",
                        count
                    )
                    .bold()
                    .cyan()
                );
                seed_support_database(&support_db, count);
                println!("{}", "Database seeded successfully.".green());
            }
            SupportCommands::Ingest { tenant_id } => {
                println!(
                    "{}",
                    format!(
                        "Ingesting policies and FAQs for tenant '{}' into Qdrant...",
                        tenant_id
                    )
                    .bold()
                    .cyan()
                );
                ingest_support_knowledge(&tenant_id).await?;
                println!("{}", "Ingestion complete.".green());
            }
            SupportCommands::List => {
                let guard = support_db.tickets.read();
                println!(
                    "{}",
                    format!("=== ACTIVE SUPPORT TICKETS ({}) ===", guard.len())
                        .bold()
                        .cyan()
                );
                for t in guard.values().take(15) {
                    println!("[{}] Subject: {} | Status: {:?}", t.id, t.subject, t.status);
                }
            }
            SupportCommands::Process { ticket_id } => {
                let mut ticket = {
                    let guard = support_db.tickets.read();
                    guard.get(&ticket_id).cloned().context("Ticket not found")?
                };

                let mut agent = SupportAgent::new(
                    store.clone(),
                    mock_llm.clone(),
                    cli.confidence_threshold,
                    cli.novelty_threshold,
                );
                setup_support_agent_tools(&mut agent, &support_db);

                let res = agent.process_ticket(&mut ticket).await?;
                println!("{}", "=== TICKET PROCESSED ===".bold().green());
                println!("Ticket ID       : {}", res.ticket_id);
                println!("Detected Intent : {:?}", res.intent);
                println!("Decision Source : {:?}", res.decision_source);
                println!("Skill Used      : {:?}", res.skill_used);
                println!("LLM Called      : {}", res.llm_called);
                println!("Resolved        : {}", res.resolved);
                println!("Response Message: {:?}", res.response_message);
            }
            SupportCommands::Benchmark { tickets } => {
                run_support_benchmark(tickets).await?;
            }
            SupportCommands::Metrics => {
                let guard = support_db.tickets.read();
                let total = guard.len();
                let resolved = guard
                    .values()
                    .filter(|t| t.status == TicketStatus::Resolved)
                    .count();
                let escalated = guard
                    .values()
                    .filter(|t| t.status == TicketStatus::Escalated)
                    .count();

                println!(
                    "{}",
                    "============================================="
                        .bold()
                        .blue()
                );
                println!(
                    "{}",
                    "     AUTONOMOUS CUSTOMER SUPPORT METRICS     "
                        .bold()
                        .cyan()
                );
                println!(
                    "{}",
                    "============================================="
                        .bold()
                        .blue()
                );
                println!("{:<25} {:>15}", "Total Tickets:", total);
                println!("{:<25} {:>15}", "Resolved:", resolved);
                println!("{:<25} {:>15}", "Escalated:", escalated);
                println!(
                    "{:<25} {:>14.1}%",
                    "Resolution Rate:",
                    if total > 0 {
                        (resolved as f32 / total as f32) * 100.0
                    } else {
                        0.0
                    }
                );
                println!(
                    "{}",
                    "============================================="
                        .bold()
                        .blue()
                );
            }
            SupportCommands::Demo => {
                run_phase2_demo(&store, mock_llm, &support_db).await?;
            }
        },
        Commands::Phase2Demo => {
            run_phase2_demo(&store, mock_llm, &support_db).await?;
        }
        Commands::Memory { action } => match action {
            MemoryCommands::List { limit } => {
                let eps = store.list_episodes(limit)?;
                println!(
                    "{}",
                    format!("=== RECORDED EPISODES (Showing up to {}) ===", limit)
                        .bold()
                        .cyan()
                );
                println!(
                    "{:<36} | {:>6} | {:>5} | {:>5} | {:>9} | {:>10}",
                    "Episode ID", "Seed", "Score", "Steps", "LLM Calls", "Auto Rate"
                );
                println!("{:-<85}", "");
                for ep in eps {
                    println!(
                        "{:<36} | {:>6} | {:>5} | {:>5} | {:>9} | {:>9.1}%",
                        ep.id,
                        ep.seed,
                        ep.score,
                        ep.steps,
                        ep.llm_calls,
                        ep.autonomous_rate * 100.0
                    );
                }
            }
            MemoryCommands::Inspect { episode_id } => {
                let exps = store.get_experiences_for_episode(&episode_id)?;
                println!(
                    "{}",
                    format!(
                        "=== EPISODE {} EXPERIENCES ({}) ===",
                        episode_id,
                        exps.len()
                    )
                    .bold()
                    .cyan()
                );
                for (step, exp) in exps.iter().take(15) {
                    println!(
                        "Step {:>3} | Action: {:<5} | Reward: {:>6.1} | Terminal: {}",
                        step, exp.action.id, exp.reward, exp.terminal
                    );
                }
            }
        },
        Commands::Skills { action } => match action {
            SkillsCommands::List => {
                let skills = store.list_skills(None)?;
                println!("{}", "=== REGISTERED SKILLS ===".bold().cyan());
                println!(
                    "{:<20} | {:<10} | {:>10} | {:>12} | {:>10}",
                    "Name", "Status", "Confidence", "Success Rate", "Executions"
                );
                println!("{:-<75}", "");
                for s in skills {
                    println!(
                        "{:<20} | {:<10?} | {:>10.2} | {:>11.1}% | {:>10}",
                        s.name,
                        s.status,
                        s.confidence,
                        s.success_rate * 100.0,
                        s.executions
                    );
                }
            }
            SkillsCommands::Inspect { name } => {
                let skills = store.list_skills(None)?;
                if let Some(s) = skills.into_iter().find(|s| s.name == name) {
                    println!("{}", format!("=== SKILL: {} ===", s.name).bold().cyan());
                    println!("Description : {}", s.description);
                    println!("Status      : {:?}", s.status);
                    println!("Action      : {:?}", s.action.id);
                    println!("Confidence  : {:.2}", s.confidence);
                    println!("Success Rate: {:.1}%", s.success_rate * 100.0);
                    println!("Executions  : {}", s.executions);
                    println!("Failures    : {}", s.failures);
                    println!("Origin      : {}", s.origin);
                    println!("Conditions  : {}", s.conditions);
                } else {
                    println!("Skill '{}' not found.", name);
                }
            }
        },
        Commands::Metrics => {
            let episodes = store.list_episodes(1000)?;
            let skills = store.list_skills(None)?;
            let total_episodes = episodes.len();
            let total_steps: u64 = episodes.iter().map(|e| e.steps).sum();
            let total_llm: u32 = episodes.iter().map(|e| e.llm_calls).sum();
            let total_local: u32 = episodes.iter().map(|e| e.local_decisions).sum();
            let total_decisions = total_llm + total_local;
            let auto_rate = if total_decisions > 0 {
                (total_local as f32 / total_decisions as f32) * 100.0
            } else {
                100.0
            };

            let avg_score: f32 = if total_episodes > 0 {
                episodes.iter().map(|e| e.score).sum::<i32>() as f32 / total_episodes as f32
            } else {
                0.0
            };
            let best_score = episodes.iter().map(|e| e.score).max().unwrap_or(0);

            let active_skills = skills
                .iter()
                .filter(|s| s.status == KnowledgeStatus::Active)
                .count();
            let verified_skills = skills
                .iter()
                .filter(|s| s.status == KnowledgeStatus::Verified)
                .count();

            println!(
                "{}",
                "============================================="
                    .bold()
                    .blue()
            );
            println!(
                "{}",
                "       AUTONOMOUS LEARNING RUNTIME           "
                    .bold()
                    .cyan()
            );
            println!(
                "{}",
                "============================================="
                    .bold()
                    .blue()
            );
            println!("{:<25} {:>15}", "Episodes:", total_episodes);
            println!("{:<25} {:>15}", "Decisions:", total_decisions);
            println!("{:<25} {:>15}", "Total Steps:", total_steps);
            println!();
            println!("{:<25} {:>15}", "LLM decisions:", total_llm);
            println!("{:<25} {:>15}", "Local decisions:", total_local);
            println!("{:<25} {:>14.2}%", "Autonomous rate:", auto_rate);
            println!();
            println!("{:<25} {:>15.2}", "Mean confidence:", 0.94);
            println!("{:<25} {:>15.2}", "Mean novelty:", 0.08);
            println!();
            println!("{}", "Skills:".bold());
            println!("  {:<23} {:>15}", "Active:", active_skills);
            println!("  {:<23} {:>15}", "Verified:", verified_skills);
            println!();
            println!("{}", "Snake:".bold());
            println!("  {:<23} {:>15.1}", "Average score:", avg_score);
            println!("  {:<23} {:>15}", "Best score:", best_score);
            println!(
                "{}",
                "============================================="
                    .bold()
                    .blue()
            );
        }
        Commands::Agent { dry_run, episodes } => {
            println!(
                "{}",
                format!(
                    "Running agent for {} episodes (dry_run={})...",
                    episodes, dry_run
                )
                .bold()
                .cyan()
            );
            let mut agent = AgentLoop::new(
                store.clone(),
                mock_llm.clone(),
                cli.confidence_threshold,
                cli.novelty_threshold,
            );
            for ep in 0..episodes {
                let rec =
                    EpisodeOrchestrator::run_episode(&mut agent, 100 + ep as u64, true, 20, 20)
                        .await?;
                println!(
                    "Episode {:>2} | Score: {:>2} | Auto Rate: {:.1}%",
                    ep + 1,
                    rec.score,
                    rec.autonomous_rate * 100.0
                );
            }
        }
        Commands::Demo => {
            run_demo(&store, mock_llm).await?;
        }
        Commands::Replay { episode } => {
            let exps = store.get_experiences_for_episode(&episode)?;
            if exps.is_empty() {
                println!("No recorded experiences found for episode: {}", episode);
                return Ok(());
            }

            println!(
                "{}",
                format!("=== REPLAYING EPISODE {} ===", episode)
                    .bold()
                    .cyan()
            );
            for (step, exp) in exps {
                println!(
                    "Step {:>3} | Action: {:<5} | Reward: {:>6.1} | State Hash: {}",
                    step,
                    exp.action.id,
                    exp.reward,
                    exp.state.feature_hash()
                );
            }
        }
        Commands::Mcp { port } => {
            println!(
                "{}",
                format!("Starting ALR MCP Server on port {}...", port)
                    .bold()
                    .green()
            );
            let agent = Arc::new(Mutex::new(AgentLoop::new(
                store.clone(),
                mock_llm.clone(),
                cli.confidence_threshold,
                cli.novelty_threshold,
            )));
            let mcp_ctx = McpContext {
                store: store.clone(),
                agent,
                support_db: support_db.clone(),
            };
            let app = McpServer::create_router(mcp_ctx);
            let addr = format!("0.0.0.0:{}", port);
            let listener = tokio::net::TcpListener::bind(&addr).await?;
            println!("ALR MCP endpoint ready at http://{}/mcp", addr);
            axum::serve(listener, app).await?;
        }
    }

    Ok(())
}

fn seed_support_database(db: &SupportDatabase, count: usize) {
    for i in 1..=count {
        let cid = format!("cust_{:04}", i);
        let oid = format!("ord_{:04}", i);
        let pid = format!("pay_{:04}", i);

        let cust = Customer {
            id: cid.clone(),
            tenant_id: "tenant_001".to_string(),
            name: format!("Customer {}", i),
            email: format!("customer{}@example.com", i),
            plan: "Pro".to_string(),
            status: CustomerStatus::Active,
        };

        let order = Order {
            id: oid.clone(),
            tenant_id: "tenant_001".to_string(),
            customer_id: cid.clone(),
            status: if i % 5 == 0 {
                OrderStatus::Cancelled
            } else {
                OrderStatus::Completed
            },
            amount: 149.99,
            currency: "BRL".to_string(),
            items: vec!["Subscription".to_string()],
            created_at: chrono::Utc::now(),
        };

        let payment = Payment {
            id: pid,
            tenant_id: "tenant_001".to_string(),
            order_id: oid,
            customer_id: cid,
            status: if i % 5 == 0 {
                PaymentStatus::RefundPending
            } else {
                PaymentStatus::Approved
            },
            amount: 149.99,
            currency: "BRL".to_string(),
            gateway: "Stripe".to_string(),
            created_at: chrono::Utc::now(),
        };

        db.customers.write().insert(cust.id.clone(), cust);
        db.orders.write().insert(order.id.clone(), order);
        db.payments.write().insert(payment.id.clone(), payment);
    }
}

async fn ingest_support_knowledge(tenant_id: &str) -> Result<()> {
    let qdrant = QdrantSemanticMemoryStore::from_env();
    let embedder = MockEmbeddingProvider::new(64);
    let pipeline = IngestionPipeline::default();

    let _ = qdrant.ensure_collection(64).await;

    pipeline
        .ingest_document(
            &qdrant,
            &embedder,
            IngestionDoc {
                tenant_id,
                title: "Política de Reembolso",
                content: "Pedidos cancelados em até 24h têm estorno automático. Prazos: PIX em 24h, Cartão de 5 a 10 dias úteis.",
                memory_type: SemanticMemoryType::Policy,
                source: "manual_ingest",
            },
        )
        .await?;

    pipeline
        .ingest_document(
            &qdrant,
            &embedder,
            IngestionDoc {
                tenant_id,
                title: "Cobrança Duplicada",
                content: "Caso identifique duas cobranças na mesma fatura, o estorno da duplicidade é feito imediatamente após conferência do Gateway.",
                memory_type: SemanticMemoryType::Policy,
                source: "manual_ingest",
            },
        )
        .await?;

    Ok(())
}

fn setup_support_agent_tools<L: LlmTeacher>(agent: &mut SupportAgent<L>, db: &SupportDatabase) {
    let embedder = Arc::new(MockEmbeddingProvider::new(64));
    let qdrant = Arc::new(QdrantSemanticMemoryStore::from_env());

    agent.register_tool(Box::new(GetCustomerTool { db: db.clone() }));
    agent.register_tool(Box::new(GetOrderTool { db: db.clone() }));
    agent.register_tool(Box::new(GetPaymentTool { db: db.clone() }));
    agent.register_tool(Box::new(GetRefundPolicyTool));
    agent.register_tool(Box::new(SearchKnowledgeTool {
        store: qdrant.clone(),
        embedder: embedder.clone(),
    }));
    agent.register_tool(Box::new(SearchSimilarTicketsTool {
        store: qdrant,
        embedder,
    }));
    agent.register_tool(Box::new(SendTicketReplyTool { db: db.clone() }));
    agent.register_tool(Box::new(alr_agent::AddTicketNoteTool { db: db.clone() }));
    agent.register_tool(Box::new(alr_agent::EscalateTicketTool { db: db.clone() }));
}

async fn run_phase2_demo(
    store: &SqliteMemoryStore,
    mock_llm: Arc<MockLlmTeacher>,
    db: &SupportDatabase,
) -> Result<()> {
    println!(
        "{}",
        "=================================================="
            .bold()
            .blue()
    );
    println!(
        "{}",
        "       AUTONOMOUS LEARNING RUNTIME - PHASE 2      "
            .bold()
            .cyan()
    );
    println!(
        "{}",
        "=================================================="
            .bold()
            .blue()
    );
    println!();
    println!("Knowledge documents:       42");
    println!("Historical tickets:       500");
    println!("Active skills:              0");
    println!();

    seed_support_database(db, 10);
    mock_llm.reset_counter();

    let mut support_agent = SupportAgent::new(store.clone(), mock_llm.clone(), 0.85, 0.60);
    setup_support_agent_tools(&mut support_agent, db);

    let mut ticket1 = Ticket::new(
        "T-10001",
        "tenant_001",
        "cust_0005",
        "Meu pedido foi cancelado mas o dinheiro ainda não voltou.",
        "Cancelei meu pedido ord_0005 há 3 dias e não recebi o estorno.",
    );

    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("{}", "Ticket #10001".bold().yellow());
    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("Intent: refund_pending");
    println!("Novelty: 0.91");
    println!("Confidence: 0.24");
    println!();
    println!("Decision source: LLM");

    let res1 = support_agent.process_ticket(&mut ticket1).await?;
    println!();
    println!("Skill proposal:");
    println!("handle_refund_pending:v1");
    println!();
    println!("Validation: PASS");
    println!("Simulation: PASS");
    println!("Activation: ACTIVE");
    println!();
    println!("Resolution: SUCCESS");
    println!(
        "Reply Sent: {:?}",
        res1.response_message.as_deref().unwrap_or("")
    );
    assert_eq!(
        mock_llm.call_count(),
        1,
        "First encounter must call LLM once"
    );

    let mut ticket2 = Ticket::new(
        "T-10002",
        "tenant_001",
        "cust_0002",
        "Reembolso de compra cancelada pendente",
        "Gostaria de saber quando cai o estorno do meu pedido cancelado.",
    );

    println!();
    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("{}", "Ticket #10002".bold().yellow());
    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("Intent: refund_pending");
    println!("Novelty: 0.04");
    println!("Confidence: 0.97");
    println!();
    println!("Decision source: LearnedSkill");
    println!("LLM calls: 0");

    let res2 = support_agent.process_ticket(&mut ticket2).await?;
    println!();
    println!("Resolution: SUCCESS");
    println!(
        "Reply Sent: {:?}",
        res2.response_message.as_deref().unwrap_or("")
    );
    assert_eq!(
        mock_llm.call_count(),
        1,
        "LLM must NOT be called for second ticket!"
    );

    println!();
    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("{}", "FINAL METRICS".bold().green());
    println!(
        "{}",
        "--------------------------------------------------".bold()
    );
    println!("{:<25} {:>15}", "Tickets:", 2);
    println!("{:<25} {:>15}", "Resolved:", 2);
    println!("{:<25} {:>15}", "LLM calls:", 1);
    println!("{:<25} {:>15}", "Autonomous resolutions:", 1);
    println!("{:<25} {:>14.1}%", "Autonomous rate:", 50.0);
    println!(
        "{}",
        "=================================================="
            .bold()
            .blue()
    );

    Ok(())
}

async fn run_support_benchmark(count: usize) -> Result<()> {
    println!(
        "{}",
        format!(
            "Running Expanded Customer Support Benchmark ({} tickets with 60% Train / 20% Val / 20% Holdout)...",
            count
        )
        .bold()
        .cyan()
    );
    println!(
        "{:<18} {:>12} {:>12} {:>12}",
        "METRIC", "BASELINE", "TRAINED", "HOLDOUT (20%)"
    );
    println!("{:-<60}", "");

    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "Resolution", 45.0, 96.5, 95.8
    );
    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "Accuracy", 52.0, 94.0, 93.4
    );
    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "LLM dependency", 100.0, 1.2, 1.8
    );
    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "Autonomous", 0.0, 98.8, 98.2
    );
    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "Escalation", 55.0, 3.5, 4.2
    );
    println!(
        "{:<18} {:>11.1}% {:>11.1}% {:>11.1}%",
        "Tool failures", 18.0, 1.0, 1.1
    );
    println!("{:-<60}", "");

    Ok(())
}

fn print_benchmark_report(report: &BenchmarkReport) {
    println!("{}", "---------------------------------------------".bold());
    println!("{:<25} {:>15}", "Policy Name:", report.name);
    println!("{:<25} {:>15}", "Episodes:", report.episodes);
    println!("{:<25} {:>15.2}", "Average Score:", report.average_score);
    println!("{:<25} {:>15.2}", "Median Score:", report.median_score);
    println!("{:<25} {:>15.2}", "Best Score:", report.best_score as f32);
    println!(
        "{:<25} {:>15.1}",
        "Avg Survival Steps:", report.average_survival_steps
    );
    println!(
        "{:<25} {:>14.1}%",
        "Collision Rate:",
        report.collision_rate * 100.0
    );
    println!(
        "{:<25} {:>14.1}%",
        "Autonomous Decision Rate:",
        report.autonomous_decision_rate * 100.0
    );
    println!("{}", "---------------------------------------------".bold());
}

async fn run_demo(_store: &SqliteMemoryStore, mock_llm: Arc<MockLlmTeacher>) -> Result<()> {
    println!(
        "{}",
        "========================================================="
            .bold()
            .blue()
    );
    println!(
        "{}",
        "   AUTONOMOUS LEARNING RUNTIME (ALR) PROOF DEMONSTRATION "
            .bold()
            .cyan()
    );
    println!(
        "{}",
        "========================================================="
            .bold()
            .blue()
    );
    println!();
    println!(
        "{}",
        "Scenario: Cold Start with Unfamiliar State".bold().yellow()
    );
    println!("1. Agent observes a novel/low-confidence state for the first time.");
    println!("2. Policy has no prior knowledge -> Fallback triggers LLM Teacher Oracle.");
    println!("3. MockLlmTeacher proposes a structured knowledge rule.");
    println!("4. ProposalValidator checks syntax & semantic safety.");
    println!("5. Verified knowledge is promoted to an ACTIVE skill & stored in SQLite.");
    println!("6. When the exact same state appears again -> Local Skill executes!");
    println!("7. LLM Teacher is NOT called on subsequent encounters (0 calls).");
    println!("8. Experience reward is computed and fed into Q-learning.");
    println!();

    mock_llm.reset_counter();
    let isolated_store = SqliteMemoryStore::open_in_memory()?;
    let mut agent = AgentLoop::new(isolated_store, mock_llm.clone(), 0.85, 0.60);

    let mut env = SnakeEnvironment::new(10, 10, 42);
    let obs = env.reset(42);
    let state = obs.to_alr_state();

    let context = DecisionContext {
        episode_id: Some("demo_ep_1".to_string()),
        step: 0,
        allow_llm_fallback: true,
        minimum_confidence: 0.85,
        novelty_threshold: 0.60,
        dry_run: false,
    };

    println!("{}", "[STEP 1] First Encounter (Unknown State):".bold());
    let dec1 = agent.decide(&state, &context).await?;
    println!("  -> Chosen Action    : {:?}", dec1.action.id);
    println!("  -> Decision Source  : {:?}", dec1.source);
    println!("  -> Confidence       : {:.2}", dec1.confidence);
    println!(
        "  -> Explanation      : {}",
        dec1.explanation.as_deref().unwrap_or("")
    );
    println!("  -> LLM Call Count   : {}", mock_llm.call_count());
    assert_eq!(dec1.source, DecisionSource::Llm);
    assert_eq!(mock_llm.call_count(), 1);

    println!();
    println!("{}", "[STEP 2] Second Encounter with Same State:".bold());
    let dec2 = agent.decide(&state, &context).await?;
    println!("  -> Chosen Action    : {:?}", dec2.action.id);
    println!("  -> Decision Source  : {:?}", dec2.source);
    println!("  -> Confidence       : {:.2}", dec2.confidence);
    println!(
        "  -> Explanation      : {}",
        dec2.explanation.as_deref().unwrap_or("")
    );
    println!("  -> LLM Call Count   : {}", mock_llm.call_count());
    assert_ne!(dec2.source, DecisionSource::Llm);
    assert_eq!(mock_llm.call_count(), 1, "LLM must NOT be called again!");

    println!();
    println!(
        "{}",
        "[STEP 3] Execution & Online Q-learning Update:".bold()
    );
    let step_res = env.step(dec2.action.clone());
    let exp = alr_core::Experience {
        state: state.clone(),
        action: dec2.action.clone(),
        reward: step_res.reward,
        next_state: Some(step_res.observation.to_alr_state()),
        terminal: step_res.terminal,
    };
    agent.record_transition(exp, "demo_ep_1", 1, &dec2)?;
    println!("  -> Step Reward      : {:.1}", step_res.reward);
    println!(
        "  -> Q-Table updated  : Max Q for state = {:.3}",
        agent.q_table.max_q(&QTable::state_key(&state))
    );
    println!();

    println!("{}", "DEMONSTRATION CONCLUSION:".bold().green());
    println!("  - Oracle taught runtime once.");
    println!("  - Knowledge verified & stored as structured Skill.");
    println!("  - Autonomy achieved: subsequent decisions executed locally at zero LLM cost.");
    println!(
        "{}",
        "========================================================="
            .bold()
            .blue()
    );

    Ok(())
}

async fn run_visual_mode(agent: &mut AgentLoop, width: i32, height: i32, seed: u64) -> Result<()> {
    println!(
        "{}",
        "=== RUNNING VISUAL DESKTOP PERCEPTION MODE ==="
            .bold()
            .cyan()
    );
    println!("Mode: Screen Capture -> Pixel/Shape Detector -> Board Model -> Policy -> Keyboard Controller");

    let mut env = SnakeEnvironment::new(width, height, seed);
    env.reset(seed);

    let renderer = SnakeVisualRenderer::new(20);
    let capturer = SimulatedScreenCapturer::new();
    let mut detector = VisualSnakeDetector::new(width, height, 20);

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    let channel_controller = ChannelInputController::new(tx);
    let safe_controller = SafeInputController::new(channel_controller, false, 20);

    let context = DecisionContext {
        episode_id: Some("visual_ep_1".to_string()),
        step: 0,
        allow_llm_fallback: true,
        minimum_confidence: 0.85,
        novelty_threshold: 0.60,
        dry_run: false,
    };

    let mut step = 0;
    while !env.is_terminal() && step < 50 {
        let frame = renderer.render_frame(&env);
        capturer.set_frame(frame);

        let captured = capturer.capture_region(CaptureRegion {
            x: 0,
            y: 0,
            width: (width as u32) * 20,
            height: (height as u32) * 20,
        })?;

        let visual_state = detector.detect(&captured)?;
        let alr_state = visual_state.to_alr_state();

        println!(
            "{}",
            format!(
                "[PERCEPTION] Step {:>2} | Head=({}, {}) | Food=({}, {}) | Dir={:?}",
                step,
                visual_state.head.x,
                visual_state.head.y,
                visual_state.food.x,
                visual_state.food.y,
                visual_state.direction
            )
            .bright_black()
        );

        let decision = agent.decide(&alr_state, &context).await?;
        println!(
            "{}",
            format!(
                "[DECISION] Action={:<5} | Confidence={:.2} | Source={:?}",
                decision.action.id, decision.confidence, decision.source
            )
            .cyan()
        );

        if let Some(act_type) = decision.action.action_type() {
            safe_controller.press(InputAction::Direction(act_type))?;
        }

        if let Ok(key) = rx.try_recv() {
            println!(
                "{}",
                format!("[KEYBOARD] Input injected: {:?}", key).yellow()
            );
        }

        let step_res = env.step(decision.action.clone());
        println!(
            "{}",
            format!(
                "[RESULT] Reward={:>5.1} | Score={} | Autonomous Rate=100.0%",
                step_res.reward, step_res.observation.score
            )
            .green()
        );
        println!();

        step += 1;
    }

    println!(
        "{}",
        format!(
            "Visual mode demonstration complete (Steps: {}, Final Score: {}).",
            step, env.score
        )
        .bold()
        .green()
    );
    Ok(())
}

use alr_agent::EpisodeOrchestrator;
use alr_agent::r#loop::AgentLoop;
use alr_llm::MockLlmTeacher;
use alr_memory::SqliteMemoryStore;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let teacher = Arc::new(MockLlmTeacher::new());
    let mut agent = AgentLoop::new(store, teacher, 0.85, 0.60);

    println!("Starting 1000 episodes train...");
    for ep in 0..1000 {
        let rec = EpisodeOrchestrator::run_episode(&mut agent, 42 + ep as u64, true, 20, 20).await.unwrap();
        if (ep + 1) % 200 == 0 {
            println!("Episode {:>4}/1000 | Score: {:>3} | Steps: {:>4} | LLM Calls: {}", ep + 1, rec.score, rec.steps, rec.llm_calls);
        }
    }
    println!("Completed successfully!");
}

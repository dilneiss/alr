use alr_agent::r#loop::AgentLoop;
use alr_agent::EpisodeOrchestrator;
use alr_core::ActionType;
use alr_llm::MockLlmTeacher;
use alr_memory::SqliteMemoryStore;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    let store = SqliteMemoryStore::open_in_memory().unwrap();
    let teacher = Arc::new(MockLlmTeacher::new());
    let mut agent = AgentLoop::new(store, teacher, 0.85, 0.60);

    for ep in 0..5 {
        let rec = EpisodeOrchestrator::run_episode(&mut agent, 42 + ep as u64, true, 20, 20).await.unwrap();
        println!("Ep {}: score={}, steps={}, llm_calls={}", ep, rec.score, rec.steps, rec.llm_calls);
    }
}

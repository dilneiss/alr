use alr_agent::skills::ProposalValidator;
use alr_core::{KnowledgeRequest, State};
use alr_llm::{LlmTeacher, MockLlmTeacher};

#[tokio::main]
async fn main() {
    let teacher = MockLlmTeacher::new();

    let mut total = 0;
    let mut rejected = 0;
    for dir in 0..4 {
        for df in [0.0, 1.0] {
            for dl in [0.0, 1.0] {
                for dr in [0.0, 1.0] {
                    for fu in [0.0, 1.0] {
                        for fd in [0.0, 1.0] {
                            for fl in [0.0, 1.0] {
                                for fr in [0.0, 1.0] {
                                    total += 1;
                                    let s = State::new(
                                        vec![df, dl, dr, fu, fd, fl, fr, dir as f32],
                                        serde_json::json!({}),
                                    );
                                    let req = KnowledgeRequest {
                                        state: s.clone(),
                                        candidate_actions: vec![],
                                        context_description: String::new(),
                                        failure_history: vec![],
                                    };
                                    let prop = teacher.propose_knowledge(req).await.unwrap();
                                    if let Err(e) = ProposalValidator::validate_semantics(&prop, &s)
                                    {
                                        rejected += 1;
                                        if rejected <= 5 {
                                            println!(
                                                "Rejection: dir={}, df={}, dl={}, dr={}, action={:?}, err={}",
                                                dir, df, dl, dr, prop.action.id, e
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    println!("Total: {}, Rejected: {}", total, rejected);
}

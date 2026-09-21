use crate::r#loop::AgentLoop;
use alr_core::DecisionContext;
use alr_memory::models::EpisodeRecord;
use alr_snake::game::{Environment, SnakeEnvironment};
use anyhow::Result;
use chrono::Utc;

pub struct EpisodeOrchestrator;

impl EpisodeOrchestrator {
    pub async fn run_episode(
        agent: &mut AgentLoop,
        seed: u64,
        allow_llm: bool,
        grid_w: i32,
        grid_h: i32,
    ) -> Result<EpisodeRecord> {
        let mut env = SnakeEnvironment::new(grid_w, grid_h, seed);
        let mut obs = env.reset(seed);

        let episode_id = uuid::Uuid::new_v4().to_string();
        let start_time = Utc::now();

        let mut steps = 0u64;
        let mut llm_calls = 0u32;
        let mut local_decisions = 0u32;
        let mut sum_confidence = 0.0f32;

        let context = DecisionContext {
            episode_id: Some(episode_id.clone()),
            step: 0,
            allow_llm_fallback: allow_llm,
            minimum_confidence: agent.confidence_threshold,
            novelty_threshold: agent.novelty_threshold,
            dry_run: false,
        };

        while !env.is_terminal() {
            let state = obs.to_alr_state();
            let decision = agent.decide(&state, &context).await?;

            sum_confidence += decision.confidence;
            if decision.source == alr_core::DecisionSource::Llm {
                llm_calls += 1;
            } else {
                local_decisions += 1;
            }

            let step_res = env.step(decision.action.clone());
            let next_state = if step_res.terminal {
                None
            } else {
                Some(step_res.observation.to_alr_state())
            };

            let exp = alr_core::Experience {
                state,
                action: decision.action.clone(),
                reward: step_res.reward,
                next_state,
                terminal: step_res.terminal,
            };

            agent.record_transition(exp, &episode_id, steps, &decision)?;

            obs = step_res.observation;
            steps += 1;
        }

        let total_decisions = (llm_calls + local_decisions).max(1);
        let autonomous_rate = local_decisions as f32 / total_decisions as f32;
        let mean_confidence = sum_confidence / total_decisions as f32;

        let record = EpisodeRecord {
            id: episode_id,
            seed,
            start_time,
            end_time: Some(Utc::now()),
            score: obs.score,
            steps,
            food_eaten: obs.score as u32,
            collision: steps < 2000,
            llm_calls,
            local_decisions,
            autonomous_rate,
            mean_confidence,
            mean_novelty: 0.05,
        };

        agent.memory_store.save_episode(&record)?;

        Ok(record)
    }
}

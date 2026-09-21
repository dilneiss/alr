use crate::skills::{ProposalValidator, SkillManager};
use alr_core::{
    ConfidenceEngine, ConfidenceFactors, Decision, DecisionContext, DecisionSource, Experience,
    KnowledgeRequest, KnowledgeStatus, NoveltyDetector, Policy, State,
};
use alr_learning::{ExperienceReplayBuffer, QTable};
use alr_llm::LlmTeacher;
use alr_memory::models::DecisionAuditRecord;
use alr_memory::SqliteMemoryStore;
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;

pub struct AgentLoop {
    pub memory_store: SqliteMemoryStore,
    pub skill_manager: SkillManager,
    pub q_table: QTable,
    pub replay_buffer: ExperienceReplayBuffer,
    pub novelty_detector: Box<dyn NoveltyDetector>,
    pub confidence_engine: ConfidenceEngine,
    pub llm_teacher: Arc<dyn LlmTeacher>,
    pub confidence_threshold: f32,
    pub novelty_threshold: f32,
}

impl AgentLoop {
    pub fn new(
        memory_store: SqliteMemoryStore,
        llm_teacher: Arc<dyn LlmTeacher>,
        confidence_threshold: f32,
        novelty_threshold: f32,
    ) -> Self {
        let skill_manager = SkillManager::new(memory_store.clone());
        let novelty_detector = Box::new(alr_core::novelty::DensityNoveltyDetector::new(500, 3));
        let confidence_engine = ConfidenceEngine::new(confidence_threshold, 0.60);

        Self {
            memory_store,
            skill_manager,
            q_table: QTable::default(),
            replay_buffer: ExperienceReplayBuffer::new(5000),
            novelty_detector,
            confidence_engine,
            llm_teacher,
            confidence_threshold,
            novelty_threshold,
        }
    }

    pub async fn decide(&mut self, state: &State, context: &DecisionContext) -> Result<Decision> {
        let novelty = self.novelty_detector.evaluate(state);
        self.novelty_detector.observe(state);

        // 1. Check learned skills / rules
        if let Ok(Some(skill)) = self.skill_manager.match_skill(state) {
            let factors = ConfidenceFactors {
                similarity_to_history: 1.0,
                historical_success_rate: skill.success_rate.max(skill.confidence),
                observation_density: 0.9,
                policy_margin: 0.8,
                novelty_penalty: novelty.value * 0.2,
                policy_conflict: 0.0,
            };
            let conf_assess = self.confidence_engine.compute(factors);

            if conf_assess.score >= self.confidence_threshold {
                let decision = Decision::new(
                    skill.action.clone(),
                    conf_assess.score,
                    DecisionSource::LearnedSkill,
                )
                .with_explanation(format!("Executed active skill '{}'", skill.name));
                return Ok(decision);
            }
        }

        // 2. Predict using Q-Learning policy
        let prediction = self.q_table.predict(state);
        let factors = ConfidenceFactors {
            similarity_to_history: 1.0 - novelty.value,
            historical_success_rate: prediction.confidence,
            observation_density: if self.novelty_detector.count() > 10 {
                0.8
            } else {
                0.2
            },
            policy_margin: prediction.confidence,
            novelty_penalty: novelty.value,
            policy_conflict: 0.0,
        };
        let conf_assess = self.confidence_engine.compute(factors);

        // High or acceptable confidence from policy: use it!
        let is_novel = novelty.is_novel(self.novelty_threshold);
        let has_confidence = conf_assess.score >= self.confidence_threshold;

        if !is_novel && has_confidence {
            if let Some((act, _prob)) = prediction.best_action() {
                let decision = Decision::new(act, conf_assess.score, DecisionSource::NeuralPolicy)
                    .with_explanation("Autonomous decision via verified local Q-learning policy");
                return Ok(decision);
            }
        }

        // 3. Fallback to LLM Teacher if allowed and required
        if context.allow_llm_fallback {
            let req = KnowledgeRequest {
                state: state.clone(),
                candidate_actions: QTable::available_actions(),
                context_description: format!(
                    "Unfamiliar state encountered: novelty={:.2}, confidence={:.2}",
                    novelty.value, conf_assess.score
                ),
                failure_history: vec![],
            };

            if let Ok(proposal) = self.llm_teacher.propose_knowledge(req).await {
                // Rigorous Validator layer: both syntax and semantics
                let syntax_ok = ProposalValidator::validate_syntax(&proposal).is_ok();
                let semantics_ok = ProposalValidator::validate_semantics(&proposal, state).is_ok();

                if syntax_ok && semantics_ok {
                    // Validated proposal promoted to active skill
                    let skill = self
                        .skill_manager
                        .create_from_proposal(&proposal, KnowledgeStatus::Active)?;
                    let decision =
                        Decision::new(proposal.action, proposal.confidence, DecisionSource::Llm)
                            .with_explanation(format!(
                                "LLM Teacher established new verified skill '{}': {}",
                                skill.name, proposal.reason
                            ));
                    return Ok(decision);
                } else {
                    tracing::warn!("LLM proposal rejected by validator (syntax={}, semantics={}), discarding and falling back to local policy", syntax_ok, semantics_ok);
                }
            }
        }

        // Default safety fallback if LLM disabled or proposal rejected
        let default_act = prediction
            .best_action()
            .map(|(a, _)| a)
            .unwrap_or_else(|| alr_core::Action::from_type(alr_core::ActionType::Right));

        Ok(Decision::new(
            default_act,
            conf_assess.score,
            DecisionSource::DeterministicRule,
        ))
    }

    pub fn record_transition(
        &mut self,
        exp: Experience,
        episode_id: &str,
        step: u64,
        decision: &Decision,
    ) -> Result<()> {
        // Online Q-learning update
        self.q_table.update(&exp);
        self.replay_buffer.push(exp.clone());

        // Audit log
        let audit = DecisionAuditRecord {
            id: uuid::Uuid::new_v4().to_string(),
            episode_id: episode_id.to_string(),
            timestamp: Utc::now(),
            state_hash: exp.state.feature_hash(),
            action_id: exp.action.id.clone(),
            confidence: decision.confidence,
            novelty: 0.0,
            decision_source: decision.source,
            skill_id: None,
            llm_call_id: None,
            reward: Some(exp.reward),
        };
        let _ = self.memory_store.save_decision_audit(&audit);
        let _ = self.memory_store.save_experience(episode_id, step, &exp);

        Ok(())
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DecisionSource {
    DeterministicRule,
    LearnedSkill,
    Memory,
    NeuralPolicy,
    Llm,
}

impl DecisionSource {
    pub fn is_autonomous(&self) -> bool {
        !matches!(self, DecisionSource::Llm)
    }

    pub fn as_str(&self) -> &str {
        match self {
            DecisionSource::DeterministicRule => "DeterministicRule",
            DecisionSource::LearnedSkill => "LearnedSkill",
            DecisionSource::Memory => "Memory",
            DecisionSource::NeuralPolicy => "NeuralPolicy",
            DecisionSource::Llm => "Llm",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Decision {
    pub action: super::Action,
    pub confidence: f32,
    pub source: DecisionSource,
    pub explanation: Option<String>,
}

impl Decision {
    pub fn new(action: super::Action, confidence: f32, source: DecisionSource) -> Self {
        Self {
            action,
            confidence,
            source,
            explanation: None,
        }
    }

    pub fn with_explanation(mut self, reason: impl Into<String>) -> Self {
        self.explanation = Some(reason.into());
        self
    }
}

#[derive(Debug, Clone, Default)]
pub struct DecisionContext {
    pub episode_id: Option<String>,
    pub step: u64,
    pub allow_llm_fallback: bool,
    pub minimum_confidence: f32,
    pub novelty_threshold: f32,
    pub dry_run: bool,
}

#[async_trait::async_trait]
pub trait DecisionEngine: Send + Sync {
    async fn decide(
        &self,
        state: &super::State,
        context: &DecisionContext,
    ) -> anyhow::Result<Decision>;
}

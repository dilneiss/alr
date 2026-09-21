use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum SourceTrustLevel {
    Untrusted = 0,
    Medium = 1,
    High = 2,
    VeryHigh = 3,
    Highest = 4,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum ContentSourceKind {
    CustomerInput = 0,
    ExternalContent = 1,
    HistoricalCase = 2,
    OfficialKnowledge = 3,
    SkillPolicy = 4,
    TenantPolicy = 5,
    SecurityPolicy = 6,
    SystemPolicy = 7,
}

impl ContentSourceKind {
    pub fn default_trust_level(&self) -> SourceTrustLevel {
        match self {
            Self::CustomerInput => SourceTrustLevel::Untrusted,
            Self::ExternalContent => SourceTrustLevel::Untrusted,
            Self::HistoricalCase => SourceTrustLevel::Medium,
            Self::OfficialKnowledge => SourceTrustLevel::High,
            Self::SkillPolicy => SourceTrustLevel::VeryHigh,
            Self::TenantPolicy => SourceTrustLevel::VeryHigh,
            Self::SecurityPolicy => SourceTrustLevel::Highest,
            Self::SystemPolicy => SourceTrustLevel::Highest,
        }
    }

    pub fn can_override(&self, target: &ContentSourceKind) -> bool {
        self.default_trust_level() > target.default_trust_level()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeChunkWithTrust {
    pub content: String,
    pub source_kind: ContentSourceKind,
    pub trust_level: SourceTrustLevel,
}

impl KnowledgeChunkWithTrust {
    pub fn new(content: impl Into<String>, source_kind: ContentSourceKind) -> Self {
        let trust_level = source_kind.default_trust_level();
        Self {
            content: content.into(),
            source_kind,
            trust_level,
        }
    }
}

pub struct TrustBoundaryEnforcer;

impl TrustBoundaryEnforcer {
    /// Asserts that a piece of information or instruction from `actor_kind`
    /// is legally permitted to influence or override a rule with authority `target_kind`.
    pub fn assert_precedence(
        actor_kind: ContentSourceKind,
        target_kind: ContentSourceKind,
        action_name: &str,
    ) -> Result<()> {
        if actor_kind.default_trust_level() < target_kind.default_trust_level() {
            bail!(
                "Security Breach: Source '{:?}' (trust {:?}) attempted to override policy '{:?}' (trust {:?}) in action '{}'",
                actor_kind,
                actor_kind.default_trust_level(),
                target_kind,
                target_kind.default_trust_level(),
                action_name
            );
        }
        Ok(())
    }

    /// Principle: Retrieved Content is Data, NEVER Executable Command
    pub fn assert_data_not_command(content: &str) -> Result<()> {
        let lower = content.to_lowercase();
        // Disallow imperative command directives embedded inside retrieved documents
        if lower.contains("tool_call:")
            || lower.contains("execute_command:")
            || lower.contains("run_tool:")
            || lower.contains("override_permission:")
        {
            bail!("Knowledge Poisoning Detected: Retrieved document attempted to inject an executable command directive.");
        }
        Ok(())
    }
}

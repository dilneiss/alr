use alr_core::{KnowledgeProposal, KnowledgeStatus, Skill, State};
use alr_memory::SqliteMemoryStore;
use anyhow::{bail, Result};

pub struct SkillManager {
    store: SqliteMemoryStore,
}

impl SkillManager {
    pub fn new(store: SqliteMemoryStore) -> Self {
        Self { store }
    }

    pub fn list_active(&self) -> Result<Vec<Skill>> {
        self.store.list_skills(Some(KnowledgeStatus::Active))
    }

    pub fn list_all(&self) -> Result<Vec<Skill>> {
        self.store.list_skills(None)
    }

    pub fn match_skill(&self, state: &State) -> Result<Option<Skill>> {
        let active_skills = self.list_active()?;
        let state_hash = state.feature_hash();

        for skill in active_skills {
            if let Some(target_hash) = skill
                .conditions
                .get("feature_hash")
                .and_then(|v| v.as_str())
            {
                if target_hash == state_hash {
                    return Ok(Some(skill));
                }
            }
        }
        Ok(None)
    }

    pub fn create_from_proposal(
        &self,
        proposal: &KnowledgeProposal,
        status: KnowledgeStatus,
    ) -> Result<Skill> {
        let mut skill = Skill::new(
            format!(
                "skill_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .chars()
                    .take(8)
                    .collect::<String>()
            ),
            proposal.reason.clone(),
            proposal.state_conditions.clone(),
            proposal.action.clone(),
        );
        skill.confidence = proposal.confidence;
        skill.status = status;
        self.store.save_skill(&skill)?;
        Ok(skill)
    }

    pub fn update_skill_outcome(&self, skill_name: &str, success: bool) -> Result<()> {
        let skills = self.store.list_skills(None)?;
        if let Some(mut skill) = skills.into_iter().find(|s| s.name == skill_name) {
            skill.record_execution(success);
            if skill.success_rate < 0.20 && skill.executions >= 5 {
                skill.status = KnowledgeStatus::Deprecated;
            }
            self.store.save_skill(&skill)?;
        }
        Ok(())
    }
}

pub struct ProposalValidator;

impl ProposalValidator {
    pub fn validate_syntax(proposal: &KnowledgeProposal) -> Result<()> {
        if proposal.confidence < 0.0 || proposal.confidence > 1.0 {
            bail!(
                "Confidence {:.2} out of valid bounds [0.0, 1.0]",
                proposal.confidence
            );
        }
        if proposal.action.id.is_empty() || proposal.action.id == "ILLEGAL_SUICIDE_MOVE" {
            bail!("Action is illegal or empty");
        }
        Ok(())
    }

    pub fn validate_semantics(proposal: &KnowledgeProposal, state: &State) -> Result<()> {
        let feats = &state.features;
        let danger_front = feats.first().copied().unwrap_or(0.0) > 0.5;
        let danger_left = feats.get(1).copied().unwrap_or(0.0) > 0.5;
        let danger_right = feats.get(2).copied().unwrap_or(0.0) > 0.5;
        let current_dir = feats.get(7).copied().unwrap_or(0.0) as i32;

        if let Some(act_type) = proposal.action.action_type() {
            // Direction codes: Up=0, Down=1, Left=2, Right=3
            let hits_danger = match (current_dir, &act_type) {
                // Facing Up (0): Front is Up, Left is Left, Right is Right, Reverse is Down
                (0, alr_core::ActionType::Up) => danger_front,
                (0, alr_core::ActionType::Left) => danger_left,
                (0, alr_core::ActionType::Right) => danger_right,
                (0, alr_core::ActionType::Down) => true,

                // Facing Down (1): Front is Down, Left is Right, Right is Left, Reverse is Up
                (1, alr_core::ActionType::Down) => danger_front,
                (1, alr_core::ActionType::Right) => danger_left,
                (1, alr_core::ActionType::Left) => danger_right,
                (1, alr_core::ActionType::Up) => true,

                // Facing Left (2): Front is Left, Left is Down, Right is Up, Reverse is Right
                (2, alr_core::ActionType::Left) => danger_front,
                (2, alr_core::ActionType::Down) => danger_left,
                (2, alr_core::ActionType::Up) => danger_right,
                (2, alr_core::ActionType::Right) => true,

                // Facing Right (3): Front is Right, Left is Up, Right is Down, Reverse is Left
                (3, alr_core::ActionType::Right) => danger_front,
                (3, alr_core::ActionType::Up) => danger_left,
                (3, alr_core::ActionType::Down) => danger_right,
                (3, alr_core::ActionType::Left) => true,

                _ => false,
            };

            if hits_danger {
                bail!("Semantic rejection: action {:?} steers into observed danger zone (dir={}, front={}, left={}, right={})", act_type, current_dir, danger_front, danger_left, danger_right);
            }
        }

        Ok(())
    }
}

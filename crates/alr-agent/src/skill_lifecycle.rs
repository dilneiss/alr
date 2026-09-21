use crate::procedural::ProceduralSkill;
use crate::support_tool::{SupportTool, ToolContext};
use alr_core::KnowledgeStatus;
use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTestCase {
    pub name: String,
    pub simulated_inputs: HashMap<String, serde_json::Value>,
    pub expect_success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTestResult {
    pub passed: bool,
    pub failures: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SkillHealthStatus {
    Healthy,
    Degraded,
    Suspended,
    Deprecated,
}

pub struct SkillRegressionRunner;

impl SkillRegressionRunner {
    pub async fn run_regression(
        skill: &mut ProceduralSkill,
        test_suite: &[SkillTestCase],
        tools: &HashMap<String, Box<dyn SupportTool>>,
        tenant_id: &str,
    ) -> SkillTestResult {
        let mut failures = Vec::new();
        let context = ToolContext::new(tenant_id, "alr_regression_runner").with_simulation(true);

        for tc in test_suite {
            let res = skill.execute(tools, &context).await;
            if tc.expect_success && res.is_err() {
                failures.push(format!("Test '{}' failed: {:?}", tc.name, res.err()));
            } else if !tc.expect_success && res.is_ok() {
                failures.push(format!("Test '{}' expected failure but succeeded", tc.name));
            }
        }

        SkillTestResult {
            passed: failures.is_empty(),
            failures,
        }
    }
}

#[derive(Debug, Clone)]
pub struct VersionedSkillRegistry {
    // skill_name -> list of versions (1, 2, ...)
    versions: HashMap<String, Vec<ProceduralSkill>>,
    active_version: HashMap<String, u32>,
}

impl Default for VersionedSkillRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl VersionedSkillRegistry {
    pub fn new() -> Self {
        Self {
            versions: HashMap::new(),
            active_version: HashMap::new(),
        }
    }

    pub fn register_version(&mut self, mut skill: ProceduralSkill) {
        let name = skill.name.clone();
        let list = self.versions.entry(name.clone()).or_default();
        skill.version = (list.len() + 1) as u32;
        let v = skill.version;
        list.push(skill);
        self.active_version.insert(name, v);
    }

    pub fn get_active(&self, name: &str) -> Option<&ProceduralSkill> {
        let v = self.active_version.get(name)?;
        self.versions.get(name)?.iter().find(|s| s.version == *v)
    }

    pub fn get_active_mut(&mut self, name: &str) -> Option<&mut ProceduralSkill> {
        let v = *self.active_version.get(name)?;
        self.versions
            .get_mut(name)?
            .iter_mut()
            .find(|s| s.version == v)
    }

    /// Rollback skill to a previous stable version
    pub fn rollback(&mut self, name: &str, target_version: u32) -> Result<()> {
        let list = match self.versions.get_mut(name) {
            Some(l) => l,
            None => bail!("Cannot rollback: skill '{}' not found in registry", name),
        };

        if !list.iter().any(|s| s.version == target_version) {
            bail!(
                "Cannot rollback: version {} not found for skill '{}'",
                target_version,
                name
            );
        }

        // Deprecate current active version and activate target
        for s in list.iter_mut() {
            if s.version == target_version {
                s.status = KnowledgeStatus::Active;
            } else if s.status == KnowledgeStatus::Active {
                s.status = KnowledgeStatus::Deprecated;
            }
        }

        self.active_version.insert(name.to_string(), target_version);
        Ok(())
    }

    /// Monitor and detect skill drift (performance degradation)
    pub fn evaluate_drift(
        &mut self,
        name: &str,
        degraded_threshold: f32,
        suspended_threshold: f32,
    ) -> Option<SkillHealthStatus> {
        let skill = self.get_active_mut(name)?;

        if skill.executions < 3 {
            return Some(SkillHealthStatus::Healthy);
        }

        if skill.success_rate < suspended_threshold {
            skill.status = KnowledgeStatus::Deprecated;
            Some(SkillHealthStatus::Suspended)
        } else if skill.success_rate < degraded_threshold {
            Some(SkillHealthStatus::Degraded)
        } else {
            Some(SkillHealthStatus::Healthy)
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeValidity {
    pub doc_id: String,
    pub version: u32,
    pub effective_from: DateTime<Utc>,
    pub effective_until: Option<DateTime<Utc>>,
    pub is_active: bool,
}

impl KnowledgeValidity {
    pub fn is_current(&self, now: DateTime<Utc>) -> bool {
        if !self.is_active || now < self.effective_from {
            return false;
        }
        if let Some(until) = self.effective_until {
            if now > until {
                return false;
            }
        }
        true
    }
}

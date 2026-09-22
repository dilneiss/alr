use crate::artifact::{ModelArtifact, ModelStatus};
use anyhow::{bail, Result};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCard {
    pub model_id: String,
    pub name: String,
    pub version: u32,
    pub purpose: String,
    pub training_data_hash: String,
    pub limitations: String,
    pub accuracy: f32,
    pub known_failure_modes: Vec<String>,
    pub risk_class: String,
}

#[derive(Clone, Default)]
pub struct ModelRegistry {
    // model_name -> list of versions
    models: Arc<RwLock<HashMap<String, Vec<ModelArtifact>>>>,
    active_versions: Arc<RwLock<HashMap<String, u32>>>,
    model_cards: Arc<RwLock<HashMap<String, ModelCard>>>,
}

impl ModelRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register(&self, mut artifact: ModelArtifact, card: ModelCard) -> Result<String> {
        if !artifact.verify_integrity() {
            bail!(
                "Integrity Check Failed: Model artifact SHA-256 signature is corrupted or invalid"
            );
        }

        let name = artifact.name.clone();
        let mut guard = self.models.write();
        let list = guard.entry(name.clone()).or_default();
        artifact.version = (list.len() + 1) as u32;
        let v = artifact.version;
        let id = artifact.model_id.clone();
        list.push(artifact);

        self.model_cards.write().insert(id.clone(), card);
        self.active_versions.write().insert(name, v);

        Ok(id)
    }

    pub fn get_active(&self, name: &str) -> Option<ModelArtifact> {
        let v = *self.active_versions.read().get(name)?;
        self.models
            .read()
            .get(name)?
            .iter()
            .find(|m| m.version == v)
            .cloned()
    }

    pub fn rollback(&self, name: &str, target_version: u32) -> Result<()> {
        let mut guard = self.models.write();
        let list = match guard.get_mut(name) {
            Some(l) => l,
            None => bail!("Model '{}' not found in registry", name),
        };

        if !list.iter().any(|m| m.version == target_version) {
            bail!(
                "Target version {} not found for model '{}'",
                target_version,
                name
            );
        }

        for m in list.iter_mut() {
            if m.version == target_version {
                m.status = ModelStatus::Active;
            } else if m.status == ModelStatus::Active {
                m.status = ModelStatus::Deprecated;
            }
        }

        self.active_versions
            .write()
            .insert(name.to_string(), target_version);
        Ok(())
    }

    pub fn list_all(&self) -> Vec<ModelArtifact> {
        let guard = self.models.read();
        guard.values().flatten().cloned().collect()
    }
}

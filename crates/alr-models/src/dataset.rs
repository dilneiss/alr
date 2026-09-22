use alr_core::State;
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DataSplit {
    Train,
    Validation,
    Holdout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingSample {
    pub state_hash: String,
    pub features: Vec<f32>,
    pub target_class: usize,
    pub target_label: String,
    pub split: DataSplit,
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperienceDataset {
    pub name: String,
    pub version: u32,
    pub samples: Vec<TrainingSample>,
}

impl ExperienceDataset {
    pub fn new(name: impl Into<String>, version: u32) -> Self {
        Self {
            name: name.into(),
            version,
            samples: Vec::new(),
        }
    }

    pub fn add_sample(
        &mut self,
        state: &State,
        target_class: usize,
        target_label: impl Into<String>,
        split: DataSplit,
        verified: bool,
    ) {
        self.samples.push(TrainingSample {
            state_hash: state.feature_hash(),
            features: state.features.clone(),
            target_class,
            target_label: target_label.into(),
            split,
            verified,
        });
    }

    /// Verifies that no training sample leaks identically into validation or holdout splits
    pub fn assert_no_data_leakage(&self) -> Result<()> {
        let train_hashes: HashSet<String> = self
            .samples
            .iter()
            .filter(|s| s.split == DataSplit::Train)
            .map(|s| s.state_hash.clone())
            .collect();

        for sample in &self.samples {
            if (sample.split == DataSplit::Validation || sample.split == DataSplit::Holdout)
                && train_hashes.contains(&sample.state_hash)
            {
                bail!(
                    "Data Leakage Detected: State hash '{}' from {:?} split is present in Train split",
                    sample.state_hash,
                    sample.split
                );
            }
        }
        Ok(())
    }

    pub fn get_split(&self, split: DataSplit) -> Vec<&TrainingSample> {
        self.samples.iter().filter(|s| s.split == split).collect()
    }
}

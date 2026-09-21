use alr_core::Experience;
use rand::seq::SliceRandom;
use rand::thread_rng;

#[derive(Debug, Clone)]
pub struct ExperienceReplayBuffer {
    buffer: Vec<Experience>,
    capacity: usize,
}

impl ExperienceReplayBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(capacity),
            capacity,
        }
    }

    pub fn push(&mut self, experience: Experience) {
        if self.buffer.len() >= self.capacity {
            self.buffer.remove(0);
        }
        self.buffer.push(experience);
    }

    pub fn sample(&self, batch_size: usize) -> Vec<Experience> {
        let mut rng = thread_rng();
        let count = batch_size.min(self.buffer.len());
        self.buffer
            .choose_multiple(&mut rng, count)
            .cloned()
            .collect()
    }

    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    pub fn all(&self) -> &[Experience] {
        &self.buffer
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

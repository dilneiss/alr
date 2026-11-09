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

#[cfg(test)]
mod tests {
    use super::*;
    use alr_core::{Action, State};
    fn dummy_exp(id: &str) -> Experience {
        Experience {
            state: State::new(vec![0.0], serde_json::Value::Null),
            action: Action {
                id: id.to_string(),
                parameters: serde_json::Value::Null,
            },
            reward: 1.0,
            next_state: None,
            terminal: false,
        }
    }

    #[test]
    fn test_replay_buffer_capacity_eviction() {
        let mut buf = ExperienceReplayBuffer::new(2);
        assert!(buf.is_empty());

        buf.push(dummy_exp("1"));
        buf.push(dummy_exp("2"));
        assert_eq!(buf.len(), 2);

        // Pushing 3rd evicts the 1st
        buf.push(dummy_exp("3"));
        assert_eq!(buf.len(), 2);
        assert_eq!(buf.all()[0].action.id, "2");
        assert_eq!(buf.all()[1].action.id, "3");
    }

    #[test]
    fn test_replay_buffer_sampling_and_clear() {
        let mut buf = ExperienceReplayBuffer::new(10);
        for i in 1..=5 {
            buf.push(dummy_exp(&format!("{}", i)));
        }

        let batch = buf.sample(3);
        assert_eq!(batch.len(), 3);

        let oversample = buf.sample(100);
        assert_eq!(oversample.len(), 5);

        buf.clear();
        assert!(buf.is_empty());
    }
}

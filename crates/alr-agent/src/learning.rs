use alr_core::Experience;
use alr_learning::QTable;

pub struct PolicyTrainer;

impl PolicyTrainer {
    pub fn replay_train(q_table: &mut QTable, experiences: &[Experience], epochs: usize) {
        for _ in 0..epochs {
            for exp in experiences {
                q_table.update(exp);
            }
        }
    }
}

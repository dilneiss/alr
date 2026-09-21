pub mod mock;
pub mod openai_compatible;
pub mod traits;

pub use mock::MockLlmTeacher;
pub use openai_compatible::OpenAiCompatibleLlmTeacher;
pub use traits::LlmTeacher;

pub mod benchmark;
pub mod game;
pub mod scenarios;
pub mod terminal_view;
pub mod visual;

pub use benchmark::{BenchmarkReport, SnakeBenchmarkRunner};
pub use game::{Direction, Environment, Position, SnakeEnvironment, SnakeObservation, StepResult};
pub use terminal_view::{render_terminal_board, render_terminal_board_with_telemetry};
pub use visual::SnakeVisualRenderer;

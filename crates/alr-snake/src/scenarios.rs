use crate::game::{Direction, Position, SnakeEnvironment};

pub struct ScenarioBuilder;

impl ScenarioBuilder {
    pub fn wall_approaching(dir: Direction) -> SnakeEnvironment {
        let mut env = SnakeEnvironment::new(10, 10, 42);
        match dir {
            Direction::Right => {
                env.head = Position { x: 8, y: 5 };
                env.body = vec![Position { x: 7, y: 5 }, Position { x: 6, y: 5 }];
                env.direction = Direction::Right;
                env.food = Position { x: 8, y: 1 };
            }
            Direction::Up => {
                env.head = Position { x: 5, y: 1 };
                env.body = vec![Position { x: 5, y: 2 }, Position { x: 5, y: 3 }];
                env.direction = Direction::Up;
                env.food = Position { x: 8, y: 1 };
            }
            Direction::Down => {
                env.head = Position { x: 5, y: 8 };
                env.body = vec![Position { x: 5, y: 7 }, Position { x: 5, y: 6 }];
                env.direction = Direction::Down;
                env.food = Position { x: 1, y: 8 };
            }
            Direction::Left => {
                env.head = Position { x: 1, y: 5 };
                env.body = vec![Position { x: 2, y: 5 }, Position { x: 3, y: 5 }];
                env.direction = Direction::Left;
                env.food = Position { x: 1, y: 2 };
            }
        }
        env
    }

    pub fn trapped_u_turn() -> SnakeEnvironment {
        let mut env = SnakeEnvironment::new(10, 10, 99);
        env.head = Position { x: 5, y: 5 };
        // Body surrounding on left and front
        env.body = vec![
            Position { x: 4, y: 5 },
            Position { x: 4, y: 4 },
            Position { x: 5, y: 4 },
            Position { x: 6, y: 4 },
        ];
        env.direction = Direction::Up;
        env.food = Position { x: 7, y: 7 };
        env
    }
}

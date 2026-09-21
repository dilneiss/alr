#[cfg(test)]
mod tests {
    use alr_core::ActionType;
    use alr_snake::game::{Direction, Environment, Position, SnakeEnvironment};

    #[test]
    fn test_snake_movement_and_bounds() {
        let mut env = SnakeEnvironment::new(10, 10, 42);
        let obs = env.reset(42);

        assert_eq!(obs.head, Position { x: 5, y: 5 });
        assert_eq!(obs.direction, Direction::Right);

        // Move right
        let step = env.step(alr_core::Action::from_type(ActionType::Right));
        assert_eq!(step.observation.head, Position { x: 6, y: 5 });
        assert!(!step.terminal);
    }

    #[test]
    fn test_snake_wall_collision() {
        let mut env = SnakeEnvironment::new(5, 5, 1);
        env.reset(1);
        env.head = Position { x: 4, y: 2 };
        env.direction = Direction::Right;

        let step = env.step(alr_core::Action::from_type(ActionType::Right));
        assert!(step.terminal);
        assert_eq!(step.reward, -100.0);
    }

    #[test]
    fn test_snake_self_collision() {
        let mut env = SnakeEnvironment::new(10, 10, 1);
        env.reset(1);
        env.head = Position { x: 5, y: 5 };
        env.body = vec![
            Position { x: 5, y: 6 },
            Position { x: 4, y: 6 },
            Position { x: 4, y: 5 },
        ];
        env.direction = Direction::Down;

        let step = env.step(alr_core::Action::from_type(ActionType::Down));
        assert!(step.terminal);
        assert_eq!(step.reward, -100.0);
    }

    #[test]
    fn test_snake_eating_food() {
        let mut env = SnakeEnvironment::new(10, 10, 1);
        env.reset(1);
        env.head = Position { x: 4, y: 5 };
        env.food = Position { x: 5, y: 5 };
        env.direction = Direction::Right;

        let step = env.step(alr_core::Action::from_type(ActionType::Right));
        assert_eq!(step.observation.score, 1);
        assert!(step.reward >= 10.0);
        assert_eq!(step.observation.head, Position { x: 5, y: 5 });
    }

    #[test]
    fn test_snake_disallowed_immediate_reverse() {
        let mut env = SnakeEnvironment::new(10, 10, 1);
        env.reset(1);
        env.direction = Direction::Right;

        // Trying to move Left when going Right should be rejected, maintaining Right
        let step = env.step(alr_core::Action::from_type(ActionType::Left));
        assert_eq!(step.observation.direction, Direction::Right);
    }
}

#[cfg(test)]
mod tests {
    use alr_core::ActionType;
    use alr_execution::{
        ChannelInputController, InputAction, InputController, SafeInputController,
    };

    #[tokio::test]
    async fn test_safe_input_controller_press() {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let channel_ctrl = ChannelInputController::new(tx);
        let safe = SafeInputController::new(channel_ctrl, false, 50);

        safe.press(InputAction::Direction(ActionType::Up)).unwrap();
        let rec = rx.recv().await.unwrap();
        assert_eq!(rec, InputAction::Direction(ActionType::Up));
    }

    #[tokio::test]
    async fn test_emergency_stop() {
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let channel_ctrl = ChannelInputController::new(tx);
        let safe = SafeInputController::new(channel_ctrl, false, 50);

        safe.trigger_emergency_stop();
        let err = safe.press(InputAction::Direction(ActionType::Left));
        assert!(err.is_err(), "Must block execution when emergency stopped");
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ActionType {
    Up,
    Down,
    Left,
    Right,
    Custom(String),
}

impl ActionType {
    pub fn as_str(&self) -> &str {
        match self {
            ActionType::Up => "UP",
            ActionType::Down => "DOWN",
            ActionType::Left => "LEFT",
            ActionType::Right => "RIGHT",
            ActionType::Custom(s) => s.as_str(),
        }
    }

    pub fn from_str_loose(s: &str) -> Option<Self> {
        match s.trim().to_uppercase().as_str() {
            "UP" => Some(ActionType::Up),
            "DOWN" => Some(ActionType::Down),
            "LEFT" => Some(ActionType::Left),
            "RIGHT" => Some(ActionType::Right),
            other => {
                if !other.is_empty() {
                    Some(ActionType::Custom(other.to_string()))
                } else {
                    None
                }
            }
        }
    }

    pub fn is_opposite(&self, other: &ActionType) -> bool {
        matches!(
            (self, other),
            (ActionType::Up, ActionType::Down)
                | (ActionType::Down, ActionType::Up)
                | (ActionType::Left, ActionType::Right)
                | (ActionType::Right, ActionType::Left)
        )
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Action {
    pub id: String,
    pub parameters: serde_json::Value,
}

impl Action {
    pub fn new(id: impl Into<String>, parameters: serde_json::Value) -> Self {
        Self {
            id: id.into(),
            parameters,
        }
    }

    pub fn from_type(action_type: ActionType) -> Self {
        Self {
            id: action_type.as_str().to_string(),
            parameters: serde_json::json!({ "type": action_type.as_str() }),
        }
    }

    pub fn action_type(&self) -> Option<ActionType> {
        ActionType::from_str_loose(&self.id)
    }
}

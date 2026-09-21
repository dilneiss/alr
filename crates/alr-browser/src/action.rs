use crate::driver::BrowserDriver;
use crate::target::BrowserTarget;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BrowserActionKind {
    Navigate(String),
    Click(BrowserTarget),
    Type {
        target: BrowserTarget,
        text: String,
    },
    Select {
        target: BrowserTarget,
        value: String,
    },
    WaitMillis(u64),
    Refresh,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserAction {
    pub kind: BrowserActionKind,
    pub description: String,
    pub expected_outcome: String,
    pub is_mutation: bool,
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserActionResult {
    pub success: bool,
    pub initial_page_hash: String,
    pub new_page_hash: String,
    pub state_changed: bool,
    pub message: Option<String>,
}

impl BrowserAction {
    pub fn navigate(url: impl Into<String>) -> Self {
        let u = url.into();
        Self {
            kind: BrowserActionKind::Navigate(u.clone()),
            description: format!("Navigate to {}", u),
            expected_outcome: format!("Page loads at {}", u),
            is_mutation: false,
            idempotency_key: None,
        }
    }

    pub fn click(target: BrowserTarget, desc: impl Into<String>, is_mutation: bool) -> Self {
        Self {
            kind: BrowserActionKind::Click(target),
            description: desc.into(),
            expected_outcome: "Element clicked and triggers state transition".to_string(),
            is_mutation,
            idempotency_key: None,
        }
    }

    pub fn type_text(
        target: BrowserTarget,
        text: impl Into<String>,
        desc: impl Into<String>,
    ) -> Self {
        let t = text.into();
        Self {
            kind: BrowserActionKind::Type {
                target,
                text: t.clone(),
            },
            description: desc.into(),
            expected_outcome: "Input field populated with value".to_string(),
            is_mutation: false,
            idempotency_key: None,
        }
    }

    pub fn with_idempotency_key(mut self, key: impl Into<String>) -> Self {
        self.idempotency_key = Some(key.into());
        self
    }

    pub async fn execute_and_verify<D: BrowserDriver>(
        &self,
        driver: &D,
        session: &mut crate::driver::BrowserSession,
    ) -> Result<BrowserActionResult> {
        let initial_dom = driver.get_dom(session).await?;
        let initial_state = crate::state::BrowserState::new(initial_dom, true);

        match &self.kind {
            BrowserActionKind::Navigate(url) => {
                driver.navigate(session, url).await?;
            }
            BrowserActionKind::Click(target) => {
                driver.click(session, target).await?;
            }
            BrowserActionKind::Type { target, text } => {
                driver.type_text(session, target, text).await?;
            }
            BrowserActionKind::Select { target, value } => {
                driver.select(session, target, value).await?;
            }
            BrowserActionKind::WaitMillis(ms) => {
                tokio::time::sleep(std::time::Duration::from_millis(*ms)).await;
            }
            BrowserActionKind::Refresh => {
                let curr = driver.current_url(session).await?;
                driver.navigate(session, &curr).await?;
            }
        }

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        let new_dom = driver.get_dom(session).await?;
        let new_state = crate::state::BrowserState::new(new_dom, true);

        let state_changed =
            initial_state.page_hash != new_state.page_hash || initial_state.url != new_state.url;

        Ok(BrowserActionResult {
            success: true,
            initial_page_hash: initial_state.page_hash,
            new_page_hash: new_state.page_hash,
            state_changed,
            message: None,
        })
    }
}
